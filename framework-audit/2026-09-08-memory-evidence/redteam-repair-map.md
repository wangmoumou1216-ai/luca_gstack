# 红队四项修复映射（待闭合复审）

R1：sync 在无新暂存时仍 push 当前 HEAD；真实 bare remote 拒收→重试，确保同一commit发布且不重复commit。
R2：相同已批准候选与已落地事实的字段/来源匹配后补齐缺失的晋升审计；无durable promoted review不归档该候选。两晋升CLI共用恢复函数；审批/身份不匹配拒绝修复审计。测试覆盖先写fact后audit失败、原候选保留、新进程alternate CLI重试和幂等。
R3：治理writer失败时stdout/marker明确status=failed和error；保留旧digest，首次失败可写告警digest；下次启动即使已有digest仍展示失败与补跑命令。scheduled exit0的fail-open契约保留，不谎称健康完成。
R4：UNRESOLVED 的同原文/状态/证据/actor重试复用已持久化ID，不重复记账；新证据仍可形成新的真实裁决。

测试：memory/tests/test_memory_failure_recovery.py、test_pending_disposition_recovery.py、scripts/test-sync-real.mjs、scripts/test-hooks.mjs。首个旧archive正例补齐真实promoted review前提，没有放开缺证据归档。

额外发布增量：三个数据文件经独立原始字节对账镜像，见release-data-review.md/receipt；其他已批准事实和reviews保留原历史。

隔离发布候选首轮verify为93PASS/1FAIL：S34的S12因临时clone六条hook未授信；其他18项接线检查PASS。这是临时目录未正式安装的能力状态，未改用户trust配置或把UNKNOWN改成PASS。正式运行目录六条hook已授信、全verify之前94PASS；修复后的正式目录将再次全验。
