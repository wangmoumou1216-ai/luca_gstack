# Round 1 red team — prompt identity and project transaction

> Verdict: **FAIL**  
> Reviewed plan SHA256: `63d3d615b291482a8857d8dbebbded9c2acb48b0cf95dfb59e32ad878306d7f9`  
> Review mode: independent, read-only

## Blockers

1. Claude's native event identity had not been observed. Removing the random fallback without a raw
   Claude/Codex payload census would disable stateful Claude routing or invent an identity contract.
2. The same-parent table was not exhaustive. Explicit cancel, unrelated prompts, ambiguity, malformed
   identity, state errors, and terminal behavior lacked defined state/ledger/command outcomes.
3. Consumed-event publication, state CAS, and the project lease had no safe common protocol. In the
   proposed supersede flow, an old transaction could pass its lease recheck, mutate shared links, then
   lose the final CAS. Publication order, lock order, crash behavior, and compensation faults therefore
   needed an explicit contract.

## Majors

1. Treating a same-parent event as new authorization silently changed the 2026-08-11 “dedicated new
   top-level user turn” invariant. The delta must be explicit and must fail closed for any harness that
   cannot authenticate the event.
2. The digest lacked version/domain separation and length framing. The only available prompt bytes are
   the UTF-8 bytes of the JSON-decoded JavaScript string; IDs must be validated before hashing.
3. Reusing history schema v1 with different ID semantics was rollback-unsafe. Mixed-version readers,
   legacy state, deployment fencing, and a real rollback drill need exact treatment.
4. Every error/replay/cancel/terminal/CAS path must return structured `command:null`; no human-readable
   output may contain an executable-looking command with `<missing>`, empty, or stale fields.
5. Fault and mutation proof must include event/state publication windows, cancellation, terminal recovery,
   missing IDs, digest collisions, mixed schemas, project-lease barriers, each link mutation, compensation
   failure, and old-reader rollback behavior.
6. Peer/meta `UserPromptSubmit` events need an authorization policy; a peer cannot grant a project switch.

## Required disposition

Run a capture-only payload census before designing the final envelope. No production hook may be changed
for the census, and no runtime implementation or user handshake is permitted for this SHA.

