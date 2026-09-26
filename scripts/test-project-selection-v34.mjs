#!/usr/bin/env node
import assert from 'assert/strict';
import { createHash } from 'crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn, spawnSync } from 'child_process';
import {
  canonicalProjectIdentity,
  closeAttestedProjectEvent,
  listProjects,
  prepareProjectSwitch,
  readProjectState,
} from '../.claude/hooks/lib/project-substrate.mjs';
import { minimalProjectContext, projectReservationPath } from '../.claude/hooks/lib/project-selection.mjs';

const fixture = mkdtempSync(join(tmpdir(), 'project-selection-v34-'));
const gstackRoot = join(fixture, 'gstack');
const projectsRoot = join(fixture, 'projects');
mkdirSync(join(gstackRoot, '.claude'), { recursive: true });
mkdirSync(projectsRoot);
process.env.LUCA_GSTACK_ROOT = gstackRoot;
process.env.LUCA_PROJECTS_ROOT = projectsRoot;
const { executeProjectTransaction } = await import('./project-pin.mjs');

function identity(name, epoch) {
  const path = join(projectsRoot, name);
  mkdirSync(path);
  const st = statSync(path);
  return { project: name, realpath: realpathSync(path), dev: Number(st.dev), ino: Number(st.ino), epoch };
}

function part(value) {
  const bytes = Buffer.from(String(value));
  return Buffer.concat([Buffer.from(`${bytes.length}:`), bytes]);
}

function eventId(sid, nativeId) {
  const hash = createHash('sha256');
  for (const value of ['luca-native-event:v1:claude', sid, nativeId]) hash.update(part(value));
  return `claude:${hash.digest('hex')}`;
}

const alpha = identity('alpha', 1);
identity('beta', 1);
const sid = 'selection-v34';
const nativeId = 'native-selection-v34';
const transcriptPath = join(fixture, 'transcript.jsonl');
writeFileSync(transcriptPath, '');
const transcriptStat = statSync(transcriptPath);
const cursor = { schema_version: 1, harness: 'claude', transcript_path: transcriptPath,
  dev: String(transcriptStat.dev), ino: String(transcriptStat.ino), byte_offset: 0, record_index: 0,
  prefix_sha256: createHash('sha256').update('').digest('hex') };
const event = {
  event_id: eventId(sid, nativeId), boundary_id: 'boundary-v34', native_id: nativeId,
  anchor_id: null, cwd: gstackRoot, harness: 'claude', status: 'active',
  attested_at: '2026-09-25T00:00:00Z',
};
const tx1 = 'tx-selection-v34-0001';
const initial = {
  schema_version: 3,
  state: 'SWITCH_ONLY',
  session_id: sid,
  switch: { tx: tx1, operation: 'switch', target: 'beta', expected_epoch: 1,
    binding: alpha, event_id: event.event_id, boundary_id: event.boundary_id, status: 'PREPARED' },
  selection: { pending: { tx: tx1, operation: 'switch', target: 'beta', expected_epoch: 1 } },
  event_control: { candidates: [], current: event, cursor,
    consumed_events: [{ event_id: event.event_id, boundary_id: event.boundary_id, harness: 'claude',
      native_id: nativeId, anchor_id: null }] },
};
writeFileSync(join(gstackRoot, '.claude', `.session-project-${sid}`), `${JSON.stringify(initial)}\n`);

const first = executeProjectTransaction({ sessionId: sid, tx: tx1, operation: 'switch', target: 'beta', expectedEpoch: 1 });
assert.equal(first.state, 'TURN_ACTIVE');
assert.equal(first.binding.project, 'beta');
assert.equal(first.selection.last_success.sequence, 1);
assert.equal(first.selection.last_success.commit_id, tx1);

const prepared = prepareProjectSwitch({ gstackRoot, projectsRoot, sessionId: sid, operation: 'switch', target: 'beta' });
const tx2 = prepared.proposal.tx;
const second = executeProjectTransaction({ sessionId: sid, tx: tx2, operation: 'switch', target: 'beta', expectedEpoch: 2 });
assert.equal(second.selection.last_success.sequence, 2);
assert.notEqual(second.selection.last_success.commit_id, tx1);
assert.equal(second.binding.epoch, first.binding.epoch, 'same-project re-entry may keep binding epoch');

