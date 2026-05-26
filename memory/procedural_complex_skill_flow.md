---
name: complex-skill-flow
description: 复杂需求对应重型 skill 的判断原则 — Plan Agent 自主编排，不硬编码顺序
metadata:
  type: feedback
---

Plan Agent 应自主编排，用户给的是判断依据，不是固定脚本。

**Why:** 用户明确说明：不要做死，要根据实际需求自主决定用哪些 skill、什么顺序。

**判断依据（哪些是重型 skill）：**
- deepresearch：信息密集型需求，非交互，走 subagent
- brainstorm：需求模糊需要共同推敲，交互型，走 main_agent
- ux-research：需要系统性 UX/竞品研究，非交互，走 subagent
- ux-brainstorm：需要共同探索 UX 方案，交互型，走 main_agent
- design-brief：有方案需落成交互规格，交互型，走 main_agent
- magicpath：产出 React 原型，使用前先询问是否可用

**How to apply:**
- 需求越复杂、越模糊 → 越需要重型 skill
- 非交互型 → subagent（保护 context）
- 交互型 → main_agent（需要用户实时参与）
- 具体哪几个 skill、什么顺序，Plan Agent 根据实际需求自主判断，不套固定模板
