# Plan: adopt the output-neutral value of the retired html-prototype, and a light agent-offered competitor comparison

- plan_id: PLAN-20261021-ADOPT-HTMLPROTO-VALUE
- path: framework-audit/plans/2026-10-21-adopt-html-prototype-value-plan.md
- plan_sha256: recorded in the commit message (a file cannot hold its own hash)
- scope: NO_PIN framework work in this checkout; no project read/written; `framework/` untouched
- orchestration: Sequential, Supervisor (two-sided cold review before execution; cold review after)

## Approval record (K3)

The user asked for: first-principles evaluation of what is worth adopting from the retired html-prototype and where the motion spec landed, an overall conclusion and a best plan that survives expert panel + two-sided steel-manning, then execution, verification, commit, push and pull back. After the options were shown, the user bound the scope with: (1) "采纳不能影响我的 OD 或者 CD 的 UI 输出；动效只是采纳的规范" , (2) competitor analysis must be light — "不想要 ux research 这么重", the agent asks whether to do it and proposes candidate objects from the requirement, the user may supply objects, and then "继续" / "开始". Effects authorized: edit/create the listed files in this repo; `git add` explicit files; commit; fast-forward push to origin/main; pull back. Not authorized: `~/.codex/**`, `framework/`, `framework-audit/**` historical snapshots, other sessions' work.

## Premise (binding)

Nothing adopted may change what open-design / claude-design generate: no Packet/TAC fields, no generation-time constraints or banned-pattern lists injected into generation, no automatic rework triggered by acceptance. Allowed: reference documents the user may adopt through the existing Brief confirmation; post-hoc description of the produced HTML; acceptance-side reporting.

## Block 0 — premise gate

1. Should this be solved: partly. Verified inventory of the retired skill (5 references + 10 phases): motion spec is already covered by `references/dev-handoff-dimensions.md` item 4 + `references/motion/*` (post-hoc, output-neutral, stronger than the old six-dimension table); most other assets either shape generation (excluded by the premise) or are covered by a current owner. Two real defects were found while evaluating: the acceptance script's default mode demands html-prototype artefacts (false FAIL on OD/CD output, writes reports into the delivery directory) and the acceptance-side slop wording could force rework.
2. Smaller alternative: fix only the two defects (K1+K2) and skip the competitor feature. Both cold reviewers ranked K1 >= K2 >> K3. K3 is kept because the user explicitly asked for it, but as a thin, opt-in, capped reference with a pre-registered stop condition.
3. Default-form bias: the default product here is "adopt more", which tilts toward adding. Counter-weight: both reviewers were told to refute (A: refute adoption, B: refute timidity), the NOT-adopted list is explicit, and K3 carries a measurable stop condition.
- KILL-1: if a change turns out to alter OD/CD generation input or trigger regeneration, stop and revert it.
- KILL-2: if K3 cannot be expressed without a second competitor-method owner or a new mode/gate, drop it to a one-line guidance row.

## Review results (cold, serial; reports kept outside the repo during the session)

