# Controlled-change full-capability post-seal red team

> Review date: 2026-09-03 (Asia/Shanghai)
> Target: `framework-audit/2026-08-30-controlled-change-full-capability/FINAL-MASTER-PLAN.md` and `REVIEW-LEDGER.md`
> Frozen object: `WORKTREE_DIFF = git diff HEAD` at `HEAD=62b6e4f32feb850ba4f8286a7cb9609202b88f6b`
> Review mode: general adversarial review; questions only

## Integrity and provenance

1. If the ledger's declared canonical SHA cannot be reproduced with its own normalization rule, what evidence still makes `CLOSED_AT_GATE_P` a valid current state?
2. Where are the exact bytes for handoff SHA `51618e033c1ef5ec221a7a455fb743df07d103fde65c715d207f783cae8a221f`, and how can a fresh implementation Session perform the mandatory recomputation when the repository contains only the asserted digest?
3. If all final review IDs exist only inside the ledger and `NOT_RECORDED_BY_SCOPE` forbids persisted eval records, what independent evidence distinguishes four real reviews from a single document's self-report?

## Post-seal change surface

4. Which exact §24.10 disposition covers `a16d47b` and `62b6e4f`, given that they modify `optional-workflow-graph.yaml`, `project-scope-guard.mjs`, `route-guard.mjs`, `session-end.mjs`, and `scripts/test-route-guard.mjs`, all of which are named anchors or U-block inputs?
5. Can `project-scope-guard.mjs` still be treated as a byte-frozen trust anchor when its behaviour now depends on the separately mutable `project-read-grants.mjs` library and `project-read.mjs` broker, neither of which appears in the anchor list?
6. What prevents a future change to grant issuance, consumption, turn closure, or broker behaviour from changing the effective pre-tool trust boundary while every currently listed anchor check still passes?

## Scope and authority

7. Is `to-tickets` a seventh controlled-change consumer, an explicitly excluded publisher, or a future rollout surface, and where is that decision frozen?
8. If `to-tickets` may create local files and external tracker issues, which contract proves its preview approval, target identity, exact effect set, readback, and retry semantics cannot bypass the plan's external-effect gates?
9. Does keeping `--six-skill-v1-lineage` as the only lineage assertion accidentally turn a historical MVP count into a current protection-boundary claim after a seventh engineering-delivery capability has landed?

## Closure

10. Which reviewer can legitimately restore `READY_FOR_APPROVAL` without first deciding the two new trust/scope questions and re-signing a new plan SHA?
11. What exact artifact will bind the final plan SHA, ledger canonical SHA, reproducible handoff bytes, and post-seal fixed-range audit so a new Session cannot unknowingly resume from the superseded R23 state?

<!-- FILE_END: 2026-09-03-controlled-change-full-capability-redteam.md -->
