# Eval Data

当前评估数据面只保留有消费者的记录：

- `eval-log.jsonl`：quality-gate 结果，由 `record_eval.py` 受控写入，供检索和每日治理摘要消费。
- `routing/fixtures.jsonl`：路由回归样例，由 `eval_routing.py` 使用。
- 各 skill 的既有专项 fixture：仅按对应测试或评估入口读取。

旧 GEPA input→output pairs collector 于 2026-09-20 退役：冻结期间没有产生记录，空数据文件、
专属 schema 和 collector 一并移除。需要重启模型优化实验时，必须基于新的真实需求和明确消费者
重新设计，不能恢复成每次 session 的常规副作用。历史定义仍可从 Git 追溯。
