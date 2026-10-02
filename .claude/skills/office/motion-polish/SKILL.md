---
name: motion-polish
preamble-tier: 1
version: 1.0.0
description: |
  Motion Polish inspects and improves motion and microinteractions in selected existing HTML,
  preserving confirmed product behavior and explicit KEEP, then returns an exact candidate for independent acceptance.
  New UI generation remains with the selected design tool; animation explanations and code review use their own owners.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
context-cost:
  self: 8587
  runtime-estimate: 6500
metadata:
  recommended-model: core-execution
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py motion-polish "*" 2>/dev/null || true
```

Before project reads/writes, caller verifies project-session and freezes its canonical binding as
`_PROJECT_ROOT`. NO_PIN inspection uses exact user-authorized files and leaves that variable unset.
This is one executor: caller owns independent QG dispatch, model selection and OD/workflow resumption.

## 1. Bind actual HTML, expectations and effects

Read `.claude/skill-os/runtime/prototype-delivery.md` through EOF before candidate/delivery decisions.
Consume this skill's selected input-mode view under workflow-mode; missing views use its controlled
fallback. Bind exact entry and explicitly allowed asset closure, true product source/versions or
verified user-message expectations, requested motion scope, explicit KEEP/profile, actual technical
environment and current read/effect authority. HTML is implementation evidence, not invented demand.

Standalone requires actual HTML and motion scope. A formal DB is optional; preserve actual user
expectations without inventing D/R/AE. Workflow adds actual source handoff. Internal calls require
caller, condition evidence, inherited authority and effect intersection; when called inside approved
OD pre-completion, exact mechanically recovered raw/receipt and all source expectations are sufficient.
Neither raw semantic PASS nor a future Phase 6 OD DONE handoff is an input prerequisite. Prior raw
FAIL stays FAIL; only already authorized same-phase motion/technical gaps may be repaired.

Inspect can run with exact read/run scope. Production copying/enhancement additionally requires a
verified active project, canonical exact `docs/prototype/YYYY-MM-DD-topic` delivery root and actual
copy/edit/metadata/browser effects. Missing scope means BLOCKED for delivery, while read-only findings
remain possible. Stage/run/recover or a manifest field does not grant local edits. Keep original-copy
and explicit KEEP restrictions; new business results, unclear cancel side effects or human design
choices return their source/authority owner. Do not infer a pin from aliases or migrate an external
original. Framework exercises use explicitly scoped isolated fixtures and claim no production pin.

Complete when exact input/source/version/scope/runtime are bound, or report the specific missing
context/effect. Browser capability missing for a required dynamic goal is NEEDS_CONTEXT.

## 2. Observe and freeze required behavior

Read `../references/motion/implementation.md` through EOF before actual implementation. If product
feedback purpose/frequency/result is unresolved, read `../references/motion/intent.md`; only ambiguous
vocabulary triggers `vocabulary.md`. Already confirmed facts carry forward without a repeat interview.
Movement during interruption/reverse/gesture triggers `continuous-motion.md` before that implementation;
real tooltip/timer/pointer or mobile/viewport symptoms trigger their component/mobile case reference.
These method reads add no style/DS/library/time lock and do not load all seven by default.

Drive the actual entry: record input, start, DOM/logical response, presentation samples, terminal state
and recovery. Freeze complete original AC/STATE, dynamic expectations, observed gaps and KEEP as unique
required behavior IDs before final tests. Include reverse/repeat/cancel, reduced-motion and relevant
keyboard/focus. Justified absent gestures may be N/A; an explicit dynamic goal cannot be generic N/A.
Compare risk inferred from source separately from reproduced failure. Sufficient originals proceed
to actual final acceptance; an unmet goal proceeds to authorized implementation, not only suggestions.

Complete when every gap maps to source result, real operation/node, edit boundary and observable test.

## 3. Produce exact branch and evidence

Use the delivery owner's six APIs and adjacent schema; actual current caller context stays separate
from candidate metadata. Select adequate-original, adequate-copy or enhanced-copy from actual observed
sufficiency and output scope. Allocate a unique attempt exclusively; copy full approved closure under
content with original entry filename and relative topology. Metadata remains at attempt root so same
named source spec/QA assets survive. Preserve raw/spec/OD recovery bytes and provenance.

For enhanced-copy, implement the smallest authorized CSS/JS/WAAPI/lifecycle change, maintain logical
results independently of presentation, and resume reverse/interruption from current presentation.
Preserve canceled/repeat outcomes, resource cleanup and reduced-motion usability. Reuse applicable
actual tokens; tune parameters against source behavior rather than universal thresholds or taste.
Record exact changed-file patch before/after hashes and spec from actual final code/parameters/actions.
Unsupported dependencies, incomplete closure or unpreservable URL/CSP behavior block copy delivery.

Run same scope actions on raw and final. Evidence binds final hash and actual DOM/time trace; screenshots
prove visible endpoints only. A fixture driver may be reused only where its selectors/actions/source
fit this actual candidate; adapt a scoped driver for other artifacts. Do not use an unknown generic QA
mode. Important guards need an isolated same-case bad mutation turning RED and restored GREEN.
Local driver evidence is self-check; it is not an independent semantic verdict.

Complete when actual in-scope gaps are resolved, complete source/KEEP remains, patch/spec match bytes,
and required current-final runtime evidence exists. Freeze with `checkCandidate` before review.

## 4. Return candidate, then resume only with genuine independent acceptance

Return exact `candidate_ref`, final entry/spec hashes, complete source/required IDs and driver evidence
in existing outputs to caller. Caller runs independent PREACCEPT QG against current candidate and all
original product/motion expectations, loading `../references/motion/review.md` before review. No old
accepted lookup, raw-DONE prerequisite or executor self-review can replace that gate.

Required FAIL/UNKNOWN returns repair/context, preserving the old report and allocating a new attempt.
After caller verifies real reviewer provenance and returns an unchanged independent PASS report, use
`sealAccepted`, then `resolveFinal` on exact certificate ref. Missing independent vote prevents final
delivery DONE. Helper only validates integrity; a provenance string/JSON field cannot authenticate QG.

Internal OD child returns certificate in existing outputs and lets parent resume Phase 5/6 once with
dual raw/postprocess provenance. It does not write a premature second handoff or workflow state.
Standalone writes ordinary `docs/handoff/YYYY-MM-DD-<topic>-motion-polish-handoff.md`, respecting P2-V
and `../references/handoff-protocol.md`; include `final_artifact_ref{path,sha256}`, final/spec, raw/source,
gate_result, 3–7 criteria, decisions/constraints/risks and actual runtime evidence. Run
`node scripts/check-quality-gates.mjs --handoff <exact authorized absolute handoff>` before DONE.
NO_PIN maintenance returns framework evidence only and writes no project handoff/state.

Completion requires all selected quality gates: base_html_bound, scope_and_authority_bound,
product_facts_preserved, motion_gap_resolved, runtime_evidence_for_final_html, single_final_artifact,
caller_resumed. Report shared DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT accurately; optional device
UNKNOWN limits only that claim, while required UNKNOWN prevents final acceptance. Downstream TS/TP/
compile consume the same exact certificate and revalidate drift under the delivery owner.

<!-- FILE_END: motion-polish/SKILL.md -->
