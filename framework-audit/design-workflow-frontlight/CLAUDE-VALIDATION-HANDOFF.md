# Frontlight: Core Delivery, Full Validation Deferred

The user explicitly requested core verification, commit/push, and synchronization
of the primary checkout. Claude will perform overall validation afterward.
This delivery does not claim that the original end-to-end experiment passed.

## Implemented Scope

- `deepresearch` and `ux-research`: explicit focused mode, bounded evidence work,
  source/choice provenance, independent examination, and complete critical risks.
- `brainstorm` and `ux-brainstorm`: scope and discovery effort remain separate;
  actual question/option counts, inherited decisions, and non-AI applicability
  replace inappropriate fixed quotas. Real human choices and Oracle gates remain.
- Direct PRD, proposal, interaction-architecture, pressure-test and review templates
  now apply the same rules at their actual consumer points.
- Brief keeps all eight decision fields. Sourced inherited decisions with no new
  substantive choice may use an explained alternatives N/A, never fake rejections.
- Quality checks require applicable transitions and recovery, not state keywords.
  Three risk-summary entries never authorize dropping a fourth critical risk.

The earlier focused implementation is already in repository history; this change
completes demonstrated consumer conflicts rather than replacing the entire chain.
Focused stays explicit opt-in. Legacy deep/moderate/full defaults remain.

## Core Checks

Run from the repository root:

```bash
node scripts/test-design-workflow-frontlight.mjs --mutation
python3 framework-audit/design-workflow-frontlight/test_focused_handoff.py
node scripts/test-handoff-validator.mjs
node scripts/test-design-workflow-contract.mjs
node scripts/test-design-tool-routing.mjs
python3 scripts/build-agent-context.py check
git diff --check
```

The focused suite contains 26 source checks and 12 in-memory guard-removal tests;
the parser suite has six cases. These are contract/parser tests, not UI outcomes.
The committed replay fixture separates subjects from grader expectations.

The user explicitly assigned overall validation to Claude. The automatic full
pre-commit health suite was stopped after its completed checks; it is not a PASS.
This delivery uses process-local FAST_COMMIT=1 with the passed core checks above;
secret scanning and commit-message validation remain enabled, with no hook/config edit.

## Claude Overall Validation

1. Exercise each skill through the actual Claude entry, including focused,
   explicit legacy modes, zero-question applicability, non-AI tasks, inherited
   choices, and a real unanswered human choice. Do not simulate a human answer.
2. Verify one actual researcher plus an independent examiner and a shared budget;
   critical unknowns, stale review hashes and missing recovery must block readiness.
3. Follow a source requirement through decisions, states, acceptance and Packet.
   Unadopted research advice must not become a MUST or required component.
4. Check full skill completion/handoffs separately from the bounded replay probes.
   Report discovery, execution and refusal independently per host.

## Known Limits

- Independent source acceptance passed, but required dual-host runtime evidence
  was incomplete. A bounded native response probe is not a complete skill run.
- A subsequent real focused technical study produced supported bounded findings,
  but its method gate failed: omitted Context7 use and early phase-reference reads.
  The user retained the eight-item budget and the failure; do not promote it to PASS.
- Only one historical B/C HTML pair exists, with remaining adoption-label and
  accessibility issues. No additional generation is authorized by this delivery.
- A/C0, holdouts, research increment, complete cost/time/human accounting and the
  original 50-percent saving/adoption gates remain unverified. No default promotion.

Private source captures, prototypes, session traces, metering records and unrelated
working changes are intentionally not included in the publication.
