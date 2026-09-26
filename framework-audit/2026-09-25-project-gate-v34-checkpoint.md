# Project-gate v3.4 final implementation checkpoint

Recorded: 2026-09-25 (Asia/Shanghai)
Framework baseline: `f22ecb5be8099b575c15849c0d48263e0a6ee584`
Handoff SHA-256: `5595f531620346f1a28448224e8828a5392401b51f56c1cd8554d8f53143729b`
Final-plan SHA-256: `66173677536a37cbc673defd8d7b6c8b0d95201af6338e33e4714bc06bc5fc4f`

## Scope and execution order

This is a framework `NO_PIN` implementation. It did not enter, switch, restore, or modify a downstream project. Work completed in the authorized order:

1. U-001 — neutral route guard; project-name mentions cannot authorize or synthesize a switch.
2. U-002 — authenticated public `project.sh switch/new` proposal flow, controller receipts, and same-event continuation.
3. U-003 — absolute project paths delegated to the project scope guard; display aliases remain compatibility-only; restore/sync stays observational; project writers and dispatched work use fixed absolute roots with an explicit cancellation boundary.
4. U-004 — minimal, reserved and recoverable `new`: project directory plus deterministic `CONTEXT.md` only, with the frozen interruption table enforced.
5. U-007 — versioned, whitelisted, read-only host project/session list and status projection with identity, snapshot, operation, receipt, and selection-commit evidence.
6. U-005 — root/runtime/office contracts and Claude/Codex adapter parity, including the host-view versus execution-authority distinction.
7. U-006 — migrated routing fixtures and regression/evaluation coverage.

## Delivered behavior

- Public selection uses exact argv, scope-guard attestation, session/transaction/epoch binding, a controlled-command mapping, and controller-side reauthorization before side effects.
- A committed selection publishes a fresh `commit_id` and monotonic `(stream_id, sequence)` marker; replay is byte-idempotent and cannot mint a new selection.
- A same-project explicit re-entry is distinguishable from an old receipt. Stop and event rotation preserve completed/failed receipts; active events retain unresolved operations without the terminal-history cap.
- `new` rejects an existing target before reservation, uses exclusive reservations and staging, resolves competing sessions deterministically, and leaves only `CONTEXT.md` in a successful new project.
- Ordinary and host list operations expose only canonical READY projects. Ordinary status no longer reads display links; host status is a versioned read-only whitelist with `execution_authority=NOT_PROVIDED`.
- Codex workflow dispatch captures one canonical absolute `WORK_ROOT`; a later project switch cannot retarget queued work. Signal cancellation reports queued and in-flight counts, stops further dispatch, terminates the child process group, and explicitly sets `os_revocation_guaranteed=false`.
- The host invocation, fields, ordering marker, error behavior, and read-only proof are documented in `framework-audit/project-host-read-contract.md`.

## Verification evidence

Focused checks after the first independent review repairs:

```text
node scripts/test-project-selection-v34.mjs          PASS
node scripts/test-project-controlled-selection.mjs  PASS
node scripts/test-project-host-view.mjs              PASS
node scripts/test-project-transaction.mjs            PASS=67 FAIL=0
node scripts/check-agent-contracts.mjs                agent-contracts: 74/74
node scripts/test-workflow-runner.mjs                 PASS=19 FAIL=0
node scripts/test-project-gate-v34-mutations.mjs      PASS (A01/A04/A05/A09)
node scripts/test-project-gate-v34-dual-host.mjs      PASS=27 FAIL=0
node scripts/test-workflow-runner-runtime.mjs         PASS=38 FAIL=0
git diff --check                                      PASS
bash scripts/verify.sh                                PASS=105 FAIL=0 WARN=0 DELEGATED=1
```

The mutation suite now runs an isolated unmodified negative control before every mutant, copies the state writer needed by A05, proves the selected invariant turns red, and then proves the restored baseline green. Concurrency coverage includes same-transaction retries and competing-session creation of the same target. Stop and recovery-denial coverage preserve `created=true` and the last durable phase for an interrupted creation. Controller coverage proves a forged controlled `new` remains denied even after the outer guard layer.

The dual-host runtime fixture executes the production Claude hook path and Codex adapter path for enter-plus-same-event-task, unknown-result lookup, NO_PIN absolute reads, Stop cancellation of an unissued selection, refusal, and damaged-state degradation. The workflow runtime fixture dispatches A work, performs an actual isolated session switch to B, signals cancellation, proves the two queued A actions were never dispatched, verifies the first prompt retained A's absolute root, and confirms the started process group did not survive.

## Independent review status

The first frozen-diff review returned FAIL and identified four concrete defects plus four incomplete-evidence gates: an invalid A05 mutation fixture, reservation-before-collision corruption, ordinary list/status compatibility leaks, loss/truncation of operation receipts, and insufficient A07/A08/A09/A11 evidence. A second withdrawn snapshot confirmed those repairs but found one additional recovery-refusal receipt defect and kept A08/A11 unknown because their evidence was only textual. The controller now resolves its reservation before authorization recheck and retains `CREATING/created/phase` on refusal; A08 and A11 now have production-path runtime fixtures mounted in `verify.sh`. A final read-only closure review of the newly frozen diff is pending; its verdict is reported in the delivery response rather than prewritten into this reviewed artifact.

## Protected and excluded work

- Preserved the pre-existing CJK/mixed `softSkillDecision` change in `.claude/hooks/route-guard.mjs` and its corresponding `scripts/test-route-guard.mjs` coverage.
- Preserved the unrelated `.claude/observability/observations.jsonl` addition.
- Did not modify Muse `app/main.js`, sidebar behavior, hidden preferences, or any UI.
- Muse application-side adaptation and removal of its old automatic switch-back behavior remain assigned to the separate session.
- No commit, push, publication, or downstream-project mutation was performed.
