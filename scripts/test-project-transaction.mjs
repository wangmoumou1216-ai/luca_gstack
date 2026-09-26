#!/usr/bin/env node
import assert from 'assert';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { spawn, spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import {
  attestPendingProjectEvent,
  closeAttestedProjectEvent,
  initializeProjectEventFence,
  queueProjectEventCandidate,
  readProjectState,
  refenceProjectStateForDeactivate,
  validatedBindingForState,
} from '../.claude/hooks/lib/project-substrate.mjs';
import { projectReservationPath } from '../.claude/hooks/lib/project-selection.mjs';

const REPO = process.cwd();
const PIN = resolve(REPO, 'scripts/project-pin.mjs');
const LEASE = resolve(REPO, 'scripts/project-lease.mjs');
const PROJECT_SH = resolve(REPO, 'scripts/project.sh');
const GUARD = resolve(REPO, '.claude/hooks/project-scope-guard.mjs');
const ROUTE_GUARD = resolve(REPO, '.claude/hooks/route-guard.mjs');
const STOP_HOOK = resolve(REPO, '.claude/hooks/session-sync.mjs');
const CHECK_LINKS = resolve(REPO, 'scripts/check-project-links.mjs');
let pass = 0;
let fail = 0;

function check(name, fn) {
  try { fn(); pass += 1; console.log(`PASS ${name}`); }
  catch (error) { fail += 1; console.error(`FAIL ${name}: ${error.stack || error}`); }
}

function makeEnv() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'project-tx-')));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const transcripts = join(root, 'transcripts');
  mkdirSync(join(gstack, '.claude', 'templates'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  mkdirSync(transcripts, { recursive: true });
  writeFileSync(join(gstack, '.claude', 'templates', 'workflow-state.yaml'), 'topic: ""\nnodes: {}\n');
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: gstack,
    LUCA_GSTACK_ROOT: gstack,
    LUCA_PROJECTS_ROOT: projects,
    LUCA_ACTUAL_HARNESS: 'claude',
    LUCA_EVENT_ATTESTATION_TEST: '1',
  };
  return { root, gstack, projects, transcripts, env };
}

function makeProject(fx, name) {
  const root = join(fx.projects, name);
  mkdirSync(join(root, 'docs', 'handoff'), { recursive: true });
  mkdirSync(join(root, '.luca', 'memory'), { recursive: true });
  writeFileSync(join(root, '.luca', 'workflow-state.yaml'), `topic: "${name}"\nnodes: {}\n`);
  writeFileSync(join(root, '.luca', 'current-topic.txt'), `${name}\n`);
  writeFileSync(join(root, '.luca', 'memory', 'MEMORY.md'), `# ${name}\n`);
  writeFileSync(join(root, 'CONTEXT.md'), `# ${name}\n`);
  return root;
}

function runNode(script, args, fx, extraEnv = {}) {
  return spawnSync('node', [script, ...args], {
    cwd: REPO,
    env: { ...fx.env, ...extraEnv },
    encoding: 'utf8',
  });
}

function jsonOut(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function attestCandidate(fx, sid, observation = 'pre-tool') {
  const state = readProjectState(fx.gstack, sid, fx.projects).value;
  const candidate = state.event_control?.candidates?.[0];
  assert.ok(candidate, 'native event candidate must be queued before attestation');
  assert.equal(candidate.boundary_id, sid, 'Claude transport boundary must equal the native session id');
  const prompt = Buffer.from(candidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const transcriptPath = join(fx.transcripts, `${sid}.jsonl`);
  appendFileSync(transcriptPath, `${JSON.stringify({
    type: 'user',
    uuid: randomUUID(),
    sessionId: sid,
    cwd: fx.gstack,
    userType: 'external',
    isSidechain: false,
    isMeta: false,
    origin: { kind: 'human' },
    promptSource: 'typed',
    message: { role: 'user', content: prompt },
  })}\n`);
  const previousTestMode = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return attestPendingProjectEvent({
      gstackRoot: fx.gstack,
      projectsRoot: fx.projects,
      sessionId: sid,
      boundaryId: sid,
      cwd: fx.gstack,
      observation,
      transcriptPath,
    });
  } finally {
    if (previousTestMode === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previousTestMode;
  }
}

function prepare(fx, sid, operation, target) {
  initializeFence(fx, sid);
  prepare.serial = (prepare.serial || 0) + 1;
  const serial = prepare.serial;
  const current = readProjectState(fx.gstack, sid, fx.projects).value;
  const binding = validatedBindingForState(current, fx.projects);
  const proposal = {
    kind: 'switch',
    tx: `native-switch-tx-${serial}`,
    operation,
    target,
    expected_epoch: binding?.epoch || 0,
  };
  const boundary = sid;
  queueProjectEventCandidate({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: sid,
    boundaryId: boundary,
    cwd: fx.gstack,
    harness: 'claude',
    prompt: `${operation} project ${target}`,
    promptId: boundary,
    intent: proposal,
  });
  const attested = attestCandidate(fx, sid);
  assert.equal(attested.state.state, 'SWITCH_ONLY');
  return attested.state.switch;
}

function mutate(fx, sid, operation, target, proposal, extraEnv = {}) {
  return spawnSync('bash', [PROJECT_SH, operation, target,
    '--session-id', sid,
    '--tx', proposal.tx,
    '--expected-epoch', String(proposal.expected_epoch)], {
    cwd: REPO,
    env: { ...fx.env, ...extraEnv },
    encoding: 'utf8',
  });
}

function bind(fx, sid, project) {
  const proposal = prepare(fx, sid, 'switch', project);
  const result = mutate(fx, sid, 'switch', project, proposal);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return jsonOut(runNode(PIN, ['status', '--session', sid], fx));
}

function closeCurrentEvent(fx, sid, outcome = 'test-close') {
  const state = readProjectState(fx.gstack, sid, fx.projects).value;
  const current = state?.event_control?.current;
  assert.equal(current?.status, 'active', `session ${sid} must have an active event to close`);
  closeAttestedProjectEvent({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: sid,
    eventId: current.event_id,
    boundaryId: current.boundary_id,
    outcome,
  });
}

function beginTurn(fx, sid, turn = 'turn-1', prompt = `project work ${turn}`) {
  initializeFence(fx, sid);
  const boundary = sid;
  queueProjectEventCandidate({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: sid,
    boundaryId: boundary,
    cwd: fx.gstack,
    harness: 'claude',
    prompt,
    promptId: boundary,
    intent: { kind: 'route', decision: 'continue' },
  });
  return attestCandidate(fx, sid).state;
}

function initializeFence(fx, sid) {
  if (readProjectState(fx.gstack, sid, fx.projects).value?.event_control?.fence) return;
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    const transcriptPath = join(fx.transcripts, `${sid}.jsonl`);
    if (!existsSync(transcriptPath)) writeFileSync(transcriptPath, `${JSON.stringify({ type: 'system', sessionId: sid })}\n`);
    initializeProjectEventFence({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid,
      harness: 'claude', cwd: fx.gstack, transcriptPath,
    });
  } finally {
    if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previous;
  }
}

function guard(fx, payload) {
  const state = readProjectState(fx.gstack, payload.session_id, fx.projects).value;
  const boundary = state.event_control?.current?.boundary_id
    || state.event_control?.candidates?.[0]?.boundary_id
    || '';
  const observed = {
    cwd: fx.gstack,
    transcript_path: join(fx.transcripts, `${payload.session_id}.jsonl`),
    ...(boundary && !payload.turn_id && !payload.prompt_id ? { prompt_id: boundary } : {}),
    ...payload,
  };
  const result = spawnSync('node', [GUARD], {
    cwd: fx.gstack,
    env: fx.env,
    input: JSON.stringify(observed),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function stateBytes(fx, sid) {
  return readFileSync(join(fx.gstack, '.claude', `.session-project-${sid}`));
}

function linkTuple(fx) {
  const paths = [join(fx.gstack, 'docs'), join(fx.gstack, '.claude', 'workflow-state.yaml'), join(fx.gstack, '.claude', 'current-topic.txt')];
  return paths.map((path) => {
    try { return lstatSync(path).isSymbolicLink() ? readlinkSync(path) : `NON_SYMLINK:${path}`; }
    catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
  });
}

check('NO_PIN denies shared Read/Grep/Glob/Bash instead of following display links', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  const payloads = [
    { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } },
    { session_id: 'NP', tool_name: 'Grep', tool_input: { path: 'docs', pattern: 'x' } },
    { session_id: 'NP', tool_name: 'Glob', tool_input: { path: 'docs', pattern: '**/*' } },
    { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'cat docs/x.md' } },
  ];
  for (const payload of payloads) {
    const out = guard(fx, payload);
    assert.equal(out?.hookSpecificOutput?.permissionDecision, 'deny', payload.tool_name);
  }
});

check('switch transaction commits canonical identity and epoch without mutating display aliases', () => {
  const fx = makeEnv();
  const alpha = makeProject(fx, 'alpha');
  const state = bind(fx, 'S', 'alpha');
  assert.equal(state.state, 'TURN_ACTIVE');
  assert.equal(state.binding.project, 'alpha');
  assert.equal(state.binding.epoch, 1);
  assert.equal(state.binding.realpath, realpathSync(alpha));
  assert.ok(Number.isInteger(state.binding.dev));
  assert.ok(Number.isInteger(state.binding.ino));
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(Object.hasOwn(state, 'display_links'), false,
    'ordinary status must not consult compatibility display aliases');
  const listed = spawnSync('bash', [PROJECT_SH, 'list'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).projects.map(item => item.project), ['alpha']);
});

check('every switch write-boundary fault preserves old pin bytes and old link tuple', () => {
  const boundaries = ['after-target-validate'];
  for (const fault of boundaries) {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    bind(fx, 'S', 'alpha');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const proposal = prepare(fx, 'S', 'switch', 'beta');
    const result = mutate(fx, 'S', 'switch', 'beta', proposal, { LUCA_PROJECT_FAULT: fault });
    assert.notEqual(result.status, 0, `${fault} should fail`);
    assert.deepEqual(linkTuple(fx), links, `${fault}: display aliases changed`);
    const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
    assert.equal(status.state, 'TURN_ACTIVE');
    assert.equal(status.binding.project, 'alpha');
    assert.equal(status.selection.pending, null);
    assert.equal(status.selection.latest_operation.status, 'FAILED');
    const failedBytes = stateBytes(fx, 'S');
    const retry = mutate(fx, 'S', 'switch', 'beta', proposal);
    assert.notEqual(retry.status, 0, 'FAILED receipt must not become replay authority');
    assert.deepEqual(stateBytes(fx, 'S'), failedBytes);
    assert.deepEqual(Buffer.from(JSON.stringify(status.binding.project)), Buffer.from(JSON.stringify('alpha')));
    assert.ok(before.length > 0);
  }
});

check('committed tx replay is byte-idempotent while a stale epoch cannot mutate project or pin', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  const first = prepare(fx, 'S', 'switch', 'alpha');
  assert.equal(mutate(fx, 'S', 'switch', 'alpha', first).status, 0);
  const committed = stateBytes(fx, 'S');
  const replay = mutate(fx, 'S', 'switch', 'alpha', first);
  assert.equal(replay.status, 0, replay.stderr || replay.stdout);
  assert.deepEqual(stateBytes(fx, 'S'), committed, 'committed replay must not publish new state bytes');
  const second = prepare(fx, 'S', 'switch', 'beta');
  const stale = spawnSync('bash', [PROJECT_SH, 'switch', 'beta', '--session-id', 'S', '--tx', second.tx, '--expected-epoch', '0'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.notEqual(stale.status, 0);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).switch.binding.project, 'alpha');
});

