# Capability Matrix — Post-Redteam Assessment

Status: `RESEARCH_COMPLETE / PENDING_HUMAN_GATE`
Revision: `Mode 2 redteam applied`

## 0. Reading rules

The `0–5` values are evidence-adjusted maturity profiles within each capability, not a universal product ranking. The luca column scores the **luca-owned overlay evidence**, not the effective Codex+luca composed stack; inherited host capabilities are therefore not double-counted as local maturity.

- `0`: absent in the assessed boundary.
- `1`: prose, stub, or unusable experiment.
- `2`: partial, manual, or materially conditional.
- `3`: working in a bounded scope with material limitations.
- `4`: robust in intended scope with implementation and test evidence.
- `5`: native, systemic, broadly integrated, and explicit about failures.

Rows marked `Different` compare coverage and target, not a common construct. They must not be added into a cross-system winner score. This corrects the first draft, whose dual weighted totals were overturned by redteam because C10/C14/C17/C21 mixed runtime and governance constructs.

Final dispositions:

- `DIRECT_PATTERN`: a bounded testing or failure-semantics idiom may transfer; no subsystem adoption is implied.
- `ADAPT`: preserve luca invariants and validate in a bounded experiment.
- `ALREADY_INHERITED`: the Codex host already supplies the mechanism; do not duplicate it locally.
- `LOCAL_HARDENING`: a luca-owned gap, not an upstream feature import.
- `DEFER`: relevant but no current need/evidence justifies an experiment.
- `DO_NOT` / `REJECT_AS_STATED`: importing the proposed mechanism would weaken governance or rests on a false premise.
- `LUCA_COVERAGE_AHEAD`: luca covers a governance target Codex does not; this does not claim stronger mechanical maturity.
- `DIFFERENT_TARGET`: no assimilation obligation.

## 1. Final matrix

