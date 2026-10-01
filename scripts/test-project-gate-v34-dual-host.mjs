#!/usr/bin/env node
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {withoutLocalGitEnv} from '../.claude/hooks/lib/git-env.mjs';
import {controlRoot, gitCommonDirRealpath} from './controlled-change.mjs';
import {
  attestPendingProjectEvent,
  initializeProjectEventFence,
  queueProjectEventCandidate,
  readProjectState,
} from '../.claude/hooks/lib/project-substrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceControl = controlRoot(ROOT);
function controlSnapshot() {
  if (!existsSync(sourceControl)) return {};
  return Object.fromEntries(readdirSync(sourceControl).sort().flatMap(task =>
    ['required-witness.json', 'active-context.json', 'receipt.json'].flatMap(name => {
      const file = join(sourceControl, task, name);
      return existsSync(file) ? [[`${task}/${name}`, readFileSync(file).toString('base64')]] : [];
    })));
}
const sourceControlBefore = controlSnapshot();
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

function copyFixtureSources(gstack) {
  // Native admission resolves the controller's file identity without importing it.
  const pending = [SCOPE_GUARD, CONTROLLED_GUARD, STOP_HOOK, ADAPTER, PROJECT_SH, PROJECT_PIN,
    join(ROOT, 'scripts', 'controlled-change-controller.mjs')];
  const copied = new Set();
  while (pending.length) {
    const source = pending.pop();
    if (copied.has(source)) continue;
    const path = relative(ROOT, source);
    assert.ok(path && !path.startsWith('..') && !path.startsWith('/'), 'fixture dependency must stay in source root');
    const target = join(gstack, path);
    mkdirSync(dirname(target), {recursive: true});
    copyFileSync(source, target);
    copied.add(source);
    const text = readFileSync(source, 'utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) pending.push(resolve(dirname(source), match[1]));
    }
  }
}

const fixtureTarget = (fx, target) => join(fx.gstack, relative(ROOT, target));

function makeFixture(harness) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `project-v34-${harness}-`)));
  const projects = join(root, 'projects');
  mkdirSync(projects);
  for (const name of ['alpha', 'beta']) {
    mkdirSync(join(projects, name, 'docs'), {recursive: true});
    writeFileSync(join(projects, name, 'CONTEXT.md'), `# ${name}\n`);
    writeFileSync(join(projects, name, 'docs', 'task.txt'), `${name}-task\n`);
  }
  const gstack = join(root, 'gstack');
  mkdirSync(join(gstack, '.claude'), {recursive: true});
  copyFixtureSources(gstack);
  const initialized = spawnSync('/usr/bin/git', ['init', '-q', gstack], {
    encoding: 'utf8', env: withoutLocalGitEnv(),
  });
  assert.equal(initialized.status, 0, initialized.stderr || initialized.stdout);
  const common = gitCommonDirRealpath(gstack);
  assert.equal(common, realpathSync(join(gstack, '.git')), 'fixture must have an independent Git directory');
  assert.notEqual(common, gitCommonDirRealpath(ROOT), 'fixture must not inherit source controlled state');
  assert.equal(realpathSync(join(gstack, '.claude')), join(realpathSync(gstack), '.claude'),
    'fixture state directory must be owned by the isolated checkout');
  if (harness === 'codex') {
    const trustedParent = join(homedir(), '.luca', 'codex');
    mkdirSync(trustedParent, {recursive: true});
    const codexHome = realpathSync(mkdtempSync(join(trustedParent, 'project-v34-host-')));
    return {harness, root, projects: realpathSync(projects), gstack: realpathSync(gstack), codexHome, stateSids: []};
  }
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
    ...withoutLocalGitEnv(),
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
  const ownedTarget = fixtureTarget(fx, target);
  return spawnSync(process.execPath, viaAdapter ? [fixtureTarget(fx, ADAPTER), ownedTarget] : [ownedTarget], {
    cwd: fx.gstack,
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
    cwd: fx.gstack, env: hookEnv(fx), encoding: 'utf8', timeout: 30000,
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
    for (const name of readdirSync(join(fx.gstack, '.claude'))) {
      if (name.startsWith(`.session-event-closed-${sid}-`)) rmSync(join(fx.gstack, '.claude', name), {force: true});
    }
    for (const suffix of ['', '.lock']) rmSync(join(fx.gstack, '.claude', `.session-project-${sid}${suffix}`), {force: true});
  }
  if (fx.codexHome) rmSync(fx.codexHome, {recursive: true, force: true});
  rmSync(fx.root, {recursive: true, force: true});
}

