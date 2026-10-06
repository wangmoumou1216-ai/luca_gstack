# 原型说明侧栏与绑定方式：官方文档研究

- 状态：DONE_WITH_CONCERNS（文档研究完成；真实缺口见第 4 节）。
- 读取日期：2026-10-04，Asia/Shanghai。
- 执行者：真实后台 executor `/root/notes_ux_research`；父任务 `/root`；未继续派发子 agent。
- 方法：`quick-research`，公开官方帮助文档；搜索只用于定位，每条产品事实均以实际打开的正文为依据。没有登录产品、运行交互测试、查看私有文件或验证导出样本。
- 落点与权限：NO_PIN，仅此文件；不读取项目 `docs/` 别名，不改原型、Git 或规则。

## 1. 研究题与先行结论

**问题：** Axure、Figma Dev Mode、Zeplin、UXPin 如何关联、组织、查看和编辑界面说明，如何应对状态/版本及交付；哪些已被官方资料证明，哪些仍未知？

**本任务约束（来自用户，不是竞品事实）：** OD 原型先完成 UI、交互、动效迭代并得到用户确认；随后在同一份 HTML 加可开关固定侧栏、1/2 标号及 AI 说明；设计师可手工选区新增/编辑；下载完整 HTML，交给同事双击离线查看，不另建站点。

最接近“数字标号 ↔ 说明列表 ↔ 元素”的资料来自 Axure 和 UXPin（AX-1/2、UX-1）。Figma 对“结构化属性随设计更新”有明确说明（FG-1），Zeplin 对“绑定组件后更新仍跟随”有明确说明（ZE-3）。这些证据分别解决不同问题，不能合并推断为某个产品已经实现本任务的完整交付链。

**单 HTML、在该 HTML 内编辑说明、再下载包含编辑结果的完整 HTML，四款均无本次已读文档的直接证明。** UXPin 证明“带 documentation 的 HTML 导出可离线审阅”（UX-2），但没有证明资源全部内嵌或离线可编辑；Axure 明确说明其输出由多类文件组成（AX-4）。

## 2. 逐条事实

表中 `VERIFIED` 只代表官方正文明确支持，不代表本研究亲自复现。`UNKNOWN` 表示所读资料没有回答，不能改写成“不支持”。

### Axure

| ID / 状态 | 官方正文支持的行为 | 证据 |
|---|---|---|
| AX-1 / VERIFIED | Notes 分页面和 widget；一 widget 可有多条，也可未分配、重新分配。选中 widget 时新增会自动关联。数字取自列表位置，可拖动改变并可重编号；缩进可形成 4.1。Notes 仅能在 RP 编辑。可附带 widget 文本/交互并随之更新。 | [A1：Notes][A1]，正文 43–80 行 |
| AX-2 / VERIFIED | HTML 设置分别控制数字 marker、widget 说明侧栏和页面说明。点 marker 读说明；侧栏按脚注号排序，点说明可滚动到并高亮关联 widget。 | [A2：HTML output][A2]，58–76 行 |
| AX-3 / VERIFIED | Player 可隐藏/重新显示；Show notes 单独切换数字 marker。打开/关闭面板等 player 配置反映在 URL，可分享该配置。这里的“隐藏”指说明标记/播放器。 | [A3：Prototype player][A3]，47–48、95–126 行 |
| AX-4 / VERIFIED | HTML output 包括 HTML、CSS、JavaScript、图片文件；可生成本地输出并以压缩文件夹等方式分发。Preview 与 RP 源文件相连，修改后刷新可见。 | [A4：Viewing and sharing][A4]，43–53、107–111 行 |

**边界：** AX-1 的“自动更新”限于明确附加的 widget 文本/交互，不证明人工撰写的语义说明自动更新。AX-3 的隐藏开关不证明隐藏 widget 或未激活动态面板的说明定位策略。数字是呈现顺序，不能据此把它当作不可变记录 ID。

### Figma Dev Mode annotations

