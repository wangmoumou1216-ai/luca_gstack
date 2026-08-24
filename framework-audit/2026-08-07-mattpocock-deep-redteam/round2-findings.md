# Round 2 findings — frozen-plan adversarial review

> State: `ROUND_2 COMPLETE / 3 OF 3 NO_HANDSHAKE / FINAL JUDGE PENDING`.  
> All three reviewers independently matched every frozen SHA-256 before judging. The defects are in
> the frozen content, not review-target drift.

## 1. Decisive result

Round 2 found new independently failing atoms and material plan defects. Under
`loop-charter.md` and `routing-chain-check.md`, the redteam↔revision cap is exhausted: the frozen
plan cannot be edited and relabeled as passed in this run. An independent judge must now choose
between the only valid terminal states; the three redteams unanimously recommend `NO_HANDSHAKE`.

## 2. Evidence and inventory blockers

### R2-B01 — The 57-unit denominator is not atomic; proven lower bound is at least 60

- MP-021 compresses three independently failing prove-it-bites behaviors into one row: observe the
  failure before pass, assert the exact exit/symptom, and run/paste evidence. The source dossier
  separates them; at least two atoms are missing.
- MP-017 compresses leading-word behavior and `_Avoid_` alias convergence into one row despite
  separate provenance/failure conditions.
- The refreeze also says writing-great-skills contains seven unique content mechanisms while
  MP-013…018 contains only six content rows. MP-053 is a wiring atom and cannot supply the missing
  behavior.

The frozen validator target is therefore guaranteed to omit independently failing behavior even if
all 57 rows pass. This invalidates its Trigger applicability, partial-degradation semantics, and
mutation proof.

### R2-B02 — The “38 origin blobs” corpus is internally correct but materially incomplete

The evidence reviewer recomputed all 38 listed commit/path/line/byte/SHA/blob tuples: every listed
row matches. It also proved that adopted lineage directly relies on at least five omitted upstream
objects:

```text
skills/in-progress/setup-ts-deep-modules/SKILL.md
skills/misc/git-guardrails-claude-code/SKILL.md
CLAUDE.md
.claude-plugin/plugin.json
scripts/link-skills.sh
```

The first two feed MP-021’s prove-it-bites evidence; the last three feed MP-026’s promoted-contract
lineage. “38/38 correct” therefore cannot be promoted to “complete lineage corpus.”

### R2-B03 — The 20 HEAD blob identities are not self-contained in the frozen artifact

The read ledger stores group names, ranges, and semantic anchors, but delegates per-object SHA/OID
to a transient command receipt. A new reviewer cannot replay those identities from the frozen audit
bundle alone. This blocks the claimed upgrade from root receipt to independently replayable
evidence.

### R2-B04 — A newly observed Codex adapter atom invalidates the refreeze

The Codex adapter presents `apply_patch` to project-scope-guard as Bash input, while the guard scans
the whole command string. A real frozen-before-Round-2 event showed that a patch whose prose merely
contained the project-document prefix (`docs` followed by `/`) was rejected; with a pin, that same
class of literal can be rewritten inside patch content.

Frozen G1.1 tests names, old pins, compound commands, symlink escape, and safe reading, but does not
specify patch header/body separation, literal preservation, or proof that a real target write stays
guarded. This is a new independently failing live adapter atom, so the 57-row refreeze fails on its
own expansion rule.

## 3. Plan-executability blockers

### R2-B05 — Acceptance evidence is not executable

The plan names fixtures but gives no owned script path, invocation, input artifact, expected exit
and status, or receipt schema. This affects project-name, hostile-input, secret, dirty-tree, route,
catalog, agent-lineage, human-gate, and activation tests. It cannot meet the charter’s requirement
for executable closure evidence.

### R2-B06 — No accountable delivery ownership

“Owned surfaces” lists files, not an owner/role with a bounded deliverable and failure
responsibility. Dependencies, acceptance, and rollback therefore have no accountable work package;
the charter disallows unowned MAJORs.

### R2-B07 — Track-level T/E/D/V prose cannot close atomic units

One matrix row merges all project/input/redaction/Git/handoff concerns; another merges codebase,
resolving, teach, and TDD. Triggers are not concrete utterance/route cases; execution still offers
undecided alternatives; receipts have no issuer/freshness/lineage contract. A track PASS could hide
one failed atom.

