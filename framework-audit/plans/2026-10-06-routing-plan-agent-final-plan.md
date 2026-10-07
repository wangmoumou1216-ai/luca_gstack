> 归档说明：以下正文保留上一轮会审通过的最终计划原文。正文中的“本轮未修改文件”指只读审查回合；本次仅归档计划，不执行框架整改。
> 会审终票：routing-audit-crossreview-contract-20261006-02 与 routing-audit-crossreview-planner-20261006-02，均 PASS 11/11。

# luca_gstack 口述路由与 Plan Agent 深度整改计划

## 一、审查结论与验收原则

**当前结论：Plan Agent 的基本职责与框架方向一致，但尚未完全适配。** 本次确认了 **11 项路由合同、规划合同和评测缺陷**，并在 U3 复核中发现 3 项尚未完成独立会审的 admission 风险（A1–A3）。整改必须保留已有的需求溯源、U-block、断言、质量门和增量重规划机制；A1–A3 不能在没有专家票和原生 runtime 证据时标记闭合。

两位独立 AI 审查代理分别从「路由与框架合同」「规划方法与测量有效性」出发，经过反证和第二轮交叉复审，均对修订后的 **11 项问题及方案给出 ACCEPT**。这代表整改方案通过会审，不代表修复已完成，也不等于已证明发生过实际越权事故。

审查基线：`d211bd3c1479720836219b035ec9963d278efa49`。本轮未修改文件，工作树保持干净。

### 从第一性原理定义 Plan Agent

Plan Agent 的职责是：

> 将已确认的目标、约束和证据，转化为可溯源、依赖合法、权限明确、能够验收的执行合同；保留尚未解决的不确定性，并把必须由用户决定的取舍交还用户。

执行归 Orchestrator，计划不能自行产生执行授权。

| 维度 | 本次采用的定义 | 验收方法 |
|---|---|---|
| 权威性 | 框架行为以当前唯一 owner 为准；外部方法使用注明日期、适用范围的一手来源 | 每条规则能追到 owner；外部建议不得覆盖项目隔离、授权和 Human Gate |
| 科学性 | 结论能够被反例推翻；标签、实际行为、效果改善分别测量 | 冻结样本和标准答案，运行真实被测对象，保存失败与 UNKNOWN，进行正反例及 mutation 验证 |
| 严谨性 | 来源、依赖、权限、验收、失败处理和恢复身份不存在关键歧义 | 对真实生成的计划执行结构检查、依赖检查和独立内容评审 |
| 框架适配性 | 遵守路由顺序、五类 Plan 触发、有效豁免、独立 skill、主动选择 Workflow、NO_PIN 和稳定 U-ID | 对这些边界逐项验证，不以“文档看起来完整”代替行为证据 |

