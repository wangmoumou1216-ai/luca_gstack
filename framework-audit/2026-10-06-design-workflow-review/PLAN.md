# 设计 Workflow 修复计划

版本：v2，最终会审状态以同目录独立收据及 FINAL.md 为准。2026-10-06。

本轮交付是问题复核和方案；以下实施单元均为 **PLANNED**。本文件不授予实施、项目切换、外部设计工具调用或 Git 发布权限。

## 1. 前提与范围

- 审查基线：`/Users/luca/Desktop/luca_gstack`，HEAD `d211bd3c1479720836219b035ec9963d278efa49`；源码实际字节绑定见同目录 `source-manifest.json`、`source-supplement.json`。
- 该解什么：修复实际状态丢失、相互矛盾的执行/验收规则和工程来源交接缺口。方法论取舍与已声明的不支持能力单独裁决。
- 更小替代：仅串行执行不能解决坏 YAML 覆盖；只加 rename 不能解决读改写竞争；只加文档警告不能替代状态完整性。优先复用中央 writer、现有 quality-gate、Plan 的 execution_context 与 canonical tech-spec/task-plan，不建设第二套编排器或票据系统。
- 默认输出偏差：本计划倾向于局部修复，可能把有意限制误判为漏洞；问题专家和终版方案专家均以 REFUTE 为默认立场，允许撤回、降级和维持现状。
- Framework / NO_PIN；不读写真实项目别名及项目状态，不改变 `framework/`。已有无关改动、审计材料、日志保留。
- Claude 原生运行验收沿用用户此前排除范围；会检查共享合同及 Claude 适配文字，但不把 Codex 证据称为跨运行时验证。任何交付不得宣称 Claude runtime PASS。
- KILL-1：实施时相关源码与冻结基线不同，受影响单元先做增量复核并冻结新 preimage，不覆盖其他人的修改。
- KILL-2：发现输入涉及未决产品/UI选择，不准用 conversation_synthesis 豁免，回原设计/需求 owner。
- KILL-3：关键独立审查缺失、模型采用不明、终版改动未重审，不能作为通过或执行后继的依据。

## 2. 编排与依赖

模式：Sequential Chain + Supervisor；Tier：Deep。实施需要对最终计划范围的真实批准。本轮已经获准的专家复核和文档工作继续完成。

主会话起草和实施；如使用 worker，由单元冻结的唯一 owner 写入，`max_active_subagents=1`，不得覆盖其他工作。关键判断使用已登记 `quality-gate` / MR-004 / peak，冷启动、逐个完成并核原生同次采用与完成收据；不手写模型名。执行 model_tier=core-execution，独立裁决按 model-routing.yaml 的现行角色解析。

顺序：U-001-a → U-001-b → U-002 → U-003 → U-004 → U-005 → U-006。后继只在依赖验证通过后进入。每单元完成后留 checkpoint；共享文件的后继 preimage 绑定前一单元完成后的真实字节。

## 3. 实施单元

### U-001-a：中央状态写入保留旧数据并串行提交

