---
name: handoff-review
preamble-tier: 2
version: 1.1.0
description: |
  交付审查。启动时询问场景（A/C）+ 激活哪几节（多选，串行执行）。
  场景A/C三节可选：需求核查/原型质量核查/Figma一致性核查。
  场景B只有两节（自动隐藏 Figma 节）。每节用 Agent tool 调度对应
  specialists 文件执行。FAILED 且失败项全为机械可判定（oracle）时，弹给
  用户前自动定向修复一次（auto-revise-once，oracle-gated，含品味判断项
  则跳过交人）。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
context-cost:
  self: 4616
  runtime-estimate: 20000
  shared-refs: [none]
  recommended-model: core-execution  # 2026-07-10 交付验收升档；oracle环节按fable_whitelist P0
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
_PROTOTYPE=$(ls -t docs/prototype/*/index.html 2>/dev/null | head -1)
_FIGMA=$(ls -t docs/figma/*/figma-spec.md 2>/dev/null | head -1)
echo "PRD: ${_PRD:-none}"
echo "PROTOTYPE: ${_PROTOTYPE:-none}"
echo "FIGMA_SPEC: ${_FIGMA:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
```

---

## Phase 0：场景确认 + 节选择

### 询问 1：场景确认

AskUserQuestion：

> 这次 Handoff Review 对应哪个场景？
>
> A）**新功能设计**（场景A）— 三节可选：需求核查 / 原型质量 / Figma一致性
> B）**已有功能优化**（场景B）— 两节可选：需求核查 / 原型质量（无 Figma 层）
> C）**评审改版**（场景C）— 三节可选：需求核查 / 原型质量 / Figma一致性

### 询问 2：激活哪些节（多选）

**场景A/C 展示三节选项：**

AskUserQuestion：

> 选择要执行的审查节（可多选，将按顺序串行执行）：
>
> 1）**需求核查** — 对照 PRD，核查用户故事覆盖/优先级对齐/边界检查
>    来源：CLAUDE-pm.md Handoff Review 节
>
> 2）**原型质量核查** — P0流程走通/状态完整性/品牌色一致/设计范围吻合
>    来源：CLAUDE-prototype.md Task E
>
> 3）**Figma 一致性核查** — Figma层与HTML原型信息架构/组件完整性/品牌色覆盖
>    来源：CLAUDE-figma-layer.md Task G

**场景B 只展示两节选项（自动隐藏节3）：**

AskUserQuestion：

> 选择要执行的审查节（可多选）：
>
> 1）**需求核查** — 对照 PRD，核查用户故事覆盖/优先级对齐/边界检查
> 2）**原型质量核查** — P0流程走通/状态完整性/品牌色一致

确认激活列表，告知执行顺序：「将按顺序执行：节{1/2/3}，
每节完成后展示摘要，再继续。」

---

## Phase 1：串行执行各节

**每节必须等上一节完成后才开始。**

**【SM-03 修复】每节 Agent 返回 BLOCKED 时统一处理：**
```
展示阻塞原因，AskUserQuestion：
> 节{N}执行被阻塞：{原因}
>
> A）重试 — 我补充了缺失的信息
> B）跳过此节 — 继续执行其他已选节，本节标注「未执行」
> C）终止本次审查
```

### 执行节 1：需求核查

用 Agent tool 调度：

```
读取 .claude/skills/office/handoff-review/specialists/requirements-check.md 并按照其中的指令执行。

输入：
- PRD：{最新 PRD 文件路径}
- HTML 原型：{prototype/index.html 路径}

产出：写入交付审查文件的「需求核查」节
完成后返回：
  STATUS: DONE / BLOCKED
  通过：{N}条 | 未通过：{N}条
  关键问题：{如有，一句话描述}
```

等 DONE 后展示摘要，自动继续（如果用户还选了节2）。

---

### 执行节 2：原型质量核查

用 Agent tool 调度：

```
读取 .claude/skills/office/handoff-review/specialists/prototype-quality.md 并按照其中的指令执行。

输入：
- PRD：{PRD 文件路径}
- HTML 原型：{prototype/index.html 路径}
- prototype-spec.md：{prototype-spec.md 路径}

产出：写入交付审查文件的「原型质量核查」节
完成后返回：
  STATUS: DONE / BLOCKED
  通过：{N}条 | 未通过：{N}条（列出未通过的关键项）
```

等 DONE 后展示摘要，自动继续节3（如果选了）。

---

### 执行节 3：Figma 一致性核查（场景A/C 专有）

用 Agent tool 调度：

```
读取 .claude/skills/office/handoff-review/specialists/figma-consistency.md 并按照其中的指令执行。

