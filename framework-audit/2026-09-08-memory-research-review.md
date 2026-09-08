# Phase 2 研究综合独立评审

Gate：PASS。批准进入报告限定的最小增量修复；不批准由此推导新数据库、外部记忆服务、自动晋升、全历史清队列或新授权系统。研究采纳方向有一手机制依据与独立本地故障支撑，没有用厂商收益承诺替代本地验证。以下非阻塞改进应在永久研究报告收口时体现。

输入：framework-audit/2026-09-08-memory-evolution-research.md、五份 /private/tmp/dr-*-memory.md、deepresearch 的 socratic-prompt.md，以及此前独立 temp-store 故障审计。未编辑工程文件，未参与实现。本轮核验的是交付的来源摘录与推断链，没有另开网络复核所有网页，因此“原文直接支持”依据采集日志明确转述；不冒称已独立重复全部联网步骤。

归属确认：未跟踪 memory/tests/test_pending_disposition_recovery.py 不是本 reviewer 产出。仅只读观察并通知主线程，未修改、运行或接管。

## Gate 逐项

| 项目 | 判定 | 依据 |
|---|---|---|
| 五研究角度与三轮记录 | PASS | 五个分角日志均有发现、深读、复核与限制；报告如实说明三个角度复用同一采集 Agent，未伪装五独立投票 |
| 一手来源与产品边界 | PASS | 官方文档/原始源码/原始论文；区分 Claude Code 与云端聊天、Codex main 与已装CLI、Letta API 与 Code、Hermes 模型与 Agent |
| 事实、推断和收益 | PASS | 能力机制与本地采纳分栏；未宣称性能改善百分比；native writer UNKNOWN；无本地安装实测明确披露 |
| 最小修复由本地证据支持 | PASS | 项目预读、alias归属、假同步、WIP吸入、marker增量、遗留锁、归档后中断、候选阻断、health假象均有代码或定向运行证据 |
| 无未经授权架构/政策变更 | PASS | 明确不引入向量库/后台LLM/外发、不自动晋升、不重编ID |
| 源码 pin 严格可重现性 | CONCERN | OpenAI 记录是先读 moving main 再取同次 commit；这不严格证明所读文件字节等于该 commit。应写“版本定位线索”或后续直接读 pinned URL 校验，不能将其称为精确字节快照 |
| 长期效果与全基准完成 | UNKNOWN，非本阶段门 | 研究已披露未跑完整 benchmark、无长期效果数据；本次只允许故障修复与针对性验收 |

<socratic_examination>

<examined_finding id="S1" original_claim="官方系统都区分常驻上下文、事件历史和可复用技能">
<clarification><question>“语义记忆”是在定义事实类型、数据结构，还是检索算法？</question><assessment>主报告已明确事实/规则与语义相似检索不同。Claude 的指令、Letta 的可变 block、Hermes 的小文件并非完全等价层，不能画成同一数据库 schema。</assessment></clarification>
<assumptions><assumption>多个产品采用分层，便足以证明本框架当前三层最佳。</assumption><validity>QUESTIONABLE</validity><reasoning>官方机制提供可行先例，不提供本地最优性；真正支持保留现结构的是没有架构性失败证据、迁移不能修现有确定性错误。</reasoning></assumptions>
<evidence_quality><strength>STRONG</strength><concerns>对机制存在性强，对收益与普适架构只属弱证据。同厂商多文档不是独立效果复现。</concerns></evidence_quality>
<missing_perspectives>单一小型文件存储也可能足够；增加层数会增加治理成本。</missing_perspectives>
<implications>保留当前文件和既有晋升流程即可，无需把各产品名词全部移植。来源：Anthropic F1/F2/F4，LangMem F1/F2，Letta-Hermes F1/F2/F4/F5/F7。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>机制分辨正确，采纳限于保持已有结构。</revision_reason>
</examined_finding>

