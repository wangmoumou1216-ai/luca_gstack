#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readActivation} from './model-route-host.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(ROOT, '.codex', 'model-route-hook.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'codex-model-route-hook.'));
const policyPath = join(scratch, 'policy.json');
const bindingsPath = join(scratch, 'bindings.json');
const stateRoot = join(scratch, 'state');
const transcriptRoot = join(scratch, 'sessions');
mkdirSync(transcriptRoot, {recursive: true});

const policy = {
  version: 2, status: 'active', scope: 'common',
  roles: {anchor: 'root-effective-selection', peak: 'user-approved-higher-selection', light: 'user-approved-lower-selection'},
  scenes: {
    'MR-001': {trigger: 'normal', role: 'anchor', critical: false},
    'MR-004': {trigger: 'review', role: 'peak', critical: true},
    'MR-008': {trigger: 'mechanical', role: 'light', critical: false},
  },
  dispatch: {native_agent_types: {
    default: 'MR-001', worker: 'MR-001', 'quality-gate': 'MR-004', 'preflight-agent': 'MR-008',
  }, workflows: {}},
  critical_failure: 'refuse-no-fallback',
  evidence: 'trusted-runtime-adoption-and-same-invocation-success',
  effort: 'user-owned-not-a-routing-input',
};
writeFileSync(policyPath, `${JSON.stringify({model_routing: policy})}\n`, {mode: 0o600});
writeFileSync(bindingsPath, `${JSON.stringify({schema_version: 1, harnesses: {codex: {
  peak_model: 'gpt-6-astra', light_model: 'gpt-5.6-luna',
  approved_order: ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-6-astra'],
}}})}\n`, {mode: 0o600});

const env = {
  ...process.env,
  NODE_ENV: 'test',
  LUCA_MODEL_ROUTE_POLICY_PATH: policyPath,
  LUCA_MODEL_ROUTE_BINDINGS_PATH: bindingsPath,
  LUCA_MODEL_ROUTE_STATE_ROOT: stateRoot,
  LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT: transcriptRoot,
};
let checks = 0;
function run(payload) {
  const result = spawnSync('node', [HOOK], {cwd: ROOT, encoding: 'utf8', input: JSON.stringify(payload), env});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function equal(actual, expected, message) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}
function state(sessionId) {
  return readActivation({harness: 'codex', root_session_id: sessionId, state_root: stateRoot});
}
function start(sessionId, model = 'gpt-5.6-sol', source = 'startup') {
  return run({hook_event_name: 'SessionStart', session_id: sessionId, model, source, cwd: ROOT});
}
function pre(sessionId, toolInput, toolUseId, toolName = 'spawn_agent') {
  return run({
    hook_event_name: 'PreToolUse', session_id: sessionId, turn_id: 'turn-root',
    tool_use_id: toolUseId, tool_name: toolName, tool_input: toolInput,
    permission_mode: 'default', cwd: ROOT, model: 'gpt-5.6-sol',
  });
}
function subStart(sessionId, agentId, agentType) {
  return run({
    hook_event_name: 'SubagentStart', session_id: sessionId, turn_id: 'turn-root',
    agent_id: agentId, agent_type: agentType, permission_mode: 'default', cwd: ROOT,
  });
}
function transcript({sessionId, agentId, agentType, model, complete = true}) {
  const file = join(transcriptRoot, `${agentId}.jsonl`);
  const turnId = `turn-${agentId}`;
  const events = [
    {type: 'session_meta', payload: {id: agentId, parent_thread_id: sessionId,
      source: {subagent: {thread_spawn: {agent_role: agentType}}}}},
    {type: 'event_msg', payload: {type: 'task_started', turn_id: turnId}},
    {type: 'turn_context', payload: {turn_id: turnId, model}},
    {type: 'response_item', payload: {type: 'message', role: 'assistant',
      content: [{type: 'output_text', text: 'done'}],
      internal_chat_message_metadata_passthrough: {turn_id: turnId}}},
  ];
  if (complete) events.push({type: 'event_msg', payload: {type: 'task_complete', turn_id: turnId}});
  writeFileSync(file, `${events.map(event => JSON.stringify(event)).join('\n')}\n`, {mode: 0o600});
  return file;
}
function subStop(sessionId, agentId, agentType, path, lastAssistantMessage = 'done') {
  return run({
    hook_event_name: 'SubagentStop', session_id: sessionId, turn_id: 'turn-root',
    agent_id: agentId, agent_type: agentType, agent_transcript_path: path,
    stop_hook_active: false, last_assistant_message: lastAssistantMessage, cwd: ROOT,
  });
}

