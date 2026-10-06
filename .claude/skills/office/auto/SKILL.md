---
name: auto
preamble-tier: 2
argument-hint: "[需求描述，或多个任务组合描述]"
description: |
  全自动多 Agent 设计编排器：自然语言需求 → 自动分解任务 → 映射 skill → 编排 Work Agent 并行/串行 → 聚合产出。luca_gstack 顶层自动化入口，用户无需手动选 skill。(luca_gstack)
recommended-model: core-execution  # 2026-07-10 new_scenario_protocol 定档：整场多agent编排（大token+中判断杠杆）
version: 2.1.0
---

# /auto — 全自动多 Agent 设计编排器

**定位：** luca_gstack 的顶层自动化入口。用户用自然语言描述需求，主 Agent
自动分解为任务、映射到 skill、编排 Work Agent 并行/串行执行，
最终聚合产出。用户无需手动选择任何 skill。

---

## 激活条件

**激活 /auto（而非具体 skill）：**
- 用户描述多阶段组合需求（调研 + 设计 + 原型的任意组合）
- 用户说「全流程」「自动做」「auto」「一键」「帮我全部搞定」
- 用户的需求触发了多个 skill 关键词（route-guard 输出了多条提示）

**不激活，走 standalone skill：**
- 用户点名具体 skill（「用 MagicPath 做个原型」→ magicpath；「本地 HTML」→ /html-prototype）
- 单一任务（只需一个 skill）

---

## 执行协议

### Step 0 — Semantic Parse（< 30s，主 Agent 执行）

读取用户原始需求，输出：
- **功能域**：目标产品的哪个模块/方向
- **需求类型**：新功能设计 / 已有功能优化 / 全流程评审 / Agent 化改造
- **期望深度**：仅研究 / 研究+方案 / 研究+方案+原型 / 全链路
- **设计输入成熟度**：已选方案就绪 / 已有书面或口述需求 / 已有原型与精修范围 / 尚需发现；
  与 A/B/C/D 场景分开，继承已确认模板、位置、工具及授权。

---

### Step 1 — Auto Skill Mapping（主 Agent 执行）

依据 Semantic Parse 结果，参考 `.claude/skill-os/skill-routing-map.yaml`，
构建 **Skill Pipeline**（有序 + 依赖标注）：

#### 先按设计入口继承，再推荐场景路径

已有输入就绪且用户目标是设计生成时，以 `.claude/skill-os/optional-workflow-graph.yaml`
的 `design_entry_paths` 为唯一入口路径 owner：pipeline / existing_requirements /
prototype_visual_refinement 均从 design-brief → 已选生成工具开始。无需用户另说“跳过调研”，
也不为进入 Brief 先造 PRD 或重做成熟方案；机制/多方案未定才返回对应发散节点。
原型仅美化不授权植入；明确植入再精修时由 Brief 分阶段界定 add/modify 与 refine。
用户已选大流程则沿所选路径继承已完成节点，只执行剩余节点，不自动换成短流程。
入口不明且会改变工作目标时只问必要的一题；下表仅用于尚需发现或用户明确要求的大流程。

#### Skill 映射规则

| 用户意图 | Skill Pipeline |
|---------|---------------|
| 全流程设计（调研→方案→原型） | deepresearch ‖ ux-research → brainstorm → ux-brainstorm → design-brief → open-design |
| 调研 + 方案（无原型） | deepresearch ‖ ux-research → brainstorm → ux-brainstorm |
| 调研 + 原型（快速迭代） | ux-research → design-brief → open-design |
| 仅研究 | deepresearch ‖ ux-research（并行） |
| 评审改版 | ux-audit → design-brief → open-design |
| Agent 化改造 | brainstorm → deepresearch → design-brief → open-design |

> `‖` = 并行，`→` = 串行依赖
>
> 设计产出终端默认推荐 **open-design**（CLAUDE.md 定的设计产出首选），以用户已选工具为准。
> OD 不可达、认证失败或非 React/Canvas 场景不授权自动换工具；仅在用户明确选择 MagicPath / 本地 HTML，
> 或明确批准包含相应备用路径的计划且触发条件满足时，才 dispatch 对应能力；否则报告 `BLOCKED` 并交还用户。
> figma-demo 已降级为隐藏 skill，不作默认推荐。

#### 场景 B — 跳过研究阶段（快速原型模式）

当用户**明确**表示不需要调研，或要求「直接出方案」「跳过调研」时，
使用精简 Pipeline：

