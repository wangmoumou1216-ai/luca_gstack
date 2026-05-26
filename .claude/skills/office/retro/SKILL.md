---
name: retro
preamble-tier: 1
version: 1.0.0
description: |
  设计决策复盘。五问框架：核心假设验证/正确决策证据/弯路原因/下次改变/
  应该更早问到的信息。不分析 git commit，分析设计决策链路。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
context-cost:
  self: 1088
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: haiku  # 回顾总结
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1)
_REVIEW=$(ls -t docs/review/*-handoff-review.md 2>/dev/null | head -1)
echo "DECISION: ${_DECISION:-none}"
echo "REVIEW: ${_REVIEW:-none}"
```

---

## 五问复盘（逐一问，每次只问一个）

**读取 design-brief.md、ux-audit 报告（如有）、handoff-review（如有）作为上下文。**

---

**问一：核心假设验证**

AskUserQuestion：

> 这次方案的核心假设是什么？执行中被验证了，还是被挑战了？
>
> 提示：可以从 design-brief.md 的「假设挑战」节找到最初的假设。

---

**问二：正确决策的证据**

AskUserQuestion：

> 哪个设计决策，事后看是对的？有什么具体证据支撑这个判断？

---

**问三：弯路原因**

AskUserQuestion：

> 哪个决策走了弯路？是什么原因导致的？（信息不足/时间压力/假设错误/其他）

---

**问四：下次改变的第一件事**

AskUserQuestion：

> 下一次做类似功能，第一件事应该做什么不同？（具体到操作层面，
> 不是「多思考」这种层面）

---

**问五：应该更早问到的信息**

AskUserQuestion：

> 有没有某个信息，在 PRD 阶段就应该知道，但没有问到？
>
> 如果有，下次应该在哪个节点（/idea/brainstorm/ux-research）主动追问？

---

## 产出复盘记录

写入 `docs/retro/YYYY-MM-DD-<topic>-retro.md`：

```markdown
# 设计决策复盘 — {功能名称}

复盘时间：{时间}
关联决策：{design-brief.md 路径}

## 问一：核心假设验证
{回答内容}

## 问二：正确决策的证据
{回答内容}

## 问三：弯路原因
{回答内容}

## 问四：下次改变的第一件事
{具体行动，追加到 CONTEXT.md 的长期记忆}

## 问五：应该更早问到的信息
{具体信息 + 建议在哪个节点追问}
```

**如果问四有具体行动 → 追加到项目根目录 CONTEXT.md（区四长期记忆）：**

```markdown
## 来自 YYYY-MM-DD 复盘的红线

{具体约束或洞察}
来源：{topic} 项目复盘
```

<!-- FILE_END: retro/SKILL.md -->



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
           sed 's/-idea\.md$//' || echo "unknown")
export _NODE="retro"
export _STATUS="DONE"
export _OUTPUT="docs/retro/$(date +%Y-%m-%d)-${_TOPIC}-retro.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

<!-- FILE_END: .claude/skills/office/retro/SKILL.md -->
