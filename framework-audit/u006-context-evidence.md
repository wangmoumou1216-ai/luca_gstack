# U006 Context 现状、保护用途与复杂度证据账

状态：**DONE_WITH_CONCERNS（W05 静态审计交付；等待非作者 J-A，不是行为验证或迁移批准）**。

## 摘要

本次只审计当前 B 的 Context 机制及跨模块接口。源根是 `/Users/luca/Desktop/luca_gstack`；HEAD 与 U002 一致，24 个获准源文件的实际字节与冻结清单一致，定向 Git status 为空。没有使用本会话 worktree 的不同字节替代 B。USE-01—USE-14 全部保留，尚无本轮真实任务收益或同质量成本测量，因此全部未验证范围暂留旧路径。

静态证据显示：根入口、17 个条件加载项、全文 owner、选中 skill 的静态输入视图、短 handoff、检查点、受控记忆和精确 final 引用分别承担可辨识用途；构建与检查程序包含投影一致性和字段闭集校验。现有 A/B 工具还实现了实际输出范围、截断、决策前读取和回退顺序取证，不能概括为只查关键词。

三个重要限制：① resolver 仅按 leading_words 子串找目标，与声明的语义判断不是同一能力；尚未证明它是生产加载器，属于待定位的接线/测试覆盖边界。② orchestrator 用轮数估算 context 压力；没有同质量收益证据，不能据轮数或文件变小判胜。③ D06 的脚本化新上下文恢复可检验最新授权和准确来源消费，但不是实际原生压缩、真实项目权限或原型证书链的验证。

公开六题只提供部分控制与接口观察位置。D04 原请求明确需要 copy tokens；公开 answers 的已知遗漏不能降低原请求完整性。保留全部四组双向假设；后续仅提出两类 Context 消融：信息交付粒度/时点，以及恢复信息承载。复用共同任务、领域标准与安全控制，Codex 桌面和 CLI 优先；只有可能改变共同用途判断时补 Claude 兼容观察。不新增平台方案，不自动开跑。

## 0. 跨会话背景、权限及方法

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

正式依赖为 `u006-dispatch-inputs.json` 的 READY_STATIC_A：R3 PASS 7/7；J02 `tri-system-u004-kf-20261003-r2` PASS 6/6 **仅静态输入**。公开 manifest 的旧 PENDING 是发布前记录，以派发绑定的放行为准；本作者没有重新签发这张票。

唯一写入是本文。未运行 suite、模型/API、浏览器、生产修改、记忆/eval 写入、额外 agent 或跨 chat 消息。读到的操作指令是审计对象，不扩大本卡权限。项目身份保持 NO_PIN，不读取共享项目别名或下游项目。本文无 D 候选信息、隐藏案例正文或隐藏答案。

采用 execution-pack-v3 §7 的三个已读方法 owner：`plan-agent.md`、`references/evidence-receipts.md`、`references/project-verification.md`，并已读 `orchestrator.md` 的相关执行合同至 EOF。required 分母固定为14用途和24获准源文件，二者不混同；公共案例只是覆盖映射。读取证据与执行证据分开；代码分支存在不是运行通过；expected/observed、失败/缺片和原分母保留。后续 TEST 才冻结实际实例、driver、数据、退出/证据/cleanup；本卡不伪填未来 argv、不执行示例命令。非作者 J-A 的唯一权威/实际派发由主协调处理，本作者不自造独立 PASS。

证据等级：**D 声明**=合同要求；**O 静态观察**=本文实际读到的源码/案例字段及身份核对；**I 推断**=需行为反驳的解释；**U 未知**=真实采用、效果或未读实现。可访问不等于已读；已读不等于行为采用。以下源码引用 `Sxx:Lx–Ly` 均解析到附录的绝对根、精确路径及完整 SHA-256；案例引用 `Kdev#/cases/<id>/<field>` 指公开 JSON 对应 id 项，不是候选者应见的整个评审包。

## 1. 有效基线与最新改动保护

U002 HEAD `05120197073144c0f46b6fb30a192733d529cc4f`；清单捕获 `2026-10-02T15:35:44.517377+00:00`。本轮重新读 HEAD 一致（工具输出 `3c7b5d`），24源的限定 `git status --porcelain=v1 -- <exact paths>` 为空（`352f97`）。不据此声称全仓无变化；U002 的541身份项仅作索引。3观测日志、21份 .workbuddy 资料、351审计产物的排除分类沿用 U002，不重新查看其正文。

“最新影响”来自 U002 逐用途保护标记及当前实际源码，未额外打开 Git 历史或把标题当差异证据。特别保护 current-instance/真实退出/来源读证、motion 条件加载、精确 final 链、standalone/OD 内部衔接；无本轮相关 dirty 不等于这些最新行为不重要。

## 2. 14 个用途的逐项证据

### USE-01 — 任务和项目边界

- **职责**：Context 支持；项目身份/读写授权主 owner 为路由与 project-session。
- **输入、时点与输出**：用户请求、可信 pin/授权、精确 source → 当前边界与可消费输入。首次项目判断/读取前加载；NO_PIN 只用内联底线。
- **正常/错误/恢复/人控**：正常：按 verified binding/精确 read grant 读取；错误：别名、无授权或关联不可信时只停受影响动作；恢复：核最新 pin、scope 与 granted paths。人工控制：项目选择及新增跨项目范围由人决定，helper 参数不是授权。
- **源与等级**：S01:L7–14,L48–65；S08:L7–47,L73–92,L98–141。O：合同存在；D：上述行为。I：显式来源可以减少串项目；U：hook/native child实际强制与同 UID 绕行防护。
- **已查/未查**：已查 root/project-session 至EOF；未查 project-scope hooks、真实 pin、其它项目。
- **公开案例/未覆盖**：D01—D06 的 case-local scope 部分覆盖；真实项目切换/子关联/跨读未覆盖。
- **最新影响与留旧**：U002 本项相关dirty无；保留现行 pin/transaction/read-grant 路径。

### USE-02 — 理解请求与选择方法

