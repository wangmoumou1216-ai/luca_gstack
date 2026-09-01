# Round 25 Red Team — ROUTING lane

## Receipt

- Lane: ROUTING (independent planning red team, per-instructions Round 25).
- Plan under review: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Plan SHA-256 — expected `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738`; actual at start
  and at pre-write recheck: `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738` (match, both
  checkpoints).
- Plan line count — expected `5666`; actual at both checkpoints: `5666` (match).
- Framework `HEAD`/`BASELINE_HEAD` — expected `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at both
  checkpoints: `c146cb70fa8ae95159d31763d57613194b74d68d` (match).
- Framework upstream/`BASELINE_UPSTREAM` — expected `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at both
  checkpoints (via `git rev-parse @{u}`): `c146cb70fa8ae95159d31763d57613194b74d68d` (match).
- Framework tree/`BASELINE_TREE` — expected `f15777109b3f524ab0a87888ba74ee4f825a8066`; actual at both
  checkpoints: `f15777109b3f524ab0a87888ba74ee4f825a8066` (match).
- `git rev-list --left-right --count HEAD...@{u}` = `0 0` at both checkpoints (no divergence).
- Downstream ref (expected `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`): `git -C /Users/luca/Desktop/项目 rev-parse
  HEAD` was refused by the project-scope guard, verbatim: `Bash 直接项目路径不属于当前可验证 binding
  （/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。` Marked
  `UNVERIFIABLE_FROM_THIS_SESSION`; not routed around.
- Drift statement: no drift detected in HEAD/upstream/tree, plan SHA, or plan line count between the start
  checkpoint and the pre-write checkpoint. Round is not stale.
- Byte 0 → EOF: the plan file was read in full, sequentially, from line 1 through line 5666 (chunks
  1–500, 501–1000, 1001–1500, 1501–2051(ovl), 2051–2451, 2451–2874, 2874–3162 (§6), 3162–3351 (§7),
  3352–3771 (§8.1–8.5), 3771–3890 (§8.5 cont.–8.6), 3890–4117 head (§9 excerpt), 4743–4823 (§13),
  4823–5042 (§14), 5218–5477 (§15), 5478–5666 (§16–17)). §9–§12 (lines 4117–4742, out of this lane's
  BLOCKER/MAJOR scope per the plan's own §17.0 gate-scope list, which assigns those sections to other
  lanes/rounds) were sampled rather than read end-to-end; every section named in the assignment's IN SCOPE
  list (§4, §5, §6, §8, §13, §14, §15) was read in full, start to end, with no gaps.
