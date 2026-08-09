# Cycle 2 execution addendum — linear checkout lag

> Applies to audit execution only. It does not alter the frozen Plan, synchronize either checkout,
> authorize implementation, change a route, or activate a global target.

## Decision

Continue Phase 2 and later **read-only audit production** against
`dce92e6b8c91c617d086ac044e90187b68325fc6`; retain checkout alignment as a mandatory
pre-implementation gate.

This is not an arbitrary truth selection:

- both checkouts have the same canonical Git remote and branch;
- `3f2caad60ec2aa085b87e01db98c852491b53edf` is a strict ancestor of `dce92e6` with no
  desktop-only commit;
- the runtime checkout equals its local `upstream/main`;
- a fresh read-only `git ls-remote` on 2026-08-09 returned `dce92e6` for the server's `main`;
- dirty-path overlap with the audited framework delta and owned output files is zero;
- Luca explicitly delegated intermediate audit gates and requested uninterrupted execution until
  the final independently judged Plan.

## Boundaries

- `KILL-1` is resolved for audit target selection by the verified unique descendant; the nominated
  baseline remains unchanged.
- `KILL-2` remains an implementation precondition: before any future edit or activation, both
  working locations must name the same expected HEAD or the implementation stops.
- No fetch, pull, checkout, merge, reset, clean, route quarantine, global write, commit, or
  activation is authorized by this addendum.
- B09 containment is carried into the candidate Plan as its first safety package; it is not applied
  during Plan production.

Decision owner: `MAIN`, under Luca's explicit intermediate-gate delegation.

## Census scope correction

The independent replay correctly rejected raw three-set equality because the producer inventories
describe different scopes. Execution therefore applies the source-floor policy recommended by that
independent finding without weakening the frozen U-203 safety rule:

- 196 adopted source rows normalize to 197 capability atoms after one required composite split;
- 50 content-addressed local controls form a separate blocking ledger and never inflate adopted `N`;
- 73 raw HEAD rows normalize to 74 governed candidates after one required composite split and never
  enter adopted `N` before a decision;
- all 109 live observations and all 135 independent rows have explicit resolution; unmatched,
  collision and final composite sets are empty.

The final audit universe is therefore 321 atoms, while the adopted manifest denominator is exactly
197. This distinction is frozen in `reconciled-census.json` and `census-finalization.md`; intersection,
majority voting and a raw union remain forbidden.

## Native Codex availability correction

The earlier `UNKNOWN-LIVE` result was retried with the documented Codex requirement that stdin reach
EOF. On 2026-08-09 an approved outer-unsandboxed launch with the inner Codex session still ephemeral
and read-only exited `0` and returned exact message `CODEX_LIVE_PROBE_OK`. The native thread and
warnings are preserved in `codex-live-probe-receipt.json`. This closes CLI availability only; the
missing logical plan/work/oracle roles remain blocking implementation work.

<!-- FILE_END: execution-addendum.md -->
