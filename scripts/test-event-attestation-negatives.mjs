#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAX_NATIVE_PROMPT_BYTES,
  NativeEventAttestationError,
  attestNativeUserEvent,
  captureNativeEventFence,
} from '../.claude/hooks/lib/event-attestation.mjs';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'event-attestation-negatives-')));
const cwd = '/workspace/luca-gstack';
let failed = false;
const bootstrapFences = new Map();

function promptIntegrity(prompt) {
  const bytes = Buffer.from(prompt, 'utf8');
  return {
    encoding: 'utf-8',
    bytes_base64: bytes.toString('base64'),
    byte_length: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function candidate(options = {}) {
  const session = options.session || randomUUID();
  const harness = options.harness || 'codex';
  const boundary = options.boundary
    || (harness === 'claude' ? session : `boundary-${randomUUID()}`);
  if (harness === 'claude' && !bootstrapFences.has(session)) {
    bootstrapFences.set(session, captureNativeEventFence({
      sessionId: session, harness, cwd, transcriptPath: join(root, `${session}.jsonl`),
      allowTestSourceRoot: true,
    }));
  }
  const prompt = options.prompt || '继续 E3 事件身份校验';
  return {
    schema_version: 1,
    session_id: session,
    boundary_id: boundary,
    cwd,
    harness,
    prompt_integrity: promptIntegrity(prompt),
  };
}

function promptText(nativeCandidate) {
  return Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
}

function attestTestEvent(options) {
  return attestNativeUserEvent({
    bootstrapFence: bootstrapFences.get(options.candidate.session_id),
    cursor: bootstrapFences.get(options.candidate.session_id)?.cursor,
    ...options, allowTestSourceRoot: true,
  });
}

function sessionMeta(session, overrides = {}) {
  return {
    type: 'session_meta',
    timestamp: '2026-09-08T00:00:00.000Z',
    payload: {
      id: session,
      session_id: session,
      cwd,
      thread_source: 'user',
      originator: 'codex-tui',
      parent_thread_id: null,
      forked_from_id: null,
      ...overrides,
    },
  };
}

function sourceRecord({ prompt, boundary, id = `msg_${randomUUID()}` }) {
  return {
    type: 'response_item',
    timestamp: '2026-09-08T00:00:01.000Z',
    payload: {
      type: 'message',
      role: 'user',
      id,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: boundary },
    },
  };
}

function anchorRecord({ prompt, boundary, session, id = randomUUID() }) {
  return {
    type: 'event_msg',
    timestamp: '2026-09-08T00:00:01.001Z',
    payload: {
      type: 'item_completed',
      thread_id: session,
      turn_id: boundary,
      item: {
        type: 'UserMessage',
        id,
        content: [{ type: 'text', text: prompt }],
      },
    },
  };
}

function inertRecord(ordinal) {
  return {
    type: 'event_msg',
    timestamp: `2026-09-08T00:00:01.00${ordinal}Z`,
    payload: { type: 'token_count', info: { total_token_usage: ordinal } },
  };
}

function claudeUserRecord(nativeCandidate, overrides = {}) {
  return {
    type: 'user',
    sessionId: nativeCandidate.session_id,
    uuid: randomUUID(),
    cwd,
    userType: 'external',
    isSidechain: false,
    isMeta: false,
    origin: { kind: 'human' },
    promptSource: 'typed',
    message: { role: 'user', content: promptText(nativeCandidate) },
    ...overrides,
  };
}

function codexFixture(name, nativeCandidate, records) {
  const codexHome = join(root, name, 'codex-home');
  const rolloutDir = join(codexHome, 'sessions', '2026', '09', '08');
  mkdirSync(rolloutDir, { recursive: true });
  const rollout = join(
    rolloutDir,
    `rollout-2026-09-08T00-00-00-${nativeCandidate.session_id}.jsonl`,
  );
  bootstrapFences.set(nativeCandidate.session_id, captureNativeEventFence({
    sessionId: nativeCandidate.session_id, harness: 'codex', cwd, codexHome,
    allowTestSourceRoot: true,
  }));
  writeFileSync(rollout, `${records.map(record => JSON.stringify(record)).join('\n')}\n`);
  return { codexHome, rollout: realpathSync(rollout) };
}

function appendFixtureRecords(fixture, records) {
  const prefix = readFileSync(fixture.rollout, 'utf8');
  writeFileSync(
    fixture.rollout,
    `${prefix}${records.map(record => JSON.stringify(record)).join('\n')}\n`,
  );
}

function codexCandidateRecords(nativeCandidate) {
  const prompt = promptText(nativeCandidate);
  return [
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({
      prompt,
      boundary: nativeCandidate.boundary_id,
      session: nativeCandidate.session_id,
    }),
  ];
}

function historicalCodexRecords(session, count = 512) {
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const boundary = `historical-${index}`;
    const prompt = `historical prompt ${index}`;
    records.push(
      sourceRecord({ prompt, boundary }),
      anchorRecord({ prompt, boundary, session }),
    );
  }
  return records;
}

