#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign as signBytes } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  classifyClaudeModelProbe as classifyClaudeModelProbeRaw,
  LOGICAL_ROLES,
  loadWorkPacket,
  nativeDispatchContract as candidateDispatchContract,
  prepareNativeLaunch,
  resolveClaudeProjectionForLaunch,
  resolveRole,
  validateWorkPacket,
} from './agent-launcher.mjs';
import {
  buildNativeLaunch,
  nativeDispatchContract as tcbDispatchContract,
  parseRouting,
  targetTreeManifest as deriveTargetTreeManifest,
  validatePacket as validateTcbPacket,
} from './evolution/agent-evidence-tcb.mjs';
import {
  NATIVE_PROOF_RECEIPT_PATH,
  NATIVE_ROUTE_GATE_COMMAND,
  NATIVE_ROUTE_SURFACES,
  collectNativeRouteSurfaces,
  findNativeRouteBypasses,
  verifyNativeRouteActivation,
} from './check-agents-parity.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, 'scripts/fixtures/agent-valid-work-packet.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const jsonBytes = (value) => Buffer.from(`${stable(value)}\n`, 'utf8');
const mkdir700 = (path) => { mkdirSync(path, { recursive: true, mode: 0o700 }); chmodSync(path, 0o700); };
const write0600 = (path, bytes) => {
  mkdir700(dirname(path));
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600);
};
const signed = (privateKey, core, hashKey, signatureKey) => {
  const payload = Buffer.from(stable(core), 'utf8');
  return { ...core, [hashKey]: sha256(payload), [signatureKey]: signBytes(null, payload, privateKey).toString('base64') };
};
const signedEvent = (privateKey, kind, sequence, previous, payload) => signed(privateKey, {
  schema_version: 'luca.agent-evidence-event.v2', kind, sequence, previous_sha256: previous, payload,
}, 'event_sha256', 'signature_ed25519');
const run = (command, args, options = {}) => spawnSync(command, args, {
  cwd: options.cwd || root, encoding: 'utf8', input: '', env: options.env || process.env,
});
const gitFixture = (cwd, args) => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, {
    GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0',
    GIT_AUTHOR_NAME: 'route-fixture', GIT_AUTHOR_EMAIL: 'route-fixture@localhost',
    GIT_COMMITTER_NAME: 'route-fixture', GIT_COMMITTER_EMAIL: 'route-fixture@localhost',
  });
  const result = run('git', args, { cwd, env });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
};
const clone = () => structuredClone(fixture);
const rejects = (label, mutate, pattern) => {
  const value = clone();
  mutate(value);
  assert.throws(() => validateWorkPacket(value), pattern, label);
};

const valid = validateWorkPacket(fixture);
assert.equal(valid.packet.packet_id, 'wp-native-smoke-v1');
assert.match(valid.packet.inputs[0].content, /\{\{ACCOUNT_ID\}\}/);
assert.equal(valid.packet.inputs[0].content_sha256, sha256(valid.packet.inputs[0].content));
assert.equal(loadWorkPacket(fixturePath).sha256, valid.sha256);

rejects('missing required field', (p) => { delete p.rollback; }, /keys must be exact/);
rejects('extra top-level field', (p) => { p.untrusted = true; }, /keys must be exact/);
rejects('empty ownership', (p) => { p.ownership = []; }, /nonempty array/);
rejects('wrong logical role', (p) => { p.logical_role = 'plan-agent'; }, /logical_role/);
rejects('wrong typed expected exit', (p) => { p.verification[0].expected_exit = '0'; }, /expected_exit/);
rejects('path traversal', (p) => { p.outputs[0].path = '../escape'; }, /non-traversing/);
rejects('input hash substitution', (p) => { p.inputs[0].content += 'changed'; }, /content hash mismatch/);
rejects('mutable protected overlap', (p) => { p.protected_paths = ['@response']; }, /protected path/);
rejects('file/ownership contradiction', (p) => { p.files[0].access = 'read'; }, /declared mutable file|does not match ownership/);
rejects('output without mutable ownership', (p) => { p.ownership[0].access = 'read'; p.files[0].access = 'read'; }, /no mutable ownership/);
rejects('output without done criterion', (p) => { p.outputs[0].done_criterion_ids = []; }, /nonempty array/);
rejects('unknown done criterion', (p) => { p.outputs[0].done_criterion_ids = ['DONE-MISSING']; }, /unknown done criterion/);
rejects('duplicate ownership', (p) => { p.ownership.push(structuredClone(p.ownership[0])); }, /duplicate ownership/);
rejects('arbitrary extra nested field', (p) => { p.inputs[0].command = 'true'; }, /keys must be exact/);
rejects('duplicate file', (p) => { p.files.push(structuredClone(p.files[0])); }, /duplicate file/);
rejects('duplicate input id', (p) => { p.inputs.push(structuredClone(p.inputs[0])); }, /input IDs/);
rejects('duplicate done criterion', (p) => { p.done_criteria.push(structuredClone(p.done_criteria[0])); }, /duplicate done criterion/);
rejects('duplicate verification id', (p) => { p.verification.push(structuredClone(p.verification[0])); }, /verification IDs/);
rejects('duplicate constraint', (p) => { p.constraints.push(p.constraints[0]); }, /constraints contains duplicates/);
rejects('duplicate rollback', (p) => { p.rollback.push(p.rollback[0]); }, /rollback contains duplicates/);
rejects('array packet id', (p) => { p.packet_id = [p.packet_id]; }, /invalid packet_id/);
rejects('array input id', (p) => { p.inputs[0].id = [p.inputs[0].id]; }, /id is invalid/);
rejects('array done id/reference', (p) => {
  const shared = [p.done_criteria[0].id];
  p.done_criteria[0].id = shared;
  p.outputs[0].done_criterion_ids[0] = shared;
}, /id is invalid/);
rejects('array verification id', (p) => { p.verification[0].id = [p.verification[0].id]; }, /id is invalid/);
rejects('phase_id over schema max', (p) => { p.phase_id = 'p'.repeat(129); }, /at most 128/);
rejects('cwd_key over schema max', (p) => { p.cwd_key = 'c'.repeat(257); }, /at most 256/);
rejects('goal over schema max', (p) => { p.goal = 'g'.repeat(4097); }, /at most 4096/);
rejects('path over schema max', (p) => { p.outputs[0].path = 'a'.repeat(1025); }, /at most 1024/);
rejects('owner over schema max', (p) => { p.ownership[0].owner = 'o'.repeat(257); }, /at most 256/);
rejects('purpose over schema max', (p) => { p.files[0].purpose = 'p'.repeat(2049); }, /at most 2048/);
rejects('input source over schema max', (p) => { p.inputs[0].source = 's'.repeat(2049); }, /at most 2048/);
rejects('constraint over schema max', (p) => { p.constraints[0] = 'c'.repeat(4097); }, /at most 4096/);
rejects('output description over schema max', (p) => { p.outputs[0].description = 'd'.repeat(2049); }, /at most 2048/);
rejects('done statement over schema max', (p) => { p.done_criteria[0].statement = 'd'.repeat(4097); }, /at most 4096/);
rejects('verification command over schema max', (p) => { p.verification[0].command = 'v'.repeat(8193); }, /at most 8192/);
rejects('rollback over schema max', (p) => { p.rollback[0] = 'r'.repeat(4097); }, /at most 4096/);
const emojiBoundary = clone();
emojiBoundary.phase_id = '🧪'.repeat(128);
assert.doesNotThrow(() => validateWorkPacket(emojiBoundary));
rejects('unicode phase_id over schema max', (p) => { p.phase_id = '🧪'.repeat(129); }, /at most 128/);
for (const unsafe of ['a//b', 'a/./b', 'a/../b', '..\\escape', 'C:\\escape', 'trailing/']) {
  rejects(`non-canonical path ${unsafe}`, (p) => { p.outputs[0].path = unsafe; }, /canonical non-traversing/);
}
rejects('protected directory descendant', (p) => {
  p.protected_paths = ['framework'];
  p.ownership[0].path = 'framework/out';
  p.files[0].path = 'framework/out';
  p.outputs[0].path = 'framework/out';
}, /protected path overlaps/);
rejects('mutable ancestor of protected path', (p) => {
  p.protected_paths = ['framework/out'];
  p.ownership[0].path = 'framework';
  p.files[0].path = 'framework';
  p.outputs[0].path = 'framework';
}, /protected path overlaps/);
rejects('output absent from declared files', (p) => { p.files[0].path = 'other'; p.ownership.push({ path: 'other', owner: 'work-agent', access: 'create' }); }, /not a declared mutable file/);