### R2-B08 — Manifest and verifier can share the same omission

G0 creates the manifest, validator, and mutations in the same implementation system. G5 runs those
artifacts but does not require a fresh independent census from upstream and live targets. If the
manifest and validator omit the same unit, the system self-certifies green.

### R2-B09 — G1/G2 route quarantine conflicts with the activation gate

G1 must quarantine unsafe resolving before later work; G2 repeats route quarantine; yet G5 says
only the second Luca gate may change live routes. Either quarantine mutates live behavior before its
authorization, or G1/G2 cannot become green. The plan also lacks a mechanism that blocks direct
Claude invocation of the already installed unsafe global skill.

### R2-B10 — “Post-success pin” is not a feasible transaction as specified

No current post-tool hook receives and commits a switch result into the pin protocol. A post-tool
event occurs after an entire compound Bash call, too late to govern a later segment inside that
same call. The plan does not choose deny, split, wrapper, session/command correlation, CAS, or old-pin
restore semantics, so Round 1’s project escape is not closed.

### R2-B11 — G3 logical roles remain an unresolved architecture branch

Codex execution is written as registered roles **or** workflow runner. Neither a single API nor
schema version, context lineage, issuer identity, freshness, or anti-replay rule is selected. Four
self-authored strings could masquerade as four independent receipts. This is still a missing
executable target, not an adapter module.

### R2-B12 — Activation, ledger write-back, and rollback ordering conflict

G4 permits exclusion/defer evidence before G5; G5 says write-back happens only after activation;
DEFER/REJECT items have no activation event. For adopted items, a global switch followed by a
partial repository ledger failure creates split state. There is no cross-home/repository journal,
compare-and-swap, recovery order, or reverse dependency DAG. G1 and G4 also lack track-level
implementation rollback.

### R2-B13 — G5 live verification has no runnable harness contract

The plan has no isolated-home Claude/Codex launch command, candidate catalog injection, trust and
credential strategy, exact fixture path, expected status, receipt schema, artifact hash, or
mechanical restoration. The current evidence correctly says Claude is `UNKNOWN-LIVE`; future
BLOCKED wording is honest but is not an executable gate.

## 4. Additional major findings

- Teach’s explicit personal Claude-only `N/A` exception is defensible, but its promised dedicated
  write root has no enforcement point, symlink/path-escape policy, or binding record.
- Rollback is not dependency-aware: undoing G0 or G1 after later tracks can reintroduce states those
  tracks forbid.
- One reviewer found re-entry criteria materially underspecified for logic/questionnaire promotion,
  wizard repeat threshold, ask-matt failure threshold, and wait-what. Another judged their overall
  direction acceptable. Because blockers already decide the round, this conflict remains explicit
  for the next audit cycle instead of being averaged away.

## 5. What did pass

- All six target hashes match `round2-freeze.md`.
- Every one of the 38 listed origin records recomputes correctly.
- All 12 exact-install local hashes match their pinned upstream blobs.
- Both truncated read batches were correctly invalidated and reread.
- The revised plan correctly separates static evidence from live proof, keeps supply-side change
  from manufacturing demand, and preserves explicit human gates in principle.
- Teach’s Codex `N/A` classification can remain if the personal, non-routed exception and Claude
  scope enforcement are made real.

These passes prove that the audit was serious; they do not neutralize any blocker.

## 6. Required handoff

The next permitted cycle must start from a newly constructed inventory and executable plan, not a
silent patch to this frozen target. At minimum it must:

1. split all composite atoms and recompute the full denominator from source dossiers;
2. persist the complete origin and HEAD object ledger;
3. assign a named owner, exact file set, dependency, runnable command, input, expected result,
   receipt schema, and rollback to every work package;
4. choose one pin transaction, one Codex role dispatch architecture, and one cross-surface activation
   transaction;
5. map every adopted/modified/deferred behavior to atomic IDs and per-harness T/E/D/V cells;
6. require an independent source census that cannot share the manifest generator’s omissions.

Round 2’s unanimous recommendation is `NO_HANDSHAKE`.

<!-- FILE_END: round2-findings.md -->