| 触发信号 | Skill Pipeline |
|---------|---------------|
| 「直接出设计方案」「跳过调研」 | ux-brainstorm → design-brief → open-design |
| 「已有调研，直接出 PRD」 | brainstorm → ux-brainstorm |
| 「已有 PRD，直接出原型」 | design-brief → open-design |

> **判断原则：** 先继承实际输入成熟度和用户所选流程；已有需求/原型不因缺少“跳过”字样重跑整链。
> 尚需研究且用户选择完整流程时才推荐整链。短入口保持 Brief 来源、状态、适配、冻结和验收门。

---

#### 内置 Skill 作为辅助步骤（嵌入对应 Phase，不单独占 Phase）

| 辅助需求 | 嵌入到哪个 Phase |
|---------|----------------|
| 联网搜索竞品信息 | deepresearch / ux-research Phase |
| 截图竞品页面 | ux-research Phase |
| 产出写入飞书文档 | 最终 Phase 后追加 |

---

### Step 2 — Plan Output（展示给用户，**Hierarchical 必须等确认**）

每个 Phase 必须声明 `execution_context`，执行位置继承
`.claude/agents/references/plan-design-guidance.md` 的表及 `.claude/agents/orchestrator.md`
§2.2 skill_execution 分支；完整读取这两个 owner 后确定阶段。逻辑 WA 标签只表示阶段职责，
不表示一律 spawn；交互节点由主会话执行，独立研究节点才可在已授权范围内派发。

| Skill | execution_context | 前置 |
|---|---|---|
| `deepresearch` | subagent | 主会话已收齐实际 skill 的 Human Gate 参数 |
| `ux-research` | subagent | 主会话已收齐实际 skill 的 Human Gate 参数 |
| `brainstorm` | main_agent | 当前对话承接方案与取舍 |
| `ux-brainstorm` | main_agent | 当前对话承接方案与取舍 |
| `design-brief` | main_agent | 当前对话承接输入与冻结选择 |
| `open-design` | main_agent | 当前对话承接工具、授权及采用选择 |

其他 skill 按上述 owner 和自身交互合同确定，不能仅按 WA 标签决定执行位置。
以下是全链路示例；实际按选定 Pipeline 展示 Phase 和输出，短入口不创建空研究/PRD节点：

```
【/auto 执行计划】

需求：<用户原始描述>
场景：<A/B/C/D> — <场景说明>
识别类型：<功能域 + 需求类型>

━━━ Phase 1（并行）━━━
  WA-1a: /deepresearch [execution_context=subagent] — <具体研究方向，1句话>
  WA-1b: /ux-research [execution_context=subagent]  — <竞品/UX 研究方向，1句话>

━━━ Phase 2（依赖 Phase 1）━━━
  WA-2: /brainstorm [execution_context=main_agent] — <PRD 主题，1句话>

━━━ Phase 3（依赖 Phase 2）━━━
  WA-3: /ux-brainstorm [execution_context=main_agent] — <UX 设计方向，1句话>

━━━ Phase 4（依赖 Phase 3）━━━
  WA-4: /design-brief [execution_context=main_agent] — <交互契约主题，1句话>

━━━ Phase 5（依赖 Phase 4）━━━
  WA-5: open-design [execution_context=main_agent] — 基于 design-brief 的 Generation Packet 产出设计（OD 交接与回收 HTML）

预计产出路径：
  docs/research/ · docs/prd/ · docs/decisions/ · open-design 产出（HTML）

Phase ≥ 3 → 等用户确认后再执行 (y/n)
```

---

### Step 3 — Orchestrated Execution（用户确认后）

#### 3.1 Work Agent 启动规范

主 Agent 先完整读取当前阶段实际 SKILL.md，识别全部适用 Human Gate 和参数，按
Orchestrator §2.2 运行 preflight。已有真实用户选择直接继承；缺少的研究深度、成本或范围
参数先在主会话收集真实回答，再把参数及来源显式写进 WA prompt。未决 Human Gate 时停止
该阶段派发和依赖后继，不静默选档或使用 headless fallback 代答。

`execution_context=main_agent`：主 Agent 直接在当前对话执行该 skill 的完整协议，
保留其真实提问和用户选择；由 skill 写自己的 handoff，auto 不重复写。

仅 execution_context=subagent 时填写 `.claude/agents/work-agent-template.md` 变量；
所有必填项必须具体化，并填 MODE=skill_execution、SKILL_TO_EXECUTE、SKILL_PATH，
避免落入模板的 task_execution 分支：

