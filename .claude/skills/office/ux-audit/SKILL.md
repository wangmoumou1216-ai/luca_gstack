---
name: ux-audit
preamble-tier: 2
version: 1.0.0
description: |
  CRM页面UX评审。启动时询问：场景（优化参考B/改版基线C）+ 激活哪些模块（多选）。
  三个模块：A视觉系统合规（35%）/ B交互与可访问性（40%）/ C CRM业务专项（25%）。
  串行执行，每个模块用Agent tool调度对应specialists/文件。截图是强制输入。
  ux-audit直接产出最终报告，不需要再合并。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
context-cost:
  self: 5540
  runtime-estimate: 20000
  shared-refs: [crm-business-criteria, design-system-contract]
  recommended-model: sonnet  # 基于framework评估
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_CONSTRAINTS=$(ls docs/prd/*-prd-constraints.md 2>/dev/null | head -1)
echo "CONSTRAINTS: ${_CONSTRAINTS:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
```

---

## Phase 0：强制询问（必须按顺序，每次只问一个）

### 询问 1：场景确认

AskUserQuestion：

> 这次 UX 评审的目的是？
>
> B）**优化参考** — 评审问题作为设计决策的来源，进入 /ux-brainstorm 或 /design-brief
> C）**改版基线建立** — 评审结果作为 baseline 分数，改版后需验证提升 ≥10 分

### 询问 2：截图确认

**截图是强制输入。没有截图不能执行评审。**

检查对话里是否有截图附件。如果没有，立即：

```
⚠️ UX 评审需要页面截图，没有截图无法做有质量的评审。

请提供截图（建议包含）：
- 默认状态（主界面，800px 视口高度内的首屏）
- 空态（无数据时）
- 主要操作流程截图

等收到截图后再继续。
```

**不得在没有截图的情况下继续执行。**

### 询问 3：激活哪些模块（多选）

AskUserQuestion：

> 这次要执行哪些评审模块？可以多选。
>
> A）**Module A — 视觉系统合规**（35%权重）
>    间距/排版/颜色/组件一致性/AI Slop 检测
>
> B）**Module B — 交互与可访问性**（40%权重）
>    Nielsen 10条 / Norman 7条 / WCAG 2.1 AA
>
> C）**Module C — CRM业务专项**（25%权重）
>    首屏字段可见性/高频操作路径/数据可信度/列表专项
>
> 选全部（A+B+C）综合评分才有意义。单选只产出该模块分数。

收到回答后，确认激活列表，告知执行顺序：
「将按顺序执行：{激活的模块}，每个模块完成后展示发现摘要，再继续下一个。」

---

## Phase 1：串行执行各模块

**每个模块必须等上一个完成后才开始。**

### 执行 Module A（用户选了 A）

用 Agent tool 调度：

```
读取 .claude/skills/office/ux-audit/specialists/module-a-visual.md 并按照其中的指令执行。

输入：
- 截图：{用户提供的截图}
- 设计规范参考：.claude/skills/office/references/design-system-contract.md

产出：写入 docs/evaluation/YYYY-MM-DD-<topic>-ux-audit-module-a.md
完成后返回：
  STATUS: DONE / BLOCKED
  Module A 得分：{N}/100
  AI Slop Score：{N}/100
  P0：{N}条 | P1：{N}条 | P2：{N}条
```

**【SM-02 修复】Agent 返回 BLOCKED 时的处理：**

```
如果 Agent 返回 STATUS: BLOCKED：
  展示阻塞原因给用户
  AskUserQuestion：
  > Module A 执行被阻塞：{原因}
  >
  > A）重试 — 我补充了缺失的信息
  > B）跳过 Module A — 继续执行其他已选模块，Module A 得分记为「未执行」
  > C）终止本次评审
```

等 Agent 返回 DONE 后，输出 Module A 摘要：

```
Module A 完成：得分 {N}/100，AI Slop {N}/100，P0 {N}条
```

**继续逻辑（明确分支）：**
- 用户还选了 B 或 C → **自动继续执行下一个模块，不询问**
- 用户只选了 A → **直接跳到 Phase 2 汇总**

---

### 执行 Module B（用户选了 B）

用 Agent tool 调度：

```
读取 .claude/skills/office/ux-audit/specialists/module-b-interaction.md 并按照其中的指令执行。

输入：
- 截图：{用户提供的截图}

产出：写入 docs/evaluation/YYYY-MM-DD-<topic>-ux-audit-module-b.md
完成后返回：
  STATUS: DONE / BLOCKED
  Module B 得分：{N}/100
  P0：{N}条 | P1：{N}条 | P2：{N}条
```

**Agent 返回 BLOCKED 时的处理（同 Module A）：**
```
展示阻塞原因，AskUserQuestion：重试 / 跳过 Module B / 终止
```

等 DONE 后展示摘要，自动继续 C（如果选了）。

---

### 执行 Module C（用户选了 C）

用 Agent tool 调度：

```
读取 .claude/skills/office/ux-audit/specialists/module-c-crm.md 并按照其中的指令执行。

输入：
- 截图：{用户提供的截图}
- CRM 业务标准：.claude/skills/office/references/crm-business-criteria.md（只读 §1.2-1.5）

产出：写入 docs/evaluation/YYYY-MM-DD-<topic>-ux-audit-module-c.md
完成后返回：
  STATUS: DONE / BLOCKED
  Module C 得分：{N}/100
  P0：{N}条 | P1：{N}条 | P2：{N}条
```

**Agent 返回 BLOCKED 时的处理（同 Module A）：**
```
展示阻塞原因，AskUserQuestion：重试 / 跳过 Module C / 终止
```

---

## Phase 2：汇总综合报告 + 更新状态

所选模块全部完成后，读取各模块产出文件，汇总写入主报告。

读取 SCHEMA.md 作为模版，写入：
`docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md`

**综合评分计算：**
- 只选了部分模块或有模块 BLOCKED 被跳过：只计算已执行模块的加权分，
  注明「不完整评分」
- 选了全部 A+B+C 且全部 DONE：综合评分 = A得分×35% + B得分×40% + C得分×25%

**未执行/被跳过的模块处理：**
在主报告对应模块位置写：
```
[本模块未执行 — 用户跳过 / Agent BLOCKED]
原因：{描述}
对综合评分的影响：此模块权重（{N}%）未计入，评分为不完整评分。
```

**场景C 专有：Baseline 记录节**

```markdown
## Baseline 记录（场景C）

综合 UX 得分：{N}/100（{完整/不完整评分}）
截图来源：{描述}
记录时间：{YYYY-MM-DD HH:MM}

⚠️ 改版后验收标准：综合得分提升 ≥10 分，且所有 P0 问题已解决。
```

**workflow-state 写入：**

Claude 在执行前确定实际 `_TOPIC` 和综合 UX 得分，然后执行：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
# 从已写入的主报告中读取综合得分
export _BASELINE=$(grep "综合 UX 得分\|综合.*得分" \
  "docs/evaluation/$(date +%Y-%m-%d)-${_TOPIC}-ux-audit.md" 2>/dev/null | \
  grep -o '[0-9]\+' | head -1 || echo "0")
export _NODE="ux-audit"
export _STATUS="DONE"
export _OUTPUT="docs/evaluation/$(date +%Y-%m-%d)-${_TOPIC}-ux-audit.md"
export _EXTRA_BASELINE="$_BASELINE"
# 写入状态（baseline_score 需手动追加）
python3 << PYEOF
import yaml, datetime, os
topic = os.environ.get('_TOPIC', 'unknown')
output = os.environ.get('_OUTPUT', '')
baseline = int(os.environ.get('_EXTRA_BASELINE', '0') or '0')
try:
    state = yaml.safe_load(open('.claude/workflow-state.yaml')) or {}
except:
    state = {}
state.setdefault('nodes', {})['ux-audit'] = {
    'status': 'DONE',
    'output': output,
    'completed_at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'baseline_score': baseline
}
state['last_updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
yaml.dump(state, open('.claude/workflow-state.yaml', 'w'), allow_unicode=True, default_flow_style=False)
print(f'workflow-state updated: ux-audit, baseline_score={baseline}')
PYEOF
```

**Handoff 写入：**

路径：`docs/handoff/YYYY-MM-DD-<topic>-ux-audit-handoff.md`
格式：遵循 `.claude/skills/office/references/handoff-protocol.md`

Handoff 必须包含：
- 决策：场景类型（B 优化参考 / C 改版基线）、执行模块、综合 UX 得分
- 约束：P0 问题必须在进入下游前由用户确认处理策略；场景C baseline 得分是改版验收基线
- 风险：P0 问题列表（≤3 条最高优先级）
- 产出路径：指向 ux-audit.md
- 场景C 额外：baseline_score = {N}/100

```bash
mkdir -p docs/handoff
```

---

## Phase 3：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/ux-audit 完成
场景：{B 优化参考 / C 改版基线}
执行模块：{A/B/C 已执行的}
综合 UX 得分：{N}/100（{完整/不完整评分}）
P0：{N}条 | P1：{N}条 | P2：{N}条
AI Slop Score：{N}/100（Module A 专有）

文件：docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 下一步？
>
> A）**/ux-brainstorm** — 基于评审问题生成设计方案（场景B推荐）
> B）**/ux-research** — 分析竞品的解决方案
> C）**/design-brief** — 直接进入设计决策
> D）**/html-prototype** — 按评审改版清单生成原型（场景C）
> E）先停这里

---

## ⚠️ 末尾核心约束

1. **场景询问不可跳过**
2. **截图是强制输入** — 没有截图必须主动管用户要，不能继续执行
3. **模块多选必须询问** — 不能假设用户要全部模块
4. **串行执行** — 一个模块完成后才开始下一个
5. **每个模块用 Agent tool 调度** — 读取 specialists/ 文件作为子 agent 指令
6. **主报告必须写入磁盘**
7. **场景C必须写 Baseline 记录节**

<!-- FILE_END: ux-audit/SKILL.md -->
