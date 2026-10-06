# N02 / U011 编排模块当前实现、证据边界与保护用途去向

**模块已有具体实现、本地检查和限定的桌面原生过程证据，可继续进入既有联合验收；仍没有公平 B/S、同质量完整成本对照，不能宣称更高效、更有价值或已最终采用。** J18 PASS 4/4只闭合静态修复与消费者兼容。N-A第一段证明真实进程结果、失败没有进入成功汇总及临时交接，不证明两个真实Agent协作、自动接线或接手后的恢复。报告更新为 DONE_WITH_CONCERNS；整个模块开发、审查返修、联合验收及root最终采用责任继续。

旧版已原字节保存为 [J18/N-A之前的历史快照](/Users/luca/Desktop/luca_gstack/framework-audit/u011-orchestration-evidence-limits-history-pre-J18-N-A-7ada594caf36.md)，SHA256 `7ada594caf3665953303c58740399e4f8fe369a90281fd6dd0e92575ef64d972`。旧J05/R3、原失败、输入身份及旧资源计数留在该快照，不能覆写成成功，也不能将其当成当前所有开发的停点。

## 共同用途与本次裁决范围

一个通用框架仍以理解任务、组织执行、信息连续性及必要人类控制定义价值。Codex桌面/CLI优先；Claude Code只做会改变共同用途结论的兼容和必要控制检查，API是单列能力表面，不扩成多个宿主框架或平台工程。通用性不等于采用最弱能力；确有能力冲突要有证据并回共同用途裁决。模型能力、原生环境能力、框架机制分别归因，保留机制必须说明最小替代、必要前提与净价值。技能内部领域方法和具体原型流程仍归领域owner。本报告只处理编排及与路由、Context的控制交集。

共同零节权威为 [连续模块责任修订](/Users/luca/Desktop/luca_gstack/framework-audit/u012-continuous-module-ownership.md)，本次已全文读取。最新真实派发已撤销普通开发20/40分钟、40/80动作及报告字数等人为小批停点；不是抹掉累计成本或放宽平台硬限制、真实Human Gate、唯一owner和探针额度。P08仍INVALID，探针8/8不变；不自动P09、不新增模型/Agent/probe/网络/commit/push。本次不写新的执行计划、不重复已绿测试、不制造代码改动。

## 当前版本、审查与历史结论的变化

最终候选真值为 [J18冻结manifest](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/manifest.json)。编排三文件本次逐一回算候选hash，与本模块最终交付一致：

| 文件 | 最终SHA256 | 当前证据范围 |
| --- | --- | --- |
| `.claude/agents/orchestrator.md` | `171550920c487d4a6384ade982a73b77891c91a81df86528fb2b9bb40b5e37b4` | 本次N-A已完整读取最终候选；授权续行、实际句柄、终态与依赖消费、恢复及完成记录语义 |
| `.claude/agents/work-agent-template.md` | `ed2b41e38882d89c70c021b4807a194a21e6f329fb87338b2fa785923918a9cd` | 两MODE共同输入/权限、失败及在途原件、准确交接与验收；N-A未实例化两个真实WA |
| `.claude/skills/office/auto/SKILL.md` | `3b8ceea6c924e077f62b38132ba70cb132d89bc6709991de9b4d152474ac7fcc` | J15交接finding修复后版本；本次报告完整读回，N-A未运行auto领域方法 |

最终Context候选的long-session、handoff、handoff-protocol、office也在N-A完整读取并核验manifest；没有以71f8旧副本代替。它们由模块三/root维护，编排只消费，不改其领域/格式owner。

[J18 root摘要](/Users/luca/Desktop/luca_gstack/framework-audit/u012-joint-review-r4-final-repairs/root-adjudication.json)为PASS 4/4、关闭F3/F4，范围明确为“static final repairs and joint consumer compatibility only”。原始独立报告/envelope在root的原生 `/root/a_gate` transcript；本owner读了root落盘摘要，没有把它冒称自己重新取得的独立票，也没有把4/4外推为实际模型行为、采用或fair B/S证明。J15发现auto无条件要求项目handoff，已修派发、DONE_CRITERIA、交接步骤、串行消费及汇总；当前不再沿旧交付的“尚未静态闭合”描述。

J05 FAIL 1/6及R3七文件hash/35项driver测试是早期评估设施快照，仍保留其发现和成本。旧报告“J2/J3当前仍未修、准备20/20所以所有建设停止”的时间点结论不再用于冻结已获授权的W40开发；本次不重审当前driver、不以J18反向洗掉J05，也不把旧driver缺陷转嫁为生产编排故障。当前资格限制用后到的 [J14 P08结果裁决](/Users/luca/Desktop/luca_gstack/framework-audit/u007-p08-adjudication.md)：J14 PASS 3/3是结果裁决，P08仍INVALID，真实规则加载未成功，协议/整链资格不足，不能作公平比较或采用。历史P05/R3与最新P08不可拼成一个成功样本。