check('dead RUNNING owner is recoverable by the same tx without minting new authority', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const crashed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_FAULT: 'crash-after-execution-claim',
  });
  assert.equal(crashed.status, 86);
  const interrupted = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(interrupted.state, 'SWITCH_ONLY');
  assert.equal(interrupted.selection.pending.status, 'RUNNING');
  assert.equal(interrupted.selection.pending.tx, proposal.tx);
  const resumed = mutate(fx, 'S', 'switch', 'beta', proposal);
  assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
  const committed = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(committed.state, 'TURN_ACTIVE');
  assert.equal(committed.binding.project, 'beta');
  assert.equal(committed.selection.last_success.commit_id, proposal.tx);
});

check('retired raw turn-id control commands stay rejected without changing attested state', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const before = stateBytes(fx, 'S');
  const retired = [
    ['prepare', '--session', 'S', '--operation', 'switch', '--target', 'beta', '--turn-id', 'raw-switch'],
    ['begin-turn', '--session', 'S', '--turn-id', 'raw-work'],
    ['close-turn', '--session', 'S', '--turn-id', 'raw-work', '--expected-epoch', '1'],
    ['close-switch-turn', '--session', 'S', '--turn-id', 'raw-switch', '--expected-epoch', '1'],
  ];
  for (const args of retired) {
    const result = runNode(PIN, args, fx);
    assert.notEqual(result.status, 0, `${args[0]} must stay retired`);
    assert.match(result.stderr, /raw turn-id authority is retired/);
    assert.deepEqual(stateBytes(fx, 'S'), before, `${args[0]} must not mutate native-event authority`);
  }
});

check('forged schema-v3 SWITCH_ONLY without matching native event authority cannot mutate', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const bound = readProjectState(fx.gstack, 'S', fx.projects).value;
  const forged = {
    schema_version: 3,
    state: 'SWITCH_ONLY',
    session_id: 'S',
    switch: {
      tx: 'forged-tx',
      operation: 'switch',
      target: 'beta',
      expected_epoch: 1,
      binding: bound.binding,
      event_id: 'claude:forged-event',
      boundary_id: 'forged-boundary',
    },
    event_control: {
      candidates: [],
      current: null,
      cursor: null,
      consumed_events: [],
    },
  };
  const path = join(fx.gstack, '.claude', '.session-project-S');
  writeFileSync(path, `${JSON.stringify(forged)}\n`);
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  const result = mutate(fx, 'S', 'switch', 'beta', forged.switch);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /lacks matching native event authority/);
  assert.deepEqual(stateBytes(fx, 'S'), before);
  assert.deepEqual(linkTuple(fx), links);
});

check('same-turn compound switch+project work is denied; exact mutation is the sole project command', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'switch', 'beta');
  const exact = `./scripts/project.sh switch beta --session-id S --tx ${p.tx} --expected-epoch ${p.expected_epoch}`;
  const good = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: exact } });
  assert.equal(good, null, `exact switch mutation should pass unchanged: ${JSON.stringify(good)}`);
  const bad = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `${exact} && cat docs/x.md` } });
  assert.equal(bad?.hookSpecificOutput?.permissionDecision, 'deny');
});

check('successful switch continues in the same attested event while internal injection remains denied', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'switch', 'beta');
  assert.equal(mutate(fx, 'S', 'switch', 'beta', p).status, 0);
  const sameTurn = guard(fx, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(sameTurn?.hookSpecificOutput?.updatedInput?.file_path, join(realpathSync(join(fx.projects, 'beta')), 'docs', 'x.md'),
    `same-event project read must redirect: ${JSON.stringify(sameTurn)}`);
  const injectBypass = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'node scripts/project-pin.mjs inject --target beta' } });
  assert.equal(injectBypass?.hookSpecificOutput?.permissionDecision, 'deny', 'internal context-injection bypass must stay denied');
});

check('rename, symlink replacement, and inode replacement invalidate an active binding', () => {
  for (const mode of ['rename', 'symlink', 'inode']) {
    const fx = makeEnv();
    const alpha = makeProject(fx, 'alpha');
    bind(fx, 'S', 'alpha');
    beginTurn(fx, 'S');
    const parked = join(fx.projects, 'parked');
    renameSync(alpha, parked);
    if (mode === 'symlink') symlinkSync(parked, alpha);
    else if (mode === 'inode') makeProject(fx, 'alpha');
    const out = guard(fx, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
    assert.equal(out?.hookSpecificOutput?.permissionDecision, 'deny', mode);
  }
});

check('new project staging loses a creation race without changing old binding or links', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'new', 'beta');
  const links = linkTuple(fx);
  makeProject(fx, 'beta');
  const result = mutate(fx, 'S', 'new', 'beta', p);
  assert.notEqual(result.status, 0);
  const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(status.state, 'TURN_ACTIVE');
  assert.equal(status.binding.project, 'alpha');
  assert.equal(status.selection.pending, null);
  assert.equal(status.selection.latest_operation.status, 'FAILED');
  assert.equal(status.selection.latest_operation.error_code, 'SELECTION_FAILED');
  assert.equal(existsSync(projectReservationPath(fx.projects, 'beta')), false,
    'an external pre-existing target must not receive this operation reservation');
  assert.deepEqual(linkTuple(fx), links);
});

check('empty-target publish race preserves the winner and leaves only the owned minimal staging tree', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'new', 'beta');
  const links = linkTuple(fx);
  const result = mutate(fx, 'S', 'new', 'beta', p, { LUCA_PROJECT_FAULT: 'empty-target-race' });
  assert.notEqual(result.status, 0);
  const target = join(fx.projects, 'beta');
  assert.equal(lstatSync(target).isDirectory(), true);
  assert.deepEqual(readdirSync(target), [], 'concurrent empty target must remain untouched');
  const stagingName = `.luca-staging-${p.tx}`;
  assert.equal(existsSync(join(fx.projects, stagingName)), true, 'same-tx staging must remain recoverable');
  assert.deepEqual(readdirSync(join(fx.projects, stagingName)), ['CONTEXT.md']);
  const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(status.state, 'TURN_ACTIVE');
  assert.equal(status.binding.project, 'alpha');
  assert.equal(status.selection.pending, null);
  assert.equal(status.selection.latest_operation.status, 'OWNERSHIP_UNKNOWN');
  assert.deepEqual(linkTuple(fx), links);
});

