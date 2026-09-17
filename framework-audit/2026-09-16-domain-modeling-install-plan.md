# domain-modeling 适配安装执行计划

Status: PUBLISHED / ACCEPTANCE_BLOCKED — user publication-order override executed; runtime incomplete and second review found surviving MAJOR scorer defects.

本文件是待用户批准的安装执行 payload。用户随后要求“包含全局推送和提交。你刚才所有的执行都要全局推送和提交”，并要求“继续”：本次已产生的任务文档可以聚焦提交并普通推送；安装仍须展示本文件后获得真实批准，不用文档发布冒充技能安装。

## 0. 前提与范围

- 目标：补齐 domain-modeling 的独立手动入口、无固定关键词的语义识别与宿主 Agent 按需调用；不是安装整个 mattpocock skills 集，也不是更换框架记忆系统。
- 该不该解：应解；用户明确要求独立及自动可达，而现有 brainstorm 术语持久化与 ADR 提议规则没有提供完整独立入口。
- 更薄替代：仅补 references 不能满足独立手动调用与模型发现；采用单一 skill 正文、薄入口和按需指针，不新建通用领域建模平台。
- 默认形态偏差：独立入口可能高估新增 skill 的必要性；由冷启动 default-REFUTE reviewer 复核重复建设、消费面与权限合同。
- 路由：framework-evolution 中针对已点名单个能力的适配接入，复用既有对标证据，再走 FUSION 安装门；不跑全仓 scout、不重做整套 benchmark、不以 research skill 替代框架流程。
- 研究：已有上游真身、固定版本、MIT 许可和本地机制对标。本计划是成熟接入模式，不做重型外部研究；U-001 重新核验固定源包，变化不得静默换版本。
- 目标 checkout：`/Users/luca/Desktop/项目/muse/lucagstack`。
- 实现源基线 HEAD：`0e07efd17e5740aa2a6ceef4a4423281ebc906b4`。旧评审的 `2b01fb...` 不作为本次安装基线。已发布文档提交 `68dc9403f53c234274a17a84e0e3e4ff81112229`；安装可从第 0.1 节列明的文档提交及本次复核 delta 文档提交继续，但必须验证其相对本源基线仅改变这三个任务文档；实际安装 HEAD 在 U-001 记录精确 SHA，其他历史或实现文件漂移须重规划。
- 上游：`mattpocock/skills`，path `skills/engineering/domain-modeling`，固定 commit `321658273cb1d20b76026717d027d505790106d4`；保留版权和 LICENSE，适配后的正文不声称与上游原文完全相同。
- Scope：框架 NO_PIN；不切换或创建真实下游项目；不读写共享 `docs/`、workflow-state、current-topic aliases。
- 不触碰：`framework/`、根 `CONTEXT.md`、根 `AGENTS.md`/`CLAUDE.md` 的安全内核、受控 semantic 晋升文件、全局 harness 配置与 hooks、个人全局 skill 安装、其他 checkout。
- 不新增 optional-workflow-graph 必经节点或 graph edge；新能力由宿主按需消费，graph 缺失不影响独立调用。

### 0.1 已授权的任务文档发布（安装前，单独闭环）

- Source：inline 用户“包含全局推送和提交。你刚才所有的执行都要全局推送和提交”“继续”。
- 本次“全局提交/推送”落点为当前已指定仓库的远端主分支，不扩成其他 checkout、下游项目或个人全局配置同步。
- 精确 remote：`upstream`；fetch/push URL 均为 `https://github.com/wangmoumou1216-ai/luca_gstack.git`；目标 `refs/heads/main`。2026-09-16 只读 `git ls-remote upstream refs/heads/main` 为 `0e07efd17e5740aa2a6ceef4a4423281ebc906b4`，与本地 HEAD 相同。
- 精确文件：`framework-audit/2026-09-16-domain-modeling-plan-redteam.md`（保留当前用户编辑）、本计划、`framework-audit/2026-09-16-domain-modeling-install-plan-review.md`（独立只读评审票据及实际限制；缺票不得写 PASS）。
- 模式：Sequential 文档发布，非 U-001–U-008 的 Supervisor 安装。断言先冻结：index 原为空；仅上述三个文档；无运行物/graph/项目/全局配置变化；文档 FILE_END 完整且无虚假安装/评审声明；独立票据绑定计划 SHA；保护集字节未被本任务覆盖；仓库 hook 必须通过。
- 操作：先独立复核并保存票据，再 exact-path `git add`，一个聚焦文档提交。推送前重新检查当前 HEAD、push URL、远端 main 与该提交的父 SHA 一致，只执行 `git push upstream HEAD:refs/heads/main`，不 force、不自动 pull/merge/rebase、不推任务分支或 tags。
- 验收：提交实际 tree 仅三文件；hook 通过；普通 push 成功后再用 `git ls-remote` 核对远端 main 等于该提交 SHA。若远端前进、分叉、权限不足或审核缺口不允许发布，保留本地证据并准确报告，不强行覆盖。
- 文档复核即使结论为 NEEDS_CONTEXT，也可作为明确未就绪的方案归档；它不产生安装 authority，不宣称 framework capability 已通过行为门。安装运行物的发布仍受 U-007/U-008 阻断门约束。
- 首次文档提交/普通 push 已完成并核对远端 main 为 `68dc9403f53c234274a17a84e0e3e4ff81112229`。随后独立复核恢复，新增两项计划缺口，仅修订本计划与同路径 review report；这次 delta 使用第二个聚焦文档提交及普通推送，不 amend、不改已发布历史；文件面仍仅上述三个任务文档。远端曾提示 `Required Checks` 尚未满足，收据不把 push 成功当 CI PASS；检查实际结果并单独报告。

### 受保护用户工作

当前 unrelated dirty：`.claude/observability/observations.jsonl`、`.claude/observability/rules.yaml`、`memory/retrieval-log.jsonl`。既有评审报告属于本任务文档发布范围，但保留其当前用户编辑，不恢复旧副本。

不 stage、不覆盖、不 stash、不清理这些内容；执行前记录 byte/hash、diff 与 index，测试日志重定向到任务临时目录。若 baseline、index、计划所涉文件或上述保护内容漂移，先判断并发用户工作；不得以恢复旧快照的方式覆盖新改动。

### KILL assumptions

- KILL-1：上述 checkout 是用户此次安装目标；若用户要求正式主仓或双仓同步，本计划权限与落点作废，先重规划，不自动跨读/跨写。
- KILL-2：固定源包可达、许可及两份格式文件可核验；证据缺失时停在 U-001。
- KILL-3：Claude/Codex CLI 与相应认证足以进行隔离 live probes；不可用则明确缺票，不能只靠静态检查宣称安装完成，也不改全局配置抢救。
- KILL-4：回到主 checkout 时 HEAD 与 U-001 冻结的安装 SHA 一致、目标文件无新增重叠改动；否则不 squash，不自动覆盖或强行合并。

## 1. 执行模式与档位

- 模式：Sequential 外层 + Supervisor 门控；需要用户批准本 payload 后进入安装。
- Tier：Deep（文件面超过 15，且包括 Git worktree/ref/提交与远端发布效果）；8 个稳定 U-ID，不重编。
- 主线负责实施；preflight-agent 查入口前提，quality-gate 查冻结断言，独立 default-REFUTE reviewer 查终版 diff；默认串行，不启动研究 fan-out。
- 安装及宿主变更：core-execution；机械 lint：mechanical；独立判定：model-routing P1 reasoning-heavy，Codex xhigh、model 继承。
- 新 skill：guided-execution / Codex medium、model 继承。理由：每次调用是受明确词汇与边界规则约束的局部建模，代码交叉验证只读；概念取舍交人，工程接口/实现设计仍由原 owner 承担，不扩成整场架构设计或代码实现。三问：单次上下文局部；判断杠杆中等；文档变更可追溯且不执行真实系统动作。
- DEV/ASSERT 反向覆盖：N/A（框架能力接入，未消费产品 task-plan；以下 U-ID 均溯源用户原话与 DMR 评审项）。

## 2. 能力合同（批准内容的一部分）

### 输入与触发

- 手动：Claude `/domain-modeling`、Codex `$domain-modeling` 或 selector；同一 canonical 正文，无双份规则。
- 语义：任务是在改变领域模型，存在术语重载/冲突、对象归属与关系歧义，或领域陈述与代码矛盾；窄词表只是确定性粗网，catalog description 承担语义发现。
- 排除：只消费既有词汇、启动读取 CONTEXT、纯格式编辑、无领域语义变化的局部变量改名、通用编程知识、无领域问题的 UI 或接口工程设计。
- 混合意图：原 skill 保留主任务 owner；只为真正影响当前需求/合同的建模问题内部调用，不因词汇出现而抢占主路由。
- internal 输入：caller、建模问题及 condition evidence、scope、原任务/U-ID（适用时）、继承的只读/写入边界和已批准 artifact 目标；缺 authority 只分析，不补造授权记录。

### 输出、定案与写入

返回同一份结构化结果：`status`（共享 completion status）、`scope`、`resolved_terms`、`relationships`、`code_evidence`、`open_questions`、`writes`、`blocking_for_caller`、`resume_target`。

