# Round-25 Planning Red Team — TRANSACTION lane

## Receipt

- Lane: TRANSACTION (state/transaction/activation axis). Working directory:
  `/Users/luca/Desktop/项目/muse/lucagstack`. No project switch/bind performed; no git
  commit/push/reset/stash/clean/add performed.
- Plan under review: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- **Checkpoint 1 (pre-read, before any attack):**
  - Expected SHA-256 `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738` /
    5,666 lines → actual `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738` /
    5,666 lines. Match.
  - Expected `BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70fa8ae95159d31763d57613194b74d68d`,
    `BASELINE_TREE=f15777109b3f524ab0a87888ba74ee4f825a8066`, ahead/behind `0/0` →
    actual `HEAD=c146cb70fa8ae95159d31763d57613194b74d68d`,
    `@{u}=c146cb70fa8ae95159d31763d57613194b74d68d`,
    `HEAD^{tree}=f15777109b3f524ab0a87888ba74ee4f825a8066`, `rev-list --left-right --count HEAD...@{u}` = `0 0`.
    Match.
  - Output file confirmed absent (`ls` → "No such file or directory") before writing.
- **Checkpoint 2 (immediately before writing this report):** re-ran the identical five checks —
  plan SHA/line count, HEAD, upstream, tree, ahead/behind — all identical to Checkpoint 1 (see
  `## Verification` below for the actual re-run transcript). No drift between checkpoints ⇒ round
  is not STALE.
- **KILL-03 derivation:** extracted every literal path line from the §12.1 code block
  (lines 4470–4513) and the two §12.2 code blocks (lines 4535–4585, 4589–4646) — 148 literal
  path lines total — into a file, then ran `git -C /Users/luca/Desktop/项目/muse/lucagstack
  status --porcelain --untracked-files=all` and intersected the two lists (`grep -xF -f`). Zero
  intersection both times (pre- and post-read). The working tree does show modifications, but
  none are envelope-listed lines: tracked `M` on `.claude/observability/observations.jsonl`,
  `.claude/observability/rules.yaml` (bare path — explicitly not an envelope line per §0.3's own
  disambiguation, only its nested `payload/...` copies are listed), `memory/evals/routing/fixtures.jsonl`
  (explicitly one of the "remaining nine" non-envelope paths per §0.3), and
  `framework-audit/.../FINAL-EXECUTION-PLAN.md` itself (the audit package, not a §12 runtime
  path); plus untracked `PLAN-AGENT-REVIEW-R19/20/21/22/23.md` and
  `REDTEAM-ROUND-24-ROUTING.md` (audit-directory markdown, not §12 paths). KILL-03: **clean**.
- **Downstream status:** attempted `git -C /Users/luca/Desktop/项目/muse rev-parse HEAD`. Verbatim
  refusal: `Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse）；禁止
  no-pin/跨项目/失效 identity 访问。` Marked `UNVERIFIABLE_FROM_THIS_SESSION`; did not route
  around it (no alternate path, no cached ref, no inference from the plan's stated
  `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`).
- **Byte 0 → EOF:** read the entire 5,666-line file front to back in sequential chunks (offsets
  1, 161–723 [§1–§5.2, out-of-lane content read for completeness], 724–1522, 1523–1852,
  1853–2271, 2272–2671, 2672–2874 [§5.3 in full, my primary territory], 2875–3163 [§6],
  3164–3352 [§7], 3353–3652 [§8.1], 3653–3889 [§8.2–§8.6], 3890–4117 [§9], 4118–4446 [§10],
  4447–4463 [§11], 4463–4656 [§12.1–12.2], 4656–4824 [§12.3–§13], 4825–5028 [§14 R, out-of-lane
  but read for cross-reference], 5029–5218 [§14 T, my primary assertion territory],
  5218–5477 [§15], 5478–5632 [§16], 5633–5666 [§17, read pre-attack]). Every line covered; last
  section content (§17.0 gate scope, R25 handshake requirement) can be restated: implementation
  begins only after Plan Agent R25 READY_FOR_REDTEAM and two Round-25 PASS reports against one
  unchanged SHA, `继续`/old-SHA/pre-report approval is not authorization, and status remains
  `PROPOSED_ONLY` until then.
- **Drift statement:** no plan-SHA, line-count, HEAD, upstream, or tree drift observed between
  the two checkpoints. Round is **not stale**.
