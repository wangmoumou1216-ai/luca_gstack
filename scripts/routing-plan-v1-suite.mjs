// Public task facts and private scoring travel separately in the runner.
import { createHash } from 'node:crypto';
export const ROUTING_PLAN_SUITE_VERSION = 'routing-plan-v1';
const routes = ['Project Gate', 'Plan', 'Framework Flow', 'Multi-Skill', 'Single-Skill', 'STOP'];
const cases = ['SINGLE_SUPERVISOR', 'INCREMENTAL_PLAN', 'BLOCKED_PLAN'];
const rp = [
  ['RP-01a', '请忠实整理这段口述，不要扩展成 PRD。', 'Single-Skill'], ['RP-01b', '把这段口述原样梳理出来，不要替我创作 PRD。', 'Single-Skill'],
  ['RP-02a', '我想做一个原型，先说明需要确认什么。', 'Single-Skill'], ['RP-02b', '我想先讨论一个原型请求需要哪些输入。', 'Single-Skill'],
  ['RP-03a', '我明确选择 HTML 做这个小原型，只做路由判断。', 'Single-Skill'], ['RP-03b', '工具选择已经确定为 HTML，请先判断路由。', 'Single-Skill'],
  ['RP-04a', '已有项目的 PRD、原型和 Figma 三方交付需要一起评审。先识别评审对象，再判断第一道入口；项目身份尚未核验。', 'Project Gate'], ['RP-04b', '请对照已有项目的 PRD、原型与 Figma 检查跨产物一致性，先辨认评审对象与入口；项目身份还未确认。', 'Project Gate'],
  ['RP-05a', '请从需求一路做到成品，推荐流程并等待我的选择。', 'STOP'], ['RP-05b', '帮我走完整流程到最终产物，先给流程选项，等我选。', 'STOP'],
  ['RP-06a', '有人提到“先做个计划”，请解释这句话，不要开始规划。', 'STOP'], ['RP-06b', '这次不要做计划，只解释刚才这句话。', 'STOP'],
  ['RP-07a', '请先做一个详细计划，之后再执行。', 'Plan'], ['RP-07b', '$brainstorm 请先做计划；本次明确涉及三个独立文件，没有有效 HITL 豁免。', 'Plan'],
  ['RP-08a', '继续处理已有项目中的这个问题，先过项目门。', 'Project Gate'], ['RP-08b', '接着做老项目里的任务，第一步先确认项目身份。', 'Project Gate'],
  ['RP-09a', '分别处理两个互相独立的高置信 skill 意图。', 'Multi-Skill'], ['RP-09b', '这里有两个可以独立完成的明确技能请求，请区分处理。', 'Multi-Skill'],
  ['RP-10a', '审查 luca_gstack 框架本身，保持 NO_PIN。', 'Framework Flow'], ['RP-10b', '检查这个 Skill OS 框架，不激活任何下游项目。', 'Framework Flow'],
  ['RP-11a', '这是一个复杂且新颖的问题，无研究输入，先判断研究前置。', 'STOP'], ['RP-11b', '这是成熟简单的单页文案需求，已有完整输入，请写一份 PRD。', 'Single-Skill'],
  ['RP-12a', '我选择 engineering-delivery preset，请先判断入口，不执行。', 'Framework Flow'], ['RP-12b', '他提到 engineering-delivery preset，请解释这句话，不代表我选择。', 'STOP'],
];
const str = { type: 'string', minLength: 1 };
const strings = { type: 'array', items: str };
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const unitSchema = object({ id: str, source_ref: str, dependencies: strings, status: { type: 'string', enum: ['DONE', 'PLANNED', 'NEEDS_CONTEXT'] }, files: strings, read_list: strings, verification: str });
const assertionSchema = object({ id: str, level: { type: 'string', enum: ['BLOCKING', 'WARNING'] }, command: str, positive_case: str, negative_case: str });
const assertionTools = [
  { command: 'node scripts/test-plan-graph.mjs', positive_case: '合法依赖图通过', negative_case: '未知依赖、自环或一般循环非零退出' },
  { command: 'node scripts/test-quality-gates-scope.mjs', positive_case: '有效 PASS handoff 通过', negative_case: 'FAIL/UNKNOWN、重复或伪 PASS 非零退出' },
];
// Public rendering contract: the readable plan and structured fields are one artifact.
// JSON-encode each value; arbitrary prose outside this projection is not accepted.
export const ROUTING_PLAN_TEXT_FORMAT = `# 执行计划
## 块 0 前提
plan_id: {JSON plan_id}
scope: {JSON scope}
source_identity: {JSON source_identity}
## 块 1 方法
phase_mode: {JSON phase_mode}
approval_required: {JSON approval_required}
execution_authorized: {JSON execution_authorized}
## 块 2 单元
For each unit: ### {id}, then one line for each field source_ref, dependencies, status, files, read_list, verification as "field: {JSON value}".
## 块 3 断言
For each assertion: ### {id}, then level, command, positive_case, negative_case in the same JSON line format.
## 块 4 状态
status: {JSON status}
prior_plan_sha256: {JSON prior_plan_sha256}
unresolved_preferences: {JSON unresolved_preferences}
external_blockers: {JSON external_blockers}
failure_policy: {JSON failure_policy}
## 块 5 自检
criteria: {JSON criteria}
self_check: {JSON self_check}`;
export function formatRoutingPlanText(p) {
  const fields = (value, keys) => keys.map((key) => `${key}: ${JSON.stringify(value[key])}`).join('\n');
  return '# 执行计划\n## 块 0 前提\n' + fields(p, ['plan_id', 'scope', 'source_identity'])
    + '\n## 块 1 方法\n' + fields(p, ['phase_mode', 'approval_required', 'execution_authorized'])
    + '\n## 块 2 单元\n' + p.units.map((u) => `### ${u.id}\n` + fields(u, ['source_ref', 'dependencies', 'status', 'files', 'read_list', 'verification'])).join('\n')
    + '\n## 块 3 断言\n' + p.assertions.map((a) => `### ${a.id}\n` + fields(a, ['level', 'command', 'positive_case', 'negative_case'])).join('\n')
    + '\n## 块 4 状态\n' + fields(p, ['status', 'prior_plan_sha256', 'unresolved_preferences', 'external_blockers', 'failure_policy'])
    + '\n## 块 5 自检\n' + fields(p, ['criteria', 'self_check']);
}
export const ROUTING_PLAN_ARTIFACT_SCHEMA = object({
  text: str, plan_id: str, scope: str, source_identity: str, phase_mode: { type: 'string', enum: ['Solo', 'Sequential', 'Parallel', 'Supervisor', 'Hierarchical'] },
  approval_required: { type: 'boolean' }, execution_authorized: { type: 'boolean' }, status: { type: 'string', enum: ['PLANNED', 'NEEDS_CONTEXT'] },
  prior_plan_sha256: { type: ['string', 'null'] }, unresolved_preferences: strings,
  units: { type: 'array', items: unitSchema }, assertions: { type: 'array', items: assertionSchema },
  criteria: strings, external_blockers: strings, failure_policy: str, self_check: str,
});
const prior = {
  plan_id: 'PO-02-stable', scope: 'NO_PIN', source_identity: 'PO-02-prior-v1', phase_mode: 'Supervisor',
  text: '# 前版计划\n## 块 0 前提\n已确认 alpha/beta 源码任务。\n## 块 1 方法\nSupervisor，批准仅绑定旧 scope。\n## 块 2 单元\nU-001 DONE alpha 保留决定 D-001；U-002 PLANNED beta depends U-001。\n## 块 3 断言\nASSERT-001 node --test fixtures/beta.test.mjs，错误依赖应失败。\n## 块 4 状态\nFAIL 停止依赖。\n## 块 5 自检\n原身份与决定保留。',
  decisions: ['D-001: preserve alpha result'],
  units: [{ id: 'U-001', source_ref: 'REQ-alpha', dependencies: [], status: 'DONE', files: ['fixtures/alpha.mjs'] },
    { id: 'U-002', source_ref: 'REQ-beta', dependencies: ['U-001'], status: 'PLANNED', files: ['fixtures/beta.mjs'] }],
};
const priorBytes = JSON.stringify(prior);
const priorSha = createHash('sha256').update(priorBytes).digest('hex');
const task = (id, units, extras = {}) => ({ plan_id: id === 'PO-02' ? prior.plan_id : id + '-plan', scope: 'NO_PIN', source_identity: id + '-input-v1',
  phase_mode: 'Supervisor', approved_execution: false, assertion_tools: assertionTools,
  constraints: {
    failure_policy: 'FAIL/UNKNOWN 停止依赖；批准不随计划产生。',
    criteria: ['来源可追溯', '依赖合法或明确阻塞', '实际正反例能判错', '偏好仍由用户决定', '路径和批准范围匹配', '稳定身份和有效决定保留', '复杂度与范围相称'],
    self_check: id === 'PO-02' ? 'D-001 和 DONE 结果保留，新范围待批准。' : id === 'PO-03' ? '循环及 HANDOFF-beta FAIL 阻断派发。' : '来源、scope、模式、断言均核对，未获批准。',
  }, units, ...extras });
