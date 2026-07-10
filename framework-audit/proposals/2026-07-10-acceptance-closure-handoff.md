# Handoff — 验收闭环三补丁（acceptance-closure）· 跨 session 移交

> **移交方**：2026-07-10「lucagstack 后置流程完整性 + OpenSpec 评估」session（Opus 初评 → Fable 复审两轮）。
> **接收方**：正在执行 loop 改造批次的 luca 改造 session（`2026-07-10-loop-add-cut-decision.md` 那位）。
> **状态**：方案已经 luca 确认要做（由接收方执行）；**本文成形于你的 Loop 宪法/C3 落地之前**，交叠声明见 §3，执行前先读 §3。
> **基线**：commit `3625b02` 工作树；4 个目标文件在 2026-07-10 本文写入时刻复核 `git diff HEAD` 仍为空（未被你的批次触碰）。

---

## 0. 一句话任务

给工程链补上验收闭环：**计划期** ASSERT/TEST 反向覆盖门（Patch 1）+ **断言库**行为级模板（Patch 2）+
**收尾期** tech-spec RTM 合同回验 + 挂图 + shipped 标记（Patch 3）+ 可选的测试准则可机检化（Patch 4）。
全部为编辑现有文件，零新文件（除本 handoff）、零依赖、不接 OpenSpec CLI。

## 1. 背景与依据（自含压缩版，无需读原对话）

**诊断**（全部一手直读验证）：
- `plan-agent.md` 块1.5 对 DEV-NNN 有 CRITICAL 级反向覆盖门，**对 ASSERT/TEST-NNN 没有**——task-plan 的测试卡可静默不进执行计划；
- plan-agent 块3 断言模板库 **12 条模板全为 artifact 级**（文件存在/语法/grep），无一条跑真实测试套件；
- `orchestrator.md` Step 3 期末只跑 plan 断言，**从不回读 tech-spec RTM「测试准则」列**——前向逐跳有门，回向零门；
- `optional-workflow-graph.yaml` 终于 `task_plan_to_execution`，图上无 post-execution acceptance 节点；
- 无任何 spec 归档/shipped 标记机制（grep 验证）。

**现场证据（为什么值得做、为什么是现在）**：
- 工程链有真实使用：muse / todo-capsule / roam-cards / luca-dev 四项目有 tech-spec/task-plan 产出；
- **痛点已发生**：`~/Desktop/项目/todo-capsule/docs/engineering/2026-07-05-todo-capsule-claude-tag-verification-matrix.md`——框架无验收节点，被迫手工造 29 项验收矩阵（逐项真实证据，"不接受代码看起来对"）；
- **漂移实锤**：该矩阵第 19 条：`task-plan.md 的 ASSERT-007 仍写 allowedDomains === []，与蓄意修订的网络放行策略矛盾`——断言与实现漂移，仅靠人工扫发现。本补丁 = 把这次手工付费动作固化为框架节点。

**OpenSpec 评估结论（附带交付，写入记录即可）**：不整套接入、不装 CLI（与 tech-spec/task-plan 层重叠 + 双真值源 + 污染母版 `.claude/` 命名空间）；仅汲取 3 思想——①delta+archive 活 spec（→Patch 3 的 shipped+delta 行）②可机检 Requirement/Scenario 格式（→Patch 4）③`/opsx:verify` 三维回验节点概念（→Patch 3 框架：completeness/correctness/coherence）。

## 2. 改动点精确清单（锚点以语义为准，执行前 re-read 确认）

### Patch 1 — `.claude/agents/plan-agent.md` · 块1.5「DEV-NNN 反向覆盖检查」节
- **位置**：现有 DEV-NNN 检查（Step 1-3 + 判定规则）之后、块2 之前，增设同构小节「ASSERT/TEST-NNN 反向覆盖检查」。
- **内容规格**：当输入存在 task-plan.md 时强制执行——枚举其 Assertion Matrix 全部 **MUST 级 ASSERT-NNN**，逐条确认映射为 ①一条 BLOCKING bash 断言 或 ②一条 criteria 条目（E3 llm-judge 型，块3 已有该机制）。漏 MUST → **CRITICAL：计划不许输出**（与 DEV 同级）；漏 PARTIAL → WARNING 记 defer。输出覆盖率报告行（镜像 DEV 报告格式）。
- **不碰**：文件头「触发条件」表（route-guard 引用其为唯一权威口径）、「条件 2 豁免」段（SSOT-10 checker 锚点）。

### Patch 2 — 同文件 · 块3「断言模板库」
- **位置**：模板库列表末尾追加行为级模板（同格式带 `# [BLOCKING]` 注释头）：`npm test` / `pytest` / `swift test` / `bash scripts/verify.sh` 退出码断言。
- **规格**：库前加一条规则——**涉及代码实现的 Phase，每个 MUST 需求 ≥1 条行为级断言；artifact 级（存在性/语法/grep）不充抵**。