| ID / 状态 | 官方正文支持的行为 | 证据 |
|---|---|---|
| FG-1 / VERIFIED | 选择 layer 后添加 annotation；一条可含自由文本和该 layer 的属性。属性会随设计更新。类别限当前文件，可编辑、按类别过滤；Dev Mode 默认显示 annotations，也可隐藏。Full seat + edit 可添加，Full/Dev seat + view 可查看。 | [F1：Add measurements and annotate designs][F1]，80–84、113–164 行 |
| FG-2 / VERIFIED | Inspect 文档把画布上的 annotation 描述为绿点，点击展开内容。该文档另将“点击位置或拖出区域”写在 Comments 操作中，不能用它证明 Dev Mode annotation 支持任意区域锚点。 | [F2：Guide to inspecting][F2]，122–130、252–271 行 |
| FG-3 / VERIFIED | Compare changes 可在顶层 frame/组件的上下文中比较设计，显示层的 Edited/Added/Deleted、并排/叠加画面和属性差异；历史时间轴仅在比较顶层 frame 随时间的变化时显示。 | [F3：Compare changes][F3]，83–131 行 |

**边界：** FG-1 没有说 AI 或自由文本会自动保持正确；FG-3 证明设计差异可比较，没有证明 annotation 文本自己的版本差异、丢失锚点恢复或自动迁移。Figma 的绿点模式不能直接当成本任务 1/2 连续编号的证据。

### Zeplin annotations

| ID / 状态 | 官方正文支持的行为 | 证据 |
|---|---|---|
| ZE-1 / VERIFIED | 在 screen 上点击位置新增 annotation；支持基本 Markdown、类型和模板。类型例子包含 Behavior、Requirement、Animation、API。 | [Z1：Adding annotations][Z1]，17–27 行 |
| ZE-2 / VERIFIED | 右侧 Annotations tab 列出说明及类型；过滤同步作用于列表和画面。点列表项可打开画面对应位置；上下移动说明会改变侧栏顺序；每条有独立分享链接。 | [Z2：Filtering annotations][Z2]，17–22 行 |
| ZE-3 / VERIFIED | marker 位于组件上方时可 Link to component。关联说明会出现在项目内使用该组件的各 screen，screen 更新后仍附着；同屏多实例只在从上到下首次出现处显示。解绑后只保留在执行解绑的 screen。 | [Z3：Linking to components][Z3]，17–28 行 |
| ZE-4 / VERIFIED | 官方将 Annotations 定义为单向说明，与可反馈、解决问题的 Comments 分开。 | [Z4：Getting started][Z4]，17–21 行 |
| ZE-5 / VERIFIED | workspace Developer 可以添加、编辑和删除自己的 annotations，Reviewer 可以查看。此处仅引用所读 workspace 角色页，不外推所有订阅/权限组合。 | [Z5：Workspace roles][Z5]，85–126 行 |
| ZE-6 / VERIFIED | Screen Variants 可组织主题、设备尺寸和 Loading/Error/Empty 等状态；这是屏幕变体层级的表达。 | [Z6：Designer guide][Z6]，61–78 行 |

**边界：** 坐标 pin 与组件链接是两个不同强度的绑定。ZE-3 不能证明任意坐标 pin、普通 layer 或已删除/替换组件也能自动跟随。ZE-6 不能证明 annotation 会自动切换交互状态来显示隐藏目标。ZE-4 的概述写“always visible”，但 ZE-2 明确支持过滤，应理解为与可解决的评论有区别，不能解释为无法隐藏/过滤。

### UXPin documentation / specifications

| ID / 状态 | 官方正文支持的行为 | 证据 |
|---|---|---|
| UX-1 / VERIFIED | Documentation 视图在右侧提供文字编辑区；可写全局说明，或把文字段落 pin 到画布元素。也可先 pin 空段落再写；两端显示相同数字，选中说明与元素同步变蓝，可解除关联。只在 Editor 新增，Preview 查看。 | [U1：Documentation][U1]，15–40 行 |
| UX-2 / VERIFIED | 可导出 HTML，勾选 Include documentation 将说明一同导出；可包含侧栏 sitemap 与 adaptive versions。外部导出文件不会随最新迭代更新，可用于离线审阅。 | [U2：Exporting][U2]，16–38 行 |
| UX-3 / VERIFIED | Get Code mode 提供尺寸、颜色、字体等检查，设计变化会更新检查结果；隐藏 layer 默认不可见/不可选，但可在 Layers 中用 eye 切换可见。 | [U3：Get Code Mode][U3]，17–32 行 |

