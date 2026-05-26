---
name: compare
description: |
  对比两个 skill 产出（或同一 skill 的两个版本），输出结构化差异分析。
  适用场景：两次 brainstorm 方案对比、两个 design-brief 对比、评审迭代前后对比。
allowed-tools: Read, Bash
context-cost: lightweight
---

# Compare Skill — 产出对比分析器

**职责：** 读取两个产出文件，提取关键决策/需求，输出结构化 diff。
**不修改任何文件。** 只读、只分析、只报告。

---

## 输入模式

```
模式 A（直接路径）: /compare <path1> <path2>
模式 B（skill 名称）: /compare <skill-name>         → 自动取该 skill 最新两个版本
模式 C（混合）:      /compare <path1> <skill-name>  → path1 与该 skill 最新版本对比
```

---

## Phase 0 — 解析输入，确定两个文件路径

```
IF 用户提供了两个完整路径 → 直接使用
IF 用户提供了 skill 名称：
  → bash scripts/history.sh <skill-name> | 取最新两个版本的路径
  → 如果只有一个版本 → 告知用户"该 skill 只有一个版本，无法对比"，终止
IF 路径不存在 → 告知用户具体哪个文件不存在，终止
```

---

## Phase 1 — 读取两个文件

```
Step 1  Read <path1>（完整读取，不截断）
Step 2  Read <path2>（完整读取，不截断）
Step 3  确认两个文件均为非空
```

---

## Phase 2 — 提取结构化内容

根据文件类型提取关键字段：

| 文件类型 | 提取内容 |
|---------|---------|
| PRD / brainstorm | 目标用户、核心功能列表（R-NNN）、假设条件、Outstanding Questions |
| UX 方案 / ux-brainstorm | 方案选项（A/B/C）、选型决策、交互约束 |
| Design Brief | 决策卡片（DEC-DXXX，ADOPTED/REJECTED）、组件映射、约束列表 |
| Tech Spec | 接口定义（IF-NNN）、需求覆盖率、MUST/PARTIAL 分类 |
| Task Plan | DEV-NNN 卡片列表、MVP 状态、Wave 分组 |
| Handoff | gate_result、关键决策摘要、约束列表 |
| 其他 | 提取所有 ## 二级标题及其下第一段内容 |

---

## Phase 3 — 生成差异报告

输出以下四个维度：

```markdown
## 对比报告: <file1-basename> vs <file2-basename>
生成时间: YYYY-MM-DD HH:MM

### 相同点（两个版本一致）
- <具体条目>

### 版本1 独有（<file1-basename>）
- <具体条目，附行号或 ID>

### 版本2 独有（<file2-basename>）
- <具体条目，附行号或 ID>

### 冲突点（两个版本对同一事项有不同表述）
| 事项 | 版本1 | 版本2 | 建议 |
|------|-------|-------|------|
| <条目> | <v1表述> | <v2表述> | <合并建议> |

### 结论建议
<一句话：哪个版本更完整，或如何合并两者的优点>
```

---

## Phase 4 — 写入产出文件

```bash
# 确保目录存在
mkdir -p docs/decisions/
```

```
输出路径: docs/decisions/YYYY-MM-DD-<topic>-compare-<skill>.md
（topic 来自 .claude/current-topic.txt，skill 来自文件名推断）
```

写入完成后告知用户产出路径。

---

<!-- FILE_END: compare/SKILL.md -->
