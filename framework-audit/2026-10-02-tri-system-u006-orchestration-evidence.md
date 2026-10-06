# U006 / A-b — 编排用途、复杂度基线与竞争解释

状态：DONE_WITH_CONCERNS（静态审计交付；等待非作者 J-A 验收，不代表行为验证或净收益通过）。
冻结日期：2026-10-03，Asia/Shanghai。执行 owner：制定模块2计划；W04。唯一审计源根：`/Users/luca/Desktop/luca_gstack`，NO_PIN。

## 摘要（少于2000中文字符）

本次按批准的 A-b 卡完成 USE-01—USE-14 的静态审计。26个获准源文件字节与 source-scope、U002 manifest 一致；没有用当前 worktree 冒充被测 B。已核实编排合同要求冻结作用域、依赖、有界修复、独立验收、保留缺片与失败、精确交付引用。runner 和模型 host 有相应的排队、取消、采用校验和关键失败锁存实现。它们证明机制存在，尚不证明真实任务效用。

优先补证点有五个：非关键失败以 null 返回后，消费方如何保留分母和原因；DONE_WITH_CONCERNS 在 worker/QG 接口中的未明确分支；workflow 先写 DONE 再验收的中间状态；按轮数估算 context 和逐阶段确认是否造成无益停止；runner 自行关闭部分原生工具后是否仍适合作为公平比较入口。另记录非法 sandbox 配置回退到 workspace-write 的局部配置风险。均区分直接代码事实、条文不一致与未观察到的损害，不据此宣布架构无效。

所有14项都保留，路由/Context主责项只审编排消费接口。D01—D06是可用的合成观察入口，不能代替真实项目、原生采用、撤销、压缩和交付回归。D04原请求包含 copy tokens，示例答案遗漏不改变验收要求。本次 suite 执行0、行为run 0、新Agent 0；没有收益、token费用或可靠性实测。后续优先把失败回收、恢复授权和全链成本观察并入已批准 U007，最多提出并行/串行、独立验收/自检两类消融，由主协调绑定后执行。

## 共同目的及批准边界



**luca_gstack 是在 Codex 桌面、Codex CLI、Claude Code CLI 中通用使用的一个框架。评估按三体系及其协同作用组织，最终产出一份统一的评估执行计划。** 本文将用户口述的“Cloud Code”按 Claude Code 理解；该名称不改变通用框架这一评估对象。

用户本次明确要求：“按照它们的通用价值，然后去考虑我的框架上面的这几大模块的问题以及计划的输出。”据此，以下约束适用于目的整理、研究、独立规划、设计、审计、比较、裁决和迁移：

- **以共同用途定义价值。** 从理解任务、组织执行、保持信息连续性和必要的人类控制出发，研究框架在当前模型与实际运行环境能力之上增加了什么价值；这些价值是否值得其规则、协调和维护成本。
- **保持一个框架的规划对象。** 不按三个使用端拆成三套方案、三组模块或平台专项 Session，不预设需要新增适配层、平台分支或配置体系。若证据表明统一目标存在无法消除的能力冲突，记录影响并回到共同用途裁决，不由执行者自行扩大架构。
- **区分能力事实与架构选择。** 模型本身的能力、环境实际提供的执行能力、框架增加的机制，分别作为归因依据。环境名称不充当方案分组依据；必要的能力核实服务于同一方案的可行性判断。
- **通用性不等于采用最弱能力。** 不要求实现方式完全相同，也不凭空假设各处都有同一能力。无法取得必要能力时，先检验现有能力能否以更简单方式达到同一结果；仍不能满足必要控制或用途时明确限制，不静默削弱目标。特有增强的收益不能冒充通用收益。
- **以证据控制复杂度。** 每个保留或新增机制都要说明服务的共同用途、必要能力前提、最小替代及净价值。确需核实环境差异时，只检查可能改变结论的行为与控制点，复用同一任务和判据；不得以此自动扩成全端、全组合的独立评估工程。
- **按模块职责限定范围。** 三体系评估负责通用的任务分流、Agent 协作、Context 提供及其交接；技能内部领域方法、动效或其他具体交付流程仍由技能 owner 负责。技能作为真实任务的消费方或案例时，只检查与三体系有关的输入、输出和控制衔接。发现技能内部问题，记录具体责任边界，不自动扩大为技能重构或新增评估模块。
- **允许高价值交集优先进入。** 主协调者可将直接改善共同用途或评估可信度、且能保留最新提交有效行为的交集列为优先项。先复用现有 owner；确有额外收益才设计最小增补实验，并记录收益依据、责任边界和回归要求。优先项使用既有任务卡，不新增阶段或审批体系，也不扩大实施授权。

本节是共同输入合同，必须随最小任务包和跨 Session 交接传递。执行者不能只读某一阶段而丢失本节约束。

**最新用户侧重（2026-10-02）：Codex 桌面与 Codex CLI 是主要研究、开发校准和收益验证环境。** 先查这两者可用的原生能力及框架增量；Claude Code 仅做可能改变共同用途判断的兼容/必要控制检查。API 是单列的能力表面，区分本地 Codex SDK/app-server、托管 Agents API、应用内 Agents SDK 和 Responses；不自动新增平台工程。保持一个框架，不按三个宿主平分实验、不凭空编造用户使用比例。此优先级随全部派发传递。



### 本报告证据语言

