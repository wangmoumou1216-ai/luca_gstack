# EA-ARCH architecture redteam

> Role: independent default-REFUTE architecture adversary  
> Branch observed: `main`  
> Target: frozen `audit-execution-plan.md` plus `architecture-decisions.md`  
> Verdict: **REFUTE**

The four ADRs select useful directions, but the current candidate is not yet an executable architecture
contract. I found **8 BLOCKER**, **11 MAJOR**, and **1 MINOR** finding. A named happy-path fixture is not
enough to close any item below; each closure test must run against the real primitive or a faithful
fault-injected fixture and produce machine-checkable evidence.

## BLOCKER findings

### AR-B01 — ADR-PIN-001 inherits a lock that can be stolen from a live owner

**Challenge.** How can two switches be linearizable when the selected design explicitly acquires the
"existing project-switch lock" but that lock treats age alone as proof of staleness?

**Evidence.** `architecture-decisions.md:48-56` reuses the existing lock and requires it to protect the
whole link-plus-pin transaction. `scripts/project.sh:134-155` removes the lock after 60 seconds using
mtime only; it records no owner PID/start token and performs no liveness check. A first process paused
for more than 60 seconds can therefore still be alive when a second process deletes its lock and enters
the same three-link critical section.

**Impact if true.** Link compensation and final pin commit can interleave, so a receipt may describe a
tuple that never existed atomically. This defeats the primary race-safety claim of ADR-PIN-001.

**Mechanical closure test.** Pause switch A for at least 65 seconds after lock acquisition, start switch
B, and assert B neither removes A's lock nor mutates any link or pin until A releases it. Then complete
both and verify a total order from lock-owner tokens and final tuple receipts. Also prove that a lock
whose recorded owner is dead can be reclaimed without a broad recursive delete.

### AR-B02 — the direct-bind path is outside the transaction lock

**Challenge.** What serializes route-guard's "already active project" bind with a concurrent switch?

**Evidence.** `architecture-decisions.md:48-56` puts switch/new under the project lock, while
`architecture-decisions.md:58-61` lets route-guard call `commitSessionPin()` after checking the active
link but never says that this bind acquires the same lock. The current transaction changes the three
links separately (`scripts/project.sh:157-166`). Thus the bind can observe the first replaced link while
the other two are old, commit a pin, and cause the switch's later pin CAS to fail. Link rollback does not
undo the separately committed direct bind.

**Impact if true.** A failed switch can leave the authoritative pin pointing at the transient target
while compatibility links were restored to the old target.

**Mechanical closure test.** Add a barrier after each of the three link replacements. At every barrier,
race an explicit-current-project bind for the same session. It must either serialize behind the switch
or fail without changing the pin; after both processes exit, all four resources must form one valid old
or new tuple. Run the same matrix when the switch later fails its pin CAS.

### AR-B03 — ADR-PATCH-001 contains an impossible offset invariant

**Challenge.** How can non-header ranges retain their original offsets after a short relative target
header is replaced with a longer redirected target?

**Evidence.** `architecture-decisions.md:103-110` requires header-only replacement and also requires
every non-header range to retain both its hash **and offsets**. Any header length delta shifts every
subsequent byte offset. A project redirect from a short relative path to an absolute or longer path is
the normal case, not an edge case.

**Impact if true.** A conforming implementation cannot satisfy the written contract, so the verifier
must either reject every redirected patch or silently weaken its own acceptance criterion.

**Mechanical closure test.** Use a two-file patch whose first target expands by at least 80 bytes. The
contract test must define and validate an explicit source-to-output span map, prove every non-header
byte sequence is identical and ordered, and avoid asserting numerically unchanged downstream offsets.
The frozen ADR must be changed before this test can legitimately pass.

### AR-B04 — Codex has no specified native binding from launcher role to repository agent

**Challenge.** What exact CLI argument or native event proves that `scripts/agent-launcher.mjs` selected
`plan-agent`, `work-agent`, or `oracle` on Codex rather than merely asking a root agent to imitate it?

**Evidence.** `architecture-decisions.md:162-178` promises repository-native Codex definitions and says
the launcher invokes the selected native CLI. `codex exec --help` in the audited runtime has no
`--agent` option; it exposes prompt/config/sandbox options only. Repository `.codex/agents/*.toml`
definitions are available to an agent's internal spawn mechanism, whereas `-C` selects the working
root. The ADR simultaneously requires isolated working roots for smoke tests but does not specify how
those roots discover the repository-local role definitions or how the launcher reaches the actual
child result.

**Impact if true.** A root Codex session can return a plausible role-shaped answer with no native role
dispatch. Distinct root session IDs would make the four-role smoke test look green without proving any
of the new TOML agents are callable.

**Mechanical closure test.** For each Codex role, require native JSONL to contain a spawn event naming
the exact registered `agent_type`, a distinct child identity, and a result event linked to that spawn.
Rename/remove the TOML before a negative run: launch must fail before accepting model output. Repeat
from the claimed isolated root and prove the native config source for the role is the approved frozen
file, not prompt prose.

### AR-B05 — receipt hashes have no anti-forgery trust root

**Challenge.** Why should a verifier trust a receipt and native log when the same write-capable agent
can create both, recompute both hashes, and label the issuer "trusted"?

**Evidence.** `architecture-decisions.md:174-185` specifies nonce generation, mode `0600`, hashes, and a
"trusted issuer", but it defines no signing key, OS-owned launch registry, append-only external channel,
or verifier trust anchor outside the child/agent writable surface. File mode `0600` excludes other Unix
users; it does not exclude the current agent process running as Luca. The audit's future verifier is
itself stored in the same writable repository.

**Impact if true.** A same-thread synthetic log plus matching receipt still passes every listed field
check, so U-302's central requirement—preventing self-issued string evidence—remains unsatisfied.

**Mechanical closure test.** Starting from no native run, synthesize a structurally valid launch event,
child event, result event, fresh IDs/times, output, and all matching hashes using the normal agent UID.
Verification must reject it because it lacks provenance from a trust anchor the child could not write.
Then mutate and rehash a genuine log; that must also fail. Only an unmodified real launch may pass.

### AR-B06 — non-empty global skill directories cannot be atomically replaced by the stated primitive

**Challenge.** What concrete filesystem operation performs the promised atomic swap of the current
real, non-empty skill directories?

**Evidence.** `architecture-decisions.md:232-239` stages candidates on the same filesystem and then says
each candidate is atomically swapped into its exact live name. The audited targets
`~/.claude/skills/codebase-design`, `~/.claude/skills/resolving-merge-conflicts`,
`~/.agents/skills/tdd`, and `~/.agents/skills/systematic-debugging` are real directories, not symlinks
(verified by `stat -f '%HT %N'`). POSIX rename cannot replace an existing non-empty directory. Node
22.23.1 exposes `fs.renameSync` but no rename-exchange primitive. Renaming old→backup and
candidate→live is two operations with an observable missing-name interval.

**Impact if true.** `GLOBAL_SWAPPED` cannot meet its atomicity claim, and concurrent Claude/Codex
catalog readers can observe a missing or half-transitioned global capability.

**Mechanical closure test.** Against faithful non-empty directory fixtures on the same APFS volume,
run a tight concurrent observer while swapping and inject process death between every syscall. The
observer must always resolve exactly the complete old tree or complete new tree—never missing,
mixed, or `ENOTEMPTY`—and recovery must restore the old inode/bytes. The test must name the actual OS
primitive used.

### AR-B07 — the H4 pause occurs after a commit in a shared dirty checkout

**Challenge.** How is rollback deterministic if the transaction pauses for human approval after
committing into a checkout that other sessions and the user continue to edit?

**Evidence.** `architecture-decisions.md:230-237` performs `REPO_COMMITTED` and then pauses at H4.
`architecture-decisions.md:251-256` later relies on exact `git revert`. The current checkout already
contains user-owned dirty/untracked work (including the modified observability file and several
untracked files). More importantly, the ADR selects the implementation checkout itself and provides
neither an isolated worktree nor an exclusive repository lease across the unbounded H4 wait. This
also conflicts with the existing FUSION contract that changes remain in a worktree and main stays
unchanged until gates pass (`.claude/skill-os/evolution/FUSION-RUNBOOK.md:3-8`).

