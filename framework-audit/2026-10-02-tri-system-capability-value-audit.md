# 三体系计划的能力与净价值核查

日期：2026-10-02。主协调：当前主 session。状态：DONE_WITH_CONCERNS，官方资料与计划对齐核查完成，已合入主计划v4和模块v3；尚非G-P2通过或框架收益结论。

**最新用户明确侧重：以Codex桌面和Codex CLI为主要研究及验证环境；Claude Code只保留必要兼容/控制检查。** API分开记录能力边界。此要求已同步三会话，写入四份当前计划，不平分平台预算或虚构使用频率。

## 当前判断

修订计划比初稿更可执行、比较更公平；尚未证明框架更高效、更有价值。正式 P3—P6 行为 run 为 0。规划本身增加了阅读和协调成本，这些成本不能隐去，也不能把计划篇幅、审批数量或 Agent 数量当作先进性。

原始大目标没有改变：在同样用户用途和必要控制下，充分使用当前模型与实际运行环境的能力，使框架额外机制有可证明的净价值。质量优先；减少用户等待、澄清、返工、整链调用和维护负担同样要测。

主协调确认上一版有一项实质缺口：v3 的 F 侧重“能否执行比较”，虽然 T 已定义为原生最薄对照、D 要考虑最小替代，但缺少当前官方能力→可能改变的职责→比较处置的具体连接。因此不能因 S01—S07 细节已修复就宣称用户核心要求全部满足。前几轮把监督重点放在方法完整性，能力机会核查不足，主协调承担这项遗漏。

## 以前到底读了什么

- P1 报告列出 8 个一手方法来源、reader、实际章节/行范围及工具引用。它支持评估方法选择，不是 Codex/Claude Code/API 的全面当前能力调查。一个论文来源版本日期冲突已明确保留。
- 三个冷规划运行的工具事件为 0，输入包含 P1 报告；它们没有各自在线打开官方原文。三个可见规划会话的前几轮主要是继承报告、检查总计划和子计划。
- 不能把“研究者读过、规划者继承”表述为“三个规划者都已经逐一核验官方资料”。本次已定向派回三个原会话，要求打开相关正文与限制，并形成能力事实到本模块任务的可合并修改。
- 主协调本次独立打开了下列官方页，并读取表列相关正文。COMPLETE 只表示本问题相关范围已读，不宣称网页全文 EOF；当前在线页面没有不可变字节快照。文档支持、本机可用、行为收益分别判定。

## 主协调实际读取的官方能力依据

