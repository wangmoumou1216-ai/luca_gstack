# Phase 1 判官校准样本池（v1，2026-07-01）

> 来源：① `shareclawdemo` 项目（`/Users/luca/Documents/GitHub/shareclawdemo/`）的 `SHARECLAW_DECISION_LOG.md` 20 条已归档决策——排除 2 条纯 meta/工具类（"记忆分层"、"checkpoint 能力"，不是产品/UI需求）、排除 correction 表里 1 条纯 AI 行为规则（"记忆文件展示方式"，不是可对照原型判定的 UI 行为）——剩余 **20 条**可用；② Figma"速记汇报版本"文件里 luca 指定的 1 个具体 section（节点 `3934:19097`）。共 **21 个独立样本**。
>
> 每条已写好 L1 核心字段 + AC 列表（依据 schema.md v0.2，仅保留 Phase 1 用得到的字段：authenticity/entailment/priority 从简，因为 Phase 1 只测判官校准，不测 req-triage）。**AC 均基于 decision log 原文的"决策+原因+do-not-regress"改写，未看过当前代码的真实实现效果就写完**，避免事后诸葛亮式偏差。目标原型 = shareclawdemo 对应的真实 HTML 页面（可直接在浏览器打开核对）。
>
> **下一步是你（luca）的事，不是我的事：** 打开每条对应的 HTML 页面，对照 AC 逐条打 pass/fail（第一轮真实判断）。我不会提前告诉你我认为哪条会过——这批 AC 我是照 decision log 原文写的，没有反查当前代码的实际实现状态。

---

## 样本 1 — 生成结果面板用悬浮卡片形式，非通栏侧拉

```yaml
id: REQ-shareclaw-001
type: requirement
title: 生成结果侧边栏是悬浮卡片，不是全高通栏
statement_ears: "当会话页面展示生成结果侧栏时,系统应当以悬浮卡片形式呈现,而非全高、贴边的通栏面板"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-22 Generated Results Panel Uses Floating Card Form", reason: "用户把设计从连续通栏改成了Figma卡片式侧栏"}
target_prototype: "conversation.html — #chatOutputPanelShell / #chatOutputPanel"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 打开一个会话的生成结果面板, When 面板展开, Then 面板视觉上是独立悬浮卡片(非贴边通栏)"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 面板处于list模式, When 检查面板内部, Then 不存在内部关闭图标(收起由外部toggle控制)"}
```

## 样本 2 — 静态/动态生成结果方案彼此隔离

```yaml
id: REQ-shareclaw-002
type: requirement
title: 支持动态页签与不支持动态页签是两套独立方案
statement_ears: "当用户在'侧边栏交互方案'下切换'支持动态页签'/'不支持动态页签'时,系统应当让两套方案的行为互不污染"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-22 Static And Dynamic Generated-Result Schemes Are Separate", reason: "用户需要能对比两种交互方案而不互相污染"}
target_prototype: "conversation.html — state.activeSchemeCapability / SCHEME_CAPABILITIES"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 在静态方案下做的改动, When 切到动态方案, Then 动态方案行为未被静态方案的改动意外改变(除非明确要求)"}
```

## 样本 3 — 静态方案下业务对象详情脱离侧栏，用独立抽屉

```yaml
id: REQ-shareclaw-003
type: requirement
title: 静态页签模式下业务对象详情用独立右侧抽屉,不进生成结果侧栏
statement_ears: "当处于静态页签(static-tabs)模式且用户打开业务对象详情时,系统应当以独立右侧抽屉展示,而非嵌入生成结果侧栏的detail"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-22 Static Business Object Detail Is Detached From Sidebar", reason: "用户澄清业务数据详情在'侧栏场景'之外"}
target_prototype: "conversation.html — #businessObjectOverlay / .business-object-drawer / openBusinessObjectOverlay(id)"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 静态页签模式, When 打开一个业务对象详情, Then 以独立抽屉(非生成结果侧栏detail)展示,文档详情仍可留在输出卡片里"}
```

## 样本 4 — 自动化任务会话不渲染用户消息气泡

