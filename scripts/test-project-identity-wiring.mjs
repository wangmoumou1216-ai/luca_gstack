#!/usr/bin/env node
// Identity wiring integration: display symlinks and session identity are
// deliberately different projects. Every project-aware hook must follow the
// schema-v3 native-event binding (or fail closed), never infer identity from
// display state.
import assert from 'assert/strict';
import { createHash, randomUUID } from 'crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const HOOKS = join(REPO, '.claude', 'hooks');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'luca-identity-wiring-')));
const projectsRoot = join(root, 'roots');
mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });

function makeProject(name, node) {
  const project = join(projectsRoot, name);
  mkdirSync(join(project, 'docs'), { recursive: true });
  mkdirSync(join(project, '.luca'), { recursive: true });
  writeFileSync(join(project, '.luca', 'workflow-state.yaml'),
    `topic: "${name}"\nmode: "standalone"\nnodes:\n  ${node}:\n    status: IN_PROGRESS\niteration: 1\n`);
  writeFileSync(join(project, '.luca', 'current-topic.txt'), `${name}\n`);
  writeFileSync(join(project, 'docs', 'PROGRESS.md'), `# ${name} progress\n`);
  return project;
}

const boundProject = makeProject('bound-alpha', 'alpha-node');
const displayProject = makeProject('display-beta', 'beta-node');
symlinkSync(join(displayProject, 'docs'), join(root, 'docs'));
symlinkSync(join(displayProject, '.luca', 'workflow-state.yaml'), join(root, '.claude', 'workflow-state.yaml'));
symlinkSync(join(displayProject, '.luca', 'current-topic.txt'), join(root, '.claude', 'current-topic.txt'));

const SID = 'identity-wiring';
const INITIAL_BOUNDARY = 'boundary-identity-initial';
const NEXT_BOUNDARY = 'boundary-identity-next';
const st = statSync(boundProject);
const binding = {
  project: 'bound-alpha',
  epoch: 7,
  realpath: realpathSync(boundProject),
  dev: Number(st.dev),
  ino: Number(st.ino),
};
const statePath = join(root, '.claude', `.session-project-${SID}`);
const codexHome = join(root, 'codex-home');

function nativeEventId(sessionId, nativeId, anchorId) {
  const hash = createHash('sha256');
  for (const value of ['luca-native-event:v1:codex', sessionId, nativeId, anchorId]) {
    const bytes = Buffer.from(String(value), 'utf8');
    hash.update(Buffer.from(`${bytes.length}:`, 'ascii'));
    hash.update(bytes);
  }
  return `codex:${hash.digest('hex')}`;
}

function rolloutPath(sessionId) {
  const dir = join(codexHome, 'sessions', '2026', '09', '08');
  mkdirSync(dir, { recursive: true });
  return join(dir, `rollout-2026-09-08T00-00-00-${sessionId}.jsonl`);
}

function writeSessionMeta(sessionId) {
  const path = rolloutPath(sessionId);
  writeFileSync(path, `${JSON.stringify({
    type: 'session_meta',
    timestamp: '2026-09-08T00:00:00.000Z',
    payload: {
      id: sessionId,
      session_id: sessionId,
      cwd: root,
      thread_source: 'user',
      originator: 'codex-tui',
      parent_thread_id: null,
      forked_from_id: null,
    },
  })}\n`);
  return path;
}

function appendNativePair(path, { sessionId, boundaryId, prompt }) {
  const nativeId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  appendFileSync(path, [
    {
      type: 'response_item',
      timestamp: '2026-09-08T00:00:01.000Z',
      payload: {
        type: 'message', role: 'user', id: nativeId,
        content: [{ type: 'input_text', text: prompt }],
        internal_chat_message_metadata_passthrough: { turn_id: boundaryId },
      },
    },
    {
      type: 'event_msg',
      timestamp: '2026-09-08T00:00:01.001Z',
      payload: {
        type: 'item_completed', thread_id: sessionId, turn_id: boundaryId,
        item: { type: 'UserMessage', id: anchorId, content: [{ type: 'text', text: prompt }] },
      },
    },
  ].map(record => JSON.stringify(record)).join('\n') + '\n');
  return { nativeId, anchorId, eventId: nativeEventId(sessionId, nativeId, anchorId) };
}

function appendAssistantWitness(path, text) {
  appendFileSync(path, `${JSON.stringify({
    type: 'response_item',
    timestamp: '2026-09-08T00:00:02.000Z',
    payload: {
      type: 'message', role: 'assistant', id: `msg_${randomUUID()}`,
      content: [{ type: 'output_text', text }],
    },
  })}\n`);
}

