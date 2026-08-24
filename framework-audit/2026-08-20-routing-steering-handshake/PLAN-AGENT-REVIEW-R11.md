# Round-11 Plan Agent Gate

## Receipt

- Review mode: independent Plan-Agent gate; the frozen plan was read from byte 0 through EOF. This receipt is the only file created.
- Plan path: `framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md`
- Expected plan SHA-256: `6ec6448028e2eb64f2c8821a1dc7348136819b0b46e330eacf4b68e4ddbf58c5`
- Actual plan SHA-256 read for this review: `6ec6448028e2eb64f2c8821a1dc7348136819b0b46e330eacf4b68e4ddbf58c5`
- Actual plan length: 4698 lines.
- Framework `HEAD` / upstream: `8e9726d8477f8a287722c09345f07182cc86d1d5` / `8e9726d8477f8a287722c09345f07182cc86d1d5`.
- Round-10 receipt SHA-256 read: `200019ba1502cd6c5d8c765b17ceb6b95c47af80e58a982c4dd5e03bb5a05d4f`.
- Frozen payload evidence SHA-256: `e3849f7e09823a8fb6bb1731e4539b5f0e49e3a3ce8b1267763095b93efeedc9`.
- Frozen transcript evidence SHA-256: `386b1dacb506ff3839b465359062dc75d4273a9c1b217a4c7024434de22011d1`.
- Authoritative Plan Agent contract SHA-256: `425cbe8dd3345b08820905166f779854d35ccfd2c9fc3e3f48f1be07c34aa1d3`.
- Authoritative Orchestrator contract SHA-256: `6e5d677fc1055b63268f9b740549bf019584797e5cd6cdf35a57ebd811916aea`.
- Inputs read through EOF: the current plan, `PLAN-AGENT-REVIEW-R10.md`, `.claude/agents/plan-agent.md`, `.claude/agents/orchestrator.md`, `PAYLOAD-CENSUS.md`, and `TRANSCRIPT-AUTH-EVIDENCE.md`.
- Evidence consistency: the Claude `prompt_id` hint and Codex adjacent-pair lazy-attestation premises remain consistent with `PAYLOAD-CENSUS.md:27-70` and `TRANSCRIPT-AUTH-EVIDENCE.md:18-67`; no evidence drift was found.

## Verdict

**NOT_READY_FOR_REDTEAM**

- BLOCKER: 2
- MAJOR: 1
- MINOR: 0

The current bytes mechanically repair the three Round-10 findings on their principal paths. Two newly exposed state/capacity holes still make admitted executions non-total: MAIN_AGENT human answers have no legal durable preimage, and archive-cap cancellation leaves the old checkpoint claimable. In addition, retained parameter answers have no plan-level capacity admission against the hard 2 MiB state limit.

## Mechanical re-test of every Round-10 finding

| Round-10 item | Round-11 result | Current-byte evidence |
|---|---|---|
| B1 parameter answers were irreversible hashes | **Principal PHASE_QUESTION / SUBAGENT parameter path closed; distinct MAIN_AGENT HITL hole remains (B1 below)** | `CollectedParameterAnswer` now carries canonical bytes, length/SHA, event/boundary and option ID (`FINAL-EXECUTION-PLAN.md:783-808`); terminal input, Work Agent and parameterized MAIN_AGENT bindings are explicit (`:809-827`); wait/scope snapshots retain the complete objects (`:1936-1949`, `:1975-2004`). |
| B2 TARGET_EXISTS product was incomplete/double-valued | **Closed** | The closed status enum has 28 unique values (`:415-429`). Expanding grouped first-column keys in the TARGET_EXISTS table yields each exactly once (`:2690-2711`): FAILURE_DRAIN is the byte-preserving BUSY row (`:2700`), CHECKPOINT_PRESENTATION/TRANSFER_READY is solely pre-claim cancellation (`:2705`), and TRANSFERRED alone is terminal diagnostic preservation (`:2706`). Construction rejects missing/duplicate keys (`:2713-2719`). |
| M1 cancelled checkpoint lacked an authoritative retained store | **Principal one-rename/store/read topology closed; archive-cap terminal behavior remains unsafe (B2 below)** | The source archive is a strict top-level store (`:1401-1418`, `:2515-2516`); pre-claim cancellation plus fresh routing is one source-state rename and writes no transfer journal (`:1442-1466`); target cleanup uses the stable source-state read and exact claim CAS (`:1454-1466`) and writes a bounded non-authorizing receipt (`:1515-1537`). |

