#!/usr/bin/env node
import assert from 'assert/strict';
import { createHash } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { basename, join, resolve } from 'path';
import {
  createHumanGateProposal,
  hashHumanGateBytes,
  HUMAN_GATE_BINDING_SCHEMA_VERSION,
  HUMAN_GATE_PROPOSAL_SCHEMA_VERSION,
  HUMAN_GATE_RESULT_SCHEMA_VERSION,
  humanGateSlots,
  recordHumanGateApproval,
  recordHumanGateResult,
  verifyHumanGateChain,
} from '../.claude/hooks/lib/human-gate-contract.mjs';

const repoRoot = process.cwd();
const source = resolve(repoRoot, 'scripts/native/secure-receipt-writer.c');
const recorder = resolve(repoRoot, 'scripts/human-gate-recorder.mjs');
const verifier = resolve(repoRoot, 'scripts/verify-human-gate.mjs');
const buildRoot = mkdtempSync('/private/tmp/human-gate-build-');
const writer = join(buildRoot, 'secure-receipt-writer');
const testingWriter = join(buildRoot, 'secure-receipt-writer-testing');
let pass = 0;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function check(label, fn) {
  try {
    fn();
    pass += 1;
    console.log(`PASS ${label}`);
  } catch (error) {
    console.error(`FAIL ${label}: ${String(error?.stack || error)}`);
    process.exitCode = 1;
  }
}

async function checkAsync(label, fn) {
  try {
    await fn();
    pass += 1;
    console.log(`PASS ${label}`);
  } catch (error) {
    console.error(`FAIL ${label}: ${String(error?.stack || error)}`);
    process.exitCode = 1;
  }
}