const mutableSource = clone();
const frozenResult = validateWorkPacket(mutableSource);
mutableSource.goal = 'attacker mutation after validation';
assert.notEqual(frozenResult.packet.goal, mutableSource.goal);
assert.ok(Object.isFrozen(frozenResult.packet));
assert.ok(Object.isFrozen(frozenResult.packet.inputs[0]));

for (const key of ['constraints', 'rollback', 'inputs', 'verification', 'outputs']) {
  const sparse = clone();
  sparse[key] = new Array(1);
  assert.throws(() => validateWorkPacket(sparse), /dense nonempty array/, `sparse ${key} must fail`);
}
const exotic = clone();
Object.setPrototypeOf(exotic.inputs[0], { attacker: true });
assert.throws(() => validateWorkPacket(exotic), /must be an object/);
const nonJson = clone();
nonJson.inputs[0].source = undefined;
assert.throws(() => validateWorkPacket(nonJson), /nonempty string|JSON/);

assert.deepEqual([...LOGICAL_ROLES], ['plan-agent', 'work-agent', 'oracle', 'quality-gate']);
for (const harness of ['claude', 'codex']) {
  for (const role of LOGICAL_ROLES) {
    const resolved = resolveRole({ root, harness, role });
    assert.equal(resolved.role, role);
    assert.equal(resolved.harness, harness);
    assert.match(resolved.definition_sha256, /^[a-f0-9]{64}$/);
    assert.match(resolved.routing_sha256, /^[a-f0-9]{64}$/);
    const exactProjection = {
      claude: { 'plan-agent': 'fable', 'work-agent': 'opus', oracle: 'fable', 'quality-gate': 'opus' },
      codex: { 'plan-agent': 'xhigh', 'work-agent': 'high', oracle: 'xhigh', 'quality-gate': 'high' },
    };
    assert.equal(resolved.projection, exactProjection[harness][role]);
  }
}

