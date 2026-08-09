# Cycle 2 architecture decisions — frozen candidate

> Status: `H2 DELEGATED / REVISION R6 PLAN DECISIONS CLOSED; WP-13 PROOF DEFERRED`  
> Authority: Luca instructed the audit to continue without intermediate interruptions and reserved
> only the independently judged final Plan for his approval. These decisions therefore close H2 for
> Plan production; they do not authorize implementation or activation.

## Evidence boundary

The current framework is not equivalent to the target architecture:

- `.claude/hooks/project-scope-guard.mjs:216-229` writes the authoritative session pin before the
  switch command runs and accepts a compound command using that new pin.
- `.claude/hooks/route-guard.mjs:771-795` also writes the target pin before the instructed switch.
- `.codex/codex-hook-adapter.mjs:60-62` maps a Codex patch to `Bash` for the scope guard; the guard
  consequently scans and may rewrite every byte of the patch command.
- `.codex/agents/` contains only muse-proto-judge, preflight-agent, and quality-gate. The required
  plan, work, and oracle roles are absent.
- `.claude/skill-os/evolution/FUSION-RUNBOOK.md:23-44` has no cross-surface journal/CAS and still
  recommends a broad destructive rollback.
- The externally routed resolving skill is live on Claude with stage/commit semantics, while the
  Codex target is absent.

All five decisions below are future implementation contracts. A named test can prove a decision;
prose or a model-authored success statement cannot. Revision R6 is deliberately Plan-first: it
selects one behavior for every safety branch and freezes its command, receipt, rollback and
fail-closed contract. It does not claim that the broker or its native fault matrix already exists.
Those proofs belong only to WP-13 and are hard blockers for H4a/H4b, not prerequisites for H3 Plan
approval.

## ADR-GATE-001 — native human gates and FD-rooted evidence

### Decision

H0, G-REVIEW, H1, H4a and H4b use one fail-closed approval protocol. A gate may be requested only
after an independent verifier has published a write-once proposal containing the gate name, exact
payload SHA-256, Plan and execution-envelope SHA-256, a cryptographically random nonce, creation
time and expiry. The proposal never contains a future binding or result hash. After publication the
runner stops and waits for a new native, top-level user event. The only accepted prompt bytes are:

`APPROVE <gate> <proposal_sha256> <nonce>`

The trusted top-level `bootstrap-main` must stop, receive a new `role=user` turn whose entire content
matches those bytes, and only then invoke `human-gate-recorder.mjs` with that reply on closed stdin.
Assistant text, tool output, a delegated child, quoted/replayed user prose, an earlier turn, an
edited/normalized prompt, a wrong gate/hash/nonce, or a vague affirmation has no authority. The
candidate producer, proposal file and delegated sessions cannot invoke the recorder. If a harness
does not expose a distinct new top-level user turn, the only result is `BLOCKED_HUMAN_CHANNEL`; no
self-signing or approval-file fallback exists.

`bootstrap-main` is inside the trusted authority boundary already implied by the framework's plain-
text human-gate contract; an arbitrary unsandboxed main process already acting as Luca is outside the
enforceable adversary model. The binding is audit evidence against child/candidate replay and payload
drift, not a cryptographic claim that protects Luca from that trusted main. This explicit boundary
avoids inventing an uninstalled UserPromptSubmit hook or a pre-H0 hook-install bootstrap loop.

The recorder is part of the WP-00 evidence TCB, outside every candidate and delegated-child write
root. The already-existing quality-gate freezes its bytes and the execution envelope freezes its
hash. On acceptance, it asks the TCB receipt writer to publish exactly one `approval-binding.json`
with `O_CREAT|O_EXCL`; it binds harness, session and observed top-level turn identity available from
the runtime, `role=user`, exact prompt SHA-256, proposal/envelope/Plan SHA-256, payload SHA-256, gate,
nonce and expiry. A mutation result is a later, one-way record that binds the approval binding and
independently observed post-state. Proposal → binding → result is deliberately acyclic.

Every command executes against the immutable execution envelope, never ambient process state. The
envelope gives `canonical-checkout`, `stale-checkout` and `transaction-checkout` stable keys bound to
absolute path, open directory identity, device/inode, HEAD and tree. The TCB executor opens and
verifies the selected directory, checks the frozen tuple/CAS, calls `fchdir` on that directory FD,
and only then spawns the exact argv. Candidate and receipt locations are likewise enum keys; free-form
paths from model text are rejected. A work-package command printed without a wrapper is still argv
for this TCB executor, not permission to inherit the caller's current directory.

Evidence is written from an already-open, independently verified receipt-root directory FD. The
frozen native `secure-receipt-writer` opens every descendant one segment at a time with
`openat(O_DIRECTORY|O_NOFOLLOW)`, verifies the expected device/inode and directory type at each
level, keeps the same directory-FD chain open across publication, and creates the final basename with
`openat(O_CREAT|O_EXCL|O_NOFOLLOW)`. It then requires final `fstat().st_nlink == 1`, reads back
through that same FD, and fsyncs the
file and each containing directory needed for durable publication. Slash-bearing slot names,
dot-segments, pre-existing finals, ancestor symlinks, ancestor replacement, parent-inode swaps and
hardlink aliases fail before publication. Lexical `resolve()` or a final-basename-only
`O_NOFOLLOW` check is not containment. Candidate scripts may return untrusted proposed evidence,
but only the TCB writer can create a receipt consumed by a later gate.

The first trust anchor is outside the repository validator set. Before any repository JavaScript
runs, root-owned non-writable `/bin/sh`, `/usr/bin/python3`, `/usr/bin/shasum`, `/usr/bin/awk`,
`/bin/test` and `/usr/bin/stat` first verify the Plan-literal SHA-256 of `tools/os-byte-anchor.sh`.
That anchored script traverses the physical canonical repository from open directory FDs, rejects
symlink ancestors and inode aliases, requires each source to be a regular file with `nlink=1`, holds
the verified FDs open, and verifies the Plan-literal SHA-256 of `source-bundle.sha256` plus every
listed member and its pre/post identity.
Repository `audit.mjs` is a secondary structural validator and cannot authenticate itself. Changing
the bundle and its member together therefore fails against the literal external anchor.

G-REVIEW is not an informal checkpoint. WP-01 first constructs an exact review-only commit R and an
allowed path/action/before/after manifest. The independent TCB freezes R's OID, tree, parent and
manifest, then publishes the proposal. After the exact native approval, `land-review.mjs` obtains the
repository lease, rechecks clean HEAD/tree and `parent(R)=observed canonical HEAD`, performs only the
frozen `git -C <canonical-checkout> ...` fast-forward/CAS operation, and independently reads back
ref, index and worktree. Only that read-back can publish `G_REVIEW_R_OBSERVED`; WP-13 depends on this
token, not on WP-01's self-report. Failure before the first Git edge is zero-mutation. A partial
ref/index/worktree outcome becomes `BLOCKED_MANUAL_REVIEW_RECOVERY`; no reset, clean, rebase or guessed
repair is permitted.

