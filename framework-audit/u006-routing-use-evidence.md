# U006 routing — 当前用途与机制静态证据账

状态：DONE_WITH_CONCERNS（W03 静态初稿已交付；J-A 尚未验收）。本稿冻结后，行为证据另增版本，不回写抹除初稿缺口。作者是 routing A；没有独立审查自身结果，也没有读取独立候选 D 或其他模块未冻结结果。

## 摘要（不超过 2000 中文字符）

14 项保护用途全部保留。当前读取证明了路由提示、项目身份接口、计划/技能合同、交付引用及已有测试的具体结构；没有证明任何机制在真实任务中带来净收益。本轮行为 run=0，suite 执行=0。

核心观察：route-guard 用短语权重形成提示；原生项目事件核验负责另一层授权。生产提示和 dry-run JSON 是不同路径，测试中已有针对真实提示面的回归入口，但这仍不等于宿主实际加载和 Agent 消费。直接点名技能时，复杂度结果降为 planHint；MULTI 的提示则要求先问用户。这两处都需要在完整语义合同下测量，不可把 hook 决策标签直接当最终行为。任务提醒仅把 recommendedSkills 当作已派发信号，与普通 SINGLE_SKILL 的字段不同，需核验是否出现过早清除或完成后残留。

已禁用的 read-grants 不能算当前可用授权通道；project-session 明确允许授权绝对路径经正常 filesystem/controlled-change 边界读取，因此也不能据此断言所有跨项目读都失效。模型与宿主能力必须从真实调用证明，静态 capabilities 表及配置不够。新 motion 路由和 exact final 引用均纳入保护；公开案例只覆盖通用接口，不能代替真实 motion/OD 消费与独立验收。

可维护结构基线包括 62 条候选登记、9 个复杂度近似信号、5 条语义 junction 规则等，按 owner 去重，不换算成日常耗时。实际澄清、交接、维护成本和质量差值均未知。四组双向假设保持开放；U007 先复用现有测试和六个开发案例，最多考虑两类消融。本稿不建议删除任何未覆盖旧路径，不扩大生产实施授权。

## 0. 继承背景

## 零、所有后续 Session 必须继承的背景

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

## 1. 授权、版本与证据解释

- 唯一写入本文件。读取源根固定 `/Users/luca/Desktop/luca_gstack`，不是作者工作目录的另一个 worktree。NO_PIN，不读项目共享别名、真实项目、全局私有配置或凭据；不写全局记忆、eval 日志；不派发子 Agent。
- 依赖以 `u006-dispatch-inputs.json` 的 READY_STATIC_A、R3 PASS 7/7 与 J02 PASS 6/6 为释放依据。这些 PASS 只释放静态审计，不是框架行为通过。
- U002 绑定 HEAD `05120197073144c0f46b6fb30a192733d529cc4f`、541 项受控来源身份。其捕获时相关实现 dirty=0，排除 3 项观测日志、21 项用户资料、351 项审计文件，未分类=0。本轮实际核对获准 23 项源字节全部 MATCH；未重新遍历全仓 status，不把 U002 声明冒充当前全仓独立测量。
- 下文“最新影响”继承 U002 的最新变更归纳，并以当前获准源检验接口；没有读取 Git 历史或重建该 commit 相对父提交的 diff。因此它表示保护关注点，不声称每一行由该提交首次引入。
- **D=声明**（合同要求），**S=静态观察**（实际代码/测试文本），**I=推断**（竞争解释），**U=未知**（真实调用、效果或未获准 owner）。S 证明分支存在，不证明分支被运行。源码注释中的历史“实测”仅为历史声明，本轮不采用为同版本行为证据。
- 源定位采用附录 S01—S23 的相对路径+行号，每个 ID 绑定完整 SHA-256。绝对根如上。案例源及依赖 hash 见附录，不读取 manifest 所列 private 路径。

## 2. 实际链路与责任接缝

1. 根入口要求 Project Gate → Plan → Framework Flow → Multi → Single → STOP/NONE 语义补判（S01:22–52）。hook 解析 prompt/session/harness、求作用域及启发式分数，再给候选（S15:102–184、298–465、574–733、1140–1188）。这里不能把词表命中当成用户完整语义。
2. 生产面先读会话身份及必要的 Codex child association，记录中性项目事件，不从项目名称生成 switch；有状态错误则提示本轮不能访问项目路径（S15:1393–1454）。S20:643–699 记录精确 prompt 身份，912–965 的核验入口观察原生事件，1164–1175 要求 TURN_ACTIVE 与 event/boundary/cwd 一致。后续 scope guard/原生 source 实现不在本模块此次读取中，不宣称全链强制性已经证实。
3. 候选和计划建议送给主 Agent，语义 junction R1—R5 约束研究前置、设计工具、整链确认、评审对象、显式 preset（S16:12–87）。已选技能才加载输入视图，缺失/过期保留失败并按 owner 回退；graph 仅用户选择后进入（S11:10–51）。本模块没有替领域 owner 判输入完整或交付质量。
4. 协作接口应携带来源、版本、范围、断言分母及实际失败；当前实例证据还需 driver/data/实例/清理后的可读证据（S06、S07）。这些是交接要求，实际调度及验收属于编排 owner。
5. 生产 hint 渲染、义务提醒、计数与 active rules 加载是额外运行面（S15:1338–1542）。dry-run 于1427–1429提前退出，不能检验这些运行面。规则加载缺失返回空数组；提醒异常被吞掉以保路由可继续，需区分“无提示”与“任务无义务”。

## 3. USE-01—USE-14 逐项保护账

各行共同结论：真实效用 U；未覆盖/未验证则保留原路径。下述正常/错误/恢复均标明是 D 或 S，不作已跑结论。每行最新影响中的 dirty 均为“U002 捕获无相关实现 dirty；本轮获准源字节未漂移”。

### USE-01 — 保持任务与项目边界（routing / Context）