<examined_finding id="S2" original_claim="命名空间启发项目范围在打开文件前生效">
<clarification><question>限定 namespace 是否已经完成授权？</question><assessment>不是。调用者传入 alpha 只表达选择，不能证明有权读 alpha。主报告已明确该边界。</assessment></clarification>
<assumptions><assumption>LangMem 的 user_id 配置本身能充当安全凭证。</assumption><validity>UNJUSTIFIED</validity><reasoning>日志只证明可配置 namespace；授权来自应用。此错误未被主报告采纳，后续实现也必须保持。</reasoning></assumptions>
<evidence_quality><strength>STRONG</strength><concerns>本地独立探针比产品类比更直接：过滤 alpha 前 beta 已读。修复必须观测文件读取，不只断言结果不含 beta。</concerns></evidence_quality>
<missing_perspectives>CLI 独立人工使用和 agent 自动调用的授权来源不同；复用既有 session pin/grant，避免复制一个并行权限协议。</missing_perspectives>
<implications>最小方案是默认不读项目层、只打开已获准的精确范围、拒绝路径逃逸。删除 alias 自动推导优于另写 Python pin 解析器。来源：LangMem F2/F3 与本地审计 F1/F2。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>本地读取边界有运行证据，不依赖厂商效果声称。</revision_reason>
</examined_finding>

<examined_finding id="S3" original_claim="采用来源收据与阶段结果，避免 marker 假成功">
<clarification><question>成功无输出、没有信号、未运行和失败能否由单个 marker 推断？</question><assessment>不能。Codex 来源明确区分结果，但其原生执行状态不自动适用于本地 hooks。</assessment></clarification>
<assumptions><assumption>模仿 Codex 双阶段 LLM 管道是修复本地 marker 所必需。</assumption><validity>UNJUSTIFIED</validity><reasoning>本地已有人类/agent 裁决，缺的是增量 capture 与可追踪状态。无需新增后台模型、任务调度器或队列表。</reasoning></assumptions>
<evidence_quality><strength>STRONG</strength><concerns>来源支持阶段分辨；本地 marker 软模式丢增量已实测。实际原生 Codex writer 未启用核验，不能将其当本地后备。</concerns></evidence_quality>
<missing_perspectives>每个 turn 都产 receipt 会制造维护噪音；旧 pending 必须保留，增量入口可以仅在既有门槛重触发时生成。</missing_perspectives>
<implications>已有 manifest/claim/capture 足够承载状态；健康指标从现有账本推导。SOURCE locator 应足以定位裁决窗口，不能只记录一个持续增长 transcript 文件名就假定窗口唯一。来源：OpenAI O2/O3/O4/O6，本地 F5/F9。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>采纳的是必要状态语义，不移植官方整套后台实现。</revision_reason>
</examined_finding>

<examined_finding id="S4" original_claim="锁与归档中断需要恢复">
<clarification><question>永久静默锁、普通临时竞争和归档后账本未完成是否同一种故障？</question><assessment>不是，三个运行时分区必须分开。JS throw 的 finally 只证明正常异常释放，不证明进程死亡；原文已在 archive 不等于账本完成。</assessment></clarification>
<assumptions><assumption>必须引入分布式 lease/消息队列才能 crash-safe。</assumption><validity>UNJUSTIFIED</validity><reasoning>当前两检出共用本机；已知需求是保守单机恢复与可见降级。无需多机共识或新基础设施。</reasoning></assumptions>
<evidence_quality><strength>STRONG</strength><concerns>主要依据独立临时 hook 与 post-rename 故障注入，不依赖厂商“可靠”声明。</concerns></evidence_quality>
<missing_perspectives>PID 会重用，age 太旧不代表进程必死；恢复不能误删他人活跃锁。archive hash/path 不匹配须保留证据并拒绝。</missing_perspectives>
<implications>优先最小可见报错和有所有权验证的恢复；完成事件对账复用既有 manifest。源文件已无时不得重新造一条新裁决。来源：本地 F6/F7；LangMem F5 的 serverless caveat 只是边界提醒，非本机故障证据。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>修复故障明确，复杂系统移植无必要。</revision_reason>
</examined_finding>