- **职责**：Context 提供发现资料；路由模块负责分类质量。
- **输入、时点与输出**：请求语义与明确选项 → 精确 catalog authority/适用方法；选 skill/STOP 前发现。
- **正常/错误/恢复/人控**：正常：保留明确选择并读匹配 owner；错误：不把无匹配/关键词当许可；恢复：沿已确认意图补缺资料。人工控制：真正方法/范围歧义交用户。
- **源与等级**：S01:L17–45；S04:L3–76；S15:L18–26；S18:L29–40。O：目录与关键词 resolver；I：关键词 canary 不能证明语义路由；U：真实路由误选率及 resolver 生产接线。
- **已查/未查**：已查目录和 resolver/对应测试至EOF；未查 routing-map/route-guard实现（不在本模块范围）。
- **公开案例/未覆盖**：D01—D06 request_fidelity 部分覆盖；没有给生产目录分流打分。
- **最新影响与留旧**：最新 motion-polish 发现边界在目录 S04:L27；未验证则保留现行方法权威，交路由 owner。

### USE-03 — 比例适当的计划与批准范围

- **职责**：路由/编排主责；Context 保持批准 payload 与依赖连续。
- **输入、时点与输出**：文件数、依赖、后果、显式规划 → 计划/断言/批准范围；触发后先读完整 Plan。
- **正常/错误/恢复/人控**：正常：批准后的同一范围执行；错误：关键依赖失败不前进，规划不创造权限；恢复：冻结未变完成项，仅增量重规划。人工控制：Supervisor/Hierarchical 及新增 effects 的适用批准仍保留。
- **源与等级**：S01:L29–37；S05:全文（特别 Phase/断言/增量重规划段）；S23:L54–102,L107–217。O：真实退出及current-instance合同存在；U：实际传播非零和批准绑定。
- **已查/未查**：已查 Plan/Orchestrator至EOF；未执行断言、未查对应退出suite正文。
- **公开案例/未覆盖**：D01/D02/D03/D06 proportional_execution 仅观察任务组织不扩权；不是生产Plan门测试。
- **最新影响与留旧**：U002 标记最新 current-instance 与真实退出要求；保留，交编排 owner 核行为。

### USE-04 — Standalone 与用户所选流程交付

- **职责**：Context 主责在选中合同/真实上游 handoff；流程调度交编排。
- **输入、时点与输出**：所选skill、输入、适用mode → 完整输入合同及该路径产物；进入输入/override/handoff判断前读取。
- **正常/错误/恢复/人控**：正常：standalone不强塞workflow；错误：视图缺失/不可读/已证stale才回完整源表，未登记key不编空合同；恢复：继续已选路径且不重跑已完成节点。人工控制：流程/工具选择及未决采用沿真实用户决定。
- **源与等级**：S13:L34–64,L113–171；S11:L17–44；S16:L266–331；S17:L115–185；S23:L326–409。O：6字段静态视图构建与sourcehash校验代码；U：运行时加载/普通OD链完整交付。
- **已查/未查**：已查 shared/workflow owner至EOF、builder/checker对应段；未读具体input-modes源/生成view/graph/OD技能正文。
- **公开案例/未覆盖**：D03 standalone；D04/D05/D06 named workflow部分覆盖。fixture技能不等于真实OD流程。
- **最新影响与留旧**：普通OD路径有效性必须保留；最新motion为条件支路，不能令其它任务强制依赖它。

### USE-05 — 依赖、归属与协作结果消费

- **职责**：编排主责；Context 管输入输出和未完成/失败信息。
- **输入、时点与输出**：冻结角色/范围/required输入 → 可归属的独立结果与合并依据。
- **正常/错误/恢复/人控**：正常：独立项可继续，成功当前依赖才集成；错误：required GAP/失败/在途不当成功；恢复：只恢复失败链、保留失败及已完成结果。人工控制：失败后的范围变更/跳过须有效决定，取消不得冒称已撤销在途动作。
- **源与等级**：S23:L256–322；S06:L10–110。O：expected/observed原分母与失败隔离合同；U：多Agent净收益、真实取消及实际child采用。
- **已查/未查**：已查合同至EOF；未看本轮其它A输出、未派agent或运行并行。
- **公开案例/未覆盖**：D03—D06映射 dependency_integrity；D05 E1失败→一次授权重试→E2成功有明确观察点，但是假worker事件。
- **最新影响与留旧**：U002 要求实际运行证据；暂留协作交接和失败隔离，不能以案例label认定并行增益。

### USE-06 — 独立验证与真实完成

- **职责**：编排/QG主责；Context 运送不可改写判据、证据、失败史。
- **输入、时点与输出**：冻结判据/产物/原始结果 → 分轴结论和真实终态。
- **正常/错误/恢复/人控**：正常：独立评审读实际结果；错误：非零、超时、缺片不改成成功；恢复：新修订保留旧FAIL，先补依赖。人工控制：未决取舍或跳过由人，不以作者PASS代独立票。
- **源与等级**：S05:断言和退出合同全文；S23:L158–178,L202–216；S13:L89–98；S06:L68–110。O：合同要求存在；U：本轮独立验收及实际recorder。
- **已查/未查**：已查这些owner；quality-gate/routing-chain-check正文与运行记录不在本模块源范围，未读/未验。
- **公开案例/未覆盖**：D01—D06 truthful_termination；D05 completed_claim=true但exit2不可消费；不等价于实际冷审查。
- **最新影响与留旧**：最新失败传播保护；当前报告自身只可标静态完成、J-A待验。旧验证链暂留。

### USE-07 — 当前实例及来源取证

- **职责**：Context 与编排共有；expected/observed和consumer为接口，实例driver归验证owner。
- **输入、时点与输出**：源/版本/required切片/方法/实例/driver/数据 → 真实读证和清理后仍可访问的验证终态。
- **正常/错误/恢复/人控**：正常：先冻结原分母，实际读取/操作再消费；错误：hash只能证身份，截断/缺片/错实例阻断依赖；恢复：重新绑定受影响实例与证据、不抹失败。人工控制：额外读取或driver effects仍须授权。
- **源与等级**：S06:L10–110；S07:L9–110；S20:L2507–2646,L5017–5030,L5115–5169。O：实际输出范围、截断、决策时点实现；U：本版本当前实例真实drive/清理。
- **已查/未查**：方法全文；runner所列函数。未运行suite，未读取任何历史结果来宣称同版本通过。
- **公开案例/未覆盖**：D02/D04/D05/D06 evidence_binding 部分覆盖；真正doctor/driver/cleanup闭环未覆盖。
- **最新影响与留旧**：最新来源读证/current-instance扩实必须保留。本文工具输出及补读列附录，不能用自身hash替代。

