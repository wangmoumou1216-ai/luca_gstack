#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const parsed = spawnSync('python3', ['-c',
  'import json,sys,yaml;print(json.dumps(yaml.safe_load(open(sys.argv[1])).get("codex",{}).get("model_routing")))',
  join(root, '.claude/skill-os/model-routing.yaml')], {encoding:'utf8'});
assert.equal(parsed.status, 0, `policy must parse: ${parsed.stderr}`);
const policy = JSON.parse(parsed.stdout);
assert.equal(policy?.status, 'parser-only', 'core does not enable automatic dispatch');
assert.equal(policy?.scenes?.['MR-001']?.role, 'anchor', 'implementation uses default model');
console.log('PASS policy: parser-only, execution → anchor');

const {resolve, createRouteManifest, validateDecision} = await import('./model-route.mjs');
let passed = 1;
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}
function request(scene = 'MR-001') {
  return {
    scene,
    harness: 'codex-native',
    role_config: structuredClone(policy),
    effective_config: {
      anchor: {model: 'execution-model', source: 'verified-session'},
      peak: {model: 'review-model', source: 'user-selection', approved: true},
      security: {provider: 'fixture-provider', sandbox: 'read-only', approval_policy: 'never', network: false},
    },
    runtime_capabilities: {
      explicit_model_override: true,
      adopted_model_evidence: true,
      preserves_safety: true,
      model_pin: null,
      evidence: {owner: 'fixture-runtime', ref: 'fixture:capabilities', harness: 'codex-native'},
    },
  };
}
// Unit fixtures replace the future trusted host, not a live-model attestation.
const trusted = {verifyCapability: () => true};
test('resolve: execution uses the effective default', () => {
  const route = resolve(request(), trusted);
  assert.equal(route.disposition, 'READY');
  assert.equal(route.role, 'anchor');
  assert.equal(route.requested_model, 'execution-model');
  assert.equal(route.model_source, 'verified-session');
});
test('resolve: all seven scenes follow policy; delegation needs an explicit underlying scene', () => {
  for (const scene of ['MR-002', 'MR-003', 'MR-004', 'MR-005']) {
    const route = resolve(request(scene), trusted);
    assert.equal(route.disposition, 'READY');
    assert.equal(route.role, 'peak');
    assert.equal(route.critical, true);
    assert.equal(route.requested_model, 'review-model');
  }
  assert.equal(resolve(request('MR-006'), trusted).role, 'anchor');
  for (const delegate_scene of ['MR-001', 'MR-002', 'MR-003', 'MR-006']) {
    const input = request('MR-007');
    input.delegate_scene = delegate_scene;
    input.runtime_capabilities.capacity = {payload_tokens: 100, overhead_tokens: 20, reserve_tokens: 10, available_tokens: 130};
    const route = resolve(input, trusted);
    assert.equal(route.disposition, 'READY');
    assert.equal(route.role, policy.scenes[delegate_scene].role);
  }
  assert.equal(resolve(request('MR-007'), trusted).disposition, 'NEEDS_CONTEXT');
});
test('resolve: stable scene IDs are strings, never property-key coercions', () => {
  for (const scene of [['MR-003'], [], {}, null, true, 3]) {
    const input = request('MR-003');
    input.scene = scene;
    assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT', 'non-string scene');
  }
  const input = request('MR-007');
  input.delegate_scene = ['MR-002'];
  input.runtime_capabilities.capacity = {payload_tokens: 100, overhead_tokens: 20, reserve_tokens: 10, available_tokens: 130};
  assert.equal(resolve(input, trusted).reason, 'UNKNOWN_DELEGATE_SCENE');
  const route = resolve(request('MR-003'), trusted);
  assert.throws(() => createRouteManifest({...route, scene: ['MR-003']}, bindings()), /READY/);
  assert.throws(() => createRouteManifest({...route, delegate_scene: ['MR-002']}, bindings()), /READY/);
});
test('resolve: JSON claims cannot establish capability or configuration provenance', () => {
  assert.equal(resolve(request()).disposition, 'NEEDS_CONTEXT');
  assert.equal(resolve(request(), {verifyCapability: () => false}).disposition, 'NEEDS_CONTEXT');
  assert.equal(resolve(request(), {verifyCapability: () => { throw new Error('unavailable'); }}).disposition, 'NEEDS_CONTEXT');
  assert.equal(resolve(request(), {verifyCapability: () => Promise.resolve(true)}).disposition, 'NEEDS_CONTEXT');
});
test('resolve: missing/invalid model choices and non-Codex harnesses fail closed', () => {
  assert.equal(resolve(null, trusted).disposition, 'NEEDS_CONTEXT');
  assert.equal(resolve(request('unknown'), trusted).disposition, 'NEEDS_CONTEXT');
  const input = request('MR-002');
  delete input.effective_config.peak;
  assert.equal(resolve(input, trusted).reason, 'MISSING_PEAK');
  input.effective_config.peak = {model: 'review-model', source: 'unapproved', approved: false};
  assert.equal(resolve(input, trusted).reason, 'PEAK_NOT_APPROVED');
  input.effective_config.peak.approved = true;
  input.effective_config.anchor.model = '';
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.effective_config.anchor.model = 'execution-model';
  input.effective_config.anchor.source = '';
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.effective_config.anchor.source = 'verified-session';
  input.harness = 'other-runtime';
  assert.equal(resolve(input, trusted).reason, 'UNSUPPORTED_HARNESS');
});
test('resolve: unsupported/unknown override, pin, evidence and safety cannot be READY', () => {
  for (const field of ['explicit_model_override', 'adopted_model_evidence', 'preserves_safety']) {
    const input = request('MR-003');
    input.runtime_capabilities[field] = false;
    assert.equal(resolve(input, trusted).disposition, 'REFUSE', field);
    delete input.runtime_capabilities[field];
    assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT', field);
  }
  const input = request('MR-003');
  input.runtime_capabilities.model_pin = 'execution-model';
  assert.equal(resolve(input, trusted).reason, 'MODEL_PIN_CONFLICT');
  delete input.runtime_capabilities.model_pin;
  assert.equal(resolve(input, trusted).reason, 'UNKNOWN_MODEL_PIN');
  input.runtime_capabilities.model_pin = 'review-model';
  assert.equal(resolve(input, trusted).disposition, 'READY');
  input.runtime_capabilities.evidence.owner = '';
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.runtime_capabilities.evidence.owner = 'fixture-runtime';
  input.runtime_capabilities.evidence.harness = 'codex-cli';
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.runtime_capabilities.evidence.harness = 'codex-native';
  delete input.effective_config.security;
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
});
test('resolve: long delegation budgets payload + system/tools + safety reserve', () => {
  const input = request('MR-007');
  input.delegate_scene = 'MR-002';
  assert.equal(resolve(input, trusted).reason, 'UNKNOWN_CAPACITY');
  input.runtime_capabilities.capacity = {payload_tokens: 100, overhead_tokens: 20, reserve_tokens: 10, available_tokens: 129};
  assert.equal(resolve(input, trusted).reason, 'INSUFFICIENT_CAPACITY');
  input.runtime_capabilities.capacity.available_tokens = 130;
  assert.equal(resolve(input, trusted).disposition, 'READY');
  input.runtime_capabilities.capacity.reserve_tokens = 0;
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.runtime_capabilities.capacity.reserve_tokens = 10;
  input.runtime_capabilities.capacity.payload_tokens = Number.MAX_SAFE_INTEGER;
  assert.equal(resolve(input, trusted).disposition, 'NEEDS_CONTEXT');
  input.delegate_scene = 'MR-007';
  assert.equal(resolve(input, trusted).reason, 'UNKNOWN_DELEGATE_SCENE');
});
test('resolve: model/config hashes bind both choices and safety, never effort', () => {
  const input = request('MR-002');
  const original = structuredClone(input);
  const base = resolve(input, trusted);
  assert.match(base.policy_sha, /^[a-f0-9]{64}$/);
  assert.match(base.routing_config_sha, /^[a-f0-9]{64}$/);
  assert.match(base.capability_evidence_sha, /^[a-f0-9]{64}$/);
  assert.deepEqual(input, original, 'resolver does not mutate inputs');
  input.effective_config.anchor.model = 'new-default-model';
  const changed = resolve(input, trusted);
  assert.equal(changed.requested_model, 'review-model');
  assert.notEqual(changed.routing_config_sha, base.routing_config_sha, 'default changes invalidate peak tickets too');
  assert.equal(resolve({...input, scene: 'MR-001'}, trusted).requested_model, 'new-default-model');
  input.effective_config.anchor.model = 'execution-model';
  input.effective_config.security.network = true;
  assert.notEqual(resolve(input, trusted).routing_config_sha, base.routing_config_sha);
  input.effective_config.security.network = false;
  input.effective_config.security.provider = 'other-provider';
  assert.notEqual(resolve(input, trusted).routing_config_sha, base.routing_config_sha);
  input.effective_config.security.provider = 'fixture-provider';
  input.effective_config.anchor.model_reasoning_effort = 'arbitrary-user-value';
  input.effective_config.peak.effort = {not: 'comparable'};
  input.effective_config.security.effort = 'user-owned';
  input.runtime_capabilities.effort = 'unrelated';
  input.role_config.effort = 'not-a-routing-policy';
  assert.deepEqual(resolve(input, {verifyCapability: clean => {
    assert.equal(JSON.stringify(clean).includes('effort'), false, 'trust seam must not inspect effort');
    return true;
  }}), base);
  input.effective_config.anchor.model = 'review-model';
  const equal = resolve(input, trusted);
  assert.equal(equal.model_relation, 'NO_MODEL_UPGRADE');
  assert.equal(equal.independent_review_required, true);
  assert.equal(equal.disposition, 'READY');
});

