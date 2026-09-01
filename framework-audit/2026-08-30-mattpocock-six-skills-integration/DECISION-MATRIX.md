# Matt Pocock Six-Skill Integration — Decision Matrix

- Approved plan SHA-256: `1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9`
- Plan-recorded baseline: `4658595ac20ce544cb406657c70ba3259eb1f842`
- Observed bootstrap baseline: `72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c`
- Evidence policy: `final-master-v1`

## Capability ownership

| Imported capability | Luca form | Existing owner | Binding decision |
|---|---|---|---|
| `grilling` | independent method primitive | current caller | One human question at a time; no new workflow state. |
| `diagnosing-bugs` | canonical independent method | Orchestrator | Unexpected failure/regression loop; diagnose-only by default; return to the originating U-ID. |
| `resolving-merge-conflicts` | canonical independent method | Orchestrator | Real-conflict-only loop; inspect/propose before edit; never auto-stage, continue, commit, or push. |
| `to-spec` | thin facade | `tech-spec(conversation_synthesis)` | Project conversation into the existing tech-spec owner; do not create a second spec state. |
| `wayfinder` | thin planning facade | Plan Agent | Eligible only when huge, multi-session, and foggy are all true. |
| `implement` | thin execution facade | Plan Agent compile + Orchestrator execute | Compile only a frozen approved task-plan/spec into U-IDs; do not own execution state. |

## Architecture and authority decisions

| Surface | Selected contract | Rejected expansion |
|---|---|---|
| Routing | Project Gate → Plan complexity → multi/single skill; semantic map remains SSOT. | Skill-name-first shortcuts and a second flat router. |
| Workflow | `engineering-delivery` is optional; every skill remains standalone. | Graph as runtime dependency or state truth. |
| Triggering | Each capability proves direct, semantic, and internal reachability. | Name-only registration as evidence of behavior. |
| Controlled writes | Exact path/type/mode/blob manifest with pre/post CAS and durable receipt. | Broad directory authority, glob paths, implicit shell writes, or silent drift repair. |
| Git effects | Denied while active unless a one-use human-gated authorization binds the exact command SHA, repo identity, and cwd; consumption is witness-only CAS and records `EFFECT_UNKNOWN`. | Category-wide tokens, writer self-authorization, shared-index publication, implicit stage/commit/push. |
| Personal collision | Fresh-loader precedence first; conditional atomic adapter cutover with backup and rollback receipt. | Unconditional overwrite or cleanup of personal skills. |
| Publication | Isolated index, immutable commit OID, task-private ref, literal remote, exact old-OID lease. | Moving local `main`, reading the shared index, URL rewrite, or non-fast-forward overwrite. |

## Bootstrap wiring decision

Claude receives an explicit second `PreToolUse` guard in `.claude/settings.json`. Codex keeps the
already-trusted `.codex/hooks.json` command bytes unchanged and chains the controlled-change guard
inside the existing project-scope adapter path. This avoids any unapproved mutation of personal
Codex trust configuration while preserving deliberate deny and guard-failure semantics.

The controller serializes `prepare` with an advisory exclusive flock on the existing control-root
directory inode. The lock creates no additional state path and is released by the operating system
if its helper exits. Durable authority remains limited to the task directory's
`required-witness.json`, `active-context.json`, and `receipt.json`.

`scratch_root` must be an existing normalized realpath directory disjoint from the repository in
both ancestor directions. Every `apply_patch` requires an exact lowercase patch SHA binding.
Dormant U-003+ activation binds both bootstrap artifact hashes and the current bootstrap postimage
tuple set; its in-scope producer and activation check each run the exact M6-A01/M6-A02 gates and
compare output hashes. Codex adapter runtime throw/timeout paths consult the durable witness at the
top level. Syntax-byte corruption occurs before the adapter can execute and remains the explicit
FINAL-MASTER §0.4 compromised-hook exclusion; closing it would require unapproved trusted-command
and personal trust mutation.

## Evidence denominator

`IMPLEMENTATION-ALLOWLIST.txt` is the C-locale sorted, deduplicated union of repository-local paths
named by U-001 through U-007. The U-007 runtime candidate manifest excludes the complete plan
evidence directory. `final-master-v1` then adds exactly the seven evidence files named by the
approved plan. External bootstrap and controlled-state artifacts are not committed.