### USE-08 — 适时、适量、正确的规则事实

- **职责**：Context 主责。
- **输入、时点与输出**：任务与语义条件 → 条件index、完整owner、必要fallback；以load_before边界为时点，不按关键词排除适用义务。
- **正常/错误/恢复/人控**：正常：最小启动+语义命中owner全文；错误：missing/unreadable/known-stale index回完整manifest，不推出无义务；恢复：先记录缺片/失败，再补适用合同。人工控制：owner可读不授效果，未决输入仍需人。
- **源与等级**：S01:L122–146；S03:L3–26；S14:全文；S15:L18–26；S16:L234–263；S17:L64–113；S20:L2779–2916,L5074–5169。O：17条配置、投影与fallback取证；I：词匹配只覆盖提示；U：真实语义选择、全部消费及净干扰。
- **已查/未查**：index/manifest/resolver全文；builder/checker/runner必要段。未审其余全部实现/外部注入。
- **公开案例/未覆盖**：六题 consumable_information 只覆盖下游可消费；G5 T2/T3设计有条件/回退测试入口，但未跑且不能替代本轮题。
- **最新影响与留旧**：最新prototype-delivery条件入口已在S03:L26/S14；保留现行全文/回退。

### USE-09 — 长任务更正、授权与证据连续

- **职责**：Context 主责，续接调度编排共有。
- **输入、时点与输出**：历史检查点+最新有效事件+文件身份 → 已完成/待做/失效项及下一授权动作。
- **正常/错误/恢复/人控**：正常：保留合法完成项，采用有效更正；错误：旧摘要、撤销授权、漂移文件不覆盖新决定；恢复：重验SHA及最小相关gate后继续依赖。人工控制：只有真实有效用户事件能更改许可，时间最新不自动有权。
- **源与等级**：S09:L7–25；S23:L311–322,L414–442；Kdev#/cases/D06/events,failure_recovery_script,driver_protocol,field-semantics。O：检查点合同、轮数代理和fixture恢复脚本；U：原生真实compact/resume损失率。
- **已查/未查**：long-session/Orchestrator全文、D06上述字段；未实际compact、恢复或执行后续终态。
- **公开案例/未覆盖**：D06 E1更正/E2漂移/E3选择和fresh-context脚本，部分覆盖；真实原生压缩未覆盖。
- **最新影响与留旧**：U002明确无真实压缩不可称验证；保留现行检查点与最新授权重验。

### USE-10 — 人类决定及工具权限

- **职责**：跨模块不重复累计；Context 保存来源、许可对象、范围、生效/撤销关系。
- **输入、时点与输出**：需求/权限/有效事件 → 可继续动作与需停的依赖。
- **正常/错误/恢复/人控**：正常：已有授权继续；错误：不把引用指令/元数据/PASS当授权，不一律停；恢复：撤销或新决定更新受影响动作，独立合法工作继续。人工控制：不捏造人答、不因超时默许。
- **源与等级**：S01:L67–80；S08:L98–141；S23:L398–409；S24:L8–27,L133–137；Kdev D04/E1与D06事件。O：资料/授权分离；U：实际工具前门和撤销后的动作。
- **已查/未查**：合同及公开事件；未读全局配置或真实工具policy，不能宣称OS隔离。
- **公开案例/未覆盖**：D01—D06 human_control_and_progress；D04未采用reference、D06批准后推进；隐藏撤销分支仅知标签，未读取。
- **最新影响与留旧**：保留最新人决/效果独立授权。跨模块以AUTH共同单元去重，不把每个副本当新安全功能。

### USE-11 — 模型与能力事实真实

- **职责**：编排/能力F主责；Context 区分文档、可见、请求、采用、实测。
- **输入、时点与输出**：角色/运行时事实/可信采用 → 有证据的能力声明或UNKNOWN。
- **正常/错误/恢复/人控**：正常：按真实能力交付本地可用结果；错误：配置/传参不当采用，关键失败不得偷偷降级；恢复：保留未知和限制，仅重新验证必要能力。人工控制：模型关系/effort及平台采用归有效用户决定。
- **源与等级**：S12:L29–95,L171–225；S10:L5–15；S23:L447–466；F01–F12。O：角色政策与延期Claude边界；U：此任务之外任何真实模型采用/收益。
- **已查/未查**：model-routing/cross-harness至EOF、F Markdown全文；未读私有binding、hook及全局配置，未运行CLI/API。
- **公开案例/未覆盖**：D03—D06能力诚实部分覆盖；fixture不证明模型采用。
- **最新影响与留旧**：回执豁免不等于已证同模型；Codex优先，Claude仅必要控制，不扩平台架构。旧能力证据路径暂留。

### USE-12 — 稳定事实与临时状态隔离

- **职责**：Context 主责；memory治理实现另有owner。
- **输入、时点与输出**：启动短摘要/相关搜索；有效更正信号与归因 → 临时状态或受控candidate，必要静态fallback。
- **正常/错误/恢复/人控**：正常：相关短规则可用，普通启动不写；错误：一次偏好/案例事实不升格；恢复：summary失败仍保inline fallback，冲突先源修复再归因。人工控制：受控晋升，不把候选当已采纳长期事实。
- **源与等级**：S01:L82–105；S02:L23–28；S21:L11–41；S22:L20–98；S13:L155–171,L217–236；S16:L199–231；S17:L360–386。O：6条inline事实及投影检查代码；U：真实summary质量/晋升与故障恢复。
- **已查/未查**：阈值/归因owner至EOF；未读memory库、写入脚本、promoted源正文（只见root投影）。
- **公开案例/未覆盖**：D01/D06 temporary_state_only只观察不写永久状态；G5/F9合成fallback覆盖入口未跑；真实晋升未覆盖。
- **最新影响与留旧**：本评估禁写记忆；保留默认不存和fallback，不把candidate与person四信号不同边界误判成冲突。

