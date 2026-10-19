#!/usr/bin/env node
// test-probe-attestation-fields.mjs — fixture checks for scripts/probe-attestation-fields.mjs.
// The probe loads the committed HEAD blob of event-attestation.mjs and asks it to re-validate whole
// histories; these tests only feed it synthetic sessions in a temp dir (never the real machine).
// Cases: GREEN, a dropped `origin` field => RED (UNKNOWN_SCHEMA), too few sessions => INSUFFICIENT,
// the "promptSource vanished" blind spot (passes the module, must NOT count as evidence), Codex root
// thread vs child thread (child is not part of the population, not a failure), read-only behaviour.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, 'probe-attestation-fields.mjs');
const work = realpathSync(mkdtempSync(join(tmpdir(), 'probe-attestation-test-')));
const cwd = join(work, 'repo'); // the fixture "framework root": sessions are matched on it
mkdirSync(cwd, { recursive: true });

const jsonl = (rows) => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
const now = () => new Date().toISOString();

// ---- Claude fixtures -------------------------------------------------------------------------
function claudeSession(dir, { humanRows = 3, dropOrigin = false, dropPromptSource = false } = {}) {
  mkdirSync(dir, { recursive: true });
  const session = randomUUID();
  const rows = [{
    parentUuid: null, isSidechain: false, type: 'system', subtype: 'informational', content: 'fixture start',
    timestamp: now(), uuid: randomUUID(), level: 'info', userType: 'external', entrypoint: 'cli', cwd, sessionId: session,
  }];
  for (let i = 0; i < humanRows; i++) {
    const row = {
      parentUuid: randomUUID(), isSidechain: false, promptId: randomUUID(), type: 'user',
      message: { role: 'user', content: `fixture prompt ${i}` }, uuid: randomUUID(), timestamp: now(),
      permissionMode: 'default', userType: 'external', entrypoint: 'cli', cwd, sessionId: session, version: 'fixture',
      origin: { kind: 'human' }, promptSource: 'typed',
    };
    if (dropOrigin) delete row.origin;
    if (dropPromptSource) delete row.promptSource;
    rows.push(row);
  }
  writeFileSync(join(dir, `${session}.jsonl`), jsonl(rows));
  return session;
}

// ---- Codex fixtures (shape taken from test-prompt-attestation.mjs: one source + anchor pair per turn) ----
function codexSession(home, { parent = null } = {}) {
  const session = randomUUID();
  const boundary = `boundary-${randomUUID()}`;
  const dir = join(home, 'sessions', '2026', '09', '08');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `rollout-2026-09-08T00-00-00-${session}.jsonl`), jsonl([
    { type: 'session_meta', payload: { id: session, session_id: session, cwd, source: 'cli', thread_source: 'user',
      originator: 'codex-tui', parent_thread_id: parent, forked_from_id: null, cli_version: 'fixture' } },
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: 'fixture prompt' }], internal_chat_message_metadata_passthrough: { turn_id: boundary } } },
    { type: 'turn_context', payload: { turn_id: boundary } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: session, turn_id: boundary,
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: 'fixture prompt' }] } } },
  ]));
  return session;
}

const run = (...argv) => {
  const r = spawnSync(process.execPath, [probe, '--framework-root', cwd, '--allow-test-source-root', '--json', ...argv],
    { encoding: 'utf8', timeout: 120_000 });
  let report = null;
  try { report = JSON.parse(r.stdout); } catch { /* asserted below */ }
  return { code: r.status, report, err: r.stderr };
};
const snapshot = (dir) => { const acc = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else acc.push(`${p}:${statSync(p).size}`); } };
  walk(dir); return acc.sort().join('\n'); };
const none = join(work, 'absent'); // a root that does not exist: that harness contributes nothing

try {
  // 1. GREEN: three evidence-bearing Claude sessions
  const g = join(work, 'claude-green');
  for (let i = 0; i < 3; i++) claudeSession(g);
  const before = snapshot(work);
  const green = run('--claude-root', g, '--codex-home', none);
  assert.ok(green.report, `probe printed JSON: ${green.err}`);
  assert.equal(green.report.verdict, 'GREEN');
  assert.equal(green.code, 0);
  assert.equal(green.report.ok, 3);
  assert.deepEqual(green.report.errors, {});
  assert.match(green.report.module, /^HEAD blob [0-9a-f]{40}$/, 'default module is the committed HEAD blob');
  assert.equal(snapshot(work), before, 'probe must be read-only');

  // 2. RED: the host stops writing `origin` while still writing promptSource -> the module's own check fails
  const r = join(work, 'claude-red');
  claudeSession(r); claudeSession(r); claudeSession(r); claudeSession(r, { dropOrigin: true });
  const red = run('--claude-root', r, '--codex-home', none);
  assert.equal(red.report.verdict, 'RED');
  assert.equal(red.code, 1);
  assert.equal(red.report.errors.UNKNOWN_SCHEMA, 1, 'dropped origin must surface as UNKNOWN_SCHEMA');
  assert.equal(red.report.ok, 3, 'the healthy sessions still pass; one bad session is enough for RED');

  // 3. INSUFFICIENT: only two usable sessions
  const s = join(work, 'claude-few');
  claudeSession(s); claudeSession(s);
  const few = run('--claude-root', s, '--codex-home', none);
  assert.equal(few.report.verdict, 'INSUFFICIENT');
  assert.equal(few.code, 3);
  assert.equal(few.report.ok, 2);

  // 4. Blind spot: promptSource vanished => every human row looks like a slash command and the module
  //    skips it, so the call "passes". That must NOT count as evidence.
  const b = join(work, 'claude-blind');
  for (let i = 0; i < 4; i++) claudeSession(b, { dropPromptSource: true });
  const blind = run('--claude-root', b, '--codex-home', none);
  assert.equal(blind.report.verdict, 'INSUFFICIENT', 'passing without validated rows is not GREEN');
  assert.equal(blind.report.ok, 0);
  assert.equal(blind.report.no_evidence, 4);

  // 5. Codex: three root threads pass; a child thread is outside the population (skipped, not a failure)
  const home = join(work, 'codex-home');
  for (let i = 0; i < 3; i++) codexSession(home);
  codexSession(home, { parent: randomUUID() });
  const codex = run('--claude-root', none, '--codex-home', home);
  assert.equal(codex.report.verdict, 'GREEN', JSON.stringify(codex.report));
  assert.equal(codex.report.ok, 3);
  assert.equal(codex.report.skipped_non_root, 1, 'child threads are not attestable by design and must not turn the probe red');
  assert.deepEqual(codex.report.errors, {});
  assert.ok(codex.report.by_shape['codex cli/codex-tui'], 'sessions are grouped by shape');

  // 6. Sessions whose cwd is elsewhere are never touched
  const other = join(work, 'claude-other');
  claudeSession(other);
  const away = run('--claude-root', other, '--codex-home', none, '--framework-root', join(work, 'somewhere-else'));
  assert.equal(away.report.skipped_other_cwd, 1);
  assert.equal(away.report.ok, 0);

  // 7. Unknown arguments fail fast
  assert.equal(spawnSync(process.execPath, [probe, '--nope'], { encoding: 'utf8' }).status, 2);

  console.log('PASS attestation probe: GREEN, dropped origin => RED, too few => INSUFFICIENT, no-evidence blind spot, Codex root vs child, read-only');
} finally {
  rmSync(work, { recursive: true, force: true });
}