check('legacy text pin read is pure; explicit migration binds canonical identity without consulting display links', () => {
  const fx = makeEnv();
  const alpha = makeProject(fx, 'alpha');
  const beta = makeProject(fx, 'beta');
  symlinkSync(join(beta, 'docs'), join(fx.gstack, 'docs'));
  const pin = join(fx.gstack, '.claude', '.session-project-LEGACY');
  writeFileSync(pin, 'alpha');
  const old = new Date(Date.now() - 365 * 86400_000);
  utimesSync(pin, old, old);
  const before = readFileSync(pin);
  const readOnly = runNode(PIN, ['status', '--session', 'LEGACY'], fx);
  assert.notEqual(readOnly.status, 0);
  assert.match(readOnly.stderr, /requires explicit migration/);
  assert.deepEqual(readFileSync(pin), before, 'status/read must never migrate legacy state');
  const migrated = jsonOut(runNode(PIN, ['migrate-legacy-pin', '--session', 'LEGACY'], fx)).value;
  assert.equal(migrated.schema_version, 2);
  assert.equal(migrated.state, 'TURN_CLOSED');
  assert.equal(migrated.binding.project, 'alpha');
  assert.equal(migrated.binding.realpath, realpathSync(alpha));
  assert.notEqual(migrated.binding.realpath, realpathSync(beta));
  assert.equal(existsSync(pin), true, 'identity must not be GCed by age');
  assert.equal(JSON.parse(readFileSync(pin, 'utf8')).binding.project, 'alpha');
});

check('read-only project-links checker reports legacy pins without migrating or quarantining them', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  const valid = join(fx.gstack, '.claude', '.session-project-VALID');
  const stale = join(fx.gstack, '.claude', '.session-project-STALE');
  const validBytes = Buffer.from('alpha');
  const staleBytes = Buffer.from('X');
  writeFileSync(valid, validBytes);
  writeFileSync(stale, staleBytes);
  const checked = spawnSync('node', [CHECK_LINKS], { cwd: fx.gstack, env: fx.env, encoding: 'utf8' });
  assert.notEqual(checked.status, 0);
  assert.match(checked.stderr, /read-only until explicitly resolved/);
  assert.deepEqual(readFileSync(valid), validBytes);
  assert.deepEqual(readFileSync(stale), staleBytes);
  assert.equal(existsSync(join(fx.gstack, '.claude', 'project-state-quarantine')), false);
});

check('invalid-but-well-formed legacy pin has an explicit exact quarantine path', () => {
  const fx = makeEnv();
  const pin = join(fx.gstack, '.claude', '.session-project-STALE');
  const bytes = Buffer.from('X');
  writeFileSync(pin, bytes);
  const readOnly = runNode(PIN, ['status', '--session', 'STALE'], fx);
  assert.notEqual(readOnly.status, 0);
  assert.deepEqual(readFileSync(pin), bytes);
  const wrong = runNode(PIN, [
    'quarantine-legacy-pin', '--session', 'STALE', '--expected-project', 'Y',
  ], fx);
  assert.notEqual(wrong.status, 0);
  assert.deepEqual(readFileSync(pin), bytes, 'wrong expected value must not move the pin');
  const quarantined = jsonOut(runNode(PIN, [
    'quarantine-legacy-pin', '--session', 'STALE', '--expected-project', 'X',
  ], fx));
  assert.equal(quarantined.quarantined, true);
  assert.equal(existsSync(pin), false);
  assert.deepEqual(readFileSync(quarantined.quarantine_path), bytes);
});

check('malformed, unknown, and symlink legacy pins fail closed and remain byte-identical', () => {
  for (const fixture of [
    { label: 'malformed', value: '{not-json' },
    { label: 'unknown', value: 'ghost' },
    { label: 'symlink', value: 'alias', symlink: true },
  ]) {
    const fx = makeEnv();
    const alpha = makeProject(fx, 'alpha');
    if (fixture.symlink) symlinkSync(alpha, join(fx.projects, 'alias'));
    const pin = join(fx.gstack, '.claude', `.session-project-${fixture.label}`);
    const bytes = Buffer.from(fixture.value);
    writeFileSync(pin, bytes);
    const result = runNode(PIN, ['status', '--session', fixture.label], fx);
    assert.notEqual(result.status, 0, fixture.label);
    assert.deepEqual(readFileSync(pin), bytes, `${fixture.label} must not be rewritten`);
  }
});

check('canonical schema-v3 native-event pins are read without migration rewrite', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const before = stateBytes(fx, 'S');
  const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(status.schema_version, 3);
  assert.ok(status.event_control?.current?.event_id);
  assert.ok(status.event_control?.consumed_events?.length === 1);
  assert.deepEqual(stateBytes(fx, 'S'), before);
});

check('new project sanitizes Git hook env, commits only deterministic CONTEXT, continues, and deactivates without deleting data', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'new', 'beta');
  const beta = join(fx.projects, 'beta');
  assert.equal(existsSync(beta), false, 'prepare must not expose the target project');

  const created = mutate(fx, 'S', 'new', 'beta', proposal, {
    GIT_DIR: join(fx.root, 'poison-git-dir'),
    GIT_WORK_TREE: fx.gstack,
    GIT_INDEX_FILE: join(fx.root, 'poison-index'),
  });
  assert.equal(created.status, 0, created.stderr || created.stdout);
  assert.doesNotMatch(created.stdout, /项目本地记忆|项目 CONTEXT/, 'switch turn must not inject next-turn context');
  const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(status.state, 'TURN_ACTIVE');
  assert.equal(status.binding.project, 'beta');
  assert.equal(status.binding.epoch, 2);
  assert.deepEqual(readdirSync(beta), ['CONTEXT.md'], 'new must create only the deterministic minimum');
  assert.equal(readdirSync(fx.projects).some(name => name.startsWith('.luca-staging-')), false);
  assert.equal(readdirSync(fx.projects).some(name => name.startsWith('.luca-project-reservation-')), false);
  assert.deepEqual(linkTuple(fx), [null, null, null]);

  closeCurrentEvent(fx, 'S');
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  const unbound = readProjectState(fx.gstack, 'S', fx.projects).value;
  assert.equal(unbound.state, 'NO_PIN');
  assert.equal(validatedBindingForState(unbound, fx.projects), null, 'deactivate must drop the binding');
  assert.ok(unbound.event_control?.fence, 'deactivate keeps the session attestable instead of deleting its fence');
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(existsSync(beta), true, 'deactivate must preserve project data');
});

check('selection commit does not depend on or mutate the legacy global display lease', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_FAULT: 'before-lease-release',
  });
  assert.equal(committed.status, 0, committed.stderr || committed.stdout);
  const result = jsonOut(committed);
  assert.equal(result.state, 'TURN_ACTIVE');
  assert.equal(result.binding.project, 'beta');
  assert.equal(result.lease_release, undefined);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).binding.project, 'beta');
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(existsSync(join(fx.gstack, '.claude', '.project-switch.lock')), false);
});

check('post-commit state-lock release failure is success-with-warning and exact-recoverable', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_COMMIT_STATE_LOCK_FAULT: 'before-release',
  });
  assert.equal(committed.status, 0, committed.stderr || committed.stdout);
  assert.match(committed.stderr, /state 操作已提交但锁释放失败.*禁止重试/);
  assert.equal(jsonOut(committed).binding.project, 'beta');
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).binding.project, 'beta');

  const held = jsonOut(runNode(PIN, ['inspect-state-lock', '--session', 'S'], fx));
  assert.equal(held.occupied, true);
  assert.equal(held.owner_alive, false);
  const recovered = jsonOut(runNode(PIN, [
    'recover-state-lock', '--session', 'S', '--handle-json', JSON.stringify(held.owner_handle),
  ], fx));
  assert.equal(recovered.recovered, true);
  assert.equal(jsonOut(runNode(PIN, ['inspect-state-lock', '--session', 'S'], fx)).occupied, false);
});

check('post-rename state-lock cleanup failure does not retain canonical lock or invite retry', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_STATE_LOCK_FAULT: 'after-release-rename',
  });
  assert.equal(committed.status, 0, committed.stderr || committed.stdout);
  assert.match(committed.stderr, /state lock 已释放但残留清理失败.*不应重试/);
  assert.equal(jsonOut(committed).binding.project, 'beta');
  assert.equal(jsonOut(runNode(PIN, ['inspect-state-lock', '--session', 'S'], fx)).occupied, false);
  assert.equal(beginTurn(fx, 'S', 'after-state-lock-residue').state, 'TURN_ACTIVE',
    'a parked cleanup residue must not block the next state owner');
});