## 各项实现解决什么，以及最小替代

下表的最小替代是保留同一必要控制的比较参照；尚未执行的替代不冒称当前入口已可用或收益已证。它不授予切换架构、降低既有质量门或普遍改用多Agent的权限。

| 已实现变更 / 服务用途 | 原生最小替代 | 框架实际增量 | 已证明 / 尚未证明的质量与成本 | 切换风险及必要验收 |
| --- | --- | --- | --- | --- |
| 已有批准/参数继承，下一授权阶段继续；USE-03/04/10 | 主会话记住当前选择与权限，只在缺失或冲突时询问 | 将原目标、当前phase、最新授权来源/scope/owner沿既有字段传递，保留真Human Gate；避免把状态文件或派发当新授权 | 合同及静态消费一致；N-A首段遵守明确run-once边界。未证明成功后不重复确认的普遍效果、真人门相反分支或提问/等待节省 | 旧checkpoint可能只有旧批准/缺owner；恢复必须核最新更正，未决采用/效果不能默认。真实“应续/应停”均须有结果 |
| 实际句柄、等待与终态；USE-05/06/07 | 用exec会话ID、原生wait/status/read取得同次退出和输出 | 明确yield/timeout/idle/ACK不算成功或取消，不凭等待结束重派；失去可观察性保留缺口 | N-A初次250ms yield后沿18948/63034收取exit0/23，未重启；84项模拟app-server回归覆盖deadline清理。未实测文案中的超过5分钟等待、原生Agent消失或完整父子账 | Agent/task/process句柄能力不同，不能用同名“completed”替代所需产物/验收；真实失句柄和截止后的在途限制仍须核 |
| 失败暂停对应依赖、其他在途保留、缺片不合并；USE-05/06/13 | 主会话检查每个exit/产物，只有required齐备后生成汇总 | 明确失败/未知/在途前置与ready frontier，原失败及未解决缺片留在完成报告，不以部分成功清空责任 | N-A两进程各执行一次，B失败无成功汇总；84项回归验证runner关键锁存/排队阻断。没有两个真实Agent并行/合并净收益、复杂多分支消耗或遗漏率对照 | 新规则不可跨越implement单活跃/模型关键证据门；多源产物不得按返回数量重建required分母。真实依赖集及失败传播仍验 |
| 终态/准确产物/质量门/eval记录先闭合再DONE；USE-06/07/13 | 退出码检查加必要领域验证；需要非作者判断时取得真实独立结果 | 修正先DONE后验证窗口，保留PASS/条件/警告原件及eval失败；记录不成功不能完整完成 | 86静态保护、70本地shell退出案例、J18静态兼容；14作者语义例仍非模型实测。N-A没有独立质量判官/验收回执。未证明实际eval失败修复、完整领域交付或审查净成本优势 | 老状态DONE不能自动迁入新消费条件；缺eval/产物/条件必须显式处理，不降门、不改判。非作者审查和实际记录失败出口仍为采用条件 |
| 两MODE共同必要输入/权限；精确交接适用性；USE-04/08/09/10 | 直接读取所选skill和明确输入；显式会话写一个临时文件 | 无MODE不猜默认；正常项目Workflow节点保留项目handoff/gate，显式会话用OS临时产物，NO_PIN不穿展示别名，合法终端豁免不补造第二份 | J15实际发现消费冲突并修；J18静态闭合，N-A临时handoff实际写入/读回。未证明真实auto/领域节点、每次启动自动加载或所有终端豁免行为；读取/维护代价未配对 | 不能把会话交接替代项目节点，不能用NO_PIN推pin或让外部路径扩权；项目/临时/豁免三分支实际消费仍须覆盖 |
| 恢复核真实效果、最新授权/原目标、原句柄与首个未完点；USE-09/10 | 原生resume加一份明确状态/效果记录，由接手者核当前事实 | 不按最后DONE/首PENDING盲恢复；checkpoint保留失败、未完依赖、当前focus及原长目标，避免重放完成效果 | 已实现合同；N-A交接保留A一次效果、B原失败和禁止盲重派。接手后更正/恢复尚未被本owner观察，CLI/fresh/compact/丢失队友仍未知 | 旧state/摘要可能不含effects或句柄，缺证暂停受影响依赖；不要从旧标题/最新摘要/历史文件回退。跨会话核最新来源及不重放证据是必要验收 |

implement专用确权/单活跃串行、公共模型路由、eval原件、auto frontmatter/OD一次retry权利和计数、模板变量与JSON保持；源R9评估代码未改。这里的增量主要是消费合同和矛盾修复，没有新增scheduler、全局配置、平台分支或领域方法。规则写得正确不等于已验证每次运行遵守。

