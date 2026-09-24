# 框架轻盈化：完整计划 v3.2（待用户确认，暂不可执行）

状态：PLAN_ONLY。用户已纠正为“先把计划做到位，再执行”。本轮只更新计划和会审记录，不再修改实现、运行候选或发布。范围：NO_PIN；只处理仓库可控部分，外部插件只计量。
来源：用户要求更轻且逻辑链不断；两轮红队后的 `2026-09-21-context-loading-review.md`；用户新增 C10／semantic candidate `SC-20260921-002`。

## 已完成前置

子 agent 身份关联修复已提交并普通推送到 upstream/main：`05aa78adc431231455dabbfae94cccf362eb4339`。只发布三个代码/测试文件和三份报告；精确提交树 `d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0` 在隔离 linked worktree 经正常 pre-commit／commit-msg 验证，98 PASS、0 FAIL、0 WARN。真实部署目录接线静态检查21 PASS，未将静态检查伪称整端活体证明。远端接受推送并提示 Required Checks 尚未满足，因此远端CI仍须单独确认。

用户其余脏工作区未纳入提交。新增 C10 留在本地报告与待评审候选，未改动冻结发布树。

### 必须披露的暂停现场

此前误把“继续”当成了实施批准，工作区已有七份未提交试验改动：AGENTS.md、CLAUDE.md、生成索引，以及 build-agent-context.py、check-agent-context.mjs、test-agent-context.mjs、run-agent-context-ab.mjs。**未提交不等于未生效**：新会话可能读到工作区根合同，因此它们不是正式验收版本，不能作为现状基线。

本轮冻结这些字节，不继续修评分器，不擅自回滚。已有68项mutation与离线self-test结果只是试验记录；独立审查仍指出索引回退评分缺口，不能直接复用为v2验收票。批准实施后，先保存本次试验patch和未跟踪索引到隔离目录，再从已发布基线构建正式候选；复用试验内容须逐项符合本计划，而非默认采纳。

## 决策与范围锁定

成功不是“读的文件少”，而是相同任务、同等完整性下，首次有效工作更早、无关上下文更少，且全任务成本不被转移到后面。优先保完整性，再争取收益。不改品牌、业务要求、模型路由策略、输入/输出含义或授权范围。

| 候选 | v3决定 | 明确不做 |
|---|---|---|
| C1 历史案例 | 只迁移纯案例叙事；现行调查纪律仍热可达 | 不按“历史”标题或日期整段删除 |
| C2 记录命令 | 保留所有触发和三问自省，命令实例冷置 | 不漏首次成功发现新模式；不只保留纠错路径 |
| C3 handoff | 本期不拆；其详版本已在reference中，保留当前入口义务 | 不把已冷置内容算新增收益；不动必含字段/路径/豁免 |
| C4 输入模式 | 从唯一YAML源生成静态、按skill的完整合同视图，复用Read/EOF证据 | 不引入执行型选择器或手工维护副本；不只取required |
| C5 Plan细节 | 分离具名工程模式、设计专属指导、可选模板；核心不动 | 不改变Phase顺序、Plan豁免、研究/HITL门 |
| C6 条件索引 | 机器源唯一，生成可完整重建运行义务与authority的短投影 | 不减少catalog，不把语义判定换成关键词 |
| C7 注入去重 | 延期，保持现状 | 不假定hook输出新鲜、完整或同作用域 |
| C8 待裁治理迁移 | 延期，保持现有消费者 | 不靠“数据还在”声称治理链仍在运行 |
| C9 加载期限 | 按下表逐项调整；触发摘要与最晚边界留热层 | 不把规则移到受保护动作之后 |
| C10 提交负担 | 首期仅环境预检、同轮完整验证的调度/计数清晰化 | 不启用跨命令证据缓存、依赖跳测或代码FAST_COMMIT |

## 16条加载链：触发、消费者、最晚边界与失败处理

以下是拟实施合同，不是允许现在忽略现行根规则。每条的完整owner仍以manifest的target为准；表中名称即其稳定entry ID。热层始终保留触发摘要、owner路径、禁止事项及失败姿态。

