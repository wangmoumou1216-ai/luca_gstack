#!/usr/bin/env node
// Trusted lifecycle/evidence state for the shared model-only router.
// Policy chooses a role/model; this host only binds that choice to a root activation and one call.
import {createHash, randomUUID} from 'node:crypto';
import {
  chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
  renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import {dirname, join} from 'node:path';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const supportedHarnesses = new Set(['codex', 'claude']);
const supportedRouteHarnesses = new Set(['codex-native', 'codex-cli', 'claude-native', 'claude-workflow']);
const externalIdentityFields = new Set(['tool_use_id', 'agent_id', 'agent_type']);
export const MODEL_ROUTE_INTERFACE_VERSION = 'luca-model-route/v2';
export const MODEL_ROUTE_ADAPTER_CONTRACT_SHA = createHash('sha256').update([
  'explicit-model-only',
  'root-anchor-owned-by-parent',
  'same-invocation-adoption-and-completion',
  'no-reroute-no-fallback',
  'critical-failure-monotonic',
  'interrupted-review-obligations-v2',
  'native-single-use-recovery-with-retirement',
  'same-session-obligations-survive-restart',
  'native-family-message-queue-and-owner-fences',
  'exact-recovery-entry-only',
  'native-continuation-canonical-target',
  'strict-native-continuation-outcome-and-stop-replay',
  'turn-bound-interrupted-critical-continuation-recovery',
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
    // The temporary file already has the final mode. Never introduce a chmod
    // failure after committing. Persist the directory entry as well as its data.
    const directory = openSync(dirname(file), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
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
    if (fd !== undefined) {
      try { closeSync(fd); } catch { }
      try { unlinkSync(lock); } catch { }
    }
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
function validRecoveryLedger(state) {
  const calls=state.invocations,obligations=state.review_obligations,reservations=state.recovery_reservations;
  if(!Object.entries(calls).every(([id,c])=>record(c)&&c.invocation_id===id&&text(c.activation_id)
      &&Number.isSafeInteger(c.root_generation)&&c.root_generation>=0&&typeof c.critical==='boolean'
      &&['pending','accepted','refused','invalidated','interrupted'].includes(c.status)
      &&supportedRouteHarnesses.has(c.route_harness)&&hash(c.input_sha)&&text(c.requested_model)))return false;
  if(!Object.entries(state.preparations||{}).every(([id,p])=>record(p)&&p.preparation_id===id
      &&text(p.activation_id)&&text(p.task_id)&&text(p.evidence_ref)
      &&['pending','consumed','invalidated'].includes(p.status)))return false;
  if(!state.failure_records.every(f=>record(f)&&text(f.failure_id)&&['hard','coordination'].includes(f.kind)
      &&text(f.reason)&&text(f.evidence_ref)&&text(f.activation_id)&&Number.isSafeInteger(f.root_generation)))return false;
  if(state.failure_records.length&&!state.critical_failure)return false;
  if(new Set(state.failure_records.map(f=>f.failure_id)).size!==state.failure_records.length)return false;
  if(!state.activation_history.every(h=>record(h)&&text(h.activation_id)&&text(h.root_session_id)
      &&hash(h.release_digest)&&typeof h.critical_failure==='boolean'))return false;
  if(!Object.entries(obligations).every(([id,o])=>record(o)&&o.obligation_id===id
      &&['OPEN','RESERVED','RUNNING','COMPLETED','BLOCKED'].includes(o.status)
      &&calls[o.original_invocation_id]?.critical===true&&Array.isArray(o.attempts)
      &&o.attempts.includes(o.original_invocation_id)&&new Set(o.attempts).size===o.attempts.length
      &&o.attempts.every(attempt=>record(calls[attempt]))
      &&(o.descriptor_sha===null||hash(o.descriptor_sha))))return false;
  if(!Object.values(calls).every(c=>c.status!=='interrupted'||!c.critical
      ||obligations[c.recovery_obligation_id||c.invocation_id]?.attempts.includes(c.invocation_id)))return false;
  if(!Object.values(calls).every(c=>c.status!=='interrupted'||(record(c.interruption)
      &&c.interruption.invocation_id===c.invocation_id&&text(c.interruption.native_turn_id)
      &&hash(c.interruption.child_transcript_sha)&&hash(c.interruption.parent_transcript_sha)
      &&c.interruption.adopted_model===c.requested_model)))return false;
  if(!Object.entries(reservations).every(([id,r])=>record(r)&&r.recovery_id===id
      &&['reserved','consumed','invalidated'].includes(r.status)&&text(r.operation_id)&&hash(r.request_sha)
      &&text(r.activation_id)&&hash(r.release_digest)&&hash(r.policy_sha)&&hash(r.descriptor_sha)
      &&record(obligations[r.obligation_id])&&validDescriptor(r.descriptor)
      &&(r.status!=='consumed'||record(calls[r.invocation_id]))))return false;
  for(const obligation of Object.values(obligations)) {
    if(obligation.continuation_operation_id!==undefined) {
      const intent=state.resume_intents[obligation.continuation_operation_id];
      const call=calls[obligation.original_invocation_id];
      if(!record(intent)||intent.kind!=='followup_task'||intent.status!=='interrupted'
          ||intent.invocation_id!==call.invocation_id||intent.agent_id!==call.external_identity?.agent_id
          ||call.status!=='accepted'||intent.review_obligation_id!==obligation.obligation_id
          ||intent.terminal_proof?.status!=='interrupted'||!text(intent.terminal_proof.native_turn_id)
          ||intent.terminal_proof.native_turn_id===intent.child_turn_before
          ||!hash(intent.terminal_proof.child_transcript_sha)||!hash(intent.terminal_proof.parent_result_sha))return false;
    }
    const live=Object.values(reservations).filter(r=>r.obligation_id===obligation.obligation_id&&r.status==='reserved');
    const attempts=obligation.attempts.map(id=>calls[id]).filter(c=>c.recovery_obligation_id===obligation.obligation_id
      &&c.descriptor_sha===obligation.descriptor_sha&&reservations[c.recovery_id]?.status==='consumed'
      &&reservations[c.recovery_id].invocation_id===c.invocation_id);
    if(obligation.status==='RESERVED'&&(live.length!==1||live[0].descriptor_sha!==obligation.descriptor_sha))return false;
    if(obligation.status==='RUNNING'&&!attempts.some(c=>['pending','invalidated'].includes(c.status)
      ||(state.critical_failure&&c.status==='refused')))return false;
    if(obligation.status==='COMPLETED'&&!state.critical_failure
      &&!attempts.some(c=>c.status==='accepted'&&text(c.evidence_ref)))return false;
  }
  if(!Object.entries(state.resume_intents).every(([id,i])=>record(i)&&i.operation_id===id
      &&text(i.agent_id)&&record(calls[i.invocation_id])&&text(i.evidence_ref)
      &&(i.caller_session_id===undefined||text(i.caller_session_id))
      &&['pending','not_started','completed','interrupted'].includes(i.status)))return false;
  if(!Object.values(state.resume_intents).every(i=>i.kind!=='followup_task'||i.status!=='interrupted'
      ||!calls[i.invocation_id].critical||calls[i.invocation_id].status!=='accepted'
      ||obligations[i.review_obligation_id]?.continuation_operation_id===i.operation_id))return false;
  return Object.entries(state.retired_agents).every(([id,r])=>record(r)
    &&calls[r.invocation_id]?.external_identity?.agent_id===id
    &&record(obligations[r.obligation_id])&&record(reservations[r.recovery_id]));
}
function validState(state) {
  return record(state) && [1, 2].includes(state.version) && supportedHarnesses.has(state.harness)
    && text(state.root_session_id) && hash(state.release_digest) && text(state.activation_id)
    && Number.isSafeInteger(state.root_generation) && state.root_generation >= 0
    && validRoot(state.root_anchor) && ['active', 'paused'].includes(state.status)
    && typeof state.critical_failure === 'boolean' && record(state.invocations)
    && (state.preparations === undefined || record(state.preparations))
    && (state.version === 1 || (Number.isSafeInteger(state.revision) && state.revision >= 0
      && Array.isArray(state.failure_records) && Array.isArray(state.activation_history)
      && record(state.review_obligations) && record(state.recovery_reservations)
      && record(state.resume_intents) && record(state.retired_agents)&&validRecoveryLedger(state)));
}
function outcome(disposition, reason, extra = {}) {
  return {disposition, reason, ...extra};
}
function archiveActivation(file, state) {
  const archive = join(`${file}.history`, `${state.activation_id}.json`);
  writeAtomic(archive, {...state, archived_at: new Date().toISOString()});
}
function invalidatePending(state, reason) {
  for (const call of [...Object.values(state.invocations), ...Object.values(state.preparations || {})]) {
    if (record(call) && call.status === 'pending') {
      call.status = 'invalidated';
      call.invalidation_reason = reason;
    }
  }
}
function hasPendingCriticalInvocation(state) {
  return Object.values(state.invocations).some(call => record(call) && call.status === 'pending' && call.critical === true);
}
function hasPendingCriticalContinuation(state) {
  return Object.values(state.resume_intents||{}).some(intent=>intent.status==='pending'
    &&state.invocations[intent.invocation_id]?.critical===true);
}
function invalidateRecoveryReservations(state) {
  for (const reservation of Object.values(state.recovery_reservations || {})) {
    if (reservation.status !== 'reserved') continue;
    reservation.status = 'invalidated';
    reservation.invalidation_reason = 'ROOT_GENERATION_CHANGED';
    const obligation = state.review_obligations[reservation.obligation_id];
    if (obligation?.status === 'RESERVED') obligation.status = 'OPEN';
  }
}

function newState({harness, root_session_id, root_anchor, release_digest}, history = []) {
  return {version: 2, harness, root_session_id, release_digest, activation_id: randomUUID(),
    root_generation: 0, root_anchor: {...root_anchor}, status: 'active', critical_failure: false,
    invocations: {}, preparations: {}, revision: 0, failure_records: [],
    activation_history: history, review_obligations: {}, recovery_reservations: {},
    resume_intents: {}, retired_agents: {}};
}
function unresolvedWork(state) {
  return Object.values(state.invocations).some(call => call.status === 'pending'
      || (call.critical && !(state.version===2?['accepted','interrupted']:['accepted']).includes(call.status)))
    || Object.values(state.preparations || {}).some(ticket => ['pending', 'invalidated'].includes(ticket.status))
    || Object.values(state.review_obligations || {}).some(item => item.status !== 'COMPLETED')
    || Object.values(state.resume_intents || {}).some(item => item.status === 'pending');
}
function rememberFailure(state, reason, evidence_ref, invocation_id = null, kind = 'hard') {
  state.critical_failure = true;
  state.critical_failure_evidence ||= {reason, evidence_ref};
  if (state.version !== 2) return;
  if (!state.failure_records.some(item => item.reason === reason && item.evidence_ref === evidence_ref
      && item.invocation_id === invocation_id && item.root_generation === state.root_generation)) {
    state.failure_records.push({failure_id: randomUUID(), kind, reason, evidence_ref, invocation_id,
      activation_id: state.activation_id, root_generation: state.root_generation});
  }
}
function commitState(file, state) {
  if (state.version === 2) { state.revision += 1; state.last_operation_id = randomUUID(); }
  try { writeAtomic(file, state); }
  catch (error) {
    // A failure after rename is an unknown commit until the exact operation is
    // read back. Never retry it as a new transaction or delete another lock.
    const committed = readJson(file);
    if (!state.last_operation_id || committed?.last_operation_id !== state.last_operation_id
        || JSON.stringify(committed) !== JSON.stringify(state)) throw error;
  }
}

// All dispatch consumers share the same obligation decision. The runner applies
// serial-critical checking at entry; its own internal parallelism is unchanged.
export function dispatchAdmission(state, {route_harness = 'codex-native', preparation_id,
  recovery_id, release_digest} = {}) {
  if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
  if (state.status !== 'active') return outcome('REFUSE', 'ACTIVATION_PAUSED');
  if (state.critical_failure) return outcome('REFUSE', 'CRITICAL_FAILURE_LATCHED');
  if (release_digest && state.release_digest !== release_digest) return outcome('REFUSE', 'RELEASE_MISMATCH');
  if (Object.values(state.preparations || {}).some(p => p.status === 'pending' && !(text(preparation_id) && p.preparation_id === preparation_id))) {
    return outcome('NEEDS_CONTEXT', 'UNRESOLVED_CRITICAL_PREPARATION');
  }
  if (route_harness === 'codex-native' && hasPendingCriticalInvocation(state)) {
    return outcome('NEEDS_CONTEXT', 'UNRESOLVED_CRITICAL_INVOCATION');
  }
  if (hasPendingCriticalContinuation(state)) {
    return outcome('NEEDS_CONTEXT', 'NATIVE_CONTINUATION_PENDING');
  }
  const open = Object.values(state.review_obligations || {}).filter(o => o.status !== 'COMPLETED');
  if (open.length) {
    const reservation = state.recovery_reservations?.[recovery_id];
    if (route_harness !== 'codex-native' || open.length !== 1 || !reservation
        || reservation.status !== 'reserved' || open[0].status !== 'RESERVED'
        || open[0].obligation_id !== reservation.obligation_id
        || reservation.activation_id !== state.activation_id
        || reservation.root_generation !== state.root_generation
        || reservation.release_digest !== state.release_digest) {
      return outcome('NEEDS_CONTEXT', 'UNRESOLVED_REVIEW_OBLIGATION');
    }
  } else if (recovery_id) return outcome('REFUSE', 'UNKNOWN_RECOVERY_RESERVATION');
  return outcome('READY', 'DISPATCH_ADMITTED');
}

export function startActivation({harness, root_session_id, root_anchor, release_digest, state_root}) {
  if (!supportedHarnesses.has(harness) || !text(root_session_id) || !validRoot(root_anchor) || !hash(release_digest)) {
    throw new TypeError('valid activation input required');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const previous = readJson(file);
    if (existsSync(file) && !validState(previous)) throw new Error('MODEL_ROUTE_INVALID_ACTIVATION');
    if(previous && (previous.harness!==harness || previous.root_session_id!==root_session_id))throw new Error('ACTIVATION_IDENTITY_MISMATCH');
    if (previous?.version === 1 && (previous.critical_failure || unresolvedWork(previous))) {
      throw new Error('LEGACY_RECOVERY_NEEDS_CONTEXT');
    }
    if (previous?.version === 2 && previous.release_digest === release_digest) {
      // Starting or resuming a native turn does not discharge its review work.
      if (previous.root_anchor.model !== root_anchor.model) {
        if (hasPendingCriticalInvocation(previous)
            || Object.values(previous.preparations).some(p => p.status === 'pending')
            || Object.values(previous.review_obligations).some(o => o.status !== 'COMPLETED')
            || hasPendingCriticalContinuation(previous)) rememberFailure(previous,
          'ROOT_ANCHOR_CHANGED_WITH_UNRESOLVED_CRITICAL_WORK',
          `root-anchor-change:${previous.activation_id}:${previous.root_generation}->${previous.root_generation + 1}`,
          null, 'coordination');
        invalidatePending(previous, 'ROOT_GENERATION_CHANGED');
        invalidateRecoveryReservations(previous);
        previous.root_generation += 1;
      }
      previous.root_anchor = {...root_anchor};
      previous.status = 'active';
      commitState(file, previous);
      return structuredClone(previous);
    }
    if (previous && (previous.critical_failure || unresolvedWork(previous))) {
      throw new Error('RELEASE_CHANGE_WITH_UNRESOLVED_WORK');
    }
    const history = previous ? [...(previous.activation_history || []),
      {...previous, activation_history: undefined}] : [];
    const state = newState({harness, root_session_id, root_anchor, release_digest}, history);
    commitState(file, state);
    return structuredClone(state);
  });
}

export function readActivation({harness, root_session_id, state_root}) {
  const file = statePath({harness, root_session_id, state_root});
  const state = readJson(file);
  if (state && state.preparations !== undefined && !record(state.preparations)) {
    throw new Error('MODEL_ROUTE_INVALID_ACTIVATION');
  }
  return validState(state) ? structuredClone(state) : null;
}

// A trusted native adapter may have missed SessionStart because its Hook was
// unavailable. Recover under the same state lock; never overwrite another
// dispatch or clear an unresolved obligation after checking a stale snapshot.
export function recoverActivation({harness, root_session_id, root_anchor, release_digest,
  expected_activation_id = null, expected_root_generation, state_root}) {
  if (!supportedHarnesses.has(harness) || !text(root_session_id) || !validRoot(root_anchor)
      || !hash(release_digest) || (expected_activation_id !== null && !text(expected_activation_id))) {
    throw new TypeError('valid recovery input required');
  }
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const previous = readJson(file);
    if (previous !== null || existsSync(file)) {
      if (!validState(previous)) return outcome('REFUSE', 'INVALID_ACTIVATION');
      if (previous.harness !== harness || previous.root_session_id !== root_session_id) {
        return outcome('REFUSE', 'ACTIVATION_IDENTITY_MISMATCH');
      }
      if (previous.release_digest !== release_digest) return outcome('REFUSE', 'RELEASE_MISMATCH');
      if (previous.status === 'active') {
        return outcome('UNCHANGED', 'ACTIVATION_ALREADY_ACTIVE', {state: structuredClone(previous)});
      }
      if (previous.activation_id !== expected_activation_id
          || previous.root_generation !== expected_root_generation) {
        return outcome('REFUSE', 'ACTIVATION_STATE_CHANGED');
      }
      if (previous.critical_failure) return outcome('REFUSE', 'CRITICAL_FAILURE_LATCHED');
      if (Object.values(previous.invocations).some(call => call.status === 'pending'
          || (call.critical === true && call.status !== 'accepted'))) {
        return outcome('REFUSE', 'UNRESOLVED_INVOCATION');
      }
      if (Object.values(previous.preparations || {}).some(call => call.status === 'pending'
          || call.status === 'invalidated')) {
        return outcome('REFUSE', 'UNRESOLVED_CRITICAL_PREPARATION');
      }
      if (previous.root_anchor.model !== root_anchor.model) previous.root_generation += 1;
      previous.root_anchor = {model: root_anchor.model, source: root_anchor.source};
      previous.status = 'active';
      commitState(file, previous);
      return outcome('RECOVERED', 'ACTIVATION_RESUMED', {state: structuredClone(previous)});
    }
    if (expected_activation_id !== null) return outcome('REFUSE', 'ACTIVATION_STATE_CHANGED');
    const state = newState({harness, root_session_id, release_digest, root_anchor});
    commitState(file, state);
    return outcome('RECOVERED', 'ACTIVATION_CREATED', {state: structuredClone(state)});
  });
}

// Reserve a durable intent before a trusted adapter reads bindings or resolves a
// critical model choice. An unavailable reservation authorizes no routing work.
export function beginCriticalPreparation({
  harness, root_session_id, expected_activation_id, expected_root_generation,
  critical, task_id, evidence_ref, route_harness, recovery_id, state_root,
}) {
  if (critical === false) return outcome('UNCHANGED', 'NONCRITICAL_PREPARATION');
  if (critical !== true || !supportedHarnesses.has(harness) || !text(root_session_id)
    || !text(expected_activation_id) || !Number.isSafeInteger(expected_root_generation) || expected_root_generation < 0
    || !text(task_id) || !text(evidence_ref)
    || (route_harness !== undefined && (!supportedRouteHarnesses.has(route_harness) || !route_harness.startsWith(`${harness}-`)))) {
    return outcome('REFUSE', 'INVALID_PREPARATION_INPUT');
  }
  const file = statePath({harness, root_session_id, state_root});
  if (!validState(readJson(file))) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.activation_id !== expected_activation_id || state.root_generation !== expected_root_generation) {
      return outcome('REFUSE', 'ACTIVATION_STATE_CHANGED');
    }
    const admission = dispatchAdmission(state, {route_harness:route_harness || `${harness}-workflow`, recovery_id});
    if (admission.disposition !== 'READY') return admission;
    const preparation_id = randomUUID();
    state.preparations ||= {};
    state.preparations[preparation_id] = {preparation_id, activation_id: state.activation_id,
      root_generation: state.root_generation, task_id, evidence_ref, status: 'pending',
      ...(route_harness !== undefined ? {route_harness} : {}), ...(recovery_id ? {recovery_id} : {})};
    commitState(file, state);
    return outcome('READY', 'CRITICAL_PREPARATION_RESERVED', {preparation_id});
  });
}