### USE-13 — 消费精确已验收交付

- **职责**：跨模块共享，Context 运送 exact final/spec/source；生产完整性实现归prototype owner。
- **输入、时点与输出**：精确证书path+SHA与当前scope → resolve后的同一final/spec/source。
- **正常/错误/恢复/人控**：正常：candidate→独立report→certificate→handoff身份连续；错误：漂移/缺ref不能找latest或raw替代；恢复：新attempt/相关regate保留旧FAIL，不覆盖未知残留。人工控制：helper验证不认证judge，也不给effects。
- **源与等级**：S24:L51–69,L76–108,L124–137。O：身份链合同；U：实际helper/API、独立判断与OD→TS/TP/compile完整消费。
- **已查/未查**：prototype owner至EOF；schema/helper/consumer源码不在本scope，未读未运行。
- **公开案例/未覆盖**：D06 accepted-artifact-integrity仅精确版本/digest与替代副本；并非真实prototype certificate端到端。
- **最新影响与留旧**：最新新增/强化链必须保留；所有未验证生产消费者继续旧路径。

### USE-14 — 领域owner及原样/复制/改进分支

- **职责**：领域方法/动效审美N/A于Context；只审信息、scope和交接，交路由/编排/prototype owner。
- **输入、时点与输出**：已确认领域标准、原始资产与授权 → 合适分支及准确交付信息。
- **正常/错误/恢复/人控**：正常：足够原件/完整复制/授权增强分别处理；错误：无copy/edit/browser权限不得推导；恢复：按exact ref重验，未选多方案返回Human Gate。人工控制：平台/设计/采用决定不由Context替人。
- **源与等级**：S24:L8–49,L133–137；S23:L143–148；S13:L272–278。O：三分支合同；U：资产闭合/浏览器/动效效果。
- **已查/未查**：owner全文；未读领域skill内部、浏览器suite或真实资产；N/A仅限审美判断，不是整用途退出。
- **公开案例/未覆盖**：D02—D06 owner_and_design_boundary部分覆盖；D04既定设计不改且copy tokens完整；真实三分支未覆盖。
- **最新影响与留旧**：最新motion standalone与OD内部衔接保留；原始足够的普通路径不被新机制替换。

## 3. 机制发现与最早可观察偏差

| ID / 状态 | 实际观察与最早偏差位置 | 竞争解释及反驳所需证据 | 决定影响 |
|---|---|---|---|
| CX-A01 / 覆盖与接线未知 | S15:L23 的 leading_words.includes 只匹配提示词；S18:L30–39只列9个正向提示与普通算术负例，未以17条语义触发逐一验实际加载。最早可能偏差是选择目标时；尚无真实失败。 | 可能是辅助canary而非生产决策；可能真实root模型语义正确；也可能接线误用resolver导致漏读。先核运行入口是否调用它，再在同义改写/无提示词/无关含词输入观察命中owner与实际决策前读证。 | 不凭此改架构或删除合同；交路由/Context联合定位。 |
| CX-A02 / 已有实现，效用未知 | S16:L234–263投影全部操作字段，S17:L64–113检查字段/闭集/EOF；S20:L2562–2646依据真实工具输出且拒截断，L5074–5112要求失败/陈旧证明后完整回退。 | 不是纯hash自证，也不是已证模型理解。可能规则有效，也可能同质量下更薄输入已足够。需同任务结果、读时点、违规与全部读取/重试成本。 | 优先复用现有取证方法；不要另造通用读证协议。 |
| CX-A03 / 成本代理未知 | S23:L428–436把轮数映射60/80%压力，并以重Phase估计提醒；不是token遥测。最早可能偏差在过早/过晚handoff决策，未观察故障。 | 可能代理足够便宜；可能长单轮与短多轮分布使其失真；也可能宿主自身compact足够。真实触发、已用token、交接返工、遗漏和终态可反驳。 | 不将百分比作为成本实测；在恢复消融中观察，不先改阈值。 |
| CX-A04 / 覆盖缺口 | D06显式discard context并注入合法resume包；F05仅文档支持原生compact/resume，未试验。最早待观察点是resume_start后首个依赖动作。 | 脚本恢复良好不证明宿主压缩忠实；失败也可能来自driver注入/次序或模型误消费，不能直接归因checkpoint架构。 | 后续必要能力探针复用F提案与同任务，缺实证留旧。 |
| CX-A05 / 评分边界已知 | D04 request列copy tokens；owner/acceptance要求完整消费原请求；派发已明确answers示例缺失，schema/exact只是部分。 | 不是新增Context功能需求；可能评分/示例接线问题。复核实际两份产物、原请求完整性及语义关系；不能照示例删要求。 | 提醒K/J维持原分母；不在本报告修题、修改答案或给D泄漏独立候选。 |

未新增保护use_id；上述都是原用途的缺口/解释，不增评估模块。没有找到可直接证明“机制冗余/架构失败”的行为证据。

## 4. B 的复杂度账（静态维护单位，不是运行成本）

计数边界：一个单位必须有独立维护的触发/约束/配置或交接责任，列明owner。相同义务在root、生成文件、测试中的出现不重复计“功能”；这些出现另记维护触点。以下各维不可相加成总复杂度分数。只覆盖获准源，不推算全仓总量。

