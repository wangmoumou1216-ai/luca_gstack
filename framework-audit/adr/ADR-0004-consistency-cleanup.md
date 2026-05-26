# ADR-0004: 一致性碎片清理

状态: 提议 (P0)

## 背景
分散的小型不一致，单个低危但累积侵蚀可信度，且让 key-based join / glob 发现静默失效：
- A1: `compare` 出现在 routing-map(:71)/commands/CLAUDE.md 表，但 **input-modes.yaml 无条目** → 任何 I/O 契约检查对它静默 no-op。
- A1: `superpowers brainstorming` 有 3 种标识形态：`superpowers_brainstorming`(routing-map:31)、`superpowers-brainstorming`(input-modes:55, workflow-graph:18/30)、`superpowers:brainstorming`(CLAUDE.md:266)。任何按 key join 会断。
- A4: 品牌色 SF-001 在 promoted-facts.yaml(#F5F5F5/#333333) 与 CLAUDE.md fallback(#EFF1F3/#181c25) 不一致；B 报告另见 #FF8000 散落 26 文件。
- A5: 输出路径 `docs/evals` vs `docs/evaluation` 在 AGENTS.md 内部与 SKILL.md/skill-invariants/CLAUDE.md 间矛盾 → handoff glob 可能静默失败。
- A4: `get_memory.py:154` 硬编码 `load_episodic(3)`，把 5 个真实 episode 报成 "3 sessions"。

## 决策
做，逐项对齐到单一权威值：
1. 给 input-modes.yaml 补 `compare` 条目。
2. 全仓统一 superpowers 标识为一种形态（建议 `superpowers:brainstorming`，与 Skill tool 命名一致）。
3. 品牌色定一处权威（建议 promoted-facts.yaml 为准），CLAUDE.md fallback 同步；#FF8000 等 token 收敛到 brand-tokens.md 引用。
4. 输出路径统一为 `docs/evaluation/`（与 skill-invariants 一致），改 CLAUDE.md 树 + AGENTS.md。
5. `get_memory.py` 的 episodic 上限改为读实际数或参数化。

## 理由
ROI：影响=2，可行=5，成本=1。Score 10。低成本、消除静默失效与误报。

## 后果
- 影响文件：input-modes.yaml、routing-map/CLAUDE.md（superpowers）、promoted-facts.yaml/CLAUDE.md（色值）、CLAUDE.md/AGENTS.md（路径）、get_memory.py。
- 风险：低。
- 验证：`check:routing-map` 扩展为校验 input-modes 全覆盖；`grep -rn "superpowers"` 仅一种形态；`get_memory.py --summary` 报告正确 episode 数。
