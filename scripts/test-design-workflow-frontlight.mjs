#!/usr/bin/env node
// Narrow source tripwires, not a skill executor, semantic judge or native-parity test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.ok(args.every(arg => ['--mutation', '--baseline'].includes(arg)), 'Usage: test-design-workflow-frontlight.mjs [--mutation] [--baseline]');
const paths = {
  deep: '.claude/skills/office/deepresearch/SKILL.md',
  research: '.claude/skills/office/ux-research/SKILL.md',
  focused: '.claude/skills/office/deepresearch/references/focused-research.md',
  product: '.claude/skills/office/brainstorm/SKILL.md',
  prd: '.claude/skills/office/brainstorm/references/prd-template.md',
  ux: '.claude/skills/office/ux-brainstorm/SKILL.md',
  proposal: '.claude/skills/office/ux-brainstorm/references/design-proposal-template.md',
  architecture: '.claude/skills/office/ux-brainstorm/references/interaction-architecture-template.md',
  oracle: '.claude/skills/office/ux-brainstorm/references/adversarial-review.md',
  pressure: '.claude/skills/office/ux-brainstorm/references/pressure-test.md',
  gate: '.claude/agents/quality-gate.md',
  handoff: '.claude/skills/office/references/handoff-protocol.md',
  brief: '.claude/skills/office/design-brief/SKILL.md',
  input: '.claude/skills/office/design-brief/references/input-contract.md',
  packet: '.claude/skills/office/design-brief/references/output-templates.md',
  briefSchema: '.claude/skills/office/design-brief/SCHEMA.md',
  scan: '.claude/skills/office/references/competitor-scan.md',
  guidance: '.claude/agents/references/plan-design-guidance.md',
  method: '.claude/skills/office/ux-research/references/competitor-analysis.md',
};
const diskSource = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(resolve(root, path), 'utf8')]));
const baseline = args.includes('--baseline') ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() : null;
const source = baseline
  ? Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' })]))
  : diskSource;
