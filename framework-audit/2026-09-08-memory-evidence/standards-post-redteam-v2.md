**FAIL — Standards：2 项 Important，尚未闭合。**

1. **不同证据被误认成同一候选。** [consolidate_memory.py:827](/private/tmp/memory-release-redteam-v2/files/memory/scripts/consolidate_memory.py:827) 同时接受原文本与转义文本。内存探针复现：已存证据包含字面量 `\n`，重试候选包含真实换行；两者不等，仍补写 `promoted` 审计并允许归档。ID 冲突检查未拦截，证据对应关系被破坏。

2. **合法空值使审计恢复持续跳过。** 同处比较将候选的 `valid_until: null` 转为 `"None"`，而正常写入会省略该字段，读回为缺失值。实测首次事实写入成功，原候选重试后审计数量仍为 **0**；该恢复路径无法闭合。

验证：10 个文件 SHA、基线增量和语法均通过；已执行内存恢复探针、故障注入、mutation 抽查、hook 提示及 sync 控制流验证。

限制：只读沙箱禁止临时写入；未运行完整测试套件、真实 Git 发布、磁盘持久性或并发验证。未修改任何文件。**Spec 未运行。**