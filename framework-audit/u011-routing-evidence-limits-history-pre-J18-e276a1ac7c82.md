# U011 路由模块：已有证据、保留范围与未完成义务

**当前没有足够证据支持“本模块更有价值、更高效，或已更充分释放 Codex 桌面与 CLI 能力”。同样，没有证据把未测机制判为无价值。** 已取得的是部分能力事实、冻结材料构建和目录发现证据；没有合格 B 与对照的正式任务净收益比较。J05 真实 **FAIL 1/6**，正式 development/hidden 均未放行。

本稿为 N01，**ADVICE_ONLY / NO_IMPLEMENTATION / NO_MODEL_RUN**。作者是原路由 owner，不是独立 J；`DONE_WITH_CONCERNS` 仅描述这份建议交付。全生命周期目标仍是原三个 owner 落地、统一测试/review/验收及获准提交推送，没有缩成审计，也没有因本稿完成而完成。

## 1. 结论所依据的层次与当前版本

保持一个产品中性 Skill OS 的评估对象，以理解任务、组织执行、信息连续性和必要人类控制判断共同价值。Codex 桌面/CLI 优先，Claude 只保留必要兼容证据，API 表面分开；不新增三套平台方案或技能领域重构。用户已授权的生命周期和质量优先原则继续有效，但不绕过既有池及关键门。

| 证据层 | 当前已有事实 | 不能推出的结论 |
|---|---|---|
| 官方能力事实 | 已保存 F01/F02/F05/F06 的官方定向读证：技能描述发现、显隐式选择与按需正文、委派、线程控制、恢复/压缩、分层配置有对应文档或帮助表面。本轮只读冻结 F 报告，没有重新联网验证。 | 不等于该入口现已开放全部能力，不证明目录全部显示、语义选择正确或任务更有效率。 |
| 当前入口可见/可启动 | root-integration-r3 与 J05：B/S 的原生元数据各发现48个repo技能、48个不同名称、无重复/errors；J对96份SKILL副本核原字节。生产R记录11个project hooks disabled、5个user hooks enabled；补充5说明后者是通知器。P05有真实app-server线程及配置回显。 | 不等于B/S实际模型启动、所有owner执行、T/I完整技能可见性、hook控制生效、桌面所有入口/历史状态或命令权限已证。 |
| 真实局部行为 | 已存P02命令级沙箱拒绝/子进程继承；P05有5次dynamic调用、usage、interrupt与终态。W18历史版只读get_memory摘要成功且材料不变。 | P02不证明app-server或MCP；P05没有commandExecution及产物，不证明越界拒绝、完整任务或机制收益；只读摘要不证明持久治理。 |
| 任务净收益 | 正式开发0、隐藏0，无同题同trial达到质量目标且控制全过的配对。 | 质量、同质量资源、等待/返工、维护收益和更释放能力均UNKNOWN；不能选赢家、归零价值或做年化。 |

F08本地SDK/app-server、F09托管Agents API、F10应用内Agents SDK、F11 Responses各自前提保留，不能互借取消/状态/成本保证。F12 Claude仅已有文档/help兼容限制，无本次真实团队/恢复收益。桌面实际协作可见也不代CLI受控配对，更不以CLI单探针外推桌面净收益。

**当前集成身份**以 `/Users/luca/.codex/worktrees/f351/luca_gstack` 和 `u007-root-integration-r3.json` 七文件为准，本轮逐个只读hash匹配。8812作者工作树及W18报告是历史来源：旧conditions `33b1a3…`，当前为 `211c7d…`。当前修正由root完成并单列成本：native skill只复制祖先office子树，避免office及子owner重复发现；driver接受真实initialize client前缀同时保版本匹配。原失败保留，作者不认领root修正。

