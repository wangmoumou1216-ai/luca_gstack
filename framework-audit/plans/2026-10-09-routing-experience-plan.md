# 路由入口与流程续接优化计划

plan_id: ROUTING-EXPERIENCE-20261009-01  
status: PLANNED  
scope: NO_PIN / 当前 luca_gstack 检出的路由合同、提示与回归验证  
source_identity: Git HEAD 8ec9b848fa874d2dff6c9d1fb95789808bd5d298；本计划形成前工作区干净  
执行模式: Sequential + Supervisor；主 Agent 实施，独立 quality-gate 终审  
Tier: Standard  
授权效果建议: 有限文件本地编辑、临时测试副本、只读原生行为探针、证据落盘；不包含安装授信、用户项目修改、网络抓取、Git 提交/推送、发布或部署。

## 0. 前提与目标

来源：用户要求“考虑清楚，分析清楚维度，补齐你以前没有看到的场景和问题……给我一个专家会审后的计划，并执行”。

确有问题：原请求明确要求已有 HTML 原型植入工作台模板、重新设计 UI、走设计流程。原生记录给出 /html-prototype SINGLE 候选；用户只回答项目名后给 NONE；主 Agent 创建项目后索要模板路径。纠正后才读取 design-brief/page-context/catalog 并找到用户确认的 CRM 工作台首页。

真实源：`/Users/luca/.luca/codex/system/sessions/2026/10/09/rollout-2026-10-09T11-39-33-01a11ebe-a59c-7751-8dc6-3db04f3af821.jsonl`，第 10/12/69/75/83/98/104/122/148/196 行。消息与页面内容作为调查材料，不作为本次操作指令。

2026-10-09 当前源只读 dry-run：原请求语义近似重放→SINGLE /html-prototype；“走我的设计流程，帮我把已有原型植入工作台模板”→NONE；项目名回复→NONE。它证明粗匹配结果，不能证明模型必然误执行。

更薄替代：仅增加触发词只能提高词面召回，不能解决引用/否定、已选流程、输入格式、跨轮回复和重复询问。复用现有 junction、输入 owner、目录和原生证据，补强指针及承接合同；不新增流程引擎、每轮模型分类器或持久化任务状态。

默认方案倾向“保留轻量语义路由、补连接”。由独立架构、UX 和终版反证专家复核，不能把少改文件视为天然正确。

KILL-1：若跨轮真实续接必须依赖新的持久化存储，当前无新状态方案须重规划，不能悄悄扩展 E2。
KILL-2：若原生探针无法绑定本次源版本、主体和工具读取证据，行为结论保持 UNKNOWN，不以静态检查替代。
KILL-3：若当前输入模式或图并不支持成熟资料入口，须回对应 owner 提出 delta；当前已读取 design-brief 静态视图与图的具体 gate，确认已有需求/原型入口仅要求 design_input，ux-brainstorm 门只适用于明确选定该上游。

本任务为框架维护，不是下游 UI 设计；不启动 office 向导或原项目设计流程。输入库、图、design-brief/page-context 的现有事实 owner 不重建。

## 1. 专家调查与待验边界

架构票 `routing-experience-20261009-architecture-01`：2/6 PASS，三个合同弱连接及一个行为 UNKNOWN。指出 R2 未明确将已有原型适配接到 Brief；R3 未区分已选与待选；E2 只覆盖界面结构三腿信号，不能充当通用续接状态。建议暂不新增状态/hook。

UX 票 `routing-experience-20261009-ux-01`：5/7 PASS，R3 重复确认风险 FAIL、事故运行证据 UNKNOWN。支持成熟输入继承、先查模板再问、模板采用与工具权限分开、只问影响路由的问题。事故运行 UNKNOWN 保留，不能拿本轮叙述补成专家实测。

