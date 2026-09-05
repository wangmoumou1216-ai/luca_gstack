---
name: redteam
preamble-tier: 1
version: 1.0.0
description: |
  红队：对当前决策链路发起全面质疑。读取所有已产出文件，找出最脆弱的假设、
  最大的盲点、最可能导致失败的决策。不提供解决方案，只提问题。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 1285
  runtime-estimate: 20000
  shared-refs: [ai-native-taste-anchors]
  recommended-model: reasoning-heavy  # 对抗性思考
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
```

---

## 执行

**评审对象**：调用方给了显式 target（diff / 文件集 / 某份提案或计划）→ **以该 target 为对象**，
不去扫 docs/ 全量（对齐 `input-modes.yaml` 的 `target_artifacts_or_problem`）。没给 target →
读 docs/ 下所有已产出文件，建立当前决策链路的完整图谱。

**判据挂载（确定对象后按下表取用，只读命中行、不全量加载）**：框架已积累的领域判据分散在各专用
评审资产内，而那些资产的流程外壳（截图门 / 固定 Phase / 上游产物契约）常拦住它们被用到；本表让
判据本身在评审时可达，与那些外壳无关。**判据是输入不是门**——读了用于提高质疑质量，不产生阻断。

| target 是 | 取用 |
|---|---|
| 渲染页面 / 原型 HTML | `ux-audit/specialists/module-a-visual.md`（层级 / 分组 / 对齐 / 可读性 / 一致性 / 构图 8 锚点；有已验证外部规范才比对其合规）+ `ux-audit/specialists/module-b-interaction.md`（Nielsen 10 · Norman 7 · WCAG 2.1 AA 7 项；缺交互或语义证据的检查记 UNKNOWN）+ `references/ai-native-taste-anchors.md`（8 品味锚点含信任/代理维度 + §4b 取证表 —— **已生成的原型同样要过品味检查**，别只做视觉与交互层） |
| 上行 + 属 CRM 业务页 | 加 `ux-audit/specialists/module-c-crm.md` 或 `references/crm-business-criteria.md` §1.2-1.5（首屏必要字段 / 高频操作路径 / 信息层级） |
| 设计决策文档（design-brief / 交互方案 / 原型描述） | `references/ai-native-taste-anchors.md`（8 品味锚点 + §4b 取证表 + 严重性分级）+ `references/ai-native-design-framework.md` §8（AI Slop 10 项反模式）+ `references/ai-native-state-coverage.md`（12 状态覆盖） |
| target 就是一份 design-brief 产出 | 加一项**完整性核查**：对照 `design-brief/SKILL.md` Phase 7 声明的 12 节清单逐节核对；若同时有原型，对照 §7「页面与交互位置映射」（`page_interaction_mapping`）核对语义位置、交互职责、D/STATE、来源与 AC、约束及下游实现是否一致。已确认页库引用仅辅助定位，reference=none 不免除语义追踪 |
| 代码 / hook / skill 规则 / 计划 / 提案 | **不挂判据表**，用通用对抗（本 skill 的默认形态） |

**发现问题之后**：要决定「自己修还是交人」时读 `references/oracle-vs-taste-criteria.md`——
oracle 型（可机械核对）才允许自动修，taste 型必须交人，**有歧义一律按 taste 处理**。

上表路径相对 `.claude/skills/office/`。`references/ux-evaluation-framework.md` 是迁移前原件、运行时
不加载，**不要取用**（其真值源已在上表的 module-a / module-c）。

历史 `component_mapping` / 旧组件映射只读提取位置、职责、决策、状态和来源语义；
核查覆盖缺口，不要求补 variant/classes、token 或组件库资产，不重写历史证据。

读取 observability 的短规则和近期反馈摘要，用来检查复犯：

```bash
python3 .claude/observability/scripts/get_rules.py "*" "*" 2>/dev/null || true
tail -50 .claude/observability/observations.jsonl 2>/dev/null
```

不要读取完整历史；只把 active rules、近期 observations 中与当前 topic/skill 有关的条目
纳入质疑。（`run-log.jsonl` 已 FREEZE、零写入即裁决票据，见 `office/SKILL.md` 冻结说明——
不再作为本 skill 的数据源。）

然后从「最挑剔的用户/竞争对手/产品经理」视角，对以下维度逐一质疑：

**需求层：**
- 这个功能解决的是真实问题还是假想问题？证据是什么？
- 成功标准是真的可测量，还是定义得足够模糊让失败看起来像成功？

**设计层：**
- 最核心的设计假设，有没有可能是错的？
- 品味检查通过的设计，在真实用户压力状态下会怎样？

**原生AI层：**
- 如果竞争对手用更彻底的 AI 原生方式实现这个功能，我们的设计还有竞争力吗？
- AI 介入的假设，依赖什么条件？这些条件在生产环境里一定存在吗？

**信任层（AI 功能必检）：**
- AI 的每个输出，用户凭什么相信它是对的？来源在哪里？
- 产品有没有装作"AI 一定是对的"？有没有过度自信的输出（无 hedging、无置信度）？
- 用户第一次看到这个 AI 功能时，有没有任何理由信任它？

**代理层（场景 D / 含 agent 动作必检）：**
- 如果 Agent 执行到一半崩了，用户会怎么办？有没有清晰的恢复路径？
- Agent 的"可撤销"设计，在边界情况下（网络断了/部分执行/并发冲突）还成立吗？
- 用户真的会"监督"Agent 吗？还是会完全放手然后在出错时抱怨？
- Agent 的授权边界在生产里会不会被用户自己绕过（因为太烦了就一直点"允许"）？
- 如果竞争对手的 Agent 做同样的事只需要一次授权，我们的每步审批设计是优势还是负担？

**实现层：**
- 原型和真实生产的差距，有没有被低估的风险？
- design-brief 的页面与交互位置映射是否遗漏核心职责、决策、状态或验收，导致核心交互降级？

**可观测性层：**
- 本次是否违反 active rules？
- 用户过去明确指出的问题，有没有在本次流程中复犯？
- 有没有新 observation 只被记录、没有沉淀成可执行 rule？

产出质疑清单：**设计/项目场景**写入 `docs/redteam/YYYY-MM-DD-<topic>-redteam.md`；
**框架治理场景**（被审对象是 luca_gstack 自身的规则/hook/skill，非某项目产物）写入
`framework-audit/YYYY-MM-DD-<topic>-redteam.md`——那里才是框架审计产出的既有落点，
且框架 session 常无绑定项目、写 `docs/` 会被 project-scope-guard 拒。
清单格式：每条质疑一句话，后面是「如果这个质疑成立，影响是什么」。

**workflow-state 写入：**

Claude 在执行前必须确定实际 `_TOPIC` 与 `_OUTPUT`，然后执行下面两组之一。
**项目场景**（有绑定项目）：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
# 如果 _TOPIC 为空或是占位符，从最新 idea 文件名推断
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea.md$//' || echo "unknown")
export _NODE="redteam"
export _STATUS="DONE"
export _OUTPUT="docs/redteam/$(date +%Y-%m-%d)-${_TOPIC}-redteam.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

**框架治理场景：不写 workflow-state。** 理由不是"绕开 guard"而是**没有可追踪的对象**——
workflow-state 追的是某个项目的设计流节点，框架审计不属于任何项目的设计流。更硬的理由：
`references/write_state.py` 在 Python 内部打开 `.claude/workflow-state.yaml`（**一条指向当前
激活项目的软链**），project-scope-guard 只按 Bash 命令文本做 anchor 匹配、拦不住它——未绑定
的框架 session 调它，会把框架评审的 DONE 状态写进"此刻碰巧激活的那个项目"，正是会话级项目
隔离要消灭的跨项目污染（并行 session 尤甚）。**P7 合规**：写入块本体与变量含义一字未动，
这里加的是场景门；`quality-gate` 的"workflow-state 已更新为 DONE"检查属 workflow 模式，
框架治理场景本就不在 workflow 里。产出落 `framework-audit/` 自身即审计留痕。

<!-- FILE_END: .claude/skills/office/redteam/SKILL.md -->
