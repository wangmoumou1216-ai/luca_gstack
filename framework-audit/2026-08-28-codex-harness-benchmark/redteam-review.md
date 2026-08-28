# Redteam and Reverse-Redteam Review

Status: **CHALLENGE_AND_FINAL_REVIEW_COMPLETE / PASS_WITH_CONCERNS**
Review date: **2026-08-28**
Posture: **NO_PIN / READ_ONLY CHALLENGE**

The review ran in two waves. The first pair attacked evidence/scoring and steelmanned luca_gstack against over-borrowing. A later independent Mode 2 evidence attack and Socratic examination reopened claims after new local counterexamples were found. Reviewers were read-only/NO_PIN, did not edit framework sources, and did not cross the adoption gate.

Reviewer provenance:

- `/root/mode2_redteam` — independent evidence/scoring/causality attack; verdict `MODIFY_MAJOR`.
- `/root/mode2_reverse_redteam` — upstream-limit steelman and anti-borrow review; core layering stood, opportunity set reduced.
- `/root/mode2_final_review` — independent post-redteam review of all nine artifacts plus original sources; verdict `PASS_WITH_CONCERNS`.
- `/root/socratic_examiner` — comparability, judge/eval authority, writer concurrency, opportunity-completeness and live-evidence challenge.

The durable record is this adjudication, not an invented hash of hidden agent transcripts. Each reviewer was read-only, NO_PIN and explicitly barred from identity transactions/product state.

## 1. Independent redteam — principal challenges

| Severity | Challenge | Evidence | Verdict applied |
|---|---|---|---|
| Blocker | The first dual totals aggregated non-commensurable constructs. | C14/C17/C21 compare feature toggles, system approvals and runtime persistence with evolution, product-decision ownership and artifact contracts. | **OVERTURNED** both weighted totals; final rubric separates comparable runtime from local governance maturity. |
| High | Contract-only evidence cap was violated. | Initial C17/C20/C21 local scores exceeded the declared cap despite advisory/model-enforced evidence. | **MODIFIED** scores to 3.0/2.5/3.0 and removed comparative governance lead claim. |
| High | Local baseline was not reproducible from HEAD alone. | observability rules/observations and a routing fixture were already dirty; web pages were mutable. | **MODIFIED** evidence posture; added source-manifest.md with content hashes and dirty-path disclosure. |
| High | Stable/native existence was overextended into 4.5/5.0 maturity. | Hook handler/source limits, v2 multi-agent off, Guardian conditions, experimental protocol combinations. | **MODIFIED** C06/C07/C08/C09/C17/C19/C22 downward while retaining existence facts. |
| High | “Same granularity” was too strong. | Native Codex subsystems and local prompt/governance contracts do not have equal evidence density. | **OVERTURNED** phrase; inventory is now coverage-oriented and normalized only at capability level. |
| High | MagicPath divergence was called a defect despite source-confirmed intent. | Office MagicPath and viability source explicitly delegate to the external skill. | **MODIFIED** finding: delegation is intentional; the checker cannot validate the source-owned reason or a future substitution. |
| Medium-high | Test-file breadth was treated like maturity/coverage. | Upstream suite was not executed and file counts are not test cases or coverage. | **MODIFIED** C22 to 4.5 and strengthened limits. |
| Medium-high | Exact value/cost/risk score created false precision. | Arithmetic was correct, but estimates had no calibrated sample or intervals. | **OVERTURNED** composite ranking; final ledger uses ordered bands. |
| Medium | Scope-guard lexical failure was used as causal support for execpolicy. | Prefix rules cannot naturally repair path parsing across a command string. | **MODIFIED**: the failure stands; it is excluded from execpolicy causality. |

## 2. Independent reverse redteam — principal challenges

