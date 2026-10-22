#!/usr/bin/env node
// Codex-native adapter for the shared model-only route policy.
import {createHash} from 'node:crypto';
import {realpathSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, dirname, isAbsolute, relative, resolve as resolvePath} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  modelRoutingPolicyDigest, resolve as resolveModelRoute, resolveDispatchScene,
} from '../scripts/model-route.mjs';
import {
  acceptInvocationEvidence, bindInvocationExternalIdentity, findInvocationByExternalIdentity,
  pauseActivation, prepareInvocation, readActivation, releaseDigestForPolicy, startActivation,
  updateRootAnchor, latchCriticalFailure, beginCriticalPreparation, recoverActivation,
  dispatchAdmission, recordInvocationInterruption, reserveReviewRecovery, beginNativeContinuation,
  settleDeniedNativeContinuation, settleNativeContinuation,
} from '../scripts/model-route-host.mjs';
import {
  bindCodexChildProject,
  prepareCodexChildProject,
  revokeCodexChildProjectActivation,
} from '../.claude/hooks/lib/codex-child-project.mjs';
import {withoutLocalGitEnv} from '../.claude/hooks/lib/git-env.mjs';
import {readHostLaunchSourceScope} from '../.claude/hooks/lib/event-attestation.mjs';
import {recoveryCommand, readRecoveryDescriptor, attestCurrentNativeCall, parseRecoveryReport,
  verifyRecoveryRegistration, digest} from '../scripts/codex-review-recovery.mjs';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_MODE = process.env.NODE_ENV === 'test';
const testOverride = name => TEST_MODE && process.env[name] ? process.env[name] : null;
const POLICY_PATH = testOverride('LUCA_MODEL_ROUTE_POLICY_PATH')
  || resolvePath(ROOT, '.claude/skill-os/model-routing.yaml');
const BINDINGS_PATH = testOverride('LUCA_MODEL_ROUTE_BINDINGS_PATH')
  || '/Users/luca/.luca/model-routing-bindings.json';
const STATE_ROOT = testOverride('LUCA_MODEL_ROUTE_STATE_ROOT') || undefined;
const TRANSCRIPT_ROOT = testOverride('LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT')
  || resolvePath(homedir(), '.codex', 'sessions');
// Codex 0.155.1 normalizes the collaboration namespace out of runtime tool names.
const SPAWN_TOOLS = new Set([
  'agent', 'spawn_agent', 'collaboration__spawn_agent', 'collaborationspawn_agent',
]);

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const json = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const deny = reason => ({hookSpecificOutput: {
  hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason,
}});
const allow = updatedInput => ({hookSpecificOutput: {
  hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput,
}});
function modelOnly(value) {
  if (Array.isArray(value)) return value.map(modelOnly);
  if (!record(value)) return value;
  return Object.fromEntries(Object.keys(value).sort()
    .filter(key => !/effort/i.test(key) && key !== 'model')
    .map(key => [key, modelOnly(value[key])]));
}
const inputDigest = value => createHash('sha256').update(JSON.stringify(modelOnly(value))).digest('hex');

function readPolicy() {
  const loaded = spawnSync('python3', ['-P', '-c',
    'import json,sys,yaml;d=yaml.safe_load(open(sys.argv[1]));print(json.dumps(d.get("model_routing")))',
    POLICY_PATH], {encoding: 'utf8', timeout: 5000,
    env: {...process.env, PYTHONPATH: ''}});
  if (loaded.status !== 0) throw new Error('POLICY_UNREADABLE');
  const policy = JSON.parse(loaded.stdout);
  if (!policy || policy.version !== 2 || policy.scope !== 'common' || policy.status !== 'active') {
    throw new Error('POLICY_NOT_ACTIVE');
  }
  return policy;
}
function readBindings() {
  const parsed = JSON.parse(readFileSync(BINDINGS_PATH, 'utf8'));
  const binding = parsed?.schema_version === 1 ? parsed?.harnesses?.codex : null;
  if (!binding || !text(binding.peak_model) || !text(binding.light_model)
    || !Array.isArray(binding.approved_order)) throw new Error('BINDINGS_INVALID');
  return binding;
}
function releaseFor(policy) {
  return releaseDigestForPolicy(modelRoutingPolicyDigest(policy));
}
// A bound agent may still lack persisted completion evidence. Suspend new
// dispatch until the critical obligation closes, even after a stop-hook I/O fault.
const unresolvedCriticalInvocation = state => Object.values(state.invocations).some(call =>
  call.status === 'pending' && call.critical);
const pendingPreparation = state => Object.values(state.preparations || {}).some(call =>
  call.status === 'pending');
