# P06 本机只读分发诊断

状态：本次有界诊断已完成；已恢复实际工具路径与失败位置，仍无成功执行脚本/权限检查的证据。没有启动新会话、模型、probe、shell试验或改配置/代码。

## 已证事实

1. 仅对 thread01a0fe7d-b656-74d3-a194-99eadb6e3946 / turn01a0fe7d-be4c-7b11-8b1f-e75c00434ba0 的既有 logs_2.sqlite 做 mode=ro 查询。先限定该thread和1790976040–1790976195秒，再由它唯一process_uuid定位1790976174–1790976177秒。未查其他会话内容；thread_history同一thread+turn返回0条。
2. 同一进程日志54477836把RPC未映射ID exec-7b6a3da4-df07-44c5-9fe3-b30d991ab9d4 明确绑定到 code_mode.broker.invoke_tool → exec_command → unified_exec.open_session。记录filesystem/seatbelt/operation_not_permitted，path=unknown。这是原生命令工具真实分发尝试的证据，纠正“模型没有尝试”的过强说法。
3. 日志54477839记录外层exec call_E96cxUr3Z46UqB5G0Jwh9tSM、cell1、outcome interrupted；54477840记录外层handler执行开始、耗时541ms。时间1790976176早于预算中断1790976182473ms，不能将这次工具启动失败全部归因后来40k中断。
4. 工具注册并非纯猜测：实际调用日志已证明exec_command分发存在。对应试次有效feature日志54477845含shell_tool/unified_exec/code_mode_host=true；当前缓存也标shell_type=unified_exec、tool_mode=code_mode_only，但缓存fetched_at晚于P06且client_version0.159.2，故它仅佐证当前元数据，不能回填本次全部注册。
5. RPC的80条仍无commandExecution或对应工具结果；driver仅计可见checkpoint为1，漏掉本次已证exec_command尝试。实际操作至少有exec_command尝试与checkpoint两项；外层exec包装如何计数须明确避免重复。没有足够材料恢复完整参数、脚本stdout或所有子调用。

## 尚不能下的结论

- 文件拒绝的具体路径未知。未证明Python、PyYAML、脚本或实际允许/拒绝八项中的任何一项执行成功；普通parent标记未改不能替代拒绝证据。
- bundled zsh位于canonical package的codex-resources/zsh/bin/zsh，当前profile未显式覆盖该目录；本次shell_snapshot路径也在允许根以外。两者是具体可检验的启动依赖候选，尚不能指定其中一个为根因，更不能据此直接扩读整个HOME/CODEX_HOME。
- 既有本机ThreadStartParams schema有experimentalRawEvents开关，说明为内部用途；当前driver没有申请它。可作为后续观察方式候选，不能说已覆盖嵌套调用或可恢复P06未保存的输出。
- 增加token不能修好已经发生的命令会话权限拒绝；不能用独立command/exec、关闭sandbox或伪造effective_probe放行。

## 下一步所需的最小改动范围

先修评估工具自身的未映射调用检测与计数完整性声明，补跨模块反例；把此类试件问题明确保留为不可比较。并由原路由owner在相同证据边界下给出能保持硬读写限制的最小原生启动依赖方案，优先明确shell/login/快照参数，缺准确证据则保持未知。任何新行为试次须先有root显式方法/资源修订与具体配置独立复核；本诊断未增加第7次probe、未放行正式run。

## 数据最小化与成本

一次配置投影过宽，意外将环境中的一项Figma凭据及无关模型指令渲染到本会话工具输出。未写入诊断产物、未发送其他agent或外部服务；后续读取改为精确白名单，所有已保存诊断只含必要字段/脱敏本次日志。不能声称工具历史已删除，应告知用户轮换该凭据。未擅自修改凭据或Figma设置。

本次只读定位工具证据：8d9f85/ec37df、1afbb3/034a5c、9f5957/bb77f1、28ec79、78919b、0e0692、6e6284、7ed00b、bb1350。首次缓存大输出截断，不称完整阅读其指令正文；采用白名单补读需要的字段。0模型/探针/测试/安装/权限变化；root工具与分析成本不记零。

<!-- FILE_END: u007-p06-dispatch-diagnosis.md -->
