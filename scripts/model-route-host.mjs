#!/usr/bin/env node
// Trusted lifecycle/evidence state for the shared model-only router.
// Policy chooses a role/model; this host only binds that choice to a root activation and one call.
import {createHash, randomUUID} from 'node:crypto';
import {
  chmodSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync,
  renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import {dirname, join} from 'node:path';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const supportedHarnesses = new Set(['codex', 'claude']);
const externalIdentityFields = new Set(['tool_use_id', 'agent_id', 'agent_type']);
export const MODEL_ROUTE_INTERFACE_VERSION = 'luca-model-route/v2';
export const MODEL_ROUTE_ADAPTER_CONTRACT_SHA = createHash('sha256').update([
  'explicit-model-only',
  'root-anchor-owned-by-parent',
  'same-invocation-adoption-and-completion',
  'no-reroute-no-fallback',
  'critical-failure-monotonic',
].join('\n')).digest('hex');

export function computeReleaseDigest({policy_sha, adapter_contract_sha, interface_version}) {
  if (!hash(policy_sha) || !hash(adapter_contract_sha) || !text(interface_version)) {
    throw new TypeError('valid release components required');
  }
  return createHash('sha256').update(JSON.stringify({
    adapter_contract_sha,
    interface_version,
    policy_sha,
  })).digest('hex');
}

export function releaseDigestForPolicy(policy_sha) {
  return computeReleaseDigest({
    policy_sha,
    adapter_contract_sha: MODEL_ROUTE_ADAPTER_CONTRACT_SHA,
    interface_version: MODEL_ROUTE_INTERFACE_VERSION,
  });
}

function stateRoot(explicit) {
  return explicit || '/Users/luca/.luca/state/model-routing';
}
function sessionKey(rootSessionId) {
  if (!text(rootSessionId)) throw new TypeError('root_session_id required');
  return createHash('sha256').update(rootSessionId).digest('hex');
}
function statePath({harness, root_session_id, state_root}) {
  if (!supportedHarnesses.has(harness)) throw new TypeError('unsupported harness');
  return join(stateRoot(state_root), harness, `${sessionKey(root_session_id)}.json`);
}
function ensureParent(file) {
  const dir = dirname(file);
  mkdirSync(dir, {recursive: true, mode: 0o700});
  chmodSync(dir, 0o700);
}
function readJson(file) {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return record(value) ? value : null;
  } catch { return null; }
}
function writeAtomic(file, value) {
  ensureParent(file);
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(tmp, file);
    chmodSync(file, 0o600);
  } catch (error) {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { }
    }
    try { unlinkSync(tmp); } catch { }
    throw error;
  }
}
function withLock(file, run) {
  ensureParent(file);
  const lock = `${file}.lock`;
  let fd;
  try {
    fd = openSync(lock, 'wx', 0o600);
    writeFileSync(fd, `${JSON.stringify({pid: process.pid, created_at: new Date().toISOString()})}\n`);
    fsyncSync(fd);
  }
  catch (error) {
    if (error?.code === 'EEXIST') throw new Error('MODEL_ROUTE_STATE_BUSY');
    throw error;
  }
  try { return run(); }
  finally {
    try { closeSync(fd); } catch { }
    try { unlinkSync(lock); } catch { }
  }
}
function validRoot(root) {
  return record(root) && text(root.model) && text(root.source);
}
function validState(state) {
  return record(state) && state.version === 1 && supportedHarnesses.has(state.harness)
    && text(state.root_session_id) && hash(state.release_digest) && text(state.activation_id)
    && Number.isSafeInteger(state.root_generation) && state.root_generation >= 0
    && validRoot(state.root_anchor) && ['active', 'paused'].includes(state.status)
    && typeof state.critical_failure === 'boolean' && record(state.invocations);
}
function outcome(disposition, reason, extra = {}) {
  return {disposition, reason, ...extra};
}
function archiveActivation(file, state) {
  const archive = join(`${file}.history`, `${state.activation_id}.json`);
  writeAtomic(archive, {...state, archived_at: new Date().toISOString()});
}
function invalidatePending(state, reason) {
  for (const call of Object.values(state.invocations)) {
    if (record(call) && call.status === 'pending') {
      call.status = 'invalidated';
      call.invalidation_reason = reason;
    }
  }
}

export function startActivation({harness, root_session_id, root_anchor, release_digest, state_root}) {
  if (!supportedHarnesses.has(harness) || !text(root_session_id) || !validRoot(root_anchor) || !hash(release_digest)) {
    throw new TypeError('valid activation input required');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const previous = readJson(file);
    if (validState(previous)) archiveActivation(file, previous);
    const state = {
      version: 1,
      harness,
      root_session_id,
      release_digest,
      activation_id: randomUUID(),
      root_generation: 0,
      root_anchor: {model: root_anchor.model, source: root_anchor.source},
      status: 'active',
      critical_failure: false,
      invocations: {},
    };
    writeAtomic(file, state);
    return structuredClone(state);
  });
}

