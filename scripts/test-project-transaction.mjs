#!/usr/bin/env node
import assert from 'assert';
import {
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

const REPO = process.cwd();
const PIN = resolve(REPO, 'scripts/project-pin.mjs');
const LEASE = resolve(REPO, 'scripts/project-lease.mjs');
const PROJECT_SH = resolve(REPO, 'scripts/project.sh');
const GUARD = resolve(REPO, '.claude/hooks/project-scope-guard.mjs');
const CHECK_LINKS = resolve(REPO, 'scripts/check-project-links.mjs');
let pass = 0;
let fail = 0;

function check(name, fn) {
  try { fn(); pass += 1; console.log(`PASS ${name}`); }
  catch (error) { fail += 1; console.error(`FAIL ${name}: ${error.stack || error}`); }
}

function makeEnv() {
  const root = mkdtempSync(join(tmpdir(), 'project-tx-'));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  mkdirSync(join(gstack, '.claude', 'templates'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  writeFileSync(join(gstack, '.claude', 'templates', 'workflow-state.yaml'), 'topic: ""\nnodes: {}\n');
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: gstack,
    LUCA_GSTACK_ROOT: gstack,
    LUCA_PROJECTS_ROOT: projects,
    LUCA_ACTUAL_HARNESS: 'claude',
  };
  return { root, gstack, projects, env };
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

function prepare(fx, sid, operation, target) {
  prepare.serial = (prepare.serial || 0) + 1;
  return jsonOut(runNode(PIN, ['prepare', '--session', sid, '--operation', operation, '--target', target, '--turn-id', `switch-turn-${prepare.serial}`], fx));
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

function beginTurn(fx, sid, turn = 'turn-1') {
  return jsonOut(runNode(PIN, ['begin-turn', '--session', sid, '--turn-id', turn], fx));
}

function guard(fx, payload) {
  const result = spawnSync('node', [GUARD], {
    cwd: fx.gstack,
    env: fx.env,
    input: JSON.stringify(payload),
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

check('switch transaction commits canonical identity and epoch only after link readback', () => {
  const fx = makeEnv();
  const alpha = makeProject(fx, 'alpha');
  const state = bind(fx, 'S', 'alpha');
  assert.equal(state.state, 'BOUND');
  assert.equal(state.binding.project, 'alpha');
  assert.equal(state.binding.epoch, 1);
  assert.equal(state.binding.realpath, realpathSync(alpha));
  assert.ok(Number.isInteger(state.binding.dev));
  assert.ok(Number.isInteger(state.binding.ino));
  assert.equal(readlinkSync(join(fx.gstack, 'docs')), join(realpathSync(alpha), 'docs'));
  assert.equal(state.display_links.docs.target, join(realpathSync(alpha), 'docs'));
  const listed = spawnSync('bash', [PROJECT_SH, 'list'], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(listed.status, 0, listed.stderr);
  assert.match(listed.stdout, /项目列表/);
  assert.match(listed.stdout, /○ alpha/);
});

check('every switch write-boundary fault preserves old pin bytes and old link tuple', () => {
  const boundaries = ['after-target-validate', 'after-docs-link', 'after-state-link', 'after-topic-link', 'after-readback'];
  for (const fault of boundaries) {
    const fx = makeEnv();
    makeProject(fx, 'alpha');
    makeProject(fx, 'beta');
    bind(fx, 'S', 'alpha');
    const before = stateBytes(fx, 'S');
    const links = linkTuple(fx);
    const proposal = prepare(fx, 'S', 'switch', 'beta');
    const prepared = stateBytes(fx, 'S');
    const result = mutate(fx, 'S', 'switch', 'beta', proposal, { LUCA_PROJECT_FAULT: fault });
    assert.notEqual(result.status, 0, `${fault} should fail`);
    assert.deepEqual(stateBytes(fx, 'S'), prepared, `${fault}: SWITCH_ONLY CAS bytes changed`);
    assert.deepEqual(linkTuple(fx), links, `${fault}: links not rolled back`);
    const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
    assert.equal(status.switch.binding.project, 'alpha');
    assert.deepEqual(Buffer.from(JSON.stringify(status.switch.binding.project)), Buffer.from(JSON.stringify('alpha')));
    assert.ok(before.length > 0);
  }
});

check('stale epoch and replayed tx cannot mutate project or pin', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  const first = prepare(fx, 'S', 'switch', 'alpha');
  assert.equal(mutate(fx, 'S', 'switch', 'alpha', first).status, 0);
  const replay = mutate(fx, 'S', 'switch', 'alpha', first);
  assert.notEqual(replay.status, 0);
  const second = prepare(fx, 'S', 'switch', 'beta');
  const stale = spawnSync('bash', [PROJECT_SH, 'switch', 'beta', '--session-id', 'S', '--tx', second.tx, '--expected-epoch', '0'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.notEqual(stale.status, 0);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).switch.binding.project, 'alpha');
});

check('top-level turn IDs are single-use across BOUND, TURN_CLOSED, prepare, and begin', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  const first = prepare(fx, 'S', 'switch', 'alpha');
  assert.equal(mutate(fx, 'S', 'switch', 'alpha', first).status, 0);

  const boundReplay = runNode(PIN, ['begin-turn', '--session', 'S', '--turn-id', first.turn_id], fx);
  assert.notEqual(boundReplay.status, 0, 'BOUND must reject its consumed switch turn');
  assert.equal(jsonOut(runNode(PIN, [
    'close-switch-turn', '--session', 'S', '--turn-id', first.turn_id,
    '--expected-epoch', '1',
  ], fx)).state, 'TURN_CLOSED');
  const closedReplay = runNode(PIN, ['begin-turn', '--session', 'S', '--turn-id', first.turn_id], fx);
  assert.notEqual(closedReplay.status, 0, 'BOUND→TURN_CLOSED must not make the old ID reusable');

  assert.equal(beginTurn(fx, 'S', 'fresh-work-turn').state, 'TURN_ACTIVE');
  assert.equal(jsonOut(runNode(PIN, [
    'close-turn', '--session', 'S', '--turn-id', 'fresh-work-turn', '--expected-epoch', '1',
  ], fx)).state, 'TURN_CLOSED');
  const prepareReplay = runNode(PIN, [
    'prepare', '--session', 'S', '--operation', 'switch', '--target', 'beta', '--turn-id', 'fresh-work-turn',
  ], fx);
  assert.notEqual(prepareReplay.status, 0, 'prepare must reject an ID consumed by begin');
  assert.equal(jsonOut(runNode(PIN, [
    'prepare', '--session', 'S', '--operation', 'switch', '--target', 'beta', '--turn-id', 'fresh-switch-turn',
  ], fx)).state, 'SWITCH_ONLY', 'a distinct top-level turn remains accepted');
});

check('NO_PIN begin rejects replay while distinct turn IDs remain accepted', () => {
  const fx = makeEnv();
  assert.equal(beginTurn(fx, 'S', 'no-pin-turn-a').state, 'NO_PIN');
  const replay = runNode(PIN, ['begin-turn', '--session', 'S', '--turn-id', 'no-pin-turn-a'], fx);
  assert.notEqual(replay.status, 0);
  assert.equal(beginTurn(fx, 'S', 'no-pin-turn-b').state, 'NO_PIN');
  assert.equal(existsSync(join(fx.gstack, '.claude', '.session-project-S')), false, 'turn ledger must not masquerade as a project pin');
});

check('same-turn compound switch+project work is denied; exact mutation is the sole project command', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'switch', 'beta');
  const exact = `./scripts/project.sh switch beta --session-id S --tx ${p.tx} --expected-epoch ${p.expected_epoch}`;
  const good = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: exact } });
  assert.equal(good, null, 'exact switch mutation should pass unchanged');
  const bad = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `${exact} && cat docs/x.md` } });
  assert.equal(bad?.hookSpecificOutput?.permissionDecision, 'deny');
});

