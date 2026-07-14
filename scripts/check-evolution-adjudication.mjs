#!/usr/bin/env node
// check-evolution-adjudication.mjs — 演进 scout 裁决核心常驻回归（verify S21）
//
// 守护 2026-07-14 评审加固轮的三项承重语义（防未来重构静默退化）：
//   1. 硬门 default-deny：非规范 "PASS"（"FAIL (…)"/"UNKNOWN"/小写/缺字段）一律 REJECTED
//   2. 权重按 reuse_mode 分档：adapt-idea/port-pattern 走 pattern 档（fit/quality 40+40），
//      install 与未知 reuse_mode 走 install 苛刻档
//   3. redteam null 兜底 = downgraded（决定层失败不得视为无异议）
//
// 实现说明：用正则从两个 workflow 文件原样抽出 GATE_WEIGHTS/adjudicate/redteam 兜底跑断言——
// 测的是已发货代码原文。抽取失败本身即 FAIL（重构改了函数形状 → 必须同步更新本检查，不许静默跳过）。

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let n = 0;
const t = (name, fn) => {
  n++;
  try { fn(); } catch (e) { failures.push(`J${n} ${name}: ${e.message}`); }
};
const extract = (src, re, what, file) => {
  const m = src.match(re);
  if (!m) { console.error(`❌ 抽取失败：${file} 里找不到 ${what}——重构改了形状？同步更新本检查的正则与断言。`); process.exit(1); }
  return m;
};

// ── framework-evolution-scout ──
const fesPath = '.claude/workflows/framework-evolution-scout.js';
const src = readFileSync(join(root, fesPath), 'utf8');
const weights = extract(src, /const GATE_WEIGHTS = \{[\s\S]*?\n\}/, 'GATE_WEIGHTS', fesPath)[0];
const adjSrc = extract(src, /function adjudicate\(v\) \{[\s\S]*?\n\}/, 'adjudicate()', fesPath)[0];
const { adjudicate } = new Function(`${weights}\n${adjSrc}\nreturn { adjudicate };`)();

const PASS5 = { safety: 'PASS', compatibility: 'PASS', non_redundancy: 'PASS', gap_addressed: 'PASS', provenance: 'PASS' };

t('全 PASS + 高分 install → APPROVED', () => {
  const r = adjudicate({ hard: PASS5, scores: { fit: 3, quality: 3, adoption: 2, maintenance: 3 }, reuse_mode: 'install' });
  assert.equal(r.verdict, 'APPROVED'); assert.equal(r.hard_fail, false);
});
t('default-deny: "FAIL (no license)" → REJECTED', () => {
  const r = adjudicate({ hard: { ...PASS5, safety: 'FAIL (no license)' }, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'REJECTED');
});
t('default-deny: "UNKNOWN" → REJECTED', () => {
  const r = adjudicate({ hard: { ...PASS5, provenance: 'UNKNOWN' }, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'REJECTED');
});
t('default-deny: 缺 gap_addressed 字段 → REJECTED', () => {
  const { gap_addressed, ...four } = PASS5;
  const r = adjudicate({ hard: four, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'REJECTED');
});
t('default-deny: 小写 "fail" → REJECTED', () => {
  const r = adjudicate({ hard: { ...PASS5, safety: 'fail' }, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'REJECTED');
});
t('权重分档: adapt-idea 小仓(3/3/0/1) → 83 APPROVED', () => {
  const r = adjudicate({ hard: PASS5, scores: { fit: 3, quality: 3, adoption: 0, maintenance: 1 }, reuse_mode: 'adapt-idea' });
  assert.equal(r.weighted_score, 83); assert.equal(r.verdict, 'APPROVED');
});
t('权重分档: 同分数 install 档 → 67 CONDITIONAL', () => {
  const r = adjudicate({ hard: PASS5, scores: { fit: 3, quality: 3, adoption: 0, maintenance: 1 }, reuse_mode: 'install' });
  assert.equal(r.weighted_score, 67); assert.equal(r.verdict, 'CONDITIONAL');
});
t('reuse_mode 缺失 → install 苛刻档（怀疑默认）', () => {
  const r = adjudicate({ hard: PASS5, scores: { fit: 3, quality: 3, adoption: 0, maintenance: 1 } });
  assert.equal(r.weighted_score, 67);
});
t('port-pattern 前缀命中 pattern 档', () => {
  const r = adjudicate({ hard: PASS5, scores: { fit: 3, quality: 3, adoption: 0, maintenance: 0 }, reuse_mode: 'port-pattern' });
  assert.equal(r.weighted_score, 80);
});

// redteam null 兜底语义
const fbSrc = extract(src, /redteam: r \|\| (\{[^}]*\})/, 'redteam null 兜底对象', fesPath)[1];
const fallback = new Function(`return ${fbSrc}`)();
t('redteam null 兜底 = downgraded（非 stands）', () => {
  assert.equal(fallback.redteam_verdict, 'downgraded');
});
t('downgraded 兜底归入 conditional 而非 approved（:redteam 应用层过滤语义）', () => {
  const v = { verdict: 'APPROVED', redteam: fallback };
  assert.equal(v.verdict === 'APPROVED' && v.redteam.redteam_verdict === 'stands', false);
  assert.equal(v.verdict === 'CONDITIONAL' || v.redteam.redteam_verdict === 'downgraded', true);
});

// ── external-skill-scout 同款 default-deny ──
const essPath = '.claude/workflows/external-skill-scout.js';
const src2 = readFileSync(join(root, essPath), 'utf8');
const w2 = extract(src2, /const GATE_WEIGHTS = \{[^\n]*\}/, 'GATE_WEIGHTS', essPath)[0];
const adj2 = extract(src2, /function adjudicate\(v\) \{[\s\S]*?\n\}/, 'adjudicate()', essPath)[0];
const { adjudicate: adjE } = new Function(`${w2}\n${adj2}\nreturn { adjudicate };`)();

t('external-scout: "PASS with caveats" → REJECTED', () => {
  const r = adjE({ hard: { safety: 'PASS with caveats', compatibility: 'PASS', non_redundancy: 'PASS' }, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'REJECTED');
});
t('external-scout: 全 PASS 高分 → APPROVED', () => {
  const r = adjE({ hard: { safety: 'PASS', compatibility: 'PASS', non_redundancy: 'PASS' }, scores: { fit: 3, quality: 3, adoption: 3, maintenance: 3 } });
  assert.equal(r.verdict, 'APPROVED');
});

if (failures.length) {
  console.error(`❌ 演进裁决回归 FAIL（${failures.length}/${n}）：`);
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`evolution-adjudication: ${n}/${n} 断言通过（default-deny/权重分档/redteam兜底，测已发货代码原文）`);
