#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  APPROVED_CENSUS_SHA256,
  APPROVED_OBLIGATION_COUNT,
  CLASS_PROOF_SENTINELS,
  IMPLEMENTATION_RECEIPT_SHA256,
  RESULT_LATTICE,
  aggregateResults,
  compileObligations,
  createObligationProof,
  deriveApplicability,
  loadIndex,
  recordEvidence,
  sha256,
} from './evolution/obligation-runtime.mjs';
import { stable } from './evolution/obligation-census.mjs';
import {
  createHumanGateProposal,
  recordHumanGateApproval,
  recordHumanGateResult,
} from '../.claude/hooks/lib/human-gate-contract.mjs';
import {
  probeProductionActivation,
  verifyProductionEntrypoints,
  verifyRealBehavior,
  verifyReverseCoverage,
  verifyRuntimeLattice,
} from './evolution/verify-obligation-runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = loadIndex();
const HASH = 'a'.repeat(64);
const CONTEXT = {
  schema_version: 'luca.obligation-task-context.v1',
  invocation_id: 'tst-010-invocation',
  harness: 'manual',
  lane: 'L1_HERMETIC',
  event: 'UserPromptSubmit',
  cwd: process.cwd(),
  task_sha256: HASH,
  route: {
    complete: true,
    skills: ['design-brief'],
    roles: [],
    workflows: [],
    actions: [],
    paths: [],
  },
};

assert.deepEqual(RESULT_LATTICE, [
  'PASS',
  'NOT_APPLICABLE',
  'BLOCKED',
  'DEGRADED',
  'NOT_RUN',
  'UNKNOWN',
]);

assert.equal(aggregateResults([
  { class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'PASS' },
]), 'PASS');

assert.equal(aggregateResults([
  { class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'NOT_RUN' },
]), 'NOT_RUN');

assert.throws(
  () => aggregateResults([{ class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'N/A' }]),
  /invalid result N\/A/,
);

assert.throws(
  () => aggregateResults([{ class: 'S0_MACHINE_SAFETY', applicable: true, result: 'DEGRADED' }]),
  /S0_MACHINE_SAFETY cannot be DEGRADED/,
);

assert.throws(
  () => aggregateResults([{ class: 'S3_HUMAN_TASTE', applicable: true, result: 'DEGRADED' }]),
  /S3_HUMAN_TASTE cannot be DEGRADED/,
);

assert.equal(INDEX.records.length, APPROVED_OBLIGATION_COUNT);
assert.equal(INDEX.approved.census_sha256, APPROVED_CENSUS_SHA256);
assert.equal(INDEX.approved.implementation_receipt_sha256, IMPLEMENTATION_RECEIPT_SHA256);
assert.deepEqual(new Set(INDEX.records.map((row) => row.class)), new Set([
  'S0_MACHINE_SAFETY',
  'S1_ROUTING_DISPATCH',
  'S2_COMPLETION_QUALITY',
  'S3_HUMAN_TASTE',
  'S4_NATIVE_CAPABILITY',
]));
assert.ok(INDEX.records.every((row) => row.approved_native_status === 'MISSING_WIRING'));
assert.ok(INDEX.records.every((row) => row.wiring_state === 'WIRED_UNPROBED'));
assert.ok(!readFileSync(new URL('./evolution/obligation-index.json', import.meta.url), 'utf8').match(/"(?:text|rule|prose|excerpt|quote|content)"\s*:/));

assert.deepEqual(
  deriveApplicability('.claude/skills/office/design-brief/SKILL.md#L1'),
  { kind: 'SKILL_ROUTE', key: 'design-brief' },
);
assert.deepEqual(
  deriveApplicability('.claude/hooks/route-guard.mjs#L1'),
  { kind: 'HOOK_EVENT', key: 'UserPromptSubmit' },
);

const ledger = compileObligations({ index: INDEX, context: structuredClone(CONTEXT) });
assert.equal(ledger.entries.length, APPROVED_OBLIGATION_COUNT);
assert.notEqual(ledger.aggregate, 'PASS');
const matchingSkill = ledger.entries.find((entry) => entry.source_pointer.startsWith('.claude/skills/office/design-brief/'));
const otherSkill = ledger.entries.find((entry) => entry.source_pointer.startsWith('.claude/skills/office/html-prototype/'));
assert.equal(matchingSkill.applicability_state, 'APPLICABLE');
assert.equal(matchingSkill.result, 'NOT_RUN');
assert.equal(otherSkill.applicability_state, 'NOT_APPLICABLE');
assert.equal(otherSkill.result, 'NOT_APPLICABLE');
const extractionTriggerMutant = structuredClone(INDEX);
extractionTriggerMutant.records[0].trigger.markers = ['EXTRACTION_PROVENANCE_ONLY'];
const triggerMutantLedger = compileObligations({ index: extractionTriggerMutant, context: structuredClone(CONTEXT) });
assert.deepEqual(
  triggerMutantLedger.entries.map(({ applicability_state, result }) => ({ applicability_state, result })),
  ledger.entries.map(({ applicability_state, result }) => ({ applicability_state, result })),
  'U009 extraction trigger must not drive task applicability',
);

