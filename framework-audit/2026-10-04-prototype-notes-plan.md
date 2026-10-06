# Open Design HTML 内嵌交互说明：设计与实施计划

日期：2026-10-04。范围：luca_gstack 框架，NO_PIN。基线：`d704734e53cc24096242b8595d4514d38831c83d`，研究开始时工作区干净。

状态：v5 整包终审候选；与 [执行 Agent 手册](./2026-10-04-prototype-notes-execution.md) 共同作为实施依据。v4 会审记录保留；v5 必须重新审查完整执行包，最终判决见同目录 review.md。功能实现尚未开始。本轮仅产出计划、研究、会审和红队记录及必要评审落账，不改运行规则、功能源码、项目或 framework/。

## 0. 目标、原始诉求与前提

**交付物是 Open Design 生成的同一份原型 HTML，加上内嵌交互说明能力。** 接收者只收到一个可双击打开的 HTML，在其中体验原交互、打开标号和说明。不是独立说明网站、截图标注板，也不是需要安装的浏览器插件。

用户后续明确：交付方式选择“下载后发给同事，双击即可查看”；“通过 Opendesign 产出以后，然后加上这个交互说明的 HTML，它不是一个单独的”。

| 需求 | 用户依据（首轮为忠实摘要） | 方案落点 |
|---|---|---|
| R-01 | 交互演示以外，需要面向交付的细节说明 | §3 内容结构 |
| R-02 | 开关展开侧栏，模块显示 1、2 等标号并对应说明 | §4 查看与定位 |
| R-03 | 既有整体交互逻辑，也有模块交互和 UI 明细 | §3 页级/模块级与分类 |
| R-04 | AI 自动产出明细 | §5 来源与生成 |
| R-05 | 自己增加标号、选择区域、编辑说明 | §4 编辑模式、§6 持久化 |
| R-06 | 固化通用样式，避免每次重新设计 UI | §7 固定组件 |
| R-07 | 审查框架并确定节点、形式、实现计划 | §1–2、§9 |
| R-08 | 计划必须经过专家会审及红队对抗 | §11 独立评审 |
| R-09 | OD 原型与说明在同一份离线 HTML 内交付 | §2、§6；后续明确回复 |
| R-10 | UI、交互与动效调整完成，用户确认没问题后，再进入说明环节 | §2 的确认门；“动销”按当前语境理解为动效 |
| R-11 | 调研相关专业 UX 产品的侧栏和标号绑定做法，落实到计划 | §1 的外部范式研究及 §11 评审 |
| R-12 | UI/交互说明本身有专业 UX 写作规范；简明、给前端的人对人交付、术语通用、少 AI 腔；调研并明确规范落点 | §3.1 内容规范、U-001/006、A-11/C8 |
| R-13 | AI 只产出本次新增流程/模块/组件内的交互说明，模板其他范围不自动标注；人工添加/编辑/删除/重绑不受此范围限制 | §5.1 两套范围、U-001/003/004/006、A-12/C9 |
| R-14 | 对插入节点和实现形式再次做深度比较与评审，选出最适配方案并纳入计划 | 独立 decision.md、§2、U-009、A-13/C2/C7 |

该不该解：应解。用户已陈述重复发生的交付缺口，现有框架有事实/追踪文档，但无同屏可编辑说明层。证据规模是用户的一手需求加本次有限源码调查，不声称已测量多人效率收益。

更小替代：链接 prototype-spec.md 或 AI 每次写一套侧栏，分别缺少同屏编辑/定位或通用性，不能满足主要要求。推荐一个固定组件与薄加工入口，不建设账号、评论、协作服务器或通用可视化编辑器。

