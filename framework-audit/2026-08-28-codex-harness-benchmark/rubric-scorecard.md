# Rubric Scorecard — Final, Post-Redteam

Status: `RESEARCH_COMPLETE / PENDING_HUMAN_GATE`
Assessment date: `2026-08-28`

## 0. Redteam correction

The first draft used the same 22 row scores in two weighted totals. Independent redteam correctly overturned those totals: switching weights cannot make unlike constructs commensurable. Examples include system-permission approval versus product-decision ownership (C17), a compile-time feature registry versus self-evolution governance (C14), and runtime outcome persistence versus artifact/handoff contracts (C21).

The final rubric therefore does three things:

1. retains per-capability maturity scores;
2. aggregates only the 14 runtime/extension rows that share a sufficiently common construct;
3. scores luca's seven governance-target rows as an internal evidence-maturity profile and marks Codex `N/A`.

The luca column is the maturity of the **luca-owned overlay**, not the effective Codex+luca stack. Native host facilities already surrounding luca are described as inherited and are not counted again as local implementation. The profiles below are rubric arithmetic for calibration, not an overall system ranking or adoption decision.

## 1. Score and evidence anchors

| Score | Meaning |
|---:|---|
| 0 | Absent in the assessed boundary |
| 1 | Prose, stub, or unusable experiment |
| 2 | Partial, manual, or materially conditional |
| 3 | Working in a bounded scope with material limitations |
| 4 | Robust in intended scope with implementation and test/check evidence |
| 5 | Native, systemic, broadly integrated, and explicit about failures |

Half-points capture mixed maturity. Contract-only evidence is capped at `3.0`; a higher score requires implementation plus a deterministic check, observed execution, or a clearly bounded native subsystem. A passing anchor checker proves only its assertions.

Confidence:

- `High`: official contract plus pinned source, or local implementation plus deterministic/observed evidence.
- `Medium`: implementation exists but the exact live path was not executed.
- `Low`: absence inference, benefit forecast, or cost/risk estimate.

## 2. Final row scores

| Unit | Capability | Comparability | Codex | luca | Main calibration reason |
|---|---|---|---:|---:|---|
| C01 | Native command/tool runtime | Comparable | 5.0 | 2.5 | Native Codex runtime versus host wrapper |
| C02 | OS sandbox and approvals | Comparable | 5.0 | 3.0 | OS-enforced substrate versus bounded local semantic guard |
| C03 | Config layering and project trust | Partial | 4.5 | 3.0 | Shared provenance construct; local identity adds a different concern, while hard-coded local projections limit portability |
| C04 | Instructions/context budget | Comparable | 4.5 | 3.5 | Codex native budget/spill; local path inherits part of it |
| C05 | Intent routing/planning | Target-different | N/A | 3.0 | Local coverage is richer but negation dry-runs can reverse explicit scope instructions and enforcement is partly heuristic/model-level |
| C06 | Skills | Comparable | 4.0 | 3.0 | Native progressive loader; local semantic-intent checker gap |
| C07 | Plugin/MCP distribution | Comparable | 4.5 | 2.5 | Native authority package versus launcher-conditional edge |
| C08 | Hooks | Comparable | 4.0 | 2.5 | Repository live probe passes, but adapter crashes/non-2 exits fail open and Pre/Post tool coverage is narrow |
| C09 | Multi-agent runtime | Comparable | 4.0 | 2.5 | Native lineage; local role sandbox declarations are ignored by pinned role projection |
| C10 | Long-running workflow | Target-different | N/A | 3.5 | Thread/goal control versus artifact workflow are different constructs |
| C11 | Durable thread/session state | Comparable | 4.5 | 3.0 | Typed general state versus selected local workflow/growth state |
| C12 | Concurrent project identity | Target-different | N/A | 3.5 | Local CAS/lease solves a specific identity problem; the scope wrapper has lexical rewrite, hard-coded fallback and fail-open edges; transactions were not invoked under NO_PIN |
| C13 | Long-term memory | Partial | 3.5 | 4.0 | Generated recall versus governed candidate review; different ingestion granularity |
| C14 | Evolution/adoption governance | Target-different | N/A | 4.0 | Toggle maturity versus benchmark/fusion/human adoption process are different constructs |
| C15 | Trace/audit observability | Comparable | 4.5 | 2.5 | Native rollout/replay/OTEL versus fragmented local logs/rules whose writers lack demonstrated lock/atomic transaction boundaries |
| C16 | Output-quality evals | Partial | 3.0 | 3.0 | Different review/eval targets; neither side proved one universal evaluator |
| C17 | Human decision gates | Target-different | N/A | 3.0 | System permission gate versus product-decision ownership contract are different constructs |
| C18 | Failure containment | Comparable | 4.0 | 3.0 | Native runtime bounds versus strong local CAS/locks/rearm cores plus hook, route, lexical-rewrite and writer-consistency gaps |
| C19 | SDK/control plane | Comparable | 4.5 | 2.5 | Native app-server/SDK versus shell runner |
| C20 | Cross-harness parity | Target-different | N/A | 2.5 | Local target exists, but semantic-intent blind spot and stale adapter descriptions are proven |
| C21 | Artifact/handoff contracts | Target-different | N/A | 3.0 | Rich local contract coverage, mostly advisory/model-enforced in this evidence set |
| C22 | Engineering verification/CI | Comparable | 4.5 | 3.0 | Broad upstream surface without executed coverage; local targeted checks with remote-CI omission and warning-only false-green risk |

