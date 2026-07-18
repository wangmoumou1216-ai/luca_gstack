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

读取 docs/ 目录下所有已产出文件，建立当前决策链路的完整图谱。

读取 observability 的短规则和近期反馈摘要，用来检查复犯：

```bash
python3 .claude/observability/scripts/get_rules.py "*" "*"
tail -50 .claude/observability/observations.jsonl 2>/dev/null
tail -50 .claude/observability/run-log.jsonl 2>/dev/null
```

不要读取完整历史；只把 active rules、近期 observations、近期 run-log 中与当前
topic/skill 有关的条目纳入质疑。

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
- design-brief 的组件映射缺口，会不会导致核心交互降级？

**可观测性层：**
- 本次是否违反 active rules？
- 用户过去明确指出的问题，有没有在本次流程中复犯？
- 有没有新 observation 只被记录、没有沉淀成可执行 rule？
- run-log 是否足够让下次调用知道本次用过哪些规则和产出？

产出质疑清单，写入 `docs/redteam/YYYY-MM-DD-<topic>-redteam.md`。
清单格式：每条质疑一句话，后面是「如果这个质疑成立，影响是什么」。

**workflow-state 写入：**

Claude 在执行前必须确定实际 `_TOPIC`（从 `current-topic.txt` 读取，
或根据当前功能名推断 topic slug），然后执行：

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

<!-- FILE_END: .claude/skills/office/redteam/SKILL.md -->