function bindings() {
  return {route_id: 'route-1', invocation_id: 'call-1', task_id: 'task-1', input_sha: 'a'.repeat(64), generation: 1};
}
test('manifest: only complete READY routes get an invocation-bound manifest', () => {
  const route = resolve(request('MR-003'), trusted);
  const manifest = createRouteManifest(route, bindings());
  assert.equal(manifest.requested_model, 'review-model');
  assert.equal(manifest.scene, 'MR-003');
  assert.equal(manifest.policy_sha, route.policy_sha);
  assert.equal(manifest.capability_evidence_sha, route.capability_evidence_sha);
  assert.equal(manifest.task_id, 'task-1');
  assert.equal(manifest.generation, 1);
  assert.throws(() => createRouteManifest(resolve(request('MR-003')), bindings()), /READY/);
  assert.throws(() => createRouteManifest(route, {...bindings(), input_sha: 'not-a-hash'}), /bindings/);
  assert.throws(() => createRouteManifest(route, {...bindings(), invocation_id: ''}), /bindings/);
  assert.throws(() => createRouteManifest(route, {...bindings(), generation: -1}), /bindings/);
});
function decisionFixture() {
  const current = {request: request('MR-003'), ...bindings(), critical_failure: false};
  const manifest = createRouteManifest(resolve(current.request, trusted), current);
  const decision = {
    ...bindings(),
    policy_sha: manifest.policy_sha,
    routing_config_sha: manifest.routing_config_sha,
    capability_evidence_sha: manifest.capability_evidence_sha,
    requested_model: manifest.requested_model,
    status: 'completed', exit_code: 0, error: null, rerouted: false, fallback: false, verdict: 'PASS',
    model_evidence: {kind: 'runtime-adopted', model: 'review-model', invocation_id: 'call-1',
      harness: 'codex-native', owner: 'fixture-runtime', ref: 'fixture:completed-turn'},
  };
  return {current, manifest, decision};
}
const trustedDecision = {...trusted, verifyModelEvidence: () => true};
test('decision: trusted adoption + same-call success accepts a current critical verdict', () => {
  const {current, manifest, decision} = decisionFixture();
  const result = validateDecision(manifest, decision, current, trustedDecision);
  assert.equal(result.disposition, 'ACCEPT');
  assert.equal(result.authorizes_external_effects, false, 'original human authority is still required');
  assert.equal(validateDecision(JSON.parse(JSON.stringify(manifest)), JSON.parse(JSON.stringify(decision)),
    current, trustedDecision).disposition, 'ACCEPT', 'JSON roundtrip preserves valid correlation');
});
test('decision: no declared or unknown fallback is accepted even with a clear failure latch', () => {
  for (const fallback of ['conservative-default', true, null, undefined]) {
    const {current, manifest, decision} = decisionFixture();
    decision.fallback = fallback;
    assert.equal(current.critical_failure, false);
    assert.equal(validateDecision(manifest, decision, current, trustedDecision).reason, 'FALLBACK_DECISION_REFUSED');
  }
});
test('decision: request/self-report, wrong model or invocation, errors and reroutes are rejected', () => {
  for (const patch of [
    {kind: 'requested'}, {kind: 'model-self-report'}, {model: 'execution-model'},
    {invocation_id: 'other-call'}, {harness: 'codex-cli'}, {owner: ''}, {ref: ''},
  ]) {
    const {current, manifest, decision} = decisionFixture();
    Object.assign(decision.model_evidence, patch);
    assert.equal(validateDecision(manifest, decision, current, trustedDecision).disposition, 'REFUSE', JSON.stringify(patch));
  }
  for (const patch of [{status: 'failed'}, {exit_code: 1}, {error: 'timeout'}, {rerouted: true}, {verdict: 'FAIL'}]) {
    const {current, manifest, decision} = decisionFixture();
    Object.assign(decision, patch);
    assert.equal(validateDecision(manifest, decision, current, trustedDecision).disposition, 'REFUSE');
  }
  const {current, manifest, decision} = decisionFixture();
  assert.equal(validateDecision(manifest, decision, current, trusted).disposition, 'NEEDS_CONTEXT', 'untrusted-model-evidence');
  assert.equal(validateDecision(manifest, decision, current, {...trusted, verifyModelEvidence: () => false}).disposition, 'NEEDS_CONTEXT');
  assert.equal(validateDecision(manifest, decision, current, {verifyModelEvidence: () => true}).disposition, 'NEEDS_CONTEXT');
  assert.equal(validateDecision(manifest, null, current, trustedDecision).disposition, 'REFUSE');
});
test('decision: task/input/config/policy/capability/route/call/generation bindings must all be current', () => {
  const fields = ['task_id', 'input_sha', 'routing_config_sha', 'policy_sha', 'capability_evidence_sha',
    'route_id', 'invocation_id', 'generation', 'requested_model'];
  for (const field of fields) {
    for (const subject of ['manifest', 'decision']) {
      const fixture = decisionFixture();
      fixture[subject][field] = field === 'generation' ? 0 : 'stale-or-forged';
      assert.equal(validateDecision(fixture.manifest, fixture.decision, fixture.current, trustedDecision).disposition,
        'REFUSE', `${subject}.${field}`);
    }
  }
  for (const update of [
    current => { current.generation++; },
    current => { current.request.effective_config.anchor.model = 'new-default-model'; },
    current => { current.request.effective_config.peak.model = 'new-review-model'; },
    current => { current.request.effective_config.security.network = true; },
    current => { current.request.effective_config.security.provider = 'other-provider'; },
    current => { current.request.role_config.scenes['MR-003'].trigger = 'updated-policy'; },
    current => { current.request.runtime_capabilities.evidence.ref = 'new-capability-attestation'; },
  ]) {
    const {current, manifest, decision} = decisionFixture();
    update(current);
    assert.equal(validateDecision(manifest, decision, current, trustedDecision).disposition, 'REFUSE');
  }
  const {current, decision} = decisionFixture();
  assert.equal(validateDecision(null, decision, current, trustedDecision).disposition, 'REFUSE');
  current.request.scene = 'MR-001';
  const execution = createRouteManifest(resolve(current.request, trusted), current);
  assert.equal(validateDecision(execution, decision, current, trustedDecision).reason, 'NOT_CRITICAL_ROUTE');
});
test('decision: the parent failure latch blocks old success, null and conservative fallback', () => {
  const {current, manifest, decision} = decisionFixture();
  current.critical_failure = true;
  for (const fallback of [decision, null, {...decision, verdict: 'PASS', fallback: 'conservative-default'}]) {
    assert.equal(validateDecision(manifest, fallback, current, trustedDecision).reason, 'CRITICAL_FAILURE_LATCHED');
  }
  delete current.critical_failure;
  assert.equal(validateDecision(manifest, decision, current, trustedDecision).disposition, 'NEEDS_CONTEXT');
});
test('decision: effort changes preserve acceptance; equal selections still require independent review', () => {
  const {current, manifest, decision} = decisionFixture();
  const original = structuredClone({current, manifest, decision});
  current.request.effective_config.anchor.effort = 'different-user-setting';
  current.request.effective_config.peak.model_reasoning_effort = null;
  current.request.runtime_capabilities.effort = ['unknown'];
  assert.equal(validateDecision(manifest, decision, current, trustedDecision).disposition, 'ACCEPT');
  delete current.request.effective_config.anchor.effort;
  delete current.request.effective_config.peak.model_reasoning_effort;
  delete current.request.runtime_capabilities.effort;
  assert.deepEqual({current, manifest, decision}, original, 'decision validation does not mutate inputs');
  current.request.effective_config.anchor.model = 'review-model';
  const equalRoute = resolve(current.request, trusted);
  assert.equal(equalRoute.independent_review_required, true);
  const equalManifest = createRouteManifest(equalRoute, current);
  decision.routing_config_sha = equalManifest.routing_config_sha;
  assert.equal(validateDecision(equalManifest, decision, current, trustedDecision).disposition, 'ACCEPT');
});
test('JSON CLI: reads canonical policy but cannot turn parent JSON claims into attestation', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'model-route-cli-'));
  try {
    const inputPath = join(scratch, 'request.json');
    const input = request('MR-003');
    input.role_config.scenes['MR-003'].role = 'anchor'; // request policy cannot replace repository truth
    input.verified = true;
    writeFileSync(inputPath, JSON.stringify(input));
    const result = spawnSync(process.execPath, [join(root, 'scripts/model-route.mjs'), 'resolve', '--input', inputPath], {encoding: 'utf8'});
    assert.equal(result.status, 2, result.stderr);
    const route = JSON.parse(result.stdout);
    assert.equal(route.role, 'peak');
    assert.equal(route.requested_model, 'review-model');
    assert.equal(route.disposition, 'NEEDS_CONTEXT');
    assert.equal(route.reason, 'UNVERIFIED_CAPABILITY_OR_CONFIG');
    assert.equal(readFileSync(inputPath, 'utf8'), JSON.stringify(input), 'CLI does not write its input');
    input.scene = 'MR-002';
    delete input.effective_config.peak;
    writeFileSync(inputPath, JSON.stringify(input));
    const refused = spawnSync(process.execPath, [join(root, 'scripts/model-route.mjs'), 'resolve', '--input', inputPath], {encoding: 'utf8'});
    assert.equal(refused.status, 3);
    assert.equal(JSON.parse(refused.stdout).reason, 'MISSING_PEAK');
    const invalid = spawnSync(process.execPath, [join(root, 'scripts/model-route.mjs'), 'resolve'], {encoding: 'utf8'});
    assert.equal(invalid.status, 3);
    assert.equal(JSON.parse(invalid.stdout).reason, 'INVALID_REQUEST');
    writeFileSync(inputPath, '{not-json');
    const malformed = spawnSync(process.execPath, [join(root, 'scripts/model-route.mjs'), 'resolve', '--input', inputPath], {encoding: 'utf8'});
    assert.equal(malformed.status, 3);
    assert.equal(JSON.parse(malformed.stdout).reason, 'INVALID_REQUEST');
  } finally {
    rmSync(scratch, {recursive: true});
  }
});

