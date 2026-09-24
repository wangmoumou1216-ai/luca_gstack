# Plan Agent engineering-delivery facade modes

Read this file through EOF before proposing a Phase that uses `wayfinder` or `implement compile`.
These modes reuse the canonical Plan Agent format, Stable ID Freeze, assertions, and confirmation
gate; they never create parallel plan state or execution authority.

## `wayfinder` mode — planning owner

Accept only when the caller has separately evidenced `huge AND multi-session AND fog`. If any
predicate is false, return to the ordinary Plan Agent flow. Input must include destination, known
decisions, frontier, fog, out-of-scope, and source pointers.

Fog that cannot yet be stated precisely remains in the plan's fog section and must not be disguised
as a U-block. Once it can be stated precisely, classify it as a human decision or an executable
investigation/task. Human decisions enter HITL; only executable work becomes a U-block. The output
is still the canonical resumable plan, never a second tracker or plan truth.

## `implement compile` mode — execution-plan owner

Accept only a Phase-gated canonical tech-spec plus task-plan. Before compiling, recompute the final
`task_plan_sha256`. Map every DEV/TEST card to a stable U-ID while preserving Source, Dependencies,
exact Files, Read List, Test scenarios, and Verification. List Git and external effects separately.

The compiled plan must bind the exact task-plan path and SHA, tech-spec source, and repository
baseline. Placeholder U-IDs, ambiguous paths, and missing authority are blocking. An optional graph
or engineering-delivery preset supplies routing metadata only and never effect authority.

Before execution, show the user the complete binding and exact U-ID set. Only explicit confirmation
of that payload creates `approved U-ID` authority. Drift in task-plan, hash, or baseline invalidates
the approval and requires recompilation. The approved plan is then handed to Orchestrator; neither
the facade nor this reference owns execution state.

<!-- FILE_END: agents/references/plan-engineering-modes.md -->
