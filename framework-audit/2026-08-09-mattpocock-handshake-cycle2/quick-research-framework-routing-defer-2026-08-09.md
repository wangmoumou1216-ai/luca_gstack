# Luca 框架原生路由 / Workflow / DEFER 机制核对

日期：2026-08-09  
范围：只核对当前 `luca_gstack` 一手源码与 Cycle 2 candidate Plan；不改 Plan、不设计新模块。

## 结论

当前 Plan 是**部分符合，不能按“最终 Plan”通过**。

- Workflow 进入条件与 standalone/workflow 分工：**EXISTS**。框架已有完整原则、输入模式与可选图；另造 mode selector 属重复建设。
- Skill 自主语义命中：**INCOMPLETE**。关键词粗网、复杂度门、SINGLE/MULTI/STOP 和语义兜底合同都已存在；但真正的语义判断仍由主 Agent 承担，并非机械语义路由器。
- DEFER 排序与晋升：**INCOMPLETE**。open gap、severity、候选评分、红队、人工融合、结构化重访条件与 `revisit_due` 消费端已存在；但没有面向任意 Plan-level DEFER 的通用优先级队列，也不会自行把“条件满足”变成晋升执行。

主要责任不是“框架没有解决方案”，而是 Plan 编制时没有先把候选逐项绑定到现有真值源和消费者；真实框架缺口只允许在现有骨架上做小幅补强，不能据此新增平行路由系统或平行晋升状态机。

## 一手源证据

### 1. 自主命中

- `.claude/skill-os/skill-routing-map.yaml` 是权威关键词与 invoke 映射。
- `.claude/hooks/route-guard.mjs` 已实现 Project Gate、复杂度 Plan 门、最长匹配、SINGLE/MULTI/STOP。
- `CLAUDE.md` 第 294–320 行明确：route-guard 是“关键词粗网、无语义能力”；STOP 不豁免主 Agent 的语义评估，执行中出现新子目标也必须重新按含义路由。

裁决：现有解法不是缺失，而是“机械粗网 + Agent 语义合同”的混合实现。Plan 可以补强覆盖率、消费面一致性和回归测试；若另建第二套路由矩阵/路由器，必须先证明现有表示能力不足，否则是重复造轮子并放大 `GAP-routing-fragmentation`。

### 2. Workflow 是否强制命中

- `CLAUDE.md` 第 224–231、439–445 行明确 Skill-first / Graph-optional：点名 skill 优先 standalone；用户选流程或说“按流程走”才进入 workflow。
- `.claude/skill-os/input-modes.yaml` 为各 skill 定义 standalone/workflow 输入与永远生效的 quality gates。
- `.claude/skill-os/optional-workflow-graph.yaml` 第 1–2 行明确 Workflow 不拥有 standalone；第 208–217 行又给出反例：执行阶段的 TDD 与 systematic-debugging 经场景/route-guard 命中，**不是 workflow 节点强制**。

裁决：这一模块已完整存在。新能力是否进 Workflow 应复用现有判据：只有用户已选择流程且该能力承担稳定 handoff/阶段依赖时才入图；横切的质量、安全、调试、测试纪律通过 quality/safety gate、host skill 内部 dispatch 或语义路由命中。

### 3. DEFER 优先级与晋升

- `.claude/skill-os/evolution/gaps-register.yaml` 已有人工拥有的 gap、`severity`、`status`、`revisit_when`、`revisit_status`；第 101–106 行记录过“只有字段、没有消费者”的真实故障并已接入结构化消费。
- `.claude/workflows/framework-evolution-scout.js` 第 137–142 行把 `revisit_status` 以 `MET` 开头的 open gap送入 `revisit_due`；候选另有 fit/quality/adoption/maintenance 加权、硬门、红队与 APPROVED/CONDITIONAL/REJECTED。
- `.claude/skill-os/evolution/FUSION-RUNBOOK.md` 已定义人工选定候选后的九步融合与 FM-11 顶层可达性验收。
- `.claude/skill-os/evolution/BENCHMARK-RUNBOOK.md` 已定义机会池优先顺序与“开 gap → FUSION → 基线推进”的出口。

裁决：晋升骨架存在，但 Plan-level DEFER 必须进入一个**现有且有消费者**的结构化面。若只写在 Plan/decision ledger 的 prose 里，条件满足后不会自动进入月度裁决。缺的是把少数必要字段和 checker 接到现有 gap/benchmark 管线，不是再造 `DEFERRED → PILOT → PROMOTION_READY` 平行状态机。

## 对 Cycle 2 candidate Plan 的符合度

符合：

- Plan 对 19 个 DEFER 坚持 zero-new-surface，不提前新增 route/skill/mode。
- WP-10 把 questionnaire 指向既有 gap，并给出具名收件人 + 决策回收目标的可观察触发条件。
- WP-12 试图把 Claude/Codex 的 route/catalog/input/model/agent 消费面做闭包，而非只验单端安装。

不符合或不够明确：

- Plan 只明确 ownership `skill-routing-map.yaml`，没有逐候选声明 standalone / internal dispatch / workflow gate 的现有落点；`input-modes.yaml` 与 `optional-workflow-graph.yaml` 没有成为具名验收面。
- logic-prototype 与 TDD pointer 的重访条件只出现在 Plan prose；没有明确写入哪个现有 registry 字段、由哪个现有 consumer 发现、何时变为 `MET`、谁裁决。
- Plan 没有给 3 个 DEFER 家族基于现有 `severity + evidence readiness + revisit trigger` 的排序，因此能“延后”，不能可靠回答“先晋升谁”。
- 另造通用“路由模式矩阵”或新 DEFER 生命周期会与现有五路登记面、gap/scout/FUSION 重叠，除非先用失败测试证明现有 schema 无法表达。

## 归因

主因：Plan 编制失误。编制过程把大量精力投入 activation/receipt/TCB 安全闭环，却没有把这三个用户价值问题先映射到当前框架的既有模块；属于“读到了框架，但没有以框架原生接口组织 Plan”，不是完全没读，也不是框架要求从零新增。

次因：框架有两个已知边界——语义命中仍是 Agent 合同而非机械分类器；DEFER 没有通用优先级视图和自动条件探测器。它们应作为 `GAP-routing-fragmentation` / `GAP-soft-enforcement` 邻域的最小扩展评估，不应被放大成新子系统。

<!-- FILE_END: quick-research-framework-routing-defer-2026-08-09 -->