for (const harness of ['claude', 'codex']) {
  const fx = makeFixture(harness);
  try {
    const sid = `v34-${harness}-${randomUUID().slice(0, 8)}`;
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
    const unknown = spawnSync(process.execPath, [fixtureTarget(fx, PROJECT_PIN), 'status', '--view', 'host',
      '--session-id', sid, '--operation', 'missing-operation'], {
      cwd: fx.gstack, env: hookEnv(fx), encoding: 'utf8', timeout: 30000,
    });
    const unknownOut = parse(unknown.stdout);
    ok(`${harness} unknown-result lookup is explicit and read-only`, unknown.status === 0
      && unknownOut?.queried_receipt?.lookup === 'EXPIRED_OR_UNKNOWN'
      && unknownOut?.execution_authority === 'NOT_PROVIDED'
      && readFileSync(join(fx.gstack, '.claude', `.session-project-${sid}`)).equals(beforeStatus),
    unknown.stderr || unknown.stdout);

    const noPinSid = `v34-${harness}-no-${randomUUID().slice(0, 8)}`;
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

    const brokenSid = `v34-${harness}-bad-${randomUUID().slice(0, 8)}`;
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
  const fx = makeFixture('codex');
  try {
    const sid = `v34-codex-fail-${randomUUID().slice(0, 8)}`;
    const statePath = join(fx.gstack, '.claude', `.session-project-${sid}`);
    assert.equal(existsSync(statePath), false, 'failure probe must begin without owned session state');
    const failed = runHook(fx, SCOPE_GUARD, {
      hook_event_name: 'PreToolUse', session_id: sid, cwd: fx.gstack,
      tool_name: 'Bash', tool_input: {command: './scripts/project.sh switch alpha'},
    }, {LUCA_CONTROLLED_TEST_ADAPTER_READ_ERROR: 'project-scope'});
    ok('codex adapter runtime failure consults the durable witness and never prepares a selection',
      [0, 2].includes(failed.status) && /consulting durable witness|runtime failed|adapter/.test(failed.stderr)
      && !existsSync(statePath), failed.stderr || failed.stdout);
  } finally {
    cleanupFixture(fx);
  }
}


{
  const fx = makeFixture('codex');
  try {
    const git = (...args) => {
      const r = spawnSync('/usr/bin/git', ['-C', fx.gstack, ...args], {
        env: withoutLocalGitEnv(), encoding: 'utf8', timeout: 30000,
      });
      assert.equal(r.status, 0, r.stderr || r.stdout);
      return r.stdout.trim();
    };
    git('config', 'user.name', 'Project Gate Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('commit', '--allow-empty', '-qm', 'fixture');
    const baseline = git('rev-parse', 'HEAD');
    const scratch = join(fx.root, 'scratch');
    mkdirSync(scratch);
    const manifestPath = join(scratch, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify({
      schema_version: 1, task_id: 'project-v34-adapter-failure', u_id: 'U-013',
      repo_realpath: fx.gstack, git_common_dir_realpath: gitCommonDirRealpath(fx.gstack),
      plan_sha256: '0'.repeat(64), plan_recorded_baseline: baseline, observed_baseline: baseline,
      session: 'v34-codex-adapter-failure', scratch_root: scratch,
      repo_paths: [], external_paths: [], mutation_classes: [], approved_effects: [], allowed_commands: [],
    }) + '\n');
    const controller = (...args) => spawnSync(process.execPath, [
      join(fx.gstack, 'scripts/controlled-change-controller.mjs'), ...args, '--manifest', manifestPath,
    ], {cwd: fx.gstack, env: hookEnv(fx), encoding: 'utf8', timeout: 30000});
    const prepared = controller('prepare', '--legacy-checkout-exclusive', 'true', '--generation', 'project-v34-adapter-failure-0001');
    assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
    const statePath = join(fx.gstack, '.claude', '.session-project-v34-codex-adapter-failure');
    const failed = runHook(fx, SCOPE_GUARD, {
      hook_event_name: 'PreToolUse', session_id: 'v34-codex-adapter-failure',
      cwd: fx.gstack, tool_name: 'Bash', tool_input: {command: './scripts/project.sh switch alpha'},
    }, {LUCA_CONTROLLED_TEST_ADAPTER_READ_ERROR: 'project-scope'});
    ok('codex adapter failure under an active fixture controller refuses and preserves selection state',
      failed.status === 2 && /consulting durable witness|runtime failed|adapter/.test(failed.stderr)
      && !existsSync(statePath), failed.stderr || failed.stdout);
    const closed = controller('abort', '--reason', 'fixture-complete');
    assert.equal(closed.status, 0, closed.stderr || closed.stdout);
  } finally {
    cleanupFixture(fx);
  }
}

ok('dual-host fixtures preserve the enclosing repository control authority',
  JSON.stringify(controlSnapshot()) === JSON.stringify(sourceControlBefore));

process.stdout.write(`\n=== project-gate v3.4 dual-host summary: PASS=${pass} FAIL=0 ===\n`);
