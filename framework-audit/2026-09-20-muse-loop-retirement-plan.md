# Muse Loop retirement — execution and handshake contract

Status: DONE_WITH_CONCERNS (retirement verified; pre-existing S14g remains). Scope: NO_PIN, this checkout only. Baseline HEAD: 77a99dd.

## Authority and destination

Source: user: “这个loop我一次都没用过，对我来说没有用处…不要对我主体在使用的内容影响，要把loop的自己的环节干掉的干净。” Previous instruction: “做方案的专家审查。给我一个握手的方案。然后执行”。
Retire the unused Muse Loop capability, not generic iteration, scheduling, independent skills or safety gates. No commit, push, project switch, downstream data deletion, global configuration mutation or network action is authorized. Framework templates and shared project aliases are out of scope.

Premise: disabling only keyword discovery leaves explicit dispatch and installed aliases reachable, so removal must include both. A config-only disable does not meet the requested clean retirement. This plan biases toward deletion; independent default-REFUTE review must challenge over-deletion, particularly shared safeguards and the prototype judge. No use-count inference is needed: retirement is the user's explicit choice.

KILL-1: A proposed deletion has a live independent consumer. Stop that deletion and preserve or migrate its shared contract; any loss of independent capability needs user adjudication.
KILL-2: Existing dirty work cannot be preserved surgically. Stop affected edits; never reset/stash/overwrite other work.

Mode: Sequential execution with independent review/verification; core-execution, reviewers reasoning-heavy per model-routing Codex effort mapping. No product design scenario. No external research: this is a bounded repository retirement. Phases depend on the preceding gate. All U-blocks Source = user quotes above; status initially PLANNED. Plan changes are appended and reviewed, never silently broadened.

## Units and ownership

### U-001 — freeze scope and expert handshake
Read List: plan-agent, routing-chain-check R4, project-session, framework-maintenance, target skill contracts and incoming references.
Files: this plan and framework-audit/2026-09-20-muse-loop-retirement-redteam.md.
Goal: freeze delete/migrate/preserve manifest and baseline dirty-file snapshot; establish whether judge has independent consumers and whether hook edits require new trust authority.
Gate: independent reviewer has no surviving blocking findings on revised proposal. No production deletion before this gate.

### U-002 — preserve independent triage (depends U-001)
Files: .claude/skills/office/muse-req-triage/SKILL.md and only needed local references; .claude/skill-os/input-modes.yaml triage entry.
Goal: remove Loop entry B and L1 persistence/state orchestration; keep raw/structured inputs, fidelity, source evidence, EARS stdin validation, human accept/defer/reject, rejected-requirement ledger and brainstorm confidence firewall. Migrate used constitution/schema/extraction rules before removing owners. Do not turn triage into a new workflow or change permission/frontmatter identity.
Test scenarios: raw corpus, structured candidates, missing reference, human reject/defer, malformed EARS, no project pin for ledger writes. Use independent forward test in isolation, no downstream writes.
Gate: no dependency on deleted paths, no Loop output, preserved decisions and source discipline.

### U-003 — retire dedicated surfaces (depends U-002)
Delete candidates: .claude/skills/office/muse-loop-orchestrate/, .claude/skills/office/muse-proto-gen/, .claude/commands/muse-loop-orchestrate.md, their .agents/skills aliases; .claude/agents/muse-proto-judge.md and .codex/agents/muse-proto-judge.toml only after U-001 adjudication. Remove muse-loop/ runtime contracts, root constitution.md/traceability.md, specs/README.md/corpus/README.md after consumer migration. Preserve historical evidence under framework-audit or Git; do not traverse real project outputs or remove actual corpus files.
Modify: .claude/hooks/route-guard.mjs explicit retirement refusal; .claude/settings.json and .codex/hooks.json Loop-only HEAVY injection; skill-routing-map.yaml, input-modes.yaml, skill-visibility.json, model-routing.yaml, codex-viability.yaml, evolution/self-model.yaml; agents/plan-agent.md and preflight-agent.md; routing-chain-check.md, skill-authoring.md, eval-methodology.md, U-REGISTER.md; office-wizard.md, html-prototype-tokens.md, auto/code-recon/tech-spec skill references; launchd plist obsolete architecture pointer.
Modify QA: html-prototype/scripts/verify-prototype.mjs remove only retired mode/exemptions. Delete scripts/check-muse-loop-sync.mjs; replace package/verify wiring with retirement tests. Retain generic HEAVY mechanism, fail-open behavior, Plan/Human gates, normal QA modes and all independent design tools.
Gate: no callable or dispatchable retired capability; explicit old names refuse with retired status without auto-launching replacements. Runtime-loaded stale session declarations cannot be revoked; record fresh-session requirement honestly. Hook trust changes may require human approval, never edit global config automatically.