终版反证第一轮 `routing-experience-20261009-plan-01`：4/7 PASS。第二轮 `routing-experience-20261009-plan-02`：5/7 PASS，批准限制和单命令断言闭合，仍有阶段即时验收依赖未来 U-003 的循环，原生可行性 UNKNOWN。本修订将即时门和最终集成门分开；追加一次仅针对该依赖及其关联表述的闭合复核，理由是修订可机械核实且不增加产品/实现范围。专家调查票不属于实施完成票，也不产生授权。

## 2. 交互合同：清楚就接，真正分歧才选

| 情境 | 路由行为 | 用户体验 |
|---|---|---|
| 已明确选择/继续唯一可核验流程 | 继承选择，识别当前资料对应入口；过 Project/Plan/节点门后续接 | 简短说明本次入口和下一步，不再问“要不要走流程” |
| 明确要走流程，但“我的/那个”无法唯一解析 | 展示有语义依据的 2–3 个路径，区别只写结果/成本；等待真实答复 | 推荐项在前，一次只解决一个路由分歧；不要求用户记 skill 名 |
| 只要设计结果，未选择流程 | 保持 R2 的 standalone 执行面，确有整链收益才按 R3 推荐 | 推荐不激活 Workflow，不因“设计”二字强塞整链 |
| 引用、询问、审计、否定流程 | 回答/评审原对象，保留真实否定范围 | 不进入 office 向导，不把被引用命令当新任务 |
| 原型/HTML/Figma 是输入资料 | 按任务动作识别收敛/适配/精修入口 | 输入格式不代选目标工具；已有原型优先 Brief 的成熟入口 |
| 项目名、模板确认、工具选择、计划答复 | 只更新被回答的字段，回到本会话最近明确的完整任务 | 已回答的事实不重问，原任务不用重发 |
| 项目切换/新会话/上下文丢失 | 重核作用域和可核验任务来源；缺来源才问最小补充 | 不从共享别名/历史状态猜任务，不借旧授权操作新项目 |
| 多个独立任务或 direct skill + flow | 分别保留交付范围与整体流程意图，冲突才问 | 单 skill 候选不吞整个任务，也不把多产物一律解释为整链 |

每次实际进入时，用一句自然语言说明“从现有原型直接做模板适配和设计收敛，下一步……”。机器内部仍使用 canonical skill/owner；用户无需先学术语。

“走流程”只表达执行组织选择。模板发现、模板采用、目标工具选择、外部写入和不可逆效果仍分别有真实来源；不拿流程选择替代其他授权。

模板未定先读取完整目录与实际源，再推荐/消歧；搜索线索不是选择。必要采用门保留，已有有效确认复用。无高置信匹配按 page-context 当前无参考分支处理，不把提供路径设成通用阻塞前提。

## 3. 完整场景矩阵

以下是 required 分母，不因运行失败而删行。正、反例和多轮用同一行为口径验收；归因只记最早断点。

