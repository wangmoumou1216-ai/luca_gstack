# U007 补充10：把剩余工程修复交回原三个会话

## 主协调决定

依据用户已给出的全生命周期实现、测试、review、最终验收提交推送且不再询问的授权，root 接受 J11 的方法资格 FAIL，保留 P07 失败。原生 Python 已实际运行，所以停止把入口整体当作不可执行；但当前 app-server 观察器不能证明所有包装器内的实际操作，不能将结果归咎于候选框架，也不能据此选择胜者。

现在放行一次并行的离线建设 W30/W31/W32，不再由主会话包办可委派代码。工作调用上限29→32，review26不变，总工作人员55→58；只增加本批3个实际turn，不移走必需评分余量。每个owner最多25分钟、60保守动作、80000可观测token，实际模型usage不可得则unknown。正式/隐藏0、能力7/7、行为7/144、迁移保留8及其他运行预算保持；本决定没有P08或任何新模型行为试跑额度。

这批建设只解决已知的失败留证与测试问题，同时交出原生计数/子Agent/fresh/停止的最小适用缺证表。它不会单独解除正式比较门。root 随后必须根据具体能力证据选择可验证的执行入口或说明仍缺什么，不能无限追加别名修复和试跑，也不能删掉T的原生能力、权限控制或整链恢复来求通过。

## 共享冻结与所有权

共同基线为 u007-root-integration-r7.json 的7个精确字节文件。root提供 u007-p07-replay-fixture.json，只把日志作为数据。所有人不是唯一执行者，禁止还原或覆盖别人修改。模块一仅拥有新检查程序及其单测；模块二仅拥有driver及其单测；模块三仅拥有integration.test及适用缺证表。root拥有公共合同、manifest、ledger和最终集成。

W31新增report字段固定为 raw_tool_evidence 数组（thread_id、turn_id、call_id、item_type、item、source='rawResponseItem/completed'、verification='WRAPPER_CONTENT_ONLY'）以及 raw_reported_command_results 数组（thread_id、turn_id、wrapper_call_id、output_index、reported_chunk_id、reported_exit_code、reported_output、verification='WRAPPER_REPORTED_NOT_AUTHENTICATED'）。只采tool call/output；保留原始输出，不eval或执行日志字符串。不把字符串里有几次工具名当实际执行次数。

重复事件不得重复结果；已知thread/turn之外的事件不能混入。inner ID没有可信来源就不创建映射。保留原有visible计数、nullable总数、UNKNOWN、formal=false与预算/取消语义。新字段只是诊断证据，不是正式计数或可信权限证明。没有结构化结果的raw输出也保留，不假定成功。

## 验收

必须以P07真形状验证：wrapper返回exit1可检索；两个dynamic操作不双计；hook不强配；累计usage不相加；预算中断与缺产物事实保留。另测重复、外来/过期事件与伪造wrapper JSON不能变成已认证原生遥测。W30异常逐项输出与canonical子解释器在mock中核对，但mock不证明真实sandbox成功。W32用真模块+fake transport，不复制实现。

没有新的生产框架写入、网络、安装、全局配置/trust/HOME/CODEX_HOME修改、真实项目或隐藏资料访问、新Agent、独立commit/push。原P07程序、registration、launch、case、日志不得改写或重跑。无需为本批再先派一轮计划审查；现有已知缺陷直接实现并测试，实际运行资格另由已有门核对。

<!-- FILE_END: u007-interface-addendum-10.md -->
