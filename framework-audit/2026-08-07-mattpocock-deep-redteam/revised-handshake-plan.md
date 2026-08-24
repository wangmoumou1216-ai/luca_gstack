# luca_gstack × mattpocock capabilities — revised handshake plan

> Revision state: `R1-REVISED / ROUND-2 TARGET / NOT A HANDSHAKE`  
> Authority boundary: review and planning only. No global skill activation, route mutation, framework
> behavior change, registry promotion, or destructive Git operation is authorized by this document.

## 1. Desired end state

Evolve only upstream deltas with local need evidence, while first making every existing
mattpocock-derived capability truthful, safe, and explicitly adapted for Claude and Codex. A skill
is not dual-harness ready because both can read its Markdown: each applicable harness must close
Trigger, Execute, Degrade, and Verify.

This plan has two future handshakes:

1. **Plan handshake** — Luca accepts the exact tracks below. This is the only handshake sought in
   the present review loop.
2. **Activation handshake** — after implementation in disposable candidates and full A/B evidence,
   Luca separately authorizes global activation and governance write-back.

## 2. Non-negotiable order

```text
G0 truth gate
  -> G1 safety containment
  -> G2 external-skill topology
  -> G3 orchestration parity
  -> G4 upstream-delta decisions
  -> G5 candidate verification + activation gate
```

No later track may use a capability whose earlier gate is red. In particular, no FUSION run may
call the current `resolving-merge-conflicts`, and no new upstream delta may be promoted while G0 or
G1 is open.

## 3. Tracks

### G0 — Capability truth and evidence gate

**Problem closed:** the 21-row adoption log and the original 47 behavior atoms are both incomplete
as full-system denominators; routes can point at missing Codex targets; static wiring can pass while
execution is absent; the current verifier is environment-sensitive and misclassifies sandbox
failures.

**Implementation scope after plan approval:**

- Add a canonical, machine-readable atomic manifest for all 57 frozen units in
  `inventory-refreeze-r2.md`. Each row owns upstream commit/path/hash, local target/transitive files,
  adoption type, route surfaces, explicit harness applicability, and Claude/Codex T/E/D/V evidence
  IDs.
- Add a validator that fails on route→catalog/target orphan, missing transitive reference, unlisted
  live target, unjustified `N/A`, missing applicable T/E/D/V cell, or hash/lineage drift.
- Make Codex verification hermetic in clean and ambient `CODEX_*` environments. Permission,
  sandbox, or subscription failures become `BLOCKED`, never false capability FAIL or PASS.
- Extend exact assertions beyond “at least N skills/agents”: required external route targets and
  required logical agent roles must be named and executable.
- Correct single-source drift for Codex effort values, repository hook registration, TDD footprint,
  fork-only labels, questionnaire gap state, and external-skill metadata rationale.

**Owned surfaces:** a new manifest and validator under the external-skills governance area and
`scripts/`; `scripts/verify-codex-wiring.mjs`; `scripts/test-hooks.mjs`; model/hook pointer text in
AGENTS, CLAUDE, model-routing, and the Codex adapter comments.

**Acceptance evidence:**

- mutation fixtures independently make every orphan/reference/evidence/effort assertion fail, then
  the corrected snapshot passes;
- both ambient modes pass the same static suite;
- a deliberately unavailable nested runtime reports `BLOCKED` with its real cause;
- fresh Claude and Codex live receipts are separate artifacts and cannot satisfy each other’s cell.

**Rollback:** revert only the G0 implementation commit; no registry, pin, or global directory
mutation occurs in this track.

### G1 — Safety containment before capability work

**Problem closed:** current paths can escape scope, execute untrusted text, leak secrets, or
destroy/absorb user work.

#### G1.1 Project identity and pin transaction

- Use one canonical project-name validator in CLI and hooks. Reject empty, `.`, `..`, slash,
  backslash, and any normalized path outside `PROJECTS_ROOT`; retain valid Chinese and kebab names.
- Never install a new session pin before a switch/new operation succeeds. Use a post-success
  mechanism shared by both harnesses; “prewrite and hope” is forbidden.
- A failed switch preserves the previous pin. Compound commands cannot use an unconfirmed project
  name to rewrite later project-scoped document tokens.
