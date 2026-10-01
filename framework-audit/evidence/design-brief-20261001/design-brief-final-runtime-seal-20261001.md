Quality Gate: final-runtime-seal  
**FAIL（4/5）**

- PASS：`node scripts/test-original-real-templates.mjs`，exit 0；真实 refine+KEEP 正例通过，binding/execution 均为 false。
- PASS：`node scripts/test-design-flow-handoff.mjs`，exit 0；静态 CSS 负例、文本保留及原型附件完整读回通过。
- PASS：现有 full-verify-r3.log 实际为 107 PASS / 0 FAIL / 0 WARN / 1 DELEGATED。
- PASS：11 个指定源/测试文件两次读取 hash 稳定；HEAD `cf7872ecbc4e5f85c64afede9843e2eabc3a98c0`。
- **FAIL：整组原件位置兼容性。** `node --input-type=module` 内存反例：ai-quick-notes 的 `source-shell` refine + 内部“搜索范围”input preserve，草稿返回 `ADAPTATION_READY`；相同动作整组定位返回 `ORIGINAL_ACTION_OVERLAP`。原因是 [page-context.mjs](/Users/luca/.codex/worktrees/9343/luca_gstack/scripts/page-context.mjs:561) 逐项定位，没有检查跨判断重叠。执行门仍阻断，但草稿错误宣称 ready。

关键 SHA-256：

```text
page-context.mjs
22028558beabf095250ae5bf5edf98a4249ee8a706ed7dfc6973b207e684dc2e
original-template-edits.mjs
7ed0d711a709a31cdd37cae992c4fbc938042319b26d103cd7fb4df18b9a1ac4
design-flow-handoff.mjs
d5750500cc2dd2f486077dd8c05b004b2a239b6bfef3460d5ccfd241ec8c5aa4
```

建议：去重相同位置/动作后联合验证 ranges；保留草稿定位专用 `allowPreserveOnly:true`，禁止传入最终编辑验收。修复后独立复验。live OD、像素/行为及真实双 harness 执行属于本轮范围限度。本判官未修改被审对象或记录 eval-log。

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"design-brief-final-runtime-seal-20261001","subject":{"skill":"final-runtime-seal","topic":"design-brief executable runtime contract","scene":"unknown","input_summary":"NO_PIN最终只读封存：当前原件适配、静态refine、原型附件运输与指定源sha；不验证live OD或真实双harness执行。","output_paths":[".claude/skill-os/runtime/page-context.md",".claude/skill-os/page-library/schema.json","scripts/page-context.mjs","scripts/design-flow-handoff.mjs","scripts/original-template-edits.mjs","scripts/original-copy-handoff.mjs","scripts/test-page-context.mjs","scripts/test-design-flow-handoff.mjs","scripts/test-original-template-edits.mjs","scripts/test-original-copy-handoff.mjs","scripts/test-original-real-templates.mjs"],"duration":"medium"},"verdict":{"status":"FAIL","passed":4,"total":5,"findings":["Actual ai-quick-notes source-shell refine plus nested search-range input preserve returns ADAPTATION_READY, while combined original adapter range validation rejects ORIGINAL_ACTION_OVERLAP; draft lacks cross-judgment range compatibility validation."]}}
