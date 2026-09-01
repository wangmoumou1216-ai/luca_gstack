# Plan Agent Gate Review — Round 28

Reviewer: independent R28 gate reviewer. Scope: `/Users/luca/Desktop/项目/muse/lucagstack`. No project switch/bind performed.

## Receipt

- Plan reviewed: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`
- Actual plan SHA-256 at start: `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc` — match
- Actual plan SHA-256 immediately before writing this report: `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc` — match
- Expected/actual line count at both checkpoints: 5762 / 5762 — match
- Expected `BASELINE_HEAD`/`BASELINE_UPSTREAM`: `c146cb70fa8ae95159d31763d57613194b74d68d`; expected `BASELINE_TREE`: `f15777109b3f524ab0a87888ba74ee4f825a8066`
  - At start: `HEAD=c146cb70fa8ae95159d31763d57613194b74d68d`, `@{u}=c146cb70fa8ae95159d31763d57613194b74d68d`, `tree=f15777109b3f524ab0a87888ba74ee4f825a8066`, ahead/behind `0/0` — match
  - Immediately before writing: identical values re-read, `0/0` — match, no drift
- KILL-03 derivation: extracted all literal path lines from the §12.1 and §12.2 code fences (147 non-blank lines) and ran `git status --porcelain=v1 --untracked-files=all -- <path>` per path. Zero matches — no §12.1/§12.2 path carries tracked or untracked modification. The working tree's actual dirt (`.claude/observability/observations.jsonl`, `.claude/observability/rules.yaml` at repo root, `memory/evals/routing/fixtures.jsonl`, and the untracked prior-round `PLAN-AGENT-REVIEW-R19..R27.md` / `REDTEAM-ROUND-24..27-*.md` files, plus an unrelated `.playwright-cli/`) does not literally match any §12.1/§12.2 line — none of those bare paths appear verbatim in either envelope list. KILL-03 holds.
- Downstream (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`): attempted `ls /Users/luca/Desktop/项目/muse/` to locate the downstream checkout; the project-scope guard refused verbatim:
  `Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目/muse/）；禁止 no-pin/跨项目/失效 identity 访问。`
  Marked `UNVERIFIABLE_FROM_THIS_SESSION`; did not route around it.
- Coverage statement: read byte 0 → EOF of the 5762-line plan in nine sequential chunks (1–500, 501–1000, 1001–1500, 1501–2000, 2001–2500, 2501–2950, 2951–3233, 3234–3424, 3424–3724, 3724–3963, 3964–4190, 4191–4536, 4537–4829, 4829–4912, 4913–5309, 5309–5568, 5569–5762). Every line was covered; no range was grep-only or skipped.
- Drift statement: no drift observed at any checkpoint; baseline tuple and plan bytes held throughout the review.
- Confirmation: before starting, `PLAN-AGENT-REVIEW-R28.md`, `REDTEAM-ROUND-28-ROUTING.md` and `REDTEAM-ROUND-28-TRANSACTION.md` were all absent (verified by `ls`, all three returned "No such file or directory"). Only `PLAN-AGENT-REVIEW-R28.md` is created by this review.

## Verdict

`NOT_READY_FOR_REDTEAM`

- BLOCKER: 1
- MAJOR: 1
- MINOR: 1

## Round-27 closure

