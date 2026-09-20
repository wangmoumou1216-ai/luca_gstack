#!/usr/bin/env node
// Parser-only Codex model policy. READY is not availability or call success.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

function verified(verifier, context) {
  try { return typeof verifier === 'function' && verifier(context) === true; }
  catch { return false; }
}
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
// A separate model-only snapshot prevents effort from entering either trust seam or digest.
function modelOnly(value) {
  if (Array.isArray(value)) return value.map(modelOnly);
  if (!record(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => !/effort/i.test(key))
    .map(key => [key, modelOnly(value[key])]));
}
const digest = value => createHash('sha256').update(JSON.stringify(modelOnly(value))).digest('hex');
export const modelRoutingPolicyDigest = policy => digest(policy);

export function resolve(input, {verifyCapability} = {}) {
  const fail = (disposition, reason) => ({disposition, reason});
  if (!record(input)) return fail('NEEDS_CONTEXT', 'MISSING_REQUEST');
  const policy = input.role_config;
  const v1 = record(policy) && policy.version === 1 && policy.scope === 'codex' && policy.status === 'parser-only';
  const v2 = record(policy) && policy.version === 2 && policy.scope === 'common'
    && ['candidate', 'active'].includes(policy.status);
  if (!v1 && !v2) {
    return fail('NEEDS_CONTEXT', 'INVALID_POLICY');
  }
  const supportedHarnesses = v1
    ? ['codex-native', 'codex-cli']
    : ['codex-native', 'codex-cli', 'claude-native', 'claude-workflow'];
  if (!supportedHarnesses.includes(input.harness)) return fail('REFUSE', 'UNSUPPORTED_HARNESS');
  if (!text(input.scene)) return fail('NEEDS_CONTEXT', 'UNKNOWN_SCENE');
  const definition = input.role_config?.scenes?.[input.scene];
  let scene = definition;
  if (definition?.role === 'by-scene') {
    if (!text(input.delegate_scene)) return fail('NEEDS_CONTEXT', 'UNKNOWN_DELEGATE_SCENE');
    scene = input.role_config.scenes[input.delegate_scene];
  }
  const roles = v2 ? ['anchor', 'peak', 'light'] : ['anchor', 'peak'];
  if (!scene || !roles.includes(scene.role)) {
    return {disposition: 'NEEDS_CONTEXT', reason: definition ? 'UNKNOWN_DELEGATE_SCENE' : 'UNKNOWN_SCENE'};
  }
  if (typeof scene.critical !== 'boolean' || (scene.critical && scene.role !== 'peak')) {
    return fail('REFUSE', 'INVALID_SCENE_POLICY');
  }
  const config = input.effective_config;
  if (!record(config?.anchor) || !text(config.anchor.model) || !text(config.anchor.source)) {
    return fail('NEEDS_CONTEXT', 'UNVERIFIED_EFFECTIVE_DEFAULT');
  }
  if (scene.role === 'peak' && !record(config.peak)) return fail('REFUSE', 'MISSING_PEAK');
  if (config.peak !== undefined) {
    if (!record(config.peak) || !text(config.peak.model) || !text(config.peak.source)) return fail('REFUSE', 'INVALID_PEAK');
    if (config.peak.approved !== true) return fail('REFUSE', 'PEAK_NOT_APPROVED');
  }
  if (v2 && config.light !== undefined && (!record(config.light) || !text(config.light.model) || !text(config.light.source))) {
    return fail('REFUSE', 'INVALID_LIGHT');
  }
  let choice = config[scene.role];
  let adaptation = scene.role === 'anchor' ? 'ANCHOR_SELECTED' : `${scene.role.toUpperCase()}_SELECTED`;
  if (v2 && scene.role !== 'anchor') {
    const order = Array.isArray(config.approved_order) && config.approved_order.every(text)
      && new Set(config.approved_order).size === config.approved_order.length ? config.approved_order : null;
    const anchorRank = order?.indexOf(config.anchor.model) ?? -1;
    const selected = config[scene.role];
    const selectedRank = selected ? (order?.indexOf(selected.model) ?? -1) : -1;
    if (scene.role === 'peak') {
      if (!order || anchorRank < 0 || selectedRank < 0) return fail('NEEDS_CONTEXT', 'UNKNOWN_MODEL_RELATION');
      if (anchorRank >= selectedRank) {
        choice = config.anchor;
        adaptation = 'NO_MODEL_UPGRADE';
      }
    } else if (!selected || selected.approved !== true) {
      choice = config.anchor;
      adaptation = selected ? 'LIGHT_NOT_APPROVED' : 'LIGHT_NOT_CONFIGURED';
    } else if (!order || anchorRank < 0 || selectedRank < 0 || selectedRank >= anchorRank) {
      choice = config.anchor;
      adaptation = 'NO_MODEL_DOWNGRADE';
    }
  }
  const route = {
    scene: input.scene,
    delegate_scene: definition.role === 'by-scene' ? input.delegate_scene : null,
    harness: input.harness,
    role: scene.role,
    requested_role: scene.role,
    critical: scene.critical,
    requested_model: choice.model,
    effective_model: choice.model,
    model_source: choice.source,
    adaptation,
    model_relation: v1 ? (!config.peak ? 'PEAK_NOT_CONFIGURED' :
      config.anchor.model === config.peak.model ? 'NO_MODEL_UPGRADE' : 'DISTINCT_SELECTION') : adaptation,
    independent_review_required: scene.critical,
    evidence_requirements: ['trusted-capability-and-config-source', 'runtime-adopted-model', 'same-invocation-success'],
    policy_version: policy.version,
    policy_source: v1 ? '.claude/skill-os/model-routing.yaml#codex.model_routing' :
      policy.status === 'active' ? '.claude/skill-os/model-routing.yaml#model_routing' :
        'framework-audit/candidates/model-routing-v2.yaml#model_routing',
  };
  const stop = (disposition, reason) => ({...route, disposition, reason});
  if (!record(config.security) || !text(config.security.provider) || !text(config.security.sandbox) ||
      !text(config.security.approval_policy) || typeof config.security.network !== 'boolean') {
    return stop('NEEDS_CONTEXT', 'UNKNOWN_SAFETY_BOUNDARY');
  }
  const capabilities = input.runtime_capabilities;
  if (!record(capabilities)) return stop('NEEDS_CONTEXT', 'MISSING_CAPABILITIES');
  for (const field of ['explicit_model_override', 'adopted_model_evidence', 'preserves_safety']) {
    if (capabilities[field] === false) return stop('REFUSE', `UNSUPPORTED_${field.toUpperCase()}`);
    if (capabilities[field] !== true) return stop('NEEDS_CONTEXT', `UNKNOWN_${field.toUpperCase()}`);
  }
  if (capabilities.model_pin !== null && !text(capabilities.model_pin)) return stop('NEEDS_CONTEXT', 'UNKNOWN_MODEL_PIN');
  if (capabilities.model_pin !== null && capabilities.model_pin !== choice.model) return stop('REFUSE', 'MODEL_PIN_CONFLICT');
  const evidence = capabilities.evidence;
  if (!record(evidence) || !text(evidence.owner) || !text(evidence.ref) || evidence.harness !== input.harness) {
    return stop('NEEDS_CONTEXT', 'UNKNOWN_CAPABILITY_SOURCE');
  }
  const capacity = capabilities.capacity;
  if (definition.requires_capacity || capacity !== undefined) {
    const fields = ['payload_tokens', 'overhead_tokens', 'reserve_tokens', 'available_tokens'];
    if (!record(capacity) || !fields.every(field => Number.isSafeInteger(capacity[field]) && capacity[field] >= 0) ||
        capacity.overhead_tokens === 0 || capacity.reserve_tokens === 0) return stop('NEEDS_CONTEXT', 'UNKNOWN_CAPACITY');
    const required = capacity.payload_tokens + capacity.overhead_tokens + capacity.reserve_tokens;
    if (!Number.isSafeInteger(required)) return stop('NEEDS_CONTEXT', 'UNKNOWN_CAPACITY');
    if (required > capacity.available_tokens) return stop('REFUSE', 'INSUFFICIENT_CAPACITY');
  }
  route.policy_sha = digest(policy);
  route.routing_config_sha = digest({
    policy_sha: route.policy_sha,
    harness: input.harness,
    anchor: {model: config.anchor.model, source: config.anchor.source},
    peak: config.peak ? {model: config.peak.model, source: config.peak.source, approved: config.peak.approved} : null,
    light: v2 && config.light ? {model: config.light.model, source: config.light.source, approved: config.light.approved} : null,
    approved_order: v2 ? config.approved_order ?? null : null,
    security: config.security,
  });
  route.capability_evidence_sha = digest({harness: input.harness, capabilities});
  // This synchronous, pure verifier belongs to the trusted host, never to request JSON.
  // It must attest effective model sources, role pins, capacity and preserved safety/provider bounds.
  if (!verified(verifyCapability, modelOnly(input))) {
    return {...route, disposition: 'NEEDS_CONTEXT', reason: 'UNVERIFIED_CAPABILITY_OR_CONFIG'};
  }
  return {...route, disposition: 'READY', reason: 'READY_TO_DISPATCH'};
}

