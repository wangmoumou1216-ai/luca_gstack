# Figma Demo Prototype Spec

生成时间：YYYY-MM-DD HH:MM
模式：口述+Figma→HTML Demo（/figma-demo）
输入来源：{口述+Figma截图N张 / 口述+Figma链接 / 仅口述}
对应文件：docs/prototype/YYYY-MM-DD-{topic}/index.html

---

## 设计意图

### 用户处境
{从 mapping-proof.md 的 Q1 回答中提炼，1-2 句话}

### 流程概述
{整个 Demo 的流程一句话描述}

### 视觉重心
{每个关键节点的 L1 元素}

---

## 节点清单

| 序号 | 节点名 | 类型 | 复杂度 | Figma对应 | 母版 | 状态数 |
|------|-------|------|--------|----------|------|-------|
| 01 | {名称} | {全页/弹窗/抽屉} | {S/M/L} | {Frame N} | {framework/xxx.html} | {N} |
| 02 | ... | | | | | |

---

## 节点间过渡

| 从 | 到 | 过渡类型 | 时长 | 缓动 | 可逆 |
|----|----|---------|------|------|------|
| Node-01 | Node-02 | slide-left | 350ms | ease-standard | 是 |
| ... | | | | | |

---

## 演示模式

| 操作 | 按键 | 说明 |
|------|------|------|
| 下一节点 | → | 播放正向过渡动画 |
| 上一节点 | ← | 播放反向过渡动画 |
| 自动播放 | 空格 | 切换自动/手动 |
| 退出演示 | ESC | 回到默认视图 |
| 全屏 | F11 | 切换全屏 |

---

## 设计系统使用

### 动态参考与当前审美

Dynamic Reference Status: {COMPLETED / SKIPPED_TOOL_UNAVAILABLE / NOT_APPLICABLE_FIGMA_DEMO}
Dynamic Reference Reason: {本次是否做外部动态参考；如未做，
说明是工具不可用、用户只要求还原 Figma，还是时间约束}
Current Aesthetic Score: {NN}/30
参考坐标：{Linear / Attio / Notion AI / Granola / Cursor / Atlassian / Vercel / Salesforce
Agentforce / Figma 原稿}
拒绝的方向：{不做卡片墙 / 不做大面积渐变 / 不做聊天框 / ...}

### 主色使用（≤ 3 处）
1. {节点N: 位置 → bg-primary / text-primary}
2. {节点N: 位置 → ...}
3. {无 / 节点N: 位置 → ...}

### 字号使用
- L1 (text-15)：{使用位置}
- L2 (text-13)：{使用位置}
- L3 (text-13 text-n11)：{使用位置}
- L4 (text-12 text-n11)：{使用位置}

### 间距使用
{使用了哪几档，各在什么位置}

### 动效使用
| 动效 | 时长 | 缓动 | 触发 | 节点 |
|------|------|------|------|------|
| {名称} | {Nms} | {函数} | {hover/click/auto} | {Node-NN} |

---

## 语义词典匹配记录

| 设计师原话 | 匹配词条 | 匹配方式 | 最终参数 |
|-----------|---------|---------|---------|
| {原话} | {词条} | {精确/近似/默认} | {参数} |

---

## 隐含交互补全记录

| 节点 | 补全内容 | 补全规则 |
|------|---------|---------|
| {Node-NN} | {内容} | {规则名} |

---

## Builder 调度记录

| 节点 | 复杂度 | 调度次数 | 自检结果 | 最终状态 |
|------|--------|---------|---------|---------|
| Node-01 | S | 1 | 全部通过 | LOCKED |
| Node-03 | L | 2 | 首次颜色违规，修复后通过 | LOCKED |

---

## QA 结果

QA 报告：docs/prototype/YYYY-MM-DD-{topic}/prototype-qa-report.md
QA JSON：docs/prototype/YYYY-MM-DD-{topic}/qa-results.json
截图（Playwright 可用时）：
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/desktop.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/tablet.png
- docs/prototype/YYYY-MM-DD-{topic}/screenshots/mobile.png

| 检查项 | 结果 | 说明 |
|------|------|------|
| figma-demo mode | PASS/FAIL | {说明} |
| blueprint.yaml exists | PASS/FAIL | {说明} |
| demo node coverage | PASS/FAIL | {说明} |
| build decisions recorded | PASS/FAIL | {说明} |
| current aesthetic score | PASS/FAIL | {NN}/30 |

---

## 适配目标

| 视口 | 断点 | 适配策略 |
|------|------|---------|
| 1440px | ≥1440 | 完整布局 |
| 1024px | 1024-1439 | 压缩间距 |
| 390px | <1024 | 单列简化 |

---

## 未实现项

| 项目 | 原因 |
|------|------|
| {功能} | {技术限制/需要后端数据/超出Demo范围} |
（无则写「无」）

---

## 交接块（下游 skill 必读）

**本步决定了什么：**
{流程节点结构、节点间过渡关系、所有交互逻辑、演示模式}

**高级 handoff-review 需要知道：**
{节点总数、状态覆盖情况、母版使用情况、Builder调度中的特殊决策}

**高级 handoff-review 不应该做：**
{不应质疑已通过Socratic验证的映射关系、不应要求修改演示模式的键位绑定}

**下游 /figma-layer 需要知道：**
{各节点对应的 Figma Frame、设计参数偏差记录（对齐到 token 时的调整）}

**高级 redteam 重点关注：**
{近似匹配的词典翻译是否准确、隐含交互补全是否合理、L级节点的拆分是否恰当}
