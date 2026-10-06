**方法 PASS（5/5）**。实际出现同宿主旧错新对、必要保护不退时，可支持“有限规则决策缺陷修复”；不能支持整体调度能力提升。

- **C1 PASS**：明确测合成事实上的真实模型决策，不冒称实际多 Agent 执行、恢复或效率。
- **C2 PASS**：同宿主同案例、完整适用规则、权限与模型相同，旧新顺序反转；两版都正确不算改进。
- **C3 PASS**：oracle 与模型输入分离，输出字段可判。判定应按语义与动作一致性，不能只匹配措辞。
- **C4 PASS**：覆盖缺失人类选择、重复启动、重试耗尽、缺失依赖、拒绝与撤销；批准继承不授权新增外部发布。
- **C5 PASS**：仅采用实际证明的切片；required-source 闭包及其他未证能力继续留候选。

运行前必须落实三点：生成**不含 `predeclared_oracle` 的独立 actor 输入**；四次使用独立新会话，防止历史答案及当前 checkout 自动加载污染旧版；冻结完整规则、实际输入和命令，保存原始输出。四次单样本只能证明这些具体案例，不能宣称稳定成功率。无需重建原 benchmark。

复用非作者上下文；未执行模型或修改文件。

EVAL_ENVELOPE_JSON
{"schema_version":1,"producer":"quality-gate","eval_run_id":"tri-system-u014-focused-decision-method","subject":{"skill":"U014-focused-decision-method","topic":"J31 bounded instruction-decision regression method","scene":"unknown","input_summary":"Read-only assessment of seven synthetic operational cases, output contract, predeclared oracle, four-run old/new cross-harness design and adoption limits. Reused non-author context; no model execution.","output_paths":["/Users/luca/Desktop/luca_gstack/framework-audit/u014-fix-behavior-cases-draft.json"],"duration":"lightweight"},"verdict":{"status":"PASS","passed":5,"total":5,"findings":["Method supports only concrete instruction-consumption and next-decision fixes when actual same-harness old failures become new passes without required-control regression. No patch is preapproved.","Before execution, derive and freeze a separate actor input excluding predeclared_oracle; do not pass the complete draft JSON to the model.","Use independent fresh sessions and isolated version-bound authority inputs; prevent current-checkout automatic rules and previous outputs from contaminating the old condition. Freeze actual commands and input snapshots.","Judge semantic decisions and their consistency, not exact prose matches. Preserve both-correct, both-wrong and divergent results rather than forcing improvement.","Four single-sample runs establish at most these observed cases, not reliability rates, actual multiagent execution, recovery, delivery, efficiency or whole-system superiority. Unproved slices remain candidates."]}}
