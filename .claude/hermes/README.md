# Hermes — 已废弃（2026-05-20）

**状态：DEPRECATED**

Hermes 的 Observe → Evaluate → Commit 管道从未被触发过：
- `candidates.jsonl`、`reviews.jsonl`、`promoted-rules.yaml` 在整个生命周期内均为空
- 三个脚本（propose_growth / review_growth / get_growth_rules）从未被任何 hook 或 skill 调用
- 启动成本陷阱：候选生成机制没有自动化路径，反馈循环无法启动

**替代方案：** Skill 执行规则写入 `memory/semantic/candidates.jsonl`，domain 固定为
`skill-rule`；通过 review 后再晋升到 `promoted-facts.yaml`。

```bash
python3 memory/scripts/propose_semantic.py \
  --domain skill-rule \
  --fact "<skill名>: <规则描述>" \
  --confidence high \
  --evidence "<来源/复现>" \
  --scope "<skill名>" \
  --reviewer "<reviewer>" \
  --tags "<skill名>,rule"
```

查询：`python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule`
