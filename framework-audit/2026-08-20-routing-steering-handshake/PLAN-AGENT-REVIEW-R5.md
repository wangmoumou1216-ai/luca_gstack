# Round-5 Plan Agent gate

## Review identity

- Verdict: **NOT_READY_FOR_REDTEAM**
- BLOCKER: **2**
- MAJOR: **5**
- MINOR: **0**
- Reviewed plan: `FINAL-EXECUTION-PLAN.md`
- Expected and actual plan SHA-256: `2380072b7fa9141bc52debff1f9df69f6ee94d9da489db4368ed3c4fa521ad4d`
- Plan length: **3,317 lines**
- Framework HEAD / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`
- Downstream HEAD / upstream: `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a` / `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`
- Prior failed review SHA-256: `7b8f0b5c348083183b03e6501b5fe642c3ef12e4a9f47d43e874e97638dff6e9`
- Payload census SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`
- Transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`
- Plan Agent SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`
- Orchestrator SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`

The review read the current plan from byte 0 through EOF, then re-read every range hidden by output truncation. It also read the complete R4 receipt, both authoritative agent contracts and both frozen evidence files. The premise, product-owned alias architecture, non-scoring semantic signal, native-event attestation and generation fence remain justified. The candidate cannot advance because one authoritative parallel phase still has no complete authorized JOIN path and the required activation rollback is impossible from a declared crash state. Five additional state/envelope branches remain non-total.

Visible framework dirt is outside the literal runtime/change envelope, and visible downstream dirt does not overlap `muse/.luca/project.json`; this gate did not modify, stage, stash or clean it.

## Mechanical recheck of the R4 findings

| R4 finding | Current status | Fresh evidence in this SHA |
|---|---|---|
| B1 approved-plan totality | **Not closed** | The three phase variants, preflight and assertion scopes now exist (`FINAL-EXECUTION-PLAN.md:581-681`), but BLOCKER B1 below shows that parallel child work and the semantic JOIN/summary have no total Owner/contract/capability mapping. |
| B2 activation TCB | External roles closed; **activation still non-executable** | NODE/private Codex helper/Git/ps/sysctl/lsof are now explicitly frozen (`:2379-2422`). BLOCKER B2 proves that the sole inverse cannot execute after the helper is disabled. |
| M1 cross-session checkpoint | **Not closed** | Source revocation and a global one-claim journal were added (`:867-915`), but the checkpoint status schema contradicts its cancel transitions and its authority IDs/core have no exact byte oracle. |
| M2 delta replan | **Not closed** | A delta schema and human decision path exist (`:820-865`), but MAJOR M2 identifies the missing delta capability/result/finalization envelopes. |
| M3 Plan project boundary | **Not closed** | Project-required NO_PIN and clean C/B boundary paths exist (`:727-742`, `:812-818`); the promised wholly no-project NO_PIN execution has no approval admission cell. |
| M4 activation order | Forward order closed; **inverse not closed** | §10.1, §10.3, DAG and T-ACTIVATE now use repo→trust→pointer (`:2304-2311`, `:2504-2531`, `:2833-2840`, `:3043-3047`). BLOCKER B2 is the remaining rollback contradiction. |
| M5 controller-time NEW race | **Partially closed, not total** | Route-present and project-only controller arms now exist (`:2102-2125`), but MAJOR M4 and M5 show an unrepresented project-only D recensus and two incompatible restoration oracles. |
| M6 TARGET_EXISTS task preservation | Closed for the reported loss path | A signal-bearing NEW against an existing target now persists exact task bytes, presents a combined SWITCH retry and cannot be erased by bare SWITCH (`:1650-1701`). |
| m1 D re-presentation | Closed | A VERIFIED primary proof remains immutable and each retry receives one fresh route-shared reprompt challenge (`:1009-1017`). |

## BLOCKER

### B1 — A valid `parallel_skill_execution` phase still has no authorized aggregate-summary/JOIN executor

Evidence:

- The authoritative Plan Agent requires one parallel phase with fixed child skills, all child outputs and an aggregate summary (`.claude/agents/plan-agent.md:298-317`); the Orchestrator requires the main coordination layer to create that summary before the single quality gate (`.claude/agents/orchestrator.md:154-168`).
- The new schema correctly admits `parallel_skill_execution`, but `ParallelSkillGroup` contains only `max_concurrency`, children, `summary_output`, `join_gate` and `quality_gate_owner_id`. It has no summary/JOIN owner or agent/execution contract. A child has `agent_contract_id` but no work `owner_id`, while `Owner.role` has no JOIN role (`FINAL-EXECUTION-PLAN.md:612-637`).
- The validator requires dispatches to match an approved Owner and contract (`:657-680`, `:794-803`), and the tombstone union explicitly anticipates an `APPROVED_JOIN` native call (`:1116-1124`). Nevertheless, execution says only that “the coordinator” creates the semantic aggregate summary before quality (`:777-792`); no capability, owner, native-call pairing or deterministic controller-only summary format authorizes that act.

Counterexample:

1. A schema-valid parallel phase contains deepresearch and ux-research children. Both preflights, parameters and child calls finish, but `summary_output` is absent. The controller cannot synthesize “key findings / consensus / conflicts” without model work. Dispatching MAIN/WORK to write it has no JOIN owner/contract/capability and violates the ordinary mutation gate; refusing to dispatch leaves the phase permanently before quality.
2. Two WORK_AGENT Owners and two children/contracts can be swapped without changing any child field because children do not bind `work_owner_id`. The same approved bytes therefore authorize more than one owner/file-ownership interpretation.

Minimum revision:

- Add an exact `work_owner_id` to ordinary skill and every parallel child and require a bijection with the expected MAIN/WORK role, agent contract, execution contract and file ownership.
- Add `summary_owner_id`, `summary_agent_contract_id` and `summary_execution_contract_id` (or a genuinely deterministic non-semantic controller format) to the parallel group; bind one one-shot SUMMARY/JOIN capability through PreTool/PostTool and output evidence before the quality gate.
- Require exact owner↔contract↔phase/child bijections, reject extra phase-level contract IDs, and add swap/deletion/stale-JOIN mutants. Until then a valid authoritative phase has no legal completion path.

### B2 — The sole activation inverse requires executing a helper that the forward path has already made non-executable

Evidence:

- The private Codex helper is created and verified at mode 0500, is the only legal trust mutator, and must be disabled independently (`FINAL-EXECUTION-PLAN.md:2386-2396`).
- After probes, the forward path chmods/read-backs that helper to 000 **before** restoring normal consumer modes and writing `MODES_RESTORED` (`:2524-2531`). There is no durable `HELPER_DISABLED` state in the claimed unique sequence (`:3043-3047`).
- Rollback from **any** state must inhibit normal consumers and then perform pointer→G0, repo/index/ref/worktree→B2, and trust inverse **through the helper** before the final helper→000 step (`:2533-2539`). Helper-disable fault barriers are mandatory (`:3176-3182`). No inverse transition re-enables the exact helper inode.

Counterexample:

- Crash immediately after the fd-bound helper chmod/read-back to 000 and before `MODES_RESTORED`. The durable state is still `SHIM_PROBES_PASSED` while the actual helper mode is 000. Recovery must run the trust inverse after restoring B2, but the only allowed executable is non-executable and the unique inverse contains no 000→0500 transition. Treating this as unknown leaves `ACTIVATION_RECOVERY_REQUIRED`, so the required named fault barrier can never satisfy rollback.

Minimum revision:

- Add a durable `HELPER_DISABLED` tuple/barrier, and make the unique inverse explicitly re-enable the exact journal-bound helper inode to 0500 under the fence and complete normal inhibition **before** the B2 trust inverse; re-disable/read-back it after the G0 probe. Bind both mode transitions and every crash side to the journal.
- Alternatively choose one different order that leaves a usable, equally constrained inverse, but make §10.1, §10.3, T-ACTIVATE and the DAG byte-identical. An implicit chmod exception is not compatible with the claimed closed TCB/order.

## MAJOR

### M1 — The checkpoint schema contradicts its own cancellation transitions and lacks exact authority identities

Evidence:

- `plan_checkpoint.status` is declared as only `ISSUED|PRESENTED|CLAIM_COMMITTING|CLAIMED` (`FINAL-EXECUTION-PLAN.md:867-872`).
- The same contract requires correction/new task/cancel to set checkpoint status `CANCELLED` (`:910-915`), and the route table requires exact cancel→CANCELLED (`:1804`). That value is outside the declared status union.
- `checkpoint_id` is used as the copyable 64-hex claim token and as input to target obligation/execution authority (`:873-903`, `:1615-1618`), but §§5.3/7.2 define no H/LP formula, monotonic sequence or strict field list for it. `source_checkpoint_core_sha256` is described only as hashing an informal “core” (`:910-915`), with no ordered framing formula or golden-vector oracle.

Counterexample:

- A presented source checkpoint receives an authenticated correction before claim. The required transition produces `CANCELLED`, which its own strict schema rejects. Separately, two conforming implementations may hash different “core” field orders or let the Plan Agent/controller supply different checkpoint IDs for the same state; claim and replay outcomes then differ while both satisfy the prose.

Minimum revision:

- Publish a strict checkpoint `oneOf` including terminal `CANCELLED`, with required/forbidden fields for every status.
- Define domain-separated H/LP formulas for `checkpoint_id`, `source_checkpoint_core_sha256`, checkpoint sequence and the source/target claim roots; the controller, never a caller, computes them. Add cross-harness golden vectors, cancel-before/after-presentation, two-claim and every journal-barrier tests.

### M2 — Delta replan names capabilities and results without defining their anti-replay/finalization envelopes

Evidence:

- The initial Plan path precisely computes Plan capability, native-call challenge, result and independent finalizer IDs (`FINAL-EXECUTION-PLAN.md:549-576`, `:682-705`).
- The delta path says it issues a read-only Plan Agent delta capability and accepts a strict result containing caller-visible `capability_id` and `delta_result_id` (`:829-850`), then exposes `request-delta|finalize-delta|install-delta` (`:771-775`). It provides no delta-capability formula, native-call challenge, controller-computed result-ID formula, independent current-event finalizer, or exact decoded request schemas for those verbs.
- Installation depends on `delta_result_id` and `delta_result_sha256` (`:851-859`, `:1059`), so those missing identities are authority-bearing, not diagnostic metadata.

Counterexample:

- One valid delta result can carry two agent-chosen `delta_result_id` values, or a stale PostTool can be paired with a newly rotated route event. The plan does not determine which ID the controller must compute, which event owns finalization, or which exact finalize/install request is accepted. Implementations can therefore diverge on replay and approval while preserving all listed delta fields.

Minimum revision:

- Mirror the initial Plan protocol with domain-separated `delta_capability_id`, native-call challenge, controller-computed `delta_result_id=H(capability/native_call/result_sha)`, immutable result, separate event-bound delta-finalize capability and strict one-shot request JSON for request/finalize/install.
- Specify stale PostTool, capability rotation, display, approval/no-approval install and crash barriers; add wrong-call/result/finalizer, duplicate-result and two-install mutants.

### M3 — A wholly no-project Plan is declared executable under NO_PIN but exact approval has no NO_PIN admission cell

Evidence:

- The plan explicitly says a wholly `NO_PROJECT` Plan may execute under NO_PIN (`FINAL-EXECUTION-PLAN.md:727-736`) and `plan_execution.project_identity` admits exact NO_PIN (`:744-769`).
- Exact approval has only: active A→PENDING; clean C/B DIFFERENT_DRAINED→PENDING; clean C/B SAME/unproven→WAITING_BOUNDARY (`:738-742`). The wait grammar repeats those branches and omits N (`:1041-1044`).

Counterexample:

- In a fresh NO_PIN session, a complex response-only task produces an otherwise valid wholly NO_PROJECT `PLAN_READY`, is displayed, and receives exact approval. `plan_admission` is APPROVABLE, but none of the exhaustive approval transitions accepts N. The result cannot enter execution or a valid wait, and Stop remains governed by an unresolved Plan obligation.

Minimum revision:

- Add the unique cell `NO_PIN + plan_requires_project=false + exact approval → PLAN_EXECUTION_PENDING` with route-only phase capabilities, empty project roots and no project mutation grant. Preserve `NO_PIN + plan_requires_project=true → PLAN_PROJECT_REQUIRED` as unapprovable. Cross both with mixed first waves, Stop and replay.

### M4 — D(NEW) recensus has no project-only arm even though project-only D is first-class

Evidence:

- Every D, including a project-only D with no route obligation, owns only its independent project presentation (`FINAL-EXECUTION-PLAN.md:993-1004`). The stable matrices create NEW D from project-only requests in A/C/B (`:1874-1889`).
- Before any D(NEW) continuation, the recensus table is declared universal (`:1952-1969`). Its EXISTING_OTHER arm requires an exact scope-resume snapshot and stages route `PROJECT_SWITCH_REQUIRED`; EXISTING_CURRENT creates a new PENDING route obligation with byte-identical task bytes; INCOMPLETE likewise assumes a snapshot (`:1959-1964`). A project-only D has none of those route/task objects.

Counterexample:

- A(P) receives project-only `创建 foo 项目` under SAME, stores D(NEW), presents it, and Stops. Another process creates foo. On the first DIFFERENT_DRAINED `继续`, recensus returns EXISTING_OTHER. The only specified arm must retain a nonexistent route snapshot and create a route wait, contradicting the no-obligation invariant; declining to do so leaves no specified transition.

Minimum revision:

- Cross every D(NEW) census result with `route_snapshot_kind=ABSENT|PRESENT` (or an equivalent strict discriminator). The project-only arms must restore the exact project origin, create only an independent TARGET_BECAME_EXISTING_PROJECT_ONLY/current-target presentation as applicable, and never invent task/obligation bytes. Route-present arms may use PROJECT_SWITCH_REQUIRED/rebind. Add all legal A/C/B origins, both continuation grammars and every census outcome.

### M5 — The controller-time NEW race has two incompatible no-change restoration oracles

Evidence:

- Every issued S(NEW) stores `race_restore_snapshot` whose stable origin may be NO_PIN, TURN_ACTIVE, TURN_CLOSED or BOUND (`FINAL-EXECUTION-PLAN.md:2102-2105`).
- If the race finds the target existing, the route-present arm restores the hard-coded shorthand `O?C(O):N`, while the project-only arm restores the **exact** origin snapshot (`:2111-2124`). The underlying project race is identical; only task presence differs.
- The stable matrix itself distinguishes SAME cancellation to C from DIFFERENT_DRAINED cancellation to A (`:1879`, `:1904`), so a single `C(O)` cannot encode every issuance origin/boundary.

Counterexample:

- S(NEW) is issued from a clean B(P) or marker-drained A(P), then the target appears before controller execution. With a route obligation the plan returns C(P); without one it restores B(P) or A(P) from the snapshot. Identical project history therefore changes project phase/turn solely because a task happened to exist, and one of the two results necessarily violates the declared restore snapshot.

Minimum revision:

- Replace `O?C(O):N` with one strict issuance-origin/parent-relation restoration table derived from the immutable `race_restore_snapshot`. Both route-present and route-absent arms must publish the same project/turn/boundary/epoch result; they may differ only in route versus independent presentation. Add golden vectors for every legal origin and both task-presence arms.

## Gate conclusion

The revised plan materially closes the product alias, task-preservation, reprompt, external-TCB declaration and forward activation-order findings. It still cannot execute one authoritative parallel phase, cannot perform its mandatory rollback after helper disable, and leaves checkpoint, delta, NO_PIN approval and two NEW-race branches implementation-defined or contradictory.

**Gate: NOT_READY_FOR_REDTEAM.** Revise the plan, freeze a new exact SHA, and run a fresh Plan Agent gate before commissioning the Round-5 dual red team. The next gate must mechanically redrive all seven findings above; wording-only assertions do not close them.

Only this review file was created. No plan, runtime, governance, test, project state, workflow state or downstream file was modified.
