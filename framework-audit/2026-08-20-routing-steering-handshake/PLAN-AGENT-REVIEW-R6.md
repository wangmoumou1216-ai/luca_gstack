# Round-6 Plan Agent gate

## Review identity

- Verdict: **NOT_READY_FOR_REDTEAM**
- BLOCKER: **2**
- MAJOR: **4**
- MINOR: **0**
- Reviewed plan: `FINAL-EXECUTION-PLAN.md`
- Expected and actual plan SHA-256: `e49f67ce59b5bee1bb45c7d38d1925b7dea5a6f79a79f8c2c755782a848788d5`
- Expected and actual plan length: **3,574 lines**
- Framework HEAD / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Downstream HEAD / upstream expected by the frozen plan and independently frozen R5 receipt:
  `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`
- Prior failed R5 receipt SHA-256: `a5a1d7a040225b4400ffb245656d4120679b7e784406f471b8973b5ee46dcf2a`
- Payload census SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`
- Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`

This review read the current plan from byte 0 through EOF, the complete R5 receipt, both authoritative agent
contracts and both frozen evidence files. The framework baseline was re-read directly. The active project-scope
guard correctly denied a direct Bash probe of the sibling downstream repository, so this receipt does not
overclaim a second fresh downstream read; it records the exact downstream identity supplied by the gate and the
immutable R5 receipt. That limitation does not affect the verdict because current-plan contradictions already
fail the gate.

The alias ownership/grammar, non-scoring semantic signal, native lazy attestation, NO_PIN no-project Plan cell,
and the common controller-time S(NEW) project restore oracle remain directionally sound. The current bytes still
contain two mutually exclusive deferred-request schemas and assign the required activation inverse to a commit
whose code is not the declared cutover root of trust. Four additional authority/lifecycle branches remain
non-total.

## Mechanical recheck of all R5 findings

| R5 finding | Round-6 status | Fresh evidence in this SHA |
|---|---|---|
| B1 owner/contract/call-capability/JOIN | **Partially closed, not mechanically total** | Owner roles/references, the universal call capability and JOIN lifecycle now exist (`FINAL-EXECUTION-PLAN.md:638-700`, `:810-848`). MAJOR M3 and M4 below show that the public verbs still lack exact per-verb request schemas and the parallel validator still permits an impossible write-overlap interpretation. |
| B2 HELPER_DISABLED rollback | Local state order added; **execution DAG not closed** | The helper crash oracle and inverse are explicit (`:2739-2763`), but BLOCKER B2 proves the implementation phase occurs after the exact B2 activator used for cutover has already been frozen. |
| M1 checkpoint strict oneOf + H/LP | Schema/identity core closed; **presentation lifecycle not closed** | CANCELLED and the core/checkpoint/claim formulas are now explicit (`:988-1025`). MAJOR M2 shows that the only Stop which can prove the checkpoint display is simultaneously forbidden. |
| M2 delta authority envelopes | IDs/key sets added; **route dispatch not closed** | Delta call/result/finalizer/install identities and three request key sets exist (`:885-980`). MAJOR M1 shows both valid delta controls are classified into a different route-event column from the only install cell. |
| M3 NO_PIN no-project Plan | **Closed for the reported path** | Exact approval admits only an all-NO_PROJECT Plan to route-only PLAN_EXECUTION_PENDING, with empty roots/no project grant; `begin` revalidates the invariant (`:765-774`, `:822-825`, `:1212-1216`). |
| M4 D(NEW) route_snapshot_kind arms | **Not closed** | The two-arm census table exists (`:2141-2156`), but BLOCKER B1 proves the earlier exact D schema and hash oracle reject those fields. |
| M5 unified S(NEW) restore oracle | **Closed for the reported path** | One issuance projection/H-LP snapshot and four-row project restore oracle are shared by route-present/absent controller-race arms (`:2291-2332`). |

## BLOCKER

### B1 — Two normative D schemas and request identities are mutually exclusive

Evidence:

- The first exact contract defines `request_sha256` under domain `deferred-project-request:v1` and then says a
  strict D object has **exactly** nine keys, none of which is `project_origin_snapshot`, `route_snapshot_kind` or
  `scope_resume_snapshot` (`FINAL-EXECUTION-PLAN.md:1235-1258`).
- The state contract later requires every D to contain an immutable project-origin snapshot and the
  `ABSENT|PRESENT` discriminator, with PRESENT requiring the scope snapshot and ABSENT forbidding it. It computes
  a different `deferred-project-request:v2` identity over those new fields (`:1689-1707`).
- The mandatory D(NEW) recensus selects its route-present/project-only behavior from that discriminator
  (`:2141-2156`). `project_origin_snapshot.state_sha256`, although authority-bearing input to v2, has no published
  H/LP field order of its own.

