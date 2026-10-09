#!/usr/bin/env node
// Static source/fixture tripwires only. This suite does NOT execute or prove native review.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--root' || !args[i + 1]) throw new Error('Usage: test-design-workflow-contract.mjs [--root <exact source root>]');
  root = resolve(args[++i]);
}
const paths = {
  orchestrator: '.claude/agents/orchestrator.md',
  graph: '.claude/skill-os/optional-workflow-graph.yaml',
  researchKit: '.claude/skills/office/research-kit/SKILL.md',
  brainstorm: '.claude/skills/office/brainstorm/SKILL.md',
  ux: '.claude/skills/office/ux-brainstorm/SKILL.md',
  prdReview: '.claude/skills/office/brainstorm/references/adversarial-review.md',
  uxReview: '.claude/skills/office/ux-brainstorm/references/adversarial-review.md',
  viability: '.claude/skill-os/codex-viability.yaml',
  qg: '.claude/agents/quality-gate.md',
  auto: '.claude/skills/office/auto/SKILL.md',
  ts: '.claude/skills/office/tech-spec/SKILL.md',
  tp: '.claude/skills/office/task-plan/SKILL.md',
  preflight: '.claude/agents/preflight-agent.md',
  modes: '.claude/skill-os/input-modes.yaml',
  tsMode: '.claude/skill-os/generated/input-modes/tech-spec.json',
  tpMode: '.claude/skill-os/generated/input-modes/task-plan.json',
  od: '.claude/skills/office/open-design/SKILL.md',
  page: '.claude/skill-os/runtime/page-context.md',
  guidance: '.claude/agents/references/plan-design-guidance.md',
  original: 'scripts/original-copy-handoff.mjs',
  odMode: '.claude/skill-os/generated/input-modes/open-design.json',
};
const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(resolve(root, path), 'utf8')]));
const sha = body => createHash('sha256').update(body, 'utf8').digest('hex');
const hashes = Object.fromEntries(Object.entries(sources).map(([key, body]) => [paths[key], sha(body)]));
let passed = 0;
let total = 0;
const check = (name, fn) => {
  total++;
  try { fn(); passed++; process.stdout.write(`PASS ${name}\n`); }
  catch (error) { process.stdout.write(`FAIL ${name}: ${error.message.split('\n')[0]}\n`); }
};
const has = (body, pattern) => assert.ok(pattern.test(body), `missing contract ${pattern}`);
const lacks = (body, pattern) => assert.ok(!pattern.test(body), `obsolete contract ${pattern}`);
const section = (body, start, end) => {
  const at = body.indexOf(start);
  return at < 0 ? '' : body.slice(at, end ? body.indexOf(end, at + start.length) : undefined);
};
const facet = section(sources.qg, '### 0.1 DESIGN_DRAFT', '\n## 1.');
const ordinary = section(sources.qg, '\n## 1.', '\n## 4.');

