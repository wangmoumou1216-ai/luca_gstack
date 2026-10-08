# W25 — 工具调用可观测性有界修复

状态：DONE_WITH_CONCERNS。P06 衍生缺项反例从 RED 变 GREEN，本模块回归通过；等待 root 集成、W26 跨模块验证及非作者复审。此为评估工具修复，不是框架主体落地或正式比较放行。

## 授权、实际 turn 与所有权

任务卡 SHA256 `b1a8b00938691605cc18568f2c1e8fce2725ca8fea2bd3c0d98021d835e19a26`；补充 8 `93b425c87b76ec8bb8ed63aca862fef361ddcf72e3eea4fc526badeaa5056a0d`，均完整读取并核验。补充 8 的 work26/review26/总52和原有行为/单次限制保持；capability6/6 不增加。复用未变的上游合同与已读 code-hygiene Mode A 方法。

实际 thread `01a0fcca-6e8c-7833-ba45-f39e6992f11b`，新 turn `01a0fe93-0381-7683-a0d9-9c46449ae651`，read_thread startedAt=`1790977442`。首个 shell 时钟 1790977455.586596；报告写入 1790977907.454041（2026-10-02T21:51:47.454041+00:00），距 turn 起点 465.454 秒。此前 W22/N02 成本和失败不清零。

只改原工作树 `/Users/luca/.codex/worktrees/71f8/luca_gstack` 的 driver pair 及本报告。HEAD=`05120197073144c0f46b6fb30a192733d529cc4f`。变更前两文件均与 root R5 相同，因此无同步/覆盖需求；root f351 只读，交付前复核其 pair 仍为 R5。其他模块、manifest/ledger、生产 R、framework/、真实项目与全局配置未改，未 commit/push。git status 仅有既有未跟踪 `scripts/tri-system-eval/`，以文件 hash 和与 R5 的直接 diff 限定变化。

| 文件 | R5 / 修改前 SHA256 | 最终 SHA256 | 最终 bytes |
|---|---|---|---|
| scripts/tri-system-eval/driver.mjs | ce5372b72266a8c99edd2c1b0a91f555cf34e99e04033ff7918a9d022550659f | 67c76f86f5614d8c79ec49f4007391eebf94a6d932003036c997223c95ea8d66 | 48249 |
| scripts/tri-system-eval/driver.test.mjs | 9f0a32d28fb937224ab6aed5a00a31eb53f4d7ba031969c92f509af359bb97f2 | 8338cba9c2dd3eced9798635076243a50f6e75ca12ff221083eaba962bf256d6 | 54404 |

## 证据与实现决定

完整读取 P06 dispatch diagnosis.md/json、脱敏 window、J08 票/envelope、R5。另定向读取 P06 已存 RPC 61–64、67–74，确认实际 HookRun 形状及调用 ID；没有打开全局 config、凭据、无关项目/private/archives，也没有读取模型指令正文。一次 rg 对已授权 P06 JSON 输出了较长脱敏行并截断，未把截断输出声称为完整读；关键文件与事件随后有界读取。

P06 内层 `exec-7b6a3da4-df07-44c5-9fe3-b30d991ab9d4` 的 pre/post hook 与 checkpoint `exec-88a066f0-56ae-4e0d-aa4e-e9d120094bb6` 不同。脱敏诊断已证明前者经过 exec_command/unified_exec.open_session 后 filesystem/seatbelt 拒绝，path unknown；RPC 本身没有它的工具 item。不能据 hook 完成推断命令成功或八项权限检查通过。

最小改动如下：

1. 保存 preToolUse/postToolUse 的事件来源、原 hook run ID、thread/turn、sourcePath/source/status 和提取的 call ID。完整原通知仍在既有 rpc.jsonl；结果不复制 hook 输出正文。
2. 仅按 P06 实际已观察的 `事件前缀:displayOrder:sourcePath:callId` 规则提取。精确校验前缀，未知格式保留 null 与 UNRECOGNIZED_HOOK_ID，不用末尾冒号猜 ID。
3. 将经现有身份校验的 item ID/callback call ID 及其来源登记为投影；在清理后统一关联，允许 hook 先到、后到、重复和终态后到达。相同 thread/turn/call 的 pre/post 不重复收费；动态 callback/item 继续按既有 per-tool 两投影最大值计一次。不同 thread/turn 不会互相抵消缺项。
4. 未映射 hook 或已有动态 callback 覆盖缺口使试次 INVALID_RUN，追加 INCOMPLETE_TOOL_ACTION_OBSERVABILITY；先前错误和 engine 结果保留。纯候选漏交/语义失败的合法记录仍通过原 W22 对照。
5. 不使用 experimentalRawEvents、不依赖本机日志日常扫描，不增加工具权限或模型试验。现有可信 hook 已足以识别这次具体缺口；内部 raw API 的收益/全覆盖尚未证明，没有理由扩大读取。

## 结果字段与消费合同

