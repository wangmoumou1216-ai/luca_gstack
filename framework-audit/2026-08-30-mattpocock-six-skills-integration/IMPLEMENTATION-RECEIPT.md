# Matt Pocock Six-Skill Integration — Implementation Receipt

```yaml
receipt_schema: 1
state: VERIFIED
approved_plan_sha256: 1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9
plan_recorded_baseline: 4658595ac20ce544cb406657c70ba3259eb1f842
observed_baseline: 72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c
evidence_policy: final-master-v1
bootstrap_patch_sha256: EXTERNAL_BOOTSTRAP_MANIFEST
candidate_manifest_sha256: 85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac
runtime_denominator_rows: 81
implementation_allowlist_paths: 87
final_evidence_paths: 7
publish_paths: 88
flow_review: PASS:85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac
safety_review: PASS:85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac
quality_review: PASS:85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac
flow_review_eval: ea-u007-flow-20260831-r4:PASS:8/8
safety_review_eval: ea-u007-safety-20260831-r4:PASS:8/8
quality_review_eval: ea-u007-quality-20260831-r4:PASS:7/7
u002_corrective: COMPLETED:u002-codex37-20260831-r2:f520eb5a43767335e32846d2b7911a2312c830c323d534304da251d600c27739
u006_spec_review: PASS:ea-u006-spec-20260831-r5:9/9
u006_safety_review: PASS:ea-u006-safety-20260831-r6:7/7
```

The exact bootstrap patch SHA, manifest SHA, and every U-001/U-002 pre/post tuple live outside the
repository in `BOOTSTRAP-MANIFEST.tsv`. Keeping those values external avoids a self-referential
receipt blob. Gate A-bootstrap must bind that external payload to the approved plan SHA above.

## U-001 — controlled-change contract

- Candidate state: `PREPARED_FOR_EA1`
- Task ID formula: `matt-six-` + first 16 lowercase hex characters of the approved plan SHA.
- Durable state: task-local `required-witness.json`, `active-context.json`, and `receipt.json` only.
- Prepare serialization: exclusive advisory flock on the existing control-root directory inode;
  no lease file or additional persistent state path.
- CAS surface: repository identity, Git common-dir identity, observed HEAD, and every declared
  path/type/mode/blob tuple.
- Scratch authority: existing normalized realpath only, with repo/scratch ancestor overlap rejected
  before the required witness is written.
- Dormant activation: exact bootstrap patch+manifest SHA, plan/baselines, and current postimage set;
  producer and activation each rerun M6-A01/M6-A02 and compare exact output hashes.
- Crash recovery: same manifest and generation may resume witness/active/receipt writes; mismatched
  identity remains fail-closed. Terminal recovery removes only the active blob hash-bound into the
  terminal witness.

## U-002 — dual-harness guard

- Corrective closeout: controller generation `u002-codex37-20260831-r2`, manifest `f520eb5a43767335e32846d2b7911a2312c830c323d534304da251d600c27739`, state `COMPLETED`; installed `scripts/candidate-manifest.mjs` SHA-256 `be18edfc8f8810a7fbabbf2d5744269131fcf0d1cec36e3a5d476335f89db2f6`.
- Candidate state: `PREPARED_FOR_EA1`
- Claude registration: explicit controlled-change `PreToolUse` hook with witness-aware failure
  fallback.
- Codex registration: piggyback through the existing trusted project-scope entry.
- `.codex/hooks.json` invariant: bootstrap preimage and postimage are byte-identical.
- Active mode: only exact structured path actions, exact patch bytes, exact allowlisted read-only
  shell commands, or one-use gated effects are allowed.
- Patch/effect binding: `apply_patch` requires a lowercase exact SHA; effect authority binds exact
  command SHA + repo/cwd and is authorized/consumed by one-file witness CAS while active bytes stay
  stable. Consumption records `EFFECT_UNKNOWN` and cannot be reused or silently rebound.
- Inactive mode: ordinary tasks preserve the existing behavior.
- Failure boundary: adapter runtime throw/timeout consults the durable witness (required=deny,
  strict inactive=fail-open). Pre-execution syntax-byte corruption is the documented FINAL-MASTER
  §0.4 compromised-hook exclusion because remediation would change trusted command bytes.

## Source freeze

`SOURCE-MANIFEST.tsv` records explicit `upstream_source_root` and `legacy_root` columns, path type,
mode, SHA-256, provenance, and the frozen upstream commit. Empty roots are represented by `-`.
The `systematic-debugging` legacy tree and legacy resolving-conflict SKILL row are directly
selectable by `legacy_root`; consumers must not infer roots from `source_kind`.

## U-003 through U-008