- **声明 D**：合同要求。**源码观察 S**：静态分支/字段/断言确实存在。**推断 I**：可能机制或风险，尚未发生的事件。**未知 U**：缺少真实运行或授权范围内证据。
- 文中 `S01`—`S26` 是附录源文件编号，`L` 为一基行号；每个编号均绑定完整 SHA256。公共题按 JSON `cases[id]` 键定位。声明和测试源码不升级为行为通过。
- U002 HEAD=`05120197073144c0f46b6fb30a192733d529cc4f`。其捕获报告相关实现 dirty=0；本轮只复核获准源字节，没有重新扫描全部 Git 或读取541项实现。对“最新提交影响”仅继承 U002 描述、核当前相关合同；未获旧版本差分，不能独立证明增量大小/回归已过。
- 通用控制保持一个框架。F包是获准继承的官方文档/帮助回执，本轮未联网复取。Codex桌面/CLI优先，Claude仅必要兼容；API各表面独立。原生能力可见、能调用、调用成功、净收益四件事分别记录。

## 逐用途审计（原14项分母不变）

每行“待证/留旧”均为显式裁定：现有证据不足以删除用途或保证实际效用。正常/错误/恢复/人工控制列的是当前机制要求，除标 S 外不是实际任务事件。

### USE-01 — 保持任务和项目边界

- 责任/输入输出：路由、Context主责；编排接收已验证 root、授权路径和任务→冻结 WORK_ROOT/输出归属。S01 K1/K5；S08 L1–143；S14 L256–272；S18 L51–58、545–547。
- 正常 D/S：派发携带绝对根；runner启动时固定 realpath。错误 D：缺权限只阻断相应读写；恢复 D：核最新许可，不能从 docs 显示别名换根。人工 D：项目切换由真实选择和事务处理，任务包不授额外权限。
- 最新影响：U002相关dirty无；冻结源符合当前隔离合同。未查项目substrate/hook实现，故原生child绑定和并发切换完整性 U，交路由/Context owner。
- 案例：全部D01–D06的case-local边界；suite S20 的A08断言名称涉及切换/取消（仅索引阅读，非已执行）；ASSERT-SCOPE。真实跨项目权限、OS隔离未覆盖。待证/留旧。

### USE-02 — 正确理解请求并选择方法

- 责任/输入输出：路由主责；编排消费选定方法、已定意图→对应任务，不重新解释成另一流程。S01 K2/K4；S04目录；S14 L22–40、337–353。
- 正常 D：显式 standalone 优先；错误 D：歧义交用户，不自行补产品决定；恢复 D：保留已选方法。人工 D：目录可发现性不替代用户选择。
- 最新影响：U002称 motion-polish 路由新增；本次仅核目录与编排接口，未读routing-map/route-guard，不能裁其语义选择正确性。交路由owner。
- 案例：D01–D06请求忠实，D03 standalone、D04明确workflow；ASSERT-INTENT。test-route-guard不在本模块白名单，未读未跑。待证/留旧。

### USE-03 — 按复杂度安排执行

- 输入输出：文件数/依赖/后果/明确计划请求→phase、责任、断言及批准范围。S01 K3；S05 L73–131、227–314、382–419；S14 L107–168。
- 正常 D：五触发、DEV/ASSERT双向覆盖；并行按依赖独立性，implement分支max_active_subagents=1（S14 L54–105），不能外推为全框架串行。错误 D：关键gate失败停依赖phase；恢复 D：delta保留UID/已完成项；人工 D：规划不授权效果，已有批准范围可继承。
- 最新影响：当前S05 L425–451保留真实退出码与pipefail；current-instance要求见S07。旧差分未查；净时间/多余批准次数 U。
- 案例：D01/D02轻任务、D03/D06重任务；ASSERT-PLAN；S23 EXIT模板静态覆盖成功/失败/工具错误，非原生判官行为。待证/留旧。

### USE-04 — 单技能与用户选择流程均能交付

- 输入输出：选定skill/mode、合法输入→产物及适用handoff。S11 L1–53；S13 L34–64、113–136；S16 L45–72；S17 L49–79。
- 正常 D：standalone不强塞上游图，workflow只读被选路径；错误 D：缺输入/绑定报告而不虚造；恢复 D：由具体handoff继续。人工 D：确认过的平台和范围继承，未决决策仍交人。
- 最新影响：普通OD路径由当前边界保留；本次未读OD/输入视图/设计flow实现，不能证明领域交付完整。重点疑点见F02状态衔接。
- 案例：D03单技能、D04/D05/D06流程；ASSERT-STANDALONE；S21只覆盖handoff必要字段和3–7 criteria等结构，不证明产物可用。领域内部验收交skill owner。待证/留旧。

### USE-05 — 独立工作并行、强依赖有序

- 输入输出：冻结任务/expected slices、角色/依赖→带归属结果、缺片、失败和集成。S14 L219–272、297–322；S06 L10–110；S18 L295–370、552–570、610–638。
- 正常 D/S：独立技能并行上限3；runner保序数组、并发节流；依赖完成后集成。错误 S：非关键失败返回null并写诊断，关键模型失败阻断输出；D要求不能用自报DONE替真实结果。恢复 D：有界修复，不重跑无关成功组；人工 D：跳过/新效果需适用许可。
- 最新影响：当前失败传播/expected分母合同已存在；consumer脚本不在范围，不能证明每个null最终保留为GAP，亦不能指控已静默丢失。F01优先验证。
- 案例：D03–D06，D05失败completed_claim=true→一次授权retry→成功；ASSERT-DEPENDENCY；S19 W3、S20 G3/G5/R3/R7及S22分母回放。全部未跑。待证/留旧。

### USE-06 — 独立验证与真实完成

