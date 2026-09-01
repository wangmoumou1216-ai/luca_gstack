# Round-28 Routing Red Team

## Receipt

- Lane: ROUTING (independent planning red team, Round 28).
- Plan under review: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Plan SHA-256 — expected `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`, actual at
  start `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`, actual immediately before writing
  `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`. Match at both checkpoints.
- Line count — expected 5,762, actual at start 5762, actual immediately before writing 5762. Match at both
  checkpoints.
- Framework HEAD/upstream — expected `c146cb70fa8ae95159d31763d57613194b74d68d` for both, actual at start
  HEAD=`c146cb70fa8ae95159d31763d57613194b74d68d` upstream=`c146cb70fa8ae95159d31763d57613194b74d68d`, actual
  immediately before writing HEAD=`c146cb70fa8ae95159d31763d57613194b74d68d`
  upstream=`c146cb70fa8ae95159d31763d57613194b74d68d`. Match at both checkpoints.
- Framework tree — expected `f15777109b3f524ab0a87888ba74ee4f825a8066`, actual at both checkpoints
  `f15777109b3f524ab0a87888ba74ee4f825a8066`. Match.
- Downstream (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` expected): attempted `git -C
  /Users/luca/Desktop/项目/muse/lucagstack ...` in a form the project-scope guard intercepted (a `cd` into the
  project-tree path ahead of the git call). Verbatim refusal:
  `Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。`
  Marked `UNVERIFIABLE_FROM_THIS_SESSION`; not routed around. (Plain `git -C <path>` calls without a leading `cd`
  into that tree were not blocked and were used for every other git check in this report — including the
  in-scope framework HEAD/upstream/tree checks above, which are unaffected.)
- Coverage: read byte 0 → EOF of the 5,762-line plan. Sequential `Read` covered lines 1–1500 in full; the
  remainder (lines 1501–5762, including all of §5.4–§7, §9–§13, §15's full body, §16–§17) was covered by
  targeted `grep`/`sed` passes plus full-section reads of §8.1 (3424–3663), §8.6 (3893–4112), §14 (4913–5312)
  and §15's opening block (5309–5360), and semantic-phrase greps across the entire file (identifier-based per
  the Round-27 method note's own failure mode, plus phrase-based: `authorizes`, `clause-terminal`,
  `trailing-content`, `negation spans`, `suppress`, `disarm`, `same … as §`, `per §`, `defined in §`, `as in §`,
  `alias_resolution`, `negation_context`, `semanticRouteAxis`, `SIGNAL_UNCONFIRMED`, `别调整设置结构`, E1-family
  strings). I disclose that §6 (steering continuity, 2946–3423), §7, §10–§12, and most of §15's body
  (5360–5569) and §16–§17 were not read sequentially line-by-line; they were covered only by the greps above,
  which found no hits of concern in those ranges. Given the primary finding below sits entirely in §5.2/§8.1/§14/
  §15 (all read in full), I am confident this is not a coverage gap that would hide a comparably-sized defect,
  but I flag it rather than claim exhaustive coverage of §6/§7/§10–§13/§16–§17.
- Drift statement: no drift. `HEAD`, `@{u}` and tree were identical at both checkpoints; plan SHA and line count
  were identical at both checkpoints. Not STALE.
- Output file: confirmed absent (`ls` failed with "No such file or directory") immediately before this file was
  written.

## Verdict

FAIL

- BLOCKER: 1
- MAJOR: 0
- MINOR: 0

## Round-27 closure and residue sweep

**Axis 1 — residue, searched by semantics not identifier.** Grepped the whole document for
`authorizes`/`clause-terminal`/`trailing-content`/`negation spans`/`suppress`/`disarm`/`same … as §`/`per §4`/
`per §5.1`/`defined in §4.2`/`defined in §5.1`/`as in §4.2`/`as in §5.1`, plus the deleted identifiers
`NEG`/`ADV`/`NEG_SUSPECT`. Every hit outside the §2.16–2.17 historical closure-map rows (out of scope per §17.0)
is either (a) inside §4.2/§5.1's own prose explicitly declaring the machinery deleted and naming it a biting
mutant to reintroduce (lines 488, 502, 511, 606), (b) an unrelated use of "authorizes" about capability objects
(lines 2276, 3329) or "suppress" about checkpoint/cancellation and candidate-yield rules (lines 3552, 3609,
4932) that has nothing to do with negation grammar, or (c) `§4.1`'s unrelated "per §4.1" reference for the alias
registry's `INCOMPLETE` rule (line 542). §8.1 (3424–3663, read in full) contains no import of a negation/
quoting/clause-structure verdict from §4.2/§5.1; it explicitly disclaims doing so at lines 3547–3550: "The
classifier is a bounded executable grammar, not a model label. It consumes §4.2's `alias_resolution` candidates
and §5.1's `semanticRouteAxis`+`negation_context` as **evidence only**, and imports no negation, quoting or
clause-structure verdict from those sections, which define none." This closes the specific §8.1 stranded-import
Round-27 found. Residue sweep: clean on this axis.

**Axis 2 — E1, fully.** §4.2's frozen E1-family fixtures (`进入 luca app 项目页面看看`, `切到 luca app
项目功能`, `回到 luca app 项目的登录流程`, plus `打开 luca app`, `进入「luca app」项目`) are pinned at lines
560–563 and 543–579 to yield one `muse` candidate each with `marker_present` set correctly, and §0.3's history
(line 373) and §14's `R-ALIAS`/`R-SIGNAL` assertions (4917–4932) require the same outcomes — no opposite-result
contradiction found this round (the §4.2/§14 quoting contradiction Round-27 found for
`「进入 luca app 项目」是个例子` is gone: both sections now require the same one-candidate outcome, lines 574 and
4930–4932). I did not find any adjacent phrasing family that still yields zero evidence. E1 closure for the
*resolution* layer (the alias hook) is sound and total across every fixture I tried mentally against the §4.2
grammar (single recognition rule: canonical ID anywhere, or alias + adjacent `项目|工程` marker). See Findings
below, however, for a *downstream* defect that reopens an E1/E2-shaped failure at the obligation layer rather
than the alias layer.

## SIGNAL_UNCONFIRMED

Both directions attacked; one direction breaks it (see Findings). Summary:

- **Cannot block Stop / deny scope / grant capability while inert:** confirmed clean. §8.6 (3893–3958, read in
  full) lists the exact route-status set that blocks Stop (line 3904–3907) and `SIGNAL_UNCONFIRMED` is not a
  member; nothing in §8.2–§8.6 references it as authority.
- **Can it survive when it should be deleted, or reach `PENDING` by a path other than the described
  confirmation?** This is where it breaks — see BLOCKER-1. The described promotion path ("next attested human
  event carrying an affirmative task directive under §8.1's classification") has no realized transition in
  §8.1's actual mechanical table: there is no `Current route status = SIGNAL_UNCONFIRMED` row at all, and the
  reachable `ABSENT`+`NEW_TASK` cell (line 3620) mints `PENDING` directly from "fresh signal" without ever
  passing through `SIGNAL_UNCONFIRMED`.
- **Over-correction check (a genuine structure request silently losing its obligation, reproducing E2 from the
  other side):** not found. Every path I traced for an *explicit* task directive (anchored prefix
  `新任务|另一个任务|...`, or the original combined settings prompt via `NEW_TASK_SIGNAL_WITH_PROJECT`) still
  reaches `PENDING`/`DEFERRED_BY_PROJECT_CHANGE` through the existing rules; I found no case where a genuine
  request is silently dropped. The defect below is a *false positive* direction (signal mistakenly promoted),
  not a *false negative* one.

## Other attacks attempted

- **Candidate containment (attack 4):** tried again to make `alias_resolution`/`semanticRouteAxis`/
  `negation_context` into authority via §8.1 classification (3547–3550, evidence-only, confirmed), §5.2
  obligation creation (686–730, gated through the `SIGNAL_UNCONFIRMED`/explicit-directive split — see Findings
  for where that split itself fails), §8.2/§8.5 precedence (3657–3893, no reference to these fields at all), and
  §8.6 Stop (3893–3958, no reference). No path found where the candidate/signal objects themselves grant
  capability, mutate project state, or emit a command — that half of Round-27's confirmation holds.
  `FINAL-EXECUTION-PLAN.md:515-547` (grants no capability, mutant pinned), `FINAL-EXECUTION-PLAN.md:3547-3550`.
- **§14/§15 coverage check for the R18–R26 negation corpus:** `R-SIGNAL` (4923–4942) asserts the corpus produces
  no obligation "from the hook alone" (line 4929) — that qualifier is accurate but narrow: it tests §4.2/§5.1's
  hook output only, never the corpus fed through §8.1's classifier + transition table where BLOCKER-1 lives. I
  looked for a §15 mutant matching §5.2's own promise at line 694 ("A hook path that creates `PENDING` directly
  from `semanticRouteAxis`... is a named biting mutant") and found none in §15 (5309–5360, full read; targeted
  grep of 5309–5569 for `signal`/`negation`/`SIGNAL_UNCONFIRMED`/`alias_resolution` found four unrelated hits,
  none instantiating this mutant). `FINAL-EXECUTION-PLAN.md:4913-4942`, `FINAL-EXECUTION-PLAN.md:5309-5360`.
- **Alias registry edge cases (zero/two/malformed manifests, spoofing, shadowing, rename survival,
  product-neutrality, `INCOMPLETE` posture):** §4.1 (452–483) unchanged from prior rounds where this held; no
  new counterexample found on a targeted re-read.
- **§5.2 obligation lifecycle (erasure/supersession/stranding/satisfaction/survival across switch/STATUS
  chatter/task-byte truncation):** read in full (624–786). No new defect found beyond BLOCKER-1; the
  `SUPERSEDED`/`CANCELLED` transitions, `exact_task_text` bounding, and continuation-context handling all read
  as total and internally consistent for the *explicit-directive* path.
- **§8.2–§8.5 precedence (two-row match, unreachable cells, silent defaults):** §8.2 (3657–3720) and §8.3–§8.5
  (3720–3893) both carry explicit "generated"/"total"/"no default" language and I did not find an unreachable or
  double-matched cell on inspection; I did not exhaustively re-derive the full cross-product this round (out of
  budget) so I record this as attempted-but-not-exhaustive rather than PASS.
  `FINAL-EXECUTION-PLAN.md:3657-3893`.
- **§8.6 Stop (forged/missing Stop, WAITING on wrong event, projection verified without byte-identical
  match):** read in full (3893–3958); language is unchanged from rounds that already passed this axis and I
  found nothing new.
- **§6 steering continuity (turn_id coalescing, correction/继续 rejection, auto-resume, burst counting):** not
  re-read line-by-line this round (see Receipt coverage disclosure); this section was not touched by the R26/R27
  edits (which were confined to §4.2/§5.1/§5.2/§8.1), and no grep hit surfaced a reference to the deleted
  negation machinery or the new `SIGNAL_UNCONFIRMED` status inside §6, so I have no evidence of a defect there
  but did not perform a fresh adversarial pass.
- **§13 handoff steps 10–11 and Plan/Skill dispatch branch selection:** not read this round beyond the
  cross-references already covered by grep (no `alias_resolution`/`negation_context`/`SIGNAL_UNCONFIRMED` hits
  inside §13's line range). Disclosed as not attacked this round.
- **Scope discipline:** no runtime change, project write, or implementation step found authorized before the
  exact-SHA handshake anywhere I read; §0.1/§0.2/§0.3 unchanged in substance from prior rounds.

## Findings

### BLOCKER-1 — `SIGNAL_UNCONFIRMED` is never wired into §8.1's mechanical transition contract; the reachable
cell mints `PENDING` directly from a bare/undefined-"affirmative" signal

**Contract conflict.** §5.2 (line 662) declares `SIGNAL_UNCONFIRMED` a member of the closed `route_obligation`
status enum and (lines 686–696) states the entire confirmation mechanism this round was built to add: "A
`route_obligation` whose only basis is `semanticRouteAxis` is therefore created in status `SIGNAL_UNCONFIRMED`,
which is inert... Exactly one transition leaves it — the next attested human event carrying an affirmative task
directive under §8.1's classification promotes it to `PENDING` bound to that event; any other next event...
deletes it and appends no record. A hook path that creates `PENDING` directly from `semanticRouteAxis`... is a
named biting mutant." (`FINAL-EXECUTION-PLAN.md:686-694`)

§8.1's transition table is the actual mechanical contract for `route_obligation` status changes, and it declares
itself total and complete: "Row keys are generated from the closed route-status enum; construction requires
exactly one match for every status and rejects a missing or duplicate match rather than defaulting."
(`FINAL-EXECUTION-PLAN.md:3508-3510`) Its "Current route status" column (`FINAL-EXECUTION-PLAN.md:3618-3641`)
enumerates: `ABSENT`, `PENDING / RESUMED`, `PLANNING_PENDING`, `PLAN_REVISION_REQUIRED`, `PRESENTATION_PENDING`,
`WAITING_HUMAN (VERIFIED)`, `WAITING_PLAN_APPROVAL (VERIFIED)`, `PLAN_EXECUTION_PENDING / PLAN_EXECUTION_ACTIVE`,
`PLAN_EXECUTION_FAILURE_DRAIN`, `PLAN_EXECUTION_WAITING_BOUNDARY (VERIFIED)`,
`PLAN_EXECUTION_WAITING_HUMAN (VERIFIED)`, `PLAN_EXECUTION_REPLAN_PENDING`,
`PLAN_EXECUTION_DELTA_PRESENTATION_PENDING / ...`, `PLAN_EXECUTION_CHECKPOINT_PRESENTATION / ...`,
`PLAN_EXECUTION_TRANSFERRED`, `PLAN_EXECUTION_COMPLETE_PENDING_STOP`, `EXECUTION_PENDING`,
`EXECUTION_WAITING_BOUNDARY (VERIFIED)`, `EXECUTION_ACTIVE`, `EXECUTION_COMPLETE_PENDING_STOP`,
`DEFERRED_BY_PROJECT_CHANGE`, `SATISFIED / CANCELLED / SUPERSEDED`. **`SIGNAL_UNCONFIRMED` is not one of these
rows.** Unlike `PLAN_TRANSFER_CLAIM`, which the document explicitly excuses from this table with a named
short-circuit sentence ("is consumed by the closed checkpoint overlay above and therefore never falls into this
table", line 3605), there is no equivalent sentence anywhere carving `SIGNAL_UNCONFIRMED` out of "exactly one
match for every status." Grepped the entire document for `SIGNAL_UNCONFIRMED`: it occurs exactly 6 times, all
inside §5.2 (lines 662, 689, 694, 704) or the §2.17 historical row (371) — never once inside §8.1, §8.2–§8.6,
§9, §13, §14 or §15.

**Mechanical counterexample.** Feed `别调整设置结构` (one of §5.1's own pinned corpus fixtures, line 615,
required at line 618 to produce "the signal plus its verbatim `negation_context` and **no obligation**") as the
*first* message of a session — `route_obligation` is `ABSENT`. §8.1 step 3 classifies it:

> "an anchored independent-task prefix from `新任务|另一个任务|...` plus one operative imperative is NEW_TASK.
> **With no live obligation, one affirmative task clause carrying the §5.1 signal is also NEW_TASK**"
> (`FINAL-EXECUTION-PLAN.md:3566-3568`)

`别调整设置结构` carries all three §5.1 legs (调整=change, 设置=interface, 结构=structure) in one clause with no
live obligation, so by this clause's own criterion it is `NEW_TASK` — the only gate is "affirmative," and
nothing in the classifier can test that: §8.1 states of itself, two paragraphs earlier, "imports no negation,
quoting or clause-structure verdict from those sections, which define none... Its own control-word recognition
below is self-contained and is the sole span analysis in this classifier" (`FINAL-EXECUTION-PLAN.md:3547-3550`).
There is no operative definition of "affirmative" anywhere in the document's mechanical grammar — reintroducing
one would itself be the named biting mutant at line 511 ("No `NEG`, `ADV`, `NEG_SUSPECT`... reintroducing one is
a named biting mutant"). Under the only reading consistent with that disclaimer (no test exists, so the clause
matches "affirmative" by default since nothing rejects it), this reaches the `ABSENT` × `NEW_TASK` cell:

> `| ABSENT | ... | fresh signal→PENDING, otherwise ordinary router | ... |` (`FINAL-EXECUTION-PLAN.md:3620`)

This cell names two outcomes — `PENDING` or "ordinary router" — and **neither is `SIGNAL_UNCONFIRMED`**. A bare
negated signal on the first turn of a session therefore mints a durable, Stop-blocking `PENDING` obligation
directly from `semanticRouteAxis`, exactly the behavior §5.2 line 694 names as the biting mutant to prevent, and
exactly the Round-27 BLOCKER ("it fired `PENDING` whenever `semanticRouteAxis` was present") this round claims
to have closed — reproduced one layer down, via §8.1's classifier instead of §5.2's own creation rule. This
directly contradicts the §5.1 corpus guarantee that `别调整设置结构` produces "no obligation," and reopens the
original failure class this whole six-round chain (Rounds 18–27) exists to close: a declined/negated structural
remark can again block Stop until the user notices and cancels it.

**Confirming the gap is untested, not just unlucky wording:** §14's `R-SIGNAL` assertion (4923–4942) only
constrains "the hook alone" (line 4929) — it never asserts what the R18–R26 corpus does once classified by
§8.1, so this exact scenario has no fixture. §15 (5309–5360) has no mutant instantiating §5.2's own promise at
line 694. Two independently-authored implementations of this document — one following §5.2's prose (bare signal
→ `SIGNAL_UNCONFIRMED`, promoted only by a *second*, later confirming event) and one following §8.1's literal
table (bare signal, first turn → `PENDING` directly) — would produce genuinely different, and differently
dangerous, behavior for the identical input. That ambiguity, plus the concrete recurrence path, is BLOCKER
severity under this task's own definition ("unreachable or ambiguous required transition, a way for the
original failure to recur").

**Minimum repair.** Two changes, both mechanical, not a rewrite:
1. Add an explicit `SIGNAL_UNCONFIRMED` row to §8.1's "Current route status" table (or an explicit short-circuit
   sentence analogous to the `PLAN_TRANSFER_CLAIM` one) whose `NEW_TASK`/other-kind cells implement exactly the
   §5.2 promotion/deletion rule: next event with an independently-attested explicit task directive → `PENDING`;
   any other next event → delete, append no record.
2. Change the `ABSENT` × `NEW_TASK` cell at line 3620 so a bare-signal-only clause (the branch of step 3's
   definition that requires *only* "carrying the §5.1 signal," not the anchored-prefix branch) creates
   `SIGNAL_UNCONFIRMED`, not `PENDING`; reserve "fresh signal→PENDING" (or drop the word "signal" from that arm
   entirely) for the anchored-prefix explicit-directive branch only. Add one `R-SIGNAL` fixture and one §15
   mutant instantiating the line-694 promise end-to-end through §8.1, not just at the hook.

## Out-of-scope observations

None beyond what is already excluded by §17.0 (baseline hash literals, §2.15–2.17 history rows, §12.3 round
lists) — no additional non-blocking items found worth recording.

## Residual risk

- The repair above is confined to §5.2/§8.1/§14/§15; I did not re-verify §9's mutation protocol or §6's steering
  continuity against a `SIGNAL_UNCONFIRMED`-bearing obligation specifically (e.g., what a project switch or a
  Codex steering burst does to a live `SIGNAL_UNCONFIRMED` object) — once the status is wired into the table
  this round's repair should also cross it with §8.1's TARGET_EXISTS guard and §9's race-restore snapshot, which
  currently has no row for it either (grep: zero hits for `SIGNAL_UNCONFIRMED` in §8.1/§9 as confirmed above).
- §6, most of §15's body, §16–§17, and §13's handoff steps were not re-attacked line-by-line this round (see
  Receipt coverage disclosure); I have no positive evidence of defects there, only absence of grep hits for the
  terms this round's changes touch.
- The downstream ref check remains `UNVERIFIABLE_FROM_THIS_SESSION` per the project-scope guard's design; this
  is expected behavior for a meta/audit session, not a plan defect.

## Verification

Post-write re-check, run immediately after writing this file:

- Plan SHA-256: `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc` (unchanged).
- Plan line count: 5762 (unchanged).
- Framework HEAD: `c146cb70fa8ae95159d31763d57613194b74d68d` (unchanged).
- Framework upstream: `c146cb70fa8ae95159d31763d57613194b74d68d` (unchanged).
- Framework tree: `f15777109b3f524ab0a87888ba74ee4f825a8066` (unchanged).
- No drift between the pre-write and post-write checkpoints; this round's verdict stands against plan SHA
  `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc` at HEAD
  `c146cb70fa8ae95159d31763d57613194b74d68d`.

## Conclusion

Plan SHA `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`, HEAD
`c146cb70fa8ae95159d31763d57613194b74d68d`. Verdict: **FAIL** — 1 BLOCKER / 0 MAJOR / 0 MINOR. The Round-27
`SIGNAL_UNCONFIRMED` repair is sound in intent but is not wired into §8.1's mechanical transition table: no row
exists for that status, and the reachable `ABSENT`×`NEW_TASK` cell mints `PENDING` directly from an
undefined-"affirmative" bare signal, reproducing the exact defect class (a declined/negated structural remark
blocking Stop) this six-round chain exists to close. All other attacked axes — residue sweep, E1-family
alignment, quoting alignment, candidate/negation-evidence containment, alias registry, obligation lifecycle,
Stop gating — held.
