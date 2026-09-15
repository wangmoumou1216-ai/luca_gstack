# Codex multimodal and skill-injection attestation repair

Status: DONE (commit/push authorized). Scope: framework only (NO_PIN).
Baseline: c061594c8c8b918401c955af1e0d4c3d457d0c6a.
User approved diagnosis, minimum repair, negative regressions and independent review.

## Evidence

Read-only `attestNativeUserEvent` on the first queued event of session
01a0a2b7-d899-7ec3-ad9a-8f0ea401c273 returns UNKNOWN_SCHEMA:
`Codex message content part schema is unknown`.
Source contains input_text image envelopes plus input_image; UserMessage anchor
contains local_image plus text. The existing strictCodexText accepts text only.
No image bytes, credentials or raw transcript are copied here.

A second native reproduction showed the same parser boundary rejecting a valid
UserMessage anchor whose content was `[text, skill]`. Codex then emitted an
unanchored user-role `<skill>` expansion after that anchor, which the strict
intervening-user check treated as a new human turn. This repeatedly blocked
Project Gate with `Codex user content part schema is unknown`.

## Work and gates

1. Regression reproducing image-message rejection and subsequent queue lockout.
2. Narrow parser repair with source/anchor image-envelope correspondence and
   exact human-text validation; unknown schemas continue to fail closed.
3. Positive, negative, replay, current-event and Stop tests for Codex; existing
   Claude tests remain unchanged and must pass.
4. Independent cold review, mutation evidence and normal live continuation.
5. Structured skill descriptors accept only a fixed `type/name/path` schema;
   the corresponding expansion is ignored as a revocation only when its wrapper,
   name, absolute path and order match the anchor. Other user-role records still
   revoke authority.

Owner fix_multimodal: .claude/hooks/lib/event-attestation.mjs and
scripts/test-prompt-attestation.mjs (focused test allowed).
Owner root: verification, independent reviewer dispatch, this checkpoint.
No state surgery, queue deletion or permission weakening. Commit and normal push
were separately authorized in the user's follow-up.
Preserve unrelated dirty observations.jsonl, rules.yaml and retrieval-log.jsonl.

## Resume

Inspect scoped diff, worker results and run these gates:
`node scripts/test-prompt-attestation.mjs`,
`node scripts/test-event-attestation-negatives.mjs`,
`node scripts/test-event-attestation-mutations.mjs`,
`node scripts/test-project-transaction.mjs`,
`node scripts/test-event-transaction-faults.mjs`,
`node scripts/test-event-switch-e2e.mjs`.
Only report live recovery after the normal hook produces a valid current event.
Then resume muse research-backed session lifecycle proposal, not implementation.

## Verification checkpoint

- Worker observed red before repair: three image positive cases failed UNKNOWN_SCHEMA.
- Final repair: image-envelope parser and 18 image cases, including reversed order.
- Parent and reviewer reran final prompt suite: 61 PASS, exit 0.
- Parent reran project transactions: 50 PASS, 0 FAIL.
- Negative suite and existing isolated mutation suite pass; faults and switch E2E pass.
- Codex wiring including actual native session: 22 PASS, 0 FAIL, 0 BLOCKED.
- Normal PreToolUse recovered live session to TURN_ACTIVE, muse epoch 1,
  candidates 0, without any manual state mutation.
- Initial full verify overlapped the red-test/edit window: 95 PASS, C20 FAIL.
  Frozen-source full rerun: 96 PASS, 0 FAIL, 0 WARN.
- Independent cold quality-gate review: PASS 8/8, no open blockers.
  It found a missing order regression test, now added and re-reviewed.
  In-memory mutants deleting path comparison and sorting paths before comparison
  are rejected by the final tests; original source passes. No live mutation used.
- Claude compatibility covered by parser/hook fixtures; Codex additionally has
  native CLI wiring and this session's real recovery evidence.
- Root cause attribution: L4 framework. Retain source/test pointers, not a restart workaround.
- Skill regression red: positive lifecycle failed with UNKNOWN_SCHEMA before the
  repair. Final suite covers current-event, Stop, next-turn continuation, name/path
  mismatch, missing expansion, ordinary-user provenance and a later unrelated
  user-role record.
- Real transcript replay now attests the previously blocked native event as
  `codex:a70f30c109fbe70737f503566c440d518a04d70b642b3ebd7657ecc55fc0d102`.
  The allowlist is bound to Codex provenance marker
  `skills.selected_skill_instructions`, the same turn id, native `msg_*` id,
  finite create time, wrapper, skill name, absolute path and descriptor order.
- Final focused/negative/mutation/transaction/fault/switch suites pass; project
  transaction summary is 50 PASS / 0 FAIL and `npm run check:hooks` passes.
- Prove-it-bites: changing the provenance marker in a task-owned scratch copy
  makes the positive skill lifecycle fail with UNKNOWN_SCHEMA; the unmodified
  source passes. No live source mutation was used.
