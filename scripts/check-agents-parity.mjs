#!/usr/bin/env node
// AGENTS.md 治理平价 tripwire（P3 / WS-A5，2026-07-25）。
//
// 为什么需要：AGENTS.md 是 Codex 侧的执行契约，但它长期只被 check-routing-map 守住「路由 TL;DR」
// 一小块，治理面（记忆门禁 / 模型档意图 / 会话隔离 / human-gate / Static Fallback）无锚点 → 曾静默
// 腐烂成陈旧的「CRM 身份 + 已被取代的 G6 共享软链模型」。本门把这些段落钉死，并做**跨源一致性**
// 检查：SF 镜像的 id 集合必须 == static-fallback-allowlist.txt（防两处 SF 分叉）。
import assert from 'assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// 深审：用 CLAUDE_PROJECT_DIR 定位会在双检出下验错仓并报绿（实测）。改脚本相对：
// 本文件在 scripts/ → 上 1 级 = 仓根，与被验文件恒同仓。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ⓪ 反空壳门（深审：裸 includes 可被 12 行空壳骗过 —— 只要把关键词堆在一起就 15/15 全绿）。
// 治理段落必须有**实质体量**且结构完整，光有关键词不算。
{
  const govStart = agents.indexOf('## 4.8 Governance Parity');
  const govEnd = agents.indexOf('\n## 5.', govStart > 0 ? govStart : 0);
  const gov = govStart > 0 && govEnd > govStart ? agents.slice(govStart, govEnd) : '';
  check('anti-shell: §4.8 存在且成节', gov.length > 0, '找不到 §4.8 Governance Parity 到 §5 之间的内容');
  check('anti-shell: §4.8 有实质体量（≥1500 字符）', gov.length >= 1500, `实际 ${gov.length} 字符——疑似被掏空成关键词壳`);
  const subs = ['4.8.1', '4.8.2', '4.8.3', '4.8.4', '4.8.5'];
  const missSub = subs.filter((x) => !gov.includes(x));
  check('anti-shell: §4.8 五个子节齐全', missSub.length === 0, `缺 ${missSub.join(',')}`);
  check('anti-shell: AGENTS.md 整体未被掏空（≥400 行）', agents.split('\n').length >= 400,
    `实际 ${agents.split('\n').length} 行`);
}

// ① 治理段落存在性锚点（内容删了/改跑题即红）
const ANCHORS = [
  ['记忆门禁·默认不存', '默认不存'],
  ['记忆门禁·四强信号', '四强信号'],
  ['记忆门禁·归因阶梯', 'correction-attribution.md'],
  ['记忆门禁·三分归属', 'propose_semantic.py'],
  ['记忆红线 SC-20260523-003', 'SC-20260523-003'],
  ['模型档·真值源指针', 'model-routing.yaml'],
  ['模型档·能力档意图', 'reasoning-heavy'],
  ['会话隔离·方案A pin', '.session-project-'],
  ['human-gate 全局规则', '缺结构化工具'],
  ['Static Fallback 节', '关键约束速查'],
];
for (const [name, needle] of ANCHORS) check(`anchor: ${name}`, agents.includes(needle), `缺 "${needle}"`);

// ② 陈旧面回归门：产品/品牌不得再硬编码进 AGENTS.md（已转 profile 激活）
check('no-stale: 产品身份未硬编码', !agents.includes('纷享销客'), '出现 纷享销客 → §0 身份又被写死');
check('no-stale: 品牌色未硬编码', !agents.includes('#FF8000'), '出现 #FF8000 → 品牌应 profile 激活');
check('no-stale: 已被取代的共享软链模型未复活',
  !agents.includes('still a global shared symlink'),
  '出现旧 G6 表述 → 应为方案A per-session pin');

// ③ 跨源一致性：SF 镜像 id 集合 == allowlist（防两处 SF 分叉）
{
  const allow = readFileSync(join(ROOT, 'memory/semantic/static-fallback-allowlist.txt'), 'utf8')
    .split('\n').map(l => l.split('#')[0].trim()).filter(Boolean).sort();
  const sfSection = agents.slice(agents.indexOf('关键约束速查'));
  const mirrored = [...new Set([...sfSection.matchAll(/\[(SF-\d+|SC-\d{8}-\d+)\s*\//g)].map(m => m[1]))].sort();
  const same = JSON.stringify(allow) === JSON.stringify(mirrored);
  check('cross-source: AGENTS.md SF ids == allowlist', same,
    `allowlist=${JSON.stringify(allow)} vs AGENTS.md=${JSON.stringify(mirrored)}`);
}

// ④ 分层诚实性：Tier-2/3 降级必须显式声明「弱于 Claude」，不得假装等价
check('honesty: 降级面显式声明弱于 Claude', /弱于 Claude/.test(agents),
  '缺「弱于 Claude」声明 → 降级被写成等价');

console.log(`\n=== check-agents-parity summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