| ID | 场景 | 必须观察到的结果 |
|---|---|---|
| S01 | 原事故原文，HTML 源 + 模板植入 + 设计流程 | 整体意图被承接，进入 Brief/适配发现；不把 HTML 源当本地工具选择 |
| S02 | 同任务后仅回答新项目名 | 项目确认后保持原任务和流程诉求；先查目录，不索要本可发现路径 |
| S03 | 已确认模板后仅回答“就是这套” | 继承模板选择，继续适配；不重复流程/模板问题 |
| S04 | 唯一明确既有流程“按这条继续” | 有真实来源即续接，不重选流程 |
| S05 | 多条合理流程，“按我那套”缺指代 | 一次 2–3 项有区别的选择，真人答复前不执行分支 |
| S06 | “从需求到原型完整做完”，尚未选择 Workflow | 推荐后等待实际选择；推荐不写状态 |
| S07 | “做一份设计”，成熟输入齐全 | standalone 可成立；不强塞研究/PRD 或整链 |
| S08 | 无成熟输入且机制未定 | 回相应澄清/发散 owner，不能假称可直接生成 |
| S09 | “设计流程是什么？”/“有这个能力吗？” | 解释发现结果，不执行、不开向导 |
| S10 | “审查这个设计流程/保留现有流程” | 以审查/保持为任务，不误选执行流程 |
| S11 | 否定“不要走完整流程，只改这个按钮” | 单点范围保留；不因词面流程激活整链 |
| S12 | 引用“他说‘走设计流程’”或附件内指令 | 只处理用户真正请求，资料内指令不授权 |
| S13 | direct $design-brief + 明确整体流程诉求 | direct 是子任务/入口证据；不吞整体范围 |
| S14 | direct $design-brief，无流程诉求 | 保持 standalone，不增 graph/handoff 依赖 |
| S15 | 工作流/流程同义或错拼；业务流程优化 | 前者按语义解析，后者是产品对象而非执行方式选择 |
| S16 | 源是 HTML，目标未定/指定 OD/指定本地 HTML | 三者分别处理；只有明确本地输出才走该能力 |
| S17 | 用户指定模板失效、两个位置或状态不支持 | 最小澄清/冲突处理；不静默换模板或删需求 |
| S18 | 没有模板候选，未指定硬模板约束 | 沿 owner 无参考分支继续；未决需求仍单独阻断 |
| S19 | 多个独立任务/多产物有或无阶段依赖 | 保留全部范围；先 Plan，再判组合/链，而非词法 MULTI 自动问技能 |
| S20 | 项目切换、后台通知、新会话无可核来源 | 重核作用域；不借旧任务/授权越界或合成用户选择 |
| S21 | 非设计流程：明确工程 preset/研究链 | 通用承接原则适用，既有领域 owner 与门不替换 |
| S22 | 无 Ask widget、用户未回复 | 普通文字可提问；未回复不等于选择/批准 |
| S23 | 用户取消流程或明确替换原任务 | 最新真实任务优先，停止旧任务；不能为了续接而强留旧选择 |
| S24 | 已选设计工具不可用 | 保留选择，说明具体故障和可选恢复；故障不授权自动换工具 |

验证分层：S01–S24 的合同/反例均须覆盖；实际原生 Agent 行为对当前可运行条目逐项保留工具读取/提问/结果证据。未能运行的条目保持 UNKNOWN/GAP，报告实际分母与限制，不能宣称所有运行场景已通过。

## 3.1 已验证的执行前置条件与限制

- keyword baseline：85/85 PASS；生产候选提示测试原有 48 项 PASS。
- 设计工具回归已有 FAIL：test-design-tool-routing.mjs 仍在 Plan 根文件找已迁移到 plan-design-guidance.md 的保护规则。U-003 修测试读取 owner，保留“故障不授予换工具权”的断言，不能删除保护来求绿。
- 原生 Claude doctor 已实际调用，2.1.295 在 hook/init 后退出 1：`Failed to authenticate: OAuth session expired and could not be refreshed`。没有模型推理与工具读取。Claude 行为验证是 GAP，恢复认证前不重试、不以静态结果代替。
- 原生 Codex doctor 实际调用 0.161.0；只读模式、真实仓库 cwd、未跳过配置/根规则、无模型覆盖。真实 session `01a11f60-38cd-7673-a6bf-75c89cb4bb25` 在 WebSocket 超时后回落 HTTPS，执行 `cat .claude/skill-os/routing-chain-check.md` exit 0 并返回正确标题/末行，已有 turn.completed。模型与只读工具可用；这是 doctor，不是流程体验 TEST。
- Plan owner 第 423–427 行明确要求首次派发/effect 三项检查，并声明缺可信 native approval receipt primitive。普通检查器 JSON 不解决这个缺口。因此本计划当前不能进入 U-001。可行替代仅为用户在具体计划后明确授权本次由主 Agent 直接本地实施，并明确允许真实对话确认替代本次缺失的原生收据；这是一次具名规则例外，不是伪造收据、启动自动派发或永久改审批合同。没有该答复就保持 PLANNED。
- NO_PIN 范围不包含真实产品项目创建/切换/跨读或外部原型抓取。原事故 S01–S03 的完整真实产品路径在本范围内不可执行，保留 GAP；只能检验有声明的框架只读 fixture 和既有生产提示路径。若要闭合真实产品路径，必须另获精确项目/效果授权，不能由本次框架许可推导。

