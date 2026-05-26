# Pending Skill-Rule Extraction

> 自动生成于 2026-05-26T11:29:51.081Z。下次 session 启动时由 session-restore 提醒处理。
> 处理后请删除此文件，或执行提取命令后手动删除。

**Topic:** mobile-list
**Skills run:** 未读取 run-log；如需复盘，请通过 observability 短规则或 memory search 定向检索。

## 提取模板

满足任一条件时填写并执行：
- 发现 non-obvious blocker（不在 CLAUDE.md 中的约束）
- 某类错误在本次或跨 session 重复出现
- 执行时发现文件、路径、格式等隐性规则

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

## 完成后

```bash
rm .claude/observability/pending-extraction.md
```
