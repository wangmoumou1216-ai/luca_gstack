# Plan Agent Gate Review — Round 21 (R21)

## Receipt

**Review mode:** independent Plan Agent gate review of a framework-recovery execution plan. Working directory
`/Users/luca/Desktop/项目/muse/lucagstack` throughout; no downstream project switched or bound; no file created,
modified, deleted or renamed other than this report.

**Plan path:** `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`

**Plan SHA-256 / line count, three checkpoints:**

| Checkpoint | Expected SHA-256 | Actual SHA-256 | Expected lines | Actual lines |
|---|---|---|---|---|
| 1 — before reading (byte 0) | `221ce13c87f2c3a33a67e5da9539d70b59fa6786137090684d8ac642184cd3f3` | `221ce13c87f2c3a33a67e5da9539d70b59fa6786137090684d8ac642184cd3f3` | 5,588 | 5,588 |
| 2 — immediately before writing this report | same | `221ce13c87f2c3a33a67e5da9539d70b59fa6786137090684d8ac642184cd3f3` | 5,588 | 5,588 |
| 3 — immediately after writing this report | same | see final chat message | 5,588 | see final chat message |

Both recorded checkpoints match exactly; no plan-content drift observed at any point during this review.

**Framework HEAD / upstream / tree, checkpoints** (checked with `git -C /Users/luca/Desktop/项目/muse/lucagstack …`):

| Checkpoint | Expected | Actual HEAD | Actual `@{u}` | Actual tree | ahead/behind |
|---|---|---|---|---|---|
| 1 — before reading | `c146cb70fa8ae95159d31763d57613194b74d68d` / tree `f15777109b3f524ab0a87888ba74ee4f825a8066` | `c146cb70fa8ae95159d31763d57613194b74d68d` | `c146cb70fa8ae95159d31763d57613194b74d68d` | `f15777109b3f524ab0a87888ba74ee4f825a8066` | 0 / 0 |
| 2 — immediately before writing report | same | `c146cb70fa8ae95159d31763d57613194b74d68d` | `c146cb70fa8ae95159d31763d57613194b74d68d` | `f15777109b3f524ab0a87888ba74ee4f825a8066` | 0 / 0 |
| 3 — immediately after writing report | same | see final chat message | see final chat message | — | — |

No ref movement observed between checkpoint 1 and checkpoint 2. This round is **not stale** by the SHA/ref
criteria at the point this report was written; checkpoint 3 (post-write) is re-verified and reported in the
final chat message.

**`git status --porcelain` of the framework checkout, observed at both checkpoints (unchanged):**

```
 M .claude/observability/observations.jsonl
 M .claude/observability/rules.yaml
 M framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
 M memory/evals/routing/fixtures.jsonl
?? framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R19.md
?? framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R20.md
```

This is a **worktree-dirtiness finding** — see `## Findings`, MAJOR-1. None of the three extra modified tracked
paths (`observations.jsonl`, `rules.yaml`, `memory/evals/routing/fixtures.jsonl`) is a literal §12.1/§12.2
envelope member (confirmed below), so `KILL-03` is still correctly inert in practice; but the plan's own §2.17
"Worktree state" row (`FINAL-EXECUTION-PLAN.md:366`) asserts "the only tracked modification is
`FINAL-EXECUTION-PLAN.md` itself," which is false against this same git status. This is not ref drift (HEAD/@{u}
unchanged across both checkpoints) and not a plan-content-SHA mismatch, so it does not by itself make the round
STALE under this task's stale-criteria.

**Downstream status:** `UNVERIFIABLE_FROM_THIS_SESSION`. `git -C /Users/luca/Desktop/项目/muse rev-parse HEAD`
was refused verbatim by the project-scope guard:

```
Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse）；禁止 no-pin/跨项目/失效 identity 访问。
```

I did not route around this refusal (no `cd`, no alternate path, no pin change, no retry with a different
invocation). Judged on the merits, this is the identical session-capability limitation R18–R20 already
documented, not a plan defect.

**Input file hashes, expected vs actual (all recomputed independently with `shasum -a 256`):**

| File | Expected SHA-256 | Actual SHA-256 | Match |
|---|---|---|---|
| `PLAN-AGENT-REVIEW-R20.md` | `a27d0d76f05def9af2776e1f2276004fdda5e94ba94936bffed48c0924803534` | `a27d0d76f05def9af2776e1f2276004fdda5e94ba94936bffed48c0924803534` | yes |
| `PLAN-AGENT-REVIEW-R19.md` | `1f9cdad61698491cd3e90b329802b625e3e711aec68f26d2f743f9cc84c56e6f` | `1f9cdad61698491cd3e90b329802b625e3e711aec68f26d2f743f9cc84c56e6f` | yes |
| `REDTEAM-ROUND-18-ROUTING.md` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | `5986a0b8047bfc37d6f35baffb975adcdd15130eaa6a4ec437bb7acc0f665530` | yes |
| `PLAN-AGENT-REVIEW-R16.md` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | `c4b8e62b4c4b8bdffa3fb2c2c350a043e33adf8b8db062b7eeb05c1998800127` | yes |
| `.claude/agents/plan-agent.md` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3` | yes |
| `.claude/agents/orchestrator.md` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea` | yes |
| `PAYLOAD-CENSUS.md` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9` | yes |
| `TRANSCRIPT-AUTH-EVIDENCE.md` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1` | yes |

