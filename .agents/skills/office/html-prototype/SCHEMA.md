# Prototype Spec

生成时间：YYYY-MM-DD HH:MM
场景：{新功能设计 A / 优化现有 B / 评审改版 C}
框架来源：{framework/xxx.html / 无框架}
对应文件：docs/prototype/YYYY-MM-DD-{topic}/index.html

---

## 设计意图（Step 0 输出）

用户处境：{1-2 句话}
空间结构：{几个区域 + 视线路径}
视觉重心：{L1 元素是什么}

---

## 当前审美校准

Current Aesthetic Score：{NN}/30（必须 ≥ 24）
参考坐标：{Linear / Attio / Notion AI / Granola / Cursor / Atlassian / Vercel / Salesforce Agentforce}
采用原则：{Calm Density / Invisible AI / Progressive Disclosure / Role Awareness / Trust Before Delight}
拒绝方向：{不做卡片墙 / 不做聊天框 / 不做大面积渐变 / 不做 Hero 化后台页面 / ...}
角色语境：{销售 / 销售管理者 / 运营 / 管理员}
本次最需要建立的用户信心：{更快判断 / 更少误操作 / 更清楚 AI 来源 / 更容易接管 Agent}

---

## Dynamic Reference Scan

Dynamic Reference Status：{COMPLETED / SKIPPED_TOOL_UNAVAILABLE / NOT_REQUIRED}

### 查询目标

{本次要解决的 1-3 个 UI / 动效 / AI pattern 问题}

### 入选参考

| 产品 | 来源 | 证据类型 | 借鉴点 | 采用/不采用 |
|---|---|---|---|---|
| {产品} | {URL 或说明} | official docs / product page / changelog / screenshot / video / article | {借鉴点} | {采用/不采用 + 原因} |

### 共性提取

- 布局：{共性}
- 信息层级：{共性}
- AI/Agent 表达：{共性}
- 动效：{共性}
- 状态反馈：{共性}
- 信任/控制：{共性}

### 转译为本原型的设计决定

- {决定 1}
- {决定 2}
- {决定 3}

---

场景B：
改动区：{design-brief 要求改动的具体区域}
保持区：{无对应决策，保持与截图一致的区域}

---

## 页面列表

| 页面/状态 | 触发方式 | 描述 |
|---------|--------|------|
| 默认态 | 直接访问 | |
| 空态 | index.html#empty | |
| 加载态 | index.html#loading | |
| 错误态 | index.html#error | |

---

## 状态覆盖矩阵

| State ID | 状态名 | data-prototype-state | 触发方式 | 实现状态 |
|---------|--------|------------|---------|---------|
| default | 默认态 | `data-prototype-state="default"` | 直接访问 / 状态切换器 | ✅ |
| empty | 空态 | `data-prototype-state="empty"` | 状态切换器 | ✅ |
| loading | 加载态 | `data-prototype-state="loading"` | 状态切换器 | ✅ |
| error | 错误态 | `data-prototype-state="error"` | 状态切换器 | ✅ |
| success | 成功态 | `data-prototype-state="success"` | 状态切换器 | ✅ |
| ai-thinking | 思考中态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-low-confidence | 低置信态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-decline | 拒答态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-partial | 部分完成态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-steer | 待 Steer 态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| ai-feedback | 幻觉兜底态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |
| agent-running | Agent 执行中态 | {N/A 或 data-prototype-state} | {触发方式} | {✅/N/A} |

---

## Design Decision Coverage

| Decision ID | HTML 注释 | 位置/区域 | 实现状态 | 说明 |
|-------------|-----------|----------|----------|------|
| D-001 | `<!-- DECISION: D-001 | source: design-brief | status: implemented -->` | {区域} | ✅ | {说明} |

---

## shadcn 组件清单

| 页面 | 组件名 | variant | 实现方式 |
|------|-------|---------|---------|
| {页} | {组件} | {variant} | shadcn 手写 / framework 复用 |

---

## 场景C：FIX-ID 实现记录

| FIX-ID | 问题描述 | 实现状态 |
|--------|---------|---------|
| UX-A-P0-001 | {描述} | ✅ 已实现 |

---

## Observable QA

QA 结果：{PASS / DONE_WITH_CONCERNS / FAIL}
QA 报告：docs/prototype/YYYY-MM-DD-{topic}/prototype-qa-report.md
QA JSON：docs/prototype/YYYY-MM-DD-{topic}/qa-results.json
截图：
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/desktop.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/tablet.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/mobile.png

| 检查项 | 结果 | 说明 |
|--------|------|------|
| console errors = 0 | {PASS/FAIL/N/A} | |
| design decisions mapped = N/N | {PASS/FAIL} | |
| states implemented | {PASS/FAIL} | |
| token lint violations = 0 | {PASS/FAIL} | |
| primary color usage ≤ 3 | {PASS/FAIL} | |
| no external CDN | {PASS/FAIL} | |
| no emoji icons | {PASS/FAIL} | |

---

## 未实现项

| 项目 | 原因 |
|------|------|
| {功能} | {技术限制/需要后端数据} |
（无则写「无」）

---

## 交接块（下游 skill 必读）

**本步决定了什么：**
{信息架构、主要组件选择、关键交互路径、状态覆盖策略}

**下游 /figma-layer 需要知道：**
{设计范围、框架来源、组件映射表路径}

**下游 /figma-layer 不应该做：**
{不应重新设计已决定的信息架构}