function expectReject(name, expectedCode, operation) {
  try {
    operation();
    throw new assert.AssertionError({
      message: `${name} unexpectedly produced usable event authority`,
    });
  } catch (error) {
    if (!(error instanceof NativeEventAttestationError)) throw error;
    assert.equal(error.code, expectedCode, `${name} returned the wrong typed rejection`);
    console.log(`PASS ${name} rejects with ${expectedCode}`);
  }
}

function run(name, operation) {
  try {
    operation();
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

run('missing source', () => {
  const nativeCandidate = candidate();
  const codexHome = join(root, 'missing-source', 'codex-home');
  mkdirSync(join(codexHome, 'sessions', '2026', '09', '08'), { recursive: true });
  expectReject('missing source', 'SOURCE_NOT_VISIBLE', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome });
  });
});

run('prompt bytes mismatch', () => {
  const nativeCandidate = candidate({ prompt: '预期的原始字节' });
  const actualPrompt = '不同的原始字节';
  const fixture = codexFixture('prompt-mismatch', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt: actualPrompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({
      prompt: actualPrompt,
      boundary: nativeCandidate.boundary_id,
      session: nativeCandidate.session_id,
    }),
  ]);
  expectReject('prompt bytes mismatch', 'MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('boundary mismatch', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('boundary-mismatch', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: 'another-transport-boundary' }),
    anchorRecord({
      prompt,
      boundary: 'another-transport-boundary',
      session: nativeCandidate.session_id,
    }),
  ]);
  expectReject('boundary mismatch', 'MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('wrong session provenance', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('session-mismatch', nativeCandidate, [
    sessionMeta('different-native-session'),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('wrong session provenance', 'SESSION_MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('wrong root provenance', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('root-provenance', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id, { thread_source: 'subagent' }),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('wrong root provenance', 'PROVENANCE_MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('wrong cwd provenance', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('cwd-mismatch', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id, { cwd: '/different/workspace' }),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('wrong cwd provenance', 'CWD_MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('subagent copied source', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('copied-source', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id, { parent_thread_id: 'parent-native-session' }),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('subagent copied source', 'PROVENANCE_MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('intervening native user', () => {
  const session = randomUUID();
  const baseline = candidate({ session, prompt: 'baseline event' });
  const nativeCandidate = candidate({ session });
  const fixture = codexFixture('intervening-user', baseline, [
    sessionMeta(session),
    sourceRecord({ prompt: promptText(baseline), boundary: baseline.boundary_id }),
    anchorRecord({ prompt: promptText(baseline), boundary: baseline.boundary_id, session }),
  ]);
  const first = attestTestEvent({ candidate: baseline, codexHome: fixture.codexHome });
  appendFixtureRecords(fixture, [
    sourceRecord({ prompt: promptText(nativeCandidate), boundary: nativeCandidate.boundary_id }),
    sourceRecord({ prompt: '后续原生用户事件', boundary: `boundary-${randomUUID()}` }),
    anchorRecord({ prompt: '后续原生用户事件', boundary: `boundary-${randomUUID()}`, session }),
  ]);
  expectReject('intervening native user', 'INTERVENING_USER', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      cursor: first.cursor_after,
      codexHome: fixture.codexHome,
    });
  });
});

run('missing or over-distance anchor', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('anchor-too-far', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    { type: 'turn_context', payload: { turn_id: nativeCandidate.boundary_id } },
    inertRecord(2),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('missing or over-distance anchor', 'BROKEN_LEG', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('reversed source and anchor ordering', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('reversed-order', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
  ]);
  expectReject('reversed source and anchor ordering', 'BROKEN_LEG', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('unknown distance-2 middle schema', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('unknown-middle', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    inertRecord(1),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('unknown distance-2 middle schema', 'UNKNOWN_SCHEMA', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('anchor text mismatch', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('anchor-text-mismatch', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt: `${prompt}-different`, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  expectReject('anchor text mismatch', 'MISMATCH', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('next native user ordering mismatch', () => {
  const session = randomUUID();
  const baseline = candidate({ session, prompt: 'baseline event' });
  const nativeCandidate = candidate({ session });
  const earlierBoundary = `boundary-${randomUUID()}`;
  const fixture = codexFixture('next-user-mismatch', baseline, [
    sessionMeta(session),
    sourceRecord({ prompt: promptText(baseline), boundary: baseline.boundary_id }),
    anchorRecord({ prompt: promptText(baseline), boundary: baseline.boundary_id, session }),
  ]);
  const first = attestTestEvent({ candidate: baseline, codexHome: fixture.codexHome });
  appendFixtureRecords(fixture, [
    sourceRecord({ prompt: 'earlier unconsumed user event', boundary: earlierBoundary }),
    anchorRecord({ prompt: 'earlier unconsumed user event', boundary: earlierBoundary, session }),
    sourceRecord({ prompt: promptText(nativeCandidate), boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt: promptText(nativeCandidate), boundary: nativeCandidate.boundary_id, session }),
  ]);
  expectReject('next native user ordering mismatch', 'MISMATCH', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      cursor: first.cursor_after,
      codexHome: fixture.codexHome,
    });
  });
});

for (const [label, invalidId] of [
  ['missing', null],
  ['non-msg prefix', `native-${randomUUID()}`],
]) {
  run(`Codex cursor rejects ${label} native user id`, () => {
    const session = randomUUID();
    const firstCandidate = candidate({ session, prompt: 'first cursor event' });
    const invalidCandidate = candidate({ session, prompt: 'invalid id event' });
    const fixture = codexFixture(`invalid-source-id-${label.replaceAll(' ', '-')}`, firstCandidate, [
      sessionMeta(session),
      sourceRecord({
        prompt: promptText(firstCandidate),
        boundary: firstCandidate.boundary_id,
      }),
      anchorRecord({
        prompt: promptText(firstCandidate),
        boundary: firstCandidate.boundary_id,
        session,
      }),
    ]);
    const first = attestTestEvent({
      candidate: firstCandidate,
      codexHome: fixture.codexHome,
    });
    appendFixtureRecords(fixture, [
      sourceRecord({
        prompt: promptText(invalidCandidate),
        boundary: invalidCandidate.boundary_id,
        id: invalidId,
      }),
      anchorRecord({
        prompt: promptText(invalidCandidate),
        boundary: invalidCandidate.boundary_id,
        session,
      }),
    ]);
    expectReject(`Codex cursor ${label} native user id`, 'UNKNOWN_SCHEMA', () => {
      attestTestEvent({
        candidate: invalidCandidate,
        cursor: first.cursor_after,
        codexHome: fixture.codexHome,
      });
    });
  });
}

run('Codex ignores caller-supplied transcript override', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const codexHome = join(root, 'codex-override', 'codex-home');
  mkdirSync(join(codexHome, 'sessions', '2026', '09', '08'), { recursive: true });
  const attackerTranscript = join(root, 'attacker-controlled.jsonl');
  writeFileSync(attackerTranscript, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ].map(record => JSON.stringify(record)).join('\n') + '\n');
  expectReject('Codex caller-supplied transcript override', 'SOURCE_NOT_VISIBLE', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      codexHome,
      transcriptPath: realpathSync(attackerTranscript),
    });
  });
});

run('symlinked Claude source', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const realTranscript = join(root, 'claude-real-source.jsonl');
  const linkedTranscript = join(root, `${nativeCandidate.session_id}.jsonl`);
  writeFileSync(realTranscript, '{}\n');
  symlinkSync(realTranscript, linkedTranscript);
  expectReject('symlinked Claude source', 'SYMLINK_SOURCE', () => {
    attestTestEvent({ candidate: nativeCandidate, transcriptPath: linkedTranscript });
  });
});

run('Claude conflicting session fields', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
  writeFileSync(transcript, `${JSON.stringify(claudeUserRecord(nativeCandidate, {
    session_id: `different-${randomUUID()}`,
  }))}\n`);
  expectReject('Claude conflicting session fields', 'UNKNOWN_SCHEMA', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      transcriptPath: realpathSync(transcript),
    });
  });
});

