# Matt38 candidate rollback procedure

This is a precommit procedure, not a restore-success receipt. Native verification and adoption are PENDING.

## Authority and exact scope

Use FINAL-PLAN and the real H0/M2 approval receipts under the external audit root. Htest and Hpublish remain separate gates.
The original plan records M0; the approved candidate base and restoration baseline is M2 `54ef203b4dd77e23564d0cba22f773346d30dfec`.
External scope/preimages are in preapproval/PATH-SCOPE.json and PREIMAGES.json. Exact per-effect controls and known postimages remain under A/control/<UID> and implementation receipts, outside the candidate tree.

## Candidate content before commit

End affected workers before restoration. Read current type/mode/bytes and compare each exact path with this task's known postimage.
Only an exact known postimage may receive its exact inverse patch and original mode/type. If current content is a third state, stop the affected phase and preserve peer/user changes.
Do not reset, stash, force, rewrite history, clean unrelated files, change project pins/aliases, or overwrite memory/learning records.

## Approved formal trial installation

Before any Htest write, the trusted operator binds actual candidate Git objects, M2 baseline, exact R/E paths, personal pre/postimages, sessions, source-guard/trust and command effects to a concrete approved scope.
Save actual preimage bytes; a SHA alone is not a backup. Preserve R main at M2 while the candidate is installed detached. E's separately approved permanent baseline fast-forward to M2 is retained after failure; never restore E to E0.
On failed or interrupted candidate trials, end the test sessions/broker first, normally switch R/E from the detached candidate back to the approved M2 baseline/main, and CAS-restore only the approved personal files whose current values equal the known candidate postimages.
An originally absent file may be removed only when its current bytes/type/mode exactly equal this task's known postimage. Third-state personal changes stop restoration. Preserve all other personal files and teach learning records.

## Source guard, trust and validation

Use the official install-codex-source-guard.mjs and codex-trust-hooks.mjs entry owners only within separately approved exact runtime scope.
Read back the actual restored source digest and normalized hook registration, preserve all other source/trust roots, and run a fresh native smoke after authorized restoration.
Do not replay whole default/Direct configuration files, modify private model bindings, bypass hooks, or report restoration success before the actual smoke evidence exists.

## Publication and external evidence

After publication, any reversal requires a separately approved normal revert; no force push or history rewrite.
Actual frozen-file, frozen-candidate, CI, native behavior, personal CAS, installation, restoration and publication receipts are written externally under A only after their respective effects occur.
This file embeds no future release commit, tree, complete inventory hash or success claim.

External audit root: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt`.
H0: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/H0-APPROVAL.json`.
M2 delta: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/preapproval/M2-BASELINE-APPROVAL.json`.
Content receipt: `/Users/luca/.codex/skill-adaptation-audits/2026-09-30-matt/implementation/U013/PRODUCTION-RECEIPT.json`.
