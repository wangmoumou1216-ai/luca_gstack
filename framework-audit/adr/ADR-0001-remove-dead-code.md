# ADR-0001: 清除死代码与悬空引用

状态: 提议 (P0) — 经辩论修订

> ⚠️ 辩论修订：原"FileNotFound / HIGH"系假阳性——SKILL.md:258/273 是"已废弃"注释而非待运行命令。降为 **LOW**，仅保留 orphan 脚本删除 + SKILL.md:263-264 悬空 arg 片段修复。详见 `../DEBATE-CONCLUSION.md`。

## 背景
- A4: `.claude/skills/office/SKILL.md:258-273` 与 `.agents/skills/office/SKILL.md:198-222` 仍指示 agent 运行 `.claude/hermes/scripts/propose_growth.py` / `get_growth_rules.py`——这些脚本已随 Hermes 废弃删除。**照做会 FileNotFound**，是会主动误导执行的活引用，不只是死注释。
- A4: `.claude/hermes/` 已废弃（promoted-rules.yaml 0 记录，scripts 空），但目录仍在。
- A3: `scripts/fix_long_lines.py`、`scripts/repair_backticks.py`（~17KB）互相引用，无 npm/CI/doc 入口（grep 确认 0 外部引用）。
- A4: `memory/scripts/mine_blockers.py`（118 行）0 引用；`record_eval.py`/`collect_eval.py` 仅文档提及、从未接线，且二者写到不同文件。

## 决策
做。分两类处理：
1. **悬空引用（最高优先）**：从两份 active SKILL.md 删除 hermes 脚本调用段，改为指向当前 `memory/scripts/propose_semantic.py --domain skill-rule` 流程。
2. **死目录/脚本**：删除 `.claude/hermes/`；删除 orphan 的 fix_long_lines.py / repair_backticks.py / mine_blockers.py，或若确有价值则接线进 npm + 文档。record_eval/collect_eval 二选一统一到同一 eval 文件（与 ADR-0006 协同）。

## 理由
ROI 三维：影响=3（修正会误导 agent 的活引用 + 降复杂度），可行=5（纯删除/改指针），成本=1。Score 15，最高。属"减法优先"。

## 后果
- 影响文件：2 份 SKILL.md、`.claude/hermes/`、3 个 orphan 脚本。
- 风险：低。删除前 grep 确认无其它引用（A3/A4 已部分确认，实施时复核一次）。
- 验证：`grep -rn "hermes/scripts" .claude .agents` 应为 0；`bash scripts/verify.sh` 通过；按 SKILL.md 指引跑一遍 skill-rule 提案不再 FileNotFound。
