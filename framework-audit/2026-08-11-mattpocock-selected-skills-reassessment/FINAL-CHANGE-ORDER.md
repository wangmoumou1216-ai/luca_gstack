# mattpocock/skills Cycle 2 最终变更令

> change order：`MPC2-CO-20260811-001`  
> 状态：`FINAL_CHANGE_ORDER`  
> 日期：2026-08-11  
> 上游冻结：`mattpocock/skills@84fdeffd12f2ee307994d1eb6feb48173b6e0502`  
> 被变更计划：`../2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md`  
> 执行前置：`../2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md` 达到
> `RULE_EXECUTION_VERIFIED`，随后重算 Cycle 2 delta、package SHA 与 G-PACKAGE。  
> 性质：luca_gstack 框架/meta 变更，不是 muse 产品任务。

## 0. 权威声明

本文不是建议稿，也不是重做原计划。它是原 Cycle 2 最终计划的**增量执行权威**。

权威顺序固定为：

1. 用户最新明确指令与当前 harness 的安全/权限硬约束。
2. Rule Execution 计划对五类 shared-owner 面的临时阻断，直到
   `RULE_EXECUTION_VERIFIED`。
3. 本变更令对下文「覆盖表」列出的 Cycle 2 条款和任务。
4. 原 `FINAL-EXECUTION-PLAN.md` 的其余未覆盖内容。
5. 研究稿、旧 benchmark verdict、红队稿只作证据，不得反向覆盖本结论。

若新旧文本冲突：**只在本文列出的范围内以本文为准；未列出的原计划义务全部继续有效。**
执行者不得用“HEAD 原子当时是 KEEP”拒绝本文新增的可达性与编排义务。`KEEP` 只说明概念原子
已进入 Luca，不证明用户能够命中、不证明链路能够运行，也不证明 Claude/Codex 两端可达。

## 1. 最终裁决

Luca 不应原样安装用户点名的 10 个上游 skill。正确的吸收单位不是“十个孤立 skill”，而是三套系统：

```text
复杂/迷雾任务：wayfinder mode（可选前置）
                         ↓
工程交付链：tech-spec synthesis → task-plan → orchestrator implement → code-review
                         ↓
工程质量层：domain-modeling + codebase-design + safe conflict resolver
                         ↓
跨 session 连续性：existing handoff protocol + writing-for-agents doctrine
```

最终框架表面积控制如下：

- **新增两个共享一级 skill 真身**：`code-review`、`domain-modeling`。
- **新增一个用户主动选择的可选工程交付 workflow preset**，不自动强迫项目进入流程。
- **增强五个已有面**：Plan Agent、`tech-spec`、`task-plan`、Orchestrator、handoff operation。
- **扩展一个既有治理真值**：`skill-authoring.md`，不新建 `writing-for-agents` skill。
- **保留原计划两项 ADAPT**：`codebase-design` 与安全版 `resolving-merge-conflicts`。
- **上游原样安装数量为 0**；上游的自动 commit、自动冲突完成、tracker 反客为主均不得进入 Luca。

这是一项对旧评估方法的实质纠正：旧计划按“原子是否重复”裁决得很谨慎，但漏查了“复合能力是否
可调用”。用户判断这些能力配套使用是正确的；此前把它们简写为 KEEP/无新增，容易被读成“没用”。

## 2. 逐项深度裁决

