# BR-PAGE 整体分支复核 — 2026-09-05

结论：尚未全部解决。本报告更正上一轮“本分支待办清零”的收口表述；本轮确认仍有 1 项 Important 需求遗漏、1 项 Minor 工程缺陷，均未修复。两轴独立，严重程度不跨轴合并或重排。

固定对象：B5 validation 的 checkout_review_manifest 全部 128 项，对照 HEAD `94f086233affb3bd08ad8fe33063bcfedb330edf`；包含共享工作区继承的主线改动，不能将全部文件归为本分支所有。本轮对分支风险和活动消费链深入复核，不宣称每项继承的主线改动已获得等深度行为认证。

本轮 fresh full verify：PASS=91 / FAIL=0 / WARN=0，exit 0。日志：`/private/tmp/br-page-overall-review-verify.log`。独立轴另运行交接、页面上下文守卫 mutation 与 MagicPath 同步测试，结果见各轴。部分新增测试尚未接入全量 verify/CI，因此 91 PASS 不代表这些路径已自动覆盖。

只读完整性：128 项版本无漂移；retrieval-log SHA256 仍为 `bbfdea3971688338f05ef9a334de79e55f0f596732d56d4c57b8c5a27f6d9605`；index 无暂存。只新增审查报告，未修复运行时、提交或推送。

活动上下文实际查询证据：`/private/tmp/br-page-overall-active-context-probes.json`。查询通过纯 semantic search helper 执行，不写检索日志。

## Standards

# Standards axis — BR-PAGE-HANDOFF

Verdict: DONE_WITH_CONCERNS. Critical: 0; Important: 0; Minor: 1. This is the independent Standards partition, not a Spec verdict or a whole-manifest behavioural PASS.

## Frozen scope and authority

- FILE_SET: the 128 keys of `framework-audit/2026-09-05-page-library-b5-validation.json.checkout_review_manifest`. Only that keys/version map was extracted; no prior judgment fields or reviewer reports were read.
- Baseline: `94f086233affb3bd08ad8fe33063bcfedb330edf` (HEAD). Manifest versions were recalculated twice, including at review close: 128 entries, zero drift.
- Applied current AGENTS/CONTEXT, code-review, code-hygiene Mode D, routing-chain-check R4, project-session, cross-harness, framework-maintenance, and office contracts. Active observability rules for code-review/code-hygiene: none.
- Cold/default-REFUTE; no fixes, staging, commits, real OD/network, paid Harness probes, or project/shared-alias reads. Runtime fixtures were synthetic temporary files. The waived SVG/HTML source-containment case was not tested.
- Deep runtime partition: page catalog/selection, handoff export/authorization/readback, preview boundary code, exact/project quality-gate scopes, and MagicPath projection sync. Parent owned full verify, protected artifact integrity, and governed-memory consistency. Architectural/root-mainline completeness outside this partition is not independently certified by this report.

## Minor — exported helper crashes when imported from a standard stdin ES-module launcher

**Location:** `scripts/page-context.mjs:253`; reachable through the mandatory helper import at `.claude/skills/office/open-design/SKILL.md:112` and `scripts/design-flow-handoff.mjs:4`.

The module tries to resolve `process.argv[1]` before deciding whether it is the executable entry point. A valid `node --input-type=module -` invocation sets that value to `-`, which is not a filesystem filename. The uncaught top-level `realpath('-')` rejection aborts the import before any exported API can run. This also aborts no-reference exports, which otherwise need no catalog/source reads. An agent using the documented import contract in a Bash heredoc encounters an unrelated ENOENT instead of an export result.

**Reproduction (from the repository root):**

```sh
node --input-type=module - <<'JS'
import { buildDesignHandoff } from './scripts/design-flow-handoff.mjs';
const b = await buildDesignHandoff({
  source: { mode: 'adhoc', id: 'test', body: '# aligned' },
  target: { tool: 'od', projectId: 'test' },
  selection: { schema_version: 1, status: 'no-match', reference: 'none' },
});
console.log(b.status);
JS
```

Observed on both Node 22.23.1 and installed Node 20.20.1: exit 1, no export, `Error: ENOENT: no such file or directory, realpath '-'`. The identical source passed through `node --input-type=module -e '<source>'` exits 0 and prints `EXPORTED` on both versions. A normal `.mjs` caller also works, as demonstrated by the public tests.

**Rule / impact:** engineering correctness and compatibility of the documented reusable helper interface; the CLI-only check must not make library import depend on an unrelated launcher path existing. Minor because normal file and `-e` callers work and no unauthorized effect occurs. Make entry-point detection tolerate non-file launchers and add an import smoke case.

