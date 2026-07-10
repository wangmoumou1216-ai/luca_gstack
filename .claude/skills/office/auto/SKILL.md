---
name: auto
preamble-tier: 2
argument-hint: "[需求描述，或多个任务组合描述]"
recommended-model: core-execution  # 2026-07-10 new_scenario_protocol 定档：整场多agent编排（大token+中判断杠杆）
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
- **功能域**：CRM 的哪个模块，或其他产品方向
- **需求类型**：新功能设计 / 已有功能优化 / 全流程评审 / Agent 化改造
- **期望深度**：仅研究 / 研究+方案 / 研究+方案+原型 / 全链路

---

### Step 1 — Auto Skill Mapping（主 Agent 执行）

依据 Semantic Parse 结果，参考 `.claude/skill-os/skill-routing-map.yaml`，
构建 **Skill Pipeline**（有序 + 依赖标注）：

#### Skill 映射规则

| 用户意图 | Skill Pipeline |
|---------|---------------|
| 全流程设计（调研→方案→原型） | deepresearch ‖ ux-research → brainstorm → ux-brainstorm → design-brief → magicpath |
| 全流程 + Figma 演示 | 上述 → figma-demo |
| 调研 + 方案（无原型） | deepresearch ‖ ux-research → brainstorm → ux-brainstorm |
| 调研 + 原型（快速迭代） | ux-research → design-brief → magicpath |
| 仅研究 | deepresearch ‖ ux-research（并行） |
| 评审改版 | ux-audit → design-brief → magicpath |
| Agent 化改造 | brainstorm → deepresearch → design-brief → magicpath |

> `‖` = 并行，`→` = 串行依赖

#### 场景 B — 跳过研究阶段（快速原型模式）

当用户**明确**表示不需要调研，或要求「直接出方案」「跳过调研」时，
使用精简 Pipeline：

| 触发信号 | Skill Pipeline |
|---------|---------------|
| 「直接出设计方案」「跳过调研」 | ux-brainstorm → design-brief → magicpath |
| 「已有调研，直接出 PRD」 | brainstorm → ux-brainstorm |
| 「已有 PRD，直接出原型」 | design-brief → magicpath |

> **判断原则：** 用户未说「跳过」时，默认走完整 Pipeline（场景 A）。
> 快速模式减少的是 deepresearch + ux-research Phase，不减少质量门控。

---

#### 内置 Skill 作为辅助步骤（嵌入对应 Phase，不单独占 Phase）

| 辅助需求 | 嵌入到哪个 Phase |
|---------|----------------|
| 联网搜索竞品信息 | deepresearch / ux-research Phase |
| 截图竞品页面 | ux-research Phase |
| 产出写入飞书文档 | 最终 Phase 后追加 |

---

### Step 2 — Plan Output（展示给用户，**Hierarchical 必须等确认**）

输出格式：

```
【/auto 执行计划】

需求：<用户原始描述>
场景：<A/B/C/D> — <场景说明>
识别类型：<功能域 + 需求类型>

━━━ Phase 1（并行）━━━
  WA-1a: /deepresearch — <具体研究方向，1句话>
  WA-1b: /ux-research  — <竞品/UX 研究方向，1句话>

━━━ Phase 2（依赖 Phase 1）━━━
  WA-2: /brainstorm — <PRD 主题，1句话>

━━━ Phase 3（依赖 Phase 2）━━━
  WA-3: /ux-brainstorm — <UX 设计方向，1句话>

━━━ Phase 4（依赖 Phase 3）━━━
  WA-4: /design-brief — <交互契约主题，1句话>

━━━ Phase 5（依赖 Phase 4）━━━
  WA-5: magicpath — 基于 Design Generation Packet 生成 React canvas 组件

预计产出路径：
  docs/research/ · docs/prd/ · docs/decisions/ · MagicPath canvas component

Phase ≥ 3 → 等用户确认后再执行 (y/n)
```

---

### Step 3 — Orchestrated Execution（用户确认后）

#### 3.1 Work Agent 启动规范

对每个 WA，填写 `.claude/agents/work-agent-template.md` 变量，**14
个必填项全部填写，不得保留占位符**：

```
{{PHASE_ID}}              : 阶段编号，如 1a、2、3
{{TOTAL_PHASES}}          : 总阶段数，如 4
{{ROLE}}                  : Skill Executor for <skill-id>
{{GOAL}}                  : 读取并执行 <skill-id> skill，产出 <output-path>
{{TASK_CONTEXT}}          : Phase <N> / <用户需求一句话摘要>
{{INPUT_FILES}}           : - .claude/skills/office/<skill-id>/SKILL.md — 执行协议
                            - docs/handoff/<上游 handoff>.md — 上游约束（如有）
{{TASK_DESCRIPTION}}      : 读取 SKILL.md，按其执行协议完整执行，
                            输入为：<从用户需求提炼的具体化描述>
{{INHERITED_CONSTRAINTS}} : - framework/ 只读
                            - <上游 handoff 中的约束，如无填"无">
{{REFERENCE_ASSETS}}      : - <上游产出路径，作为本 skill 的输入，如无填"无">
{{PRIMARY_OUTPUTS}}       : - <skill 规定的输出路径>
{{OUTPUT_FORMAT_SPEC}}    : 遵照 SKILL.md 定义的输出格式
{{PROTECTED_PATHS}}       : framework/、CLAUDE.md
{{DONE_CRITERIA}}         : - [ ] <output-path> 文件存在且非空
                            - [ ] docs/handoff/<date>-<skill-id>-handoff.md 已写入
{{AVAILABLE_SKILL_PATHS}} : .claude/skills/office/<skill-id>/SKILL.md
```

