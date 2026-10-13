# Claude Design no-effect abandonment repair

plan_id: cd-no-effect-abandon-20261013
scope: od-cd-framework-muse-manual-recovery
source_identity: current-user:fix-actual-caller-recovery-and-close-all
parent_plan: /Users/luca/.codex/worktrees/8a9f/luca_gstack/framework-audit/plans/2026-10-13-od-cd-official-zip.md
parent_sha256: e2ed45256c0ff0b6444b2f1c011101997b9db39c945fd58a0df36527a34edaa5

## Premise and current red

Source: human “继续执行，把复审发现的问题修好，完成实际交互和下游验证，再提交推送 main、拉回本地” and “协同发布”. Original U-002/R8 and U-005 remain the owners. The normal Claude caller actually called stage/status on installed ee4444 /host47e /framework4f. Stage durably entered STAGING, then failed cd_panel_not_ready before any target binding, file selection/upload, prefill or Send. Status after opening the real empty Design still returns PAUSED/locating/not-dispatched. Same-stage only observes; no public abandon/resume exists. Durable lease blocks the normal Codex stage with cd_busy. This is an observed recoverability gap, not permission to edit the ledger or repeat unknown external actions.

Actual input/evidence: /Users/luca/.codex/worktrees/6a95/luca_gstack/framework-audit/muse-native-closure-2026-10-13/{claude-native-01.json,claude-native-status-after-panel-02.json,claude-public-identity-03.json,codex-native-02.json}. Native Claude SID63e83c89-5bde-478d-8f11-619b19704f5c has a real canonical v1 sessionKey (provider claude, stable sourceId, that SID), not a draft. Its public authenticated workspace_state key equals the durable row owner key. No private caller token/config read is allowed. Current app main42566 and both callers remain live; peer owns UI and does not mutate source/install.

Solve the zero-effect lease by an explicit public operation, rather than changing same-stage observation into replay or starting a new ledger namespace. The source baseline is Muse main3c7520fa6b7980d8942b0fd27d4fe5b86aad2fa7; current installed package ee4444 and external shim13405. The installed shim contains one already-delivered selected-object-priority description absent from Git main; retain that exact line when modifying this file, and document it as preservation, not a new unrelated feature.

Mode: Sequential Chain, Deep. Root is sole source/publisher/installer. Critical proposal cold review must default REFUTED on weakening ownership/persistence/unknown-effect protections. It gates implementation. Existing human authorizes repairing the observed native path and coordinated publication; no automatic Send/Export, login, project switch or credential effects are added.

## Stable unit U-002-no-effect-abandon

Goal: add claude_design_abandon({handoffId,manifestSha256}) to explicitly retire only a proved never-dispatched handoff, retaining its history and durable tombstone before releasing its lease. It performs no guest/DOM, material/source-ref read, rename/upload/prefill/Send/Export, or manifest-owner reassignment. A new handoff is a new explicit stage after panel readiness; the old ID never stages again.

Finite root-owned files: /private/tmp/muse-od-cd-release-20261012/app/{claude-design-host.js,test-claude-design-host.mjs,mcp-shim.cjs}; the exact no-effect lifecycle paragraph in .claude/skills/office/claude-design/SKILL.md; this plan and closure audit. Existing session-source/browser host/open modules are read-only contract evidence. Add a dedicated fixture only if these tests lack the real seam, freezing its exact path first. No dirty mother wholesale commit and no mutable ledger patch.

Candidate predicate must be closed: locating checkpoint; null binding and recovery; empty uploadPaths; all attachments have selected=false, accepted=false, no acceptedAtStage; prefill attempted=false/matched=false/no verifiedAtStage; no in-flight stage operation; no storage error/unknown persistence on live rows. A paused row with any dispatched marker, binding, selection, upload/prefill or recovery is refused even when a caller declares it safe. Neither caller fields nor an audit JSON grant authority.

Live abandonment retains the exact existing composite owner requirement. Across an actual restart, abandonment alone may use an authenticated native resume of the same canonical sessionKey AND the same restored browser workspace; never use native SID text or request overrides. Decode the key through the actual canonical owner. Regular stage/status/recover ownership remains unchanged, and old owner metadata is never rewritten. The new current caller must be a trusted normal main-session principal. A different source/key/workspace/provider, revoked caller, malformed key, draft identity or invalid historical record refuses before reading any referenced files. The actual deployment kills the old instance normally; the peer must truly resume the original native session and re-probe key/workspace/version before invoking this operation. If these real identity/lifecycle preconditions cannot be proven, stop the affected path, rather than claiming cross-instance success.

Legacy locating records lack serialized status/error. Cold review must validate whether their strict null/false/locating fields plus the original producer's persist-before-every-effect ordering can prove no remote effect after an actual normal restart. If not provable, this proposal is REFUTED and must be repaired before implementation; do not treat missing fields as a general safe default. Saved partial/unknown/staging-recovery records always retain their lease.

