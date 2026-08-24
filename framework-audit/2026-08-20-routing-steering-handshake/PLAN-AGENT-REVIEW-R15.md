# Round-15 Plan Agent Gate

## Receipt

- Review mode: fresh independent Plan-Agent gate. The current plan was read from byte 0 through EOF; no verdict from Round 14 was inherited.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `ca10206b712aa1b3d0eb3dfb37af13b53d2503bb00deb07538cf76ac58327817`
- Actual plan SHA-256 read for this review: `ca10206b712aa1b3d0eb3dfb37af13b53d2503bb00deb07538cf76ac58327817`
- Actual plan length: 5,083 lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Downstream `HEAD` / upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`.
- Round-14 receipt SHA-256 read: `3df46bc823e4936fecc1c30525ccb9e1976f422e684dcec21c7875636ef01917`.
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R14.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Baseline/evidence consistency: no drift was found. Claude authority remains current durable human-origin binding rather than raw `prompt_id`; Codex authority remains the adjacent durable two-record delivery pair rather than `turn_id` or text digest.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 1
- MAJOR: 0
- MINOR: 0

Round-14 B1 is mechanically closed at ordinary ledger capacity. The repair nevertheless leaves the transfer overlay and the strict 256-event ordinary-ledger cap unordered as one total product. At the cap, the overlay requires an event append that the schema forbids, while its own precedence prevents the declared event-257 rotation successor from running.

## Mechanical re-test of Round-14 B1

| Round-14 item | Round-15 result | Current-byte evidence |
|---|---|---|
| B1 status-only terminal bypassed nonterminal transfer recovery | **Closed, subject to the independent capacity blocker below** | The plan now orders attestation/identity guards before the matching journal lock+census, keeps PREPARED/TARGET_PUBLISHED/SOURCE_TOMBSTONED in LIVE/UNPROVABLE/PROVEN_DEAD recovery-only arms, and permits source terminal handling only after strict COMMITTED state sequence 3, matching receipts/hashes and a nonempty commit receipt (`FINAL-EXECUTION-PLAN.md:433-455`). The strict journal/owner/capability arms and liveness successors are complete (`:1805-1915`); SOURCE_TOMBSTONED explicitly leaves the source underlay recovery-only while COMMITTED releases the target and makes the source terminal-eligible (`:1922-1951`). The same precedence is repeated before TARGET_EXISTS and routing (`:2945-2951`, `:3101-3105`, `:3157`, `:3168-3173`, `:3245-3253`), Stop (`:3403-3411`), assertions (`:4598-4615`), mutants (`:4689-4694`) and fault barriers (`:4900-4903`). Missing/malformed proof fails closed, a COMMITTED target falls through to its imported underlay, and a COMMITTED source alone reaches the terminal path. |

## BLOCKER finding

### B1 - transfer precedence has no valid successor when the ordinary event ledger is already full

**Contract conflict**

- The new rule deliberately runs matching TransferJournal recovery and the COMMITTED-source terminal check before ordinary ledger capacity; every selected arm stops composition (`FINAL-EXECUTION-PLAN.md:433-457`). The global table repeats that journal/notice/TRANSFERRED proof precedes the separate “ordinary ledger would exceed 256” row (`:3157-3159`, `:3168-3173`).
- Those earlier arms still require the newly attested human event to be recorded. Every accepted human record appends an ordinary event and performs its route/project transition in the same rename (`:2722-2723`, `:2902-2903`). A nonterminal transfer event is explicitly “ledgered” while rotating its notice/recovery result (`:1902-1915`), and a committed source appends `TERMINAL_DIAGNOSTIC` before stopping (`:444-455`, `:3132-3139`).
- The same state schema caps `ledger.events` at 256 and independently says event 257 must enter ROTATION_REQUIRED (`:2732`, `:2767-2769`, `:2896-2903`). It supplies no transfer-specific overflow record, compaction, reservation or ROTATION recovery lane. Therefore the earlier transfer branch cannot serialize its mandatory append, while the later capacity branch is unreachable by its own precedence.
- Existing transfer assertions cross journal state, owner liveness, route event and parent relation, but not ordinary-ledger capacity (`:4598-4615`, `:4900-4903`). They cannot select the missing cap cell mechanically.

**Mechanical counterexamples**

1. Begin from a valid source session whose ordinary ledger has exactly 256 events, whose source underlay is `PLAN_EXECUTION_TRANSFERRED`, and whose matching journal is SOURCE_TOMBSTONED. Queue and lazily attest one fresh human STATUS event. For LIVE, UNPROVABLE and PROVEN_DEAD owner census respectively, the transfer overlay requires BUSY/notice/recovery-capability handling and requires the event to be ledgered. The schema cannot append event 257. Taking ROTATION_REQUIRED instead violates the earlier overlay's stop-composition rule and leaves the plan-transfer recovery outcome unspecified.
2. Begin from the same ledger count with the exact matching COMMITTED journal and nonempty commit receipt. The source-terminal rule requires one appended `TERMINAL_DIAGNOSTIC` and terminates before capacity; the event-257 rule requires ROTATION_REQUIRED and no append. Neither is a valid implementation of both contracts. By contrast, the COMMITTED target is said to fall through to its imported underlay and can reach the later capacity row, proving the source/target product is asymmetrically incomplete rather than the cap being globally resolved.

The conflict is reachable without malformed bytes: 256 is the declared valid maximum, checkpoint/claim/commit do not reserve an additional ordinary-ledger slot, and a fresh native event may arrive in every journal state. An implementation must either exceed the strict schema, skip anti-replay/event evidence, violate transfer precedence, or invent an unplanned transition.

**Minimum repair**

1. Under `plan-transfer-global → lexical session locks`, derive a strict `ledger_admission=AVAILABLE|FULL` before any event-dependent journal/notice/terminal mutation, while retaining journal validation/census as the higher security proof. Generate one total `side(source|target) × journal arm × owner census × ledger_admission` product; no branch may “append then discover cap”.
2. Freeze one FULL successor. At minimum it must preserve journal, source/target underlays, project bytes and the TRANSFERRED tombstone, emit command null, and use the fixed deny reserve rather than a 257th event. For a nonterminal journal, also define a bounded transfer-recovery lane under ROTATION (or an equivalent reserved/compacted transfer-event ledger) so LIVE/UNPROVABLE/PROVEN_DEAD and controller-death recovery remain representable; a silent permanent deadlock is not compatible with the plan's crash-recovery completion claim. For a COMMITTED source, define whether the bounded rotation record or terminal diagnostic is presented and prove it once; do not retain both successors. A COMMITTED target must continue to the same ordinary-capacity oracle used by every other imported underlay.
3. Synchronize §5.2, §5.3 event recording, §6.3 event-257 handling, §7 schema/capacity, §8.2 precedence, Stop, and the status/product prose. Add explicit required/forbidden fields and H/LP identities for any new reserved recovery/rotation record.
4. Add generated fixtures for ledger counts 255/256 crossed with PREPARED, TARGET_PUBLISHED, SOURCE_TOMBSTONED owner LIVE/UNPROVABLE/PROVEN_DEAD, COMMITTED source/target, missing/malformed proof and Stop. Add a mutant that leaves the capacity row after a stop-composition transfer append, plus before/after-capacity and recovery-controller-death fault barriers.

## Remaining consistency scan

No additional BLOCKER, MAJOR or MINOR was established after checking the current-byte requirements/root attribution, alias and semantic grammar, strict Plan/skill/parallel/MAIN execution contracts, human-input/state-capacity admission, prompt identity/replay, route×project/snapshot products, checkpoint/claim and transaction recovery, generation TCB/activation inverse, literal scope/DAG/rollback and original UI-task handoff. These sections do not supply the missing transfer×ledger-capacity cell.

## Gate conclusion

The frozen bytes reviewed at SHA-256 `ca10206b712aa1b3d0eb3dfb37af13b53d2503bb00deb07538cf76ac58327817` are **NOT_READY_FOR_REDTEAM** with **1 BLOCKER / 0 MAJOR / 0 MINOR**. Round-15 red-team dispatch and the exact-SHA user handshake must remain closed. This receipt is the only file created; no plan, runtime, evidence or other audit file was modified.
