# BR-PAGE R5 修复闭合与主线交接

状态：DONE（本次整体复核修复范围）。原 1 Important、1 Minor，以及终版复核发现的同源 SF-001 遗漏均已关闭。当前可交回主 session 做主线验收和选择性提交；本 session 未暂存、提交或推送。

用户授权：全部解决复核问题，完成后由主 session 提交。框架维护保持 NO_PIN，未访问项目别名或下游，framework 资产只读。原报告 `2026-09-05-page-library-overall-review.md` 保留为修前记录，本报告是修复后的终版结论。

## 交接要点

1. `page-context.mjs` 的 library entry 判定容忍 stdin/虚拟 launcher；直接 CLI 行为保留。现有 handoff suite 新增调用矩阵与恢复旧 guard 的反证。
2. R-20260525-001 由 R-20260905-001 取代，旧规则正文和观察证据保留；现行规则不强制本地母版，禁止未确认施加参考约束。
3. SC-20260609-003、SC-20260610-001、SF-001 经候选、独立内容审查、明确授权、promotion_ready 与归档，分别替换为 SC-20260905-002/003/004。旧记录逐字归档，其他 86 条稳定事实及 10 条规则未改。通用 DRY、内容模板、实际设计系统和工具权限保留。
4. 新增 active-context 回归，与 handoff suite 同时接入 package、verify、CI（S14d/S14e）。真实规则/查询与恢复旧记录的负例均验证。

新鲜验证：全量 verify **93 PASS / 0 FAIL / 0 WARN**；记忆系统 **54 tests PASS**；handoff **7 个行为分区 + 5 个实际 mutation 分区**在 Node 20.20.2、22.23.1 通过；active-context **3 tests PASS**覆盖三条旧事实与一条旧规则的恢复反证。完整证据、最终精确版本与治理记录见 `2026-09-05-page-library-r5-validation.json`。

## 主 session 的下一步

- 先读本报告及 R5 validation；旧 B5 manifest 已被当前版本取代，不能将旧 hash 当最终消费上下文。
- R5 精确 delta 为 validation.r5_review_scope 的 12 文件；checkout_review_manifest 是共享工作区快照（含继承主线修改），**不是自动暂存清单**。候选文件按现有策略为 ignored runtime 数据，精确三条候选及九条 reviews 已另存到本次 validation 供发布审计，不要求强行纳入候选工作文件。
- 主线继续原 P6：重新冻结当前 context/fixture/evaluator 与证据复用依据，完成原有真实双 Harness / OD 接收读回 / 最终预算与发布门。既有进程预算、外部授权和页面库豁免不变；本地测试不充抵外部实测。
- 提交前核对 HEAD、最终 diff 和 index，保留用户 retrieval-log 及无关工作。本次没有扩大暂存或推送授权。

下面原样保留两个独立终版报告，分轴裁决，不跨轴合并等级。

## Standards

# R5 final Standards closure

Verdict: **PASS**. Findings: **0 Critical / 0 Important / 0 Minor**. Status: **DONE** for this bounded Standards review.

Scope is exactly the refreshed 12-file R5 delta in `/private/tmp/br-page-r5-final-scope.json`, compared with `/private/tmp/br-page-r5-before-jxfd26ba` and `/private/tmp/br-page-r5-final.patch`. All 12 final hashes and all available before hashes were independently verified. Default stance was REFUTE; no prior review verdict or other-axis report was opened. Review followed applicable AGENTS/CONTEXT, code-hygiene Mode D, and routing-chain-check R4. No repository source was changed.

