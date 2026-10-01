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

## Canonical map and frontier discipline

The existing Plan artifact is an index: destination, notes/standing constraints, accepted decision
pointers, precise frontier and blocked questions, fog, exclusions, and source pointers. Decision detail
lives in its already owned artifact once; the index carries a gist/link, not another copy. Human-facing
references use descriptive names wrapping their stable IDs/links; stable U-IDs are never renumbered.

Chart breadth first after the destination is a real user decision. A precise question may be blocked;
only an unphraseable in-scope area is fog. Record out-of-scope separately: it never graduates without
a real destination/scope change. Resolve one real HITL decision and return to the Plan owner to update
its accepted pointer, re-evaluate dependencies and graduate only newly sharp fog. Human decisions stay
HITL; executable investigations can become U-blocks under the normal gate. Research finds facts;
prototype may concretize a decision only under its own tool/permission contract; manual prerequisites
earn scope only by unblocking a decision. Do not answer the human's half of an exchange.

Resume by reading the low-resolution canonical index and the selected frontier item's evidence only,
checking baseline/approval and actual blockers. The existing owner chooses its normal session scope
and checkpoints; there is no arbitrary one-ticket limit or autonomous tracker claim/close operation.
Planning ends when the route is clear, remaining fog is resolved or explicitly deferred by the user,
and the normal Plan confirmation gate is satisfied. Then hand off to the execution owner.

Source17, MIT, pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`. Upstream tracker map, automatic research
branches, claim/comment/close and parallel dispatch are mapped to the existing Plan authority.

## Safety boundary

Wayfinder is planning only. It does not mutate product code, create external tracker objects, grant
Git/external effects, or treat a placeholder U-ID as authority.

<!-- FILE_END: wayfinder/SKILL.md -->
