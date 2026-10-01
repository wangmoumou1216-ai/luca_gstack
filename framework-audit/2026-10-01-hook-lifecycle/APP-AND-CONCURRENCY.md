# App lifecycle and same-directory concurrency follow-up

Status: implementation and independent review PASS; publication gate and formal
App activation is tracked below. This extends the earlier published patch; it does not turn
the earlier CLI fixture into GUI acceptance. The user explicitly requires
multiple sessions to modify one physical checkout concurrently.

## Real App failure reproduced

The installed Luca App was launched with an isolated HOME, independent framework
repository, temporary project and memory roots. All 11 framework registrations
were enabled and trusted only in that test home. A real GUI first prompt failed:

- Host SessionStart rejected `IDENTITY_CHANGED`. Codex's first TUI run atomically
  rewrote its user config, adding screen-reader detection and model-availability
  presentation preferences. The frozen whole-file inode/hash interpreted that
  normal write as a changed launch profile.
- The loopback Responses fixture returned 502 through the system proxy. Direct
  requests returned 200. The test launch now excludes localhost from proxying;
  that test-environment repair is separate from the product identity failure.

Red evidence: `/private/tmp/muse-codex-acceptance-FvzWRp/first-launch-config-red.json`.

## Profile repair

Only the first configuration file, the canonical owned regular
`CODEX_HOME/config.toml`, may use `codex-config-v1`. Its identity retains path,
device, owner, mode and a typed, canonical TOML semantic hash. Only
`tui.screen_reader_detection_done` and the integer-valued
`tui.model_availability_nux` presentation cache are omitted. Unknown TUI keys,
model/provider settings, Hook settings and project trust remain fingerprinted.
The broker independently recomputes the identity; it does not trust a supplied
hash or apply this exception to repository/extra configuration files. Legacy
profiles, source directory and executable identities keep their existing checks.

The parser rejects duplicate/invalid TOML, invalid presentation value types,
unsupported datetime/nonfinite values, symlinks, oversized input and observed
read races. Typed encoding distinguishes integers, floats, booleans and strings.

Validation: 54 host-launch/control-plane tests pass, including genuine
atomic replacement between prepare and attach, then another replacement before
the first tool, for global and project launches. Independent mutation that
removed the entire TUI table incorrectly allowed an unknown setting; the test
caught it. The installed App subsequently passed real GUI acceptance below.

## Concurrent editing gate

Native owner and exact-path claims are implemented. The first
candidate passed native tool-wrapper execution and disjoint-file tests, but
independent review rejected two remaining ways to lock unrelated work: a
locatable damaged task still affected all checkouts, and a missing structured
tool completion callback left an unrecoverable reservation. Both now have targeted repairs: protected complete scope indexing localizes known
damage, and native terminal evidence permits audited same-owner CAS recovery.
Independent final review passed 10/10 (`hook-same-checkout-concurrency-final-v2`).

## Production preservation

The production Codex Hook switches remain disabled. The App test uses only new
test SID/journal namespaces; the 318 preexisting protected journal/model/counter
files were byte-identical after initial startup. The formal App had no open
session panes when it was normally quit to let the UI tool select the isolated
instance. The isolated App was normally quit and both test launch jobs removed after acceptance. The formal App was restored after the user confirmed macOS desktop access.

## Installed App acceptance and publication

The installed signed package passed global new/resume and project new/resume
through normal GUI controls. Two original native SIDs each completed two turns,
with four successful shell tool outputs each. Project binding was committed
441 ms before the first tool; resume retained its epoch and commit sequence.
The global session stayed NO_PIN. A local Responses fixture supplied the tool
sequence; this verifies real App/CLI/Hook lifecycle, not live-model reasoning.
All 11 test registrations were enabled. The observed 40 started and 40 completed
notifications do not identify individual Hook names and are not an assertion
that all 11 fired in this GUI scenario. Existing 318 protected files and formal
config/settings were unchanged.

Evidence: `/private/tmp/muse-codex-acceptance-FvzWRp/app-gui-acceptance-report.json`
and `project-firsttool-binding-proof.json` in the same directory.

The first parser implementation also exposed the App login-shell PATH selecting
an older Python without tomllib. Both App and broker now select an existing
absolute PATH interpreter only after a tomllib capability probe; invalid TOML
still fails closed. No Python installation or production PATH change is needed.
App tests passed 37/37; independent package review v4 passed 7/7. The earlier
review objection about the model-availability table was withdrawn after checking
the actual map schema and native first-run output.

