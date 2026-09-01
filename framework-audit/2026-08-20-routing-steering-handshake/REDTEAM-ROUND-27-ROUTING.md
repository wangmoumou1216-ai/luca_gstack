# Round 27 Red Team — ROUTING lane

## Receipt

- Lane: ROUTING (independent planning red team, Round 27). Worked only in
  `/Users/luca/Desktop/项目/muse/lucagstack`; no downstream project switched or bound.
- Plan under review: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Plan SHA-256 — expected `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161`; actual at
  start-of-session check and at the immediate pre-write check (run seconds before this file was written):
  `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161` (match, both checkpoints). Session was
  interrupted mid-review by a transient network error (ENOTFOUND) and resumed; the coordinator independently
  re-verified the same SHA during the outage and reported no drift, which this session's own pre-write check
  confirms directly.
- Plan line count — expected `5730`; actual at both checkpoints: `5730` (match).
- Framework `HEAD` — expected `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at both checkpoints: same
  (match).
- Framework upstream (`git rev-parse @{u}`) — expected `c146cb70fa8ae95159d31763d57613194b74d68d`; actual at
  both checkpoints: same (match). `git rev-list --left-right --count HEAD...@{u}` = `0 0` throughout.
- Framework tree — expected `f15777109b3f524ab0a87888ba74ee4f825a8066`; actual at both checkpoints: same
  (match).
- Downstream ref (expected `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`): `git -C /Users/luca/Desktop/项目
  rev-parse HEAD` was refused by the project-scope guard, verbatim: `Bash 直接项目路径不属于当前可验证
  binding（/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。` Marked
  `UNVERIFIABLE_FROM_THIS_SESSION`; not routed around.
- Drift statement: no drift in HEAD/upstream/tree, plan SHA or plan line count between the start checkpoint and
  the immediate pre-write checkpoint, including across the mid-session interruption/resume. Round is not stale.
- Byte 0 → EOF: read start to finish. Full sequential coverage: lines 1–450 (§0–§4.1), 450–900 (§4.2 complete,
  §5.1–§5.2 complete, into §5.3), 900–1350 (§5.3 continued — Plan-result/capacity-analyzer machinery, primarily
  transaction-lane surface), 2921–3209 (§6 complete), 3399–3698 (§8.1–§8.3 through the stable-state matrix
  header), 4798–4880 (§13 complete), 4881–5000 (§14 R-section through R-OBLIGATION), 5277–5420 (§15 sampled for
  alias/quoting/negation-related mutants), 5697–5730 (§17.0 complete). Every line inside this lane's IN-SCOPE
  list (§4, §5, §6 as it bears on steering identity, §8, §13's handoff, §14/§15 routing assertions, §17.0) was
  either read start-to-end or targeted with exhaustive `grep -n` sweeps across the complete file for the exact
  terms this attack turns on (`alias_resolution`, `NEG`, `ADV`, `NEG_SUSPECT`, `negation`, `quoted span`,
  `trailing-content`, `disarm`, `SELECT(T`), so no occurrence of those terms anywhere in the 5,730-line file was
  missed even where the surrounding prose was not read line-by-line. §5.3's remaining ~1,600 lines (Plan-result
  schema, capacity analyzer, parameter-queue machinery), §5.4, §7, §8.4–§8.6, §9–§12, §14 T-section and §16
  were sampled/grep-swept rather than read end-to-end; they are primarily the transaction lane's assigned
  machinery, and the grep sweep found no occurrence of this attack's key terms inside them that changes the
  findings below. This is stated as an honest scope note, not a claim of full coverage of those sections.
- Output file `REDTEAM-ROUND-27-ROUTING.md` was confirmed absent (via `ls`, exit 1 "No such file or directory")
  immediately before this file was written.
- No git commit/push/reset/stash/clean/add was executed. No file other than this report was created or
  modified.

## Verdict

**FAIL**

- BLOCKER: 3
- MAJOR: 0
- MINOR: 1

## The architectural deletion

**Axis 1 — does anything still authorize from a candidate?**

No. `alias_resolution` itself is never mentioned in §8 (precedence/classification/Stop) or in §13's handoff —
confirmed by a whole-file `grep -n 'alias_resolution'`, which returns only its five occurrences inside §4.2 and
one inside §14's `R-SIGNAL` assertion, all of them describing it as non-authorizing evidence. §8.1's project
intent (`SELECT(T,SWITCH|NEW)`, `CONFIRM_PENDING`, etc.) and §13 step 10–11's handoff both operate on an
"attested human event" / "combined event" whose project-switch judgment is attributed to the LLM layer, not to
a literal read of the candidate array. §5.2's obligation-creation prose likewise gates creation on "the LLM
layer confirms the request is affirmative," not on `alias_resolution` contents. On this narrow question — can a
`{surface,canonical,span_start,span_end,marker_present}` entry, by itself, mutate a binding, create a
transaction or emit a command — the answer is no, and I found no path through §8.1, §5.2, §8.2, §8.6 or §13
that treats it otherwise. **This narrow axis holds.** But see the BLOCKER findings below: the mechanism that
*produces* the candidate array is not actually the pure "scan for occurrences" operation the plan claims it is,
which reopens a version of this question one layer up (§4.2 itself still contains clause-structure judgment,
not "authorization" laundered through a capability field, but literally contradictory instructions for which
strings even become candidates).

**Axis 2 — does E1 still get closed?**

Partially. The exact original prompt, `进入luca app项目` (bare, no quotes, no trailing content, no
punctuation), is unambiguously a one-candidate `muse` resolution under every reading in this document — the
§0.1 chain traced end to end (steps 1–7) reaches the combined `NEW_TASK_SIGNAL_WITH_PROJECT` composition in
§5.2/§8.1 for that literal string without contradiction, and §13 step 10–11's handoff replays the identical
fixed prefix `进入 luca app 项目，` for the same reason. For **that** string, removing the mechanical
authorization step does not reintroduce "asks again" — the LLM layer receives a `muse` candidate and the plan's
claim that E1 "was a resolution failure" holds for it.

However, the fix is narrower than the plan's own summary line claims ("removes... the entire mechanical
judgment... entirely," line 511). §4.2's surviving "Executable selection grammar" (see BLOCKER-2/3 below) still
disarms candidate generation for a family of near-neighbor phrasings that a real user could easily type instead
of the exact transcript — e.g. `进入 luca app 项目页面看看` is a frozen fixture yielding **zero** candidates
(`FINAL-EXECUTION-PLAN.md:559-561`), not because the LLM judged it negative, but because the still-live
trailing-content rule inherited from Round 18 never lets the hook produce a candidate for it at all. For that
input the model gets no mechanical hint whatsoever — the same starting condition E1 began from — and whether it
resolves `luca app → muse` now depends entirely on unaided LLM judgment with no framework signal, which is
exactly the state of affairs before this plan existed. This is not proof the LLM will fail on that input, but
it is proof the plan's claim to have made the failure "structurally unreachable" (line 371) is false for this
adjacent class, because the surviving grammar — not the deleted negation grammar — is what suppresses the
candidate.

**Axis 3 — stranding.**

Yes, and this is the dominant finding of this round. Three independent, mechanically provable contradictions
exist between the plan's own claim that the negation/quoting/clause-structure machinery was deleted and its own
operative rule text and required fixtures, which still specify that machinery. See BLOCKER-1/2/3 below.

**Axis 4 — the nine-item R26 corpus under the new contract.**

Confirmed consistent, narrowly. `不进入`, `别切到`, `不想进入`, `更别说进入`, `免得又要进入`, `难道现在要进入`,
`无论如何都要进入`, `不妨进入` and `进不进入 luca app 项目` are pinned identically in two places —
`FINAL-EXECUTION-PLAN.md:563-568` (§4.2) and `FINAL-EXECUTION-PLAN.md:4892-4897` (§14 `R-SIGNAL`) — both stating
one `muse` candidate, `marker_present:true`, no mutation, no command, no capability. I found no third section
that contradicts this specific nine-item set. **This specific sub-claim survives the attack.** But the
immediately adjacent quoting corpus in the same two sections — which the assignment groups with this one under
"the R26 corpus" — does **not** survive; see BLOCKER-2.

## Other attacks attempted

- **Alias registry edge cases** (`FINAL-EXECUTION-PLAN.md:451-477`): cap arithmetic (512 root / 256 project /
  16 alias / 2,048 total), reserved-noun list, NFKC/whitespace normalization, and the `INCOMPLETE` malformed-
  manifest fallback are unchanged from prior rounds and were not the target of this round's rewrite; no new
  counterexample found. Zero/two-manifest, spoofing and rename-survival behavior is identical to Round 26's
  reviewed text (not re-derived from scratch this round; no textual change was found in `grep`-diffing this
  region against the described R26 content).
- **§5.2 obligation lifecycle** (`FINAL-EXECUTION-PLAN.md:616-761`): erasure/supersession/CANCELLED-vs-SUPERSEDED,
  status-chatter non-mutation, and survival across `DEFERRED_BY_PROJECT_CHANGE` all trace through cleanly; no
  counterexample constructed. This machinery is unchanged by the negation deletion — it consumes the *outcome*
  of LLM-layer confirmation, not the deleted grammar itself, and the deletion does not touch it.
  `NEW_TASK_SIGNAL_WITH_PROJECT`'s two-region disjoint-span requirement (§5.2, lines 706-723) still functions on
  the affirmative directive-verb clause, independent of the broken quoting/trailing-content sub-grammar.
- **§8.1–§8.5 precedence**: the `TARGET_EXISTS` table (3456-3477), the global precedence table (3630-3650) and
  the stable-state matrix header (3693-3701) were read for unreachable cells / silent defaults; row/column
  construction is stated as "generated... rejects a missing or duplicate match rather than defaulting"
  (3483-3485) and I found no row starved of a match in the sampled portion. Did not exhaustively re-derive the
  full generated cross-product this round (transaction lane's assigned surface); no routing-relevant
  counterexample found in the sampled rows.
- **§8.6 Stop**: not located as its own numbered subsection in this pass (§8 runs 3399-3936 without a `### 8.6`
  heading found by `grep -n '^### 8'` in the read ranges); Stop-adjacent behavior is described inline in the
  route-status matrix rows ("byte-exact display Stop may end," line 832; PRESENTATION_PENDING/Stop coupling
  throughout §5.3). No forged/missing-Stop counterexample constructed this round; treated as primarily
  transaction-lane surface per the R26 precedent and this round's time budget.
