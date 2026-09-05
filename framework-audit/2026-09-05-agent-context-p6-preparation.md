# P6 mainline preparation and Opus 4.6 baseline

Status: DONE_WITH_CONCERNS for independent local preparation; NEEDS_CONTEXT for release-dependent mainline continuation. NO_PIN framework/meta. This report does not release BR-PAGE-HANDOFF, close P6, or freeze a final candidate.

## Authority and boundary

The user authorized mainline P6 preparation, preservation of P0–P5, and eventual selective commit/ordinary push after all remaining gates. The 20260905-174414 handoff and mainline/branch R-2/R-3/R-4 define ownership and supersede historical sampling requirements.

The user subsequently specified Claude Opus 4.6 and authorized running available Claude verification after 18:00 Asia/Shanghai. Four previously missing baseline cells can run against the unchanged baseline export while the original session completes the branch. Candidate final A/B still waits for its release package and actual-file verification. This is not authority to rerun the waived B1 page-library acceptance loop.

Mainline owns runner, new versioned fixtures/scorer tests, and its evidence/report files. The original session retains shared roots, skills, routing, generated context, governed facts, and common verification wiring until explicitly released. Do not modify framework/, shared project aliases, downstream projects, or the protected retrieval log.

## Fresh recovery observations

- HEAD: `94f086233affb3bd08ad8fe33063bcfedb330edf`; index empty on recovery; dirty tree retained.
- Protected `memory/retrieval-log.jsonl`: `bbfdea3971688338f05ef9a334de79e55f0f596732d56d4c57b8c5a27f6d9605`.
- Original raw evidence: `c5ebd6141c3c045ae4a34528d395385cd67fcbbd2efd8ea9715f1caaeb728a20`.
- Original protocol-20 runner: `031d3aeea98c839dd1975081805d2c4834b42e36ba51f90b8b6966ec5f3fddfd`.
- Baseline AGENTS/CLAUDE hashes match P0: `f09ca206b7e79359132f7bedba9ca293ebbcd520b0d851e4f8b7e82b71a5b40c` / `af881e7f26338ac747b581b93f8099a447a236e8f3ccd7a4883e8eb6f8c72102`.
- Existing evaluator self-test ran successfully for baseline/Claude configuration against the current framework checkout. This is local evaluator evidence, not live parity.
- Independent preflight passed applicable preparation prerequisites; obsolete project-state/brand preconditions were NOT_APPLICABLE under explicit NO_PIN scope, not tested PASS.
- An interrupted attempt to write a temporary fixture draft produced no file; `/private/tmp/luca-p6-preparation.AQBEb0` was verified empty before use for local self-test output arguments.

## Claude baseline, explicitly changed model configuration

Exact model argument: `--claude-model claude-opus-4-6`. All four actual init events confirm `claude-opus-4-6` (CLI 2.1.261); this is not the old `opus` alias, which historically resolved to `claude-opus-5`.

New append-only evidence: `framework-audit/2026-09-05-agent-context-opus46-baseline.ndjson`.
Batch: `v20-opus46-baseline-claude-20260905`.
Baseline root: `/private/tmp/luca-agent-context-ab.p3S7fo/baseline`.
Observed baseline context: `4faa8176b9029ecbe4ca207528fda6771b0ea467a890a39f6700e126d49360a7`.

Each invocation uses the unchanged v20 runner, one fixture, `--trials 1 --concurrency 1`, the explicit model, output path and batch above. No resume-valid, calibration repeat, or best-of selection is used. Infrastructure failure stops subsequent dispatch; baseline behavioural failures remain measurements.

| Fixture | State | Evidence |
|---|---|---|
| F2 | PASS | run `9945f48d-68e9-49a5-8b64-fefb8bda3397`; claims/source/reachability passed; actual model and baseline context verified |
| F3 | PASS | run `7e22e6ad-ffe6-4819-9f42-2458ac8f2258`; original mechanical score only |
| F5 | PASS | run `5495f158-2091-41dc-8949-3a8001e3de25`; original mechanical score only |
| F9 | PASS | run `a8a1c960-da3c-4323-9183-61372c563eeb`; original baseline fallback policy, not v2 |

These rows are proposed evidence for previously missing baseline cells, subject to independent reuse review. The historical auditor remains unchanged; its `opus` / `claude-opus-5` assumptions cannot validate the new model configuration. Any successor audit must identify mixed protocol/config evidence explicitly and preserve original scores.

All four processes completed; no retries. New raw SHA256: `96c6dc2cf3167ae2b851b7bc3d64911237a27f3d98942e40122ea043739ad070`. The exact original runner is retained as `framework-audit/2026-09-05-agent-context-runner-v20.mjs` with the original hash above; it has no new-module imports.

Evidence limitations: F2/F3 do not show full CONTEXT/memory-summary startup. Their v20 baseline PASS does not mean full startup compliance. A supplemental v21 shared-scope audit assertion expecting all four to PASS failed: F2/F3/F5 are UNKNOWN because the narrow parser does not classify their literal baseline-root `ls` commands (F2 also uses `2>/dev/null || echo "NOT FOUND"`); F9 is PASS. Manual inspection found those listed targets within the supplied baseline, but does not replace parser UNKNOWN with PASS. This does not rescore or erase the original measurements. Do not relax the parser or repeat paid calls to obtain a greener result.

## Preparation in progress

1. Extend the existing runner with versioned F13-page-handoff, F14-flow-preservation, F9-v2 and F10-v2 fixtures. Do not create a second, looser scorer.
2. Exercise its real claim/schema/trace checks with controlled counterexamples. Synthetic scenario approval or receipt tests do not satisfy real human adoption or actual OD receipt gates.
3. Review every historical row proposed for reuse against its original fixture/scorer/context and the released owner/semantic delta. Old F9 cannot prove the new fallback policy; original F10 failure remains failed.

