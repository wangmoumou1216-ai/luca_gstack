# G5 56-session pre-approval readiness

Date: 2026-09-22 Asia/Shanghai
Scope: NO_PIN framework/meta; read-only audit of the frozen baseline, candidate, plan, runner, local CLI metadata, and public pricing documentation.
Status: BLOCKED / STOP before any live model session.

## Frozen identities

- Plan: `/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-09-21-context-lightening-execution-plan.md`
  - SHA-256: `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`
- Published base HEAD: `05aa78adc431231455dabbfae94cccf362eb4339`
- Published base tree: `d8e4c6b46b56e2a2738f4aa22f8b97169cbec9c0`
- Baseline root: `/private/tmp/context-lightening-p1.kHzsIW/baseline`
  - context SHA-256: `a3978160c8727cc65ac940bd484529e600a5169e3d0662fdc5871186dc367fec`
  - context files: 214
- Candidate root: `/private/tmp/context-lightening-p1.kHzsIW/candidate`
  - context SHA-256: `633c5b32d9eb3f4b9f345cd768f1c51dc981cc7e052d70747c6796e16a6a5f2f`
  - context files: 258
- Runner: `scripts/run-agent-context-ab.mjs`
  - SHA-256: `918005e5454074fa7046c20b3ef7564c3bfb03ebdaef0eb48d890cb853911c7b`
  - protocol: 27
  - scoring revision: `v32-load-before-boundaries`
  - scoring SHA-256: `09563570a1d17287b9bec21700e5766baaf1f49f232fe480305569ef8a3454bc`
- G4.5/U5: registered as `SKIP_U5`; no U5 implementation.
- P1-P5 implementation and independent acceptance remain complete. No candidate file was changed by this audit.

## Approved experiment shape from the plan

- Categories: T1 semantic discovery, T2 fallback, T3 pure read/planning, T4 first-read scope, T5 mode/handoff, T6 positive reflection, T7 multi-turn recovery.
- Matrix: 7 categories x 2 harnesses x 2 arms x 2 trials = 56 sessions.
- Calibration: the first T2 and T3 sample for each harness and arm = 8 sessions, included in 56.
- If the protocol changes after calibration, the 8 rows remain calibration-only and a new budget approval is required.
- Required decision priority: safety FAIL, then REGRESSION, then INCONCLUSIVE, then NO_BENEFIT, otherwise PASS.
- Only PASS clears G5. No automatic sample expansion or threshold change.

## Blocking gaps

### B1 — No frozen T1-T7 to live-fixture mapping

The plan names seven experiment categories but does not bind each category to one exact live fixture and schema. The runner's `all` selector invokes fourteen legacy fixtures, so the requested 2 x 2 x 2 matrix would create 112 sessions, not 56. Existing fixtures overlap the intended categories but are not an authoritative one-to-one mapping.

### B2 — T4-T7 action/effect coverage and T7 native multi-turn are not live

The plan requires isolated action/effect evidence for T4, T5, T6, and T7 rather than model claims alone. The current live prompt explicitly limits every fixture to a pre-execution decision check and the live harness is read-only, so it cannot supply those required effects. For T7 specifically, the plan also requires Codex app-server `thread/start` + `turn/start` and Claude `session-id` + `resume`. The live runner currently performs one prompt per process, launches Claude with `--no-session-persistence`, and launches Codex with `--ephemeral`. Resume evidence exists only as synthetic self-test traces. Running 56 current calls would therefore omit required action/effect evidence and native multi-turn recovery, so it cannot satisfy G5.

### B3 — Exact model and effort identity are not enforced

- Local CLI versions: Claude Code `2.1.278`; Codex CLI `0.155.1`.
- Claude Code currently reports `loggedIn=false`, `authMethod=none`; no usable Claude live endpoint is established.
- Claude user config says `model=opus`, but the runner's restricted mode ignores user/project/local settings. The runner can pass an explicit Claude model and effort, but verifies only a full `claude-*` model identifier and does not verify effort.
- Codex login status is `Logged in using ChatGPT`. User config says `model=gpt-5.6-sol`, `model_reasoning_effort=max`, but the runner uses `--ignore-user-config` on this machine and passes no Codex model or effort. Its identity check accepts every Codex model and often records no actual model.
- The plan requires STOP/UNKNOWN when identity is unknown; defaults or aliases cannot be treated as frozen identity.

