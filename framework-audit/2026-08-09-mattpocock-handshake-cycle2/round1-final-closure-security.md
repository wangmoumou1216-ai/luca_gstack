# Cycle 2 Round 1 Final Closure — Harness / Security / Architecture

Candidate SHA-256: `25d948168640d6ec23a7f9a5f06e74f22ad4057039b6c17cc98e99ee3ec8c12d`

- Reviewer receipt: `R1-FINAL-CLOSURE-SECURITY-19C51699-1F6C-4B78-BEF6-5CE5F0CE5F0F`
- Scope: frozen Plan, ADR, source bundle, matrix and existing read-only validators only.
- Boundary: absence of future WP-00/WP-13 implementation is not a finding; this review records only contradictions already present in the frozen execution contract.

## Frozen-byte and positive-control checks

- Candidate bytes and `candidate-plan-freeze.sha256` both match the requested SHA.
- Plan-bound ADR, matrix and source-bundle bytes match their current files: ADR `4134996a…3a3db`, matrix `c0ddd7da…548cc`, bundle `76592b91…6cd3`.
- The Plan-literal OS anchor executed successfully against 18 members. All presently frozen source files inspected for the trust path are regular, non-symlink files with `nlink=1`; the earlier matrix hardlink was removed by byte-identical exclusive reconstruction.
- Repository secondary validators report: source bundle 18/18 PASS, manifest 321 decisions / 197 adopted atoms PASS, matrix 321 rows / 2,568 cells / 2,576 receipts PASS.
- Candidate-plan and freeze fixtures PASS with the 321-ID decision universe. Their current omission of the closed-key contradiction below is not treated as proof that the future PREP exact-set gate can pass.

## BLOCKER / MAJOR findings

| ID | Severity | Status | Exact evidence and impact | Required closure |
|---|---|---|---|---|
| `SEC-FC-001` | **BLOCKER** | **OPEN** | **The Plan's declared closed execution-key set omits two values that its own exact commands require.** Plan line 85 says PREP mechanically extracts **all** `--*-key` / `--receipt-prefix-key` values from the frozen Plan and exact-set compares them with `execution-key-manifest`; a missing key must fail before freeze. Line 157 contains `--bootstrap-root-key cycle2-audit-root` and H0 recorder `--receipt-key h0-approval`. The frozen closed-set enumeration at line 87 contains neither `cycle2-audit-root` nor `h0-approval` (mechanical readback returned `MISSING_FROM_FROZEN_CLOSED_SET` for both). Therefore conforming PREP has only two impossible choices: reject the candidate at WP-00, or silently violate the exact-set/closed-world rule. This is a deterministic execution blocker, not missing implementation. | Add `bootstrap root=cycle2-audit-root` and receipt/result `h0-approval` with their unique canonical relative locations to the frozen closed set. If the bootstrap root is intentionally outside the envelope manifest, line 85 must explicitly exclude only `--bootstrap-root-key` from envelope extraction and exact-check it against a separate one-element compiled bootstrap set; `h0-approval` still belongs in the receipt set. Add a present-day fixture that extracts every key-bearing flag and proves exact equality with the declared set, then re-freeze and re-review. |

No additional open `BLOCKER` or `MAJOR` was found in the reviewed security/architecture domains.

## Attack closure status

| Attack surface | Status | Closure evidence |
|---|---|---|
| OS-anchor self-authentication | **CLOSED within the declared trusted-main boundary** | Plan line 157 binds `os-byte-anchor.sh` to a Plan-literal SHA using root-owned absolute OS tools before repository JavaScript executes; the script is itself a bundle member. ADR-GATE-001 explicitly places an arbitrary unsandboxed top-level main outside the enforceable adversary model rather than claiming impossible protection from that authority. |
| Source path / inode / `nlink` substitution | **CLOSED** | The anchored script traverses from physical repository directory FDs with `O_NOFOLLOW`, requires exclusive regular files, rejects inode aliases, holds verified FDs, reopens by pathname and checks byte/identity equality. Plan requires identical pre/post anchor runs around secondary validators. Current source identities satisfy `nlink=1`. |
| Pre-envelope bootstrap recursion | **CLOSED except `SEC-FC-001` enumeration** | Plan lines 83–85 define one compiled `cycle2-audit-root`, `openat`/`mkdirat` traversal from the canonical checkout FD, and O_EXCL creation by receipt key; the PREP command no longer accepts raw `--receipt`. The root key's missing closed-set classification remains the blocker above. |
| Ancestor symlink / parent swap / hardlink / final alias | **CLOSED** | ADR lines 73–83 require one held directory-FD chain, per-level device/inode checks, final `O_EXCL|O_NOFOLLOW`, `nlink=1`, same-FD readback and fsync. Plan lines 157–158 require every-boundary mutations and zero file outside the authorized root. |
| Ambient CWD substitution | **CLOSED** | Plan line 83 makes CWD mandatory and routes naked argv through the TCB executor's opened directory FD plus `fchdir`/HEAD/tree CAS; WP-00A uses an explicit absolute canonical CWD and Git reads use absolute `git -C`. |
| Trusted-main human-gate boundary | **CLOSED / honestly bounded** | Plan line 101 and ADR lines 35–63 require a new exact top-level user turn after a write-once proposal, closed stdin into the recorder, O_EXCL binding and fail-closed `BLOCKED_HUMAN_CHANNEL`. They explicitly do not claim cryptographic protection against the trusted main already acting as Luca. |
| G-REVIEW evidence | **CLOSED** | R is independently frozen before proposal; exact user binding precedes the TCB `land-review` edge; `G_REVIEW_R_OBSERVED` requires independent ref/index/worktree readback. Wrong parent/tree/manifest, dirty checkout and partial state fail without reset/guess repair. |
| H1 evidence and unsafe rollback | **CLOSED** | Product checks are explicitly untrusted; WP-00 independent PREP verifier binds descriptor/executor/old/stub/quarantine before H1. Post-edge recovery can only roll forward to stub/absent and never restores the unsafe resolver. |
| H4a/H4b evidence separation | **CLOSED** | H4a binds a synthetic-only descriptor and no future summary; H4b uses a distinct production descriptor and binds the verified H4a summary plus WP-14 and exact R/A/B/C manifests. Product BUILD receipts cannot emit the trusted green token. |
| R/A/B/C fixed points | **CLOSED** | B bytes contain only transaction/epoch; exact B OID and full route-file SHA are externalized into H4b, then the gate binds descriptor SHA in one direction. C names only the predetermined transaction/public-bundle logical identity and contains no future terminal hash. |

## Terminal verdict

`REFUTE`

The security architecture is materially stronger and the two earlier trust/path blockers are substantively closed. However, the frozen closed-key manifest is not actually closed over its exact commands. Because conforming WP-00 PREP must reject the missing `cycle2-audit-root` and `h0-approval` values, this SHA cannot receive an AFFIRM.

<!-- FILE_END: round1-final-closure-security.md -->
