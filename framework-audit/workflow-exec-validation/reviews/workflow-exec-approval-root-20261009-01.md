Message Type: FINAL_ANSWER
Task name: /root
Sender: /root/approval_expert
Payload:
Consultation verdict: **FAIL (1/4)** — diagnosis only, not implementation acceptance.

- **C1 FAIL — Gate applicability:** `plan-agent.md:423–427` globally blocks first dispatch without an unavailable receipt, conflicting with its mode-specific confirmation table at `:578–595`.
- **C2 FAIL — Authentic approval:** `check-plan-approval.mjs:39–50` checks caller-authored JSON. Executing its unchanged body against an in-memory filesystem accepted fabricated `confirmed_by=user` and a future date; wrong SHA/user label failed. No native user evidence was supplied.
- **C3 PASS — Reusable provenance:** `event-attestation.mjs:1196–1288` already authenticates current native human events. Codex rejects child/fork provenance (`:546–558`); Claude distinguishes human, peer and synthetic messages (`:854–913`). This authenticates messages, not plan consent.
- **C4 UNKNOWN — Existing authorization:** No original product-plan approval message or frozen payload supplied. Framework-repair authorization cannot establish approval of an undisplayed product plan.

**Recommended:** Keep real confirmation; let the controlling agent verify the exact approval against trusted native conversation evidence. Label JSON checks as binding checks, never authority. Restrict unavailable-primitive refusal to unattended dispatch requiring machine-verifiable approval. If that entry is required, add a thin adapter over existing attestation, not another permission registry.

**Minimum change surface:** `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `.claude/skills/office/implement/SKILL.md`, `scripts/check-plan-approval.mjs`, `scripts/test-plan-approval.mjs`, `scripts/check-agent-contracts.mjs`.

**Acceptance:** matching genuine approval proceeds; unchanged approved scope needs no repeated question; non-confirmation modes remain usable. Fabricated JSON, peer messages, pre-plan generic assent, changed payload/effects, revocation and unavailable evidence must not authorize execution. Test both harnesses separately.

Reject deleting Human Gates, accepting `confirmed_by=user` as proof, or treating any attested user event as consent. Shared-user filesystem access is not cryptographic isolation; no live cross-harness approval flow was verified.

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"workflow-exec-approval-root-20261009-01","subject":{"skill":"approval-root-cause-consultation","topic":"Plan approval boundary","scene":"unknown","input_summary":"Independent read-only consultation on plan approval applicability, provenance, reusable execution paths and minimal repair; not completed implementation acceptance.","output_paths":["/Users/luca/.codex/worktrees/4614/luca_gstack/.claude/agents/plan-agent.md","/Users/luca/.codex/worktrees/4614/luca_gstack/.claude/agents/orchestrator.md","/Users/luca/.codex/worktrees/4614/luca_gstack/scripts/check-plan-approval.mjs","/Users/luca/.codex/worktrees/4614/luca_gstack/.claude/hooks/lib/event-attestation.mjs"],"duration":"medium"},"verdict":{"status":"FAIL","passed":1,"total":4,"findings":["C1 FAIL: universal native-receipt blockade conflicts with mode-specific confirmation applicability.","C2 FAIL: checker accepts caller-authored user label and future timestamp without native user evidence; demonstrated in memory only.","C4 UNKNOWN: original product approval message and frozen plan payload were not supplied; live cross-harness approval execution remains unverified."]}}
