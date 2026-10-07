// Frozen public RP/PO prompts and expected claims. Transport and scoring stay in the runner.
export const ROUTING_PLAN_SUITE_VERSION = 'routing-plan-v1';
const routes = ['Project Gate', 'Plan', 'Framework Flow', 'Multi-Skill', 'Single-Skill', 'STOP'];
const rp = [
  ['RP-01a', '请忠实整理这段口述，不要扩展成 PRD。', 'Single-Skill'], ['RP-01b', '把这段口述原样梳理出来，不要替我创作 PRD。', 'Single-Skill'],
  ['RP-02a', '我想做一个原型，先说明需要确认什么。', 'Single-Skill'], ['RP-02b', '我想先讨论一个原型请求需要哪些输入。', 'Single-Skill'],
  ['RP-03a', '我明确选择 HTML 做这个小原型，只做路由判断。', 'Single-Skill'], ['RP-03b', '工具选择已经确定为 HTML，请先判断路由。', 'Single-Skill'],
  ['RP-04a', '请评审已有设计产物，先识别评审对象。', 'Project Gate'], ['RP-04b', '我要检查一个现有设计交付物，先确认评审入口。', 'Project Gate'],
  ['RP-05a', '请从需求一路做到成品，推荐流程并等待我的选择。', 'STOP'], ['RP-05b', '帮我走完整流程到最终产物，先给流程选项，等我选。', 'STOP'],
  ['RP-06a', '有人提到“先做个计划”，请解释这句话，不要开始规划。', 'STOP'], ['RP-06b', '讨论一下别人说的先计划，不要把它当成我的规划请求。', 'STOP'],
  ['RP-07a', '这次不要做计划，直接回答路由类别。', 'Single-Skill'], ['RP-07b', '明确不需要计划，只做一次简单路由判断。', 'Single-Skill'],
  ['RP-08a', '请先做一个详细计划，之后再执行。', 'Plan'], ['RP-08b', '先产出可执行计划，得到确认后再开始工作。', 'Plan'],
  ['RP-09a', '继续处理已有项目中的这个问题，先过项目门。', 'Project Gate'], ['RP-09b', '接着做老项目里的任务，第一步先确认项目身份。', 'Project Gate'],
  ['RP-10a', '分别处理两个互相独立的高置信 skill 意图。', 'Multi-Skill'], ['RP-10b', '这里有两个可以独立完成的明确技能请求，请区分处理。', 'Multi-Skill'],
  ['RP-11a', '审查 luca_gstack 框架本身，保持 NO_PIN。', 'Framework Flow'], ['RP-11b', '检查这个 Skill OS 框架，不激活任何下游项目。', 'Framework Flow'],
  ['RP-12a', '这是一个复杂且新颖的问题，先判断是否需要研究前置。', 'STOP'], ['RP-12b', '问题新颖而且复杂，先判断研究前置和下一步。', 'STOP'],
];
const po = [['PO-01', '生成一个有真实依赖、采用单阶段 Supervisor 的执行计划。', 'SINGLE_SUPERVISOR'], ['PO-02', '基于前版计划和 scope 变化生成增量计划，保留稳定身份并标出未决偏好。', 'INCREMENTAL_PLAN'], ['PO-03', '输入包含循环依赖和失败 handoff，生成阻塞而非执行的计划。', 'BLOCKED_PLAN']];
export const ROUTING_PLAN_FIXTURES = Object.freeze(Object.fromEntries([...rp, ...po].map(([id, request, expected]) => [id, {
  id, suite: ROUTING_PLAN_SUITE_VERSION, request: request + ' 返回 routing_class 或 plan_case，只做决策检查，不执行、不写文件。',
  claims: id.startsWith('PO-') ? { plan_case: { type: 'string', choices: [expected], equals: expected } } : { routing_class: { type: 'string', choices: routes, equals: expected } },
  targets: id.startsWith('PO-') ? ['.claude/agents/plan-agent.md'] : ['.claude/skill-os/generated/skill-catalog.md'],
  candidateSourceTargets: id.startsWith('PO-') ? ['.claude/agents/plan-agent.md'] : ['.claude/skill-os/generated/skill-catalog.md'],
}])));
export function validateRoutingPlanSuite(fixtures = ROUTING_PLAN_FIXTURES) {
  const ids = Object.keys(fixtures); if (ids.length !== 27 || ids.filter((id) => id.startsWith('RP-')).length !== 24 || ids.filter((id) => id.startsWith('PO-')).length !== 3) throw new Error('routing-plan-v1 requires 24 RP and 3 PO fixtures');
  for (const [id, fixture] of Object.entries(fixtures)) if (fixture.id !== id || fixture.suite !== ROUTING_PLAN_SUITE_VERSION) throw new Error('invalid routing-plan-v1 fixture ' + id);
  return { suite: ROUTING_PLAN_SUITE_VERSION, fixture_count: 27, rp_count: 24, po_count: 3 };
}
validateRoutingPlanSuite();
