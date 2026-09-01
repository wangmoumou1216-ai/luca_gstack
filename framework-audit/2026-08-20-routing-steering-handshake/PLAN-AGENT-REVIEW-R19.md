# Plan Agent Gate Review — Round 19 (R19)

## Receipt

**Review mode:** independent Plan Agent gate review of a framework-recovery execution plan. Working directory
`/Users/luca/Desktop/项目/muse/lucagstack` throughout; no downstream project switched or bound; no file created,
modified, deleted or renamed other than this report.

**Plan path:** `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`

**Plan SHA-256 / line count, three checkpoints:**

| Checkpoint | Expected SHA-256 | Actual SHA-256 | Expected lines | Actual lines |
|---|---|---|---|---|
| 1 — before reading (byte 0) | `100eef99610d2897311b8b9b98006813323f5f7b1c3c14ed2af18ead4de37c03` | `100eef99610d2897311b8b9b98006813323f5f7b1c3c14ed2af18ead4de37c03` | 5,566 | 5,566 |
| 2 — immediately before writing this report | same | `100eef99610d2897311b8b9b98006813323f5f7b1c3c14ed2af18ead4de37c03` | 5,566 | 5,566 |
| 3 — immediately after writing this report | same | see `## Verification` below (re-run and reported in final chat message) | 5,566 | see below |

All three checkpoints match. No plan-SHA drift was observed at any point in this review.

**Framework HEAD / upstream / tree, three checkpoints** (checked with `git -C /Users/luca/Desktop/项目/muse/lucagstack …`, this checkout is the "framework" side referenced by §0.3 KILL-02):

| Checkpoint | Expected | Actual HEAD | Actual `@{u}` | Actual tree | ahead/behind |
|---|---|---|---|---|---|
| 1 — before reading | `2419328798859ea5708db289a2e05702a1189cd4` / tree `938af7cca24fca10087ccc9409e229e136a37f87` | `2419328798859ea5708db289a2e05702a1189cd4` | `2419328798859ea5708db289a2e05702a1189cd4` | `938af7cca24fca10087ccc9409e229e136a37f87` | 0 / 0 |
| 2 — immediately before writing report | same | `2419328798859ea5708db289a2e05702a1189cd4` | `2419328798859ea5708db289a2e05702a1189cd4` | `938af7cca24fca10087ccc9409e229e136a37f87` | 0 / 0 |
| 3 — immediately after writing report | same | see `## Verification` (reported in final chat message) | — | — | — |

No ref movement was observed at any checkpoint. This round is **not stale** by the SHA/ref criteria.

**`git status` of the framework checkout, observed at every checkpoint (unchanged throughout the review):**

```
## main...upstream/main
 M framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
?? framework-audit/2026-08-20-routing-steering-handshake/payload-census/workspace/
```