const unit = (id, source_ref, dependencies, files, status = 'PLANNED') => ({ id, source_ref, dependencies, files, status });
const po = [
  ['PO-01', '生成含真实依赖的单阶段 Supervisor 计划。alpha 的结果供 beta 消费。真人尚未批准；只生成计划，不执行。', 'SINGLE_SUPERVISOR', task('PO-01', [unit('U-001', 'REQ-alpha', [], ['fixtures/alpha.mjs']), unit('U-002', 'REQ-beta', ['U-001'], ['fixtures/beta.mjs'])])],
  ['PO-02', '基于冻结前版计划做增量规划。新 scope 增加 gamma，依赖 beta；保留 U-001 DONE 和 D-001。交付格式仍需用户选择，旧 scope 批准不覆盖新 scope。', 'INCREMENTAL_PLAN', task('PO-02', [prior.units[0], unit('U-002', 'REQ-beta', ['U-001'], ['fixtures/beta.mjs']), unit('U-003', 'REQ-gamma', ['U-002'], ['fixtures/gamma.mjs'])], { prior_plan_bytes: priorBytes, prior_plan_sha256: priorSha, scope_change: { added_files: ['fixtures/gamma.mjs'], unresolved_preferences: ['delivery-format'] } })],
  ['PO-03', '输入包含循环依赖及真实 FAIL handoff；生成阻塞计划，保留环和失败事实，不发布可执行 Wave。', 'BLOCKED_PLAN', task('PO-03', [unit('U-001', 'REQ-alpha', ['U-002'], ['fixtures/alpha.mjs']), unit('U-002', 'REQ-beta', ['U-001'], ['fixtures/beta.mjs'])], { failed_handoff: { source_ref: 'HANDOFF-beta', gate_result: 'FAIL' } })],
];
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const ROUTING_PLAN_FIXTURES = freeze(Object.fromEntries([
  ...rp.map(([id, request, expected]) => [id, { id, suite: ROUTING_PLAN_SUITE_VERSION, request: request + ' 只返回路由判断；不执行、不写文件。',
    claims: { routing_class: { type: 'string', choices: routes, equals: expected },
      ...(id.startsWith('RP-04') ? { review_object: { type: 'string', choices: ['code', 'design_decision', 'rendered_page', 'cross_artifact_delivery', 'unknown'], equals: 'cross_artifact_delivery' } } : {}) },
    targets: ['.claude/skill-os/generated/skill-catalog.md'],
    candidateSourceTargets: ['.claude/skill-os/generated/skill-catalog.md'],
  }]),
  ...po.map(([id, request, expected, publicContext]) => [id, { id, suite: ROUTING_PLAN_SUITE_VERSION, request: request + ' 输出完整块0–5计划文本、可溯源U-block与可执行正反例断言，结构字段须与文本一致；不写文件、不执行计划。', publicContext,
    claims: { plan_case: { type: 'string', choices: cases, equals: expected }, plan: { type: 'object', schema: ROUTING_PLAN_ARTIFACT_SCHEMA } },
    targets: ['.claude/agents/plan-agent.md'], candidateSourceTargets: ['.claude/agents/plan-agent.md'],
  }]),
]));
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...keys].sort());
// This deterministic gate validates actual artifacts, not semantic quality or native performance.
export function routingPlanClaimsMatch(fixture, claims) {
  if (!exactKeys(claims, Object.keys(fixture.claims))) return false;
  if (!fixture.id.startsWith('PO-')) return Object.entries(fixture.claims).every(([key, spec]) => claims[key] === spec.equals);
  const p = claims.plan, input = fixture.publicContext;
  if (claims.plan_case !== fixture.claims.plan_case.equals || !exactKeys(p, Object.keys(ROUTING_PLAN_ARTIFACT_SCHEMA.properties))) return false;
  if (p.plan_id !== input.plan_id || p.scope !== input.scope || p.source_identity !== input.source_identity || p.phase_mode !== input.phase_mode
      || p.approval_required !== true || p.execution_authorized !== false) return false;
  if (!nonempty(p.text) || p.text.length > 100000 || ![0, 1, 2, 3, 4, 5].every((n) => new RegExp(`^#{1,6} .*块\\s*${n}(?:\\D|$)`, 'm').test(p.text))) return false;
  if (!Array.isArray(p.units) || p.units.length !== input.units.length || new Set(p.units.map((u) => u?.id)).size !== p.units.length) return false;
  for (const fact of input.units) {
    const u = p.units.find((candidate) => candidate?.id === fact.id);
    if (!exactKeys(u, Object.keys(unitSchema.properties)) || u.source_ref !== fact.source_ref || !same(u.dependencies, fact.dependencies)
        || u.status !== (fact.status === 'DONE' ? 'DONE' : fixture.id === 'PO-01' ? 'PLANNED' : 'NEEDS_CONTEXT') || !same(u.files, fact.files) || !Array.isArray(u.read_list) || !u.read_list.length
        || !u.read_list.every((path) => fact.files.includes(path)) || !nonempty(u.verification) || !p.text.includes(u.id) || !p.text.includes(u.source_ref)) return false;
  }
  if (!Array.isArray(p.assertions) || !p.assertions.length || new Set(p.assertions.map((a) => a?.id)).size !== p.assertions.length) return false;
  for (const a of p.assertions) {
    if (!exactKeys(a, Object.keys(assertionSchema.properties)) || !/^ASSERT-\d+$/.test(a.id) || a.level !== 'BLOCKING'
        || !input.assertion_tools.some((tool) => a.command === tool.command && a.positive_case === tool.positive_case && a.negative_case === tool.negative_case)) return false;
  }
  if (!p.units.every((u) => p.assertions.some((a) => a.command === u.verification))) return false;
  if (!Array.isArray(p.criteria) || p.criteria.length < 3 || p.criteria.length > 7 || !p.criteria.every(nonempty)
      || !nonempty(p.failure_policy) || !nonempty(p.self_check) || !Array.isArray(p.external_blockers) || !p.external_blockers.every(nonempty)) return false;
  if (p.failure_policy !== input.constraints.failure_policy || p.self_check !== input.constraints.self_check
      || new Set(p.criteria).size !== p.criteria.length || !p.criteria.every((c) => input.constraints.criteria.includes(c))) return false;
  if (!p.assertions.some((a) => a.command === assertionTools[0].command)
      || (fixture.id === 'PO-03' && !p.assertions.some((a) => a.command === assertionTools[1].command))) return false;
  if (p.text.trim() !== formatRoutingPlanText(p)) return false;
  if (fixture.id === 'PO-02') {
    return p.status === 'NEEDS_CONTEXT' && p.prior_plan_sha256 === input.prior_plan_sha256
      && same(p.unresolved_preferences, input.scope_change.unresolved_preferences)
      && same(p.external_blockers, ['delivery-format']) && p.text.includes('D-001');
  }
  if (p.prior_plan_sha256 !== null || !same(p.unresolved_preferences, [])) return false;
  return fixture.id === 'PO-03'
    ? p.status === 'NEEDS_CONTEXT' && same(p.external_blockers, ['HANDOFF-beta']) && /FAIL/.test(p.text)
    : p.status === 'PLANNED' && !p.external_blockers.length;
}
export function validateRoutingPlanSuite(fixtures = ROUTING_PLAN_FIXTURES) {
  const ids = Object.keys(fixtures);
  if (ids.length !== 27 || ids.filter((id) => id.startsWith('RP-')).length !== 24 || ids.filter((id) => id.startsWith('PO-')).length !== 3) throw new Error('routing-plan-v1 requires 24 RP and 3 PO fixtures');
  for (const [id, fixture] of Object.entries(fixtures)) if (fixture.id !== id || fixture.suite !== ROUTING_PLAN_SUITE_VERSION) throw new Error('invalid routing-plan-v1 fixture ' + id);
  return { suite: ROUTING_PLAN_SUITE_VERSION, fixture_count: 27, rp_count: 24, po_count: 3 };
}
validateRoutingPlanSuite();
