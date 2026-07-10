---
name: magicpath
preamble-tier: 3
description: |
  MagicPath 界面产出：需求描述 → React canvas 组件。设计产出首选。
  workflow 模式下必须消费 design-brief 的 Design Generation Packet。
  本 skill 是外部插件 `magicpath` 的本地占位，供 orchestrator 路径解析用。
recommended-model: guided-execution  # 2026-07-10 new_scenario_protocol 定档：生成外包给MagicPath平台，本体是轻编排
---

# magicpath — 外部插件委托

MagicPath 是全局安装的插件 skill，直接通过 `magicpath` 命令调用。

## 输入契约

workflow / traceable delivery 模式下，MagicPath 的主输入不是零散 PRD、research 或
ux-brainstorm，而是 `design-brief.md` 内的：

- `Design Generation Packet`
- `Tool Consumption Contract`
- `shadcn 组件映射表`
- `体验验证结论` 的 12 状态覆盖表
- `REMOVED 记录`

调用方必须先确认：

```
□ Design Generation Packet 存在
□ Tool Consumption Contract 存在
□ Packet 未引入 design-brief 正文没有的新事实
□ Packet 明确 MagicPath 为默认主路径
□ 所有 MUST D-series 决策、非 N/A 状态、组件映射都有下游去向
```

缺任一项 → 不得调用外部 MagicPath；返回 design-brief 修正。

## Phase 1：委托执行

**调用方式：** 通过 Skill 工具调用 `magicpath`，并把 Design Generation Packet 作为
主 brief 传入。不要让 MagicPath 直接从 deepresearch / ux-research / PRD 中重新发散产品判断。

**Orchestrator 使用时**：在 skill pipeline 中将 magicpath 标记为外部插件类型，
直接调用 Skill("magicpath") 而非读取本 SKILL.md 执行。

**Handoff：** 外部插件完成后，由调用方按 `.claude/skills/office/references/handoff-protocol.md`
记录 MagicPath project/component/revision、产出路径、约束和风险。

<!-- FILE_END: magicpath/SKILL.md -->
