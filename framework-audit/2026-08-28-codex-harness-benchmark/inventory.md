# System Inventory — OpenAI Codex and luca_gstack

Status: `RESEARCH_COMPLETE / PENDING_HUMAN_GATE`
Inventory date: `2026-08-28`

## 0. Boundary and method

- OpenAI Codex is inventoried from official source pinned at `7d6f808b97e424da80271be8cc539e8c5437a229`; public-contract claims use OpenAI documentation visited on `2026-08-28`.
- luca_gstack is inventoried from the current meta worktree at HEAD `b438c92b1d1dbb28f5252396181f1cb9ab806900`.
- The local inventory stayed `NO_PIN`. No product context, project workflow state, current topic, or identity transaction was read or invoked.
- `VERIFIED` means source or deterministic local evidence exists. `INFERENCE` is explicitly marked. A static checker is never promoted to live end-to-end proof.
- The units below are a coverage inventory, not a claim of one-to-one or exhaustive granularity. Both sides are decomposed into runtime, trust-boundary, state, extension, or governance units, but Codex exposes more native subsystems while several luca units are contracts or model-enforced processes. A census at the pin found 131 `FeatureSpec` entries and 106 first-level `codex-rs/` directories, so the 36 upstream units are deliberately clustered coverage units. Normalization happens at the capability-matrix layer and target-different rows are not aggregated as commensurable evidence.

## 1. OpenAI Codex pinned inventory — 36 units

