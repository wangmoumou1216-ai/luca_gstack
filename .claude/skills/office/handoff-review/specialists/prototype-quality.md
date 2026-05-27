---
name: prototype-quality
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
echo "AGENT: prototype-quality"
```

---

# 原型质量核查

**来源：CLAUDE-prototype.md Task E「Handoff Review A-check」节，直接迁移**

你是设计工程师视角的审查员。评估 HTML 原型的实现质量。
不评估需求覆盖（那是节1的职责）。只评估「原型质量是否达到交付标准」。

---

## 执行前

读取以下文件：
1. PRD 文件（P0 用户故事 + 设计范围字段）
2. HTML 原型（index.html，必须读实际代码）
3. prototype-spec.md（设计意图 + shadcn 组件清单 + 未实现项）

---

## 检查项（来自 CLAUDE-prototype.md Task E，逐条执行）

### P0 用户故事覆盖

PRD 中所有 P0 用户故事，逐条在 HTML 原型里走通：

| P0 用户故事 | 能走通 | 说明 |
|------------|--------|------|
| P0-001 | ✅ 能 / ❌ 不能 | {说明} |

**判断标准：**「走通」= 交互路径完整，不需要 mock 数据或想象缺失状态。

---

### 状态完整性

| 状态 | 是否实现 | 实现方式 |
|------|--------|---------|
| 默认态 | ✅ / ❌ | {描述} |
| 空态 | ✅ / ❌ / N/A | {描述，空态不能是空白} |
| 加载态 | ✅ / ❌ / N/A | {skeleton 或 loading indicator} |
| 错误态 | ✅ / ❌ / N/A | {错误提示 + 重试操作} |
| 成功态 | ✅ / ❌ / N/A | {操作成功反馈} |

空态缺失（显示空白）→ **未通过**

---

### 设计范围吻合

```
PRD 设计范围字段：{全新页面/局部改动/独立组件}
HTML 原型实现方式：{描述}
一致：{是 / 否：说明偏差}
```

---

### 品牌色一致

```
检查：所有主操作按钮/主强调元素是否使用 #FF8000
主色使用次数：{N} 次（应 ≤ 3 次）
tailwind.config 覆盖：{已写入 / 缺失}
CSS 变量覆盖：{已写入 / 缺失}
```

发现主色缺失或超过 3 次 → **未通过**

---

### 技术规范检查

```
□ Tailwind CDN 引入正确
□ tailwind.config 主色覆盖存在
□ CSS 变量 :root 块存在
□ 间距只使用合法值（4/8/12/16/24/32/40px 对应的 Tailwind class）
□ JS 只用于交互状态切换
```

---

### prototype-spec.md 完整性

```
□ 设计意图节（用户处境 + 空间结构 + 视觉重心）已填写
□ 页面列表已填写
□ shadcn 组件清单已填写
□ 交接块节存在且内容完整
```

交接块缺失 → **未通过**

---

## 产出

将检查结果写入 `docs/review/YYYY-MM-DD-<topic>-handoff-review.md` 的「原型质量核查」
节，末尾标注：
`<!-- PROTOTYPE_QUALITY: COMPLETE -->`

最后输出：
```
STATUS: DONE
通过：{N}条 | 未通过：{N}条
关键问题：{如有，列出未通过项}
```