Abandonment needs a mandatory durable ledger and a finite explicit marker bound to handoff/manifest/original owner/abandoning authenticated principal. Serialize it and relevant failure/persistence history without tokens. On write failure, retain ownership, expose the original storage error/unknown outcome, and do not return committed abandonment. Same exact abandonment is idempotent; conflicts refuse. Restart behavior must distinguish durable completed tombstones from pending/uncertain abandonment; absence of a client acknowledgement does not erase the original error. Multiple completed tombstones must not make the ledger unreadable or release another active handoff. No silent public success from an unknown commit is allowed.

Dependencies: completed cold proposal PASS → actual tight RED fixture matching native panel-not-ready → smallest source fix → GREEN/unminimized and adversarial checks → independent final source Standards then Spec → source/main readback → minimal current-ee4444 package splice (host and the necessary shim, all other members preserved) → cold package gate/sign/CAS/current installer → fresh instance and true native resume/abandon → fresh normal Claude/Codex stage/status/refusal/manual-export recovery. Root must request and receive UI ownership back before restart; no parallel installer or UI actions. Old failed row/call outputs remain evidence. Restart changes instance identity and invalidates old readiness probes.

## Assertions and criteria

```bash
# [BLOCKING] NA1 — exact native-shaped no-effect stop, explicit abandonment and all unsafe refusal/persistence/restart seams
MUSE_CD_FRAMEWORK_TEST_ROOT=/Users/luca/Desktop/luca_gstack node /private/tmp/muse-od-cd-release-20261012/app/test-claude-design-host.mjs
# [BLOCKING] NA2 — actual public MCP descriptor/dispatch compatibility and authority guards
node /private/tmp/muse-od-cd-release-20261012/app/test-claude-design-mcp.mjs
```

Root must first retain a RED on current3c/47e showing the same paused-no-binding caller cannot abandon, then rerun the same unchanged driver/data GREEN. Cover current and resumed same native key/workspace; foreign/revoked/draft/source mismatch; any dispatch/binding/prefill/accepted/member/recovery marker; pre-rename and rename-then-throw failures; idempotent/conflicting abandonment; restart after committed/pending cancellation; several historical tombstones plus another active lease; concurrent calls/revocation; no guest/material refs followed; new stage occurs only by a new explicit call and never replays the old row. Guard removal must turn a relevant negative RED and restoration GREEN.

Criteria: N1 no external effects or user draft are repeated/modified; N2 original native and browser ownership is preserved, with a real public resume proof for the sole narrow abandonment exception; N3 no-effect proof is enforceable for the actual legacy row and new rows, and missing/partial/unknown proof refuses; N4 persistence failure/restart/concurrency cannot falsely release a lease or lose history; N5 final source and installed payload preserve both previous publications/deliveries; N6 actual two caller evidence and any required manual-human Export step are completed or remain honestly open.

KILL: unable to prove legacy no-effect/resume ownership; unsafe/foreign/storage-unknown acceptance; a required code or package review FAIL/UNKNOWN; source/installed baseline drift. Stop dependent implementation/publication/install/actual recovery until fixed. The earlier11/11 original unchanged exported artifact remains valid within its original scope and is not relabelled a new generated output.

## Replan R-2 (2026-10-13): retain unknown storage history; reconcile only proven zero remote effect

Trigger: independent r1 FAIL P3/P4. R1 remains above as historical rejected requirements; this section supersedes its no-storage-unknown admission and missing-history requirement. No original U-ID, user decision, source/installation ownership, external scope or human Send/Export gate changes. Source authorization is the user's existing explicit repair of review findings and actual caller recovery, not a reviewer vote. This is an exact local lifecycle repair, not a remote replay or ledger edit.

The admission invariant is **no host remote dispatch**, not complete storage history. Storage UNKNOWN and remote UNKNOWN are distinct. A schema1 locating checkpoint was written before the first remote dispatch checkpoint; create/rename/upload/prefill never occur without first durably writing a different operation. Thus an unchanged strict locating/null/false row can be retired without replaying any remote effect even if its initial storage write outcome/history is unknown. The old rename-then-throw case is accepted only as zero-remote-effect with explicitly UNKNOWN historical persistence, never relabelled healthy/durable history. Any other operation/partial fields are refused. No user-provided safety declaration overrides this predicate.

Explicit legacy reconciliation is required: `claude_design_abandon` takes the existing handoffId/manifestSha256 and, for a restored schema1 row only, `legacyRecordSha256` plus `acknowledgeLegacyHistoryUnknown:true`. The host computes/exposes the digest of the complete unmodified loaded row; the supplied digest binds the exact snapshot, not authority. No receipt, JSON or native transcript can reconstruct omitted errors. Preserve that complete legacy snapshot in the abandonment history, mark historical status/error/persistence/storage unknown, and preserve original owner and args. A mismatched/missing digest or acknowledgment refuses. Future rows serialize actual pause diagnostics and retain pre-abandon history including uncertain storage. No guest, material file or source ref is accessed by this operation.

