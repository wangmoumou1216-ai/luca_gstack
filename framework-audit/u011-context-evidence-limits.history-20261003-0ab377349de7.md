# N03 / U011：Context 已有证据、保留范围与未完成义务

> 后续授权注记（保留原建议时点）：本报告写完后，同一实际 turn 收到 W23 与接口补充6，将原20+32调整为23+29、总52不变，并授权原owner有界修复。下文池余额、只读范围和0单测均描述N03建议阶段，不是对后续W23的限制；新增离线验证与全部累计成本见 `u007-context-bounded-repair-report.md`。J05 FAIL和全生命周期未完成不变。

**DONE_WITH_CONCERNS，仅指本次有界建议交付。当前没有足够证据支持 Context 改进版比现状更有价值、更高效，或已更充分释放 Codex 桌面与 CLI 能力；也没有足够证据判定原 Context 无价值。** 已有证据支持若干可复用工程资产及明确的评估阻断，尚未形成同质量、同权限、同任务的净收益比较。正式开发/隐藏比较为 0；整个框架改造、验收和提交推送目标未完成。

本文由原 Context owner 编写，是建议票而非独立验收票。J05 为真实 quality-gate 作者的独立审查，FAIL，1/6 通过；root 仅将其实际最终回复落盘。本文采用 J05 与当前集成记录，未将落盘者当票作者，也未重新运行测试、模型或探针。范围是统一框架的通用信息供给、控制与交接，不拆平台方案，不重构领域技能。

## 1. 能力、可用入口与净收益

|层次|已有支持|不能据此推出的结论|
|---|---|---|
|官方/既有能力事实|U004 记录 Codex 技能发现、子 Agent、JSONL、interrupt、resume/fork/compact 等能力资料；这些是利用原生能力的候选前提。|文档存在不等于当前入口已提供，更不等于本任务正确消费、质量提高或总成本下降。未重新联网核实版本。|
|当前入口实际可用|当前 B/S 各有 48 个仓库技能记录、48 个名字、无重复；J05 比较 96 份 SKILL 副本字节。P05 实际启动 app-server 单线程单轮，发生 5 次动态工具调用、累计 usage 上报及 interrupt 回应。|技能元数据可见不等于隐式/显式正确选择或依赖完备。单线程可启动不等于真实模型命令读边界合格、原生子任务全账、fresh/compact 恢复合格，也不证明桌面入口净收益。|
|实际任务增量|局部协议与模块测试支持信息阶段开放、精确检查点和依赖控制的实现可行性。|没有正式 B/T/S/I 配对结果，不能裁定同质量效率、长期可靠性、维护收益或更少的人类打断。共享设施的作用不能记作 I 独有收益。|

Codex 桌面与 CLI 是共同方案优先校准环境，不能把 CLI 观察外推成桌面收益。当前 project hooks 为 11 个 trusted、enabled=false，全局 hooks 为 5 个 enabled=true，隔离项目配置已禁用；这是 J05 对该入口的时点观察，不是所有宿主、历史会话或实际控制执行证明。工作流正文、私有模型 binding、全局/真实项目状态不在完整材料闭包中，限制了对真实工作流、项目隔离、长期记忆和在途恢复的判断。

Claude Code 仍只有既有版本/help 及条件能力资料，未证明真实兼容、恢复与净收益。API 分别保留本地 Codex SDK/app-server、托管 Agents API、应用内 Agents SDK、Responses 的证据边界；本地 SDK 未安装的原观察、托管账户/工具/运行未验证等限制不因 P05 消失。模型请求及响应字段不等于后端实际采用证明；当前计划已将该未知从“单独阻断理由”豁免，本文不重新增设门槛。

## 2. 全部 14 个保护用途及旧路径去向

来源记号：A = `u006-context-evidence.md` 的原 source-ID/位置/哈希；M = `u006-current-use-evidence.md` 同 USE 行及合并纠正；U002 = 原用途分母；W20 = Context readiness 报告；R3 = 当前 root 集成记录；J05 = 实际独立审查。以下“保留”是缺乏可放行替代时的现状决定，不是已证明每项净收益为正。14 个 USE 是用途分类，不是 14 个行为样本，更不能将三模块各自覆盖数相加。

