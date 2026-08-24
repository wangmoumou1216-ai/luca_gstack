# Round-3 Routing Red Team

Reviewed unchanged plan SHA `b12f06e9786593313add0c33533041f46840ee0e306d7f19168a38fee24aaf04` — 2500 lines.

Verdict: **FAIL**

- BLOCKER: 1
- MAJOR: 4
- MINOR: 2

No files were modified during the review.

## BLOCKER

### B1 — Plan approval destroys the obligation before any Orchestrator execution is observed

Evidence:

- `FINAL-EXECUTION-PLAN.md:639`: exact plan approval → `SATISFIED`.
- `:821`, `:1467`: `SATISFIED` permits Stop and removes the route block.
- `:1077`: `SATISFIED` restores the ordinary project grant.
- `:1293`, `:1392-1393`, `:2197`: repeat `approval → SATISFIED` as the required oracle.
- Current authoritative contract `.claude/agents/plan-agent.md:20-22` requires approval to enter Orchestrator Free Task Mode and execute.
- The literal implementation scope `FINAL-EXECUTION-PLAN.md:1992-2063` contains neither `.claude/agents/orchestrator.md` nor an approved-plan execution controller/contract.

Counterexample:

1. Receipt selects PLAN.
2. Registered Plan Agent returns valid `PLAN_READY`.
3. Finalizer presents it correctly.
4. User sends the exact SHA approval.
5. State becomes `SATISFIED`; the main agent invokes no Orchestrator/tool and Stops.

Every planned route/Stop assertion passes, yet the original “agent ignored the hint and stopped” failure survives immediately after approval.

Minimum required revision:

- Replace `APPROVAL → SATISFIED` with `APPROVAL → PLAN_EXECUTION_PENDING`.
- Atomically bind an execution identity to `{plan_result_id,result_sha256,generation,event,boundary,project identity}`.
- Stop must block in pending/active states.
- PreToolUse must allow only the approved-plan execution capability.
- Per-phase PostTool/output/human-wait receipts must advance it; only a verified finalizer may set `SATISFIED`.
- Add the Orchestrator/approved-plan execution policy and parity files to §§12–13 and the release manifest.

There is no smaller equally provable closure. Durable obligation, PreTool write gate, explicit transition/execution receipt, and Stop gate are logically distinct. A controller may combine receipt and begin-execution atomically, but removing any one reopens either silent Stop, unauthorized writes, or unwitnessed completion.

## MAJOR

### M1 — Project-change continuation is neither total nor presentation-proven

Evidence:

- `:384-388`, `:1469-1476`: only a later bare `继续|接着|继续做` applies `PROJECT_CHANGE_COMMITTED`.
- Active rule `.claude/observability/rules.yaml:73-80` requires the next user message after a forced switch to auto-resume the established task.
- `:1504-1506` lets the clean committed boundary Stop without an exact persisted display.
- `:1372`, `:1374`, `:1510-1511` similarly let project-only `D.status=WAITING_CONFIRMATION` Stop without `PRESENTATION_PENDING`.
- L0 projection coverage `:2399-2402` omits both displays.

Counterexample: after the combined muse switch commits, the assistant returns an empty/unrelated final message and Stops. The next user message is `设置先按账号、安全、通知三组。`, not bare continue, so the obligation remains deferred instead of auto-resuming.

Required revision:

- Persist and byte-verify exact displays for the committed-DEFERRED boundary and project-only D before Stop.
- On the first `DIFFERENT_DRAINED` event, apply `PROJECT_CHANGE_COMMITTED` before ordinary route classification for every non-cancel/non-explicit-new-task/non-project-revision event; then process that same event as status/correction/answer.
- Add L0/L3 cases and deletion mutants for both displays and substantive-next-message auto-resume.

### M2 — Final no-capability UI handoff deterministically repeats Project Gate

Evidence:

- `:53-60`, `:2129-2138`: all sessions close; handoff has canonical muse metadata but no capability.
- `:2139-2145`, `:2451-2454`: user resubmits only the original task text.
- `:450-452`: a fresh `NO_PIN` project-scoped task must return QUESTION/Project Gate.
- Alias selection requires an affirmative project clause at `:248-260`; merely saying “luca app 设置……” is not authorization.

