# Rule Execution Closure — Final Execution Plan

> Plan ID：`REX-20260811-001`  
> 日期：2026-08-11  
> 状态：`FINAL_CANDIDATE_AWAITING_USER_AUDIT`  
> 模式：Hierarchical / Deep  
> 目标：把“规则写着”升级为“适用规则可加载、可执行、可验证、可回执、可拒绝假绿”  
> 本计划只授权计划包生产；在 G-PLAN 前不授权任何 runtime、global、Git ref 或远端变更。

## 0. 前提门

### 0.1 该不该解

应该。相同输入已经稳定复现 meta→Project Stop；静态 verifier 在缺少必需角色时仍 18 PASS；空 marker
可以伪造纠错完成；无 pin 读侧与 patch-body 误杀均有现场证据。这不是一次回答偏差。

### 0.2 更薄替代

只补一个 meta 关键词或再加一条 checker 只能处理约 20% 症状，无法覆盖纠错重放、读写事务、真实
harness 可达、稳定记忆、dirty/ahead Git 和人类批准身份，因此不采用。

### 0.3 默认形态偏差

本计划默认偏向机械证据，容易把所有人类判断误改成脚本。相反立场由 Round 1 的 human-gate 与
native-parity 攻击线复核：taste 决策仍必须交人；原生能力差异只做有证据的语义降级。

### 0.4 Kill assumptions

- `KILL-1`：本任务只修 luca_gstack 框架治理，不授权任何下游产品工作；若用户要合并产品任务，本计划作废。
- `KILL-2`：用户要解决的是规则执行闭环，不是同时实施 mattpocock 能力适配；若要合并两程序，本计划作废。
- `KILL-3`：trusted top-level main 是现有可执行信任边界；本计划不声称能防护一个已冒充 Luca 的同权限 main。
- `KILL-4`：当前 dirty 文件无法仅凭 path 区分用户 WIP；任何重叠 hunk 无明确归属即 `BLOCKED_DIRTY_OVERLAP`。
- `KILL-5`：若执行时 HEAD、upstream、hook trust 或全局 resolver target 与冻结 census 漂移，先产 delta，不套旧 descriptor。
- `KILL-6`：若 harness 不能提供新的顶层 user turn，危险门终态只能是 `BLOCKED_HUMAN_CHANNEL`，不使用批准文件兜底。

## 1. 权威、基线与 Cycle 2 边界

### 1.1 单一权威

1. 用户最新明确指令。
2. `AGENTS.md`、`CLAUDE.md` 与安全/项目红线。
3. 用户批准 SHA 后的本文件；G-PLAN 生效瞬间即冻结下述 Cycle 2 overlap，不等待实施末尾。
4. 同目录 manifest、红队与最终判官证据。
5. 旧 `2026-08-11-rule-execution-repair-plan.md` 永久 source-only。

### 1.2 当前冻结基线

| 对象 | 值 |
|---|---|
| canonical repo | `/Users/luca/Desktop/项目/muse/lucagstack` |
| branch | `main` |
| HEAD | `789b1b800649de47a79096c72f40c03a54529303` |
| upstream/main | `dce92e6b8c91c617d086ac044e90187b68325fc6` |
| divergence | ahead 1 / behind 0 |
| old plan SHA | `6690c1251ad3fd844a3b4c8511dedad04f3372c16f530a48c75a109bb40229cb`（REFUTED） |
| Cycle 2 plan SHA | `19711435e97eb4c7f27b2185bb5f9b6bfe8f04d78d160be73e78ff8c8afacf28` |

当前 tracked dirty 9 个文件，且 route/session/test 与本计划未来修改面重叠；另有用户 WIP 和旧审计目录。
任何执行 worktree 必须从已批准 package commit 新建，canonical dirty 原样保留。

### 1.3 Cycle 2 不再作为 E4

Cycle 2 是独立 capability program，本计划不执行其 321/2,568 universe，不继承其 G-PACKAGE 批准，
也不把其 `READY_FOR_EXECUTION_SESSION` 冒充为当前授权。本计划只引用其中已经过对抗的四个架构决定：

- native human gate proposal→binding→result；
- project/pin transaction 与 patch control-header contract；
- native agent event receipt；
- activation journal/CAS/reverse compensation。

G-PLAN 被用户 exact 批准后，Cycle 2 的 project transaction、patch parser、native agents、human gate、
activation journal 五类 shared-owner task 立即成为 `BLOCKED_BY_REX_DELTA`；旧计划其它 capability task仍保持
未授权。DEV-001 的 package commit 必须把该状态与本计划指针写回 Cycle 2 FINAL/HANDOFF header，之后才建
execution worktree。若该 pointer 未落盘，G-PACKAGE 失败，不允许任何 runtime DEV 启动。

本计划完成后，Cycle 2 再生成 delta：shared-owner task 改为消费 `RULE_EXECUTION_VERIFIED` 基线，重新计算
它自己的 package SHA 与 G-PACKAGE；不得双实现。

## 2. 复杂度与执行纪律

```text
复杂度模式: Hierarchical（外层 Sequential；阶段内最多 3 条独立 Work/Test 配对）
需要用户确认: 是
任务规模 Tier: Deep
研究: 跳过外部研究；当前缺口均由本地运行时实证、规则源与既有 Cycle 2 架构证据覆盖。
```

硬规则：

