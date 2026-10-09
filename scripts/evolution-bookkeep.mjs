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
// 模式1b 单点评估返回（mode:'punctual'）：无 source_yield（没跑发现通道），验 stats+results
const isPunctual = ret.mode === 'punctual';
// G1 fail-closed 门（claude5-unhobble）：run_status !== 'COMPLETE'（含字段缺失=旧版返回）
// → 整脚本 abort，先于 :134 appendFileSync 与全部登记面（conditional 泄漏路径 R5-③W3）。
// 两模式统一；07-02 事故（残缺 run 发布 2 APPROVED 终版反转）是本门的正当性证据。
if (ret.run_status !== 'COMPLETE') {
  console.error(`run_status=${ret.run_status ?? '(缺失)'} ≠ COMPLETE——残缺 run 拒登记（相位: ${JSON.stringify(ret.phases_completed ?? {})}）。补齐相位后 resume 重跑再 bookkeep。`);
  process.exit(3);
}
// COMPLETE is a producer claim, not proof: reconcile original dispatch identities and counts.
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const count = v => Number.isSafeInteger(v) && v >= 0;
const need = (ok, message) => { if (!ok) { console.error(`Invalid workflow result: ${message}`); process.exit(2); } };
const ids = rows => rows.map(v => `${v.repo.toLowerCase()}#${v.name.toLowerCase()}`);
const same = (a,b) => a.length === b.length && new Set(a).size === a.length && new Set(b).size === b.length
  && a.every(v => b.includes(v));
need(record(ret) && (ret.mode === undefined || ['sweep','punctual'].includes(ret.mode)), 'unknown mode');
const statKeys = ['raw','unique','verified','approved','conditional','rejected','killed_by_redteam','dropped_existing','opportunities'];
need(record(ret.stats) && Object.keys(ret.stats).length === statKeys.length
  && statKeys.every(k => count(ret.stats[k])), 'stats must contain only the declared nonnegative integer counts');