W18的867文件/367生成副本、22/22以及对应material hash只描述当时作者版，不能称当前集成版计数/整体验证。当前已有三次独立离线调用记录：conditions 18/18，driver 35/35，integration 10/10；未改case pair另有较早25项记录。不是本轮重跑，也不是新聚合全套或正式行为PASS。J05阅读并检查当前实现后仍不放行；root-integration-r3中“pending”的历史状态已由J05最终FAIL更新，原文件不覆写。

证据简称：**U2**=u002-baseline-and-protected-uses；**A**=u006-routing-use-evidence（S01—S23源身份和行号）；**M6**=u006-current-use-evidence；**W18**=u007-routing-material-closure-report；**R3**=u007-root-integration-r3；**J05**=独立审查md/envelope；**F**=u004-native-capability-facts；**P**=执行计划v4/路由包v3。全名、精确hash见末尾。

## 2. 全部14项保护用途的责任与去向

观察等级：D=已读合同声明，S=既有静态代码/测试观察，O=限定实际操作/元数据，U=任务效用或覆盖未知。下表的“保留”是**不实施变更**，不是将原控制自证为有效；没有用途获准退出。14为同一保护分母，不将模块交叉行相加成42个样本。

| use_id / 路由责任 | 原用途、源与当前证据 | 支持程度 | 当前决定、依赖与旧路径去向 |
|---|---|---|---|
| USE-01 / 交叉：路由入口；身份owner与Context主状态 | 任务/项目边界；AGENTS K1/K5、project-session，A S08/S20/S22及G04，M6 USE01；J05 J1/J2。 | D/S；P02仅命令边界O；真实pin/child/切换/撤销U。 | **保留现状**：继续可信pin/原生事件及正常受控绝对路径读，不从docs/cwd猜权，不启用已禁旧read-grants broker。依赖身份owner的原生关联与授权、Context最新状态、driver真实读边界；本次无替代。 |
| USE-02 / 主责；Context供发现信息 | 请求理解、明确方法、隐式选择与澄清；AGENTS K2/K4、routing-map/chain，A S14—16 G01/G02；F01、R3技能元数据、J05 J1。 | D/S；48技能发现O；实际显隐式选路/完整交付/误选纠正U。 | **价值不可判断，保留现状**：保原语义选择与显式意图；S三入口精简/T直接语义仅候选。需同事实可见性、应/不应触发、误选后果及完整资源证据，不以标签或出现名称判胜。 |
| USE-03 / 交叉：识别复杂度；编排管计划/批准，Context存范围 | 五真Plan触发与route九近似信号、direct planHint；AGENTS K3、plan-agent，A S05/S15 G01，M6 USE03。 | D/S；实际过升/漏升、首次效果前批准消费U。 | **保留现状**：真触发/批准/失败停止继续存在；不把九信号等同五条件，不为触发而增Agent。需编排执行与原批准范围、Context连续性证据；不能仅删启动读或移除Plan门。 |
| USE-04 / 主责选模式，交叉编排handoff/Context输入/领域owner | standalone与用户所选workflow；workflow-mode、office、AGENTS K2/K10，A S11/S13/S16；W18/R3缺workflow bodies。 | D/S；规则可达O，实际流程/领域端到端U。 | **保留现状**：技能默认standalone、已选workflow仍按原合法输入/交接；缺失/过期视图用原回退。依赖领域owner和真实可执行backend/输入，不能以复制runner替换流程。 |
| USE-05 / 另一owner主责：编排；路由只交目标/依赖需求 | 独立并行、强依赖有序；orchestrator §2.2/2.3、evidence-receipts，U2/M6；J05 J3限定fake transport证据。 | D/S/离线O；原生子Agent回收/取消及同预算收益U。 | **保留现状**：沿既有职责/依赖/结果回收，不从多命中推导可并行；编排负责终态与失败，路由不删除或扩充分工。新评估公共屏障不能算I独有价值。 |
| USE-06 / 另一owner主责：编排/QG；路由转交正确评审对象 | 独立验证/真实完成；plan-agent退出合同、quality-gate，A S05/S06/S19；J05原始非作者票及J3。 | D/S；J05独立审查实际存在O；候选任务质量U，新driver状态缺陷已静态确定。 | **保留现状**：不自造独立票，不把非零/缺片转成功；原验收路径保留。依赖driver传播engine INVALID、QG实际终版验收。J05不是root自己签票，本N01也非新独立验收。 |
| USE-07 / 交叉消费；验证owner/编排/Context主责 | 当前实例/来源/真实退出；evidence-receipts、project-verification，A S06/S07，J05 J2—4、R3。 | D/S，源hash与部分真实终态O；全命令/子线程/实际完整读取U。 | **保留现状**：原required分母、版本/实例绑定、原失败、cleanup后证据继续保留。证据validator/hash不是鉴真；由M绑定、J核原始效果与对象，路由不另造协议或把配置回显当功能证据。 |
| USE-08 / 交叉：路由消费；Context主责 | 及时足量规则/事实；AGENTS K10、context-index/manifest，A S03/S11/S15，M6、W18、J05 J1。 | D/S；材料复制/目录O；实际正文消费、干扰量/效率U。 | **有条件建议仅保留研究候选**：S按相关语义读owner可供未来评估资产；当前不切换。继续原完整读/适用owner/缺失回退。需Context实际供给/访问与任务后果，不能以少文件/目录发现替代。 |
| USE-09 / 交叉：路由提醒；Context与编排主完整恢复 | 更正/授权/证据连续；long-session及orchestrator恢复，A S09/S15 G03、M6 USE09、J05 J3。 | D/S与fake fresh O；真实compact、原生父子恢复、提醒收益U。 | **保留现状**：原检查点、最新有效事件及失败续点；reminder SATISFIED不作任务DONE。依赖Context有效状态/编排终态；公开D06不含撤销且不是真compact，不补造覆盖。 |
| USE-10 / 全模块交叉，各效果owner管权限 | 人类决定与合理继续/必要停止；AGENTS K6/K7、project-session，A S01/S08/S16、M6；J05 J2。 | D/S，命令级局部O；完整线程/工具授权控制U。 | **保留现状**：真实Human Gate、已授权范围继承、撤销优先，既不伪造选择也不一律停。依赖各效果边界及driver正式必需权限门；不能凭普通readOnly或一次P02切换权限机制。 |
| USE-11 / 另一owner主责：编排/F；路由仅消费能力限制 | 实际模型与能力；model-routing/cross-harness，A S10/S12/S21 G05，F、J05 J2/J4。 | D/S；P05配置和线程O；服务端采用、父子完整账/隐藏重试U。 | **保留现状**：不将capabilities=true当可用，不偷偷降档或混模型收益。依赖编排真实派发与证据，私有binding未读；用户回执豁免不等于已证采用，不以该单缺口额外阻断。 |
| USE-12 / 另一owner主责：Context/memory；路由不管晋升 | 稳定事实与临时信息；AGENTS K8/CONTEXT/extraction-bar，A S01/S02、M6，W18。 | D/S；W18旧版89事实只读摘要O；持久治理/冲突/恢复U。 | **保留现状**：summary/search、默认不存、候选晋升门及inline fallback；新增代码副本不授权治理写或复制私人历史。依赖记忆owner合法状态与控制验证，不能删长期记忆保护。 |
| USE-13 / 全模块交叉；prototype领域owner主交付身份 | 准确消费已验收交付；prototype-delivery、exact final链，A S18/S19 G06，M6 USE13。 | D/S/局部identity测试结构；真实consumer/PREACCEPT/独立final链U。 | **保留现状**：精确accepted ref/hash/required IDs、保原失败与重验；不以latest/raw替final。依赖领域验收及编排/Context转交，D06通用hash不能代真实证书消费。 |
| USE-14 / 交叉选分支；领域owner管方法，编排衔接 | 原样/复制/改进；prototype caller branches、motion routing，A S14/S16/S18/S19、M6。 | D/S；真实三分支/OD/motion质量U。 | **保留现状**：adequate-original/adequate-copy/enhanced-copy及各自授权继续有效；不擅改设计/平台、技能内部不重构。D04完整copy tokens仍必交，不能用不完整示例减项；依赖领域owner实际消费。 |