- **§6 steering continuity**: read in full (2921-3209). The Codex distinct-native-event-per-message-under-one-
  `turn_id` mechanism (E3) is untouched by this round's rewrite — it operates on `response_item`/`event_msg`
  pairs and `turn_id` boundary proofs, entirely orthogonal to the Chinese-negation grammar that was deleted. No
  counterexample found; this section does not depend on the deleted machinery and the deletion does not strand
  anything here.
- **Plan/Skill dispatch branch selection**: §5.3's `scene`/skill-routing evidence and the five Plan-condition
  lower bound (789-815) are unchanged by this rewrite; `semanticRouteAxis` remains explicitly "not a sixth
  condition and not a tie-breaker" (592) and still contributes zero complexity points even under the new
  non-adjudicating signal (600). No counterexample found.
- **Scope discipline**: no runtime change, project write, or implementation step is authorized before the
  exact-SHA handshake anywhere in the read/swept text; §0's "Runtime authorization: none" and §17.0's
  "Implementation and bridge work begins only after that handshake" are consistent throughout. No breach found.
- **§15 mutants**: sampled 5277-5420 by keyword sweep for alias/quoting/negation mutants. Found no mutant in
  the sampled range that specifically exercises "a candidate suppressed by trailing content" or "a quoted-verb
  span not suppressed" — i.e., the exact contradiction in BLOCKER-2/3 has no counter-test in the sampled mutant
  catalog that would catch an implementation picking either side. This is folded into MINOR-1 below rather than
  raised as a fourth BLOCKER, since a missing mutant is a weaker defect than the contradiction it fails to
  catch.

