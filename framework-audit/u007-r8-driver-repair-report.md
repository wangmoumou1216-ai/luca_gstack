# W31 R8 driver 修复

DONE_WITH_CONCERNS：限定代码与离线验证完成，等待root集成及W32/非作者验收；不解除正式比较门。

仅改71f8工作树的driver pair及本报告；修改前本地与R7/root字节一致。没有修改P07原件、其它模块、全局配置或生产框架。

最终SHA256：
- driver.mjs：`1bf9c49969f5ca91591d82c18b29b117c39b6925598b4142ce61b67508144a82`
- driver.test.mjs：`475f77f519b87a621688a647db65b5fcd2b0c8efd53a884e2f01d5591c219199`

新增`raw_tool_evidence`与`raw_reported_command_results`，字段按补充10。只处理function/custom tool call/output；原item完整保留，仅解析完整JSON文本块。验证标记固定为WRAPPER_CONTENT_ONLY或WRAPPER_REPORTED_NOT_AUTHENTICATED，包装器伪造的身份/认证字段不能覆盖它。没有可信内层ID就不建映射、不收费、不推断命令成功。无结构化结果时仍保留原文。

限定当前活动family与turn；外来、过期、终态后事件拒绝进入新数组。相同事件去重；相同身份却内容冲突时保留原件并标INVALID。所有原通知仍在RPC日志，不执行日志字符串。

验证：`node --test --test-name-pattern=W31 scripts/tri-system-eval/driver.test.mjs`：RED exit1/0通过8失败；首轮实现因误接请求分支仍exit1/0通过8失败，日志保留；修正observe通知路径后GREEN exit0/8通过。`node --test scripts/tri-system-eval/driver.test.mjs`：exit0/63通过，21966.65375ms。

冻结fixture原item不变，只替换通知外层thread/turn及中断终态ID；动态回放等待真实fake callback返回。P07 exit1/chunk16cd62可检索，动态操作仍2、总数null、累计usage61934不累加，预算中断确认、缺产物、未映射hook和formal=false保留。另测重复、冲突、外来、过期、终态后、伪造JSON及非结构化输出。没有重跑P07或其它模块。

技术结论（≤600字）：仍缺可认证的内层原生调用ID、所属thread/turn、参数/返回/终态及wrapper到内层的明确关联，还需足以在动作边界执行停止的可信事件。当前raw schema提供Responses包装器内容，hook与wrapper无可信桥接；文本解析不能补成完整计数。driver已实现原生collab/source子线程登记、家族usage聚合、fresh前确认活动家族中断和进程组清理；仍缺真实child权限/资源/返回、未观察后代停止与fresh恢复行为证据。原则上可保留T能力并补这些证据，但现有schema/trace不能保证可行，不应删工具、降权限控制或假设覆盖来通过。

本次turn `01a0fef4-c23b-7042-902f-7a637229e2b2`，起点1790983848；报告时已用449.8秒。保守工具调用上界40/60；模型usage及费用UNKNOWN。无新增模型、探针、网络、Agent或提交推送。完整输入/源hash、替换规则、命令、退出与四份TAP单存：
[u007-w31-evidence-thg55rlm](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w31-evidence-thg55rlm/evidence.json)

<!-- FILE_END: u007-r8-driver-repair-report.md -->