export function readActivation({harness, root_session_id, state_root}) {
  const file = statePath({harness, root_session_id, state_root});
  const state = readJson(file);
  return validState(state) ? structuredClone(state) : null;
}

export function pauseActivation({harness, root_session_id, state_root}) {
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    state.status = 'paused';
    invalidatePending(state, 'ACTIVATION_PAUSED');
    writeAtomic(file, state);
    return outcome('PAUSED', 'ACTIVATION_PAUSED', {activation_id: state.activation_id});
  });
}

export function updateRootAnchor({harness, root_session_id, root_anchor, state_root}) {
  if (!validRoot(root_anchor)) throw new TypeError('valid root anchor required');
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.status !== 'active') return outcome('REFUSE', 'ACTIVATION_PAUSED');
    if (state.root_anchor.model === root_anchor.model && state.root_anchor.source === root_anchor.source) {
      return outcome('UNCHANGED', 'ROOT_ANCHOR_UNCHANGED', {root_generation: state.root_generation});
    }
    invalidatePending(state, 'ROOT_GENERATION_CHANGED');
    state.root_anchor = {model: root_anchor.model, source: root_anchor.source};
    state.root_generation += 1;
    writeAtomic(file, state);
    return outcome('UPDATED', 'ROOT_ANCHOR_UPDATED', {root_generation: state.root_generation});
  });
}

export function prepareInvocation({harness, root_session_id, release_digest, route, task_id, input_sha, state_root}) {
  if (!record(route) || route.disposition !== 'READY' || !text(route.requested_model)
    || !text(route.requested_role) || !text(route.harness) || !route.harness.startsWith(`${harness}-`)
    || typeof route.critical !== 'boolean'
    || !['policy_sha', 'routing_config_sha', 'capability_evidence_sha'].every(key => hash(route[key]))
    || !hash(release_digest) || !text(task_id) || !hash(input_sha)) {
    return outcome('REFUSE', 'INVALID_INVOCATION_INPUT');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.status !== 'active') return outcome('REFUSE', 'ACTIVATION_PAUSED');
    if (state.critical_failure) return outcome('REFUSE', 'CRITICAL_FAILURE_LATCHED');
    if (release_digest !== state.release_digest) return outcome('REFUSE', 'RELEASE_MISMATCH');
    const invocation_id = randomUUID();
    const envelope = {
      release_digest: state.release_digest,
      activation_id: state.activation_id,
      root_session_id: state.root_session_id,
      root_generation: state.root_generation,
      invocation_id,
      route_id: randomUUID(),
      task_id,
      input_sha,
      requested_role: route.requested_role || route.role,
      requested_model: route.requested_model,
      route_harness: route.harness,
      critical: route.critical === true,
      policy_sha: route.policy_sha,
      routing_config_sha: route.routing_config_sha,
      capability_evidence_sha: route.capability_evidence_sha,
    };
    state.invocations[invocation_id] = {...envelope, status: 'pending'};
    writeAtomic(file, state);
    return outcome('READY', 'INVOCATION_PREPARED', {envelope});
  });
}

export function acceptInvocationEvidence({harness, root_session_id, evidence, state_root}) {
  if (!record(evidence) || !text(evidence.invocation_id)) return outcome('REFUSE', 'INVALID_EVIDENCE');
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    const call = state.invocations[evidence.invocation_id];
    if (!record(call)) return outcome('REFUSE', 'UNKNOWN_INVOCATION');
    if (call.status !== 'pending') return outcome('REFUSE', 'INVOCATION_ALREADY_CONSUMED');
    const current = evidence.release_digest === state.release_digest
      && evidence.activation_id === state.activation_id
      && evidence.root_session_id === state.root_session_id
      && evidence.root_generation === state.root_generation;
    if (!current) return outcome('REFUSE', 'STALE_INVOCATION');
    const accepted = evidence.invocation_id === call.invocation_id
      && evidence.route_id === call.route_id
      && evidence.task_id === call.task_id
      && evidence.input_sha === call.input_sha
      && evidence.requested_role === call.requested_role
      && evidence.requested_model === call.requested_model
      && evidence.route_harness === call.route_harness
      && evidence.policy_sha === call.policy_sha
      && evidence.routing_config_sha === call.routing_config_sha
      && evidence.capability_evidence_sha === call.capability_evidence_sha
      && evidence.adopted_model === call.requested_model
      && evidence.status === 'completed'
      && evidence.same_invocation_success === true
      && evidence.rerouted === false
      && evidence.fallback === false
      && text(evidence.evidence_ref);
    call.status = accepted ? 'accepted' : 'refused';
    call.evidence_ref = text(evidence.evidence_ref) ? evidence.evidence_ref : null;
    if (!accepted && call.critical) state.critical_failure = true;
    writeAtomic(file, state);
    return accepted
      ? outcome('ACCEPT', 'CURRENT_INVOCATION_VERIFIED', {critical: call.critical})
      : outcome('REFUSE', 'INVOCATION_EVIDENCE_MISMATCH', {critical_failure_latched: state.critical_failure});
  });
}