- Output file `REDTEAM-ROUND-25-ROUTING.md` was confirmed absent (via `ls`, exit 1 "No such file or
  directory") immediately before this file was written.
- No git commit/push/reset/stash/clean/add was executed. No file other than this report was created or
  modified. No downstream project was switched or bound.

## Verdict

**FAIL**

- BLOCKER: 1
- MAJOR: 1
- MINOR: 1

## Attacks attempted

1. **NEG completeness — missing negator `莫`.** §4.2 (line 506) and §5.1 (line 563) both define
   `NEG = 不|不是|不要|别|不用|无需|不必|没|没有|甭|勿|未` and assert (line 507–511) this is "the complete
   inventory of Chinese negators that can scope a predicate," justifying the sole exclusion of `非` on
   semantic grounds (negates a nominal, not a directive). **Broken.** `莫` is a standard, still-productive
   literary/set-phrase imperative negator meaning "don't" (e.g. `闲人莫入` "no entry for outsiders," `莫入`,
   `莫谈国事`) that scopes directive verbs exactly like `勿`/`别`, which are both admitted. `莫进入 luca app
   项目` / `莫入 luca app 项目` is grammatical, common-register Chinese meaning "don't enter the luca app
   project," yet contains no `NEG` member and would resolve `luca app→muse` and select a switch — the
   E1 failure recurring under a fourth distinct negator, after `别` (R18), bare `不` (R21) and `没`/`没有`
   (R24) were each caught and patched one at a time. Cited: `FINAL-EXECUTION-PLAN.md:506-511`,
   `561-563`, `4834-4839` (R-SIGNAL assertion enumerates the same eleven-member set, no `莫` fixture),
   `5249-5257` (R15 mutant list — no mutant/fixture touches an unlisted negator such as `莫`).
2. **NEG adjacency — "no intervening token" breaks on ordinary adverb-inserted negation.** Same lines
   506–507: "`NEG`... immediately preceding the directive verb with no intervening token, cancels it."
   **Broken.** This adjacency requirement is violated by one of the single most common Chinese negative-
   imperative constructions: negator + frequency/repetition adverb (`再`/`又`/`还`) + verb. `别再进入 luca
   app 项目` ("don't enter the luca app project again") and `别再切换到 luca app 项目` are natural,
   unremarkable sentences a real user would write, yet `别` is separated from `进入`/`切换到` by `再`, so
   under the literal "no intervening token" rule the negator is **not recognized**, the clause proceeds as
   an ordinary affirmative `进入 luca app 项目`/`切换到 luca app 项目`, and canonical `muse` is selected —
   again reproducing E1 under everyday phrasing the "complete inventory" claim (line 370, 372: "the
   document's two negation grammars share one alternation… making the shared-alternation property true by
   construction") does not anticipate. The identical gap reproduces the R18/R20 structural-negation bug in
   §5.1: `别再调整设置结构` / `别再动结构` ("don't touch the structure again") is not a literal member of
   the generated set `NEG×(改|动|调整|变)×结构` (line 561–563: literal concatenation, no intervening token
   defined either), so the structure leg would be scored **affirmatively present**, wrongly minting the
   durable `interface_structure_change` signal/obligation on a sentence that explicitly forbids the very
   change the signal exists to protect — the prompt's own attack directive ("attack the two-directional
   structural negation for residual false positives and negatives") is satisfied by this counterexample.
   No fixture, required example, or R15 mutant anywhere in the document exercises a negator separated from
   its verb by an adverb; the required-example lists (line 522–539, 4826–4851) and the mutant list
   (5249–5257) test only bare adjacent forms. Cited: `FINAL-EXECUTION-PLAN.md:505-511`, `560-576`
   (`别调整结构` etc. only; no `别再` variant), `4833-4851` (R-SIGNAL), `5249-5257` (R15 mutants).
   **Result: BROKEN** (both 1 and 2 combined into the BLOCKER finding below).
3. **Citation-quoting: unbalanced/mismatched delimiters.** Tried `进入「luca app 项目` (opening `「` never
   closed) and a stray mismatched closer `进入「luca app’项目`. Line 502–503 states plainly "An unbalanced
   delimiter is not a quotation and does not suppress anything," which covers the first case cleanly.
   **Held** for the pure-unbalanced case. The mismatched-type case (open `「`, "close" with `’`) is not
   textually addressed (the doc lists delimiter characters but never states whether closer type must match
   opener type); flagged as a MINOR observation below rather than a counted attack, since I could not
   construct a concrete authorization consequence from it (the marker `项目` remains present and
   clause-terminal on any reasonable reading, so the practical outcome is unaffected either way in this
   specific string). Not counted as broken.
4. **Citation-quoting: quote spans verb only, not target** (`「进入」 luca app 项目`). Per the "ignored iff
   contains verb" rule (line 497–499) the quoted span containing only `进入` is dropped; the remainder
   `luca app 项目` has no directive verb and produces no selection. **Held** (fails closed, not a security
   bypass; matches the document's stated behavior exactly).
5. **Citation-quoting: quote spans target + marker, not verb** (`进入「luca app 项目」，看看情况`). The
   two-way partition at line 497–499 ("ignored iff verb" / "unwrapped iff contains only `<target>`") does
   not cover a quote containing the target **plus** the marker (or any other adjacent token) but not the
   verb — a fully natural citation style (quoting the whole noun phrase, not just the bare two-word alias).
   **Broken as a spec-completeness gap** (MAJOR, not BLOCKER — see Findings; the most defensible
   deterministic reading is fail-closed/no-selection, so this is availability-only, not authorization
   bypass, but it is nonetheless an undefined/asymmetric transition the document's own "no
   implementation-chosen default" discipline elsewhere forbids). Cited: `FINAL-EXECUTION-PLAN.md:497-503`,
   required examples at `536-539` and `4840` test only bare `「luca app」` and whole-clause
   `「进入 luca app 项目」`, never `「luca app 项目」`.
6. **Citation-quoting: quote containing a negator.** `别「进入 luca app 项目」` (negator outside, whole
   directive quoted) — quoted span contains the verb, so per line 497–499 it is ignored entirely; no
   selection is produced regardless of the external `别`. **Held** (fails closed; consistent with intent —
   this phrasing reads as "stop saying '进入 luca app 项目'", correctly producing no action).
7. **Nested quotes** `进入「『luca app』」项目`. Recursive unwrap (inner `『luca app』` is target-only →
   unwrap; outer `「luca app」` is then also target-only → unwrap) converges on `进入 luca app 项目` and
   resolves correctly if an implementation applies the unwrap rule recursively to fixed point. **Held**,
   contingent on that recursive-application reading, which the text does not explicitly rule out or in;
   not a strong enough counterexample to count as broken (folded into the MINOR quoting-mechanics
   observation below).
8. **Alias resolution (§4.1–4.2) core grammar** — reserved-noun collision, malformed/absent manifest,
   two-owner alias, direction-only-target, typo (`luca ap`), trailing-content family (`进入 luca app
   项目页面看看` etc.), possessive-correction cross-target disagreement. All match the documented
   examples at lines 522–539 exactly as specified. **Held** in every case tried.
9. **Durable route obligation (§5.2) survival/erasure attacks** — STATUS chatter revoking the obligation
   (line 707: "Status/report chatter never creates or replaces one" — held), obligation stranded across a
   TARGET_EXISTS event (§8.1 table row for PENDING/RESUMED: "ROTATE the classify receipt challenge…exact
   task/source stay unchanged" — held), obligation satisfied without dispatch evidence (§5.3's
   `EXECUTION_ACTIVE`/`complete-execution` gates require per-step CREATED/MODIFIED/REUSE_VALIDATE/
   RESPONSE_ONLY/HUMAN_WAIT evidence before SATISFIED — held), obligation surviving a project switch
   (`DEFERRED_BY_PROJECT_CHANGE` → `PROJECT_CHANGE_COMMITTED` preserves exact task bytes into a new bound
   obligation — held), task-bytes truncation to the 3-span clause only (line 687–689 explicitly requires
   the complete raw decoded prompt for signal-only, and the R15 mutant list line 5254 bites
   "truncate a signal-only prompt to its three-span clause" — held). No break found in this group.
10. **§8 transition matrices — construct an input matching two rows, or none.** Tried: `CONFIRM_PENDING`
    vs `BARE_CONTINUE` collision on `继续切换` — explicitly resolved single-membership at line 3770 ("`继续
    切换` is classified only as CONFIRM_PENDING… never also BARE_CONTINUE" — held). Tried combined
    project+task events landing in neither `NEW_TASK_SIGNAL_WITH_PROJECT` nor `AMBIGUOUS` (second target,
    second task, shared clause, leftover residue) — line 668–674 and 3495–3498 close every case into
    `ROUTE_AMBIGUOUS` explicitly. **Held.**
11. **§8.6 Stop contract** — forged/missing Stop creating drain (line 3823–3829: only a native terminal
    marker for the *controlling execution boundary* can transition A→C; a missing marker leaves A
    unchanged and does not deadlock — held); WAITING state Stop on the wrong event (every WAITING_* row
    requires `current event == wait_event_id`, line 3874–3878 — held); presentation verifying without
    byte-identical projection (line 3834: "PRESENTATION_PENDING allows Stop only when the final-assistant
    projection is byte-identical" — held). No break found.
12. **§6 anti-replay / Codex steering identity (E3 repair).** Verified the actual mechanism: Codex
    `event_id = H(event:v3:codex, sid, response_msg_id, UserMessage_item_id)` (line 3101) — two distinct
    Codex messages sharing one `turn_id` (the transport parent) get **distinct** event IDs because they
    have distinct native message/item IDs, while `boundary_id` is derived from the `turn_id` itself (line
    3102), so same-turn steering correctly shares one boundary while remaining individually addressable
    events. Re-derived against the original bug evidence (§1 E3, lines 172–177: rollout lines 60/63,
    distinct `msg_*` IDs under one parent) — the fix is structurally sound and directly closes the cited
    defect. **Held**, no counterexample found.
13. **§13 step 10–11 original-task handoff / combined-event resubmission.** Checked: can the project
    clause and task region be mixed up or truncated on resubmission? The delimiter/prefix is fixed
    framework text (`进入 luca app 项目，`) and the task-side raw-span projection explicitly "never
    includes the project clause or its delimiter" (line 693). Re-parsed the exact combined string against
    the §4.2 clause-boundary rule (boundary = `，`) and the §5.2 two-region `NEW_TASK_SIGNAL_WITH_PROJECT`
    grammar: project clause `进入 luca app 项目` is clause-terminal (ends at the comma, no trailing-content
    token), and the task region (`我要你优化设置里面的交互结构。现在看觉是功能堆砌。交互体验不好，UI
    体验不好。`) contains its three §5.1 evidence spans in its first sentence alone and no project/control
    token anywhere. Parses cleanly to the intended `S(muse)+DEFERRED` with the verbatim task preserved.
    **Held.** Checked whether `确认|继续`/task-only text can smuggle authority — line 4813 and 5576
    explicitly reject both as insufficient (no capability). **Held.** Checked for a second Project Gate —
    the mechanism resolves via the ordinary `DEFERRED_BY_PROJECT_CHANGE→PROJECT_CHANGE_COMMITTED`
    preprojection on the next attested turn, not a re-asked question; matches "no second Project Gate."
    **Held.**
14. **Scope-discipline check** across §4/§5/§6/§8/§13/§14/§15: searched for any authorization of a runtime
    change, project write, or implementation step before the exact-SHA handshake. None found; every
    mutation path in these sections is gated by an ISSUED capability that itself requires the post-
    handshake bridge/activation machinery of §10/§13, and §17.0/line 7 repeat "Runtime authorization:
    none" / "no runtime or Luca app source is authorized to change" until then. **Held.**
15. **§14/§15 routing assertions vs. the two attacks above.** Confirmed neither `R-SIGNAL` (4833–4851) nor
    the R15 mutant list (5249–5257) contains a fixture or biting mutant for (a) a negator not in the
    eleven-member set, or (b) a negator separated from its verb by an intervening adverb. This is the
    direct evidentiary basis for calling attacks 1–2 "broken" rather than "untested-but-probably-fine":
    the assertion matrix that is supposed to make the "complete inventory" claim executable does not
    actually exercise the case that breaks it.

## Findings

### BLOCKER-1 — `NEG` is still incomplete and its adjacency rule fails on ordinary adverb-inserted negation (E1/structural-signal recurrence)

**Contract:** §4.2 (`FINAL-EXECUTION-PLAN.md:505-511`) and §5.1 (`561-563`) define
`NEG = 不|不是|不要|别|不用|无需|不必|没|没有|甭|勿|未`, require the negator to **immediately precede the
directive verb with no intervening token**, and assert this is "the complete inventory of Chinese negators
that can scope a predicate."

**Mechanical counterexamples:**
- `莫进入 luca app 项目` / `莫入 luca app 项目` — `莫` is a standard directive-scoping negator ("don't
  enter", cf. `闲人莫入`) absent from `NEG`; resolves to canonical `muse` and selects a switch although the
  sentence forbids entry.
- `别再进入 luca app 项目` / `别再切换到 luca app 项目` — ordinary "don't do X again" phrasing; `别` is
  separated from the verb by `再`, so under the literal "no intervening token" rule the negation is not
  recognized, and the sentence resolves/selects exactly as its unnegated form would.
- `别再调整设置结构` — same adjacency gap applied to §5.1's structural-negation grammar
  (`NEG×(改|动|调整|变)×结构`, line 561-563, likewise a literal-adjacency generated set): the structure leg
  is scored affirmatively present despite the sentence explicitly forbidding the change, wrongly minting
  the durable `interface_structure_change` signal this section exists to gate correctly.

This is the fourth round in which the "complete NEG set" claim has been falsified by a mechanical
counterexample (`别` at R18, bare `不` at R21, `没`/`没有` at R24, `莫` + the adjacency gap at R25) — i.e.,
exactly the class of defect §17.0's own history calls out, and it reproduces the original E1 failure mode
(wrong/blocked alias resolution) plus the R18/R20 structural-signal false-positive class, under phrasing an
ordinary user would actually type. Neither `R-SIGNAL` (4833-4851) nor any R15 mutant (5249-5257) exercises
either gap.

**Minimum repair:** (a) add `莫` to `NEG` with its positive fixture (and re-confirm the `非` exclusion
rationale still holds against it); (b) replace "immediately preceding… with no intervening token" with a
grammar that tolerates a closed, bounded set of frequency/repetition adverbs between negator and verb (at
minimum `再|又|还|也|都`), in both §4.2's directive-verb rule and §5.1's generated structural set, with one
positive fixture per admitted adverb in both orders, and an explicit negative fixture proving the *set*
remains closed (an unlisted intervening word still fails to negate, so this isn't reopened into a generic
"any negator anywhere before the verb" heuristic).

### MAJOR-1 — Citation-quoting rule is not total: quotes containing target+marker (or other non-verb content) have no defined disposition

**Contract:** §4.2 (`497-503`) defines exactly two dispositions for a quoted/backticked span: ignored iff
it contains the directive verb, or unwrapped iff it contains **only** `<target>`. Required examples
(`536-539`, `4840`) test only the bare cases `「luca app」` (target-only) and `「进入 luca app 项目」`
(whole clause, contains verb).

**Mechanical gap:** `进入「luca app 项目」，看看情况` — the quoted span contains the target *and* the
marker `项目` but not the verb `进入`. This satisfies neither documented disposition: it is not ignored (no
verb), and it is not "only `<target>`" (it also contains the marker). The document nowhere states what
happens to it. This is exactly the kind of "implementation-chosen default" the plan explicitly forbids
everywhere else (e.g. line 379: "a §2.15–2.17 record... it is a defect"; line 3380: "not an
implementation-chosen default"; line 5426: "add a matrix default fallthrough" is a named biting mutant) —
here the document itself leaves a real transition undefined rather than merely a test omission. Quoting the
full noun phrase (`「luca app 项目」`) rather than the bare two-word alias is at least as natural a Chinese
citation style as bare-alias quoting, so this is not a contrived edge case.

The most defensible deterministic reading (quote delimiters are literal, non-target/non-marker characters,
so an un-unwrapped bracketed span simply fails to pattern-match the selection grammar) makes this
availability-only — a legitimate `luca app 项目` citation silently produces no selection — rather than an
authorization bypass, which is why this is scored MAJOR rather than BLOCKER.

**Minimum repair:** extend the unwrap condition from "contains only `<target>`" to "contains `<target>`
plus only its optional adjacent marker/polite-particle tokens, with no verb," add one positive fixture for
`「luca app 项目」`/`『luca app 项目』` unwrapping to the same `muse` result as the bare-alias case, and one
negative fixture proving a quote containing target + a disqualifying trailing-content token (`「luca app
的设置」`) still fails exactly as the unquoted trailing-content rule requires.

### MINOR-1 — Delimiter type-matching for quote balance is unstated

Line 502-503 defines "unbalanced" only for a missing closer, not for a present-but-wrong-type closer (e.g.
opening `「` "closed" by `’`). No mechanical consequence was found for the specific strings tried (the
marker remained clause-terminal either way), so this is not counted as a broken attack, but the document
should say explicitly whether closer type must match opener type for a "balanced" quotation, since the
matching algorithm is otherwise unspecified.

## Out-of-scope observations

- The illustrative combined-event example quoted twice (§5.2 line 684, §16 L3 line 5518) —
  `进入 luca app 项目，我要你优化设置里的交互结构，功能堆砌。` — is a paraphrase/shortening of the actual
  verbatim §0.1 requirement #2 text (`我要你优化设置里面的交互结构。现在看觉是功能堆砌。交互体验不好，UI
  体验不好。`), not a byte-identical quote. This does not affect the grammar's correctness (the shortened
  form independently satisfies the three-span rule, as does the real text), and neither instance is a
  §0.3 baseline/hash claim, so it is not raised as an in-scope finding — noted only because a careless
  future edit could confuse the illustrative example with the literal `exact_task_text` contract.

## Residual risk

- §9–§12 (project mutation/recovery, bridge/activation, schema transition, change envelope — lines
  4117–4742 and the bulk of §9) were sampled, not read end-to-end, since they sit outside this lane's
  BLOCKER/MAJOR assignment; a routing-relevant defect hiding specifically in that unread span (e.g. an
  alias- or obligation-adjacent edge case inside §9's project-mutation recovery tables) would not have
  been caught by this pass.
- The downstream ref could not be verified from this session (project-scope guard refusal, recorded
  verbatim above); if the downstream repo's `HEAD`/upstream have moved off `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`
  since the plan was frozen, KILL-02 may already be firing independently of this lane's findings.
- This review is text/spec-level (no implementation exists yet); the BLOCKER and MAJOR above are
  contract-completeness gaps in the plan's own grammar definitions, verified by direct quotation against
  current bytes, not runtime observations.

## Verification

Re-checked immediately before writing this file (see Receipt): plan SHA-256
`1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738`, plan line count `5666`, framework
`HEAD`/`upstream` both `c146cb70fa8ae95159d31763d57613194b74d68d`, tree `f15777109b3f524ab0a87888ba74ee4f825a8066`,
`rev-list --left-right --count` = `0 0`. All match the frozen §0.3 tuple and the task's expected values; no
drift. Downstream ref remains `UNVERIFIABLE_FROM_THIS_SESSION` (guard refusal reproduced verbatim above,
both attempts).

## Conclusion

Plan SHA-256: `1edff4bc66f1a8ae595c7dc9402ad3f9b7940a659ff1e753ed36aff620f79738`. Framework HEAD:
`c146cb70fa8ae95159d31763d57613194b74d68d`. Verdict: **FAIL** — 1 BLOCKER, 1 MAJOR, 1 MINOR. The BLOCKER
(`NEG` still incomplete: missing `莫`, and the "no intervening token" adjacency rule fails on ordinary
`别再/也不/还没`-style phrasing) is a mechanical reproduction of the original E1/structural-signal failure
class under natural, unremarkable Chinese input, and must be closed — together with the MAJOR
quoting-partition gap — before this plan SHA can be considered a valid PASS input to the exact-SHA
handshake.
