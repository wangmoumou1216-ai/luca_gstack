# Agent root document lightweight baseline — Phase 0

Date: 2026-09-04 (Asia/Shanghai)
Scope: `NO_PIN` lucagstack framework/meta
Baseline commit: `94f086233affb3bd08ad8fe33063bcfedb330edf`
Tracking commit: `upstream/main` = `94f086233affb3bd08ad8fe33063bcfedb330edf`

## Boundaries and protected state

- No project pin is used. `docs/`, `.claude/workflow-state.yaml`, `.claude/current-topic.txt`, downstream projects, and `framework/` are out of scope.
- The pre-existing `memory/retrieval-log.jsonl` worktree change is user-owned and excluded from every task diff, rollback, stage, commit, and push. At this checkpoint it is `7` added lines and has SHA-256 `4df15875e38ceeb5eece64a09917b28c08162de80acf39e4ea78c5eadb5aeb66`.
- Manual edits use `apply_patch`. Each implementation phase is a separate patch set and must pass its narrow gate before the next phase begins.
- The approved handoff is the execution plan. New evidence may stop a phase; it does not authorize silent redesign.

## Reproducible baseline

### Runtime

| Surface | Value |
|---|---|
| Git | `2.50.1 (Apple Git-155)` |
| Node | `v22.23.1` |
| npm | `10.9.8` |
| Python | `3.14.5` |
| Codex CLI | `0.153.2` |
| Claude Code | `2.1.260` |

### Root documents

| File | Lines | Bytes | SHA-256 |
|---|---:|---:|---|
| `AGENTS.md` | 871 | 55,712 | `f09ca206b7e79359132f7bedba9ca293ebbcd520b0d851e4f8b7e82b71a5b40c` |
| `CLAUDE.md` | 567 | 45,024 | `af881e7f26338ac747b581b93f8099a447a236e8f3ccd7a4883e8eb6f8c72102` |
| `.claude/skill-os/claude-md-appendix.md` | 333 | 30,086 | `05d68bebe0083d3234de0a88e606bd40de7fc41c12f7aeee3cfe134d29167e4b` |

Current unconditional Codex exposure is approximately 100,736 bytes because `AGENTS.md` requires reading the full `CLAUDE.md` for non-trivial work.

### Static gates

All commands were run from the baseline commit and returned exit `0`:

| Gate | Fresh result |
|---|---|
| `npm run check:routing-map` | PASS routing coverage and skill SSOT |
| `npm run check:registration` | PASS 33 first-level skills |
| `npm run check:agents-parity` | PASS 22 / FAIL 0 |
| `npm run check:coding-discipline` | PASS |
| `npm run check:quality-gates` | PASS |
| `npm run check:self-model` | PASS generated = live disk |
| `node scripts/check-appendix-pointers.mjs` | PASS 13 sections |
| `node scripts/check-model-table.mjs` | PASS 4 Claude alias rows |
| `node scripts/check-capability-parity.mjs` | PASS 141 anchors, 44 shared projections, 1 delegated projection |
| `npm run test:writing-for-agents` | PASS |
| `npm run check:harness` | PASS 13 harness assertions and 45 Codex viability assertions |
| `npm run test:semantic-parity` | PASS real repository plus proof-it-bites 31/31 |
| `bash scripts/verify.sh` | PASS 89 / FAIL 0 / WARN 1 (non-blocking ADR warning) |

These results prove only the old contract. They do not prove that a smaller root document preserves runtime behaviour.

### Real Harness smoke baseline

Both CLIs were invoked against the repository in read-only mode:

- Claude Code returned `CLAUDE_BASELINE_OK` and identified `luca_gstack` as the personal Skill OS with `main` as the single truth source.
- Codex returned `CODEX_BASELINE_OK` and identified `luca_gstack` as a product-neutral Skill OS. The live run also reproduced the skill-description context-budget truncation warning.

This establishes CLI availability for later A/B. It is not the P6 behavioural equivalence result.

## K1–K10 obligation matrix

Each obligation must remain inline in both root adapters. A truth owner can refine the obligation but cannot replace the inline kernel.

