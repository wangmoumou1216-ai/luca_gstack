# Eval Data — Skill 评估数据集

> GEPA 进化管线的输入数据层。每个 skill 一个子目录，存放 input→output 评估对。

## 目录结构

```
memory/evals/
  README.md           ← 本文件
  html-prototype/
    eval-schema.md    ← 字段定义和格式规范
    pairs.jsonl       ← 评估对（每行一个 JSON）
    judge-results/    ← LLM judge 的评分结果
  brainstorm/         ← 待建（需 PRD 质量评估标准）
  deepresearch/       ← 待建（需研究报告质量标准）
```

## Eval 对收集原则

1. **只收集真实 session** — 不要编造输入或输出。宁可只有 5 对，不要有 20 对假数据。
2. **覆盖失败案例** — 至少 30% 的 eval 对应该是"有问题的产出"，配上
   feedback 说明问题在哪。
3. **Feedback 必须具体** — 不是"不好"，而是"X 区域用了 text-gray-600 而不是
   text-n11，导致颜色不一致"。
4. **每批 session 后追加** — 不要等到收够 20 对再开始。3 对就可以启动。

## GEPA metric 格式

GEPA 的 metric 函数期望每个 eval 对返回：

```python
dspy.Prediction(
    score=0.87,   # 0.0 - 1.0，对应 verify-prototype 通过率 + 审美得分组合
    feedback="n-scale 使用正确。AI 状态覆盖完整。Dynamic Reference 选了 Linear 和 Attio 但没有说明为何选这两个而不是 Granola。"
)
```

score 计算建议：
- 50% 权重：verify-prototype.mjs 通过率（passed checks / total checks）
- 30% 权重：Current Aesthetic Score（N/30 归一化）
- 20% 权重：LLM judge 的整体质量评分
