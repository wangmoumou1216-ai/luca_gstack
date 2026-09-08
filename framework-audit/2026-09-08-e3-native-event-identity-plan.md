# E3 fresh execution plan — native user-event identity

Plan ID: `E3-NATIVE-EVENT-20260908-01`

Status: `AWAITING_USER_APPROVAL`

Scope: Luca Gstack framework / `NO_PIN`. This plan does not activate, inspect, or mutate any
downstream project. It does not include Memory governance, pending extraction adjudication,
evolution scans, v26 A/B calls, Git push, or deployment.

## 1. Operational goal and DONE

Fix the framework defect in which Codex can place several genuine user steering messages under one
transport `turn_id`, while Luca Gstack treats that parent ID as a single-use user-message identity.

DONE requires all of the following:

1. `boundary_id` represents the shared transport/execution boundary.
2. `event_id` represents one attested native user event.
3. Two distinct native events under one boundary both proceed, including identical-text events.
4. Replaying the same native event is rejected.
5. Prompt hashes, random UUIDs, and a raw parent `turn_id` cannot stand in for attested identity.
6. Project access is available only to the current attested event and active binding.
7. A no-tool response can close through the Stop path without weakening fail-closed behavior.
8. Existing G3 continuation classification remains green.
9. Current-version native probes and an independent quality gate pass.

## 2. Frozen starting point

- Branch: `main`
- Committed HEAD before the G3 follow-up patch:
  `e608c51e00541eb9c30a8e00c62e0c9f490ff4d9`
- Intended G3 production file SHA-256:
  `.claude/hooks/route-guard.mjs` =
  `359916752171687ba325f0d1ccebe0988eeb5c7b87037d27fea480c75d4b9a75`
- Intended G3 test file SHA-256:
  `scripts/test-route-guard.mjs` =
  `858db017ac4c6c93641965026520a0d94cc3d14bce6fdc473537cfca4cd8fdad`
- G3 independent gate: `PASS 7/7`.
- Route suite after test isolation: one process `236/236`; two concurrent processes each
  `236/236`.
- Observed harness versions during recon: Codex `0.153.4`; Claude Code `2.1.263`. These are
  observations, not permanent contracts; Phase 1 records the versions actually probed.

The G3 classifier patch and its test-isolation repair must remain a separate change from E3. The
previous one-use `git commit --no-verify` authorization has already been consumed. A new commit is
not implied by this plan.

## 3. Root cause and invariants

Current code selects `turn_id || user_message_id || randomUUID()` and passes that value to a
session-wide consumed-turn ledger. Under Codex steering, `turn_id` can name a parent execution
boundary shared by multiple real `msg_*` user events. The second real event is therefore rejected
as a replay before its own identity has been established.

The implementation must preserve these invariants:

- Event identity comes from a durable, native, provenance-checked record.
- Text equality is neither identity nor replay evidence.
- The UserPromptSubmit path may validate, revoke stale authority, and enqueue a candidate, but it
  must not consume a raw boundary as an event.
- The first security-relevant PreToolUse path, or Stop when no tool is used, performs lazy
  attestation.
- Attestation, event-ledger append, cursor advancement, and project-state transition share one
  lock/CAS transaction.
- The reader is bounded, no-follow, schema-checked, and fails closed on ambiguity or drift.
- For Codex, a native `response_item/message/role=user/msg_*` is paired with the first matching
  `UserMessage` anchor after it; distance 1 and the observed safe distance 2 are accepted only when
  no other native user record intervenes.
- Session, boundary, cwd, text bytes, ordering, and native provenance must agree.

## 4. Ownership and concurrency gate

Another session currently owns Memory governance. It also has active changes in shared hook/test
surfaces needed by E3, including at least:

- `.claude/hooks/session-sync.mjs`
- `.claude/hooks/session-restore.mjs`
- `scripts/test-hooks.mjs`

E3 implementation must not begin until that session explicitly releases its work and the current
versions of all overlapping files are re-frozen. No stash, reset, checkout, overwrite, or automatic
merge is permitted. Memory files and that session's audit artifacts remain out of scope.

## 5. Planned change envelope

Expected production owners:

- `.claude/hooks/lib/event-attestation.mjs` (new)
- `.claude/hooks/lib/project-substrate.mjs`
- `.claude/hooks/route-guard.mjs`
- `.claude/hooks/project-scope-guard.mjs`
- `.claude/hooks/session-sync.mjs`
- `.claude/hooks/session-restore.mjs`
- `.claude/hooks/lib/project-read-grants.mjs`
- `scripts/project-pin.mjs`
- `scripts/project-read.mjs`
- `scripts/check-project-links.mjs`

Expected validation owners:

- `scripts/test-prompt-attestation.mjs` (new)
- `scripts/test-project-transaction.mjs`
- `scripts/test-project-substrate.mjs`
- `scripts/test-project-scope-guard.mjs`
- `scripts/test-route-guard.mjs`
- `scripts/test-codex-adapter.mjs`
- `scripts/test-hooks.mjs`

Conditional inspection owners:

- `.codex/codex-hook-adapter.mjs`
- `.claude/settings.json`
- `.codex/hooks.json`

The three conditional owners are changed only if the fresh L0 probe proves that required fields or
fail-closed registration are missing. Otherwise they must remain zero-diff verification targets.

Explicit exclusions:

