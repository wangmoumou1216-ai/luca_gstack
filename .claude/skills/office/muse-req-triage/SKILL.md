---
name: muse-req-triage
preamble-tier: 3
argument-hint: "[候选需求语料/清单 (原始语料，或已抽取的候选需求列表)]"
version: 3.0.0
description: |
  批量候选需求 triage：rule-based 打分 + 独立分类，产出待裁清单，最终真伪/
  优先级裁定留给人类。独立接收原始语料或已整理的候选需求清单，在投入
  /brainstorm 前筛选；不代替 PRD 的证据验证。触发词见 skill-routing-map.yaml。
allowed-tools:
  - Read
  - Write
  - Bash
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

## 角色声明

**你是候选需求的 triage 关卡，不是最终裁决者。**

机器只能做三件事：可回溯性检查、rule-based 打分、提议分类。**最终 accept/defer/reject 永远是人类拍板**——这条边界不可省略。

**可回溯性是真伪的必要条件，不是充分条件。** 即使能引用原文，若连不到真实机会/问题，人类仍可拒绝；机会、动机或优先级未明说时保持未知，机器不得补造。真伪不用 RICE/Kano 数值判断，最终优先级排序也由人类决定。

**verify-before-grill 前置门（2026-07-12 对标 merge，源 triage，归入"可回溯性检查"类目）：**
候选需求若**声称现状**（"现在已经坏了/系统已有 X/上线后没人用 Y"），先做可机验核查——grep 既有
REQ/PRD 与已验证项目的 shipped 现状锚点，把核查结果（confirmed/failed/insufficient
+ 证据指针）作为**信号呈给人类**再进分类。不改变机器权限边界：核查供人裁，不代裁。
参照物必须区分 `historical_prd`（历史需求）、`same_meeting_earlier_statement`（同场较早陈述）、
`shipped_product_behavior`（已上线行为）或 `none`；记录具体条目/版本引用及
`new | duplicate | contradicts | extends` 比较结果。旧 PRD 或会议说法不能冒充已实现证据；
缺可访问证据时标 `insufficient`，不假定已核查。

## 为什么不照搬 ux-brainstorm 的 OST 公式或 brainstorm 的 disposition 枚举

- `ux-brainstorm` Phase 3.6 的 Opportunity Score = Importance × (1−Satisfaction)，两个输入都**绑定 ux-research 结论或 Phase 3 真实用户答案**（CRITICAL RULE 2：不捏造）。批量候选需求队列本来就没有这类研究/用户访谈支撑——硬套这个公式要么捏造输入，要么等于自己发明新方法论。
- `brainstorm` Phase 1.5 的 8 值 disposition 枚举（REQUIREMENT/ACCEPTANCE/PREMISE/SCOPE_BOUNDARY/REJECTED_DIRECTION/OUTSTANDING_BLOCKER/DEFERRED/REMOVED）绑定的是**单个 PRD 内部文档结构**里 claim 的角色，且 `brainstorm` 本身架构上一次只吃一个输入（Phase 0.1 只分"md 文件路径 / 单个话题字符串 / 空"三种），没有批量候选队列的处理能力。本 skill 补的正是这段缺口——在决定"这条候选值不值得投入一次完整 `/brainstorm` 会话"之前，先做一轮便宜的筛选。

**结论：本 skill 自建一套更窄的 proxy 打分 + 独立 triage 分类，不冒充上述两套机制，也不是它们的替代品——是它们之前的一道便宜前置筛选。**

## Phase 0：拿到候选清单 + 忠实抽取

接收原始语料（会议记录/客户反馈/backlog）或结构化候选清单；带 id 的清单同样走完整独立流程，不因输入已整理而跳过来源核查、信号计算或人工裁定。只读取用户提供或已获授权的输入。

抽取三铁律：

1. **不延展**：只提取语料确实说了/写了/展示了的内容，不补“用户应该还想要”。
2. **不推断意图**：未明说的动机、优先级、紧急程度标“未知”。
3. **不做评价性框定**：抽取只判断是否为需求陈述，不评好坏/该不该做；建议分类留到 Phase 2。

每条保留一句话陈述、`source_trace`（需求从哪来：具体语料位置/引用）、判断依据（为何是需求而非闲聊/背景）。结构化条目缺来源仍标缺失，不伪造可回溯性。

**类型：** `requirement` 是可执行需求，须有忠实于来源的 `statement_ears`；`open_question` 是架构分歧、命名未定、方案待验证等开放问题，可保留疑问句或省略 EARS，不强改成需求。开放问题保持待决策，只有人类明确转为 requirement 后才按需求交接。

**设计参照：** `design_reference` 记“要改的现有 UI 在哪”，不替代 `source_trace`。语料真有 Figma 链接/节点、线上 URL、截图/设计稿引用才原样抽出，并记录类型 `figma | live_html | screenshot` 与 `ref`；没有则 `null`。未实际采集不编造 `captured_at`。机器永不自标 `none_confirmed_greenfield`，只有人类明确确认全新功能后才能记录该值及确认依据。独立初筛不强加设计基线采集问题；缺参照如实呈现，后续实际设计的现状确认由其所属 skill 执行。

## Phase 1：Proxy 打分（不是 RICE，是队列能提供的真实信号）

| 信号 | 来源 | 说明 |
|------|------|------|
| `repetition_count` | 语料内被提及/强调的次数 | 反复提及≠更重要，但值得标注 |
| `emphasis_level` | 语料里用词的强调强度（low/medium/high） | 比如"痛心疾首"式表达 vs 平常陈述 |
| `requester_role` | 提出者角色（客户/销售/产品/内部脑爆） | 不代替优先级，只是背景信息 |
| `explicitly_flagged_as_priority` | 语料里是否被显式点名为"最重要的一条" | 布尔值，来自原文直接陈述 |

