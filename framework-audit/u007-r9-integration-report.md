# W35 R9 核心集成

状态：BLOCKED（本轮动作上限；核心GREEN 5/6，未完成联合回归）。不冒充完成或资格通过。

独占新增：`/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/native-trace-integration.test.mjs`。原integration.test、protocol pair的前像hash复核不变。

按用户core-only方向保留6场景：直接/CodeMode内层和动态投影去重；live超限停止；缺失、截断、缺终态失败；exit1留存。child/fresh专项移到实际采用场景，未声称验证通过。

最终同字节RED：冻结R8+真observer，0/6、退出1、20.211秒；缺/坏trace被旧driver当COMPLETED，超限等待8秒墙钟。GREEN：冻结R9真四模块，5/6、退出1、12.299秒；均无skip。不是missing-import RED。每次依赖前后hash一致。

唯一失败：live预算实际已触发NATIVE_TRACE_TOOL_ACTION_BUDGET并确认interrupt，3操作/exit130及末尾快照保留；本测试把RPC的interrupted原样写入trace终态，observer报UNMATCHED_TURN_END与UNFINISHED_BUNDLE，测试随后错误期待VALID。需按官方trace枚举修正fixture编码，不能修改RPC终态或弱化中断/失败留存断言。observer终态定义与官方source身份见evidence-index。联合回归因GREEN未全过而未启动。

测试SHA256 `69a2489b38af7baf0b63ea5d3294d2557ea06fc16068e29ae7e75714f03d30e4`。
RED日志 `e5a74ac0601fb2cc04cd9d71b58fe4b2831cd5f956a007bdf6592b3c4034df55`。
GREEN日志 `c6e3769c76abfc35910964fba120267664947f0fe714e175dc4dea3d2ebe4f20`。

证据目录 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w35-evidence-p6s_ywm6`：evidence-index.json含代码/日志/输入hash、命令、真实退出及剩余工作；r9-module-bindings.json固定真依赖镜像。root路径升级R9后，RED已改用冻结r8目录并核旧manifest，未改旧证据；首次RED保留*-first。

下一步仅修fixture后重做同字节RED→GREEN，再一次运行新文件+镜像内原integration.test；不扩场景或重做研究。磁盘数据与stdio为合成，driver/conditions/case-protocol/native-trace均真模块；未复制observer。

P08建议：一次核心实例执行原八项允许/拒绝与规则loader检查，留逐项退出及受控写产物；核本次私有trace目录、直接/CodeMode ID、dynamic对应、累计usage、终态/清理。缺证继续UNKNOWN/INVALID，不重试、不扩child/fresh；后者随实际采用场景验证。本建议不创建实例、登记或运行探针。

资源：上海08:03:32开始，08:29:41记录，26.16分钟，保守动作约75/75。实际模型usage/金额unknown；0真实模型/app-server/网络/新Agent/commit/push。整链覆盖UNKNOWN、总数null、formal=false保留。最终质量与必要控制要求未降低。

<!-- FILE_END: u007-r9-integration-report.md -->
