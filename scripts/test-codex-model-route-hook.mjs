#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readActivation, recoverActivation, stateFileForTest} from './model-route-host.mjs';
import {allocateFixtureRoot, releaseFixtureRoot} from './exact-fixture-slots.mjs';
import {queueProjectEventCandidate} from '../.claude/hooks/lib/project-substrate.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'codex-model-route-hook.')));
const ROOT = join(scratch, 'gstack');
mkdirSync(ROOT, {mode: 0o700});
assert.equal(spawnSync('git', ['init', '-q', ROOT], {encoding: 'utf8'}).status, 0);
mkdirSync(join(ROOT, '.codex'), {mode: 0o700});
mkdirSync(join(ROOT, 'scripts'), {mode: 0o700});
mkdirSync(join(ROOT, '.claude'), {mode: 0o700});
cpSync(join(repo, '.codex', 'model-route-hook.mjs'), join(ROOT, '.codex', 'model-route-hook.mjs'));
for (const name of ['model-route.mjs', 'model-route-host.mjs']) {
  cpSync(join(repo, 'scripts', name), join(ROOT, 'scripts', name));
}
cpSync(join(repo, '.claude', 'hooks', 'lib'), join(ROOT, '.claude', 'hooks', 'lib'), {recursive: true});
const HOOK = join(ROOT, '.codex', 'model-route-hook.mjs');
const protectedFixture = mkdtempSync(join(scratch, '.codex-model-route-fixture-'));
const childStore = join(protectedFixture, 'child-store');
const childCodexHome = join(protectedFixture, 'codex-home');
mkdirSync(childStore, {mode: 0o700});
mkdirSync(childCodexHome, {mode: 0o700});
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
    'MR-009': {trigger: 'bounded-verifiable-fact-collection', role: 'light', critical: false},
  },
  dispatch: {native_agent_types: {
    default: 'MR-001', worker: 'MR-001', 'quality-gate': 'MR-004', 'preflight-agent': 'MR-008',
    'fact-collector': 'MR-009',
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
  LUCA_EVENT_ATTESTATION_TEST: '1',
  LUCA_CHILD_PROJECT_STORE_ROOT: childStore,
  LUCA_CHILD_PROJECT_TEST_CODEX_HOME: childCodexHome,
};
let checks = 0;
const profileFixtures = [];
function run(payload, cwd = ROOT) {
  const result = spawnSync('node', [HOOK], {cwd, encoding: 'utf8', input: JSON.stringify(payload), env});
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
  const fixtureState = JSON.parse(readFileSync(stateFileForTest({harness: 'codex',
    root_session_id: sessionId, state_root: stateRoot}), 'utf8'));
  const nativePath = rootTranscript(sessionId, {model: fixtureState.root_anchor.model});
  return run({
    hook_event_name: 'PreToolUse', session_id: sessionId, turn_id: 'turn-root',
    tool_use_id: toolUseId, tool_name: toolName, tool_input: toolInput,
    permission_mode: 'default', cwd: ROOT, transcript_path: nativePath, model: 'gpt-5.6-sol',
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
function rootTranscript(sessionId, {model = 'gpt-5.6-sol', turnId = 'turn-root',
  metaId = sessionId, parentId, complete = false, metaCwd = ROOT, contextCwd = ROOT} = {}) {
  const file = join(transcriptRoot, `rollout-2026-10-01T01-00-00-${sessionId}.jsonl`);
  const events = [
    {type: 'session_meta', payload: {id: metaId, cwd: metaCwd,
      ...(parentId ? {parent_thread_id: parentId,
        source: {subagent: {thread_spawn: {parent_thread_id: parentId}}}} : {})}},
    {type: 'event_msg', payload: {type: 'task_started', turn_id: turnId}},
    {type: 'turn_context', payload: {turn_id: turnId, model, cwd: contextCwd}},
  ];
  if (complete) events.push({type: 'event_msg', payload: {type: 'task_complete', turn_id: turnId}});
  writeFileSync(file, `${events.map(event => JSON.stringify(event)).join('\n')}\n`, {mode: 0o600});
  return file;
}
function recoveryPre(sessionId, path, extra = {}) {
  return run({hook_event_name: 'PreToolUse', session_id: sessionId, turn_id: 'turn-root',
    tool_use_id: `tool-recovery-${sessionId}`, tool_name: 'spawn_agent',
    tool_input: {task_name: 'recovered', message: 'work', model: 'untrusted-tool-model'},
    permission_mode: 'default', cwd: ROOT, transcript_path: path,
    model: 'untrusted-payload-model', ...extra});
}
function recoveryRunner(sessionId, path, extra = {}) {
  return recoveryPre(sessionId, path, {tool_name: 'Bash',
    tool_input: {command: 'node .codex/workflow-runner.mjs external-skill-scout'}, ...extra});
}

try {
  const changedAnchor = 'root-active-model-change';
  start(changedAnchor, 'gpt-6-astra');
  const changedDispatch = recoveryPre(changedAnchor, rootTranscript(changedAnchor), {
    tool_input: {task_name: 'current-review', message: 'judge', agent_type: 'quality-gate',
      fork_turns: 'all', reasoning_effort: 'xhigh'},
  });
  equal(changedDispatch.hookSpecificOutput.permissionDecision, 'allow',
    'active dispatch reconciles the current native model before selecting the reviewer');
  equal(changedDispatch.hookSpecificOutput.updatedInput.model, 'gpt-6-astra',
    'a stale peak anchor cannot suppress the required explicit model override');
  equal(changedDispatch.hookSpecificOutput.updatedInput.fork_turns, 'none',
    'review remains independent after current model reconciliation');
  equal(changedDispatch.hookSpecificOutput.updatedInput.reasoning_effort, 'xhigh',
    'native model reconciliation preserves user-owned effort');
  equal(state(changedAnchor).root_anchor.model, 'gpt-5.6-sol',
    'the cache adopts authenticated current turn evidence, not tool or payload claims');
  equal(state(changedAnchor).root_generation, 1, 'current model change advances the generation');
  subStart(changedAnchor, 'agent-current-review', 'quality-gate');
  equal(subStop(changedAnchor, 'agent-current-review', 'quality-gate', transcript({
    sessionId: changedAnchor, agentId: 'agent-current-review', agentType: 'quality-gate',
    model: 'gpt-6-astra',
  })), {}, 'the selected reviewer still requires matching same-invocation native evidence');
  equal(Object.values(state(changedAnchor).invocations)[0].status, 'accepted',
    'a reconciled dispatch accepts only the matching actual model');

  for (const variant of ['missing-path', 'foreign-sid', 'completed-turn', 'wrong-turn', 'missing-model']) {
    const session = `root-active-source-${variant}`;
    start(session, 'gpt-6-astra');
    const before = state(session);
    const options = variant === 'foreign-sid' ? {metaId: 'other-native-session'}
      : variant === 'completed-turn' ? {complete: true}
      : variant === 'wrong-turn' ? {turnId: 'other-turn'} : {};
    const path = rootTranscript(session, options);
    if (variant === 'missing-model') {
      const rows = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
      delete rows.at(-1).payload.model;
      writeFileSync(path, rows.map(JSON.stringify).join('\n') + '\n');
    }
    equal(recoveryPre(session, variant === 'missing-path' ? join(transcriptRoot, 'missing.jsonl') : path)
      .hookSpecificOutput.permissionDecision, 'deny', `${variant} cannot refresh an active model anchor`);
    equal(state(session), before, `${variant} leaves active authority and invocations unchanged`);
  }
  const latchedAnchor = 'root-active-model-change-latched';
  start(latchedAnchor);
  pre(latchedAnchor, {task_name: 'failed-review', message: 'judge', agent_type: 'quality-gate'},
    'tool-latched-review');
  subStart(latchedAnchor, 'agent-latched-review', 'quality-gate');
  subStop(latchedAnchor, 'agent-latched-review', 'quality-gate', transcript({
    sessionId: latchedAnchor, agentId: 'agent-latched-review', agentType: 'quality-gate', model: 'gpt-5.6-sol',
  }));
  const latchedBefore = state(latchedAnchor);
  equal(latchedBefore.critical_failure, true, 'model adoption refusal remains latched');
  equal(recoveryPre(latchedAnchor, rootTranscript(latchedAnchor, {model: 'gpt-6-astra'}))
    .hookSpecificOutput.permissionDecision, 'deny', 'current model change cannot erase a failed critical invocation');
  equal(state(latchedAnchor), latchedBefore, 'model refresh preserves the failed activation byte-for-byte');

  for (const variant of ['valid', 'no-start', 'ambiguous-start', 'wrong-parent', 'wrong-call', 'wrong-turn',
    'missing-agent', 'reused-agent', 'wrong-role', 'ambiguous-call', 'start-before-call', 'old-ticket', 'critical']) {
    const sid = `root-started-${variant}`, tool = `tool-started-${variant}`, agent = `agent-started-${variant}`;
    start(sid);
    if (variant === 'reused-agent') {
      pre(sid, { task_name: 'earlier', message: 'work' }, 'tool-earlier');
      subStart(sid, agent, 'default');
    }
    const agentType = variant === 'critical' ? 'quality-gate' : 'default';
    const args = { task_name: 'first', message: 'work', agent_type: agentType };
    equal(pre(sid, args, tool).hookSpecificOutput.permissionDecision, 'allow', `${variant} first spawn is admitted`);
    const path = rootTranscript(sid, { turnId: variant === 'old-ticket' ? 'turn-next' : 'turn-root' });
    const rows = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
    const call = { type: 'response_item', payload: { type: 'function_call', name: 'spawn_agent', namespace: 'collaboration',
      call_id: tool, arguments: JSON.stringify({ ...args, ...(variant === 'wrong-role' ? { agent_type: 'worker' } : {}) }),
      internal_chat_message_metadata_passthrough: { turn_id: 'turn-root' } } };
    const started = { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: 'turn-root',
      item: { type: 'SubAgentActivity', id: tool, kind: 'started', agent_thread_id: agent, agent_path: '/root/first' } } };
    if (variant === 'wrong-parent') started.payload.thread_id = 'foreign-parent';
    if (variant === 'wrong-call') started.payload.item.id = 'foreign-call';
    if (variant === 'wrong-turn') started.payload.turn_id = 'foreign-turn';
    if (variant === 'missing-agent') delete started.payload.item.agent_thread_id;
    if (variant === 'start-before-call') rows.push(started, call);
    else { rows.push(call); if (variant !== 'no-start') rows.push(started); }
    if (variant === 'ambiguous-start') rows.push(structuredClone(started));
    if (variant === 'ambiguous-call') rows.push(structuredClone(call));
    writeFileSync(path, rows.map(JSON.stringify).join('\n') + '\n');
    const before = state(sid);
    const next = run({ hook_event_name: 'PreToolUse', session_id: sid,
      turn_id: variant === 'old-ticket' ? 'turn-next' : 'turn-root', tool_use_id: 'tool-next', tool_name: 'spawn_agent',
      tool_input: { task_name: 'next', message: 'work' }, cwd: ROOT, transcript_path: path });
    if (variant === 'valid') {
      equal(next.hookSpecificOutput.permissionDecision, 'allow', 'exact native started identity permits the next ordinary spawn');
      const first = Object.values(state(sid).invocations).find(row => row.external_identity?.tool_use_id === tool);
      equal(first.external_identity.agent_id, agent, 'native started binds the exact child ID');
      equal(first.status, 'pending', 'identity binding does not accept model adoption or completion');
      const after = state(sid);
      equal(subStart(sid, agent, agentType), {}, 'later SubagentStart is idempotent for the reconciled invocation');
      equal(state(sid), after, 'idempotent start cannot bind the newer unbound invocation');
    } else {
      equal(next.hookSpecificOutput.permissionDecision, 'deny', `${variant} evidence does not authorize another spawn`);
      equal(state(sid), before, `${variant} evidence does not alter model authority`);
      if (variant === 'critical') equal(next.hookSpecificOutput.permissionDecisionReason.includes('CRITICAL_INVOCATION_EVIDENCE_PENDING'), true,
        'native started does not close critical evidence obligations');
    }
  }
  const poisonCwd = join(scratch, 'poison-cwd');
  const importMarker = join(scratch, 'poison-imported');
  mkdirSync(poisonCwd);
  for (const moduleName of ['json', 'yaml']) {
    writeFileSync(join(poisonCwd, `${moduleName}.py`),
      `open(${JSON.stringify(importMarker)}, "w").write("imported")\nraise RuntimeError("poisoned module")\n`);
  }
  const isolatedSession = 'root-python-import-isolation';
  run({hook_event_name: 'SessionStart', session_id: isolatedSession,
    model: 'gpt-5.6-sol', source: 'startup', cwd: ROOT}, poisonCwd);
  equal(existsSync(importMarker), false, 'native hook Python parser ignores workdir modules');
  equal(state(isolatedSession).root_anchor.model, 'gpt-5.6-sol',
    'native hook still parses policy with isolated Python import path');
  const recoveredSession = 'root-missing-startup';
  const recovered = recoveryPre(recoveredSession, rootTranscript(recoveredSession));
  equal(recovered.hookSpecificOutput.permissionDecision, 'allow',
    'a missed startup recovers from the same native transcript turn');
  equal(state(recoveredSession).root_anchor.model, 'gpt-5.6-sol',
    'recovery ignores model fields in tool arguments and PreToolUse payload');
  equal('model' in recovered.hookSpecificOutput.updatedInput, false,
    'the recovered ordinary dispatch inherits the observed native model');
  const resumedFilenameSession = 'root-resumed-filename';
  const resumedFilename = join(transcriptRoot, `rollout-2026-10-01T01-00-00-${randomUUID()}.jsonl`);
  cpSync(rootTranscript(resumedFilenameSession), resumedFilename);
  equal(recoveryPre(resumedFilenameSession, resumedFilename).hookSpecificOutput.permissionDecision, 'allow',
    'resume may use a different filename UUID while native metadata preserves the session identity');
  equal(state(resumedFilenameSession).root_session_id, resumedFilenameSession,
    'native metadata SID owns the resumed activation');
  const wrongResumedSession = 'root-resumed-wrong-meta';
  const wrongResumedFilename = join(transcriptRoot, `rollout-2026-10-01T01-00-00-${randomUUID()}.jsonl`);
  cpSync(rootTranscript(wrongResumedSession, {metaId: 'other-native-session'}), wrongResumedFilename);
  equal(recoveryPre(wrongResumedSession, wrongResumedFilename).hookSpecificOutput.permissionDecision, 'deny',
    'a changed filename never makes foreign metadata a valid native identity');
  equal(state(wrongResumedSession), null, 'foreign resumed metadata creates no activation state');
  const recoveredId = state(recoveredSession).activation_id;
  start(recoveredSession, 'gpt-5.6-sol', 'compact');
  equal(state(recoveredSession).activation_id, recoveredId, 'compact retains a recovered activation');
  equal(Object.keys(state(recoveredSession).invocations).length, 1,
    'compact retains the native invocation recovered after missed startup');
  const recoveredReview = 'root-missing-startup-review';
  const recoveredPeak = recoveryPre(recoveredReview, rootTranscript(recoveredReview), {
    tool_input: {task_name: 'review', message: 'judge', agent_type: 'quality-gate', model: 'untrusted-tool-model'},
  });
  equal(recoveredPeak.hookSpecificOutput.permissionDecision, 'allow', 'recovered critical review can dispatch');
  equal(recoveredPeak.hookSpecificOutput.updatedInput.model, 'gpt-6-astra',
    'recovered critical review still selects the approved peak without fallback');
  equal(recoveredPeak.hookSpecificOutput.updatedInput.fork_turns, 'none',
    'recovery retains cold independent review requirements');
  for (const prior of ['missing', 'paused']) {
    const session = `root-runner-recover-${prior}`;
    if (prior === 'paused') {
      start(session);
      run({hook_event_name: 'SessionEnd', session_id: session, cwd: ROOT});
    }
    const before = state(session);
    const recoveredRunner = recoveryRunner(session, rootTranscript(session));
    equal(recoveredRunner.hookSpecificOutput.permissionDecision, 'allow',
      `runner recovers a ${prior} activation from the current native turn`);
    equal(recoveredRunner.hookSpecificOutput.updatedInput.command.startsWith(
      `LUCA_MODEL_ROUTE_ROOT_SESSION_ID='${session}' `), true,
    'recovered runner receives the verified root session reference');
    equal(state(session).root_anchor.model, 'gpt-5.6-sol', 'runner recovery ignores claimed payload models');
    equal(state(session).status, 'active', 'runner recovery activates the native session');
    equal(Object.keys(state(session).invocations).length, 0, 'runner recovery creates no agent invocation');
    equal(Object.keys(state(session).preparations).length, 0, 'runner recovery creates no critical preparation');
    if (before) equal(state(session).activation_id, before.activation_id, 'runner retains paused activation identity');
  }
  for (const [suffix, options] of [
    ['foreign-session', {metaId: 'other-session'}],
    ['foreign-turn', {turnId: 'other-turn'}],
    ['missing-model', {model: ''}],
    ['completed-turn', {complete: true}],
  ]) {
    const session = `root-recovery-${suffix}`;
    equal(recoveryPre(session, rootTranscript(session, options))
      .hookSpecificOutput.permissionDecision, 'deny', `${suffix} cannot create an activation`);
    equal(recoveryRunner(session, rootTranscript(session, options))
      .hookSpecificOutput.permissionDecision, 'deny', `runner ${suffix} cannot create an activation`);
    equal(state(session), null, `${suffix} leaves no activation state`);
  }
  const outsideSession = 'root-recovery-outside';
  const outsidePath = join(scratch, `rollout-2026-10-01T01-00-00-${outsideSession}.jsonl`);
  cpSync(rootTranscript(outsideSession), outsidePath);
  equal(recoveryPre(outsideSession, outsidePath).hookSpecificOutput.permissionDecision, 'deny',
    'recovery refuses a transcript outside the canonical native sessions root');
  equal(recoveryRunner(outsideSession, outsidePath).hookSpecificOutput.permissionDecision, 'deny',
    'runner recovery also refuses an out-of-scope transcript');
  equal(state(outsideSession), null, 'unsafe transcript paths leave no activation');
  const recoveredChild = 'child-missing-startup';
  const parentBefore = state(recoveredSession);
  equal(recoveryPre(recoveredChild, rootTranscript(recoveredChild, {parentId: recoveredSession}))
    .hookSpecificOutput.permissionDecision, 'allow', 'nested native identity recovers only its own session');
  equal(state(recoveredSession), parentBefore, 'child recovery never borrows or changes parent activation');
  const pausedSession = 'root-recovery-paused';
  start(pausedSession);
  run({hook_event_name: 'SessionEnd', session_id: pausedSession, cwd: ROOT});
  const pausedId = state(pausedSession).activation_id;
  equal(recoveryPre(pausedSession, rootTranscript(pausedSession))
    .hookSpecificOutput.permissionDecision, 'allow', 'a clean paused activation resumes from native identity');
  equal(state(pausedSession).activation_id, pausedId, 'clean recovery retains paused activation identity');
  for (const suffix of ['critical-failure', 'pending-invocation', 'pending-preparation',
    'invalidated-critical', 'invalidated-preparation', 'release-mismatch']) {
    const session = `root-paused-${suffix}`;
    start(session);
    const blocked = state(session);
    blocked.status = 'paused';
    if (suffix === 'critical-failure') blocked.critical_failure = true;
    if (suffix === 'pending-invocation') blocked.invocations.pending = {status: 'pending', critical: true};
    if (suffix === 'pending-preparation') blocked.preparations.pending = {status: 'pending'};
    if (suffix === 'invalidated-critical') blocked.invocations.unclosed = {
      status: 'invalidated', critical: true, invalidation_reason: 'ACTIVATION_PAUSED'};
    if (suffix === 'invalidated-preparation') blocked.preparations.unclosed = {
      status: 'invalidated', invalidation_reason: 'ACTIVATION_PAUSED'};
    if (suffix === 'release-mismatch') blocked.release_digest = '0'.repeat(64);
    writeFileSync(stateFileForTest({harness: 'codex', root_session_id: session, state_root: stateRoot}),
      JSON.stringify(blocked));
    equal(recoveryPre(session, rootTranscript(session)).hookSpecificOutput.permissionDecision, 'deny',
      `paused ${suffix} cannot be recovered automatically`);
    equal(recoveryRunner(session, rootTranscript(session)).hookSpecificOutput.permissionDecision, 'deny',
      `runner cannot recover paused ${suffix}`);
    equal(state(session), blocked, `paused ${suffix} is never overwritten or washed clean`);
  }
  for (const kind of ['critical-failure', 'pending-invocation', 'pending-preparation', 'release-mismatch']) {
    const session = `runner-active-${kind}`;
    start(session);
    const blocked = state(session);
    if (kind === 'critical-failure') blocked.critical_failure = true;
    if (kind === 'pending-invocation') blocked.invocations.pending = {status: 'pending', critical: true};
    if (kind === 'pending-preparation') blocked.preparations.pending = {status: 'pending'};
    if (kind === 'release-mismatch') blocked.release_digest = '0'.repeat(64);
    writeFileSync(stateFileForTest({harness: 'codex', root_session_id: session, state_root: stateRoot}),
      JSON.stringify(blocked));
    equal(recoveryRunner(session, rootTranscript(session)).hookSpecificOutput.permissionDecision, 'deny',
      `runner keeps active ${kind} blocked`);
    equal(state(session), blocked, `runner preserves active ${kind} state`);
  }
  const racedSession = 'root-recovery-race';
  start(racedSession);
  const raced = state(racedSession);
  raced.critical_failure = true;
  raced.invocations.obligation = {status: 'pending', critical: true};
  writeFileSync(stateFileForTest({harness: 'codex', root_session_id: racedSession, state_root: stateRoot}),
    JSON.stringify(raced));
  const recoveredRace = recoverActivation({harness: 'codex', root_session_id: racedSession,
    root_anchor: {model: 'gpt-5.6-sol', source: 'trusted-native-transcript'},
    release_digest: raced.release_digest, expected_activation_id: null, state_root: stateRoot});
  equal(recoveredRace.disposition, 'UNCHANGED', 'an active activation created after a missing snapshot wins the lock');
  equal(state(racedSession), raced, 'recovery CAS cannot overwrite raced critical state or obligations');
  const corruptedSession = 'root-recovery-corrupted';
  const corruptedFile = stateFileForTest({harness: 'codex', root_session_id: corruptedSession, state_root: stateRoot});
  const corruptedBytes = '{"critical_failure":true, broken';
  writeFileSync(corruptedFile, corruptedBytes);
  equal(recoveryPre(corruptedSession, rootTranscript(corruptedSession))
    .hookSpecificOutput.permissionDecision, 'deny', 'corrupted activation is not treated as missing startup');
  equal(readFileSync(corruptedFile, 'utf8'), corruptedBytes, 'recovery never overwrites corrupt existing state');
  for (const field of ['harness', 'root_session_id']) {
    const session = `root-foreign-${field}`;
    start(session);
    const foreign = state(session);
    foreign.status = 'paused';
    foreign[field] = field === 'harness' ? 'claude' : 'other-native-session';
    const file = stateFileForTest({harness: 'codex', root_session_id: session, state_root: stateRoot});
    const before = JSON.stringify(foreign);
    writeFileSync(file, before);
    const recoveredForeign = recoverActivation({harness: 'codex', root_session_id: session,
      root_anchor: {model: 'gpt-5.6-sol', source: 'trusted-native-transcript'},
      release_digest: foreign.release_digest, expected_activation_id: foreign.activation_id,
      expected_root_generation: foreign.root_generation, state_root: stateRoot});
    equal(recoveredForeign.disposition, 'REFUSE', `recovery rejects a foreign ${field} inside the state file`);
    equal(readFileSync(file, 'utf8'), before, `foreign ${field} state bytes are not modified by recovery`);
    equal(recoveryPre(session, rootTranscript(session)).hookSpecificOutput.permissionDecision, 'deny',
      `native recovery cannot borrow a foreign ${field} record`);
    equal(readFileSync(file, 'utf8'), before, `native refusal leaves foreign ${field} bytes unchanged`);
  }
  const foreignWorkspace = join(scratch, 'foreign-workspace');
  mkdirSync(foreignWorkspace);
  assert.equal(spawnSync('git', ['init', '-q', foreignWorkspace], {encoding: 'utf8'}).status, 0);
  for (const field of ['metaCwd', 'contextCwd', 'payloadCwd']) {
    for (const paused of [false, true]) {
      const session = `root-recovery-cwd-${field}-${paused ? 'paused' : 'missing'}`;
      if (paused) {
        start(session);
        run({hook_event_name: 'SessionEnd', session_id: session, cwd: ROOT});
      }
      const before = state(session);
      const path = rootTranscript(session, field === 'payloadCwd' ? {} : {[field]: foreignWorkspace});
      equal(recoveryPre(session, path, field === 'payloadCwd' ? {cwd: foreignWorkspace} : {})
        .hookSpecificOutput.permissionDecision, 'deny', `${field} from another checkout cannot recover`);
      equal(recoveryRunner(session, path, field === 'payloadCwd' ? {cwd: foreignWorkspace} : {})
        .hookSpecificOutput.permissionDecision, 'deny', `runner ${field} from another checkout cannot recover`);
      equal(state(session), before, `${field} mismatch cannot create or overwrite activation state`);
    }
  }
  const subdirectorySession = 'root-recovery-subdirectory';
  const subdirectory = join(ROOT, 'scripts');
  equal(recoveryPre(subdirectorySession, rootTranscript(subdirectorySession,
    {metaCwd: subdirectory, contextCwd: subdirectory}), {cwd: subdirectory})
    .hookSpecificOutput.permissionDecision, 'allow',
    'native cwd below this Git checkout resolves to the same workspace identity');
  const profileFixture = allocateFixtureRoot('/private/tmp/host-launch-model-profile-');
  profileFixtures.push(profileFixture);
  const profileRoot = join(profileFixture, 'gstack');
  cpSync(ROOT, profileRoot, {recursive: true});
  // Use the unchanged authority implementation from the repository, whose
  // existing protected OS-temp HostLaunch fixture contract applies to this root.
  writeFileSync(join(profileRoot, '.claude/hooks/lib/event-attestation.mjs'),
    `export * from ${JSON.stringify(join(repo, '.claude/hooks/lib/event-attestation.mjs'))};\n`);
  const profileHome = join(profileFixture, 'sidecar');
  const profileSessions = join(profileHome, 'sessions');
  const profileJournal = join(profileRoot, '.claude/host-launch');
  const profileStore = join(profileFixture, 'child-store');
  const profileChildHome = join(profileFixture, 'child-home');
  for (const folder of [profileSessions, profileJournal, profileStore, profileChildHome]) {
    mkdirSync(folder, {recursive: true, mode: 0o700});
  }
  const profileEnv = {...env, TMPDIR: profileFixture, CODEX_HOME: profileHome, LUCA_MODEL_ROUTE_TRANSCRIPT_ROOT: '',
    LUCA_CHILD_PROJECT_STORE_ROOT: profileStore, LUCA_CHILD_PROJECT_TEST_CODEX_HOME: profileChildHome};
  const profileRun = payload => {
    const result = spawnSync(process.execPath, [join(profileRoot, '.codex/model-route-hook.mjs')],
      {cwd: profileRoot, env: profileEnv, encoding: 'utf8', input: JSON.stringify({...payload, cwd: profileRoot})});
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const grantProfile = (session, grantSession = session) => {
    const launch = randomUUID(), homeStat = statSync(profileHome);
    const bytes = Buffer.from(JSON.stringify({schemaVersion: 1, provider: 'codex',
      launchId: launch, sessionId: grantSession, cwd: profileRoot,
      sourceRoot: {realpath: profileHome, dev: String(homeStat.dev), ino: String(homeStat.ino)}}));
    writeFileSync(join(profileJournal, `${launch}.source.json`), bytes, {mode: 0o600});
    writeFileSync(join(profileRoot, '.claude', `.session-project-${session}`), JSON.stringify({
      schema_version: 3, state: 'NO_PIN', session_id: session,
      host_launch_source: {launch_id: launch, sha256: createHash('sha256').update(bytes).digest('hex')},
      event_control: {candidates: [], current: null, cursor: null, consumed_events: []},
    }));
  };
  for (const variant of ['correct-home', 'wrong-home', 'foreign-sid']) {
    const session = `root-profile-${variant}`, agent = `agent-profile-${variant}`;
    profileRun({hook_event_name: 'SessionStart', session_id: session, model: 'gpt-5.6-sol', source: 'startup'});
    grantProfile(session, variant === 'foreign-sid' ? 'other-native-session' : session);
    const nativeRoot = join(profileSessions, `rollout-2026-10-01T01-00-00-${session}.jsonl`);
    cpSync(rootTranscript(session, {metaCwd: profileRoot, contextCwd: profileRoot}), nativeRoot);
    const before = state(session);
    const dispatched = profileRun({hook_event_name: 'PreToolUse', session_id: session, turn_id: 'turn-root',
      tool_use_id: `tool-${variant}`, tool_name: 'spawn_agent',
      transcript_path: nativeRoot,
      tool_input: {task_name: 'review', message: 'judge', agent_type: 'quality-gate'}});
    if (variant === 'foreign-sid') {
      equal(dispatched.hookSpecificOutput.permissionDecision, 'deny',
        'another session source grant cannot refresh an active model anchor');
      equal(state(session), before, 'foreign source grant leaves active authority unchanged');
      continue;
    }
    equal(dispatched.hookSpecificOutput.permissionDecision, 'allow',
      'authenticated current profile evidence permits dispatch from an existing activation');
    profileRun({hook_event_name: 'SubagentStart', session_id: session, agent_id: agent, agent_type: 'quality-gate'});
    const original = transcript({sessionId: session, agentId: agent, agentType: 'quality-gate', model: 'gpt-6-astra'});
    const granted = join(profileSessions, `${agent}.jsonl`);
    cpSync(original, granted);
    const stopped = profileRun({hook_event_name: 'SubagentStop', session_id: session,
      agent_id: agent, agent_type: 'quality-gate', agent_transcript_path: variant === 'wrong-home' ? original : granted,
      stop_hook_active: false, last_assistant_message: 'done'});
    equal(variant === 'correct-home' ? stopped : stopped.continue,
      variant === 'correct-home' ? {} : false,
      `model completion ${variant} is bounded by the exact protected App source grant`);
  }
  const unsupportedProfile = 'root-profile-missing';
  grantProfile(unsupportedProfile);
  const profileRootTranscript = join(profileSessions, `rollout-2026-10-01T01-00-00-${unsupportedProfile}.jsonl`);
  const rootEvents = readFileSync(rootTranscript(unsupportedProfile), 'utf8').replaceAll(ROOT, profileRoot);
  writeFileSync(profileRootTranscript, rootEvents);
  equal(profileRun({hook_event_name: 'PreToolUse', session_id: unsupportedProfile, turn_id: 'turn-root',
    tool_use_id: 'tool-profile-missing', tool_name: 'spawn_agent', transcript_path: profileRootTranscript,
    tool_input: {task_name: 'work', message: 'work'}}).hookSpecificOutput.permissionDecision, 'deny',
    'unsupported provider child source refuses missing recovery before writing activation');
  equal(state(unsupportedProfile), null, 'unsupported provider recovery creates no activation state');
  for (const variant of ['ungranted', 'paused']) {
    const session = `root-provider-${variant}`;
    if (variant === 'paused') {
      profileRun({hook_event_name: 'SessionStart', session_id: session, model: 'gpt-5.6-sol', source: 'startup'});
      grantProfile(session);
      profileRun({hook_event_name: 'SessionEnd', session_id: session});
    }
    const before = state(session);
    const path = join(profileSessions, `rollout-2026-10-01T01-00-00-${session}.jsonl`);
    writeFileSync(path, readFileSync(rootTranscript(session), 'utf8').replaceAll(ROOT, profileRoot));
    equal(profileRun({hook_event_name: 'PreToolUse', session_id: session, turn_id: 'turn-root',
      tool_use_id: `tool-${variant}`, tool_name: 'spawn_agent', transcript_path: path,
      tool_input: {task_name: 'work', message: 'work'}}).hookSpecificOutput.permissionDecision, 'deny',
      `${variant} CODEX_HOME cannot authorize unsupported model recovery`);
    equal(profileRun({hook_event_name: 'PreToolUse', session_id: session, turn_id: 'turn-root',
      tool_use_id: `tool-runner-${variant}`, tool_name: 'Bash', transcript_path: path,
      tool_input: {command: 'node .codex/workflow-runner.mjs external-skill-scout'}})
      .hookSpecificOutput.permissionDecision, 'deny', `runner refuses unsupported ${variant} CODEX_HOME recovery`);
    equal(state(session), before, `${variant} provider refusal preserves missing or paused activation state`);
  }
  const noPinSession = 'root-no-pin-forwarded';
  start(noPinSession);
  queueProjectEventCandidate({gstackRoot: ROOT, sessionId: noPinSession,
    boundaryId: 'previous-human-turn', cwd: ROOT, harness: 'codex',
    prompt: 'Earlier framework request', intent: {kind: 'turn'}});
  const noPinFile = join(ROOT, '.claude', `.session-project-${noPinSession}`);
  const noPinBefore = readFileSync(noPinFile, 'utf8');
  const noPinPre = pre(noPinSession,
    {task_name: 'framework_review', message: 'authorized framework review',
      agent_type: 'quality-gate'}, 'tool-no-pin-review');
  equal(noPinPre.hookSpecificOutput.permissionDecision, 'allow',
    `NO_PIN framework review does not require project-event attestation: ${noPinPre.hookSpecificOutput.permissionDecisionReason}`);
  equal(readFileSync(noPinFile, 'utf8'), noPinBefore,
    'NO_PIN review neither consumes the candidate nor creates project authority');
  equal(existsSync(join(childStore, createHash('sha256').update(ROOT).digest('hex'), noPinSession)),
    false, 'NO_PIN review produces no child project receipt');
  subStart(noPinSession, 'agent-no-pin-review', 'quality-gate');
  equal(subStop(noPinSession, 'agent-no-pin-review', 'quality-gate', transcript({
    sessionId: noPinSession, agentId: 'agent-no-pin-review', agentType: 'quality-gate',
    model: 'gpt-6-astra',
  })), {}, 'framework review still requires matching model adoption and same-call completion');
  const invalidNoPinSession = 'root-invalid-no-pin';
  start(invalidNoPinSession);
  writeFileSync(join(ROOT, '.claude', `.session-project-${invalidNoPinSession}`),
    JSON.stringify({schema_version: 2, state: 'NO_PIN', session_id: invalidNoPinSession,
      binding: {project: 'forged'}}));
  equal(pre(invalidNoPinSession, {task_name: 'bad_identity', message: 'review'}, 'tool-invalid-no-pin')
    .hookSpecificOutput.permissionDecision, 'deny', 'NO_PIN carrying a project identity is refused');
  equal(Object.keys(state(invalidNoPinSession).invocations).length, 0,
    'invalid NO_PIN creates no pending model invocation');
  const malformedNoPinSession = 'root-malformed-no-pin';
  start(malformedNoPinSession);
  const malformedNoPin = JSON.parse(noPinBefore);
  malformedNoPin.session_id = malformedNoPinSession;
  malformedNoPin.event_control.candidates[0].session_id = malformedNoPinSession;
  malformedNoPin.event_control.candidates[0].boundary_id = '';
  writeFileSync(join(ROOT, '.claude', `.session-project-${malformedNoPinSession}`),
    JSON.stringify(malformedNoPin));
  equal(pre(malformedNoPinSession, {task_name: 'malformed', message: 'review'}, 'tool-malformed-no-pin')
    .hookSpecificOutput.permissionDecision, 'deny', 'malformed NO_PIN event control remains refused');
  const scopeCheck = spawnSync(process.execPath, [join(repo, '.claude/hooks/project-scope-guard.mjs')], {
    cwd: ROOT, encoding: 'utf8', env: {...env, CLAUDE_PROJECT_DIR: ROOT, LUCA_ACTUAL_HARNESS: 'claude'},
    input: JSON.stringify({session_id: noPinSession, turn_id: 'turn-root', cwd: ROOT,
      tool_name: 'Read', tool_input: {file_path: 'docs/private-project.md'}}),
  });
  equal(JSON.parse(scopeCheck.stdout).hookSpecificOutput.permissionDecision, 'deny',
    'unbound framework reviewer still cannot access shared project paths');
  const renewalSession = 'root-renewal';
  start(renewalSession);
  const oldActivationId = state(renewalSession).activation_id;
  start(renewalSession, 'gpt-5.6-sol', 'resume');
  equal(state(renewalSession).activation_id !== oldActivationId, true,
    'a resumed root session creates a new activation');
  const rootDigest = createHash('sha256').update(ROOT).digest('hex');
  const activationDigest = createHash('sha256').update(oldActivationId).digest('hex');
  equal(existsSync(join(childStore, rootDigest, 'revocations',
    `${renewalSession}-${activationDigest}.revoked.json`)), true,
  'a new activation permanently tombstones the old generation');
  const anchorSession = 'root-anchor';
  start(anchorSession);
  equal(state(anchorSession).root_anchor.model, 'gpt-5.6-sol', 'SessionStart pins root anchor');
  const failedProjectObservation = run({
    hook_event_name: 'PreToolUse', session_id: anchorSession, turn_id: 'turn-root',
    tool_use_id: 'tool-bad-cwd', tool_name: 'spawn_agent',
    tool_input: {task_name: 'bad_cwd', message: 'work'},
    transcript_path: rootTranscript(anchorSession),
    permission_mode: 'default', cwd: join(scratch, 'missing-cwd'), model: 'gpt-5.6-sol',
  });
  equal(failedProjectObservation.hookSpecificOutput.permissionDecision, 'deny',
    'unavailable project observation denies the spawn');
  equal(Object.values(state(anchorSession).invocations).length, 0,
    'failed project observation leaves no pending model invocation');
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

  for (const shape of ['top-level', 'event-msg']) {
    for (const scope of ['historical', 'current', 'unattributed']) {
      const session = `root-abort-${shape}-${scope}`;
      const agentId = `agent-${shape}-${scope}`;
      start(session);
      pre(session, {task_name: 'review', message: 'judge', agent_type: 'quality-gate'},
        `tool-${shape}-${scope}`);
      subStart(session, agentId, 'quality-gate');
      const file = transcript({sessionId: session, agentId, agentType: 'quality-gate',
        model: 'gpt-6-astra', complete: false});
      const events = readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const turnId = scope === 'historical' ? 'old-cancelled-turn' : `turn-${agentId}`;
      const abort = {type: shape === 'top-level' ? 'turn_aborted' : 'event_msg', payload: {
        ...(shape === 'event-msg' ? {type: 'turn_aborted'} : {}),
        ...(scope === 'unattributed' ? {} : {turn_id: turnId}),
      }};
      if (scope === 'historical') events.splice(1, 0, abort);
      else events.push(abort);
      writeFileSync(file, `${events.map(event => JSON.stringify(event)).join('\n')}\n`);
      const stopped = subStop(session, agentId, 'quality-gate', file);
      if (scope === 'historical') {
        equal(stopped, {}, `${shape} cancellation from a prior turn does not reject current success`);
        equal(state(session).critical_failure, false, 'historical cancellation does not latch current activation');
        equal(Object.values(state(session).invocations)[0].status, 'accepted',
          'successful resumed subagent evidence is persisted');
      } else {
        equal(stopped.continue, false, `${shape} ${scope} cancellation refuses completion evidence`);
        equal(state(session).critical_failure, true, `${scope} cancellation retains the critical failure latch`);
      }
      equal(pre(session, {task_name: 'later', message: 'work'}, `tool-later-${shape}-${scope}`)
        .hookSpecificOutput.permissionDecision, scope === 'historical' ? 'allow' : 'deny',
      'only a successful current turn permits subsequent dispatch');
    }
  }

  // A role/type is reusable; correlation still requires distinct invocation and agent IDs.
  for (const suffix of ['two', 'three']) {
    equal(pre(anchorSession, {task_name: suffix, message: 'work'}, `tool-${suffix}`)
      .hookSpecificOutput.permissionDecision, 'allow', 'same type may dispatch again after a completed call');
    subStart(anchorSession, `agent-${suffix}`, 'default');
    equal(subStop(anchorSession, `agent-${suffix}`, 'default', transcript({
      sessionId: anchorSession, agentId: `agent-${suffix}`, agentType: 'default', model: 'gpt-5.6-sol',
    })), {}, 'same-type calls have independently accepted evidence');
  }
  equal(pre(anchorSession, {task_name: 'duplicate', message: 'work'}, 'tool-anchor')
    .hookSpecificOutput.permissionDecisionReason, 'model-route correlation failed: EXTERNAL_IDENTITY_DUPLICATE',
  'reusing a tool ID is still refused');
  equal(Object.values(state(anchorSession).invocations).filter(call => call.status === 'pending').length,
    0, 'a denied dispatch does not poison subsequent calls');
  equal(pre(anchorSession, {task_name: 'after-denial', message: 'work'}, 'tool-after-denial')
    .hookSpecificOutput.permissionDecision, 'allow', 'a fresh noncritical dispatch works after a denial');

  const peakSession = 'root-peak';
  start(peakSession);
  const peakPre = pre(peakSession, {task_name: 'review', message: 'judge', agent_type: 'quality-gate', fork_turns: 'all', reasoning_effort: 'high'}, 'tool-peak', 'collaborationspawn_agent');
  const peakInput = peakPre.hookSpecificOutput.updatedInput;
  equal(peakInput.model, 'gpt-6-astra', 'critical native scene selects peak model');
  equal(peakInput.fork_turns, 'none', 'explicit cross-model child uses a supported fork mode');
  equal(peakInput.reasoning_effort, 'high', 'routing never changes explicit effort');
  for (const [suffix, rootModel, fork] of [
    ['same-model', 'gpt-6-astra', 'all'],
    ['numeric-history', 'gpt-5.6-sol', '3'],
  ]) {
    const session = `root-cold-${suffix}`;
    start(session, rootModel);
    const cold = pre(session, {task_name: 'cold_review', message: 'judge',
      agent_type: 'quality-gate', fork_turns: fork, reasoning_effort: 'high'}, `tool-cold-${suffix}`);
    equal(cold.hookSpecificOutput.updatedInput.fork_turns, 'none',
      `critical review never inherits producer history (${suffix})`);
    equal(cold.hookSpecificOutput.updatedInput.reasoning_effort, 'high',
      `cold review preserves effort (${suffix})`);
  }
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

  // A bound critical ticket remains an obligation until evidence is persisted,
  // including when SubagentStop cannot acquire the state lock.
  for (const [suffix, adoptedModel] of [
    ['wrong-model', 'gpt-5.6-sol'], ['matching-model', 'gpt-6-astra'],
  ]) {
    const session = `root-native-stop-busy-${suffix}`;
    const agentId = `agent-native-stop-busy-${suffix}`;
    start(session);
    pre(session, {task_name: 'review', message: 'judge', agent_type: 'quality-gate'},
      `tool-native-stop-busy-${suffix}`);
    subStart(session, agentId, 'quality-gate');
    equal(pre(session, {task_name: 'while-reviewing', message: 'work'}, `tool-during-${suffix}`)
      .hookSpecificOutput.permissionDecision, 'deny',
      'bound critical native work blocks further dispatch until evidence closes');
    const path = transcript({sessionId: session, agentId, agentType: 'quality-gate', model: adoptedModel});
    const lock = `${stateFileForTest({harness: 'codex', root_session_id: session, state_root: stateRoot})}.lock`;
    writeFileSync(lock, 'native evidence contention');
    const stopped = spawnSync(process.execPath, [HOOK], {cwd: ROOT, encoding: 'utf8', env,
      input: JSON.stringify({hook_event_name: 'SubagentStop', session_id: session,
        agent_id: agentId, agent_type: 'quality-gate', agent_transcript_path: path,
        stop_hook_active: false, last_assistant_message: 'done', cwd: ROOT})});
    equal(stopped.status, 2, 'evidence I/O failure is explicit and nonzero');
    equal(stopped.stderr.includes('MODEL_ROUTE_STATE_BUSY'), true, 'the state lock fault was reached');
    rmSync(lock);
    equal(state(session).critical_failure, false, 'failed evidence persistence does not falsely claim a durable latch');
    equal(Object.values(state(session).invocations)[0].status, 'pending',
      'bound critical native ticket survives evidence persistence failure');
    equal(pre(session, {task_name: 'after-fault', message: 'work'}, `tool-after-stop-${suffix}`)
      .hookSpecificOutput.permissionDecision, 'deny', 'pending native evidence refuses later dispatch after lock recovery');
    equal(pre(session, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
      `tool-after-stop-runner-${suffix}`, 'Bash').hookSpecificOutput.permissionDecision, 'deny',
      'pending native evidence also refuses the runner Hook entry');
    const retry = subStop(session, agentId, 'quality-gate', path);
    if (adoptedModel === 'gpt-6-astra') {
      equal(retry, {}, 'retry can close the original invocation with matching evidence');
      equal(pre(session, {task_name: 'closed', message: 'work'}, `tool-after-closed-${suffix}`)
        .hookSpecificOutput.permissionDecision, 'allow', 'accepted evidence permits the next native dispatch');
      equal(pre(session, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
        `tool-after-closed-runner-${suffix}`, 'Bash').hookSpecificOutput.permissionDecision, 'allow',
        'accepted evidence permits runner entry');
    } else {
      equal(retry.continue, false, 'retried mismatching evidence is still refused');
      equal(state(session).critical_failure, true, 'retried mismatching evidence persists the failure latch');
    }
  }
  const parallelNoncritical = 'root-bound-noncritical';
  start(parallelNoncritical);
  pre(parallelNoncritical, {task_name: 'ordinary', message: 'work'}, 'tool-bound-noncritical');
  subStart(parallelNoncritical, 'agent-bound-noncritical', 'default');
  equal(pre(parallelNoncritical, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
    'tool-bound-noncritical-runner', 'Bash').hookSpecificOutput.permissionDecision, 'allow',
    'pending noncritical native evidence does not suspend the runner');
  equal(pre(parallelNoncritical, {task_name: 'ordinary-next', message: 'work'}, 'tool-bound-noncritical-next')
    .hookSpecificOutput.permissionDecision, 'allow', 'bound noncritical native work permits ordinary concurrency');

  const lightSession = 'root-light';
  start(lightSession);
  const lightPre = pre(lightSession, {task_name: 'mechanical', message: 'check', agent_type: 'preflight-agent'}, 'tool-light');
  equal(lightPre.hookSpecificOutput.updatedInput.model, 'gpt-5.6-luna', 'mechanical scene selects approved light model');

  for (const adopted of ['gpt-5.6-luna', 'gpt-5.6-sol']) {
    const sid = `root-collector-${adopted.replaceAll('.', '-')}`, aid = `collector-${adopted.replaceAll('.', '-')}`;
    start(sid);
    const input = {task_name: 'facts', message: 'bounded lookup', agent_type: 'fact-collector',
      fork_turns: 'none', reasoning_effort: 'medium'};
    const routed = pre(sid, input, `tool-${aid}`);
    equal(routed.hookSpecificOutput.updatedInput.model, 'gpt-5.6-luna', 'collector selects approved light');
    equal(routed.hookSpecificOutput.updatedInput.reasoning_effort, 'medium', 'collector preserves explicit effort');
    subStart(sid, aid, 'fact-collector');
    subStop(sid, aid, 'fact-collector', transcript({sessionId: sid, agentId: aid,
      agentType: 'fact-collector', model: adopted}));
    equal(Object.values(state(sid).invocations)[0].status,
      adopted === 'gpt-5.6-luna' ? 'accepted' : 'refused', 'collector requires matching actual model');
  }
  const savedBindings = readFileSync(bindingsPath, 'utf8');
  for (const variant of ['missing-light', 'invalid-json', 'light-not-in-order']) {
    const sid = `root-col-${variant}`; start(sid);
    const binding = JSON.parse(savedBindings);
    if (variant === 'missing-light') delete binding.harnesses.codex.light_model;
    if (variant === 'light-not-in-order') binding.harnesses.codex.light_model = 'unlisted-light';
    writeFileSync(bindingsPath, variant === 'invalid-json' ? '{' : JSON.stringify(binding));
    const routed = pre(sid, {task_name: 'facts', message: 'lookup', agent_type: 'fact-collector'}, `tool-${variant}`);
    if (variant === 'light-not-in-order') {
      equal('model' in routed.hookSpecificOutput.updatedInput, false, 'valid binding with unordered light inherits anchor');
      equal(Object.values(state(sid).invocations)[0].requested_model, 'gpt-5.6-sol', 'fallback records the actual anchor');
    } else {
      equal(routed.hookSpecificOutput.permissionDecision, 'deny', 'broken binding remains denied at native entry');
    }
    writeFileSync(bindingsPath, savedBindings);
  }

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
  const unresolvedSession = 'root-unresolved-workflow';
  start(unresolvedSession);
  const unresolvedState = state(unresolvedSession);
  unresolvedState.invocations['workflow-pending'] = {
    status: 'pending', critical: true, route_harness: 'codex-cli',
  };
  writeFileSync(stateFileForTest({harness: 'codex', root_session_id: unresolvedSession, state_root: stateRoot}),
    JSON.stringify(unresolvedState));
  equal(pre(unresolvedSession, {task_name: 'after-io-failure', message: 'work'}, 'tool-unresolved-native')
    .hookSpecificOutput.permissionDecision, 'deny',
    'unresolved critical workflow evidence blocks later native dispatch');
  equal(pre(unresolvedSession, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
    'tool-unresolved-runner', 'Bash').hookSpecificOutput.permissionDecision, 'deny',
    'unresolved critical workflow evidence blocks the runner entry');

  const reserveBusy = 'root-reserve-busy';
  start(reserveBusy, 'gpt-6.1-sol');
  const reserveBusyLock = `${stateFileForTest({harness: 'codex', root_session_id: reserveBusy, state_root: stateRoot})}.lock`;
  writeFileSync(reserveBusyLock, 'busy fixture');
  const reserveDenied = pre(reserveBusy,
    {task_name: 'reserve_busy', message: 'judge', agent_type: 'quality-gate'}, 'tool-reserve-busy');
  equal(reserveDenied.hookSpecificOutput.permissionDecision, 'deny', 'unavailable durable preparation refuses dispatch');
  equal(reserveDenied.hookSpecificOutput.permissionDecisionReason.includes('MODEL_ROUTE_STATE_BUSY'), true,
    'reservation failure stops before reading model relations');
  equal(reserveDenied.hookSpecificOutput.permissionDecisionReason.includes('approved_order:'), false,
    'unknown relation resolver was not run before reservation succeeded');
  rmSync(reserveBusyLock);
  equal(state(reserveBusy).critical_failure, false, 'unstarted routing is not falsely recorded as a critical failure');
  equal(pre(reserveBusy, {task_name: 'reserve_recovered', message: 'work'}, 'tool-reserve-recovered')
    .hookSpecificOutput.permissionDecision, 'allow', 'storage recovery can start an ordinary unattempted route');

  // Inject contention after a real durable reservation, before the unknown-model resolver fails.
  const hostFixture = join(ROOT, 'scripts/model-route-host.mjs');
  const originalHost = readFileSync(hostFixture, 'utf8');
  assert.equal(originalHost.includes('export function beginCriticalPreparation('), true);
  writeFileSync(hostFixture, originalHost.replace('export function beginCriticalPreparation(',
    'function fixtureBeginCriticalPreparation(') + `\nexport function beginCriticalPreparation(args) {\n  const result = fixtureBeginCriticalPreparation(args);\n  if (args.task_id.endsWith(':tool-preparation-latch-busy') && result.disposition === 'READY')\n    writeFileSync(stateFileForTest(args) + '.lock', 'post-reservation contention');\n  return result;\n}\n`);
  const preparationBusy = 'root-preparation-latch-busy';
  start(preparationBusy, 'gpt-6.1-sol');
  const preparedDenied = pre(preparationBusy,
    {task_name: 'preparation_latch_busy', message: 'judge', agent_type: 'quality-gate'},
    'tool-preparation-latch-busy');
  equal(preparedDenied.hookSpecificOutput.permissionDecision, 'deny', 'unknown relation still refuses when failure writing is busy');
  equal(preparedDenied.hookSpecificOutput.permissionDecisionReason.includes('persistence unavailable'), true,
    'native hook explicitly reports unpersisted failure');
  equal(state(preparationBusy).critical_failure, false, 'test distinguishes intent from a persisted failure latch');
  equal(Object.values(state(preparationBusy).preparations).filter(call => call.status === 'pending').length,
    1, 'durable preparation intent survives failure-state write contention');
  rmSync(`${stateFileForTest({harness: 'codex', root_session_id: preparationBusy, state_root: stateRoot})}.lock`);
  writeFileSync(hostFixture, originalHost);
  equal(pre(preparationBusy, {task_name: 'after_preparation_busy', message: 'work'}, 'tool-after-preparation-busy')
    .hookSpecificOutput.permissionDecision, 'deny', 'pending preparation blocks later native dispatch after contention clears');
  equal(pre(preparationBusy, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
    'tool-after-preparation-runner', 'Bash').hookSpecificOutput.permissionDecision, 'deny',
    'pending preparation blocks later runner entry after contention clears');
  const unresolvedActivation = state(preparationBusy).activation_id;
  start(preparationBusy, 'gpt-6-astra', 'compact');
  equal(state(preparationBusy).activation_id, unresolvedActivation,
    'compact model change preserves the same activation');
  equal(state(preparationBusy).critical_failure, true,
    'compact model change preserves unresolved critical obligations as a blocking latch');
  equal(pre(preparationBusy, {task_name: 'after_compact', message: 'work'}, 'tool-after-compact')
    .hookSpecificOutput.permissionDecision, 'deny', 'compact cannot unlock later native dispatch');
  equal(pre(preparationBusy, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
    'tool-after-compact-runner', 'Bash').hookSpecificOutput.permissionDecision, 'deny',
    'compact cannot unlock the runner entry');
  start(preparationBusy, 'gpt-6-astra', 'resume');
  equal(state(preparationBusy).critical_failure, false, 'normal new activation can recover compact-blocked work');
  equal(pre(preparationBusy, {task_name: 'new_activation', message: 'work'}, 'tool-new-activation')
    .hookSpecificOutput.permissionDecision, 'allow', 'new activation starts an ordinary invocation');

  // B reads an empty snapshot, then A fully dispatches and binds before B resumes.
  // The host lock, rather than that stale snapshot, must decide admission.
  assert.equal(originalHost.includes('export function readActivation('), true);
  writeFileSync(hostFixture, originalHost.replace('export function readActivation(',
    'function fixtureReadActivation(') + `\nimport {spawnSync as fixtureSpawnSync} from 'node:child_process';\nexport function readActivation(args) {\n  const snapshot = fixtureReadActivation(args);\n  if (args.root_session_id.startsWith('root-native-race-') && snapshot\n      && Object.keys(snapshot.invocations).length === 0\n      && process.env.LUCA_MODEL_ROUTE_INTERLEAVE_CHILD !== '1') {\n    const env = {...process.env, LUCA_MODEL_ROUTE_INTERLEAVE_CHILD: '1'};\n    const payload = {hook_event_name: 'PreToolUse', session_id: args.root_session_id,\n      turn_id: 'turn-root', tool_use_id: 'tool-interleave-first', tool_name: 'spawn_agent',\n      tool_input: {task_name: 'first-review', message: 'judge', agent_type: 'quality-gate'},\n      permission_mode: 'default', cwd: ${JSON.stringify(ROOT)},\n      transcript_path: ${JSON.stringify(transcriptRoot)} + '/rollout-2026-10-01T01-00-00-' + args.root_session_id + '.jsonl'};\n    const first = fixtureSpawnSync(process.execPath, [${JSON.stringify(HOOK)}],\n      {cwd: ${JSON.stringify(ROOT)}, env, encoding: 'utf8', input: JSON.stringify(payload)});\n    if (first.status !== 0 || JSON.parse(first.stdout).hookSpecificOutput.permissionDecision !== 'allow')\n      throw new Error('interleaved first dispatch failed: ' + first.stderr);\n    const bound = fixtureSpawnSync(process.execPath, [${JSON.stringify(HOOK)}],\n      {cwd: ${JSON.stringify(ROOT)}, env, encoding: 'utf8', input: JSON.stringify({\n        hook_event_name: 'SubagentStart', session_id: args.root_session_id,\n        agent_id: 'agent-interleave-first', agent_type: 'quality-gate', cwd: ${JSON.stringify(ROOT)}})});\n    if (bound.status !== 0) throw new Error('interleaved agent binding failed: ' + bound.stderr);\n  }\n  return snapshot;\n}\n`);
  for (const agentType of ['quality-gate', 'default']) {
    const session = `root-native-race-${agentType}`;
    start(session);
    const second = pre(session, {task_name: 'second', message: 'work', agent_type: agentType},
      'tool-interleave-second');
    equal(second.hookSpecificOutput.permissionDecision, 'deny',
      `locked admission rejects a stale ${agentType} snapshot after a critical native dispatch`);
    equal(second.hookSpecificOutput.permissionDecisionReason.includes('UNRESOLVED_CRITICAL_INVOCATION'), true,
      'locked admission reports the existing critical obligation');
    equal(Object.keys(state(session).invocations).length, 1, 'interleaving creates only the first invocation');
    equal(Object.values(state(session).preparations).filter(call => call.status === 'pending').length, 0,
      'blocked stale admission neither reserves nor consumes another preparation');
    equal(state(session).critical_failure, false, 'waiting for existing evidence is not a failed critical route');
  }
  writeFileSync(hostFixture, originalHost);

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

  const seriesSession = 'root-six-series';
  start(seriesSession, 'gpt-6-sol');
  const deniedSeries = pre(seriesSession,
    {task_name: 'six-review', message: 'judge', agent_type: 'quality-gate'}, 'tool-six-denied');
  equal(deniedSeries.hookSpecificOutput.permissionDecision, 'deny', 'unlisted 6-series anchor fails closed');
  equal(deniedSeries.hookSpecificOutput.permissionDecisionReason.includes('approved_order: gpt-6-sol'), true,
    'missing model diagnostic identifies the private binding entry to approve');
  equal(state(seriesSession).critical_failure, true,
    'critical native preparation failure persists the host activation latch');
  equal(pre(seriesSession, {task_name: 'after-critical-preparation', message: 'work'}, 'tool-six-latched')
    .hookSpecificOutput.permissionDecision, 'deny',
    'persisted preparation failure blocks later noncritical native dispatch');
  equal(pre(seriesSession, {command: 'node .codex/workflow-runner.mjs external-skill-scout'},
    'tool-six-runner-latched', 'Bash').hookSpecificOutput.permissionDecision, 'deny',
    'native preparation failure blocks the runner entry on the same activation');
  writeFileSync(bindingsPath, `${JSON.stringify({schema_version: 1, harnesses: {codex: {
    peak_model: 'gpt-6-astra', light_model: 'gpt-6-luna',
    approved_order: ['gpt-6-luna', 'gpt-6-sol', 'gpt-6-astra'],
  }}})}\n`, {mode: 0o600});
  equal(pre(seriesSession, {task_name: 'still-latched', message: 'work'}, 'tool-six-repaired-still-latched')
    .hookSpecificOutput.permissionDecision, 'deny', 'binding repair does not silently clear the critical failure');
  start(seriesSession, 'gpt-6-sol', 'resume');
  equal(state(seriesSession).critical_failure, false, 'normal new activation resets the failure latch');
  const repairedSeries = pre(seriesSession,
    {task_name: 'six-review', message: 'judge', agent_type: 'quality-gate', reasoning_effort: 'high'}, 'tool-six-approved');
  equal(repairedSeries.hookSpecificOutput.updatedInput.model, 'gpt-6-astra', 'approved 6-series peak is selected after explicit repair');
  subStart(seriesSession, 'agent-six-review', 'quality-gate');
  equal(subStop(seriesSession, 'agent-six-review', 'quality-gate', transcript({
    sessionId: seriesSession, agentId: 'agent-six-review', agentType: 'quality-gate', model: 'gpt-6-astra',
  })), {}, '6-series peak adopted evidence closes the repaired invocation');
  equal(pre(seriesSession, {task_name: 'six-light', message: 'check', agent_type: 'preflight-agent'}, 'tool-six-light')
    .hookSpecificOutput.updatedInput.model, 'gpt-6-luna', '6-series mechanical task selects approved light');
  start('root-six-anchor', 'gpt-6-sol');
  equal('model' in pre('root-six-anchor', {task_name: 'six-anchor', message: 'work'}, 'tool-six-anchor')
    .hookSpecificOutput.updatedInput, false, '6-series normal execution inherits sol');

  run({hook_event_name: 'SessionEnd', session_id: lightSession, reason: 'other', cwd: ROOT});
  equal(state(lightSession).status, 'paused', 'SessionEnd pauses activation');
} finally {
  for (const fixture of profileFixtures) releaseFixtureRoot(fixture, () => rmSync(fixture, {recursive: true, force: true}));
  rmSync(scratch, {recursive: true, force: true});
}

process.stdout.write(`PASS: ${checks} Codex native model-route hook checks\n`);