### U-004 — update projections and regression (depends U-003)
Files: scripts/test-muse-loop-retirement.mjs (new); scripts/test-route-guard.mjs, test-hooks.mjs, test-design-tool-retirement.mjs, check-routing-map.mjs, check-skill-scene-coverage.py, check-codex-viability.mjs as needed; generated catalog and self-model via owners; CHANGELOG.md scoped entry.
Tests: both slash/dollar direct names (case variants), natural-language old triggers, no wrong project binding; retained skill dispatch and generic HEAVY behavior; QA old-mode refusal and normal modes; no dangling aliases/registrations, triage self-contained. Mutation: restore old dispatch/mode/registry dependency and observe exact expected failure in temporary fixtures only.
Verification commands: node scripts/test-muse-loop-retirement.mjs --mutation; npm run test:routes; npm run check:routing-map; npm run check:registration; npm run check:hooks; npm run check:harness; npm run check:agents-parity; npm run check:agent-context; npm run check:self-model; npm run test:design-tool-retirement; npm run verify.
Gate: fresh results, distinguish pre-existing failures from regression using baseline, no silent omission. Do not run checks that mutate outside scope; document instead.

### U-005 — independent closure (depends U-004)
Files: same audit record with exact verification results and preserved dirty-work evidence.
Gate: reviewer independently attacks final task-only diff and runtime behavior; no blocking findings. Any post-review edit returns for closure. Default two review/revision rounds; surviving blockers go to user, not infinite retries.

## Assertions (all blocking unless explicitly identified as pre-existing)

A1 retired names cannot dispatch in either syntax/harness adapter. A2 normal routes/gates unchanged. A3 standalone triage retains human/source/firewall invariants. A4 no active reference to deleted contract or dangling alias. A5 no unrelated dirty edits lost, project data/global config untouched. A6 deterministic tests detect planted violations, not just baseline green. A7 catalog/projections current and both harnesses separately checked; unavailable live validation is explicitly unverified.

Criteria: C1 every deletion is exclusive or has migrated consumers; C2 no renamed replacement Loop; C3 no shared safeguard weakened to make checks green; C4 historical evidence cannot be mistaken for active instructions; C5 completion claims limited to observed evidence.

## Checkpoint

Read-only investigation completed. Production files not modified by this task. Existing dirty files include page library/template-flow work, design-brief/open-design, package.json, verify.sh, CHANGELOG.md; preserve their starting content. Next: expert review and exact-scope handshake.

## Replan R-1 — 2026-09-20, expert default-REFUTE early findings

This delta supersedes the conflicting delete candidates above; U-IDs remain stable.

