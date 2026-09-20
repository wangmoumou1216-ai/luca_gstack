#!/usr/bin/env node
// Codex-native adapter for the shared model-only route policy.
import {createHash} from 'node:crypto';
import {realpathSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, isAbsolute, relative, resolve as resolvePath} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  modelRoutingPolicyDigest, resolve as resolveModelRoute, resolveDispatchScene,
} from '../scripts/model-route.mjs';
import {
  acceptInvocationEvidence, bindInvocationExternalIdentity, findInvocationByExternalIdentity,
  pauseActivation, prepareInvocation, readActivation, releaseDigestForPolicy, startActivation,
  updateRootAnchor,
} from '../scripts/model-route-host.mjs';

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
  const loaded = spawnSync('python3', ['-c',
    'import json,sys,yaml;d=yaml.safe_load(open(sys.argv[1]));print(json.dumps(d.get("model_routing")))',
    POLICY_PATH], {encoding: 'utf8', timeout: 5000});
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
function routeForAgent(payload, agentType) {
  const policy = readPolicy();
  const scene = resolveDispatchScene(policy, {kind: 'native-agent', agent_type: agentType});
  if (!scene) throw new Error('UNKNOWN_AGENT_TYPE');
  const state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (!state || state.status !== 'active') throw new Error('ACTIVATION_MISSING');
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
  if (route.disposition !== 'READY') throw new Error(route.reason);
  return {policy, state, route, release_digest: releaseFor(policy)};
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
    const state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
    if (!state || state.status !== 'active' || state.critical_failure) return deny('model-route activation is not usable');
    return allow({...payload.tool_input,
      command: `LUCA_MODEL_ROUTE_ROOT_SESSION_ID=${shellQuote(payload.session_id)} ${command}`});
  }
  if (!SPAWN_TOOLS.has(tool)) return {};
  if (!record(payload.tool_input) || !text(payload.tool_use_id) || !text(payload.turn_id)) {
    return deny('model-route invocation identity is incomplete');
  }
  const agentType = text(payload.tool_input.agent_type) ? payload.tool_input.agent_type : 'default';
  try {
    const routed = routeForAgent(payload, agentType);
    const unbound = Object.values(routed.state.invocations).some(call => call.status === 'pending'
      && call.route_harness === 'codex-native' && !text(call.external_identity?.agent_id));
    if (unbound) return deny('another native subagent is awaiting trusted agent-id correlation');
    const prepared = prepareInvocation({
      harness: 'codex', root_session_id: payload.session_id,
      release_digest: routed.release_digest, route: routed.route,
      task_id: `native:${payload.turn_id}:${payload.tool_use_id}`,
      input_sha: inputDigest(payload.tool_input), state_root: STATE_ROOT,
    });
    if (prepared.disposition !== 'READY') return deny(`model-route refused: ${prepared.reason}`);
    for (const [field, value] of [['tool_use_id', payload.tool_use_id], ['agent_type', agentType]]) {
      const bound = bindInvocationExternalIdentity({
        harness: 'codex', root_session_id: payload.session_id,
        invocation_id: prepared.envelope.invocation_id, field, value, state_root: STATE_ROOT,
      });
      if (bound.disposition !== 'BOUND') return deny(`model-route correlation failed: ${bound.reason}`);
    }
    const {model: _ignoredModel, ...updated} = payload.tool_input;
    if (routed.route.requested_model !== routed.state.root_anchor.model) {
      updated.model = routed.route.requested_model;
      if (!text(updated.fork_turns) || updated.fork_turns === 'all') updated.fork_turns = 'none';
    }
    return allow(updated);
  } catch (error) {
    return deny(`model-route unavailable: ${(error && error.message) || error}`);
  }
}

function handleSubagentStart(payload) {
  if (!text(payload.session_id) || !text(payload.agent_id) || !text(payload.agent_type)) return {};
  const state = readActivation({harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT});
  if (!state) return {systemMessage: 'model-route could not find the parent activation'};
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
  return bound.disposition === 'BOUND' ? {}
    : {systemMessage: `model-route agent correlation failed: ${bound.reason}`};
}

function safeTranscript(path) {
  if (!text(path) || !isAbsolute(path)) throw new Error('TRANSCRIPT_MISSING');
  const root = realpathSync(TRANSCRIPT_ROOT);
  const actual = realpathSync(path);
  const rel = relative(root, actual);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('TRANSCRIPT_OUTSIDE_CODEX_SESSIONS');
  return actual;
}
function transcriptEvidence(path, rootSessionId, agentId, agentType,
  lastAssistantMessage, stopHookActive) {
  const actual = safeTranscript(path);
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
  const aborted = events.some(event => event.type === 'turn_aborted');
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
  if (text(payload.session_id)) pauseActivation({
    harness: 'codex', root_session_id: payload.session_id, state_root: STATE_ROOT,
  });
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
  output = {};
}
json(output);
