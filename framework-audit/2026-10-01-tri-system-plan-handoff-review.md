# 三体系总计划：冷启动接手演练

> 接手导航（2026-10-02 更新）：现行总计划为 v1.3。使用下方“现行接手提示词”；主协调者同时阅读末尾最新提交核对。v1.1／v1.2 审查回执保留为历史证据，均不能替代新版验收。提交具体机制与核对结论只供主协调／现状侧使用，不随任务包传给独立设计侧。

- 日期：2026-10-01。
- 被审文件：`framework-audit/2026-09-30-tri-system-assessment-master-plan.md`，v1.1。
- 文件 SHA-256：`7e2ed0da0b32da2e81f9d055960ed34ebc9de6c117df709c16a75d2447e19fb4`。
- 范围：只读接手模拟与独立方法审查；没有执行 P0—P6，没有验证实际长任务的上下文表现。

## 演练方法

接收者 `/root/cold_plan_receiver` 与审查者 `/root/cold_plan_contract_review` 均以 `fork_turns=none` 启动，任务材料仅为上述 Markdown，不提供本轮聊天、旧代码或历史审计。此处验证的是文档能否指导接手，不是对物理隔离的证明。

接收者模拟两种情况：A，用户仅给文件并要求查看；B，用户明确要求制定详细评估执行计划，并只开展 P0—P2。B 是演练条件，不构成本轮正式执行授权。

## 接收者实际还原的分派流程

1. A 中只阅读和反馈，不启动规划或评估。
2. B 中先登记版本与范围，按 U-001、U-002 建立目的契约、事实基线及使用分布；缺失材料标未知，不自动扩读所有项目。
3. U-003 基于目的进行有界研究，形成中性能力证据与实验可行性。
4. P0—P1 产物达到验收且关键价值取舍明确后，分派 U-004-a（路由）、U-004-b（编排）、U-004-c（Context）；每个上下文接收共同任务包及本模块章节。
5. 三个模块交付局部评估任务卡、证据判据、预算、停止点及跨模块依赖；接收者已写出三个包含输入、输出与失败出口的分派提示样例。
6. 主 Session 回收完整局部计划与证据索引，统一任务和实验接口，处理依赖，去重并累计预算，形成一份完整展开 P3—P6 的执行计划。
7. 独立审查后提交用户审阅，不直接进入正式评估。上下文过大时保存五部分交接，新 Session 核对版本和原授权后恢复。

## 独立验收

审查者先独立阅读文档并作出判定，没有接收前轮审查意见。结果为 PASS（7/7）；以下行号对应被审文件的冻结版本。

| 标准 | 判定 | 文档证据 |
|---|---|---|
| C1：目标、状态与范围可独立理解 | PASS | L5–8、L14–29 |
| C2：阶段顺序、三模块输入及分派条件明确 | PASS | L37–45、L127–129、L155、L270 |
| C3：主 Session 实质集成，不仅拼接文档 | PASS | L149–159 |
| C4：旧审计材料不会进入独立规划与设计输入 | PASS | L127、L167–179 |
| C5：上下文交接、恢复和授权核对可执行 | PASS | L53–75 |
| C6：大计划已定原则与后续取证参数分开 | PASS | L131、L147、L185–219 |
| C7：查看、规划、正式评估的授权边界明确 | PASS | L35、L73、L259–270 |

本轮未发现需要修改总计划才能接手的关键缺口。用户结果、必要边界、质量与效率取舍、读取范围仍需在 P0 确认；任务分布、可调用能力、隔离可行性、样本与预算参数由 P0—P2 取证后确定。不得把这些未知填成已验证事实。

## v1.1 历史启动语句示例

> 请依据附件中的《luca_gstack 三体系深度评估总计划 v1.1》，担任主协调 Session，按计划开展 P0—P2，产出详细评估执行计划。支持独立子 Agent 时按文档分派三个模块，回收产物并完成整体集成和独立审查。只形成计划，P3—P6 正式评估等待我确认；缺少关键输入时按任务依赖定向核实，不自行猜定。

该语句由用户发送时才表达执行范围；报告中的引用本身不是授权。读取、研究及产物写入依然受实际运行时和任务范围约束。

## 2026-10-01 演练检查点（历史）

- 已完成：冻结文件读取、接收者分派模拟、独立七项审查；总计划保持上述 SHA-256，未因演练修改。
- 当前任务：向用户报告接手可行性；没有运行中的正式评估任务。
- 剩余：经用户授权后才开展 P0—P2，再审阅详细计划。
- 不可从代码重建的决定：本轮仅接手演练，不能把模拟 B 当成用户已批准启动。
- 恢复读取：先读本报告的范围与检查点，再核对总计划版本及实际用户授权，不导入完整聊天历史。

