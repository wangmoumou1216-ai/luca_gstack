# 组件映射 + 可追溯词汇表（抽自 design-brief Phase 6 / 6.5，muse-loop 共享引用）

> 本文件不修改 `/design-brief`（母版核心 skill）。它把 Phase 6「组件映射表」与 Phase 6.5「可追踪完整门禁」已经在用的词汇表原样抽出来，供 `muse-loop-orchestrate` 的 design-map 阶段（= 完整跑一遍 `/design-brief`）复用同一套判定标准，避免 muse 侧另造一套不兼容的词汇表。**design-map 不是一个独立 skill，是"调用 design-brief 走完整 Phase 顺序"这个动作本身**——本文件只是让 muse-loop-orchestrate 在读 design-brief 产出时，知道该按什么标准解读。

## 组件来源约束（Phase 6）

- 来源字段只能是 `shadcn` 或 `自绘`，没有第三种。
- 交互元素（按钮/输入框/下拉/表格/对话框/标签页）→ `shadcn` + 组件名 + variant。
- 布局容器/背景/分割线/纯文案区域 → `自绘` + Tailwind 颜色和间距。
- 每一行映射必须对应一个决策 ID（D-系列）。

## 可追溯判定结果（Phase 6.5）

每条 Source Claim ID 落地映射矩阵的结果只能是以下四种之一，不允许空白/"后续补充"/"开发时处理"：

| 结果 | 含义 |
|------|------|
| `MAPPED` | 已落到具体设计决策 + 状态 + 组件映射行 |
| `DEFERRED` | 确认需要但本轮不做，需写清原因 |
| `NEEDS_CONTEXT` | 缺信息无法判定（常见于 `standalone_light` 无 PRD 场景） |
| `REMOVED` | 明确不做，需写清原因（如超出 scope 边界） |

## 门禁两级结果（对 muse-loop 至关重要）

- **`TRACEABILITY GATE PASS`**：仅当走 `traceable_delivery`（有真实 PRD 输入）且所有 PRD MUST 级 R/AE 全部 MAPPED 时才会出现。
- **`TRACEABILITY GATE LIMITED`**：`standalone_light`（无 PRD）时的上限结果，明确写着"不得直接进入 tech-spec/task-plan"。

**muse-loop-orchestrate 的强制要求：design-map 阶段必须让 design-brief 跑在 `traceable_delivery` 模式（即 muse-req-triage 的输出必须能构成一份真实可用的 PRD 形态输入），不允许接受 `TRACEABILITY GATE LIMITED` 的结果继续往下游走。** 这是红队验证过的关键约束（`standalone_light` 路径下 design-brief 结构性无法保证机器可信的产出，直接把 LIMITED 结果喂给 proto-gen 会把这个可靠性缺口带进整条 Loop）。如果 design-brief 只能给出 LIMITED，muse-loop-orchestrate 必须在 GATE-2（设计映射人工确认）阶段把这个情况显式呈现给用户，而不是静默放行。
