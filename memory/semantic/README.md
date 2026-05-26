# 语义记忆层（Semantic Memory）

存储稳定的领域知识：纷享销客 CRM 产品特性、FxUI 组件规范、设计约束。

## 管道（Hermes-lite）

```
观察到新领域事实
  → propose_semantic.py → candidates.jsonl（候选，不入库）
  → 手动/Agent 评审准确性和稳定性 → reviews.jsonl（不入库）
  → confidence: high + stable: true → 晋升到 promoted-facts.yaml（入库）
```

与 Hermes 的区别：评审标准是**准确性和稳定性**，而非行为风险。

## promoted-facts.yaml 格式

```yaml
version: 1
facts:
  - id: SF-001
    domain: crm
    fact: "纷享销客主色调 #FF6B35（橙色）"
    confidence: high
    stable: true
    added: 2026-05-16
    source: brand-tokens.md
```

## 使用

```bash
# 加载 CRM 领域稳定事实
python3 memory/scripts/get_memory.py --layer semantic --domain crm

# 提议新候选事实
python3 memory/scripts/propose_semantic.py \
  --domain crm \
  --fact "纷享销客移动端使用 ReactNative 框架" \
  --confidence medium \
  --source "用户访谈 2026-05"
```