#### 3.2 Work Agent 内部执行协议

Work Agent 收到指令后必须按以下顺序执行：

```
1. Read {{AVAILABLE_SKILL_PATHS}} 中的 SKILL.md（必须完整读完到 FILE_END 标记）
2. 按 SKILL.md 的执行协议完整执行（不依赖 Skill 工具，直接遵照协议产出）
3. 确认产出文件存在于 PRIMARY_OUTPUTS 规定的路径
4. 写 handoff summary → docs/handoff/<date>-<skill-id>-handoff.md
5. 返回 Completion Report
```

**Work Agent 不得：**
- 在未完整读完 SKILL.md 的情况下开始执行
- 修改其他 Phase 的产出
- 在 skill 未完成时返回 Completion Report

#### 3.3 Orchestrator 编排规则

```
并行 Phase（‖）: 在同一条消息中并发启动所有 WA
串行 Phase（→）: 等待前 Phase 所有 WA 完成 + handoff 写入后，再启动下一 Phase
质量门控     : 每 Phase 结束后，主 Agent 检查产出路径，任一缺失 → 重试该 WA
```

#### Work Agent 失败处理（W9）

| WA 返回状态 | Orchestrator 动作 |
|------------|-----------------|
| `DONE` — 产出路径存在 | 继续下一 Phase |
| `DONE` — 但产出路径不存在 | 视为隐式 BLOCKED，执行重试 |
| `BLOCKED` — 首次 | **重试一次**（重新启动同一 WA，传入相同参数） |
| `BLOCKED` — 重试后仍失败 | **停止当前 Pipeline**，向用户报告：阻塞 Phase、blockers 列表、建议操作（手动执行该 skill / 跳过该 Phase）|
| 超时无响应（> 5min） | 同 BLOCKED 首次处理 |

**不允许无限重试**：单个 WA 最多重试 1 次，失败后必须上报，不得静默跳过。

#### 3.4 内置 Skill 在 Work Agent 中的调用方式

如果某 Phase 需要内置 skill（web-access、agent-browser 等），Work Agent
直接使用对应工具能力执行（WebSearch / WebFetch / Screenshot），将内置 skill
作为辅助手段，产出记录到 PRIMARY_OUTPUTS。

---

### Step 4 — Aggregation（主 Agent 执行）

所有 Phase 完成后：

1. 读取 `docs/handoff/` 中本次 session 的所有 handoff summary
2. 输出汇总报告：

```
【/auto 完成报告】

执行摘要：
  ✅ Phase 1: deepresearch + ux-research — 完成
  ✅ Phase 2: brainstorm — 完成
  ✅ Phase 3: ux-brainstorm — 完成
  ✅ Phase 4: design-brief — 完成
  ✅ Phase 5: magicpath — 完成

产出清单：
  研究报告   → docs/research/deepresearch-<topic>.md
  UX研究     → docs/research/ux-research-<topic>.md
  PRD        → docs/prd/<topic>.md
  UX方案     → docs/decisions/<topic>.md
  交互契约   → docs/decisions/<topic>-design-brief.md
  MagicPath  → <project/component/revision>

关键决策：<各 skill handoff 中的核心决策，3-5 条>

推荐下一步：
  - /ux-audit — 对原型做 UX 评审
  - /figma-demo — 生成汇报用演示 Demo
```

---

## 约束

- 不跳过任何 skill 的内部质量门控
- Work Agent 必须完整读完 SKILL.md（到 FILE_END 标记）才能开始执行
- Hierarchical（≥ 3 Phase）必须等用户确认计划
- framework/ 只读，不得修改
- 每个 Work Agent 只负责一个 skill 的调用，不合并多个 skill 到一个 WA

---

## 与其他 skill 的关系

| /auto 调用的 skill | standalone 也可直接用 |
|------------------|---------------------|
| /deepresearch | ✅ |
| /ux-research | ✅ |
| /brainstorm | ✅ |
| /ux-brainstorm | ✅ |
| /design-brief | ✅ |
| magicpath | ✅ |
| /html-prototype | ✅ |
| /figma-demo | ✅ |
| /ux-audit | ✅ |

/auto 是编排器，不是替代者。用户随时可以绕过 /auto 直接用单个 skill。

<!-- FILE_END: auto/SKILL.md -->
