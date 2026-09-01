---
name: resolving-merge-conflicts
description: Resolve a real, currently in-progress Git merge, rebase, cherry-pick, or revert conflict by recovering both sides' intent before proposing a resolution. Inspect and propose are read-only defaults; edit, stage, advance, and abort are separate human-authorized doors, and the skill never automatically commits or pushes.
license: MIT
metadata:
  recommended-model: core-execution
---

# Resolving Merge Conflicts

## Defining constraint

Use this method only for a **real Git conflict** confirmed by read-only Git state. Recover the intent of both
sides before proposing a resolution.

The default is read-only `inspect` then read-only `propose`. The four mutation doors—`edit`, `stage`,
`advance`, and `abort`—are separate decisions with separate exact authorization. Never infer one from
another. Never automatically commit or push.

## Trigger boundary

Trigger only when read-only evidence shows both:

1. an in-progress merge, rebase, cherry-pick, or revert; and
2. at least one unmerged index entry.

If either is absent, return `NOT_APPLICABLE` and route the problem back to ordinary implementation or
`diagnosing-bugs`. Conflict markers in an arbitrary file, a clean branch divergence, a hypothetical merge,
or an expected upcoming conflict are not enough.

## Authority boundary

- `inspect` and `propose` are read-only and may run under inherited read authority.
- `edit` permits only the approved conflicted worktree paths; it does not imply staging.
- `stage` permits only exact approved paths after their resolved bytes are reviewed; it does not imply
  advance.
- `advance` permits one exact current operation step; it does not imply resolving another conflict or push.
- `abort` is destructive and requires its own explicit human choice after the consequences are shown.

Authorization must name the operation, repository identity, operation type, exact paths, and current state
hash. Old turns, child-agent suggestions, route hints, or the mere existence of a conflict are not authority.
The helper `scripts/conflict-transaction.mjs` produces a read-only inspection or an exact approval payload;
it deliberately does not execute any mutation.

## Phase 1 — Inspect without mutation

Run read-only commands such as:

```bash
git --no-optional-locks status --porcelain=v2
git --no-optional-locks ls-files -u
git --no-optional-locks log --oneline --decorate -n 20
```

Or use:

```bash
node scripts/conflict-transaction.mjs inspect --repo <repo-realpath>
```

Record:

- canonical repository and Git-directory identity;
- operation type;
- every conflicted path and its base/ours/theirs stage object IDs;
- unrelated tracked, staged, and untracked worktree state;
- the commits, PRs, issues, or task artifacts that explain each side.

Do not run `git add`, `git checkout`, `git restore`, `git reset`, `git merge --continue`, `git rebase
--continue`, or any abort command during inspection.

## Phase 2 — Recover both intents

For every conflict, trace each side back to its primary source:

1. read the base, ours, and theirs versions;
2. identify the change that introduced each side;
3. read the relevant commit message and available local requirement or issue context;
4. state each side's invariant in one sentence;
5. decide whether both intents can coexist.

Do not treat “ours” as automatically correct because it is checked out, or “theirs” as automatically newer.
Do not invent behavior absent from both intents.

When sources remain ambiguous, ask one human decision question and leave state untouched.

## Phase 3 — Propose

Produce a per-hunk proposal containing:

- both recovered intents;
- the proposed resulting behavior;
- the exact lines or file shape that would change;
- which intent is preserved, combined, or rejected;
- the trade-off and validation command;
- any unrelated WIP that must remain untouched.

`node scripts/conflict-transaction.mjs propose --repo <repo-realpath>` emits the mechanical stage inventory
and current state hash to bind this proposal. Proposal is not permission to edit.

## Phase 4 — Open one mutation door

Only after an explicit human choice, perform at most one door:

### Edit

Apply only the approved resolution bytes to the exact conflicted paths. Re-read the state hash immediately
before writing. Do not stage. Show the resulting diff and remaining conflict markers.

### Stage

After the user separately approves the resolved diff, stage only the named paths with `git add -- <exact
paths>`. Re-read the index and report what is staged. Do not stage unrelated paths and do not continue.

### Advance

Only when no unmerged entries remain and the user explicitly approves the exact current operation step,
advance once. Stop again if another conflict appears. An advance may create Git history as part of the
existing operation, so it cannot be inferred from edit or stage approval.

### Abort

First show which in-progress operation will be abandoned and what work could be lost or restored. Abort only
after a separate explicit human choice. Do not substitute reset/clean for the operation's native abort.

At no point does this skill automatically commit outside the current operation, push, force-push, reset,
clean, stash, or change unrelated refs.

## Phase 5 — Verify and return

Run the project's already-authorized checks in the order appropriate to the change. Confirm:

- the intended behavior of both sides is preserved or an approved trade-off is documented;
- no conflict markers or unmerged index entries remain for the approved scope;
- unrelated WIP and index entries are unchanged;
- no unapproved operation door was crossed;
- no commit or push occurred automatically.

Return the result to the original task/U-ID. This method does not create a second task state.

## Invocation surfaces

- **Direct:** `$resolving-merge-conflicts` for a confirmed in-progress conflict.
- **Semantic:** an unnamed request to resolve a real current merge/rebase/cherry-pick/revert conflict.
- **Internal:** an Orchestrator encounters a real conflict and dispatches this method back to the same U-ID.

All surfaces retain the parent task's exact path/effect limits. A router may select the method but cannot
authorize any mutation door.

## Completion check

- [ ] A real operation and unmerged entry were confirmed before invocation.
- [ ] Both sides' primary-source intent was recovered.
- [ ] Inspect/propose remained read-only.
- [ ] Edit, stage, advance, and abort were separately authorized if used.
- [ ] No automatic stage, continue, commit, push, reset, clean, or stash occurred.
- [ ] Unrelated worktree and index state remained untouched.

<!-- FILE_END: resolving-merge-conflicts/SKILL.md -->