- 输入→输出：用户任务、已验证 root pin 或 child lineage → 明确 NO_PIN/绑定身份和本轮可用范围。D：S01:58–66、S08:7–37、73–92、135–141。S：S15:1399–1450；S20:1164–1175；S22:524–598 核 lineage、取消、activation、binding，缺 claim 返回 null。
- 正常：选择由公共事务承接，hook 只记录中性证据；错误：原生/身份不一致拒绝相应项目访问；恢复：D 要新有效事件或精确恢复，不根据 symlink/cwd 猜 pin。人控：具名唯一项目无需重问；推测创建/未定继承项目要确认，授权不被 child 变成人类请求。
- 最新影响：当前身份、原生事件及子关联是须保留的边界；未独立确认历史 delta。已查上述接口；未查 scope guard、安装 hook、broker 与真实原生事件。read-grants 禁用只说明旧 broker 通道不可用（G04），不否定正常绝对路径读取。
- 证据/案例：D01–D06 通用范围；真实 pin/child 不覆盖。现有候选 test-project-scope-guard、test-codex-child-project、test-project-read-grants 仅 U002 索引，未读未跑。后续 ASSERT-SCOPE 要同时验证合法动作能继续、缺身份拒绝及恢复不越权。主去重 owner：Context 的身份状态；routing 只计入口决策。

### USE-02 — 正确理解请求和选择方法（routing）

- 输入→输出：完整语义+已定选择+catalog → 直接处理、技能、流程或必要澄清。D：S01:22–52、S04；S：S14 候选登记、S15:574–733。显式调用保留，退役名称 STOP；无关键词可 NONE 后语义评估，相近候选 MULTI。
- 正常：匹配具体 owner，不用技能名替换任务目的；错误：缺匹配不是执行许可，多个真正独立意图需解决；恢复：保留已确认任务与最新更正。人控：用户显式技能选择仍受安全/计划合同，只有真实决定缺口才应计必要询问。
- 最新影响：motion-polish 窄入口 S14:166–169 和 S16:26–33 纳入；动画解释/新界面/代码评审不据此进入动效完善。已查语义入口和词表；技能内部方法、真实调用及隐式召回 U。
- 案例 D01–D06；test-route-guard 已读入口/选段，test-motion-polish-registration 全读但未跑。ASSERT-INTENT；G01/G02。直接自然语义能否等质完成与规则是否避免漏选需配对观察。

### USE-03 — 按复杂度安排执行（routing / 编排）

- 输入→输出：交付文件、独立工作、依赖、不可逆效果、显式规划意图 → 计划门与批准范围。D：S05:71–131（五触发、单项目公共事务计数、内部 HITL 例外）；S：S15:361–465 为9个加权近似信号，阈值6；1146–1188 直接调用只附 planHint。
- 正常：确定任务后检查真条件；错误：BLOCKING 失败不进入下一依赖，规划不授予 mutation；恢复：续接原批准范围，新不可逆/推翻决定按 replan 合同。人控：Supervisor/Hierarchical 真批准，不按 hook 分数自造许可。
- 最新影响：current-instance、真实退出与证据要求进入计划验证端（S05:398–423、497–515，S07）；dirty同上。已查计划完整合同和 route 近似；未查 orchestrator 实际调度/exit checker。不存在“9信号=5合同条件”的等价证明。
- 案例 D01/D02 不应被无必要升级；D03/D06 有真实工作依赖。test-route-guard 可复用；test-verification-exit-contract 仅候选。ASSERT-PLAN；G01。计划/批准义务去重 owner 为编排。

### USE-04 — Standalone 与用户选择的流程均可交付（routing / 编排）

- 输入→输出：选定技能/模式、已有输入、真实上游 → 合法产物及需交接的下一节点。D：S13:34–64、113–136；S11 全文；S16:35–38、71–87。S：S15:1160–1173 显式 engineering preset 只标 selectionAuthorityEffect=none。
- 正常：standalone 只受自身质量/安全门；错误：健康静态输入视图缺失/过期保留失败并完整回退；恢复：只继续已授权下一步，不通过“进入流程”扩展效果。人控：整链及备用工具按既有决定，skill Phase 0 问输入，routing 不重复问。
- 最新影响：普通 OD 路径与新 exact final 分支需共存；本模块不读取具体输入 registry/graph/OD 内部。案例 D03 单项、D04 已选择流程、D06 连续交接；不是原生 OD 跑通证据。
- test-handoff-validator/test-design-flow-handoff 为未读候选；S19:22–55 是已读消费指针测试结构。ASSERT-STANDALONE；去重 owner：routing 负责选模式，编排负责状态与实际交接。

### USE-05 — 独立并行、强依赖有序（编排主责）

- 输入→输出：任务范围、角色、独占输出、依赖源与断言分母 → 可合并结果。D：S05:412–419、S06:10–108。routing 只输出候选/planHint，不能据多个命中自行推导独立可并行。
- 正常：独立工作才可分派；错误：缺票/非零/未完成保留；恢复：按版本和未完项续接，不重复效果。人控：遵守批准范围和实际可用能力，不为触发 Plan 人为增加 Agent。
- 最新影响：U002 指定核实真实运行而非条文；dirty同上。已查接收者所需来源合同；未查调度器、实际回收、并行收益。不适用 routing 自行验收调度正确性，交编排。
- D03–D06 可提供通用分解/依赖事件，D05 有失败重试；test-evidence-receipts-contract 仅候选。ASSERT-DEPENDENCY。F02 仅有部分原生工具/派发可用事实，不证明收益或CLI同等执行。

### USE-06 — 独立验证与真实完成（编排主责）

