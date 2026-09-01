---
name: to-spec
description: Thin facade that synthesizes an already-resolved engineering conversation into the canonical tech-spec conversation_synthesis mode; not for product discovery, UI, or design decisions.
license: MIT
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
metadata:
  recommended-model: core-execution
---

# To Spec

## Preamble

```bash
git branch --show-current 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py to-spec "*" 2>/dev/null || true
```

## Defining constraint

`to-spec` is a thin facade. It performs conversation synthesis, then hands the result to
`../tech-spec/SKILL.md` in `conversation_synthesis` mode. The canonical tech-spec file and its
handoff remain the only engineering-spec artifacts; this facade owns no second template, status,
issue-tracker record, or workflow state.

Use it when the current conversation has already settled the engineering goal, constraints, and
acceptance facts and the user wants those facts turned into a spec without another interview.

Do not use this facade to discover product scope or decide UI, interaction states, layout, visual
language, or brand behavior. Those are product/design inputs, not facts that conversation synthesis
may invent. If such a decision is still open, return `NEEDS_CONTEXT` with the exact missing decision
and point to the appropriate product or design owner; do not conduct an interview inside this skill.

## Process

1. Read the current conversation and only the repository evidence already needed to verify its
   engineering claims. Do not open the optional workflow graph.
2. Build a Conversation Source Register. Assign stable-in-this-spec `CONV-NNN` IDs to explicit
   requirements, constraints, acceptance facts, exclusions, and named assumptions. Each row must
   carry a short source pointer to the user turn or repository evidence. Omit guesses.
3. Run the eligibility gate:
   - the engineering outcome and boundaries are explicit;
   - no unresolved product preference is being converted into a requirement;
   - no UI/design decision is being fabricated;
   - every MUST claim has a source pointer and an observable acceptance statement.
4. If the gate passes, read `../tech-spec/SKILL.md` through its `FILE_END` marker and execute its
   `conversation_synthesis` mode with the Conversation Source Register as the source contract.
   Preserve its Phase 0 through Phase 6 order and coverage gate.
5. Report the tech-spec owner's normal completion status and paths. `to-spec` is complete only when
   the canonical tech-spec coverage gate passes.

## Failure contract

- Missing engineering fact: `NEEDS_CONTEXT`, naming the missing fact; do not infer it.
- Open product or design choice: `NEEDS_CONTEXT`, routed to its owner; do not synthesize it.
- Canonical tech-spec gate failure: propagate `BLOCKED` or `NEEDS_CONTEXT`; never publish a facade
  artifact as a substitute.

<!-- FILE_END: to-spec/SKILL.md -->
