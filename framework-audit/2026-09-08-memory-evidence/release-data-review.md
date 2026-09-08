# 独立发布数据一致性审查

Reviewer: memory_audit；只读；PASS。

核对权威库 7 项 live SHA 与 manifest 全匹配，补丁与 baseline→live 的 git diff 逐 byte 一致。

允许仅镜像三个 baseline 与当前正式仓完全相同的文件：episodic/archive/2026.jsonl（EP-102归档）、episodic/index.jsonl（新增EP-150、移出EP-102，热窗50条）、semantic/archive/candidates-2026.jsonl（四条已批准候选档案）。两episode ID在热窗+档案各一份。

另外四项不覆盖：promoted 89 ID相同仅四条 added 日期不同；superseded五条事实字典相同只序不同；allowlist相同；reviews各有原批准后落库事件，当前保留9/5原历史，权威9/8重放留patch/receipt。仅保存patch不足以让发布后普通索引命中EP-150；三项精确镜像闭合发布目的。

执行者写前重新校验全部基线和源SHA，写后三项与目标匹配，另外四项git diff为空。审查者未修改数据。
