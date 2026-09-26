# Project/session host read contract

Contract version: Host View `api_version=1`
Framework baseline: `f22ecb5be8099b575c15849c0d48263e0a6ee584`
Scope: Gstack framework only. This is not a Muse UI or application integration.

## Trusted invocation

The host backend must call these as an argv array with `shell=false` and a configured, trusted Gstack root:

```text
["node", "<gstack-root>/scripts/project-pin.mjs", "list", "--view", "host"]
["node", "<gstack-root>/scripts/project-pin.mjs", "status", "--view", "host", "--session-id", "<trusted-native-session-id>"]
["node", "<gstack-root>/scripts/project-pin.mjs", "status", "--view", "host", "--session-id", "<trusted-native-session-id>", "--operation", "<opaque-id>"]
```

The session id comes from the host's trusted native-session mapping. Renderer parameters, conversation text, cwd, selected project, and shared display links are not trusted sources. The CLI rejects any id that would be changed by sanitization. This local CLI is not a network authentication boundary; the host remains responsible for limiting who may query which session.

All host-view commands write one JSON object to stdout. Diagnostics go to stderr. `OK` and `NO_RECORD` exit 0; invalid state, unavailable I/O, and unstable snapshots exit 1; malformed CLI parameters, session ids, and operation ids exit 2. Unknown, duplicate, or missing host-view arguments are rejected rather than ignored.

## Status fields

| Field | Meaning |
|---|---|
| `api_version` | Host projection schema version, currently `1`; independent of internal state schema. |
| `session_id` | Exact canonical id supplied by the trusted host. |
| `read_status` | `OK`, `NO_RECORD`, `INVALID`, `UNAVAILABLE`, or `UNSTABLE`. Missing state is `NO_RECORD`, not `NO_PIN`. |
| `snapshot_id` | SHA-256 of the single raw state snapshot, or `null`; consistency token only, never an ordering or authorization token. |
| `state` | Valid internal state label or `null`; informational only. |
| `binding_validation` | `VERIFIED`, `NONE`, `INVALID`, or `UNKNOWN`. |
| `current_binding` | `null` or verified `{project,realpath,dev,ino,epoch}`. |
| `current_operation` | Pending operation when present, otherwise the latest result: `{operation_id,kind,target,status,created,bound,commit_id,error_code}`. Status is one of `PREPARED`, `RUNNING`, `CREATING`, `COMMITTED`, `FAILED`, `SUPERSEDED`, `OWNERSHIP_UNKNOWN`, or `EXPIRED_OR_UNKNOWN`; only `COMMITTED` may expose a non-null `commit_id`. |
| `queried_receipt` | `null`, `{lookup:"FOUND",receipt}`, or `{lookup:"EXPIRED_OR_UNKNOWN",receipt:null}`. Historical success never implies it is still current. |
| `selection_commit` | Latest successful explicit agent/user selection: `{stream_id,sequence,commit_id,kind,target,binding_epoch,committed_at,origin}`. |
| `execution_authority` | Constant `NOT_PROVIDED`. This view cannot satisfy a tool guard or authorize work. |
| `error` | `null` or a whitelisted `{code,message}` without prompt, transcript, cursor, or secret state. Parameter errors use `INVALID_PARAMETERS`, `INVALID_SESSION_ID`, or `INVALID_OPERATION_ID`; state failures remain separately classified. |

The implementation reads and parses one complete state value, validates its binding, then reads the bytes again. If they changed, it returns `UNSTABLE` with all binding, operation, receipt, and commit projections cleared. It never combines fields from different state generations.

## Project list fields

`list --view host` returns `api_version`, `read_status`, `projects`, `excluded`, and `error`. `projects` is a stable name-sorted array of canonical `{project,realpath,dev,ino}` identities. Hidden staging/reservation paths and symlinks are not selectable projects. `excluded` uses the stable codes `SYMLINK`, `NOT_DIRECTORY`, `INVALID_RESERVATION`, `NOT_READY`, or `INVALID_IDENTITY`. An unreadable root returns `UNAVAILABLE` with `projects:null`; it is never reported as a successful empty list.

## New selection versus an old observation

Every successful new public `switch` or `new` call has a fresh controller-generated `commit_id`. `(session_id, stream_id, sequence)` is the monotonic marker within one state lifetime. Explicitly entering the same project again produces a new `commit_id` and increments `sequence` even when the binding epoch can remain unchanged.