**Impact if true.** An intervening commit or edit to an owned path can make CAS or `git revert` fail,
or make reversal overwrite work created after H4 began. The promised reverse-DAG compensation then
degrades to `BLOCKED_MANUAL_RECOVERY` during the normal concurrent-use case.

**Mechanical closure test.** Start with unrelated staged, unstaged, and untracked user work; reach
`REPO_COMMITTED`; then add an unrelated commit and modify one transaction-owned path before rejecting
H4. Recovery must preserve every pre-existing and intervening byte/commit, remove only transaction
effects, and finish without conflict. Repeat from two concurrent lucagstack sessions. If the contract
instead blocks overlap, prove it blocks before its first mutation.

### AR-B08 — the activation journal is called signed without a signer or verification root

**Challenge.** What makes the activation journal authoritative rather than an editable set of hashes?

**Evidence.** `architecture-decisions.md:223-226` calls the journal "signed/hashed", but no signing
identity, key custody, signature field, monotonic sequence authority, or external append-only store is
defined. The journal and its verifier are implementation-package files writable by the same UID that
performs activation. This is the same forgery boundary left open in AR-B05, now governing rollback
commands and CAS evidence.

**Impact if true.** A modified compensation target or fabricated terminal state can be rehashed and
accepted. Recovery may then mutate the wrong global target or claim `VERIFIED` without executing the
recorded transitions.

**Mechanical closure test.** Copy a real partial journal, alter one compensation target and its
expected hash, recompute every ordinary hash/chain field, and run the official verifier. It must reject
the journal due to a trust proof unavailable to the activation process/child. Truncation, event
reordering, duplicated sequence numbers, and forked histories must also fail.

## MAJOR findings

### AR-M01 — pin rename durability stops before the containing directory is synced

**Challenge.** Is "pin commit" intended to survive a host crash, or only to be atomically visible in a
live process?

**Evidence.** `architecture-decisions.md:31-34` fsyncs the temporary file and renames it, but does not
require fsync of the containing `.claude` directory after rename. The directory entry is therefore not
covered by the stated durability sequence.

**Impact if true.** A process can report a committed pin and release the switch lock, yet the rename can
be lost after a crash, leaving links new and pin old/missing on restart.

**Mechanical closure test.** Instrument filesystem calls and assert the order is write→file-fsync→CAS
recheck→rename→directory-fsync→read-back. A fault immediately after rename must not be classified as a
durably committed transaction unless recovery can deterministically reconcile the tuple.

### AR-M02 — `new` lacks an explicit under-lock reservation contract

**Challenge.** What prevents two sessions from both passing "target does not exist" and writing the
same new project before either owns the switch lock?

**Evidence.** ADR-PIN validates that `new` targets do not exist (`architecture-decisions.md:36-39`) but
does not state that existence check, directory reservation, and skeleton creation are one under-lock
operation. The current implementation creates the directory at `scripts/project.sh:204-210`, while
`activate_project()` runs `ensure_project` before acquiring the lock at `scripts/project.sh:157-162`.

**Impact if true.** Two `new` transactions can co-own and edit one directory; loser recovery can move
content produced by the winner or by the user.

**Mechanical closure test.** Barrier both processes after the nonexistence check, then release them
together for the same multilingual name while a third process creates a sentinel file. Exactly one
transaction may reserve/succeed; the loser must make zero mutations, and the sentinel must stay at its
original user-visible path.

### AR-M03 — a redirected patch is never proven executable by the real Codex patch consumer

**Challenge.** Does the real Codex patch tool accept the guard's redirected target representation?

**Evidence.** `architecture-decisions.md:103-108` rewrites a target header with the guard-provided path.
The guard currently redirects project-scoped targets to absolute paths (`project-scope-guard.mjs:95-123`),
while the future parser rejects absolute escapes on input (`architecture-decisions.md:94-98`). The
mechanical proof at `architecture-decisions.md:125-133` checks parsing/redirection/body hashes but never
states that the resulting envelope is accepted by the actual Codex file-change engine and lands only
in the pinned, non-active project.

**Impact if true.** Static adapter tests can pass while every legitimate pinned-project patch fails at
tool execution—or the tool normalizes the target differently from the guard.

**Mechanical closure test.** In an isolated writable root with the display links pointing to project A
and the session pinned to project B, send a real Codex `apply_patch` event through the installed hook
and real file-change consumer. Assert exit success, byte-identical body, a change only in B, no change
in A, and native PostToolUse accounting for the exact target set. Run absolute, relative traversal,
space, Chinese, and case-variant targets.

### AR-M04 — header validation has a check/use race through symlinks

**Challenge.** What stops a path component from changing after the synthetic Write check but before the
actual patch write?

**Evidence.** ADR-PATCH performs guard calls first and applies the original tool later
(`architecture-decisions.md:103-110`). The current classifier is string-based
(`project-scope-guard.mjs:100-126`); it does not retain file descriptors or lock path components. A
static symlink-escape fixture (`architecture-decisions.md:132`) does not cover a concurrent symlink
swap after validation.

**Impact if true.** An allowed target can resolve into a protected or wrong-project tree at write time,
despite every preflight check passing.

**Mechanical closure test.** Pause after all target checks, atomically swap an allowed ancestor symlink
to each protected/project-scoped destination, then release the real patch write. No protected or wrong
project byte may change. Repeat the swap between targets of a multi-file patch.

### AR-M05 — parent/child lineage is not defined equivalently across harnesses

**Challenge.** What native relation does `parent_session_id` certify on Claude and on Codex?

**Evidence.** `architecture-decisions.md:174-184` requires distinct parent and child IDs and native
launch/session/result events. Claude's CLI `--agent` selects the agent for the **current session**;
Codex repository roles require an internal subagent spawn. The ADR does not define whether Claude's
launcher session is itself the child, where its native parent event comes from, or how that relation is
made equivalent to Codex's root→subagent lineage. Merely passing an arbitrary parent ID into the
launcher proves no native parentage.

**Impact if true.** Receipts can be fresh and distinct yet belong to unrelated top-level sessions,
weakening independence and role-chain evidence.

**Mechanical closure test.** For both harnesses, derive parent and child solely from native events and
verify one event graph edge binds them to the same launch nonce/role. A caller-supplied random parent
ID with a genuine unrelated child run must fail.

### AR-M06 — the declared edit surface omits active Claude model-routing consumers

**Challenge.** How can "no definition pins a model name" and tier-only native dispatch become true
without editing every active caller that still mandates aliases?

**Evidence.** `architecture-decisions.md:169-172` removes model-name pins, and its owned surfaces at
`architecture-decisions.md:187-199` omit `.claude/agents/orchestrator.md`. That file still mandates
`model: fable`/Opus fallback and explicit Agent-tool model parameters at lines 150-151 and 361-378.
`.claude/agents/plan-agent.md:6-7,248-251` says the same, while
`.claude/agents/quality-gate.md:8` still pins `model: opus`. The current routing truth source itself
maps Claude tiers to aliases at `model-routing.yaml:33-37,85-94`.

**Impact if true.** Claude and Codex follow different tier semantics after the claimed parity change,
and future checker text can still force the removed alias behavior.

**Mechanical closure test.** Build a complete static call graph from every agent/skill/workflow dispatch
consumer. Delete the old alias strings in a mutation fixture and require all routing/parity checks to
stay green; reintroduce any direct `model: fable|opus|sonnet|haiku` dispatch outside the one truth-source
projection and require the checker to fail with the exact consumer path.

### AR-M07 — `{{...}}` rejection is neither a complete nor a sound work-packet validator

**Challenge.** Why is token absence proof that every required work-packet field was materialized?

**Evidence.** `architecture-decisions.md:158-160` defines only a lexical placeholder guard. The actual
template enumerates many semantic required fields (`work-agent-template.md:12-35`). A producer can
delete an unresolved placeholder, leave an empty or wrong-typed field, and contain no `{{...}}` token.
Conversely, legitimate source snippets can contain brace templates and be rejected.