- Source：F1（确认 P1）、F2（并发条件下确认，P2）；E1 独立 CLI 与调度复现。
- Dependencies：无；Status：PLANNED。
- Files：`.claude/skills/office/references/write_state.py`、`scripts/test-workflow-state-guard.py`。
- Read List：writer 全文；E1-review.md / E1-tool-evidence.json；现有 guard 全文；项目作用域合同与 session sidecar 锁的实际边界。
- Approach：保持 `_PROJECT_ROOT` 及现有节点字段接口；使用一个事务入口处理 topic、scene、node、extra，CLI 同时提供 topic/node 时只读改写一次。仅 `FileNotFoundError` 初始化；已有空文件、无效 YAML、非 mapping、错误 nodes/node 形态均显式非零退出、原字节不变。先验证 `_EXTRA_JSON` 是合法对象；不吞解析错误。
- 锁：位于已验证项目 `.luca` 下的稳定旁路锁文件；操作系统 advisory exclusive lock 覆盖读取、修改、提交及 topic 投影。锁文件不随状态文件 rename，不在持锁期间删除；锁等待有明确超时、非零返回。macOS/Linux 的标准库 `fcntl` 足够，无新依赖；其他平台显式报 unsupported，不默默无锁。
- 提交：同目录独占临时文件、序列化成功后 flush/fsync、原子 replace。失败清理本次临时文件。保留未知顶层及非目标节点字段。不同节点必须保留双方；同一节点按锁获得顺序的 patch 语义更新已提供字段，不宣称业务冲突合并。
- `workflow-state.yaml` 是事实源，`current-topic.txt` 是显示投影：只在状态提交后、仍持同一锁时原子更新投影。投影失败须明确返回“state committed / projection stale”的非零错误，保留已提交 state，不打印全成功，不回滚去覆盖其他更新。下一次合法 topic 事务可重建投影。测试不承诺两文件事务原子性。
- Test scenarios：missing/valid/corrupt/empty/list/null/wrong nodes；node-only/topic-only/combined；非法 extra；写入/replace 失败；投影失败；两个不同节点并发、topic 与节点并发、同节点有序覆盖、锁超时/进程退出。并发测试仅控制调度，不替换被测业务逻辑。
- Verification：`python3 scripts/test-workflow-state-guard.py`。要求修复前复现 F1/F2，修复后同一场景通过；在独占临时源码副本移除拒写和锁分别使对应断言转红，再恢复变绿。所有实际输出持久化到本次验证证据目录。

### U-001-b：所有现存状态调用方进入同一事务并保留失败

- Source：F1/F2 的 caller 边界；八处吞错和 ux-audit 独立 writer；Dependencies：U-001-a；Status：PLANNED。
- Files：以下九份 `SKILL.md`：idea、challenge、retro、figma-demo、evals、open-design、html-prototype、redteam、ux-audit；另含 `scripts/test-workflow-state-guard.py`、`scripts/test-project-selection-v34.mjs`、`scripts/test-project-gate-v34-mutations.mjs`（仅受接口约束影响的断言）。
- Read List：各状态写入块及其前置和完成语义；ux-audit 评分准入；office `_PROJECT_ROOT` 前置；现有 project-selection 两项测试的 writer 分区。
- Approach：移除八处将失败吞成成功的 shell fallback，保留 stderr 和非零退出；产物已生成但状态未同步须如实报告并停止依赖该节点的后继，不伪写 DONE、不删除产物。ux-audit 改用中央入口及 `_EXTRA_JSON.baseline_score`，保留已确认项目、真实完整评分和 workflow 节点存在的前置；没有 workflow 节点仍不写状态。只替换状态块，不借此重写评分或 handoff 流程。
- 测试必须从真实 SKILL 块提取/驱动调用，不能只测复制的 Python。断言失败可见、退出码不吞、合法基线及其他字段保留；ux-audit 与另一个节点并发不丢更新。对共享别名及未绑定根继续拒绝，不创造 pin。
- Verification：上述三个现有测试；caller-error 和 ux-audit-mixed-write 分区纳入 guard。移除 caller 失败传播须使对应测试转红。超出九份 skill 的新增 writer 发现先回本 U-ID 做 delta，不默默宣称全系统安全。

### U-002：独立审查与产出档位使用同一套规则

