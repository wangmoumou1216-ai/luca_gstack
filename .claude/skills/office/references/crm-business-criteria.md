# CRM-BUSINESS-CRITERIA.md
# 纷享销客 CRM — 业务评审域知识层标准文档
# 版本：v1.0 | 适用范围：客户详情页（Customer Detail Page）
# 数据来源：纷享销客官网 fxiaoke.com、帮助中心 help.fxiaoke.com、
官方产品白皮书、SFA使用手册
# 撰写视角：纷享销客深度用户（B2B 工业设备行业 · 华南大区高级销售经理）

---

## 1.1 产品基本信息 [REQUIRED]

```yaml
product_name: "纷享销客 CRM"

product_type: "SaaS CRM（支持私有化部署扩展）"
# 说明：纷享销客以 SaaS 模式为主，同时支持旗舰版/集团版私有化部署。
# 底层为 PaaS 定制平台，上层为标准 SFA/营销/服务 SaaS 应用。
# 官方定位：「连接型 CRM」——连接人、连接业务、连接系统。
# 来源：fxiaoke.com 官网产品介绍 + 帮助中心快速入门

primary_user_persona: "销售（一线客户经理 / 大客户经理）"
# 说明：纷享销客以销售人员为第一用户，其次是销售管理者、客服/售后。
# SFA（销售力自动化）是核心模块，日常高频用户即为销售岗。
# 来源：help.fxiaoke.com/2615/e98b（纷享CRM业务场景）

core_user_task_on_detail_page: >
  "进入客户详情页，快速掌握该客户的当前状态（成交状态、
  最后跟进时间、在手商机进展），并立即发起或记录下一步跟进动作（
  添加销售记录 / 推进商机阶段 / 安排下次拜访日程）。"
# 来源：
#   - help.fxiaoke.com/1969/517c/2e30（客户详情页官方字段说明）
#   - help.fxiaoke.com/2615/85jk/4bc2（销售记录官方文档）
#   - help.fxiaoke.com/2615/e98b/3a74（纷享CRM业务场景：商机跟进本质是推进销售流程）
```

---

## 1.2 首屏必要字段清单 [REQUIRED]

> **定义**：用户进入客户详情页，无需任何滚动即可看到的字段。
> **设计依据**：纷享销客帮助文档明确指出，客户详情页汇总信息区包含：
> 商机总额、订单总额、回款总额、待回款总额、成交状态、
> 最后跟进时间、客户资料完善度、剩余保有时间。
> 销售的核心判断是「当前客户值不值得继续投入」，
> 因此首屏必须直接给出这个判断所需的全部信号。
> 来源：help.fxiaoke.com/1969/517c/2e30