### Owned implementation surfaces

- `future-receipts/WP-00/evidence-tcb/human-gate-recorder.mjs`
- `future-receipts/WP-00/evidence-tcb/secure-receipt-writer.c` and its frozen native binary
- `future-receipts/WP-00/evidence-tcb/land-review.mjs`
- `future-receipts/WP-00/bootstrap/prepare-cycle2.mjs`
- `future-receipts/WP-00/execution-envelope.json` and the five fixed gate proposal/binding/result
  schemas

These are future transaction artifacts owned by WP-00 bootstrap/TCB work. This ADR does not create
them and H3 does not authorize them.

### Mechanical proof

- Each gate accepts one exact post-proposal top-level user event and rejects assistant/tool/child
  text, stale turn, different session, normalized bytes, wrong hash/nonce/gate, expiry and replay.
- With the native user-event feed removed, every gate returns `BLOCKED_HUMAN_CHANNEL` and performs
  zero mutation.
- A substituted proposal, envelope, Plan, adapter, secure writer, executor or result fails the next
  consumer; no component can approve or verify bytes it produced itself.
- Pre-existing final files, ancestor symlinks, parent swaps, hardlink aliases and receipt-root inode
  changes are injected at every open/create boundary; all fail with no file outside the authorized
  receipt root.
- Ambient-cwd substitution and either-checkout replacement fail before spawn; the exact frozen CWD
  key, device/inode, HEAD and tree appear in every trusted receipt.
- Replacing `audit.mjs`, or replacing both a bundle member and `source-bundle.sha256`, fails at the
  external OS byte anchor before Node runs.
- G-REVIEW rejects wrong parent/tree/path/action/before-after, dirty or moved checkouts, lost lease,
  non-fast-forward and partial read-back; only exact R produces `G_REVIEW_R_OBSERVED`.

### Rollback

Before a mutation gate, discard only the untrusted proposal/candidate transaction. A binding is an
immutable audit fact and is never rewritten. After a gate starts, use that work package's declared
compensation; G-REVIEW partial state always stops for manual recovery. Removing the future TCB makes
all five gates unavailable rather than silently weaker.

## ADR-PIN-001 — commit the session pin last, inside the project transaction

### Decision

The only authoritative binding operation is a shared `commitSessionPin()` primitive in
`.claude/hooks/lib/project-substrate.mjs`. It validates the session ID and canonical project name,
writes a same-directory temporary file with mode `0600`, fsyncs it, compare-and-swaps the expected
old pin hash, atomically renames it into `.session-project-<sid>`, fsyncs the containing directory,
and reads the committed value back.

Project names are exactly one direct-child segment under `LUCA_PROJECTS_ROOT`. Empty, hidden,
dot-segment, slash, backslash, control-character, and root-escaping names are rejected. `switch`
also requires the target directory to exist; `new` requires it not to exist. All identity sites use
this exported validator; the shell entry point calls a Node CLI wrapper around the same function.

Replace the age-only lock with an owner-token lease. The lock record contains PID, process-start
token, host, transaction nonce, acquisition time, and heartbeat. Age alone never permits stealing.
On the local host it is reclaimable only when PID liveness and the start token prove the recorded
owner is gone; reclaim atomically renames the exact stale lock to a recovery name and never uses a
broad recursive delete. Every operation that can read or commit an active-project tuple—including
the direct-bind path—holds this same lease.

For `switch` and `new`:

1. The PreToolUse guard recognizes only a bare, exact project command. It injects
   `--session-id <sid>` and an expected old-pin digest. It does not write the pin.
2. If a command contains switch/new plus a second executable segment, redirection, pipeline,
   substitution, or newline, the guard denies it and requests two tool calls. There is no same-call
   switch-and-project-operation path.
3. `project.sh` validates arguments, acquires the owner-token project lease, snapshots all three
   compatibility-link targets and the old pin digest, then performs the link transaction.
4. A failure restores all three exact old link targets while the lock is held. A newly created
   project is moved to a transaction-scoped recovery directory; user-created content is never
   recursively deleted.
5. Only after all link/state operations and their read-back checks pass does `project.sh` invoke
   `commitSessionPin()`. A pin CAS failure restores the old links and reports `BLOCKED`.
6. Success requires both the new links and the new pin to read back consistently before releasing
   the lock.

For `new`, lease acquisition occurs before the nonexistence check. The transaction creates an
exclusive hidden staging directory with an owner marker, builds and verifies the skeleton there,
rechecks that the final path remains absent, and renames the staging directory into the reserved
final name. A competing creator makes the rename fail without touching that creator's directory.

When a user explicitly names the already active project, route-guard may bind without switching,
but it must acquire the same owner-token lease and call the same primitive with
`expectedCurrentProject=<name>`. The primitive verifies the canonical active link and target
existence under that lease before the atomic pin commit. No binding is ever derived from an
inherited link without the explicit user-name signal.

For ordinary Bash, project-scope-guard uses a strict token classifier instead of substring matching.
It rewrites only path operands and denies ambiguous write-capable commands. A small allowlist of
direct read commands may carry a project-looking search string without a pin; redirects,
substitutions, eval, interpreters, unknown commands, and mixed segments are never classified as
read-only. This removes the current Codex instruction to evade the guard by splitting a protected
token while retaining fail-closed behavior for writes.

### Owned implementation surfaces

- `.claude/hooks/lib/project-substrate.mjs`
- `.claude/hooks/route-guard.mjs`
- `.claude/hooks/project-scope-guard.mjs`
- `scripts/project-pin.mjs` (thin CLI for the shared primitive)
- `scripts/project-lease.mjs` (owner/start-token/heartbeat lease primitive)
- `scripts/project.sh`
- `scripts/test-project-substrate.mjs`
- `scripts/test-project-scope-guard.mjs`
- `scripts/test-hooks.mjs`

### Mechanical proof

- Valid Latin and Chinese names bind after a successful switch.
- Every invalid-name fixture fails before filesystem mutation.
- A nonexistent switch leaves the old pin and all three links byte-for-byte unchanged.
- Every compound separator is denied and leaves the pin unchanged.
- Injected failure after link 1, link 2, link 3, and immediately before pin commit restores the exact
  initial state.
- Two concurrent switches serialize; each receipt proves which final pin/link tuple committed.
- A switch paused beyond the old 60-second timeout retains ownership; a live direct-bind serializes
  behind it; a provably dead owner is reclaimed by exact rename.
- Two concurrent `new` calls for the same name yield exactly one owner; a third-party sentinel is
  never moved or removed.
- Filesystem-call tracing proves file fsync → pin rename → containing-directory fsync → tuple
  read-back before success.
- Read-only string fixtures pass without textual evasion; every ambiguous write fixture is denied.

