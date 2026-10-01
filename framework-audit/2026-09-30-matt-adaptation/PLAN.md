# Matt Pocock 38 项技能适配 luca_gstack：执行合同最终方案

## 1. 目标、基线与最终采用结论

本稿是最后一轮独立专家与红队审查后的执行合同。按用户最新明确指令，本轮两份冻结稿原票齐备后，由作者修复问题、自审并交付，不再派发新一轮计划评审。原票、修订及自审证据分开保留，不把作者修订后的最终字节宣称为双独立 PASS；具体闭合记录见 A/FINAL-DELIVERY-RECEIPT.md。实施从 U001 开始，H0、Htest、Hpublish 是针对具体变更与外部效果的真实授权门，不代替计划设计。

本轮只修订与审查计划，不修改或安装技能，不发布框架。会审回执、正文 SHA 与交付状态单独记录在审计目录，防止自引用哈希或把未来验收提前写成 PASS。

实施目标是：以固定上游版本整体更新方法正文，适配 luca_gstack 的唯一能力所有者、原生权限、项目隔离和交接机制；经行为验收后发布到仓库、桌面框架、Luca 内嵌框架及指定个人技能目录。不能把文案变化或机检通过称为能力提升。

冻结值（本轮审查与最终方案的基线快照；未来开工必须按U001/§4重新读回，不把本快照当作持续有效的运行状态）：

- M0 = 0c56460e5a0761b7caaa7b628a1bf22fd57a2c09，本轮已核实发布的桌面框架基线；Mprev = eddae51c01a07794227954b7ca87492ffe5f8c0a，其父提交。
- E0 = Mprev，内嵌框架当前main仍是旧版本且工作区清洁；R/main及R/origin/main=M0。E只有backup/upstream，没有origin；本计划不添加或修改其remote。U014在Htest内先按明确合同将E对齐M0，再跑统一M0 baseline。
- S = d81f3a183412e71a5b1e84ca21bc1a35eea03a60，Matt 上游冻结版本。
- R = /Users/luca/Desktop/luca_gstack；E = /Users/luca/Desktop/项目/muse/lucagstack。
- O = .claude/skills/office；K = .claude/skill-os，以下仓库路径均相对候选 worktree。
- B = framework-audit/2026-09-30-matt-adaptation；G = B/global-candidates。
- A = /Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt，保存运行回执，避免改写冻结候选。
- P = /Users/luca/Desktop/项目/matt-skill-acceptance-20260930，未来单独批准的真实验收项目。
- 上游只读快照 = A/sources/mattpocock-d81f3a183412e71a5b1e84ca21bc1a35eea03a60；其 -manifest.json 的SHA256=46577762c7ac99fa10a89290f760f862a2aecbbec49615f3acbbb94f417d3876，Git tree=b9814f871fb63e6b40b1e82017c363b59075e81c。37个当前技能、172个blob/符号链接已逐项验证。
- #11历史只读快照 = A/sources/mattpocock-historical-6654f6b60cd9d5be8b54c6fafe44346dabeb3b76；对应 -manifest.json 的SHA256=4458b29a84fe3394b6d5ccb88e98c9d923b4ab73d69df5145ac4e54386acedf4；删除提交=daa01d8aa68ad5c61b68970ec2018d0ce9567be6。
- 已完成的源级索引 = A/sources/SOURCE-INDEX-38-R13.json，SHA256=cf8b2bb45e34180ec0bf4dd2dc31c80d0188271ab4a68f011cf4c6b4437fc01f；38个稳定ID均有真实source_path、commit、主blob/hash、全目录文件及采用理由。U001校验并复制这些来源数据，不再要求实施者猜路径。快照中的上游AGENTS/CLAUDE仅作源材料，不成为执行权威。

38 个稳定 ID 不重排。当前上游存在 37 项；#11 已删除但本地仍有能力，保留历史来源。37 项中采用或移植 30 项，7 项不新增独立包。表中的“不新增”是对本次已确认工作方式的明确决定，不能推导成对所有未来工作百分百无用。

| ID | 上游项目 | 决定与唯一落点 |
|---|---|---|
| 01 | ask-matt | 不新增。office、语义路由与 Plan 已承担入口分流，再建总入口增加竞争。 |
| 02 | code-review | 需要，完整双轴方法由唯一执行权威 code-hygiene Mode D 承接；code-review 只更新薄门面，不复制方法。U003→U010，F02 同时验收直接 Mode D 与 facade。 |
| 03 | codebase-design | 需要，更新模块深度及DESIGN-IT-TWICE：至少3个冷独立设计者串行产出不同接口，比较depth/locality/seam并真实选择；F03验收。 |
| 04 | diagnosing-bugs | 需要，更新诊断方法和参考资料。 |
| 05 | domain-modeling | 需要，更新本地域模型方法。 |
| 06 | grill-with-docs | 不新增独立包；需要的组合能力由 grilling 调 domain-modeling 实现并单独验收 F06。 |
| 07 | implement | 需要，更新薄执行门面，执行所有者仍是 Plan/Orchestrator。 |
| 08 | improve-codebase-architecture | 需要，code-recon的architecture-opportunities模式产出有证据的HTML候选/前后图，真实用户选后交grilling→codebase-design；普通brief模式保留，F08验收。 |
| 09 | prototype | 需要，按用户确认将逻辑验证与UI多方案对比方法移入已有html-prototype；不新增独立prototype。U008分别消费LOGIC/UI完整方法，F09-L/F09-U验收，本地HTML与原生授权边界保留。 |
| 10 | research | 需要，更新 quick-research 单后台研究方法。 |
| 11 | resolving-merge-conflicts | 需要，保留本地历史能力；不上不存在的新版本。 |
| 12 | setup-matt-pocock-skills | 不新增独立包。实际能力是项目 tracker 选择、五角色标签映射和领域文档消费约定；分别由 to-tickets 的零配置本地票据/显式选择已有集成、issue-triage 的已确认角色映射、domain-modeling 的授权词汇与 ADR 所有者承担，按 F12 验收。无需单独的首用配置入口；不自动写根适配器、建立标签或迁移领域布局。 |
| 13 | tdd | 需要，更新个人 tdd。 |
| 14 | to-spec | 需要，更新本地规格门面。 |
| 15 | to-tickets | 需要，更新票据投影方法。 |
| 16 | triage | 需要，新增 issue-triage。 |
| 17 | wayfinder | 需要，更新长期复杂规划门面。 |
| 18 | wizard | 需要，新增 setup-wizard。 |
| 19 | in-progress/claude-handoff | 不新增。平台专用自动交接与现有 handoff、原生 session 权限重叠，不能取得启动会话权限。 |
| 20 | implement-spec | 需要，把 ready frontier、依赖与集成基线移入实际 Plan/Orchestrator。 |
| 21 | in-progress/loop-me | 需要，新增 loop-me，产出可重复工作合同。 |
| 22 | pr | 需要，移入 implement/Orchestrator 的 PR 写作参考。 |
| 23 | retro | 需要，移入 code-hygiene 的 environment-retro；本地设计 retro 继续承担设计复盘。 |
| 24 | setup-ts-deep-modules | 需要，作为 codebase-design 的 TS 模块配方。 |
| 25 | writing-beats | 需要，writing-workshop的beats模式：读者前置概念、requires/grounds可达候选、用户选择、单beat写入、逐次重读保留编辑；F25真实文件/交互验收。 |
| 26 | writing-fragments | 需要，writing-workshop的fragments模式：从初始语料访谈探索，单H1与横线分隔无结构碎片，持续追加/重读保留编辑；F26验收。 |
| 27 | writing-shape | 需要，writing-workshop的shape模式：只读原料、确认读者前提、2–3开篇供用户选、逐个同意块写入与概念grounding；F27验收。 |
| 28 | git-guardrails-claude-code | 不新增。本地跨 harness 保护、受控变更和发布门已有所有权，再装 Claude 专用 Hook 会出现双重控制。 |
| 29 | migrate-to-shoehorn | 需要，个人 tdd 的测试数据迁移配方。 |
| 30 | scaffold-exercises | 不新增。本次目标不包含课程练习仓库生产；现有 codebase-to-course 负责代码库课程化，不能把特殊练习脚手架当框架通用入口。 |
| 31 | setup-pre-commit | 需要，code-hygiene 的 pre-commit 配方。 |
| 32 | productivity/grill-me | 不新增。grilling 已是唯一追问所有者，再建同义入口无独立能力。 |
| 33 | productivity/grilling | 需要，整体更新为按独立决策 frontier 分轮追问。 |
| 34 | productivity/handoff | 需要，整体更新事实、未决事项与恢复指令方法。 |
| 35 | productivity/teach | 需要，更新个人Claude teach：授权教学workspace的交互HTML课程、即时练习反馈、既有assets复用和真实学习记录；不假设Codex安装，F35验收。 |
| 36 | productivity/to-questionnaire | 需要，research-kit 新增 decision-questionnaire。 |
| 37 | productivity/wait-what | 需要，整体更新术语解释方法。 |
| 38 | productivity/writing-for-agents | 需要，整体更新，并由 skill-authoring 引用其写作方法。 |

grilling、handoff、writing-for-agents 已在本地存在；此次先采用 S 的完整方法，再重建本地权限、输入、交接适配，不保留旧方法作为默认。:codex-annotation{index="1"}

#12 的取舍逐能力成立，不以名称或“安装器”猜测正文：

- tracker 选择由 to-tickets 负责：未显式选择真实 tracker 时，本地逐票 Markdown 路径零配置可用；明确选择 GitHub/GitLab/其他 tracker 时，只使用用户已指定且已认证的集成与项目/仓库目标。不能从 git remote 推导发送权限，不能自动安装 gh/glab 或建立第二份 tracker 配置。已有授权项目约定与本次明确目标冲突时先向用户确认。
- 五角色标签由 issue-triage 负责：从用户提供的或已授权项目现有映射取得 needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix 的实际 label；没有映射时只输出角色和预览，待用户确认，不自动创建标签。U006 的 tracker-contract 写清 role→label、来源和授权目标，外部 mutation 仍依 CAS/发送门。
- 领域布局由 domain-modeling 负责：使用已确认项目现有词汇/ADR 所有者；单域与多域都沿现有授权路径阅读相关术语和 ADR，发现冲突先指出。缺文档时可继续只读分析，不在首用时补建 GLOSSARY/MAP、重命名 CONTEXT 或迁移布局；真正解决术语/决策后，按 domain-modeling 的真实批准惰性写入既有或本次精确批准的落点。

以上消费约定分别写入 U003 的 to-tickets/domain-modeling 正文和 U006 的 issue-triage 正文及 tracker-contract，用 F12 证明三者可独立首用、目标/映射不串线。#12 不移植整套首用脚手架、不新增 alias/命令/独立包：零配置本地模式和本计划明确的三个消费者共同覆盖其目标，其中 issue-triage 由 U006 新增，而上游修改根 AGENTS/CLAUDE、建立 docs/agents 及默认领域布局的统一 setup 步骤会另造配置所有者；本次不引入这套额外约定。这里没有暂缓项，也不把它判断为对所有未来项目百分百无用。

“整体覆盖”适用于上游方法与其必要引用。本地 root kernel、Human Gate、原生项目权限、模型路由、受控变更和共享交接契约由本地所有者继续负责。上游要求写根 CONTEXT/GLOSSARY、自动开会话、自动合票、reset 或改 Hook 时，都必须转译到本地授权动作，不能随正文获得权限。

## 2. 共同执行规则与逐单元实施

所有单元初始状态 PLANNED；按 task_execution 调度。实现者默认 core-execution，模型角色 anchor；独立专家、红队和最终判官用 peak，由已授信运行时解析私有 binding，不写死模型名，不以 effort 代替模型路由证据。本协作任务任何时刻最多一个在运行的subagent；按 /Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/feedback_serial-subagents-default.md 的现行规则，前一个真实完成后才派下一个，不按模型或独立性开并行例外。每个执行者有明确文件所有权，交棒后复核preimage，不得覆盖其他人的改动。两个用户自建会话分别承担作者和会审协调；独立判官仍逐个冷启动，互不读结论。

Codex原生派发必须以common-v2的dispatch.native_agent_types为准：worker/default=MR-001 anchor，explorer=MR-006 anchor，preflight-agent=MR-008 light，独立专家/红队/计划裁决均用已登记quality-gate=MR-004 peak、fork_turns=none。MR-002/003/005/007尚无对应native身份，不能用prompt或显式model冒充已接通；本任务不新增模型身份，不修改私有binding或effort。Claude tier/alias只是延期adapter兼容元数据。每个关键invocation实际完成、同次accepted证据闭合后才派下一个；pending preparation/invocation或critical failure均停止相关native/runner调度，不调用producer补票或通过新activation假装旧票完成。当前个人串行规则覆盖所有worker/runner，不能用运行时允许非关键并行作为本任务并行例外。

共同前读 R0：AGENTS、routing-chain-check及其现行串行subagent规则指针、K/skill-authoring.md、skill-invariants.md、controlled-change.yaml、runtime/framework-maintenance.md、runtime/cross-harness.md、O/SKILL.md，以及自己所有文件和 S 对应完整目录，均读到 EOF。条件前读 R1：runtime/project-session.md、workflow-mode.md、对应 generated/input-modes 输入投影与 fallback、office handoff-protocol。工程门面加读 R2：plan-agent、orchestrator、plan-engineering-modes、routing-chain-check。来源登记加读 R3：FUSION-RUNBOOK、BENCHMARK-RUNBOOK、installed-pins 字段和 daily_governance 的 drift 消费逻辑。

每个单元在开工前核对 scope witness、active-context、输入与前置回执，声明精确文件所有权、目标与 DONE。清单中的集合在 U001 展开成有限路径及 preimage；未经再计划，不能添加文件。单元回执含 UID、输入/输出 SHA、改变原因、局部检查和剩余风险。

关键阶段区分：

- U003–U010 的 DONE 仅指内容实现：完整来源覆盖、所有引用可达、权限及保护契约保留、语法/局部静态检查通过。不得依赖尚未建立的 F runner 或原生验收。
- 能力采用状态单独为 PENDING/PASS/FAIL/UNKNOWN，归 U012-b；内容 DONE 不等于已采用或可发布。
- U012-a 建立测试后可打回具体内容单元；这属于修复循环，不形成前置依赖环。冻结 C 后的任何源码修改都使 C 和相关证据失效，重新走冻结、CI及受影响验收。

### U001：审批前清单、H0握手与候选工作区合同

负责人 WA0；启动前置为计划作者已交付的最终方案及 FINAL-DELIVERY-RECEIPT.md：包含本轮专家和红队的真实完成原票、逐项修复和自审闭合，不再要求修订后新增双PASS计划票。H0是本单元内部的审批门，不能成为清单准备的前置；H0前后动作按以下顺序分开。

