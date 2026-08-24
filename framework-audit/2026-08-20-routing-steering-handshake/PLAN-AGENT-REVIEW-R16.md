# Round-16 Plan Agent Gate

## Receipt

- Review mode: fresh independent Plan-Agent gate. The current plan was read from byte 0 through EOF; no verdict from Round 15 or any invalidated Round-16 snapshot was inherited.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `b291db5b45a6110b62ead18f550d82966d4ff8c7c8c3847f27981a698758942b`
- Actual plan SHA-256 read for this review: `b291db5b45a6110b62ead18f550d82966d4ff8c7c8c3847f27981a698758942b`
- Actual plan length: 5,375 lines.
- Expected framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Actual framework `HEAD` / upstream at final verification: `c9d4185f18e14871f6f285e19baff205798be201` / `c9d4185f18e14871f6f285e19baff205798be201`.
- The two commits after `8e9726d…` change only three files under `framework-audit/2026-08-20-recovery-handoff-review/`; their committed non-audit tree is byte-identical to `8e9726d…`. Separate pre-existing worktree dirt remains user-owned. This does not satisfy the plan's ref-identity KILL condition, as B1 explains.
- Actual downstream `HEAD` / upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`.
- Round-15 receipt SHA-256 read: `1f86ba9859e75a0d88f99561398765133c2e51248329a79c9c432b5344f9bf4d`.
- Frozen payload evidence SHA-256 read: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256 read: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256 read: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256 read: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R15.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: no evidence drift was found. Claude authority remains a current durable human-origin group bound from `prompt_id`; Codex authority remains the adjacent durable two-record delivery pair, not raw `turn_id` or prompt text.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 2
- MAJOR: 0
- MINOR: 0

Round-15's fixed-capacity omission is mechanically closed by the dedicated accumulator and restricted drain. The frozen candidate still cannot pass this gate: its required framework ref baseline has moved, and its transfer overlay has no disjoint event-bearing versus no-new-event transition contract. The latter makes the exact recovery controller, projection Stop, stale-capability rotation, and recovery-owner death paths contradictory or unreachable.

## Mechanical re-test of Round-15 B1

| Round-15 item | Round-16 result | Current-byte evidence |
|---|---|---|
| Transfer precedence had no valid successor at ordinary event count 256 | **Closed, independent of B2 below** | Every schema-v3 session now owns one constant-size `transfer_security_ledger`; every transfer event replaces its last event and advances a previous-object-bound chain (`FINAL-EXECUTION-PLAN.md:1895-1954`). `ledger_admission=AVAILABLE|FULL` is derived before transfer mutation; FULL preserves 256 ordinary entries and installs only `TRANSFER_SECURITY_LANE_ONLY`, while a fresh COMMITTED target alone reaches the ordinary event-257 oracle (`:1956-1969`). The restricted marker/scan stores no caller authority, drains one durable group per hook, denies that invocation, and has explicit source/target cleanup (`:2735-2788`). Schema and precedence repeat the same split (`:3007-3023`, `:3389-3409`), and generated capacity, burst, retry, mutant, and crash requirements cover counts 255/256 (`:4866-4892`, `:4972-4980`, `:5183-5194`). Thus no transfer event requires a 257th ordinary slot. |

## BLOCKER findings

### B1 — the framework ref baseline violates the plan's own KILL-02 precondition

**Contract conflict**

- The plan says any framework `HEAD` or upstream different from `8e9726d…` requires a delta and re-review; the only exception is the exact post-gate lineage `A0→B1→B2→V1→C1` (`FINAL-EXECUTION-PLAN.md:64-72`).
- The DAG creates `A0` only after this R16 gate, two red-team passes, and exact-SHA user approval, and requires its parent to be exactly `8e9726d…` (`:4522-4526`).
- At final verification the actual repository `HEAD` and upstream are both `c9d4185f…`, two audit-only commits after `8e9726d…` and outside this plan's not-yet-created named lineage. A byte-identical non-audit tree does not satisfy a contract stated in commit-ref identity.

**Mechanical counterexample**

Construct the planned `A0` from current `HEAD`. Its parent is `c9d4185f…`, not the required `8e9726d…`. Construct it instead from `8e9726d…` and the intervening audit commits are no longer its ancestors unless the plan defines exactly how they are incorporated. Either result violates the frozen DAG/ref contract; treating the commits as harmless silently weakens KILL-02 from ref identity to path-filtered content identity.

**Minimum repair**

Freeze the actual framework baseline as an explicit tuple: at minimum name current `HEAD/upstream=c9d4185f…`, the prior framework ancestor `8e9726d…`, the exact audit-only delta/tree, and the intended `A0` parent/ancestry. Synchronize KILL-02, preflight receipt, §13 DAG, expected review inputs, and rollback ancestry. Any such edit changes the plan SHA and requires a fresh Plan Gate; no runtime-tree-only exception may be inferred during execution.

### B2 — transfer recovery lacks a total event-bearing/no-new-event product, so capabilities can deadlock or overtake a later event

**Contract conflict**

1. The accumulator forbids replay of `last_event`, and controller state changes must not append a second record for the same human event (`FINAL-EXECUTION-PLAN.md:1947-1954`, `:1989-1994`). Yet the recovery paragraph says that on the next security hook every branch first publishes exactly one actor-session `TransferSecurityEvent` (`:1996-2003`). The global precedence row is conditioned on a matching journal, not on whether a new event was attested, and likewise does not define a no-event branch (`:3389-3409`).
2. An exact recover controller necessarily runs after the event that minted its capability and binds that same event/boundary (`:1801-1824`, `:2003-2019`). A notice or terminal Stop similarly verifies the projection of the already-recorded event and is allowed to change only the projection scalar (`:1991-1994`, `:3639-3657`). These invocations have no new durable human event to append.
3. The restricted FULL path makes the contradiction unavoidable: a nonempty scan drains one event and denies the attempted controller/Stop; the invocation that drains the final group cannot consume/verify what it just minted, while the next retry **must** succeed without another `UserPromptSubmit` (`:2750-2769`, `:3644-3651`). The assertions and mutant require the same result (`:4883-4887`, `:4977-4980`). The plan supplies no discriminator selecting “append one event” versus “consume/verify with no event append.”
4. Fresh-event capability rotation is also not closed. `RECOVERY_CAPABILITY_BUSY` requires the exact already-ISSUED capability and `owner_census=NOT_APPLICABLE`; `RECOVERY_OWNER_BUSY` similarly requires an IN_PROGRESS owner and `NOT_APPLICABLE` (`:1971-1980`). But every request is current-event-bound (`:1142-1144`), and recover specifically requires the fresh current event/boundary that minted its capability (`:1821-1824`). If an E1-bound ISSUED capability exists when E2 is attested, the BUSY event advances authority to E2 without invalidating or rebinding the E1 capability. Allowing E1 lets old authority overtake E2; rejecting it leaves no transition that can ever consume or replace the capability.
5. The owner arm has the same totality failure. Owner death must start a higher `recovery_sequence`, and a crash must repeat liveness/sequence recovery (`:1879-1882`, `:1996-2018`). If `RECOVERY_OWNER_BUSY/NOT_APPLICABLE` has priority whenever an IN_PROGRESS owner exists, a dead recovery owner is permanently BUSY. If liveness census has priority, LIVE/UNPROVABLE/PROVEN_DEAD select other outcomes and `RECOVERY_OWNER_BUSY` is unreachable. No current matrix crosses invocation kind, new-event relation, capability state, recovery-owner state, and liveness to decide this.

**Mechanical counterexamples**

1. Start with a nonterminal journal, no scan, and a proven-dead controller. Fresh E1 is attested; its first PreTool records `PROVEN_DEAD_RECOVERY_ISSUED` and creates an E1-bound capability. The exact `plan-transfer recover` PreTool then has no pending candidate. Appending E1 again violates replay/one-event rules; consuming without append violates “each branch first publishes.” Therefore the only controller that can advance the journal has no conforming transition.
2. Repeat at ordinary count 256 with a one-item scan. The final drain records E1 and issues or preserves recovery authority, then denies the attempted controller. The mandated next retry has no new `UserPromptSubmit`; it hits the same contradiction, so Round-15 capacity liveness is not executable even though storage capacity itself is fixed.
3. Begin with an ISSUED E1 capability and attest fresh E2 before controller consumption. The declared BUSY outcome preserves the E1 capability while current event becomes E2. Accepting the E1 recover request violates current-event ordering and lets an older controller overtake E2; denying it strands the journal because every later event can select the same BUSY arm without reissuing current authority.
4. Begin with an IN_PROGRESS RECOVERY owner that has crashed. On fresh E2, selecting `RECOVERY_OWNER_BUSY/NOT_APPLICABLE` never proves death; applying the mandatory liveness oracle instead contradicts that selected arm. The promised higher-sequence recovery is not mechanically selectable.

**Minimum repair**

1. Add one strict, generated input discriminator and total table before the journal outcome table, for example:
   - `NEWLY_ATTESTED_EVENT` and `SCAN_DRAIN_EVENT`: require one new durable group/event/boundary and append exactly one `TransferSecurityEvent`;
   - `NO_NEW_EVENT_RECOVER_CONTROLLER`: require an absent scan plus the exact latest ISSUED capability/current actor binding; forbid cursor/current-event/transfer-chain append and atomically consume the capability/publish the recovery owner;
   - `NO_NEW_EVENT_STOP_PROJECTION`: require an absent scan plus the exact UNVERIFIED notice/terminal event; forbid an event append and change only the declared projection scalar;
   - `NO_NEW_EVENT_COMMITTED_TARGET_CLEANUP`: define the existing idempotent no-marker cleanup explicitly, with no event append;
   - every other no-new-event hook is byte-preserving denial.
2. Fix precedence mechanically: nonempty scan drains exactly one event and denies the current invocation; when the scan is absent, a newly attested event uses the event table, an exact persisted controller uses only the controller arm, and an exact projection Stop uses only the projection arm. One invocation may never match two arms.
3. On fresh E2 with an E1-bound ISSUED capability, invalidate E1 and issue a new E2-bound capability under a monotonic issue/recovery sequence in the same journal+session rename. The event outcome must bind the replacement capability SHA. Do not retain `RECOVERY_CAPABILITY_BUSY` as an event outcome that preserves stale authority.
4. For an IN_PROGRESS recovery owner, make fresh-event liveness explicit and disjoint: LIVE has one busy result, UNPROVABLE one notice result, and PROVEN_DEAD one higher-sequence E2-bound capability. Same-invocation idempotent controller resume belongs to the no-new-event controller arm, not to `TransferSecurityEvent`. Remove or redefine the `NOT_APPLICABLE` busy arms accordingly.
5. Synchronize §5.3 schemas/outcome identities, §6.1–6.3 attestation, §7 required/forbidden fields, §8.2 precedence, Stop, both controller roots, and capacity cleanup. Generate the full product over input kind × scan empty/nonempty × journal arm × side × ledger admission × capability null/ISSUED/CONSUMED × owner kind/state/liveness × current-event relation × PreTool/PostTool/Stop. Add E1→E2 stale-capability, recovery-owner death, final-scan-drain→no-event retry, no-event notice Stop, dual-write/replay, and crash-before/after capability-rotate/controller-consume mutants and barriers.

## Remaining consistency scan

No additional BLOCKER, MAJOR, or MINOR was established after checking the current-byte requirement chain and premise, alias negatives and semantic obligation, strict Plan/result/finalization and approved-plan execution contracts, route×project/Stop composition, prompt identity and replay evidence, checkpoint/claim/source archive, project transaction/recovery, generation TCB/activation inverse, exact scope/DAG/rollback, and original UI-task handoff. This does not waive B1 or B2, and no unlisted default may fill B2 during implementation.

## Verification

- This report was read back from byte 0 through EOF after its final edit.
- The plan stale-hash check was rerun after report creation and remained `b291db5b45a6110b62ead18f550d82966d4ff8c7c8c3847f27981a698758942b` / 5,375 lines.
- `git diff --no-index --check /dev/null PLAN-AGENT-REVIEW-R16.md` produced no whitespace diagnostics; its expected nonzero status denotes the new file content.
- The report SHA-256 is reported out-of-band after final read-back so the report does not contain a recursive self-hash.

## Gate conclusion

The frozen plan bytes reviewed at SHA-256 `b291db5b45a6110b62ead18f550d82966d4ff8c7c8c3847f27981a698758942b` are **NOT_READY_FOR_REDTEAM** with **2 BLOCKER / 0 MAJOR / 0 MINOR**. Round-16 red-team dispatch and the exact-SHA user handshake remain closed. This receipt is the only file created; no plan, runtime, evidence, or other audit file was modified.
