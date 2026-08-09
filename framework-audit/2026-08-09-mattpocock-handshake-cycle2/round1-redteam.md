# Cycle 2 — Redteam Round 1 closure

Candidate SHA-256: `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c`

- Reviewer receipt: `R1-RERUN-INVENTORY-B2DF9F2E-35AE-4405-8503-D4122F010BFA`
- Reviewer receipt: `R1-RERUN-CLOSURE-SECURITY-F1182069-BF2F-4ED8-BC8C-DD653709F941`
- Reviewer receipt: `C2-R1-RERUN-CLOSURE-SCOPE-20260809T081348Z-1964e44d`

## 审查域

- Inventory / lineage：321 appendix exact set、197/50/74 分母、WP mapping、live-probe binding、freeze 与无自引用。
- Harness / security / architecture：OS trust anchor、18-member bundle、source inode/nlink、pre-envelope bootstrap、FD-rooted receipt writer、human gate、G-REVIEW/H1/H4、R/A/B/C fixed-point elimination。
- Scope / executability：Plan-first authority、16 WP 九字段、CWD/key closure、exact commands、DEV/TEST separation、dependencies、rollback 与 hard stops。

## Finding closure

| Severity | Finding | Status | Closure evidence |
|---|---|---|---|
| BLOCKER | Inventory denominator/appendix/WP mapping could be incomplete or laundered | CLOSED | Independent parse: 321 rows / 321 unique / 0 duplicate / 0 missing / 0 extra / 0 wrong-WP；197 adopted + 50 controls + 74 HEAD。 |
| BLOCKER | Source bundle authenticated itself through a bundled validator | CLOSED | Plan-literal SHA first anchors `os-byte-anchor.sh`; it FD-verifies bundle + 18 exclusive regular members before repository Node validators run。 |
| BLOCKER | Ancestor symlink/parent swap/hardlink could redirect trusted receipt writes | CLOSED | Bootstrap and secure writer use fixed root key, segment-wise `openat(O_NOFOLLOW)`, held FD chain, device/inode checks, O_EXCL final, nlink=1 and same-FD readback；negative mutations are mandatory。 |
| BLOCKER | Human gates had no executable cross-harness approval writer | CLOSED | `ADR-GATE-001` names trusted top-level bootstrap-main as recorder authority, exact reply syntax, frozen recorder/secure writer and explicit non-cryptographic trusted-main boundary；missing user-turn channel blocks。 |
| BLOCKER | G-REVIEW lacked exact result/observation binding and WP-13 dependency | CLOSED | Full prepare/record/land/verify argv；only independent readback emits `G_REVIEW_R_OBSERVED`, and WP-13/WP-15 consume that token。 |
| BLOCKER | Closed execution-key manifest omitted command keys | CLOSED | Added `cycle2-audit-root` and `h0-approval`; strengthened candidate validator mechanically enforces every referenced key is in the closed set and detects duplicates；62/62 closed, 59 unique references。 |
| MAJOR | WP-02 product/independent verifiers or ownership were not executable | CLOSED | Files own both product verifiers; PREP/product/freeze/record/execute/product-post/independent-post commands and receipt keys are exact。 |
| MAJOR | WP-08/WP-09 CWD aliases disagreed with command candidate keys | CLOSED | Both now match exactly: `resolving-merge-conflicts` and `teach`。 |
| MAJOR | WP-14 consumed an out-of-contract raw receipt path | CLOSED | It consumes envelope key `wp13-r6-summary`; substitution tests and closed key mapping are mandatory。 |
| MAJOR | Runtime command CWD and evidence roots were ambient/ambiguous across two checkouts | CLOSED | Every WP has CWD; TCB binds canonical/stale/transaction directory identities and all receipt outputs use enumerated key/prefix contracts。 |

## Mechanical receipts

- OS byte anchor: PASS, 18 members.
- Architecture: PASS, five exact ADRs.
- Manifest: PASS, 321 decisions / 197 adopted manifest atoms.
- Harness matrix: PASS, 321 rows / 2,568 cells / 2,576 receipts.
- Candidate Plan: PASS, 16 work packages / 321 exact appendix rows.
- Freeze: PASS, exact Candidate SHA above.

## Round verdict

`ROUND_1_CLOSED`

All three independent reviewers returned **AFFIRM** against the same frozen candidate. No open BLOCKER or MAJOR remains in Round 1.

<!-- FILE_END: round1-redteam.md -->