| ID | Independent root obligation | Existing truth owner / evidence | Runtime consumers | P0 disposition |
|---|---|---|---|---|
| K1 | Product-neutral Skill OS identity; product facts come from a verified active project | `CONTEXT.md`; project identity helpers | Claude root reader, Codex root reader, project gate | `INLINE`; shorten independently in both roots |
| K2 | Project Gate → Plan → Framework Flow → Multi → Single → STOP | `.claude/skill-os/skill-routing-map.yaml`, `.claude/agents/plan-agent.md`, route guard | root readers, `route-guard.mjs`, `check-routing-map.mjs` | `INLINE`; exact ordered kernel in both roots |
| K3 | Five Plan triggers; Supervisor/Hierarchical waits for user approval | `.claude/agents/plan-agent.md` | root readers, routing checker, orchestrator | `INLINE` summary plus one-hop owner pointer |
| K4 | STOP is not permission to execute; semantic fallback and truly mechanical single-file exemption remain | `.claude/skill-os/routing-chain-check.md`; future generated catalog | root readers, STOP path, skill discovery | `INLINE`; catalog must exist before long Codex table leaves |
| K5 | Per-session pin / `NO_PIN`; shared symlinks display only; switch/new uses emitted transaction | `project-scope-guard.mjs`, project transaction scripts | root readers, session restore, scope guard | `INLINE` safety kernel; detailed cases `CONDITIONAL` |
| K6 | `framework/` read-only; protect user work; destructive/external effects require scoped authority | `CONTEXT.md`, runtime safety contract, controlled-change contract | all mutation paths | `INLINE`; no pointer-only downgrade |
| K7 | Human gates remain human gates without a structured widget | plan/skill-specific gate owners; harness capabilities | both root readers and orchestrators | `INLINE`; runtime-specific wording allowed |
| K8 | Six allowlisted Static Fallback facts stay inline and text-equivalent | `promoted-facts.yaml` + `static-fallback-allowlist.txt` | roots, memory health, promotion writers, session restore | `INLINE`; generated projections and normalized-body parity required |
| K9 | Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution | `.claude/skill-os/skill-authoring.md`, `check-coding-discipline.mjs` | both root readers and code tasks | `INLINE` compact four-item form |
| K10 | Minimal startup, conditional loading, `FILE_END`, and Claude/Codex invocation/capability differences | root adapters, harness library, generated skill catalog | session startup and skill dispatch | `INLINE` minimum plus `CONDITIONAL` catalog/details |

P0 completeness check: every K-ID has two direct root consumers, at least one truth owner, and a migration disposition. None depends on `AGENTS.md` reading `CLAUDE.md`.

## Reader / writer / validator / injector / normative-pointer matrix

| Role | Current component | Reads or writes | Migration obligation |
|---|---|---|---|
| Reader | Claude Code root loader | `CLAUDE.md` | Must remain independently sufficient for K1–K10 |
| Reader | Codex root loader | `AGENTS.md` | Must remain independently sufficient for K1–K10; remove unconditional `CLAUDE.md` read only in P4a |
| Reader | Codex semantic discovery | long table in `AGENTS.md`, route-guard matched skills | Must gain one-hop generated catalog before table removal; STOP must not depend on `matchedSkills` |
| Reader | Claude routing | long registry and semantic prose in `CLAUDE.md` | Keep compact direct index; route to final owners in one hop |
| Writer | `memory/scripts/consolidate_memory.py` | writes allowlisted SF projection into `CLAUDE.md` | Atomically migrate to canonical projection writer for both roots |
| Writer | `memory/scripts/daily_governance.py` | reads root size and updates model snapshots | Replace root prose writes/snapshots with owner/projection-aware operations |
| Writer | candidate review/promotion path | may promote governed facts | Freeze real promotion during cutover; mutation tests use fixtures |
| Validator | `check_memory_health.py` | allowlist ↔ `CLAUDE.md` IDs | Upgrade to canonical fact body + both-root projection parity |
| Validator | `check-agents-parity.mjs` | large-section/line-count anchors and SF IDs | Replace anti-shell size checks with K-ID, body parity, independent-adapter and contradiction checks |
| Validator | `check-routing-map.mjs` | first 40 lines, plan lists, hidden roster, route anchors | Point detailed obligations to truth owners while retaining root-kernel assertions |
| Validator | `check-registration-sync.mjs` | long Claude registry | Migrate to generated catalog/manifest truth without losing first-level registration coverage |
| Validator | `check-coding-discipline.mjs` | prose anchors in both roots | Retain four compact K9 obligations and prove deletion bites |
| Validator | `check-capability-parity.mjs` | root and projection anchors | Update to new adapters/catalog without keyword-shell restoration |
| Validator | `check-appendix-pointers.mjs` | mega-appendix ↔ Claude witness strings | Replace with manifest-driven one-hop pointer checker before appendix exits runtime |
| Validator | `check-model-table.mjs` | Claude four-row alias snapshot | Replace with direct canonical YAML validation; no model table cache in roots |
| Validator | `verify.sh`, CI, commit-msg | aggregates root byte and semantic gates | Wire new kernel/pointer/SF/discovery/budget/contradiction gates before cutover |
| Injector | `session-restore.mjs` | tells failed memory loads to use Claude SF section | Point to runtime-local inline fallback; Codex must never require Claude root |
| Injector | `route-guard.mjs` | injects rules only for matched skills | Keep as fast path; never make it the STOP discovery loader |
| Normative pointer | `.claude/agents/plan-agent.md` | K3 full contract | Final owner for plan triggers and confirmation semantics |
| Normative pointer | `.claude/skill-os/routing-chain-check.md` | semantic fallback/review evidence | Final owner for K4 detail and final independent review criteria |
| Normative pointer | `.claude/skill-os/model-routing.yaml` | cross-harness model-tier truth | Fix internal prose contradiction before migrating consumers |
| Normative pointer | `.claude/skill-os/input-modes.yaml` and workflow graph | standalone/workflow details | Conditional owner; not inline beyond Skill-first/Graph-optional SF fact |
| Normative pointer | `.claude/skill-os/skill-authoring.md` | agent-writing craft | Conditional owner for root/skill editing |
| Normative pointer | `.claude/skill-os/{extraction-bar,correction-attribution}.md` | memory governance detail | Conditional owner for correction/remember requests |
| Normative pointer | `.claude/skill-os/claude-md-appendix.md` | mixed historical and conditional detail | Leave physically present through P6, but remove from automatic runtime after replacements prove reachable |