上述“保留旧路径”保留用户当前实际配置及既有控制合同，不把停用hook/broker重新启用。其他owner主责不等于用途从本模块总账消失；路由仍保相应输入、限制和失败转交义务。

## 3. 路由核心问题与原生最小替代的处置

| 问题 | 已有观察与最小替代 | 当前判断 |
|---|---|---|
| 任务理解/正确方法 | A G01/G02指出词权重候选、MULTI先问与完整语义不是同一层。最小替代是原生读完整请求、相关owner与事实，明确缺口才澄清。 | 静态张力不是已复现误选；无请求→首次动作→下游结果配对。保留原路径，不把T或S判更优。 |
| 项目边界 | 原生文件权限可提供部分命令隔离，但不自动提供可信pin/child lineage/授权撤销。 | P02局部拒绝不能替代项目语义控制；正常授权绝对路径与禁用broker须同时保留。 |
| 显式技能选择 | 用户点名技能可直接读其owner，S候选减少重复catalog发现；原生文档也支持显式调用。 | 仍须真实Plan和权限检查。尚无正确消费/返工/等待改善证据，不放行S此变更。 |
| 隐式技能选择 | 原生描述匹配/按需正文可能承担最小选择；当前48项发现只是可见性。 | 尚不能区分不可见、不可调用、未选、选后失败；T/I完整原生技能表面也未证。不能按调用多寡定价值。 |
| Plan升级/澄清 | 原生能力可按真实复杂度顺序执行或在获准时委派；不必每次采用固定五步。但真实批准/依赖/不可逆控制仍必要。 | 九近似信号与五合同条件的效用未配对；Plan少一次或问题少一次不自动更好。原Human Gate不作消融。 |
| 领域交付/原生能力释放 | 领域方法与必要资料各条件应同等保有，本地计算、文件、自检和授权协作不人为剥掉。 | 共享ack/写屏障/checkpoint本身有帮助，不能算I独有；关闭全部原生工具会弱化T。无净增益证据。 |