function latchRouteFailure(payload, state, critical, error, invocation_id = null) {
  if (!critical || !state) return;
  const reason = String(error?.message || error);
  try {
    const latched = latchCriticalFailure({
      harness: 'codex', root_session_id: payload.session_id,
      expected_activation_id: state.activation_id,
      expected_root_generation: state.root_generation,
        critical, invocation_id, reason, evidence_ref: `codex-pre-tool:${payload.turn_id}:${payload.tool_use_id}`,
      state_root: STATE_ROOT,
    });
    if (!['LATCHED', 'UNCHANGED'].includes(latched.disposition)
      || latched.critical_failure_latched !== true) {
      throw new Error(latched.reason);
    }
  } catch (failure) {
    throw new Error(`${reason}; critical failure persistence unavailable: ${failure?.message || failure}`);
  }
}
function validateRecoverySource(payload) {
  const nativeHome=realpathSync(resolvePath(homedir(),'.codex'));
  const scope=readHostLaunchSourceScope(ROOT,payload.session_id);
  if((scope&&scope.sourceRoot.realpath!==nativeHome)
      ||(process.env.CODEX_HOME&&realpathSync(process.env.CODEX_HOME)!==nativeHome))throw Error('UNSUPPORTED_RECOVERY_SOURCE');
}
function ensureNativeActivation(payload, policy, recovery_id) {
  let state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if(!state||state.status==='paused'||state.version===1||state.release_digest!==releaseFor(policy))validateRecoverySource(payload);
  if (state && (state.version === 1 || state.release_digest !== releaseFor(policy))) {
    state = startActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,
      root_anchor:currentNativeAnchor(payload),release_digest:releaseFor(policy)});
  }
  if (state?.version === 2 && state.status === 'paused') {
    state = reconcileInterruptedReviews(payload,state);
    if(state.critical_failure)throw Error('CRITICAL_FAILURE_LATCHED');
    if(Object.values(state.invocations).some(c=>c.status==='pending'||(c.critical&&!['accepted','interrupted'].includes(c.status))))throw Error('UNRESOLVED_INVOCATION');
    if(Object.values(state.preparations||{}).some(p=>['pending','invalidated'].includes(p.status)))throw Error('UNRESOLVED_CRITICAL_PREPARATION');
    if(Object.values(state.review_obligations).some(o=>o.status!=='COMPLETED'))throw Error('UNRESOLVED_REVIEW_OBLIGATION');
    state = startActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,
      root_anchor:currentNativeAnchor(payload),release_digest:releaseFor(policy)});
  }
  if (!state || state.status === 'paused') {
    // Recovery remains restricted to the native default home. Refuse a
    // provider recovery before writing activation rather than failing later.
    validateRecoverySource(payload);
    const anchor = currentNativeAnchor(payload);
    const recovered = recoverActivation({harness: 'codex', root_session_id: payload.session_id,
      root_anchor: anchor, release_digest: releaseFor(policy),
      expected_activation_id: state?.activation_id || null,
      expected_root_generation: state?.root_generation, state_root: STATE_ROOT});
    if (!['RECOVERED', 'UNCHANGED'].includes(recovered.disposition)) throw new Error(recovered.reason);
    state = recovered.state;
  }
  if (!state || state.status !== 'active') throw new Error('ACTIVATION_MISSING');
  state = reconcileInterruptedReviews(payload, state);
  if (state.release_digest !== releaseFor(policy)) throw new Error('RELEASE_MISMATCH');
  const admission = dispatchAdmission(state,{route_harness:'codex-native',recovery_id});
  if (admission.disposition !== 'READY') throw new Error(admission.reason);
  // The app can change the effective model between SessionStart and dispatch.
  // Reconcile native turn evidence before comparing peak with the cached anchor;
  // otherwise a former peak anchor can incorrectly suppress the model override.
  const anchor = currentNativeAnchor(payload);
  if (state.root_anchor.model !== anchor.model) {
    const updated = updateRootAnchor({harness: 'codex', root_session_id: payload.session_id,
      root_anchor: anchor, state_root: STATE_ROOT});
    if (!['UPDATED', 'UNCHANGED'].includes(updated.disposition)) throw new Error(updated.reason);
    state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
    if (!state || state.critical_failure) throw new Error('CRITICAL_FAILURE_LATCHED');
  }
  return state;
}
function routeForAgent(payload, agentType, recovery_id) {
  const policy = readPolicy();
  const scene = resolveDispatchScene(policy, {kind: 'native-agent', agent_type: agentType});
  if (!scene) throw new Error('UNKNOWN_AGENT_TYPE');
  const state = reconcileNativeStarted(payload, ensureNativeActivation(payload, policy, recovery_id));
  let preparation_id;
  try {
    if (policy.scenes[scene].critical) {
      const preparation = beginCriticalPreparation({
        harness: 'codex', root_session_id: payload.session_id,
        expected_activation_id: state.activation_id,
        expected_root_generation: state.root_generation,
        critical: true, route_harness: 'codex-native', recovery_id,
        task_id: `native:${payload.turn_id}:${payload.tool_use_id}`,
        evidence_ref: `codex-pre-tool:${payload.turn_id}:${payload.tool_use_id}`,
        state_root: STATE_ROOT,
      });
      if (preparation.disposition !== 'READY') throw new Error(preparation.reason);
      preparation_id = preparation.preparation_id;
    }
    const binding = readBindings();
    const route = resolveModelRoute({
      harness: 'codex-native', scene, role_config: policy,
      effective_config: {
        anchor: state.root_anchor,
        peak: {model: binding.peak_model, source: 'user-approved-private-binding', approved: true},
        light: {model: binding.light_model, source: 'user-approved-private-binding', approved: true},
        approved_order: binding.approved_order,
        inherit_prefixes: binding.inherit_prefixes,
        security: {
          provider: 'openai', sandbox: 'inherit-parent',
          approval_policy: payload.permission_mode || 'inherit-parent', network: false,
        },
      },
      runtime_capabilities: {
        explicit_model_override: true,
        adopted_model_evidence: true,
        preserves_safety: true,
        model_pin: null,
        evidence: {owner: 'codex-native-hooks', ref: 'PreToolUse+SubagentStop', harness: 'codex-native'},
      },
    }, {verifyCapability: () => true});
    if (route.disposition !== 'READY') throw new Error(route.diagnostic || route.reason);
    return {policy, state, route, preparation_id, release_digest: releaseFor(policy)};
  } catch (error) {
    // No bindings or model selection ran if the durable preparation was unavailable.
    if (preparation_id) latchRouteFailure(payload, state, true, error);
    throw error;
  }
}

function handleSessionStart(payload) {
  if (!text(payload.session_id) || !text(payload.model)) throw new Error('ROOT_IDENTITY_MISSING');
  if ((process.env.MUSE_HOST_LAUNCH_ID || process.env.MUSE_HOST_LAUNCH_HANDLE)
      && !text(payload.transcript_path)) throw new Error('TRANSCRIPT_MISSING');
  if(text(payload.transcript_path)) {
    const {meta}=nativeMeta(payload.transcript_path,payload.session_id);
    if(text(meta.parent_thread_id)) {
      const parent=readActivation({harness:'codex',root_session_id:meta.parent_thread_id,state_root:STATE_ROOT});
      if(parent?.retired_agents?.[payload.session_id]) {
        latchRouteFailure({...payload,session_id:meta.parent_thread_id},parent,true,Error('RETIRED_REVIEW_AGENT_RESUMED'));
        throw Error('RETIRED_REVIEW_AGENT');
      }
    }
  }
  const policy = readPolicy();
  let existing = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (existing?.version === 2) existing = reconcileInterruptedReviews(payload,existing);
  if (payload.source === 'compact' && existing?.status === 'active') {
    if (existing.root_anchor.model !== payload.model) {
      updateRootAnchor({
        harness: 'codex', root_session_id: payload.session_id,
        root_anchor: {model: payload.model, source: 'codex-session-compact'}, state_root: STATE_ROOT,
      });
    }
    return {};
  }
  if (existing && (existing.version !== 2 || existing.release_digest !== releaseFor(policy))) {
    revokeCodexChildProjectActivation({gstackRoot: ROOT, rootSessionId: payload.session_id});
  }
  startActivation({
    harness: 'codex', root_session_id: payload.session_id,
    root_anchor: {model: payload.model, source: `codex-session-${payload.source || 'start'}`},
    release_digest: releaseFor(policy), state_root: STATE_ROOT,
  });
  return {};
}