const jsonl = (...events) => `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
const PROBE_CWD = resolve(tmpdir(), 'agent-launcher-model-probe-fixture');
const classifyClaudeModelProbe = (args) => classifyClaudeModelProbeRaw({
  ...args,
  expectedCwd: args.expectedCwd || PROBE_CWD,
  allowCreditsRequired: args.allowCreditsRequired ?? args.expectedAlias === 'fable',
});
const successProbeStream = (alias, { rateStatus = 'allowed', withToolUse = false } = {}) => jsonl(
  { type: 'system', subtype: 'init', session_id: 'probe-session', tools: [], permissionMode: 'dontAsk',
    cwd: PROBE_CWD, model: `claude-${alias}-test` },
  ...(rateStatus ? [{ type: 'rate_limit_event', session_id: 'probe-session', rate_limit_info: { status: rateStatus } }] : []),
  { type: 'assistant', session_id: 'probe-session', parent_tool_use_id: null,
    message: { model: `claude-${alias}-test`, content: [withToolUse
    ? { type: 'tool_use', id: 'tool-1', name: 'Bash', input: {} }
    : { type: 'text', text: 'LUCA_CLAUDE_MODEL_PROBE_OK' }] } },
  { type: 'result', session_id: 'probe-session', subtype: 'success', is_error: false,
    result: 'LUCA_CLAUDE_MODEL_PROBE_OK', terminal_reason: 'completed' },
);
const creditsProbeStream = ({ code = 'credits_required', status = 'rejected', apiStatus = 429,
  terminalReason = 'api_error', model = '<synthetic>', parentToolUseId = null,
  isApiErrorMessage = true, error = 'rate_limit', text = 'Fable 5 requires usage credits. Run /usage-credits to continue or switch models with /model.',
  resultText = text, extraAssistant = false } = {}) => jsonl(
  { type: 'system', subtype: 'init', session_id: 'probe-session', tools: [], permissionMode: 'dontAsk',
    cwd: PROBE_CWD, model: 'claude-fable-5-test' },
  { type: 'rate_limit_event', session_id: 'probe-session', rate_limit_info: { status, errorCode: code } },
  { type: 'assistant', session_id: 'probe-session', parent_tool_use_id: parentToolUseId,
    is_api_error_message: isApiErrorMessage, error,
    message: { model, content: [{ type: 'text', text }] } },
  ...(extraAssistant ? [{ type: 'assistant', session_id: 'probe-session', parent_tool_use_id: null, is_api_error_message: true,
    error: 'rate_limit', message: { model: '<synthetic>', content: [{ type: 'text', text }] } }] : []),
  { type: 'result', session_id: 'probe-session', subtype: 'success', is_error: true, result: resultText,
    api_error_status: apiStatus, terminal_reason: terminalReason },
);

assert.deepEqual(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('fable'), expectedAlias: 'fable' }),
  { outcome: 'success', reason: 'exact_success' });
assert.deepEqual(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('opus', { rateStatus: 'allowed' }), expectedAlias: 'opus' }),
  { outcome: 'success', reason: 'exact_success' });
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('fable', { rateStatus: null }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('fable', { rateStatus: 'rejected' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: successProbeStream('fable'), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('fable'), stderr: 'warning\n', expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('opus'), expectedAlias: 'fable' }).outcome, 'rejected');
assert.deepEqual(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream(), expectedAlias: 'fable' }),
  { outcome: 'credits_required', reason: 'credits_required' });
assert.equal(classifyClaudeModelProbe({ status: 1,
  stdout: creditsProbeStream({ text: 'Opus 5 requires usage credits.', resultText: 'Opus 5 requires usage credits.' }),
  expectedAlias: 'opus' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: creditsProbeStream(), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream(), stderr: 'warning\n', expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: 'Fable requires credits\n', expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ code: 'rate_limit_exceeded' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ apiStatus: 401 }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ terminalReason: 'network_error' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ model: 'claude-fable-5' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ parentToolUseId: 'tool-1' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ isApiErrorMessage: false }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ error: 'authentication_error' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ text: 'Opus 5 requires usage credits.' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ resultText: 'different error' }), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 1, stdout: creditsProbeStream({ extraAssistant: true }), expectedAlias: 'fable' }).outcome, 'rejected');
const reorderedSuccessEvents = successProbeStream('fable').trim().split('\n').map((line) => JSON.parse(line));
[reorderedSuccessEvents[1], reorderedSuccessEvents[2]] = [reorderedSuccessEvents[2], reorderedSuccessEvents[1]];
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: jsonl(...reorderedSuccessEvents), expectedAlias: 'fable' }).outcome, 'rejected');
const mismatchedSessionEvents = successProbeStream('fable').trim().split('\n').map((line) => JSON.parse(line));
mismatchedSessionEvents[2].session_id = 'different-session';
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: jsonl(...mismatchedSessionEvents), expectedAlias: 'fable' }).outcome, 'rejected');
assert.equal(classifyClaudeModelProbe({ status: 0, stdout: successProbeStream('fable', { withToolUse: true }), expectedAlias: 'fable' }).reason, 'tool_invocation_observed');
assert.equal(classifyClaudeModelProbeRaw({ status: 0, stdout: successProbeStream('fable'), expectedAlias: 'fable',
  expectedCwd: resolve(PROBE_CWD, 'different') }).outcome, 'rejected');

let probeAliases = [];
assert.deepEqual(resolveClaudeProjectionForLaunch({ root, role: 'plan-agent', probe: (alias) => {
  probeAliases.push(alias); return { outcome: 'success', reason: 'exact_success' };
} }), { projectionMode: 'primary', primary: 'fable', effective: 'fable', reason: null });
assert.deepEqual(probeAliases, ['fable'], 'primary success must probe exactly once');
probeAliases = [];
assert.deepEqual(resolveClaudeProjectionForLaunch({ root, role: 'plan-agent', probe: (alias) => {
  probeAliases.push(alias);
  return alias === 'fable' ? { outcome: 'credits_required', reason: 'credits_required' }
    : { outcome: 'success', reason: 'exact_success' };
} }), { projectionMode: 'fallback', primary: 'fable', effective: 'opus', reason: 'credits_required' });
assert.deepEqual(probeAliases, ['fable', 'opus'], 'credits fallback must probe exactly primary then YAML fallback');
probeAliases = [];
assert.throws(() => resolveClaudeProjectionForLaunch({ root, role: 'plan-agent', probe: (alias) => {
  probeAliases.push(alias); return { outcome: 'rejected', reason: 'auth_error' };
} }), /reason=auth_error/);
assert.deepEqual(probeAliases, ['fable'], 'non-credits failure must not probe fallback');
probeAliases = [];
assert.throws(() => resolveClaudeProjectionForLaunch({ root, role: 'plan-agent', probe: (alias) => {
  probeAliases.push(alias);
  return alias === 'fable' ? { outcome: 'credits_required', reason: 'credits_required' }
    : { outcome: 'rejected', reason: 'fallback_failed' };
} }), /projection=opus reason=fallback_failed/);
assert.deepEqual(probeAliases, ['fable', 'opus'], 'fallback failure must stop after exactly two probes');

const probePolicies = [];
resolveClaudeProjectionForLaunch({ root, role: 'plan-agent', probe: (alias, policy) => {
  probePolicies.push({ alias, ...policy });
  return alias === 'fable' ? { outcome: 'credits_required', reason: 'credits_required' }
    : { outcome: 'success', reason: 'exact_success' };
} });
assert.deepEqual(probePolicies, [
  { alias: 'fable', allowCreditsRequired: true },
  { alias: 'opus', allowCreditsRequired: false },
], 'only a YAML-declared primary fallback may classify credits_required');
probePolicies.length = 0;
resolveClaudeProjectionForLaunch({ root, role: 'work-agent', probe: (alias, policy) => {
  probePolicies.push({ alias, ...policy });
  return { outcome: 'success', reason: 'exact_success' };
} });
assert.deepEqual(probePolicies, [{ alias: 'opus', allowCreditsRequired: false }],
  'a tier without YAML fallback must not classify credits_required');

assert.equal(resolveRole({ root, harness: 'claude', role: 'plan-agent', projectionMode: 'fallback' }).projection, 'opus');
assert.throws(() => resolveRole({ root, harness: 'claude', role: 'work-agent', projectionMode: 'fallback' }), /no fallback projection/);
assert.throws(() => resolveRole({ root, harness: 'codex', role: 'plan-agent', projectionMode: 'fallback' }), /Codex projectionMode must be primary/);
assert.throws(() => resolveRole({ root, harness: 'claude', role: 'plan-agent', projectionMode: 'opus' }), /unknown projectionMode/);

const routingFixture = mkdtempSync(resolve(tmpdir(), 'agent-launcher-routing-'));
mkdirSync(resolve(routingFixture, '.claude/skill-os'), { recursive: true });
mkdirSync(resolve(routingFixture, '.claude/agents'), { recursive: true });
copyFileSync(resolve(root, '.claude/agents/plan-agent.md'), resolve(routingFixture, '.claude/agents/plan-agent.md'));
const routingSource = readFileSync(resolve(root, '.claude/skill-os/model-routing.yaml'), 'utf8');
const writeRouting = (text) => writeFileSync(resolve(routingFixture, '.claude/skill-os/model-routing.yaml'), text);
writeRouting(routingSource.replace('fallback: opus', 'fallback: sonnet'));
assert.throws(() => resolveRole({ root: routingFixture, harness: 'claude', role: 'plan-agent' }), /must be the next lower/);
writeRouting(routingSource.replace('fallback: opus', 'fallback: fable'));
assert.throws(() => resolveRole({ root: routingFixture, harness: 'claude', role: 'plan-agent' }), /must be the next lower/);
writeRouting(routingSource.replace('fallback: opus', 'fallback: unknown-model'));
assert.throws(() => resolveRole({ root: routingFixture, harness: 'claude', role: 'plan-agent' }), /outside known_lineup/);
writeRouting(routingSource.replace('  core-execution:\n    resolves_to: opus',
  '  core-execution:\n    resolves_to: sonnet'));
assert.throws(() => resolveRole({ root: routingFixture, harness: 'claude', role: 'plan-agent' }),
  /fallback chain must be reasoning-heavy -> core-execution/);
writeRouting(routingSource);

const primaryDescriptorShape = prepareNativeLaunch({ root, harness: 'claude', role: 'plan-agent', dispatcherId: 'shape-primary' });
const fallbackDescriptorShape = prepareNativeLaunch({ root, harness: 'claude', role: 'plan-agent', dispatcherId: 'shape-primary', projectionMode: 'fallback' });
assert.deepEqual(Object.keys(fallbackDescriptorShape).sort(), Object.keys(primaryDescriptorShape).sort(),
  'fallback selection must not change native-launch.v2 descriptor schema');
assert.equal(primaryDescriptorShape.schema_version, 'luca.native-launch.v2');
assert.equal(primaryDescriptorShape.projection, 'fable');
assert.equal(fallbackDescriptorShape.projection, 'opus');

const packet = loadWorkPacket(fixturePath);
const tcbPacket = validateTcbPacket(fixturePath);
const workRole = readFileSync(resolve(root, '.claude/agents/work-agent.md'), 'utf8');
const codexWorkRole = readFileSync(resolve(root, '.codex/agents/work-agent.toml'), 'utf8');
assert.match(workRole, /One narrow native-smoke exception is allowed/);
assert.match(workRole, /return `<value>` byte for\s+byte/);
assert.match(codexWorkRole, /exactly one `tools\.exec_command` call/);
assert.ok(packet.packet.constraints.some((item) => item.includes('then only text(result.output)')));
for (const harness of ['claude', 'codex']) {
  const work = prepareNativeLaunch({ root, harness, role: 'work-agent', packet, dispatcherId: `test-${harness}` });
  const prompt = work.dispatcher_prompt;
  assert.match(prompt, /launch supervisor independently validated/);
  assert.match(prompt, new RegExp(packet.sha256));
  assert.doesNotMatch(prompt, /<work_packet>/);
  assert.match(prompt, /"schema_version":"luca\.work-packet\.v1"/);
  assert.match(work.argv_sha256, /^[a-f0-9]{64}$/);
  assert.match(work.native_binary_sha256, /^[a-f0-9]{64}$/);
  assert.ok(work.cli_version.length > 0);
  if (harness === 'claude') {
    assert.equal(work.schema_version, 'luca.native-launch.v2');
    assert.equal(work.sandbox_contract.type, 'claude-native-sandbox');
    assert.equal(work.sandbox_contract.required_post_tool_use_event, 'Agent');
    assert.equal(work.native_task_name, null);
    assert.ok(work.args.includes('Agent,Bash'));
    assert.ok(work.args.includes('u008-dispatcher'));
  } else {
    assert.equal(work.schema_version, 'luca.native-launch.v2');
    assert.equal(work.sandbox_contract.type, 'workspace-write');
    assert.equal(work.native_task_name, `edge_${work.input_sha256}`);
    assert.ok(!work.args.includes('--dangerously-bypass-hook-trust'));
    assert.ok(work.args.includes('sandbox_workspace_write.writable_roots=[]'));
    assert.ok(work.args.includes('sandbox_workspace_write.network_access=false'));
    assert.ok(work.args.includes('sandbox_workspace_write.exclude_tmpdir_env_var=true'));
    assert.ok(work.args.includes('sandbox_workspace_write.exclude_slash_tmp=true'));
  }
  const tcbLaunch = buildNativeLaunch({ root, harness, role: 'work-agent', packet: tcbPacket,
    routing: parseRouting(root), dispatcherId: `test-${harness}`, runtime: {}, scratch: root });
  assert.deepEqual(candidateDispatchContract(work), tcbDispatchContract(tcbLaunch.descriptor),
    `${harness} candidate/TCB native dispatch contracts must be byte-equivalent`);
}
assert.throws(() => prepareNativeLaunch({ root, harness: 'claude', role: 'work-agent', dispatcherId: 'missing-packet' }), /requires/);
assert.throws(() => prepareNativeLaunch({
  root,
  harness: 'claude',
  role: 'work-agent',
  dispatcherId: 'forged-packet',
  packet: { packet: clone(), canonical_json: '{}', sha256: '0'.repeat(64), source_bytes_sha256: '1'.repeat(64) },
}), /intact validateWorkPacket/);
assert.throws(() => prepareNativeLaunch({ root, harness: 'codex', role: 'oracle', packet, dispatcherId: 'extra-packet' }), /does not accept/);

// DORMANT route gate: registered definitions remain directly testable by the frozen evidence TCB,
// while production callsites cannot acquire a native role edge before an approved live receipt.
const liveSurfaces = collectNativeRouteSurfaces(root);
assert.deepEqual(findNativeRouteBypasses({ activationStatus: 'DORMANT', surfaces: liveSurfaces }), []);
const orchestrator = readFileSync(resolve(root, '.claude/agents/orchestrator.md'), 'utf8');
const workTemplate = readFileSync(resolve(root, '.claude/agents/work-agent-template.md'), 'utf8');
assert.match(orchestrator, /通过 Agent tool 启动 WA/);
assert.match(orchestrator, /触发 quality-gate|调度 @quality-gate subagent/);
assert.equal(workTemplate.startsWith('---\n'), false);
assert.doesNotMatch(workTemplate, /BLOCKED_NATIVE_ROLE_DORMANT/);
assert.doesNotMatch(workTemplate, /agent-launcher\.mjs[^\n]*\blaunch\b[^\n]*--role\s+work-agent/);
for (const role of ['work-agent', 'oracle']) {
  assert.deepEqual(verifyNativeRouteActivation({ root, role }), {
    authorized: false, code: 'DORMANT', detail: '', role,
  });
}
for (const role of ['plan-agent', 'quality-gate']) {
  assert.deepEqual(verifyNativeRouteActivation({ root, role }), {
    authorized: true, code: 'EXISTING_ROUTE_UNGATED', role,
  });
  const gate = run(process.execPath, ['scripts/check-agents-parity.mjs', '--native-route-gate', role]);
  assert.equal(gate.status, 0);
  assert.equal(gate.stdout, `NATIVE_ROLE_ROUTE_EXISTING_UNGATED ${role}\n`);
  assert.doesNotMatch(gate.stdout, /undefined/);
}
const moduleExports = await import('./agent-launcher.mjs');
assert.equal(Object.hasOwn(moduleExports, 'runNativeLaunch'), false, 'low-level run export is a production bypass');
assert.equal(Object.hasOwn(moduleExports, 'spawnNativeLaunch'), false, 'low-level spawn export is a production bypass');
const forbiddenLaunchOverrides = [
  ['--projection-mode', 'fallback'],
  ['--model', 'opus'],
  ['--projection', 'opus'],
  ['--fallback', 'opus'],
  ['--fallback-model', 'opus'],
  ['--projection-mode=fallback'],
];
for (const override of forbiddenLaunchOverrides) {
  const rejectedOverride = run(process.execPath, ['scripts/agent-launcher.mjs', 'launch', '--root', root,
    '--harness', 'claude', '--role', 'oracle', '--dispatcher-id', 'forbidden-override', ...override], {
    env: { ...process.env, LUCA_CLAUDE_BIN: '/definitely/must-not-spawn' },
  });
  assert.equal(rejectedOverride.status, 2, `${override.join(' ')} must be rejected`);
  assert.match(rejectedOverride.stderr, /launch does not accept caller-controlled/);
  assert.doesNotMatch(rejectedOverride.stderr, /NATIVE_ROLE_ROUTE_BLOCKED|ENOENT|version probe|native process/,
    `${override.join(' ')} must fail before activation, probe, or native spawn`);
}

const fakeClaudeRoot = mkdtempSync(resolve(tmpdir(), 'agent-launcher-fake-claude-'));
const fakeClaudePath = resolve(fakeClaudeRoot, 'claude');
const fakeClaudeLog = resolve(fakeClaudeRoot, 'calls.jsonl');
writeFileSync(fakeClaudePath, `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
const record = (kind, extra = {}) => appendFileSync(process.env.FAKE_CLAUDE_LOG,
  JSON.stringify({ kind, args, cwd: process.cwd(), ...extra }) + '\\n');
