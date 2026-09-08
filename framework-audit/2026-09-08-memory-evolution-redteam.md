**发布就绪：FAIL。** 冻结清单 72/72 哈希匹配；发现四项已复现的恢复缺口，尚不能提交发布。判据为计划 Phase 3 第 46 行的失败可见、证据保全及重试不重复记账要求。

1. **R1｜P1 / MAJOR｜oracle｜已证实：首次 push 失败后，相同同步命令是否会假报“无需同步”？**
   [sync.sh:47](/private/tmp/memory-release-redteam/files/scripts/sync.sh:47) 在 index 无变化时直接退出，未检查尚未发布的提交。真实本地 bare remote 首次拒收后，重跑返回 `0`，但 `HEAD != remote main`、本地仍领先一提交。**影响：失败后的正常重试无法完成发布，并给出误导性成功提示。**

2. **R2｜P1 / MAJOR｜oracle｜已证实：晋升事实写入成功、审计追加失败后，重试是否会留下缺失的晋升审计？**
   [consolidate_memory.py:820](/private/tmp/memory-release-redteam/files/memory/scripts/consolidate_memory.py:820) 先写事实再写 review；重试跳过已有事实，[第 955 行](/private/tmp/memory-release-redteam/files/memory/scripts/consolidate_memory.py:955) 又仅凭 promoted 中存在该 ID 就允许归档候选。隔离注入审计追加失败后，新进程重试返回 `0`、候选已归档、晋升 review 仍不存在。**影响：已批准事实的执行审计链不完整；这是恢复缺陷，不是已经证明绕过人工批准。**

3. **R3｜P2 / MAJOR｜oracle｜已证实：每日治理写者失败时，是否仍被记为健康完成？**
   [daily_governance.py:1637](/private/tmp/memory-release-redteam/files/memory/scripts/daily_governance.py:1637) 只在今日已有 digest 时避开完成标记。真实子进程因锁路径为目录返回 `2`；今日无 digest 时，主流程仍写入无错误字段的完成 JSON，显示 `loop_anomalies=0`。结合 [session-restore.mjs:561](/private/tmp/memory-release-redteam/files/.claude/hooks/session-restore.mjs:561)，今日自动触发被抑制。**影响：失败被完成状态掩盖；digest 正文确有警告，因此不是完全无痕。**

4. **R4｜P2 / MAJOR｜oracle｜已证实：UNRESOLVED 裁决持久化后中断，相同输入重试是否重复记账？**
   [daily_governance.py:341](/private/tmp/memory-release-redteam/files/memory/scripts/daily_governance.py:341) 只复用 `move_state=PENDING` 的记录，遗漏 UNRESOLVED。注入持久化后中断：首次返回 `2`，相同参数重试返回 `0`，产生两个不同 PD ID。**影响：违反重试不重复记账要求，并重复增加裁决计数；原始证据没有丢失。**

本次实际验证：

- 19 项召回、范围隔离、pending 恢复、候选 ID 测试通过；真实本地 Git 两项既有回归通过。
- 移除归档哈希保护、放开提案自评晋升两项 mutation 均转红，恢复冻结字节后均转绿。
- 上述四项故障探针均保留结果，见[隔离证据目录](/private/tmp/memory-redteam-probes-uwp0b3d0)。治理探针隔离了无关健康检查及联网观察者；晋升中断使用故障注入。
- 临时 `apply_patch` 曾被路径限制拒绝，随后通过获授权的临时目录写入完成夹具；该工具限制不算产品缺陷。

边界判断：研究报告未把官方机制等同于本地性能收益，未发现据此要求架构重写的依据。SessionStart 调度、旧数据检出未升级、七份权威数据仅以补丁留存均有披露，不能据此宣称常驻治理或权威数据已发布。Claude API 403 保持 **UNKNOWN**；Codex 会话摘要支持 hook 观测，不证明记忆在后续任务中被正确采用。

已检查两份发布补丁及既有未推送路由提交的增量；未重跑完整路由、全框架或原生嵌套会话。未修改仓库、真实记忆或 index，未执行迁移、项目切换及外网发布。**未决发布阻断为 R1–R4；既有 Standards/Spec PASS 不覆盖这些新增反例。**

## 最终闭合（v4）

上述为首轮发现，保留历史。后续 R1–R4 及来源身份、nullable scope、跨日告警和发布字节漂移问题全部闭合；最终红队 PASS，参见 [最终报告](2026-09-08-memory-evidence/redteam-final-v4.md)。Standards/Spec 最终均 PASS，81 项 memory 和 94 项框架验收通过。Claude API403 保留 UNKNOWN，正常提交门禁与远端读回见发布回执。