function compile(output, testing = false) {
  const args = ['-std=c11', '-Wall', '-Wextra', '-Werror', '-pedantic', '-O2'];
  if (testing) args.push('-DSECURE_RECEIPT_WRITER_TESTING');
  args.push(source, '-o', output);
  const result = spawnSync('/usr/bin/cc', args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  chmodSync(output, 0o700);
}

compile(writer);
compile(testingWriter, true);

function rootFixture() {
  return mkdtempSync('/private/tmp/human-gate-test-');
}

function treeSnapshot(root) {
  const rows = [];
  function walk(path, relative) {
    const st = lstatSync(path, { bigint: true });
    const type = st.isSymbolicLink() ? 'l' : st.isDirectory() ? 'd' : st.isFile() ? 'f' : 'o';
    let content = '';
    if (type === 'f') content = sha256(readFileSync(path));
    if (type === 'l') content = readlinkSync(path);
    rows.push([relative || '.', type, String(st.mode), String(st.dev), String(st.ino), String(st.nlink), String(st.size), String(st.mtimeNs), content]);
    if (type === 'd') for (const name of readdirSync(path).sort()) walk(join(path, name), relative ? `${relative}/${name}` : name);
  }
  walk(root, '');
  return JSON.stringify(rows);
}

function fixture({ expiryMs = 60_000 } = {}) {
  const root = rootFixture();
  const planBytes = Buffer.from('plan-v1\n');
  const payloadBytes = Buffer.from('payload-v1\n');
  const executionEnvelopeBytes = Buffer.from('envelope-v1\n');
  const readbackBytes = Buffer.from('post-readback-v1\n');
  const created = Date.now() - 2_000;
  const prepared = createHumanGateProposal({
    receiptRoot: root,
    secureWriterPath: writer,
    gate: 'G-TEST',
    planBytes,
    payloadBytes,
    executionEnvelopeBytes,
    harness: 'codex',
    sessionId: 'session-007',
    now: new Date(created).toISOString(),
    expiresAt: new Date(Date.now() + expiryMs).toISOString(),
  });
  const eventTime = new Date(Date.now() - 100).toISOString();
  const event = {
    role: 'user',
    top_level: true,
    authority: 'trusted-bootstrap-main',
    event_id: `event-${Date.now()}`,
    event_created_at: eventTime,
    observed_at: eventTime,
    harness: 'codex',
    session_id: 'session-007',
  };
  return { root, planBytes, payloadBytes, executionEnvelopeBytes, readbackBytes, prepared, event };
}

function approvalArguments(value, overrides = {}) {
  return {
    receiptRoot: value.root,
    secureWriterPath: writer,
    gate: 'G-TEST',
    proposalId: value.prepared.proposal.proposal_id,
    planBytes: value.planBytes,
    payloadBytes: value.payloadBytes,
    executionEnvelopeBytes: value.executionEnvelopeBytes,
    rawPromptBytes: Buffer.from(value.prepared.exactReply, 'utf8'),
    event: { ...value.event },
    ...overrides,
  };
}

function expectZeroMutationReject(value, label, mutate, pattern) {
  const before = treeSnapshot(value.root);
  assert.throws(() => recordHumanGateApproval(mutate(approvalArguments(value))), pattern, label);
  assert.equal(treeSnapshot(value.root), before, `${label} changed receipt tree`);
}

const proposalSchema = JSON.parse(readFileSync('.claude/skill-os/human-gate-proposal.schema.json', 'utf8'));
const bindingSchema = JSON.parse(readFileSync('.claude/skill-os/human-gate-binding.schema.json', 'utf8'));
const resultSchema = JSON.parse(readFileSync('.claude/skill-os/human-gate-result.schema.json', 'utf8'));

check('strict schemas are closed and acyclic', () => {
  assert.equal(proposalSchema.additionalProperties, false);
  assert.equal(bindingSchema.additionalProperties, false);
  assert.equal(resultSchema.additionalProperties, false);
  assert.equal(proposalSchema.properties.schema_version.const, HUMAN_GATE_PROPOSAL_SCHEMA_VERSION);
  assert.equal(bindingSchema.properties.schema_version.const, HUMAN_GATE_BINDING_SCHEMA_VERSION);
  assert.equal(resultSchema.properties.schema_version.const, HUMAN_GATE_RESULT_SCHEMA_VERSION);
  assert.ok(!proposalSchema.required.some(key => /binding|result|readback|post_state/.test(key)));
  assert.ok(bindingSchema.required.includes('proposal_sha256'));
  assert.ok(!bindingSchema.required.some(key => /result|post_state/.test(key)));
  assert.ok(resultSchema.required.includes('binding_sha256'));
});

const rejectionFixture = fixture();
check('proposal binds plan/payload/envelope/root/writer and publishes exact reply', () => {
  const { proposal, proposalBytes, proposalSha256, exactReply } = rejectionFixture.prepared;
  assert.equal(proposal.plan_sha256, sha256(rejectionFixture.planBytes));
  assert.equal(proposal.payload_sha256, sha256(rejectionFixture.payloadBytes));
  assert.equal(proposal.execution_envelope_sha256, sha256(rejectionFixture.executionEnvelopeBytes));
  assert.equal(proposal.secure_writer_sha256, sha256(readFileSync(writer)));
  assert.equal(proposalSha256, sha256(proposalBytes));
  assert.equal(exactReply, `APPROVE G-TEST ${proposalSha256} ${proposal.nonce}`);
  assert.deepEqual(proposal.receipt_root, {
    dev: String(lstatSync(rejectionFixture.root, { bigint: true }).dev),
    ino: String(lstatSync(rejectionFixture.root, { bigint: true }).ino),
  });
});

check('assistant reply is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'assistant', args => ({ ...args, event: { ...args.event, role: 'assistant' } }), /authority/,
));
check('tool reply is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'tool', args => ({ ...args, event: { ...args.event, role: 'tool' } }), /authority/,
));
check('child reply is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'child', args => ({ ...args, event: { ...args.event, top_level: false, authority: 'delegated-child' } }), /authority/,
));
check('old user turn is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'old turn', args => ({ ...args, event: { ...args.event, event_created_at: args.event ? rejectionFixture.prepared.proposal.created_at : '' } }), /not newer/,
));
check('wrong session is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'wrong session', args => ({ ...args, event: { ...args.event, session_id: 'wrong-session' } }), /scope/,
));
check('wrong harness is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'wrong harness', args => ({ ...args, event: { ...args.event, harness: 'claude' } }), /scope/,
));
check('wrong proposal hash is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'wrong hash', args => ({ ...args, rawPromptBytes: Buffer.from(rejectionFixture.prepared.exactReply.replace(rejectionFixture.prepared.proposalSha256, '0'.repeat(64))) }), /not exact/,
));
check('wrong nonce is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'wrong nonce', args => ({ ...args, rawPromptBytes: Buffer.from(`${rejectionFixture.prepared.exactReply.slice(0, -1)}0`) }), /not exact/,
));
check('normalized or newline reply is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'normalized', args => ({ ...args, rawPromptBytes: Buffer.from(`${rejectionFixture.prepared.exactReply}\n`) }), /not exact/,
));
check('wrong gate is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'wrong gate', args => ({ ...args, gate: 'G-OTHER' }), /no such file|ENOENT/,
));
check('Plan substitution is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'plan substitution', args => ({ ...args, planBytes: Buffer.from('other-plan') }), /Plan substitution/,
));
check('payload substitution is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'payload substitution', args => ({ ...args, payloadBytes: Buffer.from('other-payload') }), /payload substitution/,
));
check('envelope substitution is rejected with zero mutation', () => expectZeroMutationReject(
  rejectionFixture, 'envelope substitution', args => ({ ...args, executionEnvelopeBytes: Buffer.from('other-envelope') }), /envelope substitution/,
));
check('secure writer substitution is rejected with zero mutation', () => {
  const alteredWriter = join(buildRoot, 'altered-writer');
  copyFileSync(writer, alteredWriter);
  writeFileSync(alteredWriter, Buffer.concat([readFileSync(alteredWriter), Buffer.from('x')]), { mode: 0o700 });
  expectZeroMutationReject(rejectionFixture, 'writer substitution', args => ({ ...args, secureWriterPath: alteredWriter }), /writer substitution/);
});