- 事实可由代码/已有文档核验；用户偏好或领域规则取舍必须一次问一个并等真实回答。
- 没有回答，不替人选择 canonical term：相关项保持 proposed/open，返回 NEEDS_CONTEXT；只阻断依赖该项的需求或接口合同，其他独立工作可继续。
- 代码缺失或不可读时标未核验，不把推断写成事实；代码与用户陈述冲突时记录两端证据，不能擅自把一端改成另一端。
- 默认只分析/建议。仅当用户的任务或父任务已经授权对应文档写入、接受了具体领域取舍、目标在已核验 scope 内时，使用 apply_patch 落盘；已有授权不再逐行重复询问。
- 项目默认领域产物：已验证项目根内 `docs/domain/glossary.md`，作为项目规格文档，不是 memory/promoted-facts 或 framework root CONTEXT 的旁路。先读已有术语，保留 canonical + definition + Avoid，并记录必要的关系/边界；有定案内容才懒创建。
- 若项目已有其他权威 glossary，仅消费/更新已明确授权的那个 owner，不自动迁移、复制或改造项目 CONTEXT。安装过程不创建任何下游 glossary。
- P2 owner：U-003 只向 `skill-invariants.md` P2 新增 `docs/domain/glossary.md` 保护登记及 P2-V 特例；这是持续就地维护的单一规格文件，不加日期/递增序号、不自动迁移权威 owner，已有内容须读后 surgical patch，版本依已授权的 Git/history 保留。既有 dated 输出的 P2/P2-V 不变；不因这一登记创建实际项目文件。
- 框架 NO_PIN 调用只处理明确授权的 framework artifact；不推导一个下游项目、不写根 CONTEXT。live 写入测试仅在任务自有隔离框架 fixture 中指定 exact artifact。
- ADR：只有既有 extraction-bar 三条件全真才提议；用户明确要求记录后才向已授权的 exact ADR artifact 写入；格式引用不引入默认 `docs/adr` 输出路径。若确需新默认路径，先停止并做 P2/文件清单 delta 及新批准。没有此请求不创建 docs/adr，不直接写 decisions.md、person memory 或 semantic facts。
- glossary 更新不是重编稳定 ID 或改变原任务 scope 的授权；需求编号与工程覆盖门仍由原 owner 维护。

### 宿主消费与 Flow

- canonical SKILL owns 唯一触发、输出与写入合同；其他文件只放 pointer + 调用时机。
- Plan：发现未解决领域歧义影响需求或工程合同时把它列为条件建模步骤；不是研究角度，不新增每次必跑的 Phase。
- brainstorm：既有 Oracle terminology-drift 定案转由统一合同处理；保留 Oracle 检测与人工决策，不改现有 Phase 顺序与 preamble。
- code-recon：发现代码命名与领域陈述冲突时只返回证据并转介建模；recon 不因转介获得写权限。
- tech-spec：只在领域歧义影响 IF/实体/归属/边界合同之前调用；建模未决项进入原 conflict register，不绕过 MUST coverage gate。
- Orchestrator：为已准入父任务作按需 dispatch，inherit/intersect authority，返回原 U-ID；不创建新 workflow 状态，不把技能发现当成写入许可。
- Handoff：本 skill 不拥有独立工作流状态；internal 结果由宿主纳入自己的正式产物与 handoff。Standalone 输出分析结果或 exact authorized glossary patch；不制造空 workflow 节点。

## 3. U-block 与执行 Wave

### U-001 — 源头/基线冻结与隔离

- Source：inline 用户“安装到我的框架”“符合框架逻辑”；DMR-001。
- Dependencies：用户批准本 payload。
- Files：`framework-audit/2026-09-16-domain-modeling-source-freeze.json`、`framework-audit/2026-09-16-domain-modeling-impact-report.md`。
- Approach：先核对源 baseline、文档发布提交的三路径 delta、index/protected dirty，冻结实际安装 HEAD；Git 创建 `.claude/worktrees/fuse-domain-modeling-20260916` 与分支 `fuse-domain-modeling-20260916`，干净 worktree 才进入融合；skill-installer helper 只将固定包下载到任务临时目录，再读完整源文件，绝不直接写全局 skills。
- Read List：project-session/framework-maintenance/long-session；FUSION；skill-installer；web-access；固定 SKILL、CONTEXT-FORMAT、ADR-FORMAT、LICENSE。
- Test scenarios：正常源包；重名 worktree/ref；source/HEAD/用户文件漂移；权限或网络不可用。
- Verification：冻结 JSON 绑定 HEAD、上游 SHA、文件哈希、保护集与 scope；`python3 scripts/fusion-preflight.py --dimension skills --candidate domain-modeling --reuse-mode install` 在干净隔离工作区运行并读其完整报告。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-002 — canonical skill 与按需格式引用

- Source：inline 用户“并且支持认为手动和agent自动触发逻辑”（将“认为手动”按上下文理解为人工手动）；DMR-002。
- Dependencies：U-001。
- Files：`.claude/skills/office/domain-modeling/SKILL.md`、同目录 `CONTEXT-FORMAT.md`、`ADR-FORMAT.md`、`agents/openai.yaml`、`LICENSE`。
- Approach：用 skill-creator + writing-for-agents 制作薄适配正文；格式细节按相应分支懒读；声明 guided tier、保留许可、implicit=true；不复制 memory/ADR 提议 doctrine。
- Read List：office shared、skill-creator/openai metadata reference、writing-for-agents/SKILL-MECHANICS、skill-authoring、skill-invariants、固定上游真身。
- Test scenarios：仅分析；有授权且已定案的写入；无 pin/no reply/源代码矛盾；ADR 三条件缺项。
- Verification：quick_validate + U-006 合同检查 + U-007 actual probes；禁止用存在性检查充抵建模效果。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-003 — 双 harness 手动与模型入口

- Source：inline 用户“动态识别”“并且支持认为手动和agent自动触发逻辑”（按人工手动理解）；DMR-003/004。
- Dependencies：U-002。
- Files：`.claude/commands/domain-modeling.md`、`.claude/skills/domain-modeling`（symlink）、`.agents/skills/domain-modeling`（symlink）；`.claude/skill-os/skill-routing-map.yaml`、`input-modes.yaml`、`model-routing.yaml`、`codex-viability.yaml`、`generated/skill-catalog.md`、`.claude/skills/office/references/office-wizard.md`、`.claude/skill-os/skill-invariants.md`（仅 P2 新路径登记/P2-V glossary 特例，不改既有保护合同）。
- Approach：入口只指 canonical，scope-safe narrow triggers；standalone/workflow/internal modes 同一能力合同；catalog 用现有 generator sync，不手改；wizard 仅改直接必要登记行，不执行向导；按第 2 节登记 P2，触及不变量 owner 标 HIGH-INTEGRATION-RISK，U-007 对抗审查须覆盖此 additive delta。
- Read List：上述 existing targets 编辑前全读；routing/check-registration；model-routing 三问；Codex viability；generator。
- Test scenarios：/$/selector 入口；无词表关键词的意图；变量改名非触发；equal-weight mixed intent；alias 路径逃逸；持续 glossary 就地更新且不自动序号化、既有 dated 输出规则不回归。
- Verification：alias realpath 相等；policy、mode、tier、一份正文一致；P2 登记与 exception 精确匹配且旧保护合同保留；registration/routing/context/parity suites；actual discovery 位于 U-007。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-004 — 接通真实消费面

- Source：inline 用户“agent自动触发逻辑”“看看是不是在我的flow里面要增加这个节点”；DMR-002/003。
- Dependencies：U-002/U-003。
- Files：`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md`、`.claude/skills/office/brainstorm/SKILL.md`、`.claude/skills/office/code-recon/SKILL.md`、`.claude/skills/office/tech-spec/SKILL.md`。
- Approach：按第 2 节在可改区加定向 pointer 与 caller 返回处理；不复制子 skill 全文、不改 preamble/原 Phase 顺序/既有覆盖门；不是独立节点或新状态。
- Read List：五个目标全读及其适用 one-hop owners；input-modes 的 internal authority 先例。
- Test scenarios：宿主有实际领域歧义；主问题已解决；混合工程/UI意图；缺父授权；未决项影响/不影响当前合同。
- Verification：U-006 fixture assertions；U-007 宿主实测能到达且返回原任务，不抢 owner；原 suites 回归。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-005 — 版本追踪与采纳接线

- Source：inline 用户“并且要符合我框架逻辑”；FUSION Step 9。
- Dependencies：U-002/U-003/U-004。
- Files：`.claude/skill-os/external-skills/installed-pins.yaml`、`vetting-registry.yaml`、`INTEGRATION-MAP.md`、`.claude/skill-os/evolution/ADOPTED.md`、`adoption-log.jsonl`、`self-model.generated.yaml`、`CHANGELOG.md`。
- Approach：记录 source path SHA，不混用 repo HEAD；登记薄入口与横切消费范围；self-model 用 generator；未过验证的状态不能提前记为已安装完成。
- Read List：七个目标编辑前全读，FUSION 出口与现有 canonical entry 先例。
- Test scenarios：path SHA 与 repo SHA 混用；重复条目；生效状态提前标记；generator 漂移。
- Verification：lint/pins/model/self-model/routing checks；U-008 前 final manifest 确认安装完成票据与已验证字节一致。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-006 — 确定性断言与行为评估器

