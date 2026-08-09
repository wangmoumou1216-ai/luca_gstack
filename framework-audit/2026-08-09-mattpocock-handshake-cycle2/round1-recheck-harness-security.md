# Cycle 2 Round 1 Fresh Recheck — Harness / Security

Candidate SHA-256: `34bcc92ba5ff7ff6c27a5ed724068a2faadcf6641af8399fda0216056050cf45`

- Reviewer receipt: `R1-RECHECK-HARNESS-SECURITY-FA85A590-F79A-4C5E-9854-B8E97DE24131`
- Review mode: fresh read-only adversarial closure review; scratch mutations only under `/private/tmp`.
- Finding boundary: future WP/broker/verifier implementation being absent is not a Plan finding. Only an existing contradiction, authorization escape, or false-green path in the frozen Plan/source/tool contracts is counted.

## Freeze and positive-control readback

- Candidate bytes match the requested SHA exactly.
- Bound ADR, matrix and source-bundle bytes match the Plan: ADR `85b64175…164c4`, matrix `c0ddd7da…548cc`, bundle `dac6fd83…b66`.
- The current source-bundle validator reports all 16 members byte-matching; strict matrix audit reports 321 rows / 2,568 cells / 2,576 unique receipts / four logical roles.
- An isolated `--negative-bite` run produced byte-identical matrix SHA `c0ddd7da…548cc`; all eight mutations were rejected with exit 41 and the frozen source inode/bytes remained unchanged.
- These positive controls establish current-byte consistency; they do not neutralize the two trust/path attacks below.

## Original harness/security finding closure

| Finding | Status | Closure evidence |
|---|---|---|
| H4a/WP-13/WP-14 cycle and conflicting native entry | **CLOSED** | Plan lines 97–116 and 292–312 now have the single order `WP-13-BUILD → H4a → WP-13-NATIVE → WP-14 → H4b → WP-15`. Plan line 297 and ADR lines 622–644 carry the same two envelope-keyed R6 commands and the unique token `WP13_R6_NATIVE_PASS`. |
| Candidate launcher issued its own trust anchor | **CLOSED** | Plan lines 147–154 and 204–213 put the evidence TCB/anchor outside candidate and child write roots; ADR lines 237–272 gives the parent channel, in-memory key, immutable-envelope fingerprint and forged-three-event/replacement-key rejection. The launcher no longer supplies the trusted anchor. |
| H1 lacked a unique executor and restored the known-dangerous resolver | **CLOSED** | Plan lines 171–180 split PREP/freeze/H1/EXEC, name the frozen TCB executor and bind old/stub/descriptor hashes. Once an edge begins, only roll-forward to stub/absent is permitted; old bytes remain undiscoverable. |
| Matrix accepted decision/WP/expected drift | **CLOSED** | `tools/audit.mjs` lines 305–530 binds the supplied census, decision map, exact decision/WP/slug/expected/command/receipt set. The fresh eight-bite run rejected deleted cell, fake N/A, duplicate receipt, missing role, decision drift, WP drift, generic expected and single-harness token swap. |
| Producer knew the security canary | **CLOSED** | Plan lines 215–224 keeps only public regression canaries visible to the producer; the real canary is generated post-freeze and injected through parent memory. |
| Plan and matrix scanned different redaction surfaces | **CLOSED** | Plan A-008/WP-06 and the matrix share the seven-surface manifest: stdout, stderr, native transcript, artifact, handoff, final and receipt/log. |
| Closure finding: read-only matrix laundering | **CLOSED, with a distinct path-containment defect below** | WP-00A first validates existing frozen matrix bytes with exact SHA. PREP moves generation to a distinct explicit `--out`; generator lines 215–241 bind the source bytes, lines 345–373 require byte identity plus final-component `O_EXCL|O_NOFOLLOW`, and lines 429–446 re-read the source identity. The old default overwrite path is gone. |
| Closure finding: post-freeze ADR identity drift | **CLOSED** | The Plan, source bundle and current ADR all bind the same `85b64175…164c4`; candidate freeze also matches. |
| Inventory closure finding: B self-reference | **CLOSED in the reviewed security architecture** | Plan A-017/WP-12/WP-15 and ADR lines 448–462 keep only transaction/epoch in B; exact B OID and complete route-file SHA are externally bound after B is authored. |

