---
name: design-review
preamble-tier: 2
version: 1.0.0
description: |
  设计审查。两种模式：前置审查（设计决策完成后，原型生成前，发现结构性问题）；
  后置验收（原型/Figma 完成后，正式交付前，确认实现质量）。
  三场景均适用。来源：原始系统设计审查逻辑。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 2344
  runtime-estimate: 5000
  shared-refs: [ai-native-taste-anchors]
  recommended-model: guided-execution  # 基于规范审查
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1)
_PROTOTYPE=$(ls -t docs/prototype/*/index.html 2>/dev/null | head -1)
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "unknown")
echo "TOPIC: $_TOPIC"
echo "DECISION: ${_DECISION:-none}"
echo "PROTOTYPE: ${_PROTOTYPE:-none}"
echo "PRD: ${_PRD:-none}"
```

---

## Phase 0：模式确认

AskUserQuestion：

> 这次设计审查的模式是？
>
> A）**前置审查** — 设计决策完成，原型还没生成。
> 检查设计决策的结构性问题，避免原型做错了再改。
> B）**后置验收** — 原型（或 Figma）已完成。确认实现质量，准备交付。

---

## Phase 1A：前置审查（设计决策 → 原型之前）

**输入检查：**

```
□ 已读取 design-brief.md？
  → 否：BLOCKED — 前置审查需要设计决策文档
□ 已读取 PRD？
  → 否：BLOCKED — 需要 PRD 做对照
```

**审查维度（逐条执行）：**

### 1. 执行顺序合规性

```
□ design-brief.md 包含「原生AI深度思考小结」节？
□ 包含「假设挑战结论」节？
□ 包含「体验验证结论」节（含状态覆盖表）？
□ 包含「品味检查四锚点」节？
□ 包含「shadcn 组件映射表」节？
□ 包含「交接块」节？

任意缺失 → 标注 MISSING，说明下游 /html-prototype 会受到什么影响
```

### 2. 设计假设风险

读取「假设挑战结论」，评估：
```
□ 最脆弱的假设是否已标注「建议在哪个验证节点优先验证」？
□ 有 fallback 设计的假设，fallback 方案是否在组件映射表里有对应？
```

### 3. 组件映射表完整性

```
□ 映射表来源字段只有「shadcn」或「自绘」，无其他来源？
□ 每个交互元素（按钮/输入/表格/弹窗）都有映射？
□ 自绘区域有 Tailwind 类 + 颜色 + 间距说明？
□ 品牌色 #FF8000 的使用处已标注（全页 ≤3 处约束）？
```

### 4. PRD 对齐检查

```
□ 设计决策覆盖了所有 P0 用户故事？（逐条对照）
□ 设计范围与 PRD 设计范围字段一致（全新/局部/独立）？
□ 没有实现 PRD「不做什么」里的任何功能？
```

---

## Phase 1B：后置验收（原型/Figma 完成后）

**输入检查：**

```
□ 已读取 docs/prototype/{topic}/index.html？
  → 否：BLOCKED — 后置验收需要原型文件
□ 已读取 prototype-spec.md？
□ 已读取 design-brief.md？
□ 已读取 PRD？
```

**审查维度：**

### 1. 实现与决策一致性

```
对照 design-brief.md 的组件映射表：
□ 每个 shadcn 组件都在原型里有对应实现？
□ variant 使用正确（default/outline/ghost 等）？
□ 自绘区域与映射表说明的 Tailwind 类一致？
```

### 2. 品牌色应用

```
□ tailwind.config 里主色已覆盖为 #FF8000？
□ CSS 变量 :root 块存在且正确？
□ 全页品牌色使用 ≤3 处？
□ 主操作按钮使用品牌色？
```

### 3. 状态完整性（对照 design-brief 的状态覆盖表）

```
□ 默认态已实现？
□ 空态已实现（不是空白，有提示+引导）？
□ 加载态已实现或有说明为何 N/A？
□ 错误态已实现或有说明为何 N/A？
□ 成功态已实现或有说明为何 N/A？
```

### 4. Step 0 认知门禁产出

```
□ prototype-spec.md 的「设计意图」节已填写？
□ 用户处境描述具体（不是「用户要使用功能」这种层面）？
□ 空间结构和视线路径有明确规划？
```

### 5. 交接块完整性

```
□ prototype-spec.md 末尾有「交接块」节？
□ 交接块里的「下游不应该做的事」有具体说明？
```

---

## Phase 2：产出审查报告

```bash
mkdir -p docs/review
```

写入：`docs/review/YYYY-MM-DD-<topic>-design-review.md`

读取 SCHEMA.md 作为模版，填充各审查节内容。

```markdown
# 设计审查报告 — {功能名称}

审查时间：YYYY-MM-DD HH:MM
审查模式：{前置审查 / 后置验收}
场景：{A / B / C}
审查对象：{design-brief.md 路径 / prototype/index.html 路径}

## 审查结论

总体：{✅ 通过 / ❌ 未通过，N项问题}

### 通过项
- {检查项} ✅

### 问题项
- **[DR-001]** {检查项} ❌
  - 具体问题：{描述}
  - 影响：{对下游 skill 的影响}
  - 建议：{1句话修复方向}
```

**workflow-state 写入：**

Claude 在执行前确定实际 `_TOPIC` 和审查模式 `_MODE`（前置审查 或 后置验收），然后执行：

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
export _MODE="前置审查"   # ← Claude 在此处填入实际模式：前置审查 或 后置验收
export _NODE="design-review"
export _STATUS="DONE"
export _OUTPUT="docs/review/$(date +%Y-%m-%d)-${_TOPIC}-design-review.md"
python3 << PYEOF
import yaml, datetime, os
node = os.environ.get('_NODE', 'design-review')
status = os.environ.get('_STATUS', 'DONE')
output = os.environ.get('_OUTPUT', '')
mode = os.environ.get('_MODE', '')
try:
    state = yaml.safe_load(open('.claude/workflow-state.yaml')) or {}
except:
    state = {}
state.setdefault('nodes', {})[node] = {
    'status': status,
    'mode': mode,
    'output': output,
    'completed_at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
}
state['last_updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
yaml.dump(state, open('.claude/workflow-state.yaml', 'w'), allow_unicode=True, default_flow_style=False)
print(f'workflow-state updated: {node}, mode={mode}')
PYEOF
```

---

## Phase 3：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/design-review 完成
模式：{前置审查 / 后置验收}
结果：{✅ PASSED / ❌ FAILED（N项问题）}
文件：docs/review/YYYY-MM-DD-<topic>-design-review.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**如果 PASSED（前置审查）：**

AskUserQuestion：
> 设计决策审查通过，可以生成原型了。
>
> A）**/html-prototype** — 生成 HTML 原型
> B）先停这里

**如果 PASSED（后置验收）：**

AskUserQuestion：
> 原型质量审查通过。
>
> A）**/handoff-review** — 正式交付审查
> B）**/figma-layer** — 搭建 Figma 保险层
> C）先停这里

**如果 FAILED：**

AskUserQuestion：
> 发现 {N} 项问题，建议修复后重新运行设计审查。
>
> A）我去修复，修复后重新运行 /design-review
> B）记录问题，带着已知风险继续

---

## ⚠️ 末尾核心约束

1. **模式确认不可跳过** — 前置和后置逻辑完全不同
2. **前置审查必须有 design-brief.md** — 没有则 BLOCKED
3. **后置审查必须有 prototype/index.html** — 没有则 BLOCKED
4. **逐条检查** — 不得概括「基本符合」
5. **workflow-state 写入** — 完成后必须更新状态文件

<!-- FILE_END: design-review/SKILL.md -->