1. 每个 DEV 必须由未编写它的 TST 独立验证。
2. 任何 BLOCKING 断言失败即停；同根因三次失败为 `BLOCKED`。
3. 不在 canonical dirty tree 实施 runtime；不自动 stash、rebase、reset、clean、stage-all 或 push。
4. registry 只存 canonical pointer 与执行元数据，禁止复制规则正文成为第二真值源。
5. `PASS`、`DEGRADED`、`NOT_RUN`、`UNKNOWN` 不可互相聚合；machine-safety 不允许 degraded。
6. 所有人类门都需要 proposal 后新的顶层用户回复，agent/tool/subagent 文本无批准权。

## 3. Obligation 分类合同

| Class | 对象 | 允许的 enforcement | 允许 degraded |
|---|---|---|---|
| `S0_MACHINE_SAFETY` | 项目隔离、稳定记忆晋升、危险 Git/global 动作、resolver containment | 双 harness 机械门 + live negative proof | 否；缺能力即 BLOCKED |
| `S1_ROUTING_DISPATCH` | Project Gate、Plan、skill/agent dispatch | deterministic route + live native trace | 仅原生 UX，不得降级停止条件 |
| `S2_COMPLETION_QUALITY` | skill gate、handoff、读序、DONE | invocation-scoped obligation ledger + evidence | 可，但必须显式不支持面 |
| `S3_HUMAN_TASTE` | 平台/偏好/范围/激活/远端选择 | top-level human proposal/binding/result | 否；无通道即 BLOCKED |
| `S4_NATIVE_CAPABILITY` | slash、Workflow、widget、事件/沙箱差异 | capability census + live evidence | 是；不得掩盖 missing-wiring |

机器可读索引每条记录必须含：`id/source_pointer/source_anchor_hash/class/trigger/harnesses/executor/
activation_probe/verifier/mutant_ids/receipt_kind/degradation_code/owner`。不存规则正文。

计划包中的 `obligation-source-manifest.json` 冻结 source-root 生成规则、resolved exact path set 与每个文件
SHA。它覆盖 AGENTS/CLAUDE、Skill OS 全部规则文件、office 下全部 SKILL、Claude/Codex agents、active hook
配置与实现、Git/CI入口、active observability rules、stable semantic store。执行时先按同一生成规则重算；
新增/删除/改hash任一项即 `SOURCE_SET_DRIFT` 并触发delta，不能先生成census再自行缩小源集。

global route target 不属于仓内 source set：E0 另产 live exact target census，G-OBLIGATION-SCOPE 同时绑定
source-manifest SHA、live-target census SHA 与逐条 obligation census SHA。机器抽取只产候选；遗漏/分类是
taste，仍由用户裁决，但人裁不能改变被冻结的输入分母。

## 4. 执行 DAG

```text
G-PLAN
  └─ E0 DEV-001 PREP → TST-001 PRE → G-PACKAGE → DEV-001 EXEC → TST-001 POST
       └─ isolated implementation worktree
            └─ E1 DEV-002 PREP → TST-002 PRE → G-CONTAIN → DEV-002 EXEC → TST-002 POST
            └─ E2 DEV-003→004→005（每个后接独立 TST）
                 └─ E3 DEV-006→007→008（每个后接独立 TST）
                      └─ E4 DEV-009 PREP → TST-009 PRE → G-OBLIGATION-SCOPE
                           └─ DEV-009 EXEC → TST-009 POST → DEV-010/TST-010
                           └─ E5 DEV-011→012→013（每个后接独立 TST）
                                └─ E6 DEV-014 PREP/rehearsal → TST-014 PRE → G-ACTIVATE
                                     └─ DEV-014 EXEC → TST-014 POST → fresh Claude/Codex read-back
                                          └─ DEV-015 PREP → TST-015 PRE → G-REMOTE
                                               └─ DEV-015 EXEC(push) → TST-015 POST
                                                    └─ RULE_EXECUTION_VERIFIED
```

`PREP/TST-PRE → GATE → EXEC/TST-POST` 是四个变更门（G-PACKAGE、G-CONTAIN、G-ACTIVATE、
G-REMOTE）的强制时序。PREP 只能生成只读 census、descriptor、proposal 与 rehearsal evidence；不得执行
门所保护的写。TST-PRE 只验证 proposal 是否足以让人决策。只有 gate receipt 有效后才进入 EXEC；
TST-POST 必须对实际结果重新读回。gate 不是 U-block 的前置依赖，不能在准备 gate evidence 之前被要求存在。

### 4.1 Phase contracts

| Phase | phase_type | model_tier | Agent ownership | Output | Gate |
|---|---|---|---|---|---|
| E0 | task_execution | core-execution | WA-01 package；EA-01 isolation | package commit + worktree | G-PACKAGE |
| E1 | task_execution | core-execution | WA-02 containment；EA-02 security | resolver stub receipt | G-CONTAIN |
| E2 | task_execution | core-execution | WA-03..05串行；各自独立EA | route/project/patch commits | TST-003..005 |
| E3 | task_execution | core-execution | WA-06..08串行；各自独立EA | correction/gate/agent evidence | TST-006..008 |
| E4 | task_execution | core-execution | WA-09 census；WA-10 compiler；独立EA | approved census + obligation runtime | G-OBLIGATION-SCOPE |
| E5 | task_execution | core-execution | WA-11..13串行；各自独立EA | memory/Git/rule cleanup commits | TST-011..013 |
| E6 | task_execution | core-execution | WA-14 activation；EA-14 fault；WA/EA-15终审 | live receipts + delta + remote descriptor | G-ACTIVATE/G-REMOTE |