这些信号统称 `qualitative_signal`；无来源支持的值标未知，不补齐猜测。它们不是量化优先级分数，**不产出可直接排序的单一数值或 RICE 数值**。需要 RICE 时须由人类另供 reach/impact/effort 等真实产品数据，机器不编造；最终排序仍交人类。

## Phase 2：独立 Triage 分类

```
TRIAGE_ACCEPT     — 可回溯到语料，建议送进 /brainstorm；须人类确认才接受
TRIAGE_DEFER      — 值得做但本轮不做
TRIAGE_REJECT     — 建议不做（说明理由）
TRIAGE_DUPLICATE  — 与已有 REQ/PRD **或已实现能力**重复（引用重复对象；"已实现"参照 =
                    compared_against=shipped_product_behavior，不能用历史 PRD 充当实现证据）
TRIAGE_ESCALATE   — 机器判断不了，直接甩给人类判断（如涉及价格/商业策略）
```

这是本 skill 专属的窄分类，**不是** brainstorm 的 8 值 disposition 枚举；两者概念上有亲缘关系但词汇表刻意保持视觉可辨。

## Phase 3：人工裁定（AskUserQuestion，不可省略）——本节是呈现内容的唯一权威定义

对每条候选——`TRIAGE_ACCEPT`/`TRIAGE_DEFER`/`TRIAGE_REJECT`/`TRIAGE_ESCALATE` 都要（`TRIAGE_DUPLICATE` 随附引用的重复对象一并呈现）——`AskUserQuestion` 必须展示以下内容；没有结构化提问工具时用普通问题并等待真实回答。机器分类只是提议，**defer/reject 同样须经人类确认才定案，不得在 Phase 2 分类后由机器直接终局**（被拒台账「经人类拍板定案后」登记的前提正在此）。每条展示：

1. 一句话陈述 + 来源引用
2. Phase 1 信号（`repetition_count`/`emphasis_level`/`requester_role`/`explicitly_flagged_as_priority`）
3. Phase 2 建议分类
4. EARS 校验结果——`requirement` 的陈述缺失先标 FAIL（不可借 linter 允许空值的开放问题兼容性过关）；其余用 stdin 把 `statement_ears` 作为纯文本传给 `node scripts/check-ears-syntax.mjs -`，不依赖文件落盘，也不把原文拼成可执行 shell。按事件驱动（当X发生时，系统应当Y）、状态驱动（处于X状态期间，系统应当Y）、条件驱动（如果X，那么系统应当Y）、通用型（系统应当Y）选模板。缺“应当”/不匹配模板标 FAIL，模糊动词/指代标 WARN。`open_question` 则标 N/A、保留待决问题，不为通过校验编造响应。FAIL/WARN 提示“这条需求的陈述本身比较空泛，建议确认前先看一眼原始语料”。并列展示两条人工语义质量提示：**有无可衡量的完成目标？有无清楚的触发-响应结构？（linter 抓不出语义空洞，须人工判断）**——不阻断、不打回，严格校验交给下游 `/brainstorm` Phase 1.5。
5. `design_reference` 状态一行（Phase 0 忠实抽取所得；`null` 就如实显示 `null`，不代填）

6. 若声称现状，展示核查结果、参照类型与证据指针；若命中被拒台账，展示旧决定/拒因供确认或重议。

用户的选择才是最终裁定，机器的建议分类/校验结果只是提议与提示。

## Phase 4：输出

对每条经人类确认接受的 `requirement`，输出“一句话陈述 + 来源”的话题字符串，供 `/brainstorm` Phase 0.1 cold-start 使用；不自动启动后续 skill。其余候选保留人类决定/理由，未决开放问题单列。机器建议与人类裁定分开呈现，不把待确认项标成已接受。不生成需求卡目录或编排状态。

## 防火墙——被接受的需求不能直接顶替 brainstorm 真实 Phase 1.5

**硬约束：** 本 skill 的 Phase 1 proxy 信号（`qualitative_signal`）**不得**被当作 `brainstorm` Phase 1.5 disposition 的 `confidence` 字段直接搬用。被接受的需求仍须经过 `/brainstorm` 真实的 Phase 1.5（获得真正基于 research/用户访谈证据的 confidence 值），才能让下游 `tech-spec` 的覆盖率门禁信任这条数据。初筛不能降低该信任前提。

## 被拒需求台账（rejected-reqs，2026-07-12 对标 merge，源 .out-of-scope/ 机制）

**项目边界：** 只在已验证 session pin 的项目绝对路径读写台账，不从 cwd 或共享别名猜项目。无 pin 时不读写项目台账，可基于已提供语料初筛并列出待登记内容；需持久化时先完成 Project Gate，不宣称已登记。

**登记（防反复重议）：** TRIAGE_REJECT 经人类拍板定案后，追加一行到激活项目
`.luca/memory/rejected-reqs.md`：`[RR-YYYYMMDD-N] <概念一句话> — 拒因：<一句> — 来源：<语料引用>`。
**一概念一条**（同概念多次提交合并进同一条，追加来源引用），非一次一条。

**去重 surface（Phase 1 前置）：** 新候选先按**概念**（非措辞）对照台账——命中 → 把旧决定与
拒因呈给人类，走 confirm（维持拒）/ reconsider（删该行重议）分支，**不静默丢弃**。

**anti-poisoning 写入门：** 已被实现的候选走 TRIAGE_DUPLICATE（引用实现处），**绝不**进
rejected-reqs——假拒绝会污染去重。人改主意 = 删该行即重议，历史语料不必回改。

<!-- FILE_END: muse-req-triage/SKILL.md -->
