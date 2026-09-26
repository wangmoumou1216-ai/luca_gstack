#!/usr/bin/env node
import assert from 'assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  projectListHostView,
  projectStatusHostView,
} from '../.claude/hooks/lib/project-host-view.mjs';
import { projectReservationPath } from '../.claude/hooks/lib/project-selection.mjs';

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const root = mkdtempSync(join(tmpdir(), 'project-host-view-'));
const gstackRoot = join(root, 'gstack');
const projectsRoot = join(root, 'projects');
mkdirSync(join(gstackRoot, '.claude'), { recursive: true });
mkdirSync(projectsRoot, { recursive: true });

function identity(name) {
  const path = join(projectsRoot, name);
  mkdirSync(path);
  const st = statSync(path);
  return { project: name, realpath: realpathSync(path), dev: Number(st.dev), ino: Number(st.ino) };
}

const alpha = identity('alpha');
const beta = identity('beta');
symlinkSync(alpha.realpath, join(projectsRoot, 'alpha-link'));
writeFileSync(join(projectsRoot, 'not-a-project'), 'not a directory\n');
const unfinished = identity('unfinished');
writeFileSync(projectReservationPath(projectsRoot, 'unfinished'), `${JSON.stringify({
  schema_version: 1, operation: 'new', tx: 'tx-unfinished-host-0001', session_id: 'host-unfinished',
  target: 'unfinished', phase: 'DIRECTORY_CREATED', staging: join(projectsRoot, '.staging'),
  dev: unfinished.dev, ino: unfinished.ino,
})}\n`);
const badReservation = identity('bad-reservation');
writeFileSync(projectReservationPath(projectsRoot, 'bad-reservation'), '{broken reservation\n');

const listBefore = readdirSync(projectsRoot).sort();
const list = projectListHostView({ projectsRoot });
assert.equal(list.read_status, 'OK');
assert.deepEqual(list.projects.map(item => item.project), ['alpha', 'beta']);
assert.equal(list.projects.some(item => item.project === 'alpha-link'), false);
assert.equal(list.projects.some(item => item.project === 'unfinished'), false);
assert.deepEqual(list.excluded, [
  { project: 'alpha-link', code: 'SYMLINK' },
  { project: 'bad-reservation', code: 'INVALID_RESERVATION' },
  { project: 'not-a-project', code: 'NOT_DIRECTORY' },
  { project: 'unfinished', code: 'NOT_READY' },
]);
assert.deepEqual(readdirSync(projectsRoot).sort(), listBefore, 'list view must not repair or clean excluded entries');
const emptyProjects = join(root, 'empty-projects');
mkdirSync(emptyProjects);
assert.deepEqual(projectListHostView({ projectsRoot: emptyProjects }).projects, []);
const missingList = projectListHostView({ projectsRoot: join(root, 'missing-projects') });
assert.equal(missingList.read_status, 'UNAVAILABLE');
assert.equal(missingList.projects, null);

const noRecordBefore = readdirSync(join(gstackRoot, '.claude')).sort();
const absent = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: 'missing-session' });
assert.equal(absent.read_status, 'NO_RECORD');
assert.equal(absent.current_binding, null);
assert.equal(absent.execution_authority, 'NOT_PROVIDED');
assert.deepEqual(readdirSync(join(gstackRoot, '.claude')).sort(), noRecordBefore, 'NO_RECORD read must not create state or lock files');

const invalidId = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: '../bad' });
assert.equal(invalidId.read_status, 'INVALID');
assert.equal(invalidId.error.code, 'INVALID_SESSION_ID');