原四组双向解释仍UNRESOLVED：旧规则保护或可更薄；协作提升或协调抵消；Context必要或造成干扰；架构原则不适应或只是实现/配置/接线错。当前确定的是评估工具与入口的具体问题，不足以否定任一原原则。

## 4. 可复用资产、失败与归因

**可复用资产。** 冻结来源与独占目标构建、源字节校验、禁止清单外依赖/逃逸、S三处可审差异、T/I最薄提示、材料身份摘要和离线保护性反例；当前root去重保子树布局且48技能发现无重名。它们改善评估可复核性，是后续工程资产，不是生产切换包或路由净值证据。W14路径局部化proposal仍仅review-only，不取得hook激活效力。

**未完成和失败不可并入原框架缺陷：**

1. **新评估driver权限必需性缺陷，J05 J2 FAIL。** `driver.mjs:87–89,182–184,532/561,635–636` 允许省略native_command_permissions，正式READY可能退普通readOnly而顶层COMPLETED。读取隔离未证，评估公平性被破坏。修复责任是原driver owner/M的已有U007范围，J独立核；不是route-guard的已证越权。
2. **新评估driver无效状态传播缺陷，J05 J3 FAIL。** engine在I/O故障置INVALID_RUN，driver:589–590/finally未上提，正常模型终态可能掩盖基础设施失败。这是确定静态路径，J未跑反例；本轮也不跑。责任为driver顶层消费者，Context owner保持engine语义、提供联测接缝；不得把它记候选语义失败或归于原框架完成合同。
3. **当前实例与方法未就绪，J1/J2/J4。** P03/P04 thread/start被符号链接可执行文件权限拒绝，均0 thread/turn；P05虽配置匹配并启动线程，只有5次dynamic调用、0命令、无产物，停在work_ready。40k累计观测上限触发，结论INVALID_RUN。父子真实停止/全账、effective命令权限、B/S实际启动与完整owner消费均未取得。
4. **token与共同设施问题待归因。** P05首次input19,100；三次累计total19,236→39,043→59,541，最终input59,306/output235/cache38,528，缓存没有重复加。不能将59,541说成初始prompt，也不能扣掉共同协议成本。5次工具、134.591秒和4条willRetry重连保留；传输exit0不是试次通过，launch exit1及interrupt/真实interrupted终态保存。P05没有子Agent，不能推广后代清理；单例也不证明所有简单任务都超限。
5. **局部构建和集成失败保留。** W18首次21/22是源快照helper拒绝fixture合法链接，修后22/22不抹原失败；原作者复制office与子owner造成技能重复，root已有去重修正。后者是新材料构建实现缺陷，不是原生技能发现本身无用。root离线conditions此前dced88失败及后续18/18留在R3回执，不称本作者本轮修复。
6. **原机制的A G01—G06仍是风险/竞争解释。** direct planHint、MULTI强问、recommendedSkills提醒、旧broker文字/可用性、capabilities常量、局部测试被扩大等尚无真实净值归因；不可从评估建设失败跳到整层删除。

