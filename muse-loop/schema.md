# muse-loop L1/L2 Schema + REQ 目录产物格式（v0.5，2026-07-02）

> Phase 0 产出。v0.1（源自深度解决方案报告原始设计）经 3 条真实会议语料（速记项目妙记 `obcnhby93v6426u4y3za998v`）手填测试，暴露 3 处缺口，v0.2 已修复；v0.3 补 EARS 四模板 + prd_ready 状态；v0.4 补 rejected/withdrawn 终止态 + AC source 标注；v0.5（2026-07-02）补 `design_reference` 字段 + `baseline.md`/`change-map.md` 格式（第一条真实端到端 REQ 暴露的"从未核对现有UI"缺口修复，调研+红队依据见 `ARCHITECTURE.md` Phase 2.4）。验证过程见 `schema-validation-examples.md`。

## L1 需求卡

```yaml
id: REQ-<项目缩写>-<编号>
type: requirement | open_question   # v0.2 新增 — 语料里相当比例的条目不是"可执行需求"而是"待决策的开放问题"（架构分歧/命名未定稿/方案待验证），两者不能共用同一套 EARS 模板
title: ...
statement_ears: "..."   # type=requirement 必填；type=open_question 可省略或写成疑问句
# v0.3 补（2026-07-02，"完美标准"审查发现之前只验证过事件驱动型）：EARS 有4种模板，按需求性质选，不是只有一种：
#   事件驱动 (WHEN...THE SYSTEM SHALL...)：当X发生时,系统应当Y —— 最常见，行为由某个事件触发
#   状态驱动 (WHILE...THE SYSTEM SHALL...)：当处于X状态期间,系统应当Y —— 持续状态下的行为，非单次事件
#   条件驱动 (IF...THEN...THE SYSTEM SHALL...)：如果X为真,那么系统应当Y —— 边界情况/错误处理/异常分支
#   通用型 (THE SYSTEM SHALL...)：系统应当Y —— 无触发条件的基线能力/约束
# 三条 Phase 0 验证样例 + Phase 1 样例目前全部是事件驱动型，不代表另外三种不需要——语料里遇到错误处理类
# 需求（如"如果语料来源不明确,应当upgrade到人工确认"这类）时用条件驱动型，不要强套事件驱动型硬写。

source_trace:
  - type: meeting | prd | existing_product   # existing_product 为 v0.2 新增来源类型
    ref: "..."
    reason: "..."

authenticity:
  groundable: true
  entailment:                          # v0.2：拆出 compared_against，因为"existing"在真实语料里至少有 3 种不同参照物
    verdict: new | duplicate | contradicts | extends
    compared_against: historical_prd | same_meeting_earlier_statement | shipped_product_behavior | none
    ref: "指向被推翻/延伸的具体条目或版本"
  opportunity_link: "..."              # 可选；真实语料里"机会"常隐含在多轮吐槽里，提炼时注意不要越过"不延展不推断"红线
  machine_confidence: 0.0-1.0

design_reference:                      # v0.5 新增（2026-07-02，第一条真实端到端REQ暴露的真实失败：整条链从未看过真实现有UI，
  # PRD 把历史记录标签当成了入口按钮。与 source_trace 区分：那记"这条需求从哪来"，这记"要改的现有UI在哪"。
  # 场景B（已有功能优化）/场景C（评审改版）必填；triage 只在语料里真出现引用时填（忠实抽取，不推断），否则 null；
  # null + 场景B/C → GATE-1 必须就地问用户"现有UI在哪"。
  # none_confirmed_greenfield 只能由人类在 GATE-1 显式选择，机器永不自标——防止静默把改造需求当从0到1处理（本次真实教训）。
  type: figma | live_html | screenshot | none_confirmed_greenfield | null
  ref: "figma fileKey+nodeId / 线上URL / 截图路径"
  captured_at: null                    # 采集时间戳，供基线血统锚定（Chromatic 基线生命周期不变量：跟什么比永远可答）

priority:                              # type=open_question 时本段可省略
  kano: basic | performance | delight
  rice: {reach: null, impact: null, confidence: null, effort: null, score: null}   # 会议语料通常填不满，允许留空——RICE 需要额外产品数据（使用量/客户反馈量），不是从语料本身能算出来的
  qualitative_signal:                  # v0.2 新增 — 会议语料里真实存在、但 RICE 覆盖不到的优先级信号
    emphasis_level: low | medium | high
    repetition_count: 0
    explicitly_flagged_as_priority: false
    requester_role: null                 # 提出者角色（客户/销售/产品/内部脑爆），无则 null；triage Phase 1 计算并在 GATE-1 呈现，此处为其落盘位
  moscow: must | should | could | wont
  human_decision: null                 # 人类卡点裁定（GATE-1），null = 未裁定
  decided_by: null
  decided_at: null

status: draft | triaged | approved | prd_ready | designed | built | verified | open | rejected | withdrawn
  # prd_ready 为 v0.3 新增（2026-07-01 修复内部矛盾时补）：approved 之后先经 /brainstorm 完整跑一遍产出真实 PRD，Phase 2 design-map 的 traceable_delivery 硬约束才有真实输入可喂；
  # open 为 v0.2 新增，专属 type=open_question，不进入常规流水线，直到被拍板转成真正 requirement；
  # rejected | withdrawn 为 v0.4 新增（2026-07-02，"完美标准"复查时发现的真实缺口，参照 Shape Up 电路熔断/RFC终止态）：
  #   之前的枚举只有前进态，一条 REQ 被 approved 甚至 designed/built 之后，若团队主动决定不做了，没有合法状态可标——只能卡在原状态或被静默删除，丢失"何时+为何主动终止"的可审计记录。
  #   rejected = 在 verified 之前的任意阶段，团队主动决定不做（区别于 priority.moscow=wont——那是triage阶段"本轮不做"的优先级判断，不代表已经进入流水线又被叫停）；
  #   withdrawn = 已经 verified，但后续因某种原因（如上游需求变了）被撤回，不算失败，只是不再需要。
  #   两个状态都必须在 docs/loop/traceability.md 追加一行记录终止原因和时间，不允许静默消失（同verified/Reviewer Concerns一样走收尾流程）。
```