- `visible_tool_actions`：保留现有可见操作计数；动态投影的计数基础在 `counting_basis` 明示，不声称未知投影必然一一对应。
- `tool_actions`：无已发现映射缺口时保留数值；存在缺口时为 **null**。下游不得把 null 转为 0 或套用 `<= cap` 得出达标。
- `tool_action_observability.mapping_complete`：仅表示已观察活动是否映射，不是全链证明。`hook_events`、`tool_projections`、`unmapped_hook_calls` 保留来源与关联依据。
- `whole_chain_coverage` 始终 UNKNOWN；`hard_limit_compliance` 仅在可见计数超过上限时 EXCEEDED，否则 UNKNOWN。现有可见工具上限仍即时触发停止，但隐藏操作不能被它硬限。
- `formal_comparison_eligible` 为 false：当前实现没有可证明全链覆盖的机制。正常映射的 fake trial 仍可 COMPLETED，这仅是执行记录终态；不等同正式可比较或质量通过。

P06 衍生反例的结果是 visible=1、tool_actions=null、一个去重后的未映射调用、INVALID_RUN；不会伪造“完整动作数2”，不会把外层 exec 包装和底层操作加算两次，也不从 hook 推断执行成功。真实诊断证明“至少一次命令尝试+checkpoint”的结论仍属于外部冻结证据，driver 不导入它伪造 RPC 结果。对未来出现的未知 wrapper/child 投影，本次不提供通用去重认证，全链继续 UNKNOWN。

## RED / GREEN 实际结果

| 验证 | 命令 | 结果 / 输出 chunk |
|---|---|---|
| 首次 RED（含 fixture 控制错误） | `node --test --test-name-pattern=W25 scripts/tri-system-eval/driver.test.mjs` | exit1；0/7 pass；993.378916ms；56fad1 |
| 修 fixture 后可信 RED，driver 尚未改 | 同上 | exit1；0/7 pass；1002.352125ms；13daa3 |
| 实现后 GREEN | 同上 | exit0；7/7 pass；1001.308542ms；3b9e47 |
| 完整 driver 模块 | `node --test scripts/tri-system-eval/driver.test.mjs` | exit0；49/49 pass；20286.731625ms；36b40b→e2f56f |
| 最后仅澄清 counting_basis 文字后的定向核验 | 定向命令同上 | exit0；7/7 pass；996.9385ms；434253 |

首次 RED 发现通用假 checkpoint 默认要求 fresh_context，不适合本组仅 inputs_delivered 的反例；仅调整 W25 fixture 为 ready_for_final 后重跑 RED。第二次 RED 的三项缺口用例实际仍输出 tool_actions=1，四项正常映射缺少新观测字段，均按预期失败。没有掩盖首轮失败或跳过测试。

新增七项：P06 两 ID 的缺项序列；同序列加 token 超限且取消确认/原错误保留；不识别的 hook 格式；正常 hook/item/callback；callback 与 item ID 不同时两者 hook 均可映射且只计一次；重复且终态后到达的 hook；native item 与重复 pre/post 映射。原有 42 项全部通过，含可见工具上限、绝对时限、子线程取消、进程组清理、权限 proof 门禁、候选错误与 engine INVALID 的区分。未重跑所有模块；W26 负责真实模块离线集成。

## 未知、成本与交接

全部测试为 fake transport/offline；0 真实模型/新 probe/联网/安装/权限扩张，0 Agent/新 thread，未直接消息其他 chat。当前模型与 effort 未改，P07 未释放。没有修 native open_session 的权限原因；具体拒绝路径、原命令参数/结果、Python/PyYAML 执行与权限八项、子代理全链成本、框架净价值仍未证实。J08 原 FAIL 与 P06 失败/成本保留。

保守人工工具调用计数：至报告写入约 38 个（含 functions wrapper 和 nested calls），加写后核验约 40；不是认证平台账单。shell 内多个程序若分别计费，估计仍在 50 内；精确平台动作/token/货币成本 UNKNOWN，不记 0。此 turn 起止见上；约数分钟，未接近45分钟/90动作限制。

root 按最终 hash 单一收取，由 W26 检查跨模块输出（尤其 tool_actions nullable），再做非作者复审。最终仍欠统一的可信比较和价值裁决；本修复不替代这些义务，也不声称三模块生产开发已经完成。

## 冻结输入身份

- R5：`5c0f67466637b74e95f337ca2a1dd922b7902c2bd688f6de63db18fc1ee6de50`
- J08 md：`88944193bf1e1fcea7c6ea45330e2a9cb6dedfdda9743435b61de156a9de931d`
- J08 envelope：`984a72947fd877ee7197c8ac8937379abaa60604706e66aae838abd177fbcd97`
- diagnosis.md：`42ba61a21dde9affc282ac80b7bdcb2f35c9faf8744b6e87f352517da09282c8`
- diagnosis.json：`562f5c3ab4b9fc437c82eee994c188907b901ebf523fd286c521412e16ba50c6`
- window-safe.json：`7229aa71bf680caae650cc687fdde075ee63ce66487b8e7a8c20dd9519f7cb98`

<!-- FILE_END: u007-orchestration-observability-repair-report.md -->