- 输入输出：冻结criteria/ASSERT、真实outputs/退出码→独立分轴结果及终态。S05 L425–487；S15 L29–95、295–325；S14 L158–178、398–404。
- 正常 D：作者不自产独立票，QG打开证据；错误 D：BLOCKED/NEEDS_CONTEXT直接FAIL、关键非零不吞、缺片不改分母；恢复 D：保留旧失败后修订。人工 D：关键失败不能自行跨phase；可选warning与必要失败分开。
- 最新影响：真实退出要求可定位；存在F02状态未明确、F03先DONE后QG的条文顺序。损害和调用方补偿 U，不能凭静态认定已误报成功。
- 案例：全部D题终态，D05注入失败；ASSERT-TRUTH；S23退出fixture、S21结构校验、S22明确不产生native QG verdict。独立判断真实运行未覆盖。待证/留旧。

### USE-07 — 当前实例取证完整

- 输入输出：源版本/范围/方法/ASSERT/authority + current source-instance-driver-data→可复查证据。S06全文；S07 L11–90、201–242；S15 L68–95。
- 正常 D：派发前冻结required分母；实际读证10字段，与expected7字段逐项对齐；当前实例manifest/receipt绑定。错误 D：hash不能冒充EOF、旧实例不能充数；恢复 D：受影响项重取证，原失败保留，清理后证据仍可读。人工 D：authorities不由child自行更改。
- 最新影响：U002标注新增/强化来源与current-instance；当前合同完整存在，但测试运行、原生judge消费均 U。
- 案例：D02/D04/D05/D06；ASSERT-EVIDENCE。S22 wrong version/method/denominator、optional gap、partial、source drift等；S23退出。test-project-verification-contract未获读权，保留缺口交证据/Context owner。合成hash不证明真实服务实例。待证/留旧。

### USE-08 — 适时得到正确规则和事实

- 责任/输入输出：Context主责；编排接收条件owner、必要输入/约束→足够任务包。S01 K10；S03 L10–26；S17 L13–32、49–79；S13 L138–172。
- 正常 D：按条件加载、目录与owner分层；错误 D：未读和不可读明确，不伪装消费；恢复 D：补必要合同，不全文加载长日志。人工 D：context不能新增任务权限。
- 最新影响：prototype-delivery条件入口S03 L26可见；加载器实现/截断策略不在范围，真实选择与抗干扰 U。交Context owner，不扩大阅读。
- 案例：D01–D06结构消费，D04低权参考、D06合法更新；ASSERT-CONTEXT。context-resolution/branch-fixtures未读未跑。F包F01/F05仅能力线索。待证/留旧。

### USE-09 — 长任务更正、授权和证据连续

- 输入输出：合法checkpoint、事件、最新授权→保留已完成工作并重做受影响依赖。S09全文；S14 L414–438；S05 L537–549。
- 正常 D：恢复last DONE+handoff；错误 D：撤销/新版本优先，不能沿旧授权行动；恢复 D：记录下一动作、失败和未知。人工 D：未决方案真实答复，已授范围不重复推导新授权。
- 最新影响：无真实压缩事件不能声称压缩恢复；本轮只有本会话上下文压缩后的审计连续性，不是受控B/T恢复成绩。轮数代理与每次恢复询问存在F04待证负担。
- 案例：D06 checkpoint→fresh恢复→v2/hash→真实choice；ASSERT-RECOVERY；S21结构检查不证明事件时序。D06公开题不含撤销事件（验收一般条文提到撤销不等于本题实测）。待证/留旧；Context owner负责恢复信息损失归因。

### USE-10 — 保护人类决定与工具权限

- 输入输出：当前许可/请求/决策→应做动作、局部停止及可说明状态。S01 K6/K7；S08；S14 L126–141、256–272、406–409；S18 L165–203。
- 正常 D：已授权合理继续；错误 D/S：关键失败停队列，取消报告queued/in-flight与无OS撤销保证；恢复 D：先核最新授权。人工 D：不虚构用户选择，也不以全停替代有权推进。
- 最新影响：当前contract明确继承确认事实；逐phase等待与该原则的范围衔接待证。S18 L523–529非法sandbox回退行为见F06。真实OS权限、所有外部工具撤销 U。
- 案例：全部D题；ASSERT-AUTH；S20 A08仅静态断言索引；project-controlled-selection/gate-mutations不在范围。未查安全hook，交路由/Context owner。待证/留旧。

### USE-11 — 实际模型选择与可用能力

- 输入输出：共同角色/scene、可信宿主配置和当前调用→可核采用/拒绝。S12 L32–95；S25 L25–156、179–228；S26 L223–428；S18 L95–148、374–509。
- 正常 S：策略READY仅准派发，接受还核model/input/route/generation/同调用completed，critical latch不可由普通fallback清除；错误 S：unknown关系、reroute、failed turn拒绝；恢复 S：host拒绝未决critical恢复，受控recovery按当前activation。人工 D：私有approved绑定与effort分离，不能自行升降级。
- 最新影响：common-v2和当前runner接线存在；未读私有配置/其他原生hook，无当前实际resolved model回执，不报告本审计模型档位已采用。S25 CLI纯advisory不等价native执行；S26接收的是可信host字段，不能脱离采集者证明真实性。
- 案例：D03–D06仅能力诚实/交付声明；ASSERT-MODEL。S20 G1/I/R1/R2/R3为fake app-server，未执行；真实采用/CLI资格/Claude兼容仍 U。F02/F07/F08–12为继承能力事实。待证/留旧。

### USE-12 — 稳定事实与临时信息边界

- 责任/输入输出：Context主责；编排临时状态和eval/候选支路→受治理候选，不能自动长期事实。S01 K8；S02；S13 L155–171、217–236；S14 L170–196。
- 正常 D：短规则/可选相关检索；错误 D：临时偏好不晋升，冲突不擅自改根；恢复 D：必要fallback继续，治理按owner。人工 D：本任务明确禁止写记忆，优先于审计资料里的候选/eval动作。
- 最新影响：当前普通提取不自动promote边界存在；extraction-bar/存储实现不在范围，未检查写入隔离效果。交Context owner。
- 案例：D01/D06 case-only；ASSERT-MEMORY；本模块无获准专门suite。此次没有写记忆是本次操作事实，不作为B相对T收益。待证/留旧。

