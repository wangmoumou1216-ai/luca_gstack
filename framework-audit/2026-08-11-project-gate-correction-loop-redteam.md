# Project Gate 与纠错闭环红队质疑 — 2026-08-11

## 评审对象

- 首次 CRM Agent 调研请求：本 session 无 project pin，但 route-guard 输出高置信 `/deepresearch`，随后 project-scope-guard 才以“本 session 未绑定任何项目”拒绝项目作用域命令。
- 用户连续指出上述错误后：Agent 只解释规则，没有在继续对话前执行 correction-attribution、observation 与路由 fixture 留痕。

## 已复现事实

- 同一原始请求在共享 `docs` 软链存在时得到 `SINGLE_SKILL /deepresearch` 且 `hasActiveProject: true`；把 `ROUTE_GUARD_CURRENT_PROJECT` 强制为空后得到 `PROJECT_STOP / choose_new_or_existing`。
- route-guard 的决策阶段从共享 `docs` 软链读取 `currentProject`；session pin 的读取发生在决策完成后的粘性处理层。
- project-scope-guard 对项目作用域操作只认 `.session-project-<sid>` pin；无 pin 时 Bash 被拒。
- correction-attribution 要求用户中途纠正后、继续任务前完成归因并披露；session-sync 不读取 prompt/transcript，只以 `edit >= 1` 或 `tool >= 8` 判定是否触发提取。
- `test-route-guard` 当前 68/68 通过，但测试基线固定注入 `ROUTE_GUARD_CURRENT_PROJECT`，且决策 helper 不传 `session_id`。

## 红队质疑

1. **所谓“pin 是唯一真值”是否只在写保护链成立，而路由决策仍把共享软链当成项目真值？** 如果成立，Project Gate 会在最需要拦截时被旧 session/并行 session 的展示态静默绕过。
2. **route-guard 与 project-scope-guard 是否组成了互相矛盾的双真值系统？** 如果成立，同一回合会先告诉 Agent“已有激活项目，可以进 skill”，再在工具层告诉它“没有绑定项目”，用户只能看到框架自相矛盾。
3. **这个分裂是否不只影响写入，还会污染读取和推理上下文？** 如果成立，无 pin 的 Read/Grep/Glob 放行策略可能让 Agent读取共享软链指向的别人的项目内容，再带着错误上下文回答当前用户。
4. **“Project Gate first”是否实际上只是文档优先级，而不是 route-guard 的真实执行优先级？** 如果成立，最高优先级规则仍依赖模型在高置信 skill hint 之后自行翻案，机械门禁并未兑现。
5. **现有 pin 测试是否只验证“不会自动写 pin”，却没有验证“无 pin 时决策也必须视为无激活项目”？** 如果成立，测试把状态安全与决策正确性拆开后只守住前者，68/68 全绿不能证明 Project Gate 正确。
6. **用户纠正的“必须即时归因”是否只有散文协议，没有任何 UserPromptSubmit 级触发器？** 如果成立，框架把最强提取信号①交给模型记忆，而不是自己宣称的确定性机制。
7. **session-sync 的 workload gate 是否把“纯对话但明确纠正”错误等同于 trivial session？** 如果成立，`edit/tool` 计数与“是否发生高价值纠正”不是同一变量，Stop hook 会稳定漏掉本次这种问题。
8. **observability 规则只在命中某个 skill 后注入，是否让“路由本身出错”恰好没有规则入口？** 如果成立，路由失败会导致治理规则也不可达，形成自我遮蔽。
9. **Agent 已完整拿到 AGENTS/CLAUDE 规则却仍连续两次只解释不执行，是否说明当前协议缺少一个明确的 correction gate 状态？** 如果成立，单靠加粗“必须”不会提高可靠性，只会增加事后可归责文本。
10. **当前验证套件在 Codex 环境下 `test-hooks` 因 ambient harness env 失去 hermeticity，`verify-codex-wiring` 因而报 S10 失败，是否意味着跨 harness 回归证据本身不稳定？** 如果成立，即使修复两处根因，也可能再次出现“测试全绿/全红但生产行为相反”的假证据。

<!-- FILE_END: framework-audit/2026-08-11-project-gate-correction-loop-redteam.md -->
