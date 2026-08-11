# Cycle 2 dual-harness matrix validation

Status: **PASS (Plan contract only; no current-runtime PASS is asserted)**

The final JSON-compatible YAML matrix covers the exact reconciled audit universe:

- adopted capability atoms: 197
- framework control atoms: 50
- upstream-HEAD candidate atoms: 74
- total rows: 321, with no extra or duplicate ID
- cells: 2,568 (`321 × Claude/Codex × Trigger/Execute/Degrade/Verify`)
- cell receipts: 2,568 unique paths
- native-role receipts: 8 additional unique paths
- native logical roles: exactly `plan-agent`, `work-agent`, `oracle`, `quality-gate`

Every cell contains `status`, an exact future command, an observable expected result, and a unique
receipt path. Status vocabulary is limited to `PLANNED`, `BLOCKED_CURRENT`, `DECISION_GATED`, and
`N/A`; none of these values claims that the corresponding future verifier currently passes.

## Positive validation

Command:

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/audit.mjs harness-matrix \
  --universe framework-audit/2026-08-09-mattpocock-handshake-cycle2/reconciled-census.json \
  --matrix framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml
```

Result: exit `0`, structured `PASS`, 321 rows, 2,568 cells, 2,576 unique atom/role receipt paths.

The builder reproduced the same result and then ran the four required mutations:

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/build-harness-matrix.mjs \
  --universe framework-audit/2026-08-09-mattpocock-handshake-cycle2/reconciled-census.json \
  --decisions framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json \
  --out framework-audit/2026-08-09-mattpocock-handshake-cycle2/harness-matrix.yaml \
  --negative-bite
```

## Negative bite

Each mutation was written only to a generated temporary directory, passed through the same strict
validator, and had to return structured `FAIL` with exit `41`:

| mutation | required result | observed |
|---|---|---|
| delete one T/E/D/V cell | reject | `REJECTED_AS_REQUIRED`, exit 41 |
| forge `N/A` on an applicable Claude control cell | reject | `REJECTED_AS_REQUIRED`, exit 41 |
| reuse another cell's receipt path | reject | `REJECTED_AS_REQUIRED`, exit 41 |
| remove the `oracle` role contract | reject | `REJECTED_AS_REQUIRED`, exit 41 |

`N/A` is accepted only for the 32 adopted personal `teach` atoms on the Codex side. All 128 such
cells still execute the mechanical `no-project-route` proof; an empty or prose-only exception fails.
HEAD `DEFER` and `REJECT` cells on both harnesses are forced through the governed decision checker
and a zero-new-surface assertion. HEAD `KEEP` uses the same no-new-surface discipline while retaining
any explicitly pinned, already-covered baseline behavior.

## Integrity

- `harness-matrix.yaml`: `f7584aa8498eed4eb502ad4453cea48a8c8bda85d7c29fa893824f0fde4a2b4f`
- `tools/build-harness-matrix.mjs`: `7c5c197e63987bb00cc285d498af132d9eacf6c3c2d790fb2007269cede7e04e`
- `tools/audit.mjs`: `93c54027655674b1eacf5e812e4ee4d33305e5bd1cf2d9681234c7bbe087a99b`
- input `reconciled-census.json`: `e40a466768a75f5f22776fa9ee4934978144d64e46ff7c28be3fa2e602241d5b`
- input `decision-map.json`: `f76056e4a7d9c510d4c4a0e79fc8dea6e2b3c7dae312aa4a54d4ce17d9f4967b`

The matrix is a future execution contract. Its verifier paths deliberately point at work-package
deliverables that do not exist yet; candidate-Plan approval therefore authorizes implementation of
those contracts, not live/global activation and not a claim of present dual-harness parity.

<!-- FILE_END: harness-validation.md -->