|稳定 ID / 共同用途|Context 责任及依赖 owner|已有来源与观察支持程度|当前决定、限制与旧路径去向|
|---|---|---|---|
|USE-01 项目与任务边界|交叉：保留身份、作用域；project-session/身份 owner 与 routing 主责|A S01/S08、M USE-01；case-local 读拒绝有局部证据，真实 pin/child/切换/撤销未验证。|保留可信 pin、事务及合法绝对路径受控读取。依赖身份 owner；**旧 read-grants broker 固定禁用，不恢复**。必要项目选择仍由用户决定。|
|USE-02 理解请求与方法选择|另一 owner 主责：routing；Context 提供目录及发现信息|A S04/S15、M USE-02、R3/J05 技能去重；元数据发现已支持，语义选路、同义表达及完整目录实际消费未知。关键词 resolver 可能仅 canary。|保留语义目录权威和生产选择路径；不能以关键词命中、技能数或 hook 标签替代正确选路。依赖 routing 的实际 consumer。|
|USE-03 适量计划与批准|另一 owner 主责：routing/编排；Context 交叉保存批准范围|A S05/S23、M USE-03；五个真实触发与九个近似信号不同，首次效果前是否正确消费未证。|保留既有批准、关键依赖阻断、计划不等于权限的合同；不得额外造 Agent 触发计划。依赖 routing 识别和编排执行，不新增确认层。|
|USE-04 standalone / 用户选定 workflow|交叉：Context 输入 view、handoff；routing 决定模式，编排运行|A S11/S13/S16/S17、M USE-04；六字段 view、来源绑定与失效检查可定位；真实 workflow 正文/OD 全链未验证。|保留已选模式、技能输入和失效 view 回退。真实领域流程仍走现有 owner；fixture 不能替代领域端到端证明。|
|USE-05 并行、强依赖与失败回收|另一 owner 主责：编排；Context 交叉提供缺口、失败及依赖输入|A S06/S23、W20/J05；真实模块加 fake child 的依赖、失败重试有局部支持，原生并行/取消/父重做成本未知。|保留必要 GAP、失败账、成功且匹配的依赖材料。共享屏障不算 I 的自主守规收益；原生运行旧路径不切换。|
|USE-06 独立验收与真实完成|另一 owner 主责：编排/QG；Context 交叉供给判据及证据|A S05/S13/S23；J05 真实独立 FAIL；当前 driver 未传播 engine invalid 的静态路径已定位。|保留非作者独立门禁与失败历史；工具层 COMPLETED 不能代替真实有效完成。依赖 driver/编排闭合状态传播，本建议不自批验收。|
|USE-07 来源与当前实例完整取证|交叉：验证 owner 主账，Context 内容/范围，编排实际派发|A S06/S07/S20、R3/J05；来源哈希、实例/退出/范围记录有证据，当前顶层失效传播与原生覆盖仍有缺口。|保留 expected/observed、完整范围、截断补齐、当前实例及清理证据。哈希匹配不能单独证明已读、正确消费或真实通过。|
|USE-08 及时正确的信息|Context 主责，routing/编排为 consumer|A S03/S14/S16/S17；17 条件项、投影/校验/回退可定位；离线阶段开放/未来信息拒绝及 P05 case_read 调用有支持。|保留适用 owner 全文读取；index 缺失、不可读或已知陈旧时回完整 manifest。消费正确性、长输入净收益未知，不能据 19100 输入全局删规则或缩 owner。|
|USE-09 更正与恢复连续性|Context 主责，编排续接、routing 提醒交叉|A S09/S23、W20/J05；不可变 hash 检查点、来源事件、family/fresh 的模拟测试支持。真实 native compact/fresh 和在途兼容未证；公开 D06 无撤销事件。|保留原目标、最新有效更正/批准、已完成副作用、失败/未决依赖、检查点及重新核权。最新不可信文本不自动有权；不将 scripted fresh 称真实 compact 或撤销通过。|
|USE-10 授权下继续与必要停止|三模块共同责任，身份及领域权限 owner 参与|A S08/S24、M USE-10、J05；case-local 拒绝及 profile/RPC 对应可见；正式入口可省略完整权限对象，真实模型命令边界未证明。|保留必要 Human Gate、有效批准继承及不受影响部分继续；一律停顿不算安全。readOnly、profile ID、case ack 均不能替代效果授权或读隔离。|
|USE-11 真实模型与环境能力|另一 owner 主责：编排/F；Context 交叉保留事实等级|A S10/S12、U004、R3/J05；实际 app-server 版本/请求响应及单轮控制有证据，后端采用和跨宿主效果未知。|保留角色策略、私有 binding 边界及能力诚实；不读取/复制私有配置，不静默 fallback。CLI、桌面、API 的不同证据不混写成等价。|
|USE-12 临时事实与治理记忆|Context / memory owner 主责|A K8/CONTEXT/S21/S22、M USE-12；inline 6 条事实及投影、提取/归因合同可定位，真实后端/晋升/失败恢复和历史质量未验证。|保留普通启动 summary/search、默认不写、candidate→治理晋升及 static fallback。case-local 不持久化不证明长期记忆收益，也不支持删除治理。|
|USE-13 精确消费已验收交付|交叉：prototype/验证领域 owner 主责，Context 传精确引用|A S24、M USE-13、W20；通用精确 hash/checkpoint 有局部支持，真实证书、helper/consumer/PREACCEPT 整链未证。|保留精确 final/spec/source 引用与 hash，变化后重过既有门禁；不回退 latest/raw。所有未验证生产 consumer 留旧路径。|
|USE-14 原样、复制、改进及领域方法|另一 owner 主责：领域技能，routing/编排衔接；Context 仅传输入与边界|A S13/S24、M USE-14；三分支合同及动效/交付指针可定位，实际分支交付/视觉质量未证；D04 copy tokens 仍是完整要求。|保留三分支、最新有效动效和普通 OD 路径；不以样例遗漏豁免原请求，不借框架任务重构领域方法。审美判断不属 Context，不等于整个 USE 可标 N/A。|

