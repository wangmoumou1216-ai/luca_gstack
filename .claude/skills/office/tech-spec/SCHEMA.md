# Tech Spec — <topic>

生成时间：YYYY-MM-DD HH:MM
场景：{新功能 A / 优化 B / 改版 C / Agent化 D}
上游 PRD：docs/prd/YYYY-MM-DD-<topic>-prd.md
上游 design-brief：docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
产出路径：docs/engineering/YYYY-MM-DD-<topic>-tech-spec.md

---

## 1. Spec Purpose

**本文件定位：** 工程合同，不是设计文档。下游 task-plan 以本文件为唯一工程权威来源。

**上游文档索引：**

| 文档 | 路径 | 本文件覆盖范围 |
|------|------|--------------|
| PRD | docs/prd/... | R-series 需求、AE-series AI 边界 |
| design-brief | docs/decisions/... | UI 状态决策、组件映射 |

**MUST 需求总数：** N 条（R-系列）
**SHOULD 需求总数：** N 条
**AI 边界声明：** {有/无}，AE-系列 N 条

---

## 2. Upstream Conflict Register

| 冲突 ID | 来源 | 冲突描述 | 解决方式 |
|---------|------|---------|---------|
| C-001 | PRD §N vs design-brief §N | {描述} | {解决} |

（无冲突写：无上游冲突）

---

## 3. Architecture View

### 3.1 技术栈约束

| 层 | 技术 / 约束 | 来源 |
|----|-----------|------|
| 前端框架 | {描述} | PRD / design-brief / 项目约束 |
| API 层 | {描述} | PRD |
| 数据层 | {描述} | PRD |
| AI / Agent | {描述 / N/A} | AE-series |

### 3.2 数据模型

```
{主要实体及关键字段，ER 图或字段列表}
```

### 3.3 组件树

```
{页面 → 区域 → 组件 的层级关系}
```

### 3.4 服务边界

| 服务 | 职责 | 输入 | 输出 | 技术约束 |
|------|------|------|------|---------|
| {服务名} | {职责} | {输入格式} | {输出格式} | {约束} |

---

## 4. Interface Contracts

### API 端点

| 端点 | 方法 | 请求格式 | 响应格式 | 错误码 | 关联需求 |
|------|------|---------|---------|--------|---------|
| /api/... | GET/POST | {schema} | {schema} | 400/404/500 | R-001 |

### AI Agent 接口（如适用）

| Agent ID | 触发条件 | 输入 | 输出 | 权限级别 | 失败处理 |
|---------|---------|------|------|---------|---------|
| AE-001 | {条件} | {输入} | {输出} | deny/ask/allow | {降级策略} |

---

## 5. Requirement Traceability Matrix

| 需求 ID | 需求描述 | 优先级 | 实现方式 | 测试准则 | 覆盖状态 |
|---------|---------|--------|---------|---------|---------|
| R-001 | {描述} | MUST | {实现} | Given/When/Then 格式 | ✅ |
| R-002 | {描述} | MUST | {实现} | Given/When/Then 格式 | ✅ |
| AE-001 | {AI 边界描述} | MUST | {实现} | {可观测验证} | ✅ |

---

## 6. Coverage Gate Result

```
COVERAGE GATE: PASS
MUST 需求总数：N 条
已覆盖：N 条（100%）
未覆盖：0 条
SHOULD 需求总数：N 条
已覆盖：N 条
```