const incomplete = structuredClone(CONTEXT);
incomplete.route.complete = false;
incomplete.route.skills = [];
const unknownLedger = compileObligations({ index: INDEX, context: incomplete });
assert.equal(unknownLedger.aggregate, 'UNKNOWN');
assert.ok(unknownLedger.entries.some((entry) => entry.applicability_state === 'UNKNOWN' && entry.result === 'UNKNOWN'));

const singleLedger = {
  schema_version: 'luca.obligation-ledger.v1',
  context: structuredClone(CONTEXT),
  index_sha256: HASH,
  entries: [{
    obligation_id: matchingSkill.obligation_id,
    source_pointer: matchingSkill.source_pointer,
    class: matchingSkill.class,
    applicable: true,
    applicability_state: 'APPLICABLE',
    result: 'NOT_RUN',
    lane: 'L1_HERMETIC',
    evidence: [{ kind: 'COMPILER_APPLICABILITY', uri: 'obligation:test', sha256: HASH }],
  }],
  aggregate: 'NOT_RUN',
};
assert.throws(() => recordEvidence({
  ledger: singleLedger,
  obligationId: matchingSkill.obligation_id,
  result: 'PASS',
  evidence: [{ kind: 'COMMAND_EXIT', uri: 'self-report:no-artifact', sha256: HASH }],
}), /bound obligation index|OBLIGATION_PROOF|WIRED_UNPROBED|file-backed/);
assert.throws(() => recordEvidence({
  ledger: singleLedger,
  obligationId: matchingSkill.obligation_id,
  result: 'PASS',
  evidence: [],
}), /evidence must be a non-empty array/);

const proofParent = realpathSync(mkdtempSync(join(tmpdir(), 'obligation-proof-fixtures-')));
const activationReceiptPaths = [];
const proofConsumptionPaths = [];
const proofRunId = `${process.pid}-${Date.now()}`;
const proofWriter = join(proofParent, 'secure-receipt-writer');
const compileWriter = spawnSync('/usr/bin/cc', [
  '-std=c11', '-Wall', '-Wextra', '-Werror', '-pedantic', '-O2',
  join(ROOT, 'scripts/native/secure-receipt-writer.c'), '-o', proofWriter,
], { encoding: 'utf8', input: '' });
assert.equal(compileWriter.status, 0, compileWriter.stderr);
chmodSync(proofWriter, 0o700);
const contextForRecord = (record, suffix) => {
  const context = structuredClone(CONTEXT);
  context.invocation_id = `tst-010-proof-${proofRunId}-${suffix}`;
  context.route = { complete: true, skills: [], roles: [], workflows: [], actions: [], paths: [] };
  if (record.applicability.kind === 'SKILL_ROUTE') context.route.skills.push(record.applicability.key);
  if (record.applicability.kind === 'AGENT_ROLE') context.route.roles.push(record.applicability.key);
  if (record.applicability.kind === 'WORKFLOW_ROUTE') context.route.workflows.push(record.applicability.key);
  if (record.applicability.kind === 'ACTION_CONTEXT') context.route.actions.push(record.applicability.key);
  if (record.applicability.kind === 'HOOK_EVENT') context.event = record.applicability.key;
  return context;
};
const authoritativeHumanGate = ({ ledger: proofLedger, record, suffix }) => {
  const receiptRoot = join(proofParent, `${suffix}-human-gate-root`);
  mkdirSync(receiptRoot);
  const paths = Object.fromEntries(['plan', 'payload', 'envelope', 'readback'].map((name) => [name, join(proofParent, `${suffix}-${name}.json`)]));
  writeFileSync(paths.plan, `${JSON.stringify({ plan_id: 'REX-20260811-001' }, null, 2)}\n`);
  writeFileSync(paths.payload, `${JSON.stringify({
    schema_version: 'luca.obligation-human-gate-payload.v1',
    invocation_id: proofLedger.context.invocation_id,
    index_sha256: proofLedger.index_sha256,
    obligation_id: record.id,
    class: record.class,
    lane: proofLedger.context.lane,
  }, null, 2)}\n`);
  writeFileSync(paths.envelope, `${JSON.stringify({ producer: 'TST-010', run: suffix }, null, 2)}\n`);
  writeFileSync(paths.readback, `${JSON.stringify({ applied: true, obligation_id: record.id }, null, 2)}\n`);
  const now = Date.now();
  const prepared = createHumanGateProposal({
    receiptRoot,
    secureWriterPath: proofWriter,
    gate: 'G-OBLIGATION-PROOF',
    planBytes: readFileSync(paths.plan),
    payloadBytes: readFileSync(paths.payload),
    executionEnvelopeBytes: readFileSync(paths.envelope),
    harness: 'codex',
    sessionId: `proof-${suffix}`,
    now: new Date(now - 5000).toISOString(),
    expiresAt: new Date(now + 60000).toISOString(),
  });
  const eventAt = new Date(now - 1000).toISOString();
  recordHumanGateApproval({
    receiptRoot,
    secureWriterPath: proofWriter,
    gate: prepared.proposal.gate,
    proposalId: prepared.proposal.proposal_id,
    planBytes: readFileSync(paths.plan),
    payloadBytes: readFileSync(paths.payload),
    executionEnvelopeBytes: readFileSync(paths.envelope),
    rawPromptBytes: Buffer.from(prepared.exactReply),
    event: {
      role: 'user', top_level: true, authority: 'trusted-bootstrap-main', event_id: `proof-event-${suffix}`,
      event_created_at: eventAt, observed_at: eventAt, harness: 'codex', session_id: `proof-${suffix}`,
    },
  });
  const postStateSha256 = sha256(Buffer.from(`post-state-${suffix}`));
  recordHumanGateResult({
    receiptRoot,
    secureWriterPath: proofWriter,
    gate: prepared.proposal.gate,
    proposalId: prepared.proposal.proposal_id,
    planBytes: readFileSync(paths.plan),
    payloadBytes: readFileSync(paths.payload),
    executionEnvelopeBytes: readFileSync(paths.envelope),
    readbackBytes: readFileSync(paths.readback),
    postStateSha256,
    observedAt: new Date(now - 500).toISOString(),
  });
  return {
    receipt_root: receiptRoot,
    secure_writer_path: proofWriter,
    gate: prepared.proposal.gate,
    proposal_id: prepared.proposal.proposal_id,
    plan_path: paths.plan,
    payload_path: paths.payload,
    execution_envelope_path: paths.envelope,
    readback_path: paths.readback,
    expected_post_state_sha256: postStateSha256,
  };
};

