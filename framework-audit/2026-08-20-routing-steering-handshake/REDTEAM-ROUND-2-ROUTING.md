# Round 2 routing red team

> Reviewed plan SHA256: `e57ca98ea53e5d68494b330c95264a1418adcc3791c1ae42768ed49fe5d49350`  
> Verdict: **FAIL**  
> Review mode: read-only; no runtime files changed.

## Blockers

1. The semantic signal is still only a hint. An agent may ignore it, call no tool, and stop exactly as in the
   incident while all planned L1/L2 assertions pass. The repair must persist a bounded `route_obligation`,
   require a schema-validated route receipt, deny mutation-capable PreToolUse events while the obligation is
   unresolved, and block Stop until the receipt reaches an allowed terminal state. A plan-triggering receipt
   must enter `WAITING_PLAN_APPROVAL`, not unlock implementation. A project-switching prompt must defer rather
   than erase the obligation; a later bare `继续/接着` resumes the same task without another Project Gate.
2. `KILL-03` self-blocks because the untracked audit directory is also inside the stated implementation
   envelope. Split exact runtime/test paths from hash-frozen read-only audit inputs and from required-new
   receipt outputs. Never grant a blanket audit-directory exemption.

## Majors

1. Alias grammar still misroutes `打开 luca app` and `继续 luca app 的登录流程`; question/report/example
   exclusions, unknown explicit targets, all grammar reserved words (including `工程`), and post-NFKC limits are
   incomplete. High-ambiguity verbs require an adjacent `项目|工程` marker; a complete registry plus unknown
   target must return `NEEDS_CONTEXT(alias_not_found)` with no create fallback.
2. Directory/project caps can hide an alias collision and current `readdirSync` can allocate before applying a
   cap. Use a bounded iterator that detects cap+1; any root/project/aggregate overflow makes the alias registry
   `INCOMPLETE`. A hidden 513th-entry collision must be a biting fixture.
3. The three-leg semantic signal permits one `navigation` token to satisfy two legs and may combine unrelated
   clauses. Require all legs in one affirmative clause, distinct interface/structure evidence spans, frozen
   bilingual tokens and boundaries, with explicit cross-clause and same-span negatives.
4. Post-review and landing are ordered inconsistently. Create framework and downstream candidate commits in
   isolated worktrees first; review their exact commit/tree IDs and manifest bytes; after PASS, land only those
   same objects.

## Required biting mutations

- erase an obligation at BOUND;
- omit the Stop gate or Bash mutation gate;
- accept a receipt with the wrong obligation/binding epoch;
- send resumed `继续` back through Project Gate;
- remove each alias grammar guard or ignore cap+1;
- reuse one evidence span or aggregate signal legs across clauses.

The reviewed SHA is not eligible for user handshake or implementation.