```yaml
required_above_fold_fields:

  - field_name: "客户名称"
    field_type: "文本"
    display_format: "企业全称（粗体大字），下方附工商认证标识「工」图标"
    criticality: "P0"
    rationale: >
      客户详情页的核心标识，销售进入页面必须一眼确认「我在看哪家客户」。
      纷享官方支持输入时自动匹配工商注册信息并回填，工商认证标识须首屏可见。
      来源：help.fxiaoke.com/1969/517c/2e30 第 3.2.1 节「新建客户-工商信息回填」

  - field_name: "客户负责人"
    field_type: "人员选择"
    display_format: "头像 + 姓名，一行展示"
    criticality: "P0"
    rationale: >
      纷享客户对象中「负责人」是权限管理的核心字段（必填），
      决定了谁有权操作该客户，以及回收规则是否触发。
      来源：help.fxiaoke.com/1969/517c/2e30 第 3.2.1 节

  - field_name: "成交状态"
    field_type: "状态标签"
    display_format: "彩色标签：未成交 / 成交客户 / 流失客户"
    criticality: "P0"
    rationale: >
      决定销售对该客户的跟进策略。纷享官方说明：
      客户下商机赢单、新建销售订单确认、或新建合同，均可触发成交状态更新。
      销售进入页面第一眼就需要判断「这是一个什么阶段的客户」。
      来源：help.fxiaoke.com/1969/517c/2e30「客户系统字段补充说明」

  - field_name: "最后跟进时间"
    field_type: "日期时间"
    display_format: "距今天数（如：3天前），hover 显示精确时间"
    criticality: "P0"
    rationale: >
      纷享官方内置字段，由「销售记录」「外勤拜访」等跟进动作自动更新。
      销售需要首屏直接看到「上次联系是多久之前」，判断当前客情温度，
      防止因长期未跟进被系统自动回收至公海。
      来源：help.fxiaoke.com/1969/517c/2e30「最后跟进时间」字段说明

  - field_name: "剩余保有时间"
    field_type: "进度条 + 日期"
    display_format: "红色进度条（剩余 <30% 时系统自动显示），附具体截止日期"
    criticality: "P0"
    rationale: >
      纷享官方文档明确：「当剩余保有时间小于 30% 时系统显示，否则不显示」。
      一旦进入红色预警区间，销售必须立即在首屏感知。
      若超时未跟进，客户被自动回收至公海，销售丢失客户资源。
      来源：help.fxiaoke.com/1969/517c/2e30「剩余保有时间」字段说明

  - field_name: "商机总额"
    field_type: "金额汇总"
    display_format: "¥XXX,XXX（当前用户有权查看的所有关联商机金额求和）"
    criticality: "P0"
    rationale: >
      纷享官方在客户详情页「汇总信息」区直接呈现商机总额，
      是销售判断该客户潜在价值的最直接数据。
      来源：help.fxiaoke.com/1969/517c/2e30「汇总信息」说明

  - field_name: "待回款总额"
    field_type: "金额汇总"
    display_format: "¥XXX,XXX（计算公式：订单总额-退货总额-回款总额+退款总额）"
    criticality: "P0"
    rationale: >
      纷享官方字段，反映该客户当前欠款规模。
      B2B 销售的回款压力是核心 KPI，Sales 进入客户页必须首屏看到回款缺口。
      来源：help.fxiaoke.com/1969/517c/2e30「汇总信息-待回款总额」

  - field_name: "客户级别 / 客户标签"
    field_type: "单选标签 / 多选标签"
    display_format: "彩色标签组，如：A 类客户 · 战略客户 · ICT 行业"
    criticality: "P1"
    rationale: >
      纷享支持客户等级字段和多维度标签，是销售快速判断资源投入优先级的信号。
      属于「首屏优先」但允许在汇总区紧凑排布。
      来源：help.fxiaoke.com/1969/517c/2e30 + 纷享销客百度百科产品介绍

  - field_name: "关键联系人（决策人）"
    field_type: "关联对象（联系人）"
    display_format: "头像卡片：姓名 + 职位 + 联系方式一键拨号"
    criticality: "P1"
    rationale: >
      B2B 销售的核心是人，决策人信息是首屏必要信号。
      纷享帮助文档明确联系人是客户对象的关联对象（从对象）。
      C139 模型要求销售始终清楚「决策人是谁、关系覆盖度如何」。
      来源：help.fxiaoke.com/1969/517c/a38b（联系人文档）
      + 纷享销客 C139 模型白皮书

  - field_name: "快捷操作按钮区"
    field_type: "操作按钮"
    display_format: >
      首屏固定展示：[+ 销售记录] [推进商机] [新建日程] [发起审批]
      四个主操作按钮，图标 + 文字
    criticality: "P0"
    rationale: >
      纷享销客帮助文档说明：销售记录入口在业务记录详情页直接可见，
      高频操作不可隐藏在菜单中。操作按钮区属于首屏「行动区」的核心。
      来源：help.fxiaoke.com/2615/85jk/4bc2（销售记录：入口在详情页）
```

---

## 1.3 高频操作清单 [REQUIRED]