1. **The promise was never wired (transaction BLOCKER).** CONFIRMED CLOSED as a creation-time gate: §5.2 (`FINAL-EXECUTION-PLAN.md:686-701`) now creates a bare-signal obligation only in status `SIGNAL_UNCONFIRMED`, and the creation-placement overlay (`:702-726`) routes a bare-signal basis to `SIGNAL_UNCONFIRMED` rather than directly to `PENDING`. **However**, see Finding 1 below — the promise's *other* half ("denies no scope", the transition-out rule, and totality across the tables that key off `route_obligation.status`) was not wired, which is a residue of the identical defect class, not a fabrication on my part contradicting this closure.
2. **§4.2 stranding.** CONFIRMED CLOSED. §4.2 (`:484-580`) is now the two-rule mechanical scan (`:486-498`) with the deleted-grammar disclosure and no trailing-content authorization grammar anywhere in the section. No contradiction with the two paragraphs that follow.
3. **§5.1 stranding.** CONFIRMED CLOSED. §5.1 (`:583-786`) contains no per-`NEG`/per-`ADV` fixture demand and no "negated clauses do not count" language; the corpus at `:610-622` treats every listed string identically (signal + `negation_context`, no obligation distinction by polarity).
4. **§8.1 dangling import.** CONFIRMED CLOSED. §8.1 (`:3547-3550`) states explicitly: "It consumes §4.2's `alias_resolution` candidates and §5.1's `semanticRouteAxis`+`negation_context` as **evidence only**, and imports no negation, quoting or clause-structure verdict from those sections, which define none." Verified by reading the full classifier spec (`:3551-3588`) — its own control-word negation handling (task-cancel, correction prefixes) is self-contained and does not reference the deleted §4.2/§5.1 machinery.
5. **E1 re-openable on adjacent phrasing.** CONFIRMED CLOSED. §4.2 (`:560-563`) freezes `进入 luca app 项目页面看看`, `切到 luca app 项目功能`, `回到 luca app 项目的登录流程` as producing one candidate each with `marker_present:true`, explicitly noting this reopens-E1 family is now candidate-producing. §14 R-ALIAS (`:4917-4922`) and R-SIGNAL (`:4923-4942`) reference the same corpus. The `「进入 luca app 项目」是个例子` opposite-outcome conflict is resolved: §4.2 (`:574-578`) and §14 R-SIGNAL (`:4930-4931`) both now state the identical outcome (candidate produced, no suppression) for the identical string.

All five Round-27 items are genuinely closed as literally described.

## Residue sweep

Searched by semantics and import-style phrasing (`same … as §`, `per §`, `defined in §`, `as in §`, plus free-text `negation`, `NEG`, `ADV`, `NEG_SUSPECT`, `clause-terminal`, `authorizes alias`) across the whole file, not just the names of deleted symbols.

- Every remaining `negation`/`NEG`/`ADV` hit resolves to either (a) the R18–R27 historical closure-map rows in §2.16–2.17 correctly describing what was deleted (out of scope per §17.0/§0.3), (b) §4.2/§5.1's own non-adjudication disclosures, or (c) §8.1's *own*, self-contained control-word negation handling for task-cancel/correction/wait-answer grammars (`:3551-3583`, `:2477-2481`) — which the document explicitly disclaims as importing anything from §4.2/§5.1 (`:3547-3550`). No section still consumes a negation, quoting or clause-structure *verdict* from §4.2/§5.1.
- One candidate flagged and cleared: §5.2's `NEW_TASK_SIGNAL_WITH_PROJECT` rule states "After quote/report/negation filtering, it requires exactly two independent operative regions" (`:731-733`). This reads suspiciously like an import of deleted machinery. On inspection it is not residue: the raw-span/clause-boundary mechanics that do this splitting are defined in §5.4 (`:2493-2496`, "the same scalar→raw-span map selects the unique project clause, delimiter and contiguous task-side region") and in §8.1's own control-word classifier (`:3551-3588`), neither of which is deleted machinery. It is, however, an *uncited* forward reference — every other cross-section dependency in this document says "per §X" or "the §X grammar"; this one doesn't name where "quote/report/negation filtering" is defined. MINOR, noted in Findings.
- **New residue found, not flagged by any prior round**: the `SIGNAL_UNCONFIRMED` status introduced by this round's own repair (item 1 above) is declared and created in exactly one place — §5.2 (`:662`, `:686-701`) — and appears **nowhere else in the entire 5762-line document**. A full-document grep for the literal string `SIGNAL_UNCONFIRMED` returns exactly 5 hits, all inside §5.2 plus the historical closure-map row that describes the fix. Every table that enumerates `route_obligation.status` elsewhere in the contract — §7.1's scope-authorization list, §8.1's `TARGET_EXISTS` route-action table, §8.1's main route-status × route-event-kind matrix, §8.5's status/product overlay — has no row for it, and §14/§15 have no fixture or mutant naming it. This is the same defect *shape* as the original R27 BLOCKER (a promise stated in prose, never connected to the state machine), now recurring in the transition-out path and the totality of the consuming tables instead of the creation path. See Finding 1.

## Mechanical re-test