const emit = (...events) => process.stdout.write(events.map((event) => JSON.stringify(event)).join('\\n') + '\\n');
const success = (alias) => emit(
  { type: 'system', subtype: 'init', session_id: 'fake-session', tools: [], permissionMode: 'dontAsk', cwd: process.cwd(), model: 'claude-' + alias + '-test' },
  { type: 'rate_limit_event', session_id: 'fake-session', rate_limit_info: { status: 'allowed' } },
  { type: 'assistant', session_id: 'fake-session', parent_tool_use_id: null, message: { model: 'claude-' + alias + '-test', content: [{ type: 'text', text: 'LUCA_CLAUDE_MODEL_PROBE_OK' }] } },
  { type: 'result', session_id: 'fake-session', subtype: 'success', is_error: false, result: 'LUCA_CLAUDE_MODEL_PROBE_OK', terminal_reason: 'completed' },
);
if (args.includes('--version')) {
  record('version');
  process.stdout.write('2.1.229 (Claude Code)\\n');
} else if (args.includes('--safe-mode')) {
  const alias = args[args.indexOf('--model') + 1];
  record('probe', { alias });
  if (process.env.FAKE_CLAUDE_SCENARIO === 'credits-fallback' && alias === 'fable') {
    const message = 'Fable 5 requires usage credits. Run /usage-credits to continue or switch models with /model.';
    emit(
      { type: 'system', subtype: 'init', session_id: 'fake-session', tools: [], permissionMode: 'dontAsk', cwd: process.cwd(), model: 'claude-fable-5-test' },
      { type: 'rate_limit_event', session_id: 'fake-session', rate_limit_info: { status: 'rejected', errorCode: 'credits_required' } },
      { type: 'assistant', session_id: 'fake-session', parent_tool_use_id: null, is_api_error_message: true, error: 'rate_limit',
        message: { model: '<synthetic>', content: [{ type: 'text', text: message }] } },
      { type: 'result', session_id: 'fake-session', subtype: 'success', is_error: true, result: message,
        api_error_status: 429, terminal_reason: 'api_error' },
    );
    process.exitCode = 1;
  } else {
    success(alias);
  }
} else {
  record('formal');
}
`);
chmodSync(fakeClaudePath, 0o755);
const runFakeClaudeLaunch = (scenario) => {
  writeFileSync(fakeClaudeLog, '');
  const result = run(process.execPath, ['scripts/agent-launcher.mjs', 'launch', '--root', root,
    '--harness', 'claude', '--role', 'plan-agent', '--dispatcher-id', `fake-${scenario}`], {
    env: { ...process.env, LUCA_CLAUDE_BIN: fakeClaudePath, FAKE_CLAUDE_LOG: fakeClaudeLog,
      FAKE_CLAUDE_SCENARIO: scenario },
  });
  const calls = readFileSync(fakeClaudeLog, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return { result, calls };
};
const primaryFakeLaunch = runFakeClaudeLaunch('primary-success');
assert.equal(primaryFakeLaunch.result.status, 0, primaryFakeLaunch.result.stderr);
assert.deepEqual(primaryFakeLaunch.calls.map((call) => call.kind), ['probe', 'version', 'formal']);
assert.deepEqual(primaryFakeLaunch.calls.filter((call) => call.kind === 'probe').map((call) => call.alias), ['fable']);
assert.doesNotMatch(primaryFakeLaunch.result.stderr, /NATIVE_MODEL_FALLBACK/);
const primaryProbe = primaryFakeLaunch.calls[0];
assert.ok(primaryProbe.cwd.startsWith('/private/tmp/luca-native-launch-'));
assert.notEqual(primaryProbe.cwd, root);
assert.deepEqual(primaryProbe.args, ['--safe-mode', '-p', '--model', 'fable', '--output-format', 'stream-json',
  '--verbose', '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
  'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.']);
assert.doesNotMatch(primaryProbe.args.join(' '), /include-hook-events|setting-sources|--settings/);
const primaryFormal = primaryFakeLaunch.calls.find((call) => call.kind === 'formal');
assert.equal(JSON.parse(primaryFormal.args[primaryFormal.args.indexOf('--agents') + 1])['plan-agent'].model, 'fable');

const fallbackFakeLaunch = runFakeClaudeLaunch('credits-fallback');
assert.equal(fallbackFakeLaunch.result.status, 0, fallbackFakeLaunch.result.stderr);
assert.deepEqual(fallbackFakeLaunch.calls.map((call) => call.kind), ['probe', 'probe', 'version', 'formal']);
assert.deepEqual(fallbackFakeLaunch.calls.filter((call) => call.kind === 'probe').map((call) => call.alias), ['fable', 'opus']);
assert.match(fallbackFakeLaunch.result.stderr,
  /NATIVE_MODEL_FALLBACK primary=fable effective=opus reason=credits_required/);
const fallbackFormal = fallbackFakeLaunch.calls.find((call) => call.kind === 'formal');
assert.equal(JSON.parse(fallbackFormal.args[fallbackFormal.args.indexOf('--agents') + 1])['plan-agent'].model, 'opus');
assert.equal(fallbackFormal.args.includes('--fallback-model'), false);

for (const [harness, role] of [['claude', 'oracle'], ['codex', 'work-agent']]) {
  const dormantLaunch = run(process.execPath, ['scripts/agent-launcher.mjs', 'launch', '--root', root,
    '--harness', harness, '--role', role, '--dispatcher-id', `dormant-${harness}`], {
    env: { ...process.env, [harness === 'claude' ? 'LUCA_CLAUDE_BIN' : 'LUCA_CODEX_BIN']: '/definitely/must-not-spawn' },
  });
  assert.equal(dormantLaunch.status, 2);
  assert.match(dormantLaunch.stderr, new RegExp(`NATIVE_ROLE_ROUTE_BLOCKED DORMANT ${role}`));
  assert.doesNotMatch(dormantLaunch.stderr, /ENOENT|version probe|native process/);
}
const directDispatchMutants = [
  'task(subagent_type="oracle", run_in_background=false)',
  'spawn `work-agent`',
  'Agent(oracle)',
];
for (const mutant of directDispatchMutants) {
  const mutated = structuredClone(liveSurfaces);
  mutated['.claude/skills/office/brainstorm/SKILL.md'] += `\n${mutant}\n`;
  assert.ok(findNativeRouteBypasses({ activationStatus: 'DORMANT', surfaces: mutated })
    .some((error) => error.includes('direct new native role syntax')), mutant);
}
const markerMutant = structuredClone(liveSurfaces);
markerMutant['.claude/skills/office/deepresearch/SKILL.md'] = markerMutant['.claude/skills/office/deepresearch/SKILL.md']
  .replaceAll('NATIVE_ROLE_ROUTE_DORMANT_BLOCK', 'REMOVED_DORMANT_MARKER');
assert.ok(findNativeRouteBypasses({ activationStatus: 'DORMANT', surfaces: markerMutant })
  .some((error) => error.includes('missing oracle dormant fail-closed marker')));
const missingSurfaceMutant = structuredClone(liveSurfaces);
delete missingSurfaceMutant['.claude/skills/office/brainstorm/references/adversarial-review.md'];
assert.ok(findNativeRouteBypasses({ activationStatus: 'DORMANT', surfaces: missingSurfaceMutant })
  .some((error) => error.includes('missing from production route surface map')));
const undisclosedSurfaceMutant = structuredClone(liveSurfaces);
undisclosedSurfaceMutant['.claude/skills/office/future/SKILL.md'] = 'task(subagent_type="oracle")';
assert.ok(findNativeRouteBypasses({ activationStatus: 'DORMANT', surfaces: undisclosedSurfaceMutant })
  .some((error) => error.startsWith('.claude/skills/office/future/SKILL.md contains direct new native role syntax')));
const activeSurfaces = Object.fromEntries(Object.entries(NATIVE_ROUTE_SURFACES).map(([rel, role]) => [rel,
  `NATIVE_ROLE_ROUTE_DORMANT_BLOCK\nBLOCKED_NATIVE_ROLE_DORMANT\nNATIVE_ROLE_ROUTE_ACTIVE\n`
    + `${NATIVE_ROUTE_GATE_COMMAND} --harness <claude|codex> --role ${role} --dispatcher-id <id>\n`
    + `never use generic agent or root internal reasoning\n`,
]));
assert.deepEqual(findNativeRouteBypasses({ activationStatus: 'ACTIVE', surfaces: activeSurfaces }), []);
const missingActiveGateMutant = structuredClone(activeSurfaces);
delete missingActiveGateMutant['.claude/skills/office/ux-research/SKILL.md'];
assert.ok(findNativeRouteBypasses({ activationStatus: 'ACTIVE', surfaces: missingActiveGateMutant })
  .some((error) => error.includes('missing from production route surface map')));
const activeFallbackMutant = structuredClone(activeSurfaces);
activeFallbackMutant['.claude/skills/office/brainstorm/SKILL.md'] = activeFallbackMutant['.claude/skills/office/brainstorm/SKILL.md']
  .replace('never use generic agent or root internal reasoning', 'generic agent may replace the native role');
assert.ok(findNativeRouteBypasses({ activationStatus: 'ACTIVE', surfaces: activeFallbackMutant })
  .some((error) => error.includes('permits non-native substitution')));
const activeDirectMutant = structuredClone(activeSurfaces);
activeDirectMutant['.claude/skills/office/brainstorm/SKILL.md'] += '\ntask(subagent_type="oracle")\n';
assert.ok(findNativeRouteBypasses({ activationStatus: 'ACTIVE', surfaces: activeDirectMutant })
  .some((error) => error.includes('direct new native role syntax while ACTIVE')));
const undisclosedActiveMutant = structuredClone(activeSurfaces);
undisclosedActiveMutant['.claude/skills/office/future/SKILL.md'] = 'Agent(work-agent)';
assert.ok(findNativeRouteBypasses({ activationStatus: 'ACTIVE', surfaces: undisclosedActiveMutant })
  .some((error) => error.startsWith('.claude/skills/office/future/SKILL.md contains direct new native role syntax while ACTIVE')));

const activationFixture = mkdtempSync(resolve(tmpdir(), 'native-route-gate-'));
mkdirSync(resolve(activationFixture, '.claude/skill-os'), { recursive: true });
const writeActivation = (value) => writeFileSync(resolve(activationFixture, '.claude/skill-os/native-agent-activation.json'),
  `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