const sid = 'host-session';
const statePath = join(gstackRoot, '.claude', `.session-project-${sid}`);
const state = {
  schema_version: 2,
  state: 'TURN_CLOSED',
  session_id: sid,
  binding: { ...beta, epoch: 2 },
  turn: { turn_id: 'legacy-host-fixture', epoch: 2, outcome: 'stop' },
  selection: {
    stream_id: 'stream-a',
    commit_sequence: 2,
    pending: null,
    receipts: [
      { operation_id: 'op-alpha-0001', kind: 'switch', target: 'alpha', status: 'COMMITTED', created: false,
        bound: true, commit_id: 'op-alpha-0001', expected_epoch: 0, binding_epoch: 1, committed_at: '2026-09-25T00:00:00Z', error_code: null },
      { operation_id: 'op-beta-0001', kind: 'switch', target: 'beta', status: 'COMMITTED', created: false,
        bound: true, commit_id: 'op-beta-0001', expected_epoch: 1, binding_epoch: 2, committed_at: '2026-09-25T00:01:00Z', error_code: null },
    ],
    latest_operation: { operation_id: 'op-beta-0001', kind: 'switch', target: 'beta', status: 'COMMITTED',
      created: false, bound: true, commit_id: 'op-beta-0001', expected_epoch: 1, binding_epoch: 2,
      committed_at: '2026-09-25T00:01:00Z', error_code: null },
    last_success: { stream_id: 'stream-a', sequence: 2, commit_id: 'op-beta-0001', kind: 'switch', target: 'beta',
      binding_epoch: 2, committed_at: '2026-09-25T00:01:00Z', origin: 'agent_user_selection' },
  },
  secret_prompt: 'must-not-leak',
};
writeFileSync(statePath, `${JSON.stringify(state)}\n`);
const before = { bytes: readFileSync(statePath), mtime: statSync(statePath).mtimeMs };
const view = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: sid, operationId: 'op-alpha-0001' });
assert.equal(view.read_status, 'OK');
assert.equal(view.binding_validation, 'VERIFIED');
assert.equal(view.current_binding.project, 'beta');
assert.equal(view.queried_receipt.lookup, 'FOUND');
assert.equal(view.queried_receipt.receipt.target, 'alpha');
assert.equal(view.selection_commit.sequence, 2);
assert.equal(view.execution_authority, 'NOT_PROVIDED');
assert.equal(JSON.stringify(view).includes('must-not-leak'), false);
assert.deepEqual(readFileSync(statePath), before.bytes);
assert.equal(statSync(statePath).mtimeMs, before.mtime);

const otherSid = 'host-session-other';
writeFileSync(join(gstackRoot, '.claude', `.session-project-${otherSid}`), `${JSON.stringify({
  schema_version: 2, state: 'TURN_CLOSED', session_id: otherSid,
  binding: { ...alpha, epoch: 1 }, turn: { turn_id: 'legacy-other-fixture', epoch: 1, outcome: 'stop' },
})}\n`);
const otherView = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: otherSid });
assert.equal(otherView.current_binding.project, 'alpha');
assert.equal(view.current_binding.project, 'beta', 'one session host read must not borrow another session binding');

const unstable = projectStatusHostView({
  gstackRoot, projectsRoot, sessionId: sid,
  afterFirstRead() {
    writeFileSync(statePath, `${JSON.stringify({ ...state, state: 'NO_PIN', binding: undefined, turn: undefined })}\n`);
  },
});
assert.equal(unstable.read_status, 'UNSTABLE');
assert.equal(unstable.current_binding, null);
assert.equal(unstable.current_operation, null);
assert.equal(unstable.selection_commit, null);
writeFileSync(statePath, `${JSON.stringify(state)}\n`);

const unknown = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: sid, operationId: 'missing-op' });
assert.equal(unknown.queried_receipt.lookup, 'EXPIRED_OR_UNKNOWN');
assert.equal(unknown.current_binding.project, 'beta');

const noPinSid = 'host-no-pin';
writeFileSync(join(gstackRoot, '.claude', `.session-project-${noPinSid}`), `${JSON.stringify({
  schema_version: 3, state: 'NO_PIN', session_id: noPinSid,
  event_control: { candidates: [], current: null, cursor: null, consumed_events: [] },
})}\n`);
const noPin = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: noPinSid });
assert.equal(noPin.read_status, 'OK');
assert.equal(noPin.binding_validation, 'NONE');

const invalidBindingSid = 'host-invalid-binding';
writeFileSync(join(gstackRoot, '.claude', `.session-project-${invalidBindingSid}`), `${JSON.stringify({
  ...state, session_id: invalidBindingSid, binding: { ...beta, dev: beta.dev + 1 },
})}\n`);
const invalidBinding = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: invalidBindingSid });
assert.equal(invalidBinding.read_status, 'INVALID');
assert.equal(invalidBinding.binding_validation, 'INVALID');

const legacySid = 'host-legacy';
writeFileSync(join(gstackRoot, '.claude', `.session-project-${legacySid}`), 'alpha\n');
assert.equal(projectStatusHostView({ gstackRoot, projectsRoot, sessionId: legacySid }).read_status, 'INVALID');