**边界：** UX-3 是检查模式的隐藏层行为，不是 Documentation pin 的状态恢复合同。UX-2 的 sitemap 也不能直接证明固定可开关的说明侧栏实现。数字重排、隐藏目标、删除目标后的 pin 行为没有被 U1 说明。

## 3. 可迁移模式与不能照搬之处

本节是研究者对上述事实的**推论/待设计候选**，供父任务形成实施计划；不替用户决定范围。

| 观察来源 | 可用于本任务的设计候选 | 需要本地另外定义的部分 |
|---|---|---|
| AX-2、UX-1 | 同一选中状态连接 marker、说明卡片和目标高亮；列表点击可以定位目标。 | 固定侧栏占宽、遮挡处理、滚动容器和选区命中规则。 |
| AX-1、ZE-3 | 将“说明记录”和“目标关联”视为独立对象；呈现编号与稳定身份分开。 | note ID / target ID、同元素多说明、解绑与重绑；不能复制 Axure 重编号规则当作稳定 ID 规则。 |
| FG-1、ZE-1/2 | 按信息类型组织说明，必要时过滤；属性快照与解释文字分字段。 | 采用哪些最小类别由任务 owner 定；自动更新属性不等于自动更新意图。 |
| AX-1、UX-1、ZE-5 | 查看与编辑是不同操作上下文，可在同一产物提供显式“编辑说明”入口。 | 竞品多依赖编辑器或账号权限，本任务应自行设计本地模式及保存/下载反馈。 |
| UX-2、AX-4 | 交付文件是确定时点的快照，应标明原型/说明版本。 | 用户要求的单 HTML 内嵌、重开持久化、字体/媒体离线可用都要用导出样本验收。 |

适合写入实施计划的验证议题（来自用户目标及上述缺口，不是竞品已实现承诺）：

1. 用户确认原型后才产生说明；之后修改原型时，能识别目标丢失、目标变化或说明需重审。
2. 侧栏开关、marker 点击和卡片点击共享选中状态；选区新增时不误触原型按钮；退出选区后原交互恢复。
3. 目标在折叠、弹窗、tab、不可见状态时，不把 marker 错画在空白位置；卡片保留可理解的不可定位状态。是否自动切换状态由设计 owner 决定。
4. AI 说明与人工编辑的保存规则可验证，重新生成不静默覆盖已确认的人工内容。
5. 下载后断网、关闭原浏览器环境、在另一文件路径双击 HTML，仍可看原型、标号、说明；文件包含本次人工编辑，不依赖仅存在原浏览器的缓存。

## 4. 未确认项与真实缺口

| 范围 | 状态 | 未确认内容与证据边界 |
|---|---|---|
| 四款 annotation/documentation | UNKNOWN | 本次文档未完整说明隐藏目标、离屏目标、弹窗未打开、动态状态切换后的 marker 和定位行为。UX-3 仅提供检查模式的隐藏层可见性操作。 |
| Axure / UXPin / Figma | UNKNOWN | 删除、重建、替换目标后说明是否变成孤立项、被删除、迁移或需人工重绑。 |
| Zeplin | PARTIAL | 组件关联的更新跟随已证实；普通坐标 pin 的更新迁移、组件删除后的处理、旧版本 annotation 文本快照仍 UNKNOWN。 |
| 数字编号 | PARTIAL | Axure 位置/重编号规则明确；UXPin 双端同号明确但重排规则 UNKNOWN；Figma 文档用绿点；Zeplin 本次正文未确认数字生成/稳定规则。 |
| 四款 / AI | UNKNOWN | 本次所读 annotation 文档未证明 AI 自动生成语义说明、人工覆盖保护或说明与确认版本绑定。不能用属性自动更新替代这些承诺。 |
| 单文件离线交付 | UNKNOWN | UXPin 离线 HTML 审阅明确，但单文件/离线编辑未知；Axure 明确是多类输出文件；Figma/Zeplin 的已读资料没有提供等价导出合同。 |
| 真实运行与无障碍 | NOT_TESTED | 未亲测键盘、读屏、缩放、长页、多层滚动、保存恢复、浏览器 `file:` 行为或附件离线加载。 |

