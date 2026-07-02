---
name: muse-req-triage
preamble-tier: 3
argument-hint: "[候选需求语料/清单 (原始语料，或已抽取的候选需求列表)]"
version: 2.2.0
description: |
  批量候选需求 triage：rule-based 打分 + 独立分类，产出待裁清单，最终真伪/
  优先级裁定留给人类。两种触发方式：① 独立使用（你手头有一堆候选需求/原始
  语料，想在投入 /brainstorm 前先筛一遍）② 被 muse-loop-orchestrate 内部
  dispatch（Loop 场景，接收已抽取的候选需求）。muse fork 专属新增，母版
  luca_gstack 无此 skill。触发词见 skill-routing-map.yaml。
  v2.1.0（2026-07-02，fork内）：加 Write 权限，修复"Phase 4 声称写入
  requirement.md 但自己没有 Write 工具"的责任缺口——写入由本 skill 自己
  完成，不依赖调度方（muse-loop-orchestrate）代写。
  v2.2.0（2026-07-02，fork内）：Phase 0 新增设计参照引用的忠实抽取（填入
  L1 卡 design_reference 字段，语料没有就 null，机器永不自标 greenfield）——
  第一条真实端到端 REQ 暴露"整条链没看过现有UI"缺口的上游修复点。
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
context-cost:
  self: 10000
  runtime-estimate: 10000
  shared-refs: []
  recommended-model: guided-execution
---

## Preamble（run first）

```bash
echo "MUSE_REQ_TRIAGE_ENTRY: $(date +%s)"
```

> 本 skill 的真伪判据（第4节）与优先级信号定义（第5节，`qualitative_signal`）以 `constitution.md` 为权威源，本文件不重复定义、只引用。

## 角色声明

**你是候选需求的 triage 关卡，不是最终裁决者。**

机器只能做三件事：可回溯性检查、rule-based 打分、提议分类。**最终 accept/defer/reject 永远是人类拍板**——这条边界不可省略。

## 为什么不照搬 ux-brainstorm 的 OST 公式或 brainstorm 的 disposition 枚举

- `ux-brainstorm` Phase 3.6 的 Opportunity Score = Importance × (1−Satisfaction)，两个输入都**绑定 ux-research 结论或 Phase 3 真实用户答案**（CRITICAL RULE 2：不捏造）。批量候选需求队列本来就没有这类研究/用户访谈支撑——硬套这个公式要么捏造输入，要么等于自己发明新方法论。
- `brainstorm` Phase 1.5 的 8 值 disposition 枚举（REQUIREMENT/ACCEPTANCE/PREMISE/SCOPE_BOUNDARY/REJECTED_DIRECTION/OUTSTANDING_BLOCKER/DEFERRED/REMOVED）绑定的是**单个 PRD 内部文档结构**里 claim 的角色，且 `brainstorm` 本身架构上一次只吃一个输入（Phase 0.1 只分"md 文件路径 / 单个话题字符串 / 空"三种），没有批量候选队列的处理能力。本 skill 补的正是这段缺口——在决定"这条候选值不值得投入一次完整 `/brainstorm` 会话"之前，先做一轮便宜的筛选。

**结论：本 skill 自建一套更窄的 proxy 打分 + 独立 triage 分类，不冒充上述两套机制，也不是它们的替代品——是它们之前的一道便宜前置筛选。**

## Phase 0：拿到候选清单 + 计算信号（两种入口，行为不同）

**入口 A（独立使用）：** 你直接把原始语料（会议记录/客户反馈/backlog 列表）或已经整理过的候选需求列表交给本 skill。本 skill 自己读取语料，按 `muse-loop/references/req-extraction-principles.md` 的三铁律做忠实抽取（不延展、不推断意图、不做评价性框定），**同时**为每条候选计算 Phase 1 信号（下方）——因为独立使用时，没有上游步骤替你算好这些信号。

**入口 B（被 muse-loop-orchestrate dispatch）：** 直接接收已抽取的候选需求列表（来自 Loop 内部抽取步骤），跳过语料读取，直接进入 Phase 1 打分。

**两种入口的判断依据：** 输入是原始语料/杂乱清单 → 入口 A；输入已经是结构化的候选需求条目（有 id/统一格式）→ 入口 B。