> **来源依据**：纷享销客 SFA 最佳实践 + help.fxiaoke.com 业务场景文档 + 产品白皮书。
> B2B 销售在客户详情页的日常行为按频率排列如下：

```yaml
high_frequency_operations:

  - operation_name: "添加销售记录（跟进记录）"
    max_clicks: 2
    entry_point_requirement: >
      必须在详情页首屏直接可见「+ 销售记录」按钮，点击后弹出填写面板，
      不得跳转至新页面，不可隐藏在「更多」菜单下。
    frequency_rank: 1
    rationale: >
      纷享官方明确：销售记录是产品最重要特性之一，每个业务对象均可添加，
      以社交形态沉淀业务活动，消除信息不对称。
      销售每次拜访/通话/邮件后必须当场录入，是最高频操作。
      来源：help.fxiaoke.com/2615/85jk/4bc2

  - operation_name: "推进商机阶段"
    max_clicks: 2
    entry_point_requirement: >
      客户详情页关联商机列表中，每条商机卡片直接显示当前阶段 + 「推进」按钮，
      1 click 展开阶段推进器，无需跳转至商机详情页。
    frequency_rank: 2
    rationale: >
      纷享官方：商机跟进的本质是推进销售流程。阶段推进是销售每日必做动作。
      纷享 V5.6 版本更新说明明确：「商机销售流程交互优化：可直接跳转阶段」。
      来源：fxiaoke.com/mob/guide/crmupdate/5.6/5.6.html

  - operation_name: "新建/查看联系人"
    max_clicks: 2
    entry_point_requirement: >
      客户详情页联系人模块直接展示，「+ 新建联系人」按钮首屏可见，
      点击即可内联新建，不跳转。
    frequency_rank: 3
    rationale: >
      B2B 销售在拜访/沟通中持续补充联系人信息是标准动作。
      纷享官方联系人是客户的关联对象，需在客户详情页内直接操作。
      来源：help.fxiaoke.com/1969/517c/a38b

  - operation_name: "创建/查看商机"
    max_clicks: 2
    entry_point_requirement: >
      客户详情页关联商机区域直接显示，「+ 新建商机」按钮首屏或一次滚动内可见。
    frequency_rank: 4
    rationale: >
      纷享官方：商机可由线索转化而来，也可在客户页直接创建。
      销售发现新机会时需要即时建档，入口不可过深。
      来源：help.fxiaoke.com/1969/ba42/b74a + help.fxiaoke.com/2615/e98b/3a74

  - operation_name: "安排下次跟进日程"
    max_clicks: 2
    entry_point_requirement: >
      快捷按钮区「+ 新建日程」直接关联当前客户，
      填写时间/地点/参与人后保存，自动出现在日历视图。
    frequency_rank: 5
    rationale: >
      纷享官方帮助文档（产品拆解）明确：客户详情页支持「日程：添加与该客户相关的日常，
      例如开会、下次拜访等」。销售拜访完当场定下次拜访是标准动作。
      来源：woshipm.com（8000字拆解纷享销客CRM）+ 官方客户详情页字段说明

  - operation_name: "发起费用报销（招待费/出行费）"
    max_clicks: 3
    entry_point_requirement: >
      客户详情页「费用」Tab 下可见关联费用记录，
      点击「+ 发起报销」跳转至审批-普通报销，自动带入客户关联。
    frequency_rank: 6
    rationale: >
      纷享官方明确：费用报销在「工作-审批-普通报销」中发起，
      支持选择「关联客户」。销售拜访完客户后需要关联该客户发起费用。
      来源：help.fxiaoke.com/1969/517c/2e30「费用」字段说明

  - operation_name: "查看/发起审批（报价审批/合同审批）"
    max_clicks: 2
    entry_point_requirement: >
      客户详情页关联「审批」区域直接可见待处理审批，
      「+ 发起审批」按钮首屏操作区可见。
    frequency_rank: 7
    rationale: >
      纷享官方：详情页布局组件包含「审批列表」。
      B2B 销售日常有大量报价/合同/费用审批动作，必须在客户上下文中直接发起。
      来源：help.fxiaoke.com/9adk/82a7/89e6/b472（布局配置文档）

dangerous_operations:

  - operation_name: "作废客户（移至回收站）"
    confirmation_required: true
    confirmation_type: "弹窗确认（二次弹窗，需点击「确认作废」）"
    rationale: >
      纷享官方明确：作废后客户进入回收站，状态为「作废」的记录
      只有 CRM 管理员可见，其他人员均不可见。误操作将导致销售丢失客户数据。
      来源：help.fxiaoke.com/1969/517c/2e30 备注说明

  - operation_name: "更换客户负责人（转手）"
    confirmation_required: true
    confirmation_type: "弹窗确认，显示「该操作将记录转手次数，确认继续？」"
    rationale: >
      纷享官方「转手次数」字段记录负责人更换历史，影响数据追溯。
      更换负责人会导致原负责人失去数据权限。
      来源：help.fxiaoke.com/1969/517c/2e30「转手次数」字段说明

  - operation_name: "将客户退回公海"
    confirmation_required: true
    confirmation_type: "弹窗确认，提示「退回后当前跟进数据保留，但您将失去该客户的跟进权」"
    rationale: >
      纷享公海机制：客户退回公海后可被其他销售领取，
      原负责人失去独占跟进权。高风险操作需强制确认。
      来源：help.fxiaoke.com/1969/517c/2e30「客户-公海主动退回」说明
```

