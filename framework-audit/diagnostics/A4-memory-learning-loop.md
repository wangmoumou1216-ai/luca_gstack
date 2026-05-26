## 记忆 & 学习闭环 诊断

### 现状摘要

luca_gstack 的记忆层由三部分组成：`memory/`（三层记忆：episodic / semantic / 已并入的 procedural）、`.claude/observability/`（观察→短规则）、`.claude/hermes/`（已于 2026-05-20 显式废弃）。设计目标是一条 observe → candidate → review → promote 的自成长闭环，模仿 Hermes 的 Observe→Evaluate→Commit 管道。脚本工程质量较高（容错 YAML 解析、dry-run 安全默认、归档机制、单元测试），且闭环在 2026-05-23 确实跑通过 2 次（O-20260523-001 → SC-20260523-002 → review → promote）。但闭环的**两端都未自动化**：观察写入靠人手敲命令（hook 只打印提示），晋升靠人手运行 `--promote-ready` 治理命令。当前候选队列、review queue、run-log、eval-log 全部处于停滞/空态，数据极度稀疏（4 observations / 1 active candidate / 2 reviews / 10 facts / 5 episodes / 0 evals），证明闭环长期处于"建好但不转"的状态。

### 优点（公允）

1. **晋升门禁设计严谨且确实生效**：`consolidate_memory.py:293-317` 的 `promotion_ready` 强制要求 `proposed_stable=true` + `confidence=high` + evidence/scope/reviewer 三字段齐全 + 未重复未冲突，并自带 duplicate/conflict/stale 检测（极性核心 NEGATIVE/POSITIVE marker 对冲，:204-270）。reviews.jsonl 有 2 条真实 promote 记录，证明门禁链路可用而非纸面。
2. **安全默认正确**：所有写操作（promote/archive）必须显式 flag 且 `not dry-run`（:570），普通 session 启动只跑 `--summary`，符合 CLAUDE.md "稳定事实不得直接写 promoted-facts.yaml" 的治理约束。
3. **懒加载 context 工程到位**：session-restore 只注入 `get_memory.py --summary`（约 3 行，session-restore.mjs:70-73），长文件（observations / run-log / index）全部标为 cold storage 不默认读取，符合 context 预算原则。
4. **Hermes 废弃处理干净**：README 诚实记录"管道从未被触发"，promoted-rules.yaml 空且标 DEPRECATED，替代路径（semantic domain:skill-rule）已落地并真实使用（10 facts 中 4 条为 skill-rule）。
5. **search/容错健壮**：`consolidate_memory.py` 在无 PyYAML 时有手写 YAML fallback 解析器（:97-121），单条异常不致整层失败；check_memory_health 通过（PASS）。

### 问题清单

- **[严重度:高] [类型:健壮性/一致性] 闭环两端均未自动化，self-growth 实际不自转。** 观察写入端：session-sync.mjs:65-72 只 `process.stdout.write` 打印 `append_episode` / `propose_semantic` 命令文本，**不执行**；候选生成无任何自动路径。晋升端：`consolidate_memory.py:573` 的 promote 需人手运行 `--promote-ready`。这正是 Hermes README:8 自我诊断的同一个"启动成本陷阱"——废弃 Hermes 后换了存储位置，但**未解决根因**（无自动候选生成）。

- **[严重度:高] [类型:健壮性/复杂度] eval 子系统对 >1 skill 完全空转。** `memory/evals/` 仅 html-prototype 一个 skill 目录，其 `pairs.jsonl` 为 **0 字节**（空文件，2026-05-20 创建后从未写入）。README/consolidate/search 全部引用 `evals/eval-log.jsonl`，但该文件**根本不存在**（`find` 确认无）。`record_eval.py:60` 写 eval-log.jsonl，`collect_eval.py:85` 写 pairs.jsonl——两个脚本写**不同文件**，且 record_eval 只被 orchestrator.md:108 文档提及、`collect_eval` 无任何调用者。eval 闭环从未产生过一条数据。

- **[严重度:中] [类型:死代码] 多个脚本零运行时调用者。** `mine_blockers.py`（118 行）被引用 **0 处**（grep 全仓 0）；`record_eval.py` / `collect_eval.py` 仅文档提及，无 hook/npm/scripts 触发（已验证 `NOT wired`）；`review_candidates.py`（172 行）仅出现在 test-hooks.mjs。约 350+ 行脚本属事实死代码，依赖人工记得手敲。

- **[严重度:中] [类型:死代码/一致性] 活跃 SKILL.md 仍指向已删除的 Hermes 脚本。** `.claude/skills/office/SKILL.md:258` 提到 `propose_growth.py`，:267-273 给出 `get_growth_rules.py <skill> <scene>` 命令，但 `.claude/hermes/scripts/` 目录**为空**（已验证）。若 agent 照该 SKILL.md 执行会命中 FileNotFound。`.agents/skills/office/SKILL.md:198-222` 同样残留 `.claude/hermes/scripts/propose_growth.py` / `review_growth.py` 引用。