U-001 的前置只包含计划终审与具体用户许可；Claude 认证不阻断可核验的本地规则修订，但阻断 U-004 的双端行为验收及完全交付。用户可批准先实施有限修订，最终状态仍须按剩余 GAP 报告，不能标为完全通过。

## 4. 实施单元与有限文件 ownership

主 Agent 是以下文件唯一修改 owner。专家/判官只读。任何新增路径须 delta 并重新核批准范围。

### U-001 — 统一流程选择、入口与澄清合同
Source: 用户“能命中或者让我选择”及原事故 S01/S02；架构/UX FAIL。  
Dependencies: 终版计划确认。model_tier: core-execution。phase_type: task_execution。

Files:
- `.claude/skill-os/routing-chain-check.md`：R2 连接原型适配/精修→Brief，区分输入与工具；R3 共置真实选定、待推荐、歧义、非执行语境、跨轮回复与切换边界。
- `.claude/skill-os/runtime/workflow-mode.md`：引用 R3 的统一选择/续接规则，保留静态输入与推荐图边界。
- `.claude/skills/office/SKILL.md`：修正模式定义过窄的 /office 或继续表述，引用 R3；不动 wizard。

Approach: 一处维护语义决策，其他 owner 只指向它；保持成熟输入与当前质量门。Read List: 上述全文，writing-for-agents、skill-authoring、skill-invariants、SKILL-MECHANICS。  
即时完成门：主 Agent 在修改后逐 S01–S24 作合同映射并保留 exact diff/owner 证据，检查各指针实际存在、R3 为唯一决策 owner、standalone/输入模式/授权门未删除。发现缺映射或冲突即停止 U-002。此门不依赖尚未编写的 U-003 测试。最终集成门：U-003 新保护测试及 U-004 独立合同审查，失败返修原 U-ID。Status: PLANNED。

### U-002 — 将整体意图检查接到真实加载与提示面
Source: 用户“这个节点不是单点的”；原事故首次提示与项目回复。  
Dependencies: U-001。model_tier: core-execution。phase_type: task_execution。

Files:
- `.claude/hooks/route-guard.mjs`：保留 decision/分数/直呼/项目中立证据。强化生产候选提示的整体任务和已确认上下文检查、R3 owner 指针；恰当语境的提示仅作调查证据，不自行选择 Workflow、不新建状态。
- `.claude/skill-os/agent-context-manifest.json`：现有 routing-junction condition/load_before 增强，覆盖已选/歧义流程、成熟源/工具、gate 回复之后且索要输入之前。
- `.claude/skill-os/generated/context-index.md`：仅通过现有 generator 重建。

Approach: 首先修 pointer，按实测需要才增加有界提示；不扩展 E2 为通用流程状态。Read List: 对应 owner、候选渲染及 dry-run/生产边界、现有 generator/checker。  
即时完成门：独立运行 `node --check .claude/hooks/route-guard.mjs`、`node scripts/test-routing-candidate-hints.mjs`（当前已有生产提示/旧 decision 回归）和 `python3 scripts/build-agent-context.py check`，保存退出码与当前源码绑定。这里两个 harness 指 hook 使用各 harness 环境的生产 stdout，不调用原生模型，不受 Claude OAuth 影响；不能冒充双端 Agent 行为。此门不依赖 U-003 新 mutation。最终集成门：U-003 的新反例/mutation/context 保护与 U-004 原生行为票；失败返修原 U-ID。Status: PLANNED。

### U-003 — 将事故与保护反例编入现有回归
Source: 用户要求补齐未看到场景；真实事故而非纯作者自造答案。  
Dependencies: U-001/U-002。model_tier: core-execution。phase_type: task_execution。