check('substituted proposal fails the next consumer without a binding write', () => {
  const value = fixture();
  const proposalPath = value.prepared.path;
  const substituted = JSON.parse(readFileSync(proposalPath, 'utf8'));
  substituted.payload_sha256 = '0'.repeat(64);
  writeFileSync(proposalPath, `${JSON.stringify(substituted, null, 2)}\n`);
  const before = treeSnapshot(value.root);
  assert.throws(() => recordHumanGateApproval(approvalArguments(value)), /proposal_id content binding mismatch/);
  assert.equal(treeSnapshot(value.root), before);
  const slots = humanGateSlots('G-TEST', value.prepared.proposal.proposal_id);
  assert.equal(existsSync(join(value.root, slots.binding)), false);
});

check('missing native user feed returns BLOCKED_HUMAN_CHANNEL with zero mutation', () => {
  const value = rejectionFixture;
  const dir = mkdtempSync('/private/tmp/human-gate-cli-');
  const paths = {};
  for (const [key, bytes] of Object.entries({ plan: value.planBytes, payload: value.payloadBytes, envelope: value.executionEnvelopeBytes })) {
    paths[key] = join(dir, key);
    writeFileSync(paths[key], bytes);
  }
  const before = treeSnapshot(value.root);
  const result = spawnSync(process.execPath, [recorder, 'approve',
    '--root', value.root, '--writer', writer, '--gate', 'G-TEST', '--proposal-id', value.prepared.proposal.proposal_id,
    '--plan', paths.plan, '--payload', paths.payload, '--envelope', paths.envelope,
    '--role', 'user', '--top-level', 'true', '--event-id', 'native-missing',
    '--event-created-at', value.event.event_created_at, '--observed-at', value.event.observed_at,
    '--harness', 'codex', '--session', 'session-007',
  ], { encoding: 'utf8', input: '' });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /^BLOCKED_HUMAN_CHANNEL /);
  assert.equal(treeSnapshot(value.root), before);
});