| Severity | Challenge | Evidence | Verdict applied |
|---|---|---|---|
| Blocker | Local native judges are not mechanically read-only. | Pinned AgentRoleOverrides omits sandbox/approval; role tests preserve parent permissions and ignore hostile authority expansion. | **OVERTURNED** LG-011 wording; C09/role-expansion opportunity rejected as stated. |
| High | Runtime trace could become a Codex-only governance truth. | Rollout proves events, not semantic validity or human authorization. | **MODIFIED** receipts: trace may be one evidence source only and is merged into cross-harness evidence closure. |
| High | Generic feature registry is a construct mismatch. | Upstream registry is a compile-time toggle table, not governance maturity. | **OVERTURNED** standalone registry opportunity. |
| High | Hook budget/spill is already inherited. | Native output_spill surrounds local hook handlers; two local events intentionally set zero limit. | **OVERTURNED** local duplication opportunity; classified already inherited. |
| High | Guardian breaker was misdescribed as an exact-action workflow breaker. | It counts denials at turn/window level and is approval-review specific. | **OVERTURNED** generalized breaker opportunity. |
| High | Native hook expansion could create duplicate handler paths. | Sibling handlers may start concurrently; some executor sources are first-only; adapter is current cross-harness SSOT projection. | **MODIFIED → DEFERRED** until a concrete missing lifecycle obligation exists. |
| Medium-high | A new semantic manifest could itself be a second catalog. | Skills, route map and viability sources already overlap. | **MODIFIED** parity work must derive from current authorities and use negative controls, not a hand-maintained catalog. |
| Medium-high | Broad roots encode real cross-root needs. | Current config documents memory, IPC and project-transaction failures that motivated them. | **MODIFIED** least-authority work to opt-in corpus evaluation; risk raised. |
| Medium-high | Codex memory exclusion is coarse. | External-tool use can taint a whole thread; local extraction lacks span-level provenance. | **MODIFIED → DEFERRED** until fine-grained provenance and a real incident exist. |
| Medium | App-server is an available alternative, not a demonstrated need. | Current runner already has scratch isolation, cleanup and known failure semantics. | **MODIFIED → DEFERRED** until a reproducible runner limitation exists. |
| Medium | Narrow execpolicy exploration survives. | A documented Codex projection gap exists for deterministic command safety. | **STANDS**, with preview and cross-harness projection limits. |
| Medium | Plugin packaging lacks a concrete distribution object. | Current optional edge accurately avoids becoming governance truth. | **MODIFIED → DEFERRED** with a named distribution trigger. |

## 3. Final claim adjudication

| Claim | Final verdict | Final wording |
|---|---|---|
| Five focused Codex capabilities exist natively | **STANDS** | Hooks, skills, subagents, local memories and base Guardian approval exist; default/maturity and failure limits remain distinct. |
| Codex wins the native runtime/control-plane layer | **STANDS, MODIFIED** | Comparable 14-row internal maturity profile: Codex 4.36/5, luca-owned overlay 2.89/5. This supports only the qualitative native-substrate conclusion; it is not an overall or effective-stack score. |
| luca wins governed Skill OS 80.4 to 74.6 | **OVERTURNED** | luca covers governance targets Codex does not; its internal evidence maturity is 3.14/5, with no fabricated Codex comparison. |
| Inventory is same-granularity | **OVERTURNED** | It is a coverage inventory with asymmetric native/contract evidence density. |
| Three local native judges are read-only | **OVERTURNED** | Their instructions declare read-only intent; pinned role projection preserves parent live permissions. |
| MagicPath proves a current wiring defect | **OVERTURNED** | Delegation is intentional. The checker blind spot is failure to validate the declared reason and detect a future accidental substitution. |
| Static wiring/viability green proves parity | **OVERTURNED** | It proves reachability/anchors asserted by those scripts only. |
| Project trust can replace luca identity/CAS | **REJECTED** | Different state and failure problem. |
| Auto-review can own human product/adoption gates | **REJECTED** | It is a sandbox-boundary reviewer, not human decision ownership. |
| Generated Codex memory can become authoritative | **REJECTED** | Local governed candidate/review remains authoritative. |
| Goal mode can replace artifacts/handoffs/evals | **REJECTED** | Runtime outcome control does not establish workflow semantics. |
| Adoption was performed | **FALSE / GATE STANDS** | No code/config/rule/gap/registry/adoption/release mutation occurred. |