const dormantState = {
  schema_version: 'luca.native-agent-activation.v1', status: 'DORMANT', proof_receipt_path: null,
  proof_receipt_sha256: null, activated_at: null,
};
writeActivation(dormantState);
assert.equal(verifyNativeRouteActivation({ root: activationFixture, role: 'oracle' }).code, 'DORMANT');
writeActivation({ ...dormantState, proof_receipt_sha256: '0'.repeat(64) });
assert.equal(verifyNativeRouteActivation({ root: activationFixture, role: 'oracle' }).code, 'DORMANT_STATE_INVALID');
writeActivation({ ...dormantState, status: 'ACTIVE', activated_at: '2026-08-13T00:00:00Z',
  proof_receipt_path: NATIVE_PROOF_RECEIPT_PATH, proof_receipt_sha256: '0'.repeat(64) });
assert.equal(verifyNativeRouteActivation({ root: activationFixture, role: 'oracle' }).code, 'PROOF_RECEIPT_INVALID');
mkdirSync(dirname(resolve(activationFixture, NATIVE_PROOF_RECEIPT_PATH)), { recursive: true });
const activationFile = resolve(activationFixture, '.claude/skill-os/native-agent-activation.json');
chmodSync(activationFile, 0o600);
const unsafeActivation = `${activationFile}.unsafe`;
writeFileSync(unsafeActivation, JSON.stringify(dormantState));
// A symlink mutation is validated in a separate root so the valid fixture remains intact.
const symlinkFixture = mkdtempSync(resolve(tmpdir(), 'native-route-symlink-'));
mkdirSync(resolve(symlinkFixture, '.claude/skill-os'), { recursive: true });
symlinkSync(unsafeActivation, resolve(symlinkFixture, '.claude/skill-os/native-agent-activation.json'));
assert.equal(verifyNativeRouteActivation({ root: symlinkFixture, role: 'oracle' }).code, 'ACTIVATION_FILE_UNSAFE');
assert.equal(verifyNativeRouteActivation({ root: activationFixture, role: 'generic' }).code, 'UNKNOWN_ROLE');