// Callers provide an exact identity; the common policy never guesses from prompt text.
export function resolveDispatchScene(policy, caller) {
  if (!record(policy) || policy.version !== 2 || policy.scope !== 'common' || !record(caller)) return null;
  if (caller.kind === 'native-agent' && text(caller.agent_type)) {
    const scene = policy.dispatch?.native_agent_types?.[caller.agent_type];
    return text(scene) && record(policy.scenes?.[scene]) ? scene : null;
  }
  if (caller.kind === 'workflow' && text(caller.workflow_id) && text(caller.phase_id)) {
    const scene = policy.dispatch?.workflows?.[caller.workflow_id]?.[caller.phase_id];
    return text(scene) && record(policy.scenes?.[scene]) ? scene : null;
  }
  return null;
}

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const bindingFields = ['route_id', 'invocation_id', 'task_id', 'input_sha', 'generation'];
const routeFields = ['scene', 'delegate_scene', 'harness', 'role', 'requested_role', 'critical', 'requested_model',
  'effective_model', 'model_source', 'adaptation', 'policy_version', 'policy_sha', 'routing_config_sha',
  'capability_evidence_sha'];

// A manifest is a correlation envelope, not a signed authorization or model-success proof.
export function createRouteManifest(route, bindings) {
  if (route?.disposition !== 'READY' || !text(route.requested_model) || !['anchor', 'peak', 'light'].includes(route.role) ||
      !text(route.scene) || !text(route.model_source) ||
      !['codex-native', 'codex-cli', 'claude-native', 'claude-workflow'].includes(route.harness) ||
      (route.delegate_scene !== null && !text(route.delegate_scene)) ||
      typeof route.critical !== 'boolean' || !['policy_sha', 'routing_config_sha', 'capability_evidence_sha'].every(key => hash(route[key]))) {
    throw new TypeError('complete READY route required');
  }
  if (!record(bindings) || !['route_id', 'invocation_id', 'task_id'].every(key => text(bindings[key])) ||
      !hash(bindings.input_sha) || !Number.isSafeInteger(bindings.generation) || bindings.generation < 0) {
    throw new TypeError('valid invocation bindings required');
  }
  return {version: route.policy_version ?? 1,
    ...Object.fromEntries(routeFields.filter(key => route[key] !== undefined).map(key => [key, route[key]])),
    ...Object.fromEntries(bindingFields.map(key => [key, bindings[key]]))};
}

