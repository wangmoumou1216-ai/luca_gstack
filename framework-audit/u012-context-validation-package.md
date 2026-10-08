# W41 Context 实际验证准备包

DONE_WITH_CONCERNS / WAIT_ROOT_FINAL_BINDINGS：已准备原D06与W38精确字节、14用途和真实入口参数。尚无模型运行、实际恢复/停止PASS或独立review；完整模块责任继续。root合最终三模块版本并登记运行后交回实际结果，本owner继续回修与集成，不在准备包处结束。

继承 [持续模块责任](/Users/luca/Desktop/luca_gstack/framework-audit/u012-continuous-module-ownership.md) 的完整共同背景（JSON逐字保留）：一个通用框架，评估按共同用途组织；区分模型/环境能力与框架机制的贡献；Codex桌面/CLI优先，Claude仅必要兼容检查，API单列；不拆平台方案、不降到最弱能力、不拓展领域方法；以证据核收益/成本，所有未验证控制继续保留。当前focus不替代端到端原目标。

## 原字节与冻结输入

[配套JSON](/Users/luca/Desktop/luca_gstack/framework-audit/u012-context-validation-package.json) SHA256 `36c2594ecc5bcfa84dbb7744d352b1a5d4fbd986234ad1928c63adf51d7a644c`。OS临时绑定目录：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w41-context-rgsc2g8l`。仅复制当前公共manifest/developer-cases/README/coverage与自有authority/允许的代码快照；未读private、archives或冻结历史内容，未改公共题或生产源码。manifest的隐藏路径条目只是元数据，未解引用。

- long-session：`70e51b16461ab14ba55cb06af7db19c733c845cda6c50fb5342a0dc9120c4181`。
- handoff：`c4ad4c5009e73b04625afbeb00a524df5be15341cfa8eba7fd91d2f4501e0a0d`。
- 原公共developer-cases：`8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c`。运行用其逐字副本，D06选择器与材料摘要已核；D06独立canonical对象摘要及算法在JSON，不能冒充原文件自带摘要。
- 原公共manifest：`231746d52c4fd4735d7fe2da73539f293481c2129ae14345feb97735c0b96ca2`。4个白名单文件及材料摘要核对通过，14用途未减。

原D06固定链：request_delivered→inputs_delivered→work_ready（真实checkpoint提交）→checkpoint_accepted（旧context中断）→resume_start（E1更正、E2漂移事实，先送达/确认）→decision_resolved（E3当前用户选择）→before_final_submission。复用已有case-protocol:298–332、434–449及driver:660–723；未重放已通过协议，也未新增恢复协议、事件或输出字段。请求、授权、可见owner/output合同与最终语义判据保持原样；这份观察包不投给候选。

## 可观察行为与14用途

每行均是待实测的局部D06观察，既有coverage未证实范围在JSON完整保留；不是PASS表。

| 用途 | 目的 | 实际观察 |
|---|---|---|
| USE-01 | 任务和项目作用域 | 全链case_read/case_write与native实际访问日志均在当前投放/授权内；不要由模型自报替代边界证明。 |
| USE-02 | 显式选择及自然请求 | initial_message与resume_message保留同一原request；模型交付原workflow所需全部合法产物，不把checkpoint当任务终点。 |
| USE-03 | 复杂度与授权边界 | 延续已授权本地工作；只等待题内必要事件，不因重任务或新上下文自造批准。 |
| USE-04 | 单技能和用户选定流程 | 真实读取投放owner-method/output-contract，完成既定normalize→design→handoff关系；不替换领域方法。 |
| USE-05 | 依赖、分工、回收与合并 | 新设计仅消费当前已验收源及已送达人类选择；D06无dependency_result失败，失败传播仍缺实测。 |
| USE-06 | 真实完成与失败 | 原目标终态与实际产物、completed_artifacts、pending和工具结果一致；driver COMPLETED不是质量或必要控制PASS。 |
| USE-07 | 证据对象和复查 | 使用真实read/write receipt及其SHA/返回范围；输出中的引用不能证明实际读/验证，transport与semantic消费unknown仍保留。 |
| USE-08 | 必要信息正确可消费 | 检查实际checkpoint/flow/handoff字段及跨产物关系，由原冻结schema与语义关系评分；不新增输出字段要求。 |
| USE-09 | 最新更正与恢复 | native确认旧turn中断、另起不同root/thread family；resume E1/E2先送达并确认，再以当前源更正后工作，历史checkpoint仍保留。 |
| USE-10 | 正确继续和正确停止 | E3前不越过未决dependent action，E3后在原授权内完成合法产物；本D06没有撤销停止分支。 |
| USE-11 | 真实模型与能力 | 用实际app-server/thread/turn响应核模型/effort/宿主权限；没有证据不宣称CLI与桌面/Claude/API等价。 |
| USE-12 | 临时事实不擅自永久化 | E1 case-only更正不变成长期偏好；实际文件/native日志核无持久memory写入。 |
| USE-13 | 准确消费已验收产物与漂移 | 实际读取当前accepted文件并绑定SHA；拒绝把未验收copy版本标签当事实；历史与最终摘要分别保留。 |
| USE-14 | 领域方法和既定设计 | 遵守投放owner与真实已送达用户选择，等价措辞可接受；不凭词汇表造额外审批或替换领域判据。 |

关键区分：模型若尝试重写封存checkpoint，即使runtime拒绝、最终字节不变，也不能宣称模型避免了重复效果；记录请求、拒绝和后续真实行为。driver COMPLETED只表协议/运输完成，不是领域质量或必要控制通过。实际读receipt、返回范围、验证产物和引用须分开；读回字节不证明语义消费。

## 最小真实入口及待绑定

入口是实际存在的 `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/driver.mjs`，SHA `9a704cd1a8076d3b061668481b83a99a398f88880bd18b1f41b32c00efb1028a`。原CLI只接六参数：--manifest、--cases、--case、--condition、--trial、--out。JSON已给真实cases副本、D06、trial=1和真实空OS输出目录；manifest与condition为null，`runnable_now=false`，没有伪造READY/REGISTERED或可运行命令。

root须补最终三模块source root/manifest及hash、既有条件B/T/S/I及其完整material hash、真实READY release、run/stage/trial/pool登记、原模型/effort/预算，以及conditions/native observer和有效native权限绑定。最终tracked_sources应包含上述两份精确Context字节；实际投放/读取证据才能说明规则被消费，路径存在本身不算。源代码快照是查证材料，不是可独立启动的driver目录；仍用原模块入口，不复制缺依赖的入口冒充可执行。

## 保留的必要缺口与续点

1. D06没有dependency_result；原公开D05虽有失败→一次retry→成功，却没有fresh。不得拼成新场景或把纯协议强制当模型保留失败证据；USE-05/06/09跨恢复失败仍未验证。
2. 公开D01–D06无revokes，D06仅正向E3。USE-09/10撤销后正确停止仍待原保管/盲评链按既有控制关系给合法覆盖，不能擅自降标准或读取私有题。
3. D06的JSON项目/领域workflow交接不等于显式会话handoff skill；focus参数裁剪、OS临时交付、脱敏及不自动消息没有被此题直接触发，不改请求硬测它们。

原W35 5/6失败报告及root后报修复/联合44/44分别保留为历史来源；W41没有重跑或将root通告冒充自验证，也不注入为D06新事实。

root运行后先核真实fresh中断/新thread家族与投放合法性，再由非作者先盲评产物、后看过程按原语义关系逐项判pass/fail/insufficient_evidence；完整14用途不被均分掩盖。真实结果回本owner定向修复，自有规则问题不交回用户催促。实际收益/桌面CLI等价/Claude/API与净价值仍待证据，不以此准备包宣布模块验收。

静态准备核对见JSON，未新增模型/probe/agent，未重复协议回放，未commit/push或修改他人文件；原20分钟/40动作的小批停点已由最新授权取消；前轮消耗累计未重置，当前耗时/动作上界见JSON，token/金额unknown。

## 同轮继续：直接消费者闭合

最新授权划入 handoff-protocol 与共享 office/SKILL.md 的 Step 2。已修最近上游/最新DONE取源、无条件PROPOSED及再确认、NO_PIN别名、必要源核验禁令，以及项目写入示例和手动checkpoint旧truth指针。Step 2 按精确选定依赖、真实gate/证据、最新授权更正与失败/在途/首个未完成点续接；其余office字节、领域方法、路由/输入/人类决策保持。

- .claude/skills/office/references/handoff-protocol.md：前像 `0bfca8ef44e21e38ad22686e00dcf1000d70b59a848927633307f6846f06efa6`，最终 `b4f169955b69afbea1c0b375a96e65e4698ca7190ead6a600846afd7c93041c1`；root采用状态 `PENDING_ROOT_ADOPTION`。
- .claude/skills/office/SKILL.md：前像 `57d758ab23b304b590fd771a201c69d6263eb93c554fdeb243c45ace3a088377`，最终 `72431cbfbc4e3c874165306eb6d8bb9ea9fd9c40f01b14d78cadff84a61d6ac9`；root采用状态 `PENDING_ROOT_ADOPTION`。

OS最后字节、完整diff与6项检查实际日志在JSON/preparation-index.json：handoff-validator正反例、NO_PIN quality-gates、agent-context、投影check、diff检查与bash -n均exit0；项目示例未执行，无case-protocol重复回放/模型/probe。未增固定header/table/schema，原格式、豁免、criteria与必要checkpoint保留。

两次包准备错误已留证：Python字符串解析失败未写文件；标题正则将bash注释误当Markdown标题，初版包与历史拷贝未改。已分别修复字符串和限定结构核验，真实文档/格式模板标题不变。没有把准备错误、原W35失败或root通告抹掉。

本owner可解决的四份生产规则和直接消费者已自审闭合；新消费者待root采用并绑定最终source manifest、release/registration与权限证据。真实D06、失败/撤销等缺口、非作者review与回修继续；这些真实跨模块/运行依赖不被静态PASS替代。

## 模块二最终消费核对（同一报告续更）

完整读回模块二七项原要求；将全部必需上游及适用eval、实际句柄/已知未知状态/超时不重派、授权来源范围/owner/未决真人门补入既有条目。未增格式、协议或候选输入，未改技能路由/人类决定/领域标准。七项逐项依据及精确最后字节在JSON，属于作者规则核对，模型仍NOT_RUN。

- .claude/skill-os/runtime/long-session.md：最后 `43d88566e323994b532e9cfbe7fafc52c25eca55fd843a02216bf26e701ae312`。
- .claude/skills/office/handoff/SKILL.md：最后 `3ba25ed25cdbbbe9c87699b41d5fbed1bd180336e59f2b27b08b91805621e002`。
- .claude/skills/office/references/handoff-protocol.md：最后 `cf55886449a7206c3d766e5645c0959b2d2b2b629e6f6a70b34f727b93f896c1`。
- .claude/skills/office/SKILL.md：最后 `7948febd24c470a4ed62cd79618e025d9e792dbf4f9cbfa2f526c191f0937da3`。

前述新增消费者的哈希为上一稳定版本，已逐字保存在history/pre-w40-requirements；本节四份最后字节覆盖旧交付，不抹历史。此前6项检查在上一稳定字节通过；本次仅正文要求补齐，脚本/格式/metadata保持，按root要求未重跑不受影响检查。最后diff-check exit0、标题/格式、frontmatter、office Step 2以外字节及原公共案例绑定核对通过。真实模型行为、独立review和root最后集成仍待回执。

## J16 阻断回修（同轮）

root传回独立J16的真实阻断：全量必需依赖读取与5K总硬帽冲突；三份各约2K的必需handoff即构成6K反例。已在新获准的紧邻预算规定修复：保留可选历史5条/2K硬限，5K仅为单批预加载节制建议；必需源用现有获权读取分批核验，保留来源/版本与实际读/验证状态，禁止删依赖/选最近摘要/替代必要原源。宿主真实容量不足仍保留缺口并暂停受影响依赖。没有新方法、协议、输出格式或候选答案。

office最后SHA：`942ee2387434c895932511efaa55fd03cb0800323f265d12b17f876fda1bd88c`；前三份最后SHA仍见上一节。其余office字节与标题核对不变，最后diff-check exit0；未重跑不受影响检查。J16原反例和修复前字节完整保留，作者仅完成反例读回，独立定向复核仍PENDING_ROOT，不能把改过文件称独立PASS。JSON已绑定最后四份字节，root应采用这版而不是上一稳定版。实际D06/覆盖缺口、登记和真实运行/复核回执继续由root统一交回。

<!-- FILE_END: u012-context-validation-package.md -->
