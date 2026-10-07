---
name: implement
description: Thin execution facade that compiles a gated spec and task-plan through Plan Agent, obtains approval for exact U-IDs, and delegates execution to Orchestrator.
license: MIT
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
metadata:
  recommended-model: core-execution
---

# Implement

## Preamble

```bash
git branch --show-current 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py implement "*" 2>/dev/null || true
```

## Defining constraint

`implement` is a thin facade, not a second executor. Plan Agent owns compilation from the canonical
tech-spec/task-plan into stable U-IDs; Orchestrator owns execution. This skill owns no task state,
approval registry, or alternate plan.

It has two entry modes:

- **standalone**: consume the exact spec/task-plan named by the user or current handoff. Do not read
  or require the optional workflow graph; graph absence is valid.
- **selected engineering-delivery preset**: accept the preset selection only as routing metadata.
  It cannot grant authority. Compilation still begins only after the canonical task-plan gate passes
  and its exact SHA-256 is frozen.

## Compile barrier

Before compiling a selected accepted/composite prototype dependency or an explicit
`final_artifact_ref` / `accepted_ref` binding, fully read and execute the revalidation rule in
`.claude/agents/references/plan-engineering-modes.md` (`implement compile`). Its exact
`final_artifact_ref` resolution applies even when task-plan bytes are unchanged; drift returns only
affected TS/TP owners for re-gate/recompile and missing payload approval. Old unselected prototype
tasks retain their existing contract.

1. Resolve the exact canonical tech-spec and task-plan paths. Verify their gates are PASS and read
   the task-plan through its final line.
2. Compute the task-plan SHA-256 after the final gated bytes are on disk. Bind the compile request to
   that path, hash, tech-spec source, and current baseline. If the file changes, the compile and all
   earlier approvals become stale.
3. Reject draft or placeholder authority: unresolved template tokens, missing source IDs, an empty
   U-ID set, or approval bound to an older task-plan hash cannot enter execution.
4. Read `.claude/agents/plan-agent.md` and invoke its `implement compile` mode. It must map the gated
   task cards to stable U-IDs with dependencies, exact file scope, verification, and separately
   declared Git/external effects.
5. The compiler also freezes the dependency graph, ready frontier, actual integration root/ref/tip,
   per-U-ID file ownership/preimages, context pointers and `max_active_subagents=1`. Independent
   ready work is queued in stable U-ID order; it does not authorize concurrent implementers.
   Present the compiled task-plan SHA, baseline, exact U-ID list, path/effect scope, and assertions
   for human confirmation. Only an explicit approval bound to those bytes makes the U-IDs approved.
6. Before handing off, run scripts/check-plan-approval.mjs, scripts/check-plan-identity.mjs and scripts/check-plan-graph.mjs with the exact plan, approval, identity, graph, scope, source identity, every first effect and --require-no-external-blockers. A failed check keeps the plan out of execution. Read `.claude/agents/orchestrator.md` through EOF and hand it the same approved plan. Only that
   owner executes the approved U-IDs. Unexpected failures and
   real Git conflicts remain exception loops under the original U-ID authority. Finish with the
   canonical code-review path; commit or push only behind its separate human gate.

## Method carried to the execution owner

The compilation preserves every DEV card, paired TEST card, assertion, source, dependency and exact
scope. At the already user-confirmed public seams, the Orchestrator execution uses TDD where applicable:
one test red on the intended behavior, one minimal implementation, green, then the next vertical
slice. Planned TDD red does not trigger diagnosing-bugs. Interface design questions return to
codebase-design; an unconfirmed seam stays untested until its real human gate is settled.

The same plan carries regular typechecking and focused test-file runs, then the full relevant suite
once at the end and the final code-review → code-hygiene Mode D Standards/Spec closure with actual
independent receipts. Missing runner, unknown evidence or failed review is reported truthfully.
No content facade can substitute for those execution obligations. Refactoring goes through review
under the original scope rather than speculation inside the red→green loop.

The upstream “commit current branch” step is adapted to only an already approved exact Git effect,
after fresh checks and final closure. No implicit stage, commit, push or parent-ticket authority.
Source07, MIT, pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.

## Refusal rules

- No gated task-plan or spec: `NEEDS_CONTEXT` with the exact missing path/gate.
- Task-plan hash drift or authority from an older plan: stop and recompile; never reuse approval.
- A local or remote ticket is only a `to-tickets` projection: resolve and verify its bound canonical
  task-plan path/SHA before compilation; the ticket itself never grants execution authority.
- Placeholder or partially compiled U-ID: reject it; never ask Orchestrator to infer the missing scope.
- Optional graph missing in standalone mode: continue; it is not an error or a dependency.

## Publication preparation

Before drafting a PR or marking an existing draft ready after final review, read
[references/pull-request.md](references/pull-request.md) through EOF. Freeze actual base/head/diff
and verification evidence; use Summary / Evidence / Merge Danger, with a useful visual sketch,
real before/after and door/blast radius. A prepared body is reviewable work, not publication authority.
Orchestrator remains the sole execution owner: only the separately approved exact Git/external effect
may create/update/send a PR or mark ready. Missing evidence is a named gap; never invent a check URL,
screenshot or PR link, and never auto-close projected tickets.

<!-- FILE_END: implement/SKILL.md -->
