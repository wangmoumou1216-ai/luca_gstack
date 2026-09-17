# domain-modeling installation verification — phase checkpoint

Status: PUBLISHED / ACCEPTANCE_BLOCKED. Git delivery completed under the user's publication-order override; runtime is incomplete and round-2 review found scoring false positives.

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

## Actual installation publication and post-publication checks (2026-09-17)

- Task commit: `4ab85aaa510c71e49ccbd02c3ace1c9ffbb21343`. Main squash commit: `8370c470c70adf9a5805fa3b8b543e7d80c9d6fe`, parent `45eff207a585757907f323c6952f969ac76a14b2`. Both full Git hooks passed **96/0/0**; no bypass flags.
- Main staged tree exactly matched task commit tree `969123abd34bcb359f0e5ed386cee1c772c5d446`: 37 approved task files only. Local rollback tag `pre-fuse-domain-modeling-20260916` retained; task branch/worktree retained, not pushed.
- Exact upstream push URL verified; remote main equaled the parent immediately before ordinary `git push upstream HEAD:refs/heads/main`. Push succeeded, then `git ls-remote` readback equaled main commit `8370c470...`.
- Server initially reported expected `Required Checks` not yet present. Subsequent [CI run 35199484528](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/35199484528) completed **6/6 success**, including Required Checks and Framework Logic. CI success is not the skill's live/A-B acceptance.
- Published-byte checker, runner self-test and standard-key projection passed. Fresh mutation passed: `/private/tmp/domain-modeling-install.KsdG5S/post-publication/mutation-summary.json`, SHA-256 `a672edb1195dfae7f36cb8efbf7742a95ceb8c1dde2e64940b589a2ca30b2f6f`. Source-manifest digest (ordered JSON from sourceManifest) `23b1cf60061b7513f4166a3a1a2a757409af37b785a8a4f32d71e2297bb18509`.
- A diagnostic `--check` invocation was rejected as unsupported usage (UNKNOWN, exit 2); the supported `--self-test` was separately run and passed. Do not count the usage rejection as a successful check.
- Three protected WIP hashes and the preserved plan-redteam hash remain identical to source-freeze. All five unrelated model-routing audit documents remain excluded; no project/global/Flow mutation.

### Final-byte native Codex smoke — UNKNOWN, not F01 PASS

- Escalated, task-owned final-byte run used codex-cli `0.154.0`, inherited observed model `gpt-5.6-sol`, guided/medium, exact saved host-catalog receipt, 120-second limit. Summary `/private/tmp/domain-modeling-install.KsdG5S/post-publish-smoke/live-summary.json`, SHA-256 `a80a3ea5af8a87c1071376cc1cd4f52799ce93e65d242b85cc82e313987276bb`; `source_bytes_stable=true`, `full_coverage=false`.
- Native packet isolation **PASS**: only four fixture-local candidate skill entries; selected native kind/path/full-body hash matched canonical `bb4ad397fd99364112f3e64bf9fbffcb6d5a8716c0c489b2e4d5ab3d8c05ccd4`, `native_reached=true`. This proves manual native loading and this packet's isolation, not domain-modeling outcome or semantic/internal paths.
- Native rollout `/private/tmp/domain-modeling-install.KsdG5S/post-publish-smoke/codex-home-5qYqrC/sessions/2026/09/17/rollout-2026-09-17T16-25-39-01a0ae78-ad1e-74b3-8d2b-10ed73d3a40b.jsonl`, SHA-256 `445c5918bb02f05f5846319e11231d5fd6f06b55c1db8900b109905fd47629d1`; raw stdout SHA-256 `47809d688359b2ffb8688fa463df1820d0160d9e81cccf95fe9f33f31c73c79d`.
- Actual transport: “Falling back from WebSockets to HTTPS transport. request timed out”. `timed_out=true`, answer null, changed files empty; overall **UNKNOWN**, exit 1. Generated auth copy was removed by runner finally; no auth file remains in this evidence tree.
- Third actual attempt still yielded no answer. Stop retries; Codex full F01–F11 and four-target A/B remain NOT_RUN/BLOCKED pending service availability. Claude remains DEFERRED_BY_USER. No global config, authentication repair or model substitution attempted.

## Independent post-publication quality gate

- Independent `/root/domain_modeling_postpublish_quality`: **FAIL 3/9**. PP01 contracts, PP02 native isolation/grader self-test, C5 static authority/Flow/P2 contract passed. PP03 rollout failed (missing full live-summary at exact ticket directory); stopped further assertions. C1–C4 actual outcomes UNKNOWN; C6 full F matrix/four-target A/B missing. This is a missing-runtime acceptance failure, not a static PASS promoted to full acceptance.
- Strict verdict envelope `/private/tmp/domain-modeling-install.KsdG5S/post-publication/quality-verdict.json` recorded by root's separate recorder, not the judge, with task-owned MEMORY_ROOT only. Canonical verdict digest `39f2ddf8d0c0f048169fa78d051ba0a8c0412895e9fd3e51e565539fab75ee97`; eval_run_id `domain-modeling-U007-postpublish-20260917-8370c47`; log `/private/tmp/domain-modeling-install.KsdG5S/post-publication/memory/evals/eval-log.jsonl`. Protected repository memory/observability not written.
- Round-2 independent reviewer `/root/domain_modeling_contract_review` reproduced two new surviving **MAJOR** in the final-byte behavior scorer; first-round UID/handoff findings are closed. F06 can PASS with BLOCKED status, a new unanswered question and accepted X/Y instead of the fixture's agreed canonical terms. The R02 control can PASS with a new proposed Actor and a relationship replacing accepted User. Current self-tests and `--all` still PASS, so those checks do not prove the scorer excludes these false positives.
- This is review round 2, the approved maximum. Stop implementation and any third review; ask the user for a repair/review delta. Missing actual runtime tickets and these scorer defects independently prevent full acceptance. Publication remains the explicit user-authorized delivery, not a PASS.

## Resume (supersedes pre-publication checkpoint)

1. Commit/push only the approved audit updates, with full hooks and exact remote-parent readback. Git delivery is DONE_WITH_CONCERNS; capability acceptance is BLOCKED.
2. Request user approval for a focused scorer repair and a newly authorized review cycle; retain stable U-006/U-007 identity and add a delta, not a silent third review. Include both counterexamples and restoration checks; rerun fresh mutation/source-byte gates after any repair.
3. Do not repeat the three failed model calls without service availability changing. A future resumed full/A-B run requires exact final-byte manifests and `--host-catalog-receipt` above, a fresh task-owned evidence directory and actual native answers.
4. Adoption remains PENDING until all non-deferred actual gates close. Claude stays deferred; no global configuration repair or mandatory Flow node.

<!-- FILE_END: domain-modeling-verification -->