| Check | Result and exact evidence |
|---|---|
| Actual library/CLI entry behavior | PASS. `scripts/page-context.mjs:253–257` limits recovery to failure resolving the launcher's entry path, then compares a real path before invoking `main`. Imports through stdin, eval, a file, and a nonexistent virtual launcher all return the expected `EXPORTED` result without running the CLI. Direct CLI still exits 1 with JSON `CLI_USAGE`. Public probes are `scripts/test-design-flow-handoff.mjs:42–63`. |
| Real entry-guard mutation | PASS. `scripts/test-design-flow-handoff.mjs:231–243` alters the actual copied page-context guard back to the original throwing `realpath(process.argv[1])` expression. The same public suite exits 1 at the stdin assertion with ENOENT, then returns to exit 0 when restored. This exercises the dependency imported by design-flow-handoff, not a simulated checker. |
| Other public guard mutations | PASS. Four additional actual-code mutations catch missing caller confirmation, a rejected page attachment, mismatched target authorization, and missing readback bytes. Exact failing assertions and restored passes are required at `scripts/test-design-flow-handoff.mjs:208–229`. |
| Active rule migration | PASS. At `.claude/observability/rules.yaml:24` the old R-20260525-001 remains with its original rule/evidence and only status/superseded_by changed. The replacement at line 114 preserves the no-unapproved-reference and framework-readonly constraints. All 11 prior rule IDs remain; the other 10 rule objects are unchanged. The observation log preserves its full prior 8,465-byte prefix and appends exactly one record. |
| Memory data, IDs, and history | PASS. Exactly SC-20260609-003, SC-20260610-001, and SF-001 leave the active store and are preserved in the archive at lines 22, 33, and 44. Their fields and raw record bodies match the before version; original numbers, sources, and evidence remain. The other 86 active records and both prior archived records are unchanged. New IDs SC-20260905-002/003/004 at `memory/semantic/promoted-facts.yaml:919`, `:931`, and `:943` carry the corresponding supersedes links. No ID reuse or unrelated fact rewrite was found. |
| Governed migration records | PASS. `memory/semantic/candidates.jsonl` preserves its 3,730-byte prior prefix and appends three candidates; `memory/semantic/reviews.jsonl` preserves its 42,753-byte prior prefix and appends nine review events. Each new candidate precedes its approved_stable and promoted events, and each predecessor has an archived_superseded event. Candidate/promoted content, scope, source, tags, evidence, and supersedes fields agree. This verifies the recorded governance chain, without treating another review's claimed verdict as this review's evidence. |
| Consumer regression quality | PASS on inspection. `scripts/test-design-context-retirement.py:23–44` covers all three retired IDs, calls the real rule loader/filter and actual semantic search, and requires retrieval of replacements. Lines 52–86 restore the old active rule or each original archived fact in temporary data and assert the expected failure before restoring. These tests check active-consumer behavior rather than banning historical words or rewriting source data. They call search directly, avoiding the CLI retrieval-log writer. |
| Package / verify / CI reachability | PASS on inspection. `package.json:43–44`, `scripts/verify.sh:108–109`, and `.github/workflows/ci.yml:106–109` run the new suites. CI provisions Node 20 and PyYAML at lines 54–64; the suites use builtins plus that installed Python dependency and temporary fixtures, with no OD/browser/network or shared project aliases required. |

Fresh runtime evidence executed by this reviewer:

- `npm run test:design-flow-handoff --silent`: exit **0**, Node **v22.23.1**, **7 behavior groups + 5 real mutation/restoration groups** passed.
- `/private/tmp/luca-codex-benchmark-npm/_npx/185e25162edaacfb/node_modules/node/node_modules/node-bin-darwin-arm64/bin/node scripts/test-design-flow-handoff.mjs --mutation`: exit **0**, Node **v20.20.2**, the same **7 + 5 groups** passed.
- `python3 /private/tmp/br-page-r5-standards-preservation.py`: exit **0** against the refreshed final scope; detailed hash and preservation results are saved in `/private/tmp/br-page-r5-final-standards-evidence.json`.

Limits: package.json declares Node `>=20.0.0`; tested binaries were 20.20.2 and 22.23.1. This report does not assert that every earlier 20.x binary was tested. Per assignment, the complete verify and memory suites were left to the parent, and the context-retirement suite was inspected rather than duplicated. No paid/live Claude or Codex run, real OD staging/readback, browser run, page-library reacceptance, downstream/shared-alias access, staging, commit, or push occurred. This PASS closes only the specified R5 Standards delta, not the inherited full branch or overall release readiness.

## Spec

# R5 final Spec closure

**Verdict: PASS — 10 PASS / 0 FAIL.** No surviving Spec finding in the final bounded R5 delta. Review stance was default REFUTE; this reviewer made no implementation changes, staging, commit, publication, network, paid Harness, or real OD calls.

This closes the Spec axis only. Real OD and final dual-Harness validation remain **UNKNOWN (2 mainline-deferred checks)**, as assigned; this report neither closes those checks nor authorizes publication.

## Fixed object and independence

- Checkout: `/Users/luca/Desktop/项目/muse/lucagstack`, framework/meta `NO_PIN`.
- Baseline: `/private/tmp/br-page-r5-before-jxfd26ba`.
- Final 12-file scope: `/private/tmp/br-page-r5-final-scope.json`, SHA-256 `e060a4c82a8d71e3665a7479c28db7bdd2e419c34c5ef90759c4863d31dba8f4`.
- Exact patch: `/private/tmp/br-page-r5-final.patch`, SHA-256 `c3f15c1ef1012cda261ad09909addc0a9df41669b35fbeb450585549e4be2a56`.
- Requirements came from the bounded assignment and its explicit SF-001 same-root extension. No earlier reviewer verdict, implementation discussion, or Standards report was read. The migration receipt was used only as audit evidence and cross-checked against final data. The SF-001 proposed text received independent content review before promotion; implementation remained with the parent.

## Assertions

