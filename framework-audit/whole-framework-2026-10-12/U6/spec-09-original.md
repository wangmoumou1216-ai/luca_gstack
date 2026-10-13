Spec: **PASS (7/7), findings 0, worst: none**。仅覆盖 source09 的 F1–F7 实现核验；最终 HEAD/tree/diff 未变、工作树干净（`0fb942`）。

| 项 | 原始要求 | 判定及证据 |
|---|---|---|
| F1 | PLAN:17 “block the current tool invocation” | PASS。异常拒绝、正常恢复；删除拒绝分支的 fixture mutation 被捕获，原候选复跑通过（`74704e`,`5b6836`）；Claude 六状态原生证据已读回。 |
| F2 | PLAN:18 “legacy spaced form still passes” | PASS。官方全角格式与旧格式通过；FAIL/UNKNOWN、重复判决、证据诱饵拒绝（`7f5ecb`）。 |
| F3 | PLAN:20 “all ready independent questions in one round” | PASS。grilling 正文和生成视图一致，保留真实回答与确认门（`b4c7b0`）；这是合同核验，未外推所有真人会话行为。 |
| F4 | PLAN:20 “verified exact input scope replaces shared/latest aliases” | PASS。正文、handoff owner及动态 preamble/scope 正反例吻合；scope guard 159/0（`7f5ecb`,`a711f4`）。 |
| F5 | PLAN:19 “including duplicate fused IDs” | PASS。真实字节哈希、原行号、重复ID逐实例分母，producer/consumer双端核验；冻结及伪造拒绝测试通过（`dec093`,`232598`）。 |
| F6 | PLAN:19 “PREPARED→COMMITTED durable journal” | PASS。107/107，包括14故障点、40轮并发、幂等、冲突与第三状态拒绝及mutation（`580b34`）。 |
| F7 | PLAN:20 “actual host capabilities separated from hook protocol” | PASS。harness 21/0；原生 new/resumed、11注册、真实child完成/等待证据核验（`232598`,`02d9ef`,`5ebf51`）。 |

原 U5 七ID未缩减，留给独立完整质量门。原49+新增2不代表51条外部产品全链已执行；原生loopback与provider连通性不证明模型质量、普遍宿主等价或ROI。U6发布、红队、双向钢人仍是后续动作。本票未读取Standards判断、未写被审对象或eval。

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"U6-spec-20261013-source09","subject":{"skill":"U6-Spec","topic":"Claude/Codex framework integration source09 — code Spec axis F1–F7","scene":"unknown","input_summary":"NO_PIN。依据原PLAN及U5/assertions，核验冻结source09 diff内F1–F7实现和有界运行证据。原U5七ID保持完整，未作U5最终验收；原生fixture、provider连接、外部产品执行与后续U6动作分别保留边界。","output_paths":["/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-integration-final-09-v5j0q0pz/checkout"],"duration":"heavy"},"verdict":{"status":"PASS","passed":7,"total":7,"findings":[]}}