结论限于单次静态接手演练与合同审查；不保证任意模型、任意运行时都能获得同等质量，也没有证明实际执行过程中绝不会达到上下文上限。

## 现行接手提示词：v1.3（2026-10-02）

以下整段由用户发送到接手 Session 时，才授权开展 P0—P2；在本报告中保存或审阅它不构成执行授权。

```text
你担任 luca_gstack 三体系评估的主协调 Session。工作目录：
/Users/luca/Desktop/luca_gstack

先完整读取现行总计划并核对版本，本提示词对应 v1.3：
/Users/luca/Desktop/luca_gstack/framework-audit/2026-09-30-tri-system-assessment-master-plan.md
版本发生变化时先核对变更与本次授权是否一致，不盲用旧审查结果。

本次授权你开展 P0—P2：目的与事实核实、必要研究、独立模块规划、整体集成和独立方法审查。
允许在总计划与实际权限范围内读取、研究，并将规划产物写入 framework-audit/。
产出一份完整展开 P3—P6 的详细评估执行计划，提交我审阅后停下；正式评估、框架改动和迁移另待确认。

关键背景：这是在 Codex 桌面、Codex CLI、Claude Code CLI 中通用使用的一个 Luca 框架。
按通用价值评估分层智能路由、Agent 编排、Context 工程及其交互。
不要按端形成三套方案或平台专项 Session，也不要预设要新增适配层、分支或配置体系。
模型、环境和框架各自贡献什么，要区分归因；环境事实仅在影响可行性或结论时定向核实。
通用性不能通过牺牲必要能力获得，单一环境成功也不能冒充全面验证。
实际能力冲突按总计划处理，不能自行降低必要控制或扩大架构。

最新提交核对基准为 05120197073144c0f46b6fb30a192733d529cc4f，启动 P0 时复核当前 HEAD 与相关脏文件。
三体系负责通用分流、协作和 Context；技能内部领域与交付方法保持原 owner，避免重复建设。
按总计划 P2 的触发条件，优先复用现行证据汇总、当前对象验证和失败传播方法。
你可判断其他高价值交集是否优先进入，但须说明共同收益、责任和兼容证据，并使用既有任务卡。
保护最新提交的有效技能用途、必要控制与交付契约；候选试验只能在获准隔离范围内进行。
不能以优先处理为由覆盖主仓、回退提交、破坏既有模块或提前进入实施。
本报告末尾的提交核对只供你与现状侧读取，不发给独立规划／设计 Agent；它们只接收中性事实与必要方法合同。

按 P0 → P1 → P2 推进。将总计划第零节完整加入每个子任务包和交接，保留目的契约与信息禁区。
在 P0—P1 输入就绪后，安排独立上下文分别编制 U-004-a 路由、U-004-b 编排、U-004-c Context 子计划。
支持子 Agent 时优先使用独立子 Agent；分工按问题和职责组织，不按平台组织。
规划与独立设计侧不接收旧实现逻辑或现状审计结论；输入是否真正独立要核查，不能仅靠“冷启动”自称隔离。

你负责读取完整局部计划，统一任务、比较条件、三体系交互、证据与判据，合并重复实验，核算整体预算。
每项任务写清问题、来源、共同用途、能力前提、输入、动作、产物、责任、验收、预算、停止与恢复条件。
比较当前框架、精简方案、独立候选，并考虑原生能力加必要提示与资料的对照。
此时设计取证方法和评估任务，不提前运行 P3—P6 或把候选设计成已验证结论。

按总计划控制上下文容量，原始资料和日志通过证据索引定向读取；必要时写五部分交接后换新上下文。
只向我集中询问会改变目标、必要边界或价值取舍的未决问题；能查证的事实自行核实并标明证据。
最终交付一份统一且可委派的详细计划，附 Session 任务包、依赖、整体预算、验收与恢复入口、独立审查结果和限制。
优选依据是实际用途、必要控制、质量与效率以及复杂度净价值；不以重写、增加 Agent 或减少规则本身作为成功。
```

## 2026-10-02 修订检查点

- 本轮仅将用户新增背景写入总计划 v1.2，并更新接手提示词；没有开展 P0—P6。
- 第零节共同输入合同随任务包与交接继承，三模块各产一份通用子计划，主 Session 集成一份执行计划。
- 新版验收应核查正文与本提示词是否一致；v1.1 冷启动演练作为历史证据保留。
- 恢复顺序：总计划第零节 → 当前停点与 R-2 → 本文 v1.2 提示词 → 实际用户授权与获准 U-ID。

