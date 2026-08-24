# Round-10 Plan Agent Gate

## Receipt

- Review mode: independent, read-only review of the frozen plan from byte 0 through EOF; this receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `169d56be06774655e36f90bdd0294fd03f2d6e75eeba1a6cbfd77a6cec431714`
- Actual plan SHA-256 read for this review: `169d56be06774655e36f90bdd0294fd03f2d6e75eeba1a6cbfd77a6cec431714`
- Actual plan length: 4543 lines
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Round-9 receipt SHA-256 read: `758f2aff148a93df9702bdd451af70b4ce37171ec3934121bffdae0d6fc89bd0`
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R9.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: the plan's Claude `prompt_id`-as-hint and Codex adjacent-pair lazy-attestation premises match `PAYLOAD-CENSUS.md:27-70` and `TRANSCRIPT-AUTH-EVIDENCE.md:18-67`; this review found no evidence drift.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 2
- MAJOR: 1
- MINOR: 0

The current revision mechanically closes most Round-9 findings. It still cannot execute every schema-valid parameterized skill because prior human parameter bytes disappear, and its claimed-total TARGET_EXISTS product is both incomplete and non-deterministic. The source-cancelled checkpoint cleanup also still lacks one authoritative retained-record storage and crash-linearization contract.

## Mechanical re-test of every Round-9 finding

| Round-9 item | Round-10 result | Current-byte evidence |
|---|---|---|
| B1 ordered public-verb SSOT contradicts table | **Closed** | One canonical ordered 22-member array now generates the schema/table/loader/controller (`FINAL-EXECUTION-PLAN.md:951-960`); the table follows that order (`:979-1002`), and the production envelope plus adjacent-swap check use the same member (`:3019-3027`). |
| B2 parallel-child parameter wait not exclusive/addressable | **Exclusivity/addressing closed; executable value retention still fails** | Exclusive outer-wave validation, lexicographic child-addressed queue, and all-preflight barrier exist (`:770-790`, `:1112-1123`). The queue stores only answer hashes, however, so a multi-question valid Plan cannot later inject the required parameter values. See B1. |
| B3 phase SKIP revives same-phase work | **Closed** | The successor union classifies `FAILED_SCOPE|SAME_PHASE|OTHER_PHASE` and SKIP tombstones the first two while reissuing only `OTHER_PHASE` (`:1951-2007`), with matching route/test/mutant projections (`:2713`, `:3995-4000`, `:4243-4249`). |
| M1 mandatory Orchestrator phase confirmation absent | **Closed** | Confirmation policy and post-wave queue are explicit (`:807-830`); phase completion cannot bypass the queue (`:1182-1197`), and the exact control/snapshot arms exist (`:1776`, `:1881-1883`). |
| M2 TransferJournal owner/capability preimages ambiguous | **Closed** | Strict journal, owner and recovery-capability objects plus nonrecursive H/LP formulas and null arms are defined at `:1481-1543`. |
| M3 recover actor identity ambiguous | **Closed** | Claim/recover have disjoint roots; recover binds the exact source-or-target actor event/boundary (`:1457-1474`), and the capability binds the same actor (`:1520-1528`). |
| M4 preflight override absent | **Closed** | Policy split, drain, retry and override behavior are explicit (`:1166-1180`), with distinct controls and a recoverable wait arm (`:1777-1778`, `:1884-1889`). |
| M5 target deferred-claim cleanup lacks receipt/linearization | **Receipt and target CAS added; authoritative source-retention topology remains open** | The receipt schema/hash/CAS exists (`:1439-1452`) and state names its terminal slot (`:2407-2409`), but the source CANCELLED record it must read has no uniquely defined surviving store once ordinary routing replaces the sole live obligation. See M1. |

## BLOCKER findings

### B1 - Parameter queues retain only irreversible hashes, so valid multi-question skill phases cannot build their Work Agent inputs

**Contract conflict**

- The strict parameter queue records each prior response as exactly `{child_id_or_empty,question_schema_id,answer_sha256}`; neither raw/canonical-base64 answer bytes nor an answer event locator is present (`FINAL-EXECUTION-PLAN.md:775-786`).
- The restored `APPROVED_PLAN_WAIT` promises a complete recoverable preimage, “never a hash without its preimage,” but its PHASE_QUESTION arm repeats only `collected_answers` in that hash-only shape (`:1860`, `:1874-1897`).
- Accepted ledger entries retain event/native identities and outcome, not prompt/answer bytes (`:2350-2355`). The consumed pending candidate is therefore not a durable answer-value store.
- The plan's own test/mutant language checks child/question/cursor/**answer hashes**, not recoverable answer bytes (`:3960-3963`, `:4223-4226`).
- This contradicts the authoritative Orchestrator requirement to write the user's selected values as explicit parameters into each cold-start Work Agent prompt (`.claude/agents/orchestrator.md:73-83`; parallel execution invokes the same collection before fan-out at `:154-163`).

**Mechanical counterexample**

A schema-valid parallel group has child A question `market` and child B question `depth`. The user answers A with arbitrary UTF-8 text, the controller advances the queue and presents B, then the process restarts (or a project wait snapshots/restores the PHASE_QUESTION arm). After B is answered, state contains SHA-256(A) and SHA-256(B), but not A's bytes or a native-record locator. SHA-256(A) cannot be inverted, so the controller cannot construct A's explicit WA parameter while still satisfying the strict state schema. Reading arbitrary transcript history would invent an undeclared authority/recovery path. The admitted Plan has no executable successor.

**Minimum repair**

