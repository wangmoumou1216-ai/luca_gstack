**FAIL — Standards：仍有 1 项 Important。**

[consolidate_memory.py:834](/private/tmp/memory-release-redteam-v3/files/memory/scripts/consolidate_memory.py:834) 的空值比较与 [writer:744](/private/tmp/memory-release-redteam-v3/files/memory/scripts/consolidate_memory.py:744) 不一致：当前晋升门接受 `scope: null`，writer 将其写为字符串 `"None"`，恢复逻辑却按字段缺失比较，导致补审计持续跳过。

实际故障注入：事实写入后令审计抛错，再重试三次。**PyYAML 与无依赖 parser 均复现：v2 补写 1 条审计，v3 始终为 0**；事实保留，但恢复未闭合。

其余验证：四文件 SHA 与增量一致；14 组正常恢复探针、12 组告警探针通过，涵盖字面量 `\n` 区分、日期空值、昨日失败及后续健康记录清警。

限制：仅内存探针和语法检查；未运行完整磁盘、并发或发布测试。未修改文件，未评审 Spec。