**Impact if true.** A write-capable work agent may run with missing ownership/protected paths/done
criteria, while valid templating tasks are falsely blocked.

**Mechanical closure test.** For every required field, create a packet with that field absent, empty,
wrong-typed, duplicated, or semantically contradictory and require pre-spawn failure. A fully valid
packet containing literal brace-template source as data must pass without weakening the missing-field
tests.

### AR-M08 — global targets become directly reachable before ledger/verification

**Challenge.** Is the system willing to expose new bytes immediately at `GLOBAL_SWAPPED`, before the
ledger commit and live verification?

**Evidence.** `architecture-decisions.md:238-243` assumes repository routes remaining unreachable is
sufficient containment. But current targets are global skill locations discoverable/invokable directly
by their harness, independently of the lucagstack route map. The installed-pins registry explicitly
names such live paths (`installed-pins.yaml:20-75`).

**Impact if true.** Another session can invoke partially activated or unverified behavior during the
window between global swap and `VERIFIED`; rollback cannot erase actions it already performed.

**Mechanical closure test.** Hold the activation after the first and after the final global swap. From
fresh concurrent Claude and Codex sessions, enumerate and directly invoke every affected skill name.
The new candidate must remain unreachable until the contract's declared exposure point, or the ADR
must explicitly classify `GLOBAL_SWAPPED` as live exposure and make that exact risk part of H4.

### AR-M09 — dirty-path inventory is not an explicit overlap gate

**Challenge.** What happens when a transaction-owned file is already modified by the user at
`PREPARED`?

**Evidence.** `architecture-decisions.md:223-235` records the dirty-path set and promises an exact
dormant commit, but does not state that overlap between dirty paths and the implementation/ledger file
sets is a pre-mutation BLOCK. "Commit only this path list" is not sufficient: Git can commit the current
contents of a named path, including the user's pre-existing changes.

**Impact if true.** The transaction can absorb user work into its implementation commit or later
restore/revert over it, violating the stated preservation guarantee.

**Mechanical closure test.** Pre-modify and stage one line in every class of owned file, with an
adjacent transaction edit. `PREPARED` must block before staging/global backup creation and preserve
index and worktree bytes exactly; a path-only commit that captures the user hunk is an automatic fail.

### AR-M10 — the named registration checker does not validate external target existence

**Challenge.** Which preactivation gate proves both Claude and Codex external targets exist and resolve
to the approved bytes?

**Evidence.** ADR-ACT owns `scripts/check-registration-sync.mjs`
(`architecture-decisions.md:258-266`). That checker extracts only `invoke: "/name"` rows at
`check-registration-sync.mjs:21-23`; external engineering rows in
`skill-routing-map.yaml:300-324` have `skill` and `hint` but no `invoke`. It therefore passes while the
Codex-side `codebase-design` and `resolving-merge-conflicts` targets are absent—the present audited
state.

**Impact if true.** `LEDGER_COMMITTED` can activate a route that works in Claude and remains orphaned in
Codex, recreating the exact single-harness false-green this cycle is meant to prevent.

**Mechanical closure test.** In isolated homes, remove each Claude target and each Codex target one at a
time, break a symlink, and replace a target with wrong bytes. The preactivation command must fail before
`GLOBAL_SWAPPED`, naming harness, route, expected hash, and actual resolution. Restoring both exact
targets must pass.

### AR-M11 — post-commit compensation is underspecified for intervening history

**Challenge.** What does "exact git revert" mean if the dormant or ledger commit is no longer tip and an
intervening commit touches the same path?

**Evidence.** `architecture-decisions.md:251-256` promises reverse-DAG compensation with `git revert`
after commit, while allowing an unbounded H4 pause and defining no branch lease. Git revert is a new
merge operation against current state, not restoration of a path snapshot, and can conflict.

**Impact if true.** The rollback program is nondeterministic precisely when concurrent user work is
present, forcing manual recovery after live/global mutation.

**Mechanical closure test.** After each repository commit state, add one nonconflicting and one
conflicting intervening commit from a second session, then inject failure at every later transition.
Recovery must preserve intervening commits and bytes while removing only activation effects; any
prompt, conflict marker, stash, reset, or lost hunk fails the test.

## MINOR finding

### AR-N01 — the agent-definition count is internally ambiguous

**Challenge.** Which "seven agent definition files" are actually new or revised?

**Evidence.** `architecture-decisions.md:149-167` names four Claude and four Codex definitions (eight),
while `architecture-decisions.md:187-190` says "the seven agent definition files named above". Existing
versus revised status does not resolve the ownership set unambiguously because the same section also
requires changes to existing plan/quality behavior.

**Impact if true.** A work package can omit one definition while still claiming the prose ownership
count is satisfied.

**Mechanical closure test.** Replace the prose count with an explicit path/action manifest and have the
candidate-plan validator compare it to the exact role×harness matrix; adding or removing any one path
must fail.

## Verdict

**REFUTE.** ADR-PIN-001 is not linearizable under its selected lock/direct-bind paths; ADR-PATCH-001 has
an unsatisfiable invariant and lacks a real redirected-write proof; ADR-AGENT-001 has no deterministic
Codex role-binding path or anti-forgery trust root; ADR-ACT-001 cannot atomically swap the current
directory topology and cannot guarantee rollback across an H4 pause in a shared dirty checkout.

EA-ARCH should return PASS only after every BLOCKER and MAJOR above has a frozen contract change plus a
passing mechanical closure receipt. No implementation or live activation was performed by this review.

## Revision R1 closure re-review

> Reviewed target: `architecture-decisions.md`, status
> `H2 DELEGATED / REVISION R1 AFTER EA-ARCH REFUTE`  
> Review rule: the architecture may remain future work, but its selected mechanism, ownership, trust
> boundary, and mechanical proof must be internally executable without an unresolved alternative.