- Source：F3（确认 P1）、F8（确认 P2）；Dependencies：U-001-b；Status：PLANNED。
- Files：brainstorm/ux-brainstorm 两份 `SKILL.md` 和各自 `references/adversarial-review.md`；`.claude/skill-os/codex-viability.yaml`；`.claude/agents/quality-gate.md`；新 `scripts/test-design-workflow-contract.mjs`。
- Read List：两 skill 的规模矩阵、Phase 4/5、adversarial owner 全文；R4；model-routing；QG 的方案检查。
- Approach：Oracle 是独立审查职责，不是对 `task()` 名字的依赖。为现有 quality-gate **新增一个有界 `review_stage=DESIGN_DRAFT` facet**，在其 §0 明确先于普通 Free Task/Skill Mode 判定；仅接 brainstorm/ux-brainstorm 的 Phase 5。复用已登记 native agent_type、Oracle 审查维度与现有 envelope，不声称当前已有 draft 接口，不新增模型路由或评分体系。不存在可用独立审查能力则 BLOCKED，不能把内部推理计为 Oracle 通过；作者自检不给独立票。
- Draft 输入合同：`review_stage`、`skill_name`、`scope_tier`、`round`、调用方生成的 `eval_run_id`、真实项目关联或框架 fixture 的 NO_PIN、`draft{body,sha256,encoding:utf-8}`、`source_refs`、`criteria` 与 `prior_decisions`。调用方把当前内存草稿原文精确冻结为 UTF-8 字节并计算 SHA-256；不为审查先写正式 PRD/设计交付。source_refs 包含每项精确来源 ID、已授权路径+hash 或可核验用户 turn 引用；哈希不能授读权。criteria 绑定原 Oracle 全部适用维度和 scope matrix，并声明 BLOCKING/WARNING；不能由当前草稿自选或缩小源要求。第二轮 prior_decisions 只带裁决及其新证据，不带作者思考历史。调用输入由原生 invocation 的 input_sha 绑定。
- Draft 准入：先独立重算收到的草稿 hash 并核所需 source_refs/criteria，缺字段、hash 漂移、来源不可读或无法确定适用档位均不得给 PASS。此 facet 显式豁免普通模式的 WA status=DONE、outputs_produced 存在性、最终 output/handoff 和 workflow-state DONE 检查；**只豁免尚未到达的阶段条件**，不豁免独立性、来源、权限、Human Gate 和审查内容。现有两种普通模式不改行为。
- Draft 返回与消费：保留各 skill 已有 Oracle XML（brainstorm 的 review_findings/review_summary；UX 的 review_findings/summary），并返回逐项 criteria 的 PASS/FAIL/UNKNOWN 与证据，最后附现有 `EVAL_ENVELOPE_JSON`。人读摘要仍 ≤500 tokens；完整 XML/criteria 作为结构化审查负载，不截断关键发现。草稿 facet 的 envelope 使用同一 eval_run_id，`subject.skill=<skill>:DESIGN_DRAFT`，`output_paths=[]`（当前 recorder schema 已允许）；不伪造交付路径、不在固定 envelope 增加 hash 字段。父级保存原始响应、输入冻结记录、eval_run_id 与同次 accepted 收据关联，核 XML 可解析、身份与严重性/计数一致、criteria 分母与判定和 envelope 一致后，才按原 Finding-Classification Router 处理；字段缺失、未知严重性、XML 与 envelope 矛盾均停门。judge 不写文件/eval，父级调用已有 recorder。判决绑定冻结草稿，任何草稿变更使该票不再是终版票。
- QG 按 skill、已确认 scope tier 及该 skill 的原始 Section Matrix 评方案数：brainstorm 合法 Lightweight 缺 approaches 为 N/A、Standard/Deep-feature 至少两案、Deep-product 至少三案；UX brainstorm Lightweight 两案、Standard/Deep-feature 三案、Deep-product 三案以上。各档应有的 pros/cons、被否定方向及独立审查保留。缺应有方案、未确认 scope、重复/空壳方案仍失败或 UNKNOWN。不把 N/A 填成合格方案数，不为凑数膨胀产物。
- 对齐两个副本中审查轮数和收敛规则：Oracle `critical/CRITICAL` → BLOCKER、`high/HIGH` → MAJOR，均为 BLOCKING；`medium/low/fyi` 是可保留的非阻塞意见，但不能替用户完成未决取舍。既有 `<converged>` 或“没有新问题”不能覆盖尚存的 critical/high。默认最多两轮；存活 critical/high 即使连续两轮相同，也只能停止修订并返回阻塞及真人裁决项，不得通过持久化 Reviewer Concerns 自动进入 Phase 6、标 DONE 或作 handoff-ready。required criterion 为 UNKNOWN 同样不通过；只有无阻塞且全部必需项有证据才允许完成审查。修订后的草稿重新绑定 hash 并冷审；超出两轮须先说明理由，不自行无限循环。真人偏好决定沿原路继承，不让专家代选。
- Verification：contract suite 锁定新 facet 的输入/输出、禁止自审兜底及 scope 条件；实际 Codex 冷启动验证“有独立能力→真实 DESIGN_DRAFT 调用且收据 accepted”“无能力→停住不伪造票”“轻量/标准两案/缺必需方案”。增加新接口正反例：正确内存草稿在没有最终 handoff/DONE 时进入审查；普通 Skill Mode 仍要求其原有 handoff；错误 draft hash、不可核来源、缺 criteria、矛盾或损坏 XML/envelope 均停门；同一 high 连续两轮不进入 Phase 6；草稿改动不能沿用旧票。静态关键词仅为 tripwire，不当作原生执行成功。未运行场景保持 UNKNOWN。