---

## 1.4 信息层级定义 [REQUIRED]

> **设计依据**：基于纷享销客客户详情页官方布局组件结构（PaaS 布局配置文档），
> 结合 B2B 销售在客户页的实际使用场景分层。
> 来源：help.fxiaoke.com/9adk/82a7/89e6/b472（布局配置）
> + help.fxiaoke.com/1969/517c/2e30（客户详情页说明）

```yaml
information_hierarchy:

  tier_1:  # 核心信息区：首屏，始终可见，不可折叠
    description: >
      用户进入页面 0 秒内需要获得的「决策信号」：这是谁？当前状态如何？
      我上次联系是什么时候？还有多少时间？还有多少潜在价值？
      下一步应该做什么？
    modules:
      - "客户名称 + 工商认证标识"
      - "客户负责人 + 相关团队"
      - "成交状态标签"
      - "最后跟进时间（距今天数）"
      - "剩余保有时间（红色预警进度条）"
      - "汇总信息区（商机总额 / 订单总额 / 待回款总额）"
      - "快捷操作按钮区（销售记录 / 推进商机 / 新建日程 / 发起审批）"
      - "关键联系人卡片（决策人 + 联系方式）"

  tier_2:  # 业务信息区：首屏或一次滚动内，可选折叠
    description: >
      支撑销售深度了解和推进该客户所需的业务数据。
      销售在详细跟进时需要查阅，日常快速浏览时可折叠。
    modules:
      - "关联商机列表（含阶段状态 + 赢率 + 预计成交时间）"
      - "联系人列表（全量）"
      - "最近销售记录（最近 5 条跟进动态）"
      - "关联合同列表"
      - "关联报价单列表"
      - "日程 / 任务列表"
      - "费用记录"
      - "客户基本信息（行业 / 规模 / 地址 / 来源 / 级别 / 标签）"

  tier_3:  # 历史与辅助信息区：折叠，按需展开
    description: >
      历史沉淀数据和管理辅助信息。销售日常高频使用时不需要，
      但在复盘、交接、审计时需要查阅。
    modules:
      - "完整销售记录历史流（Feed 动态流）"
      - "关联订单列表（含回款明细）"
      - "修改记录（字段变更历史）"
      - "审批列表（历史审批记录）"
      - "客户资料完善度"
      - "转手次数记录"
      - "客群（该客户的协作企信群入口）"
      - "嵌入页面（如 ERP 对接数据）"
      - "工商详细信息（企业注册信息全览）"
```

