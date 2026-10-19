#!/usr/bin/env node
// probe-attestation-fields.mjs — read-only probe: does the host's native transcript still satisfy
// the field assumptions that event attestation depends on?
//
// It does not re-implement any provenance judgement. For each real session it makes ONE call to the
// attestation module's own captureNativeEventFence({recoveryCursor: null}), which re-validates the
// whole history from offset 0 (Claude: claudeUserKind + validateClaudeUser; Codex: provenance and
// UserMessage anchors). The module is loaded from the committed HEAD blob by default, so uncommitted
// work in the checkout cannot change the verdict; the blob id is reported.
//
// Verdict: GREEN (exit 0)        >= --min-success evidence-bearing sessions pass, none UNKNOWN_SCHEMA / PROVENANCE_MISMATCH
//          RED (exit 1)          any UNKNOWN_SCHEMA or PROVENANCE_MISMATCH
//          INSUFFICIENT (exit 3) not enough evidence-bearing sessions
// "Evidence-bearing" = the file has rows the validator actually bites on (counted by presence only).
// Without that guard a host that dropped `promptSource` would look green: every human row would be
// treated as a slash-command row and skipped.
//
// Known limits (read the report with these in mind):
//  - The verdict pools both hosts. GREEN is possible with zero Codex evidence; the per-shape breakdown shows it.
//  - Error codes other than UNKNOWN_SCHEMA / PROVENANCE_MISMATCH (CWD_MISMATCH, SESSION_MISMATCH, EXCEPTION:*) are
//    listed but do not turn the verdict RED: a session that changed directory mid-way is not field drift.
//  - "Evidence" is a presence count (Claude: human rows carrying promptSource; Codex: UserMessage events). It
//    approximates "rows the validator actually checked" and does not measure that exactly.
//  - Whole-history validation from offset 0 can be stricter than the runtime per-turn path; whether the runtime
//    path fails on the same session is not verified here.
//  - Only plain `.jsonl` rollouts are read. Codex compresses older sessions to `.jsonl.zst` (about 87% of the files
//    on the author's machine when this was written), so the verdict covers the newer, uncompressed sessions only.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdtempSync, openSync, readSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const frameworkRoot = resolve(new URL('..', import.meta.url).pathname);
const MAX_BYTES = 64 * 1024 * 1024; // the module refuses larger sources; skip and count instead of failing
const opt = { max: 20, min: 3, claudeRoot: join(homedir(), '.claude/projects/-Users-luca-Desktop-luca-gstack'),
  codexHome: join(homedir(), '.codex'), root: frameworkRoot, allowTest: false, json: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--attestation-module') opt.module = process.argv[++i];
  else if (a === '--claude-root') opt.claudeRoot = process.argv[++i];
  else if (a === '--codex-home') opt.codexHome = process.argv[++i];
  else if (a === '--framework-root') opt.root = process.argv[++i];
  else if (a === '--max-sessions') opt.max = Number(process.argv[++i]);
  else if (a === '--min-success') opt.min = Number(process.argv[++i]);
  else if (a === '--allow-test-source-root') opt.allowTest = true; // fixtures only
  else if (a === '--json') opt.json = true;
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}

const git = (...a) => spawnSync('git', ['-C', frameworkRoot, ...a], { encoding: 'utf8' });
const version = (cmd) => { try { const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 15_000 }); return (r.stdout || '').trim().split('\n')[0] || 'unavailable'; } catch { return 'unavailable'; } };

// Load the module: explicit path, else the HEAD blob materialised into a temp dir (deleted at exit).
let tmp = '';
let modulePath = opt.module;
let moduleId;
if (!modulePath) {
  const rel = '.claude/hooks/lib/event-attestation.mjs';
  const blob = git('show', `HEAD:${rel}`);
  if (blob.status !== 0) { console.error('cannot read the HEAD blob of event-attestation.mjs'); process.exit(2); }
  tmp = mkdtempSync(join(tmpdir(), 'probe-attestation-'));
  modulePath = join(tmp, 'event-attestation.mjs');
  writeFileSync(modulePath, blob.stdout);
  moduleId = `HEAD blob ${git('rev-parse', `HEAD:${rel}`).stdout.trim()}`;
} else {
  moduleId = `file sha256 ${createHash('sha256').update(readFileSync(modulePath)).digest('hex').slice(0, 16)}`;
}
const cleanup = () => { if (tmp) rmSync(tmp, { recursive: true, force: true }); };
process.on('exit', cleanup);
const { captureNativeEventFence } = await import(pathToFileURL(resolve(modulePath)).href);