## 14项保护用途逐行去向

原ID及用途全部保留。B0、A、M、F等旧证据定位沿历史快照引用，不假称本次重新读取全部旧源码。S=静态合同；L=本地/模拟执行；R=限定实际入口；U=未证。不同层和共享事件不相加为行为样本，不把14项乘以三个模块。

| use_id / 用途 | owner与原路径去向 | 原生最小替代 | 当前框架增量及证据 | 未证质量/成本、切换风险与必要验收 |
| --- | --- | --- | --- | --- |
| USE-01 项目与任务边界 | Project/路由/Context主责；编排消费可信根。受控绝对路径留存，旧read-grants broker仍禁用，停用hook不重启 | 明确cwd/绝对输入输出路径 | W40冻结任务根不随展示别名/项目切换重算S；84回归有临时fixture A→B及取消L | N-A是NO_PIN，不证明真实pin/child授权撤销。case-local不替项目隔离；核真实根、scope、owner和在途切换才放行 |
| USE-02 理解请求与选方法 | 路由主责；语义选择/用户显式方法/必要澄清保留；编排不重复已定方法 | 主会话解释请求，选择可用skill | 编排继承所选skill/参数，不从pending状态擅选S；本次没有新的路由改造 | 选对方法和无重复提问收益U；发现目录不等于采用。依赖模块一实际正确路由/入口，不以本报告宣称闭合 |
| USE-03 按复杂度组织/批准 | 路由判复杂度，编排执行，Context保批准；原Plan/Human Gate留存 | 主会话列依赖、取得必需批准 | ready前置/有效批准继承、DONE前闭合S；J18静态联合兼容 | 规划不授执行权；N-A首段仅明确授权边界。真实应续/应停及计划漂移要验；不能凭未比较效率删除计划或强加并行 |
| USE-04 standalone与用户选workflow | 路由/编排/Context交叉；正常Workflow项目交接、standalone及领域gate保留 | 直接所选skill，只有用户选流程时启用流程 | worker与auto按交接适用性分支S；J15修复/J18静态闭合；显式临时交接R | N-A非auto/项目节点执行。普通节点、临时会话、合法终端豁免和旧输入兼容仍须实际验；领域方法不由编排替换 |
| USE-05 并行独立工作/强依赖有序 | 编排主责；原职责/依赖/合并责任保留；implement串行例外优先 | 多个独立exec或原生委派，主会话回收后检查required | N-A两个真实进程各一次、原句柄终态、失败不合并R；runner排队/锁存L；合同S | 不是两个真实Agent，未证并行净收益/父重做/合并遗漏或全链成本；真实Agent若属采用范围仍要实际闭合，缺片不得减分母 |
| USE-06 独立验证/真实完成 | 编排/QG主责，Context交证据；独立审查/失败出口保留 | 检查真实exit和必要产物；所需非作者判断另取一次独立结果 | 86静态/70退出/84runner不同范围；J15确有作者漏项被发现，J18仅静态闭合；N-A exit及未合并R | 不把本地核验当独立接受，不推日常所有任务多Agent最优。领域gate/eval及实际失败消费必须齐备，全部质量成本配对U |
| USE-07 当前实例取证 | 验证owner主账，编排原调用归属，Context传材料；expected/observed/原实例保留 | 原生返回引用、固定输入与产物hash | 最终三文件与manifest绑定S；N-A原生session/chunk/exit及交接hashR，原失败留存 | hash只证明身份，不替实读/行为鉴真；不把旧P05条件hash升级成当前整链。工具/评估/父账口径不混加，独立复核仍核原件 |
| USE-08 适量正确规则/事实 | Context主责，路由/编排消费；必要owner与fallback留存 | 主会话读与题目直接相关的authority/输入 | 两MODE共读必要输入S；N-A实际读最终六authority后执行R，报告读取auto不冒充auto运行 | 不证明hook自动加载/所有字节被模型采用；不把缩窗或未读材料计节省。完整required来源、版本与真实读权需保留，成本U |
| USE-09 长任务更正/授权/证据连续 | Context主责，编排续接；旧checkpoint/handoff保留并按新事实核 | 原生resume加临时交接及effects记录 | 原目标/focus/最新授权/失败/句柄/未完点合同S；N-A交接写入读回及A一次效果R | 接手后恢复尚未在本owner证据内；fresh/compact/丢失对象/旧状态兼容U。不得重跑已核效果，后续联合结果由当前owner/root取得 |
| USE-10 人类决定/工具权限 | 全模块交叉；编排执行边界、取消反馈；真实Human Gate保留 | 限定命令/输出路径，具体缺权才问人 | N-A按run-once且无retry/缺片不汇总R；84取消排队/进程组L；授权继承S | 不证明完整命令沙箱、拒绝所有越界或新效果人类门；MCP/Apps/hooks不能继承process proof。真实应续/应停、取消限制和effect交集仍验 |
| USE-11 实际模型/可用能力 | 编排/F与宿主采信交叉；当前模型路由/关键失败拒绝保留 | 入口显式配置、实际采用证据与可观察原句柄 | 静态模型路由/保护未改S；84模拟采用/失败锁存L；P08限定真实命令结果R | N-A不产生新的模型采用/父子usage证据；CLI/桌面/API不外推等价。探针8/8不变；未知关系、关键义务未闭合不自动降级/另探 |
| USE-12 稳定事实/临时信息边界 | Context/memory主责；默认不存、受控候选/晋升及fallback不变 | 在题内/临时文件存当前状态，不自动长期记忆 | N-A临时交接无新长期存储；本次无memory机制改造 | 本次不写memory不是净收益证明；长期后端/污染防护U。由memory owner验治理，编排不晋升临时结果或改全局事实 |
| USE-13 精确消费已验收交付 | 领域owner主责，编排转交；source→candidate→独立验收→精确final引用链留存 | 核准确产物/版本、required结果及领域验收后消费 | W40终态/gate/eval先闭合S；N-A B失败阻止final-reportR；临时交接引用准确hash | N-A不是原型PREACCEPT/seal/consumer或完整领域闭环。无验收不消费，旧/raw/latest不替final；领域helper、资源闭包及缺eval分支仍需验 |
| USE-14 原样/复制/改进分支 | 领域owner主责，路由选择、编排继承；三分支与领域判据原样保留 | 主会话按用户真实选择及准确ref执行 | 本次未改分支/平台/设计系统/动效方法，只保留选择与权限传递S | 本次没有三分支真实行为/成本证据；不自动copy或植入/改设计，不以通用QG代领域判据。由领域owner实际验所选分支 |