- Provide a real Codex-safe read path for mandatory project context while preserving write denial;
  advice to use a nonexistent `Read` tool is not an acceptable degradation.

**Evidence:** invalid-name table, failed-switch old-pin fixture, compound-command fixture, symlink
escape assertion, and Codex read-allowed/write-denied live probe.

#### G1.2 Untrusted requirement input

- Replace the `echo "<statement_ears>" | …` instruction with byte-preserving structured stdin or an
  argument-free file descriptor API. No user text may be interpolated into shell source.

**Evidence:** `$()`, backticks, quotes, newlines, redirects, Unicode, and NUL-policy fixtures; no
sentinel side effect and identical linter input bytes.

#### G1.3 Debug redaction and diagnostic integrity

- Adapt the existing shared `systematic-debugging` candidate, not a fresh upstream overwrite.
- Remove every source-side value leak from SKILL, references, examples, HITL script, and helper
  scripts. Presence checks expose only boolean/name; pasted errors are redacted before any echo,
  model context, transcript, handoff, or artifact.
- Repair `find-polluter.sh` so filenames are not shell-split, test failures are not swallowed, and
  “not found” cannot be emitted after an indeterminate run. Replace dangling skill references.
- Preserve useful signal: hypothesis ID, probe, exit status, timestamp, safe category, and a stable
  correlation token remain available after redaction.
- Add the matt diagnosing source to governed provenance/watch; the current obra-only watch is
  insufficient for a matt-derived port.

**Evidence:** AWS/GitHub/Bearer/cookie/API key/IDENTITY/PII canaries across raw stdout, stderr,
transcript, handoff, and saved artifacts; a negative test proves an unredacted canary blocks while a
diagnostic-quality assertion proves the useful signal survives.

#### G1.4 Git and handoff sovereignty

- Quarantine the current `resolving-merge-conflicts` route until G2’s safe candidate passes. No
  “always resolve”, “stage everything”, automatic commit, or loss of abort/pause authority.
- Change FUSION rollback to exact revert/atomic candidate rollback. `reset --hard` is not a default;
  it may appear only behind an explicit destructive human gate with a clean isolated worktree and
  exact-HEAD proof.
- Replace handoff `cat >` guidance with read-before-write, collision-safe writing and a mechanical
  secret scan. Missing required acceptance criteria is a failure, not a warning.

**Evidence:** a dirty-tree conflict fixture leaves unrelated tracked/untracked work byte-identical
and unstaged; commit/rebase continue waits for authority; rollback preserves later commits and dirty
work; handoff collision and secret fixtures fail closed.

**Owned surfaces for G1:** `scripts/project.sh`, project substrate/guard and tests;
`muse-req-triage`; the disposable systematic-debugging candidate; FUSION runbook; handoff protocol
and checker. The live shared skill remains untouched until G5 activation approval.

### G2 — External skill topology and scope-safe adapters

**Problem closed:** `codebase-design` and `resolving-merge-conflicts` are routed to Codex but absent
from its catalog; resolving’s promised safety reconciliation never reached the live target; `teach`
is tracked as zero-touch despite writing a workspace; TDD contains stale references. Shared
placement alone does not prove local need or behavioral parity.

#### G2.1 Route quarantine first

- Until safe candidates exist, route probes for the two dangling skills must return explicit
  `NEEDS_ADAPTATION`/STOP in Codex, not a fake executable recommendation.
- Claude may retain discovery only if unsafe resolving execution is blocked. A dangerous existing
  target is not grandfathered in.

#### G2.2 `codebase-design` candidate

- Stage the complete three-file directory in a disposable candidate location; do not partially copy
  two files or overwrite the personal install.
- Replace harness-specific `Agent tool` prose with one logical `parallel-design` contract. Three or
  more branches trigger the Plan gate, run read-only, use isolated contexts, and never mutate the
  target repository during proposal generation.
- Claude maps the role to its native agent mechanism; Codex maps it to registered collaboration
  roles/runner. If independent branches are unavailable, return BLOCKED rather than self-review
  disguised as Design It Twice.
- This repair closes an existing broken route. The new TDD→codebase pointer remains separately
  demand-gated; fixing reachability does not prove that refresh is needed.

#### G2.3 `resolving-merge-conflicts` candidate