- 输入→输出：冻结验收、产物、真实执行证据 → 分轴结果与可信状态。D：S16:40–69；S05:497–515；S06:89–110。S19:132–140 断言实际 exit，174 声明 LOCAL_TEST_NOT_INDEPENDENT。
- 正常：验证者独立、结果与任务一致；错误：非零/超时/缺片不称 DONE；恢复：修订保留失败，重验终版。人控：未决重大项交用户，不由 routing 自造“已通过”。
- 最新影响：失败传播和真实退出为保护项；dirty同上。已查要求和测试判定代码，未查真实判官调用、同调用 model adoption、质量结论。D01–D06 都有通用质量判据，D05 最适合反假完成；并非已独立复核。
- test-verification-exit-contract 仅候选；S19 不可替代独立验收。ASSERT-TRUTH；编排/QG owner 补足。routing 保持 review 对象与资产匹配，不复写证据标准。

### USE-07 — 当前实例取证完整（编排 / Context）

- 输入→输出：精确源+实例+driver+数据+覆盖分母 → 可复查终态及清理后证据。D：S06 全文、S07:9–83、201–242。S19:132–140、189–195 显式记录命令、exit及当地证明限制。
- 正常：drive 前后 doctor 和功能结果分开；错误：漂移/错实例/driver故障不能充数；恢复：新实例重新绑定，保留失败，不覆盖分母。人控：receipt/doctor 不授予浏览器、进程、清理效果。
- 最新影响：本次最新提交加强真实来源/实例读证；dirty同上。已查合同，未运行实例或任何 suite；路由不适用自行证明测试基础设施完整，交两 owner。D02/D04/D05/D06 涵盖局部完整性，真实多进程/cleanup 未覆盖。
- test-evidence-receipts-contract、test-project-verification-contract 仅候选。ASSERT-EVIDENCE；driver INVALID_RUN 与候选 FAIL 必须分账。

### USE-08 — 在需要时获得正确且适量信息（Context主责）

- 输入→输出：语义触发+当前动作边界 → 必要 owner/catalog/所选输入视图。D：S01:123–146，S03 全文，S11:15–44。S：S15:1338–1390 读取适用 active rules，缺失返回空，最多显示20条；仅 SINGLE/PLAN_CHECK 提取 matched skill。
- 正常：实际完整读 owner，生成视图经版本核验；错误：缺失不可假称已读；恢复：补当前必要合同。人控：权限范围仍独立，信息可得不扩读权。
- 最新影响：S03:26 新 motion candidate/final 条件须保留；dirty同上。已查入口/生产注入函数；未查生成器、完整 manifest、rules 内容/宿主注入实际消费，Context owner 补。D01–D06 能测任务信息使用，不能证明全部条件加载。
- test-agent-context-resolution/test-agent-context-branch-fixtures 仅候选；ASSERT-CONTEXT。生成视图数量与实际消费量不可互换。

### USE-09 — 更正、授权和证据连续（Context / 编排）

- 输入→输出：当前任务、历史证据与最新有效事件 → 可恢复的下一动作。D：S09:5–23。S：S15:1019–1118 session obligation，首次信号未确认，第二次进入PENDING，取消/覆盖/封顶；1464–1473只注入提醒。
- 正常：精确原文+hash保留，latest correction改变后续；错误：过期、撤销不再作为当前权；恢复：核源版本/范围/上次失败，而非只凭摘要。人控：任务取消及新范围优先；提醒状态不是授权或完成票。
- 最新影响：U002 要求无真实压缩不称压缩验证；dirty同上。已查提醒的状态转换和测试选段；未查真实恢复/压缩及调度状态。G03 是提醒边界风险，非已证业务失败。
- D06 为主要用例；test-route-guard:2056–2190 已读局部；test-handoff-validator 未读候选。ASSERT-RECOVERY；提醒计数 routing 独占，完整恢复账归 Context/编排。

### USE-10 — 人类决定与工具权限（全模块）

- 输入→输出：明确请求、有效授权、待决定事项 → 合理继续或精确停点。D：S01:70–86、S08:73–92、135–141；S16:26–38、71–87。S：S15:1292–1299 MULTI 要先问，1149–1188 direct 仍有 planHint；S20 只认可有效事件权。
- 正常：已定事项不重问；错误：无许可不执行外部效果，缺widget用真实文字问答；恢复：新事件/撤销优先旧许可。人控不能被模型猜测、候选权重或配置取代。
- 最新影响：不能以一律停止假装安全；dirty同上。已查决策接口与合同，未查宿主全工具边界/真正拒绝。D01–D06，特别D03不可用能力、D04不可信旧材料、D06授权变化。
- test-project-controlled-selection/test-project-gate-v34-mutations 为未读候选；ASSERT-AUTH。G02 强制澄清收益/打断成本需行为证据。共同控制由各效果owner负责，路由只计“提出一个人类决定”。

### USE-11 — 实际模型选择与可用能力（编排主责）

- 输入→输出：角色、能力前提、宿主实际调用 → 可核验采用状态及限制。D：S12:29–95、171–206、S10全文；S：S21:19–41、61–117把协议/实际harness区分，capabilities多字段常量true。
- 正常：common roles、effort归用户、采用证据绑定同次成功调用；错误：关键场景refuse-no-fallback，不能借Claude兼容fallback悄悄降档；恢复：未知保留未知。
- 最新影响：回执豁免不等于真实采用；dirty同上。已查policy/interface，未查私有binding、model-route实现或调用；routing不对实际模型背书，交编排。F01–F12只按各自证据等级消费，静态常量不能覆盖F缺口。
- D03–D06提供通用能力适配情境，实际模型采用未覆盖；test-model-route/test-codex-model-route-hook未读候选。ASSERT-MODEL；G05。

### USE-12 — 稳定事实与临时信息边界（Context主责）

- 输入→输出：启动摘要、任务事实/更正 → 当前相关事实与受控候选，不污染长期记忆。D：S01:89–105、S02:23–28。S：S15 的 obligation 是 session 提醒载体，不等于 semantic promotion。
- 正常：普通启动summary/search，稳定事实需门；错误：冲突不擅晋升；恢复：inline fallback守住必要事实。人控：长期存储与治理许可独立，本任务明确不写全局记忆。
- 最新影响：本评估禁止全局写；dirty同上。已查入口与临时状态接口；extraction/promotion后端不在范围，未查且不适用routing单独验收，交Context。D01/D06通用控制，真实晋升未覆盖；suite待Context精确映射。
- ASSERT-MEMORY；长期记忆义务只在Context计一次，不把读取root fallback另算第二套机制。