## BLOCKER findings

### B1 - MAIN_AGENT human answers are promised verbatim but forbidden by the strict durable state

**Contract conflict**

- The strict `main_agent_execution` schema gives a completed HUMAN_WAIT step only `answer_sha256_or_empty`; it has no answer bytes, decoded length, option ID, answer event/boundary, or durable locator (`FINAL-EXECUTION-PLAN.md:1119-1125`).
- The next TOOL identity hashes `main_agent_evidence_root`, and that root likewise includes only `step_evidence_or_answer_sha256` (`:1127-1134`).
- The plan simultaneously says the full-input answer is stored verbatim before advancing the graph (`:1139-1145`). There is no legal field in the stated strict object in which to store it.
- After the answer has advanced the cursor, a scope snapshot is `APPROVED_PLAN_FRONTIER`, which carries frontier/evidence hashes but no MAIN_AGENT answer preimage (`:1958`). The `MAIN_AGENT_HITL` wait context contains only the unanswered wait's graph/cursor/schema/evidence fields (`:1980-1982`) and is no longer the active arm after the answer. The sole `continuation_context` definition is the committed-project-boundary route continuation (`:507-518`), not a repeatable MAIN_AGENT graph-answer store.

**Mechanical counterexample**

An admitted MAIN_AGENT phase is `TOOL-1 -> HUMAN_WAIT-H -> TOOL-2`. The user answers H with arbitrary valid UTF-8, `answer-wait` durably advances H to DONE, and the process crashes or a D/CANCEL-current restore occurs before TOOL-2 issues. The only strict durable value is `SHA256(answer)`. The controller cannot inject the exact answer into resumed TOOL-2 or prove which native answer event supplied it; adding bytes to the step violates the closed schema, while inverting the hash or scanning unspecified transcript history is impossible. The plan's mandatory TOOL-HUMAN_WAIT-TOOL lifecycle is therefore not recoverably executable.

**Minimum repair**

Define one bounded strict `MainAgentHumanAnswer` object analogous to `CollectedParameterAnswer`, containing canonical base64 bytes, decoded length/SHA, answer event/boundary and schema-derived option ID when applicable. Require the HUMAN_WAIT DONE arm to contain that complete object; bind its framed identity into `main_agent_evidence_root`, every successor TOOL input and the exact main-session injection. Carry the full object through FRONTIER, failure/delta and project-scope crash/restore projections. Add crash-after-answer-before-next-tool, project D restore, wrong-event/option, hash-only and transcript-reconstruction mutants. No prose-only “stored verbatim” rule may substitute for the strict schema.

### B2 - Archive-full cancellation leaves a PRESENTED checkpoint that still satisfies the claim precondition

**Contract conflict**

- On the ninth archive insertion or any cancellation-state overflow, the plan explicitly leaves the live checkpoint/project/route bytes unchanged and only sets `ROTATION_REQUIRED(CANCELLED_CHECKPOINT_ARCHIVE_FULL)` (`FINAL-EXECUTION-PLAN.md:1419-1423`). The assertion repeats that the live checkpoint remains unchanged (`:4162-4163`).
- `ROTATION_REQUIRED` blocks ordinary candidates in that source sid (`:2326-2332`), but a transfer claim is authorized by a fresh target event and cross-session controller.
- The exact claim arm requires only a source checkpoint in PRESENTED plus a clean target and matching capability; it does not require source `prompt_gate=ATTESTED`, archive headroom, or absence of the archive-full rotation reason (`:1544-1555`).
- The intended cancellation revocation does not occur until the one source rename that removes the live checkpoint (`:1442-1453`). The cap path deliberately does not perform that rename.

