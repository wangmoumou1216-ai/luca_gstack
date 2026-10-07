#!/usr/bin/env node
// Codex-native adapter for the shared model-only route policy.
import {createHash} from 'node:crypto';
import {realpathSync, readFileSync} from 'node:fs';
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
} from '../scripts/model-route-host.mjs';
import {
  bindCodexChildProject,
  prepareCodexChildProject,
  revokeCodexChildProjectActivation,
} from '../.claude/hooks/lib/codex-child-project.mjs';
import {withoutLocalGitEnv} from '../.claude/hooks/lib/git-env.mjs';
import {readHostLaunchSourceScope} from '../.claude/hooks/lib/event-attestation.mjs';

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
function latchRouteFailure(payload, state, critical, error) {
  if (!critical || !state) return;
  const reason = String(error?.message || error);
  try {
    const latched = latchCriticalFailure({
      harness: 'codex', root_session_id: payload.session_id,
      expected_activation_id: state.activation_id,
      expected_root_generation: state.root_generation,
      critical, reason, evidence_ref: `codex-pre-tool:${payload.turn_id}:${payload.tool_use_id}`,
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
function ensureNativeActivation(payload, policy) {
  let state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (!state || state.status === 'paused') {
    // Child association still supports the native default home only. Refuse a
    // provider recovery before writing activation rather than failing later.
    const nativeHome = realpathSync(resolvePath(homedir(), '.codex'));
    const scope = readHostLaunchSourceScope(ROOT, payload.session_id);
    if ((scope && scope.sourceRoot.realpath !== nativeHome)
        || (process.env.CODEX_HOME && realpathSync(process.env.CODEX_HOME) !== nativeHome)) {
      throw new Error('UNSUPPORTED_RECOVERY_SOURCE');
    }
    const anchor = currentNativeAnchor(payload);
    const recovered = recoverActivation({harness: 'codex', root_session_id: payload.session_id,
      root_anchor: anchor, release_digest: releaseFor(policy),
      expected_activation_id: state?.activation_id || null,
      expected_root_generation: state?.root_generation, state_root: STATE_ROOT});
    if (!['RECOVERED', 'UNCHANGED'].includes(recovered.disposition)) throw new Error(recovered.reason);
    state = recovered.state;
  }
  if (!state || state.status !== 'active') throw new Error('ACTIVATION_MISSING');
  if (state.release_digest !== releaseFor(policy)) throw new Error('RELEASE_MISMATCH');
  if (state.critical_failure) throw new Error('CRITICAL_FAILURE_LATCHED');
  if (unresolvedCriticalInvocation(state)) throw new Error('CRITICAL_INVOCATION_EVIDENCE_PENDING');
  if (pendingPreparation(state)) throw new Error('UNRESOLVED_CRITICAL_PREPARATION');
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
function routeForAgent(payload, agentType) {
  const policy = readPolicy();
  const scene = resolveDispatchScene(policy, {kind: 'native-agent', agent_type: agentType});
  if (!scene) throw new Error('UNKNOWN_AGENT_TYPE');
  const state = reconcileNativeStarted(payload, ensureNativeActivation(payload, policy));
  let preparation_id;
  try {
    if (policy.scenes[scene].critical) {
      const preparation = beginCriticalPreparation({
        harness: 'codex', root_session_id: payload.session_id,
        expected_activation_id: state.activation_id,
        expected_root_generation: state.root_generation,
        critical: true, route_harness: 'codex-native',
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
  const policy = readPolicy();
  const existing = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (payload.source === 'compact' && existing?.status === 'active') {
    if (existing.root_anchor.model !== payload.model) {
      updateRootAnchor({
        harness: 'codex', root_session_id: payload.session_id,
        root_anchor: {model: payload.model, source: 'codex-session-compact'}, state_root: STATE_ROOT,
      });
    }
    return {};
  }
  revokeCodexChildProjectActivation({gstackRoot: ROOT, rootSessionId: payload.session_id});
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
  return `'${value}'`;
}
function handlePreToolUse(payload) {
  const tool = String(payload.tool_name || '').toLowerCase();
  if (tool === 'bash') {
    const command = payload.tool_input?.command;
    if (!text(command) || !runnerCommand(command)) return {};
    try {
      ensureNativeActivation(payload, readPolicy());
      return allow({...payload.tool_input,
        command: `LUCA_MODEL_ROUTE_ROOT_SESSION_ID=${shellQuote(payload.session_id)} ${command}`});
    } catch (error) {
      return deny(`model-route unavailable: ${(error && error.message) || error}`);
    }
  }
  if (!SPAWN_TOOLS.has(tool)) return {};
  if (!record(payload.tool_input) || !text(payload.tool_use_id) || !text(payload.turn_id)) {
    return deny('model-route invocation identity is incomplete');
  }
  const agentType = text(payload.tool_input.agent_type) ? payload.tool_input.agent_type : 'default';
  let routed, modelPreparationStarted = false;
  try {
    routed = routeForAgent(payload, agentType);
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
      preparation_id: routed.preparation_id,
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
  const starts = events.filter(row => row.type === 'event_msg' && row.payload?.type === 'item_completed'
    && row.payload.item?.type === 'SubAgentActivity' && row.payload.item.kind === 'started' && row.payload.item.id === tool);
  if (invocations.length !== 1 || starts.length !== 1) return state;
  const nativeCall = invocations[0].payload, started = starts[0].payload;
  if (!SPAWN_TOOLS.has(String(nativeCall.name || '').toLowerCase())
      || (nativeCall.namespace && nativeCall.namespace !== 'collaboration')
      || nativeCall.internal_chat_message_metadata_passthrough?.turn_id !== payload.turn_id
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
  return ensureNativeActivation(payload, readPolicy());
}

function handleSubagentStart(payload) {
  if (!text(payload.session_id) || !text(payload.agent_id) || !text(payload.agent_type)) return {};
  const state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (!state) return {systemMessage: 'model-route could not find the parent activation'};
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

function safeTranscript(path, sessionId) {
  if (!text(path) || !isAbsolute(path)) throw new Error('TRANSCRIPT_MISSING');
  const scope = readHostLaunchSourceScope(ROOT, sessionId);
  const expectedRoot = scope ? resolvePath(scope.sourceRoot.realpath, 'sessions') : TRANSCRIPT_ROOT;
  const root = realpathSync(expectedRoot);
  if (root !== resolvePath(expectedRoot)) throw new Error('TRANSCRIPT_ROOT_NOT_CANONICAL');
  const actual = realpathSync(path);
  if (actual !== resolvePath(path)) throw new Error('TRANSCRIPT_NOT_CANONICAL');
  const rel = relative(root, actual);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('TRANSCRIPT_OUTSIDE_CODEX_SESSIONS');
  return actual;
}
function currentNativeRecords(payload) {
  const actual = safeTranscript(payload.transcript_path, payload.session_id);
  if (!basename(actual).startsWith('rollout-')
      || !basename(actual).endsWith('.jsonl')) {
    throw new Error('ROOT_TRANSCRIPT_IDENTITY_MISMATCH');
  }
  const events = readFileSync(actual, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
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
  return { events, context, actual };
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
  const assistant = events.filter(event => event.type === 'response_item'
    && event.payload?.type === 'message' && event.payload?.role === 'assistant')
    .map(event => event.payload).at(-1);
  const assistantText = (assistant?.content || [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text).join('');
  const assistantTurnId = assistant?.internal_chat_message_metadata_passthrough?.turn_id;
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
  const complete = identityOk && !aborted && stopHookActive === false
    && text(context?.model) && text(lastAssistantMessage)
    && assistantTurnId === context?.turn_id && assistantText === lastAssistantMessage;
  return {
    adopted_model: context?.model || '',
    status: complete ? 'completed' : 'failed',
    same_invocation_success: complete,
    rerouted: false,
    fallback: false,
    evidence_ref: `codex-transcript:${actual}:${context?.turn_id || 'unknown'}`,
  };
}

function handleSubagentStop(payload) {
  const call = findInvocationByExternalIdentity({
    harness: 'codex', root_session_id: payload.session_id,
    field: 'agent_id', value: payload.agent_id, state_root: STATE_ROOT,
  });
  if (!call) return {continue: false, stopReason: 'model-route invocation is not correlated'};
  let observed;
  try {
    observed = transcriptEvidence(payload.agent_transcript_path, payload.session_id,
      payload.agent_id, payload.agent_type,
      payload.last_assistant_message, payload.stop_hook_active);
  } catch (error) {
    observed = {
      adopted_model: '', status: 'failed', same_invocation_success: false,
      rerouted: false, fallback: false,
      evidence_ref: `codex-transcript-error:${(error && error.message) || error}`,
    };
  }
  const accepted = acceptInvocationEvidence({
    harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT,
    evidence: {...call, ...observed},
  });
  return accepted.disposition === 'ACCEPT' ? {}
    : {continue: false, stopReason: `model-route evidence refused: ${accepted.reason}`,
      systemMessage: 'The subagent result is not trusted for downstream authorization.'};
}

function handleSessionEnd(payload) {
  if (text(payload.session_id)) {
    revokeCodexChildProjectActivation({gstackRoot: ROOT, rootSessionId: payload.session_id});
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
