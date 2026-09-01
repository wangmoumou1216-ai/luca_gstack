# Red Team Round 27 — Transaction Lane

## Receipt

- Lane: TRANSACTION (independent planning red team, Round 27).
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`.
- Plan SHA-256 — expected `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161`, expected length 5,730 lines.
  - Checkpoint 1 (before reading): `shasum -a 256` = `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161`; `wc -l` = `5730`. Match.
  - Checkpoint 2 (immediately before writing this report, after a mid-task ENOTFOUND interruption and resume): `shasum -a 256` = `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161`; `wc -l` = `5730`. Match.
- Framework `HEAD` / `upstream` / tree — expected `HEAD=upstream=c146cb70fa8ae95159d31763d57613194b74d68d`, `tree=f15777109b3f524ab0a87888ba74ee4f825a8066`.
  - Checkpoint 1: `HEAD=c146cb70fa8ae95159d31763d57613194b74d68d`, `@{u}=c146cb70fa8ae95159d31763d57613194b74d68d`, `HEAD^{tree}=f15777109b3f524ab0a87888ba74ee4f825a8066`. Match.
  - Checkpoint 2: identical values, re-verified after resume. Match.
- KILL-03 derivation: `git status --porcelain` at both checkpoints shows the same set —
  tracked-modified: `.claude/observability/observations.jsonl`, `.claude/observability/rules.yaml`,
  `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`,
  `memory/evals/routing/fixtures.jsonl`; untracked: `.playwright-cli/`, and eleven
  `framework-audit/2026-08-20-routing-steering-handshake/{PLAN-AGENT-REVIEW-R19..R23,R25,R26,
  REDTEAM-ROUND-24-ROUTING,REDTEAM-ROUND-25-ROUTING,REDTEAM-ROUND-25-TRANSACTION,
  REDTEAM-ROUND-26-ROUTING,REDTEAM-ROUND-26-TRANSACTION}.md`. I enumerated every literal line in the §12.1
  bridge envelope (lines 4518–4560) and the §12.2 v3/downstream envelope (lines 4582–4693) and diffed them
  against this list. None of the modified/untracked paths appears as its own literal line in either list:
  `.claude/observability/rules.yaml` occurs in §12.1/§12.2 only as nested
  `.claude/hook-releases/<gen>/payload/.claude/observability/rules.yaml` entries, never as a bare line — the
  plan's own §0.3 text (lines 98–99) states this explicitly and forecloses the bare path counting as an
  envelope member. `observations.jsonl`, `memory/evals/routing/fixtures.jsonl`, `.playwright-cli/`, the plan
  file itself, and every `PLAN-AGENT-REVIEW-*`/`REDTEAM-ROUND-*` audit output are §12.3 session-bookkeeping /
  frozen-input paths, not §12.1/§12.2 envelope lines. **KILL-03 does not fire.**
- Downstream: attempted to reach the downstream repo (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` expected) via
  Bash under `/Users/luca/Desktop/项目`. The project-scope guard refused verbatim:
  `Bash 直接项目路径不属于当前可验证 binding（/Users/luca/Desktop/项目）；禁止 no-pin/跨项目/失效 identity 访问。`
  Downstream ref/tree status: **UNVERIFIABLE_FROM_THIS_SESSION**. Not routed around.
- Byte 0 → EOF: the plan file was read start to finish in eleven sequential chunks covering lines 1–500,
  501–1000, 1001–1500, 1501–2000, 2001–2600, 2601–3200, 3201–3700, 3701–4300, 4301–4900, 4901–5400,
  5401–5730 — contiguous, no gaps, terminating at the literal last line (5730, the final sentence of §17.0).
  I can restate the file's final section: §17.0 names the reviewed executable contract (§4–§16 minus the
  named bookkeeping carve-outs), states KILL-02/KILL-03 remain in-scope invariants even though the §0.3 hash
  literals and §2.15–2.17/§12.3 history rows are out of gate scope, and closes with the exact-SHA handshake
  requirement and the `PROPOSED_ONLY` status line.
- Drift statement: no drift observed at either checkpoint on any of plan SHA/lines, framework HEAD/upstream/
  tree, or the KILL-03 path set. A mid-task network interruption (ENOTFOUND) killed the session; the
  coordinator re-verified identical bytes before resume and I re-verified again independently at both
  checkpoints above — consistent.