## Existing root content classification

Classification applies at the baseline commit. `MIXED` means the section must be split into the listed classes before any removal; it is not deletion permission.

### `CLAUDE.md`

| Baseline section | Classification | Reason / target |
|---|---|---|
| Routing Contract TL;DR | `INLINE` | K2 |
| 仓库概览与非显然的坑 | `MIXED: INLINE + CONDITIONAL + ARCHIVE` | K1/K5 remain; historical counts and old placement protocol leave runtime |
| 核心行为原则 / Coding Discipline | `INLINE` | K3/K6/K9; details point to owners |
| Loop 宪法 | `CONDITIONAL` | Load only for loop/orchestration work |
| Context 工程协议 and checkpoint subsections | `CONDITIONAL` | Triggered by long/multi-phase work; owner must be one hop |
| 三层记忆系统 / read/write/auto-grow | `CONDITIONAL` | Triggered by query/ingest/lint/correction/remember/governance |
| Static Fallback | `INLINE` | K8, generated from canonical facts |
| 强制读完规则 | `INLINE` | K10 |
| luca_gstack environment split | `MIXED: INLINE + CONDITIONAL` | K1/K5/K10 inline; registries and workflow details conditional |
| Long first-level skill registry | `CONDITIONAL`, then `DELETE` cache | Replace with generated catalog and compact direct index |
| muse additions and semantic examples | `CONDITIONAL` | Load from catalog/routing owners when leading words match |
| 使用即留任历史 and dated experiments | `ARCHIVE` | Governance evidence, not every-session runtime law |
| 路由层级 | `INLINE` | K2/K4 compact ordered contract |
| Skill 调用规则 | `MIXED: INLINE + CONDITIONAL` | K4/K10 inline; domain branches go to final owners |
| Session 启动协议 | `MIXED: INLINE + CONDITIONAL` | K5/K10 inline; detailed project cases conditional |
| Orchestrator mode | `CONDITIONAL` | Load when workflow/orchestrator is selected |
| Standalone / Workflow mode | `CONDITIONAL` | Load for skill/workflow dispatch |
| Project memory write timing | `CONDITIONAL` | Load only for project entry or memory writes |
| 产出目录结构 | `DELETE` cache | Filesystem and skill owner are queryable truth |
| luca app integration | `CONDITIONAL` | `LUCA_APP=1` or explicit sidebar/app intent |
| 规则优先级体系 | `MIXED: INLINE + CONDITIONAL` | K6/K7 minimum inline; full conflict method conditional |
| 模型路由 table and historical narrative | `CONDITIONAL + ARCHIVE` | Canonical YAML is owner; stale snapshots/history leave root |

### `AGENTS.md`

