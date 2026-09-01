---
name: wayfinder
description: Thin planning facade for work that is simultaneously huge, multi-session, and foggy; delegates to Plan Agent wayfinder mode and never creates a second planning state.
license: MIT
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
metadata:
  recommended-model: reasoning-heavy
---

# Wayfinder

## Preamble

```bash
git branch --show-current 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py wayfinder "*" 2>/dev/null || true
```

## Defining constraint

Wayfinder is a planning facade for a narrow conjunction: `huge AND multi-session AND fog`. It
delegates to `.claude/agents/plan-agent.md` in `wayfinder` mode. The Plan Agent plan remains the only
planning truth; this facade creates no tracker map, ticket hierarchy, workflow state, or executable
authority of its own.

## Three-predicate gate

Record evidence and evaluate all three predicates independently:

- **huge**: the destination cannot fit in one bounded Plan Agent/Orchestrator execution even after
  safe parallelism; the work has a materially larger frontier than an ordinary Deep plan.
- **multi-session**: reaching the destination requires at least two resumable execution sessions,
  with a durable handoff boundary between them. Mere convenience or agent fan-out is not enough.
- **fog**: material in-scope territory cannot yet be phrased as a precise decision or executable
  task because earlier discoveries determine what the later question is.

Only `true / true / true` activates wayfinder mode. If any predicate is false, stop using this
facade and return the request to ordinary Plan Agent planning or direct execution as appropriate.
An ordinary large-but-clear task is a negative case, not a reason to stretch the predicates.

## Process

1. Name the **destination** in one or two observable sentences. It defines the scope boundary.
2. Write the evidence table for `huge`, `multi-session`, and `fog`; do not replace evidence with a
   score or intuition.
3. On an all-true result, read `.claude/agents/plan-agent.md` through its final line and invoke its
   `wayfinder` mode. Give it the destination, known decisions, current frontier, fog, exclusions,
   and source pointers.
4. Keep unresolved fog out of executable U-blocks. When a fog item becomes precise, classify it as
   a human decision or an executable investigation/task before admitting it to the plan.
5. Finish when Plan Agent has produced the canonical resumable plan and its normal confirmation
   gate has been satisfied. Execution remains Orchestrator's responsibility.

## Safety boundary

Wayfinder is planning only. It does not mutate product code, create external tracker objects, grant
Git/external effects, or treat a placeholder U-ID as authority.

<!-- FILE_END: wayfinder/SKILL.md -->
