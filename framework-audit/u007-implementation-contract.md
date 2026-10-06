# U007 第一批验证代码：共同合同

状态：BUILD_AUTHORIZED / BEHAVIOR_NOT_RELEASED。J03、J04 均真实 PASS6/6；首次解盲登记 u007-first-unblind.json。主协调全文读取独立候选 2db8aa + 38aa7d 到 EOF。当前工作是在获准隔离范围实现可运行的比较试件，生产框架尚不切换。

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



## 1. 这批实际交付

在三个现有干净工作树中实现四个比较条件的材料构建、一个阶段材料/事件引擎、一个 Codex app-server 运行入口。复用已有源码中的取证/进程组停止方法，禁止运行旧 G5 矩阵、另造通用编排平台或四套生产框架。代码由原三个会话承担；主协调拥有本合同、比较 manifest、集成和实验释放。最新用户已授权持续落地、测试、review、最终提交与推送，不重新询问普通实现选择。

三个工作树当前都为 HEAD 05120197073144c0f46b6fb30a192733d529cc4f，tracked/untracked clean（主核 3dae49）。源事实根 R=/Users/luca/Desktop/luca_gstack。不要编辑 R 的生产源、原日志、全局配置、framework/、真实项目或 docs/ 别名。

你不是唯一执行者。不得还原、覆盖其他人修改；只改自己的文件，适配已冻结公共接口。可以在本工作树创建 codex/ 前缀本地分支；本批不自行 commit/push，主协调之后统一收口。若共享合同真有缺口，先在当前会话说明精确字段和影响，不私自另造接口；主协调会主动回收。

## 2. 比较条件的边界

全部条件取得相同案例原始事实、owner 方法、当前授权、原生工具与原生必要控制。所有候选只见当前阶段合法材料，不见答案、评分 expected、未来事件或别的 run。driver 的阶段送达/事件/日志是共同设施，不算 I 独有收益。保留原生基础系统说明，不通过 baseInstructions 覆盖原生能力。不得关闭全局规则；仅允许本次隔离进程的配置，具体效果先记录、后核验。

- **B 当前基线**：冻结 R 源的当前 root 与 owner/skill 机制；复制以 u002-source-manifest.json 为身份依据的必要条件材料，原字节不改。明确实际能启动的入口与未接线部分，不能只放一段概述冒充现状。相对比较必须有合格 B。
- **T 原生最薄**：原生理解、文件/计算/获准协作能力 + 原请求/owner/资料/必要控制。允许正常自检、列交付项、记录失败和恢复引用，不把这些剥掉来人为弱化 T。无 luca 额外逐阶段确认、固定五步路由或 M1—M3 强制记录格式。
- **S 针对性精简**：从 B 定向缩减与当前任务无关的启动读取和重复路由工作。保留项目/权限、真实 Plan 触发与已批准范围继承、显式方法、失败/证据/恢复、人类决定及长期记忆控制；条件目录/owner 只在相关语义命中时加载。对不涉及 framework、skill、project、memory 或跨会话恢复的简单有界任务，直接读任务 owner，不强制先读整份框架目录/记忆摘要。对技能/框架/项目等实际匹配任务，继续用原 owner。只改条件副本的入口指令，不重构领域技能。逐行列删去的义务、触发条件、用途去向和同样事实仍可达的路径；不以行数宣称收益。
- **I 独立方案**：落实 D 的“原生执行，实际交接才补状态”。多交付/显式流程启用 M1 原请求→交付对应；跨执行者/阶段消费启用 M2 真实终态/对象/尝试回执；更正/授权变化/漂移/恢复启用 M3 当前有效状态与原事件关系。简单任务不要求额外表格。最多主执行者+一名子执行者的试件组织上限；不能证实委派时顺序完成并明确限制。不要复制 D 案例章节的具体答案、数字、文案、对象 ID 或 hash 到候选提示。提示只从其通用机制章节编译，完整用户请求始终保留。

S 是现状小范围 Context/路由精简，I 是独立推导的按交接补状态；二者不预设同效。若实际实现相同，可提出有具体机制/输入/控制证据的合并，最终由主协调冻结。开发/隐藏前固定候选字节，不看成绩再替换。

## 3. 公共模块 API（Node ESM，无新增依赖）

路径均以各自工作树为根。实现文件固定如下，可用 Node 内置模块。

