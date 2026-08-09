# Cycle 2 manifest validation

Status: **PASS** for the decision-map and adopted atomic-manifest contract.

## Frozen outputs

- `decision-map.json`: 321/321 explicit decisions.
  - adopted lane: 197
  - control lane: 50
  - unadopted HEAD lane: 74
  - unmatched / unexpected / collisions: 0 / 0 / 0
- `atomic-manifest.yaml`: JSON-compatible YAML containing only the adopted denominator, N=197.
  - `coverage.source_ids`, `coverage.live_ids`, and `coverage.independent_ids` are each the same sorted 197 normalized final IDs.
  - unmatched / collisions / composites: 0 / 0 / 0
- Decision totals across the 321-row audit universe:
  - ADAPT: 177
  - KEEP: 95
  - DEFER: 19
  - REJECT: 27
  - QUARANTINE: 3

HEAD decisions are copied without re-adjudication from `head-decision-map.json`: ADAPT 10, KEEP 18,
DEFER 19, REJECT 27. Each row retains the canonical reason, decision scope, and full work-package
name while also exposing the plan-level `WP-xx` identifier.

## Provenance closure

Every adopted manifest row is rebuilt field-by-field rather than spread from a census row. Its
provenance is resolved against `origin-ledger.json` by exact `(commit, path)` identity and includes
the ledger's blob OID, SHA-256, byte count, source range, and EOF receipt.

The two normalized children `MATT-3ddacd9a5c11` and `MATT-4ab39f9b578a` resolve through
`source_parent_ids = [MATT-a0566b42dcc8]` before their shared origin blob is attached. The composite
parent itself is absent from the N=197 manifest.

## Fresh verification evidence

Build command (run twice):

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-manifest.mjs build
```

Both runs returned the same hashes:

- `decision-map.json`: `f76056e4a7d9c510d4c4a0e79fc8dea6e2b3c7dae312aa4a54d4ce17d9f4967b`
- `atomic-manifest.yaml`: `69af68294271995a4f130541698b87f65f10f59bd1f956212e69125dfa7afb48`

Positive validation:

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-manifest.mjs validate
```

Observed: exit 0, `PASS`, 321 decisions, 197 manifest atoms, with the same two hashes above. The
validator executes the constraints in `schemas/atomic-capability.schema.json` (including required
fields, types, enums, patterns, `additionalProperties: false`, array bounds, and uniqueness) and
then checks decision, lineage, ledger, target, and coverage semantics.

Negative schema bite:

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-manifest.mjs make-negative \
  --out /private/tmp/cycle2-manifest-missing-sha.json
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-manifest.mjs validate \
  --manifest /private/tmp/cycle2-manifest-missing-sha.json
```

The mutation deletes `atoms[0].provenance[0].sha256`. Validation returned the expected exit 51 and
reported both the schema error (`missing required property sha256`) and the independent semantic
error (`provenance is not exact origin-ledger identity`). This proves the validator rejects a
provenance omission rather than merely accepting well-formed JSON.

<!-- FILE_END: manifest-validation.md -->
