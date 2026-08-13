#!/usr/bin/env node
// AGENTS.md 治理平价 tripwire（P3 / WS-A5，2026-07-25）。
//
// 为什么需要：AGENTS.md 是 Codex 侧的执行契约，但它长期只被 check-routing-map 守住「路由 TL;DR」
// 一小块，治理面（记忆门禁 / 模型档意图 / 会话隔离 / human-gate / Static Fallback）无锚点 → 曾静默
// 腐烂成陈旧的「CRM 身份 + 已被取代的 G6 共享软链模型」。本门把这些段落钉死，并做**跨源一致性**
// 检查：SF 镜像的 id 集合必须 == static-fallback-allowlist.txt（防两处 SF 分叉）。
import assert from 'assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { LOGICAL_ROLES, ROLE_CONTRACT, resolveRole } from './agent-launcher.mjs';

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
  // 2026-08-05 深审：把「必须 hedge」放宽成「hedge 或(已核验词 + 全文锚)」后，评审用一条
  // **与代码直接矛盾的假断言**（"effort 一律固定为 xhigh、调用方不可配置"，而 .codex/agents/*.toml
  // 明明分三档）拿到 22/22 全绿——两个弱条件相乘不等于强条件：verified 只是词表匹配，
  // 锚是全文级（文件任何角落出现该词即算数）。
  // 修法：已核验路径不能只靠"说了什么"，必须与**磁盘真实状态**对账——
  // 断言 AGENTS.md 声称的可配置性与 .codex/agents/*.toml 的实际档位分布一致。
  // 说假话就会与磁盘对不上，词表再全也过不了。
  const tomlEfforts = (() => {
    const d = join(ROOT, '.codex', 'agents');
    if (!existsSync(d)) return [];
    return readdirSync(d).filter((f) => f.endsWith('.toml'))
      .map((f) => (readFileSync(join(d, f), 'utf8').match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m) || [])[1])
      .filter(Boolean);
  })();
  const tomlIsConfigurable = new Set(tomlEfforts).size > 1;   // 多档并存 = 可配置
  const claimsNotConfigurable = /不可配置|一律固定|固定为\s*\w+|无法配置/.test(agents);
  const groundTruthOk = !(tomlIsConfigurable && claimsNotConfigurable);
  const attested = (t) =>
    (hedge.test(t) || (verified.test(t) && evidenceAnchorNear(t))) && !revert.test(t) && groundTruthOk;
  // 锚的判定范围：全文级太松（评审实证形同虚设），±400 字符太脆（措辞一改就误红）。
  // 取中间——**同一小节内**：主张与其证据本就该在同一节。真正的强度来自上面的
  // groundTruthOk（与 .codex/agents/*.toml 的实际档位分布对账），说假话对不上磁盘就过不了。
  function evidenceAnchorNear() { return /model_reasoning_effort|verify-codex-wiring|tier_to_effort/i.test(mdSec); }

  // 逐个匹配点各取窗口，**任一成立即通过**（2026-08-05 修）：
  // 原实现只看首个匹配，而 §4.8.2 的**标题**本身就含 "reasoning effort"，
  // 于是窗口恒定落在段首 400 字符、看不到写在后文的凭据——断言恒红，是定位 bug 不是内容问题。
  const wins = [...mdSec.matchAll(/per-agent[ \u4e00-\u9fa5]{0,4}(model|档位)|model 参数|reasoning effort/gi)]
    .map((m) => mdSec.slice(Math.max(0, m.index - 160), m.index + 400));
  check('hedge: §4.8.2 model 档位断言有凭据（hedge 或实测锚）且无既成事实反措辞',
    wins.length > 0 && wins.some(attested),
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

// ⑦ ADR-AGENT-001：四个 logical role 必须是仓库原生定义，两端投影同源。
// 这里查「精确名字 + 精确路径 + 定义 bytes hash」，而不是“目录里有几个文件”。
// hash 会在每次运行时从当前 bytes 重算，同时与 review-owned 常量和 launcher
// 解析结果对账。改了 role body 却没显式更新 pin，必须变红。
{
  const EXACT_ROLES = ['plan-agent', 'work-agent', 'oracle', 'quality-gate'];
  const EXPECTED = {
    'plan-agent': { tier: 'reasoning-heavy', claude: '.claude/agents/plan-agent.md', codex: '.codex/agents/plan-agent.toml' },
    'work-agent': { tier: 'core-execution', claude: '.claude/agents/work-agent.md', codex: '.codex/agents/work-agent.toml' },
    oracle: { tier: 'reasoning-heavy', claude: '.claude/agents/oracle.md', codex: '.codex/agents/oracle.toml' },
    'quality-gate': { tier: 'core-execution', claude: '.claude/agents/quality-gate.md', codex: '.codex/agents/quality-gate.toml' },
  };
  // Definition bytes are part of the registered-role identity, not merely files that happen to
  // parse today.  Intentional role-body changes must update this review-owned pin in the same
  // change; an unreviewed body edit therefore fails even when its name/path remain unchanged.
  const EXPECTED_HASHES = {
    claude: {
      'plan-agent': '857aada14b161e98c9b626ef3c856d58dd4c018ddcd6555b266f91e2365862c7',
      'work-agent': 'ef0ff9b632e37067fa0a026118aa4d4915745fcfabd5dbdc0a5558541e5da664',
      oracle: 'de7fe2bd4404f980ff5551eb61dae931cbeee813647c3cb2f1023f5f556e55eb',
      'quality-gate': '36a61adced31a6038e4d87e56b96c158752ffd12a6bd68347410a588726c7fb4',
    },
    codex: {
      'plan-agent': '877d38847e644800d83feedea80702ede9efdf034550fce7c02024313d94f5d2',
      'work-agent': '715a4f694179ad328f54e7a7c3c1e31abe85fa7edfe39a782885e6ae8c700118',
      oracle: '661d1ea7c74c1cbd0f8351bdf516b87d9bde4327e051f176a9fa4c5df3384b87',
      'quality-gate': '49f7d50ebcc4dc8d073b62f43cfb60ebc953fd5c0c00b8f5a9b985b8b828d898',
    },
  };
  const sorted = (xs) => [...xs].sort();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const routingPath = join(ROOT, '.claude', 'skill-os', 'model-routing.yaml');
  const routing = readFileSync(routingPath, 'utf8');

  const indentedBlock = (text, key, indent = 0) => {
    const prefix = `${' '.repeat(indent)}${key}:`;
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.split('#', 1)[0].trimEnd() === prefix);
    if (start < 0) return '';
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() && !line.trimStart().startsWith('#')) {
        const leading = line.length - line.trimStart().length;
        if (leading <= indent) break;
      }
      out.push(line);
    }
    return out.join('\n');
  };
  const scalarMap = (block, indent) => Object.fromEntries(
    [...block.matchAll(new RegExp(`^\\s{${indent}}([a-z0-9-]+):\\s*([a-z0-9-]+)\\s*(?:#.*)?$`, 'gm'))]
      .map((m) => [m[1], m[2]]),
  );
  const logical = scalarMap(indentedBlock(routing, 'logical_roles'), 2);
  const claudeProjection = scalarMap(indentedBlock(routing, 'agents'), 2);
  const codexBlock = indentedBlock(routing, 'codex');
  const codexProjection = scalarMap(indentedBlock(codexBlock, 'agents', 2), 4);
  const tierEffort = scalarMap(indentedBlock(codexBlock, 'tier_to_effort', 2), 4);
  const tierAlias = Object.fromEntries(['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical'].map((tier) => {
    const block = indentedBlock(indentedBlock(routing, 'tiers'), tier, 2);
    return [tier, (block.match(/^\s{4}resolves_to:\s*([a-z0-9-]+)/m) || [])[1] || ''];
  }));

  check('roles: launcher logical role set 精确为四个注册名',
    same(sorted(LOGICAL_ROLES), sorted(EXACT_ROLES)),
    `actual=${JSON.stringify(LOGICAL_ROLES)}`);
  check('roles: launcher ROLE_CONTRACT 名字/路径/tier 精确',
    same(ROLE_CONTRACT, EXPECTED), `actual=${JSON.stringify(ROLE_CONTRACT)}`);
  check('roles: model-routing logical_roles 精确为四个注册名',
    same(sorted(Object.keys(logical)), sorted(EXACT_ROLES)),
    `actual=${JSON.stringify(logical)}`);

  const projectionErrors = [];
  for (const role of EXACT_ROLES) {
    const tier = EXPECTED[role].tier;
    if (logical[role] !== tier) projectionErrors.push(`${role}:logical=${logical[role] || '缺失'}≠${tier}`);
    if (claudeProjection[role] !== tierAlias[tier]) {
      projectionErrors.push(`${role}:claude=${claudeProjection[role] || '缺失'}≠tier.${tier}=${tierAlias[tier] || '缺失'}`);
    }
    if (codexProjection[role] !== tierEffort[tier]) {
      projectionErrors.push(`${role}:codex=${codexProjection[role] || '缺失'}≠tier.${tier}=${tierEffort[tier] || '缺失'}`);
    }
  }
  check('roles: logical tier 与 Claude alias / Codex effort 投影同源',
    projectionErrors.length === 0, projectionErrors.join(', '));

  const claudeDir = join(ROOT, '.claude', 'agents');
  const claudeNames = new Map();
  for (const file of readdirSync(claudeDir).filter((name) => name.endsWith('.md'))) {
    const text = readFileSync(join(claudeDir, file), 'utf8');
    if (!text.startsWith('---\n')) continue;
    const end = text.indexOf('\n---\n', 4);
    const name = end < 0 ? '' : (text.slice(4, end).match(/^name:\s*([^\s#]+)/m) || [])[1];
    if (name) claudeNames.set(name, [...(claudeNames.get(name) || []), file]);
  }
  const codexDir = join(ROOT, '.codex', 'agents');
  const codexNames = new Map();
  for (const file of readdirSync(codexDir).filter((name) => name.endsWith('.toml'))) {
    const text = readFileSync(join(codexDir, file), 'utf8');
    const name = (text.match(/^name\s*=\s*"([^"]+)"/m) || [])[1];
    if (name) codexNames.set(name, [...(codexNames.get(name) || []), file]);
  }
  const registrationErrors = [];
  for (const role of EXACT_ROLES) {
    const claudeFile = EXPECTED[role].claude.split('/').at(-1);
    const codexFile = EXPECTED[role].codex.split('/').at(-1);
    if (!same(claudeNames.get(role) || [], [claudeFile])) registrationErrors.push(`${role}:Claude=${claudeNames.get(role) || '缺失'}`);
    if (!same(codexNames.get(role) || [], [codexFile])) registrationErrors.push(`${role}:Codex=${codexNames.get(role) || '缺失'}`);
  }
  check('roles: Claude/Codex 四个精确注册名各有且仅有一份定义',
    registrationErrors.length === 0, registrationErrors.join(', '));

  const hashManifest = {};
  const hashErrors = [];
  for (const harness of ['claude', 'codex']) {
    hashManifest[harness] = {};
    for (const role of EXACT_ROLES) {
      try {
        const resolved = resolveRole({ root: ROOT, role, harness });
        const expectedPath = EXPECTED[role][harness];
        const diskHash = sha256(readFileSync(join(ROOT, expectedPath)));
        hashManifest[harness][role] = diskHash;
        if (resolved.definition_path !== expectedPath) hashErrors.push(`${harness}/${role}:path=${resolved.definition_path}`);
        if (resolved.definition_sha256 !== diskHash) hashErrors.push(`${harness}/${role}:hash mismatch`);
        if (diskHash !== EXPECTED_HASHES[harness][role]) hashErrors.push(`${harness}/${role}:unpinned-bytes=${diskHash}`);
        if (resolved.tier !== EXPECTED[role].tier) hashErrors.push(`${harness}/${role}:tier=${resolved.tier}`);
      } catch (error) {
        hashErrors.push(`${harness}/${role}:${error.message}`);
      }
    }
  }
  const hashes = Object.values(hashManifest).flatMap((roles) => Object.values(roles));
  if (hashes.length !== 8 || new Set(hashes).size !== 8 || hashes.some((hash) => !/^[a-f0-9]{64}$/.test(hash))) {
    hashErrors.push(`hash-set=count:${hashes.length}/unique:${new Set(hashes).size}`);
  }
  check('roles: 八份定义 bytes 的 SHA-256 与 launcher 解析精确一致',
    hashErrors.length === 0, hashErrors.join(', '));
  console.log(`ROLE_DEFINITION_HASHES ${JSON.stringify(hashManifest)}`);

  const template = readFileSync(join(ROOT, '.claude', 'agents', 'work-agent-template.md'), 'utf8');
  check('roles: work-agent-template 保持未注册且无 Codex 同名 adapter',
    !template.startsWith('---\n')
      && !existsSync(join(ROOT, '.codex', 'agents', 'work-agent-template.toml'))
      && /\b不注册为 subagent\b|不注册为 subagent/.test(template),
    '模板不得带 frontmatter/同名 TOML，也不得成为 dispatch 目标');

  // 只扫可执行 role call graph，不扫历史审计档：role 定义、orchestrator、
  // 引用四 role 之一的 first-class skill、workflow 源和其 Codex runner。
  const callGraphFiles = new Set([
    '.claude/agents/orchestrator.md',
    '.claude/agents/work-agent-template.md',
    '.codex/workflow-runner.mjs',
    'scripts/agent-launcher.mjs',
    ...Object.values(EXPECTED).flatMap((entry) => [entry.claude, entry.codex]),
  ]);
  const skillRoot = join(ROOT, '.claude', 'skills', 'office');
  const rolePattern = /\b(?:plan-agent|work-agent|oracle|quality-gate)\b/i;
  for (const entry of readdirSync(skillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = `.claude/skills/office/${entry.name}/SKILL.md`;
    if (existsSync(join(ROOT, rel)) && rolePattern.test(readFileSync(join(ROOT, rel), 'utf8'))) callGraphFiles.add(rel);
  }
  const workflowRoot = join(ROOT, '.claude', 'workflows');
  if (existsSync(workflowRoot)) for (const file of readdirSync(workflowRoot).filter((name) => name.endsWith('.js'))) {
    callGraphFiles.add(`.claude/workflows/${file}`);
  }
  const lineup = ((routing.match(/^known_lineup:\s*\[([^\]]+)\]/m) || [])[1] || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const forbiddenAliases = [...new Set(['fable', 'opus', 'sonnet', 'haiku', ...lineup])];
  const aliasPattern = new RegExp(`\\b(?:${forbiddenAliases.join('|')})\\b`, 'gi');
  const aliasLeaks = [];
  for (const rel of sorted(callGraphFiles)) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const lines = text.split('\n');
    const skill = /^\.claude\/skills\/office\/[^/]+\/SKILL\.md$/.test(rel);
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      aliasPattern.lastIndex = 0;
      const found = [...lines[i].matchAll(aliasPattern)];
      if (!found.length) continue;
      // Skill prose may cite a routing example/history without making a dispatch decision.  A
      // direct pin is an alias on/near a role call, dispatch/spawn instruction, model field, or
      // recommended-model declaration.  Core definitions/orchestrator/runner/workflows are all
      // executable dispatch surfaces, so any alias in those files remains a hard failure.
      const window = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      const direct = !skill
        || rolePattern.test(window)
        || /\brecommended-model\b|\b(?:subagent_type|agent_type)\b|\b(?:dispatch|spawn)\b|\bmodel\s*[:=]/i.test(window);
      if (direct) hits.push(...found.map((m) => `${m[0]}@${i + 1}`));
    }
    if (hits.length) aliasLeaks.push(`${rel}:${hits.join(',')}`);
  }
  check('roles: 可执行 role call graph 不在 model-routing.yaml 之外直写模型 alias',
    aliasLeaks.length === 0, aliasLeaks.join(' | '));

  const orch = readFileSync(join(ROOT, '.claude', 'agents', 'orchestrator.md'), 'utf8');
  const runner = readFileSync(join(ROOT, '.codex', 'workflow-runner.mjs'), 'utf8');
  const activationPath = join(ROOT, '.claude', 'skill-os', 'native-agent-activation.json');
  let activation;
  try { activation = JSON.parse(readFileSync(activationPath, 'utf8')); } catch { activation = null; }
  const activationKeys = ['schema_version', 'status', 'proof_receipt_path', 'proof_receipt_sha256', 'activated_at'];
  const activationExact = activation && same(sorted(Object.keys(activation)), sorted(activationKeys))
    && activation.schema_version === 'luca.native-agent-activation.v1'
    && ['DORMANT', 'ACTIVE'].includes(activation.status);
  check('roles: native route activation state 精确且 fail-closed', activationExact,
    activation ? `status=${activation.status}` : 'missing/invalid activation state');
  const oracleSkillFiles = [
    '.claude/skills/office/brainstorm/SKILL.md',
    '.claude/skills/office/ux-brainstorm/SKILL.md',
    '.claude/skills/office/ux-research/SKILL.md',
    '.claude/skills/office/deepresearch/SKILL.md',
  ];
  const substitutionErrors = [];
  if (!/forbiddenClaims\s*=\s*\[[^\]]*agent_type[^\]]*subagent_type[^\]]*logical_role[^\]]*receipt[^\]]*evidence[^\]]*\]/s.test(runner)
      || !/Object\.hasOwn\(opts, key\)/.test(runner)
      || !/runner 不能证明 native role\/receipt/.test(runner)) {
    substitutionErrors.push('workflow-runner 未 fail-closed 拒绝 role/evidence claim');
  }
  if (activationExact && activation.status === 'DORMANT') {
    if (activation.proof_receipt_path !== null || activation.proof_receipt_sha256 !== null
      || activation.activated_at !== null) substitutionErrors.push('DORMANT state 携带伪 proof/activation 数据');
    const premature = [
      ['.claude/agents/orchestrator.md', orch, /Native role invariant|按精确注册名 native spawn|luca\.work-packet\.v1 JSON/],
      ...oracleSkillFiles.map((rel) => [rel, readFileSync(join(ROOT, rel), 'utf8'), /harness-native child mechanism|native child 机制/]),
    ].filter(([, text, pattern]) => pattern.test(text)).map(([rel]) => rel);
    if (premature.length) substitutionErrors.push(`DORMANT 时存在提前激活 call site: ${premature.join(',')}`);
  } else if (activationExact) {
    if (!/^[a-f0-9]{64}$/.test(activation.proof_receipt_sha256 || '')
      || typeof activation.proof_receipt_path !== 'string' || !activation.proof_receipt_path
      || typeof activation.activated_at !== 'string' || !Number.isFinite(Date.parse(activation.activated_at))) {
      substitutionErrors.push('ACTIVE state 缺 exact live proof binding');
    }
    if (!EXACT_ROLES.every((role) => orch.includes(`\`${role}\``))) substitutionErrors.push('orchestrator 未声明精确四 role');
    if (!/Workflow runner[^\n]{0,160}(?:不能|不是|never)/i.test(orch)
        && !/(?:不能|不是|never)[^\n]{0,160}Workflow runner/i.test(orch)) {
      substitutionErrors.push('orchestrator 缺 Workflow runner 不可替代 role 声明');
    }
    for (const rel of oracleSkillFiles) {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      if (!/subagent_type\s*=\s*["']oracle["']/.test(text)
          || !/native child/i.test(text)
          || !/BLOCKED/.test(text)
          || !/generic agent/i.test(text)) {
        substitutionErrors.push(`${rel} 未按精确 oracle native role fail-closed`);
      }
    }
  }
  check('roles: generic agent / root reasoning / Workflow runner 不得替代 native role',
    substitutionErrors.length === 0, substitutionErrors.join(' | '));
}

console.log(`\n=== check-agents-parity summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
