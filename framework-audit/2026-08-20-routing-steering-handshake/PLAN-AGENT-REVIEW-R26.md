# Plan Agent Gate Review — Round 26

Independent reviewer. Scope: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
§17.0 in-scope sections only (§4, §5, §6, §7, §8, §9, §10, §11, §12.1–12.2, §13, §14, §15, §16). No file other
than this one was created, modified, deleted or renamed. No git mutation of any kind was performed.

## Receipt

- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Expected SHA-256 `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`, expected length 5,747 lines.
  - Checkpoint 1 (session start): `shasum -a 256` = `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`; `wc -l` = `5747`. Match.
  - Checkpoint 2 (immediately before writing this report): `shasum -a 256` =
    `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`; `wc -l` = `5747`. Match, byte-identical to
    checkpoint 1.
- Expected `BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70fa8ae95159d31763d57613194b74d68d`,
  `BASELINE_TREE=f15777109b3f524ab0a87888ba74ee4f825a8066`.
  - Checkpoint 1: `git rev-parse HEAD` = `c146cb70fa8ae95159d31763d57613194b74d68d`; `git rev-parse @{u}` =
    `c146cb70fa8ae95159d31763d57613194b74d68d`; `git rev-parse HEAD^{tree}` =
    `f15777109b3f524ab0a87888ba74ee4f825a8066`. Match.
  - Checkpoint 2: identical re-check, same three values. Match. HEAD and upstream remained equal throughout; no
    commit landed on either ref during this round.
