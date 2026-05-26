# sessions/

原始会话记录文件。每次 session 结束后由 `append_episode.py` 生成。

- 格式：`[YYYY-MM-DD]-[topic-slug].md`
- 内容：session 摘要、关键决策、产出文件列表、遇到的阻碍
- **此目录下的 .md 文件不入版本控制**（见根目录 `.gitignore`）

索引文件 `../index.jsonl` 入库，是跨 session 的结构化摘要。
