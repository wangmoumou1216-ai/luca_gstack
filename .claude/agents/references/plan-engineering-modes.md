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

If a CMP/ASSERT/DEV/TEST depends on a selected accepted/composite prototype or explicitly binds
`final_artifact_ref` / `accepted_ref`, fully read
`.claude/skill-os/runtime/prototype-delivery.md` before compilation. Take the exact selected
`final_artifact_ref{path,sha256}` / card `accepted_ref` and caller-verified delivery root; under the
caller's current permitted `read_paths`/`read_roots`, use this CLI only for local-file sources without
remote/message context:

```text
node scripts/prototype-delivery.mjs resolve --accepted <exact accepted_ref.path> --sha256 <accepted_ref.sha256> --delivery-root <verified delivery root> [--read-path <actual permitted file>] [--read-root <actual permitted root>]
```

For a verified current context containing authorized `allowed_urls` or native-message
`source_refs`/`scope_refs`, import `resolveFinal` from the same `scripts/prototype-delivery.mjs` and run:

```javascript
resolveFinal({ path: accepted_ref.path, sha256: accepted_ref.sha256, delivery_root: verified_delivery_root }, currentReadContext)
```

Pass the caller's actual complete permitted `currentReadContext`; never derive grants from certificate
metadata or drop remote/message context to force CLI. CLI-only capability without the required API
context returns NEEDS_CONTEXT; absent actual read permission remains BLOCKED. Both entries return
the same resolved final and must undergo all identity comparisons and dependent-card barriers below.

Repeat read flags only for genuinely permitted external files/roots; neither card nor JSON grants
reads. A successful `resolveFinal` revalidates the whole current candidate/final/source/base raw
closure/scope/method/patch/spec/report/evidence chain. Compare its `candidate_ref`, `accepted_ref`,
`acceptance_ref`, `final_entry/final_sha256`, `spec_path/spec_sha256`, `source_ref` and base/raw
provenance against every affected frozen evidence pointer, not only the task-plan hash. The same
task-plan SHA does not excuse external artifact drift. Missing, stale or mismatched identity blocks
only dependent cards and returns the affected TS/TP owner to refresh evidence and re-gate; do not
guess raw/latest or rewrite old evidence. Recompile the modified plan and obtain only the missing
payload approval before execution. Preserve unrelated U-IDs, graph/frontier, integration tip,
ownership/preimages and already accepted native receipts. This section is the sole compile-boundary
definition; Plan Agent and implement call it rather than duplicating its method. Old unselected
prototype tasks retain their existing contract.

The compiled plan must bind the exact task-plan path and SHA, tech-spec source, and repository
baseline. Placeholder U-IDs, ambiguous paths, and missing authority are blocking. An optional graph
or engineering-delivery preset supplies routing metadata only and never effect authority.

Before execution, show the user the complete binding and exact U-ID set. Only explicit confirmation
of that payload creates `approved U-ID` authority. Drift in task-plan, hash, or baseline invalidates
the approval and requires recompilation. The approved plan is then handed to Orchestrator; neither
the facade nor this reference owns execution state.

<!-- FILE_END: agents/references/plan-engineering-modes.md -->
