# Active-session NO_PIN release repair

## Authority and scope

User authorized repairing active-session NO_PIN recovery after repeated `recover-session` refusal. Framework checkout: `/Users/luca/Desktop/项目/muse/lucagstack`. No Git publication, downstream changes, shared alias mutation, root-contract edits, or `framework/` writes. Existing unrelated WIP is preserved. This is a prerequisite repair, not P2 or U5.

Session `01a0c427-2f6c-7e50-9fc1-4f38aa0bce23` remains `TURN_ACTIVE` bound to `muse`, epoch 1 at the latest read-only status check. No real unbinding ran. Authorization to repair is not reported as successful unbinding.

## Diagnosis and implementation

Exact observed error: `current native event is still fresh; refusing to remove its authority`. `recover-session` intentionally handles only superseded active events. `deactivate` both refuses TURN_ACTIVE and cleans shared display aliases, so neither existing operation meets the request.

R1–R4 showed that Bash text parsing cannot bind a CLI caller to the native session: the nested `bash -c` counterexample remained open. R5 removes the `release-session` command from both `project.sh` and `project-pin.mjs` and removes its misleading hook admission rule. The exact current native human message `解除本会话项目绑定，恢复 NO_PIN` now queues a session-local release intent in UserPromptSubmit; only a matching native PreToolUse or Stop observation can attest it. Under the state lock, the substrate verifies the exact current directive and freshness, captures a new native source fence, checks freshness again, then atomically publishes `NO_PIN`. The source cursor prevents replay, and this path does not alter the shared aliases or project data. An ordinary prompt cannot use the release intent; an unflushed or superseded event fails closed. Old recover/deactivate behavior is unchanged.

This is a harness-hook safety workflow, not an OS-level adversarial boundary against arbitrary code with the same filesystem privileges. In particular, direct imports of internal state helpers remain outside the CLI regression claim. Do not represent advisory Codex PreToolUse text as a hard sandbox. The old `release-session` CLI must not be used, including from a nested shell.

R5 uses five effective implementation/test files (the earlier changes to `project-pin.mjs`, `project-scope-guard.mjs` and `test-project-scope-guard.mjs` were removed back to their baseline):

- `.claude/hooks/lib/event-attestation.mjs`
- `.claude/hooks/lib/project-substrate.mjs`
- `.claude/hooks/route-guard.mjs`
- `scripts/project.sh`
- `scripts/test-project-transaction.mjs`

## Verification and independent gates