| # | Capability | Comparable? | OpenAI Codex | luca_gstack | Evidence-backed assessment | Final disposition | Primary evidence |
|---|---|---|---:|---:|---|---|---|
| C01 | Native command/tool runtime | Yes | 5.0 | 2.5 | Codex has typed tools, unified exec, PTY/process bounds and error taxonomy. luca delegates execution to hosts/wrappers. | `ADAPT`: consume Codex as substrate; do not rebuild exec | OAI-025/026; LG-013 |
| C02 | OS sandbox and approvals | Yes | 5.0 | 3.0 | Codex separates sandbox from approval. luca adds semantic guards but regular-session roots are broad for documented cross-root needs. | `ADAPT`: only an explicit isolated least-authority profile; never an identity/router substitute | OAI-027/029; LG-017/026-028 |
| C03 | Config layering and project trust | Partial | 4.5 | 3.0 | Codex exposes typed layer provenance/trust. luca adds session transaction/CAS semantics, but several Codex/hook projections hard-code local roots and the verifier checks consistency more than portability. | `ADAPT` provenance; `DO_NOT` replace identity binding; `LOCAL_HARDENING` portability | OAI-011/012; LG-016-020/026 |
| C04 | Hierarchical instructions/context budget | Yes | 4.5 | 3.5 | Codex has native instruction and hook-output budgets. luca's Codex hook path already inherits host spill, with two events intentionally set to full passthrough. | `ALREADY_INHERITED / DO_NOT_DUPLICATE` | OAI-013/017; O-SRC-04; LG-001/031 |
| C05 | Intent routing and complexity planning | Different | N/A | 3.0 | luca defines Project→Plan→Framework→Skill routing, but dry-run negation cases can reverse explicit “do not gate/benchmark” instructions; substantial enforcement remains heuristic/prompt-level. Codex does not target this domain router. | `LUCA_COVERAGE_AHEAD` in target; `LOCAL_HARDENING` polarity/receipt gap | LG-004/005/008 |
| C06 | Skill schema/discovery/activation | Yes | 4.0 | 3.0 | Codex natively discovers and progressively loads skills; some parsed policy is not enforced. MagicPath delegation is source-confirmed, but parity checks cannot encode/validate its source-owned reason or distinguish a future accidental substitution. | `LOCAL_HARDENING`; borrow negative-control testing patterns | OAI-014/015; LG-029/030 |
| C07 | Plugin/MCP distribution | Yes | 4.5 | 2.5 | Codex has authority-bound plugin/MCP packaging with client-dependent surfaces. luca's app/MCP edge is launcher-conditional. | `DEFER` until a real cross-machine/user distribution need exists | OAI-016/021-024; LG-032/033 |
| C08 | Lifecycle hooks | Yes | 4.0 | 2.5 | Codex provides 12 events and typed failure semantics, but some handlers/sources are unsupported or first-only. luca's six-event adapter passed the repository live probe, yet crashes/non-2 exits fail open, Pre/Post coverage is limited to Bash/apply_patch, and branch coverage is incomplete. | `ALREADY_INHERITED` engine; `LOCAL_HARDENING` conformance before expansion | OAI-017/018; LG-001-003 |
| C09 | Multi-agent runtime | Yes | 4.0 | 2.5 | Codex has native lineage, limits and messaging. Role files cannot set child sandbox/approval in the pin; roles inherit parent live permissions. Local judge TOMLs' “read-only” is not mechanical. | `REJECT_AS_STATED` native planner/work/oracle expansion; first repair the permission assumption | OAI-019/020; O-SRC-19/20; LG-008-013 |
| C10 | Workflow and long-running outcomes | Different | N/A | 3.5 | Codex thread/goal control and luca artifact workflow solve different layers; no cross-system score is assigned. | `DIFFERENT_TARGET`: compose only when a proven need appears | OAI-006-010; LG-006-015 |
| C11 | Durable thread/session state | Yes | 4.5 | 3.0 | Codex has typed durable thread/app-server state. luca persists selected workflow/growth state; current runner pain requiring replacement was not shown. | `DEFER` app-server backend work | OAI-006-010/030; LG-021-024 |
| C12 | Concurrent project identity/isolation | Different | N/A | 3.5 | luca's CAS/lease/identity core models a real target Codex trust does not. The scope wrapper still uses command-string rewriting, has a hard-coded fallback and top-level fail-open paths; project transactions were intentionally not invoked under NO_PIN. | `DO_NOT` replace core with generic trust; `LOCAL_HARDENING` wrapper | OAI-012/027; LG-016-020 |
| C13 | Long-term memory/recall | Partial | 3.5 | 4.0 | Codex memory is generated recall with coarse external-context exclusion. luca has stronger candidate review, but lexical retrieval and provenance gaps remain. | `DEFER`; only fine-grained provenance is potentially adaptable | OAI memory source/docs; LG-034-038 |
| C14 | Self-evolution and adoption governance | Different | N/A | 4.0 | Codex feature staging is a toggle registry, not evolution governance. luca has benchmark, fusion, quarantine and human adoption control; some steps remain agent-enforced. | `LUCA_COVERAGE_AHEAD`; `DO_NOT` create a second generic feature registry | OAI-001; LG-014/015/036-042 |
| C15 | Trace/telemetry/audit observability | Yes | 4.5 | 2.5 | Codex has rollout/replay/OTEL. luca has logs/rules/audits, but observation IDs, rules read-modify-write and eval/run-log appends lack a demonstrated concurrent transaction boundary; runtime trace would still prove events, not governance validity. | `ADAPT` append-only evidence/projection pattern; `LOCAL_HARDENING` writer | OAI-008/034/035; LG-039-045 |
| C16 | Output-quality evals | Partial | 3.0 | 3.0 | Codex has broad engineering tests/review surfaces; no unified public rubric evaluator was confirmed. luca defines rubric semantics, but recording/execution coverage is partial. | `DIFFERENT_TARGET / LOCAL_HARDENING`; no “mechanical lead” claim | OAI-036; LG-041/045 |
| C17 | Human decision gates | Different | N/A | 3.0 | luca reserves product/architecture decisions for humans, mostly by contract; Codex system-permission approval is a different construct and is not scored here. | `DO_NOT` use auto-review for human-only decisions | OAI-027/029; LG-028 |
| C18 | Failure containment/recovery | Yes | 4.0 | 3.0 | Codex exposes bounded runtime failures and Guardian's turn-level denial breaker. luca has strong CAS/locks/rearm/quarantine cores, but hook fail-open, negation, lexical rewrite and writer-consistency gaps lower end-to-end containment. | `DIRECT_PATTERN` failure taxonomy; `LOCAL_HARDENING` observed gaps | OAI-007-010/026/029; LG-002/017/019/022 |
| C19 | SDK/control-plane integration | Yes | 4.5 | 2.5 | Codex offers typed app-server and SDKs; some combinations remain experimental. luca's runner already has scratch isolation and recovery semantics. | `DEFER` until a measured continuity/protocol need exists | OAI-004/030-033; LG-013 |
| C20 | Cross-harness semantic parity | Different | N/A | 2.5 | Cross-vendor parity is luca's target, not Codex's. MagicPath intent is documented, but current checks prove reachability/anchors without validating the declared delegation reason; adapter capability descriptions also contain stale semantics. | `LOCAL_HARDENING / LOCAL_GAP`, not `LUCA_AHEAD` | LG-002/003/029/030/043/044 |
| C21 | Artifact/handoff workflow contracts | Different | N/A | 3.0 | luca defines artifact/handoff semantics; much enforcement is advisory or model-level in the pure-meta evidence examined. | `LUCA_COVERAGE_AHEAD / DIFFERENT_TARGET`, with execution-proof gap | LG-006/007/008/015 |
| C22 | Engineering verification/CI | Yes | 4.5 | 3.0 | Codex has a broad test/conformance/CI surface, but tests were not run and file counts are not coverage. luca has strong targeted fixtures and a passing live wiring probe, yet remote CI omits parts of full verify and several checks downgrade failures to warning. | `DIRECT_PATTERN`: gatherer, behavior, mutation and negative-control idioms; adapt locally | OAI-036; LG-043-045 |

