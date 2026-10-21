#!/usr/bin/env node
// Narrow source tripwires, not a skill executor, semantic judge or native-parity test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { preparePrototypeEvidence } from './design-flow-handoff.mjs';

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
  cd: '.claude/skills/office/claude-design/SKILL.md',
  od: '.claude/skills/office/open-design/SKILL.md',
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
// Competitor and design-reference analysis: a mandatory one-time ask, a "yes" always enters the Mobbin node,
// UI and interaction only (motion ruled out by the user 2026-10-21), a guiding pack with images, and adopted
// images reach CD/OD as interaction-reference attachments (user ruling 2026-10-21).
check('F12-competitor-scan', 'the Mobbin node is a mandatory one-time ask, UI and interaction only, honest, with a guiding image pack', s => {
  const t = s.scan;
  has(t, /必问一次，用户要才做/);
  has(t, /任务进入设计链时必须问一次，不要求先写出“某个具体决定”/);
  has(t, /用户已说“不用研究 \/ 直接做 \/ 不看竞品”：终局，本任务不再问/);
  has(t, /视为同意，直接进入第 3 节，不再问/);
  has(t, /一句话、开放、纯文本/);
  has(t, /不出选项菜单，不问预算、深度、维度/);
  has(t, /“不用”＝终局/);
  has(t, /没点名就按需求搜同类，不编造产品/);
  has(t, /没有已锁定项目（NO_PIN）：照问；同意则只在对话里交付，不写项目文件，也不下载图片/);
  has(t, /已经给了成形的截图 \/ 录屏 \/ 分析：只摄取/);
  has(t, /`search_flows` 看交互/);
  has(t, /`search_screens` 看界面/);
  has(t, /不交给后台子 agent，因为必须看图/);
  has(t, /一律返回 NEEDS_CONTEXT/);
  has(t, /不自动改用别的办法/);
  has(t, /整次至多 6 次搜索调用/);
  has(t, /同一任务里 `task_intent`、`output_destination`（取 `doc`）、`output_tool` 必须保持一致/);
  has(t, /先看图再下结论/);
  has(t, /不凭记忆描述它，也不拿别家的图顶替/);
  has(t, /competitor-analysis\.md\]\(\.\.\/ux-research\/references\/competitor-analysis\.md\)/);
  has(t, /这里不复述/);
  has(t, /Layer C（信任）与\s*Layer D（代理）/);
  has(t, /动效不在本节点，归 `motion-polish`/);
  // The pack must guide design, not list examples.
  has(t, /decision_changed: pending/);
  has(t, /每条设计指导必须指向一张实际看过的图，没有图支撑的不写/);
  has(t, /每条都带可直接采纳的 Brief 条目/);
  has(t, /没有增量就如实写，不强造差异/);
  has(t, /干净的 8 位 RGB PNG/);
  has(t, /每包至多 8 张/);
  has(t, /图片仅作设计参考，不进入产品交付/);
  // What reaches CD/OD, and what does not.
  has(t, /用途固定为 `interaction-reference`（设计参考）/);
  has(t, /不使用 `visual-reference`；没采纳的图不带/);
  has(t, /不新增 Packet \/ TAC 字段，不自动升 MUST/);
  has(t, /附件只在用户采纳后才交付/);
  has(t, /同意、拒绝和参考包路径记进既有来源索引/);
  has(t, /competitor-scan: declined/);
  has(t, /docs\/research\/competitor-scan-log\.md/);
  has(t, /不由 agent 自评/);
  has(t, /执行满 5 次分析后/);
  has(t, /它不自己调用 Mobbin/);
  has(t, /本节点不新建 skill、模式或审批/);
  lacks(t, /命名决定测试|写不出就整句不出现/);
  lacks(t, /动效默认|默认动效|固定阈值|\d+\s?ms\b|缓动|时长/);
});
check('F13-competitor-scan-landing', 'one owner, pointers only, no second ask point and no questionnaire', s => {
  const brief = s.brief.split('competitor-scan.md').length - 1;
  assert.ok(brief >= 1 && /按 \[competitor-scan\]\(\.\.\/references\/competitor-scan\.md\)\n用本轮入口句问一次/.test(s.brief), 'design-brief Phase 0 pointer');
  const phase0 = section(s.brief, '## Phase 0：输入继承与缺口核对', '## Phase A');
  has(phase0, /competitor-scan/);
  has(phase0, /竞品与设计参考分析是必问项/);
  has(s.brief, /用途固定 `interaction-reference`/);
  has(s.brief, /未采纳的图不带，不用 `visual-reference`/);
  const optional = section(s.product, '**Optional: additional research.**', '## Phase 2');
  has(optional, /competitor-scan\.md/);
  has(optional, /the ask is mandatory/);
  assert.equal(s.product.split('competitor-scan.md').length - 1, 1, 'brainstorm names the reference exactly once (no second intake question)');
  has(s.guidance, /competitor-scan\.md, run by the main agent with the Mobbin tools/);
  has(s.guidance, /competitor analysis" alone names no object/);
  has(s.guidance, /Adopted reference images reach the design tool only as `interaction-reference`/);
  has(s.method, /走 `\.\.\/\.\.\/references\/competitor-scan\.md`，不进本方法/);
  has(s.method, /本方法不自己调用 Mobbin/);
  lacks(s.input, /competitor-scan/);
});
check('F14-reference-images-as-attachments', 'CD/OD state the reference-only role, and the real handoff validator accepts the contract', s => {
  has(s.cd, /只作结构与交互参考，不覆盖 D\/STATE\/AC、用户描述与设计系统/);
  has(s.od, /只作结构与交互参考，\s*不覆盖 D\/STATE\/AC、用户描述与设计系统/);
  // Behaviour, not wording: a clean RGB PNG with this purpose and a Packet source ID is accepted; other media or purposes are not.
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const out = Buffer.alloc(body.length + 8); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = Buffer.concat([Buffer.from([0, 255, 0, 0, 0, 255, 0]), Buffer.from([0, 0, 0, 255, 255, 255, 0])]);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
  const attach = over => ({ path: 'mobbin/contact-create-01.png', media_type: 'image/png', purpose: 'interaction-reference', source_ids: ['D-001'], bytes: png, ...over });
  const accepts = item => { try { preparePrototypeEvidence([item], { factIds: ['D-001'], sourceIndexVerified: true }); return true; } catch { return false; } };
  assert.ok(accepts(attach({})), 'a clean RGB PNG with interaction-reference and a Packet ID must be accepted');
  assert.ok(!accepts(attach({ path: 'mobbin/a.webp', media_type: 'image/webp' })), 'webp must be rejected: the node converts to PNG');
  assert.ok(!accepts(attach({ purpose: 'mobbin-reference' })), 'an unknown purpose must be rejected');
  assert.ok(!accepts(attach({ source_ids: ['D-404'] })), 'an ID that is not in the frozen Packet must be rejected');
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
    ['scan-optional-ask', 'scan', '任务进入设计链时必须问一次，不要求先写出“某个具体决定”', '只在能写出具体决定时才问', 'F12-competitor-scan'],
    ['scan-decline-not-final', 'scan', '“不用”＝终局', '“不用”＝本次先放过', 'F12-competitor-scan'],
    ['scan-yes-needs-reconfirm', 'scan', '视为同意，直接进入第 3 节，不再问', '视为同意，但仍再确认一次', 'F12-competitor-scan'],
    ['scan-restores-option-menu', 'scan', '不出选项菜单，不问预算、深度、维度', '给出预算、深度、维度的选项菜单', 'F12-competitor-scan'],
    ['scan-no-pin-writes-files', 'scan', '同意则只在对话里交付，不写项目文件，也不下载图片', '同意则照常写项目文件', 'F12-competitor-scan'],
    ['scan-allows-invention', 'scan', '没点名就按需求搜同类，不编造产品', '没点名就补充常见产品', 'F12-competitor-scan'],
    ['scan-always-rescans-materials', 'scan', '用户已经给了成形的截图 / 录屏 / 分析：只摄取', '用户已经给了成形的材料也一律再搜', 'F12-competitor-scan'],
    ['scan-subagent-executes', 'scan', '不交给后台子 agent，因为必须看图', '交给后台子 agent 执行', 'F12-competitor-scan'],
    ['scan-silent-fallback', 'scan', '不自动改用别的办法', '失败时自动改用别的办法', 'F12-competitor-scan'],
    ['scan-uncap-budget', 'scan', '整次至多 6 次搜索调用', '整次不限搜索次数', 'F12-competitor-scan'],
    ['scan-claims-without-image', 'scan', '先看图再下结论', '凭元数据即可下结论', 'F12-competitor-scan'],
    ['scan-drops-image-evidence-rule', 'scan', '每条设计指导必须指向一张实际看过的图，没有图支撑的不写', '每条设计指导可以不配图', 'F12-competitor-scan'],
    ['scan-drops-brief-lines', 'scan', '每条都带可直接采纳的 Brief 条目', '只给例子清单', 'F12-competitor-scan'],
    ['scan-non-png-images', 'scan', '干净的 8 位 RGB PNG', '原始 webp 图', 'F12-competitor-scan'],
    ['scan-visual-purpose', 'scan', '用途固定为 `interaction-reference`（设计参考）', '用途为 `visual-reference`', 'F12-competitor-scan'],
    ['scan-attaches-unadopted', 'scan', '没采纳的图不带', '全部图都带', 'F12-competitor-scan'],
    ['scan-auto-must', 'scan', '不自动升 MUST', '自动升 MUST', 'F12-competitor-scan'],
    ['scan-agent-self-grades', 'scan', '不由 agent 自评', '由 agent 自评即可', 'F12-competitor-scan'],
    ['scan-adds-motion', 'scan', '动效不在本节点，归 `motion-polish`', '动效也在本节点做', 'F12-competitor-scan'],
    ['scan-research-calls-mobbin', 'scan', '它不自己调用 Mobbin', '它也自己调用 Mobbin', 'F12-competitor-scan'],
    ['scan-drops-consent-record', 'scan', '同意、拒绝和参考包路径记进既有来源索引', '同意、拒绝不用记', 'F12-competitor-scan'],
    ['scan-drops-review-threshold', 'scan', '执行满 5 次分析后', '不设复核', 'F12-competitor-scan'],
    ['scan-restates-method', 'scan', '这里不复述', '此处重新定义', 'F12-competitor-scan'],
    ['scan-adds-new-skill', 'scan', '本节点不新建 skill、模式或审批', '本节点新建 deep 预算档', 'F12-competitor-scan'],
    ['brief-pointer-removed', 'brief', '按 [competitor-scan](../references/competitor-scan.md)\n用本轮入口句问一次', '按相关规则\n用本轮入口句问一次', 'F13-competitor-scan-landing'],
    ['brief-ask-optional', 'brief', '竞品与设计参考分析是必问项', '竞品对照按需才问', 'F13-competitor-scan-landing'],
    ['brief-attach-visual', 'brief', '未采纳的图不带，不用 `visual-reference`', '未采纳的图也带，用 `visual-reference`', 'F13-competitor-scan-landing'],
    ['guidance-row-removed', 'guidance', 'competitor-scan.md, run by the main agent with the Mobbin tools', 'competitor-scan.md, executed by quick-research', 'F13-competitor-scan-landing'],
    ['method-calls-mobbin', 'method', '本方法不自己调用 Mobbin', '本方法也自己调用 Mobbin', 'F13-competitor-scan-landing'],
    ['cd-drops-reference-only', 'cd', '只作结构与交互参考，不覆盖 D/STATE/AC、用户描述与设计系统', '可覆盖 D/STATE/AC', 'F14-reference-images-as-attachments'],
    ['od-drops-reference-only', 'od', '随附件，只作结构与交互参考，\n不覆盖 D/STATE/AC、用户描述与设计系统', '随附件，可覆盖 D/STATE/AC', 'F14-reference-images-as-attachments'],
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