// Exact signed TST-008 receipt, generated in proof checkout A and consumed by
// activation checkout B.  The absolute roots deliberately differ.
const signedBase = realpathSync(mkdtempSync(resolve(tmpdir(), 'native-route-signed-')));
chmodSync(signedBase, 0o700);
const activationRoot = resolve(signedBase, 'activation-root');
mkdir700(activationRoot);
gitFixture(activationRoot, ['init', '-q']);
const trackedFixturePaths = [
  'AGENTS.md',
  'CLAUDE.md',
  'scripts/agent-launcher.mjs',
  'scripts/check-agents-parity.mjs',
  'scripts/evolution/agent-evidence-tcb.mjs',
  'scripts/evolution/verify-agent-evidence.mjs',
  'scripts/fixtures/agent-valid-work-packet.json',
  '.claude/agents/muse-proto-judge.md',
  '.claude/agents/orchestrator.md',
  '.claude/agents/preflight-agent.md',
  '.claude/agents/work-agent-template.md',
  '.codex/agents/muse-proto-judge.toml',
  '.codex/agents/preflight-agent.toml',
  '.claude/skill-os/model-routing.yaml',
  '.claude/skill-os/native-agent-activation.json',
  '.claude/skill-os/schemas/work-packet.schema.json',
  '.claude/skill-os/skill-routing-map.yaml',
  '.claude/skill-os/input-modes.yaml',
  '.claude/skill-os/optional-workflow-graph.yaml',
  '.claude/settings.json',
  '.claude/hooks/post-edit.mjs',
  '.claude/hooks/route-guard.mjs',
  '.claude/skills/office/brainstorm/SKILL.md',
  '.claude/skills/office/deepresearch/SKILL.md',
  '.claude/skills/office/ux-brainstorm/SKILL.md',
  '.claude/skills/office/ux-research/SKILL.md',
  '.claude/skills/office/code-hygiene/SKILL.md',
  '.codex/hooks.json',
  '.codex/config.toml',
  '.codex/codex-hook-adapter.mjs',
  '.codex/workflow-runner.mjs',
  ...LOGICAL_ROLES.flatMap((role) => [`.claude/agents/${role}.md`, `.codex/agents/${role}.toml`]),
];
for (const rel of trackedFixturePaths) {
  const destination = resolve(activationRoot, rel);
  mkdir700(dirname(destination));
  copyFileSync(resolve(root, rel), destination);
  chmodSync(destination, 0o644);
}
gitFixture(activationRoot, ['add', '--', ...trackedFixturePaths]);
gitFixture(activationRoot, ['commit', '-q', '-m', 'signed route fixture']);
const targetCommit = gitFixture(activationRoot, ['rev-parse', 'HEAD']);
const targetTree = gitFixture(activationRoot, ['rev-parse', `${targetCommit}^{tree}`]);
const proofRoot = resolve(signedBase, 'proof-root');
gitFixture(signedBase, ['clone', '-q', '--no-local', activationRoot, proofRoot]);
assert.notEqual(realpathSync(proofRoot), realpathSync(activationRoot));
assert.equal(gitFixture(proofRoot, ['rev-parse', 'HEAD']), targetCommit);

