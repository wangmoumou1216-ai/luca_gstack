# Whole-framework audit: approved execution

Baseline: `931b059b8807338488740adcc7915d31b5604135` (includes merged PR #33).
Work root: `/Users/luca/.codex/worktrees/ce6c/luca_gstack`.
Branch: `codex/whole-framework-audit-20261012`. Scope: framework, NO_PIN.

Human authorization: the current conversation's user requested full-framework review,
expert panel, adversarial red team and bidirectional steelmanning, then explicitly
authorized executing the agreed plan, tests/review, publication/push and local sync.
This record preserves that authorization; it does not create a runtime approval token.
The already reviewed plan is restated below without expanding its scope.

## Frozen phases and assertions

| Phase | Owner / exact source scope | Required behavior / verification |
|---|---|---|
| U1 | main: `.claude/settings.json`, `.claude/hooks/project-scope-guard.mjs`, `scripts/test-project-scope-guard.mjs`; new focused `scripts/test-project-scope-fail-closed.mjs` and CI integration if necessary | F1: malformed input, unexpected exceptions, launch failures and timeout block the current tool invocation; safe parsed framework calls and verified project calls retain their behavior; no permanent session lock or automatic hook disable. Actual Claude and Codex boundary evidence remains required. |
| U2 | main: `scripts/check-quality-gates.mjs`, handoff checker tests and `.claude/skills/office/references/handoff-protocol.md` only if grammar clarification needed | F2: official quoted fullwidth-parenthesis criterion passes strict checker; legacy spaced form still passes; FAIL/UNKNOWN, duplicate verdicts and evidence decoys cannot pass. |
| U3 | worker: `.claude/workflows/framework-evolution-scout.js`, `scripts/evolution-bookkeep.mjs`, focused helper/tests and evolution runbook contract | F5/F6: frozen ledger-byte hash + original line identity covers exact entry instances, including duplicate fused IDs; both producer and consumer reconcile denominator; empty/unreadable/stale input rejected appropriately. Bookkeeping uses shared lock and PREPARED→COMMITTED durable journal, exact before/after replay, same-input retry idempotence, conflict refusal, no lost concurrent runs; fault and concurrency tests. |
| U4 | main: grilling source input contract/generated view; four engineering facade and tech-spec preambles; harness capability helper and session restore plus focused tests/generated affected projections | F3/F4/F7: all ready independent questions in one round; source and generated views agree; verified exact input scope replaces shared/latest aliases; actual host capabilities separated from hook protocol and Codex startup names its real runner. |
| U5 | main + independent judges: framework inventory, all 49 skill bodies and applicable owners, runtime/adapters, workflows, memory/growth, delivery/prototype, CI/reference assets | Whole-framework coverage table, focused failure/mutation/recovery evidence, full repository gate, real dual-harness entry/denial/handoff/degradation. Explicit evidence-level limits; self-report is not measured net ROI. Required UNKNOWN prevents whole-framework PASS. |
| U6 | independent judges then main: frozen diff and artifacts; authorized Git effects | Standards/Spec and red-team review on the same candidate, steelman both preservation and simplification, record original verdict envelopes. After required PASS: commit, push/create PR, attach PR, pass CI, merge, fetch/fast-forward clean local main while preserving existing unrelated observation log. Verify final remote/local identities. |

Order: U1 → U2 → U3 → U4 → U5 → U6. Serial subagents by default;
independent judgments use cold `quality-gate` under model-routing.yaml, no hardcoded model.
Each implementation has self-checks; phase completion requires an independent gate and original eval record.
All outputs/evidence remain under this audit directory or exact OS temporary test roots.
`framework/`, downstream projects, shared display aliases and unrelated user files are protected.
No global user configuration changes, speculative routing engine, new recurring automation or direct promoted-memory write.

## Current checkpoint

- U1 IN_PROGRESS; no source mutations at freeze time. All remaining phases PENDING.
- PR #33 merged at baseline; its native Claude proof is dependency evidence, not proof of all framework capabilities.
- Main checkout had `.claude/observability/observations.jsonl` modified before execution; preserve it.
- Prior tests and audit findings are historical evidence; final candidate must be verified again as applicable.
- Resume: read this plan, inspect actual Git status/tip, read the current phase's evidence, then continue its first incomplete requirement.