check('state-file publication uses rename as commit point: pre-rename fails, post-rename warns but succeeds', () => {
  {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    bind(fx, 'S', 'alpha');
    const proposal = prepare(fx, 'S', 'switch', 'beta');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const failed = mutate(fx, 'S', 'switch', 'beta', proposal, {
      LUCA_PROJECT_STATE_WRITE_FAULT: 'before-rename',
    });
    assert.notEqual(failed.status, 0);
    assert.deepEqual(stateBytes(fx, 'S'), before);
    assert.deepEqual(linkTuple(fx), links);
  }
  {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    bind(fx, 'S', 'alpha');
    const proposal = prepare(fx, 'S', 'switch', 'beta');
    const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
      LUCA_PROJECT_STATE_WRITE_FAULT: 'after-rename',
    });
    assert.equal(committed.status, 0, committed.stderr || committed.stdout);
    assert.match(committed.stderr, /已原子发布.*禁止重试/);
    assert.equal(jsonOut(committed).binding.project, 'beta');
    assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).binding.project, 'beta');
    assert.deepEqual(linkTuple(fx), [null, null, null]);
  }
});

check('state remove rename is deactivate commit point for a fence-less state; cleanup failure stays success-with-warning', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  closeCurrentEvent(fx, 'S');
  // A state without a native fence has nothing to rebuild a fence from, so deactivate
  // still removes it at the rename commit point. It keeps its cursor: an attested binding
  // without a durable cursor is not a valid state. A fenced state is re-fenced instead;
  // see the re-fence commit-point and one-way-door checks below.
  const statePath = join(fx.gstack, '.claude', '.session-project-S');
  const fenceless = JSON.parse(readFileSync(statePath, 'utf8'));
  delete fenceless.event_control.fence;
  writeFileSync(statePath, `${JSON.stringify(fenceless)}\n`);
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
    cwd: REPO,
    env: { ...fx.env, LUCA_PROJECT_STATE_REMOVE_FAULT: 'after-rename' },
    encoding: 'utf8',
  });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  assert.match(deactivated.stderr, /已从 canonical 路径移除.*禁止重试解绑/);
  assert.equal(existsSync(statePath), false);
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(jsonOut(deactivated).state, 'NO_PIN');
});

check('re-fence write is the deactivate commit point for a fenced state: pre-rename fails cleanly, post-rename warns but succeeds', () => {
  {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    bind(fx, 'S', 'alpha');
    closeCurrentEvent(fx, 'S');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const failed = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
      cwd: REPO, env: { ...fx.env, LUCA_PROJECT_STATE_WRITE_FAULT: 'before-rename' }, encoding: 'utf8',
    });
    assert.notEqual(failed.status, 0, 'a re-fence that never reached its rename must fail');
    assert.deepEqual(stateBytes(fx, 'S'), before, 'a failed re-fence must leave the binding untouched');
    assert.deepEqual(linkTuple(fx), links, 'a failed re-fence must restore the display links');
  }
  {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    bind(fx, 'S', 'alpha');
    closeCurrentEvent(fx, 'S');
    const committed = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
      cwd: REPO, env: { ...fx.env, LUCA_PROJECT_STATE_WRITE_FAULT: 'after-rename' }, encoding: 'utf8',
    });
    assert.equal(committed.status, 0, committed.stderr || committed.stdout);
    assert.match(committed.stderr, /已原子发布.*禁止重试/);
    const unbound = readProjectState(fx.gstack, 'S', fx.projects).value;
    assert.equal(unbound.state, 'NO_PIN');
    assert.ok(unbound.event_control?.fence, 'the renamed re-fence is committed even when post-rename sync fails');
    assert.deepEqual(linkTuple(fx), [null, null, null]);
  }
});

// ── deactivate must not be a one-way door (2026-09-10) ──
// A mid-session deactivate used to delete the whole state file, fence included. Only
// SessionStart may mint a fence, so the session could never attest again — not even to
// switch — and the only escape was restarting the process. These checks deliberately
// avoid initializeFence()/prepare()/beginTurn() after deactivating: those helpers mint a
// fence in-process, which the real runtime cannot do, and would mask exactly this defect.

function queueSwitchWithoutFence(fx, sid, target, tx) {
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: sid,
    cwd: fx.gstack, harness: 'claude', prompt: `switch project ${target} after deactivate`, promptId: sid,
    intent: { kind: 'switch', tx, operation: 'switch', target, expected_epoch: 0 },
  });
}

check('deactivate is not a one-way door: the same session can attest and switch again without a new SessionStart', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  closeCurrentEvent(fx, 'S');
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  const unbound = readProjectState(fx.gstack, 'S', fx.projects).value;
  assert.equal(unbound.state, 'NO_PIN');
  assert.ok(unbound.event_control?.fence, 'deactivate must leave the session attestable');
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  queueSwitchWithoutFence(fx, 'S', 'beta', 'native-switch-after-deactivate');
  assert.equal(attestCandidate(fx, 'S').state.state, 'SWITCH_ONLY');
  const switched = mutate(fx, 'S', 'switch', 'beta', { tx: 'native-switch-after-deactivate', expected_epoch: 0 });
  assert.equal(switched.status, 0, switched.stderr || switched.stdout);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).binding.project, 'beta');
});

check('deactivate re-fences at the source tail so a turn it discarded cannot orphan-lock the session', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  // The user typed a turn whose candidate is still pending when deactivate clears it. If
  // deactivate kept the old cursor instead of re-fencing, that human row would sit first
  // after the cursor and every later candidate would MISMATCH against it forever.
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
    cwd: fx.gstack, harness: 'claude', prompt: 'a turn discarded by deactivate', promptId: 'S',
    intent: { kind: 'turn' },
  });
  appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
    type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
    isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
    message: { role: 'user', content: 'a turn discarded by deactivate' },
  })}\n`);
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  queueSwitchWithoutFence(fx, 'S', 'beta', 'native-switch-after-discard');
  assert.equal(attestCandidate(fx, 'S').state.state, 'SWITCH_ONLY');
});

check('Codex identical prompt text with an older unqueued turn still needs explicit recovery', () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  makeProject(fx, 'alpha');
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  codexSwitchTurn(fx, sid, 'initial', 'alpha', 'initial-tx');
  assert.equal(mutate(fx, sid, 'switch', 'alpha', { tx: 'initial-tx', expected_epoch: 0 }).status, 0);
  const prompt = 'switch project alpha';
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: 'unqueued-old-turn' } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: 'unqueued-old-turn',
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] } } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  assert.throws(() => codexSwitchTurn(fx, sid, 'current-turn', 'alpha', 'blocked-tx'),
    error => error.code === 'MISMATCH');
  const pending = readProjectState(fx.gstack, sid, fx.projects).value;
  assert.equal(pending.state, 'TURN_CLOSED');
  assert.equal(pending.event_control.candidates.at(-1).boundary_id, 'current-turn');
  const recovered = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.notEqual(mutate(fx, sid, 'switch', 'alpha', { tx: 'blocked-tx', expected_epoch: 0 }).status, 0);
  assert.equal(codexSwitchTurn(fx, sid, 'fresh-turn', 'alpha', 'fresh-tx').state.switch.tx, 'fresh-tx');
});

for (const initiallyBound of [false, true]) {
  check(`NO_PIN recovery after ${initiallyBound ? 'deactivate / delayed flush race' : 'unqueued orphan'} only lowers authority`, () => {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    if (initiallyBound) bind(fx, 'S', 'alpha');
    else initializeFence(fx, 'S');
    queueSwitchWithoutFence(fx, 'S', 'beta', 'stale-switch');
    if (initiallyBound) {
      const first = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
      assert.equal(first.status, 0, first.stderr);
    }
    appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
      type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
      isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
      message: { role: 'user', content: initiallyBound ? 'switch project beta after deactivate' : 'unqueued orphan human' },
    })}\n`);
    queueSwitchWithoutFence(fx, 'S', 'alpha', 'blocked-switch');
    assert.throws(() => attestDirectly(fx, 'S'), error => error.code === 'MISMATCH');
    const recovered = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
    assert.equal(recovered.status, 0, recovered.stderr);
    const state = readProjectState(fx.gstack, 'S', fx.projects).value;
    assert.equal(state.state, 'NO_PIN');
    assert.equal(state.event_control.current, null);
    assert.deepEqual(state.event_control.candidates, []);
    assert.equal(state.switch, undefined, 'old switch intent cannot survive recovery');
    assert.throws(() => attestDirectly(fx, 'S'), error => error.code === 'NO_PENDING_EVENT');
    assert.notEqual(mutate(fx, 'S', 'switch', 'beta', { tx: 'stale-switch', expected_epoch: 0 }).status, 0,
      'deactivate cannot turn a stale switch transaction into authority');
    queueSwitchWithoutFence(fx, 'S', 'beta', 'fresh-switch');
    assert.equal(attestCandidate(fx, 'S').state.switch.tx, 'fresh-switch');
  });
}

check('deactivate that cannot re-fence refuses and changes nothing rather than leaving a one-way door', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const transcript = join(fx.transcripts, 'S.jsonl');
  const moved = join(fx.transcripts, 'S.real.jsonl');
  renameSync(transcript, moved);
  symlinkSync(moved, transcript);
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  const refused = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.notEqual(refused.status, 0, 'deactivate must refuse when the native fence cannot be rebuilt');
  assert.deepEqual(stateBytes(fx, 'S'), before);
  assert.deepEqual(linkTuple(fx), links);
});