function cursorAtEnd(path) {
  const bytes = readFileSync(path);
  const sourceStat = statSync(path, { bigint: true });
  return {
    schema_version: 1,
    harness: 'codex',
    transcript_path: realpathSync(path),
    dev: sourceStat.dev.toString(),
    ino: sourceStat.ino.toString(),
    byte_offset: bytes.length,
    record_index: bytes.toString('utf8').trimEnd().split('\n').length,
    prefix_sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const rollout = writeSessionMeta(SID);
const initialPrompt = 'continue the already bound project';
const initialNative = appendNativePair(rollout, {
  sessionId: SID,
  boundaryId: INITIAL_BOUNDARY,
  prompt: initialPrompt,
});

function activeState(epoch = binding.epoch) {
  return {
    schema_version: 3,
    state: 'TURN_ACTIVE',
    session_id: SID,
    binding,
    turn: { event_id: initialNative.eventId, boundary_id: INITIAL_BOUNDARY, epoch },
    event_control: {
      candidates: [],
      current: {
        event_id: initialNative.eventId,
        boundary_id: INITIAL_BOUNDARY,
        native_id: initialNative.nativeId,
        anchor_id: initialNative.anchorId,
        cwd: root,
        harness: 'codex',
        status: 'active',
        attested_at: '2026-09-08T00:00:01.001Z',
      },
      cursor: cursorAtEnd(rollout),
      consumed_events: [{
        event_id: initialNative.eventId,
        boundary_id: INITIAL_BOUNDARY,
        harness: 'codex',
        native_id: initialNative.nativeId,
        anchor_id: initialNative.anchorId,
      }],
    },
  };
}

function writeActive(epoch = binding.epoch) {
  writeFileSync(statePath, `${JSON.stringify({
    ...activeState(epoch),
  })}\n`);
}
writeActive();

const env = {
  ...process.env,
  CLAUDE_PROJECT_DIR: root,
  LUCA_GSTACK_ROOT: root,
  LUCA_PROJECTS_ROOT: projectsRoot,
  MEMORY_ROOT: root,
  ROUTE_GUARD_PROJECTS: 'bound-alpha,display-beta',
  SESSION_SYNC_FORCE_ON_STOP: '1',
  LUCA_ACTUAL_HARNESS: 'codex',
  LUCA_EVENT_ATTESTATION_TEST: '1',
  CODEX_HOME: codexHome,
};
for (const key of ['LUCA_HARNESS_ADAPTED', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']) delete env[key];

function run(hook, payload, timeout = 4000) {
  const r = spawnSync('node', [join(HOOKS, hook)], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    env,
    input: JSON.stringify(payload),
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', `${hook} timed out`);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r;
}
const json = value => JSON.parse(String(value).trim());

// PreToolUse follows the exact active binding, not display-beta.
{
  const r = run('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: SID,
    turn_id: INITIAL_BOUNDARY,
    cwd: root,
    tool_name: 'Read',
    tool_input: { file_path: 'docs/x.md' },
  });
  const firstScope = json(r.stdout);
  assert.ok(firstScope.hookSpecificOutput.updatedInput?.file_path,
    `expected initial bound redirect, got ${r.stdout}; stderr=${r.stderr}`);
  const redirected = firstScope.hookSpecificOutput.updatedInput.file_path;
  assert.equal(redirected, join(realpathSync(boundProject), 'docs', 'x.md'));
  assert.doesNotMatch(redirected, /display-beta/);
  console.log('PASS scope guard resolves attested schema-v3 identity, not display symlink');
}

// UserPromptSubmit may only queue native evidence and close the prior event.
// PreToolUse is the first point allowed to attest and materialize TURN_ACTIVE.
{
  const nextPrompt = '继续执行当前已绑定项目的 alpha-node';
  const nextNative = appendNativePair(rollout, {
    sessionId: SID,
    boundaryId: NEXT_BOUNDARY,
    prompt: nextPrompt,
  });
  run('route-guard.mjs', {
    hook_event_name: 'UserPromptSubmit',
    session_id: SID,
    turn_id: NEXT_BOUNDARY,
    cwd: root,
    prompt: nextPrompt,
  });
  const queued = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(queued.state, 'TURN_CLOSED');
  assert.equal(queued.binding.project, 'bound-alpha');
  assert.equal(queued.turn.epoch, queued.binding.epoch);
  assert.equal(queued.event_control.candidates.length, 1);
  assert.equal(queued.event_control.current.status, 'closed');
  assert.equal(queued.event_control.consumed_events.length, 1);

  const preTool = run('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: SID,
    turn_id: NEXT_BOUNDARY,
    cwd: root,
    tool_name: 'Read',
    tool_input: { file_path: 'docs/x.md' },
  });
  const redirected = json(preTool.stdout).hookSpecificOutput.updatedInput.file_path;
  assert.equal(redirected, join(realpathSync(boundProject), 'docs', 'x.md'));
  const next = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(next.state, 'TURN_ACTIVE');
  assert.equal(next.binding.project, 'bound-alpha');
  assert.equal(next.turn.event_id, nextNative.eventId);
  assert.equal(next.turn.boundary_id, NEXT_BOUNDARY);
  assert.equal(next.turn.epoch, next.binding.epoch);
  assert.equal(next.event_control.candidates.length, 0);
  assert.equal(next.event_control.current.native_id, nextNative.nativeId);
  assert.equal(next.event_control.current.status, 'active');
  assert.equal(next.event_control.consumed_events.length, 2);
  console.log('PASS route guard queues only; PreTool attestation rotates exact native-event snapshot');
}

// Stop attribution/checkpoint also follows bound-alpha and never display-beta.
{
  const assistantText = 'bound-alpha identity checkpoint complete';
  appendAssistantWitness(rollout, assistantText);
  writeFileSync(join(root, '.claude', `.session-edit-count-${SID}`), '1');
  const r = run('session-sync.mjs', {
    hook_event_name: 'Stop',
    session_id: SID,
    turn_id: NEXT_BOUNDARY,
    cwd: root,
    stop_hook_active: false,
    last_assistant_message: assistantText,
  });
  const reason = json(r.stdout).reason;
  assert.match(reason, /当前激活项目「bound-alpha」/);
  assert.doesNotMatch(reason, /display-beta/);
  assert.ok(existsSync(join(boundProject, 'docs', 'handoff')));
  assert.ok(!existsSync(join(displayProject, 'docs', 'handoff')));
  console.log('PASS Stop hook attribution/checkpoint follows exact turn identity');
}

// SessionStart reads bound context only when the epoch snapshot is valid.
{
  const r = run('session-restore.mjs', { session_id: SID, source: 'resume' });
  assert.match(r.stdout, /alpha-node/);
  assert.doesNotMatch(r.stdout, /beta-node|display-beta progress/);
  console.log('PASS SessionStart loads only validated bound project context');
}

// Corrupt the turn epoch: every project consumer must fail closed.
{
  const corrupt = JSON.parse(readFileSync(statePath, 'utf8'));
  corrupt.turn.epoch = binding.epoch - 1;
  writeFileSync(statePath, `${JSON.stringify(corrupt)}\n`);
  const guard = run('project-scope-guard.mjs', { session_id: SID, tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(json(guard.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const restore = run('session-restore.mjs', { session_id: SID, source: 'resume' });
  assert.doesNotMatch(restore.stdout, /alpha-node|beta-node/);
  assert.match(restore.stderr, /identity 无效|epoch snapshot/);
  console.log('PASS corrupt turn epoch is rejected across guard and startup');
}

// A different no-pin sid cannot inherit display-beta identity.
{
  const noPin = 'identity-no-pin';
  const noPinBoundary = 'boundary-no-pin';
  const noPinPrompt = '审查 luca_gstack route guard';
  const noPinRollout = writeSessionMeta(noPin);
  run('session-restore.mjs', {
    hook_event_name: 'SessionStart', source: 'startup', native_start_source: 'startup', session_id: noPin, cwd: root,
  });
  appendNativePair(noPinRollout, {
    sessionId: noPin,
    boundaryId: noPinBoundary,
    prompt: noPinPrompt,
  });
  run('route-guard.mjs', {
    hook_event_name: 'UserPromptSubmit',
    session_id: noPin,
    turn_id: noPinBoundary,
    cwd: root,
    prompt: noPinPrompt,
  });
  const guard = run('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: noPin,
    turn_id: noPinBoundary,
    cwd: root,
    tool_name: 'Read',
    tool_input: { file_path: 'docs/x.md' },
  });
  assert.equal(json(guard.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const noPinState = JSON.parse(readFileSync(join(root, '.claude', `.session-project-${noPin}`), 'utf8'));
  assert.equal(noPinState.schema_version, 3);
  assert.equal(noPinState.state, 'NO_PIN');
  assert.equal(noPinState.binding, undefined);
  assert.equal(noPinState.event_control.current.status, 'active');
  console.log('PASS NO_PIN never adopts display project identity');
}

// Static wiring guard: project consumers use the centralized substrate authority
// appropriate to their lifecycle point. PreToolUse additionally needs the active
// native-event check; the other consumers still validate the durable binding.
for (const [hook, authority] of [
  ['project-scope-guard.mjs', /activeProjectAuthority/],
  ['route-guard.mjs', /validatedBindingForState/],
  ['session-restore.mjs', /validatedBindingForState/],
  ['session-sync.mjs', /validatedBindingForState/],
]) {
  assert.match(readFileSync(join(HOOKS, hook), 'utf8'), authority,
    `${hook} must consume centralized event/binding authority validation`);
}
console.log('PASS project-aware hook wiring shares centralized event/binding authority');

console.log('\n=== test-project-identity-wiring summary: ALL PASS ===');
