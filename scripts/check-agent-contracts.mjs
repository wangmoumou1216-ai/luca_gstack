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
const codexQg = read('.codex/agents/quality-gate.toml');
const modelRouting = read('.claude/skill-os/model-routing.yaml');
const auto = read('.claude/skills/office/auto/SKILL.md');
const workflowRunner = read('.codex/workflow-runner.mjs');
const od = read('.claude/skills/office/open-design/SKILL.md');
const ts = read('.claude/skills/office/tech-spec/SKILL.md');
const tp = read('.claude/skills/office/task-plan/SKILL.md');
const compile = read('.claude/agents/references/plan-engineering-modes.md');
const office = read('.claude/skills/office/SKILL.md');
const implement = read('.claude/skills/office/implement/SKILL.md');
const handoff = read('.claude/skills/office/references/handoff-protocol.md');
const evalMethod = read('.claude/skill-os/eval-methodology.md');
const planGraph = read('scripts/check-plan-graph.mjs');

// 1. OD-first 锚（当轮漂移正是三处全漏，缺一即复发）
t('plan-agent 含 open-design（设计产出路由）', plan.includes('open-design'));
t('plan-agent 设计产出首选非 MagicPath', !/默认使用 MagicPath/.test(plan));
t('preflight 检查表含 open-design 行', /\|\s*`open-design`/.test(pre));
t('quality-gate 前端产出检查含 open-design', /前端产出检查（[^）]*open-design/.test(qg));
t('quality-gate Brief 合规触发含 open-design', /html-prototype、open-design 或 figma-demo/.test(qg));
t('已有 HTML refinement 有独立 preflight 行', /\|\s*`motion-polish`/.test(pre));
t('motion 前端 facet 是接受前 exact candidate 验证', /前端产出检查（[^）]*motion-polish/.test(qg)
  && qg.includes('PREACCEPT') && /candidate-check --subject <candidate_ref.path> --sha256 <candidate_ref.sha256>/.test(qg));
for (const [name, source] of [['OD', od], ['TS', ts], ['TP', tp], ['compile', compile]]) {
  t(`${name} 实际 resolve 精确 final ref`, source.includes('final_artifact_ref')
    && /prototype-delivery\.mjs resolve --accepted/.test(source)
    && source.includes('--sha256') && source.includes('--delivery-root') && source.includes('--read-path'));
}
t('OD 先机械 recover 后同未完成 phase 子单元', od.includes('不要求 raw semantic PASS')
  && od.includes('原 raw FAIL 保留') && orch.includes('不等待 raw semantic PASS') && orch.includes('同一未完成 Phase'));
t('TS CMP 保留 actual artifact evidence；TP L1/card 保留同 ref', ts.includes('artifact_evidence{accepted_ref,final_entry,')
  && tp.includes('SRC-PROTOTYPE') && tp.includes('DEV/TEST') && tp.includes('accepted_ref'));
t('compile 重验全链且 TP hash 未变不能豁免漂移', compile.includes('whole current candidate/final/source/base raw')
  && /same\s+task-plan SHA does not excuse external artifact drift/.test(compile));
t('Plan/TP/QG 真消费 current-instance owner', plan.includes('project-verification.md')
  && tp.includes('project-verification.md') && qg.includes('project-verification.md') && qg.includes('before/after'));
t('Orchestrator/QG 真消费原分母 receipts', orch.includes('evidence-receipts.md')
  && qg.includes('evidence-receipts.md') && orch.includes('pre-freeze expected') && qg.includes('measurement'));

// 12. Plan admission must be an executable, compositional first-dispatch seam.
t('strict graph mode blocks external blockers', planGraph.includes('--require-no-external-blockers')
  && planGraph.includes('external dependencies are not all PASS'));
t('implement/orchestrator cite compositional plan checks', orch.includes('check-plan-graph.mjs')
  && implement.includes('check-plan-approval.mjs') && implement.includes('check-plan-identity.mjs'));

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
t('preflight 明确 TURN_CLOSED 仍保留有效 binding', pre.includes('`TURN_CLOSED` + 有效 binding 是已绑定状态'));
t('preflight 不得把 TURN_CLOSED 单独判成失败', pre.includes('不得仅因 `TURN_CLOSED` 判 FAIL'));
t('preflight 不得对同一项目要求新切换事务', pre.includes('不得要求新的 `PROJECT_SWITCH`'));

// 8. 判决权与记录权分离：judge 只产 envelope，父级 recorder 校验并落账。
t('quality-gate 不自行调用 eval recorder', !/python3\s+memory\/scripts\/record_eval\.py/.test(qg));
t('quality-gate 输出结构化 EVAL_ENVELOPE_JSON', qg.includes('EVAL_ENVELOPE_JSON'));
t('quality-gate envelope 绑定 eval_run_id', qg.includes('eval_run_id'));
t('quality-gate 缺 run id 时 fail-closed 而非伪造 UNKNOWN status',
  qg.includes('EVAL_ENVELOPE_ERROR') && qg.includes('MISSING_EVAL_RUN_ID') && qg.includes('不是 envelope status'));
t('orchestrator 独占 verdict recorder 调用', /record_eval\.py\s+--verdict-file/.test(orch));
t('orchestrator 不允许改写 judge verdict', orch.includes('不得改写 verdict'));
t('Codex quality-gate 如实声明权限继承', codexQg.includes('权限继承父会话'));
t('Codex quality-gate 不宣称已机械隔离 sandbox', !/^sandbox_mode\s*=/m.test(codexQg));

