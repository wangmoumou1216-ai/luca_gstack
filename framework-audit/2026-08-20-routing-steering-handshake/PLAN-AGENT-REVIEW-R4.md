# Round-4 Plan Agent gate

## Review identity

- Verdict: **NOT_READY_FOR_REDTEAM**
- BLOCKER: **2**
- MAJOR: **6**
- MINOR: **1**
- Reviewed plan: `FINAL-EXECUTION-PLAN.md`
- Expected and actual plan SHA-256: `30e8f3a507170a02198d9f33f07156377e1de37866aa40a8e6c5d331df52dbb6`
- Plan length: 2,897 lines
- Framework HEAD / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Downstream baseline reviewed from the frozen plan/evidence contract: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`
- Payload census SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Plan Agent SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`
- Orchestrator SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`
- Round-3 routing / transaction report SHAs: `018e80b6fc7e61dafa59b9cdaba07dfbe9112c3423a50bcdb703f147dc42ff63` / `8ec4bf0865cc6c4103714268fcadf0b2df50f6e2b85b041c2bf1f88fd3475445`

The premise is valid: alias truth, a non-scoring semantic obligation, lazy native-event attestation and generation-fenced mutation are all needed. A keyword-only or route-only patch is not an equivalent smaller solution. The candidate nevertheless cannot advance because the new approved-plan and activation contracts have non-implementable or non-total branches.

## Mechanical recheck of the Round-3 findings

| Round-3 finding | Current status | Fresh evidence in this SHA |
|---|---|---|
| Routing B1: approval directly satisfies | **Not mechanically closed** | Approval now enters `PLAN_EXECUTION_PENDING` (`:656-714`), so the original direct transition is removed; however BLOCKER B1 below proves the only authorized execution path cannot represent valid authoritative plans. |
| Routing M1: project continuation/display | Closed for the originally reported path | Independent project presentation is at `:780-795`; committed-boundary preprojection and same-event substantive continuation are at `:413-425`, `:1721-1728`; L0 covers the displays at `:2786-2789`. |
| Routing M2: final handoff repeats Project Gate | Closed | The exact combined handoff is required at `:58-62`, `:2476-2489`, `:2841-2846`. |
| Routing M3: Plan conditions/result are equivalent | **Not closed** | The lower-bound vector is now present (`:460-481`), but BLOCKER B1 identifies authoritative phase, preflight and assertion structures that the schema/executor cannot encode. |
| Routing M4: aggregate/pre-existing execution evidence | Closed | Baselines and strict per-step evidence are at `:729-745`, with corresponding mutants at `:2694-2701`. |
| Routing minors: census count / structural negation | Closed | Five literal census inputs are listed at `:2392-2407`; structural negation is defined at `:313-318`. |
| Transaction B1: no real JSON carrier | Closed | Canonical base64url argv plus SHA/EOF checks are at `:430-439`, `:1037-1041`, and L0 at `:2782-2784`. |
| Transaction B2: cached pre-C1 consumer | **Partially closed, not executable as written** | Launch inhibition/census is specified at `:2114-2136`, but BLOCKER B2 and MAJOR M4 leave activation without one legal TCB/order. |
| Transaction M1: ordinary PostTool/CAS | Closed | Single-flight CAS and mandatory state-mutating PostTool attestation are at `:721-727`. |
| Transaction M2: ninth unrepresented delivery | Closed | It now enters terminal rotation at `:1075-1080`. |
| Transaction M3: recovery ledger exhaustion | Closed | Terminal-prefix checkpoint compaction is at `:1570-1581`. |
| Transaction M4: NO_PIN epoch | Closed | Required monotonic epoch and the 7→8→9 vector are at `:1278`, `:1304-1310`. |
| Transaction M5: project-only D presentation | Closed for first presentation | Strict independent presentation is at `:780-795`; repeated-presentation ambiguity remains MINOR m1. |
| Transaction M6: five census files | Closed | Exact paths and README exclusion are at `:2392-2407`. |

## BLOCKER

### B1 — The approved-plan schema/executor is not a total refinement of the authoritative Plan Agent and Orchestrator

Evidence:

- The proposed `Phase` enum permits only `task_execution|skill_execution` and has no `skill`, `execution_context` or `parallel_skills` fields (`FINAL-EXECUTION-PLAN.md:588-594`).
- The authoritative Plan Agent defines a third `parallel_skill_execution` form and requires its `parallel_skills`, execution contexts, aggregate output and join gate (`.claude/agents/plan-agent.md:260-318`).
- The authoritative Orchestrator has a distinct parallel-skill lifecycle with per-skill preflight, parameter collection, concurrent dispatch, join summary and one quality gate (`.claude/agents/orchestrator.md:154-174`). The proposed executor instead permits only one in-flight call per phase and represents parallelism only across distinct phase IDs (`FINAL-EXECUTION-PLAN.md:688-696`). No lossless normalization from one authoritative parallel phase to several execution phases is specified.
- Every authoritative `skill_execution` phase must run preflight (`orchestrator.md:68-89`). The plan's agent registry includes PREFLIGHT (`FINAL-EXECUTION-PLAN.md:661-663`), but `Owner.role` excludes PREFLIGHT (`:595`) while every dispatched agent must match an Owner (`:693-694`). A mandatory preflight call therefore has no legal owner/capability.
- Assertions are global objects with no `phase_id` or phase-set binding (`:599-600`), while phase completion requires all assertions belonging to that phase (`:700-702`). The executor cannot distinguish an assertion for phase 1 from one whose output is created only by phase 4. Likewise, `CONDITIONAL_PASS` is allowed “where the Plan permits” (`:701-703`) but the schema has no closed field expressing that permission.

Counterexamples:

1. A valid Plan Agent result contains one `parallel_skill_execution` phase with deepresearch and ux-research. The proposed JSON schema rejects it. If it is coerced to one allowed phase, the one-in-flight rule cannot launch both; if it is silently split, phase IDs, outputs, summary gate and approved bytes no longer match the immutable plan.
2. A valid `skill_execution` phase requires preflight. PREFLIGHT is registered but cannot match an Owner, so either the required check is skipped or an unapproved owner is invented.
3. A two-phase plan has assertion A2 over a file produced by phase 2. With no assertion→phase/final mapping, requiring A2 in phase 1 deadlocks; omitting it permits premature completion.

Minimum revision:

- Make the executable schema a lossless, parity-tested normalization of all three authoritative phase forms. Encode `skill`, `execution_context`, `parallel_skills`, the join/summary gate and a deterministic internal-child-ID mapping if a parallel authoring phase expands internally.
- Add a legal mandatory PREFLIGHT role/receipt or define it as a controller-owned prerequisite that cannot be skipped.
- Bind every assertion to exactly one phase or the final assertion set, and add a closed `conditional_pass_allowed` policy.
- Add positive native fixtures for interactive main-agent skill, noninteractive skill, parallel-skill join and task phase, plus deletion mutants for each mandatory subphase. Until these exist, approval still has no total observed-execution path.

### B2 — Activation requires authority-mutating Codex/Git consumers that the closed bootstrap TCB forbids

Evidence:

- The strict trust step requires Codex-native `hooks/list`, `config/batchWrite` and a second `hooks/list` read-back (`FINAL-EXECUTION-PLAN.md:2004-2009`). The current proven mechanism necessarily spawns `codex app-server` (`scripts/codex-trust-hooks.mjs:24,33-40,56-59,80-96`).
- The plan says baseline Python/Git subprocesses may affect only display/memory/diagnostics (`FINAL-EXECUTION-PLAN.md:2051-2057`) and then declares that, apart from the literal JS/bootstrap files and `/bin/ps`, `/usr/sbin/sysctl`, `/usr/bin/lsof`, **any** external executable affecting project/session/route/generation authority is forbidden (`:2065-2070`, `:2072-2086`). The Codex app-server binary is not an exception or a manifest member.
- The activator must also fast-forward B2→C1 and perform exact index/ref/path rollback (`:1994-2002`, `:2179-2204`). No direct Git object/index/ref implementation is specified, while an authority-mutating Git subprocess is expressly outside the allowed dependency claim above.

Counterexample:

- If `runtime-trust-hooks.mjs` spawns the Codex binary, activation violates the claimed closed TCB and `T-ACTIVATE`. If it does not, it cannot obtain Codex-computed `currentHash`, execute `config/batchWrite`, or perform the required native read-back. The same fork exists for repository fast-forward/rollback: spawning Git violates the contract; not spawning it leaves no specified mutation primitive. Thus no implementation can satisfy both the activation algorithm and its TCB assertion.

Minimum revision:

- Choose one executable architecture. Either add exact frozen Codex app-server (and, if used, Git) binaries as activation-only TCB members with absolute realpath/dev/ino/SHA, fixed argv/env, bounded strict RPC/exit grammar, journaled pre/post state and inverse fault tests; or specify and test a direct no-subprocess trust/repository implementation with equivalent CAS semantics.
- Align §10.2, KILL-10, the host-inhibition ordering, exact scope, L0 and `T-ACTIVATE` with that choice. A JS wrapper alone is not a closed TCB when its authority comes from an unlisted child executable.

## MAJOR

### M1 — The mandatory Orchestrator context checkpoint has no cross-session authority transfer

Evidence:

- The authoritative Orchestrator requires a checkpoint and a new session once context passes its hard threshold (`.claude/agents/orchestrator.md:63-65`, `:340-357`). The Plan Agent's persisted-plan path is also explicitly intended for cross-session recovery (`.claude/agents/plan-agent.md:688-702`).
- The proposed `plan_execution_id`, every capability and all state are bound to one session ID (`FINAL-EXECUTION-PLAN.md:668-686`); schema-v3 treats a new sid as a hard new authority boundary (`:2206-2211`). There is no plan checkpoint/transfer object, target-sid handshake, predecessor hash or transfer controller verb.

Counterexample: a Deep approved plan reaches the mandatory >80% checkpoint after phase 3. The old session must stop; the new session has a different sid and cannot resume the bound execution. Continuing old authority violates the session binding, while obeying it strands a live obligation permanently.

Minimum revision: define a one-shot, human-attested cross-session plan checkpoint/claim protocol that binds immutable plan/result/completed evidence/project identity and revokes the source, or explicitly revise the authoritative Orchestrator to use same-sid compaction only and remove its new-session requirement. Add crash/replay/two-claim tests.

### M2 — Delta replan and blocking-failure choices are named but have no state machine

Evidence:

- The authoritative Plan Agent requires append-only delta replanning with preserved unaffected IDs/status (`plan-agent.md:477-489`); the Orchestrator invokes it after repeated BLOCKING failure or plan-changing repair (`orchestrator.md:98-108`, `:238-249`).
- The candidate merely says failure enters a human wait or delta-replan (`FINAL-EXECUTION-PLAN.md:700-705`, `:1525-1527`). `plan_execution` has no REPLAN state/predecessor/delta fields (`:668-678`), and the only controller verbs are `begin|issue-phase-tool|complete-phase|answer-wait|finalize` (`:683-686`).

Counterexample: phase 2 fails a BLOCKING assertion twice after phase 1 passed. There is no authorized transition that freezes phase 1, revokes phase 2, invokes Plan Agent for a delta, binds a new result/approval when required, and resumes without rewriting the immutable approved plan.

Minimum revision: add a strict delta-replan lifecycle, H/LP identities, completed-phase evidence carry rules, affected-phase set, approval rule and controller verbs; reconcile `repair|skip|terminate` with the authoritative failure policy instead of leaving it to prose.

### M3 — Approved-plan admission has no safe project-context boundary for NO_PIN or SAME/unproven clean B/C

Evidence:

- Exact approval unconditionally creates `PLAN_EXECUTION_PENDING`, and `project_identity` may be NO_PIN (`FINAL-EXECUTION-PLAN.md:664-686`). `begin` then changes pending to active and computes a wave (`:688-700`).
- Project-scoped phase issuance requires effective project context (`:1714`), but the approved-plan state set has no boundary/project-gate wait analogous to SINGLE/MULTI's `EXECUTION_WAITING_BOUNDARY` (`:502-507`, `:707-714`).
- The wait composition says only DIFFERENT_DRAINED approval yields A+PLAN_EXECUTION_PENDING while SAME/unproven remains terminal (`:1639-1644`), yet the route table still consumes exact approval into PLAN_EXECUTION_PENDING (`:1524`) and Stop blocks that state (`:1747-1753`).

Counterexamples:

1. A PLAN_READY result under NO_PIN contains a project-scoped first phase. Approval creates pending execution, no phase capability may issue, no Project Gate presentation is defined, and Stop is blocked.
2. A verified approval wait on clean B receives exact approval but terminal ancestry is DIFFERENT_UNPROVEN. Project state stays B, approval is consumed, the project-scoped phase cannot run, and no verified boundary wait can end the turn to obtain DIFFERENT_DRAINED.

Minimum revision: validate phase scope before consuming approval. NO_PIN project-scoped plans must remain in a verified Project Gate/needs-context state. Clean B/C SAME/unproven must keep approval unconsumed or enter a new exact `PLAN_EXECUTION_WAITING_BOUNDARY` presentation whose proven next boundary alone begins execution. Cross this with first-wave mixed no-project/project phases.

### M4 — Activation has two contradictory trust/repository orders

Evidence:

- §10.1 orders repository fast-forward B2→C1, then trust apply/read-back, then pointer (`FINAL-EXECUTION-PLAN.md:1991-2002`).
- §10.3 orders trust CAS while still on B2, then launch inhibition, then B2→C1, then pointer (`:2128-2133`, `:2167-2186`).

Counterexample: crash after trust CAS but before repository fast-forward is a required state under §10.3 but cannot occur under §10.1; crash after fast-forward but before first trust mutation is required under §10.1 but excluded by §10.3. The inverse journal and rollback oracle therefore cannot have one exact state table.

Minimum revision: choose one linear order and give every barrier one canonical `{trust, modes, repo/index/ref, pointer, fence}` tuple plus inverse. Make §10.1, §10.3, DAG step 8 and activation tests identical.

### M5 — The controller-time NEW race is undefined for a project-only SWITCH_ONLY capability

Evidence:

- A pure project directive can create `S(T,NEW)` from NO_PIN or another stable phase without a route obligation (`FINAL-EXECUTION-PLAN.md:1595-1601`); `route_obligation` is optional in schema-v3 (`:1280-1285`).
- If T becomes existing after issuance, §9.2 requires consuming S while preserving “the exact ... scope-resume snapshot plus task” and staging route `PRESENTATION_PENDING→PROJECT_SWITCH_REQUIRED` (`:1808-1817`). A project-only S has no task, obligation or scope-resume snapshot in which that route status can exist.

Counterexample: fresh NO_PIN user sends `创建 foo 项目`; census is ABSENT and S is issued. Another process creates canonical foo before the controller runs. The recensus reaches the race arm, but the required route wait cannot be represented without fabricating an obligation/task; retaining S leaves an impossible NEW capability.

Minimum revision: split the race transition by `route_obligation absent|present`. The project-only arm must consume S into the exact no-change stable project state and stage a strict independent presentation/notice with fresh SWITCH guidance and Stop rules, without inventing task bytes. Generate N/A/C/B/S fixtures for both arms.

### M6 — TARGET_EXISTS deliberately drops a new signal-bearing task, so the durable-obligation requirement is false

Evidence:

- `NEW_TASK_SIGNAL_WITH_PROJECT` is the sole admitted combined task/project form and otherwise creates a durable obligation (`FINAL-EXECUTION-PLAN.md:374-401`).
- Before that placement, the TARGET_EXISTS guard says an existing target under NEW does **not** accept the task clause or create an obligation and requires a fresh explicit SWITCH event (`:1401-1414`). With no prior obligation, the route action is diagnostic-only (`:1416-1419`), and the next event clears/consumes the notice (`:1438-1439`).
- This contradicts the stated outcome that an interface-structure task cannot be silently abandoned (`:28-32`).

Counterexample: with canonical muse already present and no live task, the user sends `创建 muse 项目，我要你优化设置里的交互结构，功能堆砌。`. The task's exact bytes are discarded. The user follows the displayed `切换到 muse 项目`; that event contains no task and creates no route obligation, reproducing the original “project handled, task vanished” failure.

Minimum revision: preserve the exact new task bytes as non-authorizing pending evidence and present a copyable combined SWITCH+verbatim-task retry, or require the user to resubmit that exact combined event before any supersession. A bare SWITCH must not silently consume the only recoverable task text. Add ABSENT/live-old/no-old variants.

## MINOR

### m1 — Re-presenting an already verified D has no unique project-presentation challenge transition

Evidence:

- `project_presentation` has one creating event/challenge and one verifying Stop (`FINAL-EXECUTION-PLAN.md:780-791`). Matrix preserve cells preserve that object (`:1607-1609`).
- A repeated SAME/unproven retry must create a fresh exact re-presentation (`:1691-1701`), and a live route presentation is required to share the same project-presentation challenge so one Stop verifies both (`:792-794`).

Counterexample: E1 creates D and verifies its presentation. E2 is a SAME-parent bare continue. Preserving the E1 VERIFIED object cannot give E2 a creating-event-bound challenge; replacing it contradicts the preserve rule. The text does not state whether E2 Stop verifies only a new route challenge or resets both records.

Minimum revision: specify one exact re-presentation arm—either mint a fresh UNVERIFIED project challenge while preserving only D/request/snapshot, or keep the original proof immutable and mint a route-only challenge that references it without claiming to verify both again.

## Gate conclusion

The alias, semantic hint, native anti-replay, ordinary execution CAS, queue rotation, recovery checkpoint, monotonic epoch and initial project-presentation repairs are materially improved. They do not compensate for an approved-plan executor that rejects valid authoritative plans or an activation procedure with no legal closed-TCB implementation.

**Gate: NOT_READY_FOR_REDTEAM.** Revise the plan, assign a new cycle-specific review path because this R4 receipt is now immutable failed-cycle evidence, then rerun the Plan Agent gate from the new exact SHA before commissioning either Round-4 red team.

Only this review file was created. No plan, runtime, governance, test, project state or workflow-state file was modified.
