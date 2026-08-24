# Round-8 Plan Agent Gate

## Receipt

- Review mode: independent, read-only review of the frozen plan; this receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `5684cbc6b705809e348a459f7eb19588b9ea72a62c903b4b4801cb878caea0e9`
- Actual plan SHA-256 read for this review: `5684cbc6b705809e348a459f7eb19588b9ea72a62c903b4b4801cb878caea0e9`
- Actual plan length: 3966 lines
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Round-7 receipt SHA-256 read: `89f10a7b6bbadea17b9ec4edb0b8069c86353600d3e9e393745672fa48d3d82e`
- Authoritative contracts read through EOF: `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`
- Supporting evidence read through EOF: `PAYLOAD-CENSUS.md`, `TRANSCRIPT-AUTH-EVIDENCE.md`, both Round-3 red-team reports, and `PLAN-AGENT-REVIEW-R7.md`

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 3
- MAJOR: 4
- MINOR: 0

The R8 plan materially improves the Round-7 state model, but two newly required public verbs are still rejected by the plan's own exact production allowlist; final assertions still lack an executable native quality-gate lifecycle; and four cross-section lifecycle/recovery contracts remain non-total. These are implementation blockers or safety-significant ambiguities, not editorial issues.

## Mechanical re-test of Round-7 findings

| Round-7 finding | R8 result | Current evidence |
|---|---|---|
| B1 — successful work / final assertions | **Not closed** | `record-work` and a finalization path now exist (§5.3:835-838, 865, 877), but §9.1's exact production public-entry allowlist omits `record-work` (§9.1:2540-2552). FINAL `CRITERION` assertions also have no native quality-gate call lifecycle (§5.3:683-685, 870, 877, 912-931). See B1 and B3. |
| B2 — mandatory checkpoint / wave advance | **Not closed** | `BETWEEN_WAVES` and `advance-wave` are specified (§5.3:870-876, 989-997), but the exact production allowlist omits `advance-wave` (§9.1:2540-2552). See B2. |
| M1 — failure-decision wait | **Partially closed** | The failure wait and decisions are present, but failure drain does not revoke or serialize the separately issued non-native `PHASE_COMPLETION` authority (§5.3:887-892, 1007-1010, 1491-1493, 1523-1559). See M2. |
| M2 — snapshot overlap / tombstones | **Closed** | The BEGIN/FRONTIER/DELTA/BETWEEN/FINAL arms are materially separated and carry typed tombstones plus H/LP commitments (§5.5:1470-1609). |
| M3 — committed project projection | **Not closed** | `APPROVED_PLAN_CHECKPOINT_DISPLAY` is a legal pre-claim resume snapshot (§5.5:1499, 1586) but is absent from the exhaustive successful-commit projection (§5.5:1657-1684). See M3. |
| M4 — transfer recovery authority | **Partially closed** | Recovery capability, liveness and a sequence are added, but the journal is not a strict discriminated oneOf and the recovery notice has no total route/Stop overlay (§5.3:1192-1231; §6.2:2241-2264; §6.5:2484-2530). See M4. |
| M5 — helper inode identity | **Closed** | Pre-review freezes source/construction while activation journals the actual installed inode and post-review verifies it (§9.3:2881-2889; §10:3371-3378, 3387-3388). |

## BLOCKER findings

### B1 — `record-work` is required by the lifecycle but denied by the exact production entry allowlist

**Contract conflict**

- §5.3 declares `record-work` as a public plan-execution verb and gives it an exact transition row (`FINAL-EXECUTION-PLAN.md:835-838`, `:865`).
- The mandatory success path requires that verb to turn a successful native work call into recorded output/evidence and `QUALITY_GATE_PENDING` (`:963-969`).
- §9.1 says its public-entry table is exact and every other direct invocation is denied (`:2540-2541`).
- The `plan-execution` row in that table omits `record-work` (`:2552`).
- The assertion/L0 envelope nevertheless requires this path (`:3479-3481`, `:3829-3832`).

**Mechanical counterexample**

An approved TASK phase receives a valid native PostTool success. The controller has exactly one specified verb that can bind the result and mint the next quality authority: `record-work`. Production loading must reject it because it is absent from the exact allowlist. The phase remains `IN_FLIGHT` and cannot legally reach its quality gate.

**Minimum repair**

Add `record-work` to the same single-source closed discriminator set used by the public loader, strict schema, controller dispatch and tests. Generate or assert equality between that set and every §5.3 public verb table. Add a positive carrier/parity vector and a deletion mutant proving that omission is denied at build time, not discovered in a live phase.

### B2 — `advance-wave` is required by both local and transferred execution but denied by the exact production entry allowlist

**Contract conflict**