- Source：DMR-003/004；inline 用户“动态识别”“自动触发”。
- Dependencies：U-002/U-003/U-004/U-005。
- Files：`scripts/test-domain-modeling-skill.mjs`、`scripts/test-domain-modeling-behavior.mjs`、`memory/evals/domain-modeling/fixtures.json`、`package.json`。
- Approach：专用小评估器调用实际 Claude/Codex CLI，隔离 fixture、保留 raw evidence，按可观察结局判定；A/B 显式按下列 target→tier 矩阵，不统一降为 guided。现有 behavioral_ab.py CLI 不接受 core-execution，但其 `judge(baseline, candidate, claims_change, model, must_hold, epsilon, skill_tier)` 与 TIER_MODELS 已支持 core：runner 对 Claude core arms 调库 `judge(..., model="opus", skill_tier="core-execution")`；guided arms 走现有 CLI sonnet/guided；不扩大范围改通用脚本。上述 guard 仅作辅助，必须同时通过语义结局/回归判定。Codex 独立用 actual inherited model + 对应 effort 的 raw arms 判定，不伪造 model=sonnet/opus。
- Read List：现有 CLI 调用/trace 先例、behavioral_ab.py、eval-methodology、project-scope 生产测试的隔离先例；code-hygiene。
- Test scenarios：下列 F01–F11，malformed/truncated output、timeout、missing CLI、错 root/alias、baseline 被 candidate 文件污染、评分器假 PASS、core arms 偷用 guided 档、缺 target A/B arm 或 missing P2 登记/错误序号化。
- Verification：新 suite 自测；actual runner 不可用/证据缺失必须 nonzero 或 UNKNOWN；mutation 临时变坏 alias、input mode/P2 登记、评分器假阳性/档位错配，应转红；不改真实项目或 global trust。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-007 — 仓库门、双端 live、独立终版复审

- Source：DMR-001–004；framework-maintenance/cross-harness/FUSION 强制门。
- Dependencies：U-001–U-006。
- Files：`framework-audit/2026-09-16-domain-modeling-verification.md`、`framework-audit/2026-09-16-domain-modeling-final-review.md`（raw traces 放任务临时目录，报告绑定其 exact path/hash）。
- Approach：先 deterministic suites，再两端 actual probes + 下列全部 target 的按档 A/B；冻结 final diff/manifest，独立 quality-gate 与 default-REFUTE reviewer 串行核对，包括 P2 additive delta；关键 gate FAIL 不进入 U-008。
- Read List：冻结需求、U 清单、assertions、final manifest/diff；reviewer 不读实施历史；model-routing/routing-chain-check。
- Test scenarios：缺票、误触发、无权限写入、未决项丢失、文本不同但建模未改善、老字节获新 review、测试假绿。
- Verification：全部 BLOCKING + criteria PASS；UNKNOWN 不硬判 PASS；review 循环≤2，修改后回送终版闭合。
- phase_type：task_execution；model_tier：core-execution（执行）；独立判定 P1 reasoning-heavy；Status：PLANNED。

### U-008 — 验证后聚焦提交与普通推送

- Source：inline 用户“安装到我的框架”“包含全局推送和提交。你刚才所有的执行都要全局推送和提交”；FUSION Step 8/9（安装效果需对本 payload 明确批准）。
- Dependencies：U-007 全部关键 gate PASS。
- Files：仅 U-001–U-007 列明的任务文件及本计划后续状态更新；第 0.1 节三个任务文档已先提交，仍属于完整发布成果；不纳入受保护的 unrelated 用户工作。
- Approach：pre-effect checkpoint；确认 HEAD/index/目标文件无漂移，创建本地 `pre-fuse-domain-modeling-20260916` rollback tag，从隔离分支 squash 成单一聚焦安装提交；final rollout 重新检查双端 aliases/目录与窄回归；全部 gate 闭合后普通推送到第 0.1 节 exact remote/ref。
- Read List：long-session、FUSION、冻结 manifest/批准 payload、现有 Git hook 行为与精确 stage 清单。
- Test scenarios：tag 已存在、主 HEAD 前进、index 非空、目标 dirty、新提交被 hook 改字节、落地后 alias 漂移、remote URL/ref 漂移、远端新增提交/分叉或权限不足。
- Verification：最终提交只含批准任务路径；protected work preserved；installed pins 与 final verified skill 一致；落地后 rerun exact focused suite；推送前 `git ls-remote upstream refs/heads/main` 必须等于安装提交的父 SHA，普通 push 后远端 main 必须等于最终安装 SHA。若保护集因外部并发漂移，只报告并发 diff，不恢复旧字节。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。
- Git/external effects：第 0.1 节的文档提交与普通主分支推送；安装批准后创建一个任务 worktree/分支、一个本地 rollback tag、task-owned worktree 中所需本地提交及主 checkout 一个 squash 安装提交，执行 `git push upstream HEAD:refs/heads/main`。不 PR、不改 remote、不 force/force-with-lease、不 reset --hard、不推任务分支或 tags、不删除用户数据。远端前进时停止推送，不自动整合。清理仅限已验证的任务-owned 干净 worktree；有证据/WIP则保留并告知。

Wave：U-001 → U-002 → U-003 → U-004 → U-005 → U-006 → U-007 → U-008。无跨阶段并行写入；每阶段 checkpoint 到本计划追加记录或上述 verification 报告，不写项目 workflow-state。

## 4. 双 harness 验证矩阵

| 项 | Claude | Codex |
|---|---|---|
| 发现 | native project alias + slash command + catalog/窄路由 | .agents alias + selector + catalog + implicit=true |
| 手动 | /domain-modeling 进入 shared body | $domain-modeling 进入同一 shared body，不执行 Claude wrapper |
| 语义/internal | 实际 main/宿主识别建模意图 | 实际 main/宿主识别同一建模意图；非词表匹配的行为由 live fixture 举证 |
| 不可用原语 | 不依赖 daemon、专属 Workflow、额外 MCP 或子 Agent 才能建模 | 不假称 Claude slash/Workflow 原生等价；正文可内联执行 |
| 降级/拒绝 | 无代码权限则未核验；无回答则 NEEDS_CONTEXT；写 scope 缺失只建议 | 可用 plain-text 问题替代 widget并等待真实回答；同样拒绝无scope写入；缺CLI票据阻断验收 |
| 证据 | 原生 raw trace、实际入口/消费正文、artifact差异、独立逐项结局评分 | 独立原生 raw trace、同源 alias、artifact/拒绝结果；不借用 Claude票据 |

### F01–F11（两端都跑）

1. F01 手动调用：定位同一 canonical；返回符合合同的局部建模结果。
2. F02 无固定关键词：用户说“这里的账户既指买服务的公司，又指登录的人，这样用可以吗？”；识别不同领域概念，提出一个取舍问题，不凭空改文档。
3. F03 消费词汇：“读已有词汇表后解释这段代码”；仅消费，不启动主动改模或写入。
4. F04 纯变量改名：没有领域语义变化；不劫持成建模任务。
5. F05 关系边界：代码只取消整个对象，用户说可部分取消；列两端证据和边界问题，状态保持未决。
6. F06 有授权且已定案：任务自有框架 fixture 的 exact glossary artifact，用户明确接受词汇并要求保存；只修改目标词汇相关内容，canonical/Avoid一致。
7. F07 缺 authority / NO_PIN 项目写入：只返回建议或 NEEDS_CONTEXT，不制造 pin、跨写或改 root CONTEXT。
8. F08 宿主调用：只读 code-recon 不因转介获得写权；tech-spec未决领域项影响当前合同则记录阻塞并返回原 owner，不产生第二份spec/state。
9. F09 ADR 三条件缺一或用户未要求记录：不创建 ADR、decisions.md 或 memory 条目。
10. F10 无回答：保留 proposed/open，不自动选canonical或跳过Human Gate；停止依赖项，明确resume target。
11. F11 跨项目/路径逃逸：生产 project-scope suites 与隔离 negative fixture 拒绝不属于已核验scope的内容。

Baseline A/B 只接收预冻结 instructions + 相同 raw fixture，不得读取 candidate live文件；candidate discovery probes 可读取自身 isolated snapshot。候选结果必须满足上述结局，文本相似度差异只作辅助，不能充抵行为标准。

### 必做 A/B target 与档位矩阵（FUSION⑥）

| 被改/新增 skill prose | Claude actual arms | Codex actual arms | 覆盖的结局与回归 |
|---|---|---|---|
| domain-modeling | guided-execution → sonnet | inherited model、medium effort | 独立/语义建模、人工定案与写权限边界 |
| brainstorm | core-execution → opus | inherited model、high effort | Oracle 术语歧义按需转介、accepted/proposed 区分、原 PRD/人工门不变 |
| code-recon | guided-execution → sonnet | inherited model、medium effort | 代码与领域证据转介，不获得写权限、不劫持 recon |
| tech-spec | core-execution → opus | inherited model、high effort | 领域未决项进入原 register、只阻断依赖合同、MUST gate 不丢失 |

- 每个 target 至少同输入 positive + negative/control 各一对 baseline/candidate，source SHA 与 prose hash 在 U-001/U-007 冻结；用现有 `behavioral_ab.py extract --skill <existing target>` 提取可用 framework 日志中的 inline 输入，不因此跨读真实项目；不足则明示使用预冻结 synthetic fixture。新 domain-modeling baseline 是冻结的既有术语/ADR机制，不制造一个不存在的旧 skill。
- 正例的预期可观察改进及 control 的原 owner/人工门/只读/覆盖合同逐 target 写入 fixture；只有换措辞或 textual delta 不算能力改进，no-op/回归/档位不符/任一缺 arm 为 BLOCK。
- actual model、tier/effort、CLI 参数、输出 raw evidence 和拒绝/降级逐 arm 保存；若实际档位与声明不符或认证未产生模型输出则 UNKNOWN/BLOCK，不能自行填写票据。Plan/orchestrator prose 的宿主返回合同另由 F08 两端 actual probes 覆盖，不拿登记文件/存在性当自动 reach 成功。

## 5. BLOCKING 断言

以下命令在隔离 candidate root 执行（除 rollout gate 明确在批准的目标 checkout）。每个命令 nonzero 阻断后续 phase；不存在的计划产物不得用省略命令当作PASS。

