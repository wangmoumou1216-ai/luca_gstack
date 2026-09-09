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
