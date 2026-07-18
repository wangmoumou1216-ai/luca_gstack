# AI System Thinking Framework — {feature name}

> This file is loaded in **Phase 6** when Phase 2.5 `landing_judgment` is `fully_native` or `partially_native`.
> Do not load it earlier — it pollutes context.
>
> This is a **product-level thinking framework**, NOT implementation code.
> It helps engineers understand how the PM thinks about the AI system's 10 modules.
> PM decides: permissions, safety hooks, memory strategy, module coordination.
> Engineering decides: infrastructure, libraries, deployment, performance optimization.
>
> Companion documents:
> - `YYYY-MM-DD-{slug}-prd.md` — the PRD (product decisions)
> - **This file** — AI system architecture thinking (product × engineering bridge)

Generated: {YYYY-MM-DD HH:MM}
Scope Tier: {Lightweight | Standard | Deep-feature | Deep-product}
Source PRD: {path to PRD file}
AI Landing Judgment: {fully_native | partially_native}
Trigger: Phase 2.5 landing_judgment = {level}

---

## 架构概览

一句话：{本功能需要 Agent 吗？如果是，单 Agent 还是多 Subagent？}

```
架构类型：{单 Agent / 主 Agent + N 个 Subagent / 无 Agent（纯 AI Skill 调用）}
Agent 数量：{N}
总 context 预算：{约 N tokens，占模型窗口 X%}
执行模式：{同步（用户等待）/ 异步（后台执行 + 通知）/ 混合}
预估单次执行耗时：{X 秒 - Y 分钟}
```

---

## 第一层 · 定义层（这个 Agent 是谁）

### 1. System Prompt — 系统提示

```
Agent 身份：{一句话}
核心指令：{首要目标}
风格约束：{输出风格的硬约束}

上下文注入（Agent 启动时自动加载）：
  用户身份来源：{从哪里获取}
  业务上下文来源：{从哪里获取}
  品牌约束来源：{如果涉及 UI 输出}

负面指令（绝对不能做的事）：
  1. {具体}
  2. {具体}
  3. {具体}
```

### 2. Permission — 权限系统

| 动作类别 | 权限级别 | 理由 |
|---------|---------|------|
| 读取用户数据 | {allow / ask / deny} | {理由} |
| 修改用户数据 | {allow / ask / deny} | {理由} |
| 创建新记录 | {allow / ask / deny} | {理由} |
| 删除数据 | {deny} | {理由} |
| 对外通讯 | {deny / ask+草稿} | {理由} |
| 分配数据给他人 | {deny / ask} | {理由} |
| 调用外部 API | {allow / ask / deny} | {理由} |
| 读取他人数据 | {deny} | {理由} |

**与 prd-constraints.md 的一致性检查（条件性）：** `prd-constraints.md` 由下游 `design-brief`（场景 B）产出，`brainstorm` 上游阶段通常尚不存在。仅当该文件已存在时才做下面两项核对；否则改为从本 PRD 的 Scope Boundaries / Agent Boundary Declaration 推导"不做什么"再核对 Permission 表。
```
□ prd-constraints 的"不做什么"里的每一项，在 Permission 表里都是 deny？
□ 没有 prd-constraints 说"不做"但 Permission 表给了 allow 的矛盾？
```

### 3. Tool Registry — 工具注册表

**内部工具：**

| 工具名 | 功能 | 输入 | 输出 | 权限级别 |
|-------|------|------|------|---------|
| {工具名} | {功能} | {输入} | {输出} | {allow/ask/deny} |

**外部工具（通过 MCP 接入）：**

| 工具名 | MCP 来源 | 功能 | 权限级别 |
|-------|---------|------|---------|
| {工具名} | {MCP 端点} | {功能} | {allow/ask} |

### 4. Memory — 记忆

| 记忆项 | 存储位置 | 生命周期 | 更新触发 |
|-------|---------|---------|---------|
| {记忆项} | {CLAUDE.md / CONTEXT.md / workflow-state.yaml} | {永久/本周/本次} | {触发条件} |

**不存储的内容（每次实时获取）：**
- {列出}

---

## 第二层 · 执行层（这个 Agent 怎么做）

### 5. Hooks — 钩子（确定性规则）

| 规则名 | 触发条件 | 执行动作 | 走模型？ |
|-------|---------|---------|---------|
| {规则名} | {条件} | {动作} | **否** |

**Hook 覆盖率检查：**
```
□ 每个 deny 权限都有对应的 Hook 拦截？
□ 对外通讯有 Hook 强制转草稿？
□ 超时有 Hook 熔断？
```

### 6. Skills — 按需加载的技能包

| Skill 名 | 加载条件 | 功能 | Token 开销 |
|----------|---------|------|-----------|
| {Skill 名} | {条件} | {功能} | {约 N tokens} |