- `memory/**`
- pending extraction or candidate governance
- E1/E2 obligation redesign
- workflow/Plan execution, bridge, activation, or downstream aliases
- v26 agent-context A/B artifacts or calls
- downstream projects and display symlinks

## 6. Phase plan and assertions

### Phase 0 — isolate and freeze G3

1. Recheck the two frozen G3 file hashes above.
2. Re-run syntax, diff check, the full route suite, and the concurrent two-process route suite.
3. With separate Git authority, create one focused normal commit containing only the G3 classifier
   and route-test isolation changes.
4. Record the resulting commit SHA as the E3 implementation baseline.

Assertions:

- No Memory/session-governance files are staged.
- G3 positive/negative controls and project-gate controls pass.
- No `--no-verify` is used unless the user separately authorizes it again.

Critical failure stops Phase 1.

### Phase 1 — current-version native L0

Capture minimal, redacted Claude and Codex native evidence for:

- two distinct messages under one boundary;
- identical text under one boundary but distinct native IDs;
- source publication timing relative to UserPromptSubmit, PreToolUse, and Stop;
- the Codex distance-1 and safe distance-2 pairing cases;
- terminal/no-tool response behavior.

Assertions:

- Every required event can be uniquely and durably bound without using text hash or random identity.
- No intervening native user record is accepted between a paired source and anchor.
- Evidence records actual harness versions and provenance without retaining unrelated prompt data.

If either harness cannot provide unique durable identity, status becomes `BLOCKED`; do not invent a
fallback and do not enter implementation.

### Phase 2 — red tests

Add failing tests for:

1. same boundary, two different native events → both accepted;
2. same boundary and text, different native IDs → both accepted;
3. exact native event replay → rejected;
4. raw boundary, prompt hash, or random UUID as event identity → rejected;
5. distance 1 and safe distance 2 → accepted;
6. intervening user record, wrong session/cwd/boundary/text, broken leg, reversed ordering,
   unknown schema, or symlinked source → rejected;
7. pending unattested candidate → prior project authority revoked;
8. response-only event → Stop attests and closes it;
9. crash before and after source publication → deterministic recovery without double consume.

Assertion: the old implementation must fail the positive multi-event cases for the expected reason.
A red caused by fixture/setup failure does not authorize implementation.

### Phase 3 — pure attester and substrate transaction

1. Implement the bounded native-event reader.
2. Model `boundary_id` and `event_id` separately.
3. Replace raw-turn consumption with event-ledger consumption.
4. Put candidate state, cursor, event ledger, and project transition under one lock/CAS boundary.
5. Preserve revocation and fail-closed behavior during crash recovery.

Assertions:

- Exact replay is rejected across process restarts.
- Two events sharing a boundary never collide.
- An unattested event cannot inherit project or read authority.
- Corrupt, ambiguous, stale, or mismatched sources produce no partial state transition.

Critical failure stops Phase 4.

### Phase 4 — hook and consumer wiring

1. Route guard validates, revokes stale authority, and queues the candidate without consuming the
   boundary.
2. Project-scope guard attests the pending event before granting access.
3. Session Stop uses the same attester for no-tool completion.
4. Project pin/read and read grants require current attested event authority.
5. Adapter/config changes are made only when Phase 1 evidence requires them.

Assertions:

- UserPromptSubmit alone cannot create usable project authority.
- PreToolUse and Stop converge on one idempotent transaction.
- G3 classification outputs do not change.
- NO_PIN and cross-project read rules remain intact.

Critical failure stops Phase 5.

### Phase 5 — verification and independent gate

Run, at minimum:

- prompt-attestation tests;
- project transaction and substrate tests;
- project-scope tests;
- route tests, including two concurrent full runs;
- Codex adapter and hook tests;
- project-link checks;
- syntax and `git diff --check`;
- fresh native Claude/Codex cases matching Phase 1;
- one independent quality gate over the frozen diff and evidence.

Assertions:

- No test relies on fixed shared session IDs.
- No Memory-governance or downstream-project file is in the diff.
- Live evidence is first-attempt, versioned, and not replaced by best-of reruns.
- Final status is `DONE` only when all critical assertions and the independent gate pass.

### Phase 6 — review handoff

Leave E3 implementation uncommitted for the user's requested high-model review. Report the exact
diff, tests, live evidence, remaining concerns, and candidate commit file list. Commit and push are
separate later effects.

## 7. Human Gate and authority requested

Approval of this plan must be tied to the exact SHA-256 of this file and may authorize only:

1. a focused **normal** Git commit of the already-frozen G3 two-file change;
2. the local E3 implementation phases above after the Memory session releases overlapping files;
3. minimal native Claude/Codex probes required by Phases 1 and 5.

It does not authorize:

- `git commit --no-verify`;
- an E3 commit before the user's high-model review;
- any push, deploy, restart, trust/activation change, or destructive action;
- the 22-call v26 A/B matrix;
- any Memory or downstream-project mutation.

If probe execution requires a hook trust, restart, or activation effect not already present, stop
and request that authority separately.

## 8. Superseded-plan boundary

`LRS-20260820-016` remains historical evidence and must not be executed directly. Its baseline and
harness versions are stale; it assumed strict Codex adjacency later disproved by a real distance-2
case; it coupled delivered E1/E2 work and unrelated bridge/activation surfaces into E3; and it never
received its required exact-SHA approval.

This fresh plan narrows E3 to native event attestation and its direct project-authority consumers.

<!-- FILE_END: E3-NATIVE-EVENT-IDENTITY-PLAN -->