### Rollback

Revert only the exact implementation commit and restore the captured pre-transaction files. Never
use broad reset. A failed live project transaction performs its own link compensation before it
returns; rollback never guesses the former project from a shared link.

## ADR-PATCH-001 — parse target headers, never scan or rewrite patch bodies

### Decision

Add `.codex/lib/patch-targets.mjs`, a strict byte-offset parser for Codex patch envelopes. It accepts
exactly `Begin Patch`, `Add File`, `Update File`, `Delete File`, and `End Patch` control lines. An
unknown path-bearing control line, duplicate envelope boundary, missing target, absolute escape, or
malformed multi-file block fails closed. Move/rename syntax is rejected until it has its own tested
path contract.

For project-scope enforcement, the Codex adapter no longer aliases `apply_patch` to a Bash command.
It instead:

1. hashes the complete original patch and the ordered non-header byte ranges;
2. parses every target header and invokes project-scope-guard once per target with a synthetic
   `Write` input containing only that file path;
3. denies the original patch if any target is denied;
4. applies a guard-provided redirected path only to the captured header span;
5. reassembles the patch and emits an explicit source→output span map; every non-header byte
   sequence must be identical and ordered, while output offsets account for cumulative header-size
   deltas;
6. passes the exact parsed target list to post-edit so edit counting and open-spool behavior use the
   same file inventory.

Untrusted absolute input targets are rejected. A canonical absolute path generated by the guard is
tagged inside the adapter's private transformation state and may appear only in output after the
original relative target has passed classification. The transformed envelope must then pass the real
Codex patch consumer in an isolated end-to-end test.

The scope guard continues to handle real shell commands as Bash. A path-looking string in patch
prose is ordinary body data and never reaches the path classifier. Framework read-only protection
still applies because every actual patch target is sent as a synthetic Write.

The protected boundary is accidental/cooperative lucagstack concurrency, not a malicious process
already running as Luca; such a process can bypass every agent hook and write files directly. Within
that boundary, project writes use a transaction lease in the physical target project. The guard
rejects any symlink in the project root or existing target ancestry, records the physical ancestor
inode vector, and all supported framework mutations consult the lease. The actual patch runs only
while that lease is active; PostToolUse rechecks the inode vector before releasing it. A competing
project command or shell write through either harness is denied until release. Critical parser/lease
errors deny the patch rather than using the general hook fail-open path.

### Owned implementation surfaces

- `.codex/lib/patch-targets.mjs`
- `.claude/hooks/lib/project-write-lease.mjs`
- `.codex/codex-hook-adapter.mjs`
- `.claude/hooks/project-scope-guard.mjs` (synthetic Write contract only)
- `scripts/test-codex-adapter.mjs`
- `scripts/test-project-scope-guard.mjs`
- `scripts/verify-codex-wiring.mjs`

### Mechanical proof

- The target `README.md` plus a project-path literal in prose is allowed and the body SHA-256 is
  unchanged.
- A real project-scoped target is redirected to the session pin.
- A real framework target is denied.
- A multi-file patch evaluates every target; one denied target denies the whole patch.
- Malformed, move, symlink-escape, case-variant, and absolute-escape fixtures fail closed.
- The adapter's post-edit count equals the number of parsed targets without reparsing the body.
- A two-file redirect with an 80-byte first-header expansion proves the span map and ordered body
  identity without requiring numerically unchanged downstream offsets.
- A real Codex file-change event, with display links on project A and the session pinned to project B,
  changes only B and produces the expected native PostToolUse inventory.
- At a barrier after validation, supported switch/shell attempts to replace an ancestor with a
  symlink are denied by the write lease; direct same-UID hook bypass is explicitly outside the
  project's enforceable threat boundary.

### Rollback

Revert the exact adapter/parser commit. If the parser cannot load, patches fail closed with a clear
reason; shell and read-only tools remain available. The rollback does not restore full-command patch
scanning because that behavior is proven unsafe.

## ADR-AGENT-001 — native logical roles plus launcher-issued receipts

### Decision

The cross-harness logical role set is `plan-agent`, `work-agent`, and `oracle`; `quality-gate` remains
the independent delivery judge. Workflow runner is only the optional workflow-graph backend and is
never a substitute for role dispatch.

Claude uses repository-native agent definitions:

- existing `.claude/agents/plan-agent.md`, with hardcoded model aliases removed;
- new `.claude/agents/work-agent.md`, a thin registered adapter that accepts only a fully
  materialized work packet;
- new `.claude/agents/oracle.md`, a general refute/judge contract used by the skills that already
  request `subagent_type="oracle"`;
- existing `.claude/agents/quality-gate.md`.

`.claude/agents/work-agent-template.md` remains an unregistered packet template. The orchestrator
materializes a versioned JSON work packet validated before spawn by
`.claude/skill-os/schemas/work-packet.schema.json`. All required ownership, file, input, constraint,
protected-path, output, done-criterion, verification, and rollback fields are nonempty and
`additionalProperties` is false. Cross-field checks reject contradictory ownership/protection or an
output with no done criterion. Brace-template text is allowed inside typed source-data fields; global
substring rejection is not used.

Codex uses matching repository-native definitions:

- `.codex/agents/plan-agent.toml`
- `.codex/agents/work-agent.toml`
- `.codex/agents/oracle.toml`
- existing `.codex/agents/quality-gate.toml`

No agent or caller pins a model name. Callers resolve the logical tier from
`.claude/skill-os/model-routing.yaml`: plan/oracle use reasoning-heavy, ordinary work uses
core-execution, and quality-gate uses its registered judge tier. Codex receives only the mapped
`model_reasoning_effort`; Claude receives the model alias only from the truth-source projection.
The parity checker builds a call graph across orchestrator, plan-agent, quality-gate, skills,
workflows, and runner; a direct model alias anywhere outside that projection is a hard failure.

Add `scripts/agent-launcher.mjs` as the candidate dispatcher, but never let it issue or anchor its own
evidence. Before WP-05 begins, WP-00 freezes an independently reviewed transaction-scoped evidence
TCB outside the candidate checkout and every delegated child write root. Its executable/verifier
hashes, Ed25519 public-key fingerprint and one-time nonce commitment are written to the immutable
execution envelope by the bootstrap supervisor and countersigned by the already-existing
quality-gate. The TCB starts a native top-level dispatcher session from an isolated checkout that
contains the frozen repository agent definitions. The
dispatcher has one permitted action: spawn the exact registered role and return its child result.
For both harnesses, acceptance requires a native event graph edge
`dispatcher session → named agent_type spawn → distinct child session → child result`. Claude uses
its native Agent event and Codex uses its native collaboration spawn event; top-level role-shaped
output is discarded. Removing or renaming the definition must make the negative run fail. Codex
stdin is always closed.