function runnerCommand(command) {
  return /(?:^|\s)node\s+(?:"[^"]*\/\.codex\/workflow-runner\.mjs"|(?:\.\/)?\.codex\/workflow-runner\.mjs)(?:\s|$)/
    .test(command);
}
function shellQuote(value) {
  if (!/^[A-Za-z0-9-]+$/.test(value)) throw new Error('UNSAFE_SESSION_ID');
  return shellArgument(value);
}
function shellArgument(value) {
  return "'"+value.replaceAll("'", "'\"'\"'")+"'";
}
function handlePreToolUse(payload) {
  const tool = String(payload.tool_name || '').toLowerCase();
  if (tool === 'bash') {
    const command = payload.tool_input?.command;
    try {
      const request = recoveryCommand(command,payload.cwd || ROOT,ROOT);
      if (request) return handleRecoveryReservation(payload,request);
    } catch(error) { return deny(`model-route recovery refused: ${error.message}`); }
    if (!text(command) || !runnerCommand(command)) return {};
    try {
      payload = nativeCallerPayload(payload);
      ensureNativeActivation(payload, readPolicy());
      return allow({...payload.tool_input,
        command: `LUCA_MODEL_ROUTE_ROOT_SESSION_ID=${shellQuote(payload.session_id)} ${command}`});
    } catch (error) {
      return deny(`model-route unavailable: ${(error && error.message) || error}`);
    }
  }
  if (/^(?:collaboration__|collaboration)?(?:followup_task|send_message)$/.test(tool)) {
    try {return handleNativeContinuation(payload);} catch(error) {return deny(`model-route continuation refused: ${error.message}`);}
  }
  if (!SPAWN_TOOLS.has(tool)) return {};
  if (!record(payload.tool_input) || !text(payload.tool_use_id) || !text(payload.turn_id)) {
    return deny('model-route invocation identity is incomplete');
  }
  const agentType = text(payload.tool_input.agent_type) ? payload.tool_input.agent_type : 'default';
  let routed, modelPreparationStarted = false;
  try {
    payload = nativeCallerPayload(payload);
    const before = readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
    const reservation = Object.values(before?.recovery_reservations || {}).find(r => r.task_name === payload.tool_input.task_name);
    if (reservation) {
      if (agentType !== 'quality-gate' || payload.tool_input.fork_turns !== 'none') throw Error('RECOVERY_REQUIRES_COLD_QUALITY_GATE');
      const frozen = readRecoveryDescriptor(reservation.descriptor_path,reservation.authorization_path);
      if (frozen.descriptor_sha !== reservation.descriptor_sha) throw Error('RECOVERY_DESCRIPTOR_CHANGED');
      verifyRecoveryRegistration(ROOT);
    }
    routed = routeForAgent(payload, agentType, reservation?.recovery_id);
    routed.recovery_id = reservation?.recovery_id;
    const unbound = Object.values(routed.state.invocations).some(call => call.status === 'pending'
      && call.route_harness === 'codex-native' && !text(call.external_identity?.agent_id));
    if (unbound) return deny('another native subagent is awaiting trusted agent-id correlation');
    // A failed project observation must not leave a pending model invocation
    // that blocks every later spawn in this parent session.
    prepareCodexChildProject({
      gstackRoot: ROOT,
      parentSessionId: payload.session_id,
      turnId: payload.turn_id,
      toolUseId: payload.tool_use_id,
      agentType,
      taskName: payload.tool_input.task_name || '',
      cwd: payload.cwd || ROOT,
      transcriptPath: payload.transcript_path || '',
      codexHome: process.env.CODEX_HOME || '',
    });
    modelPreparationStarted = true;
    const prepared = prepareInvocation({
      harness: 'codex', root_session_id: payload.session_id,
      release_digest: routed.release_digest, route: routed.route,
      task_id: `native:${payload.turn_id}:${payload.tool_use_id}`,
      input_sha: inputDigest(payload.tool_input), state_root: STATE_ROOT,
      preparation_id: routed.preparation_id, recovery_id:routed.recovery_id,
    });
    if (prepared.disposition !== 'READY') {
      latchRouteFailure(payload, routed.state, routed.route.critical, prepared.reason);
      return deny(`model-route refused: ${prepared.reason}`);
    }
    for (const [field, value] of [['tool_use_id', payload.tool_use_id], ['agent_type', agentType]]) {
      const bound = bindInvocationExternalIdentity({
        harness: 'codex', root_session_id: payload.session_id,
        invocation_id: prepared.envelope.invocation_id, field, value, state_root: STATE_ROOT,
      });
      if (bound.disposition !== 'BOUND') {
        latchRouteFailure(payload, routed.state, routed.route.critical, bound.reason);
        return deny(`model-route correlation failed: ${bound.reason}`);
      }
    }
    const {model: _ignoredModel, ...updated} = payload.tool_input;
    if (routed.route.requested_model !== routed.state.root_anchor.model) {
      updated.model = routed.route.requested_model;
      if (!text(updated.fork_turns) || updated.fork_turns === 'all') updated.fork_turns = 'none';
    }
    // Review independence is required even when no model upgrade occurs.
    // Numeric history forks also carry the producer's reasoning into review.
    if (routed.route.independent_review_required) updated.fork_turns = 'none';
    return allow(updated);
  } catch (error) {
    if (routed?.preparation_id || (modelPreparationStarted && routed?.route.critical)) {
      try { latchRouteFailure(payload, routed.state, true, error); }
      catch (failure) { error = failure; }
    }
    return deny(`model-route unavailable: ${(error && error.message) || error}`);
  }
}

function bindProjectIdentity(payload, call, agentId) {
  const toolUseId = call.external_identity?.tool_use_id;
  const taskId = call.task_id;
  const suffix = `:${toolUseId}`;
  if (!text(toolUseId) || !text(taskId) || !taskId.startsWith('native:') || !taskId.endsWith(suffix)) {
    throw new Error('native spawn turn is unavailable');
  }
  return bindCodexChildProject({
    gstackRoot: ROOT, parentSessionId: payload.session_id,
    turnId: taskId.slice('native:'.length, -suffix.length), toolUseId,
    agentId, agentType: call.external_identity.agent_type, codexHome: process.env.CODEX_HOME || '',
  });
}

// Native creation is recorded before the child's SubagentStart hook necessarily
// runs. Reconcile only that exact parent call, never a task name or model output.
function reconcileNativeStarted(payload, state) {
  const pending = Object.values(state.invocations).filter(call => call.status === 'pending'
    && call.route_harness === 'codex-native' && !text(call.external_identity?.agent_id));
  if (pending.length !== 1 || !text(payload.transcript_path)) return state;
  const call = pending[0], tool = call.external_identity?.tool_use_id;
  if (call.task_id !== `native:${payload.turn_id}:${tool}`) return state;
  const { events } = currentNativeRecords(payload);
  const calls = events.filter(row => row.type === 'response_item' && row.payload?.call_id === tool);
  // function_call_output also has call_id; it is not a second invocation.
  const invocations = calls.filter(row => row.payload.type === 'function_call');
  // Same provider caveat as transcriptEvidence: the call's turn is its enclosing turn_context.
  const callTurn = row => events.slice(0, events.indexOf(row))
    .findLast(event => event.type === 'turn_context')?.payload?.turn_id;
  const starts = events.filter(row => row.type === 'event_msg' && row.payload?.type === 'item_completed'
    && row.payload.item?.type === 'SubAgentActivity' && row.payload.item.kind === 'started' && row.payload.item.id === tool);
  if (invocations.length !== 1 || starts.length !== 1) return state;
  const nativeCall = invocations[0].payload, started = starts[0].payload;
  if (!SPAWN_TOOLS.has(String(nativeCall.name || '').toLowerCase())
      || (nativeCall.namespace && nativeCall.namespace !== 'collaboration')
      || callTurn(invocations[0]) !== payload.turn_id
      || started.thread_id !== payload.session_id || started.turn_id !== payload.turn_id
      || events.indexOf(starts[0]) <= events.indexOf(invocations[0])) return state;
  let args;
  try { args = JSON.parse(nativeCall.arguments); } catch { return state; }
  const agentId = started.item.agent_thread_id;
  if (!record(args) || (args.agent_type || 'default') !== call.external_identity?.agent_type
      || !text(agentId) || agentId === payload.session_id
      || Object.values(state.invocations).some(other => other.external_identity?.agent_id === agentId)) return state;
  bindProjectIdentity(payload, call, agentId);
  const bound = bindInvocationExternalIdentity({
    harness: 'codex', root_session_id: payload.session_id, invocation_id: call.invocation_id,
    field: 'agent_id', value: agentId, state_root: STATE_ROOT,
  });
  if (bound.disposition !== 'BOUND') throw new Error(`native started correlation failed: ${bound.reason}`);
  // This changes identity only. Pending completion and critical gates remain intact.
  return readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
}

