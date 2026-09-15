#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attestNativeUserEvent, captureNativeEventFence } from '../.claude/hooks/lib/event-attestation.mjs';
import {
  attestPendingProjectEvent,
  queueProjectEventCandidate,
  initializeProjectEventFence,
} from '../.claude/hooks/lib/project-substrate.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const routeGuard = join(repoRoot, '.claude', 'hooks', 'route-guard.mjs');
const scopeGuard = join(repoRoot, '.claude', 'hooks', 'project-scope-guard.mjs');
const sessionSync = join(repoRoot, '.claude', 'hooks', 'session-sync.mjs');
const fixtureRoot = mkdtempSync(join(tmpdir(), 'e3-prompt-attestation-'));

function startupFence(gstack, projects, session, cwd, codexHome) {
  const prior = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return initializeProjectEventFence({ gstackRoot: gstack, projectsRoot: projects,
      sessionId: session, cwd, harness: 'codex', codexHome });
  } finally {
    if (prior === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = prior;
  }
}
const gstackRoot = join(fixtureRoot, 'gstack');
const projectsRoot = join(fixtureRoot, 'projects');
const hookStateDir = join(gstackRoot, '.claude');
const sessionId = `e3-${process.pid}-${randomUUID().slice(0, 8)}`;
const boundaryId = `boundary-${randomUUID()}`;

mkdirSync(hookStateDir, { recursive: true });
mkdirSync(projectsRoot, { recursive: true });

function submit(prompt) {
  return spawnSync(process.execPath, [routeGuard], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: JSON.stringify({
      hook_event_name: 'UserPromptSubmit',
      session_id: sessionId,
      turn_id: boundaryId,
      cwd: repoRoot,
      transcript_path: null,
      prompt,
    }),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: gstackRoot,
      LUCA_GSTACK_ROOT: gstackRoot,
      LUCA_PROJECTS_ROOT: projectsRoot,
      ROUTE_GUARD_CURRENT_PROJECT: '',
      ROUTE_GUARD_DRY_RUN: '0',
      ROUTE_GUARD_HEAVY_SKILLS: '',
      ROUTE_GUARD_PROJECTS: '',
    },
  });
}

function ownSessionSidecars() {
  return readdirSync(hookStateDir)
    .filter(name => name.startsWith('.session-') && name.includes(sessionId));
}

let failed = false;
try {
  const first = submit('继续执行 E3 的第一个红测');
  const second = submit('报告 E3 第一个红测的进度');

  for (const [ordinal, result] of [['first', first], ['second', second]]) {
    assert.equal(
      result.status,
      0,
      `SETUP FAILURE: ${ordinal} real route-guard invocation exited ${result.status}: ${result.stderr}`,
    );
    assert.doesNotMatch(
      result.stderr,
      /ERR_MODULE_NOT_FOUND|Cannot find module/,
      `SETUP FAILURE: ${ordinal} invocation could not load route-guard`,
    );
  }

  const consumedBoundaryFailure = second.stdout
    .split('\n')
    .find(line => line.includes('top-level turn id already consumed'));
  assert.equal(
    consumedBoundaryFailure,
    undefined,
    'OLD IMPLEMENTATION ROOT CAUSE: UserPromptSubmit consumed the transport boundary as event identity, '
      + `so a second distinct native-event candidate sharing that boundary was rejected; observed: ${consumedBoundaryFailure}`,
  );

  const legacyLedgerPath = join(hookStateDir, `.session-consumed-turns-${sessionId}`);
  if (existsSync(legacyLedgerPath)) {
    const legacyLedger = JSON.parse(readFileSync(legacyLedgerPath, 'utf8'));
    assert.ok(
      !Array.isArray(legacyLedger.consumed_turn_ids)
        || !legacyLedger.consumed_turn_ids.includes(boundaryId),
      'OLD IMPLEMENTATION ROOT CAUSE: boundary_id was persisted in consumed_turn_ids as though it were event_id',
    );
  }

  const queuedState = JSON.parse(readFileSync(
    join(hookStateDir, `.session-project-${sessionId}`),
    'utf8',
  ));
  assert.equal(queuedState.schema_version, 3);
  assert.equal(queuedState.event_control.candidates.length, 2,
    'both native-event candidates must remain ordered under the shared boundary');
  assert.equal(queuedState.event_control.consumed_events.length, 0,
    'UserPromptSubmit must not consume a transport boundary or unattested candidate');
  assert.notEqual(queuedState.state, 'TURN_ACTIVE',
    'queued candidates must not create project authority');

  console.log('PASS real UserPromptSubmit accepts two distinct event candidates under one shared boundary');
} catch (error) {
  failed = true;
  console.error('FAIL real UserPromptSubmit accepts two distinct event candidates under one shared boundary');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const name of ownSessionSidecars()) {
    rmSync(join(hookStateDir, name), { force: true, recursive: true });
  }
  const leaked = ownSessionSidecars();
  if (leaked.length) {
    console.error(`SETUP FAILURE: leaked owned sidecars: ${leaked.join(', ')}`);
    process.exitCode = 1;
  }
  rmSync(fixtureRoot, { force: true, recursive: true });
}

if (!failed && process.exitCode) process.exit(process.exitCode);