Side A (refute adoption) and side B (refute timidity/misplacement) found, and this plan adopts: `--mode=external` was silently ignored by the CLI (needs `resolveMode` + allowed-mode entry + a test that only passes in external); a 5th html-prototype-only false FAIL ("Prototype spec exists"); Brief D-IDs must be ignored in external; reports must not be written into the delivery directory; CDN/emoji must be report-only in external (a design tool's chosen fonts/content must not drive rework); `skill-invariants.md` clause and `test-muse-loop-retirement.mjs:190` pinned the old forced-rework wording; the brainstorm pointer belongs in its existing "Optional additional research" block, not Phase 0; "user gave objects" needs three states; consent/decline must be recorded in the existing source index; the executor has no browser so the output is document-level precedent; the motion lens was dropped; `decision_changed` is judged by the user or by a Brief citation and a stop condition is pre-registered; the frontlight test must be wired into verify.sh. Not adopted from A: folding the light tier into ux-research's method file (the user explicitly does not want that path).

Implementation review (cold, after execution): PASS_WITH_FIXES, no BLOCKER. Real runs confirmed C1/C2 (external passes a plain OD-style page and still fails Lorem / empty / console-error pages; its failing set is a subset of the default mode's on 5 page-library pages; the delivery directory stays untouched). Its MAJOR finding — the new tests protected only 3 of 21 semantic breakages of competitor-scan.md — was fixed: F12 now asserts each user-named constraint and 19 mutations turn it red. Also fixed: candidates 2–3 to match the ≤3-object budget, no "budget tier" wording, a measurable log for the stop condition (`docs/research/competitor-scan-log.md`), a record line for declined offers, `--out-dir` so a judge can find qa-results.json, the claude-design handoff pointer writes a separate file (raw spec/SHA preserved), the guidance sentence that this one-time user-requested offer is not a routing questionnaire, and the invariants clause now names the removed "N ≥ 3 必须返工" rule. Known and left: the existing "non-empty rendered text > ~200 chars" threshold (pre-existing, not introduced here) can still fail very small pages in external mode.

## Items

- K1 `design-output/scripts/verify-prototype.mjs` (+ test): `resolveMode`/`ALLOWED_MODES`, `external` mode: html-prototype-only checks N/A, CDN/emoji WARN, Lorem/empty/console/3-viewport stay FAIL, reports to a temp dir (or `--out-dir`), not stricter than default.
- K2 `design-output/SKILL.md`: run with `--mode=external`; slop table used for a report only, the user decides, no regeneration, not counted in the two rounds; co-edits: `skill-invariants.md` (clause revised — a protection clause, flagged to the user), `test-muse-loop-retirement.mjs`, `design-brief/SCHEMA.md` (one sentence), `muse-proto-judge.md` (external).
- K3 `references/competitor-scan.md` (thin profile), pointers in design-brief Phase 0 and brainstorm's Optional additional research block, one guidance row + disambiguation (hash pin updated), one boundary line in `ux-research/references/competitor-analysis.md`, claude-design post-hoc handoff pointer (output-neutral, mirrors open-design).
- K4 tests: `test-verify-prototype.mjs` (+16 static assertions, mutation-checked), `test-design-output-retirement.mjs` (output-neutrality + mutation), `test-design-workflow-frontlight.mjs` (F12/F13 + 8 mutations) wired into verify.sh as S14k.
- K5 CHANGELOG.

## Not adopted (reason class)

numeric motion defaults and the motion usage-plan declaration (shape generation); state-switch harness requirement; generator-side banned lists; 24/30 aesthetic self-score; Step 0 cognitive gate; skeleton confirm; mandatory dynamic-query triggers; hard-coded candidate pool; logic-validation purpose; 2–5 UI variants; standalone-brief; multi-round protocol.

## Assertions

```bash
# [BLOCKING] B1 — external mode accepts a plain design-tool page and still fails real defects
if ( set -o pipefail; node .claude/skills/office/design-output/scripts/test-verify-prototype.mjs ); then echo "PASS B1"; else check_rc=$?; echo "FAIL B1"; exit "${check_rc:-1}"; fi

# [BLOCKING] B2 — output-neutrality text and retirement contract hold (with mutation)
if ( set -o pipefail; node scripts/test-design-output-retirement.mjs --mutation && node scripts/test-muse-loop-retirement.mjs ); then echo "PASS B2"; else check_rc=$?; echo "FAIL B2"; exit "${check_rc:-1}"; fi

# [BLOCKING] B3 — competitor-scan contract and landing (with mutation)
if ( set -o pipefail; node scripts/test-design-workflow-frontlight.mjs --mutation ); then echo "PASS B3"; else check_rc=$?; echo "FAIL B3"; exit "${check_rc:-1}"; fi

# [BLOCKING] B4 — generated context, pins and full verify
if ( set -o pipefail; python3 scripts/build-agent-context.py check && node scripts/check-agent-context.mjs && bash scripts/verify.sh ); then echo "PASS B4"; else check_rc=$?; echo "FAIL B4"; exit "${check_rc:-1}"; fi

# [BLOCKING] B5 — no generation-input owner changed
if ( set -o pipefail; ! git diff --name-only HEAD | grep -E "output-templates|open-design/SKILL|scripts/design-output-selection|prototype-delivery|page-library|input-contract" ); then echo "PASS B5"; else check_rc=$?; echo "FAIL B5"; exit "${check_rc:-1}"; fi
```

criteria (cold reviewer, binary, evidence required):
- [C1] No change alters open-design / claude-design generation input or triggers regeneration.
- [C2] `external` is never stricter than the default mode on the same input.
- [C3] competitor-scan.md has exactly one owner role, points instead of restating, and adds no mode/gate/field.
- [C4] Every new assertion has a mutation that turns it red.
- [C5] The protection-clause revision in skill-invariants.md is disclosed to the user.

## Failure policy

BLOCKING failure stops the phase; three repeats of the same failure → BLOCKED with evidence. A reviewer BLOCKER surviving one repair round → stop and report.