function handleSubagentStart(payload) {
  if (!text(payload.session_id) || !text(payload.agent_id) || !text(payload.agent_type)) return {};
  try {
    const path = payload.agent_transcript_path
      || nativeTranscriptForSession(payload.agent_id, payload.session_id);
    const {meta} = nativeMeta(path, payload.session_id);
    if (meta.id !== payload.agent_id
        || (meta.source?.subagent?.thread_spawn?.agent_role || 'default') !== payload.agent_type) {
      throw new Error('NATIVE_CALLER_ANCESTRY_MISMATCH');
    }
    payload = nativeStopPayload({...payload, agent_transcript_path: path});
  } catch (error) {
    return {systemMessage: `model-route start identity unavailable: ${error?.message || error}`};
  }
  const state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (!state) return {systemMessage: 'model-route could not find the parent activation'};
  if(state.retired_agents?.[payload.agent_id]) {
    const call=state.invocations[state.retired_agents[payload.agent_id].invocation_id];
    const child=nativeMeta(payload.agent_transcript_path||nativeTranscriptForSession(payload.agent_id,payload.session_id),payload.session_id);
    const turn=child.events.filter(r=>r.type==='turn_context').at(-1)?.payload.turn_id;
    if(turn&&turn!==call?.interruption?.native_turn_id)latchRouteFailure(payload,state,true,Error('RETIRED_REVIEW_AGENT_RESUMED'));
    return {continue:false,stopReason:'RETIRED_REVIEW_AGENT'};
  }
  const existing = Object.values(state.invocations).filter(call => call.external_identity?.agent_id === payload.agent_id);
  if (existing.length) {
    if (existing.length !== 1 || existing[0].external_identity.agent_type !== payload.agent_type) {
      return {systemMessage: 'model-route agent correlation conflicts with the existing identity'};
    }
    try { bindProjectIdentity(payload, existing[0], payload.agent_id); }
    catch (error) { return {systemMessage: `project association refused: ${error?.message || error}`}; }
    return {};
  }
  const candidates = Object.values(state.invocations).filter(call => call.status === 'pending'
    && call.route_harness === 'codex-native'
    && call.external_identity?.agent_type === payload.agent_type
    && !text(call.external_identity?.agent_id));
  if (candidates.length !== 1) return {systemMessage: 'model-route could not uniquely correlate this subagent'};
  const bound = bindInvocationExternalIdentity({
    harness: 'codex', root_session_id: payload.session_id,
    invocation_id: candidates[0].invocation_id, field: 'agent_id', value: payload.agent_id,
    state_root: STATE_ROOT,
  });
  if (bound.disposition !== 'BOUND') {
    return {systemMessage: `model-route agent correlation failed: ${bound.reason}`};
  }
  try {
    bindProjectIdentity(payload, candidates[0], payload.agent_id);
  } catch (error) {
    return {systemMessage: `project association refused: ${(error && error.message) || error}`};
  }
  return {};
}

