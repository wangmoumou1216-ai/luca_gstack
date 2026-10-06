# Spec — independent cold review

Status: FAIL1/8. eval_run_id: hook-release-spec-20260930-01. Before/after42file SHA, SCOPE and patch unchanged. Reviewer /root/release_spec; no writes, parent persisted direct report. Severity is independent reviewer judgment.

- R1 UNKNOWN: 37JS syntax passed; full native lifecycle not executed.
- R2 Important: candidate scripts/codex-hook-health.mjs:139–154 validates enum, not correct format. Memory manifest changed codex-hook-adapter.mjs module→commonjs without SHA change; health ok:true. Actual loader returned commonjs; compilation SyntaxError. Validate source/module rules.
- R3 Important: candidate scripts/codex-trust-hooks.mjs:152–158 omits unchangedHooks() at early returns. Actual script flow with memory officialRPC accepted old trusted11rows after Stop command changed during lookup, health stilltrue and exit0. Check frozen bytes postlookup and before either early return.
- R4 UNKNOWN: preservation logic present; independent installer runtime not executed.
- R5 UNKNOWN: dependency closure present; protected Stop runtime not executed.
- R6 UNKNOWN: docs require coordination; momentary activation state does not prove pausedqueue.
- R7 Important: activate-reviewed.py:57–62,141–145 accepts seven arbitrary manifest paths with inconsistent new:true. Memory whole-helper dependencies and real pinnedpatch accepted seven unrelated existing files; injected gitapply failure caused deletion of allseven without patchwrites. Pin immutable manifest/targetallowlist, check new semantics, rollback only actualwrite set.
- R8 PASS: health and activation explicitly retain live-session UNVERIFIED.

Counterexamples use in-memory dependencies. Production/fresh officialprocess/cache/native activation remain unverified. Release blocked; repair then independent closure.