U001-P（H0前）由WA0只读取证：复核已交付的来源索引、完整本地所有者、R=M0/E=E0的分别基线、E的backup/upstream且无origin事实、现有个人安装、§4列明的全部当前效果所有者占用和本任务list_artifacts。展开本合同所有有限仓库路径、symlink target/mode以及真实preimages，生成 A/preapproval/PATH-SCOPE.json、PREIMAGES.json、PROTECTED-EXCEPTIONS.md、H0-PAYLOAD.md；这些是仓库外的计划审计材料，不创建worktree、不写仓库B、不改源码或安装目录、不做Git ref/commit/push。H0-PAYLOAD列明来源/方法目标、有限路径、允许命令、worktree工具参数、保护例外、验证及恢复范围。

随后向用户呈现这套已完成的清单取得H0。H0-M（批准后）才检查并复用本任务已有且来源M0、无用户改动的合适受管理worktree；没有时调用create_worktree，参数name=matt-skills-adaptation、ref=M0、allowAsync=true，按返回的workspace身份与操作回执推进。候选分支固定codex/matt-skills-adaptation；若该分支被其他任务占用则BLOCKED，不随意换名或覆盖。实际返回路径核验后绑定当前U的repo identity/精确scope，声明的一次性Git效果仍按controlled-change审批与CAS消费。

实施会话仍从已授信正式框架启动；候选worktree只是编辑对象，未经Htest不能成为原生测试运行根。H0批准后才在候选中建立B/PLAN.md、SOURCE-MAP.json、ACCEPTANCE.json、HANDSHAKE.md、MANIFEST.json，复制审计清单。各U实际apply_patch在写前由当前U绑定精确patch_sha256、preimages及允许目标；不把有限scope当作任意补文件权限。

SOURCE-MAP 每行记录 stable_id、source_path、repo_sha、blob_sha、完整文件哈希、唯一消费者、处置理由和 test_ids；验证 38 唯一 ID、37 上游存在、1 历史删除、30 采用/7 不新增。#11 记录历史 pin 与删除提交，不伪造新正文。MANIFEST 展开全部有限文件，登记 symlink target、mode、删除项、精确 preimage；保护 .workbuddy/，framework/ 只读，根会话保持 NO_PIN，不访问共享 docs/、current-topic 或 workflow-state 别名。

U001-P另为未来Htest建立A/preapproval/E-BASELINE-ALIGNMENT.json：仅上游已发布M0的13条Git实际changed paths、E0/M0对应blob/type/mode和preimages、E的main/FETCH_HEAD、官方guard/trust预期及恢复到M0的边界，不在此阶段同步E。13条精确路径为.claude/agents/orchestrator.md、.claude/agents/plan-agent.md、.claude/hooks/lib/codex-child-project.mjs、.claude/skill-os/model-routing.yaml、.codex/hooks.json、.codex/model-route-hook.mjs、.codex/workflow-runner.mjs、scripts/model-route-host.mjs、scripts/test-codex-child-project.mjs、scripts/test-codex-model-route-hook.mjs、scripts/test-model-route-host.mjs、scripts/test-model-route.mjs、scripts/test-workflow-runner-runtime.mjs。运行根源码的基线对齐与候选安装只在Htest批准后发生；H0批准不包含这项效果。

H0必须是审阅U001-P已经产出的清单后的真实批准，覆盖编辑、局部验证、单一候选提交、候选分支推送和面向 main 的草稿 PR；不包含正式安装或 main 发布。所有自动提取/记忆写入关闭。DONE：来源表、唯一所有者表、有限清单、授权范围以及全部当前效果所有者握手回执一致。

### U002：修正评估器，分开文本变化与行为提升

负责人 WA1；依赖 U001。文件：memory/scripts/behavioral_ab.py、memory/tests/test_behavioral_ab_gate.py、K/evolution/FUSION-RUNBOOK.md。

CLI tier 从现有档位定义取值并支持 core-execution；case IDs 必须非空、唯一且 baseline/candidate 集合相等；非法 regex 明确 BLOCK。保留 JSON 提取。其结果 scope 固定 mechanical-only，文本差异只称 text delta；最终行为判定交独立判官。Runbook 明确内容阶段、能力验收、发布阶段及普通快进发布，禁止 reset。U002 必须同步移除该手册的 Sonnet/Fable/Opus 固定模型及旧 model/effort 等价要求，改为最新 common native type/角色与真实采用证据；移除 baseline 禁文件读的旧提取配方，真实原生 baseline 只读实际M0/旧安装，candidate 读实际C/候选，两arm不共享live编辑。旧extract/judge只作mechanical-only投影，不充当技能行为A/B。worktree/static门与正式安装/全量门分别指向本合同H0/Htest，源码回退只用普通恢复/受批revert，不保留reset或stash的默认建议。其它手册的历史模型/并发措辞不覆盖当前model-routing、个人串行和原生批准权威。

DONE：针对空 ID、重复 ID、集合不匹配、非法 regex、core 档和“只改措辞无能力增益”的测试通过，unittest 与 selftest 通过。

### U003：整体更新已有方法，建立本地适配

负责人 WA1；依赖 U002；前读 R0/R1/R2，另读 code-hygiene 场景 D 与 extraction-bar 的写入边界。

拥有 O 下 code-review（仅触发/固定输入/委托 Mode D 的薄门面）、codebase-design、diagnosing-bugs、domain-modeling、implement、to-spec、to-tickets、wayfinder、grilling、handoff、wait-what、writing-for-agents 各自 SKILL.md 和 agents/openai.yaml；还拥有：

- codebase-design 的 DEEPENING.md、DESIGN-IT-TWICE.md。
- diagnosing-bugs 的 PROVENANCE.md，以及 references/{condition-based-waiting.md,condition-based-waiting-example.ts,defense-in-depth.md,root-cause-tracing.md}。LICENSE 和安全诊断脚本保留。
- domain-modeling 的 CONTEXT-FORMAT.md、ADR-FORMAT.md；writing-for-agents 的 SKILL-MECHANICS.md。
- O/quick-research/SKILL.md；O/SKILL.md 仅 grilling 的追问轮次例外；K/skill-authoring.md 仅委托方法引用。
- G/tdd 的 SKILL.md、tests.md、mocking.md、agents/openai.yaml；G/teach 的 SKILL.md、GLOSSARY-FORMAT.md、LEARNING-RECORD-FORMAT.md、MISSION-FORMAT.md、RESOURCES-FORMAT.md、agents/openai.yaml。

适配决策：