for (const [classIndex, className] of [
  'S0_MACHINE_SAFETY',
  'S1_ROUTING_DISPATCH',
  'S2_COMPLETION_QUALITY',
  'S3_HUMAN_TASTE',
  'S4_NATIVE_CAPABILITY',
].entries()) {
  const sentinel = INDEX.records.find((row) => row.class === className && row.id === CLASS_PROOF_SENTINELS[className]);
  assert.ok(sentinel, `missing ${className} proof sentinel`);
  const proofLedger = compileObligations({ index: INDEX, context: contextForRecord(sentinel, classIndex) });
  const target = proofLedger.entries.find((row) => row.obligation_id === sentinel.id);
  assert.equal(target.result, 'NOT_RUN', `${className} sentinel must be applicable`);
  const humanGate = className === 'S3_HUMAN_TASTE'
    ? authoritativeHumanGate({ ledger: proofLedger, record: sentinel, suffix: classIndex })
    : null;
  const proofPath = join(proofParent, `${classIndex}-proof.json`);
  const proofEvidence = createObligationProof({
    index: INDEX,
    ledger: proofLedger,
    obligationId: sentinel.id,
    outputPath: proofPath,
    humanGate,
    startedAt: '2026-08-14T00:00:03.000Z',
    finishedAt: '2026-08-14T00:00:04.000Z',
    nonce: `proof-nonce-${classIndex}`,
  });
  const pristineProof = JSON.parse(readFileSync(proofPath, 'utf8'));
  activationReceiptPaths.push(pristineProof.activation_receipt.path);
  proofConsumptionPaths.push(join(dirname(pristineProof.activation_receipt.path), `consumed-${pristineProof.receipt_id}.json`));
  const proved = recordEvidence({ ledger: proofLedger, index: INDEX, obligationId: sentinel.id, result: 'PASS', evidence: [proofEvidence] });
  assert.equal(proved.entries.find((row) => row.obligation_id === sentinel.id).result, 'PASS');
  const forged = structuredClone(pristineProof);
  forged.observation = { self_report: 'PASS' };
  const { receipt_id: ignoredReceiptId, ...forgedCore } = forged;
  forged.receipt_id = `op-${sha256(Buffer.from(stable(forgedCore)))}`;
  writeFileSync(proofPath, `${JSON.stringify(forged, null, 2)}\n`);
  const forgedEvidence = { ...proofEvidence, sha256: sha256(readFileSync(proofPath)), receipt_id: forged.receipt_id };
  assert.throws(
    () => recordEvidence({ ledger: proofLedger, index: INDEX, obligationId: sentinel.id, result: 'PASS', evidence: [forgedEvidence] }),
    /activation receipt binding|class verifier/,
    `${className} self-keyed proof must fail`,
  );
}
for (const path of activationReceiptPaths) rmSync(path, { force: true });
for (const path of proofConsumptionPaths) rmSync(path, { force: true });
rmSync(proofParent, { recursive: true, force: true });