- §5.3 declares and defines `advance-wave` (`FINAL-EXECUTION-PLAN.md:835-838`, `:870-876`).
- It is the only specified transition from a verified `BETWEEN_WAVES` checkpoint into the next wave (`:989-997`).
- A transferred target is likewise required to resume through this transition (`:1255-1256`).
- §9.1's exact `plan-execution` public-entry list omits it while denying all unspecified invocations (`:2540-2552`).

**Mechanical counterexample**

All phases in wave 1 complete and the checkpoint choice is validly presented/answered. `advance-wave` is then rejected at the production boundary, so no wave-2 phase capability can be minted. The same dead end occurs after a valid cross-session transfer.

**Minimum repair**

Add `advance-wave` to the shared closed public-verb schema/loader/controller set and its exact payload/prestate/authority rows. Add source and target positive vectors plus an omitted-verb mutant. Enforce mechanical equality between the declared §5.3 verbs and the production public surface.

### B3 — FINAL assertions have no native quality-gate execution lifecycle

**Contract conflict**

- The approved plan may contain both `SHELL` and semantic `CRITERION` final assertions (`FINAL-EXECUTION-PLAN.md:683-685`).
- Completing the last phase mints an execution finalizer, not a final quality-gate call (`:870`, `:989-997`).
- `finalize-execution` assigns the Node controller the task of running/validating every FINAL assertion (`:877`, `:912-919`).
- The only specified quality call is phase-scoped and requires a `phase_id`; no FINAL assertion call kind, owner, PreTool/PostTool pair, capability or result state exists (`:864`, `:868`, `:921-931`).
- The authoritative orchestrator contract delegates phase and final assertions to the quality-gate agent (`.claude/agents/orchestrator.md:57-60`, `:98-100`, `:138-139`).
- The activation TCB allows only the enumerated NODE/CODEX/GIT/PS/SYSCTL/LSOF external roles; undeclared controller-side agent/shell execution is not an authorized escape hatch (`FINAL-EXECUTION-PLAN.md:2874-2879`).

**Mechanical counterexample**

A schema-valid approved plan ends with the criterion “all requirements are covered.” After the last phase, only a finalizer is available. A Node controller cannot semantically adjudicate that criterion. If it launches a quality-gate agent or shell internally, it bypasses the native call/capability and declared TCB; if it accepts a caller-supplied evidence root, the caller can forge completion.

**Minimum repair**

Introduce a strict final-quality lifecycle such as `FINAL_QUALITY_GATE_PENDING -> FINAL_QUALITY_GATE_IN_FLIGHT -> FINAL_QUALITY_GATE_VERIFIED`, with the registered quality-gate owner/agent, an execution contract, event-bound capability, native PreTool/PostTool pairing and an immutable final-assertion evidence root. Mint the execution finalizer only after verification. `finalize-execution` should stage/verify the stored summary and evidence, never run arbitrary assertions internally. Project this lifecycle through snapshots, project-change composition, Stop, recovery, assertions, mutants and fault tests.

## MAJOR findings

### M1 — `MAIN_AGENT` phases are admitted, but multi-tool and interactive main-agent execution is not total

**Contract conflict**

- The schema permits TASK and SKILL specs owned by `MAIN_AGENT` (`FINAL-EXECUTION-PLAN.md:662-665`).
- The authoritative orchestrator explicitly allows direct main-agent execution (`.claude/agents/orchestrator.md:84-96`), while the Plan Agent contract requires interactive skills to remain plan-governed (`.claude/agents/plan-agent.md:267-271`).
- The R8 execution lifecycle models one issued work call followed by `record-work`, which immediately advances the phase to quality (`FINAL-EXECUTION-PLAN.md:864-865`, `:930-931`, `:963-969`).
- The statement that direct main-agent tools use per-tool CAS (`:976-977`) has no repeated-step schema, action discriminator, step cursor, human-wait state or explicit `complete-main-work` transition.
- The positive assertions explicitly require an interactive `MAIN_AGENT` phase (`:3470`).

**Mechanical counterexample**

A `design-brief` main-agent phase must read context, present a human decision gate, receive the answer, then write the artifact. The first direct tool either consumes the sole work authority or is outside the declared call pairing. Calling `record-work` exits work immediately; withholding it leaves no specified authority/cursor for subsequent tools or the human boundary.

**Minimum repair**

Specify a strict main-agent step DAG/cursor with one capability per direct tool, explicit human wait/resume, immutable accumulated outputs and a distinct `complete-main-work` transition before quality. Alternatively, narrow `MAIN_AGENT` to a mechanically enforceable single native call and introduce a separately specified HITL executor that remains compatible with the authoritative contracts. Add a live test requiring at least two tool calls plus a human wait before quality.

### M2 — Failure drain does not atomically suspend/revoke non-native `PHASE_COMPLETION` authority

**Contract conflict**

