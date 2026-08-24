# Luca routing / project steering recovery — final execution plan

> Plan ID: `LRS-20260820-016`
> Date: 2026-08-20
> Status: `PROPOSED_ONLY` — Round-18 Plan Gate returned READY_FOR_REDTEAM (0/0/0); the Round-18 routing red team returned FAIL(STALE) with 2 MAJOR, both now closed in these bytes; the baseline is re-frozen at the quiesced 2026-08-24 refs; pending a fresh Plan Agent review and Round-19 dual red team
> Mode: requirements → solution review → plan → two independent red teams → exact-SHA user handshake → isolated implementation → two independent post-reviews
> Runtime authorization: **none**. Before the exact-SHA handshake, only this audit package may change.

## 0. Outcome and authority boundary

### 0.1 Verbatim requirement chain

1. `进入luca app项目`
2. `我要你优化设置里面的交互结构。现在看觉是功能堆砌。交互体验不好，UI体验不好。`
3. `项目是muse的luca app 啊`
4. `这个你还需要问我？`
5. `继续啊，你总停干什么`
6. `我这个项目不需要触发什么skill吗？不需要走什么flow吗？`
7. `修框架。修框架是最需要注意的事情，你要从需求出发，review你的解决方案，做计划，红队对抗计划，直到握手，然后再解决，解决完以后，要review是否解决。`

The user-supplied settings screenshot is PNG 940×1704, 209,037 bytes, SHA256
`7273931d76f02ef09e1ef5178eab020903f4699a08c8f23f967003c33697cc96`. This framework plan preserves its
provenance only; if those exact bytes are unavailable when the separate UI task begins, that task requests a
reattachment rather than substituting another image.

Operational outcome:

- explicit project language can resolve product-owned aliases such as `luca app` to canonical `muse`
  without product literals in the framework;
- an interface-structure change cannot be treated as “no skill / no flow” or silently abandoned: a durable
  route obligation survives project switching, blocks mutation and Stop, and is released only after a valid
  plan/human gate or observed skill/flow dispatch plus completion/wait evidence;
- every Claude/Codex user delivery has a native, session-bound anti-replay identity obtained by lazy durable
  transcript/rollout attestation; Codex steering messages sharing one transport parent remain distinct;
- unverified prompts revoke, never inherit, prior project write authorization;
- correction, switch, deactivate, crash recovery and rollout preserve the 2026-08-11 project-isolation
  invariants; no error emits an executable-looking placeholder command;
- implementation begins only after both planning red teams pass one unchanged plan SHA and the user approves
  that exact SHA.

### 0.2 Completion definition

`FRAMEWORK_RECOVERY_VERIFIED` requires all of these:

1. the independent Plan Agent reports `READY_FOR_REDTEAM`, then two independent planning red teams report PASS
   with no BLOCKER or MAJOR against that same unchanged plan SHA;
2. the user explicitly approves that exact SHA;
3. blocking lazy-attestation timing probes pass in fresh Claude and Codex scratch sessions before any runtime
   source edit; failure returns to planning without a partial runtime change;
4. bridge, framework-v3 and downstream-alias candidate commits are created in isolated worktrees before
   post-review; reviewers inspect those exact commits, trees, generation manifest and downstream bytes;
5. every assertion, mutation and fault barrier in this plan passes;
6. after the declared one-time all-session maintenance/restart, exact reviewed hook config and generations are
   activated through one atomic pointer, not a mixed live checkout;
7. two independent post-implementation reviewers report no BLOCKER or MAJOR;
8. the original prompt chain and all negative controls pass from fresh native harness sessions;
9. unrelated framework/downstream dirt remains byte-identical and no remote push occurs;
10. the original settings-optimization task is preserved in an exact handoff and, after framework verification,
    is shown as one copyable combined native event whose project clause is exactly `进入 luca app 项目，` and
    whose task-side region is the verbatim original task. A fresh NO_PIN receiving session must resolve muse and
    preserve only the task-side bytes as `exact_task_text` in one composed event, with no second Project Gate.
    Product implementation and its own post-review remain a separate authorization.

### 0.3 Kill conditions

- `KILL-01`: this plan changes after Plan Agent `READY_FOR_REDTEAM` or either planning red-team PASS → invalidate
  every review against the old bytes and compute a new SHA.
- `KILL-02`: framework HEAD/upstream differs from the frozen framework baseline tuple below, or downstream
  HEAD/upstream differs from `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`, except for the exact reviewed linear
  framework chain `A0→B1→B2→V1→C1` and independent downstream object `D1` frozen in §13 after their
  respective named gates → produce a delta and re-review. No sibling, merge, rebuilt equivalent or
  content-similar object qualifies. The frozen framework baseline is exactly:
  - `BASELINE_HEAD=BASELINE_UPSTREAM=fd0919bb49597f1050106180bbbed21dac4aedff`,
    `BASELINE_TREE=3d383c34468249431c70fc864cc78cd772c82e1b`. The two refs are equal and are pinned
    independently; either one moving — a new commit, or a push that advances only upstream — re-fires KILL-02;
  - prior frozen ancestor `PRIOR_BASELINE_COMMIT=8e9726d8477f8a287722c09345f07182cc86d1d5`,
    `PRIOR_BASELINE_TREE=fe67c639838340beca9556e76773f0e1b7d41c2b`;
  - the intervening ancestry is exactly, in parent-to-child order,
    `c0a2efe7bfc7a32455580a349cd5d79915561573`, `c9d4185f18e14871f6f285e19baff205798be201`,
    `8e1c46d56d431d54ada9d30a3bb34d010f3e8466`, `068b9ab45d98c6fc258278e08d27388e59cd8729`,
    `36d37072ab31fdaa4fd7140f08869c60b654fa57`, `0e51ec2171c6c81de3403815339cdf304a0a3917`,
    `fd0919bb49597f1050106180bbbed21dac4aedff`;
  - the complete `PRIOR_BASELINE_COMMIT..BASELINE_HEAD` delta is exactly six files, whose `BASELINE_HEAD` blobs
    are `framework-audit/2026-08-20-recovery-handoff-review/DISPOSITION-AND-REDTEAM.md=a71725210b88f4fc15b4b3c0fd516562ea3eae47`,
    `framework-audit/2026-08-20-recovery-handoff-review/HANDSHAKE-SESSION-PROMPT.md=4662ecd884c079b533ec06fdf0fd9c918645c393`,
    `framework-audit/2026-08-20-recovery-handoff-review/REVIEW.md=4a6740fbafa9937c6a2c41a7c4febfe666d799f7`,
    `.claude/hooks/post-edit.mjs=b534aa6eabaee449b551edce41a7cf7d4c6f8d30`,
    `scripts/test-auto-open.mjs=f4719bd33599ea60acd9cc8bc1617c1173a05189` and
    `scripts/test-project-scope-guard.mjs=2d056cd674ddad28ffc7f4958fd4b0a0db3412a8`;
  - the non-audit subtree is **no longer** byte-identical to `PRIOR_BASELINE_TREE`. Concurrent sessions changed
    `.claude/hooks/post-edit.mjs` (inside the §12.1 bridge envelope and both release payload lists),
    `scripts/test-auto-open.mjs` and `scripts/test-project-scope-guard.mjs` (inside the §12.2 envelope). Every
    §10.1 g0 source receipt, byte-parity proof and envelope hash is therefore taken against `BASELINE_HEAD`
    bytes and never against any earlier tree; any prior review that cited the pre-`fd0919b…` bytes of those
    three paths is void for those paths.
  This tuple is asserted by commit-ref identity in the preflight receipt, §13 `A0` parent/ancestry and every
  rollback ancestry. The byte-identical non-audit subtree is recorded as evidence only and never downgrades
  KILL-02 to path-filtered or content identity; any further commit on either repository, including another
  audit-only one, re-fires KILL-02 and the in-flight review round is stale.
- `KILL-03`: any pre-existing tracked/untracked change overlaps an exact runtime, test, wrapper or governance
  pointer path in §12.1–12.2 → `BLOCKED_DIRTY_OVERLAP`; no stash/reset/clean/ours/theirs workaround.
- `KILL-04`: any hash-frozen audit input named by the final evidence manifest changes, or any not-yet-run
  gate's cycle-specific required-new receipt/post-review path already exists → stop. Completed failed-cycle
  receipts are immutable inputs and use different literal names. There is no blanket audit-directory exemption.
- `KILL-05`: `luca app` is not a unique project-owned alias for canonical `muse` → do not install metadata.
- `KILL-06`: fresh Claude/Codex lazy attestation cannot bind the raw hook candidate to the current durable
  native user record/terminal boundary at each tested first PreToolUse/Stop observation point; a local-mutation tool has no enforceable
  PreTool interception; an execution-evidence or approved-plan tool has no bound state-mutating PostTool
  observation; native command-only delivery cannot carry the maximum canonical controller request; or the registered Plan
  Agent invocation/result cannot be paired by one native tool-call identity across PreTool/PostTool while
  repository writes remain mechanically denied; or Stop cannot expose the bounded final-assistant projection
  needed to prove every human wait/draft was actually presented → no runtime implementation under this architecture.
- `KILL-07`: a payload/transcript/rollout schema differs materially from the frozen census → fail closed at
  attestation; never invent, sanitize or randomize an identity.
- `KILL-08`: a mutation does not turn its named test red, a fault barrier has an unclassified result, or a
  post-review finds BLOCKER/MAJOR → do not activate or land.
- `KILL-09`: migration/activation sees a live state/global/recovery lock other than the activator's own exact
  read-back activation/global owner tuple, an active old-generation session, pending/committing transaction,
  malformed state, unknown side effect, or unverifiable release tree → fail closed; never steal a lock or guess
  recovery.
- `KILL-10`: the activator cannot remove execute permission from and read-back every census-listed Claude/Codex
  consumer executable inode; any pre-C1 consumer remains live after launch inhibition; the private Codex helper
  cannot be copied, byte-verified, run with app-server parity, disabled independently, or take the exact
  rollback-only 000→0500→trust-inverse→000 transitions; or NODE/GIT/Codex/
  ps/sysctl/lsof provenance or fixed protocol cannot be frozen → activation stays fenced at B2/G0. There is no
  online, live-binary or undeclared-subprocess fallback.

## 1. Evidence and root attribution

Three independent failures produced the visible loop; none is repaired by broad keywords.

### E1 — no product-owned alias truth

The current guard matches real directory names. `luca app` is the product name while the real directory is
`muse`; no framework input asserted that identity. Root: missing downstream alias metadata.

### E2 — score zero was treated as no route

The exact settings prompt returned score-zero `STOP`; the generic semantic reminder already existed, yet the
agent concluded there was no skill/flow. Controls still route pure diagnosis to `/ux-audit` and explicit
existing-code change to `/code-recon`. Root: a model-only reminder had no durable execution gate.

### E3 — transport parent was overloaded as event identity

Codex rollout lines 60 and 63 contain distinct native messages
`msg_01a01e8d-4cfe-7430-a75b-f2e4f4955ed7` and
`msg_01a01e8d-4d7a-7b73-8cfa-35133f0ac301` under the same parent
`01a01e8c-c476-7091-b410-1eecc434f725`. The old hook consumed the parent twice and rejected both. The later
status question reused its live parent and reproduced the same rejection. Root: raw UserPromptSubmit does not
expose Codex's durable message ID, so synchronous identity selection was made at the wrong boundary.

Frozen minimal evidence is in `PAYLOAD-CENSUS.md` and `TRANSCRIPT-AUTH-EVIDENCE.md`. The inconsistent first
Claude census row is excluded; only line hashes named by the latter file are admissible.

## 2. Solution review and selected architecture

### 2.1 Rejected approaches

| Approach | Rejection reason |
|---|---|
| hard-code `luca app → muse` | leaks product data into a product-neutral runtime |
| broad `优化/UI/交互` skill triggers | over-routes color, copy, performance and simple bugs |
| force PLAN or Scene B from three words | invents a sixth Plan condition and a scene without evidence |
| stronger text hint or mandatory smoke only | the agent can ignore it and Stop without a tool |
| raw `turn_id`, prompt digest or random ID as final event ID | conflates steering, cannot distinguish identical deliveries, or defeats replay detection |
| synchronous transcript authorization in UserPromptSubmit | current native record is not guaranteed durable at that hook boundary |
| keep old grant when the new event is invalid | lets a bad new prompt write under a prior event's authority |
| allow same-parent switch from TURN_ACTIVE | an already-released tool may still write the old project; no drain proof exists |
| separate state and history files | admits consumed-without-state and state-without-ledger crash windows |
| fast-forward live hook files as activation | hook processes can load a mixed generation during checkout |

### 2.2 Selected architecture

```text
raw UserPromptSubmit
  → validate bounded transport fields only
  → atomically set prompt_gate=ATTESTATION_PENDING
  → old write authorization is immediately unusable

first security-relevant PreToolUse, every state-mutating PostToolUse, or Stop
  → bounded, no-follow current transcript/rollout attestation
  → recover native user event id + execution boundary + human origin
  → one schema-v3 state+ledger transition
  → alias / project intent + route obligation

route obligation
  → structured route receipt
  → PreTool mutation gate + Stop gate
  → SINGLE/MULTI execution, QUESTION human wait, or PLAN exact-SHA approval followed by observed Orchestrator execution

project mutation capability
  → global lease + durable mutation intent
  → side effects + immutable commit evidence
  → exact lease cleanup

stable entry shims
  → one no-follow generation pointer
  → atomically activate the exact post-reviewed generation
```

`event_id` is anti-replay identity. `boundary_id` controls execution-turn terminal/pending lifetime.
`prompt_gate` controls whether a tool may inherit project access. Project lifecycle, route obligation and
mutation intent are orthogonal fields in one atomic session document.

### 2.3 Round-4 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 approved-plan totality | §5.3 strict task/skill/parallel-skill `oneOf`, mandatory preflight/parameters/JOIN/quality, global concurrency cap, phase/final assertion bijection |
| B2 activation TCB | §10.2 explicitly frozen NODE/Codex-helper/Git/ps/sysctl/lsof external roles; no wrapper-only TCB claim |
| M1 cross-session checkpoint | §5.3 source revocation + byte-proved checkpoint + one-claim global journal/target import |
| M2 delta replan | §5.3 failure decision, delta schema, controller-derived approval, immutable predecessor/evidence lineage |
| M3 project boundary | §5.3 PLAN_PROJECT_REQUIRED before approval and exact WAITING_BOUNDARY after same/unproven approval |
| M4 activation order | §10.3 one forward tuple chain and one inverse; §10.1/DAG only reference it |
| M5 project-only NEW race | §9.2 issuance snapshot and route-present/absent controller arms |
| M6 TARGET_EXISTS task loss | §8.1 exact task-bearing PROJECT_SWITCH_REQUIRED obligation; bare SWITCH cannot erase it |
| m1 D re-presentation | §5.3 immutable primary proof plus fresh event-bound reprompt challenge |

### 2.4 Round-5 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 parallel JOIN authority | §5.3 exact work/preflight/JOIN/quality owner↔agent↔execution-contract bijections plus one-shot SUMMARY/JOIN capability |
| B2 rollback after helper disable | §10.3 durable HELPER_DISABLED tuple and exact helper 000→0500→trust-inverse→000 rollback transitions under the fence |
| M1 checkpoint identity/schema | §5.3 strict checkpoint status `oneOf`, controller-only sequence/core/checkpoint/claim H/LP identities and golden vectors |
| M2 delta authority envelope | §5.3 Plan-parity delta capability/call/result/finalizer/install identities, strict verb requests and one-shot barriers |
| M3 NO_PIN no-project Plan | §5.3 exact approval cell enters route-only PLAN_EXECUTION_PENDING with empty project roots and no project grant |
| M4 project-only D(NEW) recensus | §8.5 census crossed with `route_snapshot_kind=ABSENT|PRESENT`; ABSENT uses only independent project presentation |
| M5 NEW controller restore | §9.2 one immutable origin-snapshot restoration oracle shared by route-present and route-absent arms |

### 2.5 Round-6 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 deferred-request split schema | §5.4 owns one strict `deferred-project-request:v2` discriminated `oneOf`, including the sole project-origin and route-snapshot H/LP identities; §7 only points to it |
| B2 activation inverse frozen too late | §10.1/§13 move the complete forward/inverse activator, HELPER_DISABLED faults and review into B1 before B1/B2 freeze; V1/C1 are forbidden to modify bootstrap-TCB bytes |
| M1 delta controls in wrong route column | §8.1/§8.5 keep initial Plan approval as the sole EXACT_APPROVAL and dispatch both SHA-bound delta controls through wait-kind-checked ANSWER_OR_REVISION cells |
| M2 checkpoint Stop deadlock | §8.6 gives CHECKPOINT_PRESENTATION one exact byte-proving Stop transition to PRESENTED/TRANSFER_READY and removes it from the unconditional block set |
| M3 plan-execution verb envelopes | §5.3 defines one strict common envelope plus a closed per-verb payload/pre-state/capability/evidence/next-state table for every public verb |
| M4 post-child JOIN cannot serialize writes | §5.3 requires unconditional pairwise-disjoint canonical child writes and a distinct summary output; shared-write work is a serial dependency DAG |

### 2.6 Round-7 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 successful work/final assertions unreachable | §5.3 adds paired `record-work`; the later R9 closure adds a registered FINAL quality-gate lifecycle, after which `finalize` consumes only its verified evidence and stages the exact summary before Stop |
| B2 mandatory checkpoint unreachable | §5.3 adds capability-free `BETWEEN_WAVES` plus one mutually exclusive wave-choice capability consumed by `advance-wave` or `checkpoint` |
| M1 failure-decision wait missing | §5.3/§5.4 add PLAN_EXECUTION_FAILURE_DECISION and exact RETRY/REPAIR/SKIP/TERMINATE rows |
| M2 approved-plan snapshot overlap/invalid tombstone | §5.4 replaces phase/wave overlap with exclusive BEGIN/typed FRONTIER/DELTA_CALL/BETWEEN_WAVES/FINAL_ASSERTIONS arms; FRONTIER alone represents legal native-call + phase-completion coexistence using only declared tombstone kinds |
| M3 committed projection incomplete | §5.4 projects every begin, mixed frontier, between-wave, replan, delta-call/wait, boundary-wait, final-assertion and staged-summary subphase to one superseded predecessor/new obligation |
| M4 transfer recovery authority absent | §5.3 defines the transfer journal owner, liveness-gated recovery capability/sequence and one successor per nonterminal barrier |
| M5 helper inode frozen before creation | §10/§13 freeze helper source/construction before review; the activation journal freezes the actual private inode after creation and post-activation review attests it |

### 2.7 Round-8 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 `record-work` rejected by production surface | §9.1 derives one exact public-verb set from the §5.3 schema; `record-work` is present and omission is a build-time equality failure |
| B2 `advance-wave` rejected by production surface | the same generated set includes `advance-wave`; local and transferred positive vectors plus a deletion mutant bind it |
| B3 FINAL assertions lack native quality lifecycle | §5.3 adds FINAL_QUALITY_GATE ISSUED→IN_FLIGHT→VERIFIED with registered quality-gate PreTool/PostTool; only VERIFIED mints the summary finalizer |
| M1 MAIN_AGENT multi-tool/HITL not total | §5.3 adds a manifest-bound main-agent step DAG/cursor, one capability per tool or human wait, accumulated evidence and distinct `complete-main-work` before quality |
| M2 failure drain misses PHASE_COMPLETION | §5.3 atomically revokes every native/non-native frontier authority into a strict suspended-successor union; RETRY/SKIP alone may reissue exact records |
| M3 checkpoint-display project change contradictory | §5.4/§8 choose the smaller policy: any pre-claim project intent cancels the checkpoint and routes through a fresh ordinary replan/project operation; the D snapshot arm is removed |
| M4 transfer recovery journal/notice not total | §5.3 defines a four-arm TransferJournal oneOf, H/LP state hashes and one successor per arm; §8 adds a source/target recovery-notice overlay and exact Stop proof |

### 2.8 Round-9 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 ordered public-verb SSOT rejects its own table | §5.3 freezes one canonical 22-member manifest order, generates the transition-table row order and production dispatcher from it, and makes an adjacent-row swap a biting build mutant |
| B2 parallel-child parameter wait is not exclusive/addressable | §5.3 makes any parameterized parallel group an exclusive outer wave, freezes a child-addressable lexicographic parameter queue, and permits child work only after every preflight and queued answer is terminal |
| B3 phase SKIP revives work inside the waived phase | §5.4 splits suspended successors into FAILED_SCOPE, SAME_PHASE and OTHER_PHASE; PHASE SKIP tombstones the first two and may reissue only OTHER_PHASE authority |
| M1 mandatory Orchestrator phase confirmation absent | §5.3 derives a strict post-wave phase-confirmation queue for MAIN_AGENT skill and Supervisor/Hierarchical phases; no later wave/final gate issues before its exact human receipts complete |
| M2 TransferJournal owner/capability preimages ambiguous | §5.3 defines strict owner/recovery-capability oneOf objects, nonrecursive started-state semantics, domain-separated H/LP hashes and null/golden arms |
| M3 recover actor identity ambiguous | §5.3 replaces the shared transfer root with per-verb oneOf roots; recover binds an exact source-or-target actor sid/event/boundary and the capability binds the same actor |
| M4 preflight override absent | §5.3 adds a manifest-policy-bound PREFLIGHT_OVERRIDE wait with distinct retry/override decisions; override stores evidence and continues the same phase without fabricating PASS or waiving it |
| M5 target deferred-claim cleanup has no strict receipt | §5.3/§7 define the claim hash, immutable source CANCELLED retention, stable no-follow source read, target CAS and one bounded non-authorizing cleanup receipt |

### 2.9 Round-10 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 parameter answers are irreversible hashes | §5.3 stores each answer as one bounded `CollectedParameterAnswer` with canonical base64 bytes, decoded length/SHA, native event/boundary and closed-option ID; queue, wait snapshot, work input and Work Agent prompt bind the same complete objects |
| B2 TARGET_EXISTS product is incomplete and double-valued | §8.1 adds the byte-preserving `PLAN_EXECUTION_FAILURE_DRAIN` BUSY row, removes `PLAN_EXECUTION_TRANSFER_READY` from the terminal row, and generates exactly one row for every closed route status |
| M1 cancelled checkpoint has no authoritative retained store | §5.3/§7 move the complete CANCELLED checkpoint into one bounded top-level source-session archive in the same rename that replaces the live route; target cleanup reads only that immutable archive and pre-claim cancellation never writes the transfer journal |

### 2.10 Round-11 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 MAIN_AGENT human answer has only a SHA | §5.3 uses one strict bounded `MainAgentHumanAnswer` with canonical bytes, length/SHA, event/boundary and option ID in the DONE step, evidence root, successor input/prompt and every crash/scope projection |
| B2 archive-full cancellation leaves PRESENTED claimable | §5.3 admits a checkpoint only after reserving one archive slot and worst-case cancellation bytes, forbids ROTATION/cancellation markers at claim, and makes `ROTATION+PRESENTED` schema-invalid |
| M1 retained parameter answers can exceed 2 MiB | §5.3 adds manifest-derived `state_capacity_admission` at Plan finalization/approval over all question/HITL maxima, canonical expansion, duplicated snapshots, cancellation and deny reserves; cap/cap+1 Plans are rejected before execution |

### 2.11 Round-12 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 transferred source gives NEW_TASK two successors | §8.1/§8.6 make `PLAN_EXECUTION_TRANSFERRED` one permanent source-session terminal: every route event, project intent and parent relation preserves the immutable transfer tombstone, emits only the derived `NEW_SESSION_REQUIRED` diagnostic with command null, and requires a fresh native session for another task; §14 generates the full product and §15 kills any restored `PLACE_NEW` arm |

### 2.12 Round-13 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 terminal transfer was below semantic creation/TARGET_EXISTS | §5.2/§8.1 put one `PLAN_EXECUTION_TRANSFERRED` pre-creation short circuit immediately after attestation and before signal placement, explicit-new-task supersession, TARGET_EXISTS or the ordinary project matrix; the existing `route_obligation` remains the immutable transfer tombstone, while generated signal-only/combined/census/parent fixtures and a bypass mutant prove no replacement live obligation can be minted |

### 2.13 Round-14 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 status-only transfer terminal bypasses nonterminal journal recovery | §5.2/§5.3/§8 freeze one order: attestation and identity/stream/replay guards → matching TransferJournal locks+census/notice/recovery overlay → exact fully validated COMMITTED read-back with nonempty commit receipt → transferred-source terminal → remaining capacity/semantic/TARGET_EXISTS/project routing; SOURCE_TOMBSTONED remains recovery-only even though its underlay route arm is already TRANSFERRED |

### 2.14 Round-15 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 transfer overlay has no event-257 successor | §5.3/§6.3/§7/§8 make one fixed-size per-session hash-chain `transfer_security_ledger` mandatory at schema-v3 bootstrap and advance it across sequential journals for every nonterminal transfer event plus COMMITTED-source terminal event; `ledger_admission=AVAILABLE|FULL` is derived before mutation, FULL rotates ordinary authority but preserves the dedicated recovery/terminal lane, and COMMITTED target alone follows the ordinary 256/event-257 oracle |

### 2.15 Round-16 Plan Gate closure map

| Failed-gate item | Normative closure |
|---|---|
| B1 framework ref baseline had drifted off the frozen `8e9726d…` | §0.3 KILL-02, §3 preflight receipt, §13 `A0` parent/ancestry and every rollback ancestry now freeze the actual baseline tuple by commit-ref identity together with prior ancestor `8e9726d…`/tree `fe67c63…`, the exact parent-to-child audit-only ancestry and its three-blob delta; identity remains commit-ref and no runtime-tree-only exception exists |
| B2 transfer recovery had no event-bearing / no-new-event product | §5.3 adds the strict total `transfer_invocation_kind` discriminator (six kinds, seven ordered disjoint predicates) ahead of the outcome table: only `SCAN_DRAIN_EVENT`/`NEWLY_ATTESTED_EVENT` append exactly one `TransferSecurityEvent`, every no-new-event kind is append-free, `RECOVERY_CAPABILITY_BUSY`/`RECOVERY_OWNER_BUSY` are deleted, an event-bearing kind atomically rotates any stale capability onto the current event under a strictly monotonic `recovery_sequence`, and §6.1/§7.1/§8.2/§8.6/§14/§15 carry the identical partition |

### 2.16 Round-17 Plan Gate outcome and round invalidation

| Item | Disposition |
|---|---|
| Round-17 gate verdict | `READY_FOR_REDTEAM — 0 BLOCKER / 0 MAJOR / 0 MINOR` against plan SHA `87d56f6c7722ca73ba4503bdab20630fc706fc01e443c400113070eca621b0ba`; no plan defect was found and none is carried forward |
| Why Round 17 did not dispatch | framework `HEAD`/upstream advanced from `8e1c46d…` to `068b9ab…` at 2026-08-21 10:38:41 +0800, inside the review window and before the receipt was written; by KILL-02 and the round-staleness rule the whole round is stale regardless of its verdict, and no red team may bind that SHA |
| Closure | the §0.3 baseline tuple is re-frozen at `BASELINE_COMMIT=068b9ab…`/`BASELINE_TREE=6894a706…` with the extended parent-to-child ancestry, the cycle advances to R18, and `PLAN-AGENT-REVIEW-R17.md` joins the immutable prior inputs unmodified. The constraint was not downgraded: an audit-only commit still re-fires KILL-02 |

### 2.17 Round-18 closure map and round invalidation

| Item | Normative closure |
|---|---|
| Round-18 Plan Gate | `READY_FOR_REDTEAM — 0/0/0` against plan SHA `063d5dca…`; no plan defect carried forward from that gate |
| Routing red team MAJOR-1 — asymmetric trailing-content grammar | §4.2 bullet 1 now carries the same clause-terminal / closed-set trailing-content contract as the `打开|继续` bullet whenever the target is a metadata alias, canonical directory IDs keep the looser rule, and `进入 luca app 项目页面看看` / `切到 luca app 项目功能` / `回到 luca app 项目的登录流程` are frozen negative examples |
| Routing red team MAJOR-2 — `别`-form structural negation unrecognized | §5.1 structural negation is now the closed generated set `(不\|别\|不要\|不用\|无需\|不必) × (改\|动\|调整\|变) × 结构` plus the fixed forms, matching the negator alternation §4.2 already declares authoritative; `别调整设置结构` and `帮我优化下设置页面，别动结构，其他随便你改` are frozen negative fixtures and the §14 `R-SIGNAL` corpus enumerates the generated set |
| Why Round 18 did not complete | framework refs advanced twice inside the review window: `36d3707…` at 2026-08-21 14:57:28 and `0e51ec2…` at 15:01:42, leaving `HEAD` one unpushed commit ahead of upstream. `0e51ec2…` is **not** audit-only — it modifies `.claude/hooks/post-edit.mjs`, a path inside this plan's own §12.1 envelope. The round is stale by KILL-02 regardless of merits, and the transaction lane was never dispatched against those bytes |
| Closure | the §0.3 baseline is re-frozen as the independently pinned pair `BASELINE_HEAD`/`BASELINE_UPSTREAM`, now equal at the quiesced 2026-08-24 ref `fd0919b…`, with the extended ancestry and the corrected six-file delta; the false "non-audit subtree byte-identical" claim is withdrawn, and the cycle advances to R19. `PLAN-AGENT-REVIEW-R18.md` and `REDTEAM-ROUND-18-ROUTING.md` join the immutable prior inputs unmodified. No constraint was downgraded |
| Why Round 19 can converge | the two concurrent sessions that produced `36d3707…`, `0e51ec2…` and `fd0919b…` finished on 2026-08-21; the repository has been quiescent since, with `HEAD` equal to upstream and 0 ahead / 0 behind. R19 freezes against that quiesced pair |

## 3. Blocking preflight: payload and lazy-attestation timing

Before an implementation worktree is created, run capture-only probes against unmodified production code plus
an isolated collector:

1. Claude Code 2.1.237: typed and queued same-parent human delivery, every proposed single-origin and
   wrapper+origin shape, bounded image+text, peer/meta, and both observed terminal-order variants; capture raw
   UserPromptSubmit, then at first PreToolUse and Stop record whether the exact current transcript record is
   present. A shape not positively observed here is excluded from the production allowlist, not deferred to L2.
2. Codex CLI 0.148.0: a fresh first prompt whose raw `transcript_path` may be null, one parent prompt, one queued
   steering prompt, two identical-text steering deliveries, then first Bash/Stop; capture raw hook records,
   null→published source transition and rollout native message IDs.
3. Collector records raw stdin bytes, CLI/version/command, transcript stat, bounded tail hash, matched native
   record, source offset/ordinal and before/after timing. It never mutates project state.
4. In isolated scratch config, invoke the registered Plan Agent once in each harness and census its PreTool and
   PostTool payloads, native tool-call identity, registered-agent identity, result bytes and effective write
   sandbox. The probe writes only its disposable scratch result and never a repository path.
5. In both native harnesses, run one ordinary SINGLE step and one approved-plan phase through PreTool/PostTool,
   steer between call and PostTool using scratch hooks, and exercise every future route/plan-execution verb
   against one disposable scratch carrier/CAS oracle with minimum and maximum canonical base64url argv requests.
   The later manifest parser must be byte-identical to that reviewed carrier module or L0 is rerun. Separately
   freeze the native consumer executable/mode/process-path
   census and paused-B2-config negative required by §10.3.

PASS requires:

- UserPromptSubmit may lack the durable current record or, for Codex, the source path itself; this is expected
  and proves why it only revokes/queues. The bounded U-shape census must prove absent→one fresh sid source;
- at each tested first PreToolUse/Stop observation point, every pending human candidate maps in order to exactly
  one native current record; the registered Plan Agent and execution-evidence paths additionally expose the
  exact paired PostTool record required by their capability contracts;
- Claude binds each **L0-observed and manifest-enumerated** current delivery shape by exact `sessionId + cwd + promptId + record.uuid +
  origin.kind=human + promptSource(typed|queued) + non-meta + role=user + canonical text`;
- Codex binds one adjacent pair: `response_item/message/role=user/msg_*` immediately followed by
  `event_msg/item_completed/UserMessage`; filename, session_meta id/session_id/cwd, thread id, turn id and both
  canonical text projections must agree with the pending candidate;
- each harness freezes a version-specific durable terminal/aborted marker and its order relative to Stop. The
  contract supports terminal-before-Stop or terminal-after-allowed-Stop without treating Stop itself as proof;
  queued/in-turn deliveries classify `SAME`, while only a marker-proven next execution turn classifies
  `DIFFERENT_DRAINED`;
- peer/meta, cross-session replay, an earlier-than-cursor record, direct forged stdin and fake
  `LUCA_ACTUAL_HARNESS` cannot attest.
- the exact registered Plan Agent call is visible before execution, its exact result is visible afterward under
  the same native tool-call identity, and an attempted repository write from that agent is denied.
- ordinary and approved-plan PostTool payloads expose the same native call ID and invoke lazy attestation before
  any state advance; all controller verbs receive only `{command}`, decode the canonical argv carrier, verify
  its SHA/EOF and perform the expected one-shot CAS at the largest admitted size.
- Stop exposes an exact bounded final-assistant-message byte projection in both harnesses. It must prove every
  persisted human question/plan and response-only completion draft was actually presented; if absent, KILL-06
  fires rather than allowing an unobservable WAIT or inferred completion.
- `L0-PREFLIGHT-RECEIPT.json` freezes the complete §0.3 KILL-02 baseline tuple by commit-ref identity —
  `BASELINE_COMMIT`/`BASELINE_TREE`, `PRIOR_BASELINE_COMMIT`/`PRIOR_BASELINE_TREE`, the parent-to-child
  audit-only ancestry, its three-blob delta and the downstream commit/upstream — read back from both
  repositories at receipt time. Any mismatch against §0.3 fires KILL-02 before a worktree exists; a
  byte-identical non-audit subtree is never accepted as a substitute for commit-ref identity.

If either harness cannot satisfy this gate, `KILL-06` fires and the plan returns to architecture review. Model
authentication being unavailable is not a waiver; a valid native session is required.

## 4. Project alias contract

### 4.1 Ownership and canonical census

Optional downstream file `<PROJECTS_ROOT>/<canonical>/.luca/project.json`:

```json
{"schema_version":1,"canonical_project":"muse","aliases":["luca app"]}
```

The framework contains no `luca app → muse` literal. The route-only census considers only direct real directory
children of `PROJECTS_ROOT` that pass `canonicalProjectIdentity`; a manifest self-binds byte-for-byte to its
directory name and the resolver returns only that canonical ID. It does not alter link/state identity helpers.

Use a bounded `opendir` iterator, never eager `readdirSync`:

- root entry cap 512; observing entry 513 returns `INCOMPLETE(ROOT_ENTRY_CAP)` before any alias result;
- validated real-project cap 256; observing project 257 returns `INCOMPLETE(PROJECT_CAP)`;
- manifest 8,192 bytes; aggregate manifest bytes 262,144; 16 aliases/project; 2,048 total;
- raw and normalized alias: 2–80 Unicode code points and at most 256 UTF-8 bytes;
- normalization: NFKC → Unicode lowercase → Unicode whitespace collapse to ASCII space → trim;
- reject empty, Unicode Cc/Cf (including bidi/zero-width), slash/backslash, duplicate JSON keys, unknown keys,
  non-string members, normalized duplicates/collisions, alias equal to a canonical ID, or multi-owner alias;
- reserved values include every grammar/meta noun: `app, application, project, product, system, software,
  项目, 工程, 应用, 产品, 系统, 软件, 页面, 界面, 功能`.

Safe reads require non-symlink `.luca` and manifest, canonical containment, `O_NOFOLLOW`, regular-file fstat,
limit+1 read, duplicate-key-aware parsing, and dev/ino/size recheck. Missing metadata is canonical-only valid;
any present malformed/overflowed manifest makes the whole alias registry `INCOMPLETE` so a hidden collision
cannot be ignored. Canonical selections still work under `INCOMPLETE`; non-canonical explicit selection returns
`NEEDS_CONTEXT(alias_registry_incomplete)`, command null.

### 4.2 Executable selection grammar

Only an affirmative project-selection clause outside quotes/backticks/report/example spans authorizes aliases.
Canonical directory IDs may use the optional noun shown below; a metadata alias requires an adjacent
`项目|工程` marker unless it is inside the explicit correction forms:

- `进入|切换到|切到|回到|转到 <target> [项目|工程]`; when `<target>` is a metadata alias rather than a
  canonical directory ID, the adjacent marker — or the alias itself when the optional marker is absent — must be
  clause-terminal except for a bounded polite particle (`啊|呀|吧`), and a following possessive/content token from
  the same closed set `的|里|中|下|报告|登录|设置|任务|功能|页面` makes the clause non-authorizing. A canonical
  directory ID keeps the looser rule because §4.1 already treats a canonical name as lower-ambiguity than a
  product-owned alias; the two bullets therefore share one trailing-content contract for aliases and differ only
  on canonical targets;
- high-ambiguity `打开|继续 <target> 项目|工程` requires the adjacent noun to be clause-terminal
  except for a bounded polite particle (`啊|呀|吧`); a following possessive/content token from the closed
  set `的|里|中|下|报告|登录|设置|任务|功能|页面` makes it non-authorizing;
- correction `项目|工程 是|为|:|： <target>`;
- possessive correction `项目|工程 是|为 <canonical> 的 <alias>` authorizes only when both sides
  independently resolve to the same canonical project; disagreement is `multiple_project_targets`;
- direction `从 <source> [项目|工程] [切换] 到 <target> [项目|工程]`; only target authorizes;
- creation is separate and requires explicit `新建|创建 <target> 项目|工程`.

Clause boundaries are start/end and `，,。；;！!？?\n`. Ignore quoted/backticked spans. A negator
`不要|别|不用|无需|不必|不是` before the directive cancels it. A clause is non-authorizing when a
pre-directive epistemic/question token (`如何|怎么|怎样|请告诉我|能不能|是否|要不要`) or report/example
token (`比如|例如|示例|测试短语|文档写着|引用|假设`) scopes the directive.

Scan every occurrence. Canonical and alias mentions collapsing to one target are accepted; distinct undirected
targets return `NEEDS_CONTEXT(multiple_project_targets)`. With a complete registry, an unknown explicit
selection returns `NEEDS_CONTEXT(alias_not_found)`, never STOP or create fallback. Required examples include:

- `进入luca app项目` → canonical `muse`;
- `项目是muse的luca app啊` → one canonical `muse` target; `项目是crm的luca app` → conflict, command null;
- `从 luca app 切换到 crm 项目` → `crm` only;
- `打开 luca app` and `继续 luca app 的登录流程` → no project selection;
- `进入 luca app 设置` and `打开 luca app 项目报告` → no project selection;
- `进入 luca app 项目页面看看`, `切到 luca app 项目功能` and `回到 luca app 项目的登录流程` → no project
  selection; the trailing-content tokens that disarm `打开|继续` disarm this family too for an alias target,
  while `进入 muse 项目页面` stays governed by the looser canonical rule;
- `请告诉我怎么进入 luca app 项目` and `测试短语：进入 luca app 项目` → no selection;
- `进入 luca ap 项目` with complete registry → `alias_not_found`, command null.

## 5. Semantic signal and durable route obligation

### 5.1 Non-scoring signal

The exact original settings prompt keeps its old route score and deterministic STOP class, but an affirmative
single clause may set `semanticRouteAxis=interface_structure_change` only when it contains three distinct
evidence spans:

1. change: `optimize/reorganize/redesign/restructure/refactor/split/regroup` or
   `优化/重组/重构/改版/重新设计/拆分/归组/调整`;
2. interface: `page/screen/settings/preferences/UI/interface/interaction/layout/sidebar/navigation` or
   `页面/界面/设置/偏好设置/交互/布局/侧栏/导航`;
3. structure: `feature pile-up/hierarchy/information architecture/grouping/crowded/hard to find` or
   `功能堆砌/层级/信息架构/分组/拥挤/很难找/难找/找不到/结构`.

Tokens use frozen Unicode-aware boundaries. One span cannot satisfy two legs; legs cannot aggregate across
clauses. Negated, quoted, report/example and explanatory-question clauses do not count. The signal contributes
zero complexity points, assigns no scene/skill/flow and does not alter the five authoritative Plan conditions.

Negation is structural, not a generic nearby `不`. In the same operative clause, the structure leg is disabled
when its matched span is governed by one member of the closed generated set
`(不|别|不要|不用|无需|不必) × (改|动|调整|变) × 结构` — the same negator alternation §4.2 already declares
authoritative, so `别动结构` and `别调整结构` are recognized exactly as `不动结构` and `不调整结构` are — together
with the fixed forms `结构不变|保持结构不变|结构不动|结构别动|而非结构|不是结构问题`. The admitted set is exactly
this enumeration; no generic negation heuristic and no other negator/verb pair is admitted, and the two negation
grammars in this document share one negator alternation with no unexplained asymmetry; an adversative color/copy/performance request followed by one of these
forms cannot borrow `调整` as the change leg. A negator scoped only to another leg does not erase a later
affirmative structural directive. Fixtures pin `调整设置里的颜色但结构不变` negative, `别调整设置结构` negative,
`帮我优化下设置页面，别动结构，其他随便你改` negative on its structure leg, `颜色不改，重组设置分组`
positive, every deletion of one generated negator member red, and quote/report/question variants inert.

### 5.2 Obligation creation and persistence

After lazy human attestation and the identity/stream/replay failure guards, but before ordinary ledger capacity,
any source-terminal, signal,
supersession, TARGET_EXISTS or ordinary project-matrix cell, run the matching TransferJournal census/recovery
overlay from §5.3 under `plan-transfer-global → lexical source/target session locks`. PREPARED,
TARGET_PUBLISHED and SOURCE_TOMBSTONED are nonterminal even when the source underlay already has
`route_obligation.status=PLAN_EXECUTION_TRANSFERRED`: LIVE returns only BUSY, UNPROVABLE returns only its bound
recovery notice, and PROVEN_DEAD returns only its recovery capability. Each stops composition. An active notice
uses the same overlay. A missing, malformed, wrong-session, wrong-generation or hash-invalid journal beside a
TRANSFERRED underlay is `STATE_TRANSITION_INVALID(TRANSFER_JOURNAL_PROOF_MISSING)`: preserve the underlay/project
bytes, record INVALID_PROOF only when its strict preallocated transfer ledger is valid, emit command null, deny
ordinary Stop/scope and never infer commit. A missing/malformed accumulator is malformed session state handled
before attestation and cannot be “repaired” by inventing a ledger.

Only an exact locked read-back of the matching COMMITTED arm makes
`committed_transferred_source=true`. The journal must pass its strict schema/H/LP checks with state_sequence=3,
matching generation/checkpoint/source_sid/target_sid, null controller owner and recovery capability, matching
source tombstone and target publication receipts, and nonempty `commit_receipt_sha256_or_empty`; the source
TRANSFERRED target identity/target-state hash must equal that committed evidence. After this proof and before
signal placement, supersession, TARGET_EXISTS or the project matrix, apply the source-terminal check. Semantic
parsing may classify the event only to select the bounded diagnostic text; the same schema-v3 rename preserves
the complete existing `route_obligation` as the immutable transfer tombstone and preserves project state,
records only `COMMITTED_SOURCE_TERMINAL` in `transfer_security_ledger` (ordinary ledger unchanged), presents
only `TERMINAL_DIAGNOSTIC` with UNVERIFIED one-shot projection status, emits command null, and stops composition. No signal, explicit new task,
combined project/task event, target census, parent relation or project intent can create, replace, cancel or
supersede that object. A fresh native session is the only route for later work. This is the sole terminal-source
pre-creation short circuit and is generated from the locked COMMITTED proof, not status alone or a late table override.

Only after lazy human attestation, the journal/recovery overlay, terminal check and applicable ordinary ledger
capacity gate, and only when none stops composition, the signal creates in the same schema-v3 rename:

```text
route_obligation:
  schema_version: 1
  obligation_id
  source_event_id / source_boundary_id
  exact_task_text / exact_task_sha256 / prompt_sha256
  status: PENDING | DEFERRED_BY_PROJECT_CHANGE | RESUMED |
          PLANNING_PENDING | PRESENTATION_PENDING | WAITING_HUMAN | WAITING_PLAN_APPROVAL |
          PLAN_REVISION_REQUIRED |
          PLAN_EXECUTION_WAITING_BOUNDARY |
          PLAN_EXECUTION_PENDING | PLAN_EXECUTION_ACTIVE | PLAN_EXECUTION_FAILURE_DRAIN |
          PLAN_EXECUTION_WAITING_HUMAN |
          PLAN_EXECUTION_REPLAN_PENDING | PLAN_EXECUTION_DELTA_PRESENTATION_PENDING |
          PLAN_EXECUTION_WAITING_DELTA_APPROVAL | PLAN_EXECUTION_WAITING_DELTA_BOUNDARY |
          PLAN_EXECUTION_CHECKPOINT_PRESENTATION |
          PLAN_EXECUTION_TRANSFER_READY |
          PLAN_EXECUTION_TRANSFERRED |
          PLAN_EXECUTION_COMPLETE_PENDING_STOP |
          EXECUTION_PENDING | EXECUTION_WAITING_BOUNDARY | EXECUTION_ACTIVE | EXECUTION_COMPLETE_PENDING_STOP |
          SATISFIED |
          CANCELLED | SUPERSEDED
  project: {kind: NO_PIN|BOUND, epoch_counter, canonical?, realpath?, dev?, ino?}
  provenance: ORIGINAL | PROJECT_REBOUND        # strict oneOf defined in §5.3
  signal: {axis, three distinct evidence spans}
  continuation_context?                         # exact current correction/answer segment; never replaces base task bytes
  receipt_challenge / receipt? / presentation? / wait? / plan_capability? / plan_result? / plan_result_finalization? /
  finalize_capability? / plan_admission? / plan_execution? / execution_selection? / execution_capability? /
  execution_tool_capability? / scope_resume_snapshot?
```

Creation placement is an overlay evaluated after the terminal-source check and before the ordinary project matrix:

- in clean N/A/C/B, create PENDING unless the same event also creates SWITCH_ONLY(SWITCH/NEW), in which case
  create DEFERRED_BY_PROJECT_CHANGE bound to that exact tx/target/op and a new-task
  `PENDING/CLASSIFY_ISSUED` scope-resume snapshot;
- if an exact SWITCH_ONLY(SWITCH/NEW) already exists, a signal-only event with **no** project directive may
  preserve its tx/epoch/command and create DEFERRED_BY_PROJECT_CHANGE bound to that immutable core target/op
  with the same new-task scope-resume snapshot.
  A `NEW_TASK_SIGNAL_WITH_PROJECT` event may do so only when its canonical `{target,op}` exactly equals the
  immutable core. This covers settings-task steering after alias selection without allowing a task for another
  project to ride the in-flight capability;
- if an immutable SWITCH/NEW core is already MUTATION_COMMITTING, COMMIT_CLEANUP_PENDING or RECOVERY_REQUIRED,
  the same two admission cases apply. Only then append `ACCEPTED_ROUTE_ONLY_BUSY` and create
  DEFERRED_BY_PROJECT_CHANGE as an outer revision without changing any project/core byte. Transaction CAS must
  carry it forward; rollback-before-commit restores the exact snapshot byte-for-byte (therefore a new-task
  `PENDING/CLASSIFY_ISSUED` snapshot remains PENDING and receives no execution capability), while committed
  cleanup preserves DEFERRED on B for the later PROJECT_CHANGE_COMMITTED projection;
- a combined event whose canonical target or operation differs from an existing SWITCH/NEW capability/core is
  appended as `REJECTED_BUSY`. It does not supersede the old obligation, create a new obligation, change any
  route/project/core byte or emit a command. The bounded diagnostic tells the user to retry after the exact
  transaction finishes;
- a signal arriving under a DEACTIVATE capability/core or unknown transient cannot choose whether to cancel that
  operation: append ordinary REJECTED_BUSY, create no obligation, and issue a non-executable retry diagnostic.

If a non-TRANSFERRED live obligation already exists, explicit-new-task supersession happens atomically **after**
the placement admissibility check; a rejected BUSY event cannot erase it. The immutable TRANSFERRED tombstone
never reaches this rule. Status chatter never creates or replaces one.

There is one closed same-event exception to the ordinary mixed-intent rejection:
`NEW_TASK_SIGNAL_WITH_PROJECT`. After quote/report/negation filtering, it requires exactly two independent
operative regions: one clause contains exactly one accepted SWITCH/NEW directive and one canonical target with
no task residue; the other is one contiguous task-side region containing exactly one §5.1 three-span structural
task directive plus any adjacent non-operative explanation/constraint clauses and no project/control token. A
verified wait control, task cancel/correction, second target, second task, shared clause or leftover operative
residue makes the whole event ROUTE_AMBIGUOUS. The §8.1 NEW+EXISTING target guard is one closed early result: it
may supersede an old task only by atomically publishing the exact non-authorizing PROJECT_SWITCH_REQUIRED
obligation, never by dropping the task. Otherwise, only after the target-existence and transient target/op
admissibility checks succeed does the route transition supersede any old live task and feed the unique project
intent to the project matrix in the same state rename: an S result creates the new
obligation as DEFERRED bound to that exact tx; a D-only result preserves the task and D but enters
`PRESENTATION_PENDING` for the §5.3 `PROJECT_SCOPE_DRAIN_REQUIRED` wait, with no route or project
capability; an exact SWITCH/NEW transient may accept only the target/op-identical §5.2 route-only
outer revision. No
controller command is formatted until this composed state is read back. This is the sole same-event path for
`进入 luca app 项目，我要你优化设置里的交互结构，功能堆砌。`; generic NEW_TASK + project remains
ambiguous.

For a signal-only event with no project/control directive, `exact_task_text` is the complete bounded decoded
human prompt as raw UTF-8 bytes—not merely the clause that supplied the three signal spans. This preserves every
adjacent problem statement, rationale and constraint, including the original `功能堆砌。交互体验不好，UI
体验不好。` bytes. For `NEW_TASK_SIGNAL_WITH_PROJECT`, the closed grammar must identify exactly one
contiguous task-side raw region containing the structural clause and every adjacent non-project
explanation/constraint; `exact_task_text` is that full region after the §5.4 reversible
normalized-view→raw-span projection and never includes the project clause or its delimiter. If removing the
project clause would leave two non-empty task regions, or if any task/project/control residue cannot be assigned
uniquely, the combined event is ROUTE_AMBIGUOUS. For a combined event, the full raw input is never executable
task text; its SHA and authenticated source offsets remain evidence. Ambiguous/non-contiguous projection rejects
the signal.
Exact task text is bounded to 262,144 UTF-8 bytes; a larger candidate enters durable deny with
`OBLIGATION_TEXT_TOO_LARGE`.
One continuation context is bounded to 65,536 UTF-8 bytes and included in the 2 MiB aggregate; a second
substantive correction requires ordinary CORRECTION replacement under its own event and preserves the prior
context as superseded evidence rather than building an unbounded list.
`obligation_id = H(LP("route-obligation:v1") || LP(session) || LP(source_event) || LP(source_boundary) ||
LP(prompt_sha256) || LP(exact_task_sha256) || LP(project.kind) || LP(project.canonical_or_empty) || LP(project.realpath_or_empty) ||
LP(decimal_dev_or_empty) || LP(decimal_ino_or_empty) || LP(decimal_epoch_or_empty))`.
A later explicit new task atomically marks an old non-TRANSFERRED obligation SUPERSEDED;
only explicit `取消这个任务|不做了` marks it CANCELLED. Status/report chatter does neither.

For a combined project-switch + structural task, status is `DEFERRED_BY_PROJECT_CHANGE`; only the exact switch
transaction is mutation-allowlisted. Successful project commit and cleanup preserve the obligation. An
unconsumed SWITCH_ONLY blocks Stop; only the exact COMMITTED_CHANGE presentation-proven boundary may Stop once.
On the first `DIFFERENT_DRAINED` delivery that is not exact task cancel, an explicit independently classified
new task, or a project-operation revision, PROJECT_CHANGE_COMMITTED runs **before** ordinary route
classification: the old object becomes superseded evidence and a new project-bound
PENDING/CLASSIFY_ISSUED obligation receives the byte-identical task text. Bare `继续|接着|继续做` then has no
extra content; status chatter preserves the new obligation; and substantive task-relative text is processed in
the same rename as strict
`continuation_context={event_id,boundary_id,kind:CORRECTION|ANSWER,raw_base64,utf8_length,sha256}` for that new
obligation. The next receipt/Plan/execution input receives base task and context as distinct authenticated
fields; neither concatenation nor replacement may lose the original bytes. It never changes the old object to
RESUMED or requires a second continue. A project correction received while TURN_ACTIVE
is stored separately as `deferred_project_request`; it never overloads a semantic obligation.

### 5.3 Route receipt and mechanical gates

`scripts/route-receipt.mjs classify|begin-execution|complete-execution|finalize-plan` receives one strict JSON
object of at most 65,536 UTF-8 bytes through the only payload carrier actually present in both harnesses:
the Bash `tool_input.command` argv. The exact vector is
`<absolute frozen node> <manifest route-receipt> <verb> --request-b64 <canonical_base64url> --request-sha256 <64hex>`.
`canonical_base64url` uses RFC 4648 URL-safe alphabet `[A-Za-z0-9_-]` with no padding, whitespace or quoting;
the controller rejects duplicate/reordered/missing flags, any other argv, encoded cap+1, decoded cap+1,
non-canonical tail bits, a canonical re-encode mismatch or decoded SHA mismatch. It reads stdin with cap 1 and
requires immediate EOF, so pipe/heredoc/redirection/env/temp-file transports remain forbidden. L0 must prove
the largest admitted vector through native Claude and Codex for all four verbs; an observed command/argv cap
below the contract fires KILL-06 and returns to architecture rather than truncating the request. Evidence
strings are at most 4,096 bytes each / 32,768 aggregate, names at
most 128 bytes, the single question at most 4,096 bytes, and unknown arrays/keys reject. Its
one-shot `receipt_id = H(LP("route-receipt:v1") || LP(generation) || LP(session) || LP(obligation) ||
LP(current_event) || LP(current_boundary) || LP(decimal receipt_sequence) || LP(execution_policy_sha256))`;
the monotonic receipt sequence is persisted and never reused. It must bind session, generation, obligation, source event/boundary, current event/boundary,
receipt ID, current canonical binding/inode/epoch (or NO_PIN), and the active generation manifest's normalized
Plan-condition/skill-routing/plan-result-schema/execution-policy SHAs plus the exact optional continuation-context
SHA, and include:

- `scene` (`A|B|C|D|NOT_APPLICABLE`) plus evidence/source;
- selected skill/flow names, their exact manifest execution-contract IDs, and why each applies;
- all five authoritative Plan conditions as explicit booleans plus evidence;
- one result: `PLAN | SINGLE | MULTI | QUESTION`;
- for QUESTION, the one blocking question.

Result selection is total: any true authoritative Plan condition requires PLAN; with all five false, exactly one
complete safe registered contract permits SINGLE/MULTI; with all five false but missing required input or no
unique safe contract, the only result is QUESTION. The semantic signal is evidence that a route decision is due,
not a sixth condition and not a tie-breaker.

The booleans are evidence echoes, never caller authority. The manifest member
`.claude/skill-os/plan-condition-policy.json` is a reviewed normalization of the authoritative Plan Agent
trigger table and is parity-checked against its instruction SHA. Under the session lock the controller derives
`lower_bound_vector={files_3_plus,subagents_2_plus,phase_dependency,irreversible,explicit_plan_request}` from the
authenticated task plus the unique registry candidate: canonical create/modify file templates force condition
1 at count ≥3; distinct child-agent contract IDs force condition 2 at count ≥2; a non-empty step/phase
dependency edge forces condition 3; any manifest operation class `GIT_MUTATION|OVERWRITE|DELETE|EXTERNAL_SEND|
DEPLOY|ACCOUNT_OR_PERMISSION_CHANGE` forces condition 4; and the closed affirmative full-input planning grammar
forces condition 5. Condition 2 alone is masked only for an exact manifest-listed internal-HITL orchestrator
whose reviewed pre-fan-out gate is present; `/auto` is the exact named base case, and the current reviewed
exception IDs are frozen from the authoritative contract rather than inferred from a route name. The other four
conditions are never masked. Unknown counts, an unresolved candidate contract or incomplete irreversible-class
census is `INCOMPLETE`, which forbids SINGLE/MULTI and yields QUESTION unless another derived condition is true,
in which case PLAN wins. A caller cannot lower this vector. Changing either the authoritative trigger block or normalized policy SHA without a
fresh parity review is manifest drift.

Each condition evidence has a strict machine-checkable arm: canonical file list, registered child-agent IDs,
explicit dependency edge list, closed irreversible operation list, or authenticated raw prompt span. The
controller ORs verified receipt evidence with the registry/prompt lower bound; it rejects a true value without
the matching arm and rejects any false value below the lower bound. Thus the controller does not claim to infer
all future files from prose, but the caller cannot hide known concrete scope or invent an unsupported trigger.
The final booleans must equal this verified OR result.

Unknown fields, missing evidence, wrong generation/epoch/obligation/source/current event or boundary,
used receipt ID, contradictory booleans, invalid skill names, or direct state edits do not consume the
obligation. `SINGLE/MULTI` stores an immutable non-capability
`execution_selection={route_name,contract_id,instruction_sha256,policy_sha256,steps,resume_mode}`.
`effective_project_context` is true only when generation and prompt attestation are current, project phase is
TURN_ACTIVE, canonical binding/inode/epoch match the selection/obligation, `turn.event_id ==
prompt_gate.current_event`, and deferred_project_request is absent. A project-scoped SINGLE/MULTI publishes an
ISSUED execution capability only when that predicate is true. A no-project response-only/human-wait contract
publishes a route-only capability with empty project roots and no project grant.

When project phase is TURN_ACTIVE but effective_project_context is false because TARGET_EXISTS kept the old
project turn, a project-scoped selection instead sets PRESENTATION_PENDING with target
`WAITING_HUMAN(kind=PROJECT_SWITCH_REQUIRED)`. It preserves task/selection plus the exact pre-wait execution
status/subphase as a scope-resume snapshot, issues no execution capability, and
stores an exact display naming the canonical existing target plus the user retry grammar `切换到 <target> 项目`;
after byte-exact display Stop may end. Only a fresh attested SELECT(target,SWITCH) may drive D/S, and only its
successful scope rebind plus the ordinary boundary/resume rules may later publish execution. It never treats the
failed NEW event itself as switch authority.

When the composed project outcome remains clean TURN_CLOSED/BOUND under SAME or
DIFFERENT_UNPROVEN, it instead sets PRESENTATION_PENDING with target EXECUTION_WAITING_BOUNDARY and a bounded
exact continuation message; no execution capability exists yet. When the composed project outcome is NO_PIN,
the only valid SINGLE/MULTI case below sets EXECUTION_PENDING and publishes an ISSUED **route-only** execution
capability with `project_scope=NO_PIN`, empty project read/write roots and `projectMutation:false`; project phase,
binding, epoch and project turn remain unchanged. It never sets SATISFIED merely for classifying. `QUESTION`
sets `PRESENTATION_PENDING` with the exact bounded question bytes/SHA and target `WAITING_HUMAN`; it does not
enter a human wait until Stop proves those bytes were presented. `PLAN` classification sets
PLANNING_PENDING and publishes
one exact `plan_capability={capability_id,capability_seq,generation,session,obligation,current_event,boundary,
registered_plan_agent,registration_blob_sha256,instruction_sha256,tool_call_challenge,max_utf8_bytes:262144,
status:ISSUED|IN_FLIGHT|CALL_CONSUMED}`; it does **not** claim a plan
already exists or unlock
Stop. Only the exact registered Plan Agent invocation and bounded read-only discovery are allowed. Generic
Agent/subagent use and every runtime/product mutation remain denied.

Under NO_PIN, SINGLE/MULTI is valid only when the selected registry contract has no project-scoped read/write
root and is explicitly response-only or human-wait capable. Any project-scoped contract under NO_PIN must return
QUESTION/Project Gate and creates no execution selection. This rule is checked at classify time and prevents a
write-capable execution from entering a no-project Stop deadlock. The route-only execution capability may run
only the manifest-listed no-project steps needed to stage the exact response or verified human wait; it cannot
mint an ordinary project grant, resolve a path through project symlinks, call a project controller, or broaden
its empty write-root set through SKILL.md text.

For this contract `H` is SHA-256 over the exact framed bytes and is encoded as 64 lowercase hex characters.
`capability_id = H(LP("plan-capability:v1") || LP(generation) || LP(session) || LP(obligation) ||
LP(current_event) || LP(boundary) || LP(receipt_id) || LP(decimal capability_seq) ||
LP(registration_blob_sha256) || LP(instruction_sha256))`.
`tool_call_challenge = H(LP("plan-tool-call:v1") || LP(capability_id) || LP(decimal capability_seq))`.
The monotonic capability sequence is persisted in the session document and is never reused, including after
revision, cancellation or rollback.

PreTool requires the exact persisted agent name, normalized instruction SHA, obligation/task text, read-only
roots and no extra model/tool/prompt fields; it binds the native Plan Agent tool-call ID to the issued challenge
and atomically changes ISSUED→IN_FLIGHT before dispatch. The paired PostTool first runs `attestPending()` if a
steering prompt arrived, then—not the main agent—verifies the same native call ID, registration and successful
result envelope. If the capability was revoked/superseded while the agent ran, the result is durably
`REJECTED_STALE_PLAN_RESULT` and changes no route/project authority. Otherwise PostTool computes
`plan_result_id = H(LP("plan-result:v1") || LP(capability_id) || LP(native_call_id) || LP(result_sha256))`,
stores immutable `plan_result={plan_result_id,capability_id,native_call_id,result_sha256,canonical_base64}` plus
separate mutable envelope
`plan_result_finalization={plan_result_id,status:UNFINALIZED|FINALIZED|SUPERSEDED,finalized_by:null|finalize_capability_id}`
(initially UNFINALIZED/null),
changes the Plan-call capability IN_FLIGHT→CALL_CONSUMED, increments the monotonic
`finalize_sequence`, and publishes one independent one-shot
`finalize_capability={finalize_capability_id,finalize_sequence,generation,session,obligation,current_event,
boundary,plan_result_id,status:ISSUED|CONSUMED}` in the same rename. This defines the PLANNING_PENDING
`RESULT_READY` subphase and never writes a repository path. A reused Plan capability, native call, result ID or
finalize capability is rejected even if all content bytes match.

`finalize_capability_id = H(LP("plan-finalize-capability:v1") || LP(generation) || LP(session) ||
LP(obligation) || LP(current_event) || LP(boundary) || LP(plan_result_id) || LP(decimal finalize_sequence))`.
The finalize sequence is persisted and never reused. A later attested status/TARGET_EXISTS event may invalidate
the unused finalize capability and mint a fresh one for the new current event/sequence while leaving every
plan_result byte, its UNFINALIZED envelope, original Plan-call capability ID and native call ID unchanged.

The entire Plan Agent result is one strict UTF-8 JSON object with no prose/code fence prefix or suffix, not
free-form Markdown. Common required keys bind schema/capability/
generation/obligation/event/boundary and contain `disposition`, tri-state premise verdict+evidence,
smaller-alternative verdict+evidence, source traces and concerns. `PLAN_READY` additionally represents every
mandatory block in the authoritative Plan Agent contract: orchestration mode/tier, ordered phases, phase type,
agent ownership and serial/parallel order, exact outputs/gates/model tier/skills, source-bound U-blocks,
reverse source coverage, blocking assertions, rollback actions, one user gate and all exit self-checks.
`NO_ACTION`,
`THIN_ALTERNATIVE` and `NEEDS_CONTEXT` instead require one bounded human-facing rationale/question and forbid
phase/assertion claims. Exact schema caps are 64 phases, 256 assertions, 256 source traces, 64 concerns,
4,096 UTF-8 bytes per scalar, 196,608 for `plan_markdown` and 262,144 for the entire result; every array member
is a strict object with all keys required, and unknown/duplicate keys reject.

The manifest member `.claude/skill-os/plan-result.schema.json` is the executable JSON Schema. Its root has
exactly these required keys (unused branches are JSON `null`):

```text
schema_version, capability_id, generation_id, obligation_id, event_id, boundary_id, disposition,
premise, smaller_alternative, source_traces, concerns, plan, human_message
schema_version = 1
disposition = PLAN_READY | NO_ACTION | THIN_ALTERNATIVE | NEEDS_CONTEXT
premise/smaller_alternative = {verdict:YES|NO|UNKNOWN, statement:string, evidence:[Evidence]}
Evidence = {id:string, claim:string, source:string, sha256:string}
Concern = {id:string, severity:BLOCKER|MAJOR|MINOR, statement:string, mitigation:string}
source_traces = [Evidence]; concerns = [Concern]
Plan = {orchestration:{complexity_mode:Solo|Sequential|Parallel|Supervisor|Hierarchical,
        combined_modes:[Solo|Sequential|Parallel|Supervisor],requires_user_confirmation:boolean,
        tier:Lightweight|Standard|Deep,worker_groups:[WorkerGroup]},
        phases:[Phase],u_blocks:[UBlock],source_coverage:[SourceCoverage],assertions:[Assertion],
        final_quality_gate:FinalQualityGate,
        rollback_actions:[Rollback],user_gate:{question:string,approval_scope:string},
        self_checks:[SelfCheck],plan_markdown:string}
Phase = {id:string,title:string,goal:string,
         phase_type:task_execution|skill_execution|parallel_skill_execution,
         dependencies:[phase_id],execution_order:SERIAL|PARALLEL,worker_group_id:string|null,owners:[Owner],
         files:[canonical_relative_path],outputs:[canonical_relative_path_or_observable],
         scope_requirement:NO_PROJECT|CURRENT_PROJECT,
         conditional_pass_policy:DENY|ALLOW_WARNING_ONLY,skip_policy:NEVER|HUMAN_OVERRIDE,
         model_tier:reasoning-heavy|core-execution|guided-execution|mechanical,
         model_tier_reason:string,execution_contract_ids:[string],agent_contract_ids:[string],
         assertion_ids:[string],quality_gate_owner_id:string,quality_gate_contract_id:string,
         allowed_tool_classes:[closed_tool_class],allowed_read_roots:[canonical_relative_path],
         allowed_write_templates:[canonical_relative_path],skills_needed:[canonical_relative_path],gate:string,
         task_spec:TaskSpec|null,skill_spec:SkillSpec|null,parallel_skill_group:ParallelSkillGroup|null}
TaskSpec = {execution_context:MAIN_AGENT|WORK_AGENT,work_owner_id:string,
            agent_contract_id:string,execution_contract_id:string,
            main_agent_step_graph_sha256:64hex|null}
SkillSpec = {skill:string,execution_context:MAIN_AGENT|SUBAGENT,skill_path:canonical_relative_path,
             work_owner_id:string,agent_contract_id:string,execution_contract_id:string,
             preflight_owner_id:string,preflight_contract_id:string,user_parameter_schema_ids:[string],
             main_agent_step_graph_sha256:64hex|null}
ParallelSkillGroup = {max_concurrency:1|2|3,children:[ParallelSkill],summary_output:canonical_relative_path,
                      summary_owner_id:string,summary_agent_contract_id:string,
                      summary_execution_contract_id:string,join_gate:string}
ParallelSkill = {child_id:string,skill:string,execution_context:SUBAGENT,
                 skill_path:canonical_relative_path,work_owner_id:string,preflight_owner_id:string,
                 preflight_contract_id:string,
                 user_parameter_schema_ids:[string],outputs:[canonical_relative_path_or_observable],
                 child_gate:string,agent_contract_id:string,execution_contract_id:string}
WorkerGroup = {id:string,mode:Sequential|Parallel|Supervisor,dependencies:[worker_group_id],
               phase_ids:[phase_id]}
Owner = {id:string,role:MAIN|WORK_AGENT|JOIN|QUALITY_GATE|PREFLIGHT,
         agent_contract_id:string,execution_contract_id:string,task:string,
         file_ownership:[canonical_relative_path]}
UBlock = {id:string,goal:string,source:string,dependencies:[u_block_id_or_external],files:[canonical_relative_path],
          approach:string,read_list:[string],test_scenarios:[string],verification:string,status:PLANNED}
SourceCoverage = {source_id:string,source_sha256:string,covered_by:[phase_or_u_block_id],status:COVERED|N_A,reason:string}
Assertion = {id:string,applies_to:PHASE|FINAL,phase_id:string|null,level:BLOCKING|WARNING,
             human_waivable:boolean,failure_mode:string,kind:SHELL|CRITERION,
             command:string|null,criterion:string|null,evidence_required:string}
FinalQualityGate = {owner_id:string,agent_contract_id:string,execution_contract_id:string}
Rollback = {trigger:string, action:string, verification:string}
SelfCheck = {id:PREMISE|SOURCE_TRACE|IRREVERSIBLE_GATE|RESEARCH_DECISION|MODEL_TIER|DESIGN_PATH,
             passed:boolean,evidence:string}
human_message = {kind:NO_ACTION|THIN_ALTERNATIVE|NEEDS_CONTEXT, text:string,
                 proposed_task_text:string|null, proposed_task_sha256:64hex|null} | null
```

The schema uses `oneOf`: `PLAN_READY` requires `premise.verdict=YES`,
`smaller_alternative.verdict=NO`, non-null Plan and null human_message; `NO_ACTION` requires
`premise.verdict=NO`; `THIN_ALTERNATIVE` requires `premise.verdict=YES` and
`smaller_alternative.verdict=YES`; `NEEDS_CONTEXT` requires both verdicts `UNKNOWN`. Every non-PLAN disposition
requires null Plan and the matching non-null human_message. THIN_ALTERNATIVE alone requires non-null
`proposed_task_text` plus its exact UTF-8 SHA; NO_ACTION/NEEDS_CONTEXT require both proposed-task fields null.
The three Phase variants are a strict `oneOf`: task requires only non-null `task_spec`; skill requires only
non-null `skill_spec`; parallel-skill requires only non-null `parallel_skill_group`. Every task/skill/child
`work_owner_id`, every `preflight_owner_id`, the phase `quality_gate_owner_id` and a parallel group's
`summary_owner_id` resolve to exactly one Owner with respectively MAIN-or-WORK_AGENT, PREFLIGHT, QUALITY_GATE
and JOIN role. Each reference also has exactly one matching registry agent contract and execution contract;
each Owner is referenced by exactly one call site in its Phase, so an unused/duplicate Owner rejects. Owner file
ownership contains exactly that unit's declared writes and may not be swapped with another unit.
Where TaskSpec/SkillSpec/ParallelSkill/ParallelSkillGroup repeats a contract ID, it must byte-equal the referenced
Owner binding; preflight and quality execution IDs likewise equal their named Owner binding.
`Phase.agent_contract_ids` and `Phase.execution_contract_ids` are the lexicographically sorted, duplicate-free
exact unions of every referenced work/preflight/summary/quality Owner binding and matching explicit spec ID; an extra, missing or repeated ID
rejects rather than widening authority. A parallel group
has 2–3 unique child IDs, `max_concurrency` exactly equal to child count, SUBAGENT-only execution and no
child-to-child dependency. Every pair of child write templates, owned files and declared output paths must be
disjoint after canonical containment, realpath-parent and alias/case-normalization checks; there is no
"serializing JOIN" exception because JOIN occurs after child work. The JOIN owner may write only the one
aggregate `summary_output`, and that path must be distinct from every child path/template/output. Shared-write
work is represented as serial dependent phases in the outer phase DAG, never as a parallel group; this schema
does not admit an internal child dependency DAG. The group has one phase quality gate and is never silently
rewritten into multiple approved phase IDs.
`Plan.final_quality_gate` resolves to exactly one registered `quality-gate` owner/agent/execution contract and
is not a phase Owner or a free-form controller command. Its execution contract binds the complete sorted FINAL
assertion ID/kind/level/evidence-required set and the exact SHELL/CRITERION evaluation policy. A missing,
duplicate, MAIN/WORK/PREFLIGHT owner, contract drift or phase-quality substitution rejects PLAN_READY.

For TaskSpec/SkillSpec with `execution_context=MAIN_AGENT`, `main_agent_step_graph_sha256` is required and must
equal one manifest registry graph; WORK_AGENT/SUBAGENT requires null. The graph is a strict ordered DAG of
1–64 records `{step_id,kind:TOOL|HUMAN_WAIT,dependencies,tool_class,input_contract_sha256,
output_evidence_contract_sha256,wait_schema_id_or_empty}`. TOOL forbids a wait schema; HUMAN_WAIT requires one
and forbids tool/input fields. Every dependency points backward, every step is reachable, TOOL classes/roots/
outputs intersect the Phase and project scope, and at least one terminal step exists. The graph SHA is
`H(LP("main-agent-step-graph:v1")||LP(execution_contract_id)||LP(decimal count)||
Σ[LP(step_id)||LP(kind)||LP(decimal dependency_count)||ΣLP(sorted dependency IDs)||LP(tool_class_or_empty)||
LP(input_contract_sha256_or_empty)||LP(output_evidence_contract_sha256)||LP(wait_schema_id_or_empty)])` in
lexicographic step-ID order; unknown/default/cycle/second graph rejects. This registry, not free skill prose,
is the complete MAIN_AGENT multi-tool/HITL execution surface.
Every `user_parameter_schema_id` and MAIN_AGENT `wait_schema_id` resolves to one immutable manifest
`HumanInputSchema={schema_version:1,schema_id,kind:FREE_TEXT|CLOSED_OPTION,max_answer_utf8_bytes,
option_ids,max_option_id_utf8_bytes,policy_sha256}`. The maximum is canonical decimal `1..4096` and option IDs
are duplicate-free bounded UTF-8; FREE_TEXT requires `option_ids=[]`/max-option 0, while CLOSED_OPTION requires
at least two IDs and its maximum covers the exact accepted answer bytes. Unknown schemas, an answer outside the
declared maximum or a registry drift reject. These exact maxima are also the sole inputs to
`state_capacity_admission`; free skill prose cannot widen them after Plan approval.
If a MAIN_AGENT graph contains any HUMAN_WAIT step, its Phase must have `execution_order=SERIAL` and is an
exclusive wave: no other phase/child/call/completion authority may be scheduled from its admission until that
phase is terminal. The validator derives wave membership from the phase DAG and rejects a plan that could place
an interactive MAIN_AGENT phase beside a sibling. This makes its human wait a single recoverable WAIT state;
the controller never has to encode an unanswered human gate and an unrelated in-flight sibling in one arm.
MAIN_AGENT graphs without HUMAN_WAIT may share the ordinary global frontier and remain subject to the cap.
The same exclusive-wave rule applies to any SkillSpec with nonempty `user_parameter_schema_ids` **and to the
entire ParallelSkillGroup when any child has a nonempty list**. A parameterized parallel group remains one
approved parallel phase, but no outer sibling phase/call/completion authority may coexist from its first
preflight until the phase is terminal. Its child preflights may use the bounded 2–3-call frontier; every one
must be terminal before the controller creates a question. Parameter questions are then serialized by one
strict `parameter_queue={schema_version:1,phase_id,queue_sha256,ordered_questions,cursor,
collected_answers,collected_answer_root}`. `ordered_questions` is the duplicate-free lexicographic sequence of
exact `{child_id_or_empty,question_schema_id}` pairs derived from the immutable Plan: ordinary SkillSpec uses
the empty child token, and a parallel group uses each real child ID. `cursor` is canonical decimal in
`0..count`; while cursor<count it is the zero-based index of the sole presentable question, and cursor=count is
terminal. `collected_answers` is exactly the prefix before cursor and every member is one strict
`CollectedParameterAnswer={schema_version:1,child_id_or_empty,question_schema_id,answer_base64,
answer_utf8_length,answer_sha256,answer_event,answer_boundary,option_id_or_empty}` with
`additionalProperties:false`. `answer_base64` is the canonical padded RFC 4648 encoding of the exact decoded
UTF-8 answer bytes captured from the attested grammar's single answer span; re-encoding must round-trip
byte-for-byte, `answer_utf8_length` is canonical decimal, and the SHA is over those decoded bytes. Each answer
is at most its manifest HumanInputSchema maximum (never above 4,096 decoded bytes), and all collected answers
in one queue are at most 65,536 decoded bytes and must
also fit the 2 MiB session bound. `answer_event`/`answer_boundary` are the fresh authenticated human event that
consumed the matching verified wait. For a free-text policy `option_id_or_empty` is exactly `""`; for a closed
option policy it is the exact manifest option ID selected by those bytes and is required **in addition to**,
never instead of, the exact answer bytes. A policy/ID/byte mismatch, duplicate event, later/missing/swapped
answer or a hash without its recoverable preimage is invalid.

`queue_sha256=H(LP("approved-plan-parameter-queue:v1")||LP(plan_execution_id)||LP(phase_id)||
LP(decimal question_count)||Σ[LP(child_id_or_empty)||LP(question_schema_id)])` and
`collected_parameter_answer_sha256=H(LP("approved-plan-parameter-answer:v1")||LP(queue_sha256)||
LP(child_id_or_empty)||LP(question_schema_id)||LP(answer_base64)||LP(decimal answer_utf8_length)||
LP(answer_sha256)||LP(answer_event)||LP(answer_boundary)||LP(option_id_or_empty))`;
`collected_answer_root=H(LP("approved-plan-parameter-answers:v1")||LP(queue_sha256)||
LP(decimal cursor)||Σ[LP(collected_parameter_answer_sha256)])` in queue order. The controller recomputes every
scalar and root from the persisted objects; no caller supplies either derived hash.
The current PHASE_QUESTION wait binds the queue hash, exact child, cursor/count and collected-answer root. A
valid answer appends only that complete object and either stages the next question or, after cursor=count and
all preflights terminal, atomically derives
`parameter_input_sha256=H(LP("approved-plan-parameter-input:v1")||LP(plan_execution_id)||LP(phase_id)||
LP(queue_sha256)||LP(collected_answer_root))` and issues the complete work bundle. Every SUBAGENT SKILL_WORK or
PARALLEL_WORK `input_sha256`, call capability and cold-start Work Agent prompt binds that parameter-input hash.
A MAIN_AGENT skill stores the same root in its phase-record `main_agent_execution`, includes it in every MAIN_AGENT_STEP input
identity and injects the same immutable parameter section before the first step. In both paths, that section
contains each decoded answer byte sequence plus its child/question/option ID in queue order. No agent reads
transcript history or receives only a digest. No child/step work capability
may exist with cursor<count or without the terminal queue and exact parameter-input root. These are the only
ordinary `PLAN_EXECUTION` phase-question sources; undeclared/free-form phase questions are invalid. Thus every
APPROVED_PLAN_WAIT begins only after the scheduled frontier is otherwise empty; failure or
overridable-preflight decisions first use the drain protocol instead of violating this invariant.
The terminal phase record retains the full queue objects until the approved-plan execution becomes terminal;
its phase evidence and any later BETWEEN_WAVES checkpoint `completed_evidence_root` bind the exact
`parameter_input_sha256`. A cross-session checkpoint is still forbidden while a parameter wait is active and
never turns old answers into new call authority. Replaying an answer event or answer capability is rejected;
after transfer, completed parameterized work stays completed and is not re-asked or reissued.
`applies_to=PHASE` requires one existing `phase_id`; `FINAL` requires null
`phase_id`. Every phase has at least one phase-bound gate/assertion and only its own bound assertions may gate
its completion; `Phase.assertion_ids` and the reverse Assertion scope index must be byte-for-byte complete and
bijective. `CONDITIONAL_PASS` is legal only when that exact phase has
`conditional_pass_policy=ALLOW_WARNING_ONLY` and the receipt contains no BLOCKING finding; the final assertion
set never accepts it.

For Hierarchical mode, every phase belongs to exactly one nonempty `worker_group_id`, group and phase DAGs are
acyclic, and each group mode is losslessly executable by its listed phase IDs. Non-Hierarchical plans require
`worker_groups=[]` and null group IDs. A task phase has exactly one MAIN or WORK_AGENT work owner plus its
QUALITY_GATE owner; parallel task work is expressed as distinct approved PARALLEL phase IDs, never hidden behind
multiple owners. Supervisor/Sequential/Parallel/Hierarchical scheduling therefore has one mechanical mapping.

The authoritative Orchestrator confirmation gate is derived, not optional prose. Schema validation requires
`orchestration.requires_user_confirmation=true` for Supervisor or Hierarchical mode. A phase requires a
post-completion confirmation when it is (a) a `skill_execution` with `execution_context=MAIN_AGENT`, (b) any
phase in Supervisor/Hierarchical mode, or (c) the Plan explicitly sets the confirmation flag. Parallel work may
still run as one approved wave: after its last live authority completes, the controller freezes a strict
`phase_confirmation_queue={schema_version:1,queue_sha256,wave_terminal_evidence_root,
ordered_phase_ids,cursor,confirmed_receipts}` over
the lexicographically sorted completed-but-unconfirmed required phase IDs. The current phase owns no work or
completion capability; `confirmed_receipts` is exactly the prefix before cursor and each receipt binds
`{phase_id,phase_evidence_root,quality_result_sha256,answer_event,answer_boundary}`.
`cursor` uses the same zero-based/head-or-terminal rule as the parameter queue; the phase ID at that index is
the only legal confirmation target.
`wave_terminal_evidence_root` is the §5.4 active/completed-evidence framing over all earlier completed phases
plus every just-drained phase's immutable terminal evidence, without treating confirmation as PASS.
`queue_sha256=H(LP("approved-plan-phase-confirmation:v1")||LP(plan_execution_id)||
LP(wave_terminal_evidence_root)||LP(decimal phase_count)||ΣLP(phase_id))`.
Only PASS/allowed-CONDITIONAL_PASS completions enter this queue; PHASE_WAIVED already carries its explicit human
decision and is excluded rather than asking a second confirmation.
The controller stages exactly one PHASE_CONFIRMATION wait at a time. When all receipts exist it atomically
marks those phases PHASE_COMPLETE, discards the queue and only then chooses BETWEEN_WAVES or FINAL_ASSERTIONS.
Therefore confirmation never coexists with sibling work authority and neither `advance-wave` nor final quality
can bypass the required human gate.
The bounded display begins with the authoritative `已完成，继续下一 Phase？`, identifies the exact phase, and
shows only the full-input control `继续下一阶段 <wait_sha256>`; it never treats bare continue as approval.

The four model tiers are the closed manifest-bound model-routing enum, not arbitrary strings. IDs, hashes,
dependency references, path
containment, dependency acyclicity, unconditional parallel child/summary file disjointness, every Phase/U-block
source trace, irreversible-operation BLOCKING assertion+user gate, required self-check ID completeness,
source-coverage completeness, array uniqueness and caps are schema-plus-semantic validation rules; all objects set
`additionalProperties:false`. The reviewed schema bytes, not this prose or caller interpretation, are the
runtime oracle.
`finalize-plan` decodes the exact canonical argv carrier above to
`{"schema_version":1,"session_id":<sid>,"obligation_id":<oid>,"capability_id":<original_plan_cap_64hex>,
"finalize_capability_id":<current_finalize_cap_64hex>,"plan_result_id":<64hex>,
"result_sha256":<64hex>}` with exactly those keys. The original capability ID, result ID and result SHA must
equal the immutable result and its separate finalization envelope must be UNFINALIZED; the independent finalize capability must be current, ISSUED and bind
that result plus the current event/boundary. The CAS marks the finalization envelope FINALIZED and the finalize capability
CONSUMED; within the result-lineage object the only mutable field is
`plan_result_finalization={status:FINALIZED,finalized_by:<finalize_capability_id>}`. The same atomic transition
may add the controller-derived admission and route successor defined below;
the immutable plan_result bytes never change, and the already CALL_CONSUMED Plan-call capability is never revived or rebound. It accepts only that
persisted result identity, never caller-supplied plan text. A rotated finalizer does not require the immutable
result's original `event_id` to equal current_event; the original event must still match the consumed Plan call,
and the current event must match finalize_capability. It mechanically validates
this envelope: PLAN_READY first derives the strict plan admission below; APPROVABLE sets
`PRESENTATION_PENDING` with exact plan bytes/SHA and target `WAITING_PLAN_APPROVAL`, while PROJECT_REQUIRED sets
the exact Project Gate display and no approval capability; CAPACITY_REJECTED takes the bounded revision path
below and never presents approval. The other dispositions set `PRESENTATION_PENDING` with their exact human-facing
rationale/question and disposition-specific target `WAITING_HUMAN(kind=PLAN_NO_ACTION|PLAN_THIN_ALTERNATIVE|
PLAN_NEEDS_CONTEXT)`. Semantic quality remains a human/reviewer
judgment and is not overclaimed as schema validation.

A failed/mismatched/oversized PostTool records a bounded diagnostic and enters PLAN_REVISION_REQUIRED with a
fresh capability. If PostTool never arrives, no timeout steals the IN_FLIGHT call: a later security hook may
invalidate/reissue only after the canonical transcript/rollout proves that exact native tool call terminal or
aborted; live or unproven stays BUSY and blocks Stop. A human revision retains the prior exact result SHA as
superseded evidence, sets only its finalization envelope to SUPERSEDED, invalidates the finalizer and creates a
fresh Plan-call capability; no old result or capability remains executable.

The Plan Agent identity is the reviewed v3 Claude registration `.claude/agents/plan-agent.md` or the reviewed
v3 Codex registration `.codex/agents/plan-agent.toml`. The Claude file gains strict native subagent frontmatter;
the Codex adapter carries the same normalized instruction payload SHA, and both resolve the **reasoning-heavy
planning tier** from the manifest-bound model-routing policy without pinning a model name. Each registration
exposes only bounded repository-read tools and the result channel; PreTool rechecks its live wrapper blob and
normalized instruction SHA against C1/manifest before dispatch. It runs with
repository writes mechanically denied and only a scratch result channel observed by the paired PostTool gate;
every child tool must retain the parent sid/generation/obligation gate. If either harness cannot prove those
properties in L0, Agent dispatch is not allowlisted and KILL-06 fires rather than falling back to a generic
writable subagent or accepting plan text from the main agent.

Plan approval is not completion. The manifest also snapshots `.claude/agents/orchestrator.md` as the normalized
**main-session behavior contract**; it intentionally has no subagent registration/frontmatter, and no fictitious
`.codex/agents/orchestrator.toml` is created. `.claude/skill-os/approved-plan-execution.schema.json` is the
cross-harness executable normalization of that contract and is parity-checked against both the Orchestrator
instruction SHA and the Plan-result schema SHA. The companion manifest member
`.claude/skill-os/agent-execution-contracts.json` is the closed registry for MAIN, WORK_AGENT, QUALITY_GATE,
PREFLIGHT and any other permitted phase owner: it binds Claude registration/template bytes and the exact Codex
registered or built-in role identity, normalized instruction SHA, tools, sandbox and output schema. No Plan
string can register an agent; missing cross-harness parity rejects PLAN_READY. The PREFLIGHT branch additionally carries one strict
`preflight_policy={override:DENY|HUMAN_SKIP_CHECK,overrideable_finding_classes:[ENVIRONMENT|OPTIONAL_DEPENDENCY|USER_INPUT],retry_limit:0|1}`;
the array is sorted/unique and must be empty under DENY. `SECURITY|INTEGRITY|IRREVERSIBLE|PROJECT_IDENTITY`
findings are never members and can never be overridden. Non-PREFLIGHT records forbid the policy key. A
registered preflight result binds its finding class, severity, result SHA and exact policy SHA; the Plan cannot
invent or weaken that policy. At Plan-result finalization the controller derives `plan_requires_project` from
every phase/child/path/output/execution contract and rejects any understated `scope_requirement`. It also runs
the manifest-bound capacity analyzer before any approval presentation and writes this strict object:

```text
state_capacity_admission = {
  schema_version:1,status:ADMITTED|REJECTED,analyzer_manifest_sha256,
  human_input_schema_set_sha256,plan_shape_sha256,base_serialized_bytes,
  worst_case_parameter_answer_bytes,worst_case_main_agent_answer_bytes,
  worst_case_scope_snapshot_bytes,checkpoint_cancellation_reserve_bytes,
  transfer_security_reserve_bytes,
  ledger_and_terminal_reserve_bytes,deny_reserve_bytes:4096,hard_cap_bytes:2097152,
  worst_case_serialized_state_bytes,margin_bytes,admission_sha256
}
plan_admission = {
  schema_version:1,plan_requires_project,project_identity_sha256_or_empty,
  state_capacity_admission,status:APPROVABLE|PROJECT_REQUIRED|CAPACITY_REJECTED,
  plan_admission_sha256
}
```

All byte counters are controller-derived canonical unsigned decimals except `margin_bytes`, which is the
canonical signed difference `2097152-4096-worst_case_serialized_state_bytes`. The analyzer uses the exact
candidate generation schemas, canonical JSON serializer and immutable Plan/agent/graph/HumanInputSchema
registries. Its three input identities are mechanically fixed:

- `analyzer_manifest_sha256=H(LP("approved-plan-capacity-analyzer-manifest:v1")||
  LP(active_generation_manifest_sha256)||LP(session_state_schema_sha256)||
  LP(approved_plan_execution_schema_sha256)||LP(plan_result_schema_sha256)||
  LP(plan_delta_result_schema_sha256)||LP(agent_execution_contracts_sha256)||
  LP(state_capacity_module_sha256)||LP(canonical_serializer_sha256))`;
- `human_input_schema_set_sha256=H(LP("approved-plan-human-input-schema-set:v1")||LP(decimal count)||
  Σ[LP(schema_id)||LP(kind)||LP(decimal max_answer_utf8_bytes)||LP(decimal option_count)||
  ΣLP(sorted option_id)||LP(decimal max_option_id_utf8_bytes)||LP(policy_sha256)])` over exactly the
  duplicate-free schemas referenced by the effective Plan's parameter queues and MAIN_AGENT graphs;
- initial `plan_shape_sha256=H(LP("approved-plan-capacity-shape:v1")||LP(result_sha256)||
  LP(approved_plan_execution_schema_sha256)||LP(agent_execution_contracts_sha256))`; a delta uses
  `plan_shape_sha256=H(LP("approved-plan-capacity-shape:v1")||LP(predecessor_plan_shape_sha256)||
  LP(delta_result_sha256)||LP(approved_plan_execution_schema_sha256)||
  LP(agent_execution_contracts_sha256))`.

`session_state_schema_sha256` is the exact strict-schema blob exported by the manifest-listed
`project-substrate.mjs`; `canonical_serializer_sha256` is the exact serializer export of `bounded-io.mjs`.
Candidate construction compares those exports with the analyzer imports and manifest entry SHAs, so neither is
a caller label or an unlisted file.

It enumerates every finitely reachable strict state template for this Plan—including full ordinary
and recovery ledgers, parameter queues and every retained completed `CollectedParameterAnswer`, every retained
`MainAgentHumanAnswer`, active frontier/failure/delta/wait arms, their complete scope-resume duplications,
delta-lineage retired human contexts, checkpoint cancellation ENTRY and OVERFLOW successors, transfer/cleanup
receipts, both fixed-size transfer-security accumulators plus FULL rotation posture, exact task/result bytes and
the fixed deny-record schema—and fills each bounded scalar to its declared maximum. The deny record is measured
separately and must serialize within exactly the reserved 4,096 bytes; it is excluded from the normal-content
component sum below, while an OVERFLOW template includes every other terminal byte. Canonical base64 payload size is
computed as `4*ceil(max_utf8_bytes/3)`; option IDs, event/boundary metadata and JSON escaping use their actual
schema maxima. Every template contains the prospective complete `plan_admission`/capacity object itself and the
exact current non-Plan state plus all schema-bounded future growth. The analyzer manifest owns a closed,
non-overlapping field→component table. It serializes each
complete hypothetical document, using 20-byte unsigned-64 decimal placeholders for every self-describing byte
count, selects the largest document (lexicographically smallest template ID breaks an equal-size tie), and
reports the exact byte contributions of that winner. `base_serialized_bytes` is every unassigned structural
byte; the four named `worst_case_*`/checkpoint components plus `transfer_security_reserve_bytes` and
`ledger_and_terminal_reserve_bytes` are the remaining disjoint
bytes, and their exact sum equals `worst_case_serialized_state_bytes`. They are never independently maximized or
double-counted. Thus all retained answers
across up to 64 phases and every legal snapshot duplicate are budgeted, not only one active queue.
`transfer_security_reserve_bytes` is exactly 4,096 for every schema-v3 Plan state because the per-session
accumulator is mandatory, including when that Plan structurally forbids checkpoint. The target claim
independently reruns the same complete-state analyzer and validates its already-budgeted 4,096-byte accumulator
before PREPARED. The fixed deny reserve is separate and cannot be counted as this field.
Its 4,096 bytes include the largest complete `TRANSFER_SECURITY_LANE_ONLY` prompt-gate replacement and strict
`transfer_scan`, so the capacity analyzer must use that template rather than a smaller generic denial.

Admission requires `worst_case_serialized_state_bytes <= 2093056` and nonnegative `margin_bytes`.
`admission_sha256=H(LP("approved-plan-state-capacity:v1")||LP(analyzer_manifest_sha256)||
LP(human_input_schema_set_sha256)||LP(plan_shape_sha256)||LP(base_serialized_bytes)||
LP(worst_case_parameter_answer_bytes)||LP(worst_case_main_agent_answer_bytes)||
LP(worst_case_scope_snapshot_bytes)||LP(checkpoint_cancellation_reserve_bytes)||
LP(transfer_security_reserve_bytes)||LP(ledger_and_terminal_reserve_bytes)||LP("4096")||LP("2097152")||
LP(worst_case_serialized_state_bytes)||LP(margin_bytes)||LP(state_capacity_admission.status))`;
`plan_admission_sha256=H(LP("approved-plan-admission:v1")||LP(result_sha256)||
LP(plan_requires_project?"1":"0")||LP(project_identity_sha256_or_empty)||LP(admission_sha256)||
LP(plan_admission.status))`.
Unknown counters, a different serializer/template maximum, arithmetic overflow or a manifest/schema mismatch is
REJECTED. The controller reruns the same analyzer at exact approval and at delta finalization/install; any drift
or now-negative margin revokes approval/install rather than relying on the old calculation.

The finalization rename stores this complete `plan_admission`. A REJECTED capacity result keeps the immutable
Plan result only as non-authorizing evidence, sets `status=CAPACITY_REJECTED`, consumes the current finalizer and
enters PLAN_REVISION_REQUIRED with a fresh Plan capability bound to a controller-generated capacity concern; it
never reaches WAITING_PLAN_APPROVAL or execution. No admitted execution may reach ordinary state rotation solely
from inputs within its declared HumanInputSchema maxima; unexpected external/state-schema growth remains
fail-closed. APPROVABLE and PROJECT_REQUIRED require `state_capacity_admission.status=ADMITTED`.
If project-required under NO_PIN, the immutable result/finalization remains evidence with
`plan_admission.status=PROJECT_REQUIRED` and the route stages
`PRESENTATION_PENDING(kind=PLAN_PROJECT_REQUIRED)` instead of WAITING_PLAN_APPROVAL. A fresh project selection
runs the ordinary project transaction; after commit and a proven boundary the old result is superseded and a
fresh Plan capability runs against the bound identity. It is never approved/reused across that change. Thus any
project-scoped phase anywhere in a Plan completes Project Gate before **any** phase executes, including a mixed
first wave. A wholly NO_PROJECT Plan may execute under NO_PIN.

For an approvable result, exact approval stores an immutable `approval_intent` and has three exhaustive admission
results. NO_PIN is accepted only when `plan_requires_project=false`; it enters `PLAN_EXECUTION_PENDING` with
`project_identity=NO_PIN`, empty project read/write roots, `projectMutation:false`, route-only phase capabilities
and `project_identity_sha256=H(LP("approved-plan-no-project:v1")||LP(generation)||LP(session)||
LP(decimal epoch_counter))`, plus an invariant that every phase/child/output contract remains NO_PROJECT. Active A, or clean C/B under
DIFFERENT_DRAINED with an atomic C/B→A transition, enters
`PLAN_EXECUTION_PENDING`. Clean C/B under SAME or
DIFFERENT_UNPROVEN enters `PLAN_EXECUTION_WAITING_BOUNDARY`, with no phase capability, and presents the exact
approved-plan/boundary instruction. NO_PIN with `plan_requires_project=true` never reaches approval and remains
PLAN_PROJECT_REQUIRED. Approval is never lost in a terminal project state.

The same transition creates:

```text
plan_execution:
  schema_version: 1
  plan_execution_id / generation / session / obligation_id
  plan_result_id / result_sha256 / approval_event / approval_boundary
  approval_intent / scope_summary_sha256 / plan_admission_sha256 / state_capacity_admission
  project_identity                         # exact NO_PIN or canonical/dev/ino/epoch_counter
  phase_dag / active_phase_ids / completed_phase_ids / action_sequence
  phase_records[phase_id]: {
    phase_type,
    state:READY|PREFLIGHT_PENDING|PREFLIGHT_OVERRIDE_PENDING|PARAMETERS_PENDING|PARAMETER_WAITING|
          CAPABILITY_ISSUED|IN_FLIGHT|
          MAIN_AGENT_ACTIVE|MAIN_AGENT_COMPLETION_READY|
          SUMMARY_CAPABILITY_ISSUED|SUMMARY_IN_FLIGHT|JOIN_COMPLETE|QUALITY_GATE_PENDING|
          PHASE_COMPLETION_READY|PHASE_CONFIRMATION_PENDING|WAITING_HUMAN|PHASE_COMPLETE|PHASE_WAIVED,
    phase_capability?,preflight_records?,child_records?,native_call?,tool_capability?,
    summary_capability?,summary_evidence?,phase_evidence?,quality_gate?,assertion_evidence?,wait?,
    parameter_queue?,main_agent_execution?,controller_action?
  }
  overall_state: WAITING_BOUNDARY | RUNNING | BETWEEN_WAVES | REPLAN_PENDING |
                 DELTA_PRESENTATION_PENDING | WAITING_DELTA_APPROVAL | WAITING_DELTA_BOUNDARY | TRANSFER_READY |
                 FINAL_ASSERTIONS
  plan_lineage? / replan? / transfer? / finalizer? / controller_action?
  active_main_agent_phase_id_or_empty / phase_confirmation_queue? / final_quality_gate?
  drain_frontier? / suspended_successor_sha256? / suspended_successor_records?
```

`plan_execution_id = H(LP("approved-plan-execution:v1") || LP(generation) || LP(session) ||
LP(obligation_id) || LP(plan_result_id) || LP(result_sha256) || LP(plan_admission_sha256) || LP(approval_event) ||
LP(approval_boundary) || LP(project_identity_sha256))`. The validated Plan result is immutable input; approval
cannot substitute another plan or reinterpret a phase. `scripts/plan-execution.mjs
begin|issue-preflight|record-preflight|issue-phase-tool|record-work|issue-main-step|record-main-step|complete-main-work|
issue-summary|complete-summary|record-quality-gate|issue-final-quality|record-final-quality|record-failure|complete-phase|advance-wave|
answer-wait|request-delta|finalize-delta|install-delta|checkpoint|finalize` and
`scripts/plan-transfer.mjs claim|recover` use the same canonical base64url argv carrier,
decoded-SHA check and EOF-only stdin rule as `route-receipt`. Every request binds the exact execution/phase/
capability sequence/current event/boundary/project identity and is one-shot.

`PUBLIC_PLAN_EXECUTION_VERBS` is one manifest member, not a prose list copied between layers. Its exact canonical ordered
set is `begin|issue-preflight|record-preflight|issue-phase-tool|record-work|issue-main-step|record-main-step|
complete-main-work|issue-summary|complete-summary|record-quality-gate|issue-final-quality|record-final-quality|
record-failure|complete-phase|advance-wave|answer-wait|request-delta|finalize-delta|install-delta|
checkpoint|finalize` (22 members). The `$defs.PlanExecutionRequest` discriminators, this transition table,
the production loader allowlist, controller switch and generated positive/negative tests are all generated,
including row order, from that same manifest array. Documentation between the table fences is generated output
and its verb column must equal the array byte-for-byte; it is never independently sorted. A missing, extra or
reordered member—including one adjacent row swap—fails candidate construction;
production has no separately maintained allowlist that can reject a schema-valid verb.

Every public `plan-execution` verb decodes one canonical JSON `PlanExecutionRequest` with exactly
`{schema_version:1,verb,session_id,obligation_id,plan_execution_id,current_event,current_boundary,
authority_id,payload}`. IDs/SHA values are lowercase 64-hex except an explicitly named `_or_empty` field;
session/event/boundary/phase/child tokens use their
closed existing grammars and 128-byte cap; the payload is at most 32,768 bytes and the full decoded request at
most 65,536. Canonical object keys are lexicographically ordered before base64url encoding, so a reordered,
missing, duplicate or extra key fails canonical re-encode. The semantic input identity is
`controller_input_sha256=H(LP("approved-plan-controller-input:v1")||LP(verb)||LP(session_id)||
LP(obligation_id)||LP(plan_execution_id)||LP(current_event)||LP(current_boundary)||
LP(canonical_payload_sha256))`. A non-native action capability binds that input hash. A native PreTool/PostTool
arm instead re-derives it from the already-bound call preimage plus the exact invocation-lease/hook record while
consuming that call capability; the caller-supplied record hash is never authority. Root `generation`, project
identity, owner/agent/execution-contract IDs, evidence roots, capability sequences and next-state fields are
controller-derived and forbidden in payload unless the exact arm below names one.

The request schema is one closed discriminated `oneOf`; each payload has exactly the listed keys:

| Verb | Exact payload | Legal pre-state | Authority/evidence consumed | Unique success state |
|---|---|---|---|---|
| `begin` | `{}` | PLAN_EXECUTION_PENDING with no live call | current ISSUED `begin_capability` | PLAN_EXECUTION_ACTIVE plus the first dependency-ready wave |
| `issue-preflight` | `{phase_id,child_id_or_empty,native_pretool_record_sha256}` | named PREFLIGHT_PENDING record | its ISSUED PREFLIGHT `call_capability_id`; exact live PreTool record | that call IN_FLIGHT with one native call ID |
| `record-preflight` | `{phase_id,child_id_or_empty,native_call_id,native_posttool_record_sha256,result_sha256}` | the same PREFLIGHT call IN_FLIGHT | matching native PostTool; call becomes CONSUMED | PASS→wait for all group preflights, then deterministic parameter queue or work; overridable FAIL→drain then PREFLIGHT_OVERRIDE wait; non-overridable FAIL→typed phase failure; an existing drain records evidence only and mints no successor |
| `issue-phase-tool` | `{phase_id,child_id_or_empty,call_kind,native_pretool_record_sha256}` | named TASK_WORK, SKILL_WORK, PARALLEL_WORK or QUALITY_GATE capability ISSUED | that exact `call_capability_id` and live PreTool | matching call IN_FLIGHT only |
| `record-work` | `{phase_id,child_id_or_empty,native_call_id,native_posttool_record_sha256,output_evidence_root}` | named TASK_WORK, SKILL_WORK or PARALLEL_WORK call IN_FLIGHT | paired successful PostTool plus canonical output evidence; call CONSUMED | normal frontier: ordinary work→QUALITY_GATE_PENDING, child work→DONE/all-DONE SUMMARY; failure-drain frontier: evidence-only consume with no successor until the aggregate decision |
| `issue-main-step` | `{phase_id,step_id,native_pretool_record_sha256}` | named MAIN_AGENT TOOL step dependency-ready with exact ISSUED step capability | graph/step/input/current cursor plus exact native PreTool | that step IN_FLIGHT only; cursor/evidence unchanged |
| `record-main-step` | `{phase_id,step_id,native_call_id,native_posttool_record_sha256,step_evidence_sha256}` | the same MAIN_AGENT TOOL step IN_FLIGHT | paired PostTool plus graph-bound output evidence; step CONSUMED | append immutable step evidence; next TOOL→fresh step cap, HUMAN_WAIT→typed presentation with no tool cap, all terminal→MAIN_AGENT_COMPLETION_READY |
| `complete-main-work` | `{phase_id,main_agent_evidence_root}` | MAIN_AGENT_COMPLETION_READY with every graph step terminal and declared output evidence valid | current ISSUED `main_agent_completion_capability`; controller re-derives graph/evidence root | QUALITY_GATE_PENDING with one phase quality capability |
| `issue-summary` | `{phase_id,native_pretool_record_sha256}` | SUMMARY_CAPABILITY_ISSUED after every child DONE | exact JOIN_SUMMARY call capability and live PreTool | SUMMARY_IN_FLIGHT only |
| `complete-summary` | `{phase_id,native_call_id,native_posttool_record_sha256,output_evidence_sha256}` | that SUMMARY call IN_FLIGHT | paired PostTool plus summary-only output evidence; call CONSUMED | normal frontier→persist JOIN_COMPLETE and mint quality; failure drain→evidence-only consume, no successor |
| `record-quality-gate` | `{phase_id,native_call_id,native_posttool_record_sha256,result_sha256}` | QUALITY_GATE call IN_FLIGHT | paired registered quality result; call CONSUMED | normal frontier: PASS/warning→PHASE_COMPLETION_READY, failure→typed wait; failure drain→evidence-only consume, no successor |
| `issue-final-quality` | `{native_pretool_record_sha256}` | FINAL_ASSERTIONS with final gate ISSUED and no phase/delta/wave/drain call | exact registered final-quality capability plus native quality-gate PreTool | FINAL_QUALITY_GATE_IN_FLIGHT with one native call ID |
| `record-final-quality` | `{native_call_id,native_posttool_record_sha256,final_assertion_evidence_root,result_sha256}` | FINAL_QUALITY_GATE_IN_FLIGHT | paired registered quality-gate PostTool/result; call CONSUMED | PASS→FINAL_QUALITY_GATE_VERIFIED plus one execution-finalize capability; failure/unknown→typed aggregate failure decision, no finalizer |
| `record-failure` | `{phase_id_or_final,child_id_or_empty,native_call_id,native_posttool_record_sha256,failure_evidence_sha256}` | one named work/preflight/main-step/summary/phase-quality/final-quality call IN_FLIGHT | paired terminal failure record; failed call CONSUMED/tombstoned; atomically suspend every native/non-native same-wave authority | residual released call(s)→PLAN_EXECUTION_FAILURE_DRAIN; none→typed PREFLIGHT_OVERRIDE or FAILURE_DECISION presentation from immutable policy; drain permits only paired terminal records and its last record stages the same preselected kind |
| `complete-phase` | `{phase_id}` | PHASE_COMPLETION_READY with all state-derived output/assertion/quality evidence present | current ISSUED `phase_completion_capability` | persist terminal evidence; another current-wave unit active→RUNNING; when the wave drains, a nonempty derived confirmation set→the first PHASE_CONFIRMATION wait, otherwise remaining DAG→BETWEEN_WAVES and whole DAG terminal→FINAL_ASSERTIONS + one FINAL_QUALITY_GATE capability |
| `advance-wave` | `{next_wave_sha256}` | BETWEEN_WAVES, no work/project/recovery capability and checkpoint not mandatory | current ISSUED `wave_choice_capability` | PLAN_EXECUTION_ACTIVE plus exactly the dependency-ready wave |
| `answer-wait` | `{wait_id,wait_sha256,answer_sha256_or_empty,decision}` | one VERIFIED PLAN_EXECUTION wait bound to current human event | current ISSUED `answer_capability`; answer bytes are read from attested state | the single §5.3 wait-table successor |
| `request-delta` | `{wait_id,wait_sha256,trigger_evidence_sha256,affected_phase_set_sha256}` | verified REPAIR/replan decision, no live phase call | current delta capability ISSUED | DELTA_IN_FLIGHT only after the registered Plan PreTool |
| `finalize-delta` | `{delta_capability_id,delta_finalize_capability_id,delta_result_id,delta_result_sha256}` | DELTA_RESULT_READY and UNFINALIZED | exact event-bound delta finalizer | DELTA_PRESENTATION_PENDING |
| `install-delta` | `{delta_result_id,delta_result_sha256,delta_install_capability_id}` | matching verified approval or drained-boundary install wait | exact event-bound install capability | one new immutable plan_execution; predecessor tombstoned |
| `checkpoint` | `{completed_phase_set_sha256,completed_evidence_root,next_wave_sha256}` | BETWEEN_WAVES, no work/project/recovery capability | current ISSUED `wave_choice_capability`; CHECKPOINT arm | CHECKPOINT_PRESENTATION with checkpoint ISSUED; no successor work authority |
| `finalize` | `{final_assertion_evidence_root,summary_base64,summary_utf8_length,summary_sha256}` | FINAL_ASSERTIONS with FINAL_QUALITY_GATE_VERIFIED and no live call | current ISSUED `execution_finalize_capability`; payload evidence root must equal the immutable registered-gate result and summary bytes pass bounded length/SHA checks | atomically store exact summary and enter PLAN_EXECUTION_COMPLETE_PENDING_STOP; controller executes no assertion, agent or shell |

`child_id_or_empty` is the exact child token for a parallel child, the exact step token only inside the
MAIN_AGENT_STEP capability preimage, and the required empty string otherwise;
`phase_id_or_final` is one exact phase token or the literal reserved `FINAL` only for FINAL_QUALITY_GATE;
`call_kind` is exactly the subset named in its row. `answer-wait.decision` is
`ANSWER|CONFIRM_PHASE|RETRY_PREFLIGHT|OVERRIDE_PREFLIGHT|RETRY|REPAIR|SKIP|TERMINATE`, further narrowed by the
persisted wait kind. ANSWER binds the already stored answer SHA; CONFIRM_PHASE binds the exact confirmation
queue head; OVERRIDE_PREFLIGHT binds the immutable waivable finding/policy; REPAIR requires its exact nonempty
revision-text SHA; and both retry variants, override, confirm, SKIP and TERMINATE require
`answer_sha256_or_empty=""`. These arm-specific enums/null
rules are JSON-Schema constraints, not controller guesses. Where a success cell names alternatives, a strict
result/decision discriminator selects exactly one subarm and next state; there is no implementation default.
For a PHASE_QUESTION ANSWER, the attester derives the one syntactic answer span and the controller persists the
complete `CollectedParameterAnswer` before consuming `answer_capability`; `answer_sha256_or_empty` must equal
that object's recomputed SHA field. The request carries no raw answer, option ID, event or boundary and cannot
replace the bytes already authenticated in state.
For a PLAN_EXECUTION_MAIN_AGENT_HITL ANSWER, the same request field must equal the state-derived
`MainAgentHumanAnswer.answer_sha256`; the controller builds and stores the complete answer object from the one
attested answer span before consuming the capability. The caller likewise supplies neither raw bytes nor an
option/event/boundary, and a hash-only object or transcript look-back is invalid. A crash after this rename and
before the next step leaves the DONE HUMAN_WAIT object and both recomputable roots authoritative; replaying the
answer event cannot create a second object or capability.

`begin_capability`, `phase_completion_capability`, `main_agent_completion_capability` and `answer_capability` are strict one-shot state objects
`{capability_id,action_sequence,verb,controller_input_sha256,current_event,current_boundary,status:ISSUED|CONSUMED}`.
They are minted only by the preceding atomic transition; their ID is
`H(LP("approved-plan-controller-action:v1")||LP(generation)||LP(session)||LP(obligation_id)||
LP(plan_execution_id)||LP(verb)||LP(controller_input_sha256)||LP(current_event)||LP(current_boundary)||
LP(decimal action_sequence))`, and the sequence never resets. For native issue/record arms, `authority_id` is
the exact call capability already named in the table; for delta arms it is the exact delta/finalize/install
capability. The controller verifies the native PreTool/PostTool record from the invocation lease and durable
hook evidence rather than trusting the supplied record hash. Direct CLI invocation, a wrong verb-capability,
wrong phase/owner/native call, stale current event/project identity, a second consume or any noncanonical arm
returns command-null and leaves all authority/evidence bytes unchanged. This table, not a permissive shared
parser, is the unique pre-state and successor oracle. The exact arms are executable `$defs.PlanExecutionRequest`
and `$defs.PlanTransferRequest` in the manifest-bound
`.claude/skill-os/approved-plan-execution.schema.json`; both controllers load those same bytes, and the new
`test-plan-controller-envelopes.mjs` iterates every discriminator rather than maintaining a second fixture list.

`wave_choice_capability` is a separate strict object
`{capability_id,action_sequence,completed_phase_set_sha256,completed_evidence_root,next_wave_sha256,checkpoint_required,
current_event,current_boundary,status:ISSUED|CONSUMED}` with ID
`H(LP("approved-plan-wave-choice:v1")||LP(generation)||LP(session)||LP(obligation_id)||
LP(plan_execution_id)||LP(completed_phase_set_sha256)||LP(completed_evidence_root)||LP(next_wave_sha256)||
LP(checkpoint_required?"1":"0")||LP(current_event)||LP(current_boundary)||LP(decimal action_sequence))`.
It is the only capability in BETWEEN_WAVES: mandatory checkpoint permits only `checkpoint`; otherwise exactly
one of `advance-wave|checkpoint` may consume it. No child/work call exists until advance succeeds.

`final_quality_gate` is a strict state oneOf. ISSUED is exactly
`{state:ISSUED,capability_id,owner_id,agent_contract_id,execution_contract_id,
final_assertion_set_sha256,native_call_id_or_empty:"",result_sha256_or_empty:"",
final_assertion_evidence_root_or_empty:"",tombstone:null}`; IN_FLIGHT requires the same keys, one native call
ID and an AWAITING_TERMINAL `APPROVED_FINAL_QUALITY` tombstone; VERIFIED requires empty capability/native-call
authority, the immutable registered quality result/evidence roots and a terminal tombstone. Its capability ID is
`H(LP("approved-plan-final-quality:v1")||LP(generation)||LP(session)||LP(obligation_id)||
LP(plan_execution_id)||LP(plan_result_id)||LP(final_assertion_set_sha256)||LP(owner_id)||
LP(agent_contract_id)||LP(execution_contract_id)||LP(current_event)||LP(current_boundary)||
LP(decimal capability_sequence))`. Only the exact registered quality-gate native call takes ISSUED→IN_FLIGHT→
VERIFIED. The result evidence root is recomputed from every sorted FINAL assertion ID, kind, level, verdict
`PASS|FAIL|UNKNOWN`, evidence SHA and quality-gate result SHA; a missing/duplicate assertion or any BLOCKING
FAIL/UNKNOWN cannot verify. Such a terminal non-PASS result consumes the native call, persists one
FAILED_SCOPE FINAL_QUALITY_RETRY successor and stages FAILURE_DECISION with `failure_scope=FINAL`; it never
mints a finalizer. RETRY/REPAIR/TERMINATE follow the FINAL-specific table, and SKIP is denied.

`execution_finalize_capability` exists only beside VERIFIED final quality and is exactly
`{capability_id,action_sequence,completed_evidence_root,final_assertion_set_sha256,
final_assertion_evidence_root,current_event,current_boundary,
status:ISSUED|CONSUMED}` with ID
`H(LP("approved-plan-execution-finalize:v1")||LP(generation)||LP(session)||LP(obligation_id)||
LP(plan_execution_id)||LP(plan_result_id)||LP(completed_evidence_root)||LP(final_assertion_set_sha256)||
LP(final_assertion_evidence_root)||LP(current_event)||
LP(current_boundary)||LP(decimal action_sequence))`. It intentionally does not pre-hash unknown summary bytes;
the first valid `finalize` request supplies bounded canonical-base64 summary bytes, and the controller verifies
their length/SHA and equality to the already-stored final-quality evidence before consuming the capability and
storing the summary atomically. It never executes assertions, a quality agent or shell internally.

Every phase-owned native call uses one formula, with
`call_kind=TASK_WORK|SKILL_PREFLIGHT|SKILL_WORK|PARALLEL_PREFLIGHT|PARALLEL_WORK|MAIN_AGENT_STEP|JOIN_SUMMARY|QUALITY_GATE`:

`call_capability_id=H(LP("approved-plan-call-capability:v1")||LP(generation)||LP(session)||
LP(obligation_id)||LP(plan_execution_id)||LP(plan_result_id)||LP(phase_id)||LP(call_kind)||
LP(child_id_or_empty)||LP(owner_id)||LP(agent_contract_id)||LP(execution_contract_id)||
LP(current_event)||LP(current_boundary)||LP(project_identity_sha256)||LP(input_sha256)||
LP(decimal capability_sequence))`.

Each takes exactly ISSUED→IN_FLIGHT(native_call_id)→CONSUMED through paired PreTool/PostTool. This formula and
the Owner binding, not a phase name or free-form Plan text, is the sole work/preflight/summary/quality authority.

MAIN_AGENT work never uses the one-call TASK_WORK/SKILL_WORK shortcut. Each such phase owns this strict object
at `phase_records[phase_id].main_agent_execution`:
`main_agent_execution={schema_version:1,phase_id,step_graph_sha256,parameter_input_sha256_or_empty,
cursor_sequence,steps,main_agent_human_answer_root,main_agent_evidence_root,ready_step_ids,
completion_capability_or_null}`. Each graph step has one strict arm:
TOOL=`{step_id,kind:TOOL,state:BLOCKED|CAPABILITY_ISSUED|IN_FLIGHT|DONE,dependencies,
capability_id_or_empty,native_call_id_or_empty,evidence_sha256_or_empty,tombstone_or_null}`;
HUMAN_WAIT=`{step_id,kind:HUMAN_WAIT,state:BLOCKED|PRESENTATION_PENDING|WAITING_HUMAN|DONE,dependencies,
wait_id_or_empty,wait_sha256_or_empty,human_answer_or_null}`. Non-DONE arms require `human_answer_or_null=null`;
DONE requires exactly one strict
`MainAgentHumanAnswer={schema_version:1,answer_base64,answer_utf8_length,answer_sha256,answer_event,
answer_boundary,option_id_or_empty,human_answer_sha256}` with `additionalProperties:false`. It uses the same
canonical padded RFC 4648/UTF-8 round-trip, manifest HumanInputSchema limit and free-text/closed-option rules as
`CollectedParameterAnswer`. Its identity is
`human_answer_sha256=H(LP("main-agent-human-answer:v1")||LP(plan_execution_id)||LP(phase_id)||LP(step_id)||
LP(wait_schema_id)||LP(answer_base64)||LP(decimal answer_utf8_length)||LP(answer_sha256)||LP(answer_event)||
LP(answer_boundary)||LP(option_id_or_empty))`. `main_agent_human_answer_root=H(LP("main-agent-human-answers:v1")||
LP(plan_execution_id)||LP(phase_id)||LP(decimal done_human_wait_count)||Σ[LP(sorted step_id)||
LP(human_answer_sha256)])`; the zero-count root is still explicit. A TOOL capability uses the universal call formula
with `call_kind=MAIN_AGENT_STEP`, `child_id_or_empty=step_id` and
`input_sha256=H(LP("main-agent-step-input:v1")||LP(step_graph_sha256)||LP(step_id)||
LP(parameter_input_sha256_or_empty)||LP(main_agent_human_answer_root)||LP(main_agent_evidence_root)||
LP(decimal cursor_sequence))`. The parameter field is
the exact terminal §5.3 root for a parameterized MAIN_AGENT SkillSpec and the required empty string for a task
or non-parameterized skill. At most one MAIN_AGENT TOOL call is live per phase.
`main_agent_evidence_root=H(LP("main-agent-evidence:v1")||LP(plan_execution_id)||LP(phase_id)||
LP(step_graph_sha256)||LP(decimal terminal_step_count)||Σ[LP(sorted step_id)||LP(kind)||
LP(step_evidence_or_human_answer_sha256)])`; cursor_sequence increments on every completed TOOL/HUMAN_WAIT and never
resets. Dependencies and ready set are controller-derived from the frozen graph. MAIN_AGENT execution is
serial even when multiple dependency-ready nodes exist: the unique next step is the lexicographically smallest
ready `step_id`; only it may own a capability/presentation, and recomputation after its terminal evidence chooses
the next. A graph or state with two simultaneous main-step authorities is invalid.

A ready HUMAN_WAIT atomically stages `PRESENTATION_PENDING(kind=PLAN_EXECUTION_MAIN_AGENT_HITL)` with exact
graph/phase/step/wait-schema/current-event bindings and no TOOL or completion capability. Its full-input answer
is captured from the one attested answer span into the complete `MainAgentHumanAnswer`, advances only that step
and recomputes both answer/evidence roots and the ready set in one rename; a generic continue never answers it.
Every successor MAIN_AGENT TOOL operating prompt injects the decoded prior human answers in sorted graph order
with step/wait-schema/option IDs, and its input capability binds the answer root. It never scans transcript
history or accepts only a digest.
Only when all graph steps are DONE and declared output baselines validate does the controller mint the separate
event-bound `main_agent_completion_capability`; `complete-main-work` consumes it and mints only the ordinary
phase quality gate. Thus two tools plus an intervening human wait remain inside one immutable Plan phase without
free skill prose broadening the cursor, and no first tool or answer can end work early.
The complete per-phase object, including every human answer preimage, remains in that terminal phase record until
the whole approved-plan execution becomes terminal; later MAIN_AGENT phases get distinct objects and cannot
overwrite it. `active_main_agent_phase_id_or_empty` is only a derived scheduling pointer and grants no authority.
Completed-phase evidence, failure/delta lineage and checkpoint transfer bind and carry these objects rather than
reducing them to answer hashes.

Only the main session may enter Orchestrator Free Task Mode. `begin` changes PENDING→ACTIVE and computes the
first dependency-ready wave. When project identity is NO_PIN, `begin` re-derives that every phase/child/output
and referenced contract is NO_PROJECT and intersects each call with empty project roots and
`projectMutation:false`; one project-scoped sibling rejects the whole execution before any call issues. A SERIAL Plan issues one phase capability; a PARALLEL/Supervisor/Hierarchical Plan
may issue one capability for each explicitly parallel, dependency-ready phase up to three. A normal task/skill
phase permits one in-flight work call. A `parallel_skill_execution` phase instead has one coordinator record and
2–3 fixed child records derived as
`H(LP("parallel-skill-child:v1")||LP(plan_execution_id)||LP(phase_id)||LP(child_id))`: every child first obtains
its own PREFLIGHT receipt; **all** preflights must be terminal before the strict §5.3 parameter queue is created,
and every queued child-addressable answer must then be terminal before any child work capability issues. A
parameterized group is the exclusive outer wave required by Plan admission, so its question state cannot coexist
with another phase/call. Each child capability binds that child's exact `work_owner_id`,
`agent_contract_id`, `execution_contract_id`, child ID and the unconditionally pairwise-disjoint output set; the same bijection applies to
ordinary task/skill work. The child capabilities then issue in one wave, each remains one-shot
and single-flight, and the entire plan execution—not each phase—has a hard maximum of three live native
work/skill child calls. Dependency-ready units are considered by lexicographic phase ID; a parallel group is an
atomic slot bundle and issues all children or none, while smaller later units cannot leapfrog a ready bundle.
Excess dependency-ready work remains READY. Only after every child has terminal DONE evidence may the controller
mint one `summary_capability_id` from the universal formula with `call_kind=JOIN_SUMMARY`, empty child ID,
the explicit summary Owner/contracts and `input_sha256=child_evidence_root`.
It binds the exact JOIN owner, current event/boundary, all child evidence hashes, aggregate output baseline,
the summary-only write template and join gate. That template is rechecked distinct from every child canonical
path before issue; no post-child action can repair or serialize a child overlap. `issue-summary` changes SUMMARY_CAPABILITY_ISSUED→SUMMARY_IN_FLIGHT and binds the
single native main-coordinator tool-call ID through PreTool; `complete-summary` is its paired PostTool, requires
the declared aggregate file to satisfy CREATED/MODIFIED evidence, consumes the capability once and stores its
hash before entering JOIN_COMPLETE. A stale/swapped owner, child evidence, native call, output path or reused
capability rejects. No controller synthesizes semantic prose. `complete-summary` records JOIN_COMPLETE evidence
and atomically mints the one phase quality gate over all child outputs plus that summary; no other state may
issue it. A child BLOCKED cancels unissued siblings, retains released-call
tombstones, and enters the same verified failure/replan decision as an ordinary phase unless the exact
PREFLIGHT policy admits the distinct override wait below. The approved phase ID,
children, outputs and join gate never change or expand into hidden phase IDs.

Successful TASK/SKILL/PARALLEL work never advances implicitly in PostTool. The paired `record-work` arm verifies
the exact native call, controller-derived output baseline/diff and declared output root, then consumes the work
call once. Ordinary task/skill work mints only its QUALITY_GATE call; a parallel child becomes DONE, and only
the all-DONE predicate mints JOIN_SUMMARY. Wrong/unchanged evidence, a second PostTool or one child's evidence
used for another child is terminally rejected and cannot mint successor authority. If a sibling failure has
already installed `drain_frontier`, the same paired completion records evidence only; the aggregate human
decision is the sole point that may reconstruct its saved successor.

Every `skill_execution` phase likewise runs its mandatory PREFLIGHT owner and parameter collection before its
main-agent/subagent work. An interactive MAIN_AGENT skill then follows only its manifest step graph; HUMAN_WAIT
steps stage the verified question/confirmation and headless fallback cannot answer them. A Work Agent, parallel child,
preflight, MAIN_AGENT step, JOIN summary or quality-gate dispatch must match its exact Owner, agent contract and execution-contract
ID in the approved Plan plus the closed agent registry and is paired by native tool-call ID across
PreTool/PostTool; direct main-agent tools use
the same per-tool CAS described below. In either case the phase capability intersects, never expands, the
Plan's closed tool classes/read roots/write templates with the ordinary project guard and any referenced
manifest execution contract. `begin` snapshots every declared output with the same no-follow existence/dev/ino/
size/SHA baseline and CREATED/MODIFIED/REUSE_VALIDATE distinctions used below; every receipt is phase-local. A
phase may advance only after every declared output/gate and every assertion whose exact `phase_id` equals that
phase has strict phase-local evidence, every dependency phase is already terminal PASS, and the quality-gate
result is PASS, or CONDITIONAL_PASS only when that phase's immutable policy allows warning-only findings. FINAL-bound
assertions run only after all phases terminate and accept PASS only. A BLOCKING failure enters the verified
failure/delta-replan path below; it never skips the phase by default. Human checkpoints store
and byte-prove their exact presentation, then a fresh attested answer either resumes the same phase or creates a
new Plan capability; no generic continue silently approves.

A registered preflight FAIL takes one of two disjoint paths. A finding whose exact registry policy is DENY,
whose class is not in the immutable allowlist, or whose severity is safety/integrity/irreversible/project-identity
uses the ordinary phase-failure decision. Otherwise the controller first drains every released sibling and
stages `PLAN_EXECUTION_PREFLIGHT_OVERRIDE`; its strict context binds phase/child, finding/result/policy hashes,
retry count, the complete suspended-successor set, the immutable question-source Plan hash and display SHA;
`parameter_queue` is required JSON null because every preflight precedes queue creation.
`重试检查 <wait_sha256>` reissues that same PREFLIGHT once plus every exact suspended authority and restores
evidence-only successors. `跳过检查 <wait_sha256>` replaces only FAILED_SCOPE with a
`PREFLIGHT_OVERRIDDEN` phase-evidence leaf, restores the same evidence-only successors, reissues the remaining
saved authority under the global cap and resumes the same preflight/parameter frontier; it neither writes PASS
nor marks PHASE_WAIVED. The override is forbidden after its configured retry limit or for any unlisted
finding. For a parallel group, resumed work remains blocked until every child has PASS or OVERRIDDEN evidence
and the full parameter queue is terminal.
The presentation names the immutable finding and offers only those two hash-bound controls; a free-text
`跳过检查`, phase SKIP or generic continue cannot select the override.

`complete-phase` never issues the next phase directly. If another unit in the already-issued current wave is
still active, it stores the named phase as PHASE_CONFIRMATION_PENDING when the derived policy requires a receipt
or PHASE_COMPLETE otherwise, and preserves that unit's pre-existing authority. A pending-confirmation phase is
terminal for tool scheduling but absent from `completed_phase_ids` and cannot satisfy a dependency. Only
after the current wave drains does it derive the exact post-wave confirmation set. A nonempty set stages the
lexicographically first `PLAN_EXECUTION_PHASE_CONFIRMATION` wait and owns no work/wave/final authority. Each
fresh `继续下一阶段 <wait_sha256>` receipt confirms exactly the queue head and either stages the next head or,
when the queue is exhausted, continues the state-derived branch below. With no pending confirmation and
remaining DAG work, the controller publishes BETWEEN_WAVES and the sole wave-choice capability after computing
the exact dependency-ready next-wave hash; mandatory context
checkpoint marks that choice `checkpoint_required=true`. `advance-wave` is the only transition that creates
the next phase/preflight capabilities, and it is forbidden in a mandatory checkpoint cell. With no remaining
phase, complete-phase enters FINAL_ASSERTIONS and mints only the registered final-quality native-call authority.
Its paired result must verify every closed FINAL SHELL/CRITERION assertion before it mints execution-finalize
authority; `finalize` only checks that stored evidence root plus bounded summary bytes and enters the Stop-proved
completion state in one rename. There is no controller-side assertion execution or separate unreachable
SUMMARY_STAGED precondition.

The boundary/project admission states are total. `PLAN_EXECUTION_WAITING_BOUNDARY` has a byte-verified display,
contains no phase/tool capability and may Stop only for its creating event. SAME/DIFFERENT_UNPROVEN status or
continue re-presents it; task cancel/new task supersedes it; only the first DIFFERENT_DRAINED bare continue or
exact approval continuation atomically opens/refreshes A, revalidates the immutable scope summary and enters
PENDING. Cancel/new task supersedes the approved execution. `PLAN_PROJECT_REQUIRED` is a route presentation,
not a plan-execution state or capability; no Project Gate answer, terminal B/C event or NO_PIN state can issue a
phase from that unapprovable result.

Blocking failure uses one closed lifecycle rather than prose. The first retryable failure atomically revokes
every ISSUED native and non-native same-wave authority. If another released call exists, it first enters
PLAN_EXECUTION_FAILURE_DRAIN; only paired terminal records are accepted, no prompt/Stop/project action or
successor is accepted, and each result appends one strict successor record while the last verifies the complete
`suspended_successor_sha256`. An exact waivable preflight stages
`PRESENTATION_PENDING(target=PLAN_EXECUTION_WAITING_HUMAN,kind=PLAN_EXECUTION_PREFLIGHT_OVERRIDE)`; every other
phase failure stages kind `PLAN_EXECUTION_FAILURE_DECISION` with aggregate findings and choices
`RETRY|REPAIR|SKIP|TERMINATE`; the creating event alone may Stop after proof. RETRY is allowed once only when the
approved bytes, phase inputs and project identity are unchanged. REPAIR after the second BLOCKING failure, a
BLOCKED/NEEDS_CONTEXT result, or any approach/file/dependency change atomically revokes unissued capabilities,
retains released-call tombstones and enters `PLAN_EXECUTION_REPLAN_PENDING`. SKIP is accepted only for assertions
whose immutable `human_waivable=true`; it creates `PHASE_WAIVED` evidence and forces the final result to
DONE_WITH_CONCERNS, never fabricates PASS. TERMINATE creates a terminal CANCELLED execution and summary.

`REPLAN_PENDING` increments a source-session monotonic `delta_sequence` and issues exactly one read-only Plan
Agent delta capability whose input binds the predecessor plan/result/execution IDs and SHAs, trigger/failure
receipts, completed-phase evidence root, affected-phase set, current project identity, current event/boundary and
immutable unaffected phase/status map plus the complete retained parameter and per-phase MAIN_AGENT human-answer
contexts. The registered delta Plan prompt receives the decoded answer bytes with their schema/phase/step/event
metadata, never roots alone; `retained_human_context_root` is recomputed from those strict objects:

`retained_parameter_contexts` is the phase-ID-sorted, duplicate-free array (maximum 64) of every retained
terminal/nonterminal parameter queue object and input SHA; its root is
`retained_parameter_context_root=H(LP("approved-plan-delta-parameter-context:v1")||
LP(predecessor_plan_execution_id)||LP(decimal count)||Σ[LP(phase_id)||LP(queue_sha256)||
LP(collected_answer_root)||LP(parameter_input_sha256)])`. `retained_main_agent_human_contexts` uses the complete
§5.4 object/root framing over every retained predecessor MAIN_AGENT phase. Then
`retained_human_context_root=H(LP("approved-plan-delta-human-context:v1")||
LP(predecessor_plan_execution_id)||LP(retained_parameter_context_root)||
LP(retained_main_agent_human_context_root))`.

`delta_capability_id=H(LP("approved-plan-delta-capability:v1")||LP(generation)||LP(session)||
LP(obligation_id)||LP(predecessor_plan_execution_id)||LP(predecessor_plan_result_id)||
LP(trigger_evidence_sha256)||LP(affected_phase_set_sha256)||LP(preserved_phase_evidence_sha256)||
LP(retained_human_context_root)||LP(project_identity_sha256)||LP(decimal delta_sequence)||
LP(current_event)||LP(current_boundary))` and
`delta_tool_call_challenge=H(LP("approved-plan-delta-call:v1")||LP(delta_capability_id)||
LP(decimal delta_sequence))`. The strict capability is
`{delta_capability_id,delta_sequence,generation,session,obligation_id,predecessor IDs/SHAs,
trigger/affected/completed/unaffected/project hashes,retained_parameter_contexts,
retained_main_agent_human_contexts,retained_human_context_root,current_event,current_boundary,tool_call_challenge,
status:ISSUED|IN_FLIGHT|CALL_CONSUMED}`. Exact registered Plan Agent PreTool CASes ISSUED→IN_FLIGHT and binds one
native call ID; no generic Agent or caller-supplied ID is accepted.

Paired PostTool first attests pending steering, verifies that native call/challenge and strict result bytes,
then computes `delta_result_sha256` over the strict canonical result bytes and
`delta_result_id=H(LP("approved-plan-delta-result:v1")||LP(delta_capability_id)||
LP(native_call_id)||LP(delta_result_sha256))`. In one rename it stores immutable
`delta_result={delta_result_id,delta_capability_id,native_call_id,delta_result_sha256,canonical_base64}`, changes the
call to CALL_CONSUMED, creates
`delta_result_finalization={delta_result_id,status:UNFINALIZED|FINALIZED|SUPERSEDED,
finalized_by:null|delta_finalize_capability_id}` and
increments a never-reused `delta_finalize_sequence` to mint
`delta_finalize_capability_id=H(LP("approved-plan-delta-finalize:v1")||LP(generation)||LP(session)||
LP(obligation_id)||LP(predecessor_plan_execution_id)||LP(delta_result_id)||LP(current_event)||
LP(current_boundary)||LP(decimal delta_finalize_sequence))`. A steering event may rotate only an unused
event-bound finalizer; it never rewrites the immutable delta result or revives the consumed call. A stale/revoked
PostTool is recorded as REJECTED_STALE_DELTA_RESULT and creates no installation authority.

The manifest member `.claude/skill-os/plan-delta-result.schema.json` accepts only:

```text
DeltaPlan = {schema_version:1,capability_id,generation_id,session_id,obligation_id,
  predecessor_plan_result_id,predecessor_result_sha256,predecessor_plan_execution_id,
  trigger_evidence_sha256,affected_phase_ids,preserved_phase_evidence_sha256,
  replacements:[Phase],replacement_u_blocks:[UBlock],replacement_source_coverage:[SourceCoverage],
  replacement_assertions:[Assertion],replacement_final_quality_gate:FinalQualityGate|null,
  rollback_actions:[Rollback],approval_required:boolean,
  approval_reason:string,delta_markdown:string,self_checks:[SelfCheck]}
```

`affected_phase_ids` is a sorted unique union of existing phase IDs and, only when
`failure_scope=FINAL`, the reserved literal `FINAL`. A FINAL-only delta has exactly `[FINAL]`, preserves every
terminal phase/evidence byte, uses `replacements=[]`, and may replace only FINAL assertions plus
the required non-null `replacement_final_quality_gate`; without FINAL that field must be null. A mixed delta may include FINAL only when at least
one affected phase change mechanically changes its FINAL coverage. `FINAL` is forbidden in every phase field,
dependency and ordinary phase failure. `affected_phase_set_sha256` frames this closed union, so FINAL repair
cannot be encoded as an empty/implementation-guessed phase set.

`capability_id` in those result bytes is a controller-verifiable echo; `delta_result_id` is forbidden because it
depends on the final result hash and native call ID and is computed only by paired PostTool. Before an approved
or drained install, `finalize-delta` first applies the replacement to an immutable effective-Plan view and runs
the same §5.3 capacity analyzer. It stores strict
`delta_plan_admission={schema_version:1,delta_result_id,state_capacity_admission,
delta_plan_admission_sha256,status:ADMITTED|CAPACITY_REJECTED}` where
`delta_plan_admission_sha256=H(LP("approved-plan-delta-admission:v1")||LP(predecessor_plan_execution_id)||
LP(delta_result_id)||LP(state_capacity_admission.admission_sha256)||LP(delta_plan_admission.status))`.
CAPACITY_REJECTED consumes the
delta finalizer, keeps the result as non-authorizing evidence and returns to REPLAN_PENDING with one fresh delta
capability bound to the exact capacity concern; it cannot stage a display or installation authority. For an
ADMITTED result, the controller increments a never-reused `delta_install_sequence` and mints
`delta_install_capability_id=H(LP("approved-plan-delta-install:v1")||LP(predecessor_plan_execution_id)||
LP(delta_result_id)||LP(delta_result_sha256)||LP(delta_plan_admission_sha256)||LP(current_event)||LP(current_boundary)||
LP(project_identity_sha256)||LP(decimal delta_install_sequence))`. The three authority-bearing verbs decode
exactly these key sets and no others:

`delta_install_capability={delta_install_capability_id,delta_install_sequence,generation,session,
obligation_id,predecessor_plan_execution_id,delta_result_id,delta_result_sha256,current_event,current_boundary,
delta_plan_admission_sha256,project_identity_sha256,status:ISSUED|CONSUMED}`; it is absent before the verified approval/boundary event and
cannot be caller-minted.

```text
request-delta.payload  = {wait_id,wait_sha256,trigger_evidence_sha256,affected_phase_set_sha256}
finalize-delta.payload = {delta_capability_id,delta_finalize_capability_id,delta_result_id,delta_result_sha256}
install-delta.payload  = {delta_result_id,delta_result_sha256,delta_install_capability_id}
```

These are exactly the §5.3 `PlanExecutionRequest` payload arms, not alternate top-level request shapes.
Session/obligation/execution/event/boundary and authority ID occur only in the common envelope;
predecessor/project/sequence fields are derived from state and are forbidden in payload.

`finalize-delta` consumes only the current ISSUED finalizer, marks the separate envelope FINALIZED and, only
after ADMITTED capacity, stages the immutable display; `install-delta` consumes only that FINALIZED lineage after its exact display plus required
approval/drained continuation; that continuation creates the event/bound install capability, so the install
request cannot choose event/boundary/approval fields. Wrong/reordered keys, native call, finalizer, predecessor,
install capability or second finalize/install deny without changing the predecessor.

The only lifecycle is `REPLAN_PENDING→DELTA_CAPABILITY_ISSUED→DELTA_IN_FLIGHT→DELTA_RESULT_READY→
DELTA_PRESENTATION_PENDING→WAITING_DELTA_APPROVAL|WAITING_DELTA_BOUNDARY→
DELTA_INSTALL_CAPABILITY_ISSUED→new plan_execution`. Steering may rotate an unused finalizer/install
capability onto a fresh attested event, but never a native call, immutable result or predecessor evidence.

Validation forbids changing any completed/unaffected phase ID, bytes, status or evidence; an in-place repair
keeps the phase ID, a split uses only `<old>-a|b|c`, dependencies remain acyclic, and all new/changed assertions
bind an affected phase or FINAL. The delta markdown is exactly one append-only `Replan R-N` section; the old
plan/result remains immutable lineage evidence. `approval_required` is only an echo: the controller derives it
from the canonical old/new diff and rejects false whenever files/read/write/tool/agent scope expands, an
irreversible operation/human gate is added, an approved decision changes, or externally visible phase order
changes. A true echo may be conservative; a false echo cannot lower the derived result. Changing completed
evidence, task bytes or project identity rejects rather than asking for approval. Paired PostTool/finalize first stages
`PLAN_EXECUTION_DELTA_PRESENTATION_PENDING`. Stop proves the exact delta display. If
`approval_required=true` (new irreversible operation or changed approved decision), it becomes
`PLAN_EXECUTION_WAITING_DELTA_APPROVAL` and only `批准增量计划 <delta_result_sha256>` mints the
event-bound install capability consumed by `install-delta`. Otherwise the
proved display becomes `PLAN_EXECUTION_WAITING_DELTA_BOUNDARY`; only a DIFFERENT_DRAINED full-input
`继续执行增量计划 <delta_result_sha256>` mints the install capability, while SAME/unproven re-presents.
Installation derives a new
`plan_execution_id=H(LP("approved-plan-delta:v1")||LP(old_execution_id)||LP(delta_result_id)||
LP(delta_plan_admission_sha256)||LP(install_event)||LP(project_identity_sha256))`, reruns the exact admission
against current manifest/state bytes, carries the admitted object plus only completed/unaffected evidence, reinitializes the
affected phase records, tombstones the predecessor and resumes at the dependency-ready wave.
Unchanged/completed phases carry their full queue/MAIN_AGENT objects. Replaced affected phases move their exact
objects into immutable `plan_lineage.retired_human_contexts` with the same root; they grant no work authority but
remain available to the approved delta prompt and crash/scope/transfer validation until final terminal cleanup.
For the exact FINAL-only arm, all phase evidence remains completed, no phase record/wave is reinitialized, and
the new execution enters FINAL_ASSERTIONS with only the replacement registered final-quality capability.
Any FINAL-only install that issues phase work, or any phase delta that bypasses its dependency-ready wave, is
invalid. Delta
request/call/result/finalizer, presentation, approval and install each have pre/post rename crash barriers and
are one-shot; wrong-call/result/finalizer, duplicate result, rotated-event finalizer and two-install mutants must
turn red. No same-event display can approve itself.

The failure wait accepts only full-input controls `重试阶段 <wait_sha256>`,
`重规划阶段 <wait_sha256>：<text>`, `跳过阶段 <wait_sha256>` or `终止计划 <wait_sha256>`. Wrong SHA,
mixed project/task content or quoted/report text is not a decision. SKIP additionally requires
`human_waivable=true`, no safety/irreversible BLOCKING gate and an explicit Plan phase skip policy; otherwise it
is denied and the wait is re-presented. When `failure_scope=FINAL`, SKIP is always denied (there is no phase to
waive); RETRY may reissue only FINAL_QUALITY_RETRY once, REPAIR enters delta replan against the FINAL assertion
set, and TERMINATE cancels. The wait successor table is generated across `PHASE|FINAL` so a phase-only
PHASE_WAIVED transition cannot be selected for FINAL.

The Orchestrator's mandatory >80% context checkpoint is a cross-session authority transfer, never a copied
session capability. It is allowed only in BETWEEN_WAVES with no ISSUED/IN_FLIGHT child, preflight,
quality-gate, project or recovery capability. The sole wave-choice capability is not successor work authority;
`checkpoint` consumes it before incrementing a never-reused source-session `checkpoint_sequence`. No successor
phase capability has yet existed, so checkpoint does not claim to revoke one. It writes this strict
controller-computed object:

```text
plan_checkpoint = {schema_version:1,checkpoint_id,checkpoint_sequence,source_sid,generation,
  source_event,source_boundary,source_plan_execution_id,source_plan_result_id,source_result_sha256,source_obligation_id,
  exact_task_sha256,completed_phase_set_sha256,completed_evidence_root,pending_graph_sha256,
  next_wave_sha256,route_obligation_sha256,delta_chain_root,project_identity_sha256,
  source_checkpoint_core_sha256,state_capacity_admission_sha256,transfer_security_reserve_bytes:4096,cancellation_reservation,
  presentation_id,presentation_challenge,presentation_sha256,
  status:ISSUED|PRESENTED|CLAIM_COMMITTING|CLAIMED|CANCELLED,
  presented_by_stop_event?,claim_target_sid?,claim_event?,claim_boundary?,checkpoint_claim_root?,
  target_state_sha256?,journal_commit_sha256?,from_status?,cancel_event?,cancel_boundary?,cancel_reason?}
```

The live checkpoint is owned only by the current approved-plan route arm. A source session also has one
top-level, non-authorizing retained store:

```text
cancelled_plan_checkpoints = {schema_version:1,entries,overflow_terminal_or_null,archive_root}
CancelledPlanCheckpointArchiveEntry = {
  schema_version:1,entry_sha256,checkpoint  # checkpoint is the complete strict CANCELLED plan_checkpoint
}
CancellationReservation = {
  schema_version:1,reservation_sha256,slot_kind:ENTRY|OVERFLOW,slot_index_or_empty,
  archive_root_before,state_capacity_admission_sha256,transfer_security_reserve_bytes:4096,max_cancelled_state_bytes,
  normal_state_cap:2093056
}
```

`entries` is in strictly increasing, duplicate-free checkpoint-sequence order, maximum eight. An entry's
checkpoint must name that source sid/generation, have status CANCELLED and pass the complete oneOf below;
live/nonterminal/CLAIMED/TRANSFERRED checkpoints are forbidden. Its identity is
`entry_sha256=H(LP("approved-plan-cancelled-checkpoint-entry:v1")||LP(checkpoint_id)||
LP(source_checkpoint_core_sha256)||LP(source_cancelled_record_sha256))` using the CANCELLED record identity
defined immediately below. `overflow_terminal_or_null` is either null or one complete
`CancelledPlanCheckpointArchiveEntry`; it may be non-null only after exactly eight ordinary entries and is
never counted as a ninth entry. No checkpoint ID/sequence/entry hash may occur in both arms. The archive identity is
`archive_root=H(LP("approved-plan-cancelled-checkpoint-archive:v1")||LP(source_sid)||LP(generation)||
LP(decimal entry_count)||Σ[LP(entry_sha256)]||LP(overflow_entry_sha256_or_empty))` in entry order. Both values
are controller-derived and every read recomputes the full nested object. An absent store has exactly the derived
zero-entry/null-overflow root for reservation comparison; cancellation materializes the strict store. It is not
an unknown wildcard or permission to scan another file.

`checkpoint` may mint a live checkpoint only after deriving a cancellation reservation under the source lock.
With fewer than eight entries it deterministically reserves `ENTRY` at `slot_index_or_empty=<entry_count>`;
with eight entries and null overflow it reserves `OVERFLOW` with the required empty index. An already occupied
overflow means the sid is ROTATION_REQUIRED and no checkpoint/wave capability can exist, so there is no third
arm. The reservation binds the then-current archive root, the admitted capacity analysis and the maximum
serialized cancellation successor:
`reservation_sha256=H(LP("approved-plan-checkpoint-cancellation-reservation:v1")||
LP(source_checkpoint_core_sha256)||LP(slot_kind)||LP(slot_index_or_empty)||LP(archive_root_before)||
LP(state_capacity_admission_sha256)||LP("4096")||LP(decimal max_cancelled_state_bytes)||LP("2093056"))`.
For ENTRY the bound maximum includes the complete CANCELLED record plus the largest legal fresh ordinary route
successor and must be at most 2,093,056 bytes. For OVERFLOW it includes the complete terminal record and the
fixed ROTATION deny; non-deny content remains at most 2,093,056 and the whole serialized state at most
2,097,152. The controller derives these values by the exact admission analyzer, reserializes the concrete
would-be successor before commit and refuses checkpoint creation—without consuming the wave choice—if the
reservation cannot be proven. The same reservation ring-fences the 4,096 transfer-security bytes from all
ordinary source growth until claim or cancellation; cancellation releases it, while PREPARED materializes it.
A live checkpoint without this exact reservation, or
`ROTATION_REQUIRED` coexisting with ISSUED/PRESENTED checkpoint authority, is schema-invalid.

ENTRY cancellation appends the complete record and may install its ordinary route successor in the same source
rename. OVERFLOW cancellation instead removes/revokes the live checkpoint, stores the complete CANCELLED record
in `overflow_terminal_or_null`, tombstones the source execution, sets
`ROTATION_REQUIRED(CANCELLED_CHECKPOINT_ARCHIVE_FULL)` and emits only the bounded non-authorizing diagnostic
“取消已提交；归档已满，请在新会话重新发送该请求。” It installs no route/project command or capability from
that event. Thus cancellation is never left live merely because the archive is full. v3 never evicts or compacts
either retained arm online; the old source-session file remains the immutable cleanup oracle after rotation.

Every status arm requires the identical complete `state_capacity_admission_sha256` and
`cancellation_reservation`; neither presentation rotation nor cancellation/claim may rewrite them. The status
is a JSON-Schema `oneOf`: ISSUED forbids every presented/claim/target/cancel field; PRESENTED requires
only `presented_by_stop_event`; CLAIM_COMMITTING additionally requires the exact claim target/event/boundary/root;
CLAIMED requires those plus target state and journal commit hashes. CANCELLED is a nested `oneOf`: both arms
require cancel event/boundary/reason and forbid every claim/target field; `from_status=ISSUED` forbids a
presentation receipt, while `from_status=PRESENTED` requires the retained receipt. Only ISSUED or PRESENTED may become CANCELLED; once CLAIM_COMMITTING, unrelated
prompt/cancel is durably REJECTED_BUSY and recovery completes the same claim.
`cancel_reason` is the closed enum `PROJECT_INTENT|TASK_CANCEL|TASK_SUPERSEDE`; it is never free text. Any event
with an admissible project directive, including a combined project+task event, uses PROJECT_INTENT; a pure exact
task cancel uses TASK_CANCEL; a pure correction/new-task supersession uses TASK_SUPERSEDE. A mixed event outside
the one admissible combined grammar is ambiguous and cannot cancel. The
complete CANCELLED arm, including retained presentation proof when required, is immutable inside that
source-session archive for the source v3 lifetime and is the only authority for target cleanup.
Its canonical record identity is defined once here:
`source_cancelled_record_sha256=H(LP("approved-plan-checkpoint-cancelled:v1")||LP(checkpoint_id)||
LP(source_checkpoint_core_sha256)||LP(cancellation_reservation.reservation_sha256)||
LP(from_status)||LP(presented_by_stop_event_or_empty)||
LP(cancel_reason)||LP(cancel_event)||LP(cancel_boundary))`.

Checkpoint project intent has one higher-precedence policy and is never encoded as a scope-resume snapshot.
While the checkpoint is ISSUED/PRESENTATION_PENDING/PRESENTED (`PLAN_EXECUTION_CHECKPOINT_PRESENTATION` or
`PLAN_EXECUTION_TRANSFER_READY`) and before CLAIM_COMMITTING, any authenticated project directive atomically
removes the live checkpoint, materializes its complete strict CANCELLED arm with reason `PROJECT_INTENT` in its
pre-reserved ENTRY/OVERFLOW slot and tombstones the source approved execution in **one source-session rename**.
ENTRY additionally installs the fresh ordinary route result in that rename; OVERFLOW follows the terminal
rotation successor above and deliberately installs none. Before that rename every old live byte remains
authoritative; after it, only the retained entry is the cancellation oracle. No external transfer file is touched and there is no
intermediate state in which both old transfer authority and fresh routing are live. The same event is classified
by the ordinary project matrix inside that transition. A current-target selection with no mutation creates a fresh
project-bound PENDING/CLASSIFY_ISSUED obligation. SWITCH/NEW/DEACTIVATE creates the ordinary D/S composition
with a **fresh CLASSIFY_ISSUED** route snapshot, never a checkpoint/display/execution snapshot, and successful
commit follows ordinary project rebind. No transfer claim or wave authority survives cancellation. A target
sid may already hold a non-capability `deferred_plan_claim`; the source does not scan or mutate unknown target
sessions. On that target's next security hook, exact source archived CANCELLED checkpoint/core read-back atomically
tombstones and removes only the matching deferred claim, persists the strict non-authorizing
receipt in `deferred_plan_claim_cleanup_receipts` below, and resumes ordinary target routing with no imported task/execution
authority. The source archive entry is immutable and retained for the v3 session lifetime; normal routing and
the recovery ledger cannot compact it. Under the target session lock, the hook performs the §7 bounded
no-follow read of the exact source-session document named by `source_sid`, with dev/ino/size/mtime recheck,
selects exactly one matching record across ordinary entries and overflow by checkpoint ID, recomputes its
core/reservation/cancel/entry/archive hashes and verifies
the exact target claim hash, then CASes that same unchanged claim while storing the receipt and clearing it in
one target rename. It never reads `.claude/.plan-transfers` for pre-claim cancellation. It takes no source lock
and mints no authority; a concurrent source rename makes the read retry or fail closed, while the retained
entry prevents a later rewrite from changing the verdict. Wrong, missing, duplicate, compacted or unreadable
source bytes fail closed without clearing the claim.
Once
CLAIM_COMMITTING/CLAIMED or a nonterminal transfer journal exists, project intent is REJECTED_BUSY and cannot
cancel, snapshot or supersede the transfer. This overlay is evaluated before §8 route×project composition and
is generated into that total table; no checkpoint/display resume subphase is a legal
`scope_resume_snapshot` arm.

The exact fresh-target `PLAN_TRANSFER_CLAIM_WITH_PROJECT` full-input grammar is the sole exception and is
recognized by the claim overlay **before** PROJECT_INTENT cancellation; its project transaction exists to meet
the checkpoint's target binding and does not cancel the source. Any non-exact claim-like text or ordinary
project directive in the source sid takes the cancellation policy above. Golden fixtures distinguish these two
orders so the source checkpoint cannot be cancelled by its legitimate target claim or retained by ordinary
source project steering.

All identity bytes use SHA-256 and the same decimal/UTF-8 LP framing as the rest of this plan:

`source_checkpoint_core_sha256=H(LP("approved-plan-checkpoint-core:v1")||LP(generation)||
LP(source_sid)||LP(source_event)||LP(source_boundary)||LP(source_plan_execution_id)||
LP(source_plan_result_id)||LP(source_result_sha256)||
LP(state_capacity_admission_sha256)||LP(source_obligation_id)||LP(exact_task_sha256)||LP(project_identity_sha256)||
LP(completed_phase_set_sha256)||LP(completed_evidence_root)||LP(pending_graph_sha256)||
LP(next_wave_sha256)||LP(route_obligation_sha256)||LP(delta_chain_root)||LP("4096")||
LP(decimal checkpoint_sequence))`;

`checkpoint_id=H(LP("approved-plan-checkpoint-id:v1")||LP(source_checkpoint_core_sha256))`;

`checkpoint_claim_root=H(LP("approved-plan-checkpoint-claim:v1")||LP(checkpoint_id)||LP(target_sid)||
LP(cancellation_reservation.reservation_sha256)||LP(claim_event)||LP(claim_boundary)||
LP(target_project_identity_sha256)||LP(decimal target_epoch_counter))`.

The controller, never the Plan Agent/caller, derives every hash/ID. Cross-harness golden vectors freeze field
order, UTF-8, empty NO_PROJECT identity and sequence encoding. The source changes to
`PLAN_EXECUTION_CHECKPOINT_PRESENTATION`; an exact
presentation tells the user to open a fresh session and send
the full-input `继续计划 <checkpoint_id>` for a NO_PROJECT plan, or
`进入 <canonical> 项目，继续计划 <checkpoint_id>` for a project-scoped plan. Source Stop requires that proof
and source execution can never resume locally. The second grammar first runs the ordinary alias/project
transaction and writes strict non-authorizing
`deferred_plan_claim={schema_version:1,claim_sha256,checkpoint_id,source_sid,target_session_id,
target_canonical,source_event,source_boundary,status:WAITING_PROJECT|WAITING_BOUNDARY}`. Its identity is
`claim_sha256=H(LP("approved-plan-deferred-claim:v1")||LP(checkpoint_id)||LP(source_sid)||
LP(target_session_id)||LP(target_canonical)||LP(source_event)||LP(source_boundary)||LP(status))` and is
recomputed after the sole WAITING_PROJECT→WAITING_BOUNDARY transition. It is not a route obligation or
execution capability. The target must
equal the checkpoint project; mismatch rejects. D/S and mutation/cleanup carry it byte-identically, only the
exact switch controller is allowed, and its project presentation states that import begins on the next proven
boundary. On the first DIFFERENT_DRAINED non-cancel/non-new-task event after committed cleanup, the claim overlay
runs before ordinary routing and begins the transfer transaction. A current matching project may claim directly
only on DIFFERENT_DRAINED; SAME/unproven stores D and presents the ordinary scope-drain boundary. The no-project
grammar has no D/S and enters the claim transaction directly. A wrong/missing project or extra task/control text rejects.

For each matching claim, target cleanup appends exactly one strict
`deferred_plan_claim_cleanup_receipt={schema_version:1,receipt_id,checkpoint_id,source_sid,target_sid,
source_checkpoint_core_sha256,source_cancelled_record_sha256,source_archive_entry_sha256,source_archive_root,
source_status:CANCELLED,
source_cancel_reason,source_cancel_event,source_cancel_boundary,target_claim_sha256,target_event,
target_boundary,status:CLEARED}`. Its `source_cancelled_record_sha256` is the already-defined source checkpoint
record identity above; the receipt ID is
`H(LP("approved-plan-deferred-claim-cleanup:v1")||LP(checkpoint_id)||LP(source_sid)||LP(target_sid)||
LP(source_cancelled_record_sha256)||LP(source_archive_entry_sha256)||LP(source_archive_root)||
LP(target_claim_sha256)||LP(target_event)||LP(target_boundary))`.
Every displayed field is required, bounded and in that H/LP scalar order; unknown fields reject. Receipts live
only in `deferred_plan_claim_cleanup_receipts={schema_version:1,checkpoint?,entries}`: `entries` is a
duplicate-free append order of at most 16 complete receipts and grants no authority. Before entry 17, a
deterministic transition compacts exactly the oldest eight full entries into
`checkpoint={through_count,last_receipt_id,chain_sha256}`, where
the initial chain is `H(LP("deferred-plan-claim-cleanup-chain:v1")||LP(target_sid)||LP(generation))`, an existing
checkpoint resumes from its stored chain, and each of those eight next links is
`H(LP(prior_chain)||LP(receipt_id)||LP(source_archive_entry_sha256)||LP(target_claim_sha256))`; exactly the
newest eight old full receipts plus the new receipt remain. No other compaction count/order is legal. The target
rename compares the complete claim bytes/hash, appends this receipt,
clears only that claim and appends no route capability. A replay/second clear with no matching claim is a
byte-preserving diagnostic, never a new receipt. This receipt ledger is disjoint from `recovery_ledger` and
cannot authorize recovery, routing or project access.

The checkpoint request is exactly the §5.3 common envelope plus
`checkpoint.payload={completed_phase_set_sha256,completed_evidence_root,next_wave_sha256}`; source execution,
event/boundary, sequence, project and computed IDs are state-derived and forbidden in payload. The separate
`PlanTransferRequest` root is a strict per-verb `oneOf`, never a shared target-shaped object:

- claim root exactly `{schema_version:1,verb:claim,checkpoint_id,target_session_id,target_event,
  target_boundary,authority_id,payload}`;
- recover root exactly `{schema_version:1,verb:recover,checkpoint_id,actor_session_id,actor_event,
  actor_boundary,authority_id,payload}`.

Its payload arms are only:

- `claim.payload={}`; the fresh attested target event mints a one-shot
  `transfer_claim_capability_id=H(LP("approved-plan-transfer-claim-capability:v1")||LP(checkpoint_id)||
  LP(checkpoint_claim_root)||LP(target_session_id)||LP(target_event)||LP(target_boundary)||
  LP(target_project_identity_sha256))`, which is
  `authority_id`. Legal pre-state is source `prompt_gate.phase=ATTESTED` with no pending/recovery/rotation marker,
  one PRESENTED checkpoint whose complete cancellation reservation still matches the current archive root and
  capacity admission and 4,096-byte source reserve, no matching ordinary/overflow CANCELLED record, plus a
  clean ATTESTED target with no authority, ordinary `ledger_admission=AVAILABLE`, and a prospective complete
  state whose mandatory 4,096-byte accumulator and complete capacity revalidate. Both source and target
  accumulators and previous-object hashes must validate before the claim-intent event is accepted or a
  capability is minted.
  `ROTATION_REQUIRED`, a missing/mismatched reservation or any already-retained matching record denies before
  journal creation. The fresh target event has already been stored once as an ordinary ACCEPTED event while
  minting the claim capability. Success alone enters the PREPARED journal/CLAIM_COMMITTING transition; it
  validates but never initializes/resets either accumulator and never writes that human event a second time.
- `recover.payload={journal_state_sha256}`; `authority_id` is the separate exact journal recovery capability.
  `actor_session_id` must equal exactly the journal source or target sid, and actor event/boundary must equal the
  fresh attested current event/boundary that minted the capability. Legal pre-state is one nonterminal matching
  journal with a proven-dead controller; success only resumes its unique next journal state.

Every root/payload key uses the same canonical order/caps as PlanExecutionRequest. All core, project, sequence,
claim-root, target-obligation and target-execution identities are state-derived/read-back values and forbidden
in payload. Wrong verb/capability, live owner, wrong/swapped actor/event/boundary, extra/missing key, second claim/recovery or caller-supplied computed
ID denies without journal/session mutation.

Transfer recovery authority is journal-derived, never caller-minted. `TransferJournal` is one strict
`additionalProperties:false` discriminated `oneOf`; every arm has exactly
`{schema_version:1,journal_id,checkpoint_id,generation,source_sid,target_sid,state,state_sequence,
source_preimage_sha256,target_preimage_sha256_or_empty,controller_owner_or_null,recovery_sequence,
recovery_capability_or_null,state_evidence,state_sha256}`. `state_sequence` is canonical decimal 0/1/2/3 for
PREPARED/TARGET_PUBLISHED/SOURCE_TOMBSTONED/COMMITTED and increments exactly once. `controller_owner` is the
strict `TransferControllerOwner={schema_version:1,owner_sha256,journal_id,generation,
owner_kind:CLAIM|RECOVERY,invocation_id,pid,process_start,boot_id,nonce,
started_state:PREPARED|TARGET_PUBLISHED|SOURCE_TOMBSTONED,
status:IN_PROGRESS}`. `pid` is canonical unsigned decimal; every other identity scalar uses the bounded native
grammar. CLAIM requires `started_state=PREPARED`; RECOVERY requires it equal the journal state whose dead owner
was replaced. It is a literal barrier enum, never a state hash or recursive derivation. Claim publishes it in
the PREPARED rename before any target/source mutation. `state_evidence` is exactly one:

- PREPARED: `{kind:PREPARED,claim_capability_id,checkpoint_claim_root,claim_event,claim_boundary,
  owner_publish_sha256,target_publish_receipt_sha256_or_empty:"",source_tombstone_receipt_sha256_or_empty:"",
  commit_receipt_sha256_or_empty:""}`;
- TARGET_PUBLISHED: `{kind:TARGET_PUBLISHED,claim_capability_id,checkpoint_claim_root,claim_event,
  claim_boundary,owner_publish_sha256,target_publish_receipt_sha256_or_empty,
  source_tombstone_receipt_sha256_or_empty:"",commit_receipt_sha256_or_empty:""}`, with the target receipt
  nonempty;
- SOURCE_TOMBSTONED: `{kind:SOURCE_TOMBSTONED,claim_capability_id,checkpoint_claim_root,claim_event,
  claim_boundary,owner_publish_sha256,target_publish_receipt_sha256_or_empty,
  source_tombstone_receipt_sha256_or_empty,commit_receipt_sha256_or_empty:""}`, with both prior receipts
  nonempty;
- COMMITTED: `{kind:COMMITTED,claim_capability_id,checkpoint_claim_root,claim_event,claim_boundary,
  owner_publish_sha256,target_publish_receipt_sha256_or_empty,source_tombstone_receipt_sha256_or_empty,
  commit_receipt_sha256_or_empty}` with all three receipts nonempty; controller_owner and recovery_capability
  are required null. Despite its compatibility field name, `target_preimage_sha256_or_empty` is required
  nonempty in all four arms and binds the clean target bytes observed before PREPARED; an empty value is invalid.

Every arm forbids evidence from a later barrier. Nonterminal arms require one exact controller owner record;
the PREPARED evidence `owner_publish_sha256` equals the first CLAIM owner's `owner_sha256` and later evidence
retains that immutable scalar. Owner identity is exactly
`owner_sha256=H(LP("plan-transfer-controller-owner:v1")||LP(journal_id)||LP(generation)||LP(owner_kind)||
LP(invocation_id)||LP(decimal pid)||LP(process_start)||LP(boot_id)||LP(nonce)||LP(started_state)||
LP("IN_PROGRESS"))` in that displayed order.

`recovery_capability_or_null` is either JSON null or one strict
`TransferRecoveryCapability={schema_version:1,capability_sha256,capability_id,recovery_sequence,journal_id,
checkpoint_id,generation,source_sid,target_sid,journal_state,recovery_basis_state_sha256,dead_owner_sha256,
actor_session_id,current_event,current_boundary,next_step,status:ISSUED|CONSUMED}`. `actor_session_id` is exactly
source_sid or target_sid and is the same actor required by the recover request. `next_step` is the closed
state-derived enum `PUBLISH_TARGET|TOMBSTONE_SOURCE|COMMIT`. Its complete-object hash is
`capability_sha256=H(LP("plan-transfer-recovery-capability-object:v1")||LP(capability_id)||
LP(decimal recovery_sequence)||LP(journal_id)||LP(checkpoint_id)||LP(generation)||LP(source_sid)||
LP(target_sid)||LP(journal_state)||LP(recovery_basis_state_sha256)||LP(dead_owner_sha256)||
LP(actor_session_id)||LP(current_event)||LP(current_boundary)||LP(next_step)||LP(status))`.
The arm is null for the original/live controller or after a completed barrier publication; ISSUED follows a
proven-dead census; CONSUMED occurs only in the same rename that binds a fresh RECOVERY owner and persists until
that owner publishes the next state with capability null. A CONSUMED capability cannot be reauthorized at the
same state sequence; owner death starts a higher recovery_sequence. COMMITTED forbids both owner and capability.
`state_evidence_sha256=H(LP("plan-transfer-state-evidence:v1")||LP(state)||
LP(each state_evidence scalar in the displayed order))`. `owner_sha256_or_empty` is the owner's recomputed
`owner_sha256` or the exact empty string; `recovery_capability_sha256_or_empty` is the capability's recomputed
`capability_sha256` or the exact empty string. No canonical-JSON hash is permitted. Then
`state_sha256=H(LP("plan-transfer-journal-state:v1")||LP(journal_id)||LP(checkpoint_id)||LP(generation)||
LP(source_sid)||LP(target_sid)||LP(state)||LP(decimal state_sequence)||LP(source_preimage_sha256)||
LP(target_preimage_sha256_or_empty)||LP(decimal recovery_sequence)||LP(state_evidence_sha256)||
LP(owner_sha256_or_empty)||LP(recovery_capability_sha256_or_empty))`. The hash never includes itself and no
JSON serialization/order is authoritative. Four cross-harness golden arms plus every missing/forbidden-field
mutation are blocking fixtures, augmented by owner CLAIM/RECOVERY and capability null/ISSUED/CONSUMED golden
objects. Swapping any scalar order or replacing the explicit empty arm turns the fixture red.

Every schema-v3 session owns exactly one fixed-size session security accumulator, initialized in the first
session-document publication before any event may attest. It survives sequential journals and role changes, and transfer events never
depend on a 257th ordinary-ledger slot. The strict object is:

```text
transfer_security_ledger = {
  schema_version:1,generation,session_id,
  through_cursor_offset,last_event_or_null,
  last_projection_status:NONE|UNVERIFIED|VERIFIED,chain_sha256,ledger_sha256
}
TransferSecurityEvent = {
  schema_version:1,previous_ledger_sha256,journal_id,generation,session_id,side,
  event_id,boundary_id,harness,native_id,journal_arm:
    PREPARED|TARGET_PUBLISHED|SOURCE_TOMBSTONED|COMMITTED|MISSING|INVALID,
  journal_state_sha256_or_empty,owner_census:LIVE|UNPROVABLE|PROVEN_DEAD|NOT_APPLICABLE,
  ledger_admission:AVAILABLE|FULL,
  outcome:LIVE_BUSY|UNPROVABLE_NOTICE|PROVEN_DEAD_RECOVERY_ISSUED|
    STALE_CAPABILITY_ROTATED|COMMITTED_SOURCE_TERMINAL|
    COMMITTED_TARGET_BACKLOG_DENIED|INVALID_PROOF,
  outcome_identity_sha256_or_empty,event_sha256
}
```

All scalars are bounded native/64-hex/canonical-decimal enums; `native_id` is at most 512 UTF-8 bytes and the
complete serialized ledger has manifest-enforced maximum 4,096 bytes. Initial
`through_cursor_offset=0`, `last_event_or_null=null`, `last_projection_status=NONE`, and
`chain_0=H(LP("transfer-security-chain:v1")||LP(generation)||LP(session_id))`.
`ledger_0` uses the displayed ledger-object formula with the initialization cursor, empty last-event SHA,
NONE and `chain_0`.
For each later event, `previous_ledger_sha256` is the exact current read-back object hash and
`event_sha256=H(LP("transfer-security-event:v1")||LP(previous_ledger_sha256)||LP(journal_id)||
LP(generation)||LP(session_id)||LP(side)||LP(event_id)||LP(boundary_id)||LP(harness)||LP(native_id)||
LP(journal_arm)||LP(journal_state_sha256_or_empty)||LP(owner_census)||LP(ledger_admission)||LP(outcome)||
LP(outcome_identity_sha256_or_empty))`; then
`chain_next=H(LP("transfer-security-chain-step:v1")||LP(previous_ledger_sha256)||LP(event_sha256))` and
`ledger_sha256=H(LP("transfer-security-ledger-object:v1")||LP(generation)||LP(session_id)||
LP(decimal through_cursor_offset)||LP(last_event_sha256_or_empty)||
LP(last_projection_status)||LP(chain_next))`.
At initialization `last_event_sha256_or_empty` is the exact empty string and the object uses `chain_0`; later it
is the recomputed last event SHA and the object uses `chain_next`.
`previous_ledger_sha256` is the exact prior read-back object hash, including its final projection status, so a later
event commits prior Stop proof into the chain. The hash never contains itself; duplicate/missing keys, alternate
order or canonical-JSON hashing reject.
`journal_id` and `side` belong only to each strict event. A later checkpoint may change either only by adding a
new event whose chain step commits the complete prior accumulator object; the session accumulator itself is
never replaced, reset or forked. Thus A→B followed by B→C keeps B's target history before B's source history.

Schema-v3 bootstrap always budgets and publishes the 4,096-byte accumulator, and every complete-state capacity
calculation continues to include it. Checkpoint admission and claim revalidate the source and target objects,
their chain/cursor and remaining complete-state margin under
`plan-transfer-global → lexical session locks`; an invalid source/target accumulator denies before
a journal exists. The fresh target claim event is an ordinary accepted event and is legal only at ordinary
count 0–255; the later controller creates PREPARED without inventing a second event record. Every later transfer
security event replaces only `last_event_or_null`, advances the
monotonic cursor and hash chain, and therefore remains constant-size. The current native event is
written to exactly one ledger: nonterminal source/target and COMMITTED source use this accumulator; a COMMITTED
target falls through to the ordinary ledger/capacity oracle unless it is draining an already-counted
pre-cleanup scan, which uses only COMMITTED_TARGET_BACKLOG_DENIED. Exact replay of `last_event` is rejected; anything
older lies before the monotonic cursor and the §6.2 historical/direct-input rules reject it. No eviction,
cursor regression, chain reset/fork or dual ordinary+transfer append is legal.

Under the same locks, derive `ledger_admission=AVAILABLE` for ordinary count 0–255 and `FULL` for exactly 256
before any event-dependent journal/notice/terminal mutation. Both values run the same journal proof and owner
census. AVAILABLE records only the selected transfer outcome in the accumulator and leaves ordinary ledger
capacity unchanged. FULL records that same unique outcome in the accumulator, leaves the 256 ordinary entries
unchanged, and atomically sets the fixed deny-reserve prompt posture
`ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)`; this posture allowlists only the matching transfer
drain attester, notice/Stop/recovery controller or COMMITTED-source terminal projection, never ordinary
route/project work. Its drain attester is the fixed-marker, durable-record-only path in §6.1–6.3; it cannot
reuse the ordinary pending queue or caller prompt bytes.
It is not a second user-facing capacity successor: LIVE/UNPROVABLE/PROVEN_DEAD still present only their one
transfer outcome, and COMMITTED source presents only `TERMINAL_DIAGNOSTIC`. COMMITTED target never uses this
lane for a fresh event after its cleanup: AVAILABLE appends ordinarily; FULL takes the existing event-257
rotation oracle. The only target transfer-lane exception is a counted marker backlog that arrived before cleanup;
it is denied by the closed outcome below until the scan count drains. Counts above 256 are schema-invalid.

Before any journal, notice, capability, owner, cursor or accumulator mutation, and under the same
`plan-transfer-global → lexical session locks`, every transfer-overlay invocation first computes exactly one
strict `transfer_invocation_kind`. It is a generated total function of the ordered tuple
`(transfer_scan absent/present, next unread durable external-human group after the trusted cursor
visible/NOT_YET_VISIBLE, hook kind PreToolUse|state-mutating PostToolUse|Stop, persisted controller/projection/
capability state)`, all read once from durable state inside that locked read. It is never derived from caller
payload text, native hints, queued candidate bytes or the attempted verb name alone. The kind set is exactly
these six values, and selection is these seven disjoint ordered predicates, first match wins:

| # | Selecting predicate | `transfer_invocation_kind` | Obligation |
|---|---|---|---|
| 1 | `transfer_scan` present with `consumed_count < submitted_count` and the next unread durable group completely visible | `SCAN_DRAIN_EVENT` | append exactly one `TransferSecurityEvent`; advance cursor, chain, `consumed_count` and `prompt_gate.current_event`; deny the attempted controller/Stop |
| 2 | `transfer_scan` present and predicate 1 did not fire | `NO_NEW_EVENT_DENY` | append nothing; retain every byte including the scan object and its first-unconsumed snapshot; deny |
| 3 | `transfer_scan` absent and §6.2 attestation maps exactly one new durable human delivery group strictly after the cursor | `NEWLY_ATTESTED_EVENT` | append exactly one `TransferSecurityEvent`; advance cursor, chain and `prompt_gate.current_event`; deny the attempted controller/Stop of the same invocation |
| 4 | `transfer_scan` absent, no new group, and the invocation is the exact `plan-transfer recover` PreToolUse that satisfies exactly one of: (a) its `authority_id`, `actor_session_id`, `actor_event` and `actor_boundary` equal the journal's single current `ISSUED` capability and the persisted `prompt_gate.current_event`/boundary; or (b) the journal capability is `CONSUMED` at the same `recovery_sequence` and the invocation re-presents byte-for-byte the same still-IN_PROGRESS, census-LIVE `TransferControllerOwner` tuple (`owner_sha256`, `invocation_id`, `pid`, `process_start`, `boot_id`, `nonce`, `started_state`) | `NO_NEW_EVENT_RECOVER_CONTROLLER` | append nothing; for (a), in one rename consume that capability and publish the fresh RECOVERY owner, then perform only its `next_step`; for (b), idempotently resume only that same owner's unique `next_step` without reissuing, rebinding or re-consuming any capability |
| 5 | `transfer_scan` absent, no new group, the invocation is Stop with a byte-identical bounded final-assistant projection, and exactly one of: (a) `transfer_recovery_notice.status=UNVERIFIED` on exactly its own creating event/boundary; or (b) `last_projection_status=UNVERIFIED` with last outcome `COMMITTED_SOURCE_TERMINAL` on exactly its creating event/boundary | `NO_NEW_EVENT_STOP_PROJECTION` | append nothing; change only the one declared projection scalar to VERIFIED — for (a) the notice `status` alone, for (b) `last_projection_status` plus the recomputed `ledger_sha256` — while chain and event hashes stay immutable |
| 6 | `transfer_scan` absent, no new group, locked journal read-back is COMMITTED, `side=TARGET`, and `ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)` is still set | `NO_NEW_EVENT_COMMITTED_TARGET_CLEANUP` | append nothing; run the idempotent §6.1 target cleanup exactly once |
| 7 | every other invocation | `NO_NEW_EVENT_DENY` | append nothing; byte-preserving denial returning the exact persisted retry/display |

The seven predicates partition the input space, so this table has no default and no implementation may add
one; predicates 2 and 7 deliberately share the single `NO_NEW_EVENT_DENY` kind. Only `SCAN_DRAIN_EVENT` and
`NEWLY_ATTESTED_EVENT` are event-bearing, and each appends exactly one `TransferSecurityEvent`. No
no-new-event kind may append an event or change `through_cursor_offset`, `last_event_or_null`, `chain_sha256`
or `prompt_gate.current_event` under any circumstance; `TransferJournal.state`/`state_sequence` may advance
only under predicate 4 and only by that capability's or owner's single declared `next_step`, and every other
no-new-event kind changes nothing beyond the one side effect its own row names. Conversely, an event-bearing kind may
never consume a capability, publish a controller owner, verify a projection or run target cleanup in the same
invocation that minted or refreshed it: it always denies the attempted controller/Stop and returns the exact
persisted retry bytes. Once a `SCAN_DRAIN_EVENT` rename proves `consumed_count == submitted_count` and removes
the scan object, the very next PreToolUse/state-mutating PostToolUse/Stop re-enters this table with
`transfer_scan` absent and may select predicate 4, 5 or 6 **without another `UserPromptSubmit`**. Because every
event-bearing kind rebinds recovery authority to the current event, an older-event capability can never satisfy
predicate 4 and is never retained; predicate 4 is therefore the sole idempotent same-invocation controller
resume path and is never itself a `TransferSecurityEvent` outcome.

Every event requires its session to equal the actor sid, its side to equal that sid's journal role, and
`ledger_admission` to equal the precomputed AVAILABLE/FULL arm. Only the two event-bearing kinds
reach the outcome table, and there the `journal_arm` selects the family first: COMMITTED_SOURCE_TERMINAL
requires side=SOURCE, COMMITTED+NOT_APPLICABLE and
`H(LP("transfer-terminal-presentation:v1")||LP(commit_receipt_sha256)||LP(target_sid)||
LP(target_state_sha256)||LP(display_sha256))`; COMMITTED_TARGET_BACKLOG_DENIED requires side=TARGET,
COMMITTED+NOT_APPLICABLE, a nonempty pre-cleanup `transfer_scan` count and
`H(LP("transfer-target-backlog-denial:v1")||LP(commit_receipt_sha256)||LP(event_id)||LP(boundary_id)||
LP(display_sha256))`; INVALID_PROOF requires the expected source/target role,
MISSING with empty journal hash or INVALID with the bounded raw-proof SHA, NOT_APPLICABLE census and empty
outcome identity. For a valid PREPARED|TARGET_PUBLISHED|SOURCE_TOMBSTONED arm the outcome is the generated
total product of the journal's `recovery_capability_or_null` arm and exactly one census whose source that arm
itself fixes:

| `recovery_capability_or_null` | Census source | `owner_census` | `outcome` | Capability effect |
|---|---|---|---|---|
| null | manifest liveness oracle on `controller_owner` | LIVE | `LIVE_BUSY` | none; empty outcome identity |
| null | same | UNPROVABLE | `UNPROVABLE_NOTICE` | none; identity is the notice hash below |
| null | same | PROVEN_DEAD | `PROVEN_DEAD_RECOVERY_ISSUED` | issue exactly one capability at `recovery_sequence+1` bound to the current event/boundary/actor; identity is its `capability_sha256` |
| `ISSUED` whose `dead_owner_sha256` equals the recomputed `controller_owner.owner_sha256` | the stored dead-owner fact; the oracle is never re-run against a recorded dead owner | PROVEN_DEAD | `STALE_CAPABILITY_ROTATED` | atomically invalidate that capability and issue its replacement at a strictly higher `recovery_sequence` bound to the current event/boundary/actor; identity is the replacement `capability_sha256` |
| `ISSUED` whose `dead_owner_sha256` differs from the recomputed `controller_owner.owner_sha256` | — | — | no event is appended | STATE_TRANSITION_INVALID; byte-preserving deny |
| `CONSUMED`, whose consume rename bound the fresh RECOVERY `controller_owner` | manifest liveness oracle on that RECOVERY owner | LIVE | `LIVE_BUSY` | none |
| `CONSUMED` | same | UNPROVABLE | `UNPROVABLE_NOTICE` | none |
| `CONSUMED` | same | PROVEN_DEAD | `PROVEN_DEAD_RECOVERY_ISSUED` | replace the consumed object with a fresh capability at a strictly higher `recovery_sequence` bound to the current event/boundary/actor |

UNPROVABLE_NOTICE identity is exactly
`H(LP("transfer-security-notice-outcome:v1")||LP(journal_state_sha256)||LP(event_id)||LP(boundary_id)||
LP(display_sha256))`. `recovery_sequence` is strictly monotonic and never reused, so a rotated or replaced
`capability_id` can never be consumed afterwards; the same rename replaces the persisted transfer controller
request/display bytes with ones bound to the replacement `authority_id`, and predicate 4 of the input table
admits only those bytes. LIVE and UNPROVABLE never mint, rotate or invalidate a capability, and no census
result preserves an older-event capability. `RECOVERY_CAPABILITY_BUSY` and `RECOVERY_OWNER_BUSY` are deleted
from this plan: a fresh human event never retains stale recovery authority that could overtake it, and an
IN_PROGRESS owner of either `owner_kind` is decided only by the LIVE/UNPROVABLE/PROVEN_DEAD census above.
Every other arm/census/outcome/identity combination is schema-invalid. Controller state changes remain in
TransferJournal; they do not append a second record for the same human event, and a no-new-event kind appends
no record at all.
`last_projection_status` is UNVERIFIED only when the last outcome is COMMITTED_SOURCE_TERMINAL; its exact
byte-proving Stop changes only that scalar to VERIFIED and recomputes `ledger_sha256` while chain/event hashes
remain immutable. The transition is one-shot. All other outcomes require NONE, and a new committed-source event
replaces the prior last event with a fresh UNVERIFIED projection.

On the next security hook for either bound sid, recovery precedence acquires
`plan-transfer-global → source/target session locks in lexical sid order`, re-reads the exact journal and applies
the manifest liveness oracle. It then computes `transfer_invocation_kind` above: only an event-bearing kind
publishes exactly one actor-session `TransferSecurityEvent` in the same locked session rename and denies the
attempted controller/Stop, while a no-new-event kind publishes none and takes only its own row's single side
effect. LIVE returns BUSY and changes no journal/underlay byte; UNPROVABLE enters the
bounded transfer RECOVERY_REQUIRED presentation with no command/capability; that is a strict non-authorizing
`transfer_recovery_notice={schema_version:1,journal_id,journal_state_sha256,source_sid,target_sid,
underlay_source_state_sha256,underlay_target_state_sha256,display_base64,display_utf8_length,display_sha256,
event,boundary,status:UNVERIFIED|VERIFIED}` and does not change source/target execution authority. PROVEN_DEAD atomically records the dead-owner hash,
increments the never-reused `recovery_sequence` and, per the capability product above, issues
(`PROVEN_DEAD_RECOVERY_ISSUED`) or rotates onto the current event (`STALE_CAPABILITY_ROTATED`) exactly
`transfer_recovery_capability={schema_version:1,capability_sha256,capability_id,recovery_sequence,journal_id,
checkpoint_id,generation,source_sid,target_sid,journal_state,recovery_basis_state_sha256,dead_owner_sha256,
actor_session_id,current_event,current_boundary,
next_step,status:ISSUED|CONSUMED}` where
`capability_id=H(LP("approved-plan-transfer-recovery:v1")||LP(generation)||LP(journal_id)||
LP(checkpoint_id)||LP(journal_state)||LP(recovery_basis_state_sha256)||LP(dead_owner_sha256)||
LP(actor_session_id)||LP(current_event)||LP(current_boundary)||LP(decimal recovery_sequence))` and next_step is uniquely
PREPARED→PUBLISH_TARGET, TARGET_PUBLISHED→TOMBSTONE_SOURCE,
SOURCE_TOMBSTONED→COMMIT. On a later invocation selected as `NO_NEW_EVENT_RECOVER_CONTROLLER`, the exact
recover controller first consumes that capability and publishes a fresh read-back RECOVERY owner with
`started_state=journal_state` under the same locks, then performs only the named next step; it never appends a
`TransferSecurityEvent` and never runs in the same invocation that issued or rotated its capability. A crash repeats this
liveness/sequence protocol from the newly durable state; the old event/capability never reauthorizes. Two
recoverers race on the global lease/state CAS, so at most one owner/capability consumes. Replay, live-owner
takeover, wrong actor/state/hash/event, generation drift or COMMITTED recovery denies. While recovery is ISSUED or
IN_PROGRESS, ordinary route/project mutation and Stop are blocked; only the exact controller is allowed.
UNPROVABLE allows one Stop only after byte-proving its notice and remains externally blocked; no phrase in this
plan converts that notice into recovery authority.

`recovery_basis_state_sha256` is the exact read-back journal state hash **before** the ISSUED capability is
inserted. Capability issuance then recomputes the current journal `state_sha256` with the capability object,
avoiding a recursive hash. `recover.payload.journal_state_sha256` must equal that post-issuance current hash;
the controller separately verifies the stored capability's basis hash, state/sequence and current authority ID.
After consume, the CONSUMED object and fresh owner produce another nonrecursive current hash. No capability ID
contains the state hash that itself contains that capability.

`transfer_recovery_notice` is a high-precedence route/Stop overlay for **both** source and target sid, not a
free-standing diagnostic. While a matching nonterminal journal is UNPROVABLE, every newly attested human event
(STATUS, correction, task, project, continue or exact control) is recorded once in the bound session's
`transfer_security_ledger` with its precomputed ordinary `ledger_admission`, never appended to the ordinary
ledger, and replaces the notice with one
UNVERIFIED notice bound to that event/boundary, preserves both underlay state hashes byte-for-byte and yields
no ordinary route/project/action authority. Peer/meta remains denied. Stop on only that creating event and
boundary must byte-prove the exact display; one rename changes UNVERIFIED→VERIFIED and may end the turn while
the journal and both underlays remain blocked. A later human event always re-runs owner census before ordinary
routing: LIVE clears no journal and returns BUSY/no Stop; UNPROVABLE rotates a fresh notice; PROVEN_DEAD
replaces the active notice, issues or rotates only the one current-event-bound recovery capability above and
blocks Stop; that current event's sole `TransferSecurityEvent` binds the exact issued or replacement
recovery-capability SHA, with no separate notice or ordinary-ledger append. COMMITTED removes the active notice and exposes the already-committed
target/source states. LIVE may retain the prior notice bytes only as non-authorizing evidence, but its creating
event is no longer current and cannot Stop. Wrong sid/journal/state hash,
replayed Stop or a notice without a matching nonterminal journal is STATE_TRANSITION_INVALID. This table has no
default and is generated ahead of the §8 route matrix.

Once an exact claim has locked and revalidated a live PRESENTED checkpoint, the transfer truth is a separate
no-follow journal under `.claude/.plan-transfers/<checkpoint_id>.json`, using an activation-independent global
transfer lease followed by source/target session locks in lexical sid order. No journal exists for
ISSUED/PRESENTED→CANCELLED; that pre-claim transition is wholly the one source-state rename/archive operation
above.
A fresh human-attested target sid with the exact token may claim once. The journal transitions
`PREPARED→TARGET_PUBLISHED→SOURCE_TOMBSTONED→COMMITTED`; target publication creates a new session-bound
obligation and execution ID from the checkpoint, target sid/event/boundary and freshly revalidated project
identity:
`target_obligation_id=H(LP("route-obligation-plan-transfer:v1")||LP(checkpoint_id)||LP(target_sid)||
LP(checkpoint_claim_root)||LP(claim_event)||LP(claim_boundary)||LP(exact_task_sha256)||
LP(target_project_identity_sha256))`;
`target_plan_execution_id=H(LP("approved-plan-execution-transfer:v1")||LP(checkpoint_id)||
LP(checkpoint_claim_root)||LP(source_plan_execution_id)||LP(source_plan_result_id)||
LP(target_obligation_id)||LP(target_sid)||LP(claim_event)||LP(claim_boundary)||
LP(target_project_identity_sha256)||LP(state_capacity_admission_sha256)||LP(completed_evidence_root))`. Target
publication re-runs the same analyzer against the target sid's current bounded state and requires the checkpoint
admission/analyzer/manifest hashes to remain exact and ADMITTED; drift or insufficient target margin denies
before PREPARED. The admitted object is copied as immutable execution evidence, never as source capability. The transfer journal ID is
`H(LP("approved-plan-transfer-journal:v1")||LP(checkpoint_claim_root)||LP(target_obligation_id)||
LP(target_plan_execution_id))`. No source obligation/capability/native-call ID becomes
current authority. The immutable plan/result and completed evidence remain predecessor inputs only, while the
target publication also copies every retained terminal phase record, complete parameter queue and per-phase
MAIN_AGENT human-answer object from the journaled source preimage and recomputes their roots; a hash-only import
is invalid. At the SOURCE_TOMBSTONED barrier the source underlay becomes
`PLAN_EXECUTION_TRANSFERRED{target_sid,target_state_sha256}`, but that status is recovery-only and not terminal-
eligible until the matching journal is durably COMMITTED with its nonempty commit receipt and passes the §5.2
locked proof. A project-scoped target with no
matching binding remains at the ordinary PLAN_PROJECT_REQUIRED route gate and does not enter this claim
transaction. Only the byte-proving Stop changes the source to PLAN_EXECUTION_TRANSFER_READY and checkpoint to
PRESENTED. Crash recovery completes the same journal; it never rolls
back a published target into two live authorities. Replay, two claimant, source reuse, target pre-existing
authority, changed plan/evidence/project inode, generation mismatch and a second claim/transfer of the same
checkpoint all deny. A later checkpoint from the committed target is a new transfer and must advance, never
replace, its per-session security chain. Only after
COMMITTED does the target atomically enter BETWEEN_WAVES with a fresh target-event-bound wave-choice capability;
only its later `advance-wave` may issue a phase capability. L0 must prove both harnesses can present/copy the checkpoint
token; otherwise the authoritative cross-session Orchestrator path is unsupported and KILL-06 fires.

Project compatibility requires the same canonical/realpath/dev/ino manifest identity; the target session's
local monotonic `epoch_counter` is allowed to differ and is bound as the new target identity. It is never copied
from the source or inferred from display links.

`source_checkpoint_core_sha256` hashes only the immutable checkpoint/execution/project/evidence core, not the
source prompt ledger/current-event wrapper. A source STATUS event may append anti-replay evidence and rotate a
fresh checkpoint presentation challenge, temporarily preventing claim until its Stop re-proves PRESENTED, but
it cannot change that core or its reservation. Any correction/new task/cancel atomically materializes the
complete CANCELLED checkpoint in the pre-reserved archive arm. ENTRY installs its ordinary successor in that
same rename; OVERFLOW installs only terminal ROTATION and requires the human to resend in a fresh session.
Claim then finds no live PRESENTED checkpoint and fails. Claim locks the current source bytes, requires
ATTESTED/non-ROTATION, revalidates the core, reservation, archive root and PRESENTED status, and journals that
exact full-state preimage for its CAS.

`PLAN_EXECUTION_PENDING`, `PLAN_EXECUTION_ACTIVE`, `PLAN_EXECUTION_REPLAN_PENDING`, an unpresented delta and an
unpresented/unfinished phase all block Stop and deny
tools except their exact controller, dependency-ready active-phase capabilities, paired PostTool or read-only grammar.
`PLAN_EXECUTION_WAITING_HUMAN`, WAITING_BOUNDARY, WAITING_DELTA_APPROVAL, WAITING_DELTA_BOUNDARY and TRANSFER_READY may
Stop only for their creating event after exact presentation proof. After all
phases and final assertions have terminal evidence, `finalize` stages a bounded completion summary and changes
to `PLAN_EXECUTION_COMPLETE_PENDING_STOP`; Stop must prove that exact summary bytes, then and only then sets
SATISFIED. Missing PostTool, skipped phase, stale project identity, wrong result ID, reused phase evidence,
unobserved Orchestrator begin or direct approval→SATISFIED is a blocking error. This is the only PLAN_READY
completion path.

For SINGLE/MULTI, `begin-execution` verifies the pinned manifest execution-contract and instruction hashes, reads their bounded instructions
through the controller, changes EXECUTION_PENDING→EXECUTION_ACTIVE and injects the exact operating contract; it
does not rely on a native Skill tool. Every later tool rechecks those hashes; drift revokes the capability and
returns EXECUTION_PENDING with a new route receipt rather than running changed instructions. Pre/Post hooks then
operate one strict
`execution_tool_capability={capability_id,execution_id,step_id,capability_seq,generation,current_event,
boundary,project_identity,allowed_tool_class,status:ISSUED|IN_FLIGHT|CONSUMED,native_call_id?}`. Under the session
lock, the first matching PreTool CASes ISSUED→IN_FLIGHT and binds the native call ID; a second/concurrent PreTool
is BUSY/denied and cannot consume or clone it. Every state-mutating PostTool—not only Plan Agent PostTool—first
runs `attestPending()`. A PostTool for a tool released before steering may record only its phase/step-local
terminal outcome or completion tombstone; it cannot issue a successor while a new prompt, D, Stop or scope
change is pending.

At `begin-execution`, each declared output path is no-follow read and records strict baseline
`{existence,canonical_path,dev?,ino?,size?,sha256?}`. Each policy Step has one terminal evidence mode:
`CREATED`, `MODIFIED`, `REUSE_VALIDATE`, `RESPONSE_ONLY`, or `HUMAN_WAIT`. `CREATED` requires absent→present;
`MODIFIED` requires a post-step hash or inode/size tuple different from baseline; `REUSE_VALIDATE` is the sole
unchanged-output arm and requires its own manifest-declared read/validation tool receipt and assertion result.
Every tool receipt/output/assertion binds exactly one step ID and one native call ID and is single-use; an
unrelated read, evidence from another step or pre-begin bytes cannot terminate a step. Dependencies become
eligible only after every predecessor has terminal proof. `complete-execution` requires a terminal evidence
object for **each** selected step plus either (a) those controller-read changed/reuse-validated canonical outputs,
(b) an exact human-wait question and evidence, or (c) an execution-policy-declared response-only draft of at
most 32,768 UTF-8 bytes. File/tool evidence or a human wait
respectively moves to SATISFIED or `PRESENTATION_PENDING(target=WAITING_HUMAN,kind=EXECUTION)`; response-only moves to
EXECUTION_COMPLETE_PENDING_STOP, and Stop must expose an exact assistant-message byte hash matching the staged
draft before it sets SATISFIED and allows termination. If either harness cannot expose that Stop field in L0,
all presentation and response-only completion is unsupported and KILL-06 fires. EXECUTION_PENDING blocks Stop;
EXECUTION_ACTIVE may Stop only through the exact presentation/complete transition. This guarantees observed dispatch and output/wait
evidence, not the semantic quality of the selected skill's work.

Free-form SKILL.md text is never an authorization policy. The manifest member
`.claude/skill-os/skill-execution-contracts.json` is a strict closed registry. Each entry has exactly
`{id,route_name,kind:SINGLE|FLOW,instruction_members:[{path,sha256}],steps:[Step],completion_modes}`; each Step has exactly
`{id,dependencies,allowed_tool_classes,allowed_read_roots,allowed_write_templates,evidence_mode,output_evidence,
child_agent_contract_ids}`. Roots/templates are canonical, generation-bound, project-scoped and may only narrow
the ordinary project-scope guard. Tool classes and completion modes are closed enums; `response-only` and
`human-wait` must be explicit. A MULTI result must name one reviewed FLOW contract that fixes ordering/handoffs;
the agent cannot union unrelated SINGLE contracts. Unknown selection, unregistered child agent, path/template
expansion or instruction-hash drift rejects classification/begin and returns a fresh receipt. SKILL.md can add
restrictions but can never broaden this registry. PreTool/PostTool and `complete-execution` consume the same
step IDs and policy bytes, making “every selected step”, tool permission and output evidence mechanically
decidable. `route_name` is the unique canonical route token accepted by the receipt and maps one-to-one to `id`;
a receipt must carry that exact pair. A build-time bijection test proves every skill/flow name that
`route-receipt` may accept has exactly one contract and every registry entry is reachable; an explicit standalone skill outside this obligation path is
not silently enrolled. If no safe contract exists, classify chooses PLAN only when an authoritative condition is
true; otherwise it chooses QUESTION, never inventing a contract or using the signal as complexity evidence.

`PRESENTATION_PENDING` stores canonical-base64 display bytes, UTF-8 length/SHA, creating event/boundary,
`target_status`, wait kind and its closed kind-specific fields. `PROJECT_SWITCH_REQUIRED` stores the canonical
existing target, expected operation SWITCH and the same strict scope-resume snapshot used below.
`PROJECT_SCOPE_DRAIN_REQUIRED` stores the exact
deferred-request hash, real operation `SWITCH|NEW|DEACTIVATE`, optional canonical target, and the closed
scope-resume snapshot defined below. Stop first checks that its bounded final-assistant projection is byte-identical;
only that same rename sets `display_status=VERIFIED`, installs WAITING_HUMAN/WAITING_PLAN_APPROVAL/
PLAN_EXECUTION_WAITING_HUMAN/EXECUTION_WAITING_BOUNDARY as selected by the kind and permits termination. A mismatch blocks and reinjects the exact display; no next
human event may resolve an unverified presentation. Only the event that created a verified wait may Stop under
it. `wait.kind` is one of ROUTE_QUESTION, PLAN_APPROVAL, PLAN_NO_ACTION, PLAN_THIN_ALTERNATIVE,
PLAN_NEEDS_CONTEXT, EXECUTION, EXECUTION_BOUNDARY, PROJECT_SWITCH_REQUIRED, PLAN_PROJECT_REQUIRED,
PROJECT_SCOPE_DRAIN_REQUIRED, PLAN_EXECUTION, PLAN_EXECUTION_BOUNDARY,
PLAN_EXECUTION_MAIN_AGENT_HITL, PLAN_EXECUTION_PHASE_CONFIRMATION, PLAN_EXECUTION_PREFLIGHT_OVERRIDE,
PLAN_EXECUTION_FAILURE_DECISION, PLAN_EXECUTION_DELTA_APPROVAL, PLAN_EXECUTION_DELTA_BOUNDARY or
PLAN_EXECUTION_TRANSFER. PROJECT_SWITCH_REQUIRED stores the canonical existing target and expected
operation SWITCH; its display gives user-facing retry text but no executable shell command or project
capability. A fresh normal project directive, not an answer-token shortcut, is required. The scope-drain kind
is valid only while the exact referenced D exists and matches its request hash.

Project lifecycle never relies on an implied assistant message. Every D, including a project-only D with no
route obligation, owns a strict independent
`project_presentation={schema_version:1,kind:SCOPE_DRAIN|COMMITTED_CHANGE|TARGET_BECAME_EXISTING_PROJECT_ONLY,request_sha256_or_empty,
committed_tx_or_empty,op,target_or_empty,census_or_empty:EXISTING_OTHER|EXISTING_CURRENT|empty,
display_base64,display_utf8_length,display_sha256,challenge_id,
creating_event,creating_boundary,status:UNVERIFIED|VERIFIED,verified_by_stop_event_or_empty}`. D creation or
replacement atomically stages the operation-specific SCOPE_DRAIN text and remains `WAITING_NEW_PARENT` until a
genuine Stop proves byte-identical final-assistant output; only that rename sets both presentation VERIFIED and
D `WAITING_CONFIRMATION`. A missing/wrong display blocks and reinjects it, and no next event can consume an
UNVERIFIED D. When a SWITCH/NEW/DEACTIVATE commit preserves DEFERRED_BY_PROJECT_CHANGE, cleanup atomically stages
a COMMITTED_CHANGE display identifying the committed operation/project and saying that the established task
will resume on the next native turn. The committed boundary may Stop only after this display is VERIFIED.
`TARGET_BECAME_EXISTING_PROJECT_ONLY` alone requires a nonempty target and one census enum; the other kinds
require `census_or_empty=empty`. Challenges bind generation/session/event/boundary/request or committed tx and cannot be reused across kinds.
When a live route obligation also stages PROJECT_SCOPE_DRAIN_REQUIRED, its PRESENTATION_PENDING object must
reference the same project-presentation challenge/display SHA; one byte-identical Stop projection atomically
verifies both records. Two independently worded displays or one verified without the other is invalid.

A preserve/retry event never overwrites a VERIFIED primary proof. If the primary is still UNVERIFIED, the new
event invalidates its challenge, retains its full hash as superseded evidence and mints a fresh UNVERIFIED
primary bound to the new event; the old Stop cannot verify it. If the primary is VERIFIED, the event mints a separate bounded
`project_reprompt={schema_version:1,primary_proof_sha256,request_sha256,creating_event,creating_boundary,
display_base64,display_utf8_length,display_sha256,challenge_id,status:UNVERIFIED|VERIFIED}`. The fresh Stop proves
only this reprompt. If a route presentation is also needed, it references the same reprompt challenge; it does
not claim to verify the old primary object again. A new D replacement clears the old reprompt and creates a new
primary presentation; D consume/cancel clears the active reprompt but retains the immutable primary proof as
history. At most one active reprompt exists, so SAME retries cannot accumulate unbounded records.

Every wait stores `result_sha256` for a Plan result or `wait_sha256` for a non-Plan display and shows the exact
copyable control grammar. After NFKC and ASCII-whitespace collapse, one of these must match the **entire**
operative input; every SHA is lowercase `[0-9a-f]{64}` and must equal the stored bytes. `<text>` is non-empty,
at most 4,096 UTF-8 bytes and stored verbatim with its SHA. Explicit task cancel/new-task still precedes this
table; negated, quoted/reported, wrong/missing SHA, extra prefix/suffix, multiple controls, or any mixed project
directive is ROUTE_AMBIGUOUS with command null.

### 5.4 Raw-byte projection and task preservation

“Normalized match, verbatim text” has one byte oracle. Strict UTF-8 decoding produces an NFKC/whitespace-collapsed
control view whose every output scalar carries its contributing half-open raw-byte span. The grammar matches that
view, but a `<text>` capture is projected back to the minimal contiguous raw span from its first through last
captured non-space scalar; those exact raw bytes—not the normalized rendering—are stored and hashed. A capture
with a non-contiguous/ambiguous mapping, a boundary inside a collapsed whitespace run, invalid UTF-8 or bytes
outside the single syntactic capture rejects. Implementations may not trim, re-normalize or re-encode a human
revision differently.

The same scalar→raw-span map selects the unique project clause, delimiter and contiguous task-side region for
NEW_TASK_SIGNAL_WITH_PROJECT. Signal-only task preservation bypasses clause slicing and stores the complete raw
decoded human prompt. A create→defer→resume→receipt→execution round trip must reproduce exact_task_text
byte-for-byte; a prompt hash without recoverable task bytes is never sufficient.

| Verified wait kind | Exact entire-input grammar | Route event / atomic result |
|---|---|---|
| PLAN_APPROVAL | `批准计划 <result_sha256>` | create immutable approved-plan identity; NO_PIN+all-NO_PROJECT→route-only PLAN_EXECUTION_PENDING with empty project roots, effective A/DIFFERENT_DRAINED→PLAN_EXECUTION_PENDING, clean C/B SAME/unproven→PLAN_EXECUTION_WAITING_BOUNDARY; a PLAN_PROJECT_REQUIRED result is never approvable |
| PLAN_APPROVAL | `修改计划 <result_sha256>：<text>` | ANSWER_OR_REVISION → PLAN_REVISION_REQUIRED with text + fresh plan capability; retain old result SHA |
| PLAN_PROJECT_REQUIRED | fresh exact project selection under the ordinary PROJECT_ONLY grammar | no approval/import: run D/S→commit→boundary, supersede the unapprovable result, then mint a fresh project-bound Plan capability |
| PLAN_NO_ACTION | `接受无动作 <result_sha256>` | ANSWER_OR_REVISION → SATISFIED |
| PLAN_NO_ACTION | `继续原任务 <result_sha256>` | ANSWER_OR_REVISION → RESUMED with the unchanged exact task + fresh classify receipt |
| PLAN_NO_ACTION | `修改原任务 <result_sha256>：<text>` | ANSWER_OR_REVISION → PLAN_REVISION_REQUIRED with text + fresh plan capability |
| PLAN_THIN_ALTERNATIVE | `接受精简方案 <result_sha256>` | ANSWER_OR_REVISION → RESUMED using only persisted `human_message.proposed_task_text`/SHA + fresh classify receipt |
| PLAN_THIN_ALTERNATIVE | `继续原任务 <result_sha256>` | ANSWER_OR_REVISION → RESUMED with the unchanged original task + fresh classify receipt |
| PLAN_THIN_ALTERNATIVE | `修改精简方案 <result_sha256>：<text>` | ANSWER_OR_REVISION → PLAN_REVISION_REQUIRED with text + fresh plan capability |
| PLAN_NEEDS_CONTEXT | `补充上下文 <result_sha256>：<text>` | ANSWER_OR_REVISION → PLAN_REVISION_REQUIRED with answer + fresh plan capability |
| ROUTE_QUESTION | `回答问题 <wait_sha256>：<text>` | ANSWER_OR_REVISION → RESUMED with answer + fresh classify receipt |
| PROJECT_SWITCH_REQUIRED | fresh exact `切换到 <stored canonical target> 项目` is PROJECT_ONLY; the signal-target-exists arm also accepts the unique combined SWITCH plus byte-identical persisted task; no answer-token shortcut | saved-execution arm: current-target direct rebind restores only its allowed subphase; signal-target-exists arm: current target on DIFFERENT_DRAINED creates a fresh project-bound PENDING obligation with identical task bytes. Another target yielding S moves either saved task to DEFERRED until commit; SAME/unproven D stages PROJECT_SCOPE_DRAIN_REQUIRED and issues no capability |
| PROJECT_SCOPE_DRAIN_REQUIRED | contextual bare `继续\|接着\|继续做`; or the exact stored operation retry: SWITCH=`切换到 <target> 项目`, NEW=`创建 <target> 项目`, DEACTIVATE=`退出当前项目`; SWITCH alone also accepts exact `确认切换\|继续切换\|就切这个` | NEW first recensuses; only an ABSENT + DIFFERENT_DRAINED matching continuation consumes D into fresh S and DEFERRED; SAME/unproven re-presents; a different op/target is an explicit scope revision, never confirmation |
| EXECUTION | `回答执行问题 <wait_sha256>：<text>` | ANSWER_OR_REVISION → EXECUTION_PENDING with pinned selection/answer + fresh execution capability |
| PLAN_EXECUTION | `回答计划执行问题 <wait_sha256>：<text>` | ANSWER_OR_REVISION → for PHASE_QUESTION, append the one complete §5.3 `CollectedParameterAnswer` from the attested answer span and stage only the next queue head or terminal parameter-input bundle; other typed plan waits keep their own exact successor. The same plan execution/phase remains bound and no fresh work capability exists before policy validation and terminal queue proof |
| PLAN_EXECUTION_MAIN_AGENT_HITL | `回答主任务步骤 <wait_sha256>：<text>` | ANSWER_OR_REVISION; bind exact graph/phase/step/wait schema, persist one complete `MainAgentHumanAnswer` from the attested answer span, mark only that HUMAN_WAIT step DONE, recompute human-answer/evidence/ready roots, and mint at most the next graph step capability whose input/prompt binds those exact bytes |
| PLAN_EXECUTION_PHASE_CONFIRMATION | `继续下一阶段 <wait_sha256>` | ANSWER_OR_REVISION/CONFIRM_PHASE; bind the exact confirmation-queue head and phase/quality/output roots, append one fresh event receipt, then stage the next confirmation or the unique BETWEEN_WAVES/FINAL_ASSERTIONS successor; never issue work directly |
| PLAN_EXECUTION_PREFLIGHT_OVERRIDE | `重试检查 <wait_sha256>` | ANSWER_OR_REVISION/RETRY_PREFLIGHT; only exact registry retry_limit=1 and retry_count=0 reissue that same phase/child PREFLIGHT plus exact saved authority, restoring evidence-only records; no work or PASS evidence is fabricated |
| PLAN_EXECUTION_PREFLIGHT_OVERRIDE | `跳过检查 <wait_sha256>` | ANSWER_OR_REVISION/OVERRIDE_PREFLIGHT; only HUMAN_SKIP_CHECK plus an exact allowed non-safety finding replaces FAILED_SCOPE with PREFLIGHT_OVERRIDDEN evidence, restores/reissues the saved frontier and resumes that same phase's remaining preflight/parameter frontier; never PHASE_WAIVED |
| PLAN_EXECUTION_FAILURE_DECISION | `重试阶段 <wait_sha256>` | ANSWER_OR_REVISION/RETRY; only retry_count=0 and byte-identical phase input/project identity→the exact failed call kind plus controller-derived suspended successors return to the bounded frontier with retry_count=1 |
| PLAN_EXECUTION_FAILURE_DECISION | `重规划阶段 <wait_sha256>：<text>` | ANSWER_OR_REVISION/REPAIR; persist exact text/SHA, enter PLAN_EXECUTION_REPLAN_PENDING and mint only the fresh delta request authority |
| PLAN_EXECUTION_FAILURE_DECISION | `跳过阶段 <wait_sha256>` | ANSWER_OR_REVISION/SKIP; only immutable human_waivable+skip-policy and no safety/irreversible BLOCKING finding→PHASE_WAIVED, tombstone FAILED_SCOPE+SAME_PHASE successors and rehydrate only OTHER_PHASE successors; when those drain, derive confirmations before BETWEEN_WAVES/FINAL_ASSERTIONS |
| PLAN_EXECUTION_FAILURE_DECISION | `终止计划 <wait_sha256>` | ANSWER_OR_REVISION/TERMINATE; terminally tombstone the execution and set route obligation CANCELLED with no work/summary capability |
| PLAN_EXECUTION_BOUNDARY | `继续执行计划 <wait_sha256>` | only DIFFERENT_DRAINED clean C/B → A+PLAN_EXECUTION_PENDING; SAME/unproven → fresh re-presentation with no capability |
| PLAN_EXECUTION_DELTA_APPROVAL | `批准增量计划 <delta_result_sha256>` | exact fresh approval mints only the validated event-bound install capability; `install-delta` consumes it; wrong predecessor/project/evidence denies |
| PLAN_EXECUTION_DELTA_BOUNDARY | `继续执行增量计划 <delta_result_sha256>` | only DIFFERENT_DRAINED mints the one-shot install capability; SAME/unproven re-presents and wrong lineage denies |
| PLAN_EXECUTION_TRANSFER | NO_PROJECT=`继续计划 <checkpoint_id>`; project-scoped=`进入 <canonical> 项目，继续计划 <checkpoint_id>` | starts the one-shot claim protocol only after the required project transaction/boundary; never copies source capabilities |
| EXECUTION_BOUNDARY | contextual bare `继续\|接着\|继续做` | only DIFFERENT_DRAINED clean C/B → A+EXECUTION_PENDING with first capability; SAME/unproven → REPRESENT |

The D and snapshot identities do not hash JSON serialization. This is the **sole** deferred-request schema and
identity contract; later sections may reference it but may not redefine, default or migrate it. They use the
§6.2 H/LP byte oracle:

```text
binding_sha256 = H(LP("deferred-project-binding:v1") || LP(canonical) || LP(realpath) ||
  LP(decimal_dev) || LP(decimal_ino) || LP(decimal_binding_epoch))
turn_sha256 = H(LP("deferred-project-turn:v1") || LP(event_id) || LP(boundary_id) ||
  LP(decimal_turn_epoch) || LP(outcome_or_empty))
committed_result_sha256 = H(LP("deferred-project-committed-result:v1") || LP(tx) || LP(operation) ||
  LP(target_or_empty) || LP(decimal_old_epoch) || LP(decimal_new_epoch) ||
  LP(project_identity_sha256) || LP(commit_evidence_sha256))
project_origin_snapshot.state_sha256 = H(LP("deferred-project-origin:v1") || LP(project_phase) ||
  LP(binding_sha256) || LP(turn_sha256_or_empty) || LP(committed_result_sha256_or_empty) ||
  LP(decimal_epoch_counter))
request_sha256 = H(LP("deferred-project-request:v2") || LP(generation) || LP(session) ||
  LP(op) || LP(target_or_empty) || LP(source_event) || LP(source_boundary) ||
  LP(project_origin_snapshot.state_sha256) || LP(route_snapshot_kind) ||
  LP(scope_resume_snapshot.snapshot_sha256_or_empty))
tombstone_sha256 = H(LP("scope-completion-tombstone:v1") || LP(generation) || LP(session) ||
  LP(kind) || LP(status) || LP(issued_event) || LP(native_call_id) || LP(step_id_or_empty) ||
  LP(terminal_event_or_empty) || LP(terminal_record_sha256_or_empty) || LP(outcome_or_empty))
payload_sha256 = H(LP("scope-resume-payload:v1") || LP(resume_subphase) ||
  LP(each payload scalar in the exact per-arm order below))
project_identity_sha256 = H(LP("scope-project-identity:v1") || LP(project_kind) ||
  LP(canonical_or_empty) || LP(realpath_or_empty) || LP(dev_or_empty) || LP(ino_or_empty) || LP(epoch_or_empty))
snapshot_sha256 = H(LP("scope-resume-snapshot:v1") || LP(generation) || LP(session) ||
  LP(obligation_id) || LP(exact_task_sha256) || LP(resume_status) || LP(resume_subphase) ||
  LP(source_event) || LP(source_boundary) || LP(project_identity_sha256) ||
  LP(parameter_context_root) || LP(main_agent_human_context_root) || LP(payload_sha256))
```

Decimal identity fields use canonical unsigned base-10 with no leading zero; absent values use the explicit
empty scalar shown above, never omitted/null. `project_identity_sha256` uses the exact formula above.

`ProjectBinding` is the existing strict project binding projected as exactly
`{canonical,realpath,dev,ino,epoch}`; its epoch equals `epoch_counter`. `ProjectTurn` is exactly
`{event_id,boundary_id,epoch,outcome_or_empty}` and its epoch also equals the counter; TURN_ACTIVE requires the
empty outcome and TURN_CLOSED requires the existing bounded nonempty closed outcome. The BOUND commit scalar is
recomputed from the strict committed result fields shown above; it is never accepted from the D alone.
`ProjectOriginSnapshot` is a strict `oneOf` with exactly
`{schema_version:1,project_phase,binding,turn,committed_result_sha256_or_empty,epoch_counter,state_sha256}`:
TURN_ACTIVE and TURN_CLOSED require non-null `ProjectBinding`/`ProjectTurn` and the required empty committed
result scalar; clean BOUND requires non-null `ProjectBinding`, `turn:null` and the nonempty recomputed committed
result SHA.
NO_PIN, SWITCH_ONLY and every transient phase are forbidden creation origins. The hashes above are recomputed
from the complete branch and a mismatched phase/null combination rejects.

`DeferredProjectRequest` is a strict two-arm `oneOf`. Both arms have exactly
`{schema_version:2,request_sha256,source_event,source_boundary,op,target,status,wait_event,
project_origin_snapshot,route_snapshot_kind}`. The ABSENT arm requires `route_snapshot_kind=ABSENT` and
**forbids the key** `scope_resume_snapshot`. The PRESENT arm requires `route_snapshot_kind=PRESENT` and exactly
one additional key `scope_resume_snapshot`, whose strict object and `snapshot_sha256` are defined immediately
below. Target is the canonical string for SWITCH/NEW and the required empty string for DEACTIVATE; status is
`WAITING_NEW_PARENT|WAITING_CONFIRMATION`; wait_event is the required empty string until
WAITING_CONFIRMATION and then the exact verifying event. Unknown/extra/defaulted keys reject. The v1 domain and
nine-key object are invalid bytes, not a compatibility format.

`PROJECT_SCOPE_DRAIN_REQUIRED` has a strict snapshot object with exactly
`{schema_version:1,snapshot_sha256,generation,session,obligation_id,exact_task_sha256,resume_status,
resume_subphase,source_event,source_boundary,project_identity,parameter_contexts,parameter_context_root,
main_agent_human_contexts,main_agent_human_context_root,payload}`.
`parameter_contexts` is a lexicographically phase-ID-sorted, duplicate-free array of at most one strict
`{schema_version:1,phase_id,parameter_queue,parameter_input_sha256}`; the one-member limit follows the
exclusive-wave admission rule. Its queue is the complete terminal §5.3 object including every
`CollectedParameterAnswer`, and the input SHA must recompute from it. It is required exactly for an approved-plan
subphase that can later resume/retry a parameterized phase after its queue became terminal (including active
work/MAIN_AGENT, failure decision and delta repair), and is `[]` for non-approved snapshots and for a live
PHASE_QUESTION whose complete nonterminal queue already appears in `wait_context`. The latter two copies are
never both permitted. `parameter_context_root=H(LP("scope-resume-parameter-context:v1")||
LP(plan_execution_id_or_empty)||LP(decimal context_count)||Σ[LP(phase_id)||LP(queue_sha256)||
LP(collected_answer_root)||LP(parameter_input_sha256)])`; empty/non-approved uses the explicit empty execution
ID and count zero. Missing, extra or hash-only context rejects.

`main_agent_human_contexts` is a lexicographically phase-ID-sorted, duplicate-free array of at most 64 MAIN_AGENT phases,
exactly `{schema_version:1,phase_id,step_graph_sha256,cursor_sequence,human_answers,
main_agent_human_answer_root}`. `human_answers` contains every DONE HUMAN_WAIT in sorted step order as
`{step_id,wait_schema_id,human_answer}` with the complete strict §5.3 object; it is empty only before the first
answer. The array contains exactly every retained per-phase object with at least one completed HUMAN_WAIT,
including active, failed, unaffected-completed and predecessor/delta-evidence phases; an interactive wave still
has at most one nonterminal member, but prior terminal phases are not discarded. It is required in every
approved-plan snapshot from the first completed HUMAN_WAIT until the entire execution becomes terminal,
including a later MAIN_AGENT_HITL wait, and empty otherwise.
`main_agent_human_context_root=H(LP("scope-resume-main-agent-human-context:v1")||
LP(plan_execution_id_or_empty)||LP(decimal context_count)||Σ[LP(phase_id)||LP(step_graph_sha256)||
LP(decimal cursor_sequence)||LP(main_agent_human_answer_root)])`. Each nested root must equal its named retained
phase record and the aggregate must recompute exactly; every answer object is revalidated. An evidence hash
without these preimages is invalid. `payload` is a
closed discriminated union:

| resume_subphase | Exact required payload keys in hash order | Tombstone arm / forbidden data |
|---|---|---|
| CLASSIFY_ISSUED | `receipt_challenge_id` | tombstone forbidden; every Plan/display/execution key forbidden |
| PLAN_ISSUED | `plan_capability_id,capability_seq` | tombstone forbidden; result/finalize/execution keys forbidden |
| PLAN_IN_FLIGHT | `plan_capability_id,capability_seq,native_call_id,tombstone` | tombstone kind PLAN_CALL required; result/finalize/execution keys forbidden |
| PLAN_RESULT_READY | `plan_capability_id,native_call_id,plan_result_id,result_sha256,finalize_capability_id` | tombstone forbidden; execution/display keys forbidden |
| APPROVED_PLAN_BEGIN | `plan_execution_id,plan_result_id,scope_summary_sha256,begin_capability_id` | selection requires route status PLAN_EXECUTION_PENDING with no phase/delta/wave/finalize call; only the non-work begin capability is admitted |
| APPROVED_PLAN_FRONTIER | `plan_execution_id,plan_result_id,completed_phase_set_sha256,active_phase_evidence_root,frontier_sha256,frontier_records` | selection requires 1–3 open phase-authority records; each strict record is a native PREFLIGHT/WORK/MAIN_AGENT_STEP/JOIN/QUALITY ISSUED/IN_FLIGHT arm or a non-native PHASE_COMPLETION/MAIN_AGENT_COMPLETION ISSUED arm, so legal same-wave coexistence has one representation; active root binds terminal progress, including completed main-agent steps, not represented by an open record |
| APPROVED_PLAN_BETWEEN_WAVES | `plan_execution_id,plan_result_id,completed_phase_set_sha256,completed_evidence_root,next_wave_sha256,wave_choice_capability_id,checkpoint_required` | selection requires zero phase/delta calls and overall_state=BETWEEN_WAVES; no work tombstone/capability except the non-work choice |
| APPROVED_PLAN_DELTA_CALL | `plan_execution_id,plan_result_id,delta_sequence,delta_capability_id,delta_call_state,native_call_id_or_empty,tombstone_or_null` | selection requires delta call ISSUED or IN_FLIGHT; IN_FLIGHT requires PLAN_DELTA_CALL tombstone, ISSUED requires empty native ID/null tombstone; every phase-call field forbidden |
| APPROVED_PLAN_WAIT | `plan_execution_id,plan_result_id,phase_id,wait_id,wait_sha256,wait_context` | capability/tombstone forbidden; `wait_context` is the strict recoverable oneOf below, never a hash without its preimage; every arm requires zero sibling authority: MAIN_AGENT_HITL/parameter question rely on exclusive-wave validation, PHASE_CONFIRMATION begins only after wave drain, and PREFLIGHT_OVERRIDE/FAILURE_DECISION rely on completed drain |
| APPROVED_PLAN_REPLAN | `plan_execution_id,plan_result_id,replan_state,delta_sequence,failure_evidence_root,delta_result_id_or_empty` | selection requires no issued/in-flight delta call; capability/tombstone forbidden |
| APPROVED_PLAN_DELTA_WAIT | `plan_execution_id,delta_result_id,delta_result_sha256,wait_id,wait_sha256,approval_required` | capability/tombstone forbidden |
| APPROVED_PLAN_BOUNDARY_WAIT | `plan_execution_id,plan_result_id,wait_id,wait_sha256` | phase/tool capability forbidden |
| APPROVED_PLAN_FINAL_ASSERTIONS | `plan_execution_id,plan_result_id,completed_evidence_root,final_assertion_set_sha256,final_quality_state,final_quality_capability_id_or_empty,native_call_id_or_empty,tombstone_or_null,final_assertion_evidence_root_or_empty,execution_finalize_capability_id_or_empty` | selection requires overall_state=FINAL_ASSERTIONS with zero phase/delta/wave calls and exactly one strict final-quality arm: ISSUED carries only its capability; IN_FLIGHT carries native ID plus APPROVED_FINAL_QUALITY tombstone; VERIFIED carries only terminal tombstone, immutable assertion evidence and finalizer |
| APPROVED_PLAN_SUMMARY_STAGED | `plan_execution_id,plan_result_id,summary_sha256` | capability/tombstone forbidden |
| DISPLAY_UNVERIFIED | `presentation_id,display_sha256,target_status,wait_kind_or_empty` | tombstone forbidden; Plan/execution keys forbidden |
| WAIT_VERIFIED | `wait_id,wait_kind,wait_sha256,result_sha256_or_empty` | tombstone forbidden; capability keys forbidden |
| BOUNDARY_WAIT_VERIFIED | `wait_id,display_sha256` | tombstone forbidden; capability/result keys forbidden |
| EXECUTION_ISSUED | `selection_id,execution_id,execution_capability_id,step_id` | tombstone forbidden; Plan/display keys forbidden |
| EXECUTION_IN_FLIGHT_STEP | `selection_id,execution_id,step_id,native_tool_call_id,tombstone` | tombstone kind EXECUTION_TOOL required; successor/Plan/display keys forbidden |
| EXECUTION_BETWEEN_STEPS | `selection_id,execution_id,next_step_id` | tombstone forbidden; issued/draft/Plan keys forbidden |
| RESPONSE_DRAFT_STAGED | `selection_id,execution_id,draft_sha256` | tombstone forbidden; tool/Plan/display keys forbidden |

`APPROVED_PLAN_WAIT.wait_context` is one strict `additionalProperties:false` arm with every listed scalar
recoverable: PHASE_QUESTION exactly
`{kind:PHASE_QUESTION,phase_id,child_id_or_empty,question_schema_id,question_index,question_count,
parameter_queue_sha256,ordered_questions,collected_answers,collected_answer_root,display_sha256,
answer_policy_sha256}`;
MAIN_AGENT_HITL exactly
`{kind:MAIN_AGENT_HITL,phase_id,step_id,step_graph_sha256,cursor_sequence,main_agent_evidence_root,
main_agent_human_answer_root,wait_schema_id,display_sha256}`; PHASE_CONFIRMATION exactly
`{kind:PHASE_CONFIRMATION,phase_id,queue_sha256,wave_terminal_evidence_root,ordered_phase_ids,
queue_cursor,confirmed_receipts,phase_evidence_root,quality_result_sha256,display_sha256}`;
PREFLIGHT_OVERRIDE exactly
`{kind:PREFLIGHT_OVERRIDE,phase_id,child_id_or_empty,preflight_result_sha256,finding_sha256,
preflight_policy_sha256,retry_count,suspended_successor_sha256,suspended_successor_records,
parameter_queue:null,question_source_plan_sha256,
display_sha256}`; FAILURE_DECISION exactly
`{kind:FAILURE_DECISION,failure_scope,failure_evidence_root,retry_count,human_waivable,
skip_policy_sha256,suspended_successor_sha256,suspended_successor_records,display_sha256}`. `phase_id` in the outer payload must equal the arm's phase or the reserved
`FINAL` for a final-quality failure. `wait_context_sha256=H(LP("approved-plan-wait-context:v1")||LP(kind)||
LP(each scalar in the displayed order)||LP(each strict framed question/answer/phase/receipt/successor/queue
array or object exactly where displayed))`, with
canonical decimal cursor/retry counts, is recomputed and
bound inside `wait_sha256`; it is not accepted as a caller field. A missing parameter/confirmation cursor,
graph cursor, preflight/failure policy, display preimage or unknown arm is invalid, so restoring a wait never asks the controller to reconstruct
authority from an opaque digest.
For PHASE_QUESTION, `ordered_questions` and `collected_answers` are exactly the §5.3 strict queue objects;
every `CollectedParameterAnswer` including canonical answer bytes, decoded length, option ID and native
event/boundary is embedded in the wait snapshot. Project steering, checkpoint, crash restore and
re-presentation copy those complete immutable objects and recompute the same roots; none may reduce an answer
to its SHA or seek its preimage in transcript history.

Every payload object has `additionalProperties:false`; every listed scalar is required and bounded by its
own source schema; the `tombstone` payload slot contributes only its recomputed `tombstone_sha256` scalar to
`payload_sha256`, while the full strict object is persisted for read-back. Tombstone is itself a strict oneOf: AWAITING_TERMINAL requires exactly
`{schema_version:1,tombstone_sha256,kind,status,issued_event,native_call_id,step_id_or_empty}`;
TERMINAL_ACCEPTED or ABORTED additionally requires exact
`terminal_event,terminal_record_sha256,outcome`, recomputes the hash with those non-empty values, and forbids an
authorization/capability field. `kind` is the closed
`PLAN_CALL|PLAN_DELTA_CALL|APPROVED_PREFLIGHT|APPROVED_WORK|APPROVED_MAIN_AGENT_STEP|APPROVED_JOIN|
APPROVED_QUALITY_GATE|APPROVED_FINAL_QUALITY|EXECUTION_TOOL`
enum and must match the saved record's call kind. The snapshot is immutable except for this one AWAITING→terminal tombstone arm,
which atomically recomputes payload/snapshot hashes. Cross-harness golden vectors freeze every D, payload,
tombstone and snapshot hash; field omission, order swap, domain substitution, unknown key and JSON-key-order
variation are biting fixtures.

For APPROVED_PLAN_FRONTIER, every record is exactly one strict `oneOf` arm. A native ISSUED arm requires
`{phase_id,child_id_or_empty,authority_kind,state:ISSUED,capability_id,native_call_id_or_empty:"",
tombstone:null,phase_evidence_root_or_empty:""}` with `authority_kind=SKILL_PREFLIGHT|PARALLEL_PREFLIGHT|
TASK_WORK|SKILL_WORK|PARALLEL_WORK|MAIN_AGENT_STEP|JOIN_SUMMARY|QUALITY_GATE`;
its IN_FLIGHT arm has the same keys, a nonempty native ID and one tombstone whose kind is the exact mapping
SKILL/PARALLEL_PREFLIGHT→APPROVED_PREFLIGHT, TASK/SKILL/PARALLEL_WORK→APPROVED_WORK, JOIN_SUMMARY→APPROVED_JOIN,
MAIN_AGENT_STEP→APPROVED_MAIN_AGENT_STEP, QUALITY_GATE→APPROVED_QUALITY_GATE. A non-native completion arm
requires the same keys with empty child/native ID, `authority_kind=PHASE_COMPLETION|MAIN_AGENT_COMPLETION`,
`state=ISSUED`, null tombstone and the nonempty phase/main-agent evidence root bound by that completion
capability. MAIN_AGENT_COMPLETION is valid only when the controller state also carries the exact immutable
step-graph SHA and all graph steps are terminal. No other combination is valid. `frontier_sha256` is H/LP over domain
`approved-plan-frontier:v1`, plan execution/result IDs, completed-phase-set hash, active-phase-evidence root,
record count and each lexicographically sorted record's phase ID, child ID or empty, authority kind, state,
capability/native-call IDs or empty scalars, phase evidence root or empty scalar, and recomputed tombstone SHA
or empty scalar. The record count is 1–3 and uses the same global scheduled-frontier ceiling as §5.3.
Evidence roots are not opaque caller strings. For each phase,
`phase_evidence_root=H(LP("approved-plan-phase-evidence:v1")||LP(plan_execution_id)||LP(phase_id)||
LP(decimal leaf_count)||Σ[LP(evidence_kind)||LP(owner_id_or_empty)||LP(child_id_or_empty)||LP(evidence_sha256)])`
over the lexicographically sorted unique strict leaf enum `PREFLIGHT|PARAMETER|WORK_OUTPUT|JOIN_OUTPUT|
QUALITY_RESULT|PHASE_ASSERTION`. `active_phase_evidence_root` uses domain
`approved-plan-active-evidence:v1`, plan execution ID, active-phase count and each sorted
`LP(phase_id)||LP(current_phase_state)||LP(phase_evidence_root)`. `completed_evidence_root` uses domain
`approved-plan-completed-evidence:v1`, plan execution ID, terminal-phase count and each sorted
`LP(phase_id)||LP(PHASE_COMPLETE|PHASE_WAIVED)||LP(phase_evidence_root)`. Counts are decimal canonical scalars;
duplicates, unknown evidence kinds, owner/child mismatch or a leaf not already durable in controller state
reject. Thus a finished parallel child cannot disappear merely because it no longer owns an open frontier record.

For APPROVED_PLAN_FINAL_ASSERTIONS, `final_quality_state` is exactly `ISSUED|IN_FLIGHT|VERIFIED`. ISSUED
requires nonempty final-quality capability, empty native/evidence/finalizer scalars and null tombstone.
IN_FLIGHT requires empty capability, nonempty native ID, an AWAITING_TERMINAL APPROVED_FINAL_QUALITY tombstone,
and empty evidence/finalizer scalars. VERIFIED requires empty capability/native ID, a terminal
APPROVED_FINAL_QUALITY tombstone, and nonempty immutable assertion-evidence and execution-finalize capability
IDs. `approved_plan_final_assertions_sha256=H(LP("approved-plan-final-assertions:v1")||
LP(plan_execution_id)||LP(plan_result_id)||LP(completed_evidence_root)||LP(final_assertion_set_sha256)||
LP(final_quality_state)||LP(final_quality_capability_id_or_empty)||LP(native_call_id_or_empty)||
LP(tombstone_sha256_or_empty)||LP(final_assertion_evidence_root_or_empty)||
LP(execution_finalize_capability_id_or_empty))`. No state may carry both native and finalizer authority.

`drain_frontier` is a strict failure-only object
`{schema_version:1,drain_sha256,decision_kind:PREFLIGHT_OVERRIDE|FAILURE_DECISION,
failure_scope,failure_evidence_root,active_phase_evidence_root,
suspended_successor_sha256,suspended_successor_records,records}`. Failure admission is one rename that consumes
the failed call and revokes **every** ISSUED authority in the scheduled frontier, native and non-native. The
remaining `records` are 1–2 exact native FRONTIER IN_FLIGHT arms with AWAITING_TERMINAL tombstones; no released
call is omitted. In that same failure-admission rename, `suspended_successor_records` is initialized with the
one FAILED_SCOPE retry record for the consumed failed call plus one phase-relative record for every revoked ISSUED
authority. It is a bounded 1–3 array with a closed strict `oneOf`:

- CALL exactly `{kind:CALL,origin:FAILED_SCOPE|SAME_PHASE|OTHER_PHASE,phase_id,child_id_or_empty,authority_kind,owner_id,agent_contract_id,
  execution_contract_id,input_sha256,evidence_preimage_sha256}`;
- PHASE_COMPLETION exactly `{kind:PHASE_COMPLETION,origin:SAME_PHASE|OTHER_PHASE,phase_id,phase_evidence_root}`;
- MAIN_AGENT_COMPLETION exactly `{kind:MAIN_AGENT_COMPLETION,origin:SAME_PHASE|OTHER_PHASE,phase_id,step_graph_sha256,
  main_agent_evidence_root}`;
- PREFLIGHT_TERMINAL exactly `{kind:PREFLIGHT_TERMINAL,origin:SAME_PHASE|OTHER_PHASE,phase_id,
  child_id_or_empty,result_state:PASS,preflight_result_sha256}`; it is evidence-only and never reissued as a call;
- FINAL_QUALITY_RETRY exactly `{kind:FINAL_QUALITY_RETRY,origin:FAILED_SCOPE,final_assertion_set_sha256,
  failure_evidence_root,registered_owner_id,agent_contract_id,execution_contract_id}`.

Every arm has `additionalProperties:false`; CALL authority_kind is the same closed call enum, while
PHASE_COMPLETION and MAIN_AGENT_COMPLETION are non-native authority records and PREFLIGHT_TERMINAL is a
non-authorizing evidence record. Human waits never appear here because every
declared human-wait phase is an exclusive wave; a state containing one beside a failure drain is invalid.
The failed phase token is immutable in the failure context. Every nonfailed record with that token is
SAME_PHASE; every nonfailed record with another token is OTHER_PHASE. The array is sorted by closed origin rank
`FAILED_SCOPE=0,SAME_PHASE=1,OTHER_PHASE=2`, then `kind,phase_id_or_empty,child_id_or_empty`, and is unique;
arms without either sort field contribute the explicit empty scalar. Only the consumed failed call's retry arm
may use FAILED_SCOPE; no caller supplies or changes the phase relation. Its identity is
`suspended_successor_sha256=H(LP("approved-plan-suspended-successors:v1")||LP(plan_execution_id)||
LP(plan_result_id)||LP(decimal record_count)||Σ[LP(origin)||LP(kind)||LP(each remaining arm scalar in the displayed order)])`.
`drain_sha256=H(LP("approved-plan-failure-drain:v2")||LP(plan_execution_id)||LP(plan_result_id)||
LP(decision_kind)||LP(failure_scope)||LP(failure_evidence_root)||LP(active_phase_evidence_root)||
LP(suspended_successor_sha256)||LP(decimal live_record_count)||Σ[LP(each exact FRONTIER record scalar)])`.

If failure admission finds no other IN_FLIGHT native record, it verifies that already initialized successor
array and stages the policy-selected PREFLIGHT_OVERRIDE or FAILURE_DECISION directly. It does not create an
empty `drain_frontier`. Thus preflight, phase and FINAL
failures share one replay-safe successor contract whether or not a sibling must drain; no final PostTool is
asked to reconstruct the failed retry or an authority revoked earlier.

While live records remain, only the exact paired `record-preflight|record-work|record-main-step|
complete-summary|record-quality-gate|record-final-quality|record-failure` terminal request may consume its
record. A successful completion appends its immutable evidence and the controller-derived successor arm to
`suspended_successor_records`; a preflight PASS with no immediately legal call successor appends the exact
PREFLIGHT_TERMINAL evidence arm instead. A failure appends aggregate failure evidence and only the retry arm justified by
that call. Neither path mints PHASE_COMPLETION, MAIN_AGENT_COMPLETION, tool, wait or final-quality authority.
The last consume atomically removes `drain_frontier` and stages the policy-selected PREFLIGHT_OVERRIDE or
aggregate phase-failure presentation
carrying the complete successor records/hash. Any prompt/project intent during the drain is durably
REJECTED_BUSY without altering route/project/evidence bytes, and Stop is blocked. RETRY may reissue every exact
persisted authority record once and restores PREFLIGHT_TERMINAL arms only as evidence. PHASE-only SKIP
terminally tombstones FAILED_SCOPE and **every SAME_PHASE record**, marks
that phase PHASE_WAIVED, and may reissue only OTHER_PHASE records under the global frontier cap and Plan skip
policy; OTHER_PHASE PREFLIGHT_TERMINAL remains evidence, not authority. A later completion can therefore never belong to the waived phase. REPAIR/TERMINATE terminally tombstone every
record. No opaque successor root, replayable pre-failure PHASE_COMPLETION authority
or implementation-derived reconstruction path exists.
APPROVED_PLAN_DELTA_CALL alone admits PLAN_DELTA_CALL and hashes its listed scalars under
`approved-plan-delta-call-snapshot:v1`. BEGIN, FRONTIER, DELTA_CALL, BETWEEN_WAVES,
FINAL_ASSERTIONS and REPLAN have mutually exclusive
selection predicates; matching zero or more than one is STATE_TRANSITION_INVALID.
`completed_phase_set_sha256` likewise hashes the sorted unique terminal phase IDs under its own
`approved-plan-completed-set:v1` domain. JSON serialization never supplies either identity.

`resume_status` is the exact pre-D live route status; `resume_subphase` is one closed value from the following
table, not the coarser ROUTE/REPLAN/REEXECUTE label. A Plan call or execution tool already released before D
stores the non-authorizing tombstone above. While the wait exists, only its exact paired completion may update
that tombstone; it can never authorize another PreTool, Plan call or project mutation.

| Saved status | Closed saved subphase | Exact action after D is cleared without S |
|---|---|---|
| PENDING / RESUMED | CLASSIFY_ISSUED | restore the exact status and issue a fresh classify challenge bound to the current event |
| PLAN_REVISION_REQUIRED / PLANNING_PENDING | PLAN_ISSUED | restore the exact status with a fresh Plan-call capability; old capability remains revoked |
| PLANNING_PENDING | PLAN_IN_FLIGHT | restore PLANNING_PENDING with only the completion tombstone; after exact terminal/PostTool, reject the old result as authority and issue one fresh Plan-call capability |
| PLANNING_PENDING | PLAN_RESULT_READY | preserve the immutable result/original call IDs and rotate only the independent event-bound finalizer |
| PLAN_EXECUTION_PENDING | APPROVED_PLAN_BEGIN | preserve immutable plan/result/scope bytes and mint one fresh event-bound begin capability; never copy the old begin authority |
| PLAN_EXECUTION_ACTIVE | APPROVED_PLAN_FRONTIER | restore the exact completed set/active evidence and typed mixed frontier; revoke native/non-native ISSUED records, retain only typed IN_FLIGHT tombstones, and after every tombstone is terminal mint fresh legal native/PHASE_COMPLETION/MAIN_AGENT_COMPLETION capabilities for the saved frontier; never complete a phase inside the restore rename |
| PLAN_EXECUTION_ACTIVE | APPROVED_PLAN_BETWEEN_WAVES | restore the completed-set/evidence/next-wave hashes and mint one fresh event-bound wave-choice capability; never issue work in the restore rename |
| PLAN_EXECUTION_WAITING_HUMAN | APPROVED_PLAN_WAIT | re-present the exact PHASE_QUESTION, MAIN_AGENT_HITL, PHASE_CONFIRMATION, PREFLIGHT_OVERRIDE or FAILURE_DECISION wait from its complete wait_context; never copy the old wait event or synthesize a parameter/confirmation/graph cursor or policy from a digest |
| PLAN_EXECUTION_REPLAN_PENDING | APPROVED_PLAN_DELTA_CALL | revoke ISSUED delta authority or retain only its typed in-flight completion tombstone; after terminal evidence, return to the same REPLAN trigger with a fresh delta capability |
| PLAN_EXECUTION_REPLAN_PENDING | APPROVED_PLAN_REPLAN | restore the same replan trigger/affected/completed evidence and issue one fresh delta capability |
| PLAN_EXECUTION_DELTA_PRESENTATION_PENDING / PLAN_EXECUTION_WAITING_DELTA_APPROVAL / PLAN_EXECUTION_WAITING_DELTA_BOUNDARY | APPROVED_PLAN_DELTA_WAIT | re-present the immutable delta/wait; never install from the project event |
| PLAN_EXECUTION_WAITING_BOUNDARY | APPROVED_PLAN_BOUNDARY_WAIT | re-present the exact approved-plan boundary instruction; no phase capability |
| PLAN_EXECUTION_ACTIVE | APPROVED_PLAN_FINAL_ASSERTIONS | restore the exact final-quality arm: ISSUED rotates only the registered final-quality capability; IN_FLIGHT retains only its completion tombstone and derives VERIFIED/failure after terminal evidence; VERIFIED rotates only the execution finalizer. Never skip the native final-quality lifecycle or carry old event-bound authority |
| PLAN_EXECUTION_COMPLETE_PENDING_STOP | APPROVED_PLAN_SUMMARY_STAGED | re-present the exact approved-plan summary; no phase/tool capability |
| PRESENTATION_PENDING | DISPLAY_UNVERIFIED | re-present the exact old display bytes with a fresh display challenge |
| WAITING_HUMAN / WAITING_PLAN_APPROVAL | WAIT_VERIFIED | re-present the exact verified question/plan as PRESENTATION_PENDING; never copy the old wait event |
| EXECUTION_WAITING_BOUNDARY | BOUNDARY_WAIT_VERIFIED | re-present the exact boundary display; no execution capability |
| EXECUTION_PENDING | EXECUTION_ISSUED | issue a fresh execution capability only if effective_project_context is now true; otherwise stage the ordinary execution-boundary wait |
| EXECUTION_ACTIVE | EXECUTION_IN_FLIGHT_STEP | restore EXECUTION_ACTIVE with only the exact completion tombstone; no successor capability until paired PostTool/terminal records completion, then derive the next policy step or staged completion once |
| EXECUTION_ACTIVE | EXECUTION_BETWEEN_STEPS | restore the same execution/selection and issue exactly the next policy step only if effective_project_context is true; otherwise stage the ordinary execution-boundary wait |
| EXECUTION_COMPLETE_PENDING_STOP | RESPONSE_DRAFT_STAGED | re-present the exact staged response/output hash; no execution capability |

Clearing D and restoring this table is one state rename. Any missing/mismatched snapshot, unlisted status or
subphase, a second completion tombstone, or restoration that cannot satisfy its stated context predicate is
`STATE_TRANSITION_INVALID` with no command/capability. A scope-drain display may Stop only after exact display
proof and no completion tombstone remains AWAITING_TERMINAL; otherwise the paired completion gate blocks Stop
without granting a new tool.

That exact-restore table is **only** for CANCEL/CURRENT or another result that clears D without creating S and
without changing the canonical project identity. Successful project mutation uses a separate
`PROJECT_CHANGE_COMMITTED` projection; it never edits or revives the old obligation, result or selection:

```text
rebased_obligation_id = H(LP("route-obligation-project-rebind:v1") || LP(generation) || LP(session) ||
  LP(old_obligation_id) || LP(old_exact_task_sha256) || LP(change_kind) || LP(change_evidence_id) ||
  LP(new_project_identity_sha256) || LP(current_event) || LP(current_boundary))
```

For a committed change, `change_kind=COMMITTED_SWITCH|COMMITTED_NEW|COMMITTED_DEACTIVATE` and
`change_evidence_id=committed_tx`; the identity is exact BOUND or NO_PIN. On the first exact
DIFFERENT_DRAINED committed-boundary continuation, one rename stores the old obligation and
all capability/result/display/selection IDs as one strict predecessor variant and replaces the live route object.
The evidence identities are mechanically framed:

```text
evidence_ids_sha256 = H(LP("superseded-evidence-ids:v1") || LP(resume_subphase) ||
  LP(old_snapshot_sha256) || LP(payload_sha256))
committed_predecessor_sha256 = H(LP("superseded-predecessor:v1:committed") ||
  LP(old_obligation_id) || LP(old_snapshot_sha256) || LP(evidence_ids_sha256) ||
  LP(committed_tx) || LP(committed_op) || LP(committed_project_identity_sha256))
target_current_predecessor_sha256 = H(LP("superseded-predecessor:v1:target-current") ||
  LP(old_obligation_id) || LP(old_snapshot_sha256) || LP(evidence_ids_sha256) ||
  LP(request_sha256) || LP(census_receipt_sha256) || LP(current_project_identity_sha256))
```

`superseded_predecessor` is a strict `oneOf` with `additionalProperties:false` in both arms:

- COMMITTED_CHANGE requires exactly
  `{schema_version:1,status:SUPERSEDED,variant:COMMITTED_CHANGE,predecessor_sha256,old_obligation_id,
  old_snapshot_sha256,evidence_ids_sha256,committed_tx,committed_op,committed_project_identity_sha256}` and
  forbids request/census fields;
- TARGET_BECAME_CURRENT requires exactly
  `{schema_version:1,status:SUPERSEDED,variant:TARGET_BECAME_CURRENT,predecessor_sha256,old_obligation_id,
  old_snapshot_sha256,evidence_ids_sha256,request_sha256,census_receipt_sha256,
  current_project_identity_sha256}` and forbids every commit field.

Every route obligation has one strict provenance `oneOf`. ORIGINAL requires exactly
`{kind:ORIGINAL,activation_prompt_sha256,original_task_prompt_sha256}` with both values equal to the authenticated
source prompt's `prompt_sha256`, and forbids predecessor/change fields. PROJECT_REBOUND requires exactly
`{kind:PROJECT_REBOUND,activation_prompt_sha256,original_task_prompt_sha256,origin_obligation_id,
predecessor_sha256,change_kind,change_evidence_id}`; `activation_prompt_sha256` is the current bare/retry prompt,
while the base obligation `prompt_sha256` and `original_task_prompt_sha256` remain the predecessor's original
task-source prompt hash. The rebound source event/boundary is current, exact task text/SHA is byte-identical,
project identity is new, status is PENDING/CLASSIFY_ISSUED, and every Plan/result/display/selection/execution
field is forbidden until the fresh classify receipt creates it. Unknown/mixed provenance keys reject.

Thus COMMITTED_CHANGE uses `predecessor_sha256=committed_predecessor_sha256`, while
TARGET_BECAME_CURRENT uses `target_current_predecessor_sha256` and makes no transaction/commit claim. The new
object has the rebind ID above, the committed BOUND identity for SWITCH/NEW or exact NO_PIN identity for
DEACTIVATE, and one fresh classify challenge. No old ID or project field is rewritten. An AWAITING_TERMINAL
tombstone makes projection BUSY/no-capability until its exact terminal arm is durable.

| Committed change saved subphase | Mandatory PROJECT_CHANGE_COMMITTED projection |
|---|---|
| CLASSIFY_ISSUED | supersede old classify ID; new bound obligation→PENDING/CLASSIFY_ISSUED |
| PLAN_ISSUED | supersede Plan capability; new bound obligation→PENDING/CLASSIFY_ISSUED |
| PLAN_IN_FLIGHT | require terminal tombstone, reject old result as authority, then new bound obligation→PENDING/CLASSIFY_ISSUED |
| PLAN_RESULT_READY | retain immutable result only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_BEGIN | revoke the begin capability and retain plan/result/scope bytes only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_FRONTIER | require every typed in-flight tombstone terminal and revoke every native, PHASE_COMPLETION or MAIN_AGENT_COMPLETION ISSUED authority; retain frontier/evidence only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_BETWEEN_WAVES | consume/revoke wave-choice authority; retain completed/next-wave hashes only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_WAIT | supersede the phase wait/event and all retry authority; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_DELTA_CALL | require an in-flight delta tombstone terminal or revoke ISSUED delta authority; retain lineage only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_REPLAN | revoke the unissued delta/replan authority; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_DELTA_WAIT | supersede delta result/finalizer/install/wait authority; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_BOUNDARY_WAIT | supersede approved-plan boundary wait; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_FINAL_ASSERTIONS | require an in-flight APPROVED_FINAL_QUALITY tombstone terminal or revoke ISSUED final-quality/finalizer authority; retain only the assertion-set/result/evidence identities as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| APPROVED_PLAN_SUMMARY_STAGED | retain the exact staged summary only as superseded evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| DISPLAY_UNVERIFIED | supersede unseen display/challenge; new bound obligation→PENDING/CLASSIFY_ISSUED |
| WAIT_VERIFIED | supersede old wait/event; new bound obligation→PENDING/CLASSIFY_ISSUED |
| BOUNDARY_WAIT_VERIFIED | supersede old boundary wait; new bound obligation→PENDING/CLASSIFY_ISSUED |
| EXECUTION_ISSUED | revoke old selection/capability; new bound obligation→PENDING/CLASSIFY_ISSUED |
| EXECUTION_IN_FLIGHT_STEP | require terminal tombstone and record outcome only as predecessor evidence; new bound obligation→PENDING/CLASSIFY_ISSUED |
| EXECUTION_BETWEEN_STEPS | revoke old selection/next step; new bound obligation→PENDING/CLASSIFY_ISSUED |
| RESPONSE_DRAFT_STAGED | supersede old staged response; new bound obligation→PENDING/CLASSIFY_ISSUED |

The new-task-with-S snapshot uses CLASSIFY_ISSUED and follows the same projection. Thus all three operations ×
all saved subphases converge on a newly bound route decision; a successful SWITCH/NEW/DEACTIVATE can never
re-expose an old approval wait, Plan result, execution selection or response draft. Missing committed evidence,
task bytes, predecessor hash or a table arm is STATE_TRANSITION_INVALID and creates no replacement.

No other wait transition exists. The accepted THIN task bytes come from the strict Plan result, never from an
untyped `smaller_alternative.statement` or caller-supplied acceptance text. Resumed/revision/execution states
block Stop until their next valid receipt. Peer/meta never resolves a wait.

PreToolUse denies all mutation-capable tools and Bash bypasses while status is PENDING/RESUMED/
PLANNING_PENDING/PRESENTATION_PENDING/PLAN_REVISION_REQUIRED, PLAN_EXECUTION_PENDING/
PLAN_EXECUTION_FAILURE_DRAIN/PLAN_EXECUTION_WAITING_HUMAN/PLAN_EXECUTION_COMPLETE_PENDING_STOP, EXECUTION_PENDING,
EXECUTION_WAITING_BOUNDARY, WAITING_HUMAN or WAITING_PLAN_APPROVAL, except the
frozen read-only argv grammar, exact persisted project transaction, exact one-shot Plan Agent/result or
execution capability, exact paired completion tombstone, and exact receipt controller as appropriate. A
completion tombstone admits PostTool/terminal read-back only, never PreTool. EXECUTION_ACTIVE and
PLAN_EXECUTION_ACTIVE use separately bound per-step/per-phase capabilities; neither is a blanket bypass. Stop
uses the same validator: PENDING/RESUMED/PLANNING_PENDING/PLAN_REVISION_REQUIRED/PLAN_EXECUTION_PENDING/
PLAN_EXECUTION_ACTIVE/EXECUTION_PENDING blocks and reinjects the next persisted action;
PLAN_EXECUTION_FAILURE_DRAIN blocks without minting/reinjecting a successor and admits only its paired terminal records;
PRESENTATION_PENDING validates the exact final-assistant projection and blocks/reinjects on mismatch;
EXECUTION_ACTIVE requires exact completion/wait evidence; EXECUTION_COMPLETE_PENDING_STOP requires its staged
response/output read-back; verified WAITING_HUMAN/WAITING_PLAN_APPROVAL/PLAN_EXECUTION_WAITING_HUMAN/
EXECUTION_WAITING_BOUNDARY and the one documented switch/defer boundary may
Stop; SATISFIED/CANCELLED/SUPERSEDED do not block.

The frozen read-only Bash grammar parses one argv vector itself and rejects newline, control operators,
redirection, globbing, command/process substitution, environment assignment, response files and unknown flags;
it never asks a shell whether text is safe. The only executables are: `pwd` with no args; `rg` with the closed
flags `-n|--fixed-strings|--files` and literal bounded roots; `sed -n <numeric[,numeric]p> <one literal file>`;
`git --no-pager --no-optional-locks status --short --untracked-files=all`; `git --no-pager --no-optional-locks diff|show` only with
`--no-ext-diff --no-textconv` and literal pathspecs/reviewed object IDs;
`git --no-pager --no-optional-locks rev-parse --verify` for HEAD/upstream/exact frozen IDs; and
`shasum -a 256` over literal bounded files. Canonical file-read tools remain read-only. Everything else,
including an option that changes behavior outside this list, is mutation-capable/unknown and denied.

The controller exception is a separate capability grammar, never part of read-only Bash. It accepts exactly
the absolute manifest/journal-bound Node `process.execPath` realpath/dev/ino/SHA, one active-manifest controller path, one closed verb, then
`--request-b64 [A-Za-z0-9_-]+ --request-sha256 [0-9a-f]{64}` in that order and nothing else; the command parser
rejects quotes, whitespace inside tokens and every shell metacharacter before process launch. The decoded
request must match the current one-shot capability and controller-side SHA as specified above.

This is the source repair for “the hint existed but the agent ignored it” and “继续啊，你总停干什么”.

## 6. Prompt gate, lazy native attestation and anti-replay

### 6.1 UserPromptSubmit is revoke-and-queue only

Raw payload validation is strict and non-destructive:

- stdin is read with a limit+1 streaming reader before JSON parse; the complete envelope is at most 524,288
  bytes, `cwd` is a canonical string of at most 4,096 UTF-8 bytes and must equal the invocation's reviewed
  repository root, and the L0-frozen harness key set/types reject unknown or duplicate keys;
- raw session ID must equal its validated 1–36 ASCII `[A-Za-z0-9_-]` form;
- decoded prompt is the JSON string encoded as exact UTF-8, maximum 262,144 bytes;
- Claude requires a non-empty transcript path string of at most 1,024 bytes. Codex accepts either such a
  rollout-path hint or the observed JSON `null`; null means `UNPUBLISHED_SOURCE`, never an empty/fabricated path;
- Claude candidate requires exactly `prompt_id` as a canonical UUID and no `turn_id`;
- Codex candidate requires exactly `turn_id` as 1–128 safe ASCII and no `prompt_id`;
- both/neither native identity shapes, truncation, deletion, fallback IDs and unknown payload schema fail closed;
- `actualHarness()` is diagnostic/parser-selection input only, never authorization evidence.

For a valid sid and parseable schema-v3 document, UserPromptSubmit takes only the session lock and atomically:

1. sets `prompt_gate.phase=ATTESTATION_PENDING`, making every prior write grant unusable immediately;
2. snapshots the canonical conversation source without interpreting a user record. A present source stores
   `{kind:PRESENT,path,dev,ino,size,tail_hash}`. For Codex null, a bounded no-follow suffix census below the real
   sessions root either finds the one exact `-<sid>.jsonl` and snapshots it, or stores
   `{kind:UNPUBLISHED,root_dev,root_ino,census_digest}` proving no such file existed; cap/ambiguity fails closed.
   It then appends a bounded untrusted candidate `{arrival_seq,sid,claimed_harness,cwd,source_locator,
   enqueue_snapshot,native_hint,prompt,prompt_utf8_length,prompt_sha256}` to a maximum-eight queue with an
   aggregate raw-prompt cap of 524,288 bytes;
3. changes no project binding/epoch, creates no ledger event, route obligation, tx or command.

Candidate cap+1 is not recoverable AUTH_BLOCKED: because the ninth native delivery cannot be represented in the
ordered queue, one reserved-slot rename enters
`ROTATION_REQUIRED(PENDING_CAPACITY_UNREPRESENTED_DELIVERY)`, preserves the last trusted cursor/project/core,
stores the enqueue snapshot hash and denies every ordinary route/project action for that sid. It never consumes
the unrepresented native group; recovery requires a fresh sid. The eight-pending+ninth-human+tenth-human fixture
must terminate in this rotation code rather than an endless mismatch loop. For an otherwise valid sid,
malformed candidate identity sets AUTH_BLOCKED without a queue entry; malformed existing state is never
rewritten and all consumers deny it. An absent state has exactly two legal bootstraps. Both first-state
publications include the strict generation/session-bound zero `transfer_security_ledger` from §5.3; failure to
fit or read back that mandatory object is a rotation-required bootstrap failure, never a reduced schema. For PRESENT source shape
A/B, the native file must contain the same sid's frozen fresh preamble and at most its first direct-human
delivery window; cursor initializes at the end of the preamble. For Codex U, the suffix census must prove no sid
source exists and the state records `bootstrap=UNPUBLISHED_SOURCE`, a null cursor, the root census and the first
pending candidate. Lazy attestation may replace that provisional bootstrap only when exactly one new source
appears with the same sid/cwd fresh preamble followed by the candidate's first current group; preamble
validation, cursor initialization, event acceptance and cursor advance occur in one state rename. Any earlier
direct-human group, old terminal history or record outside the candidate's U/A/B window returns
`LEGACY_SESSION_ROTATION_REQUIRED`. Legacy v2/text-pin state is likewise diagnostic-only. An untrusted direct
call can therefore reduce availability for its claimed session but can never mint authority.

ROTATION_REQUIRED accepts no ordinary candidate. Only while project phase is `MUTATION_COMMITTING`,
`COMMIT_CLEANUP_PENDING` or `RECOVERY_REQUIRED` may an
exact-shaped recovery phrase whose tx/hash text matches immutable state enter the single `recovery_pending`
slot without changing the rotation flag. Lazy attestation must still prove its current native human delivery;
failure clears that slot back to ROTATION_REQUIRED and grants nothing. Success does not blindly replace a
control: it supplies the “newly attested human control” input to the total §9.3 table, which may issue,
reauthorize, report BUSY/consumed, or require quarantine while preserving every prior attempt.

The other closed exception is `ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)` with a valid mandatory
accumulator and a locally bound nonterminal journal/notice or committed-source tombstone. A valid
UserPromptSubmit does **not** enqueue caller text or native hints and does not change the phase. Under the
session lock it only creates/updates strict
`transfer_scan={schema_version:1,submitted_count,consumed_count,first_unconsumed_source_snapshot}`. Counts are
canonical unsigned-64 decimals with `0 <= consumed_count < submitted_count`; a first submission writes 1/0 and
the no-follow snapshot `{path_or_null,dev_or_root_dev,ino_or_root_ino,size_or_zero,tail_or_census_sha256}`.
The complete ROTATION prompt-gate replacement including this object is at most 4,096 serialized bytes and
occupies the already-reserved prompt-deny slot, never the accumulator or normal-content budget; limit+1 leaves
the prior deny bytes unchanged.
Each repeated submission increments only `submitted_count` and preserves the first-unconsumed snapshot. At max,
a further direct call leaves bytes unchanged and denies, while already-counted durable groups and an exact
controller remain drainable; wrap is forbidden. Direct stdin can therefore request denial-only scans or reduce
availability but cannot name an event, journal arm, owner result or capability.

On the next PreToolUse/state-mutating PostToolUse/Stop, the transfer overlay takes the global and lexical
session locks, revalidates the journal/accumulator and reads exactly the next unread durable external-human
delivery group after the trusted cursor using the same Claude/Codex structural and origin rules below. It never
uses payload text and never skips an earlier external group. One invocation consumes at most one group, derives
its native event/boundary from the durable records, advances the cursor and transfer chain in the same session
rename, updates `prompt_gate.current_event` plus the selected outcome's event/boundary binding while retaining denial, and
selects only the §5.3 closed transfer outcome. If no complete group is yet
visible, it retains the object and blocks ordinary actions. After consuming one group it increments
`consumed_count`; equality removes `transfer_scan`, while a remaining gap keeps it and replaces the snapshot with
the exact post-consume cursor/source proof. Thus hook-before-record and coalesced steering cannot be lost, and an arbitrary steering burst is
drained one durable group per security hook without a second bounded prompt queue, while no drained content can
become route/project/Plan authority. Any nonempty `transfer_scan` takes precedence over an already-issued
recovery controller and over notice or committed-source terminal projection. This is exactly predicates 1–2 of
the §5.3 `transfer_invocation_kind` table: a nonempty scan admits only `SCAN_DRAIN_EVENT` or
`NO_NEW_EVENT_DENY` and can never select a no-new-event controller, projection or cleanup kind. The current security-hook
invocation drains at most one counted durable human group, publishes only that group's closed transfer outcome,
denies the attempted controller/Stop and returns the exact persisted retry/display; it may not consume a
capability or verify a projection minted by the same drain invocation. Once read-back proves
`consumed_count == submitted_count`, the rename removes the scan; that next tool/Stop retry re-enters the
§5.3 input table with `transfer_scan` absent, selects predicate 4, 5 or 6 and may then succeed **without
another UserPromptSubmit**. A later counted human correction
therefore cannot be overtaken by an older recovery capability, while a finite marker backlog cannot permanently
block the controller it authorized.

The COMMITTED transition has a total side cleanup. TARGET with no `transfer_scan` atomically clears the
TRANSFER_SECURITY_LANE_ONLY reason to `ATTESTED` while publishing its imported underlay, preserving the last
attested event; its next ordinary UserPrompt follows the existing count-256 event-257 oracle. TARGET with a
nonempty `transfer_scan` must preserve denial until every counted durable human group is attested in order by
this restricted reader; each records only COMMITTED_TARGET_BACKLOG_DENIED in the transfer chain. Equality clears
the scan object and replaces TRANSFER_SECURITY_LANE_ONLY with the same fixed generic ordinary-ledger-full
rotation posture/display (without fabricating a 257th ordinary entry). It may
never restore an old grant while the marked delivery is unread. SOURCE preserves a set marker until one fresh
durable human group records COMMITTED_SOURCE_TERMINAL; if more counted groups remain, each later source event
records the same bounded terminal outcome with a new current event, and equality clears only the scan object while retaining the
transfer-only terminal posture for its byte-proving Stop/fresh-session notice. A journal found COMMITTED before
controller cleanup uses the same idempotent side arm. Any source discontinuity or non-human/unknown group takes the existing
stream-invalid rotation result and never advances past it.
For this drain mode only, predicates that normally compare prompt text/promptId/turn ID to a queued candidate
are replaced by internal durable-record equality: the Claude wrapper/origin group must agree on its own
promptId/text, and the two Codex legs must agree on their own turn ID/text and remain adjacent. Session, cwd,
origin, source-continuity, ancestry/terminal and all duplicate/unknown/size rules are unchanged. The derived text
may be hashed for evidence but is never routed or copied into task state.

### 6.2 Lazy attestation boundary

The first PreToolUse, every state-mutating PostToolUse, or Stop after a pending prompt calls the same
hermetic `attestPending()` routine before any event-specific transition; the exact transfer-only rotation arm
instead selects `transfer_invocation_kind` and, only for an event-bearing kind, calls its restricted
`attestTransferDrain()` from §6.1 under the journal locks. Both parse the canonical durable
conversation source with bounded no-follow IO and maps queued candidates to native delivery groups in arrival
order. Normal matching starts strictly after the stored cursor; the sole look-behind exception is the exact
immediately previous accepted **Claude** group defined below for replay recognition. Codex never uses
look-behind because raw UserPromptSubmit lacks its native message IDs.

Claude contract:

- real path is a regular non-symlink file under the real Claude projects root;
- basename is `<sid>.jsonl`; every matched record has exact `sessionId=sid`;
- the match is the next unread external delivery group and may not skip an earlier external delivery;
- record is `type=user`, `userType=external`, `isSidechain!==true`, exact canonical `cwd`, exact `promptId`,
  `origin.kind=human`, `promptSource in {typed,queued}`, `isMeta!==true`, and `message.role=user`;
- canonical content extraction is: string unchanged; array → bounded ordered `type=text` and `type=image`
  blocks, joining text values by one LF; image blocks count toward structure/size validation but not text;
  `tool_result` or any unknown block rejects the record;
- extracted UTF-8 bytes exactly equal the pending prompt; source byte offset strictly advances.

A Claude delivery group is either the single-origin shape proven by the fresh 2.1.237 census, or exactly one
wrapper plus exactly one origin record with the same sid/promptId/cwd/text and
`originRecord.parentUuid=wrapper.uuid`. The event uuid is the origin uuid and ancestry starts at the wrapper's
parentUuid. A third same-promptId record, branch, text mismatch, missing link, cycle or unrecognised versioned
shape rejects. Historical 2.1.220 evidence is only a negative fixture; it is never silently accepted as the
current positive schema.

Codex contract:

- real path is a regular non-symlink file under the real Codex sessions root and basename ends `-<sid>.jsonl`.
  A raw path hint is only a locator. If it was null, the first security-relevant PreTool/state-mutating-PostTool/Stop may
  supply the now-current hint or the
  reader performs the same bounded suffix census; exactly one source must match the enqueue snapshot transition;
- first `session_meta` has exact `id=session_id=sid`, exact canonical `cwd`, and supported CLI/source provenance;
- the next unread native delivery is an immediately adjacent pair. Its first leg is
  `response_item{payload.type=message,role=user,id=msg_*}` with metadata turn equal to the raw candidate and
  canonical `input_text` equal to the prompt. Its next JSONL record is
  `event_msg{payload.type=item_completed,thread_id=sid,turn_id=same,item.type=UserMessage}` with a second native
  item ID and canonical text equal to the same prompt;
- either leg missing, reordered, disagreeing, or preceded by an unread direct UserMessage rejects; ordinal
  advances across the pair as one delivery;
- collaboration metadata, developer/system messages and records without direct-user provenance do not attest.

Native event identity and execution-turn boundary are separate. For Codex, the boundary candidate is the
session-bound `turn_id`; it is `DIFFERENT_DRAINED` only when the rollout orders an exact `task_complete` or
`turn_aborted` for the old turn before the next `task_started` and direct-user pair. Same turn is `SAME`; a
different ID without that proof is `DIFFERENT_UNPROVEN`. For Claude, walk `parentUuid` ancestry from the delivery
group through at most 512 links / 4,096 records, collapsing only the frozen wrapper shape. A chain under
`tool_use`, `tool_result` or another nonterminal assistant belongs to the current active boundary; a fresh
boundary exists only after an exact 2.1.237 terminal assistant/system marker frozen by the L0 receipt. Missing,
ambiguous, cyclic or version-unknown ancestry is `DIFFERENT_UNPROVEN`, never drained.

Both readers use `O_NOFOLLOW`, regular-file fstat, a 16 MiB tail/limit+1 bound, duplicate-key-aware JSONL,
dev/ino/size recheck and exact cursor CAS. Missing, racing, multiple, reordered, earlier-than-cursor, malformed,
cross-session or unsupported records fail closed. `LUCA_ACTUAL_HARNESS` cannot override record schema.

Attestation never scans arbitrary history from cursor zero. The Codex suffix census visits only real
`YYYY/MM/DD` directories, at most 8 year entries, 16 month entries/year, 32 day entries/month and 4,096 JSONL
files total with cap+1 detection; duplicate suffix matches or any overflow deny. Relative to each enqueue
snapshot, L0 must prove one of exactly three shapes: (U) no sid-suffix file existed at enqueue and exactly one
fresh source with the same sid/cwd preamble plus first current delivery appears later; (A) the current delivery
begins at or after the recorded enqueue size because the hook ran before durable publication; or (B) it is the
latest delivery group, ends exactly at enqueue EOF, and every bound field matches because publication preceded
the hook. A delivery before that window, a non-current historical match, changed dev/ino/tail prefix, or
absent-state history beyond the one allowed preamble + first current group rejects. After acceptance the cursor
advances monotonically by CAS. If either harness cannot be frozen to its applicable U/A/B shapes, KILL-06 fires.

Candidate visibility is a total result, never a generic “missing” branch:

1. `NOT_YET_VISIBLE`: the source still equals the enqueue snapshot (or a valid U source is not published yet).
   Retain the head candidate, cursor and ledger; keep ATTESTATION_PENDING and command null.
2. `CURRENT_MATCH`: the next unread current group matches and follows the normal accepted/rejected-origin path.
3. `PROVABLE_CANDIDATE_MISMATCH`: durable bytes beyond the cursor contain the next complete group, but the head
   candidate's bounded identity/text cannot describe it. Consume only that untrusted candidate without moving
   the cursor, append a fixed candidate-rejection diagnostic, and continue the queue so the following candidate
   may claim the same unread group; no prior grant is exposed.
4. `RECOVERABLE_REJECTION`: a current, structurally valid and fully bound known peer/meta group advances the
   cursor, appends REJECTED_ORIGIN and enters AUTH_BLOCKED; a later independent human event on the same intact
   stream may recover.
5. `STREAM_INVALID`: source replacement, dev/ino change, truncation, prefix/tail drift, cross-session source,
   duplicate/ambiguous source, unsupported preamble/version, duplicate-key/malformed complete JSONL, unsupported
   or unknown-provenance complete group, or an incomplete group followed by any later byte replaces `pending[]`
   with bounded rejection digests, freezes the cursor and enters ROTATION_REQUIRED. These conditions are never AUTH_BLOCKED and the
   sid cannot recover.

A syntactically invalid raw candidate with an otherwise valid sid but no mapped native bytes is the only
`AUTH_BLOCKED(CANDIDATE_INVALID)` input-envelope case. A complete well-formed next group that simply disagrees
with the queued untrusted candidate is PROVABLE_CANDIDATE_MISMATCH, not stream corruption. A trailing partial
group with no later byte and an unchanged append-only prefix is NOT_YET_VISIBLE. Read/open races are likewise
NOT_YET_VISIBLE only when exact source snapshot continuity is still proven; otherwise they are STREAM_INVALID.
This table uniquely fixes phase, cursor and candidate handling for every source failure.

For an exact Claude direct replay whose source snapshot has not advanced and whose unique prompt_id matches,
the reader may decode only the one delivery group ending at the current cursor. It must bind the same
sid/cwd/prompt_id/text, derive the same event ID and find that event in the ledger. One rename then consumes the
pending replay candidate and sets
`AUTH_BLOCKED(EVENT_REPLAY)` while cursor/ledger/project/core/obligation remain unchanged. It never scans any
earlier group. **Codex never enters this branch**: if no new unread adjacent native pair exists, even an
identical same-turn/text candidate remains NOT_YET_VISIBLE and denied; a direct forged replay may therefore
require session rotation, but a later real pair with new native IDs must win as CURRENT_MATCH. Normal unread
matching always precedes the Claude replay branch. A nonmatching historical candidate receives no look-behind
authority and follows the visibility rules above.

After a match, native IDs are domain-separated and length-framed:

```text
Claude event  = H(LP("event:v3:claude") || LP(sid) || LP(promptId) || LP(record.uuid))
Claude boundary = H(LP("boundary:v3:claude") || LP(sid) || LP(frozen execution anchor uuid))
Codex event   = H(LP("event:v3:codex")  || LP(sid) || LP(response msg id) || LP(UserMessage item id))
Codex boundary = H(LP("boundary:v3:codex") || LP(sid) || LP(native turn id))
H(bytes)      = SHA-256(bytes), encoded as exactly 64 lowercase hex characters
LP(x)         = uint32_be(byteLength(UTF8(x))) || UTF8(x)
```

Thus two identical Codex prompts under one boundary remain distinct native events. Exact native replay is
rejected by the embedded ledger. Prompt/promptId/parentUuid inequality alone never proves drain. Stop can only
observe a native terminal marker; it cannot manufacture one. There is no random/digest-of-prompt final identity
fallback.

### 6.3 Attestation outcomes

- accepted human records normally append `{event_id,boundary_id,harness,native_id,outcome:ACCEPTED}` and run
  exactly one project/route transition in the same rename. A fresh claim intent follows this ordinary path and
  may mint its non-project claim capability only while the resulting ordinary count remains within 256. The
  sole storage exception is the matching nonterminal TransferJournal overlay or a COMMITTED-source terminal:
  it advances the same attested cursor and writes exactly one
  `TransferSecurityEvent`, never the ordinary ledger; COMMITTED target is not this exception;
- L0 freezes separate strict negative-origin delivery-group schemas for each harness. Only a current-window
  group whose sid/cwd/native IDs/text all bind but whose known origin is peer/meta/unauthorized advances the
  cursor, appends `REJECTED_ORIGIN`, consumes its pending candidate and sets AUTH_BLOCKED; unknown provenance
  advances nothing and enters durable deny;
- NOT_YET_VISIBLE retains the candidate and ATTESTATION_PENDING; a provable candidate mismatch consumes only
  that candidate and sets AUTH_BLOCKED(CANDIDATE_MISMATCH) if the queue becomes empty; known rejected origin
  uses recoverable AUTH_BLOCKED; every §6.2 STREAM_INVALID condition uses ROTATION_REQUIRED. None fabricates a
  ledger event or advances a cursor without a structurally bound native group;
- ordinary ledger entry 257 sets `ROTATION_REQUIRED`, preserving binding evidence but denying all project work.
  A transfer-security-selected event is not ordinary entry 257: it uses its preallocated constant-size chain;
  when ordinary count is already 256 it also sets `ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)` without
  erasing the journal/notice/capability/terminal presentation. A cleaned COMMITTED target still takes ordinary
  event 257; only a counted pre-cleanup backlog uses the closed denial arm below;
- while that exact transfer-only rotation posture persists, UserPromptSubmit can set only the fixed scan marker
  and snapshot. `attestTransferDrain()` accepts at most the next unread durable human group, stores it only in
  the transfer chain and yields no semantic/project authority; wrong phase, caller-supplied identity/text,
  skipped group, source discontinuity or a second ledger write rejects. An exact COMMITTED target with no marker
  first performs idempotent reason cleanup without consuming a group; with a marker it must attest that group
  as COMMITTED_TARGET_BACKLOG_DENIED, drain the exact submitted count and then enter the generic full-ledger
  rotation before any old grant can reappear;
- a non-control accepted event arriving while project phase is `MUTATION_COMMITTING`,
  `COMMIT_CLEANUP_PENDING` or `RECOVERY_REQUIRED` appends `REJECTED_BUSY` while preserving the immutable mutation
  core. The only exceptions are §5.2 signal-only/no-project-directive steering and a
  NEW_TASK_SIGNAL_WITH_PROJECT whose canonical target/op exactly equals the immutable SWITCH/NEW core; those
  append `ACCEPTED_ROUTE_ONLY_BUSY` and may change only the target-bound outer obligation. A different target/op
  remains REJECTED_BUSY and cannot supersede an old task. Transaction CAS explicitly carries forward only an
  admissible outer revision, so no event can authorize project work later;
- when the exact Claude-only one-group look-behind resolves a pending candidate to an event already in the
  ordinary ledger or `transfer_security_ledger.last_event_or_null`, one
  rename consumes that
  candidate and sets `AUTH_BLOCKED(EVENT_REPLAY)` while leaving cursor, ledger, project/core and obligation
  unchanged; `command:null`. Only a later PreTool/state-mutating-PostTool/Stop with no pending candidate is byte-identical.

Queued candidates are evaluated in arrival order inside one session-lock transaction. A consumed mismatch may
be followed by the next candidate against the same unread group; a retained or stream-invalid head stops the
prefix. Commands are emitted only after the complete processed prefix and resulting state are atomically
published/read back. A rejected candidate can never expose an earlier candidate's grant; only a later
independently attested human event may establish a new one.

Every failure returns structured `projectMutation:null` and a stable code. Human-readable output contains no
`project.sh switch|new|deactivate` command unless all fields came from exact persisted capability read-back.

## 7. Schema-v3 state and safe IO

### 7.1 One session document, layered authority

`.claude/.session-project-<sid>` becomes one strict document:

```text
schema_version: 3
session_id
generation_id
prompt_gate:
  phase: ATTESTATION_PENDING | ATTESTED | AUTH_BLOCKED | ROTATION_REQUIRED
  pending[] / recovery_pending? / transfer_scan? /
  bootstrap? / transcript_cursor? / current_event?
ledger:
  schema_version: 1
  events[]                         # accepted and authenticated rejected events, max 256
recovery_ledger:
  schema_version: 1
  checkpoint? / events[]           # exact recovery-control tail, max 16; terminal-only hash-chain compaction
transfer_security_ledger           # mandatory exact fixed-size §5.3 per-session accumulator; max serialized 4096; persists across sequential transfer journals
recovery_control?                  # capability_id/attempt_seq/generation/event/boundary/op/tx/exact hashes/controller invocation?/active recovery-global owner?/ISSUED|IN_PROGRESS|CONSUMED
project:
  phase: NO_PIN | TURN_ACTIVE | TURN_CLOSED | SWITCH_ONLY | BOUND |
         MUTATION_COMMITTING | COMMIT_CLEANUP_PENDING | RECOVERY_REQUIRED
  epoch_counter                 # required unsigned monotonic integer in every phase, including NO_PIN
  binding? / turn? / switch? / mutation_intent? / committed_result?
deferred_project_request?       # exactly the §5.4 DeferredProjectRequest v2 oneOf; no local/legacy variant
deferred_plan_claim?            # strict §5.3 hashed non-capability checkpoint/target claim; carried only through exact D/S project binding
deferred_plan_claim_cleanup_receipts? # strict §5.3 bounded terminal cleanup-receipt ledger; no authority
cancelled_plan_checkpoints?     # strict §5.3 source archive: max 8 entries + one terminal overflow slot; immutable/no online compaction
project_presentation?           # strict canonical-base64 display/challenge/event/boundary UNVERIFIED|VERIFIED for every D
project_reprompt?               # one active fresh challenge referencing an immutable verified primary proof
route_notice?                   # non-capability bounded diagnostic; TARGET_EXISTS binds event/target/attempted op only
transfer_recovery_notice?       # strict source/target UNPROVABLE overlay from §5.3; never route/project authority
route_obligation?
last_committed_tx?
```

`cancelled_plan_checkpoints` is the sole retained pre-claim-cancellation store and may coexist with any later
route/project state because it grants nothing. A live route checkpoint ID may not also occur in either archive
arm; archive IDs/sequences/entry hashes are unique and the archive root is mandatory when the field is present.
Non-null overflow requires exactly eight entries plus prompt-gate ROTATION_REQUIRED and forbids any live
checkpoint/route/execution authority. Conversely ROTATION_REQUIRED cannot leave a PRESENTED checkpoint
claimable. A live checkpoint's reservation must name the current archive root and an unoccupied deterministic
ENTRY/OVERFLOW slot, and must bind the exact 4,096 source transfer-security bytes already present in its session
document. Every schema-v3 session, before and after PREPARED, requires exactly one strict accumulator matching
generation/sid; the journal and actor side are bound by each event. Absence, an extra accumulator, a broken
prior chain or reset is schema-invalid before attestation. A later transfer reuses and advances that same
accumulator, including when the prior target becomes the next source. COMMITTED retains both accumulators as
non-authorizing evidence; pre-claim CANCELLED leaves its existing accumulator byte-identical.
`transfer_invocation_kind` is a derived per-invocation scalar computed inside the locked read; it is never
persisted in any state document, never accepted from a caller and never inferred from payload text. At most one
`recovery_capability_or_null` object exists per journal, and after any event-bearing kind it is always bound to
the current attested event/boundary/actor; a retained older-event capability object is schema-invalid.
`ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)` may coexist only with that valid accumulator plus a matching
nonterminal journal/notice/recovery capability, the non-authorizing COMMITTED source tombstone, or a COMMITTED
target with an already-set scan object draining its closed backlog-denial arm, and requires
ordinary ledger count exactly 256. It forbids
every ordinary route/execution/project capability. Any other ROTATION reason with transfer authority, or the
transfer-only reason without its matching journal evidence, is schema-invalid. Its strict `transfer_scan` is
forbidden under every other prompt phase/reason, contains no prompt/native/event field, requires the count
inequality above and grants nothing; consuming a durable group clears or
retains them only by the §6.1 journal-side table: every nonterminal arm retains; COMMITTED target clears without
a group only when the scan is absent and otherwise chains the closed backlog-denial arm until equality then
enters generic full-ledger rotation; COMMITTED source
clears only after its terminal event is chained.
`deferred_plan_claim_cleanup_receipts` is the sole target-side cleanup receipt store and follows the distinct
§5.3 terminal chain; the complete source archive entry remains in the source session and neither receipts nor
their checkpoint are ever represented by `recovery_ledger`.

Every D is validated and hashed only by the §5.4 v2 `oneOf`, including the exact project-origin variants and
scope-snapshot discriminator. The discriminator and project origin never change across re-presentation,
recensus or retry; replacement D computes a new object from the restored origin. A missing, extra or mismatched
arm is STATE_TRANSITION_INVALID. Both harnesses use the same §5.4 golden vectors; this section supplies no
second request formula, field alias or compatibility parser.

Absence means a never-seen v3 session only. File presence is never a binding. Project-scope authorization
requires all of:

1. active generation matches the state generation;
2. `prompt_gate.phase=ATTESTED` and no pending candidates;
3. `project.phase=TURN_ACTIVE` with canonical binding/inode/epoch and turn event equal to current attested event;
4. `deferred_project_request` is absent;
5. `deferred_plan_claim` is absent;
6. `transfer_recovery_notice` is absent and no matching nonterminal TransferJournal binds this sid; a terminal
   `deferred_plan_claim_cleanup_receipts` is evidence only and neither grants nor blocks scope;
7. route obligation is absent or `SATISFIED/CANCELLED/SUPERSEDED`, or is `EXECUTION_ACTIVE` with the same
   current execution ID and a tool permitted by its exact manifest execution-policy step, or is
   `PLAN_EXECUTION_ACTIVE` with the same approved-plan/phase/tool capability;
8. requested path/command passes the existing canonical scope checks and the policy's closed tool/root/output cap.

Exact switch, receipt and recovery controllers use their own persisted-capability allowlists; they never inherit
the ordinary TURN_ACTIVE write grant. The matching transfer notice/Stop/recover/terminal controller is likewise
the sole `TRANSFER_SECURITY_LANE_ONLY` exception under ROTATION_REQUIRED; it can update only the strict
transfer ledger/notice/journal evidence and never authorizes a project path or ordinary tool.

Any other state, parse error or legacy schema denies. This closes inheritance from an earlier TURN_ACTIVE.

`project.epoch_counter` is the single monotonic project-transaction version: a fresh v3 session starts at 0;
every SWITCH/NEW/DEACTIVATE commit publishes exactly `old+1`; NO_PIN retains it; every transient copies it; and
rollback before commit restores it byte-for-byte. `S.expected_epoch` is copied from the current counter and can
never be synthesized from a link, binding or tx. Binding `epoch`, project identity hashes, mutation core,
committed result, recovery capability and rollback evidence all equal/bind this counter. The mandatory sequence
fixture is BOUND 7 → DEACTIVATE expected 7/NO_PIN 8 → NEW expected 8/BOUND 9; stale 0 or 7 denies before side
effects.

### 7.2 Canonical IO and publication

State, state-lock owner, global/plan-transfer lease owner, generation pointer, route receipt,
plan-transfer journal and recovery-claim record content
all use a shared strict IO primitive; canonical recovery-claim publication uses the stricter no-replace
hard-link protocol in §9.3 and never the generic overwrite-by-rename form:

- canonical parent containment; no symlink components where the contract requires a real directory;
- `O_NOFOLLOW`, regular-file fstat, per-type byte cap + limit+1 read, UTF-8 and duplicate-key rejection;
- exact allowed/required keys and type/range/state-specific validation;
- dev/ino/size/mtime recheck after read;
- writes use same-directory O_EXCL temp, complete write, fsync file, rename, fsync parent, then exact read-back;
- every canonical lock/lease is one regular owner-record file, never a directory. Publication is
  temp O_EXCL→complete write→file fsync→hard-link to the absent canonical name (`EEXIST` loses)→unlink temp→
  parent fsync→exact inode/hash read-back; a half-initialized or overwrite-by-rename canonical lock is impossible.

Every lock/invocation owner binds pid, OS process-start fingerprint, boot identity, process nonce, generation and
purpose. Exact-live returns BUSY. Exact proven-dead ownership may be hard-linked after inode/owner-hash recheck
to an absent hash-named quarantine path, verified, then unlinked from canonical and parent-fsynced before retry;
malformed, mismatched or liveness-unprovable ownership is
never time-stolen. An unprovable/malformed recovery-claim record may use the exact human QUARANTINE_CLAIM
capability in §9.1. Session/global/activation/invocation classes deliberately have no online quarantine
capability: they enter `BLOCKED_OFFLINE_LOCK_QUARANTINE`, emit no executable command and require an out-of-band
human maintenance decision beyond this plan. Release hard-links the same canonical inode to a
unique absent parked name, verifies it, unlinks canonical, fsyncs, then unlinks parked and fsyncs; recovery can
classify the two-name crash window. These rules apply to session, global, activation, invocation and
recovery-claim leases; their fixed acquisition order is tested.

The macOS liveness oracle is a manifest member `.claude/hooks/lib/process-liveness.mjs`. It invokes only absolute
`/bin/ps` with fixed liveness argv `-ww -p <decimal pid> -o pid=,lstart=,command=` or activation-census argv
`-A -ww -o pid=,lstart=,command=`, `/usr/sbin/sysctl` with fixed argv
`-n kern.boottime`, and activation-only `/usr/bin/lsof` with fixed argv `-Fn -p <decimal pid>`, with no shell,
exact minimal environment `LC_ALL=C,LANG=C,TZ=UTC`, no other inherited
locale/config environment, 8 KiB per-pid / 1 MiB ps-census / 64 KiB per-pid lsof output caps and strict parsers.
L0 and the activation journal bind all three binaries' realpath/dev/ino/SHA and the exact normalized output grammar;
drift, truncation, extra rows, parse ambiguity or permission/error is `LIVENESS_UNPROVABLE`, never “dead”. A
missing pid under the same boot, or a pid whose start fingerprint differs, proves the recorded owner dead; an
exact pid/start/boot match is live. An indistinguishable same-pid/same-second/same-command reuse is therefore
conservatively LIVE/BUSY, never authority for takeover. `process.kill(pid,0)` alone is not a liveness decision.

The closed lock order is: ordinary project mutation `global→session`; activation `activation→global` and it
never waits on a recovery claim (a live claim aborts activation); per-tx recovery is always
`recovery-claim→fresh live recovery-global→session`; plan transfer is
`plan-transfer-global→source/target session locks in lexical sid order` and may not begin while holding a
project-global/recovery/activation lease.
Deferred-claim cancellation cleanup is deliberately not a transfer mutation: it holds only the target session
lock, performs the stable immutable-source read specified in §5.3, and CASes only the target. It never acquires
the source session or transfer-global lock, never writes the source and never waits while holding a preceding
lock class. The source `cancelled_plan_checkpoints` archive is therefore part of strict schema validation and
session rotation: neither its eight ordinary entries nor its one terminal overflow entry is ever
deleted/compacted in v3, even after target cleanup. Consuming the overflow reservation atomically revokes the
live checkpoint and rotates future work to a new sid while preserving the old source file for reads.
An old proven-dead global owner is evidence, never a reservation or lock. While holding the claim, recovery must
first isolate that exact dead owner by the no-replace quarantine protocol, then race normally to publish a fresh
global owner whose record binds `{purpose:RECOVERY,claim_id,tx,mutation_core_sha256}`. `EEXIST` loses and returns
BUSY before any project/link/object side effect. Only the read-back fresh owner serializes recovery against an
ordinary mutation.
Normal mutation never acquires a recovery claim, and no path acquires a preceding class while holding a later
one. Contention returns BUSY or releases/retries; it never waits in the reverse order. Release is reverse order.

State maximum is 2 MiB, pending queue maximum eight, ordinary ledger maximum 256, recovery ledger tail maximum 16,
and transfer-security accumulator maximum 4,096 serialized bytes
with terminal-only checkpoint compaction, obligation text maximum 262,144 bytes. Raw prompt, exact-task and plan-result byte strings are
stored as canonical base64 plus decoded UTF-8 length/SHA, never as JSON strings with unbounded escape expansion;
all aggregate limits are checked against both decoded bytes and the complete would-be serialized state. Every
v3 state, including NO_PIN and no-Plan states, contains exactly one such accumulator and accounts its complete
serialized bytes; no transition may borrow that space for another field. Normal
content may use at most `2 MiB - 4,096 bytes`; the final 4,096-byte fixed slot is reserved for replacing the
prompt gate with a bounded capacity/rotation deny. A would-be overflow publishes that deny without retaining a
prior grant or a partial candidate/result. A session-lock critical section performs replay/cursor check, ledger append,
complete logical transition and one atomic state rename. “Ledger append” means exactly one schema-selected
ordinary, recovery or transfer-security record/chain step; dual storage is invalid. That rename is the state linearization point.
For PLAN_READY, §5.3 `state_capacity_admission` is a stronger precondition: it budgets every declared retained
human answer, snapshot copy, checkpoint cancellation successor and ledger maximum before approval. An admitted
Plan cannot use ordinary cap rotation as its expected answer-retention path; cap/cap+1 admission fixtures must
separate exact ADMITTED from CAPACITY_REJECTED. The fixed deny reserve remains available for unmodeled external
growth and schema corruption, not as a substitute for Plan admission.

A plan-transfer journal is at most 512 KiB, contains no raw prompt beyond the already bounded exact-task bytes,
and one source execution may have only one nonterminal checkpoint. The checkpoint ID is the sole lowercase
64-hex filename stem under a canonical real `.claude/.plan-transfers` directory; symlink, extra suffix, cap+1,
duplicate source, or more than 64 retained terminal records requires offline rotation and cannot mint authority.

## 8. Total prompt/project transition contract

### 8.1 Exact intent classification and precedence

After human attestation, classify one and only one intent:

- `SELECT(T, SWITCH|NEW)`: one affirmative unique target; NEW requires explicit creation grammar;
- `CONFIRM_PENDING`: context-valid `确认切换|继续切换|就切这个`, with no target/cancel; `继续切换` belongs
  only to this class and is never BARE_CONTINUE;
- `CANCEL_PENDING`: `取消|算了|不切了|别切|留在当前项目|不用了`, with no affirmative selection;
- `DEACTIVATE_CURRENT`: explicit `退出|解绑|停用 当前项目|工程`;
- `RECOVER_CONTROL`: one exact `RECOVER(tx,corehash)`, `CLEANUP_COMMITTED(tx,commithash)`, or
  `QUARANTINE_CLAIM(tx,exact_raw_sha256)` phrase. These are handled by the global precedence table, not the
  seven-column project matrix;
- `BARE_CONTINUE`: contextual `继续|接着|继续做` with no target/cancel/new task;
- `OTHER`: no project directive;
- `AMBIGUOUS`: mixed cancel+select, mixed operation, multiple undirected targets, or incomplete directive.

Clause filtering runs before classification. Direction has priority over independent mentions. Any surviving
cancel and affirmative select in the same prompt is AMBIGUOUS; neither “last token wins” nor agent judgment is
allowed. Thus `算了，还是切到 crm` and `不用了，继续切到 muse` have the fixed no-mutation oracle AMBIGUOUS.

Parent relation is one of `SAME`, `DIFFERENT_DRAINED`, or `DIFFERENT_UNPROVEN` under §6.2; ID inequality alone
never selects the second. Target identity relation is exact canonical identity: `CURRENT`, `PENDING`, or
`OTHER`. Every NEW intent also carries a complete-registry census result
`EXISTING_CURRENT | EXISTING_OTHER | ABSENT`; the exact target of an already-issued `S(T,NEW)` remains PENDING
for idempotent re-emission and is not reclassified from a partially published owned object. Only ABSENT may
create a fresh NEW capability, D or S. An unlisted enum/value or incomplete census is
`STATE_TRANSITION_INVALID`, not an implementation-chosen default.

Before any target census, route supersession or stable-state matrix cell, the §5.2 matching TransferJournal
overlay runs. A nonterminal or invalid journal stops in its recovery/fail-closed arm regardless of the source
underlay route status. Only `committed_transferred_source=true` runs the source-terminal check and short-circuits
the rest of the composition. Its existing `route_obligation` remains the immutable tombstone for ABSENT,
EXISTING_CURRENT, EXISTING_OTHER and incomplete census alike; census output cannot become route authority.
Only when the transfer overlay and terminal check both fall through,
`SELECT(T,NEW)` with EXISTING_CURRENT or EXISTING_OTHER takes the following total `TARGET_EXISTS` guard. It
appends the authenticated event and bounded diagnostic
and preserves the prior project phase/binding/epoch/project-turn event+boundary. A project-only event creates no
D/S/obligation and emits no project command. A `NEW_TASK_SIGNAL_WITH_PROJECT` event is different: after its task
bytes pass the unique raw-region projection, it atomically supersedes an old task and creates a non-authorizing
obligation with those exact bytes in
`PRESENTATION_PENDING(target=WAITING_HUMAN,kind=PROJECT_SWITCH_REQUIRED,target=T,attempted_op=NEW)`; it creates
no D/S and no command. The same rename
stores one non-capability `route_notice={code:TARGET_EXISTS,event,target,attempted_op:NEW}`; it is the sole source
for the PROJECT_SWITCH_REQUIRED display and cannot authorize SWITCH. Therefore, for a non-TRANSFERRED source, a combined
NEW_TASK_SIGNAL_WITH_PROJECT using NEW against an existing project does not PLACE_NEW, but its task cannot
disappear. The exact display contains one copyable `切换到 <T> 项目，<verbatim task bytes>` retry. A later exact
project-only SWITCH to T may move that PROJECT_SWITCH_REQUIRED task to DEFERRED while the project transaction runs; it
does not mark the task satisfied or erase it, and the normal post-commit boundary resumes it. The identical
combined SWITCH retry has the same result. Explicit cancel/new-task supersession remains the only way to remove
that nonterminal PROJECT_SWITCH_REQUIRED arm. This guard applies to non-TRANSFERRED N/A/C/B and to a
project-only NEW received during S/transient. A combined event received during an existing SWITCH/NEW
capability/core first takes the stricter §5.2 target/op admissibility check: equality may attach to the exact core,
while any difference is REJECTED_BUSY even if the requested target already exists. The exact same
project-only `S(T,NEW)` may only re-emit its existing read-back capability; it never creates a second one.

| Prior route status/subphase | Mandatory TARGET_EXISTS route action |
|---|---|
| ABSENT / SATISFIED / CANCELLED / SUPERSEDED | project-only: keep no live route capability; signal-bearing combined event: create the exact PROJECT_SWITCH_REQUIRED presentation/obligation above |
| PENDING / RESUMED | ROTATE the classify receipt challenge onto the new event; exact task/source stay unchanged |
| PLANNING_PENDING | ISSUED→ROTATE Plan-call capability; IN_FLIGHT→CARRY_IN_FLIGHT exact native call; RESULT_READY→invalidate only the old finalize capability and mint a new event-bound finalize capability; immutable result/original call IDs unchanged |
| PLAN_REVISION_REQUIRED | ROTATE the plan capability onto the new event |
| PRESENTATION_PENDING | REPRESENT the exact persisted bytes with a fresh display challenge bound to the new event |
| WAITING_HUMAN / WAITING_PLAN_APPROVAL | REPRESENT the exact verified question/plan as a new PRESENTATION_PENDING challenge; the new project event is not an answer |
| PLAN_EXECUTION_PENDING | no-project phase: ROTATE its route-only phase capability; project-scoped phase: revoke the E1 capability and stage PROJECT_SWITCH_REQUIRED with approved plan/current phase preserved |
| PLAN_EXECUTION_ACTIVE | no-project exact call: CARRY. Project-scoped IN_FLIGHT: carry only the released call, record its terminal outcome, then stage PROJECT_SWITCH_REQUIRED; BETWEEN_TOOLS: revoke successor and stage that wait |
| PLAN_EXECUTION_FAILURE_DRAIN | append the authenticated event as `REJECTED_BUSY`, preserve project/route/drain frontier/suspended successors and every released-call tombstone byte-for-byte, emit no notice/capability/command and remain in FAILURE_DRAIN |
| PLAN_EXECUTION_WAITING_BOUNDARY | REPRESENT the exact boundary instruction; TARGET_EXISTS is not its continuation |
| PLAN_EXECUTION_WAITING_HUMAN / PLAN_EXECUTION_COMPLETE_PENDING_STOP | REPRESENT the exact phase question or staged summary on the new event; never answer/complete it from TARGET_EXISTS |
| PLAN_EXECUTION_REPLAN_PENDING | ROTATE an unissued delta cap or CARRY its exact in-flight call; project scope uses the replan snapshot and cannot install a delta |
| PLAN_EXECUTION_DELTA_PRESENTATION_PENDING / PLAN_EXECUTION_WAITING_DELTA_APPROVAL / PLAN_EXECUTION_WAITING_DELTA_BOUNDARY | REPRESENT the immutable delta/wait with a fresh event-bound challenge; never approve/install |
| PLAN_EXECUTION_CHECKPOINT_PRESENTATION / PLAN_EXECUTION_TRANSFER_READY | consume the exact cancellation reservation under the PROJECT_INTENT overlay and tombstone execution: ENTRY archives the complete record then applies TARGET_EXISTS to a fresh CLASSIFY_ISSUED obligation in the same rename; OVERFLOW stores the complete terminal record and enters ROTATION with no route successor. Never preserve/snapshot checkpoint authority. |
| PLAN_EXECUTION_TRANSFERRED | preserve the immutable source transfer tombstone; append diagnostic only and never revive source authority |
| EXECUTION_PENDING | no-project contract: ROTATE its route-only capability; project-scoped contract: revoke the unusable E1 capability and create PRESENTATION_PENDING→PROJECT_SWITCH_REQUIRED with selection/task preserved |
| EXECUTION_WAITING_BOUNDARY | REPRESENT the exact boundary message; never open A or issue execution merely from TARGET_EXISTS |
| EXECUTION_ACTIVE | no-project contract: CARRY_IN_FLIGHT normally. Project-scoped exact tool already IN_FLIGHT: carry only that released call; paired PostTool records its step then stages PROJECT_SWITCH_REQUIRED and may not issue the next step. Project-scoped BETWEEN_STEPS: revoke the step capability and stage that wait immediately |
| EXECUTION_COMPLETE_PENDING_STOP | REPRESENT the exact staged output/draft on the new event |
| DEFERRED_BY_PROJECT_CHANGE | preserve the target/op-bound deferred status and its no-capability evidence; append the diagnostic event only |

ROTATE/REPRESENT bind their fresh receipt/capability/display IDs to the new current event; CARRY preserves the
old issued-event/native-call authority while recording the new event as non-authorizing. No row may retain an
E1-bound ISSUED/finalize/presentation capability while E2 is current. The generated composition crosses
this table with every project phase/parent relation, execution contract scope and
`IN_FLIGHT_STEP|BETWEEN_STEPS` execution subphase. Row keys are generated from the closed route-status enum;
construction requires exactly one match for every status and rejects a missing or duplicate match rather than
defaulting.
route_notice is usable only while its event equals prompt_gate.current_event; the next attested event either
consumes it through the expected SWITCH composition or clears it as superseded diagnostic evidence. Clearing a
notice never clears the signal-bearing PROJECT_SWITCH_REQUIRED obligation: exact SWITCH moves that same task to
PENDING/current rebind or D/S+DEFERRED, cancel/new-task tombstones it, and unrelated chatter re-presents it.

Project intent is not route intent. Every attested human event also receives exactly one closed
`route_event_kind` before composition:

```text
STATUS | CORRECTION | NEW_TASK | NEW_TASK_SIGNAL_WITH_PROJECT | CANCEL_TASK | EXACT_APPROVAL |
ANSWER_OR_REVISION | PLAN_TRANSFER_CLAIM | PLAN_TRANSFER_CLAIM_WITH_PROJECT |
BARE_CONTINUE | PROJECT_ONLY | ROUTE_NONE | ROUTE_AMBIGUOUS
```

STATUS is a bounded progress/completion query with no new imperative or constraint; CORRECTION changes the
current task; NEW_TASK names an independent deliverable; NEW_TASK_SIGNAL_WITH_PROJECT is only the closed
two-region §5.2 composition; CANCEL_TASK uses the exact task-cancel grammar;
EXACT_APPROVAL is only the full-input `批准计划 <result_sha256>` under its matching verified plan wait;
all other §5.3 accept/revise/answer controls are ANSWER_OR_REVISION and valid only for their matching verified wait.
In particular, `批准增量计划 <delta_result_sha256>` and
`继续执行增量计划 <delta_result_sha256>` are never EXACT_APPROVAL; their delta wait kind and
parent relation are checked inside the ANSWER_OR_REVISION arm;
PLAN_TRANSFER_CLAIM is only full-input `继续计划 <checkpoint_id>`; PLAN_TRANSFER_CLAIM_WITH_PROJECT is only
full-input `进入 <one canonical checkpoint project> 项目，继续计划 <checkpoint_id>` with no residue. Both require
one PRESENTED source checkpoint and a fresh target sid and are handled by the transfer overlay before the
ordinary route table; they are never NEW_TASK or semantic obligations.
PROJECT_ONLY contains one project directive and no task change; ROUTE_NONE is unrelated chatter. Any mixed
task control, or a phrase that fits more than one class, is ROUTE_AMBIGUOUS. Exact task cancel/new-task/approval
tokens take precedence only when no project directive survives. Mixing either with a project directive is
ROUTE_AMBIGUOUS except the exact NEW_TASK_SIGNAL_WITH_PROJECT and PLAN_TRANSFER_CLAIM_WITH_PROJECT productions;
no generic “task + project/control” fallback
exists. The generated fixture corpus freezes positive/negative examples and deletion mutants for each
class. Required controls include `你做完计划了吗|现在到哪了`→STATUS, `继续啊，你总停干什么`→BARE_CONTINUE,
an explicit constraint change→CORRECTION, a second independent deliverable→NEW_TASK, and status text containing
an imperative requirement→ROUTE_AMBIGUOUS rather than STATUS.

The classifier is a bounded executable grammar, not a model label. It first applies the same clause,
quote/backtick, report/example and negation spans as §4.2/§5.1; quoted or reported control words never count.
Negation scopes project/signal/action markers, but the unquoted whole-input task-cancel forms below are themselves
controls and are recognized before that suppression; `不做了` therefore cancels, while `文档里写“不做了”` does not.
After removing bounded polite particles, the whole operative content is classified in this order:

0. an exact checkpoint token uses only the two full-input grammars above, one 64-hex ID and one source-journal
   lookup; wrong source status/project, a second token or any residue is ROUTE_AMBIGUOUS/denied and cannot fall
   through as a generic task;
1. task cancel is the whole-input `取消这个任务|不做(这个任务)?了|cancel this task`; wait-bound approval,
   acceptance, revision and answer use only the full-input SHA grammar in §5.3; contextual bare continue is the
   whole-input `继续|接着|继续做` plus bounded polite particles or the frozen complaint suffix
   `，你总停干什么`. None accepts arbitrary extra text;
2. under a live obligation, an anchored correction prefix from
   `不是新任务|不是另一个任务|修改刚才(的任务)?|调整刚才(的任务)?|补充刚才(的任务)?|
   把(刚才|当前|这个任务)|not a new task|change the current task` plus one operative imperative is
   CORRECTION. The negated `不是新任务` token is consumed here and cannot also count as NEW_TASK;
3. an anchored independent-task prefix from `新任务|另一个任务|另外(请)?|再做一个|同时再|new task|
   separate task|also build` plus one operative imperative is NEW_TASK. With no live obligation, one affirmative
   task clause carrying the §5.1 signal is also NEW_TASK;
3a. before step 3 consumes a signal-only clause, the exact two-region §5.2 production is
   NEW_TASK_SIGNAL_WITH_PROJECT. The project clause and contiguous task-side region must have disjoint raw spans
   and unique parses; deletion of either operative directive, addition of any third operative clause, splitting
   task content into two regions, or moving the project token into the task region prevents this class;
4. STATUS is only an anchored member of the frozen progress-query patterns
   `你?做完.*了吗|完成了吗|现在(到哪了|什么进度|进展怎样)|status\??|are you done\??`, with no token from the
   closed imperative/constraint set `做|实现|修改|调整|优化|重组|重构|重新设计|改版|增加|新增|新建|创建|删除|移除|修复|
   拆分|归组|改成|必须|不要|需要|build|implement|change|optimize|redesign|create|add|remove|fix|must|need`
   outside the matched query. This same closed set is the sole “operative
   imperative” oracle for steps 2–3; an unlisted action verb cannot be guessed and falls to step 6;
5. ANSWER_OR_REVISION is available only under a verified wait and only when no earlier control, project directive
   or independent task survives. PROJECT_ONLY requires one accepted project directive and no operative task
   residue. ROUTE_NONE requires no operative imperative, constraint, route signal or control token;
6. any unmatched imperative, two distinct control classes, controls split across independent clauses, or
   otherwise non-unique parse is ROUTE_AMBIGUOUS with command null.

Thus `这不是新任务，把设置分组改成三类` has the sole CORRECTION parse; quoting that sentence is ROUTE_NONE,
and appending an independent `另外请新建导出功能` makes it ROUTE_AMBIGUOUS. NFKC/raw byte limits and cap+1
failure precede classification. Every marker family, negation, quote, two-region collision and priority edge has
an oracle fixture plus a deletion mutant.

Capability actions are mechanical: `ROTATE` invalidates an unused Plan ISSUED capability or independent
finalize capability and publishes a fresh capability of the same kind bound to the new event; it never rewrites
an immutable Plan result or original Plan-call ID. `CARRY_IN_FLIGHT` preserves the exact native call/execution ID and its issued
event while recording the new event as non-authorizing status, so its paired PostTool is not stale; `RECLASSIFY`
revokes every old capability/result-as-authority, preserves their hashes as evidence and issues a fresh route
receipt; `REPRESENT` preserves exact display bytes but creates a new PRESENTATION_PENDING challenge; `PLACE_NEW`
marks the old task SUPERSEDED, then creates PENDING/DEFERRED only if the new event independently has the §5.1
signal, otherwise returns it to the ordinary router with no inherited capability.
`PLACE_NEW_WITH_PROJECT` marks the old task SUPERSEDED, carries the unique §5.2 project intent into the same
matrix composition, and creates only the PENDING/D-bound or S-bound DEFERRED result specified there. No action
copies an ordinary project write grant from the prior event.

The route transition table is total before the project matrix; `D/S` below means the later project composition
may additionally store D or create S under §8.3–8.5:

`PLAN_TRANSFER_CLAIM(_WITH_PROJECT)` is consumed by the closed checkpoint overlay above and therefore never
falls into this table; a fixture that reaches a table column/default is a mechanical error.
Every checkpoint cell below that says “archive CANCELLED” first consumes its immutable §5.3 cancellation
reservation. ENTRY follows the cell's displayed ordinary successor in the same rename. OVERFLOW instead takes
the unique terminal `ROTATION_REQUIRED(CANCELLED_CHECKPOINT_ARCHIVE_FULL)` successor and suppresses every
displayed PLACE_NEW/replan/project action; it cannot fall through to another table cell. Missing/mismatched/no
slot is STATE_TRANSITION_INVALID and preserves the live checkpoint rather than pretending cancellation happened.
Likewise, a matching nonterminal TransferJournal owner census and any active `transfer_recovery_notice` run
before every row/column for both bound sessions. LIVE/UNPROVABLE/PROVEN_DEAD use the total overlay in §5.3 and
cannot fall through to this table until COMMITTED. Exact COMMITTED read-back then sends a TRANSFERRED source
only to `TERMINAL_DIAGNOSTIC`; it still does not reach another row. A generated cross-product asserts every closed
`route_event_kind` (PROJECT_ONLY and ROUTE_NONE remain distinct inputs even where a later table cell is shared).

| Current route status | STATUS | CORRECTION | NEW_TASK | NEW_TASK_SIGNAL_WITH_PROJECT | CANCEL_TASK | EXACT_APPROVAL | ANSWER_OR_REVISION | BARE_CONTINUE | PROJECT_ONLY / ROUTE_NONE | ROUTE_AMBIGUOUS |
|---|---|---|---|---|---|---|---|---|---|---|
| ABSENT | no route capability | NO_LIVE_TASK | fresh signal→PENDING, otherwise ordinary router | PLACE_NEW_WITH_PROJECT | NO_PENDING | NO_PENDING | NO_PENDING | no-op | project matrix only | diagnostic/null |
| PENDING / RESUMED | ROTATE classify | update task + RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | ROTATE + NO_PENDING_APPROVAL diagnostic | STATE_TRANSITION_INVALID/null | ROTATE classify | ROTATE classify; D/S overlay may defer | PRESENTATION_PENDING clarification→WAITING_HUMAN |
| PLANNING_PENDING | ISSUED→ROTATE Plan call; IN_FLIGHT→CARRY_IN_FLIGHT; RESULT_READY→ROTATE independent finalize capability only | revoke/stale old + PLAN_REVISION_REQUIRED fresh plan cap | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | preserve plan phase + NO_PLAN_RESULT | STATE_TRANSITION_INVALID/null | same as STATUS | same as STATUS; D/S overlay may revoke/defer | revoke/stale + PRESENTATION_PENDING clarification |
| PLAN_REVISION_REQUIRED | ROTATE plan cap | preserve prior result hash + ROTATE plan cap with correction | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | ROTATE + NO_APPROVABLE_PLAN | STATE_TRANSITION_INVALID/null | ROTATE plan cap | ROTATE; D/S overlay may defer | PRESENTATION_PENDING clarification |
| PRESENTATION_PENDING | REPRESENT exact bytes on new event | discard unshown display + RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | REPRESENT + UNSEEN_DISPLAY | REPRESENT + UNSEEN_DISPLAY | REPRESENT | REPRESENT; D/S first revokes display and applies resume_mode | REPRESENT clarification; old display hash retained |
| WAITING_HUMAN (VERIFIED) | REPRESENT exact question | RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | STATE_TRANSITION_INVALID/null | §5.3 wait-kind table → exactly SATISFIED, RESUMED, PLAN_REVISION_REQUIRED, EXECUTION_PENDING or PLAN_EXECUTION_PENDING | REPRESENT with no implicit answer, except PROJECT_SCOPE_DRAIN_REQUIRED follows its exact §5.3 continuation cell | PROJECT_ONLY is scope revision via D/S; PROJECT_SWITCH_REQUIRED may create D/S and PROJECT_SCOPE_DRAIN_REQUIRED follows its total scope-drain subtable; ROUTE_NONE→REPRESENT | REPRESENT clarification |
| WAITING_PLAN_APPROVAL (VERIFIED) | REPRESENT exact plan | PLAN_REVISION_REQUIRED fresh cap | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | exact approval creates approved identity then §5.3 selects NO_PIN+NO_PROJECT route-only PENDING, effective-project PENDING, or clean-terminal WAITING_BOUNDARY; PLAN_PROJECT_REQUIRED never reaches this row | exact `修改计划 <result_sha256>：<text>`→PLAN_REVISION_REQUIRED fresh cap | REPRESENT exact approval request; never approve implicitly | PROJECT_ONLY scope revision via D/S; ROUTE_NONE→REPRESENT | REPRESENT clarification |
| PLAN_EXECUTION_PENDING / PLAN_EXECUTION_ACTIVE | ROTATE unissued phase cap or CARRY exact in-flight call | revoke successor authority and enter delta-replan/human gate | PLACE_NEW and supersede execution | PLACE_NEW_WITH_PROJECT | CANCELLED after released-call tombstone | NO_PLAN_WAIT | only exact PLAN_EXECUTION wait answer is valid | CARRY in-flight or reinject current phase; never complete | project-scoped D/S snapshots or defers the exact current phase; no-project stays route-only | stage verified clarification without completing a phase |
| PLAN_EXECUTION_FAILURE_DRAIN | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null | REJECTED_BUSY/null |
| PLAN_EXECUTION_WAITING_BOUNDARY (VERIFIED) | REPRESENT exact boundary instruction | supersede execution→PLAN_REVISION_REQUIRED | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | NO_PLAN_WAIT | only exact `继续执行计划 <wait_sha256>` is valid | generic bare continue REPRESENTS; never starts | PROJECT_ONLY scope revision; ROUTE_NONE→REPRESENT | REPRESENT clarification |
| PLAN_EXECUTION_WAITING_HUMAN (VERIFIED) | REPRESENT exact typed wait | delta-replan | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | NO_PLAN_WAIT | wait-kind exact: PHASE_QUESTION answer→append only the queue head then next question or complete work bundle; MAIN_AGENT_HITL answer→mark only that graph step DONE then unique next step/MAIN_AGENT_COMPLETION_READY; PHASE_CONFIRMATION→append only queue-head receipt then next confirmation/BETWEEN_WAVES/FINAL_ASSERTIONS; PREFLIGHT_OVERRIDE retry→same preflight+saved frontier, override→PREFLIGHT_OVERRIDDEN+saved frontier then remaining preflight/parameter frontier; FAILURE_DECISION RETRY→all exact successors, REPAIR→REPLAN_PENDING, PHASE SKIP→waive and reissue OTHER_PHASE only, FINAL SKIP→deny/re-present, TERMINATE→CANCELLED; wrong grammar/kind denies | REPRESENT, no implicit answer | project scope revision uses D/S with the complete typed wait snapshot | REPRESENT clarification |
| PLAN_EXECUTION_REPLAN_PENDING | ROTATE unissued delta cap or CARRY exact delta call | replace affected input under a fresh delta sequence | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED after any delta tombstone | NO_PLAN_WAIT | only exact failure-decision control is valid | reinject exact replan action; no phase capability | D/S snapshots the replan state; no project grant | PRESENTATION_PENDING clarification |
| PLAN_EXECUTION_DELTA_PRESENTATION_PENDING / PLAN_EXECUTION_WAITING_DELTA_APPROVAL / PLAN_EXECUTION_WAITING_DELTA_BOUNDARY | REPRESENT immutable delta/wait | supersede delta→fresh replan | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | NO_PLAN_WAIT; initial-Plan approval is never a delta control | exact wait-kind subtable: PRESENTATION_PENDING→UNSEEN_DISPLAY/REPRESENT; WAITING_DELTA_APPROVAL + exact `批准增量计划 <sha>`→event-bound install capability; WAITING_DELTA_BOUNDARY + exact `继续执行增量计划 <sha>` only on DIFFERENT_DRAINED→install capability, SAME/unproven→REPRESENT; a matching revision creates a new delta sequence; wrong kind/SHA/extra text denies | REPRESENT; no implicit install | D/S snapshots exact delta state | REPRESENT clarification |
| PLAN_EXECUTION_CHECKPOINT_PRESENTATION / PLAN_EXECUTION_TRANSFER_READY | rotate the same checkpoint display only when no project directive survives | move CANCELLED checkpoint to source archive then PLAN_REVISION_REQUIRED | archive CANCELLED checkpoint then PLACE_NEW | archive CANCELLED checkpoint then ordinary combined project/task routing | exact cancel→archive CANCELLED checkpoint; no source execution revival | NO_PLAN_WAIT | only transfer-cancel control valid in source sid | fresh CHECKPOINT_PRESENTATION; no local resume | PROJECT_ONLY before claim→one-rename PROJECT_INTENT archive cancellation then ordinary project routing with a fresh CLASSIFY snapshot; ROUTE_NONE→fresh CHECKPOINT_PRESENTATION; after CLAIM_COMMITTING both are REJECTED_BUSY | fresh CHECKPOINT_PRESENTATION clarification |
| PLAN_EXECUTION_TRANSFERRED | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC | TERMINAL_DIAGNOSTIC |
| PLAN_EXECUTION_COMPLETE_PENDING_STOP | REPRESENT staged plan summary | discard completion authority + delta-replan | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | NO_PLAN_WAIT | STATE_TRANSITION_INVALID/null | REPRESENT | D/S supersedes staged summary; never marks complete | REPRESENT clarification |
| EXECUTION_PENDING | ROTATE execution cap | RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | ROTATE + NO_PLAN_WAIT | STATE_TRANSITION_INVALID/null | ROTATE execution cap | ROTATE; D/S overlay may revoke/defer | PRESENTATION_PENDING clarification |
| EXECUTION_WAITING_BOUNDARY (VERIFIED) | REPRESENT exact boundary message | discard selection + RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | REPRESENT + NO_PLAN_WAIT | STATE_TRANSITION_INVALID/null | DIFFERENT_DRAINED clean C/B→A+EXECUTION_PENDING fresh cap; SAME/unproven→REPRESENT | PROJECT_ONLY scope revision via D/S; ROUTE_NONE→REPRESENT | REPRESENT clarification |
| EXECUTION_ACTIVE | CARRY_IN_FLIGHT execution ID and rebind new-tool event | revoke old execution + RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | CARRY_IN_FLIGHT + NO_PLAN_WAIT | STATE_TRANSITION_INVALID/null | CARRY_IN_FLIGHT | CARRY_IN_FLIGHT; D/S overlay may revoke/defer | revoke + PRESENTATION_PENDING clarification |
| EXECUTION_COMPLETE_PENDING_STOP | REPRESENT staged draft/output | discard staged authority + RECLASSIFY | PLACE_NEW | PLACE_NEW_WITH_PROJECT | CANCELLED | REPRESENT + NO_PLAN_WAIT | STATE_TRANSITION_INVALID/null | REPRESENT staged result | REPRESENT; D/S revokes staged result | discard + PRESENTATION_PENDING clarification |
| DEFERRED_BY_PROJECT_CHANGE | preserve until committed-boundary preprojection, then process as STATUS | committed-boundary preprojection then apply correction to the new obligation | PLACE_NEW | PLACE_NEW_WITH_PROJECT | cancel project coupling and restore CANCELLED | preserve + NO_PLAN_WAIT | committed-boundary preprojection may process a task-relative answer; otherwise invalid | committed-boundary preprojection then classify | project revision controls replacement S; ROUTE_NONE after preprojection is STATUS | preserve + diagnostic/null |
| SATISFIED / CANCELLED / SUPERSEDED | no live capability | no-op + NO_LIVE_TASK | PLACE_NEW | PLACE_NEW_WITH_PROJECT | no-op | no-op | no-op | no-op | no-op | diagnostic/null |

`TERMINAL_DIAGNOSTIC` is a closed `PLAN_EXECUTION_TRANSFERRED` successor, not a routing disposition, and is
reachable only after the matching journal read-back establishes `committed_transferred_source=true`. For every
route-event kind, every project intent, every parent relation and TARGET_EXISTS result it appends only the
bounded `COMMITTED_SOURCE_TERMINAL` transfer-security outcome (never an ordinary event), preserves the complete immutable transfer tombstone and project state,
emits command null, and derives exactly this presentation from the tombstone's committed target receipt:
`PLAN_EXECUTION_TRANSFERRED: this source session is permanently read-only; start a fresh native session for a new task.`
It creates no obligation, display/wait capability, D, S, project grant or execution authority. The same event
cannot also reach PLACE_NEW, PLACE_NEW_WITH_PROJECT or the ordinary project matrix.

For every capability subphase and table cell, the oracle specifies `{status, capability_action, current_event,
issued_event, accepted_posttool_ids, display, derived_project_intent, command}`. Missing subphase/cell is a
mechanical error. This table is crossed with all project phases, three parent relations and seven project
intents; neither table silently supplies a default for the other.

### 8.2 Global precedence (before stable-state matrix)

| Condition | State / ledger / output |
|---|---|
| malformed sid or state | bytes unchanged; scope deny; command null |
| raw candidate `NOT_YET_VISIBLE` | retain `ATTESTATION_PENDING`; project unchanged; scope deny |
| provable candidate mismatch | consume only candidate; cursor unchanged; bounded rejection; continue prefix |
| invalid raw candidate with intact/unmapped stream | `AUTH_BLOCKED(CANDIDATE_INVALID)`; no cursor/event; scope deny; command null |
| any §6.2 `STREAM_INVALID` source/group condition | `ROTATION_REQUIRED`; clear pending authority, freeze cursor; scope deny; command null |
| authenticated peer/meta | cursor + rejected-ledger append + `AUTH_BLOCKED`; command null |
| sole exact Claude previous-group look-behind maps the pending candidate to an ordinary-ledger event or the exact transfer-security last event | consume pending; `AUTH_BLOCKED(EVENT_REPLAY)`; both ledgers/cursor/project/core/obligation unchanged; command null |
| either bound sid has a matching TransferJournal or active `transfer_recovery_notice`, or a TRANSFERRED underlay requires its journal proof | under the §5.3 lock order, validate/census, select the total `transfer_invocation_kind` and derive ordinary `ledger_admission` before mutation: an event-bearing kind on a nonterminal arm writes exactly one fixed-size TransferSecurityEvent and selects only BUSY, notice, or an issued/rotated current-event-bound recovery capability, while every no-new-event kind writes no event and takes only its own single named side effect; FULL additionally installs only TRANSFER_SECURITY_LANE rotation posture, whose later events can enter only through the §6.1 fixed-marker durable-record drain; missing/malformed/mismatch external journal proof beside TRANSFERRED writes INVALID_PROOF only through an already-valid accumulator and fails closed, while malformed session/accumulator was rejected by the first row; exact COMMITTED read-back clears any notice, then the source alone records COMMITTED_SOURCE_TERMINAL→TERMINAL_DIAGNOSTIC; a target with pre-cleanup counted backlog records only COMMITTED_TARGET_BACKLOG_DENIED until its generic full-ledger result, otherwise the target exposes its already-committed underlay to the later ordinary capacity row; no other row runs first |
| newly attested human exact RECOVER/CLEANUP/QUARANTINE control matching immutable state/hash | apply the total recovery-control table in §9.3; project/core unchanged; only its exact persisted controller may consume a capability |
| ordinary ledger would exceed 256 and no earlier transfer-security source/nonterminal lane selected the event | `ROTATION_REQUIRED`; no eviction; command null; this remains the mandatory COMMITTED-target result |
| route status PLAN_EXECUTION_FAILURE_DRAIN | append `REJECTED_BUSY`; retain the exact failure/drain/project/obligation bytes; scope deny; only already-released paired PostTool records may consume the drain; command null |
| newly attested signal-only event with no project directive while an exact SWITCH/NEW core is MUTATION_COMMITTING/COMMIT_CLEANUP_PENDING/RECOVERY_REQUIRED | append `ACCEPTED_ROUTE_ONLY_BUSY`; bind the §5.2 deferred obligation to that core target/op; immutable project/core unchanged; command null |
| newly attested `NEW_TASK_SIGNAL_WITH_PROJECT` while that core is transient and event `{target,op}` exactly equals core `{target,op}` | append `ACCEPTED_ROUTE_ONLY_BUSY`; create/replace only the target/op-bound §5.2 deferred obligation outer field; immutable project/core unchanged; command null |
| newly attested `NEW_TASK_SIGNAL_WITH_PROJECT` while that core is transient and event target/op differs | append `REJECTED_BUSY`; old obligation and immutable project/core unchanged; no supersession; command null |
| `SELECT(T,NEW)` census is EXISTING_CURRENT/EXISTING_OTHER, outside the exact same pending `S(T,NEW)` and not handled by the three core-coupling rows above | apply the total `TARGET_EXISTS` guard in §8.1 before route supersession; project bytes stay fixed while route substate takes its event-rebind action; command null |
| project `MUTATION_COMMITTING`, `COMMIT_CLEANUP_PENDING`, or `RECOVERY_REQUIRED` | accepted event appended as `REJECTED_BUSY`; immutable mutation core and route obligation preserved; command null |
| clean stable state | use exactly one matrix or overlay cell below |

The TransferJournal row is ordered after attestation/replay rejection but before every recovery-control,
capacity, route-status, transient-core, TARGET_EXISTS and clean-state row. Its COMMITTED fall-through is not a
second transition: the same locked read validates the §5.2 predicate, after which the source TRANSFERRED arm
selects only its terminal diagnostic; the target instead continues from the committed imported execution bytes
and never inherits the source terminal. PREPARED/TARGET_PUBLISHED/SOURCE_TOMBSTONED, active notices and invalid
journal proofs cannot fall through to any later row or ordinary Stop. Their fresh human event and a COMMITTED
source event have already advanced the fixed transfer-security chain, not the ordinary event array; the later
capacity row therefore cannot compete. A cleaned COMMITTED target has no transfer-security append for a fresh
event and is the only transfer side that may reach ordinary AVAILABLE/FULL; only its already-counted
pre-cleanup scan backlog takes the closed transfer-denial arm before generic rotation. One invocation can never
match two arms: the §5.3 input table is evaluated exactly once under those locks, a nonempty scan admits only
the drain or deny kind, and an exact persisted recovery controller, projection Stop or COMMITTED-target cleanup
is reachable only through its own no-new-event kind.

The recovery-control row applies only to `MUTATION_COMMITTING`, `COMMIT_CLEANUP_PENDING` or
`RECOVERY_REQUIRED` with exact immutable hashes and precedes
ordinary ledger capacity. It appends the native event to `recovery_ledger` and publishes one strict
`recovery_control={capability_id,attempt_seq,generation,event,boundary,op,tx,hashes,status}` only when the §9.3
table permits issuance or reauthorization; replay is rejected there independently. The controller may
idempotently resume only the same persisted invocation/owner tuple under that table, never merely because the
operation text matches. Ordinary ROTATION_REQUIRED still permits a candidate only for this exact recovery lane while the
project remains non-clean. Final recovery leaves prompt_gate=ROTATION_REQUIRED and requires a new sid; no control
event is moved into or evicts the ordinary ledger.

Recovery capacity cannot erase the only recovery path. Before accepting tail event 17, the session-lock
transition may compact only a contiguous prefix of `CONSUMED|TERMINAL_FAILED|PROVEN_DEAD_REAUTHORIZED` attempts
into strict
`checkpoint={through_attempt_seq,through_cursor_offset,last_event_id,last_event_sha256,chain_sha256}` where
`chain_0=H(LP("recovery-checkpoint:v1")||LP(session)||LP(generation)||LP(tx)||LP(core_sha256))` and each next
link hashes the prior link plus the exact terminal attempt object SHA. It retains the newest terminal entry and
every `ISSUED|IN_PROGRESS|LIVE_BUSY|UNPROVABLE` entry; compaction and the newly attested control append occur in
one rename. The transcript/rollout cursor remains monotonic beyond every compacted native delivery, so an old
event cannot re-enter the current window; the retained last-event ID closes exact one-group look-behind replay.
`attempt_seq` never resets and the controller capability hashes the checkpoint root. If no terminal prefix can
free a slot, capacity deny is safe; the 16th-attempt controller-death fixture must permit the 17th newly attested
human reauthorization after compacting the terminal prefix and yield one unique outcome.

Attestation failure changes only `prompt_gate`; it never invents an `AUTH_BLOCKED` project phase or a drain bit.
The validated project lane and any immutable mutation core remain for recovery, while ordinary scope stays
denied until a later valid event. A missing or forged Stop cannot manufacture a parent boundary.

### 8.3 Stable-state notation and SAME / DIFFERENT_UNPROVEN matrix

`N`=NO_PIN; `A(P,D?)`=TURN_ACTIVE; `C(P,D?)`=TURN_CLOSED; `S(T,op;O?)`=SWITCH_ONLY;
`B(P,D?)`=clean BOUND; `D` is the independent non-capability `deferred_project_request`. The seven intent columns
are total. `DIFFERENT_UNPROVEN` mechanically uses this SAME matrix with a diagnostic; no default fallthrough may
reinterpret it. Every NEW mentioned in these matrices is already proven ABSENT by §8.1, except exact idempotent
re-emission of the same pending `S(T,NEW)`; existing-current/other NEW never reaches a matrix cell.

| Current | SELECT(T,SWITCH\|NEW) | CONFIRM_PENDING | CANCEL_PENDING | DEACTIVATE | BARE_CONTINUE | OTHER | AMBIGUOUS |
|---|---|---|---|---|---|---|---|
| `N` | fresh `S(T,op)`, exact command | D exists: fresh `S(D)`; else N/NO_PENDING | clear D→N | N/NO_CURRENT | D exists: fresh `S(D)`; else N/NO_PENDING | keep N+D | keep N+D, diagnostic |
| `A(P,D?)` | SWITCH P: A, current event updated, epoch unchanged; SWITCH Q or ABSENT NEW T: store/replace `D(T,op)`, A unchanged, command null | keep A+D; never execute | clear D, keep A | store/replace D(DEACT), keep A, null | keep A+D; never execute | keep A+D | keep A+D, diagnostic |
| `C(P,D?)` | SWITCH P: keep C; SWITCH Q or ABSENT NEW T: store/replace D, keep C, null | keep C+D; never execute | clear D, keep C | store/replace D, keep C, null | keep C+D; never execute | keep terminal C+D | keep C+D, diagnostic |
| `S(T,op;O?)` | exact same T/op (including pending NEW): preserve exact tx, re-emit read-back command; other SWITCH or ABSENT NEW: global→session supersede with fresh tx before mutation begins | preserve exact tx, re-emit | invalidate; O→C(O), no O→N | O: supersede with fresh DEACT tx; no O→N | preserve exact tx, re-emit | preserve S, null | preserve S, null+diagnostic |
| `B(P,D?)` | SWITCH P: keep B; SWITCH Q or ABSENT NEW T: store/replace D, keep B, null | keep B+D; never execute | clear D, keep B | store/replace D, keep B, null | keep B+D; never execute | keep terminal B+D | keep B+D, diagnostic |

There is deliberately no SAME/unproven switch or deactivate from A/C/B. A tool already released under P may
still be running. Storing D revokes authorization for every new tool; an already released tool may only finish
against P. D is never stored in `route_obligation`.

Every `store/replace D` cell also stages a fresh UNVERIFIED SCOPE_DRAIN `project_presentation`; every preserve
cell preserves its primary proof and stages/replaces only `project_reprompt`, and every clear/consume cell
requires the primary presentation plus any active reprompt VERIFIED and clears the active challenge atomically. This applies
equally when no route obligation exists. The matrix may not infer presentation from a diagnostic string.

Every accepted cell whose result is `A(P)` atomically updates `turn.event_id` and `prompt_gate.current_event` to
the new event. It preserves boundary and epoch exactly where the cell says SAME/unproven, and installs the new
proven boundary where the cell says DIFFERENT_DRAINED. D may still deny scope independently.

### 8.4 DIFFERENT_DRAINED matrix

For `A(P,D?)`, marker-proven drain atomically supplies close and then applies the `C(P,D?)` row without an
intermediate grant. Missing Stop cannot deadlock; ID inequality alone cannot qualify.

| Current | SELECT(T,SWITCH\|NEW) | CONFIRM_PENDING | CANCEL_PENDING | DEACTIVATE | BARE_CONTINUE | OTHER | AMBIGUOUS |
|---|---|---|---|---|---|---|---|
| `N` | fresh `S(T,op)`, exact command | D exists: fresh S(D); else N/NO_PENDING | clear D→N | N/NO_CURRENT | D exists: fresh S(D); else N/NO_PENDING | keep N+D | keep N+D, diagnostic |
| `A(P,D?)` or `C(P,D?)` | SWITCH P→A(new boundary); SWITCH Q or ABSENT NEW T→fresh `S(T,op;P)` | D exists→fresh S(D;P); no D→C/NO_PENDING | clear D→A(P) | fresh `S(P,DEACT;P)` | D exists→fresh S(D;P); no D→A(P) | no D→A(P); D exists→C(P,D.status=WAITING_CONFIRMATION,wait_event=current)+diagnostic | keep C+D, null+diagnostic |
| `S(T,op;O?)` | exact same pending T/op: invalidate old event binding and issue fresh tx for the same capability; other SWITCH or ABSENT NEW: invalidate old, fresh S bound to new event | invalidate old, fresh tx same T/op | invalidate; O→A(O,new), no O→N | O→fresh DEACT; no O→N | invalidate old, fresh tx same T/op | abandon; O→A(O,new), no O→N | preserve S, null+diagnostic |
| `B(P,D?)` | SWITCH P→A; SWITCH Q or ABSENT NEW T→fresh S | D exists→fresh S(D); no D→B/NO_PENDING | clear D→A(P) | fresh DEACT | D exists→fresh S(D); no D→A(P) | no D→A(P); D exists→B(P,D.status=WAITING_CONFIRMATION,wait_event=current)+diagnostic | keep B+D, null+diagnostic |

### 8.5 Route-obligation precedence

The implementation is one generated pure composition, not two hand-written transitions. After attestation,
prompt/ledger guards and the matching TransferJournal/notice overlay, exact COMMITTED TRANSFERRED terminates
before routing; only a fall-through state reaches the remaining global recovery/BUSY precedence, after which
`resolveRouteControl(state,event)` returns exactly
`{route_outcome, derived_project_intent, resume_mode}`. The total project matrix consumes that derived intent
and returns `project_outcome`. `overlayRoute(route_outcome,project_outcome)` then publishes both in one rename;
no intermediate project grant or command is visible. Every route-status × capability-subphase ×
route-event-kind × stable-project-phase × parent-relation × seven-project-intent cell is generated, and an
absent composition is a mechanical error.

Wait-control composition is fixed:

- exact task cancel, a full-input SHA-bound §5.3 wait control, and a separately classified new task without a
  project clause are resolved
  first. Each SHA-bound wait kind has only the status/result in that table; its full match contains no project directive
  and derives OTHER. The resulting OTHER project cell still refreshes the boundary/current event. Thus `B +
  WAITING_PLAN_APPROVAL + DIFFERENT_DRAINED + 批准计划 <exact result SHA>` has the unique result `A +
  PLAN_EXECUTION_PENDING`, while SAME/unproven remains terminal as the matrix requires;
- a standalone affirmative SWITCH/NEW while waiting is a scope revision, not approval: it preserves the old
  question/plan-result SHA as superseded evidence and sends that project intent to the matrix. Mixed
  cancel/approval plus project intent, and generic NEW_TASK plus project intent, is AMBIGUOUS and emits no
  command. The sole exception is NEW_TASK_SIGNAL_WITH_PROJECT: it supersedes the old wait/task evidence and
  supplies PLACE_NEW_WITH_PROJECT + its unique SWITCH/NEW intent to this same composition;
- PROJECT_SWITCH_REQUIRED deliberately has no SHA answer token. Only a fresh PROJECT_ONLY SWITCH directive for
  its stored canonical target is the expected resolution: a current-target SWITCH may refresh the project
  turn; an immediately admissible real switch follows S→commit→boundary resume. NEW, bare continue or a quoted
  retry cannot satisfy it. If the same rename returns A with effective_project_context, it applies the saved
  execution-subphase restoration row; if it returns S, status becomes DEFERRED_BY_PROJECT_CHANGE with that
  exact snapshot. If SAME/DIFFERENT_UNPROVEN can only store D(SWITCH,target), the same rename preserves task/selection and stages the generic
  PROJECT_SCOPE_DRAIN_REQUIRED wait with the exact pre-D resume snapshot;
- every live route subphase whose project composition can only store D under SAME/DIFFERENT_UNPROVEN uses that
  same scope-drain transition. It revokes any unused plan/execution/display capability, preserves an exact
  completion tombstone for an already released call, and stores real `{op,target?}` plus resume
  status/subphase. It cannot pretend S exists or enter a naked Stop-blocking route status. Its operation-specific
  display is exact: SWITCH=`已记录切换到「<target>」项目。当前回复结束后，请在由原生终止标记证明的新一轮发送「继续」；若仍在同一轮，只会再次提示。`;
  NEW substitutes `创建「<target>」项目`; DEACTIVATE substitutes `退出当前项目`. Display proof, and completion
  tombstone drain where present, are required before Stop;
- the following table is a generated overlay crossed with all scope-resume rows in §5.3. `MATCH` means exact
  stored op/target (DEACTIVATE has no target); `CURRENT` means SWITCH to the still-bound current project;
  `REVISION` means another valid op/target and re-runs TARGET_EXISTS/census before the ordinary project matrix.
  A table cell that clears D must apply the exact resume-snapshot restoration in the same rename. A cell that
  produces replacement D rewrites only the deferred request and fresh display challenge while preserving the
  original resume snapshot; a cell that produces S changes status to DEFERRED_BY_PROJECT_CHANGE and carries the
  same snapshot. There is no no-D WAITING_HUMAN state.

Before either a bare continuation or exact NEW retry may take a D(NEW)→S cell, the same session-lock transition
re-runs the bounded complete-registry census; this state-specific preflight precedes the ordinary TARGET_EXISTS
guard so both grammars converge:

`target_became_current_evidence_id = H(LP("new-target-became-current:v1") || LP(request_sha256) ||
LP(census_receipt_sha256) || LP(current_project_identity_sha256))`.

| Fresh D(NEW) census | `route_snapshot_kind=PRESENT` | `route_snapshot_kind=ABSENT` |
|---|---|---|
| ABSENT | continue to the parent-relation cell below; only DIFFERENT_DRAINED may create S(NEW)+DEFERRED | same project cell; only DIFFERENT_DRAINED may create project-only S(NEW), with no route object |
| EXISTING_OTHER | clear D, restore exact `project_origin_snapshot`, retain task/scope snapshot, set TARGET_EXISTS and stage PROJECT_SWITCH_REQUIRED for the now-existing canonical target; no capability/command | clear D, restore the same exact project origin, create no route/task/scope object, and stage only independent `TARGET_BECAME_EXISTING_PROJECT_ONLY` presentation with project-only SWITCH retry |
| EXISTING_CURRENT | clear D and restore the project origin, then apply PROJECT_CONTEXT_REBOUND: supersede old project-bound arms and create a new current-project PENDING obligation with the same exact task bytes and `change_evidence_id=target_became_current_evidence_id`; no project command | clear D, restore the same project origin and apply the ordinary current-target project cell (keep/open current only if that cell and parent relation allow it); stage independent `TARGET_BECAME_EXISTING_PROJECT_ONLY` with `census=EXISTING_CURRENT`, create no obligation/task/scope bytes and no command |
| INCOMPLETE / cap+1 / identity drift | preserve D and both snapshots; route and project presentation share one bounded census-incomplete reprompt; no capability/command | preserve D/project origin; stage only an independent project census-incomplete reprompt; route/task/scope fields remain forbidden |

The two columns must produce byte-identical project phase/binding/turn/boundary/epoch whenever they restore the
same origin; the project projection of PRESENT's PROJECT_CONTEXT_REBOUND is exactly the ordinary current-target
cell used by ABSENT, and the columns differ only in route versus independent presentation fields. The EXISTING_CURRENT PRESENT
rebind uses the TARGET_BECAME_CURRENT predecessor variant and PROJECT_REBOUND obligation provenance above;
commit fields are forbidden, so it makes no transaction/commit claim. The ABSENT column can never fabricate an
empty task, obligation, scope snapshot or route wait. A second existence flip after ABSENT→S remains covered by
the controller-time NEW race in §9.2. Skipping this preflight, reusing the D-creation census, crossing the two
snapshot arms, or letting exact-retry and bare-continuation disagree is a biting mutant. The generated matrix
covers every legal A/C/B creation origin, both continuation grammars and all four census rows.

| PROJECT_SCOPE_DRAIN_REQUIRED intent | SAME / DIFFERENT_UNPROVEN | DIFFERENT_DRAINED |
|---|---|---|
| SELECT(T,SWITCH\|NEW) MATCH | preserve D; fresh exact operation display; null command | consume D→fresh S(T,op); DEFERRED; exact command |
| SELECT(P,SWITCH) CURRENT | clear D; restore exact status/subphase; null command | clear D; open/keep A(P) on proven boundary; restore exact status/subphase; null command |
| SELECT(T,SWITCH\|NEW) REVISION | ordinary matrix: replacement D→fresh operation display, S→DEFERRED; TARGET_EXISTS guard may instead stage PROJECT_SWITCH_REQUIRED | ordinary matrix: fresh S→DEFERRED; TARGET_EXISTS guard may instead stage PROJECT_SWITCH_REQUIRED |
| CONFIRM_PENDING | only stored SWITCH is admissible: preserve D and re-present; stored NEW/DEACTIVATE→operation-mismatch diagnostic + re-present | stored SWITCH consumes D→fresh S; stored NEW/DEACTIVATE→operation-mismatch diagnostic + re-present |
| CANCEL_PENDING | clear D; restore exact status/subphase | clear D; restore exact status/subphase on the proven boundary |
| DEACTIVATE_CURRENT | stored DEACTIVATE=MATCH; otherwise REVISION; matching/replacement D re-presents | matching or revised DEACTIVATE creates fresh S→DEFERRED |
| BARE_CONTINUE | preserve D and re-present; never execute | preserve stored op/target and consume D→fresh S→DEFERRED |
| OTHER | preserve D and re-present the operation-specific display; null command | preserve D and re-present; no implicit confirmation |
| AMBIGUOUS | preserve D; bounded diagnostic + re-present; null command | preserve D; bounded diagnostic + re-present; null command |

`继续切换` is classified only as CONFIRM_PENDING. Exact SWITCH confirmation is therefore unambiguous; it is
never also BARE_CONTINUE. An operation-mismatched explicit directive follows REVISION, not CONFIRM_PENDING, and
cannot silently execute the stored D. Missing D/hash/snapshot is STATE_TRANSITION_INVALID rather than REPRESENT.

`deferred_plan_claim` is an orthogonal pre-route overlay. It is valid only with matching D, S(SWITCH), its
mutation/cleanup phases, or clean B/A for the exact checkpoint target. It never coexists with a live semantic
obligation or ordinary plan execution in the target sid. SAME/unproven preserves it and uses the same independent
project presentation/reprompt proof; cancel/new task tombstones the claim without affecting the source
checkpoint; project revision to another target rejects and clears no source authority. Exact committed cleanup
plus DIFFERENT_DRAINED invokes `plan-transfer claim` before the route table and clears the deferred object only
when the global transfer journal reaches COMMITTED. If the source live checkpoint is absent and exactly one
matching source record across ordinary entries and overflow is exact CANCELLED before CLAIM_COMMITTING, the
target consumes no claim token: it stores one non-authorizing cancellation receipt,
removes the deferred object and returns to the ordinary route table in the same target-session rename. A
missing/mismatched source remains fail-closed and cannot import or mint project/route authority.

The status/product overlay is:

| Obligation status | Allowed project phase | Mandatory rule |
|---|---|---|
| PENDING / RESUMED / PLAN_REVISION_REQUIRED | N, A, C or B | Stop blocks while no scope change is pending. Matrix D revokes the unused classify/plan authority and stages PROJECT_SCOPE_DRAIN_REQUIRED with the exact saved status/subphase; matrix S changes to DEFERRED_BY_PROJECT_CHANGE with the same snapshot. |
| PLANNING_PENDING | N, A, C or B | Only exact Plan call, immutable result and independent event-bound finalize capability run. D stages PROJECT_SCOPE_DRAIN_REQUIRED; an already released Plan call becomes a non-authorizing completion tombstone, while ISSUED/finalize authority is revoked. S enters DEFERRED_BY_PROJECT_CHANGE. Stale output never becomes authority. |
| PRESENTATION_PENDING | N, A, C or B | Only exact display projection may transition to a verified wait. S revokes the display and enters DEFERRED_BY_PROJECT_CHANGE with the saved display subphase; D revokes the old challenge and stages the operation-specific scope-drain display. An unseen display never counts as a human gate. |
| PLAN_EXECUTION_PENDING / PLAN_EXECUTION_ACTIVE / PLAN_EXECUTION_WAITING_HUMAN / PLAN_EXECUTION_REPLAN_PENDING / PLAN_EXECUTION_DELTA_PRESENTATION_PENDING / PLAN_EXECUTION_WAITING_DELTA_APPROVAL / PLAN_EXECUTION_WAITING_DELTA_BOUNDARY / PLAN_EXECUTION_COMPLETE_PENDING_STOP | N, A, C or B | The approved-plan gate in §5.3 is exclusive. A project-requiring plan cannot exist under N. Project-scoped issue/successor requires effective context; a released preflight/child/join/quality/tool call may only finish into its typed tombstone after steering. D/S stores the exact approved-plan phase/replan/delta capability/evidence snapshot, but a successful project change supersedes the old plan execution and creates a fresh bound PENDING route obligation; it never resumes an approved plan against a different project identity. Wholly no-project plans remain route-only. |
| PLAN_EXECUTION_FAILURE_DRAIN | N, A, C or B | Every human/project intent, including TARGET_EXISTS, appends `REJECTED_BUSY` only; project, route, drain frontier, suspended successors, tombstones and prior presentation bytes remain byte-identical and command is null. Only already-released paired terminal records may advance the drain. |
| PLAN_EXECUTION_WAITING_BOUNDARY | clean C or B only | No phase capability exists. Only exact `继续执行计划 <wait_sha256>` on DIFFERENT_DRAINED opens A→PENDING; SAME/unproven re-presents and project revision supersedes or snapshots it. |
| PLAN_EXECUTION_CHECKPOINT_PRESENTATION / PLAN_EXECUTION_TRANSFER_READY | source stable phase only | Before CLAIM_COMMITTING, authenticated project intent atomically consumes the exact reservation and moves the complete CANCELLED checkpoint into its source archive arm. ENTRY tombstones the old execution and runs ordinary project routing from a fresh CLASSIFY_ISSUED obligation in the same source-state rename; OVERFLOW tombstones it and enters terminal ROTATION with no route/project successor. No checkpoint snapshot or transfer journal exists. Once CLAIM_COMMITTING/nonterminal journal exists, all such intent is REJECTED_BUSY. |
| PLAN_EXECUTION_TRANSFERRED | source stable phase plus exact matching COMMITTED TransferJournal proof only | Permanent post-commit tombstone: TARGET_EXISTS and every route event/project intent/parent relation selects only `TERMINAL_DIAGNOSTIC`, preserves the tombstone and project bytes, and cannot cancel, route, import or revive source authority. SOURCE_TOMBSTONED with the same underlay status remains exclusively in the earlier recovery overlay. The derived notice explicitly requires a fresh native session for every later task. |
| EXECUTION_WAITING_BOUNDARY | clean C or B only | No execution capability or project grant exists. Only a DIFFERENT_DRAINED bare continue may atomically open A and issue EXECUTION_PENDING; SAME/unproven/status re-presents, correction/new/cancel follows the route table, and D/S revokes or defers the selection. |
| EXECUTION_PENDING / EXECUTION_ACTIVE / EXECUTION_COMPLETE_PENDING_STOP | N, A, C or B | Exact execution gate applies; project-scoped issue/next-step requires effective_project_context, while no-project contracts remain route-only. TARGET_EXISTS stale-turn follows its dedicated PROJECT_SWITCH_REQUIRED subtable. A substantive correction revokes the old execution ID and reissues EXECUTION_PENDING; status/bare-continue rebinds the event without erasing evidence. D stages PROJECT_SCOPE_DRAIN_REQUIRED with the exact execution subphase; an in-flight step retains only its completion tombstone. S enters DEFERRED_BY_PROJECT_CHANGE. |
| DEFERRED_BY_PROJECT_CHANGE | S(SWITCH\|NEW\|DEACTIVATE), its transient mutation phases, clean B for SWITCH/NEW, or clean N with matching committed DEACTIVATE evidence | Replacement project operation stays DEFERRED and keeps the exact resume snapshot. Pre-commit cancel/abandon uses the no-change restore table. SWITCH/NEW commit+cleanup uses B+DEFERRED; DEACTIVATE uses N+DEFERRED. The next proven boundary must apply PROJECT_CHANGE_COMMITTED, supersede every old project-bound arm and create one newly bound PENDING obligation. Any other N+DEFERRED is invalid. |
| WAITING_HUMAN / WAITING_PLAN_APPROVAL | N, A, C or B | Display must already be VERIFIED and only its wait_event may Stop. The next human event follows the fixed wait composition above. PROJECT_SCOPE_DRAIN_REQUIRED requires matching D/hash/snapshot, re-presents under SAME/unproven, applies the full cancel/current restoration table, and only an exact DIFFERENT_DRAINED matching continuation may create S. |
| SATISFIED / CANCELLED / SUPERSEDED | any clean stable phase | No route block; project matrix applies. |

On clean B+DEFERRED, and clean N+DEFERRED with matching committed DEACTIVATE evidence, SAME/UNPROVEN events
stay terminal and re-present the exact COMMITTED_CHANGE display. On the first DIFFERENT_DRAINED event, exact
cancel exits, an independently explicit new task supersedes, and a project revision follows the project matrix;
every other event first applies PROJECT_CHANGE_COMMITTED, copies only exact task bytes into a newly bound
PENDING obligation, skips Project Gate, and then processes the same event as bare continuation, status,
correction or answer. A DIFFERENT_DRAINED SELECT another target creates fresh S and stays DEFERRED; SELECT
current is a project revision, not task continuation. On clean N+DEFERRED after an exact committed DEACTIVATE,
the same preprojection keeps N and creates the new NO_PIN-bound obligation before routing that event.

During `MUTATION_COMMITTING`/`COMMIT_CLEANUP_PENDING`/`RECOVERY_REQUIRED`, project core and committed evidence
are always byte-identical. The obligation is also byte-identical except for the exact §5.2 signal-only or
target/op-identical combined `ACCEPTED_ROUTE_ONLY_BUSY` outer transition; a different target/op is
`REJECTED_BUSY` and cannot supersede or create an obligation. The separately authorized recovery-control ledger
remains the only other permitted revision.

### 8.6 Stop and command contract

Stop first runs lazy attestation and the same route security gate. It never supplies drain by itself:

- only an exact native terminal marker for the controlling execution boundary may display-transition `A(P)` to
  `C(P)`; a deferred project request is preserved and SAME-parent execution remains forbidden;
- when the native terminal marker is ordered after Stop, clean A(P,D?) with no unresolved route/plan/execution
  gate may
  allow Stop **without changing A, boundary, epoch or D**. The harness then writes its terminal marker; the next
  attested prompt may prove DIFFERENT_DRAINED and atomically apply the C row. A forged/missing Stop therefore
  cannot create drain, while a genuine clean turn does not deadlock waiting for its own future marker;
- PENDING/RESUMED/PLANNING_PENDING/PLAN_REVISION_REQUIRED/PLAN_EXECUTION_PENDING/
  PLAN_EXECUTION_ACTIVE/PLAN_EXECUTION_REPLAN_PENDING/PLAN_EXECUTION_DELTA_PRESENTATION_PENDING/
  EXECUTION_PENDING blocks Stop and reinjects the exact
  task, plan or dispatch action; PLAN_EXECUTION_FAILURE_DRAIN blocks with command null and may change only via
  its already-released paired terminal records; PRESENTATION_PENDING allows Stop only when the final-assistant projection is
  byte-identical to its persisted display, then atomically installs the verified target wait; EXECUTION_ACTIVE blocks until exact wait/completion evidence, and
  EXECUTION_COMPLETE_PENDING_STOP verifies its staged output before SATISFIED; PLAN_EXECUTION_WAITING_HUMAN,
  PLAN_EXECUTION_WAITING_BOUNDARY, PLAN_EXECUTION_WAITING_DELTA_APPROVAL and
  PLAN_EXECUTION_WAITING_DELTA_BOUNDARY require their exact creating-event
  presentation, PLAN_EXECUTION_TRANSFER_READY requires its already-proven checkpoint display and has no source
  capability, and PLAN_EXECUTION_COMPLETE_PENDING_STOP verifies the exact
  final summary before SATISFIED;
- `PLAN_EXECUTION_CHECKPOINT_PRESENTATION` has one dedicated presentation Stop arm: only the exact creating
  event/boundary plus a byte-identical bounded final-assistant projection atomically changes checkpoint
  ISSUED→PRESENTED and route status→PLAN_EXECUTION_TRANSFER_READY in one state rename. A mismatch, wrong/replayed
  event, missing projection or crash before publication blocks and reinjects the persisted checkpoint display;
  a crash after publication reads PRESENTED/TRANSFER_READY and may not consume the transition twice;
- a matching TransferJournal census and active `transfer_recovery_notice` precede every ordinary Stop cell in
  both bound sessions. PREPARED/TARGET_PUBLISHED/SOURCE_TOMBSTONED LIVE or PROVEN_DEAD block Stop; UNPROVABLE
  permits only the notice's exact creating event/boundary plus byte-identical display to mark that notice
  VERIFIED and Stop once, as `NO_NEW_EVENT_STOP_PROJECTION`. This does not change the journal or either underlay. Replayed/mismatched notices and
  missing/malformed journal proof beside a TRANSFERRED underlay block Stop; the next human event reruns liveness;
- `ROTATION_REQUIRED(TRANSFER_SECURITY_LANE_ONLY)` does not select the generic event-257 Stop/output for a
  source/nonterminal transfer event. It permits only the one transfer outcome already committed in
  `transfer_security_ledger`: exact UNPROVABLE notice Stop, matching recovery controller, or COMMITTED-source
  terminal projection. A nonempty scan precedes all three by §5.3 predicates 1–2: the hook drains exactly one
  §6.1 durable group, denies the attempted controller/Stop and cannot consume or verify any
  capability/projection created by that same drain. NOT_YET_VISIBLE retains the scan object and blocks; a consumed group follows only its resulting
  transfer outcome. After equality removes the scan, the exact same persisted controller/display can be retried
  without a new user event through §5.3 predicates 4–6. LIVE/PROVEN_DEAD/INVALID_PROOF remain blocked exactly as in AVAILABLE;
- `PLAN_EXECUTION_TRANSFERRED` may use its terminal Stop cell only after the same locked read proves
  `committed_transferred_source=true` and the final-assistant projection byte-matches the immutable committed
  target receipt plus the exact `TERMINAL_DIAGNOSTIC` fresh-session notice, while the current last transfer
  event is COMMITTED_SOURCE_TERMINAL+UNVERIFIED. That Stop is `NO_NEW_EVENT_STOP_PROJECTION`; its one rename
  changes only the projection scalar to VERIFIED and recomputes the accumulator object hash; it preserves the source tombstone, chain/event hashes,
  project bytes and command null. VERIFIED replay cannot mutate or present twice; no triggering task becomes an obligation;
- clean `S(...)` blocks Stop and reinjects only its exact persisted controller command; an unconsumed project
  capability can never disappear behind a successful Stop;
- `MUTATION_COMMITTING`/`COMMIT_CLEANUP_PENDING`/`RECOVERY_REQUIRED` remains BUSY and immutable; durable recovery
  or human-wait diagnostics may Stop;
- only after a successful project commit/cleanup may clean BOUND for SWITCH/NEW, or clean NO_PIN with exact
  committed DEACTIVATE evidence, use the one documented `DEFERRED_BY_PROJECT_CHANGE` boundary Stop, and only
  after its independent COMMITTED_CHANGE project presentation is VERIFIED on that Stop; any other
  NO_PIN+DEFERRED is invalid;
- verified WAITING_HUMAN/WAITING_PLAN_APPROVAL/PLAN_EXECUTION_WAITING_HUMAN/
  PLAN_EXECUTION_WAITING_BOUNDARY/PLAN_EXECUTION_WAITING_DELTA_APPROVAL/
  PLAN_EXECUTION_WAITING_DELTA_BOUNDARY/PLAN_EXECUTION_TRANSFER_READY/
  EXECUTION_WAITING_BOUNDARY allows Stop only while current event equals its `wait_event_id` (TRANSFER_READY's
  wait event is the checkpoint presentation event);
  PROJECT_SCOPE_DRAIN_REQUIRED additionally requires its D/hash/snapshot and no AWAITING_TERMINAL completion
  tombstone;
  a project-only D may Stop only when its independent SCOPE_DRAIN project presentation is byte-verified in the
  same rename; it cannot enter WAITING_CONFIRMATION or be consumed from an UNVERIFIED presentation and does not
  invent a route obligation;
  authentication failure or an unproven terminal marker leaves project state unchanged and grants nothing.

Command strings are formatted only after exact state read-back. Canonical project names are passed through one
audited POSIX shell-quote helper with spaces, quotes and metacharacter tests. No output contains `<missing>`, an
empty tx, a synthesized epoch, or a controller command on failure/replay/busy/terminal paths.

## 9. Project mutation, commit evidence and recovery

### 9.1 Production controller surface

The public production table is exact; every other direct invocation is denied by PreTool/controller guards:

| Entry | Authorization | Effect |
|---|---|---|
| `project.sh switch\|new <target> --session-id --tx --expected-epoch` | exact persisted SWITCH_ONLY capability | common mutation protocol |
| `project.sh deactivate --session-id --tx --expected-epoch` | exact persisted DEACTIVATE capability from newly attested human event | common mutation protocol; persistent NO_PIN, ledger retained |
| `project.sh status <sid>` | read-only strict state parse | no mutation |
| `project-recovery inspect --session-id --tx` | strict read-only state/lease/claim report | no mutation |
| `project-recovery recover --session-id --tx --core-hash ...` | one-shot exact human RECOVER capability | pre-commit recovery only |
| `project-recovery cleanup-committed --session-id --tx --commit-hash ...` | one-shot exact human CLEANUP capability | committed lease/residue cleanup only |
| `project-recovery quarantine-claim --session-id --tx --raw-sha256 ...` | one-shot exact human QUARANTINE capability | no-replace hard-link exact dead/malformed inode to hash quarantine, verify, then unlink canonical; never overwrite/delete unseen bytes |
| `route-receipt classify\|begin-execution\|complete-execution\|finalize-plan --request-b64 ... --request-sha256 ...` | exact current obligation/controller grammar and canonical argv carrier | route-only state transition; no direct project mutation |
| `plan-execution <PUBLIC_PLAN_EXECUTION_VERBS member> --request-b64 ... --request-sha256 ...` where the exact ordered 22-member array is `begin\|issue-preflight\|record-preflight\|issue-phase-tool\|record-work\|issue-main-step\|record-main-step\|complete-main-work\|issue-summary\|complete-summary\|record-quality-gate\|issue-final-quality\|record-final-quality\|record-failure\|complete-phase\|advance-wave\|answer-wait\|request-delta\|finalize-delta\|install-delta\|checkpoint\|finalize` | exact approved-plan/phase capability and same canonical carrier; loader/table/switch discriminator order must equal the manifest array and §5.3 schema | Orchestrator Free Task Mode state transition; project mutation only through a separately issued phase tool capability |
| `plan-transfer claim\|recover --request-b64 ... --request-sha256 ...` | exact per-verb root: presented checkpoint + fresh target event, or journal capability + exact source/target actor event/boundary | one-shot cross-session execution transfer; no project mutation and no source-capability copy |

The plan-execution row is generated from `PUBLIC_PLAN_EXECUTION_VERBS`; it is not editable as an independent
whitelist. Candidate construction compares the manifest, JSON-Schema discriminator set, controller switch,
loader dispatch and generated documentation row for exact ordered-array equality. Removing `record-work`,
`advance-wave` or any other one member, adding a loader-only member, or swapping adjacent documentation/switch
rows fails before activation. Positive vectors cover every member, including local and transferred
`advance-wave`; a deletion mutant is required for each member plus an adjacent-swap mutant.

Remove public `prepare/begin-turn/close-turn/close-switch-turn/inject`, raw `project-pin` state writers, old
`project-lease recover`, and any deactivate path that deletes the state file. Test-only helpers are imports under
hermetic roots, never production CLI verbs. Peer/meta, mixed or hash-mismatched recovery prompts cannot mint a
control capability.

### 9.2 Lock order and mutation protocol

All project/pending mutations use fixed order `global project lease → session lock`, releasing in reverse.
Prompt-only revoke/attest and ledger/cursor/route-only BUSY outer revisions during
`MUTATION_COMMITTING` use the session lock and cannot change the immutable mutation core.

For SWITCH, NEW or DEACTIVATE:

Every freshly issued `S(T,NEW)` already contains immutable
`race_restore_snapshot={schema_version:1,generation,session,issuance_event,issuance_boundary,
project_projection:NO_PIN|TURN_ACTIVE|TURN_CLOSED|BOUND strict-oneOf,epoch_counter,
project_projection_sha256,snapshot_sha256}` and `route_snapshot_kind=ABSENT|PRESENT`, derived by the exact matrix
cell that issued S. `project_projection_sha256=H(LP("new-race-project-projection:v1")||LP(generation)||
LP(session)||LP(project_phase)||LP(canonical-or-empty)||LP(realpath-or-empty)||LP(dev-or-empty)||
LP(ino-or-empty)||LP(binding-epoch-or-empty)||LP(turn-event-or-empty)||LP(turn-boundary-or-empty)||
LP(turn-outcome-or-empty)||LP(committed-result-sha256-or-empty)||LP(decimal epoch_counter))` and
`snapshot_sha256=H(LP("new-race-restore:v1")||LP(project_projection_sha256)||LP(issuance_event)||
LP(issuance_boundary)||LP(route_snapshot_kind))`. The strict oneOf requires exactly the fields of its stable
project arm: NO_PIN forbids binding/turn/commit fields; TURN_ACTIVE/TURN_CLOSED require the full binding and
turn projection plus empty commit scalar; BOUND requires the binding, null turn and the recomputed strict
committed-result SHA from §5.4. No arbitrary JSON serialization participates. A controller-time race never infers an origin from
current links/state; a missing/mismatched snapshot is RECOVERY_REQUIRED.

The generated restore oracle has exactly four rows: NO_PIN restores NO_PIN with no binding/turn;
TURN_ACTIVE restores the exact binding and turn event/boundary; TURN_CLOSED restores the same binding plus its
closed-turn evidence; BOUND restores its exact binding/commit evidence. Every row preserves the snapshotted
epoch and rejects extra fields. Golden vectors cross all legal issuance parent relations with both route arms;
changing only `route_snapshot_kind` must not change any project byte.

1. Acquire the global lease. Its canonical owner file appears only by the no-replace hard-link publication in
   §7.2 after a complete fsynced record exists; owner handle binds pid, process nonce, boot/liveness evidence,
   sid, tx and generation.
2. Under the session lock, re-read exact schema/generation and validate sid, tx, operation, target, epoch,
   binding, route obligation and native authorizing event. Capture three shared-link snapshots, desired values,
   old binding, deterministic staging/parking paths and ownership marker plan. For NEW, re-run the bounded
   complete-registry census while the global lease is held. If an ABSENT target became existing after capability
   issuance, perform no project/link/object side effect. Because the immutable issuance projection was either
   NO_PIN or bound to a different canonical project, a recensus value EXISTING_CURRENT is inconsistent state
   drift and enters RECOVERY_REQUIRED; only EXISTING_OTHER takes this no-change race arm. First consume S and restore exactly the immutable
   `project_projection` in the same session rename, preserving only the latest authenticated prompt ledger and
   admissible route-only outer revision. Then take exactly one presentation arm:
   - with a route obligation/scope-resume snapshot, preserve the exact task/snapshot and stage
     `PRESENTATION_PENDING→WAITING_HUMAN(kind=PROJECT_SWITCH_REQUIRED)` for canonical T;
   - with **no** route obligation, create no route object,
     and stage independent
     `project_presentation(kind=TARGET_BECAME_EXISTING_PROJECT_ONLY,target=T,attempted_op=NEW,
     census_or_empty=EXISTING_OTHER)` whose exact display
     says the project now exists and offers the copyable project-only retry `切换到 <T> 项目`. After that display
     is byte-proved, Stop may end the event; only a fresh authenticated SWITCH may mint a new S.
   Both arms must have byte-identical restored project phase/binding/turn/boundary/epoch; task presence may only
   change route/presentation fields. Then release the global lease and return `projectMutation:null, command:null`. An origin/snapshot mismatch is
   RECOVERY_REQUIRED; it never fabricates task bytes, leaves an impossible NEW capability available, or creates
   a naked Stop-blocking route status.
3. Publish `MUTATION_COMMITTING` with immutable `mutation_core` and its hash; release session lock while keeping
   global lease. Apart from the typed NEW-race resolution above, failure before this rename leaves SWITCH_ONLY
   byte-identical and performs no side effect.
4. For NEW, create only the deterministic staging directory and O_EXCL sid/tx marker. Reacquire session lock,
   verify unchanged core, and append one immutable `owned_object` extension with its own hash and verified
   dev/ino/marker; the original mutation_core never changes. Release the lock **before** target publish.
   A crash-created object lacking that extension is unknown RECOVERY_REQUIRED; recovery never moves it.
5. Validate target and replace each display link using no-replace staging + exact snapshot CAS. After every
   mkdir/marker/publish/link step, run the named fault barrier and exact read-back.
6. Reacquire session lock under the global lease. Re-read the latest outer ledger/cursor/prompt-gate revision,
   verify the immutable core hash, any owned_object extension hash, target identity and all desired side effects. Publish
   `COMMIT_CLEANUP_PENDING` with immutable `committed_result`, exact owner handle/hash, canonical and deterministic
   parked lease paths, tx/op/target, `old_epoch_counter=expected_epoch`,
   `new_epoch_counter=expected_epoch+1`, `lease_cleanup_pending=true`, `last_committed_tx`, final result
   (`BOUND(P)` or `NO_PIN`), and preserved deferred request/route obligation. This rename is the project
   transaction commit point.
7. Release session lock, release the global lease by exact owner-handle read-back and canonical→parked→unlink
   protocol, then reacquire session lock and verify committed evidence unchanged. Only now clear
   `lease_cleanup_pending` and publish clean `BOUND` or
   persistent `NO_PIN`. A cleanup failure leaves COMMIT_CLEANUP_PENDING and never rolls back the commit.

While step 3–7 holds the global lease, a route transition that needs project mutation cannot supersede it.
Attested prompt events may append `REJECTED_BUSY`, or one of the two exact §5.2
`ACCEPTED_ROUTE_ONLY_BUSY` revisions (signal-only/no-project-directive, or combined event whose target/op equals
the immutable core), under the session lock; the transaction must carry only those admissible outer revisions
forward rather than CAS the whole old document. A different-target/op combined event is ledger-only rejection
and cannot supersede an old task. Stop/new-parent cannot overwrite commit evidence.

### 9.3 Failure, undo and durable recovery claim

Before commit, undo restores only a link whose current value equals the recorded old or desired value and parks
only a NEW object with exact marker/dev/ino ownership. Outcomes are limited to:

- unchanged pre-state before `MUTATION_COMMITTING`;
- clean committed result after exact cleanup;
- `RECOVERY_REQUIRED` with immutable intent and no project authorization.

Unknown link/object, ownership drift, undo fault, recovery crash or malformed input always chooses the third.
After COMMIT_CLEANUP_PENDING, binding/result is committed and may never be undone; recovery only finishes exact
lease/residue cleanup using immutable `last_committed_tx` evidence.

Recovery control is a total one-shot protocol, not a replaceable “latest request”.
`capability_id = H(LP("recovery-capability:v1") || LP(generation) || LP(session) || LP(event) || LP(boundary) ||
LP(op) || LP(tx) || LP(exact_hash_bundle_sha256) || LP(decimal attempt_seq))`. The recovery ledger retains every
nonterminal attempt and the bounded terminal tail; compacted terminal prefixes remain bound by the §8.2
checkpoint chain and monotonic cursor/attempt sequence. Before applying this table, an exact native-event replay is always
rejected and a different op/tx/hash bundle is `RECOVERY_CONTROL_MISMATCH` with no capability/core change.

| Current control | Persisted attempt authority | Newly attested exact-same human control / controller action |
|---|---|---|
| absent | no attempt | human event appends ISSUED attempt 1; no controller action exists before read-back |
| ISSUED | no controller owner yet | a distinct same human request appends `RECOVERY_REISSUED_UNUSED`, invalidates the old event-bound capability, increments attempt_seq and publishes a fresh ISSUED capability; only the current capability's exact first controller invocation may CAS ISSUED→IN_PROGRESS while atomically storing invocation ID plus claim/recovery-global owner tuples |
| IN_PROGRESS | exact-live controller and exact-live claim/recovery-global tuple | only that same native controller invocation may idempotently resume; any new human control appends `REJECTED_BUSY` and cannot replace/rebind it |
| IN_PROGRESS | controller proven dead and every recorded claim/global owner proven dead or absent | one distinct newly attested exact-same human control appends `RECOVERY_REAUTHORIZED`, increments attempt_seq, invalidates the old capability, preserves its dead-attempt audit and publishes a new ISSUED capability; no side effect occurs in this rename |
| IN_PROGRESS | recovery-claim malformed/mismatched/liveness-unprovable | no retry or reauthorization; only the exact separately attested QUARANTINE_CLAIM hash capability may isolate that claim inode, after which a fresh human recovery control is required |
| IN_PROGRESS | session/global/activation/invocation owner malformed/mismatched/liveness-unprovable | `BLOCKED_OFFLINE_LOCK_QUARANTINE`; no capability, mutation or command; this plan cannot continue until a separate human maintenance action changes external state |
| CONSUMED | committed terminal evidence | any same request appends `RECOVERY_ALREADY_CONSUMED`, grants nothing and retains ROTATION_REQUIRED/new-sid requirement |

An ISSUED capability has no process authority merely by existing. An IN_PROGRESS controller retry must match its
persisted native invocation ID and exact live owners; a new process using the same argv is not that retry. A
reauthorization never overwrites an in-flight/live attempt and never treats an old dead lock as the new lock.
Any claim/global owner already present before an ISSUED→IN_PROGRESS CAS is inconsistent residue: exact-live is
BUSY; exact-dead/malformed/unprovable must follow its quarantine row, and the CAS cannot adopt it.
Generated tests cross every row with claim `absent|live|dead|malformed|unprovable`, same/different event and
same/different op/hash, with missing cells mechanically invalid.

Recovery claims live at a stable, digest-keyed path under the real framework control directory, not inside a
lease that may already have moved. The strict document contains:

```text
schema_version: 1
claim_id / claim_generation / runtime_generation_id / session_id / tx / operation
state_raw_sha256 / mutation_core_sha256 / stale_lease_owner_handle_sha256?
recoverer: {pid, os_process_start_fingerprint, process_nonce, boot_id}
created_at / status: CLAIMED
```

All claim writers first hold the digest-keyed recovery-claim lease. Its owner is subject to the generic complete
owner/liveness/CAS rule in §7.2. No canonical empty file is exposed. Temp names include the claim-lease owner
nonce and attempt nonce; the directory is scanned with cap+1 (64). The state census is total by this fixed
precedence—first matching rule wins, so there is no implicit `{current,next,temp}` default:

| Priority | Census | Action |
|---:|---|---|
| 1 | cap+1, malformed slot, unknown name, multiple distinct valid owner tuples, liveness-unprovable record, or valid current/next with different inode/hash/owner | no automatic mutation; exact-hash human quarantine required |
| 2 | any exact live current/next owner or live temp not owned by the current claim-lease attempt | BUSY; touch nothing |
| 3 | current and next are the same exact valid inode/hash/owner | current is authoritative; if owner is proven dead, quarantine/unlink next then isolate current for takeover; if live, rule 2 |
| 4 | current absent; next exact proven-dead; remaining temps absent or attributable to that dead owner | hard-link next to an absent hash quarantine, verify, unlink next, quarantine attributable temps, fsync, restart |
| 5 | current exact proven-dead; next absent; remaining temps absent or attributable to that dead owner | first hard-link current to an absent hash quarantine, verify, unlink canonical current and fsync; quarantine attributable temps; restart with generation+1 |
| 6 | current/next absent; only exact proven-dead attributable temps | quarantine those temps, fsync, restart |
| 7 | current/next absent; temps absent or only the current live attempt | current attempt may publish |

This explicitly covers malformed-current/absent-next, absent-current/malformed-next, both-valid-different,
same-inode dual-name, every live/dead temp combination and the empty state. A crash-left temp is never authority.
Only after proving its exact owner dead may a lease holder quarantine that inode; foreign/malformed temp requires
the human exact-hash capability and is never deleted.

The newly published recovery-global owner is a separate live owner record containing the claim ID, tx and core
hash. Under `recovery-global→session`, recovery atomically CASes the one-shot recovery control to IN_PROGRESS and
stores that fresh owner inode/hash; no side effect is allowed before both records read back consistently.

Publication is no-replace throughout: create owned temp O_EXCL; complete write+file fsync; hard-link to absent
`claim.next` (`EEXIST` loses); unlink owned temp and fsync parent; hard-link that exact next inode to absent
`claim.current` (`EEXIST` loses); fsync/read back current inode/hash/generation; then unlink the same next inode
and fsync. The successful `link(next,current)` is linearization and can never overwrite a raced current. Takeover
never renames over an old current: rule 5 first isolates the exact dead tuple and makes current absent, then a
new generation uses the same no-replace publication. A crash after current-link but before next-unlink yields
the legal same-inode dual-name in rule 3. Before **every** recovery side effect, the coordinator re-reads current
claim inode/hash/generation, its claim-lease ownership, the fresh live recovery-global owner bound to that
claim/core, and immutable state core; drift returns RECOVERY_REQUIRED. The claim alone and every old dead owner
serialize nothing.

Committed cleanup recovery classifies the recorded lease residue before acting:

1. canonical lease exists with the exact owner handle → a live owner returns BUSY; an exact proven-dead owner
   is isolated under the claim, then recovery acquires and binds a fresh recovery-global lease before cleanup;
2. canonical and exact parked path both exist as the same inode/hash/owner → this is the legal release crash
   after park-link/before canonical-unlink; prove the owner dead, isolate canonical, acquire a fresh
   recovery-global lease, then continue exact parked cleanup;
3. canonical is absent and the exact recorded parked residue exists → acquire a fresh recovery-global lease,
   validate owner/inode/hash and finish only that parked cleanup;
4. canonical and parked residue are both absent → acquire a fresh recovery-global lease, verify committed result
   and side effects, then only finalize the session state.

Both paths present with different inode/hash/owner, a different canonical owner, mismatch, or any extra residue is unknown state and remains
RECOVERY_REQUIRED. A committed result is never undone. Claim temp/write/fsync/link-next/link-current/unlink/read-back, dead
takeover, canonical/parked/neither, quarantine, two-recoverer race, and every recovery side effect have named
fault barriers.

### 9.4 Deactivate and SessionStart

DEACTIVATE uses the same `MUTATION_COMMITTING`/commit/cleanup protocol. Its committed result is a persistent v3 `NO_PIN`
that preserves ledger, transcript cursor, route history and `last_committed_tx`; it never removes the session
document. Old human/Codex events therefore remain non-replayable.

Under v3, `session-restore` never clears the shared display-link tuple automatically, including
`SESSION_RESTORE_ALWAYS_CLEAR`; explicit authenticated deactivate is the only clearing path. Display links are
non-authoritative and may remain cosmetic. Startup project content is read only when the exact session state is
clean `TURN_ACTIVE` with an attested current event. NO_PIN, BOUND, TURN_CLOSED, SWITCH_ONLY,
MUTATION_COMMITTING, COMMIT_CLEANUP_PENDING, RECOVERY_REQUIRED, either AUTH_BLOCKED/ROTATION_REQUIRED prompt
phase, v2 and malformed states read no downstream
workflow/progress/context content and emit a bounded diagnostic only.

## 10. Generation-fenced bridge, activation and rollback

### 10.1 Two-stage byte-parity bridge

Current registrations execute live worktree files and their PreTool matchers are not broad/fail-closed enough
for the v3 obligation gate, so framework-v3 may not be landed by replacing files piecemeal. After the exact-plan
handshake, build the following linear framework objects; names here are roles, while exact commit/tree IDs are
frozen before their named reviews:

1. `B1=BRIDGE-G0-ASSETS`, whose parent is the exact audit-only `A0`, adds an immutable baseline release whose
   `payload/` preserves the repository-relative `.claude/hooks`, `.codex` and `scripts` topology, plus a strict
   dispatcher/activator/trust controller and tests. **Before B1 is frozen**, that external activator already
   implements the complete §10.3 forward tuple, every rollback prefix, HELPER_DISABLED 0500→000 and
   ROLLBACK_HELPER_READY 000→0500→trust-inverse→000 transitions, journal recovery and all named chmod/crash
   barriers; the bridge review executes those faults against the exact activator blob;
   it changes no registered entry path. Its manifest proves every baseline entry and transitive import is the
   exact reviewed old behavior after only the closed source→payload transformations in §10.2; “copying a file”
   never implies that `import.meta.url` still denotes the checkout root.
2. After exact `B1` is landed and a G0 pointer is initialized/read back, `B2=BRIDGE-G0-SHIMS`, whose parent is
   exact `B1`, replaces only each currently referenced hook/controller entry with a tiny stable logical-name
   shim. The live Codex adapter shim performs no tool alias, payload parsing or output adaptation; those
   generation-specific rules move into `payload/.codex/codex-hook-adapter.mjs`. Hook configuration is still byte-identical. Old direct entry or new shim may run during this checkout,
   but both must produce byte-identical output and state for the complete old fixture union. No shared live
   implementation changes.
3. The v3 implementation is `V1`, whose parent is exact `B2`; it adds the inert immutable v3 release and its
   tests while the active pointer remains G0. `C1=BRIDGE-HOOK-CONFIG` is created **only after V1 is frozen** and
   has exact `V1` as its parent. It changes both hook configs to the stable dispatcher, fail-closed exit-2
   propagation, a PreTool matcher proven to observe every local mutation-capable/unknown tool, and a PostTool
   matcher proven to observe registered Agent results plus every tool class used as execution evidence. C1
   contains no V1 source rebuild. Both V1 and C1 remain unlanded until the fenced
   maintenance cutover because V1 also contains agent/governance registration that is not inert to a fresh
   session even while the hook pointer is G0.

V1 and C1 may not modify, replace or regenerate any B2 bootstrap-TCB path or blob: external activator, stable
dispatcher/shims, strict trust controller, bounded IO/release verifier, probe relay or activation schemas.
Their manifests reference those exact B2 blob SHAs. Any required change to a bootstrap blob invalidates B1/B2
and returns to bridge construction/review; it cannot be smuggled into V1.

The B1/B2 commits/trees, G0 manifest and exhaustive parity receipt are reviewed before landing. G0 assets/shims
may land under parity. V1 and its child C1 are reviewed as exact objects after the full v3 verification. Hook-
config cutover requires a declared maintenance gate: all Claude/Codex sessions must be closed; an already-loaded,
hash-verified external copy of the B2 activator prepares and read-backs the activation-only executable records
defined below, publishes the fence, inhibits every normal harness consumer and proves no hook process or
non-self lock remains. It then verifies `C1.parent=V1` and `V1.parent=B2`, fast-forwards exact B2→C1 through the
closed Git TCB, runs the reviewed trust controller through the private Codex app-server helper against the now
live C1 config, verifies the registered hook list, points to v3, probes, disables the helper, restores the normal
consumer modes and only then unfences. This is the sole forward order. The current
broad `scripts/codex-trust-hooks.mjs` is never called by this activation path. A trust failure before pointer
publication keeps G0. A probe or later failure invokes the sole inverse order under the fence: pointer→G0,
exact C1→B2 repository/index/ref/worktree restore, exact helper→0500 when trust changed, trust inverse against
the restored B2 config, G0 probe, helper→000, normal-mode restore. If
that rollback is incomplete, the fence stays in `ACTIVATION_RECOVERY_REQUIRED` over the mechanically known
intermediate pointer/HEAD state and admits no session.

The strict trust controller accepts only the C1 repo key and exact `hooks/list` item IDs/currentHash→newHash
pairs frozen in the journal; a missing item, extra adapter-substring match, duplicate, hash drift or unknown key
fails before mutation. It snapshots the exact relevant user-config records plus raw file dev/ino/hash, applies
one CAS `config/batchWrite`, and read-backs the exact target set. The journal records PRE_TRUST/APPLIED/VERIFIED
and an exact inverse CAS. Any later activation failure retains that inverse as non-executed recovery evidence,
then follows the sole rollback order above: pointer→G0, exact repository/index/ref/worktree→B2, and only then
runs the exact helper-ready→trust-inverse→helper-disabled sequence against the restored B2 config. Intervening drift or rollback failure leaves the fence
and `ACTIVATION_RECOVERY_REQUIRED` in place. It never
prints a manual trust fallback and never trusts all commands matching a regex.
If either native harness cannot expose a PreTool event for a local-mutation channel, KILL-06 fires. Stable B2
shims remain the rollback floor, but a post-cutover emergency rollback is **not pointer-only**. Under the same
fence/locks, with every transaction resolved and normal consumers inhibited, the external B2 activator must
point to G0, restore the complete C1→B2 tracked path/index/worktree bytes from reviewed objects, CAS the branch
ref from exact C1 to exact B2, verify HEAD/index/worktree tree=B2 while every unrelated dirty-path hash is
unchanged, apply the exact trust inverse through the private helper against B2, then run the G0 probe before
restoring modes/unfencing. It uses literal reviewed pathsets and Git object IDs, never reset,
clean, stash, merge or a broad checkout. Any config/AGENTS/CLAUDE/Plan-wrapper/path/ref drift leaves the fence in
`ACTIVATION_RECOVERY_REQUIRED`; there is no partial “runtime G0 + V1 governance” success state.

### 10.2 Immutable release and pointer contract

Release layout is `.claude/hook-releases/<generation>/`. A release is exactly one `manifest.json` plus the
regular files named by `manifest.entries`; the manifest never lists or hashes itself and is bound only by the
active pointer/journal `manifest_sha256`. Executable payload lives below `payload/`; G0 places
the security-relevant hook/import/controller files in their original repository-relative topology so relative
imports resolve, but source-location-derived checkout roots are explicitly rebased. The independent
`scripts/test-runtime-bridge.mjs` transformation verifier accepts only these source→payload differences and
emits the source/transformed hash receipt:

1. route-guard policy-root reads are redirected to the bundled routing-map/rules snapshot;
2. `.codex/codex-hook-adapter.mjs` checkout `REPO_ROOT`, `.claude/hooks/lib/memroot.mjs`
   `SCRIPT_REPO_ROOT`, `scripts/project-pin.mjs` `REPO_ROOT`, and `scripts/project.sh` `PROJECT_ROOT` are replaced
   by the canonical ancestor derived from their exact
   `<repo>/.claude/hook-releases/<manifest-generation>/payload/<repository-relative-path>` location. The replacement
   expressions are exactly five parent traversals from the adapter/project-pin/project.sh containing directory
   and seven from memroot's `lib` directory. They validate every literal intervening segment, generation, the
   runtime-selected manifest (active pointer during normal dispatch; exact IN_FLIGHT journal target during the
   one-shot probe) and canonical repo `.git` identity before returning the root; environment, argv,
   cwd and caller JSON cannot supply or override it. The adapter uses that validated checkout root for `inRepo`,
   patch paths, `CLAUDE_PROJECT_DIR` and child cwd while executing the manifest payload target.

Every other token must be byte-identical to its frozen source; diffs outside the declared root/policy
expressions reject B1. The same validated root contract is native in v3. Real-release-path parity fixtures cover
the Chinese checkout path, case/symlink normalization, fake root environment, a copied payload outside the
release hierarchy, adapter `inRepo`, memroot fallback, project CLI state paths and controller cwd. A strict manifest lists every bundled regular
entry and transitive security-relevant import/controller with relative path, logical entry name, mode, byte
size and SHA256; symlinks, extra files, unknown keys, more than 512 files or more than 16 MiB aggregate bytes
reject the release. Stable dispatch verifies every entry and rejects any extra payload file no-follow before load and maps a closed
logical-name enum to one payload entry.

The generation bundles every **generation-specific** file that can supply project, prompt, route,
Plan-condition, Codex alias/adaptation or generation authority, including routing policy and the normalized Plan
Agent, Orchestrator and agent/skill execution contracts. A receipt binds those manifest
member hashes, never a live policy path. Live project/profile/observability/memory data and ordinary baseline ancillary
`python3`/Git governance subprocesses are
explicit external runtime dependencies, not bundled-code claims. They may affect only their pre-existing
display, memory or diagnostic behavior and never relax/select project, prompt, route or generation authority.
Live observability rules may add non-authorizing context only after the manifest decision. B1 deliberately uses
the current worktree bytes of `.claude/observability/rules.yaml` as the runtime-parity snapshot; its source
receipt records `provenance=WORKTREE_RUNTIME` plus raw HEAD/index/worktree SHA, dev/ino/size and proves the
original dirty path was neither staged nor edited. Every other G0 source is named with its own provenance and
must match its declared HEAD or worktree hash. Source drift before B1 or any undeclared provenance is KILL-04.
The G0
parity suite freezes their fixture inputs and proves their failure cannot broaden authorization; the v3
security path fails closed before consulting them. Apart from the literal activation/trust bootstrap TCB below,
the only external executable roles are `NODE_RUNTIME`, `CODEX_APP_SERVER_HELPER`, `GIT_ACTIVATION`, `PS`,
`SYSCTL` and `LSOF`. Each activation journal entry binds
`{role,realpath,dev,ino,mode,size,sha256,allowed_argv_templates,exact_env,cwd,stdin_cap,stdout_cap,stderr_cap,
allowed_exit_codes}`; any path/inode/hash/argv/env/output drift is fatal. PS/SYSCTL/LSOF retain their fixed
read-only liveness grammars. NODE_RUNTIME is the already-running exact activator/probe runtime only.

Pre-review does **not** claim the future private helper's `realpath/dev/ino`. `CANDIDATE-OBJECTS.json` freezes
only the source Codex executable record, expected copied bytes/SHA256/mode, the no-follow copy+fsync+chmod
construction algorithm, the literal activation-path template and the bounded JSON-RPC protocol; any predicted,
dry-run or placeholder helper inode in that candidate is invalid. After NODE_RUNTIME creates and reads back the
private file under the live activation ID, the activation journal must freeze its actual
`{realpath,dev,ino,mode,size,sha256}` before the first parity dry run or trust mutation. Every later helper open,
chmod, spawn, inverse and cleanup is fd-bound to that journaled identity. `ACTIVATION-ROLLBACK-RECEIPT.json` and
both postactivation reviewers attest the actual journal identity against the pre-reviewed source/bytes/mode/
construction/protocol contract; an inode observed before activation cannot satisfy that review.

Before the fence, NODE_RUNTIME copies the L0-frozen Codex executable through no-follow descriptors to a private
real `.claude/.runtime/activation-tools/<activation-id>/codex-app-server` inode, fsyncs file+parent, sets and
read-backs mode 0500 and byte identity, and proves in an isolated dry run that `<helper> app-server` produces
the same bounded hooks/list identity as the source. This helper path is absent from hook config, PATH and every
normal launcher census; only the exact activation-owner PID may spawn it, with absolute argv `app-server`, fixed
minimal env/cwd and a versioned bounded JSON-RPC stream
`initialize→hooks/list→config/batchWrite→hooks/list`. Duplicate/extra/out-of-order IDs, unknown fields,
truncation, timeout, stderr, unlisted exit or a child surviving its PID/start-token join fails. The helper is a
separate inode so normal Codex launch remains non-executable throughout cutover/rollback; it is chmod 000 and
read back before normal modes are restored. Its closed mode machine is `ABSENT→0500→000`; rollback while the
trust state is APPLIED/VERIFIED alone may take the journaled exact same inode `000→0500` under fence+normal
inhibition, run the inverse, then `0500→000` before normal modes return. Each fd-bound chmod is file+parent
fsynced and dev/ino/mode/SHA read back; no path replacement, other owner or other transition is legal. If
copying, private execution or identity parity is unavailable, KILL-10 fires—there is no live-binary fallback.

GIT_ACTIVATION is one L0-frozen absolute Git binary invoked with system/global hooks, filters, attributes,
external diff, signing and user config disabled by fixed environment/options. It accepts only the journal's
repo, B2/V1/C1 commit/tree/blob IDs and literal tracked pathset. Node publishes each exact worktree preimage from
bounded `cat-file blob` output, verifies C1/B2 postimages, applies only literal `update-index --cacheinfo` entries,
requires `write-tree` to equal the frozen target tree, then performs one `update-ref <ref> <new> <old>` CAS.
Rollback is the exact inverse. Shell, checkout/reset/clean/stash/merge, pathspec globbing and any unrelated path
are forbidden; unrelated dirty path dev/ino/size/hash tuples must remain byte-identical at every barrier.

The only generation-external bootstrap TCB is the following literal set from §12:
`.claude/runtime-dispatch.mjs`, `.claude/runtime-io.mjs`, the six live `.claude/hooks/*.mjs` logical-entry
shims, `.codex/codex-hook-adapter.mjs`, `scripts/runtime-activate.mjs`,
`scripts/runtime-trust-hooks.mjs`, and the live loader shims
`scripts/project.sh`, `scripts/project-pin.mjs`, `scripts/project-lease.mjs`,
`scripts/check-project-links.mjs`, `scripts/project-recovery.mjs`, `scripts/route-receipt.mjs`,
`scripts/plan-execution.mjs`, `scripts/plan-transfer.mjs`, plus the two hook configs, two registered Plan Agent wrapper files and the
non-registered Orchestrator behavior-contract file. Loader shims may only cap/read stdin, select a
config-supplied closed logical name, verify pointer+manifest, relay bytes and preserve the manifest-declared exit
contract; they contain no alias, intent, tool-class or authorization policy. The activation-only external
executable records above are part of this closed TCB even though their bytes are not manifest entries; their
only authority is the fixed journal grammar just stated. Plan wrappers are exact thin
registrations whose tool/model/sandbox envelope and normalized instruction SHA must equal their manifest member.
B2/V1/C1 tree/blob SHAs, activator/trust-controller blobs, and config/registration blob SHAs are bound in the activation journal and
`CANDIDATE-OBJECTS.json`, and bridge parity tests cover every input/output/alias/exit case. T-ACTIVATE's “no
undeclared executable” claim excludes only this literal bootstrap TCB plus the six journal-bound external roles; any other policy-bearing executable is
forbidden.

This bootstrap TCB is not “policy-free”; its policy is a closed whitelist. Runtime dispatch/IO may enforce only
bounded no-follow IO, logical-entry mapping, pointer/manifest verification, normal fence denial and the exact
one-shot probe check. The activator may enforce only reviewed commit/tree ancestry, owner/lock/fence/journal/
pointer/probe transitions. The trust controller may enforce only the exact repo key, frozen item/currentHash CAS,
read-back and inverse. Hook configs may contain only the reviewed event matchers, exact shim commands, timeouts
and fail-closed exit mapping. Plan wrappers may contain only the manifest-matched identity/tool/model-tier/
sandbox/instruction envelope. Controller loaders may only verify and relay as stated above. Every such decision
and literal is bound to its B2/V1/C1 blob and journal; alias, task, project, route, tool-class or execution-policy
selection anywhere else in the bootstrap TCB is forbidden.

G0's manifest also freezes the two harnesses' legacy matcher and non-security error-propagation tables. After
C1 installs the broader v3 registrations, the stable dispatcher under a G0 pointer filters an extra event to
the exact old no-hook behavior and reproduces the old exit policy for a never-v3 session; it does not feed an
unknown tool into an old guard. This compatibility is selected by the immutable invocation entry (Claude shim
or Codex adapter shim), never an environment claim. A schema-v3 state is always denied under G0. The rollback
suite must prove both `C1 config + G0 pointer + fresh legacy sid` parity and `C1 config + G0 pointer + v3 sid`
deny before G0 can be called an emergency rollback.

Mutable control state is under the real, non-symlink `.claude/.runtime/` directory. `active-release.json`
contains only `{schema_version,generation,manifest_sha256}` and is published by same-directory temp, complete
write, file fsync, rename, parent fsync and exact read-back. Session state, invocation lease, transaction,
recovery claim and route receipt bind the generation. Unknown or mismatched generation fails closed; G0 may
never interpret a v3 state even after rollback.

### 10.3 Invocation fence and atomic activation

The invocation fence is necessary but not sufficient because a native CLI may cache B2 hook configuration
before its first shim call. Activation is therefore an offline consumer cutover with mechanical launch
inhibition, not an online hot swap. L0 freezes every supported Claude, Codex and Luca-launcher executable
realpath/dev/ino/mode/SHA discovered from the shell PATH, app bundle launch configuration and live-process
census. The activator journals those exact records, removes every execute bit from every listed inode with
no-follow fd-based chmod, fsyncs/read-backs mode+inode, and rejects any new/alternate executable alias or inode.
It then uses PID/start-token plus frozen `/usr/bin/lsof -Fn -p <pid>` executable-path evidence to prove that no
process which could have consumed B2 Claude/Codex hook config remains. `/usr/bin/lsof` is added to the same
fixed-argv/hash/output-grammar oracle as ps/sysctl; ambiguity is UNPROVABLE. The user closes processes; the
activator never kills or steals them. After inhibition it performs two complete ps→lsof censuses with identical
zero-consumer results separated by a journal fsync/read-back; because all admitted executable inodes are
non-executable, the second pass closes the scan race. If mode removal, exhaustive census or stable zero-consumer read-back
cannot be proved, it restores exact modes under the journal, leaves B2/G0 active and fires KILL-10.

While normal execute bits are absent, no new native consumer can cross the config-read boundary. Repository and
trust mutations occur only after inhibition; the private helper is the sole executable Codex inode and is not a
normal launch path. Normal execute modes are restored exactly only after C1 config, trust, pointer and probes are
read back while the fence is still present; a newly started process thereafter can cache only C1 and remains
blocked by the fence until commit. Crash recovery
replays only the journal's exact inode/mode records, never a pathname guess. Rollback repeats the same
inhibit→zero-consumer→config/pointer restore→mode restore sequence. This cooperative-local-account contract
does not defend against the same user replacing a disabled inode, but replacement drift is detected and never
authorized. A paused process that cached B2 config and later attempts SessionStart/Agent/unknown mutation after
cutover is the blocking fixture and must prevent cutover, not merely receive a shim-time deny.

Every normal shim invocation follows this order: read fence epoch; publish a complete fsynced per-invocation
lease; re-read fence and pointer; deny and remove its lease if a fence exists or either value changed; otherwise
verify and run exactly one release, retaining the lease until output/state publication completes. This closes
the read-before-fence/create-after-scan race.

The sole fence exception is an activator-owned, one-shot probe capability. Before CUTOVER_PREPARED, the Node activator
creates one private parent→child channel per frozen logical entry and keeps a 32-byte random secret only in its
memory. It launches the shim with the frozen `child_process.spawn` stdio vector: descriptors 0–2 have their exact
reviewed values, 3–8 and >9 are `ignore`, and only stdio index 9 is the dedicated `pipe` channel. The parent
retains only that entry's writable endpoint, writes exactly 32 bytes and ends it. The shim fstats FD 9 against the
L0-frozen platform pipe/socket type+inode, reads exactly 32 bytes followed by EOF, then closes FD 9 **before**
loading the payload. Node's non-child channel handles remain close-on-exec/non-inherited; no grandchild or payload
inherits the descriptor. If current Node/macOS cannot prove this exact inheritance in the bridge probe, activation
architecture fails rather than substituting argv/environment or an extra helper binary.
The journal stores
`{fence_epoch,activation_owner_hash,global_owner_hash,target_manifest_sha256,logical_entry,channel_type,channel_dev,channel_ino,
probe_fd:9,secret_length:32,secret_sha256,status:ISSUED}`. While still holding the exact activation lock, the activator CASes one entry
ISSUED→IN_FLIGHT, launches the exact command bytes from the reviewed C1 config through the normal live shim, and
passes the secret only over that inherited pipe. The dispatcher admits the target release under the fence only
when the pipe fstat, secret hash, parent pid/start token, owner tuples, logical entry, fence and active pointer all
match the one IN_FLIGHT record. Raw stdin, argv or environment can never supply it. On exact output/exit read-back
the activator records CONSUMED and closes both endpoints; reuse denies. Crash or mismatch while IN_FLIGHT is
indeterminate and forces journal-driven trust/repository/pointer rollback under the still-active fence, never a
retry with the same capability.

Wrong/missing FD, wrong frozen pipe/socket inode type, short/long secret, missing EOF, leaked duplicate descriptor, wrong child-parent
process token and post-close reuse are blocking negatives with crash barriers at pipe/create/dup/write/read/EOF/
close/exec.

The activator:

1. stages and read-only verifies the exact reviewed release/manifest plus source
   NODE/GIT/Codex/PS/SYSCTL/LSOF records;
2. acquires the activation lock and global project lease, read-backs their exact owner tuples, creates/read-backs
   the private helper, and fsyncs `HELPER_PREPARED`; failure chmods any owned helper to 000 and retains the
   journal for exact recovery rather than deleting an unknown inode;
3. atomically publishes an activation fence and, before any repo/trust/normal-mode mutation, fsyncs
   `FENCED_PREPARED` with exact trust/config/repo/index/ref/pointer, helper and consumer inode/mode preimages plus
   the sole inverse action for each next state;
4. journals the complete consumer-executable census, removes all **normal** listed execute bits by exact inode,
   waits for pre-fence invocation leases to drain and proves
   there is no live pre-C1 config consumer,
   session/global/recovery lock
   other than its own exact activation/global tuples, old-generation TURN_ACTIVE/SWITCH_ONLY session, or
   MUTATION_COMMITTING/COMMIT_CLEANUP_PENDING/RECOVERY_REQUIRED transaction, then fsyncs `HOST_INHIBITED`;
5. through GIT_ACTIVATION, publishes and verifies the literal C1 worktree/index tree, fsyncs
   `REPO_INDEX_C1`, CASes B2→C1 and fsyncs `REPO_REF_C1`;
6. through CODEX_APP_SERVER_HELPER, applies the exact C1 trust CAS and native hooks/list read-back, proves the
   child exited, then fsyncs `CODEX_TRUST_VERIFIED`;
7. creates anonymous probe pipes and publishes
   `CUTOVER_PREPARED{from,to,manifest hashes,trust CAS,probe capability hashes}`, performs exactly one
   G0→g3 active-pointer rename/read-back and fsyncs `POINTER_G3`;
8. consumes every one-shot capability through the exact C1 config→live shim→target payload path while the
   fence remains;
9. fsyncs `SHIM_PROBES_PASSED`, chmods/read-backs the private helper to 000 and fsyncs the distinct
   `HELPER_DISABLED` tuple; only then restores and read-backs every exact normal consumer executable mode while
   the fence still exists, fsyncs `MODES_RESTORED`, marks the journal
   COMMITTED, destroys all probe pipe endpoints/secrets, removes the fence exactly, and releases locks.

Helper-mode publication has a total crash oracle, not a label-only assumption. At the forward barrier,
SHIM_PROBES_PASSED+exact 0500 repeats the fd-bound disable, while SHIM_PROBES_PASSED+exact 000 publishes/adopts
HELPER_DISABLED; any other inode/mode/hash is recovery-required. On rollback, ROLLBACK_REPO_B2+exact 000 performs
the reviewed re-enable, while the same state+exact 0500 publishes/adopts ROLLBACK_HELPER_READY; after the G0
probe, exact 0500 performs disable and exact 000 publishes/adopts ROLLBACK_HELPER_DISABLED. Thus a crash on
either side of chmod/fsync/state rename has one idempotent continuation and never requires an unavailable
executable or a path guess.

Every durable activation state has exactly one tuple
`{trust_state,helper_mode,normal_consumer_modes,repo_worktree_tree,repo_index_tree,repo_ref,pointer,
probe_set_state,fence_epoch}` and one legal successor. There is no prose-permitted alternate order. Rollback from
any state first enters `ROLLBACK_FENCED→ROLLBACK_HOST_INHIBITED`, re-establishing/read-backing the fence and
normal inhibition, then follows exactly
`ROLLBACK_POINTER_G0; ROLLBACK_REPO_B2; ROLLBACK_HELPER_READY; ROLLBACK_TRUST_INVERTED;
ROLLBACK_G0_PROBED; ROLLBACK_HELPER_DISABLED; ROLLBACK_MODES_RESTORED; ROLLED_BACK; UNFENCED`.
`ROLLBACK_HELPER_READY` changes the exact journaled helper 000→0500 only when trust is APPLIED/VERIFIED; when
trust is unchanged it records NOT_REQUIRED after verifying the B2 trust preimage and never launches the helper.
After the inverse and G0 probe, ROLLBACK_HELPER_DISABLED always reads back 000 before normal modes return. An
unavailable helper or failed CAS/read-back stays
ACTIVATION_RECOVERY_REQUIRED; no step is reordered to make progress.

The maintenance journal additionally binds exact repository `from_commit=B2`, intermediate `V1`,
`to_commit=C1`, all three trees, every literal B2 bootstrap-TCB blob including the strict trust controller,
both V1 Plan-registration blobs, the V1 Orchestrator behavior contract, normalized Plan-condition/result/
approved-execution/skill-execution policy and controller blobs, both C1 config blob IDs, the exact trust
item/currentHash transition and its
inverse, the literal C1→B2 rollback pathset with every B2 preimage `{blob,mode}` or explicit `ABSENT` tombstone,
the expected C1 index/worktree
hashes, the CAS ref old/new values, and every probe-capability hash. Repository fast-forward to the exact descendant C1 and trust occur while the
fence and self-owned locks remain held, before the pointer rename; neither a sibling commit nor a rebuilt tree
is accepted. Any failure keeps the old pointer or uses the journal to atomically restore it; no invocation can
load a mixed bundle. Rollback uses the single inverse tuple/order above; it first resolves all transactions and
never applies trust/repository/pointer restoration in another order. It loads
the real B2 AGENTS/CLAUDE/Plan-registration/Orchestrator/policy/config bytes in its parity proof, retains every v3 state and ledger,
and requires new session IDs. It never deletes state to make old behavior accept it. If any restore/CAS/probe
step fails, the fence remains and no old or new session starts.
`CANDIDATE-OBJECTS.json`, the bridge review and the maintenance journal all bind the same B2 activator blob SHA
and the same complete HELPER_DISABLED fault-receipt SHA. Runtime refuses a V1/C1 copy, a content-equivalent
rebuild or any B2 activator lacking that receipt; no activation-state behavior is first implemented after B2 is
frozen.
Every repository/trust snapshot/CAS/read-back/inverse, probe issue/consume/close, fence/journal/pointer crash
boundary, consumer mode removal/restoration and process-census race is tested.

## 11. Schema transition, startup and threat boundary

Schema-v3 is a hard boundary. Legacy v2 state/history and every legacy text pin are read-only diagnostics under
the same sid: they may be hash-quarantined for display, but never migrated to an empty ledger. A new sid and new
attested human event are required to bind again. Old/G0 readers and the stable dispatcher must reject v3
fixtures; v3 readers reject old fixtures.

`session-restore` is mandatory scope and read-only. Only clean TURN_ACTIVE + ATTESTED + matching generation may
load project context. All other project/prompt phases, legacy state and malformed input load no downstream
context. Startup automatic display-link clear, including `SESSION_RESTORE_ALWAYS_CLEAR`, is removed; display
repair/deactivate requires a fresh human capability and the common transaction.

Security claims are limited to a cooperative local account: durable native records, no-follow IO and capability
checks prevent accidental/direct hook stdin from minting authority without a current native human delivery.
They do not claim resistance to an adversary who can arbitrarily rewrite the user's transcript, repository and
state files as the same OS user. Parser-choice environment variables are never authorization evidence.

## 12. Exact change envelope and dirty-worktree policy

### 12.1 Framework bridge envelope

Generation names are frozen as `g0-baseline-20260820` and `g3-routing-steering-20260820`. The exact bridge path
set, relative to the framework root, is:

```text
.claude/runtime-dispatch.mjs
.claude/runtime-io.mjs
.claude/hook-releases/g0-baseline-20260820/manifest.json
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/route-guard.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/project-scope-guard.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/post-edit.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/session-sync.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/session-restore.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/session-end.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/lib/harness.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/lib/memroot.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/lib/git-env.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/lib/project-substrate.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.codex/codex-hook-adapter.mjs
.claude/hook-releases/g0-baseline-20260820/payload/.claude/skill-os/skill-routing-map.yaml
.claude/hook-releases/g0-baseline-20260820/payload/.claude/observability/rules.yaml
.claude/hook-releases/g0-baseline-20260820/payload/scripts/project.sh
.claude/hook-releases/g0-baseline-20260820/payload/scripts/project-pin.mjs
.claude/hook-releases/g0-baseline-20260820/payload/scripts/project-lease.mjs
.claude/hook-releases/g0-baseline-20260820/payload/scripts/check-project-links.mjs
.claude/hooks/route-guard.mjs
.claude/hooks/project-scope-guard.mjs
.claude/hooks/post-edit.mjs
.claude/hooks/session-sync.mjs
.claude/hooks/session-restore.mjs
.claude/hooks/session-end.mjs
.codex/codex-hook-adapter.mjs
scripts/runtime-activate.mjs
scripts/runtime-trust-hooks.mjs
scripts/project.sh
scripts/project-pin.mjs
scripts/project-lease.mjs
scripts/check-project-links.mjs
scripts/project-recovery.mjs
scripts/route-receipt.mjs
scripts/plan-execution.mjs
scripts/plan-transfer.mjs
.claude/settings.json
.codex/hooks.json
.gitignore
scripts/test-runtime-bridge.mjs
scripts/test-runtime-activation.mjs
```

The G0 manifest likewise excludes its own `manifest.json` from `entries` and lists exactly the G0
`payload/...` paths above. The remaining paths are the generation-external bootstrap/config/test envelope, not
manifest entries.

No other hook registration is in scope. User-global mutations are limited to (a) the exact journal-bound Codex
trust item CAS and inverse through `scripts/runtime-trust-hooks.mjs`, and (b) temporary fd-bound removal and
exact restoration of execute bits on the census-listed Claude/Codex/Luca consumer inodes during the explicit
maintenance gate. Original modes/dev/ino/SHA are journaled and must be restored before unfence or by exact
activation recovery; no executable bytes or unrelated mode/config byte may change. A repo config, target
user-config or consumer inode/mode different from the reviewed cutover record stops activation and requires
re-review. This temporary host mutation requires the user's exact-SHA handshake and any runtime permission
approval; refusal leaves B2/G0 and performs no cutover.

### 12.2 Framework-v3 and downstream envelope

The v3 release has this complete literal file set. `manifest.json` is the unlisted self-container; its strict
`entries` array must list exactly every `payload/...` path below, not `manifest.json` itself, and reject an
absent or extra payload file:

```text
.claude/hook-releases/g3-routing-steering-20260820/manifest.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/route-guard.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/project-scope-guard.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/post-edit.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/session-sync.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/session-restore.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/session-end.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/bounded-io.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/process-liveness.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/harness.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/memroot.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/git-env.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/project-alias.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/prompt-envelope.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/event-attestation.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/state-capacity-admission.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/project-substrate.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/route-obligation.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/project-state-matrix.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/project-transaction.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/lib/project-recovery.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.codex/codex-hook-adapter.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/skill-routing-map.yaml
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/input-modes.yaml
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/model-routing.yaml
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/optional-workflow-graph.yaml
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/plan-condition-policy.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/plan-result.schema.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/plan-delta-result.schema.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/approved-plan-execution.schema.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/plan-execution-public-verbs.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/agent-execution-contracts.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/skill-os/skill-execution-contracts.json
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/observability/rules.yaml
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/plan-agent.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/orchestrator.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/quality-gate.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/preflight-agent.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/work-agent-template.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.claude/agents/muse-proto-judge.md
.claude/hook-releases/g3-routing-steering-20260820/payload/.codex/agents/plan-agent.toml
.claude/hook-releases/g3-routing-steering-20260820/payload/.codex/agents/quality-gate.toml
.claude/hook-releases/g3-routing-steering-20260820/payload/.codex/agents/preflight-agent.toml
.claude/hook-releases/g3-routing-steering-20260820/payload/.codex/agents/muse-proto-judge.toml
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/project-controller.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/project-recovery.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/route-receipt.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/plan-execution.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/plan-transfer.mjs
.claude/hook-releases/g3-routing-steering-20260820/payload/scripts/check-project-links.mjs
```

Additional exact tracked paths are:

```text
.claude/skill-os/plan-condition-policy.json
.claude/skill-os/plan-result.schema.json
.claude/skill-os/plan-delta-result.schema.json
.claude/skill-os/approved-plan-execution.schema.json
.claude/skill-os/plan-execution-public-verbs.json
.claude/skill-os/agent-execution-contracts.json
.claude/skill-os/skill-execution-contracts.json
.claude/agents/plan-agent.md
.claude/agents/orchestrator.md
.codex/agents/plan-agent.toml
.claude/hooks/lib/state-capacity-admission.mjs
scripts/plan-transfer.mjs
scripts/test-route-guard.mjs
scripts/test-project-transaction.mjs
scripts/test-project-scope-guard.mjs
scripts/test-hooks.mjs
scripts/test-codex-adapter.mjs
scripts/test-harness.mjs
scripts/test-project-substrate.mjs
scripts/test-project-identity-wiring.mjs
scripts/verify-codex-wiring.mjs
scripts/check-project-routing.mjs
scripts/check-registration-sync.mjs
scripts/check-capability-parity.mjs
scripts/check-agents-parity.mjs
scripts/check-agent-contracts.mjs
scripts/test-prompt-attestation.mjs
scripts/test-route-obligation.mjs
scripts/test-plan-agent-gate.mjs
scripts/test-plan-result-schema.mjs
scripts/test-plan-condition-policy.mjs
scripts/test-approved-plan-execution.mjs
scripts/test-plan-controller-envelopes.mjs
scripts/test-plan-public-verbs.mjs
scripts/test-plan-main-agent-execution.mjs
scripts/test-plan-state-capacity.mjs
scripts/test-plan-final-quality.mjs
scripts/test-plan-failure-drain.mjs
scripts/test-plan-phase-gates.mjs
scripts/test-plan-parallel-execution.mjs
scripts/test-plan-delta-replan.mjs
scripts/test-plan-transfer.mjs
scripts/test-plan-transfer-recovery.mjs
scripts/test-transfer-security-ledger.mjs
scripts/test-plan-project-boundary.mjs
scripts/test-agent-execution-contracts.mjs
scripts/test-controller-carrier.mjs
scripts/test-route-execution-gate.mjs
scripts/test-skill-execution-contracts.mjs
scripts/test-project-state-matrix.mjs
scripts/test-project-recovery.mjs
scripts/test-process-liveness.mjs
scripts/test-activation-consumer-fence.mjs
scripts/test-activation-external-tcb.mjs
CLAUDE.md
AGENTS.md
```

The downstream exact path is `muse/.luca/project.json` relative to the single resolved real PROJECTS_ROOT frozen
in the preflight receipt; no other downstream path is writable. Its bytes are exactly §4.1.

No Luca app source, UI, workflow state, prototype, product context or unrelated cleanup is in scope.

### 12.3 Frozen audit inputs and required-new outputs

Before handshake, `EVIDENCE-MANIFEST.sha256` will list exact hashes for the plan, `PAYLOAD-CENSUS.md`,
`TRANSCRIPT-AUTH-EVIDENCE.md`, every prior failed and final Plan Agent review receipt, every actually completed
prior planning-redteam report and both final Round-19 reports, and these five literal census files:

```text
framework-audit/2026-08-20-routing-steering-handshake/payload-census/collector.mjs
framework-audit/2026-08-20-routing-steering-handshake/payload-census/claude-settings.json
framework-audit/2026-08-20-routing-steering-handshake/payload-census/workspace/.codex/hooks.json
framework-audit/2026-08-20-routing-steering-handshake/payload-census/claude-events.jsonl
framework-audit/2026-08-20-routing-steering-handshake/payload-census/codex-events.jsonl
```

Each has a one-byte drift→KILL-04 fixture. `payload-census/workspace/README.md` is explicitly excluded because
it did not supply capture configuration or a durable event receipt. Only files
explicitly listed are frozen audit inputs; the nested `payload-census/workspace/.git/**` and all other scratch
state are excluded from every commit. Hash drift fires KILL-04.

The exact audit-output paths are:

```text
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-1-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-1-TRANSACTION.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-2-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-2-TRANSACTION.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-3-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-3-TRANSACTION.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R4.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R5.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R6.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R7.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R8.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R9.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R10.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R11.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R12.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R13.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R14.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R15.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R16.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R17.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R18.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-18-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/PLAN-AGENT-REVIEW-R19.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-19-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/REDTEAM-ROUND-19-TRANSACTION.md
framework-audit/2026-08-20-routing-steering-handshake/EVIDENCE-MANIFEST.sha256
framework-audit/2026-08-20-routing-steering-handshake/L0-PREFLIGHT-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/BRIDGE-G0-SOURCE-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/BRIDGE-G0-MANIFEST.json
framework-audit/2026-08-20-routing-steering-handshake/BRIDGE-PARITY-REVIEW.md
framework-audit/2026-08-20-routing-steering-handshake/BRIDGE-LANDING-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/CANDIDATE-OBJECTS.json
framework-audit/2026-08-20-routing-steering-handshake/POSTREVIEW-ROUTING.md
framework-audit/2026-08-20-routing-steering-handshake/POSTREVIEW-TRANSACTION.md
framework-audit/2026-08-20-routing-steering-handshake/MUTATION-FAULT-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/ACTIVATION-ROLLBACK-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/LIVE-CLAUDE-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/LIVE-CODEX-RECEIPT.json
framework-audit/2026-08-20-routing-steering-handshake/ORIGINAL-TASK-HANDOFF.json
```

Cycle-completed `PLAN-AGENT-REVIEW.md`, `PLAN-AGENT-REVIEW-R4.md`, `PLAN-AGENT-REVIEW-R5.md`,
`PLAN-AGENT-REVIEW-R6.md`, `PLAN-AGENT-REVIEW-R7.md`, `PLAN-AGENT-REVIEW-R8.md`,
`PLAN-AGENT-REVIEW-R9.md`, `PLAN-AGENT-REVIEW-R10.md`, `PLAN-AGENT-REVIEW-R11.md` and Round-1/2/3 reports are
joined by failed `PLAN-AGENT-REVIEW-R12.md`, `PLAN-AGENT-REVIEW-R13.md`, `PLAN-AGENT-REVIEW-R14.md`,
`PLAN-AGENT-REVIEW-R15.md`, `PLAN-AGENT-REVIEW-R16.md`, stale-round `PLAN-AGENT-REVIEW-R17.md`,
`PLAN-AGENT-REVIEW-R18.md` and stale-round `REDTEAM-ROUND-18-ROUTING.md` as immutable prior inputs; no completed
receipt is ever edited, renamed or overwritten, and a stale round's verdict — PASS or FAIL — grants nothing.
Every other required-new output, including all R19 names,
must be absent until its
named gate; existing bytes block rather than overwrite.
KILL-03 uses only the literal file sets in §12.1–12.2; no directory wildcard or future manifest can expand them.
KILL-04 uses the literal output set above. There is no whole-audit-directory exemption. An audit-only commit
after handshake may include only manifest-listed audit files and never stages any other dirt.

## 13. Execution DAG and commit boundaries

1. Preserve failed-cycle `PLAN-AGENT-REVIEW.md`, `PLAN-AGENT-REVIEW-R4.md`, `PLAN-AGENT-REVIEW-R5.md`,
   `PLAN-AGENT-REVIEW-R6.md`, `PLAN-AGENT-REVIEW-R7.md`, `PLAN-AGENT-REVIEW-R8.md`,
   `PLAN-AGENT-REVIEW-R9.md`, `PLAN-AGENT-REVIEW-R10.md`, `PLAN-AGENT-REVIEW-R11.md`,
   `PLAN-AGENT-REVIEW-R12.md`, `PLAN-AGENT-REVIEW-R13.md`, `PLAN-AGENT-REVIEW-R14.md`,
   `PLAN-AGENT-REVIEW-R15.md`, `PLAN-AGENT-REVIEW-R16.md`, `PLAN-AGENT-REVIEW-R17.md`,
   `PLAN-AGENT-REVIEW-R18.md`, `REDTEAM-ROUND-18-ROUTING.md` and Round-1/2/3 reports
   as immutable evidence. Freeze this revised plan; obtain new
   `PLAN-AGENT-REVIEW-R19.md` with READY_FOR_REDTEAM, then two Round-19 PASS reports
   against that same SHA and the same unmoved `BASELINE_HEAD`/`BASELINE_UPSTREAM` pair.
2. Obtain the user's explicit approval of that SHA; create `A0`, the manifest-listed audit-only commit whose
   parent is exactly the §0.3 `BASELINE_HEAD=fd0919bb49597f1050106180bbbed21dac4aedff`
   (`BASELINE_TREE=3d383c34468249431c70fc864cc78cd772c82e1b`), so `A0`'s ancestry includes the frozen
   commits `c0a2efe7bfc7a32455580a349cd5d79915561573`, `c9d4185f18e14871f6f285e19baff205798be201`,
   `8e1c46d56d431d54ada9d30a3bb34d010f3e8466`, `068b9ab45d98c6fc258278e08d27388e59cd8729`,
   `36d37072ab31fdaa4fd7140f08869c60b654fa57`, `0e51ec2171c6c81de3403815339cdf304a0a3917` and
   `fd0919bb49597f1050106180bbbed21dac4aedff` above
   `PRIOR_BASELINE_COMMIT=8e9726d8477f8a287722c09345f07182cc86d1d5`, including the three non-audit paths that
   `0e51ec2…` and `fd0919b…` changed.
   Every later rollback ancestry, including the literal C1→B2 ref-CAS descriptor, resolves against that same
   frozen ancestry.
3. Run L0 fresh Claude/Codex timing, delivery-group and terminal-boundary probes against unmodified runtime;
   in isolated native scratch configs, census every local-mutation tool's PreTool observability.
4. In one isolated framework lineage, write bridge tests first and implement the complete external activation
   state machine from §10.3, including every forward/rollback tuple, helper 0500→000/000→0500→000 transition,
   trust inverse and chmod/crash barrier. Freeze `BRIDGE-G0-SOURCE-RECEIPT.json` with every
   source/provenance/transformation hash; create `B1` with exact parent `A0`, then `B2` with exact parent `B1`.
   Independently review both exact objects and prove that the literal B2 activator SHA passes the entire
   HELPER_DISABLED fault matrix; fast-forward only A0→B1→B2, initialize/read-back G0, and freeze the hook-config
   patch specification/tests without creating a config commit.
5. From exact `B2` in an isolated framework worktree and exact downstream baseline in a separate downstream
   worktree, write failing fixtures first; implement exact owner/contract/call-capability bijections including
   SUMMARY/JOIN, complete parameter/MAIN_AGENT-human persistence, preflight/phase-confirmation gates and
   phase-relative failure drain, then NO_PIN plus state-capacity Plan admission and delta envelopes, checkpoint
   cancellation reservation/core/lifecycle/transfer/target-cleanup receipt, alias and
   semantic obligation, D route-snapshot matrix plus the unified S(NEW) restore oracle, lazy attestation, scope,
   transaction/recovery/startup, then the v3 immutable release. V1/C1 do not modify any B2 bootstrap-TCB blob.
   The live pointer remains
   G0 and the framework worktree has not changed either hook config.
6. Run the full hermetic union, biting mutants, fault barriers and rollback drill. Create `V1` with exact parent
   `B2`; only then create `C1` with exact parent `V1` and changes limited to the two hook configs. Create
   downstream alias object `D1` with exact parent `69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a`. Before post-review,
   freeze all five framework role→commit→tree mappings, D1 commit/tree, the G0 source-receipt SHA, G0/v3 manifests, every B2 bootstrap-TCB
   blob (including the exact activator that passed every HELPER_DISABLED forward/rollback fault), every V1
   Plan-registration/Orchestrator/policy/controller blob, C1 config blob, hook-trust expected digest, literal C1→B2 rollback
   path/preimage/ref-CAS descriptor, all already-existing native consumer executable realpath/dev/ino/mode/SHA records plus
   NODE/GIT/ps/sysctl/lsof TCB records and the Codex-helper source/expected bytes/mode/no-follow construction/
   activation-path-template/protocol contract (**not** a future helper inode), fixed protocol tables, and downstream bytes in
   `CANDIDATE-OBJECTS.json`.
7. Two independent post-reviewers inspect and test only those exact objects. Any content change invalidates both.
8. Land exact D1 while G0 remains active; old code ignores the additive alias file. V1/C1 remain candidate
   objects only. At the declared maintenance gate, close all sessions. The hash-verified external B2 activator
   creates and reads back the private helper, atomically journals its actual realpath/dev/ino/mode/size/SHA
   against the reviewed construction contract, prepares the remaining external-TCB records, acquires its own locks, fences invocations, removes execute
   bits from every normal census-listed native consumer inode and proves zero pre-C1 config consumers by
   PID/start-token+executable-path evidence. It then follows only §10.3:
   Git worktree/index C1→ref C1, helper trust CAS/read-back, pointer g3, probes, durable HELPER_DISABLED,
   normal-mode restore,
   unfence. The self-owned lock tuples are the sole
   KILL-09 exception; no pre-cutover session may continue. Any inability to inhibit or census leaves B2/G0.
9. From fresh Claude and Codex sessions after cutover, replay the original chain and negative controls; collect state/pointer/
   journal before-after evidence.
10. Both post-reviewers review activation and live receipts—including the actual journaled helper identity versus
    the pre-reviewed source/bytes/mode/construction/protocol contract—and issue final PASS. Publish
    `ORIGINAL-TASK-HANDOFF.json` containing the verbatim settings task, source prompt hashes, the screenshot
    dimensions/size/SHA above, canonical muse target, framework generation/receipt hashes, status
    `AWAITING_COMBINED_NATIVE_RESUBMISSION`, no capability, and canonical-base64 display bytes for exactly
    `进入 luca app 项目，<verbatim original task>` where the prefix/delimiter are framework text and the suffix is
    the untouched original UTF-8 task region.
11. Report `FRAMEWORK_RECOVERY_VERIFIED` and display that one copyable combined event. `确认|继续` or task-only
    text is explicitly insufficient because the handoff carries no executable capability. In a fresh NO_PIN
    receiving session, the combined event must resolve muse, create S+DEFERRED, and preserve only the suffix as
    `exact_task_text`; its successful commit/verified continuation enters the real receipt without a second
    Project Gate. The receipt must evaluate all five Plan conditions independently:
    any true condition enters the authorized Plan lifecycle; all false plus one unique, complete, safe contract
    enters SINGLE/MULTI; all false with missing required input or no unique safe contract enters QUESTION→
    PRESENTATION_PENDING→verified WAITING_HUMAN. Luca app implementation and its independent post-review use only that
    newly authorized outcome; they are not smuggled into this framework scope. No push, app edit or deployment
    occurs in this plan.

## 14. Blocking assertion matrix

### R — routing and obligation

- `R-ALIAS`: opaque temp-root manifest; both original alias phrases resolve muse; direction chooses only target;
  bare open/login-continue, question, quote/example/report, negation and typo are negative; all reserved nouns,
  raw/NFKC limits, 513th root entry, 257th project and aggregate overflow fail as specified while canonical
  names remain usable. NEW has a complete EXISTING_CURRENT/EXISTING_OTHER/ABSENT census: only ABSENT can mint a
  fresh project capability; existing pure-project and combined-task cases preserve project/task evidence, run
  the total route event-rebind subtable, and emit TARGET_EXISTS with no project command in N/A/C/B/S.
- `R-SIGNAL`: original settings prompt has three distinct spans in one affirmative clause; every 2/3,
  same-span, cross-clause, structural-negator (the complete generated `(不|别|不要|不用|无需|不必)×(改|动|调整|变)结构` set, including
  `别动结构`/`别调整结构`, plus `结构不变`, `结构不动`, `结构别动`, `而非结构`, `不是结构问题`), quoted and question
  case is negative; `调整设置里的颜色但结构不变` is frozen negative while an independent later affirmative
  reorganization remains positive; score and five Plan conditions do not
  change; pure audit, explicit code-change and explicit-skill controls retain their routes. The exact original
  combined phrase is the sole two-region NEW_TASK_SIGNAL_WITH_PROJECT positive and becomes S(muse)+DEFERRED;
  its exact_task_text is the complete contiguous task-side raw region and excludes only the project clause plus
  delimiter. A signal-only resubmission stores the entire raw decoded prompt, including every original UX/UI
  problem statement. Shared-clause, second-target/task/control/residue variants are ambiguous, while generic
  NEW_TASK+project never inherits this exception. In clean S and every SWITCH/NEW transaction phase, signal-only
  steering binds the immutable core target; combined steering is accepted only for identical target/op.
  Different target/op is REJECTED_BUSY, preserves any old obligation, and cannot attach a crm task to muse.
- `R-OBLIGATION`: the original task cannot vanish without a tool because Stop blocks; wrong obligation/event/
  boundary/generation/binding inode/epoch/one-shot receipt denies; PLAN first enters PLANNING_PENDING, proves the
  exact read-only Plan Agent + PreTool/PostTool-paired result capability, pins SHA-256/LP capability and result
  IDs plus the independent event-bound finalize-capability ID and exact finalize JSON, keeps the immutable
  result bound to its original CALL_CONSUMED Plan call while rotating only finalize authority, and rejects
  stale/missing/reused/wrong-ID call results/finalizers,
  validates the manifest JSON Schema and only PLAN_READY may present an exact-SHA approval wait;
  the controller-derived five-condition lower bound cannot be lowered by caller booleans: ≥3 manifest file
  templates, ≥2 distinct child-agent contracts (subject only to exact reviewed internal-HITL exemptions), any
  dependency edge, irreversible class or explicit plan grammar forces its matching condition; schema-valid
  PLAN_READY additionally proves premise YES/smaller-alternative NO and every mandatory orchestration,
  ownership/order, U-block/source-coverage, assertion, rollback and self-check block;
  PLAN_READY also recomputes the manifest-bound capacity analysis before presentation and approval. Golden
  multi-phase Plans place the exact conservative maximum at cap-1, cap and cap+1: the first two alone are
  ADMITTED (with exact margin 1/0), cap+1 becomes CAPACITY_REJECTED+fresh PLAN_REVISION_REQUIRED and never owns
  approval/execution authority. Fixtures independently saturate retained parameter answers, MAIN_AGENT HITL
  answers, their scope-snapshot duplicates, full ledgers and ENTRY/OVERFLOW checkpoint cancellation reserves;
  every component, canonical-base64 expansion, 20-byte uint64 decimal bound, admission/plan-admission hash and
  approval-time recheck must agree in both harnesses. An admitted Plan filled with every declared maximum answer
  cannot later reach ordinary 2 MiB rotation from those answers alone; registry/schema/analyzer drift revokes it.
  SINGLE/MULTI on active A enters EXECUTION_PENDING; a NO_PIN response-only/human-wait contract enters route-only
  EXECUTION_PENDING with empty project roots and no project grant; on same/unproven clean C/B it first presents and verifies an
  EXECUTION_WAITING_BOUNDARY message, allows one Stop with no capability, and only a DIFFERENT_DRAINED bare
  continue atomically opens A and issues the first execution capability. The controller then loads the pinned
  manifest execution-policy contract, snapshots output baselines, CASes one tool call at a time and records
  strict per-step changed/reuse-validated/output-or-wait evidence; unrelated reads, pre-existing unchanged files,
  skipped steps and cross-step receipt reuse cannot satisfy completion or Stop from the classify receipt alone;
  every question/plan/wait first enters PRESENTATION_PENDING and may Stop only after exact assistant-message
  projection proves display; a verified wait may Stop only on its creating event and the next human event must
  cancel, supersede, or use the full-input wait-kind/result-SHA grammar. Bare `批准|同意|接受`, wrong SHA,
  quote/negation/extra text and mixed project intent are inert/ambiguous. NO_ACTION acceptance reaches SATISFIED,
  THIN acceptance uses only the persisted proposed-task bytes, and each revision gets its specified fresh
  challenge. Every route status × route event × capability
  subphase has one generated carry/rebind/revoke result, including status steering during an IN_FLIGHT Plan
  Agent/execution call. Project-change commit, cleanup and recovery preserve the old obligation only as
  DEFERRED evidence until the proven committed boundary; cancel/current-
  project selection before S restores the exact saved status and capability subphase, including a
  non-authorizing completion tombstone for a released call. B+DEFERRED SWITCH/NEW and the sole committed-
  DEACTIVATE N+DEFERRED case then apply PROJECT_CHANGE_COMMITTED: the old arm becomes superseded evidence and
  only byte-identical task text enters a newly project-bound PENDING obligation. Its committed boundary must
  first byte-prove an independent display; the first applicable DIFFERENT_DRAINED non-cancel/non-new-task/
  non-project-revision event resumes before same-event status/correction/answer handling, so substantive
  continuation does not require a second `继续`. SAME/unproven/current-select does not. Every project-only D also
  requires its own exact SCOPE_DRAIN presentation before it can be confirmed. Wait control plus project outcome has a generated unique
  result, including B+plan-approval→A+PLAN_EXECUTION_PENDING and the full approved-plan execution lifecycle
  before SATISFIED. An admissible signal-only event, or target/op-identical combined
  event, arriving in clean S or each SWITCH/NEW phase creates the exact DEFERRED/route-only-busy outer revision
  without changing tx/core, and rollback-before-commit uses the exact no-change snapshot table; a mismatched
  combined event is REJECTED_BUSY.
  Exact approval never sets SATISFIED: it creates the immutable approved-plan identity, observes Orchestrator
  begin, every dependency-ordered Phase/quality-gate/human-wait receipt and the final summary Stop proof before
  SATISFIED. Positive fixtures cover task, interactive MAIN_AGENT skill, noninteractive skill and one
  parallel-skill phase: every skill preflight/parameter gate precedes work, 2–3 child calls obey one global
  concurrency cap, child BLOCKED forbids JOIN, all-DONE requires the exact aggregate summary then one quality
  gate. A parameterized parallel group is an exclusive outer wave: all child preflights terminate first, then
  its deterministic `(child_id,question_schema_id)` queue presents one zero-sibling wait at a time; swapped
  child/question/cursor/answer objects and any child work before the final answer reject. A two-question
  fixture uses arbitrary non-option UTF-8 for child A and a closed option for child B, crashes after A, restores
  the active queue through a project scope snapshot, and proves the exact canonical answer bytes,
  event/boundary, option ID and collected root reach each bound Work Agent prompt; a separate parameterized
  MAIN_AGENT skill proves the same root/bytes bind its execution object and every step input. A hash-only state is schema
  invalid. Steering after the terminal queue proves the one root-level parameter context restores active
  child/MAIN_AGENT/failure-retry state, while PHASE_QUESTION uses only its full wait-context copy. A later legal
  BETWEEN_WAVES checkpoint binds the completed parameter-input evidence but cannot
  re-ask/reissue it, while direct answer/capability replay is rejected. Parallel child
  paths/templates/outputs are pairwise disjoint after canonical/alias checks and the JOIN
  summary output is distinct from every child output; overlap is represented only by serial dependency phases.
  The interactive MAIN_AGENT fixture is exactly TOOL→HUMAN_WAIT→TOOL: each tool has its own native capability
  and paired record, the wait carries its complete graph/cursor/schema/evidence context, no next tool exists
  before the exact human answer, and only `complete-main-work` after all three terminal records reaches phase
  quality. The answer fixture includes free UTF-8 and closed-option cases, persists the complete
  MainAgentHumanAnswer bytes/length/SHA/event/boundary/option ID, crashes immediately after its rename, restores
  the exact object/root through a project-scope snapshot and proves the second TOOL prompt/input hash contains
  those decoded bytes. Wrong event/boundary/option, hash-only state, transcript reconstruction, lost
  human-context root and duplicate answer all reject. A two-interactive-phase fixture proves the second phase
  cannot overwrite the first phase's terminal answer objects and that both survive failure/delta/checkpoint
  projections until execution terminal. Its HUMAN_WAIT graph is an exclusive SERIAL wave; a plan
  placing any sibling beside it is rejected before approval. Deleting a step, reusing its call, answering from a
  generic continue, admitting a sibling authority or completing after the first tool turns red.
  Registered preflight fixtures distinguish DENY, retryable HUMAN_SKIP_CHECK and forbidden safety classes:
  `重试检查` reissues the same preflight once, while `跳过检查` stores PREFLIGHT_OVERRIDDEN and continues the
  same phase/parameter queue without PASS or PHASE_WAIVED; wrong phase/child/policy/finding/retry or an
  unlisted/safety finding denies.
  Every task/skill/child/preflight/JOIN/quality call has a one-to-one owner↔agent-contract→execution-
  contract binding; child-owner swaps, extra phase-level IDs and unowned writes reject. The semantic summary
  uses the event-bound one-shot SUMMARY capability and paired native PreTool/PostTool before JOIN_COMPLETE;
  controller-generated, stale or missing summary evidence cannot reach quality. Phase assertions run only for
  their bound phase and FINAL assertions run last. A successful TASK/SKILL/PARALLEL PostTool remains
  non-authorizing until the exact `record-work` request consumes its native call and evidence; ordinary work
  then reaches quality, while parallel work reaches SUMMARY only after every child is DONE. `complete-phase`
  preserves other already-issued same-wave authority and, when that wave drains, derives the required
  MAIN_AGENT-skill/Supervisor/Hierarchical confirmation queue. Its exact phase/quality/output-root presentation
  and fresh human receipt are mandatory before another queue head, BETWEEN_WAVES or FINAL_ASSERTIONS; a
  parallel wave may finish in any call order but confirms sorted phase IDs with zero live sibling authority.
  Only after an empty confirmation queue and remaining DAG work does it create BETWEEN_WAVES plus one
  wave-choice capability: `advance-wave` consumes it
  only when checkpoint is optional, while a mandatory checkpoint consumes it and leaves the target with a fresh
  post-transfer wave choice. With no remaining phase, only the registered final-quality capability may take
  FINAL_ASSERTIONS ISSUED→IN_FLIGHT; paired `record-final-quality` must produce terminal evidence for every
  FINAL assertion before VERIFIED mints the execution-finalize capability. Only that finalizer may validate the
  stored evidence root, stage the bounded summary and reach COMPLETE_PENDING_STOP; it runs no assertion, agent
  or shell. `record-failure` reaches the
  exact failure-decision wait only after every other released same-wave call drains without a successor; its
  RETRY/REPAIR/SKIP/TERMINATE arms respectively reissue FAILED_SCOPE+SAME_PHASE+OTHER_PHASE records once, enter
  delta, waive only when policy permits while tombstoning FAILED_SCOPE+SAME_PHASE and restoring only
  OTHER_PHASE records, or terminally cancel. A parallel child in the waived phase can never reappear. Deleting any mandatory
  subphase turns the test red. A PHASE_COMPLETION and a MAIN_AGENT_COMPLETION issued beside a failing sibling
  are both revoked in the failure-admission rename, serialized as exact successor records and cannot replay
  during the wait; RETRY may reissue their exact classified bytes while SKIP may reissue only OTHER_PHASE.
  An in-flight preflight PASS becomes PREFLIGHT_TERMINAL evidence rather than a fabricated work successor and
  survives/retires according to the same phase relation.
  CONDITIONAL_PASS is warning-only and policy-bound. A project-requiring result under
  NO_PIN with any project-scoped phase is unapprovable and returns through PLAN_PROJECT_REQUIRED+fresh
  project-bound Plan, while a wholly NO_PROJECT result has the unique exact-approval→route-only
  PLAN_EXECUTION_PENDING cell with empty project roots/no project grant; clean C/B
  SAME/unproven approval has no phase capability until the exact boundary wait is shown and a drained
  `继续执行计划 <sha>` arrives. Two blocking failures exercise controller-computed delta capability/call/
  result/finalizer/install IDs, strict verb envelopes, immutable carried evidence, controller-derived approval
  and every stale/duplicate/two-install denial. Both delta controls are classified ANSWER_OR_REVISION: approval
  succeeds only in WAITING_DELTA_APPROVAL, continuation only in WAITING_DELTA_BOUNDARY plus
  DIFFERENT_DRAINED; swapped wait kind, SAME/unproven boundary, wrong SHA, extra text and initial-Plan approval
  all deny. Every public plan-execution verb and both plan-transfer verbs pass their exact
  common-envelope/payload/pre-state/authority/
  native-evidence/successor arm; missing/extra/reordered keys, wrong verb capability, phase, owner, native call
  and second consume turn each arm red. The 22-member PUBLIC_PLAN_EXECUTION_VERBS ordered array is byte-equal across
  manifest/schema/generated table/loader/controller/tests; deleting any member or swapping two adjacent table
  rows fails candidate construction, with explicit
  local and transferred `advance-wave` plus `record-work` positives. A phase-boundary >80% checkpoint proves the strict status oneOf,
  monotonic checkpoint sequence, core/checkpoint/claim/target golden IDs, CANCELLED-before-claim, BUSY-after-
  CLAIM_COMMITTING, source revocation, and the unique exact-projection Stop transition from ISSUED/
  CHECKPOINT_PRESENTATION to PRESENTED/TRANSFER_READY; mismatch/replay/crash cannot strand or double-present it.
  Checkpoint creation first proves and hashes one cancellation reservation. Before claim, every project-intent
  class consumes it in one source-state rename: ENTRY moves the complete CANCELLED checkpoint into the bounded
  ordinary archive and installs fresh CLASSIFY_ISSUED routing; OVERFLOW removes the live checkpoint, stores the
  complete terminal record, tombstones execution and publishes only ROTATION_REQUIRED with no route/project
  successor. No checkpoint scope snapshot or transfer journal exists. Crash immediately before/after either
  rename proves exact old-or-committed state, and a simultaneous claimant proves cancellation-wins or
  CLAIM_COMMITTING-wins with no mixed authority. Current target, SWITCH, NEW,
  DEACTIVATE, TARGET_EXISTS and combined-task fixtures cover this overlay, while CLAIM_COMMITTING is BUSY. A
  target that already staged deferred_plan_claim observes source CANCELLED on its next hook, self-tombstones the
  exact hashed non-capability object, persists the strict cleanup receipt and returns to ordinary routing
  without importing task/execution bytes. Stable source-archive read, wrong/missing/duplicate/compacted entry,
  source rewrite, wrong entry/overflow/archive root/core/reservation/claim, replay and second-clear fixtures prove
  the target CAS and lifetime retention. Entries 1–8 remain readable; with eight entries the next live
  checkpoint has the sole OVERFLOW reservation, its cancellation leaves no PRESENTED authority and yields a
  readable terminal record plus ROTATION_REQUIRED. A future claim against that rotated source, an absent or
  wrong reservation, duplicate record, or attempt to mint another checkpoint all deny.
  It then proves no-project and combined-project target claims, lexical two-
  session CAS, single claimant and target-only continuation. Four golden TransferJournal arms verify literal
  required/forbidden keys and H/LP state hashes; CLAIM/RECOVERY owner and null/ISSUED/CONSUMED capability
  vectors freeze every scalar order and explicit empty arm. LIVE, UNPROVABLE and PROVEN_DEAD owner fixtures in
  both sids prove the notice overlay, exact one-event display Stop, source- and target-actor recovery roots,
  recovery-capability successor and two-recoverer CAS; wrong/swapped actor/event/boundary denies;
  no ordinary task/project event leaks through the overlay. The final no-capability ORIGINAL_TASK_HANDOFF accepts neither `确认`, `继续` nor task-only text; only
  fresh unquoted resubmission of `进入 luca app 项目，<verbatim task>` in a NO_PIN session resolves muse and
  creates its own obligation without a second Project Gate. The semantic signal never selects PLAN:
  the same L3 harness proves a true-condition PLAN fixture, an all-five-false unique SINGLE/MULTI fixture and an
  all-five-false missing-input/ambiguous-contract QUESTION fixture. TARGET_EXISTS with
  `A.turn=E1/current=E2` never starts or continues a project-scoped selection: PENDING classify,
  EXECUTION_PENDING and EXECUTION_ACTIVE-between-steps all enter the verified PROJECT_SWITCH_REQUIRED wait; an
  already released in-flight step may finish once but cannot issue its successor. A no-project contract remains
  route-only and executable. If the fresh stored-target SWITCH is SAME or DIFFERENT_UNPROVEN, the oracle stores
  D(SWITCH) and proves PROJECT_SWITCH_REQUIRED→PRESENTATION_PENDING→verified
  PROJECT_SCOPE_DRAIN_REQUIRED: Stop is allowed only after display proof and completion drain, repeated
  same-parent retry/continue only re-presents, and the first marker-proven DIFFERENT_DRAINED matching
  retry/continue alone consumes D→S. The same generated suite covers D(NEW) and D(DEACTIVATE), their distinct
  display/retry grammar and operation-mismatch revisions. No classify/plan/execution/project capability exists
  between D creation and the later committed project-change boundary.
- `R-SCOPE`: Bash is mutation by default; only a frozen no-expansion read-only grammar is exempt. apply_patch,
  generic Agent/subagent, MCP/app, unknown tools and shell indirection deny while blocked. Exact controller,
  receipt and one-shot registered Plan Agent/finalize or execution capabilities alone are allowlisted. A
  project-scoped execution additionally requires effective_project_context; a phase-name-only TURN_ACTIVE is
  insufficient. Every
  SINGLE/MULTI route_name+contract-ID pair and step must exist uniquely in the manifest-bound execution-policy registry; free SKILL.md text
  cannot broaden tools, roots, outputs, response-only mode or child agents; NO_PIN cannot admit a project-scoped
  contract.

### T — identity, state and transactions

- `T-AUTH`: edit-before-code L0 freezes every allowed Claude 2.1.237 typed/queued, same-parent,
  single/wrapper-pair, image+text, peer/meta and terminal-order shape; an unobserved shape is not accepted. Capped
  raw stdin/cwd/schema parsing and fresh absent-state preamble+first-current bootstrap, including
  provisional Codex null-path U→one-source;
  Claude current single/paired human delivery, image+text and terminal ancestry; peer/meta,
  tool_result-as-delivery and unknown block negatives. Codex session_meta + adjacent two-leg pair + terminal
  marker; identical same-turn messages remain distinct. Cross-session/history, absent-state older-human-history,
  before-enqueue record, null-path historical/duplicate/cap-overflow source, one-leg/reordered pair, fake harness
  env, direct adapter/guard stdin all fail closed. NOT_YET_VISIBLE retains, provable mismatch consumes without
  cursor movement, only Claude unique-prompt replay consumes through its sole look-behind; Codex identical
  same-turn text waits for a fresh pair and the second real pair wins. Every source-invalid reason has one fixed
  AUTH_BLOCKED or ROTATION outcome. Both terminal-before-Stop and terminal-after-allowed-Stop
  fixtures prove that Stop never mints drain and clean A does not deadlock.
- `T-REVOKE`: invalid-after-active, pending cap+1 immediately entering
  ROTATION_REQUIRED(PENDING_CAPACITY_UNREPRESENTED_DELIVERY), ledger event 257 and BUSY event never inherit or later
  regain old authorization; a queued Claude exact replay is consumed without ledger/core drift while Codex
  without a fresh pair stays denied; BUSY is durably rejected;
  state+ledger transition is one rename. Exact recovery control remains issuable at ordinary-ledger capacity,
  is independently replay-protected, and leaves the recovered session ROTATION_REQUIRED. Its total table proves
  same-invocation retry, live-owner BUSY, dead-owner distinct-event reauthorization, unprovable-owner quarantine
  and consumed-event denial without overwriting an attempt. Terminal-prefix checkpoint compaction preserves
  cursor anti-replay and monotonic attempt_seq; after 16 attempts and a dead controller, the 17th fresh human
  reauthorization still has one unique recovery result.
- `T-MATRIX`: one declarative oracle covers every route status × capability subphase × route-event kind × stable
  project phase × three parent relations × seven project intents plus recovery precedence; absent/unknown cell
  is an error. Every
  A→A cell updates current event correctly. A paused old tool + SAME select never changes binding/epoch/command;
  new tools deny after D while the released tool can only finish P. Wait-event response, deferred cancel/abandon,
  B current-select-does-not-resume, C/B same-parent SINGLE/MULTI→verified boundary wait→drained A,
  NO_PIN route-only execution, NO_PIN invalidity for project-scoped contracts and the complete live-obligation+D
  path are generated cells: each SWITCH/NEW/DEACTIVATE D under SAME/unproven stages its operation-specific,
  verified PROJECT_SCOPE_DRAIN_REQUIRED wait; repeated SAME/unproven input remains non-capability; only an
  exact DIFFERENT_DRAINED matching continuation consumes D→S. CANCEL/current-target clears D and restores every
  exact saved route/capability subphase; released Plan/tool calls use one non-authorizing completion tombstone,
  and `继续切换` has only CONFIRM_PENDING classification. Successful S/commit never uses that no-change table:
  every operation × saved subphase supersedes the old arm and creates a new project-bound
  PENDING/CLASSIFY_ISSUED obligation with byte-identical task text. D(NEW) matching bare/retry cells re-run the
  bounded census and total ABSENT/EXISTING_OTHER/EXISTING_CURRENT/INCOMPLETE outcomes before S, crossed with
  route_snapshot_kind PRESENT/ABSENT and every legal A/C/B origin. The ABSENT arm restores only project bytes
  and uses independent project presentation; it can never create task/obligation/scope bytes. Request,
  payload, tombstone, snapshot, both strict predecessor/provenance variants and rebind H/LP golden vectors are
  identical across both harnesses; the rebound activation prompt is current while base prompt provenance stays
  original. Approved-plan snapshot selection is also total and disjoint: BEGIN admits only its exact non-work
  capability; FRONTIER accepts exactly 1–3 strict native PREFLIGHT/WORK/MAIN_AGENT_STEP/JOIN/QUALITY or
  non-native PHASE_COMPLETION/MAIN_AGENT_COMPLETION records, including legal coexistence; DELTA_CALL accepts
  exactly one delta call, and BETWEEN_WAVES accepts no call; FINAL_ASSERTIONS admits exactly one of
  final-quality ISSUED, IN_FLIGHT+tombstone or VERIFIED+finalizer; zero/multi-match and every removed
  PHASE/WAVE shape reject. PROJECT_CHANGE_COMMITTED explicitly projects
  BEGIN, FRONTIER, BETWEEN_WAVES, WAIT, DELTA_CALL, REPLAN, DELTA_WAIT, BOUNDARY_WAIT,
  FINAL_ASSERTIONS and SUMMARY_STAGED to one new
  project-bound PENDING arm while preserving the old bytes only as superseded evidence.
  These are generated cells,
  not handwritten exceptions. TARGET_EXISTS is likewise crossed with every route status and
  capability/contract-scope/execution-step subphase: ROTATE/CARRY/REPRESENT keeps route authority
  event-consistent while project state remains fixed; an E1 capability may not survive unchanged under current
  event E2, and project-scoped PENDING/EXECUTION_PENDING/BETWEEN_STEPS cannot execute until verified switch.
  Enum-to-row generation proves one and only one TARGET_EXISTS row per status: FAILURE_DRAIN stays byte-identical
  apart from its REJECTED_BUSY ledger event, TRANSFER_READY takes only pre-claim cancellation, and TRANSFERRED
  takes only terminal diagnostic preservation. Deleting the first row or duplicating TRANSFER_READY makes
  construction fail before a fixture runs. A separate generated
  `PLAN_EXECUTION_TRANSFERRED × every route_event_kind × every project intent × SAME|DIFFERENT_UNPROVEN|DIFFERENT_DRAINED`
  product is admitted only with the exact matching COMMITTED-journal proof and has exactly one successor per
  cell: immutable tombstone/project preservation, bounded
  `TERMINAL_DIAGNOSTIC`, command null and no new/live execution obligation, capability, D or S; the existing
  `route_obligation` remains exactly the immutable TRANSFERRED tombstone. Each cell also proves the exact
  fresh-native-session notice can be byte-projected for Stop; no PLACE_NEW or ordinary project-matrix edge exists.
  Generated BOUND-source fixtures cross all three parent relations with (a) a signal-only structural NEW_TASK
  and (b) NEW_TASK_SIGNAL_WITH_PROJECT under ABSENT, EXISTING_CURRENT and EXISTING_OTHER target census. They
  prove the §5.2 terminal check runs before semantic placement and TARGET_EXISTS: tombstone/project bytes are
  identical, only COMMITTED_SOURCE_TERMINAL advances the transfer-security chain, the ordinary ledger is
  byte-identical, command is null, and no replacement obligation,
  D/S, notice capability or project grant appears.
  A preceding generated recovery product crosses source underlay TRANSFERRED with journal
  SOURCE_TOMBSTONED, owner census LIVE|UNPROVABLE|PROVEN_DEAD, every route-event kind and all three parent
  relations. It yields only BUSY, the exact recovery notice, or the exact recovery capability respectively;
  terminal diagnostic and terminal Stop are absent. Crash barriers immediately before and after the
  SOURCE_TOMBSTONED→COMMITTED rename prove the former product cannot run before the nonempty commit receipt and
  runs exactly once after fully validated COMMITTED read-back. Missing/malformed/mismatched journal fixtures are
  fail-closed and never treated as commit.
  A transfer-capacity oracle crosses ordinary ledger count 255|256 with side SOURCE|TARGET, journal
  PREPARED|TARGET_PUBLISHED|SOURCE_TOMBSTONED|COMMITTED|MISSING|INVALID, owner census
  LIVE|UNPROVABLE|PROVEN_DEAD|NOT_APPLICABLE, every route-event kind and Stop. Nonterminal and COMMITTED-source
  cells advance exactly one fixed chain step at both counts; count 256 additionally installs only
  TRANSFER_SECURITY_LANE_ONLY posture and never generic event-257 output. COMMITTED target count 255 uses one
  ordinary append and count 256 uses only the existing ROTATION_REQUIRED event-257 oracle. Claim intent requires
  target count 255-or-less, appends exactly one ordinary ACCEPTED event and never also advances the transfer
  chain; controller admission additionally revalidates both source/target accumulator roots. A sequential
  A→B then B→C fixture proves B reuses one chain, changes event side
  TARGET→SOURCE without reset and cannot replay an A→B event. Golden vectors cover chain
  zero/step/object hashes, previous-object binding, AVAILABLE/FULL, projection NONE/UNVERIFIED/VERIFIED,
  cursor/replay, max serialized 4096/cap+1, reservation/accounting and wrong side/journal/outcome identity.
  FULL-posture fixtures additionally send one and nine same-parent UserPromptSubmit deliveries: the fixed marker
  stores no caller text/identity, direct forged stdin grants nothing, and successive security hooks consume each
  durable human group in source order through only the transfer chain without queue overflow, skip or ordinary
  authority. Submitted/consumed counters, first-unconsumed snapshot, unsigned-64 max/no-wrap and complete
  prompt-gate 4,096/cap+1 bytes have golden arms. Hook-before-record retains the marker until visibility; a
  non-human/stream discontinuity fails closed. For LIVE, UNPROVABLE, PROVEN_DEAD and COMMITTED-source outcomes,
  a nonempty scan always defeats an older controller/Stop attempt; the invocation that drains the final group
  cannot also consume its newly issued recovery capability or verify its notice/terminal projection. The next
  retry, with no intervening UserPromptSubmit and an absent scan, succeeds exactly once.
  A generated transfer input-kind product crosses the §5.3 discriminator inputs (`transfer_scan`
  absent|present × next durable group visible|NOT_YET_VISIBLE × PreToolUse|state-mutating PostToolUse|Stop ×
  persisted recover-controller|projection|target-cleanup|none) with journal arm
  PREPARED|TARGET_PUBLISHED|SOURCE_TOMBSTONED|COMMITTED|MISSING|INVALID, side SOURCE|TARGET, ledger admission
  AVAILABLE|FULL, capability null|ISSUED|CONSUMED, owner kind CLAIM|RECOVERY under census
  LIVE|UNPROVABLE|PROVEN_DEAD, and current-event relation same|fresh. Every cell must select exactly one of the
  six kinds plus one closed outcome or byte-preserving denial; two predicates matching one invocation, a
  missing cell or any default turns the owning test red. Named cells include an E1-bound ISSUED capability
  meeting fresh E2 (`STALE_CAPABILITY_ROTATED` at a strictly higher recovery_sequence, the old `capability_id`
  permanently unconsumable and the persisted controller bytes rebound to the replacement `authority_id`),
  recovery-owner death after consume (fresh higher-sequence capability from a CONSUMED arm), the exact
  `plan-transfer recover` PreTool immediately after its own issuing event (`NO_NEW_EVENT_RECOVER_CONTROLLER`
  succeeds with no event append), final-scan-drain followed by a no-event controller retry and by a no-event
  notice or terminal projection Stop, COMMITTED-target cleanup with and without a scan, dual-write and
  `last_event` replay, and crash barriers immediately before and after both capability rotation and controller
  consume.
  A later counted cancel,
  correction or status event is therefore observed before any older controller can mutate journal state.
  A journal commit between marker publication and drain has one side product: SOURCE retains the marker until a
  fresh group records the terminal transfer event, while TARGET retains denial until the marked group is
  chained as COMMITTED_TARGET_BACKLOG_DENIED and all counted groups drain into the generic full-ledger posture.
  The no-marker TARGET control proves cleanup restores only the last attested imported underlay and its next
  ordinary prompt then takes event 257.
  Signal-bearing NEW+EXISTING_CURRENT/OTHER preserves the exact task in a non-authorizing
  PROJECT_SWITCH_REQUIRED obligation across no-old/old-live task cases; fresh SWITCH/current/other/cancel cells
  never erase it. Controller-time ABSENT→existing NEW has separate route-present and project-only arms for every
  legal origin snapshot: the latter creates only TARGET_BECAME_EXISTING_PROJECT_ONLY presentation and cannot
  invent an empty task. Every SAME/unproven D retry preserves D/task/snapshot but rotates a fresh project-reprompt
  challenge; an E1 Stop cannot verify E2, while one E2 projection atomically verifies the shared route/reprompt
  challenge. Pre-claim checkpoint project intent has one generated cancellation→fresh CLASSIFY→ordinary project
  cell and no snapshot arm; the typed WAIT branch losslessly carries parameter, main-agent, phase-confirmation,
  preflight-override and failure-decision contexts. Target claim cleanup requires exactly one matching immutable
  source record across ordinary entries and overflow plus its entry/archive hashes and exact claim CAS, and persists one terminal
  non-authorizing receipt. CLAIM_COMMITTING is BUSY. A nonterminal TransferJournal owner census/notice overlay
  precedes every route/project cell in both sids, so LIVE/UNPROVABLE/PROVEN_DEAD cannot fall through.
- `T-TRANSACTION`: stale sid/tx/op/target/epoch/generation fails before side effects; every barrier ends in exact
  old, committed or RECOVERY_REQUIRED state. Cleanup evidence survives Stop/new prompt; canonical/parked/neither
  recovery first isolates any dead owner and acquires a fresh live recovery-global lease bound to claim/core.
  Legal same-inode canonical+parked crash, no-replace claim publication and `last_committed_tx` are exact. The
  manifest-bound macOS liveness oracle classifies only LIVE/PROVEN_DEAD/UNPROVABLE. NEW census distinguishes
  EXISTING_CURRENT/EXISTING_OTHER/ABSENT before every fresh capability across N/A/C/B/S and again before every
  D(NEW)→S continuation; both existing cases
  preserve project/task evidence, take the total route event-rebind action and emit no project command, while a
  post-issuance existence race consumes S by the single H/LP origin-projection restore oracle instead of reinjecting an
  impossible NEW forever. Route-present and route-absent race arms have byte-identical restored project phase,
  binding, turn, boundary and epoch and differ only in route/presentation fields. Claim quarantine is exact-
  hash/capability-bound; unprovable non-claim locks explicitly block offline while exact-live remains BUSY.
  Plan-transfer recovery is equally closed: LIVE owner is BUSY, UNPROVABLE owner yields only the fixed
  non-authorizing notice, and PROVEN_DEAD alone mints a one-shot recovery capability under the transfer-global→
  lexical-session lock order. Strict owner/capability object hashes, nonrecursive started state and exact
  source-or-target actor/event/boundary are part of the CAS. PREPARED, TARGET_PUBLISHED and SOURCE_TOMBSTONED each have one next step;
  capability sequence, journal-state hash and dead-owner proof are CAS-bound, so two recoverers, replay, wrong
  state or a revived owner cannot double-publish, double-tombstone or double-commit.
  `epoch_counter` is required in NO_PIN/BOUND/transients and the 7→deactivate expected7/NO_PIN8→new expected8/
  BOUND9 sequence passes while stale 0/7 fails before side effects.
- `T-CLI-START`: direct deactivate/raw pin writer/old lease recover/claim quarantine without capability denies;
  deactivate leaves persistent NO_PIN+ledger; SessionStart mutates nothing and only clean A reads project data.
- `T-ACTIVATE`: old/G0 and shim/G0 parity is byte/state exact, including adapter/memroot/project-controller
  checkout-root behavior from a real release path; invocation/fence races load one release; pointer/
  journal crashes are decidable; G0 payload preserves every repo-relative import/controller resolution and no
  generation-specific non-manifest executable/live policy outside the literal bootstrap TCB can affect
  authorization. Every bootstrap blob is journal-bound and its policy is restricted to the exact whitelist in
  §10.2—dispatch/IO/release checks, activation/fence/probe/commit transitions, strict trust CAS+inverse, exact
  hook matcher/exit config, Plan wrapper envelope and controller relay only—while both manifests
  exclude themselves while the pointer binds their SHA. A fence blocks every normal invocation; only the
  parent/pipe/secret/owner/entry-bound one-shot activation probe may traverse it and reuse/forgery fails. The
  strict trust controller rejects substring/extra matches, CASes only frozen items, read-backs, and automatically
  applies its exact inverse on activation failure. C1 broad matcher+G0 reproduces legacy matcher/
  exit behavior for fresh legacy sid and denies v3 sid. Emergency rollback proves the sole
  G0 pointer→literal C1→B2 tracked/index/ref/worktree restore→exact helper ready→trust-inverse→G0 probe→helper disabled order, loads B2 AGENTS/CLAUDE/Plan wrappers, rejects retained v3 state
  and preserves unrelated dirt; pointer-only G0 is a failing fixture. Only exact reviewed objects activate.
  Candidate review freezes exact NODE/GIT/ps/sysctl/lsof records plus only the Codex-helper source, expected
  bytes/mode, construction/path-template and protocol—never a predicted helper inode. Activation must create,
  read back and journal the helper's actual realpath/dev/ino/mode/size/SHA before parity/trust, and the final
  postactivation reviews compare that identity to the candidate contract. Fixed Git
  blob/index/tree/ref primitives and the private app-server JSON-RPC grammar are the only authority-mutating
  subprocesses. Helper-copy/parity/parent/exit/disable failures are fatal. The sole durable tuple order is
  HELPER_PREPARED→FENCED_PREPARED→HOST_INHIBITED→REPO_INDEX_C1→REPO_REF_C1→CODEX_TRUST_VERIFIED→CUTOVER_PREPARED→POINTER_G3→
  SHIM_PROBES_PASSED→HELPER_DISABLED→MODES_RESTORED→COMMITTED→UNFENCED, and each prefix has exactly the
  §10.3 inverse, including helper 000→0500 before a required trust inverse and 0500→000 before normal modes.
  Activation journals/removes/read-backs execute bits for every census-listed normal consumer inode, proves a
  stable zero pre-C1 consumer set by PID/start-token+lsof path, and restores modes only under the fence after
  C1/v3 read-back. A paused process that cached B2 config, an alternate executable inode, chmod/read-back drift
  or crash at every inhibit/restore boundary blocks cutover or takes the exact journal recovery path. The
  bridge receipt proves the exact B2 activator blob—before B1/B2 freeze—passes every HELPER_DISABLED
  forward/inverse crash cell; V1/C1 preserve that blob SHA and cannot supply a later implementation.

## 15. Required biting mutants and fault barriers

Each named mutant must make its owning independent test red before restoration:

- erase obligation at COMMIT/BOUND; allow clean S to Stop; remove Stop gate; classify Bash read-only by tool name;
  accept wrong receipt current event/boundary/epoch or reuse receipt ID; let a post-wait human response Stop
  without a fresh receipt; resume through Project Gate; leave DEFERRED after project-change cancel/abandon;
  admit NO_PIN+DEFERRED without exact committed DEACTIVATE evidence or reopen B on status chatter; let STATUS
  revoke/strand an IN_FLIGHT plan/execution call;
  omit a route-event/capability-subphase matrix cell or use a default; restore PLACE_NEW/PLACE_NEW_WITH_PROJECT
  or any project-matrix edge in one `PLAN_EXECUTION_TRANSFERRED` product cell, permit same-session task reuse,
  bypass the terminal-source check in §5.2 signal placement/explicit-new-task supersession or the §8.1
  TARGET_EXISTS guard, run the terminal-source check before a matching nonterminal TransferJournal/notice
  overlay, accept SOURCE_TOMBSTONED/empty commit receipt/missing journal as terminal, omit the exact
  fresh-session terminal projection, or mutate Stop to clear/replace the transfer tombstone; leave ordinary
  capacity after a stop-composition transfer append, append/evict a 257th ordinary event, dual-write one native
  event to ordinary+transfer ledgers, omit/miscount the 4,096 reserve, mutate the chain/previous-root/cursor/domain,
  accept a cap+1 accumulator, reset/fork the chain on journal advance, allow target claim at ordinary FULL, send
  COMMITTED target through the transfer lane, show generic capacity plus transfer output, or allow FULL rotation
  posture to grant any non-transfer tool; enqueue caller text/native identity under transfer-only rotation,
  skip an unread durable human group, consume two groups in one hook, clear a submitted>consumed scan, wrap its
  counter, exceed its 4,096-byte prompt-gate cap, let the fixed scan marker mint ordinary authority, allow an
  older recovery controller/notice/terminal projection to bypass a nonempty scan, consume or verify a capability
  minted by the same drain invocation, require a new UserPromptSubmit after equality before the exact retry,
  append a `TransferSecurityEvent` from any no-new-event kind, let a no-new-event kind advance the
  cursor/chain/current event or journal state, let one invocation match two input-table predicates, restore
  `RECOVERY_CAPABILITY_BUSY`/`RECOVERY_OWNER_BUSY` or add any default to the input or outcome tables, retain an
  older-event ISSUED capability across a fresh event, reuse or lower `recovery_sequence` on rotation, leave the
  persisted controller bytes bound to a rotated-away `authority_id`, re-run the liveness oracle against a
  recorded dead owner, or let an event-bearing kind consume a capability, publish a controller owner, verify a
  projection or run target cleanup in the same invocation;
  treat `这不是新任务，把设置分组改成三类`
  as NEW_TASK/AMBIGUOUS, count a quoted control, let STATUS swallow an imperative, accept bare/wrong-SHA/
  negated/quoted/mixed-project approval or acceptance, omit SATISFIED from the NO_ACTION wait cell, source THIN
  accepted text from the caller or `smaller_alternative.statement`, normalize/trim the raw `<text>` capture,
  classify the exact combined Luca-app/settings phrase as generic ambiguity, admit a one-clause/third-residue
  project+task mix, store the full combined prompt as exact_task_text, truncate a signal-only prompt to its
  three-span clause or lose any original UX/UI constraint in the byte round trip, accept a different target/op combined
  event during S/COMMIT/CLEANUP/RECOVERY, supersede the old task on that BUSY rejection, force PLAN from the
  three-leg signal, force all-five-false into SINGLE/MULTI when QUESTION is required, or drop any closed classifier priority;
- let PLAN jump directly to WAITING approval without a captured plan result; accept caller-supplied plan text,
  a mismatched PostTool call ID or wrong agent identity; allow a generic Agent/repository write under
  PLANNING_PENDING; accept free Markdown/invalid oneOf disposition/schema, arbitrary model tier, or a THIN result
  without exact proposed-task bytes/SHA; substitute a different H/LP encoding, omit capability/result ID,
  omit/domain-confuse the independent finalize capability, rotate/rewrite the immutable result or original
  Plan-call capability instead of only finalize authority, finalize with wrong/reused/stale original/finalize/
  result IDs or caller text; time-steal an IN_FLIGHT call, skip
  PRESENTATION_PENDING/display-hash proof, or reuse a superseded result/capability; trust caller-supplied five
  false values against a ≥3-file/≥2-agent/dependency/irreversible/explicit-plan lower bound, broaden the exact
  internal-HITL exemption, accept PLAN_READY with wrong premise/smaller-alternative disposition or omit any
  mandatory orchestration/ownership/U-block/source/self-check field; remove capacity admission, undercount one
  HumanInputSchema/base64/snapshot/ledger/cancellation-reserve arm, accept cap+1, reject exact cap, change a
  declared input maximum after admission, skip approval/delta recheck or let an admitted maximum-answer run hit
  ordinary rotation; change exact approval directly to
  SATISFIED, omit observed Orchestrator begin, skip/reorder a phase or dependency, reuse a phase receipt, bypass
  its quality gate/human wait, or finalize an approved plan before every terminal phase assertion; let a
  successful work PostTool advance without `record-work`, omit `record-work`, accept its wrong native call or
  evidence root, issue quality/SUMMARY/JOIN before the required work/all children are DONE, let `complete-phase`
  enter BETWEEN_WAVES while another same-wave unit is active, skip/reorder a required post-wave confirmation,
  confirm the wrong phase/root/event, issue final quality before the confirmation queue drains, or issue the
  next wave directly; omit/duplicate the wave-choice capability, allow `advance-wave` when checkpoint
  is mandatory, strand the target after transfer without a fresh wave choice, or remove any member from the
  22-verb manifest/schema/table/loader/controller equality set or swap two adjacent generated rows; allow MAIN_AGENT to use one generic work call, skip a
  TOOL/HUMAN_WAIT step, reuse a step capability, lose its graph/cursor/evidence preimage, answer it by generic
  continue, retain only the MAIN_AGENT answer SHA, drop/corrupt its bytes/length/event/boundary/option ID, rebuild
  it from transcript history, omit it from the human/scope root or second-tool input, duplicate it after crash,
  schedule a sibling beside an interactive MAIN_AGENT phase, or complete main work early; mint a finalizer before registered final-quality VERIFIED, accept a
  wrong quality owner/native call/assertion evidence root, run FINAL assertions/shell inside the controller, or
  finalize without every FINAL assertion and the exact bounded summary; delete the
  parallel_skill_execution variant/child/preflight/parameter/JOIN/aggregate-summary/quality subphase, dispatch
  work before all preflights pass, fail to make a parameterized group exclusive, ask before every preflight is
  terminal, omit/swap child ID/question/cursor/answer-root in the parameter queue, retain only an answer hash,
  drop/corrupt canonical answer bytes/length/event/boundary/option ID, reconstruct an answer from transcript
  history, omit the terminal parameter-input root from a scope-resume snapshot/call/Work Agent
  prompt/MAIN_AGENT step, carry both PHASE_QUESTION wait bytes and a duplicate root context, issue one child before the
  queue is terminal, exceed the global three-call cap, give PREFLIGHT phase-tool authority, accept `跳过检查`
  under DENY/safety/wrong finding, turn PREFLIGHT_OVERRIDE into PASS/PHASE_WAIVED, skip its drain, or retry it
  twice; swap
  two child work owners/contracts, add an extra phase-level contract ID, omit the JOIN owner/agent/execution
  binding, synthesize summary in the controller, bypass/stale/reuse the SUMMARY capability or pair the wrong
  native call, permit overlapping child write/output templates because a JOIN exists, miss a canonical/alias
  collision, or let summary_output equal any child path, bind a
  phase-2 assertion to phase 1, run FINAL assertions early, or accept CONDITIONAL_PASS with BLOCKING findings;
  approve a project-requiring Plan under NO_PIN, reject/send a wholly NO_PROJECT NO_PIN Plan to a project
  boundary wait or give it nonempty project roots/grant, issue from SAME/unproven clean B/C, skip/reuse the exact
  boundary wait, start a no-project sibling from a project-required mixed Plan, or reuse an unapprovable result
  after project binding; mutate completed/unaffected delta bytes, let caller supply a self-referential result
  ID, let caller lower delta approval, accept wrong native-call/finalizer/install capability, duplicate result,
  rotate immutable delta bytes, classify either delta control as EXACT_APPROVAL, accept it under the swapped
  wait kind/SAME/unproven/wrong SHA/extra text, install twice or install an unpresented/unapproved delta, reuse old delta/
  capability, encode a FINAL repair as an empty/ordinary phase set, omit its replacement final-quality gate or
  issue phase work after a FINAL-only install, skip a non-waivable/safety failure, lose phase-1 evidence after phase-2 double failure, omit the
  failure-decision presentation, skip the failure drain, accept a new prompt/project/Stop or issue a successor
  while a released sibling remains, lose/swap a drained sibling's evidence/suspended-successor records, leave
  an ISSUED PHASE_COMPLETION or MAIN_AGENT_COMPLETION replayable during drain, reconstruct a successor from an
  opaque hash, reissue bytes absent from the strict successor array, let SKIP reissue a FAILED_SCOPE record or
  any SAME_PHASE child/completion, let SKIP discard an OTHER_PHASE record, misclassify relation by caller origin,
  reissue PREFLIGHT_TERMINAL evidence as a call, retry twice/change the failed input, repair
  without entering delta, skip a non-waivable/safety phase, or terminate while retaining any authority;
  checkpoint with an in-flight call/D/S, omit CANCELLED from its oneOf, keep CHECKPOINT_PRESENTATION in the
  unconditional Stop block, accept a wrong/replayed checkpoint projection or consume its Stop twice, cancel after CLAIM_COMMITTING, hash core
  fields in another order/domain, reuse checkpoint_sequence, accept a caller-supplied checkpoint/claim/target ID,
  copy source capability, let source resume, allow two target claims, import before claim COMMITTED, accept wrong
  project/generation/evidence, preserve/snapshot checkpoint authority when a pre-claim project intent arrives,
  fail to cancel before TARGET_EXISTS/SWITCH/NEW/DEACTIVATE routing, leave a target deferred_plan_claim live
  after exact source cancellation, clear it without the strict cleanup receipt/stable source read/exact claim
  CAS, keep cancellation only in the replaced live route, write a pre-claim transfer journal, split archive and
  fresh-route publication across two writes, omit/duplicate/reorder an archive entry, evict/compact the retained
  source CANCELLED entry, mint a checkpoint without an exact cancellation reservation, alter its archive root/
  capacity hash/slot, leave a cancelled overflow checkpoint PRESENTED, let ROTATION source satisfy claim,
  install fresh routing from OVERFLOW, store OVERFLOW as a ninth ordinary entry, omit its terminal record, or
  mix cleanup receipts into the recovery
  ledger or compact the wrong cleanup-receipt prefix, replay/second-clear it, import from it, or transfer without
  byte-proved presentation; make FRONTIER and DELTA_CALL
  snapshot selection overlap or match neither, accept zero/four frontier records, split coexisting native and
  PHASE_COMPLETION/MAIN_AGENT_COMPLETION authority into two snapshots, omit/swap the active/completed evidence roots from frontier/
  wave/finalizer identities, or accept the removed PHASE/WAVE arms, omit or carry old BEGIN/FRONTIER/
  FINAL_ASSERTIONS authority, omit a PROJECT_CHANGE_COMMITTED projection for BEGIN/FRONTIER/REPLAN/DELTA_WAIT/
  BOUNDARY_WAIT/FINAL_ASSERTIONS, recover a transfer without a current
  one-shot capability, accept a transfer-journal arm with a missing/late/extra receipt or wrong H/LP state hash,
  hash owner/capability JSON, recurse through started_state, swap an owner/capability scalar or explicit empty
  arm, accept a recover root without exact source-or-target actor/event/boundary, treat a LIVE/UNPROVABLE owner
  as dead, let an UNPROVABLE notice fall through to ordinary route/project work,
  Stop it without the exact creating-event display, reuse the recovery sequence, skip a journal state,
  or let two recoverers publish/tombstone/commit the same step;
- set SINGLE/MULTI directly SATISFIED; issue execution while same/unproven C/B, skip the verified
  EXECUTION_WAITING_BOUNDARY display, let SAME continue open A, omit begin-execution instruction injection; accept completion without
  a registered execution-policy contract; omit the NO_PIN route-only execution cell, give it a project grant or
  non-empty project roots, admit a project-scoped contract under NO_PIN; allow SKILL.md to broaden a tool/root/output/child agent; accept
  completion without post-begin tool/output/wait evidence; accept one unrelated read plus unchanged pre-existing
  output hashes, skip the middle step, reuse one receipt across steps, bind output to the wrong step, treat
  unchanged output as CREATED/MODIFIED without REUSE_VALIDATE, allow two concurrent PreTools to consume one
  execution capability, or let an ordinary PostTool advance a successor before attestPending; let phase=A bypass effective_project_context,
  publish/retain a project-scoped capability after TARGET_EXISTS E1≠E2, delete the FAILURE_DRAIN TARGET_EXISTS
  row, let it route instead of REJECTED_BUSY, duplicate TRANSFER_READY across two TARGET_EXISTS rows, treat
  TRANSFERRED as pre-claim cancellation, let BETWEEN_STEPS issue another tool,
  fail to stage/verify PROJECT_SWITCH_REQUIRED, map SAME/unproven D to naked RESUMED/PLAN_REVISION_REQUIRED,
  map NEW/DEACTIVATE D to SWITCH text/target, conflate `继续切换` with BARE_CONTINUE, accept CONFIRM_PENDING for
  stored NEW/DEACTIVATE, block Stop after the exact PROJECT_SCOPE_DRAIN_REQUIRED display and completion drain,
  consume D or issue a capability on a repeated same-parent retry/continue, fail to consume D→S on the first
  exact DIFFERENT_DRAINED matching continuation, leave a no-D zombie wait after CANCEL/current-target, restore
  only coarse resume_mode instead of exact status/subphase, drop or authorize an in-flight completion tombstone,
  issue a successor before its paired PostTool/terminal, change rollback PENDING into RESUMED, change a
  committed old obligation into RESUMED, omit/wrongly verify project-only or committed-change presentation,
  require bare continue and drop a substantive first DIFFERENT_DRAINED task correction, apply the no-change restore table after successful commit, rewrite the old obligation's project fields, revive an old Plan/result/selection/display instead of
  superseding it, alter exact task bytes during project rebind, or omit one PROJECT_CHANGE_COMMITTED subphase;
  omit/swap a request/snapshot/tombstone union field, accept the removed deferred-project-request:v1/nine-key
  object, omit/mis-hash a project-origin variant, hash JSON serialization, substitute an H/LP domain/order,
  accept an unknown key or let Claude/Codex golden vectors differ; mix COMMITTED_CHANGE and
  TARGET_BECAME_CURRENT predecessor fields, omit its variant domain, bind rebound `prompt_sha256` to the bare
  activation instead of original task provenance, or admit ORIGINAL provenance fields in PROJECT_REBOUND;
  skip D(NEW) recensus, let a waiting-period
  existence flip mint S, disagree between bare/retry, omit the ABSENT/PRESENT discriminator, fabricate task/
  obligation/scope bytes in an ABSENT arm, reuse a PRESENT snapshot across arms, or mishandle
  EXISTING_CURRENT/OTHER/INCOMPLETE; treat
  retry/display text as an executable project command, or let
  response-only Stop differ from the staged message hash;
- drop an admissible semantic steering event in clean S/each SWITCH transaction phase, let route-only deferral
  alter tx/core, or accept a mismatched combined target/op there;
- remove each alias grammar guard/cap, ignore the cap+1 entry, reuse one semantic span or aggregate clauses;
- drop Claude sid/cwd/origin/current-window/terminal checks; accept paired wrapper field typo; accept one Codex
  leg; trust harness env; use ID inequality or Stop as drain; block clean A forever waiting for a post-Stop
  terminal marker;
- read raw stdin before its cap; accept controller stdin/pipe/env/temp-file payload, padded/noncanonical base64url,
  reordered/duplicate argv flags, decoded-SHA mismatch or an over-cap argv; for any public plan-execution verb
  accept a missing/extra/reordered payload key, the wrong authority/pre-state/phase/owner/native record or a
  second consume; collapse U into absent-state history; apply previous-group look-behind to Codex
  or fail to prioritize its fresh unread second pair; leave Claude exact replay pending or scan farther than one
  previous group; choose AUTH_BLOCKED where the source table requires ROTATION (or vice versa); advance cursor
  for a candidate mismatch; keep old grant on invalid/event257; omit BUSY ledger;
  classify the ninth pending human as recoverable AUTH_BLOCKED or let the tenth loop behind its unrepresented
  group; put recovery control behind ordinary-ledger capacity or replay it; fail to compact a terminal prefix,
  reset attempt_seq/checkpoint/cursor, or deny the 17th fresh recovery after a dead controller; overwrite an IN_PROGRESS/live attempt,
  treat a new process as the same controller retry, omit dead-attempt reauthorization, reuse its old capability,
  or let malformed/unprovable ownership mint recovery without exact quarantine;
  fail to update A.turn.event; store D in obligation; omit/reset NO_PIN epoch_counter, synthesize expected_epoch
  from a link, or accept stale 0/7 after the 7→8→9 commit sequence;
  execute D under SAME; allow same-parent A→switch; let NEW EXISTING_CURRENT/EXISTING_OTHER reach a matrix cell,
  create D/S or drop the signal task evidence for it, skip its route-status/subphase ROTATE/CARRY/REPRESENT table,
  retain an E1-bound capability when E2 is current, lose the exact pending-NEW idempotency exception, or leave a
  raced TARGET_EXISTS NEW capability in S for repeated reinjection; retain the obsolete `O?C(O):N` restore,
  make task presence change the restored project phase/turn/boundary/epoch, invent a route obligation in the project-only
  race arm, fail to restore its issuance snapshot, erase the task after a bare SWITCH, preserve an E1 presentation
  challenge for E2 or let the E1 Stop verify E2;
- erase cleanup evidence; delete state on deactivate; expose raw pin/lease recovery; publish a half-written
  canonical claim; publish claim current by rename instead of no-replace link; overwrite a raced current; fail
  to recover the legal same-inode current+parked/next crash; treat a dead global owner as a recovery reservation,
  perform a recovery side effect before acquiring/binding a fresh live recovery-global owner; omit a claim census catch-all; retry through a
  proven-dead occupied next without parking; auto-delete a foreign/malformed/multiple temp; take over a
  live/mismatched claim; quarantine an exact-live or wrong-hash claim, auto-mutate or emit a command for an
  unprovable non-claim lock instead of BLOCKED_OFFLINE, use `kill(pid,0)` as a start-token oracle, treat
  ps/sysctl drift as dead, or clear display links at SessionStart;
- include manifest itself in its hashed entries; put Codex alias/adaptation policy in the live loader shim; read
  live routing policy instead of the manifest snapshot; derive payload adapter/memroot/project roots from their
  relocated file as if it were checkout root, accept an undeclared root-rebase diff, omit the dirty-rules source
  provenance receipt; skip G0 legacy matcher compatibility, dispatcher
  fence/generation/manifest/bootstrap-blob verification, admit a probe by argv/env or reuse its secret, activate
  while a PID/start-token process has cached B2 config, omit one consumer executable inode, restore execute mode
  before C1/v3 read-back, ignore chmod/lsof drift, call the
  broad `codex-trust-hooks.mjs`, invoke an undeclared Codex/Git/Node child, use shell/user Git config/hooks,
  freeze a predicted/dry-run private-helper inode in `CANDIDATE-OBJECTS.json`, begin parity/trust before the
  activation journal records the actual helper identity, let postactivation review skip the candidate-contract
  comparison, accept a helper copy/parity/hash/parent/exit/mode mismatch, omit HELPER_DISABLED, fail to re-enable the exact
  000 helper before a required inverse, restore normal modes before re-disabling it, run trust before normal inhibition or repo C1,
  swap pointer/repo/trust inverse order, accept an extra substring match, omit trust inverse rollback, add unlisted
  bootstrap policy, accept wrong/missing/leaked FD9 or non-EOF probe bytes, perform a pointer-only G0 rollback,
  first implement or alter the HELPER_DISABLED inverse in V1/C1 after the B2 activator is frozen, accept a B2
  activator SHA without its complete forward/rollback fault receipt, leave V1 AGENTS/CLAUDE/Plan wrappers after rollback, omit any of the five literal census files from the
  evidence manifest or fail one-byte drift, or add a matrix default fallthrough.

Fault injection covers before/after: candidate/state/cursor rename and pending cap+1 rotation; every controller
argv decode/re-encode/SHA/CAS and every plan-execution verb's authority consume/state publication;
Plan capacity template enumeration/component accounting/admission publication/approval and delta recheck at
cap-1/cap/cap+1;
execution/approved-plan preflight/parameter/parallel-child/SUMMARY-JOIN/quality tool
ISSUED→IN_FLIGHT→`record-work`/CONSUMED and steering between parallel PreTool/PostTool; MAIN_AGENT step-cap issue/
TOOL record/HUMAN_WAIT display+full-answer publication/crash restore/human+scope root/next-prompt construction/
cursor/evidence/complete-main-work; every phase completion,
all-preflight barrier/parameter-queue publish/each child-addressed presentation+answer/final bundle issue,
each full `CollectedParameterAnswer` publication and crash restore, terminal parameter-input root and Work Agent
prompt construction, scope-resume parameter-context publication/restoration,
preflight-failure drain/override presentation/retry/override evidence/resume, phase-confirmation queue publish/
each presentation+receipt/final queue removal, BETWEEN_WAVES wave-choice publication/`advance-wave`/mandatory-checkpoint consume, final-quality
ISSUED→IN_FLIGHT→`record-final-quality`→VERIFIED/summary staging/finalizer, failure-drain installation/all
native+non-native authority revocation/every paired terminal consume/every strict successor append/last-record presentation,
FAILED_SCOPE/SAME_PHASE/OTHER_PHASE classification and every RETRY/REPAIR/SKIP/TERMINATE failure-decision rename;
parallel canonical-path/alias collision rejection before the first child issue; delta
request/call/result/finalizer/display/approval/install-capability/install; checkpoint sequence/core/ID/
cancellation-reservation slot/root/capacity hash/display/byte-proving Stop/PRESENTED rename/replay/source revoke/
pre-claim PROJECT_INTENT ENTRY archive+fresh-CLASSIFY rename/OVERFLOW terminal-rotation rename/
CANCELLED-vs-claim/archive entries 1–8/overflow target cleanup/global journal PREPARED/target
publish/source tombstone/COMMITTED and two-claim race; source archive retention/stable no-follow read/re-read
race/target claim CAS/cleanup-receipt publication/17th-receipt deterministic compaction/replay/second-clear;
transfer-recovery four-arm state-evidence publication/owner+capability H/LP
object/null arms/actor binding/owner census/ordinary ledger-admission 255↔256/full/mandatory bootstrap
zero-accumulator validation/claim-intent ordinary-only storage/transfer event+chain+cursor publication/sequential
target→source journal rollover/full rotation posture/fixed scan count+source snapshot/no-visible→one-visible→burst drain/notice
display+Stop/capability issue/recovery-sequence CAS/previous-ledger-root read-back/COMMITTED-source UNVERIFIED→VERIFIED projection and every
PREPARED→TARGET_PUBLISHED→SOURCE_TOMBSTONED→COMMITTED recovery step
under two-recoverer/live/unprovable/dead races; SOURCE_TOMBSTONED+TRANSFERRED underlay owner
LIVE/UNPROVABLE/PROVEN_DEAD routing and Stop, immediately before/after COMMITTED publication and commit-receipt
read-back; committed transferred-source all-event/all-project/all-parent terminal pre-creation check/
before-after diagnostic publication/signal-only and combined TARGET_EXISTS census bypass/byte-proving Stop;
COMMITTED-target ordinary AVAILABLE→append and FULL→event-257 rotation, recovery-controller death while
ordinary FULL, transfer-ledger write/CAS crash and same-event retry;
recovery checkpoint compaction+17th append;
state/global lock publish/release;
COMMIT/core; NEW marker/dev-ino/publish; every display-link CAS; commit rename; lease canonical→parked→unlink;
claim temp write/fsync/link-next/temp-unlink/link-current/read-back/next-unlink/dead-next park/dead-current isolate/takeover/
live/dead/malformed/multiple-temp census/
current race/dead-owner isolation/fresh recovery-global publish+bind/every recovery side effect; activation
lease/fence/invocation drain/private-helper copy/fsync/chmod/actual-identity journal publication+read-back/dry-run/launch/exit/disable/HELPER_DISABLED/
rollback re-enable/inverse/re-disable; every Git blob/worktree/
index/write-tree/ref CAS; B2→C1/trust snapshot/CAS/read-back/inverse/probe channel create/
stdio-map/FD9 fstat/write/read/EOF/close/exec/ISSUED→IN_FLIGHT/launch/output/consume/journal/pointer/unfence;
recovery-control issue/live-busy/dead-reauthorize/quarantine/consume and liveness-oracle exec/parse/drift;
consumer executable census/chmod/read-back/every mode restore/paused cached-config process;
C1→B2 per-path/index/ref CAS/trust/config/pointer/probe and the same rollback points. Every error emits
`projectMutation:null`, no placeholder and no executable controller command.

## 16. Verification levels and evidence

- `L0`: unmodified-runtime hook timing and current-record/terminal-boundary census, including every proposed
  Claude typed/queued, same-parent, single/pair, image+text and peer/meta shape; registered Plan Agent
  PreTool/PostTool identity/result/write-sandbox census; native Claude/Codex command-only execution of every
  route-receipt, plan-execution and plan-transfer verb with minimum/maximum canonical base64url requests, decoded SHA and
  successful CAS plus exact equality of all 22 public plan-execution discriminator surfaces; ordinary execution
  and approved-plan preflight/override/work-`record-work`/parameterized-parallel question queue/child/
  SUMMARY-JOIN/quality/Plan-delta pairing, including a two-answer crash/restart whose canonical bytes and option
  ID appear in the exact Work Agent inputs; a MAIN_AGENT TOOL→HUMAN_WAIT answer-publish/crash/restart→TOOL→
  complete-main-work live chain whose recovered full answer object appears in the second prompt/input and scope
  root; manifest-derived state-capacity admission read-back and approval recheck at one admitted and one rejected
  bounded Plan shape; BETWEEN_WAVES advance/checkpoint choice;
  mandatory phase-confirmation queue; failure decisions including suspended PHASE_COMPLETION/
  MAIN_AGENT_COMPLETION and same-phase-vs-other-phase SKIP; registered final-quality
  PreTool/PostTool→VERIFIED→summary finalization; checkpoint display plus pre-claim project-intent atomic
  source-archive cancellation, fresh-session no-project/project-combined claim, source-cancelled deferred-claim
  cleanup receipt, entries-1–8 plus reserved-overflow terminal rotation/no-claim behavior, and four
  journal arms plus strict owner/capability/actor vectors with dead/live/unprovable recovery
  notice/capability/Stop behavior; the fixed stdio/FD9 inheritance, fstat, EOF and close
  contract; real release-path adapter/memroot/project-root rebase behavior; private Codex-helper copy/app-server
  identity-journal publication/JSON-RPC/disable plus rollback re-enable/inverse/re-disable and exact Git activation primitives; `/bin/ps`/`/usr/sbin/sysctl`
  realpath/dev/ino/SHA/output grammar and live/dead/unprovable fixtures; plus Stop final-assistant projection for question, plan,
  execution-boundary message, PROJECT_SWITCH_REQUIRED, project-only SCOPE_DRAIN, committed-change, all three operation-specific
  PROJECT_SCOPE_DRAIN_REQUIRED displays, PLAN_PROJECT_REQUIRED, approved-plan boundary/delta/checkpoint/phase waits/final summary, and
  response-only draft in fresh Claude 2.1.237 and Codex 0.148.0 sessions. It also freezes every supported native
  consumer executable and proves execute-bit inhibition plus the paused-B2-config consumer negative. This
  is a blocking architecture probe, not a dry-run substitute.
- `L1`: hermetic full union, generated matrix oracle, every mutant and fault barrier, bridge parity, generation
  manifest and old-reader rollback.
- `L2-Claude`: repeat only the L0-admitted typed, queued, paired/single, image+text human and peer/meta shapes as
  live regression fixtures; L2 cannot add a new production shape.
- `L2-Codex`: fresh parent, queued steering, two identical-text steering deliveries and terminal markers.
- `L3`: mandatory fresh Luca chain has three event orders: (a) alias-only phrase → exact switch commit →
  original settings prompt → PENDING obligation → route receipt with five explicit Plan-condition
  booleans/evidence → the mechanically selected PLAN, SINGLE/MULTI or QUESTION lifecycle; and (b) alias phrase → pending
  switch → signal-only or muse-target/op-identical settings steering before controller/inside each transaction
  phase → DEFERRED obligation preserved
  through commit → DIFFERENT_DRAINED continue → the same five-condition receipt and selected lifecycle;
  and (c) the exact combined
  `进入 luca app 项目，我要你优化设置里的交互结构，功能堆砌。` event → one S(muse)+DEFERRED composition
  with no ambiguity or early Stop. It proves routing continuity, not a
  settings UI change. The L3 corpus has both a frozen case where one or more authoritative conditions are true
  and the only valid result is PLAN→PLANNING_PENDING→ADMITTED state-capacity receipt→verified approval wait→exact approval→
  PLAN_EXECUTION_PENDING→observed Orchestrator begin→every dependency-ordered phase tool/PostTool/`record-work`/
  quality-gate→required post-wave confirmation queue→BETWEEN_WAVES→advance-wave/checkpoint choice, including
  one mandatory parameterized parallel-skill all-preflight→child-addressed parameter queue→children→event-bound SUMMARY capability/
  paired native call→JOIN_COMPLETE→quality path and one MAIN_AGENT TOOL→HUMAN_WAIT→TOOL path; then
  FINAL_ASSERTIONS→registered final-quality ISSUED→IN_FLIGHT→VERIFIED→execution-finalize→verified final
  summary→SATISFIED. Separate live controls exercise project-boundary approval, one delta install and one
  no-project/project-combined checkpoint transfer. A distinct wholly NO_PROJECT PLAN_READY under NO_PIN proves
  exact approval→route-only PLAN_EXECUTION_PENDING with empty project roots/no grant and runs no boundary wait.
  A separate registered preflight control exercises one retryable HUMAN_SKIP_CHECK finding through
  `跳过检查` to PREFLIGHT_OVERRIDDEN and one safety finding that cannot be overridden.
  A frozen all-five-false case
  with one unique complete safe SINGLE/MULTI contract. A third all-five-false fixture has missing required input
  or multiple/no safe contracts and must enter QUESTION→PRESENTATION_PENDING→verified WAITING_HUMAN; changing
  only the semantic-signal bit cannot change the five-condition vector or choose among these outcomes.
  The non-PLAN case and separate bounded explicit single-skill controls must show (i) active A classify→
  EXECUTION_PENDING→controller-injected skill contract→observed output/completion→Stop and (ii) same-parent
  clean B/C classify→PRESENTATION_PENDING→verified EXECUTION_WAITING_BOUNDARY→Stop→DIFFERENT_DRAINED bare
  continue→A+EXECUTION_PENDING. A NO_PIN all-five-false response-only fixture must enter route-only
  EXECUTION_PENDING with empty project roots and no project grant. Classify→immediate Stop and same-parent
  execution are blocked. No L3 assertion may require PLAN merely because the three-leg signal exists.
  At each phase, the paired `进入 crm 项目` combined variant is REJECTED_BUSY, preserves the previous obligation
  and never appears after muse commit; a SWITCH-vs-NEW operation mismatch is the second live negative. Separate
  TARGET_EXISTS live cases freeze project-scoped PENDING, EXECUTION_PENDING and EXECUTION_ACTIVE between steps:
  each verifies the displayed PROJECT_SWITCH_REQUIRED wait and zero new project tool; the in-flight-step variant
  may finish its already released call but cannot dispatch a successor. A no-project response-only control proves
  that the same E1/E2 relation does not over-block route-only execution. An E1 Plan result followed by E2
  TARGET_EXISTS rotates only finalize_capability and finalizes the same immutable result exactly once. Each
  project-scoped TARGET_EXISTS case then sends the stored-target SWITCH once under SAME and once under
  DIFFERENT_UNPROVEN, proves D plus the exact verified PROJECT_SCOPE_DRAIN_REQUIRED wait and a permitted Stop,
  repeats both continuation grammars under SAME with no command/capability, and finally uses a terminal-marker-
  proven DIFFERENT_DRAINED continuation to prove D→fresh S→commit→PROJECT_CHANGE_COMMITTED: the old arm and
  every Plan/execution/display ID are superseded, exact task bytes alone populate a new muse-bound
  PENDING/CLASSIFY_ISSUED obligation, and only its fresh receipt can choose the next lifecycle.
  A held PLAN_EXECUTION_FAILURE_DRAIN then receives the same TARGET_EXISTS event and proves REJECTED_BUSY plus
  byte-identical drain/project/route bytes. Separate source sessions prove TRANSFER_READY takes only the
  pre-claim archive-cancel path while TRANSFERRED remains diagnostic-only; neither status can match two rows.
  Parallel live fixtures create D for ABSENT NEW and DEACTIVATE under all three parent relations, verify their
  distinct text/retry controls, reject op mismatch, and cross CANCEL/current-target with every saved subphase.
  The EXECUTION_IN_FLIGHT_STEP case proves paired completion can update only its tombstone, Stop waits for that
  completion, cancel never emits a successor early, and the no-change restored policy advances exactly once.
  Every operation × saved subphase also takes the successful-commit path and must converge on a newly bound
  PENDING obligation, never exact restore. A D(NEW) wait-window fixture flips ABSENT→EXISTING_OTHER/CURRENT and
  INCOMPLETE for both bare and exact retry across `route_snapshot_kind=PRESENT|ABSENT` and every legal A/C/B
  origin, proving the ABSENT arm never fabricates task/route/scope bytes and no existing outcome emits S/command;
  then keeps the ABSENT census control as the sole S positive. Controller-time NEW race live cases cover every
  NO_PIN/A/C/B issuance projection with route-present and project-only arms; their restored project bytes are
  identical, while the latter proves only TARGET_BECAME_EXISTING_PROJECT_ONLY presentation and a fresh SWITCH retry. Combined NEW against an
  already-existing muse proves exact task preservation through PROJECT_SWITCH_REQUIRED→SWITCH→rebound
  obligation. Two SAME reprompts prove challenge rotation and old-Stop rejection. Cross-harness golden vectors
  cover every request/snapshot/tombstone/rebind hash arm.

After activation/post-review, `ORIGINAL-TASK-HANDOFF.json` is read back and its exact combined
`进入 luca app 项目，<verbatim original task>` bytes are displayed. The follow-on UI route is proven only after
the user resubmits that complete combined text unquoted as a fresh native event; a fresh NO_PIN fixture must
resolve muse and must not ask Project Gate again. Task-only text and one-word confirmation/continue remain
negative fixtures. The framework receipt never
claims the product task itself is implemented.

The minimum command union is:

```text
node scripts/test-route-guard.mjs
node scripts/test-project-transaction.mjs
node scripts/test-project-scope-guard.mjs
node scripts/test-hooks.mjs
node scripts/test-codex-adapter.mjs
node scripts/test-project-identity-wiring.mjs
node scripts/test-prompt-attestation.mjs
node scripts/test-route-obligation.mjs
node scripts/test-plan-agent-gate.mjs
node scripts/test-plan-result-schema.mjs
node scripts/test-plan-condition-policy.mjs
node scripts/test-approved-plan-execution.mjs
node scripts/test-plan-controller-envelopes.mjs
node scripts/test-plan-public-verbs.mjs
node scripts/test-plan-main-agent-execution.mjs
node scripts/test-plan-state-capacity.mjs
node scripts/test-plan-final-quality.mjs
node scripts/test-plan-failure-drain.mjs
node scripts/test-plan-phase-gates.mjs
node scripts/test-plan-parallel-execution.mjs
node scripts/test-plan-delta-replan.mjs
node scripts/test-plan-transfer.mjs
node scripts/test-plan-transfer-recovery.mjs
node scripts/test-transfer-security-ledger.mjs
node scripts/test-plan-project-boundary.mjs
node scripts/test-agent-execution-contracts.mjs
node scripts/test-controller-carrier.mjs
node scripts/test-route-execution-gate.mjs
node scripts/test-skill-execution-contracts.mjs
node scripts/test-project-state-matrix.mjs
node scripts/test-project-recovery.mjs
node scripts/test-process-liveness.mjs
node scripts/test-activation-consumer-fence.mjs
node scripts/test-activation-external-tcb.mjs
node scripts/test-runtime-bridge.mjs
node scripts/test-runtime-activation.mjs
node scripts/check-agent-contracts.mjs
npm run check:hooks
npm run verify
bash scripts/verify.sh
```

Every named runner above is mandatory; `npm run verify` is not assumed to aggregate a new file unless its exact
package wiring is separately reviewed. Receipts save
raw hook stdin hashes, CLI versions/commands, bounded transcript extracts, state bytes before/after, commit/tree/
manifest/pointer/journal hashes, mutant red/green evidence and rollback results. A dry-run alone cannot satisfy a
live cell.

## 17. Planning handshake and post-implementation review

This plan may be shown for approval only after the independent Plan Agent reports READY_FOR_REDTEAM in the
cycle-specific R19 receipt and two independent Round-19 reviewers report PASS with no BLOCKER or MAJOR against one unchanged SHA. Any edit invalidates
all three reports. The user must explicitly approve that exact SHA; `继续`, an old SHA, or approval before every
report is not authorization.

Implementation and bridge work begins only after that handshake. Post-reviewers inspect the exact candidate
commits/trees before landing and then the activation/live receipts after landing. Final handoff reports the
audit/bridge/framework/downstream commit+tree SHAs, active generation+manifest, complete test/mutant/fault/live
receipts, rollback drill, untouched dirt and residual cooperative-local-account boundary. It then performs the
§13 ORIGINAL_TASK_HANDOFF; it must not claim the settings UI is complete from a routing receipt. Until then status
is `PROPOSED_ONLY`; no runtime or Luca app source is authorized to change.