```yaml
id: REQ-shareclaw-004
type: requirement
title: 自动化任务对话只渲染AI消息,不渲染用户消息气泡
statement_ears: "当会话来源是自动化任务(source: automation-task)时,系统应当只渲染任务生成的AI消息,不应渲染用户消息气泡"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-22 Automation Task Chat Has No User Message", reason: "自动化任务是系统触发的任务,不是用户提交的聊天prompt"}
target_prototype: "task-conversation.html — session source: 'automation-task'"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "自动化任务会话的聊天流里不存在用户消息气泡DOM元素"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 任务prompt文本存在, When 渲染会话, Then prompt文本可作为任务上下文/标题元数据出现,但不作为用户气泡渲染"}
```

## 样本 5 — 自动化任务报告蓝点=未读,不是选中态

```yaml
id: REQ-shareclaw-005
type: requirement
title: 自动化任务报告的蓝点表示未读,打开任务本身不清除未读
statement_ears: "当自动化任务的报告列表中存在未读报告时,系统应当仅在用户点击具体某条report row时才清除该条未读,打开任务列表本身不应清除"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-22 Automation Task Report Blue Dot Means Unread", reason: "有两次误判历史:先误判为选中态,再误判为'打开任务即已读',最终由用户纠正为'点击具体report row才算已读'"}
target_prototype: "task-conversation.html — .automation-report-row.unread / markAutomationRunRead(taskId, runId)"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 一个自动化任务下有未读report, When 仅打开该任务(未点击具体report row), Then 该report的未读蓝点不清除"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 用户点击具体的[data-automation-run-id], When 该点击发生, Then 对应report的未读蓝点清除,且左侧任务未读数重新计算"}
```

## 样本 6 — 自动化业务生成结果是任务级,不是单次运行级

```yaml
id: REQ-shareclaw-006
type: requirement
title: 自动化任务的业务生成结果卡片展示任务级全部产出,不随任务历史切换过滤
statement_ears: "当用户在自动化任务对话中切换'任务历史'的某次运行时,系统应当保持右侧'业务生成结果'卡片展示该任务下的全部产出,不应被该次切换过滤或替换"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-28 Automation Business Outputs Are Task-Level", reason: "用户澄清'任务历史'控制中间报告内容,而'业务生成结果'是任务入口下的全量产出集合"}
target_prototype: "task-conversation.html — #chatOutputPanelShell.automation-list / getAutomationTaskOutputRuns()"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 一个自动化任务有多次运行, When 切换'任务历史'里不同的run, Then 右侧业务生成结果列表内容不变(仍是任务级全量),中央报告内容才切换"}
```

## 样本 7 — 左侧二级侧栏用桌面HTML的混排历史模型

```yaml
id: REQ-shareclaw-007
type: requirement
title: 左侧历史列表统一用一个'历史会话'分组混排自动化任务行和普通会话行
statement_ears: "当渲染左侧默认侧栏的历史列表时,系统应当将自动化任务行与普通会话行混合在同一个'历史会话'分组内,不应使用独立的自动化任务列表分组"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-28 Left Sidebar Uses Desktop HTML Mixed History Model", reason: "用户澄清最新截图和桌面HTML左侧菜单才是真值来源"}
target_prototype: "index.html/conversation.html等 — #historyList / renderHistoryList() / data-automation-task / data-session-id"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "不存在独立的#automationTaskList分组元素;所有历史行都在#historyList内混排"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 历史列表中既有自动化任务行又有普通会话行, When 渲染, Then 二者混合展示在同一'历史会话'组,而非分成两组"}
```

## 样本 8 — 触发词一律走路由进conversation.html,不在本地起场景

```yaml
id: REQ-shareclaw-008
type: requirement
title: composer触发词统一路由进conversation.html,不在各输入页本地处理
statement_ears: "当用户在任意共享输入页面的composer中输入'信息收集'/'信息补全'/'删除客户'/'新建对象'/'编辑对象'/'更新对象'/'复杂查询'/'新建定时任务'等触发词时,系统应当路由进入conversation.html对应launch场景,而不是在当前页面本地启动该场景"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-28 Trigger Words Enter Scenes Through Routes", reason: "统一入口能让跨页行为一致,且当前激活场景在URL里可见"}
target_prototype: "共享composer — routeSpecialConversationTrigger(text) / specialConversationRouteMap"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "触发词命中后跳转URL包含conversation.html?launch=...,而非停留在原页面渲染本地场景"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 用户在index.html输入'新建对象', When 触发, Then 页面路由到conversation.html?launch=agent-action&type=create-object"}
```