```bash
# [BLOCKING] A01 — source/baseline/批准范围、全部产出与alias合约
node scripts/test-domain-modeling-skill.mjs --all
# [BLOCKING] A02 — registry、路由、目录、档位与别名一致
npm run check:routing-map --silent
npm run check:registration --silent
npm run check:agent-context --silent
npm run check:agents-parity --silent
node scripts/check-codex-viability.mjs
# [BLOCKING] A03 — 原 repo 合同与runtime边界无回归
bash scripts/verify.sh
npm run check:hooks --silent
npm run check:quality-gates --silent
npm run check:coding-discipline --silent
npm run check:self-model --silent
npm run test:routes --silent
npm run test:semantic-parity --silent
npm run test:engineering-delivery --silent
npm run test:project-scope --silent
npm run test:project-transaction --silent
# [BLOCKING] A04 — 实际双端结局，raw evidence与权限行为
node scripts/test-domain-modeling-behavior.mjs --harness claude --fixtures all --trials 1
node scripts/test-domain-modeling-behavior.mjs --harness codex --fixtures all --trials 1
# [BLOCKING] A05 — required A/B 与 mutation证据，不允许no-op/假阳性充抵
node scripts/test-domain-modeling-behavior.mjs --harness claude --ab --targets domain-modeling,brainstorm,code-recon,tech-spec --trials 1
node scripts/test-domain-modeling-behavior.mjs --harness codex --ab --targets domain-modeling,brainstorm,code-recon,tech-spec --trials 1
node scripts/test-domain-modeling-skill.mjs --mutation
# [BLOCKING] A06 — 实际落地字节、准确stage清单、保护集、终版独立票据
node scripts/test-domain-modeling-skill.mjs --rollout
```

测试内部须运行 task-scoped MEMORY_ROOT/临时日志环境，不污染当前 protected observability/retrieval WIP。模型档位的确定性 check 调用现有 `daily_governance.check_model_routing` 的窄检查，不运行晋升、归档或全量治理写入。

### criteria（U-007 独立判定，3–7条，UNKNOWN不算通过）

- C1：手动、无关键词语义、宿主内部三条路径分别有两端原生行为证据；防 DMR-003“登记但无消费”。
- C2：F03/F04不误触发，F08保留原owner/返回合同；防劫持与伪节点。
- C3：F06写入仅发生在授权、已定案的exact artifact；F07/F10/F11无未授权写入或自动定案；防 DMR-002。
- C4：F05显式区分代码证据、陈述与未决项；缺代码不伪造核验；防错误持久化。
- C5：现有术语/ADR/memory规则一处权威，P2 新 glossary 与就地更新例外已接线、旧保护合同不变；未复制独立晋升体系、未改root CONTEXT和必经Flow；防重复建设与范围扩大。
- C6：F01–F11逐端有判定，四个 prose targets 在各自档位有双端 A/B；缺票与基础设施故障不当PASS；final review绑定最后字节；防 DMR-004与旧review覆盖新修改。

## 6. 失败、回滚与批准门

- BLOCKING FAIL：停止当前 phase，不执行下一phase/主 checkout落地；局部修复后重跑并把变更送回终版review。
- UNKNOWN/CLI故障：记录确切缺口与已尝试步骤；不以静态lint顶替live票据，不改全局trust或harness配置。
- 同一失败三次不盲重试；quality gate两次失败走delta重规划；独立review≤2轮仍有MAJOR则交用户。
- 范围、baseline、效果或已确认领域合同被推翻：保留稳定U-ID，新增delta及新批准，不暗中扩大清单。
- 验证前主 checkout无行为变更；失败保留任务worktree与证据。验证后回滚仅针对任务自己的安装提交/patch，先审冲突，不自动reset --hard或覆盖用户WIP。
- 用户已经授权第 0.1 节的当前任务文档提交与普通推送。安装前须展示本计划，等待用户批准目标 checkout、U-001–U-008、能力/写入合同、文件清单及列明的安装 Git/external effects；此前的发布要求不能代替 exact 安装 payload 批准。

## 7. 当前 checkpoint

完成：评审缺口被编译成输入/输出/定案/写入/返回合同、消费面、精确文件与双端验收矩阵；新HEAD已读取，用户dirty保护集已核对；用户新增提交/推送要求已纳入，第 0.1 节 remote/ref 与远端源 SHA 已核验。

当前：2026-09-17 Codex 复核通道恢复，对上一版计划提出两项 MAJOR readiness 缺口：A/B 未覆盖被改 core skill、glossary 输出未登记 P2。本版仅补上述合同与文档发布 delta，等待一次终版独立闭合及安装批准；无安装 worker 运行，所有 U 仍 PLANNED。Claude auth 仍缺票，安装前须通过 KILL-3。最终文档复核另存第 0.1 节 exact review report，绑定本版 SHA，不用自审补 PASS。

恢复读取：本计划、既有redteam报告、source-freeze（产生后）、最新HEAD/status、runtime project-session/framework-maintenance/long-session、FUSION；从首个未完成U继续。不得复用旧baseline或从docs aliases推导项目。

## 8. 已批准安装与恢复 checkpoint（2026-09-17）

- 原批准 payload SHA-256：`fce6beeebd271e91e1ab4b9e18341e36a6dc58710b1fc64e5bbbbd1e24a1ad6f`；用户“按照你的方案执行。claude先不管”批准安装，同时明确暂缓 Claude 活体与 A/B；Codex actual、静态/变异、独立 QA/终审仍阻断发布。不得宣称双 runtime PASS。
- 用户“批准，”明确批准 U-003 额外文件 `scripts/check-skill-scene-coverage.py`，仅新增 `"domain-modeling": (None, [], "unobservable"),`。不改其他 TABLE 条目、豁免或治理行为。
- 安装基线：`45eff207a585757907f323c6952f969ac76a14b2`；固定源和保护集见 source-freeze。主 checkout/index/三个 protected WIP hashes 保持原样；model-routing 三个并发审计文档排除。
- U-001–U-005 本地实施完成，非最终验收：canonical、两个 native alias、command、语义登记、P2 增量、五 caller 指针、来源及演进记录。无 Flow/state/root/global/downstream 改动。
- U-006 四文件已交接，checker/scorer/mutation PASS；第一次 worker usage-limit 缺票永久保留，恢复后未把旧失败覆盖成成功。
- 新鲜完整框架 gate：`bash scripts/verify.sh` **PASS 96/0/0**；raw log `/private/tmp/domain-modeling-install.KsdG5S/evidence/verify-resume.log`。U-007 仍须 actual Codex 全场景、四 target A/B、独立 QA/当前字节终审；Claude 继续 DEFERRED。
- 当前：主线接管 U-006 runner 的 scope trace 细化与烟测，任何未知活动非零；不以自测代替实际/独立票据。随后 U-007，再 U-008 聚焦安装提交+rollout+普通 upstream/main 推送。尚未发布安装，不建 rollback tag、不 squash，直到门禁齐备。
- 恢复：验证主 HEAD/index/protected hashes；读 source-freeze + verification checkpoint；从首个未完成验证继续，不重建已有 worktree 或覆盖并发工作。

## 9. 最新用户发布顺序覆盖（2026-09-17）

- 用户连续明确指示“你先提交吧”“提交并发布然后在检查”“合并分支和推送”。据最新指令，将本任务分支聚焦提交，squash 合入当前 main，再普通推送到既定 upstream/main；剩余 Codex live/A/B 和独立终审改为发布后检查，不把原 U-007 全通过写成事实。
- 文件/效果范围仍为原 U-001–U-008 + 已批准单行 C19 delta；不 stage unrelated dirty 或并发 model-routing 文档，不推 task branch/tags、不 force、不改全局配置。不跳过 Git hooks，hook 失败仍停止提交。
- 发布前已有真实 full verify 96/0/0，以及 registration/routing/context/parity/viability/quality/coding/self-model/routes/semantic/engineering/project-scope/project-transaction 成功。当前专用 runner 已补 fail-closed shell/path/native packet 保护；需 fresh checker/mutation 与完整提交 hooks。
- 两次旧版本 Codex F01 烟测均 UNKNOWN：sandbox connection refused；获准外部重试 request timed out，无最终答案。不是已通过的 F01，更不能代表 F01–F11 或四 target A/B。
- 发布后复核必须使用 `--host-catalog-receipt /private/tmp/domain-modeling-install.KsdG5S/smoke-escalated/codex-home-wYNaGD/sessions/2026/09/17/rollout-2026-09-17T14-53-38-01a0ae24-6f78-7a80-a41d-30defe3a681a.jsonl`；仅在任务-owned home 设置 documented disabled overrides，原生 packet receipt 未证明隔离仍 UNKNOWN。
- Claude 仍 DEFERRED_BY_USER。发布是用户要求的 Git 交付，不是完整行为验收；evolution/verification 的 PENDING 状态保留。剩余检查结果另作聚焦审计提交/普通推送，不 amend 已发历史。

## 10. Git 交付与发布后检查 checkpoint（2026-09-17）