## N-A第一段实际事实及接手边界

N-A是在Codex桌面当前工具表面使用真实exec_command/write_stdin，控制脚本不是真实两个Agent。初始source为version1、title“Draft v1”；A/B均初次yield_time_ms=250，并行独立启动一次。早期返回只表示仍有原生session，不当作完成：

| 步骤 | 初次引用 | 同句柄真实收取 | 结果与当场检查 |
| --- | --- | --- | --- |
| A / `python3 alpha.py` | session18948、chunk3216c0，输出为空 | chunk45f165、exit0、ALPHA_COMPLETED | total5，items/version与当时source一致，alpha效果一条；只有本地内容核验，无独立接受票 |
| B / `python3 beta.py` | session63034、chunk745bba，输出为空 | chunk6b99b0、exit23、BETA_SOURCE_NOT_ACCEPTED | beta尝试一条，无beta成功结果；原失败保留，未重试 |

fresh输入/无旧效果检查为chunk a40793；内容、计数及缺片检查为e6a237。两份required没有同时成功并获准消费，未创建final-report.json。此时没有剩余A/B在途session；这只限已收取的两个进程，不能证明所有潜在后代被独立观察。初次250ms yield不是“超过5分钟超时”的实测。

[显式会话交接](/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-handoff-20261003-094437-178abe12.md)写到真实OS临时目录，9个规定标题、规范化路径、实际字节读回，SHA256 `8fb3d3f513866b2c80486755e8fc049d577c56a7d16ff94ce07b011bfdd8ae78`；创建/读回工具chunk132905。包含原长目标/当前focus、授权来源及禁止重试、原失败、A效果、实际句柄、未完点和未验证范围，没有第二份项目/framework交接。受题目读权限制未运行repo/observability preamble或git status，明确记为未核验，不伪称工作树快照比较。

[本owner保存的原始过程证据副本](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w40-evidence-hsxdr0ik/u011-after-J18-N-A/N-A-first-segment-native-process-evidence.json)与当时原件hash一致 `f171f8e7cba54e6bbe0afd6d1d43fa58bd10977f3288df30fca441c3d51ed838`。证据写入helper首次因TextEncoder不存在失败，错误在nested命令派发前，没有文件效果或重派；随后修正序列化，原错误保留。该工具helper错误不归因生产框架。

root已实际收取交接并把题目唯一owner移交模块三。本owner不再写题目录、不重跑或修A/B；此报告只记录首次交接状态，不读取后来变化来补造自己的成功，也不声称下一会话恢复已运行。N-A不能证明fair B/S、自动framework接线、独立验收、无重复跨会话副作用或最终题目完成；后续事实由当前owner/root联合核验。

## 原始检查、已发生成本与不可填补的未知

