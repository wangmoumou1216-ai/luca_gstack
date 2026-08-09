# Cycle 2 census finalization

Status: **PASS for census finalization only**. This does not approve adoption, implementation, or activation.

## Final scope contract

The earlier independent verdict was correct to block a three-set equality join. The producer
inventories describe different scopes, so this finalization uses the independently recommended
policy without weakening any producer evidence:

1. The adopted capability denominator starts from every one of the **196 source rows**.
2. Local routing, project-isolation, agent, activation, verifier, and secret-safety invariants live
   in a separate **blocking control ledger**. A control can block handshake but cannot count as an
   adopted mattpocock capability.
3. The **73 upstream HEAD rows** live in a separate candidate ledger. They do not enter the adopted
   denominator before a governed adoption decision.
4. Live and independent rows remain evidence observations. They are fully crosswalked, but they are
   not forced into false one-to-one equality with source lineage.

The deterministic replay output is `reconciled-census.json`; the independent implementation is
`tools/replay-census.mjs` and does not import `tools/audit.mjs`.

## Exact counts

| Scope | Frozen producer rows | Final atomic rows | Denominator effect |
|---|---:|---:|---|
| Adopted source capabilities | 196 | **197** | This is final adopted `N` |
| Local gating controls | 25 live-only + 13 independent control observations | **50** | Blocks handshake; never increases adopted `N` |
| Unadopted HEAD candidates | 73 | **74** | Candidate-only; never increases adopted `N` |
| Final audit universe | — | **321** | `197 + 50 + 74` |

The two `+1` normalizations are required by the independent composite findings:

- Source `MATT-a0566b42dcc8` becomes `MATT-3ddacd9a5c11`
  (`reject-tautological-assertion`) and `MATT-4ab39f9b578a`
  (`replace-with-independent-expected-value`). The original source ID remains in exact lineage
  coverage and maps one-to-two; it is not silently deleted.
- HEAD candidate `MATT-fa7e31d36e28` becomes `MATT-c786c75d9ce5`
  (`environment-is-runtime-ssot`) and `MATT-8603aff9d903`
  (`cache-only-costly-to-reacquire-facts`). The original HEAD ID remains in exact candidate
  coverage and must be split before adoption.

## Independent findings resolved without erasure

- **61 source gaps:** every ID is retained from the source floor. A missing live or independent row
  is recorded as producer under-enumeration, not used to shrink the denominator. The JSON contains
  one `source_gap_resolution` row per gap, grouped across all 13 affected families.
- **25 live-only rows:** every ID maps to one or more content-addressed `CTRL-*` atoms. Broad rows
  are split at consumer boundaries; in particular `LIVE-092` becomes per route-target-harness
  controls, `LIVE-093` becomes per parent-reference-harness controls, and `LIVE-109` becomes three
  secret-sink controls.
- **Independent replay controls:** the 12 independent-only local-control rows plus the previously
  unclassified `IC-114` shared-target invariant all map to explicit controls. `IC-135` is routed to
  the candidate ledger, not the control ledger.
- **27 composite findings:** all have an explicit disposition. One source composite is split in the
  adopted denominator; three live control composites are split in the control ledger; one
  independent HEAD composite is split in the candidate ledger; the independent `IC-114`
  reachability composite is replaced by per-harness route controls plus one target-identity
  invariant. The other 21 producer composites remain evidence-only and are superseded by the more
  granular source atoms. None is promoted as a final composite atom.
- **All observations accounted:** exact resolution tables cover 109/109 live IDs and 135/135
  independent pre-join IDs. The final `unmatched`, `collisions`, and `composites` arrays are empty.

This is deliberately not a claim that the source, live, and independent sets are equal. The full
family crosswalk, every gap row, every composite disposition, and every observation-to-final-scope
mapping are preserved under `resolution` in `reconciled-census.json`.

## Frozen hashes

### Inputs

| Input | SHA-256 |
|---|---|
| `source-census.json` | `52803f08d60a54b03ad28bcca06d106b430de0d99dea9339ef3ee8c56eba3a0c` |
| `live-census.json` | `4c3c11cc953708c3791c8b2d1c629f0c63fd51ba165a8eee33b8bb9ff42adde5` |
| `independent-census.json` | `e9dcec5f7eb6959e823993189729cd5b26b6c24a4d134605fb6f0c73eee334e4` |
| `head-candidate-census.json` | `bd8a972587c2264317ff8ccef2b48ac004ca19548a81187f68aa042fa474ac25` |
| Independent immutable pre-join atoms | `d460284fb0c03afb53634dbf8c64229b49eae55c87a061bbbcb9761293ae5da4` |

### Final ledgers

| Canonical payload | SHA-256 |
|---|---|
| Adopted capability atoms | `aac53edc1845867541e2f6991aa17a7f439f1d15904a8dac0e23f8f401d3a877` |
| Gating control atoms | `974adad5a8c6ef002ebbb4322767657fc79e8b75ea21e98bf7192ce39bd378d3` |
| HEAD candidate atoms | `6b7f59c1789a97e1cee9298407163a38b742a1238ff19da02cc8355d3be13311` |
| Resolution ledger | `b97221e624ee38e9ae6f6e781b925b582f66d2c6851491e1bd1efb26e0483368` |
| Final audit universe | `b042af6dfc1952c5dd5711c04406ccfa0bc37404e8a2aa2ac9dcbba2c0d9ff34` |
| Serialized `reconciled-census.json` | `e40a466768a75f5f22776fa9ee4934978144d64e46ff7c28be3fa2e602241d5b` |

Canonical ledger hashes use recursive key-sorted JSON without insignificant whitespace. The file
hash covers the pretty-printed artifact exactly.

## Replay and bite verification

Run from the repository root:

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/replay-census.mjs \
  --out framework-audit/2026-08-09-mattpocock-handshake-cycle2/reconciled-census.json

node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/replay-census.mjs \
  --self-test
```

Observed results:

- Deterministic replay: `PASS`; a second output was byte-identical.
- Tampered source content ID: rejected.
- Tampered independent pre-join atom: rejected by the immutable pre-join hash.
- Removed unique control mapping: rejected as unmatched.
- Conjoined control effect: rejected as composite.

Any change to one of the four frozen producer files now fails at input SHA verification before a
new output can be written. Rebaselining those hashes is a new audit event, not an implicit refresh.

<!-- FILE_END: census-finalization.md -->