### Patch 3 — `orchestrator.md` Step 3 + `optional-workflow-graph.yaml`
- **orchestrator.md**：§2.2 Step 3（"全部 Phase 完成后…"）升级为**合同回验**：读 tech-spec §5 RTM「测试准则」列，逐条 pass/fail + 证据（三维框架：completeness=需求全实现 / correctness=符合 spec 意图与边界 / coherence=设计决策反映在代码）；结果写入收尾 handoff 的 `criteria:` 块（**复用 handoff-protocol v3.2 既有绑定点，不造新格式**）；回验 PASS → 在 tech-spec「Coverage Gate Result」节追加 `SHIPPED: <date> / acceptance: <handoff路径>`；发现蓄意偏离（ASSERT-007 类）→ 同节追加 delta 行 `MODIFIED: <原准则> → <新准则> (reason)`。
- **optional-workflow-graph.yaml**：`handoff_gates` 内 `task_plan_to_execution` 之后新增 `execution_to_acceptance` gate：`applies_when: workflow_mode`、`block_if: ["any MUST RTM row lacks pass/fail verdict", "any FAIL verdict without user adjudication"]`、`allow_standalone_override: true`（standalone 免强制，与既有分级一致）、note 接线 redteam（对抗审计）与 code-hygiene（完成前验证铁律）为**推荐**后置工具（不强制）。

### Patch 4（可选，可砍）— `tech-spec/SKILL.md` Phase 4
- 「测试准则」列格式升级为结构化 `WHEN <操作> THEN <可观测结果>`；Phase 5 门禁同步查格式。散文准则 + llm-judge 亦可跑，故非阻塞。

## 3. ⚠️ 与你（接收方）批次的交叠声明——执行前必读

**本方案成形于你 2026-07-10 批次（A1 Loop 宪法 / C3 豁免 / A2 governance / A3）落地之前**，已按落地后状态 reconcile：

| 维度 | 交叠判定 |
|---|---|
| **文件级** | **零交集**。你动 `CLAUDE.md` / `daily_governance.py` / `.claude/observability/*` / memory；本方案动 `plan-agent.md` / `orchestrator.md` / `optional-workflow-graph.yaml` / `tech-spec SKILL.md`。本文写入时刻这 4 文件 `git diff HEAD` 为空。**若你后续批次碰了它们，以本文的语义锚点重新定位，不按行号。** |
| **Loop 宪法（你刚落的 A1）管辖本补丁** | 已做合规映射，无冲突：①三补丁全部落在**四原语**内——RTM 回验/覆盖门 = spec/eval 信号 + 停止条件，FAIL→用户裁决 = 人类卡点（且在 plan/收尾阶段，最便宜位置）；②**不切碎 inner loop**——回验在任务边界（期末 Step 3），不做中途 per-step 检查；③**复杂度自证**——验证方案含可证伪测试（§5 第 3 条 ASSERT-007 回放，抓不到即返工），且接受未来使用数据复核可砍；④不建平行 loop 机器、不接外部 CLI。 |
| **你撤回的 C1（plan-agent ≥3 文件重标定）** | 不冲突但同文件：C1 撤回理由是 NO-DATA；本方案改 plan-agent 的**另一节**（块1.5/块3，不碰触发条件表），且带实锤证据（ASSERT-007 + verification-matrix）——符合你们"凭证据可提"的对称标准。 |
| **你的 NOT-DOING「不激活休眠 eval 基础设施（ADR-0006/0007 冻结）」** | **不违反**。冻结的是 eval 度量子系统（gaps-register dimension:testing, status:deferred）；Patch 3 写入的是 handoff `criteria:` 块——**E3（2026-07-09）已上线的活机制**，不碰 eval-log/evals skill/度量基建。也不是你 NOT-DOING 的"inline/per-step eval gate"（是任务末端合同回验，一次性）。 |
| **你的 C4 瘦身批次（CLAUDE.md ≈15KB）** | 零交集：本方案不动 CLAUDE.md。 |
| **承重墙（你声明零变化的）** | 同样零变化：不碰 project-scope-guard / session-sync / GATE-1/2 / 红线 / Static Fallback。 |

**执行前 reconcile 三步**：① `git status` + re-read 4 目标文件，确认锚点节仍在（「DEV-NNN 反向覆盖检查」「断言模板库」「Step 3」「task_plan_to_execution」）；② 确认你自己批次无未落盘的对这 4 文件的计划；③ 有冲突时以你在场的最新工作树为准做语义合并，本文锚点描述优先于任何行号。

## 4. Scope 红线（不做什么）

- ❌ 不装 OpenSpec CLI / 不建 `openspec/` 目录 / 零外部依赖
- ❌ 不动 muse-proto-judge（fork 专属原型判官，与代码验收是两个节点）
- ❌ 不造新 skill / 新 agent / 新文件（本 handoff 除外）
- ❌ 不动 plan-agent 触发条件表、条件2豁免名单、fail-open hooks、Static Fallback、兼容语义
- 落点：本 repo（muse fork）先行；回母版另行裁决，不在本方案内

