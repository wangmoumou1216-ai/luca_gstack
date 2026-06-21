# Design-Brief Output Templates — 产出模板集

本文件存放 /design-brief 各 Phase 的产出模板原文（自 SKILL.md 外移，逐字符未改）。
执行到对应 Phase 时按 SKILL.md 中的指针完整读取所需小节，照模板逐字段产出；不要提前加载。

---

## 设计坐标系（原属 Phase A，写入产出文件第 1 节）

```
【设计坐标系】

本次设计必须解决的问题（来自 PRD P0 用户故事 / ux-audit P0 问题）：
  1. {问题ID}：{问题简述}
  2. ...

本次设计可以借鉴的范式（来自 native-design / inspired-design）：
  1. {范式名称}：{对本次设计的含义}
  2. ...

本次设计绝对不能碰的范围（来自 prd-constraints.md Not-Do List）：
  1. {不做事项}
  2. ...

本次设计的 AI Native 方向（来自 Phase 1 之前的预判 + native/inspired 的范式选择）：
  结论：AI {介入 / 不介入}
  [若介入] 范式：{对话式替代 / 嵌入式预测 / 代理式执行 / 决策增强}
  [若介入] 介入节点：{具体交互节点，例："填写跟进记录时" / "筛选客户列表时"}
  [若不介入] 理由（4 选 1）：{超出语料 / 竞品证据 / 技术前提 / 场景不适合} — {一句话}
```

---

## 决策模版（原属 Phase 5，每条决策独立写）

```markdown
### D-{NNN}：{组件/模式名称}

- **决策内容：** {做什么，一句话}

- **设计理由：** {为什么这样做，必须引用以下之一}
  - PRD P0 故事：{引用具体故事编号}
  - ux-audit 发现：{引用具体 issue ID}
  - native-design / inspired-design 方案：{引用具体节}
  - ai-native-design-framework：{引用具体范式或原则}
  禁用："我觉得"、"直觉"、"参考业界"等无源依据。

- **排除的备选方案：** {还考虑过什么，为什么不选}
  - 备选 1：{描述} → 不选原因：{具体原因}
  - 备选 2（可选）：{描述} → 不选原因：{具体原因}
  最少 1 条，不允许留空。留空说明思考不充分。

- **接受的 tradeoff：** {这个选择放弃了什么}
  例："选了嵌入式预测，放弃了'让用户明确感到 AI 在帮忙'的显著性；代价是用户可能
      不会主动对 AI 建议道谢或反馈，需要通过其他方式收集 feedback"
  不允许写"无 tradeoff"——任何决策都有代价。

- **AI Native 判定引用：** {引用 Phase A 坐标系的全局结论，并说明本决策的体现}
  例："全局 AI 方向 = 嵌入式预测。本决策在 {字段名} 旁显示 ghost text 预填建议，
      用户按 Tab 接受——体现了嵌入式预测范式，不打断主路径。"
  不介入的决策写："本决策不涉及 AI 介入节点。"

- **状态覆盖：** 引用 Phase 3 状态覆盖表中与本决策相关的状态
  - 默认态：{描述}
  - 空态：{描述 / N/A：原因}
  - 思考中态：{描述 / N/A：原因}
  - 低置信态：{描述 / N/A：原因}
  - ... (列出本决策涉及的所有适用状态)

- **PRD 约束引用：** {prd-constraints.md 对应条目编号或具体引用}
  场景 A 可以写 "N/A — 新功能，无 prd-constraints"。
  场景 B / C / D 必填，留空视为决策不完整。
```

---

## Design Generation Packet（原属 Phase 6.75 Step 1）

```markdown
## Design Generation Packet（给 MagicPath / Open Design / Claude Design / HTML 生成器）

**生成目标**
- 页面 / 组件名称：{name}
- 目标平台：{desktop CRM / mobile / embedded component}
- 默认产出路径：MagicPath React canvas component
- fallback：本地 HTML prototype（仅 MagicPath 不可用、非 React/Canvas、或用户明确要求）

**产品与用户目标**
- 用户角色：{primary user}
- 核心任务：{job}
- 成功标准：{observable outcome}

**交互结构**
- 信息架构：{regions / hierarchy}
- 主流程：{3-7 steps}
- 关键操作：{commands}

**必须实现的设计决策**
- D-001：{decision}｜理由：{rationale}｜tradeoff：{tradeoff}
- D-002：...

**状态覆盖**
- default：{UI expectation}
- empty：{UI expectation or N/A}
- loading：{UI expectation or N/A}
- error：{UI expectation or N/A}
- success：{UI expectation or N/A}
- AI thinking / low confidence / refusal / partial / steer required / hallucination fallback / agent running：{UI expectation or N/A}

**组件结构**
- {region} → {shadcn component or 自绘} → {decision IDs}

**品牌与视觉约束**
- 使用 #FF8000 不超过 3 处
- 遵守 design-system-contract / spacing / type scale
- 不使用已 REMOVED 的方案

**不得实现**
- {rejected direction}
- {out-of-scope item}
```

---

## 交接块格式（原属 Phase 7，产出文件第 12 节）

```markdown
## 交接块（下游恢复索引，不是事实来源）

**本步决定了什么：**
- 信息架构、主要组件选择、关键交互路径
- AI Native 范式选择及介入节点
- 12 状态的覆盖策略（包含 AI 专有状态）
- Agent 的授权边界（仅场景 D）

**下游 MagicPath / Open Design / Claude Design / HTML 生成器需要知道：**
- 主输入是本文件的 `Design Generation Packet`
- 设计范围（来自 PRD）
- 原型承载方式（framework 母版 / 局部组件 / standalone mobile prototype）
- 平台、状态覆盖策略、映射表路径
- **AI 专有状态的 UI 形式** — 本 skill 的状态覆盖表共 12 项，其中 AI 专有 7 项（思考中 / 低置信 / 拒答 / 部分完成 / 待 Steer / 幻觉兜底 / Agent 执行中）。**html-prototype 默认只处理前 5 项（默认/空/加载/错误/成功），若本决策含 AI 功能，必须额外生成所有非 N/A 的 AI 专有状态。**

**下游工具不应该做：**
- 不应重新设计已锁定的信息架构
- 不应绕过映射表选用其他组件
- **不应省略任何非 N/A 状态的实现** — 状态覆盖表里写了描述的状态必须在原型里有对应 UI（用 display:none 切换）
- 不应把 AI 输出做成"无来源无置信度"的纯文本（违反 Perplexity 锚点）
- 不应用浮球 / 新标签页作为 AI 入口（违反 Raycast 锚点和 AI Slop 反模式）
- 不应直接从 research / ux-research / deepresearch 发散新的产品功能
- 不应复活 REMOVED 或 Rejected Directions

**对生成工具的命令式指示（逐条执行）：**
1. 读取本文件的"体验验证结论"节的 12 状态覆盖表
2. 对每个"是否需要单独设计 = 是"的状态，**必须**生成对应的状态页
3. 生成后用 `<!-- STATE: xxx -->` 注释标注，便于后续高级审查核对
4. 若发现状态覆盖表某状态写 N/A 但本质上应该有，**不得静默补充**，返回 AskUserQuestion 确认
5. 外部工具只复制 `Design Generation Packet`；需要追溯时回到 design-brief 正文，不读取零散上游材料

**下游 /figma-layer 需要知道：**
- 同上
- 组件内 shadcn 优先，跳出组件的部分以 HTML 为准
```

<!-- FILE_END: design-brief/references/output-templates.md -->
