## 中性事实正文（经核查后可供独立设计者）

一个通用框架，优先核 Codex 桌面与 CLI；API 单列，Claude 仅必要兼容。以下不是框架改造建议或净收益结论。documented=官方正文/帮助或获准复用的原文回执；available=当前可见入口；measured=已有回执的限定观察。三层不能互相替代。

### F01 技能发现、显隐式选择与目录省略

- 用途：USE-02、USE-04、USE-08；入口/版本：Codex 桌面当前会话；Codex CLI 0.160.0。
- documented：初始目录按名称/描述发现，选择后读完整技能正文；目录有容量预算，可能缩短描述或省略条目。显式与按描述隐式调用均有文档，隐式策略可关闭。 [D01：Build skills](https://learn.chatgpt.com/docs/build-skills)（读取日均 2026-10-02，章节/范围见下表）。
- available：本会话可见技能目录及读取工具；CLI features 显示 skill_search=true。
- measured：仅观测到目录短描述与所读技能源描述长短不同、源文件可读；未测显式/自然请求的选择正确性，未证明发生目录省略或其具体算法。
- 前提与限制：目标技能须处于该入口发现范围，调用策略允许，依赖工具实际可用。 有文件、显示名称、已选中、能执行、完成任务是不同状态；现有短描述不能证明所有入口都采用相同裁剪。
- 会改变的比较决定：各条件保有相同已获准原生选择能力；按不可见/不可调用/未选择/选后失败分因，不以未显示误记选路差。
- 最小未决核验：U007-P1：在既有样例中记录实际目录/描述、显式与自然选择、应不触发项及工具依赖；不给条件额外领域事实。

### F02 委派、并发与执行责任

- 用途：USE-03、USE-05、USE-11；入口/版本：Codex 桌面当前工具接口；Codex CLI 0.160.0。
- documented：Codex 可按用户或适用指令委派、发后续指令并回收结果；子任务有独立模型/工具工作。原生并发与外层多个 run 不是同一限制。 [D02：Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)（读取日均 2026-10-02，章节/范围见下表）。
- available：当前工具列出 spawn、message、followup、wait、interrupt；当前团队接口显示 4 个共享槽。CLI feature multi_agent=true。
- measured：本角色被实际派发且接收父级消息；此前同角色已完成研究并回传。未在 F 中新建子 Agent；CLI 委派未测，4 槽不外推为 CLI 或账户上限。
- 前提与限制：显式委派或适用指令，模型/工具权限及可用槽；模型/推理继承或覆盖须按实际回执核实。 功能标志为 true 不证明本次 CLI 任务有工具或成功；创建、空闲、消息到达都不是任务完成。
- 会改变的比较决定：T 可使用共同开放的原生委派；不得将外层进程数当 run 内并发，也不得把汇总者重做隐去。
- 最小未决核验：U007-P2：复用既有委派探针，记录父子 ID、实际模型/工具、开始/终态/回收及共享文件副作用；不新增人员池。

### F03 取消、失败传播与硬截止

- 用途：USE-05、USE-06、USE-10；入口/版本：Codex 桌面 interrupt 接口；本地 app-server/CLI 0.160.0。
- documented：app-server 文档有 turn/interrupt 及 interrupted 终态；后台进程另有终止入口。非交互时无法取得新批准的动作应失败回传。 [D02：Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[D03：Codex App Server](https://learn.chatgpt.com/docs/app-server)（读取日均 2026-10-02，章节/范围见下表）。
- available：桌面 interrupt 工具可见；CLI app-server 帮助存在。所读 codex agents 帮助是浏览界面，未提供可据此确认的非交互 stop 命令。
- measured：只测帮助命令 exit 0；未发取消、未启动服务、未测后代/后台进程是否随父取消终止。
- 前提与限制：必须有正确 thread/turn/process 标识、取消权限及终态观察渠道。 API 接受取消不等于所有子任务/工具已停；关闭客户端或超时进程也不能直接证明服务端停止。
- 会改变的比较决定：未经可靠停止验证的入口不进入需硬截止的配对；失败不得转成空成功。
- 最小未决核验：U007-P2：同一安全探针核父/子/后台工具的取消终态、停止延迟、停止后副作用及错误回传，计入原额度。

### F04 事件、usage 与父子全账

- 用途：USE-03、USE-07、USE-11；入口/版本：Codex CLI exec --json；Codex 桌面当前工具。
- documented：exec JSONL 文档列 thread/turn/item/error 事件，完成示例有 input、cached_input、output、reasoning_output token。 [D04：Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)（读取日均 2026-10-02，章节/范围见下表）。
- available：CLI --json、--output-last-message、--output-schema 帮助存在；当前桌面账户用量工具的接口说明是账户共享窗口，不是单 trial 账单。
- measured：帮助/feature 输出已读；本轮无执行 JSONL、无 token 金额账单。features 中 rollout_budget/token_budget/runtime_metrics 为 false，不能据此推断 JSONL usage 不存在。
- 前提与限制：执行事件可保存且归属到 trial、父子 ID；计费与缓存字段语义、重试范围需实际核对。 文档示例不证明 usage 包含后代、所有重试或全部可计费 token；所读 CLI help 未列硬金额/总 token 上限，不能推断任何配置均无此能力。
- 会改变的比较决定：不得把父窗缩短当全链节省；缺 token/金额记未知。JSONL 是候选证据入口，未通过完整性验证。
- 最小未决核验：U007-P2：与单任务基线对照，核父子事件及 usage 加总是否重叠/漏计，记录退出码、失败和外部工具成本。

### F05 按需加载、压缩与 fresh/fork/resume

- 用途：USE-08、USE-09、USE-13；入口/版本：Codex 桌面文件工具；CLI 0.160.0；本地 app-server。
- documented：技能正文按需加载；app-server 区分新线程、续接、复制历史分叉，并提供异步 compact 入口。CLI 有 exec resume/fork。 [D01：Build skills](https://learn.chatgpt.com/docs/build-skills)、[D03：Codex App Server](https://learn.chatgpt.com/docs/app-server)、[D04：Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)（读取日均 2026-10-02，章节/范围见下表）。
- available：本会话能读取指定资料；CLI resume/fork help 存在。
- measured：资料读取与帮助查询成功；没有压缩事件或恢复行为试验。
- 前提与限制：恢复须有持久会话 ID、合法可得状态及可用权限；ephemeral 不能同时被当作可持久续接保证。 fork 复制历史不等于 fresh；fresh 不等于无全局注入；compact 接受不等于完成或授权无损。
- 会改变的比较决定：一般续接、历史分叉、压缩后续接分别标记；不凭请求过 compact 宣称压缩恢复已验证。
- 最小未决核验：U007-P3：复用既有恢复例，记录状态/压缩事件、最新更正与授权的生效行为、失败与未完依赖。

### F06 隔离目录、配置和 hooks 注入

- 用途：USE-01、USE-10、USE-12；入口/版本：Codex CLI 0.160.0；Codex 桌面当前会话。
- documented：本机 help 明确 -C 工作根、read-only 沙箱、ephemeral、ignore-user-config、ignore-rules；跳过用户配置仍使用原 CODEX_HOME 认证。技能可来自仓库/用户/管理/系统范围；app-server 有 skills/list、hooks/list。 [D01：Build skills](https://learn.chatgpt.com/docs/build-skills)、[D03：Codex App Server](https://learn.chatgpt.com/docs/app-server)、[D04：Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)（读取日均 2026-10-02，章节/范围见下表）。
- available：上述参数被 help 列出；hooks/worktrees feature=true。桌面工具显示可建工作树，但本卡未调用。
- measured：仓库外 /tmp 运行候选 argv+--help，exit 0；只证明参数解析。当前 F 上下文仍带全局和仓库指令。
- 前提与限制：U007 须用批准的专用 fixture 根及相同必要工具/控制；全局、管理策略、技能、插件与 hooks 实际注入须留证。 CWD、工作树、无 daemon、ephemeral、忽略某类文件都不是物理隔离；read-only 不等于禁止读取所有其他目录。
- 会改变的比较决定：忽略配置/规则会改变工具和控制，不能只给某条件使用，也不能以削弱 T 能力换取所谓干净。强制注入列为共同背景。
- 最小未决核验：U007-P1/P4：核实际可见输入、技能/钩子、读写边界及旁路；只列证据，不读取秘密或其他项目。

### F07 两入口比较可行性

- 用途：USE-01、USE-07、USE-10、USE-11；入口/版本：Codex 桌面当前 session（构建版本未核）；CLI 0.160.0。
- documented：官方列桌面及交互 CLI 可用子 Agent；非交互 CLI 可固定运行参数并导出事件。 [D02：Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)、[D04：Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)（读取日均 2026-10-02，章节/范围见下表）。
- available：桌面真实任务/消息/文件工作可见；CLI 有可固定 argv 的 exec 入口；工具目录不完全相同的可能性仍需逐点核。
- measured：桌面会话协作和 F 只读命令实际发生；CLI 认证、模型行为、桌面重置与完整导出均未测。
- 前提与限制：同模型/参数、同权限/资料、可重置、可取证、可停止、能覆盖必要技能工具。 不能将当前桌面工具视为 CLI 已有，也不能用 CLI 分数证明桌面收益；API 入口不同。
- 会改变的比较决定：条件优先 CLI 做需重复/机器取证的主配对；桌面优先核真实交互、相同控制点与恢复差异。CLI 若缺必要工具或取消/全账不成立，入口选择须重评。
- 最小未决核验：U007-P5：两入口复用同一会改变结论的控制点，分别报告；不复制整个矩阵。

### F08 本地集成表面

- 用途：USE-05、USE-07、USE-09、USE-11；入口/版本：本地 Codex SDK / codex app-server 0.160.0。
- documented：复用的官方读取记录说明 SDK 操作本地 Codex 线程；app-server 使用双向 JSON-RPC，协议版本与运行时相关。 [D03：Codex App Server](https://learn.chatgpt.com/docs/app-server)、[R01：Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)（读取日均 2026-10-02，章节/范围见下表）。
- available：app-server help 在本机返回；SDK 是否安装未检查。
- measured：未启动 app-server、未生成 schema、未加载 SDK 或调用模型。
- 前提与限制：对应版本 SDK/runtime、认证、客户端处理事件/批准；部分协议为 experimental。 本地进程协议不等于托管 Agents API，SDK 名称不证明运行位置和恢复等价。
- 会改变的比较决定：仅保留为本地集成机会；已有 CLI 能满足取证时不因文档可用新增集成工程。
- 最小未决核验：仅在 U007 证据通道缺口改变共同用途结论时申请针对性核验；当前不是已运行条件。

### F09 托管运行与状态

- 用途：USE-05、USE-09、USE-11；入口/版本：托管 Agents API（本机访问状态未知）。
- documented：复用官方正文回执：由 OpenAI 托管 harness/session；子 Agent 共享环境，工具支持与 Responses 不同；创建/等待返回不保证任务完成。 [R02：Agents](https://developers.openai.com/api/docs/guides/agents)、[R03：Multi-agent — Agents API](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)（读取日均 2026-10-02，章节/范围见下表）。
- available：没有本卡账户、工具或状态访问证据。
- measured：未调用。
- 前提与限制：API/模型准入、工具执行、数据与执行环境条件均须另核。 不能转移成本、取消、数据或恢复保证到本地 Codex。
- 会改变的比较决定：仅文档类别，不进入已可运行条件或支撑 Codex 收益。
- 最小未决核验：目前无新增 API 探针；若关键用途确需它，由主协调另定范围。

### F10 应用自持循环与状态责任

- 用途：USE-05、USE-09、USE-11；入口/版本：应用内 OpenAI Agents SDK（安装/认证未核）。
- documented：复用官方运行时比较：SDK 在应用内运行；部署、工具、存储和批准由应用负责，与托管 Agents API 分开。 [R02：Agents](https://developers.openai.com/api/docs/guides/agents)（读取日均 2026-10-02，章节/范围见下表）。
- available：无本机安装、初始化或工具回执。
- measured：未调用。
- 前提与限制：应用代码、运行依赖、认证、状态/工具实现；本卡未获安装或工程授权。 不能借本地 Codex SDK 的线程语义或托管 API 持久性为其作保证。
- 会改变的比较决定：单列文档事实，不构造新平台条件。
- 最小未决核验：当前保持未知；仅在会改变统一可行性判断时定向补查。

### F11 模型接口与可选托管编排

- 用途：USE-03、USE-05、USE-09、USE-11；入口/版本：Responses API（本机访问状态未知）。
- documented：复用官方回执：Responses 是模型接口，可有托管多 Agent/自动压缩；特定 multi-agent 模式存在模型范围，且不支持 max_tool_calls 或独立 compact 端点。 [R02：Agents](https://developers.openai.com/api/docs/guides/agents)、[R04：Multi-agent — Responses API](https://developers.openai.com/api/docs/guides/responses-multi-agent)、[R05：Compaction](https://developers.openai.com/api/docs/guides/compaction)（读取日均 2026-10-02，章节/范围见下表）。
- available：无本卡 API 可调用证据；当前 web 工具并非本任务 Responses 集成证明。
- measured：未调用。
- 前提与限制：具体模型/模式、账户与工具协议，应用责任须单独确认。 不支持的参数不能充当预算上限；上下文压缩不是应用状态/授权恢复保证。
- 会改变的比较决定：不将 API 多 Agent 参数映射为本地 CLI 并发/取消；不支撑 Codex 主收益。
- 最小未决核验：无新增 API 工程；需要时先核具体模式，不以通用名称推断。

### F12 技能、恢复与授权更新边界

- 用途：USE-04、USE-09、USE-10、USE-11；入口/版本：Claude Code 2.1.286（仅兼容边界）。
- documented：复用官方记录：子 Agent/团队/恢复有不同历史与规则注入；进程内团队队友不能直接随 resume 恢复。本机 help 表明 safe-mode 禁用含技能在内的自定义，prompt snapshot 有续接复用语义及条件。 [R06：Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)（读取日均 2026-10-02，章节/范围见下表）。
- available：version/help 返回；有 stream-json、hook/subagent-text 事件选项和 API print 金额参数。
- measured：只测 version/help；未登录、执行、启用团队或验证快照策略当前生效。
- 前提与限制：入口/配置/版本和权限；snapshot help 自述未启用记录处无效果。 这些字段不证明账户有 API/团队能力；safe-mode 不是保留技能的公平 T；更改提示文本不等于撤销历史授权。
- 会改变的比较决定：仅影响必要兼容与恢复主张，不分配同等主矩阵；未知时不删除有效用途。
- 最小未决核验：U007-P6 仅当同一控制/恢复差异会改变结论时复用既有追加池；否则保留未知。

### 公共来源范围

D=本轮实际原文；R=获准复用的先前原文读取回执，本轮未重开，不称本轮直接阅读全文。网页未提供可核发布日期时仅登记检索日，未冻结远端字节。

|ID|官方来源|节名及实际范围|证据层|
|---|---|---|---|
|D01|[Build skills](https://learn.chatgpt.com/docs/build-skills)|Progressive disclosure; How ChatGPT and Codex use skills; Where Codex loads local skills; Optional metadata；L939–963, L982–998, L1024–1045|本轮定向正文|
|D02|[Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)|Availability; Triggering; Orchestration and thread controls; Approvals; Custom agents；L911–923, L947–963, L978–985, L1026–1061|本轮定向正文|
|D03|[Codex App Server](https://learn.chatgpt.com/docs/app-server)|Protocol; Message schema; Lifecycle; API overview；L939–982, L1065–1078, L1143–1192|本轮定向正文|
|D04|[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)|Basic usage; Permissions; Make output machine-readable; Authenticate; Resume; Git requirement；L915–977, L1004–1038|本轮定向正文|
|R01|[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)|TypeScript; Python; resume; Sandbox presets；prior routing S5 L909–979/L1013–1029; context S4 L909–975/L1013–1029|先前读取回执复用|
|R02|[Agents](https://developers.openai.com/api/docs/guides/agents)|Choose your starting point; Compare agent runtime options；audit O3 L924–952; orchestration F5 L917–944|先前读取回执复用|
|R03|[Multi-agent — Agents API](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)|Tools available; Observe delegation；orchestration F4 L1180–1202/L1405–1420|先前读取回执复用|
|R04|[Multi-agent — Responses API](https://developers.openai.com/api/docs/guides/responses-multi-agent)|How Multi-agent works; Limitations；orchestration F1 L928–1129/L2220–2229|先前读取回执复用|
|R05|[Compaction](https://developers.openai.com/api/docs/guides/compaction)|Overview; Server-side; Standalone compact endpoint；context S1 L929–948/L1332–1347|先前读取回执复用|
|R06|[Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)|Context and communication; Limitations；orchestration F3 L296–322/L509–520|先前读取回执复用|
