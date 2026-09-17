# domain-modeling installation verification — phase checkpoint

Status: IN_PROGRESS / RUNTIME_PENDING. User explicitly ordered merge/push before remaining checks; this is not a behavior PASS or final publication receipt.

## Approval and identity

- Approved payload: install-plan SHA-256 `fce6beeebd271e91e1ab4b9e18341e36a6dc58710b1fc64e5bbbbd1e24a1ad6f`.
- User delta: “按照你的方案执行。claude先不管”; Claude live/A-B is DEFERRED_BY_USER, not PASS.
- Main and task branch baseline: `45eff207a585757907f323c6952f969ac76a14b2`.
- Task checkout: `.claude/worktrees/fuse-domain-modeling-20260916`; framework/meta NO_PIN.

## Completed local work

- U-001 fixed-source download, license and source hashes frozen; restore preflight PASS.
- U-002 canonical modeling/format/license/native metadata created; quick_validate PASS.
- U-003 manual aliases, command, semantic routing, input modes, guided tier, Codex viability, generated catalog and additive P2 glossary contract created.
- U-004 five conditional caller pointers created; no fixed Flow node, graph/state or root adapter change.
- U-005 pins, vetting, integration/adoption records and generated self-model created; runtime gates explicitly PENDING.
- U-006 implementation complete: dedicated checker, behavior runner, synthetic fixtures and two package commands. Worker ownership returned; no model calls were made by that worker.

## Actual checks

PASS: routing-map coverage and command SSOT (after canonical pointer ordering correction), registration, generated agent context, independent root parity, Codex viability (45/0 for 43 skills), quality-gate contracts, coding discipline, self-model, route regressions (243/0), semantic parity mutation (31/31), engineering-delivery contracts, project-scope regressions (151/0), and project-transaction suite exit 0.

Full `bash scripts/verify.sh`: **FAIL 95/1/0**. Exact failed gate C19 invokes:

```text
python3 scripts/check-skill-scene-coverage.py --selftest
  ✗ TABLE 缺 routing-map 一级 skill: ['domain-modeling']
=== scene-coverage selftest: 1 FAILED ===
```

Readonly reproduction confirms the current main baseline passes, while candidate fails precisely for the new registration. The owner is a separate explicit TABLE, not skill frontmatter; no candidate skill declaration alone closes this gate.

## Approved additive registration delta

User approved the following exact additive file/row on 2026-09-17 (“批准，”); implemented without any change to existing mappings, exemption whitelist or governance behavior.

Add `scripts/check-skill-scene-coverage.py` to U-003's exact file list and insert only:

```python
    "domain-modeling": (None, [], "unobservable"),
```

Reason: calls are conditional and may return only analysis; counting persistent glossary existence/mtime as calls would invent usage evidence. This file is now part of the explicitly approved U-003 delta.

## Fresh local checks and first review fixes

- Additive C19 row approved/implemented; current full verify **PASS 96/0/0**, exit 0. Raw: `/private/tmp/domain-modeling-install.KsdG5S/evidence/verify-final-local.log`; SHA-256 `71408f8f08fb9cfa0f04b83a4aeb5326b1c9861723ff730b6e6ffa7d06d5963b`. Original 95/1 failure above remains historical evidence, not the current result.
- Fresh registration 33/0 warn, generated context/catalog 45, root parity, Codex viability 45/0, hooks, quality/coding/self-model, routes 243/0, semantic proof 31/31, engineering seven contracts, scope 151/0 and project-transaction exit 0 passed.
- Independent static review round 1 found two MAJOR: unconditional parent_u_id and missing lightweight terminal handoff exemption. Root corrected optional UID plus legal non-Plan input/mutation, and context-cost/lightweight plus explicit terminal/no-unauthorized-handoff contract. Independent closure is still PENDING, not a root self-PASS.
- Official minimal quick_validate directly rejects the established Luca `context-cost` extension (exit 1). Preserve this result. Separately, standard-key projection validates (exit 0); dedicated checker parses/checks the canonical extension. Projection is not a direct canonical quick_validate PASS; no global validator was changed.
- Runner self-tests cover scripts/expansions/compound commands => UNKNOWN, realpath/symlink escape refusal, authorized native patch/read order, outside host skill metadata, baseline leakage, and special native skill kind/path/exact-body receipt. Generated disabled overrides are not proof that a service actually honors them.

## Missing runtime and independent tickets

The earlier U-006 worker turn stopped with native infrastructure error: “You've hit your usage limit … try again at 2:36 PM.” It later resumed and completed implementation. The earlier error remains evidence, not a completed review round or behavior ticket.

Codex F01 smoke attempted twice: both UNKNOWN with no final answer/no artifact changes. Sandbox raw summary `/private/tmp/domain-modeling-install.KsdG5S/smoke/live-summary.json`, SHA-256 `feb3729212d764ed883d2040a10c0c13677e2f7c0bc31351d3cfbeb55e6a829a`; escalated summary `/private/tmp/domain-modeling-install.KsdG5S/smoke-escalated/live-summary.json`, SHA-256 `b1bacaa72f183032363f691a0019ac11b4c0729ab170687d88aa09ae8c11efc5`. First transport reported connection refused; escalated transport repeatedly request timed out. Native observed model/medium receipt exists but is not an answer. These are pre-fix source-byte receipts, not final tickets.

Full Codex F01–F11 and four target A/B remain NOT_RUN, terminal independent QA/review and rollout remain PENDING. Dedicated mutation passed on prior bytes and must rerun on final bytes. Claude remains DEFERRED_BY_USER. No synthetic/legacy check substitutes for missing behavior gates.

## Explicit user publication-order delta

Latest user “提交并发布然后在检查”“合并分支和推送” authorizes focused commit/squash merge/main ordinary push now, then remaining checks. It supersedes the prior sequencing, not the exact scope, protection set, no-force rule or full Git hooks. Runtime and independent status stay pending; a Git publication does not mean acceptance PASS.

## Preservation and publication

The protected main observability/retrieval hashes remain those in source-freeze; all unrelated model-routing audit files remain excluded (including newly concurrent g0-plan/g0-preflight). Pre-effect main index empty, HEAD `45eff207`; task worktree retained. At this checkpoint no installation tag/commit/squash/push yet; publication receipts will be appended after actual operations. Prior plan-only `45eff207` is not skill installation.

## Resume

1. Verify unchanged main HEAD/index/protected WIP and exact upstream URL/ref/remote parent.
2. Fresh checker/mutation, exact-path task commit with complete hooks; local rollback tag, main squash/commit with complete hooks, ordinary upstream/main push and remote SHA readback.
3. Follow latest user order: check published bytes, then independently review, run Codex smoke/full/A-B only if infrastructure yields valid responses; never report missing tickets PASS.
4. Live resume requires `--host-catalog-receipt /private/tmp/domain-modeling-install.KsdG5S/smoke-escalated/codex-home-wYNaGD/sessions/2026/09/17/rollout-2026-09-17T14-53-38-01a0ae24-6f78-7a80-a41d-30defe3a681a.jsonl`. Writes target only generated task home; actual packet isolation must pass.
5. Append actual post-publication evidence and commit/push only scoped audit updates. Claude stays deferred, no global config repair.

<!-- FILE_END: domain-modeling-verification -->