const transactionRoot = resolve(signedBase, 'proof-transaction');
const evidenceRoot = resolve(transactionRoot, 'evidence');
const rawRoot = resolve(evidenceRoot, 'raw');
const evidenceReceiptRoot = resolve(evidenceRoot, 'receipts');
mkdir700(rawRoot); mkdir700(evidenceReceiptRoot);
const anchorPath = resolve(transactionRoot, 'precommit-anchor.json');
const envelopePath = resolve(evidenceRoot, 'execution-envelope.json');
const summaryPath = resolve(evidenceRoot, 'summary.json');
const consumePath = resolve(transactionRoot, 'verification-consumed.json');
const verificationStdoutPath = resolve(transactionRoot, 'verification-stdout.txt');
const frozenTcbRoot = resolve(signedBase, 'frozen-tcb');
mkdir700(frozenTcbRoot);
const externalTcbPath = resolve(frozenTcbRoot, 'agent-evidence-tcb.mjs');
const externalVerifierPath = resolve(frozenTcbRoot, 'verify-agent-evidence.mjs');
write0600(externalTcbPath, readFileSync(resolve(proofRoot, 'scripts/evolution/agent-evidence-tcb.mjs')));
write0600(externalVerifierPath, readFileSync(resolve(proofRoot, 'scripts/evolution/verify-agent-evidence.mjs')));
const proofPacket = loadWorkPacket(resolve(proofRoot, 'scripts/fixtures/agent-valid-work-packet.json'));
const evidencePair = generateKeyPairSync('ed25519');
const counterPair = generateKeyPairSync('ed25519');
const evidencePublicPem = evidencePair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const counterPublicPem = counterPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const evidenceFingerprint = sha256(evidencePair.publicKey.export({ type: 'spki', format: 'der' }));
const counterFingerprint = sha256(counterPair.publicKey.export({ type: 'spki', format: 'der' }));
const createdAt = '2026-08-13T10:00:00.000Z';
const expiresAt = '2036-08-13T10:00:00.000Z';
const transactionId = 'fixture-cross-checkout-u008';
const prepared = [];
let ordinal = 0;
for (const harness of ['claude', 'codex']) for (const role of LOGICAL_ROLES) {
  const descriptor = prepareNativeLaunch({
    root: proofRoot,
    harness,
    role,
    packet: role === 'work-agent' ? proofPacket : null,
    dispatcherId: `fixture-${harness}-${role}`,
  });
  const nonce = `fixture-nonce-${ordinal}`;
  const descriptorSha = sha256(Buffer.from(stable(descriptor), 'utf8'));
  prepared.push({ harness, role, runId: `fixture-${harness}-${role}`, descriptor, descriptorSha,
    nonce, nonceSha: sha256(Buffer.from(nonce, 'utf8')) });
  ordinal++;
}
const nonceCommitments = prepared.map((item) => ({ run_id: item.runId, commitment_sha256: item.nonceSha }));
const nonceSetSha = sha256(Buffer.from(stable(nonceCommitments), 'utf8'));
const concreteClaudeModels = {
  'reasoning-heavy': 'claude-fable-5-20260801',
  'core-execution': 'claude-opus-4-8-20260701',
};
const resolutionSpecifications = [
  { tier: 'reasoning-heavy', primary: 'fable', fallback: 'opus' },
  { tier: 'core-execution', primary: 'opus', fallback: null },
];
const modelProbeRoot = resolve(transactionRoot, 'child-scratch', 'model-resolution');
for (const spec of resolutionSpecifications) mkdir700(resolve(modelProbeRoot, spec.primary));
const modelResolutions = resolutionSpecifications.map((spec) => {
  const resolvedModel = concreteClaudeModels[spec.tier];
  const sessionId = `probe-session-${spec.tier}`;
  const stdoutPath = `raw/claude-model-${spec.primary}.stdout.jsonl`;
  const stderrPath = `raw/claude-model-${spec.primary}.stderr`;
  const stdoutBytes = Buffer.from(jsonl(
    { type: 'system', subtype: 'init', session_id: sessionId, tools: [], cwd: realpathSync(resolve(modelProbeRoot, spec.primary)),
      permissionMode: 'dontAsk', model: resolvedModel },
    { type: 'rate_limit_event', session_id: sessionId, rate_limit_info: { status: 'allowed' } },
    { type: 'assistant', session_id: sessionId, parent_tool_use_id: null,
      message: { model: resolvedModel, content: [{ type: 'text', text: 'LUCA_CLAUDE_MODEL_PROBE_OK' }] } },
    { type: 'result', session_id: sessionId, subtype: 'success', is_error: false,
      result: 'LUCA_CLAUDE_MODEL_PROBE_OK', terminal_reason: 'completed' },
  ), 'utf8');
  const stderrBytes = Buffer.alloc(0);
  write0600(resolve(evidenceRoot, stdoutPath), stdoutBytes);
  write0600(resolve(evidenceRoot, stderrPath), stderrBytes);
  const record = {
    schema_version: 'luca.agent-model-resolution.v1',
    harness: 'claude',
    tier: spec.tier,
    primary_projection: spec.primary,
    fallback_projection: spec.fallback,
    effective_projection: spec.primary,
    effective_model: resolvedModel,
    reason: 'primary_available',
    attempts: [{
      projection: spec.primary,
      outcome: 'available',
      resolved_model: resolvedModel,
      exit_code: 0,
      argv_sha256: sha256(Buffer.from(stable(['--safe-mode', '-p', '--model', spec.primary,
        '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--tools', '',
        '--permission-mode', 'dontAsk',
        'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.']), 'utf8')),
      stdout_path: stdoutPath,
      stdout_sha256: sha256(stdoutBytes),
      stderr_path: stderrPath,
      stderr_sha256: sha256(stderrBytes),
    }],
  };
  const recordPath = `raw/claude-${spec.tier}-resolution.json`;
  const recordBytes = jsonBytes(record);
  write0600(resolve(evidenceRoot, recordPath), recordBytes);
  return {
    harness: record.harness,
    tier: record.tier,
    primary_projection: record.primary_projection,
    fallback_projection: record.fallback_projection,
    effective_projection: record.effective_projection,
    effective_model: record.effective_model,
    reason: record.reason,
    path: recordPath,
    sha256: sha256(recordBytes),
  };
});
const anchorRuns = prepared.map((item) => ({
  run_id: item.runId,
  harness: item.harness,
  role: item.role,
  projection: item.descriptor.projection,
  input_sha256: item.descriptor.input_sha256,
  candidate_contract_sha256: candidateDispatchContract(item.descriptor).contract_sha256,
  native_descriptor_sha256: item.descriptorSha,
  write_roots: item.descriptor.write_roots,
  sandbox_contract: item.descriptor.sandbox_contract,
}));
const counterChannelRoot = resolve(signedBase, 'counter-channel');
mkdir700(counterChannelRoot);
const counterReadyPath = resolve(counterChannelRoot, 'counter-ready.json');
const counterSocketPath = resolve(counterChannelRoot, 'counter.sock');
const counterReady = {
  schema_version: 'luca.agent-evidence-counter-ready.v1',
  ready_id: 'counter-1234567890abcdef12345678',
  created_at: createdAt,
  expires_at: expiresAt,
  socket_path: counterSocketPath,
  counter_public_key_pem: counterPublicPem,
  counter_fingerprint_sha256: counterFingerprint,
  commitments: {
    tcb_sha256: sha256(readFileSync(externalTcbPath)),
    verifier_sha256: sha256(readFileSync(externalVerifierPath)),
    repo_root: realpathSync(proofRoot),
    target_commit: targetCommit,
    work_packet_sha256: proofPacket.sha256,
    work_packet_source_sha256: proofPacket.source_bytes_sha256,
  },
};
write0600(counterReadyPath, jsonBytes(counterReady));
const anchorCore = {
  schema_version: 'luca.agent-evidence-anchor.v2',
  transaction_id: transactionId,
  created_at: createdAt,
  expires_at: expiresAt,
  repo_root: realpathSync(proofRoot),
  evidence_root: realpathSync(evidenceRoot),
  consume_path: consumePath,
  target_commit: targetCommit,
  target_tree_manifest: deriveTargetTreeManifest(proofRoot, targetCommit,
    resolve(proofRoot, 'scripts/fixtures/agent-valid-work-packet.json')),
  tcb: { path: externalTcbPath, sha256: sha256(readFileSync(externalTcbPath)) },
  verifier: { path: externalVerifierPath, sha256: sha256(readFileSync(externalVerifierPath)) },
  candidate_launcher: { path: resolve(proofRoot, 'scripts/agent-launcher.mjs'),
    sha256: sha256(readFileSync(resolve(proofRoot, 'scripts/agent-launcher.mjs'))),
    execution: 'describe-contract-only-before-evidence-key' },
  work_packet: { path: resolve(proofRoot, 'scripts/fixtures/agent-valid-work-packet.json'),
    sha256: proofPacket.sha256, source_sha256: proofPacket.source_bytes_sha256 },
  counter_ready: { path: counterReadyPath, sha256: sha256(readFileSync(counterReadyPath)),
    ready_id: counterReady.ready_id, created_at: createdAt, expires_at: expiresAt,
    socket_path: counterSocketPath },
  evidence_public_key_pem: evidencePublicPem,
  evidence_fingerprint_sha256: evidenceFingerprint,
  nonce_commitments: nonceCommitments,
  nonce_set_sha256: nonceSetSha,
  model_resolutions: modelResolutions,
  runs: anchorRuns,
};
const anchorPayload = Buffer.from(stable(anchorCore), 'utf8');
const anchor = {
  ...anchorCore,
  base_core_sha256: sha256(anchorPayload),
  evidence_signature_ed25519: signBytes(null, anchorPayload, evidencePair.privateKey).toString('base64'),
  counter_public_key_pem: counterPublicPem,
  counter_fingerprint_sha256: counterFingerprint,
  counter_signature_ed25519: signBytes(null, anchorPayload, counterPair.privateKey).toString('base64'),
};
write0600(anchorPath, jsonBytes(anchor));
const anchorSha = sha256(readFileSync(anchorPath));
const envelopeRuns = prepared.map((item) => ({
  run_id: item.runId,
  harness: item.harness,
  role: item.role,
  nonce_commitment_sha256: item.nonceSha,
  candidate_contract_sha256: candidateDispatchContract(item.descriptor).contract_sha256,
  native_descriptor: item.descriptor,
  native_descriptor_sha256: item.descriptorSha,
}));
const envelopeCore = {
  schema_version: 'luca.agent-evidence-envelope.v2', transaction_id: transactionId,
  anchor_path: anchorPath, anchor_sha256: anchorSha, target_commit: targetCommit,
  repo_root: realpathSync(proofRoot), created_at: createdAt, expires_at: expiresAt,
  public_key_fingerprint_sha256: evidenceFingerprint,
  tcb_sha256: anchorCore.tcb.sha256, verifier_sha256: anchorCore.verifier.sha256,
  launcher_sha256: anchorCore.candidate_launcher.sha256,
  work_packet_sha256: proofPacket.sha256, work_packet_source_sha256: proofPacket.source_bytes_sha256,
  runtime_attestations: {}, runs: envelopeRuns,
};
const envelope = signed(evidencePair.privateKey, envelopeCore, 'envelope_core_sha256', 'signature_ed25519');
write0600(envelopePath, jsonBytes(envelope));
const envelopeSha = sha256(readFileSync(envelopePath));
const summaryReceipts = [];
const edges = [];
for (const [index, item] of prepared.entries()) {
  const prefix = `${item.harness}-${item.role}`;
  const kinds = item.harness === 'claude' ? ['public', 'stderr'] : ['public', 'stderr', 'parent_rollout', 'child_rollout'];
  const rawLogs = [];
  const framed = [];
  for (const kind of kinds) {
    const bytes = kind === 'stderr' ? Buffer.alloc(0) : Buffer.from(`${prefix}:${kind}\n`, 'utf8');
    const rawPath = resolve(rawRoot, `${prefix}-${kind}.log`);
    write0600(rawPath, bytes);
    rawLogs.push({ kind, path: `raw/${prefix}-${kind}.log`, size: bytes.length, sha256: sha256(bytes) });
    framed.push(Buffer.from(`${kind}:${bytes.length}:`, 'utf8'), bytes);
  }
  const sourceLogSha = sha256(Buffer.concat(framed));
  const outputSha = sha256(Buffer.from(`output-${prefix}`, 'utf8'));
  const parentId = `parent-${index}`;
  const childId = `child-${index}`;
  const spawnId = `spawn-${index}`;
  const launchEvent = signedEvent(evidencePair.privateKey, 'launch', 1, null, {
    run_id: item.runId, anchor_sha256: anchorSha, envelope_sha256: envelopeSha,
    nonce: item.nonce, nonce_commitment_sha256: item.nonceSha, harness: item.harness, role: item.role,
    native_descriptor_sha256: item.descriptorSha, target_commit: targetCommit, launched_at: createdAt,
  });
  const sessionEvent = signedEvent(evidencePair.privateKey, 'session', 2, launchEvent.event_sha256, {
    run_id: item.runId, parent_id: parentId, child_id: childId, spawn_id: spawnId,
    native_identity_kind: item.harness === 'claude' ? 'dispatcher_session_to_child_agent_id' : 'parent_thread_to_child_thread',
    input_binding_kind: item.harness === 'claude' ? 'native_plaintext_prompt_sha256' : 'precommitted_dispatcher_plus_native_ciphertext_continuity',
    observed_input_sha256: item.descriptor.input_sha256,
    observed_projection: item.harness === 'claude'
      ? concreteClaudeModels[item.descriptor.tier] : item.descriptor.projection,
    source_log_sha256: sourceLogSha, raw_logs: rawLogs,
    stderr_sha256: sha256(Buffer.alloc(0)), observed_at: createdAt,
  });
  const resultEvent = signedEvent(evidencePair.privateKey, 'result', 3, sessionEvent.event_sha256, {
    run_id: item.runId, output_sha256: outputSha, output_size: Buffer.byteLength(`output-${prefix}`),
    completed_at: createdAt, exit_code: 0,
  });
  const evidenceReceiptCore = {
    schema_version: 'luca.agent-evidence-receipt.v2', transaction_id: transactionId,
    run_id: item.runId, anchor_sha256: anchorSha, envelope_sha256: envelopeSha,
    public_key_fingerprint_sha256: evidenceFingerprint, harness: item.harness, role: item.role,
    target_commit: targetCommit, native_descriptor_sha256: item.descriptorSha,
    nonce_commitment_sha256: item.nonceSha, parent_id: parentId, child_id: childId, spawn_id: spawnId,
    source_log_sha256: sourceLogSha, output_sha256: outputSha,
    events: [launchEvent, sessionEvent, resultEvent], created_at: createdAt,
    completed_at: createdAt, expires_at: expiresAt,
  };
  const evidenceReceipt = signed(evidencePair.privateKey, evidenceReceiptCore, 'receipt_core_sha256', 'signature_ed25519');
  const evidenceReceiptPath = resolve(evidenceReceiptRoot, `${prefix}.json`);
  write0600(evidenceReceiptPath, jsonBytes(evidenceReceipt));
  const evidenceReceiptSha = sha256(readFileSync(evidenceReceiptPath));
  summaryReceipts.push({ harness: item.harness, role: item.role, path: `receipts/${prefix}.json`,
    sha256: evidenceReceiptSha, child_id: childId });
  edges.push({ harness: item.harness, role: item.role, parent_id: parentId, child_id: childId,
    definition_path: item.descriptor.definition_path, definition_sha256: item.descriptor.definition_sha256,
    input_sha256: item.descriptor.input_sha256, output_sha256: outputSha, source_log_sha256: sourceLogSha,
    receipt_path: evidenceReceiptPath, receipt_sha256: evidenceReceiptSha,
    native_descriptor_sha256: item.descriptorSha });
}
const summaryCore = {
  schema_version: 'luca.agent-evidence-summary.v2', transaction_id: transactionId,
  anchor_sha256: anchorSha, envelope_path: 'execution-envelope.json', envelope_sha256: envelopeSha,
  public_key_fingerprint_sha256: evidenceFingerprint, target_commit: targetCommit,
  harnesses: ['claude', 'codex'], roles: [...LOGICAL_ROLES], receipts: summaryReceipts, completed_at: createdAt,
};
const summary = signed(evidencePair.privateKey, summaryCore, 'summary_core_sha256', 'signature_ed25519');
write0600(summaryPath, jsonBytes(summary));
const consumption = { schema_version: 'luca.agent-evidence-consumption.v1', anchor_sha256: anchorSha,
  envelope_sha256: envelopeSha, verified_at: createdAt };