### U-003：auto 继承交互执行位置

- Source：F4；Dependencies：U-002；Status：PLANNED。
- Files：`.claude/skills/office/auto/SKILL.md`、`scripts/test-design-workflow-contract.mjs`。
- Read List：auto Step 2/3/W9、plan-design-guidance 执行上下文表、orchestrator 的 skill_execution 分支。
- Approach：每阶段声明 `execution_context`；交互技能在 main_agent 执行，只有非交互阶段套 WA 模板。研究确认等前置真人问题由主会话收齐后派发。依赖、人类门、取消和质量门沿用既有 owner。无新 scheduler，不把逻辑 WA 标签解释为一律 spawn，不因 auto 而跳过已有确认。
- Verification：真实冷启动计划探针，覆盖“研究→brainstorm→design-brief→OD”、缺用户选择、已确认选择、取消后停止后继；检查真实 dispatch/提问事件，确认交互节点未派给后台 WA；有用户确认的研究仍可进入被授权子代理。不要用 mock agent 输出证明用户门实际执行。

### U-004：纯工程来源贯通 tech-spec 到 task-plan

- Source：F5；Dependencies：U-003；Status：PLANNED。
- Files：tech-spec/task-plan 两份 `SKILL.md`；`.claude/skill-os/input-modes.yaml`；其生成的全部 input-modes JSON（共同 source_sha256 导致的机械更新，内容变化限 tech-spec/task-plan）；`scripts/test-engineering-delivery-skills.mjs`、`scripts/test-design-workflow-contract.mjs`。
- Read List：to-spec 来源登记与负门；tech-spec conversation_synthesis/Phase 0/5/6；task-plan Phase 0/1/4/7/8；input-modes 及 workflow-mode；implement compile owner。
- Approach：保持现有 standalone/workflow 两种流程模式；conversation_synthesis 是来源类型，不新增 Workflow。在 tech-spec handoff 明确绑定 `input_mode`、精确 Source Register 路径与 SHA、来源 turn/证据及独立 MUST 集，task-plan 同版本实际读取核对。
- 正常 PRD/Brief 分支继续要求两份来源及 `prd_end_to_end`；纯工程分支用真实 CONV-MUST→REQ/ASSERT→DEV+TEST，源表反向校验保证不是从自己矩阵算出 100%。无 UI 的设计/状态节点有依据地 N/A，不伪造 R/AE/D/STATE/PRD/Brief；已承诺工程错误/状态条件仍是 CONV 来源的 MUST，必须有测试。
- 元数据中的通用 required 列表明确归属普通 PRD 分支；在现有 quality_gates/notes 描述 conversation_synthesis 的替代输入和同等覆盖门，两个 skill 的正文/投影不得仍无条件要求 Brief。不创建第二个 tech-spec 或 task-plan。
- 缺 input_mode 或无法验证源表时 NEEDS_CONTEXT，不能从“缺 Brief”猜纯工程；存在未决产品/UI、来源漂移、遗漏 MUST 时 BLOCKED 或回原 owner。历史 PRD 产物若可由原有精确来源确认，按既有普通分支接入，不批量改历史 handoff。
- Verification：`node scripts/test-engineering-delivery-skills.mjs --all`、contract suite、`python3 scripts/build-agent-context.py check`。实际冷启动纯工程 CONV 样例从 TS intake 到 TP 门和 implement compile（只编译不执行）；负例：未知 mode、伪造/漂移 register、漏一条 MUST、偷偷加入 UI、普通 PRD 缺 Brief；双向 DEV/TEST/ASSERT 覆盖必须保留。