All nine fixed inputs (plan + eight auxiliary files) matched exactly. **No evidence drift** on any fixed input.

**Byte 0 → EOF statement:** the plan file (5,588 lines) was read sequentially and completely in the following
contiguous, overlapping ranges with no gap (each range's start line is ≤ the previous range's end line + 1):
1–200, 200–399, 400–649, 650–899, 899–1298, 1298–1697, 1698–2059, 2060–2219, 2220–2499, 2500–2829, 2830–3069,
3069–3318, 3318–3597, 3598–3847, 3846–4075, 4074–4423, 4423–4612, 4609–4768, 4769–4968, 4969–5168, 5169–5428,
5428–5587, 5576–5588. Every task-named cross-reference section (§0.3, §2.15–2.17, §3, §4.2, §5.1, §5.3, §6.1,
§6.2, §7.1, §8.2, §8.6, §12.1–12.3, §13, §14, §15, §16, §17) was read in full, not sampled, and several
(§0.3, §4.2, §5.1, §12.1–12.3, §13, §16) were additionally cross-checked mechanically against live git output
and against each other with `grep`/`comm`/`diff`/Python set comparisons rather than by eye alone.

**Evidence-drift statement:** the plan bytes and all eight fixed auxiliary inputs are drift-free (SHA-exact
matches at both recorded checkpoints). The framework ref baseline is also drift-free between checkpoints 1 and 2
(both `c146cb70…`, 0/0 ahead-behind). The only non-drift-free element found is the git worktree dirtiness
described above and in Finding MAJOR-1, which is a **contradiction inside the plan's own static prose**, not
external drift during this review window.

**Confirmation the three required-new R21 outputs were absent before, and (for the two red-team names) after:**
`PLAN-AGENT-REVIEW-R21.md`, `REDTEAM-ROUND-21-ROUTING.md` and `REDTEAM-ROUND-21-TRANSACTION.md` were all
confirmed absent (via `ls` returning "No such file or directory") immediately before this report was written.
This report itself creates `PLAN-AGENT-REVIEW-R21.md`, which is its sole deliverable per the task.
`REDTEAM-ROUND-21-ROUTING.md` and `REDTEAM-ROUND-21-TRANSACTION.md` were not created by this round and their
absence was re-checked after writing this report (see `## Verification`).

## Verdict

`NOT_READY_FOR_REDTEAM`

- BLOCKER: 0
- MAJOR: 2
- MINOR: 2

Neither MAJOR finding is a BLOCKER: neither renders the plan unexecutable, breaks an irreversible/security
boundary, or reopens R16's B1/B2 or R18/R19/R20's already-closed findings. Both are genuine defects that would
change review outcome for a routing red team — one a real mechanical false-positive gap in the alias-negation
grammar (§4.2), the other a false factual claim in the plan's own evidentiary bookkeeping (§2.17), the same
recurring class R19/R20 already caught and "fixed" in other instances of this document.

## Prior-round closure

### R19 MAJOR-1 (self-invalidating committed-blob/clean-worktree claim) — confirmed closed for the byte-equality claim, but see Finding MAJOR-1 below for a fresh recurrence in the same row's sibling claim

§2.17 (`FINAL-EXECUTION-PLAN.md:347-366`) still contains the explicit general rule at the "Relationship between
the committed blob and the reviewed object" row (line 365): *"No section of this plan may assert byte-equality
between the working copy and any committed blob."* I grepped the entire current file for `byte-identical`,
`byte-equality`, `clean worktree` and `committed blob`/`committed object`:

```
$ grep -n "only tracked modification\|clean worktree\|byte-identical to the reviewed\|Worktree state" FINAL-EXECUTION-PLAN.md
366:| Worktree state | the only tracked modification is `FINAL-EXECUTION-PLAN.md` itself, ...
```

No surviving byte-equality-with-committed-blob claim exists anywhere in the document — R19's original finding
stays closed on its own narrow terms. **However**, the adjacent "Worktree state" row that R19's fix introduced
(as a *replacement*, scoped assertion) is itself now false against current `git status`, for reasons unrelated
to committed-blob identity — see Finding MAJOR-1. This is the same underlying class of defect (a static
git-state claim inside §2.17 that does not hold against live git output) recurring in a new place, not the same
finding reopened.

### R19 MAJOR-2 (`scripts/test-auto-open.mjs` envelope misclassification) — confirmed closed

§0.3 (`FINAL-EXECUTION-PLAN.md:88-103`) states envelope membership is decided "only by a path appearing as its
own literal line in a §12.1 or §12.2 file list" and now lists `scripts/test-auto-open.mjs` in the "remaining
nine" that "appear in no envelope list." `grep -n "test-auto-open" FINAL-EXECUTION-PLAN.md` returns exactly two
hits: the §0.3 tuple line and the §2.17 historical-closure-map line; neither is inside §12.1's block (4426-4469)
or §12.2's blocks (4491-4602), independently confirmed with a script (see `## Independent re-derivation`).
**Closed.**