## 3. 可复用资产、当前失败与未测项

**可复用但不等于价值已证明的资产：** 冻结 case/material 身份，来源事件和阶段释放；不可变检查点及真实内容 hash；D05 exit2 有界重试与匹配依赖；D06 保存后 fresh、parent/child 注册及旧 family 终止的协议；明确区分 transport delivery/semantic consumption UNKNOWN 的回执；材料副本与技能入口去重；可追踪的版本、退出、取消、预算和失败证据。事件、ack、依赖写屏障、receipt、fresh 均属 B/T/S/I 共用引擎，降低各条件自由出错空间；不能把引擎拒绝错误写入计作 I 更守规。

当前 R3 修复了 W20 的 UA 解析和技能别名重复入口：接受实际 `tri_system_eval/0.160.0` 前缀并保留精确 UA，祖先 office 子树只保留一次及相对资产。原 95 条记录/47 重复的观察是历史失败，不再是当前阻断。R3 报告 conditions 18/18、driver 35/35、integration 10/10 分别通过，耗时 599.7ms、10767.87725ms、17566.901084ms；protocol 未在该轮重跑，早前 25 项通过仅是既有证据。本文未重跑，也不将这些不同轮次拼成完整套件验收。

**J05 的两个当前评估 driver 缺陷仍阻断正式入口，属于新评估工具问题，不能反推原框架无价值：**

1. `driver.mjs:87–89` 在 `native_command_permissions` 整个缺失时返回 null；`:182–184` 只在对象存在时要求正式有效 proof。后续退回 readOnly，且 `:635–636` 不将对象缺失记 invalid。于是正式 READY 可绕过已接受读边界而启动；无其他违规事件时可记 COMPLETED。J05 指出相应 legacy 离线成功测试，本文只定向核对该静态路径，没有重跑反例。readOnly 不隔离秘密、未来资料或其他 run。
2. `case-protocol.mjs:425–429` 将 EACCES/EPERM/EIO/ENOSPC 等设为 invalid；`:462` 返回 INVALID_RUN。但 `driver.mjs:589–590` 在 finalize 返回后直接设置 COMPLETED，finally 仅检查 fatal/native，未传播 engine 的 invalid。工具级错误被返回后仍可能形成顶层/CLI 成功。这是可定位的状态传播缺陷；协议已有 invalid 标记，无需把它包装为 Context 原理失败。J05 及本次均未执行该运行反例。