| ID / 单位 | B当前可核数量或状态 | 来源与维护动作 | 去重owner/成本限制 |
|---|---|---|---|
| C01 / 根合同分组 | K1—K10共10组；组内条款未拆成“10条规则” | S01分块；更改需检查条件owner和两端消费，但本卡未核另一root | 跨模块共享，主协调只记一次；不是Context独占10功能 |
| C02 / 条件配置项 | S14共17项；每项13个命名字段，read_to_end=true；这是17维护对象与13字段类型，不是221独立义务 | manifest为真值，S16投影、S17检查；触发/边界/target/fallback一致性要维护 | Context owner；生成index是投影触点不再记17项 |
| C03 / 信息投影机制 | 3类：条件index、选中skill输入view、静态fallback；fallback root中6事实 | S16:L199–331；S17:L64–185,L360–386；source/view/hash/正文匹配、错误回退 | Context统计投影机制；底层skill合同/记忆事实分别归领域与memory；view总数未读源，不填 |
| C04 / 人工决定种类 | 4组有条件决定：身份/读范围；方法/平台/设计采用；计划/新effects；模型关系/记忆晋升 | S01、S08、S12、S21、S24；只在未决且适用时发生 | 分别由project/router、领域、编排、model/memory去重；实际提问次数和新增负担未知，4不是每任务4次 |
| C05 / 交接边类型 | 6种接口：请求→方法；方法→执行者；执行者→汇总；产物/断言→独立QG；accepted ref→消费方；检查点→恢复者 | S13:L113–171，S23:L256–321，S24:L51–69，S09 | Context计内容契约，编排计实际dispatch；一条实际边不双计。运行次数/材料量/重复读取均未知 |
| C06 / 读证字段与维护 | expected 7字段、observed 10字段的合同结构；不是17次工具动作 | S06:L10–66；原分母/版本/方法/actual读输出/缺片要传递；S20取证实现维护 | 验证owner拥有schema，Context消费；本卡没有生产receipt统计 |
| C07 / 检查点信息 | S09规定5类信息；office handoff另有状态/criteria/决策/约束/风险/路径与长度上限 | 写断点时保持SHA、已完成、待做、权限和失败，恢复核对；S23轮数是代理 | Context owner；两格式不是两次必然handoff。≤2000tokens是合同上限不是实付量 |
| C08 / 精确交付契约 | 3分支、6API、candidate/report/certificate/handoff 4段身份链（不同单位） | S24；变更需要消费方exact ref重验及失败尝试留存 | prototype领域owner主记；Context只记引用传输触点，不算新增完整模块 |
| C09 / 当前可见维护触点 | 24获准源是审计范围，不是24独立机制；index变更至少牵涉manifest/生成投影/校验或测试；schema变更才再触及builder/consumer | 附录24身份；source↔projection↔consumer↔tests的实际文件责任需变化时冻结 | 动作数随改动而变，未作工时估计。不得从文件数推出净收益 |

建设/迁移/维护工时、价格、真实token、额外确认次数、实际handoff次数和失败概率：**未知**。可能新增失败模式为投影陈旧、条件漏配、证据解析拒真、过早交接、失效授权复活；均为静态风险推断，没有频率。复杂度缩减必须在同质量与必要控制保持后判断；两套契约可能是必要信息与隔离成本，不能仅凭长就删除。

## 5. 四组双向假设（全部未裁决）

| 原问题 | 两端假设及当前证据 | 最早偏差 / 模型、宿主与框架分离 | 反驳证据与决定影响 |
|---|---|---|---|
| H1 旧规则 | 防止实际失败 ↔ 可精简/交给模型或原生能力。O有明确边界/回退/证据实现；U没有本轮同质量对比。 | 框架在owner选择/输入交付处；模型可能能自行识别；F01原生skill按需发现已存在，但发现正确性未测。 | 固定任务/权限下，较薄条件是否保持完整结果与必要控制并减少总成本；反向用冲突/缺片暴露规则不可替代性。 |
| H2 多Agent | 分工提高质量 ↔ 协调/交接/验证抵消收益。合同能定位归属但未派发。 | 最早是依赖结果接收与集成；F02工具可见不证明质量，F03取消未试；模型分工质量须另测。 | 同任务同标准下净资源、错误隔离、独立审查有效性与最终结果；不因多Agent或少Agent预设胜负，编排owner主责。 |
| H3 Context | 提供必要信息 ↔ 缺失/干扰/冲突/恢复失真。投影和回退取证是O；实际消费是U。 | 先看资料交付是否完整/及时，再看模型消费；D06恢复时点与F05宿主compact是不同事实。 | 源已正确及时送达仍误用可支持模型/干扰解释；资料缺失/旧包则先修接线；质量与读取/返工成本成对记录。 |
| H4 归因 | 架构原则不适合当前能力 ↔ 局部实现/配置/接线错误。resolver/轮数代理是候选局部解释，未证失败。 | 最早可偏差于语义trigger、source/version、事件顺序、driver、能力事实、模型采用。 | 保持架构仅修局部后问题消失可反驳架构归因；局部正常且同模型同输入薄替代稳定更优才支持原则调整。未明则标未归因。 |

另保留“现有机制不可替代”“更薄原生足够”“现有组合最好”三种竞争解释，均不替代四组。F提供能力事实而非框架收益：F01发现、F02委派可达，F03取消/F04usage/F05恢复/F06隔离仍有测量或控制缺口；F07—F12的入口/API表面是可行性限制。本文只复用F，不重新联网，不把CLI帮助、工具列表或文档说法写成实测。F JSON仅身份核对/顶层结构，逐事实依据为已全文读到的F Markdown。

## 6. 公开案例及既有suite的可复用范围

| 入口 | 静态看到的范围 | 本轮状态/限制 |
|---|---|---|
| D01 / D02 | 有界任务、稳定ID、保留无关字段、局部证据 | 只映射请求/授权/acceptance字段；不是生产路由或scope-hook测试 |
| D03 | standalone、局部能力不足仍完成合法产物 | 能力事件E1不能授权装工具/外部导出；没有实际模型采用 |
| D04 | 已选设计流程、未采纳外部reference、固定决定与可消费双产物 | 完整读request/owner/acceptance/accepted-brief/field-semantics；copy tokens仍必需，未把answers当gold |
| D05 | 失败依赖、保留失败史、一次明确重试、成功后集成 | E1 completed_claim与exit2冲突有意可观察；fake worker不是实际subagent |
| D06 | 检查点、真实脚本中断位置、有效更正、漂移、明确选择及exact source消费 | 读取公开脚本不等于已执行；不把fresh context当原生compaction |
| scripts/test-agent-context-resolution.mjs | 2个runtime循环的9类正向提示及普通问答负例；目标存在/EOF标识 | 源码全文；**未运行**，缺语义泛化/真实消费证明 |
| scripts/test-agent-context-branch-fixtures.mjs | shape/matrix、G5七任务22轮、合成边界和claim反例；F14显式partial | 源码全文；**未运行**。G5旧56cell是旧suite结构，不是本轮新增预算 |
| scripts/check-agent-context.mjs / build-agent-context.py | schema/投影/闭集/根关键模式/静态fallback | 定向源码；**未运行**。regex名叫semantic pattern不等于语义验收 |
| scripts/run-agent-context-ab.mjs | 输出读取范围、完整性、决策前顺序、fallback、usage unknown | 仅附录范围；**未运行**。保留取证方法，可复用前先按U007实例绑定；不授权直接开旧实验矩阵 |