## 样本 9 — 新建客户走产出物闭环(聊天卡片+生成结果列表双落点)

```yaml
id: REQ-shareclaw-009
type: requirement
title: 新建客户成功后同时出现在聊天流精简卡片和右侧生成结果列表
statement_ears: "当信息收集流程创建客户成功时,系统应当将结果同时渲染为聊天流内的精简CRM产出卡片,并追加到右侧'业务生成结果'列表"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-05-29 Created Customer Uses Output Artifact Loop", reason: "创建的客户是生成的业务对象,必须能从聊天流和生成结果面板两处追溯"}
target_prototype: "conversation.html — .created-customer-detail-card / getCurrentBusinessSources() / business-created-customer-${session.id}"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 客户创建成功, When 检查聊天流, Then 出现精简的.created-customer-detail-card(非大段字段详情卡)"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 客户创建成功, When 检查右侧生成结果列表, Then 出现动态business-created-customer-${session.id}来源,右侧列表处于list模式"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given md-info-demo/agent-action-create-object等不同入口创建客户, When 成功, Then 都复用同一套精简卡片,不出现遗留的.chat-customer-card旧样式"}
```

## 样本 10 — 移动端旧原型文件从运行时移除,不影响桌面端

```yaml
id: REQ-shareclaw-010
type: requirement
title: 移动端旧原型文件已从运行时移除,且清理动作未改变桌面端行为
statement_ears: "当清理移动端旧原型文件(Mobile.html/ShareClaw-Demo.html/image/frame*.png/image/1)时,系统不应因此改变任何桌面端HTML的行为或导航"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-01 Mobile Prototype Files Removed From Runtime", reason: "当前实际产品工作是桌面端ShareAgent外壳,旧移动端文件是过时的原型面"}
target_prototype: "项目根目录文件列表 + 桌面8个HTML页面行为"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "Mobile.html/ShareClaw-Demo.html/image/frame*.png/image/1 在项目目录中不存在"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 上述移动端文件已删除, When 对比清理前后的桌面8个HTML页面行为, Then 桌面端UI/导航行为未发生变化"}
```

## 样本 11 — 复杂查询/Agent Action 产出物的具体交互规则（本条含多项do-not-regress，作为一组AC）

```yaml
id: REQ-shareclaw-011
type: requirement
title: object-detail-overlay.html已非当前模块;Agent Action创建/更新/复杂查询有各自明确的产出交互规则
statement_ears: "当业务详情需要展示时,系统应当使用conversation.html/task-conversation.html内嵌的#businessObjectOverlay,而非独立的object-detail-overlay.html文件;Agent Action创建/更新对象、创建定时任务、复杂查询各自应遵循既定的产出交互规则"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-01 Standalone Object Detail HTML Is Not Current", reason: "该文件已不在工作树中且未被运行时HTML引用"}
target_prototype: "conversation.html — agent-action-create-object / agent-action-update-object / agent-action-create-scheduled-task / 复杂查询 ShareClaw Figma node 3295:26112"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "项目中不存在object-detail-overlay.html,或即使存在也未被任何运行时HTML引用"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 点击agent-action-create-object的'创建', When 点击发生, Then 先进入1秒左右的thinking态,再产出CRM对象卡片"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given 点击agent-action-update-object的'更新', When 点击发生, Then 先thinking态,再产出带'更新'动作标签的CRM对象卡片,并打开右侧生成结果列表"}
  - {id: AC-4, check_type: semantic, given_when_then: "Given agent-action-create-scheduled-task创建成功, When 检查产出, Then 聊天流出现定时任务卡片(橙色时钟图标,直接显示任务名,无'[定时任务]'前缀),且右侧生成结果列表追加对应business来源"}
  - {id: AC-5, check_type: semantic, given_when_then: "Given 复杂查询完成, When 渲染结果, Then 遵循Figma节点3295:26112的对象列表样式:无ShareAgent身份行,两行摘要文字,默认展示3张客户卡+'查看全部(共X个客户)'按钮(该按钮当前仅toast'待接入列表页')"}
```

## 样本 12 — 生成结果toggle按钮跟随面板展开/收起动画

