# Cycle 2 census reconciliation

Status: **BLOCKED — no atomic manifest and no final denominator N.**

## Independent freeze

The independent replay was completed before either producer census was opened.

- Frozen atoms: **135**
- Canonical form: UTF-8 `JSON.stringify(frozen_atoms)`, insertion order preserved, no whitespace
- Pre-join SHA-256: `d460284fb0c03afb53634dbf8c64229b49eae55c87a061bbbcb9761293ae5da4`
- Upstream HEAD inspected: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`

The complete immutable pre-join list is embedded in `independent-census.json`.

## Three-way result

| Inventory | Atoms | Result after semantic crosswalk |
|---|---:|---|
| Source-first | 196 | Strongest adopted-lineage floor; whole installs were enumerated |
| Live-first | 109 | Under-enumerated adopted behavior and mixed in local control-plane scope |
| Independent pre-join | 135 | Broader than live, still incomplete and contains local/HEAD scope |

The sets are not equal. The crosswalk covers all 196 source IDs by adoption family, but every family is `PARTIAL_NON_ATOMIC`. There are **61** adopted-source behaviors with no separate row in either replay, **25** live-only trigger/control rows, and **13** independent-only local-control or HEAD rows.

## Decisive gaps

The largest source-only holes are:

- Teach: mission-change, preference, artifact-linking, resource, glossary, citation, printable-reference, quiz-shape, and follow-up behaviors were omitted as separate atoms.
- Skill authoring: trigger-branch identity, front-loaded leading words, router cognitive-load relief, rush-preventing sequence split, and exhaustive completion criteria were omitted.
- Plan/task work: ticket demoability/context sizing/blocker declaration, out-of-scope semantics, map-pointer behavior, no-fog early exit, and final-integration fallback were omitted.
- Code review/debug: fixed review point, source-contract lookup, judgement-call smells, targeted instrumentation, user-visible ranking, and machine-readable HITL capture were omitted.
- Domain/triage/research: glossary-vs-spec separation, code cross-check, durable rejection-record rules, evidence-state reporting, owning-source trace, and repository output convention were omitted.

The JSON carries the exact source IDs and slugs for all 61 holes.

Live-only rows are mostly useful controls, but they are not adopted-source capability atoms: external route/catalog parity, nested references, patch preservation, project pin transactions, logical roles/receipts, quarantine/activation, hermetic verification, and secret safety. Mixing these into the capability denominator would change the scope rather than reconcile it.

## Composite and collision findings

The producer outputs still contain independently failing behavior in one row. Material examples:

- `LIVE-045` combines six authoring failure modes.
- `LIVE-065` combines expand, migration batches, contract, and integration fallback.
- `LIVE-084` combines rejection loading, semantic matching, human confirmation, durable reason, and anti-poisoning.
- `LIVE-092` and `LIVE-093` span multiple target/harness or parent/reference edges.
- `LIVE-109` combines three distinct secret sinks.
- Independent rows `IC-015`, `IC-044`, `IC-077`, `IC-103`, `IC-114`, and `IC-135` also require splitting.
- The source expected-value row combines tautology rejection and independent-oracle replacement.

No identifier collision was found. Similar phrases such as deletion test and vertical slice must remain distinct when their triggers/consumers differ. One live route collision remains open: the evidence reports a TDD utterance as `MULTI_SKILL` with brainstorm, which `LIVE-001` does not model.

## Denominator policy

Use **source floor + separate control ledger**:

1. Adopted source atoms are the non-negotiable denominator floor. Missing live behavior is a failed/unknown cell, never a reason to delete the atom.
2. Split composites, then expand live and independent replays until every source atom has a one-to-one semantic row or a justified consumer-specific one-to-many mapping.
3. Keep local harness/project/activation controls in a separate gating ledger. They can block the handshake but cannot substitute for a MATT-derived capability.
4. Keep unadopted HEAD deltas outside the denominator until an adoption record admits them.
5. Re-run the equality check. Any unmatched atom, composite, or true collision remains exit 33.

The current 196 is only a source floor, **not final N**. Intersection, majority vote, raw union, and reuse of legacy 47/57/60 denominators are all indefensible here.

<!-- FILE_END: census-reconciliation.md -->