- Output file: confirmed absent (`ls` → "No such file or directory") both before starting substantive writing
  and again in the resumed session immediately before this write.

## Verdict

**FAIL**

- BLOCKER: 1
- MAJOR: 1
- MINOR: 0

## Routing-change blast radius

The routing surface change (§4.2/§5.1: deletion of the mechanical `NEG`/`ADV`/`NEG_SUSPECT` Chinese-negation
grammar, replaced by non-authorizing `alias_resolution={schema_version:1,candidates}` plus verbatim
`negation_context` on the structure signal) is, on its face, exactly the right shape for closing E1/E5 without
reintroducing the routing lane's six-round failure class: both new objects are explicitly declared
non-authorizing ("grants no capability, mutates no project binding, creates no transaction and emits no
command" — §4.2:525–526), and I confirmed mechanically that **neither object appears as a field in any
persisted schema I audited**: the §7.1 session document (lines 3213–3246), the §5.2 `route_obligation` object
(lines 648–676, `signal:{axis, three distinct evidence spans}` — no `alias_resolution`/`negation_context`
key), the §5.3 `TransferJournal`/`transfer_security_ledger`/capability objects, the §6.3 ledger event object,
and the §9 project-mutation/recovery records. Every one of these objects declares
`additionalProperties:false` at the leaf level, so a candidate array or negation-context string has no schema
slot to occupy even if a mutant tried to smuggle it in. **On the narrow question "can `alias_resolution` or
`negation_context` reach a state document, ledger entry, or transfer journal" — no, this holds.**

But the deeper judgment call the round asks for is not "does the new object itself leak" — it's "did deleting
the machinery that used to *decide* negation leave any downstream consumer holding a promise it can no longer
keep." It did, twice, and both land inside the state machine I own:

1. **§5.2's obligation-creation rule has no gate that implements "only after the LLM layer confirms
   affirmative."** §5.1 (line 601) asserts the new architecture "creates a durable obligation only after the
   LLM layer confirms the request is affirmative," and pins fixtures for `别动结构`, `结构别改`,
   `别再调整设置结构` and `我们优化了设置页面，结构没变` claiming "none of them alone creates an obligation"
   (lines 603–606). But §5.2's actual creation-placement rule (lines 678–701) — "in clean N/A/C/B, create
   PENDING unless the same event also creates SWITCH_ONLY..." — contains no negation check, no LLM-confirmation
   wait, and no reference to route_event_kind at all; it fires on the bare presence of the signal. Since
   §5.1's own later paragraph (lines 596–598) says the hook sets `semanticRouteAxis` "when all three evidence
   spans are present in one clause" with **no** negation exclusion (that is the entire point of the rewrite —
   the hook no longer adjudicates), the mechanical text as written appears to let a negated signal reach §5.2
   and create a Stop-blocking `route_obligation` — the exact failure this rewrite claims to have eliminated.
   Full detail in Finding BLOCKER-1 below.
2. **§8.1's `route_event_kind` classifier still cites a "negation spans" definition in §4.2/§5.1 that those
   sections now explicitly disclaim having.** This classifier's NEW_TASK/CORRECTION arms are the mechanism
   that would, if anything did, gate obligation-affecting classification on affirmativeness — and it is now
   citing a phantom. Detail in Finding MAJOR-1.

So: nothing in §6, §7, §9, §10, or the §13 DAG depends on the alias/signal layer having produced an
authorization — those sections never reference either object and their capability/ledger/lock machinery is
untouched. The consequence is narrower and sharper than "does authority leak sideways": it is that the
*promise* the routing rewrite makes about not creating state for a declined request is not actually
implemented by the obligation-creation rule that lives in my part of the state machine (§5.2, which feeds
directly into the §7-governed `route_obligation` object and the Stop-blocking behavior §8.6 enforces on it).
My Round-25/26 PASS verdicts on §6/§7/§8.2/§9/§10/§13 as such still hold — those sections are byte-identical
in effect and I found no new defect inside them — but the routing change's blast radius does reach one object
I audit (`route_obligation` creation), and it does so through a gap, not through a leaked authorization.

## Attacks attempted

### Scripted transfer-recovery cases (§5.3)

