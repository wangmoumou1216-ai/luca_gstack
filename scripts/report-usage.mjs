#!/usr/bin/env node
// report-usage.mjs — read-only usage report (markdown on stdout, writes nothing).
//
// Why: the framework has no usage data for model routing, quality-gate adoption or route-guard
// injection, so keep/retire decisions are made blind. This only READS existing records.
//
// Sources (each overridable so tests and CI never touch the real machine):
//   --routing-root   Codex routing activations: *.json plus *.json.history/*.json
//   --eval-log       memory/evals/eval-log.jsonl
//   --sessions-root  (repeatable) Claude project dir or Codex sessions dir, for route-guard counts
// A missing source prints "不可得" with the reason and the script still exits 0.
//
// Month rule: routing months come from the UUIDv7 timestamp inside root_session_id, never from
// file mtime (a history file's mtime is its last write, not when the invocation ran).
import { closeSync, existsSync, openSync, readSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const home = homedir();
const frameworkRoot = resolve(new URL('..', import.meta.url).pathname);
const args = { sessions: [] };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--routing-root') args.routing = process.argv[++i];
  else if (a === '--eval-log') args.evalLog = process.argv[++i];
  else if (a === '--sessions-root') args.sessions.push(process.argv[++i]);
  else if (a === '--framework-root') args.root = process.argv[++i];
  else if (a === '--help') { console.log('usage: report-usage.mjs [--routing-root DIR] [--eval-log FILE] [--sessions-root DIR]...'); process.exit(0); }
  else { console.error(`unknown argument: ${a}`); process.exit(2); }
}
args.root ??= frameworkRoot;
args.routing ??= join(home, '.luca/state/model-routing/codex');
args.evalLog ??= join(frameworkRoot, 'memory/evals/eval-log.jsonl');
if (!args.sessions.length) {
  args.sessions = [join(home, '.claude/projects/-Users-luca-Desktop-luca-gstack'), join(home, '.codex/sessions')];
}

// UUIDv7: first 48 bits are a unix-ms timestamp; the 13th hex digit is the version nibble.
function uuidV7Month(id) {
  const hex = String(id || '').replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex) || hex[12] !== '7') return 'unknown';
  const ms = parseInt(hex.slice(0, 12), 16);
  const d = new Date(ms);
  if (!(d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2100)) return 'unknown';
  return d.toISOString().slice(0, 7);
}

const tally = (map, ...key) => { const k = key.join(' | '); map.set(k, (map.get(k) || 0) + 1); };
const table = (title, map, header) => {
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out = [`**${title}**`, '', `| ${header.join(' | ')} | 次数 |`, `|${header.map(() => '---').join('|')}|---:|`];
  for (const [k, n] of rows) out.push(`| ${k.split(' | ').join(' | ')} | ${n} |`);
  return out.join('\n');
};
const unavailable = (what, why) => `${what}：**不可得**（${why}）`;

function readJson(file) { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } }

function routingSection() {
  if (!existsSync(args.routing) || !statSync(args.routing).isDirectory()) {
    return unavailable('Codex 路由', `目录不存在：${args.routing}`);
  }
  const snapshots = [];
  for (const name of readdirSync(args.routing).sort()) {
    const full = join(args.routing, name);
    if (name.endsWith('.json') && statSync(full).isFile()) snapshots.push({ file: full, live: true });
    else if (name.endsWith('.json.history') && statSync(full).isDirectory()) {
      for (const h of readdirSync(full).sort()) if (h.endsWith('.json')) snapshots.push({ file: join(full, h), live: false });
    }
  }
  // De-dupe by invocation_id. A live file is the newest state of its activation; among history
  // snapshots the later archived_at wins. Equal rank keeps the first one seen (deterministic sort).
  const rank = (snap, doc) => (snap.live ? Infinity : Date.parse(doc.archived_at || '') || 0);
  const best = new Map();
  const activations = new Map();
  let unreadable = 0;
  for (const snap of snapshots) {
    const doc = readJson(snap.file);
    if (!doc || typeof doc !== 'object') { unreadable++; continue; }
    const r = rank(snap, doc);
    if (doc.activation_id) {
      const prev = activations.get(doc.activation_id);
      if (!prev || r > prev.r) activations.set(doc.activation_id, { r, critical_failure: Boolean(doc.critical_failure) });
    }
    for (const inv of Object.values(doc.invocations || {})) {
      const id = inv?.invocation_id;
      if (!id) continue;
      const prev = best.get(id);
      if (!prev || r > prev.r) best.set(id, { r, inv, session: doc.root_session_id });
    }
  }
  const byRole = new Map();
  const noAgentType = { n: 0 };
  const unknownMonth = { n: 0 };
  for (const { inv, session } of best.values()) {
    const month = uuidV7Month(inv.root_session_id || session);
    if (month === 'unknown') unknownMonth.n++;
    const agent = inv.external_identity?.agent_type;
    if (!agent) noAgentType.n++;
    tally(byRole, month, inv.requested_role ?? '?', inv.critical ? 'critical' : 'normal', inv.status ?? '?', agent || '(缺失)');
  }
  const criticalFailures = [...activations.values()].filter(a => a.critical_failure).length;
  return [
    `统计时刻：${new Date().toISOString()}（数字会继续增长）`,
    `快照 ${snapshots.length} 份（不可读 ${unreadable}），activation ${activations.size} 个，去重后 invocation ${best.size} 条；`
      + `critical_failure 的 activation：${criticalFailures} 个；月份未知：${unknownMonth.n} 条；缺 agent_type：${noAgentType.n} 条。`,
    '',
    table('月 × 角色 × 关键性 × 状态 × agent_type', byRole, ['月份', '角色', '关键性', '状态', 'agent_type']),
  ].join('\n');
}