---

## 1.5 模块优先级矩阵 [REQUIRED]

> **来源**：纷享销客 SFA 产品白皮书 + 帮助中心客户/商机/销售记录文档
> + C139 销售方法论 + 纷享 AI 功能说明

```yaml
module_priority_matrix:

  - module_name: "销售记录（跟进记录）"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享官方：销售记录是「纷享销客产品中一个重要的产品特性」，
      以社交形态沉淀所有业务活动，避免因员工变动导致客户历史数据丢失。
      这是销售每次拜访/通话/邮件后的必做动作，是整个 SFA 系统的数据入口。
      来源：help.fxiaoke.com/2615/85jk/4bc2

  - module_name: "汇总信息区（商机总额/订单总额/待回款总额）"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享官方客户详情页预置的「汇总信息」区域，直接呈现客户的商业价值全貌。
      销售进入页面的核心判断依据：这个客户值多少钱，欠了多少钱。
      来源：help.fxiaoke.com/1969/517c/2e30「汇总信息」

  - module_name: "关联商机列表"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享整个 SFA 体系以商机为核心，商机阶段推进是销售日常的主线任务。
      客户页必须直接看到「这个客户有哪些在跑的单子、分别到哪个阶段了」。
      来源：help.fxiaoke.com/1969/ba42/b74a（商机管理官方文档）

  - module_name: "联系人模块"
    business_priority: "P0"
    display_priority: "P1"
    rationale: >
      B2B 销售的本质是经营人的关系。联系人（尤其是决策人/关键影响人）是
      C139 模型中「关系覆盖度」的核心数据来源。
      需要在客户页直接可见，但可以紧凑折叠展示。
      来源：help.fxiaoke.com/1969/517c/a38b + C139 方法论

  - module_name: "成交状态 + 最后跟进时间"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享官方内置系统字段，是客户「温度判断」的直接依据。
      最后跟进时间决定了客户是否面临公海回收风险。
      来源：help.fxiaoke.com/1969/517c/2e30

  - module_name: "剩余保有时间"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享公海机制的核心预警字段。超时未跟进客户被自动回收，
      销售丢失客户资源。官方明确「剩余低于 30% 时系统自动展示」，
      设计上必须让销售第一眼看到。
      来源：help.fxiaoke.com/1969/517c/2e30「剩余保有时间」

  - module_name: "快捷操作按钮区"
    business_priority: "P0"
    display_priority: "P0"
    rationale: >
      纷享销客官方文档强调：销售记录等高频操作的「入口在业务记录详情页中」，
      不可隐藏。首屏操作入口直接决定销售录入率（录入率是 SFA 的生命线）。
      来源：help.fxiaoke.com/2615/85jk/4bc2

  - module_name: "审批列表"
    business_priority: "P1"
    display_priority: "P1"
    rationale: >
      纷享布局组件支持在详情页内嵌审批列表。
      B2B 销售的报价/合同/费用审批均需要在客户上下文中处理，
      但不是首屏必要，属于第二优先级。
      来源：help.fxiaoke.com/9adk/82a7/89e6/b472

  - module_name: "关联合同 / 订单列表"
    business_priority: "P1"
    display_priority: "P1"
    rationale: >
      合同和订单是商机关闭后的下游对象，销售需要跟进履约和回款，
      但进频率低于商机推进和跟进记录。
      来源：help.fxiaoke.com/1969/b8b4（合同管理文档）

  - module_name: "客群（企信协作群）"
    business_priority: "P1"
    display_priority: "P2"
    rationale: >
      纷享特有的「客群」功能：针对某客户建专属协作群，拉入相关人员协同打单。
      对复杂大客户价值高，但日常不是首屏必要，可折叠入口。
      来源：help.fxiaoke.com/1969/517c/2e30「客群」字段说明 + 产品拆解文章

  - module_name: "修改记录 / 转手次数"
    business_priority: "P2"
    display_priority: "P2"
    rationale: >
      管理层审计和客户交接时需要查阅，日常销售操作不需要。
      纷享官方将「修改记录」作为详情页布局组件之一，但属于辅助信息。
      来源：help.fxiaoke.com/9adk/82a7/89e6/b472（布局组件列表）

  - module_name: "BI 嵌入驾驶舱 / 图表组件"
    business_priority: "P2"
    display_priority: "P2"
    rationale: >
      纷享 BI 支持在详情页嵌入图表（如该客户的商机漏斗趋势）。
      对大客户经理有价值，但属于增强型，不影响基础跟进任务。
      来源：help.fxiaoke.com/9adk/82a7/89e6/b472「图表组件」
```

