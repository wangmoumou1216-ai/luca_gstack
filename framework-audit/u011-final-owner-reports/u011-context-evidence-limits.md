# U011 / U012：Context 最终规则、实际行为证据与保留范围

**DONE_WITH_CONCERNS，仅指本报告更新。** 最终四份 Context 正文修复已由 root 采纳；本 owner 核验其冻结字节，并完成 N-D 必需输入聚合、N-B 实际交接后的获准重试、N-C 解禁后的最终汇总。不能再把旧版“未实施、仅建议、J05/R3 是当前版本”的表述当作现状。但这些限定任务没有原生最小替代的配对对照，仍不能证明框架更高效、净收益为正、旧在途状态回退安全或模块三整体验收已完成。

旧版完整保存在 [历史快照](/Users/luca/Desktop/luca_gstack/framework-audit/u011-context-evidence-limits.history-20261003-0ab377349de7.md)，SHA-256 `0ab377349de7522b296ccaaab7686399bf72a1f98e40ee8d5f34abff5b73b371`。原 J05 FAIL、R3 观察、全部原用途、失败和成本保留为历史，后次通过不覆盖它们。本报告是原 Context owner 的证据与建议，非独立验收票。

## 0. 共同零节与边界

沿用本轮 root 派发及已确认的共同口径：目标是一个通用框架，保护原 USE-01—14；Codex 桌面和 CLI 优先校准，Claude 只保留必要兼容，API 单列证据边界。既有领域方法、设计分支及原 owner 不变，不拆平台方案、不另起总计划。14 个用途是共同分母，不能把三模块覆盖数相加成 42 个样本。

每项都比较用途所需的最小原生办法与框架增量，而非以文档、字段、哈希、工具成功或更少字节代替价值。已授权的未完责任持续有效；真正缺少授权、未决 Human Gate、失败/未知/在途依赖才停止对应动作。报告、静态 PASS、题内 DONE 都不等于整个模块或项目完成。

以下实际测试都是 NO_PIN、限定 OS 临时目录中的规则消费。root 以现有临时测试权限注入的 N-B/N-C 事件是控制事件，不是真实用户新授权；题内 owner 和 finalization 变化不能外推为生产授权机制已验证。没有访问真实项目 pin、生产/global、private/archive、评分资料，没有新增研究、模型调用、Agent、probe 或网络，也没有 Git 写操作。

## 1. 最终版本与证据等级

唯一当前 Context 版本绑定是 [冻结 manifest](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/manifest.json)，SHA-256 `9bef444129de360f7388c41bc78f9139245d72207e20a5fb5c249f349f4221b1`。以下最终 candidate 均被完整消费过，本轮再次核 hash 与 manifest 一致；long-session 在 N-B 再次全文读取。

|最终 Context 文件|SHA-256|实际修复内容|
|---|---|---|
|[long-session.md](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/candidate/.claude/skill-os/runtime/long-session.md)|`43d88566e323994b532e9cfbe7fafc52c25eca55fd843a02216bf26e701ae312`|保原目标与 DONE、最新有效授权、真实效果/失败、在途句柄和首个未完点；恢复核当前事实，不重做完成效果。|
|[handoff/SKILL.md](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/candidate/.claude/skills/office/handoff/SKILL.md)|`3ba25ed25cdbbbe9c87699b41d5fbed1bd180336e59f2b27b08b91805621e002`|显式会话交接保连续责任与证据；OS 临时交接不自动造项目 Workflow、新会话或发消息授权。|
|[handoff-protocol.md](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/candidate/.claude/skills/office/references/handoff-protocol.md)|`cf55886449a7206c3d766e5645c0959b2d2b2b629e6f6a70b34f727b93f896c1`|精确已选上游、版本、gate/验收及实际读取；不能以 latest/raw、目录存在或部分成功合并代替 required 闭合。|
|[office/SKILL.md](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/candidate/.claude/skills/office/SKILL.md)|`942ee2387434c895932511efaa55fd03cb0800323f265d12b17f876fda1bd88c`|Step2 消费适用的精确上游及当前事实；5K 是单批建议，不是必需来源总量上限，真实容量缺口仍保 GAP。|