function attestDirectly(fx, sid) {
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return attestPendingProjectEvent({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: sid,
      cwd: fx.gstack, observation: 'pre-tool', transcriptPath: join(fx.transcripts, `${sid}.jsonl`),
    });
  } finally {
    if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previous;
  }
}

check('deactivate resets an exhausted event ledger so a long session is not permanently locked', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  // The ledger never shrinks, so after PROJECT_EVENT_HISTORY_LIMIT attested turns every
  // attestation throws EVENT_LEDGER_FULL. Fill it with genuine attested turns: ledger entries
  // are bound to derived event ids, so hand-written padding is rejected as an invalid ledger.
  let turn = 0;
  while (readProjectState(fx.gstack, 'S', fx.projects).value.event_control.consumed_events.length < 256) {
    beginTurn(fx, 'S', `ledger-fill-${turn += 1}`);
  }
  const filled = readProjectState(fx.gstack, 'S', fx.projects).value.event_control.current;
  closeAttestedProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S',
    eventId: filled.event_id, boundaryId: filled.boundary_id,
  });
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
    cwd: fx.gstack, harness: 'claude', prompt: 'a turn on an exhausted ledger', promptId: 'S',
    intent: { kind: 'turn' },
  });
  assert.throws(() => attestCandidate(fx, 'S'), error => error?.code === 'EVENT_LEDGER_FULL',
    'the fixture must reproduce the exhausted-ledger lock before deactivate');
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  queueSwitchWithoutFence(fx, 'S', 'beta', 'native-switch-after-full-ledger');
  assert.equal(attestCandidate(fx, 'S').state.state, 'SWITCH_ONLY');
});

check('resetting the ledger on deactivate cannot re-grant a turn consumed before it', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  closeCurrentEvent(fx, 'S');
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  // Re-queue the exact bytes of the already consumed switch turn with no new native row.
  // The empty ledger cannot recognise it; the rebuilt cursor must still refuse it.
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
    cwd: fx.gstack, harness: 'claude', prompt: 'switch project alpha', promptId: 'S',
    intent: { kind: 'switch', tx: 'replayed-switch', operation: 'switch', target: 'alpha', expected_epoch: 0 },
  });
  let replay;
  try { attestDirectly(fx, 'S'); } catch (error) { replay = error; }
  assert.equal(replay?.code, 'EVENT_REPLAY', `a consumed turn must stay unattestable after the reset (${replay?.stack || replay})`);
  assert.equal(readProjectState(fx.gstack, 'S', fx.projects).value.state, 'NO_PIN');
});

// ── Codex: deactivate re-fences through the real CLI and CODEX_HOME plumbing (2026-09-11) ──
// Every deactivate check above runs under Claude. The re-fence resolves a Codex rollout from the
// deactivate process's own CODEX_HOME, so the Codex path is only proven end to end when a session is
// bound, deactivated and bound again through project.sh with a Codex environment.

function makeCodexEnv(sid) {
  const fx = makeEnv();
  const codexHome = join(fx.root, 'codex-home');
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '11');
  mkdirSync(rolloutDir, { recursive: true });
  const rollout = join(rolloutDir, `rollout-2026-09-11T00-00-00-${sid}.jsonl`);
  writeFileSync(rollout, `${JSON.stringify({
    type: 'session_meta',
    payload: {
      id: sid, session_id: sid, cwd: fx.gstack, thread_source: 'user', originator: 'codex-tui',
      parent_thread_id: null, forked_from_id: null,
    },
  })}\n`);
  return { ...fx, codexHome, rollout, env: { ...fx.env, LUCA_ACTUAL_HARNESS: 'codex', CODEX_HOME: codexHome } };
}

function withAttestationTest(operation) {
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try {
    return operation();
  } finally {
    if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST;
    else process.env.LUCA_EVENT_ATTESTATION_TEST = previous;
  }
}

function codexSwitchTurn(fx, sid, boundary, target, tx, { withNativeRows = true } = {}) {
  const prompt = `switch project ${target}`;
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, harness: 'codex', prompt,
    intent: { kind: 'switch', tx, operation: 'switch', target, expected_epoch: 0 },
  });
  if (withNativeRows) {
    appendFileSync(fx.rollout, [
      { type: 'response_item', payload: {
        type: 'message', role: 'user', id: `msg_${randomUUID()}`,
        content: [{ type: 'input_text', text: prompt }],
        internal_chat_message_metadata_passthrough: { turn_id: boundary },
      } },
      { type: 'event_msg', payload: {
        type: 'item_completed', thread_id: sid, turn_id: boundary,
        item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] },
      } },
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
  }
  return withAttestationTest(() => attestPendingProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, observation: 'pre-tool', codexHome: fx.codexHome,
  }));
}

check('Codex: deactivate re-fences through project.sh and CODEX_HOME, so the session can switch again', () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  const first = `boundary-${randomUUID()}`;
  assert.equal(codexSwitchTurn(fx, sid, first, 'alpha', 'codex-tx-alpha').state.state, 'SWITCH_ONLY');
  const bound = mutate(fx, sid, 'switch', 'alpha', { tx: 'codex-tx-alpha', expected_epoch: 0 });
  assert.equal(bound.status, 0, bound.stderr || bound.stdout);

  closeCurrentEvent(fx, sid);
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  const unbound = readProjectState(fx.gstack, sid, fx.projects).value;
  assert.equal(unbound.state, 'NO_PIN');
  assert.equal(unbound.event_control?.fence?.harness, 'codex', 'the rebuilt fence must stay on the Codex source');

  // The consumed alpha turn, re-queued with no new native rows, must stay unattestable after the reset.
  let replay;
  try { codexSwitchTurn(fx, sid, first, 'alpha', 'codex-tx-replay', { withNativeRows: false }); } catch (error) { replay = error; }
  assert.equal(replay?.code, 'EVENT_REPLAY', `a consumed Codex turn must stay unattestable after the reset (${replay?.stack || replay})`);

  // The refused replay stays queued ahead of the next real turn; B skips it and the real turn attests.
  const second = `boundary-${randomUUID()}`;
  assert.equal(codexSwitchTurn(fx, sid, second, 'beta', 'codex-tx-beta').state.state, 'SWITCH_ONLY');
  const rebound = mutate(fx, sid, 'switch', 'beta', { tx: 'codex-tx-beta', expected_epoch: 0 });
  assert.equal(rebound.status, 0, rebound.stderr || rebound.stdout);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', sid], fx)).binding.project, 'beta');
});

check('Codex orphaned active turn recovers without deleting project or shared display links', () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  const alpha = makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  assert.equal(codexSwitchTurn(fx, sid, 'initial-switch', 'alpha', 'orphan-tx-alpha').state.state, 'SWITCH_ONLY');
  assert.equal(mutate(fx, sid, 'switch', 'alpha', { tx: 'orphan-tx-alpha', expected_epoch: 0 }).status, 0);
  const activeBoundary = `active-${randomUUID()}`;
  const activePrompt = 'continue alpha project';
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: activeBoundary,
    cwd: fx.gstack, harness: 'codex', prompt: activePrompt, intent: { kind: 'turn' },
  });
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: activePrompt }],
      internal_chat_message_metadata_passthrough: { turn_id: activeBoundary } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: activeBoundary,
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: activePrompt }] } } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  assert.equal(withAttestationTest(() => attestPendingProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: activeBoundary,
    cwd: fx.gstack, observation: 'pre-tool', codexHome: fx.codexHome,
  })).state.state, 'TURN_ACTIVE');
  for (const boundary of [`orphan-${randomUUID()}`, `orphan-${randomUUID()}`]) {
    const prompt = `unwitnessed user turn ${boundary}`;
    appendFileSync(fx.rollout, [
      { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
        content: [{ type: 'input_text', text: prompt }],
        internal_chat_message_metadata_passthrough: { turn_id: boundary } } },
      { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: boundary,
        item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] } } },
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
  }
  const links = linkTuple(fx);
  const recovered = spawnSync('bash', [PROJECT_SH, 'recover-session', sid], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
  assert.equal(jsonOut(recovered).state, 'NO_PIN');
  const unbound = readProjectState(fx.gstack, sid, fx.projects).value;
  assert.equal(unbound.event_control.candidates.length, 0);
  assert.equal(unbound.event_control.fence.cursor.record_index, 9, 'all flushed orphan turns are behind the new fence');
  assert.deepEqual(linkTuple(fx), links, 'recovery must not mutate shared display links');
  assert.equal(existsSync(alpha), true, 'recovery must not delete the project');
  assert.equal(codexSwitchTurn(fx, sid, `fresh-${randomUUID()}`, 'beta', 'orphan-tx-beta').state.state, 'SWITCH_ONLY');
  assert.equal(mutate(fx, sid, 'switch', 'beta', { tx: 'orphan-tx-beta', expected_epoch: 0 }).status, 0);
  assert.equal(readProjectState(fx.gstack, sid, fx.projects).value.binding.project, 'beta');
});

