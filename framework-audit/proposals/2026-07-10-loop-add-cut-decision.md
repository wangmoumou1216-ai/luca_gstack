# Loop 架构 ADD/CUT 决策备忘（Phase 2 — 呈批版）

> 2026-07-10，Fable 主笔。上游：`2026-07-10-loop-research-addendum.md`（Phase 0，门控=零推翻）+
> `2026-07-10-loop-evidence-table.md`（Phase 1 自证据）。计划：`~/.claude/plans/claude-code-loop-agentic-coding-loop-lu-tranquil-karp.md`。
> **本备忘经用户批准后才进 Phase 3 执行。** 证据编号：E0-*=补调研，E1-*=证据表，EP-*=episodic 原始记录。

---

## 裁决总览

| 条目 | 裁决 | 关键证据 |
|---|---|---|
| A1 Loop 宪法条款 | **执行**（落 CLAUDE.md，草文见下） | E0 全线共识 + OpenHands/BMAD 自砍示范 |
| A2 loop 健康自检入 daily_governance | **执行**（含写路径核验） | E1-§2：governance 07-09 marker 缺失异常 + 17 积压 + SESSION_SYNC 停摆事故 |
| A3 feedback loop 修复运维 | **执行**（a 消化积压 / b 人裁 person 候选 / c MEMORY.md 修剪仅提案） | 17 文件实测；MEMORY.md 27 行超软上限 |
| C1 plan-agent ≥3 文件重标定 | **撤回** | E1-§1：NO-DATA（EP-20260628-049 ≥3 文件编辑零摩擦零触发；无误伤实录） |
| C2 强制读完限定范围 | **撤回** | E1-§1：NO-DATA（骨架读发生在大源码文件，不在该规则辖区） |
| C3 平凡任务豁免 skill 强制路由 | **执行**（草文见下） | E1-§1：SUPPORTED（EP-20260703-056 + 4 个 skills_used:[] 无害 session，零反证） |
| C4 CLAUDE.md 瘦身 | **只留清单不动刀**（≈15KB 可回收，三节，见 E1-§3） | 尺寸实测；伤害外推 → 另立批次 |
| 承重墙 | **零变化**：project-scope-guard / session-sync 语义 / GATE-1/2 / 红线 / Static Fallback | 防真实事故的墙，E1 亦无任何要求松动的证据 |

**净口径：4 条 CUT 只执行 1 条**——证据门砍掉了我自己提的 C1/C2，这是该机制的功能而非失败（"砍也要自证"，与"加也要自证"对称）。

---

## ADD 详单

### A1 — Loop 宪法条款（落 `CLAUDE.md` 新增一节；约 12 行 ≈600B，C4 瘦身批次将回收 15KB，净减）

落点理由：constitution.md 标题即"muse-loop 不可协商原则"（skill 级辖区）；框架级原则归 OS 契约 CLAUDE.md。**批准即批准以下原文：**

```markdown
## Loop 宪法（框架级）

> 一手源共识 + 自家证据背书（调研与证据：framework-audit/proposals/2026-07-10-loop-*.md）：

1. **Inner loop 不重造。** gather→act→verify 是模型/harness 原生资产；框架只喂输入
   （spec/规则/工具/验证目标），不在任务中途切碎它。
2. **Outer loop 默认薄，** 只由四原语搭建：停止条件（绿灯即停/硬迭代上限）、spec/eval
   信号、人类卡点（放 plan 阶段最便宜）、跨 session 记忆写回。硬任务可升"结构化档"
   （研究→计划→实现 + 刻意 compaction），但仍只用这四原语，永不重造内循环。
3. **复杂度双向自证。** 新增结构须证明可测地改善结果；既有结构定期用使用数据复核，
   不划算就砍（OpenHands 删 AgentController、BMAD 并 SM+QA 是工业示范）。
4. **优先接 harness 原生原语**（/loop、schedule、ralph-wiggum 插件、ScheduleWakeup、
   Workflow），不自建平行 loop 机器。
5. **自主度是旋钮不是开关**（Karpathy autonomy slider）：新/真任务默认低自主+短皮带；
   iteration/cost 上限是承重不变量，必须验证真的生效（ralph #18646 教训），永不默认无限。
```

### A2 — loop 健康自检并入 `memory/scripts/daily_governance.py`（~30-40 行，fail-open，不是新心跳）

检查项（全部只查可观测工件，不猜）：
1. `pending-extraction-*.md` 计数 ≥5 → 告警行（捕获→消化链疑似断）
2. 最新 episodic 条目日期 vs 最新 digest/.checked marker 日期，双向陈旧度报告
3. **写路径核验**（E1 真发现：07-09 有 session 活动却无 marker，疑 MEMORY_ROOT=母版残留把写重定向了）——报告 marker/digest 实际落在 fork 还是母版
4. DORMANT 白名单：gen↔judge（muse-loop 零真实运行属 by-design 待首用），不告警只标注

产出规则：只在有异常时往当日 digest 追加「⚙️ Loop 健康」小节（遵守既有"有真实状态变化才写"降频规则）；任何异常 fail-open exit 0。

### A3 — developer feedback loop 修复运维（操作，非建设）

