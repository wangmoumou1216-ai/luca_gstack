#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOGICAL_ROLES,
  loadWorkPacket,
  nativeDispatchContract as candidateDispatchContract,
  prepareNativeLaunch,
  resolveRole,
  validateWorkPacket,
} from './agent-launcher.mjs';
import {
  buildNativeLaunch,
  nativeDispatchContract as tcbDispatchContract,
  parseRouting,
  validatePacket as validateTcbPacket,
} from './evolution/agent-evidence-tcb.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, 'scripts/fixtures/agent-valid-work-packet.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
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

console.log('AGENT_LAUNCHER_TEST_PASS 62 boundary/contract assertions + immutable/unforgeable JSON packet result + exact 4x2 role projection');