| 上游能力 | 真实价值 | Luca 当前事实 | 最终动作 | 为什么不是原样新增 |
|---|---|---|---|---|
| `wayfinder` | 在需求大、跨 session、存在 fog 时先画 destination/fog/frontier/claim，避免过早拆假任务 | Plan Agent 已吸收 fog 词汇，但“wayfinder 看现在该做什么”仍不能稳定命中 | `PROMOTE_MODE`：正式成为 Plan Agent 的决策地图模式；工程 workflow 仅在复杂度门命中时把它放在最前 | 它产的是规划视图，不应成为第二套任务状态或第二个 SSOT |
| `to-spec` | 把现有对话、代码和决策直接合成可实施 spec，并明确测试 seam | `tech-spec` 已有 seam，但偏向标准输入链；“从当前上下文直接成 spec”还不是明确 input mode | `ENHANCE_EXISTING`：给 `tech-spec` 增加 conversation/artifact synthesis input mode | 新建 `to-spec` 会与 `tech-spec` 重复真值和产物路径 |
| `to-tickets` | 把 spec 切为 vertical tracer slices、blockers 与 frontier，是多人/多 session 实施的关键桥 | `task-plan` 已吸收 vertical slice/frontier，但没有 provider-neutral ticket projection 闭环 | `ENHANCE_EXISTING`：保留 `task-plan` 为 canonical；增加可选的一向 ticket projection adapter | 远端 tracker 不能替代 pinned project docs 与 stable IDs；上游 setup 合同不适配 Luca |
| `implement` | 把“批准后的计划”转换为持续实现、测试、检查、审查的执行入口 | Orchestrator 有 Free Task 执行，但“执行已批准 task-plan/tickets”语义命中不足 | `ADD_DISPATCH`：增加显式 implement intent → Orchestrator Free Task；完成后强制 `code-review` | 上游正文很薄，且自动 commit 不符合 Luca 的授权边界；没有必要复制一个 skill |
| `code-review` | 独立审查 diff/branch/PR；标准轴与 spec 轴分开，避免交叉污染 | 核心逻辑埋在 `code-hygiene` mode D；英文 intent 可能 STOP；self-model 误称 builtin | `NEW_SHARED_SKILL`：从 mode D **迁出**为同源一级 skill；`code-hygiene` 改为引用它 | 不是复制：canonical review doctrine 只能有一份，mode D 不再保留平行正文 |
| `domain-modeling` | 统一活跃术语、概念边界、edge scenarios，并对照代码/ADR；适合改 Luca 框架术语时防漂移 | 只有散落的 terminology inline rules，无显式入口和领域模型制品 | `NEW_SHARED_SKILL`：增加产品中立、项目 pin 感知的一级 skill；持久化前保留人类门 | 它与代码结构建模不同；输出和触发意图独立，不能继续埋在 brainstorm/CLAUDE 散文里 |
| `codebase-design` | 用 deep modules、seam、test surface 检查模块边界 | 原计划判断正确；当前 Claude 目标存在，Codex 共享目标仍需闭合 | `KEEP_ORIGINAL_ADAPT`：共享真身、双端直调与 nested reference | 不改变原计划，只提升为本变更令 P0 验收对象 |
| `resolving-merge-conflicts` | 在 merge/rebase 真实冲突中追溯双方意图再提案 | 上游原文要求 never abort 且自动 stage/commit/continue；Luca 当前只应保持 containment | `KEEP_ORIGINAL_SAFE_ADAPT`：只读侦察+逐 hunk 提案；每个危险动作新顶层人类批准 | 原样能力不安全；任务调用不等于 Git 写授权 |
| `handoff` | 跨 session、跨模型恢复任务时保存目标、状态、关键路径和下一动作；本次长计划本身就证明其价值 | 已有 handoff protocol 与 auto checkpoint，但没有稳定的显式用户操作入口 | `EXPOSE_EXISTING_PROTOCOL`：新增薄 route/command adapter，仍只写现有协议和既有路径 | 不能再建第二套 handoff schema、临时文件真值或旁路项目 pin |
| `writing-for-agents` | 让 SKILL/AGENTS/CLAUDE/运行文档按 agent 的加载成本、指针层级和完成判据来写 | `skill-authoring.md` 已覆盖一部分，但适用面过窄 | `EXPAND_DOCTRINE`：把 agent-consumed docs 纳入同一 authoring SSOT，并给 AGENTS/Codex 明确指针 | 它是内部写作纪律，不是用户要单独完成的业务任务；新增 skill 只会增加路由噪音 |

