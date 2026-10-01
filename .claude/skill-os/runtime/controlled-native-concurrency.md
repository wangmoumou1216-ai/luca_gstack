# Controlled changes in concurrent Codex sessions

`manifest.session` is a human label. A native controlled task gets its owner from
the current attested Codex event, with the exact session and canonical checkout
bound into the witness and active-context anchor. A child does not inherit this
authority merely because it has a project association.

Use a single Bash command such as `node scripts/controlled-change-controller.mjs
prepare --manifest '/absolute/path/manifest.json'`. This also works inside the
actual `functions.exec` wrapper: its nested shell call emits Bash PreToolUse.
The hook re-observes the existing native event, creates a private one-use claim,
and adds its path through `updatedInput`. The controller validates the exact
argv, manifest digest, current turn and owner before consuming the claim under
the common-directory advisory lock. Do not supply claim arguments yourself.
All later native controller operations require the same owner and a fresh claim.

Different sessions can have simultaneous REQUIRED tasks for disjoint exact
paths. Scratch roots and external paths count as claims; parent/child paths,
canonical aliases and existing hardlink inodes conflict. Allocation, permission
consumption and terminal release share one Git-common-directory flock. A
structured patch must fit one task. Another attested session can edit a disjoint
path without borrowing a task. A short-lived tool reservation prevents prepare
or finish from racing a structured write between PreToolUse and PostToolUse.

Read, Glob and Grep remain available, including during damaged control state.
Strict single-command `cat`, `rg`, `pwd` and `head -n N FILE` also work through native Bash for other
sessions. They run fixed binaries with quoted argv; rg uses `--no-config`.
`pwd` takes no arguments; `head` accepts one file and a positive line count up to 999999, with no stdin or other flags.
Pipelines, redirects, command substitution and rg `--pre` are not read authority.
Opaque commands such as test runners need an exact `allowed_commands` entry
and the task must be the only REQUIRED across the Git common directory. Git
also needs its exact one-use effect authorization. Either kind of command
enters a durable exclusive lane that blocks new prepares. PostToolUse records
that the exact invocation ended; it never releases this lane or changes
EFFECT_UNKNOWN. Finish/abort is denied while a tool is in flight. After tool
completion the owner can explicitly terminalize its task; effect history is
retained in the receipt. A missing Post leaves a fail-closed reservation; there
is no timeout unlock or automatic recovery claim. Use the explicit recovery
procedure below when the native completion record exists.

Existing legacy REQUIRED entries are neither migrated nor rebound. They remain
checkout-exclusive and cannot coexist with native tasks. Explicit manual legacy
preparation uses `--legacy-checkout-exclusive true`; native hooks reject this
downgrade. Same-checkout legacy sessions do not gain native isolation. Separate
worktrees are not required for the native disjoint-path mode.

A private complete scope index lives outside the checkout, keyed by the Git
common directory. Each row freezes task, generation, owner, manifest hash,
checkout and canonical/inode scope identities. Allocation writes PENDING before
witness/active, then ACTIVE; terminalization writes its durable receipt and
witness before marking the row TERMINAL. A damaged task with an intact index
row blocks only its scope; unrelated structured edits remain usable. A legacy
witness that still proves its task and canonical common-directory checkout can
localize damage to that checkout. Unknown attribution or a damaged/missing
native index remains globally fail-closed. Shared effects still require the
sole task, so unfinished/damaged authority must be reconciled before integration.

## Completing parallel work

Edit tasks and integration are separate authority phases. Each disjoint editor
finishes after its exact postimages match, producing a COMPLETED receipt; this
operation does not require that task to have consumed a Git authorization.
Once both editors are terminal, prepare one integration manifest covering the
resulting files, allow the exact test command, run tests, authorize and run the
exact Git effect, then finish integration. Neither editor must abort or wait
for the other's tests. Do not declare end-to-end verification complete at the
editing receipts; it completes with the integration receipt.

## Recovering a missing Post

Run the read-only command (also permitted through the native hook):

```
node scripts/controlled-change-controller.mjs inspect-recovery --repo '/canonical/checkout'
```

It reports reservation digests and the protected index location/digest. The
same native session may request recovery using the original turn and tool ID:

```
node scripts/controlled-change-controller.mjs recover-tool --repo '/canonical/checkout' --tool-use-id 'original-tool-id' --turn-id 'original-turn-id' --expected-sha 'reservation-sha256' --reason 'Post was lost'
```

PreToolUse supplies a fresh claim. The controller rechecks its native owner,
original reservation digest and unchanged transcript identity/prefix. It must
find exactly one official item_completed for the original session/turn/tool,
appended after admission and completed no earlier than the reservation. Only
then does one atomic CAS remove that reservation and append its audit record.
Foreign, empty, wrong-turn, wrong-digest, missing-evidence and replay attempts
are rejected. Recovery does not consume another task's one-use permissions.

If no terminal evidence exists, the model cannot release the reservation. A
human first checks that the original process stopped, then in a separate manual
terminal runs the exact `reconcile-tool` command with `--repo`, `--tool-use-id`,
`--turn-id`, `--session-id`, `--expected-sha`, `--reason` and `--outcome UNKNOWN`.
It requires typing `RECONCILE <exact-sha>` on a TTY and appends an UNKNOWN audit
record. Native hooks reject this offline verb; pending reservations also deny
opaque wrappers such as `env node ...`, so requesting a PTY is not authorization.

For a damaged index, the manual terminal supports `reconcile-index --repo ...
--expected-sha ... --reviewed-index '/complete/human-reviewed-index.json'
--reason ...`. The human reviews the full task/owner/scope inventory, including
pending allocations; the controller validates schema, overlaps and visible
native task coverage, requires the same typed confirmation, and records prior
and reviewed hashes in a CAS-appended reconciliation journal. It never invents
owners from an active context or silently rebuilds missing authority. Existing
legacy tasks are not migrated by this procedure.

These controls do not defend against a malicious trusted main, compromised
hooks or arbitrary same-user processes. Terminal/IDE writes remain detected by
tuple, baseline and CAS checks rather than intercepted.

Isolated validation:

- `node scripts/test-controlled-native-owner.mjs`
- `node scripts/test-controlled-change.mjs --all`
- `node scripts/test-project-controlled-selection.mjs`
- `node scripts/test-codex-native-lifecycle.mjs --controlled-owner`
- `node scripts/test-codex-native-lifecycle.mjs --controlled-concurrent`

The last command uses a real CLI with a loopback response stub, a temporary home
and checkout, and separately trusted scratch hook commands. It exercises wrapper
admission, claim injection, native patch, a validation command, Git stage and
terminal release without touching installed hooks or production REQUIRED state.
