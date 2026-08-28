# Opportunity Ledger — Final Research + Post-GATE Disposition

Status: **NECESSARY_ADOPTION_COMPLETE / VERIFIED_WITH_CONCERNS**
Human gate: **01 + 03–06 COMPLETED; 02 NOT_NEEDED_AS_NEW_PROFILE**

At research close no item had been adopted. The later user instruction “你发现的，解决了” authorized the four local defect closures `FINAL-OPP-03..06`; a subsequent need-first instruction authorized completion only where current evidence still showed need. That review implemented the narrowed `FINAL-OPP-01`, found no incremental need for a new `FINAL-OPP-02` profile, and completed remote CI/branch protection for `FINAL-OPP-06`. Deferred execpolicy work, publication and release remain unauthorized. Redteam's value/cost/risk bands remain research judgments rather than pseudo-exact scores.

## 0. Ordering method

- Value: **High** closes an observed or mechanically evidenced gap; **Medium** addresses a credible but lower-impact gap.
- Cost: **Low** is one bounded checker/config experiment; **Medium** crosses multiple contracts or harness projections; **High** changes a control-plane boundary.
- Risk: **Low** is easy to isolate; **Medium** can create false positives or maintenance load; **High** touches permissions, authority or cross-harness truth.

Items are sorted by higher value, then lower cost, then lower risk. Ties are explicitly uncertain.

## 1. Final candidate set

| Order | ID | Opportunity | Classification | Value | Cost | Risk | Gate state |
|---:|---|---|---|---|---|---|---|
| 1 | FINAL-OPP-03 | Route polarity and scope-guard conformance closure | LOCAL_HARDENING | High | Low–Medium | Medium | IMPLEMENTED_VERIFIED |
| 2 | FINAL-OPP-05 | Atomic observability writer and rebuildable projection | LOCAL_HARDENING + DIRECT_PATTERN | High | Low–Medium | Medium | CORE_IMPLEMENTED_VERIFIED |
| 3 | FINAL-OPP-01 | Cross-harness semantic and obligation evidence closure | LOCAL_HARDENING + ADAPT_TEST_PATTERNS | High | Medium | Medium | IMPLEMENTED_VERIFIED_WITH_RESIDUAL |
| 4 | FINAL-OPP-06 | CI severity propagation and projection portability closure | LOCAL_HARDENING + DIRECT_PATTERN | High | Medium | Medium | IMPLEMENTED_REMOTE_VERIFIED_PROTECTED |
| 5 | FINAL-OPP-02 | Explicit isolated least-authority profile evaluation | ADAPT | High | Medium | High | NOT_NEEDED_AS_NEW_PROFILE |
| 6 | FINAL-OPP-04 | Independent verdict / eval-recorder permission separation | LOCAL_HARDENING | High | Medium | High | IMPLEMENTED_VERIFIED_WITH_RESIDUAL |

The order preserves the research-time value/cost/risk view. `FINAL-OPP-01` was implemented only after the later conditional GATE; `FINAL-OPP-02` was not implemented because the existing runner already supplied the evidenced least-authority task boundary. `FINAL-OPP-03..06` were local defects or proof gaps and were implemented only after human authorization. Exact outcomes and limitations are in `completion-review.md` and `remediation-report.md`.

The priority table is authoritative. Dossiers below preserve the research-time evidence, proposed minimum scheme, verification and rollback contract; their future-tense wording is an audit snapshot, not the current implementation status.

### FINAL-OPP-03 — Route polarity and scope-guard conformance closure

- Evidence:
  - the minimal dry-run prompt explicitly says framework task, `NO_PIN`, and “do not trigger Project Gate”, yet the current route guard returns `NEEDS_CONTEXT` because raw project/product tokens dominate polarity (L-SRC-15; C05);
  - the project-scope wrapper scans/replaces entire Bash command strings, includes a hard-coded fallback path, covers only selected tool aliases and has top-level fail-open behavior (L-SRC-16; C03/C12/C18);
  - the existing scope test passes `88/0`, showing its present assertions do not cover the benchmark's counterexamples.