Counterexample:

1. A project-only SAME-parent NEW creates D with `route_snapshot_kind=ABSENT`. The §7/§8 schema requires that
   field, but the §5.4 exact-key validator rejects it as an extra key. Omitting it satisfies §5.4 but leaves the
   recensus unable to choose a column.
2. Two implementations can accept the same D but compute different request IDs—one with the normative v1
   domain/fields, one with v2. A retry, display hash or recovery request accepted by one is stale in the other.

Minimum revision:

- Delete the v1 formula/exact-key object or explicitly supersede it with one single strict D `oneOf` at the first
  normative definition. Define the common fields, exact project-origin variants and an H/LP formula for
  `project_origin_snapshot.state_sha256`; require ABSENT to forbid and PRESENT to require the exact route snapshot.
- Make v2 the sole request identity and update every creation, display, recensus, recovery, golden-vector,
  mutant and fault reference to it. A compatibility/default parser is not allowed.

### B2 — The DAG freezes B2 before implementing the activation state machine that only the B2 activator may execute

Evidence:

- B1/B2 are the bridge objects: B1 adds the strict external activator/trust controller and B2 only installs stable
  shims (`FINAL-EXECUTION-PLAN.md:2485-2496`). Cutover must use a hash-verified **external B2 activator**
  (`:2506-2514`).
- The maintenance journal and post-review bind every B2 bootstrap-TCB blob, and the sole cutover again names the
  external B2 activator (`:2765-2773`, `:3053-3066`).
- Nevertheless the execution DAG creates and lands B1/B2 in step 4, then only in the B2→V1 implementation step
  says to implement the `HELPER_DISABLED` activation inverse (`:3040-3049`). `scripts/runtime-activate.mjs` is a
  generation-external bootstrap path, not a g3 payload implementation detail (`:2616-2632`, `:2802-2850`).

Counterexample:

Following the DAG literally freezes/lands B2 before the Round-5 helper repair is implemented. V1 may contain the
new state machine, but maintenance must execute the exact B2 activator blob, which cannot recognize or recover
the required `HELPER_DISABLED` / `ROLLBACK_HELPER_READY` states. Using the V1 blob instead violates the journal,
TCB and cutover identity; implementing it in B1 instead violates the stated phase dependency.

Minimum revision:

- Move implementation, mutants, every chmod crash barrier and review of the complete §10.3 forward/inverse state
  machine into the B1 phase before B1/B2 are frozen. State explicitly that V1/C1 may not modify any B2
  activation/trust/bootstrap blob.
- Make the bridge review and `CANDIDATE-OBJECTS.json` prove that the exact B2 activator SHA used at maintenance is
  the one that passed every HELPER_DISABLED forward/rollback fault. Remove the later “implement activation
  inverse” dependency from V1.

## MAJOR

### M1 — Both valid delta-install controls are classified away from the only install cell

Evidence:

- The strict route grammar defines `EXACT_APPROVAL` as **only** `批准计划 <result_sha256>`; every other §5.3
  acceptance/revision/answer control is `ANSWER_OR_REVISION` (`FINAL-EXECUTION-PLAN.md:1894-1906`).
- The delta lifecycle requires `批准增量计划 <delta_result_sha256>` or, after a no-approval display, a
  DIFFERENT_DRAINED `继续执行增量计划 <delta_result_sha256>` (`:969-980`, `:1230-1231`).
- The total route row puts both installs in the `EXACT_APPROVAL` column, while its `ANSWER_OR_REVISION` column
  creates a new delta sequence (`:1985`).

Counterexample:

In `PLAN_EXECUTION_WAITING_DELTA_APPROVAL`, the exact documented approval is classified
ANSWER_OR_REVISION. The only matching table cell therefore starts a revision instead of consuming the install
capability. The boundary continuation has the same mismatch. Neither valid control can reach the declared install
transition without violating the classifier.

Minimum revision:

- Keep EXACT_APPROVAL exclusive to initial Plan approval. Split the delta route row by
  `DELTA_PRESENTATION_PENDING|WAITING_DELTA_APPROVAL|WAITING_DELTA_BOUNDARY` and put the two SHA-bound controls in
  the ANSWER_OR_REVISION cell with exact wait-kind and parent-relation guards.
- Add generated positives for both controls and negatives for swapped wait kind, SAME/unproven boundary, wrong
  SHA, extra text and an initial-Plan approval supplied to a delta wait.

### M2 — Checkpoint presentation requires a Stop that the Stop contract unconditionally blocks

Evidence:

- `checkpoint` moves the route to `PLAN_EXECUTION_CHECKPOINT_PRESENTATION`; only a byte-proving Stop may change
  the checkpoint to PRESENTED and the route to TRANSFER_READY (`FINAL-EXECUTION-PLAN.md:1027-1031`, `:1066-1073`).
- The Stop contract groups `PLAN_EXECUTION_CHECKPOINT_PRESENTATION` with states that block Stop and only
  reinject an action (`:2224-2228`). Its later verified-wait allowance starts at TRANSFER_READY and never defines
  the missing presentation transition (`:2231-2247`).

Counterexample:

A valid checkpoint is ISSUED, the assistant emits the exact persisted checkpoint display, and Stop runs. The
state is still CHECKPOINT_PRESENTATION, so the stated Stop table blocks it. It can never become PRESENTED or
TRANSFER_READY; a fresh target can therefore never claim it.

Minimum revision:

- Give CHECKPOINT_PRESENTATION one explicit Stop arm parallel to generic PRESENTATION_PENDING: exact current
  event + byte-identical final-assistant projection atomically sets checkpoint PRESENTED and route
  TRANSFER_READY; mismatch blocks/reinjects.
- Remove it from the unconditional block list and add exact/mismatch/replay/crash tests at the single rename.

### M3 — The public approved-plan controller lists authority-bearing verbs without exact request oneOf schemas

Evidence:

- The public surface exposes sixteen `plan-execution` verbs plus transfer recovery, and says every request binds
  execution/phase/capability/event/project fields (`FINAL-EXECUTION-PLAN.md:803-808`, `:2274-2276`).
- The plan publishes exact key sets only for the three delta verbs and checkpoint/claim (`:934-948`,
  `:1042-1048`). There is no required/forbidden-key table for `begin`, `issue-preflight`, `record-preflight`,
  `issue-phase-tool`, `issue-summary`, `complete-summary`, `complete-phase`, `record-quality-gate`,
  `record-failure`, `answer-wait` or `finalize`.
- Those verbs consume the owner/call capability and determine JOIN, quality and completion authority
  (`:810-848`); “binds” does not say which values are caller-carried, controller-derived or forbidden.

Counterexample:

One implementation derives JOIN child-evidence root and owner solely from state; another accepts those fields in
an `issue-summary` request and merely compares a subset. Both satisfy the prose, but an extra/stale child root or
cross-phase owner has different results. The same ambiguity lets `record-quality-gate` disagree over whether PASS
is caller data or paired native evidence.

Minimum revision:

- Add one closed discriminated request `oneOf` for every public verb: exact keys/types/caps, fields derived from
  state and therefore forbidden in argv, pre-state, capability consumed, native Pre/Post evidence, input-SHA
  formula and unique next state.
- Add unknown/extra/missing/reordered, wrong-verb-capability, wrong phase/owner/native call and two-consume
  mutants for every arm; keep failure output command-null.

### M4 — A post-child JOIN cannot serialize overlapping parallel-child writes

Evidence:

- The strict parallel validator requires no child dependency but permits “disjoint writes **or an explicit
  serializing join**” (`FINAL-EXECUTION-PLAN.md:687-688`).
- All children then issue together in one wave; JOIN/SUMMARY is minted only after every child has terminal DONE
  evidence (`:827-845`). The join therefore occurs after, not before or between, child mutations.

Counterexample:

Two schema-valid parallel children own the same output path. Because the group has the mandatory explicit join,
the quoted alternative can admit it. Both work calls then mutate that path concurrently; the later summary cannot
retroactively serialize or attribute the resulting bytes, so Owner/file ownership and phase evidence cease to
be bijective.

Minimum revision:

- Require pairwise-disjoint child write templates/output paths unconditionally. Require the JOIN owner to write
  only a distinct aggregate `summary_output`. Any shared-write workflow must be represented as serial phases or
  an explicit pre-child dependency DAG, not a post-child join.
- Add overlap, alias/canonical-path collision and summary-output-equals-child-output mutants.

## Gate conclusion

Round-6 materially improves the R5 candidate: the native owner/call/JOIN identities, helper mode crash oracle,
checkpoint hashes, delta IDs, NO_PIN Plan cell, D census arms and S race restore oracle are now present. The plan
still cannot select a single D schema, cannot guarantee that the declared B2 cutover executable contains the
required rollback state machine, and leaves delta/checkpoint control plus controller/parallel execution
non-total.

**Gate: NOT_READY_FOR_REDTEAM.** Revise the plan, freeze a new exact SHA and run a fresh independent Plan Agent
gate before commissioning the Round-6 dual red team. Wording-only assertions do not close these six findings.

Only this review file was created. No plan, runtime, governance, test, project state, workflow state or downstream
file was modified.