function runBoundPreToolTracer() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'e3-pretool-attestation-')));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const project = join(projects, 'projA');
  const claudeDir = join(gstack, '.claude');
  const codexHome = join(root, 'codex-home');
  const session = `e3-${process.pid}-${randomUUID().slice(0, 8)}`;
  const boundary = `boundary-${randomUUID()}`;
  const prompt = '继续 E3 native event attestation';
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '08');
  const rollout = join(rolloutDir, `rollout-2026-09-08T00-00-00-${session}.jsonl`);

  try {
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(join(project, 'docs'), { recursive: true });
    mkdirSync(rolloutDir, { recursive: true });
    writeFileSync(join(project, 'CONTEXT.md'), '# projA\n');
    const identityPath = realpathSync(project);
    const identityStat = statSync(identityPath);
    const binding = {
      project: 'projA', realpath: identityPath,
      dev: Number(identityStat.dev), ino: Number(identityStat.ino), epoch: 1,
    };
    writeFileSync(join(claudeDir, `.session-project-${session}`), `${JSON.stringify({
      schema_version: 2,
      state: 'BOUND',
      session_id: session,
      binding,
      terminal: {
        tx: 'seed-switch', operation: 'switch', expected_epoch: 0,
        turn_id: 'seed-boundary', committed_at: '2026-09-08T00:00:00.000Z',
      },
    })}\n`);
    startupFence(gstack, projects, session, repoRoot, codexHome);
    writeFileSync(rollout, [
      {
        type: 'session_meta', timestamp: '2026-09-08T00:00:00.000Z',
        payload: {
          id: session, session_id: session, cwd: repoRoot, source: 'cli',
          thread_source: 'user', originator: 'codex-tui', parent_thread_id: null,
          forked_from_id: null,
        },
      },
      {
        type: 'response_item', timestamp: '2026-09-08T00:00:01.000Z',
        payload: {
          type: 'message', role: 'user', id: sourceId,
          content: [{ type: 'input_text', text: prompt }],
          internal_chat_message_metadata_passthrough: { turn_id: boundary },
        },
      },
      {
        type: 'event_msg', timestamp: '2026-09-08T00:00:01.001Z',
        payload: {
          type: 'item_completed', thread_id: session, turn_id: boundary,
          item: { type: 'UserMessage', id: anchorId, content: [{ type: 'text', text: prompt }] },
        },
      },
    ].map(record => JSON.stringify(record)).join('\n') + '\n');

    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: gstack,
      LUCA_GSTACK_ROOT: gstack,
      LUCA_PROJECTS_ROOT: projects,
      LUCA_ACTUAL_HARNESS: 'codex',
      LUCA_EVENT_ATTESTATION_TEST: '1',
      CODEX_HOME: codexHome,
      ROUTE_GUARD_CURRENT_PROJECT: '',
      ROUTE_GUARD_DRY_RUN: '0',
      ROUTE_GUARD_HEAVY_SKILLS: '',
      ROUTE_GUARD_PROJECTS: 'projA',
      SESSION_SYNC_BLOCK: '0',
      SESSION_SYNC_FORCE_ON_STOP: '0',
    };
    const queued = spawnSync(process.execPath, [routeGuard], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, prompt,
      }),
      env,
    });
    assert.equal(queued.status, 0, `SETUP FAILURE: route queue failed: ${queued.stderr}`);
    const queuedState = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.notEqual(queuedState.state, 'TURN_ACTIVE', 'UserPromptSubmit alone must not create usable authority');

    const scoped = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, tool_name: 'Read',
        tool_input: { file_path: join(project, 'CONTEXT.md') },
      }),
      env,
    });
    assert.equal(scoped.status, 0, `SETUP FAILURE: scope hook failed: ${scoped.stderr}`);
    const output = scoped.stdout.trim() ? JSON.parse(scoped.stdout.trim()) : {};
    assert.notEqual(
      output?.hookSpecificOutput?.permissionDecision,
      'deny',
      'OLD IMPLEMENTATION ROOT CAUSE: PreToolUse did not attest the durable native source/anchor pair before project access; '
        + `observed=${JSON.stringify(output)} stderr=${scoped.stderr}`,
    );
    const active = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.equal(active.state, 'TURN_ACTIVE', 'PreToolUse must materialize TURN_ACTIVE only after native attestation');
    assert.ok(active.event_control?.current?.event_id, 'attested state must record native event_id');
    assert.notEqual(active.event_control.current.event_id, boundary, 'boundary_id must never become event_id');
    console.log('PASS PreToolUse lazily attests a durable Codex event before project access');

    const firstEventId = active.event_control.current.event_id;
    appendFileSync(rollout, `${JSON.stringify({
      type: 'response_item', timestamp: '2026-09-08T00:00:01.002Z',
      payload: {
        type: 'message', role: 'assistant', id: `msg_${randomUUID()}`,
        content: [{ type: 'output_text', text: 'done' }],
      },
    })}\n`);
    const firstStop = spawnSync(process.execPath, [sessionSync], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'Stop', session_id: session, turn_id: boundary, cwd: repoRoot,
        transcript_path: null, stop_hook_active: false, last_assistant_message: 'done',
      }),
    });
    assert.equal(firstStop.status, 0, firstStop.stderr);
    const firstClosedPath = join(claudeDir, `.session-project-${session}`);
    const firstClosed = JSON.parse(readFileSync(firstClosedPath, 'utf8'));
    assert.equal(firstClosed.state, 'TURN_CLOSED');
    assert.equal(firstClosed.event_control.current.event_id, firstEventId);
    assert.equal(firstClosed.event_control.current.status, 'closed');
    assert.equal(firstClosed.event_control.consumed_events.length, 1);
    const closedBytes = readFileSync(firstClosedPath, 'utf8');
    const repeatedStop = spawnSync(process.execPath, [sessionSync], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'Stop', session_id: session, turn_id: boundary, cwd: repoRoot,
        transcript_path: null, stop_hook_active: false, last_assistant_message: 'done',
      }),
    });
    assert.equal(repeatedStop.status, 0, repeatedStop.stderr);
    assert.equal(readFileSync(firstClosedPath, 'utf8'), closedBytes,
      'repeated Stop must not consume or rewrite an already closed event');
    console.log('PASS PreToolUse and Stop converge on one idempotent native event');

    const secondPrompt = '报告 E3 native event attestation 进度';
    const secondSourceId = `msg_${randomUUID()}`;
    const secondAnchorId = randomUUID();
    appendFileSync(rollout, [
      {
        type: 'response_item', timestamp: '2026-09-08T00:00:02.000Z',
        payload: {
          type: 'message', role: 'user', id: secondSourceId,
          content: [{ type: 'input_text', text: secondPrompt }],
          internal_chat_message_metadata_passthrough: { turn_id: boundary },
        },
      },
      {
        type: 'event_msg', timestamp: '2026-09-08T00:00:02.001Z',
        payload: {
          type: 'item_completed', thread_id: session, turn_id: boundary,
          item: { type: 'UserMessage', id: secondAnchorId, content: [{ type: 'text', text: secondPrompt }] },
        },
      },
    ].map(record => JSON.stringify(record)).join('\n') + '\n');
    const secondQueued = spawnSync(process.execPath, [routeGuard], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, prompt: secondPrompt,
      }),
      env,
    });
    assert.equal(secondQueued.status, 0, `SETUP FAILURE: second route queue failed: ${secondQueued.stderr}`);
    assert.doesNotMatch(
      secondQueued.stdout,
      /PROJECT STATE|already consumed|snapshot mismatch/,
      'OLD IMPLEMENTATION ROOT CAUSE: route-guard still closes an attested event through the legacy raw-turn snapshot',
    );
    const secondScoped = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, tool_name: 'Read',
        tool_input: { file_path: join(project, 'CONTEXT.md') },
      }),
      env,
    });
    assert.equal(secondScoped.status, 0, `SETUP FAILURE: second scope hook failed: ${secondScoped.stderr}`);
    const secondOutput = secondScoped.stdout.trim() ? JSON.parse(secondScoped.stdout.trim()) : {};
    assert.notEqual(secondOutput?.hookSpecificOutput?.permissionDecision, 'deny',
      `second native event sharing a boundary must be accepted: ${secondScoped.stderr}`);
    const secondActive = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.equal(secondActive.state, 'TURN_ACTIVE');
    assert.notEqual(secondActive.event_control.current.event_id, firstEventId,
      'two native events sharing one boundary must have different event_id values');
    assert.equal(secondActive.event_control.current.boundary_id, boundary);
    assert.equal(secondActive.event_control.consumed_events.length, 2,
      'both native events must be consumed exactly once');
    console.log('PASS two distinct native events sharing one boundary are independently accepted');

    const thirdSourceId = `msg_${randomUUID()}`;
    const thirdAnchorId = randomUUID();
    appendFileSync(rollout, [
      {
        type: 'response_item', timestamp: '2026-09-08T00:00:03.000Z',
        payload: {
          type: 'message', role: 'user', id: thirdSourceId,
          content: [{ type: 'input_text', text: secondPrompt }],
          internal_chat_message_metadata_passthrough: { turn_id: boundary },
        },
      },
      {
        type: 'event_msg', timestamp: '2026-09-08T00:00:03.001Z',
        payload: {
          type: 'item_completed', thread_id: session, turn_id: boundary,
          item: { type: 'UserMessage', id: thirdAnchorId, content: [{ type: 'text', text: secondPrompt }] },
        },
      },
    ].map(record => JSON.stringify(record)).join('\n') + '\n');
    const thirdQueued = spawnSync(process.execPath, [routeGuard], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, prompt: secondPrompt,
      }),
    });
    assert.equal(thirdQueued.status, 0, `third route queue failed: ${thirdQueued.stderr}`);
    const thirdScoped = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, tool_name: 'Read',
        tool_input: { file_path: join(project, 'CONTEXT.md') },
      }),
    });
    const thirdOutput = thirdScoped.stdout.trim() ? JSON.parse(thirdScoped.stdout.trim()) : {};
    assert.notEqual(thirdOutput?.hookSpecificOutput?.permissionDecision, 'deny', thirdScoped.stderr);
    const thirdActive = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.equal(thirdActive.event_control.consumed_events.length, 3);
    assert.notEqual(thirdActive.event_control.current.event_id, secondActive.event_control.current.event_id,
      'identical text must not collapse distinct native IDs');
    assert.equal(thirdActive.event_control.current.native_id, thirdSourceId);
    console.log('PASS identical text under one boundary remains distinct by native event IDs');

    const frozenCursor = JSON.stringify(thirdActive.event_control.cursor);
    const frozenLedger = JSON.stringify(thirdActive.event_control.consumed_events);
    const replayQueued = spawnSync(process.execPath, [routeGuard], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, prompt: secondPrompt,
      }),
    });
    assert.equal(replayQueued.status, 0, replayQueued.stderr);
    const replayScoped = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, tool_name: 'Read',
        tool_input: { file_path: join(project, 'CONTEXT.md') },
      }),
    });
    const replayOutput = replayScoped.stdout.trim() ? JSON.parse(replayScoped.stdout.trim()) : {};
    assert.equal(replayOutput?.hookSpecificOutput?.permissionDecision, 'deny',
      'exact native replay must not regain project authority');
    assert.match(replayScoped.stderr, /EVENT_REPLAY/, 'replay must be rejected for native event identity');
    const replayState = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.equal(JSON.stringify(replayState.event_control.cursor), frozenCursor,
      'failed replay must not advance native cursor');
    assert.equal(JSON.stringify(replayState.event_control.consumed_events), frozenLedger,
      'failed replay must not append the event ledger');
    console.log('PASS exact native event replay is rejected without ledger or cursor mutation');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

try {
  runBoundPreToolTracer();
} catch (error) {
  console.error('FAIL PreToolUse lazily attests a durable Codex event before project access');
  console.error(error.message);
  process.exitCode = 1;
}