- source02 的完整固定基线、Spec/Standards 查找、十二种 Fowler smell 的判断及修正方向、双轴隔离与分列报告，由 U010 写入 code-hygiene Mode D；本单元 code-review 只固定 scope/输入并委托该权威，不重建副本。删除 facade 的并发承诺和与 Mode D 重复的方法段，仅保留可核查的一跳委托；不得把 U003 的 DONE 称为 source02 方法完成，F02 归 U010。
- domain 上游 GLOSSARY 格式映射到本地 CONTEXT-FORMAT 引用，不重命名根 CONTEXT；词汇归属限于调用者已授权项目。
- grilling 一轮可以包含多个独立决策问题；依赖问题等待前置答案。普通 Human Gate 保持逐真实决策批准。调用 domain-modeling 继承原 UID、scope 和 resume_target，权限只能取交集。
- quick-research 用一个原生后台执行者读 primary sources。Codex 不照抄 Claude 的 run_in_background 字段；按本地实际 context-cost 和共享 heavy handoff 判定交接，删除正文中与此相矛盾的“免交接”承诺；NO_PIN 不写项目交接。
- writing-for-agents 负责方法，skill-authoring 保持技能结构与注册权限。
- codebase-design的DESIGN-IT-TWICE必须在用户明确要替代接口时触发：先呈现所选candidate的约束、依赖分类和非提案示意；≥2设计者触发Plan，先按Plan/Orchestrator取得具体只读设计phase与scope的真实批准，再至少3个fork_turns=none设计者严格串行，各自收到相同技术证据/项目词汇及不同约束（最小1–3入口、最大灵活性、最常见调用者；确有cross-seam变化时可增ports/adapters方案）。不得给后者看前者设计。每案都产出类型/方法/参数、invariants/ordering/error modes、调用例、隐藏实现、依赖/adapter策略与trade-offs；展示后按depth/leverage、locality、seam位置比较并推荐或提hybrid。建议不等于人类选择或代码实施授权。普通深度诊断保留，不被强制3agent劫持。各设计者真实完成及native回执、峰值1必须可核验，不以作者模拟3种角色冒充独立设计。
- teach仅准备Claude个人安装候选，学习记录迁移采用精确路径合并，不能覆盖既有记录。教学运行根使用真实已授权teaching_workspace，不能把框架cwd/R/E、安装目录或rootCONTEXT推断为学习目录。MISSION未确认先追问学习原因，读实际RESOURCES/learning-records/NOTES/reference/assets以定位真实ZPD；主题指定也不编造已掌握程度。知识来自已提供或实际验证的可信primary资料，资源不足先补证，不用参数知识冒充来源。
- teach的主产物是lessons/<递增4位ID>-<slug>.html的单主题交互课程：关联MISSION，含高信任primary来源/引用、相关lesson/reference锚点和向教师追问提示；先教必需知识，再可操作的quiz/小任务及即时对错反馈/解释，以retrieval/spacing和适用时interleaving练习，选项字数一致以减少格式暗示。实际用户反馈才允许learning-record，I模拟测quiz不能被记录为用户已学习/掌握，短期答对不能证明storage strength。MISSION变更必须用户确认。
- teach在首课前读既有assets：已存在shared CSS/quiz/simulator等必须复用；缺通用部件才在批准assets精确路径新增并跨后续lesson复用，不内联重复已有组件。课程正文单HTML，CSS/组件可用本地相对assets链接，整个批准workspace bundle离线可运行；不把有assets依赖的课程宣称为独立无依赖单文件。同步产出reference/*.html的可打印速查知识、遵守既有术语及四个FORMAT。新lesson/record编号读实际目录递增，旧文件与用户笔记不覆盖。
- teach与code-recon报告是教学/代码说明产物，不属于产品UI原型：不绕道产品html-prototype的场景/五状态门，也不自动获取产品代码/GUI/联网权限。展示文件用已有已授权预览能力；新增网络/社区互动仍需相应权限，不能自动发消息或建学习调度。NOTES仅记录已授权教学workspace的真实偏好，不写全局/框架memory。

DONE 是内容与局部静态门。最终能力由 F03–F07、F10、F12、F13–F15、F17、F33–F35、F37–F38 验收；不把这些后置测试作为本单元前置。

### U004–U009：新增能力与既有入口扩展

| 单元、所有者、前置 | 精确文件 | 行为合同及内容 DONE |
|---|---|---|
| U004 WA2，U003 | O/writing-workshop/{SKILL.md,agents/openai.yaml,references/fragments.md,references/shape.md,references/beats.md} | 三种entry_modes，显式选择才启用。fragments消费主题/真实对话且必须有output_path；shape/beats必须有完整可读Markdown material_path和不同的article output_path。缺模式/路径追问后等待。每次写前重读磁盘，真实用户选择决定推进，保持素材只读与用户编辑；详见下方逐模式合同。完成/续接按实际context-cost执行共享handoff，不能默认免交接或捕获UX微文案任务。 |
| U005 WA2，U004 | O/loop-me/{SKILL.md,agents/openai.yaml,references/workflow-spec.md} | Stateful grilling先理解用户世界、发现值得说明的loop，再形成无未决问题的workflow spec；输入目标可空，此时按已授权NOTES/context发现而非编造。以精确workflow_spec_path持久化，支持同scope的修订/删除与真实续接。trigger/checkpoint/AI/schedule按需求选用而不强制；checkpoint尽可能位于准备产物之后，并给决策brief。详见下方完整合同；不创建调度器、常驻进程或恢复已退役Muse Loop。 |
| U006 WA3，U003 | O/issue-triage/{SKILL.md,agents/openai.yaml,references/tracker-contract.md,references/outcomes.md,references/agent-brief.md,references/out-of-scope.md} | Issue/PR材料+维护者目标→注意列表、完整验证、恰一category及恰一state、历史拒绝判断、durable brief与拟操作。离线可用，完整方法见下文。两category bug/enhancement与五state needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix映射既有标签，不自动建标签。覆盖远端状态必须有 connector 支持的条件写和 expected version；不支持则输出预览/手动动作。追加评论须显式发送授权和 operation marker；结果未知先读回，不盲重试。 |
| U007 WA3，U006 | O/setup-wizard/{SKILL.md,agents/openai.yaml,template.sh,references/manual-step-contract.md} | 服务目标+人工专属步骤→阶段顺序、每项值的来源/secret分类/落点、动作、验证和失败恢复；用户确认阶段合同后，脚本复制本地template.sh，在用户批准的精确outputpath仅改STAGES区并设置TOTAL_STAGES。WA3将S的wizard/template.sh完整移植到声明路径，保留stage、say/step、open_url的跨平台/WSL分支、ask/ask_secret、write_env的幂等upsert、set_secret/set_var、pause/confirm、finish的全部API。只作一项明确库适配：finish在SKIPPED非空时显示仍需人工核对/完成并返回非0，全部完成才返回0；差异及S原blob记录在manual-step-contract，生成脚本的库区必须与本地模板逐字节一致。生成时只检查配置键名与批准目标，不读取真实secret值；持久化和服务端写入写在已确认阶段中并有confirm，secret用隐藏输入及stdin、不输出值。生成不代表执行授权；agent不端到端运行人工wizard，不自动打开浏览器、改环境或写CI secret。缺少明确阶段/目标/路径先追问，不能留下默认Stripe样例当成用户流程。 |
| U008 WA4，U003 | O/html-prototype/{SKILL.md,SCHEMA.md,scripts/verify-prototype.mjs,scripts/test-verify-prototype.mjs,references/logic-validation.md,references/ui-variant-comparison.md}；K/skill-invariants.md 对应精确例外 | 新CLI --purpose=ui或logic-validation，默认ui，未知值exit2；文件与CLI purpose冲突失败，purpose与sourcekind/--mode正交。logic-validation按下方完整逻辑合同执行，仅审美24/30及固定五状态门N/A。UI新增可选ui_variant_count/--ui-variants=N，0为原有单方案UI，显式UI对比时默认3、合法2–5；逻辑用途不得启用UI变体。每一UI变体保留全部UI门。Phase顺序、HTML选择、骨架、追踪与真实浏览器QA保持。STATE注释不能作为浏览器证据；不新增prototype别名。 |
| U009 WA4，U008 | O/research-kit/{SKILL.md,references/instruments.md,references/decision-questionnaire.md} | 新 decision-questionnaire 输入角色、权限、未决决策、背景、回流目的；每题映射决策和回答类型。保持既有研究模式和 outputpath；不能伪装 Likert 统计研究，不能编造回复或自动发问卷；答案回到原决策所有者，不自动交给 insight-synthesis。 |

U005 loop-me完整合同：

- input goal可空；workspace_context_path指向已授权真实NOTES.md或提供的上下文，workflow_spec_path是批准的精确workflows/<slug>.md。禁止以框架cwd或rootCONTEXT推断用户世界。上下文薄或空时先访谈其工具、渠道、活动及词汇，取得真实回答后才提loop；用户点名目标时仍核对已有世界事实，不重复问已解决问题。
- 以life/career/week/activity的loop lens从上下文提出有根据的候选，让真实用户选定，再用grilling的设计树/frontier逐轮厘清。NOTES中新增canonical词汇须在已批准路径内获用户确认，不写全局memory。恢复时重读NOTES、现存spec和共享handoff中的已解决决策/待决问题，用户编辑胜过旧缓存。
- workflow spec描述循环目标、输入、步骤、结果及done、适用的trigger、停止/失败/升级/恢复，external权限及owner；只有需要时加入AI、schedule和checkpoint，纯人工、手动触发、无checkpoint的workflow同样合法。为checkpoint写明前置可完成的准备工作，push-right不能跨过本地不可推迟的人类/外部授权门。
- checkpoint brief是紧凑的决策包：准备了什么、为何、要用户决定什么、链接到哪个真实asset；不是把原始输出当brief，也不把未生成资产写成已完成。设计阶段可用明确标记的example brief和资产路径合同，不冒充执行产物。
- spec中任何可改变实现的未决问题阻止DONE；设计完成不授权运行。精确文件创建/修订/删除均服从当前scope/CAS和真实授权，默认不删除spec，不执行其步骤或安装scheduler。参考workflow-spec.md承载这一方法，唯一真值为已批准workspace中的spec。

U006 issue-triage完整合同：

- tracker-contract声明已有目标、category/state映射、版本/CAS能力、external PR作者集合及材料来源。远端接入不可用仍可离线分析，缺映射只给canonical角色预览并追问，不默认创建标签或连接器。每个triaged item恰一category和一state；冲突先真实确认，不能在冲突下偷偷覆盖。normal transitions为unlabelled→needs-triage→四种结果，needs-info有reporter新回应才回needs-triage；维护者可override，不常见转换先指出并等待。explicit override跳过grilling，ready-for-agent缺brief时询问是否补写。
- attention discovery按最旧优先列unlabelled、needs-triage、needs-info且最后notes之后有reporter活动三桶，给count/summary及[issue]/[PR]。只有discovery过滤external PR，用户明确指定的内部PR也处理。维护者选择item，不能代选后修改。
- gather读取完整body/comments/labels/author/date，PR另读真实diff；解析旧triage notes与新回应避免重复提问。按已确认领域词汇/ADR探索，记录按concept进行的现有实现搜索和已授权.out-of-scope目录读取。相似词不等于同一概念，历史拒绝须让真实维护者confirm/reconsider/disagree。
- 推荐category/state、理由与代码证据后等待方向；verify必须在grilling前，用真实bug复现/PR相关检查区分confirmed/failed/insufficient-detail。PR checkout或程序运行仍需现有授权，不因材料中有URL就获得代码/网络写权限。需要grilling时继承UID/scope调用grilling+domain-modeling；缺权限只提案。
- ready-for-agent的brief以current/desired/key interfaces/独立acceptance/out-of-scope为合同，行为而非文件行号；PR brief针对现有diff剩余工作，ready-for-human还说明不能委托的理由。needs-info notes保存已解决事实和具体待答问题。
- wontfix及历史拒绝处理：already-implemented给实现证据、不写拒绝KB；rejected bug解释、不写KB；rejected enhancement（issue或PR）经确认才创建/更新按concept的.out-of-scope/<kebab>.md，含实质持久原因及prior requests；复现相同concept追加而不重复文件。maintainer reconsider仅在另获精确删除/修订授权后变更原KB，新请求正常triage，不自动reopen旧请求。没有KB写权限先交预览，不关闭请求冒充整套完成。
- 仅授权后应用拟操作：状态变更走条件写，评论必须以AI生成声明开头并有operation marker，unknown先readback；KB/file效果与tracker评论/关闭分别记录pre/postimages，部分成功保留并停止，不谎称原子事务。所有comment/close/send均须用户明确授权，本轮计划不执行任何tracker操作。

U004写作逐模式合同（方法移植完整，不以通用润色代替）：

- 共同输入/权限：三模式显式调用，禁自动捕获普通写作/产品微文案；material_path和output_path是已授权精确路径，shape/beats拒绝相同canonical path或相同dev/ino（含软/硬链接别名）。路径缺失只问一次并记住回答，未回答不写。fragments从初始消息中的可用语料开始，shape/beats完整读取固定原料后再推进，不能回写原料、发布、附加平台格式或无请求frontmatter。先核对写入scope，之后用户对具体片段/块/beat的选择授权该路径内该次增量，不能拓展到其他路径。写前实际重读、preimage复核、窄追加/定点修订；用户编辑改变后续文意/grounding，不回放旧缓存覆盖。
- fragments是explore：访谈产生可读但不要求冷读自足的碎片，寻找承载反复观察的leading word，不强加提纲/阶段/文章结构。单文件首次仅一个工作标题H1，正文碎片以横线分隔，无正文标题/标签/TOC/日期/元数据；按产生顺序追加，保留原始事实与待验证标记，不编造引文。用户可要求剪切、重写或合并指定碎片，其他字节保留。
- shape是exploit：固定原料只读；先真实确认读者prerequisite概念，给2–3个不同论点/角度的开篇供用户选择或组合。维持grounded集合（prerequisite+此前块真正介绍的concept），每个候选块的requires必须已grounded；缺支撑材料明确指出，让用户给材料或删该部分。逐块与用户讨论prose/list/table/callout/quote/code的形式与理由，同意一个块后立即只写该块，再读磁盘继续；不批量先写整篇、不自行认定完成，用户决定结束。
- beats是exploit：固定原料只读；先真实确认prerequisite集合。给2–3个可达起始beat，逐项列requires/grounds及会解锁的后续方向；requires必须属于当前grounded概念集合，概念不是只查术语词。用户选一个才写且只写该beat，随即停止，重读文章，再给2–3个可达下一beat。选中beat引入的概念才入grounded集合；诱人的beat缺基础时先提供grounding beat或让用户明确调整prerequisite，不静默跳跃。实质编辑/回退后从当前文章重算引入概念，指定beat重写只改该段。自然结束时确认已回答文章问题，剩余原料可不使用；不得自动写完全部pile。
- 可恢复状态通过共享handoff保存mode、原料/文章真实路径与SHA、读者prerequisite、当前grounded/选中单元及待决问题，不另建文章真值或自动写memory。轻量结束免交接仅按共享协议的实际条件，长会话照常交接。

U008原型两分支合同（唯一消费者html-prototype）：

- 方法来源分别为S的prototype/LOGIC.md和UI.md，均映射到U008上述两个reference；SKILL明确消费位置，SOURCE-MAP分别绑定F09-L与F09-U。上游自动归档到throwaway Git分支、生产代码折入及远端issue指针，转为用户明确要求后的原生Git/实现/发送门；原型完成本身不授权这些效果。问题不清先真实确认，不采用“用户不在场就选分支”的权限替代。
- 逻辑分支：单自包含HTML，页面显式展示业务问题、可读领域状态面板、自由动作按钮和至少happy/edge/illegal三个tabbed guided walkthrough。每个walkthrough从已知初态reset，步骤是真按钮并显式推进；任意自由顺序仍遵守同一状态模型。实际逻辑在单script内的可移植pure reducer/state-machine/函数集合模块，不引用DOM/document或反向回调页面；薄页面调用模块、动作后重绘全部相关状态。仅审美24/30和固定五状态N/A，仍要求需求声明的全部状态/转换/错误/reset、无持久化/真实DB、可读性、骨架确认、真实浏览器与便携性证据；不在原型内新建测试框架或生产抽象，验收测试留在独立fixture。
- UI分支：只有已明确本地HTML且用户要求对比时开启ui_variant_count；其它调用值0完全保持当前单方案UI。count/schema/CLI必须一致，非法数值或logic+N>0 exit2；key按A…E的前N个且不重排。变体在同一index.html，以?variant=A切换，只替换rendering子树；使用同一批准数据与外壳，结构/信息层级/主操作明显不同，颜色或文案换皮不算变体。优先以现有已授权页面/截图为宿主语境保留header/sidebar/密度与只读数据；无宿主才用已批准独立页面并写明原因，不因此改真实应用route、数据获取/auth或生产代码。真实框架route版不在本次HTML skill写范围，若用户另要它，交实际implement/Plan所有者重新批准；不能说本地静态壳已经验证真实auth/数据集成。
- Phase2.75确认每个变体骨架、共用约束与对比假设；已冻结上游布局与对比方向冲突时回原owner澄清，不用standalone绕过Packet。prototype-spec新增UI Variant Coverage：count/key、布局/层级/主操作差异、宿主保持区、共同D/STATE/AC、各变体假设及真实来源。各变体都验收UI审美≥24/30、五基础状态及全部适用状态、共同已确认D/AC和内容守恒；普通UI的规则不降级。
- 单共享浮动底栏显示当前key/名称，左右箭头首尾环绕；键盘左右同样切换但input/textarea/contenteditable聚焦时不拦截。只修改variant query参数，保留其它query/hash；直接链接与reload稳定，未知key显示可恢复错误而不是冒充正确方案。不得连接真实写接口。prototype-spec与HTML显著标原型，底栏/变体资产只放批准原型目录，不能自动进生产route/main；以后真实应用实现由其owner按真实build环境做production guard并移除原型控制栏，此移植不声称提供了应用生产构建能力。
- 浏览器QA先遍历每个key，再遍历各自适用state/action，按key分别输出截图、状态/决策覆盖、UI分数与错误。选择只由真实用户作出，可选某变体或组合部件，记录选择和理由再回原设计/实现owner；HTML比较产物不自动晋升为生产。保持区必须按R-20260826-001可枚举角色/场景/模块/指标/表项/动作/详情子页；独立Gate对源抽查，不能用“整体不变”代替契约。

全部前读 R0/R1。U008 另读当前 dynamic-reference-protocol、aesthetic-rubric、html-prototype-tokens、ux-writing、dev-handoff-dimensions；U009 另读 grilling 与 insight-synthesis 边界。每项内容 DONE 必须检查上述接口、正反路由及权限引用；F09-L/F09-U、F16、F18、F21、F25–F27、F36 为后置能力验收。

### U010：移植配方到真正执行所有者

负责人 WA1；依赖 U003–U009，串行接收共享文件所有权；前读 R0/R1/R2。

文件：O/code-recon/{SKILL.md,references/architecture-candidates-report.md}；O/codebase-design/{SKILL.md,DEEPENING.md,references/ts-module-boundaries.md,assets/dependency-cruiser.config.cjs}；O/code-hygiene/{SKILL.md,references/environment-retro.md,references/pre-commit-setup.md}；G/tdd/{SKILL.md,references/shoehorn-test-data.md}；O/implement/{SKILL.md,references/pull-request.md}；.claude/agents/{plan-agent.md,orchestrator.md}。

- source02：WA1 明确拥有 code-hygiene/SKILL.md 的整个 Mode D 执行段与末尾对应约束；承接 S 的 code-review §§1–5 全方法及每种 smell 的 what→fix 启发式，仓库标准优先、机械工具已覆盖项不重复报。执行角色解析按 common native types：冷质量判官用 quality-gate/MR-004 peak、fork_turns=none；删除 opus/Fable 硬编码与“同一条消息并发”要求，Standards 真实完成且同次 accepted 后才派 Spec，后者不能读取前者意见。没有 Spec 的通常审查明确 NOT RUN；用户明确要求需求核验却缺该需求则真实追问等待。R4 仍是独立性/REFUTE/闭合证据唯一权威。code-review facade 与直接 Mode D 消费同一固定输入及方法，不互相复制真值；分列、只读及不自动修复不变。F02 在相同已冻结 diff/spec/标准 fixture 下分别通过 facade 与直接 Mode D 调用：必须命中同一预植的标准违规、Spec 缺项和正确轴，核验原生身份/串行峰值 1/隔离输入；不要求随机自然语言措辞逐字相等。漏掉 Mode D 改动、只改 facade、硬编码旧角色、并发、串轴或一个入口缺失必红。
- recon先提供架构机会证据，再交design；删除测试区分“删包装复杂度消失”和“删模块复杂度散回调用者”，不能倒置。普通brief模式及原下游消费保持；新增同key的entry_mode=architecture-opportunities仅由用户明确架构改善/候选选择请求触发，不能借机改被读代码或把报告变成完整PRD/设计。
- code-recon 两模式共用派发内核必须遵守当前 max_active_subagents=1：architecture-opportunities 派一个真实冷 explorer/MR-006 anchor，给已验证绝对根、有限路径、词汇/ADR和定界方向，实际完成后主线合成；普通 brief 的五个独立维度保留，但改为固定维度队列逐个冷启动，不留正文、frontmatter description、Phase 2 或末尾的并发要求。多独立代理触发 Plan 时先取得该只读 phase/scope 的真实批准。删除把 cwd/shared alias 当项目权威的默认；项目 pin/授权路径依 R1，框架审计留 NO_PIN。普通 brief 的产物结构、architecture_brief 输入及五维覆盖保留，memory 仅按 governed extraction 与已授权项目落点，不把输出 brief 的批准当事实入库批准。F08 还验证普通 brief 的覆盖与串行峰值 1，并验证架构模式真实 explorer 不是作者模拟。
- architecture-opportunities读确认scope的代码/词汇/相关ADR；有方向就按方向，没有才读真实churn定界，无Git记录标未验证不编hotspot。候选依据真实friction和deletion evidence。S的improve-codebase-architecture/HTML-REPORT.md完整方法落到上述新reference，并由该模式正文实际读取。
- 输出已批准精确report_path的HTML候选报告，默认为真实OS临时目录下新architecture-review-<timestamp>.html，但使用前取得canonical路径/preimage/scope，不因TMPDIR可见就授予任意写。卡片含实际files/evidence、problem、solution、locality/leverage/testing收益、recommendation strength、dependency category、清楚区分现状与提议的before/after可视图，ADR冲突callout；结尾Top recommendation锚到真实候选。引用的领域词汇和module/interface/depth/seam/adapter等架构词一致。
- renderer使用已可用的通用HTML报告能力或内联CSS/SVG/本地已验证图表资源，方法所有者仍code-recon；不新增同义报告skill。上游Tailwind/Mermaid CDN改为离线资源策略，不安装新依赖、不用外链脚本或只交Markdown/空图。该报告是代码说明，无产品五状态/24分UI门；浏览器打开须在授权范围，必须验证图实际可见、锚点可导航、console无错误及零网络写效果。
- 写报告只呈现候选，不预先提新interface。真实用户选择某候选后才交grilling→codebase-design，继承原UID/scope/resume_target及权限交集；load-bearing拒绝仅提议ADR，术语落盘回domain-modeling真实批准。未选、拒绝或owner缺失停在报告，不自动改代码、memory、票据或全局配置。
- implement-spec 的依赖、ready frontier、工作区 ownership 与 integration base 写入真正 Plan 编译器和 Orchestrator。只将前置完成且不冲突的单元放入ready queue；按稳定UID升序每次只派一个，前一个实际完成并验证后再派下一个，max_active_subagents=1。worker校验实际tip；不能reset、自动关闭票据或再造执行器。上游并行措辞译为依赖frontier与串行调度，不宣称并发执行。
- PR 方法在 implement/Orchestrator 的实际发布准备路径读取，结构为 Summary/Evidence/Merge Danger。code-review 仍只审查；发送/建 PR 要真实授权，不能编造链接。
- environment-retro 是 code-hygiene 新 entry_mode，先读日志并核对现有 checker 接线，再提出改进；不自动写 memory 或 Hook。
- TS 配方使用既有包管理器，准确移植源配置的五条具名error规则：entrypoint-boundary-from-app、entrypoint-boundary-across-packages、tests-through-entrypoints、tests-folder-is-private、no-circular。按探测到的实际packages root调整规则，保留同包内部自由与测试自身fixture例外；单独验证生产代码导入本包tests被拒绝。原SKILL prose称四条不能覆盖实际配置的第五条，所有者、F24与M24.P07统一以完整配置为准；pre-commit 尊重已有 .githooks 所有者；shoehorn 配方仅处理测试数据。不在此批次自动装依赖或生产批量强转类型。

内容 DONE：上述消费者真实引用方法，各方法权限和所有者唯一；source02 的 facade/Mode D 同权威、完整方法与串行角色静态合同到位，不能因其它配方完成漏掉 Mode D。此内容 DONE 不依赖后置 F runner 或原生回执；最终能力采用 PASS 由 U012-b 的 F02/F08/F20/F22/F23/F24/F29/F31 决定。

### U011：唯一登记者与生成投影

负责人 WA0；依赖全部内容单元；前读 R0 及登记/生成器契约。

手写文件：K/{skill-routing-map.yaml,input-modes.yaml,model-routing.yaml,codex-viability.yaml}；O/references/office-wizard.md；scripts/{build-agent-context.py,check-agent-context.mjs,check-skill-scene-coverage.py}；四个新技能的 .claude/commands/<name>.md，.claude/skills/<name> 与 .agents/skills/<name> symlink 指向 office/<name>。

四个新 name 为 writing-workshop、loop-me、issue-triage、setup-wizard。loop-me同key输入包括可空goal、workspace_context_path、workflow_spec_path，上下文薄触发访谈，路径缺失不写；issue-triage同key有tracker_material、maintainer_goal、已有category/state映射、external PR范围、可选out_of_scope_root与条件写能力，不把缺tracker误当拥有远端授权。writing/loop 档 core-execution，issue/setup 档 guided-execution；各有显式 recommended-model、输入、反路由和 Codex viability。writing-workshop的正文disable-model-invocation=true、agents/openai.yaml的allow_implicit_invocation=false；同一个输入key含三entry_modes及上述mode-dependent必要路径，不登记三个新key。HTML的ui_variant_count是输入属性/CLI参数，不是Workflow mode或独立skill。code-recon同一个key增加architecture-opportunities entry_mode及report_path条件输入，普通brief键/下游architecture_brief仍保留；不加第五个技能或第44个输入key。entry_mode/purpose 不得注册成 Workflow mode。没有唯一文件产出的技能用 unobservable 加理由，不能伪造 output globs。

生成文件：K/generated/{skill-catalog.md,static-fallback.md,context-index.md}、K/generated/input-modes/<key>.json、K/evolution/self-model.generated.yaml；根 AGENTS/CLAUDE 仅允许既有 Static Fallback 生成边界且预期内容无变化。原 39 个输入 key 保留，加上述 4 个等于 43；原 key 为 auto、handoff、wait-what、domain-modeling、writing-for-agents、magicpath、open-design、idea、deepresearch、quick-research、brainstorm、superpowers-brainstorming、ux-research、ux-brainstorm、design-brief、html-prototype、figma-demo、tech-spec、task-plan、grilling、diagnosing-bugs、resolving-merge-conflicts、to-spec、to-tickets、wayfinder、implement、code-hygiene、code-review、codebase-design、code-recon、muse-req-triage、insight-synthesis、research-kit、ux-writing、compare、ux-audit、redteam、evals、retro。

执行 python3 scripts/build-agent-context.py sync 与 node scripts/build-self-model.mjs。check-agent-context 的固定39校验改为从权威注册读取。禁止顺手改 visibility、capability-parity、optional graph、shared state 或 office bridge；根 adapter 出现实质变化则停下重审。DONE：登记、目录发现、别名、模型、输入与生成投影一致。

### U012-a：建立真正可失败的测试

测试作者 EA0；依赖 U011；前读 R0/R1/R2 和 eval-methodology；测试作者与实现者均不能兼任最终判官。

文件：scripts/test-matt-skills-adaptation.mjs；memory/evals/matt-adaptation/{fixtures.json,method-coverage.json}；memory/evals/routing/fixtures.jsonl；scripts/test-route-guard.mjs；package.json；scripts/verify.sh；scripts/test-domain-modeling-skill.mjs、test-domain-modeling-behavior.mjs、test-engineering-delivery-skills.mjs、test-wait-what-skill.mjs、test-writing-for-agents-skill.mjs；memory/evals/domain-modeling/fixtures.json；.github/workflows/ci.yml 仅在现有 framework logic job 加本次离线测试步骤。

新 runner 接口 --unit Uxxx、--all、--evidence <index.json>：前两项检查静态/确定性合同，最后一项只校验真实回执完整性。regex 命中不能证明方法能力增益。fixtures每行有id、source_ids、method_ids、u_id、input、neutral_files、input_sha、required_facts、forbidden_effects、missing_variant、negative_variant、execution_level、expected_assertions。method-coverage.json从本合同3.1与A/METHOD-COVERAGE-FINAL.json逐字义投影：每个MUST断言及选定 gain goal 的稳定ID、source section、唯一owner、F/P/N/E variant、观察载体、gain/preservation分类和遗漏变异ID已由3.1/3.2及冻结矩阵选定；U012-a只能编译精确seed/输入及观察程序，不得重选、删除、扩大或改成功口径。证据门先验证每arm的3次真实试验均完成且可观察；任一UNKNOWN（含缺失/中断/无效原生身份）阻断G比较，不计为baseline失败。加入固定反例：candidate三PASS、baseline两UNKNOWN加一PASS不得证明增益；baseline两FAIL加一UNKNOWN也不得证明增益；两FAIL加一PASS只有其余MUST及完整证据均合格才达到该G门槛。遗漏此门或把UNKNOWN改计FAIL的变异必须红、恢复绿。M18另加固定负对照：相同可观察行为、不同库字节/内部helper名称的两个实现，行为oracle必须均PASS且不得认定gain；candidate若违反模板库合规，仍由独立候选门判FAIL。遗漏这一区分的变异必须红。静态coverage gate只证明映射完整，不能替代真实行为判定；重复ID/悬空source或case/仅关键词oracle/未绑定遗漏变异均失败。更新旧测试里已废弃的文本断言，保留行为约束。

DONE：每项F及3.1每个方法MUST的P/N/E断言都具体绑定到fixture与观察载体，全部逐项遗漏变异能打红、原始结果能回绿，CI接线可达；不要求此阶段原生能力 PASS。

### U013：来源登记与单一候选冻结

负责人 WA0；依赖 U012-a 的局部门；前读 R0/R3 及 Hook 摘要、安装和精确授信入口。

文件：K/external-skills/{installed-pins.yaml,vetting-registry.yaml,INTEGRATION-MAP.md}；K/evolution/{adoption-log.jsonl,benchmark-registry.yaml,gaps-register.yaml,ADOPTED.md}；CHANGELOG.md 仅本批能力生命周期条目；B/{RELEASE-MANIFEST.json,ROLLBACK.md}；.codex/hooks.json 仅11个摘要字面量。

来源跟踪按实际 watchpath 的最后变更，不把上游 main 的任意提交当技能更新。三个 writing 来源单独登记，可指向同一安装目录；移植方法记录 consumer，不伪造独立已安装包。#11 保存历史 pin、删除 watch/ack，不加入消费者不支持的字段。原生验证状态写 PENDING；最终运行回执在 A，不预写 PASS、收益或恢复成功。issue-triage 上线不能关闭整个 tracker 基础设施缺口。U013明确将benchmark-registry的旧last_review原样压入history头部，再以kind=window、reviewed_commit=S、真实reviewed_at、从S Git对象取得的upstream_commit_date、实际采用/排除摘要、B/PLAN.md与外部审计证据指针、当前vetting entry填新last_review；不覆盖历史或用当前日期冒充上游日期。watch_sha是每个source directory在S历史的最后实际变更，pinned_sha=S（#11保持历史6654f...），已吸收的旧ack置null；#11的删除已知watch/ack固定daa01d8aa68ad5c61b68970ec2018d0ce9567be6，保留历史pin，不伪造S新包。方法consumer写现有note/INTEGRATION-MAP/SOURCE-MAP，不引入watcher不消费的kind枚举或字段。ADOPTED追加本批唯一owner、reuse_mode、S和明确原生PENDING/外部证据路径；CHANGELOG的Unreleased写实际内容变更与why，不提前写行为PASS/发布commit。历史07-23对batch追问/无方向深化的拒绝原记录保留，新方向的改变在vetting和H0-PAYLOAD显著列明，必须由本批具体H0范围确认，不能悄悄翻写原人裁。gaps仅更新本批有具体行为验收的范围，发布/采用状态以外部真实回执为准。

所有源码、测试、生成器及U013来源/ADOPTED/CHANGELOG记录完成后，严格按当前Hook的枚举/排序/哈希公式计算D，更新11项并运行对应摘要测试。冻结证明分为两种，位置与字段不得混合：

- 仓库内B/RELEASE-MANIFEST.json是提交前清单，只存S、M0、D、有限路径/类型、实现payload文件及个人候选hash；实现payload_hashes排除全部B/**元数据文件。它不包含C、T、自己的hash、完整候选inventory的hash或引用这些值的间接链。B/MANIFEST.json是scope/preimage描述，不包含自身postimage hash或未来C/T；精确当前U的运行时控制manifest留在A/control/<UID>/manifest.json，hash绑定在witness/active-context中，不写回自身。adoption/pins登记只写来源S、状态PENDING和外部证明路径，不能提前写本次release commit。ROLLBACK.md用操作规程和外部证明指针，不内嵌未来C。
- 全部仓库字节完成且局部门通过后，创建唯一候选C，parent=M0。提交后从实际Git对象读取C、T和全部tracked路径、type/mode、blob SHA及payload SHA，写A/FROZEN-FILES.json；它只列C的Git树文件，不列任何A文件，所以没有自身hash。再写A/FROZEN-CANDIDATE.json，包含C/T/D、S/M0、FROZEN-FILES.json实际hash、B/RELEASE-MANIFEST.json在C中的实际hash及个人候选hash。此文件及后续CI/原生/发布回执全部在A，不加入C，不写回B。

冻结后任何源码或仓库metadata变化均使C及相应证据失效，必须生成新候选并重验；不得为填C/T或回执而修改原C。DONE：本地静态门通过、唯一parent验证、两份外部证明可重建、仓库清单无自/间接hash引用、发布/恢复清单完整。

### U012-b：真实原生行为验收

负责人真实操作员及独立判官；前置 Htest 和冻结候选；不修改仓库源码。

baseline 在 M0 和旧个人技能下先跑，结束所有测试 session；随后 U014 安装 C 和个人候选，candidate 用新 session 跑同一自然语言输入。新入口 baseline 用原有 router/fallback 接收相同意图，不能用“旧版没有新 alias”作为能力增益。candidate 显式发现测试单独记录。

三种执行等级：L=原生 loader+方法对话；A=原生生成/文件/程序行为；I=隔离 fixture 中的权限、条件写和失败恢复测试。I 不冒充真实远端系统写入。Claude/Codex 桌面运行全部各自支持的方法；teach 仅 Claude。Luca 内嵌 Codex另跑四个新入口、grilling、真实项目链和11项Hook。不使用 --bare、关闭技能、换 HOME、信任绕过或 verify-codex-wiring 的绕过型执行模式。

L 可使用 codex exec -C <正式框架根> -s read-only --json -o <A内具体输出> -，或在正式根 cwd 使用 claude -p --verbose --output-format stream-json；stdin 是冻结 UTF-8 输入。需要文件或 Human Gate 的 A 用正常交互会话和真实操作员，不能通过非交互模式预填批准。

项目创建与绑定：

1. Htest 精确授权 public new/switch、P 的最小 CONTEXT 创建、隔离 fixture、仅本地 Git、实际绑定及保留策略。根协调会话仍 NO_PIN。
2. 在真实新验收会话中由用户发出项目请求，操作员只调用 ./scripts/project.sh new matt-skill-acceptance-20260930，再在各 harness 的真实根会话调用 ./scripts/project.sh switch matt-skill-acceptance-20260930。session/transaction/epoch 仅由原生边界注入。
3. node scripts/project-pin.mjs status --view host --session-id <实际SID> --operation <实际op> 读回 FOUND/COMMITTED、created、bound=true、canonical path、dev/ino、VERIFIED 和实际 epoch。不同 session 不复制 pin。若 P 已存在且没有本次创建回执，STOP，不覆盖、不改名继续。
4. new 仅创建目录与最小 CONTEXT，不替代 Git/docs/layout 初始化。最小 CONTEXT 字节为标题“# matt-skill-acceptance-20260930 — CONTEXT”、一个空行、引用行“> 项目级长期约束与共识；按项目需要逐步补充。”及末尾换行；external preimage=absent、mode=100644、postimage 哈希纳入 Htest。
5. 后续 fixture 按 P/fixtures/<Fid>/<baseline|candidate>/<claude|codex>/trial-<1|2|3>/ 分配，有限 case/harness 集合展开；seed.json、package.json、src/counter.mjs、test/counter.test.mjs、README.md、各case声明产物及本地Git元数据；F03/F08另含src/{order-entry,order-validate,order-store,pricing-read,pricing-calc,memory-adapter,file-adapter}.mjs和docs/domain/{glossary.md,adr/0001-storage.md}的中性seed（至少两真实可深化cluster及两个实际adapter）；F16另含tracker/items.json、tracker/history.json、tracker/operations.jsonl、.out-of-scope/dark-mode.md、.out-of-scope/plugin-system.md（新目标absent）；F21含NOTES.md、workflows/daily-check.md与批准输出brief-example.md，续接只用共享handoff精确路径。F24/F29/F31的I子fixture含package.json、tsconfig.json、.dependency-cruiser.cjs、packages/{README.md,one/index.ts,one/client.ts,one/lib/impl.ts,one/tests/example.test.ts,one/tests/fixture.ts,one/lib/helper.ts,two/index.ts}、tests/request.test.ts、.githooks/pre-commit、.lintstagedrc、.prettierrc（以上既有/absent状态逐case声明，.git仍限本地），adapter/mock命令及变异放P/fixtures实际I子路径，依赖/缓存效果缺授权不安装；F35的teaching_workspace内含MISSION.md、RESOURCES.md、NOTES.md、learning-records/0001-seed.md、assets/{shared.css,quiz.js}、reference/0001-seed.html和预声明lessons/0001-basic.html、0002-next.html、新reference/0002-counter.html及learning-records/0002-feedback.md。U012-a把确切seed字节/输入source及目标preimages写fixtures.json并冻结，旧seed record/assets不得被覆盖；这些有限文件及实际编号读回结果，须另生成精确 preimage/postimage 与命令清单，批准后写入，不能把整个 P 作为无限写范围。
6. git init -b main；本地提交用参数数组分别传 -c、user.name=Skill Acceptance、-c、user.email=skill-acceptance@example.invalid，避免把含空格值拆成多个 shell 参数，不修改全局配置、无 remote/推送。canonical spec/taskplan 由原生 owner 在对应项目 docs/engineering 的 case/arm/harness/trial topic 生成，真实审批实际 UID 和 hash，不复制 PASS 或批准回执。项目写入测试串行，输出保留，未经授权不清理 P。

每个 F 的 P/N/E 三种输入，在每个支持 harness、每个 arm 各跑3次。固定输入 SHA 与 fixture SHA；候选的每个 MUST 都须3/3 PASS，任何 FAIL/UNKNOWN 阻止发布。候选特有的来源/模板合规（M18.P03）只在candidate门判定，baseline标NOT_APPLICABLE，不计该G的FAIL或UNKNOWN；其行为试验仍须三次完整。3.2冻结的16项gain共有17个G目标，每个G都须 candidate3/3 PASS、baseline 至少2/3明确行为FAIL，且每arm三次试验都必须完成并有有效可观察证据；任一UNKNOWN阻断比较、不得计入baseline失败，其余全部MUST亦须candidate3/3且不回退；M09的两个G分别裁决，不能只通过其一。预声明preservation的项目两arm均3/3才可声称证明保持；baseline不足则如实记录，禁止制造失败或改称gain。gain两arm都3/3仍未证明增益，须修复/重审对应U，不能临时改为preservation或用总体平均分抵消。判官先读盲化 arm 标签、原始输入输出及判据，判定后才揭盲，不先看作者成功解释。

回执字段：case_id/method_ids/assertion_ids/trial/arm/harness、runtime_root/head/tree、body/input/output/fixture SHA、execution_level、native_agent_type/MR scene、实际 native SID及root_session_id/activation_id/root_generation/release_digest、transcript 路径与哈希、invocation或none、起止时间、退出/完成状态、assertions、verdict、证据路径。Codex委托用实际返回 agent ID 与 model-route-host 的只读 readActivation/findInvocationByExternalIdentity，证明同次 accepted invocation 已成功完成、无 fallback；不调用 producer 伪造接受证据，不暴露私有 binding。Claude模型 adapter仍延期，只记录实际原生session/trace，不声称同等强制能力。

### U014：正式安装、发布与恢复

负责人 WA0 + 框架外的可信终端操作员；前读 R0、项目/长会话以及官方 source-guard/trust CLI；前置 U013、CI 与 Htest。正式安装路径只有 R/E 精确候选文件，个人 /Users/luca/.agents/skills/tdd 和 /Users/luca/.claude/skills/teach 的批准文件；保存其他文件和学习记录。

顺序固定：

1. 冻结 C 后推候选分支，必须创建 main-base 草稿 PR并附到本任务。当时 PR head=C、base=M0；候选分支 push 本身不触发当前 CI，不能替代 PR。
2. 等 Required Checks 和依赖 job 全部成功，读回关联 head C 的 suite/check-run、PR当前head/base、检查结论及 run URL 到 A。若平台检查运行在合成 merge SHA，须验证其 parents 为 M0/C，并记录该SHA与C的绑定；禁止拿其他提交的绿灯。缺失、pending、failed、stale 或base前进均 BLOCK。
3. Htest展示C/T/D、精确个人安装pre/postimages、R/E变更、E0→M0基线对齐13路径及Git效果、项目fixture和测试副作用、guard/trust命令及恢复方案，由真实用户批准维护窗口。按§4对全部当前效果所有者重新读回占用，取得窗口内“不再改同范围、没有发布占用”的真实回执，核对R=main M0、E=main E0（若E已由兄弟正式对齐M0则精确记录该回执并将alignment标N/A），以及外部runtime身份。M0远端CI未完成/失败或远端base漂移均停止维护窗口；不能把旧107/0本机结果当远端绿灯。
4. 先完成批准的baseline alignment：用户保存工作并正常退出R/E相关session及Luca/broker，外部可信终端核验R=M0、E=E0、E无重叠脏改动；R普通fetch origin使M0可达，E执行git fetch --no-tags <R的绝对路径> <M0>（本地对象传输，记录FETCH_HEAD效果，不改remote），验证commit/tree及parent=E0。E在main执行git merge --ff-only <M0>，只允许上述13路径postimages；然后用官方installer的--root R --root E --preserve-other-roots先dry-run后实装，并逐根官方trust dry-run→apply→dry-run证明各11条。任何第三态停止、不reset。R/E都为M0且native loader健康后开启全新baseline session，跑全部M0/旧个人技能输入；结束全部baseline session后再正常停机切候选。此基线同步是Htest单独批准的永久前进效果，候选失败的恢复目标为M0，不能为退回E0重写main历史。若alignment=N/A仍核验同M0对象/tree/guard/trust。
5. R普通fetch origin <C>使已发布候选分支对象可达；E执行git fetch --no-tags <R的绝对路径> <C>，从R已验证对象传输，不假定E有origin。逐根验证parent=M0、tree=T、同M0 main及无重叠脏改动。git switch --detach C，main ref仍留M0；以 CAS 安装个人候选。禁止 stash、reset、强制覆盖。
6. 使用 node R/scripts/install-codex-source-guard.mjs --root R --root E --preserve-other-roots --dry-run，读回范围后按同参数去掉 --dry-run 实装。确认每根一份对应保护清单、其他根不变；bootstrap/loader 有变化则停止另审，不能取消 preserve 来绕过。
7. 每根执行 node <root>/scripts/codex-trust-hooks.mjs --host-launch --dry-run → 实际 --host-launch → 再 dry-run，逐项读回11条 exact command全部 trusted。exit0本身不代表授信完成。
8. 新 session 运行 candidate U012-b、全量本机验证及资源读回。独立实现专家与红队审查冻结 diff+行为证据；任何 MUST FAIL/UNKNOWN 均不得发布。
9. Hpublish 按§4再次读回全部当前效果所有者及资源占用，并取得发布窗口内暂停同范围写入的回执；展示同一 C/T、全部能力 PASS、当前PR/CI回执、恢复状态及远端main仍M0。用户对具体普通推送作最后批准。git push origin <C>:refs/heads/main，不使用force/admin/bypass；若保护规则不允许该路径，BLOCK并重审发布合同，不能换成产生未验收提交的合并方式。
10. 远端读回 main=C、tree=T；正常 push 失败先读实际效果，不盲重试。两处仍停机时 git switch main，git merge --ff-only C；重新确认 guard/trust/个人文件和全新原生 smoke，再释放维护窗口。

每个外部/安装动作记录 before、expected-after、actual-after。当前等于 before→未生效；等于已知postimage且有完整preimage备份→可精确恢复；第三态或 EFFECT_UNKNOWN→先读回并停止，不能覆盖。未发布候选失败时切回main=M0（E已单独批准的baseline alignment保留，不退E0）、按CAS恢复个人技能，用官方工具为实际源码重建对应 guard/trust；不能回放整个 config、删除别的根或未经支持清理 snapshot。恢复后用全新原生会话证明可用。已发布后如需恢复，另批准普通 revert，不改写远端历史。

## 3. 逐项验收与验证命令

下表每行均包含 P正例/N反例/E缺输入或失败输入；每个变体两 arm、支持 harness 各3次。L/A/I按 U012-b定义。

| F | 等级 | P；N；E |
|---|---|---|
| 02 | A | 同一 frozen diff/spec/标准分别经 facade 和直接 Mode D，真实冷双轴逐个完成且 accepted、native peak、峰值1、第二轴不可见第一轴；命中相同预植标准违规和spec缺项，分轴 count/worst、repo override/工具已覆盖项保持；只改 facade/Mode D 仍并发/旧模型硬码/两个入口不一致均红。PR写作不劫持；缺base真实确认、坏ref/空diff不派、显式需求核验缺spec等回答。 |
| 03 | A | 转发包装/深模块正确deletion reasoning；用户要求替代接口时至少3个真实冷设计者按不同约束串行完成，逐案有invariants/ordering/errors/usage/隐藏实现/依赖及trade-off，再比较depth/locality/seam并推荐，真实用户选择前不写代码；普通深度诊断不强制3人，UX微文案不路由；缺代码/证据不伪造。无替代接口、三案同构、缺比较维度、假3agent或峰值>1变异必须红。 |
| 04 | A | counter off-by-one：真实红→诊断→修复→绿；危险诊断动作拒绝；不可复现不宣称确定根因。 |
| 05 | A | 全量/部分取消歧义→真实确认→授权词汇落点；只读不改文件；NO_PIN/缺owner仅提案。 |
| 06 | L/A | 两个歧义领域术语触发 grilling→domain-modeling，原UID/scope/resume_target继承且权限交集；无词汇写授权只提案；未答Human Gate回原owner并阻塞依赖，不新建任务或自行批准。 |
| 07 | A | 已批counter规格的2DEV+TEST保持UID执行；ticket不当授权；hash漂移停止。 |
| 08 | A | 至少2个有实际代码证据的候选产出真实HTML：files/problem/solution/wins/strength/dependency、before/after可视图、ADR冲突与Top recommendation正确，浏览器图可见/锚点可导航/零写请求；普通brief保持。用户实际选候选后才grilling→design，未选不提接口、不改代码；无代码/owner不编造。只给Markdown、缺/空图、图与代码不符、遗漏ADR、抢选或隐式修改的变异必须红。 |
| 09-L | A | counter0..2问题可见、pure模块无DOM依赖、领域状态面板/自由动作、happy/edge/illegal tabbed walkthrough及每条初态reset真实浏览器可驱动，纯模块独立提取后同动作得到同状态；ui低审美/缺基础状态仍红且不被logic免除；未知purpose/冲突/缺guided或纯模块/无浏览器均不能PASS。 |
| 09-U | A | 已批准宿主和3个结构不同UI变体，同一HTML的variant=A/B/C、浮动箭头/键盘环绕、焦点不拦截、reload稳定/其它参数保持，逐变体五状态/D/AC/UI分数与内容守恒有实际截图；换皮/保持区丢内容/有真实写请求/自动选赢家或生产挂载均红；缺HTML授权/对比范围或Packet冲突先真实确认，非法count/logic+count/未知variant可恢复错误。选择由真实用户给出且记录理由，无自动实现/Git/发送。 |
| 10 | A | 固定primary API材料→单后台、可核引用Markdown和正确handoff；二手资料仅线索；无来源标未验证。 |
| 11 | A | 隔离真实Git分支冲突并解决后验证；无进行中冲突不伪造；状态不明先读回。仅历史能力回归，不算上游增益。 |
| 12 | L/I | 未配置tracker仍可按to-tickets生成本地逐票预览，显式已有tracker及自定义五角色映射被issue-triage准确消费，单/多域现有词汇与ADR由domain-modeling按授权路径消费且指出冲突；不写根AGENTS/CLAUDE、不建标签、不迁移领域布局、不安装CLI或新增setup alias；tracker目标/标签映射/领域owner缺失或矛盾时要求真实确认，仅角色预览/只读分析，不假定权限或默认写入。I使用既有隔离fixture，不写真实tracker。该项不新增 setup 独立包；其中 M12.G01 的自定义 category/state 映射消费按3.2验证增益，其余既有本地票据与领域消费按 preservation 验证。baseline 不得虚构失败；G01 未达到冻结门槛则失败并回原单元修订，不能以回归通过放行。 |
| 13 | A | counter新增行为真实red/green垂直slice；正确已有行为不假红；无runner不报通过。 |
| 14 | A | 已解决counter决策→canonical spec；未决偏好Human Gate；无材料不猜。 |
| 15 | A | 冻结计划2DEV依赖的ticket投影；不造第二真值；无tracker只本地产物不发送。 |
| 16 | L/A/I | attention三桶与排序、external PR discovery边界和explicit内部PR；恰一category/state、冲突先问、reporter新回应转回triage、override不grill；概念相同历史拒绝由真实维护者三选一、already-implemented/rejected bug/rejected enhancement三结果分别验证KB字节效果；真实复现/PR验证先于grill、durable issue/PR brief与needs-info续接不重问。A只写批准KB和本地材料；I验证fake tracker CAS、AI声明/marker/unknown读回、部分效果；无授权只preview、无mapping/验证不足不报ready。删掉状态转换、external过滤/explicit例外、拒绝确认、KB分支、verify或brief结构的每种遗漏变异必须红；muse-req-triage仍为产品候选owner。 |
| 17 | A | 多session高雾高规模→canonical长期计划；小任务走普通Plan；人工决策不得自裁。 |
| 18 | L/A/I | 明确2阶段、配置键、目标和批准脚本路径→实际生成wizard，库区hash等于本地template、TOTAL_STAGES与实际阶段一致、bash -n通过（模板合规只检查candidate，不能用baseline库字节不同构造失败）；行为G统一从实际脚本公开交互入口观察，等价实现不要求同库字节或内部函数名。隔离fixture用假的open/xdg-open/wslview/explorer.exe/gh和无敏感dummy输入从公开入口驱动实际脚本的提示与确认（候选另覆盖ask/ask_secret/pause/confirm等全部API），验证重复.env upsert无重复键、secret不进入stdout、gh变量/secret名称与提供的CI引用一致、拒绝confirm无写入、gh失败产生未完成状态；语法损坏或漏阶段变异必须红。无运行授权只生成文件，不启动浏览器、不写真实.env或服务端secret；缺阶段/目标/路径先问且不生成。I的输入替身仅验证模板程序，不是任何真实Human Gate批准。 |
| 20 | A | A/B文件分离且同时ready、C依赖两者→按UID串行A后B后C，B启动不早于A完成，C只在两者验证DONE后启动，实际并发峰值1并校验tip；文件重叠不偷派；基线漂移不reset。 |
| 21 | A | 真实NOTES世界事实→推导2个有依据loop、用户选择→逐轮frontier→批准workflow spec；薄NOTES先真实访谈、不虚构工具/渠道。无AI/无schedule/无checkpoint例有效；有checkpoint例先完成准备合同、brief含what/why/具体决策/asset link，push-right保留不可推迟授权门。续接重读NOTES/spec/已解决决策并保留用户修改，不重问已答题；仍有实现问题不DONE。generic SOP即使有stop/recovery也失败；遗漏发现、stateful grilling、checkpoint理由/brief或续接保留的变异必须红；不运行或装scheduler，缺精确路径不写。 |
| 22 | L | 实际diff/evidence→三段PR草稿；未授权不发布；缺证据不编链接。 |
| 23 | L | 真实日志中的checker接线缺口→先查已有机制；设计retro不被劫持；无日志不断言原因。 |
| 24 | L/I | 五条具名规则全部接线；app/跨包internal import、自身tests越界、生产代码→本包tests和cycle均拒绝，公共entry、tests→自身fixture及普通内部互引允许；单删tests-folder-is-private遗漏变异必红，恢复回绿；非TS任务不安装配方，包管理器不明先查。 |
| 25 | A | 固定原料+已确认读者prerequisite→2–3起始beat逐项requires/grounds/解锁方向，实际用户选一个后磁盘只增加该beat并停，再读文件给2–3可达下一beat；用户修改/移除已介绍概念后重读保留编辑并重算grounded，定点重写其他段不变；不能捕获UX微文案/编原料外事实；缺文件/输出路径/未选beat不写，grounding缺口先问或给grounding beat。遗漏prerequisite/用未grounded概念/未选写入/一次写多beat/缓存覆盖用户编辑的变异必须红。 |
| 26 | A | 初始语料即进入探索，单H1+横线分隔的异质fragment按产生顺序真实追加，用户重排/删除后重读保留，指定剪/重写/合并只改目标；不加提纲/正文标题/标签/元数据、不编引用；缺主题或精确output_path先问不写。漏初始语料、强加结构或覆盖编辑的变异必须红。 |
| 27 | A | 完整只读pile+真实读者前提→2–3开篇用户选择/组合，逐块解释形式、校验requires⊆grounded，同意一块才写一块并重读保留编辑，缺例子让用户补或删，用户决定结束；不编辑raw pile/自动整篇或接代码修改；缺material/output或同inode路径拒绝。跳grounding、写ahead、改raw pile或缓存覆盖的变异必须红。 |
| 29 | L/I | 测试fixture迁移保持断言行为；不对生产代码批量as；缺依赖不暗装。 |
| 31 | L/I | 已有.githooks保留所有权并增加必要门；不重复安装Husky；manager/现有Hook不明先调查。 |
| 33 | L | 3个独立决策+1个依赖问题：独立成轮、依赖等待；其他Human Gate仍真实批准；可查事实先查。 |
| 34 | A | 实际事实、未决范围、恢复指令写真实临时交接文件；不自动开thread；未知显式保留。 |
| 35 | A/Claude | 已确认MISSION/primary资料/旧记录/既有CSS→真实lessons/0001-basic.html含可操作quiz/立即对错解释、来源与lesson/reference有效链接、打印速查reference；lessons/0002-next.html复用已存在assets而非内联复制，ZPD依据旧记录与真实回应。实际用户回应形成四FORMAT合规的新记录，旧记录/NOTES/hash保留；MISSION未确认先问，无真实学习证据不宣称进阶。文本代HTML、无feedback/断链、重复assets/未读既有库、无来源或把I模拟写成掌握的变异必须红。 |
| 36 | A | 明确审批人预算决策→每题决策映射并回原owner；不伪装统计问卷；无对象追问、不发送。 |
| 37 | L | 对话术语用中文语境解释；不额外启动研究；NO_PIN只谈词汇不写项目。 |
| 38 | L/A | 重复/歧义指令→唯一owner与一跳引用；不写根memory；未读引用不称已验证。 |

7个不新增包各测试现有owner、负路由与没有新别名；#06另有上述组合验收。新四技能需有独立方法价值正例，而不只验证文件存在。F25–F27由真实操作员在A会话进行选择、写入间编辑和结束，记录原生tool transcript、每次真实read-before-write及pre/postimage；I回放或预填答案不能充当这些Human Gate。遗漏方法的变异用于测试assertion/judge敏感性，单独标I、保留原始回执，不篡改baseline/candidate真实trace或在正式安装里破坏技能。F03/F08/F35同样绑定以上具体方法/产物MUST和遗漏变异：独立接口设计不能仅数3段文本，架构报告不能仅查HTML字样，教学反馈不能仅查quiz关键词；原生invocation、实际浏览器/文件内容与用户回应分别证明。

检查组：

- V1：npm run validate:skills、lint:yaml、check:routing-map、check:registration、check:agent-context、check:self-model。
- V2：node scripts/check-model-table.mjs；node scripts/check-codex-viability.mjs；node scripts/check-capability-parity.mjs。
- V3：npm run test:routes、test:semantic-parity、test:agent-context、test:agent-context-resolution、test:engineering-delivery、test:domain-modeling、test:domain-modeling-behavior、test:wait-what、test:writing-for-agents。
- V4：node scripts/test-matt-skills-adaptation.mjs --all（包括模板bash -n、库区一致性、隔离helper交互/幂等/失败与syntax/missing-stage变异；prototype两分支/变体逐状态与写作三模式的合同及遗漏方法变异）；--evidence <A/index.json>；python3 -m unittest discover -s memory/tests -p test_behavioral_ab_gate.py；python3 memory/scripts/behavioral_ab.py selftest。
- V5：node --test scripts/test-source-guard-preserve.mjs scripts/test-codex-trust-hooks.mjs scripts/test-host-launch-journal-migration.mjs；两根 test-hook-source-digests 验证11项。
- V6：维护窗口才运行 npm run verify；本机副作用必须在Htest清单，前后资源读回，清理只限本次自己的fixture。不改HOME权限。缺Playwright/Chromium等依赖则列出准确安装与缓存效应批准后补齐，缺依赖不是PASS。
- V7：隔离fixture变异：缺alias、错purpose、越权写、假CAS、缺输入、错native binding应红；恢复应绿。不能向正式权限状态写坏值来做变异。

### 3.1 原方法覆盖与验收矩阵

此矩阵是本次采用方法及不新增包的明确回归范围；方法集合不由实施者临时猜测。原始source_path/commit/full-directory hash由SOURCE-INDEX-38-R13逐ID定位；下表source列是所需正文分支/引用，完整引用仍按U003–U010移植。A/METHOD-COVERAGE-FINAL.json是相同38行结构化审计副本，SHA256=3026f50261dbf0dd1007147e31325de8571271cfc1e2eafc076f38f5dee5fd01，不会改变运行时技能权威。

方法层仍仅gain/preservation两类；M18.P03单独标candidate_compliance，只要求候选按源模板合规，不宣称它是基线已有能力或第三类方法。每行P/N/E的稳定原子ID与每项遗漏ID已在冻结矩阵中分配，选定的gain目标与其MUST引用见3.2；U012-a逐项编译variant输入SHA、seed文件preimage及观察程序（真实native/tool、文件diff、程序输出、浏览器、用户回答）。语句内部列出的并列义务也全部是MUST，不能只观察第一项；额外子断言只能细化其原ID，不能改变方法分类或目标。N列是可通过通用答复但不能通过本方法的反例，E列是缺输入/权限的正确行为。共享一次F trial可覆盖多项断言，不必为每个语句另开session；已完成且观察证据完整的trial中，若证据显示任一MUST行为缺失或相反，则该variant为行为FAIL，不能用其他成功抵消；若只是trace、观察载体或原生完成证据缺失/不可用，则为UNKNOWN并阻断比较，不能把“没证据”当作“已观察到没做到”。I遗漏变异与真实A/L trace分别保存；先跑原trace oracle绿，再逐项缺失/反转红、恢复绿，不编辑正式技能或篡改真实trace。

本矩阵不把上游自动并发/Git/发送/根配置权限移入：执行、隔离、真实批准、唯一owner、原生harness和源头写入边界依U001–U014。source17 tracker map转Plan projection，source14 spec转tech-spec，source15 slicing转task-plan、source28 hook转既有guard；这些是明确适配，不伪称原生能力相同。源格式/脚本及主产物仍完整验收。成功口径只取3.2的预声明分类：gain目标的完整证据显示不达标则FAIL，证据不足则UNKNOWN并阻断比较；两者均不得降格为preservation；preservation如实记录两arm结果与既有行为是否回退，不宣称新增能力。

| M/source | owner/F/等级 | P MUST：必须观察的结果 | N：反例或遗漏必须红 | E：缺输入正确行为 | 来源分支 |
|---|---|---|---|---|---|
| M01 / #01 | office/Plan; F01; L | 入口按Project→Plan→Framework→semantic路由；现有owner可处理工程问法 | 另立ask-matt总入口或绕Project Gate为反例 | 意图含混真实确认，无新alias | SKILL; PHASE-BOUNDARIES |
| M02 / #02 | U010 code-hygiene Mode D; U003 code-review facade; F02; A | 固定ref可解析/非空diff先核验；标准和spec两位冷判官串行、不同上下文；标准来源及12种smell可达，repo override及tool已覆盖项不误报；spec missing/partial/creep/wrong与原句逐项对应；分轴报告各自count/worst；直接Mode D与facade命中同一预植义务且两个入口均无第二方法权威 | 把两轴合并排序、smell当硬违规、Spec假PASS或无实际native独立票为反例；只改facade而Mode D仍并发/旧模型硬码或直接入口漏审必须红 | 坏ref/空diff停止派发；通常审查无spec明确NOT RUN，明确需求核验却缺spec真实追问并等待，用户明确无spec才skip、不假审 | SKILL §§1–5 |
| M03 / #03 | U003/U010 codebase-design; F03; A | 使用Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality；deletion方向正确；四依赖类型各有测试策略、两真实adapter才port、内部seam不外露；深化后通过公共interface验证、旧浅测试replace不layer；DESIGN-IT-TWICE完整执行U003和F03 | 用LOC ratio判depth、单adapter造port、测试past interface、三案同构/假独立为反例 | 未知依赖/代码不编证据，替代设计未经真实phase批准不派 | SKILL; DEEPENING; DESIGN-IT-TWICE |
| M04 / #04 | U003 diagnosing-bugs; F04; A/I | 已运行fast/deterministic/exact symptom red loop后才理论；最小复现逐cut复验；3–5 ranked falsifiable hypotheses展示；一次一变量probe有tag，perf先measurement；正确seam先回归红再fix绿再原完整loop；cleanup去tag且正确根因有证据 | catch错误bug、先修后假红、没有loop直接hypothesis、未最小化/缺rank/残debug均失败 | 不可复现列已试办法并求redacted artifact/access，不能宣称根因；secret示例全部REDACTED | SKILL phases1–6; PROVENANCE; references/root-cause-tracing,defense-in-depth,condition-based-waiting |
| M05 / #05 | U003 domain-modeling; F05/F12; A | 单/多域owner正确；术语冲突与代码矛盾用真实edge scenario澄清；resolved term立即按CONTEXT-FORMAT授权落点，词汇不混实现；ADR仅三条件俱全才提议，读取现有决策避免重议 | 把rootCONTEXT当产品词汇、批量猜术语、例行小决定生成ADR或无授权落盘失败 | 缺域owner/用户未答仅proposal；缺文件不以缺文件授权创建 | SKILL; GLOSSARY-FORMAT→CONTEXT-FORMAT; ADR-FORMAT |
| M06 / #06 | grilling→domain-modeling; F06; L/A | 两术语歧义由同UID/scope/resume真实组合解决；permissions intersection；未答dependent问题回owner等待 | 新建另一真值或把采访答复当write批准失败 | domain owner/写权缺失只提案 | grill-with-docs/SKILL |
| M07 / #07 | U003 implement→Plan/Orchestrator; F07; A | 冻结spec/tasks真实hash/UID，pre-agreed seam TDD；常规typecheck/单test与final suite+双轴review回执齐；仅已批精确commit效果 | ticket=authority、移除paired TEST/finalreview或暗commit失败 | 未批计划或hash drift停止，不伪补授权 | implement/SKILL; local execution authority |
| M08 / #08 | U010 code-recon; F08; A | scope/churn/方向先定界，读取词汇ADR与真实friction；实际独立explorer有证据；候选deletion和依赖合理；离线HTML真实before/after及Top/ADRcallout；真实选择后才grilling/design/domain；普通brief五维覆盖/原architecture_brief消费保持且全部recon串行峰值1 | 无report、空/错误图、没选先interface、凭空hotspot或忽略ADR失败；普通brief仍并发/借cwd或alias推断项目/输出权当memory写权必须红 | 缺方向可按真实churn，不可读代码/owner/授权路径则停 | improve-codebase-architecture/SKILL; HTML-REPORT |
| M09 / #09 | U008 html-prototype; F09-L/F09-U; A | logic pure portable模块、visible problem/state、freeplay和tab guided+reset；UI同HTML structural variants稳定query/箭头/键盘/逐状态QA与实际选择；分别完整U008合同 | 仅换皮、DOM污染pure逻辑、缺walkthrough或借logic免UI门失败 | purpose/count/Packet冲突或缺HTML授权停，未知variant恢复错误 | prototype/SKILL; LOGIC; UI |
| M10 / #10 | U003 quick-research; F10; A | 单真实后台agent查primary-owner证据，每claim citation，实际single Markdown按既有研究位置/已批路径；actual context-cost handoff | secondary作为事实或并发第二worker/伪后台/假引文失败 | 源不可达显式unverified，不猜事实或写未授权repo | research/SKILL |
| M11 / #11 | existing resolving-merge-conflicts; F11; A | 真实进行中Git冲突读state→解释意图→最小resolve→验证；pin历史blob/删除来源只回归 | 无冲突制造练习或reset user work失败 | repo state未知先readback | historical SKILL pinned in index |
| M12 / #12 | to-tickets/issue-triage/domain; F12; L/I | tracker目标、category/state mapping和单/多域词汇真实被三owner消费；本地tickets无配置可预览 | 新增setup alias、root适配器改领域布局/安装CLI失败 | 目标/映射/域矛盾真实确认、无authority只read/preview | setup-matt-pocock-skills/SKILL |
| M13 / #13 | U003 G/tdd; F13; A | 真实seam确认前不test；一seam一test一minimal implementation vertical red→green；known-literal expected、公共interface观察、只系统边界mock；refactor转review | horizontal bulk tests、tautological expected、internal mocks/private/assertcallcount或loop中speculation失败 | 无runner/未confirm seam不报绿 | tdd/SKILL; tests; mocking |
| M14 / #14 | U003 to-spec→tech-spec; F14; A | 已resolved conversation产生CONV source register；existing/highest test seam确认，problem/solution/stories/decisions/testing/exclusions/notes映射canonical tech-spec，原型decision-rich片段保留出处；coverage gate | 新模板/第二spec/tracker记录、重新做产品interview或捏UI偏好失败 | 未决设计/工程事实返回具体NEEDS_CONTEXT与owner，缺scope不写 | to-spec/SKILL; local tech-spec owner |
| M15 / #15 | U003 to-tickets→task-plan projection; F15; A/I | 逐DEV↔TEST/断言/hash及真blocking；vertical/demoable/context-size；wide refactor按canonical expand–migrate–contract；实际quiz批准后local一票一文件或connector真实依赖，readback保持parent只读 | 同意plan被当外发许可、合并全部tickets、任意reslice/水平task或改parent失败 | 缺tracker可local preview；缺TASK PLAN GATE或drift不publish | to-tickets/SKILL; local owner |
| M16 / #16 | U006 issue-triage; F16; L/A/I | U006七条完整方法；三个attention桶/oldest/tag、category/state exclusivity、reply transition/override、semantic redundancy/rejection三选择、verify-before-grill、durable issue/PR brief、三种wontfix KB效果、notes续接 | generic classifier/CAS-safe brief仍不足；逐个删transition/discovery例外/KB区别/verify/旧notes/brief必须红 | mapping冲突、reporter不足、权限不足/unknown effect只真实确认或preview，A不假远端 | triage/SKILL; AGENT-BRIEF; OUT-OF-SCOPE |
| M17 / #17 | U003 wayfinder→Plan owner; F17; A | huge AND multi-session AND fog证据及destination；仅Plan canonical index/frontier/fog/exclusions/decision pointers，sharp问题可blocked、fog不装执行U；一真实HITL决定后续接、context pointers不复制真值 | small/clear task误触、duplicate tracker map、fog=pending executable或agent答用户失败 | destination/decision未定真实gate；没有tracker不造外部资源 | wayfinder/SKILL mapped to local Plan, no second map |
| M18 / #18 | U007 setup-wizard; F18; L/A/I | ordered stages/values source-target-secret确认；具体URL/点击来自实际资料；M18.P03仅候选合规：copied library/STAGES-only/TOTAL/chmod/bash-n及available shellcheck；M18.P04以相同需求/输入的真实脚本黑盒运行验证全部helper effect/confirm/skip finish/source immutability，等价实现的字节/内部函数名不同也通过行为oracle | 默认Stripe/编UI、secret stdout、漏stage、wrong secret name、SKIPPED假成功为行为失败；库区改动只判候选合规失败，不判baseline失败；行为相同但库字节不同不得算增益 | 缺阶段/path/真实secret需求先问，生成不端到端运行 | wizard/SKILL; template.sh |
| M19 / #19 | existing handoff/runtime; F19; L | 会话续接由现有handoff和原生权限owner处理、已有SID真实读回 | 另装Claude自动会话控制器或声称Codex等价失败 | 无session authority只摘要 | in-progress/claude-handoff/SKILL |
| M20 / #20 | U010 Plan/Orchestrator; F20; A | task graph frontier、integration tip/ownership、one-active stable UID及context pointers；worker preimage/TDD/完成后integration验证，最后code-review再ready；archive仅自身受管理授权worktree | reset tip、parallel exception、依赖未DONE派C/worker覆盖或自动close票据失败 | tip/ownership/base变化BLOCK，未批Git无动作 | implement-spec/SKILL mapped serially |
| M21 / #21 | U005 loop-me; F21; A | U005五条完整方法，world-context loop discovery→真实选择→stateful frontier→persistent complete spec；条件trigger/AI/checkpoint/纯人工例；push-right理由+decision brief；续接read/edit保留 | generic SOP即使有stop/recovery不合格；遗漏world discovery/真实grilling/brief/未决gate任一红 | NOTES薄先访谈，goal空可发现；缺精确path不写、未答不DONE | in-progress/loop-me/SKILL |
| M22 / #22 | U010 implement PR reference; F22; L | Summary最小有效visual sketch、Evidence真实before/after、Merge Danger door+blast radius，domain vocabulary/源链接正确 | 空三标题或捏截图/check URL/只述过程失败 | 缺diff/evidence标缺口、不publish | pr/SKILL |
| M23 / #23 | U010 code-hygiene environment-retro; F23; L | actual primary session logs，navigation/checks/standards/global pointers/tool economy/noops/access按severity给证据；先查现有script/CI接线；机械违规则deterministic checker，判断类才review rule | 重建已有broken checker、无日志断因或自动改Hook/memory失败 | 来源缺失指出、权限不可得只proposal；产品design retro仍原owner | retro/SKILL |
| M24 / #24 | U010 TS recipe; F24; L/I | manager/root/config真实探测，merge existing config；五条具名error规则（entrypoint-boundary-from-app、entrypoint-boundary-across-packages、tests-through-entrypoints、tests-folder-is-private、no-circular）按实际packages root保护root entry、内部合法互引、tests只能entry/自身fixture、tests目录私有和无环；cjs/$1保留、多root entry非barrel；check接线与example公共seam；pass→deepimport fail→恢复pass；packages README pointer；M24.P07单独验证本包production→tests拒绝、tests→自身fixture与普通内部互引允许，单删tests-folder-is-private变异红、恢复绿 | 只测外部深导入却漏own-test/tests-folder-is-private/cycle、overwrite config、tsconfig aliases或假接线失败 | 非TS/manager未知或依赖权限缺失只proposal不install | setup-ts-deep-modules/SKILL; dependency-cruiser.config.cjs |
| M25 / #25 | U004 writing beats; F25; A | 完整pile/prerequisite→2–3 reachable requires/grounds/unlock→用户选一beat才写并停→重读重算，用户编辑保留与自然结束 | 先write全部、grounding jump、元数据格式/材料捏造或cached overwrite失败 | 原料/输出/选择缺失不write，same inode拒绝 | writing-beats/SKILL; U004 |
| M26 / #26 | U004 writing fragments; F26; A | 初始语料立即用、访谈leading-word探索、单H1和横线fragment真实顺序追加，用户定点剪/重写/合并保留其他字节 | 强加outline/heading/date/TOC、遗漏initial语料或编quote失败 | topic/output_path缺失问，不生成假fragment | writing-fragments/SKILL; U004 |
| M27 / #27 | U004 writing shape; F27; A | 完整只读pile/prerequisite、2–3opening真实选/合、grounded blocks形式理由逐块同意即写、重读及结束由用户 | raw pile写回、auto whole article/不grounded概念、虚构缺例子失败 | material/output缺失/same inode拒绝，缺材料请求补/删 | writing-shape/SKILL; U004 |
| M28 / #28 | existing native guard/trust; F28; L/I | 本地既有git/hook控制保护危险操作且11项source/trust读回一致 | 新增并行Claude guard hook或覆盖原hooks失败 | harness不兼容明确能力边界，不force | git-guardrails-claude-code/SKILL |
| M29 / #29 | U010 G/tdd shoehorn recipe; F29; L/I | test-only as Type→fromPartial、intentional double-as→fromAny、fromExact用途明确；imports+actual typecheck且断言语义不退；manager与目标case可核 | prod批量as/把错误输入fromAny改成valid data/只查文本未typecheck失败 | 缺dependency或文件scope只proposal，不暗装 | migrate-to-shoehorn/SKILL |
| M30 / #30 | existing generic course/content owners; F30; L | 当前没有专用exercise-course约束，普通教学/内容请求到teach或已有owner | 新加scaffold-exercises course convention/安装专用repo脚手架失败 | 专用课程新需求重走scope，不伪造本轮需要 | scaffold-exercises/SKILL |
| M31 / #31 | U010 code-hygiene precommit recipe; F31; L/I | manager/existing hook/config先查；staged-only formatting在前、现有typecheck/test在后，缺script显式省略；保留existing config/其他hooks；批准fixture staged files smoke观察真实拒绝/成功 | 重复Husky/全repo stage、overwrite已有formatter、未接线仅有hook文件失败 | manager/owner/依赖scope不清先查/问，无授权不install/commit | setup-pre-commit/SKILL adapted existing .githooks owner |
| M32 / #32 | existing grilling; F32; L | grill-me意图到现有grilling frontier/真实答案而无竞争alias | 另装同义skill/UX候选错误路由失败 | 未决真实gate不自行回答 | productivity/grill-me/SKILL |
| M33 / #33 | U003 grilling; F33; L/A | design tree全部ready frontier一轮number+recommended，依赖后轮；env facts实际查、正在research是unsettled prerequisite；user答案后重算，空frontier且用户确认shared understanding才完成 | 一轮问依赖问题、fact让人猜、自问自答或AFK假同意失败 | user未答等，fact缺证据标未settled | grilling/SKILL |
| M34 / #34 | U003 handoff; F34; A | 真实OS temp精确path，focus tailoring/suggested skills+authority/pointers/未知/恢复命令；redact、引用已有artifact不重复制 | 写current project别名、自动开/发thread、secret泄漏或claim未读source失败 | 下一focus未知保留unknown不编 | handoff/SKILL |
| M35 / #35 | U003 G/teach Claude; F35; A | mission/primary sources/真实ZPD、短单topic lesson与immediate反馈、retrieval/spacing/适用interleaving、无格式答案暗示；shared assets/link/reference print/4FORMAT/编号/旧记录保留；用户真实回应才记录，使命变化先确认；wisdom问题提供community建议并尊重拒绝 | 文本代HTML/无feedback/断链/复制asset/无source或用瞬时答对宣称storage strength失败；自动发社区消息/建调度失败 | missing mission先问，primary不足补证，无真实回应不升阶 | teach/SKILL; GLOSSARY,LEARNING-RECORD,MISSION,RESOURCES FORMAT |
| M36 / #36 | U009 research-kit questionnaire; F36; A | 先问send的role/expertise/relation与need-back gap，Markdown purpose/from-to/use/context/how-answer/重要性排序/单题idea+answer stub/themes/anything-else；每decision覆盖后回原owner | interview user不拥有的subject knowledge、compound questions/编回答/Likert统计或自动发失败 | recipient/need-back/path缺失真实问不写 | to-questionnaire/SKILL |
| M37 / #37 | U003 wait-what; F37; L | 对上一未理解message补最小context，用中文简单明确表达及正确域词，意义不丢；英语场景才Simplified Technical English | 换topic/术语臆测/启动无请求研究或写项目失败 | 域词不明确说明并确认，不编GLOSSARY | wait-what/SKILL adapted language |
| M38 / #38 | U003 writing-for-agents + skill-authoring; F38; L/A | pointer condition/branches/leading-word，step/reference/disclosure/co-location；done criteria可查且穷尽；单source、环境lookup不cache、去dup/noop、正向措辞；skill invocation按native policy/显式保护、shared refs可达；真实文档前后阅读行为比较 | 只缩字数=提升、隐藏must behind弱pointer/重复真值、miss branch或捏read证据失败 | 目标doc/branch证据缺失只proposal；未读引用不能claim validated | writing-for-agents/SKILL; SKILL-MECHANICS mapped native contract |

38行均有唯一source及具体owner，F09为L/U两分支；原表F02–F38保留并服从本矩阵更具体断言。新增F01/F19/F28/F30/F32只验证现有owner/负路由/没有新alias，不宣称源方法全量新采用或要求baseline伪失败。四个新入口的预声明gain分别绑定F16状态/历史拒绝、F21world-context/checkpoint/brief、F25–F27交互写作、F18实际wizard及helpers，不能以新文件存在算增益。全部38项的gain/preservation及选定目标已在3.2和冻结矩阵预声明；测试作者没有选择成功口径的权力。按U012-b同输入/同seed两arm三trial裁决。


### 3.2 已冻结的38项成功口径与选定增益目标

本节与METHOD-COVERAGE-FINAL.json共同冻结成功口径。gain为需证明的能力假设，不是已获增益；每个G目标candidate须3/3 PASS、同输入baseline至少2/3明确行为FAIL且三次均有完整有效观察；任一arm出现UNKNOWN均阻断比较，不计baseline失败，目标其余全部MUST亦须candidate3/3且无回退。preservation依据当前合同已存在的方法，候选全部MUST3/3、既有通过行为不得回退；只有两arm都3/3才称证明保持，baseline未达者如实记录缺口，不改标签成gain。未证明的G不能降格为preservation放行，保持能力也不能捏baseline失败求提升。测试作者只编译，不选择成功口径；要改分类/目标必须正式delta再计划并更新冻结证据。

当前合同路径和SHA仅证明已有约定，不冒充行为PASS。M03的三独立设计、M35的HTML教学当前就存在，所以明确归preservation；M08现有brief不等于新HTML机会报告，M09分别为新逻辑/多变体方法，M24新接线的五条具名包边界规则，均有选定G。M12不新增包而自定义triage映射由新消费者提供，G不把setup alias存在当能力；M30不采用专用课程脚手架，不把普通课程宣称完全等价。

| M | 分类 | 选定目标／保持能力依据（完整ID、MUST及当前合同SHA见冻结矩阵） |
|---|---|---|
| M01 | preservation | 现有office/Plan承担总入口，保持分流而不新增竞争入口。 |
| M02 | preservation | 现有Mode D与facade已有双轴/基线/Fowler/只读分列；本次修正权威和串行角色，不虚构新双轴能力。 |
| M03 | preservation | 既有DESIGN-IT-TWICE已明确三种独立接口、约束/错误/示例及depth/locality/seam比较；保持方法并修正派发合同。 |
| M04 | preservation | 既有diagnosing-bugs已含真实red loop、最小化、3–5ranked hypotheses、分别授权修复及回归。 |
| M05 | preservation | 既有domain-modeling已承担单/多域词汇、真实澄清和ADR三条件；保持授权落点。 |
| M06 | preservation | 由既有grilling/domain internal组合保持同UID/权限交集，不新增grill-with-docs。 |
| M07 | preservation | 既有implement→Plan/Orchestrator编译/批准/稳定UID执行和最终审查保持。 |
| M08 | gain | M08.G01: 有真实代码证据的离线HTML候选报告含非空正确before/after图、ADR冲突和Top推荐，真实选择前不提接口；由实际冷explorer取证，普通brief保留（F08，M08.P04,M08.P05） |
| M09 | gain | M09.G01: 可移植pure逻辑模块+可见问题/状态+自由动作+三个tabbed guided walkthrough及reset，真实浏览器操作与提取后同状态一致（F09-L，M09.P01）；M09.G02: 同一个HTML的三个结构不同UI变体，以稳定variant query/箭头/键盘环绕，逐变体状态与共同内容QA，真实用户选择（F09-U，M09.P02） |
| M10 | preservation | 既有quick-research已单后台、primary引用和产物；只纠正免handoff的冲突措辞。 |
| M11 | preservation | 仅历史真实冲突能力回归，不声称上游有新版。 |
| M12 | gain | M12.G01: 提供自定义两category/五state角色映射的现有tracker材料，issue-triage按该映射读出状态；to-tickets本地零配置及domain授权路径不回退，无setup包/根布局改动（F12，M12.P01） |
| M13 | preservation | 个人tdd已有垂直red/green、公共seam和系统边界mock；本次方法更新保持能力。 |
| M14 | preservation | 既有to-spec→tech-spec已conversation_synthesis与CONV、覆盖门；保持canonical owner。 |
| M15 | preservation | 既有to-tickets已有逐DEV/TEST、local/显式tracker、quiz及hash绑定；保持不再造计划。 |
| M16 | gain | M16.G01: 恰一category/state、needs-info新回应转回triage、concept等价历史拒绝与维护者三选一、verify-before-grill、durable brief和already-implemented/rejected bug/rejected enhancement三种KB效果均实际观察（F16，M16.P02） |
| M17 | preservation | 既有wayfinder/Plan已huge AND multi-session AND fog与destination/frontier；保持规划真值。 |
| M18 | gain | M18.G01: 相同需求/输入下实际向导脚本的helper行为满足顺序阶段/TOTAL、幂等upsert、拒绝无写、secret无stdout、正确gh名称和值、失败及SKIPPED非0和源材料不变；只用明确可观察行为差异证明增益。模板字节一致性另作候选合规门，不计baseline失败。（F18，行为M18.P04；M18.P03仅候选合规） |
| M19 | preservation | 现有handoff/原生session权限保持，不采用平台自动控制器。 |
| M20 | preservation | 既有Plan/Orchestrator已有依赖/U-ID/批准和集成职责；方法移植加强执行细节，不声称新执行器。 |
| M21 | gain | M21.G01: 根据真实NOTES发现两个有依据loop，真实选择后stateful frontier得到完整持久化spec；有checkpoint例的push-right理由和决策brief完整，续接保留真实编辑和已决项（F21，M21.P01,M21.P03） |
| M22 | gain | M22.G01: 实际diff与证据生成Summary可用visual sketch、Evidence真实before/after、Merge Danger door与blast radius的PR草稿，不以三个空标题通过（F22，M22.P01） |
| M23 | gain | M23.G01: 真实会话日志定位工程环境摩擦、按severity列证据，先核现有checker/CI接线；机械缺口给可检验checker建议、判断类给review规则，不自动改memory/Hook（F23，M23.P01,M23.P02） |
| M24 | gain | M24.G01: 保留既有config后接通五条具名包边界error规则，app/外包deep-import、自身tests越界、本包生产代码导入本包tests及cycle均拒绝；公共entry、测试自身fixture与普通内部合法路径通过；单删tests-folder-is-private的遗漏变异红，恢复回绿（F24，M24.P02,M24.P04,M24.P07） |
| M25 | gain | M25.G01: 真实prerequisite与grounded决定2–3可达beats，用户仅选一个才写一个并停，重读重算后给下一轮且保留用户编辑（F25，M25.P01） |
| M26 | gain | M26.G01: 初始语料进入真实探索，单H1与横线异质fragment按顺序追加；定点剪/重写/合并及用户编辑保留，不强加outline（F26，M26.P01） |
| M27 | gain | M27.G01: 固定原料只读、真实prerequisite和2–3开篇选择，requires⊆grounded且逐块选择才写，重读保留编辑与由用户结束（F27，M27.P01） |
| M28 | preservation | 现有跨harness guard/trust保持，不安装第二Claude专用Hook。 |
| M29 | gain | M29.G01: 仅测试数据把as Type与故意错误double-as分别迁到fromPartial/fromAny，明确fromExact用途，实际typecheck与原断言语义保持（F29，M29.P01,M29.P02） |
| M30 | preservation | 保持普通课程能力和本次不引入专用exercise scaffold的scope，不宣称两种课程结构完全等价。 |
| M31 | gain | M31.G01: 既有.githooks所有权保持，staged-only formatter先执行、现有typecheck/test随后执行，批准fixture真实观察成功/拒绝；不重复装Hook或stage全仓（F31，M31.P02,M31.P04） |
| M32 | preservation | 保持唯一grilling，不新增同义grill-me。 |
| M33 | gain | M33.G01: 3个独立决策在一轮numbered frontier给推荐，依赖问题等待前置，环境事实自己查，真实答案后重算且收尾确认；未答不推进（F33，M33.P01,M33.P02,M33.P03） |
| M34 | preservation | 既有handoff已有OS临时文件、事实/恢复/focus与不自动开session；整体更新仍归保持。 |
| M35 | preservation | 个人teach已经以HTML课/即时反馈/assets/真实记录为主产物；保持完整既有教学能力。 |
| M36 | gain | M36.G01: recipient role/expertise/relation与need-back决策缺口被确认后，实际Markdown逐题决策映射、answer stub/themes及anything-else，不把单个审批人当统计样本（F36，M36.P01,M36.P02） |
| M37 | preservation | 既有wait-what承担中文解释/正确术语和最小上下文；保持不改变主题。 |
| M38 | preservation | 既有writing-for-agents已pointer/单source/可查DONE等方法；以真实阅读行为验收保持，不以缩字数冒充增益。 |

共38项均已分类：16项gain、22项preservation，17个具体G目标（M09两支）；源采用仍为30采用/7不新增/1历史，分类不改变安装数量。P/N/E共203个固定断言（保留原202个ID，新增M24.P07/M24.OP07），语句内全部并列义务都是MUST，任何一项缺失即该variant失败。所有G须逐个证明，不允许同方法两个目标互相抵消。

## 4. 兄弟握手、实施顺序与审查门

已存在的框架交付证据：
/Users/luca/Documents/Codex/Archives/luca-gstack-hook-recovery-2026-09-29/reports/luca-hook-recovery-result-20260929.md。
该历史报告记录当时R/E/remote Mprev、11项摘要及 exact trust、PR11/12/13、Luca原生session 01a0f00d-ea27-7582-a22b-f16cc224bac6 的 COMMITTED/VERIFIED/Stop。最新报告于2026-09-30 11:14（北京时间）确认 Muse App独立发布已闭环：本地/远端 b05c719b61cea81b0131a93035d396927ce56a89、63/63通过、工作区清洁；原生会话01a0f04d-6866-70e2-b68f-2a687b73c2da的 COMMITTED/VERIFIED/Stop已通过。该报告的框架基线为Mprev；这些历史证据不能替代本次候选验收或未来维护窗口批准。

最新模型路由修复会话01a0f05f-e05c-7693-b844-326c9eb66b75，标题“排查自动审批阻断”，已普通发布M0（parent=Mprev）到R/main及origin/main。当前完整13文件原postimage、107/0本机门、R的11条exact trust和新native冷启动4/4有该会话原证据；其他3个运行根被installer保留，E仍E0，不能写成E已通过新版原生测试。精确只读取证入口为R/framework-audit/2026-09-30-model-routing/{candidate-manifest.json,activation-result.json,activation-trust-readback.log,live-activation-evidence.json,publication-commit-result.json,publication-commit.log,DEPLOYMENT.md}；私有model字段只供可信证据验证，不复制进公共计划或回执。提交/tree/远端CI最终状态在H0及Htest重新读回，旧票与旧activation不复用。若该会话后续源码修复或其他Hook维护改变baseline/ownership，停止受影响实施，读回稳定基线并修订实施delta；本次交付不另开计划审查轮次。

维护握手按实际效果资源发现所有者，不限定为历史“两位兄弟”。当前已知集合如下，H0/Htest/Hpublish每道门均重新读取各会话最新状态与实际资源preimage；发现新效果所有者先纳入，不从旧的完成状态推定窗口空闲。

| 效果所有者 | 需核对的共享资源与边界 |
|---|---|
| 01a0ebdb-a018-7093-b7fb-e803d4d07880（原框架修复会话） | R/E框架根、相关发布及运行根占用 |
| 01a0f05f-e05c-7693-b844-326c9eb66b75（模型路由修复会话） | R/E模型路由、broker、source-guard、全局trust/config及发布占用 |
| 01a0f0fe-e6fa-7660-beb5-181b1a9b6444（当前Hook维护会话） | Muse独立配置目录的精确11条trust刷新已由该会话报告完成；Hook/source-guard与broker相关效果、隔离的七文件母仓候选在本轮审查时暂缓共享源码写入，释放窗口后的状态须重新读回；不能从它的授权推导本任务已获安装授权 |
| 本次实施的WA0及实际新出现的维护者 | 候选工作区、R/E安装切换、指定个人技能目录、上述共享运行资源与Git发布 |

每道门先共享S/M0/E0、精确读写/发布范围与预计窗口；由每个相关效果所有者返回带真实会话/时间、资源范围、当前占用、暂停同范围写入起止条件的回执，并在开门前复核实际preimage。结束窗口也记录释放回执。旧报告、离线状态和无回复均不算暂停承诺；未取得回执只阻断重叠效果阶段。无需等待Hook尚未启用的隔离候选完成，也不替它启用；若共享源码/权威确已改变，停止受影响实施、读回稳定基线并修订实施delta，不能悄悄rebase或拿旧M0证据放行。本次最终方案不因此新增计划评审轮次。Muse App其他不重叠工作可独立进行。

实施波次：

1. U001/H0；U002→U003。
2. 逐个串行：U004→U005→U006→U007→U008→U009；任何时刻只运行一个subagent，共有文件逐单元交棒。
3. U010→U011→U012-a→U013，局部与静态检查后冻结C。
4. 候选分支/草稿PR→远端Required Checks→Htest/兄弟窗口确认。
5. U014基线对齐→统一M0 baseline→U014候选安装→U012-b candidate与全量门。
6. 独立实现专家+红队复审完整冻结diff与所有回执→Hpublish→U014普通发布及全新smoke。
7. 精确回执齐全才 DONE；顾虑但不影响MUST可 DONE_WITH_CONCERNS；缺上下文 NEEDS_CONTEXT；关键失败 BLOCKED。

连续同因失败三次停止盲重试。来源/基线改变、ownership冲突、未经批准保护例外、原生身份不成立或恢复效果未知，立即停止受影响阶段并保留UID重新计划。

计划会审 C1–C7：38来源与本地去重完整；执行依赖无环且每单元可落地；权限/项目/模型/所有者一致；测试真行为且有反例与缺输入；正式安装及恢复可执行；远端CI与同候选发布证据完整；两位冷启动独立reviewer审查同一冻结正文且兄弟证据可核对。原票的FAIL/UNKNOWN如实保留；实质问题必须在最终方案逐项修复并自审闭合后才能交付，不能将原FAIL票改写成PASS。未闭合缺陷或缺失原生完成证据仍须明确列为未完成。

本次最终交付遵从用户“最后一轮，专家和红队给到的问题修复后，自审就是最终方案”的明确指令。两位冷reviewer各自审查同一冻结PLAN-R14.md及其R13索引/矩阵；其真实同次accepted完成原票原样保留。作者在新最终稿及新矩阵修复发现，更新SHA绑定并自审，交付回执逐项记录问题→修改→验证。最终稿继续引用不变的SOURCE-INDEX-38-R13.json，引用新的METHOD-COVERAGE-FINAL.json；旧票只对冻结R14有效，不转移为最终字节双PASS，不开启第二轮计划评审。M0/E0和权限、行为、发布及恢复的实施门仍保留。

后续实施仍需要独立行为与发布验收；计划审查通过绝不等于运行测试已经通过。自成长闭环为固定来源→唯一owner→完整方法适配→预声明行为对比→独立裁决→精确发布→可验证恢复→来源漂移监测；不以技能数量、正文长度或自动写记忆作为成长证据。



---

## U001 实施 delta：真实批准与当前基线

以上正文是 FINAL-PLAN.md 的冻结原字节，SHA256 `ec0b1e1ed5f28bab78b02ae69e1fb73bfcd663bb56397f973ec422fcaed37f5e`；不回写封版文件，不改来源、方法、断言或成功口径。以下是实际开工读回后的窄实施 delta，适用于本候选；正文中的历史 M0 快照仍保留。没有追加计划评审，也不宣称最终稿双独立 PASS。

- 原 M0：`0c56460e5a0761b7caaa7b628a1bf22fd57a2c09`；批准的实施/行为基线 M1：`1ea5d2364cb2b706e8183b3a51ea079b6a1c71da`；E 当前仍为 E0：`eddae51c01a07794227954b7ca87492ffe5f8c0a`；上游 S：`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。
- 用户在 `2026-09-30T10:42:43.553Z` 直接回复“批准”（消息 `msg_01a0f1e8-d6e1-7130-a176-759639eba4c5`），批准 M0→M1 实施清单修订和三个维护请求；它当时仅批准 delta 与消息。
- 用户随后在 `2026-09-30T10:59:09.313Z` 指示“你直接执行就行，不用管他们了”（消息 `msg_01a0f1f7-e181-7a43-8964-63a51c85d9b0`），对已展示 H0 的 188 项有限候选路径、局部门、单一 C 提交、普通候选分支推送及 main-base 草稿 PR 取得真实 H0，同时豁免等待剩余维护回执。批准原文、展示清单 SHA 与档案绑定在 A/preapproval/H0-APPROVAL.json。
- M1 的七项 Hook health 变化全部保留；Matt 写权限仅与 `.codex/hooks.json` 的 11 摘要字面量及 `scripts/verify.sh` 的 Matt 离线门相交，不覆盖 M1 其他改动。
- candidate worktree 的 ref、候选提交 parent、PR base、未来同候选 CI 绑定和未发布恢复目标按批准的 M1 执行；不静默 rebase，不采用其他新基线。实际受管编辑对象是 `/Users/luca/.codex/worktrees/matt-skills-adaptation/luca_gstack`，official operation `5460bace-80e9-4c45-9e57-720706434033`，git common dir 为 R/.git。候选只能作编辑对象，不从它启动原生测试 session，不创建项目 pin。候选分支合同仍为 `codex/matt-skills-adaptation`，创建命令的真实单次授权和效果由外部受控变更回执记录。
- 未来 E baseline alignment 从 E0 普通快进到 M1，精确 19 路径已在 A/preapproval/E-BASELINE-ALIGNMENT.json 展开；原 E0→M0 的 13 路径历史清单保留。该 alignment、R/E 候选安装、个人安装、官方 guard/trust、真实原生行为、验收项目和全量 verify 副作用均没有 H0 权限，须独立 Htest。main 普通发布仍须同一已验收候选的 Hpublish。
- H0 准备窗口在用户暂停时已释放/撤回；两份维护回执只作历史证据，Hook 无回执不变成同意。用户 `2026-09-30T12:48:53.204531+00:00` 的“继续”恢复原 U001–U013 范围并保留先前等待豁免，不重开当前 peer 停写承诺。Htest/Hpublish 按实际资源另读回和审批。
- 38 源 ID、30 采用/7 不新增/1 历史、38 方法/203 断言、16 gain/22 preservation/17 G 原样冻结。所有真实行为仍 PENDING/NOT_RUN；UNKNOWN 不算 baseline FAIL，M18 模板合规与行为增益分开，M24 五规则及 P07/OP07 保留，M03/M35 保持能力。
- 每次实际写入继续绑定当前 UID、精确 patch SHA、repo identity、scope/preimages 与官方受控上下文；最多一个运行 subagent，真实完成及同次 accepted 后再派下一个。保护 `framework/`、用户工作及其他会话制品，NO_PIN 不访问共享项目别名，自动提取/记忆写入关闭。


## M2 实施 delta：已由真人批准

用户 2026-09-30T15:03:49.694Z，消息 `msg_01a0f2d7-e2be-74d1-ac2a-a554a89c0767`，原文“批准基线调整”。当前候选/远端基线 `54ef203b4dd77e23564d0cba22f773346d30dfec`，parent=M1；实际受控普通快进已读回，U001/U002 及其余187个Matt目标保持原字节。完整批准与读回见 A/preapproval/M2-BASELINE-APPROVAL.json 和 A/implementation/M2-FF-READBACK.json。

M2上游五路径完整保留；适配仅与 U013 的11条Hook摘要相交，不修改注册协议。现有188个路径及来源/方法/203断言/17G不变，原M0/M1审批、原审查票和历史快照均保留。当前候选parent/PR基线/恢复基线改为M2。E仍E0，未来 E0→M2 的22条对齐仅为Htest清单，未执行；Htest/Hpublish及原生行为仍未批准/NOT_RUN。原等待维护者回执豁免保留；不声称取得新的停写回执。
