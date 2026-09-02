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
5. Present the compiled task-plan SHA, baseline, exact U-ID list, path/effect scope, and assertions
   for human confirmation. Only an explicit approval bound to those bytes makes the U-IDs approved.
6. Read `.claude/agents/orchestrator.md` and execute only the approved U-IDs. Unexpected failures and
   real Git conflicts remain exception loops under the original U-ID authority. Finish with the
   canonical code-review path; commit or push only behind its separate human gate.

## Refusal rules

- No gated task-plan or spec: `NEEDS_CONTEXT` with the exact missing path/gate.
- Task-plan hash drift or authority from an older plan: stop and recompile; never reuse approval.
- A local or remote ticket is only a `to-tickets` projection: resolve and verify its bound canonical
  task-plan path/SHA before compilation; the ticket itself never grants execution authority.
- Placeholder or partially compiled U-ID: reject it; never ask Orchestrator to infer the missing scope.
- Optional graph missing in standalone mode: continue; it is not an error or a dependency.

<!-- FILE_END: implement/SKILL.md -->
