# Engineering environment retrospective

Only for `code-hygiene entry_mode=environment-retro`: improve the coding agent's environment from
actual session evidence. Product design retrospectives remain with `retro`. This is a proposal path,
not permission to edit Hook, checker, global instructions, memory or third-party access.

## Inputs and primary evidence

Bind the original U-ID/scope/resume_target, actual requested session and authorized transcript/log
paths. If unspecified, use the current session's real primary log only when readable and in scope.
Read the applicable writing-for-agents style contract as a reference, not as an extra session.
Use timestamped tool calls, outputs, errors and corrections as primary evidence. Missing logs mean
NEEDS_CONTEXT or an explicitly limited report; don't infer the cause from a handoff or self-report.
Do not expand into other private sessions or dump secrets from log payloads.

## Inspect existing enforcement before proposing more

Read the actual package/build lint/check/typecheck/test scripts and relevant CI/pre-commit wiring.
Trace the checker command to its implementation and actual invocation/exit evidence when authorized.
An existing checker that is unwired or broken is the finding, not a reason to reinvent it. A repo
with no pre-commit/CI lint/typecheck/test guardrail has a real gap; prove absence within read scope,
don't assume it. Dependencies, execution or writes outside permission stay a proposal.

## Seven lenses (each evidence or explicitly no finding)

| Lens | Evidence to inspect | Improvement ownership |
|---|---|---|
| Navigation | Long searches, missed one-hop owners, hidden cross-file dependencies | A small navigation pointer to the actual existing owner |
| Automated checks | Observed repeatable failure, actual checker/script/CI wiring and silent exits | Repair existing wiring first; cheapest deterministic checker for a real mechanical gap |
| Coding standards | Reviewer missed a breach; classify fixed syntax/API/import/location versus judgement | Mechanical → deterministic check; judgement-only → review rule with evidence |
| Global/repo AGENTS pointers | Large always-loaded steering text, rules owned elsewhere | Sparse pointers; move domain enforcement to its real standards/checker owner |
| Tool economy | Expensive calls or repeated full payloads with actual tool/output costs | Narrow queries, context pointers or cheaper actual tooling proposal |
| No-ops | Steering instructions with no observed behavior effect | Explain evidence and uncertainty before proposing removal; size alone is no proof |
| Information access | A crucial missing dev log/read-only source in the real session | Propose scoped read access or log tee; never grant new remote permissions automatically |

Implementation context is pressured by exploration/debugging; review receives a fixed diff and can
enforce judgement standards. Keep reviewer rules in the review owner. Use existing docs before new
ones; if standards exceed 1,000 lines, suggest navigation pointers rather than growing root adapters.
Mechanical violations must get deterministic enforcement, not just another prose ban.

## Output and gate

Present candidates in severity order (Critical / Important / Minor), each with category, observed
symptom, actual log path+line/timestamp, cause evidence or UNKNOWN, current enforcement, smallest
proposal, owner, validation command/negative case and exact requested scope. Distinguish verified
facts from inference. State missing evidence/access instead of filling gaps. No automatic memory,
Hook, standards, config or installation edit; real approval for those concrete changes is a later
gate. Return to the original U-ID; no new workflow state or ticket sending.

Source23 retro, Matt Pocock, MIT, pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.
<!-- FILE_END: code-hygiene/references/environment-retro.md -->