const productionVerifier = join(ROOT, 'scripts/evolution/verify-obligation-runtime.mjs');
const manualCiLabelAttack = spawnSync(process.execPath, [productionVerifier, 'l1', '--entrypoint', 'ci'], {
  cwd: ROOT,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.notEqual(manualCiLabelAttack.status, 0, 'manual --entrypoint ci label must not mint a CI PASS receipt');

assert.equal(sha256(readFileSync(new URL('./evolution/obligation-index.json', import.meta.url))).length, 64);
const runtimeSchema = JSON.parse(readFileSync(new URL('./evolution/obligation-runtime.schema.json', import.meta.url), 'utf8'));
const schemaVersions = new Set(runtimeSchema.oneOf.map((branch) => branch.properties?.schema_version?.const).filter(Boolean));
for (const version of [
  'luca.obligation-index.v1',
  'luca.obligation-activation-receipt.v1',
  'luca.obligation-ledger.v1',
  'luca.obligation-execution-run.v1',
  'luca.obligation-execution-receipt.v2',
  'luca.obligation-proof.v1',
  'luca.obligation-mint-authorization.v1',
  'luca.obligation-proof-consumption.v1',
  'luca.obligation-lane-aggregation.v1',
  'luca.obligation-class-invocation.v1',
]) assert.ok(schemaVersions.has(version), `runtime schema missing ${version}`);
assert.equal(schemaVersions.has('luca.obligation-execution-receipt.v1'), false, 'runtime schema still accepts forged receipt v1');

const protectedPaths = [
  'memory/episodic/index.jsonl',
  'memory/evals/eval-log.jsonl',
  'memory/retrieval-log.jsonl',
  'memory/scripts/daily_governance.py',
];
const protectedHashes = Object.fromEntries(protectedPaths.map((path) => [path, sha256(readFileSync(join(ROOT, path)))]));
const cloneParent = mkdtempSync(join(tmpdir(), 'obligation-runtime-clone-'));
const clone = join(cloneParent, 'repo');
const cloneResult = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, clone], { encoding: 'utf8', input: '', timeout: 60000 });
assert.equal(cloneResult.status, 0, cloneResult.stderr);

const candidateFiles = [
  '.claude/settings.json',
  '.codex/hooks.json',
  '.githooks/pre-commit',
  '.github/workflows/ci.yml',
  'scripts/verify.sh',
  'scripts/evolution/obligation-runtime.mjs',
  'scripts/evolution/obligation-task-start-hook.mjs',
  'scripts/evolution/obligation-stop-hook.mjs',
  'scripts/evolution/verify-obligation-runtime.mjs',
  'scripts/evolution/obligation-runtime.schema.json',
  'scripts/evolution/obligation-mutation-matrix.json',
  'scripts/evolution/obligation-index.json',
];
for (const path of candidateFiles) {
  mkdirSync(dirname(join(clone, path)), { recursive: true });
  cpSync(join(ROOT, path), join(clone, path));
}

const indexPath = join(clone, 'scripts/evolution/obligation-index.json');
const matrixPath = join(clone, 'scripts/evolution/obligation-mutation-matrix.json');
const cleanBytes = new Map(candidateFiles.map((path) => [path, readFileSync(join(clone, path))]));
const restore = (path) => writeFileSync(join(clone, path), cleanBytes.get(path));
let biteCount = 0;

const envEscapeTarget = join(cloneParent, 'must-not-be-overwritten.json');
const forgedIndexPath = join(cloneParent, 'forged-index.json');
writeFileSync(envEscapeTarget, 'USER_BYTES_MUST_SURVIVE\n');
writeFileSync(forgedIndexPath, '{}\n');
const envEscapeSession = `tst-010-env-escape-${process.pid}`;
const envEscape = spawnSync(process.execPath, [join(clone, 'scripts/evolution/obligation-task-start-hook.mjs')], {
  cwd: clone,
  env: { ...process.env, LUCA_OBLIGATION_LEDGER_PATH: envEscapeTarget, LUCA_OBLIGATION_INDEX: forgedIndexPath },
  encoding: 'utf8',
  input: JSON.stringify({ session_id: envEscapeSession, cwd: clone, prompt: 'env escape negative', obligation_route_context: CONTEXT.route }),
  timeout: 30000,
});
assert.equal(envEscape.status, 0, envEscape.stderr || envEscape.stdout);
assert.equal(readFileSync(envEscapeTarget, 'utf8'), 'USER_BYTES_MUST_SURVIVE\n', 'ledger env override overwrote caller-selected path');
const cloneGitDir = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: clone, encoding: 'utf8', input: '' }).stdout.trim();
const canonicalEscapeLedger = join(cloneGitDir, 'luca-obligation-runtime', `${sha256(Buffer.from(envEscapeSession)).slice(0, 32)}.json`);
assert.ok(existsSync(canonicalEscapeLedger), 'task-start did not use the canonical git-dir ledger path');
assert.equal(JSON.parse(readFileSync(canonicalEscapeLedger, 'utf8')).index_sha256, sha256(readFileSync(indexPath)), 'task-start honored forged index env override');
rmSync(canonicalEscapeLedger, { force: true });