need(Array.isArray(ret.failures) && ret.failures.length === 0, 'COMPLETE with failures or missing failure evidence');
const expectedPhases = isPunctual ? ['Load','Intake','Verify','Redteam'] : ['Load','AdoptionReview','Discover','Verify','Redteam'];
need(record(ret.phase_coverage) && same(Object.keys(ret.phase_coverage),expectedPhases), 'missing phase coverage');
for (const phase of expectedPhases) {
  const p = ret.phase_coverage[phase];
  need(record(p) && Array.isArray(p.expected) && p.expected.every(text) && Array.isArray(p.completed)
    && same(p.expected,p.completed), `incomplete or duplicate ${phase}`);
}
need(same(ret.phase_coverage.Load.expected,['truth-files']), 'Load identity');
let candidates, approved, conditional, rejected, killed, opportunities;
if (isPunctual) {
  need(Array.isArray(ret.target_repos) && ret.target_repos.length > 0
    && ret.target_repos.every(r => text(r) && /^[\w.-]+\/[\w.-]+$/.test(r)), 'target_repos');
  need(Array.isArray(ret.results), 'results');
  candidates = ret.results;
  need(candidates.every(v => record(v) && text(v.repo) && text(v.name) && ['APPROVED','CONDITIONAL','REJECTED'].includes(v.verdict)), 'candidate shape');
  need(same(candidates.map(v => v.repo.toLowerCase()),ret.target_repos.map(r=>r.toLowerCase())), 'request/result target mismatch');
  need(same(ret.phase_coverage.Intake.expected,ret.target_repos), 'Intake identity');
  approved = candidates.filter(v=>v.verdict==='APPROVED'); conditional = candidates.filter(v=>v.verdict==='CONDITIONAL');
  rejected = candidates.filter(v=>v.verdict==='REJECTED'); killed = candidates.filter(v=>v.killed_by_redteam===true); opportunities = [];
  need(killed.every(v=>v.verdict==='REJECTED'), 'killed verdict');
  need(ret.stats.raw===candidates.length && ret.stats.unique===candidates.length && ret.stats.dropped_existing===0, 'punctual counts');
} else {
  for (const key of ['approved','approved_overflow','conditional','killed','rejected_summary','opportunities']) need(Array.isArray(ret[key]), key);
  approved = [...ret.approved,...ret.approved_overflow]; conditional = ret.conditional;
  killed = ret.killed; rejected = [...ret.rejected_summary,...killed]; opportunities = ret.opportunities;
  candidates = [...approved,...conditional,...rejected];
  need(record(ret.source_yield) && same(Object.keys(ret.source_yield),ret.phase_coverage.Discover.expected), 'source/Discover identity');
  need(same(ret.phase_coverage.AdoptionReview.expected,['adoption-log']), 'AdoptionReview identity');
  need(candidates.concat(opportunities).every(v=>record(v) && text(v.repo) && text(v.name)
    && Object.hasOwn(ret.source_yield,v.source_id)), 'candidate/source identity');
  let surfaced = 0;
  for (const [sid,sy] of Object.entries(ret.source_yield)) {
    need(record(sy) && same(Object.keys(sy),['surfaced','approved']) && count(sy.surfaced) && count(sy.approved), `source counts ${sid}`);
    need(sy.approved===approved.filter(v=>v.source_id===sid).length, `approved source count ${sid}`);
    need(sy.surfaced>=candidates.concat(opportunities).filter(v=>v.source_id===sid).length, `surfaced source count ${sid}`);
    surfaced += sy.surfaced;
  }
  need(surfaced===ret.stats.raw, 'raw/source surfaced mismatch');
}
// Array placement cannot override a candidate's own gate facts. Recompute the
// producer's small deterministic decision here before writing an APPROVED row.
function validateDecision(v, bucket) {
  const scoreKeys = ['fit','quality','adoption','maintenance'];
  const hardKeys = ['safety','compatibility','non_redundancy','gap_addressed','provenance'];
  need(record(v.scores) && scoreKeys.every(k=>typeof v.scores[k]==='number' && Number.isFinite(v.scores[k])
    && v.scores[k]>=0 && v.scores[k]<=3), 'invalid candidate scores');
  need(record(v.hard) && hardKeys.every(k=>['PASS','FAIL'].includes(v.hard[k])), 'invalid candidate hard gates');
  need(text(v.gap_id) && ['install','port-pattern','adapt-idea'].includes(v.reuse_mode), 'invalid candidate gap/reuse mode');
  const weights = v.reuse_mode==='install' ? [30,30,20,20] : [40,40,10,10];
  const weighted = Math.round(scoreKeys.reduce((sum,k,i)=>sum+(v.scores[k]/3)*weights[i],0));
  need(v.weighted_score===weighted, 'weighted score contradicts scores');
  const hardFail = hardKeys.some(k=>v.hard[k]!=='PASS') || v.gap_id==='none';
  let expected = hardFail ? 'REJECTED' : weighted>=70 ? 'APPROVED' : weighted>=45 ? 'CONDITIONAL' : 'REJECTED';
  const needsRedteam = isPunctual || expected!=='REJECTED' || killed.includes(v);
  if (needsRedteam || v.redteam!=null) {
    need(record(v.redteam) && ['stands','downgraded','killed'].includes(v.redteam.redteam_verdict)
      && ['LOW','MEDIUM','HIGH'].includes(v.redteam.integration_risk) && text(v.redteam.reason), 'invalid or missing redteam');
    if (v.redteam.redteam_verdict==='killed') expected='REJECTED';
    else if (expected==='APPROVED' && v.redteam.redteam_verdict==='downgraded') expected='CONDITIONAL';
  }
  need(killed.includes(v)===(v.redteam?.redteam_verdict==='killed'), 'killed classification contradicts redteam');
  need(v.verdict===expected && v.verdict===bucket, 'candidate bucket/verdict/gate contradiction');
}
for (const [bucket,rows] of [['APPROVED',approved],['CONDITIONAL',conditional],['REJECTED',rejected]]) {
  for (const v of rows) validateDecision(v,bucket);
}
need(same(ids(candidates), ret.phase_coverage.Verify.expected), 'Verify candidate identity');
need(same(ids(isPunctual?candidates:[...approved,...conditional,...killed]),ret.phase_coverage.Redteam.expected), 'Redteam candidate identity');
need(new Set(ids(candidates.concat(opportunities))).size===candidates.length+opportunities.length, 'duplicate candidate/opportunity');
for (const [key,rows] of Object.entries({verified:candidates,approved,conditional,rejected,killed_by_redteam:killed,opportunities})) {
  need(ret.stats[key]===rows.length, `stats.${key} mismatch`);
}
need(ret.stats.unique>=ret.stats.verified && ret.stats.raw>=ret.stats.unique+ret.stats.opportunities+ret.stats.dropped_existing, 'raw/unique conservation');
for (const key of ['approved_quarantined','approved_overflow_quarantined','conditional_quarantined','opportunities_quarantined','results_quarantined']) {
  need(ret[key]===undefined || (Array.isArray(ret[key]) && ret[key].length===0), `quarantine ${key}`);
}
// Whitelist before merging local bookkeeping metadata.
const safeStats = Object.fromEntries(statKeys.map(k=>[k,ret.stats[k]]));

const date = new Date().toISOString().slice(0, 10);
// punctual run tag 掺入 repo 身份：同日评估不同 repo 是常态，纯日期 tag 会被幂等守卫误杀并诱导 --force 开闸
const repoSlug = isPunctual
  ? (ret.target_repos || []).map(r => String(r).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).join('+').slice(0, 80)
  : '';