- **[严重度:中] [类型:健壮性] run-log.jsonl 永远为空，pending-extraction 自承认。** `.claude/observability/run-log.jsonl` = **0 行**；`append_run_log.py`（34 行）无任何调用者。pending-extraction.md:7 直接写"未读取 run-log"。README:7 宣称"one line per skill run"的承诺从未兑现，failing_eval_patterns 等依赖它的治理功能无输入。

- **[严重度:低] [类型:一致性] summary 显示计数与实际不符。** `get_memory.py:154` 硬编码 `load_episodic(3)`，无论 index.jsonl 实有 5 条都只显示 "3 episodic sessions"，掩盖真实规模（轻微误导但无害）。

- **[严重度:低] [类型:context成本/一致性] 静态 fallback 与 promoted-facts 漂移。** SF-001 在 promoted-facts.yaml 写"背景灰 #F5F5F5、文字色 #333333"，而 CLAUDE.md 速查节 SF-001 写"背景色 #EFF1F3、文字色 #181c25"——两处品牌色不一致，`sync_claude_fallback`（:399）仅在 promote 时单向追加、不校验既有差异，EP-20260520-004 的 next_risk 已预警此 drift 风险。

### 量化指标

| 闭环阶段 | 数据源 | 实际计数 |
|---|---|---|
| observe（观察） | observations.jsonl | **4** 条（最新 2026-05-25） |
| run-log | run-log.jsonl | **0** 行（空） |
| candidate（候选，活跃） | candidates.jsonl | **1** 条（SC-20260517-001，dormant） |
| candidate（已归档） | archive/candidates-2026.jsonl | 2 条 |
| review（评审） | reviews.jsonl | **2** 条（均 promoted，均同日 2026-05-23） |
| promote（晋升） | promoted-facts.yaml | **10** 条 facts（SF-001~005 手建初始 + 5 条 SC-*） |
| episodes（情景） | index.jsonl | **5** 条（summary 只显示 3） |
| evals | evals/*/pairs.jsonl | **0**（仅 html-prototype 1 个 skill，文件 0 字节）；eval-log.jsonl 不存在 |
| observability rules | rules.yaml | 3 条 active |
| Hermes | promoted-rules.yaml | **0**（DEPRECATED） |

实时治理队列（live dry-run）：duplicate=0, conflicts=0, stale=0, **promotion_ready=0**, noisy_episodes=0, failing_eval_patterns=0 → 队列完全空转，无待处理候选。

脚本规模：memory/scripts 8 个（get/search/append_episode/propose_semantic/consolidate/record_eval/mine_blockers/check_memory_health + review_candidates）+ evals/scripts 1（collect_eval）+ observability/scripts 3 = **12 个脚本，约 2270 行**。被运行时自动调用的仅 **3 个**：get_memory（session-restore）、append_episode + propose_semantic（session-sync 仅打印，未执行）。其余 9 个脚本（mine_blockers / record_eval / collect_eval / consolidate / review_candidates / check_memory_health / append_run_log / write_observation / get_rules）需人工或 npm 手动触发；其中 mine_blockers / collect_eval / append_run_log 零调用者。

ROI 判定：**写多读少、机器多数据少**。session 启动确实读 summary（每次），但 summary 内容长期停留在 2026-05-20 同一条 episode（"GEPA 评估"），semantic facts 主要靠手建。维护 2270 行机器换来 10 条 fact + 4 条 observation，自成长贡献仅 2 条（SC-20260523-002/003，且为同一人同日手动 promote）。

### 优化机会（候选方向）

1. **闭环自动化优先于扩容**：把 session-sync 的"打印命令"改为在确有 in-progress 节点 / observation 时**实际调用** append_episode；或在 session-restore 检测到 pending-extraction.md + 满足条件时引导一次性 propose。根因不解决，再多脚本也不转。
2. **砍死代码**：删除或合并 mine_blockers / record_eval / collect_eval（eval 双写不一致），eval 子系统要么接一个真实数据源，要么整体下线直到 GEPA 真正落地（EP-20260520-005 已判定"现在不适合接入"）。
3. **修文档一致性**：清理 `.claude/skills/office/SKILL.md` 与 `.agents/skills/office/SKILL.md` 中残留的 `.claude/hermes/scripts/*` 命令；统一 SF-001 品牌色（promoted-facts vs CLAUDE.md 速查节）。
4. **eval 统一为单一文件**：record_eval 与 collect_eval 二选一，README 引用的 eval-log.jsonl 与实际 pairs.jsonl 对齐。
5. **summary 显示真实计数**：`load_episodic(3)` 改为显示总数或 limit 可配，避免误导规模感知。