输入：
- figma-spec.md：{figma-spec.md 路径}
- prototype-spec.md：{prototype-spec.md 路径}
- PRD：{PRD 文件路径}

产出：写入交付审查文件的「Figma 一致性核查」节
完成后返回：
  STATUS: DONE / BLOCKED
  通过：{N}条 | 未通过：{N}条
  差异记录：{如有}
```

---

## Phase 2：汇总写入审查文件 + 迭代计数 + 更新状态

所有选中的节执行完成后，汇总写入：
`docs/review/YYYY-MM-DD-<topic>-handoff-review.md`

读取 SCHEMA.md 作为模版，填充各节内容。

**【H-03 修复】未执行/被跳过的节处理：**
在主文件对应节位置写：
```
[本节未执行 — 用户未选择 / Agent BLOCKED 被跳过]
```
不留空白，不省略。

标注完成标记（仅已执行且 DONE 的节才标注）：
```
节1 完成标记：<!-- REQUIREMENTS_CHECK: COMPLETE -->
节2 完成标记：<!-- PROTOTYPE_QUALITY: COMPLETE -->
节3 完成标记：<!-- FIGMA_CONSISTENCY: COMPLETE -->
```

**通过判断：**
- 所有选中节全部通过 → 输出 `✅ HANDOFF REVIEW: PASSED`
- 任何节有未通过项 → 先执行下方 Phase 2.5（auto-revise-once），由它确定**最终结果**；
  仍 FAILED 才输出 `❌ HANDOFF REVIEW: FAILED`，列出需要修正的具体项

---

## Phase 2.5：失败时自动修复一次（auto-revise-once，oracle-gated）

> **仅当上方通过判断为 FAILED 时执行。** 目的：在弹给用户前，对**机械可判定**的
> 失败项自动尝试修复一次，把用户的活从「去改完再重跑我」降为「批准/否决这次修复」。
> **人仍在结尾裁决；本段绝不推进节点、绝不越权写状态。**

### ① 进闸判断（三条全满足才进入修复，缺一即跳过、直接走 Phase 3 交人）

1. **首次失败。** 读取当前迭代：
   ```bash
   _PRIOR_ITER=$(python3 -c "import yaml;print((yaml.safe_load(open('.claude/workflow-state.yaml')) or {}).get('iteration',0))" 2>/dev/null || echo 0)
   ```
   要求 `_PRIOR_ITER < 1`（本审查链首次失败；非首次直接跳过交人）。
2. **失败项全为节1/节2 的 oracle 型**（见下表）。**只要有一项是 taste 型、或任一失败项
   来自节3 Figma 一致性 → 跳过本段，直接走 Phase 3 人类提示**（节3 上游 figma-layer
   重生成较重，不在本最小试点内）。
3. **无 BLOCKED。** 任一 specialist 曾返回 BLOCKED → 跳过交人。

**oracle 型（机械可判，允许自动修复）vs taste 型（品味判断，必须交人）：**

| 检查项 | 类型 |
|---|---|
| 品牌色一致 / 品牌色覆盖（#FF8000 次数、--primary 设置） | **oracle** |
| 技术规范（Tailwind CDN/config、CSS 变量、间距合法值、JS 仅状态切换） | **oracle** |
| 状态完整性（空/加载/错误/成功态是否实现、空态非空白） | **oracle** |
| prototype-spec / 交接块 完整性（必填节是否存在） | **oracle** |
| 边界检查（PRD「不做什么」排除项是否出现） | **oracle** |
| 组件完整性 / 组件映射（清单项是否缺失） | **oracle** |
| 优先级对齐（P0 是否比 P1 视觉更突出） | **taste** |
| 成功标准对齐（上线能否达成指标） | **taste** |
| 需求覆盖 / P0 走通（若失败描述含「需猜测/绕道」等判断语） | **taste** |
| Figma UX 一致性（信息架构/视觉重心 是否一致）→ 节3 整体一律交人 | **taste** |

> **判定有歧义时一律按 taste 处理（保守优先，宁可交人）。**

### ② 单次修复（恰好一次，不循环）

1. 汇总所有 oracle 型失败项 + 各自 fix 建议，组成定向 diff 清单。
2. 用 Agent tool 派**上游 skill 定向重生成**（节2 失败 → html-prototype；需求/范围类 →
   design-brief）；prompt 只含失败清单与目标文件路径，**不附完整会话**。
3. **只重跑失败的那 1–2 个 specialist**（节1/节2），不整轮复审；用 Agent tool 调度对应
   `specialists/*.md`，输入同 Phase 1。
4. 重算通过判断：全部 oracle 项现在通过 → **最终结果改为 PASSED**（修复成功）；
   仍有未通过 → **最终结果保持 FAILED**（已尝试一次，记录之）。

### ③ fail-open（任一触发即原样跌回 Phase 3 人类提示，绝不二次循环）

- 进闸三条未全满足；
- 上游重生成或复检 Agent 返回 BLOCKED / 异常；
- 修复后仍未通过；
- 任何不确定。

### ④ 收口

把本段得到的**最终结果**（PASSED 或 FAILED）交给下方「迭代计数与 workflow-state 写入」
（在 `_RESULT` 填最终值）。**本段不自行写 workflow-state、不推进任何节点。**
记录本段是否执行过修复、跳过原因，供 Phase 3 告知用户。

---

**【H-04 修复】迭代计数与 workflow-state 写入：**

上方「通过判断」经 Phase 2.5（auto-revise-once）收口后，Claude 取**最终结果**
（PASSED 或 FAILED；若 Phase 2.5 修复成功则为 PASSED），然后执行：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
# _RESULT 由 Claude 根据上方通过判断结果设置：PASSED 或 FAILED
export _RESULT="PASSED"   # ← Claude 在此处填入实际结果
python3 << PYEOF
import yaml, datetime, os
topic = os.environ.get('_TOPIC', 'unknown')
result = os.environ.get('_RESULT', 'FAILED')
try:
    state = yaml.safe_load(open('.claude/workflow-state.yaml')) or {}
except:
    state = {}
current_iter = state.get('iteration', 0)
state['iteration'] = (current_iter + 1) if result == 'FAILED' else 0
state.setdefault('nodes', {})['handoff-review'] = {
    'status': 'DONE',
    'output': f"docs/review/{datetime.date.today().isoformat()}-{topic}-handoff-review.md",
    'completed_at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'result': result,
    'iteration': state['iteration']
}
state['last_updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
yaml.dump(state, open('.claude/workflow-state.yaml', 'w'), allow_unicode=True, default_flow_style=False)
print(f'result={result}, iteration={state["iteration"]}')
PYEOF
```

**【H-04 修复】连续失败 3 次告警：**
如果 `iteration ≥ 3`，在 FAILED 信息后额外输出：
```
⚠️ 已连续失败 {N} 次。

建议重新评估：
A）回到 /design-brief 调整设计方案
B）降低当前验收标准，接受已知问题，继续推进
C）暂停，等待更多用户反馈后再迭代
```

---

## Phase 3：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/handoff-review 完成
场景：{A / B / C}
执行节：{1/2/3 列出已执行的}
结果：{PASSED / FAILED}
文件：docs/review/YYYY-MM-DD-<topic>-handoff-review.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**如果 PASSED：**

AskUserQuestion：

> Handoff Review 通过。下一步？
>
> A）**/retro** — 设计决策复盘
> B）先停这里