| ID／消费者 | 拟加载触发与最晚时机 | 冷层不可用时 |
|---|---|---|
| skill-catalog／根路由 | 选skill或判STOP之前完整发现；显式调用也不删语义核对 | 按原目录/路由源发现；找不到则停，不直接执行 |
| plan-contract／规划者 | 五条件判断留根；命中后在产生计划/断言/审批范围前加载 | 保留K3；不发布可执行计划、不开始受控编排 |
| project-session／身份与I/O | 项目归属/授权裁决、任何项目读取/切换/创建前；仅解释框架且不作这些决定时用内联NO_PIN底线 | 保持NO_PIN，不碰共享别名或项目数据 |
| memory-extraction／记忆裁决 | 用户纠正、记住、治理信号出现后，在判断存不存之前 | 不写；保留未决信号，不自动认定无价值 |
| memory-attribution／归因 | 纠正/绕行需要归属判断时，选择落点前；中途纠正在继续相关工作前处理 | 不晋升或写入未确定归属的记忆 |
| long-session／恢复与效果门 | 长任务开始即知道采证义务；跨阶段、压缩/交接或Git/外部效果前读详版 | 效果前停；保留最小可恢复checkpoint |
| luca-app／指代与呈现 | 指代侧栏/选中内容时回答前；读取/打开前；HTML/Figma交付验证后呈现前。LUCA_APP存在不自动授权操作 | 不编造选中内容，不把“此处”猜成当前项目；缺能力明示 |
| harness-boundary／路由冲突 | 将运行环境注入用于压制路由/规划前 | 安全和能力限制优先，不用偏好抹去语义评估 |
| model-routing／分派者 | 在选择/验证能力档和实际分派前 | 依现行common policy拒绝或继承；critical不得自行降档 |
| review-contract／评审者 | 选择评审对象/独立性/证据标准前；宣称闭合前 | 不宣称独立验收通过 |
| shared-skill-contract／skill执行 | 选定skill后、preamble之前；入口先判采证/handoff/完成义务 | 不执行该skill；不能拿“standalone”豁免安全质量门 |
| workflow-mode／输入门 | skill和mode明确后、输入充分性/override/handoff判断前，读模式owner与所选完整视图 | 视图失败读完整YAML；输入不明则停，不默选宽松模式 |
| orchestration／协调者 | 已批准计划进入执行、第一项分派之前 | 不派发、不产生执行状态；计划不等于批准 |
| memory-system／记忆操作 | 实际write/lint/review/archive/promotion前；纯摘要不加载全手册 | 仅允许原只读摘要/检索，禁止治理写入 |
| framework-maintenance／框架工作 | 选择维护流程、框架审计/基准或任何框架修改前 | NO_PIN；不修改、不发布，不把通用research当维护授权 |
| cross-harness／两端验证 | 设计任何需两端消费的改动时读取，不能拖到最后一句结论前 | 未验证端明确UNKNOWN，不作兼容承诺 |

框架纯问答不是“所有合同皆免读”：问某个门禁自身的规则时仍读其owner才能回答；目录发现、项目授权裁决等发生在答复之前的消费点仍前置。指针本身不得藏进其指向的冷文件。

## 执行原则

- 顺序推进，小批验证；不同时修改加载时机、规则语义和测试评分口径。
- 先做可机械证明等义的投影，再调整规则消费时机。任何重大失败停止依赖阶段。
- 不删除技能发现、隐藏/退役能力识别、项目首次I/O门、人工门、Static Fallback、采证与交接义务。
- C7（重复读取去重）和 C8（启动待裁任务迁移）继续延期，缺少可信等价信号或替代消费者前保持现状。
- 不以文件字节缩短证明性能或安全；不关闭hooks、不用FAST_COMMIT跳过代码提交验证。

## 阶段与明确断言

### P1：基线、文件边界与测试口径冻结

固定真实工作区相关文件哈希、运行环境、当前规则、旧失败样本；冻结与路径无关的行为判据。把旧EOF/路径合规和真正的安全行为分列，不删除旧失败记录。

正式A臂使用实施批准时的发布HEAD（当前为05aa78a），B臂只叠加获批变更，两臂都不夹带本次暂停试验或其他用户WIP。若候选需要未提交依赖，先报告，不自动扩大提交范围。真实混合工作区兼容检查只作为额外证据，不能代替精确候选树测试。

批准范围以文末U1–U4精确路径清单为准。相关CI/package接线只能做指定测试入口的精确增量，不夹带现有未提交修改；禁止改模型政策、项目授权引擎、治理队列算法、全局配置和下游项目。