check('successful switch is terminal until the next top-level user turn', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'switch', 'beta');
  assert.equal(mutate(fx, 'S', 'switch', 'beta', p).status, 0);
  const sameTurn = guard(fx, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(sameTurn?.hookSpecificOutput?.permissionDecision, 'deny');
  const injectBypass = guard(fx, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'node scripts/project-pin.mjs inject --target beta' } });
  assert.equal(injectBypass?.hookSpecificOutput?.permissionDecision, 'deny', 'terminal state must reject internal context-injection bypass');
  const active = beginTurn(fx, 'S', 'next-turn');
  assert.equal(active.state, 'TURN_ACTIVE');
  const nextTurn = guard(fx, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(nextTurn?.hookSpecificOutput?.updatedInput?.file_path, join(realpathSync(join(fx.projects, 'beta')), 'docs', 'x.md'));
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
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  makeProject(fx, 'beta');
  const result = mutate(fx, 'S', 'new', 'beta', p);
  assert.notEqual(result.status, 0);
  assert.deepEqual(stateBytes(fx, 'S'), before);
  assert.deepEqual(linkTuple(fx), links);
});

check('empty-target publish race preserves the winner and parks the complete staging tree', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const p = prepare(fx, 'S', 'new', 'beta');
  const before = stateBytes(fx, 'S');
  const links = linkTuple(fx);
  const result = mutate(fx, 'S', 'new', 'beta', p, { LUCA_PROJECT_FAULT: 'empty-target-race' });
  assert.notEqual(result.status, 0);
  const target = join(fx.projects, 'beta');
  assert.equal(lstatSync(target).isDirectory(), true);
  assert.deepEqual(readdirSync(target), [], 'concurrent empty target must remain untouched');
  const parkedName = readdirSync(fx.projects).find(name => name.startsWith('.luca-aborted-staging-beta-'));
  assert.ok(parkedName, 'losing staging tree must be parked, not deleted');
  assert.equal(existsSync(join(fx.projects, parkedName, '.luca', 'workflow-state.yaml')), true);
  assert.equal(existsSync(join(fx.projects, parkedName, '.git')), true);
  assert.deepEqual(stateBytes(fx, 'S'), before);
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

check('canonical schema-v2 pins are read without migration rewrite', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const before = stateBytes(fx, 'S');
  const status = jsonOut(runNode(PIN, ['status', '--session', 'S'], fx));
  assert.equal(status.schema_version, 2);
  assert.deepEqual(stateBytes(fx, 'S'), before);
});