- Expected benefit: prevents explicit negative scope instructions from being reversed and makes the protection boundary testable without weakening the CAS/lease/session-pin core.
- Minimum future scheme:
  1. add source-derived polarity fixtures for affirmative, negative and quoted mentions before changing routing logic;
  2. separate read/write intent and structured path operands from whole-command lexical substitution;
  3. remove hard-coded fallback identity and define fail-closed behavior only for the protected operation classes.
- Verification:
  - the reproduced `NO_PIN` Mode 2 prompt routes to framework evolution without Project Gate;
  - affirmative downstream-project prompts still gate/switch only under their existing contract;
  - quoted examples and paths do not become intent;
  - mutation tests for negation removal, unsupported tool alias and fallback-root drift fail;
  - all existing CAS/lease and scope fixtures still pass.
- Rollback condition: the new parser creates more false routing than the baseline, blocks legitimate read-only framework research, or bypasses the identity transaction SSOT. Revert only the experiment and retain the core pin/CAS implementation.

### FINAL-OPP-05 — Atomic observability writer and rebuildable projection

- Evidence:
  - `write_observation.py` derives IDs from counts, appends observation/rule effects separately and rewrites the full rules YAML without a demonstrated lock or atomic rename (L-SRC-18; C15/C18);
  - eval and run-log append paths likewise lack a documented shared concurrency boundary;
  - Codex rollout trace uses append-only raw evidence with a best-effort offline reducer rather than making a derived view authoritative (O-SRC-22; C15).
- Expected benefit: prevents duplicate IDs, lost rule updates and half-committed feedback under parallel agents while keeping raw evidence recoverable.
- Minimum future scheme: one locked append primitive with collision-resistant IDs, atomic temp-file replacement for derived projections, and an idempotent rebuild command; keep the raw log authoritative and derived rules review-governed.
- Verification:
  - a parallel writer stress fixture produces unique IDs and no dropped events;
  - forced interruption between raw append and projection leaves a rebuildable state;
  - rebuilding twice is byte-stable;
  - malformed raw records are quarantined and reported without truncating good evidence.
- Rollback condition: locking introduces deadlock/material latency, rebuild changes reviewed semantic meaning, or a second truth source appears. Remove the new writer/projection and restore the prior files from the experiment snapshot.

### FINAL-OPP-01 — Cross-harness semantic and obligation evidence closure

- Evidence:
  - MagicPath is source-confirmed as an intentional delegation, yet current parity checks cannot express/validate that source-owned reason or distinguish a future accidental substitution with the same anchors (LG-029/030/043/044; C06/C20/C22);
  - prior meta audits and observability evidence show that anchor or artifact presence does not prove an obligation executed (L-SRC-10, L-SRC-14);
  - Codex rollout/app-server events can supply event evidence, but cannot prove governance validity (OAI-008/030/035; C15).
- Expected benefit: detects accidental cross-harness semantic substitutions and missing mandatory steps without treating a Codex-only trace, a filename, or a receipt's mere existence as truth.
- Minimum future scheme:
  1. derive checks from current authoritative skill/route/obligation sources rather than create a second catalog;
  2. add one intentional-delegation fixture and one swapped-target negative control;
  3. allow runtime traces as evidence inputs, never as the governing decision or sole source.
- Verification:
  - the known intentional MagicPath delegation is a positive fixture and passes only with its source-owned reason;
  - an accidental target swap fails;
  - removal of one mandatory obligation fails; reordering fails only when the authoritative source explicitly declares order significant;
  - Claude and Codex evidence lead to the same verdict;
  - no valid skill needs byte-identical harness wrappers.
- Rollback condition: the checker becomes a second skill/obligation catalog, produces unresolvable false positives, requires Codex-only trace data, or proves only receipt presence. Remove the experiment-owned checker/fixtures and retain existing sources.

### FINAL-OPP-02 — Explicit isolated least-authority profile evaluation

- Evidence:
  - Codex separates sandbox from approval and supports layered permission profiles (O-DOC-06, O-DOC-07, O-DOC-14; C02/C03);
  - the current local writable roots are broad, but .codex/config.toml documents real cross-root memory, IPC and project-transaction needs (L-SRC-13);
  - child roles inherit the parent's live permission profile, so role TOML cannot provide local read-only isolation (O-SRC-19/20; C09).