for (const [label, overrides, expectedCode] of [
  ['non-boolean sidechain', { isSidechain: 'false' }, 'UNKNOWN_SCHEMA'],
  ['true sidechain', { isSidechain: true }, 'PROVENANCE_MISMATCH'],
  ['empty userType', { userType: '' }, 'PROVENANCE_MISMATCH'],
  ['non-external userType', { userType: 'internal' }, 'PROVENANCE_MISMATCH'],
  ['non-canonical uuid', { uuid: `user-${randomUUID()}` }, 'UNKNOWN_SCHEMA'],
]) {
  run(`Claude ${label}`, () => {
    const nativeCandidate = candidate({ harness: 'claude' });
    const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
    writeFileSync(transcript, `${JSON.stringify(claudeUserRecord(nativeCandidate, overrides))}\n`);
    expectReject(`Claude ${label}`, expectedCode, () => {
      attestTestEvent({
        candidate: nativeCandidate,
        transcriptPath: realpathSync(transcript),
      });
    });
  });
}

run('Claude candidate boundary must equal session', () => {
  const session = randomUUID();
  const nativeCandidate = candidate({
    session,
    boundary: `different-${randomUUID()}`,
    harness: 'claude',
  });
  const transcript = join(root, `${session}.jsonl`);
  writeFileSync(transcript, `${JSON.stringify(claudeUserRecord(nativeCandidate))}\n`);
  expectReject('Claude candidate boundary mismatch', 'CANDIDATE_SCHEMA', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      transcriptPath: realpathSync(transcript),
    });
  });
});