**Attribution:** branch-produced helper file; `scripts/page-context.mjs` is absent at the fixed HEAD baseline. The defect is independent of the inherited root-adapter work.

## Fresh runtime evidence

- `node scripts/test-design-flow-handoff.mjs --mutation`: exit 0. Original body/BOM/CRLF preservation, declined/no-match exclusion, confirmed page/region/box, caller witness, exact project/write grant, safe PNG and actual byte readback all passed. Four actual guard mutations failed at their named public assertions; restored copies passed.
- `node scripts/test-page-context.mjs --mutation`: exit 0. Catalog/source/schema/anchor checks, stale selection/screenshot, coordinate conversion, scoped paths and synthetic containment cases passed. Three actual guard mutations reached the named public assertions; restored copies passed.
- `node scripts/test-magicpath-projection-sync.mjs`: exit 0. Read-only checks, exact digest update, scope/symlink refusal, concurrent-edit/version refusal, CRLF/comments/permissions, CLI and no-op behaviour passed. Duplicate-key parser diagnostics were expected rejection cases followed by PASS.
- Independent launcher matrix above: `-e` PASS / stdin `-` FAIL on two installed Node versions.

These are local runtime and mutation results. They do not prove live OD access, actual human approval, Claude/Codex model behaviour, or external design-system compliance.

## Scope / evidence notes, not additional findings

1. `scripts/check-quality-gates.mjs:70` returns an unchecked absolute path when `--project-session` is absent. A synthetic `alias-handoff.md` symlink pointing from a temporary framework directory to a synthetic foreign directory was followed and returned `PASS handoff artifact contract`. With a project session, `withinProject` rejects symlink traversal. The baseline exact `--handoff` implementation likewise followed caller paths, so this is inherited permissiveness in a generic artifact validator, not a newly introduced unrestricted read. Current office/preflight/quality-gate callers require scope verification first, forbid NO_PIN project handoffs, and deliberately permit exact framework/temporary artifacts. I did not establish an authorized current caller that violates those prerequisites; therefore this probe is **not promoted to a security finding**. It does mean an exact-handoff PASS is not independent evidence that Project Gate/NO_PIN was checked. Do not describe the checker as enforcing arbitrary-path project isolation.
2. The new page-context, preview, design-flow-handoff, design-tool-routing, MagicPath-sync and prototype-rule suites are not registered in `package.json`, `scripts/verify.sh`, or CI; the retirement suite is registered. Reference search found no execution path from the wired checks into the page/handoff implementations. This is a regression-coverage limitation, not a claim that the parent's 91 checks failed or claimed individual coverage. The local suites above were run separately. No explicit current Standards rule requiring every new suite in CI was established, so this is recorded without an invented mandatory-CI finding.
3. Preview source/PNG bytes and synthetic caller witnesses are not proof of real user adoption or external placement. The revised code and skill correctly retain those caller-owned responsibilities and distinguish EXPORTED / STAGED / recovered results. No live external or real paid Harness verification was performed in this partition.

No self-repair was applied. The identified Minor remains open.

## Spec

# Independent SPEC review — BR-PAGE-HANDOFF

Verdict: REFUTE / DONE_WITH_CONCERNS. Confirmed: 1 Important, 0 Critical, 0 Minor. No fixes applied.

## S-01 — Important: active context migration is incomplete

Requirement: retire figma-layer and old local visual/token authority across active consumers, including memory migration; retain standalone HTML with actual project/external design-system constraints and preserve general DRY/history.

Evidence locations:
- `.claude/observability/rules.yaml:23`–30: R-20260525-001 remains active for html-prototype in every scene. Line 30 requires explicit mother-template selection.
- `memory/semantic/promoted-facts.yaml:280`: stable, high-confidence SC-20260609-003 still prescribes `brand-tokens.md + framework/tokens.css + office/SKILL.md 品牌与技术约束节` as central visual authority; the branch deletes the first and retires that office authority.
- `memory/semantic/promoted-facts.yaml:291`: stable, high-confidence SC-20260610-001 still treats figma-layer as a valid HTML-to-Figma route and requires its preflight, despite physical skill/command/alias/registration retirement.
- Active consumer: `.claude/skills/office/SKILL.md:139`–142 loads rules, `:161` makes this mandatory, `:186` requires obeying active rules. Lines 151–163 optionally search relevant stable memory and recommend reuse.