J05 proof消费者只做结构与精确声明绑定，不解释行为checks/J证据正文；真实放行仍必须M冻结、J核原始对象/命令/退出，不能把validator通过洗成实测。补充5的访问边界与实际读取计量继续分开：UNKNOWN_NATIVE_READ_SCOPE不能伪装完整消费；边界未证也不能作为可比较运行。

## 5. 一次性成本与尚无证据的收益

| 成本/维护单元 | 已发生或静态可见量 | 限制/归属 |
|---|---|---|
| 全局工作池（J05后、此次派发前快照） | 准备20/20；review5/32，余27；行为5/144、探针5/6；正式开发/隐藏0。 | N01另计建议池1次，由M唯一更新；其他同时在途调用本稿不估余额。行为139余额不解除准备池或J门；8预留不能任用。 |
| 原路由A | 19.42分钟，28 exec +26 wrapper，保守54动作；0行为。 | 来源A附录D，token/金额UNKNOWN，不算被测条件开销。三A不同口径不加成样本。 |
| W18材料建设 | 703.28秒是首次清单时钟至报告，另有前三批读取；保守≤40底层调用；0行为。历史新增22原件、367生成副本。 | 一次性构建/测试/复制成本；完整token/金额UNKNOWN。历史重复副本及当前root去重需分版本，不能当运行提速。 |
| root集成与非作者审查 | 两项root修正及三次分立测试记录；J05可核时段247秒，首读在时钟前，保守39工具/命令动作。 | root全部时间/token/金额UNKNOWN；J05报告原始工具输出约120k（含截断重复），不是精确可见/计费token。本N01不重跑。 |
| P05实际尝试 | 1 thread/turn，5工具，134.591秒，累计59,541 token，产物0，INVALID。 | 评估试件成本；T且使用旧conditions身份，不是当前七文件整体验证。重连/金额未知，不能独归路由/MCP。 |
| 原框架维护结构 | 62具名登记（非62可用技能）、9近似信号/阈值6、5junction、1提醒生命周期；5真Plan条件归批准合同。 | A静态单位，按owner去重；不相加成复杂度分，不当实际调用频次。 |
| 候选维护与新失败面 | 来源清单/必需闭包、import检查、alias复制、条件patch、权限声明绑定、协议状态、版本回执；已观察缺源、重复发现、入口权限、状态传播和预算失败。 | 有建设触点/失败证据；日常维护频率与费用UNKNOWN。不建议把评估冻结/盲评/ack常驻日常简单任务。 |
| 实际运行/用户负担/收益 | 额外选择与澄清次数、必要/多余交接、日常返工/等待、同质量资源差、长期维护和迁移资源均UNKNOWN。 | 不以文件变少、hash稳定、测试数、账户百分比换收益；不编价格、年化或三个入口使用比例。 |