check('recover-session refuses a fresh active native event without changing authority', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  assert.equal(beginTurn(fx, 'S').state, 'TURN_ACTIVE');
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  const refused = spawnSync('bash', [PROJECT_SH, 'recover-session', 'S'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /still fresh|RECOVERY_INVALID|superseded/);
  assert.deepEqual(stateBytes(fx, 'S'), before);
  assert.deepEqual(linkTuple(fx), links);
});

check('native release intent downgrades only its own attested Claude session, without a CLI', () => {
  const fx = makeEnv();
  const alpha = makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  bind(fx, 'T', 'alpha');
  const other = stateBytes(fx, 'T');
  const links = linkTuple(fx);
  const projectBytes = readFileSync(join(alpha, 'CONTEXT.md'));
  const submitted = spawnSync('node', [ROUTE_GUARD], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'S',
      cwd: fx.gstack, prompt: '解除本会话项目绑定，恢复 NO_PIN' }),
  });
  assert.equal(submitted.status, 0, submitted.stderr);
  const queued = readProjectState(fx.gstack, 'S', fx.projects).value;
  assert.equal(queued.event_control.candidates[0].intent.kind, 'release');
  assert.equal(queued.state, 'TURN_CLOSED', 'UserPromptSubmit cannot release before native attestation');
  assert.equal(attestCandidate(fx, 'S').state.state, 'NO_PIN');
  assert.deepEqual(stateBytes(fx, 'T'), other);
  assert.deepEqual(linkTuple(fx), links);
  assert.deepEqual(readFileSync(join(alpha, 'CONTEXT.md')), projectBytes);
  assert.equal(readProjectState(fx.gstack, 'S', fx.projects).value.event_control.current, null);
  assert.equal(readProjectState(fx.gstack, 'S', fx.projects).value.event_control.consumed_events.length, 0);
  makeProject(fx, 'beta');
  queueSwitchWithoutFence(fx, 'S', 'beta', 'after-native-release');
  assert.equal(attestCandidate(fx, 'S').state.state, 'SWITCH_ONLY');
});

check('native release directive is byte-exact at UserPromptSubmit', () => {
  for (const prompt of [' 解除本会话项目绑定，恢复 NO_PIN', '解除本会话项目绑定，恢复 NO_PIN\n']) {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    bind(fx, 'S', 'alpha');
    const submitted = spawnSync('node', [ROUTE_GUARD], {
      cwd: REPO, env: fx.env, encoding: 'utf8',
      input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'S',
        cwd: fx.gstack, prompt }),
    });
    assert.equal(submitted.status, 0, submitted.stderr);
    const queued = readProjectState(fx.gstack, 'S', fx.projects).value;
    assert.equal(queued.event_control.candidates.at(-1).intent.kind, 'turn');
  }
});

check('PreToolUse native observation releases before any project-scoped tool can run', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
    cwd: fx.gstack, harness: 'claude', prompt: '解除本会话项目绑定，恢复 NO_PIN',
    intent: { kind: 'release' },
  });
  appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
    type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
    isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
    message: { role: 'user', content: '解除本会话项目绑定，恢复 NO_PIN' },
  })}\n`);
  const denied = guard(fx, { session_id: 'S', tool_name: 'Read',
    tool_input: { file_path: 'docs/secret.md' } });
  assert.equal(denied?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(readProjectState(fx.gstack, 'S', fx.projects).value.state, 'NO_PIN');
});

check('Stop native observation releases an unused exact directive without CLI or project work', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
    cwd: fx.gstack, harness: 'claude', prompt: '解除本会话项目绑定，恢复 NO_PIN',
    intent: { kind: 'release' },
  });
  appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
    type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
    isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
    message: { role: 'user', content: '解除本会话项目绑定，恢复 NO_PIN' },
  })}\n${JSON.stringify({ type: 'assistant', uuid: randomUUID(),
    message: { role: 'assistant', content: [{ type: 'text', text: '已收到。' }] },
  })}\n`);
  const stopped = spawnSync('node', [STOP_HOOK], {
    cwd: REPO, env: { ...fx.env, SESSION_SYNC_FORCE_ON_STOP: '0' }, encoding: 'utf8',
    input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'S', cwd: fx.gstack,
      transcript_path: join(fx.transcripts, 'S.jsonl'), last_assistant_message: '已收到。' }),
  });
  assert.equal(stopped.status, 0, stopped.stderr);
  assert.equal(readProjectState(fx.gstack, 'S', fx.projects).value.state, 'NO_PIN');
});

for (const [label, prompt, consent] of [
  ['exact directive preserves shared links and requires a new native turn', '解除本会话项目绑定，恢复 NO_PIN', true],
  ['rejects ordinary native work prompt', 'continue project work', false],
  ['rejects leading whitespace', ' 解除本会话项目绑定，恢复 NO_PIN', false],
  ['rejects trailing newline', '解除本会话项目绑定，恢复 NO_PIN\n', false],
]) {
check(`Codex native release ${label}`, () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  codexSwitchTurn(fx, sid, 'release-switch', 'alpha', 'release-alpha');
  assert.equal(mutate(fx, sid, 'switch', 'alpha', { tx: 'release-alpha', expected_epoch: 0 }).status, 0);
  const boundary = `release-${randomUUID()}`;
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, harness: 'codex', prompt, intent: { kind: 'release' },
  });
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: boundary } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: boundary,
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] } } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  const before = stateBytes(fx, sid);
  const links = linkTuple(fx);
  const attest = () => withAttestationTest(() => attestPendingProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, observation: 'pre-tool', codexHome: fx.codexHome,
  }));
  if (!consent) {
    assert.throws(attest, /native human release directive/);
    assert.deepEqual(stateBytes(fx, sid), before);
    assert.deepEqual(linkTuple(fx), links);
    return;
  }
  assert.equal(attest().state.state, 'NO_PIN');
  assert.deepEqual(linkTuple(fx), links);
  assert.throws(attest, /no pending native event candidate/);
  assert.equal(codexSwitchTurn(fx, sid, `fresh-${randomUUID()}`, 'beta', 'release-beta').state.state, 'SWITCH_ONLY');
});
}