| 证据 / 成本口径 | 真实结果和可支持范围 | 不支持的推断 |
| --- | --- | --- |
| 最终三文件静态检查 | [j15-checks](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w40-evidence-hsxdr0ik/j15-checks.json)绑定最终三hash，四命令exit0；agent-contracts86/86，另有model-table/coding-discipline/diff-check；86检查命令约0.0417秒 | 不执行改动文案，不证明模型继续/等待/恢复，也不等于最终部署或整体净价值 |
| 本地退出合同 | [exit-contract](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w40-evidence-hsxdr0ik/exit-contract.json)：70/70、21模板；真实退出/解析/搜索/管道，npm/npx/swift/git-config/pytest为确定性fixture；既有命令约14.105秒 | 不证明这些真实产品suite、原生冷QG或新编排文案。70 stored expected/actual此次核对一致，不重复执行 |
| runner运行时回归 | [原日志](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w40-evidence-hsxdr0ik/runtime-regression.log)84/84，exit0，23.642秒；15依赖文件字节相同临时镜像，真实runner/状态/evidence/进程清理，app-server及native身份模拟 | 不是84次模型/Agent任务；不加载三文案。非关键primitive可返回null/fallback，required是否消费仍归上层；个别状态/RPC夹具由原suite清理，不造完整保留trace |
| W40开发/返修/协调 | 最终冻结证据记录原W40累计墙钟约2156.9秒；初期动作保守上界75，后续有J15修复、重复读取和字数guard失败原件 | 墙钟包含开发/报告/等待/读取，非框架单次任务成本；完整工具/父子token/金额/全模块人时未知。人为小批上限撤销不重置账或删除失败 |
| N-A限定真实执行 | 两次exec，各250ms初次yield；两次同ID收取；0重试，0新Agent/能力probe；输入authority读取、核验、交接及helper返修成本存在 | 原生返回wall_time_seconds只计各工具等待片段，不能相加作完整任务耗时；没有B/S、token/金额或主会话收益对照，不把sleep5的源码当实际总时长 |
| P08历史真实失效成本 | J14记录137276=136424 input+852 output，91392 cached不重复加；launcher169.285秒，7/8边界项、规则加载PermissionError、BAD_ARGUMENTS、观察超额后interrupted；P08 INVALID | J14的PASS3/3不变为P08成功；不能称硬token上限合规/整链完成，也不把观察代价全归编排/Context/MCP；探针8/8不增额 |
| P05/R3旧成本 | 134.591秒、total59541等旧口径与原失败保留在历史快照；root UA/去重修复不回填owner成绩 | 不与P08/W40/N-A相加成同一种成本，不推当前全池余额或正式样本数量；旧准备池状态不复活已撤销人工开发停点 |

86、70、84、J18四判据和N-A共享事件分别记账，不拼成“全部质量通过”分数。当前没有同质量完整成本配对，不能选定普遍单Agent、顺序尝试、并行分工或独立审查组织方式的赢家。N-A第一段的原生process能力已能完成执行/收取，框架增量是可核的消费纪律及合同一致性；没有移除框架的对照，因果收益仍未知。

## 当前切换风险、必要验收与可行动模块结论

候选已修正直接消费矛盾，J18静态关口已关闭；不再以“只交建议/暂留现状”替代已授权开发、返修和联合验收。当前可由root按同一最终hash继续既有集成和实际验收，具体独立finding回模块二定向修复，不扩大平台或领域重构，也不要求用户再次批准已授权普通修复。没有新finding时不再造代码或重跑已绿suite。

| 当前必要闭合项 | 已有基础与缺口 | 责任 / 当前可行动结论 |
| --- | --- | --- |
| 最新授权继续与真Human Gate | 合同及J18静态闭合；N-A只验证明确run-once范围，没有成功后续行与真人待决的相反分支 | root实际验收；模块二修具体消费finding。不能以“自动”代采用/新effect，不能机械重复有效批准 |
| 真实等待、失败、required完整性与在途处置 | N-A首段真实句柄/exit/不合并；84仅runner模拟；没有两个Agent/失对象完整证据 | root依最终采用范围核原生任务与现有证据；采用范围含Agent时不能拿process代替。不得增加探针或降低required标准 |
| 更正/恢复不重放及Context消费 | 当前handoff留原失败/效果/未完点；模块三已获题目唯一owner，接手结果尚非本owner实证 | 模块三/root收取下一段真实来源/授权及恢复证据；模块二处理编排接缝finding，不覆盖题数据/Context owner |
| 验收/eval/准确产物及项目交接分支 | 静态顺序和临时会话实读已证；实际eval失败、普通项目节点/豁免/完整领域消费仍缺 | root/QG及领域owner负责实质验收；模块二仅修传递与消费，不修改原verdict/eval/领域方法 |
| 现有状态切换与回退 | 老DONE、缺授权来源/句柄/效果的checkpoint不能直接视为可消费；无新通用状态协议 | root集成/generated刷新及三owner核真实旧状态，保留失败与保护dirty；变化实际影响的迁移/回退须验证，不能给全部生命周期写N/A |
| 正式净收益及最终采用 | P08 INVALID、probe8/8；没有公平B/S或同质成本，J18不授采用 | root形成U011/012限域裁决，保留未证用途。最终采用/提交推送沿既有真实授权及必要门，不由报告或静态绿灯代替 |