Files:
- `scripts/test-routing-candidate-hints.mjs`：实际 hook 输出、候选碰撞/非执行语境、去掉 owner/整体检查的 mutation；隔离临时副本。
- `scripts/test-agent-context.mjs`：增强 pointer 条件/截止时机与投影回归，mutation 证明削弱后变红。
- `scripts/test-design-tool-routing.mjs`：入口/输入工具边界及 R3 合同保护；静态证据明确不冒充真实路由。
- `memory/evals/routing/fixtures.jsonl`：真实输入与最小必要 context 的 semantic 样本，不改变 keyword 期待为自动选链。
- `scripts/test-eval-routing-contract.mjs`：保留旧校准 23 项，新增样本后按真实 semantic 集检查 queue 分母，仍不称为行为命中率。

Approach: 复用现有 suite、盲评工作单与独立答案，拒绝新常规日志/调度器。Read List: 上述源码与 eval_routing.py。  
Verification: ASSERT A1–A7，真实红→最小修正→绿；mutation 仅改 scratch，不覆盖本检出。Status: PLANNED。

### U-004 — 原生行为验证、会审闭合与交付
Source: 用户“专家会审后的计划，并执行”；框架维护双 harness 证据要求。  
Dependencies: U-003。model_tier: reasoning-heavy（公共 MR-004 / 独立终审）。phase_type: task_execution。

Files: 本次计划与 checkpoint；证据限定 `framework-audit/routing-experience-20261009/`；不在共享 docs 下落盘。  
Approach: 主 Agent 保留本次源 inventory/hash、完整 required 集、实际 stdout/stderr/exit；原生独立主体作行为样本，冷判官按冻结分母复核。优先复用当前可靠原生能力；已有 evaluator 若不支持多轮，不冒称其已验证，也不扩建通用评估设施。  
Read List: long-session、cross-harness、project-verification、quality-gate、routing-chain-check R4；核实际 callable surface。  
Verification: A8/C1–C6。缺某 harness 原生能力保留具体 GAP 并报告，不以另一端通过证明 parity。Status: PLANNED。

## 5. 可执行断言与质量 criteria

各命令独立进程，退出码原样保留；均 BLOCKING。执行前检查其实际副作用仅在当前批准文件/测试临时范围。

```bash
# [BLOCKING] A1 — 生产提示与 mutation，而非只看 dry-run
node scripts/test-routing-candidate-hints.mjs
# [BLOCKING] A2 — 上下文 pointer、projection 与保护回归
node scripts/test-agent-context.mjs
# [BLOCKING] A3 — OD/输入格式/真实选择保护
node scripts/test-design-tool-routing.mjs
# [BLOCKING] A4 — semantic 样本盲评/分母，旧 keyword 不退化
node scripts/test-eval-routing-contract.mjs
# [BLOCKING] A5 — 所有现有 keyword 样本保持零新增回归
python3 memory/scripts/eval_routing.py --keyword-only
# [BLOCKING] A6a — 生成物一致
python3 scripts/build-agent-context.py check
# [BLOCKING] A6b — 上下文合同一致
node scripts/check-agent-context.mjs
# [BLOCKING] A7a — hook 语法
node --check .claude/hooks/route-guard.mjs
# [BLOCKING] A7b — 跨端共享合同
node scripts/check-capability-parity.mjs
```

A8 [BLOCKING，U-004 原生结果谓词]：required 行为集固定为 S01/S02/S03/S04/S05/S09/S11/S12/S14/S16/S20/S22 × Claude/Codex，共 24 个组合；其余 S01–S24 合同保护不可删。每个不可运行入口保留 GAP，阻断对应行为 PASS；双端真实行为缺票不得宣称完全交付或 parity。

当前 A8 readiness 未通过，不能声称已有可执行完整行为 TEST。最小准备放在 U-004 的首个 TEST 之前，不另建评估引擎：冻结 native-cases 各轮 UTF-8 用户原文、只读 fixture 限制、实际 source 文件逐个 SHA、计划/真实批准来源、每个 required 组合的预期与权限前置条件。使用现有 CLI，逐命令保存 argv/cwd/起止/退出码/stdout/stderr。精确命令形态如下，`${CASE}`/`${SESSION_ID}` 必须在冻结 manifest 中替换成具体值，未替换即 GAP：