Define one strict bounded `CollectedParameterAnswer` object containing at least `child_id_or_empty`, `question_schema_id`, canonical `answer_base64`, decoded UTF-8 length, `answer_sha256`, `answer_event` and `answer_boundary`; make the queue, wait snapshot, collected-answer root, child input/call capability and WA prompt bind those exact objects. State whether the answer policy stores a closed option ID in addition to, never instead of, the exact bytes. Add two-question crash, project snapshot/restore and checkpoint/replay vectors, plus a hash-only-answer mutant that must fail schema construction.

### B2 - The TARGET_EXISTS product is neither total nor single-valued

**Contract conflict**

- `PLAN_EXECUTION_FAILURE_DRAIN` is a first-class route status (`FINAL-EXECUTION-PLAN.md:407-421`) whose ordinary event row rejects every prompt/project action as BUSY (`:2710-2712`). It has no row in the mandatory TARGET_EXISTS status table (`:2575-2595`) and no arm in the status/product overlay (`:2918-2930`).
- The plan nevertheless requires TARGET_EXISTS to be crossed with **every** route status/subphase and rejects a missing cell/default (`:2597-2601`, `:4113-4117`).
- The same TARGET_EXISTS table assigns `PLAN_EXECUTION_TRANSFER_READY` to two adjacent rows: one must cancel the pre-claim checkpoint and create a fresh classify obligation, while the other must preserve immutable transfer state and do diagnostic-only handling (`:2589-2590`). These successors are mutually exclusive for the same exact status/event.

**Mechanical counterexamples**

1. A TARGET_EXISTS census/result is evaluated while the route status is `PLAN_EXECUTION_FAILURE_DRAIN`. The asserted generated cross-product has no row. Falling back to the ordinary BUSY rule violates the no-default/exact-product requirement; rejecting the candidate at build time means the mandatory matrix cannot be generated.
2. In `PLAN_EXECUTION_TRANSFER_READY`, a project TARGET_EXISTS event matches both rows. One implementation cancels the checkpoint and routes; another preserves it as a diagnostic. Both can cite a normative row, so the successor is not unique.

**Minimum repair**

Add an explicit `PLAN_EXECUTION_FAILURE_DRAIN -> REJECTED_BUSY`, byte-preserving TARGET_EXISTS row to both the dedicated table and status/product overlay. Keep `PLAN_EXECUTION_TRANSFER_READY` only in the pre-claim cancellation row and make the terminal row exactly `PLAN_EXECUTION_TRANSFERRED`. Generate row keys from the closed route-status enum and fail construction on either missing or duplicate coverage; add deletion and duplicate-key mutants plus live BUSY/cancel/terminal vectors.

## MAJOR finding

### M1 - Source checkpoint cancellation has no single authoritative retained-record store or crash-linearization point

**Contract conflict**

- The checkpoint has a strict ISSUED/PRESENTED/CLAIM_COMMITTING/CLAIMED/CANCELLED oneOf and the complete CANCELLED arm must remain immutable for the source v3 session lifetime (`FINAL-EXECUTION-PLAN.md:1351-1369`).
- Pre-claim project intent must atomically store that CANCELLED arm, tombstone the old execution, and immediately run ordinary routing into a fresh CLASSIFY obligation; a target later stable-reads the retained source record (`:1371-1390`, `:2589`).
- The strict session document has one live `route_obligation?` and no `plan_checkpoint`, cancelled-checkpoint archive or route-history field (`:2386-2416`). Replacing the live route object therefore has no declared location for the full record required by cleanup.
- A separate `.claude/.plan-transfers/<checkpoint_id>.json` is called the transfer truth (`:1593-1615`), but the only strict `TransferJournal` oneOf has states PREPARED/TARGET_PUBLISHED/SOURCE_TOMBSTONED/COMMITTED (`:1481-1510`), not the pre-claim ISSUED/PRESENTED/CANCELLED checkpoint arms.
- Cleanup deliberately takes only the target session lock and performs an immutable-source read (`:2497-2501`). The plan does not identify whether that read targets the source session document or the transfer file. If the latter, cancellation plus fresh source routing spans two files without a specified order, recovery owner or crash barrier; if the former, the retained object disappears from the declared strict state when the route is replaced.

**Mechanical counterexample**

The target has persisted a matching `deferred_plan_claim`. The source receives a project directive, changes its sole route obligation to fresh `PENDING/CLASSIFY_ISSUED`, and crashes. Under the declared session schema there is no full CANCELLED checkpoint to read. If an implementation instead wrote it to `.plan-transfers`, a crash can leave the external record PRESENTED and the source route already fresh (or CANCELLED externally while the source still shows transfer-ready), because no pre-claim two-document transaction/recovery state selects the winner. Target cleanup then either blocks forever or clears against a state not authorized by the written contract.

**Minimum repair**

Choose one store and make it normative. The smaller one-rename design is a bounded top-level source-state `cancelled_plan_checkpoints` archive: atomically move the complete checkpoint there while replacing the live route, retain it under an explicit cap/offline-rotation rule, and make target cleanup's no-follow read name that exact source-state field and hash. Alternatively, define `.plan-transfers/<checkpoint_id>.json` as a complete checkpoint-or-journal oneOf and add an ordered, recoverable pre-claim cancellation transaction covering both file and source-state publication. In either design add crash-before/after every publication barrier, simultaneous claim/cancel, later source routing, state-cap/rotation and target cleanup fixtures; no prose-only “retained” invariant is sufficient.

## Gate conclusion

The frozen bytes actually reviewed at SHA-256 `169d56be06774655e36f90bdd0294fd03f2d6e75eeba1a6cbfd77a6cec431714` are **NOT_READY_FOR_REDTEAM** with **2 BLOCKER / 1 MAJOR / 0 MINOR** findings. Round-10 red-team dispatch and the user handshake must remain closed. No plan, runtime, or other audit file was modified by this review.