function evalSection() {
  if (!existsSync(args.evalLog)) return unavailable('quality-gate 落账', `文件不存在：${args.evalLog}`);
  const byMonth = new Map();
  const adopted = new Map();
  let rows = 0;
  let bad = 0;
  for (const line of readFileSync(args.evalLog, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { bad++; continue; }
    rows++;
    const month = String(r.session_date || '').slice(0, 7) || 'unknown';
    tally(byMonth, month, r.quality_gate_producer ? 'quality-gate' : '(无 producer)', r.quality_gate_status ?? '?', r.skill_name ?? '?');
    tally(adopted, String(r.user_adopted ?? '(缺失)'));
  }
  return [
    `共 ${rows} 条（无法解析 ${bad} 行）。`, '',
    table('月 × producer × 状态 × skill', byMonth, ['月份', 'producer', '状态', 'skill']), '',
    table('user_adopted 分布', adopted, ['user_adopted']),
  ].join('\n');
}

// First JSONL record without parsing the rest (a Codex session_meta can be large, so read in chunks).
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
      if (total > 4 * 1024 * 1024) return null;
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
  } finally { closeSync(fd); }
}

async function countRouteGuard(root) {
  const candidates = [];
  const walk = (dir, depth) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory() && depth < 4) walk(full, depth + 1);
      else if (e.isFile() && e.name.endsWith('.jsonl')) candidates.push(full);
    }
  };
  walk(root, 0);
  // Read scope: only sessions that belong to this framework checkout. A Codex rollout records its cwd in
  // its first record, so any rollout from another working directory is skipped without being read further.
  // Claude transcripts are expected under the framework's own project directory (the default root).
  const files = [];
  let excluded = 0;
  for (const f of candidates) {
    if (/(^|\/)rollout-[^/]*\.jsonl$/.test(f) && firstRecord(f)?.payload?.cwd !== args.root) { excluded++; continue; }
    files.push(f);
  }
  const byMonth = new Map();
  let filesWith = 0;
  for (const f of files) {
    let hit = 0;
    const rl = createInterface({ input: createReadStream(f, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.includes('[route-guard]')) continue;
      hit++;
      const ts = line.match(/"timestamp"\s*:\s*"(\d{4}-\d{2})/);
      tally(byMonth, ts ? ts[1] : 'unknown');
    }
    if (hit) filesWith++;
  }
  return { files: files.length, filesWith, byMonth, excluded };
}

async function routeGuardSection() {
  const present = args.sessions.filter(p => existsSync(p));
  if (!present.length) return unavailable('route-guard 注入', `会话目录都不存在：${args.sessions.join(', ')}`);
  const parts = [];
  for (const root of present) {
    const { files, filesWith, byMonth, excluded } = await countRouteGuard(root);
    parts.push(`- \`${root}\`：${files} 份会话文件（另有 ${excluded} 份 cwd 不是框架根的 Codex rollout 未读取），其中 ${filesWith} 份含 route-guard 注入文本；`
      + (byMonth.size ? `按行时间戳分月（无时间戳归 unknown）：${[...byMonth].sort().map(([m, n]) => `${m}=${n}`).join('，')}。` : '无命中。'));
  }
  parts.push('', '**置信度：低。** 这是对会话文件中 `[route-guard]` 字样的逐行子串计数：会话压缩、续接与重放可能让同一次注入出现多次，'
    + '也不区分注入的类别，并且只读未压缩的 `.jsonl`、不读 Codex 压缩过的 `.jsonl.zst` 旧会话，只可作量级参考，不能当作注入次数的精确值。只统计计数，不摘录任何会话内容。');
  return parts.join('\n');
}

const sections = [
  ['Codex 模型路由（生产使用）', routingSection()],
  ['quality-gate 落账', evalSection()],
  ['route-guard 注入（近似）', await routeGuardSection()],
];
console.log('# luca_gstack 使用情况统计（只读）\n');
for (const [title, body] of sections) console.log(`## ${title}\n\n${body}\n`);
