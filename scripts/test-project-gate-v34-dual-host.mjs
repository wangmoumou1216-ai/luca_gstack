#!/usr/bin/env node
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  attestPendingProjectEvent,
  initializeProjectEventFence,
  queueProjectEventCandidate,
  readProjectState,
} from '../.claude/hooks/lib/project-substrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE_GUARD = join(ROOT, '.claude', 'hooks', 'project-scope-guard.mjs');
const CONTROLLED_GUARD = join(ROOT, '.claude', 'hooks', 'controlled-change-guard.mjs');
const STOP_HOOK = join(ROOT, '.claude', 'hooks', 'session-sync.mjs');
const ADAPTER = join(ROOT, '.codex', 'codex-hook-adapter.mjs');
const PROJECT_SH = join(ROOT, 'scripts', 'project.sh');
const PROJECT_PIN = join(ROOT, 'scripts', 'project-pin.mjs');
let pass = 0;
const ok = (name, condition, detail = '') => {
  assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`);
  pass++;
  process.stdout.write(`PASS ${name}\n`);
};
const parse = value => { try { return JSON.parse(String(value).trim()); } catch { return null; } };

function makeFixture(harness) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `project-v34-${harness}-`)));
  const projects = join(root, 'projects');
  mkdirSync(projects);
  for (const name of ['alpha', 'beta']) {
    mkdirSync(join(projects, name, 'docs'), {recursive: true});
    writeFileSync(join(projects, name, 'CONTEXT.md'), `# ${name}\n`);
    writeFileSync(join(projects, name, 'docs', 'task.txt'), `${name}-task\n`);
  }
  if (harness === 'codex') {
    const trustedParent = join(homedir(), '.luca', 'codex');
    mkdirSync(trustedParent, {recursive: true});
    const codexHome = realpathSync(mkdtempSync(join(trustedParent, 'project-v34-host-')));
    return {harness, root, projects: realpathSync(projects), gstack: ROOT, codexHome, stateSids: []};
  }
  const gstack = join(root, 'gstack');
  mkdirSync(join(gstack, '.claude'), {recursive: true});
  const initialized = spawnSync('/usr/bin/git', ['init', '-q', gstack], {encoding: 'utf8'});
  assert.equal(initialized.status, 0, initialized.stderr || initialized.stdout);
  const transcripts = join(root, 'transcripts');
  mkdirSync(transcripts);
  return {harness, root, projects: realpathSync(projects), gstack: realpathSync(gstack), transcripts, stateSids: []};
}

function sourceFor(fx, sid) {
  if (fx.harness === 'claude') {
    const transcript = join(fx.transcripts, `${sid}.jsonl`);
    writeFileSync(transcript, `${JSON.stringify({type: 'system', sessionId: sid})}\n`);
    return transcript;
  }
  const dir = join(fx.codexHome, 'sessions', '2026', '09', '26');
  mkdirSync(dir, {recursive: true});
  const transcript = join(dir, `rollout-2026-09-26T00-00-00-${sid}.jsonl`);
  writeFileSync(transcript, `${JSON.stringify({
    type: 'session_meta', timestamp: '2026-09-26T00:00:00.000Z',
    payload: {id: sid, session_id: sid, cwd: fx.gstack, thread_source: 'user',
      originator: 'codex-tui', parent_thread_id: null, forked_from_id: null},
  })}\n`);
  return transcript;
}

function initializeSession(fx, sid) {
  fx.stateSids.push(sid);
  const transcript = sourceFor(fx, sid);
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    initializeProjectEventFence({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid,
      harness: fx.harness, cwd: fx.gstack,
      ...(fx.harness === 'claude' ? {transcriptPath: transcript} : {codexHome: fx.codexHome}),
    });
  } finally {
    if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previous;
  }
  return transcript;
}