方法依据采用当前一手材料：[Anthropic 的 Agent 评测方法](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)支持以真实运行轨迹和结果评分；[2026 年长期任务 Harness 研究](https://www.anthropic.com/engineering/harness-design-long-running-apps)支持独立评估和按任务验证编排价值；[PlanBench](https://arxiv.org/abs/2206.10498)提供用明确约束检验规划能力的思路。它们不证明 luca_gstack 的具体阈值最优；例如“三文件触发 Plan”仍属于需要保留并持续校准的本地政策。

---

## 二、已认证的真问题

“真问题”限于：**当前权威规则冲突，或存在可重复反例，并且能够说明影响、给出可验证修复。** 单纯偏好不同不列为缺陷。

| ID | 已确认的问题与证据 | 修复目标 |
|---|---|---|
| R1 | [条件加载清单](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/skill-os/agent-context-manifest.json:143)仅为 review 加载 junction owner，未完整覆盖非 review 的研究前置、设计产出、流程推荐和工程 preset | 对应规则在首次需要它之前可达 |
| R2 | [MULTI 提示](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/hooks/route-guard.mjs:1297)要求用户必须选 skill，可能覆盖已经明确的语义意图 | 多关键词只产生候选，真实歧义才提问 |
| R3 | [Workflow 合同](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/skill-os/runtime/workflow-mode.md:48)禁止选择前读图，但 junction 要求先读图推荐 | 分清“读取以推荐”和“选择后执行” |
| R4 | 引用“先做个计划”、明确否定先计划，也会得到 PLAN_MODE，并收到强制规划提示 | 根据真实意图复核五类触发和豁免 |
| P1 | [Plan 模式表](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/agents/plan-agent.md:574)只要求多阶段 Supervisor 确认，与 K3 和同文件总则冲突 | 单阶段及嵌套 Supervisor 同样遵守批准规则 |
| P2 | [计划持久化规则](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/agents/plan-agent.md:610)按 `docs/plans` 是否存在选路径，并建议寻找最新计划恢复 | 使用已验证 scope 和精确任务计划身份 |
| P3 | [handoff 断言](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/agents/plan-agent.md:469)仅检查 `gate_result` 字样；重放时 FAIL、CONDITIONAL_PASS、注释均能通过 | 检查真实字段值，同时绑定正确任务产物 |
| P4 | [循环处理说明](/Users/luca/.codex/worktrees/dbdd/luca_gstack/.claude/agents/plan-agent.md:419)把拆分 U-block 当作解决循环的方法，但拆后仍可能有环 | 修改依赖后必须重新验证拓扑 |
| E1 | [语义 judge](/Users/luca/.codex/worktrees/dbdd/luca_gstack/memory/scripts/eval_routing.py:237)看到 expected 后回答“应该路由哪里”，却被描述成实际语义命中率 | 分离标签审查与实际 Agent 行为评测 |
| E2 | [活动 fixture](/Users/luca/.codex/worktrees/dbdd/luca_gstack/memory/evals/routing/fixtures.jsonl:40)仍接受已退役入口 `muse-loop-orchestrate` | 依据当前 owner 校准活动标准答案 |
| E3 | [keyword 评分](/Users/luca/.codex/worktrees/dbdd/luca_gstack/memory/scripts/eval_routing.py:172)在只有 semantic fixture 时返回 `1.000 (0/0) PASS` | 空分母、未知 layer 和无效 fixture 明确失败 |

**未列为缺陷：**

- hook 返回 `NONE`：它可以合法交给语义 fallback。
- 直接指定 skill：已有 `planHint` 和权威触发检查，未证明它必然绕过 Plan。
- 缺少某个通用规划模板字段：没有具体失效证据时不强行增加流程。

现有测试仍然全绿：路由测试 **257 PASS**、Agent 合同检查 **94 PASS**、keyword fixture **85/85**；另外 **23 条 semantic fixture 尚不能提供真实行为命中率**。这些结果说明现有回归检查不足以发现上述问题。

---

## 三、实施单元与依赖

执行顺序固定为：

**U1 冻结证据 → U2 路由修复 → U3 Plan 修复 → U4 评测修复 → U5 实测与终审。**

采用串行推进；每个单元必须完成自己的验证后再进入下一单元。

### U1｜冻结需求、反例和判定标准

**产出：**

- 11 项问题的原始输入、源码位置、复现步骤、实际结果和期望行为。
- 当前源码、fixture、判分器的版本及哈希。
- 问题 → 修复单元 → 测试 → 验收标准的对应表。
- 对现有 23 条 semantic fixture 逐条做 owner 校准。

**具体规则：**

- 新标准答案单独冻结，保留历史结果及其原有含义。
- 标准答案包含必要的最小上下文，例如被评审对象、项目状态、用户是否已选择 Workflow。
- 原话不足以确定对象时，期望行为是澄清，不能强行选 skill。
- 框架审计材料写入 `framework-audit/routing-plan-audit/2026-10-06/`，不使用共享 `docs/`。
- 本计划阶段不落盘；上述产物在实施阶段生成。

**完成条件：** 11 项均有明确反例或合同冲突；不存在仅凭个人偏好提出的修复。

### U2｜修复口述到 skill／workflow／Plan 的路由

**修改范围：** context manifest、生成的 index、路由 hook、junction owner 和 workflow-mode。

1. **补齐条件加载。**
   - R1/R2/R3/R5 复用现有 `routing-chain-check.md`。
   - 在相应推荐、工具选择或 dispatch 之前加载。
   - R4 继续在更早的评审对象映射阶段生效。
   - R5 只识别用户真实选择，不替用户选择 preset。
   - 修改 manifest 后运行生成器 `sync`，随后运行 `check`，不手改生成文件。

2. **把词法命中明确写成候选证据。**
   - SINGLE、MULTI、NONE 和 PLAN_MODE 均不能覆盖权威语义判断。
   - 先处理 Project Gate、Plan，再接受 skill 路由。
   - 真正独立的多个意图进入 Multi-Skill；语义仍有歧义才请求用户选择。
   - 保留现有 dry-run 输出结构和分数字段。
   - 项目权限、退役能力拒绝等硬门保持严格。

3. **允许有目的的图读取。**
   - 为研究前置、设计产出和流程推荐读取必要图信息。
   - 图读取不激活 Workflow。
   - 用户真实选择后才进入对应流程；无关 standalone 不增加图读取。

4. **修复 Plan 提示的强制性。**
   - 引用、否定、讨论计划，与真实规划请求区分。
   - 主 Agent 核验五类触发及有效豁免。
   - 保留正向触发，不以扩大正则表达式代替语义判断。

**完成条件：** 所有反例及正例通过；原有路由回归不退化；索引缺失或过期时仍能按 manifest 恢复。

### U3｜修复 Plan Agent 内部合同与 admission 证明链

**修改范围：** Plan owner、现有 handoff checker，以及新增的最小依赖图检查器。

#### 1. 统一批准规则

- 任意 Supervisor、Hierarchical 及其嵌套使用，都遵守 K3。
- 已存在且匹配当前 scope 的真实批准直接复用。
- scope 或关键执行条件改变时重新核验批准适用性。
- 生成计划不产生修改、发布或外部操作权限。

#### 2. 绑定持久化与恢复身份

- 项目计划使用已验证项目绝对根目录下的 `docs/plans/`。
- NO_PIN 框架计划使用 `<framework-root>/framework-audit/plans/`。
- 在现有 checkpoint／handoff 中记录：
  `plan_id`、精确绝对路径、scope、source identity、`plan_sha256`。
- 恢复时核对同一计划及其内容哈希，不能按“最新文件”猜测。
- 无法匹配时返回 `NEEDS_CONTEXT`。
- 增量修订更新哈希并检查原批准是否仍适用，不增加另一套计划注册表。

#### 3. 增加严格 handoff 验收

扩展现有命令：

```bash
node scripts/check-quality-gates.mjs \
  --handoff <已绑定的精确路径> \
  --require-gate PASS
```

- `--require-gate` 只接受 `PASS`，必须与 `--handoff` 使用。
- 重复参数、非法组合及与 `--framework` 混用均失败。
- `--project-session` 继续沿用现有 pin 和 scope 校验。
- 严格模式忽略注释、代码围栏中的示例，拒绝缺失、重复或非法 gate 字段。
- 不带新参数时保留现有结构校验兼容性。
- **调用方负责路径和 SHA 属于本任务；checker 负责该文件的结构及 gate 值。**
- Quality Gate 的内容质量判断继续保留。

#### 4. 验证依赖图

新增纯检查命令：

```bash
node scripts/check-plan-graph.mjs --graph <精确JSON路径>
```

输入为 `plan_id`、`nodes[{id, dependencies}]` 和独立的 `external_dependencies[{node_id, source_ref}]`。

- 拒绝重复 ID、未知内部依赖、自环和一般循环。
- 输出拓扑顺序、层级和残留循环；不输出授权或执行 ready 状态。
- 外部依赖即使不参与内部拓扑，未获得通过证据时仍阻塞任务。
- 拆分后重新检查；保留原 U-ID 空缺和稳定子 ID。
- 残环阻止发布可执行 Wave；空图不能通过可执行计划验收。

**完成条件：** 批准、恢复、handoff 和循环反例全部被正确处理；原有 task-plan、implement 和稳定 U-ID 接口不变。

#### U3 追加安全证明工作（A1–A3）

- A1：批准票必须绑定现有 native 用户事件证明（event_id、boundary_id、session、prompt hash、计划 SHA、scope、effect set），普通可写 JSON 不得自行产生执行授权。
- A2：receipt 必须有 nonce 和受保护的一次性 claim；首次 dispatch/effect 原子消费，重复使用返回 REPLAY 并保持 PLANNED/NEEDS_CONTEXT。
- A3：plan、approval、identity、graph 都必须是 canonical regular file；admission 用固定快照/文件描述符生成不可变 envelope，首次 effect 前用同一 envelope 做 hash revalidation。
- 三项均需做 pass → 受控违规 → 恢复 pass 的 mutation 证据，并补一份只提供冻结 diff、断言和证据的独立冷启动 reviewer 票。模型服务不可用、票据缺失或生产调用点缺失时保持 UNKNOWN。

### U4｜修复评测的有效性

1. **旧评测正名。**
   - 保留 `eval_routing.py --judge` 入口兼容，明确标记为标签审查。
   - 不再将判官意见汇总为实际语义命中率。
   - keyword 分母必须大于零；无效 layer、重复 ID、空输入、非法活动目标明确失败。

2. **校准活动 golden。**
   - 清除活动期望中的退役能力。
   - 全流程请求的期望包括“推荐并等待选择”，不能只检查能力名称。
   - 完成 23 条现有 semantic fixture 的当前 owner 校准。
   - 历史日志不重写。

3. **扩展现有运行设施。**
   - 在 `run-agent-context-ab.mjs` 增加显式 `--suite routing-plan-v1`。
   - fixture 使用 `RP-01a…RP-12b` 和 `PO-01…PO-03`。
   - 未指定新 suite 时保持旧行为；不得混用 G5 参数。
   - 原 `--fixture all` 的 14 个历史单元和 G5 保持原义。

4. **确保测试真正测到被修改的系统。**
   - RP 实际消费对应版本的 production hook 提示，或保存可验证的原生 hook 注入证据。
   - 绑定用户原话、hook 输入输出、源码哈希、实际 Agent 上下文和运行轨迹。
   - 两臂使用相同公共提示、权限、模型、effort、评分和失败停跑规则；差异只来自被测版本及其 hook 输出。
   - 不沿用旧 runner 中 baseline/candidate 不对称的提示与限制。
   - expected 和 scorer 从被测 Agent 的实际可读范围中排除。
   - 先冻结真实产物和轨迹，再独立判定 PASS／FAIL／UNKNOWN。
   - fake/offline 结果不能进入真实行为成绩。

5. **单独测试 Plan 生成。**
   - PO 允许实际生成计划文本、U-block 和断言，禁止执行计划或写文件。
   - PO-02 输入冻结的前版计划和新 scope，检查实际生成的增量计划。
   - 不能把路由问答正确当作完整计划质量通过。

**完成条件：** 离线测试证明标准答案不泄露、hint 确实进入被测上下文、两臂条件一致、评分能识别故意破坏的实现。

### U5｜真实样本验证与最终会审

- 运行下节定义的有限矩阵。
- 运行 A1–A3 的受保护 receipt、重放、symlink 和 TOCTOU 负向矩阵；这些测试单独报告，不并入原 11 项分母。
- 对修复后的最终版本重新冻结源码和评分器。
- 两位独立审查代理分别复核问题闭合及方案适配。
- 实施者不为自己的修改提供唯一验收票。
- 终审后如再次修改影响结论的内容，相关项必须重新闭合。

---

## 四、测试矩阵与通过条件

### 1. 确定性验证

覆盖以下边界：

- 五类 Plan 触发分别测试，包含有效 HITL 豁免和直接指定 skill。
- Plan 引用、否定与真实请求。
- MULTI 词法碰撞与真实多意图。
- 图可读取但 Workflow 未被选择。
- 单阶段 Supervisor、已有有效批准、scope 变化。
- NO_PIN、显示别名指向其他项目、错误计划路径、同路径内容变化。
- handoff 的 PASS、FAIL、CONDITIONAL_PASS、缺失、重复、注释和围栏。
- 无环、自环、多节点循环、拆分后仍有环、缺失依赖、外部依赖未完成。
- keyword 分母为零、未知 layer、退役目标和无效 fixture。

回归包括现有 route、agent-contract、context 生成一致性、handoff 和退出码测试。对关键修复做隔离目录内的 mutation，确认测试能够变红；不在用户工作树中注入坏实现。

### 2. 口述路由：96 个首次运行单元

**12 个家族 × 每家族 2 个口述用例 × Claude/Codex × baseline/candidate。**

两个用例采用同义改写或正反对照：

| 家族 | 验证重点 |
|---|---|
| 忠实整理口述 | 不擅自扩展为 PRD 创作 |
| 泛原型请求 | 正确应用默认产出规则 |
| 明确选择 HTML | 尊重用户工具选择 |
| 跨产物评审 | 先识别评审对象 |
| 从需求到成品 | 推荐流程并等待选择 |
| 引用／否定计划 | 不被关键词强制规划 |
| 显式计划／直接指定 skill 后计划 | Plan 优先级成立 |
| 已有项目继续工作 | Project Gate 优先 |
| 多个独立意图 | 正确区分 Multi-Skill 与歧义 |
| 框架自检 | 保持 NO_PIN |
| 新颖复杂／成熟简单需求 | 研究前置适度 |
| 选择／仅提及工程 preset | 选择与讨论分开 |

先运行其中 **4 个校准单元**，检查隔离、hint 注入、轨迹和评分；它们计入 96 个单元，不额外叠加。

### 3. Plan 真实生成：6 个单元

三个案例，仅对 candidate 在双 harness 下运行：

1. 有真实依赖、采用单阶段 Supervisor 的计划。
2. 包含未决用户偏好、前版计划和 scope 变更的增量计划。
3. 包含循环依赖及失败 handoff 的阻塞计划。

逐条审查七项质量标准：

- 每个执行单元有真实来源，没有补造需求。
- 依赖与顺序正确，外部阻塞显式保留。
- 用户偏好没有被伪装成自主执行任务。
- 验收能够发现行为错误，不只检查文件存在。
- 路径、权限和批准范围匹配。
- 重规划保留有效决定和稳定身份。
- 复杂度与任务相称，没有无依据扩大范围。

### 4. 发布判定

- 本次确认的确定性缺陷全部修复并通过正反例。
- 冻结矩阵中的关键路由、权限、流程选择和 Plan 质量断言全部通过。
- UNKNOWN、未运行和基建失败分别报告，不计成功。
- 失败样本可按预注册规则成对追加最多两次诊断运行，保留原票，不能挑成功覆盖失败。
- 关键失败需要返修、冻结新版本并重跑受影响矩阵。
- 分 harness、家族报告分子／分母，以及不必要提问、读取量和运行成本。
- 没有原生运行证据，不宣称双 harness 行为一致。
- 这批样本只能证明所测边界，不能证明“所有口述永远命中”或 Plan 的普遍性能提升。

---

## 五、交付物与完成定义

实施完成后交付：

1. **审查报告**：11 项问题、证据、实际影响边界和两轮会审裁定。
2. **修复版本**：路由、Plan 合同、严格 handoff 检查、依赖图检查与评测修正。
3. **执行证据包**：冻结输入、源码哈希、标准答案、原始轨迹、评分、失败及诊断记录。
4. **最终验收表**：每项问题对应修复位置、测试和独立终审票。

默认保持 Skill-first、Graph-optional、Memory-light 的架构；不引入新的规划状态机，不调整未经实证支持的触发阈值，不自动切换项目或启用 Workflow。

**DONE 的含义：11 项缺陷完成修复，相关行为证据通过，最终版本得到独立复审确认。当前已完成的是只读审查与整改方案会审。**