### conditions.mjs — 路由 owner

导出 `CONDITION_IDS`（B/T/S/I）与 `async materializeCondition({conditionId, sourceRoot, sourceManifestPath, destination})`。

返回 JSON 可序列化 `{id, root, instructionFiles, allowedReadPaths, sourceBindings, complexity, limitations}`。root 为新建隔离条件目录；instructionFiles 为相对路径列表；allowedReadPaths 仅真实规则/方法材料相对路径，不含答案或开发 cases。sourceBindings 记录源文件与实际副本身份/有意 patch。complexity 保留各计数单位，不合成分数。绝不修改源目录、不覆盖已有 destination、不保留指向源根/全局/私有目录的逃逸 symlink。可以在条件目录新建 AGENTS.md；T/I 不自动载入 B 的旧 root。

B/S 用当前必要源材料，T/I 的通用 owner 领域输入由 case engine 同样送达。禁止从公开答案填结果，也不把候选规则包装成比真实用户权限更高的授权。构建模块不启动模型、driver、联网或全套 suite。

### case-protocol.mjs — Context owner

导出 `TOOL_DEFINITIONS`（本机 DynamicToolSpec 的 function 形状）与 `createCaseRuntime({caseData, caseRoot, evidenceRoot, conditionReadPaths=[]})`。

返回对象：`initialMessage()`（字符串）；`handleTool({name, arguments, threadId, turnId})`（可异步）；`resumeMessage()`（字符串）；`snapshot()`（JSON可序列化）；`finalize({terminalMessage})`（可异步）。

handleTool 返回 `{text, isError, control}`；control 为 null、`{type:'fresh_context'}` 或 `{type:'ready_for_final'}`。四工具命名固定 `case_read`、`case_write`、`case_checkpoint`、`case_question`。参数 schema 由你在 TOOL_DEFINITIONS 精确声明，driver 直接透传，不能猜参数。

case_read 只读已到阶段且已授权的案例文件及明确交付的条件文件；case_write 是唯一案例产物写入入口，限制 write_paths、当前授权、阶段及路径/symlink，保存先后/字节摘要和真实失败。conditionReadPaths 为额外明确交付的只读文件绝对路径，不赋写权。驱动器状态与原始案例存在 evidenceRoot，不可作为候选读取路径；案例 sandbox 永远没有 answers/expected/future-stage 内容。

必须使用 frozen case 的 mandatory_checkpoints、stored event order、failure_recovery_script 和 material stage（不是手写按 D01—D06 ID 分支）。将 request 与 inputs 两个尚无作用差异的只读握手合并投放可作为优化建议，但不得实际绕过规定节点。禁止提前释放未来事件。D05 retry 只在候选请求且 token/次数合法后投放。D06 checkpoint 保存确认后返回 fresh_context，恢复包仅合法公开字段、实际 checkpoint、已到事件/材料；原历史保留，不重新从初态跑。真实 choice 只由已冻事件投放，case_question 不创造事实/权限。工具可回 driver 声明式响应，禁止执行 fixture 中任意 shell。

snapshot/finalize 返回运行证据路径、当前阶段、事件/文件访问与写入账、原失败、产物身份及 protocol errors。不要把语义质量或必要控制自判为 PASS；未授权/提前请求须如实记候选动作和拒绝，不能被 driver 修正后洗成候选合规。精确完整读、截断和实际消费范围使用既有 evidence-receipts 方法。公共 D04 copy tokens 仍是完整交付要求，D06 仅 fresh 恢复，不称真实 compact。

### driver.mjs — 编排 owner

导出 `async runTrial({manifestPath, caseFile, caseId, conditionId, trial, outputRoot, codexCommand='codex'})`；直接 CLI 参数为 `--manifest --cases --case --condition --trial --out`（必需值均具体）。导入上述两个模块。缺上游文件时用独立 adapter stub 做自身离线测试，禁止写别人拥有的文件；主协调集成时使用真模块。

默认禁止真实模型执行，只有 manifest 的 runtime_release.status='READY' 且精确绑定当前 driver/condition/case identity 时才可 run；BUILD_ONLY 清楚非零拒绝。模块单测使用注入 fake transport，不消费正式模型 run。