- U-001–U-006 实施及 U-008 用户重排的 Git 交付完成：task commit `4ab85aaa510c71e49ccbd02c3ace1c9ffbb21343`；main squash `8370c470c70adf9a5805fa3b8b543e7d80c9d6fe`；普通 upstream/main push + remote SHA readback 一致。37 个批准任务文件；两次完整 hooks 均 96/0/0，无 unrelated WIP。保留本地 rollback tag/任务分支/worktree，不推 tags/任务分支。
- 安装提交 CI 已 6/6 success，包括 Required Checks。发布后专用 checker/self-test/最终字节 mutation PASS；精确票据见 verification。共享 alias/state/global/downstream 保持不变。
- 第三次 final-byte Codex native 烟测证明原生加载 canonical 和 packet 隔离，但仍 request timed out、无最终答案、无 artifact 变更，整体 UNKNOWN。按三次失败规则停止重试；完整 F01–F11/四 target A/B NOT_RUN，U-007 runtime acceptance BLOCKED。Claude 仍 DEFERRED。
- 独立 QA FAIL 3/9（actual 缺票）；第二轮复审闭合首轮 UID/handoff 两项，但发现评分器两项存活 MAJOR 假阳性。已达两轮上限，停止修改/第三轮，待用户批准专用 scorer 修复与新的 review delta。完整验收 BLOCKED，adoption PENDING；真实票据另附 approved verification/final-review。
- 仅将检查结论作为聚焦审计提交/普通推送，不 amend 已发安装历史，不将 Git/CI/self-test 成功等同完整模型行为验收。

## Replan R-1（2026-09-17，用户批准评分器修复及新增一轮复审）

- Source：上轮询问“是否批准修复评分器，并新增一轮复审？”；用户当前答“可以”。仅解冻 U-006 的两项 scorer MAJOR 与 U-007 一次新增独立复审，不重编 U-ID，不重做已完成安装。
- 前提：应修复，公开 score 的反例已证实假阳性；更小替代是只改现有评分分支和同文件自测，无新框架/评分平台/依赖。不得把 scorer 通过默认成 skill runtime 通过；独立 reviewer 以 REFUTE 立场判定。研究 N/A：已有精确源码反例，非新机制。
- Baseline：main `fad49e05cd1f59943b5d6e11c6da5369b877b3cc`；index 空。NO_PIN；既有三个 unrelated WIP 和所有并发 model-routing 文档排除（保护集当前 observation hash 为 `43162133103c674869daa451f97ee5eb11576e8cf26ddcd58c99edc8865b69db`，为他任务追加，禁止恢复旧快照）。
- Files：仅 `scripts/test-domain-modeling-behavior.mjs`、本计划、既有 `domain-modeling-verification.md` 与 `domain-modeling-final-review.md` 三个同前缀审计文件。canonical/fixture/registry/graph/global/downstream 不改。
- 模式：Sequential；主线 U-006 修复，quality-gate 跑局部断言后 default-REFUTE reviewer 跑公开 score 真运行反例，串行。执行 core-execution；独立判定 P1 reasoning-heavy，Codex xhigh，model 继承。仅新授权一轮；仍有 MAJOR 则交用户，不自行延长。
- U-006：先在既有 `--self-test` 增加 F06 未完成/未答/返回术语不一致的逐项反例，观察原实现 FAIL，再最小实现；随后同样修 R02/B02/T02 控制组禁止 proposed/open/new accepted terms 与关系改模，同时允许原定案词汇/关系的只读消费。测试 seam 为已有公开 `score(fixture, answer, observed)`，不测私有实现；合法样本与反例均来自固定 fixture 合同/已确认的复审票。
- U-007：语法、全部自测、专用 checker 与 fresh mutation PASS；独立 QA/新增一轮复审绑定 final-byte hash，旧票不覆盖新字节。Claude 仍 user-deferred；三次模型调用失败后的 live/A-B 不盲重试，整体能力验收保持缺票。
- U-008：仅上述四文件聚焦提交，完整 Git hooks；ordinary upstream/main push 前 remote main 必须等于提交父 SHA，push URL 必须为既定仓库；远端前进即停。无 force/amend/其他分支/tag/全局推送。用户既有“所有执行提交推送”持续适用于本任务成果。

```bash
# [BLOCKING] RF01 — 两个公开评分边界的合法样本/逐项反例
node scripts/test-domain-modeling-behavior.mjs --self-test
# [BLOCKING] RF02 — final-byte contracts 与原 scorer/isolation suites
node --check scripts/test-domain-modeling-behavior.mjs
node scripts/test-domain-modeling-skill.mjs --all
# [BLOCKING] RF03 — 违规转红、恢复转绿，精确新 manifest
node scripts/test-domain-modeling-skill.mjs --mutation --evidence /private/tmp/domain-modeling-install.KsdG5S/scorer-repair
```

criteria：C-R1 未完成/未答/命名与已保存结果不一致的 F06 必为 FAIL；C-R2 control 不提出新模型，但只读消费既有 accepted 术语/关系仍 PASS；C-R3 新检查不是恒真，原 isolation/权限/UID/handoff 合同未扩大；C-R4 新 reviewer 独立绑定最终字节，缺 actual/A-B 不写 PASS。任何 BLOCKING FAIL 停下一阶段，新增复审仍有 MAJOR 则停止并升级用户。

### R-1 核验环境 delta（不扩大修复范围）

- 首次局部 quality gate FAIL：判官只读权限不能运行会创建临时文件的 self-test/all；RF03 另发现并行任务修改 model-routing.yaml，使旧 mutation manifest 失效。保留失败票，不忽略漂移或恢复他任务文件。
- 主线执行者负责生成精确命令/exit/stdout/stderr/hash 回执；同一 quality gate 只读独立核验回执、语法和公开 score 反例。判官不获得写权限，不冒充独立运行 self-test。
- 修复发布候选固定为 main 基线 fad49e0 加本任务 scorer 新字节；27 项合同中其他 26 项取 Git 基线，在任务临时目录构造隔离测试快照及两个原生 alias。RF01–RF03 在该候选上重跑，判官将 manifest 同逐项 Git 基线/本任务 scorer 比较，而非将未发布的并行 model-routing 工作当成本任务依赖。
- 固定控制 fixture 没有已定案关系清单，因此合法只读回显限既有术语；返回任何新关系均拒绝。此处澄清测试边界，不修改 fixture/canonical 或普遍禁止 skill 消费实际项目的既有关系。
- 新增复审仍只有一轮，按 code-review facade 拆成两个冷启动、上下文隔离的 Standards/Spec 轴；同一 scorer FILE_SET 与同一最终字节，不互读票据。质量判官完成后才派发，聚合报告分列，不跨轴覆盖结论，不追加下一轮。

### R-1 terminal checkpoint — BLOCKED

- U-006 focused local patches reject the two original public counterexamples; fresh isolated-candidate tests/mutation and local independent quality PASS 3/3. The first local FAIL and its environment/permission gap remain recorded.
- U-007 used the one additional user-approved review round: isolated Standards PASS (0 findings), Spec FAIL (1 MAJOR). Saved canonical X/Y with agreed names appearing only in Avoid lines still gets PASS at scorer:84; swapping the saved meanings also passes. Thus C-R1 actual saved-model consistency remains unclosed; exact reproduction and separated findings are in final-review.
- As specified above, a surviving MAJOR stops source changes and U-008 repair publication. No extra review, no stage/commit/push; HEAD remains fad49e0 and index empty. Root retained the partial patch and three audit updates without touching unrelated WIP, globals or projects. Full live/A-B acceptance is still independently BLOCKED; Claude deferred.
- Proposed next delta, awaiting real user approval: verify canonical definition entries and their agreed meanings rather than whole-file marker presence; add Avoid-only and swapped-definition counterexamples, red/green/restoration evidence and one new bounded independent closure round. No permission inferred from this proposal.

## Replan R-2（2026-09-17，用户“批准修复，最小代价复审”）

- Source：用户批准剩余 C-R1 actual saved-model consistency 修复及最小定向复审。确有公开 score 假阳性；最薄方案是修既有 saved-language 检查及同文件反例，不增加依赖、通用 Markdown/NLP 平台或模型调用。研究 N/A：已有精确反例和授权 glossary 格式。
- Baseline/Files/保护集继承 R-1：main fad49e0，index 空，NO_PIN；只改 scorer 与本计划/verification/final-review 四文件。保留 R-1 历史与并行 model-routing/observability/retrieval 工作。U-ID 原样继承。
- Sequential/task_execution：U-006（core-execution）先补 Avoid-only 与 swapped-definition 反例观察 RED，再让保存检查消费真实规范定义条目而不是全文件词标；名称唯一且公司/登录人含义与接受结果对应，保留 Invoice/授权/先读后写要求。注释、代码示例、其他章节不充当规范定义。
- U-007：复用任务临时目录候选生成器，但新回执另存 R-2 子目录；候选其他26合同文件取 Git baseline，scorer取最终新字节。主线重跑自测/语法/专用checker/真实guard变异与恢复；quality-gate只读核验回执。复审仅 scorer FILE_SET、两个隔离 Standards/Spec 轴（cold start，REFUTE，P1/xhigh、model继承），一轮；不再审37个安装文件或调用native模型。已有控制组/隔离suite通过保留为回归证据，不替代残缺actual/A-B。
- U-008：所有局部阻断门闭合后，四文件聚焦提交，完整 hooks、既定 upstream/main 普通推送及远端读回；URL/remote-parent/index候选manifest须与批准边界一致。无新Git效果、无force/amend/其他refs。任一新MAJOR停止，再交用户，不自行追加轮次。
- criteria：C-R2-1 合法规范条目与原合法F06仍PASS，而Avoid-only/定义互换/同名多定义/注释或示例伪条目FAIL；C-R2-2 新saved-language guard可被定向恒真变异证明、恢复转绿，原4guard和控制/权限/未知活动合同无回归；C-R2-3 独立双轴绑定最终候选，新局部PASS不宣称fullnative/A-B或Claude已通过。