- Expected benefit: measures whether blast radius can be reduced for explicitly isolated task classes without pretending permissions are project identity.
- Minimum future scheme: inventory required writes and replay a fixed corpus in an opt-in benchmark-only profile; do not auto-select it from route/project semantics and do not change the normal profile.
- Verification:
  - authorized corpus writes succeed;
  - undeclared writes fail mechanically;
  - project isolation/CAS semantics remain independent;
  - child-agent permissions equal the selected parent profile;
  - memory and app IPC do not silently break.
- Rollback condition: any legitimate corpus write requires undeclared broad access, profile choice cannot be explicit/deterministic, or it creates a second identity router. Delete only the experimental profile and retain current config.

### FINAL-OPP-06 — CI severity propagation and projection portability closure

- Evidence:
  - local remote CI omits parts of the full verifier path and some HTML/quality checks report warnings without failing the aggregate job (L-SRC-19; C22);
  - local Codex projections contain machine-specific paths, while `harness.mjs:106-120` still describes Codex `blockVerb`/`inputMutation` as unavailable even though the adapter preserves those protocol paths; anchor checks still pass (L-SRC-13/L-SRC-04; C03/C20);
  - Codex CI uses an explicit gather job over required results, generated schema checks and behavior-focused suites, while test counts alone still do not prove coverage (O-SRC-23/24; C22).
- Expected benefit: makes required-check failure visible, reduces machine-local drift and prevents green CI from masking a skipped or warning-only mandatory assertion.
- Minimum future scheme: declare severity and requiredness in the authoritative checker registry, add one aggregate gatherer, replace machine-specific projections with source-derived/runtime-resolved values, and check generated artifacts for drift.
- Verification:
  - mutating each required job to fail makes the aggregate job fail;
  - optional warnings remain visible but non-blocking by explicit declaration;
  - a clean checkout under a different root passes without text substitution;
  - stale generated projection/schema artifacts fail CI with a reproducible regeneration command.
- Rollback condition: the gatherer becomes a second required-job catalog, portability work changes identity semantics, or optional diagnostics block normal development. Revert the experiment-owned registry/gatherer changes.

### FINAL-OPP-04 — Independent verdict / eval-recorder permission separation

- Evidence:
  - the local quality-gate role is intended to be independently read-only, but its contract also mandates writing its own eval record; the pinned native role projection preserves the parent's live sandbox/approval profile and ignores role-level permission overrides (O-SRC-19/20; L-SRC-17; C09/C16);
  - therefore the current contract cannot simultaneously prove least authority and mandatory self-recording.
- Expected benefit: preserves independent judgment while giving audit recording one explicit, mechanically bounded authority path.
- Minimum future scheme: have the judge emit a signed/hashed structured verdict only; a separate parent-owned recorder validates schema, binds run identity and appends it through the atomic writer. The recorder must not edit the verdict.
- Verification:
  - the judge cannot write repository or audit files under the selected profile;
  - the recorder rejects malformed, replayed or mismatched-run verdicts;
  - recorder failure leaves the verdict available for retry and never changes PASS/FAIL;
  - an adversarial parent cannot silently replace the recorded verdict without a hash mismatch.
- Rollback condition: separation weakens provenance, permits verdict tampering, or requires broad recorder writes. Remove the recorder bridge and retain explicit manual recording until another bounded design is approved.

## 2. Deferred opportunities and revisit triggers