1. **Preserve the independent prototype judge.** Its existing contract explicitly supports cross-skill AC verification and is not equivalent to ux-audit. Lack of observed callers does not prove it is Loop-exclusive. Keep `.claude/agents/muse-proto-judge.md`, `.codex/agents/muse-proto-judge.toml`, and their model/self-model registrations. Remove only Loop-specific convergence rounds, state flipping, orchestrator dispatch/scorecard references and constitution dependency; retain independent cold-start, evidence, no-auto-fix and bias controls. No rename or replacement agent.
2. **Hook trust is a pre-effect human gate, not a completion warning.** Actual `node scripts/codex-trust-hooks.mjs --dry-run` returned six repository hooks, all `trusted`, all containing the Loop env; five third-party hooks are separate and trusted. Removing the inline env changes command hashes. Do not mutate `.codex/hooks.json` until the user explicitly authorizes renewing only those six exact repository hook hashes. Never bulk-trust other entries or change other global configuration. Any trust failure means stop and preserve/restore the original task-owned hook commands; no partially disabled main framework hooks.
3. Whole tracked working content (including existing dirty content, symlinks not dereferenced) is saved at `/private/tmp/muse-loop-retirement.GUKnA2/baseline.tar`. It is rollback evidence, not permission to overwrite concurrent edits. Baseline `npm run verify` is in progress; no production modifications have started.

Handshake requested: expert closure on this revised scope, then explicit user hook-trust authority before implementation. User's removal authorization otherwise stands; do not ask them to re-approve unchanged retirement intent.

### Baseline verification (before production edits)

`npm run verify` completed exit 1: PASS=96, FAIL=2, WARN=0. Existing failures: S14g (page-library browser preview / carrier-only closure) and B2 (office SKILL.md size budget). Both occurred before retirement production edits. Preserve as baseline findings; do not alter unrelated template/page work or reduce shared contracts to obtain green. No claim of overall clean baseline.

### Independent R-1 handshake and acceptance clarifications

Independent reviewer `retirement_expert` returned technical handshake PASS; execution remains NEEDS_CONTEXT for the exact-six hook trust authorization. No production implementation yet.

- U-002 migration preserves constitution section 4 (traceability necessary, not sufficient), section 5 (no fabricated scalar ranking), and applicable schema semantics for question type, shipped-behavior comparison and design references. Do not preserve a whole obsolete L1 state machine merely to retain these meanings.
- Preserve eval-methodology's live references to the retained independent judge; zero text matches is not the deletion criterion.
- Preserve tech-spec's generic headless seam-confirmation contract; only remove the obsolete Loop example.
- QA currently silently infers mode when an explicit mode is unknown. Removing the allowed mode alone is insufficient: explicitly reject the retired mode without changing unrelated unknown-mode compatibility.
- Preserve the judge's historical calibration evidence in framework-audit with non-runtime labeling or an exact Git object reference, and update its live pointer before removing the old directory.
- Exact hook renewal scope: this checkout `.codex/hooks.json` entries for sessionStart, userPromptSubmit, preToolUse, postToolUse, stop, sessionEnd only. Read back currentHash/trustStatus from Codex; touch neither five third-party entries nor any other global config keys. Do not use the broad existing trust script for writes unless it is shown to target exactly this set.

## Execution checkpoint — authorized start

User replied “执行” to the explicit exact-six hook-trust question. This grants the narrow exception to the earlier global-config exclusion: only those six `trusted_hash` fields, no other global setting. Technical handshake remains R1.

Exact-scope RPC helper `/private/tmp/muse-loop-retirement.GUKnA2/trust-exact-six.mjs` captured keys/events/commands before change, verified the sole command delta was removal of the Loop env, then used Codex-returned currentHash values for six targeted config/batchWrite edits. Fresh hooks/list readback: 6/6 trusted. Third-party entries unchanged, parsed global config deep-equal except those six hashes. Receipt: `/private/tmp/muse-loop-retirement.GUKnA2/trust-receipt.json`; secured pre-trust backup in same temporary directory. No broad trust script writes.

Active ownership: decouple_contracts (triage and Claude judge); retirement_runtime (route guard, QA and runtime tests); retirement_registry (registration and prose); main (config/trust, deletions after migration, package/verify wiring, projections and final integration). All preserve existing user work. No Git publication.

## Replan R-2 — no-successor retirement representation

The catalog generator previously required every tombstone to name an active replacement and an SC semantic-fact ID. That cannot faithfully represent this approved removal. Independent expert reviewed `scripts/build-agent-context.py` and returned PASS for this narrow schema delta: same five required keys, replacement accepts only null or a real active skill; decision_id accepts SC or RET date/sequence IDs. Null renders as `none`; empty strings, string `none`, unknown/retired replacements and malformed IDs remain invalid. Existing figma-layer output remains identical.

