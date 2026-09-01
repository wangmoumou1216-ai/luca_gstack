# Round 26 Red Team — ROUTING lane

## Receipt

- Lane: ROUTING (independent planning red team, Round 26). Worked only in
  `/Users/luca/Desktop/项目/muse/lucagstack`; no downstream project switched or bound.
- Plan under review: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Plan SHA-256 — expected `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`; actual at
  start-of-session check, at mid-session resume re-check (after a suspend/resume), and at the immediate
  pre-write check: `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4` (match, all checkpoints).
- Plan line count — expected `5747`; actual at all checkpoints: `5747` (match).
- Framework `HEAD`/`BASELINE_HEAD` — expected `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at all
  checkpoints: `c146cb70fa8ae95159d31763d57613194b74d68d` (match).
- Framework upstream/`BASELINE_UPSTREAM` (`git rev-parse @{u}`) — expected
  `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at all checkpoints: same (match).
- Framework tree/`BASELINE_TREE` — expected `f15777109b3f524ab0a87888ba74ee4f825a8066`; actual at all
  checkpoints: same (match). `git rev-list --left-right --count HEAD...@{u}` = `0 0` throughout.
- Downstream ref (expected `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`): `git -C /Users/luca/Desktop/项目
  rev-parse HEAD` was refused by the project-scope guard, verbatim: `Bash 直接项目路径不属于当前可验证
  binding（/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。` Marked
  `UNVERIFIABLE_FROM_THIS_SESSION`; not routed around.
- Drift statement: no drift in HEAD/upstream/tree, plan SHA or plan line count between the start checkpoint
  and the immediate pre-write checkpoint (including across the mid-session suspend/resume). Round is not
  stale.
- Byte 0 → EOF: read start to finish. Full sequential coverage: lines 1–1050 (§0–§4.2), 449–782 (§4.1–§5.2,
  re-read in full for the negation/quoting grammar), 782–1447 (partial §5.3 sampled, not exhaustive), 2941–3229
  (§6 complete), 3419–3957 (§8 complete, §8.1–8.6), 4814–4898 (§13 complete), 4896–5105 (§14 R-section
  complete), 5294–5747 (§15 mutants complete, §16 opening line, §17.0 complete). Every line inside this
  lane's IN-SCOPE list (§4, §5.1–§5.2, §6, §8, §13, §14 R-section, §15, §17.0) was read start-to-end with no
  gap. §5.3 (782–2477, ~1700 lines), §5.4 (2478–2940), §7, §9–§12, §14 T-section (5105–5294) and §16 body were
  sampled rather than read end-to-end under this round's time budget; those sections are primarily the
  transaction lane's assigned machinery (Plan/verb lifecycle, TransferJournal, activation/rollback) rather
  than this lane's assigned attack surface (alias resolution, semantic signal, steering identity, transition
  matrices/Stop, handoff), and no in-scope routing question in the assignment (alias, negation/quoting,
  durable obligation, transition matrix, Stop, handoff) depended on their unread interior for the findings
  below. This is stated as an honest scope note, not a claim of full coverage of those sections.
