U-001-a implemented; parent gate accepted.

Changed:

- [write_state.py](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/.claude/skills/office/references/write_state.py): combined locked transaction, strict state/extra rejection, atomic commit, explicit stale projection error, preserved unknown fields and omitted node fields.
- [test-workflow-state-guard.py](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/scripts/test-workflow-state-guard.py): real CLI coverage and retained UX extraction partition.

Verification: baseline red; final **74/74 PASS**. Reject-removal mutation **0/3 PASS**, lock-removal **0/4 PASS**; restored copies pass. Evidence binds source hashes, actual process identities, outputs and fixture cleanup.

[Checkpoint](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/framework-audit/2026-10-06-design-workflow-implementation/U-001-a/CHECKPOINT.md) · [Proof summary](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/framework-audit/2026-10-06-design-workflow-implementation/U-001-a/proof-summary.json)

Remaining risk: callers and ux-audit still require U-001-b migration to participate in this transaction. No independent acceptance or cross-platform parity claimed here.