Before spawning, the frozen evidence TCB—not the candidate launcher—generates an ephemeral Ed25519
key in parent-process memory, opens the precommitted nonce, and sends the launch envelope plus public
fingerprint through a direct parent/orchestrator channel. The candidate launcher, dispatcher and child
cannot write the TCB, verifier, anchor, raw-transport directory or receipt directory. The private key
is never exposed to them; the child runs in an OS sandbox whose write root is only the isolated
checkout. The TCB captures native
JSON/JSONL from its pipe, distinguishes transport events from escaped model output, signs a chained
launch/session/result transcript, hashes output/log bytes, and signs the final receipt. Logs and
receipts are mode `0600` outside the child write root and have an explicit retention deadline.

Verification requires the expected public-key fingerprint, nonce commitment and TCB binary/verifier
hashes supplied by the immutable WP-00 execution envelope (and, at H4, the human-approved envelope);
it never accepts an anchor, key or raw transport path obtained from the candidate launcher or receipt
tree. A newly generated attacker key therefore cannot substitute. The trust claim is bounded to
preventing the delegated child/same-thread prose from minting evidence; an arbitrary unsandboxed
process already acting as Luca is outside the agent-harness trust boundary.

The frozen TCB verifier verifies schema, out-of-band key fingerprint, Ed25519 signatures and event
hash chain, distinct native dispatcher/child IDs, native parent→spawn→child edge, pre-launch nonce,
exact agent-definition hash, target commit, role, input/output hashes, timestamp order, expiry,
source-log path/hash, and matching launch/session/result events. A model-authored ID or status has no
evidentiary weight.

### Owned implementation surfaces

- `.claude/agents/plan-agent.md` — revise
- `.claude/agents/work-agent.md` — add
- `.claude/agents/oracle.md` — add
- `.claude/agents/quality-gate.md` — revise
- `.codex/agents/plan-agent.toml` — add
- `.codex/agents/work-agent.toml` — add
- `.codex/agents/oracle.toml` — add
- `.codex/agents/quality-gate.toml` — revise
- `.claude/agents/work-agent-template.md` (placeholder guard wording only)
- `.claude/agents/orchestrator.md`
- `.claude/skill-os/model-routing.yaml`
- `.claude/skill-os/schemas/work-packet.schema.json`
- `.claude/skills/office/brainstorm/SKILL.md`
- `.claude/skills/office/ux-brainstorm/SKILL.md`
- `.claude/skills/office/ux-research/SKILL.md`
- `.claude/skills/office/deepresearch/SKILL.md`
- `.codex/workflow-runner.mjs` (assert scope, no role implementation)
- `scripts/agent-launcher.mjs`
- `scripts/evolution/agent-evidence-tcb.mjs` and its independent verifier (WP-00 bootstrap ownership;
  WP-05 may consume but may not modify either hash)
- `scripts/check-agents-parity.mjs`
- `scripts/verify-codex-wiring.mjs`

### Mechanical proof

For each harness, one smoke run launches four distinct native child sessions: plan, schema-valid
work, oracle, and quality-gate. Every run produces a fresh signed receipt with a native graph edge.
Missing role, missing/empty/wrong-typed/contradictory packet field, replayed nonce, same
dispatcher/child ID, unrelated genuine child, expired receipt, altered-and-rehashed log, wrong
definition hash, attacker key, and self-authored event fixtures fail. A forged three-event transcript
plus a self-generated replacement key/anchor must also fail against the precommitted WP-00 anchor. A
valid packet containing brace
template source data passes. The parity checker asserts exact role names and definition hashes, not
merely a TOML-file count.

### Rollback

Agent definitions and launcher land dormant before any route points to them. Revert exact files if
their isolated smoke gate fails. Existing quality-gate remains available. Workflow runner is never
deleted or repurposed, so optional workflows retain their current backend.

## ADR-ACT-001 — journaled activation with CAS and reverse-DAG compensation

### Decision

Adopt one state machine:

`PREPARED → GLOBAL_STAGED → REPO_COMMITTED → GLOBAL_SWAPPED → LEDGER_COMMITTED → GOVERNANCE_COMMITTED → VERIFIED`

The activation journal has two explicitly separated trust epochs. Before H4, the deterministic
unprivileged supervisor owns an ephemeral Ed25519 key in memory and writes a signed preparation chain
under a parent-only transaction directory. Post-H4 authority belongs to one transaction-scoped,
finite-state activation broker running as a version-pinned macOS system LaunchDaemon. Its executable,
configuration and transaction directory are installed root-owned and non-writable by Luca; the broker
generates a distinct Ed25519 recovery key directly into a root-owned `0700` transaction directory and
keeps the private file `0600`. This deliberately uses ordinary supported Unix ownership rather than an
unproven Secure Enclave/application-ACL combination. The enforceable adversary is a delegated
Claude/Codex child confined to its declared sandbox/write root. An arbitrary unsandboxed process
already acting as Luca, a hostile administrator/root process, and physical compromise are outside the
framework's enforceable boundary; their interference is detected by CAS and may end in explicit manual
recovery, never silently treated as success.

Creating the dormant broker/key is a separate, reversible **H4a prepare** approval. H4a binds the
immutable execution envelope plus a `h4a-spike` descriptor that contains only synthetic slots on the
isolated APFS fixture. That descriptor is forbidden from naming the canonical repository, any live
global target, or commits R/A/B/C. The H4a human binding—not the future summary—binds the Plan/ADR/
envelope/build-gate hashes, transaction ID, descriptor, broker binary/config, journal schema, compiled
transition table, drop-exec, guardian, both product and independent verifier hashes, approved broker
fingerprint, fixture device/inode vector, exact fault matrix, nonce and expiry. It may install only
those H4a-card bytes and create the empty root-owned transaction store; it cannot address production
targets or start cutover. Replacement envelope, binding, descriptor or signer fails independently.
The broker publishes its binary SHA-256, public-key fingerprint, effective root ownership/modes, exact
compiled transition table and LaunchDaemon label. If `sudo`, `launchctl`, root ownership, automatic
restart, or the isolated native spike is unavailable, the transaction blocks before H4b.

**H4b cutover** uses a second, necessarily different `h4b-cutover` descriptor. It freezes out of band:
the H4a verified summary; transaction ID; observed review commit R; the exact parent chain
`parent(A)=R,parent(B)=A,parent(C)=B`; every R/A/B/C OID and tree; exact allowed path/action/before-after
manifests; B's complete route-file path/SHA; pre-H4 chain head; both Ed25519 fingerprints; the exact
same broker binary/config/schema/compiled-transition/drop-exec/guardian/verifier hashes proved at H4a;
service label; production target/backup inode/tree hashes; low-privilege UID/GID; and the permitted
forward/compensation DAG. H4a and H4b descriptor bytes must differ, while the listed executable contract
hashes must match. Both descriptors, both approvals and the root gate live outside R/A/B/C trees. The
cutover descriptor never embeds the final gate-file hash. After its SHA is known, the root gate binds
transaction+epoch+B OID+complete route path/SHA+cutover-descriptor SHA in that one direction only.
Commit C names only the predetermined transaction/public-bundle logical name, never a future payload
root or bundle hash. Thus there is no descriptor↔gate, B↔B-OID or C↔terminal-payload fixed point. H4b's
one approved root command atomically installs the root-owned immutable descriptor and starts that exact
transaction. No generic command, path, argument, shell fragment or model text crosses the broker API.

