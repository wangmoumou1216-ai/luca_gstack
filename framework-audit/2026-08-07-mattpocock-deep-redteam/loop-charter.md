# mattpocock capability review loop — binding charter

> Scope: review all live mattpocock-derived capability units in luca_gstack and the proposed
> adaptation plan. This is a **review-only** run. It may end at `PLAN_HANDSHAKE_READY`; it cannot
> claim `IMPLEMENTATION_HANDSHAKE_READY` because no implementation or activation is authorized.

## 1. Frozen state machine

```text
FREEZE
  -> INVENTORY_LOCK
  -> ROUND_1_REDTEAM
  -> SYNTHESIS_1
  -> REVISION_1
  -> REFREEZE
  -> ROUND_2_REDTEAM
  -> INDEPENDENT_FINAL_JUDGE
  -> PLAN_HANDSHAKE_READY | NO_HANDSHAKE
```

- At most two redteam/revision rounds. A material change after Round 2 returns `NO_HANDSHAKE`; it
  does not silently start an unbounded third round.
- Redteam votes are not averaged. One supported BLOCKER defeats a handshake until its closure is
  represented by an owned plan item, an executable acceptance test, and a rollback rule.
- Earlier 2026-08-07 `consensus.md` and its quality-gate PASS are inputs only. The expanded scope
  revoked their terminal status.

## 2. Inventory and read-completeness gate

The Round 1 denominator was the 47-unit behavioral subtotal in `capability-inventory.md`; the
lineage redteam proved that this omitted ten independently failing governance/reachability atoms.
The canonical Round 2 denominator is therefore the 57-unit union defined by that file plus
`inventory-refreeze-r2.md`, not the 21-row adoption log. Every unit must join all four surfaces:

1. exact upstream blob and lineage;
2. current live target or explicit no-live-target disposition;
3. route/catalog/project-scope surface for Claude and Codex;
4. Trigger / Execute / Degrade / Verify evidence for each applicable harness.

`read-coverage-report.md` is admissible only when a fresh reviewer replays its objects. Any
truncated batch is invalid in full; hash/EOF proves object identity and read boundary, not semantic
correctness. An orphan route, an unlisted transitive file, a missing applicable T/E/D/V cell, or a
materially unread source blocks the handshake.

## 3. Required independent attack surfaces

Round 1 must contain independent attacks on:

- existing capability lineage, need evidence, redundancy, and all live targets;
- Claude/Codex parity and safety, including destructive operations and human gates;
- proposed adaptation modules and their cross-module dataflow;
- the direct-read ledger itself.

Round 2 must use fresh reviewer contexts and attack the revised artifacts, not merely endorse
Round 1. The final judge must be independent of the author and Round 2 reviewers.

## 4. Severity and closure semantics

- `BLOCKER`: safety, scope, evidence integrity, missing executable target, or a false terminal
  claim. Must be closed in the plan or yield `NO_HANDSHAKE`.
- `MAJOR`: a material behavior, parity, or verification gap. Must have an owner, dependency,
  acceptance test, and rollback/degrade behavior.
- `MINOR`: may remain only if explicitly bounded and incapable of invalidating a higher gate.
- `UNKNOWN-LIVE`: never coerced to PASS. It becomes a pre-activation acceptance gate.
- `N/A`: allowed only with an explicit, justified harness/scope exception; absence is not N/A.

## 5. Final judge contract

The judge may emit `PLAN_HANDSHAKE_READY` only if:

- the inventory denominator and exclusions are frozen and replayed;
- every Round 1 BLOCKER/MAJOR maps to a revised plan item or an evidence-backed rejection;
- Round 2 finds no unresolved BLOCKER and no unowned MAJOR;
- every active plan item specifies exact scope, both-harness semantics, failure/degrade behavior,
  executable acceptance evidence, sequencing, and rollback;
- rejected/deferred upstream candidates keep demand-based re-entry criteria;
- the plan stops at a real Luca approval gate before any global skill or repo behavior mutation.

Otherwise the only valid terminal state is `NO_HANDSHAKE`, with exact failed gates.

<!-- FILE_END: loop-charter.md -->