J18：root 通知最终四文件静态审查 PASS 4/4，F3/F4 与跨模块 consumer 冲突已闭合。本 owner 未亲读其评分/审查文件，也未重复审查；这是注明来源的 root 审查结论，不是 N-D/N-B/N-C 的独立行为票。J18 分母不是原 J05 的六项 readiness，也不是 14 用途或完整公平比较。

此前检查中，handoff validator、quality gates、agent-context 检查/生成视图检查及示例 bash 语法曾实际通过；示例仅做语法检查，没有执行项目写入。不同修复时点的字节和检查绑定保留在 u012-context-validation-package 中，不能拼成“所有旧测试在最终字节全部重跑”。本轮按授权没有重复已绿测试。最终字节的本地 scope/diff 检查与 root 通知的 J18 静态结论各保自身范围。

|证据|本 owner 的观察级别|可支持 / 不可支持|
|---|---|---|
|N-A 第一段|只从实际 handoff 及保存的原生返回记录获知原进程终态；亲读当前 A 产物、计数和旧 evidence 字节。未在原会话执行或查询旧句柄。|可确认现存记录与效果；不能冒称亲跑 N-A、全新模型恢复或原进程重新观测。|
|N-D|亲自完成全源聚合及第二次实际工具复算，本轮读回同 hash 产物。|支持指定三个必需来源经工具完整处理；不支持 >5K 模型 token 容量、所有原始记录进模型上下文或公平效率结论。|
|N-B|本 chat 亲自读 actual handoff/event/当前来源，执行获准的唯一 B 重试并沿原生句柄收终态，核结果/原失败/效果。|支持不同 chat 接续该实际任务、更新来源与单次重试、撤销时不生成 final；不支持自动宿主恢复、真实 compact/fresh、新模型或旧在途任务回退。|
|N-C|亲自读最新事件、核当前来源及所有必要证据，一次生成 final-report 和 finalization-evidence 并读回复核。|支持在后续解禁事件下完成原目标、保持失败及效果；不支持 B/S 胜负或整个模块验收。|

## 2. N-D / N-B / N-C 实际结果

N-D 的 [aggregate.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-native-behavior-ronsiujc/context/required-inputs/aggregate.json) SHA-256 `f08393077113f9d7791a16929f3d7bb17f69174ce3aed151b1216f59fe791ca2`。R1/R2/R3 各 300 条，数量分别 14645/14712/14682，quantity×unit_value 合计分别 391939/392644/394737；总计 900 条、44039、1179320。三源 hash 都匹配；version=1 是 manifest 声明绑定当前 SHA，CSV 没有独立版本字段。首遍 DictReader/Decimal，第二次真实工具以 csv.reader/integer 算法重算；这是作者复核，非独立判官。文件约 11K 字节/源不是模型 token，未测 token 总量或宿主容量边界；工具消费源数据不等于模型逐条阅读。

N-B 消费 [实际会话 handoff](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-handoff-20261003-094437-178abe12.md)，SHA-256 `8fb3d3f513866b2c80486755e8fc049d577c56a7d16ff94ce07b011bfdd8ae78`。N-B-E1 明确来源已变为 Approved v2/version2、items 不变；符合条件时 A 原结果继续接受，准许 B 重试一次，禁止重跑 A/改脚本，并撤销 finalization。当前 source/beta SHA 与事件一致；A version1 的结果字节和一次 alpha-applied-once 效果均不变。原 B exit23/BETA_SOURCE_NOT_ACCEPTED 及原辅助 TextEncoder 错误保留。

实际新调用为 `python3 beta.py`，首次 `yield_time_ms=250`，返回 session_id **53276**、chunk **684c7e**；随后同句柄 `write_stdin` 收取 chunk **0d32a0**、exit0、BETA_COMPLETED。B 当前 version2、items 匹配、total10；A total5，alpha-effects 一行、beta-attempts 两行。未因首次 yield 重派；旧句柄18948/63034只作为保存的已终结过程引用，不冒称在途。本 chat 当场核验 final-report 不存在并保存 [resume-evidence.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-native-behavior-ronsiujc/orchestration/resume-evidence.json)，SHA-256 `bfe2a79fbfdaf202d4221c2a3740b53aa58f72f8ab2775eb4096210affbc499d`。