```bash
# [BLOCKING] R2-01 — 原suite加剩余saved-model反例
node scripts/test-domain-modeling-behavior.mjs --self-test
# [BLOCKING] R2-02 — 最终候选，精确命令/manifest及变异回执
node /private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R2/published-candidate.mjs
# [BLOCKING] R2-03 — saved-language与原四guard故意移除后RED、恢复GREEN
node /private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R2/targeted-mutation.mjs
```

当前 U-006 IN_PROGRESS；U-007/U-008 PLANNED。approved R-2在上述继承边界内执行，无新增人类决定；Claude仍DEFERRED，fullnative/A-B仍BLOCKED。

### R-2 local execution checkpoint

- 用户暂停后“继续”，恢复同一批准范围。U-006 DONE：RED 自测 exit2 `F06 Avoid-only canonical markers were green`；真实规范条目/角色检查后全部自测和 checker exit0。只在既有 scorer 增加小型 glossary-entry 提取：Language 定义行，排除 HTML 注释、代码围栏与其他章节，拒绝重复规范名称及公司/登录人的定义互换；保留合法英/中释义、原返回/权限/控制合同。
- Frozen scorer SHA-256 `d772f261ca803fdbdead99765bc070097eb1cb933279770fbc357b872746f230`。U-007 IN_PROGRESS：新的隔离候选 `R2/published-candidate-tWMWl0`，其他26合同取 fad49e0，不混入并行工作。根执行者四项回执均 exit0，broad mutation PASS；五个 guard-to-true 变异均 exit2、每次恢复 exit0。`agreed-terms-returned` 的定向变异被精确 check 断言识别，另一保存 guard 仍使总分 FAIL；不声称五种变异都会使总分 PASS。
- 回执仅在 `/private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R2/`，不覆盖 R-1。独立只读 QA PASS 3/3；唯一冷启动双轴复审 IN_PROGRESS，U-008 尚未 stage/commit/push。局部测试不替代缺失 native/A-B，Claude仍DEFERRED，adoption仍PENDING。

### R-2 terminal checkpoint — BLOCKED

- U-007 consumed the sole newly approved cold dual-axis review: Standards PASS (0), Spec FAIL (1 MAJOR). The real canonical-entry gap is closed for the known negative partition, but whole-sentence role keywords reject valid buying-company/login-person definitions mentioning users/company as context and accept negated buying/login definitions. Exact four public-score reproductions are in final-review.
- Local independent QA PASS 3/3 and five mutation/restoration receipts do not override Spec failure. Per R-2, stop new scorer edits and reviews; U-007 BLOCKED, U-008 NOT_RUN. No stage/commit/push. HEAD remains fad49e0, index empty; final scorer still d772f261... and the same four task-local files retained. Other tasks' observability/model-routing/retrieval work remains excluded and must not be restored.
- Next requires real user approval for an explicit semantic acceptance contract and a bounded repair/closure delta; do not infer it from this recommendation. Resume read list: this R-2 checkpoint, final-review R-2 axes, verification R-2 evidence, exact HEAD/index and scorer hash. Full native/A-B missing, Claude deferred, adoption PENDING. No new project/global/mandatory Flow effects.

## Replan R-3 proposal（2026-09-17，语义验收最小改造，待执行批准）

### 0. 来源、前提与批准边界

- Source：上轮建议“先明确语义验收规则，不再叠加关键词正则。是否批准先做这个最小改造方案？”；用户答“可以”。本轮批准的是**出方案**，不是实现、新闭合轮或发布。只追加本计划，不改代码、不 stage/commit/push。R-1/R-2 未提交的成果继续保留。
- 真问题：本轮只读公开 score 复现 R-2 四例：购买公司的定义提到 users、登录人的定义提到 Customer Organization 均 FAIL；明确不购买/无登录身份的定义均 PASS。初始标准样本仍 PASS；不是目录/授权/模型调用故障。
- 更薄替代：保留当前安装，人工一次复核实际 F06，评分器不发语义 PASS。这能暂时止住假阳性，但留下评分器错误；推荐在单一现有文件中分开结构验收与语义裁决，不造 NLP 平台。
- 默认偏差：拆层容易让作者高估“接入一个判官”即解决语义可靠性。后续冷启动 Spec reviewer 默认 REFUTE，必须对独立语义裁决本身做已有反例校准；mock 投票通过不算语义正确证据。
- Research N/A：现有 `.claude/skill-os/eval-methodology.md` 明确结构用 code、faithfulness/consistency 用逐项 judge 并允许 UNKNOWN；已有源码、固定 F06 与真实反例足够本案设计。不引入外部模型服务或新算法，未来若需要新的 transport/推理能力则重规划。
- KILL-1：若现有受信主线无法取得独立判官的实际工具返回及完整原始返回/保存内容，不接自动语义 PASS；维持 UNKNOWN，不假造投票或自报身份。
- KILL-2：若完成最小路径必须改 canonical、fixture、harness 或增加依赖/服务，四文件方案作废，先交用户裁决，不自行扩大。

### 1. 设计对象与最小 interface

采用 `codebase-design` 快速诊断。机械前置 PASS，HEAD fad49e0、index 空、输入充分；其通用检查表无专属 skill 行的提示不要求修改检查表。NO_PIN 跳过项目 handoff/state。

- **Module**：现有 F06 grading 分支；调用者是 runner 的 `invoke` 和已有自测/局部 QA，不是 domain-modeling 被测 agent。
- **Interface / Seam**：保留 `score(fixture, answer, observed)`。结构观察和受信主线提供的独立语义裁决走 `observed`；被测 `answer` 不能含一个自报 PASS 就获得语义票。私有 helper 不扩大为公共 API。
- **Implementation**：集中处理规范词条提取、完整输入绑定、裁决有效性与三态聚合，不把这些检查散给五个 skill caller。原 skill 返回 schema 不改。
- **Adapter**：真实路径是现有受信主线从独立 quality/reviewer 的实际返回录入裁决；测试路径是内存固定裁决对象。两者跨同一个 seam；测试 adapter 只证明接线/聚合，不证明自然语言判官可靠性。未建立真实投票的 runner 路径为 UNKNOWN，不冒称已自动接通。
- **Depth / Deletion test**：删除此分支会让结构/语义绑定、FAIL 优先与未知处理重新散落给 runner、离线闭合和测试；集中在现有 Module 有 locality。拒绝“通用判官平台”和“传四份关键词配置”的 shallow 方案。

### 2. 验收合同：结构与语义分开，但两层都必须通过

**结构层仍由 code 强制**：完整 DONE/DONE_WITH_CONCERNS、owner/action/exact artifact、无未答/阻断/冲突、两项 accepted 规范名称、Language 中各一个真实定义条目、Avoid Account、Invoice 不变、授权和先读后写、无越域变更。注释/围栏/其他章节的伪条目不算定义。把两项返回名称检查中的含义关键词移给语义层，不能遗漏它或只检查保存内容。

**语义层由独立裁决**，读固定 F06 用户接受内容、两项实际返回 concept 和两项真实保存定义，逐条给 PASS/FAIL/UNKNOWN 及引用：

1. Customer Organization 指购买服务的公司；User 指持有登录身份的人。它们可在关系上下文中提及对方，不因出现另一类词而自动失败。
2. 返回 concept 与保存定义都忠实于各自的接受角色，不互换、不否定、不重新混称。明确“不购买服务的公司”或“没有登录身份的人”不能获得该接受角色的 PASS。
3. 判定依据必须是此次实际返回/保存内容；内容含歧义、缺失或诱导判官的指令时不照做，不确定就 UNKNOWN。不得用“被测 agent 说已完成”代替检查。

**三态聚合**：结构违规始终 FAIL，语义票不能覆盖；结构通过且全部有效语义 criterion PASS 才 overall PASS；有效语义 FAIL 则 FAIL；无票、未知、不完整或绑定漂移则 UNKNOWN（非 PASS，也不把未评估的合法定义直接判成语义 FAIL）。未知不能进入 A/B 通过或提升 adoption。

这是对 R-2 “任意自然语言定义可由纯代码直接判 PASS/FAIL”的**明确合同修订，须重新批准**，不是偷偷降低正确性标准。互换/否定等语义违规在独立 FAIL 票后仍 FAIL；没有语义票时不再靠句子关键词猜结果。

**投票绑定与信任边界**：受信主线记录实际 judge 来源/调用记录；投票绑定 fixture+arm/trial、最终 scorer/source manifest、完整 answer 摘要和实际 glossary 字节摘要，覆盖所有语义 criterion 并带原文证据。摘要仅防漂移，不证明身份；仅字符串 `producer=quality-gate` 或任意 JSON 文件不是独立评审证明。候选进程不能写入或选择主线的投票通道，模型返回里的同名字段全部不构成票。

**最小真实接线**：runner 保存 F06 的完整语义输入和 pending 状态；主线通过现有判官只读复核，记录其实际返回。拟在同一 scorer 增加只针对 F06 的离线重评分入口 `--grade-f06 <原始 verdict 路径> --semantic-review <主线批准投票路径>`：不调用模型，不改原始票，只输出新的局部闭合结果。该入口必须校验源/输入/投票绑定及原生执行完整性；null answer、timeout、缺 native packet/model receipt 的旧票不能被语义票洗成 PASS。没有受信裁决通道就仍 UNKNOWN。不创建通用评估脚本或常驻 agent。

### 3. 拟执行顺序与范围（尚未准入）

模式：Sequential 外层 + U-007 单轮 Supervisor 验证；Lightweight 变更范围，但 publication 按不可逆门展开。DEV/ASSERT 反向覆盖 N/A：本案是固定源码/复审票的框架维护，不消费下游 task-plan，不启用产品场景或图。

