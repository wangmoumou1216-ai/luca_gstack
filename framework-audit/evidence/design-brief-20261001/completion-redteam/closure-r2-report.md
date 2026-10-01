Quality Gate: MR-004/005 closure r2
**FAIL (7/10) — publication blocked.**

- **C1 PASS:** All 9 candidate hashes match `candidate-seal-r2.json`; reconstructed diff matches exactly. All 66 baseline targets and unchanged candidate projections match.
- **C2 PASS:** Independent ordinary tests reject repeated-target and ancestor conflicts using the final binding gate.
- **C3 PASS:** Tests verify deduplication, siblings, illegal targets, NEEDS_CONTEXT, early preserve-only and final no-change rejection.
- **C4 PASS:** Canonical structured Packet tests reject forged caller IDs and consistently rehashed false indexes during readback.
- **C5 FAIL:** Free Markdown containing the prose example `"packet_kind":"design-generation"` is rejected with `PACKET_REFREEZE_REQUIRED` when attachments exist. This breaks legacy transport preservation.
- **C6 FAIL — MAJOR:** `design-flow-handoff.mjs:958` matches literal text. Remove the Packet heading and escape the key as `"packet\u005fkind"`, or damage the heading and escape the value as `"\u0064esign-generation"`. Both JSON payloads independently parse to actual `packet_kind === "design-generation"`, yet attachments citing `ABSENT-FACT` produce **EXPORTED / unverified-source-index** and **STAGED** under exact simulated readback.
- **C7 PASS:** Brief 3.0.1, OD 4.0.1, runtime, templates and sealed upstream/downstream projections align; C5/C6 are enforcement defects.
- **C8 PASS:** Audit retains A1/Q-03 UNKNOWN, original FAIL 3/7 and closure FAIL 8/10. Production invocation, global ranking, certification and live OD visuals remain unclaimed.
- **C9 FAIL:** The declaration bypass and prose false positive remain unresolved.
- **C10 PASS:** Raw red/green and 40 mutation results support their tested partitions. Independent ordinary suites and four syntax checks exit 0. Full repository/commit gate remains pending.

Recommendation: distinguish actual structured declarations from prose and recognize JSON escapes; add these independent negatives, reseal and re-review. No reviewed files, ledger or state were modified.