<examined_finding id="S5" original_claim="保留Git文件存储并修复sync">
<clarification><question>Git 可追溯是否等于同步已发生、事实正确、只提交授权字节？</question><assessment>都不是。主报告已避免事实正确性推导；sync 还需独立检查 ref 和 index。</assessment></clarification>
<assumptions><assumption>采用 Letta Code 的 context repo 必须迁移本地布局或增加专属分支。</assumption><validity>UNJUSTIFIED</validity><reasoning>本地已经是 Git 文件，本次无需新 repo、reflection worktree 或分支策略。</reasoning></assumptions>
<evidence_quality><strength>STRONG</strength><concerns>Letta 只提供机制先例；本地真实 Git remote 的错 ref 和吸入 staged WIP 已复现，fake git 不能验行为。</concerns></evidence_quality>
<missing_perspectives>主线程可直接执行聚焦 commit，生产 sync 不应为“验证”自动推送。已有非空 index 时拒绝是更小且更安全方案。</missing_perspectives>
<implications>显式 HEAD→upstream，任何有副作用前检查起始 index；不做复杂 index 保存/恢复，不关闭 hook 来换成功。来源：Letta F3 与本地 F3/F4。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>采纳是修现有 Git 语义，无架构迁移。</revision_reason>
</examined_finding>

<examined_finding id="S6" original_claim="历史候选ID冲突应保留证据并恢复可用性">
<clarification><question>两份同ID不同文字究竟是意外复用，还是同一事实的合法措辞演进？</question><assessment>单靠文本不同不能决定。全局碰撞拒写是保护，但当前没有精确裁决动词；实际每条需看 provenance。</assessment></clarification>
<assumptions><assumption>写入暂不可用必然证明应取消全局拒写，或应给旧记录新ID。</assumption><validity>UNJUSTIFIED</validity><reasoning>前者可能把未知冲突扩散，后者破坏稳定ID红线。最小先做只读身份/来源清单，明确当前权威与历史载体。</reasoning></assumptions>
<evidence_quality><strength>MODERATE</strength><concerns>本地“无关新候选被拒”行为实测强；如何处置真实历史冲突仍缺逐条身份事实。外部研究不提供该裁决的答案。</concerns></evidence_quality>
<missing_perspectives>合法 wording evolution 会被严格内容比较误判；单机全局锁不必升级多机协议。现测试期望全停不证明产品可用。</missing_perspectives>
<implications>本阶段允许增加证据支持的窄恢复入口，不能默认授权历史数据更改。是否只冻结碰撞目标需结合真实冲突与不可复用约束确定。来源：本地 F8；LangMem F6及其冲突保证缺口。</implications>
<revised_confidence>MEDIUM</revised_confidence><revision_reason>方向合理，数据处置方式必须等待逐条证据，不能研究类比代裁决。</revision_reason>
</examined_finding>

<examined_finding id="S7" original_claim="基准启发新进程召回、更新、缺证据拒答等验收">
<clarification><question>几个定向回归是否意味着已通过 LongMemEval 或系统长期有效？</question><assessment>不是。主报告明确不这样声称。新进程查询只能证明读取接线，只有任务行为对照能证明召回有帮助。</assessment></clarification>
<assumptions><assumption>更高 benchmark 分数必定在本地迁移。</assumption><validity>UNJUSTIFIED</validity><reasoning>任务分布、模型、数据版本、阅读提示不同；近期预印本只有条件性结果，不能推出唯一最佳 substrate。</reasoning></assumptions>
<evidence_quality><strength>MODERATE</strength><concerns>论文适合提出失效类别，本地无完整 benchmark/纵向实验。E1/E2同论文，E3/E4同repo，不应计四独立源。综合已说明同源不独立。</concerns></evidence_quality>
<missing_perspectives>负例：无重大信号、事实已更新、旧候选被拒、证据缺失、项目切换、重启后索引仍可检索。还要避免从 summary 新增不必要的敏感全文副本。</missing_perspectives>
<implications>故障回归是本次门；完整公开基准和长期收益评估可明确延后。建议验收包含一条本地受控更新/失效案例，不能只做新增召回；若无当前改动触及旧更新路径，不为此重写该模块。来源：Evaluation E1-E6。</implications>
<revised_confidence>HIGH</revised_confidence><revision_reason>适用于失效分类和定向测试；对普遍性能收益置信度LOW。</revision_reason>
</examined_finding>