检索曾定向覆盖 Axure notes + hidden/dynamic panel、Zeplin annotations + version/offline、UXPin documentation + export/specifications、Figma annotations + compare changes。未找到目标正文不构成“不支持”的证据。研究没有采用搜索摘要中的营销效果、第三方经验或论坛推测。

## 5. 实际读取记录

以下页面均在 **2026-10-04** 通过公开 Web `open`/文档内 `click` 读取了相关正文；列出实际阅读范围和页面自己显示的日期。无日期表示正文未显示更新日期，不代表已知新鲜度。每个来源的产品事实摘要控制在 200 个英文词等量内，不逐段翻译原文。

| 源 | 实际读取章节 | 页面日期 |
|---|---|---|
| [A1][A1] | Page/widget notes；新增/关联/排列/附加交互；字段与浏览器查看 | 未显示 |
| [A2][A2] | HTML generator；Notes；多个 generator | 未显示 |
| [A3][A3] | Documentation；Markup；隐藏/显示 player；URL 配置 | 未显示 |
| [A4][A4] | Preview；Publish locally；HTML output 定义 | 未显示 |
| [F1][F1] | 添加、类别、过滤、隐藏、权限及属性更新 | 未显示 |
| [F2][F2] | Comments 与 Dev Mode annotations 的操作差别；检查与导出 | 未显示 |
| [F3][F3] | Compare changes；历史、层变化、并排/叠加、属性 | 未显示 |
| [Z1][Z1] | 坐标新增、类型、模板 | 2026-08-05 |
| [Z2][Z2] | 右侧列表、同步过滤、排序、独立链接 | 2026-01-02 |
| [Z3][Z3] | 组件关联、更新、多实例、解绑 | 2026-01-02 |
| [Z4][Z4] | annotations 与 comments 的区分 | 2026-08-05 |
| [Z5][Z5] | Developer/Reviewer 权限 | 2025-12-31 |
| [Z6][Z6] | Updating screens & screen variants；handoff/annotations | 2025-06-24 |
| [U1][U1] | 编辑区、pin/unpin、数字联动、Preview | 未显示 |
| [U2][U2] | HTML / Include documentation / offline / snapshot | 未显示 |
| [U3][U3] | Inspecting properties；hidden layers；Code Export 边界 | 未显示 |