| Unit | Status / maturity | Capability | Pinned implementation | Important limit or failure semantic |
|---|---|---|---|---|
| OAI-001 Feature registry | VERIFIED; core | Machine-readable `UnderDevelopment / Experimental / Stable / Deprecated / Removed` stage and default | `codex-rs/features/src/lib.rs:45,92,859+` | Stable does not imply enabled; Removed can mean compatibility key or always-on replacement |
| OAI-002 CLI dispatch | VERIFIED; core | TUI, exec, review, MCP/app/exec-server command surface | `codex-rs/cli/src/main.rs:132,1046,1091+` | Subcommands independently load config/auth/trust; deprecated entry points remain visible |
| OAI-003 TUI event loop | VERIFIED; core | Async dispatch across terminal, thread, app-server and timer events | `codex-rs/tui/src/app/startup.rs:712-865`; `tui/src/app.rs:781` | Stream shutdown semantics differ by source; app-server stream loss warns and degrades |
| OAI-004 App-server client boundary | VERIFIED; core | Embedded, local daemon and remote client modes; websocket/unix transports | `codex-rs/tui/src/lib.rs:474`; `app-server-client/src/lib.rs:317,735,743` | Invalid remote endpoint blocks startup; lag is surfaced explicitly |
| OAI-005 Headless exec | VERIFIED; core | Non-interactive agent execution with JSONL or human event processing | `codex-rs/exec/src/lib.rs:246,408-436,585-617,660+` | Default approval is `Never`; required MCP/config/login failures exit non-zero |
| OAI-006 Thread API | VERIFIED; core | Submit, start-or-steer, start-if-idle, steer and event stream | `codex-rs/core/src/codex_thread.rs:212,257,348,360,462,587` | Busy/idle state is explicit; invalid steering fails rather than silently queuing |
| OAI-007 Thread manager | VERIFIED; core | Start/resume/fork/shutdown and persisted state integration | `codex-rs/core/src/thread_manager.rs:173,223,228,342,2263-2278` | Sampling-boundary fork has a documented TODO; shutdown distinguishes failure types |
| OAI-008 Rollout recorder | VERIFIED; core | Append-only JSONL session ledger with flush/shutdown and repair | `codex-rs/rollout/src/recorder.rs:86-179` | Terminal writer failure is remembered and propagated; tail repair is supported |
| OAI-009 Local compaction | VERIFIED; core | PreCompact gate, local summary, retry after history trimming, context reinstall | `codex-rs/core/src/compact.rs:116,148,174,194,252,352-397` | Hook can stop compaction; repeated compaction emits an accuracy warning |
| OAI-010 Remote compaction v2 | VERIFIED; Stable/on | Remote/fallback-model compaction and image-budget installation | `codex-rs/core/src/compact_remote_v2.rs:83,109,169,245-321` | Fallback is policy-bound; hook block prevents compaction |
| OAI-011 Config layers | VERIFIED; core | Ordered packaged/managed/system/cloud/user/profile/project/session layers and merge | `codex-rs/config/src/config_layer_source.rs:6,33-50`; `loader/mod.rs:94-132` | Arrays replace wholesale; invalid ordering and strict-config errors surface |
| OAI-012 Project trust | VERIFIED; core | Untrusted project layers are disabled with observable provenance | `codex-rs/config/src/loader/mod.rs:1031,1061,1107-1124,1644-1649` | Disables project config, hooks and exec policy; malformed trusted config is a hard error |
| OAI-013 AGENTS instructions | VERIFIED; core | Root-to-CWD merge, override-first lookup, fallbacks and shared byte budget | `codex-rs/core/src/agents_md.rs:1-16,39-51,55-90,138-175` | Untrusted projects contribute no project guidance; oversized content truncates |
| OAI-014 Skills | VERIFIED; Stable selection/search | Metadata/schema parsing, multi-scope discovery, explicit/implicit invocation | `codex-rs/skills/src/model.rs:8-94`; `parser.rs:4,44,82-85`; `loading.rs` | Product policy metadata is parsed but not yet enforced in selection/injection |
| OAI-015 Skill MCP dependencies | VERIFIED; Stable/on | Resolve, deduplicate, install and enable skill-declared MCP dependencies | `codex-rs/core/src/mcp_skill_dependencies.rs`; feature registry `1417-1422` | Individual dependency failure warns; unavailable capability is not presented as usable |
| OAI-016 Plugins | VERIFIED; Stable/on | Authority-bound manifest, skills/MCP/hooks/interface packaging and injection | `codex-rs/plugin/src/manifest.rs:8-42`; `provider.rs:32`; `plugin_id.rs:10` | Resource escapes are rejected; explicit injected instructions capped at 4 KiB |
| OAI-017 Hook engine | VERIFIED; Stable/on | 12 lifecycle events; sync/async command and MCP handlers; trust metadata | `codex-rs/hooks/src/lib.rs:22-36`; `engine/mod.rs:55-149,212-318` | Executor-scoped fan-in currently selects first applicable sources/handlers with warnings |
| OAI-018 Hook failure semantics | VERIFIED; Stable/on | Block/rewrite/fail-open rules differ by lifecycle event and output validity | `hooks/src/events/{pre_tool_use,stop,compact}.rs` | Some invalid allow/ask outputs fail open; required Stop failures are fail closed |
| OAI-019 Multi-agent v1 | VERIFIED; Stable/on | Spawn-slot reservation, depth/capacity checks, parent metadata and rollout fork | `core/src/agent/registry.rs:96`; `agent/control/spawn.rs:227` | Capacity/depth are hard limits; reservation cleanup prevents leaked slots |
| OAI-020 Multi-agent v2 tools | VERIFIED; Stable/off | Canonical task tree plus spawn/follow-up/interrupt/list/send/wait | `core/src/tools/handlers/multi_agents_v2/*` | Root/self interrupt rejected; feature is not default despite Stable stage |
| OAI-021 MCP catalog | VERIFIED; core | Resolve configured/plugin/environment servers; refresh and required startup admission | `core/src/mcp.rs:74,312-350`; `session/mcp_runtime.rs` | Authority and restriction filters apply; required failure can block exec |
| OAI-022 MCP/tool exposure | VERIFIED; core | Direct/deferred/hidden exposure, schema validation and context budgets | `core/src/mcp_tool_exposure.rs:19-20,90-143,157-183` | 8 KiB/server and 64 KiB aggregate agent-plugin spec caps; invalid schema hides tool |
| OAI-023 App tool policy | VERIFIED; Stable apps | Managed→tool→app→global approval precedence and conservative annotations | `connectors/src/app_tool_policy.rs:11,165-201,228-233` | Missing annotations are treated as risky; managed disable cannot be locally overridden |
| OAI-024 MCP elicitation/OAuth | VERIFIED; Stable/on | Authentication elicitation, pending-request lifecycle and CLI management | `core/src/session/mcp.rs`; `cli/src/mcp_cmd.rs:66-72,408,426-428` | Unknown/finished elicitation rejects; unsupported OAuth is not faked |
| OAI-025 Tool registry | VERIFIED; core | Typed handler/runtime registry, hook boundary, telemetry and parallel read/write lock | `core/src/tools/registry.rs:55,271,341,569,685`; `parallel.rs:41,112-156` | Non-fatal errors become model-visible failures; fatal errors terminate the turn |
| OAI-026 Unified exec | VERIFIED; Stable/on | PTY/background process, polling, streaming stdin and bounded process table | `core/src/unified_exec/mod.rs:1-23,68-77`; `process_manager.rs` | 64-process cap, bounded yield/buffer; sandbox retry cannot bypass policy |
| OAI-027 Sandbox/approval | VERIFIED; core | Approval cache, filesystem/network sandbox and explicit escalation requirements | `protocol/src/protocol.rs:963,1049-1075`; `tools/sandboxing.rs:40-294` | Approved escalation still cannot bypass denied-read constraints |
| OAI-028 Exec policy | VERIFIED; preview language | Allow/Prompt/Forbidden command rules and optional rule amendment | `execpolicy/src/decision.rs:9`; `core/src/exec_policy.rs:380-438,734-814` | Prompt becomes Forbidden when prompts are unavailable; Forbidden is always hard reject |
| OAI-029 Guardian auto-review | VERIFIED; Stable/on base capability | Separate approval reviewer, fail-closed review errors and rejection circuit breaker | `core/src/guardian/review.rs:188-367`; `guardian/mod.rs:60-66,195-242` | Default `ApprovalsReviewer` remains `USER`; model auto-review requires explicit opt-in and interactive policy; 90-second timeout; 3 consecutive or 10/50 denial break |
| OAI-030 App-server protocol | VERIFIED; core | Typed JSON-RPC v2 for threads, turns, permissions, MCP, skills, plugins and hooks | `app-server/src/message_processor.rs:1116+`; `app-server-protocol/src/protocol/v2/*` | Invalid dynamic tools return InvalidParams; some combinations remain experimental |
| OAI-031 TypeScript SDK | VERIFIED; public | Convenience start/resume wrapper over `codex exec --json` | `sdk/typescript/src/{codex,thread}.ts` | Narrow API; does not expose the complete app-server control plane |
| OAI-032 Python SDK | VERIFIED; public | App-server JSON-RPC client with broad thread/turn/goal controls | `sdk/python/src/openai_codex/client.py:212,227-229,430-850` | Per-thread serialization; reader failure includes bounded stderr diagnostics |
| OAI-033 Exec server | VERIFIED; core/conditional | Remote/local process, filesystem, HTTP and capability-root environment access | `codex-rs/exec-server/src/lib.rs:46-211`; `environment.rs:69-101` | Capability discovery feature is under development; protocol errors are explicit |
| OAI-034 Observability | VERIFIED; core + experimental metrics | OTEL exporters, best-effort analytics queue and persistence metrics | `core/src/otel_init.rs:13-95`; `analytics/src/client.rs:192,255-274,793` | Analytics intentionally drops on pressure and never includes content |
| OAI-035 Rollout trace | VERIFIED; opt-in | Higher-fidelity raw trace bundle and deterministic replay reducer | `codex-rs/rollout-trace/src/lib.rs:1-78` | Opt-in environment; complements rather than replaces standard rollout |
| OAI-036 Test/eval/CI | VERIFIED breadth; coverage unknown | Unit, integration, snapshot, conformance, cross-platform CI and macrobench | 698 files from `find codex-rs -path '*/tests/*' -type f`; 1,135 files from `find codex-rs -type f \( -name '*_tests.rs' -o -path '*/tests/*.rs' \)`; `justfile`; CI workflows | These exact predicates are reproducible, but file counts do not prove coverage; no single rubric-driven agent-quality evaluator was confirmed |