// All current inputs and failure state are parent-owned, never supplied by the child verdict.
export function validateDecision(manifest, decision, current, trust = {}) {
  const outcome = (disposition, reason) => ({disposition, reason, authorizes_external_effects: false});
  if (current?.critical_failure === true) return outcome('REFUSE', 'CRITICAL_FAILURE_LATCHED');
  if (current?.critical_failure !== false) return outcome('NEEDS_CONTEXT', 'UNKNOWN_FAILURE_STATE');
  const route = resolve(current?.request, trust);
  if (route.disposition !== 'READY') return outcome(route.disposition, route.reason);
  if (!route.critical || route.role !== 'peak') return outcome('REFUSE', 'NOT_CRITICAL_ROUTE');
  let expected;
  try { expected = createRouteManifest(route, current); }
  catch { return outcome('REFUSE', 'INVALID_CURRENT_BINDINGS'); }
  if (!record(manifest) || Object.keys(expected).some(key => manifest[key] !== expected[key])) {
    return outcome('REFUSE', 'STALE_OR_FORGED_MANIFEST');
  }
  if (!record(decision) || decision.status !== 'completed' || decision.exit_code !== 0 ||
      decision.error !== null || decision.rerouted !== false || decision.verdict !== 'PASS') {
    return outcome('REFUSE', 'DECISION_UNSUCCESSFUL');
  }
  if (decision.fallback !== false) return outcome('REFUSE', 'FALLBACK_DECISION_REFUSED');
  const decisionBindings = [...bindingFields, 'policy_sha', 'routing_config_sha', 'capability_evidence_sha', 'requested_model'];
  if (decisionBindings.some(key => decision[key] !== expected[key])) return outcome('REFUSE', 'DECISION_BINDING_MISMATCH');
  const evidence = decision.model_evidence;
  if (!record(manifest) || !record(evidence) || evidence.kind !== 'runtime-adopted' ||
      evidence.model !== route.requested_model || evidence.invocation_id !== manifest.invocation_id ||
      evidence.harness !== route.harness || !text(evidence.owner) || !text(evidence.ref)) {
    return outcome('REFUSE', 'MODEL_EVIDENCE_MISMATCH');
  }
  // The host must confirm same-call success and non-fallback provenance, not just a model label.
  if (!verified(trust.verifyModelEvidence, modelOnly({manifest, decision, current}))) {
    return outcome('NEEDS_CONTEXT', 'UNVERIFIED_MODEL_EVIDENCE');
  }
  return outcome('ACCEPT', 'CURRENT_DECISION_VALID');
}