这些是现有完成定义与证据缺口的责任去向，不是新增执行计划、普遍前置研究关卡或新接口。当前不推荐全面原生化、撤掉独立验收/权限/恢复/领域交付链，也不凭未知收益普遍升级多Agent。未改变用途和停用设施保留原去向；已实现候选不可再写成“无可放行变更所以模块工作终结”。具体采用边界由root以真实联合验收裁决，必要缺证范围保留UNKNOWN，不编赢家。

## 本次读取、历史保存与资源

旧报告完整读到EOF并保存原字节快照。本次完整读共同零节、当前模块交付、root J18摘要、J14 P08裁决及最终auto；orchestrator/worker和最终Context四authority在刚完成N-A时已完整读取且本次候选身份未漂移。读取W40原manifest/命令/覆盖、实际原生返回及原handoff；70例大JSON第一次显示截断，随后定向解析聚合和全部存储退出结果，不冒称本次全文逐字重读或新执行。J18原独立票未重新读取，P08原始RPC/题目/评分资料未读；使用已裁决报告不越权到这些原件。相关历史官方材料未联网刷新，当前能力不因文档名称推定。

[本次输入身份/读取限制](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u012-w40-evidence-hsxdr0ik/u011-after-J18-N-A/inputs.json)包含历史快照、18份读取来源hash及原失败去向。只改本owner报告、同目录历史快照和自己的原始证据；没有源代码/其他owner文件/已移交题数据写入，没有新测试、模型/Agent/probe、网络、global/private/archive读写或commit/push。root对本报告人工字数门和短批停点的最新撤销已继承；原失败/成本留账，精确本次token/金额和全模块成本仍未知，不擅重算唯一ledger。

给root的结论：完整编排候选已落地，静态消费兼容有J18闭合，N-A首段为真实process/等待/失败未合并/临时交接增加一段限定R证据；净价值、效率与最终采用仍未证。采用范围内实际续行、真实门、恢复及领域消费缺口继续由既有owner/root闭合；本模块保持返修责任，不在本报告处宣称模块完成。


## U014 新激活：以用途与公平可测为先

本节是后到的执行与证据更新，优先于前文时点上的“不自动P09、probe8/8”表述。[U014已批准方案](/Users/luca/Desktop/luca_gstack/framework-audit/u014-value-first-replan.md)保留原目的，授root最多两次新资格注册/启动，总probe cap10；不是把旧8次改判成功。本owner仍0新增Agent、0模型运行、0能力资格启动、0网络或Git发布。当前实际新增的是确定性本地命令、原生sandbox局部诊断及两个授权driver文件的修复。三份生产编排文案保持J18的精确hash，不为评估方便改写。

### 编排原目的、现存需求与价值判据

原机制来源是baseline `05120197` 的orchestrator：§2.2-pf职责并行与全WA回收、§2.3 Sequential Chain依赖顺序、§2.3分组失败恢复、§2.2质量/eval与最终完整验证、§3.5恢复；不是从“Agent越少越好”推导新目的。W40修复来源、用途ID与具体范围沿前文表格。本次用最新用途重新约束这些改动：

