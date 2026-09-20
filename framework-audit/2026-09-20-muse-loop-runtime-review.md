# Muse Loop retirement — independent runtime closure

Date: 2026-09-20. Reviewer: independent `final_runtime_review`, default REFUTE. Scope: NO_PIN.
Verdict: **PASS for the task-only runtime FILE_SET**. No surviving Critical/Important/Minor defect attributable to this change was found. Completion: DONE_WITH_CONCERNS because the existing Project Gate boundary and live-session limitations below must remain explicit.

## Baseline and scope

Compared working files against `/private/tmp/muse-loop-retirement.GUKnA2/baseline/`, the supplied pre-change dirty snapshot, not against clean HEAD. HEAD observed: `77a99dde974508b9026d57055510c309ab6c99d6`. Requirements: `framework-audit/2026-09-20-muse-loop-retirement-plan.md`, including R-1/R-2. No production conversation or previous review report was read.

Reviewed:

- `.claude/hooks/route-guard.mjs`
- `.claude/skills/office/html-prototype/scripts/verify-prototype.mjs`
- `scripts/build-agent-context.py`, `scripts/check-agent-context.mjs`, `scripts/test-agent-context.mjs`
- `scripts/test-muse-loop-retirement.mjs` (new), `scripts/test-design-tool-retirement.mjs`, `scripts/test-route-guard.mjs`, `scripts/test-hooks.mjs`
- `scripts/check-routing-map.mjs`, `scripts/check-skill-scene-coverage.py`, `scripts/check-codex-viability.mjs`
- `scripts/test-controlled-change.mjs`: later-added closure scope, only the registered hooks byte-pin refresh and its WHY comment.
- `.claude/settings.json`, `.codex/hooks.json`
- `package.json`: only `check:muse-loop-sync` → `test:loop-retirement`; `scripts/verify.sh`: only S17 replacement.

The concurrent `test:page-context --mutation` package hunk is outside this review and was not attributed to retirement. Test dependencies were exercised by their existing suites; unrelated concurrent implementations were not reviewed. This reviewer changed no production file, global configuration, project alias, or project data; only this report was authored. Test fixtures were temporary.

## Standards

PASS. The route diff adds exact retired-name refusal and a bare-name complexity bypass only for the two retired names. It does not remove generic HEAVY/env support, Project Gate ordering, or fail-open handling. `.claude/settings.json` removes only the Loop env key; the six `.codex/hooks.json` command deltas remove only its inline env assignment. Their wrapper exit behavior is unchanged.

QA changes are limited to explicit retired-mode exit 2 and removal of that mode's two exemptions. The five surviving modes and unknown-mode compatibility remain. Generator/checker changes retain the five-key tombstone contract, allow only null or active replacements, and retain SC while adding RET IDs. No unrelated cleanup or dependency addition was found in the scoped deltas.

## Spec

PASS within this runtime partition:

1. **A1 / U-003:** exact slash, dollar, and bare retired names, both cases, simple and complex suffixes, produce STOP/`retired_skill`, empty candidates, and no project selection when the only project-like token is the retired name. Injecting a retired name through HEAVY does not revive it. The real Codex adapter preserves the RETIRED hint.
2. **A2 / C3:** surviving direct routes are retained; generic injected HEAVY still produces PLAN_CHECK; malformed JSON still exits 0. Fresh route suite: 243 pass, 0 fail. Hook and adapter suites also pass.
3. **U-003 QA:** retired mode returns exit 2 before creating QA results. Normal modes plus unknown legacy mode retain selection/static checks. Missing spec and state markers remain failures. Browser QA is expressly not established by this fixture.
4. **R-2:** real catalog generator accepts null+RET and legacy named-replacement+SC; rejects empty/string `none`/unknown/retired/list/object replacements, malformed IDs and active retirement; restores to identical good output. The mirrored checker independently rejects all four newly added bad metadata fixtures. Existing figma-layer metadata/output is protected by `test:design-tool-retirement`.
5. **A4 / A6:** registry and alias absence checks pass, including dangling-symlink detection. The three retirement mutations alter actual copied route/QA/registry implementations, observe the expected specific failure, restore, and pass again; they are not merely fake failure strings.

## Fresh execution evidence

All commands below were run by this reviewer on the final files, not accepted from implementation self-report. All exited 0.