Executed counterexample:
`python3 .claude/observability/scripts/get_rules.py html-prototype '*'` returned:
`R-20260525-001 [medium]: html-prototype: 母版选择必须作为显式询问项；未获确认前不得把 framework/list-page.html 写成强制约束。`

Pure semantic search was executed by importing search_memory.search, with MEMORY_ROOT explicitly bound to this checkout and PYTHONDONTWRITEBYTECODE=1; no CLI/log-writing path:
- search('HTML UI 规范', 5, 'semantic', '*', '') returned new SC-20260905-001 first (score 48), obsolete SC-20260609-003 second (score 44).
- search('figma-layer 路由', 5, 'semantic', '*', '') returned obsolete SC-20260610-001 first (score 54).

Impact: a fresh standalone HTML task receives the old mandatory template-selection instruction; a relevant memory search injects deleted brand dependencies and an unavailable routing option as stable authority. The route guard may reject figma-layer, but the startup context remains contradictory and can trigger extra questions, stale dependencies and misrouting. The observed failure is stale active-context injection; no external generation failure is claimed.

Attribution: the stale text is inherited from HEAD, but this is a branch migration omission: the branch retires those authorities and updates promoted facts/static fallback while leaving these consumers active. rules.yaml is an adjacent framework-owned consumer input outside the changed-file set. Historical references alone are not findings.

Resolution required: retire or supersede obsolete active clauses through the governed rule/memory process; preserve the ban on silently imposing a template, generic DRY guidance, per-skill content-template guidance and archival evidence. Verify ordinary rule lookup and relevant semantic search no longer restore retired dependencies/routes.

## Scope and validation

Baseline: 94f086233affb3bd08ad8fe33063bcfedb330edf. Fixed scope: all 128 keys/versions in checkout_review_manifest of framework-audit/2026-09-05-page-library-b5-validation.json; only that map was extracted, not prior conclusion fields. Versions matched at inspection; five deleted files were read from HEAD. This was risk-focused review of scoped diffs, primary branch implementations and adjacent active consumers, not equal-depth line review of every unrelated inherited benchmark change.

Requirements read only from design-flow branch-plan sections 1–5, S9/P01–P19 matrix and approved R2–R4 scope updates. Applied code-review SPEC axis, code-hygiene Mode D and routing-chain-check R4. No prior verdict used as evidence. Framework/meta NO_PIN; no project aliases/downstream, external OD/network, paid Harness, staging, publication or runtime changes.

Fresh `node scripts/test-design-flow-handoff.mjs --mutation` passed: exact original chain/adhoc/UX source transport; no-reference/pending handling; independent confirmation evidence; screenshot/region/box/version checks; explicit tool/project/write boundaries; Claude Design/recover; complete byte-level readback; four mutation guards. These are local synthetic tests, not actual OD reception evidence.

Reviewed primary paths preserve stable IDs, eight-field decisions, twelve-state coverage, AI control, research/engineering handoffs, UX A/B/C with UNKNOWN, separate adopted-reference/write permission, and explicit selection of retained HTML/MagicPath/figma-demo/muse-proto-gen. No additional confirmed SPEC omission was established there.

## Excluded / deferred

- Actual OD reception and final independent dual-Harness: UNKNOWN, explicitly deferred to mainline by approved R2, not branch blockers.
- Remaining page-library acceptance and known new-SVG/HTML containment: waived; not reopened.
- Node crc32 compatibility with the declared >=20.0.0 range: unverified and excluded. No assertion that floating Node 20 CI currently fails.
- Late target binding: local probe found unbound export cannot stage; changing only target fails metadata consistency; rebuilding with a bound target succeeds. Procedural clarification candidate only, excluded from count because authorization still blocks premature writes and callers can finalize after confirmation.
- UX state candidate: adjacent orchestration updates node state; no confirmed gap, excluded.
- Parent reported full verify 91 PASS / 0 FAIL / 0 WARN; not represented as independently rerun here.

Probes were inline or existing tests. This report is the only artifact saved by this reviewer.

## Axis summary

- Standards: 1 Minor（stdin ES module 导入崩溃），0 Important / 0 Critical；DONE_WITH_CONCERNS。
- Spec: 1 Important（仍活跃的旧规则和记忆未迁移），0 Minor / 0 Critical；REFUTE / DONE_WITH_CONCERNS。

主线仍承担真实 OD 材料接收/读回、最终双 Harness 行为矩阵及发布前验收；这些是已有延期 UNKNOWN，不冒充本次新增缺陷。用户已豁免的页面库剩余验收不重新打开。

关闭上述两项需要针对性修复和独立终版复核。本轮为只读审查，未推进 workflow 或改写既有历史记录。