### R20 MAJOR-A (`.claude/observability/rules.yaml` envelope misclassification, sibling of R19 MAJOR-2) — confirmed closed

§0.3 now states "Under that rule exactly three of the twelve qualify" (`FINAL-EXECUTION-PLAN.md:92-93`) — down
from R20-era's incorrect "four" — and explicitly moves `.claude/observability/rules.yaml` into the "remaining
nine appear in no envelope list" group with the explanatory clause "it occurs only inside the two nested
`payload/...` release entries and as the §10.1 live policy path, never as a bare envelope line"
(`FINAL-EXECUTION-PLAN.md:98-99`). I independently re-derived envelope membership for all twelve non-audit paths
by literal-line grep against §12.1/§12.2 (see `## Independent re-derivation` below) rather than trusting this
prose, and confirmed `rules.yaml` is correctly classified as a non-member, alongside the other eight, with the
three true members (`post-edit.mjs`, `.gitignore`, `test-project-scope-guard.mjs`) confirmed present. **Closed.**

### R20 MAJOR-B (`§0.3`/`§13` step 2 still said "R19 outputs" after step 1 was bumped to R20) — confirmed closed

§0.3 (`FINAL-EXECUTION-PLAN.md:109-113`) now reads generically: "`A0` adds only the still-absent outputs of the
round that actually passed — currently the R21 names in §12.3 — plus the evidence manifest, rather than
re-adding the package. This phrase always tracks the passing round's number; a stale round number here is a
defect." §13 step 2 (`FINAL-EXECUTION-PLAN.md:4702-4708`) mirrors this: "`A0` stages exactly the still-absent
outputs of the passing round — currently the R21 names in §12.3 — plus `EVIDENCE-MANIFEST.sha256` and the
approved plan bytes." Both are now round-number-generic per R20's own minimum-repair suggestion (tie the
sentence to §12.3's manifest list rather than a hardcoded literal), so this class of defect cannot recur on the
next round bump by construction. **Closed**, and durably so.

### R20 MAJOR-C (§5.1's object-first negation covered only `变`/`动`, so `结构别改` was a live false positive) — confirmed closed

§5.1 (`FINAL-EXECUTION-PLAN.md:520-526`) now states the structure leg is disabled by the verb-first generated set
`(不|别|不要|不用|无需|不必) × (改|动|调整|变) × 结构` **together with** the object-first generated set
`结构 × (不|别|不要|不用|无需|不必) × (改|动|调整|变)`, so `结构别改`, `结构不改`, `结构别调整` and `结构不调整`
are now recognized. The fixture list (line 530) explicitly pins `结构别改 negative` — R20's exact mechanical
counterexample sentence fragment is now a named negative fixture. §14's `R-SIGNAL` corpus (`4780-4784`)
independently re-states both complete generated sets identically. I re-ran R20's exact adversarial sentence
`帮我优化下设置页面，结构别改，其他随便你改` against the current grammar: leg 1 (`优化`), leg 2 (`设置页面`),
leg 3 (`结构`, negated by `结构别改` ∈ the object-first generated set) — the structure leg is now correctly
recognized as negated. **Closed.**

## Mechanical re-test

### R16 B1 (ref-baseline drift)

Independently re-derived, not restated from R18-R20: `git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse
HEAD` / `@{u}` / `HEAD^{tree}` all equal the exact tuple `FINAL-EXECUTION-PLAN.md:73-74` pins
(`BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70fa8ae95159d31763d57613194b74d68d`,
`BASELINE_TREE=f15777109b3f524ab0a87888ba74ee4f825a8066`), 0 ahead / 0 behind, at both checkpoints. **B1 stays
closed.**

### R16 B2 (transfer recovery total product) — four counterexamples re-run against current bytes

Governing table: `transfer_invocation_kind` at `FINAL-EXECUTION-PLAN.md:2068-2085` (seven ordered disjoint
predicates → six kinds), outcome product at `FINAL-EXECUTION-PLAN.md:2103-2126`.

