# Plan Agent Gate — Round 31 receipt

Independent Plan Agent Gate review of
`framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
Reviewer is not the author. Gate scope taken from §17.0 and obeyed.

---

## ROUND STATUS: STALE — KILL-02 FIRED MID-REVIEW

`BASELINE_HEAD`/`BASELINE_UPSTREAM` advanced from the frozen
`644918028f75fd9c1c8c33107d808814fd198272` to
`4658595ac20ce544cb406657c70ba3259eb1f842` **between self-check 1 and self-check 2**,
by a concurrent commit `4658595 docs(audit): finalize Codex harness completion review`
(11 files, all under `framework-audit/2026-08-28-codex-harness-benchmark/`).

§0.3 is explicit that this is not survivable: *"any further commit on either
repository, including another audit-only one, re-fires KILL-02 and the in-flight
review round is stale."*

Per the review instruction — *mismatch at any point → declare STALE, report that,
no verdict* — **no `READY_FOR_REDTEAM` / `NOT_READY_FOR_REDTEAM` verdict line is
issued for Round 31.** The findings below are recorded so the next round starts
from them rather than re-deriving them.

### The findings survive the ref move and are re-usable as-is

| check | result |
|---|---|
| plan SHA at end of review | `30ca596904cb47a05fe464dd594ca59ee39fbacc48314dc0d49a8894bb9c61f4` — unchanged |
| plan line count | 5965 — unchanged |
| non-audit paths in `6449180..4658595` | **0** |
| 13 pinned envelope blobs at new HEAD | all 13 identical to the §0.3 pins (`route-guard.mjs` still `f895cc21…`, `CLAUDE.md` still `199d724e…`) |

Every probe below was run against `route-guard.mjs` blob `f895cc21…`, which the
new commit did not touch. The runtime evidence therefore reproduces verbatim once
the baseline is re-frozen; only the round's *validity*, not its content, was lost.

---

## Three mandatory self-checks

**Self-check 1 — before reading (PASS against the frozen tuple)**

```
30ca596904cb47a05fe464dd594ca59ee39fbacc48314dc0d49a8894bb9c61f4  FINAL-EXECUTION-PLAN.md
5965
HEAD     = 644918028f75fd9c1c8c33107d808814fd198272
upstream = 644918028f75fd9c1c8c33107d808814fd198272
tree     = 9e757cb00e16877f0178325aac3b14d8af30e89a
PLAN-AGENT-REVIEW-R31.md: absent (verified before writing)
```

All four expected values matched.

**Self-check 2 — immediately before writing this report (FAIL — KILL-02)**

```
30ca596904cb47a05fe464dd594ca59ee39fbacc48314dc0d49a8894bb9c61f4  FINAL-EXECUTION-PLAN.md
5965
HEAD     = 4658595ac20ce544cb406657c70ba3259eb1f842   <-- MOVED
upstream = 4658595ac20ce544cb406657c70ba3259eb1f842   <-- MOVED
tree     = 368e1fc739b0618073c28eeb7e5cff7a9779ab6c   <-- MOVED
```

Plan bytes unchanged (KILL-01 clean); refs moved (KILL-02 fired).

**Self-check 3 — immediately after writing this report**

Recorded at the end of this file.

---

## KILL-02 / KILL-03 results

### KILL-02 — refs, verified from git

At self-check 1 the complete tuple verified clean, and every count in §0.3 was
reproduced mechanically rather than trusted:

- `HEAD == upstream == BASELINE_HEAD`, `tree == BASELINE_TREE` — matched.
- `PRIOR_BASELINE_COMMIT^{tree}` = `ffc658ee1f6770751d2024377c318404dbe5580b` — matched.
- `git rev-list --reverse b438c92..6449180` returned exactly the seven commits in
  §0.3's ancestry list, in the stated parent-to-child order — matched.
- **77 / 65 / 13 / 52 all reproduced.** `git diff --name-only PRIOR HEAD` = 77;
  minus `^framework-audit/` = 65; intersected against the bare path lines of
  §12.1–12.2 = **13**; complement = **52**.
- All 13 pinned `BASELINE_HEAD` blob hashes verified one by one against
  `git rev-parse HEAD:<path>` — **13/13 exact**.

At self-check 2 the refs had moved (above). **KILL-02 = FIRED.**

**Does counts-not-transcription still make misclassification detectable? Yes.**
This was the R19/R20/R30 failure site, so I ran the discrimination test rather
than accepting the claim. Re-running the same intersection with a deliberately
*wrong* membership rule — one that treats the tail of a nested
`…/payload/<path>` release-manifest entry as an envelope member, exactly the rule
§0.3 forbids — yields **20 members, not 13**. The two rules are separated by
seven paths, so a misapplied membership rule cannot produce the pinned count.
The mechanical partition is a genuine detector, not a formality.

Positive controls run through the same loops: a known non-member sample
(`.claude/agents/quality-gate.md`, `.agents/skills/...`) was confirmed to fall in
the 52, and the loose-rule control above confirmed the intersection is not
silently empty. No loop variable was named `path`/`status`/`argv`.

### KILL-03 — envelope paths carry no modification

Extracted the 147 bare path lines from §12.1–12.2 and intersected them against
`git status --porcelain` (tracked modifications + untracked).

- **Intersection: empty. KILL-03 = CLEAN.**
- **Positive control:** injecting `.claude/hooks/route-guard.mjs` into the dirty
  list makes the same `comm -12` emit that path. The empty result is a real
  negative, not a broken pipeline.

Observation (not a KILL-03 hit): `.claude/observability/rules.yaml` is dirty in
the worktree. It is *not* an envelope member — it appears only as a nested
`…/payload/.claude/observability/rules.yaml` line, which §0.3's membership rule
explicitly excludes. But §0.3 also states that §10.1 takes that file's
runtime-parity snapshot **from live worktree bytes**, while requiring every
byte-parity snapshot to be taken **against `BASELINE_HEAD` bytes**. With the file
dirty those two instructions currently select different bytes. Recorded as an
observation for the next round; it does not block.

---

## Findings

Numbered as they would have been graded. No verdict line is attached, per the
STALE rule.

### F1 — the axis split is unsound as written: a scope-axis negator hit *does* decide an authorization outcome (would be **BLOCKER**, §4.2, in scope)

§4.2's user-adjudicated exception rests on one load-bearing claim, stated three
times:

- table row: scope axis — *"wrong answer costs … a **question** (`NEEDS_CONTEXT`)
  or one extra Gate prompt"*;
- *"The retained rule is fail-safe **by construction**: a missed negator can only
  leave a downstream signal standing, which yields `mixed_ambiguous`→
  `NEEDS_CONTEXT`, **never a switch**."*;
- and therefore *"its closed set is permitted to be incomplete."*

That claim is false. Measured on the `BASELINE_HEAD` hook, three minimal pairs —
each differing **only** in whether `NEGATED_DOWNSTREAM_SCOPE_RULES` matches —
flip the outcome from a question to a project mutation:

| prompt | negator matched | decision |
|---|---|---|
| `new project: 涉及项目的route-guard` | no | `NEEDS_CONTEXT / clarify_framework_or_project_scope` |
| `new project: 不涉及项目的route-guard` | **yes** | **`PROJECT_SWITCH / create_new_project`** |
| `new project: 项目route-guard` | no | `NEEDS_CONTEXT` |
| `new project: 非项目route-guard` | **yes** | **`PROJECT_SWITCH / create_new_project`** |
| `new project: 属于项目的route-guard` | no | `NEEDS_CONTEXT` |
| `new project: 不属于项目的route-guard` | **yes** | **`PROJECT_SWITCH / create_new_project`** |

Confirmed at the rule level too: evaluating
`NEGATED_DOWNSTREAM_SCOPE_RULES` directly, only the `不`/`非` members match
(`not-downstream-project`), and simulating `classifyRoutingScope` with the rule
present vs. deleted shows `new project: 不涉及项目的route-guard` moving
`pure_framework_meta` ⇄ `mixed_ambiguous` — the strip is the sole cause.

**Mechanism, and why the plan already contains the premise.** `buildDecision`
short-circuits `mixed_ambiguous` to `NEEDS_CONTEXT` **before** `projectGate` runs.
A negator hit removes that short-circuit. `projectGate` then evaluates
`explicitNewProjectName` **first** — and its `pure_framework_meta` null arm comes
later. §3 records this exactly (*"explicit creation grammar and
named-existing-project both decided **before** the late `pure_framework_meta`
null arm, so that arm is never frozen as a universal"*) and §8.1 repeats it
(*"whose `pure_framework_meta` null arm is **late, not universal** … so an
explicit creation grammar … still returns `PROJECT_SWITCH/create_new_project`
despite that scope"*). Neither section propagates that fact into §4.2's safety
table, which asserts the opposite for the same code path.

**Why this is the "wrong project mutation" cell, not the "a question" cell.**
`create_new_project` is `project.sh new`: it detaches the currently bound project
and repoints `docs/` / workflow-state / current-topic. In the non-dry-run path
the hook calls `prepareProjectSwitch(...)` and emits a real `tx`. The project it
creates is named from the user's own disclaimer text (literally
`不涉及项目的route-guard`). That is precisely the cell §4.2 reserves for the
deleted authorization axis: *"a wrong project mutation — unrecoverable within
the turn."*

**The direction of the hazard is inverted relative to the plan's analysis.**
§4.2 reasons only about a *missed* negator and correctly finds misses safe. The
harm here comes from a *hit*. That inversion also makes the plan's own recorded
incompleteness misleading: `跟项目没关系` is presented as a harmless
availability gap, but on this input class the miss is the **only** thing
preventing the mutation — `new project: 跟项目没关系的route-guard` returns
`NEEDS_CONTEXT`, while its recognised synonym mutates. Extending the negator set
(which §4.2 explicitly permits: *"An implementation may extend the set"*) makes
the system strictly **less** safe, which no fail-safe-by-construction rule can do.

The exception may well still be the right ruling, but it cannot be justified by
the argument currently written. What is needed is either an ordering fix (run the
creation-grammar arm behind the scope decision, or make the scope strip
non-authoritative for `projectGate`), or an honest restatement of the exception
that concedes this coupling and bounds it. As written, the soundness argument is
falsified by the plan's own §3/§8.1 text plus a two-character minimal pair.

In gate scope: §4.2 and §8.1 are both named in §17.0's in-scope list.

### F2 — §5.1's "complete frozen corpus" contradicts §5.1's own three-leg rule, and §14 `R-SIGNAL` consumes the contradiction (would be **MAJOR**, §5.1/§14, in scope)

§5.1 defines the signal as three distinct evidence spans in **one clause**
("legs cannot aggregate across clauses"; clause boundaries are §4.2's
`，,。；;！!？?\n`), with closed leg vocabularies — change =
`优化/重组/重构/改版/重新设计/拆分/归组/调整`, interface = `页面/界面/设置/…`,
structure = `功能堆砌/层级/信息架构/分组/拥挤/很难找/难找/找不到/结构`.

It then asserts the corpus produces the signal. Checked member by member against
those closed lists:

| frozen string | legs present in one clause | §5.1 asserts |
|---|---|---|
| `别动结构` | structure only (`动` is not a change token) | signal ✗ |
| `结构别改` | structure only (`改` is not a change token; only `改版` is) | signal ✗ |
| `我们优化了设置页面，结构没变` | change+interface in clause 1, structure in clause 2 — aggregation across a `，` boundary | signal ✗ |
| `没改结构，只动了配色` | clause 1 structure only; clause 2 none | signal ✗ |
| `帮我优化下设置页面，别动结构，其他随便你改` | clause 1 change+interface; clause 2 structure | signal ✗ |
| `调整设置里的颜色但结构不变` | three legs, one clause | signal ✓ |
| `颜色不改，重组设置分组` | three legs in clause 2 | signal ✓ |
| `别再调整设置结构` | three legs, one clause | signal ✓ |

So five of the eight strings §5.1 pins cannot produce the signal under §5.1's own
definition, yet §5.1 states twice that they do — *"each produce the signal plus
their verbatim `negation_context`"* and *"Every one of them … produces the signal
… each carries three legs in one clause."*

Two consequences, both concrete:

1. §14 `R-SIGNAL` is a **blocking** assertion built on that corpus
   (`结构没变`/`别动结构`/`结构别改`/`别再调整设置结构` … *"each yields its …
   `semanticRouteAxis`+verbatim `negation_context`"*). An implementer who
   implements §5.1's leg rule correctly makes `R-SIGNAL` red for reasons that are
   not defects. An implementer who makes `R-SIGNAL` green must loosen the leg
   vocabulary or drop the one-clause restriction — i.e. re-introduce exactly the
   discretionary span machinery §4.2/§5.1 deleted. Both outcomes are bad, and the
   second is the failure mode this plan exists to prevent.
2. §5.1's two lists disagree with each other independently of the leg rule: the
   sentence at §5.1 pins `别再调整设置结构` and standalone `别动结构`, while the
   sentence four lines later calls a **different** seven-item set "the complete
   frozen corpus" — it contains `别调整设置结构` (no `再`) and no standalone
   `别动结构`. A closed list labelled "complete" that omits two strings the same
   section pins is the same stranded-consumer class R27 and R30 each found.

### F3 — observations (would be MINOR / non-blocking)

- **`rules.yaml` dirty vs. §10.1's live-worktree parity snapshot** — described
  under KILL-03 above.
- **§0.3 out-of-scope note:** the `PRIOR_BASELINE_COMMIT` tuple, the §2.15–2.17
  rows and §12.3's round lists were checked for internal consistency and read
  clean, but per §17.0 nothing there is graded.

---

## What was verified as CLOSED (R30's two findings)

I re-ran these rather than accepting the changelog.

**R30 BLOCKER — the vacuous gate-suppression control — is genuinely closed. The
vacuity did not move a third time.** I walked every branch that could claim
`route-guard 在 luca app 工程里怎么走` first:

1. `mixed_ambiguous` short-circuit — does not fire. Simulated
   `classifyRoutingScope` directly: the prompt classifies **`pure_framework_meta`**
   (`route-guard` supplies `runtime-guards`; `工程` is in neither
   `DOWNSTREAM_SCOPE_RULES` rule). Conjunct (iii) is real.
2. `projectGate` → `declaredNewProject` — `explicitNewProjectName`'s patterns are
   whole-input anchored; a question does not match.
3. `projectGate` → `namedProject` — **checked against the real 12-project census**,
   not just the `muse,crm` env override, because this is the only
   environment-dependent branch. Real projects are `快速语音录入, agent-e2e-test,
   ai 宠物提示, CRM工作台零摩擦研究, luca-dev, meeting-onepager, mobile-list, muse,
   projA, projB, roam-cards, todo-capsule`; none is claimed by the string.
   Live probe with the real list returns `STOP`. Conjunct (i) is real.
4. direct-call / PLAN_MODE / `skillDecision` — `STOP, no_keyword_match`.

Conjunct (ii) (a candidate is produced) holds trivially under the de-conditioned
§4.2 rule, since `luca app` is a registered alias and the marker no longer gates.
So the conjunction is finally exercised: `pure_framework_meta` **and** a candidate.

The paired negative controls also behave as pinned, on both the override list and
the real census: `route-guard 在 muse 里怎么走` → `PROJECT_SWITCH /
switch_existing_project / muse`; `route-guard 在 luca app 项目里怎么走` →
`NEEDS_CONTEXT`. The `工程`/`项目` distinction is load-bearing, not cosmetic.

The measurable-now / post-implementation split is stated separately in §8.1 and in
§14 `R-FLOW`, and `R-FLOW` requires **both** halves ("an implementation satisfying
either alone fails it"). That closes R30's MINOR about packaging an unmeasurable
half inside a measured claim.

**R30 MAJOR — `R-ALIAS` demanding six candidate-producing families be "negative"
— is closed.** `R-ALIAS` now reads *"Candidate recording is **unconditional on
intent**"* and confines negatives to registry-level arms only; it agrees with
§4.2 and with `R-SIGNAL` on the identical strings.

**R30 MINOR — candidate cap.** Unified: every site says eight, with a cap+1
(ninth) rejection fixture. No "nine" survives.

**§4.2's `iff marker` conditional** is removed; the marker is recorded and never
gating; restoring it in any form is a named §15 mutant. Confirmed the fixtures it
used to contradict (`打开 luca app`, `继续 luca app 的登录流程`) are now
consistent with the rule.

## Do both directions of the axis-scoped §15 mutant have biting controls? Yes.

This is the second thing I refused to take on prose.

- **Authorization-axis direction** (re-introducing negation to decide whether a
  directive was issued): covered by §14 `R-ALIAS`/`R-SIGNAL`'s frozen nine-member
  R18–R26 corpus, each asserted to yield a candidate with no mutation/command/
  capability. A rule that authorizes or refuses on a negator turns those red.
- **Deletion direction** (deleting the retained `NEGATED_DOWNSTREAM_SCOPE_RULES`):
  I scanned all 684 string literals in `scripts/test-route-guard.mjs` plus every
  `input` in `memory/evals/routing/fixtures.jsonl` through the two negation
  regexes and found **exactly two** matches, both committed test cases in
  `test-route-guard.mjs` (lines 917 and 927 — the `framework-evolution Mode 2`
  cases). Simulating the deletion flips both from `pure_framework_meta` to
  `mixed_ambiguous`, i.e. from their expected framework routing to
  `NEEDS_CONTEXT`. **The deletion mutant bites, on committed bytes.**
  Positive control for that scan: two hand-written negator strings were confirmed
  to match through the same filter, so the "exactly two" result is a real count.
  Note the biting cases live in `test-route-guard.mjs`, not in the fixture file,
  so the one uncommitted `fixtures.jsonl` line is not load-bearing here.

`scripts/test-route-guard.mjs` was run against the unmodified live repo and
reports **`PASS=132 FAIL=0`**, matching the §3/§8.1/§14/§16 regression floor
exactly. `scripts/check-routing-map.mjs` passes. No runtime file, hook, test or
config was modified; the mutant analysis was done by evaluating the rule tables
in-memory, never by editing the live shared hook.

## Cross-section contradiction sweep

Searched by semantics and by import-style phrasing (`same … as §`, `per §`,
`defined in §`, `identical to §`, `§N requires/states/defines`, `unchanged from §`)
across the whole document, then hand-checked each hit. Beyond F1 and F2, no two
sections were found requiring opposite outcomes for one input. Specifically
checked and found consistent: the eight-candidate cap; the `132/0` floor (four
sites agree); `pure_framework_meta` (eleven sites, all consistent, with §3 and
§8.1 both correctly recording the arm order); §5.1's carve-out that the retained
scope rule "must not turn any test red" against §15's axis-scoping; and
`check-routing-map.mjs` correctly appearing as a §16 runner but **not** in the
§12 envelopes, since the plan runs it without modifying it.

---

## Sections read vs. not reached

**Read this round:** §0.3 (in full, for KILL-02/03), §3 tail, §4.1, §4.2 (in
full), §5.1, §5.2, §8.1 (in full), §8.5, §8.6, §11, §12.1, §12.2, §12.3, §13,
§14 `R-ALIAS`/`R-SIGNAL`/`R-FLOW`/`R-OBLIGATION` head, §14 `T-AUTH`/`T-REVOKE`/
`T-MATRIX`, §15 (alias/negation/marker/FRAMEWORK-FLOW mutant blocks and
surrounding lists), §16 `L0`–`L3` and the runner block, §17.0 and §17.

**Not reached:** §5.3 (lines 851–2547) and §5.4 (2547–3010) — the two largest
blocks in the document, read only via their §8.1/§8.5/§14 consumers; §6.1–§6.3;
§7.1–§7.2; §9.1–§9.4; §10.1–§10.3; §14's `R-` entries after `R-OBLIGATION` and
the `T-` entries after `T-MATRIX`; §15's non-routing mutant blocks (transfer,
controller, activation); §16's `L4`/evidence tail. Effort was concentrated where
the gate directed it — the architecture exception, the derived control, the
mutant controls and the KILL invariants — and F1 was found there.

---

## Self-check 3 — immediately after writing this report

```
$ shasum -a 256 FINAL-EXECUTION-PLAN.md && wc -l < FINAL-EXECUTION-PLAN.md
30ca596904cb47a05fe464dd594ca59ee39fbacc48314dc0d49a8894bb9c61f4  FINAL-EXECUTION-PLAN.md
5965
$ git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD '@{u}'
4658595ac20ce544cb406657c70ba3259eb1f842
4658595ac20ce544cb406657c70ba3259eb1f842
$ git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD^{tree}
368e1fc739b0618073c28eeb7e5cff7a9779ab6c
```

Plan bytes and line count identical to self-checks 1 and 2 — the plan was not
touched by this review. Refs remain at `4658595…`, i.e. still off the frozen
`BASELINE_HEAD`; the STALE determination stands and is stable (the ref did not
move again during the write).

---

## Handling note

- `FINAL-EXECUTION-PLAN.md` was not modified (SHA identical at all three
  self-checks). No existing `PLAN-AGENT-REVIEW-*.md` or `REDTEAM-ROUND-*.md` was
  modified or renamed. No runtime file, hook, test or config was modified. No git
  write command was run. `PLAN-AGENT-REVIEW-R31.md` was verified absent before
  writing.
- Everything reported here was actually executed. Where a negative result was the
  answer I wanted, a positive control was run through the same loop — stated
  inline at each such point.
