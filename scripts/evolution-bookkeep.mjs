#!/usr/bin/env node
// evolution-bookkeep.mjs — 演进 scout 簿记落盘（人工触发的确定性脚本）
//
// propose-only 红线的精确边界：scout workflow 零编辑「行为面」文件；簿记（candidate-log 追加、
// yield_stats 计数）不是行为面，由本脚本在 scout 跑完后由人触发落盘——替代曾经漏做的手工两步
// （2026-07 漏追加 candidate-log → 跨月去重失效）。本脚本只碰：
//   1. .claude/skill-os/evolution/candidate-log.jsonl   （追加 run_summary + 全部候选/机会行）
//   2. .claude/skill-os/evolution/sources-registry.yaml （只改 yield_stats 行的数值，其余字段不动）
// 并在 zero_yield_streak ≥ 3 时告警（剪枝提议进 digest，人裁；N=3 定义见 sources-registry 头注）。
//
// 用法: node scripts/evolution-bookkeep.mjs <workflow-return.json> [--dry-run] [--force] [--root DIR]

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PRUNE_N = 3;

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');
const rootIdx = argv.indexOf('--root');
const root = rootIdx >= 0 ? argv[rootIdx + 1] : process.cwd();
const jsonPath = argv.find(a => !a.startsWith('--') && a !== (rootIdx >= 0 ? argv[rootIdx + 1] : null));

if (!jsonPath || !existsSync(jsonPath)) {
  console.error('用法: node scripts/evolution-bookkeep.mjs <workflow-return.json> [--dry-run] [--force] [--root DIR]');
  process.exit(2);
}

const logPath = join(root, '.claude/skill-os/evolution/candidate-log.jsonl');
const registryPath = join(root, '.claude/skill-os/evolution/sources-registry.yaml');
for (const p of [logPath, registryPath]) {
  if (!existsSync(p)) { console.error(`缺文件: ${p}（--root 指对了吗？）`); process.exit(2); }
}

let ret;
try { ret = JSON.parse(readFileSync(jsonPath, 'utf8')); }
catch (e) { console.error(`返回 JSON 解析失败: ${e.message}`); process.exit(2); }
if (!ret.stats || !ret.source_yield) {
  console.error('返回 JSON 缺 stats/source_yield 字段——这不是 framework-evolution-scout 的返回值。');
  process.exit(2);
}

const run = ret.run_date && ret.run_date !== 'unknown' ? String(ret.run_date) : new Date().toISOString().slice(0, 7);
const date = new Date().toISOString().slice(0, 10);

// ── 幂等守卫：同 run 已由本脚本落过盘 → 拒绝重复追加 ──
// 注意匹配 JSON.stringify 的无空格格式（"run":"…"），手写行的带空格格式不在守卫范围。
const existingLog = readFileSync(logPath, 'utf8');
if (!force && existingLog.split('\n').some(l => l.includes(`"run":"${run}"`) && l.includes('"bookkeep":true'))) {
  console.error(`candidate-log 已含本脚本写入的 run="${run}" 记录；重跑用 --force（会重复追加，慎用）。`);
  process.exit(1);
}