## Findings

### BLOCKER-1 — §5.1's own fixture-pinning paragraph requires fixtures generated from an alternation the same paragraph declares deleted

`FINAL-EXECUTION-PLAN.md:599` states, inside §5.1: "No `NEG`, `ADV`, `NEG_SUSPECT`, generated negation product
or exempt-compound list exists in this section."

Twelve lines later, the same subsection's fixture-pinning sentence (`FINAL-EXECUTION-PLAN.md:611-614`) requires:
"one negative fixture per `NEG` member in each of the two orders, one per `ADV` member proving attachment
survives, one proving an unlisted intervening token (`一直`) breaks attachment and takes the fail-closed arm,
every deletion of one generated negator member red."

This cannot be built. There is no `NEG` alternation to enumerate members of, no `ADV` alternation to enumerate
members of, and no "fail-closed arm" (the R25 `NEG_SUSPECT`/`NEEDS_CONTEXT(negation_unresolved)` mechanism,
itself named as deleted at line 512) to take. The paragraph also labels several fixtures "negative"/"positive"
(`别调整设置结构` negative, `颜色不改，重组设置分组` positive, etc. — lines 608-611), which is exactly the
binary mechanical verdict the paragraph's own opening declares the section no longer computes ("Negation is
**not** decided mechanically here either," line 594; "The structure leg therefore records evidence rather than
adjudicating it," line 596).

