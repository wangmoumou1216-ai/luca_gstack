# W22 — orchestration 有界修复报告

状态：DONE_WITH_CONCERNS。两项 driver 修复和本模块离线验证完成；等待 root 集成与非作者复审。J05 原 FAIL 保留，正式比较与生产不放行。

## 实际 turn 与授权

- 工作 thread：`01a0fcca-6e8c-7833-ba45-f39e6992f11b`。
- 本次实际新 turn：`01a0fe34-18fd-7853-9fbd-16b53723cd84`，read_thread 返回 startedAt=`1790971222`。任务卡预期的 `01a0fe29-dca6-7250-8fa3-149899864a99` 是已完成 N02；两次成本不能合并后清零或丢弃。
- 首个 shell 时钟：1790971230.021842。报告写入时钟：1790971828.582592（2026-10-02T20:10:28.582592+00:00），距实际 turn 起点 606.583 秒；不包含写后核验及最终回复。
- W22 卡 SHA256：`1c3c1ffde49f469bcd0d3316a38b31b9db26a97d6b358c43f814f8d2a3698c94`；补充 6：`4238376c4138210fd992af1fc98447cae18e16fece78abc6aabda5f4c4e1ab9a`。沿用已完整读取的共同合同、补充 1—5、J05 票/envelope 和 r3；本 turn 复核其绑定。
- 继承一个通用框架、按共同用途评估的输入合同；Codex 桌面/CLI 优先校准。只修评估可信度，不把宿主差异扩成平台工程。
- root 的工作分配由 20+32 改为 23+29，总 52 不变；本报告不自行增加预算或 release 权限。

## 所有权、基线与产物

只改 `/Users/luca/.codex/worktrees/71f8/luca_gstack/scripts/tri-system-eval/driver.mjs`、`driver.test.mjs` 和本报告。root 工作树只读。工作树 HEAD：`05120197073144c0f46b6fb30a192733d529cc4f`；git status 仅显示原有未跟踪目录 `?? scripts/tri-system-eval/`，故用逐文件内容 hash 和 r3 diff 定界，不用 tracked diff 冒充完整变化证据。

同步前已确认本地仍是 W19 原交付，备份到：
`/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w22-owner-backup-67z7jols`

| 文件 | 同步前备份 SHA256 | root r3 基线 SHA256 | 本次交付 SHA256 |
|---|---|---|---|
| driver.mjs | f766babd64996cb3b34e3856dfe0167e22c00a38778666f8697b396f128b12f1 | 8b6152faeaf1cb29db7e9e32493939f37d7a022ec4eb34f3d2f06fd9e0a25dee | ce5372b72266a8c99edd2c1b0a91f555cf34e99e04033ff7918a9d022550659f |
| driver.test.mjs | 6d408fb2e314c2c6d7cc76b1589df31fc8b6626fbc3fdeb395d2494d03095f0a | c91ad8d4a74f63adce1c0fc7a26dd5bc04b9c8d4d0c5308815d917c82f0e59d1 | 9f0a32d28fb937224ab6aed5a00a31eb53f4d7ba031969c92f509af359bb97f2 |

root r3 的真实 UA 前缀修正及对应测试已保留；未回退他人修正。复核时 root 的全部 7 个文件仍匹配 r3。没有修改条件、协议、integration、共享 manifest/ledger。

N02 文件 `u011-orchestration-evidence-limits.md` 未改，SHA256 仍为 `7ada594caf3665953303c58740399e4f8fe369a90281fd6dd0e92575ef64d972`。已有 W15/W19 报告和历史失败记录保留。

## 两项行为修复

相对 r3，driver 只有两处逻辑变化：

1. development/hidden 等非 probe 阶段无条件要求 `native_command_permissions?.effective_probe != null`。删除整个权限对象现在以 `NATIVE_EFFECTIVE_PROOF_REQUIRED` 拒绝，发生在目录物化和 spawn 前；已有后续 proof 绑定/路径/版本校验仍生效。显式注册的 probe 例外保持原语义。
2. `runtime.finalize()` 返回 `status === 'INVALID_RUN'` 或 `invalid_run === true` 时，将顶层状态设为 INVALID_RUN。原 engine 结果与原错误不变；现有公共 CLI 的状态映射因此退出 1。候选工具失败、协议未完成等候选结果仍可记录为 COMPLETED，且原失败信息保留；这不是质量 PASS。