The first post-H4b record is `CUTOVER_CLAIM`, signed by the broker key and citing the approved
preparation head. From then on the broker is the sole sequence/signature and external-effect
coordinator. It never claims that `posix_spawn` can set a child UID. Instead it starts one root-owned,
H4-hashed `luca-drop-exec` binary with fixed arguments. That single-threaded native helper calls
`setgroups` to the frozen minimal group set, then `setgid` and `setuid`, verifies real/effective/saved
IDs, resets signals/umask/cwd, clears the environment, closes every descriptor except an explicit
stdio/result whitelist, and only then `execve`s the fixed absolute executable. It cannot accept shell
text or arbitrary argv. The production spike enumerates IDs, groups and every open descriptor from the
executed child. Repository preflight rejects hooks, process filters, fsmonitor, submodule/custom
checkout drivers and any config that could spawn an undeclared executable; Git runs under Luca only.

Every privileged filesystem resource is a typed direct-child slot under a small allowed-root table
compiled into the broker. H4b installs descriptor bytes by expected SHA-256 and schema, not by trusting
a mutable source path. The broker opens each allowed root and ancestor with `openat` + `O_NOFOLLOW`,
requires the frozen device/inode vector, rejects slashes/dot segments in slot names, and invokes
`renameatx_np(parent_fd, basename, parent_fd, basename, RENAME_SWAP)` relative to the already-open
parents. No unprivileged child receives those descriptors. Within the declared cooperative boundary,
the activation lease excludes framework writers; any external same-UID pathname or inode change makes
the immediate CAS/re-read block or enter manual recovery rather than widening root authority.

The ledger has exactly one persistence primitive—no append and no alternative. Each event is one
immutable canonical file `events/<zero-padded-sequence>-<event-hash>.json`. The broker opens a
same-directory random temporary file with `O_CREAT|O_EXCL`, writes the complete signed event, fsyncs
that file, publishes with `renameatx_np(..., RENAME_EXCL)`, and fsyncs the `events/` directory before
replying. Publication never replaces an existing name: byte-identical existing content is replayed;
a different existing file is a fork and blocks. A temp owned by a provably dead writer is renamed into
a root-only quarantine and does not block a contiguous valid chain; a live-owner temp makes readers
wait, and an unprovable owner blocks.
There is no authoritative mutable HEAD file: the unique head is the highest contiguous valid signed
sequence reached by scanning immutable names from 1; a gap, duplicate sequence or fork blocks
mutation. A kernel-held root transaction lock plus launchd's single service instance serializes
writers. A lost reply returns the byte-identical already-durable event.

Every external mutation is two records, never one ambiguous state: `EDGE_INTENT` freezes operation ID,
pre/post physical predicates, exact syscall/argv and compensation and becomes durable before action;
`EDGE_OBSERVED` becomes durable only after the broker independently observes the exact post-state.

Each low-privilege operation uses exactly one transaction-scoped, one-shot launchd job; a detached
fork-and-wait guardian is forbidden. The root-owned `mutation-guardian` is the job's primary process.
It starts behind a closed start gate, remains in launchd's job process group, and reports its exact job
label, PID, process-start token and PGID to the broker. The broker first publishes a signed, fsynced
`ACTOR_ARMED` event that binds those identities to the already-durable `EDGE_INTENT`. Only then may it
release the broker-owned one-use start gate; broker/IPC EOF before release makes the job exit without
mutation, while a lost reply after release is conservatively treated as "actor may have started."
Before release the guardian cannot execute a target-mutating instruction. After release the guardian
does not fork an independently living actor: it `execve`s the
H4b-hashed `luca-drop-exec`, which drops privilege and `execve`s the one fixed actor in the same primary
PID. The former guardian and actor therefore have one PID/start-token lifetime, not two crash domains.

The one-shot job sets `AbandonProcessGroup=false`, never creates a second process group, and contains no
arbitrary executable extension. The frozen Git preflight disables hooks, filters, fsmonitor, submodule
drivers and every other path that could introduce an undeclared child. An unexpected exec, descendant,
`setsid` or `setpgid` attempt is a contract violation and blocks H4a; it is never waved through as an
actor the recovery algorithm can safely infer. If the primary process exits, launchd's job cleanup
kills any remaining member of that job PGID. If the broker dies, launchd retains the job identity and
lifetime independently. If the job primary dies, no target actor with that same frozen identity can
continue.

A replacement broker treats an unmatched `ACTOR_ARMED` as a durable liveness fence even if a
process-scoped file lock has disappeared. It may not take its first physical predicate read until the
exact launchd job is inactive, the recorded PID/start-token no longer names a process, the recorded
PGID has no member, and two identical absence reads separated by a filesystem sync barrier agree. A
job that is live or whose identity cannot be proved is waited on or ends `RECOVERY_BLOCKED`; recovery
does not kill an unverified reused PID and never guesses state. A crash before `ACTOR_ARMED` leaves the
start gate closed and the deterministic job label is booted out without permitting actor execution.
The result is recorded by the restarted/root broker only after launchd job exit and independent
physical observation, never by trusting actor output.

After a crash with an unmatched intent, exact stable pre-state produces signed `EDGE_CANCELLED`; exact
stable post-state produces signed `EDGE_OBSERVED_RECOVERED`; any third state produces
`RECOVERY_BLOCKED` and no guessed mutation. Partial Git/index/worktree state is an explicitly disclosed
`BLOCKED_MANUAL_RECOVERY` terminal after any committed route B is disabled and any provably observed
global exchange is reversed; the Plan does not promise automatic repository repair at that edge. The
broker then adds one `RECOVERY_CLAIM` and reverses only observed edges in the H4b dependency order.
Every compensation uses the same intent/observed pair.

`RunAtLoad` + `KeepAlive` restarts the root broker after process or host failure; the root-owned key and
immutable ledger are available before the user's login Keychain is unlocked. If the encrypted home
volume/targets are not yet mounted, the broker records no success and waits fail-closed. H4b explicitly
accepts that already exchanged, dormant/quarantined candidate bytes can remain present until the
volume is available and boot recovery finishes.