function runDistanceTwoTracer() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'e3-distance-two-')));
  const codexHome = join(root, 'codex-home');
  const session = `e3-${process.pid}-${randomUUID().slice(0, 8)}`;
  const boundary = `boundary-${randomUUID()}`;
  const prompt = '历史真实 distance-2 native shape';
  const promptBytes = Buffer.from(prompt, 'utf8');
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '08');
  const rollout = join(rolloutDir, `rollout-2026-09-08T00-00-00-${session}.jsonl`);
  try {
    mkdirSync(rolloutDir, { recursive: true });
    const bootstrapFence = captureNativeEventFence({ sessionId: session, harness: 'codex',
      cwd: repoRoot, codexHome, allowTestSourceRoot: true });
    writeFileSync(rollout, [
      { type: 'session_meta', payload: {
        id: session, session_id: session, cwd: repoRoot, source: 'cli',
        thread_source: 'user', originator: 'codex-tui', parent_thread_id: null, forked_from_id: null,
      } },
      { type: 'response_item', payload: {
        type: 'message', role: 'user', id: sourceId,
        content: [{ type: 'input_text', text: prompt }],
        internal_chat_message_metadata_passthrough: { turn_id: boundary },
      } },
      { type: 'turn_context', payload: { turn_id: boundary } },
      { type: 'event_msg', payload: {
        type: 'item_completed', thread_id: session, turn_id: boundary,
        item: { type: 'UserMessage', id: anchorId, content: [{ type: 'text', text: prompt }] },
      } },
    ].map(record => JSON.stringify(record)).join('\n') + '\n');
    const result = attestNativeUserEvent({
      bootstrapFence,
      candidate: {
        schema_version: 1, session_id: session, boundary_id: boundary,
        cwd: repoRoot, harness: 'codex', intent: { kind: 'turn' },
        prompt_integrity: {
          encoding: 'utf-8', bytes_base64: promptBytes.toString('base64'),
          byte_length: promptBytes.length,
          sha256: createHash('sha256').update(promptBytes).digest('hex'),
        },
      },
      codexHome,
      allowTestSourceRoot: true,
    });
    assert.equal(result.distance, 2, 'safe distance-2 source/anchor pair must be accepted');
    assert.equal(result.native_id, sourceId);
    assert.equal(result.anchor_id, anchorId);
    console.log('PASS safe distance-2 native source/anchor pair is accepted');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

try {
  runDistanceTwoTracer();
} catch (error) {
  console.error('FAIL safe distance-2 native source/anchor pair is accepted');
  console.error(`${error.code || 'ERROR'}: ${error.message}`);
  process.exitCode = 1;
}

function runResponseOnlyStopTracer() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'e3-response-stop-')));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const project = join(projects, 'projA');
  const claudeDir = join(gstack, '.claude');
  const codexHome = join(root, 'codex-home');
  const session = `e3-${process.pid}-${randomUUID().slice(0, 8)}`;
  const boundary = `boundary-${randomUUID()}`;
  const prompt = '仅回复、不调用工具';
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '08');
  try {
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(join(project, 'docs'), { recursive: true });
    mkdirSync(rolloutDir, { recursive: true });
    const identity = realpathSync(project);
    const st = statSync(identity);
    const binding = { project: 'projA', realpath: identity, dev: Number(st.dev), ino: Number(st.ino), epoch: 1 };
    writeFileSync(join(claudeDir, `.session-project-${session}`), `${JSON.stringify({
      schema_version: 2, state: 'BOUND', session_id: session, binding,
      terminal: { tx: 'seed', operation: 'switch', expected_epoch: 0, turn_id: 'seed', committed_at: '2026-09-08T00:00:00.000Z' },
    })}\n`);
    startupFence(gstack, projects, session, repoRoot, codexHome);
    writeFileSync(join(rolloutDir, `rollout-2026-09-08T00-00-00-${session}.jsonl`), [
      { type: 'session_meta', payload: {
        id: session, session_id: session, cwd: repoRoot, source: 'cli', thread_source: 'user',
        originator: 'codex-tui', parent_thread_id: null, forked_from_id: null,
      } },
      { type: 'response_item', payload: {
        type: 'message', role: 'user', id: sourceId,
        content: [{ type: 'input_text', text: prompt }],
        internal_chat_message_metadata_passthrough: { turn_id: boundary },
      } },
      { type: 'event_msg', payload: {
        type: 'item_completed', thread_id: session, turn_id: boundary,
        item: { type: 'UserMessage', id: anchorId, content: [{ type: 'text', text: prompt }] },
      } },
      { type: 'response_item', payload: {
        type: 'message', role: 'assistant', id: `msg_${randomUUID()}`,
        content: [{ type: 'output_text', text: 'done' }],
      } },
    ].map(record => JSON.stringify(record)).join('\n') + '\n');
    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: gstack, LUCA_GSTACK_ROOT: gstack, LUCA_PROJECTS_ROOT: projects,
      LUCA_ACTUAL_HARNESS: 'codex', LUCA_EVENT_ATTESTATION_TEST: '1', CODEX_HOME: codexHome,
      ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_DRY_RUN: '0',
      ROUTE_GUARD_HEAVY_SKILLS: '', ROUTE_GUARD_PROJECTS: 'projA',
      SESSION_SYNC_BLOCK: '0', SESSION_SYNC_FORCE_ON_STOP: '0',
    };
    const queued = spawnSync(process.execPath, [routeGuard], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'UserPromptSubmit', session_id: session, turn_id: boundary,
        cwd: repoRoot, transcript_path: null, prompt,
      }),
    });
    assert.equal(queued.status, 0, queued.stderr);
    const stopped = spawnSync(process.execPath, [sessionSync], {
      cwd: repoRoot, encoding: 'utf8', env,
      input: JSON.stringify({
        hook_event_name: 'Stop', session_id: session, turn_id: boundary, cwd: repoRoot,
        transcript_path: null, stop_hook_active: false, last_assistant_message: 'done',
      }),
    });
    assert.equal(stopped.status, 0, `Stop hook must remain fail-open: ${stopped.stderr}`);
    assert.match(stopped.stderr, /项目: projA/,
      'a freshly attested response-only Stop must retain its bound-project attribution');
    const state = JSON.parse(readFileSync(join(claudeDir, `.session-project-${session}`), 'utf8'));
    assert.equal(state.state, 'TURN_CLOSED', 'response-only Stop must close the attested event');
    assert.equal(state.event_control?.candidates?.length, 0,
      'OLD IMPLEMENTATION ROOT CAUSE: response-only Stop left an unattested candidate pending');
    assert.equal(state.event_control?.consumed_events?.length, 1,
      'response-only Stop must consume exactly one native event');
    assert.equal(state.event_control?.current?.status, 'closed');
    assert.notEqual(state.event_control?.current?.event_id, boundary);
    console.log('PASS response-only Stop attests and closes exactly one native event');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

try {
  runResponseOnlyStopTracer();
} catch (error) {
  console.error('FAIL response-only Stop attests and closes exactly one native event');
  console.error(error.message);
  process.exitCode = 1;
}

function makeLifecycleFixture(label, initialize = true) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `e3-lifecycle-${label}-`)));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const codexHome = join(root, 'codex-home');
  const session = randomUUID();
  const boundary = `boundary-${randomUUID()}`;
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '08');
  const rollout = join(rolloutDir, `rollout-2026-09-08T00-00-00-${session}.jsonl`);
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  mkdirSync(rolloutDir, { recursive: true });
  writeFileSync(rollout, `${JSON.stringify({
    type: 'session_meta',
    payload: {
      id: session, session_id: session, cwd: gstack, thread_source: 'user',
      originator: 'codex-tui', parent_thread_id: null, forked_from_id: null,
    },
  })}\n`);
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
  if (initialize) startupFence(gstack, projects, session, gstack, codexHome);
  return {
    root, gstack, projects, codexHome, session, boundary, rollout, env,
    statePath: join(gstack, '.claude', `.session-project-${session}`),
  };
}

function nativePair(fx, prompt) {
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: {
      type: 'message', role: 'user', id: sourceId,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: fx.boundary },
    } },
    { type: 'event_msg', payload: {
      type: 'item_completed', thread_id: fx.session, turn_id: fx.boundary,
      item: { type: 'UserMessage', id: anchorId, content: [{ type: 'text', text: prompt }] },
    } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  return { sourceId, anchorId };
}

function assistantWitness(fx, text) {
  appendFileSync(fx.rollout, `${JSON.stringify({
    type: 'response_item',
    payload: {
      type: 'message', role: 'assistant', id: `msg_${randomUUID()}`,
      content: [{ type: 'output_text', text }],
    },
  })}\n`);
}

// Sanitized structure of the two-clipboard-image Codex turn that wedged the cursor.
function imagePair(fx, prompt, count = 2, mutate = () => {}) {
  const source = [], anchor = [];
  for (let n = 1; n <= count; n += 1) {
    const path = `/tmp/clipboard-${n}.png`;
    source.push({ type: 'input_text', text: `<image name=[Image #${n}] path="${path}">` },
      { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=', detail: 'high' },
      { type: 'input_text', text: '</image>' });
    anchor.push({ type: 'local_image', path });
  }
  source.push({ type: 'input_text', text: prompt });
  anchor.push({ type: 'text', text: prompt, text_elements: [] });
  mutate(source, anchor);
  const sourceId = `msg_${randomUUID()}`;
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: sourceId,
      content: source, internal_chat_message_metadata_passthrough: { turn_id: fx.boundary } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: fx.session,
      turn_id: fx.boundary, item: { type: 'UserMessage', id: randomUUID(), content: anchor } } },
  ].map(JSON.stringify).join('\n') + '\n');
  return sourceId;
}