| Baseline section | Classification | Reason / target |
|---|---|---|
| Routing Contract TL;DR | `INLINE` | K2 |
| Repository Identity | `MIXED: INLINE + CONDITIONAL + ARCHIVE` | K1/K5/K6 remain; dated incident detail and queryable stack facts leave root |
| Instruction Priority | `INLINE` | K6/K7 plus compact routing precedence |
| Mandatory Startup Context | `MIXED: INLINE + CONDITIONAL` | K10 minimum; task/skill branches become one-hop pointers |
| Prompt Engineering Contract | `MIXED: INLINE + CONDITIONAL` | completion status and scene detail load when relevant |
| Coding Discipline | `INLINE` | K9 |
| Context Engineering Contract 4.1–4.7 | `CONDITIONAL` | Design/workflow/memory branch owners |
| Governance Parity 4.8.1 | `CONDITIONAL` | memory correction/write trigger |
| Governance Parity 4.8.2 | `CONDITIONAL + ARCHIVE` | model owner pointer; dated harness facts/history leave root |
| Governance Parity 4.8.3 | `INLINE` | K5 |
| Governance Parity 4.8.4 | `INLINE` | K7 |
| Governance Parity 4.8.5 | `INLINE` | K8 |
| Harness Engineering Contract | `MIXED: INLINE + CONDITIONAL` | K6 minimum; task-type output/path details conditional |
| Cross-Model Collaboration | `CONDITIONAL` | Load for cross-harness handoff or shared-artifact work |
| Workflow Routing / long first-class table | `MIXED: INLINE + CONDITIONAL`, then `DELETE` cache | K2/K4 inline; replace discovery table with generated catalog |
| Prototype Rules | `CONDITIONAL` | Load for prototype work; `framework/` read-only stays K6 inline |
| Review Rules | `CONDITIONAL` | Load for review requests |
| Session Start Checklist | `DELETE` duplicate cache | K10 becomes the direct compact startup protocol |
| Non-Goals | `MIXED: INLINE + CONDITIONAL + ARCHIVE` | K10 invocation difference inline; stale counts, model history, and duplicate rules leave root |

### `.claude/skill-os/claude-md-appendix.md`

The file is a mixed rollback surface, not a future mega-owner. Checkpoint, project-gate, memory, app/sidebar, and harness families must move or point to focused existing owners. Dated superseded rationale is `ARCHIVE`. No new unrelated trigger family may be added. The file remains physically present through P6 and only exits automatic loading after one-hop reachability tests pass.

## Known baseline contradictions and kill conditions

1. `model-routing.yaml` correctly maps Codex mechanical work to `low` and rejects `minimal`, but its `codex.principle` prose still says the relative order ends in `minimal`. `AGENTS.md` repeats both the corrected and stale forms. P1 must repair the canonical prose and add contradiction detection before any model consumer migration.
2. Root skill-count snapshots disagree with disk (`43` versus 44 shared + 1 delegated). Dynamic counts are `DELETE` caches; generated catalog denominators must come from disk/metadata.
3. Existing green tests rely heavily on literal anchors, line counts, and root tables. They are baseline compatibility evidence only. P2 must install semantic/mutation gates before P4 cutover.
4. If either real CLI becomes unavailable, if STOP discovery cannot be demonstrated, if Static Fallback cannot survive hook/memory disablement, or if any K-ID lacks an independent inline projection, P6 cannot pass.

## Phase 0 gate

P0 may advance only when a fresh read-back confirms: baseline commit equals tracking commit; the protected dirty file remains excluded; all focused/static checks and full verify are green; both real CLIs answer a read-only probe; every K-ID has an owner and two independent root projections; all current root sections have an explicit disposition; and the two known factual drifts are recorded as pre-cutover blockers.

## Phase checkpoints

### P0 — PASS

Fresh evidence: baseline/tracking SHA equality; focused gates green; `verify.sh` 89/0; real Claude and Codex smoke probes; complete K1–K10 and consumer/disposition matrices above.

### P1 — PASS

Created the machine kernel, one-hop manifest, explicit skill visibility metadata, four focused runtime modules, deterministic 45-skill catalog, and canonical six-fact Static Fallback projection. All new Markdown modules are below 12KB and end in `FILE_END`. Corrected the canonical Codex effort-order prose from rejected `minimal` to `low` while leaving `max` as unmapped headroom.

Fresh gate evidence: structure `obligations=10 pointers=10 catalog=45 fallback=6`; generated context current; model-table, Codex static wiring, agents parity, and self-model checks green; `AGENTS.md` and `CLAUDE.md` remain byte-identical to P0.

### P2 — PASS

Entered bounded dual-read compatibility, added the single Static Fallback projection writer, and
installed machine checks for K1–K10, pointer targets/triggers/EOF, catalog coverage, model
contradictions, Plan/HITL duties, projection parity, cycles, second hops, and mega-modules. Initial
mutation suite passed 13/13 before root removal began. Memory health now validates both runtime
projections from the canonical promoted-fact allowlist.

### P3 — PASS

The manifest now has 16 one-hop entries backed by focused existing owners or six small runtime
modules. Claude and Codex resolution canaries both hit project session, memory extraction, long
session, luca app, harness boundary, model routing, review, framework maintenance, and cross-harness
targets; the ordinary-question control loads no conditional target.

### P4a / P4b / P4c — PASS

P4a removed the Codex-to-Claude root dependency and passed real Claude/Codex smoke probes. P4b
replaced only `CLAUDE.md`, then P4c replaced only `AGENTS.md`; each cut passed K checks, mutations,
resolution canaries, and live regression. Final root sizes at cutover are below 10KB each, and each
root independently carries all ten bounded obligations plus the exact six-fact fallback.

### P5 — PASS