- **KILL-03 derivation** (own literal-line membership only, per §0.3's rule as extended to §12.1/§12.2 by §17.0):
  `git status -sb` at both checkpoints shows tracked modifications to `.claude/observability/observations.jsonl`,
  `.claude/observability/rules.yaml`, `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`,
  and `memory/evals/routing/fixtures.jsonl`, plus untracked `.playwright-cli/`,
  `PLAN-AGENT-REVIEW-R19/R20/R21/R22/R23/R25.md`, `REDTEAM-ROUND-24-ROUTING.md`, `REDTEAM-ROUND-25-ROUTING.md`,
  `REDTEAM-ROUND-25-TRANSACTION.md`, and (newly appeared between my read pass and pre-write checkpoint)
  `REDTEAM-ROUND-26-ROUTING.md`. I enumerated every literal line in §12.1 (`FINAL-EXECUTION-PLAN.md:4536-4580`)
  and §12.2 (`FINAL-EXECUTION-PLAN.md:4597-4652`, plus the "Additional exact tracked paths" block at
  `4656-4713`) and compared by exact string equality, not substring: none of the modified/untracked paths above
  appears as its own literal line in either list. In particular `.claude/observability/rules.yaml` (bare) is not
  itself a §12.1/§12.2 line — it occurs only nested under `payload/...` paths in both envelopes, which the plan's
  own §0.3 membership rule (`108-... / 98-99`) already holds is not envelope membership; the plan file itself is
  the audit input under active review, not an envelope path; the untracked review/red-team receipts and
  `.playwright-cli/` are unrelated to §12.1/§12.2. **KILL-03 does not fire.**
- Downstream: task instructs that the project-scope guard will refuse Bash under `/Users/luca/Desktop/项目`. I
  attempted `git -C "/Users/luca/Desktop/项目/muse" rev-parse HEAD` (and a `cd`+bare `git rev-parse HEAD`
  variant) to independently verify the downstream ref against the expected
  `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`. Verbatim refusal received:
  > `Bash 相对路径会离开 luca_gstack 并进入未绑定/跨项目作用域（/Users/luca/Desktop/项目/muse →
  > /Users/luca/Desktop/项目/muse）；请先完成项目绑定或改用明确的框架内路径。`

  Per instructions I did not route around this. Downstream ref status: **UNVERIFIABLE_FROM_THIS_SESSION**. (The
  plan's own §13 step 6 and §0.3 KILL-02 text independently assert the same downstream value
  `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`, but that is the plan's self-description, not this session's
  independent verification of the downstream repository.)
- Byte 0 → EOF: the plan was read start to finish in ordered chunks (lines 1–500, 501–830, 831–1160, 1161–1490,
  1491–1820, 1821–2150, 2151–2480 [interrupted by session suspension/resume, resumed at the same offset],
  2481–2810, 2811–3210, 3211–3610, 3611–4010, 4011–4410, 4411–4810, 4811–5140, 5141–5470, 5471–5747), covering
  every line including the final line 5747 and the document's closing paragraph. §0–§3 and §17 were read for
  context/receipt purposes only (out of the BLOCKER/MAJOR gate per §17.0); §4–§16 were read in full for gate
  purposes as required.
- Drift statement: no drift at any point. Plan bytes/line-count and HEAD/upstream/tree were identical at the
  session-start checkpoint and the immediately-pre-write checkpoint. This round is **not** stale.
- Confirmed before writing: `PLAN-AGENT-REVIEW-R26.md` did not exist anywhere under
  `framework-audit/2026-08-20-routing-steering-handshake/` before this file was created (only R19–R23 and R25
  were present, per the coordinator's earlier confirmation and my own re-check). A sibling artifact,
  `REDTEAM-ROUND-26-ROUTING.md`, appeared during this session (a parallel red-team track's output, not a Plan
  Agent gate receipt) — it is a different required-new output than the one this task assigns me, does not
  overlap my file, and its presence does not affect KILL-02/KILL-03 for this review.

## Verdict

`NOT_READY_FOR_REDTEAM`
- BLOCKER: 0
- MAJOR: 3
- MINOR: 2

## Negation and quoting grammar

Full text re-read in place: NEG/ADV/NEG_SUSPECT and the fail-closed rule at `FINAL-EXECUTION-PLAN.md:518-591`,
identical-by-construction reuse in §5.1 at `595-634`, quoting at `501-516`. I attacked both directions
constructively (I did not run these through an actual tokenizer/implementation — none exists yet — so each
verdict below is derived by applying the plan's own stated rules mechanically, exactly as a build-time fixture
would).

**1. A genuine negation that still authorizes (the more serious direction).**

`更别说进入 luca app 项目` ("let alone entering the luca app project" — a common Mandarin discourse move that
flatly denies the action). Walk the rule at `518-522` and the fail-closed rule at `531-547`:

- Marker `项目` is clause-terminal (end of string) → satisfies the alias-marker positive condition at `483-489`.
- The token immediately before the verb `进入` is `说` ("say"), not an `ADV` member (`ADV = 再|又|还|也|都`).
  Per the plan's own words at `520-522`, *"`ADV` is closed: any other intervening token means the negator does
  not attach"* — so `别` does **not** attach to `进入`. Primary NEG/ADV cancellation correctly does not fire
  (correctly, by the rule's own definition — but the sentence *is* a negation).
- The fail-closed net is scoped to *"the token immediately before the directive verb, plus the one token before
  that when the nearer is an `ADV` member"* (`533-536`). The nearer token is `说`, which is not an `ADV` member,
  so the window never extends to `别`, and `说` itself contains no `NEG_SUSPECT` character. The safety net does
  not fire either.
- Net result: the clause is treated as an ordinary affirmative directive and resolves to canonical `muse` — a
  wrong authorization of a switch that the sentence's plain meaning explicitly declines.

This is tokenization-independent: whether "token" means a segmented word or a single character, `说` sits
between `别` and `进入` either way and is itself not a suspect character, so the escape does not depend on the
undefined granularity of "token" (see finding 3). This directly falsifies the plan's own claimed invariant at
`548-551`: *"An unrecognized negator can therefore cost availability but can never again produce a wrong
authorization, which closes this defect class rather than deferring it to the next omission."* `更别说`/`别说`
constructions are a systematic class (any verb-of-speech-plus-别 "let alone" idiom), not a single missed lexical
item, and none of the two exempt compound classes (`538-542`) cover it.

**2. A rhetorical question that still authorizes.**

`难道现在要进入 luca app 项目` ("surely we're not supposed to enter the luca app project now"). `难道` is a
standard rhetorical-negation marker in Mandarin, is not a member of `NEG`, `ADV`, or `NEG_SUSPECT`, and — unlike
the negator check — the epistemic/question-token check at `559-561` is a whole-clause "scopes the directive"
test, not limited to the attachment window, yet its closed set (`如何|怎么|怎样|请告诉我|能不能|是否|要不要`) does
not include `难道` (or `岂|莫非`, other common rhetorical markers). The clause-terminal marker condition is
satisfied cleanly (no trailing-particle ambiguity needed for this example), so the clause authorizes and resolves
to `muse`, when the sentence's evident force is a denial/question, not a directive.

**3. Over-refusal, plus the underlying gap that makes both directions possible.**

`毫不犹豫进入 luca app 项目吧` ("go ahead and enter the luca app project without hesitation") — `毫不犹豫` is a
common four-character adverbial idiom meaning "without hesitation," used here as a manner adverb, not as a
negation of the directive. Under a plausible word-level tokenizer, the token immediately preceding `进入` is the
whole idiom `毫不犹豫`, which contains the `NEG_SUSPECT` character `不`, matches no `NEG` member exactly, and is
in neither exempt compound class (`538-542`) — so per `544-547` the clause is **wrongly** `NEEDS_CONTEXT
(negation_unresolved)`, even though nothing here negates entering. This is the same defect class the author's
own R25 repair already found once (per the coordinator's framing) and is not closed: any four-character idiom
containing a `NEG_SUSPECT` character used as a pre-verbal manner adverb (`毫不犹豫`, `二话不说`, `全然不顾`, …)
reproduces it.

Critically, this verdict is **not stable**: under a character-level tokenizer the immediately-preceding "token"
would be just `豫` (the idiom's last character), which contains no suspect character, and the fail-closed arm
would not fire at all for the same input. The plan never operationally defines what a "token" is for Chinese
text (which has no orthographic word boundaries) despite building the entire attachment-window mechanism — used
over a dozen times across §4.2 and §5.1 — on that undefined primitive. This is itself a gap in a document that
elsewhere insists on "no implementation-chosen default" and "mechanically decidable" outcomes (e.g. `1139-1140`,
`3446-3447`): two different, equally reasonable implementations of the same written rule can legally disagree on
this input.

**Findings 1–3 are new; I did not find a way to re-derive them from, or reduce them to, the specific defects
R18/R21/R24/R25 already closed** (bare `别`, bare `不`, `没`/`没有`, `莫` + adjacency, and the quoting third-arm
gap) — they are a different shape of gap: (1) is an attachment-window escape via an intervening non-`ADV` verb,
not a missing lexical member; (2) is a missing member of the *epistemic*, not negation, closed set; (3) is a
tokenization-granularity gap underneath the already-fixed `NEG_SUSPECT` mechanism.

**Quoting totality** (`501-516`): I could not falsify the three-arm function itself. Nested quotes
(`` `进入「luca app」项目` `` inside backticks) fall to arm 1 or arm 3 depending on whether the outer or inner
delimiter is read first, but either reading keeps the clause non-selecting or `NEEDS_CONTEXT`, never a wrong
authorization, so I do not raise it as a defect — at most an observation that nested-delimiter precedence is
unstated (delimiter type-matching per `502-503` handles balancing but not nesting order). A quote spanning the
verb but not the target (`进入「的设置」项目` is degenerate; a cleaner case, `` 进入`了 luca app 项目 `` with a
stray unmatched opener) correctly falls to "unbalanced delimiter suppresses nothing" (`503`) and is then
evaluated as ordinary text — this seems intended and I could not construct a wrong-authorization case from it.

**Confirming §5.1 shares the identical sets** (`612-616`): yes, `NEG`, `ADV` are restated with the same
enumeration and I did not find a second, drifted definition — this property (closed at R21) still holds.

**§14 fixture-coverage check** (`4906-4927`): R-SIGNAL is explicit and complete for the §5.1 *structural*
negation grammar ("one fixture per `NEG` member per order, one per `ADV` member, one proving an unlisted
intervening token breaks attachment, and one proving a `NEG_SUSPECT` non-member (`非`)..."). For the §4.2
*alias-selection* negation grammar it is looser: "every 2/3, same-span, cross-clause, project-directive negation
over every `NEG` member including bare `不`" does not explicitly re-enumerate the two exempt compound classes or
an ADV/unlisted-intervening-token pair *for that grammar specifically*, even though §4.2's own prose (`538-542`,
`556-559`) commits to exactly that coverage. This is likely intentional non-duplication (§4.2 already states the
requirement) rather than a real coverage hole, but it is not restated with the same rigor R-SIGNAL uses for
§5.1, so I record it as MINOR rather than silently assuming equivalence.

## Mechanical re-test

**R16 B2 mechanics** (transfer journal / recovery, `FINAL-EXECUTION-PLAN.md:2030-2350`, outcome table
`2219-2228`, `transfer_invocation_kind` table `2170-2245`). All four scenarios have a unique conforming
transition, each independently re-derived from the text (not merely re-read from the R25 verdict):
- (a) nonterminal journal / no scan / proven-dead controller / fresh E1 attested, then the exact
  `plan-transfer recover` PreTool with no pending candidate: E1's attestation drives `NEWLY_ATTESTED_EVENT`
  (predicate 3, `2183`), whose outcome-table row for `recovery_capability_or_null=null` + census `PROVEN_DEAD`
  mints `PROVEN_DEAD_RECOVERY_ISSUED` bound to E1 (`2221`); the subsequent same-event `recover` PreTool then
  matches predicate 4(a) exactly (`2184`), consuming that capability and performing its `next_step` with no new
  ledger event. Unique.
- (b) the same at ordinary count 256 (`ledger_admission=FULL`) with a one-item scan, then a retry with **no**
  new `UserPromptSubmit`: this is explicitly named in the text, not inferred — `2198-2203`: *"Once a
  `SCAN_DRAIN_EVENT` rename proves `consumed_count == submitted_count` and removes the scan object, the very
  next PreToolUse/state-mutating PostToolUse/Stop re-enters this table with `transfer_scan` absent and may
  select predicate 4, 5 or 6 **without another `UserPromptSubmit`**."* Unique and directly stated.
- (c) ISSUED E1 capability when fresh E2 is attested before controller consumption: E2's attestation is
  `NEWLY_ATTESTED_EVENT` again; the outcome table's `ISSUED` row whose `dead_owner_sha256` equals the recomputed
  owner hash selects `STALE_CAPABILITY_ROTATED` (`2224`), and `2201-2203` states plainly that *"an older-event
  capability can never satisfy predicate 4 and is never retained."* Unique.
- (d) an IN_PROGRESS RECOVERY owner that has crashed, on fresh E2: outcome table row `CONSUMED` + census
  `PROVEN_DEAD` → `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object at a strictly higher
  `recovery_sequence` (`2226-2228`). Unique.

I found no gap in this sub-area on independent re-derivation; it is consistent with R25's transaction-lane PASS
(0/0/1).

**Totality/reachability.** §5.3's `transfer_invocation_kind` (`2170-2245`) states its seven predicates
"partition the input space" (`2189`) with predicate 7 as an explicit catch-all — I did not find an input that
matches two predicates or none. §8.1's `TARGET_EXISTS` table (`3476-3497`) and the `route_event_kind` classifier
(`3511-3581`) claim generation from a closed enum with "missing subphase/cell is a mechanical error" language
(`3645-3648`); I traced several boundary rows (`PLAN_EXECUTION_FAILURE_DRAIN`, `PLAN_EXECUTION_TRANSFERRED`,
`DEFERRED_BY_PROJECT_CHANGE`) by hand against §8.2's global precedence (`3650-3711`) and did not find an
unreachable arm or a silent default beyond what R21–R25 already closed (the momentary-worktree-state class,
already excised per `380-384`). §9.3's recovery-control table (`4089-4097`) and claim-census precedence table
(`4123-4131`) are each explicitly cross-tested against every named state combination (`4104-4105`, `4133-4136`);
I did not find a missing row.

**§12.1–12.2 / §13 / §10 coherence.** Parent chain in §13 (`A0` parent = `BASELINE_HEAD`, `B1` parent `A0`, `B2`
parent `B1`, `V1` parent `B2`, `C1` parent `V1`, `D1` parent the downstream baseline hash — `4826-4864`) matches
§10.1's narrative order (`4193-4221`) and §0.3's KILL-02 tuple naming exactly; I did not find a drifted
restatement of `BASELINE_HEAD`/`BASELINE_TREE` in §13 this round (the class R22/R23 caught is closed by the
single-definition-site rule, and it held under my read). §12.1's g0 bridge path list (`4536-4580`) and §12.2's
v3/downstream path list (`4600-4713`) match the roles §10.1–10.3 describe (dispatcher/shims/activator/trust
controller, the closed bootstrap-TCB literal set at `4342-4358`); I cross-checked the bootstrap-TCB enumeration
against §12.1's bare (non-`payload/`) path lines and found them consistent.

**§14/§15 coverage of §13.** §14's R/T assertion families and §15's mutant list name essentially every mechanism
§13's ten steps require (bridge fault matrix at `T-ACTIVATE`, `5264-5292`; transfer/checkpoint mechanics at
`R-OBLIGATION`/`T-MATRIX`, `5055-5241`; the 22-verb equality set at `5052-5054`, `5356`). This matches R25's
finding that coverage is essentially complete; I did not find a new gap on this pass.

**§5.3's liveness non-claim** (`2278-2285`). Judgment: adequate as a MINOR-level disclosure, not a missing
in-scope bound. The plan explicitly narrows the concern to a pathological interleaving requiring fresh human
events to keep landing on both bound sessions faster than consumption, states plainly "this plan does not claim
otherwise," and ties the safety property (`recovery_sequence` strictly monotonic, no authority lost/duplicated)
to what is actually load-bearing for KILL-09/KILL-08. Providing an actual starvation bound would be new
mechanism, not a documentation fix, and the plan already says as much ("a starvation bound, if one is ever
wanted, is a separate change with its own review," `2284-2285`). I do not think withholding that bound is itself
an in-scope defect; R25 closed the equivalent MINOR by adding this text, and I concur it is closed.

## Findings

1. **[MAJOR] §4.2 negation attachment has a live escape via an intervening non-`ADV` verb of speech ("let-alone"
   constructions).** `更别说进入 luca app 项目` (and the family `别说...`, `更不要说...`) is a genuine denial of
   the directive that neither the primary `NEG`/`ADV` attachment rule nor the `NEG_SUSPECT` fail-closed net
   catches, because the intervening token `说` is itself unremarkable (not `ADV`, not suspect) and sits between
   `别` and the verb, which per the rule's own text (`520-522`) breaks attachment — and the fail-closed window
   never reaches past `说` to see `别` at all (`533-536`). This directly falsifies the asymmetric safety claim at
   `548-551`. Minimum repair: extend the fail-closed condition (not the `ADV` set) so that a verb-of-speech token
   (`说|讲|提`) immediately preceding the directive verb, itself immediately preceded by a `NEG`/`NEG_SUSPECT`
   character within one more token, also triggers `NEEDS_CONTEXT(negation_unresolved)` rather than silently
   authorizing — plus one frozen negative fixture for `更别说`/`别说`. Location: `FINAL-EXECUTION-PLAN.md:518-552`
   (rule), `4906-4927` (§14 fixture requirement).
2. **[MAJOR] §4.2's epistemic/question closed set omits rhetorical-negation markers (`难道`, `岂`, `莫非`).**
   `难道现在要进入 luca app 项目` is not recognized as a non-directive by any rule (it is not `NEG`/`ADV`/
   `NEG_SUSPECT`, and the epistemic-token check at `559-561` only recognizes `如何|怎么|怎样|请告诉我|能不能|
   是否|要不要`), so it authorizes a switch when its plain meaning denies one. Minimum repair: add `难道|岂|
   莫非` to the epistemic/question closed set at `560-561`, with one frozen negative fixture per member.
   Location: `FINAL-EXECUTION-PLAN.md:559-561`.
3. **[MAJOR] The attachment-window mechanism depends on an undefined notion of "token" for Chinese text, and at
   least one concrete over-refusal (idiomatic manner-adverbs containing a `NEG_SUSPECT` character, e.g. `毫不
   犹豫进入 luca app 项目`) is only reproducible under one of two equally plausible tokenizations.** The plan
   never states whether "token" means a segmented word or a character, yet the fail-closed rule's correctness
   (and, per finding 1, the primary rule's correctness) hinges on that choice. This is a specification gap, not
   only an over-refusal instance: two conforming implementations of the same written rule can legally disagree
   on the same input. Minimum repair: state the tokenization method (e.g., "word-segmented by [specific
   library/algorithm]" or "single Unicode code points") as a manifest-bound, testable primitive, the same way the
   plan already pins canonical base64url, NFKC normalization, and clause boundaries elsewhere; then re-verify
   whether idiom-adverb over-refusal is real under that pinned definition and, if so, add an exemption class the
   way `无论`/`不得不` were already exempted. Location: `FINAL-EXECUTION-PLAN.md:533-536` (window definition),
   `520-522` (identical gap for `ADV` attachment).
4. **[MINOR] §14's R-SIGNAL restates the full per-member/per-exempt-class fixture requirement for §5.1's
   structural-negation grammar but only loosely (`"over every NEG member including bare 不"`) for §4.2's
   alias-selection grammar**, even though §4.2's own prose (`538-542`, `556-559`) commits to the same coverage.
   Likely intentional (avoiding restating an already-stated requirement) rather than a real hole, but worth
   tightening so the corpus requirement is traceable from §14 alone without cross-referencing §4.2's prose.
   Minimum repair: one added clause in R-SIGNAL naming the two exempt compound classes and the alias-grammar
   `ADV`/unlisted-intervening-token fixtures explicitly. Location: `FINAL-EXECUTION-PLAN.md:4906-4913`.
5. **[MINOR] The trailing-content disposition after a clause-terminal alias/high-ambiguity marker (§4.2 bullets
   1–2, `483-492`) is not stated as total the way quoting explicitly is ("there is no fourth", `504`).** The
   rule gives only two named outcomes for what follows the marker — nothing/polite-particle (authorizing) or a
   closed content-set member (non-authorizing) — and does not say what happens for a third, unlisted trailing
   particle (`了|呢|嘛|啦`, etc.), e.g. `更别说进入 luca app 项目了`. A charitable reading (anything other than
   clause-terminal-or-polite-particle fails the positive condition and is therefore non-authorizing) resolves it
   fail-closed and safely, but the text does not say so explicitly the way the quoting rule does. Minimum
   repair: one sentence stating the trailing-content disposition is likewise total and explicitly closing the
   "unlisted trailing particle" arm to fail-closed. Location: `FINAL-EXECUTION-PLAN.md:483-492`.

## Out-of-scope observations

None beyond what §17.0 already excludes (the §0.3 baseline-tuple literal hashes, the §2.15–2.17 closure-map
history rows, and the §12.3 round-number lists). I did not separately audit those for bookkeeping accuracy since
they are explicitly non-blocking and not implemented.

## Verification

Post-write re-checks, run immediately after saving this file (before reporting):

```
plan SHA-256: 0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4
plan lines:   5747
HEAD:         c146cb70fa8ae95159d31763d57613194b74d68d
upstream:     c146cb70fa8ae95159d31763d57613194b74d68d
tree:         f15777109b3f524ab0a87888ba74ee4f825a8066
```

All five values are unchanged from both earlier checkpoints. No drift occurred across the entire review,
including during writing. This round remains valid at the moment this report is finalized.

## Gate conclusion

Plan SHA-256 `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`; HEAD/upstream
`c146cb70fa8ae95159d31763d57613194b74d68d`.

`NOT_READY_FOR_REDTEAM`
- BLOCKER: 0
- MAJOR: 3
- MINOR: 2

Three real, independently-constructed defects remain open in the §4.2/§5.1 negation/quoting grammar — the
section that has now failed six consecutive reviews (R18, R21, R24, R25, and this round) — plus two minor
documentation-completeness items. Two of the three MAJOR findings are wrong-authorization escapes (the more
serious failure mode per the plan's own stated asymmetry), not further over-refusal instances, so this is not a
narrowing repeat of the prior five rounds' pattern. Recommend one more repair-and-review cycle before dispatching
either red team.
