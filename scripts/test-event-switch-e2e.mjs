#!/usr/bin/env node
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initializeProjectEventFence, queueProjectEventCandidate } from '../.claude/hooks/lib/project-substrate.mjs';

const REPO = process.cwd();
const SCOPE_GUARD = resolve(REPO, '.claude/hooks/project-scope-guard.mjs');
const SESSION_SYNC = resolve(REPO, '.claude/hooks/session-sync.mjs');
const PROJECT_SH = resolve(REPO, 'scripts/project.sh');

function makeProject(projects, name) {
  const root = join(projects, name);
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, '.luca'), { recursive: true });
  writeFileSync(join(root, 'docs', 'x.md'), `${name}\n`);
  writeFileSync(join(root, '.luca', 'workflow-state.yaml'), `topic: "${name}"\nnodes: {}\n`);
  writeFileSync(join(root, '.luca', 'current-topic.txt'), `${name}\n`);
  return root;
}

function appendNativeEvent(rollout, { session, cwd, boundary, prompt }, includeMeta = false) {
  const rows = [];
  if (includeMeta) {
    rows.push({
      type: 'session_meta',
      payload: {
        id: session,
        session_id: session,
        cwd,
        thread_source: 'user',
        originator: 'codex-tui',
        parent_thread_id: null,
        forked_from_id: null,
      },
    });
  }
  rows.push({
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'user',
      id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: boundary },
    },
  });
  rows.push({
    type: 'event_msg',
    payload: {
      type: 'item_completed',
      thread_id: session,
      turn_id: boundary,
      item: {
        type: 'UserMessage',
        id: randomUUID(),
        content: [{ type: 'text', text: prompt }],
      },
    },
  });
  appendFileSync(rollout, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}

function appendAssistantWitness(rollout, text) {
  appendFileSync(rollout, `${JSON.stringify({
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'assistant',
      id: `msg_${randomUUID()}`,
      content: [{ type: 'output_text', text }],
    },
  })}\n`);
}

