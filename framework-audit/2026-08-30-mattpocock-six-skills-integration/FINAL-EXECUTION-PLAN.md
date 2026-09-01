# Matt Pocock 六项工程能力纳入 Luca：最终执行计划

> **SUPERSEDED：** 本稿因把通用受控变更基础设施与六项安装揉成一套过度设计而停止执行。唯一当前计划见同目录 `FINAL-MASTER-PLAN.md`；本文件只保留审查历史，不得作为实施授权。

日期：2026-08-30  
状态：`CANDIDATE_UNDER_REVIEW`；只有 REVIEW-LEDGER 对本文同一 SHA 记录全部门 `PASS` 后，外部状态才可宣布 `READY_FOR_APPROVAL`  
计划对象：`resolving-merge-conflicts`、`to-spec`、`implement`、`wayfinder`、`diagnosing-bugs`、`grilling`  
当前仓库基线：`4658595ac20ce544cb406657c70ba3259eb1f842`  
上游冻结：[`mattpocock/skills@6654f6b`](https://github.com/mattpocock/skills/commit/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76)
预期发布目标：remote=`upstream`，URL=`https://github.com/wangmoumou1216-ai/luca_gstack.git`，refspec=`refs/heads/main:refs/heads/main`，old OID=`4658595ac20ce544cb406657c70ba3259eb1f842`

> 本文是实施授权前的唯一计划。用户确认前不安装、不迁移个人 skill、不提交或推送。
> 旧评估与审查稿只作证据；若与本文冲突，以用户最新意图和本文为准。

## 0. 结论先行

六项能力都应进入 Luca，但不应把六份上游正文原样塞进框架。最小且完整的形态是：

- 六个都保留同名、可直接触发的 Claude/Codex 入口；
- 三个独立方法体：`diagnosing-bugs`、`resolving-merge-conflicts`、`grilling`；
- 三个薄 facade：`to-spec` 复用 `tech-spec(synthesis)`，`wayfinder` 复用 Plan Agent 具名 mode，`implement` 复用 Plan Agent 编译 + Orchestrator 执行；
- 只有 `implement` 成为正常代码主链节点；`wayfinder` 是条件前置，`diagnosing-bugs` 与 resolver 是异常回路，`grilling` 是按需 HITL 决策门；
- 执行前先有一个窄的可审计 bootstrap：用户另行批准精确 patch SHA 与 maintenance window 后，已清空并发 agent/tool 的 owner session 只安装 fail-closed guard、task lease 与一次性 controller；后续所有 live mutation 才进受控事务；
- 任何 tracker 只可作为未来可重建 projection，不能取代 Luca 的 plan、stable ID、项目 docs 与 handoff；
- 上游的自动 commit、自动 stage/continue、`never --abort` 和整批追问行为不进入 Luca。

### 0.1 第一性裁决表

| 上游能力 | 应否纳入 | Luca 落点 | 与现有能力关系 | Flow 位置 |
|---|---|---|---|---|
| `resolving-merge-conflicts` | 是，安全改写 | 项目一级 skill | 替换当前 personal containment stub 的实际解析目标；不继承危险 Git 自动化 | Git conflict interrupt，非主链 |
| `to-spec` | 是，薄入口 | facade → `tech-spec` conversation synthesis mode | 不新增第二份 spec 真值或产物路径 | 投影为 canonical `tech-spec(synthesis)` 节点 |
| `implement` | 是，具名执行 facade | task-plan → Plan Agent frozen-source compile → Orchestrator | 把匿名 execution 正名；Plan Agent 仍规划，Orchestrator 仍只执行 | `task-plan → implement → code-review` 主链 |
| `wayfinder` | 是，薄入口 | facade → Plan Agent `wayfinder` mode | 把已吸收的 fog 词汇升级为可调用、可恢复能力 | 仅 huge、multi-session、fog 三者同时成立时前置 |
| `diagnosing-bugs` | 是，合并升级 | 项目 canonical skill | 吸收并取代自然语言路由中的 `systematic-debugging`；旧名成为兼容指针 | 非预期失败/回归异常回路 |
| `grilling` | 是，独立 primitive | 项目交互 skill | 不替换 brainstorm/challenge/redteam；专管依赖化用户决策 | wayfinder/spec/plan 的按需 HITL 门 |

判断“是不是 flow node”只看三件事：是否拥有独立持久状态、独立权威产物、不可跳过阶段门。
`implement` 是现有 Plan/Orchestrator 执行阶段的具名节点，但不是新的方法正文或状态所有者；其余能力应作为入口、模式、门或异常边，避免图把 skill-first 反客为主。

### 0.2 三层触发合同（六项全部强制）

安装成功不等于“目录存在”，也不等于“用户必须背出 skill 名”。六项必须同时通过以下三条入口：

| 层 | 含义 | 机械验收 |
|---|---|---|
| `direct` | 用户明确说出 skill 名；Claude native/command 与 Codex `$skill` 都加载项目 canonical tree | 两个 fresh harness 的 resolved path + content SHA receipt |
| `semantic` | 用户只用自然语言描述意图，不出现 skill 名；Project Gate 先行，复杂请求可先返回 Plan Mode + skill recommendation，简单请求才允许 single-skill | 每项窄正例、相邻负例、多候选 STOP、route-order fixture |
| `internal` | 已授权任务或已选 flow 执行中，Plan Agent、Orchestrator 或调用 skill 根据可观测条件自主 dispatch，不要求用户再次点名 | caller、条件证据、控制器签发的 authority record、异常回原 U-ID 的 live trace |

每项 internal 条件与授权边界：

| Skill | 自主触发条件 | 触发后的权限边界 |
|---|---|---|
| `wayfinder` | Plan Agent 同时确认 `huge AND multi-session AND fog` | 只整理路线/决策图；不能伪造执行 U-block |
| `grilling` | 任一调用方发现依赖已清、机器不可代选的人类决策 | 停下且每轮只问一个决定；回答不授权代码或外部动作 |
| `to-spec` | 已选 engineering-delivery flow 到 synthesis，且上游讨论/决策已足够 | 只在父任务已授权的产物范围内写 canonical tech-spec；未决项返回人类门 |
| `implement` | 已有获批 task-plan/U-ID 且父任务明确授权进入实现 | 只执行获批范围；不能自行扩大 scope、commit 或 push |
| `diagnosing-bugs` | 执行中出现非预期 failure/regression，且不是 expected TDD red | 默认 diagnose-only；修复需继承有效 implement 授权或另获授权 |
| `resolving-merge-conflicts` | Git 实际存在 unmerged paths/in-progress conflict | 可自动进入只读 inspect/propose；edit/stage/advance/abort 各自另守授权门 |

自主 dispatch 只决定“使用哪套方法”，绝不凭空扩大 mutation、项目、Git 或 external-system authority。`authority_record_sha256` 不是 caller 可填写的自由字符串：只有处在用户确认边界、已清空并发 subagent/tool 的 owner session 能以获批 Plan/U-ID/effect 启动 §5.0.2 的单次 controller action；Orchestrator/skill/worker 只能消费被缩小的不透明记录，不能签发。任一项只能 direct、不能 semantic/internal，整批安装即 FAIL。

## 1. Block 0 — 前提门

### 1.1 该不该解

应该。真实问题不是少了六个目录，而是六项能力目前分别处于不可触发、只吸收概念、路由指向旧外部实现、或缺少代码流程接缝的状态；“概念已吸收”不能替代可调用、可执行和可验证。

### 1.2 更小替代

直接复制六份上游 `SKILL.md` 不是更小方案：它会制造第二份 spec/plan/debug 真值，并引入与 Luca 冲突的 tracker、Git 和人类门语义。只在现有 skill 内再补几句也不够，因为用户仍无法按六个名称直接调用。六个具名入口、三个独立方法体、三个复用既有 SSOT 的 facade 是最薄完整方案。

### 1.3 默认形态偏差

默认形态“六个具名入口”把秤压向 discoverability，可能增加 skill catalog 的 context/cognitive load；反向复核必须以“现有入口已经够用，新增 surface 默认无价值”为立场，逐项证明真实缺口。resolver stub 替换和 debugging 路由替换还须以 `REFUTED` 为默认审查姿态，只有行为证据能推翻。

### 1.4 Kill assumptions

- `KILL-1`：Claude native skill、slash command、Codex `.agents/skills` 的实际优先级仍与 2026-08-28 活体结果一致；fresh session 若不同，双 harness 接线作废并增量重规划。
- `KILL-2`：`tech-spec` 能在不改变既有 Phase 顺序和输出路径的前提下加入 synthesis mode；若不能，不得另造第二套 spec，必须重规划 adapter。
- `KILL-3`：`task-plan` 能增加纯工程 `design_scope: N/A` 输入分支而不让 UI/交互任务绕过 design-brief；一旦负例能绕门，本方案作废。
- `KILL-4`：同名 personal/plugin/bundled collision 均可先只读枚举并可恢复迁移；出现未知覆盖源时停在 `NEEDS_CONTEXT`，不覆盖。
- `KILL-5`：optional graph 能表达条件前置与异常回路而不建立第二套 workflow state；否则保留 standalone 接线，回滚 graph 增量。
- `KILL-6`：上游冻结 SHA、六份文件 bytes 与 MIT lineage 可复验；任一漂移先重新冻结再实施。
- `KILL-7`：Claude/Codex 的真实 PreToolUse 路径能在 hook 异常、超时与另一 session 竞态时对本仓 mutation fail-closed；`U-000` fresh live test 若不成立，安装在写入其他 runtime path 前立即作废。

## 2. 来源冻结与净新增价值

冻结 commit：`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`，提交日期 2026-08-24。此前 2026-08-11 评估所用 pin 为 `84fdeffd12f2ee307994d1eb6feb48173b6e0502`；本计划重新审查了当前 bytes，不沿用旧结论代替复核。

| Skill | 上游文件 | SHA-256 | Luca 保留的核心 |
|---|---|---|---|
| resolver | [`engineering/resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/resolving-merge-conflicts/SKILL.md) | `9d8114f8ef0b31f535a265fc05c364bd8cf2e2895a830040e06c22acb11f54b0` | 先找双方 primary intent，再逐 hunk 解决与验证 |
| to-spec | [`engineering/to-spec`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/to-spec/SKILL.md) | `43ad9cf318e5e7d3d1fa360253a37021796dc87a0c2e595ad262661a10f85088` | 已讨论清楚后不重新 discovery，直接合成工程合同与测试 seam |
| implement | [`engineering/implement`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/implement/SKILL.md) | `6d3fd9e83b8f36e5213854779db49b256a457a7ebb4a503e53fa7dcff696adc3` | 按批准来源执行、持续验证、末尾 code review |
| wayfinder | [`engineering/wayfinder`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/wayfinder/SKILL.md) | `fee6e1d0c50f0e736b4ef8a599060c959afae904c9a97d82c97f049fcc3aa0f1` | destination/fog/decision frontier；先清路线，不伪造执行任务 |
| diagnosing | [`engineering/diagnosing-bugs`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/engineering/diagnosing-bugs/SKILL.md) | `77f3cf31bc99b2f49af943222526531fcc9fc41d047626d3640e875e85af3e84` | 理论前先建立已跑过、命中精确症状的 red-capable feedback loop |
| grilling | [`productivity/grilling`](https://github.com/mattpocock/skills/blob/6654f6b60cd9d5be8b54c6fafe44346dabeb3b76/skills/productivity/grilling/SKILL.md) | `10ff989e7498b23b5acb49d5048f11dcd906757d2f79c5cdf8a00001381296f2` | 事实归 agent、选择归用户，按决策依赖清空 frontier |

明确拒绝：

- resolver 的 `Always resolve; never --abort` 和自动 stage/commit/continue；
- implement 的自动 commit；
- to-spec/wayfinder 的外部 tracker canonical 与自动 label/issue 发布；
- grilling 当前上游“一轮询问整个 frontier”；Luca 永远保留一次一个用户问题；
- wayfinder 的并发 ticket claim 在没有机械 CAS/lease 前不宣称支持。首版支持跨 session 串行恢复，禁止并发写同一 decision map。

## 3. Block 1 — 复杂度与覆盖

```text
复杂度模式: Hierarchical
理由: 六项能力跨 skill authoring、Plan Agent、tech-spec/task-plan、Orchestrator、Git 安全、路由、个人覆盖迁移与双 harness 活体验收。
模式可组合: Sequential 外层 + 能力体 Parallel Fan-out + 每 Phase Supervisor quality gate
需要用户确认: 是
任务规模 Tier: Deep
```

研究编排：冻结上游源码和本仓结构已足以回答本次工程适配问题；它不是新市场/UX/学术问题，故不再追加 deepresearch/ux-research。实施前只重验 SHA、同名覆盖和 dirty owner，不扩研究范围。

Block 1.5 / 1.6：不适用。本任务没有产品 `task-plan.md` 输入；以下逐字引用用户输入，解释与原文分栏，U-block 只引用稳定 `USR-ID`。

| Source | 用户逐字原话 | Interpretation | U-block 覆盖 |
|---|---|---|---|
| `USR-001` | “但如果对方确实做得好，从价值角度来看，我需要将它们纳入到我的开发流程中。” | 六项不能被旧评估一句话否决，须逐项保住净新增价值 | `U-002..U-007` |
| `USR-002` | “首先从第一性原理上来讲，它是不是应该安装，如果它要安装的话，那是替换关系还是新增关系，以及它是否应该进入我的一个代码流程” | 逐项判断安装、替换/新增与 flow 身份 | `U-002..U-008` |
| `USR-003` | “应该把这些 Skill 怎么安装？安装到什么地方？和我现在的 Skill 是什么关系？” | 文件落点、现有 SSOT 与兼容关系必须具体 | `U-001,U-004,U-005,U-008,U-009-a` |
| `USR-004` | “从第一性原理判断是否应该加，然后如果加，claude和codex必须都能用” | 双 harness 真实加载，不以静态文件充抵 | `U-009-a,U-009-b,U-010,U-011-a,U-011-b,U-011-c,U-012` |
| `USR-005` | “当然不能硬塞，如果你觉得有替代方案且效果更好，那也可以” | facade 优先复用 Luca 真值，拒绝重复正文/状态 | `U-003,U-004,U-005,U-006` |
| `USR-006` | “当我使用自然语言时，可能会触发到这些 Skill；以及当你在执行一些流程时，你也会自主触发到这些 Skill，而不是必须由我主动发起。” | 六项强制 direct/semantic/internal 三层触发，自动选方法但不自动扩权 | `U-008,U-010,U-011-a,U-011-b,U-012` |
| `USR-007` | “继续安装，完成后commit并push” | 用户在真正批准本计划后，安装事务最终包含一次精确、非 force 的 commit/push；不授权提前发布或目标漂移 | `U-013` |

覆盖率：`USR 7/7`，无遗漏。

## 4. 推荐代码流程

```text
[仅 huge + multi-session + fog]
wayfinder → Plan Agent wayfinder mode
      │
      └─ decision frontier 非空 → grilling（每轮一个决策）→ 回 wayfinder
                              ↓ map ready
to-spec facade → tech-spec(conversation_synthesis)
                              ↓
task-plan（产品/UI 仍守 design-brief；纯工程必须显式 design_scope:N/A）
                              ↓
IMPLEMENT_COMPILE_BARRIER（首个 planning revision 只到此）
                              ↓ 冻结 task-plan SHA
implement facade → Plan Agent frozen-source compile → 新 code Plan revision
                              ↓ 人类二次确认 + 新 authority
Orchestrator（只执行新 revision 的 approved U-ID）
   ├─ expected TDD red：留在 TDD，不误报 debug
   ├─ unexpected failure/regression：diagnosing-bugs → 回原 U-ID
   ├─ merge/rebase conflict：resolving-merge-conflicts → 回原 U-ID
                              ↓
code-review（Standards / Spec 双轴）
   ├─ in-scope finding → 对应 U-ID → 再 review
   └─ out-of-scope finding → delta replan / human decision
                              ↓
acceptance + code-hygiene + RTM contract verification
                              ↓
Git commit / push（只属于获批的安装事务，不内建在 implement skill）
```

这条链是 optional `engineering-delivery` preset；用户未选择 workflow 时，六项入口仍可 standalone，graph 不得阻断。standalone 以 task-plan 进入 `implement` 时不伪造 workflow barrier：它创建 `previous_plan_sha256:null` / `supersedes_barrier_id:null` 的 root code revision，绑定 task-plan SHA 后单独请求人类确认和 authority，全程不读 graph 或 workflow-state。

## 5. Block 2 — Phase 与稳定 U-ID

所有 U-ID 一经本计划冻结不重编；拆分使用 `U-NNN-a/b`，删除留空隙。

### 5.0 Phase 执行合同

| Phase | WA 所有权 | EA/quality-gate 所有权 | 顺序 | 精确产出 | 阶段门 |
|---|---|---|---|---|---|
| 0 可信引导 | maintenance-window owner session=`U-000`；先终止所有 subagent/后台 tool/其他 writer | 独立 bootstrap reviewer 审精确 patch SHA；用户二次批准该 SHA 与静默窗口 | `writer census → U-000 → 双 harness fresh restart` | common-dir hash-pinned guard、单次 controller、quarantine manifest、task lease、外部 bootstrap receipt | 未批准或 writer census 非零时零 live write；两端 hook 异常/超时、stale worktree 与长进程反例均在 byte 改变前拒绝 |
| 1 基线+红测 | WA-1=`U-001` 冻结 source/collision/authority；WA-1T=`U-011-a` 建 red-first runner | EA-1 审 preimage、owner、plan/ledger SHA、test causality | `U-001 → U-011-a` | receipt/allowlist baseline；schema/manifest validator；行为 case inventory | 目标 runtime paths 基线干净；必需 case 先红且因果可证；未知 owner 为 0 |
| 2 能力 | WA-2A=`U-002..004`，WA-2B=`U-005..007`；同批文件不重叠，2B 等 2A；全部注入 skill-creator | EA-2 逐项审 defining constraint、SSOT、human gate、安全执行面 | 两批；批内并行 | 六个 canonical skill tree；Plan/tech/task/orchestrator；safe diagnostic/conflict transactions | 每项 case + quick_validate；双 harness live-write bypass 在 mutation 前被拦；无重复正文/悬空 reference |
| 3 Flow | WA-3 只改 graph、routing-chain 与 Plan Agent selected-preset consumer | EA-3 审 runtime consumer、compile barrier、cycle、standalone negative | 串行 | optional preset、planning revision→barrier→code revision/reapproval 与具名/异常边 | 单 fixture 从用户选择到二次授权后首个代码 U-ID；未选时 standalone 不受阻 |
| 4 接线 | WA-4A 项目 alias/compat；WA-4B 路由/治理登记 | EA-4 审 loader precedence、registration closure、route collision | `U-009-a → U-010` | 六项双端项目入口、compat adapter、全部登记面 | static loader/route/registration/self-model 全绿；personal 尚未 cutover |
| 5 验收发布 | WA-5A=`U-011-b` 完成测试；WA-5P=`U-011-c` 只实现 publisher；WA-5B crash-safe adapter swap；WA-5C=`U-013` 才产生 publish effects | EA-5 flow+safety reviewers + final quality-gate | `U-011-b → U-011-c → U-009-b → U-012 → U-013` | receipt、publisher postimage、forward/reverse personal journal、fresh receipts、candidate/evidence manifests、commit/push journal | 同 candidate SHA 三审 PASS；commit tree 精确匹配；index-first lock、immutable OID push、URL isolation 与 unknown-push 收敛实证 |

### 5.0.1 固定 receipt schema

精确路径：

- `framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md`
- `framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-ALLOWLIST.txt`
- `framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-CONTENT-MANIFEST.tsv`
- `framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-EVIDENCE-MANIFEST.tsv`

`IMPLEMENTATION-RECEIPT.md` 必须按以下顶层节名写；字段缺失即 gate FAIL：

```yaml
bootstrap:
  plan_sha256: <approved-plan-sha256>
  patch_sha256: <separately-human-approved-bootstrap-patch-sha256>
  approval_evidence_sha256: <sha256>
  reviewer_verdict: PASS
  postimage_manifest_sha256: <sha256>
  owner_session_id: <harness-session-id>
  repo_lease_path: <git-common-dir>/luca-authority/active-task-lease.json
  dual_harness_restart_verdict: PASS
baseline:
  repo_head: <sha>
  upstream_head: <sha>
  repo_realpath: <absolute-path>
  plan_path: <absolute-path>
  plan_sha256: <sha256-bound-by-review-ledger>
  review_ledger_sha256: <sha256>
  source_sha256: {<skill>: <sha256>}
  target_preimage_sha256: {<repo-relative-path>: <sha256-or-ABSENT>}
  allowlist_sha256: <sha256>
  bootstrap_delta_exact: true
  unowned_runtime_deltas: 0
  publish_target: {remote_name, canonical_url, canonical_url_sha256,
                   destination_ref, exact_refspec, expected_old_oid,
                   pushurl_values: [], pushurl_absent: true}
  skill_creator: {skill_path, skill_sha256, openai_yaml_ref_sha256,
                  quick_validate_path, quick_validate_sha256}
  personal_preimage: {<absolute-path>: {type, sha256, link_target}}
  legacy_debug_tree: [{path, type, mode, sha256, link_target, disposition, reason}]
authority_records:
  - {authority_id, issuer, transaction_nonce, session_id, scope_kind, project_binding,
     approval_evidence_sha256, plan_sha256, approved_uids, allowed_effects,
     effect_allowlist, external_targets, issued_at, expires_at, revoked,
     record_sha256}
static_checks:
  - {id, command, exit_code, stdout_sha256, verdict}
live_receipts:
  - {id, harness, invocation_kind: direct|semantic|internal,
     context: standalone|selected_workflow, skill, fixture_id, caller,
     trigger_evidence, authority_record_sha256, origin_u_id, resume_u_id,
     exception_kind, resolved_path, content_sha256, observed_behavior,
     authority_effect, git_tuple_before, git_tuple_after, verdict}
mutation_receipts:
  - {mutant_id, pre_sha, exact_patch_sha, expected_checker_ids,
     baseline_before_exit, observed_exit, baseline_after_exit, restored_sha,
     verdict}
candidate_manifest:
  path: <repo-relative-path>
  sha256: <sha256>
  excluded_evidence_paths: [FINAL-EXECUTION-PLAN.md, REVIEW-LEDGER.md,
                            IMPLEMENTATION-RECEIPT.md,
                            IMPLEMENTATION-ALLOWLIST.txt,
                            CANDIDATE-CONTENT-MANIFEST.tsv,
                            PUBLISH-EVIDENCE-MANIFEST.tsv]
personal_cutover:
  transaction_id: <plan-sha-derived-id>
  journal_path: <absolute-path>
  source_skill_files: {resolver: <absolute-SKILL.md>, debugger: <absolute-SKILL.md>}
  backup_paths: {<absolute-source-file>: <absolute-backup-file>}
  forward_state: PREPARED|RESOLVER_SWAPPED|DEBUG_SWAPPED|VERIFIED|COMMITTED
  reverse_state: NONE|ROLLBACK_PREPARED|DEBUG_RESTORED|RESOLVER_RESTORED|ROLLED_BACK
  post_cutover_tuple: {<absolute-SKILL.md>: {type, mode, sha256}}
  rollback_fixtures: [{fault_point, visible_catalog_tuple, restored_tuple,
                       second_run_verdict}]
reviews:
  - {reviewer_role, candidate_manifest_sha256, personal_forward_state,
     personal_post_cutover_tuple_sha256, verdict, evidence_path}
publish_request:
  approved_plan_sha256: <sha256>
  approval_gate_id: <id>
  remote_name: upstream
  canonical_url: https://github.com/wangmoumou1216-ai/luca_gstack.git
  canonical_url_sha256: <sha256>
  requested_refspec: refs/heads/main:refs/heads/main
  push_source_policy: immutable_integration_oid
  expected_old_oid: <sha>
  publish_evidence_manifest_path: <repo-relative-path>
  publish_journal_path: /Users/luca/.luca/audit/matt-six-skill-integration-publish-journal.json
  rollback_controller_action: {u_id: U-009-b, action: rollback-personal,
                               attempt_id: <lease-issued-one-time-id>}
  post_publish_attestation_root: /Users/luca/.luca/audit
```

`IMPLEMENTATION-ALLOWLIST.txt` 必须逐行保存 §10 的 repo-relative 精确路径，`LC_ALL=C sort -u` 后冻结 SHA；不得含 glob、目录名或 personal 绝对路径。

`CANDIDATE-CONTENT-MANIFEST.tsv` 只枚举非 evidence runtime paths，逐行记录 `path<TAB>git-mode<TAB>blob-sha256-or-symlink-target-sha256`；它与上述另外五个 evidence 文件（共六个）都不得进入其 denominator。U-012 三审绑定该 manifest SHA。

`PUBLISH-EVIDENCE-MANIFEST.tsv` 逐行记录另外五个 evidence 文件的 `path<TAB>mode<TAB>sha256`，**明确不列自己**。U-013 的同一个 live controller transaction 在构造 commit 前绑定该文件 SHA；receipt 只记录尚未包含 integration OID 的 `publish_request`，所以没有 `receipt → evidence manifest → receipt` 自引用。integration OID 与 `PRE_PUSH/PUSH_SENT/PUSH_REJECTED_PROVEN/PUSH_SENT_UNKNOWN/REMOTE_CONFIRMED/ATTESTED/PUBLISHED_NEEDS_ATTESTATION/PUBLISHED_NEEDS_LEASE_RELEASE` 状态只进外部 durable publish journal。validator 必须用 self-hash mutant 证明 receipt 与 publish manifest 均不存在递归 denominator。actual commit/remote SHA 不写回已提交 receipt；push 后写外部 `/Users/luca/.luca/audit/matt-six-skill-integration-<commit-sha>.json`，其 hash 写到独立 sibling `...json.sha256`，JSON 内不含自己的 hash。

### 5.0.2 Authority record、controller action 与 effect allowlist

- **信任边界说真话**：当前 Claude/Codex harness 没有可验证的“顶层 main 而非同 session subagent”身份，也没有跨 tool call 的 capability FD。因此用户批准后，mutation trust boundary 是**整个 owner harness session**，不是一个无法机械证明的 main-agent 身份。进入 live task lease 前必须终止该 session 的全部 subagent/后台 tool；lease 存续期间 owner session 不得并发启动 agent、shell 或 MCP，唯一可执行面是 controller。controller 自己可在同一进程树里启动受限 scratch worker/read-only reviewer；同 session replay、并发 controller 和越序 action 由 lease 内一次性 attempt CAS 拒绝。真实 same-session subagent replay fixture 必须验证第二个/越序 invocation 在 mutation 前失败。Orchestrator、skill、WA 和 caller 传入的 JSON/ID 均无独立签发权。
- **唯一公开调用语法**：`U-000` 激活后，main/worker/恢复操作者都不得直接运行本计划中出现的 `node`、`npm`、`python3` 或 `git` 命令。hook 只接受无 shell metacharacter、无重定向、参数顺序固定的 `/usr/bin/env -i <frozen-node-realpath> <common-dir>/luca-authority/guard/<bootstrap-sha>/authority-controller.mjs dispatch --plan-sha <sha> --u-id <id> --action <action-id> --attempt-id <lease-issued-id>`。action 必须精确命中下方 registry；不适用的 U-ID/action、额外 argv 与越序状态机械拒绝。`attempt-id` 由前一 durable checkpoint 一次性签发，消费后 CAS 失效；disk receipt 只能审计，不能复活 attempt。checkpoint/`mark-blocked` 是 controller action 内部终态，不是公开 action。本文各 U-block 的 Verification/Block 3 命令均是 controller **内部 command body 规格**，绝不是 lease 期间允许 main 直接执行的命令。
- controller 不是 daemon；每个 action 是一个从 lease CAS 开始、以 durable checkpoint 或 `BLOCKED_AT:<U-ID>` 结束的**单进程树事务**。它在内存中从获批 Plan/U-ID 编译 record/effect，spawn scratch worker、验 patch、apply/postcheck，并在同一进程退出前完成 checkpoint。验证、personal apply/rollback、resolver、publish、ref/network 与失败状态迁移一律是 controller action。普通 main/worker 不得直接调用 transaction module；`skill-cutover-transaction.mjs` 等直接 CLI 只允许在 controller 创建且无 live target 权限的 scratch fixture 中出现。
- `U-000` 在 Git common-dir 以 `O_EXCL` 建立 durable task lease，绑定 repo realpath、approved plan SHA、bootstrap postimage、owner harness/session、worktree quarantine manifest 与状态。Claude 直接 hook 与 Codex adapter 都从 common-dir 的 hash-pinned、只读 postimage加载 lease guard；当前工作树 tracked adapter 只是验证 hash 后的薄 launcher，不是守门真值源。所有 non-owner mutation 失败；owner 也只能发起上述精确 controller action；parse/error/timeout/unknown tool 全部 fail-closed。`.codex/codex-hook-adapter.mjs` 对 project-scope-guard 该分支不得再返回 fail-open 0。controller crash 保留 lease；换 session/恢复只能在用户重新确认后走 `recover-task`，不自动删锁。
- **并发边界不是魔法锁**：同一 Unix 用户可从旧 linked worktree 或已获 shell 权限的长进程绕过任何协作式 agent hook，所以本计划不声称 common-dir JSON 能防任意本地进程。U-000 首次写前必须进入用户确认、持续到 `release-lease` 的 whole-task maintenance/quarantine window，并机械枚举 `git worktree list --porcelain`、双 harness session/process tree、`lsof` repo/common-dir writer、Git/index/ref lock、IDE watcher 与已启动命令；除 owner controller 进程树和显式 read-only reviewer 外，只要存在可能 writer 就零写入、停下让用户关闭。所有非当前 linked worktree 写会话进入 quarantine manifest，期间不得启动/恢复；fresh live fixture 只可从已加载 common-dir guard 的当前 worktree 启动。每次 controller action 都重做 census，发现 stale-worktree session 或 lease 前已授权长进程便在本 action mutation 前 `BLOCKED_AT:<U-ID>`；若外部进程已造成 byte/index/ref 漂移，preimage CAS 同样阻断且报告 unowned delta。本计划的保证是“显式静默前提 + guarded current-worktree sessions + 每 action CAS”，不冒充能对抗违反 maintenance gate 的恶意同 UID 进程。任意 harness 若不能从 common-dir hash-pinned guard 加载，或无法验证上述 quiescence，`KILL-7` 成立，U-000 在首次 live write 前 `BLOCKED`。
- `scope_kind=framework-meta` 时 `project_binding` 必须绑定 repo realpath + baseline HEAD；下游项目任务必须绑定 session project pin + transaction nonce。两种 scope 不可互换。每个获批 U-ID 编译独立 `effect_allowlist`：精确 path、file/symlink 类型、允许的 mutation 类别（create/modify/delete/index/ref/external）与 blob/hunk precondition。
- **真实 enforcement plane**：`scripts/run-authorized-worker.mjs` 由 controller 作为父进程启动 plan-SHA scratch worker；worker sandbox 只可写 scratch，live repo、lease 与 audit root 均不可写，且不暴露 mutation-capable MCP/external tools。worker 只产 content-addressed patch bundle。同一 controller 进程再调用 `apply-authorized-patch.mjs` 的导入函数（不 exec 并不传 capability），在 common-dir transaction lock 内重验 plan/preimage/effect，只有 delta 是 U-ID allowlist 子集才 apply + postcheck。事后 tuple 只作二次审计，不充当保护层。
- resolver、personal adapter swap、publish/ref/network 只能由同一 controller 进程导入并调用 `conflict-transaction.mjs`、`skill-cutover-transaction.mjs`、`publish-authorized-tree.mjs` 的受信函数；它们不接受 caller authority JSON，普通 worker/main tool call 不得直做。它们 spawn 的 Git/系统子进程只收到已验证的精确 argv/env，不收 authority 秘密。
- internal dispatch 只能缩小或继承 effect，不得扩大。grilling 的单个回答只是 `decision_only` evidence；diagnose-only 不可充当 implement authority。每次 dispatch 重验 `issuer/transaction_nonce/session/project_binding/plan_sha/approved_uids/allowed_effects/expires/revoked/record_sha`；forged、wrong-project、stale-plan、revoked 和 human-answer-as-code-authority fixtures 必须拒绝。
- 活体证据必须包含 Claude/Codex 各一次 worker 直写 live path 在 byte 改变前被 sandbox 拒绝，以及两个同时存活的 harness session 在持 lease 窗口尝试 Write/Edit/Bash/index/ref 变更均被 fail-closed hook 拒绝。不能用单进程 mock 替代。

U-000 exact patch 必须从以下闭集生成 action registry；未列出的 action 一律不存在：

```yaml
controller_action_registry:
  U-000: [verify]
  U-001: [execute, verify]
  U-011-a: [execute, verify]
  U-002: [execute, verify]
  U-003: [execute, verify]
  U-004: [execute, verify]
  U-005: [execute, verify]
  U-006: [execute, verify]
  U-007: [execute, verify]
  U-008: [execute, verify]
  U-009-a: [execute, verify]
  U-010: [execute, verify]
  U-011-b: [execute, verify]
  U-011-c: [execute, verify]
  U-009-b: [apply-personal, verify, rollback-personal]
  U-012: [execute, verify]
  U-013: [execute, verify-pre-push, publish, reconcile-push, attest, verify-final, release-lease]
  recovery:
    public_after_new_human_confirmation: [recover-task, abort-task]
    internal_only: [checkpoint, mark-blocked]
state_order:
  normal: U-000>U-001>U-011-a>U-002..U-007>U-008>U-009-a>U-010>U-011-b>U-011-c>U-009-b>U-012>U-013
  personal_failure: U-009-b..U-012>U-009-b/rollback-personal
  publish_pre_send_failure: U-013/PRE_PUSH>U-009-b/rollback-personal
  publish_proven_reject: U-013/PUSH_REJECTED_PROVEN>U-009-b/rollback-personal
  publish_ambiguous: U-013/PUSH_SENT_UNKNOWN>[reconcile-push|human-decision]
```

### 5.0.3 Plan-stage REVIEW-LEDGER 所有权

精确路径：`framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md`。它由本次主 Agent 在**计划字节冻结、flow/safety/Plan-contract 同 SHA 复审完成后**创建，包含 `plan_sha256`、review round、finding ID、状态、关闭机制、对应 U-ID/断言与 reviewer verdict；最终 quality-gate 读取它。进入 U-001 后它只读，U-001 必须证明其 `plan_sha256` 等于计划实际 SHA。实施期 candidate reviews 只写 receipt，不回写本 ledger。

### Phase 0 — 可信引导与全仓 lease

编排：Sequential + 独立 bootstrap review + Human Gate  
phase_type：`task_execution`  
model_tier：`core-execution`；只有精确 bootstrap patch 的独立出门复审使用 `reasoning-heavy`，合法依据是 `.claude/skill-os/model-routing.yaml → fable_whitelist.P0_出门前裁决 → 不可逆操作前复审（git 批量/发布/覆盖前的独立 review dispatch）`

#### U-000 — 在 maintenance window 安装 fail-closed enforcement plane

- Goal：在任何其他 runtime write 之前，在所有其他 writer 已机械静默的 maintenance window 内，用一次可审计 bootstrap 建立双 harness 守门、owner-session 单进程 controller 与 repo task lease。
- Source：`USR-004,USR-006,USR-007`
- Dependencies：None
- Read List：本计划实际 bytes 与 REVIEW-LEDGER；`.codex/hooks.json`、`.codex/codex-hook-adapter.mjs`、`.claude/hooks/project-scope-guard.mjs`、`.claude/hooks/lib/harness.mjs`、Claude 实际 hook 注册与 `scripts/verify-codex-wiring.mjs`；`git rev-parse --git-common-dir` 与 `git worktree list --porcelain`；当前双 harness tool-name/input/identity/timeout/error 合同；`ps`/`lsof`/Git lock 的实际可观测面；全部 bootstrap target preimage。
- Files：`.codex/codex-hook-adapter.mjs`、`.claude/hooks/project-scope-guard.mjs`、`scripts/authority-controller.mjs`、`scripts/run-authorized-worker.mjs`、`scripts/apply-authorized-patch.mjs`、`scripts/test-authority-bootstrap.mjs`；外部 `/Users/luca/.luca/authority/<repo-hash>/bootstrap-receipt.json{,.sha256}`；Git common-dir `luca-authority/guard/<bootstrap-sha>/{authority-controller.mjs,lease-guard.mjs,manifest.json}`、`luca-authority/{maintenance-pending.lock,active-task-lease.json,worktree-quarantine.json}`。`scripts/publish-authorized-tree.mjs` 明确不属于 bootstrap，由 `U-011-c` 在 red-first 后唯一拥有。
- Approach：用户批准本 Plan SHA 后，先在 `/private/tmp/luca-bootstrap-<plan-sha>/` 生成 exact patch/bundle，live repo 仅读；冻结 patch SHA、host guard bundle SHA、每个 target 的 pre/postimage manifest、实际 Node realpath/hash 和逆向 patch。故障 fixture 先对 preimage 证明预期 `RED_UNENFORCED`，再对 scratch postimage 证明精确转绿。一位独立 safety reviewer 以 `reasoning-heavy` 只审该 exact SHA。然后**必须再停下请用户批准 exact bootstrap patch SHA 和持续到发布终态的 maintenance/quarantine window**；未批准零 live write。批准后 bootstrap helper 先完成 §5.0.2 的 worktree/process/open-FD/lock census；任一其他可能 writer 或无法分类进程都停止，不通过“先写 pending 再希望旧 hook 识别”的窗口。确认静默后以 O_EXCL 取 `maintenance-pending`，重验全部 preimage，在同一 helper 进程中安装 hash-pinned common-dir guard bundle、应用同一 native patch、复验 postimage、写 quarantine manifest，并在离开 bootstrap critical section 前原子创建 active task lease；外层 maintenance/quarantine 继续保持到 `release-lease`。任一步失败且 guard 尚未激活时，只能在持续静默窗口内应用已审逆向 patch并复验。guard/lease 一旦激活，后续 task abort **不卸载 bootstrap、不恢复旧 fail-open guard**：只由 `abort-task` 倒序恢复 U-001 以后的 owned delta并归档 task lease；未来若确需卸载 bootstrap，必须另开新计划、新 patch SHA、新用户批准并再次全 session quiescent maintenance transaction。guard/controller 故障时保持 fail-closed `BLOCKED`，交付已审恢复材料供独立终端处置，不在本任务内绕过。
- Test scenarios：Codex adapter 子 hook exit nonzero/timeout/malformed output；Claude hook 同类故障；maintenance 前或 action 间出现另一个 linked-worktree session、`lsof` writer、Git lock 或 lease 前已授权长进程；stale worktree 已改 byte 后 owner action 的 preimage CAS；已加载 guard 的 current-worktree non-owner Claude/Codex 尝试 Write/Edit/apply_patch/Bash/index/ref；owner 任意直接 Bash、带 `;|$()`/多 argv/未知 action 的假 controller 命令；same-session subagent 重放/越序 action；wrong plan/patch/session/repo；controller crash 后锁仍在；worker 绕过 scratch；task abort 后 bootstrap guard 仍是 postimage；未经新 approval 尝试 uninstall。
- Verification：U-000 patch 激活后，唯一公开 controller action `U-000/verify` 内部运行 `node scripts/test-authority-bootstrap.mjs --case trusted-bootstrap-dual-harness`、`--case repo-global-lease-two-live-sessions`、`--case stale-worktree-quarantine`、`--case preauthorized-long-process-census`、`--case same-session-replay-cas` 及 `node scripts/verify-codex-wiring.mjs`；全部必须在真实 fresh Claude/Codex 上具名 PASS。每个 bypass 目标 byte/index/ref 完全未变；common-dir guard hash、quarantine/census receipt、patch/postimage/user-approval hash read-back 一致；mock 不能代替活体证据。
- Status：`PLANNED`

### Phase 1 — 冻结基线与所有权

编排：Sequential + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-001 — 冻结 source、collision 与文件 allowlist

- Goal：复验六份上游 bytes、当前 HEAD/upstream、同名 personal/project/plugin/bundled 解析、旧 debugging 全树资产和 dirty hunk owner。
- Source：`USR-001,USR-003,USR-004`
- Dependencies：`U-000`
- Read List：§2 source/hash 表与 §10 allowlist；本计划实际 bytes；`framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md`；`git status` 与全部 runtime target preimage；`.claude/skill-os/skill-routing-map.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/optional-workflow-graph.yaml`；`.claude/agents/plan-agent.md`、`.claude/skills/office/tech-spec/SKILL.md`、`.claude/skills/office/task-plan/SKILL.md`、`.claude/agents/orchestrator.md`；`/Users/luca/.codex/skills/.system/skill-creator/SKILL.md`、其 `references/openai_yaml.md` 与 `scripts/quick_validate.py`；`.claude/skill-os/skill-authoring.md`、`.claude/skill-os/skill-invariants.md`；`/Users/luca/.claude/skills/resolving-merge-conflicts`；`/Users/luca/.agents/skills/systematic-debugging` 全树；`/Users/luca/.claude/skills/systematic-debugging` link。
- Files：`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-ALLOWLIST.txt`。
- Approach：先复验 U-000 外部 receipt、exact bootstrap delta 和 active task lease；它们是本事务唯一允许的既有 runtime delta，任一 byte 不等即 `BLOCKED`。再把 §10 原样排序写入 allowlist，并派生 `runtime_allowlist = allowlist - 六个 evidence 文件`。逐项记录 repo realpath/HEAD/全部 refs/upstream canonical URL hash/精确 refspec 与 old OID、`remote.upstream.pushurl` 全值为空、六个 source hash、skill-creator 与三份 authoring 输入 hash、runtime target 的 type/mode/blob-or-link preimage、其他 session dirty exclusions。除 exact bootstrap delta 外，**任一 runtime target 在本任务开始前已有 tracked/untracked/index 变化都立刻 `NEEDS_CONTEXT`**；不得靠后续 staged-path 过滤掩盖同一路径的他人 WIP。两个可切换 personal target 精确限定为 `/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md` 与 `/Users/luca/.agents/skills/systematic-debugging/SKILL.md`；同时对两个所属目录做只读 collision inventory，并对 legacy systematic-debugging 全树记录相对路径、类型、mode、SHA 与 link target。未知 collision 或真实 hunk 重叠同样停下。最后校验 REVIEW-LEDGER 的 `plan_sha256` 与本文件实际 SHA 完全一致，再把 ledger SHA 写入 receipt。
- Test scenarios：干净 runtime targets；personal resolver directory shadow；personal systematic-debugging directory shadow；Claude systematic-debugging link；runtime target 有他 session tracked diff、untracked 文件或 staged hunk；计划 bytes 与 ledger SHA 不同；remote name/URL/refspec/old OID 任一漂移。
- Verification：controller `U-001/verify` 内部依次执行并把输出/exit 写入 `static_checks`：`git diff` 在 U-000 Files 上必须精确等于已批 bootstrap postimage manifest，其余 runtime paths 必须无未归属 delta；**整个共享 index** 必须无 staged delta；`shasum -a 256` 复验计划、ledger、source 与 authoring 输入；隔离 Git 验 URL/pushurl/target OID；`readlink`/全树 manifest 复验三个 personal entry。每项具名 `PASS`/`FAIL`，任一非零即不 checkpoint 到 U-011-a。
- Status：`PLANNED`

#### U-011-a — Red-first 测试合同与证据工具

- Goal：在经已批 U-000 之外的六项 skill/runtime 接线实现前，先固定会失败的行为 case、receipt schema 与 candidate manifest 生成规则，防止“写完再挑容易通过的测试”。
- Source：`USR-001..USR-006`
- Dependencies：`U-001`
- Read List：现有 `scripts/test-route-guard.mjs`、`scripts/verify.sh`、`package.json` 测试约定；本计划 §0.2、§4、§5.0.1–5.0.3、允许变化矩阵、§6 criteria；U-001 receipt/allowlist；`framework-audit/2026-08-28-codebase-design-code-review-install/FINAL-EXECUTION-PLAN.md` 的验收矩阵与 `PLAN-ADDENDUM-1-CLAUDE-PRECEDENCE.md` 的 fresh-loader 证据合同。
- Files：`scripts/test-engineering-delivery-skills.mjs`、`scripts/validate-skill-integration-receipt.mjs`、`scripts/candidate-manifest.mjs`。
- Approach：建立 data-driven case registry，每个 case 固定 `case_id/setup/invocation/expected_checker_ids/expected_preimplementation_state/cleanup`；先只实现 fixture、schema 校验器、manifest 计算器和明确的 `NOT_IMPLEMENTED`/RED 预期，不接 `package.json`/`verify.sh`，也不把缺实现误记成测试失败。每个 mutation 独立从同一 preimage 应用一个精确 patch，记录 §5.0.1 `mutation_receipts` 后无条件恢复并复验 SHA。
- Test scenarios：case inventory 至少含六项 direct/semantic/internal、wayfinder 三重谓词及 non-huge negative、selected-preset **两 revision+compile barrier+reapproval** 整链、standalone task-plan 的 root revision/direct+semantic+internal 三链与 graph-absent negative、to-spec traceability/UI gate、implement effect/pre-mutation guard、双 harness worker bypass+双 session lease、exception `origin_u_id == resume_u_id`、authority forged/wrong-project/stale/revoked/human-answer、diagnose read/write/network sandbox、nofollow snapshot/special-file race 与 pre-model redaction、resolver common-dir CAS/local-config/env/race、personal forward+reverse crash recovery与兼容混合态、candidate/publish evidence self-hash negative、index-first lock/不可变 OID/零共享 Git config/字面 URL/push-state reconcile、mutation empty/wrong-checker/unrestored meta-mutants。
- Verification：controller `U-011-a/verify` 内部运行 contract-inventory `--expect-red`、receipt `--schema-only` 与 manifest `--self-test`；必须证明所有计划 case 均注册、尚未实现的 case 精确为 `RED_NOT_IMPLEMENTED`，并分别具名 PASS。任一行为 case 意外绿、缺 checker ID 或 cleanup 后 SHA 不等 preimage时 action FAIL。
- Status：`PLANNED`

### Phase 2 — 六项能力正文与 facade

编排：两批 Parallel Fan-out，每批最多 3 个 writer；文件所有权互斥  
phase_type：`task_execution`  
model_tier：`core-execution`

```yaml
skills_needed:
  - /Users/luca/.codex/skills/.system/skill-creator/SKILL.md
```

`AUTHORING-BUNDLE`（U-002..U-007 每个 writer 都必须自己完整读到 EOF，不得由主 Agent 摘要替代）：

1. `/Users/luca/.codex/skills/.system/skill-creator/SKILL.md`
2. `/Users/luca/.codex/skills/.system/skill-creator/references/openai_yaml.md`
3. `.claude/skill-os/skill-authoring.md`
4. `.claude/skill-os/skill-invariants.md`

每个 writer 的交付门都包含：`python3 /Users/luca/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/office/<skill>`。U-001 冻结这五个 authoring/validator 输入的 bytes；若实施时漂移，全部六项旧验证失效并从 U-001 重来。

#### U-002 — `grilling` 决策 primitive

- Goal：建立跨产品/架构/规划可复用的依赖化决策访谈入口。
- Source：`USR-001,USR-002,USR-005`
- Dependencies：`U-011-a`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/productivity/grilling/SKILL.md`；`.claude/skills/office/brainstorm/SKILL.md` 的一次一个问题纪律；`.claude/skill-os/optional-workflow-graph.yaml` 的 human-gate 语义。
- Files：`.claude/skills/office/grilling/{SKILL.md,LICENSE,agents/openai.yaml}`。
- Approach：内部计算完整 decision tree/frontier；agent 自己检索事实；每回合只问一个依赖已清、最高杠杆的用户决策，给选项、推荐与取舍；回答只批准该决策，不授权写代码或外部动作。输出 decision packet 给调用方，自己不新建第二份决策文档。
- Test scenarios：事实问题不问用户；两个有依赖问题不并问；不产 PRD 冒充 brainstorm；最终确认前不继续执行。
- Verification：controller `U-002/verify` 内部运行 `quick_validate.py .claude/skills/office/grilling` 与 grilling-method case；两者具名 PASS，后者断言每 turn 恰好一个决策问题、caller 可消费 decision packet、用户答案只产生 `decision_only` authority。
- Status：`PLANNED`

#### U-003 — `wayfinder` facade + Plan Agent mode

- Goal：把 destination/fog/frontier 从散落词汇升级为具名、可恢复的 planning capability。
- Source：`USR-001,USR-002,USR-003,USR-005`
- Dependencies：`U-011-a`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/engineering/wayfinder/SKILL.md`；`.claude/agents/plan-agent.md` 的 fog、stable U-ID、PROGRESS 与持久计划合同；`.claude/skill-os/optional-workflow-graph.yaml`；本计划 `U-002` grilling 合同。
- Files：`.claude/skills/office/wayfinder/{SKILL.md,LICENSE,agents/openai.yaml}`、`.claude/agents/plan-agent.md`。
- Approach：facade 只进入 Plan Agent `wayfinder` mode。唯一 canonical 是持久 Plan 文件内的 `Wayfinder Map` 节；PROGRESS 只保存该文件路径与一句状态摘要，不复制 D-NNN 或 resolution。map 最小结构仅为 Destination、Decisions so far、Decision frontier、Fog、Out of scope。决策使用冻结的 `D-NNN`；执行 U-block 只能在 map ready 后经 `to-spec → task-plan → Plan Agent compile` 产生。
- Test scenarios：direct 具名调用可主动进入；自动入口只在 `huge AND multi-session AND fog` 三者同时成立；non-huge+multi-session+fog、大但路线清晰、单 session fog 均跳过；fog 不能预切成假任务；`build X` 不得冒充 decision ticket；同一 resolution 不得同时写 Plan 与 PROGRESS。
- Verification：controller `U-003/verify` 内部运行 `quick_validate.py .claude/skills/office/wayfinder` 与 wayfinder-method case；两者具名 PASS，且跨 session 串行恢复保持 `D-NNN`，重复决议、缺任一谓词和 execution-ticket mutant 必须失败。
- Status：`PLANNED`

#### U-004 — `to-spec` facade + canonical synthesis mode

- Goal：让“根据刚才讨论直接形成可实施 spec”成为真实入口，而不产生第二份 spec。
- Source：`USR-001,USR-002,USR-003,USR-005`
- Dependencies：`U-011-a`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/engineering/to-spec/SKILL.md`；`.claude/skills/office/tech-spec/SKILL.md` Phase 0–5；`.claude/skills/office/task-plan/SKILL.md` Phase 0–7；`.claude/skill-os/input-modes.yaml`；`AGENTS.md` §4.6 standalone/workflow 与 §5.4 output invariants。
- Files：`.claude/skills/office/to-spec/{SKILL.md,LICENSE,agents/openai.yaml}`、`.claude/skills/office/tech-spec/SKILL.md`、`.claude/skills/office/task-plan/SKILL.md`。
- Approach：`tech-spec` 增加互斥 source mode：现有 `traceable_delivery` 与新增 `conversation_synthesis`。后者从对话、代码、ADR、CONTEXT 建 `SRC-CONV/SRC-CODE/SRC-ADR-NNN` ledger，不重复 discovery；只有全新/高影响 testing seam 才按 Luca 规则一次问一个问题。每个 in-scope source row 必须映射到既有 `R-NNN` / `AE-NNN` 或新增 `TD-NNN`（technical decision），反向覆盖不允许静默丢行；R/AE 仍驱动 IF/CMP 与可执行测试准则，TD 进入 tech section/interface 约束。
- Adjacent gate：`task-plan` 将 synthesis 的 R/AE 编译为现有 `REQ-* → ASSERT → DEV → TEST` 链，将 TD 编译为 `DEC-TD*` 并要求至少一个 DEV 绑定或显式证明仅为全局约束。`design_scope: N/A` 不是自签豁免：tech-spec 必须给出覆盖全部 source rows 的 surface-evidence 表，task-plan 必须独立重读 source ledger 再判；任何 UI、interaction、user-visible state 或 CMP 信号都强制要求 design-brief。未决产品决策返回 `NEEDS_CONTEXT`，建议 grilling/wayfinder，to-spec 自身不偷做决策。
- Test scenarios：完整对话不重复提问；每个 MUST source 都能追到 REQ/DEC、ASSERT、DEV、TEST；纯工程 spec 可进入 task-plan；UI spec 缺 design-brief 必须阻断；tech-spec 把含 UI/state 的源错报为 N/A 时 task-plan 仍 FAIL；两种 mode 均通过 coverage gate。
- Verification：controller `U-004/verify` 内部运行 `quick_validate.py .claude/skills/office/to-spec` 与 to-spec-contract case；两者具名 PASS，后者结构化解析 traceability，证明输出路径/Phase 顺序未变、`source → R/AE/TD → REQ/DEC → ASSERT → DEV/TEST` 反向覆盖无遗漏，UI/state 假 N/A mutant 非零。
- Status：`PLANNED`

#### U-005 — `implement` 具名执行入口

- Goal：建立“按批准来源执行、不在执行中重新设计”的代码交付入口。
- Source：`USR-001,USR-002,USR-003`
- Dependencies：`U-003,U-004`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/engineering/implement/SKILL.md`；`.claude/agents/plan-agent.md` 的 U-block、Wave、assertion 与 compile 合同；`.claude/skills/office/task-plan/SKILL.md` 的 Node/Assertion/Task Card；`.claude/agents/orchestrator.md` Free Task 合同；`.claude/skills/office/code-review/SKILL.md`；U-000 已冻结的 `.claude/hooks/project-scope-guard.mjs`、`.claude/hooks/lib/harness.mjs`、`.codex/codex-hook-adapter.mjs`、`scripts/test-authority-bootstrap.mjs` 双 harness PreToolUse 契约。
- Files：`.claude/skills/office/implement/{SKILL.md,LICENSE,agents/openai.yaml}`、`.claude/agents/plan-agent.md`、`.claude/agents/orchestrator.md`。U-000 的 guard/controller/scripts 只读，本 U-block 不再与 bootstrap 争所有权。
- Approach：`implement` 是薄 facade。输入为 task-plan 时先冻结 artifact SHA，再按 context 进入 Plan Agent `frozen-source compile` 的两个互斥 source mode：① `selected_workflow`：必须以该 preset 先前的 `IMPLEMENT_COMPILE_BARRIER` 为父，记录非空 `previous_plan_sha256`/`supersedes_barrier_id`；② `standalone_task_plan`：创建 root code revision，强制 `previous_plan_sha256:null` 和 `supersedes_barrier_id:null`，且禁止读取/启用 optional graph 或 workflow-state。两者都绑定 `task_plan_sha256`，机械枚举 DEV/TEST/ASSERT，生成新 Plan revision、稳定代码 U-ID/Wave/断言/Read List 和每 U-ID `effect_allowlist`；生成后都停下请求人类确认和新 authority。selected 的旧 planning authority 全部 revoke，只有绑新 plan SHA/UID/effect 的 record 能从 barrier 恢复；standalone 不得为了找父 revision 暗启 preset。禁止重开产品决策，缺失/冲突只可 `NEEDS_CONTEXT`。输入已是**当前 revision 且重新获批**的 U-ID plan 时才直交 Orchestrator；Orchestrator 绝不自行拆 task-plan、选范围、生成 U-block 或扩 effect。
- Safety：expected TDD red 不进 debug；非预期 failure 进 diagnosing；Git conflict 进 resolver。所有代码 WA 经 §5.0.2 controller 的 scratch child，只产 patch bundle；同一进程在 live mutation **之前**验 authority/preimage/effect 后 apply。active task lease 期间任意 session 的直接 Write/Edit/apply_patch/Bash 均被 fail-closed guard 阻断；动作后仍比较 tracked/untracked/ignored/index/refs/operation/external tuple。默认不 stage/commit/push/建 PR；review finding 只在原 path/effect 内修，否则 delta replan。
- Test scenarios：复杂无批准计划时回 Plan Agent；裸编号不猜；selected 的旧 authority 执行新 U-ID、placeholder 扩 effect、跳二次确认均阻断；standalone task-plan 的 direct/无名 semantic/internal 三项 fixture 在删除 preset/graph 后仍成功；“standalone 强要 barrier”与“偷读 graph/workflow-state” mutants 必须失败。Claude/Codex scratch worker 直改 live repo 必须在 byte 不变时被拒；伪造 record、绕过 apply、无关文件/未列文件/错 mutation class/stale precondition 均阻断；HEAD 不变。
- Verification：controller `U-005/verify` 内部运行 implement quick_validate、implement-authority、standalone-task-plan-three-triggers、active-effect-authority 与 real-worker-bypass-dual-harness cases；全部具名 PASS。证据同时含 selected `barrier→code revision→reapproval` trace 与 standalone `task-plan→root revision→approval` trace，并证明两者不共享隐式 graph 状态。
- Status：`PLANNED`

#### U-006 — `diagnosing-bugs` canonical + 旧名兼容

- Goal：把 upstream feedback-loop-first 与 Luca 现有 systematic debugging 优势合成一份权威方法。
- Source：`USR-001,USR-002,USR-003,USR-005`
- Dependencies：`U-011-a`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/engineering/diagnosing-bugs/SKILL.md`；U-001 的 legacy-debug 全树 manifest 与 `/Users/luca/.agents/skills/systematic-debugging` 全树；`.claude/skills/office/codebase-design/SKILL.md` 的 correct-seam 原语；`AGENTS.md` §3.1 coding discipline 与 §5 harness safety；`.codex/workflow-runner.mjs` 的 scratch-workdir 隔离先例。
- Files：`.claude/skills/office/diagnosing-bugs/SKILL.md`、`.claude/skills/office/diagnosing-bugs/LICENSE`、`.claude/skills/office/diagnosing-bugs/agents/openai.yaml`、`.claude/skills/office/diagnosing-bugs/PROVENANCE.md`、`.claude/skills/office/diagnosing-bugs/references/root-cause-tracing.md`、`.claude/skills/office/diagnosing-bugs/references/defense-in-depth.md`、`.claude/skills/office/diagnosing-bugs/references/condition-based-waiting.md`、`.claude/skills/office/diagnosing-bugs/references/condition-based-waiting-example.ts`、`.claude/skills/office/diagnosing-bugs/scripts/find-polluter.sh`、`.claude/skills/office/diagnosing-bugs/scripts/hitl-loop.template.sh`、`.claude/skills/office/diagnosing-bugs/scripts/safe-diagnostic-runner.mjs`、`.claude/skills/office/diagnosing-bugs/scripts/safe-snapshot-copy.py`；兼容 adapter 在 `U-009-a` 创建。
- Approach：Phase 1 硬门是“一条已实际运行、能捕获用户精确症状、尽量快速/确定/agent-runnable 的 red-capable command”。之后才最小化、列 3–5 个可证伪假设、定向 instrumentation、correct-seam regression、原始场景复验与 debug artifact 清理。保留组件边界取证、反向数据流、redaction、三次 fix 失败转架构讨论。
- Asset migration：对 U-001 manifest 每个文件写 `PORT / REPLACE / EXCLUDE + 理由`。预期 PORT：`root-cause-tracing.md`、`defense-in-depth.md`、`condition-based-waiting.md`、`condition-based-waiting-example.ts`、`find-polluter.sh`、`scripts/hitl-loop.template.sh`；`SKILL.md` REPLACE；`CREATION-LOG.md` 转为新 provenance；`test-academic.md` 与 `test-pressure-1/2/3.md` 默认 EXCLUDE（历史压力测试，保留在 personal backup），但实施时仍以 manifest 复验为准。所有保留的相对引用必须可解析。
- Input modes：`diagnose-only` 的任意命令只能经 `safe-diagnostic-runner.mjs`。controller 先按授权的精确 read manifest 调 `safe-snapshot-copy.py`：从已打开的 repo-root directory FD 开始，逐个 component 用 `openat(...,O_NOFOLLOW|O_DIRECTORY)` 下钻，final 用 `O_NOFOLLOW|O_NONBLOCK`打开；只接受 `fstat` 为 regular file 且 `st_nlink==1`，绑定 `dev/inode/type/mode/size/sha256`，从已打开 FD 复制到 O_EXCL scratch，前后 fstat/hash 不变才成功。symlink（含父目录）、hardlink、FIFO/device/socket 或 lstat→open 换链一律拒绝；不使用 hardlink/路径级普通 copy。默认排除 `.env*`、credentials、`.git/config`、hooks、SSH/Keychain/浏览器/云配置和邻接 home；子进程对 live repo/home 完全不可读。macOS `/usr/bin/sandbox-exec` 默认 deny `file-read*`/`file-write*`/network，仅 allow scratch、固定系统根和 hash 冻结 toolchain roots；scratch 唯一可写。敏感项目文件需另取精确 read authority，controller 先注册全部待遮蔽原值再以同样 FD 流程复制；不允许宽目录。runner 以 `env -i` 启动，stdout/stderr 在进入 Agent/model 前流式 sanitize raw/URL/base64/跨 chunk/credential-prefix，raw bytes 不落盘。硬隔离/安全复制/遮蔽任一不可用即 `NEEDS_CONTEXT`，不降级。repo instrumentation、tracked test、生产 instrumentation 各需新授权；`diagnose-and-fix` 只回 implement scratch→controller apply。
- Test scenarios：没有红回路不许给理论；flake 先提高复现率；无正确 seam 报架构缺口；命令读 `/Users/luca/.ssh`、邻接 home、live repo `.env`、无前缀随机 secret、Keychain 均被 pre-read 阻断；manifest final symlink→SSH、父目录 symlink、hardlink、FIFO/device/socket 与 lstat→open swap 均在 scratch 中零字节时失败；获批敏感 fixture 先注册再只输出 redacted；tracked/untracked/ignored/index/HEAD/ref/config/hook 写和 HTTP/DNS 均阻断；external adapter 只命中 fake；legacy 名加载 supporting reference；五种编码 secret 不进 Agent 可见流。
- Verification：controller `U-006/verify` 内部运行 diagnosing quick_validate 与 diagnosing-isolation case；具名 PASS，并验证 nofollow FD snapshot、read/write/network sandbox、完整 repo/external tuple、pre-model redaction、bug/regression transcript、dangling references、scratch cleanup。删除 component/final nofollow、regular/nlink/fstat gate、read deny/write deny/sanitizer，扩到 home，或读无前缀 `.env` 的独立 mutants 必须各自非零。
- Status：`PLANNED`

#### U-007 — `resolving-merge-conflicts` 安全适配

- Goal：把当前只读 containment 升级为能安全完成冲突的两阶段能力。
- Source：`USR-001,USR-002,USR-003,USR-004`
- Dependencies：`U-011-a`
- Read List：完整 `AUTHORING-BUNDLE`；`mattpocock/skills@6654f6b:skills/engineering/resolving-merge-conflicts/SKILL.md`；`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md` 当前 containment；`.claude/skills/office/careful/SKILL.md`；`AGENTS.md` §5.1–5.2 与本计划允许变化矩阵。
- Files：`.claude/skills/office/resolving-merge-conflicts/SKILL.md`、`.claude/skills/office/resolving-merge-conflicts/LICENSE`、`.claude/skills/office/resolving-merge-conflicts/agents/openai.yaml`、`.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs`。
- Approach：所有 inspect 后动作只经 `conflict-transaction.mjs`。它先以固定 `/usr/bin/git` 解析并 realpath `git rev-parse --git-common-dir`，在 **common-dir** 下原子取 `luca-resolver.lock`；linked worktrees 因而共享同一锁。锁内重算 action-level CAS：repo/worktree/common-dir identity、HEAD、全部 refs、index stages、operation/sequencer/todo bytes、tracked/untracked/ignored path/mode/blob hash，再对 authority 的精确 action/path/effect/precondition；verify→action→postcheck 全程持锁。Git 子进程通过 network-denied、预测路径 write allowlist sandbox，以 `env -i` 启动，只显式设置固定 `GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE/GIT_INDEX_FILE` 与必要 locale；拒绝 caller 提供任意 `GIT_*`/PATH。local config 必须过安全键 allowlist；强制关闭 signing/gpg、hooks、fsmonitor、rerere、pager/editor/prompt、credential、aliases、external diff/merge/filter/clean-smudge、includes 与 rebase exec，发现未知执行面即 fail-closed。edit/stage/advance/abort 权限互不蕴含；stage 精确 path；resolver 无 standalone commit。
- Test scenarios：初次零 mutation；edit 不 stage；stage 不 advance；advance 效果先披露；abort 可选；并发改变 byte/index/ref/operation 使 CAS 失败；linked worktree 只能一方持 common lock；恶意 local `commit.gpgSign/gpg.program`、PATH shim、`GIT_CONFIG_COUNT/GIT_DIR/GIT_INDEX_FILE` 注入、hooks/editor/global include/filter/rebase exec 均不执行；未授权路径不改；lock crash 可检测不盲删活锁。
- Verification：controller `U-007/verify` 内部运行 resolver quick_validate 与 resolver-transaction case；具名 PASS，完整 tuple 与 common-dir lock receipt 齐全，race/linked-worktree/local-gpg/PATH/GIT-env/hooks/editor/filter mutants 均非零且 fixture 恢复原 SHA。
- Status：`PLANNED`

允许变化矩阵：

| 阶段 | 可变化 | 必须不变 |
|---|---|---|
| inspect/propose | 无 | worktree、index、HEAD、refs、operation、remote refs |
| edit | 仅获批 conflict paths 的 worktree bytes | index、HEAD、refs、operation、remote refs |
| stage | 仅获批 paths 的 index entries | HEAD、refs、operation、remote refs；未授权 worktree paths |
| advance operation | 仅授权前披露的 HEAD/commit/refs/operation 效果 | remote refs；未披露或未授权路径 |
| abort | 仅 Git 对该操作的已披露恢复效果 | remote refs；无关 worktree paths |

### Phase 3 — Flow 与相邻消费面

编排：Sequential + Supervisor  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-008 — Optional engineering-delivery preset

- Goal：把六项能力放到正确主链/条件门/异常边，不建立第二状态机。
- Source：`USR-002,USR-003,USR-005,USR-006`
- Dependencies：`U-002,U-003,U-004,U-005,U-006,U-007`
- Read List：`AGENTS.md` §0 architecture principle 与 §4.6 standalone/workflow；`.claude/skill-os/optional-workflow-graph.yaml` 现有节点/gate；`.claude/agents/plan-agent.md` 输入、持久计划与确认合同；`.claude/agents/orchestrator.md` Free Task 边界；`.claude/hooks/route-guard.mjs` 的 `FRAMEWORK_FLOW` 决策 envelope（实际路由接线由 U-010 所有）。
- Files：`.claude/skill-os/optional-workflow-graph.yaml`、`.claude/skill-os/routing-chain-check.md`、`.claude/agents/plan-agent.md`。
- Approach：新增用户主动选择的 `engineering-delivery` **无状态模板**；optional graph 只保存可选转移与 gate。Plan Agent 新增 `selected-preset compile` 具名 mode，唯一入口 envelope 固定为 `{preset_id:"engineering-delivery", graph_sha256, selection_authority:{issuer:"main-agent",session_id,user_turn_sha256,scope:"compile_only"}}`。初次 compile 只生成 planning revision：`to-spec → task-plan → IMPLEMENT_COMPILE_BARRIER` 及这些规划产物自身的窄 effect，**禁止预造任何代码 U-ID/effect**；经原有人类确认后 Orchestrator 只执行到 barrier。task-plan SHA 冻结后，U-005 才生成新的 code Plan revision，并再次停下请求人类确认/签发新 authority；旧 record 不可跨 revision。Orchestrator 不读取 graph 作为第二真值，也不进入 workflow-state PENDING/DONE。之后 code-review 再 acceptance；diagnosing、resolver 和 review finding 是有界异常边。
- Hard guards：standalone 不受 graph 阻断；expected TDD red 不走 diagnosis；成功异常回路必须机械满足 `origin_u_id == resume_u_id`；若原 U-ID 转 `BLOCKED|NEEDS_CONTEXT`，`resume_u_id` 只能为 `null` 且不得创设新 ID。异常 retry 有显式上限，超限回 delta replan；不修改 `.claude/templates/workflow-state.yaml` 或当前无 pin 的 `.claude/workflow-state.yaml`。
- Test scenarios：未选 preset 仍可直调；清晰输入跳过 wayfinder；不可拆分整链从用户选择开始，经 FRAMEWORK_FLOW→planning revision→to-spec→task-plan→compile barrier→code revision→二次确认→首个代码 U-ID；伪造/stale graph SHA、非 compile-only selection authority、初版预造代码 U-ID、旧 authority 执行新 U-ID、placeholder 扩 effect、跳过二次确认均拒；diagnosing/resolver 成功恢复到同一 U-ID；wrong/new/terminal invented ID mutants 失败；graph 无无界自动环。
- Verification：controller `U-008/verify` 内部运行 selected-preset-full-chain 与 exception-return-identity cases；均具名 PASS。前者必须是单 fixture、结构化断言两次 Plan SHA、task-plan artifact SHA、两次不同 approval/authority 与 barrier resume，不能以两个组件测试拼接充抵；graph cycle/entry/exit assertions 也必须 PASS。
- Status：`PLANNED`

### Phase 4 — 双 harness、优先级与治理登记

编排：Sequential  
phase_type：`task_execution`  
model_tier：`core-execution`

#### U-009-a — 六个项目双端入口、兼容 adapter 与 crash-safe swap 准备

- Goal：先完成项目内可测试接线，并准备可恢复 personal cutover，但不切换正在使用的个人入口。
- Source：`USR-001,USR-004`
- Dependencies：`U-002,U-003,U-004,U-005,U-006,U-007`
- Read List：`framework-audit/2026-08-28-codebase-design-code-review-install/FINAL-EXECUTION-PLAN.md`；`framework-audit/2026-08-28-codebase-design-code-review-install/PLAN-ADDENDUM-1-CLAUDE-PRECEDENCE.md`；当前 `.claude/skills/codebase-design`、`.agents/skills/codebase-design`、`.claude/commands/codebase-design.md` loader pattern；U-001 personal preimage tuple；§5.0.1 `personal_cutover` schema。
- Files：
  - `.claude/commands/{resolving-merge-conflicts,to-spec,implement,wayfinder,diagnosing-bugs,grilling}.md`；
  - `.claude/skills/<name>` 六条 Claude native alias；
  - `.agents/skills/<name>` 六条 Codex alias；
  - `.claude/skill-os/compat/{resolving-merge-conflicts,systematic-debugging}/SKILL.md` 两个薄兼容 adapter；
  - `scripts/skill-cutover-transaction.mjs`；
  - personal swap 的绝对 source 只到文件：`/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`、`/Users/luca/.agents/skills/systematic-debugging/SKILL.md`；新 symlink target 分别是 `/Users/luca/Desktop/项目/muse/lucagstack/.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md`、`/Users/luca/Desktop/项目/muse/lucagstack/.claude/skill-os/compat/systematic-debugging/SKILL.md`；backup files 为 `/Users/luca/.claude/skills/.luca-backups/<plan-sha256>/resolving-merge-conflicts.SKILL.md`、`/Users/luca/.agents/skills/.luca-backups/<plan-sha256>/systematic-debugging.SKILL.md`；journal 为 `/Users/luca/.luca/audit/matt-six-skill-cutover-<plan-sha256>.json`。
- Approach：建立六个项目入口与 tracked adapters；resolver adapter 只加载 canonical resolver，systematic adapter 只加载 canonical diagnosing，不复制方法正文。真实 personal **目录永不 rename/unlink**：runner 先把两个旧 `SKILL.md` 的 type/mode/bytes-or-link 安全复制并 fsync 到 absent backup，随后在每个 source 同目录构造完整临时 symlink，使用单次 POSIX rename 原子替换该 `SKILL.md`。因此每个名称在任一时刻都能看到完整旧文件或完整新 adapter，不存在路径缺口。两个 root 无法组成单个跨卷原子点，计划明确采用 crash-consistent 顺序事务；中间的“新 resolver + 旧 debugger”是被测试且功能兼容的降级态，用户批准本文即批准这一有限可见性，而非宣称全局原子。U-009-a 只在 scratch roots 跑 forward/reverse journal，不碰真实 personal files。
- Test scenarios：项目六个新名可解析；compat adapter 无第二正文；移除任一项目 link checker 变红；scratch 验证旧/新每个单文件原子可见、`RESOLVER_SWAPPED` 混合 catalog 两项都可加载、backup 已存在、wrong preimage、每个强杀点、显式 rollback 与二次 rollback。
- Verification：controller `U-009-a/verify` 内部运行 project-alias-candidate 与 cutover-transaction-scratch cases；均具名 PASS，后者只在 scratch 中逐状态证明无 missing/partial `SKILL.md`、混合 catalog 兼容、forward/reverse journal fsync 与 restored tuple。
- Status：`PLANNED`

#### U-010 — 路由、input mode、model 与治理闭包

- Goal：保证六项语义可命中且不劫持相邻技能。
- Source：`USR-001,USR-002,USR-004,USR-006`
- Dependencies：`U-008,U-009-a`
- Read List：`.claude/skill-os/skill-routing-map.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/model-routing.yaml`、`.claude/skill-os/codex-viability.yaml`；`.claude/hooks/route-guard.mjs`；`scripts/check-routing-map.mjs`、`scripts/check-registration-sync.mjs`、`scripts/check-codex-viability.mjs`、`scripts/build-self-model.mjs`；`CLAUDE.md`、`AGENTS.md` 一级 skill 表。
- Files：`.claude/hooks/route-guard.mjs`、`.claude/skill-os/skill-routing-map.yaml`、`.claude/skill-os/input-modes.yaml`、`.claude/skill-os/model-routing.yaml`、`.claude/skill-os/codex-viability.yaml`、`.claude/skill-os/external-skills/installed-pins.yaml`、`.claude/skill-os/evolution/adoption-log.jsonl`、`.claude/skill-os/evolution/self-model.generated.yaml`（只由生成器写）、`.claude/skills/office/references/office-wizard.md`、`CLAUDE.md`、`AGENTS.md`、`scripts/check-skill-scene-coverage.py`。
- Approach：resolver 由 external 迁为 project skill；debug 主路由由 systematic-debugging 迁到 diagnosing-bugs，旧名只作兼容；六个 descriptions 与 route 均用窄复合 intent。新增 `engineering_delivery` framework-flow route（仅明确“选择/按工程交付流程”触发），`FRAMEWORK_FLOW` renderer 为它生成 U-008 的 compile-only envelope，不复用 framework-evolution 的 scout 文案。Project Gate 永远最先；非 direct 请求的 Plan Agent complexity 永远先于 single-skill。
- Precise route-guard change：不向当前 `loadRoutes()` 偷塞它不会解析的字段。新增纯函数 `wayfinderAutoPredicate(prompt, complexity)`，只有 `complexityScore >= 6`（huge）且命中 multi-session 证据（跨 session/多会话/长期分阶段/多人接力）且命中 fog 证据（路线不清/不知道从哪开始/决策纠缠/范围迷雾）才返回真。在 `buildDecision()` 中保持 `projectGate()` 先行；gate 通过后、原 `PLAN_MODE` early-return 位置，若非 direct 且谓词为真，返回 `{...complexity,recommendedSkills:["/wayfinder"],recommendationEvidence:{huge,multi_session,fog}}`，**仍是 PLAN_MODE，不降为 SINGLE_SKILL**。Plan Agent 收到后重验三条件再进入具名 wayfinder mode。显式 `/wayfinder` 或 `$wayfinder` 仍按现有 direct-call 优先级直达，不要求三条件。
- Positive route：
  - to-spec＝“根据刚才讨论直接形成 spec/不要重做访谈”；
  - implement＝“按这个批准的 spec/task-plan/U-ID 执行”；
  - wayfinder＝明确命名；自动建议严格为 `huge AND multi-session AND fog`；
  - diagnosing＝“诊断/排查具体 bug、失败或性能回归”；
  - grilling＝“逐个逼问尚未决定的关键取舍”；
  - resolver＝检测到真实 in-progress conflict 或用户明确要求处理该 conflict。
- Negative route：裸 `spec` 留给 tech-spec；裸“实现一个新功能”先过 Plan Agent；普通任务计划不进 wayfinder；PRD 生产不进 grilling；普通 merge 无 conflict 不进 resolver；expected TDD red 不进 diagnosis。
- Internal dispatch：把 §0.2 六条条件编码为 caller contract；route 只能建议/选择 skill，权限只能继承校验后的 `authority_record_sha256` 且 effect 取交集。任何 internal receipt 缺 caller、条件证据、完整 authority record 或 record hash 校验均 FAIL。
- Test scenarios：六项各有不含名称的自然语言正例；wayfinder direct bypass；huge+multi-session+fog 得 PLAN_MODE+recommendation；non-huge+multi-session+fog、huge+fog 单 session、huge+multi-session 无 fog 都不得推荐；Project Gate 与三条件同句仍先 gate；与 tech-spec/task-plan/brainstorm/challenge/redteam/TDD/careful 的相邻负例不误触；复杂请求先到 Plan Agent；多候选保持 STOP；internal caller 无经校验 authority record 或条件证据时拒绝 dispatch；engineering-delivery 未被用户选择时不自动启用。
- Verification：controller `U-010/verify` 内部运行 route-guard、route-order-and-predicates 与 routing-map/registration/viability/scene coverage/self-model checkers；均具名 PASS，且 route-order、non-huge、FRAMEWORK_FLOW 错 consumer mutants 必须非零。
- Status：`PLANNED`

### Phase 5 — 行为测试、活体复核与发布

编排：Supervisor；静态测试后 Claude/Codex fresh session 并行  
phase_type：`task_execution`  
model_tier：`core-execution`；最终出门裁决使用现有 reasoning-heavy 白名单角色

#### U-011-b — 补全会咬的集成测试并接入总门

- Goal：把“已安装、能触发、flow 接通、安全边界不退化”变成失败断言。
- Source：`USR-001..USR-006`
- Dependencies：`U-010,U-011-a`
- Read List：现有 `scripts/test-route-guard.mjs`、`scripts/verify.sh`、`package.json` 测试约定；本计划 §0.2、§4、允许变化矩阵、§5.0.1 receipt schema、§6 assertions；`framework-audit/2026-08-28-codebase-design-code-review-install/FINAL-EXECUTION-PLAN.md` 的验收矩阵；`framework-audit/2026-08-28-codebase-design-code-review-install/PLAN-ADDENDUM-1-CLAUDE-PRECEDENCE.md` 的 fresh-loader 证据合同。
- Files：`scripts/test-engineering-delivery-skills.mjs`、`scripts/validate-skill-integration-receipt.mjs`、`scripts/candidate-manifest.mjs`、`scripts/test-route-guard.mjs`、`scripts/verify.sh`、`package.json`；临时 Git fixtures 由测试脚本在 scratch 内自建，不新增未列 helper。
- Approach：把 U-011-a 中除 `publish-module-*` 外的 RED case 逐项转绿并接入 `package.json`/`verify.sh`；publish cases 必须继续精确返回 `RED_PUBLISH_MODULE_PENDING`，直到下一 U-block 的唯一 owner `U-011-c` 写入 publisher。每个 case 固定 setup、invocation、预期 resolved skill、authority/effect 前后 tuple 与 cleanup；Git 场景全部在独立 scratch repo/local bare origin。mutation runner 每个 mutant 从同一干净 pre-SHA 独立应用**一个**非空 exact patch，运行固定 `expected_checker_ids`，无论成败都恢复并复验；记录 `{mutant_id,pre_sha,exact_patch_sha,expected_checker_ids,baseline_before_exit,observed_exit,baseline_after_exit,restored_sha}`。空 patch、错 checker ID、未恢复 SHA 三个 meta-mutant必须让 mutation harness 自己变红。本阶段 personal 真路径尚未 cutover：loader 只做项目 alias 与显式 scratch candidate-root 测试，绝不把 shadow 下的旧 personal fresh 结果冒充新实现。
- Test scenarios：六项逐项覆盖 direct（Claude/Codex fresh）、semantic（不含 skill 名）、internal（含 caller/condition/controller transaction record）、selected-workflow 与相邻 negative；to-spec 的 source→R/AE/TD→task-plan 全链；implement 的 selected+standalone 两种 Plan compile ownership；diagnosing red-loop、safe snapshot、sentinel redaction 与 diagnose-only tuple；resolver edit/stage/advance/abort 各阶段 tuple且无 standalone commit；grilling single-question；项目双 harness hash；无 tracker canonical；无 auto commit/push。
- Mutation proof：本 U-block 先覆盖 direct/semantic/internal、alias/input/graph consumer、compile barrier/二次确认、standalone graph independence、resolver、Orchestrator、scratch/apply controller、lease fail-closed、diagnose isolation、implement effect、personal rollback 与 receipt self-hash；publish/index/push-state mutants 保持注册但 pending，由 U-011-c 独占转绿。每个已启用 mutant 均须使至少一个固定 checker 非零且 causality tuple 完整。
- Remote proof：fixture 使用本地 bare origin，比较调用前后 remote ref；除 `U-013` 外任何 skill 流程都必须不 push。
- Verification：controller `U-011-b/verify` action 内部运行 `node scripts/test-engineering-delivery-skills.mjs --all-pre-cutover --expect-publish-pending`、receipt pre-cutover validator、现有 route suite、六项 quick_validate、registration/parity/harness/self-model 与 `npm run verify`；非 publish cases 全部具名 PASS，publish cases 全部且仅为 `RED_PUBLISH_MODULE_PENDING`，真实 personal fresh-loader cases 仍为 `PENDING_POST_CUTOVER`。main 不直接运行这些命令。
- Status：`PLANNED`

#### U-011-c — 在 red-first 后实现 publish transaction（不发布）

- Goal：为 U-013 提供已经由固定红测约束、但尚未产生任何真实 index/ref/network effect 的 publish transaction 实现，消除 bootstrap 提前写业务实现的所有权倒置。
- Source：`USR-004,USR-007`
- Dependencies：`U-011-b`
- Read List：U-011-a 固定的 publish/index/push-state RED cases；U-001 baseline/allowlist；§5.0.2 controller import contract；§5.0.1 candidate/publish manifest 与 journal schema；Git common-dir/worktree/index/ref 文档化约束。
- Files：`scripts/publish-authorized-tree.mjs`（唯一 owner）。测试 runner 由 U-011-b 只读；所有 Git origin、index、credential 和 delayed-receive-pack fixtures 仅在 controller scratch 内创建。
- Approach：只实现可导入、默认无 CLI live authority 的 transaction module：固定 `/usr/bin/git`、`env -i`、index-lock-first、byte-CAS、独立 index、immutable integration OID、literal URL、零共享 config、durable journal 及 `PUSH_SENT_UNKNOWN` 状态机。模块只有 controller 注入的已验 effect record 才能触及 live state；独立执行时只能识别 `--scratch-fixture-root` 且该 root 必须位于 controller scratch。此 U-block 只在 scratch bare origin 上把 U-011-a 的 RED 转绿，不写 real index/ref/personal/remote。
- Test scenarios：无 controller import 尝试 live repo；manifest 自引用；index.lock 前后 staged race；local ref race；URL rewrite/pushurl；明确 receive-pack reject；push 响应丢失但服务端延迟更新；remote old/integration/other/unreadable；attestation 与 lease release crash。
- Verification：controller `U-011-c/verify` action 内部运行 `node scripts/test-engineering-delivery-skills.mjs --case publish-module-scratch-green` 与 delayed-receive-pack fixture；两者具名 PASS，且真实 repo/index/refs、personal targets、canonical remote OID 与 network tuple均等于 action preimage。`scripts/publish-authorized-tree.mjs` 的 postimage SHA 写入 checkpoint，供 U-012 candidate manifest 冻结。
- Status：`PLANNED`

#### U-009-b — Personal `SKILL.md` crash-consistent swap 与显式 rollback

- Goal：在静态 candidate 全绿后，把两个已知 personal shadow 可恢复地切到已验证实现。
- Source：`USR-004`
- Dependencies：`U-011-c`
- Read List：U-001 `personal_preimage` 与 `legacy_debug_tree`；U-009-a candidate alias/compat；`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md` 的 `personal_cutover`；`framework-audit/2026-08-28-codebase-design-code-review-install/PLAN-ADDENDUM-1-CLAUDE-PRECEDENCE.md` 的已验证 precedence 模式。
- Files：真实外部写只允许两个绝对 source `SKILL.md`、U-009-a 两个确定性 backup files、同目录临时 swap files 与 journal `/Users/luca/.luca/audit/matt-six-skill-cutover-<plan-sha256>.json`；仓内只更新 receipt 的 `personal_cutover` section。
- Approach：只有 controller `U-009-b/apply-personal` action 可导入 transaction runner；它重验 authority、plan/ledger SHA、source preimage、backup absent、same-device 与 adapter target hashes，forward journal 经 fsync+atomic journal rename 推进 `PREPARED → RESOLVER_SWAPPED → DEBUG_SWAPPED → VERIFIED → COMMITTED`。每次 action 先恢复 pending forward state。具名 `U-009-b/rollback-personal` 即使事务已 COMMITTED 也启动 durable reverse state machine：`ROLLBACK_PREPARED → DEBUG_RESTORED → RESOLVER_RESTORED → ROLLED_BACK`，每步用相邻完整 temp file/symlink + atomic rename，且备份永不删除。底层 `recoverOrApply()` 与 `rollback()` 导入函数均幂等；不能靠内存 try/catch。任一状态的 loader 只能看到旧/新完整 adapter，混合态已由 U-009-a 证明兼容。
- Human gate：用户批准本文即授权这两个精确 file swap、其短暂兼容混合态和可恢复 reverse transaction；任何额外 personal path 不在授权范围。
- Test scenarios：每个 forward/reverse 状态前后强杀、journal partial write、backup 已存在、wrong target、COMMITTED 后 U-012 FAIL 再 rollback、rollback 中再强杀、二次 rollback；任一可见态无 missing/partial skill。
- Verification：controller `U-009-b/apply-personal` 内部完成真实 forward，随后 `U-009-b/verify` 内部跑 `node scripts/test-engineering-delivery-skills.mjs --case personal-cutover-postimage`；同一 verify action 仅在无 live-target 权限的 scratch clone 直接调用 transaction CLI，实证 forward/reverse fault matrix。真实 rollback/reapply 只能消费 lease 签发的一次性 `rollback-personal`/`apply-personal` action。最终 receipt 必须是 `COMMITTED` postimage，schema validator 与两个 fresh loaders 均 PASS。
- Status：`PLANNED`

#### U-012 — 冻结 bytes 的独立专家与 fresh-session 验收

- Goal：让 flow、safety、双 harness 三个独立视角审同一 candidate tree。
- Source：`USR-002,USR-003,USR-004,USR-006`
- Dependencies：`U-009-b`
- Read List：冻结 candidate tree；本计划 `USR`、§4 flow、§6 assertions/criteria、§7 rollback；`framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md`；`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md` 固定 schema。
- Files：`framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-CONTENT-MANIFEST.tsv`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md` 的 `candidate_manifest/reviews/live_receipts` sections；其余 candidate runtime paths 只读，除非判 FAIL 后回对应 U-ID 重验。
- Approach：controller `U-012/execute` 先用 `scripts/candidate-manifest.mjs` 对 runtime denominator 生成并冻结 `CANDIDATE-CONTENT-MANIFEST.tsv` 及 SHA，随后 runtime bytes 只读。flow/safety/quality 三位 read-only reviewer 必须引用同一 manifest SHA，并同时审 personal journal=`COMMITTED` 与两个 adapter-file postimage；reviewer 只能由 controller 在 read-only/scratch 子进程树启动，owner session 不另开并发 agent。Claude/Codex fresh session 各在项目 cwd 跑六项 direct 与 semantic/internal fixture；另从无项目 aliases 的 scratch cwd 验证两个 personal names，再回项目验证 canonical precedence。每条成功异常 trace 断言 `origin_u_id === resume_u_id`；terminal 只能 `resume_u_id:null`。任一 reviewer/live FAIL 时，controller 当前 action 先 durable checkpoint `REVIEW_FAILED`，下一次 lease-issued action 必须且只能是 `U-009-b/rollback-personal`；确认 reverse journal=`ROLLED_BACK` 和旧 file tuple 后才回对应 U-ID。修复并重新验收前需新的 `apply-personal` attempt；普通 main 不得直调 transaction CLI。
- Test scenarios：三 reviewer 同 manifest SHA；任一 runtime byte/mode/link 改动使旧 verdict stale；任一 direct/semantic/internal receipt 缺失即 FAIL；scratch-cwd personal loaders；项目 precedence；wrong/new/terminal resume ID；模拟 review FAIL 必须使 action registry 只放行 `rollback-personal`、验证 `ROLLED_BACK`，重复/越序 rollback 被 CAS 拒绝且幂等恢复可由新 attempt完成。
- Verification：controller `U-012/verify` 内部运行 candidate manifest verify、`node scripts/test-engineering-delivery-skills.mjs --all-post-cutover`、receipt post-cutover validator 与 `--case review-fail-rolls-back-personal`；均具名 PASS。三位 reviewer 明示 PASS 且引用同一 manifest SHA 与 COMMITTED personal tuple。
- Status：`PLANNED`

#### U-013 — Content-addressed commit、精确 URL push 与回滚凭据

- Goal：只发布本计划产物，不夹带其他 session WIP。
- Source：`USR-004,USR-007`
- Dependencies：`U-012`
- Read List：U-001 baseline/ownership；`IMPLEMENTATION-ALLOWLIST.txt`、`CANDIDATE-CONTENT-MANIFEST.tsv`、`IMPLEMENTATION-RECEIPT.md` 完整 bytes；U-011-c 冻结的 `scripts/publish-authorized-tree.mjs` postimage SHA；U-012 reviews；当前 worktree/index/HEAD/refs/common-dir、`remote.upstream.url` 与全部 `remote.upstream.pushurl`。
- Files：`framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-EVIDENCE-MANIFEST.tsv`、`framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md` 的 `publish_request` section；外部 `/Users/luca/.luca/audit/matt-six-skill-integration-publish-journal.json`、`...<integration-oid>.json{,.sha256}`；受控 side effects 为 scratch/real index lock+index、local commit/ref/reflog 和精确 remote destination ref。其余 candidate/evidence runtime paths 全部只读，只作 commit-tree 输入。
- Approach：先重验 personal journal=`COMMITTED`、两个 postimage、candidate manifest 和 task lease；填完 receipt `publish_request` 后生成 `PUBLISH-EVIDENCE-MANIFEST.tsv`（hash 另外五个 evidence 文件、不含自身），然后以一个 §5.0.2 live controller transaction 绑 plan/candidate/evidence SHA、repo identity、literal URL、destination 和 expected old OID，receipt 不记录后生的 record/commit hash。`publish-authorized-tree.mjs` 使用固定 `/usr/bin/git` + `env -i`，**先**以 O_EXCL 取真实 worktree 标准 `index.lock`，**再**在锁内读取并 byte-CAS 整个共享 index 等于 U-001 基线且对 expected old tree 无 staged delta；任一已 stage WIP 原样保留并停止，绝不覆盖。在 common-dir publish lock 下用独立 `GIT_INDEX_FILE` 从 expected old tree 只写 candidate+evidence manifests 的 path/mode/blob，验 tree 恰为 `base + manifests`；以 plumbing `write-tree/commit-tree`（无 hooks/editor）得到 immutable `integration_oid`，先 fsync 到 durable journal，再 `update-ref <destination> <integration_oid> <expected-old>` CAS，最后以 fsync+rename 安装已验 index。journal 覆盖 ref-update→index-install crash recovery。不运行 `git add`/普通 `git commit`，不消费共享 WIP。
- Publish：只有 controller `U-013/publish` 可调用 U-011-c 冻结的受信函数；push 完全不读 live repo/system/global Git config。controller 建隔离 scratch gitdir，设 `GIT_CONFIG_NOSYSTEM=1`、system/global config=`/dev/null`、empty `HOME/XDG_CONFIG_HOME`、只读 `GIT_OBJECT_DIRECTORY=<common-dir>/objects`，只注入 hash 冻结的 credential provider；不存在 local remote、`url.*.insteadOf/pushInsteadOf`、pushurl、hook/editor/prompt。同一隔离 config 先对字面 `https://github.com/wangmoumou1216-ai/luca_gstack.git` 做 `ls-remote`，必须等于 expected old。在呼叫 push 前先将 journal fsync 到 `PUSH_SENT`，再执行 `/usr/bin/git push <literal-url> <integration_oid>:refs/heads/main`；源是不可变 OID，不是 local branch/remote alias，不 force。remote=`integration_oid` 才记 `REMOTE_CONFIRMED`。只有同一经过 TLS 认证的 receive-pack 会话返回完整 protocol status（unpack status + destination ref 的明确 `ng`）且会话正常结束，才可记 `PUSH_REJECTED_PROVEN`；普通 nonzero、timeout、断线、响应丢失，或 `PUSH_SENT` 后仅观察到 remote=`expected_old`，都**不能证明未发布**，一律记 `PUSH_SENT_UNKNOWN`。`reconcile-push` 可用 literal URL 稳定轮询并把 unknown 收敛到 `REMOTE_CONFIRMED` 或 `REMOTE_DIVERGED`；若持续 old/不可读仍保持 UNKNOWN、task lease 与 personal postimage 均不动，停下请用户裁决。attestation 完成后才记 `ATTESTED`，再由 `release-lease` CAS archive 为 `COMPLETED`。若仅 archive 失败，记 `PUBLISHED_NEEDS_LEASE_RELEASE`并保持 fail-closed。
- Rollback：journal 尚未进入 `PUSH_SENT`，或已由完整 receive-pack status 进入 `PUSH_REJECTED_PROVEN` 时，下一次 lease-issued action 才可为 `U-009-b/rollback-personal`；未 push 的 local commit 保留为可恢复对象，不自动改 ref。`PUSH_SENT_UNKNOWN`、`REMOTE_CONFIRMED`、`REMOTE_DIVERGED`、`PUBLISHED_NEEDS_ATTESTATION` 或 `PUBLISHED_NEEDS_LEASE_RELEASE` 下均禁止自动 personal rollback。已发布后的仓内反转需另一次人类确认和新 plan/rollback authority，再由 controller 的新事务导入 publisher reverse 函数创建逆向 manifest commit 并 CAS push；本计划当前 action registry 不包含该发布后反转，不直接运行普通 `git revert`，不 reset，不删备份。
- Test scenarios：normal content-addressed commit/push；manifest 多/少 path、blob/mode/link 漂移、review 后 edit 均阻断；精确调度“无 staged 检查前/后另进程 `git add private.txt`”，publisher 只能先取 index.lock 或停下且不丢 staged WIP；本地 main 在 integration commit 后被另进程推进到 WIP commit，push 仍只能发 immutable integration OID；baseline/检查后 pushurl、remote alias、预置/检查后 `insteadOf/pushInsteadOf`、old-OID race/non-fast-forward/force 均不能改变 target；ref-update→index-install crash 可恢复；明确 protocol reject；receive-pack 延迟处理且客户端先丢响应、第一次/多次 `ls-remote` 仍为 old 后才更新；attestation/lease archive 失败；remote old/integration/other/不可读分流。`PUSH_SENT_UNKNOWN` 期间 personal 与 lease 必须原样。
- Verification：controller `U-013/verify-final` 内部运行 content-addressed publish transaction、delayed-receive-pack、publish-evidence validator 与 receipt validator；全部具名 PASS。commit tree path/mode/blob 等于两份 manifests，parent 等 expected old；成功路径隔离 `ls-remote` 的 remote OID **精确等于 journal 的 integration OID**，不以可变 local branch 代替。journal 先达 `ATTESTED`，再由独立 `release-lease` action CAS archive 为 `COMPLETED`；外部 `...<integration-oid>.json` 与 detached `.sha256` read-back PASS；receipt 不回写 actual OID。
- Status：`PLANNED`

### 5.1 Wave

```text
Wave 0: U-000 → bootstrap patch human reapproval → dual-harness restart
Wave 1: U-001
Wave 1b: U-011-a
Wave 2a（并行）: U-002, U-003, U-004
Wave 2b（并行）: U-005（等 U-003/U-004）, U-006, U-007
Wave 3: U-008
Wave 4: U-009-a → U-010
Wave 5: U-011-b → U-011-c（只在 scratch 证明 publisher；不发布）
Wave 6: U-009-b → U-012
Wave 7: U-013
```

## 6. Block 3 — 断言与质量 criteria

以下 shell 片段是 controller `verify` action 的**内部断言规格**。task lease 激活后，main/worker 不得直接执行任一片段；controller 必须在同一 action 中记录 exit、输出 hash、pre/post tuple 并原子 checkpoint。

```bash
# [BLOCKING] SK6-A00 — 计划实际 SHA 与 plan-stage ledger 绑定
if node scripts/test-engineering-delivery-skills.mjs --case plan-ledger-binding \
  --plan framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-EXECUTION-PLAN.md \
  --ledger framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md; then
  echo "PASS SK6-A00 plan-ledger-binding"
else
  echo "FAIL SK6-A00 plan-ledger-binding"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A01 — 六个 canonical skill 均存在并含 FILE_END
sk6_ok=1
for s in resolving-merge-conflicts to-spec implement wayfinder diagnosing-bugs grilling; do
  test -f ".claude/skills/office/$s/SKILL.md" &&
  rg -q '<!-- FILE_END:' ".claude/skills/office/$s/SKILL.md" || sk6_ok=0
done
if test "$sk6_ok" -eq 1; then echo "PASS SK6-A01 canonical-skills"; else echo "FAIL SK6-A01 canonical-skills"; exit 1; fi
```

```bash
# [BLOCKING] SK6-A02 — Claude/Codex 项目 aliases 可解析
sk6_ok=1
for s in resolving-merge-conflicts to-spec implement wayfinder diagnosing-bugs grilling; do
  test -L ".claude/skills/$s" && test -e ".claude/skills/$s/SKILL.md" &&
  test -L ".agents/skills/$s" && test -e ".agents/skills/$s/SKILL.md" || sk6_ok=0
done
if test "$sk6_ok" -eq 1; then echo "PASS SK6-A02 dual-aliases"; else echo "FAIL SK6-A02 dual-aliases"; exit 1; fi
```

```bash
# [BLOCKING] SK6-A03 — skill、路由、注册、harness、自模型闭合
if npm run validate:skills && npm run check:routing-map && npm run check:registration && npm run check:harness && npm run check:self-model; then
  echo "PASS SK6-A03 registration-closure"
else
  echo "FAIL SK6-A03 registration-closure"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A04 — 正例、负例、复杂度优先级和工程链行为通过
if npm run test:routes && node scripts/test-engineering-delivery-skills.mjs --all-pre-cutover; then
  echo "PASS SK6-A04 behavioral-suite"
else
  echo "FAIL SK6-A04 behavioral-suite"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A05 — canonical 主链与异常边存在
if node scripts/test-engineering-delivery-skills.mjs --case graph-contract; then
  echo "PASS SK6-A05 graph-contract"
else
  echo "FAIL SK6-A05 graph-contract"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A06 — meta 安装不污染 workflow-state
if git diff --exit-code -- .claude/templates/workflow-state.yaml .claude/workflow-state.yaml; then
  echo "PASS SK6-A06 workflow-state-untouched"
else
  echo "FAIL SK6-A06 workflow-state-untouched"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A07 — 六项 pin 的 path/commit/content hash 结构化一致
if node scripts/test-engineering-delivery-skills.mjs --case pin-integrity; then
  echo "PASS SK6-A07 pin-integrity"
else
  echo "FAIL SK6-A07 pin-integrity"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A08 — 完整仓库验证
if npm run verify; then echo "PASS SK6-A08 full-verify"; else echo "FAIL SK6-A08 full-verify"; exit 1; fi
```

```bash
# [BLOCKING] SK6-A09 — authorized commit tree 等于 base + candidate/evidence manifests
if node scripts/candidate-manifest.mjs --verify-authorized-tree \
  --allowlist framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-ALLOWLIST.txt \
  --manifest framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-CONTENT-MANIFEST.tsv \
  --evidence framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-EVIDENCE-MANIFEST.tsv \
  --receipt framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md; then
  echo "PASS SK6-A09 content-addressed-tree"
else
  echo "FAIL SK6-A09 content-addressed-tree"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A10 — 非发布阶段保持各 mode 规定的 Git/remote tuple
if node scripts/test-engineering-delivery-skills.mjs --case no-implicit-git-mutations; then
  echo "PASS SK6-A10 no-implicit-git-mutations"
else
  echo "FAIL SK6-A10 no-implicit-git-mutations"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A11 — 六项三层触发合同均有行为证据
if node scripts/test-engineering-delivery-skills.mjs --case trigger-contract; then
  echo "PASS SK6-A11 trigger-contract"
else
  echo "FAIL SK6-A11 trigger-contract"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A12 — receipt schema、无自引用 evidence、mutation causality 闭合
if node scripts/validate-skill-integration-receipt.mjs --final && \
   node scripts/candidate-manifest.mjs --verify \
     framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-CONTENT-MANIFEST.tsv && \
   node scripts/candidate-manifest.mjs --verify-publish-evidence \
     framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-EVIDENCE-MANIFEST.tsv; then
  echo "PASS SK6-A12 evidence-closure"
else
  echo "FAIL SK6-A12 evidence-closure"
  exit 1
fi
```

```bash
# [BLOCKING] SK6-A13 — bootstrap、maintenance/quarantine、controller CAS 与 worker 均在 live mutation 前 fail-closed
if node scripts/test-authority-bootstrap.mjs --case trusted-bootstrap-dual-harness && \
   node scripts/test-authority-bootstrap.mjs --case repo-global-lease-two-live-sessions && \
   node scripts/test-authority-bootstrap.mjs --case stale-worktree-quarantine && \
   node scripts/test-authority-bootstrap.mjs --case preauthorized-long-process-census && \
   node scripts/test-authority-bootstrap.mjs --case same-session-replay-cas && \
   node scripts/test-authority-bootstrap.mjs --case active-effect-authority && \
   node scripts/test-authority-bootstrap.mjs --case real-worker-bypass-dual-harness; then
  echo "PASS SK6-A13 pre-mutation-enforcement"
else
  echo "FAIL SK6-A13 pre-mutation-enforcement"
  exit 1
fi
```

```yaml
criteria:
  - id: C1
    failure_mode: "六项中任一只能点名调用，或 Claude/Codex/自然语言/内部 dispatch 解析到旧树、错能力/伪授权，或 stale worktree、在途 writer、non-owner/same-session replay 绕过 task transaction 改 live state。"
    pass_if: "六项逐项具有 Claude direct、Codex direct、无名 semantic 和受控 internal PASS receipt；U-000 在 writer census=0 后安装 common-dir hash-pinned guard，controller 一次性 attempt CAS 拒绝 replay/越序，quarantine 与每 action census 在 mutation 前阻断 stale/in-flight writer。"
    evidence_required: "6×触发矩阵、resolved SHA、transaction nonce/record、bootstrap patch+maintenance approval、hook error/timeout、forged/wrong-project/stale/revoked、stale-worktree/long-process 与 same-session replay receipts。"
  - id: C2
    failure_mode: "conversation_synthesis 生成了无法追溯或绕过 UI/design gate 的执行来源。"
    pass_if: "每个 in-scope source 都映射至 R/AE/TD→REQ/DEC→ASSERT→DEV/TEST；含 UI/state 的 design_scope:N/A mutant 必须失败。"
    evidence_required: "完整 traceability fixture、反向 coverage 表、UI/state negative fixture 与 mutant exit code。"
  - id: C3
    failure_mode: "规划/执行状态出现双真值、selected preset 死路，或 standalone implement 被迫依赖 workflow-only barrier/graph。"
    pass_if: "selected 初版只到 barrier，task-plan 后生 code revision+二次确认；standalone task-plan 生成 null-parent root revision 并单独确认，删掉 graph 仍可达；Orchestrator 只消费当前 revision，异常回原 U-ID。"
    evidence_required: "selected 不可拆整链、standalone direct/semantic/internal 三链、旧授权/placeholder/跳确认/偷读 graph mutants。"
  - id: C4
    failure_mode: "resolver 的旧授权在 repo 漂移后仍生效，或 resolver/implement 产生 effect allowlist 外变化。"
    pass_if: "resolver 在 common-dir 锁内用 fixed git/env-i/config allowlist 完成 action CAS→动作→postcheck；implement 仅由单进程 controller 的 scratch patch→apply 改 live tree；无隐式 commit/push。"
    evidence_required: "common lease/transaction lock、linked-worktree race、local gpg/PATH/GIT env/filter/hook mutants及完整 effect tuple。"
  - id: C5
    failure_mode: "diagnosing 在 red loop 前猜原因，或 snapshot 被 symlink/特殊文件绕过，或 diagnose-only 读 home/live `.env` 后泄漏、写 repo、联网。"
    pass_if: "snapshot 从 root FD 逐 component nofollow，只接受单链 regular file 并绑 inode/hash；sandbox 默认 deny read/write/network；敏感读另授权并预注册；stdout 在 model boundary 前流式 sanitize 全部编码形式。"
    evidence_required: "SSH/.env/邻接 home、final/parent symlink、hardlink/FIFO/device/socket、swap mutants；read/write/network tuple；pre-model probe 与五类 sentinel mutation receipts。"
  - id: C6
    failure_mode: "personal adapter swap 在崩溃时产生 missing/partial skill，或 COMMITTED 后 FAIL 无法反向恢复。"
    pass_if: "只原子替换两个 SKILL.md；每个状态看到完整旧/新文件，混合 catalog 可用；durable forward+reverse journal 支持 COMMITTED 后由 controller `rollback-personal` action 恢复并幂等。"
    evidence_required: "每 forward/reverse 状态 crash matrix、mixed-catalog fresh load、ROLLED_BACK tuple、backup preservation与二次 rollback。"
  - id: C7
    failure_mode: "receipt/evidence 自引用，共享 index WIP 被丢/夹带，local ref 竞态被推送，Git URL rewrite 发往错目标，或 push 后故障使 personal/remote split。"
    pass_if: "evidence manifest 不含自身；publisher 先取真 index.lock 再 byte-CAS，独立 index 构造 tree，以 immutable integration OID 从零共享 config 的 scratch gitdir 推字面 URL；PUSH_SENT 后只有完整 protocol reject 能证明未发布，old/timeout/lost-response 保持 UNKNOWN 且绝不回滚 personal。"
    evidence_required: "self-hash、tree proof、index staged-WIP 精确调度、local WIP ref race、pushurl/alias/insteadOf/old-OID mutants、delayed-receive-pack、PUSH_REJECTED_PROVEN/PUSH_SENT_UNKNOWN/REMOTE_CONFIRMED/DIVERGED、detached attestation。"
```

## 7. Block 4 — 失败、增量重规划与回滚

- 任一 `[BLOCKING]` FAIL：停在当前 U-block，不启动后续 Wave。
- 同一根因两次质量门失败：delta replan；三次仍失败则 `BLOCKED`。
- U-000 激活 task lease 后、U-013 终态前的任何普通 FAIL，都由当前 controller action 在退出前 CAS 写为 `BLOCKED_AT:<U-ID>`；若进程崩溃则保持 `ACTION_INDETERMINATE`，不靠另一次普通 Bash补状态。resume 需 owner session 重验完整 preimage并消费 lease-issued `recover-task`；换 session 或 abort 需新的用户确认。`abort-task` 只在 controller 证明全部 U-001 以后 delta 均为本事务所有后按倒序 manifest 恢复并归档 task lease；**bootstrap guard/controller 永不由 task abort 卸载或回退**，任一 unowned delta 使 abort 停止。
- personal resolver 或 systematic-debugging 未实际解析到项目 canonical/compat adapter：不得宣称双端安装完成。
- `U-009-b..U-012` 任一步失败：controller 先把 action state checkpoint 为 `REQUIRES_PERSONAL_ROLLBACK`，registry 随后只放行 lease-issued `U-009-b/rollback-personal`；验 reverse journal=`ROLLED_BACK` 且两个 personal entry 回原 tuple。普通 main 不得直接调用 transaction module；恢复失败为 `BLOCKED`。
- `U-013` 必须先读 durable publish journal 再决定恢复：`PRE_PUSH` 或带完整 receive-pack `ng` 证据的 `PUSH_REJECTED_PROVEN` 才允许 `rollback-personal`；`PUSH_SENT_UNKNOWN/REMOTE_CONFIRMED/REMOTE_DIVERGED/PUBLISHED_NEEDS_ATTESTATION/PUBLISHED_NEEDS_LEASE_RELEASE` 均保持 personal 新 adapter 与 task lease，只允许具名 reconcile/attest/release 或人类裁决。`PUSH_SENT` 后看到 remote=expected-old 本身绝不授权回滚。
- fresh Claude 或 Codex live receipt 缺失：`BLOCKED`，静态检查不能降级成 DONE。
- synthesis mode 让 UI/交互任务绕过 design-brief：回滚 `U-004` 并重规划，绝不新增第二份 spec 绕开。
- preset 无法经 Plan Agent 编译为持久计划、或 graph 需要新 workflow-state 才能表达：回滚 `U-008` preset，保留 standalone 能力并重规划。
- allowlist 文件被其他 session 改动：`NEEDS_CONTEXT`，报告碰撞 hunk；不 overwrite、stash、reset 或整文件夺权。
- 任一 runtime target 在 U-001 baseline 或 U-012 manifest 冻结后出现非本事务 owner 的同路径 byte/mode/link 变化：旧 receipt/review 全部 stale，停下 `NEEDS_CONTEXT`；不能靠重新 stage 吞掉。
- Git 冲突、remote drift、非 fast-forward 或任何 force 需求：`U-013` 授权失效，先按 publish journal 的 pre/post-push 阶段分流，再停下报告；绝不统一自动回滚。

## 8. Block 5 — 出门自检

- [x] 前提门已判真问题、更薄方案、默认偏差和 7 个 kill assumptions。
- [x] 每个 U-block 可追溯到 `USR-001..007`。
- [x] 个人 skill 迁移可恢复；冲突动作与 force 类操作有独立硬门。
- [x] 外部研究已由冻结源码完成，跳过额外研究有明确理由。
- [x] 每个 Phase 有 model tier；本任务非视觉设计，OD-first 为 N/A。
- [x] Skill-first / Graph-optional 保留；standalone 与 workflow 同时有验收。
- [x] 明确排除第二套 tech-spec/task-plan/state、外部 tracker canonical、自动 commit/push、自动 resolver 推进、批量 grilling 和未兑现的并发 claim。
- [x] 用户确认前所有 U-block 保持 `PLANNED`。

## 9. 用户确认门

用户明确批准**本文 SHA**后，执行者只允许在 scratch 生成 `U-000` bootstrap patch；独立审查后必须把**精确 patch SHA 再交用户二次批准**，才可发生第一次 live write。双 harness enforcement 通过后才按 `U-001 → U-011-a → … → U-013` 继续，所有门通过后以 content-addressed commit 和 immutable-OID push 发布。若用户希望改变任一裁决（例如保留旧 debugging 正文、启用 tracker、或不迁移 personal resolver），必须先改计划、重做同 SHA 审查并再批准，不能边做边偏离。

## 10. Repo 精确 allowlist（U-001 原样复制后 `LC_ALL=C sort -u`）

以下每行是一条 repo-relative path；无 glob、无目录通配、无 personal 路径。实施若需要新增任一路径，必须先 delta replan 并重新取得用户确认。

```text
.agents/skills/diagnosing-bugs
.agents/skills/grilling
.agents/skills/implement
.agents/skills/resolving-merge-conflicts
.agents/skills/to-spec
.agents/skills/wayfinder
.claude/agents/orchestrator.md
.claude/agents/plan-agent.md
.claude/commands/diagnosing-bugs.md
.claude/commands/grilling.md
.claude/commands/implement.md
.claude/commands/resolving-merge-conflicts.md
.claude/commands/to-spec.md
.claude/commands/wayfinder.md
.claude/hooks/project-scope-guard.mjs
.claude/hooks/route-guard.mjs
.claude/skill-os/codex-viability.yaml
.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md
.claude/skill-os/compat/systematic-debugging/SKILL.md
.claude/skill-os/evolution/adoption-log.jsonl
.claude/skill-os/evolution/self-model.generated.yaml
.claude/skill-os/external-skills/installed-pins.yaml
.claude/skill-os/input-modes.yaml
.claude/skill-os/model-routing.yaml
.claude/skill-os/optional-workflow-graph.yaml
.claude/skill-os/routing-chain-check.md
.claude/skill-os/skill-routing-map.yaml
.claude/skills/diagnosing-bugs
.claude/skills/grilling
.claude/skills/implement
.claude/skills/resolving-merge-conflicts
.claude/skills/to-spec
.claude/skills/wayfinder
.claude/skills/office/diagnosing-bugs/LICENSE
.claude/skills/office/diagnosing-bugs/PROVENANCE.md
.claude/skills/office/diagnosing-bugs/SKILL.md
.claude/skills/office/diagnosing-bugs/agents/openai.yaml
.claude/skills/office/diagnosing-bugs/references/condition-based-waiting-example.ts
.claude/skills/office/diagnosing-bugs/references/condition-based-waiting.md
.claude/skills/office/diagnosing-bugs/references/defense-in-depth.md
.claude/skills/office/diagnosing-bugs/references/root-cause-tracing.md
.claude/skills/office/diagnosing-bugs/scripts/find-polluter.sh
.claude/skills/office/diagnosing-bugs/scripts/hitl-loop.template.sh
.claude/skills/office/diagnosing-bugs/scripts/safe-diagnostic-runner.mjs
.claude/skills/office/diagnosing-bugs/scripts/safe-snapshot-copy.py
.claude/skills/office/grilling/LICENSE
.claude/skills/office/grilling/SKILL.md
.claude/skills/office/grilling/agents/openai.yaml
.claude/skills/office/implement/LICENSE
.claude/skills/office/implement/SKILL.md
.claude/skills/office/implement/agents/openai.yaml
.claude/skills/office/references/office-wizard.md
.claude/skills/office/resolving-merge-conflicts/LICENSE
.claude/skills/office/resolving-merge-conflicts/SKILL.md
.claude/skills/office/resolving-merge-conflicts/agents/openai.yaml
.claude/skills/office/resolving-merge-conflicts/scripts/conflict-transaction.mjs
.claude/skills/office/task-plan/SKILL.md
.claude/skills/office/tech-spec/SKILL.md
.claude/skills/office/to-spec/LICENSE
.claude/skills/office/to-spec/SKILL.md
.claude/skills/office/to-spec/agents/openai.yaml
.claude/skills/office/wayfinder/LICENSE
.claude/skills/office/wayfinder/SKILL.md
.claude/skills/office/wayfinder/agents/openai.yaml
.codex/codex-hook-adapter.mjs
AGENTS.md
CLAUDE.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/FINAL-EXECUTION-PLAN.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-CONTENT-MANIFEST.tsv
framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-ALLOWLIST.txt
framework-audit/2026-08-30-mattpocock-six-skills-integration/IMPLEMENTATION-RECEIPT.md
framework-audit/2026-08-30-mattpocock-six-skills-integration/PUBLISH-EVIDENCE-MANIFEST.tsv
framework-audit/2026-08-30-mattpocock-six-skills-integration/REVIEW-LEDGER.md
package.json
scripts/apply-authorized-patch.mjs
scripts/authority-controller.mjs
scripts/candidate-manifest.mjs
scripts/check-skill-scene-coverage.py
scripts/publish-authorized-tree.mjs
scripts/run-authorized-worker.mjs
scripts/skill-cutover-transaction.mjs
scripts/test-authority-bootstrap.mjs
scripts/test-engineering-delivery-skills.mjs
scripts/test-route-guard.mjs
scripts/validate-skill-integration-receipt.mjs
scripts/verify.sh
```

<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->