const sha = text => createHash('sha256').update(text).digest('hex');
const section = (body, start, end) => {
  const at = body.indexOf(start);
  assert.ok(at >= 0, `missing section ${start}`);
  const stop = end ? body.indexOf(end, at + start.length) : body.length;
  assert.ok(stop >= at, `missing end ${end}`);
  return body.slice(at, stop);
};
const has = (text, pattern) => assert.match(text, pattern);
const lacks = (text, pattern) => assert.doesNotMatch(text, pattern);
const checks = [];
const check = (id, name, test) => checks.push({ id, name, test });
for (const key of ['product', 'ux']) {
  check(`F01-${key}`, 'scope does not select effort', s => {
    has(s[key], key === 'product' ? /New\/mixed labels alone never change focused to full/ : /new\/mixed 标签本身不把 focused 升 full/);
    has(s[key], key === 'product' ? /do not load or dispatch the fixed\nA\/B\/C/ : /不加载\/派发固定 A\/B\/C/);
  });
  check(`F03-${key}-presentation`, 'local presentation uses actual options and skips repeat votes', s => {
    const body = section(s[key], '### 4.2', '### 4.3');
    lacks(body, /Three approaches|fourth direction|new set of 2-3|有三个方向|第四个方向|新的2-3个方案集/);
    has(body, key === 'product' ? /retained direction.*no repeat vote/s : /保留方向.*不重复投票/s);
    has(body, key === 'product' ? /real choice.*AskUserQuestion/s : /真实未决.*AskUserQuestion/s);
  });
  check(`F02-${key}`, 'actual tradeoff retains mechanism comparison and human choice', s => {
    const body = section(s[key], '### 4.1', '### 4.3');
    has(body, key === 'product' ? /compare two mechanisms.*user's choice/s : /机制不同.*真实未决/s);
    has(body, key === 'product' ? /Use a AskUserQuestion \(single-select\): options are/ : /使用AskUserQuestion（单选）：选项为/);
  });
  check(`F10-${key}-oracle`, 'independent current review and UNKNOWN gate survive', s => {
    const body = section(s[key], '### 5.2', '## Phase 6');
    has(body, /quality-gate.*MR-004.*冷.*前台/s);
    has(body, /required criterion.*UNKNOWN.*阻断/);
    has(body, /草稿.*变更.*新 hash.*冷审/);
  });
}
for (const key of ['deep', 'research']) {
  check(`F10-${key}-completion`, 'completion retains actual mode provenance and all critical risks', s => {
    const body = section(s[key], '## 完成协议');
    has(body, /原始来源.*版本/);
    has(body, /确认选择/);
    has(body, /证据边界/);
    has(body, /风险.*摘要≤3条.*全部关键风险保留或完整引用/);
    has(body, /质量头.*gate_result.*criteria/);
    has(body, /node scripts\/check-quality-gates\.mjs --handoff/);
    has(body, /completion_owner=Orchestrator/);
    has(body, /standalone.*无节点不写状态/s);
    lacks(body, /多维度研究关键发现|风险\*\*（≤3条）/);
  });
}
check('F03-prd-local', 'local PRD template honors focused without fake rejections', s => {
  has(s.prd, /There are four scope tiers/);
  has(s.prd, /\*\*Discovery Mode\*\*:.*selection source/);
  has(section(s.prd, '## Approaches Considered', '## Success Criteria'), /focused.*retained direction.*actual rejections/s);
  has(section(s.prd, '## Finalization Checklist'), /7\..*full.*focused.*retained direction/);
});
check('F04-ux-local', 'local UX phases do not demand fictional AI or tables', s => {
  const phase7 = section(s.ux, '### 7.3', '### 7.4');
  has(phase7, /仅适用表格.*有源 N\/A/);
  has(phase7, /仅实际存在.*稳定编号/s);
  const anti = section(s.ux, '## Anti-Patterns', '## 完成协议');
  has(anti, /full.*3个方案/);
  has(anti, /AI 相关 full.*范式转变/);
  has(anti, /full.*被否定方向.*focused.*真实否决/);
  has(section(s.ux, '## 完成协议'), /质量头.*criteria/);
  has(section(s.ux, '## 完成协议'), /node scripts\/check-quality-gates\.mjs --handoff/);
});
check('F04-proposal-local', 'local proposal checks bind AI applicability and real options', s => {
  has(section(s.proposal, '## 方案探索', '## 推荐方案'), /只填写实际方案.*保留方向/s);
  has(section(s.proposal, '### 演进路径', '## 假设前提'), /非 AI.*有源 N\/A/s);
  has(section(s.proposal, '## 被否定的方向', '## 假设前提'), /focused.*真实否决.*不凑数/s);
  has(section(s.proposal, '## Finalization Checklist'), /6\..*AI 相关 full/);
  has(section(s.proposal, '## Finalization Checklist'), /10\..*full.*focused/);
});
check('F04-architecture-local', 'local architecture checks cover actual tasks and recovery only', s => {
  has(section(s.architecture, '### 1.2', '### 1.3'), /focused.*当前任务.*不补造/s);
  has(section(s.architecture, '### 1.5', '### 1.6'), /实际存在的任务类型/);
  has(section(s.architecture, '## 3.', '## 4.'), /非 Agent.*实际权限.*有源 N\/A/s);
  has(section(s.architecture, '## 4.', '## 5.'), /未确认阈值.*UNKNOWN.*不编造/s);
  const checklist = section(s.architecture, '## Finalization Checklist');
  has(checklist, /1\..*focused.*当前任务/);
  has(checklist, /8\..*实际适用.*量化.*不编造/);
  has(checklist, /9\..*非 Agent.*真实系统.*恢复/);
});
check('F04-oracle-local', 'Oracle retains five dimensions without quota or AI fiction', s => {
  for (let dimension = 1; dimension <= 5; dimension++) has(s.oracle, new RegExp(`### Dimension ${dimension}:`));
  const readiness = section(s.oracle, '### Dimension 5:', '## Independent Invocation');
  has(readiness, /full.*≥2.*AI.*focused.*真实否决/s);
  has(readiness, /AI 相关.*演进.*非 AI.*有源 N\/A/);
  has(readiness, /真实否决.*缺失.*HIGH/);
});
check('F07-escape', 'impatience cannot waive critical unknowns or real choices', s => {
  const body = section(s.pressure, '## Part 6:', '## Part 7:');
  has(body, /关键未知.*不能.*安全假设/);
  has(body, /未决.*用户取舍.*真人/);
  has(body, /不得.*ready.*Oracle.*UNKNOWN.*阻断/s);
});
check('F04-state-gate', 'state keywords alone cannot pass', s => {
  const body = section(s.gate, '#### 设计产出检查', '#### Brief 合规检查');
  lacks(body, /搜索.*streaming\/partial\/error\/empty\/loading\/skeleton.*关键词/);
  has(body, /触发.*转换.*恢复.*证据/);
  has(body, /关键词.*不.*PASS/);
  has(body, /非 AI.*有源 N\/A.*实际.*状态/);
  has(body, /未观察.*UNKNOWN/);
});
check('F10-risk-summary', 'three-risk cap limits summary not retained risk set', s => {
  const body = section(s.handoff, '## 风险（', '## 待澄清');
  has(body, /摘要最多 3 条.*全部关键风险/s);
  has(body, /精确来源.*版本.*位置/);
  has(body, /≤2000 tokens/);
});
check('F05-research', 'one researcher shares budget with separate examiner', s => {
  has(s.focused, /exactly one real native researcher for the complete approved question set/);
  has(s.focused, /No repeated 8-item allocation per question, agent, retry or phase/);
  has(s.focused, /independent examiner.*separate role/s);
});
check('F06-evidence', 'underlying evidence and specification limits are explicit', s => {
  has(s.focused, /same underlying data are not independent evidence/);
  has(s.focused, /official source.*own versioned spec.*cannot establish user behaviour/s);
});
check('F07-budget', 'exhaustion is not zero-question or silent depth upgrade', s => {
  has(s.focused, /exhausted budget.*not a zero-question case/s);
  has(s.focused, /no automatic full\/deep upgrade or budget\nreset/);
});
check('F08-coverage', 'unused findings keep disposition and suggestions do not become MUST', s => {
  has(s.product, /High-confidence but irrelevant findings may be DEFERRED\/REMOVED with reasons/);
  has(s.product, /never silently promote them to MUST/);
  has(s.input, /不能因高置信或引用就变 MUST/);
});
check('F09-packet', 'Brief keeps original MUST and executable benefit conditions', s => {
  has(s.brief, /每个 D 有语义位置、全部适用状态、来源和边界/);
  has(s.brief, /所需信息\/动作\/反馈\/恢复与适用限制必须完整进入/);
  has(s.input, /每条本轮 MUST 来源、D、适用 STATE、保持项都有语义位置/);
  has(s.packet, /收益执行条件.*恢复.*适用限制.*丢失条件即不能冻结/s);
});
// Literal tripwire only: whether generated UIs honour it is unverified (no regeneration budget).
check('F11-brief-state-invalidation', 'states changed by later edits or late data name their invalidation', s => {
  has(section(s.brief, '## Phase 3', '## Phase 4'), /用户或系统的后续写入、晚到数据或撤销.*失效触发及失效后的呈现.*AC/);
});
check('F09-brief-retained', 'all Brief consumers permit sourced inherited decisions without invented rejections', s => {
  for (const [key, start, end] of [
    ['brief', '## Phase 5', '## Phase 6'],
    ['packet', '## 决策模版', '## Design Generation Packet'],
    ['briefSchema', '## 设计决策清单', '## 页面与交互位置映射'],
  ]) {
    const body = section(s[key], start, end);
    has(body, /继承.*已确认.*无实质取舍.*N\/A/s);
    has(body, /真实否决/);
    lacks(body, /最少 1 条，不允许留空|排除的备选方案：\*\* \{≥ 1 条\}|至少一项排除备选/);
  }
});
check('F10-legacy', 'legacy depths and default full stay explicit', s => {
  has(s.deep, /\| Search rounds \| 3 .*\| 2 /);
  has(s.deep, /\| Minimum findings \| ≥5 per angle \| ≥3 per angle \|/);
  has(s.research, /\| 搜索轮次 \| 3轮.*\| 2轮/);
  has(s.prd, /\| Approaches Considered \| — \| ✓ \(≥2\) \| ✓ \(≥2\) \| ✓ \(≥3\) \|/);
});

const fixturePath = 'framework-audit/design-workflow-frontlight/u002-replay-fixtures.json';
const fixtureText = readFileSync(resolve(root, fixturePath), 'utf8');
const fixture = JSON.parse(fixtureText);
// Light competitor comparison: agent-offered, user-decided, output-neutral (user premise 2026-10-21).
check('F12-competitor-scan', 'light competitor scan is named-decision gated, asked once, capped, honest and output-neutral', s => {
  const t = s.scan;
  has(t, /命名决定测试/);
  has(t, /写不出就整句不出现，也不问/);
  has(t, /一次、开放、纯文本/);
  has(t, /“不用”＝终局，本任务不再问/);
  has(t, /标“凭已有认识、未核实”/);
  has(t, /≤3 个对象，整次 ≤6 次读取/);
  has(t, /评论\/论坛只用来定位，不作结论依据/);
  has(t, /文档层先例/);
  has(t, /UNVERIFIED/);
  has(t, /证据日期超过约 18 个月或版本不明，标 stale/);
  has(t, /competitor-analysis\.md\]\(\.\.\/ux-research\/references\/competitor-analysis\.md\)/);
  has(t, /Layer C（信任）与 Layer D（代理）/);
  has(t, /decision_changed/);
  has(t, /不由 agent 自评/);
  has(t, /前 5 次真实提议/);
  has(t, /不新增 Packet\/TAC 字段，不自动升 MUST/);
  // The user's own constraints: light, agent-offered, candidate-bearing, decline is final, never a questionnaire.
  has(t, /不出选项菜单，不问预算、深度、维度/);
  has(t, /2–3 个由需求推出的候选对象/);
  has(t, /至少一个机制与其余不同/);
  has(t, /不编造产品/);
  has(t, /没有固定候选池/);
  has(t, /已成形的截图\/录屏\/分析 → 只摄取，不扫描/);
  has(t, /视为同意，直接按下面的预算做，不再问/);
  has(t, /超过 3 个 → 按可比性取前 3/);
  has(t, /没有已锁定项目（NO_PIN）——此时不发起扫描/);
  has(t, /执行体用现有 `quick-research`/);
  has(t, /用户说“看一眼”即同意本次读取/);
  has(t, /没有浏览器/);
  has(t, /不写效果主张/);
  has(t, /没有增量就如实写，不强造差异/);
  has(t, /`decision: <命名决定>` 与 `decision_changed: pending`/);
  has(t, /一律沿用/);
  has(t, /这里不复述/);
  has(t, /不进入任何生成输入/);
  has(t, /它不改变 open-design \/ claude-design 的产出/);
  has(t, /这不是 skill、模式、审批或 Packet\/TAC 字段/);
  has(t, /同意、拒绝和文件路径记进既有来源索引/);
  has(t, /competitor-scan: declined/);
  has(t, /docs\/research\/competitor-scan-log\.md/);
  has(t, /不到 1 次，\n或拒绝率超过 80%，则本文件回退为只保留 plan-design-guidance 里的一行/);
  has(t, /本文件不新建 skill、模式或审批/);
  lacks(t, /2–4|预算档/);
  lacks(t, /无额外门|不另加预算档外的审批/);
  lacks(t, /动效默认|默认动效|固定阈值|\d+\s?ms\b|缓动|时长/);
});
check('F13-competitor-scan-landing', 'one owner, pointers only, no second ask point and no questionnaire', s => {
  const brief = s.brief.split('competitor-scan.md').length - 1;
  assert.ok(brief >= 1 && /按 \[competitor-scan\]\(\.\.\/references\/competitor-scan\.md\)\n用本轮入口句提议一次/.test(s.brief), 'design-brief Phase 0 pointer');
  const phase0 = section(s.brief, '## Phase 0：输入继承与缺口核对', '## Phase A');
  has(phase0, /competitor-scan/);
  const optional = section(s.product, '**Optional: additional research.**', '## Phase 2');
  has(optional, /competitor-scan\.md/);
  has(optional, /offer a\nlight comparison once/);
  assert.equal(s.product.split('competitor-scan.md').length - 1, 1, 'brainstorm names the reference exactly once (no second intake question)');
  has(s.guidance, /competitor-scan\.md, executed by quick-research after the one-time offer/);
  has(s.guidance, /competitor analysis" alone names no object/);
  has(s.method, /走 `\.\.\/\.\.\/references\/competitor-scan\.md`，不进本方法/);
  lacks(s.input, /competitor-scan/);
});

check('FIXTURE-separation', 'subject prompts and grader expectations are separate finite sets', () => {
  assert.equal(fixture.evidence_class, 'BOUNDED_NATIVE_PROBES_NOT_FULL_SKILL_RUNS');
  assert.deepEqual(fixture.subject_cases.map(row => row.id), fixture.grader_expectations.map(row => row.id));
  assert.equal(new Set(fixture.subject_cases.map(row => row.id)).size, fixture.subject_cases.length);
  for (const row of fixture.subject_cases) {
    assert.ok(row.subject_prompt && row.authority_paths.length && row.original_input);
    assert.ok(!('expectations' in row) && !('grader' in row));
  }
  const covered = new Set(fixture.grader_expectations.flatMap(row => row.assertion_ids));
  for (let n = 1; n <= 10; n++) assert.ok(covered.has(`F${String(n).padStart(2, '0')}`));
});

const evaluate = input => checks.map(test => {
  try { test.test(input); return { id: test.id, ok: true }; }
  catch (error) { return { id: test.id, ok: false, error: error.message }; }
});
console.log(`STATIC_ONLY_NOT_NATIVE root=${root}`);
if (baseline) console.log(`BASELINE ${baseline}; retrospective regression check, not a pre-edit TDD run`);
console.log(`SOURCE_HASHES ${JSON.stringify(Object.fromEntries(Object.entries(source).map(([key, body]) => [paths[key], sha(body)])))}`);
console.log(`FIXTURE_SHA256 ${sha(fixtureText)}`);
const results = evaluate(source);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.id}${result.ok ? '' : ` ${result.error.split('\n')[0]}`}`);
let mutationFailures = 0;
if (args.includes('--mutation') && results.every(row => row.ok)) {
  // Variants remain in memory; mutation runs never alter authority files or generated views.
  const mutations = [
    ['new-product-auto-full', 'product', 'New/mixed labels alone never change focused to full.', 'New products automatically select full.', 'F01-product'],
    ['focused-fixed-options', 'product', 'All actual approaches with', 'Three approaches with', 'F03-product-presentation'],
    ['remove-examiner', 'focused', 'exactly one real native researcher for the complete approved question set', 'two author simulations for the complete question set', 'F05-research'],
    ['allow-required-unknown', 'ux', 'required criterion 为 UNKNOWN 同样阻断', 'required criterion 为 UNKNOWN 可放行', 'F10-ux-oracle'],
    ['reuse-stale-review', 'ux', '草稿任何变更要求新 hash 和重新冷审', '草稿变更可复用旧票', 'F10-ux-oracle'],
    ['unused-advice-to-must', 'product', 'never silently promote them to MUST', 'silently promote them to MUST', 'F08-coverage'],
    ['remove-source-must', 'input', '每条本轮 MUST 来源、D、适用 STATE、保持项都有语义位置', '只核模型选中的来源', 'F09-packet'],
    ['remove-benefit-recovery', 'brief', '所需信息/动作/反馈/恢复与适用限制必须完整进入', '只传收益摘要进入', 'F09-packet'],
    ['keyword-only-state-pass', 'gate', '仅出现关键词不构成 PASS', '关键词出现即构成 PASS', 'F04-state-gate'],
    ['truncate-critical-risks', 'handoff', '摘要最多 3 条；全部关键风险', '最多 3 条；其他关键风险删除', 'F10-risk-summary'],
    ['impatience-waives-unknown', 'pressure', '关键未知不能改成安全假设', '关键未知可以改成安全假设', 'F07-escape'],
    ['brief-restores-rejection-quota', 'briefSchema', '无实质取舍时填有源 N/A', '始终至少编写一项排除备选', 'F09-brief-retained'],
    ['drop-state-invalidation', 'brief', '写明失效触发及失效后的呈现', '保持原样即可', 'F11-brief-state-invalidation'],
    ['scan-always-ask', 'scan', '写不出就整句不出现，也不问', '写不出也照问', 'F12-competitor-scan'],
    ['scan-uncap-reads', 'scan', '整次 ≤6 次读取', '读取不设上限', 'F12-competitor-scan'],
    ['scan-auto-must', 'scan', '不自动升 MUST', '自动升 MUST', 'F12-competitor-scan'],
    ['scan-agent-self-grades', 'scan', '不由 agent 自评', '由 agent 自评即可', 'F12-competitor-scan'],
    ['scan-motion-default', 'scan', '本文件只新增一条：', '本文件只新增一条（动效默认 200ms）：', 'F12-competitor-scan'],
    ['scan-claims-ui-observation', 'scan', '文档层先例', '已观察真实界面', 'F12-competitor-scan'],
    ['scan-restores-option-menu', 'scan', '不出选项菜单，不问预算、深度、维度', '给出预算、深度、维度的选项菜单', 'F12-competitor-scan'],
    ['scan-drops-no-browser', 'scan', '没有浏览器', '有浏览器', 'F12-competitor-scan'],
    ['scan-drops-consent-record', 'scan', '同意、拒绝和文件路径记进既有来源索引', '同意、拒绝不用记', 'F12-competitor-scan'],
    ['scan-drops-stop-threshold', 'scan', '不到 1 次', '不限次数', 'F12-competitor-scan'],
    ['scan-decline-not-final', 'scan', '“不用”＝终局，本任务不再问', '“不用”＝本次先放过，之后还会再问', 'F12-competitor-scan'],
    ['scan-no-pin-still-scans', 'scan', '此时不发起扫描', '此时照常发起扫描', 'F12-competitor-scan'],
    ['scan-allows-invention', 'scan', '不编造产品', '可补充常见产品', 'F12-competitor-scan'],
    ['scan-executor-ux-research', 'scan', '执行体用现有 `quick-research`', '执行体用现有 `ux-research`', 'F12-competitor-scan'],
    ['scan-enters-generation', 'scan', '不进入任何生成输入', '可进入生成输入', 'F12-competitor-scan'],
    ['scan-restates-method', 'scan', '一律沿用', '改为在此重新定义', 'F12-competitor-scan'],
    ['scan-drops-header-fields', 'scan', '`decision: <命名决定>` 与 `decision_changed: pending`', '一份摘要', 'F12-competitor-scan'],
    ['scan-adds-budget-tier', 'scan', '本文件不新建 skill、模式或审批', '本文件新建 deep 预算档', 'F12-competitor-scan'],
    ['scan-always-scans-materials', 'scan', '已成形的截图/录屏/分析 → 只摄取，不扫描', '已成形的材料一律再扫描', 'F12-competitor-scan'],
    ['brief-pointer-removed', 'brief', '按 [competitor-scan](../references/competitor-scan.md)\n用本轮入口句提议一次', '按相关规则\n用本轮入口句提议一次', 'F13-competitor-scan-landing'],
    ['guidance-row-removed', 'guidance', 'competitor-scan.md, executed by quick-research after the one-time offer', 'ux-research after the one-time offer', 'F13-competitor-scan-landing'],
  ];
  for (const [name, key, before, after, expected] of mutations) {
    assert.equal(source[key].split(before).length, 2, `mutation anchor must occur exactly once: ${name}`);
    const rejected = evaluate({ ...source, [key]: source[key].replace(before, after) }).some(row => row.id === expected && !row.ok);
    console.log(`${rejected ? 'PASS' : 'FAIL'} MUTATION ${name} target=${expected}`);
    if (!rejected) mutationFailures++;
  }
}
for (const [key, path] of Object.entries(paths)) assert.equal(sha(readFileSync(resolve(root, path), 'utf8')), sha(diskSource[key]), `authority changed during static test: ${path}`);
const passed = results.filter(row => row.ok).length;
console.log(`RESULT ${passed}/${results.length} contract checks; mutation_failures=${mutationFailures}; STATIC_ONLY_NOT_NATIVE`);
process.exitCode = passed === results.length && mutationFailures === 0 ? 0 : 1;