- (a) Nonterminal journal, no scan, proven-dead controller, fresh E1 attested, then exact
  `plan-transfer recover` PreTool with no pending candidate. Traced against the `transfer_invocation_kind`
  table (lines 2159–2167) predicate 4(a) and the outcome table (lines 2199–2205,
  `PROVEN_DEAD_RECOVERY_ISSUED`/consume-then-`next_step`): the capability was minted bound to E1 by the prior
  census, and the recover PreTool's `authority_id`/`actor_session_id`/`actor_event`/`actor_boundary` match that
  ISSUED capability and `prompt_gate.current_event` — predicate 4(a) fires, consumes the capability, publishes
  the fresh RECOVERY owner, performs only its `next_step`, appends no `TransferSecurityEvent`. **Held**
  (`FINAL-EXECUTION-PLAN.md:2159-2205`).
- (b) Ordinary count 256 (FULL posture), one-item scan, then retry with no new `UserPromptSubmit`. Predicate 1
  (`SCAN_DRAIN_EVENT`, lines 2161) fires once the durable group is visible, advances
  `consumed_count`/cursor/chain, denies the attempted controller. Once `consumed_count==submitted_count` the
  scan object is removed and "that next tool/Stop retry re-enters the §5.3 input table with `transfer_scan`
  absent, selects predicate 4, 5 or 6 ... without another UserPromptSubmit" (lines 2178–2183, restated at
  3011–3014). **Held** (`FINAL-EXECUTION-PLAN.md:2159-2183,2994-3016`).