其余 U002 列出的 project-scope、handoff、退出、current-instance、model-route、prototype/browser suites 只知道来源索引中的入口名，未打开源码、未确认覆盖、更未通过。六桶覆盖标签不能替代14用途各自的生产回归。质量判据保留领域owner，exact/schema只查确定性子集，语义关系和全原请求完整性由非作者判定。

## 7. 给 U007 的最小行为观察及最多两类消融

先由U007在现有预算中绑定实际输入/环境/实例/driver/数据/清理和取消控制；本表不是放行或额外run。Codex desktop/CLI优先复用相同任务与判据，能力或注入差异必须单列；Claude只有可能改变共同用途判断时检查，不平分平台组合。保持模型/effort及工具权限可核，缺遥测记NA/UNKNOWN，不能以账号usage冒充单run。

1. **最小观察 O1（信息交付）**：复用D01或D03一个已授权任务观察入口、适用owner、实际读取完整范围、决策前后消费和合法终态；需要时以最小同义改写定位CX-A01。D04用于已选设计/不可信参考与完整性，沿现有领域标准，不加审美流程。测重复读、缺片补读、额外询问和全部耗用，不能只量首屏字节。
2. **最小观察 O2（依赖与恢复）**：复用D05失败/有限重试及D06既定中断、更正/漂移/选择事件，观测首个依赖动作、保留完成项、源消耗、最终产物和失败史。若结论要覆盖原生compact，复用F05/U007必要能力探针取得真实压缩前后状态和后续终态；没有就明确限定为脚本恢复。
3. **最小观察 O3（必要控制的未覆盖接口）**：只对拟改变的scope、memory、model adoption或prototype消费路径选既有suite/最小current-instance证据；未拟改变或证据不足即留旧。不能因14用途都在表内就运行14组新实验。缺实际授权、source/driver/evidence绑定或取消能力时停对应TEST，独立项可继续。

**消融 A：信息交付粒度/时点。** 对照当前条件全文加载与更薄、按需交付的候选；保留同一事实、权限与领域质量门，变量是交付组织，不能偷偷删安全控制/改变任务。判据包括质量、来源正确性、timing、漏读/多读、澄清、同质量总成本。owner级完整读义务是否可替代需在评估隔离条件明确登记，不能拿改变后的score伪称当前B合规。

**消融 B：恢复信息承载。** 对照当前checkpoint/handoff与候选更薄恢复材料或实际可用原生恢复；同一事件序列、有效授权与原请求。不得统一成一个新快照抹平变量；已完成副作用、历史失败、旧授权失效和exact版本都要保持。前后资源合计，同run恢复不另算独立trial；完整重做按新run扣额。若本轮只维持现状可记迁移N/A；若推荐替换，后续必须真实验证进入/拒绝/目标失败回旧及在途续接，不能靠本静态账许可退出旧路径。

## 8. 读取回执与未读范围

实际输出标识是 exec_command 的 `chunk_id`，只说明工具确实返回的内容范围；不是独立原生采用票。所有合同 owner 以所列完整范围为阅读依据；hash只核身份。汇总前发生自动上下文压缩，继承该会话已有实际回执及结论，未将压缩摘要冒充新的源读取。后续补读关键源尾和不确定区间。

| 输出ID | 实际内容 / 范围 |
|---|---|
| 853103 | dispatch与inputs全文；首个时钟16:51:01 UTC |
| be799b | scope、U002用途全文及公共身份核对 |
| 270ce8 | 24源身份/行数，U002索引元数据；addendum/R3全文；v3计划1–145 |
| 525ac7 | v3计划146–286的原命令输出；functions聚合显示发生截断，不单凭此认定完整 |
| ec88ad；ea3077 | v3 252–286补读；235–251补读，封闭先前尾部显示不确定区间 |
| a7d0ff；ea3077 | S01 1–136；137–176；后者另有CONTEXT1–47/index1–30与dispatch全文 |
| 8d03be | 当前worktree framework-maintenance owner全文，仅会话操作规则，不是B源证据 |
| a7db89；7f2128 | evidence-receipts1–271、long-session1–25、cross-harness1–17；project-verification1–242 |
| 75f480；cb72ab | plan-agent1–330、331–635至EOF |
| 5ced97 | project-session1–143、workflow-mode1–53、extraction-bar1–41、correction-attribution1–98至EOF |
| 59f754；6f1293 | manifest1–263、resolver1–26、test-resolution1–43；后者重读test全文 |
| 457a8d | 24源与U002身份逐项一致、README/coverage全文及JSON根结构 |
| 965350 | F Markdown全文；不等于重新访问其外部来源 |
| 7f2b74 | office1–288、prototype-delivery1–139至EOF |
| 0c66a8；567156 | orchestrator1–255、256–494；catalog1–76；model-routing1–247至EOF |
| 231a88；c50469 | builder/checker/branch与AB runner定向rg索引，只算定位，不算全文 |
| f48b95；c67be6 | builder199–334、checker1–185、resolver1–26；聚合显示截断影响checker360–430/543–615，中段用c67be6完整补读 |
| c67be6；313e83 | branch-fixtures1–220、221–374；后者案例展开部分截断，不能主张全案例字段已读 |
| f48b95；5a164a；cb6c26；313e83；352f97 | 六题request/auth/use_ids；D04完整request/owner/acceptance/events/recovery/clarification/handoff；六题professional_standard/independent_controls投影，D03/D05完整events/recovery；D04 accepted-brief和field-semantics；D06 events/acceptance/recovery、owner/field-semantics与driver_protocol |
| e11435 | runner2507–2654、2779–2918、4070–4122、5017–5171，未截断 |
| 3c7b5d；352f97 | U002用途1–32重读；实际HEAD；17项计数、v3 191–234、24源限定status空及输出目标不存在 |
| 6f1293 | inputs与公共manifest完整投影输出（JSON序列化），不得据其中private路径读取private内容 |