**Mechanical counterexample**

The source has eight retained cancellations and a ninth live PRESENTED checkpoint. A target has already staged the matching non-authorizing deferred claim. The source user sends an authenticated project directive/cancel; archive insertion hits the defined cap, so source becomes ROTATION_REQUIRED while the checkpoint remains PRESENTED. The target's next exact claim still satisfies the written claim pre-state and can enter PREPARED/CLAIM_COMMITTING, importing work after the user's cancellation event. Starting a new source session does not revoke that old checkpoint.

**Minimum repair**

Make cancellation capacity an admission invariant before a checkpoint can become ISSUED/PRESENTED: reserve enough serialized state for one complete terminal cancellation record and its required route/deny projection, and refuse to mint the checkpoint if that reserve or archive slot is unavailable. Also make claim validation explicitly reject a source rotation/cancellation-capacity marker. If online archive compaction remains forbidden, define a fixed reserved terminal-overflow cancellation slot (with its own strict hash/oneOf) that atomically revokes PRESENTED and is accepted by target cleanup; never leave PRESENTED as the cap result. Add eight-archive-plus-live checkpoint, 2 MiB cap-1/cap/cap+1, concurrent cancel/claim, pre-staged target claim and later fresh-target replay vectors. The only acceptable outcomes are cancellation-wins with no claim authority or CLAIM_COMMITTING-wins before cancellation; ROTATION+PRESENTED must be invalid.

## MAJOR finding

### M1 - Retained parameter answers have no aggregate admission budget against the 2 MiB session-state cap

**Contract conflict**

- A schema-valid Plan may contain 64 phases (`FINAL-EXECUTION-PLAN.md:652-663`).
- Each parameter queue may retain up to 65,536 decoded answer bytes, canonical base64 plus metadata, and every terminal phase keeps its complete queue until the whole approved execution is terminal (`:783-827`).
- `plan_admission` derives only project scope/admissibility; it has no answer-retention or serialized-state budget (`:922-943`).
- The session document has a hard 2 MiB limit (with only a 4 KiB deny reserve), and overflow rotates instead of completing the logical transition (`:2625-2632`). A checkpoint is forbidden while a parameter wait is active (`:823-826`).

**Mechanical counterexample**

A valid 32-phase sequential Plan declares enough bounded questions for each phase to collect 65,536 decoded bytes. The Plan/result itself fits its 262,144-byte schema cap, but retained canonical-base64 answers alone exceed 2 MiB before execution terminal. A later valid answer inevitably reaches the state overflow branch while its PHASE_QUESTION cannot checkpoint or transfer. Thus a PLAN_READY result accepted by `plan_admission` has no complete execution path even though every individual answer and queue obeys its stated bound.

**Minimum repair**

At Plan-result finalization, derive a strict `state_capacity_admission` from the manifest question schemas: include canonical-base64 expansion, complete answer-object/queue/wait/snapshot duplication, existing plan/task/state bytes, cancellation reserve and fixed deny reserve. Reject PLAN_READY/approval when the worst-case admitted execution cannot remain below the serialized-state cap, or define a recoverable bounded completed-answer compaction/external immutable store and update the retention invariant. Freeze cap-1/cap/cap+1 vectors across multiple parameterized phases, project snapshots, failure retry and checkpoint transfer; deleting the aggregate-budget check must turn red.

## Gate conclusion

The frozen bytes actually reviewed at SHA-256 `6ec6448028e2eb64f2c8821a1dc7348136819b0b46e330eacf4b68e4ddbf58c5` are **NOT_READY_FOR_REDTEAM** with **2 BLOCKER / 1 MAJOR / 0 MINOR** findings. Round-11 red-team dispatch and the exact-SHA user handshake must remain closed. No plan, runtime, evidence or other audit file was modified by this review.