```yaml
id: REQ-shareclaw-012
type: requirement
title: 生成结果toggle按钮位置跟随面板宽度动画,不固定在居中标题栏
statement_ears: "当生成结果面板展开或收起时,系统应当让toggle按钮的位置跟随面板宽度变化动画,而不是固定停留在居中的标题栏区域"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-11 Generated-Results Toggle Follows The Panel", reason: "用户指出宽屏下toggle停在离展开面板很远的空白区域,图标应贴着面板边缘走"}
target_prototype: "conversation.html/task-conversation.html — .chat-output-entry(#chatFlowShell直接子节点,right:0锚定)"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: ".chat-output-entry是#chatFlowShell的直接子节点,而非嵌套在#chatSessionTitlebar内部"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 面板从收起到展开的动画过程中, When 检查toggle按钮位置, Then 按钮随聊天列宽度收缩自然跟随,无额外JS计算的offset"}
```

## 样本 13 — 会话标题栏左侧新增侧栏收起/展开切换按钮

```yaml
id: REQ-shareclaw-013
title: 会话标题栏新增侧栏折叠toggle,收起只影响二级侧栏不影响一级rail
statement_ears: "当用户点击会话标题栏左侧的折叠toggle时,系统应当仅收起/展开二级sidebar,一级channel-rail应保持不受影响"
type: requirement
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-11 Session Titlebar Hosts A Sidebar Collapse Toggle", reason: "对齐Figma交互稿ShareClaw节点4630:34893"}
target_prototype: "conversation.html/task-conversation.html — #chatSidebarToggleBtn / .sidebar.collapsed"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 点击#chatSidebarToggleBtn, When 触发折叠, Then .sidebar宽度264px↔0动画切换,.channel-rail不受影响"}
  - {id: AC-2, check_type: deterministic, check: "会话标题行不再包含独立的leading icon(.chat-session-title-icon已退役)"}
```

## 样本 14 — 聊天页锁定static-tabs,移除方案切换器

```yaml
id: REQ-shareclaw-014
type: requirement
title: conversation.html/task-conversation.html顶栏移除侧边栏交互方案切换器,永久锁定static-tabs
statement_ears: "当用户在conversation.html或task-conversation.html页面时,系统不应展示'侧边栏交互方案'的两级切换入口,页面应恒定运行在static-tabs(static-detail)能力下"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-11 Chat Pages Lock To Static-Tabs; Scheme Switcher Removed", reason: "该改动曾被连同collapse-toggle红点一起回滚到早期checkpoint,同一天又被用户明确重新确认应用"}
target_prototype: "conversation.html/task-conversation.html顶栏"
acceptance_criteria:
  - {id: AC-1, check_type: deterministic, check: "这两个页面顶栏DOM中不存在#schemeSwitchBtn/#schemeSwitchMenu"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 页面加载, When 检查输出面板行为, Then 恒定为static-detail(无动态tab strip,单一右侧详情页,业务对象走独立抽屉)"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given 其他页面(非这两个), When 检查其顶栏, Then 仍保留独立的'方案1/方案2'(state.uiScheme)切换器,不受本条影响"}
```

## 样本 15 — 折叠侧栏toggle显示未读红点

```yaml
id: REQ-shareclaw-015
type: requirement
title: 侧栏折叠toggle在'已折叠且历史列表存在未读'时显示红点
statement_ears: "当侧栏处于折叠状态且历史列表中存在至少一条未读标记时,系统应当在#chatSidebarToggleBtn上显示红点;侧栏展开后应清除该红点"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-11 Collapsed Sidebar Toggle Shows Unread Red Badge", reason: "复用生成结果toggle已有的红点逻辑,保持一致的未读提示体验"}
target_prototype: "conversation.html/task-conversation.html — #chatSidebarToggleBtn.has-badge / syncSidebarToggleBadge()"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 侧栏折叠且#historyList内存在.history-status-dot.is-unread, When 检查toggle按钮, Then 显示红点"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 侧栏展开, When 检查toggle按钮, Then 红点清除"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given 折叠状态下阅读了一条自动化report(markAutomationRunRead触发), When 未读状态更新, Then 红点通过renderHistoryList()正常路径同步,而非独立的未读记账来源"}
```

## 样本 16 — Copilot客户详情页数据驱动Q&A + exec卡片样式对齐

