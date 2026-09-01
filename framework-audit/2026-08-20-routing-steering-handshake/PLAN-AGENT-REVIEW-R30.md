# Plan Agent Gate — Round 30

Reviewer: independent Plan Agent gate reviewer (not the plan author).
Object: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
Scope: §17.0 as written. BLOCKER/MAJOR raised only against the executable contract
(§4, §5, §6, §7, §8, §9, §10, §11, §12.1–12.2, §13, §14, §15, §16). The §0.3 literal hash values, the
§2.15–2.17 closure-map rows and the §12.3 round-number lists were **not** litigated.

---

## 1. Three mandatory self-checks (staleness protocol)

All three taken with `git -C /Users/luca/Desktop/项目/muse/lucagstack` (never a `cd` chain).

| Point | plan SHA-256 | lines | HEAD | @{u} | HEAD^{tree} |
|---|---|---|---|---|---|
| (1) before reading | `4882ad9d1d5d8141e15bbe07dbf3e52e9640e128171a8183cd88f9f6f004bd7e` | 5892 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |
| (2) before writing | `4882ad9d1d5d8141e15bbe07dbf3e52e9640e128171a8183cd88f9f6f004bd7e` | 5892 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |
| (3) after writing | `4882ad9d1d5d8141e15bbe07dbf3e52e9640e128171a8183cd88f9f6f004bd7e` | 5892 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |

All three match the expected tuple. **This round is not stale.** `PLAN-AGENT-REVIEW-R30.md` did not exist
before this write (checked at points 1 and 2).

---

## 2. Verdict

```
NOT_READY_FOR_REDTEAM
1 BLOCKER / 1 MAJOR / 2 MINOR
```

