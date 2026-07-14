#!/usr/bin/env node
// check-agent-contracts.mjs — Agent 编排体系跨文件契约常驻回归（verify S22）
//
// 背景（2026-07-14 编排层评审）：五份 agent 文件是手写散文互相引用，无机器校验守护跨文件契约——
// 7 月上旬路由大改（magicpath 降隐藏、open-design 升首选、新增 skill）在 CLAUDE.md/orchestrator
// 落了，plan-agent/preflight/quality-gate 三处全漏。本检查把当轮修复的承重契约固化为断言：
//   1. OD-first 三处锚（plan-agent 路由 / preflight 表 / quality-gate 触发）
//   2. 状态枚举同步（plan-agent 六值 ↔ WA 完成报告 ↔ quality-gate Step 1 ↔ orchestrator 上报）
//   3. 触发边界对齐（不得再现「2-3 文件」旧边界，CLAUDE.md ≥3 即触发）
//   4. 双重身份（orchestrator/work-agent-template 无 frontmatter；真 subagent 保留）
//   5. orchestrator skill 路径映射表逐行落盘存在
//   6. 模型档速查快照四档名齐全（与 model-routing.yaml tiers 同步）
//   7. plan-agent 能力锚（块0前提门/增量重规划/块5出门自检——防修剪纪律误删）
// 文件缺失/抽取失败即 FAIL——重构改了形状必须同步更新本检查，不许静默跳过。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const failures = [];
let n = 0;
const t = (name, ok, detail = '') => {
  n++;
  if (!ok) failures.push(`A${n} ${name}${detail ? '：' + detail : ''}`);
};

const plan = read('.claude/agents/plan-agent.md');
const orch = read('.claude/agents/orchestrator.md');
const pre = read('.claude/agents/preflight-agent.md');
const qg = read('.claude/agents/quality-gate.md');
const wa = read('.claude/agents/work-agent-template.md');

// 1. OD-first 锚（当轮漂移正是三处全漏，缺一即复发）
t('plan-agent 含 open-design（设计产出路由）', plan.includes('open-design'));
t('plan-agent 设计产出首选非 MagicPath', !/默认使用 MagicPath/.test(plan));
t('preflight 检查表含 open-design 行', /\|\s*`open-design`/.test(pre));
t('quality-gate 前端产出检查含 open-design', /前端产出检查（[^）]*open-design/.test(qg));
t('quality-gate Brief 合规触发含 open-design', /html-prototype、open-design 或 figma-demo/.test(qg));

// 2. 状态枚举同步
for (const s of ['PLANNED', 'IN_PROGRESS', 'DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'])
  t(`plan-agent 六值状态含 ${s}`, plan.includes('`' + s + '`'));
t('work-agent 完成报告可发 NEEDS_CONTEXT', /"status": "NEEDS_CONTEXT"/.test(wa));
t('quality-gate Step 1 处理 NEEDS_CONTEXT', qg.includes('NEEDS_CONTEXT'));
t('orchestrator 处理 BLOCKED/NEEDS_CONTEXT 上报', orch.includes('BLOCKED/NEEDS_CONTEXT'));

// 3. 触发边界对齐
t('plan-agent 无「2-3 文件」旧边界', !plan.includes('2-3 文件'));
t('orchestrator 无「2-3 文件」旧边界', !orch.includes('2-3 文件'));

// 4. 双重身份（daily_governance 机检豁免依赖"无 frontmatter"这个形状）
t('orchestrator.md 无 frontmatter（行为模式文档）', !orch.startsWith('---'));
t('work-agent-template.md 无 frontmatter（prompt 模板）', !wa.startsWith('---'));
t('preflight-agent.md 保留 frontmatter（真 subagent）', pre.startsWith('---'));
t('quality-gate.md 保留 frontmatter（真 subagent）', qg.startsWith('---'));

// 5. orchestrator skill 路径映射表逐行落盘存在（防路径漂移）
const rows = [...orch.matchAll(/^\|\s*`([\w-]+)`\s*\|\s*`(\.claude\/skills\/[^`]+)`\s*\|/gm)];
t('路径映射表抽取到 ≥10 行', rows.length >= 10, `实际 ${rows.length}`);
for (const [, name, p] of rows)
  t(`路径映射 ${name} 落盘存在`, existsSync(join(root, p)), p);

// 6. 模型档速查快照（daily_governance 另有值域校验，此处保四档名在场）
for (const tier of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical'])
  t(`orchestrator 模型档快照含 ${tier}`, orch.includes('| ' + tier + ' '));

// 7. plan-agent 能力锚 + preflight 防裸奔规则
t('plan-agent 含块 0 前提门', plan.includes('块 0 — 前提门'));
t('plan-agent 含增量重规划协议', plan.includes('增量重规划（Replan Protocol'));
t('plan-agent 含块 5 出门自检', plan.includes('块 5 — 出门自检'));
t('preflight 含未列出 WARN 规则', pre.includes('无专属检查行'));

if (failures.length) {
  console.error(`❌ agent 契约回归 FAIL（${failures.length}/${n}）：`);
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`agent-contracts: ${n}/${n} 断言通过（OD-first/状态枚举/边界/双重身份/路径映射/模型档/能力锚）`);
