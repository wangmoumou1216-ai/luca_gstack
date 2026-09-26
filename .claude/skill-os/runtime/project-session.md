# Project session contract

Load this file before deciding project identity or project authority, and before any project-scoped read, write, switch, creation, or cross-project reference. A framework-only explanation that makes neither decision may use the root's inline NO_PIN floor instead.

## Identity and pin

- The per-session `.claude/.session-project-<sid>` pin is the only project binding truth. Never infer or repair it from `docs/`, workflow-state, current-topic, cwd, or another session.
- A framework/meta/audit task explicitly marked `NO_PIN` stays unbound. It may work only on framework-owned paths and must not read or write shared project aliases.
- Shared `docs/`, `.claude/workflow-state.yaml`, and `.claude/current-topic.txt` symlinks are display compatibility only. A pinned session is redirected to its pinned project's absolute targets.

## Project Gate

1. A named or semantically unique existing project selects that project without an extra confirmation.
2. An explicitly new project may be created from the public selection call. If the agent inferred that a vague request is a new project, ask one blocking confirmation first.
3. A request that names no project and needs real work under an inherited, never-confirmed project asks once before proceeding.
4. Pure framework/meta work remains `NO_PIN` and never switches merely to read a project as reference.

The agent calls exactly one public command: `./scripts/project.sh switch <canonical-name>` or `./scripts/project.sh new <canonical-name>`. Route-guard records neutral event evidence and name candidates only; it never selects a project or emits an executable transaction. Trusted PreToolUse attests the current native event and injects session id, transaction id, and expected epoch. The model must never invent or override those internal fields. A successful selection remains usable in the same event; it does not start a workflow, restore history, initialize project subsystems, or update shared display links.

## Cross-project reads

Cross-project dependency reads do not create a second binding. An explicit absolute path is handled by the normal filesystem sandbox and controlled-change policy and does not switch the session. Shared `docs/`/workflow/topic aliases still require a verified binding because their targets are display state. The legacy `scripts/project-read.mjs` broker remains a compatibility entry; merely reading or searching its source filename is not an invocation.

## Host read view

Hosts may read `node <gstack-root>/scripts/project-pin.mjs list --view host` and `node <gstack-root>/scripts/project-pin.mjs status --view host --session-id <trusted-native-session-id> [--operation <opaque-id>]` using an argv array with `shell=false`. These calls are pure projections: they do not attest, prepare, switch, recover, migrate, lock, initialize, or repair anything. `execution_authority` is always `NOT_PROVIDED`; displayed ownership never authorizes execution. A host must source the session id from its trusted native session mapping, never from renderer input, cwd, project text, or display links.

## Failure posture

Identity parsing is fail-closed. Reject empty, `.` or `..` segments and traversal. A dangling or legacy pin is handled only by the explicit migration/quarantine operation; read-only checks do not mutate it. If the required transaction is unavailable or stale, stop and request a fresh user turn rather than improvising a switch.

An orphaned `TURN_ACTIVE` binding may be explicitly lowered with `project.sh recover-session <session-id>` only when the canonical native source proves that a newer user turn superseded it and no candidate remains. Recovery re-fences to `NO_PIN`; it does not attest the skipped turn, switch a project, or alter project data and shared display aliases. An active current turn, damaged source, or pending candidate refuses recovery. If a dead state lock blocks recovery, first use the existing `inspect-state-lock` → `recover-state-lock` exact-owner-handle procedure; never steal a live lock or infer staleness from age. The human must send a fresh project request afterward to obtain new authority.

Re-observing an already attested active event is a pure optimistic read and must not create the project-state write lock. Concurrent writers wait only for a live owner within the bounded retry window; `STATE_LOCK_BUSY`, `STATE_LOCK_ORPHANED`, `STATE_LOCK_INVALID`, and `STATE_CHANGED` are distinct authority failures and must not be collapsed into an identity/epoch error. No path automatically removes an orphaned or malformed lock.

<!-- FILE_END: skill-os/runtime/project-session.md -->
