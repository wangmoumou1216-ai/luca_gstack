# Plan Agent Review — Round 23 (R23)

## Receipt

**Review mode**: independent Plan Agent gate review, read-only except for this one deliverable file. No git
mutation, no switch/bind of any downstream project. Working directory:
`/Users/luca/Desktop/项目/muse/lucagstack`.

**Plan under review**: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`

| Checkpoint | Expected SHA-256 | Actual SHA-256 | Match | Expected lines | Actual lines | Match |
|---|---|---|---|---|---|---|
| 1 — before reading | `f50775b9bc2c925aa1e95133f66c440caf8250ad2ef09834143efd7aa5f1980e` | `f50775b9bc2c925aa1e95133f66c440caf8250ad2ef09834143efd7aa5f1980e` | YES | 5606 | 5606 | YES |
| 2 — immediately before writing this report | same | `f50775b9bc2c925aa1e95133f66c440caf8250ad2ef09834143efd7aa5f1980e` | YES | 5606 | 5606 | YES |
| 3 — immediately after writing this report | same | `f50775b9bc2c925aa1e95133f66c440caf8250ad2ef09834143efd7aa5f1980e` | YES | 5606 | 5606 | YES |

No drift at any checkpoint. Plan bytes are stable across the entire review.

**Framework ref baseline** (`git -C /Users/luca/Desktop/项目/muse/lucagstack ...` used for every call):

| Checkpoint | Expected HEAD | Actual HEAD | Expected upstream | Actual upstream | Expected tree | Actual tree | Ahead/behind |
|---|---|---|---|---|---|---|---|
| 1 — before reading | `c146cb70fa8ae95159d31763d57613194b74d68d` | same | `c146cb70fa8ae95159d31763d57613194b74d68d` | same | `f15777109b3f524ab0a87888ba74ee4f825a8066` | same | 0/0 |
| 2 — before writing | same | same | same | same | same | same | 0/0 |
| 3 — after writing | same | same | same | same | same | same | 0/0 |

Working tree carries the expected pre-existing modifications only (`.claude/observability/observations.jsonl`,
`.claude/observability/rules.yaml`, `FINAL-EXECUTION-PLAN.md` itself, `memory/evals/routing/fixtures.jsonl`) plus
the untracked prior-round receipts `PLAN-AGENT-REVIEW-R19.md` through `R22.md` — none of these are inputs whose
absence/presence this gate depends on for HEAD/upstream/tree identity.

**Downstream**: expected `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`. Attempted
`git -C /Users/luca/Desktop/项目/muse rev-parse HEAD` and it was refused verbatim by a project-scope guard:

```
Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse）；禁止 no-pin/跨项目/失效 identity 访问。
```

Marked `UNVERIFIABLE_FROM_THIS_SESSION`. Not routed around. Judged on the merits: §0.3's declared downstream
value is internally consistent with every other reference to it in the plan (see Independent re-derivation
below), and this is unchanged from prior rounds' same disposition.

**Input file hashes** (all recomputed with `shasum -a 256`):

| File | Expected SHA-256 | Actual | Match |
|---|---|---|---|
| `PLAN-AGENT-REVIEW-R22.md` | `82b5f1508c30cb1060e22519d2429eca477ea98639afc7679dbf07ce692888c7` | same | YES |
| `PLAN-AGENT-REVIEW-R21.md` | `2ada065a506af92a8705edd44c7eae263ced105fec100d5f0666fa9b343ba77a` | same | YES |
| `PLAN-AGENT-REVIEW-R20.md` | `a27d0d76f05def9af2776e1f2276004fdda5e94ba94936bffed48c0924803534` | same | YES |
| `PLAN-AGENT-REVIEW-R19.md` | `1f9cdad61698491cd3e90b329802b625e3e711aec68f26d2f743f9cc84c56e6f` | same | YES |
| `REDTEAM-ROUND-18-ROUTING.md` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | same | YES |
| `PLAN-AGENT-REVIEW-R16.md` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | same | YES |
| `.claude/agents/plan-agent.md` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | same | YES |
| `.claude/agents/orchestrator.md` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | same | YES |
| `PAYLOAD-CENSUS.md` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | same | YES |
| `TRANSCRIPT-AUTH-EVIDENCE.md` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | same | YES |

All ten input files hash-verified with zero drift.

**Byte 0 → EOF statement**: `FINAL-EXECUTION-PLAN.md` was read sequentially in overlapping `sed -n` chunks
covering every line from 1 to 5606 with no gap: 1–110, 110–200, 200–378 (with an internal full-print
cross-check at 340–370), 378–437, 437–518, 518–700, 695–900, 900–1200, 1200–1350, 1350–1500, 1500–1700,
1700–1946, 1946–2080, 2080–2185, 2185–2382, 2382–2600, 2600–2845, 2845–3133, 3133–3325, 3325–3554, 3554–3661,
3661–3792, 3790–3861, 3861–4088, 4088–4300, 4300–4434, 4434–4624, 4624–4707, 4707–4786, 4786–5000, 5000–5179,
5179–5439, 5439–5606 (EOF). Every chunk boundary was verified contiguous or overlapping; two initial gaps
(1350–1500 and 420–437) were caught by boundary re-verification and explicitly re-read before this report was
written. No line was skipped or sampled.

**Evidence-drift statement**: none. Every plan-hash check, every ref check and every input-file hash matched
its expected value at every checkpoint. No STALE condition fired.

**R23 output files**: `PLAN-AGENT-REVIEW-R23.md`, `REDTEAM-ROUND-23-ROUTING.md`, `REDTEAM-ROUND-23-TRANSACTION.md`
were confirmed absent before this review began (initial `ls` and explicit per-file existence check) and
`REDTEAM-ROUND-23-ROUTING.md`/`REDTEAM-ROUND-23-TRANSACTION.md` were confirmed still absent immediately before
this report was written (this file did not exist yet either, at that point, by construction).

## Verdict

`NOT_READY_FOR_REDTEAM`
- BLOCKER: 0
- MAJOR: 2
- MINOR: 0

## Structural repair verification

R22's MAJOR ("§13 step 2 restated a stale `BASELINE_HEAD`/`BASELINE_TREE` pair two commits behind §0.3") is
claimed fixed **structurally**: §0.3 declares itself the sole definition site for five names —
`BASELINE_HEAD`, `BASELINE_UPSTREAM`, `BASELINE_TREE`, `PRIOR_BASELINE_COMMIT`, `PRIOR_BASELINE_TREE` — and
states a literal 40-hex value of any of those five is legal only inside its own tuple/ancestry-list block.

I independently enumerated every 40-hex-character token in the document (`grep -noE '[0-9a-f]{40}'`), then
filtered out two false positives that are actually 64-hex SHA-256 tokens whose first 40 characters my pattern
matched as a substring (line 22, the screenshot SHA-256; line 357, the Round-17 plan SHA-256 — confirmed via
`grep -noE '[0-9a-f]{64}'`, which returns exactly those two lines and nothing else). The remaining genuine
40-hex (git-object-shaped) literals, with per-value total occurrence counts across the whole 5606-line file:

| Value (first 12 hex) | Role | Lines | Count | Inside §0.3 tuple/ancestry (73–100)? |
|---|---|---|---|---|
| `69f1a947ca81…` | downstream ref (its own declared separate definition site) | 69, 4747 | 2 | N/A — exempt by name |
| `c146cb70fa8a…` | `BASELINE_HEAD`=`BASELINE_UPSTREAM` | 73, 87 | 2 | YES (87 is the ancestry list's own last hop = current HEAD) |
| `f15777109b3f…` | `BASELINE_TREE` | 74 | 1 | YES |
| `8e9726d8477f…` | `PRIOR_BASELINE_COMMIT` | 76 | 1 | YES |
| `fe67c639838340…` | `PRIOR_BASELINE_TREE` | 77 | 1 | YES |
| `c0a2efe7bfc7…` … `473a625790ca…` (14 ancestry hops) | intervening ancestry | 79–87 | 1 each | YES |
| `b534aa6eabae…` | envelope blob: `.claude/hooks/post-edit.mjs` | 94 | 1 | YES (own definition site) |
| `40d23300976e…` | envelope blob: `.gitignore` | 95 | 1 | YES |
| `2d056cd674dd…` | envelope blob: `scripts/test-project-scope-guard.mjs` | 96 | 1 | YES |
| `e6a9a7a847e6…` | non-envelope evidence: `.claude/observability/rules.yaml` runtime-parity snapshot | 98 | 1 | YES |
| `f4719bd33599…` | non-envelope evidence: `scripts/test-auto-open.mjs` | 100 | 1 | YES |

**Result: zero exceptions.** Every one of the five baseline names' literal values occurs *only* inside lines
73–87 (the §0.3 tuple plus the ancestry list it contains, per the rule's own carve-out for that list). None of
the five names' literal 40-hex values appears anywhere else in the document — not in §3, not in §13, not in any
§2.15–2.17 row, not in any rollback ancestry. I explicitly grepped §3 (lines 378–437) and §13 (lines 4707–4786)
for any of the five literal values and found none; both refer to the baseline by name only
(`BASELINE_HEAD`/`BASELINE_TREE`/`PRIOR_BASELINE_COMMIT` as bare identifiers, never as inline hex). The
downstream ref, the three envelope blob hashes and the rules.yaml/test-auto-open evidence hashes each occur
exactly once (or, for the downstream ref, twice at its two declared/consuming sites), consistent with the
plan's claim that these are exempt from the single-site rule because they have their own separate definition
sites. **This is a genuine, complete fix — the fourth-consecutive-round stale-baseline-literal class does not
survive into these bytes.**

However, see Finding 2 below: while no *literal hex value* leaks, §3's own prose describing what
`L0-PREFLIGHT-RECEIPT.json` freezes uses a *name* — `BASELINE_COMMIT` — that is not one of the five canonical
names §0.3 declares. This is a different (name-level, not value-level) instance of the same drift family, and it
survived R22's own "no drift risk there" sign-off on this exact sentence.

## Prior-round closure

- **R19** (2 MAJOR: self-invalidating clean-worktree claim; `scripts/test-auto-open.mjs` misclassified as
  envelope member): Closed. §0.3 makes no worktree-cleanliness claim anywhere (confirmed by reading §2.17's
  "Worktree state" row, lines ~377, which explicitly states "this plan states **no** count, list or snapshot of
  the repository's momentary worktree contents anywhere"). `scripts/test-auto-open.mjs` is listed at line 100 as
  one of the nine non-envelope paths, explicitly with its hash as "non-authorizing evidence," and my §12.1/§12.2
  bare-line grep (below, Independent re-derivation) confirms it has zero bare-line occurrences in either
  envelope list.
- **R20** (3 MAJOR / 3 MINOR: `.claude/observability/rules.yaml` misclassified as envelope member — same class
  as R19's; `A0` staging named the previous round; §5.1 object-first negation missed `结构别改`): Closed.
  `rules.yaml`'s hash at line 98 is explicitly annotated "it occurs only inside the two nested `payload/...`
  release entries and as the §10.1 live policy path, never as a bare envelope line" — confirmed by my grep
  (zero bare-line matches, two nested matches, in Independent re-derivation below). §5.1's negation grammar now
  reads `结构×NEG×(改|动|调整|变)` (object-first) covering all four verbs `改|动|调整|变`, so `结构别改` is
  now in the closed generated set (I confirm this text at line 528). The "A0 staging named the previous round"
  defect is the *same defect class* that has now recurred a level up — see Finding 1.
- **R21** (2 MAJOR / 2 MINOR: §2.17 still asserted a momentary worktree fact — third round running; §4.2's
  negator set omitted bare `不`): Closed and stayed closed. §2.17's "Worktree state" row (confirmed read) makes
  the KILL-03 predicate itself the only worktree proposition and explicitly states no count/list/snapshot claim
  is made anywhere — I re-scanned the whole document for any other momentary-worktree-state assertion and found
  none. §4.2 defines `NEG = 不|不是|不要|别|不用|无需|不必` (7 members including bare `不`) once, and both the
  required-examples list (`不进入 luca app 项目` → no selection) and §5.1's "same identical seven-member
  alternation §4.2 defines" language confirm the shared-alternation property holds by construction, not
  assertion.
- **R22** (1 MAJOR / 1 MINOR: §13 step 2 restated a stale `BASELINE_HEAD`/`BASELINE_TREE` pair two commits
  behind §0.3; closure-map rows out of chronological order): The stale-literal MAJOR is closed — see Structural
  repair verification above (§13 step 2, lines 4718–4720, now reads "whose parent is exactly the
  `BASELINE_HEAD` commit defined in §0.3, whose tree is the `BASELINE_TREE` defined there," zero literal hex).
  The chronological-order MINOR appears closed: §2.17's rows now read Round-18 / MAJOR-1 / MAJOR-2 / "Why
  Round-18 did not complete" / Round-19 gate / Round-20 gate / Round-21 gate / Closure / Convergence condition /
  2026-08-24 batch conflict review / Relationship / Worktree state — a coherent chronological order. **But R22's
  own gate outcome was never itself recorded anywhere in this document** — no "Round-22 gate" row was added to
  §2.17 alongside the Round-19/20/21 rows, and the §12.3/§13/§0.3/status-line round pointers were never bumped
  past R22. This is the substance of Finding 1.

## Mechanical re-test

**R16 B1** (ref-baseline drift): re-derived above under Structural repair verification — the baseline tuple is
frozen by commit-ref identity, freshly re-verified against real git objects (HEAD=upstream=`c146cb7…`,
tree=`f157771…`, 0 ahead/0 behind), holds.

**R16 B2** (transfer recovery total product), lines `2085–2178` (`transfer_invocation_kind` six-kind/seven-predicate
table plus the `recovery_capability_or_null`×`owner_census` outcome table): four counterexamples re-derived
by hand against those two tables.

- **(a)** nonterminal journal, no scan, proven-dead controller, fresh E1 attested, then the exact
  `plan-transfer recover` PreTool with no pending candidate. Step 1: predicate 3 fires (`transfer_scan` absent,
  new group attested) → `NEWLY_ATTESTED_EVENT`, event-bearing, reaches the outcome table with
  `recovery_capability_or_null=null` and `owner_census=PROVEN_DEAD` → row `PROVEN_DEAD_RECOVERY_ISSUED`: issues
  one capability at `recovery_sequence+1` bound to E1's event/boundary, denies the attempted controller/Stop.
  Step 2: same turn (no new UserPromptSubmit), `transfer_scan` absent, no new group → falls to predicate 4;
  since the just-issued capability's `authority_id`/`actor_session_id`/`actor_event`/`actor_boundary` equal both
  the journal's current ISSUED capability and `prompt_gate.current_event`/boundary (both = E1, set by step 1's
  rename), predicate 4(a) fires uniquely → `NO_NEW_EVENT_RECOVER_CONTROLLER`, consumes the capability, publishes
  the fresh RECOVERY owner, performs only its `next_step`. **Unique conforming transition confirmed, no
  ambiguity.**
- **(b)** the same at ordinary count 256 with a one-item scan, then a retry with no new UserPromptSubmit.
  Predicate 1 fires (`transfer_scan` present, `consumed_count(0) < submitted_count(1)`, group visible) →
  `SCAN_DRAIN_EVENT`, appends one event, drains the sole item so `consumed_count==submitted_count`, removing the
  scan object; at count 256 this also installs `TRANSFER_SECURITY_LANE_ONLY`/FULL posture as a side effect
  (line ~2168, "FULL additionally installs only TRANSFER_SECURITY_LANE rotation posture") without changing which
  kind fired. Retry, `transfer_scan` now absent, no new UserPromptSubmit: if the retried action is not
  specifically `plan-transfer recover`/Stop/committed-target-cleanup, none of predicates 4–6 match →
  predicate 7, `NO_NEW_EVENT_DENY`, byte-preserving denial. FULL/AVAILABLE ledger-admission only gates
  event-bearing kinds' capacity, not this no-new-event kind, so it does not disturb predicate 7's match.
  **Unique, no ambiguity.**
- **(c)** ISSUED E1 capability when fresh E2 is attested before controller consumption. Predicate 3 fires again
  for E2 → `NEWLY_ATTESTED_EVENT`, event-bearing, outcome table with `recovery_capability_or_null=ISSUED` whose
  `dead_owner_sha256` (recorded at issuance) still equals the recomputed `controller_owner.owner_sha256` (nothing
  changed the underlying dead-owner fact between E1 and E2) → row `STALE_CAPABILITY_ROTATED`: invalidates the
  E1-bound capability (permanently unconsumable per line ~2145, "a rotated or replaced `capability_id` can never
  be consumed afterwards") and issues a replacement at a strictly higher `recovery_sequence` bound to E2, with
  the persisted controller bytes rebound to the replacement `authority_id`. **Exactly the mechanism R16's
  closure claims, unique, no ambiguity.**
- **(d)** IN_PROGRESS RECOVERY owner that has crashed, on fresh E2. A crashed process is detected dead by the
  frozen `/bin/ps`+`/usr/sbin/sysctl` liveness oracle (§7.2/§10.2), so `owner_census=PROVEN_DEAD` for the
  `CONSUMED` capability arm ("whose consume rename bound the fresh RECOVERY `controller_owner`") → row
  `PROVEN_DEAD_RECOVERY_ISSUED` under the `CONSUMED` family: "replace the consumed object with a fresh capability
  at a strictly higher `recovery_sequence` bound to the current event/boundary/actor" (E2). **Unique, no
  ambiguity.**

All four counterexamples resolve to exactly one row each with no default fallthrough and no double-match. One
subtlety noted but not counted as a finding: the outcome-table row "`ISSUED` whose `dead_owner_sha256` differs
from the recomputed `controller_owner.owner_sha256`" (line 2138) places its `STATE_TRANSITION_INVALID`/"byte-
preserving deny" verdict in the *Capability effect* column and "no event is appended" in the *outcome* column —
the reverse of every other row's convention (outcome=PascalCase name, capability effect=prose). The semantic
content is still unambiguous when read as prose (invalid combination → no event, deny), this row is not exercised
by any of the four assigned counterexamples, and it is unchanged from prior rounds (not a fresh regression), so
I record it only as an observation, not a counted finding.

**Both routing grammars**, §4.2 (`FINAL-EXECUTION-PLAN.md:469-515`) and §5.1 (`FINAL-EXECUTION-PLAN.md:518-541`):

- §4.2 adversarial inputs I constructed beyond the plan's own examples: `回到 luca app 项目团队` — the general
  "must be clause-terminal except a bounded polite particle" rule (not merely the enumerated closed set) governs,
  so trailing `团队` (not in the closed set, but present after the marker) still makes the clause non-authorizing;
  no false positive. `我不觉得应该进入 luca app 项目` — `不` is not immediately adjacent to the directive verb
  (intervening `觉得应该`), so by the plan's explicit "immediately preceding... with no intervening token" rule
  this is *not* recognized as negated and *would* authorize a switch to `muse`; this is a known, deliberately
  narrow, pre-existing design scope (not a new regression — the plan never claims to handle non-adjacent negation
  scope) and I do not count it as a defect. `进入 luca app 项目, 然后进入 crm 项目` — two distinct undirected
  targets → `NEEDS_CONTEXT(multiple_project_targets)` per the explicit rule; consistent.
- §5.1 adversarial inputs: `别的地方结构不改` — contains the exact object-first substring `结构不改` (结构+不+改,
  no intervening token) so the negation span is correctly recognized regardless of preceding unrelated `别的`
  text; no false negative. `结构不能改` — not a literal member of the closed generated set (has an intervening
  `能`) so negation is *not* recognized here; again, this is the plan's own explicitly stated scope ("The admitted
  set is exactly this enumeration; no generic negation heuristic... is admitted"), not a new defect. `结构别改，
  颜色也调整一下` — two clauses; "legs cannot aggregate across clauses" per the plan's own rule, so the negated
  structure leg in clause 1 cannot combine with the change leg in clause 2; no false positive. `别改结构` (verb-
  first order, matches `NEG×(改|动|调整|变)×结构`) — recognized. I confirmed the object-first set now covers all
  four verbs `改|动|调整|变` symmetrically (line 528), closing R20's MAJOR-C for good — no counterexample broke it.

§14 `R-SIGNAL` (`FINAL-EXECUTION-PLAN.md:4791-4800`) states the identical both-generated-sets/seven-member-NEG
enumeration as §5.1 and cites the same frozen negative fixtures (`调整设置里的颜色但结构不变`, `别调整设置结构`,
`结构别改`, `帮我优化下设置页面，别动结构，其他随便你改`) — consistent, no drift found between §5.1's definition
and §14's assertion corpus.

## Independent re-derivation

**§0.3 tuple, hop by hop** (`FINAL-EXECUTION-PLAN.md:73-100`):

- `BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70…` / `BASELINE_TREE=f157771…` — matches live `git rev-parse HEAD`,
  `@{u}`, `HEAD^{tree}` exactly (verified three times: before reading, before writing, after writing).
- `PRIOR_BASELINE_COMMIT=8e9726d8…` / `PRIOR_BASELINE_TREE=fe67c639…` — cited unchanged since R16's original
  closure; not independently re-walked commit-by-commit this round (no tooling change bears on it and no round
  since R16 has touched this pair), consistent with every other reference to it in the document.
- Ancestry `c0a2efe7… → c9d4185f… → 8e1c46d5… → 068b9ab4… → 36d3707… → 0e51ec21… → fd0919bb… → a78abb70… →
  11a14c0f… → d0391f55… → b3b6124b… → 31e77999… → 6915b5fc… → 74aae922… → d2b4a4ff… → 2419328… → 473a6257… →
  c146cb70…` (18 hops, ending at the current HEAD) — internally consistent parent-to-child topological order;
  matches the git log entries visible via `git log --oneline` for the tail of this chain (`c146cb7`, `473a625`,
  `2419328` are the three most recent commits, matching `git log --oneline -3` output exactly).
- Delta "78 files, 12 outside `framework-audit/**`" — not independently recomputed via `git diff --stat` this
  round (would require walking the full 18-hop range across two repositories, one of which is
  guard-inaccessible); taken as an unchanged carry-forward from R16-R22, none of which flagged it as wrong.

**Twelve non-audit path membership classification** (re-derived by grepping §12.1/§12.2 bare-line-exact matches,
excluding nested `payload/...` occurrences):

| Path | Bare-line match in §12.1/§12.2? | Classification | Matches §0.3 claim? |
|---|---|---|---|
| `.claude/hooks/post-edit.mjs` | YES (line 29, exactly once; 2 more nested `payload/...` occurrences) | envelope member | YES |
| `.gitignore` | YES (line 46, exactly once) | envelope member | YES |
| `scripts/test-project-scope-guard.mjs` | YES (line 140, exactly once) | envelope member | YES |
| `.claude/observability/rules.yaml` | NO (0 bare-line; 2 nested `payload/...` occurrences only) | not envelope | YES |
| `scripts/test-auto-open.mjs` | NO (0 occurrences anywhere in §12.1/§12.2) | not envelope | YES |
| `.claude/observability/observations.jsonl` | NO | not envelope | YES |
| `memory/episodic/index.jsonl` | NO | not envelope | YES |
| `memory/episodic/archive/2026.jsonl` | NO | not envelope | YES |
| `memory/evals/eval-log.jsonl` | NO | not envelope | YES |
| `memory/evals/routing/fixtures.jsonl` | NO | not envelope | YES |
| `memory/retrieval-log.jsonl` | NO | not envelope | YES |
| `memory/scripts/propose_semantic.py` | NO | not envelope | YES |

All twelve classifications match §0.3's claim exactly: three qualify (each with exactly one bare-line
occurrence), nine do not (zero bare-line occurrences each). No exception found.

## Findings

### Finding 1 — MAJOR: the plan's own round-tracking pointer was never advanced past R22, and a completed
receipt is misdescribed as a not-yet-existing required output

**Contract conflict**: §0.3 itself states (line 112-113) "This phrase always tracks the passing round's number;
a stale round number here is a defect," and the task brief's own "Round-numbering hygiene" item requires that
"the plan's own round references must now read R23." They do not. At least six locations still target R22 as a
future/pending round even though `PLAN-AGENT-REVIEW-R22.md` already exists on disk (29,024 bytes, produced
2026-08-26 09:49, carrying a `NOT_READY_FOR_REDTEAM — 1 MAJOR / 1 MINOR` verdict per the task history):

- Status line, `FINAL-EXECUTION-PLAN.md:5`: "...pending a fresh Plan Agent review and Round-22 dual red team" —
  should read Round-23, and should say every R18–R22 MAJOR/MINOR is closed (it currently says only R18–R21).
- §0.3, `FINAL-EXECUTION-PLAN.md:111`: "the still-absent outputs of the round that actually passed — currently
  the R22 names in §12.3" — targets R22.
- §12.3, `FINAL-EXECUTION-PLAN.md:4672-4674`: lists `PLAN-AGENT-REVIEW-R22.md`, `REDTEAM-ROUND-22-ROUTING.md`,
  `REDTEAM-ROUND-22-TRANSACTION.md` under "exact audit-output paths" (required-new outputs).
- §12.3, `FINAL-EXECUTION-PLAN.md:4700`: "Every other required-new output, including **all R22 names**, must be
  absent until its named gate."
- §13 step 1, `FINAL-EXECUTION-PLAN.md:4715-4717`: "obtain new `PLAN-AGENT-REVIEW-R22.md` with
  READY_FOR_REDTEAM, then two Round-22 PASS reports" — and the preceding immutable-inputs list
  (`FINAL-EXECUTION-PLAN.md:4707-4715`) stops at `PLAN-AGENT-REVIEW-R21.md`, never adding `R22.md`.
  §13 step 2, `FINAL-EXECUTION-PLAN.md:4722-4723`: "the still-absent outputs of the passing round — currently
  the R22 names in §12.3."
- §17, `FINAL-EXECUTION-PLAN.md:5596-5597`: "...READY_FOR_REDTEAM in the cycle-specific R22 receipt and two
  independent Round-22 reviewers report PASS."

**Mechanical counterexample**: §12.3's own classification directly contradicts observable disk state. It labels
`PLAN-AGENT-REVIEW-R22.md` a "required-new output" that "must be absent until its named gate" (line 4700-4702),
while the file already exists, is non-empty, and carries a completed (failed) verdict. Under the plan's own
KILL-04 ("any not-yet-run gate's cycle-specific required-new receipt/post-review path already exists → stop.
Completed failed-cycle receipts are immutable inputs and use different literal names. There is no blanket
audit-directory exemption," §0.3), a literal reading of the current bytes means `PLAN-AGENT-REVIEW-R22.md`
existing right now, while classified as a not-yet-run gate's required-new output, is exactly the KILL-04
trigger condition — the plan's own control-flow logic, read literally, would halt before this review round could
even be dispatched, because it has not been told R22 already happened and produced a name that must instead be
carried in the immutable-prior-inputs list (as R18/R19/R20/R21 all correctly are). §2.17 also never received a
"Round-22 gate" closure-map row analogous to the Round-19/20/21 rows that were added for every prior cycle
(confirmed: I read the whole §2.17 table and no such row exists), and its "Closure"/"Convergence condition" prose
still only narrates advancement "through R19 and R20 to R21," one full round behind current reality.

This is the same defect class R20 caught as MAJOR-B ("the `A0` staging sentences still named the previous
round's outputs") recurring for a second time: the substantive fix that round required (the KILL-02
baseline-literal repair) was made correctly this round, but the parallel round-bump bookkeeping that every prior
cycle performed was not done for the R22→R23 transition.

**Minimum repair**: (1) add `PLAN-AGENT-REVIEW-R22.md` to every "immutable prior inputs"/"cycle-completed"
listing (§12.3's prose paragraph, §13 step 1's preserve-list); (2) change every "R22"/"Round-22" forward-looking
target to "R23"/"Round-23" at all six cited locations, including bumping §12.3's required-new-output block to
name `PLAN-AGENT-REVIEW-R23.md`, `REDTEAM-ROUND-23-ROUTING.md`, `REDTEAM-ROUND-23-TRANSACTION.md`; (3) add a
"Round-22 gate" row to §2.17 stating its actual `NOT_READY_FOR_REDTEAM — 0/1/1` verdict and closure, and update
the "Closure"/"Convergence condition" rows to advance through R22; (4) update the status line to reflect R18–R22
closure and a pending Round-23 dual red team.

### Finding 2 — MAJOR: §3's `L0-PREFLIGHT-RECEIPT.json` description uses a name outside the §0.3 canonical set
and omits the independently-pinned upstream ref

**Contract conflict**: §0.3 (lines 114-116) states its tuple is "the **sole** definition of the framework
baseline. Every other section... refers to `BASELINE_HEAD`, `BASELINE_UPSTREAM`, `BASELINE_TREE`,
`PRIOR_BASELINE_COMMIT` and `PRIOR_BASELINE_TREE` **by name only**." §3 (`FINAL-EXECUTION-PLAN.md:428-431`) reads:

> `L0-PREFLIGHT-RECEIPT.json` freezes the complete §0.3 KILL-02 baseline tuple by commit-ref identity —
> `BASELINE_COMMIT`/`BASELINE_TREE`, `PRIOR_BASELINE_COMMIT`/`PRIOR_BASELINE_TREE`, the parent-to-child
> ancestry, the complete delta with its pinned envelope blobs, and the downstream commit/upstream — read back
> from both repositories at receipt time.

`BASELINE_COMMIT` is not one of the five canonical names. I grepped the entire 5606-line document for every
occurrence of `BASELINE_COMMIT`/`BASELINE_HEAD`/`BASELINE_UPSTREAM`/`BASELINE_TREE`: `BASELINE_COMMIT` occurs
**exactly once**, at this single site, nowhere else in the document — every other of the twelve total
`BASELINE_HEAD` references and both `BASELINE_UPSTREAM` references use the canonical names correctly. This is a
name-level instance of the same drift family that produced R19/R20/R21/R22's MAJORs (value-level in those
cases, name-level here) — and it was already looked at and passed as clean by R22 itself: R22's own
"Remaining consistency scan" (its line 332-334) says "§3's L0-PREFLIGHT-RECEIPT.json requirement (line 419)
correctly cross-references 'the complete §0.3 KILL-02 baseline tuple' without restating a literal value — no
drift risk there," checking only for literal-hex restatement and missing that the *name* itself does not match
the canonical set.

**Mechanical counterexample**: §0.3 states, of `BASELINE_HEAD`/`BASELINE_UPSTREAM`, "The two refs are equal and
are pinned **independently**; either one moving — a new commit, or a push that advances only upstream —
re-fires KILL-02" (line 82-83) — i.e., the receipt is expected to freeze both scalars independently so that
either one's drift is separately detectable. §3's sentence names the framework side only as a single
`BASELINE_COMMIT`/`BASELINE_TREE` pair and never mentions an upstream scalar for the framework side at all —
contrast the same sentence's explicit "downstream **commit/upstream**" phrasing, which correctly names two
independent scalars for the downstream repository. A person implementing `L0-PREFLIGHT-RECEIPT.json` from this
sentence alone could reasonably build a schema with one framework ref field (named `BASELINE_COMMIT`, matching
neither `BASELINE_HEAD` nor `BASELINE_UPSTREAM` verbatim) and omit the independent `BASELINE_UPSTREAM` freeze
that KILL-02's own independence guarantee depends on.

**Minimum repair**: change `BASELINE_COMMIT`/`BASELINE_TREE` to explicitly name `BASELINE_HEAD`,
`BASELINE_UPSTREAM` and `BASELINE_TREE` as three independently-frozen scalars (matching the downstream side's
already-correct "commit/upstream" phrasing), so the L0 receipt's described content unambiguously matches §0.3's
independence requirement.

## Remaining consistency scan

Beyond the two findings above, I re-checked (in addition to the sections named in the task) cross-references
among §0.3, §2.15–2.17, §3, §4.2, §5.1, §5.3, §6.1, §6.2, §7.1, §8.1–§8.6, §9–§11, §12.1–12.3, §13, §14, §15,
§16, §17 and found no further disagreement:

- §5.3's `transfer_invocation_kind`/outcome-table terminology (`TransferJournal`, `ledger_admission`,
  `recovery_sequence`, `STALE_CAPABILITY_ROTATED`, etc.) is used identically everywhere it is referenced in
  §6.1, §6.2, §8.2, §8.6, §14 `R-SIGNAL`/`T-MATRIX`, §15 and §16 — no drift between definition and consumption
  sites.
- §7.1's schema-v3 document shape (`prompt_gate`, `ledger`, `recovery_ledger`, `transfer_security_ledger`,
  `recovery_control`, `project`, `deferred_project_request`, etc.) matches every field name referenced by
  §5.2–§5.4 and §8.1–§8.6.
- §12.1/§12.2/§12.3's file lists remain internally consistent with §0.3's envelope-membership rule (re-derived
  independently above, zero exceptions) and, apart from Finding 1, with the required-new-output naming.
  `REDTEAM-ROUND-19-*`/`20-*`/`21-*` are correctly and consistently stated as "never produced, not required by
  any gate" in both §12.3 and §13; I confirmed none of these six files exist on disk.
- The outcome-table row-formatting oddity noted in "Mechanical re-test" (columns appearing transposed for the
  `ISSUED`-with-differing-`dead_owner_sha256` row) is unchanged from prior rounds, semantically decodable, not
  exercised by the four assigned counterexamples, and not counted as a finding.
- No unreachable table arm, no table that fails to partition its input space, and no cross-referenced section
  disagreement was found beyond Findings 1 and 2.

## Verification

I re-read this report to its own end after writing it and before running the post-write checks below.
Post-write plan hash/line-count re-check and framework HEAD/upstream/tree re-check were both run after this
file was written (see checkpoint 3 rows in the Receipt table above) and both matched with zero drift.
`REDTEAM-ROUND-23-ROUTING.md` and `REDTEAM-ROUND-23-TRANSACTION.md` remained absent at that final check.

## Gate conclusion

Plan SHA-256: `f50775b9bc2c925aa1e95133f66c440caf8250ad2ef09834143efd7aa5f1980e` (5606 lines).
Framework HEAD: `c146cb70fa8ae95159d31763d57613194b74d68d` (= upstream; tree `f15777109b3f524ab0a87888ba74ee4f825a8066`;
0 ahead / 0 behind).

**Verdict: `NOT_READY_FOR_REDTEAM` — BLOCKER: 0, MAJOR: 2, MINOR: 0.**

The plan's transfer/routing mechanics, both routing grammars, the R16 B1/B2 mechanism, and the §0.3
stale-baseline-literal structural repair all re-verified clean under adversarial re-derivation. Both findings
are in the plan's evidentiary self-description (round-number bookkeeping and one cross-reference name), not in
its executable mechanics — continuing the pattern of every round since R19. Both are mechanical, narrowly
scoped, and should be quick to close in the same style as R19–R22's closures.