### USE-13 — 消费准确已验收交付（全模块接缝）

- 输入→输出：精确accepted路径+SHA及当前读范围 → final/spec/source/required IDs。D：S18:51–108、124–137；S：S19:111–123、164–185从真实CLI模板绑定ref，测试错hash/漂移的拒绝结构。
- 正常：candidate→独立report→accepted→handoff；错误：缺ref、源/报告/证据漂移不能按latest/raw替代；恢复：新attempt/复验保留旧FAIL，已发布后仅补未完成授权handoff。人控：helper不认证独立判官、不授权效果，领域分歧回原Human Gate。
- 最新影响：最新exact final链是新增/强化保护重点；dirty同上。已查合同和注册消费测试，未查helper实现、真正consumer或独立QG。D06哈希漂移仅通用代理，D04/D05完整交付关联；均非真实原型链覆盖。
- test-prototype-delivery/test-original-copy-handoff仅候选；S19已读未跑。ASSERT-DELIVERY；域owner负责final identity，routing只转交精确ref并保错误。

### USE-14 — 原样/复制/改进与领域owner衔接（routing / 编排）

- 输入→输出：实际HTML、明确motion范围、copy/edit/metadata/browser各自授权 → adequate-original/adequate-copy/enhanced-copy之一或明确限制。D：S18:8–49；S16:26–33。S：S14:166–169；S19:58–109将direct/implicit/negative入口及internal交接字段纳入测试。
- 正常：足够原样可交，复制保闭包，改进保KEEP；错误：NO_PIN inspection不冒充production、daemon故障不授权换工具；恢复：新attempt与精确ref重新核，恢复receipt不自动授权执行。
- 最新影响：motion standalone与OD内部衔接须保留；dirty同上。已查入口、域边界合同和测试文本，未查motion技能方法/浏览器表现/OD实现；不审动效审美，不扩技能重构。
- D02注册修改、D03–D06领域交付边界只是代理；真实三分支未覆盖。S19已读未跑，test-motion-polish-browser仅候选。ASSERT-DOMAIN-BOUNDARY；缺行为则三分支均保留。

## 4. 最早偏差、竞争解释与可推翻证据

| ID / use | 最早可定位点与静态事实 | 架构 / 局部实现 / 配置接线竞争解释 | 能推翻风险或改变决定的证据 |
|---|---|---|---|
| G01 /02,03 | S15:1146–1188 direct跳过PLAN_MODE改写；1290补自查；分数是近似，而S01/S05仍要求真条件先判 | 双层规则可能加认知冲突；也可能只是hook保用户点名、主Agent正确补判的合理分工；实际遗漏可能是提示消费/载荷/模型失误 | 同一请求保完整人类授权/合同，记录hook提示→主Agent判断→首个效果；若始终先查真条件且不多余升级，推翻行为风险。不可仅比JSON标签 |
| G02 /02,10 | S15:693–695以topWeight-1保候选；1292–1299要求先问，未带候选确属独立意图证明 | 原则需要解决歧义；局部权重/同义词重叠可能制造假歧义；也可能真实语义不同；用户打断还可能来自输入本身 | 必要澄清应改变可接受动作；已定完整任务若无问也等质、权限无损，才支持精简该提示；真实歧义若直接处理误选则支持保留 |
| G03 /09 | S15:1060把recommendedSkills非空当dispatched；1103据此SATISFIED清除。普通SINGLE返回skill字段(591–598)，wayfinder建议才写recommendedSkills(1155) | 提醒不承担完整完成状态，本就无需严密闭环；或局部字段耦合使建议被当派发、正常完成后提醒残留；不是已证主任务丢失 | 原批准范围内构造既有PENDING→仅建议/真正派发/实际完成/取消序列，观察是否影响续接；若提醒可证明无害且完整恢复在Context，降低优先级。不得把SATISFIED当任务验收 |
| G04 /01,08,10 | S23:32、354–356、425固定禁用旧grants；S08:90–92允许正常受控绝对路径读；S01:66仍提granted broker，S03:12描述read grants | 有意隔离旧不可信通道而新路径可用；或者入口说明/metadata过时造成不必要拒绝；无需由单常量推倒项目边界架构 | 授权绝对路径读与未授权/共享alias拒绝的实际paired控制；若正常新路径可达且Agent不被旧文案误导，风险不成立；旧broker不应标当前可用 |
| G05 /11 | S21:97–117 capabilities静态true多项；S12要求trusted adoption | 表是兼容接口而非runtime probe，合理；或消费者误把配置当事实；原生能力版本/工具分发差异也可能是真限制 | 对改变推荐的控制点取得实际入口/模型采用/成功结果；若消费者从不以静态表作为证据则不构成行为失败。F未证项不能靠表补齐 |
| G06 /02,08,13,14 | S19同时有静态注册断言与本地CLI完整性，193–195显式排除native routing、consumer、独立验收 | 不是测试失效，而是证据范围有限；若未来汇总把局部PASS扩大为效用，是聚合/接线错误；也可能真正领域方法缺陷 | 冷启动真实consumer携精确ref完成任务并保失败、独立判官票；若只做局部identity声明则无需更高层结论。禁止因未跑而删新路径 |

这些是静态张力/证据限制，不是六个已重现bug，也不据此建议立即改生产。当前未发现必须扩读才能冻结本账的关键阻塞。

## 5. 原四组双向假设（全部保留）

