# Standards — final frozen review

Status: DONE_WITH_CONCERNS. Verdict: FAIL / not closed. Worst: Important (MAJOR).
Cold-start, default-REFUTE; Standards only. No Spec report, implementation history, real session/pin/transcript, or auth-repair-evidence.md was read. No ROOT edit, commit, push, or global trust change.

## Scope and integrity

- ROOT: /private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/wt-attest
- Frozen diff: /private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/takeover-final-review.diff
- SHA-256: 499db08844fd72b0c7c03a87f2b2ce5994c8f7b44f3bbcecb319b81dee785295.
- HEAD: e80bbc1ed91091e59b3f420aff58daa764c6b8ed.
- Base: 97eb65a10873a661d7881ac513885a19f85a859a. Base→HEAD is empty on all 12 scoped paths.
- Final `git diff HEAD | shasum -a 256` exactly matches the frozen SHA; `git diff --check` exits 0.
- Exact diff-header paths: .claude/hooks/lib/event-attestation.mjs; .claude/hooks/lib/project-substrate.mjs; .claude/hooks/project-scope-guard.mjs; .claude/hooks/route-guard.mjs; .claude/hooks/session-sync.mjs; memory/scripts/daily_governance.py; scripts/project-pin.mjs; scripts/test-hooks.mjs; scripts/test-project-scope-guard.mjs; scripts/test-project-transaction.mjs; scripts/test-prompt-attestation.mjs; scripts/test-route-guard.mjs.

## Findings

### STD-01 — Important / MAJOR, patch-introduced: Git argument values are mistaken for message options

Location: `.claude/hooks/project-scope-guard.mjs:558–561`.

Rule: AGENTS K5/K6 and project-session failure posture: NO_PIN may not access shared project paths; literal-data masking must not hide actual path operands or confer authority.

Evidence: the loop treats every token spelled `-m` / `--message` as a Git message option, even after `--` or when that token is another option's value. Independent hermetic hook probes returned **null/pass-through**, in both NO_PIN and pinned fixtures, for:

- `git commit -- -m docs/x.md`
- `git commit --file -m docs/x.md`

The base guard denied both in NO_PIN, and rewrote the real docs operand in pinned fixtures. In an isolated Git repository, `git commit --dry-run -- -m <absolute-fixture-docs-path>` exited 0 and listed both `-m` and `docs/x.md` as selected files. `git commit --dry-run --file -m <absolute-fixture-docs-path>` also exited 0 and selected docs/x.md; here `-m` is the commit-message filename, not an option. No commit was created.

The requested `git commit --pathspec-from-file -m docs/x.md` likewise passes the hook, but actual Git rejects combining a pathspec file with positional pathspecs (exit 128). It demonstrates incorrect classification, not independently a successful Git operation.

Impact: genuine project path operands become opaque placeholders before the guard's deny/redirect checks, so execution retains raw, unverified project-scope operands. Existing tests do not detect this Git grammar case. This is a hard guard violation, not a style judgement.

### STD-02 — Minor, baseline-existing: global Git options still expose message text to path rewriting

Location: `.claude/hooks/project-scope-guard.mjs:558` and `:997–1006`.

Rule: preserve user data; data text is not a path operand (K6/K9 surgical scope).

Evidence: `git -C <fixture-gstack> commit -m "update docs"` is denied in NO_PIN and, when pinned, rewritten to `"update <project-absolute-path>/docs"`. Same result with the base guard: not introduced by this patch. Plain `git commit -m "update docs"` is correctly preserved by the patch.

Impact: a normal global Git option bypasses the message-data recognizer and can silently change message contents. Recorded separately so it is neither mistaken for a new regression nor concealed by STD-01.

## Fresh execution

All repository commands below ran with cwd=ROOT; test fixtures and probes were isolated.

| Command | Actual result |
|---|---|
| node scripts/test-project-scope-guard.mjs | exit 0; PASS=132 FAIL=0 |
| node scripts/test-prompt-attestation.mjs | exit 0; 43 PASS, 0 FAIL |
| node scripts/test-project-transaction.mjs | exit 0; PASS=49 FAIL=0 |
| node scripts/test-event-attestation-negatives.mjs | exit 0; 47 PASS, 0 FAIL |
| bash scripts/verify.sh | exit 0; PASS=94 FAIL=0 WARN=0; native static Codex check |
| git diff --check | exit 0 |

