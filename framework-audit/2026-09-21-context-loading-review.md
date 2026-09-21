# Context loading: evidence, candidate design and acceptance gates

Status: REVISED CANDIDATE — independent dependency/test investigations and two red-team rounds completed. Round 1 rejected two MAJOR omissions and left C7 UNKNOWN; round 2 passed 3/3 text-closure checks after revision. This is not runtime or performance approval. No loading policy has been changed.
Scope: NO_PIN. Repository-controlled Claude/Codex context and consumers; external installed skills/plugins are measurement-only. No downstream project aliases or personal configuration changes.

## 1. Objective and evidence boundary

User priorities: make the framework lighter while preserving its logical chains. Changing WHEN a rule loads is allowed; making an obligation unreachable or bypassing its safety/quality gate is not.

This report distinguishes source facts, proposed design, and untested expectations. Static tests and multiple agents agreeing on the same source are not independent runtime proof. The earlier 30% reduction target is a proposed acceptance target, not a measured benefit or user-mandated number. No reduction threshold can override a safety failure.

### Observed source costs

| Surface | Bytes | Meaning |
|---|---:|---|
| AGENTS.md | 10,876 | Codex repository root contract |
| CONTEXT.md | 4,194 | Required startup read under current contract |
| generated/skill-catalog.md | 11,882 | Current discovery index |
| agent-context-manifest.json | 13,840 | Conditions plus machine/test metadata |
| Above four | 40,792 | File-size sum, NOT actual token/latency/charged-context measurement |
| office/SKILL.md | 15,043 | Shared skill execution contract, conditional on skill execution |
| plan-agent.md | 43,381 | Full planning contract, conditional on actual Plan triggers |

Do not sum every conditional owner and call that the cost of every task. External injected skill descriptions, caching, native system instructions and actual hook output are separate costs, currently unmeasured. Installed file size is not injected size.

### Actual loading mechanisms

- `.codex/hooks.json` and `.codex/codex-hook-adapter.mjs:155`: SessionStart/UserPromptSubmit stdout becomes additionalContext. Count output, not hook source size.
- `.claude/hooks/session-restore.mjs:547`: startup already runs memory summary; AGENTS K10 requests another agent invocation. Duplicate path is established; per-session duplicate cost requires traces.
- `.claude/hooks/session-restore.mjs:364-535`: startup claims one pending item and asks for disposition. Removing its instruction without a replacement consumer would strand the adjudication loop.
- `.claude/hooks/session-restore.mjs:616,771`: background governance/fetch side effects mean production hook invocation is not a read-only benchmark.
- `.claude/hooks/route-guard.mjs:1698-1730`: per-turn route/rule/obligation hints; project authority remains separate from hints. State attestation cannot be moved just to reduce textual output.
- `scripts/resolve-agent-context.mjs:18-25`: keyword canary, not an automatic semantic loader or evidence that an owner was consumed.
- `scripts/build-agent-context.py:203,224`: generates catalog/fallback and bounded fallback projections; it does not generate every root obligation.

Fresh baseline checks: generated projection check PASS; context checker PASS (10 kernel obligations, 16 pointers, 43 catalog entries, 6 fallback facts); both resolver canaries PASS. Branch-fixture output explicitly says shape-only, not live evidence.

## 2. Invariants that remain hot

1. Framework/product identity; NO_PIN and project pin truth; shared aliases are not authority.
2. First project read is already an effect boundary: do not defer isolation rules until writing or formal execution.
3. Semantic routing order, correct Plan trigger meanings, STOP not permission, human decisions remain human.
4. Standalone versus explicitly selected Workflow; quality/safety gates survive mode overrides.
5. framework/ read-only, preserve user edits, scoped external effects and truthful verification.
6. Governed memory default-no-write and the existing inline Static Fallback; no pointer-only fallback migration in this proposal.
7. A trigger summary must remain discoverable before the owner is loaded. Never hide the condition inside the file that the condition is meant to discover.

Each deferred obligation must retain: trigger, authority path, last-safe boundary, failure behavior and test evidence. These are review fields, not a proposal for a second runtime registry.

## 3. Candidate disposition ledger

