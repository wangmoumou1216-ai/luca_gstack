# Round-13 Plan Agent Gate

## Receipt

- Review mode: independent Plan-Agent gate. The frozen plan was read from byte 0 through EOF; this receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `47d1b76935c1124791e35e4206995be26f747bf2e7505ae622bc87ca7d33c637`
- Actual plan SHA-256 read for this review: `47d1b76935c1124791e35e4206995be26f747bf2e7505ae622bc87ca7d33c637`
- Actual plan length: 4,999 lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Downstream `HEAD` / upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`.
- Round-12 receipt SHA-256 read: `c3f5ea1d8775a8ff76c9771ffe915b5ad2f7a27c62399df91d561b873acc9df8`.
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R12.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: Claude `prompt_id` remains a hint until current human-origin transcript binding, while Codex uses the adjacent durable two-record delivery pair rather than `turn_id` or prompt digest (`PAYLOAD-CENSUS.md:27-70`; `TRANSCRIPT-AUTH-EVIDENCE.md:18-67`). No baseline or evidence drift was found.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 1
- MAJOR: 0
- MINOR: 0

Round-12's new terminal row is locally coherent, but the earlier semantic-obligation creation layer still gives the same transferred source event a second authoritative successor. The claimed total product therefore remains non-executable as one deterministic oracle.

## Mechanical re-test of Round-12 B1

| Round-12 item | Round-13 result | Current-byte evidence |
|---|---|---|
| B1 transferred source gave `NEW_TASK` two successors | **Not closed** | The repair adds a terminal route-table row and explicit permanent-tombstone/Stop contracts (`FINAL-EXECUTION-PLAN.md:3075`, `:3084-3090`, `:3294`, `:3348-3350`) plus generated assertions and mutants (`:4530-4537`, `:4611-4613`). But the higher semantic creation layer still says that a qualifying signal creates an obligation, creates PENDING in every clean N/A/C/B project phase, and that a later explicit new task supersedes the prior object, with no `PLAN_EXECUTION_TRANSFERRED` exclusion (`:421-478`, especially `:453-478`; `:499-519`). The TARGET_EXISTS pre-table prose likewise says a signal-bearing combined NEW against an existing target supersedes/creates PROJECT_SWITCH_REQUIRED before its later status row says TRANSFERRED must only preserve (`:2904-2919` versus `:2941`). |

## BLOCKER finding

### B1 - Terminal transfer precedence was added after, but not before, semantic obligation creation

**Contract conflict**

- The source transfer tombstone is represented by the `route_obligation.status=PLAN_EXECUTION_TRANSFERRED` arm (`FINAL-EXECUTION-PLAN.md:423-445`, `:1903-1910`). Its allowed project phase is a clean stable phase, including BOUND (`:3294`).
- Independently of route status, the semantic layer says that after attestation a three-span signal creates an obligation and that clean `N/A/C/B` creates PENDING (`:421-457`). It then says explicit-new-task supersession occurs after placement admissibility (`:477-478`) and, without qualification, that a later explicit new task marks the old obligation SUPERSEDED (`:515-519`).
- The new status-specific layer requires exactly the opposite: every `PLAN_EXECUTION_TRANSFERRED` route event/project intent/parent relation produces only `TERMINAL_DIAGNOSTIC`, preserves the immutable tombstone, creates no obligation or project authority, and requires a fresh native session (`:3075`, `:3084-3090`, `:3294`).
- For a combined NEW whose target already exists, the same conflict also exists wholly inside §8.1: the general TARGET_EXISTS guard creates/supersedes the task-bearing PROJECT_SWITCH_REQUIRED obligation (`:2904-2919`), while the TRANSFERRED row says preservation and diagnostic only (`:2941`).
- The assertion text says both that the tombstone is preserved and that there is “no current obligation” (`:4534-4537`), although the schema has no separate transfer-tombstone field. That phrase cannot resolve which `route_obligation` object survives.

**Mechanical counterexample**

Let source sid S have clean `project.phase=BOUND(muse)` and `route_obligation.status=PLAN_EXECUTION_TRANSFERRED` after a committed checkpoint transfer. A fresh authenticated S event says `新任务：优化设置里的交互结构，功能堆砌。` It has an explicit independent-task prefix and the three distinct §5.1 spans. Under §5.2, B is clean, so the signal creates a fresh PENDING obligation and the old object becomes SUPERSEDED. Under the new §8.1/§8.5 row, the same `(TRANSFERRED, NEW_TASK, BOUND, parent relation, OTHER project intent)` input must retain the transfer tombstone and emit only the fresh-session diagnostic. The state has only one `route_obligation?` field; both results cannot be published in the same rename.

A second fixture using `NEW_TASK_SIGNAL_WITH_PROJECT` plus NEW for an already-existing target reaches the same disagreement between the general TARGET_EXISTS creation rule and the TRANSFERRED status row. An implementation that runs semantic placement first admits same-session work; one that runs the terminal row first violates the unconditional creation/supersession clauses. The generated route table alone cannot prove the pre-table overlay was short-circuited.

**Minimum repair**

1. Make `PLAN_EXECUTION_TRANSFERRED` a named highest-precedence short circuit **before §5.2 semantic creation/supersession and before the task-bearing TARGET_EXISTS creation arm**. Scope every general “signal creates” / “later new task supersedes” rule to non-TRANSFERRED admissible route statuses; signal parsing may supply diagnostic classification only in the transferred source and may not create, replace or supersede a route object.
2. Define the storage result unambiguously: the existing `route_obligation` remains the immutable transfer tombstone, and “no current obligation” in the assertion becomes “no new/live execution obligation” (or introduce and fully account for a distinct tombstone field; the smaller repair is to retain the existing arm).
3. Generate the terminal product from this pre-creation precedence, not only the later route table. Add explicit signal-only and combined-signal fixtures for ABSENT/EXISTING targets under transferred BOUND and all three parent relations, plus a mutant that bypasses the terminal short circuit in §5.2/TARGET_EXISTS. Every fixture must preserve byte-identical tombstone/project state, append only the bounded diagnostic, emit command null, and create no replacement obligation/D/S/capability.
4. Update the §2.11 closure claim only after those earlier normative clauses, assertions and mutants all name the same ordering.

## Remaining consistency scan

No additional BLOCKER or MAJOR was established after checking the current-byte route×project/status products, Plan/skill execution and checkpoint/transfer lifecycles, attestation/replay failure table, lock/recovery order, generation TCB and activation inverse, literal scope/DAG, rollback gates and original UI-task handoff. Existing worktree dirt does not overlap a listed runtime path; the deliberate dirty `rules.yaml` source is covered by the plan's explicit worktree-provenance receipt. These areas do not cure B1 because its conflict occurs before their state/controller gates.

## Gate conclusion

The frozen bytes reviewed at SHA-256 `47d1b76935c1124791e35e4206995be26f747bf2e7505ae622bc87ca7d33c637` are **NOT_READY_FOR_REDTEAM** with **1 BLOCKER / 0 MAJOR / 0 MINOR**. Round-13 red-team dispatch and the exact-SHA user handshake must remain closed. No plan, runtime, evidence or other audit file was modified by this review.