| Command | Observed result |
|---|---|
| `npm run test:loop-retirement` | Runtime routes/adapter/QA/registry checks; generator positive/negative cases; three actual fail→restore mutations passed |
| `npm run check:agent-context` | Generated context current; K=10, pointers=16, catalog=43, fallback=6 |
| `npm run test:agent-context` | 49/49 mutations plus projection/rollback/staged-index checks passed |
| `npm run test:routes` | PASS=243, FAIL=0 |
| `npm run check:routing-map` | Routing coverage and SSOT consistency passed |
| `npm run check:hooks` | Hook/memory regression passed; Codex adapter PASS=23/FAIL=0; auto-open 8/8; read-grant quarantine skips explicitly reported |
| `npm run test:design-tool-retirement` | Retained gates and original figma-layer guard mutation passed |
| `python3 scripts/check-skill-scene-coverage.py --selftest` | PASS |
| `node scripts/check-codex-viability.mjs` | PASS=43, FAIL=0, 41 skills |
| `npm run test:controlled-change` | All 11 scenarios passed, including adapter runtime/outside-cwd fail-closed and inactive fail-open |
| `git diff --check -- <scoped production/test files>` | No whitespace errors |

## Observed boundaries and unknowns

- **Existing, non-regression Project Gate boundary:** with `ROUTE_GUARD_PROJECTS=muse,fixture-project` and no current project, `muse loop`, `muse自进化循环`, and `跑一下muse loop` produce PROJECT_SWITCH→muse both before and after. `需求到原型闭环` changes from Loop dispatch to STOP/no_keyword_match. Likewise an explicit retired call followed by a separately named project is intercepted by Project Gate before retirement refusal. This does not make the removed skill dispatchable; do not claim every old natural phrase uniformly emits RETIRED, or that all such phrases produce no project hint. Changing the general Project Gate solely to eliminate this pre-existing behavior would exceed this preservation-focused review. `scripts/test-muse-loop-retirement.mjs:56` correctly tests only non-dispatch for those natural phrases.
- **Live session / trust:** real child-process Claude hook and Codex adapter behavior was exercised, not fresh native loader UI sessions. Existing in-memory skill/tool declarations cannot be revoked by filesystem deletion. This reviewer read the scoped `trust-receipt.json` (six expected repository keys, PASS, five third-party entries preserved, other configuration unchanged), but did not independently query current global trusted-hash configuration. The receipt supports the authorized byte-pin update; this review is not a new live global-trust attestation.
- **Scope of assurance:** no browser rendering assurance, no full `npm run verify` claim, and no independent certification of triage/judge prose migration or unrelated concurrent files. Those belong to the other final integration/review partitions.

## Closure fingerprints

Re-review affected behavior if these task-owned runtime files change after this report:

| File | SHA-256 |
|---|---|
| `.claude/hooks/route-guard.mjs` | `c1059864b3bf7f63494c7b10a97e40cf12ec3559bc01d399ad3406254cbd3376` |
| `.claude/skills/office/html-prototype/scripts/verify-prototype.mjs` | `90673aac93b2b080ff3e23cb6cfb75a0854fd6db28fd9753bc33b2f6c5adbe3c` |
| `scripts/build-agent-context.py` | `8d9f2580c2265a1d8f9235857927e62d835d65b9db57a446dd267104a18b2d8a` |
| `scripts/check-agent-context.mjs` | `2b6e0fcf0514adc3780348f5665b47b1f33c363ffc292afe94accb297d9bda62` |
| `scripts/test-agent-context.mjs` | `6dc063af2665e5ca63fa99a149d52556c7d9dac724160a244ad33086bc387e83` |
| `scripts/test-muse-loop-retirement.mjs` | `3fc734ed876ca4d963ff12c7cf82eb92773dd29d7a2fa0e772746d2dc16e4726` |
| `.claude/settings.json` | `3bbdb60d773a99c2125213b69abe8635f9f882b0b3d5fff716f6f6d3ec3ba4d3` |
| `.codex/hooks.json` | `fa3fee9845f4a5e00b2dd5f682474fc8cc33ad48658b89839aaf9cd28a4eec8c` |
| `scripts/test-controlled-change.mjs` | `cc3c690c244fe4b2f1ef0481b4a2485ba723a6d5399a061e48e9414475a2bf29` |

### Supplemental S41 byte-pin closure

Independent comparison with the same dirty snapshot shows `scripts/test-controlled-change.mjs:206` changes only the expected `.codex/hooks.json` SHA and adds its authorization rationale. A fresh byte assertion established that removing exactly six occurrences of `ROUTE_GUARD_HEAVY_SKILLS=muse-loop-orchestrate ` from baseline hooks yields the current file byte-for-byte. Both old `be573208…` and new `fa3fee98…` hard pins match their actual files. The pin remains an equality assertion; wrapper semantic checks and fail-closed injections are unchanged. Fresh full controlled-change suite passed all 11 scenarios. This supplemental delta is PASS, with no production controlled-change change reviewed or required.

## Axis summary

Standards: 0 findings, PASS. Spec/runtime: 0 attributable defects, PASS with the explicit boundaries above. The retirement does not merely silence the old checker: replacement tests run the real behavior and demonstrably detect resurrected entry points. No shared safeguard deletion was needed to obtain these results.