### USE-13 — 精确消费已验收交付

- 输入输出：accepted final/candidate/ref/证书/依赖→具体final/spec/source。S24 L29–69、76–137；S15 L140–172；S14 L143–148。
- 正常 D：source→required set→candidate→独立PREACCEPT→seal→精确handoff；错误 D：漂移拒绝，不用raw/latest替代；恢复 D：保留原来源和失败attempt，重验受影响ref。人工 D：采用决定与来源阅读许可区分。
- 最新影响：U002称最新强化；已核当前合同及QG接口，helper和consumer具体实现不在范围，不能证明atomic no-replace实际生效。
- 案例：D06 accepted bytes/drift只覆盖通用引用；ASSERT-DELIVERY。test-prototype-delivery/original-copy-handoff未读未跑。图形、依赖资源闭包与真实下游不由本合成题证明；交技能owner。待证/留旧。

### USE-14 — 原始足够/复制/改进与领域owner合作

- 输入输出：已授权范围、接受设计、owner判据→adequate-original/adequate-copy/enhanced-copy适用分支。S24 L29–36；S14 L126–148、337–353；S13 L272–286。
- 正常 D：原始足够可原样，下游消费owner方法；错误 D：未许可不擅改设计/扩平台；恢复 D：精确ref重新验证。人工 D：平台与设计选择不能由框架补一个默认答案。
- 最新影响：当前motion standalone/OD内部接口可定位；本报告不评价动效或审美，不以generic QG替代skill criteria。
- 案例：D02–D06，特别D04 accepted decisions+copy tokens；ASSERT-DOMAIN-BOUNDARY。motion registration/browser suite不在范围，未读未跑。实际三分支执行待技能owner验证；待证/留旧。

## 直接发现、限制和竞争解释

|ID / 最早可观察偏差|当前可核事实|尚不能得出的结论 / 替代解释|后续判别点与决定影响|
|---|---|---|---|
|F01 失败返回→聚合接口|S18 L295–370、552–570：非关键失败null；顺序保留，stderr有原因。critical失败另行锁存并阻断。S19 W3和S20 G3/G5意在守此语义。|未读具体workflow消费者；不能声称已经filter掉缺片。null可能是有意的向后兼容，由消费层完整记账。|D05式故障首次进入聚合时核required分母、原因/原始failure及retry；若丢失优先修局部返回/consumer接线，非直接删除并行架构。|
|F02 worker状态→QG准入|S13 L89–96允许DONE_WITH_CONCERNS；S17 L143–183/225报告列三种状态；S15 L52–55只明确BLOCKED/NEEDS_CONTEXT及DONE。S14 L404又使用DONE_WITH_CONCERNS。|这是合同分支未明确，非已观察到抛错/吞warning。父调用方可能规范化状态；实际policy受更高层合同约束。|在同一必要/可选缺片任务记录进入QG原状态与处理，若按DONE无条件接受或永久悬置则局部修接口；无害规范化则不据此扩架构。|
|F03 状态写入→验收完成窗口|S14 L398–404先写DONE再QG，失败回IN_PROGRESS；L417恢复读lastDONE。|可能前置skill自验收已充分，写入器/后续reader有额外gate；本次未查，不能宣布crash后必误消费。|观察中断窗口可见状态与恢复依据，是否把未独立验证产物当已accepted。若能误用，改局部提交顺序/区分状态；否则保留机制。|
|F04 授权继承→额外询问/预算停止|S14 L198–200泛化逐phase等待；L407–409允许已授链继续；L428–436轮数20/30代理60/80%，非token仪表。|不同作用域或明确用户Human Gate可解释等待；长短轮差异仅风险，没有额外提问次数/延迟实测。|D01/D02和D06记录问句是否已有答案、阻断依赖、真实可继续动作；context真实usage不可得则保留未知。只删无价值重复确认，不弱化必要人类决定。|
|F05 比较入口→可见工具能力|S18 L280–291关闭hooks/apps/shell_snapshot/web_search以及枚举MCP，L545–547限制scratch写；这是实际适配器配置代码。|不代表Codex原生没有这些能力。该runner面向受限workflow，可能正合其任务；不能据此声称框架整体弱于原生。|U007对B/T同权限/必要工具保真核验。若runner使一方少能力，比较无效或需同等合规入口，不为评估新增平台工程。|
|F06 配置输入→沙箱选择|S18 L523–529非法LUCA_WF_SANDBOX值警告后回workspace-write。|若用户本意read-only却拼错，可能放宽到scratch可写；尚无此实际事件。仍不允许danger-full-access，不等于仓库写已突破。|入口核配置实际采用而不只读argv；优先局部fail-closed或显式默认语义评估，非证明整个权限架构失效。|

未发现需要新增公共USE的独立用途；以上是已有用途的缺口/失败面，保持14项分母。没有提出或读取D方案。对不在范围的consumer/hook/helper不申请无界扩读：当前静态账可带明确GAP交付，后续由主协调按受影响用途精确绑定。

## B非运行复杂度账

计数单位是**可独立维护和核验的一组义务**，按目的合并同义复述，绝不按文件行数判价值。以下为本模块有限范围的基线13组，不是全框架总量；一条出现多处只计一次。跨模块owner为汇总去重建议，主协调最终去重。