### 4.2 U-blocks and Waves

每个 U-block 与同号 DEV/TST 一一对应；`Verification` 指定独立 tester，不能由 WA 自评。

#### U-001
- Goal：冻结 plan package、dirty ownership与Cycle 2 overlap pointer。
- Source：DEV-001。
- Dependencies：G-PLAN。
- Files：本计划包、Cycle 2 FINAL/HANDOFF header、package descriptor。
- Read List：本计划 §1/§4/DEV-001；Git status v2；Round 1 B8/B9。
- Test scenarios：clean package、dirty overlap、wrong parent。
- Verification：TST-001；Status：PLANNED。

#### U-002
- Goal：按live census隔离unsafe resolver。
- Source：DEV-002。
- Dependencies：U-001。
- Files：stub、descriptor、实际discoverable global targets。
- Read List：DEV-002；Round 1 B12；Cycle 2 ADR-GATE-001。
- Test scenarios：Claude-only target、双target、target drift、replay。
- Verification：TST-002 PRE → G-CONTAIN → TST-002 POST；Status：PLANNED。

#### U-003
- Goal：实现pure-meta/project/mixed三分路由。
- Source：DEV-003。
- Dependencies：U-002。
- Files：route guard、fixtures、tests。
- Read List：DEV-003；system review E-01；Round 1 A7。
- Test scenarios：pure/meta、named project、ambiguous mixed。
- Verification：TST-003；Status：PLANNED。

#### U-004
- Goal：实现project identity transaction与turn epoch状态机。
- Source：DEV-004。
- Dependencies：U-003。
- Files：project substrate、guards、session hooks、project script、adapters、tests。
- Read List：DEV-004；Round 1 A4/A5/A6/A8；Cycle 2 project decision。
- Test scenarios：no-pin、switch failure、concurrency、mid-turn switch、inode swap。
- Verification：TST-004；Status：PLANNED。

#### U-005
- Goal：只按patch control header判断target并保真body。
- Source：DEV-005。
- Dependencies：U-004（共享guard接口）。
- Files：Codex adapter、parser、tests。
- Read List：DEV-005；system review E-03；Cycle 2 patch decision。
- Test scenarios：literal、multi-file、malformed、move、escape。
- Verification：TST-005；Status：PLANNED。

#### U-006
- Goal：用attribution-derived ticket/receipt替换marker。
- Source：DEV-006。
- Dependencies：U-005。
- Files：ticket/schema/verifier/Stop/tests。
- Read List：DEV-006；correction-attribution全文；Round 1 A1/A2/A3。
- Test scenarios：L1..L5、route/non-route、replay、forgery。
- Verification：TST-006；Status：PLANNED。

#### U-007
- Goal：实现共享human gate proposal→binding→result。
- Source：DEV-007。
- Dependencies：U-006。
- Files：gate schema、recorder、verifier、tests。
- Read List：DEV-007；Cycle 2 ADR-GATE-001。
- Test scenarios：fresh exact user turn与九类伪批准。
- Verification：TST-007；Status：PLANNED。

#### U-008
- Goal：补齐双端native logical roles与native receipts。
- Source：DEV-008。
- Dependencies：U-007（消费human/native evidence TCB）。
- Files：Claude/Codex role definitions、launcher、schemas、checkers。
- Read List：DEV-008；Cycle 2 native-agent ADR；Round 1 C4/C5/C6。
- Test scenarios：四角色live、missing role、self key、fake log、wrong matcher/trust。
- Verification：TST-008；Status：PLANNED。

#### U-009
- Goal：从冻结source manifest建立不可缩分母的obligation census。
- Source：DEV-009。
- Dependencies：U-008。
- Files：source manifest verifier、census generator/candidate。
- Read List：DEV-009；`obligation-source-manifest.json`；Round 1 B1/B2/B5。
- Test scenarios：source drift、漏MUST、错误class、global target drift。
- Verification：TST-009；Status：PLANNED。

#### U-010
- Goal：接通pointer-only compiler、ledger与三验证lane。
- Source：DEV-010。
- Dependencies：U-009、G-OBLIGATION-SCOPE。
- Files：index/compiler/ledger/mutation/verify integrations。
- Read List：DEV-010；approved census；Round 1 B3/B4。
- Test scenarios：删consumer/matcher/trust/behavior、NOT_RUN聚合。
- Verification：TST-010；Status：PLANNED。

#### U-011
- Goal：机械守护stable memory promotion provenance。
- Source：DEV-011。
- Dependencies：U-010。
- Files：memory guard、promotion receipt、precommit、sync、tests。
- Read List：DEV-011；SC-20260523-003；Round 1 B6/B7。
- Test scenarios：direct/script/valid-YAML/伪receipt/FAST_COMMIT。
- Verification：TST-011；Status：PLANNED。

#### U-012
- Goal：统一local commit纪律与exact remote gate。
- Source：DEV-012。
- Dependencies：U-011（sync共享Git面）。
- Files：Git policy、指针、descriptor/receipt checker、scripts。
- Read List：DEV-012；现行Git规则；Round 1 B8..B11。
- Test scenarios：same-file WIP、ahead、multi-remote、non-FF、force、replay。
- Verification：TST-012；Status：PLANNED。