proof validator 的结构/版本/hash/声明校验不证明 raw 行为真实。J05 的同一伪文件用于多项 proof 检查仍可结构通过，意味着真实取证和独立内容审查仍不可替代，不意味着应新增签名服务。

|Context 关键层次|能说什么|必须保留的未知|
|---|---|---|
|信息可达|副本、目录 metadata 和 case 工具提供了部分可达性证据。|全部必要 owner、真实 workflow、T/I 技能依赖和运行时注入完整性。|
|实际读取|P05 有 case_read 调用，协议记录对应文本/hash/完整性。|transport receipt 自身不保证模型收悉；可达目录不证明全部必要内容实际读取。|
|语义消费|局部检查点可核材料 identity，独立评判可据轨迹检查。|本轮没有完成任务的配对消费质量证据；ack、屏障及 hash 不能自动证明理解。|
|有效更正|事件来源、检查点内容及 D06 脚本支持受控传递。|真实任务是否覆盖旧解释、正确继承批准；公开 D06 不含撤销，不能声称撤销已测。|
|权限|局部 allowlist 拒绝、profile 形状及响应标识有记录。|实际模型 commandExecution 的完整读边界及子任务继承；P02 命令级 sandbox 通过不覆盖 app-server 全链。|
|恢复|模拟 family 结束、saved checkpoint、fresh 协议可作为工程资产。|真实 native child/compact/fresh、旧项目在途状态和副作用不重做。新会话不天然无全局注入，fork 也不等同 fresh。|

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

## 5. 暂留范围与全生命周期未完成义务

实际不推荐切换的范围：生产条件上下文/index/输入 view/fallback、适用 owner 读取合同、项目作用域与控制交接、批准和更正继承、checkpoint/恢复、记忆治理、精确领域交付 consumer，以及与 routing/编排相接的旧执行路径。评估原型保留为后续工程资产，不提升为生产替代；旧 broker 本已禁用，暂留不包含重新启用它。

**当前无可放行变更，N/A仅限暂留现状的决定**。这同时适用于本次迁移、回退及新生产实施包；不生成三份空实施包冒充落地。将来若推荐改变职责、输入输出、控制或恢复路径，U012 的迁移/回退要求仍有效，不能继承本次 N/A。用户已授权的完整目标未撤销，也不在本次重新索要已有授权。

|既有义务 / 当前阻断|责任归属|闭合所需既有证据，不是本次新增工作授权|
|---|---|---|
|U007 正式入口资格|root/公共 driver owner；Context 协助协议状态证据，非作者 J 复核|两项 driver 缺陷闭合；正式入口必须具备已接受的实际命令读边界；失效状态传至顶层；同版本独立复核。准备20/20耗尽是现实限制，不能用 root 无限代写绕过，也不默认获得追加建设额度。|
|B 保真及 B/T/S/I 公平性|root、材料/条件 owner、F、独立 J|现有材料可构建/发现证据之外，必要 owner/技能依赖、实际入口能力/权限/参数、重启/取消/遥测与 source 版本资格；保留未覆盖真实工作流、项目和长期记忆限制。|
|单次实际成本和控制校准|公共 driver/F/编排 owner，J 验证|当前 fixture 尚未完成实质任务；真实模型命令边界、必要父子遥测/清理和不降低质量的入口资格仍缺。剩余能力1不是盲试许可，不以提高上限或事后改成重任务消除 P05 失败。|
|U008 正式比较|root 统一执行与判据，三个 owner 提供自身接缝|开发/隐藏目前0；既定开发最多24、隐藏最多96是上限，非凑满目标。先满足门禁，冻结质量/锚点后才有可解释的配对质量成本，当前不可裁胜。|
|U009 双向反驳与 U010 裁决/终版复验|非作者独立审查与 root 裁决|四组双向假设仍需处理，暂留也不豁免；J05 readiness 不是 U009 完成，作者建议不是独立票。最终版本需要既有独立裁决与复验。|
|U011 统一结论|root 汇总三个 owner，非作者复核|合并全部14用途的保留去向、重叠成本与未测限制；本报告只完成 Context 有界建议，未完成统一价值裁决。|
|U012 在途迁移与旧路径恢复|root/编排协调，Context 保连续信息，身份与领域 owner 负责自身控制，独立 J|任何将来拟变的风险组都需冻结在途 case，保原目标、最新有效权限/更正、已完成副作用、失败及依赖；同版本正常、拒绝、目标失败回退、旧路径续接证据。当前真实旧状态证据不足，继续留旧。|
|生产实施、统一验收和提交推送|root 管共享文件/版本，原三模块 owner 管精确落地，非作者验收|有可放行结论后才形成真实可执行包，明确职责/版本/接口/错误/真实检查/回退；之后跨模块行为、既有有效行为与旧路径连续性验收，最后正常提交推送。当前无实施包放行、无生产切换、无最终验收、无提交推送。|