Consumers now read the kernel, generated catalog, visibility metadata, manifest, or canonical model
owner instead of the removed prose caches. The former mega-appendix remains physically available
only as rollback evidence and is absent from both roots and the manifest. `verify.sh`, CI, and the
commit-msg hook enforce the 30KiB root budget and the new context graph. The frozen mutation suite is
19/19: structural graph drift, root cross-read, STOP/discovery omission, semantic Plan/HITL weakening,
and `framework/` write-permission weakening all make the gate fail. The commit hook is tested against
an exported Git-index snapshot, so an unstaged valid worktree cannot hide an invalid staged candidate.
The memory promotion fixture also uses distinct code and memory roots. A deterministic mid-install
failure proves that synchronous writer errors restore the promoted fact and every projection
preimage; each individual install is an atomic rename, while cross-file crash atomicity is not
claimed. Full repository verification after cutover:
PASS=90, FAIL=0, WARN=1 (the pre-existing non-blocking ADR warning).

### P6 — BLOCKED (2026-09-05)

The formal v12 candidate/Codex batch was interrupted after F4-direct scoring failures followed by
CLI startup failures. It contains 68 rows: 15 passes, 2 scored failures, and 51 ENOENT errors;
2 in-flight trials have no completed row. No final A/B acceptance exists. Earlier v1–v11 and
calibration evidence must not count toward a replacement batch. The current report withdraws the
obsolete protocol-v2 success claim and records exact run identities and failure evidence:
`framework-audit/2026-09-04-agent-context-ab-report.md`.

Fresh local verification remains green: `verify.sh` PASS=91/FAIL=0/WARN=1; promotion unit regression
passes; diff whitespace checks pass. The protected retrieval-log hash remains identical to P0,
the index is empty, and no commit/push occurred. Implementation review had passed its bounded
rollback/index/mutation scope; final independent behavioural acceptance remains outstanding.
The protocol reviewer independently confirmed a fixture/scorer specification mismatch (candidate
behaviour inconclusive), and the runner's failure to stop new dispatch after a critical failure.
No A/B process remains active. Resume within P6 only: resolve the bounded fixture/scorer and
dispatch-stop defects, restore a stable real CLI, freeze a successor, run all four complete batches,
then obtain final independent refutation review. None of those fixes has been silently applied at
this stop. Do not replay any prior successful trial into the final denominator.

### P6 resume — IN_PROGRESS (2026-09-05 12:54)

After the explicit user resume, bounded v12 scorer/dispatch fixes were implemented and independently
reviewed. v13 also exposed loss of actual tool output in EOF evidence; v14 now retains output and
verifies consumed content rather than assuming a successful command delivered its full range.
Both evaluator self-tests and the 19/19 mutation/projection/index suite pass freshly. Real v14
long-owner calibration and independent EOF review are in progress; no formal v14 batch is accepted.
Codex CLI is 0.153.4. Claude CLI is 2.1.261; user re-login cleared 403, with session quota resetting
at 13:00. Continue P6 only; preserve all failed/calibration rows and keep them outside final totals.

At 12:58, v14 independent protocol review passed, actual Codex F3 read-content calibration passed,
and full verify completed at 91/0/1. Evaluator hash is `105f7379390196994136b448f8fb24b5c56d33a0fbd432fd06db268ef92b24d0`.
Live formal runners: candidate/Codex exec session `15018`; baseline/Codex session `40396`.
Claude calibration is due after 13:00. Poll each runner, retain all rows, and stop on a candidate
critical failure or infrastructure error. Final four-batch evidence and independent closure remain.

At 13:10, both v14 formal runners are stopped and excluded. Candidate queue correctly stopped at
14 recorded rows (12/2); the two failures were legitimate `sed N,$p` forms, independently confirmed
as classifier false negatives. Claude v14 calibration identified missing read permissions and the
native StructuredOutput exception. v15 fixes these adapters with positive/negative self-tests.
Haiku/low then showed actual F3 behaviour failure (missing startup reads and wrong Supervisor
approval), retained as an explicit model limitation. Opus calibration follows core-execution mapping;
both formal Claude arms must use one identical fixed configuration. Live calibration sessions:
Opus F3 `16361`; Codex all-14 once `92216`. Independent v15 review is active; no formal v15 batch yet.

At 13:19, v15 protocol repair was independently approved and Opus F3 calibration passed. Codex F5
calibration exposed an output-field/source contradiction, independently confirmed as fixture error;
v15 queues were stopped. v16 separates the catalog authority claim from actual read sources and
closes equivalent F2/F11 field-shape issues. Both self-tests pass. Current live calibration sessions:
Claude Opus all-14 `21865`; Codex all-14 `86044`; runner hash
`ef4abfcfd8690e9a4e3c14a6112c973f4a9dac52df5a4f8db0e0ba0b0b92c50f`.
Require both all-14 calibrations and independent protocol closure before new formal batches.
Independent implementation reviewer is checking remaining post-A/B publication obligations,
including the original plan's final hard-budget headroom rule. No commit/push has occurred.