```
{{MODE}}                  : skill_execution（仅后台 skill 阶段）
{{PHASE_ID}}              : 阶段编号，如 1a、2、3
{{TOTAL_PHASES}}          : 总阶段数，如 4
{{ROLE}}                  : Skill Executor for <skill-id>
{{GOAL}}                  : 读取并执行 <skill-id> skill，产出 <output-path>
{{TASK_CONTEXT}}          : Phase <N> / <用户需求一句话摘要>
{{WORK_ROOT}}             : <派发时由已验证 binding.realpath 冻结的绝对项目根>
{{INPUT_FILES}}           : - .claude/skills/office/<skill-id>/SKILL.md — 执行协议
                            - <WORK_ROOT>/docs/handoff/<上游 handoff>.md — 上游约束（如有）
{{TASK_DESCRIPTION}}      : 读取 SKILL.md，按其执行协议完整执行，
                            输入为：<从用户需求提炼的具体化描述>
{{INHERITED_CONSTRAINTS}} : - framework/ 只读
                            - <上游 handoff 中的约束，如无填"无">
{{REFERENCE_ASSETS}}      : - <上游产出路径，作为本 skill 的输入，如无填"无">
{{PRIMARY_OUTPUTS}}       : - <相对 WORK_ROOT 解析后的绝对输出路径>
{{OUTPUT_FORMAT_SPEC}}    : 遵照 SKILL.md 定义的输出格式
{{PROTECTED_PATHS}}       : framework/、CLAUDE.md
{{DONE_CRITERIA}}         : - [ ] <absolute-output-path> 文件存在且非空
                            - [ ] <WORK_ROOT>/docs/handoff/<date>-<topic>-<skill-id>-handoff.md 已写入
{{AVAILABLE_SKILL_PATHS}} : .claude/skills/office/<skill-id>/SKILL.md
{{SKILL_TO_EXECUTE}}      : <skill-id>（skill_execution 模式必填）
{{SKILL_PATH}}            : .claude/skills/office/<skill-id>/SKILL.md（skill_execution 模式必填）
```

#### 3.2 Work Agent 内部执行协议

Work Agent 收到指令后必须按以下顺序执行：

```
1. Read {{AVAILABLE_SKILL_PATHS}} 中的 SKILL.md（必须完整读完到 FILE_END 标记）
2. 按 SKILL.md 的执行协议完整执行（不依赖 Skill 工具，直接遵照协议产出）
3. 确认产出文件存在于 PRIMARY_OUTPUTS 规定的路径
4. 写 handoff summary → <WORK_ROOT>/docs/handoff/<date>-<topic>-<skill-id>-handoff.md（topic-bearing，与 handoff-protocol.md 规范一致）
5. 返回 Completion Report
```

**Work Agent 不得：**
- 在未完整读完 SKILL.md 的情况下开始执行
- 修改其他 Phase 的产出
- 在 skill 未完成时返回 Completion Report

#### 3.3 Orchestrator 编排规则

```
并行 Phase（‖）: 仅已确认 execution_context=subagent 且无数据依赖的阶段可并发启动
串行 Phase（→）: 前 Phase 完成 + handoff gate PASS + 所有必需质量门通过，才执行下一 Phase
质量门控     : 两种 execution_context 使用相同的依赖、handoff、质量及取消门；任一必需项失败停止对应后继
```

派发前，主 Agent 必须把全部输入、`PRIMARY_OUTPUTS` 与 handoff 路径相对 `WORK_ROOT`
解析为固定绝对路径。后续 session 项目选择不能改变已派发任务落点；后台 WA 禁止重新读取共享
`docs/`、workflow-state 或 current-topic 显示别名来决定路径。明确取消时，主 Agent 先停止尚未
派发的新工具动作，再调用当前 harness 的中断 primitive 并收集退出/在途结果；已发出或宿主
无法中断的动作必须如实报告，不能冒称 OS 级撤销。

#### Phase 失败处理（W9，含主会话与后台阶段）

**工具授权先于重试分流：** 以下重试只限同一已授权工具，不得借 `BLOCKED` 改走未授权备用工具。
缺少工具切换授权时暂停并交还用户；已有计划明确批准的备用路径可在其触发条件满足时继续，无需重复确认。
OD original_copy v1 是 HEADLESS_ONLY：在该阶段 profile/外部 stage/run 前，由主会话按 OD
Phase 0 核真实显式 headless opt-in 与独立 run grant，缺项 STOP 等真人选择。原件失败遵守
OD Phase 3H：桌面生成/回收不支持，不能套 W9 的普通恢复；耗尽或无法核终态就保留失败并停止
该交付/依赖后继。普通 carrier/reference_only headless 失败保留原有「一次 retry → 同一项目 OD 桌面端恢复」，这不是更换工具；
该一次 retry 由 OD 路径计数，W9 不得通过重启 WA 重置它或重新进入已耗尽的 headless 路径。

