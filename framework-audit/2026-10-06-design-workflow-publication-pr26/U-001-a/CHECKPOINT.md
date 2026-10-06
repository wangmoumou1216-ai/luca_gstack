# U-001-a implementation checkpoint

Work root: `/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack`.
Framework maintenance, `NO_PIN`; no shared project aliases, real projects, or `framework/` assets were accessed or changed. Parent supplied baseline `d211bd3`; this worker performed no Git/network operations or agent dispatch.

## Implemented scope

- `.claude/skills/office/references/write_state.py`: one combined CLI transaction; only missing state initializes; existing YAML/shape errors and invalid extra reject before commit; unknown fields and aliased non-target data survive; omitted status/output preserve the existing node while explicit empty output patches it; new nodes retain default status/output.
- Stable `.luca/workflow-state.lock` advisory inode serializes read/patch/commit/projection. Default wait is 5 seconds; `_STATE_LOCK_TIMEOUT_SECONDS` must be finite in `(0, 60]`. Unsupported `fcntl` platforms refuse mutations.
- Same-directory exclusive temporary file, serialization before write, flush/fsync, atomic replace and normal-failure cleanup. Topic projection follows the source commit under the same lock. A projection failure exits 1 with `state committed / projection stale`, preserves committed state, and a later valid topic transaction repairs it.
- `scripts/test-workflow-state-guard.py`: real production CLI tests and controlled read scheduling; original ux-audit extraction partition retained for U-001-b. `--writer`, `--partition`, `--case`, and `--evidence` permit narrow owned-copy proofs and retained subprocess evidence.

## Fresh verification

`python3 framework-audit/2026-10-06-design-workflow-implementation/U-001-a/run-proof.py` exited 0. It records each subprocess command/result and leaves the production writer unchanged during temporary mutations.

| Evidence | Observed result |
|---|---|
| `baseline-red.log` / `baseline-red.json` | Before writer edit: exit 1, 17/69 PASS. Corrupt node/topic/combined calls wrongly exit 0; controlled concurrent node/topic updates lose the first change. |
| `baseline-replay.log` / `.json` | Frozen baseline writer against final writer partition: exit 1, 16/72 PASS. |
| `green-real-cli.log` / `.json` | Actual production CLI plus retained UX partition: exit 0, 74/74 PASS. |
| `mutation-reject-red.log` / `.json` | Permissive read substituted in an exclusive temporary writer: exit 1, 0/3 PASS; all writer processes exit 0 and the rejection assertions detect the regression. |
| `mutation-reject-restored.log` / `.json` | Exact original source restored in the temporary copy: exit 0, 3/3 PASS. |
| `mutation-lock-red.log` / `.json` | Lock removed in an exclusive temporary writer: exit 1, 0/4 PASS; all writer processes exit 0 and lost-update assertions detect the regression. |
| `mutation-lock-restored.log` / `.json` | Exact original source restored in the temporary copy: exit 0, 4/4 PASS. |
| `final-restored-green.log` / `.json` | Fresh actual production suite: exit 0, 74/74 PASS. Writer/guard before/after hashes match. 72 owned central fixtures and 82 processes have actual identity, timestamps, output and explicit cleanup/readback. |
| `proof-summary.json` | Mutation/source hashes, exact counts, restored passes, temporary-copy cleanup and unchanged production source. |

The writer SHA-256 is `dcfe5a38ec9d06f0847e1235f302602d947bc2fe4772e4fe7626291a93eacf06`.
The guard SHA-256 is `006ad2b2906a767fb72871dd26ecdffd66b43fdd8f684f995cda4d10081599c3`.

## Remaining gates and limits

- U-001-b still owns the nine caller contracts, failure propagation, the idea topic prewrite, and ux-audit migration to the central transaction. Existing bypass writers can still evade this advisory lock until migration; this checkpoint does not claim all workflow writers are safe.
- Independent acceptance and Claude/Codex caller probes belong to the parent/final gate and have not been claimed here. The production CLI was exercised on macOS; Linux/platform parity was not executed.
- State and topic are two files, with an intentional committed-state/stale-projection failure state. The suite does not promise two-file atomicity or power-loss recovery. The process-exit probe kills after the locked read, before creating a temporary commit file.
- The parent should check the guard's original executable mode in its Git diff, because the bounded worker did not use Git.

## Resume / next owner

Read this checkpoint, `proof-summary.json`, `final-restored-green.json`, and the two changed sources. Parent should run its fresh source-bound gate and independent acceptance, then freeze the shared guard preimage before U-001-b. No worker remains active on these production files after this handoff.
