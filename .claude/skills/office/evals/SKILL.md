---
name: evals
preamble-tier: 1
version: 1.0.0
description: |
  质量追踪。记录每次流程的客观指标：节点完成情况/品味检查得分/假设验证状态/
  原生AI思维应用程度。来源：EVALS.md + EVALS-optimize.md。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 1786
  runtime-estimate: 5000
  shared-refs: [ai-native-taste-anchors]
  recommended-model: mechanical  # 基于指标打分
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_EVALS=$(ls docs/evals/*.md 2>/dev/null | wc -l)
echo "EXISTING_EVALS: $_EVALS"
```

---

## 执行

读取 docs/ 目录下所有产出文件，记录以下指标。

同时读取 observability 的短规则和近期冷日志摘要：

```bash
python3 .claude/observability/scripts/get_rules.py "*" "*"
tail -50 .claude/observability/run-log.jsonl 2>/dev/null
tail -50 .claude/observability/observations.jsonl 2>/dev/null
```

不要读取完整历史。只抽取：本次流程命中的 active rules、
是否复犯历史反馈、是否有 observation 未沉淀成 rule。

```markdown
# Evals 记录 — {功能名称}

记录时间：{时间}
场景：{A/B/C}
分支：{branch}

## 节点完成情况

| 节点 | 状态 | 产出文件 |
|------|------|---------|
| /idea | ✅/⬜ | {路径} |
| /brainstorm | ✅/⬜ | {路径} |
| /ux-research | ✅/⬜ | {路径} |
| /ux-brainstorm | ✅/⬜ | {路径} |
| /design-brief | ✅/⬜ | {路径} |
| /html-prototype | ✅/⬜ | {路径} |
| /figma-demo | ✅/⬜/N/A | {路径} |
| /ux-audit | ✅/⬜ | {路径} |
| /figma-layer | ✅/⬜ | {路径} |
| /handoff-review | ✅/⬜ | {路径} |

## 品味检查得分

| 锚点 | 通过状态 |
|------|---------|
| Ryo Lu | ✅/⚠️/❌ |
| Linear | ✅/⚠️/❌ |
| Attio | ✅/⚠️/❌ |
| Notion | ✅/⚠️/❌ |
| Raycast | ✅/⚠️/❌ |

## 原生AI思维应用

| 分析维度 | 执行状态 | 关键结论 |
|---------|---------|---------|
| 竞品分析：产品层AI分析 | ✅/⬜ | {决策压缩N→N'次} |
| 竞品分析：交互层AI分析 | ✅/⬜ | {路径N→M步} |
| 设计决策：产品层AI思考 | ✅/⬜ | {结论} |
| 设计决策：交互层AI思考 | ✅/⬜ | {结论} |

## 假设验证状态

| 假设 | 验证状态 | 来源 |
|------|---------|------|
| {假设1} | ✅已验证/⚠️存疑/❌被推翻 | {design-brief 假设挑战节} |

## UX 评审得分（场景B/C）

| 模块 | 得分 | 主要问题 |
|------|------|---------|
| A 视觉合规 | {N}/100 | {P0 N条} |
| B 交互可访问性 | {N}/100 | {P0 N条} |
| C CRM业务专项 | {N}/100 | {P0 N条} |
| 综合 | {N}/100 | |

## Observability

| 指标 | 状态 | 说明 |
|------|------|------|
| Active rules loaded | ✅/⬜ | {规则ID列表或 none} |
| Historical feedback repeated | ✅无复犯/⚠️疑似/❌复犯 | {说明} |
| New observations unresolved | ✅无/⚠️有 | {observation IDs} |
| Run log written | ✅/⬜ | {最近一次 run-log 记录} |
```

如果 `/figma-demo` 参与流程，额外记录：

```markdown
## Figma Demo 质量指标

| 指标 | 状态 | 证据 |
|------|------|------|
| requirement.md 已生成 | ✅/⬜/❌ | {路径} |
| mapping-proof.md 已生成 | ✅/⬜/❌ | {路径} |
| blueprint.yaml 已生成 | ✅/⬜/❌ | {路径} |
| 节点 fragment/interface 完整 | ✅/⬜/❌ | {N}/{M} |
| assembly-log.md 已生成 | ✅/⬜/❌ | {路径} |
| prototype QA 通过 | ✅/⚠️/❌ | prototype-qa-report.md |
```

写入 `docs/evals/YYYY-MM-DD-<topic>-evals.md`。

<!-- FILE_END: evals/SKILL.md -->



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
export _NODE="evals"
export _STATUS="DONE"
export _OUTPUT="docs/evals/$(date +%Y-%m-%d)-${_TOPIC}-evals.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

<!-- FILE_END: .claude/skills/office/evals/SKILL.md -->