| ID | Result | Requirement and evidence |
|---|---|---|
| S1 | PASS | All 12 final hashes and all 12 baseline hash/absence checks match the frozen manifest. No `framework/`, downstream project, alias, routing, or production design-tool file was added to this delta. |
| S2 | PASS | The documented `buildDesignHandoff` import (`open-design/SKILL.md:112`) executes through stdin ES module, eval, normal `.mjs` file, and a non-file launcher. `node scripts/test-design-flow-handoff.mjs --mutation` exited 0; exact stdout is `EXPORTED`, with no accidental CLI output. Source fix is `scripts/page-context.mjs:254`; probes are `scripts/test-design-flow-handoff.mjs:42`. |
| S3 | PASS | Direct CLI still executes its unchanged `main()` and returns exit 1 with JSON `CLI_USAGE` when invoked without arguments. Restoring the original entry-point expression in a temporary copy produces the expected stdin `ENOENT` failure; restoring the final expression returns PASS. |
| S4 | PASS | Actual `get_rules.py html-prototype '*'` returns R-20260905-001 and the unchanged content-conservation rule. R-20260525-001 is absent. The replacement forbids mandatory mother-template selection and silent reference adoption, reuses an existing choice, and retains current-project/external-design-system authority and read-only framework. Evidence: `.claude/observability/rules.yaml:114` and actual consumer stdout. |
| S5 | PASS | Final active SC-20260905-002 and SC-20260905-004 explicitly retire brand-tokens, old framework tokens, and the office brand section as mandatory authority; CRM also uses the actual current design system. Pure semantic queries `HTML UI 规范` and `brand-tokens` retrieve these replacements and none of SC-20260609-003 or SF-001. Evidence: `promoted-facts.yaml:921`, `:945`; the SF-001 residual discovered in this review was resolved and rechecked. |
| S6 | PASS | SC-20260905-003 explicitly ends figma-layer routing/preflight while retaining authorized independent HTML, MagicPath, figma-demo, and muse-proto-gen use. It preserves real user intent and exact tool/target permission, without deriving authorization from a keyword or an existing prototype. `figma-layer 路由` retrieves this replacement, not SC-20260610-001. Evidence: `promoted-facts.yaml:933`; handoff permission/readback behavior and associated mutations passed. |
| S7 | PASS | SC-20260905-002 preserves shared visual-rule DRY, per-skill `references/` / `templates/`, Markdown/HTML content skeletons, and the prohibition on a redundant specification skill. The replacement changes authority sourcing without deleting useful template or abstraction boundaries. Evidence: `promoted-facts.yaml:921`. |
| S8 | PASS | Exactly SC-20260609-003, SC-20260610-001, and SF-001 leave active facts; each original record's byte block remains intact in `archive/superseded-facts-2026.yaml`. All 86 other stable fact objects remain identical. Only R-20260525-001 changes status/supersession metadata; its original rule body remains identical, and 10 other rules remain unchanged. Independently checked against the fixed baseline. |
| S9 | PASS | Exactly 3 candidates, 9 review records, and 1 observation were appended; existing log bytes remain an exact prefix. Each replacement's candidate text matches its promoted fact, has approved_stable and promoted records, links the exact old ID, and has its archive review record. Receipt and records agree; no new migration mechanism is introduced. |
| S10 | PASS | The final `python3 scripts/test-design-context-retirement.py` run exits 0: 3/3 tests, including restoring each of the 3 retired facts and the old rule in temporary fixtures, observing the expected failure, then restoring PASS. Both focused suites are wired through `package.json:43`, `scripts/verify.sh:108`, and `.github/workflows/ci.yml:106`. Pure `search()` used an explicit checkout `MEMORY_ROOT`, semantic layer only, and left retrieval-log bytes unchanged. |

## Runtime evidence

`node scripts/test-design-flow-handoff.mjs --mutation`: exit 0, seven behavior groups and five mutation groups PASS. Mutations cover caller confirmation, no-reference attachment exclusion, exact target authorization, missing attachment readback, and the old stdin entry-point check. This file and its production dependency retained the same final hashes across the SF-001 extension, so this run remains bound to the final code.

`python3 scripts/test-design-context-retirement.py`: final rerun exit 0, 3 tests PASS, 1.897 seconds. `get_rules.py html-prototype '*'`: exit 0, only R-20260826-001 and R-20260905-001 apply.

Final pure semantic search returned:

- `HTML UI 规范`: SC-20260905-002, SC-20260905-001, SC-20260905-004, SC-20260722-005, SC-20260828-007.
- `figma-layer 路由`: SC-20260905-003, SC-20260820-002, SC-20260824-004, SC-20260720-001, SC-20260722-005.
- `brand-tokens`: SC-20260905-002, SC-20260905-004, SC-20260722-005.

SC-20260722-005 is a dated historical accessibility defect record, not an instruction to reactivate figma-layer or inherit retired tokens. Historical evidence remains available without restoring the superseded active rules.

Full repository verify, full memory suites, page-library retesting, real downstream checks, and real OD / dual-Harness runs were not duplicated. They remain with the main session as assigned. **Spec closure is complete for the frozen delta above.**

## Axis summary

Standards: PASS, 0 findings.
Spec: PASS, 10/10, 0 findings.

R5 修复闭合；主线延期实测不在此宣布完成。