| ID | Candidate | Hot rule retained | Last safe loading point | Missing-owner behavior / counterexample |
|---|---|---|---|---|
| C1 | Move only obligation-free narrative, never a whole history-titled section | Current red lines, domain/profile triggers AND current investigation disciplines | Before relying on a historical claim for narrative only; operative rules remain at their current reachable boundary | CONTEXT:51-55 positive/negative sample comparison and work-distribution questioning remain unmoved in this batch; new governance investigations must not depend on historical retrieval |
| C2 | Separate office observation/growth command detail from shared entry | Correction/recurrence/attribution duties AND all three completion self-reflection questions and their any-YES branch; no automatic promotion | Mid-task correction before continuation; completion self-reflection before DONE, including first successful discovery of a reusable pattern; command owner before writing | Do not write without owner; expose unresolved duty. Test successful no-correction/no-rework/no-recurrence path as well as corrections |
| C3 | Delay handoff format/examples, not handoff obligation | Decide handoff requirement and evidence collection at task entry; preserve exemptions | Before constructing handoff, announcing DONE or updating state | No DONE if required handoff cannot be validated; late discovery loses process evidence |
| C4 | Read a complete selected-skill input-mode projection rather than entire table | Mode selection and no gate bypass | Before assessing input sufficiency/overrides/upstream gates | Preserve all nested fields and submodes; do not grep only required fields |
| C5 | Conditionalize Plan platform/facade/template detail | Five triggers, internal HITL exemptions, assertion/approval rules | Before publishing a plan containing that platform/facade action | Do not publish executable phase without its contract; execution-time loading is too late for approval scope |
| C6 | Separate actionable manifest projection from machine metadata | Every semantic trigger, path, last-safe boundary and fallback remains accessible | Before conditional owner selection | Full authority remains recoverable; no loss of hidden/tombstoned skills or negative conditions |
| C7 | DEFERRED: no duplicate-fetch removal in the first implementation batch | Local fallback remains; equivalent scope/provenance/freshness/complete delivery currently unproved | Before consuming memory/rules | No injected-provenance mechanism has been validated, so do not skip the current fetch |
| C8 | Decouple pending-adjudication execution from ordinary startup | Persistent evidence, notice, fair consumption and explicit disposition | In an explicit governance consumer, before claiming adjudication complete | DEFERRED: keep current behavior until replacement consumer and starvation tests exist |
| C9 | Replace universal 'before answering' with specific before-consumption boundaries | Always-hot safe discovery kernel | First actual dependency use, possibly during research/planning | Scope classification is not authorization; project I/O still gates before reads |

Important correction to the initial informal advice: **do not simply remove catalog discovery or postpone the whole office contract**. Catalog defining constraints support semantic discovery and STOP; office contains obligations that determine what evidence must be collected from the beginning. Any smaller projection needs semantic coverage tests, not just shorter text.

Already cold, not new savings: optional Workflow graph and office wizard. Inspecting workflow concepts does not authorize reading/running the wizard. Source: office/SKILL.md:319-321.

Plan summary drift is factual: AGENTS K3 says >=3 files; Plan authority says >=3 files created/modified. A corrected projection must preserve meaning and exemptions, not broaden read-only questions into planning.

## 4. Independent investigation findings

### Dependency review

The investigator traced office, Plan, routing, handoff and memory consumers. Conclusion: minimize material with no imminent consumer, not protocols themselves. Most defensible candidates are C1-C5 with retained triggers. Catalog removal, whole-office deferral, and dropping pending notices without a consumer are not supported.

### Test-evidence review

- `check-agent-context.mjs:32-89`: structural/path assertions and owner existence are useful but not proof of safe agent behavior.
- `run-agent-context-ab.mjs:963-979`: required startupTargets encode current timing. Migrate these assertions explicitly when timing changes, retaining independent safety claims.
- `run-agent-context-ab.mjs:705-750,949-960`: actual trace/path and root-only fallback checks are valuable and must not be weakened to make an experiment pass.
- `run-agent-context-ab.mjs:884`: decision-only prompts explicitly prohibit skill execution. Existing PASS cannot demonstrate end-to-end completion or recovery.
- `agent-context-branch-fixtures.mjs:15-21,152-161`: synthetic fixtures disclose absent live dispatch/recovery/receipt evidence.
- Historical logs contain both path-conformance failures and genuine semantic loss. Do not pool them as one safety score or reuse earlier version wins as fresh acceptance.

