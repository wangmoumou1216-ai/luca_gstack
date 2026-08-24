# REX → MPC2 → Cycle 2 — Final Session Recovery Handoff

Handoff ID: `RECOVERY-HANDOFF-20260820-001`  
Captured at: `2026-08-20T12:59:07+0800` (`Asia/Shanghai`)  
State: `READY_FOR_NEW_SESSION_RECOVERY_REQUIRED`  
Goal completion tokens reached: **none**

This is the durable handoff for continuing the existing Goal. It is not an implementation
authority, an independent TST receipt, a human-gate approval, `RULE_EXECUTION_VERIFIED`,
`MPC2_CHANGE_ORDER_INTEGRATED`, or `EVOLUTION_VERIFIED`.

The handoff is usable only through `SAFE-BOOTSTRAP.md` and only when
`tools/verify-recovery-handoff.mjs` exits `0` with the sole stdout token
`RECOVERY_HANDOFF_GATE_PASS`. The external manifest binds this document, its sidecars, both
independent red-team closures, and the neutral launch prompt without a self-hash cycle.

## 1. The honest recovery boundary

The 2026-08-14 checkpoint, checkpoint red-team report, manifest, most U002–U013 receipts, and the
in-progress U014 draft were untracked sole copies under vanished `/private/tmp` worktrees. Their
paths are no longer evidence. The prior U014 draft bytes and its exact path denominator are not
recoverable; the earlier remembered “six new plus two tracked” count must not be reused as a test
denominator. Reconstruct U014 only from REX DEV-014/TST-014/ASSERT authority after the recovery
gates permit implementation.

What did survive is split across four evidence planes:

1. canonical `main`, now advanced to `ad9903dfad7fea93ac2f5fd3ba1945b11adf6518`;
2. the old recovery branch at `29282803bd5f31064819de34c19a2e1663247b66`;
3. global containment objects under `/Users/luca/.claude` and `/Users/luca/.luca`;
4. 188 U008/U009 files under
   `/Users/luca/.luca/framework-audit-evidence/REX-20260811-001` plus a bounded session transcript.

The old recovery branch is **forensic only**. It is not a safe execution base, because its ancestry
contains protected WIP and it diverges from current `main`. Do not create a linked worktree from its
tip and continue implementation. First use an independent neutral clone for read-only comparison,
then resolve authority, gate, owner, and hunk provenance. Any unowned overlap is
`BLOCKED_DIRTY_OVERLAP`.

## 2. Objective and authority chain

The existing Goal remains active and incomplete:

> Strictly execute mattpocock/skills Cycle 2 through REX, MPC2, unchanged Cycle 2 obligations,
> exact human gates, live cutover and records, and fresh Claude/Codex verification. The only final
> terminal is `EVOLUTION_VERIFIED`.

Execution authority order:

1. REX Final Plan:
   `framework-audit/2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md`, plan
   `REX-20260811-001`, SHA-256
   `ca4d57b0057dea529943e167b833eaca5a07d51495fc0f62e2dd47ac23daf4d8`.
2. After durable `RULE_EXECUTION_VERIFIED`, MPC2 change order:
   `framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/FINAL-CHANGE-ORDER.md`, ID
   `MPC2-CO-20260811-001`, SHA-256
   `563f3b1bb4edff297ba932831b3d35faa7bc6fe9da63298c48934f94f059b9ce`, and
   `execution-delta.json`, SHA-256
   `8c36052143790ff099d71549d788a2c36dd8582391224344ad224c6693660ced`.
3. Cycle 2 obligations not explicitly changed by MPC2. Current canonical bytes are the REX-patched
   Plan SHA-256 `4bfbfed81496fe53174a73bc4242b1b0043cc01292db636c379e0dd1892c12d7`
   and Handoff SHA-256
   `9f7837c44f9c3ef85d00f219e5beee5479bd7d05b5a8a71429d5aa20cce0b0d3`.
   They intentionally contain the REX/MPC2 shared-owner block. The archival pre-patch hashes
   `19711435e97eb4c7f27b2185bb5f9b6bfe8f04d78d160be73e78ff8c8afacf28` and
   `57436e3496c641ee0b8393dc7cc569c334a7a5771c18e68b687d7a03f0d507ad` are lineage evidence only,
   not bytes to restore. The current
   manifest SHA is `45ccb4812bdf5f8bcd86eab59ff35fd20810326354bdfeda7b03a4668d64e715`;
   the DEFER register SHA is
   `92c6b8bd3a9b5754a4da31baa893beec8020c699c98ec4731fe185a804f0d5f7`.