断言：每项候选都有“触发→权威→最晚加载点→消费者→缺失姿态”；启动前成本与全任务成本分开；外部注入不可测时标UNKNOWN。隔离目录先验检查仓库hooks路径、部署授信对象、浏览器运行权限、依赖是否可用，之后才启动全量验证。

### P2：无损投影，先不改变门禁时机（C6＋Plan摘要精确化）

沿用现有manifest作为唯一源，由 `scripts/build-agent-context.py` 生成面向agent的紧凑条件索引。保留全部语义条件、适用端、target、load_before、失败姿态及完整读取要求；fixtures、登记字段等保留在机器源，不要求agent为找规则先读它们。两个根合同改读该投影；原机器接口不变。

接口定案：manifest仍是原JSON接口；投影保留11个现有运行字段，并可无损重建truth_owner（与target相同时用公开默认，只有不同值显式输出），仅fixtures等纯测试信息冷置。任何新增未分类字段必须使生成失败，不允许悄悄遗漏。生成/检查/回滚作为同一批接线；catalog、六条Static Fallback和各owner语义逐字保持。当前11字段试验不能未经核对直接当正式候选。

Plan五条件中的文件数量精确为创建/修改，不把读取多个文件误算为必须规划。豁免仍由权威Plan合同消费，不能在根摘要中另造第二套。

断言：生成幂等；所有现有entry逐项覆盖；漏一项、改负条件、改最晚边界、投影过期或目标缺失均可检出；两端都能发现同一义务。技能完整目录仍保留，不替换为关键词表。投影省下的字节单独测量，不加上并未变动的冷层冒领收益。

评分回退定案：健康投影要求完整读取；缺失、真实读取失败、已证实语义投影过期三类才允许完整manifest替代。资格来自冻结文件状态/可信工具结果/机器字段对账，不能靠模型声称“过期”。截断不等于不可读，须补读；成功的完整fallback必须发生在受保护决策/动作前。保留原始失败并标RECOVERED，不把它抹成正常读取。任何其他文件失败、越界/符号链接逃逸、部分manifest、伪造失败消息仍拒绝。旧评分结果保留；如离线复评必须另给评分身份和原始样本hash。

### P3：拆分条件细节，保留热触发（C1–C5）

- C1：仅迁移无操作义务的历史叙事。CONTEXT历史标题下的调查纪律保留，不按标题或年代整段搬迁。
- C2：office保持纠正、归因、三问自省及任一YES触发；记录命令细节按需读。覆盖无纠错、无返工、无复犯的首次成功发现。
- C3：保持现有handoff入口和reference不动；本期不为少量文字再造拆分层。
- C4：生成所选skill的静态完整输入合同，包含嵌套子模式和门禁，替代原整表读取义务，接线见下。
- C5：Plan保留规划/审批/豁免核心，平台/facade细则在发布对应Phase前读，不能等执行时才读。

断言：受保护字段、preamble、路径、阶段顺序、Workflow状态含义不变；新调查不引用历史也能获取现行纪律；正向自省仍可触发；必须handoff的任务不会提前DONE；平台限制在用户批准范围形成前已被消费。

落点定案：纯叙事只归档到 `framework-audit/2026-09-21-context-case-extract.md`，CONTEXT留下按主题读取指针；现行调查规范和品牌/只读底线不迁移。记录命令迁至 `.claude/skills/office/references/learning-actions.md`，主合同保留完整触发和禁止自动晋升。

**C4接线定案（取代v2执行型选择器）：**

1. `input-modes.yaml` 不变，仍为唯一手工源。现有 `python3 scripts/build-agent-context.py sync|check` 增加静态投影，不增加运行时CLI或新的执行权限。
2. 输出 `.claude/skill-os/generated/input-modes/<key>.json`；字段固定为 `schema_version=1, source_sha256, skill, group, global, contract`，global完整含原version/principle，contract为所选条目完整深拷贝。重复键、跨组重名、新增未分类全局约束拒绝生成。当前39个key在文末冻结；新增key须更新本次允许文件集，不自动扩大批准。
3. manifest的workflow-mode保持ID、条件和最晚消费门，target改为 `.claude/skill-os/runtime/workflow-mode.md`，truth_owner仍为原YAML。该owner完整读到EOF后，只读对应完整JSON视图；office:48改为同一规则。双根K10认可这个具名加载合同，不能同时保留“必须整份YAML”造成双读。
4. owner明确健康静态视图代替整表；缺失/不可读/已证实过期则完整读原YAML。原源没有该skill条目时保留“无特定override”的原语义，由该skill自身合同及共享规则决定，不能伪造空合同为通过；来源不明则停。
5. 评分只接受fixture已绑定skill的投影路径，核对源hash、完整语义值及真实EOF；不放行整个目录glob、不把读取投影记作读取完整YAML。复用P2的有证据回退规则，不增加“执行脚本输出即可冒充源文件”的通道。