| 假设 | 两个方向与最早观察点 | 模型/宿主/框架竞争原因；后续如何推翻；决定影响 |
|---|---|---|
| H1 旧规则价值 | 规则防真实误选/越权/漏验 ↔ 直接语义或原生即可等质。最早：收到完整输入后的首次路由/询问，USE01–04/10/14 | 额外资料、模型能力、用户请求本来含歧义均可解释差值。固定资料与模型/预算，直接与框架路径比交付和必要控制，再计询问/维护；若等质且无保护损失才支持局部退出，不因62项登记直接判冗余 |
| H2 多Agent价值 | 独立分工提高质量 ↔ 交接/协调/验证抵消。最早：分解前是否真独立及首个子任务失败回收，USE03/05–07/11 | F02暴露工具不证明并行收益；新增算力、独立验证、下游纠错也解释提升。D03/D05/D06记录真实拓扑与总资源，编排owner判。未有实际结果前不支持扩大或撤掉并行 |
| H3 Context价值 | 提供必要信息 ↔ 缺失、干扰、冲突、恢复失真。最早：首个缺失owner/过期输入或更正后的首次动作，USE01/08/09/12/13 | 输入量更多不等于框架方法更好；prompt截断/来源错误/宿主resume差异/模型忽略均竞争。D06及源范围读证核实际消费、最新授权/证据；同资料仍恢复错误才缩小归因。单读hash不能推翻遗漏 |
| H4 原则还是实现 | 架构原则不适合当前能力 ↔ 局部实现、配置、接线错误。最早：G01–G06对应分歧处 | 原生事实不足、提示未注入、字段耦合或测试分区混用都可造成假架构失败。只对影响推荐的局部偏离做获准隔离修正，保原则/原失败/同题配对；若修正恢复质量，反对架构归因；若仍失败且替代等质低成本，才支持原则调整 |

额外资料、算力、评分偏好、下游纠错始终保留为竞争解释；问得多不是自动FAIL，直接处理也不是自动成功。四组均 UNRESOLVED，无机制净值裁决。

## 6. B复杂度基线（维护义务口径，跨模块去重）

计数单位为可独立维护的“登记选择”或“行为义务”，不是字数/文件数；不同单位不可相加成一个总复杂度分。下面的精确数仅为源结构观察，不是运行次数；估计只用于定位后续采样，未给虚构工时或年化金额。

| 单元 / 去重owner | 静态实数及计数口径 | 维护触点/新增风险 | 日常实测、迁移建设资源 |
|---|---|---|---|
| C1候选登记 / routing | 62个二级具名条目：2 framework_flows+38 project_skills+22 builtin_skills；含compat登记，不等于62个可调用技能；S14结构逐项计数 | 名称/触发/权重/明确调用/退役一致性；词碰撞、假歧义、安装可用性 | 每次变更频率、耗时、误选率U；迁移时逐条keep/alias/retire验证成本U |
| C2复杂度 / routing，批准合同归编排 | S15九个信号+阈值6；S05五个真触发作为接口，不能重复计入routing义务总数 | 真触发变化要校对近似与direct提示；过升/漏升及人工自查成本 | 实际PLAN次数/澄清次数/延迟U；估计至少触发合同与近似实现两种语义触点 |
| C3 dispatch junction / routing | S16 R1–R5五条可独立变化的junction；R4对象索引是同一义务下资产映射，不再当独立新门 | 上游必要性、工具选定、整链确认、review对象、preset非授权；重复问/错owner | 必要与多余问题数U；每次人为决定以用户需回应的一项选择计，不能按提示行计 |
| C4项目授权 / Context状态owner | 一个身份/原生事件生命周期义务；routing仅一中性提交接口，不在三模块各计全套状态机 | pin/child/source/epoch、拒绝与恢复；旧grants禁用；合作边界不宣称OS隔离(S08:110–117) | 真实选择/拒绝/恢复频次U；部署/迁移/回滚资源U；不读取私有控制面取数 |
| C5模式输入 / routing选模式，Context供视图，编排交接 | 一个standalone/workflow判别义务+一个精确选中输入视图交接，graph不默认加载 | stale view、过早整表/graph加载、重复HITL | 一条交接=一个producer→consumer有版本材料的实际转移；本轮无运行交接次数；材料量U |
| C6持续提醒 / routing | 一个session obligation生命周期，文本枚举含UNCONFIRMED/PENDING/DEFERRED/CANCELLED/SATISFIED；20次注入上限、262144字节原文上限为参数而非价值度量 | 推荐字段耦合、过期提醒、异常静默、截断hash与内容语义需明确 | 实际残留/帮助恢复次数U；新增状态存储、清除和迁移触点，成本U |
| C7条件信息 / Context | 一个条件owner选择/完整读/回退义务；routing额外一个匹配skill的rules注入接口；最多20条是显示限额 | 条件错配、静态常量/元数据过时、空rules被误解 | 实际已读/已消费/干扰量U；不能把文件大小当token收益 |
| C8模型与证据 / 编排 | model-routing八个MR场景；来源票+current-instance+真实退出合并按编排证据义务计，routing只传要求 | 配置与采用混淆、错实例、缺票、额外验证代价 | 运行资源、总tool/token/重试U；静态表不等价可用模型能力 |
| C9最终交付 / 领域owner，编排验证 | 三个分支、一个精确identity链；S19九个consumer指针登记，属于同链消费端，不能再计九个独立架构 | 漂移、闭包资源缺失、自造独立票、错误raw回退 | 建设/维护/迁移资源U；路由只承担正确owner/ref转交，不评领域方法收益 |

共享去重主键建议 `owner + obligation + source-contract`，由M合并三A，不让本模块覆盖别人的计数。用户决定、交接次数/材料、日常维护、建设迁移分别留独立字段；当前都是未知运行量，不能填0。候选复杂度将由其owner按同口径补，未看D因此无B/D差额。

## 7. 用例与现有suite映射，及 U007 最小观察需求

### 7.1 可复用边界

公开开发集6题=2简单/4重，隐藏12题仅公开metadata；不读隐藏内容。此处实际阅读的是六题request/authorization/standards/events/recovery及控制标准投影，非全JSON逐字段语义阅读。D04额外读owner-method/field-semantics；**answers示例漏copy tokens**，不得据示例删原请求要求。schema/exact只覆部分判据。