process.stdout.write(`STATIC_ONLY_NOT_NATIVE root=${root} pid=${process.pid} cwd=${process.cwd()}\n`);
process.stdout.write(`SOURCE_HASHES ${JSON.stringify(hashes)}\n`);
check('draft facet precedes assertions and ordinary Skill Mode', () => {
  const dispatch = section(sources.qg, '## 0.', '### 0.1');
  assert.ok(dispatch.indexOf('review_stage=DESIGN_DRAFT') >= 0);
  assert.ok(dispatch.indexOf('review_stage=DESIGN_DRAFT') < dispatch.indexOf('有 `assertions`'));
});
for (const field of ['review_stage', 'skill_name', 'scope_tier', 'round', 'eval_run_id', 'project_session', 'draft', 'source_refs', 'criteria', 'prior_decisions']) {
  check(`draft required field ${field}`, () => has(facet, new RegExp(`^${field}:`, 'm')));
}
for (const [name, pattern] of [
  ['bounded two skills', /只接收.*brainstorm.*ux-brainstorm.*Phase 5/],
  ['frozen exact UTF8 bytes', /原文.*UTF-8.*字节.*SHA-256/],
  ['independent recomputation', /独立重算.*draft.*sha256/s],
  ['source permission and readback', /hash 不授读权.*实际读回/s],
  ['verifiable user turn sources', /用户 turn.*核验/],
  ['full original criteria denominator', /原 Oracle 全部适用维度.*Section Matrix.*完整分母/s],
  ['missing fields reject', /缺字段.*不得.*PASS/],
  ['required UNKNOWN blocks', /BLOCKING.*UNKNOWN.*阻断/s],
  ['Human Gate preserved', /Human Gate.*真人.*偏好/s],
  ['draft-only future-stage exemption', /仅此 facet.*豁免.*WA status=DONE.*outputs_produced.*output.*handoff.*workflow-state DONE/s],
  ['ordinary modes untouched', /普通 Free Task Mode.*Skill Mode.*保留.*原有.*检查/s],
  ['native input binding', /原生 invocation.*input_sha/],
  ['XML criterion grammar', /<criterion id="\{id\}" level="\{BLOCKING\|WARNING\}" status="\{PASS\|FAIL\|UNKNOWN\}">/],
  ['criterion evidence grammar', /<evidence>.*<\/evidence>/],
  ['criterion identity wrapper', /<criteria_results skill_name=.*review_stage="DESIGN_DRAFT".*draft_sha256=.*scope_tier=.*round=.*eval_run_id=/],
  ['full structured payload not token truncated', /完整 XML.*criteria.*不截断.*500 tokens/s],
  ['facet subject', /subject\.skill=<skill_name>:DESIGN_DRAFT/],
  ['empty output paths', /output_paths=\[\]/],
  ['caller eval ID same', /同一 eval_run_id/],
  ['no envelope hash extension', /不.*envelope.*hash 字段/],
  ['judge no writes', /判官不写文件.*不.*record_eval\.py/],
  ['parse XML before consuming', /XML parser.*解析/s],
  ['unknown severity or corrupt response stops', /未知严重性.*损坏.*停门/s],
  ['parsed count denominator envelope consistency', /计数.*完整分母.*envelope.*一致/s],
  ['same native accepted binding', /同次.*accepted.*收据/],
  ['fresh vote after change', /任何草稿改动.*新 hash.*冷审.*旧票/s],
]) check(name, () => has(facet, pattern));
check('ordinary WA DONE prerequisite retained', () => has(ordinary, /status == DONE → 继续/));
check('ordinary outputs_produced existence retained', () => has(ordinary, /验证 outputs_produced.*实际存在/));
check('ordinary handoff existence retained', () => has(ordinary, /handoff summary 是否存在.*文件存在/));
check('ordinary scoped workflow DONE retained', () => has(ordinary, /精确定位.*skill_name.*status: DONE/));
check('ordinary handoff CLI retained', () => has(ordinary, /check-quality-gates\.mjs --handoff/));

// Table fixtures exercise the written branches only; they are not a mock judge or dispatch.
const rows = [...sources.qg.matchAll(/^\| (brainstorm|ux-brainstorm) \| (Lightweight|Standard|Deep-feature|Deep-product) \| ([^|]+) \| ([^|]+) \|$/gm)];
for (const [skill, tier, rule] of [
  ['brainstorm', 'Lightweight', 'N/A'], ['brainstorm', 'Standard', '≥2'],
  ['brainstorm', 'Deep-feature', '≥2'], ['brainstorm', 'Deep-product', '≥3'],
  ['ux-brainstorm', 'Lightweight', '2'], ['ux-brainstorm', 'Standard', '3'],
  ['ux-brainstorm', 'Deep-feature', '3'], ['ux-brainstorm', 'Deep-product', '≥3'],
]) check(`matrix fixture ${skill}/${tier}=${rule}`, () => {
  const matches = rows.filter(row => row[1] === skill && row[2] === tier);
  assert.equal(matches.length, 1);
  assert.equal(matches[0][3].trim(), rule);
});
check('actual stable IDs and gaps', () => has(sources.qg, /R1.*A1.*F1.*D1.*AE1.*gap/));
check('no obsolete zero padded IDs', () => lacks(sources.qg, /格式为 R01|A01\/F01|方案数 ≥ 3 &&/));
check('tier confirmation and distinct content', () => has(sources.qg, /未确认 scope.*UNKNOWN.*重复.*空壳.*FAIL/s));
check('tier required pros cons and rejected directions', () => has(sources.qg, /pros\/cons.*Standard\+.*≥1.*AI.*UX.*≥2.*AI Native.*≥1/s));

