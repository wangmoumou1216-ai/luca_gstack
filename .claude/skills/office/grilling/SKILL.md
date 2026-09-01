---
name: grilling
description: Stress-test a plan, decision, or idea through a one-question-at-a-time human decision tree. Use when the user asks to be grilled, challenged, pressure-tested, or when an internal workflow reaches a consequential unresolved choice; do not batch questions or use it to look up facts the agent can inspect itself.
license: MIT
metadata:
  recommended-model: core-execution
---

# Grilling

## Defining constraint

Ask exactly **one decision question per assistant turn**, then stop and wait for the user's answer.
Never present a numbered batch, a multi-question round, or several decisions hidden inside one sentence.

The user owns decisions. The agent owns fact-finding. Do not ask the user for repository facts,
documentation facts, logs, or other evidence that available tools can retrieve.

## When to use

Use this method when:

- the user explicitly asks to be grilled, challenged, or pressure-tested;
- a plan or idea still contains a consequential unresolved decision;
- an internal workflow reaches a human judgment gate and a single answer will unlock the next branch.

Do not use it for ordinary clarification, fact lookup, or to bypass Project Gate, Plan Agent, or another
human gate. Internal dispatch inherits the parent task's authority; it never adds write, network, Git, or
external-effect authority.

## Method

### 1. Build the decision tree privately

List the decisions that must be settled and their dependencies. Mark a decision **ready** only when every
decision it depends on is already settled and every retrievable fact it needs has been inspected.

Do not show the whole question queue. Revealing future branches encourages premature answers before their
premises are known.

### 2. Resolve facts before asking

For the highest-leverage ready decision:

1. inspect available evidence yourself;
2. distinguish observed facts from inferences;
3. identify the smallest genuine choice the user must make;
4. formulate one question that can settle that choice.

If a required fact cannot be retrieved, report the exact missing context. Asking for a missing artifact is
still one question, not permission to bundle other decisions into the same turn.

### 3. Ask one question

Use this compact shape:

```text
Decision: <one choice only>
Why now: <what this answer unlocks>
Recommendation: <your proposed answer and one concrete reason>
Question: <one answerable question>
```

Options are useful when they are mutually exclusive, but one set of options still represents one decision.
Do not append “and also”, a second question mark, or a request to answer several fields.

### 4. Wait, record, and recompute

End the turn after the question. When the user answers:

- record the answer without silently broadening it;
- note any premise the answer settles;
- recompute the ready frontier;
- ask the next single question only if one remains.

If the response is ambiguous, ask one narrower follow-up about that same decision. Do not advance other
branches while it remains unresolved.

### 5. Close with confirmation

When no unresolved decision remains, summarize the settled decisions, explicit assumptions, and deferred
branches. Ask one final confirmation question. Do not execute the resulting plan until the user confirms or
the calling workflow already supplied a separate, valid execution authorization.

## Invocation surfaces

- **Direct:** the user names `grilling` or explicitly asks to be grilled or pressure-tested.
- **Semantic:** the user asks for rigorous one-decision-at-a-time interrogation without naming the skill.
- **Internal:** a workflow dispatches this method at a genuine human decision gate.

All three surfaces use the same one-question rule. Internal invocation cannot answer the decision on the
user's behalf and cannot turn an earlier approval into authority for a new action.

## Proof before completion

Before declaring the grilling session complete, verify:

- every assistant interrogation turn contained exactly one decision question;
- facts available through tools were not delegated back to the user;
- each answer was tied to the branch it settled;
- the closing summary contains no silent assumption;
- action has not started without its own authority.

<!-- FILE_END: grilling/SKILL.md -->