try {
  const anchorSession = 'root-anchor';
  start(anchorSession);
  equal(state(anchorSession).root_anchor.model, 'gpt-5.6-sol', 'SessionStart pins root anchor');
  const anchorPre = pre(anchorSession, {task_name: 'anchor', message: 'work', reasoning_effort: 'max'}, 'tool-anchor');
  const anchorInput = anchorPre.hookSpecificOutput.updatedInput;
  equal(anchorPre.hookSpecificOutput.permissionDecision, 'allow', 'known native agent is allowed');
  equal('model' in anchorInput, false, 'anchor inherits root model without an explicit override');
  equal(anchorInput.reasoning_effort, 'max', 'user-owned effort is preserved');
  subStart(anchorSession, 'agent-anchor', 'default');
  const anchorStop = subStop(anchorSession, 'agent-anchor', 'default', transcript({
    sessionId: anchorSession, agentId: 'agent-anchor', agentType: 'default', model: 'gpt-5.6-sol',
    complete: false,
  }));
  equal(anchorStop, {}, 'SubagentStop accepts matching evidence before task_complete is appended');
  equal(Object.values(state(anchorSession).invocations)[0].status, 'accepted', 'accepted native evidence is persisted');

  const peakSession = 'root-peak';
  start(peakSession);
  const peakPre = pre(peakSession, {task_name: 'review', message: 'judge', agent_type: 'quality-gate', fork_turns: 'all', reasoning_effort: 'high'}, 'tool-peak', 'collaborationspawn_agent');
  const peakInput = peakPre.hookSpecificOutput.updatedInput;
  equal(peakInput.model, 'gpt-6-astra', 'critical native scene selects peak model');
  equal(peakInput.fork_turns, 'none', 'explicit cross-model child uses a supported fork mode');
  equal(peakInput.reasoning_effort, 'high', 'routing never changes explicit effort');
  subStart(peakSession, 'agent-peak', 'quality-gate');
  const wrongStop = subStop(peakSession, 'agent-peak', 'quality-gate', transcript({
    sessionId: peakSession, agentId: 'agent-peak', agentType: 'quality-gate', model: 'gpt-5.6-sol',
  }));
  equal(wrongStop.continue, false, 'wrong critical adopted model is refused');
  equal(state(peakSession).critical_failure, true, 'wrong critical adopted model latches activation');
  equal(pre(peakSession, {task_name: 'later', message: 'later'}, 'tool-later')
    .hookSpecificOutput.permissionDecision, 'deny', 'latched activation blocks later native spawns');

  const messageMismatchSession = 'root-message-mismatch';
  start(messageMismatchSession);
  pre(messageMismatchSession,
    {task_name: 'review-message', message: 'judge', agent_type: 'quality-gate'}, 'tool-message-mismatch');
  subStart(messageMismatchSession, 'agent-message-mismatch', 'quality-gate');
  const messageMismatchStop = subStop(messageMismatchSession, 'agent-message-mismatch', 'quality-gate', transcript({
    sessionId: messageMismatchSession, agentId: 'agent-message-mismatch',
    agentType: 'quality-gate', model: 'gpt-6-astra', complete: false,
  }), 'different-message');
  equal(messageMismatchStop.continue, false,
    'SubagentStop refuses a payload message that does not match the same-turn transcript');
  equal(state(messageMismatchSession).critical_failure, true,
    'critical assistant-message mismatch latches activation');

  const lightSession = 'root-light';
  start(lightSession);
  const lightPre = pre(lightSession, {task_name: 'mechanical', message: 'check', agent_type: 'preflight-agent'}, 'tool-light');
  equal(lightPre.hookSpecificOutput.updatedInput.model, 'gpt-5.6-luna', 'mechanical scene selects approved light model');

  const unknownSession = 'root-unknown';
  start(unknownSession);
  equal(pre(unknownSession, {task_name: 'unknown', message: 'x', agent_type: 'unregistered'}, 'tool-unknown')
    .hookSpecificOutput.permissionDecision, 'deny', 'unknown agent types never guess a scene');

  const pendingSession = 'root-pending';
  start(pendingSession);
  pre(pendingSession, {task_name: 'one', message: 'one'}, 'tool-one');
  equal(pre(pendingSession, {task_name: 'two', message: 'two'}, 'tool-two')
    .hookSpecificOutput.permissionDecision, 'deny', 'ambiguous concurrent native correlation is refused');

  const runnerSession = 'root-runner';
  start(runnerSession);
  const runnerPre = pre(runnerSession,
    {command: 'node .codex/workflow-runner.mjs external-skill-scout'}, 'tool-bash', 'Bash');
  equal(runnerPre.hookSpecificOutput.updatedInput.command.startsWith("LUCA_MODEL_ROUTE_ROOT_SESSION_ID='root-runner' "),
    true, 'runner command receives only the trusted root-session reference');
  equal(pre(runnerSession, {command: 'node scripts/other.mjs'}, 'tool-other', 'Bash'), {},
    'unrelated shell commands are untouched');

  const effortA = 'root-effort-a', effortB = 'root-effort-b';
  start(effortA); start(effortB);
  pre(effortA, {task_name: 'same', message: 'same', reasoning_effort: 'low'}, 'tool-effort-a');
  pre(effortB, {task_name: 'same', message: 'same', reasoning_effort: 'xhigh'}, 'tool-effort-b');
  equal(Object.values(state(effortA).invocations)[0].input_sha,
    Object.values(state(effortB).invocations)[0].input_sha, 'effort does not enter native invocation hash');

  const compactSession = 'root-compact';
  start(compactSession);
  start(compactSession, 'gpt-6-astra', 'compact');
  equal(state(compactSession).root_generation, 1, 'compact root model change advances generation without new activation');

  run({hook_event_name: 'SessionEnd', session_id: lightSession, reason: 'other', cwd: ROOT});
  equal(state(lightSession).status, 'paused', 'SessionEnd pauses activation');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

process.stdout.write(`PASS: ${checks} Codex native model-route hook checks\n`);