const beforeReplay = readFileSync(join(gstackRoot, '.claude', `.session-project-${sid}`));
const replay = executeProjectTransaction({ sessionId: sid, tx: tx2, operation: 'switch', target: 'beta', expectedEpoch: 2 });
assert.equal(replay.replayed, true);
assert.equal(replay.selection.last_success.sequence, 2);
assert.deepEqual(readFileSync(join(gstackRoot, '.claude', `.session-project-${sid}`)), beforeReplay);

const closed = closeAttestedProjectEvent({
  gstackRoot, projectsRoot, sessionId: sid, eventId: event.event_id, boundaryId: event.boundary_id,
});
assert.equal(closed.state, 'TURN_CLOSED');
assert.equal(closed.selection.last_success.sequence, 2);

const disk = readProjectState(gstackRoot, sid, projectsRoot).value;
assert.equal(disk.selection.last_success.sequence, 2);

function preparedNewState(newSid, project, transaction) {
  const nextNative = `native-${newSid}`;
  const nextEvent = {
    event_id: eventId(newSid, nextNative), boundary_id: `boundary-${newSid}`, native_id: nextNative,
    anchor_id: null, cwd: gstackRoot, harness: 'claude', status: 'active',
    attested_at: '2026-09-25T00:10:00Z',
  };
  const proposal = { tx: transaction, operation: 'new', target: project, expected_epoch: 0,
    binding: null, event_id: nextEvent.event_id, boundary_id: nextEvent.boundary_id, status: 'PREPARED' };
  const value = {
    schema_version: 3, state: 'SWITCH_ONLY', session_id: newSid, switch: proposal,
    selection: { pending: proposal },
    event_control: { candidates: [], current: nextEvent, cursor,
      consumed_events: [{ event_id: nextEvent.event_id, boundary_id: nextEvent.boundary_id,
        harness: 'claude', native_id: nextNative, anchor_id: null }] },
  };
  writeFileSync(join(gstackRoot, '.claude', `.session-project-${newSid}`), `${JSON.stringify(value)}\n`);
}

function preparedSwitchState(newSid, project, transaction, binding, expectedEpoch) {
  const nextNative = `native-${newSid}`;
  const nextEvent = {
    event_id: eventId(newSid, nextNative), boundary_id: `boundary-${newSid}`, native_id: nextNative,
    anchor_id: null, cwd: gstackRoot, harness: 'claude', status: 'active',
    attested_at: '2026-09-25T00:11:00Z',
  };
  const proposal = { tx: transaction, operation: 'switch', target: project, expected_epoch: expectedEpoch,
    binding, event_id: nextEvent.event_id, boundary_id: nextEvent.boundary_id, status: 'PREPARED' };
  writeFileSync(join(gstackRoot, '.claude', `.session-project-${newSid}`), `${JSON.stringify({
    schema_version: 3, state: 'SWITCH_ONLY', session_id: newSid, switch: proposal,
    selection: { pending: proposal },
    event_control: { candidates: [], current: nextEvent, cursor,
      consumed_events: [{ event_id: nextEvent.event_id, boundary_id: nextEvent.boundary_id,
        harness: 'claude', native_id: nextNative, anchor_id: null }] },
  })}\n`);
}

