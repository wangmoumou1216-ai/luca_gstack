Correction to C1: **58 unchanged target projections**, replacing “57.” Original **PASS (10/10)** stands.

Independent recomputation confirms:

- `targets.json`: 66 paths.
- Seal: 9 paths; **8 intersect the targets**.
- `CHANGELOG.md` is outside the 66.
- Therefore **66 − 8 = 58 unchanged targets**.

This was an arithmetic label error, not an omitted check. The original verification loop checked every target outside the seal intersection; all 58 were also independently rechecked against baseline Git bytes and hashes successfully. No tests rerun or artifacts modified.
