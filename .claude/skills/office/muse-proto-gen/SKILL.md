---
name: muse-proto-gen
preamble-tier: 3
argument-hint: "[design-brief 产出 (含 D-系列决策 + AC) + 可选：上一轮 proto-judge 的 gap 反馈]"
version: 1.1.0
description: |
  muse-loop 内部原型生成步骤（L2→L3）**fallback 路径**（2026-07-02 起不再是默认路径——
  真实端到端测试后 luca 指出：真实设计产出流程是走 Open Design (OD) 生成+桌面端确认+回写Figma，
  不是自己写HTML。默认路径已改为 dispatch `/open-design`，本 skill 仅在用户明确选择本地 HTML 生成，
  或已批准计划明确包含本 skill 备用路径且触发条件满足时被 dispatch；OD 不可达本身不授权切换）。
  复用 html-prototype 的防 slop/实际设计规范规则与 verify-prototype.mjs（不修改 html-prototype 本体，
  走 figma-demo 已验证过的"同引擎、不同触发场景"先例）。隐藏 skill——不进
  skill-routing-map.yaml，不设独立命令，只由 muse-loop-orchestrate 内部 dispatch（仅 fallback 场景）。
allowed-tools:
  - Read
  - Write
  - Bash
context-cost:
  self: 18000
  runtime-estimate: 18000
  shared-refs: [html-prototype-tokens]
  recommended-model: guided-execution
---

**入口授权（编排器在 dispatch 前核对）：** 必须传入用户明确选择本地 HTML 生成，或已批准计划 / GATE-2
明确包含 `muse-proto-gen` 备用路径及其已满足触发条件的依据。OD 不可达、认证失败或非 React/Canvas
场景本身不构成授权；缺少依据则 `BLOCKED` 并交还编排器，由其交还用户，不生成。已有明确授权
不重复询问，但不得省略 Loop 的 GATE-1 / GATE-2 或下述 AC 与质量约束。

## Preamble（run first）

```bash
ls framework/*.html 2>/dev/null && echo "FRAMEWORK_OK" || echo "FRAMEWORK_MISSING"
ls framework/tokens.css 2>/dev/null && echo "TOKENS_OK" || echo "TOKENS_MISSING"
echo "MUSE_PROTO_GEN_ENTRY: $(date +%s)"
```

> AX 原则（第3节）以 `constitution.md` 为权威源。视觉规范按用户提供或已确认的实际设计系统；无规范时采用中立本地样式并如实记录，不继承旧品牌约束。Preamble 的历史资产探测仅供参考，不是生成前置门。

## 角色声明

**你把 design-map 阶段（`/design-brief` 完整跑一遍）的产出，变成一份真实交互原型 HTML——仅限已通过入口授权的本地路径。** 默认路径仍是 `muse-loop-orchestrate` dispatch `/open-design`（真实生成走OD桌面端，用户确认后回收）。编排器必须显式告知用户正在执行哪项已批准备用路径；通知不替代授权，`OD_DAEMON: DOWN` 不触发自动转交。

## 为什么是独立 skill，不是给 html-prototype 加 flag

`/html-prototype` 自身文本明确写着"无论哪种模式，以下质量 gate 不可跳过"（Phase 0 场景询问、Phase 2.75 骨架确认），这是它的 A 级验收项，红队验证过给它加旁路 flag 会直接违反这条声明。

本仓已有的正确先例是 `figma-demo`：同一套底层引擎（防 slop 规则、设计规范核对、DECISION 注释可追溯格式），换一个触发场景，做法是**新开一个瘦身 skill、引用共享规则、复用同一个 QA 脚本**——不是给原 skill 打补丁。`muse-proto-gen` 照这个先例做。

**具体差异：** `muse-proto-gen` 用于 muse-loop 内循环（proto-gen ↔ proto-judge 有界迭代），每轮迭代不需要人工逐次确认场景/骨架——这是`muse-proto-gen` 自己作为独立 skill 声明的行为，不是偷偷绕过 html-prototype 的门禁。

## Phase 1：读取输入

- design-map 阶段产出：D-系列决策 + 页面与交互位置映射（保留区域、职责、STATE 与来源）。acceptance_criteria 不在 design-brief 产出中——由 muse-loop-orchestrate Phase 2 从关联 AE# 翻译（无 AE# 时 derived-fallback），dispatch 本 skill 时随原型输入一并传入（权威口径见 `.claude/agents/muse-proto-judge.md`「AC 来源」节）。
- 若是重新生成（非首轮）：读取上一轮 `muse-proto-judge` 的 gap 反馈（哪些 AC 未过 + 具体原因），本轮生成必须针对性修正，不是重新发挥。

## Phase 2：生成 HTML

- 按映射表的语义位置和交互职责实现，保留全部 D/STATE/AC；组件技术选型服从本次实际设计规范，不以旧组件词汇表限制实现。
- 每个 UI 元素必须带 `<!-- DECISION: D-NNN -->` 注释，对应 design-map 阶段的决策 ID（复用 html-prototype 已验证的可追溯格式）。
- 设计规范、状态与可访问性规则：读取共享 ref `html-prototype-tokens`；实际规范缺失时规范项标 N/A，通用状态/反馈与可访问性仍须实现。
- 防 slop 检查清单：与 html-prototype Phase 3 同一份，不另造。

## Phase 3：确定性检查（复用 verify-prototype.mjs）

```bash
node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs <生成的html路径> --mode=muse-proto-gen
```

`verify-prototype.mjs` 的 `allowedModes` 已加入 `muse-proto-gen`（fork 内改动，见 muse-loop/ARCHITECTURE.md 注册记录），跑实际设计规则（提供时）/ 无外部CDN / decision-coverage 检查，产出 `qa-results.json`。这一步只做**确定性**检查；语义层面"是否满足 AC"是 `muse-proto-judge` 的工作，不在本 Phase 重复判断。

## 输出

生成的 HTML 原型文件 + `qa-results.json`（确定性检查结果），交给 `muse-loop-orchestrate` 传给 `muse-proto-judge`。

## 成本备注

本 skill 会在 muse-loop 内循环里被反复调用（每次 proto-judge 判定未过都要重跑一次），`runtime-estimate` 已按"多轮前台阻塞往返"的实际成本估算，不是单次调用的成本——`muse-loop-orchestrate` 排期时应据此计入总预算，不要按单次调用估算整条 Loop 的耗时。

<!-- FILE_END: muse-proto-gen/SKILL.md -->
