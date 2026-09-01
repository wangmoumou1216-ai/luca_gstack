# Plan Agent Gate Review — Round 20 (R20)

## Receipt

**Review mode:** independent Plan Agent gate review of a framework-recovery execution plan. Working directory
`/Users/luca/Desktop/项目/muse/lucagstack` throughout; no downstream project switched or bound; no file created,
modified, deleted or renamed other than this report.

**Plan path:** `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`

**Plan SHA-256 / line count, three checkpoints:**

| Checkpoint | Expected SHA-256 | Actual SHA-256 | Expected lines | Actual lines |
|---|---|---|---|---|
| 1 — before reading (byte 0) | `abcbfc533ac88d3e4a87a5d53a94a8cb7338da6a13e0de19eec0e47b7618abf3` | `abcbfc533ac88d3e4a87a5d53a94a8cb7338da6a13e0de19eec0e47b7618abf3` | 5,573 | 5,573 |
| 2 — immediately before writing this report | same | `abcbfc533ac88d3e4a87a5d53a94a8cb7338da6a13e0de19eec0e47b7618abf3` | 5,573 | 5,573 |
| 3 — immediately after writing this report | same | see final chat message | 5,573 | see final chat message |

The plan file's own bytes are **unchanged** across all checkpoints (matches the given expected SHA/line count
exactly, no drift on the reviewed content itself).

**Framework HEAD / upstream / tree, checkpoints** (checked with `git -C /Users/luca/Desktop/项目/muse/lucagstack …`):

| Checkpoint | Expected | Actual HEAD | Actual `@{u}` | Actual tree | ahead/behind |
|---|---|---|---|---|---|
| 1 — before reading | `2419328798859ea5708db289a2e05702a1189cd4` / tree `938af7cca24fca10087ccc9409e229e136a37f87` | `2419328798859ea5708db289a2e05702a1189cd4` | `2419328798859ea5708db289a2e05702a1189cd4` | `938af7cca24fca10087ccc9409e229e136a37f87` | 0 / 0 |
| 2 — immediately before writing report | same | `c146cb70fa8ae95159d31763d57613194b74d68d` | `c146cb70fa8ae95159d31763d57613194b74d68d` | `f15777109b3f524ab0a87888ba74ee4f825a8066` | 0 / 0 |
| 3 — immediately after writing report | same | see final chat message | see final chat message | — | — |

**THE FRAMEWORK REF MOVED DURING THIS REVIEW WINDOW.** Between checkpoint 1 and checkpoint 2, `HEAD` (and
`@{u}` with it — both refs advanced together, still 0 ahead / 0 behind) went from `2419328…` to `c146cb70…`, two
new commits deep:

```
c146cb7 chore(memory): EP-142/143/144 落盘 + 轮转（094/095/096 入 archive） — 2026-08-24 15:32:54 +0800
473a625 docs(audit): payload-census 工作区入库，去掉那个嵌套 .git       — 2026-08-24 15:23:28 +0800
2419328 (the plan's own pinned BASELINE_HEAD)
```

`git merge-base --is-ancestor 2419328… c146cb70…` confirms `2419328…` is a real ancestor (linear advance, not a
sibling). `git diff --name-status 2419328… c146cb70…` shows exactly:

```
A  framework-audit/2026-08-20-routing-steering-handshake/payload-census/workspace/.codex/hooks.json
A  framework-audit/2026-08-20-routing-steering-handshake/payload-census/workspace/README.md
M  memory/episodic/archive/2026.jsonl
M  memory/episodic/index.jsonl
M  memory/evals/eval-log.jsonl
M  memory/retrieval-log.jsonl
```