```yaml
id: REQ-shareclaw-016
type: requirement
title: copilot客户详情页的欢迎指令/问答内容按客户确定性派生,exec卡片对齐conversation.html的新建客户卡样式
statement_ears: "当用户在copilot客户详情页触发欢迎指令问答时,系统应当基于当前客户名确定性派生问答内容(业务逻辑固定,仅变量随客户变化),且执行卡片(.agent-chat-exec)的视觉样式应与conversation.html的.agent-action-card(新建客户卡)保持一致"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-22 Copilot Detail Page + Data-Driven Instruction Drill-Down", reason: "用户明确指出这才是他所说的'ask-user-question样式',而非紫色.ask-user-question-card;q1速览已按用户要求移除,当前仅q2/q3/q4"}
target_prototype: "copilot/list-page.html + copilot/object-detail-overlay.html — buildCustomerScript(currentCustomer) / .agent-chat-exec"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 同一instruction对不同客户触发, When 生成回答, Then 业务逻辑/话术结构完全一致,仅客户名等变量不同"}
  - {id: AC-2, check_type: deterministic, check: "当前欢迎指令列表只包含q2诊断/q3风险情报/q4增购,不含q1速览"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given .agent-chat-exec渲染, When 对比conversation.html的.agent-action-card, Then 边框(0.5px #dee1e8无阴影)/圆角16px/标题+可执行紫pill/动作按钮为底部黑色.primary按钮(非紫色/非行内) 均一致"}
  - {id: AC-4, check_type: deterministic, check: "renderAgentAnswer不渲染agent头像/ShareAgent名(不调用renderAgentAiMeta)"}
  - {id: AC-5, check_type: deterministic, check: "num派生helper使用无符号右移>>>,而非有符号>>"}
```

## 样本 17 — ShareAgent标题菜单在8个桌面页面上必须一致共享

```yaml
id: REQ-shareclaw-017
type: requirement
title: ShareAgent标题下拉菜单(设置/剩余用量)在全部8个桌面页面行为必须完全一致
statement_ears: "当ShareAgent标题下拉菜单的'设置'或'剩余用量展开'交互被修改时,系统应当将该修改同步应用到全部8个桌面HTML页面,而非仅修改单一页面"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md 2026-06-04 ShareAgent Title Menu Is Shared Across Desktop Pages (Correction Log)", reason: "用户明确要求已完成的下拉菜单/弹窗调整需应用到每个页面导航"}
target_prototype: "index.html/conversation.html/task-conversation.html/task.html/docs.html/settings.html/market.html/messenger.html — #sidebarTitleMenu / #sidebarUsageDetail / #generalSettingsOverlay"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 检查全部8个桌面页面, When 打开ShareAgent标题菜单, Then 每个页面的菜单结构/剩余用量展开行为一致"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 点击'设置', When 打开modal, Then 不导航离开当前页;保存持久化state.aiProfile并更新侧栏标题;取消/点击遮罩/Esc不提交待处理编辑"}
```

## 样本 18 — 静态详情模式下从外部图标重新打开生成结果，进列表而非陈旧详情

```yaml
id: REQ-shareclaw-018
type: requirement
title: 静态详情模式下重新打开生成结果面板应进入列表,不应停留陈旧详情
statement_ears: "当处于静态详情(static-detail)模式且用户从外部生成结果图标重新打开面板时,系统应当展示列表视图,而不是此前遗留的某个陈旧详情页"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md Correction Log表格 - Generated-results reopening", reason: "correction log明确记录的纠正项"}
target_prototype: "conversation.html/task-conversation.html — #chatOutputToggleBtn"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 静态详情模式下面板此前显示过某个detail后被收起, When 从外部#chatOutputToggleBtn重新打开, Then 展示list视图而非停留在此前的detail"}
```

## 样本 19 — 多个chat card详情互斥,不叠加

```yaml
id: REQ-shareclaw-019
type: requirement
title: 打开新的静态详情/业务抽屉应替换而非叠加此前的详情
statement_ears: "当用户在静态详情模式下连续打开多个chat card对应的详情或业务对象抽屉时,系统应当用新打开的详情替换此前的详情,而不是堆叠展示"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md Correction Log表格 - Multiple chat card opens", reason: "correction log明确记录的纠正项"}
target_prototype: "conversation.html — 文档详情/#businessObjectOverlay 互斥关系"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 已打开文档详情A, When 点击打开业务对象详情B, Then 详情A被清除,只展示B(非A+B同时叠加)"}
```