write0600(consumePath, jsonBytes(consumption));
write0600(verificationStdoutPath, Buffer.from(`${JSON.stringify({ transaction_id: transactionId, receipts: 8,
  anchor_sha256: anchorSha, consumed: consumePath })}\nAGENT_EVIDENCE_VERIFIED\n`, 'utf8'));
const approvedReceipt = {
  schema_version: 'luca.tst-008-result.v1', plan_id: 'REX-20260811-001', unit: 'U-008', test: 'TST-008',
  captured_at: createdAt, status: 'AGENT_EVIDENCE_VERIFIED', recommendation: 'PASS',
  independent_tester: { task: '/root/u008_dormancy_audit', role: 'independent-harness-reviewer', implementation_participation: false },
  source_binding: { commit: targetCommit, target_tree: targetTree },
  criteria: [{ id: 'ASSERT-014', status: 'PASS' }, { id: 'ASSERT-015', status: 'PASS' }],
  native_evidence: {
    verification_token: 'AGENT_EVIDENCE_VERIFIED', harnesses: ['claude', 'codex'], roles: [...LOGICAL_ROLES],
    target_commit: targetCommit, anchor_path: anchorPath, anchor_sha256: anchorSha,
    envelope_path: envelopePath, envelope_sha256: envelopeSha,
    summary_path: summaryPath, summary_sha256: sha256(readFileSync(summaryPath)),
    consume_path: consumePath, consume_sha256: sha256(readFileSync(consumePath)),
    tcb_path: externalTcbPath, tcb_sha256: anchorCore.tcb.sha256,
    verifier_path: externalVerifierPath, verifier_sha256: anchorCore.verifier.sha256,
    evidence_public_key_fingerprint_sha256: evidenceFingerprint, counter_fingerprint_sha256: counterFingerprint,
    nonce_set_sha256: nonceSetSha, verification_stdout_path: verificationStdoutPath,
    verification_stdout_sha256: sha256(readFileSync(verificationStdoutPath)), independent_verifier_exit_code: 0,
    evidence_consumed_once: true, edges,
  },
  blocking_criteria_all_passed: true,
};
const resultPath = resolve(activationRoot, NATIVE_PROOF_RECEIPT_PATH);
const activationPathSigned = resolve(activationRoot, '.claude/skill-os/native-agent-activation.json');
const installReceipt = (value) => {
  const bytes = jsonBytes(value);
  mkdir700(dirname(resultPath));
  writeFileSync(resultPath, bytes, { mode: 0o600 }); chmodSync(resultPath, 0o600);
  writeFileSync(activationPathSigned, jsonBytes({ schema_version: 'luca.native-agent-activation.v1', status: 'ACTIVE',
    proof_receipt_path: NATIVE_PROOF_RECEIPT_PATH, proof_receipt_sha256: sha256(bytes), activated_at: createdAt }));
  chmodSync(activationPathSigned, 0o644);
};
installReceipt(approvedReceipt);
for (const role of ['work-agent', 'oracle']) {
  const authorized = verifyNativeRouteActivation({ root: activationRoot, role });
  assert.equal(authorized.authorized, true, `${role}: ${authorized.code} ${authorized.detail}`);
}
const counterReadyOriginal = readFileSync(counterReadyPath);
writeFileSync(counterReadyPath, jsonBytes({ fixture: true }), { mode: 0o600 });
chmodSync(counterReadyPath, 0o600);
assert.equal(verifyNativeRouteActivation({ root: activationRoot, role: 'oracle' }).authorized, false,
  'noncanonical/uncommitted counter-ready artifact must invalidate activation');
writeFileSync(counterReadyPath, counterReadyOriginal, { mode: 0o600 });
chmodSync(counterReadyPath, 0o600);

const receiptMutants = [
  ['wrong schema', (value) => { value.schema_version = 'luca.tst-008-result.v0'; }],
  ['wrong status', (value) => { value.status = 'PASS'; }],
  ['extra top-level result key', (value) => { value.untrusted = true; }],
  ['extra criterion', (value) => { value.criteria.push({ id: 'ASSERT-016', status: 'PASS' }); }],
  ['criterion non-PASS', (value) => { value.criteria[0].status = 'FAIL'; }],
  ['arbitrary completion token', (value) => { value.native_evidence.verification_token = 'MPC2_CHANGE_ORDER_INTEGRATED'; }],
  ['verifier nonzero', (value) => { value.native_evidence.independent_verifier_exit_code = 1; }],
  ['one-use false', (value) => { value.native_evidence.evidence_consumed_once = false; }],
  ['arbitrary commit', (value) => { value.source_binding.commit = '0'.repeat(40); value.native_evidence.target_commit = '0'.repeat(40); }],
  ['mismatched source commit', (value) => { value.source_binding.commit = '0'.repeat(40); }],
  ['duplicate edge identity', (value) => { value.native_evidence.edges[1].parent_id = value.native_evidence.edges[0].parent_id; }],
  ['missing harness role edge', (value) => { value.native_evidence.edges.pop(); }],
  ['extra edge key', (value) => { value.native_evidence.edges[0].untrusted = true; }],
  ['edge input mismatch', (value) => { value.native_evidence.edges[0].input_sha256 = '0'.repeat(64); }],
  ['definition hash substitution', (value) => { value.native_evidence.edges[0].definition_sha256 = '0'.repeat(64); }],
  ['counter fingerprint substitution', (value) => { value.native_evidence.counter_fingerprint_sha256 = '0'.repeat(64); }],
  ['nonce set substitution', (value) => { value.native_evidence.nonce_set_sha256 = '0'.repeat(64); }],
  ['verification stdout substitution', (value) => { value.native_evidence.verification_stdout_sha256 = '0'.repeat(64); }],
  ['extra native evidence key', (value) => { value.native_evidence.untrusted = true; }],
];
for (const [label, mutate] of receiptMutants) {
  const value = structuredClone(approvedReceipt); mutate(value); installReceipt(value);
  assert.equal(verifyNativeRouteActivation({ root: activationRoot, role: 'oracle' }).authorized, false, label);
}
installReceipt(approvedReceipt);
const definitionPathMutant = resolve(activationRoot, '.claude/agents/oracle.md');
const definitionOriginal = readFileSync(definitionPathMutant);
writeFileSync(definitionPathMutant, Buffer.concat([definitionOriginal, Buffer.from('\ncurrent drift\n')]));
assert.equal(verifyNativeRouteActivation({ root: activationRoot, role: 'oracle' }).authorized, false,
  'current definition drift must invalidate signed evidence');
writeFileSync(definitionPathMutant, definitionOriginal);
installReceipt(approvedReceipt);
writeFileSync(activationPathSigned, jsonBytes({ schema_version: 'luca.native-agent-activation.v1', status: 'ACTIVE',
  proof_receipt_path: NATIVE_PROOF_RECEIPT_PATH, proof_receipt_sha256: sha256(jsonBytes(approvedReceipt)),
  activated_at: createdAt, extra: true }));
assert.equal(verifyNativeRouteActivation({ root: activationRoot, role: 'oracle' }).code, 'ACTIVATION_STATE_INVALID');

console.log('AGENT_LAUNCHER_TEST_PASS 62 boundary/contract assertions + immutable/unforgeable JSON packet result + exact 4x2 role projection + dormant/active production route gate mutation matrix');