// 9. 模型选择只有一份公共 policy；Codex 固定 effort 表是兼容元数据，不是第二条模型路由。
const commonStart = modelRouting.indexOf('\nmodel_routing:');
const commonEnd = modelRouting.indexOf('\nknown_lineup:', commonStart);
const commonModel = commonStart >= 0
  ? modelRouting.slice(commonStart, commonEnd > commonStart ? commonEnd : undefined)
  : '';
const codexModel = (modelRouting.split(/^codex:/m)[1] || '').split(/^new_scenario_protocol:/m)[0] || '';
t('公共模型 policy 是v2 active/common', /\n\s{2}version:\s*2\b/.test(commonModel)
  && /\n\s{2}status:\s*active\b/.test(commonModel) && /\n\s{2}scope:\s*common\b/.test(commonModel));
for (const role of ['anchor', 'peak', 'light'])
  t(`公共模型 policy 含 ${role}`, new RegExp(`\\n\\s{4}${role}:`).test(commonModel));
t('低风险机械任务路由到 light', /MR-008:[\s\S]*?role:\s*light\b/.test(commonModel));
t('关键判官映射到语义复审场景', /quality-gate:\s*MR-004\b/.test(commonModel));
t('effort 明确不是动态模型路由输入', /effort:\s*user-owned-not-a-routing-input\b/.test(commonModel));
t('Codex 段不存在第二份 model_routing', !/^\s{2}model_routing:/m.test(codexModel));
t('Codex 段不存在 tier→effort 动态映射', !/^\s{2}tier_to_effort:/m.test(codexModel));
t('Codex preflight 固定 effort 保持 low', /\n\s{4}preflight-agent:\s*low\b/.test(codexModel));
t('公共 policy 不公开账户模型名', !/\bgpt-[\w.-]+\b/.test(commonModel));

// 10. 项目任务派发冻结绝对根；取消只停止未来调度并如实处理中/不可中断动作。
for (const [name, source] of [['orchestrator', orch], ['work-agent', wa], ['auto', auto]]) {
  t(`${name} 派发合同携带冻结 WORK_ROOT`, source.includes('WORK_ROOT'));
  t(`${name} 不从共享 display aliases 重算已派发落点`,
    /(?:不得|禁止).*(?:共享|display).*(?:alias|别名)/s.test(source));
}
t('auto 取消合同区分未派发、在途与无法中断动作',
  /尚未\s*派发/.test(auto) && auto.includes('在途') && /(?:无法中断|无法\s*中断)/.test(auto));
t('Codex runner 信号取消终止子进程组并停止继续调度',
  /process\.kill\(-pid,\s*'SIGKILL'\)/.test(workflowRunner)
  && /\['SIGINT',\s*'SIGTERM',\s*'SIGHUP'\]/.test(workflowRunner)
  && /child\.kill\('SIGTERM'\)/.test(workflowRunner));

// 11. 已发生的执行冲突防回退。仅静态 tripwire，不证明模型行为或整体收益。
t('阶段继续同时保留已有授权与未决人类门',
  orch.includes('下一 Phase 已在有效执行授权范围内且无未决 Human Gate')
  && orch.includes('规划不授予执行权限') && !orch.includes('等待用户确认后继续下一 Phase'));
t('普通返修的直接消费者不再无条件索取批准',
  orch.includes('授权内可修复问题交原 owner 返修后重验')
  && qg.includes('按 orchestrator.md §2.2') && !qg.includes('展示 findings → 询问用户：修复'));
t('局部交付与整体完成有明确边界及消费入口',
  orch.includes('必需项未完成或证据未知时，保留整体未完成')
  && auto.includes('§2.2 的完成边界') && orch.includes('不把短时间/动作数'));
t('auto 等待超时不当终态，重试收取原结果且保留上限',
  auto.includes('等待调用超时不等于任务终态') && auto.includes('重试前确认原 WA 已终止')
  && auto.includes('不重放已完成效果') && auto.includes('单个 WA 最多重试 1 次')
  && !auto.includes('超时无响应（> 5min）'));
t('handoff 继承真实决定并保留权限边界',
  handoff.includes('继承 ADOPTED/REJECTED 及来源') && handoff.includes('不授予本次执行权')
  && !handoff.includes('skill 完成时先写 PROPOSED'));
t('office 与恢复入口消费全部必需上游',
  office.includes('本次全部必需上游') && handoff.includes('不以最近 DONE 代替依赖集合')
  && orch.includes('最后 DONE 不替代依赖集合') && handoff.includes('standalone 不补 workflow state'));
t('必需来源不被摘要或预加载建议截断',
  handoff.includes('摘要不能替代必要来源') && office.includes('5K tokens 是单批预加载建议')
  && office.includes('无法完整消费时保留缺口并暂停受影响依赖'));
t('eval 区分主张、版本、前置依赖与未知成本',
  evalMethod.includes('本次实际候选的提交/内容 hash') && evalMethod.includes('合同一致性')
  && evalMethod.includes('整体收益/架构替换') && evalMethod.includes('不改判旧成绩')
  && evalMethod.includes('未知费用留空'));

if (failures.length) {
  console.error(`❌ agent 契约回归 FAIL（${failures.length}/${n}）：`);
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`agent-contracts: ${n}/${n} 断言通过（OD-first/状态枚举/边界/双重身份/路径映射/公共模型路由/能力锚/判决记录分权/绝对工作根与取消边界）`);