| 原目的与具体需求 / 来源 | 保留的正常、失败、恢复及高损失路径 | 因果价值假设与真实证据 | 代价、可证伪条件与最小替代 | 本次精确范围、依赖、验证/回退 |
| --- | --- | --- | --- | --- |
| 职责分工与回收；USE-05，原§2.2-pf/§2.3 | 真独立职责可分派；同对象等待；required全量回收，缺片不改分母；implement单活跃例外保留 | 减少父会话重复劳动/用户协调是待测假设。N-A只有两个process，不是两个真实Agent；没有分工收益配对 | 派发、上下文重复、回收与合并增加成本。若无独立任务、父仍重做或净返工更高，分工价值不成立；主会话直接执行仍是必要参照 | 不删除角色或默认所有任务多Agent；三文案不再改。真实Agent闭环与全家庭成本依赖root资格/联合验收，不能由process替票 |
| 依赖有序与消费准确；USE-03/05/13，原§2.3 Sequential Chain/implement frontier | 前置产物、验证和权限齐备才消费；失败只停影响链，独立任务收取；旧DONE不自动复活，错误版本不能进入最终交付 | 预防提前消费及遗漏的价值可观察。N-A B失败无成功汇总，J15/J18只证静态接缝修复；完整真实链仍未证 | 查终态、版本与required集合有成本；若同质量原生最小方案无遗漏且更便宜，则额外框架控制需解释。保留必要依赖的直接执行是参照 | 原前置门、原产物/身份字段保留；不加scheduler。任何实际消费finding回本owner定向修，不能降验收或改领域owner |
| 独立视角与实质验收；USE-06/07，原§2.2 gate/eval及§6职责边界 | 所需非作者判断真实取得；失败原件不改判；合法条件核验、eval写入闭合后DONE；关键证据UNKNOWN不降级 | J15独立发现作者漏项，支持该次审查必要性；J18限静态4项，不证明普遍独立Agent的净收益。正确率、漏项、返工负担必须配对 | 冷启动和额外审查会耗时/token；若发现无新增有效缺陷且成本不抵质量收益，普遍增加审查不成立；明确检查加需要时独立判断是最小参照 | 不删除独立性，不拿作者本地测试充票。root持真实独立review/采用权；文案与gate顺序保护保持 |
| 失败收集、隔离与恢复；USE-09/10，原§2.3失败恢复/§3.5 | 原错误、实际句柄、在途/终态、已完成效果、最新授权保留；未完点续行；失对象停受影响链；无权重试不重放效果 | 恢复记录有助减少错误重派是待测假设。N-A首次交接与未汇总实证存在；接手后的完整恢复非本owner观察 | 核effects、句柄和授权有成本。若重复效果/原失败丢失/无关链停摆仍发生，机制未达到目的；原生resume加精确状态记录是参照 | 不改恢复owner/长期记忆。模块三/root后续原件负责恢复；具体接缝finding返修，原失败/历史仍留存 |
| 持续责任与真实完成；USE-04/06/10/13，原最终完整验证及完成记录 | 有效批准后续行；真Human Gate仍停；更正不丢长目标；质量/记录/准确交接闭合才完成；普通开发不被人为短批停点截断 | 用户明确需要完整闭环，W40修了直接矛盾。持续负责是完成合同，不自动等于效率收益，也不以持续轮询制造工作 | 责任持续增加修复/验收投入；若只是报告结案、重复绿检查或遗漏必要交付，未达到目的。原生连续会话可作最小参照 | 模块责任继续，不新增Agent/模型/发布。已交driver冻结后只接具体finding；root负责真实资格和最终裁决，本owner不宣称采用 |

各方案首先满足正确性、完整性、可用性及返工负担，再报告同范围成本；不设质量/成本权重、故障频率或赢家。比较必须保留角色、独立验收、依赖/恢复/权限等共同用途。Agent数、文件大小、静态断言数不能代替价值；略增成本但能完成必要用途可有价值，仍需事实。

### 现成入口调查、实际Python根因与最小同条件入口

已查看本机Codex0.160.0的exec/app-server/sandbox帮助并对照现有driver。`exec --json`可输出事件/最终schema，帮助未给出可承接现有四个动态case工具、checkpoint回调及fresh家庭控制的直接入口；没有已证公平替代。继续使用现有 `runTrial → app-server stdio`，保留完整规则材料/真实来源与hash、case协议、严格权限、家庭usage/终态、原始失败及UNKNOWN观测口径。这个选择仅是当前可测入口，未证明框架接线或整链资格已通过。

P08原始native命令外层已用canonical Python，而其`sys.executable`仍返回Homebrew `opt`别名；原profile中`Path.resolve()`不能解析被拒别名，返回该别名，嵌套get_rules启动EPERM。已在完全相同profile、相同原probe/loader上复现并定位，不是driver路径规则需放宽。局部假设及反证为：①外层canonical即可修复，被红loop反证；②父环境继承即可修复，被sandbox中变量缺失及loader EPERM反证；③必要真实规则不可读，被显式canonical环境下原hash成功反证；④`artifact.path`缺失是validator错误，被原调用`artifact:{}`与必需schema反证；⑤必须新建评估入口，目前无保留全部控制的现成CLI替代证据，使用原app-server入口。上述是假设形成/检验记录，不冒称预注册。

[同profile红证据](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-o57wrvn4/python-alias-unchanged.json)保留原EPERM；[命令内env绿证据](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-o57wrvn4/python-alias-canonical-env.json)仅用`/usr/bin/env PYTHONEXECUTABLE=<canonical> <canonical-python> -B ...`，原loader exit0、空stderr、无解析失败，原stdout hash `66a501665fb15b3b5e30fead5a47901d064c92f633e04a9baf9a0d284f86b0b4`。没有增加别名/宽根读权，脚本未改，不能把本地诊断称一次真实模型资格。

