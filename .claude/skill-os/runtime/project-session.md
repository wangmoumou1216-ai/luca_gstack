# Project session contract

Load this file before deciding project identity or project authority, and before any project-scoped read, write, switch, creation, or cross-project reference. A framework-only explanation that makes neither decision may use the root's inline NO_PIN floor instead.

## Identity and pin

- A root session's `.claude/.session-project-<sid>` pin is its project binding truth. A Codex child can have a separate verified association delegated at native spawn from that root binding. Never infer or repair either from `docs/`, workflow-state, current-topic, cwd, task text, or an unverified parent SID.
- A framework/meta/audit task explicitly marked `NO_PIN` stays unbound. It may work only on framework-owned paths and must not read or write shared project aliases.
- Shared `docs/`, `.claude/workflow-state.yaml`, and `.claude/current-topic.txt` symlinks are display compatibility only. A pinned session is redirected to its pinned project's absolute targets.

## Codex child project association

When a pinned Codex session spawns a child during a native-attested active project turn,
the framework freezes the parent's validated project identity in a protected pending receipt.
The child receives its own association only after native SubagentStart claims that receipt and
the native child ID, parent ID, role, and transcript source match the claim. A direct spawn also
requires its exact native transcript call; an `exec`-wrapped spawn requires one unambiguous
protected pending receipt for the current parent turn and role. A descendant must pass the same
check for each parent-child edge. Delegation receipts live under the native-hook-writable,
ordinary-tool-unwritable `~/.codex/luca-child-project/` control plane. This association
is a project identity and scoped task delegation, not a copied human pin or a new human request.
`project-pin status` reports it as `CHILD_ASSOCIATED`; child project paths use the frozen project
root. A later parent project switch cannot retarget an existing child. Native cancellation or an
ended root activation invalidates the delegation; a normal parent turn `Stop` does not. A child
cannot use this association to call `project.sh switch/new` or make a human-only project decision.
Missing or inconsistent lineage denies scoped paths. Claude sidechains need their own native
identity check and do not gain a Codex association by sharing a session ID.
This release verifies child lineage only from the owner-protected native `~/.codex`
rollout source; writable provider homes such as `~/.luca/codex` are not association sources.
Codex hooks require the private reviewed guard at
`~/.codex/luca-child-project/source-guard/`. Each hook checks approved source before
launch; Node executes only verified bytes. Missing/changed source fails closed.
Stable commands retain exact trust hashes; legacy requires reload and trust.

`scripts/install-codex-source-guard.mjs` contract (usage: `README.md`):
Freeze `--print-review --root <source>`; review approves the original artifact SHA.
`--as-root <canonical-deployment-root>` remaps only one review root.
Install requires `--root`, `--reviewed-file`, `--reviewed-sha` and exact
`--expected-manifest-sha` (`ABSENT` only for initial install). Full source/JS/config/snapshot
maps must match before/after copy and at commit; no automatic approval.
`--preserve-other-roots` keeps other rows/snapshots without rescanning their source;
bootstrap/loader bytes must remain identical. A private exclusive lock covers exact CAS,
manifest-last atomic commit, fsync and readback; `--dry-run` writes nothing.
Interruption retains old or complete new manifest. Post-commit errors report authoritative
outcome; retry needs fresh CAS. Never steal locks by age: `--recover-lock-sha` plus exact
manifest CAS removes only the same private inode/nonce lock with an ESRCH dead owner;
live/EPERM/invalid refuse. Rollback: exact reviewed source, current CAS, other roots
preserved; stale CAS refuses.

## App-owned Host Launch

A newly launched Codex session may receive a verified existing-project binding from the Muse App's
private Host Launch broker. This is an app-owned launch transaction, not an agent-callable alternative
to `project.sh switch/new`. The broker accepts parent requests only from the verified App main process;
native hooks can only claim the frozen launch and session identity. An initial global launch remains
`NO_PIN`. The private launch journal and source grant live under the protected Codex installation,
outside the agent-writable framework checkout; their state-file reference is not itself a grant.
Legacy repository journals require an explicit reviewed upgrade with
`scripts/migrate-host-launch-journal.mjs --root <canonical-root> --plan <private-manifest>`,
then `--apply <private-manifest> --expected-sha256 <reviewed-manifest-sha256>`.
The command reauthenticates existing default-profile sources against native provenance and
unchanged cursor prefixes; it preserves source bytes and pin/state, copies only verified
receipts, and strips retired capability secrets from replay-only history. It never restores
live launches or silently reads the old journal as authority. Other source profiles are refused
and require separate review. Original files remain intact.