for (const key of ['brainstorm', 'ux', 'prdReview', 'uxReview']) {
  const body = sources[key];
  check(`${key} two round ceiling`, () => has(body, /默认最多两轮|default maximum.*2|max 2|Max 2|最多2轮/));
  check(`${key} obsolete three round paths removed`, () => lacks(body, /[Mm]ax 3|[Mm]ax rounds: 3|最多3轮|Max round ceiling: 3|最大轮次上限：3|Round 3|Round \{N\} of max 3|beyond 3 rounds|超过3轮/));
  check(`${key} no author Oracle fallback`, () => lacks(body, /Execute the Oracle prompt as internal reasoning|以内部推理执行Oracle prompt/));
  check(`${key} independent native Codex dispatch`, () => has(body, /quality-gate.*MR-004.*冷.*前台/s));
  check(`${key} no capability stops gate`, () => has(body, /独立.*能力.*BLOCKED/s));
  check(`${key} severity critical blocks`, () => has(body, /critical\/CRITICAL.*BLOCKER.*BLOCKING/));
  check(`${key} severity high blocks`, () => has(body, /high\/HIGH.*MAJOR.*BLOCKING/));
  check(`${key} persistence cannot pass`, () => has(body, /相同.*持续.*不得.*Phase 6/s));
  check(`${key} required UNKNOWN blocks`, () => has(body, /required criterion.*UNKNOWN.*阻断/));
  check(`${key} changed draft fresh vote`, () => has(body, /草稿.*变更.*新 hash.*冷审/));
  check(`${key} reasoned escalation only`, () => has(body, /超过两轮.*说明理由.*不得.*自动.*Phase 6/));
  check(`${key} independent admission owner reached`, () => has(body, /quality-gate\.md.*§0\.1/s));
}
const originalDimensions = {
  prdReview: ['Coherence', 'Feasibility', 'Scope Clarity', 'Assumption Surfacing', 'Handoff Readiness', 'Research-to-PRD Loss', 'AI Native Soundness'],
  uxReview: ['Evaluability & Trust', 'Behavior Change Cost', 'Systemic Consequence & Form Honesty', 'Control & Failure Modes', 'Handoff Readiness'],
};
for (const [key, names] of Object.entries(originalDimensions)) {
  for (const [index, name] of names.entries()) check(`${key} full original dimension ${index + 1}`, () => has(sources[key], new RegExp(`### Dimension ${index + 1}: ${name.replaceAll('&', '\\&')}`)));
}
check('PRD current AI architecture content and Phase6 commitment', () => has(sources.prdReview, /当前.*AI.*架构内容.*Phase 6.*生成承诺/));
check('PRD no future file admission', () => lacks(sources.prdReview, /Does the AI engineering spec.*exist|no spec was written/));
check('PRD scope-aware prewrite template interpretation', () => {
  has(sources.brainstorm, /第7项.*Lightweight.*N\/A.*第16项.*当前.*架构内容.*Phase 6.*生成承诺/s);
  has(section(sources.brainstorm, '### 6.1', '### 6.2'), /pre-write.*#16.*current AI architecture.*after 6\.3.*before handoff/s);
  has(section(sources.brainstorm, '### 6.3', '### 6.4'), /read back the exact authorized.*exists, is nonempty.*Failure stops handoff\/DONE/s);
});
check('PRD XML summary counts', () => has(sources.prdReview, /<review_summary>.*<critical_count>.*<high_count>/s));
check('UX convergence means no surviving critical high', () => has(sources.uxReview, /<converged>.*zero critical.*zero high.*required/s));
check('PRD XML identity', () => has(sources.prdReview, /<review_findings round=.*skill_name="brainstorm".*draft_sha256=.*eval_run_id=/));
check('UX XML identity', () => has(sources.uxReview, /<review_findings round=.*skill_name="ux-brainstorm".*draft_sha256=.*eval_run_id=/));
check('PRD severity finite grammar', () => has(sources.prdReview, /critical \| high \| medium \| low \| fyi/));
check('UX severity finite grammar', () => has(sources.uxReview, /CRITICAL \| HIGH \| MEDIUM \| LOW/));
check('PRD no concerns blocker downgrade', () => lacks(sources.prdReview, /These are NOT blockers.*unless marked/));
check('UX no no-new severity bypass', () => lacks(sources.uxReview, /true if no new critical\/high|force-exit, classify/));
check('PRD human approach preference retained', () => has(sources.brainstorm, /Use a AskUserQuestion \(single-select\): options are/));
check('UX human approach preference retained', () => has(sources.ux, /使用AskUserQuestion（单选）：选项为/));
for (const skill of ['brainstorm', 'ux-brainstorm']) {
  check(`registry ${skill} independent review`, () => {
    const entry = sources.viability.split('\n').find(line => line.startsWith(`  ${skill}:`)) || '';
    has(entry, /DESIGN_DRAFT.*quality-gate.*MR-004.*冷.*同次 accepted.*BLOCKED/);
    lacks(entry, /Oracle 对抗可顺序化\/内联|同 brainstorm：3\+1 可顺序化/);
  });
}
// U-003: written execution branches; this does not simulate an agent or Human Gate.
const autoDispatch = section(sources.auto, '#### 3.1', '#### 3.2');
check('auto declares execution_context per phase', () => has(sources.auto, /每个 Phase.*execution_context/));
for (const skill of ['brainstorm', 'ux-brainstorm', 'design-brief', 'open-design']) {
  check(`auto interactive ${skill} main_agent`, () => has(sources.auto, new RegExp('^\\| `'+skill+'` \\| main_agent \\|', 'm')));
}
for (const skill of ['deepresearch', 'ux-research']) {
  check(`auto research ${skill} subagent`, () => has(sources.auto, new RegExp('^\\| `'+skill+'` \\| subagent \\|', 'm')));
}
check('auto logical WA ownership independent of spawn', () => has(sources.auto, /逻辑 WA.*职责.*不.*一律 spawn/s));
check('auto dispatch reads actual skill Human Gate', () => has(autoDispatch, /完整读取.*实际 SKILL\.md.*Human Gate/s));
check('auto research parameters collected in main first', () => has(autoDispatch, /主会话.*真实.*参数.*显式.*prompt/s));
check('auto missing human decision stops dispatch', () => has(autoDispatch, /未决.*停止.*派发/s));
check('auto WA template limited to subagent', () => has(autoDispatch, /仅 execution_context=subagent.*work-agent-template/s));
check('auto main direct execution and skill handoff', () => has(autoDispatch, /main_agent.*直接.*当前对话.*handoff.*不重复/s));
check('auto old all-WA mandate removed', () => lacks(autoDispatch, /auto 的每个 WA 都是 skill 执行器/));
check('auto same gates for both contexts', () => has(sources.auto, /两种 execution_context.*相同.*依赖.*handoff.*质量.*取消/s));
check('auto only subagent phase fanout', () => has(sources.auto, /并行 Phase.*仅.*execution_context=subagent/));
check('auto cancellation stops new successors', () => has(sources.auto, /明确取消.*先停止尚未.*新工具动作/s));

// U-004: source lineage and normal PRD branches are static contract assertions.
for (const key of ['ts', 'tp']) {
  const body = sources[key];
  for (const [name, pattern] of [
    ['source mode separate from workflow', /input_mode.*prd.*conversation_synthesis.*standalone.*workflow/s],
    ['never infer CONV from missing Brief', /不.*缺.*Brief.*推断.*conversation_synthesis/s],
    ['missing mode or register needs context', /input_mode.*register.*NEEDS_CONTEXT/s],
    ['drift blocks', /来源漂移.*BLOCKED/],
    ['source register path hash section binding', /source_register.*path.*sha256.*section.*register_sha256/s],
    ['original source and independent MUST set', /original_sources.*source_must_ids/s],
    ['original source reverse enumeration', /原始来源.*独立.*MUST.*反向/s],
    ['sourced no UI NA', /D\/STATE.*N\/A.*来源/s],
    ['engineering errors remain tested MUST', /工程.*状态.*错误.*MUST.*测试/s],
    ['canonical handoff mode preserved', /Handoff 必须包含：[\s\S]*input_mode/],
    ['normal prd end to end retained', /正常 PRD\/Brief.*prd_end_to_end/s],
  ]) check(`${key} ${name}`, () => has(body, pattern));
}
check('TS persists in-memory register in canonical output', () => has(sources.ts, /内存.*register.*canonical tech-spec.*§1.*Source Register/s));
check('TS no second facade artifact', () => has(sources.ts, /不.*第二.*facade.*产物/));
check('TP actual source read and hash before RTM', () => has(sources.tp, /实际读取.*source_register.*重算.*sha256.*register_sha256.*矩阵/s));
check('TP full CONV chain', () => has(sources.tp, /CONV-MUST.*REQ.*ASSERT.*DEV.*TEST/));
check('TP own 100 percent not evidence', () => has(sources.tp, /自己.*矩阵.*100%.*不能.*替代/));
for (const skill of ['tech-spec', 'task-plan']) {
  const row = sources.preflight.split('\n').find(line => line.startsWith('| `'+skill+'` |')) || '';
  check(`preflight ${skill} explicit source branches`, () => { has(row, /input_mode.*prd.*conversation_synthesis.*register.*hash/); has(row, /prd_end_to_end/); });
}
for (const [key, skill] of [['tsMode','tech-spec'], ['tpMode','task-plan']]) {
  const view = JSON.parse(sources[key]);
  check(`${skill} projection input source notes`, () => has(view.contract.notes, /required.*仅.*prd.*conversation_synthesis.*source_register.*source_must_ids.*同等覆盖/s));
  check(`${skill} unchanged workflow modes`, () => assert.deepEqual(Object.keys(view.contract.modes), ['standalone', 'workflow']));
  check(`${skill} register coverage quality gate`, () => assert.ok(view.contract.quality_gates.includes('original_source_must_coverage_when_conversation_synthesis')));
  check(`${skill} projection hash current`, () => assert.equal(view.source_sha256, sha(sources.modes)));
}

// U-005: these assert routing prose and the real adapter's existing refusal, not live OD.
const odIntake = section(sources.od, '## Phase 0', '## Phase 1');
const odStage = section(sources.od, '## Phase 3D', '## Phase 3H');
const odHeadless = section(sources.od, '## Phase 3H', '## Phase 4');
check('OD original-copy HEADLESS_ONLY in intake before profile/stage', () => has(odIntake, /original_copy.*HEADLESS_ONLY.*profile.*stage.*run/s));
check('OD original-copy opt-in AND run grant required', () => has(odIntake, /original_copy.*显式 headless opt-in.*run.*授权.*STOP.*真实.*选择/s));
check('OD original-copy generic desktop default excluded', () => has(odIntake, /普通.*carrier.*reference_only.*默认.*3D.*original_copy.*不适用/s));
check('OD stage gate already headless chosen and run granted', () => has(odStage, /original_copy.*Phase 0.*opt-in.*run.*未满足.*STOP/s));
check('OD stage completion message conditional', () => has(odStage, /普通 carrier\/reference_only.*桌面端.*original_copy.*headless/s));
check('OD failed original headless never desktop', () => has(odHeadless, /original_copy.*失败.*不.*Phase 3D.*桌面.*STOP/s));
check('OD normal retry counter retained', () => has(odHeadless, /重试上限 1.*普通 carrier\/reference_only.*再次失败.*桌面端/s));
check('OD no headless fallback respects original mode', () => has(odHeadless, /original_copy.*未.*opt-in.*STOP/s));
check('OD completion original desktop iteration excluded', () => has(section(sources.od,'## Phase 5','## Phase 6'), /普通 carrier\/reference_only.*桌面端.*original_copy.*不.*桌面/s));
check('OD core default exception retained', () => has(section(sources.od,'## ⚠️ 末尾核心约束','## 完成协议'), /普通 carrier\/reference_only.*默认桌面.*original_copy.*HEADLESS_ONLY/s));
check('page original-copy capability ahead of operation sequence', () => has(section(sources.page,'## 7.'), /HEADLESS_ONLY.*profile.*stage.*run.*opt-in.*run.*STOP/s));
check('page original-copy failure stops desktop recovery', () => has(section(sources.page,'## 7.'), /失败.*桌面.*不支持.*STOP/s));
check('auto W9 original exception precedes generic retry', () => has(section(sources.auto,'#### Phase 失败处理','#### 3.4'), /original_copy.*HEADLESS_ONLY.*opt-in.*run.*STOP.*失败.*桌面.*不支持/s));
check('auto keeps normal desktop recovery retry counter', () => has(sources.auto, /普通 carrier\/reference_only.*一次 retry.*桌面端恢复.*W9.*重置/s));
check('Plan direct consumer original-copy capability exception', () => has(sources.guidance, /original_copy.*HEADLESS_ONLY.*opt-in.*run grant.*STOP.*desktop.*unsupported/s));
check('Plan direct consumer normal desktop recovery retained', () => has(sources.guidance, /ordinary carrier\/reference_only.*headless retry fails.*desktop/s));
const odNotes = JSON.parse(sources.odMode).contract.notes;
check('OD metadata original-copy exception', () => has(odNotes, /original_copy.*HEADLESS_ONLY.*opt-in.*run.*STOP.*失败.*桌面/s));
check('OD metadata source hash current', () => assert.equal(JSON.parse(sources.odMode).source_sha256,sha(sources.modes)));
check('adapter existing desktop hard refusal preserved', () => has(section(sources.original, 'export function reportOriginalGeneration', 'export async function recoverOriginalOutput'), /ORIGINAL_DESKTOP_UNSUPPORTED/));
check('adapter existing successful exact run prerequisite preserved', () => has(sources.original, /readback[.]run[.]status !== 'succeeded'.*ORIGINAL_RUN_NOT_SUCCEEDED/));

// Shared workflow boundary regression: static contracts, not native recovery evidence.
check('resume loop includes last IN_PROGRESS without PENDING', () => has(sources.orchestrator, /WHILE 本次选定路径有 IN_PROGRESS 或 PENDING/));
check('resume gates before successors and no repeated external effects', () => {
  has(sources.orchestrator, /只有完成门未闭合时直接续 3.4d/);
  has(sources.orchestrator, /有待续前置或依赖失败\/未知时，不派发其后继/);
  has(sources.orchestrator, /不重跑 3.4c 的产物生成\/外部效果/);
});
check('historical nodes do not choose workflow', () => has(sources.orchestrator, /历史 workflow-state.*本身不激活流程/));
check('engineering recommendation requires actual TS sources', () => {
  has(sources.graph, /仅在 tech-spec 输入就绪时推荐整链.*正式 PRD\/Brief/s);
  has(sources.graph, /conversation_synthesis.*完整 source_register/);
  has(sources.graph, /只有代码\/改进意图.*实际需求 owner.*不自动生成 PRD\/CONV/s);
});
check('all research kit modes use actual shared handoff threshold', () => {
  has(sources.researchKit, /runtime-estimate=12000.*standalone 终端交付也必须写 handoff/);
  lacks(sources.researchKit, /standalone 终端交付免写|按 lightweight 豁免 DONE 合法/);
});
for (const [key, path] of Object.entries(paths)) check(`source stable ${path}`, () => assert.equal(sha(readFileSync(resolve(root, path), 'utf8')), hashes[path]));
process.stdout.write(`RESULT ${passed}/${total} PASS; STATIC_ONLY_NOT_NATIVE\n`);
process.exitCode = passed === total ? 0 : 1;
