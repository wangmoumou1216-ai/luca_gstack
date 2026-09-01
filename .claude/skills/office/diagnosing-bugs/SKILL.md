---
name: diagnosing-bugs
description: Diagnose an unexpected failure, regression, flaky behavior, or performance regression by first building a tight loop that reproduces the user's exact symptom, then tracing a falsifiable root cause. Default to diagnose-only with no writes or network; do not invoke for an expected TDD red, a planned failing test, or a known implementation gap.
license: MIT
metadata:
  recommended-model: core-execution
---

# Diagnosing Bugs

## Defining constraint

Before forming a fix hypothesis, build and run one **symptom-hitting red loop**: a command or procedure that
reaches the real failing path and distinguishes the user's exact symptom from nearby failures.

The default posture is **diagnose-only**:

- read and run already-authorized local diagnostics;
- do not edit product files, tests, configuration, Git state, or external state;
- do not use the network;
- do not apply a fix merely because a likely cause was found.

A request to diagnose is not a request to fix. Implement only after the user or parent execution contract
separately authorizes implementation.

## Trigger boundary

Use this method for an unexpected failure, broken behavior, regression, flaky test, or performance
regression.

Do **not** trigger it for:

- an expected TDD red created immediately before implementation;
- a deliberately failing acceptance test for a not-yet-implemented requirement;
- a known missing feature whose next step is already specified;
- a real Git merge/rebase conflict, which belongs to `resolving-merge-conflicts`;
- a request that only asks to implement a known change.

If it is unclear whether a red is expected, inspect the test intent, current task, and recent change history
before choosing this method. An expected TDD red stays in the implementation loop.

## Safety boundary

Diagnostics often leak secrets or mutate state accidentally. Before showing output, replace secrets with
`<REDACTED>` and quote only the lines carrying the signal.

In diagnose-only mode:

- prefer read-only commands and the provided `scripts/safe-diagnostic-runner.mjs` for its supported Git
  observations;
- treat test commands, build commands, package managers, browsers, and application startup as potentially
  write-producing;
- run a write-producing reproduction only in a task-owned scratch overlay, or obtain explicit authority for
  the exact effects first;
- never fetch packages, call remote APIs, or contact production without separate network authority;
- never stage, commit, push, reset, clean, or change refs.

The optional `scripts/safe-snapshot-copy.py` performs one explicit, CAS-bound copy into an existing OS-temp
scratch directory. Its `--allow-write-to-scratch` flag is an execution acknowledgement, not human authority;
the caller must already possess that authority.

## Phase 1 — Build the feedback loop

Spend most of the initial effort here. Choose the narrowest seam that reaches the reported behavior:

1. an existing focused test;
2. a CLI invocation with fixture input;
3. a local HTTP or browser reproduction that is already authorized;
4. a captured trace replayed locally with secrets removed;
5. a minimal throwaway harness in scratch;
6. a differential or bisection loop;
7. a structured HITL loop using `scripts/hitl-loop.template.sh` as a last resort.

The loop is ready only when one named invocation has actually been run and is:

- **symptom-specific:** it asserts the user's exact failure, not merely a nonzero exit;
- **red-capable:** it demonstrably fails when the bug is present;
- **deterministic:** or has a measured reproduction rate high enough to investigate;
- **fast:** narrow enough for repeated use;
- **agent-runnable:** except for an explicitly structured HITL step.

If no such loop can be built, stop with `NEEDS_CONTEXT`. List the attempts and request one missing artifact or
access item. Do not substitute speculation for a loop.

## Phase 2 — Reproduce and minimise

Run the loop enough times to establish the signal. Capture the exact message, value, event ordering, or timing
threshold. Then remove one input, component, or step at a time, rerunning after each change. Keep a component
only if removing it makes the symptom disappear.

For flaky behavior, raise and report the reproduction rate; do not call a single lucky pass a fix. Replace
arbitrary sleeps with condition-based waiting unless timing itself is the behavior under test. See
`references/condition-based-waiting.md` and its example.

## Phase 3 — Trace the root cause

Read complete errors and stack traces, inspect recent relevant changes, find the nearest working comparison,
and trace bad data or control flow backward to its origin. See `references/root-cause-tracing.md`.

For a non-trivial bug, write three to five ranked, falsifiable hypotheses before probing:

```text
If <cause> is true, then <one observation or isolated variable change> will produce <prediction>.
```

Show the ranking to the user as a non-blocking checkpoint. Test one hypothesis at a time. Each probe must map
to one prediction. Tag temporary instrumentation with a unique `[DEBUG-<id>]` prefix.

For a performance regression, establish a numerical baseline and use a profiler, query plan, or bisection;
do not flood the path with logs.

## Phase 4 — Conclude diagnosis

A diagnosis is complete when evidence identifies the earliest actionable cause and rules out the meaningful
alternatives. Report:

1. the exact red loop and observed output;
2. the root cause and causal chain;
3. evidence that distinguishes it from the rejected hypotheses;
4. the smallest proposed fix seam;
5. the regression-test seam, or why no correct seam exists;
6. remaining uncertainty and any authority required to proceed.

Stop here in diagnose-only mode.

## Phase 5 — Fix only when separately authorized

If implementation is explicitly authorized:

1. turn the minimized reproduction into a regression test at the real seam and watch it fail;
2. apply one root-cause fix without drive-by refactoring;
3. watch the regression test pass;
4. rerun the original unminimized loop;
5. run proportionate neighboring checks;
6. remove every `[DEBUG-<id>]` probe and scratch prototype.

If three fix attempts fail, stop and question the architecture with the user. Do not stack a fourth guessed
patch on top.

After finding a root cause, use `references/defense-in-depth.md` to decide whether validation belongs at more
than one boundary. Defense in depth supplements the source fix; it never replaces it.

## Invocation surfaces

- **Direct:** `$diagnosing-bugs`, “diagnose”, “debug this”, or an explicit investigation request.
- **Semantic:** an unnamed unexpected failure or regression whose cause is unknown.
- **Internal:** an Orchestrator exception loop dispatches this method and returns findings to the original
  U-ID.

Internal dispatch inherits the original task's exact paths and effects. It does not gain permission to edit,
use the network, or publish. Expected TDD red remains in the original U-ID rather than entering this loop.

## Completion check

- [ ] The loop hits the reported symptom and has been run red.
- [ ] The red was unexpected, not planned TDD state.
- [ ] Diagnose-only caused no repository, Git, personal, or network mutation.
- [ ] The root cause is supported by a causal chain and falsifiable evidence.
- [ ] No fix was applied without separate authority.
- [ ] Any authorized fix was rechecked with both the regression test and original loop.

<!-- FILE_END: diagnosing-bugs/SKILL.md -->