**总 Skill token：{N tokens}，占 context 预算 {X%}**

### 7. MCP — 外部协议

| 外部服务 | MCP 端点 | 功能 | 数据流向 | context 隔离策略 |
|---------|---------|------|---------|---------------|
| {服务名} | {端点} | {功能} | {双向/单向} | {隔离策略} |

**MCP 失败 fallback：**
- {每个 MCP 的失败处理方式}

---

## 第三层 · 运行时层（这个 Agent 怎么管理自己）

### 8. Session State — 会话状态

**状态持久化：**

| 状态项 | 存储方式 | 恢复策略 |
|-------|---------|---------|
| {状态项} | {存储方式} | {恢复策略} |

**回滚策略：**
- 未确认操作：{丢弃}
- 已确认操作：{保留 N 天快照，支持 undo}

### 9. Subagent — 子代理

{如果不需要拆}：
```
本功能为单 Agent 架构，不拆 Subagent。
理由：{总 context 开销 < 50%，所有步骤线性依赖}
```

{如果需要拆}：

| Subagent 名 | 职责 | 输入 | 输出 | context 隔离 |
|------------|------|------|------|------------|
| {名称} | {职责} | {输入} | {输出} | {隔离策略} |

**Subagent 协调规则：**
- 主 Agent 是调度者，Subagent 是执行者
- Subagent 输出以摘要进入主 context
- Subagent 失败 → 主 Agent 标记该步骤失败

### 10. Context Mgmt — 上下文管理

**context 预算规划：**

| 模块 | 预估 token | 占比 |
|------|-----------|------|
| System Prompt | {N} | {X%} |
| Skills | {N} | {X%} |
| Memory | {N} | {X%} |
| 工具返回值（单次平均） | {N} | {X%} |
| 历史消息（预计 M 轮） | {N} | {X%} |
| 预留给模型思考 | {N} | {X%} |
| **总计** | **{N}** | **100%** |

**压缩策略：**
- 工具返回值 > 2K → 自动摘要
- 历史消息 > 10 轮 → 压缩旧轮次
- 总预算超窗口 80% → 拆 Subagent

**Prompt cache 策略：**
- System Prompt + Skills → 适合 cache（内容稳定）
- Memory / 工具返回值 → 不 cache（每次变化）

---

## 模块串联图

```
用户触发
  │
  ▼
┌─────────────────────────────────────────────────┐
│ System Prompt 组装                                │
│ 注入：用户身份 + 业务上下文 + 品牌约束              │
└──────────────────────┬──────────────────────────┘
                       │
  ┌────────────────────┼────────────────────┐
  │                    │                    │
  ▼                    ▼                    ▼
Permission           Tool Registry         Memory
检查权限              加载工具注册表          读取 CLAUDE.md
deny → 拦截           只注册本任务需要的      / CONTEXT.md
ask → 等用户确认                             / workflow-state
  │                    │                    │
  └────────────────────┼────────────────────┘
                       │
                       ▼
              Skills 按需加载
              检查 context 预算
                       │
                       ▼
           ┌──── 执行主循环 ────┐
           │                    │
           │  每步先过 Hooks     │
           │  ├─ MCP 调用       │
           │  ├─ Subagent 调度  │
           │  └─ 更新 Session   │
           │      State         │
           │                    │
           │  context 超预算    │
           │  → 触发压缩/拆分   │
           └────────────────────┘
                       │
                       ▼
              执行完成
              ├─ Memory 写入
              ├─ Session State 写入
              └─ 产出交付给用户
```

（实际生成时建议用 Mermaid 流程图替代文本图，更清晰）

---

## 与 prd.md 的映射

| P0 用户故事 | 涉及的模块 | 关键配置 |
|------------|----------|---------|
| {P0-001} | {模块1, 模块2, ...} | {关键配置说明} |
| {P0-002} | {模块1, 模块2, ...} | {关键配置说明} |

---

## 产出后检查清单

```
□ （若 prd-constraints.md 存在，通常来自下游 design-brief）Permission 表和其"不做什么"不矛盾；不存在时改从本 PRD 的 Scope Boundaries 推导核对？
□ 每个 deny 权限都有对应的 Hook 拦截？
□ MCP 接入的外部服务都有 fallback？
□ context 预算总和 < 模型 context 窗口 80%？
□ 如果拆了 Subagent，数据流向是否清晰？
□ Memory 只存"个性化偏好"和"累积学习"，不存可实时查询的数据？
□ 对外通讯有 Hook 强制转草稿 / deny？
□ 每条 P0 用户故事都映射到了具体模块配置？
```

---

<!-- FILE_END: ai-spec-template.md -->