// ── 组装追加行（schema 对齐既有 candidate-log 手写行）──
const trim = (s, n = 240) => String(s || '').replace(/\s+/g, ' ').slice(0, n);
const lines = [];
lines.push({ date, run, type: 'run_summary', bookkeep: true, ...ret.stats });
for (const v of [...(ret.approved || []), ...(ret.approved_overflow || [])]) {
  lines.push({ date, run, type: 'candidate', name: v.name, repo: v.repo, gap_id: v.gap_id, verdict: 'APPROVED', weighted_score: v.weighted_score, reuse_mode: v.reuse_mode, reason: trim((v.redteam && v.redteam.reason) || v.why_useful) });
}
for (const v of ret.conditional || []) {
  lines.push({ date, run, type: 'candidate', name: v.name, repo: v.repo, gap_id: v.gap_id, verdict: 'CONDITIONAL', weighted_score: v.weighted_score, reuse_mode: v.reuse_mode, reason: trim((v.redteam && v.redteam.reason) || v.why_useful) });
}
for (const k of ret.killed || []) {
  lines.push({ date, run, type: 'candidate', name: k.name, repo: k.repo, gap_id: k.gap_id, verdict: 'KILLED_BY_REDTEAM', reason: trim(k.reason) });
}
for (const r of ret.rejected_summary || []) {
  lines.push({ date, run, type: 'candidate', name: r.name, repo: r.repo, gap_id: r.gap_id, verdict: 'REJECTED', weighted_score: r.weighted_score, hard: r.hard, reason: trim((r.reasons || []).join('; ')), redundant_with: r.redundant_with || undefined });
}
for (const o of ret.opportunities || []) {
  lines.push({ date, run, type: 'opportunity', name: o.name, repo: o.repo, dimension: o.dimension, verdict: 'OPPORTUNITY', note: trim(o.why_notable), signals: trim(o.signals, 120) });
}
const appendText = lines.map(l => JSON.stringify(l)).join('\n') + '\n';

// ── yield_stats 机械更新（录取 = approved + conditional；只改数值行）──
const conditionalBySource = {};
for (const v of ret.conditional || []) {
  if (v.source_id) conditionalBySource[v.source_id] = (conditionalBySource[v.source_id] || 0) + 1;
}
let registry = readFileSync(registryPath, 'utf8');
const yieldUpdates = [];
const pruneWarnings = [];
for (const [sid, sy] of Object.entries(ret.source_yield)) {
  // 定位该 source 块内的 yield_stats 行（块 = 本 id 行到下一个 "- id:" 之间）
  const blockRe = new RegExp(`(- id: ${sid}[\\s\\S]*?)(yield_stats: \\{[^}]*\\})`);
  const m = registry.match(blockRe);
  if (!m) { console.error(`⚠️ registry 里找不到 ${sid} 的 yield_stats 行，跳过`); continue; }
  const cur = m[2];
  const num = (key) => { const mm = cur.match(new RegExp(`${key}: (\\d+)`)); return mm ? parseInt(mm[1], 10) : 0; };
  const yieldCount = (sy.approved || 0) + (conditionalBySource[sid] || 0);
  const next = {
    runs: num('runs') + 1,
    surfaced: num('surfaced') + (sy.surfaced || 0),
    approved: num('approved') + (sy.approved || 0),
    zero_yield_streak: yieldCount > 0 ? 0 : num('zero_yield_streak') + 1,
  };
  const nextLine = `yield_stats: { runs: ${next.runs}, surfaced: ${next.surfaced}, approved: ${next.approved}, zero_yield_streak: ${next.zero_yield_streak} }`;
  registry = registry.replace(blockRe, `$1${nextLine}`);
  yieldUpdates.push(`${sid}: ${cur} → ${nextLine}`);
  if (next.zero_yield_streak >= PRUNE_N) pruneWarnings.push(`⚠️ ${sid} 连续 ${next.zero_yield_streak} 轮零录取（≥${PRUNE_N}）→ 本期 digest 须提议降权/下线（人裁）`);
}

if (dryRun) {
  console.log(`── dry-run（零写入）──\n将追加 ${lines.length} 行到 candidate-log.jsonl：\n${appendText}`);
  console.log(`yield_stats 更新：\n${yieldUpdates.join('\n') || '（无）'}`);
  pruneWarnings.forEach(w => console.error(w));
  process.exit(0);
}

appendFileSync(logPath, appendText);
writeFileSync(registryPath, registry);
console.log(`✅ candidate-log.jsonl +${lines.length} 行（run=${run}）`);
console.log(`✅ yield_stats 已更新：\n${yieldUpdates.map(u => '   ' + u).join('\n') || '   （无）'}`);
pruneWarnings.forEach(w => console.error(w));