Plan拆分资源路径固定为 `.claude/agents/references/plan-engineering-modes.md`、`plan-design-guidance.md`、`plan-assertion-examples.md`。前两类在提出相关Phase之前加载；模板仅在引用该模板时读。五条件、内门豁免、范围/证据/批准原则、稳定ID和失败策略留主文件。若发现保护区要求本体留在SKILL，保留本体，不借迁移改变其含义。

### P4：调整实际加载时机（C9）

仅在P2/P3可达性通过后，将“所有匹配材料回答前读完”改为逐条最晚安全边界。分类规则在分类前，计划规则在计划形成前，项目规则在首次项目读取前，执行规则在动作前，完成规则中影响采证的部分仍在任务入口。

断言：多轮从解释转执行、从NO_PIN转项目、compact/resume后的首动作、owner不可读、hook未注入、纯语义无关键词命中均不会绕门。记录实际读取/动作顺序，最终回答声称遵守不算证明。

### P5：提交验证负担（C10，独立设计与裁决）

先建立改动→依赖→检查矩阵和实测耗时。明确区分框架全量/嵌套检查成本，与本次agent选错隔离路径、误用CI参数、未提前处理浏览器权限造成的重复成本。

首期确定为“同轮完整验证组合＋环境预检”，不启用跨命令证明缓存或按依赖跳测。已存在的Claude回归去重不计新收益。Codex独立检查默认仍跑完整自身检查与两套Claude回归；聚合入口用具名 `--delegate-claude-regression` 选择不含Claude回归的子集，该部分标DELEGATED而非PASS，子集报告不得称全量通过；忽略继承的旧覆盖环境变量，不接受其作为成功证据。

完整入口保留C11和S30，S30排在S34之前，逐项结果来自当前子进程退出码；任一失败/中断/超时都不能得到全量成功。DELEGATED不计为通过；重启不继承结果，无持久缓存。环境预检在重套件前核对工具、依赖、可写临时目录、浏览器实际可启动性、仓库/部署检查模式；无浏览器或权限则明确BLOCKED，不安装、不自动授信、不把CI=1当作--ci。

Git hooks本期不改：代码提交仍走全量；commit-msg仍验完整暂存快照；Git定位环境变量隔离仍保留。环境预检对个人配置的检查只报告明确作用域，不修改个人配置。隔离发布使用已验证的linked worktree并校验精确树；它不能代替环境预检。跨命令缓存/按影响面跳测作为以后独立提案，不能夹带上线。

断言：陈旧证明不能复用；漏列依赖/删掉关键门必须被负例检出；隔离树与发布树不一致必须停；远端Required Checks不能被本地报告冒充。先审查再改变提交策略，本次记录一票不等于批准跳过验证。

## 验证矩阵与验收

| 测试组 | 必测正例 | 必须拒绝/暴露的反例 |
|---|---|---|
| T1 投影与发现 | 16条完整重建、隐藏/退役目录、无关键词语义命中 | 漏字段/entry/authority、新字段未分类、用关键词漏掉STOP |
| T2 索引回退 | 正常index；真实缺失/不可读/过期后完整源恢复 | 口头声称过期、截断当不可读、部分源、其他失败借机放行 |
| T3 Plan/HITL | 三文件创建/修改触发；纯三文件读取不单独触发；保留内门豁免 | 普通读取升级为重流程、审批前漏平台规则、默认代替真人 |
| T4 作用域 | NO_PIN问答；首次项目读前裁决；合法事务 | 先跟随docs别名再补规则、旧授权/错session/越界路径 |
| T5 skill与交接 | standalone和Workflow分别启动、重型handoff、输入完整嵌套子模式 | 缺handoff却DONE、只取required导致recover/traceable模式误判 |
| T6 记忆 | 中途纠正、正向首次发现新模式、默认不存 | 到Stop才发现漏信号、无归因晋升、把待裁存储当已裁决 |
| T7 多轮/降级 | 解释→执行、框架→项目、compact/resume、无hook、owner失败 | 用上一轮“已读”跳当前授权、fallback外置后底线丢失 |
| T8 app/模型/评审 | 选中对象先解析、交付呈现、角色按政策、独立评审 | 猜侧栏内容、模型失败擅自降档、自审冒充独立票 |
| T9 验证组合 | 独立检查全跑；聚合每项一次；明确DELEGATED | 删除C11/S30、伪造覆盖变量、失败/超时变PASS、重复计数 |
| T10 发布隔离 | 精确树与验证版本一致、脏工作区保留 | 部分暂存/提交中途漂移、Git变量污染fixture、远端CI未过却称通过 |

