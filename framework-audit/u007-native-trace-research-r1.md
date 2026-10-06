# U007 原生记录出口：排除 metadata 开关，优先核本地 Rollout Trace

这是 root 的有界方法研究结果，不是运行资格票，也不授权新探针。来源为官方文档、OpenAI 仓库 rust-v0.160.0 标签与本机已冻结二进制；没有修改配置或启动模型。

## 已证实的排除项

官方 app-server 源码 `bespoke_event_handling.rs` 1155–1168 在发送 RawResponseItemCompleted 前显式调用 clear_executed_tool_calls。protocol/models.rs 886–925 同时将这些字段定义为 warehouse-only；request_metadata.rs 24–54、298–307 则把它们附到后续请求。由此排除“只打开 executed_tool_call_metadata 就能从当前 app-server raw 通知拿到可信内层完整计数”的修复方向。不是排除所有原生记录出口。

- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server/src/bespoke_event_handling.rs#L1155-L1168
- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/protocol/src/models.rs#L886-L925
- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/executed_tool_calls/request_metadata.rs

Hooks 官方文档说明嵌套 Code Mode 调用可进入工具 hooks，但 write_stdin 不重新执行 PreToolUse，hosted tools 不覆盖，部分特殊路径可退出默认 hooks。它不是完整执行边界，而且非托管 hooks 需既有信任。因此不为本评估启用未经信任的新 hooks，也不将现有通知 hook 数直接冒充完整动作数。

- https://learn.chatgpt.com/docs/hooks （Tool coverage、Tool calls from code mode）

## 新发现：本地 Rollout Trace

官方 `rollout-trace/README.md` 完整读取至189行：CODEX_ROLLOUT_TRACE_ROOT 是进程环境变量，仅向指定本地目录写 bundle，不上传；trace.jsonl 是有顺序号的原始事件，payloads 保存原始结果，root 与新建 child 共享 writer。该机制专门区分模型看到的 wrapper 文本和运行时内部工具/终端/协作。writer 是 best-effort，不能把开关存在当完整性或可停止性证明。

- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/rollout-trace/README.md

`core/src/tools/tool_dispatch_trace.rs` 56–100 将 CodeMode 的 runtime_cell_id/runtime_tool_call_id、真实 thread/turn/tool_call_id 和 handler 的 code_mode_result 关联；输出不是模型调用 text() 后打印的可伪造内容。`rollout-trace/src/tool_dispatch.rs` 176–180 排除外层 custom exec，199–211 记录实际 ToolCallStarted，319–332 记录结果。需要额外核 wait/terminal operation 的去重边界，不能自己猜计数。

- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/tools/tool_dispatch_trace.rs
- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/rollout-trace/src/tool_dispatch.rs

`rollout-trace/src/thread.rs` 92–109 从 env 启动本地 writer，144–160 为新 child 继承；源码明确已恢复 child 不应这样复用 writer，因此 resumed-child 全链仍有缺证。真实 fresh 根是新 bundle，需要由 driver 通过原生 thread/turn 与共享 run 关系关联，不能仅按文件时间猜。

- https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/rollout-trace/src/thread.rs

本机只读核验：/Users/luca/.codex/packages/standalone/releases/0.160.0-aarch64-apple-darwin/bin/codex，SHA256 112fae7a5a1223e673c8a1791d32338f37df8b527ff1159bb8adac6c4dbf1b4b。精确字节包含 CODEX_ROLLOUT_TRACE_ROOT 与 trace-reduce 字符串；`debug trace-reduce --help` exit0，确认离线 reducer 子命令存在。该检查0模型/0thread/0真实命令探针，不证明一次实际 native run 已生成这些记录。

OTel 文档另有工具结果出口，但异步批量并在关机flush，不能凭它承诺实时动作硬限；当前优先本地 writer，避免新增接收服务或外发遥测。

- https://learn.chatgpt.com/docs/config-file/config-advanced#observability-and-telemetry

## 对下一步的约束

W30—32 的已派发实现范围不变。root 收齐离线修复后，以本地 trace 作为一次明确的候选接线方案，而不是继续只补 alias 重跑。接线必须限定在本次自有 app-server 进程 env 与证据目录，不改 HOME/CODEX_HOME/全局配置、信任、模型或候选权限；所有比较条件同样启用并计其成本。证据目录要排除模型读写，避免原始 prompt/结果泄露或被篡改。

在释放正式比较前，还须用实际版本证明：事件身份、payload 来源/完整性、start/end或明确中断、父子与 fresh 关联、顺序/缺失/写入错误检测、与 item/callback/hook 投影去重、动作监测及取消。Trace best-effort 失败须 INVALID/UNKNOWN，不能因 reducer 可运行而翻成 PASS；源码分支不等于打包二进制实际行为。真实恢复与副作用连续性仍按原案例取得，不以 trace 替代任务验收。

下一次实际运行需要 root 单独明确建设及运行资源；当前能力7/7、formal0，补充10没有放行P08。P07失败原封保留。这个发现解决的是可观测出口选择，不是已证明新框架价值或已完成生产改造。

<!-- FILE_END: u007-native-trace-research-r1.md -->
