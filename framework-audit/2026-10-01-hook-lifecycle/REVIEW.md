# Hook incident review — 2026-10-01

Scope: recover normal Codex execution while preserving the user's disabled production Hook settings. Test with all framework Hooks enabled only in an isolated home, checkout and state root. Framework work remains NO_PIN.

## Findings and repairs

| Failure | Cause and repair | Evidence |
| --- | --- | --- |
| New linked-worktree session cannot use tools while another task is controlled | Control discovery shares Git common-dir; tool enforcement incorrectly inherited the other checkout's REQUIRED manifest. Filter only the execution view by canonical checkout, including fallback and project selection; retain global controller arbitration. | Red reproduction before fix; 14 controlled-change groups, 158 project-scope assertions and project-selection tests pass. Independent reviewer reverted the filter and reproduced the failure. |
| Read-only inspection blocked inside a controlled task | Read/Glob/Grep fell through the unsupported mutation-tool branch. Allow those native read tools; retain separate project/path isolation. | Owner read tests pass; Bash, unknown tools and unauthorized mutations still deny. |
| Successful child treated as cancelled after an older aborted turn | Cancellation scan included historical turns. Bind cancellation to current turn; ambiguous/current cancellation still rejects. | 243 model-route checks; history/current/unattributable abort matrix, critical failure latch and effective independent mutation. |
| Workflow runner cannot recover activation while spawn can | Runner used a different missing/paused activation path. Share the verified native recovery boundary. | Forged/foreign/finished/current critical failure cases remain denied; 138 host checks pass. |
| Trust repair fails in a linked checkout | Official Hook registration keys use the primary Git checkout. Resolve that registration and require equal definition bytes before trust CAS. | 23 trust tests, real official hooks/list dry run, shared-registration drift mutation caught. |
| Luca App reports disabled or missing Hooks as untrusted | Readiness collapsed distinct causes. Report disabled/untrusted/missing/changed/unknown separately for the selected home. | 18 App tests and independent missing-key mutation; no automatic enablement. |

## Native runtime acceptance

`node scripts/test-codex-native-lifecycle.mjs` is an opt-in isolated acceptance test. It uses the real Codex CLI and a loopback Responses fixture, explicitly trusts/enables all 11 copied framework Hooks, then executes a new session and its resumed session. Both perform shell reads/writes, apply_patch, child dispatch, child completion and shutdown. The fixture checks actual Hook events and outputs, child receipts and file contents. It does not use a live model or modify production Hook settings. The isolated home produces the existing startup `SOURCE_ROOT` advisory because it is outside the OS user's approved production homes; this test does not attest startup project-pin source fencing. Project transaction boundaries are covered separately by focused tests.

Final native evidence: `/private/tmp/luca-native-lifecycle.TXhr2e/result.json`; 44 Hook events, all 11 registrations exercised, two completed child lifecycles, no denials or tool parser errors. Each turn has accepted transcript evidence and no unresolved preparation. This verifies protocol and enforcement, not model judgement or Luca GUI interaction.

## Integration conclusions and remaining boundaries (initial release)

- Registration/trust belongs to each Codex home. Turning off System-profile Hooks does not configure Sidecar/Direct homes. App readiness must identify which home failed.
- Framework runtime recovery must rely on native event/transcript evidence. Missing evidence is not repaired by granting arbitrary activation.
- Controlled execution applies to the owning checkout; controller arbitration remains shared across the Git repository. Invalid or multiple REQUIRED records still fail closed.
- The initial release lacked same-checkout native ownership. The follow-up in [APP-AND-CONCURRENCY.md](APP-AND-CONCURRENCY.md) adds native session-bound disjoint claims and real same-directory acceptance. Legacy-v1 records remain exclusive and are not silently migrated.
- Production source-guard errors in the earlier incident were addressed by the preceding native registration release. This change does not reinstall that guard or re-enable Hooks.
- A signed App package and a running process are not GUI acceptance. Current delivery can verify installed module bytes while the existing user process continues; new code is loaded on normal restart.
- Nondefault-home activation recovery and live-provider/UI lifecycle need separate evidence. No claim of universal failure-free behavior follows from these tests.

Independent reviews covered framework routing/trust, controlled-state applicability and App readiness separately. Their effective mutations demonstrate that the targeted regressions are detected. Publication requires the repository verification gate as well as these focused checks.

The follow-up [App and concurrency review](APP-AND-CONCURRENCY.md) records actual installed-App GUI new/resume acceptance, the first-run configuration fix, same-directory concurrency, and publication evidence. It supersedes the initial-release boundaries only where it supplies new evidence.