const tally = { ok: 0, no_evidence: 0, skipped_large: 0, skipped_other_cwd: 0, skipped_non_root: 0, skipped_unreadable: 0, errors: {}, by_shape: {} };
// Error messages are fixed strings authored by the module (never session text), so they are safe to print.
// `shape` labels the kind of session (Codex: session_meta source/originator) so a red from one unusual
// session type, such as a headless `codex exec` run, is visible as such instead of reading as host drift.
const failures = [];
const shapeOf = (shape) => (tally.by_shape[shape] ||= { ok: 0, no_evidence: 0, failed: 0 });
const bump = (code, harness, file, message, shape) => {
  tally.errors[code] = (tally.errors[code] || 0) + 1;
  shapeOf(shape).failed++;
  failures.push({ code, harness, shape, session: basename(file).replace(/^rollout-.*?-([0-9a-f]{8})[0-9a-f-]*\.jsonl$/, '$1').slice(0, 8), message });
};
const rows = (file) => { const out = []; for (const l of readFileSync(file, 'utf8').split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch { /* counted by the module */ } } return out; };

// First JSONL record of a file without parsing the rest; session_meta can be large, so read in chunks.
function firstRecord(file) {
  const fd = openSync(file, 'r');
  try {
    const chunks = [];
    const buf = Buffer.alloc(64 * 1024);
    let total = 0;
    for (;;) {
      const n = readSync(fd, buf, 0, buf.length, total);
      if (n <= 0) break;
      const slice = Buffer.from(buf.subarray(0, n));
      total += n;
      const nl = slice.indexOf(10);
      if (nl >= 0) { chunks.push(slice.subarray(0, nl)); break; }
      chunks.push(slice);
      if (total > 4 * 1024 * 1024) return null; // implausibly large first record
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
  } finally { closeSync(fd); }
}

function probe({ harness, file, sessionId, cwd, evidence, shape }) {
  if (statSync(file).size > MAX_BYTES) { tally.skipped_large++; return; }
  try {
    captureNativeEventFence({ sessionId, harness, cwd, recoveryCursor: null, allowTestSourceRoot: opt.allowTest,
      ...(harness === 'claude' ? { transcriptPath: file } : { codexHome: opt.codexHome }) });
  } catch (error) { bump(error?.code || `EXCEPTION:${error?.name || 'Error'}`, harness, file, String(error?.message || ''), shape); return; }
  if (evidence > 0) { tally.ok++; shapeOf(shape).ok++; } else { tally.no_evidence++; shapeOf(shape).no_evidence++; }
}

// Claude: <claude-root>/<session>.jsonl, newest first. session id and cwd come from the file itself.
if (existsSync(opt.claudeRoot)) {
  const files = readdirSync(opt.claudeRoot).filter(n => n.endsWith('.jsonl')).map(n => join(opt.claudeRoot, n))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs).slice(0, opt.max);
  for (const file of files) {
    let all;
    try { all = rows(file); } catch { tally.skipped_unreadable++; continue; }
    const meta = all.find(r => typeof r.sessionId === 'string' && typeof r.cwd === 'string');
    if (!meta || meta.sessionId !== basename(file, '.jsonl')) { tally.skipped_unreadable++; continue; }
    if (meta.cwd !== opt.root) { tally.skipped_other_cwd++; continue; }
    const evidence = all.filter(r => r.type === 'user' && r.origin?.kind === 'human' && r.promptSource != null).length;
    probe({ harness: 'claude', file, sessionId: meta.sessionId, cwd: meta.cwd, evidence, shape: 'claude' });
  }
}