- (c) ISSUED E1 capability when fresh E2 is attested before controller consumption. Predicate 3
  (`NEWLY_ATTESTED_EVENT`) fires on E2, the outcome table's `ISSUED whose dead_owner_sha256 equals the
  recomputed controller_owner.owner_sha256` row selects `STALE_CAPABILITY_ROTATED`: the E1 capability is
  invalidated permanently, a replacement is minted at a strictly higher `recovery_sequence` bound to E2, "the
  persisted controller bytes replaced with ones bound to the replacement `authority_id`" (lines 2199–2214).
  **Held** (`FINAL-EXECUTION-PLAN.md:2159-2167,2199-2214`).
- (d) IN_PROGRESS RECOVERY owner that has crashed, on fresh E2. Predicate 3 fires; the outcome-table row for
  `CONSUMED, whose consume rename bound the fresh RECOVERY controller_owner` under a `PROVEN_DEAD` census
  selects `PROVEN_DEAD_RECOVERY_ISSUED`, replacing the consumed object with a fresh capability at a strictly
  higher sequence bound to E2 (lines 2206–2208). **Held** (`FINAL-EXECUTION-PLAN.md:2159-2167,2206-2208`).

### Self-constructed attacks

- Searched every persisted-object schema in §5.2, §5.3, §6.3, §7.1, §9 for an `alias_resolution` or
  `negation_context` field. None exists; every containing object is `additionalProperties:false`. **Held** —
  the routing-change objects cannot reach a state document, ledger entry, or transfer journal.
  (`FINAL-EXECUTION-PLAN.md:648-676,3213-3246,3161,2010-2095`).
- Traced whether §6 attestation (`attestPending()`, Claude/Codex contracts, replay/visibility table) references
  the alias/signal layer at all. It does not — §6.1–6.3 never mention `alias_resolution`, `negation_context`,
  or `semanticRouteAxis`. **Held**.
- Traced whether §9's production controller table or lock-order protocol consumes alias/signal evidence for
  authorization. It does not — `project.sh switch|new` requires "exact persisted SWITCH_ONLY capability" only
  (line 3945), which is minted by the §8 route/project matrices from attested `SELECT(T,SWITCH|NEW)` intent,
  never from `alias_resolution` candidates directly. **Held**.
- Traced whether §13's DAG (`A0→B1→B2→V1→C1`, `D1`) or §10 activation machinery reference the routing layer.
  They do not; the bridge/activation state machine is about hook-config/release/pointer objects, entirely
  orthogonal to project-alias or signal evidence. **Held**.
- Predicate-collision / two-predicates-match attack on the `transfer_invocation_kind` table: the plan itself
  requires this exact mutant ("let one invocation match two input-table predicates," line 5301) and asserts
  the seven predicates partition the input space (line 2169). I checked the seven predicate conditions
  (lines 2161–2167) pairwise for overlap on the shared discriminator tuple and found them mutually exclusive
  by construction (each keys on `transfer_scan` presence, visibility, hook kind, and persisted-state shape in
  a strict priority chain with "first match wins"). **Held**.
- Capability-rotation-vs-drain race: constructed a case where a `PROVEN_DEAD_RECOVERY_ISSUED` capability is
  minted at E2, then E3 arrives before the recover controller consumes it. Predicate 3 fires again on E3,
  re-runs the census, and (per the `ISSUED whose dead_owner_sha256 differs` row, lines 2205, "no event is
  appended; STATE_TRANSITION_INVALID; byte-preserving deny" only if the owner tuple mismatches, else
  `STALE_CAPABILITY_ROTATED` again) rotates the capability again to E3 — the old E2 capability is "permanently
  unconsumable." No double-issue, no lost authority. **Held**.
- Sequential A→B→C rollover: traced the `transfer_security_ledger`'s single fixed accumulator across two
  sequential transfers (lines 2117–2119, 5177–5178: "a sequential A→B then B→C fixture proves B reuses one
  chain, changes event side TARGET→SOURCE without reset and cannot replay an A→B event"). The chain-step
  formula (`chain_next=H(...||previous_ledger_sha256||event_sha256)`) commits the complete prior object,
  including its final projection status, so B's target-side history is provably committed before B's
  source-side history begins. **Held**.
- 4,096-byte accumulator cap / cap+1: the accumulator schema (lines 2078–2113) is bound at "manifest-enforced
  maximum 4,096 bytes" with every field a bounded scalar/enum; a cap+1 accumulator is a named biting mutant
  (line 5294: "accept a cap+1 accumulator"). No unbounded field (free text, arbitrary array) exists in the
  accumulator schema that could grow past the cap under adversarial input — `native_id` is capped at 512 UTF-8
  bytes, everything else is a 64-hex ID or closed enum. **Held**.
- `last_projection_status` transition attack: attempted to construct a case where a Stop could flip
  `UNVERIFIABLE`→`VERIFIED` twice, or flip it without the exact creating event/boundary. The rule (lines
  2222–2225) restricts this to "exact byte-proving Stop changes only that scalar to VERIFIED... one-shot,"
  and predicate 5 (lines 2165) requires the notice/last-outcome to be on "exactly its own creating
  event/boundary." A replayed Stop on a stale event fails predicate 5's event-match test and falls to
  predicate 7 (`NO_NEW_EVENT_DENY`). **Held**.
- Dual-write attack: attempted to construct a case where one native event both advances the ordinary ledger
  and the transfer-security chain. Line 2129–2130 states "The current native event is written to exactly one
  ledger" and the §8.2 precedence table's TransferJournal row (line 3641) is ordered strictly before the
  ordinary-capacity row, so a matching journal/notice always intercepts before ordinary append is reachable.
  **Held**.
- Crash-barrier walk at every rename named in §5.3's checkpoint/journal machinery (PREPARED→TARGET_PUBLISHED→
  SOURCE_TOMBSTONED→COMMITTED, and the ENTRY/OVERFLOW cancellation-reservation renames): each transition is
  described as a single atomic rename with an explicit crash-recovery successor (e.g. lines 2003, 2058–2061,
  2251 "a crash repeats this liveness/sequence protocol from the newly durable state"). I did not find a
  transition claiming atomicity without a corresponding recovery path in the mutant list (§15) or the T-series
  assertions (§14). **Held**.
- Project-isolation lock-order attack: attempted to construct a case where recovery could acquire
  `session→global` (reverse of the mandated `global→session` order) by racing a SWITCH commit against a
  concurrent RECOVER control. §9.3's fixed order table (line 3356–3374) is explicit that "no path acquires a
  preceding class while holding a later one" and recovery is always `recovery-claim→fresh live
  recovery-global→session`; the recovery-control row in §8.2 (line 3642) is itself gated on exact-hash match
  against immutable state before any capability issues, so a race cannot bypass acquisition order. **Held**.
- Bridge/activation HELPER_DISABLED fault-injection: walked the forward (`SHIM_PROBES_PASSED`→0500 disable→
  `HELPER_DISABLED`) and rollback (`000→0500`→trust inverse→`0500→000`) mode machine (lines 4450–4469) for a
  crash exactly at each chmod/fsync boundary; every cell names its exact successor and none defaults. **Held**.
- Re-confirmed the §5.3 liveness non-claim (lines 2258–2265: "Capability rotation guarantees safety, not
  liveness... a pathological interleaving... can keep rotating the capability away... no bound on that
  interleaving is asserted") against the current bytes. The disclaimer is unchanged from Round 26 and remains
  an explicit, honest non-claim rather than a silent gap — my Round-26 judgment that this is adequate (a
  documented liveness caveat, not a safety defect) still holds on these bytes. **Held / re-confirmed**.

## Findings

### BLOCKER-1 — §5.2's obligation-creation rule has no gate implementing the round's own safety claim for a negated signal

**Contract conflict.** §5.1 (`FINAL-EXECUTION-PLAN.md:600-603`) states the rewrite "creates a durable
obligation only after the LLM layer confirms the request is affirmative," and (`:601-603`) that this is "the
property the deleted grammar kept failing to guarantee" — i.e. this is presented as the round's core safety
win. §5.1 also states, earlier in the same section (`:591`), "Negated, quoted, report/example and
explanatory-question clauses do not count" toward the signal — implying the signal itself should not fire for
a negated clause. But the paragraph immediately after (`:596-598`) says the opposite: "When all three evidence
spans are present in one clause, the hook sets `semanticRouteAxis=interface_structure_change` **and** records
`negation_context`" with no negation exclusion stated, and the blocking-fixture list (`:603-606`) requires
that `别动结构`, `结构别改`, `别再调整设置结构` and `我们优化了设置页面，结构没变` "each produce the signal
plus their verbatim `negation_context`."

I then read §5.2's actual creation-placement rule end to end (`:616-761`, specifically the overlay at
`:678-701`) looking for the "only after the LLM layer confirms affirmative" gate the round's prose promises.
There is none. The rule is: "in clean N/A/C/B, create PENDING unless the same event also creates
`SWITCH_ONLY(SWITCH/NEW)`, in which case create `DEFERRED_BY_PROJECT_CHANGE`..." and three further bullets
that gate only on project-transaction state (existing `SWITCH_ONLY`, transient `MUTATION_COMMITTING`/
`COMMIT_CLEANUP_PENDING`/`RECOVERY_REQUIRED`, target/op mismatch, `DEACTIVATE` conflict). None of these bullets
references negation, `negation_context`, `route_event_kind`, or any LLM-confirmation wait. The trigger for
this whole overlay is simply "the signal creates... route_obligation" (`:645-646`) — i.e. the bare presence of
`semanticRouteAxis` in the current event.

**Mechanical counterexample.** Given clean project state N/A/C/B (the ordinary case) and an attested event
whose text is `别动结构` or `别再调整设置结构` (both of which §5.1's own fixture list claims "produce the
signal"), §5.2's literal rule fires: the signal is present, project state is clean, so a fresh `route_obligation`
is created with `status:PENDING`. This is a durable object that (per §5.3/§8.6) blocks Stop, forces the next
security hook into route classification, and can only be dismissed by an explicit `取消这个任务|不做了`
cancel or supersession. This directly contradicts §5.1's own claim two paragraphs earlier that "none of them
alone creates an obligation" (`:605`), and reproduces exactly the failure mode the round claims to have
eliminated: a durable, Stop-relevant state artifact created from a request the user explicitly declined.

**Why this is mine and not just routing's.** The routing lane owns whether the *signal* correctly reflects the
sentence (§4/§5 grammar). I own whether the *state machine* (§7-governed `route_obligation`, §8.6 Stop-block
behavior) correctly refrains from mutating durable state on non-authorizing evidence. §5.2's creation rule is
squarely inside my declared scope ("does anything in §7... depend on the alias layer having produced an
authorization" — here the *signal* layer, described in identical non-authorizing terms as the alias layer,
does appear to reach state creation because the promised downstream gate is simply absent from the transition
rule). This is exactly the "candidate object reach[ing] a state document... where it does not belong"
question the round posed, manifesting one layer removed: not the raw evidence object itself, but the
obligation state its presence unconditionally triggers.

**Severity.** BLOCKER — it is a direct contradiction within the specification about a required transition (does
a negated signal create `route_obligation` or not), and if resolved in favor of the more detailed/explicit
paragraph (`:596-606`, which is also the one the required biting mutant at `:606` protects — "a mutant
reintroducing any mechanical negation verdict turns its test red" — meaning the fixtures are meant to
literally produce the signal), the mechanical rule as written creates unwanted durable authority-adjacent
state (a Stop-blocking obligation) from evidence the plan itself declares non-authorizing. This is "lost or
stolen authority"-class: the user's negation is effectively ignored by the state machine at the one place that
was supposed to remain silent.

**Minimum repair.** Either (a) add an explicit gate to §5.2's creation-placement overlay — e.g. "the signal
creates `route_obligation` only when the current event's `route_event_kind` (§8.1) classifies as an
affirmative `NEW_TASK`/`NEW_TASK_SIGNAL_WITH_PROJECT`, never from `semanticRouteAxis` presence alone" — and
make that dependency explicit and testable; or (b) delete line 591's stale "Negated... clauses do not count"
sentence and replace the safety claim at lines 600–603 with an accurate description (e.g. "a fixture-pinned
negated signal does create a `PENDING` obligation, but it is inert and dismissible" — if that is the actually
intended, weaker guarantee). Whichever direction is chosen, §5.1 and §5.2 must state the same rule, and §14's
R-SIGNAL assertion (`:4895-4900`, "none of them mutates a project, emits a command, mints a capability or
creates an obligation from the hook alone") must be re-verified against whichever rule survives — as currently
worded it repeats the same "creates no obligation" claim §5.2's mechanics do not implement.

### MAJOR-1 — §8.1's `route_event_kind` classifier cites a "negation spans" definition that §4.2/§5.1 no longer contain

**Contract conflict.** §8.1 (`FINAL-EXECUTION-PLAN.md:3522-3525`) states: "The classifier is a bounded
executable grammar, not a model label. It first applies the same clause, quote/backtick, report/example and
negation spans as §4.2/§5.1... Negation scopes project/signal/action markers..." Three of the four cited
concepts (clause boundaries, quote/backtick spans, report/example spans) still exist in §4.2 (`:481,501`), but
"negation spans" does not: §4.2 (`:511-513`) states "This plan therefore stops trying, and removes negation...
from the mechanical contract entirely. No `NEG`, `ADV`, `NEG_SUSPECT`, exempt-compound or intervening-token
rule exists anywhere in this plan; reintroducing one is a named biting mutant," and §5.1 (`:598-599`) repeats
the same disclaimer for its own section. §8.1's own step 3 (`:3539-3541`) then uses exactly this undefined
notion: "an anchored independent-task prefix... plus one operative imperative is NEW_TASK. With no live
obligation, one **affirmative** task clause carrying the §5.1 signal is also NEW_TASK" — "affirmative" here
has no definition left to inherit, since the negation-scoping machinery it depends on was deleted from the
sections it cites.

**Why this is mine.** `route_event_kind=NEW_TASK` is the classification that, per §8.3–§8.5's stable-state
matrices (squarely in my declared §8.2-adjacent scope), drives `PLACE_NEW`/obligation creation in the project
matrix and interacts with the TARGET_EXISTS guard and the ordinary route/project transition table — i.e. this
is load-bearing input to the state-transition machinery I audit, not decorative prose. A classifier whose
"affirmative" gate cites a now-nonexistent grammar is underspecified exactly where it feeds my axis.

**Severity.** MAJOR — this is a dangling cross-reference rather than a demonstrated wrong transition (unlike
BLOCKER-1, I could not construct a concrete input where §8.1's classifier visibly misfires, because the
`NEW_TASK` arm's practical behavior may fall back to "affirmative = not literally negated by some implicit
sense" without incident on most inputs), but it is a real contract conflict: the text promises reuse of a
definition that provably does not exist in the cited sections, and it is a direct, uncorrected byproduct of
this round's routing-surface deletion — the same class of defect the round exists to hunt for.

**Minimum repair.** Replace `:3522-3523`'s "negation spans as §4.2/§5.1" with either (a) a self-contained
negation-scoping definition local to §8.1 if `route_event_kind` classification is meant to retain mechanical
negation exclusion, or (b) an explicit statement that `route_event_kind` classification no longer adjudicates
negation either, consistent with the round's architecture, with the "affirmative task clause" language at
`:3540-3541` reworded accordingly.

## Out-of-scope observations

- `我们优化了设置页面，结构没变` (§5.1's own first-listed blocking-fixture example, `:603-604`) contains a
  clause boundary at the "，" per §4.2's definition (`:501`, "Clause boundaries are start/end and
  ，,。；;！!？?\n"). Read literally, its change leg (`优化`) and interface leg (`设置`) fall in the first
  clause while its structure leg (`结构`) falls in the second, which appears to conflict with §5.1's own rule
  that "legs cannot aggregate across clauses" (`:590-591`). Similarly, `别动结构` (also cited at `:604`) does
  not contain any interface-leg keyword from the current §5.1 list (`页面/界面/设置/偏好设置/交互/布局/侧栏/
  导航`) nor does `动` appear in the current change-leg list (`优化/重组/重构/改版/重新设计/拆分/归组/调整`),
  so under the literal current 3-leg grammar this fixture does not obviously satisfy the signal's own
  precondition either way. This is squarely §5.1 grammar-correctness — the routing lane's declared territory —
  and I am not raising it as a BLOCKER/MAJOR on my axis; I flag it because it is adjacent to and may compound
  BLOCKER-1 above (if these fixtures don't actually satisfy the 3-leg precondition, the signal may never fire
  for them at all, which would moot BLOCKER-1 for those specific examples but would not fix the missing gate
  in §5.2's general rule, nor the internal §5.1 contradiction at line 591 vs. 596–606).
- No other observations outside the KILL-02-hash-literal / §2.15–2.17 / §12.3 round-number carve-outs named by
  §17.0.

## Residual risk

- The two findings above both trace to one root cause: deleting the mechanical negation grammar from §4.2/§5.1
  did not fully propagate to every downstream consumer of "was this clause negated." A third possible
  consumer I did not find evidence of but could not fully rule out in the time available: whether any Work
  Agent/MAIN_AGENT prompt-construction step (§5.3, deep in the parameter/answer machinery) implicitly assumes
  an obligation was only ever created for affirmative requests, and therefore has untested behavior if a
  negated-signal obligation reaches Plan classification. I did not find such an assumption stated, but I also
  did not exhaustively trace every one of the ~40 persisted-object schemas in §5.3 against this specific
  question given the size of that section relative to the time budget.
- Downstream ref/tree parity (`69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`) is UNVERIFIABLE_FROM_THIS_SESSION per
  the project-scope guard's refusal recorded above; this is a standing limitation of the transaction lane's
  vantage point, not a new risk introduced by this round.
- My Round-25/26 attack surface on §6/§7/§9/§10/§11/§12/§13/§15/§16 was re-confirmed by re-reading rather than
  by re-deriving every one of the dozens of golden-vector/H-LP formulas from scratch; I traced formulas and
  cross-references directly relevant to the routing-change blast radius in full detail and spot-checked the
  remainder (crash barriers, lock ordering, capacity arithmetic) against the mutant list in §15 and the T-series
  assertions in §14, which is the same verification depth Round 26 used for its 20-attack PASS.

## Verification

- Post-write plan re-check: `shasum -a 256 FINAL-EXECUTION-PLAN.md` = `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161`; `wc -l` = `5730`. Unchanged from both prior checkpoints.
- Post-write ref re-check: `git rev-parse HEAD` = `c146cb70fa8ae95159d31763d57613194b74d68d`; `git rev-parse @{u}` = `c146cb70fa8ae95159d31763d57613194b74d68d`; `git rev-parse HEAD^{tree}` = `f15777109b3f524ab0a87888ba74ee4f825a8066`. Unchanged.
- No git commit/push/reset/stash/clean/add was run at any point in this session.

## Conclusion

Plan SHA-256: `6119e6e92930b88c05e4f4e4f2b0b6a864534309c2f1dcc84ace5a2a9ede1161` (5,730 lines). Framework HEAD:
`c146cb70fa8ae95159d31763d57613194b74d68d` (= upstream; tree `f15777109b3f524ab0a87888ba74ee4f825a8066`).

**Verdict: FAIL — BLOCKER: 1, MAJOR: 1, MINOR: 0.**