The transaction/negative executions exercised recovery refusal on prefix/source damage, malformed and unknown records, delayed anchors, ledger reset/replay, cross-session provenance, active/switch-only recovery refusal, and CAS/commit-point boundaries. The prompt suite exercised poisoned candidates, synthetic final candidates, slash-command rows, delayed visibility and bounded queue admission. Inspection found no additional concrete authority-minting defect in these changes; this is not an exhaustive security proof.

## Mutation and limitations

- Independent isolated mutation removed the echo/printf `literalWord` guard. The existing scope suite changed from 132/0 to **130/2, exit 1**, failing exactly `echo docs/*` and `printf '%s' docs/*` with missing expected deny.
- Running the unmodified production path again restored **132/0, exit 0**. ROOT and frozen diff remained unchanged.
- Probe source: /private/tmp/d291-standards.xUG25z/probe.mjs. Baseline/mutant copies and inert Git parser fixture live only below /private/tmp/d291-standards.xUG25z.
- No live Claude/Codex model invocation, production-session replay, GUI or external publication was performed. Static verify passed without changing trust.
- The outer active hook rejected inline probe text and a relative fixture docs operand; these were not counted as product failures. The same authorized isolated probes used explicit files / exact absolute fixture paths.
- No broad refactor recommendation. STD-01 must be closed against the updated frozen bytes; STD-02 remains a documented baseline concern unless explicitly included in the repair.

Axis summary: Standards = 1 new Important + 1 baseline Minor. Worst = Important. No cross-axis reranking.

## R1 exact-delta final closure — 2026-09-14

Latest Standards verdict: **PASS / DONE** for the frozen R1 bytes. This supersedes the original verdict above for R1 only. STD-01 and STD-02 are **CLOSED**; no unresolved Standards finding in the reviewed delta.

- R1 freeze: /private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/takeover-final-review-r1.diff
- SHA-256: `f119a0b167cc9ce570911d4dfcd2ea7843d6133da89b7cf67923f021b6f604f2`.
- Both the supplied file and final `git diff HEAD` match that hash. Original 499db freeze remains preserved. No reviewer mutation of ROOT.
- Delta compared against the original freeze: only scope guard, scope tests and the additional transaction test changed. Attestation implementation bytes are unchanged.

Closure evidence:

1. **STD-01**: the Git recognizer now consumes only a verified prefix of leading message options after literal `-C` pairs. Independent hermetic probes confirm `-- -m docs/x.md`, `--file -m docs/x.md`, and `--pathspec-from-file -m docs/x.md` are denied under NO_PIN and retain actual path handling/redirection when pinned. Unknown options and positional operands no longer let a later `-m` hide a path.
2. **STD-02**: plain Git and `git -C <fixture-gstack> commit -m "update docs"` now return unchanged/pass-through in NO_PIN and pinned fixtures; an accompanying real docs operand is still redirected.
3. **Heredoc**: independent actual Bash + hook probes confirm both trailing-space and trailing-tab pseudo-delimiters remain body bytes until an exact terminator. A real command after the exact delimiter (`cat docs/x.md`) remains visible and is denied in NO_PIN. Probe: /private/tmp/d291-standards.xUG25z/probe-r1.mjs.
4. **Direct-path recovery hint**: inspected as a reason-string-only addition after the unchanged deny predicate; it does not alter permission, state or authority. No new authorization branch.
5. **Fresh suite**: `node scripts/test-project-scope-guard.mjs` → **136/0, exit 0**. Reverting only the guard to the pre-delta 499db version in an isolated copy → **131/5, exit 1**, catching the three Git path cases and two message preservation assertions. Restoring execution to the unchanged R1 production path → **136/0, exit 0**. Mutation proves the new Git regression tests distinguish the repair.
6. `node --check .claude/hooks/project-scope-guard.mjs`, `node --check scripts/test-project-transaction.mjs`, and `git diff --check` → exit 0.

Bounded verification: this was delta closure, not a new full audit. The prior full verify result (94/0/0), prompt/negative/transaction runtime results belong to the 499db freeze; they were not falsely re-labelled as fresh full-suite R1 evidence. The new test-only transaction scenario was read and syntax-checked, not rerun here. Live model/session production behavior remains untested. Git message recognition intentionally supports a narrow proven grammar, not every possible Git option arrangement.

Final axis summary: Standards **PASS**, STD-01 closed, STD-02 closed; remaining findings **0**. Spec axis not read or judged.

