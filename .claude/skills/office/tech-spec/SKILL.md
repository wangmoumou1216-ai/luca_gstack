---
name: tech-spec
preamble-tier: 2
version: 1.0.0
description: |
  工程规格节点。把 PRD + design-brief → 技术合同。
  强制验证所有 MUST 级需求的覆盖率，不允许静默跳过。
  产出：docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 9530  # 实测字节数 wc -c，统一口径 2026-07-04（G5；原字符串 medium 与其余 skill 结构不一致）
  runtime-estimate: 15000
---

## Preamble（每次调用时执行）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH | SESSION: $_SESSION_ID"
# 找最新的 design-brief handoff
_HANDOFF=$(ls docs/handoff/*design-brief-handoff.md 2>/dev/null | sort | tail -1)
echo "DESIGN_BRIEF_HANDOFF: ${_HANDOFF:-NOT FOUND}"
# 找最新的 PRD
_PRD=$(ls docs/prd/*prd.md 2>/dev/null | sort | tail -1)
echo "PRD: ${_PRD:-NOT FOUND}"
python3 .claude/observability/scripts/get_rules.py tech-spec "*" 2>/dev/null || true
```

---

## 角色声明

你是一名 Staff 工程师，负责把产品和设计意图转化为工程实现合同。
你的输出是下游 task-plan 和开发 agent 的唯一工程权威来源。
你不做 UI 设计，不做原型，不做 PRD 内容扩充。

---

## 执行顺序锁定

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5（门禁）→ Phase 6（输出）

**不允许跳过任何 Phase。Phase 5 门禁未通过不允许进入 Phase 6。**

---

## Phase 0：输入加载（懒加载）

**目标**：用最小 context 建立上游全景，不读全文。

执行步骤：
1. 读取 `docs/handoff/` 中最新的 `*design-brief-handoff.md`（< 2000 tokens，标准 handoff 格式）
2. 读取 `docs/handoff/` 中最新的 `*brainstorm-handoff.md`（如存在）
3. 读取 `docs/prd/` 中最新 PRD 文件的前 60 行（确认 R-series 和 AE-series 编号范围）；并定向读取其末尾 `## Outstanding Questions → Deferred to Planning` 子节（上游合法放行、延后到本阶段答的开放问题，不在前 60 行内）。把每条 Deferred 项带入本 spec 风险节，并在 Phase 6 handoff 的「待澄清」节传递给下游——未解决前不得据此做隐式假设。
4. 如存在 `*prd-ai-spec.md`，读取其前 60 行（确认 Agent 边界）
5. 从 design-brief 正文定向读取以下节，不读全文：
   - `设计决策清单`
   - `体验验证结论` / 状态覆盖表
   - `shadcn 组件映射表`
   - `可追踪完整矩阵`
6. **不读全文**。如需要具体条款，按需读取对应章节。

如果 PRD 不存在或没有 R-series / AE-series 编号：

```
⛔ BLOCKED — tech-spec 需要正式 PRD 作为需求追踪源。
缺少 R/AE 编号时不得直接从 research 或 design-brief 编造需求。
请先补 PRD，再运行 /tech-spec。
```

**确认输出**（打印，不需要用户确认）：
```
✓ design-brief handoff: [路径]
✓ design-brief traceability sections: 决策 N 条，状态 N 条，映射 N 条
✓ PRD: [路径]，需求编号范围: R1-RN, AE1-AEM
✓ AI Spec: [路径 或 NONE]
```

---

## Phase 1：上游冲突解析

**目标**：建立 Conflict Register，明确 MVP 中哪一方意图优先。

格式（表格，每行一条冲突）：

| 冲突编号 | 冲突描述 | 来源 A | 来源 B | MVP 裁决 | 裁决理由 |
|---------|---------|-------|-------|---------|---------|
| C-001 | ... | PRD R7 | UX Brainstorm | 以 B 为准 | 更晚的决策 |

**规则**：
- 只记录真实存在的冲突，不凭空构造
- 如无冲突，写「无需裁决」并继续
- 每条裁决必须有理由，不允许写「以设计为准」这种空话

---

## Phase 2：系统架构视图

**目标**：描述系统的构建块、运行时视图和技术约束。参考 arc42 框架。

必须包含：

### 2.1 技术栈约束
列出技术栈（来自 PRD/上游），标注哪些是 MUST（不可更改）、哪些是建议。

### 2.2 数据模型
核心实体及其字段、关系。用简洁表格或伪代码，不用 ER 图。
每个实体标注来源（哪条 PRD 需求驱动）。

### 2.3 组件树
系统的主要模块/组件，层级结构，责任边界。
标注哪些组件是 MVP MUST，哪些是 DEFERRED。

### 2.4 服务边界
模块间接口边界（哪个模块调用哪个，数据流方向）。
用列表，不用复杂图。

---

## Phase 3：接口合同

**目标**：为每个核心组件定义可执行的接口契约。

每个接口条目格式：
```
接口 ID: IF-NNN
组件: <组件名>
函数/方法: <签名>
输入: <参数类型>
输出: <返回类型>
错误处理: <异常类型和降级行为>
来源需求: <R-NNN 或 AE-NNN>
MVP 状态: MUST | PARTIAL | DEFERRED
```

**规则**：
- 不需要写完整代码，但必须精确到类型和降级行为
- DEFERRED 接口只需写 reserve 注释，不需要完整定义
- 每个接口必须绑定来源需求 ID
- UI 组件合同使用 `CMP-NNN`，必须绑定来源需求 ID 和 Design Decision / State

---

## Phase 4：需求 + 设计追踪矩阵

**目标**：把所有 PRD 需求（R-series + AE-series）映射到 design-brief 决策、
tech section、接口/组件合同和测试准则。

格式（表格）：

| 需求 ID | 需求描述（摘要） | Design Decision / State | Tech Section | 接口/组件 ID | MVP 状态 | 测试准则（可执行）|
|--------|--------------|-------------------------|-------------|--------------|---------|----------------|
| R1 | 离线检索笔记内容 | D-001 / STATE-default | 2.3 检索组件 | IF-001 | MUST | 给定查询词 X，返回结果列表且 latency < 200ms |
| AE1 | 用户可看到来源笔记 | D-003 / STATE-success | 2.3 / 3.2 | CMP-003 | MUST | UI 显示 N≥1 来源链接，点击可跳转 |

**规则**：
- 每行的「测试准则」必须是具体可执行的断言，不允许写「功能正常」
- DEFERRED 需求也要列出，测试准则写「DEFERRED — 不在 MVP 验收范围」
- 每个 MUST 需求必须绑定至少一个 Design Decision 或 State
- 纯 UI 需求可以绑定组件 ID（CMP-NNN），不强行伪造 API 接口
- 追踪矩阵是 Phase 5 门禁的输入

---

## Phase 5：覆盖率质量门禁 ⚠️

**这是本 skill 的核心门禁。不通过不允许进入 Phase 6。**

执行步骤：

**Step 5.1** — 列出所有 MUST 级需求 ID。**来源是上游 PRD（`docs/prd/` 的需求清单），不是 Phase 4 矩阵自身。**（PRD 需求清单本身只标 Type/Confidence，MUST 集合由 PRD 的 In scope / MVP 优先级节圈定。）逐条 PRD MUST 需求核对它是否出现在 Phase 4 矩阵里：若某条 PRD MUST 在矩阵中缺失（需求中途被悄悄丢了），直接判 GATE FAIL，不允许「矩阵里没有就当它不存在」。这道反向核对（PRD 源 → 矩阵）补的是纵向覆盖率查不到的横向漂移。

**Step 5.2** — 逐条检查：
```
对于每个 MUST 需求 R-NNN / AE-NNN：
  ✓ 有对应 Design Decision 或 State？
  ✓ 有对应 Tech Section？
  ✓ 有对应接口 ID（IF-NNN）或组件 ID（CMP-NNN）？
  ✓ 测试准则是具体可执行的断言（不模糊）？
```

**Step 5.3** — 判断结果：

如有任何未通过项：
```
⛔ GATE FAIL — 以下 MUST 需求未完全覆盖：
  - R-NNN: 缺少 [Design Decision/State | Tech Section | 接口/组件 ID | 可执行测试准则]
  - ...
→ 返回 Phase 2/3/4 修正，然后重新执行 Phase 5
```

全部通过：
```
✅ COVERAGE GATE PASS
   MUST 需求总数: N
   全部有 Design Decision/State + Tech Section + 接口/组件 ID + 可执行测试准则
   继续 Phase 6
```

**严禁静默通过。严禁把 FAIL 项标记为「后续补充」。**

---

## Phase 6：输出文件 + Handoff

### 6.1 写入产出文件

路径：`docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md`

文件必须包含以下节（节名锁定，不得改动）：
```
# Tech Spec — <topic>
## 1. Spec Purpose（上游文档索引 + 本文件定位）
## 2. Upstream Conflict Register
## 3. Architecture View
   ### 3.1 技术栈约束
   ### 3.2 数据模型
   ### 3.3 组件树
   ### 3.4 服务边界
## 4. Interface Contracts
## 5. Requirement Traceability Matrix
## 6. Coverage Gate Result（PASS + 统计数字）
```

### 6.2 写入 Handoff 文件

路径：`docs/handoff/YYYY-MM-DD-<topic>-tech-spec-handoff.md`
格式：遵循 `.claude/skills/office/references/handoff-protocol.md`

Handoff 必须包含：
- 决策：架构选型、关键技术约束（≤8 条，每条 ≤100 字）
- 约束：什么不在 tech-spec 范围内，下游 task-plan 必须遵守什么
- 风险：已知实现风险（≤3 条）
- 产出路径：指向 tech-spec.md
- AI Native 判断：哪些接口涉及 AI Agent，边界如何

### 6.3 Completion Status

```
DONE: tech-spec
  产出: docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md
  Handoff: docs/handoff/YYYY-MM-DD-<topic>-tech-spec-handoff.md
  Gate: COVERAGE GATE PASS（MUST N/N，Design Mapping N/N）
  下游建议: /task-plan
```

---

## 核心约束（不可违反）

1. Phase 5 门禁 FAIL → 必须修正，不允许跳过或静默通过
2. 追踪矩阵每行必须绑定真实的需求 ID，不允许伪造
3. MUST 需求必须绑定 Design Decision 或 State，不允许只写 PRD→Tech 跳过设计层
4. 测试准则必须具体可执行，不允许写「功能正常」「用户满意」
5. 不读取 Obsidian Vault（只读）
6. 不修改 PRD、design-brief、UX 相关文件
7. tech-spec 是工程合同，不是设计文档；不得包含 UI 布局描述

<!-- FILE_END: tech-spec/SKILL.md -->
