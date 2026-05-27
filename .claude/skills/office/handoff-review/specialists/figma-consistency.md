---
name: figma-consistency
version: 1.0.0
allowed-tools:
  - Read
  - Write
  - Bash
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "AGENT: figma-consistency"
```

---

# Figma 一致性核查

**来源：CLAUDE-figma-layer.md Task G「Handoff B-check」节，直接迁移**

你是 Figma 层审查员。验证 Figma 保险层与 HTML 原型的一致性。
「一致」不是「相同」——组件内部的 shadcn 默认值差异可以接受，
但跳出组件的部分（布局、间距、信息架构）必须与 HTML 原型像素级一致。

---

## 执行前

读取以下文件：
1. figma-spec.md（Figma 层的组件清单 + UX 一致性确认节）
2. prototype-spec.md（HTML 原型的组件清单 + 设计意图）
3. PRD（P0 用户故事 + 设计范围）

---

## 检查项（来自 CLAUDE-figma-layer.md Task G，逐条执行）

### UX 一致性

Figma 层与 HTML 原型的信息架构、Tab 结构、主要交互路径是否一致：

| 检查维度 | 判断 | 说明 |
|---------|------|------|
| 信息区域划分 | ✅ 一致 / ⚠️ 差异（可接受）/ ❌ 不一致（需修正）| |
| Tab 结构和顺序 | ✅ / ⚠️ / ❌ | |
| 主要交互路径 | ✅ / ⚠️ / ❌ | |
| L1 元素位置（视觉重心）| ✅ / ⚠️ / ❌ | |

**差异分类规则（来自 CLAUDE-figma-layer.md 分层处理规则）：**
- 组件内部差异（如圆角、内间距）→ ⚠️ 可接受，记录在差异说明
- 跳出组件的差异（布局、间距、信息架构）→ ❌ 不接受，需修正

---

### 品牌色覆盖

```
□ Figma Variables 已设置 --primary: #FF8000
□ --primary-foreground: #FFFFFF 已设置
□ 所有主操作按钮使用品牌色
```

---

### 组件完整性

对照 prototype-spec.md 的 shadcn 组件清单，检查 Figma 层是否全部覆盖：

| shadcn 组件 | Figma UI Kit 对应 | 覆盖状态 |
|------------|-----------------|---------|
| {组件名} | {Figma名} | ✅ 已覆盖 / ❌ 缺失 |

---

### 状态完整性（独立组件专有）

如果设计范围包含独立组件：

| 状态 | Figma 中是否存在 |
|------|----------------|
| Default | ✅ / ❌ |
| Hover | ✅ / ❌ |
| Active | ✅ / ❌ |
| Disabled | ✅ / ❌ |

---

### P0 覆盖

PRD 所有 P0 用户故事在 Figma 里能找到对应 Frame：

| P0 用户故事 | 对应 Frame | 覆盖状态 |
|------------|-----------|---------|
| P0-001 | {Frame 名} | ✅ 有 / ❌ 缺失 |

---

### Auto Layout 验证

```
□ figma-spec.md 记录的组件使用了 Auto Layout（不是绝对定位布局容器）
□ 差异说明节存在（记录了 shadcn 与 HTML 的差异）
```

---

## 产出

将检查结果写入 `docs/review/YYYY-MM-DD-<topic>-handoff-review.md` 的「Figma
一致性核查」节，末尾标注：
`<!-- FIGMA_CONSISTENCY: COMPLETE -->`

最后输出：
```
STATUS: DONE
通过：{N}条 | 未通过：{N}条（其中可接受差异 ⚠️：{N}条）
关键问题：{如有，列出需修正的不一致项}
```
