U-001-b implemented; parent fresh gate accepted.

Changed the nine caller SKILL bodies and `test-workflow-state-guard.py`:

- State inputs use the verified canonical project root.
- Writer failures preserve artifacts, expose stderr, and stop dependent completion.
- Idea publishes topic through the combined transaction.
- UX uses the central writer while preserving score admission and standalone behavior.

Verification: **128/128 PASS**. Failure-propagation removal: **0/9 PASS**; restored copies: **9/9 PASS**. Both unchanged project selection and gate mutation suites pass. Accepted writer bytes remain unchanged.

[Checkpoint](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/framework-audit/2026-10-06-design-workflow-implementation/U-001-b/CHECKPOINT.md) · [Source-bound proof](/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack/framework-audit/2026-10-06-design-workflow-implementation/U-001-b/proof-summary.json)

Native Claude/Codex skill orchestration remains for later acceptance; these probes verify actual extracted shell and CLI behavior.