// Trusted adapters call this when canonical critical dispatch fails before a ticket
// exists, or when evidence I/O fails. Bind to their captured activation/generation;
// a later activation must never inherit an earlier dispatch's failure.
export function latchCriticalFailure({
  harness, root_session_id, expected_activation_id, expected_root_generation,
  critical, reason, evidence_ref, invocation_id = null, state_root,
}) {
  if (critical === false) return outcome('UNCHANGED', 'NONCRITICAL_FAILURE');
  if (critical !== true || !supportedHarnesses.has(harness) || !text(root_session_id)
    || !text(expected_activation_id) || !Number.isSafeInteger(expected_root_generation) || expected_root_generation < 0
    || !text(reason) || !text(evidence_ref) || (invocation_id !== null && !text(invocation_id))) return outcome('REFUSE', 'INVALID_FAILURE_INPUT');
  const file = statePath({harness, root_session_id, state_root});
  // Missing state is not an invitation to create an activation or its directory.
  if (!validState(readJson(file))) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    if (state.activation_id !== expected_activation_id || state.root_generation !== expected_root_generation) {
      return outcome('REFUSE', 'ACTIVATION_STATE_CHANGED');
    }
    const alreadyLatched = state.critical_failure;
    if (invocation_id !== null && !record(state.invocations[invocation_id])) return outcome('REFUSE','UNKNOWN_INVOCATION');
    rememberFailure(state, reason, evidence_ref, invocation_id);
    invalidatePending(state, 'CRITICAL_FAILURE_LATCHED');
    commitState(file, state);
    return outcome(alreadyLatched ? 'UNCHANGED' : 'LATCHED', 'CRITICAL_FAILURE_LATCHED', {critical_failure_latched: true});
  });
}

