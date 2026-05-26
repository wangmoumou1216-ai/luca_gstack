# html-prototype Eval Schema

每个评估对是 `pairs.jsonl` 里的一行 JSON，字段如下：

```jsonc
{
  // === 标识 ===
  "id": "hp-001",              // 格式: hp-NNN，按序递增
  "collected_at": "2026-05-20", // 收集日期
  "scene": "A",                 // A/B/C

  // === 输入 ===
  "input": {
    "topic": "商机跟进建议面板",
    "design_brief_path": "docs/decisions/...-design-brief.md",
    "prd_path": "docs/prd/...-prd.md",           // 可选
    "ux_audit_path": "docs/evaluation/..."        // 场景C时必填
  },

  // === 产出 ===
  "output": {
    "prototype_path": "docs/prototype/.../index.html",
    "spec_path": "docs/prototype/.../prototype-spec.md",
    "qa_results_path": "docs/prototype/.../qa-results.json"
  },

  // === 自动 QA 结果（从 qa-results.json 提取）===
  "qa": {
    "verify_passed": true,
    "checks_passed": 11,
    "checks_total": 12,
    "primary_usage": 2,
    "states": ["default", "empty", "ai-thinking", "ai-suggestion"],
    "aesthetic_score": 26,
    "dynamic_ref_status": "COMPLETED"  // COMPLETED / SKIPPED_TOOL_UNAVAILABLE
  },

  // === LLM Judge 评分（人工触发或自动触发）===
  "judge": {
    "score": 0.87,
    "feedback": "n-scale token 使用正确，AI 状态覆盖完整，Dynamic Reference 借鉴 Linear 密度和 Attio 字段结构，转译合理。扣分原因：agent-running 态的进度条用了 bg-blue-500 而不是 bg-primary，违反品牌色规则。",
    "model": "claude-opus-4-7",
    "judged_at": "2026-05-20T14:32:00Z",
    "judge_prompt_version": "v1"
  }
}
```

## 收集流程

1. `/html-prototype` 执行完毕并通过 Phase 4.5 QA
2. 手动运行：
   ```bash
   python3 memory/evals/scripts/collect_eval.py \
     --skill html-prototype \
     --topic <topic-slug> \
     --scene A
   ```
   脚本自动从 `docs/prototype/` 和 `docs/decisions/` 读取产物，写入 `pairs.jsonl`。
3. 可选：触发 LLM judge（需要 Claude API key）：
   ```bash
   python3 memory/evals/scripts/judge_eval.py --id hp-001
   ```

## 质量门禁

收集的 eval 对只有满足以下条件才有效：
- `qa.verify_passed = true` 或 `qa.checks_passed / qa.checks_total ≥ 0.8`
- `qa.aesthetic_score ≥ 20`（允许收录失败案例，下限 20）
- `output.prototype_path` 文件实际存在