## 3. 对原计划的精确覆盖

| 原计划位置 | 原结论 | 本变更令 | 执行解释 |
|---|---|---|---|
| §0.2 / §3 `promoted_now=0` | 19 个 HEAD DEFER 当前晋升 0 | **保持**，但仅约束原 19 个 DEFER | ticket projection 是现有 gap 的价值晋升，不得错误计入 19 个 HEAD DEFER |
| §0.3 能力列表 | 更新 debug/TDD；共享 codebase/resolver；teach Claude-only | **扩展**：另加 shared `code-review`、shared `domain-modeling`，并增强五个既有面 | 这两项是新一级 surface；其余是既有真值增强 |
| §0.4 / DEV-010 | 不新增 workflow node | **替换**为：新增一个 optional `engineering-delivery` preset；只有用户主动选择才运行 | standalone 仍可直调；workflow 不能自动写远端、commit 或跨人类门 |
| DEV-006/TST-006 | codebase-design 双端共享 | **保持并升为 P0** | Codex dangling target 必须在能力链启用前修复 |
| DEV-007/TST-007 | safe resolver | **保持并升为 P0** | containment 未通过前不能宣称 resolver 可用 |
| DEV-009 | TDD 的悬空 `code-review` 改指向 `code-hygiene` | **覆盖**：先建立一级 `code-review`，然后 TDD 指向一级 skill | 不再把 review 永久埋在 hygiene mode D |
| DEV-009 | 只扩 skill authoring/FUSION/DEFER | **扩展** writing-for-agents doctrine 到所有 agent-consumed docs | AGENTS/CLAUDE 只放指针，不复制 doctrine |
| DEV-010/TST-010 | 修现有 route closure | **扩展**新增能力、模式、operation、preset 的双端 reachability | 仅文件存在不能 PASS；必须 live invocation 与 mutation test |
| ASSERT-013/014 | 五种场景与注册闭包 | **扩展**为本文 DASSERT-001..012 | 原 ASSERT 继续保留；新增断言不挤占旧分母 |
| 321 / 2,568 原子验收 | 冻结审计 lineage | **保持**，另加 delta acceptance ledger | 不回写历史审计决策；最终完成须同时通过旧矩阵和本文增量矩阵 |

## 4. 新执行拓扑与触发纪律

### 4.1 可选工程交付 preset

名称建议：`engineering-delivery`。它只是一个用户主动选择的 workflow preset，不是新的产品 workflow
强制路径，也不改变 Skill-first / Graph-optional。

```text
用户选择 engineering-delivery
  ├─ 复杂度/迷雾门命中 → Plan Agent: wayfinder mode
  └─ 输入已清晰        → 跳过 wayfinder
          ↓
tech-spec: synthesis mode
          ↓
task-plan: vertical slices + stable IDs
          ↓
optional ticket projection（默认 local/off）
          ↓
Orchestrator: implement approved frontier
          ↓
code-review（只读审查；发现问题回到对应 task）
```

### 4.2 standalone 与自主命中

| 能力 | 自主语义命中 | workflow 内强制 | 人类门 |
|---|---|---|---|
| wayfinder mode | 大型、多 session、目标迷雾、依赖尚未锐化；明确小任务跳过 | 条件性前置 | 不产生远端/代码写 |
| tech-spec synthesis | “根据当前讨论/代码直接形成规格” | 是 | 高影响 seam 决策沿用现有门 |
| task-plan | “拆任务/拆票/形成实施卡” | 是 | 远端 projection 默认关闭 |
| implement dispatch | “按已批准计划/卡片执行” | 是 | 不自动 commit/push；危险动作仍逐项授权 |
| code-review | review diff/PR/branch/implementation | 是，实施完成后 | 默认只读；修复需另行授权或属于原实施范围 |
| domain-modeling | 术语冲突、概念重载、模型与代码含义不一致 | 需要时内部命中 | 持久化 glossary/ADR 前由人确认 |
| codebase-design | 模块 seam、deep module、接口可测性 | 需要时内部命中 | 高影响架构选择沿用 spec/plan 门 |
| resolver | 仅真实 merge/rebase conflict | 否 | abort/stage/commit/continue 各自等待新顶层回复 |
| handoff operation | 用户明确“交接/换 session/给下一个 agent”或 session 边界建议 | workflow 结束时生成 | 只写 pinned project/meta 允许路径 |
| writing-for-agents | 编辑任何 agent-consumed 文档时内部强制读取 | 不作为节点 | doctrine 改动走现有治理门 |