- **R16 B2 mechanics** — retested against §5.3's `transfer_invocation_kind` seven-predicate table (`FINAL-EXECUTION-PLAN.md:2175-2246`) and the capability-product outcome table (`:2220-2233`):
  - (a) nonterminal journal, no scan, proven-dead controller, fresh E1 attested → predicate 3 (`NEWLY_ATTESTED_EVENT`, `:2188`) fires, issues `PROVEN_DEAD_RECOVERY_ISSUED` bound to E1 and denies the attempted controller of that same invocation (`:2200-2202`); the subsequent bare `plan-transfer recover` PreTool with no pending candidate then uniquely matches predicate 4a (`:2189`) and succeeds with no new event. Unique conforming transition confirmed.
  - (b) same at ordinary count 256 with a one-item scan: `ledger_admission=FULL` (`:2160-2173`) plus predicate 1 `SCAN_DRAIN_EVENT` (`:2186`) drains the one item, equality removes the scan (`:2203-2205`), and the retry with no new `UserPromptSubmit` re-enters the table with `transfer_scan` absent, landing on predicate 4/5/6 as applicable. Confirmed.
  - (c) ISSUED E1 capability meeting fresh E2 before consumption → outcome-table row `ISSUED` with `dead_owner_sha256` matching → `STALE_CAPABILITY_ROTATED` (`:2229`), rotating to a strictly higher `recovery_sequence` bound to E2, old `capability_id` permanently unconsumable. Confirmed, matches the required named cell at `:5230-5231`.
  - (d) IN_PROGRESS RECOVERY owner crashed, fresh E2 → `CONSUMED` arm, census `PROVEN_DEAD` → fresh higher-sequence capability (`:2233`). Confirmed.
  - All four have a unique conforming transition; no ambiguity or missing cell found.

- **Totality/reachability, §5.3/§8.1–8.6/§9.3**: §5.3's `transfer_invocation_kind` table is explicitly total (seven disjoint ordered predicates, first-match-wins, `:2182-2208`) and I found no gap in it. §9.3's recovery-control table (`:4096-4104`) and claim-state census (`:4130-4138`) are similarly closed with explicit catch-all rows. §8.1/§8.5's route-status tables carry an explicit build-time totality claim ("construction requires exactly one match for every status and rejects a missing or duplicate match rather than defaulting", `:3508-3510`; "Enum-to-row generation proves one and only one TARGET_EXISTS row per status", `:5178`). **`SIGNAL_UNCONFIRMED` breaks this totality claim**: it is a member of the `route_obligation.status` enum (`:662`) but has no row in the §7.1 scope list, the §8.1 `TARGET_EXISTS` table, the §8.1 main matrix, or the §8.5 status/product overlay. This is exactly what the task asked me to check ("Note SIGNAL_UNCONFIRMED is a new status: check it does not break any totality claim") — it does. See Finding 1.

- **§12.1–12.2 / §13 / §10 coherence**: §13 step 1 (`:4842-4844`) correctly names "obtain new `PLAN-AGENT-REVIEW-R28.md`... two Round-28 PASS reports"; §12.3's round-pointer invariant (`:4818-4821`) and required-new output list (`:4786-4788`) correctly identify R28 as the lowest missing round given the files on disk. §10's bridge/activation state machine and §12.1/§12.2's literal envelopes are internally consistent with each other and with §13's execution DAG; no coherence defect found.

- **§14/§15 coverage of §13's requirements**: largely adequate — T-ACTIVATE (`:5279-5308`) and the corresponding §15 activation paragraph (`:5501-5567`) closely track §13 steps 3–10. The one confirmed gap is routing/obligation-side: §13 step 5 requires "alias and semantic obligation" implementation with failing-fixtures-first discipline, but neither §14 (R-SIGNAL, R-OBLIGATION) nor §15 names a fixture or mutant for the `SIGNAL_UNCONFIRMED` transition, despite §5.2 itself declaring two "named biting mutant[s]" for it (`:694`, "A hook path that creates `PENDING` directly from `semanticRouteAxis`, or that treats `SIGNAL_UNCONFIRMED` as blocking, is a named biting mutant"). Neither mutant is asserted anywhere in §14 or consolidated into §15's "Required biting mutants" list (`:5309-5568`, verified by full-text reading — no occurrence of `SIGNAL_UNCONFIRMED`, "direct... from `semanticRouteAxis`", or "treats... as blocking" in that section). By contrast, the *negation-verdict-reintroduction* mutant that Round 27 asked about IS present, stated inline in §14 R-SIGNAL (`:4929-4930`: "A mutant that makes any of them authorize, refuse, or return a negation verdict turns this test red"), even though it likewise isn't duplicated into §15's consolidated list — I judge that adequate since §14 is itself part of the blocking assertion matrix. The `SIGNAL_UNCONFIRMED`-specific mutants have no equivalent anywhere outside §5.2's own prose.

## Findings

