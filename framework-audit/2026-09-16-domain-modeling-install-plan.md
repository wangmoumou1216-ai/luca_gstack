# domain-modeling 适配安装执行计划

Status: PLANNED

本文件是待用户批准的安装执行 payload。用户随后要求“包含全局推送和提交。你刚才所有的执行都要全局推送和提交”，并要求“继续”：本次已产生的任务文档可以聚焦提交并普通推送；安装仍须展示本文件后获得真实批准，不用文档发布冒充技能安装。

## 0. 前提与范围

- 目标：补齐 domain-modeling 的独立手动入口、无固定关键词的语义识别与宿主 Agent 按需调用；不是安装整个 mattpocock skills 集，也不是更换框架记忆系统。
- 该不该解：应解；用户明确要求独立及自动可达，而现有 brainstorm 术语持久化与 ADR 提议规则没有提供完整独立入口。
- 更薄替代：仅补 references 不能满足独立手动调用与模型发现；采用单一 skill 正文、薄入口和按需指针，不新建通用领域建模平台。
- 默认形态偏差：独立入口可能高估新增 skill 的必要性；由冷启动 default-REFUTE reviewer 复核重复建设、消费面与权限合同。
- 路由：framework-evolution 中针对已点名单个能力的适配接入，复用既有对标证据，再走 FUSION 安装门；不跑全仓 scout、不重做整套 benchmark、不以 research skill 替代框架流程。
- 研究：已有上游真身、固定版本、MIT 许可和本地机制对标。本计划是成熟接入模式，不做重型外部研究；U-001 重新核验固定源包，变化不得静默换版本。
- 目标 checkout：`/Users/luca/Desktop/项目/muse/lucagstack`。
- 实现源基线 HEAD：`0e07efd17e5740aa2a6ceef4a4423281ebc906b4`。旧评审的 `2b01fb...` 不作为本次安装基线。安装可从第 0.1 节列明的文档发布提交继续，但必须验证其相对本源基线仅改变这三个任务文档；实际安装 HEAD 在 U-001 记录精确 SHA，其他历史或实现文件漂移须重规划。
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
- 框架 NO_PIN 调用只处理明确授权的 framework artifact；不推导一个下游项目、不写根 CONTEXT。live 写入测试仅在任务自有隔离框架 fixture 中指定 exact artifact。
- ADR：只有既有 extraction-bar 三条件全真才提议；用户明确要求记录后才向已授权的 ADR artifact 写入；没有此请求不创建 docs/adr，不直接写 decisions.md、person memory 或 semantic facts。
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
- Files：`.claude/commands/domain-modeling.md`、`.claude/skills/domain-modeling`（symlink）、`.agents/skills/domain-modeling`（symlink）；`.claude/skill-os/skill-routing-map.yaml`、`input-modes.yaml`、`model-routing.yaml`、`codex-viability.yaml`、`generated/skill-catalog.md`、`.claude/skills/office/references/office-wizard.md`。
- Approach：入口只指 canonical，scope-safe narrow triggers；standalone/workflow/internal modes 同一能力合同；catalog 用现有 generator sync，不手改；wizard 仅改直接必要登记行，不执行向导。
- Read List：上述 existing targets 编辑前全读；routing/check-registration；model-routing 三问；Codex viability；generator。
- Test scenarios：/$/selector 入口；无词表关键词的意图；变量改名非触发；equal-weight mixed intent；alias 路径逃逸。
- Verification：alias realpath 相等；policy、mode、tier、一份正文一致；registration/routing/context/parity suites；actual discovery 位于 U-007。
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
- Approach：专用小评估器调用实际 Claude/Codex CLI，隔离 fixture、保留 raw evidence，按可观察结局判定；现有 behavioral_ab.py 只作其支持的 Claude guided tier no-op/回归辅助，不伪造 Codex model=sonnet，不把文本差异当建模通过。
- Read List：现有 CLI 调用/trace 先例、behavioral_ab.py、eval-methodology、project-scope 生产测试的隔离先例；code-hygiene。
- Test scenarios：下列 F01–F11，malformed/truncated output、timeout、missing CLI、错 root/alias、baseline 被 candidate 文件污染、评分器假 PASS。
- Verification：新 suite 自测；actual runner 不可用/证据缺失必须 nonzero 或 UNKNOWN；mutation 临时变坏 alias、input mode 登记、评分器假阳性，应转红；不改真实项目或 global trust。
- phase_type：task_execution；model_tier：core-execution；Status：PLANNED。

### U-007 — 仓库门、双端 live、独立终版复审

- Source：DMR-001–004；framework-maintenance/cross-harness/FUSION 强制门。
- Dependencies：U-001–U-006。
- Files：`framework-audit/2026-09-16-domain-modeling-verification.md`、`framework-audit/2026-09-16-domain-modeling-final-review.md`（raw traces 放任务临时目录，报告绑定其 exact path/hash）。
- Approach：先 deterministic suites，再两端 actual probes + Claude guided A/B；冻结 final diff/manifest，独立 quality-gate 与 default-REFUTE reviewer 串行核对；关键 gate FAIL 不进入 U-008。
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
node scripts/test-domain-modeling-behavior.mjs --harness claude --ab --trials 1
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
- C5：现有术语/ADR/memory规则一处权威，未复制独立晋升体系、未改root CONTEXT和必经Flow；防重复建设与范围扩大。
- C6：F01–F11逐端有判定，缺票与基础设施故障不当PASS；final review绑定最后字节；防 DMR-004与旧review覆盖新修改。

## 6. 失败、回滚与批准门

- BLOCKING FAIL：停止当前 phase，不执行下一phase/主 checkout落地；局部修复后重跑并把变更送回终版review。
- UNKNOWN/CLI故障：记录确切缺口与已尝试步骤；不以静态lint顶替live票据，不改全局trust或harness配置。
- 同一失败三次不盲重试；quality gate两次失败走delta重规划；独立review≤2轮仍有MAJOR则交用户。
- 范围、baseline、效果或已确认领域合同被推翻：保留稳定U-ID，新增delta及新批准，不暗中扩大清单。
- 验证前主 checkout无行为变更；失败保留任务worktree与证据。验证后回滚仅针对任务自己的安装提交/patch，先审冲突，不自动reset --hard或覆盖用户WIP。
- 用户已经授权第 0.1 节的当前任务文档提交与普通推送。安装前须展示本计划，等待用户批准目标 checkout、U-001–U-008、能力/写入合同、文件清单及列明的安装 Git/external effects；此前的发布要求不能代替 exact 安装 payload 批准。

## 7. 当前 checkpoint

完成：评审缺口被编译成输入/输出/定案/写入/返回合同、消费面、精确文件与双端验收矩阵；新HEAD已读取，用户dirty保护集已核对；用户新增提交/推送要求已纳入，第 0.1 节 remote/ref 与远端源 SHA 已核验。

当前：本计划待独立静态复核及安装批准；无安装 worker 运行。所有 U 仍 PLANNED。首个 Codex 独立 plan reviewer 因 usage limit 未提供票据，此故障不算完成评审轮；最终文档复核结果另存第 0.1 节 exact review report，绑定本计划 SHA，不用自审补 PASS。

恢复读取：本计划、既有redteam报告、source-freeze（产生后）、最新HEAD/status、runtime project-session/framework-maintenance/long-session、FUSION；从首个未完成U继续。不得复用旧baseline或从docs aliases推导项目。

<!-- FILE_END: domain-modeling-install-plan -->