## 4. Opportunity adjudication

| Initial opportunity | Redteam disposition | Final location |
|---|---|---|
| Semantic parity checks | **MODIFIED**: local intent blind spot, no second catalog | Merged into FINAL-OPP-01 |
| Least-authority profiles | **MODIFIED**: explicit opt-in corpus; broad roots have real needs | FINAL-OPP-02 |
| Generic feature maturity registry | **OVERTURNED** | Rejected as stated |
| Trace-bound obligation ledger | **MODIFIED**: trace non-authoritative, cross-harness | Merged into FINAL-OPP-01 |
| Native hook expansion | **DEFERRED** | Deferred with observed-gap trigger |
| Guardian circuit breaker | **OVERTURNED** | Rejected as stated |
| App-server backend | **DEFERRED** | Deferred with runner-limitation trigger |
| Native planner/work/oracle roles | **OVERTURNED** | Rejected as stated |
| Local hook budget/spill | **OVERTURNED** | Already inherited; do not duplicate |
| Memory exclusion/provenance | **DEFERRED** | Deferred pending fine-grained provenance and incident |
| Execpolicy prefix safety | **MODIFIED → DEFERRED** after final review exposed missing Ask/override and approval-policy semantics | Deferred, not gate-ready |
| Plugin packaging | **DEFERRED** | Deferred pending named distribution need |
| Route polarity and scope conformance | **ADDED AFTER SECOND EVIDENCE PASS** | FINAL-OPP-03 |
| Independent verdict / eval-recorder permission separation | **ADDED AFTER SECOND EVIDENCE PASS** | FINAL-OPP-04 |
| Atomic observability writer | **ADDED AFTER SECOND EVIDENCE PASS** | FINAL-OPP-05 |
| CI severity and projection portability | **ADDED AFTER SECOND EVIDENCE PASS** | FINAL-OPP-06 |

## 5. Final independent review

Overall verdict: **PASS_WITH_CONCERNS**. The core runtime-vs-governance layering, arithmetic, agent-role permission finding, official maturity boundaries, 18 web hashes, upstream archive hash and high-impact local hashes stood. Three required corrections were applied:

| Final-review finding | Verdict | Applied change |
|---|---|---|
| Viability changed during the benchmark after a concurrent `handoff` skill addition. | **OVERTURN** any unqualified “snapshot all green” claim | Inventory/main/manifest preserve initial PASS=33/FAIL=0, interim 2026-08-28T15:44:25+0800 PASS=32/FAIL=1, and post-review PASS=34/FAIL=0 after another flow updated the projection. This benchmark made no registry repair. |
| Execpolicy proposal omitted authoritative Ask/user-override semantics and the fact Prompt becomes Forbidden when approvals are unavailable. | **MODIFY / DEFER** | Removed from the human-GATE candidate set; revisit requires source-generated projection and Ask/Allow/Forbidden × approval-policy matrix. |
| MagicPath intent was no longer unresolved: source files prove intentional delegation. | **MODIFY THEN STANDS** | All artifacts now use MagicPath as a known positive fixture; the checker gap is validation of the source-owned reason and future substitutions. |

Additional corrections applied: exact predicates now accompany the 698/1,135 test-file counts; O-SRC-19/20 spelling is normalized; duplicate inventory numbering is fixed; reviewer provenance is recorded here; obligation reordering is tested only when the authoritative source declares order significant.

First-wave opportunity verdicts, later expanded by the second pass:

- FINAL-OPP-01: **STANDS AFTER MODIFICATION**.
- FINAL-OPP-02: **STANDS**.
- Former third initial candidate (deterministic command-prefix safety): **DEFERRED / NOT GATE-READY**. Its old ordinal is not reused as an ID in the final six-item ledger.

