#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  attestPendingProjectEvent,
  initializeProjectEventFence,
  canonicalProjectIdentity,
  closeAttestedProjectEvent,
  queueProjectEventCandidate,
} from '../.claude/hooks/lib/project-substrate.mjs';

process.env.LUCA_EVENT_ATTESTATION_TEST = '1';

let failures = 0;

function check(name, operation) {
  try {
    operation();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function promptIntegrity(prompt) {
  const bytes = Buffer.from(prompt, 'utf8');
  return {
    encoding: 'utf-8',
    bytes_base64: bytes.toString('base64'),
    byte_length: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function makeFixture(label) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), `e3-event-tx-${label}-`)));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  const projectRoot = join(projects, 'alpha');
  const codexHome = join(root, 'codex-home');
  const session = randomUUID();
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(join(projectRoot, 'docs'), { recursive: true });
  mkdirSync(join(projectRoot, '.luca'), { recursive: true });
  mkdirSync(join(codexHome, 'sessions', '2026', '09', '08'), { recursive: true });
  const binding = { ...canonicalProjectIdentity('alpha', projects), epoch: 1 };
  const priorBoundary = `prior-${randomUUID()}`;
  const state = {
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: session,
    binding,
    turn: { turn_id: priorBoundary, epoch: 1 },
  };
  const statePath = join(gstack, '.claude', `.session-project-${session}`);
  writeFileSync(statePath, `${JSON.stringify(state)}\n`);
  initializeProjectEventFence({
    gstackRoot: gstack, projectsRoot: projects, sessionId: session,
    harness: 'codex', cwd: gstack, codexHome,
  });
  return { root, gstack, projects, codexHome, session, statePath };
}

function queue(fx, prompt, boundary = `boundary-${randomUUID()}`) {
  queueProjectEventCandidate({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: fx.session,
    boundaryId: boundary,
    cwd: fx.gstack,
    harness: 'codex',
    prompt,
    intent: { kind: 'turn' },
  });
  return { prompt, boundary };
}

function rolloutPath(fx) {
  return join(
    fx.codexHome,
    'sessions',
    '2026',
    '09',
    '08',
    `rollout-2026-09-08T00-00-00-${fx.session}.jsonl`,
  );
}

function sourceRecord(fx, event) {
  return {
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'user',
      id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: event.prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: event.boundary },
    },
  };
}

function anchorRecord(fx, event) {
  return {
    type: 'event_msg',
    payload: {
      type: 'item_completed',
      thread_id: fx.session,
      turn_id: event.boundary,
      item: {
        type: 'UserMessage',
        id: randomUUID(),
        content: [{ type: 'text', text: event.prompt }],
      },
    },
  };
}

function publishSourceOnly(fx, event) {
  const meta = {
    type: 'session_meta',
    payload: {
      id: fx.session,
      session_id: fx.session,
      cwd: fx.gstack,
      thread_source: 'user',
      originator: 'codex-tui',
      parent_thread_id: null,
      forked_from_id: null,
    },
  };
  writeFileSync(rolloutPath(fx), `${JSON.stringify(meta)}\n${JSON.stringify(sourceRecord(fx, event))}\n`);
}

function appendAnchor(fx, event) {
  appendFileSync(rolloutPath(fx), `${JSON.stringify(anchorRecord(fx, event))}\n`);
}

function appendCompleteEvent(fx, event) {
  appendFileSync(
    rolloutPath(fx),
    `${JSON.stringify(sourceRecord(fx, event))}\n${JSON.stringify(anchorRecord(fx, event))}\n`,
  );
}

function observe(fx, event) {
  return attestPendingProjectEvent({
    gstackRoot: fx.gstack,
    projectsRoot: fx.projects,
    sessionId: fx.session,
    boundaryId: event.boundary,
    cwd: fx.gstack,
    observation: 'pre-tool',
    codexHome: fx.codexHome,
  });
}

function expectCode(code, operation) {
  assert.throws(operation, error => error?.code === code, `expected typed rejection ${code}`);
}

function withEnv(name, value, operation) {
  const before = process.env[name];
  process.env[name] = value;
  try { return operation(); }
  finally {
    if (before === undefined) delete process.env[name];
    else process.env[name] = before;
  }
}