// Codex: <codex-home>/sessions/**/rollout-*.jsonl, newest (by name) first; id and cwd from session_meta.
const sessionsDir = join(opt.codexHome, 'sessions');
if (existsSync(sessionsDir)) {
  const found = [];
  const walk = (dir, depth) => { for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && depth < 4) walk(full, depth + 1);
    else if (e.isFile() && /^rollout-.*\.jsonl$/.test(e.name)) found.push(full); } };
  walk(sessionsDir, 0);
  // Codex often runs in managed worktrees, so most recent rollouts have another cwd. Scan newest-first
  // until --max-sessions matching sessions were probed (bounded by SCAN_CAP files); the cwd test reads only
  // the first record, so skipped files are never fully parsed.
  const SCAN_CAP = 600;
  let matched = 0;
  for (const file of found.sort((a, b) => basename(b).localeCompare(basename(a))).slice(0, SCAN_CAP)) {
    if (matched >= opt.max) break;
    const meta = firstRecord(file)?.payload;
    if (!meta || typeof meta.id !== 'string' || typeof meta.cwd !== 'string') { tally.skipped_unreadable++; continue; }
    if (meta.cwd !== opt.root) { tally.skipped_other_cwd++; continue; }
    // Population filter only: attestation is defined for the ROOT native user thread. This mirrors the
    // module's own root-thread rule (validateCodexProvenance) to choose which sessions to probe; child and
    // forked threads are refused by design, so counting them would be a permanent false RED. Every
    // per-turn judgement still comes from the module itself.
    const root = meta.thread_source === 'user' && !meta.parent_thread_id && !meta.forked_from_id && meta.session_id === meta.id;
    if (!root) { tally.skipped_non_root++; continue; }
    matched++;
    let all;
    try { all = rows(file); } catch { tally.skipped_unreadable++; continue; }
    const evidence = all.filter(r => r.type === 'event_msg' && r.payload?.item?.type === 'UserMessage').length;
    const source = typeof meta.source === 'object' && meta.source ? 'subagent' : (meta.source ?? '?');
    // The shape carries the session's own cli_version so a failure confined to one version reads as drift
    // rather than as "a kind of session the module does not support" (the installed CLI version alone cannot tell).
    probe({ harness: 'codex', file, sessionId: meta.id, cwd: meta.cwd, evidence,
      shape: `codex ${source}/${meta.originator ?? '?'} ${meta.cli_version ?? 'unknown-version'}` });
  }
}

const red = (tally.errors.UNKNOWN_SCHEMA || 0) + (tally.errors.PROVENANCE_MISMATCH || 0);
const verdict = red > 0 ? 'RED' : tally.ok >= opt.min ? 'GREEN' : 'INSUFFICIENT';
const report = { verdict, module: moduleId, claude: version('claude'), codex: version('codex'),
  min_success: opt.min, ...tally, failures };
if (opt.json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`# attestation field probe: ${verdict}\n`);
  console.log(`- module: ${moduleId}`);
  console.log(`- host versions: ${report.claude} | ${report.codex}`);
  console.log(`- passed with evidence: ${tally.ok} (need >= ${opt.min}); passed without evidence: ${tally.no_evidence}`);
  console.log(`- errors: ${Object.keys(tally.errors).length ? Object.entries(tally.errors).map(([k, n]) => `${k}=${n}`).join(', ') : 'none'}`);
  console.log(`- skipped: large=${tally.skipped_large} other-cwd=${tally.skipped_other_cwd} non-root-thread=${tally.skipped_non_root} unreadable=${tally.skipped_unreadable}`);
  console.log('- by session shape:');
  for (const [shape, c] of Object.entries(tally.by_shape).sort()) console.log(`  - ${shape}: passed=${c.ok} passed-without-evidence=${c.no_evidence} failed=${c.failed}`);
  for (const f of failures.slice(0, 10)) console.log(`  - ${f.shape} ${f.session}: ${f.code} — ${f.message}`);
  console.log('\nOnly counts are reported; no session content is printed. A verdict holds for the module version named above.');
}
process.exit(verdict === 'GREEN' ? 0 : verdict === 'RED' ? 1 : 3);