#### U-013
- Goal：清理product-neutral、review fallback与stale diagnostics。
- Source：DEV-013。
- Dependencies：U-012。
- Files：open-design、routing review、model/harness docs与checkers。
- Read List：DEV-013；skill authoring/invariants；system review §7。
- Test scenarios：preference writeback、profile absent、Codex review、stale advice mutation。
- Verification：TST-013；Status：PLANNED。

#### U-014
- Goal：rehearse并执行journaled activation。
- Source：DEV-014。
- Dependencies：U-013。
- Files：activation descriptor/journal/CAS/reverse runner、aggregator。
- Read List：DEV-014；Cycle 2 activation ADR；approved obligation census。
- Test scenarios：每个写边界fault、route-open fail、fresh sessions。
- Verification：TST-014 PRE → G-ACTIVATE → TST-014 POST；Status：PLANNED。

#### U-015
- Goal：生成Cycle 2 delta、最终evidence与remote descriptor。
- Source：DEV-015。
- Dependencies：U-014、fresh read-back。
- Files：delta report、evidence manifest、completion/remote receipts。
- Read List：DEV-015；本计划§1.3；全部TST receipts。
- Test scenarios：旧shared owner直跑、missing TST、UNKNOWN、wrong remote ancestry。
- Verification：TST-015 PRE → G-REMOTE → TST-015 POST；Status：PLANNED。

```text
Wave 0: U-001 PREP/PRE → G-PACKAGE → U-001 EXEC/POST
Wave 1: U-002 PREP/PRE → G-CONTAIN → U-002 EXEC/POST
Wave 2: U-003 → U-004 → U-005
Wave 3: U-006 → U-007 → U-008
Wave 4: U-009 PREP/PRE → G-OBLIGATION-SCOPE → U-009 EXEC/POST → U-010
Wave 5: U-011 → U-012 → U-013
Wave 6: U-014 PREP/PRE → G-ACTIVATE → U-014 EXEC/POST → fresh read-back
        → U-015 PREP/PRE → G-REMOTE → U-015 EXEC/POST
```

## 5. Assertion Matrix

| ID | Given / When / Then | Proof |
|---|---|---|
| ASSERT-001 | Given 当前 dirty/ahead tuple，When E0 冻结，Then HEAD、index、worktree path set 与 remote refs 前后不变。 | tuple read-back |
| ASSERT-002 | Given package allowlist，When G-PACKAGE 后提交，Then staged/commit blob exact-set 只含本计划包，不含 tracked dirty/WIP。 | blob exact-set |
| ASSERT-003 | Given live resolver census，When containment，Then所有实际可达 target 只返回 fail-closed，缺失 target 不伪造安装。 | direct invoke + route probe |
| ASSERT-004 | Given meta×具名项目交叉语料，When route，Then pure meta→Plan、具名项目→Project Gate、歧义→NEEDS_CONTEXT。 | cross-product fixtures |
| ASSERT-005 | Given无 pin，When startup、prompt、Read/Grep/Glob/Bash，Then均不读取或穿越共享项目状态。 | dual-harness live probes |
| ASSERT-006 | Given switch/new 每个失败边界，When执行，Then旧 pin/link/state tuple完整保留。 | fault-every-boundary |
| ASSERT-007 | Given一轮以 epoch A 路由，When中途尝试切 B，Then工具与 Stop 拒绝跨 epoch，切换只在专用新轮提交。 | turn lease race test |
| ASSERT-008 | Given项目目录 rename/symlink/inode swap，When读取，Then身份校验失败且不落到替换对象。 | inode/symlink faults |
| ASSERT-009 | Given patch body含路径字面量，When adapter处理，Then只检查 control headers，body byte hash不变。 | byte comparison |
| ASSERT-010 | Given malformed/move/escape patch，When处理，Then fail-closed，且恢复文案不要求另一 harness 独有工具。 | negative fixtures |
| ASSERT-011 | Given L1–L5 与 route/non-route，When关闭纠正，Then required evidence 由 attribution matrix 派生且无多余实体。 | matrix exact-set |
| ASSERT-012 | Given旧 receipt、错 ticket、恒成功 verifier、改写 evidence，When关闭新 ticket，Then全部拒绝。 | replay/forgery suite |
| ASSERT-013 | Given gate proposal，When assistant/child/旧 user turn/错 hash/nonce/expiry回复，Then零 mutation；只有新的 exact user turn通过。 | gate replay suite |
| ASSERT-014 | Given Claude/Codex 四 logical roles，When live spawn，Then每端产生四个 distinct native child edges 与绑定定义/input/output/log hash 的 receipt。 | native event graph |
| ASSERT-015 | Given missing role、wrong matcher、untrusted Codex hook、伪 log/self key，When验证，Then均失败。 | hermetic + live mutants |
| ASSERT-016 | Given approved census，When删除任一 source pointer 或未登记 MUST，Then reverse coverage checker非零。 | denominator mutation |
| ASSERT-017 | Given S0 rule，When填 degraded 或 model-only，Then schema/checker拒绝。 | schema mutants |
| ASSERT-018 | Given repo/CI、local harness、global state 三验证 lane，When一 lane NOT_RUN/UNKNOWN，Then aggregator不得输出 PASS。 | result lattice tests |
| ASSERT-019 | Given直接修改稳定记忆或无 promotion receipt 的同步，When guard/precommit/sync运行，Then拒绝提交与推送。 | provenance negative test |
| ASSERT-020 | Given同路径含未知 WIP hunk，When stage/land，Then `BLOCKED_DIRTY_OVERLAP`，不暂存整文件。 | hunk ownership test |
| ASSERT-021 | Given ahead commits、多 remote，When请求 push，Then proposal绑定 URL/refspec/before/after/exact commit range/force=false。 | remote descriptor read-back |
| ASSERT-022 | Given open-design，When用户选择 design system，Then不回写通用 skill、不硬编码产品 token，偏好按归属门处理。 | source/diff negatives |
| ASSERT-023 | Given formal PR review 与 stale harness claims，When双端路由，Then都有可达入口，minimal/global-hook/独有恢复建议不再矛盾。 | route + text mutants |
| ASSERT-024 | Given activation每个写边界注错，When执行，Then零写或按 reverse DAG 恢复 old hash，禁止 reset/clean。 | fault matrix + journal |
| ASSERT-025 | Given主 verify、pre-commit、CI，When运行，Then各自只报告真实执行集合，不继承其它 lane PASS。 | execution-set receipts |
| ASSERT-026 | Given Cycle 2 旧计划，When本计划完成，Then输出 overlap/delta 报告并阻止旧 shared-owner task直接执行。 | stale-plan checker |
| ASSERT-027 | Given live activation，When fresh Claude/Codex session启动，Then project/meta/correction/agent/memory/Git probes 全过且 trust state可见。 | fresh-session suite |
| ASSERT-028 | Given 15 DEV/TST 与所有 BLOCKING assertion，When最终汇总，Then缺任一独立 TST/receipt或存在 UNKNOWN 均不能发布终态。 | final aggregator |

