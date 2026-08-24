# Round 1 red team — routing and alias boundary

> Verdict: **FAIL**  
> Reviewed plan SHA256: `63d3d615b291482a8857d8dbebbded9c2acb48b0cf95dfb59e32ad878306d7f9`  
> Review mode: independent, read-only

## Blockers

1. The proposed three-leg UI phrase predicate invented a sixth Plan Agent trigger. The authoritative
   Plan Agent contract has five triggers; a lexical approximation cannot silently add another one or
   assign Scene B. The repair must either remain a non-scoring semantic-route obligation or explicitly
   revise the authoritative Plan Agent contract and re-review that larger change.
2. The alias loader did not select one canonical project census. Existing route, substrate, and Python
   helpers disagree about symlink directories. Alias owners must be direct real child directories of
   `PROJECTS_ROOT` that pass `canonicalProjectIdentity`; a route-only census must not change the shared
   substrate/Python contract.

## Majors

1. Project-selection syntax was underspecified. Negation, explanatory questions, quotations,
   source-to-target direction, multiple targets, and the current first-`indexOf` boundary bug all need
   exact oracles.
2. Malformed/collision/resource-limit behavior was not closed. The plan needs exact project/file/total
   byte/alias/length limits, Unicode and control rejection, symlink-safe bounded reads, and a matrix that
   preserves canonical matches while failing closed for non-canonical selection under an incomplete
   registry.
3. Mutations were too weak. Each predicate leg needs an exact two-of-three negative; alias integration
   must use a real temporary `LUCA_PROJECTS_ROOT` without route test overrides and opaque randomized
   aliases; permissive `A|B` fixture oracles must be mechanically rejected.

## Required disposition

No runtime implementation or user handshake is permitted for this SHA. A material revision must receive
a new SHA and a new independent review.

