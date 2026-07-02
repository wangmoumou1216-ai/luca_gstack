# Schema 验证样例（Phase 0，非真实 Loop 产出）

> 这 3 条是 Phase 0 手工验证 schema 用的测试样例，来源于速记项目真实妙记语料（`obcnhby93v6426u4y3za998v`，851 行逐字稿，luca 授权拉取）。**不是**真正的 Loop 生产产出（那类走 `docs/loop/` 软链，见 `ARCHITECTURE.md` 的物理落点裁定）——这里只是 schema 设计的手工试填记录，供后续参照。schema 定义见 `schema.md`（v0.2）。

## 样例 1 — 速记首页三大核心入口定案（推翻早期方案）

```yaml
id: REQ-速记-008
type: requirement
title: 速记首页三大核心入口结构定案
statement_ears: "当用户进入AI速记首页时,系统应当展示语音录入(销售记录)/现场会议/在线会议三个核心入口,上传附件作为弱化辅助入口"

source_trace:
  - type: meeting
    ref: "妙记obcnhby93v6426u4y3za998v#L100,106"
    reason: "说话人3提议三核心入口方案,说话人1/说话人2认可"

authenticity:
  groundable: true
  entailment:
    verdict: contradicts
    compared_against: same_meeting_earlier_statement
    ref: "同妙记#L7条目(快速录音/快速会议/上传文件三分方案,被本条推翻)"
  opportunity_link: "OPP-降低用户对速记入口选择的认知负担"
  machine_confidence: null   # 未跑真实模型,占位

priority:
  kano: basic
  rice: {reach: null, impact: null, confidence: null, effort: null, score: null}
  qualitative_signal:
    emphasis_level: medium
    repetition_count: 1
    explicitly_flagged_as_priority: false
  moscow: must
  human_decision: null
  decided_by: null
  decided_at: null

status: draft
```

**验证结论：** v0.1 schema 在此处卡壳——`entailment_vs_existing` 只定义了针对"历史 PRD"的关系，但这条推翻的是同一次会议里几分钟前的另一个提案，不是 PRD。v0.2 加 `compared_against: same_meeting_earlier_statement` 后可以完整、准确填完。

---

## 样例 2 — 会中AI洞察需聚焦"态度+关注议题"（全篇分量最重的一条诉求）

```yaml
id: REQ-速记-036
type: requirement
title: 会中AI洞察需聚焦"参会人态度"+"核心关注议题"并给出回复策略建议
statement_ears: "当AI在会议进行中生成实时洞察时,系统应当将洞察聚焦为参会人态度洞察和参会人核心关注议题洞察两类,并针对每类给出回复策略建议;不应逐句罗列参会人所说的话作为独立问题呈现"

source_trace:
  - type: meeting
    ref: "妙记obcnhby93v6426u4y3za998v#L484,487,493"
    reason: "说话人2明确否定此前版本'一个会议提炼出九十几个问题'的做法,要求真正的总结/综合/聚焦"

authenticity:
  groundable: true
  entailment:
    verdict: contradicts
    compared_against: shipped_product_behavior
    ref: "'之前的版本'——现有实现会把每句话都当独立问题罗列(具体版本号/commit未在语料中提及)"
  opportunity_link: "OPP-让客户真正愿意用起来这个AI会议产品(未过PMF)"
  machine_confidence: null

priority:
  kano: performance
  rice: {reach: null, impact: null, confidence: null, effort: null, score: null}
  qualitative_signal:
    emphasis_level: high
    repetition_count: 3
    explicitly_flagged_as_priority: true
  moscow: must
  human_decision: null
  decided_by: null
  decided_at: null

status: draft
```

```yaml
# L2 acceptance_criteria 试填（design-map阶段的东西,提前测一下）
acceptance_criteria:
  - id: AC-1
    check_type: semantic
    given_when_then: "Given 会中产生N条候选洞察点, When AI生成呈现给用户的洞察摘要, Then 呈现仅分为'参会人态度洞察'与'参会人核心关注议题洞察'两个类别,且每类附带具体回复策略建议,而非以问题列表形式逐条罗列"
  - id: AC-2
    check_type: semantic
    given_when_then: "Given 会议提及具体的琐碎问题, When AI生成洞察, Then 该琐碎点不作为独立呈现项"
    # 备注：这条本质是主观品味判断,难以写成可机械判定的确定性标准,proto-judge 大概率也只能靠 LLM 理解"是否过于琐碎"——这印证了报告 §5.2 自己承认的"L1→L2最不成熟"是真的
```

**验证结论：** `priority.rice` 全部字段填不出（语料没有 reach/impact/confidence/effort 这类数字），但语料里确实有真实、可提取的**质性优先级信号**（用词强调强度、反复次数、是否被点名为重点）——v0.2 加 `qualitative_signal` 字段后可以填。AC 层面"是否过于琐碎"依然是主观判断，此为已知未解问题，不在本轮修复范围。

---

## 样例 3 — 会中助手放腾讯会议侧边栏还是CRM页面（显式未决，标注为下次会议核心议题）

```yaml
id: REQ-速记-058-Q
type: open_question
title: 会中助手界面应放置于腾讯会议侧边栏还是CRM产品自身页面内
statement_ears: null   # type=open_question,省略

source_trace:
  - type: meeting
    ref: "妙记obcnhby93v6426u4y3za998v#L613,616,643"
    reason: "说话人5提出核心疑问,说话人2表态'都可以'但未最终拍板,显式列为下次会议核心议题"

authenticity:
  groundable: true
  entailment:
    verdict: n/a
    compared_against: none
  opportunity_link: null

priority: null   # type=open_question,省略

status: open
```

**验证结论：** v0.1 schema 假设"语料里抽出来的东西都能写成一句 EARS shall 语句"——这条从根上就不成立，它是一个悬而未决的架构问题，不是行为需求。v0.2 加 `type: open_question` + `status: open` 后可以干净地表达，不必强行套进需求模板；未来被拍板后再转成 `type: requirement` 继续走正常流水线。

---

## Phase 0 结论

3 条真实语料样例全部能被 v0.2 schema 完整表达。已知未解、不在本轮范围内的问题：AC 层面的主观品味判断（design-map/L2 阶段）、`machine_confidence` 目前是占位（Phase 1 才真正跑判官）。**Phase 0 通过——可以进入 Phase 1（proto-judge 校准实验）。**
