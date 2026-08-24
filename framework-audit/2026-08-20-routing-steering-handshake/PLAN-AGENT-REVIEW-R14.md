# Round-14 Plan Agent Gate

## Receipt

- Review mode: independent Plan-Agent gate. The frozen plan was read from byte 0 through EOF; this receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `e865bbdcc898ff6e2ad58ece868cbf05b11fca4fef31950b02b5c7762df1cf1d`
- Actual plan SHA-256 read for this review: `e865bbdcc898ff6e2ad58ece868cbf05b11fca4fef31950b02b5c7762df1cf1d`
- Actual plan length: 5,030 lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Downstream `HEAD` / upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`.
- Round-13 receipt SHA-256 read: `6181c3cb235da6f3d741f3417beec7a8a99e1e2934f3199a5779c42524021349`.
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R13.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: Claude `prompt_id` remains only a candidate hint until current human-origin transcript binding, while Codex authority comes from the adjacent durable two-record delivery pair, not `turn_id` or a prompt digest (`PAYLOAD-CENSUS.md:27-70`; `TRANSCRIPT-AUTH-EVIDENCE.md:18-67`). No baseline or frozen-evidence drift was found.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 1
- MAJOR: 0
- MINOR: 0

Round-13's semantic-creation conflict is repaired for a committed transfer, but the new status-only short circuit also fires in the earlier, crash-recoverable `SOURCE_TOMBSTONED` journal window. That window has a different mandatory recovery/Stop overlay, so the same reachable state still has two incompatible successors.

## Mechanical re-test of Round-13 B1

| Round-13 item | Round-14 result | Current-byte evidence |
|---|---|---|
| B1 terminal transfer was below semantic creation/TARGET_EXISTS | **Closed for a post-commit source, but the repair introduces the blocker below** | The current plan now places a source-terminal check before signal placement/supersession/TARGET_EXISTS (`FINAL-EXECUTION-PLAN.md:427-435`), scopes signal creation and old-task supersession to the non-TRANSFERRED arm (`:437-496`, `:536-537`), gates TARGET_EXISTS after that check (`:2922-2926`), preserves the existing tombstone in the terminal row (`:2963`, `:3097`, `:3106-3112`), and supplies matching Stop/assertion/mutant/fault coverage (`:3370-3372`, `:4557-4566`, `:4640-4643`, `:4849-4851`). The original R13 counterexample can no longer reach semantic placement once the transfer is committed. |

## BLOCKER finding

### B1 - `PLAN_EXECUTION_TRANSFERRED` becomes visible before transfer commit, but the new short circuit is keyed only by that status

**Contract conflict**

- The repaired rule says that immediately after attestation, the mere presence of `route_obligation.status=PLAN_EXECUTION_TRANSFERRED` is the highest-precedence check, appends `TERMINAL_DIAGNOSTIC`, stops composition, and permits only the fresh-session terminal presentation (`FINAL-EXECUTION-PLAN.md:427-435`, `:3106-3112`, `:3370-3372`). It has no TransferJournal-state predicate.
- The transfer protocol reaches that route status before its journal is terminal: the journal has the four durable states `PREPARED→TARGET_PUBLISHED→SOURCE_TOMBSTONED→COMMITTED`; the SOURCE_TOMBSTONED arm still has an owner and an explicitly empty commit receipt (`:1785-1813`), and the source becomes `PLAN_EXECUTION_TRANSFERRED` at source tombstoning while the target is not released until COMMITTED (`:1902-1927`, especially `:1921` and `:1927`). A crash therefore makes this combination externally observable.
- For every matching nonterminal journal, the opposite precedence is mandatory. LIVE returns BUSY, UNPROVABLE stages only the recovery notice, and PROVEN_DEAD issues only a recovery capability; ordinary route/project action and Stop remain blocked except for the exact UNPROVABLE notice (`:1849-1873`, `:1882-1895`). The route contract repeats that this census/notice overlay runs before every row (`:3076-3079`) and before `resolveRouteControl` (`:3210-3216`), while Stop repeats the same overlay (`:3366-3369`).
- The status table itself calls TRANSFERRED a **post-commit** tombstone (`:3316`), but the state transition creates that status one journal barrier earlier. The terminal display is said to derive from a committed target receipt (`:3109`), which is unavailable in the SOURCE_TOMBSTONED arm because its commit receipt is required empty (`:1806-1809`).

**Mechanical counterexample**

Start an exact checkpoint claim and durably publish target state. Tombstone the source, so its session document now contains `route_obligation.status=PLAN_EXECUTION_TRANSFERRED`, then crash before the journal's `SOURCE_TOMBSTONED→COMMITTED` publication. On the next source security hook, attest a fresh human `NEW_TASK` event.

If the new §5.2 rule runs as written, it appends `TERMINAL_DIAGNOSTIC`, skips the journal census and allows the terminal fresh-session display/Stop. If the mandatory transfer overlay runs as written, the same event instead yields exactly LIVE/BUSY, UNPROVABLE/recovery-notice, or PROVEN_DEAD/recovery-capability, and Stop follows that branch. In the UNPROVABLE and PROVEN_DEAD cases even the persisted successor objects differ; in the LIVE case the terminal diagnostic mutation itself is forbidden. Both outcomes cannot be the one state transition, and the short-circuit path cannot construct its claimed committed-receipt presentation from this journal arm.

**Minimum repair**

1. Freeze one explicit order: `lazy attestation → prompt/ledger guards → matching TransferJournal owner census and active recovery-notice overlay under plan-transfer-global + lexical session locks → only after exact COMMITTED read-back, TRANSFERRED terminal-source short circuit → semantic placement/TARGET_EXISTS/ordinary project matrix`.
2. Replace the status-only eligibility predicate with an exact terminal proof: the TRANSFERRED tombstone must bind a matching, fully validated COMMITTED journal and its nonempty commit receipt. Missing, malformed, PREPARED, TARGET_PUBLISHED or SOURCE_TOMBSTONED journal bytes fail closed into the transfer recovery contract; they never fall through merely because the route status already says TRANSFERRED. The smaller repair keeps the existing source route tombstone and changes precedence/eligibility rather than adding another route status.
3. Make §5.2, §8.1/§8.2/§8.5, the Stop table and the `post-commit` status prose use that same predicate. The ordinary terminal product remains unchanged once COMMITTED; before COMMITTED, only the transfer overlay is reachable.
4. Add generated source-side fixtures for `route=TRANSFERRED × journal=SOURCE_TOMBSTONED × owner=LIVE|UNPROVABLE|PROVEN_DEAD × every route-event kind`, plus crashes immediately before/after COMMITTED. Add a biting mutant that runs the terminal-source check before the nonterminal-journal overlay. Assert no terminal diagnostic/terminal Stop before commit and exactly one diagnostic path after commit.

## Remaining consistency scan

No additional BLOCKER, MAJOR or MINOR was established after checking the current-byte requirements/root attribution, alias grammar/negative corpus, strict Plan/skill execution and human-input persistence, route×project/status products, attestation/replay outcomes, project claim/lock/recovery order, generation TCB and unique activation inverse, literal scope/DAG/rollback, and the original UI-task handoff. Those areas do not resolve B1 because its collision is between two higher-precedence security overlays in the transfer crash window.

## Gate conclusion

The frozen bytes reviewed at SHA-256 `e865bbdcc898ff6e2ad58ece868cbf05b11fca4fef31950b02b5c7762df1cf1d` are **NOT_READY_FOR_REDTEAM** with **1 BLOCKER / 0 MAJOR / 0 MINOR**. Round-14 red-team dispatch and the exact-SHA user handshake must remain closed. No plan, runtime, evidence or other audit file was modified by this review.