const invalidSelectionSid = 'host-invalid-selection';
writeFileSync(join(gstackRoot, '.claude', `.session-project-${invalidSelectionSid}`), `${JSON.stringify({
  ...state, session_id: invalidSelectionSid,
  selection: { ...state.selection, last_success: { ...state.selection.last_success, origin: 'forged-origin' } },
})}\n`);
const invalidSelection = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: invalidSelectionSid });
assert.equal(invalidSelection.read_status, 'INVALID');
assert.equal(invalidSelection.error.code, 'INVALID_SELECTION');
assert.equal(invalidSelection.selection_commit, null);

const cli = spawnSync(process.execPath, [join(SOURCE_ROOT, 'scripts', 'project-pin.mjs'), 'status', '--view', 'host',
  '--session-id', sid, '--operation', 'op-alpha-0001'], {
  cwd: gstackRoot,
  env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
  shell: false,
  encoding: 'utf8',
});
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
const cliView = JSON.parse(cli.stdout);
assert.equal(cliView.session_id, sid);
assert.equal(cliView.queried_receipt.receipt.operation_id, 'op-alpha-0001');

const listCli = spawnSync(process.execPath, [join(SOURCE_ROOT, 'scripts', 'project-pin.mjs'), 'list', '--view', 'host'], {
  cwd: gstackRoot,
  env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
  shell: false,
  encoding: 'utf8',
});
assert.equal(listCli.status, 0, listCli.stderr || listCli.stdout);
assert.deepEqual(JSON.parse(listCli.stdout).projects.map(item => item.project), ['alpha', 'beta']);

const ordinaryList = spawnSync('/bin/bash', [join(SOURCE_ROOT, 'scripts', 'project.sh'), 'list'], {
  cwd: gstackRoot,
  env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
  shell: false,
  encoding: 'utf8',
});
assert.equal(ordinaryList.status, 0, ordinaryList.stderr || ordinaryList.stdout);
assert.deepEqual(JSON.parse(ordinaryList.stdout).projects.map(item => item.project), ['alpha', 'beta'],
  'ordinary agent list must share READY filtering with host view');

const ordinaryStatus = spawnSync('/bin/bash', [join(SOURCE_ROOT, 'scripts', 'project.sh'), 'status', sid,
  '--operation', 'missing-op'], {
  cwd: gstackRoot,
  env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
  shell: false,
  encoding: 'utf8',
});
assert.equal(ordinaryStatus.status, 0, ordinaryStatus.stderr || ordinaryStatus.stdout);
const ordinaryStatusView = JSON.parse(ordinaryStatus.stdout);
assert.equal(ordinaryStatusView.queried_receipt.lookup, 'EXPIRED_OR_UNKNOWN');
assert.equal(Object.hasOwn(ordinaryStatusView, 'display_links'), false,
  'ordinary status must not consult shared display aliases');

for (const args of [
  ['list', '--view', 'host', '--bogus', 'value'],
  ['status', '--view', 'host', '--session-id', sid, '--bogus', 'value'],
  ['status', '--view', 'host', '--session-id', sid, '--session-id', sid],
  ['status', '--view', 'host', '--session-id'],
]) {
  const invalidCli = spawnSync(process.execPath, [join(SOURCE_ROOT, 'scripts', 'project-pin.mjs'), ...args], {
    cwd: gstackRoot,
    env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
    shell: false,
    encoding: 'utf8',
  });
  assert.equal(invalidCli.status, 2, invalidCli.stderr || invalidCli.stdout);
  const invalidCliView = JSON.parse(invalidCli.stdout);
  assert.equal(invalidCliView.read_status, 'INVALID');
  assert.equal(invalidCliView.error.code, 'INVALID_PARAMETERS');
}

const invalidOperationCli = spawnSync(process.execPath, [join(SOURCE_ROOT, 'scripts', 'project-pin.mjs'), 'status',
  '--view', 'host', '--session-id', sid, '--operation', '../bad'], {
  cwd: gstackRoot,
  env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
  shell: false,
  encoding: 'utf8',
});
assert.equal(invalidOperationCli.status, 2, invalidOperationCli.stderr || invalidOperationCli.stdout);
assert.equal(JSON.parse(invalidOperationCli.stdout).error.code, 'INVALID_OPERATION_ID');
assert.deepEqual(readFileSync(statePath), before.bytes, 'invalid host CLI calls must not mutate session state');

writeFileSync(statePath, '{bad json\n');
const broken = projectStatusHostView({ gstackRoot, projectsRoot, sessionId: sid });
assert.equal(broken.read_status, 'INVALID');
assert.equal(broken.current_binding, null);

console.log('PASS project host view H01-H03/H05-H07 READY filtering, snapshot stability, whitelist, shell=false CLI, and read-only contract');