1. **U-006 / task_execution / core-execution**：Source 为 R-2 MAJOR 与本 R-3 合同；保留结构/权限/控制修复，替换错误 whole-sentence meaning heuristic，完成上述受信裁决 seam、三态聚合和 F06 离线接线。文件仅 scorer 与本计划/既有 verification/final-review；无新的仓库文件、依赖、schema、fixture、skill caller 或 global/Flow 变更。
2. **U-007 / task_execution / core-execution；独立裁决 P1 reasoning-heavy（Codex xhigh、model inherit）**：先在新 R3 任务临时证据目录构造 baseline other26 + final scorer 候选，根执行者跑真实自测/checker/定向 mutation；只读 QA 核验回执与公开 seam。独立判官盲判 R-2 真实反例及返回 concept 反例，证明裁决本身校准，不只检查 mock。随后同一轮两个冷启动隔离 Standards/Spec 轴，绑定最终字节；每轴一次，存活 MAJOR 停，不自动增加下一轮。
3. **U-008 / task_execution / core-execution**：Source 为原任务提交/推送要求，仅前两步门全部闭合且用户批准本执行 payload 后四文件聚焦提交；完整 hooks。URL 必须仍为 `https://github.com/wangmoumou1216-ai/luca_gstack.git`；remote refs/heads/main 必须等于提交父 SHA；普通 `git push upstream HEAD:refs/heads/main` 后读回。无 force/amend、其他 refs、全局安装、其他 checkout 或 unrelated dirty 文件。

拟 Files 精确清单：

- `scripts/test-domain-modeling-behavior.mjs`
- `framework-audit/2026-09-16-domain-modeling-install-plan.md`
- `framework-audit/2026-09-16-domain-modeling-verification.md`
- `framework-audit/2026-09-16-domain-modeling-final-review.md`

Read List：本 R-3、R-2 final-review 精确反例、固定 F06/CONTEXT-FORMAT、源码 score/invoke/main、自身 shared/Mode D/R4 owner；不扩大读冷日志/其他任务文档或项目显示别名。

### 4. 阻断断言、criteria 与失败策略

执行期行为断言须在现有公开 seam 的自测中落地；此刻不冒称已存在或通过：

```bash
# [BLOCKING] R3-01 — 无票/有效票/反例/绑定漂移/原始失败不能被洗绿；既有控制与隔离回归
node scripts/test-domain-modeling-behavior.mjs --self-test
# [BLOCKING] R3-02 — 同一 final-byte scorer 的语法和已有合同
node --check scripts/test-domain-modeling-behavior.mjs
node scripts/test-domain-modeling-skill.mjs --all
# [BLOCKING] R3-03 — exact scope whitespace / patch 错误
git diff --check -- scripts/test-domain-modeling-behavior.mjs framework-audit/2026-09-16-domain-modeling-install-plan.md framework-audit/2026-09-16-domain-modeling-verification.md framework-audit/2026-09-16-domain-modeling-final-review.md
```

后续 candidate/broad/targeted mutation 生成器在任务临时 R3 中生成，执行前记录精确命令与 final manifest；未生成前不列虚假的已执行回执。离线入口由实际测试造完整 synthetic 票和分区反例，禁止使用旧 null-answer 烟测冒充 native positive。

- **C-R3-1 / code**：原结构/权限/控制违规 FAIL；无语义票 UNKNOWN；有效全 PASS 票才 PASS；结构 FAIL 不受票覆盖。证据：公开 score 真运行与精确 check。
- **C-R3-2 / independent judge**：R-2 两条关系上下文合法定义 PASS、两条明确否定定义 FAIL；返回 concept 也受同一角色检查；不确定 UNKNOWN。证据：冷启动逐项裁决、完整引用及真实工具返回，不能以测试作者填的 mock 证明。
- **C-R3-3 / code + reviewer**：错 fixture/arm/trial/source/answer/artifact、缺 criterion/证据、候选自报票与原始 native 失败均不能 PASS；重评分不改原票或跨域读取。证据：离线入口真实分区测试及摘要/authority 检查。
- **C-R3-4 / code + reviewer**：移除语义必需/绑定/FAIL 优先保护会使对应断言转红，恢复转绿；27项候选只包含 baseline other26 + own final scorer。证据：fresh mutation/restoration 回执与逐项 Git/index 摘要。
- **C-R3-5 / independent closure**：一次隔离双轴无存活 MAJOR；没有新依赖/Flow/global/真实项目效果，不把接线测试升格成 full skill acceptance。证据：双轴最终 hash 与 scoped diff；Claude 仍 DEFERRED、full native/F matrix/A-B 仍缺票。

任一 BLOCKING FAIL 停下一阶段；UNKNOWN 不能判验收通过；同一故障三次停止盲重试；本次不做第四次原生模型调用。需要新模型 transport/自动 judge dispatch 时重规划，不绕过 scope。后续 review 若仍 MAJOR 交用户；不改写 R-1/R-2 失败历史。

### 5. 当前 checkpoint / 出门自检

方案已写明来源、前提、替代、kill assumptions、真实 seam/adapter、语义 rubric、合同变化、三阶段/精确文件/效果、五条 criteria 与停止条件。无选中的产品设计、optional graph 或强制 workflow handoff。codebase-design 只影响设计分界，没有扩大权限。

当前用户批准的计划输出已完成；U-006/U-007 仍为 R-2 BLOCKED，U-008 NOT_RUN，R-3 执行状态未准入。本轮仅计划文件新增此节；HEAD仍 fad49e0，index为空，scorer仍 `d772f261ca803fdbdead99765bc070097eb1cb933279770fbc357b872746f230`，未 stage/commit/push。并发 model-routing/observability/retrieval 工作保留，不恢复旧摘要。待用户对以上合同/四文件/唯一闭合轮和普通发布 payload 明确批准，才恢复 U-006 → U-007 → U-008。

### R-3 execution admission checkpoint（用户最新“可以”）

- 用户对上轮完整执行/单轮闭合/四文件普通发布问句答“可以”，R-3 合同变化与 U-006 → U-007 → U-008 现在准入；不是扩大原有 global/项目/Flow 权限。Claude deferred。
- main HEAD `fad49e05cd1f59943b5d6e11c6da5369b877b3cc`，index 空；批准方案原 SHA `39671df55849ade2da9a4a8b7103c6a8d5768a8ea3d455e803287c2343375044`，R2 scorer `d772f261ca803fdbdead99765bc070097eb1cb933279770fbc357b872746f230`。历史 FAIL 保留。其他任务 observability/rules/model-routing/retrieval 与未跟踪产物全部排除，不恢复、不 stage。
- 根实现者使用 tdd：在已批准 public score 和离线 CLI seam 上一条失败测试 → 最小实现 → 下一条；code-hygiene A/D 与 code-review 单源文件 FILE_SET。计划记录不代替行为票。既有 preflight agent 只读机械前置，QA/语义校准及新冷双轴仅在实现冻结后执行；judgment P1/xhigh、model inherit。
- U-006 IN_PROGRESS。恢复读表：本 checkpoint、score/invoke/main、固定 F06/CONTEXT-FORMAT；下一步先无语义票 UNKNOWN 的 RED，再实现受信主线观察/绑定和离线分区。任务证据新增 `scorer-repair/R3`，不覆盖 R1/R2。原生第四次模型调用 NOT_AUTHORIZED；完整 F matrix/A-B BLOCKED，adoption PENDING。

### R-3 U-006 frozen / U-007 local checkpoint

- U-006 DONE，scorer 最终 SHA `8590b12a4d79aea81e90ed81d0c6f4bf67a1468259de8c4f717a946b31bdaf60`。公开 seam 的 RED → GREEN：无裁决 PASS→UNKNOWN、完整主线准入裁决 UNKNOWN→PASS、合法关系上下文 FAIL→PASS；已知越域违规被 UNKNOWN 隐藏和 native failed event 洗绿的测试也先 RED 后修复。保留 R1/R2 结构/权限/控制成果。
- `observed` 是调用者拥有的受信边界；候选 answer 内同名票/producer 标签不构成身份。离线命令除原两路径，要求 `--evidence <本任务临时根>`、`--grade-f06-sha256 <主线确认原票摘要>`、`--semantic-review-sha256 <主线确认独立工具返回包装摘要>`；这三者是主线显式准入，不是 JSON 自认证或密码学来源签名。主线必须实际取得独立工具返回，不能把摘要校验冒称已证独立性。runner 本身不自动 dispatch 判官，未建立裁决仍 UNKNOWN。
- 新 runner 对 F06 保存 fixture/trial/manifest/完整 before/after/执行状态；离线重新检查原始 stream、native model/packet、最终 answer、当前实际 snapshot 与所有绑定，仅 stdout 新局部 closure，不写原票、不网络/模型调用。旧 null/timeout/缺包票不满足入口。其公开 CLI 正负例全为明确标注的 synthetic transport，不冒充 native 模型 outcomes。
- 本轮第一候选 broad mutation exit1 `scorer: did not mutate`（源 SHA `affafbe51a05f75628acdab1b7d6d9a83ef4d5d899db9eda3c6ae189a5da56a7`）：旧 checker 按原总分表达式定位变异。只在 scorer 保留非 F06 原表达式兼容点，未改 checker/合同文件；失败保留，不进入独立复审直到恢复通过。
- 根实际执行的最终新候选 `/private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R3/published-candidate-tPnuAs`，27 项 baseline other26 + scorer；四命令均 exit0，broad PASS；九项定向移除 guard 各 exit2、逐次恢复 exit0。精确新命令为 `node /private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R3/published-candidate.mjs` 和 `node /private/tmp/domain-modeling-install.KsdG5S/scorer-repair/R3/targeted-mutation.mjs`。
- U-007 IN_PROGRESS：十例冷独立语义盲校准已派发，gold 未交判官；之后只读 QA，再唯一新冷双轴。U-008 NOT_RUN，index 空，未 stage/commit/push。full native/A-B BLOCKED，Claude deferred，adoption PENDING。

