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
## Design Generation Packet（冻结后给 MagicPath / Open Design / Claude Design / HTML 生成器）

> **唯一需求事实源：** 本块只包含来自 design-brief 正文的需求、AC、D-series、STATE、语义位置和
> 修改/保留边界。通过 Packet 门禁后按原字节冻结；后续的 `source_packet_sha256` 指向此版本。
> `CandidateHint`、最终模板/模块 binding、TAC、handoff ID、OD project、授权和收据都不属于本块，
> 也不得通过修改本块来加入。

**生成目标**
- 页面 / 组件名称：{name}
- 目标平台：{desktop CRM / mobile / embedded component}
- 输出目标：{用户所选工具 / 尚未选择；Open Design 为默认推荐}
- 目标依据：{正文 Phase 6 的来源记录}

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
> **冻结与模板运输边界**：唯一执行合同是 `.claude/skill-os/runtime/page-context.md`。先冻结本 Packet，才由交接入口执行最终 `carrier-binding`；Phase-A `CandidateHint` 从不进入 Packet 或代替 adoption。有效 binding、`page-reference.json`、TAC 和 hash 是指向冻结 Packet 的**独立运输元数据**，不反写正文/第 7 节，也不复制出第二套需求。无最终绑定或用户拒绝模板时用互斥 `reference_only` bundle；它没有 base template、TAC、carrier hash 或模板衍生承诺。
> **carrier 的视觉边界**：`structural_carrier` 只借 DOM、登记模块和内容结构；CSS/token/assets 不是视觉验收标准，OD 的设计系统仍由用户配置。只有显式 `visual_carrier` 且同时有 viewport、截图基线与允许差异阈值，才能把模板视觉作为约束。
> **授权与可达材料**：最终 binding/adoption 不授予 OD stage；stage、run、recover 分别需要自己的授权。接收方可达的参考材料须通过 control files/实际附件提供，本机路径不是附件。
> **目标与设计系统**：工具及平台继承正文来源；设计系统由用户在 OD / Claude Design 内配置，本包不注入旧 token 或组件技术映射。Claude Design 使用同包人工附加，导出、外部接收、生成完成分别记录。

---

### 结构化冻结（carrier 分支，仍属于同一个 Design Generation Packet）

上面的目标、用户任务、交互结构、D 决策、状态、位置、约束和不得实现项全部保留；需要 carrier
时，将这些事实逐条放入下面唯一 document，而不是同时维护 Markdown 正文和第二份事实清单。
已有上游稳定 ID 原样保留；无 ID 的目标/边界在 design-brief 内补稳定 ID 后再冻结，不在交接期发明。
完整事实写入 `text`，包括理由、位置、关联 ID、非 N/A 状态与验收方式；不得只放摘要或 ID。

```js
import { createCarrierPacket, inspectCarrierPacket } from './scripts/carrier-packet.mjs';
const body = createCarrierPacket({
  schema_version: 1,
  packet_kind: 'design-generation',
  items: [
    { source_kind: 'requirement', id: 'R-001', text: '用户能按负责人筛选客户记录。' },
    { source_kind: 'decision', id: 'D-001', text: 'R-001：在客户列表的筛选职责区域提供负责人条件；与现有条件组合。' },
    { source_kind: 'state', id: 'STATE-001', text: 'R-001 无结果时保留所选条件，并提供清空条件的入口。' },
    { source_kind: 'acceptance', id: 'AE-001', text: '选择负责人后只显示对应记录；清空条件恢复全部记录。' }
  ],
  scopes: []
});
const frozen = inspectCarrierPacket(body);
```

实际 Packet 必须含本轮全部事实，不以此四条示例替代。`source_kind` 只取
`requirement|decision|state|acceptance|constraint`；生成目标、平台、保持边界、已否决方向等放入
有 ID 的 constraint。`scopes` 仅记录正文已经明确的 `non_template_effect|out_of_scope` 依据，
关联精确 `source_ids`；out_of_scope 的 `confirmation_ref` 必须对应真实用户决定。
范围排除不删除 items，coverage 仍逐项说明去向。

helper 生成唯一 Markdown/JSON envelope 并计算原文 hash；冻结 body 必须按字节传递。
TAC 使用 inspector 返回的全部 applicability，不能重编 ID、手填 hash 或在下游过滤分母。
旧自由 Markdown 没有这项机器完整性保证：保留原文走 reference_only，或回本 owner 完成新版本冻结。
格式校验不证明从上游到 Packet 的语义忠实；仍逐项完成 Phase 6.5/6.75 的对照验收。

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
- Packet 已冻结；`CandidateHint` 不是 Packet 字段或最终模板 binding。carrier 仅在最终 adoption + TAC/hash 确认后存在，否则是 `reference_only`
- `structural_carrier` 不继承视觉；`visual_carrier` 只有同时具备 viewport、基线和差异阈值时才可用
- **AI 专有状态的 UI 形式** — 本 skill 的状态覆盖表共 12 项，其中 AI 专有 7 项（思考中 / 低置信 / 拒答 / 部分完成 / 待 Steer / 幻觉兜底 / Agent 执行中）。**html-prototype 默认只处理前 5 项（默认/空/加载/错误/成功），若本决策含 AI 功能，必须额外生成所有非 N/A 的 AI 专有状态。**

**下游工具不应该做：**
- 不应重新设计已锁定的信息架构
- 不应遗漏映射表中的交互职责、D/STATE/AC 来源或修改/保留约束
- **不应省略任何非 N/A 状态的实现** — 状态覆盖表里写了描述的状态必须在产物里有可观察的对应表现
- 不应把 AI 输出做成"无来源无置信度"的纯文本（违反 Perplexity 锚点）
- 不应用浮球 / 新标签页作为 AI 入口（违反 Raycast 锚点和 AI Slop 反模式）
- 不应直接从 research / ux-research / deepresearch 发散新的产品功能
- 不应复活 REMOVED 或 Rejected Directions
- 不应把 `CandidateHint`、截图参考或 `reference_only` 称为模板衍生；不应以 base template、CSS 或 OD self-report 取代冻结 Packet

**对生成工具的命令式指示（逐条执行）：**
1. 读取本文件的"体验验证结论"节的 12 状态覆盖表
2. 对每个"是否需要单独设计 = 是"的状态，**必须**生成对应的状态页
3. HTML 产物用 `<!-- STATE: xxx -->` 注释标注；其他工具提供可核对的状态位置索引，保留 D/STATE/AC 追踪
4. 若发现状态覆盖表某状态写 N/A 但本质上应该有，**不得静默补充**，返回 AskUserQuestion 确认
5. 外部工具以冻结 `Design Generation Packet` 为唯一需求真相；carrier 的 TAC 只能投影其已有片段，`reference_only` 不产生模板衍生承诺
```

<!-- FILE_END: design-brief/references/output-templates.md -->
