# Cycle 2 Round-1 Closure Rerun C — Scope / Executability

Candidate SHA-256: `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c`

- Reviewer receipt: `C2-R1-RERUN-CLOSURE-SCOPE-20260809T081348Z-1964e44d`
- Review posture: default `REFUTE`; only `AFFIRM` when no BLOCKER/MAJOR remains open.
- Boundary: fresh read-only review of Plan-first authority, complete WP cards, CWD/key resolution, owner/files/command producers, human gates, DAG, DEV/TEST separation, rollback and hard stops. The review did not modify Plan, ADR, matrix, bundle or freeze. Future implementation not existing yet is not itself a Plan finding.

## Frozen identity and mechanical rerun

- The Candidate bytes and `candidate-plan-freeze.sha256` both resolve to the exact SHA above.
- Bound ADR SHA is `4134996ac6c131f0b919b639537013406272ef91c3763bf24ec131187393a3db`; bound source-bundle SHA is `58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`; OS byte-anchor SHA is `6cdd7f72de0a8fe22c7db1681aaa82d57f8bbdd94e0f3f74c8750cb7439c04ac`.
- The Plan-literal OS-anchor command passed against all 18 source-bundle members and the physical repository device/inode. `audit.mjs source-bundle`, manifest validation and harness-matrix validation also passed: 321 decisions, 197 adopted atoms, 321 matrix atoms, 2,568 T/E/D/V cells, 2,576 receipts and four native roles.
- `run-fixtures.mjs candidate-plan` passed with 16 work packages / 321 atoms; `freeze` passed with the exact Candidate SHA.
- Independent field parsing found 16/16 WP cards and no missing `Owner/CWD/Files/Inputs/Command/Expected/Receipt/Rollback/Dependencies` field.
- Independent closed-set parsing found 62 entries / 62 unique values. All 83 key-flag occurrences (59 unique referenced values) are members of that set; missing=`[]`, duplicate=`[]`. This includes `cycle2-audit-root` and `h0-approval`.
- WP-08 CWD key = Command key = `resolving-merge-conflicts`, and both are in the closed set. WP-09 CWD key = Command key = `teach`, and both are in the closed set.

## Prior BLOCKER / MAJOR closure