运行入口优先本机 Codex app-server stdio。保留原生基本能力，不能直接照搬 workflow-runner 关全工具当成 T 能力。共同案例明确禁止外部效果：网络/外部应用权限限制各条件相同。具体 invocation/config/注入记录后由主协调和 J 核公平性。可以采用共同 read-only 原生沙箱 + case_write 回调受控写入；本机实际权限/工具/子Agent可用性先标未知，探针由主协调另释放。读取也要留下可核证据：原生 shell/子Agent的读取无法核完整范围时标 UNKNOWN/污染，不把“文件可见”冒充实际访问证据。

实现 initialize→thread/start→turn/start，dynamic tool 回调交给 case runtime，记录完整双向 RPC/原生工具/错误/usage/有效模型配置。fresh_context 时真实 interrupt 当前 turn，确认终态后新 thread，重注入相同 condition 和合法 resumeMessage；记录这是 fresh，不是 compact。不要为每个普通 checkpoint 重开线程。子Agent需确认相关 thread 及终态/资源，不吞子失败或把 fixture_worker 当真原生子Agent。

墙钟是整链绝对截止，不按每次RPC重置；工具动作父子合计；计量缺失保留 unknown。触顶或取消：请求 turn/interrupt，确认响应和实际终态，再进程组 SIGTERM/SIGKILL 清理；领导进程先退也要清剩余后代。原始 stdout/stderr/RPC/未完 turn、真实非零/超时证据永久保存；cleanup 后仍可读。不能清空 timer 后丢子进程。原生 token total 是累计值，不能逐事件重复加；cache 字段不重复加到 input。外部费用未知。

finalize 只产运行状态/终态产物快照和 protocol/scope/transport 证据；独立评分随后完成。缺材料、阶段投放错误、污染、driver失败分别留证 INVALID_RUN；候选错误与真实失败不得隐藏。driver 不读取或输出答案/评分正文，只有 case runtime 机械加载整题后安全投放；隐藏执行权限将另在原冻结映射下释放。

## 4. 当前可复用依据与本机协议

- 三A静态汇总和各自原报告；D独立稿已允许解盲，输入资格及通用机制已分别复核。
- `scripts/run-agent-context-ab.mjs` run() L546–605 的进程组/超时证据；invokeG5Codex L4757–4953 的 stdio RPC/identity/turn/read journal，仅作为方法参考，其旧 G5 条件/关工具参数/逐turn timeout 不直接沿用。metrics L4070–4122 说明未知usage不能填0。
- 本机 `codex app-server generate-json-schema --experimental` 已成功生成（无模型/网络/正式run）：见 u007-local-protocol-location.json，目录 /var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-u007-protocol-eh1f4k95。ThreadStart/TurnStart、DynamicToolCall Params/Response、TokenUsage、TurnInterrupt 的实际schema优先；multiAgentMode 已标 deprecated/ignored，不靠设置它证明并发。dynamic function 需 type/name/description/inputSchema；回调结果为 contentItems inputText 与 success。thread/start permissions 不能与 sandbox 并用。
- 首次读取必要方法 owner 到 EOF：plan-agent 的退出合同、evidence-receipts、project-verification、long-session；你已读过且版本未变可复用，不反复抄写全文。后续实际行为 TEST 尚未构造/放行，缺具体参数/实例就保持 BUILD_ONLY。

## 5. 验收与资源

每个模块交真实代码/diff、实际 unit test 命令与退出、保护性反例、源读取边界、复杂度单位/新失败面/已知缺口。不写仅匹配实现字符串的测试。必须有离线错误场景：逃逸/未来资料拒绝；失败不洗白；同名ID保持；过期/异物回执；重复事件/非法retry；超时保留证据与子进程终止；结果存在不代表完成。按各自责任选择相关测试，不三人复制全套。

每人本次1工作调用，45分钟/90动作/120000可观测token上限；实际token不可得则unknown。可运行本模块 Node 单元测试和确定性 fake transport/fixture，无真实模型、无正式案例run、无额外Agent/网络/安装；正式run本批额度0。工程代码不受“只写报告”旧卡约束，旧卡已交付完结。本合同明确授权限定新文件及其离线验证。

三模块完成后主协调集成→跨模块离线测试→按必要项登记最小真实能力探针（共享最多6）→独立 U007 就绪复核→开发24以内的公平比较。公共接口仅主协调可改；准备/复核/行为账始终一份，不新建审批体系。

<!-- FILE_END: u007-implementation-contract.md -->
