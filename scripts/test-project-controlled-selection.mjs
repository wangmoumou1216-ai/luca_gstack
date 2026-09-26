#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  gitCommonDirRealpath,
  pathTuple,
} from './controlled-change.mjs';
import {
  canonicalPublicSelectionCommand,
  expandedSelectionCommand,
  minimalProjectContext,
} from '../.claude/hooks/lib/project-selection.mjs';

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER = join(SOURCE_ROOT, 'scripts', 'controlled-change-controller.mjs');
const CONTROLLED_GUARD = join(SOURCE_ROOT, '.claude', 'hooks', 'controlled-change-guard.mjs');
const PROJECT_SH = join(SOURCE_ROOT, 'scripts', 'project.sh');
const PLAN_SHA = '66173677536a37cbc673defd8d7b6c8b0d95201af6338e33e4714bc06bc5fc4f';

function run(command, args, options = {}) {
  const env = { ...process.env, ...(options.env || {}) };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_PREFIX']) delete env[key];
  return spawnSync(command, args, { cwd: options.cwd, env, input: options.input, encoding: 'utf8' });
}

function git(repo, ...args) {
  const result = run('/usr/bin/git', ['-C', repo, ...args]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function postimage(project) {
  return {
    type: 'file', mode: '100644',
    sha256: createHash('sha256').update(Buffer.from(minimalProjectContext(project))).digest('hex'),
  };
}

function setup(operation, target) {
  const root = mkdtempSync(join(tmpdir(), `controlled-selection-${operation}-`));
  const repo = join(root, 'repo');
  const projects = join(root, 'projects');
  const scratch = join(root, 'scratch');
  mkdirSync(join(repo, '.claude'), { recursive: true });
  mkdirSync(projects);
  mkdirSync(scratch);
  const projectsReal = realpathSync(projects);
  assert.equal(run('/usr/bin/git', ['init', '-q', repo]).status, 0);
  git(repo, 'config', 'user.name', 'Selection Contract Test');
  git(repo, 'config', 'user.email', 'selection@example.invalid');
  writeFileSync(join(repo, 'baseline.txt'), 'baseline\n');
  git(repo, 'add', 'baseline.txt');
  git(repo, 'commit', '-qm', 'fixture');
  const head = git(repo, 'rev-parse', 'HEAD');
  const publicCommand = canonicalPublicSelectionCommand({ operation, target });
  const externalPaths = operation === 'new' ? [{
    path: join(projectsReal, target, 'CONTEXT.md'), mutation: 'add',
    preimage: pathTuple(join(projectsReal, target, 'CONTEXT.md')), postimage: postimage(target),
  }] : [];
  const manifest = {
    schema_version: 1, task_id: `project-selection-${operation}`, u_id: 'U-002',
    repo_realpath: realpathSync(repo), git_common_dir_realpath: gitCommonDirRealpath(repo),
    plan_sha256: PLAN_SHA, plan_recorded_baseline: head, observed_baseline: head,
    session: `controlled-${operation}`, scratch_root: realpathSync(scratch),
    repo_paths: [], external_paths: externalPaths,
    mutation_classes: operation === 'new' ? ['add'] : [], approved_effects: [],
    allowed_commands: [publicCommand],
  };
  const manifestPath = join(scratch, 'manifest.json');
  writeFileSync(manifestPath, `${canonicalJson(manifest)}\n`);
  const prepared = run(process.execPath, [CONTROLLER, 'prepare', '--manifest', manifestPath,
    '--generation', `generation-${operation}-0001`, '--ttl-seconds', '3600'], { cwd: repo });
  assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
  return { root, repo: realpathSync(repo), projects: projectsReal, target, publicCommand };
}

function identity(projects, name, epoch) {
  const path = join(projects, name);
  mkdirSync(path);
  const stat = statSync(path);
  return { project: name, realpath: realpathSync(path), dev: Number(stat.dev), ino: Number(stat.ino), epoch };
}

function nativeEventId(sid, nativeId) {
  const hash = createHash('sha256');
  for (const value of ['luca-native-event:v1:claude', sid, nativeId]) {
    const bytes = Buffer.from(value);
    hash.update(Buffer.from(`${bytes.length}:`));
    hash.update(bytes);
  }
  return `claude:${hash.digest('hex')}`;
}

function writeProposal(fixture, { sid, tx, operation, target, expectedEpoch, binding = null }) {
  const nativeId = `native-${sid}`;
  const transcript = join(fixture.root, `transcript-${sid}.jsonl`);
  writeFileSync(transcript, '');
  const transcriptStat = statSync(transcript);
  const cursor = { schema_version: 1, harness: 'claude', transcript_path: realpathSync(transcript),
    dev: String(transcriptStat.dev), ino: String(transcriptStat.ino), byte_offset: 0, record_index: 0,
    prefix_sha256: createHash('sha256').update('').digest('hex') };
  const event = { event_id: nativeEventId(sid, nativeId), boundary_id: `boundary-${sid}`, native_id: nativeId,
    anchor_id: null, cwd: fixture.repo, harness: 'claude', status: 'active', attested_at: '2026-09-25T00:00:00Z' };
  const proposal = { tx, operation, target, expected_epoch: expectedEpoch, binding,
    event_id: event.event_id, boundary_id: event.boundary_id, status: 'PREPARED' };
  writeFileSync(join(fixture.repo, '.claude', `.session-project-${sid}`), `${JSON.stringify({
    schema_version: 3, state: 'SWITCH_ONLY', session_id: sid, switch: proposal,
    selection: { pending: proposal },
    event_control: { candidates: [], current: event, cursor,
      consumed_events: [{ event_id: event.event_id, boundary_id: event.boundary_id,
        harness: 'claude', native_id: event.native_id, anchor_id: null }] },
  })}\n`);
  return proposal;
}

function guard(fixture, command) {
  return run(process.execPath, [CONTROLLED_GUARD], {
    cwd: fixture.repo,
    env: { CLAUDE_PROJECT_DIR: fixture.repo, LUCA_GSTACK_ROOT: fixture.repo,
      LUCA_PROJECTS_ROOT: fixture.projects },
    input: JSON.stringify({ session_id: 'host-does-not-authorize', tool_name: 'Bash',
      tool_input: { command } }),
  });
}

function updateProposalStatus(fixture, sid, status, ownerPid) {
  const path = join(fixture.repo, '.claude', `.session-project-${sid}`);
  const state = JSON.parse(readFileSync(path, 'utf8'));
  state.switch = { ...state.switch, status, owner_pid: ownerPid, created: false, bound: false };
  state.selection.pending = { ...state.selection.pending, status, owner_pid: ownerPid, created: false, bound: false };
  writeFileSync(path, `${JSON.stringify(state)}\n`);
}

const switchFixture = setup('switch', 'beta');
const alpha = identity(switchFixture.projects, 'alpha', 1);
identity(switchFixture.projects, 'beta', 1);
const switchArgs = { sid: 'controlled-switch', tx: 'tx-controlled-switch-0001', operation: 'switch',
  target: 'beta', expectedEpoch: 1, binding: alpha };
const switchProposal = writeProposal(switchFixture, switchArgs);
const switchExpanded = expandedSelectionCommand({ ...switchProposal, session_id: switchArgs.sid });
assert.equal(guard(switchFixture, switchExpanded).status, 0, 'trusted expanded switch must pass controlled guard');
const altered = switchExpanded.replace('switch beta', 'switch alpha');
const alteredResult = guard(switchFixture, altered);
assert.equal(alteredResult.status, 2);
assert.match(alteredResult.stdout + alteredResult.stderr, /matching trusted proposal/);
const switched = run('/bin/bash', [PROJECT_SH, 'switch', 'beta', '--session-id', switchArgs.sid,
  '--tx', switchArgs.tx, '--expected-epoch', '1'], {
  cwd: switchFixture.repo,
  env: { LUCA_GSTACK_ROOT: switchFixture.repo, LUCA_PROJECTS_ROOT: switchFixture.projects },
});
assert.equal(switched.status, 0, switched.stderr || switched.stdout);
const switchState = JSON.parse(readFileSync(join(switchFixture.repo, '.claude', `.session-project-${switchArgs.sid}`)));
assert.equal(switchState.binding.project, 'beta');
assert.equal(guard(switchFixture, switchExpanded).status, 0, 'COMMITTED replay must map to the public command');
const beforeReplay = readFileSync(join(switchFixture.repo, '.claude', `.session-project-${switchArgs.sid}`));
const replayed = run('/bin/bash', [PROJECT_SH, 'switch', 'beta', '--session-id', switchArgs.sid,
  '--tx', switchArgs.tx, '--expected-epoch', '1'], {
  cwd: switchFixture.repo,
  env: { LUCA_GSTACK_ROOT: switchFixture.repo, LUCA_PROJECTS_ROOT: switchFixture.projects },
});
assert.equal(replayed.status, 0, replayed.stderr || replayed.stdout);
assert.deepEqual(readFileSync(join(switchFixture.repo, '.claude', `.session-project-${switchArgs.sid}`)),
  beforeReplay);

const newFixture = setup('new', 'space project');
const newArgs = { sid: 'controlled-new', tx: 'tx-controlled-new-0001', operation: 'new',
  target: 'space project', expectedEpoch: 0 };
const newProposal = writeProposal(newFixture, newArgs);
const newExpanded = expandedSelectionCommand({ ...newProposal, session_id: newArgs.sid });
const authorizedNew = guard(newFixture, newExpanded);
assert.equal(authorizedNew.status, 0, authorizedNew.stderr || authorizedNew.stdout || 'authorized new with exact CONTEXT row must pass');
const created = run('/bin/bash', [PROJECT_SH, 'new', newArgs.target, '--session-id', newArgs.sid,
  '--tx', newArgs.tx, '--expected-epoch', '0'], {
  cwd: newFixture.repo,
  env: { LUCA_GSTACK_ROOT: newFixture.repo, LUCA_PROJECTS_ROOT: newFixture.projects },
});
assert.equal(created.status, 0, created.stderr || created.stdout);
assert.equal(readFileSync(join(newFixture.projects, newArgs.target, 'CONTEXT.md'), 'utf8'), minimalProjectContext(newArgs.target));

const unauthorized = setup('new', 'denied-project');
const deniedArgs = { sid: 'controlled-denied', tx: 'tx-controlled-denied-0001', operation: 'new',
  target: 'other-project', expectedEpoch: 0 };
const deniedProposal = writeProposal(unauthorized, deniedArgs);
const deniedExpanded = expandedSelectionCommand({ ...deniedProposal, session_id: deniedArgs.sid });
const denied = guard(unauthorized, deniedExpanded);
assert.equal(denied.status, 2);
assert.match(denied.stdout + denied.stderr, /does not allow canonical project selection/);
const deniedAtController = run('/bin/bash', [PROJECT_SH, 'new', deniedArgs.target,
  '--session-id', deniedArgs.sid, '--tx', deniedArgs.tx, '--expected-epoch', '0'], {
  cwd: unauthorized.repo,
  env: { LUCA_GSTACK_ROOT: unauthorized.repo, LUCA_PROJECTS_ROOT: unauthorized.projects },
});
assert.notEqual(deniedAtController.status, 0,
  'controller must independently recheck the current controlled manifest');
assert.match(deniedAtController.stderr, /does not allow canonical project selection/);
assert.equal(existsSync(join(unauthorized.projects, deniedArgs.target)), false);

const earlyRecovery = setup('new', 'early crash project');
const earlyArgs = { sid: 'controlled-early-recovery', tx: 'tx-controlled-early-0001', operation: 'new',
  target: 'early crash project', expectedEpoch: 0 };
const earlyProposal = writeProposal(earlyRecovery, earlyArgs);
updateProposalStatus(earlyRecovery, earlyArgs.sid, 'RUNNING', 2147483647);
const earlyExpanded = expandedSelectionCommand({ ...earlyProposal, session_id: earlyArgs.sid });
assert.equal(guard(earlyRecovery, earlyExpanded).status, 0,
  'same trusted RUNNING tx may recover before the reservation side effect');
const earlyCreated = run('/bin/bash', [PROJECT_SH, 'new', earlyArgs.target, '--session-id', earlyArgs.sid,
  '--tx', earlyArgs.tx, '--expected-epoch', '0'], {
  cwd: earlyRecovery.repo,
  env: { LUCA_GSTACK_ROOT: earlyRecovery.repo, LUCA_PROJECTS_ROOT: earlyRecovery.projects },
});
assert.equal(earlyCreated.status, 0, earlyCreated.stderr || earlyCreated.stdout);

const driftRecovery = setup('new', 'drift recovery project');
const driftArgs = { sid: 'controlled-drift-recovery', tx: 'tx-controlled-drift-0001', operation: 'new',
  target: 'drift recovery project', expectedEpoch: 0 };
const driftProposal = writeProposal(driftRecovery, driftArgs);
const driftContext = join(driftRecovery.projects, driftArgs.target, 'CONTEXT.md');
const interruptedDrift = run('/bin/bash', [PROJECT_SH, 'new', driftArgs.target,
  '--session-id', driftArgs.sid, '--tx', driftArgs.tx, '--expected-epoch', '0'], {
  cwd: driftRecovery.repo,
  env: { LUCA_GSTACK_ROOT: driftRecovery.repo, LUCA_PROJECTS_ROOT: driftRecovery.projects,
    LUCA_PROJECT_FAULT: 'after-new-context' },
});
assert.notEqual(interruptedDrift.status, 0);
let driftState = JSON.parse(readFileSync(join(driftRecovery.repo, '.claude', `.session-project-${driftArgs.sid}`)));
assert.equal(driftState.selection.pending.status, 'CREATING');
assert.equal(driftState.selection.pending.created, true);
assert.equal(driftState.selection.pending.phase, 'READY');
chmodSync(driftContext, 0o600);
const driftExpanded = expandedSelectionCommand({ ...driftProposal, session_id: driftArgs.sid });
assert.equal(guard(driftRecovery, driftExpanded).status, 2,
  'recovery guard must reject a drifted deterministic CONTEXT postimage');
const deniedDriftRecovery = run('/bin/bash', [PROJECT_SH, 'new', driftArgs.target,
  '--session-id', driftArgs.sid, '--tx', driftArgs.tx, '--expected-epoch', '0'], {
  cwd: driftRecovery.repo,
  env: { LUCA_GSTACK_ROOT: driftRecovery.repo, LUCA_PROJECTS_ROOT: driftRecovery.projects },
});
assert.notEqual(deniedDriftRecovery.status, 0,
  'controller must independently reject the drifted recovery postimage');
driftState = JSON.parse(readFileSync(join(driftRecovery.repo, '.claude', `.session-project-${driftArgs.sid}`)));
assert.equal(driftState.selection.pending.status, 'CREATING',
  'authorization refusal must keep the interrupted operation recoverable');
assert.equal(driftState.selection.pending.created, true,
  'authorization refusal must preserve the already-created result');
assert.equal(driftState.selection.pending.phase, 'READY',
  'authorization refusal must preserve the durable creation phase');
assert.equal(readFileSync(driftContext, 'utf8'), minimalProjectContext(driftArgs.target));
chmodSync(driftContext, 0o644);
const recoveredDrift = run('/bin/bash', [PROJECT_SH, 'new', driftArgs.target,
  '--session-id', driftArgs.sid, '--tx', driftArgs.tx, '--expected-epoch', '0'], {
  cwd: driftRecovery.repo,
  env: { LUCA_GSTACK_ROOT: driftRecovery.repo, LUCA_PROJECTS_ROOT: driftRecovery.projects },
});
assert.equal(recoveredDrift.status, 0, recoveredDrift.stderr || recoveredDrift.stdout);
driftState = JSON.parse(readFileSync(join(driftRecovery.repo, '.claude', `.session-project-${driftArgs.sid}`)));
assert.equal(driftState.selection.latest_operation.status, 'COMMITTED');
assert.equal(driftState.selection.latest_operation.operation_id, driftArgs.tx);

const busy = setup('switch', 'busy-beta');
const busyAlpha = identity(busy.projects, 'busy-alpha', 1);
identity(busy.projects, 'busy-beta', 1);
const busyArgs = { sid: 'controlled-busy', tx: 'tx-controlled-busy-0001', operation: 'switch',
  target: 'busy-beta', expectedEpoch: 1, binding: busyAlpha };
const busyProposal = writeProposal(busy, busyArgs);
updateProposalStatus(busy, busyArgs.sid, 'RUNNING', process.pid);
const busyResult = run('/bin/bash', [PROJECT_SH, 'switch', busyArgs.target, '--session-id', busyArgs.sid,
  '--tx', busyArgs.tx, '--expected-epoch', '1'], {
  cwd: busy.repo,
  env: { LUCA_GSTACK_ROOT: busy.repo, LUCA_PROJECTS_ROOT: busy.projects },
});
assert.notEqual(busyResult.status, 0);
assert.match(busyResult.stderr, /already running/);
assert.equal(JSON.parse(readFileSync(join(busy.repo, '.claude', `.session-project-${busyArgs.sid}`))).selection.pending.status,
  'RUNNING', 'a competing controller must not rewrite another live owner');

console.log('PASS controlled selection public mapping, trusted argv, replay, exact new row, early/drift recovery, BUSY owner, spaces, and target denial');
