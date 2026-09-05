# Design-Brief Output Templates — 产出模板集

本文件是 /design-brief 各 Phase 的产出模板权威；执行规则由 SKILL.md 对应 Phase 管理。
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
- 输出目标：{用户所选工具 / 尚未选择；Open Design 为默认推荐}
- 目标依据：{正文 Phase 6 的来源记录}
- 工具项目标识：{已绑定 ID / 待交接入口确认；不得猜最近项目}

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
- AI thinking：{semantic expectation or N/A + reason}
- low confidence：{semantic expectation or N/A + reason}
- refusal：{semantic expectation or N/A + reason}
- partial：{semantic expectation or N/A + reason}
- steer required：{semantic expectation or N/A + reason}
- hallucination fallback：{semantic expectation or N/A + reason}
- agent running：{semantic expectation or N/A + reason}

**页面与交互位置映射**
- {语义页面/位置} → {交互职责} → {D-ID} → {全部适用 STATE} → {需求/AC 来源} → {约束} → {下游目标}

**页面参考上下文（交接入口按 page-context 核验后附入同包）**
- 参考策略：{正文已有选择 / 明确不用参考 / 待交接入口执行匹配}
- reference：{none / 已确认参考；未决采用不得作为已确认参考送出}
- page_id / region_id 或选区：{已确认值 / N/A}
- 源版本与确认来源：{源 hash、有效预览/选区记录及真人消息索引 / N/A}
- 接收方可达的参考材料：{整页参考、区域说明/标注图的实际附件或可达地址 / N/A}
- 改动范围与保持范围：{来自正文及已确认位置；无参考时仍必填}

**设计约束**
- {正文中的产品、交互、权限与平台约束}
- 设计系统：由用户在 OD / Claude Design 配置，本包不覆盖其视觉设置

**不得实现**
- {rejected direction}
- {out-of-scope item}
```

> **Packet 填写指引**
> **OD 交付边界**：接收方（尤其 Open Design）是自带 design system 与 UI 专业能力的 UI 生成器。Packet 只承载 **UI 之前的设计事实**。灰区判据——这条是在陈述「用户/交互/内容必须达成什么」（可写），还是在替生成工具决定「界面长什么样」（不可写）？px/pt 值、对齐与列布局指令、具体控件选型、逐字文案**不得写入任何块**。显式例外：经验证的 ux-audit P0 问题可携带**验收标准**进入，但不得写成布局处方。
> **交互结构·信息架构子字段**：按 interaction-architecture 的 IA 判据（§1.6）填——层级 ≤3、命名取用户词汇、含混项显式标出；写「必须达成什么」，不画菜单树。
> **状态覆盖块**：每状态的 UI expectation 写**语义期望**（如"空态含引导动作""错误可单击重试且保留输入"），内容语义以 brief 正文 Phase 3 的声明为源（Packet 不得含正文没有的事实）。
> **位置映射块**：从正文第 7 节引用语义位置、职责及完整 D/STATE/AC，机器门名为 `page_interaction_mapping`。无参考不免除本块，所有核心决策和全部非 N/A 状态都须有下游去向；不得改填组件名、variant、Tailwind/CSS 或品牌色配额。
> **页面参考上下文块**：唯一执行合同是 `.claude/skill-os/runtime/page-context.md`。设计源已对齐、即将交接时由入口完整读取至 FILE_END，OD 在编译前执行；本模板不触发第二次匹配或询问。仅高置信候选才推荐，采用须真人确认；低置信/无匹配不推荐，以 `reference=none` 非阻塞继续。已有有效确认复用，agent 写的 `confirmation.actor=user` 或 JSON evidence 不能代签。未决推荐或失效的用户指定源按该合同等待；页面采用不授予外部写入权。
> **单一事实源**：产品、交互、状态、需求/AC 与修改边界只来自正文；第 7 节仅引用 brief 产出时已有的确认。交接入口的新确认附入同次 Packet 的运输元数据（`page-reference.json`），指向已通过门禁的 brief 来源及版本，不反写正文/第 7 节，不改变源 hash 或复制出第二套需求。没有库记录可用语义位置或截图局部定位，不强制入库。参考材料必须对接收方可达，本机路径不是附件。
> **目标与设计系统**：工具及平台继承正文来源；设计系统由用户在 OD / Claude Design 内配置，本包不注入旧 token 或组件技术映射。Claude Design 使用同包人工附加，导出、外部接收、生成完成分别记录。

---

## 交接块格式（原属 Phase 7，产出文件第 12 节）

```markdown
## 交接块（下游恢复索引，不是事实来源）

**本步决定了什么：**
- 信息架构、语义页面/位置与交互职责、关键交互路径
- AI Native 范式选择及介入节点
- 12 状态的覆盖策略（包含 AI 专有状态）
- Agent 的授权边界（仅场景 D）

**下游 MagicPath / Open Design / Claude Design / HTML 生成器需要知道：**
- 主输入是本文件的 `Design Generation Packet`
- 设计范围（来自 PRD）
- 输出目标、平台与整页/局部范围及各自来源
- 状态覆盖策略、页面与交互位置映射路径、确认参考或 reference=none
- **AI 专有状态的 UI 形式** — 本 skill 的状态覆盖表共 12 项，其中 AI 专有 7 项（思考中 / 低置信 / 拒答 / 部分完成 / 待 Steer / 幻觉兜底 / Agent 执行中）。**html-prototype 默认只处理前 5 项（默认/空/加载/错误/成功），若本决策含 AI 功能，必须额外生成所有非 N/A 的 AI 专有状态。**

**下游工具不应该做：**
- 不应重新设计已锁定的信息架构
- 不应遗漏映射表中的交互职责、D/STATE/AC 来源或修改/保留约束
- **不应省略任何非 N/A 状态的实现** — 状态覆盖表里写了描述的状态必须在产物里有可观察的对应表现
- 不应把 AI 输出做成"无来源无置信度"的纯文本（违反 Perplexity 锚点）
- 不应用浮球 / 新标签页作为 AI 入口（违反 Raycast 锚点和 AI Slop 反模式）
- 不应直接从 research / ux-research / deepresearch 发散新的产品功能
- 不应复活 REMOVED 或 Rejected Directions

**对生成工具的命令式指示（逐条执行）：**
1. 读取本文件的"体验验证结论"节的 12 状态覆盖表
2. 对每个"是否需要单独设计 = 是"的状态，**必须**生成对应的状态页
3. HTML 产物用 `<!-- STATE: xxx -->` 注释标注；其他工具提供可核对的状态位置索引，保留 D/STATE/AC 追踪
4. 若发现状态覆盖表某状态写 N/A 但本质上应该有，**不得静默补充**，返回 AskUserQuestion 确认
5. 外部工具只复制 `Design Generation Packet`；需要追溯时回到 design-brief 正文，不读取零散上游材料
```

<!-- FILE_END: design-brief/references/output-templates.md -->
