#!/usr/bin/env node
// test-report-usage.mjs — fixture-driven checks for scripts/report-usage.mjs (never reads the real machine).
// Covers: *.json.history merge, de-dupe by invocation_id (live beats an older history snapshot),
// UUIDv7 month (and the unknown bucket), missing agent_type, missing directory => 不可得 + exit 0,
// route-guard substring counting (low-confidence, counts only), and read-only behaviour.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'report-usage.mjs');
const fx = join(here, 'fixtures/report-usage');

const run = (...argv) => {
  const r = spawnSync(process.execPath, [script, ...argv], { encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const row = (out, ...cells) => out.split('\n').some(l => cells.every(c => l.includes(`| ${c} `) || l.includes(`| ${c} |`)));
const snapshot = (dir) => {
  const acc = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name); if (e.isDirectory()) walk(p); else acc.push(`${p}:${statSync(p).size}:${statSync(p).mtimeMs}`); } };
  walk(dir); return acc.sort().join('\n');
};

const FW = '/fixture/framework'; // the fixture rollout "mine" records this cwd
const base = ['--routing-root', join(fx, 'routing'), '--eval-log', join(fx, 'eval-log.jsonl'), '--sessions-root', join(fx, 'sessions'), '--framework-root', FW];
const before = snapshot(fx);
const r = run(...base);
assert.equal(r.code, 0, `report exit code: ${r.err}`);

// --- routing: 3 snapshots (one live, two in *.json.history), 5 unique invocations after de-dupe
assert.match(r.out, /快照 3 份（不可读 0）/, 'live + both history snapshots read');
assert.match(r.out, /activation 2 个，去重后 invocation 5 条/, 'de-dupe by invocation_id');
assert.match(r.out, /critical_failure 的 activation：1 个/);
assert.match(r.out, /月份未知：1 条；缺 agent_type：1 条/, 'unknown month and missing agent_type are counted, not hidden');
// inv-dup is pending in the older history snapshot and accepted in the live file: live must win
assert.ok(row(r.out, '2026-10', 'light', 'normal', 'accepted', 'preflight-agent'), 'live snapshot beats history for the same invocation');
assert.ok(!row(r.out, 'light', 'pending', 'preflight-agent'), 'stale pending copy must not be counted');
assert.ok(row(r.out, '2026-09', 'peak', 'critical', 'accepted', 'quality-gate'), 'UUIDv7 month taken from root_session_id');
// inv-2 is pending in the older history snapshot (h1, archived 09-11) and accepted in the newer one (h2, archived 09-12).
// h1 sorts first, so a "first snapshot seen wins" rule would pick the stale pending copy: the later archived_at must win.
assert.ok(!row(r.out, '2026-09', 'peak', 'critical', 'pending', 'quality-gate'), 'between two history snapshots the later archived_at wins');
assert.ok(row(r.out, 'unknown', 'anchor', 'accepted', 'explorer'), 'non-UUIDv7 id goes to the unknown month bucket');
assert.ok(row(r.out, '2026-10', 'peak', 'critical', 'refused', '(缺失)'), 'missing agent_type is shown as (缺失)');

// --- eval log: 3 parsed rows, 1 unparsable line, adoption distribution
assert.match(r.out, /共 3 条（无法解析 1 行）/);
assert.ok(row(r.out, 'unknown'), 'user_adopted unknown listed');
assert.ok(row(r.out, 'yes'), 'user_adopted yes listed');
assert.ok(row(r.out, '2026-08', '(无 producer)', 'PASS', 'idea'), 'rows without producer are labelled');

// --- route-guard: a.jsonl (3 marked lines: 09, 10, no timestamp) + one Codex rollout whose cwd is the framework
// root (1 line, 10). A second rollout from another cwd carries a marker too; it must be neither read nor counted.
assert.match(r.out, /2 份会话文件（另有 1 份 cwd 不是框架根的 Codex rollout 未读取），其中 2 份含 route-guard 注入文本/);
assert.match(r.out, /2026-09=1，2026-10=2，unknown=1/, 'the other-cwd rollout must not add a count');
assert.match(r.out, /置信度：低/);
assert.doesNotMatch(r.out, /no marker here|three no timestamp|OTHER_PROJECT_SECRET/, 'session text must never be echoed');

// --- missing sources: 不可得 with a reason, still exit 0
const gone = join(tmpdir(), 'report-usage-does-not-exist');
const m = run('--routing-root', gone, '--eval-log', join(gone, 'x.jsonl'), '--sessions-root', gone);
assert.equal(m.code, 0, 'missing sources must not fail');
assert.equal((m.out.match(/不可得/g) || []).length, 3, 'all three sections report 不可得');
assert.match(m.out, /目录不存在/);

// --- an empty routing directory is available but empty (not 不可得)
const e = run('--routing-root', join(fx, 'empty'), '--eval-log', join(gone, 'x.jsonl'), '--sessions-root', gone);
assert.equal(e.code, 0);
assert.match(e.out, /去重后 invocation 0 条/);

// --- unknown arguments fail fast
assert.equal(run('--nope').code, 2);

// --- read-only: running the report changed nothing under the fixtures
assert.equal(snapshot(fx), before, 'report must not write into its inputs');

// --- file mtime must not drive months: copy the fixtures, age the history file, same table
const copy = mkdtempSync(join(tmpdir(), 'report-usage-'));
try {
  cpSync(fx, copy, { recursive: true });
  const aged = new Date('2001-01-01T00:00:00Z');
  (await import('node:fs')).utimesSync(join(copy, 'routing/old.json.history/h1.json'), aged, aged);
  const again = run('--routing-root', join(copy, 'routing'), '--eval-log', join(copy, 'eval-log.jsonl'), '--sessions-root', join(copy, 'sessions'), '--framework-root', FW);
  // The report prints its input roots and a timestamp; normalise those so only the numbers are compared.
  const norm = (s, root) => s.replace(/统计时刻：[^\n]*\n/, '').split(root).join('<FX>');
  assert.equal(norm(again.out, copy), norm(r.out, fx), 'months come from the UUIDv7 id, not mtime');
} finally { rmSync(copy, { recursive: true, force: true }); }

console.log('PASS report-usage: history merge, de-dupe, UUIDv7 months, missing agent_type, 不可得, route-guard, read-only, mtime-independent');