```bash
# Codex fresh，保存真实 thread_id；单轮非续接才允许 --ephemeral
codex exec --sandbox read-only --json -C /Users/luca/.codex/worktrees/7ede/luca_gstack - < "${CASE}-turn1.txt"
# Codex 同一真实 session 续接，不用 --last 猜身份
codex exec resume --json "${SESSION_ID}" - < "${CASE}-turn2.txt"
# Claude fresh，不跳过真实 hooks；精确 session UUID 写入 manifest
claude -p --session-id "${SESSION_ID}" --permission-mode plan --permission-prompts none --tools Read,Bash --strict-mcp-config --mcp-config '{"mcpServers":{}}' --no-chrome --output-format stream-json --verbose < "${CASE}-turn1.txt"
# Claude 同一真实 session 续接
claude -p --resume "${SESSION_ID}" --permission-mode plan --permission-prompts none --tools Read,Bash --strict-mcp-config --mcp-config '{"mcpServers":{}}' --no-chrome --output-format stream-json --verbose < "${CASE}-turn2.txt"
```

运行前后 doctor 核实际 session/source/cwd/权限/owned PID；有真实工具读取和产生的问题/等待才可判路由行为。只读限制阻断写效果的行不可判完整执行 PASS；合成上下文不能冒充真实 Project Gate 创建。Claude 认证未恢复或任一源/driver 未绑定时停在准备，留下尝试和具体 GAP。此 A8 是明确有前置阻塞的验收要求，不是伪装为已就绪的命令。

criteria:
- C1 整体流程意图在 SINGLE/NONE/Project/Plan 回复后有可核验去向；不能只返回标签。
- C2 已选择不重问，真正歧义只问影响路径的一项；引用/否定/审计无执行效果。
- C3 输入格式不代选工具，模板发现不代采用；真实权限与作用域门均保留。
- C4 成熟入口和 standalone 都可达，所有 requested 产物仍有去向，质量门没有伪造/删除。
- C5 新旧生产提示、pointer、生成物和测试属于本次确切版本；mutation 能抓真实断线。
- C6 原生证据与静态/标签证据分列，双 harness 缺口如实呈现；作者不代独立票。

失败策略：即时完成门失败停止后继单元，原单元返修；最终集成门不作为其测试生产单元的前置，失败返修原 U-ID 并重跑受影响集成门。U-001→U-002→U-003 无反向完成依赖；U-004 只消费前三单元输出。连续两次同门失败做 delta。R4 反证/修订默认至多两轮；本次仅因第二轮揭示的完成门循环追加一次有说明的有限复核，其后存活阻塞交用户裁决，不再自行追加。未知不转 PASS，不以目录大小、文件数或旧结果宣布完成。

## 6. 实施前确认与交付

上述 11 个实施文件及限定计划/证据目录构成 exact scope。Supervisor 按仓库 K3/plan-agent 在具体计划形成后取得真实、范围匹配的确认；专家票和用户此前泛化的“规划并执行”不伪装成对尚未形成字节的确认。批准绑定计划绝对路径、ID、最终 SHA、scope/effects 和真实确认时间，内容变化重新核验。检查器/普通 JSON 不授予权限，不伪造 native approval receipt。

确认前可以完成源调查、会审、计划与只读 baseline。只有真实具名许可和本次收据例外成立后，主 Agent 才直接按 U-001→U-003 实施有限本地修改，独立专家只读复核；否则保持 PLANNED。U-004 先做 readiness，已有前置缺口未解除就保留 BLOCKED，不发布完全交付结论。没有许可时不制造批准/身份票通过门禁，没有原生收据时不启动 Plan 自动派发。最终交付：用户可理解的行为变化、有限 diff、测试/反证与原生缺口、恢复指针；本计划不包含 Git publication、安装新 hook 授信或永久审批框架改造。

<!-- FILE_END: routing-experience-plan -->
