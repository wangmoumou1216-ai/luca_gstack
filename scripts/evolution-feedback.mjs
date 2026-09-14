#!/usr/bin/env node
// Human-reviewed feedback only; approval_reference is audit data, NOT proof of authority.
// Caller must obtain real approval before --apply. Default is zero-write dry-run.
// Cooperating writers serialize on this lock. Hash rechecks do NOT provide atomic CAS
// against non-cooperating manual writers between the final read and rename.
import { constants, openSync, closeSync, readFileSync, writeFileSync, lstatSync,
  fstatSync, fsyncSync, fchmodSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, dirname, parse, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const fail = message => { throw new Error(message); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(canonical(v)))
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(canonical(value[k]))])) : value);
const identity = row => JSON.stringify([row.date, row.fused_candidate_id]);
function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty text`);
}
function fields(value, required, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  for (const key of Object.keys(value)) if (!required.includes(key)) fail(`${name}: unknown field ${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`${name}: missing ${key}`);
}
function date(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(`${name}: invalid YYYY-MM-DD`);
}
function validate(input) {
  fields(input, ['schema_version', 'review_id', 'reviewed_at', 'reviewed_by', 'approval_reference', 'expected_log_sha256', 'feedback'], 'input');
  if (input.schema_version !== 1) fail('schema_version must be 1');
  for (const key of ['review_id', 'reviewed_by', 'approval_reference']) text(input[key], key);
  date(input.reviewed_at, 'reviewed_at');
  if (typeof input.expected_log_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.expected_log_sha256)) fail('expected_log_sha256 must be lowercase SHA-256');
  if (!Array.isArray(input.feedback) || !input.feedback.length) fail('feedback must be a nonempty array');
  const seen = new Set();
  for (const item of input.feedback) {
    fields(item, ['date', 'fused_candidate_id', 'helped', 'evidence_kind', 'evidence'], 'feedback');
    date(item.date, 'feedback.date');
    text(item.fused_candidate_id, 'fused_candidate_id');
    text(item.evidence, 'evidence');
    if (!['yes', 'no', 'unknown'].includes(item.helped)) fail('helped must be yes/no/unknown');
    if (!['outcome', 'usage'].includes(item.evidence_kind)) fail('evidence_kind must be outcome/usage');
    if (item.evidence_kind === 'usage' && item.helped !== 'unknown') fail('usage evidence permits only helped=unknown');
    if (seen.has(identity(item))) fail('duplicate feedback identity');
    seen.add(identity(item));
  }
}
// Reject symlinks in every component, not just the final file. Use canonical /private/tmp
// rather than the /tmp symlink on macOS. O_NOFOLLOW also closes final-component races.
function noSymlinks(path) {
  const absolute = resolve(path);
  let cursor = parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split('/').filter(Boolean)) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) fail(`symlink rejected: ${cursor}`);
  }
}
function readRegular(path) {
  noSymlinks(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) fail(`not a regular file: ${path}`);
    return { bytes: readFileSync(fd), stat };
  } finally { closeSync(fd); }
}
function absent(path) {
  try { lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  fail(`existing lock rejected: ${path}`);
}
function prepare(input, bytes) {
  // Keep every untouched line, whitespace, line ending and final newline byte-for-byte.
  const source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) || [];
  const rows = lines.map(line => line.trim() ? JSON.parse(line) : null);
  for (const row of rows) {
    if (row !== null && (typeof row !== 'object' || Array.isArray(row))) fail('log row must be an object');
    if (row && Object.hasOwn(row, 'feedback_history') && (!Array.isArray(row.feedback_history)
      || row.feedback_history.some(h => !h || typeof h !== 'object' || typeof h.review_id !== 'string'))) fail('invalid feedback_history');
  }
  const intent = { ...input, feedback: [...input.feedback].sort((a, b) => identity(a).localeCompare(identity(b))) };
  delete intent.expected_log_sha256;
  const batchSha = sha(canonical(intent));
  const selected = input.feedback.map(item => {
    const matches = rows.flatMap((row, index) => row && identity(row) === identity(item) ? [index] : []);
    if (matches.length !== 1) fail(`identity must match exactly one log row: ${identity(item)} (${matches.length})`);
    return { item, index: matches[0] };
  });
  const used = rows.flatMap((row, index) => (row?.feedback_history || [])
    .filter(h => h.review_id === input.review_id).map(h => ({ h, index })));
  if (used.length) {
    if (used.length !== selected.length || selected.some(({ item, index }) => {
      const matches = used.filter(u => u.index === index);
      return matches.length !== 1 || matches[0].h.batch_sha256 !== batchSha
        || ['helped', 'evidence', 'evidence_kind'].some(k => matches[0].h[k] !== item[k])
        || ['reviewed_at', 'reviewed_by', 'approval_reference'].some(k => matches[0].h[k] !== input[k]);
    })) fail('review_id conflict: different content, partial reuse or other rows');
    return { bytes, unchanged: true, count: selected.length };
  }
  if (sha(bytes) !== input.expected_log_sha256) fail('expected_log_sha256 mismatch');
  for (const { item, index } of selected) {
    const row = rows[index];
    const history = { review_id: input.review_id, reviewed_at: input.reviewed_at,
      reviewed_by: input.reviewed_by, approval_reference: input.approval_reference,
      helped: item.helped, evidence_kind: item.evidence_kind, evidence: item.evidence,
      previous_helped: Object.hasOwn(row, 'helped') ? row.helped : null,
      previous_helped_present: Object.hasOwn(row, 'helped'), batch_sha256: batchSha };
    const ending = lines[index].endsWith('\r\n') ? '\r\n' : lines[index].endsWith('\n') ? '\n' : '';
    lines[index] = JSON.stringify({ ...row, helped: item.helped, feedback_history: [...(row.feedback_history || []), history] }) + ending;
  }
  return { bytes: Buffer.from(lines.join('')), unchanged: false, count: selected.length };
}
function main() {
  const args = process.argv.slice(2);
  const options = { root: process.cwd(), apply: false };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--root', '--input', '--apply'].includes(flag) || seen.has(flag)) fail(`unknown or duplicate argument: ${flag}`);
    seen.add(flag);
    if (flag === '--apply') options.apply = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) fail(`missing value: ${flag}`);
      options[flag.slice(2)] = args[++i];
    }
  }
  if (!options.input) fail('usage: node scripts/evolution-feedback.mjs --input <json> [--root <root>] [--apply]');
  const input = JSON.parse(readRegular(options.input).bytes.toString('utf8'));
  validate(input);
  const log = resolve(options.root, '.claude/skill-os/evolution/adoption-log.jsonl');
  const lock = join(dirname(log), '.adoption-feedback.lock');
  const snapshot = readRegular(log);
  absent(lock);
  let plan = prepare(input, snapshot.bytes);
  const report = status => console.log(JSON.stringify({ status, review_id: input.review_id,
    count: plan.count, log_sha256: sha(plan.bytes) }));
  if (!options.apply || plan.unchanged) return report(plan.unchanged ? 'unchanged' : 'dry_run');
  let lockFd, tempFd, temp;
  try {
    noSymlinks(dirname(log));
    lockFd = openSync(lock, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    writeFileSync(lockFd, JSON.stringify({ pid: process.pid, review_id: input.review_id }));
    const current = readRegular(log);
    if (sha(current.bytes) !== sha(snapshot.bytes)) fail('log changed before lock acquisition');
    plan = prepare(input, current.bytes);
    temp = join(dirname(log), `.adoption-feedback-${randomUUID()}.tmp`);
    tempFd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    writeFileSync(tempFd, plan.bytes);
    fchmodSync(tempFd, current.stat.mode & 0o777);
    fsyncSync(tempFd);
    closeSync(tempFd); tempFd = undefined;
    const final = readRegular(log);
    if (sha(final.bytes) !== sha(current.bytes) || final.stat.ino !== current.stat.ino || final.stat.dev !== current.stat.dev) fail('log changed before publication');
    const lockStat = lstatSync(lock), owned = fstatSync(lockFd);
    if (lockStat.isSymbolicLink() || lockStat.ino !== owned.ino || lockStat.dev !== owned.dev) fail('lock ownership changed');
    renameSync(temp, log); temp = undefined;
    report('applied');
  } finally {
    if (tempFd !== undefined) closeSync(tempFd);
    if (temp) unlinkSync(temp);
    if (lockFd !== undefined) {
      const owned = fstatSync(lockFd);
      closeSync(lockFd);
      try {
        const present = lstatSync(lock);
        if (!present.isSymbolicLink() && present.ino === owned.ino && present.dev === owned.dev) unlinkSync(lock);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}
try { main(); } catch (error) { console.error(`evolution-feedback: ${error.message}`); process.exitCode = 1; }