N-C-E2 仅解除 finalization 撤销，新增生产步骤次数=0、仍不准改脚本。root 表示已收 N-B 终态并核实该时点 final 不存在；本 owner 在 N-B 及 N-C 写前也直接核了缺文件。N-C current title 为 Approved v2，A/B 两份结果及原记录 hash 均匹配，一次创建并读回 [final-report.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-native-behavior-ronsiujc/orchestration/final-report.json)，SHA-256 `461df782a1b6989aafab1d0ec23714548f6caf7e1603aff793d89b0f486a53e3`；[finalization-evidence.json](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-native-behavior-ronsiujc/orchestration/finalization-evidence.json) SHA-256 `6dd6fb0584075b02ba06d00271ae7de326f3933e7f08792f789ff567ba448a60`。证据连接 N-A 原失败、N-B 成功重试、当前来源、N-C 权限和最终结果；alpha=5/beta=10，无额外生产执行，原效果计数保持1/2。

题内总体现在 DONE，独立审查另由 root 完成，模块责任仍在。这里观察的是合同在限定桌面原生工具任务中的实际消费与自检，不是具有新系统隔离强制性的证明；撤销/解禁是测试控制输入，不能替代真实用户 Human Gate 测试。

## 3. 全部 14 用途：原生最小替代、增量与旧路径去向

H 指历史快照保留的 A=`u006-context-evidence.md`、M=`u006-current-use-evidence.md`、U002 原分母及 W20/R3/J05 来源链。本轮没有重读原24源或重新验证它们的所有历史结论。以下原生办法是供 root 比较的最小候选，不是宣称全部已在本轮执行或已替代框架。每行成本都明确保留未知；没有配对质量/成本时，不裁净收益。