Drafts, self-reports, lost receipts, the handoff gate, and focused tests cannot replace any of these
authorities or a fresh independent receipt.

## 3. Current repository and divergence truth

`RECOVERY-STATE.json` is the machine freeze. At capture:

- canonical path `/Users/luca/Desktop/项目/muse/lucagstack`, branch `main`, HEAD
  `ad9903dfad7fea93ac2f5fd3ba1945b11adf6518`, tree
  `c467889bfef1c67b3053519dd63933804bf1ae1b`, and `upstream/main` at the same commit;
- the reserved final-task remote `upstream` has an exact singleton fetch URL set and an exact
  singleton push URL set, each containing only
  `https://github.com/wangmoumou1216-ai/luca_gstack.git`; the handoff verifier compares the full
  live `--all` lists, including cardinality and order, before allowing recovery;
- the index diff is empty; the mandatory Stop-hook extraction produced exactly two protected
  tracked working-tree paths, `memory/episodic/archive/2026.jsonl` and
  `memory/episodic/index.jsonl`; their complete binary diff is frozen by the machine manifest, and
  all listed untracked paths remain protected user or concurrent-session state;
- forensic branch `rex/rule-execution-recovery-u011-20260814` has tip
  `29282803bd5f31064819de34c19a2e1663247b66`, tree
  `87c98aee201784c0454f63eebc03977165ff6a0d`, and common base
  `df63d4e1390d6da4a689c1be84121e84b55b6003`;
- the divergence is 17 current-main-only commits and 30 recovery-only commits;
- the stale read-only checkout `/Users/luca/Desktop/luca_gstack` is at
  `6edcabde191a852825dfb53f845a1eaac545c949`, tree
  `33557fa71c1d1d8f1f7a3b89c74f5c643b72ed79`, with two protected tracked modifications:
  `memory/episodic/archive/2026.jsonl` and `memory/episodic/index.jsonl`.

Exactly eight paths changed on both sides of the common base and require hunk-level ownership:

- `.claude/hooks/project-scope-guard.mjs`
- `.claude/observability/observations.jsonl`
- `AGENTS.md`
- `memory/scripts/consolidate_memory.py`
- `memory/tests/test_memory_system.py`
- `scripts/test-hooks.mjs`
- `scripts/test-project-scope-guard.mjs`
- `scripts/verify.sh`

Current main includes the first four historical REX commits through the common base; it also
contains later unrelated/concurrent work. The forensic branch contains 30 additional commits,
including protected WIP. `RECOVERY-COMMIT-LEDGER.json` maps every historical REX commit to its unit
without inferring author/tester independence from commit existence.

Do not pull, reset, clean, stash, broadly stage, prune, merge the forensic tip, or automatically
push. Do not overwrite current main or the stale checkout. A changed freeze is a new delta, not
permission to absorb it.

The required end-of-session self-growth extraction is also frozen as framework governance, not
REX/MPC2/Cycle 2 implementation: semantic candidates `SC-20260820-001` and
`SC-20260820-002`, meta episode `EP-20260820-133`, its raw episode file, and the session unlock
marker. The verifier binds the candidate/episode bytes through `RECOVERY-STATE.json`; the hook-owned
marker carries volatile counters, so it is validated only as an existing regular file, never by a
static content hash. They do not authorize packaging, satisfy a TST, or change any downstream
completion claim.

## 4. Current checker and gate truth

The exact commands were rerun from canonical on 2026-08-20:

```sh
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs
node framework-audit/2026-08-11-rule-execution-handshake/tools/verify-final-plan.mjs
node framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/tools/verify-change-order.mjs
```

Results:

- Cycle 2: exit `1`, `FINAL_HANDOFF_GATE_FAIL (7)`. Failures include the two patched bundle hashes,
  post-package parent drift, two committed-member mismatches, package exact-set extras, and stale
  checkout HEAD drift.
- REX: exit `1`, `Error: source manifest exact path set drift`.
- MPC2: exit `0`, sole token `FINAL_CHANGE_ORDER_GATE_PASS`.

The MPC2 result validates the future change-order definition only. MPC2 remains
`BLOCKED_BY_REX_DELTA`. The two nonzero results are blocking facts; this handoff does not waive or
normalize them.