- **Output-file-absent confirmation:** verified via `ls` immediately before this file was written
  (see Receipt bullet above and the `## Verification` transcript's pre-write line); this is the
  first write to this path in this round.

## Verdict

PASS

- BLOCKER: 0
- MAJOR: 0
- MINOR: 1

## Attacks attempted

All citations are to `FINAL-EXECUTION-PLAN.md:START-END` at the verified SHA above.

**Scripted cases, extended past the script (§5.3:2112-2245, §6.1:2932-2989):**

1. (a) Nonterminal journal, no scan, proven-dead controller, fresh E1 attested, then exact
   `plan-transfer recover` PreTool **with no pending candidate** (i.e., the recover attempt is the
   very next invocation with no intervening `UserPromptSubmit`). Traced predicate 3
   (`NEWLY_ATTESTED_EVENT`, `2125`) firing on E1 (appends one `TransferSecurityEvent`, issues/rotates
   the recovery capability bound to `actor=this sid, event=E1`, denies the attempted controller in
   *that* invocation per `2137-2139`), then the very next invocation (no new attestation) hits
   predicate 4(a) (`2126`) because `actor_session_id/actor_event/actor_boundary` now exactly equal
   the just-issued capability and `prompt_gate.current_event`. **Held** — this is exactly the
   documented two-step idempotent-resume design (`2142-2145`).
2. (b) Ordinary count 256, one-item scan, `SCAN_DRAIN_EVENT` (predicate 1, `2123`) drains it,
   `consumed_count==submitted_count` removes the scan object, then a retry **with no new
   `UserPromptSubmit`** re-enters the table with `transfer_scan` absent and may select predicate 4/5/6
   (`2140-2145`, restated at `2964-2969`). **Held** — text explicitly names this "without another
   UserPromptSubmit" case.
3. (c) ISSUED E1 capability, fresh E2 attested before controller consumption. Outcome-table row
   `2166` (`ISSUED` whose `dead_owner_sha256` still matches the recorded dead owner →
   `STALE_CAPABILITY_ROTATED`, strictly higher `recovery_sequence`, old `capability_id` permanently
   unconsumable, persisted controller bytes rebound to the new `authority_id`). **Held.**
4. (d) IN_PROGRESS RECOVERY owner crashed, fresh E2. Outcome-table row `2168-2170` (`CONSUMED` arm,
   census on the RECOVERY owner, `PROVEN_DEAD` → fresh higher-sequence capability replacing the
   consumed object). **Held.**

**Beyond the script, own constructions:**

5. **Predicate collision / non-partition check.** Manually verified the seven predicates
   (`2119-2130`) are mutually exclusive by construction: 4 requires the invocation literally be a
   `plan-transfer recover` PreTool with an ISSUED/CONSUMED-at-same-sequence capability (impossible
   under COMMITTED, since COMMITTED forbids both owner and capability fields, `1999`); 5 requires
   Stop plus either a live `transfer_recovery_notice` or `last_projection_status=UNVERIFIED` with
   `COMMITTED_SOURCE_TERMINAL` (source-side only, since COMMITTED removes the notice, `2239`, and
   only source ever gets `COMMITTED_SOURCE_TERMINAL`, `2091`); 6 requires COMMITTED+`side=TARGET`
   (disjoint from 5's source-only condition by `side`). No hook-kind constraint is stated for
   predicate 6 itself, but because the state conditions for 5 and 6 are mutually exclusive by
   `side`, and 4's precondition (nonterminal journal with a matching capability) cannot coexist
   with COMMITTED, a single invocation cannot match two of {4,5,6} regardless of hook kind. **Held**
   — no counterexample found; noted as a MINOR clarity gap below (predicate 6 doesn't name its hook
   kind the way 4/5 do), not a correctness defect.
6. **Capability rotation racing a drain / two-session livelock.** Constructed: journal nonterminal,
   controller proven dead, and *both* bound sids (source and target) independently receive fresh
   human-attested events in rapid alternation, each hitting predicate 3 on its own session's own
   ledger/cursor (accumulators are per-session, `2036-2038`, so source's and target's cursors are
   independent) and each rotating the shared journal's recovery capability onto itself via
   `STALE_CAPABILITY_ROTATED` (`2166`). If side A's next (no-new-event) invocation to consume via
   predicate 4(a) is *always* preceded by a fresh attestation from side B before A gets a quiet
   invocation, recovery is repeatedly deferred. **Traced but did not break a stated invariant**:
   (i) within one human turn, the *first* tool call attests+rotates and every subsequent tool call
   in the *same* turn (no further `UserPromptSubmit`) already satisfies predicate 4 immediately
   — so ordinary single-message-per-turn usage self-heals inside one turn; (ii) no capability is
   ever double-consumed, no authority is stolen, and `recovery_sequence` is strictly monotonic
   (`2174`) so there is no state corruption — only a liveness delay under an adversarial
   perfectly-interleaved dual-session cadence that the plan never claims to bound. This is a real
   gap in an explicit liveness guarantee, but not a safety violation, contradiction, or unreachable
   transition, so it does not meet the BLOCKER bar ("cannot be executed or landed... lost or stolen
   authority, unrecoverable crash state") nor MAJOR ("changing execution or review outcome") —
   recorded as **MINOR-1** below.
7. **Sequential A→B→C journal rollover.** Re-derived against `2079-2081`: "a later checkpoint may
   change either only by adding a new event whose chain step commits the complete prior accumulator
   object; the session accumulator itself is never replaced, reset or forked. Thus A→B followed by
   B→C keeps B's target history before B's source history." Cross-checked against the `T-MATRIX`
   assertion at `5118-5119` (same claim, generated-fixture form). **Held** — consistent, no reset/fork
   path found.
8. **4,096-byte accumulator cap / chain / cursor invariants.** Traced the ledger schema
   (`2040-2078`), the mandatory-bootstrap requirement (`2083-2095`), and the capacity-analyzer
   reservation of exactly 4,096 bytes for every schema-v3 state regardless of Plan shape
   (`1201-1206`). Verified no eviction/wrap path exists (`2094-2095`: "No eviction, cursor
   regression, chain reset/fork or dual ordinary+transfer append is legal") and that
   `transfer_security_reserve_bytes` is disjoint from `deny_reserve_bytes` in the admission formula
   (`1196-1198`, `1204`). **Held.**
9. **`last_projection_status` transitions.** Traced NONE→UNVERIFIED (implicit on a
   `COMMITTED_SOURCE_TERMINAL`-outcome event, `2184-2187`) and UNVERIFIED→VERIFIED (predicate 5,
   one-shot, `2127`). Checked for a path that could re-enter UNVERIFIED from VERIFIED without a
   fresh COMMITTED_SOURCE_TERMINAL event — none found; `2186-2187` explicitly requires "all other
   outcomes require NONE" and only "a new committed-source event" resets it. **Held.**
10. **Dual-write / replay onto the transfer ledger vs. ordinary ledger.** Checked the mutual
    exclusion at `2091-2093` ("The current native event is written to exactly one ledger:
    nonterminal source/target and COMMITTED source use this accumulator; a COMMITTED target falls
    through to the ordinary ledger/capacity oracle...") and the biting-mutant list at `5233-5234`
    ("dual-write one native event to ordinary+transfer ledgers"). Attempted to construct a case
    where a COMMITTED target with a nonempty pre-cleanup `transfer_scan` could double-count: traced
    `2971-2977` and `3131-3132` — COMMITTED target with a marker uses only
    `COMMITTED_TARGET_BACKLOG_DENIED` in the transfer chain until the marker clears, *then* falls
    to the ordinary ledger; no overlap window found where both ledgers advance for the same native
    event. **Held.**
11. **Crash barriers at every rename (PREPARED→TARGET_PUBLISHED→SOURCE_TOMBSTONED→COMMITTED).**
    Verified each barrier's `state_evidence` arm is a strict discriminated shape requiring the
    correct subset of nonempty receipts (`1986-2001`) and that recovery's `next_step` is a pure
    function of `journal_state` (`2013-2014`, `2207-2209`), so a crash at any barrier leaves exactly
    one legal next step, never two. Checked the recursion-avoidance construction at `2220-2225`
    (`recovery_basis_state_sha256` is the pre-capability-insertion hash, avoiding a
    hash-of-itself). **Held.**
12. **Predicate-6 hook-kind ambiguity (own construction, follow-up to #5).** Confirmed predicate 6's
    selecting condition (`2128`) does not explicitly restrict which hook kind (PreTool/PostTool/Stop)
    it fires on, unlike 4 (explicitly PreTool) and 5 (explicitly Stop). Because the action is
    idempotent target cleanup with no event append (`"append nothing; run the idempotent §6.1
    target cleanup exactly once"`), and because it cannot collide with 4 or 5 for the reasons in
    attack #5, this is not a defect — noted as a documentation-clarity MINOR, not raised as a
    Finding (see Out-of-scope observations — actually kept in-scope since §5.3 is squarely mine,
    but folded into the same MINOR bucket as attack #6 rather than double-counted).
13. **`RECOVERY_CAPABILITY_BUSY`/`RECOVERY_OWNER_BUSY` leftover-reference check.** Ran
    `grep -n "RECOVERY_CAPABILITY_BUSY\|RECOVERY_OWNER_BUSY"` against the full plan file: exactly
    three hits, all in "this was deleted" / "never restore this" framing (`351`, `2178`, `5244`),
    zero live-usage leftovers. **Held.**
14. **§9 lock order / mutation protocol (`3921-4101`).** Attacked the `S(T,NEW)` race-restore
    snapshot mechanism for a case where a target became `EXISTING_CURRENT` (not `EXISTING_OTHER`)
    after capability issuance — confirmed text explicitly treats this as `RECOVERY_REQUIRED`
    inconsistent-state drift (`3957-3959`: "Because the immutable issuance projection was either
    NO_PIN or bound to a different canonical project, a recensus value EXISTING_CURRENT is
    inconsistent state drift and enters RECOVERY_REQUIRED; only EXISTING_OTHER takes this no-change
    race arm"), i.e., it fails closed rather than silently reusing the wrong project. **Held.**
15. **§9.3 recovery-claim census precedence table (`4056-4069`).** Attempted to find an
    unrepresented combination (e.g., current absent + next malformed, or current malformed + next
    proven-dead) — traced against the stated precedence rows 1–7 and confirmed row 1 ("cap+1,
    malformed slot, unknown name, multiple distinct valid owner tuples, liveness-unprovable record,
    or valid current/next with different inode/hash/owner") catches every malformed/ambiguous shape
    as the first-matching, highest-priority rule, so an "obviously missing" cell like
    current-malformed+next-live still resolves (row 1: malformed slot). **Held** — no gap found.
16. **§10.3 atomic activation tuple ordering.** Attempted to construct a crash that leaves two
    legal successors for one durable state tuple. Traced the single-tuple/single-successor claim at
    `4411-4413` against the explicit forward order (`4344-4401`) and rollback order (`4413-4422`),
    including the helper chmod state machine's explicit crash oracle (`4403-4409`, "Helper-mode
    publication has a total crash oracle, not a label-only assumption"). **Held** — every crash
    point I traced (HELPER_PREPARED, FENCED_PREPARED, HOST_INHIBITED, REPO_INDEX_C1, REPO_REF_C1,
    CODEX_TRUST_VERIFIED, CUTOVER_PREPARED, POINTER_G3, SHIM_PROBES_PASSED, HELPER_DISABLED,
    MODES_RESTORED) has exactly one recorded next action.
17. **§14 T-section / §15 mutant coverage for the transfer subsystem.** Cross-checked that every
    named biting mutant in the transfer paragraphs of §15 (`5233-5248`) maps to an actual assertion
    in `T-MATRIX` (`5110-5165`) and to a concrete mechanism in §5.3/§6/§7/§8.2 rather than being an
    assertion with no corresponding mechanism (which would be vacuous). Spot-checked
    "let one invocation match two input-table predicates" (`5243`) against attack #5 above (I
    constructed the actual disjointness argument rather than trusting the assertion's existence),
    and "re-run the liveness oracle against a recorded dead owner" (`5246-5247`) against the
    mechanism text `2163-2164`/`2178` ("the oracle is never re-run against a recorded dead owner").
    **Held** for both spot-checks.
18. **Hash-formula field-order spot check.** Compared `state_evidence_sha256`'s declared preimage
    (`LP(state)||LP(each state_evidence scalar in the displayed order)`, `2024-2025`) against the
    state_evidence object shapes (`1986-1999`), which each also carry their own `kind` field first.
    This means `state`/`kind` is folded into the hash twice (once as the outer scalar, once inside
    the nested object). Not a defect — redundant domain separation, not ambiguity or collision risk
    — noted only as a triviality, not raised as a finding.

## Findings

- **MINOR-1 — capability-rotation liveness under adversarial dual-session cadence** (§5.3,
  `2119-2145`, `2161-2180`). The seven-predicate `transfer_invocation_kind` table correctly
  prevents any *safety* violation (no double-consume, no stale-capability reuse, no lost
  authority — `recovery_sequence` is strictly monotonic and a rotated-away `capability_id` is
  "permanently unconsumable", `2174`). However, because each bound session's attestation cursor is
  independent (`2036-2038`) and either source or target can independently trigger
  `STALE_CAPABILITY_ROTATED` on its own fresh human event, a pathological interleaving in which
  both sides keep sending brand-new human turns just fast enough that the recovering side never
  gets a "no-new-event" invocation before the other side rotates the capability away again could
  defer recovery indefinitely. This does **not** occur under ordinary single-message-per-turn
  usage (the very next tool call within the same turn already satisfies predicate 4 with no new
  attestation), so it is not a BLOCKER (nothing is unreachable, corrupted, or unrecoverable — the
  journal stays exactly where it was) and not a MAJOR (it does not change any execution or review
  outcome the plan asserts, since the plan makes no bounded-time recovery claim). Contract
  conflict: none stated — the plan never claims a liveness bound on recovery completion time, only
  safety (at most one owner/capability consumes, `2214`). Minimum repair (optional, not required
  for this gate): add one sentence to §5.3 near `2214` disclaiming that recovery completion time is
  unbounded under concurrent dual-session human activity but safety (no double-consume) always
  holds, so a reviewer never has to re-derive this from first principles.

## Out-of-scope observations

- §0.3's literal baseline hash values (KILL-02's *rule* was exercised and held at both checkpoints;
  the literal tuple values themselves are out of gate scope per §17.0).
- §2.15–2.17 closure-map history rows and §12.3 round-number lists were not attacked (explicitly
  out of scope per §17.0); observed in passing that the round-pointer invariant text (`4732-4735`)
  is internally consistent with the current on-disk set (R19–R23 present as untracked files per the
  KILL-03 derivation above, R24 present as a routing-only artifact, R25 absent) but this is
  bookkeeping, not a gate-blocking observation.
- `.claude/observability/rules.yaml` (bare path) and `memory/evals/routing/fixtures.jsonl` show as
  modified in the working tree; both are explicitly non-envelope per §0.3's own text, so this is
  recorded only as evidence supporting the KILL-03 derivation above, not as a finding.

## Residual risk

- MINOR-1 above is the only residual risk identified in scope. It is a liveness property gap, not
  a safety gap, and requires an adversarial/coincidental two-session interleaving pattern that
  ordinary single-user usage does not produce.
- Downstream ref state (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`) could not be verified from this
  session (project-scope guard refusal, recorded above); this is a session-capability limitation,
  not a plan defect, and is explicitly anticipated by the task framing.
- This review, like prior rounds, is a textual/mechanical audit of a specification document; no
  implementation exists yet to run the described mutants against. Severity judgments above are
  based on internal consistency and stated invariants, not on executing code.

## Verification

Re-checked immediately after writing this report, before reporting the final hashes:

```
HEAD           = c146cb70fa8ae95159d31763d57613194b74d68d
upstream       = c146cb70fa8ae95159d31763d57613194b74d68d
tree           = f15777109b3f524ab0a87888ba74ee4f825a8066
ahead/behind   = 0 0
plan sha256    = 1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738
plan wc -l     = 5666
```

All identical to both checkpoints above — no drift, round not stale as of report completion.
KILL-03 re-derived post-write against the same 148-line envelope extract: still zero intersection
with `git status --porcelain --untracked-files=all` (the new `REDTEAM-ROUND-25-TRANSACTION.md`
file itself is not a §12.1/§12.2 envelope path, so its own creation does not trigger KILL-03).

## Conclusion

Plan SHA-256: `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738` (5,666 lines).
HEAD/upstream: `c146cb70fa8ae95159d31763d57613194b74d68d` (tree
`f15777109b3f524ab0a87888ba74ee4f825a8066`), unmoved throughout the round.

Verdict: **PASS** — BLOCKER: 0, MAJOR: 0, MINOR: 1.