export function pauseActivation({harness, root_session_id, state_root}) {
  const file = statePath({harness, root_session_id, state_root});
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT', 'INVALID_ACTIVATION');
    state.status = 'paused';
    if (state.version === 1) invalidatePending(state, 'ACTIVATION_PAUSED');
    commitState(file, state);
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
    const unresolvedCritical = Object.values(state.preparations || {}).some(ticket => record(ticket) && ticket.status === 'pending')
      || Object.values(state.review_obligations || {}).some(o => o.status !== 'COMPLETED')
      || hasPendingCriticalContinuation(state)
      || Object.values(state.invocations).some(call => record(call) && call.status === 'pending' && call.critical === true);
    if (unresolvedCritical) {
      rememberFailure(state, 'ROOT_ANCHOR_CHANGED_WITH_UNRESOLVED_CRITICAL_WORK',
        `root-anchor-change:${state.activation_id}:${state.root_generation}->${state.root_generation + 1}`,
        null, 'coordination');
    }
    invalidatePending(state, 'ROOT_GENERATION_CHANGED');
    invalidateRecoveryReservations(state);
    state.root_anchor = {model: root_anchor.model, source: root_anchor.source};
    state.root_generation += 1;
    commitState(file, state);
    return outcome('UPDATED', 'ROOT_ANCHOR_UPDATED', {root_generation: state.root_generation});
  });
}