|义务单元|必须维护的判据/材料；源|去重owner；潜在价值与代价|
|---|---|---|
|O01 作用域冻结|root/读写allowlist/取消后的旧根，S08/S14/S18|路由/Context主账，编排引用；防串项目，增加派发字段|
|O02 计划与批准|五触发、phase/UID/ASSERT覆盖，S05|编排；控制依赖和后果，轻任务触发成本待测|
|O03 独立性与所有权|依赖拓扑、并发/串行、文件owner、实际回收，S14|编排；可并行但合并/冲突成本未知|
|O04 模型角色与采用|scene/policy/config/runtime adoption/critical latch，S12/S25/S26|编排；可防假采用，增加配置和状态接线|
|O05 expected/observed读证|7字段expected、10字段observed、原始缺片，S06|编排与Context共享、主协调只计一次；追源换来材料维护|
|O06 preflight及模式|project/input/mode/工具与未决参数，S16/S11|编排，路由只引用；提前发现阻塞，可能重复问|
|O07 worker回报|产物/状态/blockers/自验，S17|编排；可回收，存在F02接口歧义|
|O08 独立QG|实际ASSERT、分轴证据、blocking/warning，S15/S05|编排；抗自证，新增judge调用及修复轮|
|O09 eval证据接收|parent eval_run_id与可信envelope，S14 L170–178/S15 L304–325|编排；留审计轨迹，recorder实现未查；本卡禁止写|
|O10 当前实例验证|source/instance/driver/data及终态，S07|编排/Context共享；防旧证据，增加取证材料|
|O11 失败/取消恢复|queued/in-flight、有限retry、依赖隔离，S14/S18/S26|编排；防假成功，后台真实停止未知|
|O12 checkpoint连续性|已定事实、最新授权、失败、下一动作，S09/S14|Context主账，编排引用；抗失真，额外整理和恢复询问|
|O13 accepted交付身份|candidate/ref/PREACCEPT/seal/consumer revalidation，S24|技能owner主账、三体系接口共享；防漂移，证书/依赖维护|

**配置维护单元7类（不与义务13相加）**：C1共同角色/scene/dispatch政策（S12）；C2宿主私有模型顺序与批准绑定（S18调用点、S25，真实内容未读）；C3激活/代次/调用状态（S26）；C4 runner并发参数（S18 L151–163）；C5单agent超时（同段）；C6 sandbox允许值/实际采用（S18 L523–529）；C7 app-server工具关闭清单（L280–291）。单位为可独立变更的一组配置，不是键数；私有C2只确认依赖面，实际实例数未知。S12当前政策3角色、8scene是静态枚举，不能当8次运行或收益。

**人工决定3类**：H1批准计划/改变后果或范围；H2未决平台/产品/采用；H3失败后的修复、跳过、终止/恢复。已授权事实不重计为新决定；实际用户选择次数、无益等待时间均未知。源S05 L537–549、S14 L126–141/158–168/198–200/406–421。F04是冲突候选，不是测得的多余点击。

**标准skill phase交接5条接口边**：parent→preflight；parent→worker；worker→parent；parent→QG；QG→parent。修复会重复后4条中的适用边；Plan在此前、recorder在之后另列，不假定每个任务都走5次（Solo/无skill/重用合同时不同）。S14 L110–178/S16/S17/S15。材料量按结构计：worker15核心变量+2条件变量；expected每slice7字段、observed10字段；handoff≤2000tokens、3–7criteria等上限为声明，不是本次实际传输量或token账单。

**维护触点6类（不可与上面相加）**：根/owner条文同步、模板状态接口、政策到host适配、runner到workflow消费者、receipt/实例driver、accepted交付helper与下游。触点按改一处需检查另一处的关系分组；可定位S01/S05/S14/S17/S15，S12/S25/S26/S18，S06/S07，S24。新失败面包括F01–F06，以及activation锁忙/未决票据（S26 L87–104/174–218）、schema转换（S18 L217–277）。机制也可能减少更高损失，不能把触点多直接判冗余。

建设/迁移工时、历史返工、维护频率、实际agent/交接/修复数量、端到端延迟、全链token与金额、用户打断数：全部 U；白名单内没有相应实际日志。未用规则体积、suite数量或F包帮助调用次数折算效益。

## 四组双向假设与可推翻证据

|假设对|最早偏差观察点|架构 / 局部实现 / 配置 / 接线竞争解释|可推翻证据与决定影响|
|---|---|---|---|
|H1 旧规则防实际失败 ↔ 可精简或交模型/原生|请求→首次范围/依赖/许可决定（D01/D02/D05）|架构：分离权限与执行必要；局部：过宽触发/状态模糊；配置：缺工具/模型；接线：没有把已批准参数传给worker|在同等质量和控制下T连续满足受保护用途、B只增负担可反驳保留该规则净价值；T错误而B明确早阻断反驳可直接删除。无证据保留用途，允许以后只简化重复表示。|
|H2 多Agent提高质量 ↔ 协调/交接/验证抵消收益|独立结果回收前后及集成（D05，D03/D04）|架构：独立视角有益；局部：null/归属丢失；配置：不等模型/容量/并发；接线：汇总者漏读、重做或错依赖|记录独特有效发现与合并丢失、parent重做、全部成本；同质量串行更低成本反驳该类并行收益；独立review抓实错可反驳取消judge，但不证明每项都需多Agent。|
|H3 Context提供必要信息 ↔ 缺失/干扰/冲突/恢复失真|owner供给→首个语义消费；恢复事件→第一个动作（D04/D06）|架构：精确refs/checkpoint有价值；局部：轮数代理/只看DONE；配置：注入遗漏或旧模型；接线：更新未deliver/ack、driver时序错|若合法事件未送达先判入口INVALID，不能归因候选；送达后旧授权/版本仍被用才记缺陷。充分短packet同质量支持精简，缺owner实错支持保留。发现交Context owner，不扩本模块。|
|H4 架构原则不适合当前能力 ↔ 局部实现/配置/接线错误|可用能力→实际采用→成功终态（F05/F06、D03/D06）|架构：不必要复制原生能力；局部：状态合同/默认值；配置：runner关闭工具、未知私有绑定；接线：host证据/driver未闭合|先匹配同模型、资料、权限、必要原生工具；修局部后缺陷消失反驳架构失效归因；能力齐备仍跨多用途重复失效才支持架构层裁决。当前0行为，不裁胜负。|

