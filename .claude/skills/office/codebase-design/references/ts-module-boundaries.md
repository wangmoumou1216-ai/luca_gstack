# TypeScript deep-module import recipe

Consult only for an explicit package-interface enforcement request. Bind verified canonical repo,
finite files/preimages, original U-ID, chosen public seams and resume_target. Default design is
read-only; dependency installation, config/check/example/README edits, temporary violations and Git
effects each require actual approved scope. Non-TS, unknown manager or missing dependency authority
means proposal/NEEDS_CONTEXT. Never install dependencies as part of adaptation/content generation.

## 1. Detect, don't assume

Read packageManager and real pnpm/yarn/bun/npm lockfile signals and actual installed depcruise.
Resolve conflicts with the owner. Find real flat packages root (`src/packages` or `packages` only
when actual structure matches); another convention requires explicit confirmation. Read every
applicable `.dependency-cruiser.*` and check/CI command. Merge existing rules/options, don't overwrite.
Keep cjs for module.exports in type:module repos; preserve regex group `$1` matching. Adapt only
PACKAGES_ROOT to the observed normalized slash path; regex-escape metacharacters in an actual root
if needed, retaining captures. No tsconfig edits or path aliases to hide a violation.

## 2. Public shape and all five error rules

Read [../assets/dependency-cruiser.config.cjs](../assets/dependency-cruiser.config.cjs) through EOF.
Copy/merge the complete source config only with approved write scope. Its five named forbidden
rules are all severity error; source prose's “four” is not authoritative over actual config:

| Exact name | Obligation |
|---|---|
| entrypoint-boundary-from-app | App/root code reaches a package through its root entry files, never subfolder internals |
| entrypoint-boundary-across-packages | A package reaches another only through root entries; own implementation files freely import each other |
| tests-through-entrypoints | Tests reach any package's public entries and their own tests/ fixtures, never implementation internals, even their own |
| tests-folder-is-private | Production/non-test code cannot import tests/ fixtures, including its own package's tests |
| no-circular | Reject actual dependency cycles |

All root files are entry points: index.ts, client.ts, server.ts may each be small. Subfolders at
any depth are private; lib/ and tests/ are conventions, not a whitelist. Packages are one flat tier;
no nested packages. Prefer multiple small entries over a barrel re-exporting a subtree. Layering
(which package may depend on which) is separate and remains the commented optional config stub.

## 3. Approved integration into actual checks

If depcruise is missing, propose an exact devDependency/manager command; run only with explicit
installation approval. Add or merge lint:boundaries using the real installed depcruise and observed
root. Wire into the actual umbrella command beside typecheck, preserving existing behavior and CI.
If no umbrella exists, report the missing CI integration rather than pretending a standalone script
is wired. Preserve source options: doNotFollow node_modules, actual tsConfig and resolve extensions.

Only inside approved example paths, create a copyable package with one root public function,
lib/impl.ts hiding meaningful behavior, tests/example.test.ts importing ../index and asserting the
public outcome. Confirm the seam before testing; no production bulk moves or type assertions.

## 4. Prove every rule, including M24.P07 / M24.OP07

Use actual installed dependency-cruiser and real check wiring in the approved fixture. Capture
commands, exits and named diagnostics; source text/regex simulation is not execution evidence.

1. Clean public-entry imports, ordinary same-package implementation imports and tests→own fixture
   all pass. Record each allowed case, including M24.P07, not just the example test's success.
2. Separate finite temporary violations each fail with their expected error: app→deep internal,
   cross-package→deep internal, tests→own implementation, production→own tests/fixture and cycle.
   The own-test case must specifically fail `tests-folder-is-private`; other deep-import rules
   cannot stand in for it. Restore each owned mutation and pass again.
3. **M24.OP07 omission**: in the approved isolated config fixture remove only
   `tests-folder-is-private`, keep the other four rules and unchanged own-production→own-fixture
   violation. The guard omission must be observed as a failed expectation (the boundary checker
   now wrongly allows that edge), while tests→own fixture and own implementation imports stay
   allowed. Restore the fifth rule, observe expected refusal again, then restore the violation
   and observe green. Do not claim omission red merely because the rule name disappeared.
4. Freeze initial fixture/config/index preimages and restore precisely the task-owned mutations;
   no reset/clean or other user edits. If checks cannot run, NOT_RUN/UNKNOWN, not completion PASS.

## 5. Discoverable convention

Within approved document scope, write `<actual-packages-root>/README.md` next to packages, with a
copy-me layout, root-entry/private-subfolder rule, five named obligations and real lint:boundaries
command. Explicitly discourage barrels. Add only an authorized one-line pointer from the target's
actual agent instructions (existing CLAUDE.md or AGENTS.md); creation is separately scoped, not
automatic. Return actual merge diff, manager/root, all pass→refusal→restore evidence, M24.P07/OP07,
README pointer and open permission gaps to the original owner.

Source24 setup-ts-deep-modules plus its complete dependency-cruiser.config.cjs, Matt Pocock, MIT,
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`.
<!-- FILE_END: codebase-design/references/ts-module-boundaries.md -->
