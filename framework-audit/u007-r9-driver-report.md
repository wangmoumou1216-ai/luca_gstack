# W34 R9 driver 核心接线

DONE_WITH_CONCERNS：限定代码、离线核心验证已完成；供root/W35收取与复核。真实模型/探针仍0，不放行P08或生产切换。

独占原71f8工作树driver pair；HEAD已核05120197073144c0f46b6fb30a192733d529cc4f。核W31前像后采用R8测试路径修正，原件备份在证据目录；不改他人模块。最终SHA256：
- driver.mjs：`9a704cd1a8076d3b061668481b83a99a398f88880bd18b1f41b32c00efb1028a`
- driver.test.mjs：`8b317c01dec819b682fea59a80821d250caa4358e87a344c63b3d4bbf6048f68`

严格验证可选native_trace={enabled:true,schema_version:1}及bindings.native_trace_sha256；登记同对象/字节，trace路径必须额度8且manifest capability预算8。旧路径保留6/7。无显式隔离profile拒绝；observer字节在加载及dispatch前复核。只向自有进程env增加CODEX_ROLLOUT_TRACE_ROOT，本run证据目录独占，既有deny-root权限验证排除候选读取该目录。未启用不加载observer或注入新env。

25ms轮询不重入；根ID仅取实际响应，fresh追加。trace不注册陌生child；已知thread/turn及真实tool_call_id才可映射RPC/hook。native与visible集合分别计数、分别检查超限，不盲相加；trace超限走既有interrupt/终态/进程组清理。记录poll_count/max_poll_gap_ms，明确有观测滞后而非调用前硬拦截。

正常完成先有界关闭stdin等待自有进程退出，失败/截止仍强制清理；清理后final读取。缺bundle、INVALID、未知操作归属、异常或最终超时不能成功。超时后禁止迟到poll覆盖已返回证据。report.native_trace保留最后快照；native_trace_accounting保留来源/计数/匹配与final状态；whole_chain仍UNKNOWN，tool_actions仍null、formal=false。原生非零保留在快照及受约束result引用中。

测试：定向RED exit1/0通过5失败；核心stub逐步GREEN5/5、7/7。加入冻结W33真模块与磁盘合成bundle后8/8、无跳过，原生failed结果留存。完整driver回归exit0/71通过、无跳过，22298.386708ms；随后仅补迟到poll隔离及final错误状态，最终字节定向exit0/8通过、1413.578708ms。完整回归对应前一hash，准确差异已单存，不冒称最终字节重跑全量。

执行命令：临时镜像内`node --test --test-name-pattern=W34 driver.test.mjs`及`node --test driver.test.mjs`；精确绝对路径、全部TAP/hash/退出见[证据](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w34-evidence-mo8f9d2e/evidence.json)。普通checkout缺可选合成bundle时真依赖单测会skip；本次记录具备依赖且实际运行。observer SHA为afcc6cb544c9f85319b8598284591f22a011302304ff886cce581a979da046ce，与root冻结相同。

按用户“前置只做核心”结束扩展：真实trace产出、权限/硬停止资格仍未知；child/fresh真实专项留给采用场景，未宣称通过。无全局配置/生产/隐藏资料/网络/新Agent/commit/push。

实际turn `01a0ff12-913d-7890-91e4-4c347ae42395`；起点1790985802，报告时953.2秒。保守动作上界74/75；模型usage及金额unknown。所有澄清同turn累计，未重置预算。

<!-- FILE_END: u007-r9-driver-report.md -->