run('Claude meta row cannot impersonate or mask the native human event', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
  writeFileSync(transcript, [
    claudeUserRecord(nativeCandidate, {
      uuid: randomUUID(), isMeta: true, origin: null, promptSource: null,
    }),
    claudeUserRecord(nativeCandidate, { promptSource: 'queued' }),
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  const attested = attestTestEvent({
    candidate: nativeCandidate,
    transcriptPath: realpathSync(transcript),
  });
  assert.ok(attested.event_id.startsWith('claude:'));
  console.log('PASS Claude isMeta row is skipped and queued human provenance is attested');
});

run('Claude unknown user-like row after cursor', () => {
  const session = randomUUID();
  const firstCandidate = candidate({ session, harness: 'claude', prompt: 'first known human' });
  const secondCandidate = candidate({ session, harness: 'claude', prompt: 'second known human' });
  const transcript = join(root, `${session}.jsonl`);
  writeFileSync(transcript, `${JSON.stringify(claudeUserRecord(firstCandidate))}\n`);
  const first = attestTestEvent({ candidate: firstCandidate, transcriptPath: realpathSync(transcript) });
  writeFileSync(transcript, [
    readFileSync(transcript, 'utf8').trimEnd(),
    // An origin-less, promptSource-less row is local command echo (<bash-input>,
    // <command-name>, <local-command-stdout>) and is legitimately skippable. The
    // shape that must still fail closed is one carrying positive evidence of a
    // provenance we do not understand — e.g. a future human-bearing origin kind.
    JSON.stringify(claudeUserRecord(secondCandidate, { origin: { kind: 'future-human-kind' } })),
    JSON.stringify(claudeUserRecord(secondCandidate)),
  ].join('\n') + '\n');
  expectReject('Claude unknown user-like row after cursor', 'UNKNOWN_SCHEMA', () => {
    attestTestEvent({
      candidate: secondCandidate,
      cursor: first.cursor_after,
      transcriptPath: realpathSync(transcript),
    });
  });
});

run('Claude Stop skips thinking and tool-use assistant rows before visible text', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
  writeFileSync(transcript, [
    claudeUserRecord(nativeCandidate),
    { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'redacted' }] } },
    { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }] } },
    { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: [{ type: 'text', text: 'final visible response' }] } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  const attested = attestTestEvent({
    candidate: nativeCandidate,
    transcriptPath: realpathSync(transcript),
    observation: 'stop',
    assistantText: 'final visible response',
  });
  assert.ok(attested.stop_witness_id);
  console.log('PASS Claude Stop skips known non-visible assistant rows and attests final text');
});