## 5. 新增执行包

在 Rule Execution 达到 `RULE_EXECUTION_VERIFIED` 后，由 Cycle 2 执行 session 把下列工作包并入新的
package SHA。不要在当前 dirty shared-owner 面上并行实现。

### CO-01 — 重新冻结与归属消歧（P0）

- 输入：Rule Execution 的最终 receipts、当前 HEAD、原 Cycle 2 package、本变更令。
- 动作：重算相关面 delta；记录哪些文件由 REX 已实现、哪些仍由 Cycle 2 拥有；任何 hunk 归属不清即
  `BLOCKED_DIRTY_OVERLAP`。
- 输出：新的 package allowlist、SHA、owner matrix 与 G-PACKAGE descriptor。
- 禁止：复写 REX 已完成逻辑、沿用旧 SHA、整文件 stage。

### CO-02 — 一级 `code-review` 迁出（P0）

- 将 `code-hygiene` mode D 的 canonical review doctrine 迁入共享 `code-review` 真身。
- `code-hygiene` 只保留调用指针；不得复制 review 正文。
- 修正 `self-model.yaml` 对不存在 builtin 的声明。
- 给中英文 review intent、直接调用、workflow 调用和 nested call 建双端 fixtures。
- 默认只读；“审查并修复”只有在原任务授权含修复时才写。

### CO-03 — 一级 `domain-modeling`（P1）

- 新建一个 Claude/Codex 同 tree 的产品中立共享 skill。
- 输出最小合同：active terms、glossary、edge scenarios、code/ADR cross-check、unresolved decisions。
- 与结构型 data model/codebase design 做 route 消歧；高影响术语或 ADR 持久化前停下人裁。
- 不硬编码产品词汇；项目事实只来自 active project `CONTEXT.md`。

### CO-04 — wayfinder Plan mode（P1）

- 在 Plan Agent 中建立具名 mode 与 route，不新建第二 skill/state store。
- 使用现有 plan/PROGRESS/stable IDs 保存 destination/fog/frontier/claim。
- 添加清晰任务负例，证明小任务不会被强行 wayfinder 化。

### CO-05 — 交付链既有面增强（P1）

- `tech-spec`：增加 conversation/artifact synthesis input mode；不得重复采访已有答案。
- `task-plan`：保持 canonical cards/stable IDs；明确 vertical slice、blocker、frontier 输出。
- Orchestrator：增加“执行批准后的 task-plan/ticket frontier”语义 dispatch；实施后进入一级
  `code-review`；移除任何自动 commit 推断。
- 建立 standalone 与 workflow 两套调用测试。

### CO-06 — optional `engineering-delivery` preset（P1）

- 复用现有 Plan/skill/orchestrator 真值，只写薄编排。
- Claude/Codex 必须运行同一个 workflow source；Codex 通过现有 workflow runner 投影。
- 用户不选择 workflow 时，任何 standalone skill 不能被 graph gate 阻塞。
- 中断、恢复、失败回流都使用 stable IDs 和现有 handoff，不引入新状态机。

### CO-07 — 显式 handoff operation（P1）

- 增加薄 route/command adapter，唯一正文仍是现有 `handoff-protocol.md`。
- framework/meta 交接写 framework-audit；项目交接只写 session pin 指向项目的既有 handoff 路径。
- 做 A session 生成 → fresh Claude B 恢复、A → fresh Codex B 恢复两类活体测试。
- 检查 redaction、exact paths、未决人类门、下一步与 suggested skills。

