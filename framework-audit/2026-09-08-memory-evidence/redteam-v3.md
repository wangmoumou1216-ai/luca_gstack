**发布就绪：FAIL。R1、R3、R4 关闭；R2 保留一个已复现边界，另有发布字节漂移阻断。**

冻结文件 **83/83 SHA-256 匹配**；从指定 HEAD 重建 `tracked.patch`，33 个文件全部一致。三个发布数据镜像由基线＋权威补丁独立重建，与 receipt 一致；EP-150、EP-102 各保留一份。

1. **R1｜关闭｜原 P1／MAJOR，oracle：首次 push 失败后，原命令重试是否仍会假报成功？**  
   已反证：真实临时 bare remote 首次拒收后，重试发布同一提交，`HEAD == remote main`，没有重复 commit；已有暂存保护、不同名 tracking 分支均通过。[代码](/private/tmp/memory-release-redteam-v3/files/scripts/sync.sh:47)

2. **R2｜保留｜P2／MAJOR，oracle：既有门禁接受的 nullable scope，是否仍可能使相同批准输入无法恢复审计？**  
   **已证实。** `scope=null/false/0` 被门禁接受，写者分别保存为 `"None"/"False"/"0"`，恢复比较却省略这些值；事实落地后注入审计失败，新进程原输入重试返回 `0`，审计仍为零条、候选仍滞留，两种解析器均复现。影响是恢复停滞；没有证明证据丢失或绕过批准。[写入规则](/private/tmp/memory-release-redteam-v3/files/memory/scripts/consolidate_memory.py:738)、[恢复比较](/private/tmp/memory-release-redteam-v3/files/memory/scripts/consolidate_memory.py:834)、[八组运行证据](/private/tmp/memory-redteam-v3-probes-b_wyig8j/scope-recovery-results.json)  
   原转义碰撞已关闭：字面量 `\n` 与真实换行对应的不同真实文件，在两个方向、PyYAML／无依赖解析器下均不会误补审计；相同来源及 `valid_until/supersedes=null` 能恢复且幂等，审计未持久化前保留候选。

3. **R3｜关闭｜原 P2／MAJOR，oracle：昨日失败会否被今日空认领遮住，或在健康完成后继续误报？**  
   已反证：真实 writer 锁故障记录 `status=failed`；同日、跨日、今日缺失／空文件／空对象均显示失败，较新的健康完成结果清除旧告警。[代码](/private/tmp/memory-release-redteam-v3/files/.claude/hooks/session-restore.mjs:561)、[运行证据](/private/tmp/memory-redteam-v3-probes-b_wyig8j/startup-crossday-results.json)

4. **R4｜关闭｜原 P2／MAJOR，oracle：UNRESOLVED 持久化后中断，原输入重试是否重复记账？**  
   已反证：首次注入异常返回 `2`，重试返回 `0`，仅一个 PD ID，原文保留；不同输入、归档哈希、路径及软链反例通过。[代码](/private/tmp/memory-release-redteam-v3/files/memory/scripts/daily_governance.py:348)

5. **发布一致性｜新增阻断｜P2／MAJOR，oracle：当前待发布代码是否仍是本轮审查的冻结字节？**  
   **否。** 当前 `consolidate_memory.py` 和恢复测试已偏离 manifest，增量涉及上述 scope 恢复。本轮未执行或放行这些新字节。[精确差异](/private/tmp/memory-redteam-v3-probes-b_wyig8j/observed-live-drift.patch)  
   提供的 v3 全验日志现已结束为 **94 PASS／0 FAIL**，但不能将该结果与冻结 v3 的独立测试拼接成新版本闭合证明。

实际运行与限制：

- 隔离运行 **80 项 memory 测试、3 项真实 Git 回归及 sync 测试通过**，重跑全部 R1–R4 故障分区。
- 归档哈希、人工晋升、失败提示、来源身份四项 mutation 均被捕获，恢复冻结字节后转绿。
- 临时夹具曾因日期无法 JSON 序列化、漏复制 README 失败；纠正后重跑通过，原日志保留，未算产品缺陷。
- 研究未将官方机制冒充本地效果；代码／数据分离、SessionStart 调度、人工晋升的限制有明确披露。启动探针使用冻结运行分区和真实文件，不等于完整原生会话证明。
- Claude API403 保持 **UNKNOWN**；Codex 会话摘要支持所记录的 hook 触发，不能证明后续任务正确采用记忆。已审阅未发布路由祖先补丁，未重跑完整原生嵌套会话。

**未决阻断：冻结 v3 的 R2 scope 恢复缺口，以及当前新增字节的终版闭合。** 全部探针与失败日志保存在[隔离证据目录](/private/tmp/memory-redteam-v3-probes-b_wyig8j)。未修改生产仓库、真实记忆或 index，未提交、推送、迁移或切换项目。