run('Claude Stop unknown assistant part fails closed', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
  writeFileSync(transcript, [
    claudeUserRecord(nativeCandidate),
    { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: [{ type: 'future_unknown_part', value: 'x' }] } },
    { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: [{ type: 'text', text: 'final visible response' }] } },
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  expectReject('Claude Stop unknown assistant part', 'UNKNOWN_SCHEMA', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      transcriptPath: realpathSync(transcript),
      observation: 'stop',
      assistantText: 'final visible response',
    });
  });
});

for (const harness of ['codex', 'claude']) {
  for (const historical of [true, false]) {
    const label = `${harness} Stop ${historical ? 'pre-fence history' : 'duplicate current response'}`;
    run(label, () => {
      const current = candidate({ harness });
      const response = () => harness === 'codex'
        ? { type: 'response_item', payload: { type: 'message', role: 'assistant',
          id: `msg_${randomUUID()}`, content: [{ type: 'output_text', text: 'done' }] } }
        : { type: 'assistant', uuid: randomUUID(), message: { role: 'assistant', content: 'done' } };
      let options;
      let path;
      if (harness === 'codex') {
        const fixture = codexFixture(label.replaceAll(' ', '-'), current,
          [sessionMeta(current.session_id), ...(historical ? [...codexCandidateRecords(current), response()] : [])]);
        path = fixture.rollout;
        options = { codexHome: fixture.codexHome };
      } else {
        path = join(root, `${current.session_id}.jsonl`);
        writeFileSync(path, historical ? [claudeUserRecord(current), response()].map(JSON.stringify).join('\n') + '\n' : '');
        options = { transcriptPath: path };
      }
      const fence = captureNativeEventFence({ sessionId: current.session_id, harness, cwd,
        ...options, allowTestSourceRoot: true });
      const rows = harness === 'codex' ? codexCandidateRecords(current) : [claudeUserRecord(current)];
      rows.push(response());
      if (!historical) rows.push(response());
      writeFileSync(path, readFileSync(path, 'utf8') + rows.map(JSON.stringify).join('\n') + '\n');
      expectReject(label, 'STOP_WITNESS_AMBIGUOUS', () => attestTestEvent({ candidate: current,
        ...options, cursor: fence.cursor, bootstrapFence: fence, observation: 'stop', assistantText: 'done' }));
    });
  }
}

