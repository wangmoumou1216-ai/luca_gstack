---
name: ux-writing
preamble-tier: 1
version: 1.0.0
description: |
  内容与语言设计：产品 voice/tone 规范、微文案系统（错误/空态/CTA/onboarding/AI hedging）、
  界面文案评审与改写——PRD 之后设计段的**内容维度方法论节点**，产规范文档不产 HTML。
  **Defining constraint：双相位——相位1「语义规范」跑在 design-brief 之前（产 voice-copy-spec，
  brief 继承其结论落正文，Packet 因此可追溯）；相位2「逐字与评审」在 brief 之后或 standalone
  （逐字文案只喂 html-prototype 本地路径，永不进 OD 编译——逐字文案是 OD 生成期的自由度）。**
  与 ux-audit 划界：audit 按启发式**检出**文案问题，本 skill 产语言**系统规范与改写**；
  与 design-brief 划界：不并列产同类文档——brief 有上游 voice-spec 则继承不重做，无则用其内联规则兜底。
  源：蒸馏自 Owl-Listener/designer-skills（MIT）ux-writing + 本框架既有文案碎片收拢。
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 5346  # 实测字节数 wc -c（G5 口径），2026-07-21
  runtime-estimate: 10000
  shared-refs: [ux-writing]
  recommended-model: guided-execution  # 三问：token 小-中（规范文档/文案改写 5-15k）× 判断杠杆中（语言品味，有双层规范可依）× 错判代价低（文本可重改，逐字层不进 OD）→ guided-execution
---

## Preamble (run first)

```bash
python3 .claude/observability/scripts/get_rules.py ux-writing "*" 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
```

## 定位（设计段的内容/语言维度）

| 相邻 skill | 分工 |
|---|---|
| ux-audit | 启发式**检出**文案问题（module-a A5 / module-b H2·H9）→ 文案类 P0/P1 多时转介本 skill |
| design-brief | 消费相位 1 产出（Step 1.0b 继承 voice-spec 语义结论落 brief 正文）；无上游时用自己的内联规则 |
| html-prototype | 消费「逐字层」（本地生成真实文案时逐字执行） |
| open-design | **不直接消费本 skill 任何产出**——语义结论只经 brief 正文进 Packet；逐字文案是 OD 的自由度 |

场景：A/B（新功能/优化的内容规范）、C（线上文案评审改版）、**D**（Agent 化——hedging/拒答/
不确定性文案正是 12 态强制项的语言层）。

## 流程

### Step 0：相位判定（一句话确认，不确定就问）

- 用户要**产规范**（新功能/优化/Agent 化的 voice 与文案系统）→ **相位 1·语义规范**（建议跑在
  design-brief 之前——它产出后 brief 才能继承；brief 已跑完的存量项目也可补产，下轮 brief 生效）
- 用户要**评审/改写现有界面文案** → **相位 2·评审改写**（standalone，随时）

### 相位 1：语义规范（生产模式，pre-brief）

1. **Load `.claude/skills/office/references/ux-writing.md` now — 必须完整读取**（双层规范）。
2. 输入：最新 PRD（`ls -t docs/prd/*.md`）/ ux-brainstorm 方案（若有）/ 用户口述的产品语境；
   场景 D 额外读 `references/ai-native-state-coverage.md` 的 7 个 AI 态（hedging 文案主战场）。
3. 产出 voice-copy-spec，**必含两节**（结构镜像 reference 的双层）：
   - **「语义层结论」**：本产品的内容语义决策——错误三要素怎么落、空态引导策略、hedging 语气线、
     语域与术语表、tone 随场景的调法。每条以「必须达成什么」句式写（design-brief 将逐条继承）。
   - **「逐字层规范」**：CTA 公式、错误/空态/确认文案模板的**本产品实例**、措辞黑名单
     （标注：仅 html-prototype 本地路径与人工执笔用，不进 Packet/OD）。
4. 落盘 `docs/decisions/YYYY-MM-DD-<topic>-voice-copy-spec.md`（同日重跑加 `-001` 序号）。

### 相位 2：评审改写（standalone）

1. Load 同上 reference；输入=用户提供的界面截图/文案清单/页面（缺输入先要）。
2. 逐条检查：语义层 7 条 + 逐字层规范；发现格式=「位置 / 现文案 / 问题（引规范条目）/ 改写稿」。
3. 落盘 `docs/evaluation/YYYY-MM-DD-<topic>-ux-writing-review.md`（不占用 ux-audit 的产出路径）。

## Handoff（分级）

相位 1 在 workflow 模式（design-brief 为既定下游）必写；相位 2 standalone 终端交付按
lightweight 豁免 DONE 合法。

```bash
mkdir -p docs/handoff
```

按 `.claude/skills/office/references/handoff-protocol.md` 写
`docs/handoff/YYYY-MM-DD-<topic>-ux-writing-handoff.md`，**必含**：语义层结论清单（design-brief
Step 1.0b 的继承输入）、逐字层适用范围声明（仅本地路径）、未收敛的术语冲突。
**不写 workflow-state**（原则，非仅循先例）：本 skill 是可选内容规范节点、轻量单文档终端交付，
无"中断后从此节点续跑"的语义可落——与 taste-review「不占固定流程节点，故不写 workflow-state」同类。
重型多阶段的固定节点（deepresearch/ux-research/design-brief 等）才写。节点状态由编排层维护。

## 末尾约束

1. **逐字层永不进 Packet/OD**：任何下游把 CTA 公式/具体文案写进 Generation Packet = 违反 OD
   交付边界，本 skill 的产出文档里必须带这行警示。
2. **Voice 恒定、tone 随场景**：规范里两者分开声明，不混写。
3. **消歧**：与 design-brief 内联规则不并列产同类文档——本 skill 产出在前则 brief 继承，
   在后则只对下轮生效，不回改已 PASS 的 brief。

<!-- FILE_END: ux-writing/SKILL.md -->