Observed commit R is the sole allowed parent of A; A is the sole parent of B; B is the sole parent of
C. Each commit has an externally frozen OID, tree ID and exact allowed path/action/before-after manifest;
omission, duplicate, reorder, unexpected path, byte drift or parent/tree substitution blocks before
cutover. Commit A installs one small, stable activation-epoch check in the shared route dispatcher used by
both Claude and Codex; commits B and C are forbidden from modifying that dispatcher. Commit A freezes the
complete pre-transaction route-ID/hash baseline. Any new or changed row outside that baseline is
denied unless it contains the complete epoch tuple, so a missing marker can never make a partially
written B row look legacy. Every route/installed-pin/pending-activation row introduced by B carries
only the frozen H4b transaction ID and a non-self-referential route-epoch ID. Neither B's Git commit
hash nor the full route-file hash is embedded in B bytes. After B is authored, the H4b descriptor binds
its exact commit hash and the SHA-256 of the complete route file (including those rows). Only after the
descriptor SHA is known does the root-owned gate bind transaction/epoch, that same B OID/route path/SHA,
and the cutover-descriptor SHA; the descriptor contains neither its own SHA nor a gate-file hash. Such a row is unreachable unless the dispatcher can read one root-owned,
descriptor-anchored activation-gate slot whose complete canonical value is `OPEN` for that transaction
and epoch and the observed complete route-file bytes hash to the gate's external expected value.
Missing, malformed, unreadable,
partially written, stale or mismatched row/gate state is `NEEDS_ACTIVATION`/deny, never allow. Existing
unchanged pre-transaction routes remain matched by the frozen baseline and are unaffected.

The broker creates and proves the gate's canonical `CLOSED` value before the first live/global edge.
Commit B is checked out while the gate remains closed. Only after B's branch ref, index and every
worktree byte exactly match the frozen post-state and `EDGE_OBSERVED(B)` is durable may the broker
perform the separate descriptor-relative atomic `ROUTE_GATE_OPEN` edge. `LEDGER_COMMITTED` means both
B-observed and gate-open; there is no state in which a partial B checkout authorizes a route. The gate
is the last forward enable edge. Fresh native Claude and Codex verification then runs while the lease
is held. Exact pre-authored commit C contains only final `ADOPTED.md`, verified adoption-log and
CHANGELOG records pointing to the predetermined transaction/public-bundle identity; it changes no
route, pin, target or executable byte. Only after all live receipts are durable may C be checked out
and observed, entering `GOVERNANCE_COMMITTED`; only then may the broker emit `VERIFIED` and seal the
terminal bundle. `ROUTE_GATE_CLOSE` is always the first compensation edge, before C/B repair/revert or
any global reverse exchange. Gate close/open use the same immutable
intent/observation, inode/CAS and crash-replay rules as every other broker edge.

After a partial B checkout, recovery first proves the independent gate already closed or atomically
closes it. Only then may it reverse observed global exchanges and enter
`BLOCKED_MANUAL_RECOVERY` for the repository third state; unrelated repository bytes remain untouched.
If the broker cannot prove the gate closed, it performs no global reverse edge and ends
`RECOVERY_BLOCKED` with the current target tuple preserved. A partial C is handled identically: close
the gate first, preserve the repository third state, and never claim `GOVERNANCE_COMMITTED`. If the bounded direct-discovery exposure
of already exchanged global bytes is unacceptable, Luca rejects H4b and no cutover occurs.

Children receive neither key, journal write access, root descriptor access nor broker control channel.
Verification receives the whole H4b trust bundle out of band and never accepts a fingerprint embedded
only in the journal. Reordering, truncation, duplicate sequence, forked history, unapproved signer
transition, or altered compensation fails. A compare-and-swap mismatch blocks before its intent, and
the broker can never emit `VERIFIED` unless all intent/observed pairs, fresh dual-harness receipts and
the exact observed commit C predicate are present.

The sequence is:

1. `PREPARED`: create a dedicated transaction worktree/branch from the approved target commit and
   freeze route, agent, skill, pin, activation-gate and global-target hashes. Every checkout of the
   target branch must be clean before cutover; any staged, unstaged, or untracked file blocks before
   backup/staging. The shared user checkout is never the place where candidate commits are authored.
2. `GLOBAL_STAGED`: create candidates and backups on the same filesystems as the eventual global
   targets. Live target names and routes do not change. Run both harnesses from the isolated
   transaction checkout/home.
3. `REPO_COMMITTED`: commit only the exact dormant implementation file manifest on the private
   transaction branch. Routes remain quarantined/default-off; no broad add is allowed. H4b may wait
   indefinitely because no shared branch, live target, or user checkout has changed.
4. At H4a, Luca may approve installation and native proof of the dormant root broker/key only. Pause
   again at H4b. Luca sees isolated-live receipts, the two-key trust bundle, exact global swaps, the
   compiled broker transition table and rollback journal before any live/global name changes. H4b
   freezes the post-H4 transition DAG.
5. At cutover, the broker emits `CUTOVER_CLAIM`, acquires the bounded owner-token repository activation
   lease, and rechecks that the target
   branch has the expected HEAD and every checkout is clean, then fast-forward the clean canonical
   checkout to dormant commit A through the guardian/drop-exec path. Commits B and C must already exist
   on the private transaction branch and match the H4b descriptor. `GLOBAL_SWAPPED` uses the broker's
   compiled `renameatx_np(parent_fd, basename, parent_fd, basename, RENAME_SWAP)` operation to exchange
   each non-empty live directory with its same-filesystem candidate in one syscall; the candidate name
   becomes the exact old backup. Symlink targets use the same descriptor-relative exchange. If
   `RENAME_SWAP` is unavailable, the transaction blocks—there is no two-rename fallback. Re-read every
   inode/tree hash.
6. `GLOBAL_SWAPPED` is explicitly the first live exposure because global skills are directly
   discoverable outside repository routes. H4b authorizes this bounded exposure after isolated tests;
   the activation lease is held through verification and failure triggers immediate atomic exchange
   back.
7. While the lease remains held and the independent activation gate is proven `CLOSED`, fast-forward
   the clean canonical checkout to exact commit B containing only route records, installed-pin truth
   and one `pending_live_verification` activation row. It must not claim final adoption. Observe
   the exact B ref/index/worktree predicate, then atomically execute and observe `ROUTE_GATE_OPEN`.
   Only that pair enters `LEDGER_COMMITTED`. Any partial-B predicate leaves the gate closed; recovery
   proves/closes it before reversing global targets and preserves the repository third state for
   explicit manual repair.
8. Run fresh native Claude and Codex receipts against the live route/catalog/target chain. If and only
   if all bind the frozen TCB anchor and exact B/global bytes, fast-forward to exact commit C containing
   final adoption/ADOPTED/CHANGELOG records and observe it as `GOVERNANCE_COMMITTED`.
9. `VERIFIED`: emit success only after C is observed; then seal/publish the terminal public bundle.
   No repository/global/governance mutation is permitted after `VERIFIED`.