以上只是列出主计划 v4、execution-pack v3、J05 已存在的义务与责任，没有新增接口、实验、预算或审批体系。技能内部方法、视觉/动效与领域交付仍归原 owner；若共同控制存在限制，记录到同一方案，不自动分叉成平台工程。

## 6. 版本、读取与本次资源记录

所有相对文件名均位于 `/Users/luca/Desktop/luca_gstack/framework-audit/`。证据来源是既有记录及明确允许的当前源；未读 private/archive、真实下游项目、秘密或全局配置，未联系其他会话。原源码事实以 A 的24个授权源审计及 M 限域纠正为依据，本次没有声称重新全文读取全部原始源码。

|完整读取的输入|SHA256|
|---|---|
|u011-context-evidence-limits-task.md|c856018f7dda44aeb0ef548120c3b4d9fb397eb5c314d613f718d548d577c8a8|
|2026-10-02-tri-system-evaluation-execution-plan-v4.md|f5cec5181287b1e5ed2549a42f92dd082c9744841da09e5b530406f5744fbc67|
|2026-10-02-tri-system-p2-context-execution-pack-v3.md|5a5c3e5f845fe2e6a311e61eb9f86c661121b60c9192a9ace6fe2f6306ed13da|
|u007-readiness-review-r1.md|26e9ee62add8d3d9d2c2541957ad15c5e8b6cb9bd17913596a8553691dfba718|
|u007-readiness-review-r1-envelope.json|eead50f06b542d0bf58c0b309907923b06659adfd6ea54d443b63281e5b468d7|
|u007-root-integration-r3.json|4e1247d854a8190593ac750e9467aab6d8950cda9609c38a52ce7ac06b566d83|
|u006-context-evidence.md|ed1c71ab5b351362cbe39d42e00cf8a2233fab88098a7351b3f8e05c54819d5a|
|u007-context-readiness-integration-report.md|3d9134cfd18cccfdc4b388e7eccba9edc2df7d339fa566dbda1ed57f08a5a95d|
|u002-baseline-and-protected-uses.md|0a29c67a76e2367062d036b87d6e63a088a22b7b763b457208653e7c3feb04d9|
|u006-current-use-evidence.md|3739dae4b09d2b23c9096a84ca842d66ec961891d93042e8c112bb1b3a1c3b70|
|u004-native-capability-facts.md|6a5641ef108d3c8824142694b361f556844e3cbb59f6f78e29d35e8bc4e30b36|

当前集成版只认 `/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/`。已机械计算七文件 hash 与 R3 相同；9a9a 旧副本未用作当前集成证据。除 driver/protocol 下列定向行外，本次没有全文重审七文件。

