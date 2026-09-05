---
name: magicpath
preamble-tier: 3
description: |
  MagicPath 界面产出：需求描述 → React canvas 组件。仅在用户明确选择 MagicPath，或明确批准包含 MagicPath 备用路径的计划且触发条件满足时使用（隐藏 skill，仅内部 dispatch）。
  workflow 模式下必须消费 design-brief 的 Design Generation Packet。
  本 skill 是外部插件 `magicpath` 的本地占位，供 orchestrator 路径解析用。
recommended-model: guided-execution  # 2026-07-10 new_scenario_protocol 定档：生成外包给MagicPath平台，本体是轻编排
metadata:
  codex-projection-mode: external-delegation
  codex-projection-target: .agents/skills/magicpath/SKILL.md
  codex-projection-reason: "Codex 入口使用 MagicPath 官方完整 skill；本文件保留 luca_gstack workflow gate 与委托语义。"
  codex-obligation-source: .claude/skill-os/optional-workflow-graph.yaml#handoff_gates.design_brief_to_magicpath
---

# magicpath — 外部插件委托

MagicPath 是全局安装的插件 skill，直接通过 `magicpath` 命令调用。

**调用授权：** OD 不可达、认证失败或非 React/Canvas 场景本身不授权切换到 MagicPath。
调用方必须持有用户明确选择 MagicPath，或已批准计划明确列出的 MagicPath 备用路径及其触发条件；
缺少该授权时保留已选工具，报告阻塞并以 `BLOCKED` 交还用户，不委托执行。

## Codex runtime receipt authority

<!-- LUCA_RUNTIME_RECEIPT_BEGIN -->
Before any MagicPath CLI command, read `.claude/skills/office/magicpath/SKILL.md` and enforce the
gate referenced by `codex-obligation-source` exactly in its source-declared scope, override,
parallel-start, order, and blocking semantics. If the wrapper or gate cannot be read, or the gate
does not pass, stop before delegation.
<!-- LUCA_RUNTIME_RECEIPT_END -->

## 输入契约

workflow / traceable delivery 模式下，MagicPath 的主输入不是零散 PRD、research 或
ux-brainstorm，而是 `design-brief.md` 内的：

- `Design Generation Packet`
- `Tool Consumption Contract`
- §7「页面与交互位置映射」（`page_interaction_mapping`）
- `体验验证结论` 的 12 状态覆盖表
- `REMOVED 记录`

调用方必须先确认：

```
□ Design Generation Packet 存在
□ Tool Consumption Contract 存在
□ Packet 未引入 design-brief 正文没有的新事实
□ Packet 明确 MagicPath 为本次已选定的下游目标
□ page_interaction_mapping 完整：页面/语义位置、交互职责、D-ID、适用 STATE、真实来源与 AC、约束及下游目标都有对应
□ 所有 MUST D-series 决策、非 N/A 状态、页面与交互位置映射都有下游去向
```

缺任一项 → 不得调用外部 MagicPath；返回 design-brief 修正。

页库 `page_id` / `region_id` 仅在已确认时引用；`reference=none` 不免除上述追踪。
历史 `component_mapping` / 旧组件映射只读提取位置、职责、D/STATE、来源与 AC，按新门核对；
不要求恢复 variant/classes、token 或组件库资产，不重写历史文件。

## Phase 1：委托执行

**调用方式：** 通过 Skill 工具调用 `magicpath`，并把 Design Generation Packet 作为
主 brief 传入。不要让 MagicPath 直接从 deepresearch / ux-research / PRD 中重新发散产品判断。

**Orchestrator 使用时**：在 skill pipeline 中将 magicpath 标记为外部插件类型，
直接调用 Skill("magicpath") 而非读取本 SKILL.md 执行。

**Handoff：** 外部插件完成后，由调用方按 `.claude/skills/office/references/handoff-protocol.md`
记录 MagicPath project/component/revision、产出路径、约束和风险。

<!-- FILE_END: magicpath/SKILL.md -->