## U007最小行为观察需求（未获新增run，不执行）

1. **入口合格/公平性**：复用F包P1/P2，采实际模型采用、可见工具/规则、权限、父子ID与usage；不要拿本runner受限工具集代表全部原生T。CLI主配对须可停止、可导出、保留必要能力；桌面只补会改变结论的交互点。API文档不转成本地保证。
2. **D05同类失败回收**：保留一条failed+completed_claim以及一次允许retry；核原始failure、required分母、下游是否提前消费、成功后的终态。尽量同时取得超时/取消queued与in-flight证据；未证后台停止的入口不进入硬截止条件。
3. **D06同类恢复**：保存合法checkpoint，按driver交付最新更正、精确源hash和真实choice；核首个动作、保留完成状态与仅重做受影响项。没有真实compact事件只称fresh恢复。公开D06没有撤销，撤销覆盖留给已批准对应题/既有探针，不新增题。
4. **最小质量/负担观察**：D01/D02轻任务问句和额外phase；D04两产物一致且完整copy tokens、固定owner判据。记独立review发现、parent重做、输出遗漏，artifact blind质量先于过程控制审查。

最多两类消融候选：①同任务/模型/权限/总预算下，独立工作并行 vs 串行；②同一冻结判据下，独立judge vs 作者自检。此处不是新增两个run或自动批准，必要控制不能移除；只在主协调既有144正式run/20准备/32复核及统一追加池内绑定。任何质量/控制失败不能用省token抵消。当前预期仅是假设，后续另版追加行为，不覆盖本账未知或失败。

## 附录A — 源身份与实际读取范围

26项先核source-scope哈希，再与U002对应row一致（回执019d6b显示26/26）。下表hash来自冻结scope，不手工截短。所有路径相对于源根；整文件哈希只用于身份，不自动算语义读取。S20/S22明确部分读取，所选合同owner均读至EOF。

|ID|精确路径|SHA256|实际语义范围 / 工具输出|
|---|---|---|---|
|S01|`AGENTS.md`|`db5ea430452a32cf5d98fac04917ae2ef2da5ae46ca2ea775423fb434336d8d8`|全文L1–176 / 5f9b81|
|S02|`CONTEXT.md`|`b654bf50eff5fba1ba8ca51e76f41d575111bffcf20837df0e1f33f0a9aa1b3e`|全文L1–47 / 5f9b81|
|S03|`.claude/skill-os/generated/context-index.md`|`9f40be97d14e6b8b18efb00464e5742b0a71c6580b00b2208f1adb6716e4dee2`|全文L1–30 / a1dbcd|
|S04|`.claude/skill-os/generated/skill-catalog.md`|`027a7ecbb53c9c5c65991ca3706bf396d6507f586237ea94d70798d46743637a`|全文L1–76（修复合并显示截断） / 705b76|
|S05|`.claude/agents/plan-agent.md`|`00ad93605d8cdaac020f72308556ae972b8f1c352139ad4518b6c762b4319813`|全文L1–320、321–635 / 308a7b、de9ce8|
|S06|`.claude/agents/references/evidence-receipts.md`|`756b995f2cedc2fc50192a643a5c3b2ca5b7b825caabe6bef6769299f96dd282`|全文L1–271 / 993c2e|
|S07|`.claude/agents/references/project-verification.md`|`f58cf741cc8e642fd8a46dac0887e654c2a3056121455cc6cd70c1fa46cb9249`|全文L1–242 / 993c2e|
|S08|`.claude/skill-os/runtime/project-session.md`|`c75e34d9dcfa5cafde745090bc5a9673c84b1aba18548ad647ff8f74e8651821`|全文L1–143 / 5f9b81|
|S09|`.claude/skill-os/runtime/long-session.md`|`641aa996c6257570c9829ff668e7c59226a820b21ce1a8e6842aed9b173c2117`|全文L1–25 / 5f9b81|
|S10|`.claude/skill-os/runtime/cross-harness.md`|`d9899018487257331988a965799543bc89aa55f31a1fe964c35a47e3a6825c5f`|全文L1–17 / 5f9b81|
|S11|`.claude/skill-os/runtime/workflow-mode.md`|`e6573465a8d369d0da3b7a5954ff58e191ccd8315cdad69c9da505ff5d55f0f5`|全文L1–53 / 5f9b81|
|S12|`.claude/skill-os/model-routing.yaml`|`4c4435a3cffb1efc62cb8c4e135219db53e3a33ceb18ffc10b8e86271a587064`|全文L1–247 / 9735b6|
|S13|`.claude/skills/office/SKILL.md`|`57d758ab23b304b590fd771a201c69d6263eb93c554fdeb243c45ace3a088377`|全文L1–288（a1dbcd中该节完整） / a1dbcd|
|S14|`.claude/agents/orchestrator.md`|`3eed1c58e4c6cbdd5b3a8ad0fa3c0841723012de0cf789fb7f369980905dc29e`|全文L1–255、256–494 / 020b93、7ce1e3|
|S15|`.claude/agents/quality-gate.md`|`38af1240ff2bfefd4f0f7b49a86b42a4e1e4db4a73a0eef783fed5c856af3ecb`|全文L1–350；52–55复核 / 846691、ea821d|
|S16|`.claude/agents/preflight-agent.md`|`4ae97467954b6958c0a230fe97438b3ff4eaeb841ba274d7b50bf777112bdb85`|全文L1–137 / 6805f3|
|S17|`.claude/agents/work-agent-template.md`|`2d4fb9acbdaff28f82c207b4f085fb8cc6b3c5f695d1baa0f7a781f57ca67bf2`|全文L1–307 / 6805f3|
|S18|`.codex/workflow-runner.mjs`|`d794913d9c003549dae33545f1d09a6704f41190fa4b2b66905e8aa4e7a8c531`|全文L1–330、331–651；局部复核 / 5a8826、bd1121、ea821d|
|S19|`scripts/test-workflow-runner.mjs`|`25553e2e644203f9fd6274e1f9f80440659252b0048924bd82f11f61eee238e5`|全文L1–159 / 8cf2da|
|S20|`scripts/test-workflow-runner-runtime.mjs`|`5a1e80eb5220dcbf5133920e3663e4d79c56a2197e34f0b42877157077cbb5ba`|部分L1–25、60–113、206–274、288–314、620–634；其余仅rg命中断言索引，非全文 / c700c1、21ef68|
|S21|`scripts/test-handoff-validator.mjs`|`b795c1c1e1909275f94c60bacb0429da0e32936ac77ee6d76db768fd318b1a44`|全文L1–58 / 8cf2da|
|S22|`scripts/test-evidence-receipts-contract.mjs`|`0788422d95bd637889fc7c56336b44c7f92d64d89d38297f96ce8dc4a5cb0936`|部分L1–60、134–289（245–250补读；未读61–133），另rg断言索引 / c700c1、ea821d、21ef68|
|S23|`scripts/test-verification-exit-contract.mjs`|`707c6a2e1593f99ec2a3e26cc4204af26c2eb9592360d6c779bfb30aad3dff38`|全文L1–205 / 8cf2da|
|S24|`.claude/skill-os/runtime/prototype-delivery.md`|`12c0483a034fe15eb38dc2316cdb2bc6f35721a77468e948107a59a88c74f09a`|全文L1–139 / 9735b6|
|S25|`scripts/model-route.mjs`|`7de71af51b8accc6046b04e77de828375fbb34ef7aab63a6e3305cb660858333`|全文L1–255 / 705b76|
|S26|`scripts/model-route-host.mjs`|`77b7f952bf39781d57a155e06fa69de8b6427d118c681f4cf1f80a220958bedc`|全文L1–270、271–511 / 93975b、70431e|

