# Round-12 Plan Agent Gate

## Receipt

- Review mode: independent Plan-Agent gate; the frozen plan was read from byte 0 through EOF. This receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `10e9e2db614ebba6db7bd1358cb3281f7a2b5ec12d785b303fe17039f8621ed1`
- Actual plan SHA-256 read for this review: `10e9e2db614ebba6db7bd1358cb3281f7a2b5ec12d785b303fe17039f8621ed1`
- Actual plan length: 4972 lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Round-11 receipt SHA-256 read: `d3c9643d501ec1faf49c34e5e8682e644c2cd36042ada195403ce0492525a9e6`.
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R11.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: Claude's `prompt_id` remains only a hint pending current human-origin transcript binding, and Codex still requires the adjacent durable two-record pair rather than `turn_id` or a digest (`PAYLOAD-CENSUS.md:27-70`; `TRANSCRIPT-AUTH-EVIDENCE.md:18-67`). No evidence or baseline drift was found.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 1
- MAJOR: 0
- MINOR: 0

The current bytes mechanically close all three Round-11 findings. A newly exposed contradiction in the claimed total route-state product nevertheless gives `PLAN_EXECUTION_TRANSFERRED + NEW_TASK` two incompatible successors, so the implementation oracle is not deterministic and Round-12 red-team dispatch must remain closed.

## Mechanical re-test of every Round-11 finding

| Round-11 item | Round-12 result | Current-byte evidence |
|---|---|---|
| B1 MAIN_AGENT answer had no durable preimage | **Closed** | `MainAgentHumanAnswer` is a strict bounded object with canonical bytes, length/SHA, native event/boundary and option ID, and its identity is bound into both answer/evidence roots and successor TOOL input (`FINAL-EXECUTION-PLAN.md:1225-1264`). Complete objects persist through terminal phase records, delta inputs and project-scope snapshots (`:1269-1273`, `:1390-1405`, `:2138-2167`). Crash, wrong-event/option, hash-only and transcript-reconstruction vectors are mandatory (`:4343-4354`, `:4620-4623`, `:4772-4774`, `:4817-4819`). |
| B2 archive-full cancellation left PRESENTED claimable | **Closed** | Checkpoint creation reserves a deterministic ENTRY or OVERFLOW slot and worst-case cancellation bytes; occupied overflow prevents minting, and `ROTATION_REQUIRED + ISSUED/PRESENTED` is invalid (`:1556-1600`). OVERFLOW cancellation removes the live checkpoint, stores the complete terminal record and installs only rotation (`:1602-1608`); claim revalidation requires ATTESTED/non-ROTATION and the exact reservation/archive (`:1742-1750`). The state schema and assertions preserve that exclusion (`:2744-2750`, `:4403-4422`). |
| M1 retained human answers lacked aggregate 2 MiB admission | **Closed** | The strict manifest-bound capacity object and its component/hash identities are defined at Plan finalization (`:941-984`). The analyzer serializes every reachable full-state template, including all parameter and MAIN_AGENT answers, snapshot duplication, retired delta contexts, cancellation arms, ledgers and reserves (`:986-1005`); cap/admission and approval/delta rechecks are explicit (`:1006-1025`). Cap-1/cap/cap+1 assertions and mutants/faults cover the aggregate path (`:4288-4295`, `:4607-4610`, `:4767-4770`, `:4819-4820`). |

## BLOCKER finding

### B1 - `PLAN_EXECUTION_TRANSFERRED + NEW_TASK` has two incompatible authoritative successors

**Contract conflict**

- `PLACE_NEW` is not merely a diagnostic: it marks the old task SUPERSEDED and creates a new PENDING/DEFERRED obligation when the new event independently carries the semantic signal (`FINAL-EXECUTION-PLAN.md:3026-3036`).
- The total route transition table assigns the `PLAN_EXECUTION_TRANSFERRED × NEW_TASK` cell `PLACE_NEW without source authority` (`:3053-3076`, specifically `:3069`).
- The status/product overlay instead defines `PLAN_EXECUTION_TRANSFERRED` as a permanent post-commit tombstone under which **every** ordinary project/task event is diagnostic-only and may not route (`:3269-3285`, specifically `:3280`). The independent TARGET_EXISTS table and generated assertion reinforce terminal preservation only (`:2935`, `:4511-4513`).
- The state has one current `route_obligation` arm (`:2711-2741`). It cannot simultaneously remain the immutable TRANSFERRED tombstone and become the fresh PENDING obligation required by PLACE_NEW. No precedence rule says that the overlay overrides or rewrites the route-table cell; §8.1 instead claims the route table is total and crossed with the project product (`:3038-3051`, `:3078-3081`).

**Mechanical counterexample**

After a transfer journal reaches COMMITTED, source sid S is in `PLAN_EXECUTION_TRANSFERRED`. A fresh, authenticated source event says `新任务：优化设置里的交互结构`. It uniquely classifies as NEW_TASK and independently carries the §5.1 semantic signal. The route row requires `PLACE_NEW`, so S must supersede the transferred arm and create PENDING. The overlay and terminal-preservation assertion require S to remain TRANSFERRED and append only a diagnostic. Both successors satisfy different normative clauses for the same `(status, route_event_kind, project phase, parent relation)` input; selecting either silently violates the other. The generated matrix therefore cannot be a single executable oracle, and the new user task is either unauthorizedly admitted or silently discarded depending on implementation order.

**Minimum repair**

Choose one policy and make §8.1, §8.5, Stop behavior, generated assertions, mutants and fault vectors derive from that single source. The minimal policy consistent with the current overlay, TARGET_EXISTS row and assertion is: change every `PLAN_EXECUTION_TRANSFERRED` ordinary task/project cell, including NEW_TASK, to immutable terminal diagnostic preservation with command null, and explicitly require a fresh session for another task. Add a generated `TRANSFERRED × all route_event_kind × all project intent × all parent relation` oracle and a biting mutant that restores PLACE_NEW.

If source-session reuse is instead required, it is not a one-cell edit: retain the transfer tombstone in a separate immutable history object, define a new current obligation with a distinct ID/capacity accounting and atomic transition, and revise the overlay, Stop, state schema, transfer recovery and replay tests accordingly. No implementation may infer this larger policy from the present contradiction.

## Gate conclusion

The frozen bytes actually reviewed at SHA-256 `10e9e2db614ebba6db7bd1358cb3281f7a2b5ec12d785b303fe17039f8621ed1` are **NOT_READY_FOR_REDTEAM** with **1 BLOCKER / 0 MAJOR / 0 MINOR**. All three Round-11 repairs are mechanically closed on their stated paths, but the total state oracle remains internally contradictory. Round-12 red-team dispatch and the exact-SHA user handshake must remain closed. No plan, runtime, evidence or other audit file was modified by this review.