check('new project sanitizes Git hook env, commits the complete skeleton, stays terminal, and deactivates without deleting project data', () => {
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
  assert.equal(status.state, 'BOUND');
  assert.equal(status.binding.project, 'beta');
  assert.equal(status.binding.epoch, 2);
  for (const required of [
    'docs/handoff',
    '.luca/workflow-state.yaml',
    '.luca/current-topic.txt',
    '.luca/memory/MEMORY.md',
    '.luca/memory/decisions.md',
    'CONTEXT.md',
    '.git',
  ]) assert.equal(existsSync(join(beta, required)), true, `new skeleton missing ${required}`);
  assert.equal(readdirSync(fx.projects).some(name => name.startsWith('.luca-staging-beta-')), false);
  assert.deepEqual(linkTuple(fx), [
    join(realpathSync(beta), 'docs'),
    join(realpathSync(beta), '.luca', 'workflow-state.yaml'),
    join(realpathSync(beta), '.luca', 'current-topic.txt'),
  ]);

  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
    cwd: REPO, env: fx.env, encoding: 'utf8',
  });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  assert.equal(existsSync(join(fx.gstack, '.claude', '.session-project-S')), false);
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(existsSync(beta), true, 'deactivate must preserve project data');
});

check('post-commit lease release failure is success-with-warning, never an apparent transaction failure', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_FAULT: 'before-lease-release',
  });
  assert.equal(committed.status, 0, committed.stderr || committed.stdout);
  assert.match(committed.stderr, /已提交.*lease 释放失败.*禁止重试/);
  const result = jsonOut(committed);
  assert.equal(result.state, 'BOUND');
  assert.equal(result.binding.project, 'beta');
  assert.equal(result.lease_release?.released, false);
  assert.equal(result.lease_release?.recovery_required, true);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'S'], fx)).binding.project, 'beta');

  const held = jsonOut(runNode(LEASE, ['inspect', '--root', fx.gstack], fx));
  assert.equal(held.owner_handle.owner.process_nonce, result.lease_release.owner_handle.owner.process_nonce);
  assert.equal(jsonOut(runNode(LEASE, [
    'recover', '--root', fx.gstack, '--handle-json', JSON.stringify(held.owner_handle),
  ], fx)).recovered, true);
});