### R-3 publication hold checkpoint（用户“快速收尾，提交并发布”）

- 用户再次要求快速四文件提交发布；不扩查、不自行跳过未闭合 critical gate。U-006 final hash 8590b12a... 不变；独立 QA PASS 3/3。真实语义判官通过 live collaboration 工具向 QA 直接确认原输入没有 gold/实现/历史，归档与其实际 FINAL 完整逻辑 JSON 一致，无不同项，未重判/写票。
- U-007 唯一新双轴 round 已开始：`/root/domain_modeling_r3_standards` 真正 fork none / xhigh；新 Spec spawn 被 runtime 拒绝 `agent thread limit reached`。仅一次失败，不盲重试。可用工具没有 close-agent/释放历史线程入口。尚不能声称双轴闭合或发布准入。
- 减少停顿的可选 fallback 是复用既有独立 Spec-only 判官做同一 final-byte 单文件终审：它不共享 Standards 当前报告，但不是全新冷上下文；这改变批准的 cold-start 细节，先交用户选择，不自行等同。没有新的语义校准/修复轮。
- U-008 NOT_RUN，HEAD仍 fad49e0，index空，upstream URL准确且只读远端 main=fad49e0；web-access check-deps PASS。全 hooks 与精确四文件/27hash index检查脚本已准备，未经 gate 不 stage/commit/push。恢复从本checkpoint、QA envelope、最终候选与 Standards 状态继续。原 WIP保留；Claude deferred，full native/A-B/adoption仍BLOCKED/PENDING。

## Replan R-4（2026-09-17，用户批准修复判定来源并重新双轴终审）

- Source：R-3 新的独立 Spec 审查复现：候选可同时提供否定定义、任意 `agent_id`/`invocation_id`、自行计算的 binding/hash 与 `tool_result`，公开 `score()` 仍为 PASS；`--grade-f06` 又从同一 CLI JSON 重建 `review_admission`。用户已批准仅在既定四文件内修复该来源问题、补齐审计记录并重新双轴终审。
- Scope / freeze：NO_PIN；仅 `scripts/test-domain-modeling-behavior.mjs` 与本计划、verification、final-review。起点 scorer SHA 为 `8590b12a4d79aea81e90ed81d0c6f4bf67a1468259de8c4f717a946b31bdaf60`，HEAD/index 与其他并行 WIP 继续按 R-3 hold 保留和排除。无第四次 native 调用、无新依赖、全局/项目/Flow 效果、stage、commit 或 push。
- Contract correction：hash、`agent_id`、`invocation_id` 和 JSON 字段只可证明字节一致，不能认证独立评审来源。R-3 关于 CLI flags 为“admission”的历史表述在本边界上被 R-4 取代：公开 CLI 和任何调用者复制的 `observed` 都不得让语义票变 PASS。当前没有 controller-owned process/IPC 可信回传时，结构合法的 F06 为 UNKNOWN；已观察到的结构、权限或隔离违规仍优先 FAIL。内部固定 double 只覆盖三态聚合接线，不是独立判官证据，也不恢复自动语义通过能力。
- U-006 / task_execution：先在 public `score` seam 和 `--grade-f06` synthetic ticket 增加可复现 forged-review RED 断言；再以 module-private、不可由 CLI/复制对象重建的 admission capability 使 `f06Semantic` 仅消费内部受信控制器已准入的 review。CLI 只重验原票、trace、packet、snapshot 与结构结果；即使携带旧 `--semantic-review` 参数也不转发/准入该 JSON。
- U-007 / task_execution：final-byte 自测、syntax、skill contract、exact-scope diff，以及至少一个对 admission forwarding 的定向 mutation/restoration 证据；随后两名新的隔离读审分别执行 Standards 与 Spec 轴，并明确检查伪造 direct/CLI review 都不能 PASS。任一 MAJOR、关键 UNKNOWN 或审计记录不一致立即停止，不追加轮次。
- U-008 / task_execution：仅 U-006/U-007 全部闭合、四文件范围和审计记录一致时才重新评估普通提交/推送；本批准不提前授予发布。完整 native/F matrix/A-B、Claude deferred 与 adoption PENDING 的历史状态不变。
- Assertions：R4-01 否定定义 + 全部 caller-computable metadata 在 direct public seam 和 CLI 都是 UNKNOWN；R4-02 固定内部 controller double 仅可验证 all-PASS/FAIL/UNKNOWN 聚合，不能证明来源；R4-03 malformed、timeout、raw/source/snapshot drift 仍 UNKNOWN，结构/known-isolation 仍 FAIL；R4-04 final-review 必须成为当前终端状态的唯一可审计入口，不把 local QA 或旧 CLI PASS 升格成 closure。

当前 U-006 IN_PROGRESS；U-007 PLANNED；U-008 NOT_RUN。R-1/R-2/R-3 失败历史保留；本 replan 是用户批准的有界 R-4，不等同于跳过既有 critical gate。

### R-4 U-006 local checkpoint（2026-09-17）

- RED：把当前 controller-admitted test double 深复制为 caller-owned `observed`（保留否定定义、完整 binding、伪造 provenance、matching hashes/tool_result）后，旧 scorer 自测 exit2：`F06 caller-forged review was green`，即公开 seam 实际返回 PASS。旧 synthetic CLI 也以同一 caller-provided review JSON 得到 PASS。
- GREEN：最终 scorer SHA `79e19a44b66e96596da7c7b55d2f456fa6f734cd8f6a862fdd6df3079cfcef06` 使用 module-private `WeakMap` admission capability；`f06Semantic` 不再读取 `observed.review_admission`。内部固定 double 保留三态聚合测试；其深复制、旧 CLI 参数和 matching hash 都没有 capability，结果为 UNKNOWN。`--grade-f06` 仅将 supplied review bytes 写为 diagnostic receipt，绝不解析、转发或重建 admission。
- Targeted mutation/restoration：临时将 final lookup 改回 `observed.review_admission`，新 forged regression 即 exit2 同一错误；用 private lookup 恢复后 self-test exit0。最终还须在 frozen byte 上复跑 syntax、skill contract、exact diff 和新的隔离双轴；此处不把 local GREEN 说成 independent closure。
- U-006 local behavior evidence complete; U-007 remains PLANNED and U-008 NOT_RUN. No stage/commit/push or native/A-B invocation occurred.

### R-4 U-007 independent closure checkpoint（2026-09-17）

- Frozen candidate scorer SHA stayed `79e19a44b66e96596da7c7b55d2f456fa6f734cd8f6a862fdd6df3079cfcef06`. Before review, final `--self-test`、`node --check`、`test-domain-modeling-skill --all` 和 exact four-file `git diff --check` 都 exit0；index remains empty and the protected parallel WIP stayed excluded.
- Standards axis `/root/r4_standards_review` returned PASS 6/6, `eval_run_id=r4-standards-20260917-79e19a44`: final byte/hash, syntax/self-test, skill contract, fail-closed CLI/copied-review boundary, FAIL precedence, audit traceability and no-publication scope all passed. It explicitly limited its conclusion to Standards-axis closure.
- Spec axis `/root/r4_spec_review` returned PASS 5/5, `eval_run_id=r4-spec-20260917-79e19a44`: independently reproduced full forged binding/hash/provenance/tool_result/review_admission at exported `score()` as UNKNOWN; confirmed public CLI does not parse/forward review data; reconfirmed structural/scope/isolation FAIL precedence and documented that `WeakMap` is fail-closed rather than cross-process judge authentication. It explicitly did not promote this to native/A-B or publication acceptance.
- U-007 is DONE for the bounded R-4 scorer/audit closure. U-008 remains NOT_RUN: the user's R-4 approval said to consider commit/push only after review, so this checkpoint does not infer a new external Git publication grant. Full native/F matrix/A-B remains BLOCKED, Claude deferred and adoption PENDING.

### R-4 U-008 delivery receipt（2026-09-17）

- 用户随后明确要求“发布提交推送”。四文件 code/audit commit `c1ca23d09166f460b6a91eee81f979e7f11e6dff`（`fix(domain-modeling): fail closed untrusted reviews`）以 `fad49e05cd1f59943b5d6e11c6da5369b877b3cc` 为父提交；index 精确四路径，其他并行 WIP 未暂存。
- Commit 前及 hook 内 `scripts/verify.sh` 都完成 PASS=96 / FAIL=0 / WARN=0；pre-commit secret scan passed，未使用 FAST_COMMIT、force、reset、merge 或 rebase。push 前 `upstream` push URL 仍为 `https://github.com/wangmoumou1216-ai/luca_gstack.git`，remote `refs/heads/main` 精确等于该 commit 的父 SHA。
- 普通 `git push upstream HEAD:refs/heads/main` 成功；随后 `git ls-remote upstream refs/heads/main` readback 精确等于 `c1ca23d09166f460b6a91eee81f979e7f11e6dff`。服务器提示 Required Checks 尚在 expected 状态并放行此次 push；GitHub CI run `35215542639` 已为该 SHA 启动，收据时为 `in_progress`，不把 delivery 写成 CI/full-native acceptance。
- U-008 Git delivery is DONE_WITH_CONCERNS for the bounded R-4 change. Full native/F matrix/A-B remains BLOCKED, Claude deferred and adoption PENDING; CI outcome must be read separately.

<!-- FILE_END: domain-modeling-install-plan -->