None of these six paths lie inside §12.1 or §12.2's literal envelope lists (all four are either audit-directory
census files the plan already names at `FINAL-EXECUTION-PLAN.md:4610-4613`, or memory-governance paths the plan's
own §0.3 tuple already lists among the "remaining eight" non-envelope paths never staged/packaged/modified by
this plan). So this drift does not corrupt any pinned blob hash the plan currently cites. **That does not matter
for staleness**: per the task brief and per the plan's own `KILL-02` text at `FINAL-EXECUTION-PLAN.md:109-110`
("any further commit on either repository, including another audit-only one, re-fires KILL-02 and the in-flight
review round is stale"), any ref movement — content-neutral or not — makes this round stale. **I am reporting
this, not downgrading the constraint, and not issuing a PASS.** See `## Gate conclusion`.

**`git status` of the framework checkout at checkpoint 2:**

```
## main...upstream/main
 M framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
?? framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R19.md
```

(`payload-census/workspace/` no longer shows as untracked dirt — it was committed by `473a625` between my
checkpoints, consistent with the diff above.) The plan file itself remains the sole tracked modification, exactly
as its own §2.17 "Worktree state" row (`FINAL-EXECUTION-PLAN.md:360`) currently and correctly describes.

**Downstream status:** `UNVERIFIABLE_FROM_THIS_SESSION`. `git -C /Users/luca/Desktop/项目/muse rev-parse HEAD`
was refused verbatim by the project-scope guard:

```
Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse）；禁止 no-pin/跨项目/失效 identity 访问。
```

I did not route around this refusal. Judged on the merits, this is the same session-capability limitation R19
already documented, not a plan defect.

**Input file hashes, expected vs actual (all recomputed independently with `shasum -a 256`):**

| File | Expected SHA-256 | Actual SHA-256 | Match |
|---|---|---|---|
| `PLAN-AGENT-REVIEW-R19.md` | `1f9cdad61698491cd3e90b329802b625e3e711aec68f26d2f743f9cc84c56e6f` | `1f9cdad61698491cd3e90b329802b625e3e711aec68f26d2f743f9cc84c56e6f` | yes (357 lines, matches) |
| `PLAN-AGENT-REVIEW-R18.md` | `eb102a9c73a2b8284ec425c38a0fdbc57920b4effb3d6cb5e9a8f578e27689c5` | `eb102a9c73a2b8284ec425c38a0fdbc57920b4effb3d6cb5e9a8f578e27689c5` | yes |
| `REDTEAM-ROUND-18-ROUTING.md` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | yes |
| `PLAN-AGENT-REVIEW-R16.md` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | yes |
| `.claude/agents/plan-agent.md` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | yes |
| `.claude/agents/orchestrator.md` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | yes |
| `PAYLOAD-CENSUS.md` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | yes |
| `TRANSCRIPT-AUTH-EVIDENCE.md` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | yes |

All eight fixed input files matched exactly. **No evidence drift on any of the fixed input files given to this
round** — the only drift observed anywhere in this review is the framework ref movement documented above, which
is external to (not a change of) any of these frozen inputs.

**Byte 0 → EOF statement:** the plan file (5,573 lines) was read sequentially and completely, covering every
line with no gaps, in the following contiguous ranges: 1–168, 168–361, 362–497, 497–526 (§5.1), 526–672 (§5.2
skim), 672–2160 (§5.3 discriminator/outcome tables), 2160–2359, 2359–2822 (§5.4), 2822–3110 (§6), 3110–3300 (§7),
3300–3540 (§8.1–8.2), 3594–3838 (§8.3–8.6), 3838–4065 (§9), 4065–4200 (§10.1), 4200–4411 (§10.2–11), 4411–4601
(§12.1–12.2), 4601–4681 (§12.3), 4681–4759 (§13), 4759–5148 (§14), 5148–5408 (§15), 5408–5561 (§16), 5561–5573
(§17). Every task-named cross-reference section (§0.3, §2.15–2.17, §3, §4.2, §5.1, §5.3, §6.1, §6.2, §7.1, §8.2,
§8.6, §12.1–12.3, §13, §14, §15, §17) was read in full and additionally cross-checked against real git objects
where it made an evidentiary claim.

**Evidence-drift statement:** the plan bytes and all eight fixed auxiliary inputs are drift-free (SHA-exact
matches at every checkpoint). The framework ref baseline is **not** drift-free — see above. This is why the round
is STALE regardless of the substantive findings below.

**Confirmation the three R20 outputs were absent before, and (for the two red-team names) after:**
`PLAN-AGENT-REVIEW-R20.md`, `REDTEAM-ROUND-20-ROUTING.md` and `REDTEAM-ROUND-20-TRANSACTION.md` were all
confirmed absent immediately before this report was written (checkpoint 2). `REDTEAM-ROUND-19-ROUTING.md` and
`REDTEAM-ROUND-19-TRANSACTION.md` were independently confirmed absent too, consistent with R19's Plan Gate
having failed before any Round-19 red team was ever dispatched — the plan does not require them (see
`## Round-numbering hygiene` under Remaining consistency scan). This report itself creates
`PLAN-AGENT-REVIEW-R20.md`; `REDTEAM-ROUND-20-ROUTING.md`/`REDTEAM-ROUND-20-TRANSACTION.md` were not created by
this round and their absence was re-checked after writing this report (see `## Verification`).

## Verdict

`NOT_READY_FOR_REDTEAM`

- BLOCKER: 0
- MAJOR: 3
- MINOR: 3

**The controlling reason this round cannot return `READY_FOR_REDTEAM` is staleness, not the count above.** The
framework ref moved from the plan's pinned `BASELINE_HEAD=2419328…` to `c146cb70…` during this review window (see
Receipt). Per the plan's own `KILL-02` and per this task's explicit instruction, any ref movement mid-review makes
the round stale and no PASS may issue, independent of merit. The BLOCKER/MAJOR/MINOR counts below are reported
as independent findings against the plan's **text**, which — unlike the git ref state — did not drift and remains
exactly the reviewed SHA throughout. Both R19 MAJORs are independently confirmed closed in these bytes (see next
section); the 3 MAJOR findings below are new, this round, in the same "evidentiary self-description" class R19
already flagged twice.

## R19 MAJOR closure

**(a) Committed-blob/clean-worktree self-invalidation (R19 MAJOR-1).** Closed. §2.17 (`FINAL-EXECUTION-PLAN.md:347-361`)
was substantially rewritten. It now contains an explicit general rule at the "Relationship between the committed
blob and the reviewed object" row (`FINAL-EXECUTION-PLAN.md:359`): *"the committed blob `c1d26c60…` is an ancestor
snapshot, **not** the object under review... No section of this plan may assert byte-equality between the working
copy and any committed blob."* I grepped the entire file for `byte-identical`, `byte-equality`, `clean worktree`
and `committed blob`/`committed object` (37 hits total) and confirmed every other occurrence either (i) describes
internal mechanics unrelated to git-blob identity (e.g. "byte-identical bounded final-assistant projection"), or
(ii) is the new, scoped "Worktree state" row (`FINAL-EXECUTION-PLAN.md:360`), which I verified against live
`git status`/`git hash-object`/`git show HEAD:<path>` output at checkpoint 2 and found **true right now**: the
working file's hash-object is `75b2fd514664fa3a440a8d4394c6270c27ed1abc`, the committed blob at `HEAD` is still
`9bf0012960f66728e5473d027cc0425fba00a431` (5,557 lines, SHA-256 `c1d26c60…`) — genuinely different objects — and
the row's claim ("the only tracked modification is `FINAL-EXECUTION-PLAN.md` itself... `payload-census/workspace/`
is untracked excluded scratch") matches `git status --porcelain` exactly (modulo `payload-census/workspace/`
itself having since been committed by the external `473a625` commit described above — which does not falsify the
row, since that row only asserts the plan file is the sole *tracked* modification, which remains true). No
surviving byte-equality assertion was found anywhere else in the document. **Closed.**

