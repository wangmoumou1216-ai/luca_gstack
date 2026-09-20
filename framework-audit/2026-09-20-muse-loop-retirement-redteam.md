# Muse Loop retirement — independent redteam handshake

Date: 2026-09-20. Scope: NO_PIN framework only. Target: `framework-audit/2026-09-20-muse-loop-retirement-plan.md`, including Replan R-1. Reviewer: independent default-REFUTE agent; did not produce or change implementation. Review contract: `redteam` + office shared rules + routing-chain-check R4.

## Verdict

**R0 REFUTED → R1 technical-plan PASS. Execution authority: NEEDS_CONTEXT.**

R1 resolves the deletion-scope defect and converts hook trust into a pre-effect human gate. No surviving technical-plan blocker identified. This is not permission to update global hook trust, not an implementation PASS, and not a claim that either harness has passed live retirement validation. Production implementation must wait for the exact six-hook trust authorization specified in R1.

## Findings and disposition

### RT-01 — BLOCKING in R0; human authority still pending

**Can deleting a supposedly Loop-only command prefix silently disable the six main framework hooks before their new hashes have been authorized?** If true, SessionStart, routing, project-scope protection, post-edit, Stop and SessionEnd can stop executing, directly violating the user's requirement not to affect the main system.

Evidence: `.codex/hooks.json:10,22,35,46,56,66` embeds `ROUTE_GUARD_HEAVY_SKILLS=muse-loop-orchestrate` in each command. `scripts/verify-codex-wiring.mjs:81` explicitly identifies changed trust hashes and silent skipping when a new entry is not trusted. `scripts/codex-trust-hooks.mjs:4-19` describes the security boundary; lines 61-73 show dry-run and trust-state handling. Parent supplied an actual current dry-run result: six repository hooks trusted; five third-party hooks separately trusted. The reviewer inspected implementation but did not rerun that runtime probe. Independent global/repository hooks files do not remove command-hash sensitivity.

R1 disposition: **technical issue closed**, because plan lines 62/65 forbid changing commands or starting implementation before explicit authorization, limit renewal to the six exact repository entries, and require preservation/restoration on trust failure. **Human decision required:** authorize the exact scoped trust renewal; generic retirement authorization does not suffice. At execution, confirm exact keys/commands, not just the helper's broad `codex-hook-adapter.mjs` substring classifier. No auto-approval of additional entries.

### RT-02 — BLOCKING in R0; closed by preserving independent capability

**Does treating every `muse-proto-judge` reference as Loop residue erase an explicitly offered cross-skill acceptance-checking capability?** If true, removal exceeds “Loop's own steps” and silently reduces the independent evaluation toolbox.

Evidence: `.claude/agents/muse-proto-judge.md:4,18` declares cross-skill use; line 30 says this per-AC judge is not interchangeable with ux-audit; line 45 accepts task-plan/tech-spec criteria. `.claude/skill-os/eval-methodology.md:32,53-55` actively uses the judge as an evaluation-format reference. Read-only search found no affirmative non-Loop dispatch instruction in task-plan/tech-spec themselves; that absence is **not proof of exclusivity or permission to remove the declared independent contract**.

R1 disposition: **closed** by plan line 61 retaining both agent definitions and model/self-model registrations, while removing only Loop orchestration bindings. No human adjudication is needed for the conservative preservation already inside user scope; deleting this capability instead would require it. Keep eval-methodology's valid independent reference. Neither renaming nor building a replacement agent is needed by the approved scope.

### RT-03 — MAJOR migration risk; covered by U-002/C1, mechanically verifiable

**Will triage remain faithful when its upstream prose/schema owners disappear, or merely become free of dead links?** If false, independent structured input, source discipline or human decisions can change even though a grep test passes.