S22范围说明：L251是闭合花括号，L251–289来自c700c1；L190–250由ea821d补齐，因此134–289连续已读。测试模块的未读范围仍保留，不把rg命中当全文。

## 附录B — 公共输入身份、案例索引与边界

|输入|SHA256|本轮读取范围与凭证|
|---|---|---|
|`u006-orchestration-dispatch.md`|`96a5a99c9489c30c5e2a0522757c1812de1c51dba3358233818e0459394e07d5`|全文 / 13dddb、33d590|
|`u006-dispatch-inputs.json`|`8cb7808fbd88afd65c4dd2f9eff362f6c9a0dd55f50f94235e466cb8ccab8993`|全文 / 13dddb|
|`u006-orchestration-source-scope.json`|`1ac7a919ee0a2261c9105916f908c4501d506b933ed9cdc1b4ebd05c218df200`|全文/26项身份 / a3c3e0、930ee4、019d6b|
|`u002-source-manifest.json`|`cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9`|顶层元数据+26项身份比对；未读其余源内容 / 930ee4、019d6b|
|`u002-baseline-and-protected-uses.md`|`0a29c67a76e2367062d036b87d6e63a088a22b7b763b457208653e7c3feb04d9`|全文 / a3c3e0、c700c1|
|`2026-10-02-tri-system-p2-orchestration-execution-pack-v3.md`|`a588b7ba228df5c14376c6758a5b5798efeaf20081d5a57f3bba26f74521c92a`|全文L1–231，分段修复首读截断 / 930ee4、362baf|
|`u004-native-capability-facts.md`|`6a5641ef108d3c8824142694b361f556844e3cbb59f6f78e29d35e8bc4e30b36`|全文L1–140、141–229 / f8aa8f、ee7f69|
|`u004-native-capability-facts.json`|`3efe8b84797618104cbfb378a5d037cf983d42d29a9c6e6c31f4b7026151c64d`|顶层结构，正文未全文；采用MD事实 / 0abd64|
|`u004-cases/public/manifest.json`|`231746d52c4fd4735d7fe2da73539f293481c2129ae14345feb97735c0b96ca2`|哈希身份；未展开指针 / a3c3e0|
|`u004-cases/public/developer-cases.json`|`8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c`|六题request/use_ids/标准/events/recovery；D04 owner+brief+完整acceptance；其他字段不宣称全文 / 019d6b、e52a80；dab790截断不用作完整凭证|

公开README/coverage/owner-addendum/final-review-r3已经在回执0abd64全文读到；其冻结哈希依次为：
- README：`4e30421efdfc98fa824c2d7de9b2cf3e8ace3027998643ebbfbb3902ad4a4c36`。
- coverage：`1c28eb739ddccf02e2a59d2057c8812361a11c239f2c046eec8e81180390fbfc`。
- owner-addendum：`00057691298c0750394d5aacbeffb1290e41f7b6eecdddece3fc3588dcf0e1e5`。
- final-review-r3：`74e87101d5f1019993385cda97896f55b4928b326efa5993acae5e82b4a918a9`。

这里采用其公共方法限定：强制checkpoint事件送达/ack，不能送达记INVALID_RUN；无OS隔离保证；独立控制不能被artifact得分补偿；exact/schema仅局部表示检查；相同质量阈值及多解语义按owner验。未打开任何private路径，也未以public manifest的指针扩权。

