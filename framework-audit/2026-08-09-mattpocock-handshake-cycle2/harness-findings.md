# Cycle 2 — Live-first / dual-harness findings

**Status:** DONE_WITH_CONCERNS  
**Live census:** 109 independently degradable atoms at `dce92e6b8c91c617d086ac044e90187b68325fc6`  
**Handshake verdict:** **BLOCKING** — current checkout cannot truthfully claim dual-harness parity.

## Independence boundary

The census was reconstructed from live installed targets, global pins, route probes, runtime catalogs, nested references, hooks, scripts, and activation governance. This cycle's source census and source-agent outputs were not read. Source joining is intentionally deferred.

## Blocking findings

1. **Patch body corruption is live, not hypothetical.** Codex maps `apply_patch` to the guard's Bash path, so `rewriteBash()` scans the entire patch command. A safe-target probe with a project-looking token only in added prose returned a rewritten body; the no-pin form was denied. Header parsing exists only on the post-edit path. `LIVE-094..096`.

2. **Pin ordering violates commit-after-success.** `project-scope-guard.mjs:216-229` writes the claimed pin before `project.sh` executes and rewrites the rest of the same compound command with that uncommitted target. `project.sh:214-224` never commits the session pin. Existing tests pass because they assert the preclaim behavior; they do not cover failed switch → old pin preserved. `LIVE-097..100`.

3. **Codex plan/work/oracle roles are not registered.** `.codex/agents` contains only `muse-proto-judge`, `preflight-agent`, and `quality-gate`. The live agent catalog agrees. `workflow-runner.mjs` is a generic phase-effort `codex exec` transport, not a logical role dispatcher. `LIVE-102..104`.

4. **No native-log-backed receipt exists.** No issuer/schema binds nonce, parent/child session IDs, logical role, input/output hashes, timestamps, and a native log pointer. Prose can therefore claim independent plan/work/oracle execution without cryptographic or native-runtime evidence. `LIVE-105`.

5. **Active routes exceed the Codex catalog.** Live route probes select `codebase-design` and `resolving-merge-conflicts`, but both are installed only under the Claude global skill tree and are absent from the Codex catalog. In contrast, `tdd` and `systematic-debugging` are correctly shared through `~/.agents/skills`. `LIVE-011..029,092..093`.

6. **Unsafe resolver is active with no quarantine.** The installed merge resolver says never abort, stage everything, commit, and continue. The route is active; no `NEEDS_ADAPTATION` state blocks it. The fusion runbook also calls this resolver during landing. `LIVE-027,029,106`.

7. **Activation is not transactional.** The fusion runbook has no prepare/commit journal, CAS guard, or exact reverse-DAG rollback. It records adoption after merge and recommends `git reset --hard` as primary rollback. `LIVE-107`.

8. **Dual-harness verification can both false-pass and false-fail.** S8 accepts any three TOMLs, so it passes without the required roles. Under ambient `CODEX_*`, S10 misclassifies its Claude hook child and fails; the same hook suite passes when made hermetic. Required-role names and environment isolation are untested. `LIVE-108`.

9. **No-pin read degradation is materially worse on Codex.** The Bash guard denies a project-looking token even when it appears only in read/prose context, while its recovery text recommends a Claude-native Read tool that this Codex runtime does not expose. `LIVE-101`.

10. **Debug templates can disclose secrets.** The installed debugger prints identity environment state, greps the environment, and echoes raw error text without a redaction gate. `LIVE-109`.

## Evidence status

- **LIVE:** four route probes; patch body rewrite/deny probes; 40/0 scope-guard tests; runtime catalog; registration check; workflow-runner transport tests; verifier failures.
- **STATIC:** installed skill bodies, global pin topology, hook/adapter ordering, role TOMLs, runner implementation, fusion runbook.
- **LIVE WITH WARNINGS:** the nested real Codex probe was retried on 2026-08-09 with stdin explicitly
  closed, an ephemeral session, and the inner Codex sandbox set to read-only. The outer sandbox still
  denied app-server initialization, so the approved outer-unsandboxed retry was used; it exited `0`
  with native thread `019fe4a8-9271-7223-ad7f-a25a91097d1f` and exact message
  `CODEX_LIVE_PROBE_OK`. Model-cache and skill-description-budget warnings remain non-fatal. Exact
  command/event receipt: `codex-live-probe-receipt.json`. This proves CLI availability only, not the
  still-missing logical plan/work/oracle roles.

## Required closure before activation

Fix header-only patch classification and body preservation; split switch from pin commit and add failed-switch rollback tests; register and actually dispatch Codex plan/work/oracle; issue native receipts; quarantine unsafe/unmatched routes; add a two-phase activation journal with CAS and recoverable reverse rollback; make the verifier hermetic and role-name-aware.

Artifacts: `live-census.json` and `harness-matrix.yaml`.

<!-- FILE_END: harness-findings.md -->