Evidence to carry through migration: `constitution.md` §4 says traceability is necessary, not sufficient, for authenticity; §5 prohibits inventing RICE values or a single sortable numeric proxy. `muse-loop/references/req-extraction-principles.md` defines no extension, no inferred intent, no evaluative framing, and source-location/reason output. `muse-loop/schema.md:9-18` distinguishes open questions from executable EARS requirements; lines 25-30 distinguish historical PRD, same-meeting statements and shipped behavior; lines 34-41 distinguish requirement source from design reference and prohibit machine-declared greenfield. `muse-req-triage/SKILL.md` Phase 3 requires human confirmation of defer/reject as well as accept, and the ledger forbids poisoning rejection history with already-implemented duplicates.

Disposition: U-002 already requires migrating used constitution/schema/extraction rules, independent forward scenarios, human/source/firewall preservation and pin-safe ledger behavior. This is an **oracle implementation check**, not a new product decision. The migration test must show preserved semantics, not only deleted-path absence; avoid imposing Loop-only persistence or GATE-1 questions on standalone triage.

### RT-04 — MAJOR bypass risk; covered by U-003/U-004, mechanically verifiable

**Can explicit names or a stale QA mode continue working after registry deletion?** If true, “clean retirement” is false even with a clean catalog.

Evidence: `.claude/hooks/route-guard.mjs:762-775` dispatches `$`/slash direct names without consulting the keyword registry. `html-prototype/scripts/verify-prototype.mjs:41-42` silently infers another mode for unrecognized explicit modes; deleting only `muse-proto-gen` from allowedModes does not refuse old invocations. Lines 78/162-165 contain mode-specific QA exemptions. The route file contains a NUL byte, so ordinary `rg` can report only a binary match; audit it as text (`rg -a`) or parse the source.

Disposition: planned explicit refusal, fresh-session honesty, both syntaxes/case variants, normal-mode checks and planted violations cover the risk. Confirm retirement refuses only retired orchestration/generation names, **not the preserved judge**, and does not auto-launch a replacement. These are oracle checks at U-004; no additional human scope decision.

### RT-05 — MAJOR shared-contract/history risk; covered by C1/C3/C4

**Will cleanup delete generic safeguards or lose the evidence supporting a still-live judge just because the text says Loop?** If true, the apparent cleanup either weakens shared behavior or leaves unsupported confidence claims.

Evidence: `tech-spec/SKILL.md:180-185` defines a generic headless seam-confirmation exception with Loop only as an example. `routing-chain-check.md` R4's two-round review cap is shared despite the phrase “Loop 宪法”. Generic `ROUTE_GUARD_HEAVY_SKILLS` remains used by route tests. `.claude/agents/muse-proto-judge.md:78` cites `muse-loop/phase1-calibration-samples.md` and `ARCHITECTURE.md` for explicitly weak historical calibration evidence.

Disposition: the plan preserves generic HEAVY, Plan/Human gates and independent tools; retain the generic seam/cap semantics while removing only obsolete examples. Archive calibration evidence under framework-audit or reference an exact immutable Git version before removing its live path; keep its weak-evidence caveat. Do not delete actual project corpus/REQ data, traverse shared docs aliases, or edit historical reports merely to force zero text matches. These are oracle scope/readback checks, not a reason to expand retirement.

## Evidence boundaries and execution handoff

- Read only framework-owned target/contracts/implementation plus active observability rules and recent observations. No shared `docs/`, workflow-state, current-topic or downstream project content was read. Only this report was written.
- Parent reports a non-dereferencing tracked-content snapshot at `/private/tmp/muse-loop-retirement.GUKnA2/baseline.tar`; it is rollback evidence, not permission to overwrite concurrent edits.
- The revised plan records baseline `npm run verify`: exit 1, PASS=96/FAIL=2/WARN=0; S14g page-library closure and B2 office size-budget failed before production edits. The reviewer did not run that suite and does not reclassify these failures as retirement regressions.
- This review ran read/search evidence checks, not mutated retirement tests or live Claude/Codex sessions. U-004 fresh behavior/mutation evidence and U-005 independent final-diff closure remain mandatory. Any post-review scope change returns for review.

Completion of this bounded review: **DONE_WITH_CONCERNS**. Technical handshake: **PASS for R1**. Production/trust execution: **wait for the human gate**.