R29's four findings are each genuinely closed at their named sites, and I re-derived the corrected §8.1
`projectGate` description against the landed hook rather than reading it (see §5). But the replacement control
for R29's BLOCKER was chosen without checking it against §4.2's own recognition rule. `route-guard 在 luca app
里怎么走` carries **no `项目|工程` marker**, and §4.2 twice states that a metadata alias is a candidate *only*
with an adjacent marker. Under the plan's own grammar the new control therefore records **zero** candidates —
so the mutant it exists to catch ("let a candidate make `projectGate` return non-null under
`pure_framework_meta`") still has nothing to bite on. The vacuity has **moved from the scope layer to the
candidate layer**, not been fixed. Separately, §4.2's `打开 luca app` / `继续 luca app 的登录流程` fixtures
require exactly the outcome that same rule forbids, so §4.2 is internally inconsistent at the site the new
control depends on.

---

## 3. Findings

### BLOCKER-1 — the new `R-FLOW` control carries no candidate under §4.2's own recognition rule; the vacuity moved rather than closed
**Lands in:** §4.2 (lines 516–517, 542 vs 575, 587–588), §8.1 "Position relative to the `FRAMEWORK FLOW` layer"
bullet 2 (lines 3600–3611), §14 `R-FLOW`, §15 "`FRAMEWORK FLOW` non-interference" mutant 2. All in gate scope.

**The rule.** §4.2 defines `RESOLVE` as "exactly one recognition rule, and it admits no variant, exception or
precedence order", and states it twice:

- line 516–517: "a **metadata alias** occurring anywhere in the prompt is a candidate **iff the adjacent token
  is the `项目|工程` marker**";
- line 542: "A metadata alias **requires** an adjacent `项目|工程` marker to become a candidate; a canonical
  directory ID does not."

**The new control.** §8.1 bullet 2 and `R-FLOW` both freeze `route-guard 在 luca app 里怎么走`, asserting it
"classifies `pure_framework_meta`, takes `projectGate`'s null arm and emits `STOP`, **while §4.2's `RESOLVE`
still records its `muse` candidate** — proving `RESOLVE` did not resurrect the suppressed gate."

The adjacent token after `luca app` in that string is `里`. It is not `项目` and not `工程`. Under lines
516–517 and 542 the alias is **not** a candidate. The operative clause of the control — the only clause that
makes it a test of *candidates* rather than of scope — is false by construction.

**Consequence, which is exactly R29's failure mode at a new address.** §15's mutant *"let a candidate make
`projectGate` return non-null under `pure_framework_meta`, resurrecting the gate that scope suppresses"* is
parameterised on a candidate existing. With zero candidates on the frozen control, the mutant cannot change its
outcome: `STOP` before, `STOP` after. The test does not turn red. R29 rejected the previous control because it
could not instantiate `pure_framework_meta`; this control instantiates `pure_framework_meta` but cannot
instantiate a candidate. Neither version has ever exercised the conjunction the property needs.

**§4.2 is also internally inconsistent at this exact point, so no reading rescues the plan.** Two of its own
frozen fixtures demand the opposite of its rule:

- line 575 / 587: `打开 luca app` → "one `muse` candidate with `marker_present:false`";
- line 588: `继续 luca app 的登录流程` → "one `muse` candidate, `marker_present:false`".

Neither carries a `项目|工程` marker. Under lines 516–517/542 both yield zero candidates, and
`marker_present:false` is unreachable for any *alias* candidate at all. So:

- *Read with the `iff` binding* (the only reading under which line 542's "requires" means anything): the new
  `R-FLOW` control is vacuous as above, **and** two §4.2 blocking fixtures are unsatisfiable.
- *Read with line 517's "the marker's presence is recorded, never used to accept or reject"* extended to
  candidacy: the fixtures work, the control works — but lines 516 ("iff") and 542 ("requires") are then false,
  and §4.2's claim to state "exactly one recognition rule … admits no variant, exception" is self-falsifying.
  An implementer reading line 542 and building the marker gate would write a hook against which `R-FLOW`'s
  candidate clause is **red at implementation** — a non-detector, not a regression floor.

Either way this is a defect in a freshly added blocking assertion plus the section it imports from, and §4.2
itself declares the condition forbidden: "Two sections requiring opposite results for one input is itself a
defect this contract forbids."

**A correct control exists, is cheap, and I verified it.** The property needs a prompt that is simultaneously
(a) `pure_framework_meta`, (b) alias-bearing **with** the marker §4.2 requires. `项目` cannot be used — it is a
`DOWNSTREAM_SCOPE_RULES.project` trigger, so the prompt short-circuits to `NEEDS_CONTEXT` **before**
`projectGate` is ever reached. `工程` appears in neither `DOWNSTREAM_SCOPE_RULES` entry. Measured at
`BASELINE_HEAD`, `ROUTE_GUARD_PROJECTS='muse,crm'`, current project `crm`:

```
route-guard 在 luca app 里怎么走     → STOP/no_keyword_match      (gate null arm, but NO marker → no candidate)
route-guard 在 luca app 项目里怎么走 → NEEDS_CONTEXT/clarify_framework_or_project_scope   (mixed_ambiguous; never reaches the gate)
route-guard 在 luca app 工程里怎么走 → STOP/no_keyword_match      (gate null arm AND §4.2's marker present)
```

Only the `工程` form threads the needle. Swapping it into §8.1 bullet 2 and §14 `R-FLOW` — and reconciling
§4.2's `marker_present:false` fixtures with its `iff` rule so `打开 luca app` has one defined outcome — would
close this finding. Both are single-site prose edits; no mechanism changes.

---

### MAJOR-1 — §14 `R-ALIAS` still states the **deleted** grammar's oracle, contradicting §4.2 on six input families
**Lands in:** §14 `R-ALIAS` (lines 5008–5009), against §4.2 lines 585–601. Both in gate scope.

`R-ALIAS` reads, verbatim: "both original alias phrases resolve muse; **direction chooses only target; bare
open/login-continue, question, quote/example/report, negation and typo are negative**".

Every clause but the typo is repudiated by §4.2:

| `R-ALIAS` says | §4.2 requires |
|---|---|
| "direction chooses only target" | `从 luca app 切换到 crm 项目` → two candidates, both recorded; "**the hook does not decide that only the target matters**, because 'which one is the target' is a semantic judgment" |
| bare open → negative | `打开 luca app` → one `muse` candidate |
| login-continue → negative | `继续 luca app 的登录流程` → one `muse` candidate |
| question → negative | `请告诉我怎么进入 luca app 项目` → one `muse` candidate |
| quote/example/report → negative | `进入「luca app」项目`, `「进入 luca app 项目」是个例子`, `测试短语：进入 luca app 项目` → one candidate each |
| negation → negative | the nine-string R18–R26 corpus → "**exactly one `muse` candidate**" each |
| typo → negative | `进入 luca ap 项目` → `alias_not_found` — the one accurate clause |

This is not a wording quibble; it is a live contradiction *inside the blocking assertion matrix*. §14
`R-SIGNAL` was updated for the same corpus and says so explicitly ("asserts the **new** contract rather than
the deleted one"); `R-ALIAS`, three lines above it, was not. So §14 requires the negation corpus to be
candidate-**producing** (`R-SIGNAL`) and candidate-**negative** (`R-ALIAS`) at the same time.

§5.1 states the governing principle against itself: "a fixture asserting any of them 'negative' would be
asserting the deleted grammar." And the plan's own §3 record of the Round-27 BLOCKERs names this precise
failure class — "§4.2 and §14 required **opposite** outcomes for the identical string" — and claims the repair
sweep searched "by **semantics and import-style phrasing** rather than by identifier". `R-ALIAS`'s summary line
is deleted-grammar semantics stated in other words, which is exactly what that sweep was designed to catch and
did not. An implementer who builds `R-ALIAS`'s fixtures from this text produces tests that must fail against
§4.2's.

MAJOR rather than BLOCKER because the correct outcome is unambiguously fixed by §4.2 and the repair is one
sentence; it does not, unlike BLOCKER-1, leave a required mutant without a control.

---

### MINOR-1 — §4.2's candidate cap is stated as both eight and nine
**Lands in:** §4.2 line 539 vs 575; cross-checked against §15 line 5581.

Line 539: `candidates` is "a duplicate-free, **at-most-eight** array". Line 575 pins as a blocking fixture "the
**nine-candidate** cap". §15's mutant is "ignore the **cap+1** entry", which is coherent with cap=8 and a
nine-candidate fixture, but the plan never says so; read literally the two lines assert different caps for one
executable limit. `R-ALIAS`'s own overflow enumeration (513th root entry, 257th project, aggregate overflow)
omits the candidate cap entirely, so nothing else disambiguates it. Non-blocking; naming the fixture "the
cap+1 (ninth) candidate" would settle it.

### MINOR-2 — §8.1 bullet 2 attributes a post-implementation requirement to a `BASELINE_HEAD` measurement
**Lands in:** §8.1 lines 3604–3607.

The sentence reads "**measured at `BASELINE_HEAD`** with current project `crm`, it classifies
`pure_framework_meta`, takes `projectGate`'s null arm and emits `STOP`, while §4.2's `RESOLVE` still records
its `muse` candidate." The first three clauses are measurable at `BASELINE_HEAD` and I confirmed them. The
fourth cannot be: `RESOLVE` does not exist at `BASELINE_HEAD` — it is what §12.1 authorizes this plan to add.
Packaging a baseline observation and an implementation requirement inside one "measured" claim is how
BLOCKER-1 escaped notice, since the unmeasurable half is the half that is wrong. Non-blocking on its own;
noted because splitting the sentence is part of BLOCKER-1's repair.

---

## 4. Observations (not findings; do not block)

- R29's MINOR-1 is not merely closed but improved: §16 now says `check-routing-map.mjs` asserts its three
  patterns "each appear **somewhere in the file** — three unanchored whole-file matches, so it proves presence,
  not that the scope belongs to that entry", and delegates entry-level binding to `R-FLOW`'s behavioural cases.
  I confirmed the runner's line 37 is an unanchored `assert.match(content, /scope:\s+"?framework_meta"?/, …)`.
- R29's MINOR-2 is closed: §13 step 1 now enumerates `PLAN-AGENT-REVIEW-R28.md`, `REDTEAM-ROUND-28-ROUTING.md`
  and `PLAN-AGENT-REVIEW-R29.md`, and adds the standing rule "This list must name every receipt §12.3 records
  as a prior input."
- I probed §15's mutant 1 ("feed `alias_resolution` into … the `scope: framework_meta` route filter") for a
  missing control and concluded it has one: the `crm` counter-guarantee case at
  `scripts/test-route-guard.mjs:866` (`给 crm 项目做用户人格自我成长功能`) carries a canonical-ID candidate and
  asserts `notEqual FRAMEWORK_FLOW`, so a filter that consults candidates turns it red. Reported as an
  observation, not a finding, because a narrowing variant of that mutation may not bite and I did not want to
  raise a defect that depends on which direction an implementer writes.

---

## 5. KILL-02 and KILL-03 verification

**KILL-02 — HELD.** Verified from git at all three self-check points, `HEAD`, `@{u}` and `HEAD^{tree}` resolved
independently each time: `b438c92b1d1dbb28f5252396181f1cb9ab806900` / `b438c92b1d1dbb28f5252396181f1cb9ab806900`
/ `ffc658ee1f6770751d2024377c318404dbe5580b`, exactly the §0.3 `BASELINE_HEAD` / `BASELINE_UPSTREAM` /
`BASELINE_TREE`. Neither ref moved during the review.

**KILL-03 — HELD.** Method: `awk '/^### 12\.1/,/^### 12\.3/'` over the plan, filtered to bare path lines
(`^[A-Za-z0-9._/-]+$`) → **147** distinct literal envelope lines; intersected by exact whole-line match
(`grep -qxF`) against the complete dirty set from `git status --porcelain` (24 entries: 4 tracked
modifications, 20 untracked). **Intersection is empty.**

The dirty set is `.claude/observability/observations.jsonl`, `.claude/observability/rules.yaml`,
`memory/evals/routing/fixtures.jsonl`, this round's own `FINAL-EXECUTION-PLAN.md`, `.playwright-cli/`, and 19
untracked audit-package files (`PLAN-AGENT-REVIEW-R19…R29`, `REDTEAM-ROUND-24…28`, `NEXT-SESSION-GOAL.md`).
None appears as its own literal line in §12.1/§12.2.

**Rig self-test (positive control), because an empty intersection is the answer I wanted.** I fed the loop two
synthetic dirty rows for paths that *are* bare envelope lines — `.claude/hooks/route-guard.mjs` and `CLAUDE.md`
— and the same loop reported `HIT` for both. I then confirmed those two, plus `AGENTS.md`,
`scripts/test-route-guard.mjs` and `.gitignore`, are genuinely clean in the worktree
(`git status --porcelain <paths>` → 0 lines). The empty real intersection is therefore a measurement, not a
dead rig. I also avoided naming any loop variable `path`/`status`/`argv` per the stated zsh trap.

---

## 6. What I verified as *correct* (run against landed bytes, not read off the plan)

Red teams need not re-derive these.

- `node scripts/test-route-guard.mjs` → **`PASS=119 FAIL=0`, exit 0.** `node scripts/check-routing-map.mjs` →
  **PASS, exit 0.** Both match §3, §8.1, §14 `R-FLOW` and §16.
- **R29's MAJOR-1 is genuinely closed and the replacement is accurate.** §8.1 now says the `pure_framework_meta`
  null arm is "**late, not universal** — reached only after the earlier arms", naming `explicitNewProjectName`
  and the `namedProject` arm. Confirmed by execution: `new project: route-guard` →
  `PROJECT_SWITCH/create_new_project/route-guard` despite `pure_framework_meta` scope.
- **The frozen negative control behaves as claimed.** `route-guard 在 muse 里怎么走` →
  `PROJECT_SWITCH/switch_existing_project/muse` with current project both `crm` and empty, which is the
  `SC-20260523-002` behaviour §8.1 and `R-FLOW` now require it to keep.
- The gate-null half of the new control is real: `route-guard 在 luca app 里怎么走` → `STOP/no_keyword_match`
  under current project `''`, `crm` and `muse` alike. `nameMatchesIn` misses `luca app`, no
  `DOWNSTREAM_SCOPE_RULES` entry matches the residual (`应用` is the Latin `app` here, not the CJK token), so
  the scope is `pure_framework_meta` and `projectGate` reaches its late null return. Only the *candidate* half
  fails — BLOCKER-1.
- `R-FLOW`'s "six framework-flow cases plus the live hint-surface fixture" is accurate:
  `scripts/test-route-guard.mjs` lines 820 (benchmark self-evolution), 830 (`应该是自我成长流程吗` correction),
  839 (`framework-evolution-scout`⇒`scout`), 849 (`/deepresearch`), 858 (`$deepresearch`), 866 (`crm`
  counter-guarantee), plus the separate live hint fixture at 912.
- §5.1 is clean and self-guarding: it states in terms that "a fixture asserting any of them 'negative' would be
  asserting the deleted grammar", contains no `NEG`/`ADV`/`NEG_SUSPECT` residue, and defers confirmation to
  §5.2's gate. It is the section §14 `R-ALIAS` violates (MAJOR-1), not a source of defects itself.
- §16's runner list and §13 steps 1–2 read consistently with §12.3 on the R28/R29 receipts.

---

## 7. Coverage — what I read and what I did not reach

**Read in full:** §4.1, §4.2, §5.1, §8.1 (including the complete route-transition table), §8.2 opening, §13
(all 11 steps), §14 `R-ALIAS`/`R-SIGNAL`/`R-FLOW`/`R-OBLIGATION`/`R-SCOPE`, §15 (all mutant paragraphs and the
fault-injection block), §16's runner list and its `b438c92` regression-floor paragraph, §17.0 and §17's
handshake paragraph. Plus `PLAN-AGENT-REVIEW-R29.md` in full, and the relevant regions of
`.claude/hooks/route-guard.mjs` (lines 200–360: `FRAMEWORK_SCOPE_RULES`, `DOWNSTREAM_SCOPE_RULES`,
`classifyRoutingScope`, `explicitNewProjectName`, `projectGate`), `scripts/check-routing-map.mjs` and the
framework-flow block of `scripts/test-route-guard.mjs`.

**Not reached — declared honestly, no claim is made about this material:**
- §5.2 "Obligation creation and persistence" — opening only.
- §5.3 "Route receipt and mechanical gates" (≈1,700 lines) — not read.
- §5.4 "Raw-byte projection and task preservation" — not read.
- §6 (prompt gate, lazy attestation, anti-replay) — not read.
- §7 (schema-v3 state and safe IO) — not read.
- §8.3–§8.6 (stable-state matrices, route-obligation precedence, Stop/command contract) — not read.
- §9 (project mutation, commit evidence, recovery) — not read.
- §10 (bridge, activation, rollback) — not read.
- §11 (schema transition and threat boundary) — not read.
- §12.1/§12.2 — scanned mechanically for KILL-03 literal path lines only, not read as a contract.
- §14 T-section (`T-AUTH` onward) — not read.
- §16's `L0`–`L4` level definitions above the runner list — not read.

Both findings are in material I did read. The unread body is the same one eight prior rounds probed without
finding an executable defect, but this receipt is not coverage of it and a red team should not treat it as such.

---

## 8. What would close this round

1. **BLOCKER-1.** Replace the `R-FLOW` / §8.1-bullet-2 control with a prompt that satisfies §4.2's marker rule
   *and* stays `pure_framework_meta` — `route-guard 在 luca app 工程里怎么走`, empirically verified above to
   emit `STOP` via the gate's null arm. `项目` is not usable (it forces `NEEDS_CONTEXT` before the gate). Then
   reconcile §4.2's `打开 luca app` and `继续 luca app 的登录流程` fixtures with lines 516–517/542 so one input
   has one defined outcome — either the marker gates candidacy (and those fixtures change) or it does not (and
   the "iff"/"requires" sentences change). Keep the `route-guard 在 muse 里怎么走` negative control as is.
2. **MAJOR-1.** Rewrite §14 `R-ALIAS`'s oracle summary to the non-adjudicating contract: drop "direction chooses
   only target", and move bare-open / login-continue / question / quote-example-report / negation from the
   negative list to the candidate-producing list, leaving `typo → alias_not_found` as the sole negative — the
   same correction `R-SIGNAL` already carries.
3. Optional: name §4.2's cap fixture "the cap+1 (ninth) candidate" (MINOR-1), and split §8.1's "measured at
   `BASELINE_HEAD`" sentence so the candidate clause is stated as an implementation requirement (MINOR-2).

Items 1 and 2 are prose edits in already-in-scope sections and touch no mechanism. Any edit computes a new plan
SHA and invalidates this receipt per KILL-01.

<!-- FILE_END: PLAN-AGENT-REVIEW-R30.md -->
