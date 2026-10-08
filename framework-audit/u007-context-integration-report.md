# W16 Context：真实三模块离线集成报告

状态：DONE_WITH_CONCERNS。W16 要求的离线接线验证已完成；真实模型、原生能力与净收益仍未验证。

本报告继承任务卡的共同目标：评估同一个跨 Codex 桌面、Codex CLI、Claude Code CLI 的框架，在任务理解、协作组织、信息连续性和必要人类控制上增加的价值及成本。Codex 桌面与 CLI 优先，Claude Code 仅作可能改变共同用途判断的必要兼容检查。技能内部领域方法仍归其 owner；本次不扩展平台分支、适配层、技能重构或评估阶段。

## 交付与归属

- 新增 `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/integration.test.mjs`。
- 新增本报告。未修改任何 driver、conditions 或 case-protocol 运行实现；既有 Context 单测也未改。
- 测试默认从自身同目录动态导入真实模块。本次通过 `U007_MODULE_ROOT` 读取 f351 集成目录；没有复制、重写模块，也没有注入 `loadModules`、condition stub 或 runtime stub。
- `createTrialRunner` 只注入 `spawnProcess`，用进程内 stdio 流模拟通信端。fake transport 不能直接访问 runtime、生成输出文件或调用 finalize；这些都经真实 driver 与 case tools 完成。
- 每项测试使用独占临时目录、真实 materializeCondition、真实材料树摘要、绑定真实源码与合成 case 的 development 假 READY。没有启动 codex 子进程或模型。临时材料和运行证据在测试结束后清理；持久结果是此报告、测试源以及本聊天的工具输出。

## 验证结果

执行目录：`/Users/luca/.codex/worktrees/9a9a/luca_gstack`。

```sh
U007_MODULE_ROOT=/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval node --test scripts/tri-system-eval/integration.test.mjs
```

最终退出码 **0**，**5 tests / 5 pass / 0 fail / 0 skipped**，总时长 **10204.70275 ms**。工具输出 `742f79` / `0a858d`；测试诊断逐项打印模块根目录及三个真实源 hash。

| 验证路径 | 条件 | 真实 case 工具动作 | 模拟线程数 | 保留的依赖失败 | 预期工具拒绝 |
|---|---|---:|---:|---:|---:|
| 普通全阶段完成 | T | 6 | 1 | 0 | 0 |
| 普通全阶段完成 | I | 6 | 1 | 0 | 0 |
| 依赖失败后合法限次重试 | T | 11 | 1 | 1 | 2 |
| 子线程登记、读写与根控制限制 | I | 8 | 2 | 0 | 2 |
| 旧线程族终止后 fresh 恢复 | I | 11 | 3（两代根与一个旧子线程） | 1 | 0 |

所有路径都断言完整 checkpoint 序列、`protocol_complete=true`、`finalized=true`、实际输出内容、最终 evidence 文件和 driver result 文件与返回数据一致，并确认没有未结束 turn 或 driver errors。普通 T/I 路径还通过真实 `case_read` 读取生成的条件文件。

重试路径先确认失败依赖阻止写入（`DEPENDENCY_FAILED`），错误 token 被拒绝（`RETRY_TOKEN`），随后使用实际声明 token 进入限次重试与成功结果阶段。原 exit_code=2 的失败和两条错误记录均保留；失败与成功事件顺序保留。

子线程路径以模拟原生 `thread/started` 关系事件触发 driver 的真实 `registerThread`。子线程完成合法读写，证据中的 `threadId` 是子线程；checkpoint 和 question 分别被真实 runtime 拒绝为 `ROOT_CONTROL_ONLY`，随后根线程完成阶段控制。

fresh 路径中子线程写入实际 checkpoint，根提交真实 path+SHA。旧主线程与子线程一直处于活动 turn；fake peer 收到 interrupt 后先返回 RPC response，再于后续事件循环发 terminal notification。测试检查两条 terminal notification 都早于新根启动，并检查两个 interruption 都已 confirmed。新根读取旧 checkpoint 和恢复后新材料，继续到 finalize；旧失败、旧子线程写入身份、新根身份及三条跨代登记均保留。

