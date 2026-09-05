# P6 v24 independent Standards delta review

**PASS — no confirmed Standards finding in the one-file v23 → v24 delta.** This is source and local production-matcher closure, not live-model or publication acceptance.

## Exact scope

- Baseline source: `framework-audit/2026-09-05-agent-context-p6-v23-scorer/run-agent-context-ab.mjs`, SHA256 `15c689040272b06142a50c354e18bf7e58436e56c967bc968f377d6b53be80bb`.
- Reviewed file: `scripts/run-agent-context-ab.mjs`, SHA256 `6785d1fe7e6e5f4624ff0436cf7dddabd73b5d5ef5f2f40431efebad6baba779`.
- Protocol: 24; revision: `v24-exact-codex-skill-budget-notice`.
- Independently recomputed scoring SHA256: `f7adb4b1e1922e415c89824cf19e969a41334cd7ea616009d7a898cc47429cb5`.
- Both companion branch-fixture modules remain byte-identical to the v23 backup. No Spec report, scorer-backup README, or conclusion was used.

## Assessment

The classifier at `scripts/run-agent-context-ab.mjs:372` requires the exact event and item key sets, `item.completed`, item type `error`, a nonblank string ID, and the full observed message. It preserves the complete original event in `runtime_notice` and continues processing later events. The exact known non-I/O diagnostic is exempted; unknown errors and activity retain the existing fail-closed route.

Claims, source, owner/EOF, scope, and baseline/candidate validation are unchanged. Existing evidence provenance for the message is recorded in `/private/tmp/p6-codex-notice-diagnosis.md`; the installed binary supports the description-shortening interpretation, with the previously stated absence of upstream Rust source verification. The notice remains visible rather than silently discarded.

## Fresh independent narrow verification

Artifacts: `/private/tmp/p6-v24-standards-0_2mjw5e/results.json` and per-case logs. The exact production function prefix and new regression block were copied to a temporary harness, with additional independent cases. No full suite or paid CLI was run.

| Check | Result |
| --- | --- |
| Exact notice projection and original event retention | PASS. |
| F1 with notice, baseline and candidate | PASS. |
| Eight added source-test near misses | All remain unclassified / UNKNOWN. |
| Six extra shape/error cases: missing ID, blank ID, null item, absent item, top-level error, turn.failed | All UNKNOWN. |
| Four malformed transports via existing failure-evidence path | UNKNOWN with failure evidence preserved. |
| Notice plus unknown command or tool/I/O item | UNKNOWN. |
| Notice plus outside-checkout read | FAIL. |
| Notice plus failed command | Candidate evaluation remains rejected. |
| F2 with notice and complete startup/project-session reads | PASS. |
| Same F2 with missing or actual first-line-only project-session content | Rejected while claims/source remain valid; owner is incomplete. |
| Same full-read F2 with incorrect claim | Rejected. |

Actual production mutations in the temporary copy:

1. Replace exact message equality with `startsWith`: rejected by the near-miss assertion (`runtime_notice` incorrectly replacing `unclassified_activity`).
2. Drop the original event from the notice entry: rejected by the deep-equality retention assertion.
3. Stop processing after the notice: rejected by `notice hid separate I/O` (`PASS` incorrectly replacing `UNKNOWN`).

Restoring the precise reviewed implementation passes all narrow checks again. These mutations exercise production classification and event-loop behavior, not fixture labels.

## Boundary

No working scorer or frozen source was changed. Original v23 evidence and its old-scoring verdict remain immutable. Parent-owned freeze validation and live acceptance are separate from this delta PASS. No source mutation, network, browser, project alias access, staging, or publication was performed by this reviewer.
