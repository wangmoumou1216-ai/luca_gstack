#!/usr/bin/env node
// All fixtures and mutation copies live in OS temp; never write the real adoption log.
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, statSync,
  readdirSync, symlinkSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = process.env.FEEDBACK_TEST_CLI || fileURLToPath(new URL('./evolution-feedback.mjs', import.meta.url));
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'evolution-feedback-test-')));
const hash = value => createHash('sha256').update(value).digest('hex');
let passed = 0;
function fixture() {
  const root = join(scratch, `case-${readdirSync(scratch).length}`);
  const log = join(root, '.claude/skill-os/evolution/adoption-log.jsonl');
  mkdirSync(dirname(log), { recursive: true });
  const rows = Array.from({ length: 8 }, (_, i) => ({ date: '2026-06-21', fused_candidate_id: `candidate-${i}`,
    target: `original-${i}`, reuse_mode: 'adapt-idea', gates: { check: 'PASS' }, note: `keep-${i}`,
    ...(i === 5 ? {} : { helped: i === 3 ? 'unknown(new)' : i === 4 ? 'n/a' : 'unknown' }) }));
  const original = rows.map((row, i) => `${i === 6 ? '  ' : ''}${JSON.stringify(row)}${i === 7 ? '' : i % 2 ? '\n' : '\r\n'}`).join('');
  writeFileSync(log, original);
  const input = { schema_version: 1, review_id: 'review-2026-09-14', reviewed_at: '2026-09-14',
    reviewed_by: 'human-fixture', approval_reference: 'test fixture: approval recorded in task',
    expected_log_sha256: hash(original), feedback: rows.slice(0, 6).map((row, i) => ({ date: row.date,
      fused_candidate_id: row.fused_candidate_id, helped: ['yes', 'no', 'unknown'][i % 3],
      evidence_kind: i % 3 === 2 ? 'usage' : 'outcome', evidence: `fixture task ${i}: observed result in run-${i}` })) };
  const inputPath = join(root, 'review.json');
  const run = (value = input, apply = true, customScript = script) => {
    writeFileSync(inputPath, JSON.stringify(value));
    return spawnSync(process.execPath, [customScript, '--root', root, '--input', inputPath, ...(apply ? ['--apply'] : [])], { encoding: 'utf8' });
  };
  return { root, log, rows, original, input, inputPath, run, lock: join(dirname(log), '.adoption-feedback.lock') };
}
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function rejected(f, value, pattern) {
  const before = readFileSync(f.log), beforeStat = statSync(f.log);
  const result = f.run(value);
  assert.notEqual(result.status, 0, `${pattern}: unexpectedly accepted\n${result.stdout}`);
  assert.match(result.stderr, pattern);
  assert.deepEqual(readFileSync(f.log), before);
  assert.equal(statSync(f.log).mtimeMs, beforeStat.mtimeMs);
}
try {
  test('dry-run writes no log, lock or temp', () => {
    const f = fixture(), before = statSync(f.log);
    const r = f.run(f.input, false);
    assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).status, 'dry_run');
    assert.equal(readFileSync(f.log, 'utf8'), f.original); assert.equal(statSync(f.log).mtimeMs, before.mtimeMs);
    assert.deepEqual(readdirSync(dirname(f.log)), ['adoption-log.jsonl']);
  });
  test('missing approval/evidence rejected', () => {
    for (const field of ['approval_reference', 'evidence']) {
      const f = fixture(); delete (field === 'evidence' ? f.input.feedback[5] : f.input)[field];
      rejected(f, f.input, /missing/);
    }
    const f = fixture(); f.input.feedback[5].evidence = '  '; rejected(f, f.input, /evidence/);
  });
  test('wrong hash rejected', () => {
    const f = fixture(); f.input.expected_log_sha256 = '0'.repeat(64); rejected(f, f.input, /sha256 mismatch/);
  });
  test('ambiguous and missing identities rejected', () => {
    const f = fixture(); writeFileSync(f.log, `${f.original}\n${JSON.stringify(f.rows[0])}\n`);
    f.input.expected_log_sha256 = hash(readFileSync(f.log)); rejected(f, f.input, /exactly one.*\(2\)/);
    const missing = fixture(); missing.input.feedback[5].fused_candidate_id = 'absent'; rejected(missing, missing.input, /exactly one.*\(0\)/);
  });
  test('unknown top-level and historical fact fields rejected', () => {
    for (const key of ['target', 'reuse_mode', 'landing_status']) {
      const f = fixture(); f.input.feedback[0][key] = 'forbidden'; rejected(f, f.input, /unknown field/);
    }
    const f = fixture(); f.input.extra = true; rejected(f, f.input, /unknown field/);
  });
  test('usage cannot assert yes/no outcomes', () => {
    for (const helped of ['yes', 'no']) {
      const f = fixture(); f.input.feedback[5].helped = helped; rejected(f, f.input, /usage evidence/);
    }
  });
  test('strict schema, calendar date, duplicate identity and empty batch', () => {
    for (const modify of [i => { i.schema_version = 2; }, i => { i.reviewed_at = '2026-02-30'; },
      i => { i.feedback.push(i.feedback[0]); }, i => { i.feedback = []; }]) {
      const f = fixture(); modify(f.input); rejected(f, f.input, /schema_version|YYYY-MM-DD|duplicate|nonempty/);
    }
  });
  test('six mixed updates preserve original facts, old helped and untouched bytes', () => {
    const f = fixture(); const result = f.run(); assert.equal(result.status, 0, result.stderr);
    const updated = readFileSync(f.log, 'utf8'), rows = updated.split(/\r?\n/).map(JSON.parse);
    const originalLines = f.original.match(/[^\n]*\n|[^\n]+$/g), nextLines = updated.match(/[^\n]*\n|[^\n]+$/g);
    assert.equal(rows.length, 8);
    for (let i = 0; i < 6; i++) {
      const { helped, feedback_history, ...facts } = rows[i], { helped: old, ...originalFacts } = f.rows[i];
      assert.deepEqual(facts, originalFacts); assert.equal(helped, f.input.feedback[i].helped);
      assert.equal(feedback_history.length, 1); const review = feedback_history[0];
      assert.equal(review.previous_helped, old ?? null); assert.equal(review.previous_helped_present, i !== 5);
      for (const key of ['review_id', 'reviewed_at', 'reviewed_by', 'approval_reference']) assert.equal(review[key], f.input[key]);
      for (const key of ['helped', 'evidence_kind', 'evidence']) assert.equal(review[key], f.input.feedback[i][key]);
      assert.equal(nextLines[i].endsWith('\r\n'), originalLines[i].endsWith('\r\n'));
    }
    assert.deepEqual(nextLines.slice(6), originalLines.slice(6));
    assert.deepEqual(readdirSync(dirname(f.log)), ['adoption-log.jsonl']);
    const before = statSync(f.log); const again = f.run(); assert.equal(again.status, 0, again.stderr);
    assert.equal(JSON.parse(again.stdout).status, 'unchanged');
    assert.equal(readFileSync(f.log, 'utf8'), updated); assert.equal(statSync(f.log).mtimeMs, before.mtimeMs);
    assert.equal(statSync(f.log).ino, before.ino);
    f.input.feedback[0].evidence = 'different observed result'; rejected(f, f.input, /review_id conflict/);
  });
  test('partial reused review IDs and IDs on unspecified rows reject', () => {
    const f = fixture(); assert.equal(f.run().status, 0); f.input.feedback.pop(); rejected(f, f.input, /review_id conflict/);
    const g = fixture(); assert.equal(g.run().status, 0);
    const rows = readFileSync(g.log, 'utf8').split(/\r?\n/).map(JSON.parse);
    rows[6].feedback_history = [rows[0].feedback_history[0]];
    writeFileSync(g.log, rows.map(JSON.stringify).join('\n'));
    rejected(g, g.input, /review_id conflict/);
  });
  test('new review appends history; old review replay never rolls back later feedback', () => {
    const f = fixture(); assert.equal(f.run().status, 0);
    const newer = structuredClone(f.input); newer.review_id = 'later-review'; newer.expected_log_sha256 = hash(readFileSync(f.log));
    newer.feedback[0].helped = 'no'; assert.equal(f.run(newer).status, 0);
    const bytes = readFileSync(f.log); const replay = f.run(); assert.equal(replay.status, 0, replay.stderr);
    assert.equal(JSON.parse(replay.stdout).status, 'unchanged'); assert.deepEqual(readFileSync(f.log), bytes);
    const first = JSON.parse(bytes.toString().split('\n')[0]); assert.equal(first.helped, 'no');
    assert.equal(first.feedback_history.length, 2); assert.equal(first.feedback_history[1].previous_helped, 'yes');
  });
  test('existing lock, lock symlink and log symlink rejected without replacement', () => {
    const f = fixture(); writeFileSync(f.lock, 'owned elsewhere'); rejected(f, f.input, /existing lock/);
    assert.equal(readFileSync(f.lock, 'utf8'), 'owned elsewhere');
    unlinkSync(f.lock); symlinkSync(f.log, f.lock); rejected(f, f.input, /existing lock/);
    const g = fixture(); const real = join(g.root, 'real-log'); writeFileSync(real, g.original);
    unlinkSync(g.log); symlinkSync(real, g.log); rejected(g, g.input, /symlink rejected/);
    const h = fixture(); const alias = join(scratch, 'root-alias'); symlinkSync(h.root, alias);
    writeFileSync(h.inputPath, JSON.stringify(h.input));
    const r = spawnSync(process.execPath, [script, '--input', h.inputPath, '--root', alias, '--apply'], { encoding: 'utf8' });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /symlink rejected/);
  });
  test('concurrent change before publication survives, with owned lock/temp cleaned', () => {
    const f = fixture(), injected = join(scratch, 'concurrent-writer.mjs');
    const source = readFileSync(script, 'utf8'), point = 'const final = readRegular(log);';
    assert.ok(source.includes(point));
    writeFileSync(injected, source.replace(point, `writeFileSync(log, Buffer.concat([current.bytes, Buffer.from('\\n')]));\n    ${point}`));
    const r = f.run(f.input, true, injected);
    assert.notEqual(r.status, 0); assert.match(r.stderr, /log changed before publication/);
    assert.equal(readFileSync(f.log, 'utf8'), `${f.original}\n`);
    assert.deepEqual(readdirSync(dirname(f.log)), ['adoption-log.jsonl']);
  });
  if (!process.env.FEEDBACK_TEST_CLI) test('load-bearing usage guard mutation turns suite RED', () => {
    const mutant = join(scratch, 'mutant.mjs'), source = readFileSync(script, 'utf8');
    const guard = "if (item.evidence_kind === 'usage' && item.helped !== 'unknown')";
    assert.ok(source.includes(guard)); writeFileSync(mutant, source.replace(guard, 'if (false)'));
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      encoding: 'utf8', env: { ...process.env, FEEDBACK_TEST_CLI: mutant }, timeout: 60000 });
    assert.notEqual(result.status, 0, 'mutation was not detected'); assert.match(result.stderr, /unexpectedly accepted/);
    assert.equal(readFileSync(script, 'utf8'), source, 'production source untouched');
  });
  console.log(`PASS evolution-feedback: ${passed} tests`);
} finally { rmSync(scratch, { recursive: true, force: true }); }