run('cursor replay', () => {
  const nativeCandidate = candidate();
  const prompt = Buffer.from(nativeCandidate.prompt_integrity.bytes_base64, 'base64').toString('utf8');
  const fixture = codexFixture('cursor-replay', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    sourceRecord({ prompt, boundary: nativeCandidate.boundary_id }),
    anchorRecord({ prompt, boundary: nativeCandidate.boundary_id, session: nativeCandidate.session_id }),
  ]);
  const first = attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  assert.ok(first.event_id.startsWith('codex:'), 'first attestation must produce native event identity');
  assert.match(first.cursor_after.dev, /^\d+$/, 'cursor device id must be lossless decimal text');
  assert.match(first.cursor_after.ino, /^\d+$/, 'cursor inode must be lossless decimal text');
  assert.match(first.cursor_after.prefix_sha256, /^[0-9a-f]{64}$/, 'cursor must attest its consumed prefix');
  expectReject('cursor replay', 'EVENT_REPLAY', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      cursor: first.cursor_after,
      codexHome: fixture.codexHome,
    });
  });
});

run('Codex startup fence excludes historical multimodal content from current parsing', () => {
  const current = candidate();
  const old = sourceRecord({ prompt: 'historical image', boundary: 'old-boundary' });
  old.payload.content.push({ type: 'input_image', image_url: 'data:image/png;base64,AA==' });
  const fixture = codexFixture('old-image-before-fence', current, [sessionMeta(current.session_id), old]);
  const fence = captureNativeEventFence({ sessionId: current.session_id, harness: 'codex', cwd,
    codexHome: fixture.codexHome, allowTestSourceRoot: true });
  const records = codexCandidateRecords(current);
  appendFixtureRecords(fixture, records);
  const result = attestTestEvent({ candidate: current, codexHome: fixture.codexHome,
    cursor: fence.cursor, bootstrapFence: fence });
  assert.equal(result.native_id, records[0].payload.id);
  console.log('PASS Codex startup fence excludes historical multimodal content from current parsing');
});

run('Claude startup fence excludes historical cwd from current event provenance', () => {
  const current = candidate({ harness: 'claude' });
  const transcriptPath = join(root, `${current.session_id}.jsonl`);
  writeFileSync(transcriptPath, JSON.stringify(claudeUserRecord(current, { cwd: '/old-workspace' })) + '\n');
  const fence = captureNativeEventFence({ sessionId: current.session_id, harness: 'claude', cwd,
    transcriptPath, allowTestSourceRoot: true });
  const native = claudeUserRecord(current);
  writeFileSync(transcriptPath, readFileSync(transcriptPath, 'utf8') + JSON.stringify(native) + '\n');
  const result = attestTestEvent({ candidate: current, transcriptPath, cursor: fence.cursor, bootstrapFence: fence });
  assert.equal(result.native_id, native.uuid);
  console.log('PASS Claude startup fence excludes historical cwd from current event provenance');
});

run('pre-input fence attests new events after long history', () => {
  const session = randomUUID();
  const firstCandidate = candidate({ session, prompt: 'bootstrap tail first' });
  const secondCandidate = candidate({ session, prompt: 'bootstrap tail second' });
  const fixture = codexFixture('long-bootstrap-tail', firstCandidate, [
    sessionMeta(session),
    ...historicalCodexRecords(session),
  ]);
  bootstrapFences.set(session, captureNativeEventFence({
    sessionId: session, harness: 'codex', cwd, codexHome: fixture.codexHome,
    allowTestSourceRoot: true,
  }));
  appendFixtureRecords(fixture, [
    ...codexCandidateRecords(firstCandidate),
    ...codexCandidateRecords(secondCandidate),
  ]);
  const attested = attestTestEvent({
    candidate: firstCandidate,
    codexHome: fixture.codexHome,
    requireNoFollowingUser: false,
  });
  assert.equal(attested.boundary_id, firstCandidate.boundary_id);
  assert.ok(attested.event_id.startsWith('codex:'));
  console.log('PASS pre-input fence attests the first new event after long history');
});