|当前文件|SHA256|
|---|---|
|case-protocol.mjs|ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8|
|case-protocol.test.mjs|b668c47cfb89cf92b820b3c46cc8574b71c555f2565963a10040fa7f33f966af|
|conditions.mjs|211c7d3530ccff80b589cb8f152e2f916c0a21d95c54d24755d26b5bde2cdf2f|
|conditions.test.mjs|30e75cff9be6573f618062d0ba854379103bd8a47d5eab2b334f5174bfe5b643|
|driver.mjs|8b6152faeaf1cb29db7e9e32493939f37d7a022ec4eb34f3d2f06fd9e0a25dee|
|driver.test.mjs|c91ad8d4a74f63adce1c0fc7a26dd5bc04b9c8d4d0c5308815d917c82f0e59d1|
|integration.test.mjs|cf43047b371b8cecfa7646d3069d3807a4f86c7d912afa5a021245e82068105e|

读取证据：任务83cbc7/哈希0e5201；J/R3完整45d335；主计划初次聚合 d05978 显示截断，82f17b 补135–260，88b831补110–140及261至物理EOF，1–109原可见，未声称截断输出完整。envelope/U002以b225c8完整补齐。pack用281bfe/5e344f两段至EOF；A用d572b0/7de4f3/eb9e96三段至EOF；W20 b30933；F c7056c；M 以 ed7c86 单独全文复读排除聚合疑义。93ef5a校验输入和当前七文件身份、目标原不存在。16e6d8只读driver80–95/170–188/580–596/626–642、protocol417–432/450–467，核对J05两条静态路径。J05所列原始P03–05日志及UA/去重diff未在本次重读，相关运行事实明确采信J05/R3，不冒充本次执行。

时钟：首读前没有可靠记录，首读后首次工具时钟为2026-10-02 19:49:23 UTC；后续19:56:32 UTC。总时长不能从后者倒推出精确起点。动作数在压缩接续前约19个底层调用；之后重新读任务/时钟、两项定向读取、单文件写入和交付核查另计，精确早段总数 UNKNOWN，不把近似写成计费或精确审计值。45分钟/90保守动作/120000可观察token为上限；真实模型token/费用及隐藏开销UNKNOWN。本次实际行为run=0，未启动模型、探针、单测、子Agent或新线程。仅新建本报告，不改代码、测试、ledger、manifest、生产框架或记忆，不commit/push。交付核查只验证14行完整、摘要长度与输入身份；不是独立质量验收。

## 给 root 的摘要（不超过2000字）

DONE_WITH_CONCERNS仅描述N03 Context建议。没有公平任务证据证明Context更有价值、更高效或已释放Codex桌面/CLI能力；未测也不能判无价值。官方能力、当前入口可用和净收益分开；Claude/API延续原限制，一个框架不拆平台方案。

全部USE-01—14已列主责/交叉/另一owner、证据及旧路径。保留现行信息读取/fallback、可信身份、有效批准/更正、检查点、记忆治理和精确交付；旧read-grants broker保持禁用，领域技能不扩大重构。共享事件、ack、屏障、回执及fresh是共同评估设施，不能计作I独有收益，也不能证明语义消费。

当前f351七文件hash与R3一致。W20的UA/技能重复问题已由root修复，不能继续列为当前阻断。J05真实FAIL 1/6：正式入口可省略native权限对象，engine INVALID_RUN未传到顶层，两项driver缺陷尚在；实际命令读隔离、原生child全账/清理、真实恢复及材料闭包仍缺。它们是评估资格限制，不是原框架无价值证据。

P05首次input19100、累计total59541（最终input59306/output235/cache38528已含），134.591秒、5动态工具、0命令、无artifact，越40k后中断并INVALID_RUN。单次fixture不能外推所有简单任务；重连、隐藏开销、完整运行/维护收益UNKNOWN。建设、协调、root修复是已发生成本，不能归零或计作I的净成本。

准备20/20、J05时建议5/32、行为5/144、能力5/6、正式比较0；本次只占建议1、行为0，不更新共享总账，不盲试P06、不增预算。当前无可放行变更，N/A仅限暂留现状的决定；没有三份空实施包。U007资格/成本、U008比较、U009反驳、U010独立裁决/终版、U011统一结论、U012在途迁移及后续三模块实施/统一验收/正常提交推送均保留原责任，整个目标仍未完成。本次仅产出此文件，待root合并和非作者审查。

<!-- FILE_END: u011-context-evidence-limits.md -->