## 6. 当前不推荐切换的范围与剩余生命周期义务

不放行 B/T/S/I 正式比较，不将S三入口改动或I记录机制应用为生产路由；不删除/重排生产Project Gate、Plan/Human Gate、技能输入/领域验收、实例读证、模型控制、长期记忆或恢复链；不为比较启用停用的project hooks，不恢复旧broker，不用局部CLI结果替换跨宿主保护。保留源框架、当前配置、用户工作及旧路径。

**迁移、回退与新生产实施包：当前无可放行变更，N/A仅限暂留现状的决定。** 没有状态/职责/接口切换，故无需强造此次迁移实验；不产生三份空实施包，不宣称G-P6切换范围已验、项目已落地或所有原用途有效性已证。若未来有获准具体变更，迁移/拒绝切换/回退/在途恢复证据仍是原义务。

| 原义务/依赖 | 尚欠内容 | 既有责任与当前状态 |
|---|---|---|
| U007可信比较入口 | J2权限对象缺省拒绝、J3 engine无效状态上提及其原失败回归；真实命令/子线程权限边界；完整B和T/I同等原生能力范围。 | driver owner主实现，Context owner核错误/状态接口，routing owner核材料/用途；M集成、J独立验。**阻断，准备池已满；N01不授权修复。** |
| U007方法/资源可行性 | 简单任务在既定预算内能到实质成果，共同设施成本完整，失败/取消与遥测可核。 | M/原编排与Context owner/E-run/J。P05否定当前已就绪，不支持直接调高上限、改heavy或花P06盲试。超池增量须按既有规则处理，本稿不设计新增预算。 |
| U008开发/隐藏及A回顾 | 原固定资料/权限/任务质量、同trial配对与成本、原分母失败、层级覆盖；更正/恢复与实际交付。 | M按原门释放，K保管、E-run执行、J评分，三个owner共用证据。正式两阶段均0；不能用离线/元数据补成绩。 |
| U009/U010反证与终版 | 四组竞争解释、归因分离、争议裁决、受影响控制及修复终版复验。 | R/J非作者，M组织；没有收益数据，不虚构已完成终版裁决。 |
| U011/U012用途及可实施交接 | 三模块有据建议合并、非作者审查；对任何拟变更逐USE给去向，既有消费者/在途样本、正常/拒绝切换/回退矩阵和证据。 | N01只交本模块证据限制；M唯一合并，领域/Context/编排各守责任，J验。当前仅有据暂留，不形成新生产三包。 |
| 原最终实施目标 | 具体获准三包、公共接口唯一owner、三工作区实施、跨模块回归/独立验收、整体diff及失败披露、可追溯统一提交与已有授权范围内推送。 | 原三个owner实施、M统一集成/提交推送、J非作者验收。**尚未完成**；评估原型存在不代生产改造，N01不commit/push。 |

准备池不足与J05失败是当前停止依赖其证据的替换的理由；一般生命周期授权没有消失，但本建议调用不能换名为建设、无限root代写或暗加预算。主协调可依据已有证据形成保留现状的有界结论，再由非作者审查，不把剩余实验额度当继续开跑的充分理由。

## 7. 本次实际读取、版本及资源

首读任务回执76eaaf先于时钟；首读前精确时间UNKNOWN。首读后时钟 epoch 1790970570.242629（Asia/Shanghai显示见记录），定向读取结束1790970689.971852。完整阅读主计划v4、模块包v3、任务、J05 md/envelope、R3、U2用途、原A/M6、W18；共同合同/补充5为本会话已全文读的未变hash复用。另全文读R3明确引用的root修正diff、A明确引用的F能力事实。未重开网页或重跑任何试验。