Post-review note: the final viability rerun is green, but the concern remains because the assessed meta inputs changed twice during the research window. Final high-impact hashes are a timestamped sample, not an immutable whole-repository snapshot.

## 6. Second independent evidence pass and re-review

The later redteam was asked to falsify the near-final report, not approve its narrative. It changed the deliverable materially:

| Challenge | Verdict | Evidence and applied revision |
|---|---|---|
| The inventory is exhaustive or truly same-granularity. | **OVERTURNED** | The pin contains 131 `FeatureSpec` entries and 106 first-level `codex-rs/` directories; 36 upstream units are clustered coverage. All final artifacts now say coverage-oriented, non-exhaustive inventory. |
| `4.36` versus the luca number is a system ranking. | **OVERTURNED AS INTERPRETATION** | The arithmetic remains, but the luca unit is explicitly the luca-owned overlay, not the effective Codex+luca stack. Corrected means are 4.36/2.89; cross-system numeric comparability is low-to-medium. |
| Guardian auto-review is effectively default. | **NARROWED** | The base feature is stable/on, but default `ApprovalsReviewer` is `USER`; model auto-review requires explicit opt-in and applicable interactive/account/model conditions. |
| Explicit negative framework scope is safely handled. | **OVERTURNED** | A minimal `NO_PIN` Mode 2 dry-run containing “do not trigger Project Gate” returned `NEEDS_CONTEXT`; FINAL-OPP-03 was added. |
| Passing 88 scope fixtures closes project isolation. | **OVERTURNED FOR WRAPPER, STANDS FOR CORE** | CAS/lease/session identity remains strong. The wrapper still lexically rewrites whole command strings, has a hard-coded fallback and fail-open/uncovered-tool edges. |
| Read-only judge and mandatory self-recording can coexist as currently wired. | **OVERTURNED** | Pinned role projection preserves parent permissions; the shared quality-gate contract also requires the judge to write eval-log. FINAL-OPP-04 separates verdict authority from recorder authority. |
| Observability is safe under parallel agents. | **UNPROVEN / MATERIAL GAP** | Count-derived IDs, full-file rules RMW and non-transactional multi-effect writes lack a common atomic boundary. FINAL-OPP-05 was added. |
| Local CI green means all mandatory checks are blocking and portable. | **OVERTURNED** | Remote CI omits part of full verify; some checks are warning-only; machine-specific projections remain. FINAL-OPP-06 was added. |
| The complete live hook surface is verified. | **MODIFIED** | Authorized full repository probe passed 21/0/0 outside the outer sandbox. It proves that bundle's asserted branches, not all six events' allow/deny/rewrite/fail-open semantics. |
| Two gate candidates are opportunity-complete. | **OVERTURNED** | The final ledger contains six undecided candidates: two Codex-derived bounded adaptations and four local closure opportunities exposed by the benchmark. |

Reverse-redteam preservation verdicts also stand: do not replace session identity/CAS, governed memory, human product/adoption gates, artifact/handoff semantics or the routing/Plan **intent** with generic Codex substrate features. The benchmark challenges current enforcement evidence, not those governance objectives.

Final post-second-pass disposition:

- `FINAL-OPP-01`: **STANDS AFTER MODIFICATION**.
- `FINAL-OPP-02`: **STANDS AS OPT-IN EVALUATION, HIGH RISK**.
- `FINAL-OPP-03`: **ADDED / UNDECIDED**.
- `FINAL-OPP-04`: **ADDED / UNDECIDED**.
- `FINAL-OPP-05`: **ADDED / UNDECIDED**.
- `FINAL-OPP-06`: **ADDED / UNDECIDED**.
- Deterministic command-prefix safety: **DEFERRED / NOT GATE-READY**.

No verdict authorizes implementation. All six candidates remain at the human adoption GATE.

<!-- FILE_END: redteam-review.md -->
