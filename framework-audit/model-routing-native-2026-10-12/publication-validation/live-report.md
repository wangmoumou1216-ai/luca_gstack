## Quality Gate: Phase U003-bounded-live-smoke

Status: **PASS（6/6）**，仅限此次 bounded smoke。

- **C1 PASS**：重新计算 `review-input.json`、diff、32 个源文件及 completion 中 13 项产物 hash，全部匹配。
- **C2 PASS**：`terminal-network-auth.stdout.json` 原始结果为 `success`、`CLAUDE_ROUTING_AUTH_OK`，实际模型 `claude-sonnet-5-5`；argv 未覆盖模型。
- **C3 PASS**：`native-dispatch.stdout.json:4,16` 恰有两次省略 model 的 Agent 调用；第 13 行完成后才第二次调用，第 23 行第二次完成。第 3 行根模型 Sonnet；第 27 行 completed=2、failed=0、permission_denials=[]。
- **C4 PASS**：两个保留子 transcript 的 hash 匹配；各第 10 行实际模型分别 Sonnet / Opus，与 `native-agents.json`、调用类型及原生 `resolvedModel` 一致。
- **C5 PASS**：两份 prompt hash 匹配，candidate 内嵌政策与当前源相同。baseline/candidate 各保留 CODE、DESIGN、FRAMEWORK 三例及 root/effort=false；candidate 保留独立审查、显式 sonnet、失败后停止依赖。
- **C6 PASS**：completion/summary 明确排除 ROI、完整 U003/U004/U005 和全局激活；配置通过 CLI `--agents` 传入，观测调用没有配置写入。子任务完成后的证据仍可读且 hash 匹配。

可接受此限定证据。此票不证明全局配置整体未变，也不覆盖真实失败/回滚、ROI 或完整迁移验收。

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"routing-live-smoke-20261012-01","subject":{"skill":"U003-bounded-live-smoke","topic":"Claude native routing bounded live smoke","scene":"unknown","input_summary":"Independent read-only verification of six bounded criteria: source hashes, authentication, serial native calls, actual child models, synthetic policy cases, and honest claim limits.","output_paths":["/Users/luca/.codex/worktrees/c252/luca_gstack/framework-audit/model-routing-native-2026-10-12/publication-validation/live-completion.json"],"duration":"lightweight"},"verdict":{"status":"PASS","passed":6,"total":6,"findings":[]}}