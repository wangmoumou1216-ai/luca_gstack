# Task Plan — <topic>

生成时间：YYYY-MM-DD HH:MM
上游 tech-spec：docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md
产出路径：docs/engineering/YYYY-MM-DD-<topic>-task-plan.md

---

## 0. Operating Rules

```
硬规则（本文件强制执行）：
1. Task 描述不允许模糊。「实现某模块」→ FAIL。必须说明输入/输出/边界。
2. 不允许任何 MUST 需求没有对应 dev task。
3. 不允许开发 task 自评质量。每个 dev task 必须有独立的测试 task。
4. 质量门禁未通过不允许写文件。必须循环修正直到 PASS。
5. task-plan PASS 后，才允许分配执行 agent。
```

---

## 1. L0 Executive Index

| 里程碑 | Task 范围 | 预估复杂度 | 依赖 |
|--------|---------|-----------|------|
| M1: {名称} | DEV-001 ~ DEV-00N | {S/M/L} | 无 |
| M2: {名称} | DEV-00N ~ DEV-00N | {S/M/L} | M1 完成 |

**总计：** Dev Task N 张，Test Task N 张，断言 N 条

---

## 2. L1 Source Document Index

| ID | 文档 | 用途 | 何时读 | 何时不读 |
|----|------|------|--------|---------|
| SRC-PRD | docs/prd/... | 产品需求 R/AE | 需求冲突或追踪失败时 | 正常开发时 |
| SRC-TS | docs/engineering/...-tech-spec.md | 架构/接口/矩阵 | 所有开发任务必读对应节 | 不需整体读 |
| SRC-DB | docs/decisions/...-design-brief.md | UI 状态/组件 | UI 相关 task 读 §6 组件映射 | 非 UI task 不读 |
| SRC-HO | docs/handoff/... | 决策摘要/约束/风险 | 每个 task 开始前确认约束 | 任务执行中途 |

---

## 3. L2 Node Index

### 3.1 Requirement Nodes

| Node ID | 需求 ID | 描述 | 关联 Task |
|---------|---------|------|---------|
| REQ-R01 | R-001 | {描述} | DEV-001 |

### 3.2 State Nodes

| Node ID | 状态名 | 触发条件 | 关联 Task |
|---------|--------|---------|---------|
| STATE-S01 | {状态} | {条件} | DEV-00N |

### 3.3 Design Decision Nodes

| Node ID | Decision ID | 描述 | 关联 Task |
|---------|------------|------|---------|
| DEC-D001 | D-001 | {描述} | DEV-00N |

---

## 4. Assertion Matrix

| 断言 ID | Given | When | Then | 关联需求 | 关联 Test Task |
|---------|-------|------|------|---------|--------------|
| ASSERT-001 | {前置条件} | {执行动作} | {预期结果} | R-001 | TEST-001 |

---

## 5. Dev Task Cards

### DEV-001: {具体任务名称}

```
输入：{具体输入描述，格式/来源}
输出：{具体输出描述，格式/路径}
边界：{不做什么}
关联需求：R-001
关联断言：ASSERT-001
需读文档：SRC-TS §3.2（数据模型）
验收：由 TEST-001 执行
```

### DEV-002: {具体任务名称}

```
输入：{具体描述}
输出：{具体描述}
边界：{不做什么}
关联需求：R-002
关联断言：ASSERT-002
需读文档：SRC-TS §4（Interface Contracts）
验收：由 TEST-002 执行
```

---

## 6. Test Task Cards

### TEST-001: 验证 DEV-001 输出

```
验证对象：DEV-001 的输出
断言：ASSERT-001
执行方式：{单元测试 / 集成测试 / 手动验证}
通过标准：Given {条件} When {动作} Then {结果} ✅
```

---

## 7. Gate Result

```
TASK PLAN GATE: PASS
MUST 需求总数：N 条
Dev Task：N 张（每条 MUST 有对应）
Test Task：N 张（每个 Dev 有对应）
断言总数：N 条（每个 Test 有可执行断言）
模糊任务描述：0 条
```