check('post-commit state-lock release failure is success-with-warning and exact-recoverable', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  bind(fx, 'S', 'alpha');
  const proposal = prepare(fx, 'S', 'switch', 'beta');
  const committed = mutate(fx, 'S', 'switch', 'beta', proposal, {
    LUCA_PROJECT_STATE_LOCK_FAULT: 'before-release',
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
    assert.deepEqual(linkTuple(fx), [
      join(realpathSync(join(fx.projects, 'beta')), 'docs'),
      join(realpathSync(join(fx.projects, 'beta')), '.luca', 'workflow-state.yaml'),
      join(realpathSync(join(fx.projects, 'beta')), '.luca', 'current-topic.txt'),
    ]);
  }
});

check('state remove rename is deactivate commit point; cleanup failure stays success-with-warning', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  bind(fx, 'S', 'alpha');
  const deactivated = spawnSync('bash', [PROJECT_SH, 'deactivate', 'S'], {
    cwd: REPO,
    env: { ...fx.env, LUCA_PROJECT_STATE_REMOVE_FAULT: 'after-rename' },
    encoding: 'utf8',
  });
  assert.equal(deactivated.status, 0, deactivated.stderr || deactivated.stdout);
  assert.match(deactivated.stderr, /已从 canonical 路径移除.*禁止重试解绑/);
  assert.equal(existsSync(join(fx.gstack, '.claude', '.session-project-S')), false);
  assert.deepEqual(linkTuple(fx), [null, null, null]);
  assert.equal(jsonOut(deactivated).state, 'NO_PIN');
});

check('per-state O_EXCL lock serializes same-sid CAS and never age-steals crash residue', () => {
  const fx = makeEnv();
  makeProject(fx, 'alpha');
  makeProject(fx, 'beta');
  const outA = join(fx.root, 'a.out'), errA = join(fx.root, 'a.err');
  const outB = join(fx.root, 'b.out'), errB = join(fx.root, 'b.err');
  const command = [
    `node "${PIN}" prepare --session SAME --operation switch --target alpha --turn-id turn-a >"${outA}" 2>"${errA}" & a=$!`,
    `node "${PIN}" prepare --session SAME --operation switch --target beta --turn-id turn-b >"${outB}" 2>"${errB}" & b=$!`,
    'wait $a; sa=$?',
    'wait $b; sb=$?',
    'printf "%s %s" "$sa" "$sb"',
  ].join('; ');
  const raced = spawnSync('bash', ['-c', command], { cwd: REPO, env: fx.env, encoding: 'utf8' });
  assert.equal(raced.status, 0, raced.stderr);
  const codes = raced.stdout.trim().split(/\s+/).map(Number);
  assert.equal(codes.filter(code => code === 0).length, 1, `exactly one CAS writer may succeed: ${raced.stdout}`);
  assert.equal(jsonOut(runNode(PIN, ['status', '--session', 'SAME'], fx)).state, 'SWITCH_ONLY');

  const crashFx = makeEnv();
  makeProject(crashFx, 'alpha');
  const stateLock = join(crashFx.gstack, '.claude', '.session-project-CRASH.lock');
  writeFileSync(stateLock, 'crash-residue\n');
  const old = new Date(Date.now() - 86400_000);
  utimesSync(stateLock, old, old);
  const blocked = runNode(PIN, ['prepare', '--session', 'CRASH', '--operation', 'switch', '--target', 'alpha', '--turn-id', 'turn-crash'], crashFx);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /manual recovery required|state lock exists/);
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