## R3 scope-only closure and private trust-helper review — 2026-09-14

Latest Standards verdict: **PASS / DONE**, bound to both exact hashes below. No unresolved finding in this directed review. No Spec report read. No production source or real trust configuration modified by the reviewer.

- R3 freeze: /private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/takeover-final-review-r3.diff
- R3 SHA-256: `eebfb0c96d4d144e80d6201b03050aad97ee755e626ac75e19d2365a37cc87b1`.
- Final `git diff HEAD` in ROOT matches that SHA. Against reviewed R1, only `project-scope-guard.mjs` and its scope test changed; the other ten release paths were not re-audited.
- Private helper: `/private/tmp/d291-trust-repo.mjs`, SHA-256 `5efabba41d0219e9c21a6068969d1da967da35f15239b77251fc1208acf15174`. It is outside the release diff.

### R3 runtime closure

- `node scripts/test-project-scope-guard.mjs`: **137/0, exit 0**.
- Independent /private/tmp/d291-standards.xUG25z/probe-r3.mjs: **15** actual pipeline/evaluation/redirection/heredoc-head attack inputs denied. Included echo/printf piped into bash, command substitutions with quoted operator decoys, real redirects after quoted `>` and non-option `-v`, printf option-position `-v`, pipeline/evaluated heredoc headers, unquoted heredoc expansion, and a real command after a quoted delimiter.
- The same probe verified **5** literal/comment/heredoc-header examples under both NO_PIN and pinned fixtures, preserving bytes. Quoted `|` and `<<` did not disable data masking; quoted operators in a heredoc output filename did not become shell syntax.
- Isolated, syntax-valid mutation reverted the shared command scan to raw substring detection: **136/1, exit 1**, failing exactly IDENTITY-DATA-007 on `echo 'docs/x|message'`. Running the unchanged R3 production path again restored **137/0, exit 0**.
- An initial mutation-generator error produced invalid JavaScript; its failures were excluded as invalid evidence. The corrected mutant was syntax-checked before the valid mutation run.
- Production guard syntax check and `git diff --check` both exit 0. No new concrete operator-masking defect was found in this bounded attack set.

### Trust helper — finding found and closed before execution

**TRUST-01 — Important, closed in the helper hash above:** the earlier default `--check` could exit 0 when six hooks were trusted but exact-repository project trust was absent. The corrected final predicate requires `projectTrust === 'trusted'`; `--hooks` checks that prerequisite before any backup or write.

Only a fake RPC/filesystem harness was executed: /private/tmp/d291-standards.xUG25z/probe-trust-r3.mjs. It loaded helper source but made **zero real app-server calls, real config reads or writes**. All **10** checks passed:

1. Project untrusted + six trusted hooks: `--check` returns nonzero.
2. Exact project trusted + zero own hooks: `--check` returns nonzero.
3. `--hooks` with absent project trust rejects before backup/write.
4. `--hooks` with zero own hooks rejects before backup/write.
5. Fully satisfied `--check` stays read-only and excludes third-party source hooks.
6. Mock hook write edits exactly six current hashes owned by the exact repository hook source; unrelated/foreign state remains unchanged. The call carries the read version in `expectedVersion`, targets only the exact user config, and is preceded by exclusive backup + mode 0600.
7. Mock project write edits only `projects.<exact repo>.trust_level`.
8. Already-trusted `--project` performs no write or backup.
9. An unexpected semantic readback change is rejected.
10. CAS rejection is propagated; no result is adopted as a successful write.

Static inspection confirms source-path equality, exact repository key prefix, six-hook count, enabled/non-managed/current-hash checks, full-config expected semantic comparison and backup retention. Helper syntax check exits 0.

`--project` is intentionally only the project-trust step: it does not certify six hook hashes, and its exit 0 must not be presented as complete hook readiness. The overall readiness check is `--check`; hook authorization is `--hooks`. No real write-mode execution or live server compatibility was verified by this reviewer.

### Final scope and limitations

This is the user-approved R1→R3 directed closure plus the private helper's pre-execution audit, not a renewed broad audit. The prior full verify/attestation results retain their original freeze attribution. R3 and helper PASS do not claim live trust was changed or authorize any additional repository/third-party effect.

Final axis summary: **Standards PASS** for R3 `eebfb0c…87b1` and helper `5efabba…5174`; prior STD-01/02 remain closed, TRUST-01 closed, unresolved findings **0**.