Forensic gate material does not cure those failures. The recovery-tree `G-PACKAGE-DESCRIPTOR.json`
has SHA-256 `e59eb3742895a05166b2a65f49ef3befc87930bb488ea9379f9ed394f4dc93fb`, status
`AWAITING_TST_PRE_AND_USER_APPROVAL`, nonce `9b8d3f528ee8d64239d792100966e7ab`, and expiry
`2026-08-18T05:02:48Z`; no G-PACKAGE binding/result is committed beside it. Its G-PLAN result has
SHA-256 `1864c79f41aa365482f2b93dcfbcbea38df1b84da6c4be4b8c5c28d44db3e19d` and opens only
`U-001 PREP` plus `TST-001 PRE`, explicitly not the later human gates.

The stale-checkout Cycle 2 failure must never be “fixed” by writing or aligning the stale checkout.
Carry it as a blocking acceptance delta and resolve the checker/manifest expectation only through
the applicable REX/MPC2 owner matrix and exact gate before the Cycle 2 terminal. Until then, the
Cycle 2 checker remains honestly nonzero.

The initial recovery phase must adjudicate whether the historical REX package/gate chain remains
valid against the present source/authority set. If not, compute a new exact allowlist/hash/payload
and stop for a new top-level REX `G-PACKAGE` approval. Do not cross a failed root checker into U014.

## 5. Surviving gate/evidence facts

### 5.1 U008/U009 external evidence forest

The external root has 13 top-level roots and 188 regular files. Its inventory algorithm is exact:
enumerate regular files recursively; convert each path to a root-relative POSIX path; sort those
paths by raw UTF-8 byte order; serialize one UTF-8 record per file as lowercase
`<sha256><two spaces><relative-path><LF>`; then SHA-256 the complete record stream. That inventory
excludes exactly two non-regular Unix sockets, listed in `RECOVERY-STATE.json`; their exact path set
is checked separately. The regular-file inventory SHA-256 at capture is
`6028425c89a8d72ef4a38d75bc49d7899e49a1afc3011f0668fbc06b7ca67ad8`.

The final U008 root `u008-83adec9.yUSHyU` contains eight Claude/Codex × four-role receipts, raw
native logs, summary SHA-256
`3620bca8d1e39553d683bbb9a904d210a24bbedcac2a164dc3cf539fdc859cb5`, and consumption SHA-256
`139cad0c7ed2da8c5855cc75d4d76b1fc58095787ae01d207959bf497b67591f`.
It is expired and consumed: valuable historical material, not a fresh PASS.

The approved U009 root `u009-3188148.XlLYVg` contains:

- proposal `09cc3922205220bb403c0e070b7d35fa3978f5fff34e315ec4280ec66edfb306`;
- binding `c578e8a082ccd54a38daf028f6330ff42c8764acee2a0225cea4b5e2c92b4364`;
- result `5d4f99b132bed2a85513ae979b17f35968c1541a82691ad40d5491f5248371ed`;
- approved census `c27abc72cdbc34e78be4e40018eaa1f90f216a43f495ce89e71717f954b84107`;
- implementation receipt `3c1c7cb59818167d450c3c8adbe3bdb396737764918ef4f98ce1969a6a22e30c`;
- post-state `4ab18426c979b07666f243c90f2f002ddcdfeeed5bfac95e5972de2164398b4d`.

Those gate files froze receipt-root device/inode `16777230/132828101`; current stat is
`16777233/132828101`. The production verifier rejects the device mismatch. These are historical
authorization bytes, not a silently reusable fresh-valid G-OBLIGATION receipt. The new session must
adjudicate them independently. If the chain is not valid under current authority, create a new
proposal/nonce and stop for a new top-level `G-OBLIGATION-SCOPE` approval before relying on
U010–U014.

The bounded main transcript source is
`/Users/luca/.codex/sessions/2026/08/09/rollout-2026-08-09T17-30-44-019fe5dc-3e4c-7300-a7c2-c0d8747fac82.jsonl`.
The correct U009 approval message is line 28119, message
`msg_019ffe3a-a775-7072-894d-82bfd35d0ce2`, turn
`019ffe3a-a6fa-7573-934e-5fe6ea1f2bf5`, timestamp `2026-08-14T03:04:44.661Z`.
The first 28119 lines / 60441369 bytes hash to
`38e5b5ba64483236521b53ddef75d44db729178676c1bcef5e57b584c6d379e2`.
Do not hash or rely on the unbounded growing suffix.

### 5.2 Global resolver containment

Exact objects:

- live fail-closed stub:
  `/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md`, SHA-256
  `5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de`;