## v1.2 独立审查回执（2026-10-02）

- 审查者：`/root/common_value_plan_review`，`quality-gate`，`fork_turns=none`；只收到用户需求、冻结文档和验收标准，未继承修订会话。
- `eval_run_id`：`tri-system-plan-v1.2-20261002-common-value-r1`。
- 总计划冻结 SHA-256：`617bbbdd31b6b1ca3d9c145c97c7f0f796b070a371d96918d0f009457d234236`。
- 接手说明被审快照 SHA-256：`9ae5272892c467d414b4ac6436495fa801e948e3a2d041ec95d7f45a887888a2`；这是当时追加本回执之前的 v1.2 快照。后续 v1.3 提示词修改不在本票覆盖范围内。
- 实际核对两份 SHA 均匹配；结果 **PASS（7/7）**，未发现必须修复的关键缺口。

| 标准 | 判定 | 被审文档行号 |
|---|---|---|
| C1：一个通用框架，按模块与职责分工 | PASS | 总计划 L12–22、L47–63 |
| C2：背景落实到 P0—P6 的任务与判据 | PASS | 总计划 L107–115、L137、L151–189、L201、L221、L255、L273 |
| C3：必要能力核实与通用结论边界明确 | PASS | 总计划 L19–20、L115、L221、L255 |
| C4：独立输入、冻结后对照和污染处置保持有效 | PASS | 总计划 L147、L197–211 |
| C5：背景、授权、版本和恢复入口可随交接继承 | PASS | 总计划 L67–89、L189、L318 |
| C6：统一实验、净价值、复杂度和迁移判据可执行 | PASS | 总计划 L155–176、L182–189、L234–275 |
| C7：最新提示词一致，历史证据与示例授权分清 | PASS | 接手说明 L3、L14、L46、L60–94、L101–102 |

审查者的静态接收模拟：获准后先完成 P0、P1；输入就绪后分派三个独立模块规划上下文并传递共同合同；主 Session 回收完整计划、解决交互与预算冲突，独立审查后提交用户，停在 P2。

本次通过仅证明文档合同与最新背景一致，不证明实际框架通用性、长上下文表现或模型能力。正式规划与评估均未启动。

归因 L1：此前将跨端背景延伸为按端分别规划，属于本次理解偏差；已在总计划和接手提示词中修正，无框架规则或全局记忆变更。

## v1.3 最新提交核对（主协调／现状侧专用）

### 范围与结论边界

- 用户本轮要求：最后核对最新提交与计划的冲突／重叠；重叠沿用最新模块逻辑，职责分清，允许有明确共同收益的高价值交集优先处理，保护已提交内容。
- 当前主仓为 `main`，HEAD=`05120197073144c0f46b6fb30a192733d529cc4f`，父提交 `477e742e0c60e51b06a7a76140673ba99634cc58`；主审最新提交的文件清单、直接影响本计划的合同及对应 diff。较早的 `1201e28`、`5ab9360` 仅核对提交清单与基线归属，没有重新进行技能实现审计。
- 最新提交共涉及 102 个文件；数量包含生成视图、注册、技能、交付协议与测试，不能据此推断三体系存在同等规模的重叠。本轮核对的是计划兼容性，不是全部 102 个文件的代码质量认证。
- v1.2 未发现方向性冲突；需要补足的是有限交集处的具体方法衔接与职责边界。v1.3 已在现有章节中补齐，没有新增评估阶段或技能改造任务。

### 交集处置

| 提交内容与证据位置 | 与计划的关系 | 本轮判断与处置 |
|---|---|---|
| `motion-polish` 注册、`agent-context-manifest.json` 的条件式原型 owner、模型映射中新增技能归属 | 技能可调用集合和条件加载基线更新，未由这些 diff 引入新的三体系评估模块 | 更新现状事实；技能内部方法保持原 owner。原型／动效协议仅在实际案例触发时使用 |
| `.claude/agents/references/evidence-receipts.md`；Orchestrator L267–272 | 与多 Session 读取、汇总和对照证据直接相接 | **优先复用**。保留派发前 expected 原分母、版本、范围、方法及实际 observed／GAP，不再设计一套同类协议 |
| `.claude/agents/references/project-verification.md` | 与 P4 当前对象行为验证直接相接 | **优先复用**。绑定当前实例／会话、版本、数据和 driver；先复用现有 suite，证据保留至清理之后 |
| `.claude/agents/plan-agent.md` 块 3–4 | 与详细计划中的断言和失败门直接相接 | **优先复用**。真实非零退出码保留，按原有 BLOCKING／WARNING 处理；不把文本 PASS 当成功 |

