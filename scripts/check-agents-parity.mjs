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

// ⑤ [U] hedge 守护（审计 Round1 验证 agent 发现的 MISSING_GATE）：AGENTS.md 关于 Codex per-agent
// model 参数的断言必须带未核验 hedge——该 Codex 事实本仓从未 spike，无门则未来编辑可静默退回
// 「Codex 无 model 参数」的既成事实断言，翻掉 §0.5b「model-tier LOCKS」而无告警。
{
  const hedge = /未核验|尚未.{0,4}核验|unverified|pending.{0,6}spike|保守假设/i;
  // §4.8.2 model routing 段（到 §4.8.3 前）
  const i2 = agents.indexOf('4.8.2'); const i3 = agents.indexOf('4.8.3');
  const mdSec = i2 >= 0 && i3 > i2 ? agents.slice(i2, i3) : '';
  // Round2 强化 + Round3 加固：hedge 就近判定 **且** 就近不得出现既成事实反措辞。整段/整窗只查 hedge
  // 存在性时，半回退（把 model 句翻成"无法传/已确认/has no"、却在窗口别处保留一个 hedge 词）会误 PASS。
  const revert = /无法.{0,4}传|已(?:经)?确认|Codex has no per-agent|Codex cannot .{0,12}model/i;

  // 2026-08-04 演进：spike 已真做（Codex subagent toml 实测支持 model / model_reasoning_effort）。
  // 门的不变量从来不是"永远保持 hedge"，而是**断言不得无凭据**——未核验时凭据是 hedge，
  // 已核验时凭据是实测锚。若只认 hedge，spike 完成后守的就是一句假话，且会逼后来者
  // 要么写假 hedge 要么删掉整个门（两条都比现在糟）。故补一条**更严**的合法解除路径：
  // 必须同时出现「已核验措辞」+「可追的实测落点」，缺一不可；revert 反措辞检测照旧生效。
  // 判定粒度刻意分两级：hedge / 已核验措辞 / 反措辞按**就近窗口**判（防"半回退"——把某一句
  // 翻成既成事实、却靠段落别处残留的词蒙混过关，这是 Round2/Round3 加固的原意，不可放宽）；
  // 而实测锚按**全文**判——它是可追的落点凭据（真值源字段名 / 验收脚本名），本就散落在别处，
  // 要求它紧贴该句会逼出复读式冗余。锚被整体删除时仍会转红（已变异测试验证）。
  const verified = /spike 已完成|已核验|实测推翻|实测(?:证据|校正|枚举)|被实测/i;
  const evidenceAnchor = /model_reasoning_effort|verify-codex-wiring|tier_to_effort/i;
  const hasAnchor = evidenceAnchor.test(agents);
  const attested = (t) => (hedge.test(t) || (verified.test(t) && hasAnchor)) && !revert.test(t);

  const mIdx = mdSec.search(/per-agent model|model 参数|reasoning effort/i);
  const mWin = mIdx >= 0 ? mdSec.slice(Math.max(0, mIdx - 160), mIdx + 400) : '';
  check('hedge: §4.8.2 model 档位断言有凭据（hedge 或实测锚）且无既成事实反措辞',
    mIdx >= 0 && attested(mWin),
    '§4.8.2 model 句缺凭据（既无 hedge 也无实测锚）或现既成事实措辞（无法传/已确认）→ 恐退回断言');
  // §11 Non-goal：整条目查 hedge 存在性 **+ 反措辞检测**（Round3 加固）。反措辞是真防护——半回退把
  // 本句翻成"Codex has no per-agent model"既成事实时，即便条目别处留 hedge 词也会被 revert 检测抓住。
  // 大小写不敏感：条目首字母会随行文改写（Do not attempt per-agent… → **Per-agent…**），
  // indexOf 恒敏感会让本 check 静默恒 FAIL（2026-08-04 实证，一度被误读成"反措辞被抓到"）。
  const ng = agents.search(/per-agent model-tier dispatch/i);
  const ngItem = ng >= 0 ? agents.slice(ng, ng + 600) : '';
  check('hedge: §11 model dispatch 条目有凭据（hedge 或实测锚）且无既成事实反措辞',
    ng >= 0 && attested(ngItem),
    '§11 model dispatch 缺凭据（既无 hedge 也无实测锚）或现既成事实断言（Codex has no per-agent model）');
}

// ⑥ 无字面绝对路径（审计 CR0022 的门守护）：项目路径应全用 <PROJECTS_ROOT>；仅 PROJECTS_ROOT
// 定义行（$HOME/Desktop/项目 或 LUCA_PROJECTS_ROOT）允许出现字面 Desktop/项目。
{
  // Round3 零豁免：无任何合法行需要字面 /Users/luca/Desktop（PROJECTS_ROOT 定义行用 $HOME/Desktop，
  // 非字面 /Users/luca）。旧 LUCA_PROJECTS_ROOT 豁免是死豁免且开旁路（同行硬编码绝对路径会被漏放）→ 删。
  const bad = agents.split('\n').filter((l) => l.includes('/Users/luca/Desktop'));
  check('no-abs-path: 无字面 /Users/luca/Desktop 硬编码（除 PROJECTS_ROOT 定义行）',
    bad.length === 0, `残留 ${bad.length} 行硬编码绝对路径`);
}

console.log(`\n=== check-agents-parity summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