- New release regression observed RED (transaction 54 PASS / 6 FAIL before implementation), then latest transaction 63 PASS / 0 FAIL.
- Acting-session regression observed RED (scope 151 PASS / 1 FAIL), then scope 152 PASS / 0 FAIL before the final counterexample was added.
- `npm run test:event-authority --silent`: exit 0 after native consent change.
- `npm run check:substrate --silent`: substrate and identity wiring pass (before later guard/native-consent additions; not claimed as full final regression).
- MJS syntax, Bash syntax and `git diff --check`: exit 0.
- Independent R1: FAIL 5/8; cross-session reachability and missing native consent. Recorded envelope `active-release-20260921-r1`.
- Independent R2: FAIL 7/8; Shell continued newline escaped operation recognition. Recorded envelope `active-release-20260921-r2`.
- R2 independently reproduced native-user arrival during fence capture: real code refuses without state mutation; in-memory mutant removing the second check releases, demonstrating the race assertion detects that defect.
- Independent R3: FAIL 7/8. The separated input redirection `bash scripts/project.sh </dev/null release-session …` bypassed caller detection; only a harmless Bash argv probe was run, not a full release.
- R4 redirection regressions covered separated/adjacent input redirects and `2>&1` / `&>`; scope 152/0 and transaction 63/0 before the final counterexample. Independent R4: FAIL 2/3. A quoted executable program under `bash -c` still bypasses caller detection.
- The final `bash -c 'bash scripts/project.sh release-session B …'` counterexample was added to the real guard suite and run: scope **151 PASS / 1 FAIL**, with the exact nested-shell shape reported as FAIL. No real release ran. A standalone R3 probe intercepted before execution remains UNKNOWN and is not counted as a pass.
- R5 red test: a native release candidate yielded `TURN_ACTIVE` instead of `NO_PIN` (transaction 63 PASS / 1 FAIL). After the native-event redesign: transaction **63 PASS / 0 FAIL** (Claude/Codex release, PreToolUse/Stop, retired direct and nested CLI, same-session replay, ordinary prompt, superseded and corrupted native records, and pre-publish fault). Scope guard **151 PASS / 0 FAIL** after removing the obsolete lexical-admission assertion. `npm run test:event-authority --silent`, `npm run check:substrate --silent`, `git diff --check`, MJS syntax, and Bash syntax all exit 0. A Stop fixture initially lacked the native assistant witness and correctly stayed closed; with the witness present it passed without relaxing validation.
- The first independent R5 pass exposed one contract mismatch: both admission layers used `trim()`, so leading/trailing whitespace was accepted despite the documented exact directive. The implementation now uses literal equality and adds UserPromptSubmit plus Codex native-verifier negatives for leading whitespace and a trailing newline. The final local transaction suite is **66 PASS / 0 FAIL**; route guard is **243 PASS / 0 FAIL**; scope guard remains **151 PASS / 0 FAIL**; hook, substrate/identity, event-authority, syntax and diff checks pass.
- Final independent gate `active-release-20260921-r5-independent`: **PASS 8/8** against frozen binary diff SHA-256 `edf92f9904cda3187600cfd9cd565aa4d00694a63f152cacb4f7a8839afdcbcb`. It independently ran transaction **66/66**, event-attestation negatives **47/47**, event-transaction faults **6/6**, and event-switch E2E; exercised Claude and Codex UserPromptSubmit→PreToolUse/Stop flows; verified literal prompt rejection, CLI retirement, alias/project-byte preservation and failure atomicity. Its in-memory mutation removed the second post-fence freshness check: the mutant swallowed a newly arriving human event and released, while the real implementation rejected byte-identically for both harnesses. The mutation was killed.
- This PASS closes the hook/public-CLI repair only. It is not proof against arbitrary code with the same filesystem privileges and supplies no G1/C3 evidence or P2 authorization.

## Main-plan reservation (not implementation)

Fully read the supplied OS-temp handoff and all three root-handshake documents. Verified unchanged hashes:

- v3.2 plan: `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`.
- G1 delta: `845fddb8aad5c9c4f0b34f5ee55ca77390c6d78accb9a12916a6a551eacd2ff3`.
- Final root handshake: `521d5373a3bd67b445761ac2881ae7efc20461f45c3185f890799b70db1920c8`.

G4.5 / U5-option is registered here as a conditional execution reservation: original main line → G4 PASS and exact B freeze → G4.5 value/authorization decision → original G5. Default SKIP_U5. Only GO_EVIDENCE or informed GO_VALUE_OVERRIDE plus explicit approval of exact B-bound implementation opens isolated C. B's G5 remains independent; C cannot substitute its evidence. No paid experiments or publishing are authorized.

Main line still requires P1 preservation/current tree/R10-byte revalidation, then independent dynamic G1/C3 evidence. Handoff reports G1 8/9 and C3 UNKNOWN; no newer G1 PASS is established here. Do not enter P2 before all G1 blocking criteria pass. Do not adopt seven old experiments or alter the locked main-plan/scorer.

## Resume

R5 is independently verified and the repair is complete. This does not itself mutate or unbind any previously active session. The only live release trigger is a **new standalone native user turn** whose bytes are exactly `解除本会话项目绑定，恢复 NO_PIN`; leading/trailing whitespace is not consent. Verify the resulting status before treating that session as NO_PIN. Do not replay an older prompt, hand-edit sidecars, invoke the retired CLI, or use deactivate to remove shared aliases. In a separately verified NO_PIN framework session, continue G1 only after rechecking all authority and candidate identities, retaining the G4.5 reservation above.