- **a（agent 可做）：** 逐个裁决 17 个 pending-extraction 文件——按 extraction-bar 四信号，过门槛的落对应层，不过的记录"已裁决-放行"；清零。多数料为 SESSION_SYNC_BLOCK 停摆期同根因积压，预期大部分放行。
- **b（须 luca 一键）：** person 候选 `candidate_feedback_audit-before-sweeping-style-change`（已挂 3 天）——采纳（mv 为 feedback_* + 索引）或丢弃。
- **c（仅提案）：** MEMORY.md 27 行 > 20 软上限——产出合并/修剪候选清单呈 luca，不代改。

---

## CUT 详单

### C3 — 平凡任务豁免（唯一存活的 CUT；改 `CLAUDE.md`「Skill 调用规则」节尾行）

现行：`**不得直接回答用户请求而绕过对应 skill。Skill 有专门的执行流程。**`

**批准即批准改为：**

```markdown
**不得直接回答用户请求而绕过对应 skill。Skill 有专门的执行流程。**
**平凡任务豁免（2026-07-10，证据 EP-20260703-056）：** 单文件/纯机械/一次性小改动，
任何 skill 的核心流程对其都不增值时 → 直接执行，不强制过 skill（与既有「纯闲聊/框架自身
问题/一次性咨询直接回答」同源语义）。拿不准时说一句「按平凡任务直接做」，可被当场纠正。
```

### C1 / C2 — 撤回（记录在案防止无证据复提）

- C1（plan-agent ≥3 文件太急）：50 session 语料无一条误伤实录，反例 EP-20260628-049。**若未来出现真实摩擦实录，凭 episodic 证据可重提。**
- C2（强制读完太宽）：规则辖区（skill/契约文件）内无摩擦记录。同上。

### C4 — 瘦身清单（已记录于 E1-§3，本批次不动刀）

三节 ≈15KB 可回收（三层记忆系统 ~6K / Session 启动协议 ~6K / Context 工程协议 ~3K），红线/路由契约/Project Gate 不在候选内。另立批次执行。

---

## NOT-DOING（负空间，证据强化版）

| 不做 | 依据（round-2 后更硬） |
|---|---|
| 不建新代码 loop 机器 | ralph-wiggum=官方薄参考实现已存在；需要时写一页"接入指引"（可抄参数清单已沉淀在补编 §沉淀） |
| 不激活休眠 eval 基础设施 | ADR-0006/0007 冻结 + 框架预算；E1 无证据显示当前需要 |
| 不加 inline/per-step eval gate | Anthropic evals 指南 + E1 亦无此类缺口 |
| 不加固定间隔新心跳 | Letta v1 删 heartbeat（逐字核验）；现有 daily governance 已够 |
| 不引入多 agent 并行 writer | Cognition（逐字核验）；claude-flow 87→314 工具是活体反例 |

---

## Phase 3 执行卡（批准后逐条外科式，每条带验证）

| # | 改动 | 文件 | 验证 |
|---|---|---|---|
| 1 | A1 宪法节插入 | `CLAUDE.md` | 读回 + 与 constitution.md 无冲突 + `git diff` 仅一节 |
| 2 | C3 豁免行 | `CLAUDE.md` | 读回 + 不触碰路由契约其余文字 |
| 3 | A2 健康自检 | `memory/scripts/daily_governance.py` | `python3 daily_governance.py` exit 0；伪造 6 个 pending 文件场景→digest 出告警行；`bash scripts/verify.sh` 全绿 |
| 4 | A3a 消化 17 积压 | `.claude/observability/pending-extraction-*.md` | 计数归 0 + 每文件有裁决记录 |
| 5 | A3c 修剪提案 | （新建提案 md 于 framework-audit/proposals/） | 呈 luca |
| 6 | 回归 | — | `node scripts/test-project-scope-guard.mjs` 通过（承重墙未误伤） |

## 待用户裁决

1. **批准本备忘执行范围**（A1+A2+A3+C3；C1/C2 撤回；C4 只留清单）？ → **已批准全部（2026-07-10）**
2. **person 候选**：采纳 or 丢弃？ → **已采纳并转正入索引**
3. A1 落点 CLAUDE.md（而非 constitution.md）认可？ → **已认可，已插入**

---

## A3c — 全局 MEMORY.md 修剪提案（仅提案，luca 裁决后另行执行）

现状：26 条 > 20 软上限（每 session 全量注入）。保守合并方案 26 → 22：

| # | 动作 | 理由 |
|---|---|---|
| M1 | `recheck-completeness-claims-against-sources` → 并入 `redteam-own-analysis-before-shipping` | 同主题：出口前核验自己的结论/声明（后者已是并入 4 条的验证簇） |
| M2 | `regenerate-from-data-not-source-ui` → 并入 `1to1-ui-replication-method` | 同族：忠实重建/复刻方法论 |
| M3 | `reproduce-real-env-not-approximation` → 并入 `verify-your-verification` | 验证簇（该条已吸收 4 条同族） |
| R1 | `deliver-content-directly-when-viewer-fails` → 退休候选 | 窄场景一次性教训（6-30），行为大概率已内化；如 luca 认为仍需保留则跳过 |

合并规则沿用既有惯例：内容原样保留（「## 并入：xxx」小节），索引行合并为一条，`[[链接]]` 保持。**不动的：** 全部 7-0x 新条目、never-switch（luca 点名严重）、并行 fork merge（luca 点名特别注意）。