### OpenAI maturity snapshot

- Stable/on examples: unified exec, hooks, multi-agent v1, apps, plugins, skill search/dependency install, Guardian approval, goals.
- Stable/off examples: multi-agent v2 and recommended plugins.
- Experimental/off: network proxy.
- Under development/off: granular permission tools, selected MCP changes, executor capability discovery, Guardian v2, token/rollout budgets, runtime metrics.
- Removed cannot be read as “capability absent”; several removed flags correspond to compatibility or always-on behavior.

## 2. luca_gstack pure-meta inventory — 46 units

| Unit | Status | Capability | Local authority | Important limit or failure semantic |
|---|---|---|---|---|
| LG-001 Codex hook registry | VERIFIED | Six project lifecycle registrations | `.codex/hooks.json:1-74` | Structured stdout decisions can block at exit 0; the shell wrapper preserves only exit 2, while crashes and other non-2 exits fail open; absolute memory-root coupling remains |
| LG-002 Hook adapter | VERIFIED | Claude-hook payload/tool-name adaptation for Codex | `.codex/codex-hook-adapter.mjs:60-68,80-100,124-153,202-249` | 30-second/64 MiB bounds; child-hook failure fails open |
| LG-003 Harness abstraction | VERIFIED | Protocol harness versus actual harness and tool-scope helpers | `.claude/hooks/lib/harness.mjs:25-48,69-127` | Codex scope is limited to dispatched Bash/patch paths; legacy fields invite misuse |
| LG-004 Routing SSOT | VERIFIED | Framework, project and built-in intent map | `.claude/skill-os/skill-routing-map.yaml` | One framework flow, 22 project routes and 24 built-in routes; semantics remain heuristic |
| LG-005 Route guard | VERIFIED with reproduced defect | Project/Plan/Framework Evolution/multi/single/STOP classification | `.claude/hooks/route-guard.mjs:191-280,638-698,802-1078`; Mode 2 dry-run | Mostly prompt steering; a minimal explicit `NO_PIN`/"do not trigger Project Gate" benchmark prompt returned `NEEDS_CONTEXT`, showing polarity/negation reversal |
| LG-006 Input modes | VERIFIED | Standalone/workflow/governance contracts | `.claude/skill-os/input-modes.yaml` | Structured but mainly model-enforced |
| LG-007 Optional graph | VERIFIED | Recommended flows and handoff gates | `.claude/skill-os/optional-workflow-graph.yaml` | Advisory by design; quality gates rely on the executor checking them |
| LG-008 Plan Agent | VERIFIED | Complexity gate, HITL decomposition, assertions, waves and replan | `.claude/agents/plan-agent.md` | Prompt contract, not a registered Codex agent |
| LG-009 Orchestrator | VERIFIED | Phase/quality-gate/checkpoint orchestration with bounded parallelism | `.claude/agents/orchestrator.md` | Explicitly not a subagent; compliance is model-level |
| LG-010 Work Agent template | VERIFIED | Task package, done criteria and state vocabulary | `.claude/agents/work-agent-template.md` | Template only; no independent runtime isolation |
| LG-011 Native Codex agent registrations | VERIFIED with critical limitation | Preflight, quality-gate and prototype judge role contracts | `.codex/agents/*.toml`; pinned `core/src/agent/role.rs`; `role_tests.rs` | The TOMLs declare `sandbox_mode = "read-only"`, but pinned Codex role overrides do not apply sandbox/approval fields; spawned roles preserve the parent's live permissions. “Read-only” is therefore an instruction intent, not a mechanical property. High-level planner/orchestrator roles are not registered. |
| LG-012 Model routing | VERIFIED | Cross-harness tier→reasoning-effort mapping | `.claude/skill-os/model-routing.yaml:120-158` | Stable effort set; hard-coded runner mapping creates a second truth source |
| LG-013 Workflow runner | VERIFIED | Execute compatible JS workflows through structured `codex exec` agents | `.codex/workflow-runner.mjs` | Strong scratch-CWD write isolation; wrapper process/schema/timeout complexity |
| LG-014 Evolution scout | VERIFIED | Discover→verify→redteam→quarantine/opportunity pipeline | `.claude/workflows/framework-evolution-scout.js` | Candidate-only, default deny; research output does not implement changes |
| LG-015 Mode 2 benchmark | VERIFIED | Inventory, matrix, dossier, redteam, review and human GATE | `.claude/skill-os/evolution/BENCHMARK-RUNBOOK.md` | Strong governance contract; execution still depends on agents honoring the runbook |
| LG-016 Project substrate | VERIFIED | Canonical identity, schema-v2 state machine, lock/CAS and atomic writes | `.claude/hooks/lib/project-substrate.mjs` | Strong mechanism but complex and local-layout dependent; not invoked in this run |
| LG-017 Scope guard | VERIFIED with bounded fixtures | No-pin/cross-project deny, rewrite, symlink confinement and framework protection | `.claude/hooks/project-scope-guard.mjs`; `scripts/test-project-scope-guard.mjs` | Scans and rewrites whole Bash strings, includes a machine-specific fallback, cannot reliably distinguish every read/write form under NO_PIN, and top-level/uncovered-tool failures can fail open; existing fixture suite still passes 88/0 |
| LG-018 Project transaction CLI | VERIFIED, not invoked | Session/transaction/epoch switch with staging and commit | `scripts/project.sh`; `scripts/project-pin.mjs` | Explicit transaction authority required; forbidden by this benchmark's meta override |
| LG-019 Project lease | VERIFIED, not invoked | Owner handle, no age-steal and explicit recovery | `scripts/project-lease.mjs` | Strong concurrency mechanism; recovery is an explicit operation |
| LG-020 Link consistency | VERIFIED, not invoked | All-absent/all-symlink tuple and session-state validation | `scripts/check-project-links.mjs` | Project-facing check intentionally skipped under pure-meta NO_PIN scope |
| LG-021 Session restore | VERIFIED | Spools, bounded logs, parallel-session detection, conditional display cleanup, memory summary | `.claude/hooks/session-restore.mjs` | Many best-effort/fail-open branches; product-state reads excluded from this run |
| LG-022 Stop checkpoint | VERIFIED | Edit/tool thresholds and rearm for growth checkpoint | `.claude/hooks/session-sync.mjs:147-203` | Kill switches and fail-open paths exist; threshold is activity, not quality proof |
| LG-023 Session end | VERIFIED | Temporary counter cleanup while retaining session identity | `.claude/hooks/session-end.mjs` | Advisory/fail-open |
| LG-024 Post-edit | VERIFIED | Edit counters and app HTML-open spool | `.claude/hooks/post-edit.mjs` | Narrow tool/path coverage; local app dependency |
| LG-025 Framework protection | VERIFIED | Protected framework write zone and explicit escape hatch | `project-scope-guard.mjs:461-500`; `AGENTS.md` | Strong only where hook dispatch reaches; escape hatch is environment/file based |
| LG-026 Codex sandbox config | VERIFIED | Network plus four external writable-root classes | `.codex/config.toml:42-53` | Solves cross-link writes by granting a broad root; regular-session blast radius is large |
| LG-027 Approval posture | INFERENCE | Inherited from runtime, not fixed by repository | `.codex/config.toml`; runner invocation | Cannot infer a universal approval policy from local repository files |
| LG-028 Human gate | VERIFIED contract | Plain-text stop when no structured question UI exists | `AGENTS.md` human-gate contract | Strong invariant but generally not backed by a central approval service |
| LG-029 Codex skill projection | VERIFIED | Office skill surface exposed through `.agents/skills` | `.agents/skills`; wiring verifier | 33 discoverable entries, but existence tests do not prove semantic identity |
| LG-030 MagicPath intentional delegation | VERIFIED | Office placeholder deliberately delegates the same name to the external MagicPath implementation | `.agents/skills/magicpath`; `.claude/skills/office/magicpath`; `.claude/skill-os/codex-viability.yaml` | Intent is source-confirmed. The proven checker gap is narrower: parity checks do not encode or validate the source-owned delegation reason, so an accidental substitution could look identical. |
| LG-031 Route-table compensation | VERIFIED | First-class table compensates for host skill-description truncation | `AGENTS.md` routing table | Manually maintained and therefore drift-prone |
| LG-032 MCP/app bridge | VERIFIED conditional | Muse launcher injects seven tools into launched sessions | Framework launcher/appendix contracts | Not repository-native or universally present; must not be scored as always available |
| LG-033 App IPC fallback | VERIFIED | File-spool open/session/preview bridge | `scripts/luca-open.sh`; restore/post-edit hooks | Weakly coupled; absent app can fail silently or time out |
| LG-034 Layered memory | VERIFIED | Episodic/semantic/procedural/working separation | `memory/README.md` | Strong governance; some portability depends on configured external roots |
| LG-035 Memory retrieval | VERIFIED | Keyword/CJK-bigram ranking, layer isolation and mattered logging | `memory/scripts/search_memory.py` | Not semantic embeddings; vocabulary mismatch limits recall |
| LG-036 Candidate proposal | VERIFIED | Stable proposals remain candidates, never direct promotions | `memory/scripts/propose_semantic.py` | Candidate IDs scan hard-coded/local roots in some paths |
| LG-037 Review/promotion | VERIFIED | Locking, atomic writes, conflict/duplicate checks and promotion-ready gate | `memory/scripts/consolidate_memory.py` | Human stable decision required; some lock errors degrade open |
| LG-038 Daily governance | VERIFIED | Aggregates memory/eval/gap/person/loop/upstream/benchmark health | `memory/scripts/daily_governance.py` | Automates already-approved states, not the human judgment itself |
| LG-039 Active rules | VERIFIED | Short skill/scene rules injected by route guard | `.claude/observability/scripts/get_rules.py`; route guard | Delivery is mechanical on the covered path, but separate best-effort parsers and upstream rule quality leave drift/failure ambiguity |
| LG-040 Observation writer | VERIFIED with concurrency gap | Append feedback and optionally activate a rule | `.claude/observability/scripts/write_observation.py` | Count-derived IDs, unlocked full-file rules read-modify-write, and non-transactional observation+rule effects can collide or lose updates under parallel writers |
| LG-041 Eval recording | VERIFIED partial with authority conflict | Evidence-bound criteria and quality-gate record path | `.claude/skill-os/eval-methodology.md`; `.claude/agents/quality-gate.md`; `.codex/agents/quality-gate.toml` | No universal proof every eval ran; the judge is declared read-only while its shared contract mandates self-writing eval-log, which cannot be both mechanically true under the pinned role projection |
| LG-042 Evolution bookkeeping | VERIFIED | Complete-run and idempotency checks before updating evolution statistics | Evolution bookkeep script and tests | Does not apply suggestions; intentionally separate from adoption |
| LG-043 Viability registry | VERIFIED | Tier/degradation coverage for 32 operational skills at final sample | `.claude/skill-os/codex-viability.yaml`; checker | Discovery/anchor confidence, not end-to-end behavior proof; a concurrent `handoff` update exposed a real time-of-check race |
| LG-044 Capability parity anchors | VERIFIED partial | Presence tripwires for cross-surface contract anchors | `.claude/skill-os/capability-parity.json`; checker | Anchor presence can pass while behavior or semantics diverge |
| LG-045 Verification suite | VERIFIED breadth, uneven severity | Static/live wiring, route, hook, memory, transaction and contract checks | `scripts/verify.sh`; repository CI/check scripts | Authorized full wiring probe passed, but remote CI omits part of the full local verify surface and several HTML/quality checks downgrade failures to warnings |
| LG-046 Dual-checkout warning | VERIFIED partial | SSOT drift warnings across canonical and current checkout | Framework contracts and verification | Warning rather than blocking; absolute-root assumptions remain |