**设计参照引用的忠实抽取（v2.2.0 新增，两个入口都做）：** 语料/候选条目里若**真实出现**了对现有UI的引用——Figma 链接或节点指涉、线上页面URL、被点名的截图/设计稿——原样抽出，填入 L1 卡的 `design_reference` 字段（`schema.md` v0.5）；语料里**没有**就填 `null`，**不推断、不臆造、不替用户猜"这个产品应该有现成设计"**（三铁律直接适用）。`none_confirmed_greenfield` 这个值本 skill 永远不填——那只能由人类在 GATE-1 显式选择（防止机器静默把改造需求当从0到1处理——2026-07-02 第一条真实端到端 REQ 的真实教训：整条链没看过真实 Figma，把历史记录标签当成了入口按钮）。

## Phase 1：Proxy 打分（不是 RICE，是队列能提供的真实信号）

| 信号 | 来源 | 说明 |
|------|------|------|
| `mention_count` | 语料内被提及/强调的次数 | 反复提及≠更重要，但值得标注 |
| `emphasis_level` | 语料里用词的强调强度（low/medium/high） | 比如"痛心疾首"式表达 vs 平常陈述 |
| `requester_role` | 提出者角色（客户/销售/产品/内部脑爆） | 不代替优先级，只是背景信息 |
| `explicitly_flagged` | 语料里是否被显式点名为"最重要的一条" | 布尔值，来自原文直接陈述 |

这套信号对应 `muse-loop/schema.md` 的 `priority.qualitative_signal` 字段（v0.2 引入并经 Phase 0 手填测试验证，当前 schema 为 v0.5）。**不产出 RICE 数值**——如果需要 RICE 式量化打分，必须由人类另外提供 reach/impact/effort 这类产品数据，机器不替人编造。

## Phase 2：独立 Triage 分类

```
TRIAGE_ACCEPT     — 建议进入下一步（独立使用时=送进/brainstorm；Loop场景=进design-map）
TRIAGE_DEFER      — 值得做但本轮不做
TRIAGE_REJECT     — 建议不做（说明理由）
TRIAGE_DUPLICATE  — 与已有 REQ/PRD 重复（引用重复对象）
TRIAGE_ESCALATE   — 机器判断不了，直接甩给人类判断（如涉及价格/商业策略）
```

这是本 skill 专属的窄分类，**不是** brainstorm 的 8 值 disposition 枚举；两者概念上有亲缘关系但词汇表刻意保持视觉可辨。

## Phase 3：人工裁定（AskUserQuestion，不可省略）

对每条 `TRIAGE_ACCEPT`/`TRIAGE_ESCALATE` 候选，展示：一句话陈述 + 来源引用 + Phase 1 信号 + Phase 2 建议分类，用 `AskUserQuestion` 请用户确认最终归宿。**机器的建议分类只是提议，用户的选择才是最终裁定。**

## Phase 4：输出（两种形态，按入口而定）

**入口 A（独立使用）输出：** 每条 `TRIAGE_ACCEPT` 的候选，格式化为一个话题字符串，作为 `/brainstorm` Phase 0.1 的 cold-start 输入——即"这条需求已经过初筛，值得你投入一次完整的 `/brainstorm` 会话，这是它的一句话陈述+来源"。**不产出 `docs/loop/specs/REQ-*/` 这类 Loop 专属格式**——那是 Loop 场景的产物形态，独立使用时不需要。

**入口 B（Loop 场景）输出：** 遵循 `muse-loop/schema.md` v0.5 的完整 L1 需求卡格式（含 `design_reference` 字段——语料有引用就填，没有填 null），**本 skill 自己用 `Write` 工具**写入 `docs/loop/specs/REQ-<项目缩写>-<编号>/requirement.md`（不依赖 `muse-loop-orchestrate` 代写——responsibility 明确在本 skill，调度方只负责 dispatch 和读取写入结果继续下一 Phase）。若目标目录不存在，先创建它。

## 防火墙——被接受的需求不能直接顶替 brainstorm 真实 Phase 1.5

**硬约束（两种入口都适用）：** 本 skill 的 Phase 1 proxy 信号（`qualitative_signal`）**不得**被当作 `brainstorm` Phase 1.5 disposition 的 `confidence` 字段直接搬用。被接受的需求，无论走哪个入口，最终都要经过 `/brainstorm` 真实的 Phase 1.5（获得一个真正基于 research/用户访谈证据的 confidence 值），才能让下游 `tech-spec` 的覆盖率门禁信任这条数据。这条防火墙保护 `tech-spec` 覆盖率门禁现有的信任前提，不因本 skill 的介入而悄悄降级。
