---
name: to-tickets
description: Explicit-only publication facade that turns an exact gated task-plan into tracer-bullet implementation tickets with blocking edges, using local markdown or a user-approved tracker; not for creating or revising the plan itself.
license: MIT
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
metadata:
  recommended-model: core-execution
---

# To Tickets

## Preamble

```bash
git branch --show-current 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py to-tickets "*" 2>/dev/null || true
```

## Defining constraint

`to-tickets` is an explicit-only publication facade. The canonical `task-plan` remains the sole owner
of task decomposition, stable DEV/TEST IDs, assertions, dependencies, gate status, and execution
authority. This skill validates and publishes a faithful ticket projection of those frozen bytes; it
does not create a second plan, silently re-slice work, grant implementation authority, or own workflow
state.

Use it when the user explicitly invokes `$to-tickets` or `/to-tickets` and names an exact task-plan
whose Phase 7 gate is PASS. If the input is only a conversation, plan idea, or engineering spec, return
`NEEDS_CONTEXT` and route it through `task-plan` first.

Source: `mattpocock/skills`, `skills/engineering/to-tickets` (MIT), adapted at upstream commit
`321658273cb1d20b76026717d027d505790106d4`. The Luca adaptation preserves tracer-bullet slices,
blocking edges, the pre-publication quiz, and local/real-tracker publication while keeping the local
task-plan ownership and authority model intact.

## 1. Bind the canonical source

1. Resolve the exact task-plan path from the user's argument or a verified handoff. Do not select a
   plan by fuzzy topic matching when more than one candidate exists.
2. Read the file through its final line and verify `TASK PLAN GATE PASS` is present.
3. Compute the lowercase SHA-256 after reading. If a handoff supplies `task_plan_sha256`, require an
   exact match. Any byte drift invalidates the projection and requires the task-plan owner to re-gate.
4. Enumerate every MUST `DEV-NNN`, its paired `TEST-NNN`, bound assertions, MVP status, and structured
   `依赖任务` edges. PARTIAL cards are included only when the user explicitly includes them.

## 2. Validate ticket readiness

Each proposed ticket must map to one DEV card without changing its stable ID and must satisfy the
task-plan's tracer-bullet contract:

- it delivers a narrow but complete path through all required layers;
- it is independently demoable or verifiable;
- it fits one fresh context window;
- its acceptance criteria are the bound assertions and paired TEST cards, not newly invented checks;
- its blockers are exactly the unresolved `依赖任务` edges.

A wide mechanical refactor may use the task-plan's declared expand–migrate–contract exception. If a
card is horizontal, oversized, missing its paired test, or has ambiguous blockers, stop with
`NEEDS_CONTEXT` and identify the affected IDs; do not repair the canonical plan inside this facade.

## 3. Quiz before any publication

Present a numbered preview. For each ticket show:

- stable `DEV-NNN` and title;
- `Blocked by` IDs, or `None`;
- the end-to-end behaviour it delivers;
- bound acceptance/assertion IDs;
- target: local markdown or the named external tracker.

Ask whether granularity, blocker edges, PARTIAL inclusion, and the publication target are correct.
Publication is a separate mutation gate: no local file or external issue is created until the user
approves this exact preview. Approval of a task-plan or implementation does not imply approval to
publish externally.

## 4. Publish the approved projection

Publish blockers before dependants. Every ticket records the source `DEV-NNN`, exact task-plan path and
SHA-256, end-to-end behaviour, acceptance criteria, blockers, and `ready-for-agent` status.

### Local markdown

When no real tracker is explicitly selected, write one file per ticket under the active project's
`.scratch/<feature-slug>/issues/<NN>-<dev-id>-<slug>.md`, numbered in dependency order. Never create a
combined `tickets.md`. Local mode requires no tracker setup and must not write into the luca_gstack
framework checkout when a downstream project is active.

### Real tracker

Use a real tracker only when the user explicitly names it and its existing authenticated integration
is available. Do not install or configure a tracker as a side effect of this skill. Create one issue
per ticket in dependency order, preserve any parent as read-only, use native parent/blocking
relationships when the tracker supports them, and fall back to body links only when it does not.

Before the first external create call, restate the tracker, repository/team, issue count, labels, and
parent/blocking effects. That approval is scoped to those effects only. Never close or edit a parent,
commit code, start implementation, or push Git history from this skill.

## 5. Read back and report

Read every created local file or remote issue back. Verify that:

- the body is non-empty and starts with the expected source/behaviour sections;
- source DEV ID and task-plan SHA match the approved preview;
- blockers and acceptance criteria match the canonical task-plan;
- native relationships or fallback links landed as reported.

Retry a failed body write once. If the second read-back still differs, return `BLOCKED` with the exact
ticket and mismatch; do not report the batch as complete.

Finish with the canonical completion status plus the local paths or remote issue URLs. Published
tickets are a projection, not execution authority: implementation still enters through `implement`
and its task-plan SHA/U-ID approval barrier.

<!-- FILE_END: to-tickets/SKILL.md -->
