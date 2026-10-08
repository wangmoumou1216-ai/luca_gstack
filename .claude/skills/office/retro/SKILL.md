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
  - Bash
  - AskUserQuestion
context-cost:
  self: 1088
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: mechanical  # 回顾总结
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1)
_REVIEW=$(ls -t docs/review/*.md 2>/dev/null | head -1)
echo "DECISION: ${_DECISION:-none}"
echo "REVIEW: ${_REVIEW:-none}"
python3 .claude/observability/scripts/get_rules.py retro "*" 2>/dev/null || true
```

---

## 五问复盘（逐一问，每次只问一个）

**读取 design-brief.md、ux-audit 报告（如有）、评审产出（如有）作为上下文。**

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

**复盘记录模版真值源 = 本 skill 目录下的 `SCHEMA.md`。** 读取 `SCHEMA.md`，按其结构
（复盘人 + 问一~问五 + 「追加到 CONTEXT.md」节，其中问三分「走了什么弯路/原因分类/具体说明」、
问四含「是否追加到 CONTEXT.md 是/否」）填充各节内容。不要在本文件另维护一份并行模版，
避免两份模版漂移；字段结构一律以 `SCHEMA.md` 为准。

**如果问四有具体行动 → 追加到项目根目录 CONTEXT.md（区四长期记忆）：**

```markdown
## 来自 YYYY-MM-DD 复盘的红线

{具体约束或洞察}
来源：{topic} 项目复盘
```



**workflow-state 写入：**

**完成分支（先判再执行下方代码）：** 受管 workflow（completion_owner=Orchestrator）以「受管回交」替代下方 writer：完成本 skill 必需产物、自检及适用 handoff 校验后，按 `references/handoff-protocol.md`「受管节点提交」回交精确产物身份、原输出字段和提交请求；不在这里写 DONE。下方原代码仅供已验收后的 O 合法提交，或非受管且确有本节点/写权限的既有完成路径；standalone 无节点不写状态，保留原 handoff 豁免。实际调用必须晚于本 skill 必需 handoff（idea 的下节也先完成）；NO_PIN 框架不写项目状态。


Claude 在执行前必须确定实际 `_TOPIC`（从 `current-topic.txt` 读取，
或根据当前功能名推断 topic slug），然后执行：

状态块运行前按 office 合同从已验证项目绑定冻结 canonical `_PROJECT_ROOT`；下方路径检查不授予项目权限。写入失败须保留产物、报告状态尚未同步并停止依赖后继，不能继续宣称 DONE 或 handoff 成功。

```bash
case "${_PROJECT_ROOT:-}" in
  /*) ;;
  *) printf '%s\n' 'ERROR: 缺少已验证的绝对 _PROJECT_ROOT；不从共享别名推断项目。' >&2; exit 1 ;;
esac
if [ ! -d "$_PROJECT_ROOT" ] || [ "$(cd "$_PROJECT_ROOT" && pwd -P)" != "$_PROJECT_ROOT" ]; then
  printf '%s\n' 'ERROR: _PROJECT_ROOT 必须是已验证且已解析的项目根目录。' >&2
  exit 1
fi
export _TOPIC="${_TOPIC:-$(cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null)}"
if [ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ]; then
  _TOPIC=$(ls -t "$_PROJECT_ROOT"/docs/idea/*-idea.md 2>/dev/null | head -1 | \
    xargs basename 2>/dev/null | sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | sed 's/-idea\.md$//')
fi
if [ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] || [ "$_TOPIC" = "unknown" ] || [ "$_TOPIC" = "none" ]; then
  printf '%s\n' 'ERROR: 缺少本次产出的真实 topic；状态尚未同步，保留产物并停止依赖后继。' >&2
  exit 1
fi
# 只有本次已经确认的场景才参与 topic 事务；未知场景只更新节点。
case "${_SCENE:-}" in A|B|C|D) export _SCENE ;; *) unset _SCENE ;; esac
export _NODE="retro"
export _STATUS="DONE"
export _OUTPUT="docs/retro/$(date +%Y-%m-%d)-${_TOPIC}-retro.md"
python3 .claude/skills/office/references/write_state.py || {
  _STATE_RC=$?
  printf '%s\n' 'ERROR: 产物已生成，但 workflow-state 未同步；保留产物，停止依赖后继，不报告 DONE 或 handoff 成功。' >&2
  exit "$_STATE_RC"
}
```

<!-- FILE_END: .claude/skills/office/retro/SKILL.md -->