| Finding | R1 status | Closure evidence / remaining defect |
|---|---|---|
| AR-B01 | **CLOSED** | R1 replaces age-only stealing with PID + process-start-token + host + nonce + heartbeat ownership, permits reclaim only after positive death proof, and adds the >60-second live-owner test (`architecture-decisions.md:42-47,105-106`). |
| AR-B02 | **CLOSED** | Direct bind now acquires the same owner-token lease as switch/new, so it cannot observe or commit a transient tuple (`architecture-decisions.md:46-47,71-75,105-106`). |
| AR-B03 | **CLOSED** | R1 replaces the impossible fixed-offset invariant with an explicit source→output span map and cumulative header-delta accounting, with the required 80-byte expansion fixture (`architecture-decisions.md:132-141,180-181`). |
| AR-B04 | **CLOSED** | Codex no longer relies on role-shaped root output: the frozen isolated checkout must yield a native dispatcher→named `agent_type` spawn→distinct child→result edge; missing/renamed definitions are negative controls (`architecture-decisions.md:233-240,287-293`). |
| AR-B05 | **CLOSED within the declared trust boundary** | The parent-only ephemeral Ed25519 key, child-excluded receipt directory, signed event chain, out-of-band expected fingerprint, attacker-key negative control, and explicit exclusion of an arbitrary unsandboxed Luca process close delegated-child/self-authored-prose forgery (`architecture-decisions.md:242-260,287-292`). The verifier must receive the launcher tool result directly, not a fingerprint copied from model prose. |
| AR-B06 | **CLOSED** | R1 selects the concrete macOS `renameatx_np(..., RENAME_SWAP)` primitive, same-filesystem candidates, no two-rename fallback, a compiled helper, and tight observer/crash fixtures (`architecture-decisions.md:333-339,371,389-390`). |
| AR-B07 | **CLOSED** | Candidate commits are authored in a private worktree; H4 waits without changing shared state; cutover requires a clean canonical checkout plus a bounded owner-token lease. Dirty or concurrent state blocks before shared mutation (`architecture-decisions.md:321-345,382-394`). |
| AR-B08 | **OPEN — BLOCKER** | Ed25519 closes journal forgery, but the activation private key exists only in supervisor memory (`architecture-decisions.md:309-316`). R1 simultaneously promises crash injection/recovery after live exchange (`architecture-decisions.md:356-362,381,387-390`). A hard supervisor crash loses the only key authorized by the H4 fingerprint, so a fresh recovery process cannot append an authenticated compensation/result event or complete the claimed signed journal. See residual blocker R1-B1 below. |
| AR-M01 | **CLOSED** | Pin commit now includes containing-directory fsync and ordered filesystem-call proof (`architecture-decisions.md:31-35,109-110`). |
| AR-M02 | **CLOSED** | `new` now takes the shared lease before its nonexistence test, uses an exclusive owner-marked staging directory, rechecks absence, and has concurrent creator/sentinel fixtures (`architecture-decisions.md:66-69,107-108`). |
| AR-M03 | **CLOSED** | Guard-generated absolute output is tagged private transformation state and must pass the real Codex file-change consumer; the A-display/B-pin canary asserts B-only mutation and native PostToolUse inventory (`architecture-decisions.md:143-146,182-183`). |
| AR-M04 | **CLOSED for the explicitly bounded cooperative threat model** | R1 rejects symlink ancestry, records inode vectors, holds a project-write lease through the real patch, rechecks on PostToolUse, denies critical lease errors, and excludes a malicious same-UID hook bypass (`architecture-decisions.md:152-159,184-186`). The live fixture must keep the lease owner alive across the separate PreToolUse/tool/PostToolUse processes and cover tool failure cleanup. |
| AR-M05 | **CLOSED** | Both harnesses now require native parent→spawn→child lineage; caller-supplied IDs and top-level imitations have no evidentiary value (`architecture-decisions.md:233-240,256-260,287-291`). |
| AR-M06 | **CLOSED** | R1 adds the previously omitted orchestrator and both existing quality/plan definitions to ownership, and mandates a complete caller call graph with direct aliases rejected outside the one projection (`architecture-decisions.md:226-231,262-283`). |
| AR-M07 | **CLOSED** | A versioned strict work-packet schema replaces brace scanning; required nonempty fields, cross-field checks, negative type/absence cases, and legitimate brace-source data are explicit (`architecture-decisions.md:211-217,287-293`). |
| AR-M08 | **CLOSED as an explicit H4 risk boundary** | R1 states that direct global exposure begins at `GLOBAL_SWAPPED`, not ledger activation, and makes H4 authorize that bounded exposure after isolated tests (`architecture-decisions.md:333-348`). The H4 card and failure fixtures must interpret the boundary as the **first exchange syscall**, since a multi-target vector is not exchanged in one syscall. |
| AR-M09 | **CLOSED** | Every staged, unstaged, or untracked canonical-checkout path now blocks before backup/staging; transaction commits occur only in the isolated worktree (`architecture-decisions.md:321-330,382-383`). |
| AR-M10 | **CLOSED** | A dedicated external parity checker is now an owned surface and must fail on missing, broken, or wrong-hash Claude/Codex targets before cutover (`architecture-decisions.md:372,391-392`). |
| AR-M11 | **CLOSED within the declared cooperative boundary** | Repository reversal occurs only under the cutover lease with exact tip/index/worktree CAS; global targets exchange back before an uncooperative conflict is reported as manual recovery, so user bytes are not overwritten (`architecture-decisions.md:333-362,393-394`). |
| AR-N01 | **CLOSED** | R1 replaces the ambiguous count with eight explicit Claude/Codex definition path-actions (`architecture-decisions.md:262-272`). |

### R1-B1 — ephemeral activation signing authority cannot survive the crash it must recover from

**Severity: BLOCKER.** This is the unresolved part of AR-B08, not a request for a third activation
architecture. R1 makes the H4-approved public fingerprint the sole journal trust anchor while keeping
its private key only in volatile supervisor memory. That is sound against forgery while the supervisor
lives, but incompatible with authenticated recovery after `SIGKILL`, process crash, or host restart
once commit A or any global exchange has happened. A new process can read and verify the journal but
cannot sign the compensation events or terminal restored-state receipt under the H4-approved key.

**Impact if true.** The first real crash after global exposure leaves either new global bytes live or an
unsigned/unverifiable recovery trail. "The journal itself is the rollback program" and the crash-
injection/idempotent-recovery acceptance statements can both go green only by silently weakening the
signature contract.

**Exact mechanical closure.** Run the real activation supervisor in an isolated APFS fixture and
`SIGKILL` it at all of these barriers: after canonical fast-forward A; after each individual
`RENAME_SWAP`; after canonical fast-forward B; and during live verification. Start recovery in a new
process with no access to the dead process memory and provide only the frozen journal, exact backups,
and the H4-approved public fingerprint/chain head. The recovery must:

1. verify the pre-crash chain without trusting a journal-embedded replacement key;
2. exchange every exposed global target back before repository repair;
3. preserve all user bytes and obey the recorded CAS conditions;
4. emit an authenticated, non-forking compensation chain and terminal restored-state receipt that the
   original H4 trust anchor accepts; and
5. pass the same check on a second idempotent replay.

If any kill point requires the lost ephemeral private key, an unsigned exception, a new unapproved
fingerprint, or manual guessing, R1-B1 remains open.

## Revision R1 terminal verdict

**REFUTE — 1 BLOCKER remains.** Revision R1 materially closes 19 of 20 original findings and selects
one coherent architecture for owner-token leases, span-preserved patching, native role edges,
out-of-band receipt trust, APFS directory exchange, isolated H4 cutover, model call-graph parity,
strict work packets, direct-exposure authorization, external target parity, and dirty-work blocking.
It cannot receive EA-ARCH PASS until crash recovery is cryptographically continuous with the
H4-approved activation journal after the supervisor and its memory are gone.

## Revision R2 focused re-review

> Reviewed target: `architecture-decisions.md`, status
> `H2 DELEGATED / REVISION R2 AFTER EA-ARCH REFUTE`  
> Scope: prior residual `R1-B1`, plus only BLOCKER-class regressions introduced by its R2 repair.  
> Default posture: REFUTE until the selected primitives are supported by the actual macOS security
> model and the crash/fork tests have one unambiguous on-disk state machine.

### R1-B1 closure result

**Conceptual repair: correct. Mechanical closure: not yet achieved.** R2 fixes the logical key-loss
error: the volatile preparation signer no longer owns post-H4 recovery. The H4 card binds both signer
epochs, `CUTOVER_CLAIM` hands authority to a persistent P-256 recovery signer, the helper owns sequence
and signing after H4, and `RECOVERY_CLAIM` lets a fresh process resume from a durable head
(`architecture-decisions.md:309-346`). The expanded fault matrix now names `SIGKILL`, each exchange,
commit B, verification, host restart, and concurrent recovery (`architecture-decisions.md:429-436`).

That is the right two-epoch trust shape. It does not pass yet because the exact macOS key isolation
primitive named by R2 is not a supported API combination, and because the durable event protocol still
contains an unresolved `rename/append` and claim-versus-effect gap. Those are mechanical blockers, not
requests for another activation architecture.

### R2-B1 — the named Secure Enclave “designated-requirement ACL” is not a demonstrated macOS primitive

**Severity: BLOCKER.**

**Evidence.** R2 requires a Secure Enclave P-256 key “with a designated-requirement ACL that permits
only that helper” (`architecture-decisions.md:311-316`). Apple documents two different keychain access
systems:

- Secure Enclave keys use `kSecAttrAccessControl` / `SecAccessControl` with `privateKeyUsage` and the
  data-protection keychain ([Protecting keys with the Secure Enclave](https://developer.apple.com/documentation/Security/protecting-keys-with-the-secure-enclave)).
- The classic macOS trusted-application ACL is `kSecAttrAccess` / `SecAccess`; Apple states that it is
  mutually exclusive with `kSecAttrAccessControl` and does not apply to data-protection/synchronizable
  items ([`kSecAttrAccess`](https://developer.apple.com/documentation/security/ksecattraccess),
  [`kSecAttrAccessControl`](https://developer.apple.com/documentation/security/ksecattraccesscontrol)).
- Secure Enclave items are isolated between apps through code-signing-protected keychain **access
  groups**, not by attaching a classic designated-requirement ACL to the same item
  ([Sharing access to keychain items](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps)).

R2 also asserts that children lack helper IPC capability (`architecture-decisions.md:340`) but freezes
only the helper's requirement/hash. It does not name the signed app-like bundle, entitlements/access
group, authorized supervisor/recovery client requirements, XPC peer-validation rule, service
registration, or post-restart launch path. Apple provides peer code-requirement checks for XPC, but the
ADR does not select or bind one. On the audited host the hardware/tool preconditions exist (Apple M4
Pro, `clang`, `codesign`, and Keychain tooling), but the local code-signing inventory shows no evidenced
Developer Team identity; prose saying “code-signed” therefore does not prove the required data-
protection-keychain entitlement path is available.

**Impact if true.** The helper either cannot create/reopen the key with the declared controls, or a
same-user process outside the intended helper can obtain signing service access. In the first case H4
is permanently blocked; in the second case the recovery signer is not the trust root the H4 card claims.

**Exact mechanical closure.** Before this ADR can pass, run an isolated, reversible native spike using
the exact future bundle, signature, entitlements, Keychain query, and XPC service shape:

1. create a transaction P-256 signing key backed by Secure Enclave and persist only its supported
   opaque/keychain reference;
2. terminate the helper, relaunch the exact H4-hashed helper, and sign/verify the next chain event;
3. cold-restart the host, unlock at the explicitly declared boundary, relaunch, and sign with the same
   public fingerprint;
4. prove that an unsigned same-UID binary, a copied/modified helper, a differently signed binary, the
   delegated Claude child, and the delegated Codex child cannot query the key or invoke signing IPC;
5. prove that only the exact authorized supervisor/recovery client identities can submit a request,
   and that a wrong peer requirement is rejected before journal mutation; and
6. dump the effective signature/entitlements/access-group metadata and verify it against the H4 bundle.

The test must use supported access-group and XPC peer-identity APIs; a fixture that merely calls its
own authorization field “ACL” does not close this finding. It must cleanly remove the transaction key,
service registration, ledger, and test bundle after proof, without touching unrelated Keychain items.

### R2-B2 — the durable ledger and external-effect event semantics are still not single-valued

**Severity: BLOCKER.**

**Evidence.** R2 says the helper durably appends an event **before** returning authorization, using
“file-fsync then atomic rename/append protocol then directory-fsync”
(`architecture-decisions.md:326-331`). `rename`-of-a-new-image and append-to-an-existing-log are distinct
crash-consistency protocols; the slash leaves the core persistence primitive unresolved. More
importantly, the helper writes the signed edge before the supervisor/recovery client performs the
Git or global filesystem effect. R2 defines signer claims (`CUTOVER_CLAIM`, `RECOVERY_CLAIM`) but does
not define, for every mutating edge, whether the durable record is an authorization intent or an
observed completion. Its fault list kills the supervisor after external effects
(`architecture-decisions.md:429-433`) but omits both critical windows: signed append→reply/action, and
completed action→signed observed completion.

**Impact if true.** After a lost reply or hard kill, the unique signed head can be ahead of physical
state, behind it, or ambiguously interpreted as either. Two recovery clients can agree on one ledger
head and still choose different “remaining reverse DAG” edges. Signature validity then proves only that
the helper wrote bytes, not which external mutation occurred.

**Exact mechanical closure.** Freeze one on-disk ledger format and one syscall sequence—no
`rename/append` alternative—and give every mutation record an unambiguous schema state separating
authorization from independently observed completion. Then run syscall-level fault injection:

1. kill before/after temporary write, file fsync, head publication, directory fsync, reply write, each
   external mutation, and completion observation;
2. inject torn/truncated records, stale head pointers, duplicated sequence, reordered files, and a
   validly signed event whose claimed external state disagrees with actual hashes/inodes;
3. after each kill, start two recovery clients concurrently and require exactly one allowed next edge
   or one byte-identical replay plus one CAS failure—never two interpretations or a fork;
4. prove recovery chooses from signed intent **and** independently observed exact state, never from the
   event name alone; and
5. after host restart, prove the canonical head is either wholly before or wholly after the attempted
   append and that idempotent recovery reaches the same authenticated terminal receipt twice.

Until this test has one expected event/head at every barrier, `CUTOVER_CLAIM` and `RECOVERY_CLAIM` are
sound names attached to an underspecified durable protocol.

### R2-M1 — host-restart recovery has an undeclared Keychain-unlock interval

**Severity: MAJOR.**

Apple's Secure Enclave guidance states that the associated keychain item is usable only on the device
that created it and, under the normal protected configuration, only when the device is unlocked. R2's
host-restart test (`architecture-decisions.md:429-436`) does not state whether recovery is expected
before or after Luca unlocks the login/data-protection keychain, nor what happens to already exposed
global targets while the key is unavailable.

**Exact mechanical closure.** Restart with a global target in the new state and the Keychain locked.
The helper must emit a distinct non-success status without creating a replacement key or fork. The H4
card must state whether exposure can persist until unlock. After the first authorized unlock, the same
fingerprint/head must resume and compensate. If that exposure interval is unacceptable, the pre-H4
gate must block this recovery mode rather than claim host-restart closure.

## Revision R2 terminal verdict

**REFUTE — 2 BLOCKER + 1 MAJOR remain.** The two-key epoch change resolves the original volatile-key
logic in principle, and R2 now names the right claim, crash, restart, and fork cases. It still cannot
receive EA-ARCH PASS because its helper-only Secure Enclave ACL is not the supported data-protection
Keychain access model, and its durable ledger has neither one persistence primitive nor unambiguous
claim/effect completion semantics. Host-restart behavior must additionally declare and test the
Keychain-unlock exposure boundary. No framework implementation or live credential/key mutation was
performed during this review.

## Revision R3 focused re-review

> Reviewed target: `architecture-decisions.md`, status
> `H2 DELEGATED / REVISION R3 AFTER EA-ARCH REFUTE`  
> Scope: only `R2-B1`, `R2-B2`, `R2-M1`, and BLOCKER-class regressions introduced by the R3 root
> broker.  
> Threat boundary applied as written: delegated Claude/Codex processes and Luca's unprivileged account
> are hostile/untrusted with respect to the broker; compromise of an already-root process is out of
> scope. Human H4a/H4b approval is authority for the exact disclosed transaction, not authority for a
> generic root execution surface.

### Prior residual closure result

| Prior finding | R3 result | Evidence |
|---|---|---|
| R2-B1: unsupported Secure Enclave ACL | **CLOSED as an architecture choice** | R3 removes Secure Enclave, Keychain ACL, application entitlement and Developer Team assumptions. A root-owned system LaunchDaemon, root-only transaction directory and file-backed Ed25519 key are supported ordinary macOS/Unix primitives; H4a blocks on a native install/restart/access-denial spike (`architecture-decisions.md:309-328,452-454`). This closure does not waive the new privilege-boundary findings below. |
| R2-B2: ambiguous ledger primitive and claim/effect semantics | **FORMAT/SEMANTICS CLOSED; crash actor boundary still OPEN** | R3 selects one immutable-file write/fsync/rename/directory-fsync protocol with no append or HEAD and separates every mutation into `EDGE_INTENT` and independently read `EDGE_OBSERVED` (`architecture-decisions.md:336-353`). That repairs the prior logical ambiguity. R3-B3 below shows that the physical predicate is not stable while a child mutation actor can survive the broker, so the end-to-end crash claim is not yet closed. |
| R2-M1: Keychain unlock boundary | **CLOSED** | The recovery key is now a root-owned file, not a login/data-protection Keychain item. R3 states the pre-mount behavior, accepts the disclosed exposure interval at H4b, forbids replacement keys/forks and requires boot replay with the same fingerprint (`architecture-decisions.md:355-360,459-464`). |

### R3-B1 — the root broker cannot obtain the claimed Luca-UID subprocess merely by `posix_spawn`

**Severity: BLOCKER.**

**Challenge.** What supported primitive changes a root LaunchDaemon's real/effective/saved UID, GID
and supplementary groups to the frozen Luca identity before the fixed executable begins, and what
mechanically closes every inherited root capability?

**Evidence.** R3 says repository commands are "`posix_spawn`ed under the frozen Luca UID/GID" and that
children receive no key, journal, descriptor or control capability (`architecture-decisions.md:330-334,
362`). The current macOS `posix_spawn(2)` contract does not contain a set-UID/GID spawn attribute. By
default the child inherits the caller's effective IDs; `POSIX_SPAWN_RESETIDS` changes them only to the
caller's **real** IDs. A system LaunchDaemon running as root has root real and effective IDs, so that
flag still produces root. The same manual explicitly says supplementary groups and open file
descriptors are inherited. The installed SDK's public `spawn.h` likewise exposes no UID/GID setter.

This is not cured by fixed argv. Without a separately selected privilege-drop boundary, Git and any
hook/filter it reaches execute as root. Without `POSIX_SPAWN_CLOEXEC_DEFAULT` or an equivalent explicit
descriptor whitelist, even a correctly deprivileged child may inherit the broker's private-key,
ledger, target-directory, lock or service descriptors. An already-open writable file or connected
service descriptor remains usable despite later pathname ownership checks; directory descriptors also
leak the broker's anchored namespace handles. Mode `0700` alone therefore does not prove the claim.

**Impact if true.** Candidate-controlled repository state can turn a fixed Git invocation into root
code execution, modify root-owned ledger bytes, exfiltrate the recovery signer, or retain an authority
descriptor after the broker dies. That crosses R3's declared root/unprivileged boundary and turns H4b
into an undeclared privilege grant.

**Exact mechanical closure.** Select and name one supported low-privilege execution mechanism before
Plan freeze. In the native spike, make the child report real/effective/saved UID/GID, supplementary
groups, audit/session identity, environment, cwd and every open descriptor. Require exact Luca IDs,
an intentionally minimal group list, a fixed absolute executable, no user-controlled loader/config
environment, and only an explicit stdio/result descriptor set. From the child, attempts to read or
sign with the key, open the root transaction directory, mutate via broker directory FDs, retain the
transaction lock, contact a control endpoint, or alter a root sentinel must all fail. A Git
hook/filter fixture must run only with Luca authority. Killing the broker must not leave a child with
any root-derived capability. The proof must exercise the production launchd and spawn path; printing
the desired UID from broker/model prose is not evidence.

### R3-B2 — descriptor-fixed path strings leave the root broker as a pathname confused deputy

**Severity: BLOCKER.**

**Challenge.** What prevents the in-scope unprivileged account from replacing a descriptor source,
candidate basename or any writable ancestor after H4b review but before the root `renameatx_np` call?

**Evidence.** H4b freezes path and inode/tree values, then a root command installs a descriptor; the
broker later exchanges "descriptor-fixed paths" (`architecture-decisions.md:324-334,385-392`). R3 does
not bind how the root installer consumes the user-side descriptor, which roots and direct-child slots
the schema permits, or how every ancestor is opened without following symlinks. It also does not bind
the exchange to pre-opened directory inodes. A hash/re-read followed by a pathname syscall is still a
check/use race when global candidates and their parents are Luca-writable. A final symlink exchange
moves the symlink itself, but a replaced **ancestor** is resolved before the final entry and can steer
the privileged syscall elsewhere.

**Impact if true.** A delegated process can make a human-approved finite transition operate on a
different directory by the time root executes it. The broker becomes a root rename/copy oracle over
attacker-selected filesystem locations even though it has no shell API. At minimum it can destroy or
exchange an unapproved root-visible name; at worst it creates a reusable privilege-escalation
primitive.

**Exact mechanical closure.** The H4b installer must prove that the byte-exact reviewed descriptor is
the one installed despite source replacement, and a strict schema must reject every resource outside
a compiled allowed-root/direct-child table. The broker must walk each path component relative to a
trusted starting descriptor with no symlink traversal, freeze every ancestor device/inode, and invoke
the swap relative to already-open parent directory descriptors rather than re-resolving an absolute
path. Those descriptors must never reach an unprivileged child. Race a hostile same-UID process that
continuously swaps the descriptor, every ancestor, both basenames, symlinks and mount availability at
each validation/syscall barrier. The only allowed outcomes are the exact approved two inodes exchanged
or a pre-effect block; a root-owned sentinel and every inode outside the two approved slots must remain
unchanged.

### R3-B3 — broker death does not establish that an external mutation actor is quiescent

**Severity: BLOCKER.**

**Challenge.** When the broker is killed after `posix_spawn` succeeds but before the child exits, what
prevents the restarted broker from classifying physical state while the old Git/helper process is
still changing it?

**Evidence.** The recovery rule reads pre/post predicates immediately after restart
(`architecture-decisions.md:345-353`). `RunAtLoad`/`KeepAlive` restarts only the broker
(`architecture-decisions.md:355`). R3 does not bind the spawned actor to launchd's job process group,
state that `AbandonProcessGroup` remains false, require launchd to reap/kill the whole old group before
relaunch, or make a mutation lock survive in the child until its final write. The proof kills only
**after** canonical fast-forward A/B and after each atomic exchange
(`architecture-decisions.md:459-464`); it omits kill-after-spawn, kill-while-Git-is-mid-checkout, and
kill-between-child-exit and broker observation. Power-cycle tests do not cover this process-only race
because a power cycle stops both actors.

Git fast-forward is itself a multi-syscall working-tree/index mutation. Even if launchd eventually
kills the orphan, the result can be neither exact pre-state nor exact post-state. R3 safely names that
case `RECOVERY_BLOCKED`, but its mechanical proof separately promises exact reverse-DAG restoration at
every transition (`architecture-decisions.md:435-436`) without injecting this reachable third-state
window.

**Impact if true.** Recovery can sign `EDGE_CANCELLED`, `EDGE_OBSERVED_RECOVERED`, or even begin
compensation against a state that changes moments later. Two valid signed chains can then describe one
moving external effect, or repository mutation can continue after global compensation. This defeats
the central R2-B2 repair despite an unambiguous ledger format.

**Exact mechanical closure.** Pause a real mutation child before its first write, midway through a
multi-file Git checkout, after its last write, and immediately before result delivery; at each point
`SIGKILL` only the broker. Prove mechanically that no replacement broker observes/classifies until the
entire old actor tree is dead or durably known complete and all mutation-capable descriptors/locks are
released in a single declared order. Include grandchildren from a Git hook/filter and PID-reuse
fixtures. Then require a stable second predicate read before any recovery event or effect. If a
partial Git state can legitimately yield `RECOVERY_BLOCKED`, change the global proof and H4b card to
that exact safe-but-manual terminal outcome; it may not simultaneously promise automatic restoration
for every transition.

### R3-B4 — the written compensation order has two mutually exclusive authorities

**Severity: BLOCKER.**

**Challenge.** On a live-verification failure, does recovery first disable commit-B routes or first
restore the global directories?

**Evidence.** Commit B is applied after global swap and before `VERIFIED`
(`architecture-decisions.md:393-401`), so exact reverse dependency order requires B compensation before
the global swap is reversed. R3 instead says "Global directories exchange back first"
(`architecture-decisions.md:409-415`). The mechanical proof says the opposite again: all new routes
must become unreachable **before** global restoration (`architecture-decisions.md:439-440`). The boot
paragraph also says route commit B cannot precede successful recovery/live verification
(`architecture-decisions.md:355-360`), while the normal sequence explicitly commits B before live
verification. No ledger can execute both orders.

**Impact if true.** One implementation leaves commit-B routing to bytes that have already been swapped
back; the other can leave globally discoverable candidate bytes while route compensation runs. A
recovery author must choose an order not authorized by the H4b DAG, so the claimed compiled transition
table and independent verification no longer identify one activation program.

**Exact mechanical closure.** Freeze one forward dependency DAG and derive, rather than separately
write, its one reverse order in the H4b descriptor, transition table, prose and tests. Pause after B
and during verification, attempt direct and routed invocation from both harnesses at every compensation
edge, and require the one exposure policy H4b actually approved. A fixture that swaps the two reverse
edges must fail descriptor validation before mutation.

### R3-M1 — immutable-ledger recovery text contradicts its own fault proof

**Severity: MAJOR.**

R3 says an orphan temp file is quarantined **and blocks mutation**
(`architecture-decisions.md:336-343`), while its proof kills before/after temp creation/write/fsync and
requires the clients at each barrier to produce one immutable event
(`architecture-decisions.md:455-458`). Both cannot be the expected result. It also calls final events
immutable but specifies ordinary `rename`, which can replace an existing same-name destination; the
decision does not require an exclusive final publication or byte-identity check before replay.

The crash table must state separately which orphan temps are safely quarantined and continued, which
anomalies permanently block, and how ownership/liveness is proven. Publication must have one
no-replacement result: first publication succeeds; an existing byte-identical event is replayed
without rewrite; any non-identical existing destination/fork blocks. Test temp leftovers from a dead
and a live owner plus final-name collision at every fsync boundary.

### R3-M2 — the "transient" root service and recovery credential have no terminal lifecycle

**Severity: MAJOR.**

The six-state machine ends at `VERIFIED`, while the root `RunAtLoad`/`KeepAlive` service, private
recovery key, immutable descriptor and root store remain installed (`architecture-decisions.md:305-317,
355-367`). An uninstall exists only as an owned helper/test claim
(`architecture-decisions.md:425,452-454`); no success/failure state authorizes when it occurs, which
verification artifacts survive it, or what happens if cleanup is interrupted. Therefore
"transaction-scoped" and "transient" are not yet lifecycle properties.

The H4 disclosures must identify the terminal retention policy and whether cleanup is automatic under
H4b or a later explicit root gate. A crash-injected cleanup test must preserve a public, independently
verifiable terminal receipt while leaving either the still-valid finite recovery service or a fully
removed private key/descriptor/service—never a half-removed service that launchd keeps restarting. A
new unprivileged transaction must be unable to reuse the old label, key or root store.

## Revision R3 terminal verdict

**REFUTE — 4 BLOCKER + 2 MAJOR remain.** R3 correctly abandons the unsupported Secure Enclave ACL,
removes the Keychain-unlock dependency, and selects a single durable event format with explicit
intent/observation states. It is not mechanically executable inside its own root-versus-unprivileged
threat boundary yet: public `posix_spawn` does not provide the claimed UID/GID drop, inherited
descriptors can carry root capabilities, root pathname operations are not inode-anchored, recovery
does not prove the old mutation actor is quiescent, and the compensation order contradicts itself.
The temp-event and privileged-service lifecycle ambiguities remain major but do not independently
create another authority path. No implementation, root command, service installation, live key or
credential mutation was performed during this review.

## Revision R4 focused re-review

> Reviewed target: `architecture-decisions.md`, status
> `H2 DELEGATED / REVISION R4 AFTER EA-ARCH REFUTE`  
> Scope: explicit closure audit of `R3-B1..B4` and `R3-M1..M2`, followed by a search for only newly
> introduced BLOCKER-class failure/authority gaps.  
> Threat boundary honored as revised: the hostile party inside the enforceable boundary is a delegated
> Claude/Codex child confined to its declared OS write root. Arbitrary unsandboxed same-UID interference
> is not claimed preventable; it must be detected and may end in disclosed manual recovery. H4 human
> approval still authorizes only the byte-exact typed transaction, never a generic root API.

**Verdict semantics for this Plan review.** `CLOSED` below means the Plan has selected one supported,
implementable architecture and names a mechanical future acceptance test. It does **not** claim that
the native broker has already been built or that the test has already run. Those production-spike and
fault-injection checks belong in WP-13 and must block H4a/H4b if they fail. A Plan BLOCKER is reserved
for a missing/contradictory decision that leaves implementers more than one behavior or no safe
implementable behavior.

### R3 finding closure table

| Prior finding | R4 result | Evidence |
|---|---|---|
| R3-B1: unsupported UID drop / inherited root capability | **PLAN DECISION CLOSED; WP-13/H4 native proof required** | R4 no longer attributes UID selection to `posix_spawn`. It selects a root-owned, H4-hashed, single-threaded drop helper that performs `setgroups` → `setgid` → `setuid`, verifies all identity classes, resets process state, closes all but a fixed descriptor whitelist and only then `execve`s a fixed absolute executable. Git extension points are a preflight block, and the future native proof inspects IDs, groups, environment and FDs from the real child (`architecture-decisions.md:333-342,502-506`). This matches the supported macOS `setuid(2)` contract. |
| R3-B2: root pathname confused deputy | **PLAN DECISION CLOSED within R4's declared boundary; WP-13 race proof required** | Descriptor bytes are selected by expected digest and strict schema; privileged targets are compiled typed direct-child slots; every ancestor is opened via `openat`/`O_NOFOLLOW` with device/inode checks; the exchange uses basename-only `renameatx_np` against already-open parent FDs; those FDs do not cross the UID boundary (`architecture-decisions.md:344-351`). A same-UID actor outside the declared sandbox is explicitly out of prevention scope and yields CAS/manual recovery, not broadened root path authority. |
| R3-B3: recovery observes while an old mutation actor is live | **BROKER-DEATH PLAN CASE CLOSED; guardian-death decision OPEN as R4-B1** | The guardian holds the mutation lock across the actor tree, while a replacement broker must acquire that lock, prove recorded identities dead and obtain two stable reads. The future fault test kills the broker at the previously omitted child barriers (`architecture-decisions.md:366-375,512-519`). That specifies broker-only death, but the guardian itself is now another crashable authority and R4 gives its death no equivalent durable handoff. |
| R3-B4: contradictory compensation order | **CLOSED for a fully observed commit B; partial-B case OPEN as R4-B2** | R4 derives compensation from one H4b DAG and consistently makes observed B the first reverse edge, then global exchanges, then A. The fault proof rejects a reversed descriptor (`architecture-decisions.md:389-392,442-452,489-490`). A Git operation that dies before B becomes an exact observed edge can still expose some B route files; that distinct gap is below. |
| R3-M1: temp policy / replaceable final event | **PLAN DECISION CLOSED; WP-13 fault proof required** | R4 selects `RENAME_EXCL`, byte-identical replay without rewrite, explicit fork failure, and separate dead/live/unprovable temp outcomes; the future fault matrix contains all three plus publication collisions (`architecture-decisions.md:353-364,507-511`). |
| R3-M2: falsely transient broker / undeclared credential lifecycle | **SUBSTANTIVELY CLOSED; one crash-order ambiguity remains as R4-M1** | R4 correctly keeps a disclosed version-pinned broker, makes only the transaction key finite, seals terminal histories, retains manual-recovery keys, forbids identity reuse and treats uninstall as a separate administrative action (`architecture-decisions.md:454-461`). The public-bundle/key-deletion restart sentence is not yet single-valued. |

### R4-B1 — the new mutation guardian has no crash-safe handoff of actor lifetime

**Severity: BLOCKER.**

**Challenge.** What keeps the mutation actor quiescence proof valid if the guardian—rather than only
the broker—dies after starting `luca-drop-exec`?

**Evidence.** R4 makes the guardian the sole holder of the mutation lock, creates a fresh process group,
starts the child, waits for its tree and only then writes a fixed result (`architecture-decisions.md:
366-375`). This closes the tested broker-death case while the guardian survives. It does not state that
the guardian/actor PID, process-start token and process-group identity become durable **before** the
actor's first instruction, nor that the actor retains a kernel lifetime token if the guardian exits.
The child is explicitly not the lock holder. Therefore guardian death releases the lock while its Git
child or grandchild can still run.

The fresh process group does not itself provide parent-death containment. macOS launchd's documented
default kills processes with the **job's** process-group ID when the job dies; R4 deliberately creates a
different actor group, and does not bind a kill/wait contract for guardian death. The fault matrix kills
only the broker and the host (`architecture-decisions.md:512-519`), never the guardian alone or broker
plus guardian before the actor exits.

**Impact if true.** A replacement broker can acquire the released lock, find no durable identity for
the still-running actor, obtain two temporarily equal predicate reads and sign a recovery edge; the old
actor may then perform its next write. This recreates the moving-state ambiguity that R3-B3 was meant to
eliminate and can put a valid recovery chain behind physical state.

**Required Plan closure / WP-13 acceptance.** Add guardian-only death and broker+guardian death before
spawn, between actor creation and first write, mid-checkout, after last write and before result durability.
At every barrier, require either (a) an already-durable guardian/PID-start-token/process-group record
plus a kernel-enforced lock/containment that survives the guardian until the complete actor tree is
dead, or (b) proof the actor cannot begin before that durable handoff and is killed if it never
completes. Include actor PID reuse and a grandchild attempting to change process groups. No replacement
broker may take its first predicate read until the old tree's nonexistence is mechanically proven.

### R4-B2 — a partial commit-B checkout has no defined way to make routes unreachable

**Severity: BLOCKER.**

**Challenge.** How does the broker disable B-first routing when Git has copied one or more B route files
into the canonical worktree but crashes before HEAD/index/worktree equal either exact predicate?

**Evidence.** R4 correctly compensates **observed** commit B first (`architecture-decisions.md:442-452`).
It also admits that Git fast-forward is multi-file and that a third predicate becomes
`BLOCKED_MANUAL_RECOVERY` with no automatic repository repair (`architecture-decisions.md:377-383`).
Those statements leave a missing case: Git can install a route/adoption file before it updates the
branch ref or the rest of the worktree. There is then no observed B edge to revert, the checkout is not
clean enough for the exact-revert rule, and broad or guessed restoration is forbidden. Nevertheless
R4 asserts that routes have already been disabled before globals are reversed
(`architecture-decisions.md:380-381,450-452,483-485`) without naming an independent route kill switch or
an exact partial-file compensation primitive.

**Impact if true.** Manual recovery can begin with a partially activated route still readable by a new
Claude or Codex session. Reversing global targets can then leave that route pointing at incompatible or
previously quarantined bytes. The B-first safety invariant is true only for the easy fully committed
case, not the crash case for which the broker exists.

**Required Plan closure / WP-13 acceptance.** Bind the missing fail-closed mechanism, then instrument
the real B checkout after every route-file rename, index lock publication and branch-ref update. At
every injected kill, start fresh native Claude and Codex
resolution attempts and require the new route to be mechanically unreachable **before** the first
global reverse edge. The ADR must bind one independent fail-closed route gate or one exact preimage
restoration operation that remains legal under the third-state/manual-recovery policy; it cannot infer
safety from HEAD alone. The gate/restoration must itself be an intent/observed edge in the frozen H4b
DAG, preserve unrelated bytes, and survive a second crash at each of its publication barriers.

### R4-M1 — sealed receipt publication and private-key destruction disagree after a crash

**Severity: MAJOR.**

R4's normal order is signed `TERMINAL_SEALED` → public bundle publication → private-key unlink/fsync
(`architecture-decisions.md:454-457`). The next sentence says that once the sealed event exists, a
restart "retries deletion only" (`architecture-decisions.md:457-458`). If the crash occurred after the
root-only sealed event but before the public bundle publication, deletion-only recovery can destroy the
private key without creating the independently accessible terminal bundle that the mechanical proof
requires (`architecture-decisions.md:520-522`).

**Required Plan closure / WP-13 acceptance.** The state machine must make public-bundle durability and
byte/hash verification a prerequisite to the irreversible key-destroy edge. Crash before that edge
must resume publication first; crash after it must
prove the already-published bundle independently verifies from the H4b public anchor. Inject failure
after each file write, fsync, rename, directory fsync and key unlink and require exactly one sealed
public receipt with no reusable signer. "Retry deletion only" and "always valid public terminal
receipt" cannot remain simultaneous requirements.

## Revision R4 terminal verdict

**Plan architecture: REFUTE — 2 BLOCKER + 1 MAJOR remain.** R4 closes the original UID/FD privilege
boundary, inode-anchors root swaps, fixes immutable event publication, establishes B-first compensation for a fully committed
route edge, and turns the root broker/key lifecycle into an honest persistent-broker/finite-key model.
It does not yet provide one single implementable/acceptance-complete architecture because the guardian
can itself die and release quiescence before its actor tree, and a partial commit-B checkout has no
authorized way to make partially written routes
unreachable before global restoration. Terminal sealing also needs one crash-consistent ordering
between public receipt durability and private-key deletion.

**Future implementation/native proof: NOT RUN — correctly deferred.** This is not an additional Plan
failure. WP-13 must carry the native UID/FD test, descriptor/path race test, guardian/actor crash matrix,
partial-B route-unreachability test, immutable-ledger fault matrix and terminal-seal/key-destruction
matrix as acceptance criteria. H4a/H4b must remain blocked until their applicable native results pass.
No implementation, root command, service installation, live key or credential mutation was performed
during this review.

## Revision R5 Plan-closure response

> Authorship boundary: this is the R5 decision author's response to the independent R4 findings, not a
> replacement independent verdict. It records why the architecture now has one implementation path
> per finding and what WP-13 must prove. A fresh final-Plan adversary still owns the handshake verdict.

| R4 finding | R5 Plan response | Fail-closed / future proof boundary |
|---|---|---|
| R4-B1: guardian death can release actor lifetime | **PLAN DECISION CLOSED.** R5 removes the split guardian/actor crash domains. Each mutation is one launchd one-shot job; the guardian is its primary PID, cannot cross the start gate until signed `ACTOR_ARMED` is durable, then execs drop-helper and the fixed actor in place without forking an independently living target. Broker death leaves launchd ownership; primary death ends that actor identity and launchd cleans its unchanged job PGID. | Replacement recovery takes no predicate read until job, PID/start-token and PGID absence all pass twice around a sync barrier. Live/unprovable identity is `RECOVERY_BLOCKED`. WP-13 must kill guardian-only and broker+guardian at every named barrier, including PID reuse and undeclared group-escape fixtures; any escape blocks H4a/H4b. |
| R4-B2: partial B can expose a route before an observed B edge | **PLAN DECISION CLOSED.** Dormant commit A owns an immutable cross-harness epoch check and frozen pre-A route baseline; B may contain data only. Every new/changed B row is denied unless a separate root-owned gate is atomically `OPEN` for the exact B/route-set hash. B runs with the gate closed; only exact observed B permits the separate gate-open edge. | Missing marker, partial row/map, unreadable gate or hash mismatch denies. Gate-close is the first reverse edge; partial B with a proved-closed gate permits global reversal and manual repository recovery. An unprovable gate blocks before global reversal. WP-13 kills the real checkout after every file/index/ref boundary and requires fresh Claude+Codex route denial plus second-crash-safe gate close. |
| R4-M1: sealed/public/key order is contradictory | **PLAN DECISION CLOSED.** R5 freezes one order: canonical payload → signed `TERMINAL_SEALED` → root-owned exclusive public-bundle publish + directory fsync + unprivileged read-back verification → private-key unlink + root-directory fsync. The terminal payload root excludes its detached receipt, so there is no self-hash. | A restart before public proof republishes/verifies first and retains the key; after proof it re-verifies before retrying unlink. A collision, missing bundle or failed H4b-anchor verification retains the key. WP-13 injects every write/fsync/rename/read-back/unlink boundary and must yield one durable public receipt and no reusable signer. |

R5 also freezes one acceptance interface: the isolated H4a spike and strict verifier commands in
`architecture-decisions.md` must produce the four named, broker-signed receipts and exactly
`WP13_R5_NATIVE_PASS`. Missing barriers, substituted signers or changed binary/config/descriptor hashes
fail. This is sufficient for a Plan to tell an implementer what to build, how it fails and what blocks
the next human gate; it is not evidence that the native system is already built.

**R5 author closure claim: all 2 BLOCKER + 1 MAJOR have one Plan-level decision. Native proof remains
NOT RUN and is intentionally deferred to WP-13; H4a/H4b remain blocked until those receipts pass.**

<!-- FILE_END: architecture-redteam.md -->