Local decision mapping (not memory promotion): RET-20260920-001 = retire muse-loop-orchestrate; RET-20260920-002 = retire muse-proto-gen. Authority is the user-approved R1 plan and execution message above. No semantic memory edits. Additional owned file: scripts/build-agent-context.py; generator positive/negative behavior joins scripts/test-muse-loop-retirement.mjs. No added capability, workflow or automatic replacement.

U-002 migration complete: triage and judge no longer depend on deleted runtime owners, immutable historical judge pointers resolve. U-003 dedicated files/aliases removed; original tracked versions remain in Git and the task snapshot. U-004 integration checks in progress. Another session is modifying self-growth/template-related files concurrently; do not attribute, restore or stage those changes as this task.

### R-2 mirrored validator and fresh evidence

`scripts/check-agent-context.mjs` owns the JS mirror of the same retirement schema; synchronize only its null/RET validation and null rendering. `scripts/test-agent-context.mjs` adds four invalid-value mutations (49 total). This is the same R-2 acceptance contract, not a new capability or relaxed safety gate.

Fresh checks so far: loop-retirement PASS (real route, Codex adapter, normal QA and refusal, three actual mutations, generator null/RET/SC and invalid-value cases); check:routing-map PASS; check:registration PASS; check:harness PASS (17 harness and 43 viability checks); check:agents-parity PASS; check:hooks exit 0 (Codex adapter 23 PASS, auto-open 8/8, read-grant quarantine skips remain explicit); check:agent-context PASS; test:agent-context 49/49 mutations PASS; check:self-model PASS; test:design-tool-retirement mutation PASS. Full verify started before mirrored-validator repair and must be rerun on final version.

Independent forward triage fixture: observed faithful requirement vs open-question separation, historical PRD not treated as shipped evidence, null design reference, no scalar ranking, human confirmation requested, no project/ledger write and no downstream launch. Actual EARS stdin executed. This is a simulated forward fixture, not production triage or a calibrated model success rate.

Single-repository question: actual Git metadata shows this checkout main tracking upstream/main; old `/Users/luca/Desktop/luca_gstack` is a separate clone and remains MEMORY_ROOT. No synchronization, migration or deletion of that clone is part of this task. Future consolidation needs its own target and migration approval.

### Hook-byte tripwire refresh (within U-003/U-004)

`npm run test:controlled-change` reproduced S41 as two exact failures at `installAdapterFixture`: the fixture pins the entire registered hooks.json SHA, still expecting pre-retirement bytes. Actual new SHA is `fa3fee9845f4a5e00b2dd5f682474fc8cc33ad48658b89839aaf9cd28a4eec8c`; old SHA was `be5732086a10d51939d382f22a6404827b85818502f30c3f49b965dd52d99dae`. Exact-six trust receipt and JSON comparison already prove only the user-approved env removal changed. Refresh only this constant in `scripts/test-controlled-change.mjs` plus provenance comment; keep byte pin, runtime fail-closed injections and wrapper semantics assertions. No production controlled-change code changes. Rerun whole focused suite and submit this delta to independent runtime reviewer.

## Final closure

U-001 through U-005 complete for the approved retirement scope. Final `npm run verify` exited 1: **PASS=97, FAIL=1, WARN=0**. Sole failure S14g (page-library browser preview / carrier-only closure) was already present before retirement. Baseline B2 now passes amid concurrent template work; this task does not claim that fix. The transient C9/C10 mirrored-schema and S41 old-hook-byte failures are fixed and passed in this final full run. Full log: `/private/tmp/muse-loop-retirement.GUKnA2/final-verify.log`.

Independent final reports:
- `framework-audit/2026-09-20-muse-loop-runtime-review.md`: PASS, zero attributable findings; routes 243/243, agent-context mutation 49/49, retirement actual mutations, hooks/adapter and controlled-change 11/11 independently executed. Reviewer fingerprints (9 files) rechecked unchanged by parent.
- `framework-audit/2026-09-20-muse-loop-contract-review.md`: PASS, zero findings; independent triage/judge and shared gates preserved, historical Git blobs match baseline, EARS 9-case checks executed.