## 6. Dev / Test Task Cards

### DEV-001 — 冻结 dirty ownership 与创建隔离执行基线

- Source：`inline: 用户要求最终计划后再审计`；system review E-01..E-05。
- model_tier：`core-execution`。
- Files：本计划包、ownership census、package descriptor；不改 tracked dirty。
- Approach：PREP只读记录 HEAD/index/worktree/remote refs，并按 hunk 指纹标 `known-plan/unknown/user`，生成将写入Cycle 2 FINAL/HANDOFF header的exact patch与package descriptor；TST-001 PRE验证parent、proposed exact-set和全部unrelated dirty。G-PACKAGE后EXEC才应用exact patch、提交批准blob set，并从该package commit建fresh worktree与临时HOME；TST-001 POST重新读取commit/tree/worktree。
- Gate：先展示 proposal descriptor、parent、proposed exact-set 和全部 unrelated dirty，再等 G-PACKAGE；门前禁止stage/commit/header写入。
- Rollback：G-PACKAGE 前零 Git 写；commit 后只允许新 revert commit，不 reset。

### TST-001 — Package 与 WIP 隔离

- Assertions：ASSERT-001、ASSERT-002、ASSERT-020。
- Tester：未参与 DEV-001 的独立上下文。
- Pass：PRE=`PACKAGE_PROPOSAL_PASS`且确认门前Git与header零变化；POST=`PACKAGE_ISOLATION_PASS`且commit/tree只含批准blob、fresh worktree parent精确；任一unknown hunk进入commit即FAIL。

### DEV-002 — 按 live census 隔离 unsafe resolver

- Source：system review §7；Round 1 B12；Cycle 2 ADR-GATE-001。
- model_tier：`core-execution`。
- Files：隔离 worktree 内 stub/descriptor/checker；G-CONTAIN 后只写 proposal 列出的实际 discoverable global targets。
- Approach：PREP只读live census Claude/Codex route与target，冻结old/stub hash、backup、CAS、失败终态并产proposal；TST-002 PRE验证descriptor、stub与拒绝错误批准。G-CONTAIN后EXEC才原子换fail-closed stub；不存在的Codex target保持absent并关闭错误route；TST-002 POST从实际可达入口重测。
- Rollback：开始前失败零写；开始后 roll-forward 到 stub/absent，旧危险真身只进不可发现备份。

### TST-002 — Resolver 穿透与 target drift

- Assertions：ASSERT-003、ASSERT-013。
- Tester：独立安全验证上下文。
- Pass：PRE确认descriptor闭合且未写target；POST确认direct/semantic/nested均不能触发abort/stage/commit/continue，错target/hash/replay全拒绝。

### DEV-003 — 建立 meta/project/ambiguous 三分路由

- Source：user exact prompt；system review E-01；Round 1 A7。
- model_tier：`core-execution`。
- Files：route guard、routing fixtures、route tests；不复制第二份路由散文。
- Approach：先判断 explicit downstream identity，再判断 pure framework meta；混合且对象不清返回 NEEDS_CONTEXT；之后才算 Plan complexity。
- Rollback：revert 精确 commit；保留新增现实 fixture。

### TST-003 — 路由交叉积

- Assertions：ASSERT-004。
- Tester：独立 route reviewer。
- Pass：至少 12 pure-meta、12 project、12 mixed；精确用户原句为 Plan，具名项目 meta 为 Project Gate，歧义为 NEEDS_CONTEXT。

### DEV-004 — 把 project pin 改为身份事务与 turn epoch