优先依据是这些方法直接防止漏读、漏票、错对象验证和吞掉失败，关系到评估结论能否成立；这是方法适用性判断，不是已经测得生产净收益。其他交集由主协调者按总计划的共同收益、owner 责任和回归证据判断，不因“可复用”就全面引入。

### 已提交模块保护

本轮只编辑总计划和接手说明；没有更改上述方法 owner、技能文件、路由配置或框架执行代码。现有无关脏文件保持独立。后续候选实验须在获准隔离范围内运行，保留最新提交有效用途、必要控制与交付契约；无法证明兼容的改动留为提议，不以优先项为由覆盖主仓或回退提交。

### 本轮独立复验的冻结输入

此表由主协调者在复验派发前定义。R3-C1 至 R3-C5 均为 BLOCKING 文档判据：C1=通用定位及模块边界；C2=三项方法与最新 owner 一致；C3=高价值例外与提交保护并存；C4=设计／审计隔离及两层授权保持；C5=现行接手指引可执行且未扩成技能重构。表外全量技能实现、真实功能及跨环境性能均不在本票声明范围内。

所有 `source_locator` 相对 `/Users/luca/Desktop/luca_gstack/` 解析；行范围为一基含端点。`authority_ref=USER-LAST-CHECK` 指本节已记录的用户核对、文档修订及只读复验范围，本引用本身不新增授权。

| slice_id | source_locator | source_sha256_or_version | read_or_measure_range | required_method | required_for_assertions[] | authority_ref |
|---|---|---|---|---|---|---|
| R3-S1 | framework-audit/2026-09-30-tri-system-assessment-master-plan.md | 7bde6cb9232187e89d99e4075337feebaeb7f29d9e9c1ece524cb3360968ed6e | L1–343／EOF | 本地 UTF-8 完整读取、核对 hash、语义对照用户要求与方法 owner | R3-C1,R3-C2,R3-C3,R3-C4,R3-C5 | USER-LAST-CHECK |
| R3-S2 | .claude/agents/references/evidence-receipts.md | 756b995f2cedc2fc50192a643a5c3b2ca5b7b825caabe6bef6769299f96dd282 | L1–271／EOF | 本地 UTF-8 完整读取、核对 hash、核查本计划复用边界 | R3-C2 | USER-LAST-CHECK |
| R3-S3 | .claude/agents/references/project-verification.md | f58cf741cc8e642fd8a46dac0887e654c2a3056121455cc6cd70c1fa46cb9249 | L1–242／EOF | 本地 UTF-8 完整读取、核对 hash、核查本计划复用边界 | R3-C2 | USER-LAST-CHECK |
| R3-S4 | .claude/agents/plan-agent.md | 00ad93605d8cdaac020f72308556ae972b8f1c352139ad4518b6c762b4319813 | L425–514 | 本地 UTF-8 定向读取、核对全文件 hash、检查退出码与失败处理 | R3-C2 | USER-LAST-CHECK |
| R3-S5 | .claude/agents/orchestrator.md | 3eed1c58e4c6cbdd5b3a8ad0fa3c0841723012de0cf789fb7f369980905dc29e | L267–272 | 本地 UTF-8 定向读取、核对全文件 hash、检查聚合绑定 | R3-C2 | USER-LAST-CHECK |

复验还须读取本父级任务文档的现行提示词与本节控制范围；其精确 hash 由主协调者在派发消息中外部绑定，避免自引用 hash。审查者返回每个原始 slice 的真实读取范围、方法与工具输出引用，缺口不能删除。历史 v1.1／v1.2 判定不充当本票依据。

### v1.3 最终复验回执

- 独立审查者：`/root/latest_commit_plan_review`，`quality-gate`，`fork_turns=none`；`eval_run_id=tri-system-plan-v1.3-20261002-latest-commit-r1`。
- 父级冻结输入 SHA：`13fca9a7b8a2dc30eea76781c22d0572a52feaa63f162030618679659615650f`，为追加本回执前的本文；审查者实际核对匹配，原生输出 `4405be`、`d776f2`。HEAD 实际核对匹配 `05120197073144c0f46b6fb30a192733d529cc4f`，输出 `4e5e6c`。
- **PASS（5/5）**：R3-C1 通用定位与模块边界（总计划 L12–24、L157–163）；R3-C2 方法复用（L199–205）；R3-C3 高价值例外与提交保护（L22、L117–119、L341）；R3-C4 独立性与授权（L153、L205、L213–227、L315）；R3-C5 接手可执行（接手说明 L70–102，总计划 L195–207）。没有必须修复的关键缺口。
- 五个原始切片全部 COMPLETE，无 PARTIAL／GAP、额外片或重试。判据、原分母和最终产物未因审查结果改变。
- 可将本版交给主协调 Session，在用户授权范围内开始 P0—P2。本票仅为文档一致性复验，不是正式评估启动授权，也未运行功能或跨环境性能测试。