Focused App commit `89d818e947f5c6877c2af92aaf3091bfdbde8b9b` was normally pushed
to `origin/refactor/claude-code-kernel`. The original dirty App checkout was
preserved. Installed ASAR SHA-256:
`7416b52496879bad2348e1497a72ca325c83317fb056a8d85caf9482b1db3d27`.
Only reviewed runtime modules were replaced across the surgical installation;
preexisting installed main-process features were preserved. v4 independently
read back all 441 entries and verified the signature. Receipt:
`/private/tmp/luca-hook-closure-1001-v4/native-trust-install-result.json`.

## Real same-directory concurrency evidence

`/private/tmp/luca-native-lifecycle.S4eZ00/concurrent-result.json` passed seven
assertions: two distinct native session owners simultaneously hold disjoint
claims in one checkout; a third session executes cat/rg/pwd/head through functions.exec;
both editors naturally finish with COMPLETED receipts; a subsequent integration
session runs the real test command, one-use Git stage and finish. Exact edits
and staged files match; there are no Hook denials, tool errors or ABORTED receipts.

Conflicting paths and inode aliases remain serialized. Parallel editors finish
their exact file work before one integration task tests/stages it. Missing native
completion evidence or unlocatable damaged authority requires explicit recovery;
it does not silently release permissions. See the runtime contract
`.claude/skill-os/runtime/controlled-native-concurrency.md`.

## Formal restart permission boundary

Normal formal App restart launched PID 65546 with its original user-data root.
It then waited inside a synchronous directory open. macOS TCC logs identify the
cause: the updated ad-hoc code-signature hash no longer matches the prior
DesktopFolder grant, and a native authorization prompt is pending. A separate
terminal scan completes promptly; this is not evidence of a session scanner
performance regression. No TCC database/reset or permission bypass was used.
The user was asked to allow desktop access through the original system prompt.
After the user confirmed the prompt, both the formal public workspace_state API
and GUI responded. Readback: `/tmp/luca-hook-incident-1001/formal-restored-workspace.json`.
Evidence: `/tmp/luca-hook-incident-1001/formal-tcc-startup.log` lines96–103.

The final cross-check reproduced denial of the App's actual pwd/head reads while
two native claims were active. The final candidate adds only fixed-binary pwd
with no arguments and head with a positive line count plus one file, under the
existing strict shell grammar. Red/green records are
`/tmp/controlled-app-reads-red.log` and `/tmp/controlled-app-reads-green.log`.
All 23 native-owner assertions pass, including redirected/piped/compound read
denials and the prior recovery/concurrency checks.

## Independent final gate

Quality Gate `hook-same-checkout-concurrency-final-v2`: PASS 10/10. The final
15-file source seal matched. Independent host tests passed 47/47 and project
selection tests passed. Reintroducing global damage blocking made its regression
fail; bypassing native completion evidence made recovery regression fail.
Mutation evidence: `/private/tmp/qg-controlled-localization-final.sjQ1yD/result.txt`
and `/private/tmp/qg-controlled-recovery-final.cUicyH/result.txt`.
The repository's normal pre-commit verification is the final publication gate.

The first standard commit gate caught C24's fixture omitting the dynamically
resolved controller file. Only its dependency root list was extended; runtime
and assertions were unchanged. Independent rerun passed 27/27 and delta review
`hook-c24-fixture-dependency-final` passed 3/3. The normal commit gate is retried
with that fixture repair included.

## Production foreign-worktree legacy record

A read-only production inventory found a valid legacy REQUIRED in another
worktree while the mother checkout had no applicable claim. Two session-local
paths still incorrectly consulted the global view: Host initial private binding
and public switching to an existing project. Both now use the checkout view.
Creating a new project still consults global arbitration because it writes the
shared project directory. Existing controlled records were not changed.

Actual Git worktree fixtures reproduce both reds and verify the fixes, including
same-checkout legacy/native denial, unknown damage rejection, foreign new denial
without directory creation, and byte-identical witness/active records. Independent
reviews passed 4/4 (`hook-host-foreign-legacy-final`) and 5/5
(`hook-public-switch-foreign-legacy-final`). Evidence:
`/tmp/host-foreign-legacy-green.log`, `/tmp/public-switch-foreign-legacy-green.log`.

## Desktop versus Luca hook configuration

The restored formal App selected the System Codex profile, sharing
`/Users/luca/.codex` with Codex desktop. Its visible failure is disabled
SessionStart, not a new Hook execution denial. The user clarified that only
Codex desktop should stay disabled; Luca must independently enable its framework
hooks. The App-side follow-up will use process-local exact registered Hook
overrides, preserving the shared file, provider, identity and history. This
follow-up requires its own real App acceptance and publication record.
