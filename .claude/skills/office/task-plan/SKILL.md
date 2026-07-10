---
name: task-plan
preamble-tier: 2
version: 1.0.1
description: |
  任务编排计划节点。把所有上游产物（PRD + design-brief + tech-spec）
  转化为渐进式索引 + 断言矩阵 + 开发/测试任务卡。
  是后续所有执行 agent 的「执行圣经」入口。
  产出：docs/engineering/YYYY-MM-DD-<topic>-task-plan.md
  v1.0.1（2026-07-02，fork内）：任务卡加"依赖任务"结构化字段（Task ID列表），
  从自由文本"输入"里拆出，为后续可能的依赖分析/并发执行判断做零成本铺垫。
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 12240  # 实测字节数 wc -c，统一口径 2026-07-04（G5；原字符串 medium 与其余 skill 结构不一致）
  runtime-estimate: 15000
  recommended-model: core-execution  # 2026-07-10 新增声明：任务编排计划=承重执行档（此前静默吃默认档）
---

## Preamble（每次调用时执行）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH | SESSION: $_SESSION_ID"
# 找最新 tech-spec handoff
_TS_HANDOFF=$(ls docs/handoff/*tech-spec-handoff.md 2>/dev/null | sort | tail -1)
echo "TECH_SPEC_HANDOFF: ${_TS_HANDOFF:-NOT FOUND}"
# 找最新 tech-spec 文件
_TS=$(ls docs/engineering/*tech-spec.md 2>/dev/null | sort | tail -1)
echo "TECH_SPEC: ${_TS:-NOT FOUND}"
```

---

## 角色声明

你是一名 Tech Lead，负责把工程规格拆解为可执行的任务编排计划。
你的输出是开发 agent 和测试 agent 的唯一任务分配来源。
你不做架构设计，不做 UI 设计，不修改上游文档。

---

## ⚠️ 硬规则（执行前必须声明）

**在开始任何 Phase 之前，打印以下规则：**

```
硬规则（本文件强制执行）：
1. Task 描述不允许模糊。「实现某模块」→ FAIL。必须说明输入/输出/边界。
2. 不允许任何 MUST 需求没有对应 dev task。
3. 不允许开发 task 自评质量。每个 dev task 必须有独立的测试 task。
4. 质量门禁未通过不允许写文件。必须循环修正直到 PASS。
5. task-plan PASS 后，才允许分配执行 agent。
```

---

## 执行顺序锁定

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase
7（门禁）→ Phase 8（输出）

**不允许跳过任何 Phase。Phase 7 门禁未通过不允许进入 Phase 8。**

---

## Phase 0：确认输入存在

检查以下文件是否存在：
- `docs/handoff/*tech-spec-handoff.md` — **必须存在**，否则终止并提示先运行 `/tech-spec`
- `docs/handoff/*design-brief-handoff.md` — **必须存在**，否则终止并提示先运行 `/design-brief`

如 tech-spec handoff 不存在：
```
⛔ 缺少 tech-spec handoff。
请先运行 /tech-spec 生成工程规格，再运行 /task-plan。
```

如 design-brief handoff 不存在：
```
⛔ 缺少 design-brief handoff。
task-plan 需要设计决策和状态来源，不能只按 tech-spec 拆开发任务。
请先运行 /design-brief，再运行 /tech-spec 和 /task-plan。
```

---

## Phase 1：输入加载（懒加载）

**读取顺序（只读 handoff summary，不读全文）：**

1. `docs/handoff/*tech-spec-handoff.md`（完整读取，< 2000 tokens）
2. `docs/handoff/*design-brief-handoff.md`（完整读取）
3. `docs/engineering/*tech-spec.md` 的第 5 节「Requirement Traceability Matrix」（只读这一节）
4. 如果 design-brief handoff 指向“可追踪完整矩阵”，读取该矩阵所在节；不读全文

**不读取**：PRD 全文、UX 文档全文、design-brief 全文。

**确认输出**（打印）：
```
✓ tech-spec handoff: [路径]
✓ design-brief handoff: [路径]
✓ Traceability Matrix: MUST 需求 N 条，AE N 条，Design Mapping N 条
```

---

## Phase 2：L0 Executive Index（渐进式披露索引）

**目标**：让每种 agent 知道应该读什么、不应该读什么。

输出格式（表格）：

| Agent 类型 | 第一读 | 再读（按需） | 不读（除非冲突） |
|----------|-------|-----------|--------------|
| Dev WA（开发工作 Agent）| 本文件 + 分配的 task card | 任务卡「读取清单」中的指定节（定向读，不读全文） | 任何文档全文；只读「读取清单」指定节 |
| Test WA（测试工作 Agent）| 本文件 + 对应断言 ID | tech-spec §5 追踪矩阵 | 设计文档全文 |
| Quality Gate Agent | 本文件 + task completion report | 被引用的断言 ID | 所有上游全文 |
| Recovery Agent | 本文件 + checkpoint | 失败 task card + 失败断言 | 所有上游全文（仅冲突未解决时） |

---

## Phase 3：L1 Source Document Index

**目标**：为所有上游文档建立索引，让 agent 知道每个文档「何时该读、读哪节」。

输出格式（表格）：

| Source ID | 文档路径 | 用途 | 正常使用时机 | 不读时机 |
|----------|--------|------|------------|--------|
| SRC-PRD | docs/prd/... | 产品需求 R/AE | 需求冲突或追踪失败时 | 正常开发时 |
| SRC-TS | docs/engineering/...-tech-spec.md | 架构/接口/矩阵 | 所有开发任务必读对应节 | 不需整体读 |
| SRC-DB | docs/decisions/...-design-brief.md | UI 状态/组件/可追踪矩阵 | UI 相关 task 读 §6 组件映射和可追踪矩阵指定节 | 非 UI task 不读 |
| SRC-HO | docs/handoff/... | 决策摘要/约束/风险 | 每个 task 开始前确认约束 | 任务执行中途 |

---

## Phase 4：L2 Node Index

**目标**：把所有上游需求、交互状态、设计决策转化为可引用节点。

### 4.1 需求节点（R-series + AE-series）

| Node ID | 来源 ID | 描述摘要 | MVP 状态 | 关联 tech section |
|--------|--------|---------|---------|----------------|
| REQ-R01 | SRC-PRD §R1 | ... | MUST | TS §3.3, IF-001 |

### 4.2 交互状态节点（来自 interaction architecture / design-brief）

| Node ID | 来源 ID | 状态描述 | MVP 状态 | 关联 UI 组件 |
|--------|--------|---------|---------|------------|
| STATE-S0 | SRC-IA §S0 | 空队列状态 | MUST | 卡片组件 |

### 4.3 设计决策节点（来自 design-brief D-series）

| Node ID | 来源 ID | 决策描述 | 对开发的约束 |
|--------|--------|---------|------------|
| DEC-D001 | SRC-DB §D-001 | 3 按钮评分 | 不允许实现 4 按钮；必须映射到 FSRS |

### 4.4 覆盖约束

规则：
- tech-spec Traceability Matrix 中每个 MUST 级 R/AE 必须生成 REQ 节点。
- design-brief 中每个进入 MVP 的 D-series 必须生成 DEC 节点。
- design-brief 中每个“是否需要单独设计 = 是”的状态必须生成 STATE 节点。
- DEFERRED / REMOVED 不生成开发任务，但必须保留在 Source Index 中，防止被复活。

---

## Phase 5：Assertion Matrix（断言矩阵）

**目标**：为每个 MUST 级 REQ / STATE / DEC 节点写可执行断言。

每条断言格式：
```
断言 ID: ASSERT-NNN
绑定节点: REQ-RXX 或 STATE-SXX 或 DEC-DXXX
断言描述: 给定 [前置条件]，执行 [操作]，结果必须是 [具体可验证结果]
测试方法: unit | integration | e2e | manual
Pass 准则: [具体数值/状态/输出，不允许写「正常运行」]
```

**规则**：
- 断言描述必须包含「给定/执行/结果」三段
- Pass 准则必须是可以被代码或人工明确判断 true/false 的陈述
- 模糊断言（「用户体验好」「功能正常」）→ 写完后进入 Phase 7 会 FAIL

---

## Phase 6：Task Cards 展开

### 6.1 开发任务卡（Dev Tasks）

每张卡格式：
```
Task ID: DEV-NNN
标题: <具体动词 + 具体对象>（不允许写「实现XXX模块」）
来源节点: REQ-RXX, STATE-SXX, DEC-DXXX（至少一个）
Tech Section: TS §X.X（必须绑定）
接口 ID: IF-NNN（如适用）
读取清单:
  - <文档路径> §<节号>（来自 <Node ID>）
  从 Phase 4 L2 Node Index 的「来源 ID」字段推导；每个来源节点必须有对应条目；不允许为空
输入: <明确的前置条件>
依赖任务: <本卡片实际依赖的 Task ID 列表，逗号分隔，如 "DEV-001, DEV-003"；无依赖写 "无"> ← 2026-07-02 补，
  从自由文本"前置条件或依赖"里拆出的结构化字段（红队裁定：先做这个零成本结构化，暂不建自动依赖图/并发分组算法——
  那个要等真有下游消费者读取这些依赖去调度执行、或真出现过因文本依赖描述不清导致的顺序错误，再建）
输出物: <具体文件、函数、API 端点、UI 组件>
验收准则: <与 ASSERT-NNN 绑定，不允许自评>
绑定断言: ASSERT-NNN（≥1 个）
MVP 状态: MUST | PARTIAL
估算规模: S（< 4h）| M（4-8h）| L（> 8h）
```

**Task 标题规范**：
- ✅ 「实现 ChromaDB node 的 FSRS 字段 schema 和写入接口」
- ✅「构建 Indexing Agent 的 folder→tag 映射逻辑（folder_tag_vector_graph 策略）」
- ❌ 「实现索引模块」（太模糊 → Phase 7 会 FAIL）

### 6.2 测试任务卡（Test Tasks）

每张卡格式：
```
Task ID: TEST-NNN
绑定 Dev Task: DEV-NNN
绑定断言: ASSERT-NNN（≥1 个）
测试类型: unit | integration | e2e | manual
测试描述: <具体测试步骤>
Pass 准则: <与断言 Pass 准则一致>
执行时机: DEV-NNN 完成后立即执行
```

**规则**：每个 MUST 级 Dev Task 必须有 ≥1 个对应 Test Task。

---

## Phase 7：覆盖率质量门禁 ⚠️

**这是本 skill 的核心门禁。不通过不允许进入 Phase 8。**

**Step 7.1** — 枚举所有 MUST 级需求节点

**Step 7.2** — 逐条检查：
```
对于每个 MUST 需求节点 REQ-RXX：
  ✓ 有对应 DEV task（绑定该节点）？
  ✓ DEV task 标题具体（不模糊）？
  ✓ DEV task 有绑定 ASSERT-NNN？
  ✓ 有对应 TEST task（绑定同一 ASSERT）？
  ✓ 断言 Pass 准则可执行（不模糊）？
  ✓ DEV task 的「读取清单」非空？
  ✓ 每个来源节点（REQ/STATE/DEC）在「读取清单」中都有对应条目？

对于每个 MVP 设计决策节点 DEC-DXXX：
  ✓ 有对应 DEV task 或被某个 DEV task 作为来源节点绑定？
  ✓ 有对应 ASSERT-NNN 验证该决策没有被丢失？

对于每个必须单独设计的 STATE-SXX：
  ✓ 有对应 DEV task 实现状态？
  ✓ 有对应 TEST task 验证状态可见或可切换？
```

**Step 7.3** — 判断结果：

如有任何未通过项：
```
⛔ TASK PLAN GATE FAIL — 以下问题必须修正：

未覆盖需求：
  - REQ-RXX: 缺少 dev task
  - REQ-RXX: dev task 标题模糊

缺少测试：
  - DEV-NNN: 无对应 test task

未覆盖设计决策：
  - DEC-DXXX: 未绑定任何 DEV task 或 ASSERT

未覆盖交互状态：
  - STATE-SXX: 无 DEV/TEST 覆盖

模糊断言：
  - ASSERT-NNN: pass 准则不可执行（「功能正常」不合格）

缺少读取清单：
  - DEV-NNN: 读取清单为空
  - DEV-NNN: 来源节点 REQ-RXX 在读取清单中无对应条目

→ 返回 Phase 4/5/6 修正，然后重新执行 Phase 7
```

全部通过：
```
✅ TASK PLAN GATE PASS
   MUST 需求节点: N 个，全部有 dev task + test task
   MVP 设计决策节点: N 个，全部有 dev/assert 覆盖
   必须状态节点: N 个，全部有 dev/test 覆盖
   断言: N 条，全部可执行
   Dev tasks: N 张，无模糊标题
   继续 Phase 8
```

---

## Phase 8：输出文件 + Handoff

### 8.1 写入产出文件

路径：`docs/engineering/YYYY-MM-DD-<topic>-task-plan.md`

文件节名锁定：
```
# Task Plan — <topic>
## 0. Operating Rules（5 条硬规则）
## 1. L0 Executive Index
## 2. L1 Source Document Index
## 3. L2 Node Index
   ### 3.1 Requirement Nodes
   ### 3.2 State Nodes
   ### 3.3 Design Decision Nodes
## 4. Assertion Matrix
## 5. Dev Task Cards
## 6. Test Task Cards
## 7. Gate Result（PASS + 统计）
```

### 8.2 写入 Handoff 文件

路径：`docs/handoff/YYYY-MM-DD-<topic>-task-plan-handoff.md`
格式：遵循 `.claude/skills/office/references/handoff-protocol.md`

Handoff 必须包含：
- 决策：任务编排策略、里程碑划分（≤8 条）
- 约束：执行 agent 必须先读本文件；不允许跳过 gate
- 风险：执行中可能发现的遗漏（≤3 条）
- 产出路径：指向 task-plan.md
- 下游建议：执行阶段从 DEV-001 开始

### 8.3 Completion Status

```
DONE: task-plan
  产出: docs/engineering/YYYY-MM-DD-<topic>-task-plan.md
  Handoff: docs/handoff/YYYY-MM-DD-<topic>-task-plan-handoff.md
  Gate: TASK PLAN GATE PASS（MUST N/N，断言 N 条，Dev N 张，Test N 张）
  下游建议: 执行阶段 — 开发 agent 从 DEV-001 开始，先读本 task-plan 文件
```

---

## 核心约束（不可违反）

1. Phase 7 门禁 FAIL → 必须修正，不允许跳过
2. 每个 MUST 需求必须有 dev task + test task，无例外
3. Task 标题必须包含具体动词 + 具体对象（「实现 X 模块」永远不合格）
4. 断言必须可执行（给定/执行/结果三段式）
5. 不读取 Obsidian Vault（只读）
6. 不修改 PRD、design-brief、tech-spec 文件
7. task-plan PASS 后，才可告知用户可以开始执行

<!-- FILE_END: task-plan/SKILL.md -->