Before dispatch, the App must verify the three exact Host Launch hook commands, their current source
digest, the installed source guard, and Codex trust. The App must also fork the broker under that
protected source loader; an unprotected broker refuses to load framework authority.
`node scripts/codex-trust-hooks.mjs --host-launch` reviews and trusts this checkout's 11 exact
registered commands, including the three Host Launch entries. Full approved installation health
is required; `--source-only` cannot authorize trust.

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

## Host-selected initial binding

A trusted project-new-session gesture may select the initial project of a new Codex session.
The existing private host-launch broker authenticates its one-use launch capability and native
`SessionStart` (`source: startup`), validates the native source fence, and revalidates the frozen
profile and canonical project identity. Its internal initial-binding transaction then commits
the existing pin and selection receipt during `attach`, without a user prompt or tool call.
Only an untouched `NO_PIN` startup fence with no pending/consumed event or previous selection
is eligible. The transaction cannot create a project, restore a session, retarget an existing
binding, or be invoked through the public project CLI. Ordinary `project.sh switch/new` keeps
its native user-event gate.

The no-event commit is a broker-private closure over its live launch record, not an
exported project-controller API. The supported boundary is the App's private IPC,
launch capability, native fence and live profile revalidation in cooperative processes.
The parent-process JavaScript check is a misuse guard, not OS isolation: same-UID
arbitrary code can replace JavaScript builtins or directly write user-owned state.
Source integrity checks protect reviewed hook loading; they do not establish that
missing OS boundary. This contract must not be advertised as protection against a
compromised same-UID process. Such protection requires a separate OS trust boundary.

`HOST_BOUND` is an additive schema-v3 state with a version-1 `host_binding` receipt reference.
It means verified ownership, **not execution authority**: no human event, turn ID or active
tool permission is fabricated. The first genuine user event must still pass native attestation
before becoming `TURN_ACTIVE`. Claude cannot borrow the Codex fence. Global launches remain
`NO_PIN`; shared display links and project contents are unchanged. Readers from older builds
reject the new state rather than infer authority; no legacy pin migration is automatic.

The existing `nativeAttached` / `bindingReceipt` notifications and receipt readback are reused.
Duplicate attach/readback is idempotent; a committed receipt is never reissued as current after
selection drift. Failed startup binding blocks tools before consuming a user event and never
falls back to late binding at `PreToolUse`. Cancellation before commit leaves no binding;
cancellation after commit reports the durable result without undoing it. Updated hook sources
require the normal reviewed source-guard manifest activation before production use; tests must
not change the user's installed hooks, trust or credentials.

## Failure posture

Identity parsing is fail-closed. Reject empty, `.` or `..` segments and traversal. A dangling or legacy pin is handled only by the explicit migration/quarantine operation; read-only checks do not mutate it. If the required transaction is unavailable or stale, stop and request a fresh user turn rather than improvising a switch.

An orphaned `TURN_ACTIVE` binding may be explicitly lowered with `project.sh recover-session <session-id>` only when the canonical native source proves that a newer user turn superseded it and no candidate remains. Recovery re-fences to `NO_PIN`; it does not attest the skipped turn, switch a project, or alter project data and shared display aliases. An active current turn, damaged source, or pending candidate refuses recovery. If a dead state lock blocks recovery, first use the existing `inspect-state-lock` → `recover-state-lock` exact-owner-handle procedure; never steal a live lock or infer staleness from age. The human must send a fresh project request afterward to obtain new authority.

Re-observing an already attested active event is a pure optimistic read and must not create the project-state write lock. Concurrent writers wait only for a live owner within the bounded retry window; `STATE_LOCK_BUSY`, `STATE_LOCK_ORPHANED`, `STATE_LOCK_INVALID`, and `STATE_CHANGED` are distinct authority failures and must not be collapsed into an identity/epoch error. No path automatically removes an orphaned or malformed lock.

<!-- FILE_END: skill-os/runtime/project-session.md -->