function projectChild(operation, target, sessionId, tx, expectedEpoch) {
  return new Promise(resolveChild => {
    const child = spawn('/bin/bash', [join(process.cwd(), 'scripts', 'project.sh'), operation, target,
      '--session-id', sessionId, '--tx', tx, '--expected-epoch', String(expectedEpoch)], {
      cwd: gstackRoot,
      env: { ...process.env, LUCA_GSTACK_ROOT: gstackRoot, LUCA_PROJECTS_ROOT: projectsRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('close', status => resolveChild({ status, stdout, stderr }));
  });
}

const collisionSid = 'selection-existing-collision';
const collisionTx = 'tx-selection-collision-0001';
preparedNewState(collisionSid, 'alpha', collisionTx);
assert.throws(() => executeProjectTransaction({
  sessionId: collisionSid, tx: collisionTx, operation: 'new', target: 'alpha', expectedEpoch: 0,
}), /already exists|exact trusted reservation owner/);
assert.equal(listProjects(projectsRoot).includes('alpha'), true,
  'a failed new against an existing project must not hide that project');
assert.equal(canonicalProjectIdentity('alpha', projectsRoot).project, 'alpha');
assert.equal(readdirSync(projectsRoot).includes(projectReservationPath(projectsRoot, 'alpha').split('/').at(-1)), false,
  'existing-project collision must not publish a reservation');

const createSid = 'selection-create';
const createTx = 'tx-selection-create-0001';
preparedNewState(createSid, 'gamma', createTx);
const createdProject = executeProjectTransaction({
  sessionId: createSid, tx: createTx, operation: 'new', target: 'gamma', expectedEpoch: 0,
});
assert.equal(createdProject.state, 'TURN_ACTIVE');
assert.equal(createdProject.selection.latest_operation.created, true);
assert.deepEqual(readFileSync(join(projectsRoot, 'gamma', 'CONTEXT.md'), 'utf8'), minimalProjectContext('gamma'));
assert.deepEqual(readdirSync(join(projectsRoot, 'gamma')), ['CONTEXT.md']);

const recoverSid = 'selection-recover';
const recoverTx = 'tx-selection-recover-0001';
preparedNewState(recoverSid, 'delta', recoverTx);
process.env.LUCA_PROJECT_FAULT = 'after-new-mkdir';
assert.throws(() => executeProjectTransaction({
  sessionId: recoverSid, tx: recoverTx, operation: 'new', target: 'delta', expectedEpoch: 0,
}), /after-new-mkdir/);
delete process.env.LUCA_PROJECT_FAULT;
const interrupted = readProjectState(gstackRoot, recoverSid, projectsRoot).value;
assert.equal(interrupted.selection.pending.status, 'CREATING');
assert.equal(interrupted.selection.pending.phase, 'DIRECTORY_CREATED');
assert.equal(listProjects(projectsRoot).includes('delta'), false, 'non-READY target must not be selectable');
const deltaBefore = statSync(join(projectsRoot, 'delta'));
const recovered = executeProjectTransaction({
  sessionId: recoverSid, tx: recoverTx, operation: 'new', target: 'delta', expectedEpoch: 0,
});
const deltaAfter = statSync(join(projectsRoot, 'delta'));
assert.equal(Number(deltaAfter.ino), Number(deltaBefore.ino), 'recovery must retain the reserved target identity');
assert.equal(recovered.selection.last_success.commit_id, recoverTx);
assert.equal(listProjects(projectsRoot).includes('delta'), true);

const stopInterruptedSid = 'selection-stop-interrupted';
const stopInterruptedTx = 'tx-selection-stop-int-0001';
preparedNewState(stopInterruptedSid, 'delta-stop', stopInterruptedTx);
process.env.LUCA_PROJECT_FAULT = 'after-new-mkdir';
assert.throws(() => executeProjectTransaction({
  sessionId: stopInterruptedSid, tx: stopInterruptedTx,
  operation: 'new', target: 'delta-stop', expectedEpoch: 0,
}), /after-new-mkdir/);
delete process.env.LUCA_PROJECT_FAULT;
const stopInterruptedState = readProjectState(gstackRoot, stopInterruptedSid, projectsRoot).value;
const stopInterruptedEvent = stopInterruptedState.event_control.current;
const stoppedInterrupted = closeAttestedProjectEvent({
  gstackRoot, projectsRoot, sessionId: stopInterruptedSid,
  eventId: stopInterruptedEvent.event_id, boundaryId: stopInterruptedEvent.boundary_id,
});
assert.equal(stoppedInterrupted.selection.latest_operation.status, 'EXPIRED_OR_UNKNOWN');
assert.equal(stoppedInterrupted.selection.latest_operation.created, true);
assert.equal(stoppedInterrupted.selection.latest_operation.phase, 'DIRECTORY_CREATED');
assert.equal(listProjects(projectsRoot).includes('delta-stop'), false);

const manySid = 'selection-many-receipts';
preparedSwitchState(manySid, 'beta', 'tx-selection-many-0001', alpha, 1);
executeProjectTransaction({
  sessionId: manySid, tx: 'tx-selection-many-0001', operation: 'switch', target: 'beta', expectedEpoch: 1,
});
for (let index = 2; index <= 19; index += 1) {
  const next = prepareProjectSwitch({ gstackRoot, projectsRoot, sessionId: manySid,
    operation: 'switch', target: 'beta' }).proposal;
  executeProjectTransaction({ sessionId: manySid, tx: next.tx,
    operation: 'switch', target: 'beta', expectedEpoch: 2 });
}
const manyActive = readProjectState(gstackRoot, manySid, projectsRoot).value;
assert.equal(manyActive.selection.receipts.length, 19,
  'all receipts from the active native event must remain queryable until the event closes');
const manyClosed = closeAttestedProjectEvent({
  gstackRoot, projectsRoot, sessionId: manySid,
  eventId: manyActive.event_control.current.event_id,
  boundaryId: manyActive.event_control.current.boundary_id,
});
assert.equal(manyClosed.selection.receipts.length, 16,
  'closed events may compact older terminal receipts');

const sameSid = 'selection-same-sid-race';
const sameTx = 'tx-selection-same-race-0001';
preparedNewState(sameSid, 'same-sid-race', sameTx);
const sameResults = await Promise.all([
  projectChild('new', 'same-sid-race', sameSid, sameTx, 0),
  projectChild('new', 'same-sid-race', sameSid, sameTx, 0),
]);
assert.equal(sameResults.some(result => result.status === 0), true,
  `same-sid race had no successful owner: ${JSON.stringify(sameResults)}`);
const sameState = readProjectState(gstackRoot, sameSid, projectsRoot).value;
assert.equal(sameState.selection.last_success.commit_id, sameTx);
assert.equal(sameState.selection.commit_sequence, 1);
assert.equal(sameState.selection.receipts.filter(item => item.operation_id === sameTx).length, 1,
  'same tx must have one durable commit receipt despite concurrent invocation');

const crossTarget = 'cross-sid-race';
const crossA = 'selection-cross-race-a';
const crossB = 'selection-cross-race-b';
const crossTxA = 'tx-selection-cross-a-0001';
const crossTxB = 'tx-selection-cross-b-0001';
preparedNewState(crossA, crossTarget, crossTxA);
preparedNewState(crossB, crossTarget, crossTxB);
const crossResults = await Promise.all([
  projectChild('new', crossTarget, crossA, crossTxA, 0),
  projectChild('new', crossTarget, crossB, crossTxB, 0),
]);
assert.equal(crossResults.filter(result => result.status === 0).length, 1,
  `cross-session same-name race must have exactly one winner: ${JSON.stringify(crossResults)}`);
assert.deepEqual(readdirSync(join(projectsRoot, crossTarget)), ['CONTEXT.md']);
assert.equal(readFileSync(join(projectsRoot, crossTarget, 'CONTEXT.md'), 'utf8'), minimalProjectContext(crossTarget));
assert.equal(readdirSync(projectsRoot).includes(projectReservationPath(projectsRoot, crossTarget).split('/').at(-1)), false);
const crossStates = [crossA, crossB].map(item => readProjectState(gstackRoot, item, projectsRoot).value);
assert.deepEqual(crossStates.map(item => item.selection.latest_operation.status).sort(), ['COMMITTED', 'FAILED']);

const unknownSid = 'selection-unknown';
const unknownTx = 'tx-selection-unknown-0001';
preparedNewState(unknownSid, 'epsilon', unknownTx);
process.env.LUCA_PROJECT_FAULT = 'empty-target-race';
assert.throws(() => executeProjectTransaction({
  sessionId: unknownSid, tx: unknownTx, operation: 'new', target: 'epsilon', expectedEpoch: 0,
}), /lost creation race/);
delete process.env.LUCA_PROJECT_FAULT;
assert.equal(listProjects(projectsRoot).includes('epsilon'), false, 'unknown ownership must not become READY');
const unknownState = readProjectState(gstackRoot, unknownSid, projectsRoot).value;
assert.equal(unknownState.selection.pending, null);
assert.equal(unknownState.selection.latest_operation.status, 'OWNERSHIP_UNKNOWN');
assert.throws(() => executeProjectTransaction({
  sessionId: unknownSid, tx: unknownTx, operation: 'new', target: 'epsilon', expectedEpoch: 0,
}), /terminal OWNERSHIP_UNKNOWN/);

const supersedeSid = 'selection-supersede';
const supersededTx = 'tx-selection-superseded-0001';
preparedNewState(supersedeSid, 'zeta', supersededTx);
const replacement = prepareProjectSwitch({
  gstackRoot, projectsRoot, sessionId: supersedeSid, operation: 'switch', target: 'eta',
});
const supersededState = readProjectState(gstackRoot, supersedeSid, projectsRoot).value;
assert.equal(supersededState.selection.receipts.at(-1).status, 'SUPERSEDED');
assert.equal(supersededState.selection.receipts.at(-1).superseded_by, replacement.proposal.tx);
assert.equal(supersededState.selection.pending.tx, replacement.proposal.tx);

const closePendingSid = 'selection-close-pending';
const closePendingTx = 'tx-selection-close-0001';
preparedNewState(closePendingSid, 'theta', closePendingTx);
const pendingEvent = readProjectState(gstackRoot, closePendingSid, projectsRoot).value.event_control.current;
const pendingClosed = closeAttestedProjectEvent({
  gstackRoot, projectsRoot, sessionId: closePendingSid,
  eventId: pendingEvent.event_id, boundaryId: pendingEvent.boundary_id,
});
assert.equal(pendingClosed.selection.pending, null);
assert.equal(pendingClosed.selection.receipts.at(-1).status, 'EXPIRED_OR_UNKNOWN');
assert.equal(pendingClosed.selection.receipts.at(-1).operation_id, closePendingTx);

const writerRoot = join(projectsRoot, 'writer-target');
mkdirSync(writerRoot);
const sharedState = join(gstackRoot, '.claude', 'workflow-state.yaml');
const sharedTopic = join(gstackRoot, '.claude', 'current-topic.txt');
const writer = spawnSync('python3', [join(process.cwd(), '.claude', 'skills', 'office', 'references', 'write_state.py')], {
  cwd: gstackRoot,
  env: { ...process.env, _PROJECT_ROOT: realpathSync(writerRoot), _TOPIC: 'absolute-topic', _SCENE: 'A',
    _NODE: 'idea', _STATUS: 'DONE', _OUTPUT: join(writerRoot, 'docs', 'idea.md') },
  encoding: 'utf8',
});
assert.equal(writer.status, 0, writer.stderr || writer.stdout);
assert.equal(readFileSync(join(writerRoot, '.luca', 'current-topic.txt'), 'utf8'), 'absolute-topic');
assert.match(readFileSync(join(writerRoot, '.luca', 'workflow-state.yaml'), 'utf8'), /idea:/);
assert.equal(readFileSync(join(writerRoot, '.luca', 'workflow-state.yaml'), 'utf8').includes('status: DONE'), true);
assert.equal(readdirSync(join(gstackRoot, '.claude')).includes('workflow-state.yaml'), false,
  'project writer must not create the shared workflow alias');
assert.equal(readdirSync(join(gstackRoot, '.claude')).includes('current-topic.txt'), false,
  'project writer must not create the shared topic alias');

console.log('PASS v3.4 selection sequence/replay, active-event receipt retention, same/cross-session races, Stop phase evidence, minimal create/recovery, unknown-owner refusal, and absolute-root workflow writes');