function nativeTranscriptRoot(sessionId) {
  let scope = readHostLaunchSourceScope(ROOT, sessionId);
  if (!scope && (process.env.MUSE_HOST_LAUNCH_ID || process.env.MUSE_HOST_LAUNCH_HANDLE)) {
    // Native SessionStart hooks run concurrently. The HostLaunch attach hook
    // publishes the protected source grant; never substitute CODEX_HOME for it.
    const deadline = performance.now() + 5000;
    const pause = new Int32Array(new SharedArrayBuffer(4));
    while (!scope && performance.now() < deadline) {
      Atomics.wait(pause, 0, 0, 25);
      scope = readHostLaunchSourceScope(ROOT, sessionId);
    }
    if (!scope) throw new Error('HOST_SOURCE_SCOPE_NOT_READY');
  }
  const expectedRoot = scope ? resolvePath(scope.sourceRoot.realpath, 'sessions') : TRANSCRIPT_ROOT;
  const root = realpathSync(expectedRoot);
  if (root !== resolvePath(expectedRoot)) throw new Error('TRANSCRIPT_ROOT_NOT_CANONICAL');
  return root;
}
function safeTranscript(path, sessionId) {
  if (!text(path) || !isAbsolute(path)) throw new Error('TRANSCRIPT_MISSING');
  const root = nativeTranscriptRoot(sessionId);
  const actual = realpathSync(path);
  if (actual !== resolvePath(path)) throw new Error('TRANSCRIPT_NOT_CANONICAL');
  const rel = relative(root, actual);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('TRANSCRIPT_OUTSIDE_CODEX_SESSIONS');
  return actual;
}
function nativeMeta(path, sessionId) {
  const actual = safeTranscript(path, sessionId);
  const events = readFileSync(actual, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const metas = events.filter(event => event.type === 'session_meta');
  if (metas.length !== 1 || events[0] !== metas[0] || !text(metas[0].payload?.id)) {
    throw new Error('ROOT_TRANSCRIPT_IDENTITY_MISMATCH');
  }
  return {actual, events, meta: metas[0].payload};
}

function nativeTranscriptForSession(sessionId, scopeSessionId) {
  if (!text(sessionId) || !/^[A-Za-z0-9-]+$/.test(sessionId)) throw new Error('NATIVE_CALLER_SOURCE_MISSING');
  const matches = [];
  function scan(folder, depth) {
    for (const entry of readdirSync(folder, {withFileTypes: true})) {
      const path = resolvePath(folder, entry.name);
      if (entry.isDirectory() && depth < 3 && /^\d{2,4}$/.test(entry.name)) scan(path, depth + 1);
      else if (entry.isFile() && entry.name.startsWith('rollout-')
        && entry.name.endsWith(`-${sessionId}.jsonl`)) matches.push(path);
      if (matches.length > 1) throw new Error('NATIVE_CALLER_SOURCE_AMBIGUOUS');
    }
  }
  scan(nativeTranscriptRoot(scopeSessionId), 0);
  if (matches.length !== 1) throw new Error('NATIVE_CALLER_SOURCE_MISSING');
  return matches[0];
}

// Native nested hooks can retain the immediate parent's session_id while
// transcript_path identifies the acting thread. Resolve that edge only from
// native metadata and the parent's existing, current activation binding.
function nativeCallerPayload(payload) {
  const {meta} = nativeMeta(payload.transcript_path, payload.session_id);
  if (meta.id === payload.session_id) return payload;
  const spawn = meta.source?.subagent?.thread_spawn;
  const parent = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  const calls = Object.values(parent?.invocations || {}).filter(call =>
    call.external_identity?.agent_id === meta.id);
  const call = calls[0];
  if (meta.session_id !== payload.session_id || meta.parent_thread_id !== payload.session_id
      || spawn?.parent_thread_id !== payload.session_id || meta.thread_source !== 'subagent'
      || !Number.isSafeInteger(spawn.depth) || spawn.depth < 1 || spawn.depth > 32
      || parent?.status !== 'active' || parent.critical_failure || calls.length !== 1
      || call.activation_id !== parent.activation_id || call.root_generation !== parent.root_generation
      || !['pending', 'accepted'].includes(call.status)
      || call.route_harness !== 'codex-native'
      || call.external_identity.agent_type !== (spawn.agent_role || 'default')) {
    throw new Error('NATIVE_CALLER_ANCESTRY_MISMATCH');
  }
  const resolved = {...payload, session_id: meta.id};
  currentNativeRecords(resolved);
  return resolved;
}

function nativeStopPayload(payload) {
  // Keep direct-call evidence failures on the normal acceptance/latch path.
  const direct = findInvocationByExternalIdentity({harness: 'codex', root_session_id: payload.session_id,
    field: 'agent_id', value: payload.agent_id, state_root: STATE_ROOT});
  let meta;
  try { ({meta} = nativeMeta(payload.agent_transcript_path, payload.session_id)); }
  catch (error) { if (direct) return payload; throw error; }
  if (direct && (meta.id !== payload.agent_id || meta.parent_thread_id === payload.session_id)) return payload;
  if (meta.id !== payload.agent_id) throw new Error('NATIVE_CALLER_ANCESTRY_MISMATCH');
  if (meta.parent_thread_id === payload.session_id) return payload;
  const caller = readActivation({harness: 'codex', root_session_id: meta.parent_thread_id, state_root: STATE_ROOT});
  // SessionStart and recovery store different anchor provenance. Locate the
  // unique native caller record, then verify its identity and bound parent edge.
  const path = nativeTranscriptForSession(meta.parent_thread_id, payload.session_id);
  const {events} = nativeMeta(path, payload.session_id);
  const context = events.filter(event => event.type === 'turn_context').at(-1)?.payload;
  const resolved = nativeCallerPayload({...payload, transcript_path: path, turn_id: context?.turn_id});
  if (resolved.session_id !== meta.parent_thread_id) throw new Error('NATIVE_CALLER_ANCESTRY_MISMATCH');
  if (caller?.status !== 'active' || caller.critical_failure) throw new Error('ACTIVATION_MISSING');
  reconcileNativeStarted(resolved, caller);
  return {...payload, session_id: resolved.session_id};
}
function currentNativeRecords(payload) {
  const actual = safeTranscript(payload.transcript_path, payload.session_id);
  if (!basename(actual).startsWith('rollout-')
      || !basename(actual).endsWith('.jsonl')) {
    throw new Error('ROOT_TRANSCRIPT_IDENTITY_MISMATCH');
  }
  const before=statSync(actual),bytes=readFileSync(actual,'utf8'),after=statSync(actual);
  if(before.dev!==after.dev||before.ino!==after.ino||after.size!==Buffer.byteLength(bytes)) {
    throw Error('CURRENT_NATIVE_TRANSCRIPT_CHANGED');
  }
  const events = bytes.split('\n').filter(Boolean).map(line => JSON.parse(line));
  const metas = events.filter(event => event.type === 'session_meta');
  if (metas.length !== 1 || events[0] !== metas[0] || metas[0].payload?.id !== payload.session_id) {
    throw new Error('ROOT_TRANSCRIPT_IDENTITY_MISMATCH');
  }
  const context = events.filter(event => event.type === 'turn_context').at(-1)?.payload;
  // Subdirectories are valid only when Git resolves every native cwd to this
  // exact checkout. A transcript from a different worktree cannot create state
  // here, even when its SID and model appear otherwise valid.
  const workspace = realpathSync(ROOT);
  for (const cwd of [metas[0].payload.cwd, context?.cwd, payload.cwd]) {
    if (!text(cwd) || !isAbsolute(cwd) || realpathSync(cwd) !== resolvePath(cwd)) {
      throw new Error('ROOT_TRANSCRIPT_WORKSPACE_MISMATCH');
    }
    const observed = spawnSync('git', ['--no-optional-locks', '-C', cwd, 'rev-parse', '--show-toplevel'],
      {encoding: 'utf8', timeout: 5000, env: withoutLocalGitEnv()});
    if (observed.status !== 0 || !text(observed.stdout)
        || realpathSync(observed.stdout.trim()) !== workspace) {
      throw new Error('ROOT_TRANSCRIPT_WORKSPACE_MISMATCH');
    }
  }
  let activeTurn;
  for (const event of events) {
    if (event.type === 'event_msg' && event.payload?.type === 'task_started') activeTurn = event.payload.turn_id;
    if (event.type === 'turn_aborted' || ['task_complete', 'turn_aborted'].includes(event.payload?.type)) {
      activeTurn = undefined;
    }
  }
  if (!text(payload.turn_id) || context?.turn_id !== payload.turn_id
      || activeTurn !== payload.turn_id || !text(context.model)) {
    throw new Error('ROOT_TRANSCRIPT_CURRENT_TURN_MISSING');
  }
  return { events, context, actual, source_identity:{dev:after.dev,ino:after.ino} };
}
function currentNativeAnchor(payload) {
  const { context, actual } = currentNativeRecords(payload);
  return {model: context.model, source: `codex-native-transcript:${actual}:${payload.turn_id}`};
}
function transcriptEvidence(path, rootSessionId, agentId, agentType,
  lastAssistantMessage, stopHookActive) {
  const actual = safeTranscript(path, rootSessionId);
  const events = readFileSync(actual, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const meta = events.find(event => event.type === 'session_meta')?.payload;
  const contexts = events.filter(event => event.type === 'turn_context').map(event => event.payload);
  const context = contexts.at(-1);
  const contextIndex = events.findLastIndex(event => event.type === 'turn_context');
  const assistantIndex = events.findLastIndex(event => event.type === 'response_item'
    && event.payload?.type === 'message' && event.payload?.role === 'assistant');
  const assistant = assistantIndex >= 0 ? events[assistantIndex].payload : undefined;
  const assistantText = (assistant?.content || [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text).join('');
  // A resumed subagent may retain cancelled earlier turns. Only a cancellation
  // of this evidence turn (or one lacking an attributable turn) blocks success.
  const aborted = events.some(event => {
    if (event.type !== 'turn_aborted'
        && !(event.type === 'event_msg' && event.payload?.type === 'turn_aborted')) return false;
    const turnId = event.payload?.turn_id || event.turn_id;
    return !text(turnId) || turnId === context?.turn_id;
  });
  const identityOk = meta?.id === agentId && meta?.parent_thread_id === rootSessionId
    && meta?.source?.subagent?.thread_spawn?.agent_role === agentType;
  // SubagentStop runs before Codex appends task_complete. Treat the hook event as
  // the trusted stop boundary and bind it to the last assistant item in this turn.
  // Turn membership is the runtime-written turn_context that encloses the item;
  // the passthrough turn_id is provider-echoed and is a per-request ID on some
  // providers (aihub-direct), so it cannot identify the Codex turn.
  const complete = identityOk && !aborted && stopHookActive === false
    && text(context?.model) && text(lastAssistantMessage)
    && contexts.every(item => item.model === context.model)
    && contextIndex >= 0 && assistantIndex > contextIndex && assistantText === lastAssistantMessage;
  return {
    adopted_model: context?.model || '',
    status: complete ? 'completed' : 'failed',
    same_invocation_success: complete,
    rerouted: false,
    fallback: false,
    evidence_ref: `codex-transcript:${actual}:${context?.turn_id || 'unknown'}`,
  };
}

function parentSpawnProof(payload, call) {
  const parent = nativeTranscriptForSession(payload.session_id,payload.session_id);
  const {events,meta} = nativeMeta(parent,payload.session_id);
  if(meta.id !== payload.session_id)throw Error('RECOVERY_PARENT_MISMATCH');
  const tool = call.external_identity?.tool_use_id;
  const rows = events.filter(row => row.type==='response_item'&&row.payload?.type==='function_call'&&row.payload.call_id===tool);
  if(rows.length!==1)throw Error('RECOVERY_SPAWN_NOT_UNIQUE');
  const row=rows[0],native=row.payload,args=JSON.parse(native.arguments);
  const turn=events.slice(0,events.indexOf(row)).findLast(r=>r.type==='turn_context')?.payload.turn_id;
  if(native.namespace!=='collaboration'||native.name!=='spawn_agent'||call.task_id!==`native:${turn}:${tool}`
      ||inputDigest(args)!==call.input_sha||(args.agent_type||'default')!==call.external_identity?.agent_type) {
    throw Error('RECOVERY_SPAWN_BINDING_MISMATCH');
  }
  const starts=events.filter(r=>r.type==='event_msg'&&r.payload?.type==='item_completed'
    &&r.payload.item?.type==='SubAgentActivity'&&r.payload.item.kind==='started'&&r.payload.item.id===tool);
  if(starts.length!==1||starts[0].payload.thread_id!==payload.session_id||starts[0].payload.turn_id!==turn
      ||starts[0].payload.item.agent_thread_id!==call.external_identity.agent_id)throw Error('RECOVERY_CHILD_BINDING_MISMATCH');
  const outputs=events.filter(r=>r.type==='response_item'&&r.payload?.type==='function_call_output'&&r.payload.call_id===tool);
  if(outputs.length!==1)throw Error('RECOVERY_SPAWN_RESULT_MISSING');
  const result=JSON.parse(outputs[0].payload.output);
  if(!text(result.task_name)||!result.task_name.startsWith('/root/'))throw Error('RECOVERY_TASK_ALIAS_MISSING');
  return {parent,parent_sha:digest(readFileSync(parent)),alias:result.task_name,args};
}
function interruptedObservation(payload,call) {
  const id=call.external_identity.agent_id;
  const path=payload.agent_id===id&&text(payload.agent_transcript_path)
    ? safeTranscript(payload.agent_transcript_path,payload.session_id) : nativeTranscriptForSession(id,payload.session_id);
  const {events,meta}=nativeMeta(path,payload.session_id);
  const contextIndex=events.findLastIndex(r=>r.type==='turn_context'),context=events[contextIndex]?.payload;
  if(meta.id!==id||meta.parent_thread_id!==payload.session_id
      ||meta.source?.subagent?.thread_spawn?.agent_role!==call.external_identity.agent_type)throw Error('RECOVERY_CHILD_IDENTITY_MISMATCH');
  if(call.retired_by_recovery_id && context?.turn_id!==call.interruption?.native_turn_id)throw Error('RETIRED_REVIEW_AGENT_RESUMED');
  const aborts=events.map((r,i)=>({r,i})).filter(({r})=>r.type==='turn_aborted'||r.payload?.type==='turn_aborted');
  if(aborts.some(({r})=>!text(r.payload?.turn_id||r.turn_id)))throw Error('UNATTRIBUTED_CHILD_TERMINATION');
  const abort=aborts.findLast(({r})=>(r.payload?.turn_id||r.turn_id)===context?.turn_id);
  if(!abort)return null;
  const contexts=events.filter(r=>r.type==='turn_context').map(r=>r.payload);
  if(contexts.some(item=>item.model!==call.requested_model))throw Error('RECOVERY_MODEL_HISTORY_MISMATCH');
  if(new Set(contexts.map(item=>item.turn_id)).size!==1)throw Error('RECOVERY_ORIGINAL_TURN_MISMATCH');
  if(abort.i<=contextIndex||!text(context?.turn_id)
      ||events.slice(abort.i+1).some(r=>r.type==='turn_context'||r.type==='response_item'
        ||['task_started','task_complete'].includes(r.payload?.type)))throw Error('CHILD_ACTIVE_AFTER_INTERRUPTION');
  const parent=parentSpawnProof(payload,call);
  return {...call,status:'interrupted',adopted_model:context.model,native_turn_id:context.turn_id,
    agent_id:id,tool_use_id:call.external_identity.tool_use_id,agent_type:call.external_identity.agent_type,
    parent_transcript_sha:parent.parent_sha,child_transcript_sha:digest(readFileSync(path)),
    evidence_ref:`codex-interrupted:${path}:${context.turn_id}`};
}
function reconcileInterruptedReviews(payload,state) {
  if(state.version!==2)return state;
  state=reconcileContinuations(payload,state);
  for(const call of Object.values(state.invocations)) {
    if(!call.critical||call.route_harness!=='codex-native'||!call.external_identity?.agent_id
        ||!['pending','invalidated','interrupted'].includes(call.status))continue;
    let observation;
    try {observation=interruptedObservation(payload,call);}
    catch(error) {
      // A missing transcript is not proof of a terminal event. Retain the open
      // invocation; contradictory native evidence is a durable hard failure.
      if(/ENOENT|NATIVE_CALLER_SOURCE_MISSING|TRANSCRIPT.*MISSING|TRANSCRIPT.*NOT_FOUND/.test(error.message))continue;
      latchRouteFailure(payload,state,true,error);throw error;
    }
    if(observation) {
      const result=recordInvocationInterruption({harness:'codex',root_session_id:payload.session_id,
        state_root:STATE_ROOT,evidence:observation});
      if(!['INTERRUPTED','UNCHANGED'].includes(result.disposition))throw Error(result.reason);
    }
  }
  return readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
}
function handleRecoveryReservation(payload,request) {
  payload=nativeCallerPayload(payload);
  validateRecoverySource(payload);
  const native=attestCurrentNativeCall(currentNativeRecords(payload),payload);
  const frozen=readRecoveryDescriptor(request.descriptor_path,request.authorization_path);
  const policy=readPolicy();
  let state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
  if(!state||state.version!==2)throw Error('LEGACY_RECOVERY_NEEDS_CONTEXT');
  state=reconcileInterruptedReviews(payload,state);
  const anchor=currentNativeAnchor(payload);
  if(state.root_anchor.model!==anchor.model) {
    updateRootAnchor({harness:'codex',root_session_id:payload.session_id,root_anchor:anchor,state_root:STATE_ROOT});
    state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
  }
  const obligations=Object.values(state.review_obligations).filter(o=>o.status!=='COMPLETED');
  if(obligations.length!==1)throw Error('RECOVERY_OBLIGATION_NOT_UNIQUE');
  const operation_id=digest(native.operation_id+frozen.descriptor_sha);
  const result=reserveReviewRecovery({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,
    ...request,...frozen,operation_id,obligation_id:obligations[0].obligation_id,
    release_digest:releaseFor(policy),policy_sha:modelRoutingPolicyDigest(policy),
    verifyNativeEvidence:current=>{
      const repeated=attestCurrentNativeCall(currentNativeRecords(payload),payload);
      if(repeated.call_id!==native.call_id||repeated.prefix_sha!==native.prefix_sha
          ||JSON.stringify(repeated.source_identity)!==JSON.stringify(native.source_identity))throw Error('CURRENT_NATIVE_CALL_CHANGED');
      const files=readRecoveryDescriptor(request.descriptor_path,request.authorization_path);
      if(files.descriptor_sha!==frozen.descriptor_sha||files.authorization_sha!==frozen.authorization_sha)throw Error('RECOVERY_SOURCE_CHANGED');
      for(const id of obligations[0].attempts) {
        const call=current.invocations[id];
        if(id===obligations[0].original_invocation_id&&obligations[0].continuation_operation_id) {
          acceptedContinuationInterruption(payload,call,current);
          continue;
        }
        const proof=interruptedObservation(payload,call);
        if(!proof||proof.child_transcript_sha!==call.interruption?.child_transcript_sha
            ||proof.native_turn_id!==call.interruption?.native_turn_id)throw Error('RECOVERY_TERMINAL_EVIDENCE_CHANGED');
      }
      verifyRecoveryRegistration(ROOT);
    }});
  if(result.disposition!=='RESERVED')throw Error(result.reason);
  return allow({...payload.tool_input,command:`node ${shellArgument(resolvePath(ROOT,'scripts/codex-review-recovery.mjs'))} inspect --session ${shellQuote(payload.session_id)} --operation-id ${shellQuote(operation_id)}`});
}
function continuationObservation(payload,intent) {
  const caller=intent.caller_session_id||payload.session_id;
  const parent=nativeTranscriptForSession(caller,payload.session_id);
  const {events,meta}=nativeMeta(parent,payload.session_id);
  if(meta.id!==caller)throw Error('CONTINUATION_PARENT_MISMATCH');
  if(intent.native_prefix_sha && digest(JSON.stringify(events.slice(0,intent.native_prefix_length)))!==intent.native_prefix_sha) {
    throw Error('CONTINUATION_PREFIX_CHANGED');
  }
  const rows=events.filter(r=>r.type==='response_item'&&r.payload?.type==='function_call_output'
    &&r.payload.call_id===intent.native_call_id);
  if(!rows.length)return null;
  if(rows.length!==1)throw Error('CONTINUATION_RESULT_NOT_UNIQUE');
  const child=nativeMeta(nativeTranscriptForSession(intent.agent_id,payload.session_id),payload.session_id);
  if(child.meta.id!==intent.agent_id||child.meta.parent_thread_id!==payload.session_id)throw Error('CONTINUATION_CHILD_MISMATCH');
  const contexts=child.events.filter(r=>r.type==='turn_context');
  const context=contexts.at(-1)?.payload;
  if(/^Tool call blocked by PreToolUse hook:/.test(rows[0].payload.output||'')) {
    return context?.turn_id===intent.child_turn_before ? {status:'not_started'} : null;
  }
  // Unknown/failed tool results cannot certify that the queued effect finished.
  const output=rows[0].payload.output;
  // Native followup_task succeeds with an empty function_call_output. It still
  // needs the distinct terminal child turn below; an absent result never does.
  if(output!=='')return null;
  const isTerminal=r=>r.type==='turn_aborted'||(r.type==='event_msg'&&['task_complete','turn_aborted'].includes(r.payload?.type));
  const terminals=child.events.slice(intent.child_event_count_before).filter(isTerminal);
  // send_message queues without starting an idle task. Its existing terminal
  // turn can close the queue intent, but never certify a followup or live turn.
  if(!terminals.length&&intent.kind==='send_message') {
    const prior=child.events.slice(0,intent.child_event_count_before).findLast(isTerminal);
    if((prior?.payload?.turn_id||prior?.turn_id)===intent.child_turn_before)terminals.push(prior);
  }
  const terminal=terminals.at(-1);
  const turn=terminal?.payload?.turn_id||terminal?.turn_id;
  if(!terminal||!text(turn)||turn!==context?.turn_id
      ||(intent.kind==='followup_task'&&turn===intent.child_turn_before))return null;
  const terminalIndex=child.events.indexOf(terminal);
  if(child.events.slice(terminalIndex+1).some(r=>r.type==='turn_context'||r.type==='response_item'
      ||r.payload?.type==='task_started'))return null;
  const call=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT})?.invocations[intent.invocation_id];
  if(contexts.some(r=>r.payload.model!==call?.requested_model))throw Error('CONTINUATION_MODEL_MISMATCH');
  return {status:terminal.type==='turn_aborted'||terminal.payload?.type==='turn_aborted'?'interrupted':'completed',
    native_turn_id:turn,child_transcript_sha:digest(readFileSync(child.actual)),parent_result_sha:digest(JSON.stringify(rows[0]))};
}
function acceptedContinuationInterruption(payload,call,state) {
  const obligation=Object.values(state.review_obligations).find(o=>o.original_invocation_id===call.invocation_id
    &&o.continuation_operation_id);
  if(!obligation)return null;
  const intent=state.resume_intents[obligation.continuation_operation_id];
  parentSpawnProof(payload,call);
  const child=nativeMeta(nativeTranscriptForSession(intent.agent_id,payload.session_id),payload.session_id);
  if(child.meta.source?.subagent?.thread_spawn?.agent_role!==call.external_identity.agent_type)throw Error('CONTINUATION_CHILD_MISMATCH');
  const proof=continuationObservation(payload,intent);
  if(!proof||proof.status!=='interrupted'||JSON.stringify(proof)!==JSON.stringify(intent.terminal_proof)
      ||(call.retired_by_recovery_id&&proof.native_turn_id!==call.retired_native_turn_id)) {
    throw Error('RECOVERY_TERMINAL_EVIDENCE_CHANGED');
  }
  return proof;
}
function reconcileContinuations(payload,state) {
  for(const intent of Object.values(state.resume_intents)) {
    if(intent.status!=='pending'||!text(intent.native_call_id))continue;
    try {
      const parent=nativeTranscriptForSession(intent.caller_session_id||payload.session_id,payload.session_id);
      const proof=continuationObservation(payload,intent);
      if(!proof)continue;
      const input={harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,
        operation_id:intent.operation_id,native_call_id:intent.native_call_id,evidence_ref:`native-continuation:${parent}:${intent.native_call_id}`,
        verifyNativeEvidence:()=>{
          const repeated=continuationObservation(payload,intent);
          if(JSON.stringify(repeated)!==JSON.stringify(proof))throw Error('CONTINUATION_EVIDENCE_CHANGED');
          return repeated;
        }};
      const result=proof.status==='not_started'?settleDeniedNativeContinuation(input):settleNativeContinuation(input);
      if(!['CLOSED','UNCHANGED'].includes(result.disposition))throw Error(result.reason);
    } catch(error) {
      if(/CONTINUATION_(?:PREFIX_CHANGED|RESULT_NOT_UNIQUE|PARENT_MISMATCH|CHILD_MISMATCH|MODEL_MISMATCH|EVIDENCE_CHANGED)/.test(error.message)) {
        latchRouteFailure(payload,state,true,error,intent.invocation_id);
      }
      throw error;
    }
  }
  return readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
}
function nativeContinuationTarget(payload,target) {
  if(!text(target))throw Error('CONTINUATION_TARGET_NOT_UNIQUE');
  const scope=payload.session_id,cache=new Map();
  function node(id) {
    if(!cache.has(id)) {
      const path=nativeTranscriptForSession(id,scope),{meta}=nativeMeta(path,scope);
      if(meta.id!==id)throw Error('CONTINUATION_CHILD_MISMATCH');
      cache.set(id,{id,meta,state:readActivation({harness:'codex',root_session_id:id,state_root:STATE_ROOT})});
    }
    return cache.get(id);
  }
  function children(parent) {
    return Object.values(parent.state?.invocations||{}).filter(call=>call.external_identity?.agent_id).map(call=> {
      const child=node(call.external_identity.agent_id),proof=parentSpawnProof({...payload,session_id:parent.id},call);
      if(child.meta.parent_thread_id!==parent.id
          ||child.meta.source?.subagent?.thread_spawn?.agent_role!==call.external_identity.agent_type) {
        throw Error('CONTINUATION_CHILD_MISMATCH');
      }
      return {...child,alias:proof.alias,owner:parent.id,call,
        retired:parent.retired||Boolean(parent.state?.retired_agents?.[child.id])};
    });
  }
  // Resolve the caller's actual native family; '/root' is never inferred from
  // a caller-supplied target or from another chat's ledger.
  let root=node(scope);const ancestry=new Set();
  while(text(root.meta.parent_thread_id)) {
    if(ancestry.has(root.id)||ancestry.size>=32)throw Error('CONTINUATION_ANCESTRY_MISMATCH');
    ancestry.add(root.id);
    const parent=node(root.meta.parent_thread_id),links=children(parent).filter(n=>n.id===root.id);
    if(links.length!==1)throw Error('CONTINUATION_ANCESTRY_MISMATCH');
    if(links[0].retired) {
      latchRouteFailure({...payload,session_id:parent.id},parent.state,true,
        Error('RETIRED_REVIEW_AGENT_RESUMED'),links[0].call.invocation_id);
      throw Error('RETIRED_REVIEW_AGENT');
    }
    root=parent;
  }
  if(target==='/root'||target===root.id)return {...root,alias:'/root',owner:null};
  const queue=[{...root,alias:'/root'}],seen=new Set(),nodes=[];
  while(queue.length) {
    const current=queue.shift();
    if(seen.has(current.id)||seen.size>=256)throw Error('CONTINUATION_TARGET_NOT_UNIQUE');
    seen.add(current.id);
    nodes.push(current);
    queue.push(...children(current));
  }
  const actor=nodes.find(n=>n.id===scope);
  if(!actor)throw Error('CONTINUATION_ANCESTRY_MISMATCH');
  const resolvedTarget=resolvePath(actor.alias,target);
  const matches=nodes.filter(n=>n.id===target||n.alias===resolvedTarget);
  if(matches.length!==1)throw Error('CONTINUATION_TARGET_NOT_UNIQUE');
  if(matches[0].retired)throw Error('RETIRED_REVIEW_AGENT');
  return matches[0];
}
function handleNativeContinuation(payload) {
  payload=nativeCallerPayload(payload);
  const native=attestCurrentNativeCall(currentNativeRecords(payload),payload,'continuation');
  const target=nativeContinuationTarget(payload,payload.tool_input?.target);
  // The native backend rejects dot path segments. Send the proven canonical
  // identity, keeping the opaque message and other input fields unchanged.
  const allowed=allow({...payload.tool_input,target:target.alias});
  if(!target.owner) {
    if(payload.tool_name.includes('followup'))throw Error('ROOT_IS_NOT_A_CONTINUATION_TARGET');
    return allowed;
  }
  const state=readActivation({harness:'codex',root_session_id:target.owner,state_root:STATE_ROOT});
  if(!state||state.version!==2)throw Error('LEGACY_CONTINUATION_NEEDS_CONTEXT');
  reconcileContinuations({...payload,session_id:target.owner},state);
  const child=nativeMeta(nativeTranscriptForSession(target.id,payload.session_id),payload.session_id);
  const result=beginNativeContinuation({harness:'codex',root_session_id:target.owner,state_root:STATE_ROOT,
    agent_id:target.id,caller_session_id:payload.session_id,operation_id:native.operation_id,native_call_id:native.call_id,
    child_turn_before:child.events.filter(r=>r.type==='turn_context').at(-1)?.payload.turn_id,
    child_event_count_before:child.events.length,kind:payload.tool_name.includes('followup')?'followup_task':'send_message',
    native_prefix_sha:native.prefix_sha,native_prefix_length:native.prefix_length,
    evidence_ref:`native-call:${native.path}:${native.call_id}`});
  if(result.disposition!=='READY')throw Error(result.reason);return allowed;
}

function handleSubagentStop(payload) {
  try { payload = nativeStopPayload(payload); }
  catch (error) {
    return {continue: false, stopReason: `model-route caller refused: ${error?.message || error}`};
  }
  const call = findInvocationByExternalIdentity({
    harness: 'codex', root_session_id: payload.session_id,
    field: 'agent_id', value: payload.agent_id, state_root: STATE_ROOT,
  });
  if (!call) return {continue: false, stopReason: 'model-route invocation is not correlated'};
  let observed;
  try {
    if(call.critical && call.route_harness==='codex-native') {
      if(call.status==='accepted') {
        const state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
        const reconciled=reconcileContinuations(payload,state);
        if(acceptedContinuationInterruption(payload,call,reconciled))return {};
      }
      const interrupted=interruptedObservation(payload,call);
      if(interrupted) {
        const result=recordInvocationInterruption({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,evidence:interrupted});
        return ['INTERRUPTED','UNCHANGED'].includes(result.disposition) ? {}
          : {continue:false,stopReason:result.reason};
      }
    }
    observed = transcriptEvidence(payload.agent_transcript_path, payload.session_id,
      payload.agent_id, payload.agent_type,
      payload.last_assistant_message, payload.stop_hook_active);
    if(call.recovery_id) {
      const state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
      observed.review_report=parseRecoveryReport(payload.last_assistant_message,state.recovery_reservations[call.recovery_id].descriptor);
    }
  } catch (error) {
    if(call.retired_by_recovery_id) {
      const state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
      latchRouteFailure(payload,state,true,error);
    }
    observed = {
      adopted_model: '', status: 'failed', same_invocation_success: false,
      rerouted: false, fallback: false,
      evidence_ref: `codex-transcript-error:${(error && error.message) || error}`,
    };
  }
  const current=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
  if(call.critical&&current.activation_id===call.activation_id
      &&(call.status!=='pending'||current.status!=='active'||call.root_generation!==current.root_generation)
      &&(observed.status!=='completed'||!observed.same_invocation_success||observed.adopted_model!==call.requested_model)) {
    // An earlier coordination failure must not hide a later, attributable hard
    // failure. Audit it even when the original ticket can no longer be consumed.
    const result=latchCriticalFailure({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT,
      expected_activation_id:current.activation_id,expected_root_generation:current.root_generation,
      critical:true,invocation_id:call.invocation_id,evidence_ref:observed.evidence_ref,
      reason:observed.adopted_model!==call.requested_model?'NATIVE_COMPLETION_MODEL_MISMATCH':'NATIVE_COMPLETION_EVIDENCE_MISMATCH'});
    if(!['LATCHED','UNCHANGED'].includes(result.disposition))throw Error(result.reason);
  }
  const observationSha=digest(JSON.stringify(observed));
  if(call.status==='accepted') {
    if(call.native_observation_sha===observationSha)return {};
    const state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
    // A settled intent authenticates only its recorded terminal callback, not a new turn.
    const intent=Object.values(state.resume_intents).some(i=>i.agent_id===payload.agent_id
      &&i.invocation_id===call.invocation_id&&(i.status==='pending'
        ||(i.status==='completed'&&i.terminal_proof?.status==='completed'
          &&observed.evidence_ref===`codex-transcript:${safeTranscript(payload.agent_transcript_path,payload.session_id)}:${i.terminal_proof.native_turn_id}`)));
    if(intent&&observed.status==='completed'&&observed.adopted_model===call.requested_model)return {};
    latchRouteFailure(payload,state,true,Error('UNTRACKED_CHILD_ACTIVITY'),call.invocation_id);
    return {continue:false,stopReason:'UNTRACKED_CHILD_ACTIVITY'};
  }
  const accepted = acceptInvocationEvidence({
    harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT,
    evidence: {...call, ...observed, native_observation_sha:observationSha},
  });
  return accepted.disposition === 'ACCEPT' ? {}
    : {continue: false, stopReason: `model-route evidence refused: ${accepted.reason}`,
      systemMessage: 'The subagent result is not trusted for downstream authorization.'};
}

function handleSessionEnd(payload) {
  if (text(payload.session_id)) {
    const state=readActivation({harness:'codex',root_session_id:payload.session_id,state_root:STATE_ROOT});
    if(state?.version!==2)revokeCodexChildProjectActivation({gstackRoot: ROOT, rootSessionId: payload.session_id});
    pauseActivation({
      harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT,
    });
  }
  return {};
}

let output;
try {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  if (!record(payload)) throw new Error('INVALID_HOOK_INPUT');
  if (payload.hook_event_name === 'SessionStart') output = handleSessionStart(payload);
  else if (payload.hook_event_name === 'PreToolUse') output = handlePreToolUse(payload);
  else if (payload.hook_event_name === 'SubagentStart') output = handleSubagentStart(payload);
  else if (payload.hook_event_name === 'SubagentStop') output = handleSubagentStop(payload);
  else if (payload.hook_event_name === 'SessionEnd') output = handleSessionEnd(payload);
  else output = {};
} catch (error) {
  process.stderr.write(`[model-route-hook] ${(error && error.message) || error}\n`);
  process.exit(2);
}
json(output);