|用途 / owner / 原来源|原生最小替代候选|当前框架增量|已证质量与成本|未证质量成本 / 验收缺口|迁移、回退风险及旧路径去向|
|---|---|---|---|---|---|
|**USE-01 项目与任务边界**；Context交叉，身份/routing主责；H A S01/S08、M01|固定 cwd/绝对输入输出路径，执行前人工核任务范围；项目选择仍问用户。|保可信 pin/事务/owner，NO_PIN 与项目 Workflow 分离，交接不授新权限。|N-B/C 实际仅写题内；本仓 HEAD/branch/status 只读核对。不是 pin 测试；差额成本 UNKNOWN。|真实 pin/child/切换/撤销与跨项目作用域未测，安全与总成本 UNKNOWN。|作用域误绑风险；保留身份 owner、合法绝对路径读和事务。旧 read-grants broker **固定禁用，不恢复**。|
|**USE-02 理解请求与方法选择**；routing主责，Context供目录；H A S04/S15、M02|使用宿主技能发现/选择入口并读精确 SKILL；不建立额外关键词分派器。|语义目录权威、发现与实际消费分开。|旧元数据/去重仅历史支持；本轮不测语义选路，质量增益和维护成本 UNKNOWN。|同义表达、完整目录消费及 native-only 对照未测。|关键词 canary 替代语义选择可能错路；保留 routing consumer，不用技能数或 hook 标签放行。|
|**USE-03 适量计划与批准**；routing/编排主责，Context保批准；H A S05/S23、M03|在当前会话写最小计划与精确 effect 范围，继承仍有效批准。|保五触发、计划不等于权限，交接携带当前批准及未决门。|N-B/C 未重新询问已授题内动作、未越撤销边界；非真实计划门测试，成本差额 UNKNOWN。|首次生产效果前的五触发、真实 Human Gate 和过度规划成本未测。|误把计划/派发当权限风险；保留既有门，不能加无必要确认或额外 Agent 触发。|
|**USE-04 standalone / 用户选定 workflow**；Context输入/handoff交叉，routing定模式、编排运行；H A S11/S13/S16/S17、M04|直接读已选技能输入和精确交接，简单任务在会话执行。|区分 standalone、已选项目 Workflow、显式 OS 会话交接与 NO_PIN；保输入 view 失效回退。|N-B/C 实际 OS 交接无项目状态/别名写入；模式隔离局部支持，成本 UNKNOWN。|真实 Workflow 正文/OD 全链、投影失效行为和效率未测。|误造项目节点或追 latest 风险；保留现有模式和领域 owner，fixture 不替代真实流程。|
|**USE-05 并行、强依赖与失败回收**；编排主责，Context供失败/GAP；H A S06/S23、W20/J05|保存实际进程句柄，按同句柄观察终态；成功且匹配后才消费。|交接保原失败、在途/未知和依赖；等待超时不重派，失败不省略。|N-B 一次获准重试成功且保 exit23，沿53276收终态；一新运行/一观察，无原生并行或Agent。净成本 UNKNOWN。|真实并行、取消/失观测、父子全账与重做成本未测；原 N-A 只记录两已终结进程。|重复副作用/缺片合并风险；保原编排限制和旧运行路径，不把共享屏障计为 Context 独有收益。|
|**USE-06 独立验收与真实完成**；编排/QG主责，Context供判据；H A S05/S13/S23|终态加产物自检，必要时由现有独立 reviewer 验原判据。|区分工具完成、题内完成、独立验收和整体 DONE，保原失败限制。|N-B/C 终态与本地结果通过；J18 静态4/4由root通知，非本owner判票。独立行为质量/差额成本 UNKNOWN。|本轮行为独立票、完整生命周期与公平对照仍缺。|将自检或静态票当整体验收风险；保非作者独立门，原 J05 FAIL 留历史，不自批模块完成。|
|**USE-07 来源与当前实例完整取证**；验证owner主账，Context内容/范围，编排派发；H A S06/S07/S20、R3/J05|hash 当前文件、核 manifest、保存当前工具原件并读回。|expected/observed、完整范围、实际读取和验收分开；拒绝旧引用代替现状。|N-D三源完整900条复算；N-B/C核当前source/scripts/results及原记录；版本声明绑SHA而非CSV自带版。成本差额 UNKNOWN。|全部原生调用覆盖、真实实例/清理账及跨来源正确性普遍结论未测。|hash一致不等于读/懂/验收；保完整范围、GAP和原测量owner，不用结构proof代替行为。|
|**USE-08 及时正确的信息**；Context主责，routing/编排consumer；H A S03/S14/S16/S17|按必要清单分批读 exact 来源，使用工具计算大数据，未知容量保缺口。|适用owner全文、index失效回完整manifest；5K单批建议不截断required总集。|最终四份实际消费，截断治理段补至EOF；N-D工具完整处理三源。并未测>5K模型token，读/维护差额 UNKNOWN。|长上下文容量、投影/回退全链、不同任务质量及成本未测。|删required或摘要替代owner风险；保现有index/view/fallback及full-read，不据旧19100输入全局删规则。|
|**USE-09 更正与恢复连续性**；Context主责，编排/routing交叉；H A S09/S23、W20/J05|精确OS临时handoff加当前来源/授权核对，再从首个未完点续。|保原目标、最新授权/更正、已完效果、失败、依赖与真实句柄；既有采用不盲重确认。|N-B实际不同chat读handoff，旧title变v2，A保留、B获准重试，N-C续原目标；跨chat局部质量已证，净成本 UNKNOWN。|真实native compact/fresh、自动恢复、旧在途状态迁移/回退与长期连续性仍 UNKNOWN。|旧权限/旧来源/重复副作用风险；保原checkpoint和当前核权。公开D06无撤销；N-B控制撤销不补成真实用户撤销测试。|
|**USE-10 授权下继续与必要停止**；三模块共同，身份/领域owner参与；H A S08/S24、M10/J05|沿明确有效授权执行，只暂停未决门或受失败影响的动作。|交接携带最新scope/owner/effect；失败后重试须现有合法授权，撤销阻断相应汇总。|N-B恰好一重试、禁final时缺文件，N-C后一次汇总；这是真实效果下的控制事件消费，非新用户授权。成本差额 UNKNOWN。|真实Human Gate、command读隔离、子任务继承与误拒绝频率未测。|一律停顿/无条件自动继续都可能错；保真实授权、必要停止和不受影响部分继续，不靠profile/readOnly推定。|
|**USE-11 真实模型与环境能力**；编排/F主责，Context保事实等级；H A S10/S12、U004/R3/J05|使用当前实际可用原生工具，记录真实返回，不推定模型/宿主等价。|分能力文档、可用入口、实际采用与任务收益，保私有binding边界和角色策略。|本轮exec_command/write_stdin实际可用；无新模型/Agent/probe。能力质量扩展及成本 UNKNOWN。|后端采用、CLI/桌面/Claude/API一致性和模型差额成本未测。|错模型/静默fallback/跨宿主外推风险；保原模型owner，Codex优先，Claude必要兼容，API分列。|
|**USE-12 临时事实与治理记忆**；Context/memory owner主责；H K8/CONTEXT/S21/S22、M12|精确临时笔记和只读事实检索；持久化需要原治理owner。|普通启动summary/search、默认不写、candidate→审查晋升和static fallback。|本轮临时证据可追踪且未写治理记忆；不证明长期记忆质量/成本。均 UNKNOWN。|真实后端、晋升/失败恢复、污染率和历史质量未测。|把临时event当稳定事实风险；保治理和fallback，不以case不持久化支持删除记忆。|
|**USE-13 精确消费已验收交付**；领域/验证owner主责，Context传精确引用；H A S24、M13/W20|核 exact artifact/hash 与适用验收，变化后回原gate。|完整已选上游、实际消费、gate/criteria与当前授权相连，禁latest/raw绕过。|N-C以当前title和准确A/B/result hash汇总并连原失败/恢复证据；fixture本地验收，生产证书与成本 UNKNOWN。|真实TAC/PREACCEPT/helper/consumer与变更重验整链未测。|错实例、漏required或门降级风险；所有未验证生产consumer保旧路径和原领域验收，不用fixture代票。|
|**USE-14 原样、复制、改进及领域方法**；领域主责，routing/编排衔接，Context传边界；H A S13/S24、M14|读取并执行用户已选领域方法与分支，不加通用方法改写。|仅保精确输入/原请求/最新采用/动效边界，框架控制不豁免领域要求。|本轮四文稿修改没有改领域方法；不等于分支视觉质量已证。方法质量及成本 UNKNOWN。|实际原样/复制/改进交付、D04 copy tokens、视觉/动效质量未测。|控制优化误删领域约束风险；保三分支、普通OD和原owner，审美不是Context主责，也不将整USE标N/A。|