## 3. Deterministic local checks

The inventory lane began with meta-safe static checks and later added an explicitly authorized read-only nested-Codex probe outside the outer sandbox. None invoked project identity transactions:

- `verify-codex-wiring.mjs --static`: `PASS=18`, `FAIL=0`, `BLOCKED=1`; the blocked item is the intentionally skipped live Codex session probe.
- `verify-codex-wiring.mjs` outside the outer sandbox: `PASS=21`, `FAIL=0`, `BLOCKED=0`. The first attempt inside the outer sandbox failed before hook loading during app-server initialization with `Operation not permitted`; that environment failure is not a hook-wiring failure. The successful bundle proves only the branches asserted by the verifier.
- `check-capability-parity.mjs`: all declared anchors present.
- `test-project-scope-guard.mjs`: `PASS=88`, `FAIL=0`; the hard-coded fallback, route-negation case and broader command/tool mutation space are not covered by that green result.
- Initial inventory-lane run, before a concurrent `handoff` skill appeared: `PASS=33`, `FAIL=0`.
- Interim rerun at `2026-08-28T15:44:25+0800`: `PASS=32`, `FAIL=1` across 32 skills; `handoff` was missing from the viability registry.
- Final verification after a concurrent registry/source update: `PASS=34`, `FAIL=0` across 32 skills. Final sampled inputs at `2026-08-28T15:49:36+0800`: `handoff/SKILL.md` SHA-256 `41f867ee...067b`; `codex-viability.yaml` SHA-256 `749786e3...5f08`.