const run = isPunctual
  ? `punctual-${ret.run_date && ret.run_date !== 'unknown' ? String(ret.run_date) : date}-${repoSlug || 'unnamed'}`
  : (ret.run_date && ret.run_date !== 'unknown' ? String(ret.run_date) : new Date().toISOString().slice(0, 7));

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
if (isPunctual) {
  lines.push({ date, run, type: 'run_summary', bookkeep: true, mode: 'punctual', target_repos: ret.target_repos, prior_entry_hint: ret.prior_entry_hint || [], ...safeStats });
  for (const v of ret.results) {
    lines.push({
      date, run, type: 'candidate', mode: 'punctual', name: v.name, repo: v.repo, gap_id: v.gap_id,
      verdict: v.verdict, killed_by_redteam: v.killed_by_redteam || undefined,
      weighted_score: v.weighted_score, hard: v.hard, reuse_mode: v.reuse_mode,
      reason: trim((v.redteam && v.redteam.reason) || v.why_useful),
      note: v.no_open_gap_note || undefined,
    });
  }
} else {
lines.push({ date, run, type: 'run_summary', bookkeep: true, ...safeStats });
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
}
const appendText = lines.map(l => JSON.stringify(l)).join('\n') + '\n';

// ── yield_stats 机械更新（录取 = approved + conditional；只改数值行）；punctual 无发现通道，跳过 ──
const conditionalBySource = {};
for (const v of ret.conditional || []) {
  if (v.source_id) conditionalBySource[v.source_id] = (conditionalBySource[v.source_id] || 0) + 1;
}
let registry = readFileSync(registryPath, 'utf8');
const yieldUpdates = [];
const pruneWarnings = [];
// Locate exact source blocks once. A missing yield line cannot consume the next source.
for (const [sid, sy] of Object.entries(isPunctual ? {} : ret.source_yield)) {
  const sourceStarts = [...registry.matchAll(/^([ \t]*)- id: ([^\s#]+)[ \t]*(?:#.*)?$/gm)];
  const matches = sourceStarts.filter(m=>m[2]===sid);
  need(matches.length===1, `registry source ${sid} must exist exactly once`);
  const currentStart = matches[0].index;
  const currentBlockEnd = sourceStarts.find(m=>m.index>currentStart && m[1].length<=matches[0][1].length)?.index ?? registry.length;
  const block = registry.slice(currentStart,currentBlockEnd);
  const yields = [...block.matchAll(/^[ \t]*yield_stats: \{([^}\n]*)\}[ \t]*$/gm)];
  need(yields.length===1, `missing or ambiguous yield_stats in source ${sid}`);
  const fields = yields[0][1].split(',').map(f=>f.trim().split(/:\s*/));
  const keys = ['runs','surfaced','approved','zero_yield_streak'];
  need(same(fields.map(f=>f[0]),keys) && fields.every(f=>f.length===2 && /^\d+$/.test(f[1]) && count(Number(f[1]))), `invalid registry counters ${sid}`);
  const cur = Object.fromEntries(fields.map(([k,v])=>[k,Number(v)]));
  const yieldCount = sy.approved + (conditionalBySource[sid] || 0);
  const next = {runs:cur.runs+1,surfaced:cur.surfaced+sy.surfaced,approved:cur.approved+sy.approved,
    zero_yield_streak:yieldCount>0?0:cur.zero_yield_streak+1};
  need(Object.values(next).every(count), `registry counter overflow ${sid}`);
  const nextLine = yields[0][0].replace(/yield_stats:.*/,`yield_stats: { runs: ${next.runs}, surfaced: ${next.surfaced}, approved: ${next.approved}, zero_yield_streak: ${next.zero_yield_streak} }`);
  const at = currentStart + yields[0].index;
  registry = registry.slice(0,at)+nextLine+registry.slice(at+yields[0][0].length);
  yieldUpdates.push(`${sid}: ${yields[0][0].trim()} → ${nextLine.trim()}`);
  if (next.zero_yield_streak >= PRUNE_N) pruneWarnings.push(`⚠️ ${sid} 连续 ${next.zero_yield_streak} 轮零录取（≥${PRUNE_N}）→ 本期 digest 须提议降权/下线（人裁）`);
}

if (dryRun) {
  console.log(`── dry-run（零写入）──\n将追加 ${lines.length} 行到 candidate-log.jsonl：\n${appendText}`);
  console.log(`yield_stats 更新：\n${yieldUpdates.join('\n') || '（无）'}`);
  pruneWarnings.forEach(w => console.error(w));
  process.exit(0);
}

appendFileSync(logPath, appendText);
if (!isPunctual) writeFileSync(registryPath, registry);
console.log(`✅ candidate-log.jsonl +${lines.length} 行（run=${run}）`);
console.log(`✅ yield_stats 已更新：\n${yieldUpdates.map(u => '   ' + u).join('\n') || '   （无）'}`);
pruneWarnings.forEach(w => console.error(w));