| Initial item | Final state | Why deferred | Revisit only when |
|---|---|---|---|
| Native Codex hook expansion | DEFER | The six local handlers already run inside the native engine; a second sibling/native path may duplicate effects or alter ordering. | A concrete missing lifecycle obligation is observed and cannot be expressed through the current adapter. |
| App-server/Python workflow backend | DEFER | The current runner already provides scratch-CWD isolation and known recovery semantics; no continuity failure was measured. | A reproducible runner limitation requires resume/fork/typed events that the current backend cannot supply. |
| Fine-grained memory provenance/exclusion | DEFER | Codex's coarse thread-pollution exclusion can discard user truth; local extraction lacks span-level provenance. | A real pollution incident is documented and a per-item provenance chain is feasible. |
| Plugin packaging | DEFER | No current cross-machine/user distribution object was demonstrated; packaging risks another installed-state truth. | A named integration must be installed/uninstalled reproducibly outside the repo. |
| Deterministic command-prefix safety projection | DEFER / NOT GATE-READY | The current proposal models allow/deny only, while the authoritative careful path is Ask with user override; Prompt becomes Forbidden under never approval. Projection SSOT is undefined. | A source-generated projection defines Ask/Allow/Forbidden plus interactive, non-interactive and never-approval behavior without becoming a second truth. |

Deferred execpolicy evidence: Codex supports side-effect-free prefix rules but the language remains preview (O-DOC-08, O-SRC-11). The local careful contract requires an Ask/override path, and upstream maps Prompt to Forbidden when prompts are unavailable. Any future revisit must derive from the current authoritative rule, test the full approval-policy matrix, exclude semantic routing/human product gates/path-scope parsing, and roll back on preview drift or false decisions.

## 3. Rejected as stated

| Initial idea | Final verdict | Reason |
|---|---|---|
| Standalone machine-readable feature maturity registry | REJECT_AS_STATED | Codex's registry describes compile-time toggles, not arbitrary governance maturity; owner/evidence/rollback would create a second truth unless genuinely derivable. |
| Generalized Guardian denial/retry circuit breaker | REJECT_AS_STATED | Guardian's breaker is turn-level and approval-specific, not an exact-action workflow state machine; no local denial-loop incident was shown. |
| Native planner/work/oracle role expansion | REJECT_AS_STATED | Pinned Codex ignores role sandbox/approval overrides and preserves parent permissions; the premise that judge/worker roles can be made mechanically read-only in TOML is false. |
| Local hook context budget/spill layer | DO_NOT_DUPLICATE | The native Codex hook engine already supplies spill; the local config intentionally bypasses the limit for two carrying events. |

## 4. Explicit non-opportunities

| Rejected import | Reason |
|---|---|
| Generated Codex memory as authoritative rules/project decisions | Asynchronous generated recall is weaker than candidate→review→promote governance. |
| Auto-review for product, architecture, adoption or release gates | It reviews sandbox-boundary escalation and cannot own human-only decisions. |
| Generic project trust as session identity binding | It does not encode shared-link/session/CAS semantics. |
| Goal mode instead of artifacts, handoffs and eval contracts | Runtime outcome control does not establish workflow semantic quality. |
| A Codex-only source of truth | It would create the cross-harness drift this framework is designed to prevent. |
| Broad permissions merely for convenience | Existing broad roots must be justified by required workflows, not copied as a default pattern. |

## 5. Human adoption gate — final disposition

The research-stage choices were:

- OPEN_GAP: create a governed opportunity with owner and evidence.
- AUTHORIZE_SPIKE: permit only the stated bounded experiment.
- DEFER: retain evidence and set a revisit trigger.
- REJECT: record why it is unsuitable.

Post-research human decision:

- `FINAL-OPP-01`: `NEED`; source-derived projection and proof-it-bites implemented, locally and remotely verified, with static-vs-runtime residual retained.
- `FINAL-OPP-02`: `NOT_NEEDED_AS_NEW_PROFILE`; existing scratch-isolated runner satisfies the evidenced task class. Native judge role isolation remains a separately triggered residual, not a reason to create a universal profile.
- `FINAL-OPP-03/04/05`: `AUTHORIZE_FIX`; implemented and verified with the residuals recorded in `remediation-report.md`.
- `FINAL-OPP-06`: `AUTHORIZE_FIX`; implemented, verified on remote run `33165797050`, and installed as the sole `main` required context `Required Checks`.
- Deferred and rejected items: unchanged.

No downstream project, identity transaction, semantic promotion, gap/benchmark registry mutation, adoption log, changelog or release was performed. The branch-protection change was the explicitly scoped external completion step and was read back after mutation.

<!-- FILE_END: opportunities.md -->