export function bindInvocationExternalIdentity({
  harness, root_session_id, invocation_id, field, value, state_root,
}) {
  if (!text(invocation_id) || !externalIdentityFields.has(field) || !text(value)) {
    return outcome('REFUSE', 'INVALID_EXTERNAL_IDENTITY');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.status !== 'active') return outcome('REFUSE', 'ACTIVATION_PAUSED');
    const call = state.invocations[invocation_id];
    if (!record(call) || call.status !== 'pending') return outcome('REFUSE', 'INVOCATION_NOT_PENDING');
    call.external_identity ||= {};
    if (text(call.external_identity[field]) && call.external_identity[field] !== value) {
      call.status = 'refused';
      call.failure_reason = 'EXTERNAL_IDENTITY_REBIND';
      if (call.critical) state.critical_failure = true;
      writeAtomic(file, state);
      return outcome('REFUSE', 'EXTERNAL_IDENTITY_REBIND', {critical_failure_latched: state.critical_failure});
    }
    // Types select a role; only tool/agent IDs identify an individual invocation.
    const duplicate = field !== 'agent_type' && Object.values(state.invocations).some(other => other !== call && record(other)
      && other.external_identity?.[field] === value);
    if (duplicate) {
      call.status = 'refused';
      call.failure_reason = 'EXTERNAL_IDENTITY_DUPLICATE';
      if (call.critical) state.critical_failure = true;
      writeAtomic(file, state);
      return outcome('REFUSE', 'EXTERNAL_IDENTITY_DUPLICATE', {critical_failure_latched: state.critical_failure});
    }
    call.external_identity[field] = value;
    writeAtomic(file, state);
    return outcome('BOUND', 'EXTERNAL_IDENTITY_BOUND', {invocation_id});
  });
}

// Explicit repair for legacy tickets left between tool-id and type binding. The native
// hook cannot have allowed a dispatch without the type; fully prepared/live tickets
// and critical failures are deliberately outside this recovery seam.
export function invalidateIncompleteNativeInvocation({
  harness, root_session_id, invocation_id, expected_activation_id, expected_call_sha, evidence_ref, state_root,
}) {
  if (!text(invocation_id) || !text(expected_activation_id) || !hash(expected_call_sha) || !text(evidence_ref)) {
    return outcome('REFUSE', 'INVALID_RECOVERY_EVIDENCE');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.status !== 'active' || state.critical_failure) return outcome('REFUSE', 'ACTIVATION_NOT_RECOVERABLE');
    const call = state.invocations[invocation_id];
    if (!record(call) || state.activation_id !== expected_activation_id
      || createHash('sha256').update(JSON.stringify(call)).digest('hex') !== expected_call_sha) {
      return outcome('REFUSE', 'RECOVERY_STATE_CHANGED');
    }
    if (call.status !== 'pending' || call.critical || call.route_harness !== 'codex-native'
      || !text(call.external_identity?.tool_use_id)
      || Object.keys(call.external_identity).some(key => key !== 'tool_use_id')) {
      return outcome('REFUSE', 'INVOCATION_NOT_RECOVERABLE');
    }
    call.status = 'invalidated';
    call.invalidation_reason = 'PRE_DISPATCH_CORRELATION_FAILED';
    call.evidence_ref = evidence_ref;
    writeAtomic(file, state);
    return outcome('INVALIDATED', 'INCOMPLETE_NATIVE_INVOCATION_INVALIDATED', {invocation_id});
  });
}

export function findInvocationByExternalIdentity({harness, root_session_id, field, value, state_root}) {
  if (!externalIdentityFields.has(field) || !text(value)) return null;
  const state = readActivation({harness, root_session_id, state_root});
  if (!state) return null;
  const matches = Object.values(state.invocations).filter(call => record(call)
    && call.external_identity?.[field] === value);
  return matches.length === 1 ? structuredClone(matches[0]) : null;
}

export function stateFileForTest(input) {
  return statePath(input);
}