This is not a stray cross-reference elsewhere in the document — it is a direct self-contradiction inside the
twenty lines of §5.1 devoted to fixtures, squarely inside this lane's in-scope, gate-relevant surface (§17.0
lists §5 and §14 as gate scope). A conforming implementation cannot satisfy this required fixture set; it is an
unreachable required transition per the BLOCKER definition.

**Minimum repair**: delete lines 606-614 in their entirety (the `NEG`/`ADV`/fail-closed/negator-deletion
fixture list, plus the "negative"/"positive" verdict-labeled fixture list that presupposes mechanical
adjudication) and replace with fixtures that assert only what the new architecture actually computes: that the
signal fires plus verbatim `negation_context` for each listed sentence, and that no obligation is created
without independent LLM-layer confirmation — which the paragraph already states correctly at lines 603-606 for
a four-item subset, before the stranded text takes over.

### BLOCKER-2 — §4.2 and §14's `R-SIGNAL` assertion require opposite outcomes for the identical input string

`FINAL-EXECUTION-PLAN.md:570-572` (§4.2, "Required examples"):
> `「进入 luca app 项目」是个例子` and `` `进入 luca app 项目` `` → no selection, because the quoted span
> contains the directive verb;

`FINAL-EXECUTION-PLAN.md:4897-4900` (§14, `R-SIGNAL` — explicitly gate-scoped per §17.0):
> Quoting is likewise not adjudicated: `进入「luca app」项目`, `进入「luca app 项目」`, `「进入 luca app
> 项目」是个例子` and `进入「luca app 的设置」项目` each yield their candidates by span with no suppression
> rule;

