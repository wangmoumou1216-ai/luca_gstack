# E3 review fixes and publication checkpoint

Scope: framework / NO_PIN. Parent: E3-NATIVE-EVENT-20260908-01 and evidence amendments 01/02.
Baseline: main at 559bb872611295ccef8f184f70929f012990ea2f.

## Authority

The user requested review, then explicitly instructed “全部解决完，提交，并发布”. After the
fix / regression + independent review / scoped commit + upstream push plan was presented,
the user confirmed the review–diagnose–fix–verify loop until findings are resolved.
This authorizes the E3 fixes below and ordinary publication to the existing tracking upstream/main.
It does not authorize unrelated Memory/v26 edits, backup publication, a release tag, deployment,
restart, persistent hook trust, force push, or reuse of the consumed no-verify approval.

## Review findings and root fixes

| Finding | Root fix | Evidence |
| --- | --- | --- |
| P1: null-cursor bootstrap can identify an old same-text event as a new unpublished submission | Remove historical-tail bootstrap; require a pre-input SessionStart source fence or existing attested cursor | Both-harness unfenced-history negatives; real substrate no-authority regression |
| P2: pre-adoption Stop history is absent from consumption ledger | Include native history before the current event when checking Stop ambiguity | Both-harness pre-fence Stop negatives; real Stop hook lifecycle regression |
| Related blocked-Stop replay through later identical assistant text | Reject multiple matching native assistant witnesses; distinct later text can close | Both-harness duplicate-response negatives and blocked Stop lifecycle |
| Startup lifecycle was hidden by Codex display adaptation | Preserve native_start_source separately from codex-start; initialize only startup/resume | Real adapter + SessionStart hook payload replay; compact negative |
| Historical Claude cwd / Codex multimodal content rejected after a valid fence | Skip current-event provenance/content validation before authenticated cursor; retain strict validation afterward | Both cases observed red for CWD_MISMATCH / UNKNOWN_SCHEMA, then green |

The fence identifies a read boundary, not a user event. Native source/anchor IDs remain the event identity.
Source absence is accepted only for absence errors, not permission failures. The source remains canonical,
bounded and no-follow; cursor-prefix changes fail closed. Initialization and later event publication use
the project-state lock. Unfenced migration is deliberately not automatic adoption of the latest record.

## Fresh verification

- Full framework check: `bash scripts/verify.sh`, PASS 94 / FAIL 0 / WARN 0.
- Final event-authority aggregate: `npm run test:event-authority --silent`, exit 0:
  prompt/lifecycle 19, negatives 47, mutation steps 5, transaction-fault cases 6, switch end-to-end 1.
- Mutation sequence: clean baseline PASS → remove bootstrap fence / historical Stop scan / duplicate
  witness guard in isolated copies → each exact semantic assertion FAIL → restored baseline PASS.
  Syntax/import/setup failures are explicitly not accepted as mutation evidence.
- Codex adapter non-CLI suite: PASS 23 / FAIL 0; quarantined read-grant cases remain skipped.
- Fixture-wiring reviewer ran transaction 28/0, scope 111/0, identity, hooks, negatives, faults and switch tests.
- Scoped diff whitespace check: clean. Commit hooks must run normally on the final staged payload.

## Independent closure

Initial cold Standards axis: PASS (static review only). Initial cold Spec axis: REFUTE, P1 bootstrap.
After root fixes, cold reviewer e3_final_fix_review returned PASS with fresh 19 lifecycle, 43 then-current
negative and 6 fault tests. After the final four negative cases and mutation runner were added, the same
independent reviewer read back the test-only changes, ran all five mutation steps and returned PASS again.
No remaining actionable P1/P2 finding was established within this scope; this is not proof of zero defects.

## Evidence limits and migration

No Claude CLI command was run: live Claude remains USER_WAIVED / UNKNOWN under amendment 02.
The new SessionStart/fence integration was verified through isolated real hook execution with native-schema
payload replay, not a newly claimed CLI live probe. Earlier native Codex evidence remains in the L0 report.
No persistent trust was changed. Canonical native source availability is required; unfenced historical
sessions are denied project authority until a valid startup/resume fence exists and fresh input follows.
Ambiguous repeated Stop text is refused rather than guessed. Completion language remains DONE_WITH_CONCERNS.

## Exact publication scope

- .claude/hooks/lib/event-attestation.mjs
- .claude/hooks/lib/project-substrate.mjs
- .claude/hooks/project-scope-guard.mjs
- .claude/hooks/route-guard.mjs
- .claude/hooks/session-restore.mjs
- .claude/hooks/session-sync.mjs
- .codex/codex-hook-adapter.mjs
- package.json
- scripts/project-pin.mjs
- scripts/project.sh
- scripts/check-project-links.mjs
- scripts/verify.sh
- scripts/test-route-guard.mjs
- scripts/test-hooks.mjs
- scripts/test-project-scope-guard.mjs
- scripts/test-project-transaction.mjs
- scripts/test-project-identity-wiring.mjs
- scripts/test-design-tool-retirement.mjs
- scripts/test-quality-gates-scope.mjs
- scripts/test-prompt-attestation.mjs
- scripts/test-event-attestation-negatives.mjs
- scripts/test-event-attestation-mutations.mjs
- scripts/test-event-transaction-faults.mjs
- scripts/test-event-switch-e2e.mjs
- CHANGELOG.md
- framework-audit/2026-09-09-e3-review-fixes.md

Pre-effect remote readback found upstream/main still at the baseline SHA. Stage only the list above;
normal commit hooks must pass. Recheck remote immediately before ordinary push; stop on divergence.
This checkpoint does not assert that commit or push has already happened; Git receipt is reported separately.