### Finding 1 — BLOCKER: `SIGNAL_UNCONFIRMED` is declared and created but not wired into any consuming table (§5, §7, §8, §14, §15)

**Contract conflict.** §5.2 states as an explicit, itemized promise: a bare-signal `route_obligation` in status `SIGNAL_UNCONFIRMED` "is inert: it blocks no Stop, **denies no scope**, reinjects nothing, grants no capability, and is byte-preserved across events" (`FINAL-EXECUTION-PLAN.md:686-691`). §7.1's "Project-scope authorization requires all of" list — the actual mechanical gate that decides whether a tool call may touch the project — item 7 (`:3321-3323`) authorizes scope only when the route obligation "is absent or `SATISFIED/CANCELLED/SUPERSEDED`, or is `EXECUTION_ACTIVE`... or is `PLAN_EXECUTION_ACTIVE`...". `SIGNAL_UNCONFIRMED` is none of those, so by the literal text of §7.1 item 7, an outstanding `SIGNAL_UNCONFIRMED` obligation **denies** project scope for every other tool call in the turn — the exact opposite of the promise §5.2 makes two sections earlier. This is not a hypothetical: a normal message carrying the three-span structural-change evidence (e.g. `我们优化了设置页面，结构没变`) mints a `SIGNAL_UNCONFIRMED` obligation on the spot; if the agent's very next tool call in that same turn is unrelated project work, §7.1 item 7 as written blocks it.

The same status is separately missing from three other tables that the document's own construction rules require to be total over `route_obligation.status`:
- §8.1's `TARGET_EXISTS` route-action table (`:3481-3502`) — no row, despite the section's own claim "construction requires exactly one match for every status... rather than defaulting" (`:3508-3510`) and "Enum-to-row generation proves one and only one TARGET_EXISTS row per status" (`:5178`).
- §8.1's main route-status × route-event-kind matrix (`:3618-3641`) — no row/column for the special one-shot "promote to `PENDING` on an affirmative next event, else delete on any other next event" transition that §5.2 (`:690-694`) declares but places nowhere in the composition order.
- §8.5's status/product overlay (`:3860-3876`) — no row, so the "Allowed project phase" / "Mandatory rule" columns are undefined for this status.