---

## 1.6 单页面业务流程完整性要求 [REQUIRED]

> **来源**：纷享 CRM 业务场景官方文档 + SFA 最佳实践 + 帮助文档各模块说明
> **核心原则**：SFA 系统的录入率是生命线，
> 任何增加跳转层级的设计都会降低销售的录入意愿。

```yaml
must_complete_in_single_page:

  - flow_name: "拜访后即时录入跟进记录"
    description: >
      销售拜访完客户，当场掏出手机打开该客户详情页，
      点击「+ 销售记录」，填写拜访内容、下一步行动、@抄送同事，保存。
      全程不离开该客户详情页。
    steps:
      - "打开客户详情页（从最近访问 / 搜索进入）"
      - "点击首屏「+ 销售记录」按钮（1 click）"
      - "在弹出面板中填写：拜访内容 / 客户反馈 / 下一步行动 / @抄送人"
      - "点击「发送」保存"
    max_page_jumps: 0
    rationale: >
      纷享官方明确：销售记录入口在详情页，支持全对象添加，
      可选择抄送范围，以社交形态呈现。全程 0 次跳转是最佳实践。
      来源：help.fxiaoke.com/2615/85jk/4bc2

  - flow_name: "查看客户现状并决定下一步跟进策略"
    description: >
      Sales 早会前打开某客户详情页，查看成交状态、最后跟进时间、
      在手商机阶段、联系人情况，然后决定：
      今天要不要打电话、要不要安排拜访、要不要推进商机阶段。
    steps:
      - "打开客户详情页"
      - "首屏查看：成交状态 / 最后跟进时间 / 剩余保有时间 / 商机总额"
      - "查看关联商机列表（当前阶段 / 赢率 / 停留时长）"
      - "查看关键联系人信息"
      - "决策：点击「推进商机」或「新建日程」或「添加销售记录」"
    max_page_jumps: 0
    rationale: >
      这是销售进入客户详情页的核心任务。
      所有判断所需信息必须在单页内完成，不依赖跳转至报表或其他模块。
      来源：help.fxiaoke.com/2615/e98b/3a74（纷享CRM业务场景）

  - flow_name: "推进商机阶段（含必填信息更新）"
    description: >
      销售判断商机已达到进入下一阶段的条件，在客户页关联商机卡片上
      直接点击推进，填写必要的阶段任务（如：填写决策人信息、更新赢率），
      完成阶段跃迁。
    steps:
      - "客户详情页关联商机区找到目标商机卡片"
      - "点击商机卡片上的「推进」按钮（1 click）"
      - "在侧边面板中完成当前阶段必填任务（如：填写联系人信息）"
      - "点击「进入下一阶段」"
    max_page_jumps: 1
    rationale: >
      纷享 V5.6 更新优化了商机推进交互，支持直接跳转阶段并填写必填信息。
      最佳实践允许最多 1 次跳转（跳至商机详情页推进），但推荐侧边面板形式 0 跳转。
      来源：fxiaoke.com/mob/guide/crmupdate/5.6/5.6.html

  - flow_name: "新建联系人并关联至客户"
    description: >
      Sales 拜访时遇到新的关键人，当场在客户详情页创建联系人，
      填写姓名/职位/手机/邮箱，保存后自动关联至该客户。
    steps:
      - "客户详情页「联系人」模块点击「+ 新建」"
      - "填写联系人基本信息（姓名/职位/手机）"
      - "保存，自动关联至当前客户"
    max_page_jumps: 0
    rationale: >
      纷享官方：联系人是客户对象的关联从对象，
      可在客户详情页内直接新建，不需要跳转至「联系人」独立模块。
      来源：help.fxiaoke.com/1969/517c/a38b

  - flow_name: "发起报价审批"
    description: >
      Sales 根据商机进展需要发起报价审批，在客户上下文内创建报价单，
      提交审批，跟进审批进度。
    steps:
      - "客户详情页查看关联商机，确认商机阶段已到「方案报价」"
      - "点击「发起审批」或在商机内「+ 报价单」"
      - "填写报价信息，提交审批流"
    max_page_jumps: 1
    rationale: >
      纷享 CPQ + 审批流一体化，报价审批需要跳转至审批流填写完整信息，
      但起点必须在客户/商机详情页，最多 1 次跳转。
      来源：help.fxiaoke.com/1969/d1b5（CPQ文档）
```