以下保留审查者返回的 observed 记录；工具输出引用属于该独立原生调用的实际读取记录。

```json
[
  {"slice_id":"R3-S1","actual_source_version":"sha256:7bde6cb9232187e89d99e4075337feebaeb7f29d9e9c1ece524cb3360968ed6e","actual_range":"L1–343/EOF；分段 L1–120、L121–240、L241–343，均未截断","actual_method":"本地 UTF-8；shasum -a 256 核对完整文件；nl -ba 配合 sed 分段输出；语义对照用户判据和指定方法 owner","method_evidence_ref":"本次原生 exec_command chunk 4405be（实际 hash）、0402dd（L1–120）、94fd4b（L121–240）、df4c93（L241–343）、5df7ac（343 行）","findings_ref":"/root/latest_commit_plan_review 本次最终返回 R3-C1,R3-C2,R3-C3,R3-C4,R3-C5","reader_identity":"/root/latest_commit_plan_review","provenance_level":"tool-observed","status":"COMPLETE","gap_reason":null},
  {"slice_id":"R3-S2","actual_source_version":"sha256:756b995f2cedc2fc50192a643a5c3b2ca5b7b825caabe6bef6769299f96dd282","actual_range":"L1–271/EOF，完整 cat 输出至 FILE_END，未截断","actual_method":"本地 UTF-8；cat 完整输出；shasum -a 256 核对完整文件；语义核查总计划 L201 的复用边界","method_evidence_ref":"本次原生 exec_command chunk 2e1d1b（完整正文）、9facf3（实际 hash）、5df7ac（271 行）","findings_ref":"/root/latest_commit_plan_review 本次最终返回 R3-C2","reader_identity":"/root/latest_commit_plan_review","provenance_level":"tool-observed","status":"COMPLETE","gap_reason":null},
  {"slice_id":"R3-S3","actual_source_version":"sha256:f58cf741cc8e642fd8a46dac0887e654c2a3056121455cc6cd70c1fa46cb9249","actual_range":"L1–242/EOF；分段 L1–125、L126–242，均未截断","actual_method":"本地 UTF-8；nl -ba 配合 sed 分段输出；shasum -a 256 核对完整文件；语义核查总计划 L202 的复用边界","method_evidence_ref":"本次原生 exec_command chunk 5f2ce1（L1–125）、151cae（L126–242）、9facf3（实际 hash）、5df7ac（242 行）","findings_ref":"/root/latest_commit_plan_review 本次最终返回 R3-C2","reader_identity":"/root/latest_commit_plan_review","provenance_level":"tool-observed","status":"COMPLETE","gap_reason":null},
  {"slice_id":"R3-S4","actual_source_version":"sha256:00ad93605d8cdaac020f72308556ae972b8f1c352139ad4518b6c762b4319813","actual_range":"L425–514，一基含端点，未截断","actual_method":"本地 UTF-8；nl -ba 配合 sed 定向输出；shasum -a 256 核对完整文件；对照真实非零退出码及 BLOCKING/WARNING 失败传播","method_evidence_ref":"本次原生 exec_command chunk 706622（L425–514）、9facf3（实际全文件 hash）","findings_ref":"/root/latest_commit_plan_review 本次最终返回 R3-C2","reader_identity":"/root/latest_commit_plan_review","provenance_level":"tool-observed","status":"COMPLETE","gap_reason":null},
  {"slice_id":"R3-S5","actual_source_version":"sha256:3eed1c58e4c6cbdd5b3a8ad0fa3c0841723012de0cf789fb7f369980905dc29e","actual_range":"L267–272，一基含端点，未截断","actual_method":"本地 UTF-8；nl -ba 配合 sed 定向输出；shasum -a 256 核对完整文件；核查预冻结分母、原样传递及 required GAP 停依赖","method_evidence_ref":"本次原生 exec_command chunk 89ece4（L267–272）、9facf3（实际全文件 hash）","findings_ref":"/root/latest_commit_plan_review 本次最终返回 R3-C2","reader_identity":"/root/latest_commit_plan_review","provenance_level":"tool-observed","status":"COMPLETE","gap_reason":null}
]
```
