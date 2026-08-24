# Round-7 Plan Agent Gate

## 1. Receipt and verdict

- Review mode: independent, byte-0-to-EOF, read-only review of the frozen candidate.
- Expected plan SHA-256: `e35a08f44a96b0342e9dc56a0c59c02bb852a8809950f6f99fc40093c8ab87fa`.
- Actual plan SHA-256 read for this review: `e35a08f44a96b0342e9dc56a0c59c02bb852a8809950f6f99fc40093c8ab87fa`.
- Actual plan length: `3748` lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Frozen downstream identity used by the plan and R6 receipt: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`.
- `PAYLOAD-CENSUS.md` SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- `TRANSCRIPT-AUTH-EVIDENCE.md` SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Prior R6 receipt SHA-256 read: `ba517a09c7a6b1c51a035195d7b1de0eb48425bfb349e010da74cf36d49298ca`.
- Authoritative contracts read in full: `.claude/agents/plan-agent.md` and `.claude/agents/orchestrator.md`.

**Verdict: `NOT_READY_FOR_REDTEAM`.**

Count: **2 BLOCKER / 5 MAJOR / 0 MINOR**.

The R6 repair clauses close their named surface defects, but the new approved-plan execution protocol still has two unreachable happy-path boundaries and five cross-section schema/transition gaps. These are mechanical contract failures, not editorial concerns.

## 2. Mechanical re-test of every R6 finding

| R6 finding | R7 result | Current-plan evidence |
|---|---|---|
| B1: two DeferredProjectRequest schemas / parser ambiguity | CLOSED | The sole v2 discriminated union, H/LP formulas, and project-origin variants are defined at lines 1328-1424; later project composition points back to that schema at lines 1815 and 1824-1828. The former v1 shape survives only as a rejected mutant at line 3526. |
| B2: B2 activator not owned/frozen by B1; HELPER_DISABLED inverse missing | CLOSED | B1 owns and freezes the exact activator plus inverse before B2 at lines 2617-2644 and 2884-2923; the dependency order is reflected in the DAG at lines 3187-3208. A separate activation-evidence timing defect remains as M5 below. |
| M1: delta controls could bypass ANSWER_OR_REVISION | CLOSED | Delta control language is classified through `ANSWER_OR_REVISION`, not `EXACT_APPROVAL`, at lines 2010-2022 and 2109, with matching assertions at lines 3321-3324. |
| M2: checkpoint Stop skipped ISSUED -> PRESENTED / TRANSFER_READY | CLOSED | Checkpoint display and Stop progression are explicit at lines 2359-2363 and mirrored by the assertion/mutant surface. |
| M3: public PlanExecutionRequest / PlanTransferRequest verbs lacked exact contracts | PARTIALLY CLOSED | The closed verb list and strict verb table now exist at lines 821-885. However, the table omits necessary successful-work and final-assertion transitions (B1), and `recover` still names an authority that has no issuance protocol (M4). |
| M4: parallel child writes and JOIN summary were not disjoint/unconditional | CLOSED | Canonical child-write ownership and distinct JOIN-summary handling are explicit at lines 686-705 and 914-923, with separate contract/capability identities. The child terminal transition is nevertheless unreachable because of B1. |

## 3. BLOCKER findings

### B1 — Successful approved-plan work and final assertion/summary staging have no legal transitions

**Contract evidence**

- The public request verbs are a closed set at lines 821-824.
- `issue-phase-tool` moves TASK/SKILL/PARALLEL/QUALITY work into `IN_FLIGHT` at line 850.
- In the exact successor table, `record-preflight` handles preflight only (line 849), `complete-summary` handles JOIN only (line 852), `record-quality` handles the quality gate only (line 853), and `record-failure` is the only normal work-result consumer (line 854). There is no successful ordinary-work/child-result verb at lines 845-861.
- Every call is required to move `ISSUED -> IN_FLIGHT -> CONSUMED` at lines 887-897, while every parallel child must become terminal `DONE` before JOIN at lines 914-923. No defined successful transition creates that `DONE` state.
- Phase completion requires output, assertion, and quality evidence at lines 936-941, but the omitted successful-work transition cannot mint the next quality/JOIN authority.
- After the last `complete-phase`, the table produces `FINAL_ASSERTIONS` (line 855). `finalize` instead requires `SUMMARY_STAGED` already (line 861). The enum contains both states at lines 812-815, but no public verb transitions `FINAL_ASSERTIONS -> SUMMARY_STAGED` or records final-assertion evidence. The prose at line 1184 says finalization stages the summary, which conflicts with the table's precondition that the summary is already staged.

**Mechanical counterexample**

1. A SINGLE plan issues one TASK call with `issue-phase-tool`.
2. The native work call succeeds and PostToolUse arrives with the correct call identity.
3. No legal request verb can consume that successful work call or attach output evidence; therefore the phase cannot reach its quality gate or `DONE`.

Even granting an unstated implicit success transition, the final phase reaches `FINAL_ASSERTIONS`; no verb can record the final assertion set and reach `SUMMARY_STAGED`, so the only defined `finalize` invocation rejects.

**Minimum mechanical repair**

1. Add a strict successful-work PostTool arm (for example `record-work`) or an explicitly named hook-internal discriminated transition. Specify exact payload, allowed prestate, call/capability identity, current native PreTool/PostTool evidence, canonical output evidence, idempotent replay behavior, and successors for ordinary work and parallel-child `DONE`.
2. That transition must mint only the legal next quality/JOIN authority and must be represented in project D snapshots, Stop handling, schemas, assertions, mutants, and crash faults.
3. Define final assertion recording and summary staging. Either add explicit event-bound verbs/capabilities for `FINAL_ASSERTIONS -> SUMMARY_STAGED`, or change `finalize` to accept `FINAL_ASSERTIONS` and atomically verify the final assertion evidence and stage the exact summary before terminalization. Do not retain the current contradictory prose/table pair.

### B2 — Mandatory checkpoint has neither a reachable capability-free boundary nor a checkpoint-capability issuer

**Contract evidence**

- `complete-phase` emits the next ready wave or `FINAL_ASSERTIONS` at line 855.
- A checkpoint is allowed only at a phase boundary with no live/issued child, project, or recovery capability and with a current `ISSUED` checkpoint capability (line 860). Lines 1068-1071 repeat the no-`ISSUED`/no-`IN_FLIGHT` condition and say checkpoint revokes all successor authority.
- The capability family at lines 870-876 says each capability is minted by its preceding committed transition, but no listed transition mints `checkpoint_capability`.
- The scheduler at lines 899-914 issues dependency-ready work; it defines neither a `BETWEEN_WAVES` pause nor an advance-wave choice verb.

**Mechanical counterexample**

At a mandatory >80% context checkpoint after phase 1, phase 2 is dependency-ready. If `complete-phase` publishes phase-2 authority, the checkpoint's no-issued-capability precondition is false. If it withholds phase-2 authority, there is no transition that mints the checkpoint capability or later advances the wave. Thus the required checkpoint is unreachable on both branches.

**Minimum mechanical repair**

Introduce an explicit capability-free `BETWEEN_WAVES` state. `complete-phase` should stop there and atomically mint mutually exclusive, event-bound `advance_wave_capability` and `checkpoint_capability` (or a single choice capability with a strict discriminant). Add an exact `advance-wave` transition. `checkpoint` must consume its choice before any successor work authority exists. If the plan instead elects to tombstone already-issued successors, define the exact bounded set it may revoke and make revocation atomic; do not use the current contradictory “no successor exists” and “revoke successors” clauses together. Synchronize the state union, request schemas/table, Stop/project snapshots, assertions, mutants, and fault suite.

## 4. MAJOR findings

### M1 — `PHASE_FAILURE_DECISION` is produced but absent from the closed wait grammar and successor table

**Evidence:** `record-failure` stages `PRESENTATION_PENDING(kind=PHASE_FAILURE_DECISION)` at line 854. Lines 954-961 require human choices `RETRY | REPAIR | SKIP | TERMINATE`; the exact grammars appear at lines 1062-1066. `answer-wait` promises a unique section-5.3 successor at line 856, but the closed `wait.kind` enum at lines 1247-1250 and exact wait table at lines 1305-1326 contain no phase-failure-decision arm. The route row at line 2107 only returns a generic plan-execution answer to the pending wait and does not define the four successors.

**Counterexample:** After a valid failure display, `重规划阶段 <wait_sha>：<text>` classifies as `ANSWER_OR_REVISION`, yet no wait-table row can consume it and mint delta authority. `RETRY`, `SKIP`, and `TERMINATE` are equally transitionless.

**Minimum repair:** Add a closed `PLAN_EXECUTION_FAILURE_DECISION` wait kind and one exact row per control grammar, including required/forbidden answer fields, retry bound, capability/tombstone effects, and unique successors: retry, repair -> `REPLAN_PENDING`, skip -> waived/next boundary, terminate -> terminal execution route. Mirror it in presentation/Stop/project snapshots and generated tests.

### M2 — The approved-plan scope-resume snapshot union is neither valid nor disjoint

**Evidence:** `APPROVED_PLAN_PHASE_IN_FLIGHT` requires tombstone kind `APPROVED_PLAN_CALL` at line 1396, but the closed tombstone enum at lines 1419-1421 contains only `APPROVED_PREFLIGHT | APPROVED_WORK | APPROVED_JOIN | APPROVED_QUALITY_GATE`. `APPROVED_PLAN_REPLAN` sends an in-flight `PLAN_DELTA_CALL` tombstone to `APPROVED_PLAN_WAVE` at line 1400, while the WAVE arm at line 1398 only represents phase/child preflight, work, JOIN, or quality calls; its H formula at lines 1426-1429 requires phase/child/call-kind fields that do not model a delta call. WAVE permits one to three records, so it also overlaps the single-call PHASE arm without a selection predicate.

**Counterexample:** A serial approved TASK call in flight cannot satisfy the PHASE tombstone enum. A delta Plan Agent call in flight cannot satisfy WAVE. Even if an implementation relaxes both schemas, a single work call matches PHASE and WAVE and yields two possible resume subphases/hashes.

**Minimum repair:** Make the union schema-disjoint. Prefer one typed approved-work record union using only the defined tombstone kinds plus a separate typed delta-call arm. Alternatively publish exact single-vs-wave selection predicates. Define every H/LP field and cross-harness golden vectors; reject records matching zero or more than one arm.

### M3 — Successful project-change projection omits three legal saved approved-plan subphases

**Evidence:** The saved-snapshot union includes `APPROVED_PLAN_REPLAN`, `APPROVED_PLAN_DELTA_WAIT`, and `APPROVED_PLAN_BOUNDARY_WAIT` at lines 1400-1402, and no-change restore handles them at lines 1449-1452. The overlay explicitly snapshots replan/delta work and project-revision boundary waits at lines 2313-2314. Yet the exhaustive `PROJECT_CHANGE_COMMITTED` projection table at lines 1522-1535 omits all three, while lines 1537-1540 require every saved subphase to have exactly one projection and declare a missing arm invalid.

**Counterexample:** While execution is `PLAN_EXECUTION_REPLAN_PENDING` with no delta call in flight, a valid project change reaches D then commits. The saved subphase is legal, but no committed projection can supersede its old authority and create the new-project obligation. The same dead end exists for delta and boundary waits.

**Minimum repair:** Add exact committed-projection rows for all three subphases, or replace the table with a schema-checked exhaustive discriminated rule. Each row must terminally tombstone old plan/delta/install/wait authority and create only a new project-bound `PENDING` or `CLASSIFY_ISSUED` obligation. Add generated exhaustiveness and no-double-projection tests.

### M4 — Plan-transfer `recover` depends on an authority that is never defined or issued

**Evidence:** The transfer request union at lines 1125-1141 states that `recover` uses a separate exact journal-recovery capability (lines 1134-1136). The journal lifecycle `PREPARED -> TARGET_PUBLISHED -> SOURCE_TOMBSTONED -> COMMITTED` at lines 1143-1165 promises crash recovery. The plan supplies no schema, H/LP formula, status/sequence, owner tuple, liveness decision, or committed transition that issues that recovery capability. Its only substantive appearances are the `recover` request reference and the public verb table.

**Counterexample:** The claim controller crashes after `TARGET_PUBLISHED`. Locks are released. A later controller can observe the journal, but it cannot construct a valid `authority_id`; direct `recover` therefore rejects, leaving the source in `CLAIM_COMMITTING` and the target nonterminal indefinitely.

**Minimum repair:** Specify a strict recovery-journal schema and controller owner/invocation tuple; domain-separated H/LP formula and monotonic sequence; exact `LIVE | PROVEN_DEAD | UNPROVABLE` issuance/reauthorization rules under the global-plan-transfer then lexical-session lock order; and one successor per journal state. Add replay, two-recoverer, and crash-at-each-barrier tests.

### M5 — Pre-activation candidate freeze requires the inode of a private helper that does not yet exist

**Evidence:** The private helper is created by the activator at cutover under an activation-specific path at lines 2733-2746 and activation step 2 at lines 2854-2860. The DAG freezes `CANDIDATE-OBJECTS` before post-review and activation at lines 3201-3209, explicitly including the Codex helper's source and derived-inode records. Maintenance activation occurs only afterward at lines 3210-3219.

**Counterexample:** The private path includes the future activation identity and is created during cutover, so its actual `realpath/dev/ino` cannot exist when the pre-review candidate is frozen. Recording a dry-run helper inode would not identify the cutover inode and would violate the activator's own creation/identity contract.

**Minimum repair:** Pre-review must freeze the helper source executable, expected bytes/mode, construction algorithm, and protocol only. The activation journal must freeze the actual private helper `realpath/dev/ino/mode/SHA-256` after no-follow creation/copy and read-back; post-activation reviewers then attest that actual record. The larger alternative is an explicit fenced pre-review creation phase with lifecycle and cleanup, but the plan must choose one order.

## 5. Gate conclusion

The candidate must not enter Round-3/Round-7 red-team execution yet. The two BLOCKERs prevent any ordinary successful approved plan from reaching completion or a mandatory checkpoint. The five MAJOR findings leave failure recovery, scope switching, project-change projection, transfer recovery, and activation evidence mechanically ambiguous or unreachable.

The next frozen candidate should mechanically demonstrate, with generated state/verb exhaustiveness and negative mutants, at least these traces:

1. successful TASK/SKILL/PARALLEL child -> quality/JOIN -> phase completion -> final assertions -> exact summary -> terminal finalize;
2. complete phase -> capability-free checkpoint choice -> transfer/resume or advance wave;
3. failure display -> each of retry/repair/skip/terminate;
4. D/S restore and committed-project projection for every approved-plan subphase;
5. crash after each plan-transfer journal barrier -> single authorized recovery;
6. pre-review helper source freeze -> cutover inode attestation -> post-activation verification.

Until those traces are unique and executable, the gate remains **`NOT_READY_FOR_REDTEAM`**.