// The JSON command is deliberately advisory: no trusted host collector is wired in this phase.
// Imported APIs do no file/process/network I/O; only this read-only CLI loads request and policy.
function main(args) {
  let result;
  try {
    const [command, option, inputPath, ...extra] = args;
    if (command !== 'resolve' || option !== '--input' || !inputPath || extra.length) throw new Error('usage');
    const input = JSON.parse(readFileSync(inputPath, 'utf8'));
    if (!record(input)) throw new Error('request');
    const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    // PyYAML is the repository's existing YAML dependency; select this subtree to exclude YAML dates.
    const loaded = spawnSync('python3', ['-c',
      'import json,sys,yaml;d=yaml.safe_load(open(sys.argv[1]));print(json.dumps(d.get("model_routing") or d.get("codex",{}).get("model_routing")))',
      path.join(root, '.claude/skill-os/model-routing.yaml')], {encoding: 'utf8', timeout: 5000});
    result = loaded.status === 0 ? resolve({...input, role_config: JSON.parse(loaded.stdout)}) :
      {disposition: 'NEEDS_CONTEXT', reason: 'INVALID_POLICY'};
  } catch {
    result = {disposition: 'REFUSE', reason: 'INVALID_REQUEST'};
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.disposition === 'READY' ? 0 : result.disposition === 'NEEDS_CONTEXT' ? 2 : 3;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