首次三路批量输出发生聚合显示截断（d0b876/747197及同批包读取）；不把该聚合当完整读证。以9c71f4/c02a76/e43524补全主计划1—386；d1ae7b/258f95/a159fa补全模块包1—330；ef3174/e1cfde/295467补全A1—327；a159fa完整M6；295467完整W18；J05/R3在f2c33b完整，envelope/U2在d0b876可见完整段；6660a0完整diff/F。b2f1c0仅是身份核对，不冒充七文件全文审查；当前代码缺陷引用J05原独立票，不冒称本作者重新运行或独立发现。

保守按functions封装与底层exec分别计，本稿写入及末次机械核对完成预计不超过44次工具/命令动作；多文件读实际范围如上，不用批量包装伪装为少读。模型/行为run、探针、测试、网络、额外Agent/线程、对外消息、代码修改、全局配置、commit/push均0。只写本文件；原源/用户工作不动。完整可观察或计费token未知，不以工具original_token_count折算，不能保证精确余额；不追加无必要调查。45分钟/90动作范围内结束，精确可核下界耗时附在末尾。

### 输入版本指纹

- [u011-routing-evidence-limits-task.md](/Users/luca/Desktop/luca_gstack/framework-audit/u011-routing-evidence-limits-task.md)：`0925c60d96bfe47ca3b42839c22f2584de4d950f4a88c1a5858cd96861cbc864`
- [2026-10-02-tri-system-evaluation-execution-plan-v4.md](/Users/luca/Desktop/luca_gstack/framework-audit/2026-10-02-tri-system-evaluation-execution-plan-v4.md)：`f5cec5181287b1e5ed2549a42f92dd082c9744841da09e5b530406f5744fbc67`
- [2026-10-02-tri-system-p2-routing-execution-pack-v3.md](/Users/luca/Desktop/luca_gstack/framework-audit/2026-10-02-tri-system-p2-routing-execution-pack-v3.md)：`6f136e47ea17bf82e34d2293dddcdd6fdf8047cb45e62a799e11e1e411be63fb`
- [u007-readiness-review-r1.md](/Users/luca/Desktop/luca_gstack/framework-audit/u007-readiness-review-r1.md)：`26e9ee62add8d3d9d2c2541957ad15c5e8b6cb9bd17913596a8553691dfba718`
- [u007-readiness-review-r1-envelope.json](/Users/luca/Desktop/luca_gstack/framework-audit/u007-readiness-review-r1-envelope.json)：`eead50f06b542d0bf58c0b309907923b06659adfd6ea54d443b63281e5b468d7`
- [u007-root-integration-r3.json](/Users/luca/Desktop/luca_gstack/framework-audit/u007-root-integration-r3.json)：`4e1247d854a8190593ac750e9467aab6d8950cda9609c38a52ce7ac06b566d83`
- [u006-routing-use-evidence.md](/Users/luca/Desktop/luca_gstack/framework-audit/u006-routing-use-evidence.md)：`5cfce5ad9c49d41817a7d3eee3f2fd54d545d31da507a096eb0e6f815c0ff525`
- [u006-current-use-evidence.md](/Users/luca/Desktop/luca_gstack/framework-audit/u006-current-use-evidence.md)：`3739dae4b09d2b23c9096a84ca842d66ec961891d93042e8c112bb1b3a1c3b70`
- [u002-baseline-and-protected-uses.md](/Users/luca/Desktop/luca_gstack/framework-audit/u002-baseline-and-protected-uses.md)：`0a29c67a76e2367062d036b87d6e63a088a22b7b763b457208653e7c3feb04d9`
- [u007-routing-material-closure-report.md](/Users/luca/Desktop/luca_gstack/framework-audit/u007-routing-material-closure-report.md)：`68746a5c1ba56f163251c0a9f52c0ec3146c30d57b51a419455645dd7065e34b`
- [u007-implementation-contract.md](/Users/luca/Desktop/luca_gstack/framework-audit/u007-implementation-contract.md)：`74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6`
- [u007-interface-addendum-5.md](/Users/luca/Desktop/luca_gstack/framework-audit/u007-interface-addendum-5.md)：`5727306f38a0b5779d0e18c51f0ff73ab5386bf3f6c2a5ddc252946ca106ed3a`
- [u004-native-capability-facts.md](/Users/luca/Desktop/luca_gstack/framework-audit/u004-native-capability-facts.md)：`6a5641ef108d3c8824142694b361f556844e3cbb59f6f78e29d35e8bc4e30b36`
- [u007-root-integration-corrections.diff](/Users/luca/Desktop/luca_gstack/framework-audit/u007-root-integration-corrections.diff)：`e3a3ee1342a57e825002b2c339ec1fcaf0c80da2842b8f34e90433b5c6c18de6`