Preservation evidence: byte comparisons against pre-change snapshot pass for AGENTS.md, CLAUDE.md, optional-workflow-graph.yaml, brainstorm/SKILL.md and html-prototype/SKILL.md. Other concurrently edited template/self-growth files were not restored, overwritten, staged or claimed as this task. Six repository Codex hooks remain trusted on a fresh native dry-run; five third-party hooks unchanged. No commit/push/project switch/old-clone or memory migration occurred.

Criteria C1–C5 PASS within reviewed scope: consumers migrated; no replacement Loop; shared safeguards retained and negative-tested; historical evidence explicitly non-runtime; claims separated from browser/live-loader unknowns. A7 covers actual hook/adapter fixtures plus native trust readback, not fresh native UI sessions. Existing in-memory skill declarations may persist until a new session. Natural phrases naming muse can still hit the pre-existing Project Gate; this does not dispatch the removed skills and was intentionally not changed.

Removal recovery: deleted tracked modules, schema/scaffolding and calibration examples remain available at HEAD `77a99dde974508b9026d57055510c309ab6c99d6` and the task's non-dereferenced baseline archive. No real project corpus/REQ output was removed. Do not restore the whole archive over concurrent work; recover only exact task-owned files if requested.

Separate startup housekeeping: the single assigned pending-extraction item was marked UNRESOLVED with its active evidence retained; self-reflection recorded O-20260920-001 without a new active rule or semantic promotion. These are not Loop capability changes.

Remaining concern: S14g is not repaired or reclassified here. Future old-clone/MEMORY_ROOT consolidation is a separate task requiring a chosen destination, dependency inventory and verified data migration before deletion.

## Publication checkpoint — Loop-only authorization

The user subsequently authorized publishing only this task's changes: “你能不能只发布你的”. Publication scope is therefore limited to the Muse Loop retirement delta reconstructed from the pre-task snapshot at `/private/tmp/muse-loop-retirement.GUKnA2/baseline`; unrelated page-library, template-flow, self-growth, memory-governance and other dirty work must remain unstaged and unpublished. Shared files require hunk-level isolation rather than `git add -A`.

Fresh pre-publication evidence: `bash scripts/verify.sh` returned **PASS=98, FAIL=0, WARN=0**; `git diff --check` passed; native Codex hook dry-run reported all six repository hooks trusted and left five third-party hooks untouched; remote `upstream/main` still matched baseline HEAD `77a99dde974508b9026d57055510c309ab6c99d6`. The publication procedure must build and verify an isolated task-only commit, stop if its tree contains unrelated paths or if the remote advances, then use a normal non-force push.

While the isolated tree was being verified, another authorized session published `4122ac07969412588c6221c7809df8106e7dd99f` (`chore: retire frozen self-growth collectors`). Its 15 paths do not overlap this retirement's 59-path publication set. The Loop projection was therefore replayed without conflict on top of `4122ac0` and rechecked. In the isolated clone the full gate reached **PASS=97, FAIL=1, WARN=0**: every repository/content check, including S14g and S17, passed; the sole S34 failure is path-local because the temporary clone intentionally has no global Codex trust entries. The authoritative checkout's same six hook commands remain separately subject to native trust readback before publication.

The authoritative dirty checkout's final rerun also reached **PASS=97, FAIL=1, WARN=0**, but its sole failure was the unrelated in-progress S14f page-library work: the four entries currently set `carrier_eligible: false` while that task's uncommitted test still expects `true`. None of those page-library files or tests is in this 59-path commit, and S14f passes in the isolated candidate tree built from committed `4122ac0`. Conversely, S34 passes in the authoritative checkout after sandbox-external read-only verification confirmed all six repository hooks trusted. Together these two complementary runs close the candidate tree's content gate and the path-local trust gate without publishing the unrelated dirty work.