## 错误历史与修正

首轮同命令退出 **1**，5 项都在公共验证辅助函数 `run` 的同一断言失败（原测试第 163 行；输出 `a5d6ff` / `7f383f`）。最小反例：将真实落盘的 `final.json` 与 `report.engine_snapshot` 整体 deepEqual。final 文件合法地额外包含 `terminalMessage`、`protocol_complete`、`status`、`completion_claim_verified`，故这种比较不成立。

修正测试，使 final 文件与 `report.engine` 去掉返回专用 `finalEvidencePath` 后的记录比较。同时按已观察到的真实字段修正子线程断言：协议读写证据使用 `threadId`，不是 driver 报告部分字段使用的 `thread_id`。这属于测试断言修正，不是模块接口 bug。第二轮五项全通过；未发现需要其他 owner 修复的接口问题。

测试中四条有意触发的工具拒绝是受测行为，并非 driver 失败；拒绝历史没有被成功收尾覆盖。

## 精确源码绑定

本次真实模块目录：`/Users/luca/.codex/worktrees/f351/luca_gstack/scripts/tri-system-eval/`。

| 文件 | SHA-256 |
|---|---|
| driver.mjs | `f38bbed89b79f345a5a12ee7c4ee27cff0bbbc1a313e428a60d0b1ac77b3fe94` |
| conditions.mjs | `0337ed8b1d78805de5b2a3658623de00db87cd5c29aac29a3aa760c1dec63dc4` |
| case-protocol.mjs | `ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8` |
| 9a9a integration.test.mjs | `86bd838a432e0546e103aa490ea5f374e307338532e7d1f7910d91a0cd8355a1` |
| 9a9a 既有 case-protocol.test.mjs（未修改） | `b668c47cfb89cf92b820b3c46cc8574b71c555f2565963a10040fa7f33f966af` |

W16 任务卡 SHA-256：`976285107401d2583d5e384afc8f6bea5e665e62646e0314280bcd9fa0f162a1`。
接口补充 4 SHA-256：`5ea1a081c26ed680969929cfa69898be0562e5d4e4bfc9452ef4706c13f1534a`。

## 限制与资源

- 这是作者执行的真实模块离线集成验证，不是独立 review，也不是实际 app-server 原生探针。登记使用模拟原生事件；进程终止、OS sandbox、全局注入、真实子代理遥测和模型语义消费仍 UNKNOWN。
- 未测 B/S；本次 T/I 生成源、材料 hash 和 case 工具接线通过，不证明真实原生 B 或条件间等价性。
- 合成 case 是中性本地记录任务，没有 developer/hidden 的答案或按公开 case ID 特判。真实公开六题未运行，hidden 未读；不宣称效果优劣、通用收益或净收益。
- development 假 READY 仅供 fake transport，未运行 probe；driver owner 并行补充的接口补充 4 probe 注册接线不在本次结果内。
- 语义质量和必要控制整体评级仍为 `NOT_EVALUATED`，完成主张验证仍为 false。测试中的 7/14/21 token 是固定模拟遥测，绝非真实模型消耗或性能指标。
- 本任务开始于 2026-10-02 18:16:43 UTC，最终测试完成时间不晚于 18:21:47 UTC；报告收尾另计，远低于 45 分钟准备池。底层工具动作含收尾核验共 25 次（按本聊天调用记录计；functions 包装不另算）。模型 run、正式 run、联网、额外 Agent、hidden 均为 0。全链可观察 token 和货币成本无可靠计量，未以模拟数值代替。
- 没有提交或推送；未改全局配置、生产项目、framework 模板或他人文件。Git 中此前已有的 Context 文件保持原 hash。

<!-- FILE_END: u007-context-integration-report.md -->
