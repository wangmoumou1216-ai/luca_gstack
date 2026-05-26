# Framework Audit — Checkpoint

Last updated: 2026-05-26 (Phase 1 complete)

## 已完成 ✅
- **Phase 1 内部体检（A1-A5）** — 5 个 general-purpose subagent 并行，诊断卡全部落盘：
  - ✅ `diagnostics/A1-skill-os-routing.md`
  - ✅ `diagnostics/A2-agent-orchestration.md`
  - ✅ `diagnostics/A3-hooks-scripts.md`
  - ✅ `diagnostics/A4-memory-learning-loop.md`
  - ✅ `diagnostics/A5-context-governance.md`

## 关键发现（跨子系统根因，Phase 3 综合用）
1. **route-guard substring 匹配** [HIGH] — `text.includes()`（route-guard.mjs:227）导致误判；A3 实证复现了本 session 启动的 `PLAN CHECK /deepresearch` 误报。根因级。
2. **学习闭环不自转** [HIGH] — session-sync.mjs:65-72 只打印命令不执行；晋升需手动 `--promote-ready`。两端都是手动 → Hermes 死因未修复只是搬家。自成长净产出=2 facts。
3. **无单一真相源** — skill 列表手维护在 5 个配置面（routing-map/input-modes/workflow-graph/commands/CLAUDE.md 表）；#FF8000 在 26 文件；Plan Agent 4 条件在 3 处且已分叉。
4. **空转/从不触发设计** — LUCA_SPAWNED 复制进 18+ 文件但无人 set；agent 规格 22-30% 是 paper-only（hierarchical 模式 + Worker Group）。
5. **危险死代码** — active SKILL.md:258-273 仍指示运行已删除的 hermes 脚本（照做会 FileNotFound）；orphan Python 脚本 fix_long_lines/repair_backticks。
6. **AGENTS.md↔CLAUDE.md 路由漂移** [HIGH] — Codex 和 Claude 会对同一请求做不同路由。
7. **每 session 指令负载** ~5.8-6.1K tokens（用户开口前），触发 skill 后 ~8.1-8.4K。
8. **一致性碎片** — compare 缺 input-modes、superpowers 3 种命名、品牌色 promoted-facts vs CLAUDE.md 不一致、docs/evals vs docs/evaluation 路径矛盾。

## 进行中 🔄
- Phase 2：B1-B3 源码级开源对标调研（即将启动）。

## 待执行
- Phase 2：B1 编排框架 / B2 记忆系统 / B3 Claude Code skill 生态。
- Phase 3：缺口×解法交叉表 + ROI 排序 + 写 ADR 到 framework-audit/adr/。

## 恢复指令
若 session 中断：读 framework-audit/diagnostics/*.md（已落盘的 Phase 1 全部证据），
再读本 checkpoint 的"关键发现"，从 Phase 2 或 Phase 3 继续。不要重跑 Phase 1。
