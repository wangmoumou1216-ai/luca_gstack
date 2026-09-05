# Project session contract

Load this file before a project-scoped read, write, switch, creation, or cross-project reference.

## Identity and pin

- The per-session `.claude/.session-project-<sid>` pin is the only project binding truth. Never infer or repair it from `docs/`, workflow-state, current-topic, cwd, or another session.
- A framework/meta/audit task explicitly marked `NO_PIN` stays unbound. It may work only on framework-owned paths and must not read or write shared project aliases.
- Shared `docs/`, `.claude/workflow-state.yaml`, and `.claude/current-topic.txt` symlinks are display compatibility only. A pinned session is redirected to its pinned project's absolute targets.

## Project Gate

1. A named or semantically unique existing project selects that project without an extra confirmation.
2. An explicitly new project may be created from the emitted transaction. If the agent inferred that a vague request is a new project, ask one blocking confirmation first.
3. A request that names no project and needs real work under an inherited, never-confirmed project asks once before proceeding.
4. Pure framework/meta work remains `NO_PIN` and never switches merely to read a project as reference.

Switching or creation uses only the complete current-turn transaction emitted by route-guard, including session id, transaction id, and expected epoch. Never hand-write a bare `project.sh switch/new` command. After a successful transaction, run the project-link check.

## Cross-project reads

Cross-project dependency reads do not create a second binding. Only an exact `只读引用:` or `只读引用目录:` directive can grant a turn-scoped text read; `本会话…` is the explicit session extension. Grants never authorize writes, raw shell traversal, symlinks, control-plane paths, images, PDFs, or MCP local-path consumption. Codex uses `scripts/project-read.mjs` for the granted path.

## Failure posture

Identity parsing is fail-closed. Reject empty, `.` or `..` segments and traversal. A dangling or legacy pin is handled only by the explicit migration/quarantine operation; read-only checks do not mutate it. If the required transaction is unavailable or stale, stop and request a fresh user turn rather than improvising a switch.

<!-- FILE_END: skill-os/runtime/project-session.md -->