为保留B/C原`python3`命令，父PATH只前置canonical bin仍不足以传播PYTHONEXECUTABLE。局部采用公开Codex配置argv `-c shell_environment_policy.set.PYTHONEXECUTABLE="<canonical-python3.14>"`后，[同profile的非login `/bin/sh` 与原python3方式](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-o57wrvn4/python3-shell-policy-set.json)确实得到相同loader hash。root可用隔离任务launcher/wrapper承载这一个配置项，五条件使用同一entry/env，不写全局配置或framework条件内容、不增加driver字段。**该配置在真实app-server命令中的采用仍未证**；root必须冻结载体/config并在资格中验证，不能仅凭父环境或CLI局部成功宣称B/C完整规则已被模型采用。P09可先使用已验证命令内env方式。

P08 `before_final_submission`误传`artifact:{}`；无请求保存checkpoint时，合法调用为`{"checkpoint":"before_final_submission"}`，完全省略artifact。schema与validator保持，不把坏调用洗成成功。root可在资格脚手架给这条精确示例，保留真正保存节点的path/sha要求。

### C及cap10的实际修复与交付

root提供的[C材料manifest](/Users/luca/Desktop/luca_gstack/framework-audit/u014-candidate-source-manifest.json)描述baseline清单加17个`cd0cff15`框架blob，评估工具不进入材料。B/T/S/I继续存在；C才用于实际旧/新候选比较，不能把仅K2/K4/K10缩减的S冒充完整候选，也不能拿C替独立冻结I。本owner只修driver枚举，不重写conditions/materializer，实际C材料身份及完整加载由模块一/root核。

[精确driver交付](/Users/luca/Desktop/luca_gstack/framework-audit/u014-orchestration-ready.json)已提前供root收取，两文件冻结：driver SHA256 `b514cb98eacc3bf689931c3236a72e8da55f766124828839ba0cb20dafabb7a6`；tests SHA256 `06b3b6c28d422734b70d27c4d6beff8c491deaac75e1b6850b3a22b13c1c20c7`。只加C、让trace probe cap8或10取自manifest并在两次读注册时精确匹配；旧非trace cap6/7与trace cap8均兼容，9/11/字符串/null/注册漂移拒绝。I专属child限制、proof/资源/终态/UNKNOWN限制不变，不放大480秒/30动作/120000 observed tokens。

新增测试先实际RED：3项中2项分别命中C拒绝/cap10拒绝，再最小修复GREEN3/3。完整driver回归exit0，74项中73通过、0失败、1项因candidate缺既有W34 synthetic bundle跳过，24.587秒；不补造fixture。采用精确临时镜像，driver为当前字节、native-trace/P07 replay为candidate原blob；fixture fake server不是真Codex模型。覆盖C的身份/权限/动态工具/失败保留/fresh家庭，以及8/10注册相等、超配/漂移/资源增额拒绝；旧6/7/8、native proof与资源等既有回归通过。`git diff --check` exit0。这些是运行时离线合同证据，不能变成独立审查票、原生proof接受或B/C收益。

### 成本、失败与剩余责任

P08实际 `136424 input +852 output=137276`，其中91392cached已在input内；4次stream reconnect只证明发生四个连接事件，不能推断其增量计费或把重复输入全归framework。当前没有固定工具/提示、规则上下文、题目请求、实际任务与重连各自token分解；全部分项UNKNOWN，不能用累计数编造框架成本。root删除request中的重复内联probe脚本、保留完整initial_file是资格脚手架修复，不是已证框架节省，也不授权隐改正式简单case cap或统一上限。

本次前置失败包括sandbox误用macos子命令exit71、glob查询exit1、父环境替代失败及RED2项；原native工具输出留在当前chat，定向REDreceipt保存其chunk/错误摘要而非冒称完整TAP副本。两次绿loader、父环境失败、policy.set绿、完整回归与精确输入镜像均在[U014证据目录](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-o57wrvn4)。此前报告原字节保存`u011-before-U014.md`；没有覆盖生产规则、其他owner、评分/hidden/archive/private资料，也不合并不同口径或重复计算cached。

本owner完成最小入口诊断、C/cap10修复、离线验证与用途保护补充，状态DONE_WITH_CONCERNS。实际资格、独立返修、全部共同用途的行为/配对成本、最终采用仍由root按既有批准闭合；普通模块返修责任持续，不以本报告停止。若root给出新具体finding，只改对应授权接缝并更新冻结回执，不能重放已完成效果、追加未注册模型或越界承担其他owner。三生产文案与driver冻结内容不再无finding修改。

<!-- FILE_END: u011-orchestration-evidence-limits.md -->