function assertBites(name, path, mutate, verify, expected) {
  assert.doesNotThrow(verify, `${name} pre-pass`);
  mutate(join(clone, path));
  assert.throws(verify, expected, `${name} mutant was not killed`);
  restore(path);
  assert.doesNotThrow(verify, `${name} post-pass`);
  biteCount += 1;
}

const entrypointVerify = () => verifyProductionEntrypoints({ root: clone, indexPath, matrixPath });
assertBites(
  'consumer removed',
  '.claude/settings.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    config.hooks.UserPromptSubmit = config.hooks.UserPromptSubmit.filter((group) => !JSON.stringify(group).includes('obligation-task-start-hook.mjs'));
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /consumer missing or duplicated/,
);

assertBites(
  'matcher wrong',
  '.codex/hooks.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const group = config.hooks.UserPromptSubmit.find((row) => JSON.stringify(row).includes('obligation-task-start-hook.mjs'));
    group.matcher = '^never$';
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /matcher is wrong/,
);

assertBites(
  'unexpected exit one normalized',
  '.claude/settings.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const group = config.hooks.UserPromptSubmit.find((row) => JSON.stringify(row).includes('obligation-task-start-hook.mjs'));
    group.hooks[0].command = group.hooks[0].command.replace(
      '[ "$c" = "0" ] && exit 0 || exit 2',
      '[ "$c" = "2" ] && exit 2 || exit 0',
    );
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /exact fail-closed native consumer/,
);

assertBites(
  'receipt removed',
  'scripts/evolution/obligation-index.json',
  (path) => {
    const index = JSON.parse(readFileSync(path, 'utf8'));
    delete index.records[0].receipt_kind;
    writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`);
  },
  () => verifyReverseCoverage({ root: clone, indexPath }),
  /keys must be exact/,
);

assertBites(
  'source removed',
  'scripts/evolution/obligation-index.json',
  (path) => {
    const index = JSON.parse(readFileSync(path, 'utf8'));
    index.records.pop();
    writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`);
  },
  () => verifyReverseCoverage({ root: clone, indexPath }),
  /denominator mismatch/,
);

assertBites(
  'real behavior no-op',
  'scripts/evolution/obligation-task-start-hook.mjs',
  (path) => {
    const text = readFileSync(path, 'utf8');
    const before = 'process.stdout.write(await taskStartHook(Buffer.concat(chunks)));';
    assert.ok(text.includes(before), 'real behavior mutation anchor missing');
    writeFileSync(path, text.replace(before, "process.stdout.write('[obligation-runtime] noop\\n');"));
  },
  () => verifyRealBehavior({ root: clone, indexPath }),
  /task-start native behavior failed/,
);

const codexConfig = JSON.parse(readFileSync(join(clone, '.codex/hooks.json'), 'utf8'));
const trustedHooks = [];
for (const event of ['UserPromptSubmit', 'Stop']) {
  for (const [groupIndex, group] of codexConfig.hooks[event].entries()) {
    for (const [hookIndex, hook] of (group.hooks || []).entries()) {
      if (!hook.command.includes('obligation-task-start-hook.mjs') && !hook.command.includes('obligation-stop-hook.mjs')) continue;
      trustedHooks.push({
        eventName: event[0].toLowerCase() + event.slice(1),
        key: `${realpathSync(join(clone, '.codex/hooks.json'))}:${event.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}:${groupIndex}:${hookIndex}`,
        command: hook.command,
        trustStatus: 'trusted',
        currentHash: `sha256:${'b'.repeat(64)}`,
      });
    }
  }
}
await assert.doesNotReject(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksProvider: async () => trustedHooks }));
const untrusted = structuredClone(trustedHooks);
untrusted[0].trustStatus = 'untrusted';
await assert.rejects(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksProvider: async () => untrusted }), /untrusted/);
await assert.doesNotReject(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksProvider: async () => trustedHooks }));
biteCount += 1;

const latticeVerify = () => verifyRuntimeLattice({ root: clone });
assertBites(
  'NOT_RUN normalized to PASS',
  'scripts/evolution/obligation-runtime.mjs',
  (path) => {
    const text = readFileSync(path, 'utf8');
    const before = "if (applicable.some((entry) => entry.result === 'NOT_RUN')) return 'NOT_RUN';";
    assert.ok(text.includes(before), 'NOT_RUN mutation anchor missing');
    writeFileSync(path, text.replace(before, "if (applicable.some((entry) => entry.result === 'NOT_RUN')) return 'PASS';"));
  },
  latticeVerify,
  /lattice production self-test failed/,
);