## 4. 成本口径与过时结论更新

N-D 是一次指定全源任务和一次作者工具复算；N-B 只新启动一个 B 进程并观察同句柄，N-C 没有生产步骤重跑。实际输入/效果/失败及输出都有版本证据；工具返回的等待秒数、脚本sleep或文件字节都不当作模型 token、总费用或任务总时长。当前助手总 token、金额、隐藏开销、维护频率、人类等待及 native-only 同质量差额均 UNKNOWN。准备、返修、root协调、失败与旧探针成本没有归零；没有因报告更新重新开始资源账。

先前六项离线检查、W38/W40/W41文稿和consumer修复、两次准备错误及后次纠正都是已有建设/验证成本。解析前 f-string SyntaxError 没有文件效果；将fenced bash注释误计标题的检查误报已纠正，原记录保留。N-A TextEncoder辅助失败来自交接/保存记录，不能改成亲跑事实。没有公平旧版/原生最小替代对照，也没有通用收益因果证据，四规则的适用价值目前只能陈述为明确定义的连续性约束和这些局部结果。

|旧结论|当前应使用的状态|
|---|---|
|J05 FAIL1/6 是“当前”整体结论|J05是其时点真实独立失败，永不抹去；当前四文稿有root通知J18静态4/4及本owner限定行为证据，分母/入口/范围不同，不互相替票。|
|R3七文件hash、行号和两项driver缺陷描述是现版本|R3及J05源码定位只保历史。本次不重读/改公共driver或评分资料，未独立核最新driver版本；既不能继续称两缺陷现在必然仍在，也不能因J18/N-C宣称正式driver资格全闭合。由root/公共owner提供当前闭合证据。|
|“无实施、无可放行变更”，只能留建议|四份限定正文修复已实现并由root采纳，当前candidate已实际消费；这不自动授权生产切换，也不放行未测试的真实项目/在途/领域consumer迁移。|
|旧准备池余额、20/40分钟、40/80动作及摘要长度是当前停止条件|旧数值仍是历史成本/时点，不是已取消的人为停止限制。已有真实宿主、授权及probe边界仍有效；本次无新增probe，不更新或推测共享总账。|
|正式开发/隐藏比较“0”可直接写成当前全局数|旧0是当时记录；本chat本轮没有新模型/正式比较。未读共享总账，不猜其他owner最新计数，质量成本比较仍未得到可裁胜的证据。|

### 历史成本摘录（只保原时点，不作为当前预算或新版总账）

下列原文逐字来自旧报告第4节；其中“本次/当前/共享池”等词只指旧报告时点。旧上限、旧余额和旧资格状态不覆盖当前有效授权；新证据与成本见本节上文及实际产物。完整旧source身份/读取记录另保在历史快照。

