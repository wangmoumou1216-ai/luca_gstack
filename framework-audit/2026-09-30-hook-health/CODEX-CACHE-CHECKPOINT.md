# Codex 注册缓存复发 checkpoint

母仓及 origin/main：54ef203b4dd77e23564d0cba22f773346d30dfec。
本地 receipt：text-target-activation-result.json，ACTIVATED_SOURCE_INSTALL_AND_THREE_PROFILE_TRUST_VERIFIED_LIVE_RELOAD_PENDING，2026-09-30T14:34:35.086933Z；不要重复运行 consumed activation helper。
当前磁盘/安装/source health PASS，source digest 1981bc83163ea3d56d83e51defbdb247184c075691f8542659bbb165b8e90469。
旧 1ea5d236 UserPromptSubmit embedded digest e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691；对当前母仓真实复现三次 exit 2，stderr [luca_gstack] hook source integrity mismatch。没有运行到实际 route guard。
新稳定协议已明确最小 seam，见 FOLLOWUP-PLAN.md R-CODEX-CACHE-1；尚未修改生产源码、提交或启用新协议。
原生 agent /root/codex_registration_cache 实际已完成两轮只读取证，root activation 8868a15a-dcb8-4281-8508-385f5d869e95 的 invocation cd38d1c4-7de3-4bb1-aa02-1d17d9a4c7ca 仍 pending，仅 tool_use_id + agent_type，无 agent_id；未伪造关联或接受证据，关键审查尚未派发。
官方 CLI proxy 只读 initialize 两次均超时，无 thread/config/trust/reload 写入；只结束各自临时 proxy 子进程，未停止 daemon。
Computer Use 明确禁止操作 com.openai.codex；不能通过其他 GUI 或隐藏 IPC 绕开。
真实 Luca Direct 空白 draft 成功一次，仅这一次，不据此宣称三模式或 Codex 旧会话恢复。Sidecar settings 仍 rev14 测试旧路径，合法修复 helper 待应用无 live writer。
下一步：Codex 真实宿主重载后验证当前 hook registration 和 root native lifecycle；独立方案审查通过再进入 U-CACHE-GATE。
不触碰其他 dirty、framework/、共享项目别名或 U001-P，不消息其他 user-owned threads。

追加可信只读取证：canonical native child transcript /Users/luca/.codex/sessions/2026/09/30/rollout-2026-09-30T22-46-04-01a0f2c7-a1d7-7063-b180-ff149b4c57bd.jsonl 的 session_meta 显示 id=01a0f2c7-a1d7-7063-b180-ff149b4c57bd、parent=01a0f0fe-e6fa-7660-beb5-181b1a9b6444、agent_role=explorer、timestamp=2026-09-30T14:46:04.630Z，与该真实派发时间匹配。仅发现实际 ID，未手动绑定、接受证据、伪造 Hook 事件或改变 activation。可信关联遗漏的具体原因未证明，不把它与旧源码 digest 缓存当作已确定同根因。
已通过异步问题请求用户正常完全重启 Codex；这是一项真实宿主操作，尚无用户完成答复。GUI 工具不允许操作 Codex 自身，官方 daemon proxy 连接无成功证据。

Goal continuation audit（首次自动续跑；保持目标 active）：前一 goal turn 完成了 canonical native metadata 取证和持久修复方案冻结，未声称 source 修复通过。本次 readActivation 仍为 8868a15a-dcb8-4281-8508-385f5d869e95，native invocation cd38d1c4-7de3-4bb1-aa02-1d17d9a4c7ca 缺 agent_id，gate 恢复未证实；候选 worktree 仍 clean，未执行生产新协议修改或发布。单次 UI inventory 超时后未推断进程终止；改查指定 Luca app，Computer Use 权威返回 Mac is locked and automatic unlock could not unlock it。没有 GUI 动作、Codex 操作、强制退出或审批状态改写。本次不是对 live job 的 verified wait；同一关键可信关联阻塞仍存续，外部 human unlock / Codex 正常重载待完成。

Goal blocked audit（第二次自动续跑，第三个连续阻塞 goal turn）：前一 goal turn 属于 no progress（状态复核/记录没有使修复更接近已验证发布；GUI 只读证实 Mac 锁屏）。本次再次从公共 readActivation 核对同一 activation 和同一 unbound native invocation，未恢复。该条件在原人工请求 turn 和两次自动续跑连续保持；不是等待 live process/job，child 已完成且官方 proxy 临时进程已结束。所有剩余源码协议决策/独立审查/发布依赖可信关键派发，实际三模式和合法 Sidecar 设置事务需要 GUI 解锁。不能伪造 native Start/Stop、手动清审批状态、跳过独立 gate 或绕过 Codex GUI 禁止。没有可安全推进的依赖前项；需要外部 human unlock / Codex 正常重载后恢复。目标标记 BLOCKED，保留完整原目标，不标 COMPLETE，不重复激活 helper。