|公开题|映射的原始USE分母|本模块观察价值 / 未覆盖|
|---|---|---|
|D01|USE-01, USE-02, USE-03, USE-06, USE-08, USE-10, USE-12|轻量有界任务、稳定ID；非真实业务|
|D02|USE-01, USE-02, USE-03, USE-06, USE-07, USE-08, USE-10, USE-14|fixture alias及smoke输出；未真实改生产框架|
|D03|USE-01, USE-02, USE-03, USE-04, USE-05, USE-06, USE-08, USE-10, USE-11, USE-14|standalone状态合同+不可live export事实；非外部导出|
|D04|USE-01, USE-02, USE-04, USE-05, USE-06, USE-07, USE-08, USE-10, USE-11, USE-14|明确flow-design→review+低权参考；原请求copy tokens必须完整，不照抄不完整answers|
|D05|USE-01, USE-02, USE-04, USE-05, USE-06, USE-07, USE-08, USE-10, USE-11, USE-14|失败自报完成、一次retry、成功后集成；非真实模型子任务可靠性|
|D06|USE-01, USE-02, USE-03, USE-04, USE-05, USE-06, USE-07, USE-08, USE-09, USE-10, USE-11, USE-12, USE-13, USE-14|checkpoint/fresh恢复、v2/hash、真实choice；没有真实compact或公开撤销事件|

D04专门读证：request明确“component identities, responsive placement, focus order, transitions and copy tokens”；`initial_files[path=input/owner-method.json]`要求固定决定、每条edge、各状态component、各width布局和与实际视觉顺序一致的focus。accepted brief列状态和action mapping，允许满足约束的多种component order。acceptance.request_fidelity及完整性交付保持原请求；answers示例的遗漏不构成豁免。本报告没有把示例/exact checks当满分gold，也没有替领域owner发明审美流程。

## 附录C — 读证异常、资源与恢复点

静态读取期间的异常保留：
1. execution-pack首个合并输出fb7420截断；以930ee4 L1–120、362baf L121–231补齐。
2. a1dbcd合并输出在catalog中间显示截断；705b76完整catalog修复；该次context-index和office节均完整可见。
3. dab790案例投影过大截断；019d6b/e52a80按字段补读，不声明360270字节case文件全文读。
4. 019d6b程序把initial_files list误当dict，exit1；已完成manifest26项一致及D01–D04请求事件输出，D05/D06未抵达。e52a80用正确list结构补齐D04 owner/acceptance与D05/D06。此为取证脚本错误，不是被测框架失败。
5. c700c1在S22中段显示截断；ea821d补读L190–250。未发生三次同一失败重试。

工具动作台账（每个ID为一次实际exec_command，多个文件的读取不冒充多个独立执行；同一包装的子命令如存在须另计）：
`13dddb, a3c3e0, fb7420, 930ee4, 362baf, 5f9b81, 993c2e, 308a7b, de9ce8, 020b93, 7ce1e3, 0abd64, 5a8826, bd1121, 846691, 6805f3, 9735b6, 47aa31, 33d590, a1dbcd, 705b76, 93975b, 70431e, 8cf2da, 21ef68, dab790, 019d6b, e52a80, f8aa8f, ee7f69, c700c1, ea821d`。

这32个已完成命令中包含截断补读/失败，未抹去；本次落盘是第33个，终检拟为第34个。一个Python读取多文件仍分别按附录A/B记录源操作，未把hash当语义阅读；没有隐藏启动suite/model的复合命令。functions编排包装另计，截至落盘预计33个包装+33个实际工具调用=66个可见工具消息；90动作预算即使用该保守合计仍有余量。最终读回会报告实际结算而不是把预计当已完成。

行为run=0/0；suite执行=0；新agent=0；网络操作=0；写入仅本报告。准备池本模块初稿占W04既定1调用，不自行追加准备/复核额度。真实输入/输出/推理token与费用接口未提供，记unknown；命令original_token_count只是显示估计，不能称全账或以账户百分比折算。没有证明120000可观测token预算已被精确计量。

本报告没有要求已批准工作重新许可。关键限制造成的是行为主张未验证，不阻止本静态账交付。J-A尚未执行：不能把作者自查当独立PASS。后续主协调汇总U002和统一用途证据，本模块不修改公共分母或他人报告。

恢复点：静态A-b已落盘，待本文件结构/身份读回后冻结SHA256并交付。下一步由非作者J-A验收；随后仅按原预算/绑定进行U007入口与U008行为补证。保持本版原始未知和失败历史，不读D/隐藏/其他A，不启动测试或模型，不写配置、记忆、eval或生产代码。

落盘时墙钟：从任务首次计时1790959856.216191至本次写入约18.30分钟，含读取、分析与上下文续接；45分钟上限内。最终消息交付耗时另由终检登记。

### 冻结终检结算

读回回执 da7bb5：14个USE卡且无重复、26个源身份行、4组双向假设、13组义务、6个公开题索引均齐全；摘要676字符。26个源文件再次核hash无漂移。此为文档完整性自查，不是suite/行为/独立J通过。

落盘回执80cbe7；读回da7bb5；本次结算更新为第35个exec_command，连同35个functions包装，保守工具消息计70/90。没有把多条shell子命令合并计1，命令内多源读取分别记于附录。终检冻结墙钟约19.19/45分钟；真实token/金额仍unknown，未使用虚构精确账。唯一写入文件为本报告。

最终静态恢复点：本版已完成结构读回和26源身份复核，SHA256由本次写入后的实际字节计算并随交付给出；不把文件内自指hash当可信证明。后续等待非作者J-A，当前无获准行为执行。