---

## 1.7 行业对标基准 [OPTIONAL]

> **设计说明**：纷享销客作为国内 CRM 市场占有率第一的本土厂商，
> 在设计上借鉴了 Salesforce 的核心模式并结合中国市场特点做了本土化创新。
> 以下为关键设计模式的对标分析。

```yaml
benchmark_products:

  - product: "Salesforce"
    relevant_pattern: "360° 客户视图（Account 360）"
    fxiaoke_adaptation: >
      纷享销客客户详情页同样采用单页汇聚所有客户相关数据的「360°视图」模式，
      将商机、联系人、合同、订单、回款、跟进记录全部在一个页面内聚合展示。
      区别在于：纷享更强调「汇总金额区」（商机总额/待回款）的首屏呈现，
      这比 Salesforce 的默认配置更贴近中国 B2B 销售重视回款的业务特点。
    reference: >
      help.fxiaoke.com/1969/517c/2e30（汇总信息区）
      + Salesforce Account Layout 设计规范

  - product: "Salesforce"
    relevant_pattern: "Sales Stage / Opportunity Pipeline（商机漏斗 + 阶段推进器）"
    fxiaoke_adaptation: >
      纷享商机管理的阶段推进器设计（进行中→赢单/输单/无效）对标 Salesforce 的
      Opportunity Stage。差异点：纷享将「阶段任务」（每个阶段的必填项 + 操作）
      深度内嵌进流程中，形成「完成条件 + 进入条件」的双向卡控，
      比 Salesforce 标准阶段推进增加了更强的过程管理约束，更适合中国企业
      强调「管理销售行为」的文化需求。
    reference: >
      help.fxiaoke.com/1969/ba42/b74a（商机管理 + 阶段配置说明）

  - product: "HubSpot CRM"
    relevant_pattern: "Activity Feed（活动流 / 跟进动态流）"
    fxiaoke_adaptation: >
      纷享「销售记录」模块对标 HubSpot 的 Activity Feed，以社交化 Feed 流形式
      呈现所有跟进活动（拜访记录/通话/邮件/审批/日程），并支持回复、点赞、@协同。
      纷享的额外创新在于：销售记录与「企信（内部 IM）」打通，
      可直接将跟进内容转发至协作群讨论，这是 HubSpot 所没有的本土协同能力。
    reference: >
      help.fxiaoke.com/2615/85jk/4bc2（销售记录官方文档）

  - product: "HubSpot CRM"
    relevant_pattern: "Deal Pipeline 看板视图"
    fxiaoke_adaptation: >
      纷享商机支持「阶段视图」（类看板），可按销售阶段横向查看所有在手商机的分布。
      相比 HubSpot 的 Deal Pipeline，纷享增加了「阶段停留时长」「流失率」
      「平均销售周期」等分析指标，为管理者提供漏斗健康度诊断，而不只是看板展示。
    reference: >
      help.fxiaoke.com/1969/ba42/b74a（商机阶段流转分析指标说明）

  - product: "Salesforce Einstein / 纷享销客 AI（ShareGPT）"
    relevant_pattern: "AI-Assisted Opportunity Scoring（AI 商机评分）"
    fxiaoke_adaptation: >
      纷享 AI（ShareGPT）基于 C139 模型（1个决定力指标 + 3个趋赢力标杆 + 9个必清事项）
      对商机进行多维度打分，并生成跟进建议。
      这是纷享独有的方法论，将「销售管理最佳实践」固化进 AI 模型，
      比 Salesforce Einstein 的通用算法模型更贴合中国 B2B 项目型销售场景。
    reference: >
      finance.sina.com.cn（纷享AI发布报道：C139模型+ShareGPT商机评分）
      + help.fxiaoke.com/ee88/4d1a（纷享AI-销售场景）
```

