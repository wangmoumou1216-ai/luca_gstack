# Round-17 Plan Agent Gate

## Receipt

- Review mode: fresh independent Plan-Agent gate. The current plan was read from byte 0 through EOF in
  sequential chunks (offsets 1, 501, 1001, 1501, 2001, 2501, 2801, 3201, 3601, 3901, 4351, 4690, 5079, 5338,
  each overlapping or abutting the next with no gap, terminating at line 5503/EOF). No verdict from Round 16
  or any other prior round was inherited; every finding below was independently re-derived against current bytes.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `87d56f6c7722ca73ba4503bdab20630fc706fc01e443c400113070eca621b0ba`
- Actual plan SHA-256 read at start of review: `87d56f6c7722ca73ba4503bdab20630fc706fc01e443c400113070eca621b0ba`
- Expected plan length: 5,503 lines. Actual: 5,503 lines (confirmed twice, before and after review).
- Expected framework `HEAD`/upstream: `8e1c46d56d431d54ada9d30a3bb34d010f3e8466` (both). Actual `HEAD`/upstream at
  start and again at final verification: `8e1c46d56d431d54ada9d30a3bb34d010f3e8466` / same (unchanged across the
  whole review).
- Expected framework tree: `73488af853e260336fd9a0afef97341a2cd46794`. Actual: identical, both checks.
- Downstream expected `HEAD`/upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`. Actual: **UNVERIFIABLE_FROM_THIS_SESSION**.
  A project-scope guard refused the Bash call before any git command ran, returning verbatim:
  `Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。`
  (a second attempt at a downstream-adjacent path returned the analogous refusal naming that path). Per the
  task's own instruction this was not routed around, no project switch/bind was attempted, and downstream is
  recorded as unverified rather than assumed. See "Downstream unverifiability" below for the merits judgment.
- Input file hashes (expected vs actual, all recomputed with `shasum -a 256` in this session):
  - `PLAN-AGENT-REVIEW-R16.md`: expected `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127`, actual identical.
  - `.claude/agents/plan-agent.md`: expected `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`, actual identical.
  - `.claude/agents/orchestrator.md`: expected `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`, actual identical.
  - `PAYLOAD-CENSUS.md`: expected `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`, actual identical.
  - `TRANSCRIPT-AUTH-EVIDENCE.md`: expected `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`, actual identical.
  - `PLAN-AGENT-REVIEW-R15.md`: expected `1f86ba9859e75a0d88f99561398765133c2e51248329a79c9c432b5344f9bf4d`, actual identical.
  - All six were also read in full (byte 0 → EOF) before forming any judgment on the B1/B2 re-test.
- Plan read confirmation: the plan was read sequentially from line 1 to line 5503 with no skipped ranges;
  §0.3, §2.15, §3, §5.1–5.4, §6.1–6.3, §7.1–7.2, §8.1–8.6, §9–§11, §12.1–12.3, §13, §14, §15, §16 and §17 were
  each read in full, not sampled.
- Evidence-drift statement: no drift was found on any axis this session could verify. Plan SHA/line count,
  framework HEAD/upstream/tree, and all six named input-file hashes were identical at the start of the review
  and were re-checked identical after the report below was written (see Verification). The only unverifiable
  axis is the downstream ref, which is a session-environment limitation (see below), not an observed change.
  R17, `REDTEAM-ROUND-17-ROUTING.md` and `REDTEAM-ROUND-17-TRANSACTION.md` were confirmed absent both before and
  after this review, and R16 was read only as an immutable prior receipt, never as a source of inherited verdict.

### Downstream unverifiability — merits judgment

The plan's own §0.3 KILL-02 names the downstream ref as one of several identity components that must be
re-verified by `L0-PREFLIGHT-RECEIPT.json` "read back from both repositories at receipt time"
(`FINAL-EXECUTION-PLAN.md:366-370`) immediately before any implementation worktree is created — i.e. the plan
does not rely on this Plan-Agent gate as the sole or final check of the downstream ref; it is re-checked
mechanically at preflight time regardless of this round's outcome. Round-16's receipt shows the same downstream
value (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`) was verifiable from that session with no drift reported, so
there is no observed evidence of downstream drift — only an inability to observe it from *this* session, caused
by this session's project-scope guard denying any Bash command that names a path under `/Users/luca/Desktop/项目`
(including this checkout's own path when spelled out explicitly), independent of anything the plan states or
does. This is a property of the review environment, not a defect the plan authors introduced or could fix by
editing plan bytes. I therefore do not count it as a BLOCKER, MAJOR or MINOR finding against the plan; I record
it as an open verification item that the next round (or the L0 preflight step the plan itself mandates) must
close by running the check from a session actually bound/able to reach that path, or by having the user/luca
confirm the value directly. Treating an environment-side gate refusal as if it were a plan defect would
misattribute the cause; not mentioning it at all would hide a real gap in this round's evidence base — this
receipt does both: names it plainly and assigns it zero weight in the verdict below.

## Verdict

**READY_FOR_REDTEAM**

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0

Round-16's two BLOCKERs are mechanically closed by this revision and independently re-verified against live git
objects (B1) and by tracing all four named counterexamples through the current discriminator/outcome tables to
a unique conforming transition each (B2). No new contradiction was found across the eight cross-referenced
sections, the closure-map table, the assertion matrix or the mutant list. Round-numbering hygiene holds: R16 is
treated only as an immutable prior input, and R17 / `REDTEAM-ROUND-17-ROUTING.md` / `REDTEAM-ROUND-17-TRANSACTION.md`
are all still absent.

## Mechanical re-test of Round-16 B1 and B2

| Round-16 item | Round-17 result | Current-byte evidence | Independent verification |
|---|---|---|---|
| B1 — framework ref baseline had drifted off frozen `8e9726d…`; required an explicit frozen tuple synced across KILL-02/preflight/§13/rollback | **Closed** | Tuple frozen at `FINAL-EXECUTION-PLAN.md:68-90` (`BASELINE_COMMIT=8e1c46d…`/`BASELINE_TREE=73488af…`, `PRIOR_BASELINE_COMMIT=8e9726d…`/`PRIOR_BASELINE_TREE=fe67c639…`, ancestry `c0a2efe…`→`c9d4185…`→`8e1c46d…`, three-blob delta under `framework-audit/2026-08-20-recovery-handoff-review/`); §2.15 closure-map row at `:313`; preflight receipt requirement at `:366-370`; §13 DAG step 2 at `:4624-4630` constructs `A0` with parent exactly `BASELINE_COMMIT` and requires that ancestry | Ran `git rev-parse` on all three commits' parents: `8e1c46d^=c9d4185…`, `c9d4185^=c0a2efe…`, `c0a2efe^=8e9726d…` — exact match. `git rev-parse 8e9726d^{tree}` = `fe67c639838340beca9556e76773f0e1b7d41c2b` — exact match. `git diff --stat 8e9726d 8e1c46d` touches only the three named files. `git ls-tree 8e1c46d` on those three paths returns blobs `49cb5177…`, `3d530275…`, `4a6740fb…` — byte-identical to the three blob hashes the plan asserts. This is a real, mechanically re-derived match, not a restated claim. |
| B2 — transfer recovery lacked a total event-bearing/no-new-event product | **Closed** | Discriminator + total 7-predicate table at `:2001-2020` (six kinds: `SCAN_DRAIN_EVENT`, `NEWLY_ATTESTED_EVENT`, `NO_NEW_EVENT_RECOVER_CONTROLLER`, `NO_NEW_EVENT_STOP_PROJECTION`, `NO_NEW_EVENT_COMMITTED_TARGET_CLEANUP`, `NO_NEW_EVENT_DENY` shared by predicates 2 and 7); outcome/capability-effect table at `:2049-2071` with `RECOVERY_CAPABILITY_BUSY`/`RECOVERY_OWNER_BUSY` explicitly deleted at `:2066-2068`; §6.1 scan-precedence text at `:2846-2857`; §7.1 schema sync at `:3101-3105`; §8.2 global-precedence row at `:3482`; §8.6 Stop arms at `:3735-3753`; §14 T-MATRIX generated cross-product plus named cells at `:4991-5006`; §15 mutant list at `:5097-5108` | Traced each of the four mechanical counterexamples below to a unique conforming transition; traced predicate mutual-exclusivity (hook-kind and journal-state disjointness) by hand for predicates 4/5/6; confirmed no default/fallthrough exists (predicate 7 is the explicit total catch-all). |

### The four Round-16 B2 counterexamples, resolved

1. **Nonterminal journal, no scan, proven-dead controller, fresh E1 attested → then exact `plan-transfer recover` PreTool with no pending candidate.**
   Fresh E1 matches predicate 3 (`NEWLY_ATTESTED_EVENT`, `:2013`): appends one `TransferSecurityEvent`, advances cursor/chain/current_event, and — because `recovery_capability_or_null=null` and census is `PROVEN_DEAD` — the outcome table (`:2053`) selects `PROVEN_DEAD_RECOVERY_ISSUED`, issuing a capability bound to E1, while the same invocation denies its own controller/Stop (`:2025-2027`, "an event-bearing kind may never consume a capability … in the same invocation"). The next, separate `plan-transfer recover` PreTool invocation now has `transfer_scan` absent and no new group, and its `authority_id`/`actor_event`/`actor_boundary` equal the just-issued ISSUED capability and current `prompt_gate.current_event` — this is predicate 4(a) (`:2014`), `NO_NEW_EVENT_RECOVER_CONTROLLER`, which appends nothing and consumes the capability/publishes the RECOVERY owner. **Unique conforming transition exists**: two distinct invocations, each matching exactly one predicate.
2. **Same at ordinary count 256 with a one-item scan (final drain, then a retry with no new `UserPromptSubmit`).**
   At `ledger_admission=FULL`, the nonempty scan forces predicate 1 (`SCAN_DRAIN_EVENT`, `:2011`): drains the one durable group, records the PROVEN_DEAD outcome in the accumulator (not the ordinary ledger), advances `consumed_count` to equal `submitted_count`, and removes the scan object while denying the attempted controller/Stop. Text at `:2028-2030` states explicitly that once the scan is removed "the very next PreToolUse/state-mutating PostToolUse/Stop re-enters this table with `transfer_scan` absent … and may then succeed **without another `UserPromptSubmit`**" — that retry now matches predicate 4 against the capability the drain itself just issued. **Unique conforming transition exists**, matching the plan's own stated guarantee word-for-word.
3. **ISSUED E1 capability when fresh E2 is attested before controller consumption.**
   E2's attestation is predicate 3 again; the outcome table row for "`ISSUED` whose `dead_owner_sha256` equals the recomputed `controller_owner.owner_sha256`" (`:2054`) fires `STALE_CAPABILITY_ROTATED`: the E1 capability is atomically invalidated (permanently unconsumable per `:2062-2065`) and a replacement is issued at a strictly higher `recovery_sequence` bound to E2, with the persisted controller/display bytes rebound to the new `authority_id`. This is independently named as an assertion (`:4998-5000`) and as two dedicated mutants (`:5105`: "retain an older-event ISSUED capability across a fresh event, reuse or lower `recovery_sequence` on rotation, leave the persisted controller bytes bound to a rotated-away `authority_id`"). **Unique conforming transition exists**; old authority cannot overtake E2 and cannot be silently dropped either — it is explicitly rotated.
4. **IN_PROGRESS RECOVERY owner that has crashed, on fresh E2.**
   E2 is predicate 3; the recovery capability is `CONSUMED` (bound to the RECOVERY owner from an earlier `NO_NEW_EVENT_RECOVER_CONTROLLER` consume), so the outcome table's "`CONSUMED`, whose consume rename bound the fresh RECOVERY `controller_owner`" row (`:2056-2058`) runs the liveness oracle against *that* RECOVERY owner (never re-running it against the original dead CLAIM owner, per `:2069` "no census result preserves an older-event capability"); since it is dead, `PROVEN_DEAD` fires `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object with a fresh higher-sequence capability. Named explicitly at `:5001` ("recovery-owner death after consume (fresh higher-sequence capability from a CONSUMED arm)"). **Unique conforming transition exists**; `RECOVERY_OWNER_BUSY` (the arm R16 flagged as making this permanently stuck) has been deleted from the plan (`:2066`), so there is no competing arm that could make this outcome ambiguous or unreachable.

## Findings

None. No BLOCKER, MAJOR or MINOR defect was found in the current plan bytes.

## Remaining consistency scan

Beyond the B1/B2 re-test above, I checked for newly introduced contradictions in the following, reading each
section in full rather than sampling it:

- §0.3 KILL conditions 01–10 for internal consistency and for any conflict with the new baseline tuple or the
  transfer-discriminator changes — none found; KILL-02's wording ("no runtime-tree-only exception") is repeated
  verbatim in the preflight-receipt requirement and in §13, so there is no silent softening anywhere in the chain.
- §2.3–2.14 (Round-4 through Round-15 closure maps) for any claim that this revision's transfer-discriminator
  change might have silently reopened — none of the fixed items (parallel JOIN authority, checkpoint schema,
  delta envelopes, TARGET_EXISTS product, project-only NEW race, etc.) reference the transfer overlay in a way
  this round's changes touch.
- §5.1–5.2 semantic-signal and obligation-creation logic — unchanged by this revision and still consistent with
  the terminal-source short-circuit ordering the transfer overlay depends on.
- §5.3's huge route-receipt/plan-execution apparatus (checkpoint, delta, parameter queues, MAIN_AGENT graphs) —
  read in full; none of it was touched by the R16→R17 diff, and none of it contradicts the new discriminator.
- §6.1–6.3 attestation/replay/outcome logic cross-checked against the discriminator table for double-counting
  (e.g. whether a `SCAN_DRAIN_EVENT` could also be misread as `NEWLY_ATTESTED_EVENT`) — the two are structurally
  disjoint on `transfer_scan` presence, so no invocation can match both.
- §7.1 schema fields (`transfer_invocation_kind` never persisted, at-most-one `recovery_capability_or_null` per
  journal, mandatory accumulator) match the §5.3 prose exactly.
- §8.1–8.6 route/project transition tables, including the TARGET_EXISTS guard, the DIFFERENT_DRAINED matrix and
  the route-obligation precedence table — the transfer-overlay-first ordering stated in §8.2 matches how §8.1's
  table text defers to it, and the Stop contract in §8.6 walks the same three no-new-event Stop-relevant kinds
  (recover controller, projection, committed-target cleanup) without introducing a fourth path.
- §9–§11 project mutation/recovery/activation machinery — unchanged in substance by this revision; no dependency
  on the transfer discriminator that would be affected by its rewrite.
- §12.1–12.2 exact file envelopes — unchanged; §12.3 required-new-output list correctly still shows R17/Round-17
  files as not-yet-existing (confirmed by `ls` failing on all three before and after the review).
- §13 DAG — step 2 is the exact mechanism that operationalizes the B1 fix; steps 3–11 are otherwise unchanged and
  do not conflict with the new baseline tuple.
- §14 assertion matrix (`R-ALIAS`, `R-SIGNAL`, `R-OBLIGATION`, `R-SCOPE`, `T-AUTH`, `T-REVOKE`, `T-MATRIX`,
  `T-TRANSACTION`, `T-CLI-START`, `T-ACTIVATE`) — `T-MATRIX`'s transfer-input-kind paragraph (`:4991-5006`) is
  byte-consistent with §5.3's table (same six kinds, same cross-product dimensions, same four named edge cells).
- §15 mutant/fault-barrier list — the discriminator-specific mutants (`:5097-5108`) cover exactly the failure
  modes R16 flagged (default arms, double-predicate match, stale capability retention, sequence reuse, same-
  invocation capability-consume-and-verify) with no gap I could find.
- §16 verification levels and §17 handshake — §17's own wording ("independent Plan Agent reports
  READY_FOR_REDTEAM in the cycle-specific R17 receipt") anticipates exactly this file; no stale round number or
  mismatched file name appears anywhere in §12.3, §13 or §17.

This does not waive any future finding; it only reports that this pass, reading every one of the sections named
in the task brief in full, found no contradiction beyond what B1/B2 already covered.

## Verification

- This report was read back from byte 0 through EOF after being written, to confirm its own internal ordering
  (Receipt → Verdict → Mechanical re-test → Findings → Remaining consistency scan → Verification → Gate
  conclusion) and that no section was truncated.
- The plan stale-hash check was re-run after this report was created: SHA-256 remained
  `87d56f6c7722ca73ba4503bdab20630fc706fc01e443c400113070eca621b0ba` and length remained 5,503 lines. Framework
  `HEAD`/upstream remained `8e1c46d56d431d54ada9d30a3bb34d010f3e8466` (both) with tree
  `73488af853e260336fd9a0afef97341a2cd46794`. No drift occurred during the writing of this receipt.
- No other file was created, modified, deleted or renamed during this review. No git commit, push, reset, stash
  or clean was executed.

## Gate conclusion

The frozen plan bytes reviewed at SHA-256 `87d56f6c7722ca73ba4503bdab20630fc706fc01e443c400113070eca621b0ba`
(5,503 lines) are **READY_FOR_REDTEAM** with **0 BLOCKER / 0 MAJOR / 0 MINOR**. Round-17 dual red-team dispatch
(`REDTEAM-ROUND-17-ROUTING.md`, `REDTEAM-ROUND-17-TRANSACTION.md`) and the exact-SHA user handshake may proceed
against this exact SHA, subject to the plan's own KILL-01 (any edit invalidates this and all downstream reports)
and the still-open downstream-ref verification noted above, which the plan's own L0 preflight step independently
re-checks before any worktree is created. This receipt is the only file created; no plan, runtime, evidence or
other audit file was modified.