<open_questions>
1. 实际候选碰撞各条身份与权威如何分辨？该项直接限制可写数据处置。
2. 增量 pending 如何定位本次工作窗口，已有 transcript 缺失/被清理时如何保持 UNRESOLVED？不应为补齐旧历史制造内容。
3. 项目scope参数由哪一个既有pin/grant owner验证？不要将目录名选择等同授权。
4. 新增 summary 与唯一episode源文件的失败顺序如何处理？仅文件名唯一不足以证明索引与原文一致，需来源读取回验。
</open_questions>

<blind_spots>
- 原始报告的代码级版本追溯不完全：OpenAI pin与读取字节未严格绑定；Letta/Hermes文档引用main，没有具体实现commit。因为没有移植其实现，不阻断当前确定性修复；永久报告需保留as-of和限制。
- 缺单独 consensus matrix 的显式一致/条件/未知状态，但主报告已按产品面区分并声明同agent复用，不存在伪造多数票。可用简短表补齐，不必重新研究。
- 五类研究均非本地运行验证。最终Claude与Codex实际hook接线和降级证据仍必须各自补齐；研究PASS绝不能代替Phase4。
- 原生记忆writer是否已启用仍UNKNOWN。当前不添加第二writer的决定是正确的；无需为这个UNKNOWN自动开新服务或启用功能。
</blind_spots>

<synthesis>
这份综合最有价值的部分是把不同产品的记忆机制拆清，再把采纳限制在本地已复现故障。没有证据要求替换存储层，也没有把厂商描述当成收益实验。官方材料主要说明机制可行和概念边界；决定本次必须修什么的是独立运行证据。

仍需压低“借鉴”的实现规模。scope应复用既有授权真值，sync可用起始index拒绝保持聚焦，pending可以沿用原manifest做对账和增量，不必增加队列服务、额外数据库、自动提取模型或长期反思agent。健康展示区分阶段已足够，不应添一个模型去判断每条QUALIFIED是真是假。

候选碰撞是唯一仍受具体历史身份事实约束的方向。全停保护确实有可用性成本，但不能用这个成本授权改ID、覆盖载体或解除保护。先逐条查来源，再按已批准事实与稳定ID要求实施精确修复；不能从外部命名空间方案直接跳到改本地历史数据。

研究阶段可以PASS。该PASS只允许进入已批准计划中的增量工程与定向回归；精确来源pin的表述、版本限制、未完成的长期效果应继续保留。最终成功需要新的隔离进程和双harness实测，证明来源、范围、内容落点、读取与失败恢复，而非单看旧回归绿灯或队列变小。
</synthesis>

</socratic_examination>

## 九项缺口的更小方案

| 审计项 | 最小方向 | 不必要扩张 |
|---|---|---|
| F1预读 | 默认不枚举；获准范围先于文件读取 | 新建第二套权限系统 |
| F2alias归属 | 移除共享推断；显式meta/project按既有授权 | 重写跨语言项目substrate |
| F3错ref | 显式HEAD→upstream并真实ref验证 | 新发布服务 |
| F4吸index | 起始index非空直接拒绝 | 自动stash/reset或复杂index搬运 |
| F5增量漏捕获 | 既有阈值重触发独立未覆盖证据窗口 | 每turn全量提取/无限receipt |
| F6遗留锁 | 所有权明确才恢复，失败可见 | 分布式lease/多机协调 |
| F7归档后中断 | 现有manifest+hash精确对账补事件 | 新事件数据库/搬回原件 |
| F8全局候选阻断 | 先逐条权威裁决，再限定处置范围 | 重编旧ID或简单关碰撞门 |
| F9假健康 | 从既有账本分别报告展示/裁决/落地 | 自动LLM验每条事实、为降数自动归档 |