## 5. 验证方案（不接受"看起来对"）

1. **锚点回归**：grep 确认 route-guard/SSOT 引用锚未破坏；`bash scripts/verify.sh` 全绿；`node scripts/test-project-scope-guard.mjs` 通过（承重墙未误伤——与你批次的回归项相同）。
2. **桌面推演**：scratchpad 造最小 task-plan fixture（2 条 MUST ASSERT，其一故意不映射）→ 新块1.5 必须 CRITICAL 拒绝；补映射后必须 PASS。
3. **★ 已知阳性回放（价值的直接测试）**：用 Patch 3 回验流程对 todo-capsule 真实 tech-spec（`2026-07-03-todo-capsule-claude-tag-tech-spec.md`）跑一遍，对照已知答案（verification-matrix）——**必须抓到 ASSERT-007 漂移，抓不到 = 回验设计不合格，返工**。
4. （可选）对 diff 跑 `redteam` skill。
5. 首个生产样本：下一次 muse 工程链任务走新流程。

## 6. 执行顺序 + 恢复指令

1. §3 reconcile 三步 → 2. Patch 1+2（同文件一次编辑）→ 验证 1、2 → 3. Patch 3（两文件）→ 验证 3（ASSERT-007 回放）→ 4. Patch 4（可选）→ 5. 验证 4、收尾（handoff + 经验按四信号裁决沉淀）。
中断恢复：本文即恢复入口，按序号续点；改动全部可逆（删除新增文字段即回滚）。

## 7. 证据文件索引

| 用途 | 路径 |
|---|---|
| 诊断对象 | `.claude/agents/plan-agent.md`（块1.5/块3）、`.claude/agents/orchestrator.md`（Step 3）、`.claude/skill-os/optional-workflow-graph.yaml`、`.claude/skills/office/tech-spec/SKILL.md`（Phase 4/5） |
| 痛点实锤 | `~/Desktop/项目/todo-capsule/docs/engineering/2026-07-05-todo-capsule-claude-tag-verification-matrix.md`（第 19 条 = ASSERT-007 漂移） |
| 回放样本 | `~/Desktop/项目/todo-capsule/docs/engineering/2026-07-03-todo-capsule-claude-tag-tech-spec.md` |
| 交叠对象 | `framework-audit/proposals/2026-07-10-loop-add-cut-decision.md`（你的批次）、CLAUDE.md「Loop 宪法」节 |
| criteria 机制 | `.claude/skill-os/eval-methodology.md` + handoff-protocol v3.2（E3，2026-07-09） |
| OpenSpec 依据 | github.com/Fission-AI/OpenSpec `docs/commands.md`（/opsx:verify 三维）、`docs/concepts.md`（delta+archive） |

---

## 8. 执行回执（2026-07-10 接收方，loop 批次 session）

**审计裁定：合理，已执行**（先审计后动刀：核心诊断两处由接收方直读一手文件复证——orchestrator Step 3 确实只跑 plan 断言、图确实终于 task_plan_to_execution；块1.5/块3 诊断与接收方本 session 早前的完整直读一致）。

| Patch | 状态 | 落点 |
|---|---|---|
| 1 ASSERT/TEST 反向覆盖门 | ✅ | plan-agent.md 新增块 1.6（与块 1.5 同构，MUST 漏 → CRITICAL） |
| 2 行为级断言模板 + 规则 | ✅ | 块 3 模板库尾 +4 模板（npm/pytest/swift/verify.sh）+ "artifact 级不充抵"规则 |
| 3 合同回验 + 图 gate | ✅ | orchestrator §2.2 新增 Step 3b（三维回验/criteria: 块/SHIPPED/delta）+ workflow-graph 新增 `execution_to_acceptance`（standalone 免强制） |
| 4 测试准则可机检化 | ⏸ 缓做 | 按其"可选可砍"自标 + Simplicity First；等真实出现 llm-judge UNKNOWN 判例再补 |

**验证（§5 逐条）：** ①锚点回归——触发条件表/条件2豁免锚完好，YAML 合法，`verify.sh` PASS=53/FAIL=0，scope-guard 回归 PASS；②块1.6 桌面推演两分支成立；③**★已知阳性回放命中**——tech-spec R18 行 RTM 准则仍写 `allowedDomains=[]`，Step 3b 回读即判 FAIL(correctness) → 裁决 → delta，与 verification-matrix 第 19 条人工发现一致（**只读回放，未改 todo-capsule 历史工件**）；④redteam 未跑（改动为纯增量 prose 合同，可逆）。

**执行修正（3 条，接收方审计时声明）：** 回放只读不写 SHIPPED 进历史工件；Patch 4 缓做；两处未验诊断先直读再动刀。