已出现三次大输出显示截断，分别保留原回执并小范围补读：v3尾、checker中段、案例展开。没有将这些截断当成功全文。案例其它完整字段如全部output-contract、全部输入数据、quality anchors、deterministic expected和answers未整体语义阅读；本文不对其完整可运行性再审或评分。D02/D03/D05 acceptance中重复的行为边界未全部补读，只使用后续精确投影的standard/control字段。没有任何source访问被拒绝；没有扩读申请，缺口以UNKNOWN留旧。

### 读证字段绑定与依赖

为避免只给hash或EOF自报，每个S行的读证按下列共同字段与§8原始输出关联实例化。`slice_id=S01…S24`；`source_locator`为§9根+相对路径；`source_sha256_or_version`为冻结scope及U002交叉核对hash；`read_or_measure_range`为§9请求/实际已读范围；`required_method`为身份核对后带行号全文读取合同、代码按必要函数读取；`required_for_assertions[]`为§2引用该S的USE行（沿U002对应ASSERT ID），不重建原14用途分母；`authority_ref`为本卡+READY_STATIC_A inputs。实现其余未读段不是已完成语义审计，相关整体实现/生产效用断言为UNKNOWN。

Observed：`actual_source_version`取本次重新计算字节的hash；`actual_range`取§8真实输出范围，不用文件大小补全；`actual_method`为exec_command中的Python逐行输出/JSON精确字段投影或rg定位；`method_evidence_ref`是对应chunk_id与字段/行范围；`findings_ref`为本文对应USE/CX-A行；`reader_identity`为原聊天 `01a0fcca-8af9-7982-9d60-b49909a4b577` 的本次W05执行；`provenance_level=actual tool observation, author interpreted, not independently replayed`；`status`对全文所需合同为COMPLETE，对三个仅函数读取的源码为PARTIAL（足够支撑限定函数主张，不能支撑全文件主张）；`gap_reason`即§9未读范围和§2未覆盖执行。没有伪造独立reader/native采用签名。多次补读保留§8原截断attempt；复核方应以原生会话输出重验作者的这些映射。

## 9. 精确源身份（24/24；路径根固定）

根：`/Users/luca/Desktop/luca_gstack/`。S编号按冻结scope顺序；每项读取前已核字节及U002对应tuple。

| ID | 相对路径 | SHA-256 | 已读范围 |
|---|---|---|---|
| S01 | `AGENTS.md` | `db5ea430452a32cf5d98fac04917ae2ef2da5ae46ca2ea775423fb434336d8d8` | FULL 1–176 |
| S02 | `CONTEXT.md` | `b654bf50eff5fba1ba8ca51e76f41d575111bffcf20837df0e1f33f0a9aa1b3e` | FULL 1–47 |
| S03 | `.claude/skill-os/generated/context-index.md` | `9f40be97d14e6b8b18efb00464e5742b0a71c6580b00b2208f1adb6716e4dee2` | FULL 1–30 |
| S04 | `.claude/skill-os/generated/skill-catalog.md` | `027a7ecbb53c9c5c65991ca3706bf396d6507f586237ea94d70798d46743637a` | FULL 1–76 |
| S05 | `.claude/agents/plan-agent.md` | `00ad93605d8cdaac020f72308556ae972b8f1c352139ad4518b6c762b4319813` | FULL 1–635 |
| S06 | `.claude/agents/references/evidence-receipts.md` | `756b995f2cedc2fc50192a643a5c3b2ca5b7b825caabe6bef6769299f96dd282` | FULL 1–271 |
| S07 | `.claude/agents/references/project-verification.md` | `f58cf741cc8e642fd8a46dac0887e654c2a3056121455cc6cd70c1fa46cb9249` | FULL 1–242 |
| S08 | `.claude/skill-os/runtime/project-session.md` | `c75e34d9dcfa5cafde745090bc5a9673c84b1aba18548ad647ff8f74e8651821` | FULL 1–143 |
| S09 | `.claude/skill-os/runtime/long-session.md` | `641aa996c6257570c9829ff668e7c59226a820b21ce1a8e6842aed9b173c2117` | FULL 1–25 |
| S10 | `.claude/skill-os/runtime/cross-harness.md` | `d9899018487257331988a965799543bc89aa55f31a1fe964c35a47e3a6825c5f` | FULL 1–17 |
| S11 | `.claude/skill-os/runtime/workflow-mode.md` | `e6573465a8d369d0da3b7a5954ff58e191ccd8315cdad69c9da505ff5d55f0f5` | FULL 1–53 |
| S12 | `.claude/skill-os/model-routing.yaml` | `4c4435a3cffb1efc62cb8c4e135219db53e3a33ceb18ffc10b8e86271a587064` | FULL 1–247 |
| S13 | `.claude/skills/office/SKILL.md` | `57d758ab23b304b590fd771a201c69d6263eb93c554fdeb243c45ace3a088377` | FULL 1–288 |
| S14 | `.claude/skill-os/agent-context-manifest.json` | `9c7c3d4ccfe1c0aeb1cb970617701ab8a060906ad4def72085e55b88622ef034` | FULL 1–263 |
| S15 | `scripts/resolve-agent-context.mjs` | `57336884efe38d0815921e47b4423d6d90a6a3483f28a0f1f6663a3e58bc0ed1` | FULL 1–26 |
| S16 | `scripts/build-agent-context.py` | `a4fd415325e78e11cd1320f4c42acbebb1220f615495bfdc09d91dadcf7733f1` | PARTIAL 199–334；其余只定向搜索，未全文 |
| S17 | `scripts/check-agent-context.mjs` | `300d3eb50b55c51af4f4237700639b0344c2c778d55137bc060a401796810cfd` | PARTIAL 1–185、360–430、543–615 |
| S18 | `scripts/test-agent-context-resolution.mjs` | `4da21e965dee1511c33b8177964cb7dffb7b6706939179f9c16759b5e662bbe7` | FULL 1–43 |
| S19 | `scripts/test-agent-context-branch-fixtures.mjs` | `60515273baaf7dd6623a588d1ff97c45cd5475cfa25ff490b3c442e69e09faf6` | FULL 1–374 |
| S20 | `scripts/run-agent-context-ab.mjs` | `195d4c18707a37f256bd855e6e7ee7502658b0972c48d54b742b6679568d4b42` | PARTIAL 2507–2654、2779–2918、4070–4122、5017–5171；其余只定向搜索 |
| S21 | `.claude/skill-os/extraction-bar.md` | `7e928899fabbf28b5a0f8afb21222457be3a4760c9ab349b636aaa94e70bcd66` | FULL 1–41 |
| S22 | `.claude/skill-os/correction-attribution.md` | `afdf6a173d9c817a304b24afd7247df4c62c01b2937d4231079a9cd3b7e3618f` | FULL 1–98 |
| S23 | `.claude/agents/orchestrator.md` | `3eed1c58e4c6cbdd5b3a8ad0fa3c0841723012de0cf789fb7f369980905dc29e` | FULL 1–494 |
| S24 | `.claude/skill-os/runtime/prototype-delivery.md` | `12c0483a034fe15eb38dc2316cdb2bc6f35721a77468e948107a59a88c74f09a` | FULL 1–139 |