测试调整：正常正式 fixture 明确使用仅 fake transport 有效的证明；bare fixture 仅供拒绝用例与注册 probe。旧未知 native scope 用例迁移为显式注册 probe，B 用例同步其注册 condition_id，不忽略失败。新增 7 项覆盖两种正式阶段、两类 engine 无效信号的 API/CLI 传播，以及候选失败对照。

公共 CLI 测试在临时目录复制当前真实 driver，提供 synthetic conditions/protocol stub；`PATH` 仅指向该 fixture 的 fake-bin，默认 codex 命令由绝对 Node shebang 的 fake executable 处理，导入本测试 fake-server 分支。没有调用真实 Codex 二进制或模型。此证据证明公共 CLI 退出语义，不证明三个真实模块的集成。

## RED / GREEN 实际证据

输出保留在本 turn 工具记录，以下 chunk 标识定位原输出；没有将实际失败改成跳过。

| 阶段 | 命令 | 实际结果 | 输出标识 |
|---|---|---|---|
| 修 driver 前 RED | `node --test --test-name-pattern=W22 scripts/tri-system-eval/driver.test.mjs` | exit 1；0 pass / 6 fail；6009.501917 ms | 53ed38 → 301d9a |
| 修复后定向 GREEN | 同上 | exit 0；7 pass / 0 fail；8250.56925 ms | 1d7411 → 8c878b |
| 完整本模块 GREEN | `node --test scripts/tri-system-eval/driver.test.mjs` | exit 0；42 pass / 0 fail；18483.455 ms；cancelled/skipped/todo 均 0 | 428a44 → b4461d |

RED 摘要：development/hidden 两例均报 `Missing expected rejection.`；两例 API 实际 COMPLETED、期望 INVALID_RUN；两例 CLI 实际 exit 0、期望 1，stdout 为 COMPLETED。GREEN 增加第 7 个候选失败对照，保留原有 35 项测试，包括实际 UA、权限证明拒绝、注册、deadline、fresh family 与进程组清理。

driver 相对 r3 的两处 diff 与完整绑定复核见 40b94e；test diff 见 e02a89。diff 命令的 exit 1 表示存在预期差异，不是测试失败。最终内容 hash 和 HEAD 见 3bb9a1。

## 用量与限制

- 没有开 Agent/新 thread；没有真实模型、探针、网络效果、全局配置、生产修改或 commit/push；P06 未消耗。
- 可见工具记录按 functions wrapper 与其 nested calls 分开累计：压缩前约 26 个调用；续接读取/核验至报告写入预计累计约 36 个调用，写后核验仍有预算。此为保守人工调用计数，不是平台认证的 action ledger；shell 内程序数及精确最终动作计数 UNKNOWN。没有接近 90 动作或 45 分钟上限。
- 当前 turn 的模型 token/平台账单未由工具提供，记 UNKNOWN，不记为 0，也不从报告长度推算；root 需按实际新 turn ID 收取。上述测试耗时是测试进程实测，不等同于整个 turn 成本。
- 无已知剩余的这两项局部逻辑缺口。未运行真实三模块 integration；公共 CLI 用 synthetic stub，不能替代 W23 的真实模块离线集成或非作者复审。
- 本地 proof 消费验证仍属于结构/绑定检查，不是行为认证；原生 app-server 命令、子线程/MCP/网络边界及 B/T/S/I 正式比较仍欠证据。此前 P05 超限与 J05 FAIL 不因本次离线修复转为 PASS。

## 下一步与最终目标

root 以表中最终 hash 收取这两个文件，保留 r3 中他人的有效变化，结合 Context owner 的集成结果做非作者复审。若复审通过，最多证明这些离线评估缺陷已修复；正式放行仍需原有证据与授权，不能由本作者自批。

仍欠最终目标：可信的正式共同用途/净价值比较及统一裁决；本次没有证明框架的净收益，没有提出生产迁移。

<!-- FILE_END: u007-orchestration-bounded-repair-report.md -->