### Counterexamples to exercise

1. Read a shared project alias during fact gathering, then load project-session: too late.
2. Only discover skills after keyword matches: semantic STOP never reaches the right skill.
3. Make Static Fallback pointer-only: hook/owner failure removes the safety floor.
4. Delay handoff eligibility until task end: required evidence was never captured.
5. Delay platform rules until implementation: user approved an invalid fallback path.
6. Silence pending adjudication without a reliable consumer: evidence survives but no decisions occur.

## 5. Proposed validation and rollout (not yet executed)

No new generic workflow or parallel source of truth. Use existing manifest/kernel/generator and test seams where possible. Each candidate is a separately reviewable patch with explicit inverse/revert scope; no destructive worktree reset.

1. Freeze the effective baseline (HEAD plus relevant dirty-file hashes), runtime versions and scoring protocol. Separate unrelated dirty work. Missing baseline safety evidence remains a baseline problem, not an excused candidate regression.
2. Define semantic obligations independently of old file names/timing. Score correct behavior, timely full owner consumption, forbidden effects and cost separately.
3. Test positive/negative pairs: routine Q&A; semantic no-keyword discovery; explicit skill; ambiguity; Plan read-vs-write boundary; NO_PIN; project first read; standalone; selected Workflow; handoff; memory correction; pending governance; platform human choice; delegate/adjudicate; missing hook/owner; multi-turn/compact/resume.
4. Actual execution tests use isolated fixtures with controlled writes and receipts. Never perform external production actions to prove a refusal gate. Missing input must stop in both versions.
5. Mutations: delete a trigger; move an owner read after its protected action; remove a handoff requirement; permit an alias read or automatic fallback; stale the selected-skill projection. Tests must fail for the intended behavior, not merely changed wording.
6. Measure each scenario's pre-task and total-task bytes/tool calls/available token usage/elapsed time separately. Same model/harness/config, paired trials, raw failures retained. Three repeats are a screening sample, not statistical proof of rare-event reliability. The earlier 192-session estimate is a planning envelope, not authorization for unbounded live calls.
7. No safety regression tolerated in the tested matrix. Proposed light-task target: >=30% less pre-task repository-controlled context; full-task repository-controlled delivered bytes must not increase for the same scenario. Paired actual-token and elapsed-time medians must be reported separately; an apparent pre-task win with increased full-task cost is not an automatic PASS. If model variance prevents a stable conclusion, mark INCONCLUSIVE rather than lowering the bar or repeatedly sampling until success. Any deliberate trade-off that increases total cost requires a separate user decision before rollout. This criterion is a proposal, not measured benefit.
8. After independent redteam closure, request implementation approval for exact candidate scope; current authorization only implements the separate correlation repair. No context-loading mutation or publication in this research stage.

## 6. Redteam result and response

Independent round 1: FAIL, six candidate safeguards stood, C1/C2 had MAJOR omissions, C7 was UNKNOWN. No candidate runtime tests were executed. Full finding record: `framework-audit/2026-09-21-context-loading-redteam.md`.

- C1 accepted: a heading saying "history" does not make every instruction beneath it historical. Retain the current investigation rules; move only pure narrative. Add a new governance task that cites no history as a negative canary.
- C2 accepted: keep all three completion-reflection questions and any-YES trigger, including positive first-time discovery. Command examples may be cold; the decision to inspect/record cannot disappear.
- C7 deferred: lack of a trusted equivalence signal is a real evidence gap. No deduplication claim or implementation in the initial batch.
- Measurement warning accepted: add a full-task non-increase gate and an explicit INCONCLUSIVE outcome rather than approving a smaller prelude with greater total burden.

Round 2 independently read back the revised report and source rules: C1 PASS, C2 PASS, cost gate/C7 deferral PASS (3/3). The reported textual omissions are closed; behavioral evidence is still absent.

## 7. Open evidence

No candidate version, dual-harness execution comparison, external-injection measurement or performance benefit is yet verified. Final optimization approval is therefore not available. Next gate: agree exact first-batch scope and freeze the implementation plan. C7/C8 remain deferred. Only after scoped implementation and the frozen behavior/cost matrix can the framework be described as lighter without observed chain regressions.