## 样本 20 — 自动化未读状态左右一致性

```yaml
id: REQ-shareclaw-020
type: requirement
title: 自动化任务左侧未读标记与右侧report未读蓝点必须保持一致
statement_ears: "当自动化任务的左侧未读标记存在时,系统应当保证右侧至少存在一条对应的未读report;不应出现左侧显示未读但右侧无未读report的不一致状态"
source_trace:
  - {type: existing_product, ref: "SHARECLAW_DECISION_LOG.md Correction Log表格 - Automation unread state", reason: "correction log明确记录的纠正项;与样本5同属自动化未读语义域但检验角度不同——样本5测'点击才清除',本条测'左右两侧计数一致性',保留为独立样本但标注两者存在同域相关性，phase 1 结果解读时注意"}
target_prototype: "task-conversation.html — 左侧#historyList任务未读标记 vs 右侧.automation-report-row.unread"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 左侧某自动化任务显示未读标记, When 检查该任务右侧report列表, Then 至少存在一条.automation-report-row.unread,不应left标未读而right全部已读"}
```

---

## 样本 21 — 会中"工具"tab展示规则（Figma节点 `3934:19097`，速记项目）

```yaml
id: REQ-速记-021
type: requirement
title: 会中工具(关键信号/会议笔记等)tab展示规则——单工具不显示tab,多工具动态tab+记忆状态
statement_ears: "当会中激活的工具数量为1时,系统应当只展示该工具标题、不展示tab页签;当激活工具数量>1时,系统应当以可删除的动态tab页签展示,且工具开关状态需跨session记忆,关闭工具不停用后台信号捕获(有新信号时红点提示)"
source_trace:
  - {type: meeting, ref: "Figma文件'速记汇报版本'节点3934:19097,由luca直接指定", reason: "对比'只展示一个工具'/'客户会议展示多工具'/'内部会议展示多工具'三种UI变体的交互规范标注"}
authenticity:
  entailment:
    verdict: extends
    compared_against: none
    ref: "延伸自会议语料条目31-34(会中三区域框架/简洁模式文字模式切换),本条是'工具tab展示'这一子行为的细化设计"
target_prototype: "Figma节点3934:19097(设计稿,尚无对应HTML实现——本条proto-judge校准对象是'设计稿本身是否自洽满足其自身标注的规则',非对照已上线代码)"
acceptance_criteria:
  - {id: AC-1, check_type: semantic, given_when_then: "Given 未选择会议类型, When 查看默认状态, Then 只显示'关键信号'一个工具,且不展示tab页签"}
  - {id: AC-2, check_type: semantic, given_when_then: "Given 选定会议类型后关键信号+会议笔记等多个工具被激活, When 查看界面, Then 展示可删除的动态tab,且默认聚焦定位到'会议笔记'(即使'关键信号'在顺序上排第一)"}
  - {id: AC-3, check_type: semantic, given_when_then: "Given 用户关闭某个工具, When 该工具后台产生新信号, Then 出现红点提示(说明后台仍在捕获,并非真正停用)"}
  - {id: AC-4, check_type: semantic, given_when_then: "Given 用户上次关闭了某工具, When 下次重新打开会话, Then 该工具仍保持关闭状态(记忆生效)"}
```

---

## 备注

- 21 个样本里，样本1-20 对照的是**已经真实存在、可在浏览器直接打开的HTML**（`/Users/luca/Documents/GitHub/shareclawdemo/*.html`）；样本21对照的是**Figma设计稿本身**（尚无HTML实现），判定方式略有不同——luca 打分时请按各自 target_prototype 的说明去对照，不要混淆。
- AC 全部依据源文档原文改写，**没有反查当前代码/设计稿的真实实现状态**——不排除有些 AC 现在的代码/设计其实并不满足（这正是 Phase 1 想测出来的，不是我提前踩了刹车）。
- 样本5与样本20同属"自动化未读"语义域但检验角度不同（点击清除 vs 左右一致性）——已在样本20注明，phase 1 结果解读时留意这层弱相关性，不要把两条的一致/不一致简单相加成两个完全独立的信号。