所有确定性分支逐一跑正反例，不抽样替代字段/消费者覆盖。T4/T5/T6/T7的动作验证用隔离数据和本地拒绝/写入回执，不能只问模型“会不会遵守”；不操作真实下游或外部平台。未改动的外部平台仅验证其授权边界，不宣称其服务本身得到全量回归。

1. 先跑确定性正负例、投影对账及mutation，再冻结评分器；不靠不断增加live样本修评分器漏洞。
2. 真实对照分Claude/Codex、发布基线/候选版；固定T1语义发现、T2回退、T3纯读与规划、T4首读作用域、T5模式与交接、T6正向自省、T7多轮恢复七类会话。每类每端每臂两次，共56个会话，上限包含校准，后续不得自行扩量。先各端各臂跑T2/T3的第一份共8个校准会话；协议未变才可进入相同冻结批次，否则旧票仅保留为校准证据并重新申请预算。执行前展示模型/版本/工具配置及可得费用估计；身份不明或缺端则STOP/UNKNOWN，不替换默认强模型补票。费用无法估计时先报未知并征求这56个会话上限的单独确认，不默认开跑。
3. 收益统一裁决：固定轻量组T1/T2/T3，逐类成对比较后等权汇总，前置仓库交付字节均值下降至少30%；T1–T7每类全任务交付字节中位数均不得增加（1%增加也不能自动PASS）。实际token及耗时逐类另列，其成对中位数也不得增加才可宣称完整性能PASS；缺测或同类两次方向相反记INCONCLUSIVE，不把字节变小当作更快。总判定按以下优先级取首个命中项，所有底层失败/未知仍逐项保留：任一安全失败→FAIL；否则任一已测全任务指标增重且该项不是方向冲突→REGRESSION；否则存在缺测/方向冲突→INCONCLUSIVE；否则前置收益不足30%→NO_BENEFIT；否则才是PASS。FAIL、REGRESSION、INCONCLUSIVE、NO_BENEFIT全部不通过G5，不自动扩样、不偷调阈值；将结果交用户另裁是否接受更小范围/新阈值。
4. 安全行为有新增失败即停止该候选。相应旧反例必须仍能被测试检出；两端分别记录缺口。
5. 每批独立审查；红队最多两轮仍有重大未决项则交用户裁决，不靠更多流程掩盖未通过。

30%不是事实或硬删规则的理由。一次性静态字节减少、缓存命中和付费token分别记录，不用大量简单问答稀释重任务退化；新阈值只能由用户重新裁定并对未来实验生效，不能重标旧失败。两次试验只作回归筛查，不宣称统计稳定或绝对零风险。C10首期不承诺减少测试集合或明显加速，其门是全量集合不变、零虚报及环境错误提前暴露。

### 多轮与动作验证的执行面

沿用 `scripts/run-agent-context-ab.mjs` 作为唯一采样/证据入口，不造第二份评分状态。单轮模式保留；增加具名fixture场景，不靠复制对话文本冒充恢复。Codex用已有app-server的thread/start与turn/start链，Claude使用本地CLI已暴露的session-id/resume；先做能力校准，缺支持则停止该端而非改成假多轮。多轮“会话”包含其连续回合，56上限不是每回合重新计一份。

执行型fixture只允许预先声明的临时数据、调用和回执；生产根、项目/记忆/配置只读。复用现有原生事件/事务/host fixture验证真实允许与拒绝，不创建通用执行引擎。既判模型是否在保护动作前加载，也判实际效果；沙箱挡住越界不能掩盖模型已发起违规动作。无法完成真实效果验证时记UNKNOWN，禁止退化成只看claims仍报PASS。