export function prepareInvocation({harness, root_session_id, release_digest, route, task_id, input_sha, preparation_id, recovery_id, state_root}) {
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
    const admission = dispatchAdmission(state, {route_harness:route.harness, preparation_id, recovery_id, release_digest});
    if (admission.disposition !== 'READY') return admission;
    const reservation = recovery_id ? state.recovery_reservations[recovery_id] : null;
    if (reservation && (!route.critical || route.requested_role !== 'peak'
        || route.policy_sha !== reservation.policy_sha)) return outcome('REFUSE','RECOVERY_ROUTE_MISMATCH');
    let preparation = null;
    if (preparation_id !== undefined) {
      preparation = text(preparation_id) ? state.preparations?.[preparation_id] : null;
      if (!record(preparation)) return outcome('REFUSE', 'UNKNOWN_PREPARATION');
      if (preparation.status !== 'pending') return outcome('REFUSE', 'PREPARATION_ALREADY_CONSUMED');
      if (!route.critical || preparation.activation_id !== state.activation_id
        || preparation.root_generation !== state.root_generation || preparation.task_id !== task_id
        || (preparation.route_harness !== undefined && preparation.route_harness !== route.harness)
        || preparation.recovery_id !== recovery_id) {
        return outcome('REFUSE', 'PREPARATION_BINDING_MISMATCH');
      }
    }
    if (Object.values(state.preparations || {}).some(ticket => record(ticket)
      && ticket.status === 'pending' && ticket !== preparation)) {
      return outcome('NEEDS_CONTEXT', 'UNRESOLVED_CRITICAL_PREPARATION');
    }
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
    if (reservation) {
      envelope.recovery_id = recovery_id;
      envelope.recovery_obligation_id = reservation.obligation_id;
      envelope.descriptor_sha = reservation.descriptor_sha;
      reservation.status = 'consumed'; reservation.invocation_id = invocation_id;
      const obligation = state.review_obligations[reservation.obligation_id];
      obligation.status = 'RUNNING'; obligation.attempts.push(invocation_id);
    }
    state.invocations[invocation_id] = {...envelope, status: 'pending'};
    if (preparation) {
      preparation.status = 'consumed';
      preparation.invocation_id = invocation_id;
    }
    commitState(file, state);
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
    if (state.status !== 'active') return outcome('REFUSE', 'ACTIVATION_PAUSED');
    if (call.status !== 'pending') return outcome('REFUSE', 'INVOCATION_ALREADY_CONSUMED');
    const current = evidence.release_digest === state.release_digest
      && evidence.activation_id === state.activation_id
      && evidence.root_session_id === state.root_session_id
      && evidence.root_generation === state.root_generation;
    if (!current) return outcome('REFUSE', 'STALE_INVOCATION');
    let accepted = evidence.invocation_id === call.invocation_id
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
    if (call.recovery_id) {
      const reservation = state.recovery_reservations[call.recovery_id], report = evidence.review_report;
      const criteria = reservation?.descriptor.criteria || [];
      accepted &&= reservation?.status === 'consumed' && reservation.invocation_id === call.invocation_id
        && report?.descriptor_sha === call.descriptor_sha && Array.isArray(report.criteria)
        && report.criteria.length === criteria.length
        && new Set(report.criteria.map(c => c.id)).size === criteria.length
        && criteria.every(expected => report.criteria.some(actual => actual.id === expected.id
          && ['PASS','FAIL','UNKNOWN'].includes(actual.status) && text(actual.evidence)));
      state.review_obligations[call.recovery_obligation_id].status = accepted ? 'COMPLETED' : 'BLOCKED';
    }
    call.status = accepted ? 'accepted' : 'refused';
    call.evidence_ref = text(evidence.evidence_ref) ? evidence.evidence_ref : null;
    if (accepted && hash(evidence.native_observation_sha)) call.native_observation_sha = evidence.native_observation_sha;
    if (!accepted && call.critical) rememberFailure(state, 'INVOCATION_EVIDENCE_MISMATCH',
      call.evidence_ref || `invocation:${call.invocation_id}`, call.invocation_id);
    commitState(file, state);
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
      if (call.critical) rememberFailure(state, 'EXTERNAL_IDENTITY_REBIND',
        `external-identity:${field}:${value}`, call.invocation_id);
      commitState(file, state);
      return outcome('REFUSE', 'EXTERNAL_IDENTITY_REBIND', {critical_failure_latched: state.critical_failure});
    }
    // Types select a role; only tool/agent IDs identify an individual invocation.
    const duplicate = field !== 'agent_type' && Object.values(state.invocations).some(other => other !== call && record(other)
      && other.external_identity?.[field] === value);
    if (duplicate) {
      call.status = 'refused';
      call.failure_reason = 'EXTERNAL_IDENTITY_DUPLICATE';
      if (call.critical) rememberFailure(state, 'EXTERNAL_IDENTITY_DUPLICATE',
        `external-identity:${field}:${value}`, call.invocation_id);
      commitState(file, state);
      return outcome('REFUSE', 'EXTERNAL_IDENTITY_DUPLICATE', {critical_failure_latched: state.critical_failure});
    }
    call.external_identity[field] = value;
    commitState(file, state);
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
    commitState(file, state);
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