- non-discoverable unsafe backup:
  `/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/unsafe-original/SKILL.md`,
  SHA-256 `c7c9ba81362a786aac05d2223123bf1bd2f8a99c3243a72882ede9c68bedfb24`;
- journal:
  `/Users/luca/.luca/quarantine/resolving-merge-conflicts/20260811T055628Z-c7c9ba81362a/containment-journal.json`,
  SHA-256 `a3c30778b30c12dd1329b162aa8afc8d6279dc572e33ed6e9f76617a34e09592`.

Journal lineage: plan `REX-20260811-001`, unit `U-002`, gate `G-CONTAIN`, status
`RESOLVER_CONTAINED`, descriptor SHA
`7dcdc8833c0ee2df2155d90acaa24f9ff616b496dbba93112381fb13603fe7fe`, nonce
`d84ce5f789a86641d31867860f9598cf`, approval receipt SHA
`c290ca8271fb1c13782fdf241da67a0b75838d6412fe294c76b6e667d94b038f`, turn
`019fef83-30ea-75a2-92e3-6e9d1f14c5be`, transcript offset `8009972`.

The `.agents` and `.codex` resolver routes are absent. Never reopen the unsafe original. A fresh
TST-002 POST may be run; the historical unsafe PRE world must not be recreated. Recover and validate
historical PRE evidence, or keep TST-002 blocked and seek the required authority delta.

## 6. Trusted-hook bootstrap hazard

Canonical `.codex/hooks.json` SHA-256 is
`46ac3cf6254367d94a8228e6c1722e2fa055cbf5d2fa608b17ebf016f2157a60`.
All six repository lifecycle commands hardcode
`MEMORY_ROOT=/Users/luca/Desktop/luca_gstack`. Because repository SessionStart can precede agent
instructions, a fresh session must start in the neutral directory defined by `SAFE-BOOTSTRAP.md`.
This document cannot mechanically make an in-repository first start safe.

Do not edit or disable live hooks during handoff. Their correction/activation must be owned by the
REX recovery package and exact human gate. Until then, keep the new process in a neutral cwd and use
absolute paths.

## 7. Honest execution ledger

| Scope | Current durable claim |
|---|---|
| REX U001–U013 code | Historical commits survive; current ownership/receipt sufficiency unresolved |
| TST-001..013 | No 13/13 durable aggregate; external U008/U009 material is historical/UNKNOWN |
| TST-002 PRE | Must not be replayed by reopening unsafe code; recover or remain blocked |
| U014 | Draft and exact old path set lost; not authorized to reconstruct yet |
| U015 / G-REMOTE | Not started / not reached |
| REX 15 TST / 28 assertions / 7 criteria | Not durably proven |
| `RULE_EXECUTION_VERIFIED` | Not reached |
| MPC2 CO-01..CO-11 / DASSERT-001..012 | Not started; `BLOCKED_BY_REX_DELTA` |
| `MPC2_CHANGE_ORDER_INTEGRATED` | Not reached |
| Cycle 2 321/321 and 2,568/2,568 | No durable final receipt |
| Cycle 2 activation/live records/fresh Claude+Codex | Not completed |
| Root Goal / `EVOLUTION_VERIFIED` | Active and incomplete / not reached |

Cycle 2 invariants remain `ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0`; DEFER
promotions remain zero. Do not pre-create questionnaire, logic-prototype, or TDD-pointer surfaces;
do not add debug/TDD/codebase/resolver workflow nodes; teach remains Claude user-explicit.

## 8. Exact recovery DAG

1. Start outside every checkout exactly as `SAFE-BOOTSTRAP.md` specifies.
2. Run the handoff verifier. A failure stops the handoff; its PASS says only that this recovery
   package is intact.
3. Read canonical instructions and this bundle by absolute path, then create a physically
   independent disposable memory clone at exact canonical HEAD before executing mandatory memory
   startup. Point `MEMORY_ROOT` at it for `get_memory.py` and `search_memory.py`; never let bootstrap
   append canonical `memory/retrieval-log.jsonl`. Finish all mandatory context reads, then re-freeze
   canonical, stale, all readable worktrees/refs, global containment, external evidence, and checker
   outputs. The memory clone is intentionally dirty and cannot be evidence or a comparison baseline.
4. Create a second independent clone in the same self-contained bootstrap shell block after the
   memory search, verify it clean at the frozen HEAD, and keep only
   that second clone read-only for comparison. Do not use a linked worktree or the forensic tip as an
   execution root.