## 精确文件与执行合同（用户批准前冻结）

以下清单是最大允许集合，未必每个文件都需改；之外的实现文件需要delta计划和用户批准。本轮不修改它们。新生成文件是机器产物，不是新增skill/路由入口。

- **U1 / P2**：`AGENTS.md`、`CLAUDE.md`、`.claude/skill-os/generated/context-index.md`、`scripts/build-agent-context.py`、`scripts/check-agent-context.mjs`、`scripts/test-agent-context.mjs`、`scripts/run-agent-context-ab.mjs`、`scripts/agent-context-branch-fixtures.mjs`、`scripts/test-agent-context-branch-fixtures.mjs`。
- **U2 / P3**：`CONTEXT.md`、`framework-audit/2026-09-21-context-case-extract.md`、`.claude/skills/office/SKILL.md`、`.claude/skills/office/references/learning-actions.md`、`.claude/agents/plan-agent.md`、`.claude/agents/references/plan-engineering-modes.md`、`.claude/agents/references/plan-design-guidance.md`、`.claude/agents/references/plan-assertion-examples.md`、`.claude/skill-os/runtime/workflow-mode.md`、`.claude/skill-os/agent-context-manifest.json`；同批明确允许再次修改 `AGENTS.md`、`CLAUDE.md`、`.claude/skill-os/generated/context-index.md`、`scripts/build-agent-context.py`、`scripts/check-agent-context.mjs`、`scripts/test-agent-context.mjs`、`scripts/run-agent-context-ab.mjs`、`scripts/agent-context-branch-fixtures.mjs`、`scripts/test-agent-context-branch-fixtures.mjs`，仅用于P3的拆分、C4替代接线与对应生成/验证，不提前调整P4加载期限。原input-modes.yaml保持不改。上述共享路径在U1完成后串行修改，并在U2同批验收；不得延至U3才补齐C4入口。
- **U3 / P4**：`AGENTS.md`、`CLAUDE.md`、`.claude/skill-os/agent-root-kernel.json`、`.claude/skill-os/agent-context-manifest.json`、`.claude/skill-os/generated/context-index.md`、`.claude/skill-os/runtime/project-session.md`、`.claude/skill-os/runtime/luca-app.md`、`.claude/skill-os/runtime/cross-harness.md`、`.claude/skill-os/runtime/framework-maintenance.md`。复用U1生成器/检查器/评分器/fixtures；只改对应加载文字，不改owner内部授权/状态逻辑。生成索引仅同批同步获批的P4加载期限，并与manifest一起验收；不扩大U1–U4总文件并集。其他owner保持原文，以热触发和manifest消费期限衔接；发现其他owner文字冲突则先补delta审批，不能扩大名单。
- **U4 / P5**：`scripts/verify.sh`、`scripts/verify-codex-wiring.mjs`、`scripts/test-verify-composition.mjs`（新）、`package.json`、`.github/workflows/ci.yml`。后两者仅新增组合测试入口；不改变其他现有检查/用户WIP。`.githooks/pre-commit`、`.githooks/commit-msg`、`scripts/test-pre-commit-env.mjs`只读回归，不改。
- **U2生成闭集**：`.claude/skill-os/generated/input-modes/<key>.json`，key固定为：auto, handoff, wait-what, domain-modeling, writing-for-agents, magicpath, open-design, idea, deepresearch, quick-research, brainstorm, superpowers-brainstorming, ux-research, ux-brainstorm, design-brief, html-prototype, figma-demo, tech-spec, task-plan, grilling, diagnosing-bugs, resolving-merge-conflicts, to-spec, to-tickets, wayfinder, implement, code-hygiene, code-review, codebase-design, code-recon, muse-req-triage, insight-synthesis, research-kit, ux-writing, compare, ux-audit, redteam, evals, retro。生成清单须恰为39项；任意额外文件拒绝。

编排固定为Sequential、task_execution：主agent负责U1–U4实现，每批一个独立quality-gate只读验收；实现用anchor，评审按现行受信任路由选择MR-004，reasoning effort不变。U2依赖U1，U3依赖U2，U4与加载逻辑独立但单独验收；每批产物是精确diff、原字节/逆patch及测试回执，存于本次framework-audit主题下，不写项目workflow-state。任何关键失败停止依赖阶段。

