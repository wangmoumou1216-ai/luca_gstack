Quality Gate: MR-004/005 closure
**FAIL (8/10) — publication blocked by one surviving MAJOR.**

- **C1 PASS:** seal hashes match all 9 files; combined diff independently reconstructs them. All 66 baseline targets match.
- **C2 PASS:** independent ordinary tests reject same-target and ancestor conflicts; `needs_context` prohibits binding/execution.
- **C3 PASS:** tests confirm deduplication, legal siblings, illegal-target rejection, and separate early preserve-only/final no-change rules.
- **C4 PASS:** valid structured Packet IDs come from actual bytes; forged caller IDs and rehashed false readback fail.
- **C5 PASS:** tests preserve legacy bytes, explicit unverified metadata, and attachment-free wire identity.
- **C6 FAIL — MAJOR:** `design-flow-handoff.mjs:957` recognizes malformed declarations only when the first payload line starts with lowercase ` ```json `. Keep `# Design Generation Packet`, change that fence to ` ``` ` or ` ```JSON `, and cite `ABSENT-FACT`: independent memory probes return **EXPORTED / unverified-source-index**, then exact simulated readback returns **STAGED**. Missing fences or intervening text also bypass rejection. This contradicts output-templates.md:183.
- **C7 PASS:** intended owner contracts and patch versions align; unchanged projections retain sealed bytes. C6 is an enforcement defect.
- **C8 PASS:** audit draft explicitly retains A1/Q-03 UNKNOWN and original 3/7 FAIL; production invocation/live OD/visual proof remains unclaimed.
- **C9 FAIL:** C6 leaves an in-scope MAJOR unresolved.
- **C10 PASS:** raw red failures and named restored mutation results are meaningful. Independent ordinary suites exit 0; full repository gate is explicitly pending.

Recommendation: reject malformed declared Packet envelopes regardless of fence corruption; add these negatives and obtain fresh sealed review. No reviewed files were modified. No network, GUI, project operations, or live OD ran.