## L2 设计卡（映射 + eval 源头，本次仅做初步验证，未大改）

```yaml
req_id: REQ-<项目缩写>-<编号>
maps_to:
  page: ...
  ux_framework: ...
  components: [...]   # 只能从受控词汇表(FxUI/shadcn)选
  interaction_logic: |
    Given ...
    When ...
    Then ...

acceptance_criteria:
  - id: AC-1
    check_type: deterministic | semantic
    check: "..."             # deterministic 用
    given_when_then: "..."   # semantic 用
    source: ae# | derived-fallback   # v0.4 新增（2026-07-02，真实端到端跑第一条REQ发现的缺口修复）：
      # ae#（如 "ae1"）= 从 PRD Acceptance Examples 翻译而来，有真实需求层依据；
      # derived-fallback = PRD 当时没有对应 AE#，从 design-brief 的 D-系列决策内容机械推导——
      # 置信度低于 ae# 来源，muse-proto-judge 打分时应区别对待，不能一视同仁
    ae_ref: null              # source=ae# 时必填，写具体 AE 编号（如 "AE1"）；derived-fallback 时留空
```

**已知未解的坑（不在本轮 3 个修复范围内，留待后续）：** 部分需求的验收标准本质是主观品味判断（如"洞察是否过于琐碎"），难以写成确定性/可机械判定的 AC——这是报告自己在 §5.2 承认的"L1→L2 设计映射最不成熟一环"，本轮验证证实这个坦白是真实的，不是自谦，暂不强行解决。

---

## baseline.md（现状基线清单，v0.5 新增，场景B/C 专属 REQ 目录产物）