check('unpublished source and broken leg preserve revoked pending state until one successful retry', () => {
  const fx = makeFixture('source-publication');
  try {
    const event = queue(fx, 'source publication retry');
    const queuedBytes = readFileSync(fx.statePath);
    const queued = JSON.parse(queuedBytes);
    assert.equal(queued.state, 'TURN_CLOSED', 'queue must revoke prior TURN_ACTIVE authority');
    assert.equal(queued.event_control.current, null,
      'legacy raw authority must not be promoted into a native current event');
    expectCode('SOURCE_NOT_VISIBLE', () => observe(fx, event));
    assert.deepEqual(readFileSync(fx.statePath), queuedBytes);

    publishSourceOnly(fx, event);
    expectCode('BROKEN_LEG', () => observe(fx, event));
    assert.deepEqual(readFileSync(fx.statePath), queuedBytes);

    appendAnchor(fx, event);
    const committed = observe(fx, event);
    assert.equal(committed.state.state, 'TURN_ACTIVE');
    const eventId = committed.event.event_id;
    assert.equal(committed.state.event_control.consumed_events.filter(item => item.event_id === eventId).length, 1);
    const committedBytes = readFileSync(fx.statePath);
    const repeated = observe(fx, event);
    assert.equal(repeated.idempotent, true);
    assert.deepEqual(readFileSync(fx.statePath), committedBytes);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

for (const fault of [
  ['LUCA_EVENT_TX_FAULT', 'after-attest-before-publish', 'INJECTED_FAULT'],
  ['LUCA_PROJECT_STATE_WRITE_FAULT', 'before-rename', null],
]) {
  check(`${fault[0]} before publication leaves candidate, cursor, and ledger byte-identical`, () => {
    const fx = makeFixture(fault[1]);
    try {
      const event = queue(fx, `precommit ${fault[0]}`);
      publishSourceOnly(fx, event);
      appendAnchor(fx, event);
      const before = readFileSync(fx.statePath);
      assert.throws(() => withEnv(fault[0], fault[1], () => observe(fx, event)), error => (
        fault[2] ? error?.code === fault[2] : /before-rename/.test(String(error?.message || error))
      ));
      assert.deepEqual(readFileSync(fx.statePath), before);
      const retried = observe(fx, event);
      assert.equal(retried.idempotent, false);
      assert.equal(retried.state.event_control.consumed_events.filter(item => item.event_id === retried.event.event_id).length, 1);
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
}

check('post-rename warning is committed once and an identical retry is read-only idempotent', () => {
  const fx = makeFixture('post-rename');
  try {
    const event = queue(fx, 'post rename commit point');
    publishSourceOnly(fx, event);
    appendAnchor(fx, event);
    const committed = withEnv('LUCA_PROJECT_STATE_WRITE_FAULT', 'after-rename', () => observe(fx, event));
    assert.equal(committed.state.state, 'TURN_ACTIVE');
    const after = readFileSync(fx.statePath);
    const repeated = observe(fx, event);
    assert.equal(repeated.idempotent, true);
    assert.deepEqual(readFileSync(fx.statePath), after);
    assert.equal(JSON.parse(after).event_control.consumed_events
      .filter(item => item.event_id === committed.event.event_id).length, 1);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

check('raw boundary, prompt hash, and random UUID cannot stand in for attested native identity', () => {
  const fx = makeFixture('identity-substitutes');
  try {
    const event = queue(fx, 'identity substitutes');
    const before = readFileSync(fx.statePath);
    const alternatives = [
      event.boundary,
      promptIntegrity(event.prompt).sha256,
      randomUUID(),
    ];
    for (const eventId of alternatives) {
      expectCode('EVENT_MISMATCH', () => closeAttestedProjectEvent({
        gstackRoot: fx.gstack,
        projectsRoot: fx.projects,
        sessionId: fx.session,
        eventId,
        boundaryId: event.boundary,
      }));
      assert.deepEqual(readFileSync(fx.statePath), before);
    }
    expectCode('SOURCE_NOT_VISIBLE', () => attestPendingProjectEvent({
      gstackRoot: fx.gstack,
      projectsRoot: fx.projects,
      sessionId: fx.session,
      boundaryId: event.boundary,
      cwd: fx.gstack,
      observation: 'pre-tool',
      codexHome: fx.codexHome,
      attest: () => ({ event_id: alternatives[2] }),
    }));
    assert.deepEqual(readFileSync(fx.statePath), before,
      'caller-supplied attester must be ignored by the production transaction');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

check('a delayed Stop identity cannot close the newer active native event', () => {
  const fx = makeFixture('delayed-stop');
  try {
    const first = queue(fx, 'first event');
    publishSourceOnly(fx, first);
    appendAnchor(fx, first);
    const firstObserved = observe(fx, first);

    const second = queue(fx, 'second event', first.boundary);
    appendCompleteEvent(fx, second);
    const secondObserved = observe(fx, second);
    const before = readFileSync(fx.statePath);
    expectCode('EVENT_MISMATCH', () => closeAttestedProjectEvent({
      gstackRoot: fx.gstack,
      projectsRoot: fx.projects,
      sessionId: fx.session,
      eventId: firstObserved.event.event_id,
      boundaryId: first.boundary,
      outcome: 'delayed-stop',
    }));
    assert.deepEqual(readFileSync(fx.statePath), before);
    assert.equal(JSON.parse(before).event_control.current.event_id, secondObserved.event.event_id);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
});

if (failures) process.exitCode = 1;