### B4 — Required byte/token/time metrics are not normalized

- The runner retains raw usage events but does not normalize the plan's two byte measures: pre-delivery repository bytes for the equal-weight T1/T2/T3 benefit test, and full-task delivered bytes for every T1-T7 category.
- It also does not normalize actual tokens and elapsed time into the per-category paired medians required for a complete performance PASS.
- Per-child timeout is 300 seconds; concurrency and trials only require positive integers. There is no batch-wide 56-session cap, token cap, or money cap. This absence must be disclosed, but the approved plan allows an UNKNOWN cost estimate followed by the user's separate approval of the fixed 56-session limit; a new money/token ceiling is not silently added as a prerequisite.
- With concurrency 1, the current child-process timeout exposure is 40 minutes for the 8-session calibration and 4 hours 40 minutes for 56 sessions, excluding setup and teardown. Total wall time is not hard capped.
- Claude CLI supports `--max-budget-usd`, and Codex supports explicit model/config overrides and rollout token budgeting, but the runner currently passes neither. These can be offered as user-approved safeguards, not misrepresented as existing plan requirements.

## Cost evidence available now

- Codex currently authenticates through ChatGPT, so it consumes plan allowance/credits rather than having a provable per-call USD invoice. The exact plan tier, remaining included allowance, and post-limit credit behavior are not frozen. Official documentation also states that task complexity, context, reasoning, tools, retrieval, and caching change usage. Exact 56-session monetary cost is therefore UNKNOWN.
- The configured Codex model would be GPT-5.6 Sol only after a runner pin is added. Official published reference rates are 100/10/500 ChatGPT credits per 1M input/cached-input/output tokens, and USD API standard rates are $4.00/$0.40/$20.00 per 1M input/cached-input/output tokens. These rates are not a total-cost bound without token ceilings.
- Claude is not authenticated, so no Claude session can run. If a future approved configuration uses Claude Opus 5 through the API, the public standard rates are $5 input and $25 output per 1M tokens. This is not a total-cost bound without a token or USD ceiling.
- Official sources read on 2026-09-22:
  - https://learn.chatgpt.com/docs/pricing
  - https://developers.openai.com/api/docs/pricing
  - https://platform.claude.com/docs/en/about-claude/pricing

## Minimal safe delta before another experiment approval request

1. Bind exactly seven named live fixtures, schemas, trial IDs, calibration rows, and remaining 48 rows; reject any matrix not exactly 56.
2. Implement the plan's isolated action/effect validation for T4-T7 and real T7 native multi-turn paths for both harnesses; synthetic traces remain self-test evidence only.
3. Freeze Claude's existing explicit full-model/effort inputs and add missing observed-effort verification; add explicit Codex full-model/effort inputs and observed identity verification. Both harnesses must fail closed when required identity evidence differs or is absent.
4. Normalize pre-delivery repository bytes, full-task delivered bytes, actual tokens, and elapsed time; bind unique output paths and fail-closed accounting. Separately offer exact timeout/token/money safeguards for user selection, while retaining the plan's allowed UNKNOWN-cost approval path.
5. Freeze and independently review a new release manifest containing both context hashes, scorer/protocol hashes, seven fixture/schema hashes, model identities, the exact 56-row matrix, disclosed timeout/cost behavior, and any safeguards the user selects.
6. Re-run the deterministic scorer/mutation gates affected by the protocol delta, then present the exact 8-session calibration command matrix, known cost basis, any UNKNOWN amount, and optional safeguards for separate user approval.

No live session, install, login, downstream read, alias access, framework edit, Git publication, or release occurred during this audit.
