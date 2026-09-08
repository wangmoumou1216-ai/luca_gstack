**发布就绪：FAIL。R1、R4 关闭；R2、R3 部分修复但仍有已复现反例，保留为阻断项。**

冻结清单 **83/83 SHA-256 匹配**；从指定 HEAD 重建 `tracked.patch`，33 个文件均与冻结版本一致。三个发布数据镜像也由基线＋权威补丁独立重建，与 receipt 完全一致，EP-150、EP-102 各保留一份。

1. **R1｜关闭｜原 P1／MAJOR，oracle：首次 push 失败后，相同命令是否仍假报无需同步？**  
   已反证：真实临时 bare remote 拒收后，重试成功发布同一提交，`HEAD == remote main`，没有重复 commit；既有暂存保护及不同名 tracking 分支反例通过。[代码证据](/private/tmp/memory-release-redteam-v2/files/scripts/sync.sh:47)

2. **R2｜保留｜P2／MAJOR，oracle，已证实：恢复是否可能把不同来源认作同一批准来源并归档候选？**  
   [来源比较](/private/tmp/memory-release-redteam-v2/files/memory/scripts/consolidate_memory.py:830)同时接受原字符串及转义后的替代表示。隔离构造两个真实文件：路径分别含字面量 `\n` 和真实换行，文件内容也不同；事实写入后注入审计失败，再改变候选来源，新进程重试返回 `0`、补写“同一来源”晋升审计并归档候选，尽管已落地事实的来源与重试候选不相等。**影响：恢复审计错误确认来源身份；尚未证明绕过人工批准产生新事实。**普通来源差异、撤回批准、事实差异反例均被阻断，但不能覆盖此转义碰撞。[运行证据](/private/tmp/memory-redteam-v2-probes-c70su3pt/source-identity-results.json)

3. **R3｜保留｜P2／MAJOR，oracle，已证实：失败后的下一次启动跨过 UTC 日期时，失败是否仍会显示？**  
   同日路径已修复：真实锁故障使 writer 返回 `2`，治理结果及 marker 明确为 `failed`，旧 digest 保留，同日启动告警通过。但[启动代码只读取今日 marker](/private/tmp/memory-release-redteam-v2/files/.claude/hooks/session-restore.mjs:560)；前一天已有正常 digest 且已展示、随后治理失败时，次日启动只提示触发当天治理，未显示此前失败。**影响：“下次启动可见”实际仅覆盖同日，日界后的失败提醒仍缺失；失败记录没有丢失，也不是完全无痕。**此反例执行冻结启动分区和真实文件，后台 spawn 使用观察桩，未冒称完整原生会话证明。[运行证据](/private/tmp/memory-redteam-v2-probes-c70su3pt/startup-next-day-results.json)

4. **R4｜关闭｜原 P2／MAJOR，oracle：UNRESOLVED 持久化后中断重试是否重复记账？**  
   已反证：注入持久化后异常，首次返回 `2`，重试返回 `0`，只保留一个 PD ID，原文未变；不同输入、归档哈希、路径、软链和中断恢复反例通过。[代码证据](/private/tmp/memory-release-redteam-v2/files/memory/scripts/daily_governance.py:348)

实际验证及限制：

- 重跑四类故障、15 项定向测试、3 项真实 Git 回归；扩展运行 79 项 memory 测试，78 项通过，另项因隔离夹具漏复制健康检查脚本失败，补入指定 HEAD 的辅助脚本后该项通过，原失败日志保留。
- 归档哈希保护、提案自评晋升、启动失败提示三项 mutation 均被捕获，恢复冻结字节后转绿。
- 研究报告未把官方机制冒充本地效果；代码／数据检出分离、SessionStart 调度及人工晋升边界披露基本诚实，但不能豁免上述恢复缺口。
- Claude API 403 保持 **UNKNOWN**；Codex 会话证据证明所记录的 hook 触发，不能证明后续任务正确采用记忆。旧版本 94/94 验收不能替代 v2 终版 gate；本轮未重跑完整框架或原生嵌套会话。
- 已审阅未发布路由祖先补丁；未修改生产仓库、真实记忆或 index，未提交、推送或执行迁移。

**未决发布阻断：R2 来源身份误判、R3 跨日失败不可见，以及 v2 终版发布门禁证据。**全部探针与失败日志保留在[隔离证据目录](/private/tmp/memory-redteam-v2-probes-c70su3pt)。