5. Build the current main ↔ forensic branch owner/hunk matrix, including the eight overlap paths and
   every protected WIP commit. Unconfirmed overlap is `BLOCKED_DIRTY_OVERLAP`.
6. Adjudicate the failed REX source-manifest checker, historical G-PLAN/G-PACKAGE/G-CONTAIN receipts,
   TST-001/TST-002, and the root-identity-mismatched G-OBLIGATION chain. Do not implement U014 here.
7. If a fresh package is required, recompute exact sources/allowlist/hash/descriptor and stop at a
   new top-level REX `G-PACKAGE`. Old broad approvals do not authorize new bytes. If obligation scope
   needs renewal, stop separately at the new exact `G-OBLIGATION-SCOPE` payload.
8. Only after valid gates and independent TST receipts permit it, continue the exact REX U/DAG from
   the earliest unresolved node. Reconstruct U014 from authority, not memory. Preserve each receipt
   durably outside ephemeral scratch before advancing.
9. Stop at exact REX `G-ACTIVATE`, then complete U015 and exact `G-REMOTE` under their own approvals.
   Reach `RULE_EXECUTION_VERIFIED` only with all 15 TST, 28 assertions, 7 criteria and obligation
   cells independently proven.
10. Start MPC2 CO-01: re-freeze current HEAD, identify REX-done vs Cycle2-remaining hunks, recompute
    owner matrix/package allowlist/SHA/G-PACKAGE descriptor, and block unknown overlaps. Stop at the
    new exact MPC2 `G-PACKAGE` before CO-02. Complete CO-02..11 and DASSERT-001..012, then and only
    then emit `MPC2_CHANGE_ORDER_INTEGRATED`.
11. Finish unchanged Cycle 2 E0–E7/DEV/TST/ASSERT and human gates; prove 321/321 and 2,568/2,568,
    live cutover, adoption/pin/benchmark records, and fresh Claude/Codex verification.
12. As the last integration task only, and without pull or overwrite, run:

    ```sh
    git fetch upstream main
    git show upstream/main:framework-audit/2026-08-11-rule-execution-handshake/SESSION-CHANGE-DECLARATION.md
    ```

    Reconcile its declaration through the owner matrix. Any new overlap or payload drift returns to
    `BLOCKED_DIRTY_OVERLAP` or the applicable exact human gate.
13. Emit `EVOLUTION_VERIFIED` only after every preceding obligation and fresh dual-harness terminal
    is durably verified. No PENDING state, file existence, static/focused PASS, single harness, or
    self-report can substitute.

## 9. New-session prompt

Start the new session from `/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap`, not from a repo.
Before launch, clear the repository-local Git variables listed in `SAFE-BOOTSTRAP.md`; the verifier
will refuse the wrong cwd or any inherited locator/config variable before its first Git read.
Give it this instruction:

```text
/goal Continue the existing REX → MPC2 → mattpocock/skills Cycle 2 Goal. Keep the process cwd in
/Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap. By absolute path, first run
/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-19-rule-execution-recovery-handoff/tools/verify-recovery-handoff.mjs.
Proceed only on exit 0 and sole token RECOVERY_HANDOFF_GATE_PASS. Then fully read canonical
AGENTS.md, CLAUDE.md, mandatory startup context, FINAL-SESSION-HANDOFF.md, SAFE-BOOTSTRAP.md,
RECOVERY-STATE.json, RECOVERY-COMMIT-LEDGER.json and FINAL-SESSION-HANDOFF-MANIFEST.json. For
mandatory memory commands, first make the disposable memory clone exactly as SAFE-BOOTSTRAP
specifies and point MEMORY_ROOT to it; never append canonical memory/retrieval-log.jsonl. Then make
the separate clean comparison clone; never use the dirty memory clone as evidence. The old
29282803 branch is forensic only, current root checkers fail, and U009 gate bytes have receipt-root
identity drift. Do not enter U014 or change live files until authority, gates, evidence and the
eight-path owner/hunk matrix are adjudicated. No pull/reset/clean/stash/broad stage/prune/automatic
push; use only the sanitized Git wrapper from SAFE-BOOTSTRAP; never write or align
/Users/luca/Desktop/luca_gstack; never reopen the unsafe resolver; save
all evidence durably. Follow exact human gates and terminals RULE_EXECUTION_VERIFIED →
MPC2_CHANGE_ORDER_INTEGRATED → EVOLUTION_VERIFIED. Perform the reserved upstream fetch/show only as
the final integration task.
```

<!-- FILE_END: FINAL-SESSION-HANDOFF.md -->