## New findings

| ID | Severity | Status | Evidence and impact | Required closure |
|---|---|---|---|---|
| `HS-RC-01` | **BLOCKER** | **OPEN** | **The first source-bundle trust check is performed by a verifier that is itself only a member of that bundle, so tool drift can mint the bundle's green token.** `source-bundle.sha256:13` lists `tools/audit.mjs`; Plan line 150 then executes that same mutable file as the first and only checker of the bundle and its own expected hash. `tools/audit.mjs:34-73` contains the check, but no prior system/pre-H3 TCB command authenticates the checker bytes before Node executes them. Passing `--expected-sha dac6…` to an already substituted script does not constrain what it prints or how it exits. Therefore a uniform replacement of the checker (or a simple always-PASS replacement) can accept changed ADR/matrix/tool bytes before WP-00 builds the later evidence TCB. Impact: every subsequent source identity and TCB bootstrap can be rooted in attacker-/drift-selected bytes while following the Plan's exact command and returning PASS. | Make the first edge independent of every repository member it authenticates: use a Plan-literal, OS-owned digest command or a verifier frozen outside the source bundle to check the exact `source-bundle.sha256` SHA and all 16 member bytes **before any listed validator executes**. Bind executable identity/path as well as output, and add a tool-drift mutation proving failure before the substituted tool can run. A repository tool may do semantic validation only after this external byte anchor passes. |
| `HS-RC-02` | **BLOCKER** | **OPEN** | **The repaired `O_EXCL|O_NOFOLLOW` write protects only the final basename; an ancestor symlink still escapes the EXEC-START audit root and contradicts the Plan's own canonical-parent rule.** Plan line 14 requires every fixed audit receipt path to be canonicalized under the envelope receipt root, but the exact generator command at line 150 takes a raw `--out` and no envelope/receipt key. `build-harness-matrix.mjs:354-359` calls `openSync(resolve(outPath), O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW)`; `resolve()` is lexical and `O_NOFOLLOW` does not reject symlinked ancestors. Scratch probe: with `/private/tmp/cycle2-parent-link.b4G6TD/scratch` symlinked to `/private/tmp/cycle2-parent-target.kie7Sy`, the exact negative-bite invocation exited 0 and created `/private/tmp/cycle2-parent-target.kie7Sy/escaped.json` (2,295,972 bytes). Impact: a pre-existing or raced ancestor can redirect the authorized audit-only write outside the receipt root; `O_EXCL` prevents replacement but not unauthorized creation. | Resolve/open every ancestor from an already-verified receipt-root directory FD using `openat(..., O_DIRECTORY|O_NOFOLLOW)`, compare the frozen device/inode chain from the envelope, and create the final child relative to that FD with `O_EXCL|O_NOFOLLOW`. Replace raw `--out` with envelope + enumerated receipt key, or mechanically prove the raw logical path's parent is that opened root immediately at the write. Add pre-existing ancestor-symlink and parent-swap mutations; both must fail before file creation. |

## Security-domain checks with no new material finding

- Evidence TCB separation now prevents candidate/child self-issuance within the declared delegated-child threat boundary.
- H4a synthetic and H4b production descriptors are distinct, externally bound and forbidden from embedding each other's self-referential hashes.
- WP-13's product BUILD receipt is explicitly untrusted; only the WP-00-owned independent raw-byte verifier can emit `WP13_BUILD_FROZEN`.
- R6 keeps the route gate closed until exact B observation, opens only as a separate edge, and compensates by closing it first.

## Terminal verdict

`REFUTE`

The previous harness/security defects are materially closed, but the frozen Plan still has two current, executable trust-boundary failures: its root bundle checker authenticates itself, and its exact PREP write can follow a symlinked parent outside the authorized receipt root. These are not missing future implementation; both occur in the Plan's existing first-stage commands. The candidate cannot receive a security AFFIRM until both attacks are made mechanically failing and a new SHA is frozen.

<!-- FILE_END: round1-recheck-harness-security.md -->
