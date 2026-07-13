# Routing Chain-Check — dispatch 前链路检查（唯一真值源）

> **Defining constraint：只补被逐 skill 契约调查证实的缝隙——两个裸奔点的研究前置、设计产出的
> OD-first 执行面、端到端意图的确认门；其余 skill 自带硬门禁（`NEEDS_CONTEXT`/`BLOCKED`/`⛔`），
> 路由层不重复拦。** CLAUDE.md 语义路由契约只放速记指针，勿在别处复制全文。
> 背景：2026-07-13 luca——单 skill 命中会坍缩链路意图（写 PRD 前该不该先调研？出设计该走 OD 全链），
> 但逐 skill 读输入契约后确认多数 skill 自拦，路由层只该管 skill 管不到的 dispatch 前 junction。

## 触发

语义路由把意图映射到目标能力之后、dispatch 之前，过一遍下面三规则。全部是语义判断
（route-guard 关键词层不参与）；keyword 层 fixture 不测本协议，semantic 层 fixture 测。

## 三规则

**R1 · 研究前置（仅裸奔点 brainstorm / ux-brainstorm）**
这两个 skill 缺研究输入时会静默 cold-start 产薄产物、不报警（其 SKILL.md Phase 0.1 声明的行为）。
当目标是二者之一 + 会话内无研究输入 + 意图**复杂且新颖**（判据 = `optional-workflow-graph.yaml
research_default`，与 Plan Agent 研究默认门同一把尺子）→ dispatch 前问一句：
「这题复杂且没有成熟先例，先调研（/deepresearch 或 /ux-research）还是直接开始？」
简单或有成熟先例 → 直接进，不问。

**R2 · OD-first（设计产出执行面）**
意图 = 设计 / 原型 / 界面产出 → 默认 `open-design`（`design_output.primary` 的 standalone 执行面）：
有 design-brief 产物走 chain 入口；用户点名单点产物走 adhoc 交接；无源且要可追踪交付 → 建议先
`/design-brief`。仅命中 `design_output.fallback_trigger`（OD daemon 不可达 / 用户明确要本地 HTML /
non-React）才落 `html-prototype` / `magicpath`。重要设计场景 = OD。

**R3 · 端到端意图（确认门）**
「从需求到成品 / 完整跑一遍 / 闭环」类意图 → 列出 `optional-workflow-graph.yaml` 对应场景的
recommended_path（多产物组合诉求可建议 `/auto`），**问一句确认后进入**——确认即 SF-003
「用户主动选择」，红线：不得跳过确认静默进整链。

## Ask 纪律（与三规则同权重）

- 只问「要不要加上游 / 走哪条链」这**一个**决定，一次问清。
- 输入、场景、深度**由各 skill Phase 0 自问**——路由层问了就是双重打扰（唯一反例：R1 那一句
  是"加不加上游"的决定，不是要输入）。
- 硬门禁 skill（design-brief / open-design / html-prototype / tech-spec / task-plan）自拦，
  路由层不预拦；最多一句提前提示前置（体验优化，非门）。
- idea 与 brainstorm 相互独立（idea SKILL.md 显式声明），永不作为其前置。
- headless 编排场景不插计划外卡点，写入产出即可（tech-spec seam 先例）。

## 维护规则

- 裸奔点名单（R1）以逐 skill 输入契约为据：新 skill 入管线且属"缺上游静默降级"型 → 收进 R1，
  自带 `BLOCKED`/`NEEDS_CONTEXT` 型 → 不收。
- 判据永远指针到 `optional-workflow-graph.yaml`（research_default / design_output /
  recommended_paths），本文件不复述其内容。
- 本协议的度量归 `memory/evals/routing/` semantic 层 fixture（`ask:research-first` /
  `flow:od-design` 形态）；路由类纠正按 correction-attribution 附加动作回流 fixture。

<!-- FILE_END: skill-os/routing-chain-check.md -->
