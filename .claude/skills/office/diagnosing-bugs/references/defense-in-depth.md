# Defense-in-Depth Validation

Fix the original trigger first. Then check whether independent paths, trust changes or environment
hazards justify additional protections. Each layer needs its own responsibility and bypass test;
duplicating every check indiscriminately is not a substitute for causal evidence.

## Four useful layers

| Layer | Responsibility | Example | Evidence |
|---|---|---|---|
| Entry | Reject invalid external input | empty/non-directory path | public input test |
| Business logic | Enforce operation invariant despite alternate entry | initialization needs valid owner | alternate-path test |
| Environment | Prevent context-specific effects | isolated test effect target | segment-safe realpath containment test |
| Instrumentation | Explain structural misuse when failures remain | tagged redacted stack/selected context | actual probe outcome |

An illustrative empty-path bug can require input validation, a fixture-lifetime source fix and an
isolated effect guard. A string startsWith comparison does not establish path containment: resolve
real paths, use segment-aware relative checks and reject traversal/symlinks as the owner requires.
Instrumentation is temporary during diagnosis; retained logs need a separate authorized purpose.

## Apply the pattern

Trace the bad value; map paths that can bypass the entry; identify which real invariant each layer
owns; add only scope-authorized protections; independently exercise bypasses; rerun original loop
and relevant tests. Preserve existing deliberate fail-open/fallback/compatibility contracts. A guard
that would change one needs its existing human gate, not a generic defense-in-depth justification.

Report which layers were tested and residual gaps. Historical examples do not prove this bug is
impossible or a suite passed. Legacy personal systematic-debugging supplement; ../PROVENANCE.md.

<!-- FILE_END: diagnosing-bugs/references/defense-in-depth.md -->