### U-005：原件模式提前使用正确的能力与恢复路径

- Source：R7 的契约裁决；Dependencies：U-004；Status：PLANNED。
- Files：`.claude/skills/office/open-design/SKILL.md`、`.claude/skill-os/runtime/page-context.md`、`.claude/skills/office/auto/SKILL.md`、`scripts/test-design-workflow-contract.mjs`。
- Read List：OD Phase 0/1/3H/3D/4/W9、page-context §7、original-copy-handoff 的拒绝与成功回收；保留后者实现。
- Approach：v1 桌面 original_copy 不支持本身不作为 bug 修复。把已有 headless-only 限制和通用默认/恢复规则的例外前置到 original_copy 路径选择、任何外部 stage 之前：没有明确 headless opt-in/run grant 就报告能力限制并等待真实选择；不默认替用户开 headless。原件 headless 失败不能建议走无法回收的桌面恢复；保留失败，停止该交付。普通 reference/carrier 分支维持原桌面路径。
- Verification：冷启动路径决策覆盖 original_copy 未选 headless、已授权 headless、原件 run 失败、普通 carrier 桌面四例；原件负例不得发生 stage/run，不伪造用户选择。`node scripts/test-original-copy-handoff.mjs` 保持旧 canceled/stale/desktop 拒绝。未实际调用 OD，只能证明合同路由和 adapter fixture；真人桌面体验仍未知。

### U-006：有限回归与终版独立验收

- Source：R4、前述每个单元的行为验收；Dependencies：所有实施单元通过；Status：PLANNED。
- Files：`scripts/verify.sh`、`.github/workflows/ci.yml`、`scripts/check-ci-contract.mjs`、`scripts/test-ci-contract.mjs`；任务自有证据目录。只把新增/扩展 guard 和 contract suite 接入既有 blocking gate，不新增流水线。
- Verification 命令：下节 A1–A6。各新行为分区须证明故障基线/故障 mutation 为红、修复为绿；纯文本断言只能证明同步，不能替代真实冷启动观察。当前实例/manifest/实际动作/输出/清理后证据按 project-verification owner 绑定。
- 最终以同一份源码 hash 集和最终计划冻结版本派独立 quality-gate；F1–F5/F8 及 R7 范围内每条都要证据。失败保留原 U-ID 返修；最多两轮后仍有 major/blocker，不宣称专家一致通过。
- 本次阶段不含 commit/push/PR/merge/pull。后续若用户要求实施并发布，应先形成经复核的真实改动与精确集成基线，再沿既有 Git 授权与门控完成；不能用本次“方案通过”替代代码发布验收。

## 4. 共用断言

以下为实施时执行的命令，当前计划阶段没有把它们标成修复后 PASS。每项在独立 shell 执行，保留真实退出码；任何 mandatory GAP/UNKNOWN 阻断其验收。