const invocationFields = ['release_digest','activation_id','root_session_id','root_generation',
  'invocation_id','route_id','task_id','input_sha','requested_role','requested_model','route_harness',
  'policy_sha','routing_config_sha','capability_evidence_sha'];
function withRecoveryState(input, run) {
  const file = statePath(input);
  return withLock(file, () => {
    const state = readJson(file);
    if (!validState(state)) return outcome('NEEDS_CONTEXT','INVALID_ACTIVATION');
    if (state.version !== 2) return outcome('NEEDS_CONTEXT','LEGACY_RECOVERY_NEEDS_CONTEXT');
    return run(state, file);
  });
}
export function activationContentSha(input) {
  return createHash('sha256').update(readFileSync(statePath(input))).digest('hex');
}
// Only the native adapter classifies transcripts; this API checks that its
// evidence describes precisely the bound invocation, never a user terminal flag.
export function recordInvocationInterruption({...input}) {
  const evidence = input.evidence;
  return withRecoveryState(input, (state, file) => {
    const call = state.invocations[evidence?.invocation_id];
    if (!call || call.route_harness !== 'codex-native' || !call.critical) {
      return outcome('REFUSE','INTERRUPTION_NOT_CRITICAL_NATIVE');
    }
    const identity = call.external_identity || {};
    const valid = invocationFields.every(key => evidence[key] === call[key])
      && evidence.status === 'interrupted' && evidence.adopted_model === call.requested_model
      && evidence.agent_id === identity.agent_id && evidence.tool_use_id === identity.tool_use_id
      && evidence.agent_type === identity.agent_type && text(evidence.native_turn_id)
      && hash(evidence.parent_transcript_sha) && hash(evidence.child_transcript_sha)
      && text(evidence.evidence_ref);
    if (!valid) {
      rememberFailure(state,'INTERRUPTION_EVIDENCE_MISMATCH',evidence?.evidence_ref || 'missing-interruption-evidence',call.invocation_id);
      commitState(file,state); return outcome('REFUSE','INTERRUPTION_EVIDENCE_MISMATCH');
    }
    if (call.status === 'interrupted') {
      return call.interruption.native_turn_id === evidence.native_turn_id
        && call.interruption.child_transcript_sha === evidence.child_transcript_sha
        ? outcome('UNCHANGED','INTERRUPTION_ALREADY_RECORDED') : outcome('REFUSE','INTERRUPTION_EVIDENCE_CHANGED');
    }
    if (call.status !== 'pending' && !(call.status === 'invalidated'
        && ['ROOT_GENERATION_CHANGED','ACTIVATION_PAUSED'].includes(call.invalidation_reason))) {
      return outcome('REFUSE','INVOCATION_NOT_INTERRUPTIBLE');
    }
    call.status = 'interrupted';
    call.interruption = structuredClone(evidence);
    const obligation_id = call.recovery_obligation_id || call.invocation_id;
    const obligation = state.review_obligations[obligation_id] ||= {
      obligation_id, original_invocation_id:call.invocation_id, status:'OPEN', attempts:[], descriptor_sha:null};
    obligation.status = state.failure_records.some(f => f.kind === 'hard') ? 'BLOCKED' : 'OPEN';
    if (!obligation.attempts.includes(call.invocation_id)) obligation.attempts.push(call.invocation_id);
    commitState(file,state);
    return outcome('INTERRUPTED','REVIEW_REMAINS_REQUIRED',{obligation_id});
  });
}
function validDescriptor(descriptor) {
  return record(descriptor) && descriptor.schema_version === 1 && descriptor.read_only === true
    && descriptor.agent_type === 'quality-gate' && descriptor.fork_turns === 'none'
    && Array.isArray(descriptor.files) && descriptor.files.length > 0
    && descriptor.files.every(f => text(f.path) && f.path.startsWith('/') && hash(f.sha256))
    && new Set(descriptor.files.map(f => f.path)).size === descriptor.files.length
    && Array.isArray(descriptor.criteria) && descriptor.criteria.length > 0
    && descriptor.criteria.every(c => text(c.id) && text(c.text))
    && new Set(descriptor.criteria.map(c => c.id)).size === descriptor.criteria.length
    && text(descriptor.authorization_ref);
}
export function reserveReviewRecovery(input) {
  if (!hash(input.expected_state_sha) || !hash(input.descriptor_sha) || !validDescriptor(input.descriptor)
      || !text(input.operation_id) || !text(input.authorization_ref) || !hash(input.policy_sha)
      || typeof input.verifyNativeEvidence !== 'function') return outcome('REFUSE','INVALID_RECOVERY_REQUEST');
  const request_sha = createHash('sha256').update(JSON.stringify({operation_id:input.operation_id,
    descriptor_sha:input.descriptor_sha,obligation_id:input.obligation_id,authorization_ref:input.authorization_ref,
    release_digest:input.release_digest,policy_sha:input.policy_sha})).digest('hex');
  return withRecoveryState(input,(original,file) => {
    // The callback rereads canonical native prefixes and frozen files under this
    // root's lock. It is supplied by code, not accepted from controller JSON.
    input.verifyNativeEvidence(original);
    const prior = Object.values(original.recovery_reservations).find(r => r.operation_id === input.operation_id);
    if (prior) return prior.request_sha === request_sha
      ? outcome('RESERVED','RECOVERY_ALREADY_RESERVED',{reservation:structuredClone(prior)})
      : outcome('REFUSE','RECOVERY_OPERATION_REUSED');
    if (activationContentSha(input) !== input.expected_state_sha) return outcome('REFUSE','RECOVERY_STATE_CHANGED');
    if (original.release_digest !== input.release_digest) return outcome('REFUSE','RELEASE_MISMATCH');
    const obligations = Object.values(original.review_obligations).filter(o => o.status !== 'COMPLETED');
    const obligation = original.review_obligations[input.obligation_id];
    if (obligations.length !== 1 || !obligation || obligation.status !== 'OPEN') {
      return outcome('REFUSE','RECOVERY_OBLIGATION_NOT_OPEN');
    }
    if (obligation.descriptor_sha && obligation.descriptor_sha !== input.descriptor_sha) {
      return outcome('REFUSE','RECOVERY_DESCRIPTOR_CHANGED');
    }
    if (Object.values(original.resume_intents).some(i => i.status === 'pending')) {
      return outcome('REFUSE','NATIVE_CONTINUATION_PENDING');
    }
    if (Object.values(original.invocations).some(c => c.critical && !['accepted','interrupted'].includes(c.status))
        || Object.values(original.preparations).some(p => ['pending','invalidated'].includes(p.status))) {
      return outcome('REFUSE','UNRESOLVED_CRITICAL_WORK');
    }
    let state = original;
    if (state.critical_failure) {
      if (!state.failure_records.length || state.failure_records.some(f => f.kind !== 'coordination'
          || f.reason !== 'ROOT_ANCHOR_CHANGED_WITH_UNRESOLVED_CRITICAL_WORK')) {
        return outcome('REFUSE','CRITICAL_FAILURE_LATCHED');
      }
      // The failed activation stays in the same atomic record. Its successor
      // inherits the open obligation, so normal dispatch is still impossible.
      state = newState(original,[...original.activation_history,{...original,activation_history:undefined}]);
      for (const key of ['invocations','review_obligations','recovery_reservations','resume_intents','retired_agents']) {
        state[key] = structuredClone(original[key]);
      }
      state.revision = original.revision;
    }
    state.status = 'active';
    const recovery_id = randomUUID();
    const reservation = {recovery_id, operation_id:input.operation_id, request_sha,
      obligation_id:obligation.obligation_id, root_session_id:state.root_session_id,
      activation_id:state.activation_id, root_generation:state.root_generation,
      release_digest:state.release_digest, policy_sha:input.policy_sha,
      descriptor:structuredClone(input.descriptor), descriptor_sha:input.descriptor_sha,
      authorization_ref:input.authorization_ref, descriptor_path:input.descriptor_path,
      authorization_path:input.authorization_path, status:'reserved',
      task_name:'review_recovery_'+recovery_id.replaceAll('-','')};
    state.recovery_reservations[recovery_id] = reservation;
    const activeObligation = state.review_obligations[obligation.obligation_id];
    activeObligation.status = 'RESERVED'; activeObligation.descriptor_sha = input.descriptor_sha;
    for (const id of activeObligation.attempts) {
      const call = state.invocations[id];
      const continuation=activeObligation.continuation_operation_id&&id===activeObligation.original_invocation_id
        ? state.resume_intents[activeObligation.continuation_operation_id] : null;
      if (!call?.external_identity?.agent_id || (call.status !== 'interrupted'&&!continuation)) return outcome('REFUSE','INTERRUPTED_IDENTITY_MISSING');
      call.retired_by_recovery_id = recovery_id;
      if(continuation)call.retired_native_turn_id=continuation.terminal_proof.native_turn_id;
      state.retired_agents[call.external_identity.agent_id] = {invocation_id:id,obligation_id:obligation.obligation_id,recovery_id};
    }
    commitState(file,state);
    return outcome('RESERVED','REVIEW_RECOVERY_RESERVED',{reservation:structuredClone(reservation)});
  });
}
export function beginNativeContinuation(input) {
  if (!text(input.agent_id) || !text(input.operation_id) || !text(input.evidence_ref)) {
    return outcome('REFUSE','INVALID_CONTINUATION_IDENTITY');
  }
  return withRecoveryState(input,(state,file) => {
    if (state.retired_agents[input.agent_id]) return outcome('REFUSE','RETIRED_REVIEW_AGENT');
    const call = Object.values(state.invocations).find(c => c.external_identity?.agent_id === input.agent_id);
    if (!call) return outcome('REFUSE','UNKNOWN_CONTINUATION_TARGET');
    if(Object.values(state.review_obligations).some(o=>o.original_invocation_id===call.invocation_id
        &&o.continuation_operation_id&&o.status!=='COMPLETED'))return outcome('REFUSE','UNRESOLVED_REVIEW_OBLIGATION');
    const prior = state.resume_intents[input.operation_id];
    if (prior) return prior.agent_id === input.agent_id ? outcome('READY','CONTINUATION_ALREADY_RESERVED')
      : outcome('REFUSE','CONTINUATION_OPERATION_REUSED');
    if(call.critical&&input.kind==='followup_task'&&Object.values(state.resume_intents).some(i=>
        i.agent_id===input.agent_id&&i.kind==='followup_task'&&i.status==='pending')) {
      return outcome('REFUSE','NATIVE_CONTINUATION_PENDING');
    }
    state.resume_intents[input.operation_id] = {operation_id:input.operation_id,agent_id:input.agent_id,
      caller_session_id:input.caller_session_id||input.root_session_id,
      invocation_id:call.invocation_id,evidence_ref:input.evidence_ref,native_call_id:input.native_call_id,
      child_turn_before:input.child_turn_before,child_event_count_before:input.child_event_count_before,
      native_prefix_sha:input.native_prefix_sha,native_prefix_length:input.native_prefix_length,
      kind:input.kind,status:'pending'};
    commitState(file,state); return outcome('READY','CONTINUATION_INTENT_RESERVED');
  });
}