### CO-08 — writing-for-agents doctrine（P1）

- 扩展 `.claude/skill-os/skill-authoring.md` 为 agent-consumed documentation SSOT：加载层级、指针、
  environment-as-runtime-SSOT、cache/重复成本、完成判据与删除过期说明。
- `AGENTS.md`、`CLAUDE.md` 与 skill authoring 流程只引用该 SSOT，不复制长文。
- checker 必须能杀死 dangling pointer、重复真值和未声明完成判据的 mutant。

### CO-09 — codebase/resolver 原计划闭合（P0）

- 继续执行原 DEV-006/007，不另起实现。
- `codebase-design`：Claude/Codex 同 tree、直调/nested 都可达。
- resolver：在 containment 之后才允许安全 candidate；逐动作 human turn 证据不能降级。

### CO-10 — ticket projection 分阶段晋升（P2）

- 该项是现有 evolution gap 的晋升，不改 19 个 HEAD DEFER 的 `promoted_now=0`。
- canonical 永远是 pinned project docs + stable IDs + handoff；ticket 是可重建 projection。
- Phase 0：字段所有权、stable_id/external_id、hash/version、幂等、回滚、receipt 合同。
- Phase 1：只做 pinned project 内 local Markdown pilot。
- Phase 2：只有 Phase 1 通过才选一个 provider、一个项目做 conditional pilot。
- Phase 3：没有 provider CAS/lease 和多 session live proof 时永久 NO-GO。

### CO-11 — route/registration/live parity（P0）

- checker 必须验证外部/共享 target 真实存在，不能只查项目 skill。
- 每个新增面都要有 direct、semantic、internal、selected-workflow、STOP/negative 五相位证据。
- Claude 与 Codex 都要 fresh-session live receipt；静态表、文件存在或 agent 自报不能代替。
- Codex hooks live route 未通过前，不得宣称自然语言自主命中已完成；显式 `$skill` 与自动 route 分开计。

## 6. 增量断言

| ID | Given / When / Then | PASS 证据 |
|---|---|---|
| DASSERT-001 | Given 复杂与清晰两类需求，When 选择工程交付 preset，Then 只有复杂类进入 wayfinder，且 wayfinder 位于 to-spec 前 | 双 fixture trace |
| DASSERT-002 | Given 未选择 workflow，When 直调 tech-spec/task-plan/review/domain modeling，Then graph 不阻塞 standalone | 双端 negative/positive route |
| DASSERT-003 | Given review 中英文 intent，When Claude/Codex 分别运行，Then 均到同一 code-review tree，标准轴与 spec 轴独立 | tree hash + live receipts |
| DASSERT-004 | Given code-hygiene mode D，When迁移完成，Then其正文只存在于 code-review，旧入口仍通过指针工作 | duplicate-content mutant |
| DASSERT-005 | Given术语冲突，When domain-modeling，Then输出 glossary/edge/code-ADR cross-check，未批准不持久化高影响决定 | artifact + human gate receipt |
| DASSERT-006 | Given当前对话已含答案，When tech-spec synthesis，Then不重复采访并产 seam/contract | conversation fixture |
| DASSERT-007 | Given批准的 task-plan，When implement dispatch，Then只执行 frontier、持续验证、最后 review，且不自动 commit | execution trace + Git tuple |
| DASSERT-008 | Given handoff A，When fresh Claude/Codex B 接手，Then B 只读 handoff 即能恢复目标/状态/路径/下一步且不跨项目 | cross-session resume receipts |
| DASSERT-009 | Given ticket projection 重跑/远端漂移，When同步，Then canonical docs不被覆盖，重复运行幂等，冲突停下 | hash/version/CAS fixtures |
| DASSERT-010 | Given真实 merge/rebase conflict，When resolver运行，Then每个 abort/stage/commit/continue 都等待新的顶层人类回复 | adversarial Git receipts |
| DASSERT-011 | Given任一 shared target/hook/route 被移除，When closure checker运行，Then非零且指出缺失 edge | mutation suite |
| DASSERT-012 | Given旧 321/2,568 验收与本文 delta ledger，When终验，Then两者都 PASS 才能输出完成 token | combined acceptance summary |