Counterexample: the receiving fresh session is `NO_PIN`; the user follows the displayed instruction exactly. The task creates a NO_PIN obligation, then project-scoped routing asks Project Gate again. Handoff metadata cannot grant a session pin.

Required revision:

- Display one copyable combined native event: `进入 luca app 项目，<verbatim original task>`, preserving only the task-side raw bytes as `exact_task_text`; or first prove a user-authorized muse-bound receiving session and only then request the verbatim task.
- Add a fresh-NO_PIN L3 assertion proving the handoff does not create a second Project Gate.

### M3 — The five-condition and Plan-result contracts are not mechanically equivalent to the authoritative Plan Agent

Evidence:

- `:404-416` accepts caller-provided five booleans; “contradictory” has no executable implication table.
- The selected contract already exposes files, dependencies and child agents at `:582-595`, but these are not forced into the five-condition vector.
- Current conditions are authoritative at `.claude/agents/plan-agent.md:30-40`.
- Planned result schema `:490-547` permits `PLAN_READY` independently of `premise.verdict` and `smaller_alternative.verdict`.
- It also omits mechanically required Plan fields from `.claude/agents/plan-agent.md:141-172`, `:242-252`, `:339-350`, `:466-473`, including phase orchestration, agent ownership/order, source/U-block trace and self-checks.

Counterexamples:

- A non-`/auto` FLOW mandates two child agents, four files, dependency edges and git, while the receipt claims all conditions false and selects MULTI.
- A schema-valid `PLAN_READY` has `premise.verdict=false`, `smaller_alternative.verdict=true`, sparse phases and no per-phase source; finalizer still presents it for approval.

Required revision:

- Define and implement a derived lower-bound condition vector from prompt plus registry metadata; receipt booleans must equal it.
- Mandatory file count, distinct child-agent count, dependency edges, irreversible classes and explicit plan request must force conditions 1–5 respectively, with the exact `/auto` exception.
- Encode premise/disposition cross-field invariants.
- Represent every mandatory Plan block as validated JSON fields, or explicitly revise the authoritative Plan Agent contract and re-review that semantic change.
- Add both counterexamples as biting mutants.

### M4 — SINGLE/MULTI “observed execution” accepts aggregate, pre-existing evidence

Evidence:

- `:567-580`: completion needs every named step plus only one post-begin tool receipt and output path hashes.
- `:584-593`: `output_evidence` has no strict discriminated schema or per-step causality/baseline rule.
- Mutants `:2324-2329` reject zero evidence, but not unrelated evidence, skipped steps or unchanged pre-existing outputs.

Counterexample: begin a three-step FLOW, run one allowed unrelated read, submit hashes of unchanged files already present under allowed templates, and claim all step IDs complete. The written contract permits `SATISFIED` without executing the selected steps.

Required revision:

- Give each step strict terminal evidence and bind every receipt/output to that step.
- Snapshot existence/hash/dev/ino at begin.
- Require created/modified outputs to differ from baseline; allow unchanged reuse only under an explicit `REUSE_VALIDATE` mode with its own receipt.
- Dependencies advance only after predecessor terminal proof.
- Add mutants for unrelated-read + pre-existing hashes, skipped middle step, receipt reuse across steps and wrong-step output.

## MINOR

1. **Frozen census cardinality is ambiguous.** `PAYLOAD-CENSUS.md:14-23` names three reproducible inputs plus two durable receipts, but plan `:2072-2075` freezes unspecified “four census files.” List all five literal paths, including `payload-census/workspace/.codex/hooks.json`.

2. **Structural negation has no executable scope grammar.** `:283-296` says negated clauses do not count but defines no semantic-axis negators. `调整设置里的颜色但结构不变` contains all three positive spans and can false-positive. Define structural-leg negation such as `不改/不动结构`, `结构不变`, `而非结构`, with positive and deletion-mutant fixtures.

## Areas passing this review

- Project-owned alias SSOT, collision/cap handling, no-follow reads and product-neutrality: `:218-244`.
- Alias selection grammar and ambiguity controls: `:246-277`.
- Three-leg signal remains zero-complexity and does not invent a sixth Plan condition: `:283-296`.
- Raw task preservation and combined-prompt slicing: `:622-635`.
- D(NEW) recensus, committed/target-current predecessor separation and PROJECT_REBOUND provenance: `:735-804`, `:1421-1438`.
