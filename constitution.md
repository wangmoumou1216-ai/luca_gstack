# constitution — muse-loop 不可协商原则（v1.0，2026-07-02 落地填充）

> muse fork 专属，母版 luca_gstack 无此文件。本文件是 Loop 的"不可协商项"集合——各 skill 遇到判断分歧时，先查这里，不各自发明标准。原始报告设想的 RICE/Kano 数值打分，经红队验证不适用于本 Loop 的真实语料（会议纪要/候选需求队列缺产品数据支撑），**已被真实采用的 `qualitative_signal` 机制取代，本文件如实记录这个决定，不假装原始设计原样落地**。

## 1. 设计哲学

- **Loop 是"带卡点的 workflow"，不是自由 agent。** 主干（extract→triage→brainstorm→design-map→gen/judge）是单向链，只能往前走；只有 `muse-proto-gen`↔`muse-proto-judge` 是有界内循环（evaluator-optimizer 模式，轮数上限3）。这是红队验证过的拓扑选型，理由：母版 Orchestrator 的"节点顺序只能前进"硬规则、以及"能画出决策树的任务就不该交给 agent 自由探索"（Anthropic Building Effective Agents 的判据）。
- **2个人类卡点不可省略**：GATE-1（需求 triage 后，人裁真伪/优先级）、GATE-2（design-map 后，人审映射）。这是 Loop 质量的底线，不是可选项，`allow_standalone_override` 恒为 `false`。
- **机器只提议，人类裁定。** 真伪/优先级判断，机器只做三件事：可回溯性检查、rule-based 打分、提议分类——绝不代替人类拍板。

## 2. FxUI Token 规则

**不在本文件重复定义**——权威源是共享参考 `.claude/skills/office/references/html-prototype-tokens.md`（`muse-proto-gen` 的 `shared-refs` 已直接引用）。凡是本 Loop 产出的 HTML/CSS，token 使用规则以该文件为准，不允许硬编码颜色/间距。

## 3. AX（Agent Experience）原则

**不在本文件重复定义**——沿用母版既有的 `ai-native-design-framework.md`、`ai-native-state-coverage.md`、`ai-native-taste-anchors.md`（`.claude/skills/office/references/`）。`muse-proto-judge` 的"可访问性"判定维度、`muse-proto-gen` 的 AI 专属状态（思考中/低置信/拒答）渲染，均以这三份文件为标尺，不另造一套。

## 4. 需求真伪判据

不用 RICE/Kano 数值打分做真伪判断（那是优先级维度，见第5节）。真伪判据落在 `muse-req-triage` 的独立 triage 分类里：

```
TRIAGE_ACCEPT     — 可回溯到语料 + 经人类确认，进入下一步
TRIAGE_DEFER      — 真实但本轮不做
TRIAGE_REJECT     — 判断为伪需求或不该做，需写明理由
TRIAGE_DUPLICATE  — 与已有 REQ/PRD 重复
TRIAGE_ESCALATE   — 机器判断不了（如涉及商业策略），直接甩给人类
```

**可回溯性是真伪的必要条件，不是充分条件**——一条需求即使能回溯到语料原文，若连不到任何真实机会/问题，人类在 GATE-1 仍可判 `TRIAGE_REJECT`。机器不能僭越这一步。

## 5. 优先级打分定义（已用 `qualitative_signal` 取代原始 RICE/Kano 设想）

**明确记录一个真实的设计偏离，不掩盖：** 原始报告设想用 RICE（Reach×Impact×Confidence÷Effort）和 Kano 分类做优先级打分。红队验证 + Phase 0 真实语料测试（速记项目会议纪要）发现：RICE 需要的 reach/impact/effort 是产品数据，会议纪要/候选需求队列本身给不出这些数字——机器没有这些输入就只能编造，违反"不臆造"铁律。

**实际采用的机制**（`muse-req-triage` Phase 1，定义于其 SKILL.md，字段对应 `muse-loop/schema.md` 的 `priority.qualitative_signal`）：

| 信号 | 含义 |
|------|------|
| `repetition_count` | 语料内被提及/强调的次数 |
| `emphasis_level` | 用词的强调强度（low/medium/high） |
| `requester_role` | 提出者角色（客户/销售/产品/内部脑爆） |
| `explicitly_flagged_as_priority` | 语料里是否被显式点名为"最重要的一条" |

这些是语料能真实提供的质性信号，不是量化优先级分数——**不产出可直接排序的单一数值**，最终排序仍由人类在 GATE-1 做出。若某个具体项目场景确实有 reach/impact/effort 这类真实产品数据，可以由人类手工补充 RICE 字段（`schema.md` 保留了该字段位置，允许留空），但机器不主动编造。