a. **Nonterminal journal, no scan, proven-dead controller, fresh E1 attested, then the exact `plan-transfer
   recover` PreTool with no pending candidate.** Fresh E1 selects predicate 3 (`NEWLY_ATTESTED_EVENT`,
   `:2081`) → event-bearing, `recovery_capability_or_null=null`, `owner_census=PROVEN_DEAD` (manifest liveness
   oracle) → `PROVEN_DEAD_RECOVERY_ISSUED` (`:2121`), issuing an E1-bound capability and denying the attempted
   controller in the same invocation (`:2093-2095`, "an event-bearing kind may never consume a capability...
   in the same invocation that minted or refreshed it"). The next `plan-transfer recover` invocation (no scan,
   current event still E1) matches predicate 4(a) exactly (`:2082`) and consumes the capability. **Unique
   conforming transition confirmed**; named verbatim in §15 (`:5085-5086`, "`NO_NEW_EVENT_RECOVER_CONTROLLER`
   succeeds with no event append").
b. **Ordinary count 256, one-item scan (final drain), then a retry with no new `UserPromptSubmit`.** The one
   remaining item selects predicate 1 (`SCAN_DRAIN_EVENT`, `:2079`); `ledger_admission=FULL` at 256 does not gate
   kind selection ("Both values run the same journal proof and owner census," `:2054`). Once drain proves
   `consumed_count == submitted_count`, `transfer_scan` is removed and the very next PreToolUse/state-mutating
   PostToolUse/Stop re-enters the table with `transfer_scan` absent, selecting predicate 4, 5 or 6 "without
   another `UserPromptSubmit`" (`:2096-2098`). **Unique conforming transition confirmed**; named verbatim at
   `:5086-5087`.
c. **ISSUED E1 capability when fresh E2 is attested before controller consumption.** Predicate 3 fires again for
   E2 (first-match order beats predicate 4). The outcome row "`ISSUED` whose `dead_owner_sha256` equals the
   recomputed `controller_owner.owner_sha256`" applies without re-running the liveness oracle (`:2122`, "the
   oracle is never re-run against a recorded dead owner") → `STALE_CAPABILITY_ROTATED`, rotating the E1-bound
   capability onto E2 at a strictly higher `recovery_sequence`, old `capability_id` "permanently unconsumable,"
   persisted controller bytes rebound to the replacement `authority_id`. **Unique conforming transition
   confirmed**; named verbatim at `:5081-5083`.
d. **IN_PROGRESS RECOVERY owner that has crashed, on fresh E2.** After predicate 4(a) consumed the E1 capability
   (`recovery_capability_or_null=CONSUMED`), fresh E2 again selects predicate 3. Outcome row "`CONSUMED`, whose
   consume rename bound the fresh RECOVERY `controller_owner`" with `owner_census=PROVEN_DEAD` (crashed) →
   `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object with a fresh capability at a strictly higher
   `recovery_sequence` (`:2126`). **Unique conforming transition confirmed**; named verbatim at `:5083-5084`
   ("recovery-owner death after consume (fresh higher-sequence capability from a CONSUMED arm)").

All four counterexamples have a unique, mechanically determined conforming transition in the current bytes.
**R16 B2 remains closed.**

### Both routing grammars

**§4.2 bullet 1's trailing-content contract for metadata aliases** (`FINAL-EXECUTION-PLAN.md:465-471`). The
clause-terminal / closed-set (`的|里|中|下|报告|登录|设置|任务|功能|页面`) contract for the metadata-alias arm of
`进入|切换到|切到|回到|转到` is present, matches the `打开|继续` bullet's identical contract, and the three
required frozen negative examples (`进入 luca app 项目页面看看`, `切到 luca app 项目功能`,
`回到 luca app 项目的登录流程`) appear verbatim at `:495-497`. I attempted the same adversarial construction R19
and R20 already tried (a bare trailing particle outside the closed set, e.g. `进入 luca app 看看`/marker-optional
edge cases) and could not construct a divergent reading beyond what R19/R20 already found benign
(deny-by-default under either interpretation). **Held**, consistent with prior rounds.

**§5.1's now two-directional negation sets** (`FINAL-EXECUTION-PLAN.md:509-532`) against the §14 `R-SIGNAL`
corpus (`:4780-4791`). Both the verb-first and object-first generated cross-products are present and identical
in both sections (independently `diff`-checked below). R20's counterexample (`结构别改` in isolation, and
`帮我优化下设置页面，结构别改，其他随便你改` in context) now resolves correctly (see closure section above). I
attempted further adversarial variants — `结构不用改`, `结构无需调整`, `结构别不变`（malformed double-negative,
correctly falls outside the closed enumeration and is denied rather than misparsed) — and found no new residual
gap in this specific structure-leg grammar.

**A genuine residual gap was found, but in a different bullet than either task-named grammar: §4.2's own
project-directive negator set.** See Finding MAJOR-2 below. This is the "try hard to construct a residual false
positive or false negative" result this round's brief asked for; it survived because prior rounds' adversarial
attempts were both scoped to the metadata-alias trailing-content contract and the §5.1 structural-negation set,
never to §4.2's separate, plainer negation rule for the directive itself.

## Independent re-derivation

### §0.3 KILL-02 tuple, hop by hop, against real git objects (not trusted from any prior report or from the plan's own prose)

- `BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70fa8ae95159d31763d57613194b74d68d`,
  `BASELINE_TREE=f15777109b3f524ab0a87888ba74ee4f825a8066` — confirmed via `git rev-parse HEAD`, `git rev-parse
  @{u}`, `git rev-parse HEAD^{tree}`, 0 ahead / 0 behind, at both checkpoints.
- `PRIOR_BASELINE_COMMIT=8e9726d8477f8a287722c09345f07182cc86d1d5`,
  `PRIOR_BASELINE_TREE=fe67c639838340beca9556e76773f0e1b7d41c2b` — confirmed: `git rev-parse
  8e9726d8…^{tree}` returns exactly `fe67c639…`; `git merge-base --is-ancestor 8e9726d8… HEAD` → true.
- **Ancestry, hop by hop, independently re-walked** (`git log -1 --format='%P' <hash>` for all 18 listed hashes,
  a script, not trusted from prose): every stated parent-child edge is a real git parent relationship.
  `74aae922…` is confirmed a real two-parent merge (`11a14c0f…` + `6915b5fc…`). `a78abb70…`'s real parent is
  `6edcabde…` (not `fd0919bb…`, which merely precedes it in list position); `git merge-base --is-ancestor
  6edcabde… 8e9726d8…` → true, so `6edcabde…` is correctly omitted from the 18-hash intervening list (already an
  ancestor of `PRIOR_BASELINE_COMMIT`). `git log --format='%H' 8e9726d8…..c146cb70…` returns exactly an 18-hash
  set, confirmed byte-for-byte identical (as a set) to the plan's 18-hash list via `diff` on sorted files. A
  Python script confirmed every edge's parent occupies an earlier list position than its child — a valid
  topological (not necessarily linear) sort, exactly as the plan's own text claims (`:78`, "in parent-to-child
  topological order").
- **78-file / 12-outside-`framework-audit/**` delta.** `git diff --name-status 8e9726d8… c146cb70…` returns
  exactly 78 lines; exactly 12 lie outside `framework-audit/**`. Confirmed exact match to the plan's stated
  counts (`:88`).
- **Three envelope-member blob hashes** (`FINAL-EXECUTION-PLAN.md:93-95`). `git rev-parse
  c146cb70…:<path>` for all three: `.claude/hooks/post-edit.mjs=b534aa6eabaee449b551edce41a7cf7d4c6f8d30`,
  `.gitignore=40d23300976eb0f01e02e49487f92645bcd49a9e`,
  `scripts/test-project-scope-guard.mjs=2d056cd674ddad28ffc7f4958fd4b0a0db3412a8` — all three match the plan's
  pinned blob hashes exactly. (`.claude/observability/rules.yaml=e6a9a7a847e673848895e1205c87ac4523f09e9a` and
  `scripts/test-auto-open.mjs=f4719bd33599ea60acd9cc8bc1617c1173a05189`, both pinned as evidence-only in the
  "remaining nine" list, also match exactly.)

### My own membership classification of all twelve non-audit paths (literal-line grep against §12.1's block
`FINAL-EXECUTION-PLAN.md:4426-4469` and §12.2's blocks `:4491-4541` + `:4545-4602`, not trusted from §0.3's
prose)

| Path | Blob hash matches `BASELINE_HEAD`? | Literally present as its own line in §12.1 or §12.2? | My classification | Plan's classification |
|---|---|---|---|---|
| `.claude/hooks/post-edit.mjs` | yes | **yes** — §12.1 bare path | envelope member | envelope member — agrees |
| `.gitignore` | yes | **yes** — §12.1 bare path | envelope member | envelope member — agrees |
| `scripts/test-project-scope-guard.mjs` | yes | **yes** — §12.2 "Additional exact tracked paths" | envelope member | envelope member — agrees |
| `.claude/observability/rules.yaml` | yes | no — only nested under `payload/.claude/observability/rules.yaml` in both hook-release trees | non-envelope | non-envelope — agrees |
| `scripts/test-auto-open.mjs` | yes | no | non-envelope | non-envelope — agrees |
| `.claude/observability/observations.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/episodic/index.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/episodic/archive/2026.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/evals/eval-log.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/evals/routing/fixtures.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/retrieval-log.jsonl` | n/a | no | non-envelope | non-envelope — agrees |
| `memory/scripts/propose_semantic.py` | n/a | no | non-envelope | non-envelope — agrees |

**Exactly three of twelve are envelope members; my independent classification matches the plan's own §0.3
partition exactly, for all twelve paths.** This is the exhaustive re-application R20 demanded and R19/R20
themselves omitted (each fixed only the one instance it happened to check). No sibling misclassification
survives.

### §16 runner list vs §12.1/§12.2 test-file lists

Extracted every `scripts/test-*.mjs` literal from §12.2's "Additional exact tracked paths" (36 files) and from
§12.1 (2 files: `test-runtime-bridge.mjs`, `test-runtime-activation.mjs`), and every `node scripts/test-*.mjs`
line from §16 (38 files), via `comm` on sorted sets: §16 is an exact superset of §12.2's 36 test files, and the
only two extra entries are exactly the two §12.1 test files. `scripts/test-harness.mjs` and
`scripts/test-project-substrate.mjs` — R20's MINOR-3 — are now both present in §16 (`:5556-5557`). **R20
MINOR-3 confirmed closed.**

## Findings

### MAJOR-1 — §2.17's "Worktree state" row asserts a false git fact about the current bytes

**Location:** `FINAL-EXECUTION-PLAN.md:366` (§2.17, "Worktree state" row), in direct tension with the adjacent
"Convergence condition" row at `FINAL-EXECUTION-PLAN.md:363` ("this plan states no claim about the repository's
momentary worktree or ref state").

**Contract conflict:** line 366 states, as a load-bearing evidentiary claim: *"the only tracked modification is
`FINAL-EXECUTION-PLAN.md` itself... No path in any §12.1 or §12.2 list carries tracked or untracked dirt, so
KILL-03 is inert."* This is a specific, falsifiable factual claim about live git state — exactly the kind of
claim the immediately preceding row (line 363) says the plan should not make ("this plan states no claim about
the repository's momentary worktree or ref state; those are read back at review time").

**Mechanical counterexample:** `git -C /Users/luca/Desktop/项目/muse/lucagstack status --porcelain`, run at both
recorded checkpoints of this review, shows **four** tracked modifications, not one:

```
 M .claude/observability/observations.jsonl
 M .claude/observability/rules.yaml
 M framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
 M memory/evals/routing/fixtures.jsonl
```

`.claude/observability/observations.jsonl`, `.claude/observability/rules.yaml` and
`memory/evals/routing/fixtures.jsonl` are all real, currently-dirty tracked files that the row's "the only
tracked modification is `FINAL-EXECUTION-PLAN.md` itself" claim says do not exist.

**Why this matters, and why it is MAJOR not BLOCKER:** all three extra dirty paths are, independently confirmed
above, non-envelope paths (all three are explicitly named in §0.3's own "remaining nine" list as paths "never
staged, packaged or modified by this plan"), so `KILL-03`'s actual, practical outcome — inert — happens to
remain correct. The defect is confined to the row's literal factual assertion, not to any executable mechanism;
this is exactly R19 MAJOR-1's class of defect (a false claim inside the plan's own evidentiary closure map about
git state under review), recurring in the very row R19's fix introduced to replace the previous false claim.
Given this is the third round in five (R19, R20, R21) to catch a fresh instance of "§2.17 asserts a git fact
that isn't true right now," this looks structural: §2.17 keeps re-asserting point-in-time git state as static
prose, and every subsequent round of unrelated background activity (session logging, memory/eval writes) can
falsify it again without anyone editing §2.17 itself.

**Minimum repair:** delete the "Worktree state" row's specific "the only tracked modification is..." sentence
and replace it with the same category of disclaimer the adjacent "Convergence condition" row already uses —
e.g., "KILL-03 is satisfied exactly while no path in a §12.1 or §12.2 list carries tracked or untracked
modification; this is read back fresh at each review's preflight, not asserted as a momentary snapshot in this
prose" — so the row cannot go stale again on the next round simply because unrelated background files were
touched. This mirrors the exact repair pattern R20's MAJOR-B minimum-repair already established for round
numbers (tie the sentence to a live check, not a hardcoded moment-in-time claim).

### MAJOR-2 — §4.2's project-directive negator set omits bare `不`, creating a false-positive project-switch authorization, and the plan's own "no unexplained asymmetry" claim about it is false

**Location:** `FINAL-EXECUTION-PLAN.md:481-482` (§4.2's negation rule) versus `FINAL-EXECUTION-PLAN.md:520-528`
(§5.1's negation rule) and `FINAL-EXECUTION-PLAN.md:358` (§2.17's closure-map description of the R18 fix).

**Contract conflict:** §4.2 states: *"A negator `不要|别|不用|无需|不必|不是` before the directive cancels
it"* (`:481-482`) — a closed six-member set: `不要`, `别`, `不用`, `无需`, `不必`, `不是`. Note this set does
**not** contain bare `不`. §5.1 states its structural-negation set is *"the same negator alternation §4.2
already declares authoritative"* (`:522-523`) and later that *"the two negation grammars in this document share
one negator alternation with no unexplained asymmetry"* (`:527-528`) — but §5.1's own set, stated one line
earlier, is `(不|别|不要|不用|无需|不必)` (`:522`), which contains bare `不` and does **not** contain `不是`.
§2.17's closure-map row for the R18 fix repeats the same claim verbatim: *"matching the negator alternation §4.2
already declares authoritative"* (`:358`). These two sets are not identical — the symmetric difference is
`{不, 不是}` (§4.2 has `不是` but not `不`; §5.1 has `不` but not `不是`) — so the "shares one negator
alternation with no unexplained asymmetry" claim is false as a literal statement about set equality, and it has
been false, unchanged, since at least R18's original fix (line 358 has carried this exact wording through every
round since).

**Mechanical counterexample.** Take the clause `不进入 luca app 项目` ("don't enter the luca app project"). Per
§4.2 bullet 1: directive `进入`, target `luca app` (a registered metadata alias), adjacent marker `项目`
immediately following the alias with no trailing content (clause-terminal) — this satisfies every stated
positive requirement of the bullet verbatim, exactly as `进入luca app项目` does in the required-example corpus
(`:490`). Per §4.2's negation rule, only a token from the closed set `不要|别|不用|无需|不必|不是` immediately
before the directive cancels it. The token immediately preceding `进入` here is the single character `不` — not
`不要` (a distinct two-character token requiring the character `要` to also be present, which it is not), and
not any other set member. By the literal text as written, no negator in §4.2's set matches, so this clause is
**not** recognized as negated and is treated as an ordinary affirmative selection clause — authorizing
resolution to canonical `muse` even though the user explicitly wrote "don't enter." This directly reproduces, in
a new place, the exact class of harm R18's Finding 2 (`别`-form structural negation) and R20's MAJOR-C
(`结构别改`) were both written to fix: a negated user statement is misread as an affirmative one, but here the
consequence is an unwanted **project-switch mutation** (§8.1's `SELECT(T,SWITCH)` intent classification, feeding
the project-transaction machinery in §9), which is a materially more consequential class of false positive than
either prior finding's misrouted semantic obligation.

I checked whether §4.2's exclusion of bare `不` might be a deliberate, explained design choice (e.g., bare `不`
judged too ambiguous a token to safely detect without more context) — no such rationale appears anywhere in
§4.2's text, and no such caveat would be internally consistent anyway, since §5.1 admits bare `不` as a safe
structural negator in an equally terse register (`不改结构`, `不动结构`), and the document elsewhere freely uses
bare `不` as a negator prefix in other closed grammars (e.g., the task-cancel form `不做(这个任务)?了` at
`:3440`). Nothing in the text explains why project-directive negation specifically withholds bare `不` while
every sibling negation grammar in the same document admits it.

**Why this matters:** this is a genuine, mechanically demonstrable grammar-completeness gap that changes routing
behavior on plausible natural Chinese input — exactly the kind of defect a routing red team specializing in this
section exists to find, which is why it is MAJOR rather than MINOR. It is not BLOCKER because it does not
prevent the plan from being executed or red-teamed as written, and it does not reopen any of R16's B1/B2 or
R18/R19/R20's already-closed findings; it is a fresh, previously-uncaught gap in a bullet none of the four prior
adversarial rounds specifically attacked (R18's Finding 2 and R20's MAJOR-C both attacked §5.1's structural
negation; none attacked §4.2's own negator set directly, only its trailing-content contract).

**Minimum repair:** add bare `不` to §4.2's negator set (`不|不要|别|不用|无需|不必|不是`), and add the
corresponding required negative example (`不进入 luca app 项目` → no project selection) to §4.2's frozen example
corpus and to whatever `R-ALIAS`/`R-SIGNAL` fixture list exercises this bullet. Separately, either (a) add
`不是` to §5.1's structural-negation set for genuine symmetry (with the corresponding `不是结构` generated-form
fixtures), or (b) rewrite the "share one negator alternation with no unexplained asymmetry" claim at both
`:527-528` and `:358` to state precisely what is actually shared (the five-member intersection `别|不要|不用|无需|不必`)
and explicitly name the one-member difference on each side, so the claim is true as written rather than
approximately true.

### MINOR-1 — a duplicated word in §5.1's negation-set prose

**Location:** `FINAL-EXECUTION-PLAN.md:523-524` (word wraps across the line break).

**Contract conflict/counterexample:** the sentence reads "...so `别动结构` and `别调整结构` are recognized
exactly as `不动结构` and `不调整结构` are — together\ntogether with the object-first generated set..." — the
word "together" is duplicated across the line wrap (confirmed with a script scanning the whole file for
adjacent duplicate words spanning line breaks; this is the only genuine instance found besides one benign
`no no-D` at `:3688`, which is intentional English — "there is no no-D WAITING_HUMAN state" — not a typo).

**Why this is MINOR:** purely cosmetic; the sentence is still unambiguously parseable with the duplication
removed, and no mechanism or fixture depends on this exact wording.

**Minimum repair:** delete the second "together" (or the first), leaving "...are — together with the
object-first generated set...".

### MINOR-2 — §12.3's round-closure prose has a stray duplicated "as" and an inconsistent "stale-round" label for R20

**Location:** `FINAL-EXECUTION-PLAN.md:4675-4682` (§12.3, the paragraph naming failed-cycle prior inputs).

**Contract conflict/counterexample:** the paragraph reads, verbatim: *"...`PLAN-AGENT-REVIEW-R18.md`,
stale-round `REDTEAM-ROUND-18-ROUTING.md` and `PLAN-AGENT-REVIEW-R19.md` as\nand `PLAN-AGENT-REVIEW-R20.md` as
immutable prior inputs..."* — a stray duplicate "as" appears before "and `PLAN-AGENT-REVIEW-R20.md`", an
evident leftover from mechanically appending the R20 name onto a sentence that previously ended at R19 without
removing the original trailing "as". Separately, `PLAN-AGENT-REVIEW-R17.md` is explicitly labeled "stale-round"
in this same list (correct — R17's own gate verdict was invalidated by mid-review ref drift) but
`PLAN-AGENT-REVIEW-R20.md` is not, even though R20's own gate conclusion explicitly states "This round is
**stale** by `KILL-02`" (`PLAN-AGENT-REVIEW-R20.md:531`, and echoed in this plan's own §2.17 row at `:361`,
"also stale on a mid-review ref advance") — the identical failure mode R17 was labeled for.

**Why this is MINOR:** this is confined to descriptive prose inside a paragraph whose only load-bearing content
— the literal file lists in §12.3's fenced code blocks (`:4630-4673`) and the generic "no completed receipt is
ever edited... a stale round's verdict — PASS or FAIL — grants nothing" rule (`:4681-4682`) — is unaffected and
independently correct (confirmed above: R21's three required-new outputs are correctly listed and correctly
confirmed absent; `REDTEAM-ROUND-19-*`/`REDTEAM-ROUND-20-*` are correctly never required). Nothing downstream
reads the "stale-round" adjective in this sentence as an authority; it is informational only.

**Minimum repair:** remove the stray duplicate "as" (the sentence should read "...`REDTEAM-ROUND-18-ROUTING.md`,
`PLAN-AGENT-REVIEW-R19.md` and `PLAN-AGENT-REVIEW-R20.md` as immutable prior inputs...") and add the
"stale-round" qualifier to `PLAN-AGENT-REVIEW-R20.md` for consistency with `PLAN-AGENT-REVIEW-R17.md`'s
labeling of the identical failure mode.

## Remaining consistency scan

- §0.3 / §2.15–2.17 / §3 / §13 baseline tuple: consistent with each other and with live git on
  `BASELINE_HEAD=BASELINE_UPSTREAM=c146cb70…`/`BASELINE_TREE=f15777109…` and the 18-hash ancestry. No numeric
  drift found beyond the two findings above.
- §4.2 and §5.1's negator alternations were checked against each other and against §14's `R-SIGNAL` corpus; the
  verb-first and object-first structural sets are identical between §5.1 and §14 (`diff`-confirmed). The one
  genuine asymmetry found is between §4.2 and §5.1/§14 themselves — logged as MAJOR-2.
- §5.3's `transfer_invocation_kind` table is consistent everywhere it is cross-referenced: §6.1
  (`FINAL-EXECUTION-PLAN.md:2916-2917`), §7.1 (`:3169`), §8.2 (`:3550`), §8.6 (multiple bullets `:3803-3821`) all
  describe the identical seven-predicate/six-kind partition with the identical "no default" property. No
  divergent restatement found.
- §12.3's required-new-output list (`:4628-4673`) matches exactly the three names this task's brief specifies as
  required-new (`PLAN-AGENT-REVIEW-R21.md`, `REDTEAM-ROUND-21-ROUTING.md`, `REDTEAM-ROUND-21-TRANSACTION.md`),
  and all three were independently confirmed absent before this report was written.
- §17's handshake gate (`:5578-5581`) correctly requires "the cycle-specific R21 receipt" and "two independent
  Round-21 reviewers" against "one unchanged SHA," consistent with §0.2 and §13 step 1.
- **Round-numbering hygiene:** R16, R17, R18, R19, R20 and `REDTEAM-ROUND-18-ROUTING.md` were treated strictly as
  immutable prior inputs (read, never modified) throughout this review. `REDTEAM-ROUND-19-ROUTING.md`,
  `REDTEAM-ROUND-19-TRANSACTION.md`, `REDTEAM-ROUND-20-ROUTING.md` and `REDTEAM-ROUND-20-TRANSACTION.md` were
  never produced (both R19 and R20's Plan Gates failed before any red-team dispatch), and the plan's text
  correctly does not require them (`:4683`, "were never produced and are not required by any gate"). This file
  (`PLAN-AGENT-REVIEW-R21.md`) is the sole required-new output produced by this round.
- No unreachable table arm and no silent default was found in the §5.3/§8.1–8.6/§9.1–9.3 tables re-read this
  round, beyond what is logged above.

## Verification

This report was read back to EOF after writing, before running the post-write hash/ref checks below. The plan
file's SHA-256/line count and the framework `HEAD`/`@{u}`/tree were re-run immediately after writing this
report, and `REDTEAM-ROUND-21-ROUTING.md`/`REDTEAM-ROUND-21-TRANSACTION.md` were re-confirmed absent at the same
time; all of those post-write values, together with this report's own SHA-256 (computed after writing, not
embedded in the report itself), are reported in the accompanying final chat message together with the verdict
and counts.

## Gate conclusion

Plan SHA-256: `221ce13c87f2c3a33a67e5da9539d70b59fa6786137090684d8ac642184cd3f3` (5,588 lines) — unchanged and
drift-free across both recorded checkpoints of this review.

Framework `HEAD`: `c146cb70fa8ae95159d31763d57613194b74d68d` (= upstream, tree
`f15777109b3f524ab0a87888ba74ee4f825a8066`, 0 ahead / 0 behind), unchanged across both recorded checkpoints.

**Verdict: `NOT_READY_FOR_REDTEAM`**
- BLOCKER: 0
- MAJOR: 2
- MINOR: 2

R16's B1/B2 closures, both R18 routing repairs, and every R19/R20 MAJOR/MINOR (including the exhaustive
twelve-path re-classification R20 demanded) are independently confirmed closed under fresh adversarial re-test
against current bytes. This round is blocked from `READY_FOR_REDTEAM` by two fresh MAJOR findings: (1) §2.17's
"Worktree state" row falsely claims `FINAL-EXECUTION-PLAN.md` is the only tracked modification, when three more
tracked files (all correctly non-envelope, so `KILL-03` remains practically inert) are also currently dirty —
the third recurrence of this exact defect class in as many rounds; and (2) §4.2's project-directive negator set
omits bare `不`, producing a genuine mechanical false-positive project-switch authorization for negated clauses
like `不进入 luca app 项目`, while the plan's own repeated claim that §4.2 and §5.1 "share one negator
alternation with no unexplained asymmetry" is factually false. Two MINOR cosmetic prose defects (a duplicated
word in §5.1, a stray duplicated "as" plus an inconsistent stale-round label in §12.3) are also logged. The next
round must repair both MAJORs — preferably by making §2.17's worktree-state assertion self-updating rather than
static prose, and by adding bare `不` to §4.2's negator set with a corresponding frozen negative example — before
it can be considered `READY_FOR_REDTEAM`.
