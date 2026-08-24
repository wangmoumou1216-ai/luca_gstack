# Safe Bootstrap for the REX → MPC2 → Cycle 2 Recovery

Bootstrap ID: `REX-MPC2-C2-SAFE-BOOTSTRAP-20260820-001`  
State: `REQUIRED_BEFORE_REPOSITORY_HOOK_DISCOVERY`

This bootstrap is a safety boundary, not an implementation gate or completion receipt.

## Why the session must start outside the repository

The canonical and forensic recovery versions of `.codex/hooks.json` contain six trusted lifecycle
commands whose `MEMORY_ROOT` is `/Users/luca/Desktop/luca_gstack`. A SessionStart hook may run
before the main agent can read repository instructions. The stale checkout already has two tracked
dirty episodic files. Starting a fresh Claude/Codex session with the canonical, stale, or recovery
checkout as its initial working directory therefore cannot prove the required zero-write boundary.

Do not repair or disable live hooks as part of bootstrap. Hook repair belongs to the unresolved REX
authority/gate chain and needs the exact applicable approval.

## Exact safe start

1. From an existing shell, create a neutral persistent directory that is not inside any checkout:

   ```sh
   mkdir -p /Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap
   cd /Users/luca/.luca/rex-mpc2-cycle2-recovery-bootstrap
   ```

2. In that same parent shell, clear every repository-local Git locator/config variable before
   launching the session, and disable optional locks:

   ```sh
   unset GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CONFIG GIT_CONFIG_PARAMETERS GIT_CONFIG_COUNT
   unset GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM GIT_CONFIG_NOSYSTEM
   unset GIT_OBJECT_DIRECTORY GIT_DIR GIT_WORK_TREE GIT_IMPLICIT_WORK_TREE GIT_GRAFT_FILE
   unset GIT_INDEX_FILE GIT_NO_REPLACE_OBJECTS GIT_REPLACE_REF_BASE GIT_PREFIX GIT_SHALLOW_FILE GIT_COMMON_DIR
   export GIT_OPTIONAL_LOCKS=0
   ```

   If the launcher cannot guarantee that inherited environment, it is not a valid bootstrap path;
   the verifier will refuse it before any Git read.

3. Start the new Claude or Codex session from that neutral directory. Do not start it with
   `/Users/luca/Desktop/项目/muse/lucagstack`, `/Users/luca/Desktop/luca_gstack`, or a Git worktree as
   its initial working directory.

4. Keep the process working directory neutral. Read repository files by absolute path. First run:

   ```sh
   node /Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-19-rule-execution-recovery-handoff/tools/verify-recovery-handoff.mjs
   ```

   Continue only after exit `0` and the sole stdout token `RECOVERY_HANDOFF_GATE_PASS`. The verifier
   forces `GIT_OPTIONAL_LOCKS=0` and Git `--no-optional-locks` for every canonical/stale/ref read, so
   its status checks cannot refresh either index. It also refuses any cwd other than this exact
   neutral root and refuses inherited repository-local Git locator/config variables before the first
   Git read.

5. Read the canonical `AGENTS.md`, `CLAUDE.md`, this handoff, and its sidecars by absolute path. Do
   not run their mandatory memory commands against canonical: `search_memory.py` appends the tracked
   `memory/retrieval-log.jsonl` on its normal path.

6. Before completing mandatory startup, create a physically independent **disposable memory clone**
   at the exact frozen HEAD and route all startup memory reads/writes into it:

   ```sh
   recovery_scratch=$(mktemp -d /private/tmp/rex-mpc2-c2-bootstrap.XXXXXX)
   clean_git() (
     for git_var in $(env | sed -n 's/^\(GIT_[A-Za-z0-9_]*\)=.*/\1/p'); do
       unset "$git_var"
     done
     GIT_OPTIONAL_LOCKS=0 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null \
       GIT_CONFIG_NOSYSTEM=1 git --no-optional-locks "$@"
   )
   clean_git clone --local --no-hardlinks --no-checkout /Users/luca/Desktop/项目/muse/lucagstack "$recovery_scratch/memory-root"
   clean_git -C "$recovery_scratch/memory-root" checkout --detach ad9903dfad7fea93ac2f5fd3ba1945b11adf6518
   MEMORY_ROOT="$recovery_scratch/memory-root" python3 /Users/luca/Desktop/项目/muse/lucagstack/memory/scripts/get_memory.py --summary
   MEMORY_ROOT="$recovery_scratch/memory-root" MEMORY_SEARCH_SOURCE=handoff-bootstrap python3 /Users/luca/Desktop/项目/muse/lucagstack/memory/scripts/search_memory.py "REX MPC2 Cycle2 recovery handoff" --limit 5
   comparison_scratch=$(mktemp -d /private/tmp/rex-mpc2-c2-comparison.XXXXXX)
   clean_git clone --local --no-hardlinks --no-checkout /Users/luca/Desktop/项目/muse/lucagstack "$comparison_scratch/comparison-root"
   clean_git -C "$comparison_scratch/comparison-root" checkout --detach ad9903dfad7fea93ac2f5fd3ba1945b11adf6518
   clean_git -C "$comparison_scratch/comparison-root" status --porcelain=v2 --untracked-files=all
   ```

   Then finish reading canonical `CONTEXT.md`, workflow state, applicable handoff context, and all
   other mandatory files by absolute path. If memory retrieval changes the recovery action, record
   that fact only after an authorized durable execution root exists; do not use `--mattered` against
   canonical during bootstrap. This memory clone is expected to become dirty from retrieval logging;
   it is never a source-diff baseline, receipt, comparison root, package input, or execution root.

7. The preceding single shell block defines `clean_git` and creates both clones in one invocation;
   it does not depend on a shell function surviving into a later tool call. The second clone must
   produce no status output and remains read-only for forensic comparison. For later Git reads,
   re-declare the exact `clean_git` function in the same shell/tool call before using
   `clean_git -C /Users/luca/Desktop/项目/muse/lucagstack ...`; never assume a function persists
   across calls. Do not `cd` into the repository merely for convenience. Do not create a linked
   worktree, merge, cherry-pick, stage, commit, push, or change a live source/hook during the first
   recovery phase.

8. Re-run the three authoritative checkers, adjudicate the REX root/gate receipts and external
   evidence, and produce the owner/hunk matrix. Any overlap without explicit ownership is
   `BLOCKED_DIRTY_OVERLAP`. Only after that adjudication may a new exact REX `G-PACKAGE` payload be
   proposed; its new top-level approval is mandatory.

## Prohibited bootstrap shortcuts

- No `git pull`, reset, clean, automatic stash, broad stage, automatic push, or worktree prune.
- No write, alignment, fetch, or repair in `/Users/luca/Desktop/luca_gstack`.
- No reopening the contained unsafe resolver, even if a candidate fails.
- No reuse of an expired or root-identity-mismatched receipt as a fresh PASS.
- No jump to U014. The first phase ends at evidence/authority/ownership adjudication or at the exact
  human gate it proves is required.
- No direct canonical invocation of `search_memory.py` or `--mattered` during bootstrap; use the
  isolated clone-bound `MEMORY_ROOT` commands above.
- Never use the intentionally dirty `memory-root` as the clean `comparison-root`, evidence baseline,
  package source, or execution root.
- No Git command that inherits any repository-local locator/config variable; use the exact sanitized
  wrapper above even for the independent clone.
- Do not perform the reserved final `git fetch upstream main` / declaration read during bootstrap.

<!-- FILE_END: SAFE-BOOTSTRAP.md -->