## 2. Final rubric views

The initial `88.8/68.9` and `74.6/80.4` dual totals are **overturned** and retained only in `redteam-review.md` as audit history. Weight changes cannot fix rows that compare different constructs.

Two bounded profiles remain:

| Profile | Included units | OpenAI Codex | luca_gstack | Allowed interpretation |
|---|---|---:|---:|---|
| Comparable runtime/extension maturity | C01/C02/C03/C04/C06/C07/C08/C09/C11/C13/C15/C18/C19/C22; unweighted mean | **4.36 / 5** | **2.89 / 5** | Internal rubric only: Codex has the stronger native runtime/control-plane substrate; the luca value measures its own overlay and does not subtract inherited host capability from the effective stack |
| luca governance-target evidence maturity | C05/C12/C14/C16/C17/C20/C21; unweighted mean | `N/A` | **3.14 / 5** | luca covers governance targets Codex does not, but much of the current proof is contract/model-level rather than mechanical |

These profiles are descriptive calibration, not adoption scores. The second row deliberately uses `N/A` for Codex instead of manufacturing a comparison.

## 3. Borrow classification after redteam

### Direct patterns worth retaining

- Behavior-level, mutation and negative-control test idioms.
- Explicit failure taxonomy and event-level failure semantics.
- Append-only raw evidence plus a rebuildable/offline-derived projection.
- Generated protocol/schema artifacts with an explicit stable-versus-experimental gate.
- A CI gatherer that records every required job before deciding the aggregate verdict.

No whole Codex subsystem qualifies for direct, unadapted adoption.

### Adapt only after a human-authorized experiment

- Explicit, isolated least-authority permission profiles; never automatic project/route identity.
- Codex rollout/app-server events as one non-authoritative evidence source in a cross-harness receipt design.
- Route polarity and scope-guard behavior fixtures derived from authoritative rules, not another intent catalog.
- Permission-compatible separation of independent verdict production from evaluation recording.
- Atomic, lock-safe observability writes and deterministic severity propagation in CI.

Deferred rather than gate-ready: narrow execpolicy projection for deterministic command-prefix safety. It first needs a source-generated Ask/Allow/Forbidden projection and interactive/non-interactive/never approval-policy matrix.

### Already inherited; do not duplicate

- Native hook discovery/trust and output-spill behavior already surrounding the local adapter.
- Native skill discovery and subagent lifecycle. Local work should verify semantics, not clone loaders.

### Do not borrow / reject as stated

- Generated Codex memory as authoritative rules or project decisions.
- Auto-review for human product, architecture, adoption or release gates.
- Project trust as a replacement for session identity/CAS.
- Goal mode as a replacement for artifact/handoff/eval contracts.
- A second generic feature registry beside existing governed sources.
- A generalized Guardian-style denial breaker without a demonstrated local machine-denial loop.
- Native role expansion under the false assumption that role TOML makes children read-only.
- A duplicate hook context-budget/spill layer.
- Any Codex-only source of truth.

### luca coverage ahead or target different

- Candidate→review→promote memory and explicit adoption ownership.
- Framework-evolution Mode 2, fusion/quarantine and propose-only posture.
- Domain/task complexity routing and artifact/handoff semantics.
- Session project identity/CAS.

These are coverage and intent advantages. The benchmark does not claim that every obligation is mechanically enforced.

<!-- FILE_END: capability-matrix.md -->
