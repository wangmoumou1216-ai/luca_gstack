---
name: challenge
preamble-tier: 1
version: 1.0.0
description: |
  CEO/创始人视角挑战需求范围，寻找 10 星产品。四种模式：范围扩张/选择性扩张/
  保持范围/范围缩减。仅场景A（新功能）适用。在 /brainstorm 之后、/ux-research
  之前运行。来源：gstack plan-ceo-review。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 1400
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: guided-execution  # 基于约束验证
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
echo "BRANCH: $_BRANCH"
echo "PRD: ${_PRD:-none}"
```

---

## Pre-Task：加载 observability 短规则

启动时只热加载短规则，不读长日志（与 office 共享 Observability Protocol 一致，
防用户曾纠正写成 active rule 后再次运行本 skill 时复犯）：

```bash
python3 .claude/observability/scripts/get_rules.py challenge "*" 2>/dev/null || true
```

---

## Phase 0：确认前置 + 场景检查

**【L-04 修复】场景检查：**

```bash
_SCENE=$(python3 -c "
import yaml
try:
    s = yaml.safe_load(open('.claude/workflow-state.yaml'))
    print(s.get('scene', 'unknown'))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")
echo "SCENE: $_SCENE"
```

如果 `_SCENE` 为 B 或 C：
```
⚠️ /challenge 设计用于场景A（新功能设计），用于在 PRD 完成后挑战需求范围。

当前检测到场景：{B/C}
场景B（优化）和场景C（评审改版）通常不需要范围挑战。

是否继续？
A）继续（我确认需要在当前场景做范围挑战）
B）停止
```

如果 `PRD: none`：
```
⚠️ 未找到 PRD 文件。/challenge 需要先有 PRD。
建议运行：/idea → /brainstorm → /challenge
```

**读取 PRD 后，展示核心内容摘要，然后询问模式：**

AskUserQuestion：

> 我们来重新审视这个需求的范围。选择一个模式：
>
> A）**范围扩张** — 找到隐藏在这个请求里的 10 星产品
> B）**选择性扩张** — 保持当前范围，逐一探索值得加入的机会
> C）**保持范围** — 对现有范围做最严格的审查，不扩展
> D）**范围缩减** — 找到最小可行版本

---

## Phase 1：重新审视核心问题

**这是 CEO/创始人视角，不是项目经理视角。**

问：这个功能请求背后，用户真正的 Job-to-be-Done 是什么？
这个 PRD 是在解决正确的问题，还是在解决一个更深层问题的表面症状？

```
用户提出的功能：{PRD 描述}
真正的 Job-to-be-Done：{更深层的需求}
现有 PRD 解决的是哪个层次的问题：{表面/中层/根本}
```

---

## Phase 2：按模式执行

### 模式A：范围扩张

挑战每个核心假设，找到更大的机会：

```
这个功能如果做到 10 星，用户会感受到什么不同？
哪些相关的用户痛点，我们可以同时解决？
如果这个功能做成一个独立产品，它会是什么？
```

用 AskUserQuestion 逐一提出扩展机会，让用户选择是否纳入。

### 模式B：选择性扩张

保持当前范围作为基准，逐一提出 2-4 个扩展机会，中立推荐，用户选择。

### 模式C：保持范围

对现有 PRD 做严格审查：
```
□ 每个 P0 用户故事都是真正的 P0，不是被高估优先级的 P1？
□ 成功标准足够清晰，上线后能明确判断成功/失败？
□ 不做什么边界足够清晰？
```

### 模式D：范围缩减

找到最小可行版本：
```
如果只能做这个功能的 40%，先做哪个 40%？
哪个功能如果去掉，对核心用户价值影响最小？
```

---

## Phase 3：产出记录

将范围审查结论写入（`<topic>` 用下方 workflow-state 段解析出的实际 topic slug，日期取当天，
不得把字面 `*` 或 `<topic>` 写进文件名；docs/prd/ 目录与 -challenge.md 后缀约定不变）：
`docs/prd/YYYY-MM-DD-<topic>-challenge.md`

```markdown
# 范围审查记录

模式：{A/B/C/D}
审查时间：{时间}
来源 PRD：{文件路径}

## 核心问题重新定义
{Job-to-be-Done 层次分析}

## 审查结论
{具体决策：扩展了什么/保持了什么/缩减了什么}

## 对 PRD 的影响
{需要更新 PRD 的具体节/不需要更新}
```

---



**workflow-state 写入：**

Claude 在执行前必须确定实际 `_TOPIC`（优先读 `current-topic.txt`；为空时**从 Preamble 已取到的
PRD 文件名 `docs/prd/*-prd.md` 推断 topic slug**，而非从 brainstorm-first 流程下常为空的
`docs/idea/` 推断——challenge 恒有 PRD 前置，PRD 才是本 skill 的可靠 topic 源），然后执行：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
# 如果 _TOPIC 为空或是占位符，从最新 idea 文件名推断
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
export _NODE="challenge"
export _STATUS="DONE"
export _OUTPUT="docs/prd/*-challenge.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

## ⚠️ 末尾核心约束

1. **仅场景A适用** — 场景B/C不运行此 skill
2. **模式选择不可跳过**
3. **逐一提出扩展机会** — 不批量推送，每次 AskUserQuestion 只提一个机会
4. **用户决策权** — 每个扩展机会由用户决定，不强制纳入

<!-- FILE_END: challenge/SKILL.md -->