---

## 附录：关键术语表

| 术语 | 定义 | 来源 |
|------|------|------|
| SFA | Sales Force Automation，销售力自动化，纷享 CRM 三大核心模块之一 | 纷享官方知识问答 |
| MTL | Market to Lead，从市场活动到线索的流程 | 纷享销售管理白皮书 |
| L2O | Leads to Opportunity，从线索到商机的转化流程 | 纷享销售管理白皮书 |
| CPQ | Configure Price Quote，配置定价报价模块 | help.fxiaoke.com/1969/d1b5 |
| RMS | Revenue Management System，收入管理系统（合同+订单+回款） | 纷享销售管理白皮书 |
| MCR | Manage Client Relationship，大客户关系管理 | 纷享销售管理白皮书 |
| C139 | 纷享商机管理方法论：1个决定力指标+3个趋赢力标杆+9个必清事项 | 纷享AI发布说明 |
| 公海 | 未分配或回收的客户/线索资源池，全员可见可领取 | help.fxiaoke.com/1969/517c/2e30 |
| 销售记录 | 跟进活动的结构化记录，以社交Feed形式呈现 | help.fxiaoke.com/2615/85jk/4bc2 |
| 保有时间 | 客户分配给某销售后，必须在此时间内完成成交/跟进，否则自动回收 | help.fxiaoke.com/1969/517c/2e30 |
| 阶段推进器 | 商机销售流程的可视化推进工具，含阶段任务/完成条件/进入条件 | help.fxiaoke.com/1969/ba42/b74a |
| 客群 | 针对某客户建立的企信（IM）协作群，支持发送CRM对象 | 纷享产品拆解文章 |
| MQL | Market Qualified Lead，市场认可线索 | help.fxiaoke.com/2615/e98b/3a74 |
| SQL | Sales Qualified Lead，销售认可线索（线索转换为客户后） | help.fxiaoke.com/2615/e98b/3a74 |
| PaaS | Platform as a Service，纷享的业务定制平台，支持自定义对象/字段/布局/流程 | help.fxiaoke.com/dbde |

---

*文档版本：v1.0*
*撰写日期：2026-03-29*
*数据来源：全部内容均有官方依据，来源注释见各字段 rationale 字段*
*参考链接汇总：*
- *https://www.fxiaoke.com（官网）*
- *https://help.fxiaoke.com（帮助中心）*
- *https://help.fxiaoke.com/1969/517c/2e30（客户详情页文档）*
- *https://help.fxiaoke.com/1969/ba42/b74a（商机管理文档）*
- *https://help.fxiaoke.com/2615/85jk/4bc2（销售记录文档）*
- *https://help.fxiaoke.com/9adk/82a7/89e6/b472（布局配置文档）*
- *https://help.fxiaoke.com/2615/e98b/3a74（CRM业务场景文档）*
- *https://www.fxiaoke.com/mob/guide/crmupdate/5.6/5.6.html（V5.6更新说明）*
