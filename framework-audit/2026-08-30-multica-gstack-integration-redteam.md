# Multica × luca_gstack 对接计划红队质疑

> 评审对象：`/Users/luca/.claude/plans/multica-agent-multica-multica-luca-app-fluffy-penguin.md`
>
> 场景：luca_gstack 框架治理；不写 workflow-state。

## 成功定义

1. “与 luca app 框架完全一致”是否有逐能力矩阵证明，而不是只用 hook 日志和 memory summary 代替 routing、human gate、person memory、observability 与写回语义？如果成立，当前验收会把部分接线误报为完整等价。
2. “luca 只维护一个仓库”是否明确把已 commit 且 push 的 `origin/main` 定义为唯一发布边界？如果没有，未提交工作树、两个既有检出和第三检出之间仍会产生不可判定真值。

## 自动同步与任务生命周期

3. 已确认的 custom runtime wrapper 是否一定在 Multica 完成 instruction/skill 注入后、真实 provider 启动前执行？如果不是，任何 pre-provider 完整性断言都可能检查错时间点。
4. wrapper 自身若位于待 fast-forward 的检出中，更新正在执行的入口或其延迟加载模块会不会形成自更新竞态？如果会，首个命中新版本的任务可能由新旧两套同步逻辑共同驱动。
5. 仅用 `fetch + ff-only` 是否真的保留 last-known-good，还是候选提交一旦快进后验收失败就把固定副本留在坏版本？如果是，计划宣称的坏更新自动隔离并未实现。
6. Multica 的目录串行锁是否覆盖 wrapper 的完整 preflight、provider 与 postflight，且 daemon 崩溃后不会遗留错误锁所有权？如果没有，双 agent 或恢复任务仍可能并发操作同一分支。
7. 任务结束时 dirty/ahead/diverged 的恢复责任是否有明确 owner、终态和时限？如果没有，“保留现场”会逐步把专用副本变成永久不可接单状态。

## M1：契约文件完整性

8. 空 workdir 生成 `AGENTS.md` 的旧证据是否被错误外推为当前 v0.4.32 会覆盖 in-place 已有文件？如果是，风险根因和修复优先级都建立在过期事实上。
9. 为什么旧计划只在任务后检查并恢复 `AGENTS.md`，而不是在 provider 读取任何契约前比较 `task_sha` blob？如果风险真实发生，旧 session 已经受污染，事后恢复无法挽救本次决策。
10. 只保护 `AGENTS.md` 是否漏掉 `CLAUDE.md`、settings、hooks、commands 与 skill symlink 等同等级执行入口？如果漏掉，攻击面只是从一个文件转移到另一个文件。

## M2：会话项目 pin

11. 对框架/meta 任务而言 `NO_PIN` 本来就是设计正确态，计划是否把正确拒绝误写成通用故障？如果是，可能为了消除告警而削弱 project-scope-guard。
12. 在 issue 正文写 `scope/project` 是否已证明能完成现有 `prepareProjectSwitch → project.sh → SWITCH_ONLY 结束 → 下一用户回合恢复` 的完整事务？如果没有，envelope 只是提示文本，不是 session pin。
13. Multica 续跑同一 issue 时是否保证恢复同一个 provider session_id，并保留该 session 的 pin？如果不保证，下一个回合仍会回到 `NO_PIN` 或绑定到错误 identity。

## M3：Skill 注入

14. “Multica 不覆盖同名 skill、任务后清理”是否足以排除任务期间的语义污染和 daemon 崩溃后的残留？如果不是，Git 最终干净不能证明 agent 当时只使用了 canonical skills。
15. 用 `.gitignore` 隐藏注入目录是否会让未知 skill 从 Git 审计面消失却继续被 Claude/Codex 加载？如果会，该兜底会降低而不是提高可检测性。
16. Claude 的 repo-relative 注入与 Codex 的 per-task `CODEX_HOME` 是否被当成同一种机制处理？如果是，所谓双 harness parity 会掩盖两端完全不同的污染与信任边界。

## Stop、自成长与记忆

17. 现有 Stop hook 已有 `stop_hook_active + marker + kill-switch` 三重防循环，计划是否在没有真实 Multica 失败证据前重写一个已受测试保护的状态机？如果是，会为假设风险引入新的退出语义回归。
18. Multica 是否真实转发 `stop_hook_active`、session_id 与 Stop 的 `decision:block` 续跑语义？如果没有，单轮 `claude -p` 通过不能证明多轮任务有界终止。
19. `MEMORY_ROOT` 只证明 episodic/semantic 定向是否被误写成 person memory 与 observability 也完全共享？如果是，第三检出会产生新的反馈规则与个人记忆孤岛。

## 信任、供应链与验收

20. 固定路径的一次性 project/hook trust 是否意味着以后 `origin/main` 中任何 hook 实现变更都会自动获得本机代码执行权？如果是，发布源被攻破时自动同步会成为无人值守供应链执行器。
21. 计划是否把每项断言区分为 VERIFIED、INFERRED 与必须真实 Multica canary 才能确认？如果没有，“技术可行性无悬念”的结论超出了现有证据。
22. 回滚是否只描述“解绑 agent/profile/resource”，却没有证明正在运行的 task、未推送 commit、memory 写回与 trust 配置能恢复到一致状态？如果是，回滚只是停机，不是恢复。

<!-- FILE_END: framework-audit/2026-08-30-multica-gstack-integration-redteam.md -->