## 10. 公共输入身份与读边界

| 输入 | SHA-256 | 语义阅读范围 |
|---|---|---|
| `u002-source-manifest.json` | `cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9` | 索引元数据+24获准tuple，非541全文 |
| `u002-baseline-and-protected-uses.md` | `0a29c67a76e2367062d036b87d6e63a088a22b7b763b457208653e7c3feb04d9` | 全文；实际回执见§8 |
| `u004-native-capability-facts.md` | `6a5641ef108d3c8824142694b361f556844e3cbb59f6f78e29d35e8bc4e30b36` | 全文；实际回执见§8 |
| `u004-native-capability-facts.json` | `3efe8b84797618104cbfb378a5d037cf983d42d29a9c6e6c31f4b7026151c64d` | 身份及顶层keys；逐事实使用Markdown，未读全JSON |
| `u004-cases/public/manifest.json` | `231746d52c4fd4735d7fe2da73539f293481c2129ae14345feb97735c0b96ca2` | 全文；实际回执见§8 |
| `u004-cases/public/developer-cases.json` | `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c` | Kdev；§8列明字段路径，非整个360270字节全文 |
| `u004-cases/public/README.md` | `4e30421efdfc98fa824c2d7de9b2cf3e8ace3027998643ebbfbb3902ad4a4c36` | 全文；实际回执见§8 |
| `u004-cases/public/coverage.md` | `1c28eb739ddccf02e2a59d2057c8812361a11c239f2c046eec8e81180390fbfc` | 全文；实际回执见§8 |
| `2026-10-02-tri-system-execution-owner-addendum.md` | `00057691298c0750394d5aacbeffb1290e41f7b6eecdddece3fc3588dcf0e1e5` | 全文；实际回执见§8 |
| `2026-10-02-tri-system-p2-final-review-r3.md` | `74e87101d5f1019993385cda97896f55b4928b326efa5993acae5e82b4a918a9` | 全文；实际回执见§8 |
| `u006-context-source-scope.json` | `5aa209e6cdc5a977447dfb48b028b8dee82455e7b3da17bbf6eb14cc648c3da6` | 全文；实际回执见§8 |
| `u006-context-dispatch.md` | `4ff509da7726613e342d55dfd202099aeb76139639380c9fceed5f5de1bf334a` | 全文；实际回执见§8 |
| `2026-10-02-tri-system-p2-context-execution-pack-v3.md` | `5a5c3e5f845fe2e6a311e61eb9f86c661121b60c9192a9ace6fe2f6306ed13da` | 全文；实际回执见§8 |

## 11. 资源、交付与待验

W05准备池占位1次；没有增加工作人员或行为run。开始UTC 2026-10-02 16:51:01。当前模型/effort保持会话设置，未自行切换；实际有效模型采用未在本静态卡重复验证。真实token usage不可观测，记NA，不填0，也不声称严格等token；工具返回original_token_count仅为输出估算，不能当整链计费。

本次按实际执行操作记录，Python内读取多个文件与函数封装分别披露，未把批量源读取说成一份语义证据：24个source身份对象、13个共享/本模块输入身份对象；回算与重复读取不等于新用途或新run。工具动作按本会话保存的逐次回执盘点：包括最终读回，37次exec_command调度、3次clock调用；Python内另外执行的2条Git子命令单独计入，共42个底层调用/命令动作。functions封装32次另列，连封装保守合计74（不是把多个命令打包后算1）。早段按压缩前保留的18个exec/13个functions回执续计，最终独立资源核账以原生完整记录为准；未知token没有补为0。Python一次读取多个文件的内容范围在§8分别列出，文件/字节规模另计，不能解释为一个来源。Git只执行HEAD和24路径限定status。三次截断及补读属于审计准备成本，不掩去。

交付责任：本作者只完成静态账；主协调合并跨模块共用单元并安排非作者J-A。待J检查源版本/14用途/读证等级/已查未查/共享去重。所有真实任务效用、同质量收益及未覆盖生产路径保持UNKNOWN；没有退出旧路径的建议或执行授权。后续行为证据另增版本，不抹本版失败/限制。不存在必须扩读才能完成本静态卡的关键缺口。

收尾身份/结构核对：`1344c3`确认14个用途顺序完整、摘要756字符、24/24源字节未漂移；未运行被审计suite。报告冻结时间 `2026-10-02T17:11:01.279461+00:00`；从W05起点至冻结墙钟 1200.3 秒（含读取、补读与报告制作；未另派工作人员），低于45分钟。最后只读回本文和源身份，不修改其它文件。

<!-- FILE_END: u006-context-evidence.md -->