DEFER, REJECT and reviewed-upstream registry records are frozen as exact review-only commit R and may
land only under the separate G-REVIEW approval after final Plan approval. Commit R contains no route,
skill, pin, adoption or global-target surface, is not A/B/C, and uses ordinary exact-revert audit
semantics rather than the activation journal. H4b requires R's observed hash so the reviewed baseline
cannot remain stale, but R never waits for a global swap. H1 containment is also separate. A no-live-
mutation PREP first freezes the execution envelope, containment executor/verifier, exact two-target old
predicates, stub bytes/mode, descriptor and quarantine slot; an independent verifier must accept that
payload before H1 can be shown. Luca's H1 reply then binds those exact hashes and the roll-forward-only
failure contract. Only afterward may the frozen executor replace direct invocation of the unsafe
resolving target atomically with a fail-closed quarantine stub while preserving the exact original bytes
outside every discovery path. H1 never binds a future mutation receipt, never restores the unsafe target,
and never activates a candidate capability.

On failure, compensation is derived from one H4b forward dependency DAG, never restated by hand.
`ROUTE_GATE_CLOSE` is the first reverse edge whenever the gate might be open. An exact observed C is
reverted first, then an exact observed B, observed global exchanges, and commit A last. For a
partial/unobserved B, the independent gate is proved closed first, global exchanges may then reverse,
and the repository third state is preserved for manual repair. A partial/unobserved C is preserved as
a repository third state only after the gate is closed; exact B/global/A compensation then follows
the frozen DAG without guessing C repair. Direct discovery of candidate global
bytes during this bounded compensation window is the exposure disclosed at H4b. Repository
compensation uses exact revert commits A/B/C only in the verified-clean checkout while expected
tip/index/worktree predicates match; it never rewrites or discards history. Broad reset, clean,
stage-everything, guessed restoration, and continuing after a lease/CAS mismatch are forbidden. A
partial Git edge or uncooperative external change becomes `BLOCKED_MANUAL_RECOVERY` only after the
gate is provably closed and all provably observed global exchanges are reversed, preserving journal
evidence and user bytes rather than claiming automatic repair. An unprovable gate remains
`RECOVERY_BLOCKED` before any potentially incompatible reverse mutation.

The root broker is version-pinned but not falsely described as transaction-transient. Each transaction
key is transaction-scoped. After `VERIFIED` or `ROLLED_BACK`, terminal cleanup has one irreversible
order and no alternative branch:

1. The broker freezes a canonical single-file public bundle containing the H4b descriptor/public
   anchor, every immutable journal event through the terminal result, and a deterministic manifest.
   It computes the payload root before creating the detached terminal receipt, avoiding a self-hash.
2. It appends the signed `TERMINAL_SEALED` event, which binds the terminal result, prior chain head and
   public-bundle payload root. From that durable event onward, broker code refuses every semantic edge;
   the only permitted work is byte-identical publication verification and key cleanup.
3. It writes the complete bundle plus detached sealed receipt to an exclusive temp in a root-owned,
   Luca-readable but Luca-non-writable public directory, fsyncs the file, publishes the one final name
   with `RENAME_EXCL`, fsyncs the public directory, reads the file back through the unprivileged
   verifier, and verifies its bytes, chain and signature against the out-of-band H4b anchor.
   Byte-identical existing content is replay; a different existing file is a fork and retains the key.
4. Only after that durable read-back proof may it unlink the private key and fsync the root transaction
   directory. Key unlink is never attempted from `TERMINAL_SEALED` alone.

On restart before public-bundle proof, the broker reconstructs the byte-identical bundle from the
immutable root ledger, finishes publication and verification first, and leaves the key in place until
that succeeds. On restart after proof, it verifies the already-published bundle before retrying key
unlink. After unlink, the independently readable public bundle is sufficient to verify the terminal
history; no further signature is required. Thus a crash can leave either a sealed transaction with a
retained finite key awaiting publication or a durably public terminal receipt awaiting/after key
cleanup, never an unverifiable key-free terminal. A `BLOCKED_MANUAL_RECOVERY` transaction retains its
key and finite broker until Luca completes a separate explicit recovery gate. Old transaction IDs,
labels, descriptors and keys can never be reused. Broker uninstallation is a separate disclosed
administrative action, not silently implied by activation.

### Owned implementation surfaces

- `.claude/skill-os/evolution/FUSION-RUNBOOK.md`
- `.claude/skill-os/evolution/adoption-log.jsonl`
- `.claude/skill-os/external-skills/installed-pins.yaml`
- `.claude/skill-os/skill-routing-map.yaml`
- `scripts/evolution-activate.mjs`
- `scripts/macos-atomic-swap.c`
- `scripts/macos-activation-broker/` (finite-state daemon + exact installer; no shell API)
- `scripts/luca-drop-exec.c` and `scripts/mutation-guardian.c`
- `scripts/evolution-recover.mjs` (read-only status client; broker owns recovery and signing)
- `scripts/evolution/verify-activation-build.mjs` (product BUILD verifier; its receipt is candidate evidence, never the trust root)
- `scripts/verify-activation-r6.mjs` (strict WP-13 receipt verifier)
- `scripts/check-external-skill-parity.mjs`
- `scripts/check-registration-sync.mjs`
- `scripts/verify-codex-wiring.mjs`
- `.claude/hooks/route-guard.mjs` (shared activation-epoch check; Codex consumes it through the adapter)
- `schemas/activation-journal.schema.json` in the implementation package
- route quarantine stub, typed root-owned activation-gate slot and exact transaction receipt directory

The independent BUILD/native oracle `verify-activation-build-independent.mjs` is owned by the pre-frozen WP-00 evidence TCB outside every
candidate/child write root. It recomputes raw Git parent/tree/path manifests, descriptor/envelope/
approval identities and journal transitions; it does not trust either product verifier's PASS token.
Only its signed BUILD receipt may emit `WP13_BUILD_FROZEN`.

### WP-13 / H4 command and receipt contract

WP-13 must implement this exact non-live acceptance entry point; renaming a test or replacing a native
case with model-authored prose is not conforming:

```text
node scripts/evolution-activate.mjs --mode spike --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4a --descriptor-key h4a-spike --fault-matrix guardian-lifetime,partial-b-route-gate,partial-c-governance,terminal-publication --receipt-key wp13-r6
node scripts/verify-activation-r6.mjs --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4a --descriptor-key h4a-spike --receipt-key wp13-r6
```

The first command must run only on an isolated APFS fixture under H4a. The second must exit `0` only
when `guardian-lifetime.receipt.json`, `partial-b-route-gate.receipt.json`,
`partial-c-governance.receipt.json`, `terminal-publication.receipt.json` and
`wp13-r6-summary.receipt.json` are schema-valid, signed by the
approved spike broker fingerprint from the H4a binding, bind the exact envelope/binding/descriptor/
binary/config/schema/compiled-transition/drop-exec/guardian/product+independent-verifier hashes, enumerate every
required crash barrier with no skip, and contain native predicate/Claude/Codex evidence hashes. Its
only success token is `WP13_R6_NATIVE_PASS`. Missing one barrier, changing one hash, substituting a
fresh signer, swapping the envelope/binding/descriptor key, or editing/re-signing model output must exit
nonzero. H4b's card cites the verified summary SHA-256. The H4b production descriptor must differ from
the H4a synthetic descriptor; only a different binary/config/schema/compiled transition/drop-exec/
guardian/verifier hash invalidates the spike and requires a new H4a run. Until this receipt exists, H4a
remains incomplete and H4b cannot be offered.