另实际打开了 Axure 的 [Cloud publishing](https://docs.axure.com/axure-rp/reference/publishing-axure-rp-projects/) 和 Zeplin 的 [Annotations 目录](https://support.zeplin.io/en/collections/3666018-annotations) 用于定位；不使用它们补推本地导出或隐藏状态行为。未以搜索命中的 UXPin 营销博客、Merge 版本控制、旧 release notes 或第三方资料支撑结论。

## 6. 父任务接收说明

- `gate_result`：DONE_WITH_CONCERNS。
- 已满足：四产品范围；仅一名真实后台 executor；每条产品事实有 owning URL；正文实际打开；唯一授权文件落盘；未知项独列。
- 不需要项目 handoff：本任务为 NO_PIN；本文件本身保留研究与恢复材料。
- 下游约束：实施计划应标出借鉴的 claim ID；“单 HTML、人工编辑、AI 保护、隐藏目标和失效锚点”仍是本地设计/工程责任，不能写成竞品已验证事实。
- 恢复读取：本文件；仅在需要补证时打开上述对应官方 URL。未完成事项为父任务的方案取舍、实现和运行验证。

[A1]: https://docs.axure.com/axure-rp/reference/page-widget-notes/
[A2]: https://docs.axure.com/axure-rp/reference/customizing-html-output/
[A3]: https://docs.axure.com/axure-rp/reference/prototype-player/
[A4]: https://docs.axure.com/axure-rp/reference/viewing-sharing-prototypes/
[F1]: https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs
[F2]: https://help.figma.com/hc/en-us/articles/22012921621015-Guide-to-inspecting
[F3]: https://help.figma.com/hc/en-us/articles/15023193382935-Compare-changes-in-Dev-Mode
[Z1]: https://support.zeplin.io/en/articles/5917337-adding-annotations-to-a-screen
[Z2]: https://support.zeplin.io/en/articles/5917207-filtering-annotations-on-a-screen
[Z3]: https://support.zeplin.io/en/articles/6248711-linking-annotations-to-components
[Z4]: https://support.zeplin.io/en/articles/5917181-getting-started-with-annotations
[Z5]: https://support.zeplin.io/en/articles/387773-assigning-roles-to-workspace-members
[Z6]: https://support.zeplin.io/en/articles/6576801-getting-started-with-zeplin-for-designers
[U1]: https://www.uxpin.com/docs/sharing/documentation/
[U2]: https://www.uxpin.com/docs/sharing/exporting/
[U3]: https://www.uxpin.com/docs/sharing/spec-mode/

## 7. 补充研究：面向前端的 UI 与交互说明怎么写

**补充要求：** 说明侧栏采用简明、专业、面向前端同事的交付语言，使用行业通用用语，不夹带生成过程、AI 术语或不必要的实现细节。本节研究的是“行为规格如何表达”，不是按钮文案优化。

本节访问日期为 **2026-10-04**。实际读取 5 个一手来源。Carbon 和 GOV.UK 是各自设计系统的组件指南，Digital.gov 是面向特定读者的简明语言指南；它们没有共同规定一套“行业唯一的前端交付写作标准”。以下将**来源事实**与**本任务建议采用的写作合同**分开。

### 7.1 来源事实

| Claim ID | 已验证事实 | 精确来源与读取位置 |
|---|---|---|
| WR-01 | Carbon Text input 按结构、尺寸、内容、状态和操作组织说明；区分默认、输入中、焦点、错误、警告、禁用、骨架屏、只读。只读与禁用不是同义词。尺寸表是 Carbon 自身的组件规则。 | [Carbon Text input guidelines][W1]：Anatomy、Sizing、Universal behaviors、Validation、Keyboard（正文 110–138、233–284 行）。 |
| WR-02 | Carbon Modal 分别描述触发、初始焦点与焦点范围、加载、校验和关闭方式；例如加载时限制主操作，校验失败保持弹窗打开并说明改法，取消返回原上下文。普通交互与各变体的例外分开写。 | [Carbon Modal guidelines][W2]：Universal behaviors、Dismissing a transactional modal（179–225 行）。 |
| WR-03 | GOV.UK 要求校验错误说明问题及改法，关联到具体字段，并保留正确和错误的输入。权限不足或用户无法解决的服务问题采用另外的问题说明与后续路径，不冒充可修改输入的错误。 | [GOV.UK Error message][W3]：When to use、When not to use、How it works（57、145–175 行）。 |
| WR-04 | GOV.UK Button 区分继续、保存并继续、保存后稍后返回等行为；提醒慎用禁用按钮。对于慢连接，应先让用户知道正在处理，并考虑防止重复提交。 | [GOV.UK Button][W4]：How it works、Disabled buttons、Stop users from accidentally sending information more than once（100–113、366–370、521–579 行）。 |
| WR-05 | Digital.gov 要求按读者已有知识和习惯用语写作；简明不等于删掉专业内容或一律降低知识水平。指南建议主题句、主动语态、清晰组织，以及适当使用列表和表格。 | [Digital.gov Principles of plain language][W5]：Choose your words carefully、Follow plain language guidelines（49–63 行）。 |

**适用边界：** WR-01/02 是 Carbon 组件的规则，不能把其尺寸、初始焦点位置或校验时机直接推广到所有产品。WR-02 的“加载时限制主操作”与 WR-04 的“慎用禁用”针对不同情境，因此交付说明应写清禁用条件，不能统一写成“提交前按钮均禁用”。WR-05 原本服务于公共内容，以下将其表达原则迁移到设计师与前端之间的专业沟通，属于本研究建议。

### 7.2 建议采用的写作合同

以下是针对本任务的**采用建议**，不冒充外部标准；由父任务纳入实施计划和验收。

1. **以一个目标、一个行为为最小颗粒。** 标题用界面里真实的名称，例如“编辑说明弹窗”“保存说明”。正文说明该目标的交互，不把整页所有行为塞入同一条，也不重复抄一遍可直接查看的视觉内容。多个分支先写共同规则，再列例外。参考 WR-01/02/05。
2. **用“条件 → 操作 → 可观察结果”。** 自然写成“说明有修改时，点击‘保存’，更新当前卡片并退出编辑”。主语和对象明确；“支持编辑”“处理异常”“优化体验”不能单独成为规格。条件本来就明显时可省略，不强制每句话套模板。
3. **按适用性补齐状态。** 每条至少能回答正常路径和实际存在的例外；不存在的状态不补造。不要把下面的核对表全部展开到每张卡片。

| 需要核对的状态/路径 | 说明中应能回答的问题 |
|---|---|
| 默认 | 初始显示什么，值从哪里来，哪些操作可用？ |
| 禁用 / 只读 | 在什么条件下进入、如何恢复？是否仍可阅读、选择、复制或获得焦点？两者分开写。 |
| 加载 / 处理中 | 从何时开始、到什么事件结束，哪里显示反馈，是否允许重复操作、取消或离开？ |
| 错误 / 例外 | 什么失败，提示放在哪里，哪些输入保留，用户怎样修正或重试？无法自行解决时给什么后续路径？ |
| 成功 / 返回 | 更新哪些内容，留在原处还是关闭/跳转？返回、取消、关闭分别是否保存，返回后保留哪些上下文？ |
| 键盘 / 焦点 | 打开时焦点在哪里，Tab 顺序与范围是什么，Enter/Esc 的效果是什么，关闭后焦点去哪里？ |

这张核对表综合 WR-01 至 WR-04，并补充本任务的交付完整性需求；它不代表来源已经规定每项的具体答案。尤其“关闭后焦点回到哪个控件”须由确认设计或适用组件合同提供，不能从“返回原上下文”自行推断。

4. **数值只写有依据的值。** 宽高、间距、断点、持续时间、延迟、输入上限，应来自已确认原型、当前项目设计系统或用户明确决策；必要时在说明旁记录来源。仅从当前代码测得、尚未确认的值应标作“当前实现”。缺少依据写“待确认”，不能自动填常见值；外部指南的值只在项目已采用该规范时才可照用。不要用“适当间距”“快速消失”代替已要求明确的规格，也不要为了显得完整虚构毫秒数。
5. **把解释与页面显示的文案区分开。** 用引号标出界面必须显示的确切文字，例如按钮“保存”、错误提示“保存失败，请重试”。其他句子直接对前端说明行为，不写“AI 认为”“建议智能判断”等生成过程。涉及尚未确认的设计取舍时，另标“待确认”，不把推测写成既定行为。
6. **按前端同事的阅读方式压缩。** 先写行为结果，再补条件与例外；主动动词优先，一句表达一个主要变化。能用“关闭弹窗并保留输入”说清，就不用抽象名词串。无需机械规定字数；如果一句已有多种条件或多个转折，拆成几条。必要的术语保留，避免为“浅显”而失去准确性。参考 WR-05。
7. **用可复述性验收。** 让前端只读说明就能回答“何时触发、界面如何变、失败怎么办、怎样返回”；与确认原型逐项对照。没有依据的尺寸/时序、互相冲突的状态规则、仅有“支持/优化/处理”的句子，都应退回补齐，而不是由实现者猜测。此项为本任务建议的质量门。

### 7.3 术语分级

以下分级是面向本任务读者的编辑约定，不声称存在统一行业词表。

| 层级 | 写法与例子 |
|---|---|
| 可直接使用的通用词 | 按钮、输入框、复选框、下拉菜单、侧栏、弹窗、标签页、悬停、焦点、禁用、只读、加载、校验、错误提示、滚动、重试。全篇用同一个名称指同一个控件。 |
| 首次出现时简短解释 | 模态弹窗（打开后暂时不能操作背后页面）；焦点限制（Tab 只在弹窗内移动）；骨架屏（内容加载前的占位结构）；防重复提交（处理中再次点击不再发起相同操作）。团队熟悉后不重复解释。 |
| 侧栏正文避免，确有实现需要再放技术备注 | DOM、selector、hydration、debounce、状态机、事件总线等实现词；Agent、prompt、token budget、grounding、confidence、artifactRef 等生成/编排词；“智能降级”“优雅兜底”“无缝协同”等无明确行为的概括。用“页面元素”“停止输入后再搜索”“保存失败时保留内容并允许重试”等可观察行为替代。 |

### 7.4 自然中文示例与反例

**示例是假设以下行为已由设计师确认后的写法，不为本任务新增设计决定：**

> 点击“编辑”打开弹窗，焦点移到说明输入框。点击“保存”后，按钮显示“保存中…”，处理中不能重复保存。保存成功后更新说明卡片并关闭弹窗；保存失败时保留输入，在按钮上方显示“保存失败，请重试”。点击“取消”或按 Esc 关闭弹窗，放弃本次修改，焦点回到原“编辑”按钮。

这条说明交代了触发、反馈、重复操作、成功、失败和返回；用界面名称及动作表述，没有声称固定处理时长。若关闭行为或焦点位置尚未确认，应拆出来标“待确认”。

**反例（不要采用）：**

> Agent 基于高置信度 grounding 触发说明状态机，onClick 后 300ms 完成智能 persistence，失败自动优雅降级，确保丝滑闭环。

反例混入生成与实现词，“300ms”没有来源；未说明用户看到什么、哪些内容被保存、失败后是否保留输入以及如何恢复。前端无法据此确定行为或验收结果。

### 7.5 补充读取记录与未覆盖项

| 源 | 2026-10-04 的实际读取 | 页面版本信息 |
|---|---|---|
| [W1][W1] | 公开 `open`；结构、尺寸、状态、校验、鼠标/键盘章节 | 页面显示 Last updated Sep 30, 2026；旧 `/components/text-input/usage/` 重定向至下列 canonical URL |
| [W2][W2] | 公开 `open` 两段；结构、尺寸、Content、Universal behaviors、各变体关闭路径 | 页面显示 Last updated Sep 30, 2026；旧 `/components/modal/usage/` 重定向至下列 canonical URL；正文注明 feature flag 存在行为差异 |
| [W3][W3] | 公开 `open`；使用/不使用条件、显示和保留输入规则 | 未以更新日期推定行为；只采用本次读到的正文 |
| [W4][W4] | 公开 `open` 后在正文 `find`；按钮动作含义、禁用、重复提交与慢连接反馈 | Recent changes 显示 Jul 2026 条目；没有将发布记录等同于全部行为更新 |
| [W5][W5] | 公开 `open` 正文；读者、知识水平、主动语态与组织 | 正文未显示本页更新日期 |

未扩展到 Material；现有 5 个来源已足以支撑本次写作合同的证据部分。没有运行产品、可用性测试或跨系统词汇调查。尚未确定本原型每个控件的具体状态、参数和焦点规则；本节不能替代确认原型或项目设计系统。

补充完成状态：**DONE_WITH_CONCERNS**。已有可采用的写作合同、WR-01 至 WR-05 证据和正反例；前端交付表达的可读性与行为一致性仍需在真实说明样本中验证。

[W1]: https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines
[W2]: https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines
[W3]: https://design-system.service.gov.uk/components/error-message/
[W4]: https://design-system.service.gov.uk/components/button/
[W5]: https://digital.gov/guides/plain-language/principles