for (const harness of ['codex', 'claude']) {
  run(`${harness} unfenced same-text historical tail`, () => {
    const nativeCandidate = candidate({ harness, prompt: 'repeated historical user text' });
    const options = harness === 'codex'
      ? { codexHome: codexFixture('unfenced-history', nativeCandidate, [
        sessionMeta(nativeCandidate.session_id), ...codexCandidateRecords(nativeCandidate),
      ]).codexHome }
      : { transcriptPath: join(root, `${nativeCandidate.session_id}.jsonl`) };
    if (harness === 'claude') writeFileSync(options.transcriptPath, `${JSON.stringify(claudeUserRecord(nativeCandidate))}\n`);
    expectReject(`${harness} unfenced same-text historical tail`, 'BOOTSTRAP_UNATTESTED', () => {
      attestTestEvent({ candidate: nativeCandidate, ...options, bootstrapFence: null });
    });
  });
}

for (const [label, tailOrder] of [
  ['non-tail sequence', 'trailing-user'],
  ['wrong candidate order', 'reversed'],
]) {
  run(`bootstrap rejects ${label}`, () => {
    const session = randomUUID();
    const firstCandidate = candidate({ session, prompt: 'bootstrap ordered first' });
    const secondCandidate = candidate({ session, prompt: 'bootstrap ordered second' });
    const trailingCandidate = candidate({ session, prompt: 'unqueued trailing native user' });
    const tail = tailOrder === 'reversed'
      ? [secondCandidate, firstCandidate]
      : [firstCandidate, secondCandidate, trailingCandidate];
    const fixture = codexFixture(`bootstrap-${tailOrder}`, firstCandidate, [
      sessionMeta(session),
      ...historicalCodexRecords(session),
    ]);
    bootstrapFences.set(session, captureNativeEventFence({
      sessionId: session, harness: 'codex', cwd, codexHome: fixture.codexHome,
      allowTestSourceRoot: true,
    }));
    appendFixtureRecords(fixture, tail.flatMap(codexCandidateRecords));
    expectReject(`bootstrap ${label}`, tailOrder === 'reversed' ? 'MISMATCH' : 'INTERVENING_USER', () => {
      attestTestEvent({
        candidate: firstCandidate,
        codexHome: fixture.codexHome,
      });
    });
  });
}

run('cursor prefix rewrite with unchanged length', () => {
  const session = randomUUID();
  const firstCandidate = candidate({ session, prompt: 'prefix first event' });
  const secondCandidate = candidate({ session, prompt: 'prefix second event' });
  const fixture = codexFixture('cursor-prefix-rewrite', firstCandidate, [
    sessionMeta(session),
    ...codexCandidateRecords(firstCandidate),
  ]);
  const first = attestTestEvent({ candidate: firstCandidate, codexHome: fixture.codexHome });
  appendFixtureRecords(fixture, codexCandidateRecords(secondCandidate));
  const original = readFileSync(fixture.rollout, 'utf8');
  const rewritten = original.replace('codex-tui', 'codex-xui');
  assert.notEqual(rewritten, original, 'fixture mutation must alter the consumed prefix');
  assert.equal(Buffer.byteLength(rewritten), Buffer.byteLength(original), 'fixture mutation must preserve source length');
  writeFileSync(fixture.rollout, rewritten);
  expectReject('same-length cursor prefix rewrite', 'CURSOR_MISMATCH', () => {
    attestTestEvent({
      candidate: secondCandidate,
      cursor: first.cursor_after,
      codexHome: fixture.codexHome,
    });
  });
});

