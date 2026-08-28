# Evidence Index — OpenAI Codex Harness Benchmark

Status: **RESEARCH_COMPLETE / PENDING_HUMAN_GATE**
Access date for all network sources: **2026-08-28**
Local repository HEAD: **b438c92b1d1dbb28f5252396181f1cb9ab806900**
OpenAI Codex pin: **7d6f808b97e424da80271be8cc539e8c5437a229**

This index separates public contracts, pinned implementation facts, current-worktree local facts, and analyst inferences. A source proves only the listed claim. Exact content hashes and dirty-worktree limits are in source-manifest.md.

## A. Reproducibility ledger

| Item | Value | Meaning |
|---|---|---|
| Upstream repository | [openai/codex](https://github.com/openai/codex) | OpenAI primary open-source repository |
| Pinned commit | [7d6f808](https://github.com/openai/codex/commit/7d6f808b97e424da80271be8cc539e8c5437a229) | Source inventory baseline |
| Commit timestamp | 2026-08-28T06:18:20Z | GitHub commit API |
| Archive SHA-256 | cfc6c2ea55bf55b17b59333d6dce1517733c30943e8dfa135e2f1611674c09b4 | Download integrity |
| Local worktree | HEAD plus exact current file hashes | Dirty before benchmark; HEAD alone is not a full reproduction |
| Existing dirty files | Listed in source-manifest.md | Preserved and not edited by this benchmark |
| Registry status | No openai/codex row in benchmark-registry.yaml | Full Mode 2 run, not an incremental window |
| Product posture | NO_PIN, pure meta | No product context or identity transaction |

## B. OpenAI official public guidance

All links below were visited on 2026-08-28. Web pages are mutable; the downloaded content hashes are recorded in source-manifest.md.

| ID | Official source | Claims supported | Boundary |
|---|---|---|---|
| O-DOC-01 | [Open-source components](https://learn.chatgpt.com/codex/open-source) | CLI, app server and SDK sources are public; cloud and IDE extension are outside this open-source assessment | Scope boundary |
| O-DOC-02 | [AGENTS instructions](https://learn.chatgpt.com/codex/agent-configuration/agents-md) | Hierarchical discovery, override/fallback and shared byte budget | Public contract |
| O-DOC-03 | [Hooks](https://learn.chatgpt.com/codex/hooks) | Lifecycle events, trust, command/MCP handlers, tool coverage and spill | Some handlers/sources remain limited in pin |
| O-DOC-04 | [Build skills](https://learn.chatgpt.com/codex/build-skills) | Progressive disclosure, initial context budget, scope and symlink support | Skill is an instruction/resource package, not a hard state machine |
| O-DOC-05 | [Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents) | Custom roles, inheritance and concurrency | Pinned implementation reapplies parent live permissions; role sandbox fields do not control children |
| O-DOC-06 | [Approvals and security](https://learn.chatgpt.com/codex/agent-approvals-security) | Sandbox and approval are separate boundaries | Public security contract |
| O-DOC-07 | [Sandboxing](https://learn.chatgpt.com/codex/sandboxing) | Read-only, workspace-write and full-access semantics | Platform-specific enforcement |
| O-DOC-08 | [Rules](https://learn.chatgpt.com/codex/agent-configuration/rules) | Side-effect-free command-prefix rules | Execpolicy language remains preview in source |
| O-DOC-09 | [MCP](https://learn.chatgpt.com/codex/extend/mcp) | Transport, auth, filtering and approvals | Authority/policy dependent |
| O-DOC-10 | [Plugins](https://learn.chatgpt.com/codex/plugins) | Skills/MCP/hooks packaging and marketplace distribution | Client/authority surface varies |
| O-DOC-11 | [Build plugins](https://learn.chatgpt.com/codex/build-plugins) | Manifest and package structure | Authoring contract |
| O-DOC-12 | [Local memories](https://learn.chatgpt.com/codex/customization/memories) | Off by default, asynchronous generated recall, redaction and exclusion | Not an authoritative rule store |
| O-DOC-13 | [Auto-review](https://learn.chatgpt.com/codex/sandboxing/auto-review) | Approval reviewer, denial breaker and bounded retry | Not a general task-quality or product-decision reviewer |
| O-DOC-14 | [Advanced configuration](https://learn.chatgpt.com/codex/config-file/config-advanced) | Layered trusted config and profiles | Generic project trust is not session identity |
| O-DOC-15 | [App server](https://learn.chatgpt.com/codex/app-server) | Typed thread/turn/permission/plugin/skill control plane | Some method combinations are experimental |
| O-DOC-16 | [Codex SDK](https://learn.chatgpt.com/codex/codex-sdk) | TypeScript and Python clients | TS surface is narrower than Python/app server |
| O-DOC-17 | [Non-interactive mode](https://learn.chatgpt.com/codex/non-interactive-mode) | codex exec, resume, ephemeral mode and stream separation | Headless approval posture differs |
| O-DOC-18 | [Long-running work](https://learn.chatgpt.com/codex/long-running-work) | Goal mode, pause/resume/steer and measurable outcomes | Not artifact-governance proof |

## C. Pinned OpenAI implementation

All links resolve to the assessed commit.

| ID | Pinned implementation | Claims supported |
|---|---|---|
| O-SRC-01 | [AGENTS discovery](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/agents_md.rs) | Root detection, override order and size budget |
| O-SRC-02 | [Hook discovery/trust](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/hooks/src/engine/discovery.rs) | Sources, current-definition hash and normalization |
| O-SRC-03 | [Hook dispatcher](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/hooks/src/engine/dispatcher.rs) | Dispatch ordering/concurrency |
| O-SRC-04 | [Hook output spill](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/hooks/src/output_spill.rs) | Token-bounded additional context and spill |
| O-SRC-05 | [Hook schemas](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/hooks/schema/generated) | Machine-readable event contracts |
| O-SRC-06 | [Skill loading](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/skills/src/loading.rs) | Scope discovery and dependencies |
| O-SRC-07 | [Skill selection](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/skills/src/selection.rs) | Visible-list selection and budget |
| O-SRC-08 | [Multi-agent runtime](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/session/multi_agents.rs) | Parent/child lifecycle |
| O-SRC-09 | [Multi-agent tool specification](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/tools/handlers/multi_agents_spec.rs) | Spawn/message/wait contracts |
| O-SRC-10 | [Feature registry](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/features/src/lib.rs#L850) | Feature stage and default state |
| O-SRC-11 | [Exec policy](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/execpolicy) | Prefix-rule engine and tests |
| O-SRC-12 | [Sandboxing](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/sandboxing) | Platform policy transforms |
| O-SRC-13 | [Guardian](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/guardian) | Approval review and turn-level denial behavior |
| O-SRC-14 | [Memory implementation](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/memories) | Extraction/consolidation implementation |
| O-SRC-15 | [State store](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/state) | Thread/project/goal/graph/queue models |
| O-SRC-16 | [App-server protocol](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/app-server-protocol) | Typed public protocol |
| O-SRC-17 | [Thread store](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/thread-store) | Histories, paging, migration and recovery |
| O-SRC-18 | [Plugin runtime](https://github.com/openai/codex/tree/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/plugin) | Manifest/loading/authority |
| O-SRC-19 | [Agent role projection](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/agent/role.rs#L36) | Allowed role overrides exclude sandbox and approval |
| O-SRC-20 | [Agent role permission tests](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/agent/role_tests.rs#L354) | Parent sandbox is preserved and hostile role authority expansion is ignored |
| O-SRC-21 | [Memory pollution classification](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/stream_events_utils.rs#L132) | External-tool use can mark a thread unsuitable for memory; granularity is coarse |
| O-SRC-22 | [Rollout trace design](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/rollout-trace/README.md) | Local opt-in raw trace, append-first capture, offline/best-effort reduction and explicit non-authoritative limitations |
| O-SRC-23 | [App-server schema and experimental boundary](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/app-server/README.md#protocol) | Version-matched generated schemas; stable surface by default; experimental capability opt-in |
| O-SRC-24 | [Pull-request Rust CI](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/.github/workflows/rust-ci.yml#L218) and [post-merge/full CI](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/.github/workflows/rust-ci-full.yml) | Required-result gatherer and split between blocking PR checks and heavier full matrix |
| O-SRC-25 | [OTEL initialization](https://github.com/openai/codex/blob/7d6f808b97e424da80271be8cc539e8c5437a229/codex-rs/core/src/otel_init.rs) | Exporter setup and observability defaults; telemetry existence does not establish governance validity |

## D. luca_gstack current-worktree evidence

| ID | Local source | Claims supported | Evidence class |
|---|---|---|---|
| L-SRC-01 | AGENTS.md; CLAUDE.md | Identity, route order, cross-harness and human-gate contracts | Contract |
| L-SRC-02 | skill-routing-map.yaml; route-guard.mjs | Framework/project/builtin routing and Plan checks | Deterministic data plus heuristic classification |
| L-SRC-03 | input-modes.yaml; optional-workflow-graph.yaml | Skill-first mode and advisory graph | Mostly model-enforced contract |
| L-SRC-04 | `.codex/hooks.json`; `.codex/codex-hook-adapter.mjs`; `.claude/hooks/lib/harness.mjs:106-120` | Six events and protocol adaptation; capability prose/table still labels Codex block/input mutation unavailable while the adapter preserves those paths | Mechanical for covered events; description drift does not by itself prove runtime failure |
| L-SRC-05 | project-scope-guard.mjs; project-substrate.mjs | Session confinement, CAS and deny/rewrite | Mechanical on dispatched tools; uncovered/top-level failures may fail open |
| L-SRC-06 | .codex/agents/*.toml; .claude/agents/*.md | Three native role registrations and six prompt contracts | Role sandbox declarations are not mechanically applied by pinned Codex |
| L-SRC-07 | workflow-runner.mjs; .claude/workflows/*.js | Two workflow wrappers, scratch isolation and schema normalization | Mechanical wrapper |
| L-SRC-08 | .agents/skills; .claude/skills/office; codex-viability.yaml | Source-confirmed intentional MagicPath delegation; current checker cannot validate the delegation reason | Contract/filesystem fact plus checker limitation |
| L-SRC-09 | memory README and scripts | Layered recall, candidate review and retrieval metrics | Mechanical governance plus human promotion |
| L-SRC-10 | observability; eval-methodology.md | Rule injection and eval contract | Current dirty worktree; exact hashes in source-manifest |
| L-SRC-11 | BENCHMARK-RUNBOOK.md; FUSION-RUNBOOK.md | Mode 2 and propose-only governance | Contract plus bookkeep checks |
| L-SRC-12 | verify/check scripts | Static/live wiring, anchor, scope and viability checks | Deterministic but branch-bounded and time-sensitive; static wiring 18/0/1, authorized full wiring 21/0/0, scope 88/0, and viability 33/0 → 32/1 → 34/0 as `handoff` and its projection arrived concurrently; full stdout was not persisted into this artifact set |
| L-SRC-13 | .codex/config.toml | Network and external writable-root classes with documented reasons | Mechanical config; broad blast radius |
| L-SRC-14 | `framework-audit/2026-08-11-rule-execution-system-review.md:85-92,135` (SHA-256 `4ca5c511893d791f9a3dcf32689af3e6bc77a03da9d42916c07a1bf1ad9159f3`) | Historical finding that prompt obligations lacked end-to-end proof and presence/anchor checks could stay green when behavior was absent | Precise historical evidence; current benchmark independently revalidated only selected analogous gaps |
| L-SRC-15 | `.claude/hooks/route-guard.mjs`; reproduced `--dry-run` with the exact explicit `NO_PIN` Mode 2 prompt | Explicit negative Project-Gate instruction returned `NEEDS_CONTEXT`; polarity is not reliably modeled | Reproduced deterministic counterexample; no state mutation |
| L-SRC-16 | `.claude/hooks/project-scope-guard.mjs:203-211`; `scripts/test-project-scope-guard.mjs` | Whole-command lexical rewrite, machine-specific fallback and fail-open/uncovered-tool edges coexist with PASS=88/FAIL=0 fixtures | Source inspection plus bounded deterministic test |
| L-SRC-17 | `.codex/agents/quality-gate.toml`; `.claude/agents/quality-gate.md:257-274`; O-SRC-19/20 | Read-only judge intent conflicts with mandatory self-writing eval record; native role projection preserves parent live permissions | Cross-contract/pinned-source contradiction |
| L-SRC-18 | `.claude/observability/scripts/write_observation.py`; eval/run-log writers | Count-derived IDs, full-file read-modify-write and multi-effect appends lack a demonstrated common lock/atomic commit | Source inspection; concurrency failure not stress-executed |
| L-SRC-19 | `.github/workflows/ci.yml`; `scripts/verify.sh`; focused check scripts | Remote CI omits parts of the full local verification surface and some HTML/quality failures remain warning-only | Source inspection; no remote workflow run |
| L-SRC-20 | `scripts/verify-codex-wiring.mjs`; authorized full run and failed outer-sandbox attempt | PASS=21/FAIL=0/BLOCKED=0 outside outer sandbox; inner failure occurred before hook load at app-server initialization | Observed live bundle, not exhaustive lifecycle branch coverage; stdout not durably captured in this directory |

## E. Known contract/implementation tensions

1. Custom-agent guidance exposes role configuration, but the pinned implementation explicitly filters sandbox/approval fields and preserves the parent's live permissions. For this benchmark, O-SRC-19/20 controls the actual pin.
2. Hooks are stable/default-on, yet prompt/agent handlers and some multi-source/executor paths remain skipped or first-only.
3. Multi-agent v1 is stable/on while v2 tools are stable/off. Capability existence is not equivalent to every tool generation being default.
4. Guardian approval is stable/on at feature level, but the default reviewer is `USER`; model auto-review still requires explicit opt-in plus interactive reviewer/model/account/organization conditions.
5. Official web pages are not pinned. Their hashes and access date support auditability, not permanent reproducibility.
6. The local worktree changed during the benchmark: `handoff` appeared after the initial viability run, briefly lacked a registry entry, then gained one in another concurrent flow. PASS=33/FAIL=0, interim PASS=32/FAIL=1 and final PASS=34/FAIL=0 are time-stamped facts; none is promoted into a clean immutable snapshot claim.

## F. Evidence-class rules

- FACT: observed in pinned source, exact local contents, deterministic command output, or public contract.
- INFERENCE: follows from facts but was not executed end-to-end.
- CLAIM: predicted benefit, cost, risk or future experiment outcome.
- Pinned source controls implementation claims when a mutable page is broader or ambiguous.
- Passing static checks do not prove live hook dispatch, semantic routing, permission isolation or cross-harness equivalence. The passing full wiring probe proves only the bundle and lifecycle branches asserted by that script, not all six events' allow/deny/rewrite/fail-open semantics.

<!-- FILE_END: evidence-index.md -->