- Source：Round 1 A4/A5/A6/A8；Cycle 2 project transaction decision。
- model_tier：`core-execution`。
- Files：project substrate、scope guard、session restore、route guard、project script、Claude/Codex adapter 与 tests。
- Approach：移除 PreTool 预写；project script prepare→validate identity→links/state read-back→commit pin。状态机固定为 `NO_PIN|BOUND(project,epoch)|SWITCH_ONLY(tx,expected_epoch,target)|BOUND(target,epoch+1)|TURN_ACTIVE(epoch)|TURN_CLOSED`。显式switch prompt先进入SWITCH_ONLY；本轮只允许一条带tx+expected_epoch的project switch/new mutation，成功后CAS提交epoch+1并强制terminal，失败保留旧BOUND；任何其它project tool或同轮继续工作均拒绝。下一顶层user turn才进入TURN_ACTIVE(epoch+1)。pin绑定canonical ID、realpath/device/inode；工具与Stop必须匹配turn snapshot。无 pin 时共享项目读写均fail-closed，框架搜索排除展示软链。
- Rollback：事务失败保留旧 tuple；stale lease 只允许明确人工 recovery，不按时间偷锁。

### TST-004 — Project fault/concurrency/turn matrix

- Assertions：ASSERT-005、ASSERT-006、ASSERT-007、ASSERT-008。
- Tester：独立双 session harness。
- Pass：每个写边界、并行 session、same-session mid-turn、rename/symlink/inode swap 均符合断言。

### DEV-005 — 修正 Codex patch target 与恢复合同

- Source：system review E-03；Cycle 2 patch contract。
- model_tier：`core-execution`。
- Files：Codex adapter、独立 patch header parser、scope guard接口、adapter tests。
- Approach：保留真实 `apply_patch` 语义；只解析 control header target并逐目标调用 guard；正文原字节透传；malformed/move/escape fail-closed；恢复提示只给当前 harness 可执行动作。
- Rollback：parser异常只禁 patch，不影响只读与 Bash。

### TST-005 — Patch byte 与负例矩阵

- Assertions：ASSERT-009、ASSERT-010。
- Tester：独立 parser reviewer。
- Pass：literal/multi-file/rename/malformed/escape/symlink/native-event 全过，body hash完全相同。

### DEV-006 — 以 attribution matrix 取代 correction marker

- Source：correction-attribution 唯一真值；Round 1 A1/A2/A3。
- model_tier：`core-execution`。
- Files：correction ticket schema、fixed verifier registry、close script、Stop hook、tests。
- Approach：hook先发 O_EXCL ticket，绑定 event/session/prompt hash/nonce/created_at；required evidence 由 L1–L5 + route bit机械派生。L1披露；L2受影响 artifact；L3 observation/rule或候选；L4 candidate；L5 fix/task pointer；route额外 fixture。ticket只接受 verifier enum，不接受命令。receipt绑定ticket/evidence hashes并一次消费。
- Rollback：迁移期旧 marker仅提示；从本任务开始不具放行权。

### TST-006 — Correction 合法矩阵与伪造攻击

- Assertions：ASSERT-011、ASSERT-012。
- Tester：独立 correction reviewer。
- Pass：所有合法 L1–L5 最小证据可闭合；缺证据、多余伪实体、replay、恒成功 verifier、错 session/nonce/hash均失败。

### DEV-007 — 统一 human gate proposal→binding→result

- Source：Cycle 2 `ADR-GATE-001`；Round 1 C2。
- model_tier：`core-execution`。
- Files：共享 gate schemas、proposal/recorder/verifier、receipt root tests。
- Approach：复用 exact reply `APPROVE <gate> <proposal_sha256> <nonce>`；proposal绑定计划与payload SHA/expiry；只有 proposal 后新的顶层 user turn可生成 O_EXCL binding；result单向绑定binding和read-back。明确 trusted-main 边界。
- Rollback：无新顶层 user event 即 BLOCKED；不建 approval-file fallback。

### TST-007 — Human gate replay/forgery

- Assertions：ASSERT-013。
- Tester：独立 gate reviewer。
- Pass：assistant/tool/child/旧turn/错session/错nonce/过期/normalized/replay全部零 mutation。

### DEV-008 — Claude/Codex native logical roles 与证据

- Source：system review E-02；Round 1 C4/C5/C6；Cycle 2 native agent ADR。
- model_tier：`core-execution`。
- Files：Claude plan/work/oracle/QG权威定义、Codex TOML指针、launcher、work-packet schema、agent parity/wiring tests。
- Approach：两端都从同一角色合同投影；模型只按 effort tier；fresh dispatcher真实 spawn distinct child；receipt绑定definition/input/output/native-log hash、nonce、parent/child ID。native-impossible 只限 slash/Workflow/widget/沙箱事件差异，missing role/trust/matcher 不得降级。
- Rollback：definitions先 dormant；live proof前无 route 指向。

### TST-008 — Native role 与伪 receipt 攻击

- Assertions：ASSERT-014、ASSERT-015。
- Tester：独立 harness reviewer。
- Pass：两端四角色 live edge；missing/rename/wrong effort/replay/self key/fake log/untrusted hook/wrong matcher 全失败。

### DEV-009 — 建立 obligation census 候选

- Source：user“很多规则没有执行”；Round 1 B1/B2/B5。
- model_tier：`core-execution`。
- Files：source-manifest verifier、census generator、candidate census、classification report；不修改 canonical rule正文。
- Approach：先重算 `obligation-source-manifest.json` 的root规则、exact paths与hash，任何drift先delta；再逐条建立source anchor并合并live global route targets；人工审查未编号MUST/红线与分类；生成不可缩denominator、未决项和native-impossible/missing-wiring表。完成后proposal同时绑定source manifest、live targets与census SHA并停下。
- Rollback：用户未批准只保留候选报告，不接任何 gate。