function runHook(script, payload, env) {
  return spawnSync(process.execPath, [script], {
    cwd: REPO,
    env,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

const temp = realpathSync(mkdtempSync(join(tmpdir(), 'e3-switch-e2e-')));
try {
  const gstack = join(temp, 'gstack');
  const projects = join(temp, 'projects');
  const codexHome = join(temp, 'codex-home');
  const session = randomUUID();
  const boundary = `boundary-${randomUUID()}`;
  mkdirSync(join(gstack, '.claude', 'templates'), { recursive: true });
  mkdirSync(join(codexHome, 'sessions', '2026', '09', '08'), { recursive: true });
  writeFileSync(join(gstack, '.claude', 'templates', 'workflow-state.yaml'), 'topic: ""\nnodes: {}\n');
  const beta = makeProject(projects, 'beta');
  const rollout = join(
    codexHome,
    'sessions',
    '2026',
    '09',
    '08',
    `rollout-2026-09-08T00-00-00-${session}.jsonl`,
  );
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: gstack,
    LUCA_GSTACK_ROOT: gstack,
    LUCA_PROJECTS_ROOT: projects,
    LUCA_ACTUAL_HARNESS: 'codex',
    LUCA_EVENT_ATTESTATION_TEST: '1',
    CODEX_HOME: codexHome,
    SESSION_SYNC_BLOCK: '0',
    SESSION_SYNC_FORCE_ON_STOP: '0',
  };
  const statePath = join(gstack, '.claude', `.session-project-${session}`);
  const tx = randomUUID();
  const prompt = '切换到 beta 项目';
  initializeProjectEventFence({
    gstackRoot: gstack, projectsRoot: projects, sessionId: session,
    harness: 'codex', cwd: gstack, codexHome,
  });
  queueProjectEventCandidate({
    gstackRoot: gstack,
    projectsRoot: projects,
    sessionId: session,
    boundaryId: boundary,
    cwd: gstack,
    harness: 'codex',
    prompt,
    intent: { kind: 'switch', tx, operation: 'switch', target: 'beta', expected_epoch: 0 },
  });
  appendNativeEvent(rollout, { session, cwd: gstack, boundary, prompt }, true);

  const command = `./scripts/project.sh switch beta --session-id ${session} --tx ${tx} --expected-epoch 0`;
  const preTool = runHook(SCOPE_GUARD, {
    hook_event_name: 'PreToolUse',
    session_id: session,
    turn_id: boundary,
    cwd: gstack,
    transcript_path: null,
    tool_name: 'Bash',
    tool_input: { command },
  }, env);
  assert.equal(preTool.status, 0, preTool.stderr);
  assert.equal(preTool.stdout.trim(), '', `exact attested switch must pass: ${preTool.stdout}`);
  const prepared = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(prepared.state, 'SWITCH_ONLY');
  assert.equal(prepared.event_control.current.status, 'active');
  assert.equal(prepared.switch.event_id, prepared.event_control.current.event_id);

  const mutation = spawnSync('bash', [PROJECT_SH, 'switch', 'beta',
    '--session-id', session, '--tx', tx, '--expected-epoch', '0'], {
    cwd: REPO,
    env,
    encoding: 'utf8',
  });
  assert.equal(mutation.status, 0, mutation.stderr || mutation.stdout);
  const bound = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(bound.state, 'BOUND');
  assert.equal(bound.binding.project, 'beta');
  assert.equal(bound.terminal.event_id, prepared.event_control.current.event_id);
  assert.equal(bound.terminal.boundary_id, boundary);
  assert.equal('turn_id' in bound.terminal, false);
  assert.deepEqual(bound.event_control.cursor, prepared.event_control.cursor);
  assert.deepEqual(bound.event_control.consumed_events, prepared.event_control.consumed_events);

  const sameEventRead = runHook(SCOPE_GUARD, {
    hook_event_name: 'PreToolUse',
    session_id: session,
    turn_id: boundary,
    cwd: gstack,
    transcript_path: null,
    tool_name: 'Read',
    tool_input: { file_path: 'docs/x.md' },
  }, env);
  assert.equal(sameEventRead.status, 0, sameEventRead.stderr);
  assert.equal(JSON.parse(sameEventRead.stdout).hookSpecificOutput.permissionDecision, 'deny',
    'the switch event is terminal and cannot perform same-event project work');

  const assistantText = 'beta switch completed';
  appendAssistantWitness(rollout, assistantText);
  const stop = runHook(SESSION_SYNC, {
    hook_event_name: 'Stop',
    session_id: session,
    turn_id: boundary,
    cwd: gstack,
    transcript_path: null,
    stop_hook_active: false,
    last_assistant_message: assistantText,
  }, env);
  assert.equal(stop.status, 0, stop.stderr);
  const closed = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(closed.state, 'TURN_CLOSED');
  assert.equal(closed.binding.project, 'beta');
  assert.equal(closed.turn.event_id, bound.terminal.event_id);
  assert.equal(closed.event_control.current.status, 'closed');

  const nextPrompt = '继续 beta 项目';
  queueProjectEventCandidate({
    gstackRoot: gstack,
    projectsRoot: projects,
    sessionId: session,
    boundaryId: boundary,
    cwd: gstack,
    harness: 'codex',
    prompt: nextPrompt,
    intent: { kind: 'turn' },
  });
  appendNativeEvent(rollout, { session, cwd: gstack, boundary, prompt: nextPrompt });
  const nextRead = runHook(SCOPE_GUARD, {
    hook_event_name: 'PreToolUse',
    session_id: session,
    turn_id: boundary,
    cwd: gstack,
    transcript_path: null,
    tool_name: 'Read',
    tool_input: { file_path: 'docs/x.md' },
  }, env);
  assert.equal(nextRead.status, 0, nextRead.stderr);
  const nextOutput = JSON.parse(nextRead.stdout);
  assert.equal(nextOutput.hookSpecificOutput.updatedInput.file_path, join(realpathSync(beta), 'docs', 'x.md'));
  const active = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(active.state, 'TURN_ACTIVE');
  assert.notEqual(active.event_control.current.event_id, closed.event_control.current.event_id);
  assert.equal(active.event_control.consumed_events.length, 2);

  console.log('PASS attested switch commits BOUND, Stop closes it, and the next native event receives project authority');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
