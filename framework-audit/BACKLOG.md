# luca_gstack 标杆对标 — 延后项 BACKLOG

> 来源：2026-06-01 标杆对标报告（`luca_gstack-标杆对标报告.md`）。
> 这些是经红队 + 对抗辩论确认 **gap 真实、但现在做会变死代码/虚假信心/低价值** 的项。
> 不是否决，是 measure-first 延后。**每条带触发条件——条件满足即应执行，别忘。**

## 已落地（本轮已做，不在此列）
#16 复杂度回归哨兵、#6 Phase5.1 反向 PRD 源、#3' 红线节填实、#7 不确定性跨链承载、#14 TL;DR 漂移哨兵。
（全部经行为级 A/B 验证真改变 LLM 执行行为；#16/#14 实跑脚本，#7/#6 双臂 A/B 旧丢新带。）

## 已回退（行为级证伪）

### #1 — tech-spec Phase 2.5 反抽象自检
- **为何回退**：行为级 A/B（opus + 默认 Sonnet 各 2 试）显示，**不加 2.5 的旧版也 2/2 把无 MUST 支撑的投机模块标了**——旧 Phase 2.2/2.3 本就要求「每个组件标注来源（哪条 PRD 需求驱动）」，模型已在反向溯源。2.5 唯一可测的额外效果是过度标记一个合理的观测组件（LatencyMonitor），偏负面。违背 Simplicity-First（不加不 demonstrably 改变行为的指令）。
- **🔔 触发条件**：若未来 skill 默认下沉到更弱模型（haiku 级）且观测到投机模块漏标，再重测 2.5 是否有价值。
- **未测维度**：本次只测「抓已存在的投机模块」，未测「阻止模型从零生成投机模块」（难测）；如该路径出现膨胀问题再评估。

---

## 延后项（带触发条件）

### #2 — Bi-temporal supersedes 读侧一致性过滤
- **真实缺口**：写侧 `consolidate_memory.py:388` 已解析 `valid_until` / `supersedes`，读侧 `get_memory.py` / `search_memory.py` 的 `parse_semantic_facts()` 不消费 → 已作废/过期的旧事实仍会被检索出来污染当前判断。
- **为何延后**：当前 `promoted-facts.yaml` 里 **0 条** 事实带这两个字段。现在加 ~20 行读侧过滤 = 未经测试的死代码，无法验证真生效。
- **🔔 触发条件**：晋升流程**第一次真正写入** `supersedes` 或 `valid_until`（即出现第一条被取代的事实）→ 立即补读侧过滤 + 用该真实数据做一次过滤回归测试。
- **落地点**：`memory/scripts/get_memory.py` / `search_memory.py` 的 `parse_semantic_facts()`。effort ~20 行 + 1 测试。

### #4 — framework/ PreToolUse 硬阻断
- **真实缺口**：`framework/` 只读目前只有 PostToolUse 警告（事后），无 PreToolUse deny（事前硬阻断）。
- **为何延后**：被防事件 **全历史 0 次命中**（git log 显示 framework/ 仅 1 次 baseline commit，0 次只读警告触发；html-prototype 复制母版而非原地改）。verify.sh + git 已是真正兜底层。防的是从未发生的事。
- **🔔 触发条件**：`.claude/observability/run-log.jsonl` 或 post-edit 警告**首次出现 framework/ 误写命中** → 再升级为 PreToolUse deny，并保留显式 escape（母版正当维护不被误伤）。
- **落地点**：新增 PreToolUse hook（~30 行）。

### #8 — 失败 Phase 重跑前产物归档
- **真实缺口**：P2-V 序号化是**纯文档约定、零代码实现**（全仓 grep P2-V 只命中 skill-invariants 定义自身）；brainstorm 等 file-name 型 skill 写固定路径，同日重跑直接覆盖上一版产物。
- **为何延后**：git working tree 已兜底实际损失（外部项目均 git 仓，失败产物可 stash/diff 找回）。新增 `phase-N.attempt-N` 目录约定会与 history.sh 扫描产生命名歧义。
- **🔔 触发条件**：真出现一次「重跑覆盖了想对比的失败产物、git 也没兜住」→ 再做最小版：orchestrator 重试前对失败产物 `git stash` 或加 `-attempt-N` 后缀（复用已有机制，不新建目录树）。
- **落地点**：`.claude/agents/orchestrator.md` 重试分支。

### #17 — 记忆治理积压低频自动提醒
- **真实缺口**：candidates/review 队列积压无主动提醒，靠人记得手动跑脚本。
- **为何延后**：队列实测近空（1 stale / 0 其余）；session-restore 已发 5 个启动 stdout 块，第 6 个会饱和提醒通道、淹没承重的 Project Gate 提醒。且原方案依赖**已否决的 #12**（自动抽取候选记忆）。
- **🔔 触发条件**：治理队列积压 **≥ 某非空阈值（如 ≥5 条 pending）** 且持续 → 再加**单行**提醒，并设非空阈值（队列 0 项时静默，不占提醒通道）。
- **落地点**：`scripts/session-restore.mjs`。effort ~1 行 + 阈值判断。

---

## 否决项（确认不做，仅备查）
#5 delta-spec（8 项目 tech-spec 仅 1 次产出、re-spec 0 次，roam-cards 20+ 场景B commit 全零 spec）、#9 路由准确率虚荣指标、#10 解冻 eval（git 显式冻结 deb2ef4）、#11 失败自动回灌（违 human-in-the-loop）、#12 自动抽取候选记忆（无抽取源）、#13 矩阵↔断言闸（双写漂移前提假）、#15 OnFailAction（删人工控制点）。详见报告 §3.3。

---

## 🔔 记忆 candidate 复核提醒

- **≥ 2026-06-08**（满 7 天冷却）复核两条 skill-rule candidate：`SC-20260601-001`（红队 over-kill → 多轮对抗辩论）、`SC-20260601-002`（改 skill 指令须行为级 A/B）。
- 复核动作：跑 `python3 memory/scripts/consolidate_memory.py --json --dry-run` 看是否进 promotion_ready；若这两个模式在后续 session 已被复用确认且仍成立，标 stable + `review_candidates.py --promote --reviewer luca` 晋升；否则继续留候选或剔除。
- 现状：两条均 `pending_review`，被 7 天冷却门正确挡住（不绕过）。

<!-- FILE_END: BACKLOG -->