Ownership: exact composite owner on live rows. Only this operation may match a truly authenticated native resume with canonical same provider/source/native sessionKey and exact same restored browser workspace; decode with session-source's canonical decoder, validate provider, reject draft/revoked/malformed/mismatched principals. Regular stage/status/recover and old manifest owner are unchanged. Check trusted authentication again before each synchronous persistence commit. Cross-instance old process must be normally quit before real migration deployment; no claim of general process exclusivity. Refuse when an in-memory run is in flight. Same old ID never stages again.

Finite state and durable transitions (all record history retained):

| Observed state | Action/outcome | Lease policy |
| --- | --- | --- |
| strict zero-effect paused row, explicit owned abandon | capture original history + owner + authenticated abandoning principal, write marker PENDING via temp fsync/rename/directory fsync | held |
| PENDING persist succeeds | write marker COMMITTED with original history unchanged, repeat authenticated principal check, temp fsync/rename/directory fsync | release only after this call succeeds |
| either write fails before rename | return original write error/not-committed; retain marker/history and lease | held; exact repeat may durably finish local intent |
| either write fails after rename | return original write error/UNKNOWN; retain history and lease; never return success | held in current process |
| startup sees PENDING marker | preserve all history; no remote action | held; only same authenticated original native owner may explicitly finish |
| startup sees COMMITTED marker (including rename-then-throw) | validate closed zero-effect snapshot and full ownership-bound marker; re-persist that marker locally with fsync/rename/directory fsync before treating retirement as committed | release only on fresh confirmed persistence; caller acknowledgment remains UNKNOWN; storage history remains UNKNOWN, not erased |
| startup confirmation fails | explicit ledger error + no stage admission | held/fail closed |
| startup multiple historical committed markers + another active row | validate/confirm markers as one durable snapshot, then retain exactly the active row lease | no other lease release |
| exact repeated completed abandon | return same committed retirement/history, no guest actions or new intent | no stage replay |
| conflicting digest/manifest/owner/marker | reject | no lease change |

COMMITTED records must validate their saved zero-effect preimage (including original ownership/manifest and no dispatched/partial markers), marker principal native identity + same workspace, and binding of handoff/manifest; malformed markers reject ledger startup. Startup confirmation is a local replay of an already authenticated abandonment intent, never a capability to initiate one. All omitted legacy fields are explicitly unknown; current disk synchronization proves only current tombstone durability. Public response exposes ABANDONED, noRemoteEffect=true, historicalPersistence=UNKNOWN where applicable, original diagnostics/snapshot digest, commit state and client acknowledgment UNKNOWN on restart. Preserve failures, do not claim historical storage certainty.

Updated N3: strict closed zero-effect predicate on live/new/legacy rows; legacy requires exact snapshot digest + explicit unknown-history acknowledgment. Unknown external operation/partial fields refuse; storage UNKNOWN alone cannot masquerade as healthy history and does not imply a remote dispatch. Updated N4: current write failure retains lease and reports failure; startup can release only after fresh durable confirmation of previously authenticated COMMITTED intent, with full unknown/failure history retained. Tests must exercise both writes failing before/after rename, both restart states, multiple tombstones, wrong/missing legacy digest/acknowledgment, in-flight race, foreign/revoked/draft/workspace/source mismatches, malformed marker and guard-removal RED.

Proposal-preparation gate only: NP0 hash/completion identity; P1 real blocker/minimal explicit local repair; P2 strict authenticated original/native ownership; P3 separating unknown storage history from mechanically proved zero remote dispatch; P4 complete failure/restart/multirow transition table; P5 source/package/manual authority bounded. Future implementation assertions NA1/NA2 remain unexecuted at this proposal gate. Default REFUTED on merely making the current task look complete or weakening unknown remote effect protection.

R2 assertion path correction: NA2 uses the existing `/private/tmp/muse-od-cd-release-20261012/app/test-mcp-shim.mjs` (the prior test-claude-design-mcp.mjs path does not exist). Add that exact existing test file to finite root-owned changes solely for this new descriptor/dispatch/admission regression. No new suite/module is created. All unrelated protocol/partition tests and preserved selected-object wording remain required.

```bash
# [BLOCKING] NA2 — actual existing MCP schema/dispatch regression
node /private/tmp/muse-od-cd-release-20261012/app/test-mcp-shim.mjs
```

R2 public digest handshake: for a restored schema1 row, an initial `claude_design_abandon({handoffId,manifestSha256})` first passes the sole narrow authenticated canonical-key AND browser-workspace guard and zero-effect predicate, then returns `RECONCILIATION_REQUIRED`, legacyRecordSha256 and explicit historicalPersistence=UNKNOWN without any write or lease release. Caller explicitly repeats with that exact digest and acknowledgeLegacyHistoryUnknown=true. Foreign callers receive no digest. Missing digest/acknowledgment never commits; mismatched values refuse. This is the new operation's public local observation handshake, not an exception to status ownership, a ledger read by the caller, or an automatic second call. Same exact committed legacy request remains idempotent after fresh startup confirmation.
