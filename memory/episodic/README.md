# 情景记忆层（Episodic Memory）

记录每次 session 的关键事件：做了什么、产出了什么、遇到了什么阻碍。

## 管道

```
session 结束
  → append_episode.py 写入 sessions/[date]-[topic].md（原始，不入库）
  → index.jsonl 追加摘要条目（结构化，入库）
  → 当 index.jsonl 超过 50 条时，由 agent 触发压缩归档
```

## index.jsonl 格式

每行一条 JSON 记录：

```json
{
  "id": "EP-20260516-001",
  "date": "2026-05-16",
  "topic": "标准开发规范升级",
  "skills_used": ["infrastructure", "ci-cd", "hooks"],
  "outcomes": ["git init", "pre-commit hooks", "ci.yml", "verify.sh"],
  "blockers": ["subagent permission denied for settings.json"],
  "file": "sessions/2026-05-16-standard-dev-upgrade.md"
}
```

## 使用

```bash
# 加载最近 3 次 session
python3 memory/scripts/get_memory.py --layer episodic --limit 3

# 写入当前 session 记录
python3 memory/scripts/append_episode.py \
  --topic "html-prototype 生成" \
  --summary "完成了 CRM 列表页原型" \
  --skills "html-prototype" \
  --outcomes "docs/prototype/crm-list.html"
```