| Finding | Status | Fresh closure evidence |
|---|---|---|
| R1C-01 — WP-13/H4a/WP-14 cycle | **CLOSED** | The only activation path is `WP-13-BUILD → H4a → WP-13-NATIVE → WP-14 → H4b → WP-15`; BUILD, native proof, acceptance and cutover do not wait on each other cyclically. |
| R1C-02 — competing R6 native contracts | **CLOSED** | Plan and `ADR-ACT-001` contain the same two exact H4a commands, envelope/approval/descriptor/receipt keys and sole success token `WP13_R6_NATIVE_PASS`. |
| R1C-03 — bootstrap roles self-produce/self-attest | **CLOSED** | Existing `bootstrap-main` produces dormant role assets while a different existing quality-gate session freezes them; new roles are unusable before WP-05 PASS. |
| R1C-04 — candidate roots produced after consumers | **CLOSED** | WP-00-PREP freezes the envelope, transaction checkout and all candidate roots before capability WPs; consumers use enumerated keys. |
| R1C-05 — concurrent ownership of shared files | **CLOSED** | The DAG serializes WP-02→03→04, and section 7.1 gives each shared surface ordered writer epochs plus pre/post-hash handoff. |
| R1C-06 — WP-11 could run before WP-06..10 | **CLOSED** | Both DAG and WP-11 Dependencies require WP-06, WP-07, WP-08, WP-09 and WP-10 candidate freezes. |
| R1C-07 — H0 executor/payload had no pre-gate producer | **CLOSED** | EXEC-START authorizes audit-local BOOTSTRAP/PREP only; existing independent quality-gate freezes TCB, envelope and exact H0 proposal before the new user approval turn. |
| R1C-08 — governance states/owners conflicted | **CLOSED** | Section 7.2 has one R→A→B→C→VERIFIED transition per file/fact, with pending versus final adoption separated and zero writes after VERIFIED. |
| R1C-09 — H1 rollback could restore unsafe resolver | **CLOSED** | Before first edge there is zero mutation; after first edge the only recovery is roll-forward to stub/absent + deny. Restoring the dangerous target is prohibited. |
| NS-01 — H1 preceded containment payload freeze | **CLOSED** | The path is PREP → independent freeze=`WP02_PAYLOAD_FROZEN` → H1 binding → TCB EXEC → independent verify. |
| NS-02 — H4a commands bypassed execution envelope | **CLOSED** | Both exact native entries carry `--execution-envelope` and resolve approval, descriptor and receipt only by frozen keys. |
| NS-03 — BUILD verifier lacked an owner/producer | **CLOSED** | Product BUILD verifier is explicitly owned by WP-13; the candidate cannot issue the green token, which comes only from WP-00's independent frozen verifier. |
| NS-04 — G-REVIEW lacked executor/result/dependency | **CLOSED** | WP-01 and `ADR-GATE-001` specify prepare, exact user binding, path-limited CAS/ff-only landing and independent read-back; WP-13 consumes `G_REVIEW_R_OBSERVED`. |
| NS-05 — WP-14 used a wrong raw WP-13 receipt path | **CLOSED** | WP-14 consumes only `--require-wp13-summary-key wp13-r6-summary` and requires key/path/envelope substitution failures. |
| NS-06 — human bindings lacked an executable trust boundary | **CLOSED under the declared threat model** | `ADR-GATE-001` names trusted top-level `bootstrap-main`, requires a new exact `role=user` turn and closed-stdin TCB recorder, rejects replay/self-authored text, and fails `BLOCKED_HUMAN_CHANNEL` when the harness cannot provide that turn. H0/G-REVIEW/H1/H4a/H4b each have an exact recorder argv. |
| NS-07 — WP-02 command producers/verifiers were unowned | **CLOSED** | WP-02 Files assigns all three product scripts to DEV and the executor/independent verifier to WP-00 TCB; product receipts are explicitly untrusted. |
| NS-08 — ambient CWD/two-checkout commands were ambiguous | **CLOSED** | Every WP has a mandatory CWD; envelope freezes absolute path/device/inode/HEAD/tree for all three checkout keys; TCB uses FD-rooted `fchdir`/CAS; WP-00 two-checkout reads use exact absolute `git -C`. |
| FC-SCOPE-001 — execution-key manifest omitted referenced keys | **CLOSED** | The frozen closed set now includes the dedicated bootstrap-root `cycle2-audit-root` and receipt `h0-approval`; the strengthened validator and the independent reference⊆closed-set scan both pass with no missing or duplicate key. |
| FC-SCOPE-002 — WP-08/WP-09 CWD keys disagreed with commands | **CLOSED** | WP-08 is uniformly `resolving-merge-conflicts`; WP-09 is uniformly `teach`; both CWD declarations equal their command flags and are closed-set members. |

## New material findings

None. No BLOCKER or MAJOR remains open in this review boundary.

Plan-first authority remains explicit: H3 approves only the Plan, while EXEC-START and later human gates independently authorize the limited execution stages. The 16-row DEV/TEST matrix separates producer and verifier sessions, candidate/product receipts cannot self-promote, and the rollback/hard-stop contracts prohibit broad reset/clean, guessed repair, automatic pull/merge/push, unsafe resolver restoration and live activation without H4b.

## Verdict

**AFFIRM**

Against Candidate `1964e44d…`, the execution-key exact set, WP-08/WP-09 CWD contracts and every previously open scope/executability finding are closed. The Plan is sufficiently single-valued to proceed to the remaining independent reviewers and judge; this receipt does not claim that any future implementation or activation has already run.

<!-- FILE_END: round1-rerun-closure-scope.md -->
