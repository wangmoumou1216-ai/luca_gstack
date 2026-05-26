---
name: feedback-routing-complexity
description: 复杂请求应路由到 Plan Agent 而非单个 skill — 用户反馈的路由层级缺失问题及修复
metadata:
  type: feedback
---

route-guard 必须在 skill 路由之前先做复杂度检测。复杂度分 ≥ 6 时输出 PLAN
MODE，禁止路由到单个 skill。

**Why:** 用户说"我想做一个功能"触发了 /idea（单 skill），
但实际请求涉及多系统集成、整体规划意图、长描述等复杂度信号，
应该路由到 Plan Agent。关键词匹配是平面的，无法感知语义复杂度。

**How to apply:** 
- 收到 route-guard 输出 `PLAN MODE` 时：读 plan-agent.md，输出 Phase 计划，
  等用户确认后进入 Orchestrator
- 收到多候选 `STOP` 时：向用户列出候选组合，不自行判断
- 收到单一高置信命中时：直接调用 skill
- 禁止忽略 PLAN MODE 直接走 skill 路由

[[feedback-skill-routing]]