默认形态偏差：内嵌组件是用户明确约束，可能使我们低估单文件保存和 DOM 兼容成本；前端专家、框架专家与默认 REFUTE 红队分别挑战。成熟先例是 Axure 页面/组件说明，但其浏览器内不能编辑，本方案不把先例当现成功能。[官方说明](https://docs.axure.com/axure-rp/reference/page-widget-notes/)

KILL-01：关键 OD 输出可以在保持行为的条件下离线运行。若依赖服务端、远程模块或无法合法内联的资产，不能承诺单文件交付；暂停该输入的打包，保留已确认需求并回到来源处理。

KILL-02：标注层能在支持矩阵中与原型共存而不破坏任务。若真正 OD 样本验证不成立，应重做接入策略，不能用演示夹具成功宣称通用。

KILL-03：浏览器内编辑与完整文件导出必须能闭环。若只能留下本机缓存，R-05/R-09 未完成，不能降级宣布交付。

## 1. 框架现状与结论依据

下列路径均相对本框架根，已在本轮读取；事实、建议分开。

| 已核实的现状 | 依据 | 对方案的约束 |
|---|---|---|
| 设计路径汇聚 design-brief → open-design；本地 HTML 是用户选择的备选 | `.claude/skill-os/optional-workflow-graph.yaml` design_output/scenes/design_entry_paths | 主接入必须覆盖 OD，不能仅改 html-prototype |
| Brief 已有 D 决策、STATE、来源、AC、语义位置映射和唯一冻结 Packet | `.claude/skills/office/design-brief/SKILL.md` Phase 3/5/6/6.75；`references/input-contract.md` | 不新造第二份需求真值，不从最终像素反推业务规则 |
| OD Phase 4 按精确来源回收，并从实际 HTML 写 spec；Phase 5 验收；Phase 6 完成 | `.claude/skills/office/open-design/SKILL.md` Phase 4–6 | 说明加工放回收后、最终验收前 |
| 已有完成前 motion 子单元、exact candidate 和最终交付引用 | 同上；`.claude/skill-os/runtime/prototype-delivery.md` | 复用验收链，保留原始回收 provenance |
| 当前 helper 写死 motion-polish，并拒绝 source 与整个 delivery root 重叠 | `scripts/prototype-delivery.mjs` prepareCopy/attemptPath；schema v1；首轮框架独立审查 | 既要兼容 namespace，也要受限地承接同根内已 accepted 的前序产物；不能直接关闭 overlap guard |
| 本地 HTML 有 DECISION 注释、状态 harness、prototype-spec 和 QA | `.claude/skills/office/html-prototype/SKILL.md` Phase 3–4.5 | 可作为第二接入入口，但本期先完成 OD 路径 |

有限检索范围：office skills、scripts 中的 annotation/annotate/交互说明/批注；未发现承载本诉求的成品模块。此结论不外推到所有插件或未读业务项目。现有 `annotatedSlice` 是原件变更验证辅助，不是用户说明界面。

框架演进路由已评估：这次是用户指定能力的 propose-only 设计，不是月度 scout，也没有外部仓库作为 benchmark 目标；不启动全仓扫描、安装或成长簿记。

### 1.1 同类产品调研 → 具体设计决定

调研日期 2026-10-04；只引用实际读过的官方说明，未运行这些商业产品。完整逐事实证据、16 个来源及未知项见 [专项调研](./2026-10-04-prototype-notes-research.md)。下表左列是可核对的产品事实，右列是本方案的设计判断。

| 产品及已核实做法 | 采用什么、落到哪里 | 不照搬什么、原因 |
|---|---|---|
| **Axure**：页面/组件说明、数字标记、播放器侧栏；点说明可滚动定位并高亮（AX-1/2/3）[页面/组件说明](https://docs.axure.com/axure-rp/reference/page-widget-notes/) · [HTML 输出](https://docs.axure.com/axure-rp/reference/customizing-html-output/) | 页级整体规则 + 模块标号；双向定位；说明开关、标号显示控制。§3–4、A-02/06 | 不照搬随列表位置变化的编号；本方案序号稳定，避免交付引用失效。Axure 的说明编辑在 RP 内，不能证明本 HTML 的离线编辑已解决 |
| **UXPin**：右侧 Documentation；整体文字或段落 pin 到元素，号码联动；HTML 可包含 documentation（UX-1/2）[Documentation](https://www.uxpin.com/docs/sharing/documentation/) · [Exporting](https://www.uxpin.com/docs/sharing/exporting/) | 主说明写作简洁、细节渐进展开；与原型一起导出是完整交付的一部分。§3/4/6、A-04 | 官方材料未证明导出必为单文件，也未证明导出后能离线编辑；这两项是我们必须单独完成的能力 |
| **Zeplin**：位置 pin、Behavior/Requirement/Animation 等模板、分类过滤；组件绑定可随更新延续（ZE-1/2/3/4）[添加说明](https://support.zeplin.io/en/articles/5917337-adding-annotations-to-a-screen) · [组件绑定](https://support.zeplin.io/en/articles/6248711-linking-annotations-to-components) | 固定说明结构与轻量分类；锚点绑定语义组件，更新时验证；说明用于规格，讨论评论不混入首版。§3/5/6、A-05/06 | 不把静态画布坐标当 DOM 永久锚点；也不让重复组件默认指向第一个实例。唯一匹配失败必须显式待定位 |
| **Figma Dev Mode**：图层 annotation 带文字/属性/类别，属性可随设计更新；变更比较帮助看差异（FG-1/2/3）[Annotation](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs) · [变更比较](https://help.figma.com/hc/en-us/articles/15023193382935-Compare-changes-in-Dev-Mode) | 已变化/待复核状态；分类过滤；说明来源与当前实现分开。§4–6、A-05/08 | 不复制完整 Inspect 或逐像素参数库；图层更新不代表业务逻辑说明自动正确，人工改动必须保护 |

共同结论：成熟模式是“原型上下文 + 定位标记 + 结构化说明”，不是把长文档全铺在画面上。本方案的差异集中在 **真实可交互 HTML、同文件人工编辑与再导出、AI 与人工内容合并**。隐藏状态、断裂锚点与多版本内容冲突没有获得充分竞品证据，明确由本方案定义并测试，不能借竞品名义宣称成熟。

## 2. 加在哪个节点、用什么形式

```text
design-brief：已有的交互事实/状态/位置/AC
       ↓ 保持冻结 Packet 原合同
Open Design：生成原型
       ↓ 原合同 scoped recover，保留原始 HTML 与 receipt
UI / 交互 / 动效调整：在原 owner 的已授权范围内迭代
       ↓
用户确认本版没问题：冻结实际版本（尚未确认则停在原型迭代）
       ↓
交互说明加工：锁定本次新增范围 → 提取说明 → 对照实际 DOM/状态绑定 → 嵌入固定组件
       ↓
最终验收：原交互 + 说明准确性 + 新增/编辑/导出 + 离线重开
       ↓
OD 父节点完成一次：交付带说明的那一个 HTML
```

**形式：一级可调用的薄 `prototype-notes` skill + 唯一共享核心 + OD 完成前内部调用。** 固定运行时/UI、内容规范、合并和组包放在 office 共享 references 下；skill 只管输入、确认门、调用和完成责任，不另造 UI 或生成器。详见 [节点与形式决策复审](./2026-10-04-prototype-notes-decision.md)：比较公开薄 skill、仅 OD 内置、仅共享内部模块、全局 hook 四种形式，以及五个插入时机后，选择此方案。核心理由是首次加工和交付后的再次加工都需要明确入口。

OD internal 由 OD 负责确认和最终完成，notes 不另写 handoff/state；独立处理已有 HTML 由 prototype-notes 接单并写自己的 handoff，不重开历史 OD/motion DONE。两者不依赖强制 workflow graph。已有 HTML 可以直接输入，不要求伪造 Brief 或 OD recover；实际来源、范围和权限仍需明确。精确双模式及暂停恢复合同见执行手册 E7.4。

启用策略建议：用户批准落地本能力后，OD 的可交互 HTML 交付默认包含说明加工；只回收归档、没有交互交付意图的任务不误触发。当前计划批准仅授权框架能力实施，不一次性授予未来所有项目的读写/回收权限。每次承接已有有效交付授权，不重复问同一选择；明确关闭说明的交付保留原路径。

Brief 本期不新增 Packet 字段、不改变所有设计流程的必经节点；说明种子从现有映射与决策确定性组织，AI 负责表述。补不出的关键规则回源，不能现场篡改已冻结需求。

说明环节的入门条件是用户已确认 UI、交互和动效完成；已有确认直接继承，不重复询问。单纯 motion 测试 PASS、回收成功或自动 QA 不代替这次用户判断。这里不强迫无动效需求的原型运行 motion-polish，但仍需要用户确认最终原型。说明阶段发现行为差异时回原型 owner；修改导致版本变化后重核用户确认与说明定位，不能一边最终打标一边悄悄改原型。

现有 OD Phase 5 的“展示后不阻塞提问”仅在 notes-enabled 分支增加受限例外：展示当前业务版本后等待或继承确认，再加工说明；关闭说明/仅归档保持原路径。确认关联业务版本，完整输入文件与说明修订另有身份，单纯改说明不重复 UI 确认。技术只读检查可提前，实际文案/绑定/组包在确认后；HTML 内 bootstrap 先执行不等于流程上提前加工。

若 motion 已生成 accepted final：它成为说明加工的精确 base；原 motion 证据保留，带说明的新字节重新做最终组合验收。若只有 motion candidate，依原 owner 完成后再加工。禁止在已签收 HTML 上静默补脚本后沿用旧 final SHA。

## 3. 一条说明应该写什么

面向开发、产品、测试交付，不写“点击可点击”“这里是按钮”这类复述。一个标号对应一个有明确责任的交互区域，可含数条分支；不为每个装饰元素生成标号。

| 显示层次 | 内容 |
|---|---|
| 一行摘要 | 标号、模块名、说明类型、最关键规则 |
| 默认展开 | 触发条件/前置条件 → 操作后的反馈与状态变化 |
| 按需细节 | 数据校验、禁用/权限、异常/空态、取消/返回/恢复、键盘/焦点 |
| UI 明细 | 与交互有关的显示规则、溢出/截断、响应式、反馈时序；不重复整套视觉 token |
| 来源与差异 | 已确认规范 / 当前原型观察 / AI 建议；当前已演示 / 尚未演示 / 与规范不一致 |

“整体规则”用于同一流程内跨模块的校验或导航原则，避免复制到每个标号。AI 只能写本次新增范围的共同规则，不能顺带为模板全页补规范；人工可以增加整页规则。类型建议为“交互、UI、规则”；按当前页面/状态过滤，另有“全部”视图（包含人工在范围外添加的说明）。来源及实现状态是两条独立维度，AI 生成不等于 AI 猜测，人工编辑也不等于代码已实现。

示例（仅说明格式，不作为真实项目需求）：

> ③ 保存操作｜交互  
> 前置：必填项完整且本轮没有提交中任务。  
> 点击后：显示提交中反馈，防止重复提交；成功后关闭弹层并刷新列表。  
> 异常：保留输入，在操作区给出错误与重试入口。  
> 当前原型：成功分支已演示；真实网络失败未演示。  
> 依据：实际 D/STATE/AC 或用户确认记录。

### 3.1 说明内容写作规范（规范草案，随本计划一并审定）

**定位**：这是设计师交给前端的 UI/交互说明，读者应能据此判断“何时发生、画面怎么变、哪些操作允许、失败怎么处理”。既不是产品介绍，也不是给模型的提示词。默认使用自然中文，面向熟悉一般前端工作的读者；不要求读者了解本框架或 AI 工作方式。

**研究依据与迁移**：研究 WR-01/02 采用 [Carbon 输入框](https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines) 和 [弹窗](https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines) 将结构、状态、校验和操作分开说明的方法；WR-03/04 采用 [GOV.UK 错误提示](https://design-system.service.gov.uk/components/error-message/) 的问题/改法/输入保留，以及 [按钮](https://design-system.service.gov.uk/components/button/) 对动作差异、重复提交的明确描述；WR-05 借鉴 [Digital.gov 简明语言原则](https://digital.gov/guides/plain-language/principles) 的读者导向、主动语态与清晰组织。下述是针对本模块整理的规范，不声称是唯一行业标准；不直接复制这些设计系统的尺寸、焦点或禁用规则。

**唯一落点**：实施 U-001 时新增 `.claude/skills/office/references/prototype-notes/content-guidelines.md`，存完整规则、术语表、模板与正反例；同目录 `contract.md` 引用它作为内容权威，`notes.schema.json` 管机器结构，`runtime.js/panel.css` 管呈现。三者职责分开。OD 说明生成前读取该规范；独立内容检查也读取同一份；手工编辑表单仅显示简短提示和可插入模板，不把整份规范塞给用户。说明数据记录 `content_guideline_version` 便于以后兼容。没有第二份 OD 专用写作规则。

**与现有 ux-writing 的边界**：已核对该 skill，它处理产品 voice/tone 和面向产品使用者的界面微文案，OD 只经 Brief 接收其语义层。本需求处理回收后的交付说明，不改它、不绕过 Packet 边界，也不把交付说明写回产品按钮文案。

**每条的基础句式**：`在什么情况下 → 用户做什么 → 界面发生什么变化`。标题用具体模块名/行为，如“保存修改”“表格筛选”；正文先讲最重要的规则，常见目标是一句话或 2–4 条短句。每句只说明一项行为。字数只是编辑提示，不为压缩而省略必要分支，也不强迫简单模块填满所有字段。

| 写作要求 | 具体约束 |
|---|---|
| 写可实现、可核对的行为 | 用“输入为空时，点击保存后在该字段下方显示必填提示”；不用“提供完善校验”“体验流畅”“智能处理异常” |
| 说明范围明确 | 一个标号对应一个模块/动作及其分支；涉及其它模块写具体名称或相关标号，不把整页长文挂到一个按钮 |
| 状态按需完整 | 默认、选中、不可用、加载中、成功、失败、空内容、取消/返回、键盘/焦点逐项判适用；无适用性不机械生成空段落 |
| UI 写差异与规则 | 说明何时显示/隐藏、布局变化、文字溢出、滚动、响应式；固定视觉样式优先引用已确认设计规范，不抄完整 CSS |
| 数值与文案有依据 | 尺寸、时长、断点、字数限制、具体提示文字只取确认规范或实际原型；没有依据则标“待确认”，禁止 AI 凑一个看似专业的数值 |
| 失败必须有后续 | 涉及提交、校验、异步结果时写清错误位置、输入是否保留、能否重试以及恢复后去哪；不能只写“失败时提示错误” |
| 事实与待定分开 | 规范已定但原型没演示，写“原型暂未演示”；设计未定写“待确认”并说明待定事项；不把两者混成“AI 低置信度” |
| 统一名称与语气 | 同一模块/状态始终用同一个名称；直接陈述条件和行为，不出现“本 Agent 将”“推理链”“赋能”“闭环能力”“优雅降级”等无助交付的表述 |

**术语三级**：

- 直接使用行业常用词：按钮、输入框、弹窗、侧栏、标签页、选中、禁用、只读、加载中、空状态、悬停、焦点、校验。特别区分“禁用＝暂不能操作”与“只读＝能查看但不能修改”，“悬停/焦点/选中”不混写。
- 首次需要时补一句人话：防抖（停止输入后再执行）、乐观更新（先显示结果，失败再恢复）、骨架屏（内容加载前的占位）。没有对应行为就不引入这些词；不要堆 Toast/Popover/UE 等缩写。
- 默认正文避免：schema、payload、hydration、DOM selector、D/STATE/AC、LLM、token、置信度、tombstone 等内部字段或 AI 术语。确需前端知道的技术依赖放折叠“开发补充”，且来自已确认工程约束；不能由 AI 擅自指定接口、库或实现方式。

**轻量模板**：

| 模块 | 应说明的必要问题（有适用性才填写） |
|---|---|
| 操作按钮/提交 | 何时可用；触发结果；处理中能否重复操作；成功/失败与输入保留 |
| 输入与校验 | 输入条件；何时检查；提示位置；错误何时清除；键盘行为 |
| 列表/筛选 | 筛选何时生效；条件是否保留；无结果；分页/滚动是否重置 |
| 弹窗/抽屉 | 如何打开和关闭；取消后修改是否保留；背景能否操作；打开/关闭后的焦点位置 |
| UI/动效 | 触发状态；变化对象与结果；有依据的尺寸/时间；中断、返回、减少动态效果时的表现 |

正反例（虚构示例，用于说明写法，不能直接当作任何项目需求）：

> **不采用**：“用户触发提交事件后，系统基于异步状态机进行校验与幂等处理，以 Toast 完成闭环反馈，实现优雅降级。”
>
> **采用｜③ 保存修改**  
> 点击“保存”后开始提交，提交期间不能再次点击。  
> 保存成功后关闭弹窗，列表显示修改后的内容。  
> 保存失败时保留已填写内容，在保存按钮上方显示错误，用户可再次提交。  
> 原型暂未演示：保存失败。  
> 待确认：错误提示的具体文字。

**校验方式**：自动检查字段、空内容、引用、重复编号和可确定的术语不一致；长度及措辞提示只提示、不强行截断。独立 UX/前端审阅检查行为可理解、分支完整、没有无源数值或伪实现信息。关键动作的未决设计规则须回源解决，或由设计师明确作为待定范围交付，不能被“文案顺畅”掩盖。人工修改不会被语言检查锁住，也不会被 AI 自动改回。

**呈现要求**：面板默认显示标题、行为及例外；来源用“说明依据”，实现差异用“原型暂未演示/与当前原型不一致”，细节折叠展开。机器 ID、合并状态和校验日志不进入默认正文。接收者可按标号找到模块，不需要先阅读框架术语说明书。

## 4. 统一 UI 与操作逻辑

**关闭态**：只留低干扰的“交互说明”入口；没有标号、轮廓、全屏遮罩、全局快捷键或拦截层。除说明入口自身外，业务页面的布局、滚动、表单、键盘和 URL 保持原样。

**查看态**：右侧覆盖式面板，建议宽 360px、上限不超过视口；用系统字体、中性色、固定强调色，仅作用于说明组件。标题/数量/关闭 → 当前页或全部/类型过滤 → 页级规则/标号列表 → 底部“编辑说明”“下载 HTML”。这些是拟采用的组件规范，待首个真实样本验证后一次定版。

面板覆盖而不挤压/缩放原页面，避免改变 OD 原型断点。提供左右换边与收起；目标被侧栏挡住时提示换边/收起再定位。窄屏用底部抽屉，查看说明与操作原型可切换，不宣称能同时完整展示。

点标号：对应列表项选中并滚入面板可见区域。点列表项：仅在目标真实可见时高亮和滚动定位。业务区域仍可正常交互；标号有独立点击命中区，绝不把整模块变成说明按钮。

**隐藏状态**：弹窗尚未打开、其它 Tab、其它逻辑页的说明继续保存在“全部”列表，显示“需先打开…”。优先给进入步骤，不自动点业务按钮、提交、切换路由或复位状态。用户自己进入该状态后标号自动出现。无可靠进入步骤则写“当前不可定位”，不假造。

**编辑态**：显式进入，出现“新增说明”。点击先选择“区域说明”或“整体规则”。区域说明进入一次性选区：悬停高亮，点选元素/模块，必要时向父级调整；确认后分配标号并打开表单，选区不触发原按钮。整体规则直接打开表单，默认适用整份原型，也可选当前已知页面/流程；不强制选择元素、不伪造锚点、不要求 AI scope，保存后进入整体规则列表，不在画面制造标号。两条路径都有稳定引用号，支持编辑、删除、撤销及下载。Esc 取消选区，返回编辑态；离开编辑态恢复全部原交互。

**纯键盘选择**：用 Tab 进入“新增说明”或“重新绑定”，新增时先用键盘选择区域说明或整体规则；整体规则直接聚焦标题。选择区域说明或重新绑定后默认聚焦面板内的目标选择树；树从当前有效页面根开始（modal 打开则从该 modal 开始），包含可见可标注的模块，即使它本身不能获得业务焦点也可被选择。上下键在同级目标间移动，左右键展开/收起父子，显示目标名称/类型和轮廓预览；Enter 只确认说明目标，绝不向业务元素发 click；Esc 取消并恢复发起按钮焦点。无名称目标用元素类型与相邻文字作只读定位提示，不猜业务语义。树有搜索、可访问名称和当前层级提示，过滤掉工具自己的节点及 inert/不可见元素。该路径覆盖首次选择、换目标和重新绑定，不依赖鼠标先选一次。

人工目标树和鼠标选区始终覆盖整份原型中当前可操作、受支持的区域，**不按 AI 生成范围裁剪**。用户进入其它 Tab/弹窗后也可在那里新增；范围外的说明同样能编辑、删除、撤销、重绑和导出。限制仅来自相同的可定位技术边界，不能把“不是本次新增模块”当禁止人工编辑的理由。

说明编辑采用标题 + 主说明文本，条件细节可展开，不要求每条填完巨型表单。支持修改、删除、撤销删除、重新绑定目标。新建完成立即看到预览。面板提供“未导出修改”状态，避免把缓存误称文件已保存。

**编号**：稳定内部 annotation ID；用户所见序号首次分配后不变，删除留空号，新建不复用；过滤/排序/AI 更新不重编号。真正多版本合并的冲突靠 ID/版本处理，不靠“第几个元素”。

**密度与无障碍**：默认只显示当前可见状态的标号。密集重叠时聚合成可展开标号组，不静默隐藏说明；选中标号显示模块边界。标号有可访问名称和足够命中区域，焦点可见，关闭面板恢复焦点；非模态侧栏不困住焦点，窄屏模态抽屉才管理焦点循环。颜色不是唯一状态提示，动效尊重 reduced-motion。

**查看控制**：开关打开后默认同时显示侧栏和标号；面板内另有“显示标号”开关，可暂时清理画面而继续读列表。筛选同时作用于列表与标号，选中项若被新筛选排除则清除选中并显示筛选结果数量。不把“没有匹配说明”误写成“此页面没有说明”。

## 5. AI 初稿、人工编辑与版本更新

生成顺序：本次新增范围与任务来源 → 该范围内的实际 Brief/Packet/AC（有则读） → 对应原型操作观察与 DOM → 已有说明文档/人工修改。每个说明保留来源定位及版本。AI 输出经 schema、范围校验与原文/行为对照后才进入交付。

必须覆盖新增范围内的全部适用动作、分支、禁用条件、错误恢复和非显然 UI 行为，关键动作优先审查。覆盖分母取该范围的真实 D/STATE/AC 及实际行为清单，不以模板全页或生成条数作分母；没有上游映射时由实际任务范围建立清单，不能缩减到“只写几个主要按钮”。一个说明可关联多个 source ID；没有来源的补充标为“建议/待确认”，不能伪写成既定业务规则。原型可观察行为与规范不一致时同时保留差异，不用说明掩盖 bug。

AI 在框架生成/更新时工作；离线 HTML 只运行查看和人工编辑，不包含模型密钥，也不假称断网可以重新生成 AI 内容。

更新合并单位：每个 annotation 的每个字段。保存上次 AI 基线、当前文本、人工修改标记及修订号。AI 只自动更新未人工改过的字段；双边都变更时保留人工值并产生待比较建议，绝不 last-write-wins。人工新增项保留；人工删除留下 tombstone，下一次 AI 不复活它。

**更新建议的人工处置**：有冲突的卡片显示“有更新建议”，进入编辑后可逐字段展开“当前文字”和“更新建议”，附简短依据。提供“保留我的版本”“采用建议”“稍后处理”；不得批量默认采用。保留只清除本次建议而保持人工文字，采用只替换该字段并继续标为人工确认过的编辑，暂缓保留原文和未处理提示。处理不会自动把建议变成已确认事实或已实现行为；详细数据与再次生成的去重规则见执行手册 E3。下载允许带未处理建议，提示数量且保留原文；工程最终验收仍须处理影响关键规则的冲突。

OD 重新生成导致 base hash 改变：先带入旧说明，再重新验证定位与源语义。只有稳定锚点且语义仍一致的项可自动沿用，模糊匹配仅提出候选，进入“待重新定位”。UI 顺序改变不能把原标号指向另一业务对象。某来源规则已改变时标为“说明可能过期”，即使原 DOM ID 仍存在也必须复核。

后续要继续加工时，用户提供最新版完整 HTML 即可，框架从其中提取说明数据；不要求用户管理 JSON 文件。本地可保留机器旁车作为构建证据，但它不是用户交付时必须附送的文件。

### 5.1 AI 生成范围与人工标注范围分离

**AI 范围是本次工作范围，不是整份 HTML，也不是人的权限。** 例如模板已有导航、客户列表和设置，本次只新增“批量导入流程”，AI 只解释导入入口、上传、校验、预览、结果及其适用状态；不为旧导航、原客户列表和设置生成标号。设计师仍可手动给旧导航加一条说明，并正常修改/删除它。

生成前由本次用户任务、已确认 Brief 的位置/决策映射与最终版本，共同组成 `generation_scope`，记录明确的流程/模块/组件、页面与状态及对应锚点集合。模板基线与变更比对只能辅助核实；不能因“所有 DOM 都重新生成了”而把全页纳入，也不能因一个流程跨几个页面就截掉后续状态。范围已在任务中明确则直接继承；有歧义时只澄清歧义部分，不默认扩大到全模板。

AI 每个新增标号及说明都必须归属当前 scope 内的明确对象；页/流程级规则也必须有该 scope 的归属。涉及范围外的依赖，可在本条中用现有模块名说明前后关系，不主动给范围外目标新增标号或独立说明。共享组件按此次流程的实例和状态判归属，不凭相同组件名向所有实例扩散。用户明确要求修改现有部分或扩大范围时，只把被授权的部分加入本轮 scope。

每条说明记录创建来源 `ai/manual` 和所属生成批次；人工编辑沿用字段级保护。再生成仅在当前 scope 内合并 AI 内容；**范围外已存在的人工或 AI 说明均保持原文和存在性，不因这轮不覆盖就自动删除、改写或重新编号**。全局锚点健康检查可以提示旧绑定失效，但不能借检查自动改写范围外内容。人工删除仍按 tombstone 保留，即使下次 AI 覆盖到该模块也不自动复活。

UI 的“新增说明”“删除”“重新绑定”不读取 generation_scope 作为许可条件；“全部”列表包括所有说明，范围仅可用作查看筛选。人工在范围外新增条目后，如另外明确请 AI 帮写该条，则授权只扩到这个目标，不扩到整个模板。离线页仍仅人工编辑，AI 更新在框架端完成。

范围校验失败（越界新标号、匹配歧义或新增范围覆盖缺项）阻止本轮自动生成通过；保留可审查草稿与问题清单，不删除用户原 HTML 或旧说明来“满足范围”。

## 6. 数据、锚点与单 HTML 保存

逻辑模型：`document_id + base_revision + notes_revision + schema_version + runtime_version + content_guideline_version + generation_scope + annotations[]`。

每条 annotation 至少包含：`id/display_number/title/kind/body/details/source_refs/evidence_status/implementation_status/anchor/page_or_state_context/revision/creation_origin/generation_scope_id/field_origins/tombstone`。人工项允许 generation_scope_id 为空，不要求强挂到 AI 范围；不适用字段允许明确为空，不能伪造来源。schema 管版本迁移；不支持的新版本拒绝覆盖，允许原文件原样保留。

锚点优先序：实际稳定语义 ID/已有明确区域标识 → 在授权副本注入的 `data-luca-note-anchor` → 同一 base 版本内的 scoped selector + 语义指纹。一个定位必须恰好匹配一个当前目标；0 个=未找到，多个=歧义。屏幕 x/y 只用于渲染位置，不能做永久定位键。重复列表用稳定行 key 加区域定位；没有稳定 key 时绑定列表模块，不能把某一屏第 3 行当永久对象。

人工新标注需同时保存定位记录与必要注入映射。动态重新渲染丢失 attribute 时，只有同 base、同状态、指纹严格验证通过才恢复绑定；不能悄悄绑到同文案的另一元素。canvas 内子区、跨域 iframe、closed Shadow DOM 初期只支持整体模块定位，不能声称可精准选内部元素。

**主保存流程**：编辑 → 显示未导出 → “下载 HTML” → 生成含最新说明的完整文件 → 用户把新文件发出。打开文件默认说明关闭、原型在其自身初始状态；说明文本和锚点保留。普通浏览器下载不能证明文件已落在用户选择位置，按钮反馈用“已发起下载”，不伪称已覆盖原文件。

导出不能序列化运行中的 `document.documentElement.outerHTML`：那会把临时弹窗、输入值、标号、组件运行态混入，且不等价于初始应用状态。构建时保留可重建的原型源快照（惰性编码）及固定 runtime；导出由同一纯组包函数用原始源 + 最新标注数据重建。标注 host/runtime 只装配一次；导出再导出不能嵌套快照或翻倍累积组件。原型原本的持久化行为保持原合同，说明导出不承诺保存现场业务数据。

文本以惰性数据嵌入并安全转义 `<`/脚本结束串，渲染用文本节点；初期不接受任意 HTML、脚本或可执行链接。导入也验证 schema/大小/版本/身份，不能执行所读 HTML 来“抽取说明”。

浏览器缓存只作尽力草稿备份，键包含 document_id/base_revision；可禁用、可失败，失败时告知“草稿仅在当前页面，请下载保存”，编辑及下载继续可用。file URL 的 localStorage 行为未被可靠保证，不作为交付真值。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

不依赖原地写文件 API 作为必经路径；该能力的可用性和上下文限制不适合作为统一离线底座。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)

**单文件资产边界**：OD 原始 HTML 已自包含时直接加工。若有本地 CSS/经典 JS/图片/字体，先检查完整闭包，批准的确定性内联才进入单文件构建，并记录转换及行为回归；模块图、动态 import/fetch、服务端路由或缺失资源不能靠删依赖解决。出现不支持输入时报告具体依赖清单，不能把“只含侧栏的单 HTML”冒充整个原型离线可用。

**验收身份与人工后编辑**：框架验收票绑定原型和说明当时的精确字节。浏览器内修改后导出形成新 notes_revision，清除对当前版本“已独立验收”的暗示，保留来源版本信息。重新进入工程链须对最新版重验；不得拿旧证书覆盖新说明。用户可正常交付人工编辑版，不被伪造的证书流程阻止编辑。

## 7. 通用组件如何实现

固定、版本化、无外部 CDN 的原生 JS/CSS 组件；同一份 runtime 打进所有支持的原型。AI 只生成内容与锚点映射，不生成侧栏 UI 代码。

直接嵌入原型文档，说明 UI 放独立 Shadow Root，标号在受控覆盖层；不另开窗口、不用 iframe 包住原型、不重排业务根 DOM、不改业务全局 CSS。Shadow DOM 只负责样式隔离；事件和原生模态分别按下面两项工程决策处理，不能把 Shadow Root 当安全沙箱。

**选区及工具事件隔离（P1 必须证明）**：构建器在原 HTML 的任何业务脚本执行前放入最小同步 bootstrap，在 window capture 最先登记工具事件闸门；原始源码快照仍保持原件，重新组包每次只插入一份。查看标号、编辑表单的事件通过 composedPath 识别工具 host，阻止继续传播给业务全局监听但保留工具需要的浏览器默认行为；选区用专用透明命中层，闸门阻断 pointer/mouse/touch/click/contextmenu 和选区键盘事件并取消业务默认动作，按坐标对底下 DOM 做只读命中测试，不重放点击。输入框键盘/IME、选择文本及 Tab 焦点有独立测试；关闭态闸门直接放行、不设置快捷键、不取消或改变任何事件。禁止靠业务脚本之后添加的捕获监听器补救已发生的动作。

安装成功必须能证明 bootstrap 位于所有原脚本之前，且实际探针确认工具事件不落入业务全局 capture handler。CSP 或不可改写加载器不允许此前置时拒绝该输入的编辑能力，不能宣称通用 PASS；关键路径依赖这些能力则阻塞该原型交付。原型以定时器/焦点状态等间接驱动业务的兼容性仍须真实样本回归，闸门不是对任意脚本的安全隔离承诺。

闸门对工具事件调用 stopImmediatePropagation 后，事件也不会继续到工具目标节点；因此工具采用同一个早期控制器直接处理 composedPath 对应的命令，不再依赖目标/冒泡阶段的 click、input 等监听，也不向页面重新派发模拟事件。文本输入需要的原生默认行为保留，随后 input/composition 由同一控制器同步数据。P1 必须同时证明“业务计数不变”和“工具按钮、输入/IME、选择文本、Tab/焦点仍正常”，不能仅靠阻断所有事件获得假通过。

**原生 modal 与顶层（P1 必须证明）**：首版支持同一时刻一个原生 modal dialog。无 modal 时工具 host 挂 body；modal 开启后，把工具自有 host 移到该 dialog 的后代中，并用 manual popover 进入 top layer，避免同级 host 被 modal inert，亦避免仅靠 z-index。只移动工具节点，不移动业务节点，不移除原 inert、不关闭业务 modal。工具 model 独立于 host，迁移保留未提交文本；退出 modal 后迁回 body，焦点恢复到仍连接且可聚焦的来源，否则回说明入口。选区仅能命中当前 modal 的有效交互区域，不能穿透选择其后方被 inert 的页面。面板内 Escape 先退出选区/面板；普通业务 Escape 保留原 dialog 行为。

多层同时存在的原生 modal、业务主动移除工具 host、浏览器缺 popover 或无法保持原焦点合同，首版不承诺完整编辑支持；显示明确的当前状态限制且保留说明数据，若涉及本次必要说明/编辑目标则验收 FAIL，不能拿“列表还能读”关闭关键断言。需通过 P1 的真实 OD 纵切和单 modal 夹具，才能冻结该实现；失败先重规划，再做完整 UI。

上述是待实测的工程方案。[showModal 的 inert 规则](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) 和 [Popover 顶层行为](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) 支持问题边界，不等于已证明整套组合可行。

定位更新覆盖 window/容器滚动、resize、布局变更、DOM 重绘；只在说明开启时观察，requestAnimationFrame 合并更新，关闭卸载观察器。重绘不反复扫整棵树；初期性能验收固定在真实样本和高密度夹具上。

顶层 dialog/popover、position:fixed/transform、缩放和嵌套滚动必须进入测试矩阵。不得仅靠一个极大的 z-index 宣称覆盖全部。无法可靠显示时保留列表说明并明确不可定位；关键交付节点不可定位则不能判完整 PASS。

三层责任：

1. 内容/数据层：来源、版本、人工修改保护、合并、迁移；纯函数可测试。
2. 浏览器层：开关、面板、标号、选区、编辑、定位、下载；不拥有产品业务逻辑。
3. 构建/框架接入层：输入核验、源码装配、离线闭包、exact candidate、证据和父级完成；不代替 AI 语义审查。

## 8. 本期支持范围与不做项

本期必须：OD 回收 HTML；同文件查看/编辑/新增/删除/重新绑定/下载；AI 有源初稿；人工改动保护；单文档多状态/逻辑页；桌面编辑与窄屏查看；离线重开；原交互保持；固定样式。

先覆盖自包含 HTML 与能安全确定性内联的常规本地资产。复杂打包输入不能静默改变交付方式。多 HTML 跨文件站点不作为已支持的“一个 HTML”，需以后单独界定打包能力。

本期不做多人实时协作、云存储、账户权限、评论审批、网页任意元素设计编辑、浏览器内在线 AI、PDF/Word 自动规格书。接收者“查看/编辑”是操作模式，不是不可篡改的安全权限。

其它本地 HTML/MagicPath 的默认完成前接线以后单独决定，本期不扩展这些生成器合同；它们已产生、被用户明确选择且满足支持矩阵的 HTML，可直接从 prototype-notes standalone 入口加工。

## 9. 可执行实施计划（待用户批准）

复杂度：Sequential Chain + Supervisor；Standard，9 个稳定 U-block。模型：执行 `core-execution/anchor`；关键会审 `reasoning-heavy`，依据 model-routing P1/P2，Codex 实际使用登记的 quality-gate/MR-004，不硬编码模型名。执行串行，每阶段独立检查；不自动发布 Git。产品 tech-spec/task-plan 的反向 DEV 检查 N/A：本次是框架能力实施，没有既有产品 task-plan。

本地流程/合同、官方保存边界及 Axure/Figma/Zeplin/UXPin 专项调研已完成，采用与不采用理由见 §1.1。额外盲区验证是交付接收者能否在不听设计师讲解的情况下完成查找任务，放 P4 真实样本验收。

### P1 契约与最小可行性（task_execution；串行；core-execution）

WA-1=实施 owner；EA-1=冷 quality-gate。产物：模块合同/schema、真实样本可行性记录。门：同页注入、离线导出、重复导出、原交互保持可行，kill-assumptions 未被推翻。

- **U-001** Goal：冻结内容写作、状态、保存与锚点合同。Source：R-01/03/04/05/09/12/13。Dependencies：用户批准本计划。Files：新增 `.claude/skills/office/references/prototype-notes/contract.md`、`notes.schema.json`、`content-guidelines.md`。Approach：将 §3–8 变成有限数据合同、兼容表、AI 与人工范围分离合同及唯一内容写作规范；采用研究证据及 §3.1 的术语/模板/正反例。Read List：本计划 §3–8、research.md 写作研究、Brief Phase 3/6/6.75、prototype-delivery owner。Test scenarios：无上游/有来源/人工改动/规则冲突；提交、输入、列表、弹窗、UI/动效五类说明的易读性及分支。Verification：schema 拒绝重复 ID/序号/未知版本/错误来源；A-11 内容审阅不伪造规则与数值。Status：PLANNED。
- **U-002** Goal：以一份用户已授权的真实 OD 回收物验证同文件加工、事件/模态隔离与导出。Source：R-05/06/09。Dependencies：U-001；external=执行时明确样本路径、当前读写/运行权限、真实 recovery receipt。Files：新增 `scripts/test-prototype-notes-browser.mjs`；夹具由此脚本生成到自身临时目录，证据留在本轮 framework-audit 子目录。Approach：最薄固定壳、一个标号、一次人工修改、两次导出重开；同时冻结 §7 bootstrap 顺序、modal host/focus 与支持边界。Read List：OD Phase 4–6、project-verification owner、现有 browser test 生命周期处理。Test scenarios：真实 OD 样本/原型状态变化后导出/禁止存储/资源缺失；业务最早注册 window capture pointerdown、keydown/IME；原生 showModal 下新增/编辑/关闭/焦点恢复，包含 transform/overflow 的容器。Verification：§10 A-01/03/04/07/09 纵切；移除 bootstrap 闸门应触发业务计数器导致 RED；没有真实样本只能关闭夹具子项，不能关闭本单元。Status：PLANNED。

### P2 完整组件（task_execution；串行；core-execution）

WA-2=组件唯一 owner；EA-2=UX/前端冷审。产物：固定组件、构建器与行为测试。门：R-02/03/05/06/09 全通过，数据独立于 UI。

- **U-003** Goal：实现说明数据校验、人工优先合并和幂等组包。Source：R-04/05/09/13。Dependencies：U-001/002。Files：新增 `scripts/prototype-notes.mjs`、`scripts/test-prototype-notes.mjs`、共享 `prototype-notes/core.js`、`generation.md`；修改 package.json/package-lock.json 锁定构建侧 parse5@8.0.1（仅实施获批后安装）。Approach：公开最小 seam `validateNotes/validateGenerationScope/mergeNotes/buildAnnotatedHtml/extractNotes`，不引入框架或服务。Read List：模块合同、当前 delivery helper 的 closure/patch 规则。Test scenarios：AI 双边冲突/删除复活/生成越界/范围外人工保留/导出再导出/脚本结束串/未知版本/输入 hash 漂移。Verification：A-04/05/07/08/12 纯函数与文件往返测试。Status：PLANNED。
- **U-004** Goal：实现同页面板、双向定位、选区及编辑。Source：R-02/03/05/06/12/13。Dependencies：U-003。Files：新增 `.claude/skills/office/references/prototype-notes/runtime.js`、`panel.css`；扩展 U-002 的浏览器测试（唯一 owner 顺序移交）。Approach：隔离 UI、有限观察器、模式切换、稳定锚点、全原型人工选区；内容模板及编辑提示来自同版 content-guidelines。Read List：模块合同 UI/anchor 章、content-guidelines、已确认样本 DOM/交互证据。Test scenarios：正常/隐藏状态/重复目标/嵌套滚动/纯键盘首次选区与重绑/无目标整体规则/更新建议逐字段处置/窄屏/弹窗/异常缓存。Verification：A-01/02/03/06/09/11/12。Status：PLANNED。

### P3 框架接线与验收身份（task_execution；串行；core-execution）

WA-3=接线唯一 owner；EA-3=框架冷审。产物：OD 自动加工分支、兼容 delivery helper、最终同文件交付。门：不提前 DONE，不更新错误的 final，不绕过原回收权限。

- **U-005** Goal：覆盖普通 raw 的非重叠根接入、说明加工 namespace，并受限地承接同根内 accepted motion。Source：R-07/09/10。Dependencies：U-003/004。Files：修改 `scripts/prototype-delivery.mjs`、`.claude/skill-os/prototype-delivery.schema.json`、`.claude/skill-os/runtime/prototype-delivery.md`、`scripts/test-prototype-delivery.mjs`，新增 `scripts/fixtures/prototype-delivery-v1/` 下基线 helper/schema 两份只读测试快照。Approach：普通 raw→notes 使用同项目带日期的相邻非重叠交付根，遵循现有 prepareCopy；增加可枚举 `processor_id`（motion-polish/prototype-notes）与专用 `derive-from-accepted` 路径；旧无字段 v1 保持原 motion 路径与校验。派生入口只接受 caller 已授权且通过现有 resolveFinal 重验的 exact accepted ref，绑定前序 final/content hash、原始 provenance 和新 processor/attempt；复制前后重验源，新 attempt 必须与前序 content 实路径互不重叠，不覆写原版本。普通 prepare 的 SOURCE_OUTPUT_OVERLAP 保持原样，不接受任意同根目录、raw、candidate、symlink escape 或假 accepted metadata 进入例外。不建任意插件执行器。Read List：上述四文件 prepare/attempt/candidate/resolve、前序 raw/base provenance 与旧证书 fixtures。Test scenarios：同一 delivery root 的 accepted motion→notes 成功；未 accepted、失效票、无读权、源漂移、路径/实路径重叠、非法 processor 转换、未知 processor 均拒绝（只允许已 accepted motion→notes；见执行手册 E7.2）。Verification：A-08/10；旧原始证书字节 fixture 可 resolve；测试不能靠关掉 overlap guard 通过。Status：PLANNED。
- **U-006** Goal：在 OD 回收与 UI/交互/动效确认后生成有源说明并完成一次交付。Source：R-01/04/07/09/10/11/12/13。Dependencies：U-005。Files：修改 `.claude/skills/office/open-design/SKILL.md`、`.claude/agents/quality-gate.md`、`.claude/agents/orchestrator.md`、`.claude/skills/office/html-prototype/SCHEMA.md` 的 Exact derived delivery identity 节、`.claude/skill-os/skill-invariants.md` P2/P7、`.claude/skills/office/references/handoff-protocol.md` 的最终原型消费段；扩展 `scripts/test-prototype-notes.mjs` 接线负例。Approach：复用同一父 Phase，既有映射抽取内容；锁定新增 scope、生成前后检查范围与覆盖；生成与内容审阅必读同版 content-guidelines；为 notes-enabled 分支明确 Phase 5 确认例外，记录用户确认所对应的精确业务版本；有限扩展 P7 的 notes/motion→notes 输出例外而保留单次父完成；局部 authority、AI 内容 gate、notes 及原交互全量验收后绑定 final_entry，原 receipt 保留；新 observation spec、processor-aware PREACCEPT、notes_manifest_ref 和源/父级 required 集合的继承按执行手册 E7.3 接入。Read List：OD Phase 4–6、QG 前端/PREACCEPT、Orchestrator postprocess 分支、模块合同、content-guidelines。Test scenarios：正常 OD/只回收不加工/明确关闭/尚未用户确认/确认后原型又变化/缺来源标记/仅 staged/旧 raw FAIL/加工失败/accepted 动效组合/人工新版本/说明无源数值或 AI 术语。Verification：A-05/08/10/11/12 的真实消费与拒绝案例；不靠 grep 证明执行。Status：PLANNED。

- **U-009** Goal：建立薄公开 skill 与 internal/standalone 双模式，解决交付后再次加工入口。Source：R-05/07/09/10/13/14。Dependencies：U-006。Files：新增 `.claude/skills/office/prototype-notes/SKILL.md`、同目录 `agents/openai.yaml`、`.claude/commands/prototype-notes.md`、`.claude/skills/prototype-notes` 与 `.agents/skills/prototype-notes` 两个 alias、`scripts/test-prototype-notes-registration.mjs`；修改 `.claude/skill-os/skill-routing-map.yaml`、`routing-chain-check.md`、`input-modes.yaml`、`model-routing.yaml`、`codex-viability.yaml`、`.claude/skills/office/references/office-wizard.md`、`scripts/check-skill-scene-coverage.py`；生成 catalog/input 等真实投影。skill-visibility.json 验证默认可见，不无故改冗余配置。Approach：严格执行 decision.md D5、执行手册 E7.4 的输入、路由、确认、恢复、单次完成与 rebase 合同；不改 optional-workflow-graph。Read List：decision.md、E7.4、office/input-modes/workflow-mode/skill-invariants/model-routing 及 motion 注册先例。Test scenarios：直接调用/语义命中/泛化词反例、OD internal、已完成 motion、仅改说明/手改业务 HTML 的回流、缺确认/断点恢复。Verification：A-10/13 的真实消费及反例，不只查文件存在；两端真实运行留至 U-008。Status：PLANNED。

### P4 交付验证与定版（task_execution；串行；core-execution）

WA-4=测试及证据 owner；EA-4=独立终验。产物：完整行为报告、固定 UI 基线、接收者试用记录。门：所有 BLOCKING 通过；未知平台不得称已支持。

- **U-007** Goal：验证完整离线交付循环并做关键 mutation。Source：R-01–06/09/12/13。Dependencies：U-006/009。Files：修改 package.json、scripts/verify.sh、.github/workflows/ci.yml、scripts/check-ci-contract.mjs、scripts/test-ci-contract.mjs；扩展 `scripts/test-prototype-notes-browser.mjs`、`scripts/test-prototype-notes.mjs`；证据写 framework-audit 本轮目录。Approach：真实点击和下载，新浏览器 profile/改名移目录重开，断网；至少 Chromium 与一个独立引擎验证本期支持矩阵，缺浏览器保留阻塞。Read List：§10、project-verification owner、实际 runtime/source hash。Test scenarios：全部 A-01–13（A-11 由独立 UX/前端语义审阅，不能用正则代替）；删除人工保护/唯一匹配/旧验收失效/生成范围四类 guard 必须测到 RED，恢复后 GREEN。Verification：下方完整命令集与逐 ASSERT 证据。Status：PLANNED。
- **U-008** Goal：完成跨 harness 接入复核、用户 UI 采用与发布前交付说明。Source：R-06/07/08/12/13。Dependencies：U-007。Files：更新本计划进度及会审记录；新增能力使用说明写入已建 contract，由 U-009 的薄 skill 引用；涉及生成视图只运行原生成器更新其真实派生文件。Approach：Claude/Codex 各验证实际触发/执行/拒绝路径，用户确认一次固定组件样式；前端接收者完成五类说明查找和复述任务，若由 agent 模拟须标明，不能冒充真人试用。Read List：cross-harness owner、当前共享 skill aliases、实现 diff、A/C 全部结果。Test scenarios：双端正确消费/能力缺失拒绝/接收者从标号找到规则/新版说明不冒旧 PASS。Verification：A-10/11、C1–C9 全通过；无真实 harness 证据则不得宣称双端完成。Status：PLANNED。

Wave：U-001 → U-002 → U-003 → U-004 → U-005 → U-006 → U-009 → U-007 → U-008。所有 U-ID 已冻结，不重编号。

估算（非承诺）：执行细化后按 P1 1–2 天、P2 2–3 天、P3 2–3 天、P4 1–2 天安排，总计约 6–10 个工程日；真实 OD 资产打包复杂度和外部输入就绪时间可能增加耗时。P1 先证伪成本最高的假设，再投入完整 UI。

## 10. 行为验收与可执行检查

| ASSERT | Given / When / Then | 防止的失败 |
|---|---|---|
| A-01 | 给定真实 OD 页面；关闭/开启/关闭说明；原任务、布局、焦点与滚动不变，只有说明开关占其小区域 | 注入破坏原型 |
| A-02 | 给定多个已绑定模块；点击标号/列表项；双向选中正确且目标无遮挡/可恢复查看 | 标号和内容错位 |
| A-03 | 给定原型最早注册的 window capture pointerdown/keydown 业务计数器、按钮和非可聚焦模块；鼠标选区及全程无鼠标的首次树选择/父子遍历/重新绑定/取消，编辑/IME/删除/撤销，以及无需选区的整体规则创建/编辑/删除/导出；业务计数不变、编号稳定；退出后原业务可用；移除早期闸门出现 RED | 首次键盘无路可走或选区误触业务 |
| A-04 | 改过说明且原型切到中间状态；下载两轮、改名/换目录/清空存储/新 profile 断网重开；说明完整，原型初始可运行，组件恰好一份 | 仅缓存或 live DOM 导出丢交互 |
| A-05 | 人工改写/新增/删除，AI 重新生成且规范与观察冲突；人工内容保留、删除不复活；逐字段保留/采用/暂缓、撤销处理及重开保留均正确，已处理的相同建议经多轮生成及导出回流仍不反复出现，同context重绑另一目标后必须重新审查，旧建议不得直接采用；差异显式出现、无源断言未升级事实 | AI 覆盖与幻觉 |
| A-06 | 隐藏 Tab/弹窗、DOM 重绘、重复文案、不同列表行、基线变化；仅真实唯一目标出现标号，歧义保留待定位；不自动执行业务动作 | 错绑与隐藏副作用 |
| A-07 | 缓存抛错/超额、未知数据版本、注入字符串、外部资源缺失；可用编辑可导出、错误明确、安全渲染、不能伪称离线完成 | 丢稿/脚本注入/假离线 |
| A-08 | 已签收版本被修改或说明 revision 改变；旧票无法代表新版本，旧 raw/spec/receipt 保留；不提前 DONE | 验收对象漂移 |
| A-09 | 键盘/窄屏/高密度/嵌套滚动/zoom/单原生 modal（含 transform/overflow）；面板处于有效 modal 内且可编辑、无背景穿透，关闭/重新打开保留文本并恢复焦点；多 modal/能力缺失显示边界；必要状态不支持阻止完整 PASS | inert、遮挡与焦点错误 |
| A-10 | Claude 与 Codex 各消费同一 OD 分支；正常、缺权限、未回收、缺浏览器、未获用户确认、确认后版本变动、notes 失败均走准确出口；同根 accepted motion→notes 成功，raw/candidate/无效票/实路径重叠拒绝；旧 motion 证书继续有效 | 单端、过早加工或拆掉保护才接线 |
| A-11 | 给定有源的提交/表单/列表/弹窗/UI 动效说明；独立 UX 与前端审阅者不听作者补充，仅读说明与原型，就能指出触发条件、可见结果、必要例外及待定项；与原始规则核对无关键遗漏、无源数值或含混术语；自动生成及人工模板遵循同版规范 | 看似专业但不能给人交付 |
| A-12 | 给定模板已有 A/B 与新流程 C（跨页面和隐藏状态），同名组件在 A/C 各有实例；AI 只在 C 生成并完整覆盖其适用交互，A/B 新标号数为 0；人可在 A 新增/编辑/删除/撤销/重绑并导出；再生成 C 后 A/B 的旧说明、人工值和删除记录保持，ID/编号不变；移除范围检查或把人工选区裁到 C 均必须 RED | AI 越界或用 AI 范围限制人 |
| A-13 | OD 尚未完成、motion 已独立 DONE、用户手改业务 HTML 三种输入；通过公开入口或 internal 进入、等待/继承确认、加工与恢复；接单者和完成者唯一，旧节点不重开，internal 无独立handoff/state；业务回流不被旧快照覆盖，未知分离明确停下 | 有 skill 名却无真实入口，重复完成或丢改动 |

新增脚本的命令界面在 U-003/007/009 实现，下列是**未来验收合同，不是本轮已执行通过**。每条独立 bash 运行，非零退出码原样保留；不以 doctor/文件存在替代行为。真实样本和验证 manifest 在 U-002 开始前冻结实际绝对路径与 hash；未提供样本不伪造命令参数。

```bash
# [BLOCKING] V-01 — 数据/合并/单文件组包/注入与负例
node scripts/test-prototype-notes.mjs

# [BLOCKING] V-02 — A-01..A-09 浏览器夹具行为与 mutation
node scripts/test-prototype-notes-browser.mjs --fixtures --mutation

# [BLOCKING] V-03 — 旧验收链与 OD 回收链无回归
npm run test:prototype-delivery

# [BLOCKING] V-04 — 原 design flow 不被接线破坏
npm run test:design-flow-handoff

# [BLOCKING] V-05 — 共享规则/生成投影一致
npm run check:agent-context
```

执行接口以执行手册 E8 的 EV-01–08 为完整命令清单（包括两个独立浏览器、旧 motion 接入回归与精确样本参数，另执行 E7.4 的注册/三入口行为检查和 E8.4 的持续门）；本节 V-01–05 保留原基础断言 ID。真实 OD 样本验收：运行 U-002 冻结的 exact manifest 对应 driver；证据至少含原/加工后 HTML hash、浏览器版本、实际动作/结果、下载文件 bytes、独立 profile 重开、console/network、原状态分母、测试前后实例身份、清理后可读取的证据 hash。已存在 Playwright 依赖，优先复用，不创建第二套调度器。

产出质量 criteria（本轮审计划结构；实施后审实际成品）：

- C1：R-01–14 全有方案及验收落点，R-09 明确一份原型 HTML，R-10 明确用户确认后加工，防交付分裂和过早绑定。
- C2：decision.md 完成四形式/五时机比较与反例；节点符合 OD/Brief/验收权威，独立入口/内部调用/事后回流有唯一完成者，未另造需求源或提前完成，防框架漂移。
- C3：每条关键说明可区分来源与实现状态，人工文本有保护与冲突策略，防伪规格。
- C4：关闭/查看/编辑/选区/保存/失效都有可观察出口，防只设计 happy path。
- C5：单文件往返、隐藏状态、动态锚点及原交互保持有行为断言，防静态自证。
- C6：固定 UI 有唯一实现与版本，源文档不被注入污染，防每次重画和视觉侵入。
- C7：独立专家及红队对同一终版闭合，没有缺票冒 PASS；能力未知明确保留，防假共识。
- C8：内容规范有唯一落点，生成/手工模板/审阅共用；术语、模板、正反例及五类说明的交付检查完整，防语言充满 AI 术语或伪专业描述。
- C9：AI 生成范围是明确新增范围、人工操作覆盖全原型支持区域；有越界拒绝、范围内覆盖、范围外人工往返和再次生成不破坏四项证据，防混淆自动化范围与人的自由。

## 11. 专家会审与红队协议

四个独立冷审职责，按本仓 critical dispatch 规则串行：UX 交付专家（内容/模式/可用性）；前端专家（定位/隔离/保存/兼容）；框架专家（独立反驳节点与形式选择、OD/standalone/回流、来源/单次完成/权限）；红队（默认 REFUTE，寻找使方案失败的反例）。由 native quality-gate 角色承担关键裁决；红队使用 catalog `redteam` 的通用提案审查合同 `.claude/skills/office/redteam/SKILL.md`。

所有 reviewer 只收到原始需求、此冻结计划及必要证据路径，不收到作者推导过程；不允许修改计划。每票记录 exact path + hash、真实 invocation、逐项判定及存活问题。第一轮汇总后主控修订，第二轮回给原 reviewer 核对终版；未闭合 BLOCKER/MAJOR 不宣称通过，不能无限重试。规划 PASS 仅代表可实施，不代表功能已通过运行验收。

## 12. 失败策略、批准范围与检查点

任何 BLOCKING 行为失败暂停其依赖；证据 UNKNOWN 不算通过；连续两次同阶段失败做 delta 重规划，同一问题三次失败报告 BLOCKED。保留已通过部分、U-ID、失败证据。改变产品范围或推翻已确认决策才重新请求该决定。

实施批准范围是 §9、decision.md 与执行手册 E6–E8 列出的有限文件、框架内组件/脚本/合同、基线测试快照、锁定构建依赖及授权夹具测试。真实业务样本使用仍要绑定精确来源及当前项目权限。不含 Git commit/push、发布服务、全局工具安装或无关依赖升级、外部 OD 新建/生成、业务项目切换或 framework/ 模板修改。

规划完成后用户确认本方案才进入实施。固定面板的第一份真实样本需要一次 UI 采用，后续复用同一版本；这是明确的设计选择点，不让 AI 冒充用户。

检查点：需求梳理、产品与写作研究、v4 会审已完成；本轮新增执行手册并补正普通 raw 入口、资产闭包、spec/required 集与旧票测试；v5 整包终审票与未完成事项以同前缀 review 文件为准。恢复先核 HEAD/dirty 状态，读本计划及该 review 文件，继续未完成评审，不运行任何 §10 未来脚本。