| ID / 官方原文 | 实际读取范围、工具引用 | 核实事实 | 对计划的影响（推断，待行为证实） |
|---|---|---|---|
| O1 [Build skills](https://learn.chatgpt.com/docs/build-skills) | Progressive disclosure / How ChatGPT and Codex use skills；turn11view1、turn13view1，L939–963 | 原生按描述选择技能并按需读取正文；显式调用也受支持。初始目录有容量限制。 | 路由候选应认真比较直接原生选择；必要项目/授权控制仍需保留。不能把目录没展示的技能误判为模型选路差。 |
| O2 [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) | Availability / Orchestration and thread controls / Approvals；turn12view0 L903–927、turn11view0 L978–1040 | Codex 已提供委派、后续指令和回收；子 Agent 有实际资源代价并继承运行权限约束。 | 测试最少协调约束是否足够；复杂流程新增的管理成本不能被当成原生必要成本。 |
| O3 [Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents) | Choose / Compare；turn12view2 L924–952 | 托管 Agents API、应用内 Agents SDK、直接 Responses API 的运行位置、状态与控制责任不同。 | “Codex API”不能笼统视为本地 CLI，也不能仅用 API 名称推定本机已具备某能力。 |
| O4 [Responses Multi-agent](https://developers.openai.com/api/docs/guides/responses-multi-agent) | Overview / When / Limitations；turn11view7 L928–938、turn13view0 L2220–2229 | 提供模型驱动的协调；属于有模型支持范围的 beta；此模式不支持 max_tool_calls 和独立 compact 端点，自动压缩各 Agent 的上下文。 | 减少自建调度有合理候选价值，但预算不能靠一个不支持的参数假装封顶；能力须绑定模型和运行时。 |
| O5 [Responses Compaction](https://developers.openai.com/api/docs/guides/compaction) | Overview / Server-side / User journey；turn11view8 L929–948 | 有服务端压缩与状态承接；压缩项不可直接人读。 | 比较原生压缩及按需信息路径；恢复是否保住授权、更正和未完工作仍须看后续行为。 |
| O6 [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk) | TypeScript / Python / resume；turn11view2 L923–979 | SDK 控制本地 Codex 线程；支持继续与恢复。当前页还指出旧 codex mcp-server 已移除。 | 不能把本地 SDK 等同托管 API；旧官方示例也要核当前可用性，不能照搬过时入口。 |
| O7 [Agents API Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent) | Tools available / Observe delegation；turn15view0 L1195–1202、L1405–1420 | 托管子Agent共享环境；其工具范围不等于Responses，文档不支持子Agent的function tools；创建或等待完成不代表任务完成。 | 工具执行、并发、状态回执必须绑定具体入口；不能只因都叫多Agent就视作等价。 |
| A1 [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) | Purpose / main-vs-subagent / What loads at startup；turn11view3 L76–94、L870–942；turn13view2 L923–936 | 子任务独立上下文不等于无规则注入；非 fork 与 fork、普通与特殊内置角色的初始资料不同。 | 独立审查/候选设计要核实际输入，不以“新 Agent”保证独立；信息恢复与来源仍有框架职责。 |
| A2 [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams) | When / compare / limitations；turn12view4 L65–86、turn11view4 L509–516 | 团队能力有协调成本，仍为实验功能；进程内队友不能随 /resume 或 /rewind 恢复。 | 并行可缩短独立任务等待，但团队恢复能力不能由宣传用途替代验证；短任务/强依赖保留单执行者对照。 |
| A3 [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) | Sessions / resume / context；turn12view5 L109–144、turn11view5 L151–152 | 支持会话恢复与自动压缩，文档明确早期细节可能丢失，工具定义可延迟加载。 | 删除重复全文注入是候选；授权、最新更正和证据索引是否仍正确要做恢复检查。 |
| A4 [Claude Code skills](https://code.claude.com/docs/en/skills) | Control who invokes / lifecycle / Pre-approve tools；turn16view0 L529–570 | 技能调用入口、正文存续和工具许可是不同责任；allowed-tools授予当轮许可，不是移除所有其他工具。 | 抽核路由作者的关键权限事实成立；兼容检查不能误用调用字段替代授权。 |

本机只读版本检查：codex-cli 0.160.0、Claude Code 2.1.286；工具 75edfb，两个命令均 exit 0。没有执行付费 API 调用或账号能力探针；版本号不能证明所有文档特性可用。主会话此前真实委派与回收只能证明那些操作在本次环境发生过，不能推广为全部 API 支持或性能提升。

## 统一修订方向

1. F 同时核查会改变候选的原生能力机会与执行限制；每项保留用户用途、原文/日期/范围、实际运行表面、当前可用性证据、最小原生实现、必要控制、适用与不适用条件、会改变的比较决定。未知写未知。F 不读取/转述旧架构偏好给 D。
2. T 必须能合理使用已核实且同样对各条件开放的原生能力，不能故意做成只有一句提示的弱对照。S/I 每个保留或新增机制都说明原生最小替代为何仍不足；没有证据时不预设框架获胜。模型不同或新增权限单列，不能冒充框架收益。
3. 路由检查原生技能选择能否减少不必要分流/澄清；编排检查原生委派回收与单执行者边界；Context 检查按需加载、压缩和恢复。都复用 U-007/U-008 和共享案例，不建立三套实验或新平台分支。
4. 正式结论需区分文档支持、实际可运行、同质量成本/质量净收益三层。只有最后一层证据才支持“更有效率/更有价值”。当前仅在补前一层及规划连接。
5. 本评估使用的冻结、盲评、证据核查职责不自动成为未来框架每个简单任务的常驻流程。任何拟带进日常工作的控制都要计成本并证明用途。

## 三会话回收与主协调判定

| 会话（用户原名） | 本轮实际产出及范围 | 主协调检查 | 判定 |
|---|---|---|---|
| 制定模块一计划 | routing-capability-alignment：4主要页+1消歧，7次web工具调用；R-CAP-01—03 | 全文c4d0d5；线程可见搜索/open/find记录；主协调抽核原生技能选择、渐进加载、Claude权限语义、API层级 | 限定官方补查已做到；对应动作已入路由v3 F/K/U007/008/011 |
| 制定模块2计划 | orchestration-capability-alignment：4主要页+1消歧，5次web工具调用；CA-1—3 | 全文9ee34a；线程可见网络记录；主协调抽核Responses限制、Codex子Agent、Claude团队恢复、Agents API工具/回执边界 | 限定官方补查已做到；对应动作已入编排v3 B1/3/4/8 |
| 规划模块三 | context-capability-alignment：4主要页+1消歧，6次web工具调用；M1—5 | 全文dae541；线程可见网络记录；主协调抽核压缩、历史注入、Codex线程恢复，后续Codex侧重补充单独读回 | 限定官方补查已做到；对应动作已入Context v3 CX00/03/04/05/06 |

以上是相关正文范围的亲读记录与关键事实抽核，不是每页全文审计。线程读取工具对部分批量网络事件仅显示other，不完整重放网页正文；精确节名/范围依各owner来源账，主协调用独立官方读取核实核心事实。不能把未回放的每一次取文声称为逐字旁观。三个作者均明确承认此前没有这些页面的亲读凭证，并未追认旧稿已充分核验。应用内Agents SDK专门的状态/恢复合同仍未完整核查；未纳入实际方案前不因这个分类空白额外建设或作可用性保证。

主协调已将共同条款写进统一v4§4.7及具体U任务卡，三个模块v3直接入卡。四文件增补差异全文核查4f9569，原冻结版本保留。现阶段可以判断“比旧稿更贴近当前能力、能检验原生替代的净价值”，仍不能判断“框架已经更先进、更高效”。正式行为run为0；未调用付费API、改框架实现或提交。

R2独立方法审查因模型容量不足没有有效票；旧R1 PASS不能代替当前版本验收。下一步是冻结当前组合并重试原审查角色，方法门通过后补U002与F/K实际输入，按既定步骤继续。质量/效率主张必须等行为比较；有证范围之外保持未知。

<!-- FILE_END: tri-system-capability-value-audit -->