check('retired release-session CLI cannot release another session, including through nested shell', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const active = beginTurn(fx, 'S', 'release', '解除本会话项目绑定，恢复 NO_PIN');
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  const args = ['release-session', 'S', '--expected-event', active.turn.event_id,
    '--expected-epoch', String(active.binding.epoch)];
  const direct = spawnSync('bash', [PROJECT_SH, ...args], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.notEqual(direct.status, 0);
  const internal = runNode(PIN, ['release-session', '--session', 'S', ...args.slice(2)], fx);
  assert.notEqual(internal.status, 0);
  const nested = spawnSync('bash', ['-c', `bash scripts/project.sh ${args.join(' ')}`], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.notEqual(nested.status, 0);
  assert.deepEqual(stateBytes(fx, 'S'), before);
  assert.deepEqual(linkTuple(fx), links);
});

for (const invalid of ['superseded', 'source', 'fault']) {
  check(`native release rejects ${invalid} without mutation`, () => {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    bind(fx, 'S', 'alpha');
    queueProjectEventCandidate({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
      cwd: fx.gstack, harness: 'claude', prompt: '解除本会话项目绑定，恢复 NO_PIN',
      intent: { kind: 'release' },
    });
    const transcriptPath = join(fx.transcripts, 'S.jsonl');
    appendFileSync(transcriptPath, `${JSON.stringify({
      type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
      isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
      message: { role: 'user', content: '解除本会话项目绑定，恢复 NO_PIN' },
    })}\n`);
    if (invalid === 'superseded') appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
      type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
      isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
      message: { role: 'user', content: 'newer human turn' },
    })}\n`);
    if (invalid === 'source') writeFileSync(transcriptPath, 'corrupt\n');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const previousFault = process.env.LUCA_EVENT_TX_FAULT;
    if (invalid === 'fault') process.env.LUCA_EVENT_TX_FAULT = 'after-attest-before-publish';
    try {
      assert.throws(() => withAttestationTest(() => attestPendingProjectEvent({
        gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: 'S', boundaryId: 'S',
        cwd: fx.gstack, observation: 'pre-tool', transcriptPath,
      })), /user|source|JSON|fault|prefix/i);
    } finally {
      if (previousFault === undefined) delete process.env.LUCA_EVENT_TX_FAULT;
      else process.env.LUCA_EVENT_TX_FAULT = previousFault;
    }
    assert.deepEqual(stateBytes(fx, 'S'), before);
    assert.deepEqual(linkTuple(fx), links);
  });
}

check('Claude orphaned active turn can re-fence and then attest a new project prompt', () => {
  const fx = makeEnv();
  const alpha = makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  assert.equal(beginTurn(fx, 'S').state, 'TURN_ACTIVE');
  appendFileSync(join(fx.transcripts, 'S.jsonl'), `${JSON.stringify({
    type: 'user', uuid: randomUUID(), sessionId: 'S', cwd: fx.gstack, userType: 'external',
    isSidechain: false, isMeta: false, origin: { kind: 'human' }, promptSource: 'typed',
    message: { role: 'user', content: 'new user turn without a project candidate' },
  })}\n`);
  const links = linkTuple(fx);
  const recovered = spawnSync('bash', [PROJECT_SH, 'recover-session', 'S'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
  assert.equal(jsonOut(recovered).state, 'NO_PIN');
  assert.equal(existsSync(alpha), true);
  assert.deepEqual(linkTuple(fx), links);
  queueSwitchWithoutFence(fx, 'S', 'beta', 'claude-after-orphan');
  assert.equal(attestCandidate(fx, 'S').state.state, 'SWITCH_ONLY');
});

check('Codex TURN_CLOSED with structured skill can attest a fresh turn and re-fence safely', () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  makeProject(fx, 'alpha');
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  assert.equal(codexSwitchTurn(fx, sid, 'initial-turn', 'alpha', 'initial-skill-tx').state.state, 'SWITCH_ONLY');
  assert.equal(mutate(fx, sid, 'switch', 'alpha', { tx: 'initial-skill-tx', expected_epoch: 0 }).status, 0);
  closeCurrentEvent(fx, sid);
  const closed = readProjectState(fx.gstack, sid, fx.projects).value;
  assert.equal(closed.state, 'TURN_CLOSED');

  const boundary = `skill-turn-${randomUUID()}`;
  const prompt = 'switch project alpha with skill';
  const skill = { type: 'skill', name: 'diagnosing-bugs', path: '/tmp/diagnosing-bugs/SKILL.md' };
  queueProjectEventCandidate({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, harness: 'codex', prompt,
    intent: { kind: 'turn' },
  });
  assert.equal(readProjectState(fx.gstack, sid, fx.projects).value.state, 'TURN_CLOSED');
  appendFileSync(fx.rollout, [
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: boundary } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: boundary,
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }, skill] } } },
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: `<skill>\n<name>${skill.name}</name>\n<path>${skill.path}</path>\n---\nbody\n</skill>` }],
      internal_chat_message_metadata_passthrough: { turn_id: boundary, create_time: 1_789_443_093.02633,
        content_item_kinds: ['skills.selected_skill_instructions'] } } },
  ].map(JSON.stringify).join('\n') + '\n');
  const attested = withAttestationTest(() => attestPendingProjectEvent({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, boundaryId: boundary,
    cwd: fx.gstack, observation: 'pre-tool', codexHome: fx.codexHome,
  }));
  assert.equal(attested.state.state, 'TURN_ACTIVE');
  const raw = readFileSync(join(fx.gstack, '.claude', `.session-project-${sid}`));
  const unbound = withAttestationTest(() => refenceProjectStateForDeactivate({
    gstackRoot: fx.gstack, sessionId: sid, expectedRaw: raw, codexHome: fx.codexHome,
  }));
  assert.equal(unbound.state, 'NO_PIN');
  assert.equal(unbound.event_control.candidates.length, 0);
  assert.equal(codexSwitchTurn(fx, sid, 'fresh-after-skill-refence', 'alpha', 'fresh-after-skill-tx').state.state,
    'SWITCH_ONLY');
});

for (const initiallyBound of [false, true]) {
  check(`Codex NO_PIN recovery: ${initiallyBound ? 'delayed flush after deactivate' : 'orphan'} is recoverable without old switch authority`, () => {
    const sid = randomUUID();
    const fx = makeCodexEnv(sid);
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    withAttestationTest(() => initializeProjectEventFence({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
      cwd: fx.gstack, codexHome: fx.codexHome,
    }));
    if (initiallyBound) {
      codexSwitchTurn(fx, sid, 'initial', 'alpha', 'initial-tx');
      assert.equal(mutate(fx, sid, 'switch', 'alpha', { tx: 'initial-tx', expected_epoch: 0 }).status, 0);
    }
    assert.throws(() => codexSwitchTurn(fx, sid, 'late', 'beta', 'old-tx', { withNativeRows: false }),
      error => error.code === 'SOURCE_NOT_VISIBLE');
    if (initiallyBound) {
      const first = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
      assert.equal(first.status, 0, first.stderr);
    }
    appendFileSync(fx.rollout, [
      { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
        content: [{ type: 'input_text', text: 'switch project beta' }],
        internal_chat_message_metadata_passthrough: { turn_id: 'late' } } },
      { type: 'event_msg', payload: { type: 'item_completed', thread_id: sid, turn_id: 'late',
        item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: 'switch project beta' }] } } },
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    if (initiallyBound) assert.throws(() => codexSwitchTurn(fx, sid, 'blocked', 'alpha', 'blocked-tx', { withNativeRows: false }),
      error => error.code === 'MISMATCH');
    const recovered = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
    assert.equal(recovered.status, 0, recovered.stderr);
    const state = readProjectState(fx.gstack, sid, fx.projects).value;
    assert.equal(state.state, 'NO_PIN');
    assert.equal(state.event_control.current, null);
    assert.deepEqual(state.event_control.candidates, []);
    assert.notEqual(mutate(fx, sid, 'switch', 'beta', { tx: 'old-tx', expected_epoch: 0 }).status, 0);
    assert.throws(() => codexSwitchTurn(fx, sid, 'late', 'beta', 'replay', { withNativeRows: false }),
      error => error.code === 'EVENT_REPLAY');
    assert.equal(codexSwitchTurn(fx, sid, 'fresh', 'alpha', 'fresh-tx').state.switch.tx, 'fresh-tx');
  });
}

for (const harness of ['claude', 'codex']) {
  if (harness === 'codex') check(`${harness} recovery refuses unknown source that appeared after an absent-source startup fence`, () => {
    const sid = randomUUID();
    const fx = harness === 'codex' ? makeCodexEnv(sid) : makeEnv();
    const transcript = harness === 'codex' ? fx.rollout : join(fx.transcripts, `${sid}.jsonl`);
    const saved = join(fx.root, 'saved-source');
    if (harness === 'codex') renameSync(transcript, saved);
    withAttestationTest(() => initializeProjectEventFence({
      gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness,
      cwd: fx.gstack, ...(harness === 'codex' ? { codexHome: fx.codexHome } : { transcriptPath: transcript }),
    }));
    assert.equal(readProjectState(fx.gstack, sid, fx.projects).value.event_control.fence.source_absent, true);
    if (harness === 'codex') renameSync(saved, transcript);
    appendFileSync(transcript, `${JSON.stringify(harness === 'codex'
      ? { type: 'response_item', payload: { type: 'message', role: 'user', id: 'bad', content: [{ type: 'input_text', text: 'bad' }] } }
      : { type: 'user', origin: { kind: 'future' }, message: { role: 'user', content: 'bad' } })}\n`);
    const before = stateBytes(fx, sid);
    const refused = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /invalid Codex user id/);
    assert.deepEqual(stateBytes(fx, sid), before);
  });
  for (const damage of ['prefix', 'unknown', 'malformed']) {
    check(`${harness} recovery refuses ${damage} source damage without publishing or changing links`, () => {
      const sid = randomUUID();
      const fx = harness === 'codex' ? makeCodexEnv(sid) : makeEnv();
      if (harness === 'codex') withAttestationTest(() => initializeProjectEventFence({
        gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness,
        cwd: fx.gstack, codexHome: fx.codexHome,
      }));
      else initializeFence(fx, sid);
      const transcript = harness === 'codex' ? fx.rollout : join(fx.transcripts, `${sid}.jsonl`);
      if (damage === 'prefix') {
        const bytes = readFileSync(transcript, 'utf8');
        writeFileSync(transcript, bytes.replace('session', 'sessioN'));
      } else if (damage === 'malformed') appendFileSync(transcript, '{broken json}\n');
      else appendFileSync(transcript, `${JSON.stringify(harness === 'codex'
        ? { type: 'response_item', payload: { type: 'message', role: 'user', id: 'unknown-id',
          content: [{ type: 'input_text', text: 'unknown source' }] } }
        : { type: 'user', origin: { kind: 'future-human-kind' }, promptSource: 'typed',
          message: { role: 'user', content: 'unknown source' } })}\n`);
      const before = stateBytes(fx, sid);
      const links = linkTuple(fx);
      const refused = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
      assert.notEqual(refused.status, 0, 'recovery cannot silently absorb damaged source');
      assert.deepEqual(stateBytes(fx, sid), before);
      assert.deepEqual(linkTuple(fx), links);
    });
  }
}

check('Codex recovery refuses a native turn whose UserMessage anchor has not flushed', () => {
  const sid = randomUUID();
  const fx = makeCodexEnv(sid);
  withAttestationTest(() => initializeProjectEventFence({
    gstackRoot: fx.gstack, projectsRoot: fx.projects, sessionId: sid, harness: 'codex',
    cwd: fx.gstack, codexHome: fx.codexHome,
  }));
  appendFileSync(fx.rollout, `${JSON.stringify({ type: 'response_item', payload: {
    type: 'message', role: 'user', id: `msg_${randomUUID()}`, content: [{ type: 'input_text', text: 'late anchor' }],
    internal_chat_message_metadata_passthrough: { turn_id: 'late' },
  } })}\n`);
  const before = stateBytes(fx, sid);
  const refused = spawnSync('bash', [PROJECT_SH, 'deactivate', sid], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /anchor/);
  assert.deepEqual(stateBytes(fx, sid), before);
});

for (const state of ['TURN_ACTIVE', 'SWITCH_ONLY']) {
  check(`deactivate recovery still refuses ${state} without changing authority`, () => {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    if (state === 'TURN_ACTIVE') { bind(fx, 'S', 'alpha'); beginTurn(fx, 'S'); }
    else prepare(fx, 'S', 'switch', 'alpha');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const refused = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
    assert.notEqual(refused.status, 0);
    assert.deepEqual(stateBytes(fx, 'S'), before);
    assert.deepEqual(linkTuple(fx), links);
  });
}

check('per-state O_EXCL lock serializes same-sid CAS and never age-steals crash residue', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  const proposal = prepare(fx, 'SAME', 'switch', 'alpha');
  const outA = join(fx.root, 'a.out'), errA = join(fx.root, 'a.err');
  const outB = join(fx.root, 'b.out'), errB = join(fx.root, 'b.err');
  const exact = `bash "${PROJECT_SH}" switch alpha --session-id SAME --tx ${proposal.tx} --expected-epoch ${proposal.expected_epoch}`;
  const command = [
    `${exact} >"${outA}" 2>"${errA}" & a=$!`,
    `${exact} >"${outB}" 2>"${errB}" & b=$!`,
    'wait $a; sa=$?',
    'wait $b; sb=$?',
    'printf "%s %s" "$sa" "$sb"',
  ].join('; ');
  const raced = spawnSync('bash', ['-c', command], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(raced.status, 0, raced.stderr);
  const codes = raced.stdout.trim().split(/\s+/).map(Number);
  assert.equal(codes.filter(code => code === 0).length, 1, `exactly one CAS writer may succeed: ${raced.stdout}`);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'SAME'], fx)).state, 'TURN_ACTIVE');

  const crashFx = makeEnv();
  makeProject(crashFx, 'alpha');
  const stateLock = join(crashFx.gstack, '.claude', '.session-project-CRASH.lock');
  writeFileSync(stateLock, 'crash-residue\n');
  const old = new Date(Date.now() - 86400_000);
  utimesSync(stateLock, old, old);
  assert.throws(() => queueProjectEventCandidate({
    gstackRoot: crashFx.gstack,
    projectsRoot: crashFx.projects,
    sessionId: 'CRASH',
    boundaryId: 'CRASH',
    cwd: crashFx.gstack,
    harness: 'claude',
    prompt: 'switch project alpha',
    promptId: 'CRASH',
    intent: { kind: 'switch', tx: 'crash-tx', operation: 'switch', target: 'alpha', expected_epoch: 0 },
  }), /STATE_LOCK_INVALID|owner record is not canonical|malformed/);
  assert.equal(existsSync(join(crashFx.gstack, '.claude', '.session-project-CRASH')), false);
});

check('lease acquisition faults roll back only the exact partial lock', () => {
  for (const fault of ['after-mkdir', 'after-owner-write']) {
    const fx = makeEnv();
    const failed = runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', `fault-${fault}`], fx, {
      LUCA_PROJECT_LEASE_FAULT: fault,
    });
    assert.notEqual(failed.status, 0, fault);
    assert.equal(existsSync(join(fx.gstack, '.claude', '.project-switch.lock')), false, `${fault}: partial lease leaked`);
    const retry = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', `retry-${fault}`], fx));
    assert.equal(jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(retry.owner_handle)], fx)).released, true);
  }
});

check('post-rename lease cleanup failure is released-with-residue, not a false release failure', () => {
  const fx = makeEnv();
  const held = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'cleanup-residue'], fx));
  const released = jsonOut(runNode(LEASE, [
    'release', '--root', fx.gstack, '--handle-json', JSON.stringify(held.owner_handle),
  ], fx, { LUCA_PROJECT_LEASE_FAULT: 'after-release-rename' }));
  assert.equal(released.released, true);
  assert.equal(released.cleanup_required, true);
  assert.equal(existsSync(join(fx.gstack, '.claude', '.project-switch.lock')), false,
    'canonical lease name must be absent after successful release rename');
  assert.equal(existsSync(released.parked_path), true, 'exact parked residue remains visible for cleanup');
  const next = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'next-owner'], fx));
  assert.equal(next.acquired, true, 'cleanup residue must not block a new canonical owner');
  assert.equal(jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(next.owner_handle)], fx)).released, true);
});

check('pre-rename lease release failure preserves the canonical exact handle for recovery', () => {
  const fx = makeEnv();
  const held = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'pre-release'], fx));
  const failed = runNode(LEASE, [
    'release', '--root', fx.gstack, '--handle-json', JSON.stringify(held.owner_handle),
  ], fx, { LUCA_PROJECT_LEASE_FAULT: 'before-release-rename' });
  assert.notEqual(failed.status, 0);
  const inspected = jsonOut(runNode(LEASE, ['inspect', '--root', fx.gstack], fx));
  assert.equal(inspected.owner_handle.owner.process_nonce, held.owner_handle.owner.process_nonce);
  assert.equal(inspected.owner_alive, false);
  assert.equal(jsonOut(runNode(LEASE, [
    'recover', '--root', fx.gstack, '--handle-json', JSON.stringify(inspected.owner_handle),
  ], fx)).recovered, true);
});

check('lease never steals from a live owner merely because mtime is older than 60s', () => {
  const fx = makeEnv();
  const first = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'owner-a', '--pid', String(process.pid)], fx));
  assert.equal(first.acquired, true);
  const lock = join(fx.gstack, '.claude', '.project-switch.lock');
  const old = new Date(Date.now() - 3600_000);
  utimesSync(lock, old, old);
  const second = runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'owner-b', '--pid', String(process.pid)], fx);
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /live owner|活跃/);
  const recoverLive = runNode(LEASE, ['recover', '--root', fx.gstack, '--handle-json', JSON.stringify(first.owner_handle)], fx);
  assert.notEqual(recoverLive.status, 0, 'explicit recovery must still refuse a live exact owner');
  assert.equal(jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(first.owner_handle)], fx)).released, true);
});

check('stale lease requires explicit exact-handle recovery and rejects replayed handles', () => {
  const fx = makeEnv();
  const lock = join(fx.gstack, '.claude', '.project-switch.lock');
  mkdirSync(lock, { recursive: true });
  const deadOwner = {
    schema_version: 1,
    owner_token: 'dead-owner',
    pid: 99999999,
    process_nonce: 'definitely-not-a-live-process',
    acquired_at: new Date(0).toISOString(),
  };
  writeFileSync(join(lock, 'owner.json'), `${JSON.stringify(deadOwner)}\n`);
  const blocked = runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'new-owner', '--pid', String(process.pid)], fx);
  assert.notEqual(blocked.status, 0, 'ordinary acquire must never auto-reclaim a stale owner');
  assert.match(blocked.stderr, /stale owner|explicitly recover/);
  assert.equal(existsSync(lock), true);

  const inspected = jsonOut(runNode(LEASE, ['inspect', '--root', fx.gstack], fx));
  assert.equal(inspected.owner_alive, false);
  const deadHandle = inspected.owner_handle;
  const forged = structuredClone(deadHandle);
  forged.owner.process_nonce = 'wrong-nonce';
  const wrong = runNode(LEASE, ['recover', '--root', fx.gstack, '--handle-json', JSON.stringify(forged)], fx);
  assert.notEqual(wrong.status, 0);
  assert.equal(existsSync(lock), true);
  assert.equal(jsonOut(runNode(LEASE, ['recover', '--root', fx.gstack, '--handle-json', JSON.stringify(deadHandle)], fx)).recovered, true);
  assert.equal(existsSync(lock), false);

  const next = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'new-owner', '--pid', String(process.pid)], fx));
  assert.equal(jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(next.owner_handle)], fx)).released, true);

  // Reusing the visible token must not let an old handle release a new lease.
  const old = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'same-token'], fx));
  jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(old.owner_handle)], fx));
  const current = jsonOut(runNode(LEASE, ['acquire', '--root', fx.gstack, '--owner-token', 'same-token'], fx));
  const replay = runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(old.owner_handle)], fx);
  assert.notEqual(replay.status, 0, 'old handle with same owner_token must not release replacement lease');
  assert.equal(jsonOut(runNode(LEASE, ['release', '--root', fx.gstack, '--handle-json', JSON.stringify(current.owner_handle)], fx)).released, true);
});

console.log(`\n=== test-project-transaction summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