// Sanitized structure emitted when Codex expands an explicitly invoked skill:
// the native UserMessage anchor carries a structured skill descriptor, followed
// by one unanchored user-role record containing the resolved skill body.
function skillPair(fx, prompt, mutate = () => {}) {
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  const skill = { type: 'skill', name: 'diagnosing-bugs', path: '/tmp/skills/diagnosing-bugs/SKILL.md' };
  const injected = `<skill>\n<name>${skill.name}</name>\n<path>${skill.path}</path>\n---\nname: ${skill.name}\n---\nbody\n</skill>`;
  const source = [{ type: 'input_text', text: prompt }];
  const anchor = [{ type: 'text', text: prompt, text_elements: [] }, skill];
  const expansion = [{ type: 'input_text', text: injected }];
  const expansionPayload = {
    type: 'message', role: 'user', id: `msg_${randomUUID()}`, content: expansion,
    internal_chat_message_metadata_passthrough: {
      turn_id: fx.boundary,
      create_time: 1_789_443_093.02633,
      content_item_kinds: ['skills.selected_skill_instructions'],
    },
  };
  mutate(source, anchor, expansion, expansionPayload);
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: sourceId,
      content: source, internal_chat_message_metadata_passthrough: { turn_id: fx.boundary } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: fx.session,
      turn_id: fx.boundary, item: { type: 'UserMessage', id: anchorId, content: anchor } } },
    { type: 'response_item', payload: { type: 'message', role: 'developer',
      content: [{ type: 'input_text', text: '[route-guard] project transaction' }] } },
    { type: 'response_item', payload: expansionPayload },
  ].map(JSON.stringify).join('\n') + '\n');
  return { sourceId, anchorId };
}