// The adapter rereads both native transcripts while the root lock is held. A
// queued message, tool return, or elapsed time alone does not end child activity.
export function settleNativeContinuation(input) {
  if (!text(input.operation_id) || !text(input.native_call_id) || !text(input.evidence_ref)
      || typeof input.verifyNativeEvidence !== 'function') return outcome('REFUSE','INVALID_CONTINUATION_EVIDENCE');
  return withRecoveryState(input,(state,file) => {
    const intent=state.resume_intents[input.operation_id];
    if (!intent || intent.native_call_id !== input.native_call_id) return outcome('REFUSE','CONTINUATION_IDENTITY_MISMATCH');
    const proof=input.verifyNativeEvidence(intent);
    if (!record(proof) || !['completed','interrupted'].includes(proof.status) || !text(proof.native_turn_id)
        || !hash(proof.child_transcript_sha) || !hash(proof.parent_result_sha)
        || (intent.kind === 'followup_task' && proof.native_turn_id === intent.child_turn_before)) {
      return outcome('REFUSE','INVALID_CONTINUATION_EVIDENCE');
    }
    if (intent.status !== 'pending') return JSON.stringify(intent.terminal_proof) === JSON.stringify(proof)
      ? outcome('UNCHANGED','CONTINUATION_ALREADY_CLOSED') : outcome('REFUSE','CONTINUATION_EVIDENCE_CHANGED');
    intent.status=proof.status;
    intent.terminal_proof=structuredClone(proof);
    intent.terminal_evidence_ref=input.evidence_ref;
    const call=state.invocations[intent.invocation_id];
    // A completed first turn does not satisfy an interrupted later review turn.
    if(intent.kind==='followup_task'&&proof.status==='interrupted'&&call.critical&&call.status==='accepted') {
      const obligation_id='continuation:'+intent.operation_id;
      intent.review_obligation_id=obligation_id;
      state.review_obligations[obligation_id]={obligation_id,original_invocation_id:call.invocation_id,
        continuation_operation_id:intent.operation_id,status:state.failure_records.some(f=>f.kind==='hard')?'BLOCKED':'OPEN',
        attempts:[call.invocation_id],descriptor_sha:null};
    }
    commitState(file,state);
    return outcome('CLOSED','NATIVE_CONTINUATION_TERMINATED');
  });
}

// A native, attributed pre-effect denial can close an intent. Elapsed time,
// user-supplied booleans, and a missing tool result cannot close it.
export function settleDeniedNativeContinuation(input) {
  if (!text(input.operation_id) || !text(input.native_call_id) || !text(input.evidence_ref)
      || typeof input.verifyNativeEvidence !== 'function') return outcome('REFUSE','INVALID_CONTINUATION_EVIDENCE');
  return withRecoveryState(input,(state,file) => {
    const intent=state.resume_intents[input.operation_id];
    if(!intent||intent.native_call_id!==input.native_call_id)return outcome('REFUSE','CONTINUATION_IDENTITY_MISMATCH');
    input.verifyNativeEvidence(intent);
    if(intent.status==='not_started')return outcome('UNCHANGED','CONTINUATION_ALREADY_CLOSED');
    if(intent.status!=='pending')return outcome('REFUSE','CONTINUATION_NOT_PENDING');
    intent.status='not_started';intent.terminal_evidence_ref=input.evidence_ref;
    commitState(file,state);return outcome('CLOSED','CONTINUATION_DENIED_BEFORE_EFFECT');
  });
}