- A FRONTIER may contain an issued `PHASE_COMPLETION` authority (`FINAL-EXECUTION-PLAN.md:1491-1493`, `:1523-1535`).
- `phase_completion_capability` is a separate non-native action object (`:887-892`).
- `record-failure` revokes only unissued same-wave calls (`:869`, `:1007-1010`).
- Failure-drain records forbid a live PHASE_COMPLETION arm and retain only an opaque `suspended_successor_root`; no strict preimage, required/forbidden record fields, H/LP formula or restoration rule is defined (`:1547-1559`).

**Mechanical counterexample**

Phase A reaches `PHASE_COMPLETION_READY` with its completion capability issued; sibling B then fails. The failure wait is staged, but A's non-native capability is neither a revoked native call nor a typed drain record. It can be replayed during the wait. If an implementation silently revokes it instead, RETRY/SKIP has no deterministic serialized bytes from which to restore the exact successor.

**Minimum repair**

Make failure admission atomically revoke every native and non-native same-wave authority. Persist a strict bounded `suspended_successor_records` oneOf, including PHASE_COMPLETION records, with H/LP commitments and explicit status. RETRY/SKIP may reissue only from those exact records; REPAIR/TERMINATE must tombstone them. Add interleaving, replay and field-deletion mutants.

### M3 — `APPROVED_PLAN_CHECKPOINT_DISPLAY` is admitted before claim but has no successful project-change projection

**Contract conflict**

- `APPROVED_PLAN_CHECKPOINT_DISPLAY` is a legal scope-resume snapshot arm (`FINAL-EXECUTION-PLAN.md:1499`) and has an exact restore row (`:1586`).
- The supposedly exhaustive `PROJECT_CHANGE_COMMITTED` projection omits that arm (`:1657-1679`) and declares missing arms invalid (`:1681-1684`).
- The checkpoint presentation route cell is project-only (`:2256`), but it does not define cancellation/forbid before presentation; the overlay only forbids D/S after `PRESENTED` (`:2462`).
- The snapshot row itself says project D is forbidden even though the arm is defined only as a D resume snapshot, leaving contradictory implementation choices.

**Mechanical counterexample**

A checkpoint choice is `ISSUED` but not yet presented. On a marker-proven `DIFFERENT_DRAINED` parent, the user selects another project. Composition may lawfully stage D with this snapshot, but after transaction commit there is no projection that can create a new project-bound obligation. An implementation that forbids D instead contradicts the declared snapshot/restore arm.

**Minimum repair**

Choose one exact policy. The smaller policy is: before checkpoint claim, any project intent atomically cancels/tombstones the checkpoint choice/display, then performs the project operation and creates an ordinary rebound/replan obligation; remove this D snapshot arm. If D/S is intended instead, add its complete committed projection and claim-cancellation semantics. Update the route×project product table and positive/negative tests accordingly.

### M4 — Transfer recovery lacks a strict journal oneOf/state hash and a total notice/Stop overlay

**Contract conflict**

- `recover-transfer` accepts `journal_sha256` and binds authority to `journal_state_sha256` (`FINAL-EXECUTION-PLAN.md:1192-1194`, `:1217-1224`).
- The purported strict journal lists only common fields, then refers to unspecified “barrier-specific evidence”; it does not define required/forbidden fields for each barrier or the H/LP formula for `state_sha256` (`:1201-1208`).
- `UNPROVABLE` creates a `transfer_recovery_notice` and promises one Stop after proof (`:1210-1215`, `:1230-1231`).
- No transfer-recovery notice kind appears in the wait enum/table (`:1338-1342`), route-event table (`:2241-2264`) or Stop contract (`:2484-2530`).

**Mechanical counterexample**

The process crashes after `TARGET_PUBLISHED` and owner liveness is unprovable. Two conforming implementations can encode different barrier evidence, derive different journal state hashes and therefore disagree on the recovery capability. The resulting notice has no unique route/Stop cell, so one implementation can emit Stop while the journal remains nonterminal and another can deadlock waiting for an undefined display state.

**Minimum repair**

Define `TransferJournal` as an exact discriminated oneOf for `PREPARED`, `TARGET_PUBLISHED`, `SOURCE_TOMBSTONED` and `COMMITTED`, with literal keys, required/forbidden fields, bounded evidence, H/LP state/evidence formulas, owner/capability statuses and a total transition table. Add a pre-route transfer-recovery overlay for both source and target sessions with strict presentation/Stop state and current-event rules. Add cross-harness golden vectors plus crash, two-recoverer, wrong-barrier and missing-notice mutants.

## Gate conclusion

The frozen bytes at SHA-256 `5684cbc6b705809e348a459f7eb19588b9ea72a62c903b4b4801cb878caea0e9` are **NOT_READY_FOR_REDTEAM**. The next candidate should not advance until B1-B3 and M1-M4 are repaired across the normative schema, transition tables, production entry surface, activation envelope, assertions, mutants and fault tests. No runtime or plan file was modified by this review.