## 4. 已发生的成本与归因限制

|已发生事项|有数值的证据|口径及未知|
|---|---|---|
|原 Context 审计 W05|1200.3 秒（约 20.005 分钟）；42 底层调用（含 2 Git）、32 functions 包装，74 保守动作；24 授权源、13 输入身份对象。|一次性审计成本，不是候选条件运行成本；源码范围不等于 24 个独立机制。真实 token/金额 UNKNOWN。|
|跨模块准备与协调|M 记录三 A 约 19.42/19.19/20.005 分钟、54/70/74 保守工具消息；D 可见 input+output 106804，另有重连耗时。|口径及任务不同，不相加成被测系统成本或质量样本；协调返工、root 汇总和完整模型费用 UNKNOWN。|
|Context 集成 W20|原报告约 60 工具动作及 7 native RPC，18:49:22 UTC 起至约 19:05 后落盘；最终模块检查约 17.7756 秒。|近似记录保持近似；fake engine/真实模块测试不是模型任务净收益。先前错误快照断言造成 5/5 初始失败并修正，属于评估建设返工，保留历史。|
|root 集成修正|R3 有明确 diff 与三组单测结果，上节列耗时；UA/去重由 root 完成。|不能归原 owner 的独立完成；额外 root 建设/协调时间、token、金额 UNKNOWN，不能因此视为免费或绕过准备池。|
|P03/P04|分别 4.134/4.798 秒；thread/start sandbox helper exit71，execvp `/Users/luca/.local/bin/codex` 不被允许；均 0 thread、0 turn、0 工具，usage null。|启动失败是实际成本；usage null 不等于已知零计费。|
|P05 单次探针|134.591 秒；1 thread/1 turn，5 动态工具、0 commandExecution；结束于 work_ready，无任务 artifact。首次 input **19100**；累计 usage total 依次 19236、39043、**59541**；最终 input 59306、output 235、cached input 38528。|19100 不是累计59541；cached 已包含于 input，不再相加。第三次上报才越 40k，非硬实时抢占。4 次 willRetry 重连的隐藏重试成本 UNKNOWN。仅该 fixture/入口的一次观察，不推广为所有简单任务成本。|
|P05 终止与资格|实际 interrupt 请求/响应及 interrupted，SIGTERM 成功、SIGKILL ESRCH、transport exit0、unfinished turns=[]；launch exit1、INVALID_RUN。|transport exit0 不等于有效 trial。单线程终止不证明所有子任务/工具清理；无 child，不能证明 usage 不重叠、父子全账完整。|
|共享池与本次|J05 时准备20/20、建议复核5/32、行为5/144、能力5/6、正式开发/隐藏0；余建议27、行为139、能力1。N03 本次为建议池1调用、0行为 run。|这是 J05 时点，不声称其他并发建议结束后的总账。保留8次控制/迁移/终版复核额度，不解锁、不扩预算、不盲用 P06。|

P05 conditions 身份并非当前 R3 conditions：R3 后续 B/S 技能去重不能把先前 T 探针变成当前七文件的整体验证。P05 入口实际启动了 node_repl/context7/pencil/cua_repl/shadcn 等 MCP；driver 只关 apps/web，继承了其他环境。对称排除未授权外部 MCP 可能有方法学意义，但现有证据没有有效配置证明、19100 输入的归因拆分或简单任务完成证据，本文不以它提出配置修改、P06 或新设计。

原 Context 静态复杂度为 17 个条件配置项、13 类字段、3 类投影（条件 index、选中输入 view、static fallback）、inline 6 条事实、6 种内容接口、检查点5类信息；expected7/observed10 是字段而非17次动作。不能把17×13计为221项义务，也不将 root K1–K10 共享合同算成10个 Context 独立功能。来源—投影—consumer—测试带来维护触点，陈旧投影、分类错误、过早交接及恢复旧权限是合理失败假设，实际发生频率和代价 UNKNOWN。

新增失败面已包括材料闭包不足、别名重复、UA 误判、权限对象缺失绕过、engine invalid 丢失、usage 上报滞后/重连不透明，以及把结构通过误认行为真实。这些主要是评估设施与入口问题，既不能当作 I 的原有运行成本，也不能抹去已经付出的评估建设成本。真实维护频率、用户等待/提问、返工、原框架运行总成本、同质量总成本和长期净收益均 UNKNOWN；不估价格、年化、用户比例。