## 3. Bounded calculations

No subjective weights are used in the final result.

### 3.1 Comparable runtime/extension maturity

Included units: C01/C02/C03/C04/C06/C07/C08/C09/C11/C13/C15/C18/C19/C22.

`simple mean = Σ row scores ÷ 14`

| System | Mean | Interpretation |
|---|---:|---|
| OpenAI Codex | **4.36 / 5** | Strong native runtime/control-plane substrate |
| luca_gstack | **2.89 / 5** | Working local overlay with material host dependence and verification gaps; this is not the capability of the effective Codex+luca stack |

### 3.2 luca governance-target evidence maturity

Included units: C05/C12/C14/C16/C17/C20/C21.

| System | Mean | Interpretation |
|---|---:|---|
| OpenAI Codex | `N/A` | These are not Codex product targets and are not scored as if they were |
| luca_gstack | **3.14 / 5** | Meaningful governance coverage; current proof mixes mechanical mechanisms with contracts/model enforcement |

### 3.3 Overturned first-draft calculation

For auditability, the discarded weighted totals were: runtime `88.8/68.9` and governed Skill OS `74.6/80.4` (Codex/luca). The arithmetic was correct; the construct was not. They must not be cited as final benchmark results.

## 4. Per-unit dossiers

“Value” is relevance to luca's objectives. “Redundancy” is overlap with current mechanisms and therefore dual-truth risk.

| Unit | Value | Redundancy | Evidence boundary | Borrow surface | Uncertainty |
|---|---|---|---|---|---|
| C01 | High | Low | Native tool/exec source plus tests; local wrapper inspected | Consume substrate | Low existence; medium integration |
| C02 | Critical | Medium | Native sandbox/approval source; broad local roots documented | Explicit isolated profile only | Medium: no live corpus |
| C03 | High | High | Typed config provenance and local CAS/transaction source; hard-coded projections inspected | Provenance only plus local portability repair | Medium: different protected state |
| C04 | High | High | Host spill implementation and local hook config | Already inherited | Low |
| C05 | Critical | High | Route map/guard and Plan contracts; explicit negation dry-run reproduced | Local polarity/receipt hardening | Low on reproduced defect; medium on complete remedy |
| C06 | High | High | Native skill loader; MagicPath intentional delegation is source-confirmed, but the checker cannot validate its reason | Negative-control test pattern | Medium |
| C07 | Medium | High | Native plugin/MCP source; local launcher conditional | Deferred packaging | Medium |
| C08 | High | High | 12-event engine and six local registrations; full repository wiring probe passed outside the outer sandbox, but only its asserted branches are covered | Gap-specific conformance hardening | Medium |
| C09 | Critical | High | Pinned role projection/tests prove parent permission inheritance | Reject expansion as stated | Low on permission fact |
| C10 | Medium | Medium | Both mechanisms present but different layers | Different target | Medium integration |
| C11 | Medium | Medium | Typed thread protocol and local selected state | Deferred backend | Medium |
| C12 | Critical | High | Local substrate/CAS/lease source; wrapper fallback/rewrite paths inspected; identity transactions intentionally not invoked | Retain core; harden wrapper; no replacement | Medium live behavior |
| C13 | High | High | Native generated memory and local governed pipeline | Fine-grained provenance only, deferred | Medium |
| C14 | Critical | High | Feature registry versus Mode 2/fusion/candidate chain | Retain local; no second registry | Medium enforcement coverage |
| C15 | High | High | Rollout/replay/OTEL and local writer implementations; no concurrent transaction boundary demonstrated | Append-only raw evidence plus atomic derived projection/writer | Medium design risk |
| C16 | High | High | Broad tests and local eval contracts; judge permission and mandatory self-recording conflict | Separate verdict from recorder authority | High until permission contract is resolved |
| C17 | Critical | Medium | Mechanical permission gates; local human ownership is contractual | Do not automate human gate | Low target distinction |
| C18 | High | Medium | Runtime bounds and local recovery mechanisms plus reproduced/inspected fail-open edges | Failure taxonomy plus local containment hardening | Medium incident prevalence |
| C19 | Medium | High | App-server/Python source and local runner | Deferred spike | Medium need/protocol stability |
| C20 | Critical | High | Anchor checks pass but do not verify the source-confirmed MagicPath delegation reason; capability prose has stale semantics | Local parity hardening | High ecosystem-wide parity |
| C21 | High | High | Rich local contracts; no product-state/live handoff read under NO_PIN | Retain target, improve evidence | Medium-high |
| C22 | High | Medium | Upstream workflow source and local static/live results; remote CI and warning propagation inspected | Gatherer, severity propagation, mutation and negative controls | Medium |

## 5. Calibration conclusions

1. The strongest defensible comparison is layer-based: Codex is the stronger native runtime substrate in the assessed pin; the numeric profile has low-to-medium cross-system comparability and is not an overall score.
2. luca's differentiator is governance coverage, not a proven numeric implementation lead over Codex.
3. The two highest-confidence local findings are: native role files do not mechanically enforce read-only permissions, and current parity checks cannot validate source-owned delegation semantics or detect an accidental substitution with the same anchors.
4. Every benefit/cost/risk forecast remains a claim until a human authorizes and a bounded experiment verifies it.

<!-- FILE_END: rubric-scorecard.md -->