| U-ID | Receipt state | Closeout evidence |
|---|---|---|
| U-003 | `VERIFIED` | Controller final generation `u003-codex37-20260831-r4`, manifest `2e8ebd58f9b31fb03a3192f19e728d6ff8e6f050f5835f26d8f043ff964e67d0`; three independent method bodies and named verification retained in the 81-row runtime freeze. |
| U-004 | `VERIFIED` | Controller generation `u004-codex37-20260831-r1`, manifest `8619ac89d48a3363c1d20fd9ee759b46414edf017404fcf0474c6130ef47f6e5`; three facade owner bindings retained in the runtime freeze. |
| U-005 | `VERIFIED` | Controller generation `u005-codex37-20260831-r3`, manifest `1b1cf55d59a5dd156fb3b26e72807c20049548093b498f6b1cda9ed4312642f0`; direct/semantic/internal, optional-flow, and dual-loader surfaces retained in the runtime freeze. |
| U-006 | `VERIFIED` | Controller generation `u006-codex37-20260831-r6`, manifest `1bee874b27cb9e43a477448f6a645d406653074e56e1d23e9eda1a9ba2a6c72b`; spec EA `ea-u006-spec-20260831-r5` PASS 9/9 and safety EA `ea-u006-safety-20260831-r6` PASS 7/7. |
| U-007 | `VERIFIED` | Runtime r5 manifest `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac`; flow `ea-u007-flow-20260831-r4` PASS 8/8, safety `ea-u007-safety-20260831-r4` PASS 8/8, quality `ea-u007-quality-20260831-r4` PASS 7/7. |
| U-008 | `NOT_STARTED_GATE_B` | No commit, private ref, push, or remote effect has been authorized or performed. |
## Personal cutover receipt

Both selected personal targets are actual `CUTOVER` decisions. The rows below bind the verified
target and recoverable backup tuples; they do not infer loader behavior that the live settings disable.

| Target | Decision | Preimage | Postimage | Backup | Rollback | Fresh loader |
|---|---|---|---|---|---|---|
| `/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md` | `CUTOVER` | `file:100644:5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de` | `file:100644:95eed4a2d01844c772cc61fe7f0b9843d9dfa3f1c5b5f15c0e928e35a71e071d` | `/Users/luca/.claude/skills/.luca-backups/1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9/resolving-merge-conflicts.SKILL.md` = `file:100644:5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de` | `PASS` | `PASS` — fresh Claude `user,project` probe returned the compat adapter under the recorded no-write sandbox. |
| `/Users/luca/.agents/skills/systematic-debugging/SKILL.md` | `CUTOVER` | `file:100644:9982f0cfae330af0cb94724c561688db39800012994322df43dafcda65a6a4c5` | `file:100644:52de09479bbaced8601b4862558d531e1cc21c9b63be89d64d962b2e4d4f052b` | `/Users/luca/.agents/skills/.luca-backups/1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9/systematic-debugging.SKILL.md` = `file:100644:9982f0cfae330af0cb94724c561688db39800012994322df43dafcda65a6a4c5` | `PASS` | `PASS_WITH_RECORDED_BOUNDARY` — roots/adapter are valid, while the actual fresh Claude `user,project` probe is disabled by the existing `skillOverrides=off`; this is not a claim that Claude loaded the skill. |
## Final review binding

Review state: `VERIFIED` for candidate manifest `85a6ac9b65d9f822c1255b4ccc499967bc2e9459a32440d1487c13ba6c5d73ac`.

The same frozen candidate plus reviewed receipt SHA-256
`84ed9d0eaf1842f16350bde916cbb2a056ce54713fcee688624f52f1623dc498` and ledger SHA-256
`bf8afc761d7de8aece887c97793d10b7a4f726c7aa6e596c06b0c912cb0547b7` received independent
flow `ea-u007-flow-20260831-r4` PASS 8/8, safety `ea-u007-safety-20260831-r4` PASS 8/8,
and quality `ea-u007-quality-20260831-r4` PASS 7/7. All current verdicts bind the exact r5 candidate.

The r4 reviews `ea-u007-flow-20260831-r2`, `ea-u007-safety-20260831-r2`, and
`ea-u007-quality-20260831-r2` bound superseded manifest
`2c97033e69b1e749a685fb1155089e6b9dbaa69734ae6b04eceee4f735dc86c2`. They remain historical
PASS records but are non-binding for this r5 candidate after the U-002 corrective changed runtime bytes.

The fixed `final-master-v1` evidence policy contains exactly seven paths. The publish set is exactly
81 frozen runtime rows plus those seven evidence paths, for 88 sorted unique paths.

<!-- FILE_END: IMPLEMENTATION-RECEIPT.md -->