- Keep primary-source intent reconstruction, but scope edits and staging to known conflict paths.
- Preserve abort/pause, show the proposed resolution and trade-offs, and request separate authority
  before staging, committing, or continuing a rebase.
- Detect and preserve unrelated dirty/untracked work. Never invent behavior to make tests pass.

#### G2.4 `teach` and TDD dispositions

- Default recommendation: keep `teach` an explicit **personal Claude-only exception**, outside
  luca_gstack routing. Before any write it must bind a dedicated teaching directory; invoking from a
  repository root cannot create files there. Correct the “zero framework touch” governance wording.
  Codex `N/A` is valid only because the exception is explicit and non-routed, not because a target is
  missing. A future shared teaching skill needs separate demand evidence and handshake.
- Keep current TDD behavior. Fix the stale `code-review` reference to the actual local capability.
  Do not take the HEAD codebase pointer until a real seam failure triggers a two-harness pilot.

**Acceptance evidence:** after candidate activation in an isolated test home, separate Claude and
Codex catalog/trigger/nested-reference/execute/degrade receipts for codebase and resolving;
dirty-tree Git fixture; three-context design fixture; teaching-root no-write fixture; TDD human-seam
pause in both harnesses.

**Rollback:** atomic target/symlink restoration from hash-verified backups; routes return to
explicit quarantine, never to a dangling recommendation.

### G3 — Cross-harness orchestration and human-gate parity

**Problem closed:** existing ports embed Claude-only `Agent`, `task()`, `background_output`, model
names, and `AskUserQuestion`; Codex can silently collapse independent work into same-thread
self-review. Plan-mode routing is not execution evidence.

- Define logical `plan`, `work`, and `oracle` roles once, with output schemas and effort classes from
  model-routing; never hardcode disposable model names in the shared behavior contract.
- Provide explicit Claude and Codex dispatch adapters. Codex needs registered/discoverable role
  implementations or the existing workflow runner; Claude retains native dispatch. Receipt IDs must
  prove distinct contexts and independent judge lineage.
- Replace brainstorm’s `task()/background_output` prose with the logical dispatch contract. If
  parallel extraction or Oracle is unavailable, report `DONE_WITH_CONCERNS` or BLOCKED as the skill
  contract requires; same-thread reflection is not an Oracle pass.
- Make human-gate behavior invariant: widget when available, plain-text stop-and-wait when
  interactive without a widget, and `NEEDS_CONTEXT` in headless mode. No seam, triage disposition,
  platform, or other human decision is machine-selected because a tool is absent.
- Ensure safe-write instructions are harness-neutral: each harness uses its protected editing
  primitive, reads before overwrite, and respects the per-session project pin.
- Correct code-recon’s machine-global/unpinned install claim: either use a truly project-scoped
  pinned mechanism or obtain explicit machine-global authorization with exact version and rollback.

**Owned surfaces:** logical agent contract; Claude agent/orchestrator pointers; Codex agent or
workflow-runner registrations; brainstorm nested references; tech-spec/human-gate consumers;
handoff writer instructions; code-recon install instructions; parity/verifier fixtures.

**Acceptance evidence:**

- Claude and Codex each produce three distinct read-only worker receipts plus a fourth independent
  Oracle receipt against the same fixture;
- a missing-role mutation blocks instead of silently self-reviewing;
- widget, no-widget interactive, and headless fixtures preserve the same human decision;
- no adapter uses an invalid effort or claims another harness’s invocation syntax;
- registration and live catalog tests prove trigger→target→nested references→structured result.

**Rollback:** remove only new adapter registrations and revert shared pointers; skills degrade to an
explicit unavailable state, never a fake completion.

### G4 — Current upstream delta: adopt less, record more precisely

These decisions are independent of G2 reachability repairs:

