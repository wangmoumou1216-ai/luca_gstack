---
name: insight-synthesis
preamble-tier: 1
version: 1.0.0
description: |
  一手定性综合：把**用户提供的**一手定性资料（访谈/工单/回访/开放问卷）编码成原子观察，
  跨来源亲和聚类，经用户确认主题后做 observation→interpretation 跃迁，产出分层洞察。
  **Defining constraint：输入=用户提供的一手定性数据；产出严格分 observation（带原文引用）
  与 interpretation（带置信度）两层；未经用户确认主题，模型永不自造解读。**
  与 /idea 划界：idea 忠实结构化·禁推断（只 observation），本 skill 做观察→解读跃迁（忠实 vs 解读）；
  与 deepresearch/ux-research 划界：对象相反（外部源 vs 你自己的一手数据）；
  与 /muse-req-triage 划界：靠意图消歧（筛哪些做 vs 数据说明什么）。
  源：社区 interview-synthesis 方法论（观察-解读纪律），自建适配 luca_gstack 语境。
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 1800
  runtime-estimate: 20000
  shared-refs: [none]
  recommended-model: core-execution  # 三问：token 中-大（多来源逐条编码+聚类+综合）× 判断杠杆中（解读跃迁是产品判断）× 错判代价中（产出可回溯原文核）→ core-execution(opus)；obs/interp 分层由 opus 主体内联强制，不 dispatch fable
---

## Preamble (run first)

```bash
python3 .claude/observability/scripts/get_rules.py insight-synthesis "*" 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
```

## 定位（研究段的第三"对象角度"：内部一手定性）

研究段按**对象**分流，本 skill 是内部一手定性数据的入口：

| 入口 | 对象 | 输出纪律 | 不用它当 |
|---|---|---|---|
| deepresearch / ux-research | **外部**知识/竞品/先例 | 多源共识 | 你自己的一手用户数据 |
| /idea | 一手原始语料 | **忠实结构化·禁推断**（只 observation） | 需要"这数据说明什么"的解读 |
| /muse-req-triage | 批量候选需求 | 打分筛选（**筛哪些做**） | "数据说明什么"（那是本 skill） |
| **insight-synthesis（本 skill）** | **用户提供的一手定性数据** | observation→interpretation 两层 | 外部源 / 单条已陈述需求 |

**易混消歧**：同一份客户反馈既可投 muse-req-triage（筛哪些值得做）也可投本 skill（这批反馈说明了什么），
靠**用户意图**分流，不写死。（与 idea 的"忠实 vs 解读"划界见上表：idea 只 observation，本 skill 做解读跃迁。）

## 数据来源硬边界

一手定性数据**一律由用户提供**：粘贴原文 / 单文件路径 / 目录批量。本 skill **不自行采集**——
真正的数据获取（约访谈/发问卷/跑可用性测试）不是 skill 能替代的。外部系统（工单系统/研究库）
接入属**下游项目的 MCP、opt-in**，不进 luca_gstack。拿不到数据 → 停下问用户要，不臆造语料
（还没采集？可先跑 `/research-kit` 设计采集工具——访谈提纲/问卷/测试计划，采回来再进本 skill）。

## 流程（单 agent 六步，不 fan-out）

单个 agent 内联跑完六步；大语料在内部**分块串行**处理（单 agent ≠ 单 pass），不并行开编码器。

1. **接收 + 定标**：确认几份、什么类型（访谈/工单/回访…）、要回答什么研究问题；按来源切成独立单元
   （每单元一个稳定来源 ID，如 `INT-01`/`TICKET-2043`）。缺任一 → 先问清再动。
2. **编码出 observation 层**：逐单元抽**原子观察**——每条一个事实/引述，**带原文引用 + 来源 ID，零解读**。
   只记"用户说了/做了什么"，不写"因为/所以/说明"。大语料分块串行编码，块间不丢来源 ID。
3. **亲和聚类**：跨来源把观察聚成主题；每主题记录**独立来源支持数**（=强度信号，不是出现次数）。
   **矛盾观察不抹平**——单独标出"来源 A 说 X、来源 B 说反 X"。
4. **【卡点】主题确认（AskUserQuestion，不可省）**：把聚出的主题清单（各带支持来源数）交用户确认/增删/合并，
   **确认后才进第 5 步**。解读是幻觉高发区，此门是**指令级卡点**——未经确认不得做跃迁。
5. **interpretation 层**：仅对**已确认主题**产出"为什么"，**显式标注为解读（非事实）**，带置信度：
   `置信度 = f(来源广度 · 一致性 · 直接蕴含 vs 推断)`。可选补 JTBD。
   **小样本不得伪造大置信度**（2 条访谈只给 2 条访谈级置信度）；**无原文依据的解读不产出**。
6. **成型 + 落盘**：每主题成 `{主题 + 支撑观察(原文引用+来源ID) + 解读 + 置信度 + 可选机会点}`；
   落盘 `docs/research/insight-synthesis-<slug>-<YYYY-MM-DD>.md`（与 deepresearch/quick-research 同目录，
   前缀区分；同日重跑加 `-001` 序号不覆盖）。**落盘后回读一遍：逐条确认能唯一归入 observation 或
   interpretation，出现混层 / 无原文引用 / 无置信度就回改——这是宣告完成前不可跳的 DONE 自检。**

## Handoff（重型：产出供 brainstorm/ux-brainstorm 消费，须写）

```bash
mkdir -p docs/handoff
```

按 `.claude/skills/office/references/handoff-protocol.md` 写
`docs/handoff/YYYY-MM-DD-<topic>-insight-synthesis-handoff.md`，**必含**：确认后的主题清单、
每主题的置信度与支撑来源数、矛盾/待验证项、下游（brainstorm/ux-brainstorm）应继承的已验证假设。

## 末尾约束

1. **两层永不混**：observation 带原文引用、interpretation 带置信度；产出里任一条能一眼分清属哪层。
2. **用户确认门不可绕**：未经第 4 步确认主题，不得产出任何解读——`allow_standalone_override` 无。
3. **诚实优先于丰满**：样本小就给小置信度，矛盾就留矛盾，数据没覆盖的问题标"未触及"，不补全。

<!-- FILE_END: insight-synthesis/SKILL.md -->
