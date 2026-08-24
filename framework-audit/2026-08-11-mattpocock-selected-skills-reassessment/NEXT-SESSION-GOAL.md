# 下一执行 Session 的 `/goal` 指令

复制下面整段，作为新的执行 session 的第一条任务指令：

```text
/goal 在 canonical repo `/Users/luca/Desktop/项目/muse/lucagstack` 执行 mattpocock/skills Cycle 2 的最终变更令 `MPC2-CO-20260811-001`。这不是重新调研，也不是重写原计划；它是正在执行的 Cycle 2 计划的 scoped delta。

固定读序：
1. 完整读取 repo `AGENTS.md`、`CLAUDE.md` 和 mandatory startup context。
2. 完整读取 `framework-audit/2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md`，核验是否已有真实 `RULE_EXECUTION_VERIFIED` receipt。
3. 完整读取 `framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md` 与 `FINAL-EXECUTION-PLAN.md`。
4. 完整读取 `framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/FINAL-CHANGE-ORDER.md` 和 `execution-delta.json`；新旧冲突仅在 change-map 列出的范围内以变更令为准，其余原计划义务保持。
5. 运行 `node framework-audit/2026-08-11-mattpocock-selected-skills-reassessment/tools/verify-change-order.mjs`；未输出唯一 `FINAL_CHANGE_ORDER_GATE_PASS` 不得实施。

前置纪律：若 Rule Execution 尚未达到 `RULE_EXECUTION_VERIFIED`，只报告 `BLOCKED_BY_REX_DELTA`，不要在 project transaction、patch parser、native agents、human gate、activation journal 或与当前 dirty hunk 重叠的面上抢跑。不要重开红队，不要重新评估 upstream，除非 upstream HEAD 不再是 `84fdeffd12f2ee307994d1eb6feb48173b6e0502` 或 Luca 相关面已漂移；若漂移，先产精确 delta，不静默套旧方案。

解锁后先执行 CO-01：重算 current HEAD、owner matrix、package allowlist、package SHA 和 G-PACKAGE descriptor。然后按依赖执行 CO-02..CO-11，并为每个工作包配置独立验证。新增共享一级 skill 只能是 `code-review` 和 `domain-modeling`；wayfinder、to-spec、to-tickets、implement、handoff、writing-for-agents 必须增强现有 Plan Agent/tech-spec/task-plan/Orchestrator/handoff protocol/skill-authoring 真值，禁止复制第二套 SSOT。

新增 optional `engineering-delivery` preset：复杂任务条件性 wayfinder → tech-spec synthesis → task-plan/stable IDs → optional ticket projection → implement approved frontier → code-review。只有用户主动选择 workflow 才强制链路；standalone 不得被 graph gate 阻塞。ticket 永远只是 pinned project docs 的 projection，先 local Markdown pilot；无 CAS/lease/live proof 不得做 autonomous multi-session provider sync。

安全红线：不整包安装 upstream；不自动 commit/push；resolver 不自动 abort/stage/commit/continue；不把 tracker 设为 canonical；不覆盖 unrelated dirty/untracked；不修改 framework/ 或产品 docs；所有共享真身必须 Claude/Codex 同 tree，所有 direct/semantic/internal/workflow/negative edge 必须有 fresh-session live proof。

完成条件：原 Cycle 2 未覆盖义务全部保持，321/321 与 2,568/2,568 继续通过；DASSERT-001..012 全部 PASS；CO-01..CO-11 有 owner、独立测试、receipt；fresh Claude/Codex reachability 通过；唯一完成 token 为 `MPC2_CHANGE_ORDER_INTEGRATED`。任何 blocking assertion 失败即停，同根因三次失败报告 BLOCKED，不得把静态文件存在、self-report 或单 harness 结果冒充完成。
```

<!-- FILE_END: NEXT-SESSION-GOAL.md -->