Replaying an already committed internal transaction, polling status, querying an old receipt, re-observing the native event, Stop, failures, and unknown results do not increment the sequence. A host detects a new explicit selection only by comparing `(session_id,stream_id,sequence)` and confirming `commit_id`; it must not substitute the target name, timestamp, binding epoch, or `snapshot_id`. The framework exposes the latest success and queryable retained receipts, not a durable event bus; the host owns any consumption cursor.

Host View v1 is a projection contract, not the internal state schema. Additive internal fields are invisible until a future host-view version deliberately exposes them. Callers must branch on `api_version`, treat unknown versions as unsupported, and preserve the null/error distinctions above.

## Read-only guarantee and evidence

The host module calls no attestation, selection preparation, switch, recovery, migration, CAS, lease, initialization, or display-link routine. Fixture verification compares state bytes and mtime before/after successful and exceptional reads.

Primary verification:

```text
node scripts/test-project-host-view.mjs
```

Supporting verification:

```text
node scripts/test-project-selection-v34.mjs
node scripts/test-project-transaction.mjs
node scripts/test-project-scope-guard.mjs
node scripts/test-route-guard.mjs
node scripts/test-project-gate-v34-mutations.mjs
node scripts/test-project-gate-v34-dual-host.mjs
node scripts/test-workflow-runner-runtime.mjs
```

Final repository-wide verification after implementation-review repairs:

```text
bash scripts/verify.sh
PASS=105 FAIL=0 WARN=0 DELEGATED=1
```

The focused selection suite additionally proves two concurrent retries of one transaction publish one receipt and sequence, two sessions racing to create the same target produce exactly one committed winner, an existing project is rejected before reservation, nineteen same-event receipts remain queryable until event close, and Stop preserves an interrupted creation's `created` and `phase`. The controlled-selection suite independently proves the controller rejects an unauthorized internal `new` and preserves a READY interrupted creation when a recovery authorization is refused. The mutation suite first proves its isolated unmodified control is green, then proves A01/A04/A05/A09 each turns red under the intended mutant, and finally restores green.

The dual-host fixture runs the production Claude hook path and Codex adapter path for enter plus same-event task, unknown-result lookup, NO_PIN absolute reads, Stop cancellation, refusal, and damaged-state degradation. The workflow runtime fixture freezes an absolute A work root, switches the isolated session to B, cancels with queued and in-flight work, and verifies both non-dispatch of queued actions and process-group termination without claiming OS rollback.

## H01-H08 implementation results

| Gate | Result | Mechanical evidence |
|---|---|---|
| H01 | PASS | Host-view fixture distinguishes empty/unavailable roots and reports valid, symlink, non-directory, invalid-reservation, and non-READY entries from one sorted enumeration; two session ids retain different verified bindings. |
| H02 | PASS | Host-view fixture distinguishes `NO_RECORD`, legal `NO_PIN`, malformed/legacy state, invalid inode identity, and unavailable roots; every projection keeps `execution_authority=NOT_PROVIDED`. |
| H03 | PASS | Double-read fixture mutates the state between reads and receives `UNSTABLE` with cleared projections; whitelisting excludes an injected secret field. |
| H04 | PASS | Selection and transaction fixtures cover same-project re-entry with distinct commits and increasing sequence, unchanged epoch, byte-idempotent committed replay, Stop preservation, and failed-operation retention of the last success. |
| H05 | PASS | Host fixture reads an A receipt while the binding remains B, returns `EXPIRED_OR_UNKNOWN` for missing ids, and never invokes recovery; stream/sequence are validated before publication. |
| H06 | PASS | Host fixture compares state bytes and mtime before/after success and invalid CLI calls, verifies absent-state reads create nothing, and confirms list reads do not repair excluded entries. |
| H07 | PASS | CLI fixtures use argv arrays with `shell:false`; canonical session/operation ids and exact option grammar are enforced, sensitive internal fields are absent, and no Muse interface claim is made. |
| H08 | PASS | Route-guard fixtures cover the full framework-only/negative-switch wording: all project-name mentions remain neutral turn evidence and do not create a selection commit. |

The isolated mutation suite proves A01/A04/A05/A09 as negative control → mutant red → restored baseline. Repository-wide verification passed after the first independent-review findings were repaired. The final closure verdict is reported separately because a passing framework contract is not Muse integration. No Muse `app/main.js`, sidebar, preference, or UI change is part of this delivery.