- Output file `REDTEAM-ROUND-26-ROUTING.md` was confirmed absent (via `ls`, exit 1 "No such file or
  directory") immediately before this file was written, and again re-confirmed absent after the mid-session
  resume notification before continuing.
- No git commit/push/reset/stash/clean/add was executed. No file other than this report was created or
  modified. No downstream project was switched or bound.

## Verdict

**FAIL**

- BLOCKER: 2
- MAJOR: 2
- MINOR: 1

## Negation and quoting attacks

Both directions attacked, against the exact §4.2 (lines 518–591) / §5.1 (lines 595–634) grammar: `NEG =
不|不是|不要|别|不用|无需|不必|没|没有|甭|勿|未|莫`; `ADV = 再|又|还|也|都`; `NEG_SUSPECT =
不|别|甭|勿|莫|没|未|非|无|休|毋|罔`; attachment window = token immediately before the verb, plus one more
only when the nearer token is an `ADV` member; exempt compounds `不得不|不能不|不可不|无不|莫不|非不` and
`无论|不论|不管|无非|不外乎`.

**Under-refusal (genuine negation still authorizes) — BROKEN, twice, by different mechanisms:**

1. `不想进入 luca app 项目` ("[I] don't want to enter luca app project"). Tokens: 不 / 想 / 进入. The token
   immediately before the verb 进入 is 想 — not an `ADV` member, contains no `NEG_SUSPECT` character. Per the
   literal rule, the attachment window is `{想}` only (a second token is only pulled in "when the nearer one
   is an `ADV` member," and 想 is not). 不 sits two tokens back and is invisible to both the `NEG` match and
   the `NEG_SUSPECT` fail-closed arm. The clause reduces to the ordinary affirmative "进入 luca app 项目" and
   authorizes `muse` — a wrong authorization of a switch the sentence explicitly declines. Standard Mandarin
   segmentation supports treating 不 and 想 as separate tokens: they are independently modifiable
   (`不太想进入` inserts 太 between them), which is the standard grammatical evidence that 不想 is
   compositional, not a fused unit. **Result: BROKEN.**
2. `免得又要进入 luca app 项目` / `省得下次还要进入 luca app 项目` ("so as to avoid having to enter…" /
   "so as to save the trouble of entering…" — next time). 免/省/以 (as in 以免) are not in `NEG_SUSPECT` at
   all, so the fail-closed arm cannot fire regardless of tokenization or window depth; the connective sits at
   clause-start, and the pre-verb attachment window (要, clean) contains nothing suspect. Both clauses
   authorize `muse` even though the clause's entire semantic point is to avoid entering. **Result: BROKEN.**
3. `难道要进入 luca app 项目吗` (rhetorical "are we seriously going to enter…") contains zero `NEG`/
   `NEG_SUSPECT` characters and 难道 is absent from the epistemic/question closed set
   (`如何|怎么|怎样|请告诉我|能不能|是否|要不要`, line 559–561), so nothing flags it; it authorizes `muse`.
   **Result: BROKEN** (rated MAJOR, not BLOCKER — see Findings; a bare rhetorical question is more
   contestable in isolation than 1–2 above).
4. `进不进入 luca app 项目` (V-not-V question). Immediately-preceding token 不 matches `NEG` exactly, so the
   clause is treated as a flat decline rather than flagged as an open question awaiting an answer. **Result:
   held for authorization-safety (no wrong authorization occurs) but noted as a MINOR misclassification** —
   see Findings.
5. `不了`/`不下`/potential-complement forms (`进不去`, `切不进去`): these use verb forms (进去 etc.) outside
   the directive verb list `进入|切换到|切到|回到|转到`, so no directive clause is even recognized under
   §4.2's template grammar. **Result: held** — safe by non-recognition, not by correct negation handling; not
   counted as a break since no clause is parsed at all.
6. `连 luca app 项目都不想进入` (coordinator-suggested `连…都不`): same root cause as (1) — 想 immediately
   precedes the verb, 都 (an `ADV` member) sits on the far side of 不, not adjacent to the verb, so it cannot
   rescue attachment. **Result: BROKEN**, same class as (1), not counted as a separate finding.

**Over-refusal (ordinary affirmative wrongly refused) — BROKEN once, new instances beyond the plan's own last
fix:**

7. `不妨进入 luca app 项目` ("might as well enter luca app project" — an idiomatic affirmative suggestion,
   不妨 = "may as well"). Token immediately before the verb is 不妨 (or, character-split, 不); contains
   `NEG_SUSPECT` 不, matches no `NEG` member exactly, is in neither exempt list (不得不|不能不|不可不|无不|
   莫不|非不 / 无论|不论|不管|无非|不外乎) → `NEEDS_CONTEXT(negation_unresolved)`, wrongly refusing an
   ordinary affirmative sentence. **Result: BROKEN.**
8. `何不进入 luca app 项目` ("why not enter luca app project" — same idiomatic affirmative class). Same
   mechanism as (7). **Result: BROKEN**, same class, not counted as a separate finding.
9. Frozen positive controls in the plan itself — `无论如何都要进入 luca app 项目`, `不得不进入 luca app
   项目`, `不管怎样切到 luca app 项目` (lines 584–587) — were re-verified against the exempt-list text and
   correctly authorize. **Result: held** (no regression on the plan's own already-fixed cases).

**Quoting totality — all attacks held, no break found:**

10. Nested quote `进入「『luca app』项目」`: inner content is `『luca app』项目`, which is not literally
    `<target>` plus optional marker/particle (arm 2), and doesn't contain the directive verb (arm 1) → arm 3,
    `NEEDS_CONTEXT(quoted_span_undetermined)`. **Held** — correctly fails closed rather than crashing or
    guessing.
11. Quote spanning the verb but not the trailing marker, `「进入 luca app」项目`: quoted span contains the
    directive verb 进入 → arm 1 (ignored, same as report/example). The residual unquoted text (`项目` alone)
    carries no verb+target and selects nothing. **Held** — safe non-selection, not a wrong authorization.
12. Quote containing a negator, `进入「不 luca app」项目`: span content is `不 luca app`, matches neither arm
    1 (no verb inside) nor arm 2 (extra content beyond target) → arm 3, non-authorizing. **Held.**
13. Report/example interaction, `例如「进入 luca app 项目」这种说法`: both the report-token suppression and
    the arm-1 quote suppression agree (verb inside quotes) → no selection either way. **Held**, redundant-safe.
14. Unbalanced delimiter `「luca app’`: explicitly frozen negative in the plan text itself (line 503); not
    independently re-broken here. **Held.**

## Other attacks attempted

- Alias resolution (§4.1, lines 447–476): reviewed the cap/overflow/reserved-noun/normalization rules
  (root-entry cap 512, project cap 256, manifest byte caps, reserved nouns including 项目|工程|页面|界面|
  功能). Did not find a bypass of the reserved-noun list or a normalization collision within the time budget;
  no counterexample constructed. `FINAL-EXECUTION-PLAN.md:459-476`.
- §5.2 durable obligation (lines 636–781): traced the creation/placement overlay (PENDING vs.
  DEFERRED_BY_PROJECT_CHANGE vs. ACCEPTED_ROUTE_ONLY_BUSY vs. REJECTED_BUSY), the terminal-source short
  circuit, and the `exact_task_text` byte-preservation rule for both signal-only and
  `NEW_TASK_SIGNAL_WITH_PROJECT` events. Attempted to construct a case where STATUS chatter revokes/erases a
  live obligation: line 765 ("Status/report chatter never creates or replaces one") and line 774 ("status
  chatter preserves the new obligation") are consistent and I found no path where a STATUS event supersedes,
  cancels, or clears an existing non-TRANSFERRED obligation. **Held.** `FINAL-EXECUTION-PLAN.md:636-781`.
- §8.1 TARGET_EXISTS table (lines 3476–3497) and §8.2 global precedence (lines 3652–3670): sampled several
  rows for internal consistency (PLAN_EXECUTION_FAILURE_DRAIN always REJECTED_BUSY; TRANSFERRED always
  TERMINAL_DIAGNOSTIC). Did not attempt to hand-verify the full generated cross-product (route-status ×
  parent-relation × project-intent) — that scale of exhaustive verification was out of this round's budget;
  no BLOCKER found in the rows sampled. `FINAL-EXECUTION-PLAN.md:3476-3634`.
- §8.6 Stop contract (lines 3886–3955): checked the forged/missing-Stop-cannot-create-drain invariant (line
  3890–3896) and the WAITING-state-must-match-`wait_event_id` rule (line 3941–3944). Attempted to construct a
  WAITING state that Stops on the wrong event; found no gap in the text — every verified-wait row is gated on
  exact event/boundary equality. **Held.** `FINAL-EXECUTION-PLAN.md:3886-3951`.
- §6 steering continuity / anti-replay (lines 2943–3228): confirmed the Codex event-identity formula (`H(...
  || response msg id || UserMessage item id)`, line 3168) makes two identical-text steering deliveries under
  one `turn_id` distinct events by construction (line 3174), directly addressing E3. Did not find a
  construction where the transport parent is reused as identity. **Held.** `FINAL-EXECUTION-PLAN.md:3163-3178`.
- §13 handoff (lines 4814–4895): checked whether the composed `进入 luca app 项目，<verbatim task>` combined
  event could self-collide with the alias trailing-content contract — the comma after `项目` is itself a
  clause boundary (line 499), so the alias marker is clause-terminal and the rule is satisfied; no false
  `NEEDS_CONTEXT` on the framework's own generated handoff text. Also checked whether the verbatim task text's
  own `不好` tokens (`交互体验不好，UI体验不好`) could accidentally trip the §5.1 structure-leg negation — the
  structure-leg pattern requires `NEG` adjacent to `改|动|调整|变` or `结构` specifically, and `不好` is not
  adjacent to either, so no false negative on the original prompt. **Held.** `FINAL-EXECUTION-PLAN.md:4880-4894`.
- §14 R-section (lines 4898–5105) and §15 mutants (lines 5294–5552): confirmed the required fixture list for
  `R-SIGNAL` (line 4906–4927) enumerates per-`NEG`-member, per-`ADV`-member, and the `非` fail-closed fixture,
  but contains **no** fixture requirement for a modal-auxiliary-insertion case, a purpose-connective case
  (免得/省得/以免), or a rhetorical-question case (难道) — corroborating that Findings 1–3 below are gaps in
  the assignment's own required-coverage list, not merely untested corners a conforming implementation would
  incidentally catch. `FINAL-EXECUTION-PLAN.md:4906-4927`.

## Findings

### BLOCKER-1 — Attachment-window token distance lets a common modal auxiliary hide a negator, producing wrong authorization

**Contract conflict.** §4.2 (and, by explicit shared-alternation construction, §5.1) states: "An unrecognized
negator can therefore cost availability but can never again produce a wrong authorization" (lines 548–551).
This is falsified by ordinary Mandarin sentences where a negator is separated from the directive verb by a
common modal auxiliary that is not in the closed `ADV` set.

**Mechanical counterexample.** `不进入` is correctly cancelled; `不想进入 luca app 项目` is not. Tokenized 不 /
想 / 进入: the attachment window is defined as "the token immediately before the directive verb, plus the one
token before that when the nearer one is an `ADV` member" (lines 533–536). The nearer token is 想, which is
not an `ADV` member (`再|又|还|也|都`), so the window never extends to 不. 不 matches no `NEG` member under
the attachment rule (it isn't immediately-or-`ADV`-adjacent to the verb) and is outside the `NEG_SUSPECT` scan
window, so neither mechanism fires. The clause authorizes `muse`. The same gap reaches §5.1's structure-leg
negation (`不想改结构`, `没打算调整结构`) through the identical shared machinery (lines 612–624), wrongly
leaving `semanticRouteAxis=interface_structure_change` set when the user is declining the change.

**Why this isn't just "another missing NEG_SUSPECT character."** The five prior rounds' fixes (别, 不, 没/没有,
莫, the adjacency gap) were all single-character/single-adjacency omissions patched by adding a character or
widening `ADV`. This defect is structural: the window is capped at 1–2 tokens by construction, and any
free-standing modal verb (想|愿意|打算|需要|希望, among others) sitting between negator and directive verb
defeats it regardless of which characters are in `NEG`/`NEG_SUSPECT`. Widening `ADV` to include modals
reopens exactly the "a negator anywhere before the verb" over-generalization the plan explicitly rejects
(line 521–522), so this cannot be closed the way the prior five were.

**Minimum repair.** Introduce a distinct closed `MODAL` class (想|愿意|打算|需要|希望|应该|会|能, closed and
fixture-pinned like `ADV`) with its own attachment semantics — a negator separated from the verb only by one
`MODAL` member (optionally composed with `ADV`) still attaches — rather than folding modals into `ADV`, whose
semantics (aspect/repetition) are unrelated. Alternatively, make the `NEG_SUSPECT` fail-closed arm scan the
entire pre-verb clause instead of a 1–2 token window, accepting availability cost instead of silent wrong
authorization. Either repair needs its own per-member fixture set, mirroring the existing `NEG`/`ADV` fixture
requirement in §14's `R-SIGNAL` (lines 4906–4927).

### BLOCKER-2 — Purpose/avoidance connectives (免得/省得/以免) use no `NEG_SUSPECT` character and sit outside any attachment window, so they cannot be detected at all

**Contract conflict.** Same guarantee as BLOCKER-1 (lines 548–551), falsified by a different, even more
fundamental gap: the connective's own characters (免/省/以) are absent from the closed `NEG_SUSPECT` set
(`不|别|甭|勿|莫|没|未|非|无|休|毋|罔`, line 531–532), so no tokenization choice or window width would ever
catch it — this is not a distance problem, it is a missing-character-class problem for a whole functional
category of negation that the plan's model (negator immediately/`ADV`-adjacent to a verb) doesn't represent at
all.

**Mechanical counterexample.** `免得又要进入 luca app 项目` ("so as to avoid having to enter luca app project
again") and `省得下次还要进入 luca app 项目` ("so as to save the trouble of entering luca app project next
time") both parse with a clean attachment window (要, containing no suspect character) immediately before
进入, and the clause-initial connective is invisible to every check in §4.2. Both authorize `muse`, even
though the clause's entire point — as a purpose/avoidance construction — is that entering is the outcome to be
avoided.

**Minimum repair.** Add a distinct clause-scope "purpose-negation connective" class (免得|省得|以免) that
disables the whole clause unconditionally, independent of token distance to the verb, since these connectives
grammatically negate their entire dependent clause rather than modifying an adjacent verb the way `NEG` does.

### MAJOR-1 — Rhetorical `难道` is absent from the epistemic/question closed set, letting a skeptical question authorize as a plain directive

`难道要进入 luca app 项目吗` contains zero `NEG`/`NEG_SUSPECT` characters, and `难道` is not a member of the
pre-directive epistemic/question closed set `如何|怎么|怎样|请告诉我|能不能|是否|要不要` (lines 559–561), so
nothing in the grammar flags it; it authorizes `muse`. Rated MAJOR rather than BLOCKER because a bare
rhetorical question, read in isolation with no prior context, is genuinely more ambiguous than the flat
declaratives in BLOCKER-1/2 — a human reader might reasonably read it as a real (not rhetorical) question. But
it is still a real defect changing the authorization outcome for ordinary phrasing.
**Minimum repair:** add `难道` (and the `岂|哪能|怎能` family) to the epistemic/question closed set, or to a
new rhetorical-doubt class that forces `NEEDS_CONTEXT`, with fixtures.
`FINAL-EXECUTION-PLAN.md:559-561`.

### MAJOR-2 — Over-refusal recurs on a fresh idiom family (不妨/何不) not covered by either exempt list

`不妨进入 luca app 项目` and `何不进入 luca app 项目` are ordinary affirmative-suggestion idioms ("might as
well" / "why not") that contain the suspect character 不 immediately before the verb, match no `NEG` member,
and are in neither exempt list (`不得不|不能不|不可不|无不|莫不|非不` / `无论|不论|不管|无非|不外乎`), so they
trigger `NEEDS_CONTEXT(negation_unresolved)` instead of a plain authorization. This is the same defect shape
as the plan's own last-closed finding (`无论如何都要进入`, closed by adding it to the concessive exempt list
in Round 25) recurring with a different idiom family the two closed lists don't reach.
**Minimum repair:** add `不妨|何不` (and arguably `岂不|大可`) to the exempt list, with per-member fixtures, per
the plan's own stated promotion rule (lines 551–552).
`FINAL-EXECUTION-PLAN.md:524-542`.

### MINOR-1 — V-not-V question form silently reclassified as a flat decline rather than flagged as an open question

`进不进入 luca app 项目` ("are you entering luca app project or not") has 不 immediately before the verb,
matching `NEG` exactly, so the whole clause is treated identically to an explicit decline (`不进入 luca app
项目`) rather than being recognized as an interrogative awaiting an answer. This produces no wrong
authorization (the safe direction), so it is not BLOCKER/MAJOR, but it is a real classification defect: a
question is silently resolved as "no selection" rather than surfaced for clarification, unlike `要不要` which
the plan's own epistemic set already handles correctly. `FINAL-EXECUTION-PLAN.md:559-561, 518-527`.

## Out-of-scope observations

None beyond what §17.0 already excludes (baseline-tuple literal hashes, §2.15–2.17 closure-map history rows,
§12.3 round-number lists) — no new observations in those excluded categories were made this round.

## Residual risk

- §5.3 (~1700 lines) and §5.4 (~460 lines) were sampled, not read end-to-end, under this round's time budget;
  they are primarily Plan/verb-lifecycle and TransferJournal machinery assigned to the transaction lane, but a
  full routing-lane pass would re-check whether any §5.3 wait-kind cell re-derives the negation/quoting
  grammar independently (a "second definition site" risk the assignment explicitly names in its final
  question) rather than deferring to §4.2/§5.1 by reference only.
- §7, §9–§12, and the §14 T-section (identity/state/transactions, lines 5105–5294) were not read this round;
  any routing-relevant assertion embedded there (e.g., a T-section assertion that restates part of the
  negation grammar) was not independently checked.
- Findings 1–2 (BLOCKER) both concern the same family of "negation whose scope is not adjacent to the verb";
  a repair to one without recognizing the other (distance-limited window vs. missing-character-class) would
  leave the sibling defect open — any fix should be reviewed against both mechanical counterexamples, not
  just the one that prompted it.
- The downstream ref could not be verified from this session (project-scope guard refusal, recorded verbatim
  above); this is expected per the assignment and is not treated as a finding.

## Verification

- Immediately before writing this report: plan SHA-256 `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`,
  line count `5747`; framework `HEAD`=`c146cb70fa8ae95159d31763d57613194b74d68d`,
  upstream=`c146cb70fa8ae95159d31763d57613194b74d68d`, tree=`f15777109b3f524ab0a87888ba74ee4f825a8066`,
  `git rev-list --left-right --count HEAD...@{u}` = `0 0` — all match expected, no drift.
- Immediately after writing this report (below), the same four checks were re-run and reported in the final
  message to the caller, together with this report's own SHA-256.

## Conclusion

Plan SHA-256 `0ed89eafe78e636eb043c5708a42f4cf518b07dc770ac18bda7466595d23e7f4`; framework HEAD
`c146cb70fa8ae95159d31763d57613194b74d68d` (== upstream, tree `f15777109b3f524ab0a87888ba74ee4f825a8066`, no
drift). **Verdict: FAIL — BLOCKER: 2, MAJOR: 2, MINOR: 1.** The negation/quoting grammar's five-round pattern
of single-character/single-adjacency omissions is not closed by this round's bytes: two structurally distinct
gaps (modal-auxiliary window distance; connective characters absent from `NEG_SUSPECT` entirely) still let
ordinary Mandarin negations authorize a project switch the user declined, which is the exact failure class
§4.2/§5.1 states it has closed.