### 当前集成七文件（本次只核hash）

- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/case-protocol.mjs`：`ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/case-protocol.test.mjs`：`b668c47cfb89cf92b820b3c46cc8574b71c555f2565963a10040fa7f33f966af`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/conditions.mjs`：`211c7d3530ccff80b589cb8f152e2f916c0a21d95c54d24755d26b5bde2cdf2f`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/conditions.test.mjs`：`30e75cff9be6573f618062d0ba854379103bd8a47d5eab2b334f5174bfe5b643`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/driver.mjs`：`8b6152faeaf1cb29db7e9e32493939f37d7a022ec4eb34f3d2f06fd9e0a25dee`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/driver.test.mjs`：`c91ad8d4a74f63adce1c0fc7a26dd5bc04b9c8d4d0c5308815d917c82f0e59d1`
- `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/integration.test.mjs`：`cf43047b371b8cecfa7646d3069d3807a4f86c7d912afa5a021245e82068105e`

报告生成可核时间：2026-10-03T03:57:30.678150+08:00；自首读后观测起 480.44 秒，首读之前未计部分UNKNOWN。

## 给主协调的摘要（不超过2000中文字符）

当前没有足够证据支持路由模块或S/I更有价值、更高效，或已更充分释放Codex桌面/CLI能力；也没有证据判原框架无价值。J05为真实非作者FAIL 1/6，正式开发/隐藏均未放行。

14项USE用途全部登记去向：路由主责/交叉的任务理解、项目边界、显隐式选择、Plan升级、standalone/workflow、人类决定、精确交付与领域分支均暂留；协作、独立验收、实例证据、模型、记忆及完整恢复由其原owner负责，路由不越权背书或删除。旧read-grants broker不重新启用，正常授权绝对路径仍按原边界；当前停用的11个项目hooks不强行激活。

可复用资产是冻结材料构建、原字节/来源/拒绝测试、S的三处入口候选及当前去重后的技能发现布局。W18的867文件和22项测试只对应旧作者版；当前以f351七文件及root-integration-r3为准，conditions=211c7d…，B/S各48个repo技能无重名且J核原件一致。目录发现不是显隐式选择、技能执行或净收益证明。

两个确定阻断属于新评估driver：正式记录可省略权限对象而退回普通readOnly；engine INVALID_RUN可被顶层COMPLETED掩盖。P03/P04未启动线程；P05虽有真实线程和配置回显，却仅5次dynamic工具、0原生命令、无产物，累计59541 token触及40k上限而INVALID；19100才是首次输入，缓存不重复加。不能归因全部MCP成本或原路由架构失败。

当前不推荐生产切换。迁移、回退、新生产实施包均为“当前无可放行变更，N/A仅限暂留现状的决定”，不等于全生命周期完成。准备20/20已满，本次只占建议池一次；不花P06盲试、不扩大预算。继续原目标仍欠：既有driver阻断及真实边界/基线资格闭合、可负担且公平的开发/隐藏比较、归因/独立反证/终版复验、逐用途迁移证据和具体三包、统一实施/跨模块验收/获准提交推送。M先处理既有范围与预算门，原owner承担各自责任，J独立判定；本稿不授权新建设。

DONE_WITH_CONCERNS仅指本次建议交付，整个目标仍未完成。

<!-- FILE_END: u011-routing-evidence-limits.md -->