### TST-009 — Census 反向覆盖

- Assertions：ASSERT-016、ASSERT-017。
- Tester：独立规则审计上下文。
- Pass：删任一源、漏一条已批准 MUST、把 S0 标 degraded/model-only均失败；taste 未决保持 UNKNOWN并阻断批准。

### DEV-010 — 接通 obligation compiler、receipt ledger 与三验证 lane

- Source：approved census；Round 1 B3/B4/B5。
- model_tier：`core-execution`。
- Files：pointer-only index、invocation compiler、result ledger、reverse checker、mutation kill matrix、verify/precommit/CI集成。
- Approach：任务启动按 trigger编译适用清单；每条只能 PASS/N/A/BLOCKED/DEGRADED/NOT_RUN/UNKNOWN并带证据；repo hermetic、local live、global external分 lane；checker验证真实 hook matcher/trust/native入口，不以文件存在代替；mutant集冻结生产入口与预期 kill。
- Rollback：compiler异常 fail-closed 仅针对 S0/S1；其它报告 BLOCKED，不伪 PASS。

### TST-010 — Obligation 生产入口 mutation

- Assertions：ASSERT-015、ASSERT-016、ASSERT-017、ASSERT-018、ASSERT-025。
- Tester：独立 mutation reviewer。
- Pass：删 matcher/trust/consumer/receipt/source/real behavior均被指定 mutant杀死；任一 NOT_RUN/UNKNOWN不聚合 PASS。

### DEV-011 — 机械守护稳定记忆晋升链

- Source：SC-20260523-003；system review §6；Round 1 B6/B7。
- model_tier：`core-execution`。
- Files：promotion receipt/schema、memory guard、precommit、memory health、sync script与tests。
- Approach：任何稳定记忆 diff必须绑定candidate/review/promotion-ready receipt；直接编辑、结构合法伪记录与脚本间接写均拒绝。sync移除autostash、FAST_COMMIT和不存在remote假设，不得自动stage稳定文件或push。
- Rollback：promotion tool异常保持candidate，不改变stable store。

### TST-011 — Memory provenance 与 sync 穿透

- Assertions：ASSERT-019。
- Tester：独立memory reviewer。
- Pass：direct/script/合法YAML/伪receipt/FAST_COMMIT/错remote全部失败；合法promotion链通过。

### DEV-012 — 统一 Git closeout 与 remote gate

- Source：CLAUDE/correction Git冲突；Round 1 B8..B11。
- model_tier：`core-execution`。
- Files：单一 Git policy、CLAUDE/AGENTS/纠错协议指针、Git descriptor/receipt checker、相关脚本。
- Approach：已批准计划内local exact commit不二次Plan；fetch只读可自动，pull/rebase/conflict/history/force始终人门；push永远经G-REMOTE。stage按blob/hunk ownership，不按path；remote proposal绑定URL/refspec/before/after/exact ancestry/force=false。没有origin不得猜。
- Rollback：local用新revert commit；远端只按人批descriptor补偿，绝不force猜修。

### TST-012 — Dirty/ahead/multi-remote Git 对抗

- Assertions：ASSERT-001、ASSERT-002、ASSERT-020、ASSERT-021。
- Tester：独立Git fixture reviewer。
- Pass：同文件WIP、ahead ancestor、wrong remote/ref、changed URL、non-FF、force、replay均阻断；exact descriptor成功后read-back一致。

### DEV-013 — 清理产品中性、review fallback 与陈旧诊断

- Source：system review §7；Round 1；routing redteam findings。
- model_tier：`core-execution`。
- Files：open-design skill、routing-chain check、model routing、harness/adapter/verifier注释与对应checker。
- Approach：移除通用skill对个人DS偏好的写回和产品token硬编码；正式PR review给Codex可达fallback；统一minimal/low、仓库hook注册和当前harness恢复文案。skill修改先过authoring/invariants。
- Rollback：每个主题独立commit；任一skill gate失败不影响其它主题。

### TST-013 — Product-neutral 与双端可达

- Assertions：ASSERT-022、ASSERT-023。
- Tester：独立skill/routing reviewer。
- Pass：选择偏好不改skill；无profile不出现产品token；正式review两端可达；删fallback或恢复陈旧字样checker失败。

### DEV-014 — Activation journal、全量 rehearsal 与 live cutover

- Source：Cycle 2 activation ADR；Round 1 C；approved obligation census。
- model_tier：`core-execution`。
- Files：activation descriptor/journal/CAS/reverse-DAG runner、full acceptance aggregator；live targets只在G-ACTIVATE后写。
- Approach：PREP在隔离HOME与fresh Claude/Codex对候选commits运行全量lane和每个写边界fault rehearsal，冻结old/newhash、routes、rollback、receipts与activation descriptor；TST-014 PRE验证rehearsal和门前live hash零变化。G-ACTIVATE后EXEC才按journal切换，先关闭route、CAS换target、read-back、再开放；任一失败逆序恢复；TST-014 POST在fresh两端重开会话读回。
- Rollback：禁止reset/clean/stash；global target用backup+CAS+atomic rename，repo用exact revert。

### TST-014 — Activation fault matrix 与 fresh session