function appendNativeTurn(fx, sid, transcript, prompt, boundary) {
  if (fx.harness === 'claude') {
    appendFileSync(transcript, `${JSON.stringify({
      type: 'user', uuid: randomUUID(), sessionId: sid, cwd: fx.gstack,
      userType: 'external', isSidechain: false, isMeta: false,
      origin: {kind: 'human'}, promptSource: 'typed',
      message: {role: 'user', content: prompt},
    })}\n`);
    return;
  }
  const nativeId = `msg_user_${sid}`;
  const anchorId = `anchor-${sid}`;
  appendFileSync(transcript, `${JSON.stringify({
    type: 'response_item', timestamp: '2026-09-26T00:00:01.000Z',
    payload: {type: 'message', role: 'user', id: nativeId,
      content: [{type: 'input_text', text: prompt}],
      internal_chat_message_metadata_passthrough: {turn_id: boundary}},
  })}\n${JSON.stringify({
    type: 'event_msg', timestamp: '2026-09-26T00:00:01.001Z',
    payload: {type: 'item_completed', thread_id: sid, turn_id: boundary,
      item: {type: 'UserMessage', id: anchorId, content: [{type: 'text', text: prompt}]}},
  })}\n`);
}

function openTurn(fx, sid, prompt) {
  const transcript = initializeSession(fx, sid);
  const boundary = fx.harness === 'claude' ? sid : `turn-${sid}`;
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid,
    boundaryId: boundary, cwd: fx.gstack, harness: fx.harness,
    prompt, promptId: boundary, intent: {kind: 'turn'},
  });
  appendNativeTurn(fx, sid, transcript, prompt, boundary);
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    const observed = attestPendingProjectEvent({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid,
      boundaryId: boundary, cwd: fx.gstack, observation: 'pre-tool',
      ...(fx.harness === 'claude' ? {transcriptPath: transcript} : {codexHome: fx.codexHome}),
    });
    assert.equal(observed.state.state, 'NO_PIN');
  } finally {
    if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previous;
  }
  return {transcript, boundary};
}

function hookEnv(fx) {
  return {
    ...process.env,
    CLAUDE_PROJECT_DIR: fx.gstack,
    LUCA_GSTACK_ROOT: fx.gstack,
    LUCA_PROJECTS_ROOT: fx.projects,
    LUCA_ACTUAL_HARNESS: fx.harness,
    LUCA_EVENT_ATTESTATION_TEST: '1',
    ...(fx.codexHome ? {CODEX_HOME: fx.codexHome} : {}),
  };
}

function runHook(fx, target, payload, extraEnv = {}) {
  const viaAdapter = fx.harness === 'codex';
  return spawnSync(process.execPath, viaAdapter ? [ADAPTER, target] : [target], {
    cwd: viaAdapter ? ROOT : fx.gstack,
    env: {...hookEnv(fx), ...extraEnv},
    input: JSON.stringify(payload), encoding: 'utf8', timeout: 30000,
  });
}

function eventPayload(fx, sid, event, body) {
  return {
    hook_event_name: event,
    session_id: sid,
    cwd: fx.gstack,
    ...(fx.harness === 'claude'
      ? {prompt_id: sid, transcript_path: join(fx.transcripts, `${sid}.jsonl`)}
      : {turn_id: `turn-${sid}`}),
    ...body,
  };
}

function executeExpanded(fx, command) {
  return spawnSync('/bin/bash', ['-lc', command], {
    cwd: ROOT, env: hookEnv(fx), encoding: 'utf8', timeout: 30000,
  });
}

function appendAssistant(fx, transcript, text) {
  if (fx.harness === 'claude') {
    appendFileSync(transcript, `${JSON.stringify({
      type: 'assistant', uuid: randomUUID(),
      message: {role: 'assistant', content: [{type: 'text', text}]},
    })}\n`);
  } else {
    appendFileSync(transcript, `${JSON.stringify({
      type: 'response_item', timestamp: '2026-09-26T00:00:02.000Z',
      payload: {type: 'message', role: 'assistant', id: `msg_assistant_${randomUUID()}`,
        content: [{type: 'output_text', text}]},
    })}\n`);
  }
}

function cleanupFixture(fx) {
  for (const sid of fx.stateSids) {
    for (const suffix of ['', '.lock']) rmSync(join(fx.gstack, '.claude', `.session-project-${sid}${suffix}`), {force: true});
  }
  if (fx.codexHome) rmSync(fx.codexHome, {recursive: true, force: true});
  rmSync(fx.root, {recursive: true, force: true});
}