check('approval-file fallback is unsupported and fails closed with zero mutation', () => {
  const before = treeSnapshot(rejectionFixture.root);
  const result = spawnSync(process.execPath, [recorder, 'approve', '--approval-file', '/tmp/forbidden'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported/);
  assert.equal(treeSnapshot(rejectionFixture.root), before);
});

await checkAsync('expired proposal is rejected with zero mutation', async () => {
  const value = fixture({ expiryMs: 180 });
  await new Promise(resolvePromise => setTimeout(resolvePromise, 230));
  expectZeroMutationReject(value, 'expired proposal', args => args, /expired/);
});

const successFixture = fixture();
let binding;
const postStateSha256 = sha256(Buffer.from('post-state-v1'));
check('only new exact top-level user turn creates O_EXCL binding', () => {
  binding = recordHumanGateApproval(approvalArguments(successFixture));
  assert.equal(binding.binding.role, 'user');
  assert.equal(binding.binding.top_level, true);
  assert.equal(binding.binding.authority, 'trusted-bootstrap-main');
  assert.equal(binding.binding.proposal_sha256, successFixture.prepared.proposalSha256);
  assert.equal(binding.binding.raw_prompt_sha256, hashHumanGateBytes(Buffer.from(successFixture.prepared.exactReply)));
  assert.ok(existsSync(binding.path));
});

check('approval replay is rejected with byte-identical receipt tree', () => {
  const before = treeSnapshot(successFixture.root);
  assert.throws(() => recordHumanGateApproval(approvalArguments(successFixture)), /exclusively|File exists/);
  assert.equal(treeSnapshot(successFixture.root), before);
});

check('substituted binding raw-prompt claim fails the next consumer', () => {
  const value = fixture();
  const accepted = recordHumanGateApproval(approvalArguments(value));
  const forged = JSON.parse(readFileSync(accepted.path, 'utf8'));
  forged.raw_prompt_sha256 = '0'.repeat(64);
  const { binding_id: ignored, ...body } = forged;
  forged.binding_id = `hgb-${sha256(Buffer.from(stable(body)))}`;
  writeFileSync(accepted.path, `${JSON.stringify(forged, null, 2)}\n`);
  const before = treeSnapshot(value.root);
  assert.throws(() => recordHumanGateResult({
    receiptRoot: value.root, secureWriterPath: writer, gate: 'G-TEST',
    proposalId: value.prepared.proposal.proposal_id, planBytes: value.planBytes,
    payloadBytes: value.payloadBytes, executionEnvelopeBytes: value.executionEnvelopeBytes,
    readbackBytes: value.readbackBytes, postStateSha256,
  }), /raw prompt hash mismatch/);
  assert.equal(treeSnapshot(value.root), before);
});

check('future result observation is rejected before result publication', () => {
  const value = fixture();
  recordHumanGateApproval(approvalArguments(value));
  const before = treeSnapshot(value.root);
  assert.throws(() => recordHumanGateResult({
    receiptRoot: value.root, secureWriterPath: writer, gate: 'G-TEST',
    proposalId: value.prepared.proposal.proposal_id, planBytes: value.planBytes,
    payloadBytes: value.payloadBytes, executionEnvelopeBytes: value.executionEnvelopeBytes,
    readbackBytes: value.readbackBytes, postStateSha256,
    observedAt: new Date(Date.now() + 60_000).toISOString(),
  }), /future/);
  assert.equal(treeSnapshot(value.root), before);
});

let resultReceipt;
check('result is one-way O_EXCL and binds binding plus independent read-back', () => {
  resultReceipt = recordHumanGateResult({
    receiptRoot: successFixture.root,
    secureWriterPath: writer,
    gate: 'G-TEST',
    proposalId: successFixture.prepared.proposal.proposal_id,
    planBytes: successFixture.planBytes,
    payloadBytes: successFixture.payloadBytes,
    executionEnvelopeBytes: successFixture.executionEnvelopeBytes,
    readbackBytes: successFixture.readbackBytes,
    postStateSha256,
  });
  assert.equal(resultReceipt.result.binding_sha256, binding.bindingSha256);
  assert.equal(resultReceipt.result.readback_sha256, sha256(successFixture.readbackBytes));
  assert.equal(resultReceipt.result.post_state_sha256, postStateSha256);
});

check('result replay is rejected with byte-identical receipt tree', () => {
  const before = treeSnapshot(successFixture.root);
  assert.throws(() => recordHumanGateResult({
    receiptRoot: successFixture.root, secureWriterPath: writer, gate: 'G-TEST',
    proposalId: successFixture.prepared.proposal.proposal_id, planBytes: successFixture.planBytes,
    payloadBytes: successFixture.payloadBytes, executionEnvelopeBytes: successFixture.executionEnvelopeBytes,
    readbackBytes: successFixture.readbackBytes, postStateSha256,
  }), /exclusively|File exists/);
  assert.equal(treeSnapshot(successFixture.root), before);
});

check('independent verifier accepts exact chain and rejects read-back substitution', () => {
  const verified = verifyHumanGateChain({
    receiptRoot: successFixture.root, secureWriterPath: writer, gate: 'G-TEST',
    proposalId: successFixture.prepared.proposal.proposal_id, planBytes: successFixture.planBytes,
    payloadBytes: successFixture.payloadBytes, executionEnvelopeBytes: successFixture.executionEnvelopeBytes,
    readbackBytes: successFixture.readbackBytes, expectedPostStateSha256: postStateSha256,
  });
  assert.equal(verified.result.result_id, resultReceipt.result.result_id);
  assert.throws(() => verifyHumanGateChain({
    receiptRoot: successFixture.root, secureWriterPath: writer, gate: 'G-TEST',
    proposalId: successFixture.prepared.proposal.proposal_id, planBytes: successFixture.planBytes,
    payloadBytes: successFixture.payloadBytes, executionEnvelopeBytes: successFixture.executionEnvelopeBytes,
    readbackBytes: Buffer.from('wrong'), expectedPostStateSha256: postStateSha256,
  }), /read-back mismatch/);
});

function directWriterArgs(root, input, segments, finalName, expectedSha = sha256(readFileSync(input))) {
  const st = lstatSync(root, { bigint: true });
  const args = ['--root', root, '--root-dev', String(st.dev), '--root-ino', String(st.ino)];
  for (const segment of segments) args.push('--segment', segment);
  args.push('--final', finalName, '--input', input, '--expected-input-sha', expectedSha);
  return args;
}

function directFixture() {
  const base = rootFixture();
  const root = join(base, 'receipts');
  mkdirSync(root);
  const input = join(base, 'input');
  writeFileSync(input, Buffer.from('native receipt bytes\n'));
  return { base, root, input };
}

check('native writer publishes exact bytes through FD-rooted path', () => {
  const value = directFixture();
  const result = spawnSync(writer, directWriterArgs(value.root, value.input, ['a', 'b'], 'receipt.json'), { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `OK sha256=${sha256(readFileSync(value.input))} bytes=${readFileSync(value.input).length}`);
  const final = join(value.root, 'a', 'b', 'receipt.json');
  assert.deepEqual(readFileSync(final), readFileSync(value.input));
  const st = statSync(final);
  assert.equal(st.nlink, 1);
  assert.equal(st.mode & 0o777, 0o600);
});

check('native writer rejects unsafe dot/slash slots before root mutation', () => {
  for (const segment of ['.', '..', 'bad/name']) {
    const value = directFixture();
    const before = treeSnapshot(value.root);
    const result = spawnSync(writer, directWriterArgs(value.root, value.input, [segment], 'receipt.json'), { encoding: 'utf8' });
    assert.notEqual(result.status, 0, segment);
    assert.equal(treeSnapshot(value.root), before, segment);
  }
});

check('native writer rejects pre-existing final without changing it', () => {
  const value = directFixture();
  const args = directWriterArgs(value.root, value.input, ['a'], 'receipt.json');
  assert.equal(spawnSync(writer, args).status, 0);
  const before = treeSnapshot(value.root);
  assert.notEqual(spawnSync(writer, args).status, 0);
  assert.equal(treeSnapshot(value.root), before);
});

check('native writer rejects root and descendant symlinks with zero publication', () => {
  const value = directFixture();
  const rootAlias = join(value.base, 'root-alias');
  symlinkSync(value.root, rootAlias);
  const aliasArgs = directWriterArgs(value.root, value.input, ['a'], 'receipt.json');
  aliasArgs[1] = rootAlias;
  assert.notEqual(spawnSync(writer, aliasArgs).status, 0);
  const external = join(value.base, 'external');
  mkdirSync(external);
  symlinkSync(external, join(value.root, 'linked'));
  const beforeRoot = treeSnapshot(value.root);
  const beforeExternal = treeSnapshot(external);
  assert.notEqual(spawnSync(writer, directWriterArgs(value.root, value.input, ['linked'], 'receipt.json')).status, 0);
  assert.equal(treeSnapshot(value.root), beforeRoot);
  assert.equal(treeSnapshot(external), beforeExternal);
});

check('native writer rejects wrong receipt-root identity before mutation', () => {
  const value = directFixture();
  const args = directWriterArgs(value.root, value.input, ['a'], 'receipt.json');
  args[args.indexOf('--root-ino') + 1] = String(BigInt(args[args.indexOf('--root-ino') + 1]) + 1n);
  const before = treeSnapshot(value.root);
  assert.notEqual(spawnSync(writer, args).status, 0);
  assert.equal(treeSnapshot(value.root), before);
});

async function waitFor(path, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`);
    await new Promise(resolvePromise => setTimeout(resolvePromise, 10));
  }
}

function spawnPaused(value, stage, segments = ['slot'], finalName = 'receipt.json') {
  const pause = join(value.base, `pause-${stage}`);
  writeFileSync(pause, 'hold\n');
  const child = spawn(testingWriter, directWriterArgs(value.root, value.input, segments, finalName), {
    env: { PATH: '/usr/bin:/bin', SECURE_RECEIPT_WRITER_TEST_PAUSE_FILE: pause, SECURE_RECEIPT_WRITER_TEST_PAUSE_STAGE: stage },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const completed = new Promise(resolvePromise => child.on('close', (code, signal) => resolvePromise({ code, signal, stdout, stderr })));
  return { pause, ready: `${pause}.ready`, child, completed };
}

await checkAsync('native writer detects parent inode swap and removes its own failed final', async () => {
  const value = directFixture();
  mkdirSync(join(value.root, 'slot'));
  const run = spawnPaused(value, 'before-create');
  await waitFor(run.ready);
  renameSync(join(value.root, 'slot'), join(value.root, 'slot-old'));
  mkdirSync(join(value.root, 'slot'));
  unlinkSync(run.pause);
  const completed = await run.completed;
  assert.notEqual(completed.code, 0, completed.stderr);
  assert.equal(existsSync(join(value.root, 'slot', 'receipt.json')), false);
  assert.equal(existsSync(join(value.root, 'slot-old', 'receipt.json')), false);
});

await checkAsync('native writer detects receipt-root swap and removes its own failed final', async () => {
  const value = directFixture();
  mkdirSync(join(value.root, 'slot'));
  const run = spawnPaused(value, 'before-create');
  await waitFor(run.ready);
  const oldRoot = `${value.root}-old`;
  renameSync(value.root, oldRoot);
  mkdirSync(value.root);
  unlinkSync(run.pause);
  const completed = await run.completed;
  assert.notEqual(completed.code, 0, completed.stderr);
  assert.equal(existsSync(join(value.root, 'slot', 'receipt.json')), false);
  assert.equal(existsSync(join(oldRoot, 'slot', 'receipt.json')), false);
});

await checkAsync('native writer rejects hardlink alias before writing receipt bytes', async () => {
  const value = directFixture();
  mkdirSync(join(value.root, 'slot'));
  const run = spawnPaused(value, 'after-create');
  await waitFor(run.ready);
  const final = join(value.root, 'slot', 'receipt.json');
  const alias = join(value.base, 'attacker-alias');
  linkSync(final, alias);
  unlinkSync(run.pause);
  const completed = await run.completed;
  assert.notEqual(completed.code, 0, completed.stderr);
  assert.equal(existsSync(final), false);
  assert.equal(readFileSync(alias).length, 0);
  unlinkSync(alias);
});

await checkAsync('native writer detects input mutation and removes partial final', async () => {
  const value = directFixture();
  mkdirSync(join(value.root, 'slot'));
  const run = spawnPaused(value, 'before-create');
  await waitFor(run.ready);
  writeFileSync(value.input, 'mutated after preflight\n');
  unlinkSync(run.pause);
  const completed = await run.completed;
  assert.notEqual(completed.code, 0, completed.stderr);
  assert.equal(existsSync(join(value.root, 'slot', 'receipt.json')), false);
});

check('verifier CLI consumes only exact frozen inputs', () => {
  const dir = mkdtempSync('/private/tmp/human-gate-verify-cli-');
  const files = {};
  for (const [key, bytes] of Object.entries({
    plan: successFixture.planBytes, payload: successFixture.payloadBytes,
    envelope: successFixture.executionEnvelopeBytes, readback: successFixture.readbackBytes,
  })) {
    files[key] = join(dir, key);
    writeFileSync(files[key], bytes);
  }
  const result = spawnSync(process.execPath, [verifier, 'verify',
    '--root', successFixture.root, '--writer', writer, '--gate', 'G-TEST',
    '--proposal-id', successFixture.prepared.proposal.proposal_id,
    '--plan', files.plan, '--payload', files.payload, '--envelope', files.envelope,
    '--readback', files.readback, '--post-state-sha256', postStateSha256,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^HUMAN_GATE_CHAIN_PASS [a-f0-9]{64} [a-f0-9]{64} [a-f0-9]{64}\n$/);
});

function spawnCaptured(command, args, { input = null, env = process.env } = {}) {
  const child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  if (input === null) child.stdin.end();
  else child.stdin.end(input);
  return new Promise(resolvePromise => child.on('close', (code, signal) => resolvePromise({ code, signal, stdout, stderr })));
}

await checkAsync('independent verifier prepare and concurrent recorder approval yield one binding', async () => {
  const base = rootFixture();
  const root = join(base, 'receipts');
  mkdirSync(root);
  const files = {};
  for (const [key, bytes] of Object.entries({ plan: Buffer.from('cli-plan'), payload: Buffer.from('cli-payload'), envelope: Buffer.from('cli-envelope'), readback: Buffer.from('cli-readback') })) {
    files[key] = join(base, key);
    writeFileSync(files[key], bytes);
  }
  const createdAt = new Date(Date.now() - 1_000).toISOString();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const prepared = spawnSync(process.execPath, [verifier, 'prepare',
    '--root', root, '--writer', writer, '--gate', 'G-CLI', '--plan', files.plan,
    '--payload', files.payload, '--envelope', files.envelope, '--harness', 'codex',
    '--session', 'cli-session', '--created-at', createdAt, '--expires-at', expiresAt,
  ], { encoding: 'utf8' });
  assert.equal(prepared.status, 0, prepared.stderr);
  const lines = prepared.stdout.trim().split('\n');
  const match = lines[0].match(/^HUMAN_GATE_PROPOSAL_CREATED (hgp-[a-f0-9]{64}) ([a-f0-9]{64})$/);
  assert.ok(match, prepared.stdout);
  const proposalId = match[1];
  const exactReply = lines[1];
  const eventAt = new Date(Date.now() - 20).toISOString();
  const approveArgs = [recorder, 'approve', '--root', root, '--writer', writer,
    '--gate', 'G-CLI', '--proposal-id', proposalId, '--plan', files.plan,
    '--payload', files.payload, '--envelope', files.envelope, '--approval-stdin',
    '--role', 'user', '--top-level', 'true', '--event-id', 'cli-event-1',
    '--event-created-at', eventAt, '--observed-at', eventAt, '--harness', 'codex',
    '--session', 'cli-session'];
  const attempts = await Promise.all(Array.from({ length: 8 }, () => spawnCaptured(process.execPath, approveArgs, { input: exactReply })));
  assert.equal(attempts.filter(attempt => attempt.code === 0).length, 1, JSON.stringify(attempts));
  assert.equal(attempts.filter(attempt => attempt.code !== 0).length, 7);
  const slots = humanGateSlots('G-CLI', proposalId);
  assert.ok(existsSync(join(root, slots.binding)));
  const post = sha256(Buffer.from('cli-post'));
  const result = spawnSync(process.execPath, [recorder, 'result', '--root', root,
    '--writer', writer, '--gate', 'G-CLI', '--proposal-id', proposalId,
    '--plan', files.plan, '--payload', files.payload, '--envelope', files.envelope,
    '--readback', files.readback, '--post-state-sha256', post,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^HUMAN_GATE_RESULT_CREATED hgr-[a-f0-9]{64} [a-f0-9]{64}\n$/);
  const verified = spawnSync(process.execPath, [verifier, 'verify', '--root', root, '--writer', writer,
    '--gate', 'G-CLI', '--proposal-id', proposalId, '--plan', files.plan,
    '--payload', files.payload, '--envelope', files.envelope, '--readback', files.readback,
    '--post-state-sha256', post,
  ], { encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr);
  assert.match(verified.stdout, /^HUMAN_GATE_CHAIN_PASS /);
});

rmSync(buildRoot, { recursive: true, force: true });
if (process.exitCode) process.exit(process.exitCode);
console.log(`\n=== human gate replay/forgery summary: PASS=${pass} FAIL=0 ===`);
console.log('HUMAN_GATE_REPLAY_MATRIX_PASS');