for (const className of ['S0_MACHINE_SAFETY', 'S3_HUMAN_TASTE']) {
  assertBites(
    `${className} DEGRADED allowed`,
    'scripts/evolution/obligation-runtime.mjs',
    (path) => {
      const text = readFileSync(path, 'utf8');
      const before = "if (entry.result === 'DEGRADED' && (entry.class === 'S0_MACHINE_SAFETY' || entry.class === 'S3_HUMAN_TASTE')) {";
      assert.ok(text.includes(before), `${className} mutation anchor missing`);
      const after = className === 'S0_MACHINE_SAFETY'
        ? "if (entry.result === 'DEGRADED' && entry.class === 'S3_HUMAN_TASTE') {"
        : "if (entry.result === 'DEGRADED' && entry.class === 'S0_MACHINE_SAFETY') {";
      writeFileSync(path, text.replace(before, after));
    },
    latticeVerify,
    /lattice production self-test failed/,
  );
}

assert.equal(biteCount, 10);

const cloneRuntime = await import(`${pathToFileURL(join(clone, 'scripts/evolution/obligation-runtime.mjs')).href}?s4-hash-attack=${Date.now()}`);
const cloneIndex = cloneRuntime.loadIndex(indexPath);
const s4Record = cloneIndex.records.find((row) => row.id === cloneRuntime.CLASS_PROOF_SENTINELS.S4_NATIVE_CAPABILITY);
assert.ok(s4Record, 'missing fixed S4 sentinel in clone');
const s4ProofParent = mkdtempSync(join(tmpdir(), 'obligation-s4-hash-attack-'));
const s4ProofAttempt = (suffix) => {
  const outputRoot = join(s4ProofParent, suffix);
  mkdirSync(outputRoot);
  const context = structuredClone(CONTEXT);
  context.invocation_id = `tst-010-s4-hash-${process.pid}-${suffix}`;
  context.cwd = clone;
  context.route = { complete: true, skills: [], roles: [], workflows: [], actions: ['agent-runtime'], paths: [] };
  const ledger = cloneRuntime.compileObligations({ index: cloneIndex, context });
  const evidence = cloneRuntime.createObligationProof({
    index: cloneIndex,
    ledger,
    obligationId: s4Record.id,
    outputPath: join(outputRoot, 'proof.json'),
    nonce: `s4-hash-${suffix}`,
  });
  const proof = JSON.parse(readFileSync(fileURLToPath(evidence.uri), 'utf8'));
  rmSync(proof.activation_receipt.path, { force: true });
  return evidence;
};
assert.doesNotThrow(() => s4ProofAttempt('pre'), 'S4 checker hash attack pre-pass');
const s4CheckerPath = join(clone, 'scripts/check-codex-viability.mjs');
const s4CheckerBytes = readFileSync(s4CheckerPath);
writeFileSync(s4CheckerPath, '#!/usr/bin/env node\nprocess.stdout.write("forged PASS\\n");\n');
assert.throws(() => s4ProofAttempt('mutant'), /sentinel executable hash changed/, 'S4 no-op checker/hash mutant was not killed');
writeFileSync(s4CheckerPath, s4CheckerBytes);
assert.doesNotThrow(() => s4ProofAttempt('post'), 'S4 checker hash attack post-pass');
rmSync(s4ProofParent, { recursive: true, force: true });
const sentinelMutationAttacks = 1;