等待调用超时不等于任务终态。真实失败、取消和资源上限仍按原约束处置。
重试前确认原 WA 已终止、收取在途结果并核对已完成效果；只按已有授权重试未完成部分。
原任务仍在运行则沿原句柄等待；无法观察终态则暂停该依赖并报告缺口，不另开同一任务。

| WA 返回状态 | Orchestrator 动作 |
|------------|-----------------|
| `DONE` — 产出路径存在 | 核对该 skill 必需质量门和下游所需证据已通过后继续；存在性不替代验收 |
| `DONE` — 但产出路径不存在 | 视为隐式 BLOCKED，执行重试 |
| `BLOCKED` — 首次 | 按上述终态与授权检查，**重试一次**；传入原 blockers 和已完成产物，不重放已完成效果 |
| `BLOCKED` — 重试后仍失败 | **停止当前 Pipeline**，向用户报告：阻塞 Phase、blockers 列表、建议操作（手动执行该 skill / 跳过该 Phase）|
| 等待超过 5min，尚无任务终态 | 告知进度，沿实际句柄继续等待/取状态；不因此标 BLOCKED 或重启 WA |
| `NEEDS_CONTEXT` — 缺信息/歧义 | **停止当前 Phase**，向用户呈现 WA 的 blockers（缺什么信息 / 哪两份文档矛盾），补充上下文后续做未完成部分；不盲目重试 |

**不允许无限重试**：单个 WA 最多重试 1 次，失败后必须上报，不得静默跳过。

#### 3.4 内置 Skill 在 Work Agent 中的调用方式

如果某 Phase 需要内置 skill（web-access、agent-browser 等），Work Agent
直接使用对应工具能力执行（WebSearch / WebFetch / Screenshot），将内置 skill
作为辅助手段，产出记录到 PRIMARY_OUTPUTS。

---

### Step 4 — Aggregation（主 Agent 执行）

所有选定 Pipeline 的 Phase 完成后（下例仅展示全链，不宣称未运行节点完成）：

汇总前按 `.claude/agents/orchestrator.md` §2.2 的完成边界核对原需求和未完项；局部交付不关闭整体。

1. 读取 `<WORK_ROOT>/docs/handoff/` 中本次 session 的所有 handoff summary
2. 输出汇总报告：

```
【/auto 完成报告】

执行摘要：
  ✅ Phase 1: deepresearch + ux-research — 完成
  ✅ Phase 2: brainstorm — 完成
  ✅ Phase 3: ux-brainstorm — 完成
  ✅ Phase 4: design-brief — 完成
  ✅ Phase 5: open-design — 完成

产出清单：
  研究报告   → docs/research/deepresearch-<topic>-YYYY-MM-DD.md
  UX研究     → docs/research/ux-research-<topic>-YYYY-MM-DD.md
  PRD        → docs/prd/YYYY-MM-DD-<topic>-prd.md
  UX方案     → docs/decisions/YYYY-MM-DD-<topic>-ux-brainstorm.md
  交互契约   → docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
  Open Design → docs/decisions/ 设计产出（HTML）

关键决策：<各 skill handoff 中的核心决策，3-5 条>

推荐下一步：
  - /ux-audit — 对原型做 UX 评审
```

> 产出路径真值源：`.claude/skills/office/SKILL.md`「产出路径约定」（受保护 glob 见 skill-invariants.md P2）。

---

## 约束

- 不跳过任何 skill 的内部质量门控
- Work Agent 必须完整读完 SKILL.md（到 FILE_END 标记）才能开始执行
- Hierarchical（≥ 3 Phase）必须等用户确认计划
- framework/ 只读，不得修改
- 每个逻辑 WA/Phase 只负责一个 skill；其标签不替代 execution_context

---

## 与其他 skill 的关系

| /auto 调用的 skill | standalone 也可直接用 |
|------------------|---------------------|
| /deepresearch | ✅ |
| /ux-research | ✅ |
| /brainstorm | ✅ |
| /ux-brainstorm | ✅ |
| /design-brief | ✅ |
| /open-design | ✅ |
| magicpath | ✅ |
| /html-prototype | ✅ |
| /ux-audit | ✅ |

/auto 是编排器，不是替代者。用户随时可以绕过 /auto 直接用单个 skill。

<!-- FILE_END: auto/SKILL.md -->
