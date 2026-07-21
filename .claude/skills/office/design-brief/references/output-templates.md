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
- 默认产出路径：Open Design（首选，见 CLAUDE.md 界面产出备选链）
- fallback：MagicPath React canvas → 本地 HTML prototype（Open Design 不可达时依次降级，或非 React/Canvas、用户明确要求）

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

> **Packet 填写指引（围栏外指引，不改变模板结构；2026-07-21）**
> **OD 交付边界**：接收方（尤其 Open Design）是自带 design system 与 UI 专业能力的 UI 生成器。Packet 只承载 **UI 之前的设计事实**。灰区判据——这条是在陈述「用户/交互/内容必须达成什么」（可写），还是在替生成工具决定「界面长什么样」（不可写）？px/pt 值、对齐与列布局指令、具体控件选型、逐字文案**不得写入任何块**。显式例外：经验证的 ux-audit P0 问题可携带**验收标准**进入，但不得写成布局处方。
> **交互结构·信息架构子字段**：按 interaction-architecture 的 IA 判据（§1.6）填——层级 ≤3、命名取用户词汇、含混项显式标出；写「必须达成什么」，不画菜单树。
> **状态覆盖块**：每状态的 UI expectation 写**语义期望**（如"空态含引导动作""错误可单击重试且保留输入"），内容语义以 brief 正文 Phase 3 的声明为源（Packet 不得含正文没有的事实）。
> **两块按消费方分流填写（2026-07-21 裁决，解决 shadcn 词表 ↔ OD 的 DS 让渡口径之争）**：Packet 服务多个生成器（见块首），二者要的东西本就不同，门禁已印证——`design_brief_to_magicpath` 门**要求** `component_mapping`，`design_brief_to_open_design` 门**明确不要求**。据此：
> - **「组件结构」块**：面向 **shadcn 栈**（magicpath / html-prototype）**必填**；面向 **Open Design** 填 `N/A — 组件选型交所选 design system`（OD 自带 DS，压 shadcn 词表进去=拿我们的栈锁它的 UI 能力）。
> - **「品牌与视觉约束」第 2 行**：面向 shadcn 栈适用；面向 **Open Design 只保留** #FF8000 ≤3 处 + 文字色，`design-system-contract / spacing / type scale` 一行**改写为** `其余视觉（配色/字体/字号/间距/布局）交所选 design system` —— 与 open-design SKILL.md 的 FxUI 收窄口径对齐。
> - 不确定消费方时按**最不锁能力**的一侧填（即 OD 口径），下游要 shadcn 映射时再补。

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
