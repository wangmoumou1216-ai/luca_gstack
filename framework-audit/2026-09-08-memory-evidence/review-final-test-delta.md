# 独立测试增量闭合

Reviewer: memory_audit（独立只读）。2026-09-08。结论 PASS。

- scripts/test-hooks.mjs SHA256 d8f34b4e66e653077338489a249339f2af2d78a7f6cb366f4eb081669569b8b9：两行旧期待修正，NO_PIN 同时排除 EP-1/EP-3，保留原 project 正例/无效范围零命中；没有删测试或关闭保护。无 project 的 EP-2 只表示历史兼容，不认定为已确认全局事实。
- memory/tests/test_pending_disposition_recovery.py SHA256 895c46ff3c723c0f40873fa119a087da924a452b1accbf42b843c6f11c3ef50a：manifest 软链外部目标改为合法 JSONL，排除解析错误的混淆；active/外部原字节保持断言均在。主 Agent 真实临时文件回归 8 项 PASS；将 opener 临时替换为普通 open 后，软链测试按预期失败（实际 exit 0 vs 要求 2），恢复代码未变。

Reviewer 核验了两个最终 hash 和增量，没有读另一轴报告、没有写真实 pending。复审冻结 v2 后生产代码未再改变；上述仅测试增量。