At the v17 checkpoint, the v16 sessions above are stopped: independent review found source strings
were not bound to actual reads. v17 uses exact source path arrays and proves each cited file's full
observed content (own preloaded root excepted); candidate F5 requires catalog source while baseline
can use its old preloaded root. Both evaluator self-tests pass. New all-14 candidate calibration
sessions: Claude Opus `4350`, Codex `79693`. Independent protocol review is active. Formal sampling
still requires both full calibrations plus protocol PASS. The final root hard cap remains a
post-A/B obligation: choose safe measured size plus small headroom, enforce checker/verify/CI,
test budget rejection, and prove runtime-context/evaluator identities unchanged before publication.

At 13:35, the user explicitly approved reduced Claude sampling. Final required evidence is now
Codex 14×5×2 arms=140 and Claude Opus 14×1×2 arms=28, total168; no fixture is dropped, no old rows
are reused, and reduced Claude repeatability confidence must be disclosed. After independent
protocol closure, harnesses may run their fresh formal batches independently, without redundant
Claude calibration. v17 runners above are both stopped: Claude7PASS+2HTTP429 errors (reset18:00),
Codex12PASS+1F10 allowlist failure (read CONTEXT's CRM owner), one fixture undispatched. v18 fixes
the independently proved F9 baseline/candidate isolation asymmetry; all four arm/harness selftests
pass. F10 boundary classification is under independent review; no v18 sampling has begun.
Full verify just completed91/0/1. No commit/push; final budget remains after A/B acceptance.

v18 is independently PASS/frozen at evaluator
`ae17812ed7340f33c559a17eeda6591a4df69b5d45efd409a7b1008e71e7e052`.
F10 was confirmed as a missing explicit CONTEXT owner edge; the exact edge is now allowed without
recursive loading. Fresh Codex formal runners: candidate session `40411`, baseline session `55032`,
each14×5/concurrency3; batch IDs `v18-formal-candidate-codex-20260905` and
`v18-formal-baseline-codex-20260905`. Claude28 deferred until quota restoration/reset18:00.
All four arm/harness selftests and fresh full v18 verify91/0/1 pass. A temporary read-only evidence
auditor is `/private/tmp/luca-v18-formal-audit.mjs` (progress by default; `--verify --codex-only` must
reject incomplete70-row batches, demonstrably does). It is not a replacement for final independent
review. Frozen context identities: candidate `7f0b250d036f1e56808d469111b562524c0f0db7263d322bdf7619d0ee6900fe`,
baseline `4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7`.

At the v19 checkpoint, v18 sessions40411/55032 are interrupted and excluded (candidate8/8,
baseline5/8). Independent review confirmed baseline source rejection of genuinely read CLAUDE
was biased; compound/empty read output also means old rows cannot be relabelled. v19 adds shared
neutral EOF evidence format and allows baseline other-root sources only with observed complete
reads, while candidate cross-root prohibition remains. Four-arm/harness tests and independent patch
closure PASS at `fff3fec2c14a3175c74167618041ca667272b69769dc022fc4f473ff48c5632c`.
Fresh live Codex formal sessions: candidate `20045`, baseline `55644`, batchprefix `v19-formal-`,
each14×5/concurrency3. Read-only audit helper moved to
`/private/tmp/luca-agent-context-formal-audit.mjs` and now audits only v19; old443rows are excluded.
Do not poll old sessions or count old successes. Claude28 still deferred until quota restoration18:00.

Latest user-directed reduction: user rejected56 cells and delegated further subtraction. Amended
acceptance is now16 cells (F2/F3/F5/F9 × baseline/candidate × Claude/Codex, fixedtrial1). The larger
56/168/280 targets are superseded. Protocol reviewer PASS_WITH_CONCERNS: post-hoc reduction after
30PASS, n=1/no stability claim, ten omitted live variants disclosed; final outcome can only be
DONE_WITH_CONCERNS amendedP6 after remaining gates. Both all-fixture v19 queues20045/55644 are
interrupted with30PASS/0FAIL; no restart/replay. Four existing Codex F2/F3 trial1 rows are retained
as a manifest-defined subset; 26 others supplemental. Missing Codex cells now live:
candidateF5 `72486`, candidateF9 `78312`, baselineF5 `42220`, baselineF9 `11429`, same v19 batch IDs
and evaluator hash. Claude requires8 cells after quota restoration. Auditor at
`/private/tmp/luca-agent-context-formal-audit.mjs` now validates this16-cell subset.

Protected memory observation: retrieval-log now hashes
`bbfdea3971688338f05ef9a334de79e55f0f596732d56d4c57b8c5a27f6d9605`. A read-only prefix hash check
proved the entire original P0 file (hash4df15875…) is intact, with one386-byte appended line.
Do not revert or stage this append; preserve all current user/runtime memory work. No manual
retrieval-log edit was made. Root/evaluator hashes remain frozen. Final budget still follows live
amended A/B completion, then fresh verification, exact16-cell manifest and independent closure.

Final checkpoint for this reduction turn: all four remaining Codex sessions72486/78312/42220/11429
have finished, no A/B process remains live. Amended subset is now8/16 complete: candidateCodex4/4,
baselineCodex3/4; F5 baseline correctly foundcompare but returned a valid legacy alias instead of
canonical authority path, independently classified as normalization/new-contract compatibility,
not failed discovery or baseline unsafe behaviour. v19 totalobserved34rows=33PASS+1baseline miss;
selected8 and supplemental26 preserved. Exact16-cell manifest (eightClaudePENDING) is in the report.
The auditor's `--verify --codex-only` passes. Only eightClaude live cells remain, F2/F3/F5/F9 each
baseline/candidate, Opus/default, same frozenv19 runner. Do not rerun Codex or revive old70-row queues.
No automatic Claude retry is scheduled; last known quota reset is18:00 Asia/Shanghai. After quota
restoration, fill only missingClaude cells, then post-A/B11KiB budget+budget mutations, final fresh
checks, independent final review and gatedcommit/push. Retrieval-log including its new append is
preserved, indexempty, root/evaluator hashesunchanged. Task stillnotcomplete; no publication.

LATEST CHECKPOINT — 2026-09-05 14:24: user explicitly requested a selective Codex addition, so
accepted scope became16core A/B+4candidate-only probes(F4-stop/F7/F8/F12), total20. All four added
sessions23876/79108/94981/11809 are finished. F7/F8/F12 PASS; F4-stop critical behavioural FAIL,
run738e28f1-9b01-4a4c-8482-b14dc840a631. It answeredSTOP correctly but read no CONTEXT/catalog/
manifest; only memory-summary command is in trace, source=[AGENTS.md]. Independent review confirms
K4/K10 mandatory-read noncompliance and correct scoring. No code/evaluator/root change or retry
was made. All12Codex selected cells completed (candidate7/8, baseline3/4); Claude8missing. Totalv19
row pool38=36mechanicalPASS+baselineF5alias mismatch+candidateSTOPfailure. Auditor --verify now
correctlyfails and cannot hide candidatefailure by reducing scope.

P6 is GATE_FAILED. No live A/B processes, no scheduled retries, no commit/push. The next action
requires user direction for narrow mandatory-read diagnosis/remediation, not blindly finishing
Claude or applying the finalbudget patch. Any root/prompt/runner change must update identity and
explicitly revalidate affected scope; keep failedraw permanently. Original skill/scope constraints
still apply: NO_PIN, writing-for-agents/code-hygiene, no framework/docs/state/downstream changes,
preserve retrieval-log (P0prefix intact plus oneexisting386-byte append; currenthashbbfdea3971…).

USER RESUMPTION — 2026-09-05: latest “继续” authorizes narrow STOP mandatory-read diagnosis and
remediation, followed by affected-scope verification; it does not waive the failed gate. Roots and
v19 evaluator hashes still match the frozen checkpoint. Captured run738e28f1 was replayed locally:
claims/source pass, zero file reads, and exact missing targets CONTEXT/catalog/manifest; the
mandatory-read assertion exits1 as expected. Ranked hypotheses: (1) candidate prompt's final
“do not use any other command” contradicts its earlier cat/sed/head allowance; (2) STOP request was
misclassified as trivial; (3) trace lost genuine reads. Inspect the first before editing root prose.
Independent protocol reviewer is checking that seam; no live sampling, publication, root edit,
score relaxation, or memory edit has occurred. P6 remains failed pending a verified remediation.

V20 REPAIR FREEZE — 2026-09-05: independent protocol review PASS. Only the candidate non-isolated
command sentence was clarified; protocol label is20, scoring revision remains19. Added a red-then-
green command-conflict regression and retained a negative STOP memory-only trace regression.
All four arm/harness evaluator selftests PASS; check-agent-context and git diff --check PASS.
Evaluator SHA031d3aeea98c839dd1975081805d2c4834b42e36ba51f90b8b6966ec5f3fddfd;
roots/context/memory unchanged. /private/tmp/luca-v20-seam-audit.mjs independently proves exact
v19 reconstruction and unchanged baseline/F1/F9 prompt branches. Mixed-version20-cell manifest
explicitly retains only five v19 Codex cells (baselineF2/F3/F5/F9 + candidateF9), revalidates seven
candidateCodex nonisolated cells, then fills eight missing Claude cells under v20. This is not a
single frozen-protocol batch. Old STOP failure and all old raw rows remain unmodified.
F4-stop session93937 finishedPASS, run7193f3ef-e87b-4f36-9f90-cd5d8963443b: real observed EOF
CONTEXT58/58, catalog65/65, manifest248/248, no trace violations; independently confirmed. Then
F2/F3/F5 sessions9056/89054/9199 all finishedPASS. The last three candidateCodex cells are now
running: F7 session80846, F8 session63588, F12 session58839, all batch
v20-repair-candidate-codex-20260905, trial1. Stop new dispatch on failure. No Claude retry before
quota restoration; final budget and publication remain gated. Temporary formal auditor now
verifies this mixed-version selection and requires the original failure to remain present. Its
cross-batch attempt guard independently passed five negative tests: unexpectedbatch, extratrial,
unplannedfixture, duplicatecell, candidatefailure; baseline failure remains valid measurement.

Fresh v20 local verification: 19/19 semantic mutations plus real promotion writer/rollback and
staged-index/merge gate PASS; both-harness resolution canaries PASS; full verify session81979
finished91PASS/0FAIL/1existingADRwarning. Roots/evaluator/protectedmemory hashes still match.
Index remains empty. No manual memory edit, promotion, finalbudget patch, commit, or push.
A scoped Git-status command naming shared project aliases was rejected by the NO_PIN guard
before execution; no shared alias was read or changed and no alternative access was attempted.

LATEST USER AMENDMENT — 2026-09-05: user requests one LAST added batch covering remaining valuable
tests. Prior repair sessions80846/63588/58839 all finishedPASS; old20-cell Codex subset audit
passed12complete cells (candidate8/8, baseline3/4 knownaliasmiss). Seven fresh v20 candidate IDs
are recorded at report top, including STOP7193…, memorydfdad…, HumanGate38011…, harness867c….

Final accepted scope is26cells: previous20 plus candidateCodex F1/F4-direct/F4-multi/F6/F10/F11,
eachfixedtrial1, unchangedv20 runner/context/scoring/config and samebatch
v20-repair-candidate-codex-20260905. Independent protocol reviewer PASS: exactsix missingvariants,
all14candidateCodex coverage only, notall14dualHarness or statisticalstability. Two subbatches3,
gatebetween; failhalts withoutautomaticextra batches/retry. First subbatchF1/F4-direct/F4-multi
finishedPASS: F1 session64542/run67032b04-9718-49c2-967f-370a978e1326 (zeroI/O),
F4-direct session53869/run24733499-5329-4863-8cfc-d62a27ba2f81,
F4-multi session55847/run164e21c3-6924-4e67-9293-8ea008d348e2.
Second/finalsubbatch finished: F6 session41398 PASS/run e79611c1-3c33-4a84-b884-317d5e660a60;
F11 session96861 PASS/run ec021df5-636b-44e5-8bf2-300339b77b29;
F10 session15592 FAIL/run64993364-8698-42a1-8ccf-b047e50254ea.
Claude8stillmissing; noquota retry. No furtherCodexbatch is planned or authorized automatically.
Temporaryauditor expectedcandidate list now14, freshcandidateCodexv20 count13 plusoldF9. Its
completeness assertion correctlyfails8!=14 untilnewresults. Roots/evaluator remainunchanged,
memoryhashbbfdea3971… preserved, indexempty. No budgetpatch/commit/push.

FINAL STOP CHECKPOINT — 2026-09-05 15:02: LAST6 complete5PASS/1FAIL. All18Codex selected cells
completed, candidate13/14PASS, baseline3/4knownaliasmiss; Claude8pending of final26. No jobs live.
F10 failure is independently confirmed: correct framework safetyclaims, complete startup and
crm-profile EOF, followed by authority-directed `cat component-map.md` at checkoutroot → exit1
ENOENT. CONTEXT and crm-profile contain that bare filename and framework-activation branch;
the unresolved reference/further-read chain is a real pointer defect, not scoring or invented
source. Intended replacement path remains undetermined; do not access aliases/downstream or
weaken the trace guard to find one. Formal auditor correctly exits1 `candidate failure cannot be
hidden`. Runner frozen031d…, roots unchanged, no repair/rerun or finalbudgetpatch across failure.
All494raw rows retained, v20has13rows(12PASS/1FAIL); oldSTOPfailure stillpresent. Report top contains
exactlast6 IDs and evidence. Freshlocal91/0/1 and19semanticmutations remain valid local evidence,
not proof of behaviour completion. No stagedfiles/commit/push. Next action needs user direction
for narrow pointer remediation plus explicit affected-scope verification, not another extra batch.

<!-- FILE_END: 2026-09-04-agent-doc-lightweight-baseline.md -->