`「进入 luca app 项目」是个例子` is the identical string in both fixture lists. §4.2 requires it to produce **no
candidate** (suppressed, because the quoted span contains the directive verb — a live "quoting-suppression
arm"). §14 requires it to produce **a candidate** ("no suppression rule"). These are mutually exclusive outputs
for one input; no implementation can satisfy both frozen fixtures simultaneously. This is a textbook BLOCKER —
"a contradiction... unreachable or ambiguous required transition."

It also directly falsifies two of the plan's own summary claims: the closure-map row at
`FINAL-EXECUTION-PLAN.md:371` ("the quoting-suppression arms... are gone, and reintroducing any of them is a
named biting mutant") and §4.2's own "total output" paragraph at `FINAL-EXECUTION-PLAN.md:520-521` ("Quoting,
backticking, negation, questions, report framing and clause structure are **not consulted**"). The §4.2
"Required examples" list (lines 550-573) is not consistent with either claim — it implements exactly the
three-arm quoting-suppression function the plan attributes to Round 25 and claims to have deleted (compare
`FINAL-EXECUTION-PLAN.md:374`'s description of that R25 mechanism almost verbatim to lines 570-572's rule).

**Minimum repair**: pick one side and delete the other. If the architecture's actual intent is "quoting is not
consulted" (matching the "total output" paragraph and the deletion narrative), delete the quoting-suppression
sentence at lines 570-572 and let every quoted occurrence of a registered alias/canonical ID become a candidate
by span, matching §14's R-SIGNAL text. If the actual intent is that a directive-verb-containing quoted span must
still be suppressed (matching the R25-inherited rule at 570-572), then §14's R-SIGNAL sentence at 4898-4900 is
wrong and must be corrected to single out `「进入 luca app 项目」是个例子` as a suppressed/negative case, and the
"total output" claim at 520-521 and the closure-map claim at 371 must be walked back to admit that quoting *is*
still consulted for one narrow case. Either repair is a single-site or two-site edit; the current bytes assert
both.

### BLOCKER-3 — the "trailing-content disarms" clause-structure grammar survives verbatim and contradicts the "exactly one operation: scan for occurrences" / "clause structure not consulted" claims

`FINAL-EXECUTION-PLAN.md:517-519` defines the hook's *entire* candidate-generation logic: "produced by exactly
one operation: scan the raw prompt for occurrences of a registered canonical directory ID or metadata alias...
A metadata alias requires an adjacent `项目|工程` marker to become a candidate." No trailing-content, clause-
terminal or clause-structure condition appears in this definition. `FINAL-EXECUTION-PLAN.md:520-521` reinforces
this: "Quoting, backticking, negation, questions, report framing and clause structure are **not consulted**."

But `FINAL-EXECUTION-PLAN.md:479-500` (the section's own opening "Executable selection grammar") and its
required examples at `FINAL-EXECUTION-PLAN.md:557-561` retain the Round-18 trailing-content rule nearly
verbatim: an alias with an adjacent marker followed by a possessive/content token from a closed set
(`的|里|中|下|报告|登录|设置|任务|功能|页面`) is explicitly "non-authorizing" (486-488) and the worked examples
confirm this collapses candidate count to zero — `进入 luca app 项目页面看看`, `切到 luca app 项目功能` and
`回到 luca app 项目的登录流程` are pinned as "no project selection" (559-561), explicitly because "the
trailing-content tokens that disarm `打开|继续` disarm this family too for an alias target" (560). "Disarm" here
is not a synonym for "not a candidate under the marker-adjacency rule" — the marker-adjacency rule (517-519)
has no trailing-content exception, so under that rule alone these three strings each contain an alias
immediately adjacent to `项目`/`工程` and would be candidates. The only way to reach "no project selection" is
to still be running the pre-deletion clause-terminal grammar from lines 479-500 — i.e., clause structure *is*
still consulted, contradicting line 520-521 outright.

This is the same defect class as BLOCKER-2 (surviving pre-deletion clause-structure machinery mislabeled as
deleted), but a distinct mechanism (trailing content vs. quoting) with its own distinct counterexample set, and
it is the one with the clearer axis-2 consequence: for this whole family of natural rephrasings of the original
complaint, the hook now supplies **zero** alias evidence to the LLM layer — not "evidence plus LLM judgment,"
but nothing at all — which is the exact starting condition that produced E1. The plan's claim that E1 "can no
longer recur... because the hook no longer refuses" (536-539) is not true for this family: the hook does not
"refuse" in the sense of emitting a denial, but it does withhold the only signal the new architecture says
closes E1 ("`alias_resolution` supplies exactly that missing binding and nothing more," line 535), for reasons
that are exactly the deleted grammar's descendant.

**Minimum repair**: either (a) delete the trailing-content clause from the §4.2 "Executable selection grammar"
(lines 486-494) and its dependent required examples (557-561), making candidate generation purely
marker-adjacency as lines 517-519 already claim it is, which would also close the axis-2 gap for this input
family; or (b) if the trailing-content rule is intentionally retained as a *different*, non-Chinese-negation
mechanical judgment that the author considers safe to keep, rewrite lines 520-521 to say "quoting, backticking,
negation, questions and report framing are not consulted, but clause-terminal trailing content still gates
candidate membership" — and then defend why that judgment is exempt from the same six-round falsification
history §4.2 uses to justify deleting everything else, since it is the same general category (parsing Chinese
clause structure inside a deterministic hook) the plan's own root-cause paragraph (509-511) says a hook cannot
reliably do.

### MINOR-1 — no §15 mutant guards the BLOCKER-2/3 contradiction

The sampled §15 range (5277-5420) contains no mutant that would turn red if an implementation picked the
"suppress" side of BLOCKER-2/3 while the test suite was built from the "no suppression" side, or vice versa. A
missing mutant is a weaker defect than the contradiction itself (already raised as BLOCKER-2/3), but it means
neither side of the ambiguity is self-detecting; whichever fixture list an implementer codes from first will
pass its own tests while silently failing the other section's requirement. Not raised as a fourth BLOCKER
because it does not independently block landing once BLOCKER-2/3 are fixed by choosing one side; folded in here
as the corresponding test-catalog gap.

## Out-of-scope observations

- The plan's status line (`FINAL-EXECUTION-PLAN.md:5`) states "Every R18–R26 BLOCKER, MAJOR and MINOR is closed
  here." Per §17.0, the §0.3-adjacent status-line wording is bookkeeping and non-blocking, but as a factual
  matter this claim is optimistic: the R18 MAJOR-1 "asymmetric trailing-content grammar" closure (recorded at
  its own closure-map row, line 366) was never actually superseded — the same trailing-content mechanism is
  still live in the current bytes (BLOCKER-3) and is not distinguished from "closed by deletion" anywhere in
  the current text.
- The closure-map row at `FINAL-EXECUTION-PLAN.md:371` ("Root cause and disposition") is itself the historical-
  narrative genre §17.0 excludes from gate scope, but it is also the row whose claims BLOCKER-2/3 falsify most
  directly; flagged here for visibility even though it cannot be cited as a BLOCKER site by itself.

## Residual risk

If BLOCKER-1/2/3 are repaired by deleting the stranded fragments (the more likely correct direction, since it
matches the plan's stated intent and the "total output" paragraph that appears to be the authoritative, most
recently written definition), the architecture's core claim — a hook that only records candidates cannot
authorize or refuse — becomes actually true rather than aspirationally true, and this lane's six-round failure
history plausibly closes. The residual risk is entirely in axis 2's narrower form: once trailing-content and
quoting suppression are removed, *every* occurrence of a registered alias adjacent to its marker becomes a
candidate, including inside genuinely irrelevant text (a report, a past-tense narration, a hypothetical) — the
plan accepts this tradeoff explicitly ("the hook makes no claim about what the user wants," line 521) and pushes
the discrimination entirely to the LLM layer, which is consistent with the repository's standing semantic-
routing rule cited at lines 509-511. That tradeoff was not falsified by this round; only the document's failure
to actually make that tradeoff consistently, in its own text, was.

## Verification

Re-ran immediately before writing this file (see Receipt) and again immediately after:

- Post-write plan SHA-256: `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161` (unchanged).
- Post-write plan line count: `5730` (unchanged).
- Post-write `HEAD`: `c146cb70fa8ae95159d31763d57613194b74d68d` (unchanged).
- Post-write upstream: `c146cb70fa8ae95159d31763d57613194b74d68d` (unchanged).
- Post-write tree: `f15777109b3f524ab0a87888ba74ee4f825a8066` (unchanged).
- `git rev-list --left-right --count HEAD...@{u}` post-write: `0 0`.
- No drift across the write. Round remains valid at the moment this file was produced.

## Conclusion

Plan SHA-256 `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161` (5,730 lines) against framework
`HEAD`/upstream `c146cb70fa8ae95159d31763d57613194b74d68d` (tree `f15777109b3f524ab0a87888ba74ee4f825a8066`):
**FAIL** — 3 BLOCKER, 0 MAJOR, 1 MINOR. The seventh round on this lane's assigned negation/quoting/clause-
structure surface finds a new failure shape again: not a missing negator or an asymmetric rule this time, but
an incomplete deletion — the plan's narrative, status line and "total output" definition assert that the
mechanical clause-structure judgment was removed entirely, while §4.2's own opening grammar, its own required
examples, §5.1's own fixture-pinning paragraph and §14's `R-SIGNAL` assertion still contain substantial,
verbatim-recognizable fragments of exactly that judgment — fragments that contradict both the deletion claim
and, in BLOCKER-2, each other, on the identical input string.