const verifier = join(clone, 'scripts/evolution/verify-obligation-runtime.mjs');
const sharedRunPath = join(cloneParent, 'shared-run.json');
const startRun = spawnSync(process.execPath, [verifier, 'run-start', '--output', sharedRunPath], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(startRun.status, 0, startRun.stderr || startRun.stdout);
const verifyReceiptPath = join(cloneParent, 'verify.json');
const verifyRun = spawnSync(process.execPath, [verifier, 'l1-verify', '--run-ticket', sharedRunPath, '--receipt-output', verifyReceiptPath], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(verifyRun.status, 0, verifyRun.stderr || verifyRun.stdout);
const verifyReceipt = JSON.parse(readFileSync(verifyReceiptPath, 'utf8'));
assert.equal(verifyReceipt.entrypoint, 'verify');
const runtimeNamespace = await import('./evolution/obligation-runtime.mjs');
assert.equal(Object.hasOwn(runtimeNamespace, 'mintExecutionReceipt'), false, 'receipt mint helper must remain private');
assert.equal(Object.hasOwn(runtimeNamespace, 'makeExecutionReceipt'), false, 'legacy receipt mint export must remain absent');

const receiptProducer = join(clone, 'scripts/evolution/obligation-runtime.mjs');
const forgedProducerRequest = spawnSync(process.execPath, [receiptProducer, 'receipt-producer'], {
  cwd: clone,
  encoding: 'utf8',
  input: JSON.stringify({
    root: clone, indexPath, runTicketPath: sharedRunPath, entrypoint: 'verify', lane: 'L1_HERMETIC',
    executedChecks: ['INDEX-SCHEMA'], classes: ['S0_MACHINE_SAFETY'], result: 'PASS',
    startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), exitCode: 0,
    argv: [verifier, 'l1-verify'], artifactPaths: [],
  }),
  timeout: 30000,
});
assert.notEqual(forgedProducerRequest.status, 0, 'direct fixed-profile receipt-producer request must fail');
const replayMint = spawnSync(process.execPath, [receiptProducer, 'receipt-producer', '--authorization', verifyReceipt.mint_authorization.path], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.notEqual(replayMint.status, 0, 'consumed mint authorization replay from a foreign parent must fail');

const resignReceipt = (value) => {
  const next = structuredClone(value);
  delete next.receipt_id;
  next.receipt_id = `orc-${sha256(Buffer.from(stable(next)))}`;
  return next;
};
let receiptAttackCount = 0;
const assertReceiptTamperRejected = (name, mutate) => {
  const candidate = structuredClone(verifyReceipt);
  mutate(candidate);
  const path = join(cloneParent, `tampered-${receiptAttackCount}.json`);
  writeFileSync(path, `${JSON.stringify(resignReceipt(candidate), null, 2)}\n`);
  const run = spawnSync(process.execPath, [verifier, 'aggregate', path], { cwd: clone, encoding: 'utf8', input: '', timeout: 30000 });
  assert.notEqual(run.status, 0, `${name} fresh-hash tamper unexpectedly passed`);
  receiptAttackCount += 1;
};
assertReceiptTamperRejected('command', (receipt) => { receipt.command = JSON.stringify(['/bin/true']); });
assertReceiptTamperRejected('argv', (receipt) => { receipt.argv[1] = 'l1-ci'; });
assertReceiptTamperRejected('entrypoint hash', (receipt) => { receipt.entrypoint_binding.sha256 = HASH; });
assertReceiptTamperRejected('exit/result', (receipt) => { receipt.exit_code = 1; receipt.result = 'NOT_RUN'; });
assertReceiptTamperRejected('executed checks', (receipt) => { receipt.executed_check_ids.pop(); });
assertReceiptTamperRejected('classes', (receipt) => { receipt.classes.pop(); });
assertReceiptTamperRejected('artifact hash', (receipt) => { receipt.artifact_readbacks[0].sha256 = HASH; });
assertReceiptTamperRejected('mint authorization hash', (receipt) => { receipt.mint_authorization.sha256 = HASH; });
assertReceiptTamperRejected('stale commit/tree', (receipt) => { receipt.commit = 'f'.repeat(40); receipt.tree = 'e'.repeat(40); });

const detailArtifact = verifyReceipt.artifact_readbacks.find((item) => item.role === 'execution_detail');
const detailBytes = readFileSync(detailArtifact.path);
writeFileSync(detailArtifact.path, Buffer.concat([detailBytes, Buffer.from('\n')])) ;
const fakeLogRun = spawnSync(process.execPath, [verifier, 'aggregate', verifyReceiptPath], { cwd: clone, encoding: 'utf8', input: '', timeout: 30000 });
assert.notEqual(fakeLogRun.status, 0, 'post-receipt execution-detail mutation must fail readback');
writeFileSync(detailArtifact.path, detailBytes);

for (const attack of [
  ['l1', '--entrypoint', 'ci'],
  ['l1-pre-commit'],
  ['l1-ci'],
  ['l2', '--harness', 'codex', '--codex-hooks-fixture', 'forged.json'],
  ['l3', '--external-fixture', 'forged.json'],
]) {
  const run = spawnSync(process.execPath, [verifier, ...attack], { cwd: clone, encoding: 'utf8', input: '', timeout: 30000 });
  assert.notEqual(run.status, 0, `production identity/fixture attack unexpectedly passed: ${attack.join(' ')}`);
}

const singleL2RunPath = join(cloneParent, 'single-l2-run.json');
const singleL2Start = spawnSync(process.execPath, [verifier, 'run-start', '--output', singleL2RunPath], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(singleL2Start.status, 0, singleL2Start.stderr || singleL2Start.stdout);
const singleClaudeReceipt = join(cloneParent, 'single-claude-l2.json');
const singleClaude = spawnSync(process.execPath, [verifier, 'l2', '--harness', 'claude', '--run-ticket', singleL2RunPath, '--receipt-output', singleClaudeReceipt], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 120000,
});
assert.equal(singleClaude.status, 0, singleClaude.stderr || singleClaude.stdout);
const singleL2Aggregate = spawnSync(process.execPath, [verifier, 'aggregate', singleClaudeReceipt], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(singleL2Aggregate.status, 1);
assert.equal(singleL2Aggregate.stdout.trim(), 'NOT_RUN', 'single-harness L2 must not satisfy the dual-harness lane');

const githubEventPath = join(cloneParent, 'github-event.json');
writeFileSync(githubEventPath, `${JSON.stringify({ ref: 'refs/heads/test', repository: { full_name: 'luca/test' } }, null, 2)}\n`);
const cloneHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: clone, encoding: 'utf8', input: '' }).stdout.trim();
const ciReceiptPath = join(cloneParent, 'ci.json');
const fakeRunSh = join(cloneParent, 'run.sh');
writeFileSync(fakeRunSh, '#!/bin/sh\n"$@"\n');
const ciRun = spawnSync('/bin/sh', [fakeRunSh, process.execPath, verifier, 'l1-ci', '--receipt-output', ciReceiptPath], {
  cwd: clone,
  env: {
    ...process.env,
    CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: '101', GITHUB_RUN_ATTEMPT: '1',
    GITHUB_SHA: cloneHead, GITHUB_WORKFLOW_REF: 'luca/test/.github/workflows/ci.yml@refs/heads/test',
    GITHUB_EVENT_PATH: githubEventPath, GITHUB_JOB: 'test', GITHUB_REPOSITORY: 'luca/test',
    GITHUB_WORKSPACE: clone, RUNNER_OS: 'macOS', RUNNER_NAME: 'forged-local-runner', RUNNER_TEMP: cloneParent,
  },
  encoding: 'utf8', input: '', timeout: 30000,
});
assert.notEqual(ciRun.status, 0, 'locally forged GitHub Actions environment must not mint a CI receipt');
assert.equal(existsSync(ciReceiptPath), false, 'forged CI context published a receipt');

const l3Receipt = join(cloneParent, 'l3.json');
const l3Run = spawnSync(process.execPath, [verifier, 'l3', '--run-ticket', sharedRunPath, '--receipt-output', l3Receipt], {
  cwd: clone,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(l3Run.status, 1);
assert.equal(JSON.parse(readFileSync(l3Receipt, 'utf8')).result, 'NOT_RUN');

const foreignRunPath = join(cloneParent, 'foreign-run.json');
const foreignStart = spawnSync(process.execPath, [verifier, 'run-start', '--output', foreignRunPath], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(foreignStart.status, 0, foreignStart.stderr || foreignStart.stdout);
const foreignL3Receipt = join(cloneParent, 'foreign-l3.json');
const foreignL3 = spawnSync(process.execPath, [verifier, 'l3', '--run-ticket', foreignRunPath, '--receipt-output', foreignL3Receipt], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.equal(foreignL3.status, 1);
assert.ok(existsSync(foreignL3Receipt), foreignL3.stderr || foreignL3.stdout);
const foreignAggregate = spawnSync(process.execPath, [verifier, 'aggregate', verifyReceiptPath, foreignL3Receipt], {
  cwd: clone, encoding: 'utf8', input: '', timeout: 30000,
});
assert.notEqual(foreignAggregate.status, 0, 'foreign run receipt mix must fail');

const aggregateRun = spawnSync(process.execPath, [verifier, 'aggregate', verifyReceiptPath, l3Receipt], {
  cwd: clone,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(aggregateRun.status, 1);
assert.equal(aggregateRun.stdout.trim(), 'NOT_RUN');
const aggregateReplay = spawnSync(process.execPath, [verifier, 'aggregate', verifyReceiptPath, l3Receipt], {
  cwd: clone,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.notEqual(aggregateReplay.status, 0, 'same run/receipt aggregation replay must fail');

writeFileSync(join(clone, 'README.md'), `${readFileSync(join(clone, 'README.md'), 'utf8')}\n`);
assert.equal(spawnSync('git', ['add', '--', 'README.md'], { cwd: clone, encoding: 'utf8', input: '' }).status, 0);
assert.equal(spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: clone, encoding: 'utf8', input: '' }).status, 0);
const fastCommit = spawnSync('git', ['-c', 'user.name=TST-010', '-c', 'user.email=tst-010@example.invalid', 'commit', '-m', 'test: exercise native precommit'], {
  cwd: clone,
  env: { ...process.env, FAST_COMMIT: '1' },
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(fastCommit.status, 0, fastCommit.stderr || fastCommit.stdout);
assert.match(`${fastCommit.stdout}\n${fastCommit.stderr}`, /"entrypoint":"pre-commit"/);
assert.match(`${fastCommit.stdout}\n${fastCommit.stderr}`, /FAST_COMMIT=1/);

for (const path of protectedPaths) assert.equal(sha256(readFileSync(join(ROOT, path))), protectedHashes[path], `${path} changed during U010 tests`);
rmSync(cloneParent, { recursive: true, force: true });

console.log(`PASS obligation runtime lattice/index/compiler/ledger; mutants_killed=${biteCount}; sentinel_mutants_killed=${sentinelMutationAttacks}; receipt_attacks_rejected=${receiptAttackCount + 5}`);