This is a **worktree dirtiness finding**, addressed in `## Findings` below — it is not ref drift (HEAD/upstream did
not move) and not a plan-content-SHA mismatch (the working file matches the given SHA exactly), so it does not by
itself make the round STALE under this task's stale-criteria; it is a defect in what the plan's own bytes assert
about that state. `git hash-object` of the working file is `a4547398a4abd4ed0c642dc7dd63b6780c7962d4`; the blob
actually committed at `HEAD:framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md` is
`9bf0012960f66728e5473d027cc0425fba00a431` (SHA-256 `c1d26c60f435592ee5f55e532ed0086629fd0dd2aa5a76593a226437496654d2`,
5,557 lines) — 61 diff lines, 35 insertions / 26 deletions, from the reviewed working copy. The untracked
`payload-census/workspace/` directory was independently inspected and found to be exactly the scratch capture
workspace that §12.3 (`FINAL-EXECUTION-PLAN.md:4610-4613`) explicitly excludes from every commit ("the nested
`payload-census/workspace/.git/**` and all other scratch state are excluded from every commit"); it is not itself
a defect.

**Downstream status:** `UNVERIFIABLE_FROM_THIS_SESSION`. `git -C /Users/luca/Desktop/项目/muse rev-parse HEAD`
was refused verbatim by the project-scope guard:

```
Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse）；禁止 no-pin/跨项目/失效 identity 访问。
```

I did not route around this refusal (no alternate path, no `cd`, no re-attempt with a different invocation). The
downstream tuple (`D1` parent expectation `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`) is therefore not
independently re-derived by this round. Judged on the merits: this is a session-capability limitation identical
in kind to what the task brief itself anticipated, not a plan defect, and I do not count it as a finding.

**Input file hashes, expected vs actual (all recomputed independently with `shasum -a 256`):**

| File | Expected SHA-256 | Actual SHA-256 | Match |
|---|---|---|---|
| `PLAN-AGENT-REVIEW-R18.md` | `eb102a9c73a2b8284ec425c38a0fdbc57920b4effb3d6cb5e9a8f578e27689c5` | `eb102a9c73a2b8284ec425c38a0fdbc57920b4effb3d6cb5e9a8f578e27689c5` | yes |
| `REDTEAM-ROUND-18-ROUTING.md` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | yes |
| `PLAN-AGENT-REVIEW-R16.md` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | yes |
| `.claude/agents/plan-agent.md` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | yes |
| `.claude/agents/orchestrator.md` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | yes |
| `PAYLOAD-CENSUS.md` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | yes |
| `TRANSCRIPT-AUTH-EVIDENCE.md` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | yes |

All seven auxiliary inputs matched exactly. **No evidence drift** on any of the fixed input files given to this
round.

**Byte 0 → EOF statement:** the plan file (5,566 lines) was read sequentially and completely in the following
contiguous ranges, with no gaps: 1–140, 139–357, 357–490, 490–667, 667–1000, 1000–1250, 1250–1450, 1450–1700,
1700–1950, 1950–2040, 2040–2160, 2160–2354, 2354–2600, 2600–2820, 2820–3105, 3105–3300, 3300–3530, 3530–3640,
3640–3835, 3835–4060, 4060–4200, 4200–4406, 4406–4600, 4600–4674, 4674–4754, 4754–4952, 4952–5141, 5141–5401,
5401–5566. Every one of the task's named cross-reference sections (§0.3, §2.15–2.17, §3, §4.2, §5.1, §5.3, §6.1,
§6.2, §7.1, §8.2, §8.6, §12.1–12.3, §13, §14, §15, §17) was read in full, not sampled.

**Confirmation the three required-new R19/ROUND-19 outputs were absent before, and (for the two red-team names)
remain absent after:** `PLAN-AGENT-REVIEW-R19.md`, `REDTEAM-ROUND-19-ROUTING.md` and
`REDTEAM-ROUND-19-TRANSACTION.md` were all confirmed absent immediately before this report was written.
`EVIDENCE-MANIFEST.sha256` was also confirmed absent (correct pre-handshake). This report itself creates
`PLAN-AGENT-REVIEW-R19.md`, which is its deliverable per the task; `REDTEAM-ROUND-19-ROUTING.md` and
`REDTEAM-ROUND-19-TRANSACTION.md` were not created by this round and their absence was re-checked after writing
this report (see `## Verification`).

## Verdict

`NOT_READY_FOR_REDTEAM`

- BLOCKER: 0
- MAJOR: 2
- MINOR: 0

## Mechanical re-test

### R16 B1 closure (ref-baseline drift)

Re-derived independently, not restated from R18: current `git -C /Users/luca/Desktop/项目/muse/lucagstack`
`HEAD`/`@{u}`/`HEAD^{tree}` all equal the exact tuple `FINAL-EXECUTION-PLAN.md:81-82` pins
(`BASELINE_HEAD=BASELINE_UPSTREAM=2419328798859ea5708db289a2e05702a1189cd4`,
`BASELINE_TREE=938af7cca24fca10087ccc9409e229e136a37f87`), with 0 ahead / 0 behind. B1 stays closed.

### R16 B2 closure (transfer recovery total product) — four counterexamples re-run against current bytes

The governing table is `FINAL-EXECUTION-PLAN.md:2064-2075` (`transfer_invocation_kind`, seven ordered disjoint
predicates) and its outcome product at `FINAL-EXECUTION-PLAN.md:2104-2115`
(`recovery_capability_or_null × owner_census → outcome`). All four scenarios are also named verbatim as required
"Named cells" in the §15 mutant list at `FINAL-EXECUTION-PLAN.md:5061-5068`, confirming they are treated as
mandatory biting-mutant fixtures, not merely asserted in prose:

a. **Nonterminal journal, no scan, proven-dead controller, fresh E1 attested, then the exact `plan-transfer
   recover` PreTool with no pending candidate.** Fresh E1 selects predicate 3 (`NEWLY_ATTESTED_EVENT`,
   `FINAL-EXECUTION-PLAN.md:2068`), which is event-bearing and reaches the outcome table with
   `recovery_capability_or_null=null` and `owner_census=PROVEN_DEAD` →
   `PROVEN_DEAD_RECOVERY_ISSUED` (`FINAL-EXECUTION-PLAN.md:2108`), issuing a capability bound to E1 and denying
   the attempted controller in the same invocation (`FINAL-EXECUTION-PLAN.md:2076-2080`, "an event-bearing kind
   may never consume a capability... in the same invocation that minted or refreshed it"). The next `plan-transfer
   recover` invocation (no scan, no new group, current event still E1) matches predicate 4(a)
   (`FINAL-EXECUTION-PLAN.md:2069`) exactly, and consumes the capability. Unique conforming transition confirmed;
   named verbatim at `FINAL-EXECUTION-PLAN.md:5065-5066` (`NO_NEW_EVENT_RECOVER_CONTROLLER succeeds with no
   event append`).
b. **Same at ordinary count 256 with a one-item scan (final drain, then a retry with no new
   `UserPromptSubmit`).** The one remaining item selects predicate 1 (`SCAN_DRAIN_EVENT`,
   `FINAL-EXECUTION-PLAN.md:2066`); `ledger_admission=FULL` at count 256 does not gate `transfer_invocation_kind`
   selection (`FINAL-EXECUTION-PLAN.md:2040-2052`, "Both values run the same journal proof and owner census").
   Once the drain proves `consumed_count == submitted_count`, `transfer_scan` is removed and "the very next
   PreToolUse/state-mutating PostToolUse/Stop re-enters this table with `transfer_scan` absent and may select
   predicate 4, 5 or 6 without another `UserPromptSubmit`" (`FINAL-EXECUTION-PLAN.md:2083-2087`). Unique
   conforming transition confirmed; named verbatim at `FINAL-EXECUTION-PLAN.md:5066` ("final-scan-drain followed
   by a no-event controller retry and by a no-event notice or terminal projection Stop").
c. **ISSUED E1 capability when fresh E2 is attested before controller consumption.** Predicate 3 fires again
   for E2 (takes precedence over predicate 4 in "first match wins" order). The outcome-table row
   "`ISSUED` whose `dead_owner_sha256` equals the recomputed `controller_owner.owner_sha256`" applies without
   re-running the liveness oracle (`FINAL-EXECUTION-PLAN.md:2109`, "the oracle is never re-run against a recorded
   dead owner") → `STALE_CAPABILITY_ROTATED`, rotating the E1-bound capability onto E2 at a strictly higher
   `recovery_sequence`, with the old `capability_id` "permanently unconsumable" and persisted controller bytes
   rebound to the replacement `authority_id`. Unique conforming transition confirmed; named verbatim at
   `FINAL-EXECUTION-PLAN.md:5062-5064`.
d. **IN_PROGRESS RECOVERY owner that has crashed, on fresh E2.** After predicate 4(a) consumed the E1 capability
   (`recovery_capability_or_null=CONSUMED`), fresh E2 again selects predicate 3. The outcome row "`CONSUMED`,
   whose consume rename bound the fresh RECOVERY `controller_owner`" with `owner_census=PROVEN_DEAD` (crashed) →
   `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object with a fresh capability at a strictly higher
   `recovery_sequence` (`FINAL-EXECUTION-PLAN.md:2113`). Unique conforming transition confirmed; named verbatim
   at `FINAL-EXECUTION-PLAN.md:5064` ("recovery-owner death after consume (fresh higher-sequence capability from
   a CONSUMED arm)").

All four counterexamples have a unique, mechanically determined conforming transition in the current bytes.
**R16 B2 remains closed.**

### R18 routing MAJOR repairs

**MAJOR-1 (asymmetric trailing-content alias grammar).** §4.2 bullet 1 (`FINAL-EXECUTION-PLAN.md:454-459`) now
states: for a metadata-alias target, "the adjacent marker — or the alias itself when the optional marker is
absent — must be clause-terminal except for a bounded polite particle (`啊|呀|吧`), and a following
possessive/content token from the same closed set `的|里|中|下|报告|登录|设置|任务|功能|页面` makes the clause
non-authorizing," explicitly matching the `打开|继续` bullet's identical contract
(`FINAL-EXECUTION-PLAN.md:461-463`) and stating "the two bullets therefore share one trailing-content contract
for aliases and differ only on canonical targets." The three new frozen negative examples appear verbatim at
`FINAL-EXECUTION-PLAN.md:483-486` (`进入 luca app 项目页面看看`, `切到 luca app 项目功能`,
`回到 luca app 项目的登录流程`). Repair holds as claimed.

*Adversarial attempt:* I tried to construct a residual gap for trailing content that is neither a bounded polite
particle nor a closed-set token (e.g. `进入 luca app 看看`, trailing "看看"). The prose states the requirement as
"must be clause-terminal except for a bounded polite particle" — a necessary condition — and separately
illustrates one named consequence ("a following … token from the closed set … makes the clause
non-authorizing"). Read as a single fail-closed rule (consistent with every other grammar boundary in this
document, which is uniformly deny-by-default on unrecognized trailing content), any non-particle continuation,
closed-set or not, fails the "must be clause-terminal" requirement and is non-authorizing. I could not construct
a case where this reading produces a false positive or false negative; I did not find a genuine defect here, only
a spot where terser drafting is possible. Not counted as a finding.

**MAJOR-2 (`别`-form structural negation).** §5.1 (`FINAL-EXECUTION-PLAN.md:509-517`) now states the closed
generated set `(不|别|不要|不用|无需|不必) × (改|动|调整|变) × 结构` explicitly, states `别动结构`/`别调整结构`
are "recognized exactly as `不动结构` and `不调整结构` are," and states "the two negation grammars in this
document share one negator alternation with no unexplained asymmetry" against §4.2's negator alternation. The
§14 `R-SIGNAL` corpus (`FINAL-EXECUTION-PLAN.md:4762-4765`) independently re-states "the complete generated
`(不|别|不要|不用|无需|不必)×(改|动|调整|变)结构` set, including `别动结构`/`别调整结构`" as fixtures, and §15
requires "every deletion of one generated negator member red" (`FINAL-EXECUTION-PLAN.md:5150-5165` region,
carried from §5.1's own fixture line). Repair holds as claimed; the generated set is enumerated identically in
both §5.1 and §14.

## Re-freeze verification

Every hop of the §0.3 KILL-02 tuple (`FINAL-EXECUTION-PLAN.md:81-97`) was independently re-derived against real
git objects, not restated from the plan's own prose:

- `BASELINE_HEAD=BASELINE_UPSTREAM=2419328798859ea5708db289a2e05702a1189cd4`,
  `BASELINE_TREE=938af7cca24fca10087ccc9409e229e136a37f87` — confirmed via `git rev-parse HEAD`, `git rev-parse
  @{u}`, `git rev-parse HEAD^{tree}`, all three checkpoints, 0 ahead / 0 behind.
- `PRIOR_BASELINE_COMMIT=8e9726d8477f8a287722c09345f07182cc86d1d5`,
  `PRIOR_BASELINE_TREE=fe67c639838340beca9556e76773f0e1b7d41c2b` — confirmed: `git rev-parse
  8e9726d8...^{tree}` returns exactly `fe67c639...`.
- **Ancestry, hop by hop.** `git log --format='%H %P' <hash>` was run for every one of the 16 listed hashes
  (`c0a2efe7…c9d4185f…8e1c46d5…068b9ab4…36d37072…0e51ec21…fd0919bb…a78abb70…11a14c0f…d0391f55…b3b6124b…31e77999…
  6915b5fc…74aae922…d2b4a4ff…2419328…`). Every stated parent-child edge is a real git parent relationship. The
  chain is **not** linear — `74aae922` is a real two-parent merge commit (`11a14c0f` + `6915b5fc`), and
  `a78abb70`'s real parent is `6edcabde…` (not `fd0919bb`, which precedes it only in list position, not in the
  actual DAG). The plan's own text was independently checked to say "in parent-to-child **topological** order"
  (`FINAL-EXECUTION-PLAN.md:83`), not "linear order," and I verified this is a valid topological sort: every
  edge's parent occupies an earlier list position than its child. `6edcabde…` is correctly omitted from the
  15-hash intervening list because it is already an ancestor of `PRIOR_BASELINE_COMMIT=8e9726d8…` (confirmed
  `git merge-base --is-ancestor 6edcabde… 8e9726d8…` → true), so it is not "intervening." Set equality was
  independently confirmed: `git log --format='%H' 8e9726d8…..2419328…` returns exactly these 16 hashes, sorted
  match confirmed byte-for-byte against the plan's list.
- **76-file / 12-outside delta.** `git diff --name-status 8e9726d8… 2419328…` returns exactly 76 lines; exactly
  12 lie outside `framework-audit/**`. Confirmed exact match to the plan's stated counts.
- **Five envelope-member blob hashes** (`FINAL-EXECUTION-PLAN.md:89-93`). `git rev-parse
  2419328…:<path>` was run for all five: `.claude/hooks/post-edit.mjs=b534aa6e…`,
  `.claude/observability/rules.yaml=e6a9a7a8…`, `.gitignore=40d23300…`, `scripts/test-auto-open.mjs=f4719bd3…`,
  `scripts/test-project-scope-guard.mjs=2d056cd6…` — all five match the plan's pinned blob hashes exactly.
- **"Other seven" absence from every envelope list.** All seven (`.claude/observability/observations.jsonl`,
  `memory/episodic/index.jsonl`, `memory/episodic/archive/2026.jsonl`, `memory/evals/eval-log.jsonl`,
  `memory/evals/routing/fixtures.jsonl`, `memory/retrieval-log.jsonl`, `memory/scripts/propose_semantic.py`)
  were grepped across the entire plan file; each appears exactly once, at the point of the "other seven" claim
  itself (`FINAL-EXECUTION-PLAN.md:95-97`), and nowhere in §12.1 (`4408-4470`) or §12.2 (`4471-4595`). Confirmed
  correctly excluded from every envelope list. **This half of the classification is correct.**
- **"Five envelope members" claim — one member fails independent verification.** See `## Findings`,
  MAJOR-2: `scripts/test-auto-open.mjs`, though its blob hash correctly matches `BASELINE_HEAD`, does not
  actually appear anywhere in §12.1 or §12.2's literal path lists, and is mentioned nowhere else in the entire
  plan except this one self-referential claim.

## Findings

### MAJOR-1 — §2.17 closure map asserts a git-commit fact that is false in current bytes

**Location:** `FINAL-EXECUTION-PLAN.md:355` (the "2026-08-24 batch conflict review" row of §2.17), corroborated
by `FINAL-EXECUTION-PLAN.md:354` ("Why Round 19 can converge" row, "with a clean worktree").

**Contract conflict:** Line 355 states, as a load-bearing evidentiary claim: "the committed `FINAL-EXECUTION-PLAN.md`
blob is byte-identical to the reviewed working copy... so no frozen evidence drifted." This is offered as the
justification for why the round can proceed without re-verifying anything about the plan file's own git status.

**Mechanical counterexample:** `git -C /Users/luca/Desktop/项目/muse/lucagstack status --porcelain` shows
`FINAL-EXECUTION-PLAN.md` as modified (` M`), not clean. `git hash-object` of the working file
(`a4547398a4abd4ed0c642dc7dd63b6780c7962d4`) differs from the blob actually committed at
`HEAD:framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
(`9bf0012960f66728e5473d027cc0425fba00a431`). `git diff HEAD -- FINAL-EXECUTION-PLAN.md` shows a real 61-line
diff (35 insertions, 26 deletions) — precisely the §0.3/§2.17/§13 text this very round is reviewing, meaning the
committed blob is an *earlier, pre-R19-edit* version of the plan, not byte-identical to what I am reviewing. The
committed blob's own content is 5,557 lines / SHA-256 `c1d26c60f435592ee5f55e532ed0086629fd0dd2aa5a76593a226437496654d2`,
versus the reviewed working copy's 5,566 lines / `100eef99…`. The "clean worktree" claim at line 354 is likewise
false in the literal sense (a tracked file is modified); the untracked `payload-census/workspace/` is legitimate
excluded scratch per §12.3 and is not itself part of this finding.

**Why this matters:** the entire plan is built on git-object-based frozen identity as its core integrity
mechanism (KILL-01/02/04, "byte-identical," "committed blob," "frozen ancestry"). A false claim of byte-identity
inside the plan's own evidentiary closure map, about the very file under review, is exactly the class of defect
this multi-round audit exists to catch — the same class that produced R16's BLOCKER findings. It does not,
however, break any load-bearing mechanism this round independently re-derived as correct (BASELINE_HEAD/TREE,
the 16-hop ancestry, the 76/12/5/7 file partition's blob hashes) — those are all genuinely, independently
correct — so I do not rate it BLOCKER. §13 step 2 (`FINAL-EXECUTION-PLAN.md:4682-4687`) is not actually broken
by this: its A0-staging description already, and correctly, lists "the approved plan bytes" as one of the three
things A0 must stage — which only makes sense if the plan file is *not* assumed already git-identical, so §13's
own mechanics tolerate the true state gracefully. The defect is confined to the false factual assertion in the
§2.17 evidence table, not to any executable mechanism.

**Minimum repair:** either commit the current `FINAL-EXECUTION-PLAN.md` bytes to git before the next review round
so the claim becomes true, or rewrite the row-355 and row-354 text to accurately describe the plan file as
currently uncommitted (analogous to how it correctly describes `.claude/observability/rules.yaml` as
`WORKTREE_RUNTIME` provenance elsewhere, `FINAL-EXECUTION-PLAN.md:4171-4174`) rather than asserting an
unqualified byte-identity that does not hold.

### MAJOR-2 — one of the "five §12.1/§12.2 envelope members" is not actually in §12.1 or §12.2

**Location:** `FINAL-EXECUTION-PLAN.md:88-94` (§0.3 KILL-02 tuple), specifically the claim that
`scripts/test-auto-open.mjs` "is a member of this plan's own §12.1/§12.2 envelope."

**Contract conflict:** §12.1's exact bridge path set (`FINAL-EXECUTION-PLAN.md:4408-4451`) and §12.2's exact v3
release payload list plus "Additional exact tracked paths" (`FINAL-EXECUTION-PLAN.md:4471-4551`) were both read
in full. Neither lists `scripts/test-auto-open.mjs` anywhere — not as a bare path, not nested under any
`hook-releases/*/payload/` prefix, and not in the "Additional exact tracked paths" block (which does list its
sibling `scripts/test-project-scope-guard.mjs` explicitly, at `FINAL-EXECUTION-PLAN.md:4547`).

**Mechanical counterexample:** `grep -n "test-auto-open" FINAL-EXECUTION-PLAN.md` returns exactly one hit in the
entire 5,566-line file — line 93, the self-referential §0.3 claim itself. There is no second reference anywhere
in §12.1, §12.2, §14 or §15 that would independently justify calling this file an envelope member. By contrast,
the file's actual content change in the `8e9726d8…2419328…` delta (verified by `git diff`) is real and legitimate
— it adds a T8 regression test for the 2026-08-21 `post-edit.mjs` narrowing to `.html`-only auto-open — but that
coupling to `post-edit.mjs`'s behavior does not make it a listed member of either exact-path envelope as those
sections are actually written.

**Note on provenance:** this is not a defect newly introduced by the R19 edit. The pre-R19 (R18-era) text made
the identical claim in different words ("`scripts/test-auto-open.mjs` and `scripts/test-project-scope-guard.mjs`
(inside the §12.2 envelope)"), so this has been carried forward unverified through at least R16–R18 without being
caught. It is a genuine, independently-verified defect regardless of when it was introduced.

**Why this matters:** the plan's own §0.3 closure map asserts a specific partition — "five... are members of this
plan's own §12.1/§12.2 envelope... the remaining seven... are outside every envelope list" — as the basis for
"no frozen evidence drifted" and for justifying why only five of the twelve non-audit changed files needed
re-pinning. That partition is demonstrably wrong for one of the five: `scripts/test-auto-open.mjs`'s pinned blob
hash is correct (verified above), but its classification as an "envelope member" is not supported by the actual
text of §12.1/§12.2. This undermines confidence that the re-freeze's bookkeeping was done rigorously, though the
blob-hash pin itself is accurate and the practical execution risk is low (the file is a test fixture, not a
security-relevant path).

**Minimum repair:** either add `scripts/test-auto-open.mjs` to §12.2's "Additional exact tracked paths" list (if
it is genuinely intended to be in scope, given its coupling to `post-edit.mjs`), or correct the §0.3 partition
to state four confirmed envelope members plus reclassify `scripts/test-auto-open.mjs` alongside a corrected
count/rationale for why its bytes are pinned despite not being a literal envelope path.

## Remaining consistency scan

- §0.3 / §2.15–2.17 / §3 / §13 all now agree on the same `BASELINE_HEAD=BASELINE_UPSTREAM=2419328…` /
  `BASELINE_TREE=938af7cca…` pair and the same 16-hash ancestry; no cross-section drift found beyond the two
  MAJOR findings above.
- §4.2 and §5.1's negator alternations were checked against each other and against §14's `R-SIGNAL` corpus; all
  three now cite the identical closed generated set. No asymmetry found.
- §5.3's `transfer_invocation_kind` table (§6.1/§7.1/§8.2/§8.6 all reference it) is consistent everywhere it is
  cited: §6.1 (`FINAL-EXECUTION-PLAN.md:2903,2937`), §7.1 (`FINAL-EXECUTION-PLAN.md:3156`), §8.2
  (`FINAL-EXECUTION-PLAN.md:3537`), §8.6 (multiple bullets) all describe the identical seven-predicate/six-kind
  partition with the identical "no default" property. No divergent restatement found.
  bloc
- §12.3's required-new-output list (`FINAL-EXECUTION-PLAN.md:4620-4655`) matches exactly the three names this
  task's brief specifies as required-new (`PLAN-AGENT-REVIEW-R19.md`, `REDTEAM-ROUND-19-ROUTING.md`,
  `REDTEAM-ROUND-19-TRANSACTION.md`), and all three were independently confirmed absent before this report was
  written.
- §17's handshake gate correctly requires "the cycle-specific R19 receipt" and "two independent Round-19
  reviewers" against "one unchanged SHA," consistent with §0.2 and §13 step 1.
- Round-numbering hygiene: R16, R17, R18 and `REDTEAM-ROUND-18-ROUTING.md` were treated strictly as immutable
  prior inputs (read but never modified); this file is the sole required-new output produced by this round.
- No unreachable table arm, no missing default-turned-into-a-silent-default, and no other §12.1/§12.2 ↔ §0.3
  cross-reference mismatch was found beyond MAJOR-2 above.

## Verification

This report was re-read to EOF after writing. The plan file's SHA-256/line count and the framework HEAD/upstream
were re-run immediately after writing this report; those post-write values, together with this report's own
SHA-256 (computed after writing, not embedded in the report itself), are reported in the accompanying final chat
message together with the verdict and counts.

## Gate conclusion

Plan SHA-256: `100eef99610d2897311b8b9b98006813323f5f7b1c3c14ed2af18ead4de37c03` (5,566 lines).
Framework HEAD: `2419328798859ea5708db289a2e05702a1189cd4` (= upstream, tree `938af7cca24fca10087ccc9409e229e136a37f87`,
0 ahead / 0 behind, stable across all three checkpoints).

**Verdict: `NOT_READY_FOR_REDTEAM`**
- BLOCKER: 0
- MAJOR: 2
- MINOR: 0

The re-freeze's load-bearing git identity (baseline tuple, 16-hop ancestry, 76/12-file delta, five pinned blob
hashes, R18-era immutable input hashes) is independently verified correct. The R16 B2 four counterexamples and
both R18 routing MAJOR repairs hold under fresh adversarial re-test. The round is blocked from
`READY_FOR_REDTEAM` by two MAJOR findings in the plan's own evidentiary self-description: a false claim that the
committed plan blob is byte-identical to the reviewed working copy (it is not — the working copy carries 61
lines of uncommitted edits, including the very text asserting identity), and a mischaracterization of
`scripts/test-auto-open.mjs` as a §12.1/§12.2 envelope member when no such membership exists anywhere in those
sections' literal text. Both are narrow, correctable defects in bookkeeping prose, not breaks in the plan's
executable mechanics.