**如果 FAILED：**

告知具体未通过的项，并注明 Phase 2.5 的处置：
- 若执行过自动修复仍未通过 → 「已自动尝试修复一次，仍有 {N} 项未通过」
- 若因含品味判断项 / 节3 / 非首次失败而跳过 → 「未自动修复（{含品味判断项 / 节3 / 非
  首次失败}，需人工），有 {N} 项未通过」

AskUserQuestion：

> 有 {N} 项未通过{；已自动尝试修复一次仍未通过 / ；含需人工判断项未自动修复}。
>
> A）修正后重新运行 /handoff-review
> B）记录问题，继续进行（接受已知风险）

---

## ⚠️ 末尾核心约束

1. **场景询问不可跳过**
2. **场景B自动隐藏节3** — 不展示 Figma 节选项
3. **节选择必须询问** — 不默认全选
4. **串行执行** — 每节完成后才开始下一节
5. **每节用 Agent tool 调度** — 读取 specialists/ 文件
6. **完成标记必须写入** — 每节末尾的 HTML 注释标记不可省略
7. **主审查文件必须写入磁盘**
8. **auto-revise-once 是 oracle-gated 的人在环辅助** — 仅对节1/节2 的机械可判定失败项、
   且 `iteration < 1`（首次失败）、且无 BLOCKED 时触发；含任一 taste 项或节3 失败一律
   跳过交人；恰好修复一次绝不二次循环；歧义按 taste 处理；本段绝不推进节点、绝不越权写
   `result: PASSED`，最终裁决仍归用户

<!-- FILE_END: handoff-review/SKILL.md -->