for (const harness of ['claude', 'codex']) {
  const fx = makeFixture(harness);
  try {
    const sid = `v34-${harness}-main`;
    const active = openTurn(fx, sid, `enter beta and read its task (${harness})`);
    const publicSelection = './scripts/project.sh switch beta';
    const prepared = runHook(fx, SCOPE_GUARD, eventPayload(fx, sid, 'PreToolUse', {
      tool_name: 'Bash', tool_input: {command: publicSelection},
    }));
    ok(`${harness} enter uses the real scope-hook path`, prepared.status === 0,
      prepared.stderr || prepared.stdout);
    const preparedOut = parse(prepared.stdout);
    const expanded = preparedOut?.hookSpecificOutput?.updatedInput?.command;
    ok(`${harness} enter rewrites one public argv to a trusted controller argv`,
      typeof expanded === 'string' && expanded.includes('--session-id') && expanded.includes('--tx'),
      prepared.stderr || prepared.stdout);
    if (harness === 'claude') {
      const controlled = runHook(fx, CONTROLLED_GUARD, eventPayload(fx, sid, 'PreToolUse', {
        tool_name: 'Bash', tool_input: {command: expanded},
      }));
      ok('claude enter passes the independent controlled hook',
        controlled.status === 0 && parse(controlled.stdout)?.hookSpecificOutput?.permissionDecision !== 'deny',
        controlled.stderr || controlled.stdout);
    } else {
      ok('codex adapter preserves updatedInput as an allow decision',
        preparedOut?.hookSpecificOutput?.permissionDecision === 'allow');
    }
    const committed = executeExpanded(fx, expanded);
    ok(`${harness} trusted enter controller commits`, committed.status === 0,
      committed.stderr || committed.stdout);
    let state = readProjectState(fx.gstack, sid, fx.projects).value;
    ok(`${harness} enter commits beta in the same native event`,
      state.state === 'TURN_ACTIVE' && state.binding?.project === 'beta');

    const task = runHook(fx, SCOPE_GUARD, eventPayload(fx, sid, 'PreToolUse', {
      tool_name: 'Read', tool_input: {file_path: 'docs/task.txt'},
    }));
    const taskOut = parse(task.stdout);
    const taskPath = taskOut?.hookSpecificOutput?.updatedInput?.file_path;
    ok(`${harness} same-event task resolves only against beta's absolute root`,
      task.status === 0 && taskPath === join(fx.projects, 'beta', 'docs', 'task.txt')
      && readFileSync(taskPath, 'utf8') === 'beta-task\n', task.stderr || task.stdout);

    const beforeStatus = readFileSync(join(fx.gstack, '.claude', `.session-project-${sid}`));
    const unknown = spawnSync(process.execPath, [PROJECT_PIN, 'status', '--view', 'host',
      '--session-id', sid, '--operation', 'missing-operation'], {
      cwd: ROOT, env: hookEnv(fx), encoding: 'utf8', timeout: 30000,
    });
    const unknownOut = parse(unknown.stdout);
    ok(`${harness} unknown-result lookup is explicit and read-only`, unknown.status === 0
      && unknownOut?.queried_receipt?.lookup === 'EXPIRED_OR_UNKNOWN'
      && unknownOut?.execution_authority === 'NOT_PROVIDED'
      && readFileSync(join(fx.gstack, '.claude', `.session-project-${sid}`)).equals(beforeStatus),
    unknown.stderr || unknown.stdout);

    const noPinSid = `v34-${harness}-nopin`;
    openTurn(fx, noPinSid, `read one explicit absolute path (${harness})`);
    const absoluteTarget = join(fx.projects, 'alpha', 'docs', 'task.txt');
    const absoluteRead = runHook(fx, SCOPE_GUARD, eventPayload(fx, noPinSid, 'PreToolUse', {
      tool_name: 'Read', tool_input: {file_path: absoluteTarget},
    }));
    const absoluteOut = parse(absoluteRead.stdout);
    ok(`${harness} NO_PIN absolute read does not force a selection`, absoluteRead.status === 0
      && absoluteOut?.hookSpecificOutput?.permissionDecision !== 'deny'
      && readProjectState(fx.gstack, noPinSid, fx.projects).value.binding == null
      && readProjectState(fx.gstack, noPinSid, fx.projects).value.selection?.last_success == null,
    absoluteRead.stderr || absoluteRead.stdout);
    const refused = runHook(fx, SCOPE_GUARD, eventPayload(fx, noPinSid, 'PreToolUse', {
      tool_name: 'Write', tool_input: {file_path: 'docs/not-authorized.md', content: 'x'},
    }));
    ok(`${harness} adapter/hook refusal remains fail-closed for an unbound relative write`,
      parse(refused.stdout)?.hookSpecificOutput?.permissionDecision === 'deny', refused.stderr || refused.stdout);

    const cancelPrepared = runHook(fx, SCOPE_GUARD, eventPayload(fx, sid, 'PreToolUse', {
      tool_name: 'Bash', tool_input: {command: './scripts/project.sh switch alpha'},
    }));
    ok(`${harness} cancellation fixture has one unissued PREPARED operation`,
      typeof parse(cancelPrepared.stdout)?.hookSpecificOutput?.updatedInput?.command === 'string');
    appendAssistant(fx, active.transcript, `cancel ${harness} queued selection`);
    const stopped = runHook(fx, STOP_HOOK, eventPayload(fx, sid, 'Stop', {
      stop_hook_active: false, last_assistant_message: `cancel ${harness} queued selection`,
    }), {SESSION_SYNC_FORCE_ON_STOP: '0'});
    ok(`${harness} Stop cancellation runs through the real host hook`, stopped.status === 0,
      stopped.stderr || stopped.stdout);
    state = readProjectState(fx.gstack, sid, fx.projects).value;
    ok(`${harness} cancellation prevents the unissued selection and preserves beta`,
      state.binding?.project === 'beta' && state.selection?.pending == null
      && state.selection?.latest_operation?.status === 'EXPIRED_OR_UNKNOWN');

    const brokenSid = `v34-${harness}-broken`;
    fx.stateSids.push(brokenSid);
    const brokenPath = join(fx.gstack, '.claude', `.session-project-${brokenSid}`);
    writeFileSync(brokenPath, '{broken-state\n');
    const brokenBefore = readFileSync(brokenPath);
    const degraded = runHook(fx, SCOPE_GUARD, {
      hook_event_name: 'PreToolUse', session_id: brokenSid, cwd: fx.gstack,
      ...(harness === 'claude' ? {prompt_id: brokenSid} : {turn_id: `turn-${brokenSid}`}),
      tool_name: 'Bash', tool_input: {command: './scripts/project.sh switch alpha'},
    });
    ok(`${harness} malformed authority degrades to refusal without repair`,
      parse(degraded.stdout)?.hookSpecificOutput?.permissionDecision === 'deny'
      && readFileSync(brokenPath).equals(brokenBefore), degraded.stderr || degraded.stdout);
  } finally {
    cleanupFixture(fx);
  }
}

{
  const statePath = join(ROOT, '.claude', '.session-project-v34-codex-adapter-failure');
  rmSync(statePath, {force: true});
  const failed = spawnSync(process.execPath, [ADAPTER, SCOPE_GUARD], {
    cwd: ROOT,
    env: {...process.env, LUCA_CONTROLLED_TEST_ADAPTER_READ_ERROR: 'project-scope'},
    input: JSON.stringify({hook_event_name: 'PreToolUse', session_id: 'v34-codex-adapter-failure',
      cwd: ROOT, tool_name: 'Bash', tool_input: {command: './scripts/project.sh switch alpha'}}),
    encoding: 'utf8', timeout: 30000,
  });
  ok('codex adapter runtime failure consults the durable witness and never prepares a selection',
    [0, 2].includes(failed.status) && /consulting durable witness|runtime failed|adapter/.test(failed.stderr)
    && !existsSync(statePath), failed.stderr || failed.stdout);
}

process.stdout.write(`\n=== project-gate v3.4 dual-host summary: PASS=${pass} FAIL=0 ===\n`);
