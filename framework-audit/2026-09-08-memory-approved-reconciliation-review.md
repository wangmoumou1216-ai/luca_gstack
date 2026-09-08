# 已批准记忆对账：执行前独立复审

PASS，限定当前精确脚本与计划：

- framework-audit/reconcile-approved-memory-20260908.py，SHA-256 92a63cfc63444f4313e14a81ac2c0dd2e24b26d728afcc838245b4935b7f05ef
- /private/tmp/memory-approved-reconciliation-plan.json，SHA-256 3ce7d4b3b795a8b6f53273ad8b90a9b3a2661f6f93faadb561e57d354e1f2e12

此前三个执行阻塞均已闭合：63-64严格绑定已审plan而非重新接受live哈希；53-58绑定code root/known roots/lock/source/destination；80-87写前预算归档范围并拒绝任何会触发宽projection builder的晋升；删除最终builder调用，避免触并发adapter/catalog。

## 人工批准来源

已独立只读比对提交 1a2d87887c088a8a19b9f2c923233d877b5dd8e5：四条SC-20260905事实字典、四条approved_stable记录和source allowlist均与已提交内容一致。不是自行推断新的用户批准。

实际源/目标比较：源独有恰好SC-20260905-001至004；目标独有恰好SF-001、SF-002、SC-20260609-003、SC-20260610-001；交集全部事实字典完全一致。该比较支持本次精确对账范围，不是通用“以fork覆盖权威store”授权。

脚本只复制已有批准候选和原批准记录，新增stable仍经过当前promotion_ready与promote_ready_candidates；归档仍用现有archive_superseded_facts。目标allowlist复制来自已批准同源内容，当前根投影已是新内容，此脚本不再次生成投影。

## 独立临时执行

只对temp fixture复制脚本执行，hardcoded STORE通过测试shim定向替换为temp属性；生产控制逻辑未改，无真实apply。

- 正常：恰好晋升四目标ID，恰好归档四旧ID，allowlist一致，没有生成projection目标。
- 取plan后更改source allowlist：非零、所有fixture内容不变，receipt未生成。
- 目标旧allowlist含待新增ID（会触发内部projection）：非零、内容不变、receipt未生成。
- combined facts额外引出第五个superseded目标：非零、内容不变、receipt未生成。

证据：/private/tmp/approved-reconciliation-audit-lzykspqj/result.json
探针：/private/tmp/check-approved-reconciliation-audit.py

## 保留的执行限制

这是经审查的一次性重放，不是自动恢复事务。中断后应保留receipt和所有数据，主线程读回已执行阶段，重新dry-run并审新plan；旧plan会因before哈希改变被拒绝，不能强行覆盖。该限制已在脚本5行明确，符合本次有主线程在场的最小方案。

最终“RECONCILED”仍需真实读回：四新增事实内容与source批准字段一致；四旧事实完整存在归档；无其他事实改变；allowlist一致；原待审新候选SC-20260908-001/002仍未晋升；census无碰撞；真实健康检查与投影一致性检查通过。不要把临时fixture通过说成真实数据已完成。

附：上一项碰撞迁移真实读回已PASS，原archive字节保持、两旧原行移出、两份promoted旧hash不变、新001/002保持CANDIDATE/nonstable/stable_requested且source映射正确。结果 /private/tmp/memory-governance-readback-review.json。