### 可执行的阻断断言

下列为实施后运行的命令，不是本轮已运行证据；新增断言由对应U-ID加入现有测试或U4新文件，不能只保留自然语言清单。

```sh
# A1 [BLOCKING] U1/U2：生成一致、权威与运行字段不漏
python3 scripts/build-agent-context.py check
node scripts/check-agent-context.mjs
node scripts/test-agent-context.mjs
# A2 [BLOCKING] U1/U3：两端离线评分正反例、精确回退、时序反例
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness codex --fixture F1 --trials 1 --concurrency 1 --self-test
node scripts/run-agent-context-ab.mjs --root . --arm candidate --harness claude --fixture F1 --trials 1 --concurrency 1 --self-test
# A3 [BLOCKING] U2/U3：共享规则、能力入口和双根不变式
bash scripts/validate-skills.sh
node scripts/check-capability-parity.mjs
node scripts/check-agents-parity.mjs
node scripts/test-semantic-parity.mjs
# A4 [BLOCKING] U4：同轮覆盖、假凭证、缺门禁、失败/超时反例
node scripts/test-verify-composition.mjs
node scripts/test-pre-commit-env.mjs
# A5 [BLOCKING] 最终候选精确树：不得因局部测试绿而省略仓库门
bash scripts/verify.sh
git diff --check
```

真实56会话命令在G1以原生能力预检后的精确运行参数和费用呈现，再由用户批准实验范围；未批准不运行，不能以此声称计划已经得到行为验证。A1–A5与T1–T10逐项对照，任何一项缺证据即UNKNOWN，不由总体PASS计数抵消。

## 阶段门与回退

G0：用户批准本计划的具体版本与范围后才解除实施暂停；批准计划不包含Git发布。G1：基线、文件清单和评分器离线反例通过后才开始候选生成。G2：P2投影/回退通过后才做P3拆分。G3：P3所有入口义务仍可达才调整P4期限。G4：P5与加载改动分批验收，不让总成本收益掩盖授权退化。G5：最终精确树、两端适用场景、独立评审和收益判定闭合后，另行请求发布授权。

每批保存批准前字节、patch和测试身份；失败停止下游，不保留“已完成”状态。回退只应用该批可验证逆补丁或撤回其候选，不reset工作区，不覆盖用户后来改动；出现重叠先停。投影失败可恢复源读取；命令/Plan拆分失败还原原owner及指针；期限失败恢复旧更早期限；C10失败恢复既有全量调用。若批间已有依赖，先退依赖批再退被依赖批。所有失败、回退和旧红队票留存。

## 计划会审（终版票见独立记录）

历史：C10只读取证和完整v2专家审查已完成。v2为FAIL：C4替代接线不完整、范围/命令未冻结、成本裁决矛盾；v3针对三项修订。此前独立红队因native thread limit未启动，该缺票不计完成。

本次v3首轮：独立专家2/3，C4及性能门通过，U2未明示双根/索引同批修改范围未过；独立红队14/14，仅计划充分性通过。v3.1据此明确U2完整路径，并将原有非PASS禁止过G5的规则展开为穷尽、有优先级的判定；未扩展U1–U4总路径并集、实验预算或实施授权。这些是计划合同补全，不是实施修复，也未实现30%收益。

v3.1终审：红队14/14，专家2/3，唯一未决为U3缺少生成索引的明确同步写入范围。用户随后明确同意“仅补齐这个计划漏项，再做一次终版复核”；v3.2只补该路径及同批期限同步约束，不实施、不运行实验、不发布。这是用户授权的一次额外复核，不自动重置两轮上限。

两位评审必须对同一v3.2完整字节重新回验；终版SHA、票据、受信任调度证据及残余风险只在 `framework-audit/2026-09-21-context-lightening-plan-review.md` 记录，红队问题留在同主题redteam报告。未获两票与用户对最终计划的实施确认，不解除G0。保留旧FAIL与缺票，不以新票改写历史。

## 下一步与发布边界

当前下一步只做计划会审与修订。无论现有试验代码是否通过某些测试，都不能绕过G0。待用户明确批准最终计划，再处理暂停现场并进入P1；不因“go/继续”脱离本轮“只完善计划”的明确语境而自行恢复实施。