Interpretation: the initial and final snapshots are viability-green, with a real interim red state while `handoff` and its registry projection arrived asynchronously. This is a time-of-check/input-freeze race. The benchmark made no source/registry repair and records the full timeline. None of the three results proves live dispatch, semantic route correctness, every-human-gate execution, or behavioral parity.

## 4. Inventory-level findings

1. `FACT` — Codex is a native runtime/control plane with explicit sandbox, approvals, typed protocols, thread persistence and broad lifecycle coverage. luca_gstack is a higher-level governed Skill OS layered on one or more runtimes.
2. `FACT` — luca_gstack's strongest mechanical systems are project state/CAS, scoped writes, scratch-isolated workflow agents and candidate→review→promote memory.
3. `FACT` — luca_gstack's weakest systems are obligations whose completion is inferred from prompt compliance or anchor presence: planning, orchestration, universal eval recording and semantic parity.
4. `FACT` — OpenAI source has a single machine-readable feature maturity registry; luca_gstack spreads maturity across viability, routing, feature comments and audit narratives.
5. `FACT` — MagicPath is an intentional delegation documented by both the office placeholder and viability source. The checker gap is that filesystem reachability/anchors do not express or verify that source-owned intent.
6. `FACT` — The local scope guard lexically rejected a read-only search because a project-shaped path appeared in the command string, reproducing a known false-positive class. This finding does not by itself justify Codex execpolicy as the remedy.
7. `FACT` — Pinned Codex ignores role-file sandbox/approval overrides and reapplies the parent's live permission profile. The three local judge TOMLs are not mechanically read-only despite their declarations.
8. `FACT` — A minimal explicit `NO_PIN` Mode 2 request is misclassified by the current route guard because negative scope language is treated as positive lexical evidence.
9. `FACT` — Local scope protection has a stronger CAS/lease/session-identity core than its lexical wrapper: whole-command rewriting, hard-coded fallback and fail-open edges are not closed by the passing 88-case suite.
10. `FACT` — The current quality-gate contract combines independent/read-only verdict intent with mandatory self-recording, while observability writers do not demonstrate a shared atomic concurrency boundary.
11. `FACT` — Local verification has strong focused fixtures, but CI requiredness/severity and machine-local projection portability can still produce false-green or non-reproducible outcomes.
12. `INFERENCE` — The highest-value direction is compositional: consume Codex as the native execution substrate and retain luca_gstack's governed workflow semantics, rather than rebuild either layer inside the other.

<!-- FILE_END: inventory.md -->