- Assertions：ASSERT-024、ASSERT-025、ASSERT-027。
- Tester：未参与activation实现的独立质量门。
- Pass：PRE确认每个写边界注错均零写或exact恢复且live未变；POST确认journal result、old/new hash和fresh两端全部S0/S1与代表性S2 probes通过。

### DEV-015 — Cycle 2 delta、最终证据包与 remote descriptor

- Source：本计划 §1.3；Round 1 C1/C3；user最终审计要求。
- model_tier：`core-execution`。
- Files：Cycle 2 overlap/delta report、final evidence manifest、completion report、G-REMOTE proposal。
- Approach：PREP标记Cycle 2 shared-owner任务需消费本基线并失效旧descriptor，汇总15个独立TST、28断言、所有gate/receipt；只有零UNKNOWN且live read-back通过才生成G-REMOTE proposal。TST-015 PRE验证remote URL/refspec/before/after/exact ancestry/force=false且门前remote不变。G-REMOTE后EXEC才推送exact descriptor；TST-015 POST从remote重新fetch/read-back并裁决终态。
- Rollback：未批准remote时保持local candidate branch，状态为 `VERIFIED_LOCAL_NOT_PUBLISHED`，不冒充最终DONE。

### TST-015 — 最终独立聚合

- Assertions：ASSERT-026、ASSERT-028及所有前序BLOCKING断言。
- Tester：冷上下文final judge。
- Pass：PRE确认Cycle 2旧shared-owner入口被阻断、15/15独立TST、28/28断言、前序gate receipts与fresh sessions齐全且remote未变；POST确认push result与remote read-back匹配exact descriptor，唯一终态`RULE_EXECUTION_VERIFIED`。

## 7. Human Gates

### G-PLAN

当前用户审计门。proposal必须绑定本Plan/manifest/redteam/final-judge/source-manifest SHA、随机nonce与expiry；唯一批准字节为：
`APPROVE G-PLAN <proposal_sha256> <nonce>`。任何修改使proposal失效并重跑最终判官。

### G-PACKAGE

只批准计划包 exact blob set 的local package commit与fresh worktree；不批准tracked dirty、runtime或push。

### G-CONTAIN

只批准 live census 中实际可达resolver target换fail-closed stub；不批准安全candidate激活。

### G-OBLIGATION-SCOPE

用户逐项裁决 census 的遗漏、class、native-impossible/missing-wiring与degradation；只绑定 exact census SHA。

### G-ACTIVATE

展示candidate commits、live target old/new hash、route diff、rehearsal receipts与reverse rollback；只批准exact descriptor。

### G-REMOTE

展示remote name+URL、refspec、before/after SHA、将发布的完整commit ancestry、force=false与read-back；不批准其它远端变化。

## 8. Verification Lanes 与结果格

| Lane | 环境 | 可以证明 | 不能证明 |
|---|---|---|---|
| L1 Hermetic | CI/临时仓 | schema、fixtures、mutation、确定性行为 | 本机trust/global/真实user turn |
| L2 Local Live | fresh Claude/Codex | hook trust、native role、route、session、patch | 远端与global mutation安全 |
| L3 External | global targets/Git remote | CAS、global read-back、remote ref | 模型输出质量 |

聚合格固定：`PASS | NOT_APPLICABLE | BLOCKED | DEGRADED | NOT_RUN | UNKNOWN`。只有所有适用 BLOCKING cell
为 PASS，且无 UNKNOWN/NOT_RUN，才能进入下一阶段。S0/S3 禁止 DEGRADED。

## 9. Quality Criteria

```yaml
criteria:
  - "[C1] 没有任何规则仅因文件或anchor存在被判执行成功"
  - "[C2] native-impossible 与 missing-wiring 有逐项证据，后者不能使用degraded"
  - "[C3] 未经exact人类门，不改变用户WIP、global target、Git remote或项目身份"
  - "[C4] obligation index只存canonical pointer，不成为第二份规则正文"
  - "[C5] correction最小证据与L1-L5现行协议一致，且旧证据不可重放"
  - "[C6] 本计划与Cycle 2只有明确source/import关系，不存在两个owner实施同一文件"
  - "[C7] 任何UNKNOWN、NOT_RUN或未裁决taste项都显式阻断DONE"
```

## 10. Failure / Replan

- BLOCKING assertion首败：修同一 U-block，重跑该TST和受影响全量lane。
- 同根因第二败：强制独立refuter检查测试是否自认证。
- 同根因第三败：`BLOCKED`，报告reason/attempted/recommendation，不继续循环。
- Plan SHA、批准payload、canonical HEAD、remote URL、global target或obligation census任一漂移：追加delta并重新过相关人门。
- taste型发现不得自动修；oracle型最多自动修一次，随后全量复检。

## 11. Completion Contract

计划包终态：`READY_FOR_USER_AUDIT`，不等于实现完成。  
本地实现终态：`VERIFIED_LOCAL_NOT_PUBLISHED`，不等于远端完成。  
唯一全局终态：`RULE_EXECUTION_VERIFIED`。

`RULE_EXECUTION_VERIFIED` 必须同时具备：15/15独立TST、28/28 BLOCKING assertions、7/7 criteria、
所有适用obligation cell PASS、fresh Claude/Codex read-back、G-ACTIVATE与G-REMOTE result receipt、
Cycle 2 delta阻断旧shared-owner入口。任何缺口只能报告BLOCKED或DONE_WITH_CONCERNS。

<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->