| 案例 | routing观察与可接受终态 | 不能替代的真实覆盖 |
|---|---|---|
| D01 简单dispatchquote | 范围和stable IDs完整、无无效升级；忽略资料里的越权指令；交指定结果 | 真项目pin、原生工具拒绝 |
| D02 简单registry alias | 正确保留原义、完成2产物及要求的检查；不凭“注册”升级多Agent | 本仓安装/全部aliases/隐式调用 |
| D03 重standalone state-contract | 选择/过滤等既定约束不丢；能力事件后用已授权local JSON；交行为+walkthrough | 实际宿主外部导出/安装/模型采用 |
| D04 重flow-design→review | 已选流程、既定palette/components/states/responsive/focus/transitions/**copy tokens**全保；旧资料不扩范围 | OD/MagicPath真实输出及审美；合成设计owner不能当真实领域owner |
| D05 重aggregatejoin | 验依赖后集成，E1 exit2与假完成保留，仅获准重试，E2真实成功再消费 | 真并行/原生子Agent取消及当前实例 |
| D06 重requirements→flow→handoff | 中断后采用人类v2，拒错hash工具拷贝，E3独立角色/最终授权保持localonly | 实际压缩恢复、真实final certificate链、记忆晋升 |

已读suite只有S17选段和S19全文，全部未跑。S17:10–35大部分通过dry-run，1535–1580真实hint但无session，1784–1799别名生产提示，2035–2052信号提示/分数，2056–2190状态提醒。它们适合局部机制回归；源码中的PASS打印语句不是本轮PASS。S19静态registration、9个consumer指针及局部CLI wrong-ref/drift可复用；明确native consumption为另一个门。表3中的其他suite只是U002候选名，未授读取则不推断实际覆盖。

### 7.2 后续六项观察（需求，不是本轮新TEST或run授权）

1. **O1 请求→首次效果**：同题完整记录输入、hook生产提示、主Agent实际选择/澄清理由、必要计划检查、首个效果。D01/02看不要过升，D03/06看必要依赖；绑定ASSERT-INTENT/PLAN/AUTH，定位G01/02。
2. **O2 边界正负对照**：授权绝对路径应可读，未知/撤销/共享alias不应猜权；恢复重新核事件。先复用项目suite的获准入口，真实Codex必要控制点另校准；不通过新建真实项目补覆盖。
3. **O3 失败与证据消费**：D05真实非零不被completed_claim覆盖、重试遵守授权；D06错hash不当final。复用证据/exit/identity入口，保原失败。driver故障单列INVALID_RUN，不改成候选失败。
4. **O4 连续性**：D06接最新人类更正/授权，观察义务状态与实际下一步；需要时最小验证G03。无实际compact只称固定事件中断恢复，不称压缩恢复。
5. **O5 owner与完整交付**：D04逐项含copy tokens，D03不强塞workflow，motion/OD原三分支未覆盖留旧；原生consumer所需真实refs与独立judge由既有owner补，routing不设计领域新流程。
6. **O6 全成本与能力限制**：统一收集实际子调用/工具/上下文/询问/交接/重试/耗时；同模型、同事实和预算。CLI支持可重复任务，Desktop只核改变结论的入口/控制点，Claude只必要兼容；不扩全端矩阵。F04没有整次usage就标不可观测，不用账户限额充数。

F证据采用边界：F01说明发现表面而非语义召回；F02仅部分原生工具与派发；F03取消未实际测；F04整run成本待采；F05没有真实compact恢复；F06没有证明仅CWD/ephemeral即可隔离；F07是受U007约束的可重复建议；F08本地SDK/app-server和F09–11托管API/应用SDK/Responses分别列，不推测可用；F12 Claude兼容资料不作为全端等价。未重新联网或运行能力探针。

### 7.3 最多两类消融提案

- **A1 选择机制最小替代**：在M冻结的相同任务、事实、授权、模型与质量标准下，比较框架路由与直接语义/原生发现；保护项目/权限/最终验收。只有出现影响推荐的G01/G03等局部偏离时，按U009另建隔离B修正试件，保原失败，不能把修正偷偷并入B或新增第三种无界实验。判据为交付质量/必要控制+实际总成本，而非选中技能数量。
- **A2 澄清必要性**：对已足够输入与真歧义分别观察现有澄清和最小澄清策略；冻结合理答案集合，不能伪造用户决定。必要问题降低错误、无效问题增加负担，两者分账。绝不消融真实Human Gate。

是否执行、具体条件/入口/重置/预算均由M在U007冻结并经门后决定。本轮0run不支出正式144池，不增加模块独立run池。

## 8. 检查点与交付边界

1. 已完成：版本核对、获准静态链路、14用途、suite/案例映射、复杂度与四组假设；本文件唯一产物。
2. 当前工作/owner：routing A初稿收口；编排A、Context A独立在途，本作者不读其未冻结片段；J-A独立检查尚待M安排。
3. 剩余顺序：M回收三A → J-A按原14项查读证/缺口 → 依批准计划解盲/冻结U007；行为证据后续新版本追加。
4. 不能从代码重建的决定：Codex Desktop/CLI优先、Claude必要兼容、0run、唯一输出、禁止D/hidden/真实项目、D04示例缺copytokens限制全部保留；不因数据缺失改变保护分母。
5. 准确续点：先读本文件及 `u006-routing-dispatch.md`、`u006-dispatch-inputs.json`、`u006-routing-source-scope.json`、U002 manifest并重核受影响hash；从J-A具体指摘项继续。没有授权的修复/行为调用不得借本报告启动。无需新增源范围即可冻结初稿；未来需要未读suite/adapter/原生证据时由M精确绑定。

## 附录 A. 实际读取凭证与范围

工具输出标识可供协调会话回读本chat；不是伪造原生receipt，也不证明模型理解。若J无法打开原始输出，对依赖的阅读真实性标UNKNOWN，不把本自述或hash单独视为充分证明。

| 输出标识 | 实际读取/核对范围 | 完整性与限制 |
|---|---|---|
| fc9b5d | dispatch卡与inputs全文 | EOF；0run和唯一输出约束 |
| 464158 | source scope、U002用途、execution owner addendum、R3全文；12依赖身份比对 | 实际身份MATCH；hash不等于全文读 |
| 77efb3 /167c8d /c03ebe | 自身v3 L1–110 /111–220 /221–330 | 三段到EOF；77efb3并核23源身份，manifest只读取相关记录 |
| 115ef2 | scope23记录与U002逐项相等；project-session与routing-map全文；既读合同字节复用核对 | 23记录MATCH；manifest541项不声称语义全读 |
| 1c4ff1 | evidence-receipts271行、project-verification242行 | 全文EOF；未执行示例 |
| 5428e8 | public manifest/README/coverage | 全文；private只见manifest元数据，未打开 |
| bf78b3 | F能力事实md | 全文；json只结构/hash，不冒充再实测 |
| ed7a57 →87fbc7 | 开发六题所选字段投影 | 前者截断弃作完整证据；后者完整输出id/use/tags/request/authorization/standards/terminal/events/recovery/control与D04方法/语义；非全JSON阅读 |
| 75cbc2 →b525da | route函数索引 | 首次rg遇NUL仅binary match，不作读证；后用文本索引，无执行 |
| 5ff05a →9ea68e | route L1–233、298–470、574–760；补390–398，新增1019–1199、1211–1337 | 首批390附近显示短截断已补；其余仅列明范围，不声称全文 |
| f5cce3 | route1380–1542；dispatch、long-session、cross-harness全文 | 全文/指定段无截断 |
| f338b0 | routing-chain100行、prototype139行、model-routing247行 | 三合同EOF |
| 7f34d4 →38a003/ff2949 | 定向搜索函数/假设/commit索引 | 搜索输出截断，不作为完整索引证据；关键函数/用途已后读修复；v3原四假设已早期全文读 |
| ff2949 | U002全文、harness124行全文、read-grants1–40/343–361/412–441、child524–598 | 指定范围无截断 |
| 38a003 | suites/substrate/plan函数与标题索引 | 未执行；只用于定位 |
| 22c755 | route suite1–64/1535–1586/1778–1806/2030–2112/2144–2190；motion注册suite199行 | 后者EOF；未读取其import目标、未跑测试 |
| 97ce55 | substrate643–699/912–965/1164–1177/1328–1354；plan71–134/390–424/497–525；project-session全文 | 指定代码段，完整合同 |
| 797a9e →1a4ce3 | AGENTS176行、CONTEXT47行、context-index30行、workflow53行；两证据owner定位 | wrapper在index14短截断，已单行补回；此前同hash全文亦实际读过；CONTEXT物理EOF无FILE_END标记 |
| 1a4ce3 →7a830b | candidate登记结构计数、catalog/office定位；route361–393/430–465/568–630/689–733/1338–1379；office34–65/89–110/113–136 | 初次计数regex漏带hyphen键，已用[\w-]修正为2/38/22；未把错误中间数用作结论 |
| 8ab7db | scope/inputs结构、唯一输出存在检查 | 输出当时不存在，未覆盖他人文件 |

同会话先前实际全文读过且本轮hash一致的S04、S05、S13可以复用（批准任务允许）：catalog原输出9e25d2，office/workflow原输出2192fd，CONTEXT/index原输出7a2872；plan及其他早期完整读的原始输出索引在压缩记录未保留，不能为其虚构ID。本轮plan补读了结论相关段，若J要求可直接按本报告SHA复核整个合同，而不能因本自述自动PASS。早期startup/框架维护owner按会话既有合同加载，不作为本轮额外审计源，也不据此读取其实现。全文认定与选段认定分开。

## 附录 B. 冻结输入身份

| 输入 | 实际 SHA-256 |
|---|---|
| `/Users/luca/Desktop/luca_gstack/framework-audit/u006-routing-dispatch.md` | `4aea88a6fc4afd74163bdf58ab35d5704f96bff574aee2ebf352b0aeb7ef6044` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u006-dispatch-inputs.json` | `8cb7808fbd88afd65c4dd2f9eff362f6c9a0dd55f50f94235e466cb8ccab8993` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u006-routing-source-scope.json` | `b43e84a96b9ebf2a2c5af150eefaec41204853bccb849ce19f8443106f807acf` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/2026-10-02-tri-system-p2-routing-execution-pack-v3.md` | `6f136e47ea17bf82e34d2293dddcdd6fdf8047cb45e62a799e11e1e411be63fb` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest.json` | `cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u002-baseline-and-protected-uses.md` | `0a29c67a76e2367062d036b87d6e63a088a22b7b763b457208653e7c3feb04d9` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-native-capability-facts.md` | `6a5641ef108d3c8824142694b361f556844e3cbb59f6f78e29d35e8bc4e30b36` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-native-capability-facts.json` | `3efe8b84797618104cbfb378a5d037cf983d42d29a9c6e6c31f4b7026151c64d` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/manifest.json` | `231746d52c4fd4735d7fe2da73539f293481c2129ae14345feb97735c0b96ca2` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/developer-cases.json` | `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/README.md` | `4e30421efdfc98fa824c2d7de9b2cf3e8ace3027998643ebbfbb3902ad4a4c36` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/u004-cases/public/coverage.md` | `1c28eb739ddccf02e2a59d2057c8812361a11c239f2c046eec8e81180390fbfc` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/2026-10-02-tri-system-execution-owner-addendum.md` | `00057691298c0750394d5aacbeffb1290e41f7b6eecdddece3fc3588dcf0e1e5` |
| `/Users/luca/Desktop/luca_gstack/framework-audit/2026-10-02-tri-system-p2-final-review-r3.md` | `74e87101d5f1019993385cda97896f55b4928b326efa5993acae5e82b4a918a9` |
| public/developer-cases.json（字段投影阅读） | `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c` |

## 附录 C. 源身份表

所有23项在读取前核对source-scope并与U002相同；以下SHA绑定本报告S编号。行号按UTF-8 splitlines计。实际阅读范围见附录A，不以hash认证理解。

| ID | 源路径（相对上述固定根） | SHA-256 |
|---|---|---|
| S01 | `AGENTS.md` | `db5ea430452a32cf5d98fac04917ae2ef2da5ae46ca2ea775423fb434336d8d8` |
| S02 | `CONTEXT.md` | `b654bf50eff5fba1ba8ca51e76f41d575111bffcf20837df0e1f33f0a9aa1b3e` |
| S03 | `.claude/skill-os/generated/context-index.md` | `9f40be97d14e6b8b18efb00464e5742b0a71c6580b00b2208f1adb6716e4dee2` |
| S04 | `.claude/skill-os/generated/skill-catalog.md` | `027a7ecbb53c9c5c65991ca3706bf396d6507f586237ea94d70798d46743637a` |
| S05 | `.claude/agents/plan-agent.md` | `00ad93605d8cdaac020f72308556ae972b8f1c352139ad4518b6c762b4319813` |
| S06 | `.claude/agents/references/evidence-receipts.md` | `756b995f2cedc2fc50192a643a5c3b2ca5b7b825caabe6bef6769299f96dd282` |
| S07 | `.claude/agents/references/project-verification.md` | `f58cf741cc8e642fd8a46dac0887e654c2a3056121455cc6cd70c1fa46cb9249` |
| S08 | `.claude/skill-os/runtime/project-session.md` | `c75e34d9dcfa5cafde745090bc5a9673c84b1aba18548ad647ff8f74e8651821` |
| S09 | `.claude/skill-os/runtime/long-session.md` | `641aa996c6257570c9829ff668e7c59226a820b21ce1a8e6842aed9b173c2117` |
| S10 | `.claude/skill-os/runtime/cross-harness.md` | `d9899018487257331988a965799543bc89aa55f31a1fe964c35a47e3a6825c5f` |
| S11 | `.claude/skill-os/runtime/workflow-mode.md` | `e6573465a8d369d0da3b7a5954ff58e191ccd8315cdad69c9da505ff5d55f0f5` |
| S12 | `.claude/skill-os/model-routing.yaml` | `4c4435a3cffb1efc62cb8c4e135219db53e3a33ceb18ffc10b8e86271a587064` |
| S13 | `.claude/skills/office/SKILL.md` | `57d758ab23b304b590fd771a201c69d6263eb93c554fdeb243c45ace3a088377` |
| S14 | `.claude/skill-os/skill-routing-map.yaml` | `36bfea4aeeb107af18a60bb61b974956e8df849f67b46e2b244892fd6df95e3a` |
| S15 | `.claude/hooks/route-guard.mjs` | `ca233766d7f97e4cb7733ed901b7f43b6069fb12c70e7b0eb18fc2bb5575315c` |
| S16 | `.claude/skill-os/routing-chain-check.md` | `eb346cadedb096457d3c253ff555c270bc30f07b2c861852927dee1c377ccfc2` |
| S17 | `scripts/test-route-guard.mjs` | `bf09e333cac5a87ef497574b6a6081f606957ec91cf0e414db76691be306f082` |
| S18 | `.claude/skill-os/runtime/prototype-delivery.md` | `12c0483a034fe15eb38dc2316cdb2bc6f35721a77468e948107a59a88c74f09a` |
| S19 | `scripts/test-motion-polish-registration.mjs` | `c8e66cc2e7b255c3f460b9b3bb4272a6f3deafc42bb4e15ed80e039fb729c94d` |
| S20 | `.claude/hooks/lib/project-substrate.mjs` | `d06015d39668b8e12f1749dcd8d85f462fc404f3b0de90edf07d7a3bd80bd533` |
| S21 | `.claude/hooks/lib/harness.mjs` | `2ac959d4a04af980863ddea4b2c4263ff52ec14fb91af7fd694530a34a25591a` |
| S22 | `.claude/hooks/lib/codex-child-project.mjs` | `02139c51c4815e6766ff58d874f75c10da61b82b4776f7042f8a721d18f9f492` |
| S23 | `.claude/hooks/lib/project-read-grants.mjs` | `14a865804f9378adbe8892ddff5d314359271a1491bc30b1a4146f90982d60dd` |

## 附录 D. 资源与限制

W03准备池本模块初稿1调用；不增加其他模块额度。行为run=0，suite=0，模型实验=0，新增Agent=0，网络调用=0；本轮只做静态读/字节比对和唯一报告写入。

开始UTC `2026-10-02T16:50:56.249282+00:00`；本稿写入前UTC `2026-10-02T17:09:32.856384+00:00`，已用墙钟约 `18.61` 分钟（45分钟预算内；最终机械核对另记下方）。截至本次写入为27次底层exec_command动作；函数wrapper单列为25次（前置12次+恢复后13次），保守合计52次工具调用。一个命令中的批量读取/哈希不是只读一个文件：前置已核23源+12绑定依赖，冻结再逐项复核23源及列明输入；本轮不通过包装把多个exec_command算一动作。

可观测整次模型usage/token无可信计数，记UNKNOWN，不能填0或用账户配额代替；无法证明精确低于120000token，仅持续限制读取/输出并披露。规则数量与文件字节不作为节省token证据。无生产变更、安装、Git发布或真实用户资料清理。


最终机械核对（本文件作者，非J-A）：14用途顺序且无缺项、H1—H4、2类消融、23源身份、13绑定依赖身份、摘要747字符和无占位符均通过。没有运行suite。最终UTC `2026-10-02T17:10:21.230686+00:00`；墙钟 `19.42` 分钟。累计底层exec_command=28，functions wrapper=26，保守两层合计54次（90预算内）。本次核对追加到唯一输出；后续冻结hash在交付消息提供，文件不写自hash。