| Candidate | Decision in this plan | Re-entry / acceptance rule |
|---|---|---|
| TDD → codebase-design pointer | `DEFER` | First real seam/interface failure; run a one-task Claude/Codex pilot before refresh. |
| diagnosing redaction | `ADAPT` via G1.3 | All source/transcript/artifact canaries pass and diagnostic signal survives. |
| writing-for-agents | `ADOPT ONE DOCTRINE SENTENCE` | In the authoring SSOT only: agent-consumed docs treat environment as SSOT and cache only costly-to-recover information; both harnesses follow the same pointer. |
| logic HTML prototype | `DEFER / NO NEW ENTRY` | First real “validate state logic, not visuals” task gets a disposable one-off demo; observe before registration. |
| grilling rounds | `REJECT / KILL STANDS` | Reopen only after at least two real impatience events where narrow-to-two failed. |
| questionnaire | `DEFER` | First real handoff to a named knowledge holder produces one one-off questionnaire after human recipient/outcome gates; no automatic skill registration. |
| wizard | `REJECT` | Requires repeated local need plus transaction, account/repo binding, cancellation, rollback, and terminal-control design. |
| ask-matt phase tree | `REJECT` | Reopen only on local phase-boundary failures not solved by durable handoff/checkpointing. |
| wait-what | `REJECT AS SKILL` | Natural-language “没懂/说人话” remains the trigger; success is user understanding. |
| upstream release/deletion/docs propagation | `LEDGER ONLY` | A supply-side change never creates local demand by itself. |

G4 may update exclusion/defer evidence only after G0 validates that no route/registration side effect
was introduced. It does not install a new upstream skill.

### G5 — Candidate verification, second human gate, activation, and governed write-back

- Build global-skill changes in a disposable test home or isolated candidate directory. Record the
  before hashes of every personal/shared target; never overwrite unknown user edits.
- Run the full 57-unit manifest plus security, route, reference, human-gate, and live two-harness
  fixtures. Static evidence never substitutes for a live cell.
- Obtain a fresh independent implementation judge. Any BLOCKER, missing applicable cell, or
  unreviewed material change stops activation.
- Present per-track diff, evidence, residual risks, and exact rollback to Luca. Only this **second**
  human approval may activate shared/global skills or change live routes.
- After activation only, update installed pins, ADOPTED/adoption log, gaps/exclusion ledger,
  CHANGELOG, and observability receipts as one W⑨ transaction. Stable memory still follows
  candidate→review→promote; no direct promoted-facts edit.
- Roll back repository work with exact commits/reverts and global skills with atomic, hash-verified
  target restoration. Never use broad `git reset --hard`.

## 4. Binding two-harness acceptance matrix

| Track | Claude Trigger / Execute | Claude Degrade / Verify | Codex Trigger / Execute | Codex Degrade / Verify |
|---|---|---|---|---|
| G0 truth | Reads canonical manifest via project contract; runs exact validator | Unavailable live runtime=`BLOCKED`; separate receipt | Same manifest; route/catalog join includes shared and external targets | Sandbox/subscription=`BLOCKED`; hermetic static plus separate live receipt |
| G1 safety | Hooks/skills use canonical validation, structured input, source redaction | No widget pauses; canary, dirty-tree, rollback fixtures | Adapter preserves control verbs and safe read/write boundary | Missing primitive fails closed; same bytes/canaries plus live hook receipt |
| G2 external | Safe candidates discoverable; native independent agents | Missing agent or authority blocks; nested refs and Git fixture | Catalog target is real; Codex collaboration adapter executes | No silent self-review; isolated-home catalog and behavior fixture |
| G3 orchestration | Logical roles map to native agents and human widget | No widget plain-text wait; distinct-context and Oracle receipts | Logical roles map to Codex agents/runner | Headless=`NEEDS_CONTEXT`; missing role blocks; distinct receipts |
| G4 delta | Same doctrine/exclusion semantics, no accidental slash registration | Demand gate absent=no-op | Same SSOT pointer, no fictional slash | Route/registration mutation fixture remains clean |
| G5 activation | Candidate first, live activation only after Luca gate | Exact rollback and W⑨ audit | Candidate first, live activation only after Luca gate | Exact rollback and W⑨ audit |

## 5. Stop rules and requested plan handshake

Implementation may start only after the current two-round review and independent judge emit
`PLAN_HANDSHAKE_READY`, and Luca explicitly approves the desired tracks. Approval of this plan does
**not** authorize the later global activation gate.

Any of these conditions stops future implementation as `BLOCKED`:

- an unrecognized global-skill hash or user edit;
- missing Claude or Codex live access for a required activation cell;
- a proposed implementation weakens a human, project-scope, secret, or Git-sovereignty gate;
- route/catalog/target mismatch remains;
- a material change appears after the last independent review.

<!-- FILE_END: revised-handshake-plan.md -->