> 落点：`docs/loop/specs/REQ-*/baseline.md`。由 `muse-loop-orchestrate` 在 GATE-1 之后、Phase 1.5（/brainstorm）**之前**采集——
> 因为第一条真实REQ的错误正是在 PRD 层进来的（brainstorm 对现有UI一无所知）。
> 外部依据：BMAD-METHOD brownfield 工作流 Phase 1 `document-project`（"Always Document First, even if you think you know the codebase"）；
> Kiro steering 模式（机器采集→人工校正→才可用）；Chromatic 基线生命周期（刻意采集/人工批准更新/血统锚定）。

```markdown
# Baseline: REQ-<id> 现状基线清单

## 来源与血统（必填，不可省略——"跟什么比"必须永远可答）
- 类型: figma | live_html | screenshot
- 引用: <figma fileKey + nodeId / URL / 截图路径列表>
- 采集时间: <YYYY-MM-DD HH:MM>
- 采集方式: <Figma MCP get_metadata+get_screenshot / 页面读取+截图 / 用户提供截图>

## 盘点范围声明（BMAD 规模规则）
- [小面积] 全量盘点本页/本模块
- [大页面] 只盘点与本 REQ 相关区域: <区域说明>，边界外区域显式声明"未盘点"

## 现状盘点（真实名称，逐项带定位锚点）
| # | 模块/元素 | 真实名称/文案 | 定位锚点（Figma节点ID/DOM选择器/截图区域） | 备注 |
|---|----------|--------------|------------------------------------------|------|

## 人工校正记录（Kiro steering 模式：机器采集必然有错，未经人工校正不可用）
- 校正人: <user>
- 校正时间: <...>
- 校正内容: <机器盘点哪里错了/漏了，人工改了什么；无更正也要写"确认无误">

## 更新规则
本基线只能经人工显式批准更新（不可静默重采覆盖）；更新时保留旧版本记录。
```

## change-map.md（变更映射矩阵，v0.5 新增，场景B/C 专属 REQ 目录产物）

> 落点：`docs/loop/specs/REQ-*/change-map.md`。由 `muse-loop-orchestrate` 在 Phase 1.5（PRD产出）之后、Phase 2（design-brief）**之前**编制，
> 轻量 AskUserQuestion 确认（映射表+基线截图并排呈现）。Phase 2 硬性前置：本文件不存在或覆盖不全 → 不得 dispatch design-brief。
> 外部依据：ISO 14764 变更分类 + RTM 需求→受影响组件矩阵；Kiro Bugfix Spec 的 Unchanged Behavior 段；
> 内部先例：html-prototype 的改动区/保持区标记。

```markdown
# Change Map: REQ-<id> 需求→现状映射矩阵

## 变更矩阵（PRD 每条 MUST 级 R 必须出现，不允许空置）
| PRD 需求项 | 基线清单项（# 引用 baseline.md） | 变更类型 | 说明 |
|-----------|--------------------------------|---------|------|
| R1 | #2 | MODIFY | <具体改什么> |
| R2 | —  | ADD(锚点: 基线#1之后) | <加什么、加在哪> |
| R6 | #3 | REMOVE | <删什么> |

变更类型: MODIFY（改现有项）| REMOVE（删现有项）| ADD(锚点)（新增,必须写清楚锚定在基线哪个位置）| UNCHANGED（明确不动）

## 保持区（Unchanged——Kiro Bugfix Spec 的 "Unchanged Behavior"：什么必须保持不变，与改动区同等重要）
| 基线清单项 | 为什么必须不动 |
|-----------|---------------|

## 映射失败项（诚实记录：PRD 里映射不到任何基线项、也不是合法 ADD 的需求——这是 PRD 与现实错配的信号，必须上报，不许静默吞掉）
| PRD 需求项 | 错配说明 |
|-----------|---------|

## 人工确认记录
- 确认人/时间: <...>
- 呈现方式: 映射表 + 基线截图并排（三联对照）
```
