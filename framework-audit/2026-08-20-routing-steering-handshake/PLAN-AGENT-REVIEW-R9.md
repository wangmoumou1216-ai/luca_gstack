# Round-9 Plan Agent Gate

## Receipt

- Review mode: independent review of the frozen plan from byte 0 through EOF; this receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `ebc5dbfa2a7d14734aa4d4b8da2e375b8a9e84d14935e8a297a1dc55c85fa292`
- Actual plan SHA-256 read for this review: `ebc5dbfa2a7d14734aa4d4b8da2e375b8a9e84d14935e8a297a1dc55c85fa292`
- Actual plan length: 4309 lines
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Round-8 receipt SHA-256 read: `edb70f743fc5be71f863260b2aa2209ba4a69183cba25699f455d9bf5b5da14a`
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R8.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`. Current code/baseline and the plan's referenced prior red-team evidence were checked where needed for the challenged contracts.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 3
- MAJOR: 5
- MINOR: 0

The current candidate closes the R8 native FINAL-quality lifecycle and substantially improves checkpoint cancellation, transfer recovery, failure drain, and MAIN_AGENT execution. It is still not mechanically implementable as written: its exact ordered public-verb SSOT rejects its own transition table; an admitted parallel-skill parameter case has no legal exclusive, child-addressable wait; and phase-level SKIP can reissue work inside the phase it just waived. Five additional authority/state gaps remain in the authoritative Orchestrator gates and transfer/cancellation schemas.

## Mechanical re-test of every Round-8 finding

| Round-8 item | R9 result | Current-byte evidence |
|---|---|---|
| B1 `record-work` omitted from production | **Member added, but closure still fails mechanically** | `record-work` is in the 22-member manifest/loader surface (`FINAL-EXECUTION-PLAN.md:879-894`, `:2833-2841`), but the transition table is in a different order from the ordered SSOT. See B1. |
| B2 `advance-wave` omitted from production | **Member added, but closure still fails mechanically** | `advance-wave` is in the same 22-member surface and has a transition (`:929-930`, `:2833-2841`), but B1 makes the declared exact equality impossible. |
| B3 FINAL assertions lack native quality lifecycle | **Closed** | Registered FINAL quality now has explicit ISSUED -> IN_FLIGHT -> VERIFIED state, native PreTool/PostTool, immutable result evidence, and only then a finalizer (`:926-936`, `:973-999`, `:1095-1105`). |
| M1 MAIN_AGENT multi-tool/HITL not total | **Core execution closed; authoritative post-phase gate remains open** | The step DAG/cursor and TOOL -> HUMAN_WAIT -> TOOL chain are explicit (`:740-760`, `:1013-1037`, `:3771-3776`). The distinct mandatory completion confirmations in the current Orchestrator contract are absent. See M1. |
| M2 failure drain misses non-native completion authority | **Partially closed** | The typed successor union now includes PHASE_COMPLETION and MAIN_AGENT_COMPLETION (`:1784-1829`), but its phase-level SKIP rule reissues same-phase child authority after the phase is waived. See B3. |
| M3 checkpoint project change lacks a unique policy | **Core cancellation policy closed; delayed target cleanup remains underspecified** | Pre-claim project intent now cancels rather than snapshots (`:1274-1291`, `:2740`), including a target-side self-clear promise. The promised cancellation receipt and cross-session read/linearization are not in the strict state contract. See M5. |
| M4 transfer recovery journal/notice not total | **Partially closed** | Four state-evidence arms, liveness precedence, notice overlay and successor states now exist (`:1352-1435`), but nested hash preimages and the recovery request's acting-session identity are not uniquely specified. See M2-M3. |

## BLOCKER findings

### B1 - The exact ordered public-verb SSOT contradicts its own normative transition table

**Contract conflict**

- The plan fixes `PUBLIC_PLAN_EXECUTION_VERBS` as one exact ordered 22-member list and says a reordered member fails candidate construction (`FINAL-EXECUTION-PLAN.md:887-894`). In that order, `complete-phase|advance-wave` precedes `record-quality-gate|issue-final-quality|record-final-quality|record-failure` (`:889-890`).
- The table that must be generated from or byte-compared with that member instead orders `record-quality-gate|issue-final-quality|record-final-quality|record-failure` before `complete-phase|advance-wave` (`:913-936`, specifically `:925-930`).
- The production surface repeats the manifest order and claims exact equality with the documentation row (`:2833-2841`).

**Mechanical counterexample**

Candidate construction compares the exact ordered manifest to the transition-table discriminator order. A generator that obeys the manifest emits positions 11-12 as `complete-phase|advance-wave`; the normative table has those verbs at positions 17-18. Under the plan's own “extra, missing or reordered member fails” rule, the unchanged plan cannot construct a valid candidate.

**Minimum repair**

Reorder the transition-table rows to the canonical manifest order, or explicitly redefine the comparison as set equality everywhere. The smaller safe repair is to generate both row order and loader/test iteration from the one ordered manifest member. Add a table-order swap mutant, not only member deletion mutants.

### B2 - Admitted parallel-skill parameters have no exclusive, child-addressable wait state

**Contract conflict**

- Every `ParallelSkill` may carry a nonempty `user_parameter_schema_ids` list (`FINAL-EXECUTION-PLAN.md:682-689`).
- The exclusive-wave rule covers MAIN_AGENT HUMAN_WAIT and ordinary `SkillSpec` parameters, but not a `parallel_skill_execution` child parameter (`:751-760`).
- The parallel lifecycle nevertheless requires every child's preflight and human parameter receipt before issuing any child work and admits the whole 2-3-child phase as one wave (`:1042-1054`).
- An `APPROVED_PLAN_WAIT` requires zero sibling authority, yet its PHASE_QUESTION context contains `phase_id` and `question_schema_id` only, with no `child_id`, child queue/cursor, or collected-answer set (`:1703`, `:1717-1730`).
- The authoritative Orchestrator requires preflight and parameter collection for every parallel skill before fan-out (`.claude/agents/orchestrator.md:154-168`).

**Mechanical counterexample**

A schema-valid parallel phase has children A and B, each with a parameter schema. After preflights pass, A's question must be presented. If B or an outer sibling authority exists, the zero-sibling wait invariant rejects the state. If no sibling authority exists, the wait still cannot bind A rather than B, and there is no cursor that can prove both parameter receipts before issuing the atomic child bundle. Thus a valid Plan has no unique successor.

**Minimum repair**

Choose one mechanically closed policy:

1. Any parallel group with a nonempty child parameter list must occupy an exclusive SERIAL wave. Collect child parameters in deterministic `(child_id, schema_id)` order with strict `child_id`, cursor, collected-answer hashes and no child/sibling capability until all are terminal; or
2. Forbid nonempty parallel-child parameter lists and require an explicit prior HITL phase that produces the frozen parameter inputs.

Project the chosen policy through Plan validation, wait/snapshot/Stop/project-change/transfer schemas, L0 vectors, and sibling/child-swap mutants.

### B3 - Phase-level SKIP can reissue a child call inside the phase it has just waived

**Contract conflict**

- A parallel group issues all child capabilities as one approved phase (`FINAL-EXECUTION-PLAN.md:1042-1054`).
- Failure admission labels the failed call `FAILED_SCOPE` and every other revoked ISSUED authority `SIBLING`; the strict SIBLING arm retains the same `phase_id` and child ID (`:1784-1808`).
- SKIP is phase-level and creates `PHASE_WAIVED` (`:1121-1126`, `:1622-1625`).
- The drain rule then discards only the one FAILED_SCOPE record and may reissue every SIBLING record (`:1823-1829`). The assertion and mutant deliberately require SIBLING preservation without distinguishing same-phase remainder from another phase (`:3791-3797`, `:4023-4029`).

**Mechanical counterexample**

Parallel phase P issues child A and child B. A fails before B starts, so B's revoked call is serialized as `origin=SIBLING, phase_id=P`. The user chooses `跳过阶段`. The same atomic result marks P `PHASE_WAIVED` and reissues B's call. A terminal waived phase now owns live work authority, so both the DAG terminality and final-evidence root are contradictory; executing B is unauthorized under the phase result.

**Minimum repair**

Distinguish same-failed-phase remainder from other-phase successors in the strict union. A phase-level SKIP must tombstone every call/preflight/summary/quality/completion record whose `phase_id` equals the failed phase and may reissue only other-phase records. RETRY may restore exact failed-phase records; REPAIR/TERMINATE tombstone all. Update the H/LP identity, three-arm successor oracle, assertions, and replace the overbroad “discard any SIBLING is red” mutant with origin-plus-phase-sensitive mutants.

## MAJOR findings

### M1 - Mandatory Orchestrator phase-completion confirmations are absent from approved-plan execution

**Contract conflict**

- The current authoritative Orchestrator requires a completed MAIN_AGENT skill to display `已完成，继续下一 Phase？` and await the user (`.claude/agents/orchestrator.md:84-89`). It separately requires a human confirmation after each Supervisor/Hierarchical phase (`:134-136`).
- The Plan admits MAIN_AGENT skill phases and Supervisor/Hierarchical orchestration (`FINAL-EXECUTION-PLAN.md:656-691`, `:768-772`), but `requires_user_confirmation` has no transition semantics beyond the schema field (`:656-662`).
- After phase quality, `complete-phase` directly reaches current-wave RUNNING, BETWEEN_WAVES, or FINAL_ASSERTIONS; `advance-wave` is capability-only and no post-phase human confirmation appears (`:925-936`, `:1095-1105`).
- The closed wait enum/table has no phase-completion or Supervisor confirmation kind (`:1536-1552`, `:1604-1630`).

**Mechanical counterexample**

A Supervisor plan finishes phase 1 with PASS. `complete-phase` mints a wave-choice capability and `advance-wave` starts phase 2 without the required human confirmation. The same bypass occurs after a MAIN_AGENT skill phase. A conforming runtime cannot obey both the plan state machine and the authoritative Orchestrator contract.

**Minimum repair**

Add a strict post-phase presentation/wait for every contract-required MAIN_AGENT-skill and Supervisor/Hierarchical confirmation, bound to phase output and quality roots, before wave advance. Project it through exclusive-wave validation, Stop, snapshots, project composition, transfer, assertions, mutants and live tests. If the intended change is to remove those authoritative gates, state that governance change explicitly and make it part of the human-approved scope rather than silently omitting it.

### M2 - TransferJournal nested owner/capability hashes are not exact preimages

**Contract conflict**

- TransferJournal declares `controller_owner` as `{invocation_id,pid,process_start,boot_id,nonce,started_state,status:IN_PROGRESS}` (`FINAL-EXECUTION-PLAN.md:1352-1359`), but `started_state` has no type, closed value set, or nonrecursive derivation anywhere in the plan.
- `state_sha256` depends on `owner_sha256_or_empty` and `recovery_capability_sha256_or_empty`, described only as “the H/LP hashes of the complete strict objects” (`:1383-1391`). Neither hash has a domain string, scalar order, empty-arm formula, or golden literal preimage.
- The surrounding contract says JSON order is never authoritative and cross-harness golden arms must agree (`:1387-1392`), so implementations cannot fall back to canonical JSON.

**Mechanical counterexample**

One implementation frames owner fields in displayed order under `plan-transfer-owner:v1`; another frames lexicographic keys without a domain. Both satisfy “H/LP hash of the complete strict object” but derive different journal state hashes and recovery capabilities. Treating `started_state` as the current journal hash introduces recursion; treating it as an enum or prior barrier produces different bytes.

**Minimum repair**

Define strict `TransferControllerOwner` and `TransferRecoveryCapability` oneOf objects with all value types/enums and required/forbidden fields. Give each an explicit domain-separated H/LP formula, displayed scalar order and null/empty formula; define `started_state` as a nonrecursive literal barrier or an explicit pre-owner basis hash. Add golden vectors for fresh/live/dead owner and null/ISSUED/CONSUMED capability arms.

### M3 - `recover` is authorized from either session but its exact request only names the target session/event

**Contract conflict**

- Both `claim` and `recover` share a root containing only `target_session_id,target_event,target_boundary` (`FINAL-EXECUTION-PLAN.md:1331-1345`).
- Recovery precedence explicitly runs on the next security hook for either source or target sid (`:1394-1415`).
- The recovery capability binds `source_sid,target_sid,current_event,current_boundary`, but carries no acting-session field; its current event is the event that observed the dead owner (`:1401-1409`).

**Mechanical counterexample**

The source session observes PROVEN_DEAD and mints a recovery capability. If `recover.target_session_id/event/boundary` means the real target, the request does not bind the source's current event. If it means the actor, it contradicts the field name and the target identity used by `claim`. Two conforming controllers can therefore accept different roots or reject one of the promised source/target recovery paths.

**Minimum repair**

Use a strict per-verb root oneOf. `claim` may retain target fields; `recover` must bind `actor_session_id,actor_event,actor_boundary`, require actor to equal exactly source or target, and match the capability/current attested event. Add source-initiated and target-initiated golden/live vectors plus wrong-actor, swapped-event and cross-session replay mutants.

### M4 - The authoritative preflight override has no execution-state representation

**Contract conflict**

- The authoritative Orchestrator says a failed skill preflight waits for the user to fix it or explicitly say `跳过检查`, after which execution continues (`.claude/agents/orchestrator.md:68-79`).
- In the plan, `record-preflight` failure enters the generic typed failure path (`FINAL-EXECUTION-PLAN.md:916-928`, `:1115-1126`).
- The only SKIP grammar is `跳过阶段`; it marks the entire phase `PHASE_WAIVED` rather than overriding preflight and continuing to parameters/work (`:1622-1625`). No `PREFLIGHT_OVERRIDE` wait/decision appears in the closed wait kinds (`:1536-1552`).

**Mechanical counterexample**

A registered skill preflight returns FAIL for a condition the human is authorized to override. The user follows the authoritative contract and says `跳过检查`. The approved-plan grammar cannot classify it, while `跳过阶段` suppresses the whole phase instead of starting its work. There is no conforming continuation.

**Minimum repair**

Add a strict `PREFLIGHT_OVERRIDE` decision bound to the exact preflight finding, phase/child, immutable contract policy and fresh attested event; success advances that same phase to its parameter/work state without fabricating PASS. Alternatively, explicitly remove the override from the authoritative contract through the human-approved governance change. Do not overload `PHASE_WAIVED`.

### M5 - Target self-clear after source checkpoint cancellation is promised but absent from the strict state/linearization contract

**Contract conflict**

- The new policy says the target's next security hook reads the exact source CANCELLED/core bytes, tombstones/removes only the matching `deferred_plan_claim`, records `SOURCE_CHECKPOINT_CANCELLED`, and returns to ordinary routing in one target rename (`FINAL-EXECUTION-PLAN.md:1274-1286`, `:2720-2729`).
- The strict session-document surface has `deferred_plan_claim?` but no cancellation receipt field (`:2208-2237`). The only ledger-event shape shown is accepted/rejected native event provenance; `SOURCE_CHECKPOINT_CANCELLED` has no strict arm, fields, cap, hash or retention rule (`:2170-2189`).
- The closed lock order defines full transfer as `plan-transfer-global -> source/target session locks in lexical sid order`, but the self-clear clause does not say whether it uses that order, a no-lock atomic source read, or another cross-session protocol (`:2312-2323`).
- The assertion and mutant require the outcome but still supply no schema/preimage (`:3816-3820`, `:4035-4036`).

**Mechanical counterexample**

A target holds a matching deferred claim after the source cancels. One implementation adds a new top-level receipt field, which the strict state validator rejects; another appends a generic ledger string with no source-core preimage; a third clears without a receipt. All can claim to implement the prose, but they produce different state bytes and recovery evidence. Concurrent source activity also has no specified read/lock/CAS oracle, so implementations disagree whether a valid terminal CANCELLED record remains readable.

**Minimum repair**

Define one strict bounded receipt arm and storage location. Bind at least the checkpoint ID, source/target sid, source checkpoint core, source CANCELLED status/reason/event/boundary, exact target claim hash, target current event/boundary and a domain-separated receipt ID. Specify whether the target obtains the transfer-global plus lexical two-session locks or uses a bounded no-follow atomic source read with a precise stable-terminal/retention invariant. The same target rename must compare the exact claim hash, persist the receipt, clear only that claim, and mint no authority. Add wrong-source/core/claim, source-race, missing/compacted source, replay and second-clear fixtures.

## Gate conclusion

The frozen bytes actually reviewed at SHA-256 `ebc5dbfa2a7d14734aa4d4b8da2e375b8a9e84d14935e8a297a1dc55c85fa292` are **NOT_READY_FOR_REDTEAM** with **3 BLOCKER / 5 MAJOR / 0 MINOR** findings. The next candidate should not advance until the ordered verb surface, parallel-parameter waits, SKIP semantics, authoritative human gates, transfer hashes/actor binding, and target-cancellation receipt are all mechanically closed across schema, transition tables, snapshots, route/Stop/project composition, assertions, mutants, fault barriers, exact envelope and activation tests. No plan, runtime, or other audit file was modified by this review.
