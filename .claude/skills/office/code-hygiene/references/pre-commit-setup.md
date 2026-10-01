# Pre-commit setup recipe

Use only for an actual request to add commit-time checks, under verified target scope and original
U-ID. Read first, then propose the smallest change. This recipe does not install dependencies,
change Git config, stage files or create commits by being consulted.

## Detect the actual environment and owner

Read package.json/packageManager, actual lockfiles and installed binaries. Use the detected
pnpm/yarn/bun/npm consistently; conflicting or absent signals need an explicit owner decision,
not a guessed npm install. Record `git -C '<verified root>' config --get core.hooksPath`, existing
`.githooks`/Husky/native hooks, executable modes, prepare scripts, lint-staged and formatter configs.
Preserve their preimages, owners, other hooks and user changes. In luca_gstack the existing
`.githooks` owner wins; never add competing Husky or run `husky init` over it.

## Minimal approved wiring

1. Keep existing formatter config. Only when absent and creation is approved may defaults be
   proposed: spaces, tabWidth 2, printWidth 80, double quotes, trailingComma es5, semi true,
   arrowParens always. Preserve existing lint-staged rules; merge compatible scoped rules.
2. Use the existing hook mechanism. If none exists, propose an owner/mechanism and exact config
   changes for approval. Husky/lint-staged/Prettier are optional candidates, not auto dependencies.
   An approved installation uses the actual manager as devDependencies, not network npx fallback.
3. **Order is fixed**: installed staged-only formatter/lint-staged first, then the repo's actual
   typecheck, then actual test command and any existing checks in their preserved order. Each
   failure propagates nonzero. Don't invent scripts: missing typecheck/test is explicitly omitted
   and reported. Formatting is only the staged list, never whole-repo formatting or `git add .`.
4. A lint-staged proposal may use `prettier --ignore-unknown --write` on its staged-file inputs;
   respect existing rules and partial-staged handling. Never re-stage unstaged user content.
   Keep actual executable mode and hooksPath/prepare wiring consistent with the chosen owner.

## Real smoke and recovery

In an approved disposable fixture/index scope, freeze the exact staged files and hook/config
preimages. Observe formatter→typecheck→test order and real output/exit: valid staged input succeeds;
one deliberate invalid input is refused by the expected existing check; restore just that fixture
and observe success. No actual commit is required to test a hook; commit is a separate exact Git
effect if explicitly approved. Readback must show the hook is actually invoked by current wiring,
not merely that a file exists. Restore only the owned fixture/index/config mutations; preserve
other staged files and Hook owners. Missing installed tooling or permission → proposal/NEEDS_CONTEXT,
never install silently, bypass a hook, claim unrun smoke or stage the entire repo.

Report manager, owner, preserved configs, exact change, staged list, script omissions, invocation/
order/output/exit evidence and remaining gates. Source31 setup-pre-commit, Matt Pocock, MIT, pin
`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`; upstream Husky init/blanket commit adapted to existing
`.githooks` ownership and explicit Git approval.
<!-- FILE_END: code-hygiene/references/pre-commit-setup.md -->
