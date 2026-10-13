## Quality Gate: Phase U6-REFUTE
Status: CONDITIONAL_PASS（10/12）

冻结对象：`ad522b30` / tree `6bf966d7`。本次有界反证无存活、已证实的 BLOCKER/MAJOR；不代表 U5 总验或发布放行。

| Criterion | Result | Evidence |
|---|---|---|
| R1 快照伪造／空分母／重复行 | PASS | `test-evolution-bookkeep.mjs` 107/107；freeze guard 7/7 |
| R2 生产者／消费者身份 | PASS | scout 96/96；遗漏变异使 INCOMPLETE→COMPLETE，原 oracle 检出 |
| R3 混合／null args | PASS | 自有 5 组反例均在零 agent 调用时拒绝；runner 3 组拒绝 |
| R4 并发／第三态／崩溃恢复 | PASS | 107 项实跑含 20×4 并发、故障恢复、第三态变异 |
| R5 fail-closed 与恢复 | PASS | malformed/stdin/dependency/runtime 实跑；Claude 六态原生原始结果 |
| R6 Codex 原生故障全排列 | UNKNOWN | native-codex-07 仅证明新建／恢复及正常工具链，未涵盖全部故障排列 |
| R7 能力缺失降级 | PASS | harness 21/21；SessionStart 明示 Workflow 缺失/未验证则 BLOCKED |
| R8 干净 checkout／依赖身份 | PASS | 680 项哈希一致；针对性测试成功；Git 状态干净 |
| R9 原输入／状态分母 | PASS | prototype 74 静态断言及浏览器拒绝/恢复；20 个 preamble 保留来源边界 |
| R10 清理／跨版本借票 | PASS | 8 回执、324 留存引用可读且哈希匹配；相关源码匹配当前候选 |
| R11 价值／ROI 过称 | PASS | VALUE 明示无配对成本基线；reported usefulness ≠ 净 ROI |
| R12 真实原生 Workflow | UNKNOWN | 未提供实际成功证据；provider 仅连接，loopback 仅隔离运行时 |

若把 R6/R12 扩大为已验证能力，凭什么成立？影响是将缺证据误报为全框架通过。51 个 body 审查也不能代表 51 个外部产品实际执行。U5 最终票、钢人及 Git 发布仍属后续工作。

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"U6-refute-20261013-source09","subject":{"skill":"U6-REFUTE","topic":"whole-framework-2026-10-12-source09","scene":"unknown","input_summary":"NO_PIN 独立冷 REFUTE；审查冻结 base...ad522b30 diff、指定计划/断言/价值材料及 native/provider 证据。真实执行局部运行时、反例与变异；不代替 U5 最终验收或后续发布门。","output_paths":["/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-integration-final-09-v5j0q0pz/checkout","/Users/luca/.codex/worktrees/6a95/luca_gstack/framework-audit/whole-framework-2026-10-12/U6/candidate-09.json"],"duration":"heavy"},"verdict":{"status":"CONDITIONAL_PASS","passed":10,"total":12,"findings":["WARN R6 UNKNOWN: supplied Codex native receipts demonstrate new/resumed happy lifecycle and eleven registrations, not every malformed-input/loading/timeout native failure permutation; broader fail-closed claims remain unverified.","WARN R12 UNKNOWN: real native Workflow execution remains unverified and must block dependent use when unavailable; provider connectivity and loopback runtime evidence cannot substitute.","No surviving evidenced BLOCKER or MAJOR found within this bounded refutation. This verdict does not close U5 final acceptance, steelmanning, Git publication, all external workflows or measured net ROI."]}}