## 5. U011 建议、U012 风险与剩余验收缺口

供 root 形成统一结论的建议：保留当前四份修复及既有用途/owner边界，将其陈述为已实现且经限定任务消费的连续性合同；净收益未证。原生工具、精确临时笔记和人工scope检查也可能完成相同局部任务，本轮没有比较它们的质量/总成本。不要用字数缩减、J18、N-D/C成功或旧J05失败单独裁定整个框架价值；不新造broker、签名服务、通用scheduler或平台分叉。

|拟涉及的风险组|当前可用证据|迁移/回退及验收缺口 / 当前去向|
|---|---|---|
|当前四文稿及consumer协同|最终冻结SHA、root采纳/J18通知，本ownerN-D/B/C实际消费，旧报告快照完整。|这是当前限定正文交付证据，不是代码/生产回退实测。root管理集成和最终冻结；原owner继续发现修复及复验，不擅自改其他owner。|
|会话交接、授权和已完成效果|actual handoff、来源v1→v2、原B失败、单次获准重试、final撤销/解禁、效果1/2全部相连。|没有真实旧在途任务迁移或失败后回旧执行路径的证据；旧两个句柄均已终结。真实在途状态、失观测/无法中断、目标失败回退及原批准保留继续UNKNOWN，不宣告U012该组通过。|
|项目、Workflow和共享显示别名|NO_PIN无项目handoff/state/别名写入；当前repo只读HEAD/branch/status已有记录。|真实pin/child/跨项目切换、旧Workflow checkpoint及普通节点恢复未测。保身份、项目transaction及原Workflow路径；不从临时题推定项目隔离或恢复通过。|
|条件信息、必需上游与容量|四规则完整消费、N-D三源全处理和当前hash、截断补齐实际记录。|没有>5K模型token容量、index/view失效全链或全部生产上游consumer证据。保required集和既有fallback；真实容量/权限缺口保GAP并暂停对应依赖，不能为减成本静默少读。|
|独立验收与公平比较|root报告J18静态通过，本owner亲测题内完成并保历史失败。|本轮行为独立审查由root安排，当前未拿作者自检替代；B/T/S/I同质量同权限比较、双向反驳及统一裁决仍无足够当前证据，不挪用旧计数。|
|记忆、模型与领域交付|本轮没有改领域方法/记忆/私有binding或生产consumer。|旧状态回退、长期记忆、模型采用、TAC/视觉/动效及Claude/API能力收益均沿原owner。未测范围留旧，旧broker仍禁用。|

U011 尚需 root 合并三owner的共同14用途、重叠成本和独立审查；U012 尚需其实际风险组的合法当前证据，尤其真实旧在途状态与旧路径回退。本报告不新增总计划、实验预算或批准层，也不自动发布、commit/push。整体实现/测试/返修、终版复验与联合验收责任持续，题内和报告完成都不终止它。

## 6. 本次读取、验证与交付边界

本次亲读旧报告并按原SHA保存完整历史；亲读event-nc及N-C所需current source/scripts/results/effect logs、N-A已保存证据和N-B resume证据；本轮再次读回N-D aggregate的既定SHA及final四文稿hash。N-B实际handoff/event读取见8b6e61，当前材料c7dec1，候选manifest/related contracts69ac00，聚合截断的治理缺口由dcda44补至EOF；preflight b3d68b，当前post-check fd1699；B实际initial684c7e/terminal0d32a0，resume写/readback4bff7f。N-C事件947d21、旧报告986555、final写/readback8d606b、N-D/final hash a26352、历史快照40d633。引用或历史结果没有写成当场重跑。

J18仅采用root通知，未亲读评分；J05/R3/U004和原24源的旧source身份/读取结果保留在快照，并未声称本轮重审。原会话对话、case-draft、private/archive、global和评分没有读取；所有当前临时题内容写仅在该题根，报告写仅此文件及明确获准历史快照。没有重复绿色suite、无新Agent/模型/probe/网络，无生产/其他owner文件写、无Git写。报告最终核查只检当前证据绑定、14用途/旧路径完整和历史保留，不是独立验收。

<!-- FILE_END: u011-context-evidence-limits.md -->