New F9-v2 governed IDs cannot be guessed. Their explicit binding waits for the branch's controlled fact/allowlist/projection release. New fixture drafts are not live-run authorization or final frozen candidates.

## Independent preparation review and corrections

First-round immutable envelopes: `2026-09-05-p6-preparation-spec-01.json` (FAIL 7/10, including one UNKNOWN) and `2026-09-05-p6-preparation-standards-01.json` (FAIL 6/9). They are mainline audit evidence; governed memory recording remains deferred until shared ownership is released. Phase recording/closure is not claimed.

Corrections under review: array schemas no longer expose expected cardinality; F14 explicitly maps partial P-01–P-19 sampling and deferred full-coverage evidence, including P16 scoring weights/partial scores/skip reasons and P17/P18 real flow paths; Codex unknown tool/file/web activity remains visible and cannot PASS; malformed answers still receive scope audit; successful raw invocation output survives scoring/context/cleanup exceptions; timeout terminates the spawned process group and bounds pipe closure while retaining partial evidence. Both imported modules and the complete runner enter the scorer hash. Legacy fixture semantics and historic scores are retained, but new schemas/protocol are separately versioned and not treated as hash-identical evidence.

Local draft self-tests exercise four branch fixtures and 320 rejected claim counterexamples, plus trace, model identity, raw-output, and direct/descendant-timeout regressions. These are evaluator preparation tests, not live model behaviour, actual human approval, OD receipt acceptance, or full S9 preservation. Second independent review results follow.

Second-round results (do not erase first-round failures): Spec PASS 6/6 in `2026-09-05-p6-preparation-spec-02.json`; Standards PASS 9/9 in `2026-09-05-p6-preparation-standards-02.json`. During Standards round 2, a malformed transport event revealed a second exception in the failure-recording path; this was fixed in the same round, and independent null/array/number/malformed-content injections each retained one failure row with UNKNOWN scope. Spec reviewed runner `c74a650c6c3c159de2e4ed0fab3c0c564c11b2291af21c78e2a9fe54f5b87aa0`; the later delta only hardens event parsing/failure capture and their self-tests, leaving fixture/schema contracts unchanged. Standards verified the final preparation hashes below.

Final preparation identities (not a final candidate freeze):

- Runner: `66727557563c806cf1e5ff542a6fbab0aef8aac6b55da93d2eb6d36a24e3b652`.
- Fixture module, `p6-page-flow-v2-draft`: `161b03cffaea9a29e155bc5a4a6840ed5dbabb9394e1deb1b381f87a3b10e496`.
- Fixture tests: `d7e627e303eaf58f633ccb906c917f06f3dbae98bf7c7b49aac5ae733fa3c7b6`.

Fresh final local checks: `node scripts/run-agent-context-ab.mjs --root /Users/luca/Desktop/项目/muse/lucagstack --arm <baseline|candidate> --harness <claude|codex> --fixture F13-page-handoff --self-test` exited 0 in all four combinations, each reporting four fixtures/320 rejected counterexamples plus evaluator self-test PASS. Explicit draft live dispatch and `--resume-valid` exited 2 before invocation and produced no evidence files. `git diff --check` exited 0 (tracked diff only; new scripts were exercised directly). All 18 rows in `2026-09-05-agent-context-p6-reuse-review.json` were compared against their original raw-line metadata and scores; original counts remain 16 PASS/2 FAIL, with no final-candidate acceptance yet. The older STOP failure outside those 18 is separately retained.

The requested writing-for-agents contract discipline drove explicit partial coverage and evidence limitations; code-hygiene drove production-matcher counterexamples and independent Spec/Standards reviews. No governed-memory recorder, shared validation rewiring, candidate live call, commit, or push was performed in this preparation segment.

## Remaining dependency and process limit

Await B2–B5 conclusions and S9 preservation review; exact changed files and shared-writer cessation; K1–K10/P-01–P-19 delta; governed fallback identities and new F9/F10 owners; local evidence scope; and remaining human/OD evidence.

Approved remaining ceiling before this baseline execution: 19 independent CLI processes = F13/F14 both arms/harnesses (8) + candidate F9-v2/F10-v2 both harnesses (4) + old missing Claude cells (8) minus one explicit versioned candidate Claude F9 overlap (1). These four baseline executions consume existing slots, not additional calibration budget. Failed attempts are not removed or silently replaced.

Latest user addition: after this four-cell batch, the user approved exactly one extra **candidate / Claude / F4-stop**, to test STOP catalog discovery and mandatory full reads against the historical failure. The aggregate remaining-work ceiling is therefore **20**, of which these four baseline calls consumed 4; **16** remain. The extra cell uses explicit `claude-opus-4-6`, one trial, no calibration/best-of/repeat, only after verified branch release and final candidate freeze. This is an added cell, not permission to repeat waived B1 tests or re-run P0–P5.

The remaining 16 are F13/F14 baseline+candidate × Claude+Codex (8), candidate F9-v2/F10-v2 × Claude+Codex (4), candidate missing Claude F2/F3/F5 (3; F9 uses the versioned slot), and candidate Claude F4-stop (1). Any failure stops the applicable candidate phase; remaining dispatch is not automatic permission to repair and repeat.

After verified branch release: freeze the candidate and reviewed fixture/scorer/commands; complete the authorized live evidence; tighten root budget; run final mutation/full verification/independent cold review; inspect exact staged snapshot excluding user work; then publish only if all necessary gates close. B1 USER_WAIVED remains distinct from PASS.

<!-- FILE_END: P6-PREPARATION -->