### Mechanical proof

- Before H4a, the WP-00 independent verifier recomputes raw R/A/B/C parent/OID/tree/path/action/hash
  manifests and must reject B self-reference, B-OID/route-byte/transaction-epoch swaps, parent/tree
  swaps, manifest omission/duplicate/reorder/bleed, H4a binding/envelope/product-verifier/signer/summary
  substitution. A product BUILD receipt by itself is never a green token.
- H4a rejects any descriptor containing a canonical/global or R/A/B/C production target. H4b rejects
  reuse of the H4a descriptor, drift in the executable contract hashes proved by H4a, a cutover
  descriptor that embeds a gate-file hash, a gate that does not bind the exact cutover-descriptor SHA,
  or a C manifest containing route/pin/target/executable/future terminal-hash bytes.
- CAS mismatch exits before the first mutation.
- Failure injection at every atomic transition restores the exact reverse-DAG state; a deliberately
  injected partial Git/index/worktree predicate ends `BLOCKED_MANUAL_RECOVERY` only after routes and
  provably observed global exchanges are safely compensated.
- Any dirty canonical target checkout blocks before staging or backup; transaction commits are
  authored only in the isolated worktree and list exact paths/actions.
- A ledger commit failure restores every global target before exit.
- A live verification or commit-C failure closes the independent route gate first, then reverts an
  exactly observed C and B before descriptor-relative global restoration; a descriptor that reverses those
  edges fails validation. A partial B plus closed gate permits global reversal without guessed
  repository repair.
- DEFER/REJECT bookkeeping succeeds with no global target or activation event.
- Recovery is idempotent: replaying an already completed compensation does not alter the restored
  hashes.
- A tight observer and crash injection around the APFS exchange see exactly the complete old or new
  directory, never a missing name; lack of `RENAME_SWAP` is a hard preflight block.
- Removing, breaking, or replacing each Claude/Codex external target makes the dedicated parity
  checker fail with route, harness, expected hash, and observed resolution before cutover.
- A second framework session cannot move the branch or edit an owned path while the bounded cutover
  lease is held; the H4a/H4b waits themselves hold no shared lease and change no shared checkout.
- Journal mutation/reordering/truncation/fork, an attacker-generated key, a broker with the wrong
  root-owned binary/config hash, and an unapproved signer-epoch transition all fail against H4b.
- The native broker spike proves installation, root ownership/modes, unprivileged read/write/control
  denial, `RunAtLoad` restart with the same fingerprint, and sealed transaction-key destruction on an
  isolated APFS fixture. The executed Git child reports exact Luca real/effective/saved UID/GID,
  minimal groups, scrubbed environment and only whitelisted descriptors; hooks/filter/grandchild and
  root-sentinel attacks fail. No Developer Team, Keychain, Secure Enclave or XPC entitlement is assumed.
- Fault injection covers before/after temp create, write, file fsync, rename, directory fsync and reply;
  before/after every external syscall and every `EDGE_OBSERVED`; dead/live-owner temp, torn temp,
  missing sequence, duplicate, `RENAME_EXCL` collision, fork and physical-state disagreement. Dead
  temps quarantine and continue; live/unprovable owners wait/block; at each publish barrier two clients
  produce one immutable event plus byte-identical replay/CAS failure, never two heads.
- Send `SIGKILL` after canonical fast-forward A, after each individual `RENAME_SWAP`, after each B
  worktree rename/index-lock/ref publication, before/after `EDGE_OBSERVED(B)`, before/after
  `ROUTE_GATE_OPEN`, during live verification, and before/after every C ref/index/worktree publication
  and `EDGE_OBSERVED(C)`. At every B barrier, fresh native Claude and Codex
  resolution attempts must deny the new route until the exact gate-open edge is observed. Recovery
  must prove/close the gate before the first global reverse edge; kill again at every gate-close
  publication barrier and require byte-idempotent replay while unrelated repository bytes remain.
- Kill the broker, the one-shot mutation job primary, and both together before `ACTOR_ARMED`, between
  durable arm and start-gate release, before first write, mid-checkout, after last write and before
  observation. Include PID reuse and an undeclared grandchild/`setsid`/`setpgid` fixture. Actor code
  never starts before its durable identity handoff; no predicate read begins until launchd job, exact
  PID/start token and PGID nonexistence all pass. Any unsupported escape or unprovable identity is a
  failed spike/`RECOVERY_BLOCKED`, not inferred quiescence. A second boot/replay is byte-idempotent.
  With the home volume unavailable it remains non-success and never creates a replacement key/fork.
- Crash injection before/after `TERMINAL_SEALED`, every public-bundle temp write/fsync/exclusive
  rename/directory-fsync/read-back, private-key unlink and root-directory fsync leaves exactly one of
  two valid states: sealed with the original finite key retained pending publication, or an
  independently verified durable public receipt pending/after key cleanup. A different-name collision,
  missing public receipt or unverifiable bundle forbids key deletion; replay yields exactly one bundle
  and no reusable signer after successful cleanup.

### Rollback

The journal itself is the rollback program. Each compensation names exact resources and expected
post-state; a generic reset command is invalid. The original FUSION broad-reset instruction must be
removed in the dormant implementation commit before this transaction can reach H4b. A failed WP-13
spike authorizes no cutover: the dormant implementation commit is reverted by exact manifest, and an
H4a-installed broker may be uninstalled only by the separately disclosed H4a rollback command while
its transaction store is still non-live. During H4b, an unprovable actor lifetime or route-gate state
halts before predicate classification or global reversal; a terminal bundle that is not durably
verified retains its private key. There is no degraded fallback for any of these R6 invariants.

## Decision closure

- Pin: post-success atomic commit inside the project transaction.
- Patch: strict target-header parsing with byte-preserved bodies.
- Agents: repository-native logical roles dispatched by the candidate launcher but issued/verified by
  the independently frozen WP-00 evidence TCB.
- Activation: the seven-state CAS journal with durable launchd actor handoff, an independent closed-by-
  default route epoch gate, public-bundle-before-key-destruction sealing, and reverse-DAG
  compensation.

No implementation permission is implied. These decisions become binding only if the final candidate
Plan receives Luca's H3 approval; dormant broker installation requires H4a and live/global swapping
still requires the later H4b approval.

<!-- FILE_END: architecture-decisions.md -->