**Mechanical counterexample.** Take the exact original prompt chain (§0.1): step 2 (`我要你优化设置里面的交互结构...`) is affirmative and unambiguous, so in practice it likely classifies straight to a live task rather than `SIGNAL_UNCONFIRMED`. But any borderline structural-change clause that reads as an unconfirmed signal — e.g. a bystander remark like `顺便说一句，现在设置页面功能堆砌、界面拥挤，结构不太合理` embedded in an otherwise unrelated message — creates `SIGNAL_UNCONFIRMED` per §5.2's own creation rule (`:686-689`, three evidence spans present). The very next attested event of route-event-kind `STATUS`, `PROJECT_ONLY`, `ROUTE_NONE`, `ANSWER_OR_REVISION`, etc. has to be resolved through *some* table. §8.1's main matrix (`:3618-3641`) has no `SIGNAL_UNCONFIRMED` row, so the composition is undefined: does the event fall through to the nearest neighboring row (e.g. `PENDING/RESUMED`, which would incorrectly ROTATE/RECLASSIFY a status the document says should instead delete silently per `:692-694`), or does the §5.2 one-shot overlay fire first (in which case *where*, relative to the terminal-source check, the TransferJournal overlay, the TARGET_EXISTS guard, and every other explicitly ordered overlay in §8.2's precedence table)? The document supplies no answer. This is not merely a documentation gap — it is exactly the class of defect this round was chartered to hunt: a promise stated in prose (§5.2) that never reaches the executable composition contract (§8), so the in-scope contract cannot be executed or red-teamed as written for any input that produces `SIGNAL_UNCONFIRMED`.

**Minimum repair.** (1) Add `SIGNAL_UNCONFIRMED` to §7.1 item 7's allow-set explicitly (e.g. "...is absent, `SIGNAL_UNCONFIRMED`, or `SATISFIED/CANCELLED/SUPERSEDED`, or is..."), consistent with "denies no scope". (2) Add an explicit `SIGNAL_UNCONFIRMED` row/overlay to §8.1's `TARGET_EXISTS` table, the §8.1 main matrix (or an explicit statement that the promotion/deletion overlay is evaluated as a discrete step in §8.2's precedence table, before the main matrix ever sees the obligation, with the exact ordering relative to the TransferJournal/terminal-source/TARGET_EXISTS overlays spelled out), and §8.5's status/product overlay. (3) Add the two mutants §5.2 already names ("create `PENDING` directly from `semanticRouteAxis`"; "treat `SIGNAL_UNCONFIRMED` as blocking") to §14 (R-SIGNAL or R-OBLIGATION) and to §15's consolidated list, plus a positive fixture proving the promote-on-affirmative / delete-on-other-event transition and a fixture proving an outstanding `SIGNAL_UNCONFIRMED` obligation does not block an unrelated same-turn tool call.

### Finding 2 — MAJOR: "creates no obligation" language in §5.1/§14 contradicts §5.2's actual mechanism

§5.1 (`:610-611`, `:618`) and §14 R-SIGNAL (`:4928-4929`) both state that the bare-signal negation corpus "produces the signal plus its verbatim `negation_context` and **no obligation**" / "none of them alone creates an obligation". But §5.2 (`:687-689`) explicitly creates a `route_obligation` object in status `SIGNAL_UNCONFIRMED` from exactly this basis — it is an obligation, just an inert one. The only place this is reconciled is a single trailing clause at `:621-622` ("as does a mutant that lets any of these strings create an obligation *without the §5.2 confirmation gate*"), which implies the correct reading is "no *live/binding* obligation", but that qualifier is absent everywhere else the claim is repeated. This is exactly the kind of load-bearing ambiguity that produces a wrong fixture: a literal implementation of "asserts no obligation" (e.g. `route_obligation` field absent/null) would either falsify §5.2's own mechanism or force a fixture-writer to guess. **Minimum repair**: replace "creates/produces no obligation" with "creates no obligation whose status is other than the inert `SIGNAL_UNCONFIRMED`" (or equivalent) in both §5.1 and §14 R-SIGNAL, so the two sections cannot be read as contradicting §5.2.

### Finding 3 — MINOR: uncited forward reference in §5.2's `NEW_TASK_SIGNAL_WITH_PROJECT` rule

"After quote/report/negation filtering..." at `:731-732` does not name where that filtering is defined (it resolves, on inspection, to §5.4's raw-span projection plus §8.1's self-contained control-word classifier, neither of which is deleted machinery — see Residue sweep). Every other cross-section dependency in this document is explicitly cited ("per §X", "the §X grammar"); this one isn't, which is exactly the shape of phrasing the Round-27 method note flagged as easy to miss on a future sweep. No behavioral defect; recommend adding a `(see §5.4, §8.1)` pointer.

## Out-of-scope observations

None beyond what is already excluded by §17.0 (baseline tuple literal hashes, §2.15–2.17 closure-map history rows, §12.3 round-number lists) — all consistent and current as read.

## Verification

Post-write re-check (after writing this report, before finalizing):

- `shasum -a 256 FINAL-EXECUTION-PLAN.md` → `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc` (unchanged)
- `wc -l FINAL-EXECUTION-PLAN.md` → `5762` (unchanged)
- `git rev-parse HEAD` → `c146cb70fa8ae95159d31763d57613194b74d68d`
- `git rev-parse @{u}` → `c146cb70fa8ae95159d31763d57613194b74d68d`
- `git rev-parse HEAD^{tree}` → `f15777109b3f524ab0a87888ba74ee4f825a8066`
- `git rev-list --left-right --count HEAD...@{u}` → `0 0`
- No new tracked/untracked modification appeared against any §12.1/§12.2 literal path during the review.

## Gate conclusion

Plan SHA: `09e567ef15f8ba354aa0e4425fcbdfa70c723441cb9d7e3753a0dd157e1d56dc`
HEAD: `c146cb70fa8ae95159d31763d57613194b74d68d` (= upstream, tree `f15777109b3f524ab0a87888ba74ee4f825a8066`)

`NOT_READY_FOR_REDTEAM — 1 BLOCKER / 1 MAJOR / 1 MINOR`

Round-27's five defects are genuinely closed. The residue this round found is a new instance of the same defect class in a different location: the `SIGNAL_UNCONFIRMED` status that closed Round 27's transaction BLOCKER is itself only half-wired — its creation path is complete, but its transition-out path and its presence in every table that enumerates `route_obligation.status` (§7.1 scope authorization, two tables in §8.1, §8.5's overlay, and both §14's fixtures and §15's mutant catalog) is absent. Until that is repaired, the in-scope contract cannot be executed or red-teamed as written for the `SIGNAL_UNCONFIRMED` code path.
