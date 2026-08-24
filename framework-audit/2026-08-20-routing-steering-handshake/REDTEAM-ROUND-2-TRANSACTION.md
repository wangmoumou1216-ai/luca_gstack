# Round 2 transaction red team

> Reviewed plan SHA256: `e57ca98ea53e5d68494b330c95264a1418adcc3791c1ae42768ed49fe5d49350`  
> Verdict: **FAIL — 5 BLOCKER / 6 MAJOR**  
> Review mode: read-only; census hashes and both repository baselines verified.

## Blockers

1. The envelope is not authenticated. Claude transcript/session/payload IDs are not mutually bound and the
   native event ID omits the session. Codex has no rollout/origin check; a forged `LUCA_ACTUAL_HARNESS` plus
   direct stdin invocation can mint state. Both harnesses need bounded current-record transcript/rollout
   attestation, exact session binding and direct-invocation replay negatives. `actualHarness()` may select a
   parser, never serve as authorization evidence.
2. A rejected event can inherit an older `TURN_ACTIVE` write grant because PreToolUse validates only the
   session state. Authentication failure or ledger exhaustion must enter a durable deny state, or every tool
   must carry a matching current-event attestation. Authenticated events arriving during COMMITTING/BUSY must
   be durably accounted for so they cannot authorize later by replay.
3. `TURN_ACTIVE + same-parent SELECT(other)` can change epoch while an already-authorized tool is still
   writing the old project. Without an active-tool drain lease, same-parent project correction is allowed only
   from `NO_PIN/SWITCH_ONLY`; an active turn must wait for a new authenticated parent. Test the paused-tool race.
4. `BOUND` can be overwritten before global-lease cleanup. Persist immutable commit evidence plus
   `lease_cleanup_pending` and the exact owner handle; block later transitions until exact cleanup read-back,
   or carry immutable `last_committed_tx` through every successor. Test release fault plus Stop/new prompt.
5. Public CLI surfaces can erase the embedded ledger or bypass recovery. `deactivate` needs its own human
   capability and must publish persistent `NO_PIN` while preserving the ledger. Direct legacy lease recovery
   must be removed or routed exclusively through the recovery coordinator. Freeze an exact production CLI
   authorization table and direct-invoke negatives.

## Majors

1. Recovery claims lack a durable schema and takeover protocol. Freeze claim path/fields, raw-state binding,
   generation/liveness rules, initialization linearization and every internal crash point.
2. The state table is not a complete state × parent relation × exact intent contract and clause precedence for
   mixed cancel/select text is undefined. Unlisted combinations must be a mechanical error.
3. Legacy text pins also require new-session rotation; an empty migrated ledger can replay old transcript
   events. Legacy state may be quarantined/read-only, not trusted into v3 under the same sid.
4. The first Claude census record is inconsistent with the frozen collector, and human/peer authorization
   evidence is not frozen. Re-capture with one collector, freeze raw command/version receipts and minimal
   transcript extracts, and define canonical string/array text-block extraction.
5. Fast-forward checkout is not an atomic hook activation. Add a generation-fenced landing/rollback protocol:
   fence new hook invocations, hold the global lease, prove no live state/transaction lock, atomically switch a
   single release pointer, and journal rollback. If current registration cannot do this, land a separately
   reviewed compatibility activation commit first.
6. v3 state/lock/intent reads need bounded no-follow canonical IO with duplicate-key and inode/read-race
   defenses. `session-restore.mjs` is mandatory and must inject project context only for `TURN_ACTIVE`.

## Required barriers

- cross-session transcript replay, fake harness env and direct route-guard/adapter stdin;
- invalid event after active, event 257, and busy-event later replay;
- paused authorized tool plus steering;
- after BOUND/before lease release, release failure plus Stop/new prompt;
- every recovery-claim initialization/takeover point;
- mixed-generation landing and rollback;
- symlink, oversize, duplicate-key and replacement races for state/intent inputs.

The reviewed SHA is not eligible for user handshake or implementation.