lifecycleCheck('Codex structured skill injection remains the current event through Stop', () => {
  const fx = makeLifecycleFixture('skill-injection');
  try {
    const prompt = '用 diagnosing-bugs 定位问题';
    queueLifecycle(fx, prompt);
    const native = skillPair(fx, prompt);
    assert.equal(observeLifecycle(fx).event.native_id, native.sourceId);
    assistantWitness(fx, 'diagnosed');
    assert.equal(observeLifecycle(fx, 'stop', 'diagnosed').event.native_id, native.sourceId);
    queueLifecycle(fx, 'next human');
    const next = nativePair(fx, 'next human');
    assert.equal(observeLifecycle(fx).event.native_id, next.sourceId);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

for (const [name, mutate, code] of [
  ['unknown anchor part', (_s, a) => { a[1].type = 'future_skill'; }, 'UNKNOWN_SCHEMA'],
  ['relative skill path', (_s, a) => { a[1].path = 'relative/SKILL.md'; }, 'UNKNOWN_SCHEMA'],
  ['mismatched injected name', (_s, _a, e) => { e[0].text = e[0].text.replace('diagnosing-bugs</name>', 'other</name>'); }, 'MISMATCH'],
  ['mismatched injected path', (_s, _a, e) => { e[0].text = e[0].text.replace('/tmp/skills/diagnosing-bugs/SKILL.md', '/tmp/skills/other/SKILL.md'); }, 'MISMATCH'],
  ['missing injected expansion', (_s, _a, e) => { e.splice(0); }, 'UNKNOWN_SCHEMA'],
  ['ordinary-user provenance', (_s, _a, _e, p) => { p.internal_chat_message_metadata_passthrough.content_item_kinds = []; }, 'UNKNOWN_SCHEMA'],
]) lifecycleCheck(`Codex skill rejects ${name} without advancing queue`, () => {
  const fx = makeLifecycleFixture('skill-negative');
  try {
    const prompt = '用 diagnosing-bugs 定位问题';
    queueLifecycle(fx, prompt); skillPair(fx, prompt, mutate);
    const before = readFileSync(fx.statePath);
    expectCode(`skill ${name}`, code, () => observeLifecycle(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('Codex skill allowance does not hide a later unanchored user record', () => {
  const fx = makeLifecycleFixture('skill-intervening-user');
  try {
    const prompt = '用 diagnosing-bugs 定位问题';
    queueLifecycle(fx, prompt); skillPair(fx, prompt);
    appendFileSync(fx.rollout, `${JSON.stringify({ type: 'response_item', payload: {
      type: 'message', role: 'user', content: [{ type: 'input_text', text: 'unrelated user record' }],
    } })}\n`);
    expectCode('skill later user', 'INTERVENING_USER', () => observeLifecycle(fx));
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

for (const count of [1, 2]) lifecycleCheck(`Codex ${count} local images: current event, Stop and queue continuation`, () => {
  const fx = makeLifecycleFixture(`images-${count}`);
  try {
    const prompt = '请检查截图 [Image #1]';
    queueLifecycle(fx, prompt);
    const id = imagePair(fx, prompt, count);
    assert.equal(observeLifecycle(fx).event.native_id, id);
    assert.equal(observeLifecycle(fx).event.native_id, id);
    assistantWitness(fx, 'checked');
    assert.equal(observeLifecycle(fx, 'stop', 'checked').event.native_id, id);
    queueLifecycle(fx, 'next human');
    const next = nativePair(fx, 'next human');
    assert.equal(observeLifecycle(fx).event.native_id, next.sourceId);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('Codex image backlog drains before later human candidate', () => {
  const fx = makeLifecycleFixture('image-backlog');
  try {
    queueLifecycle(fx, '截图'); imagePair(fx, '截图');
    queueLifecycle(fx, 'continue'); const next = nativePair(fx, 'continue');
    const result = observeLifecycle(fx);
    assert.equal(result.event.native_id, next.sourceId);
    assert.equal(result.state.event_control.consumed_events.length, 2);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('Codex image response-only Stop attests and replay cannot consume it twice', () => {
  const fx = makeLifecycleFixture('image-stop-only');
  try {
    queueLifecycle(fx, '截图'); const id = imagePair(fx, '截图');
    assistantWitness(fx, 'done');
    assert.equal(observeLifecycle(fx, 'stop', 'done').event.native_id, id);
    queueLifecycle(fx, '截图');
    const before = readFileSync(fx.statePath);
    expectCode('image event replay', 'EVENT_REPLAY', () => observeLifecycle(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('Codex literal image wrapper text remains significant', () => {
  const fx = makeLifecycleFixture('literal-image-wrapper');
  try {
    const prompt = '<image name=[Image #1] path="/tmp/literal.png">\n</image>';
    queueLifecycle(fx, prompt); const id = nativePair(fx, prompt);
    assert.equal(observeLifecycle(fx).event.native_id, id.sourceId);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

for (const [name, mutate] of [
  ['wrong path', (s, a) => { a[0].path = '/tmp/other.png'; }],
  ['reversed anchor image order', (s, a) => { [a[0], a[1]] = [a[1], a[0]]; }],
  ['wrong closing wrapper', s => { s[2].text = '</image>lost text'; }],
  ['wrong index', s => { s[0].text = s[0].text.replace('#1', '#2'); }],
  ['relative path', s => { s[0].text = s[0].text.replace('/tmp/', ''); }],
  ['unwrapped image', s => { s.shift(); }],
  ['unsupported detail', s => { s[1].detail = 'future'; }],
  ['noncanonical base64', s => { s[1].image_url = 'data:image/png;base64,aGVsbG8'; }],
  ['unknown image type', s => { s[1].type = 'future_image'; }],
  ['invalid data URI', s => { s[1].image_url = 'https://example.com/image.png'; }],
  ['altered anchor text', (s, a) => { a.at(-1).text = 'tampered'; }],
  ['missing anchor image', (s, a) => { a.shift(); }],
  ['unknown anchor type', (s, a) => { a[0].type = 'future_image'; }],
]) lifecycleCheck(`Codex image rejects ${name} without advancing queue`, () => {
  const fx = makeLifecycleFixture('image-negative');
  try {
    queueLifecycle(fx, '截图'); imagePair(fx, '截图', 2, mutate);
    queueLifecycle(fx, 'later human'); nativePair(fx, 'later human');
    const before = readFileSync(fx.statePath);
    const mismatchCases = ['wrong path', 'altered anchor text', 'missing anchor image', 'reversed anchor image order'];
    expectCode(`image ${name}`, mismatchCases.includes(name) ? 'MISMATCH' : 'UNKNOWN_SCHEMA',
      () => observeLifecycle(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

function queueLifecycle(fx, prompt, intent = { kind: 'turn' }) {
  queueProjectEventCandidate({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: fx.session,
    boundaryId: fx.boundary,
    cwd: fx.gstack,
    harness: 'codex',
    prompt,
    intent,
  });
}

function observeLifecycle(fx, observation = 'pre-tool', assistantText = '') {
  const before = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return attestPendingProjectEvent({
      gstackRoot: fx.gstack,
      projectsRoot: fx.projects,
      sessionId: fx.session,
      boundaryId: fx.boundary,
      cwd: fx.gstack,
      observation,
      assistantText,
      codexHome: fx.codexHome,
    });
  } finally {
    if (before === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = before;
  }
}

function stopLifecycle(fx, lastAssistantMessage = '', extraEnv = {}) {
  return spawnSync(process.execPath, [sessionSync], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...fx.env, ...extraEnv },
    input: JSON.stringify({
      hook_event_name: 'Stop', session_id: fx.session, turn_id: fx.boundary,
      cwd: fx.gstack, transcript_path: null, stop_hook_active: false,
      last_assistant_message: lastAssistantMessage,
    }),
  });
}

function lifecycleCheck(name, operation) {
  try {
    operation();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}

lifecycleCheck('one PreTool transaction consumes a shared-boundary pending batch and activates only the newest event', () => {
  const fx = makeLifecycleFixture('pending-batch');
  try {
    queueLifecycle(fx, 'first queued steering event');
    queueLifecycle(fx, 'second queued steering event');
    const first = nativePair(fx, 'first queued steering event');
    const second = nativePair(fx, 'second queued steering event');
    const observed = observeLifecycle(fx);
    assert.equal(observed.events.length, 2);
    assert.equal(observed.events[0].status, 'closed');
    assert.equal(observed.events[0].native_id, first.sourceId);
    assert.equal(observed.event.status, 'active');
    assert.equal(observed.event.native_id, second.sourceId);
    assert.equal(observed.state.state, 'NO_PIN');
    assert.equal(observed.state.event_control.candidates.length, 0);
    assert.equal(observed.state.event_control.consumed_events.length, 2);

    assistantWitness(fx, 'batch response');
    const stopped = stopLifecycle(fx, 'batch response');
    assert.equal(stopped.status, 0, stopped.stderr);
    const closed = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(closed.state, 'NO_PIN');
    assert.equal(closed.event_control.current.status, 'closed',
      'NO_PIN active native event must close on Stop');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('an unfenced old same-text event cannot authenticate an unpublished new submission', () => {
  const fx = makeLifecycleFixture('unfenced-stale-event', false);
  try {
    nativePair(fx, '继续');
    assistantWitness(fx, 'old completed reply');
    queueLifecycle(fx, '继续');
    const before = readFileSync(fx.statePath);
    assert.throws(() => observeLifecycle(fx), error => error.code === 'BOOTSTRAP_UNATTESTED');
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('native Codex startup reaches the real fence hook; compact cannot establish a fence', () => {
  for (const source of ['startup', 'resume', 'compact']) {
    const fx = makeLifecycleFixture(`native-start-${source}`, false);
    try {
      mkdirSync(join(fx.gstack, '.codex'), { recursive: true });
      const adapter = join(fx.gstack, '.codex', 'codex-hook-adapter.mjs');
      writeFileSync(adapter, readFileSync(join(repoRoot, '.codex', 'codex-hook-adapter.mjs')));
      const started = spawnSync(process.execPath, [adapter, join(repoRoot, '.claude/hooks/session-restore.mjs')], {
        cwd: fx.gstack, encoding: 'utf8', env: { ...fx.env, MEMORY_ROOT: fx.gstack },
        input: JSON.stringify({ hook_event_name: 'SessionStart', source, session_id: fx.session, cwd: fx.gstack }),
      });
      assert.equal(started.status, 0, started.stderr);
      if (source === 'compact') {
        assert.equal(existsSync(fx.statePath), false, 'mid-input compact cannot fabricate a pre-input boundary');
        continue;
      }
      const initial = JSON.parse(readFileSync(fx.statePath, 'utf8'));
      assert.equal(initial.event_control.fence.session_id, fx.session);
      assert.equal(initial.event_control.consumed_events.length, 0);
      nativePair(fx, 'first input after native startup');
      queueLifecycle(fx, 'first input after native startup');
      assert.equal(observeLifecycle(fx).event.status, 'active');
    } finally { rmSync(fx.root, { recursive: true, force: true }); }
  }
});

lifecycleCheck('a pending event cannot inherit authority when a newer native user was never queued', () => {
  const fx = makeLifecycleFixture('pending-source-freshness');
  try {
    queueLifecycle(fx, 'seed event');
    nativePair(fx, 'seed event');
    observeLifecycle(fx);

    queueLifecycle(fx, 'queued old event');
    nativePair(fx, 'queued old event');
    nativePair(fx, 'newer native event whose route hook did not queue');
    const before = readFileSync(fx.statePath);

    assert.throws(
      () => observeLifecycle(fx),
      error => error?.code === 'INTERVENING_USER',
      'final candidate attestation must prove that no newer native user exists after its anchor',
    );
    assert.deepEqual(readFileSync(fx.statePath), before,
      'freshness rejection must not consume the candidate or advance its durable cursor');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('Stop revokes an uncommitted SWITCH_ONLY event and its exact mutation capability', () => {
  const fx = makeLifecycleFixture('switch-only-stop');
  try {
    const tx = randomUUID();
    const prompt = '创建 beta 项目';
    queueLifecycle(fx, prompt, {
      kind: 'switch', tx, operation: 'new', target: 'beta', expected_epoch: 0,
    });
    nativePair(fx, prompt);
    const command = `./scripts/project.sh new beta --session-id ${fx.session} --tx ${tx} --expected-epoch 0`;
    const prepared = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot, encoding: 'utf8', env: fx.env,
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: fx.session, turn_id: fx.boundary,
        cwd: fx.gstack, transcript_path: null, tool_name: 'Bash', tool_input: { command },
      }),
    });
    assert.equal(prepared.status, 0, prepared.stderr);
    assert.equal(prepared.stdout.trim(), '', prepared.stdout);
    assert.equal(JSON.parse(readFileSync(fx.statePath, 'utf8')).state, 'SWITCH_ONLY');

    assistantWitness(fx, 'switch not executed');
    const stopped = stopLifecycle(fx, 'switch not executed');
    assert.equal(stopped.status, 0, stopped.stderr);
    const closed = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(closed.state, 'NO_PIN');
    assert.equal(closed.event_control.current.status, 'closed');

    const replay = spawnSync(process.execPath, [scopeGuard], {
      cwd: repoRoot, encoding: 'utf8', env: fx.env,
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: fx.session, turn_id: fx.boundary,
        cwd: fx.gstack, transcript_path: null, tool_name: 'Bash', tool_input: { command },
      }),
    });
    assert.equal(replay.status, 0, replay.stderr);
    assert.equal(JSON.parse(replay.stdout).hookSpecificOutput.permissionDecision, 'deny');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('a delayed old Stop cannot consume a newer same-boundary candidate without its assistant witness', () => {
  const fx = makeLifecycleFixture('delayed-stop-witness');
  try {
    queueLifecycle(fx, 'first response');
    nativePair(fx, 'first response');
    const first = observeLifecycle(fx);
    assistantWitness(fx, 'old assistant response');

    queueLifecycle(fx, 'new response');
    const second = nativePair(fx, 'new response');
    const pendingBytes = readFileSync(fx.statePath);
    const delayed = stopLifecycle(fx, 'old assistant response');
    assert.equal(delayed.status, 0, delayed.stderr);
    assert.match(delayed.stderr, /SOURCE_NOT_VISIBLE|INTERVENING_USER/);
    assert.deepEqual(readFileSync(fx.statePath), pendingBytes,
      'delayed Stop must leave the newer candidate, cursor, and ledger unchanged');
    assert.notEqual(first.event.native_id, second.sourceId);

    assistantWitness(fx, 'new assistant response');
    const current = stopLifecycle(fx, 'new assistant response');
    assert.equal(current.status, 0, current.stderr);
    const closed = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(closed.event_control.candidates.length, 0);
    assert.equal(closed.event_control.current.native_id, second.sourceId);
    assert.equal(closed.event_control.current.status, 'closed');
    assert.equal(closed.event_control.consumed_events.length, 2);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('a delayed old Stop cannot close a newer already-active same-boundary event', () => {
  const fx = makeLifecycleFixture('delayed-stop-active');
  try {
    queueLifecycle(fx, 'first active response');
    nativePair(fx, 'first active response');
    observeLifecycle(fx);
    assistantWitness(fx, 'old active assistant response');

    queueLifecycle(fx, 'new active response');
    const second = nativePair(fx, 'new active response');
    const active = observeLifecycle(fx);
    assert.equal(active.event.native_id, second.sourceId);
    assistantWitness(fx, 'new active assistant response');
    const before = readFileSync(fx.statePath);

    const delayed = stopLifecycle(fx, 'old active assistant response');
    assert.equal(delayed.status, 0, delayed.stderr);
    assert.match(delayed.stderr, /SOURCE_NOT_VISIBLE|INTERVENING_USER/);
    assert.deepEqual(readFileSync(fx.statePath), before,
      'an old Stop witness must not close or rewrite the newer active event');

    const current = stopLifecycle(fx, 'new active assistant response');
    assert.equal(current.status, 0, current.stderr);
    const closed = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(closed.event_control.current.native_id, second.sourceId);
    assert.equal(closed.event_control.current.status, 'closed');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('identical assistant text across one boundary makes a delayed Stop fail closed', () => {
  const fx = makeLifecycleFixture('delayed-stop-identical-text');
  try {
    queueLifecycle(fx, 'first identical-text response');
    nativePair(fx, 'first identical-text response');
    observeLifecycle(fx);
    assistantWitness(fx, 'done');

    queueLifecycle(fx, 'second identical-text response');
    const second = nativePair(fx, 'second identical-text response');
    const active = observeLifecycle(fx);
    assert.equal(active.event.native_id, second.sourceId);
    assistantWitness(fx, 'done');
    const before = readFileSync(fx.statePath);

    const ambiguous = stopLifecycle(fx, 'done');
    assert.equal(ambiguous.status, 0, ambiguous.stderr);
    assert.match(ambiguous.stderr, /STOP_WITNESS_AMBIGUOUS/);
    assert.deepEqual(readFileSync(fx.statePath), before,
      'an indistinguishable delayed Stop must not close or rewrite the newer active event');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('Stop ambiguity includes native history before the first attested event', () => {
  const fx = makeLifecycleFixture('bootstrap-old-stop', false);
  try {
    nativePair(fx, 'historical event before E3');
    assistantWitness(fx, 'done');
    startupFence(fx.gstack, fx.projects, fx.session, fx.gstack, fx.codexHome);
    queueLifecycle(fx, 'current event after E3');
    nativePair(fx, 'current event after E3');
    assistantWitness(fx, 'done');
    observeLifecycle(fx);
    const before = readFileSync(fx.statePath);
    const stopped = stopLifecycle(fx, 'done');
    assert.equal(stopped.status, 0, stopped.stderr);
    assert.match(stopped.stderr, /STOP_WITNESS_AMBIGUOUS/);
    assert.deepEqual(readFileSync(fx.statePath), before,
      'a historical Stop cannot close the current event just because history was not in the ledger');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('a forced-block response-only Stop retains active native-event authority', () => {
  const fx = makeLifecycleFixture('blocked-response-only');
  try {
    const prompt = 'response only before forced extraction';
    queueLifecycle(fx, prompt);
    const native = nativePair(fx, prompt);
    assistantWitness(fx, 'response before extraction block');
    writeFileSync(join(fx.gstack, '.claude', `.session-edit-count-${fx.session}`), '1');

    const blocked = stopLifecycle(fx, 'response before extraction block', {
      SESSION_SYNC_BLOCK: '1',
      SESSION_SYNC_FORCE_ON_STOP: '1',
    });
    assert.equal(blocked.status, 0, blocked.stderr);
    assert.equal(JSON.parse(blocked.stdout).decision, 'block');
    const held = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(held.event_control.candidates.length, 0);
    assert.equal(held.event_control.current.native_id, native.sourceId);
    assert.equal(held.event_control.current.status, 'active',
      'decision:block must retain the attested event for the continuation');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('a blocked Stop cannot be replayed through repeated text; a distinct response can close', () => {
  const fx = makeLifecycleFixture('blocked-stop-replay');
  try {
    const prompt = 'blocked response followed by continuation';
    queueLifecycle(fx, prompt);
    nativePair(fx, prompt);
    assistantWitness(fx, 'same continuation text');
    writeFileSync(join(fx.gstack, '.claude', `.session-edit-count-${fx.session}`), '1');

    const blocked = stopLifecycle(fx, 'same continuation text', {
      SESSION_SYNC_BLOCK: '1',
      SESSION_SYNC_FORCE_ON_STOP: '1',
    });
    assert.equal(JSON.parse(blocked.stdout).decision, 'block');
    const held = readFileSync(fx.statePath);
    const heldState = JSON.parse(held.toString('utf8'));
    assert.match(heldState.event_control.current.stop_witness_id, /^msg_/);

    const replay = stopLifecycle(fx, 'same continuation text');
    assert.equal(replay.status, 0, replay.stderr);
    assert.match(replay.stderr, /SOURCE_NOT_VISIBLE/);
    assert.deepEqual(readFileSync(fx.statePath), held,
      'replaying the already-recorded blocked Stop witness must not close the event');

    assistantWitness(fx, 'same continuation text');
    const ambiguousReplay = stopLifecycle(fx, 'same continuation text');
    assert.match(ambiguousReplay.stderr, /STOP_WITNESS_AMBIGUOUS/);
    assert.deepEqual(readFileSync(fx.statePath), held,
      'a later identical response cannot turn the old Stop payload into new authority');
    assistantWitness(fx, 'distinct final continuation text');
    const continued = stopLifecycle(fx, 'distinct final continuation text');
    assert.equal(continued.status, 0, continued.stderr);
    const closed = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(closed.event_control.current.status, 'closed');
    assert.notEqual(closed.event_control.current.stop_witness_id,
      heldState.event_control.current.stop_witness_id,
      'the closing Stop must be bound to the later native assistant response');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ── Harness-synthesised prompts must not wedge the candidate queue (2026-09-10) ──
// Background-task notifications and cross-session messages reach UserPromptSubmit and
// are queued like a user turn, but the native source records them only as
// queue-operation/attachment rows, never as a root human event. Before the fix one such
// candidate made every later PreToolUse attestation throw, permanently closing project
// authority for the session. The Claude row shapes below are copied from a real
// transcript rather than imagined (the recognizer lesson recorded in commit 9cb54cf).

function withAttestationTestEnv(operation) {
  const before = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return operation();
  } finally {
    if (before === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = before;
  }
}

function sha256Utf8(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function expectCode(label, expected, operation) {
  let caught;
  try { operation(); } catch (error) { caught = error; }
  assert.ok(caught, `${label}: expected a ${expected} rejection but attestation succeeded`);
  assert.equal(caught.code, expected, `${label}: wrong rejection\n${caught?.stack || caught}`);
  return caught;
}

const TASK_NOTIFICATION = '<task-notification>\n<task-id>bfixture1</task-id>\n<status>completed</status>\n</task-notification>';
const CROSS_SESSION = '<cross-session-message from="uds:/tmp/cc-socks/1.sock" from-name="peer" from-mode="prompting">\nhandover note\n</cross-session-message>';

function makeClaudeQueueFixture(label) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `e3-claude-queue-${label}-`)));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const session = randomUUID();
  const transcript = join(root, `${session}.jsonl`);
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  writeFileSync(transcript, `${JSON.stringify({
    parentUuid: null, isSidechain: false, type: 'system', subtype: 'informational',
    content: 'fixture session start', isMeta: false, timestamp: new Date().toISOString(),
    uuid: randomUUID(), level: 'info', userType: 'external', entrypoint: 'cli',
    cwd: gstack, sessionId: session,
  })}\n`);
  withAttestationTestEnv(() => initializeProjectEventFence({
    gstackRoot: gstack, projectsRoot: projects, sessionId: session, harness: 'claude',
    cwd: gstack, transcriptPath: transcript,
  }));
  return {
    root, gstack, projects, session, transcript,
    statePath: join(gstack, '.claude', `.session-project-${session}`),
  };
}

function queueClaude(fx, prompt) {
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: fx.session,
    boundaryId: fx.session, cwd: fx.gstack, harness: 'claude', prompt, intent: { kind: 'turn' },
  });
}

function appendClaudeSynthetic(fx, prompt) {
  const at = new Date().toISOString();
  appendFileSync(fx.transcript, [
    { type: 'queue-operation', operation: 'enqueue', timestamp: at, sessionId: fx.session, content: prompt },
    {
      parentUuid: randomUUID(), isSidechain: false, type: 'attachment', uuid: randomUUID(), timestamp: at,
      userType: 'external', entrypoint: 'cli', cwd: fx.gstack, sessionId: fx.session,
      session_id: fx.session, version: 'fixture',
      attachment: { type: 'queued_command', prompt, commandMode: 'prompt', timestamp: at },
    },
    { type: 'queue-operation', operation: 'remove', timestamp: at, sessionId: fx.session, content: prompt, reason: 'dequeued' },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
}

function appendClaudeHuman(fx, prompt) {
  const uuid = randomUUID();
  appendFileSync(fx.transcript, `${JSON.stringify({
    parentUuid: randomUUID(), isSidechain: false, promptId: randomUUID(), type: 'user',
    message: { role: 'user', content: prompt }, uuid, timestamp: new Date().toISOString(),
    permissionMode: 'default', userType: 'external', entrypoint: 'cli', cwd: fx.gstack,
    sessionId: fx.session, version: 'fixture', gitBranch: 'main',
    origin: { kind: 'human' }, promptSource: 'typed',
  })}\n`);
  return uuid;
}

function observeClaude(fx) {
  return withAttestationTestEnv(() => attestPendingProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: fx.session,
    boundaryId: fx.session, cwd: fx.gstack, observation: 'pre-tool', transcriptPath: fx.transcript,
  }));
}

lifecycleCheck('poisoned queue: a Codex candidate that never became a user turn is skipped once a later turn attests', () => {
  const fx = makeLifecycleFixture('poison-codex');
  try {
    queueLifecycle(fx, TASK_NOTIFICATION);
    const real = 'real user turn after a background notification';
    queueLifecycle(fx, real);
    const native = nativePair(fx, real);
    const result = observeLifecycle(fx);
    assert.equal(result.event.native_id, native.sourceId, 'authority must come from the real turn');
    assert.equal(result.state.event_control.candidates.length, 0);
    assert.deepEqual(result.unwitnessed.map(item => item.prompt_sha256), [sha256Utf8(TASK_NOTIFICATION)]);
    assert.equal(result.state.event_control.consumed_events.length, 1,
      'a skipped candidate must never be recorded as a consumed native event');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a Claude cross-session message recorded only as queue/attachment rows is skipped once a later turn attests', () => {
  const fx = makeClaudeQueueFixture('cross-session');
  try {
    queueClaude(fx, CROSS_SESSION);
    appendClaudeSynthetic(fx, CROSS_SESSION);
    const real = '继续';
    queueClaude(fx, real);
    const uuid = appendClaudeHuman(fx, real);
    const result = observeClaude(fx);
    assert.equal(result.event.native_id, uuid, 'authority must come from the real human row');
    assert.equal(result.state.event_control.candidates.length, 0);
    assert.deepEqual(result.unwitnessed.map(item => item.prompt_sha256), [sha256Utf8(CROSS_SESSION)]);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: consecutive synthetic prompts are all skipped and none grants authority', () => {
  const fx = makeClaudeQueueFixture('consecutive');
  try {
    queueClaude(fx, TASK_NOTIFICATION);
    appendClaudeSynthetic(fx, TASK_NOTIFICATION);
    queueClaude(fx, CROSS_SESSION);
    appendClaudeSynthetic(fx, CROSS_SESSION);
    const real = 'real turn after two synthetic prompts';
    queueClaude(fx, real);
    const uuid = appendClaudeHuman(fx, real);
    const result = observeClaude(fx);
    assert.equal(result.event.native_id, uuid);
    assert.deepEqual(result.unwitnessed.map(item => item.prompt_sha256),
      [sha256Utf8(TASK_NOTIFICATION), sha256Utf8(CROSS_SESSION)]);
    assert.equal(result.state.event_control.consumed_events.length, 1);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a synthetic final candidate still fails closed, and the next real turn heals the queue', () => {
  const fx = makeClaudeQueueFixture('final-synthetic');
  try {
    queueClaude(fx, CROSS_SESSION);
    appendClaudeSynthetic(fx, CROSS_SESSION);
    const before = readFileSync(fx.statePath);
    expectCode('synthetic final candidate', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before, 'a rejected attestation must not publish state');
    const real = 'the user types again';
    queueClaude(fx, real);
    const uuid = appendClaudeHuman(fx, real);
    const healed = observeClaude(fx);
    assert.equal(healed.event.native_id, uuid);
    assert.deepEqual(healed.unwitnessed.map(item => item.prompt_sha256), [sha256Utf8(CROSS_SESSION)]);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a queue holding only synthetic prompts is rejected without publishing', () => {
  const fx = makeClaudeQueueFixture('only-synthetic');
  try {
    queueClaude(fx, TASK_NOTIFICATION);
    appendClaudeSynthetic(fx, TASK_NOTIFICATION);
    queueClaude(fx, CROSS_SESSION);
    appendClaudeSynthetic(fx, CROSS_SESSION);
    const before = readFileSync(fx.statePath);
    expectCode('only synthetic candidates', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: an integrity failure on an earlier candidate is never skipped', () => {
  const fx = makeLifecycleFixture('poison-integrity');
  try {
    const tampered = 'turn whose anchor text was altered';
    queueLifecycle(fx, tampered);
    appendFileSync(fx.rollout, [
      { type: 'response_item', payload: {
        type: 'message', role: 'user', id: `msg_${randomUUID()}`,
        content: [{ type: 'input_text', text: tampered }],
        internal_chat_message_metadata_passthrough: { turn_id: fx.boundary },
      } },
      { type: 'event_msg', payload: {
        type: 'item_completed', thread_id: fx.session, turn_id: fx.boundary,
        item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: 'ALTERED ANCHOR TEXT' }] },
      } },
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    const real = 'real turn after the tampered one';
    queueLifecycle(fx, real);
    nativePair(fx, real);
    const before = readFileSync(fx.statePath);
    let caught;
    try { observeLifecycle(fx); } catch (error) { caught = error; }
    assert.ok(caught, 'an integrity failure must reject the whole queue rather than be skipped');
    assert.notEqual(caught.details?.next_native_turn_differs, true,
      `an integrity failure must not carry the skip marker (${caught.code})`);
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a malformed earlier candidate is never skipped', () => {
  const fx = makeLifecycleFixture('poison-schema');
  try {
    queueLifecycle(fx, 'first queued turn');
    const real = 'second queued turn';
    queueLifecycle(fx, real);
    nativePair(fx, real);
    const state = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    state.event_control.candidates[0].cwd = 'relative/not-absolute';
    writeFileSync(fx.statePath, `${JSON.stringify(state)}\n`);
    const before = readFileSync(fx.statePath);
    let caught;
    try { observeLifecycle(fx); } catch (error) { caught = error; }
    assert.ok(caught, 'a malformed candidate must reject the whole queue');
    assert.ok(['CANDIDATE_SCHEMA', 'STATE_SCHEMA'].includes(caught.code), `unexpected rejection ${caught?.code}`);
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a re-queued copy of an already consumed turn grants nothing when skipped', () => {
  const fx = makeLifecycleFixture('poison-replay');
  try {
    const first = 'turn that is attested exactly once';
    queueLifecycle(fx, first);
    const firstNative = nativePair(fx, first);
    observeLifecycle(fx);
    queueLifecycle(fx, first);
    const real = 'the next real turn';
    queueLifecycle(fx, real);
    const realNative = nativePair(fx, real);
    const result = observeLifecycle(fx);
    assert.equal(result.event.native_id, realNative.sourceId);
    const consumedIds = result.state.event_control.consumed_events.map(item => item.native_id);
    assert.equal(consumedIds.filter(id => id === firstNative.sourceId).length, 1,
      'a consumed turn must never be consumed twice');
    assert.equal(result.unwitnessed.length, 1);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('poisoned queue: a final candidate that meets a different human turn still fails closed with MISMATCH', () => {
  const fx = makeClaudeQueueFixture('final-meets-other-turn');
  try {
    // A real human turn whose candidate never reached the queue sits first after the
    // cursor. The final candidate must not be skipped past it: that would publish an
    // empty attestation, or grant authority to a turn the source never shows.
    appendClaudeHuman(fx, 'a human turn that was never queued');
    const queued = 'the queued turn';
    queueClaude(fx, queued);
    appendClaudeHuman(fx, queued);
    const before = readFileSync(fx.statePath);
    const error = expectCode('final candidate behind an unqueued human turn', 'MISMATCH', () => observeClaude(fx));
    assert.equal(error.details?.next_native_turn_differs, true,
      'this must be the marked shape, so only the final-candidate guard keeps the queue closed');
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// Loaded as a namespace so a missing export fails only the check below, not the whole file.
const projectSubstrate = await import('../.claude/hooks/lib/project-substrate.mjs');

lifecycleCheck('deactivate re-fence refuses when the session source is no longer visible, publishing nothing', () => {
  const fx = makeLifecycleFixture('refence-source-absent');
  try {
    const prompt = 'turn attested before the rollout disappears';
    queueLifecycle(fx, prompt);
    nativePair(fx, prompt);
    observeLifecycle(fx);
    assert.equal(typeof projectSubstrate.refenceProjectStateForDeactivate, 'function',
      'project-substrate must export the deactivate re-fence');
    // A fence captured from an absent source has no cursor. Publishing it would make every
    // surviving history row look new once the source reappears, re-locking the session.
    rmSync(fx.rollout);
    const before = readFileSync(fx.statePath);
    const error = expectCode('re-fence without a visible source', 'SOURCE_NOT_VISIBLE',
      () => withAttestationTestEnv(() => projectSubstrate.refenceProjectStateForDeactivate({
        gstackRoot: fx.gstack, sessionId: fx.session, expectedRaw: before, codexHome: fx.codexHome,
      })));
    assert.match(error.message, /cannot rebuild the native fence/);
    assert.deepEqual(readFileSync(fx.statePath), before, 'a refused re-fence must publish nothing');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// ── Slash-command human rows must not wedge the queue (2026-09-11, red-team finding F1) ──
// Claude records a slash-command turn as a human row with origin.kind 'human' and no promptSource;
// its text is the command expansion. The row shape below is copied from real transcripts (runtime
// 2.1.259 and 2.1.261, `/wait-what` and `/loop`). Such a row can never attest, and validating it made
// every later candidate throw PROVENANCE_MISMATCH, so one slash command permanently cost a pinned
// session its project authority.

function appendClaudeSlashCommand(fx, name) {
  const uuid = randomUUID();
  appendFileSync(fx.transcript, `${JSON.stringify({
    parentUuid: randomUUID(), isSidechain: false, promptId: randomUUID(), type: 'user',
    message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>` },
    uuid, timestamp: new Date().toISOString(), userType: 'external', entrypoint: 'cli', cwd: fx.gstack,
    sessionId: fx.session, version: '2.1.261', gitBranch: 'main', origin: { kind: 'human' },
  })}\n`);
  return uuid;
}

lifecycleCheck('slash command: a slash-command turn queued before a real turn is skipped and the real turn attests', () => {
  const fx = makeClaudeQueueFixture('slash-before-real');
  try {
    queueClaude(fx, '/wait-what');
    appendClaudeSlashCommand(fx, 'wait-what');
    const real = 'the real turn after a slash command';
    queueClaude(fx, real);
    const uuid = appendClaudeHuman(fx, real);
    const result = observeClaude(fx);
    assert.equal(result.event.native_id, uuid, 'authority must come from the real human turn');
    assert.deepEqual(result.unwitnessed.map(item => item.prompt_sha256), [sha256Utf8('/wait-what')]);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('slash command: a slash command after the final turn still revokes authority as an intervening user event', () => {
  const fx = makeClaudeQueueFixture('slash-after-real');
  try {
    const real = 'a turn followed by a slash command';
    queueClaude(fx, real);
    appendClaudeHuman(fx, real);
    appendClaudeSlashCommand(fx, 'loop');
    const before = readFileSync(fx.statePath);
    expectCode('slash command after the final turn', 'INTERVENING_USER', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before, 'a revoked attestation must publish nothing');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('slash command: a queue holding only a slash-command turn fails closed', () => {
  const fx = makeClaudeQueueFixture('slash-only');
  try {
    queueClaude(fx, '/loop');
    appendClaudeSlashCommand(fx, 'loop');
    const before = readFileSync(fx.statePath);
    expectCode('only a slash-command turn', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

// Trailing injections cannot authorize or disprove delayed human candidates.
// Deliberately wait for a later human turn; eager strip caused a byte-collision race.

const USAGE_LIMIT_RESET = 'Your claude.ai usage limit has reset. Continue the task you were working on when the limit was reached; do not repeat work that is already complete.';

function appendClaudeInjection(fx, prompt) {
  appendFileSync(fx.transcript, `${JSON.stringify({
    parentUuid: randomUUID(), isSidechain: false, promptId: randomUUID(), type: 'user',
    message: { role: 'user', content: prompt }, isMeta: true, uuid: randomUUID(),
    timestamp: new Date().toISOString(), userType: 'external', entrypoint: 'cli', cwd: fx.gstack,
    sessionId: fx.session, version: '2.1.267', gitBranch: 'main',
    origin: { kind: 'auto-continuation' }, promptSource: 'system',
  })}\n`);
}

lifecycleCheck('harness injection: a continuation after a real prompt grants nothing until the next real prompt', () => {
  const fx = makeClaudeQueueFixture('injection-after-real');
  try {
    const real = 'muse 继续';
    queueClaude(fx, real);
    appendClaudeHuman(fx, real);
    queueClaude(fx, USAGE_LIMIT_RESET);
    appendClaudeInjection(fx, USAGE_LIMIT_RESET);
    const before = readFileSync(fx.statePath);
    expectCode('trailing injection', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
    queueClaude(fx, 'next real prompt');
    const uuid = appendClaudeHuman(fx, 'next real prompt');
    const result = observeClaude(fx);
    assert.equal(result.event.native_id, uuid, 'authority must come from the next real prompt');
    assert.equal(result.state.event_control.candidates.length, 0);
    assert.deepEqual(result.unwitnessed.map(item => [item.prompt_sha256, item.reason]),
      [[sha256Utf8(USAGE_LIMIT_RESET), 'next-native-turn-differs']]);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('harness injection: an injection after a turn has ended grants nothing, remains pending, and the next real prompt heals', () => {
  const fx = makeClaudeQueueFixture('injection-after-turn');
  try {
    const real = 'a turn that has already been attested';
    queueClaude(fx, real);
    appendClaudeHuman(fx, real);
    const first = observeClaude(fx);
    queueClaude(fx, USAGE_LIMIT_RESET);
    appendClaudeInjection(fx, USAGE_LIMIT_RESET);
    expectCode('injection after the turn ended', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    const after = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(after.event_control.candidates.length, 1, 'a non-human echo cannot disprove a delayed human candidate');
    assert.notEqual(after.state, 'TURN_ACTIVE', 'clearing injections must never grant authority');
    assert.equal(after.event_control.current?.status, 'closed', 'queueing the injection already ended the previous turn');
    assert.equal(after.event_control.consumed_events.length, first.state.event_control.consumed_events.length);
    const next = 'the user comes back and types again';
    queueClaude(fx, next);
    const uuid = appendClaudeHuman(fx, next);
    assert.equal(observeClaude(fx).event.native_id, uuid, 'the next real prompt must attest normally');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('harness injection: a human prompt after the injection still revokes authority', () => {
  const fx = makeClaudeQueueFixture('injection-then-human');
  try {
    const real = 'the prompt before the injection';
    queueClaude(fx, real);
    appendClaudeHuman(fx, real);
    queueClaude(fx, USAGE_LIMIT_RESET);
    appendClaudeInjection(fx, USAGE_LIMIT_RESET);
    appendClaudeHuman(fx, 'the user speaks again before any tool call');
    const before = readFileSync(fx.statePath);
    expectCode('human prompt after the injection', 'MISMATCH', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before, 'a revoked attestation must publish nothing');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('harness injection: a non-human echo of a real prompt never gets the real prompt dropped', () => {
  const fx = makeClaudeQueueFixture('injection-echo');
  try {
    const real = 'a real prompt that someone else echoed';
    queueClaude(fx, real);
    appendClaudeInjection(fx, real);
    const before = readFileSync(fx.statePath);
    expectCode('human echo before human flush', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before, 'non-human byte equality cannot discard a delayed human candidate');
    const uuid = appendClaudeHuman(fx, real);
    const result = observeClaude(fx);
    assert.equal(result.event.native_id, uuid, 'a candidate with a matching human row must attest, not be dropped');
    assert.equal(result.unwitnessed.length, 0);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

for (const shape of ['attachment', 'slash', 'non-human']) {
  lifecycleCheck(`bounded queue: 40 ${shape} candidates cannot keep the next real prompt out`, () => {
    const fx = makeClaudeQueueFixture(`capacity-${shape}`);
    try {
      const before = JSON.parse(readFileSync(fx.statePath, 'utf8')).event_control;
      for (let index = 0; index < 40; index += 1) {
        const prompt = `synthetic ${shape} ${index}`;
        queueClaude(fx, prompt);
        if (shape === 'attachment') appendClaudeSynthetic(fx, prompt);
        else if (shape === 'slash') appendClaudeSlashCommand(fx, `fixture-${index}`);
        else appendClaudeInjection(fx, prompt);
      }
      const pending = JSON.parse(readFileSync(fx.statePath, 'utf8'));
      assert.equal(pending.event_control.candidates.length, 32);
      assert.deepEqual(pending.event_control.cursor, before.cursor, 'capacity eviction must not advance cursor');
      assert.deepEqual(pending.event_control.consumed_events, before.consumed_events);
      assert.equal(pending.state, 'NO_PIN');
      const real = 'new human after bounded poison';
      queueClaude(fx, real);
      const uuid = appendClaudeHuman(fx, real);
      const result = observeClaude(fx);
      assert.equal(result.event.native_id, uuid);
      assert.equal(result.state.event_control.consumed_events.length, 1);
    } finally { rmSync(fx.root, { recursive: true, force: true }); }
  });
}

lifecycleCheck('bounded queue: evicting a real candidate cannot silently skip its orphan human row', () => {
  const fx = makeClaudeQueueFixture('capacity-orphan');
  try {
    queueClaude(fx, 'a real candidate evicted later');
    appendClaudeHuman(fx, 'a real candidate evicted later');
    for (let index = 0; index < 40; index += 1) queueClaude(fx, `poison ${index}`);
    queueClaude(fx, 'next real');
    appendClaudeHuman(fx, 'next real');
    const before = readFileSync(fx.statePath);
    expectCode('evicted orphan', 'MISMATCH', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('bounded queue: Codex accepts the next real prompt after 40 unwitnessed candidates', () => {
  const fx = makeLifecycleFixture('capacity-codex');
  try {
    for (let index = 0; index < 40; index += 1) queueLifecycle(fx, `poison ${index}`);
    queueLifecycle(fx, 'new Codex human');
    const native = nativePair(fx, 'new Codex human');
    const result = observeLifecycle(fx);
    assert.equal(result.event.native_id, native.sourceId);
    assert.equal(result.state.event_control.consumed_events.length, 1);
  } finally { rmSync(fx.root, { recursive: true, force: true }); }
});

lifecycleCheck('harness injection: an injection with no turn behind it grants nothing and remains pending', () => {
  const fx = makeClaudeQueueFixture('injection-alone-no-current');
  try {
    queueClaude(fx, USAGE_LIMIT_RESET);
    appendClaudeInjection(fx, USAGE_LIMIT_RESET);
    expectCode('injection with no current turn', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    const after = JSON.parse(readFileSync(fx.statePath, 'utf8'));
    assert.equal(after.event_control.candidates.length, 1, 'untrusted candidates wait without granting authority');
    assert.equal(after.event_control.consumed_events.length, 0, 'an injection must never be consumed');
    assert.notEqual(after.state, 'TURN_ACTIVE');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

lifecycleCheck('harness injection: an injection not yet written to the source is not dropped on a guess', () => {
  const fx = makeClaudeQueueFixture('injection-not-flushed');
  try {
    queueClaude(fx, USAGE_LIMIT_RESET);
    const before = readFileSync(fx.statePath);
    expectCode('unflushed injection', 'SOURCE_NOT_VISIBLE', () => observeClaude(fx));
    assert.deepEqual(readFileSync(fx.statePath), before);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});
