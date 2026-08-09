# Cycle 2 Round 1 Closure Rerun — Harness / Security / Architecture

Candidate SHA-256: `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c`

- Reviewer receipt: `R1-RERUN-CLOSURE-SECURITY-F1182069-BF2F-4ED8-BC8C-DD653709F941`
- Verdict: `AFFIRM`
- Scope: fresh review of the frozen Plan, ADR, harness matrix, source bundle and present-day read-only validators. Future WP-00/WP-13 implementation is not presumed complete; this verdict means the frozen execution contract has no remaining security/architecture `BLOCKER` or `MAJOR` contradiction.

## Frozen-byte and mechanical controls

- Candidate bytes and `candidate-plan-freeze.sha256` both resolve to the requested SHA-256.
- Plan-bound inputs match current bytes: ADR `4134996ac6c131f0b919b639537013406272ef91c3763bf24ec131187393a3db`, matrix `c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc`, source bundle `58e0f7f20bfcab7410d4f0fd308447ab734ad4c77db3f8d7132603d64f600f52`, fixture validator `62dbad724ab813be12977978d665c48139dea14df23fb6fadaeb8c21d8bae856`, and OS anchor `6cdd7f72de0a8fe22c7db1681aaa82d57f8bbdd94e0f3f74c8750cb7439c04ac`.
- The Plan-literal OS anchor passed before and after repository validators: 18 members, fixed bundle SHA, fixed repository device/inode, and every held/reopened source was an exclusive regular file with `nlink=1`.
- Repository validators passed: source bundle 18/18; decision/manifest 321/197; matrix 321 atoms, 2,568 cells, 2,576 receipts and four logical roles.
- `candidate-plan`, `freeze`, and `architecture` fixtures all passed. Independent key extraction found 62 declared unique values: 59 unique key-bearing command values plus the three mandatory CWD keys. There are no missing or duplicate values. The repaired set now contains both `cycle2-audit-root` and `h0-approval`.

## BLOCKER / MAJOR closure ledger

| ID / attack | Severity | Status | Closure evidence |
|---|---:|---|---|
| `SEC-FC-001` closed-key omission | BLOCKER | **CLOSED** | The frozen closed set now includes bootstrap root `cycle2-audit-root` and receipt `h0-approval`. `run-fixtures.mjs` rejects a referenced key absent from the declared set and rejects duplicate declarations; the current frozen union was also independently compared in both directions. |
| OS-anchor self-authentication | BLOCKER | **CLOSED within the declared authority boundary** | Root-owned absolute OS tools verify the Plan-literal anchor SHA before repository JavaScript. The anchor then verifies the Plan-literal bundle SHA and all member bytes from physical directory FDs. The ADR explicitly excludes an arbitrary unsandboxed top-level process already acting as Luca instead of claiming protection it cannot enforce. |
| Source symlink, inode alias, hardlink or parent replacement | BLOCKER | **CLOSED** | The anchor traverses with directory FDs and `O_NOFOLLOW`, requires regular files with `nlink=1`, rejects duplicate device/inode identities, holds verified FDs, reopens each pathname, and compares identity and bytes. Identical pre/post anchor runs surround the secondary validators. |
| Pre-envelope bootstrap recursion / raw-path escape | BLOCKER | **CLOSED** | The only bootstrap root is a compiled `cycle2-audit-root`; traversal starts from the opened canonical-checkout FD and uses fixed `openat`/`mkdirat` segments. The first envelope is O_EXCL-published by the enumerated `execution-envelope` receipt key. No raw receipt, free root or symlink ancestor is accepted. |
| Receipt publication ancestor swap / hardlink alias | BLOCKER | **CLOSED by the frozen implementation contract** | The TCB writer must retain the directory-FD chain, verify each frozen device/inode, create via `openat(O_CREAT|O_EXCL|O_NOFOLLOW)`, require final `nlink=1`, read back through the same FD, and fsync the file and parent chain. Boundary mutations and authorization-root escape are mandatory negative tests before any gate can consume a receipt. |
| Ambient CWD / wrong-checkout execution | MAJOR | **CLOSED** | WP CWD is mandatory. The TCB executor opens the envelope-selected directory, verifies path/device/inode/HEAD/tree, performs `fchdir`, then spawns exact argv. WP-00A fixes the absolute canonical CWD and all cross-checkout Git reads use absolute `git -C`. |
| Trusted-main human-gate forgery claim | BLOCKER | **CLOSED / honestly bounded** | ADR-GATE-001 requires a write-once proposal, a later exact top-level `role=user` turn, closed stdin to the recorder, an O_EXCL binding, and `BLOCKED_HUMAN_CHANNEL` when that native event is unavailable. It protects against child/candidate replay and payload drift, and explicitly does not assert cryptographic protection against the trusted main already operating as Luca. |
| G-REVIEW self-issued or stale evidence | BLOCKER | **CLOSED** | Exact R OID/tree/parent/path manifest and executor are independently frozen before proposal. The human binding precedes the leased CAS/ff-only edge, and only independent ref/index/worktree readback can issue `G_REVIEW_R_OBSERVED`; partial state stops for manual recovery without reset or guessed repair. |
| H1 pre-approval payload or unsafe rollback | BLOCKER | **CLOSED** | WP-02-PREP freezes executor/envelope/old/stub/quarantine/descriptor before the H1 proposal. Product receipts are untrusted. After the first edge, recovery is roll-forward only to stub/absent and never restores the known-dangerous resolver. |
| H4a/H4b authorization conflation | BLOCKER | **CLOSED** | H4a binds a synthetic-only descriptor, exact executable contract and fault matrix without binding a future summary. H4b requires a distinct production descriptor and binds the independently verified H4a summary, WP-14 and exact R/A/B/C identities. Either descriptor appearing in the other gate's target class fails. |
| R/A/B/C or descriptor/gate fixed point | BLOCKER | **CLOSED** | B contains only transaction/epoch; its OID and complete route-file SHA are bound externally after authoring. The root gate then binds descriptor SHA in one direction. C contains only governance bytes and a predetermined logical public-bundle identity, never a future terminal root/hash. Parent and tree invariants remain `parent(A)=R,parent(B)=A,parent(C)=B`. |

## Residual boundaries, not open findings

- H3 approves only this Plan. It does not authorize EXEC-START, alignment, containment, broker installation, live cutover, commit or push.
- Logical roles, the native broker, crash/fault proof and final receipts remain future work and must satisfy the stated gates; their present absence cannot be converted into a false PASS.
- The OS anchor and native gate protocol deliberately trust the top-level main acting with Luca's authority. Expanding the adversary model to a compromised same-authority main would require an external trust service and is not silently claimed here.

## Terminal verdict

`AFFIRM`

No security/architecture `BLOCKER` or `MAJOR` remains open for Candidate SHA-256 `1964e44d150001aa10604b9abd6763792269c24e4995fadd6d4df737c289052c`.

<!-- FILE_END: round1-rerun-closure-security.md -->
