# Plan Agent Gate — Round 29

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
| (1) before reading | `90ccdfa426e397a30b774209c3e3127f831287cd549e32d2ed05dc993613adae` | 5867 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |
| (2) before writing | `90ccdfa426e397a30b774209c3e3127f831287cd549e32d2ed05dc993613adae` | 5867 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |
| (3) after writing | `90ccdfa426e397a30b774209c3e3127f831287cd549e32d2ed05dc993613adae` | 5867 | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `b438c92b1d1dbb28f5252396181f1cb9ab806900` | `ffc658ee1f6770751d2024377c318404dbe5580b` |

All three match the expected tuple. **This round is not stale.** `PLAN-AGENT-REVIEW-R29.md` did not exist
before this write (checked at points 1 and 2).

---

## 2. Verdict

```
NOT_READY_FOR_REDTEAM
1 BLOCKER / 1 MAJOR / 2 MINOR
```

The alignment this revision owed to `b438c92` is **mostly** closed and mostly verified-correct against the
landed bytes (see §6 below — I re-ran the tests rather than reading the plan's word for it). But the one
statement the plan itself designates as *decisive* — that `RESOLVE` never resurrects a Project Gate that
`pure_framework_meta` suppressed — is carried by a worked example that is falsified by the landed hook, and
that same example is the sole control the new `R-FLOW` assertion offers for the corresponding §15 mutant. The
new assertion is therefore red-at-baseline in one configuration and vacuous in the other, and the mutant it is
supposed to catch has no biting control. That is a KILL-08-class defect in a freshly added blocking assertion,
so it must not go to two red teams as-is.

---

## 3. Findings

### BLOCKER-1 — `R-FLOW`'s Project-Gate control is falsified at `BASELINE_HEAD`; §15's matching mutant has no biting control
**Lands in:** §14 `R-FLOW` (line 5024–5027), §15 "`FRAMEWORK FLOW` non-interference" mutant 2 (line 5562), §8.1
"Position relative to the `FRAMEWORK FLOW` layer" bullet 2 (line 3595–3599). All three are in gate scope.

**The claim.** §8.1 bullet 2 and `R-FLOW` both assert, in near-identical words:

> A framework/meta prompt naming a product — `route-guard 在 muse 里怎么走` — yields its ordinary `muse`
> candidate *and* still takes `projectGate`'s null arm [ … ] proving `RESOLVE` did not resurrect the gate that
> `pure_framework_meta` suppressed.

**What the landed code does.** Measured at `BASELINE_HEAD`, before this plan changes a single byte:

```
$ echo '{"prompt":"route-guard 在 muse 里怎么走"}' | ROUTE_GUARD_DRY_RUN=1 \
    ROUTE_GUARD_PROJECTS='muse,crm' ROUTE_GUARD_CURRENT_PROJECT='' node .claude/hooks/route-guard.mjs
{ "decision": "PROJECT_SWITCH", "projectAction": "switch_existing_project", "project": "muse", … }

  … same with ROUTE_GUARD_CURRENT_PROJECT=crm  → PROJECT_SWITCH / switch_existing_project / muse
  … same with ROUTE_GUARD_CURRENT_PROJECT=muse → STOP / no_keyword_match
```

Two independent things are wrong, and they fail in opposite directions so no configuration rescues the control:

1. **The prompt is never `pure_framework_meta`.** `classifyRoutingScope` (route-guard.mjs:254–263) tests
   `namedProject` *first*: `muse` is a real project directory, `nameMatchesIn` finds it, and the function
   returns `{kind:'named_downstream'}` and returns before the `pure_framework_meta` arm is reachable. The
   premise "the gate that `pure_framework_meta` suppressed" is therefore never instantiated by this string.
2. **The gate does not take its null arm.** `projectGate`'s `named && normalize(named) !== normalize(currentProject)`
   branch (route-guard.mjs:334–341) fires first and returns `PROJECT_SWITCH`, and its own comment says exactly
   why: *"explicit downstream identity 永远先于 meta/content 豁免"*, citing red line `SC-20260523-002`. So with
   any current project other than `muse`, the assertion clause is **red at baseline** — red before implementation
   begins, which makes it a non-detector rather than a regression floor. Confirmed generic, not muse-specific:
   `route-guard 在 crm 里怎么走` → `PROJECT_SWITCH/crm`.

**Why either reading is unacceptable.**
- *Read as a description of the baseline*: it is false, and §3's PASS list freezes that false reading into
  `L0-PREFLIGHT-RECEIPT.json` as the record `R-FLOW` and §15 are checked against.
- *Read as a requirement on the implementation*: satisfying it means making a canonical-project-naming
  framework prompt stop gating. That violates red line `SC-20260523-002`, contradicts §4.1/§8.1's own
  treatment of canonical directory IDs, and would turn red the very 119-check floor `R-FLOW` pins (the
  `u003-*-project` scope-matrix fixtures and `u003-reality-named-active`). §8.1 simultaneously requires
  `classifyRoutingScope`/`projectGate` to stay "behaviourally untouched", so the plan asks for two
  incompatible things.
- *Read charitably, in the only configuration where the gate does return null* (current project already
  `muse`): the null arm is reached through the `named === currentProject` fall-through, a completely unrelated
  code path. The control then passes **without ever exercising `pure_framework_meta`** — i.e. it is an
  assertion that cannot turn red for the property it names. This is precisely the failure mode the round was
  asked to hunt.

**Consequence for §15.** The named mutant *"let a candidate make `projectGate` return non-null under
`pure_framework_meta`, resurrecting the gate that scope suppresses"* has this string as its only designated
control. Because the string is classified `named_downstream`, the mutant would not change its outcome and the
test would **not** turn red. `R-FLOW`'s other controls do not cover the gap either: the six framework-flow
cases carry no product-name candidate, and the signal+flow co-occurrence control likewise names no product, so
a candidate-driven gate mutation is invisible to all of them. A required mutant with no biting control is
KILL-08's stated failure condition.

**A correct control exists and is cheap.** The property needs a prompt that is genuinely `pure_framework_meta`
*and* carries an `alias_resolution` candidate — i.e. a **metadata alias**, not a canonical directory ID, since
a canonical ID is by construction the case that must gate. Measured:

```
$ echo '{"prompt":"route-guard 在 luca app 里怎么走"}' | … ROUTE_GUARD_CURRENT_PROJECT='' node .claude/hooks/route-guard.mjs
{ "decision": "STOP", "reason": "no_keyword_match", … }        ← gate null arm, scope pure_framework_meta
```

`luca app` is not a real directory, so `nameMatchesIn` misses it, the scope stays `pure_framework_meta`, the
gate takes its null arm — and §4.2's `RESOLVE` still records the `muse` candidate. That string exercises the
property, bites the mutant, and is also the exact E1 alias this plan exists to bind. Swapping the example in
§8.1, §14 and (implicitly) §15 would close this finding.

---

### MAJOR-1 — §8.1's "returns null **whenever** `routingScope.kind === 'pure_framework_meta'`" is a false universal, and §3 freezes it
**Lands in:** §8.1 line 3584–3585; propagated into §3's PASS list at line 459–461 as the frozen `buildDecision`
layer order annotation `projectGate (null under pure_framework_meta)`. Both in gate scope.

`projectGate` evaluates `explicitNewProjectName` (route-guard.mjs:313–329) **before** the
`pure_framework_meta` early return at line 345. A prompt can be classified `pure_framework_meta` and still get
a non-null gate. Measured counterexamples at `BASELINE_HEAD`:

```
$ echo '{"prompt":"new project: route-guard"}' | … ROUTE_GUARD_CURRENT_PROJECT='' node .claude/hooks/route-guard.mjs
{ "decision": "PROJECT_SWITCH", "projectAction": "create_new_project", "operation": "new", "project": "route-guard", … }

$ echo '{"prompt":"new project: hooks"}'       | …
{ "decision": "PROJECT_SWITCH", "projectAction": "create_new_project", "operation": "new", "project": "hooks", … }
```

Both are `pure_framework_meta` by construction: `route-guard` matches `FRAMEWORK_SCOPE_RULES.runtime-guards`
(`hooks` matches `framework-meta`), and the residual after `stripScopeRules` (`"new project: "`) matches no
`DOWNSTREAM_SCOPE_RULES` entry — the downstream `project` rule is the CJK `项目`, not the Latin word. That the
gate returns non-null is proof the scope was not `mixed_ambiguous` (which short-circuits to `NEEDS_CONTEXT`
before the gate) and not `ordinary` (framework signals are non-empty).

This is separately reportable from BLOCKER-1 because it is the *premise* the falsified example was derived
from, and because §3 writes it into the frozen L0 receipt. An implementer building fixtures on "pure_framework_meta
⇒ gate null" will build them miscalibrated. The correct statement is narrower: *`projectGate` returns null
under `pure_framework_meta` only after the greeting, explicit-new-project-declaration and named-project
branches have all missed.*

---

### MINOR-1 — §16 over-states what `check-routing-map.mjs` pins
**Lands in:** §16 line 5827–5828 (and the same wording in §8.1 line 3615, §3 line 459).

§16 says the runner "pins the `framework_flows:` section, the `framework-evolution` invoke, **its**
`scope: framework_meta`, and the six-item TL;DR". The first, second and fourth are accurate (verified below).
The third is an unanchored whole-file match:

```js
assert.match(content, /scope:\s+"?framework_meta"?/, 'framework-evolution must stay framework_meta-scoped');
```

Any `scope: framework_meta` anywhere in `skill-routing-map.yaml` satisfies it — it is not bound to the
`framework_evolution` entry. Deleting `scope` from that entry while some other entry carried the same scope
would pass. The plan may keep the runner in its union, but should not describe it as pinning *that entry's*
scope. Non-blocking; noted so a red team does not spend a round re-deriving it.

### MINOR-2 — §13 step 1's preservation list is inconsistent with §12.3 on the R28 receipts
**Lands in:** §13 step 1. §13 is in gate scope, though the content is a round-number receipt list — the class
§17.0 narrows out — so this is MINOR only and does not block.

§12.3 names `PLAN-AGENT-REVIEW-R28.md` and `REDTEAM-ROUND-28-ROUTING.md` as immutable prior inputs, and both
exist untracked on disk. §13 step 1's "preserve … as immutable evidence" enumeration stops at
`REDTEAM-ROUND-27-TRANSACTION.md` and omits both R28 files. One list should be made to follow the other.

---

## 4. Observations (not findings; do not block)

- §0.3's ancestry list contains `c146cb70fa8ae95159d31763d57613194b74d68d` twice and places
  `b438c92…` mid-list rather than as the terminal child. Out of scope per §17.0 (literal hash values inside the
  baseline tuple). Reported only so it is not mistaken for an undiscovered defect.
- §13 step 2 — "`A0` … whose parent is exactly the `BASELINE_HEAD` commit …, whose tree is the `BASELINE_TREE`
  defined there" — has an ambiguous antecedent. Since `A0` stages the still-absent R29 outputs, its tree cannot
  equal `BASELINE_TREE`; the sentence is only coherent under the reading that the *parent's* tree is
  `BASELINE_TREE`, which the continuation ("with the complete §0.3 ancestry above `PRIOR_BASELINE_COMMIT`")
  supports. Defensible as written; flagged for disambiguation, not as a defect.

---

## 5. KILL-02 and KILL-03 verification

**KILL-02 — HELD.** Verified from git at all three self-check points, `HEAD` and `@{u}` pinned independently:
both `b438c92b1d1dbb28f5252396181f1cb9ab806900`, tree `ffc658ee1f6770751d2024377c318404dbe5580b`, exactly the
§0.3 `BASELINE_HEAD`/`BASELINE_UPSTREAM`/`BASELINE_TREE`. Neither ref moved during the review. No candidate
object from the `A0→B1→B2→V1→C1` chain exists yet, as expected at `PROPOSED_ONLY`.

**KILL-03 — HELD.** Method: extracted every bare path line from the §12.1 and §12.2 fenced lists
(`awk '/^### 12.1/,/^### 12.3/'` + bare-path filter) → 147 distinct literal envelope lines; intersected against
the complete dirty set from `git status --porcelain` (tracked modifications **and** untracked entries).
**Intersection is empty.** Per-path confirmation with `grep -nx` (exact whole-line match) on each dirty path:

| dirty path | state | bare envelope lines in §12.1/§12.2 |
|---|---|---|
| `.claude/observability/rules.yaml` | M | 0 — occurs only as the tail of two nested `payload/…` entries and as the §10.1 live policy path |
| `.claude/observability/observations.jsonl` | M | 0 |
| `memory/evals/routing/fixtures.jsonl` | M | 0 |
| `framework-audit/…/FINAL-EXECUTION-PLAN.md` | M | 0 (audit path; this round's own bytes) |
| `.playwright-cli/` | ?? | 0 |
| the 18 untracked `PLAN-AGENT-REVIEW-*` / `REDTEAM-ROUND-*` / `NEXT-SESSION-GOAL.md` | ?? | 0 (audit paths) |

Envelope members that *are* bare lines and could have fired KILL-03 — `.gitignore`,
`.claude/hooks/post-edit.mjs`, `.claude/hooks/route-guard.mjs`, `CLAUDE.md`, `AGENTS.md`,
`scripts/test-route-guard.mjs`, `scripts/test-project-scope-guard.mjs` — are all clean.

The §0.3 reclassification of `.claude/skill-os/skill-routing-map.yaml` as a **non-member** is consistent with
the plan's own literal-line rule: `grep -nx '.claude/skill-os/skill-routing-map.yaml'` over the whole document
returns 0 hits; it appears only as the tail of the two nested `payload/…` release entries. Correct as revised.

---

## 6. What I verified as *correct* about the `b438c92` alignment

Run against landed bytes, not read off the plan. These need not be re-derived by the red teams.

- `node scripts/test-route-guard.mjs` → **`PASS=119 FAIL=0`, exit 0.** Matches §3, §8.1 and §16.
- `node scripts/check-routing-map.mjs` → **PASS, exit 0.** It does assert `framework_flows:`,
  `invoke: "framework-evolution"`, and the shared TL;DR items including the new `Framework flow before skills`
  and renumbered `Ambiguity next`. §16's "six-item TL;DR shared verbatim by `CLAUDE.md` and `AGENTS.md`" is
  accurate — the runner's own comment confirms items 1–6 are shared and item 7 (Scene) is deliberately
  CLAUDE-only. (See MINOR-1 for the one over-stated clause.)
- **Six** named framework-flow cases exist in the `cases[]` array (3 positive, 3 counter-guarantee) plus one
  separate live hint-surface fixture. Matches §3/§8.1/§16's "six … plus the live hint-surface fixture".
- The recorded `buildDecision` layer order in §3 and §8.1 is otherwise **accurate** against the code:
  `classifyRoutingScope` → `mixed_ambiguous`⇒`NEEDS_CONTEXT` → `projectGate` → leading `^[$/][a-z][\w-]*`
  direct call bypassing the complexity gate → `PLAN_MODE` → `skillDecision` filtering
  `route.scope !== 'framework_meta' || routingScope.kind === 'pure_framework_meta'` and emitting
  `decision:'FRAMEWORK_FLOW'` only for a **unique** `type:'framework_flow'` candidate → HEAVY⇒`PLAN_CHECK`.
  §8.1 correctly states the unique-candidate condition (a co-occurring second candidate yields `MULTI_SKILL`).
  The only defect in the recorded order is the `projectGate` annotation — MAJOR-1.
- `R-FLOW`'s signal+flow co-occurrence control is **achievable**, so that clause is falsifiable rather than
  vacuous. Measured: `优化设置的层级，跑 framework-evolution-scout` → `FRAMEWORK_FLOW/framework-evolution/scout`;
  `重构 luca_gstack 自我演进流程的设置界面层级` (three §5.1 legs: 重构 / 设置·界面 / 层级) → likewise
  `FRAMEWORK_FLOW`. Note the structure leg must avoid `功能堆砌`, whose `功能` trips
  `DOWNSTREAM_SCOPE_RULES.product` and forces `mixed_ambiguous`; worth pinning in the fixture.
- §4.2's `RESOLVE` deletion of the negation/quoting grammar, §5.1's non-scoring signal + `negation_context`,
  and §5.2's LLM-confirmation gate (`SIGNAL_UNCONFIRMED` before obligation creation — the R27 BLOCKER) read as
  closed in these bytes.

---

## 7. Coverage — what I read and what I did not reach

**Read in full:** §0 (incl. §0.3 kill conditions), §1, §3, §4.1, §4.2, §5.1, §5.2 (opening + obligation
schema), §6.1, §6.2, §6.3, §7.1, §7.2, §8.1, §8.2, §8.3, §8.4, §8.6, §9.1, §9.2, §9.3, §9.4, §11, §12.1, §12.2,
§12.3, §13, §14 R-section (`R-ALIAS`, `R-SIGNAL`, `R-FLOW`, `R-OBLIGATION`), §15 (all mutant paragraphs and the
fault-injection block), §16, §17.0 and §17's handshake paragraph. Plus the §2.15–2.17 rows covering `b438c92`
(read for context only, not litigated).

**Not reached in full — declared honestly:**
- §5.3 "Route receipt and mechanical gates" (lines 816–2512, ~1700 lines) — sampled only where §6/§8 import
  from it (`transfer_invocation_kind` input table, the 22-verb manifest, the transfer journal arms).
- §5.4 "Raw-byte projection and task preservation" (lines 2512–2975) — not read.
- §8.5 "Route-obligation precedence" (lines 3826–3958) — read only its opening paragraph.
- §10 "Generation-fenced bridge, activation and rollback" (lines 4256–4585) — read only §10.1's opening;
  §10.2/§10.3 not read.
- §14 T-section "identity, state and transactions" (lines 5211–5400) — not read.
- the tail of §14 `R-OBLIGATION`.

I found no defect in the sections I did read other than those listed in §3. The unread material is the same
body that eight consecutive prior rounds probed without finding an executable defect, but I make no claim about
it and a red team should not treat this receipt as coverage of it.

---

## 8. What would close this round

1. Replace the `route-guard 在 muse 里怎么走` example in **§8.1 bullet 2** and in **§14 `R-FLOW`** with a
   metadata-alias prompt that is genuinely `pure_framework_meta` and genuinely carries a candidate — e.g.
   `route-guard 在 luca app 里怎么走`, empirically verified above to take the gate's null arm. Optionally keep
   the canonical-ID string as an explicit **positive** control asserting that naming `muse` *does* gate, which
   is the SC-20260523-002 behaviour the plan must preserve.
2. Narrow **§8.1**'s `projectGate` universal (and the matching **§3** frozen-layer-order annotation) to state
   that the `pure_framework_meta` null arm is reached only after the greeting, explicit-new-project-declaration
   and named-project branches miss.
3. Optional: soften §16/§8.1/§3's description of `check-routing-map.mjs`'s scope assertion (MINOR-1), and
   reconcile §13 step 1 with §12.3 on the R28 receipts (MINOR-2).

Items 1 and 2 are single-site edits in already-in-scope prose and do not touch any mechanism. Any edit computes
a new plan SHA and invalidates this receipt per KILL-01.

<!-- FILE_END: PLAN-AGENT-REVIEW-R29.md -->