if (process.argv.includes('--mutation')) {
  const scratch = mkdtempSync(join(tmpdir(), 'model-route-mutation-'));
  const moduleSource = readFileSync(join(root, 'scripts/model-route.mjs'), 'utf8');
  const policySource = readFileSync(join(root, '.claude/skill-os/model-routing.yaml'), 'utf8');
  const replace = (source, before, after) => {
    assert.equal(source.split(before).length, 2, `mutation target must be unique: ${before}`);
    return source.replace(before, after);
  };
  const mutations = [
    ['peak-scene-to-anchor', 'policy', source => replace(source,
      'trigger: redteam-refute-judge-oracle-expert-panel\n        role: peak\n        critical: true',
      'trigger: redteam-refute-judge-oracle-expert-panel\n        role: anchor\n        critical: false'), "'anchor'"],
    ['unverified-capability', 'module', source => replace(source,
      'if (!verified(verifyCapability, modelOnly(input)))', 'if (false)'), "'READY'"],
    ['safety-boundary-removed', 'module', source => replace(source,
      "['explicit_model_override', 'adopted_model_evidence', 'preserves_safety']",
      "['explicit_model_override', 'adopted_model_evidence']"), 'preserves_safety'],
    ['pin-conflict-ignored', 'module', source => replace(source,
      'if (capabilities.model_pin !== null && capabilities.model_pin !== choice.model)', 'if (false)'), 'MODEL_PIN_CONFLICT'],
    ['capacity-limit-ignored', 'module', source => replace(source,
      'if (required > capacity.available_tokens)', 'if (false)'), 'INSUFFICIENT_CAPACITY'],
    ['wrong-adopted-model', 'module', source => replace(source,
      'evidence.model !== route.requested_model || ', ''), '{"model":"execution-model"}'],
    ['generation-ignored', 'module', source => replace(replace(source,
      'manifest[key] !== expected[key]', "key !== 'generation' && manifest[key] !== expected[key]"),
      'decision[key] !== expected[key]', "key !== 'generation' && decision[key] !== expected[key]"), 'manifest.generation'],
    ['routing-config-ignored', 'module', source => replace(replace(source,
      'manifest[key] !== expected[key]', "key !== 'routing_config_sha' && manifest[key] !== expected[key]"),
      'decision[key] !== expected[key]', "key !== 'routing_config_sha' && decision[key] !== expected[key]"), 'manifest.routing_config_sha'],
    ['critical-latch-removed', 'module', source => replace(replace(source,
      "if (current?.critical_failure === true) return outcome('REFUSE', 'CRITICAL_FAILURE_LATCHED');", ''),
      "if (current?.critical_failure !== false) return outcome('NEEDS_CONTEXT', 'UNKNOWN_FAILURE_STATE');", ''), 'CRITICAL_FAILURE_LATCHED'],
    ['untrusted-model-evidence', 'module', source => replace(source,
      'if (!verified(trust.verifyModelEvidence, modelOnly({manifest, decision, current})))', 'if (false)'), 'untrusted-model-evidence'],
    ['scene-type-guard-removed', 'module', source => replace(source,
      "if (!text(input.scene)) return fail('NEEDS_CONTEXT', 'UNKNOWN_SCENE');", ''), 'non-string scene'],
    ['delegate-type-guard-removed', 'module', source => replace(source,
      "if (!text(input.delegate_scene)) return fail('NEEDS_CONTEXT', 'UNKNOWN_DELEGATE_SCENE');", ''), 'UNKNOWN_DELEGATE_SCENE'],
    ['fallback-guard-removed', 'module', source => replace(source,
      "if (decision.fallback !== false) return outcome('REFUSE', 'FALLBACK_DECISION_REFUSED');", ''), 'FALLBACK_DECISION_REFUSED'],
  ];
  try {
    mkdirSync(join(scratch, 'scripts'));
    mkdirSync(join(scratch, '.claude/skill-os'), {recursive: true});
    writeFileSync(join(scratch, 'scripts/test-model-route.mjs'), readFileSync(fileURLToPath(import.meta.url)));
    const runCopy = () => spawnSync(process.execPath, [join(scratch, 'scripts/test-model-route.mjs')],
      {encoding: 'utf8', timeout: 10000});
    for (const [name, target, mutate, expectedFailure] of mutations) {
      writeFileSync(join(scratch, 'scripts/model-route.mjs'), target === 'module' ? mutate(moduleSource) : moduleSource);
      writeFileSync(join(scratch, '.claude/skill-os/model-routing.yaml'), target === 'policy' ? mutate(policySource) : policySource);
      const result = runCopy();
      assert.equal(result.status, 1, `${name} must make the suite fail, not hang or pass`);
      assert.ok(result.stderr.includes('ERR_ASSERTION') && result.stderr.includes(expectedFailure),
        `${name} must fail the intended assertion: ${result.stderr}`);
      console.log(`KILLED mutation: ${name}`);
    }
    writeFileSync(join(scratch, 'scripts/model-route.mjs'), moduleSource);
    writeFileSync(join(scratch, '.claude/skill-os/model-routing.yaml'), policySource);
    const restored = runCopy();
    assert.equal(restored.status, 0, `restored core must pass: ${restored.stderr}`);
    console.log(`PASS restored baseline; ${mutations.length}/${mutations.length} mutations killed`);
  } finally {
    rmSync(scratch, {recursive: true});
  }
}
console.log(`${passed} behavioral test groups passed`);
