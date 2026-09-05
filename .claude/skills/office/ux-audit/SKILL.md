---
name: ux-audit
preamble-tier: 2
version: 1.0.0
description: |
  页面UX评审。启动时询问：场景（优化参考B/改版基线C）+ 激活哪些模块（多选）。
  三个模块：A视觉层级与一致性（35%）/ B交互与可访问性（40%）/ C 业务领域专项（25%，可选，profile 定，默认 CRM）。
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
  shared-refs: [crm-business-criteria]
  recommended-model: guided-execution  # 基于framework评估
---

## Preamble (run first)

仅在 Project Gate 已验证本会话项目、输入及输出范围后执行下方项目 preamble。
NO_PIN 框架维护只读取本合同，不运行项目 preamble，不访问 docs/、workflow-state 或 current-topic
共享别名，也不执行 Phase 2 的项目写入。共享别名不能用于推断或修复项目绑定。

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_CONSTRAINTS=$(ls docs/prd/*-prd-constraints.md 2>/dev/null | head -1)
echo "CONSTRAINTS: ${_CONSTRAINTS:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py ux-audit "*" 2>/dev/null || true
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
> A）**Module A — 视觉层级与一致性**（35%权重）
>    分组/对齐/可读性/状态语义/构图与 AI Slop；有已验证外部规范时附合规比对
>
> B）**Module B — 交互与可访问性**（40%权重）
>    Nielsen 10条 / Norman 7条 / WCAG 2.1 AA
>
> C）**Module C — 业务领域专项**（25%权重，可选，仅业务类项目；默认 CRM profile）
>    首屏字段可见性/高频操作路径/数据可信度/列表专项
>
> 选全部（A+B+C）综合评分才有意义。单选只产出该模块分数。

收到回答后，确认激活列表，告知执行顺序：
「将按顺序执行：{激活的模块}，每个模块完成后展示发现摘要，再继续下一个。」

---

## Phase 1：串行执行各模块

**每个模块必须等上一个完成后才开始。**

模块输入统一附截图来源、页面状态与当前任务。位置可复用版本有效的 `page_id` / `region_id`；
没有目录记录时使用截图名称与局部描述，不要求先入库或采用参考页。
静态截图不能证明交互、键盘、焦点或替代文本，缺实际证据的项目保留为 UNKNOWN。

### 执行 Module A（用户选了 A）

用 Agent tool 调度：

```
读取 .claude/skills/office/ux-audit/specialists/module-a-visual.md 并按照其中的指令执行。

输入：
- 截图：{用户提供的截图}
- 当前任务与位置：{任务；有效 page_id/region_id 或截图局部位置}
- 外部设计规范（可选）：{真实工具来源、版本及适用页面；没有则 UNKNOWN，继续一般视觉评审}

产出：写入 docs/evaluation/YYYY-MM-DD-<topic>-ux-audit-module-a.md
完成后返回：
  STATUS: DONE / BLOCKED
  Module A 得分：{N}/100（完整/不完整评分）或 UNKNOWN
  外部规范合规：{实际比对结果与依据 / UNKNOWN}
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

等待真实用户选择后才重试、跳过或终止；没有回答不得自动跳过。本规则同样适用于 Module B/C。

等 Agent 返回 DONE 后，输出 Module A 摘要：

```
Module A 完成：得分 {N}/100（完整/不完整评分）或 UNKNOWN，AI Slop {N}/100，P0 {N}条
```

**继续逻辑（明确分支）：**
- 用户还选了 B 或 C → **自动继续执行下一个模块，不询问**
- 用户只选了 A → **直接跳到 Phase 2 汇总**

---

### 执行 Module B（用户选了 B）

用 Agent tool 调度：

```
读取 .claude/skills/office/ux-audit/specialists/module-b-interaction.md 并按照其中的指令执行。

**借鉴 GOMS/KLM 量化交互成本（Card-Moran-Newell）：** 对主任务流额外做一次操作子计数——标记每步 KLM 操作子（K 键击/点击 · P 指向 · M 心理准备 · H 换设备 · R 系统等待 · V 视觉确认），对比「当前方法 vs 建议方法」的操作子数与等待数，建议移除操作子/等待的最小改动（先数被移除的操作子与阻塞等待，不过拟合精确耗时）。把「当前 N 操作子 → 建议 N'（省 X）」写进交互发现。
当前操作和等待须有实际路径证据；截图测不到时记 UNKNOWN。建议方法的计数注明假设与待验证项，不能把推测写成已节省的操作、等待或时间。

输入：
- 截图：{用户提供的截图}
- 交互证据（如有）：{实际操作/键盘/焦点记录或当前实现的语义证据；缺少的检查记 UNKNOWN}

产出：写入 docs/evaluation/YYYY-MM-DD-<topic>-ux-audit-module-b.md
完成后返回：
  STATUS: DONE / BLOCKED
  Module B 得分：{N}/100（完整/不完整评分）或 UNKNOWN
  证据覆盖：{Nielsen / Norman / WCAG 已判定项、适用总数与 UNKNOWN 原因}
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
- 保留 A/B/C 权重 35%/40%/25%。选全部 A+B+C、全部 DONE 且每个模块的适用检查均有充分证据时：
  综合评分 = A得分×35% + B得分×40% + C得分×25%。模块 DONE 只表示报告完成，不自动表示证据完整。
- 只选部分模块、有模块被用户跳过、模块得分 UNKNOWN 或任一模块含未验证检查时，注明「不完整评分」。
  只纳入有可计算分数的模块，以「Σ(模块分×原权重) ÷ 纳入权重之和」归一化到100分，同时报告
  纳入模块、覆盖权重和各模块已判定/适用项数；UNKNOWN 不按0分或通过处理。
- 没有可计算模块时，综合 UX 得分写 UNKNOWN，不进行零分母计算，也不生成0分基线。
- 外部设计规范未提供只使该规范合规结论 UNKNOWN，不阻断一般 UX；一般 UX 覆盖与外部规范比对范围分开记录。

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
若不可计算：综合 UX 得分：UNKNOWN（缺少可判定证据）
截图来源：{描述}
覆盖范围：{模块、检查项、页面/状态、视口与证据类型；UNKNOWN/N/A 及原因}
记录时间：{YYYY-MM-DD HH:MM}

⚠️ 改版后验收标准：综合得分提升 ≥10 分，且所有 P0 问题已解决。
比较须使用相同模块、检查项、页面/状态范围与计分口径；不完整基线只能在相同覆盖范围重测，
不能靠补入或剔除检查项凑出10分，也不能宣称完整验收。UNKNOWN 基线须补证据后才能比较。
```

**workflow-state 写入：**

执行下方保留的写入块前，必须同时确认：已验证项目 pin、当前 workflow 确有本节点、输出与状态路径
属于同一已授权项目且真实可写、主报告已落盘，以及综合分数真实、完整、可计算。
不完整评分或 UNKNOWN 只记录在报告及 handoff，不运行该块，不把 UNKNOWN 塞成0或写成完整 DONE 基线。
下方旧块读取首个整数：实际解析值还须与报告分数完全一致；有小数、歧义或路径不符时停止该写入，
保留报告真实值并说明状态尚未同步，不截断或改分绕过。standalone 没有 workflow 节点时也不写状态。
条件成立后，Claude 确定实际 `_TOPIC` 和综合 UX 得分，再执行：

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
# _NODE/_STATUS 为 P7 契约标记；下方 python 块硬编码同义值（'ux-audit'/'DONE'），改这两行不影响实际写入
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
except Exception as e:
    # 解析失败绝不能落到 state={}：下面是整文件 yaml.dump 覆写，
    # 空字典会把 topic/scene 与其它全部节点一次性擦除（实测可复现）。
    # 失败时报错退出、保留原文件，由人工修复后重跑。
    import sys
    print(f'ERROR: workflow-state.yaml 解析失败，已放弃写入以免擦除既有状态: {e}', file=sys.stderr)
    sys.exit(1)
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
- 评分证据：完整/不完整评分、覆盖模块/检查项/状态、UNKNOWN 与原因；不可计算时 baseline_score 明确记 UNKNOWN。
- 位置与确认：各问题保留稳定 UX ID、严重性、截图证据、有效页/区域 ID 或局部位置、用户确认状态与修改/保留范围。

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
综合 UX 得分：{N}/100（{完整/不完整评分}）或 UNKNOWN
P0：{N}条 | P1：{N}条 | P2：{N}条
AI Slop Score：{N}/100（Module A 专有）

文件：docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

下游建议（按发现类型给一句）：文案/语言类 P0/P1 较多 → 建议 `/ux-writing`（产语言系统规范与改写；本 skill 只按启发式检出文案问题，不产文案规范）；交互/视觉类 → 场景 B/C 惯例走 `/design-brief`。

本次 UX 评审不执行 OD 写入或页面采用门。用户确认问题、修改/保留范围及改版意图后，可将
已确认问题正文作为 `$open-design` 的 UX 单点来源，沿同一页面交接合同进入 OD 或手动导出到
Claude Design，无需补跑 PRD。保留 UX ID、P0、状态与位置；采用参考及工具写入仍各自验证。

AskUserQuestion：

> 下一步？
>
> A）**/ux-brainstorm** — 基于评审问题生成设计方案（场景B推荐）
> B）**/ux-research** — 分析竞品的解决方案
> C）**/design-brief** — 直接进入设计决策
> D）**/open-design** — 将已确认的评审问题与改版范围交给外部设计工具（场景C）
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