run('oversized native prompt', () => {
  const nativeCandidate = candidate({ prompt: 'x'.repeat(MAX_NATIVE_PROMPT_BYTES + 1) });
  const fixture = codexFixture('oversized-prompt', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    ...codexCandidateRecords(nativeCandidate),
  ]);
  expectReject('oversized native prompt', 'SOURCE_LIMIT', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('oversized native source', () => {
  const nativeCandidate = candidate();
  const fixture = codexFixture('oversized-source', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    ...codexCandidateRecords(nativeCandidate),
  ]);
  truncateSync(fixture.rollout, 64 * 1024 * 1024 + 1);
  expectReject('oversized native source', 'SOURCE_LIMIT', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('trailing partial JSONL record', () => {
  const nativeCandidate = candidate();
  const fixture = codexFixture('trailing-partial', nativeCandidate, [
    sessionMeta(nativeCandidate.session_id),
    ...codexCandidateRecords(nativeCandidate),
  ]);
  writeFileSync(fixture.rollout, `${readFileSync(fixture.rollout, 'utf8')}{"type":"response_item"`);
  expectReject('trailing partial JSONL record', 'UNKNOWN_SCHEMA', () => {
    attestTestEvent({ candidate: nativeCandidate, codexHome: fixture.codexHome });
  });
});

run('Claude static compatibility fixture', () => {
  const nativeCandidate = candidate({ harness: 'claude' });
  const transcript = join(root, `${nativeCandidate.session_id}.jsonl`);
  const nativeId = randomUUID();
  writeFileSync(transcript, `${JSON.stringify({
    type: 'user',
    sessionId: nativeCandidate.session_id,
    uuid: nativeId,
    cwd,
    userType: 'external',
    isSidechain: false,
    isMeta: false,
    origin: { kind: 'human' },
    promptSource: 'typed',
    message: { role: 'user', content: '继续 E3 事件身份校验' },
  })}\n`);
  const attested = attestTestEvent({
    candidate: nativeCandidate,
    transcriptPath: realpathSync(transcript),
  });
  assert.ok(attested.event_id.startsWith('claude:'));
  assert.equal(attested.native_id, nativeId);
  assert.equal(attested.boundary_id, nativeCandidate.boundary_id);
  expectReject('Claude static replay', 'EVENT_REPLAY', () => {
    attestTestEvent({
      candidate: nativeCandidate,
      cursor: attested.cursor_after,
      transcriptPath: realpathSync(transcript),
    });
  });
  console.log('PASS Claude historical-schema fixture attests without invoking Claude CLI');
});

run('Claude known tool-result rows do not impersonate native user events', () => {
  const session = randomUUID();
  const firstCandidate = candidate({ session, harness: 'claude', prompt: 'first native prompt' });
  const secondCandidate = candidate({ session, harness: 'claude', prompt: 'second native prompt' });
  const transcript = join(root, `${session}.jsonl`);
  const humanRow = (prompt) => ({
    type: 'user',
    session_id: session,
    uuid: randomUUID(),
    cwd,
    userType: 'external',
    isSidechain: false,
    isMeta: false,
    origin: { kind: 'human' },
    promptSource: 'typed',
    message: { role: 'user', content: prompt },
  });
  writeFileSync(transcript, [
    humanRow('first native prompt'),
    { type: 'assistant', session_id: session, uuid: randomUUID(), message: { role: 'assistant', content: 'ok' } },
    {
      type: 'user',
      session_id: session,
      uuid: randomUUID(),
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'ok' }] },
      tool_use_result: 'ok',
    },
    humanRow('second native prompt'),
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  const first = attestTestEvent({
    candidate: firstCandidate,
    transcriptPath: realpathSync(transcript),
    requireNoFollowingUser: false,
  });
  const second = attestTestEvent({
    candidate: secondCandidate,
    cursor: first.cursor_after,
    transcriptPath: realpathSync(transcript),
  });
  assert.ok(second.event_id.startsWith('claude:'));
  assert.notEqual(second.event_id, first.event_id);
  console.log('PASS Claude static parser skips known tool-result rows between native prompts');
});

rmSync(root, { recursive: true, force: true });
if (failed) process.exitCode = 1;