## 7. GO / NO-GO

### 立即列入 Cycle 2 delta

- shared `code-review`
- shared `domain-modeling`
- wayfinder Plan mode
- tech-spec synthesis / task-plan chain / implement dispatch
- optional engineering-delivery preset
- explicit handoff operation
- writing-for-agents doctrine
- codebase-design 与 safe resolver 原任务
- external target + dual-harness live reachability checker

### 只允许分阶段 pilot

- ticket projection：先 local Markdown，再单 provider/单项目；默认关闭。

### 明确禁止

- 整包安装 mattpocock/skills。
- 把 tracker 设成 Luca canonical truth。
- 复制出第二份 tech-spec/task-plan/handoff/authoring doctrine。
- 把 wayfinder 做成第二状态机。
- implement 自动 commit/push。
- resolver 自动 stage/commit/continue/abort。
- 用静态文件存在、自报或 Claude 单端结果冒充双端完成。

## 8. 完成定义

本变更令只有在以下条件全部满足后才算被执行：

1. `RULE_EXECUTION_VERIFIED` 已有可核验 receipt，Cycle 2 已重算 package SHA 和 owner matrix。
2. 原计划未覆盖义务继续通过；原 321/2,568 lineage matrix 不被删减或伪改。
3. CO-01..CO-11 全部有 owner、独立测试和结果；DASSERT-001..012 全部 PASS。
4. Claude/Codex fresh session 证明 direct、semantic、internal、workflow 与 negative route。
5. 只有两个新增共享一级 skill 真身；所有增强面仍引用已有 SSOT。
6. ticket projection 至多达到被证据允许的 phase；不得以计划存在冒充 pilot 完成。
7. 最终 combined acceptance 输出唯一 token：`MPC2_CHANGE_ORDER_INTEGRATED`。

执行中若同一根因失败三次，报告 `BLOCKED`；若 Rule Execution 未完成，终态是
`BLOCKED_BY_REX_DELTA`，不得越过 shared-owner 边界抢跑。

## 9. 一手证据

- upstream `to-spec`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/to-spec/SKILL.md>
- upstream `to-tickets`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/to-tickets/SKILL.md>
- upstream `implement`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/implement/SKILL.md>
- upstream `wayfinder`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/wayfinder/SKILL.md>
- upstream `domain-modeling`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/domain-modeling/SKILL.md>
- upstream `code-review`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/code-review/SKILL.md>
- upstream `codebase-design`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/codebase-design/SKILL.md>
- upstream resolver：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/engineering/resolving-merge-conflicts/SKILL.md>
- upstream `handoff`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/productivity/handoff/SKILL.md>
- upstream `writing-for-agents`：<https://github.com/mattpocock/skills/blob/84fdeffd12f2ee307994d1eb6feb48173b6e0502/skills/productivity/writing-for-agents/SKILL.md>

Luca 本地证据锚：

- `.claude/skills/office/tech-spec/SKILL.md`
- `.claude/skills/office/task-plan/SKILL.md`
- `.claude/agents/plan-agent.md`
- `.claude/skills/office/code-hygiene/SKILL.md`
- `.claude/skills/office/references/handoff-protocol.md`
- `.claude/skill-os/skill-authoring.md`
- `.claude/skill-os/evolution/self-model.yaml`
- `.claude/skill-os/evolution/gaps-register.yaml`
- `.claude/skill-os/skill-routing-map.yaml`

<!-- FILE_END: FINAL-CHANGE-ORDER.md -->