| ID | BLOCKING 命令 | 证明边界 |
|---|---|---|
| A1 | `python3 scripts/test-workflow-state-guard.py` | 真实 writer、真实 caller、故障保留与并发；扩展后才涵盖新分区 |
| A2 | `node scripts/test-project-selection-v34.mjs` 与 `node scripts/test-project-gate-v34-mutations.mjs`，分别执行 | 已有身份/作用域约束不退化 |
| A3 | `node scripts/test-design-workflow-contract.mjs` | 新增静态合同一致性和 fixture 检查，不冒称 LLM 行为 |
| A4 | `node scripts/test-engineering-delivery-skills.mjs --all` 与 `node scripts/test-original-copy-handoff.mjs`，分别执行 | 现有工程入口与原件 adapter 回归 |
| A5 | `python3 scripts/build-agent-context.py check`；`node scripts/check-agent-contracts.mjs`；`node scripts/test-ci-contract.mjs`，分别执行 | 投影同步、既有合同、CI 阻断接线 |
| A6 | `bash scripts/verify.sh` | 仅终版全仓既有门；失败不可笼统归因环境，逐项保留 |

语义行为单独保留 B1（独立票与缺能力）、B2（产出 tier）、B3（auto dispatch/HITL）、B4（CONV 正反例到 compile）、B5（original_copy/普通模式能力分支）。冻结 fixture→source→driver→expected result 后再真实运行；父级记录实际原生调用和 accepted 收据，独立判官核结果，不能用请求 prompt 当实际执行证据。

## 5. 暂不实施项与完成标准

- R6 为已确认的 P3 方法论张力，尚无生产损害证据。D-001 提案：仅把 `ai-native-design-framework.md` Layer A/B 的绝对否定改为“效率收益不足、需要举证”；例外限定已确认的正确率、判断质量或控制收益，明确收益证据、额外成本、失败恢复及用户取舍。与 `ai-native-taste-anchors.md` 既有例外保持一致，路径长度仍是一项检查，不能空口说“质量更好”便放行。验收对照：同等步数但有明确判断支持收益的方案可评审；无收益证据、删除必要确认或增加失控风险的方案不能自动过门。此项属于设计取舍，等用户明确选择后再编译独立 U-ID，不作为当前 bug 修复的隐含授权；不新建评分框架。
- 所有原生/真实外部工具未覆盖项明确标 UNKNOWN；原件桌面支持不进入本计划。
- C1：全部原始假设及新发现 F8 有明确 disposition、证据和反证范围。
- C2：每个确认问题有稳定 U-ID、有限 Files、依赖、可观测正反验收，保留既有保护。
- C3：源码实际行为、静态合同、方法论和能力限制分开描述；没有把文档矛盾写成已观测事故。
- C4：数据完整性方案同时处理 writer/caller/旁路，不能仅 rename 或仅拒写就宣称完成。
- C5：来源分支、独立审查、人类选择门与普通 PRD 路径不被放宽。
- C6：独立专家对最终同字节版本完成审查，意见、修改、收据与未决项均留档。

## Replan R-1（2026-10-06，方案独立会审发现两个 MAJOR）

初版 PLAN SHA `d7d8c1a222c3855860a0006d6bebd0f8a3f95281d11569656d67213d6920f042`；完整原文保留在 PLAN-v1.md，首次判决在 E3-v1-review.md / E3-v1-native-receipt.json，FAIL 5/6。

只修订 U-002：把不存在的“现有 draft 接口”改成明确拟新增的 DESIGN_DRAFT facet，补冻结输入、阶段豁免、Oracle XML/criteria/envelope 消费合同和实际入口验收；把 Oracle critical/high 与 BLOCKER/MAJOR 显式映射，补重复高严重性必须阻塞的测试。其余 U-ID、依赖、Files 和 PLANNED 状态不变。本文是未来修复方案，不把计划中的新接口当成已经实现。