**(b) `scripts/test-auto-open.mjs` envelope misclassification (R19 MAJOR-2).** Closed for that specific file. §0.3
(`FINAL-EXECUTION-PLAN.md:86-96`) now states "Exactly four of those twelve appear verbatim in this plan's
§12.1/§12.2 envelope file lists" (down from the old, wrong "five"), lists `.claude/hooks/post-edit.mjs`,
`.claude/observability/rules.yaml`, `.gitignore`, `scripts/test-project-scope-guard.mjs` as the four, states the
explicit rule "Envelope membership is decided only by literal presence in a §12.1/§12.2 list; a path named
anywhere else in this document, including in this tuple, is not thereby an envelope member," and moves
`scripts/test-auto-open.mjs` into the "remaining eight" (`FINAL-EXECUTION-PLAN.md:94-96`) that "appear in no
envelope list." I independently confirmed `grep -n "test-auto-open" FINAL-EXECUTION-PLAN.md` returns exactly two
hits in the whole 5,573-line file (the blob-pin line and a `§2.17` historical-closure-map mention), neither inside
§12.1 (`4413-4475`) or §12.2 (`4476-4600`). **Closed for `test-auto-open.mjs` specifically.** However, applying
the *same* literal-presence test to the other three of the "four" claimed members surfaced that **one of them
fails the identical test** — see Finding MAJOR-A below. R19's fix repaired the one instance it happened to check;
it did not fix the underlying membership-classification process, and a sibling instance of the same defect
survives in the current bytes.

## Mechanical re-test

### R16 B1 (ref-baseline drift)

Independently re-derived (not restated from R18/R19): at checkpoint 1, `HEAD`/`@{u}`/`HEAD^{tree}` all equaled the
exact tuple `FINAL-EXECUTION-PLAN.md:74-75` pins. **This no longer holds at checkpoint 2** — see Receipt. B1's
underlying *mechanism* (the plan freezes an explicit commit-ref tuple rather than tolerating drift) is sound and
unchanged; what failed is that the tuple is, once again, stale against live git state, exactly the class of
failure B1 originally targeted. This is the STALE condition driving the verdict, not a reopened B1 defect in the
plan's text.

### R16 B2 (transfer recovery total product) — four counterexamples re-run against current bytes

Governing table: `transfer_invocation_kind` at `FINAL-EXECUTION-PLAN.md:2062-2075` (seven ordered disjoint
predicates → six kinds), outcome product at `FINAL-EXECUTION-PLAN.md:2104-2113`. Byte-identical to what R19
verified (confirmed via `git diff HEAD -- FINAL-EXECUTION-PLAN.md`, which shows the only changes since the
committed blob are in the header line, §0.3, §2.17, §12.3's evidence-manifest list and §13 steps 1–2 — nothing in
§5.3). I re-derived all four independently against the current table text:

a. **Nonterminal journal, no scan, proven-dead controller, fresh E1, then `plan-transfer recover` with no
   pending candidate.** Fresh E1 selects predicate 3 (`NEWLY_ATTESTED_EVENT`, line 2072) → event-bearing,
   `owner_census=PROVEN_DEAD` → `PROVEN_DEAD_RECOVERY_ISSUED`, issuing an E1-bound capability and denying the
   controller in the same invocation (lines 2076-2080's "an event-bearing kind may never consume a capability...
   in the same invocation that minted or refreshed it"). The next `recover` invocation (no scan, event still E1)
   matches predicate 4(a) exactly and consumes the capability. **Unique conforming transition confirmed**; named
   verbatim in §15's mutant list (`FINAL-EXECUTION-PLAN.md:5072-5073`, "`NO_NEW_EVENT_RECOVER_CONTROLLER` succeeds
   with no event append").
b. **Ordinary count 256, one-item scan (final drain), then a retry with no new `UserPromptSubmit`.** The one
   remaining item selects predicate 1 (`SCAN_DRAIN_EVENT`); `ledger_admission=FULL` at 256 doesn't gate kind
   selection ("both values run the same journal proof and owner census," line ~2044). Once drain proves
   `consumed_count == submitted_count`, `transfer_scan` is removed and the next tool/Stop re-enters with it
   absent, selecting predicate 4/5/6 without another `UserPromptSubmit` (line ~2088). **Unique conforming
   transition confirmed**; named verbatim at `FINAL-EXECUTION-PLAN.md:5073-5074`.
c. **ISSUED E1 capability, fresh E2 attested before consumption.** Predicate 3 fires again for E2 (first-match
   order beats predicate 4). Outcome row "`ISSUED` whose `dead_owner_sha256` equals the recomputed
   `controller_owner.owner_sha256`" applies without re-running the oracle (line 2110) → `STALE_CAPABILITY_ROTATED`,
   rotating onto E2 at a strictly higher `recovery_sequence`, old `capability_id` permanently unconsumable.
   **Unique conforming transition confirmed**; named verbatim at `FINAL-EXECUTION-PLAN.md:5068-5071`.
d. **IN_PROGRESS RECOVERY owner crashed, fresh E2.** After predicate 4(a) consumed E1's capability
   (`recovery_capability_or_null=CONSUMED`), fresh E2 selects predicate 3 again. Outcome row "`CONSUMED`, whose
   consume rename bound the fresh RECOVERY `controller_owner`" with `owner_census=PROVEN_DEAD` (crashed) →
   `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object at a strictly higher `recovery_sequence` (line
   2114). **Unique conforming transition confirmed**; named verbatim at `FINAL-EXECUTION-PLAN.md:5071` ("recovery-owner
   death after consume (fresh higher-sequence capability from a CONSUMED arm)").

All four counterexamples have a unique, mechanically determined conforming transition. **R16 B2 remains closed.**

### R18 routing MAJOR repairs

**MAJOR-1 (asymmetric trailing-content alias grammar).** §4.2 bullet 1 (`FINAL-EXECUTION-PLAN.md:454-459`)
carries the shared clause-terminal / closed-set (`的|里|中|下|报告|登录|设置|任务|功能|页面`) trailing-content
contract for aliases, matching the `打开|继续` bullet. Frozen negative examples at `FINAL-EXECUTION-PLAN.md:481-484`
(`进入 luca app 项目页面看看`, `切到 luca app 项目功能`, `回到 luca app 项目的登录流程`) are present verbatim.
**Repair holds.**

*Fresh adversarial attempt (independent of R19's):* the bullet's own explanatory clause — "the adjacent marker —
or the alias itself when the optional marker is absent — must be clause-terminal" (`FINAL-EXECUTION-PLAN.md:457`)
— reads, on a first pass, as if it grants a marker-optional path for a metadata alias (e.g. bare `进入 luca app`
with no `项目|工程` token at all), which would contradict the §4.2 intro's unconditional "a metadata alias
requires an adjacent 项目|工程 marker unless it is inside the explicit correction forms" (`FINAL-EXECUTION-PLAN.md:445`).
No required example tests this exact bare-alias-no-marker case either way. Reading the two statements as two
independent necessary conditions (marker-required per the intro; clause-terminal per the bullet, applying to
whichever token — marker or, defensively, the alias itself — ends up adjacent) rather than as an OR-grant produces
one consistent, fail-closed behavior (deny), matching the document's declared uniform deny-by-default posture. I
could not construct an input where the two readings actually diverge in output. **Not counted as a finding** — a
drafting-clarity spot, not a behavioral gap, on the same standard R19 applied to a structurally similar near-miss
in this same bullet.

**MAJOR-2 (`别`-form structural negation).** §5.1 (`FINAL-EXECUTION-PLAN.md:513-521`) states the closed generated
set `(不|别|不要|不用|无需|不必) × (改|动|调整|变) × 结构` explicitly, states `别动结构`/`别调整结构` are
"recognized exactly as `不动结构` and `不调整结构` are," and the §14 `R-SIGNAL` corpus (`FINAL-EXECUTION-PLAN.md:4769-4772`)
independently re-states the identical set. **The `别` vs `不` symmetry R18 fixed is confirmed closed.**

*Fresh adversarial attempt — a residual false positive was found (see Finding MAJOR-C below):* the fixed-forms
list `结构不变|保持结构不变|结构不动|结构别动|而非结构|不是结构问题` gives *object-first* negation coverage
(`结构 + negator + verb`) only for the verbs `变` and `动`, not for `改` or `调整`, even though the *verb-first*
generated cross-product covers all four verbs symmetrically. `结构别改` / `结构不改` / `结构别调整` /
`结构不调整` are not in either list. `§5.1`'s own text says "The admitted set is exactly this enumeration; no
generic negation heuristic and no other negator/verb pair is admitted" — so this is a genuine, fail-closed gap,
not a defensive-elaboration ambiguity like the §4.2 case above. This is a fresh residual defect, orthogonal to
the `别`/`不` asymmetry R18 already fixed, in the same grammar.

## Re-freeze verification

Every hop of the §0.3 `KILL-02` tuple (`FINAL-EXECUTION-PLAN.md:74-110`) was independently re-derived against
real git objects at checkpoint 1 (before it moved):

- `BASELINE_HEAD=BASELINE_UPSTREAM=2419328…`, `BASELINE_TREE=938af7cca…` — confirmed via `git rev-parse HEAD`,
  `git rev-parse @{u}`, `git rev-parse HEAD^{tree}` at checkpoint 1, 0 ahead / 0 behind.
- `PRIOR_BASELINE_COMMIT=8e9726d8…`, `PRIOR_BASELINE_TREE=fe67c639…` — confirmed: `git rev-parse 8e9726d8…^{tree}`
  returns exactly `fe67c639…`.
- **Ancestry, hop by hop, independently re-walked** (`git log -1 --format='%P' <hash>` for all 16 listed hashes,
  not trusted from any prior report): every stated parent-child edge is real. `74aae922…` is confirmed a real
  two-parent merge (`11a14c0f…` + `6915b5fc…`). `a78abb70…`'s real parent is `6edcabde…` (confirmed via
  `git merge-base --is-ancestor 6edcabde… 8e9726d8…` → true, i.e. it is already an ancestor of
  `PRIOR_BASELINE_COMMIT` and correctly omitted from the 16-hash intervening list). `git log --format='%H'
  8e9726d8…..2419328…` returns exactly a 16-hash set matching the plan's list byte-for-byte (order differs by
  direction, set is identical). The plan's list is confirmed a valid topological (not necessarily linear) sort:
  every edge's parent occupies an earlier list position than its child.
- **76-file / 12-outside delta.** `git diff --name-status 8e9726d8… 2419328…` returns exactly 76 lines; exactly
  12 lie outside `framework-audit/**`. Confirmed exact match.
- **Envelope-membership re-derivation, all twelve non-audit paths, independently grepped against §12.1
  (`FINAL-EXECUTION-PLAN.md:4413-4475`) and §12.2 (`FINAL-EXECUTION-PLAN.md:4476-4600`)** — not trusted from the
  tuple's own prose:

  | Path | Blob hash matches `BASELINE_HEAD`? | Literally present in §12.1 or §12.2? | Plan's classification |
  |---|---|---|---|
  | `.claude/hooks/post-edit.mjs` | yes (`b534aa6e…`) | **yes** — bare path at §12.1 line 4441 | envelope member — correct |
  | `.claude/observability/rules.yaml` | yes (`e6a9a7a8…`) | **no** — only nested `.../payload/.claude/observability/rules.yaml` under both g0/g3 hook-release trees (§12.1:4434, §12.2:4516); bare path never appears | envelope member — **wrong, see Finding MAJOR-A** |
  | `.gitignore` | yes (`40d23300…`) | **yes** — bare path at §12.1 line 4458 | envelope member — correct |
  | `scripts/test-project-scope-guard.mjs` | yes (`2d056cd6…`) | **yes** — §12.2 "Additional exact tracked paths," line 4547 | envelope member — correct |
  | `scripts/test-auto-open.mjs` | yes (`f4719bd3…`) | no | non-envelope — correct (R19's fix) |
  | `.claude/observability/observations.jsonl` | n/a (not individually pinned) | no | non-envelope — correct |
  | `memory/episodic/index.jsonl` | n/a | no | non-envelope — correct |
  | `memory/episodic/archive/2026.jsonl` | n/a | no | non-envelope — correct |
  | `memory/evals/eval-log.jsonl` | n/a | no | non-envelope — correct |
  | `memory/evals/routing/fixtures.jsonl` | n/a | no | non-envelope — correct |
  | `memory/retrieval-log.jsonl` | n/a | no | non-envelope — correct |
  | `memory/scripts/propose_semantic.py` | n/a | no | non-envelope — correct |

  Eleven of twelve are classified correctly. One (`.claude/observability/rules.yaml`) is misclassified as an
  envelope member when, by the plan's own stated literal-presence test, it is not one — see Finding MAJOR-A.

## Findings

### MAJOR-A — `.claude/observability/rules.yaml` fails the plan's own envelope-membership test, the same way `scripts/test-auto-open.mjs` did before R19's fix

**Location:** `FINAL-EXECUTION-PLAN.md:86-96` (§0.3 KILL-02 tuple), the claim that
`.claude/observability/rules.yaml` "appear[s] verbatim in this plan's §12.1/§12.2 envelope file lists."

**Contract conflict:** the same sentence states, immediately after listing the four: "Envelope membership is
decided only by literal presence in a §12.1/§12.2 list; a path named anywhere else in this document, including in
this tuple, is not thereby an envelope member" — this is the precise rule R19's fix introduced to close the
`test-auto-open.mjs` misclassification. Applying it to `.claude/observability/rules.yaml` fails it.

**Mechanical counterexample:** `grep -n "observability/rules.yaml" FINAL-EXECUTION-PLAN.md` returns exactly four
hits in the whole file: lines 91 and 102 (both inside the self-referential §0.3 tuple), and lines 4434/4516
(both **nested** under `.claude/hook-releases/{g0-baseline-20260820,g3-routing-steering-20260820}/payload/`,
which is a different literal path string, and which does not exist anywhere in the current repository —
`.claude/hook-releases/` has zero entries under `HEAD`; it is a to-be-created release bundle, not a currently
real path). The **bare** path `.claude/observability/rules.yaml` — the one that actually appears in the
`8e9726d8…2419328…` diff and the one whose blob is pinned — never appears as a literal line in either §12.1's
code block (`4413-4475`) or §12.2's (`4476-4600`).

**Cross-section contradiction (independent of the literal-grep test):** §10.1 (`FINAL-EXECUTION-PLAN.md:4171-4174`)
already explains why this file is different from an ordinary envelope member: *"B1 deliberately uses the current
worktree bytes of `.claude/observability/rules.yaml` as the runtime-parity snapshot; its source receipt records
`provenance=WORKTREE_RUNTIME`... A receipt binds those manifest member hashes, never a live policy path. Live
project/profile/observability/memory data... are explicit external runtime dependencies, **not bundled-code
claims**."* §10.1 explicitly says this file is *not* a bundled-code/manifest-member claim; §0.3 explicitly calls
it an envelope member "appear[ing] verbatim" in the manifest-defining sections. These two sections disagree about
what kind of thing this path is in the plan's own architecture.

**Why this matters:** this is the identical defect class R19 just caught and the plan just fixed for
`scripts/test-auto-open.mjs` — same tuple, same "appear verbatim" claim, same rule, one line away. The fix
repaired one instance without re-deriving membership for the other three "four," and a sibling instance survives.
It does not break any executable mechanism (the blob-hash pin is correct, and §10.1's WORKTREE_RUNTIME handling
of this file is internally coherent) — same low-execution-risk profile R19 assigned to its own MAJOR-2 — which is
why this is MAJOR, not BLOCKER.

**Minimum repair:** either add the bare `.claude/observability/rules.yaml` to §12.1's or §12.2's literal path list
(if literal envelope membership is genuinely intended), or correct §0.3 to state three confirmed envelope members
(`post-edit.mjs`, `.gitignore`, `test-project-scope-guard.mjs`) plus reclassify `rules.yaml` into the "remaining"
group (making it nine, not eight) with a cross-reference to §10.1's WORKTREE_RUNTIME rationale for why its bytes
are still pinned despite not being a literal envelope path — mirroring the repair R19 already prescribed for
`test-auto-open.mjs`.

### MAJOR-B — §0.3 and §13 step 2 still say "R19 outputs" after the same edit correctly bumped everything else around them to R20

**Location:** `FINAL-EXECUTION-PLAN.md:106-108` (§0.3, "this audit package is itself tracked at `BASELINE_HEAD`...
so `A0` adds only the still-absent R19 outputs and the evidence manifest") and `FINAL-EXECUTION-PLAN.md:4693-4697`
(§13 step 2, "Because the audit package is already tracked at `BASELINE_HEAD`, `A0` stages exactly the
still-absent R19 outputs, `EVIDENCE-MANIFEST.sha256` and the approved plan bytes").

**Contract conflict:** both sentences are, by `git diff HEAD -- FINAL-EXECUTION-PLAN.md`, **freshly written in
this exact revision** (not carried-over legacy text) — they replace materially different older prose about a
three-non-audit-path delta. In the very same numbered list, in the very same edit, §13 step 1
(`FINAL-EXECUTION-PLAN.md:4688-4690`) was correctly updated: *"obtain new `PLAN-AGENT-REVIEW-R20.md` with
READY_FOR_REDTEAM, then two Round-20 PASS reports."* Step 2, one sentence later, was not bumped to match.

**Mechanical counterexample:** `PLAN-AGENT-REVIEW-R19.md` exists (untracked). `REDTEAM-ROUND-19-ROUTING.md` and
`REDTEAM-ROUND-19-TRANSACTION.md` will **never** exist — R19's Plan Gate failed, so no Round-19 red team was ever
dispatched, and per `KILL-04` ("Completed failed-cycle receipts are immutable inputs and use different literal
names. There is no blanket audit-directory exemption") those two filenames are permanently retired, superseded by
`REDTEAM-ROUND-20-ROUTING.md`/`REDTEAM-ROUND-20-TRANSACTION.md`. So "the still-absent R19 outputs," read
literally at the moment `A0` actually executes (after a future successful handshake), can only ever resolve to
one file (`PLAN-AGENT-REVIEW-R19.md`) — omitting `PLAN-AGENT-REVIEW-R20.md`, `REDTEAM-ROUND-20-ROUTING.md` and
`REDTEAM-ROUND-20-TRANSACTION.md`, which are the files that will actually have gated this handshake and which
`§12.3`'s own evidence-manifest list (`FINAL-EXECUTION-PLAN.md:4646-4648`) requires. If `A0`'s staging step were
implemented literally per this sentence, the commit that is supposed to freeze the approved audit trail would omit
the very reviews that approved it.

**Why this matters:** unlike Finding MAJOR-A (a classification label), this is a description of an actual future
execution step (`§13` `A0` staging) — a real defect that would change what gets committed if followed literally,
which is why it is MAJOR rather than a pure bookkeeping nit. It does not block *this* round's ability to be
red-teamed (red-team dispatch doesn't execute `A0`), which is why it is not BLOCKER.

**Minimum repair:** change both instances of "the still-absent R19 outputs" to "the still-absent R19 and R20
outputs" (or equivalent generic phrasing tied to §12.3's manifest list rather than a hardcoded round number), so
this sentence does not need re-editing at every future round bump — the same fragility that let this exact gap
through once should not be reintroduced by hand-fixing it back to a fresh literal "R20."

### MAJOR-C — §5.1/§14's structural-negation grammar has a residual false-positive gap: object-first negation is asymmetric across the four generated verbs

**Location:** `FINAL-EXECUTION-PLAN.md:513-521` (§5.1) and `FINAL-EXECUTION-PLAN.md:4769-4772` (§14 `R-SIGNAL`),
identical enumeration in both.

**Contract conflict:** the negation set is defined as the verb-first generated cross-product
`(不|别|不要|不用|无需|不必) × (改|动|调整|变) × 结构` (symmetric across all four verbs: `改`, `动`, `调整`, `变`)
**plus** six fixed object-first forms: `结构不变|保持结构不变|结构不动|结构别动|而非结构|不是结构问题`. The fixed
forms give object-first coverage (`结构` + negator + verb) only for `变` and `动` — there is no `结构不改`,
`结构别改`, `结构不调整` or `结构别调整` anywhere in either enumeration, even though `改` and `调整` are two of the
same four verbs the verb-first product treats identically. §5.1 states: *"The admitted set is exactly this
enumeration; no generic negation heuristic and no other negator/verb pair is admitted"* — i.e. this is explicitly
fail-closed to only the listed forms, not a heuristic that might catch the missing four anyway.

**Mechanical counterexample:** the sentence `帮我优化下设置页面，结构别改，其他随便你改` (optimize the settings
page; don't touch the structure, do whatever else you want) contains all three §5.1 legs — change: `优化`
(leg-1 list, `FINAL-EXECUTION-PLAN.md:504`); interface: `设置页面` (leg-2 list, line 505); structure: `结构`
(leg-3 list, line 506, bare `结构` is a valid match token) — with the structure leg explicitly negated in natural
Chinese object-first word order (`结构别改` = "the structure, don't change it"). Neither the verb-first
cross-product (`别改结构` would match; `结构别改` does not, word order is reversed) nor any of the six fixed forms
match `结构别改`. Per "no other negator/verb pair is admitted," the structure leg's negation is **not
recognized**, so all three legs register as present and unnegated, incorrectly setting
`semanticRouteAxis=interface_structure_change` on a prompt that explicitly asked for the opposite.

**Why this matters:** this is orthogonal to, and not covered by, R18's already-fixed `别`-vs-`不` asymmetry (that
fix made the *verb-first* negator alternation symmetric; this gap is in the *word-order* dimension, between
verb-first and object-first phrasing, and only two of the four verbs got object-first coverage). It is exactly
the kind of grammar-completeness gap a routing red team specializing in this section would be expected to find,
which is why it is MAJOR (would change red-team review outcome) rather than MINOR.

**Minimum repair:** either add the four missing object-first fixed forms (`结构不改|结构别改|结构不调整|结构别调整`)
to the enumeration in both §5.1 and §14, or replace the six ad hoc fixed forms with a second, symmetric
object-first generated cross-product `结构 × (不|别|不要|不用|无需|不必) × (改|动|调整|变)` alongside the existing
verb-first one plus the two non-generated idioms `而非结构|不是结构问题`.

### MINOR-1 — §2.15's Round-16 closure-map row cites a stale "three-blob delta" that no longer matches §0.3's current tuple

**Location:** `FINAL-EXECUTION-PLAN.md:336` (§2.15) and `FINAL-EXECUTION-PLAN.md:414` (§3, preflight receipt
description), both saying "...the exact parent-to-child audit-only ancestry and its three-blob delta."

**Contract conflict:** §0.3's current, git-verified tuple (see Re-freeze verification above) has a 16-hash
ancestry and a 76-file/12-outside/4-envelope-member non-audit delta — not three blobs. Cross-checked against
`PLAN-AGENT-REVIEW-R16.md:12`: at the moment R16 closed, the baseline had moved by exactly two commits changing
three files, all inside `framework-audit/2026-08-20-recovery-handoff-review/` (zero outside), so "three-blob
delta" was a locally-accurate historical snapshot of that moment. It was never updated as the baseline advanced
through R17 (`068b9ab4…`), the R18-era `0e51ec2…`/`fd0919b…` chain (which added `post-edit.mjs` to the delta), and
the 2026-08-24 batch that produced the current 12-path/4-member delta.

**Why this is MINOR, not MAJOR:** §2.15 is a historical closure-map row about what R16 fixed, not a currently-consulted
source of truth — I independently re-derived §0.3's actual current tuple from real git objects (Re-freeze
verification, above) without relying on §2.15 at all, and nothing downstream cites §2.15's blob count as an
input. It doesn't change what a red team would conclude about current routing/transaction mechanics; it is a
documentation-accuracy gap, not a load-bearing claim.

**Minimum repair:** either drop the specific count from the historical row ("its non-audit delta" without a
number) or update it to reference the current count generically ("the exact parent-to-child audit-only ancestry
and non-audit delta, as re-frozen at each subsequent round").

### MINOR-2 — the top-of-file status line omits R19's own Plan Gate result

**Location:** `FINAL-EXECUTION-PLAN.md:5` — "Status: `PROPOSED_ONLY` — Round-18 Plan Gate returned
READY_FOR_REDTEAM (0/0/0); the Round-18 routing red team returned FAIL(STALE) with 2 MAJOR, both now closed in
these bytes... pending a fresh Plan Agent review and Round-20 dual red team."

**Contract conflict:** this line was edited in the same revision (confirmed via diff: only "Round-19" → "Round-20"
and one clause were touched), so it was deliberately maintained, not merely inherited stale. But it still cites
"Round-18 Plan Gate returned READY_FOR_REDTEAM" as the most recent Plan Gate result, without mentioning that
Round-19's own Plan Gate ran and returned `NOT_READY_FOR_REDTEAM` (2 MAJOR, both closed in these bytes per
§2.17's "Round-19 gate" row, `FINAL-EXECUTION-PLAN.md:355`). Not false — R18's Plan Gate genuinely did return
READY_FOR_REDTEAM 0/0/0, that's a true historical fact — but incomplete as a "current status" summary, since it
skips the most recent completed Plan Gate round entirely.

**Why this is MINOR:** purely informational; §2.17's closure map (which I independently verified) carries the
complete, accurate history including R19's result. Nothing downstream reads the header line as an authority.

**Minimum repair:** add a clause for Round-19's Plan Gate result, e.g. "...Round-18 routing red team returned
FAIL(STALE) with 2 MAJOR, both closed; Round-19 Plan Gate returned NOT_READY_FOR_REDTEAM with 2 MAJOR, both now
closed in these bytes; ...pending a fresh Plan Agent review and Round-20 dual red team."

### MINOR-3 — §16's "minimum command union" omits two test scripts that §12.2 individually names as tracked paths

**Location:** `FINAL-EXECUTION-PLAN.md:5512-5553` (§16 minimum command union) vs. `FINAL-EXECUTION-PLAN.md:4555-4556`
(§12.2 "Additional exact tracked paths": `scripts/test-harness.mjs`, `scripts/test-project-substrate.mjs`).

**Contract conflict:** I extracted every `scripts/*.mjs` path from both lists and diffed them. All 37 scripts
named in §16's mandatory-runner list are envelope paths (correct — no phantom runner). But `test-harness.mjs` and
`test-project-substrate.mjs`, both individually enumerated as tracked test files this plan governs in §12.2, do
not appear as individual `node scripts/...` lines in §16, unlike every other `test-*.mjs` file in the envelope.

**Why this is MINOR and low-confidence as a genuine gap:** §16 itself hedges that `npm run verify` "is not
assumed to aggregate a new file unless its exact package wiring is separately reviewed" (`FINAL-EXECUTION-PLAN.md:5555`),
and both `npm run verify` and `bash scripts/verify.sh` are listed as separate, additional mandatory runners
(`FINAL-EXECUTION-PLAN.md:5551-5552`) that could plausibly already invoke these two general-infrastructure test
files (unlike the plan-specific `test-plan-*.mjs` files, `test-harness.mjs`/`test-project-substrate.mjs` read as
pre-existing general test infrastructure, not new v3-specific tests this plan introduces). I cannot verify from
the plan's text alone whether the aggregators cover them, so I am not confident this is an actual execution gap
— only that the two enumerated lists don't match 1:1, which the plan's own drafting style (individually naming
every other test file) suggests was probably meant to.

**Minimum repair:** either add `node scripts/test-harness.mjs` and `node scripts/test-project-substrate.mjs` to
the §16 minimum command union, or add one sentence stating they are covered by `npm run verify`/`bash
scripts/verify.sh` and are intentionally omitted from individual enumeration.

## Remaining consistency scan

- §0.3 / §2.15–2.17 / §3 / §13 baseline tuple: consistent with each other on `BASELINE_HEAD=BASELINE_UPSTREAM=
  2419328…`/`BASELINE_TREE=938af7cca…` and the 16-hash ancestry, **except** for the two stale-count issues logged
  as MINOR-1 above. No other numeric drift found.
- §4.2 and §5.1's negator alternations were checked against each other and against §14's `R-SIGNAL` corpus; the
  `(不|别|不要|不用|无需|不必)` set itself is identical everywhere it's cited. The asymmetry found (MAJOR-C) is
  within §5.1/§14's own object-first fixed-forms list, not a §4.2 cross-reference mismatch.
- §5.3's `transfer_invocation_kind` table is consistent everywhere cited: §6.1 (`2903, 2937`), §7.1 (`3161`),
  §8.2 (`3542`), §8.6 (multiple bullets `3795-3807`) all describe the identical seven-predicate/six-kind
  partition. No divergent restatement found.
- §12.3's required-new-output list (`4602-4650`) matches exactly the three names this task's brief specifies as
  required-new (`PLAN-AGENT-REVIEW-R20.md`, `REDTEAM-ROUND-20-ROUTING.md`, `REDTEAM-ROUND-20-TRANSACTION.md`);
  all three independently confirmed absent before this report was written.
- **Round-numbering hygiene:** R16, R17, R18, R19 and `REDTEAM-ROUND-18-ROUTING.md` were treated strictly as
  immutable prior inputs (read, never modified). `REDTEAM-ROUND-19-ROUTING.md`/`REDTEAM-ROUND-19-TRANSACTION.md`
  were never produced (R19's Plan Gate failed before red-team dispatch) and the plan's text does not require
  them — §12.3's list and §13 step 1 both correctly reference only the completed `PLAN-AGENT-REVIEW-R19.md` plus
  the two new R20 names (aside from the "R19 outputs" phrasing bug logged as MAJOR-B). This file
  (`PLAN-AGENT-REVIEW-R20.md`) is the sole required-new output produced by this round.
- §2.17's row order has an internal oddity worth a bare mention though I did not count it as a finding: the
  "Round-19 gate" row (line 355, R19's own verdict) appears in the table *before* the "Closure" row (line 356,
  the R18→R19 baseline re-freeze) and "Why Round 19 can converge" row (line 357), which chronologically precede
  it. Each row is self-labeled with its round, so this doesn't produce a false reading, only an unusual reading
  order.
- §16's minimum command union vs. §12.1's/§12.2's envelope test-script lists: see MINOR-3. All non-`.mjs` runner
  commands (`npm run check:hooks`, `npm run verify`, `bash scripts/verify.sh`) are consistent with §12's
  description of them as aggregate checks.
- No unreachable table arm and no silent default was found in the §5.3, §8.1, §8.3–8.5, §9.1–9.3 tables I
  re-read this round beyond what's logged above.

## Verification

This report was read back to EOF after writing, before running the post-write hash/ref checks below. The plan
file's SHA-256/line count and the framework `HEAD`/`@{u}` were re-run immediately after writing this report; those
post-write values, together with this report's own SHA-256 (computed after writing, not embedded in the report
itself), are reported in the accompanying final chat message together with the verdict and counts.

## Gate conclusion

Plan SHA-256: `abcbfc533ac88d3e4a87a5d53a94a8cb7338da6a13e0de19eec0e47b7618abf3` (5,573 lines) — unchanged and
drift-free throughout this review.

Framework `HEAD` at the start of this review: `2419328798859ea5708db289a2e05702a1189cd4` (matching the plan's
pinned `BASELINE_HEAD`). Framework `HEAD` immediately before this report was written: `c146cb70fa8ae95159d31763d57613194b74d68d`
— **the ref moved during the review window** (two new commits, `473a625` then `c146cb7`, both content-neutral
with respect to the plan's own pinned envelope hashes, but a movement nonetheless).

**Verdict: `NOT_READY_FOR_REDTEAM`**
- BLOCKER: 0
- MAJOR: 3
- MINOR: 3

This round is **stale by `KILL-02`** — the framework ref advanced mid-review, exactly the failure mode that
already stalled R17 and R18. Per the task's explicit instruction, I am not issuing a PASS and not downgrading
this constraint. Independent of staleness, the plan's text (which did not drift) carries three new MAJOR findings
in the same "evidentiary self-description" class both R19 MAJORs occupied — one sibling instance of R19's own
`test-auto-open.mjs` envelope-membership bug, surviving in `.claude/observability/rules.yaml`'s classification;
one freshly-introduced round-number inconsistency in the very edit that closed R19 (`§0.3`/`§13` step 2 still say
"R19 outputs" after step 1, in the same list, was correctly bumped to R20); and one genuine adversarially-found
false-positive gap in §5.1/§14's structural-negation grammar (object-first `结构别改`-class phrasing, orthogonal
to the `别`/`不` asymmetry R18 already fixed). Both of R19's own MAJORs are independently confirmed closed. R16's
B1/B2 closures and both R18 routing repairs hold under fresh, independent re-test against current bytes. The next
round must (1) re-freeze the baseline tuple against whatever `HEAD` is current at that time, and (2) repair the
three MAJOR findings above, before it can be considered `READY_FOR_REDTEAM`.
