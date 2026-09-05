# P6 Standards scorer v23 delta closure

**PASS for the exact two-file v22 → v23 delta.** No confirmed Standards finding; no scorer relaxation found. This is a local source/matcher closure, not live-model acceptance or a publication verdict.

## Bound object

Compared against the corresponding original source bytes in `framework-audit/2026-09-05-agent-context-p6-v22-scorer/`, without reading its README, Spec reports, or conclusions.

| Current file | SHA256 |
| --- | --- |
| `scripts/run-agent-context-ab.mjs` | `15c689040272b06142a50c354e18bf7e58436e56c967bc968f377d6b53be80bb` |
| `scripts/test-agent-context-branch-fixtures.mjs` | `ef4c9d38ed3d2a67a2e40484a7289690cae0b8a14cb0d76e45a477f0e5c4ea78` |

Protocol is 23; revision is `v23-required-no-pin-project-session-eof`. Independently recomputed aggregate scoring SHA256: `e392065e637e883008c58443eaf1c9d028c47990e1b231e6715e67b8aba7501a`. `agent-context-branch-fixtures.mjs` remains byte-identical to the supplied v22 source.

## Correctness assessment

- The shared prompt explicitly makes these requests NO_PIN framework/meta work. The current manifest's project-session condition includes framework/meta work and requires EOF consumption. Adding the project-session owner to nontrivial, nonisolated candidate startup targets matches that contract.
- Required targets are deduplicated and checked by the existing actual-content/EOF matcher. The change does not alter claims matching, source matching, read evidence, scope policy, response validation, or baseline behavior. Existing trivial and isolated-root exemptions remain intact.
- The exported independent positive samples use `structuredClone`; callers cannot mutate the shared expected arrays. Missing IDs return `undefined`, allowing the existing nonbranch fixture equality samples.
- New missing/partial cases assert claims and source still pass before asserting overall failure, preventing unrelated failures from concealing a broken required-read check.

## Independent local verification

Artifacts: `/private/tmp/p6-standards-scorer-closure-o_p0v0f_/results.json` and per-run logs.

Copied the exact production function prefix, fixture modules, and new test block into a temporary harness. Ran separately with `--harness codex` and `--harness claude`; each run exercises both transport projections for F13-page-handoff, F14-flow-preservation, F10-v2, F4-stop, and F2. No model CLI was invoked.

| Check | Result |
| --- | --- |
| Full project-session content | PASS across five fixtures, both transport projections, and both harness configurations. |
| Missing owner / first-line-only owner | Rejected while claims/source remain valid; partial case retains observed evidence but is incomplete. |
| Deduplicated owner / restored full content | PASS; exactly one owner check. |
| Same incomplete trace evaluated as baseline | PASS, preserving the existing baseline measurement policy. |
| Mutate production startup list to remove the new required owner | Both harness configurations fail at `claude/F13-page-handoff/missing: incomplete project-session read passed`. |
| Restore the production owner requirement | Both configurations PASS again. |
| Independent positive export mutation | Mutating one returned nested array does not affect a fresh sample; unknown fixture ID returns `undefined`. |
| Existing production claims contract | All 320 counterexamples rejected; output explicitly says `model_behaviour_verified: false`. |

Repository source files were not modified. No full verify, live model, network, browser, project alias access, staging, or publication was performed. This report closes only the supplied scorer delta.
