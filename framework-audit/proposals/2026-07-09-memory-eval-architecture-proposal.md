# 提案：记忆体系与评估体系架构优化

> ⚠️ 本文件已被 `2026-07-09-memory-eval-final-plan.md` 取代（红队三路评审后修订），保留作调研档案。
> 日期：2026-07-09 ｜ 状态：**superseded**
> 来源：luca 四问（经验沉淀归属 / 项目 vs 框架记忆架构区分 / 项目 context 套装 / Eval 体系）
> + 三路调研（本地 memory 架构、本地 eval 现状、业界框架 2025-2026）。
> 本文档是本轮唯一产出；所有改动项在 Part 4 以 BACKLOG 格式给出，**裁决后**再落地。
> 已拍板前提：eval 数据层维持冻结（GAP-eval-frozen 不触碰）；context 套装按"最高价值、
> 高置信、契合现有架构"裁剪，不照搬业界七件套。

---

## Part 0 — 四问直答

**Q1：经验沉淀到哪里？存入规则是什么？**
现行规则清晰且不需要重构：先过**四强信号提取门槛**（`.claude/skill-os/extraction-bar.md:10-14`，
全不中→什么都不存），再用一个**还原问题**裁三分归属（CLAUDE.md「换一个完全无关的项目、甚至重建
luca_gstack，这条还成立吗？」）——只关于 luca 本人怎么工作 → 全局个人记忆（信号①直写
`feedback_*.md`，②③④走 `candidate_feedback_*` cooling-off）；只在框架内成立 → semantic 候选
（`propose_semantic.py`，经 promotion_ready 门禁晋升）；只对某下游项目成立 → 项目本地
`.luca/memory/MEMORY.md`。episodic 是低门槛流水层。**规则本身是这个体系里最成熟的部分。**

**Q2：项目 vs luca_gstack 的记忆有架构区分吗？需要吗？是问题吗？**
**有区分，且区分本身不是问题**——物理隔离（三套目录）+ 注入面隔离（项目记忆只在激活时注入，
防跨项目污染，`scripts/project.sh:58-59` 注释明确此设计意图）+ 归属裁决规则，骨架完整。
真正的问题在**四个执行层缺口**（详见 Part 1.3）：①项目侧缺结构化 context 套装；②"绑定项目
≠注入项目记忆"的读取盲区；③working memory 事实存在但无命名无收口；④person 层记忆按启动方式
分叉（母版 28 条 vs fork 4 条）。修缺口，不动骨架。

**Q3：项目下需要 context/（overview/glossary/decisions）吗？**
**需要，但裁剪版。** 调研证实所有项目都没有 glossary、没有 overview（仅 todo-capsule 有根级
CONTEXT.md）、没有决策日志——`docs/decisions/` 名不副实，装的是 design-brief 等 skill 产出稿而非
决策记录。业界（Kiro steering files / Cursor rules / spec-kit constitution）对这层有清晰共识。
但按最小文件原则裁成**"两文件一节"**：项目根 `CONTEXT.md`（概览+技术栈+结构+红线 四合一，
glossary 作为其中一节起步）+ `.luca/memory/decisions.md`（ADR-lite 决策台账）。方案见 Part 3A。

**Q4：有规范化评估体系吗？有四步法吗？定义过 Eval 吗？**
**没有统一 Eval 定义，只有碎片。** 最接近"四步法"的是 tech-spec/task-plan/quality-gate 断言链
（定义断言→测试卡→执行→FAIL 退回），但它评的是**计划的需求覆盖率**（"22/22"那种客观分），
不评产出质量；quality-gate 报告里的 `Score: N/10`（`quality-gate.md:215,231`）**全仓无 rubric
定义**，是 agent 主观整体分，与客观覆盖率分在 PROGRESS.md 里混用；设计/研究类产出
（deepresearch/brainstorm）在 eval-log 里 `score: null`，零门禁；eval 数据层（GEPA pairs.jsonl）
有意冻结且从未产数。提案：统一 Eval 定义 + 四步法方法论 + quality-gate 逐 criteria 二元改造
（Part 3C）。

---

## Part 1 — 现状地图

### 1.1 记忆分层与读写链路

| 层 | 位置 | 格式/量级 | 写入口 | 读出口 |
|---|---|---|---|---|
| Episodic | `memory/episodic/index.jsonl` | JSONL，50 条滚动（`append_episode.py:188`） | Stop 裁决时 `append_episode.py`（`--project` 从 docs 软链推导） | `search_memory.py` / `get_memory.py --layer episodic` |
| Semantic | `memory/semantic/promoted-facts.yaml` | YAML，~28 条 stable fact | `propose_semantic.py` → 治理晋升（红线 SC-20260523-003） | `search_memory.py`；白名单 6 条镜像 CLAUDE.md SF 节（`static-fallback-allowlist.txt`） |
| Procedural | 已并入 Semantic `domain:skill-rule` | — | 同上 | 同上 |
| 全局个人 | `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/` | ~28 条 `feedback_*.md` | 信号①直写；②③④ `candidate_feedback_*` cooling-off | 每 session 全量注入（最贵层） |
| 项目本地 | `~/Desktop/项目/<name>/.luca/memory/MEMORY.md` | 索引行 + 旁挂 md（muse 10 / todo-capsule 3 / roam-cards 7 条） | Stop 裁决（同四信号门槛） | **仅** `project.sh switch/new` 的 `inject_project_memory()`（`project.sh:131-141`，有真实条目才注入） |
| （旁挂）Eval | `memory/evals/` | eval-log.jsonl 6 条；pairs.jsonl **0 条** | `collect_eval.py`/`record_eval.py`（双写不一致，已知） | **冻结**（`memory/README.md:65`，GAP-eval-frozen） |
| （事实存在未命名）Working | `.luca/workflow-state.yaml` + `docs/PROGRESS.md` + `current-topic.txt` | 每项目一套 | 各 SKILL.md 导出 `DONE`（`write_state.py`） | session-restore / route-guard / session-sync 三个 reader |

### 1.2 治理链路（运转正常，不动）

`propose_semantic.py` → `candidates.jsonl`（`proposed_stable` 强制 False，提案者不得自评，
`propose_semantic.py:101-104`）→ `daily_governance.py` 每日 surfacing（digest 只在有状态变化或
周度心跳时写）→ **人工 `consolidate --set-stable`（唯一 drain 闸门，SC-20260615-001 两步解耦）**
→ promotion_ready 门禁 → `promoted-facts.yaml` → allowlist 内 id 镜像 CLAUDE.md。
person 层候选同理：surfacing 自动、采纳必须人工 mv（红线 feedback_no-auto-edit-global-claude-config）。

### 1.3 四个执行层缺口（本提案的修复对象）

**缺口① 项目侧无结构化 context 套装。**
所有项目 0 个 glossary、0 个决策台账；overview 仅 todo-capsule 有（根级 CONTEXT.md）；
`docs/decisions/` 实际装的是 design-brief/ux-brainstorm 产出稿（muse 7 份、todo-capsule 7 份），
不是"为什么这么定"的决策记录。项目知识唯一落点是 `.luca/memory/MEMORY.md` 散点索引。
后果：跨 session 回到项目时，agent 对业务术语、历史决策、技术约束无廉价恢复途径，
只能重读产出文档或重问。

**缺口② 绑定项目 ≠ 注入项目记忆（读取盲区，按 2026-07-08 方案A 修订表述）。**
方案A 会话级隔离后，pin（`.claude/.session-project-<sid>`）是 session 项目归属唯一真值，但
**pin 的两个写入点都不伴随记忆注入**：route-guard 的 `affirmsCur` 分支（用户确认继承项目名 →
静默写 pin，`route-guard.mjs:~680`）和 PROJECT_SWITCH 分支（写 pin，注入依赖主 Agent 随后跑
`project.sh switch`）。`inject_project_memory()` 仍只挂在 `project.sh switch/new` 的 stdout 上。
净效果：**确认继承已激活项目的 session 全程拿不到该项目的本地记忆**——这是最常见的工作路径之一
（并行 session 保留 + 用户点名确认）。

**缺口③ Working memory 无命名，恢复路径半接线。**
`workflow-state.yaml`+`PROGRESS.md`+`current-topic.txt` 事实上就是 working memory，但
`memory/README.md` 分层表不含它，概念无名。且 `IN_PROGRESS` 有 3 个 reader 无任何 writer
（BACKLOG #18 已实证，恢复分支永不触发）。

**缺口④ person 层记忆按启动方式分叉。**
muse app 内嵌终端启动 fork 时 pty 注入 `GLOBAL_MEMORY_DIR` 指母版；普通 `claude` 直跑 fork 时
harness auto-memory 落 `-Users-luca-Desktop----muse-gstack/memory/`（现存 4 条）。母版目录
（~28 条 feedback）才是 `daily_governance.py:23-24` 与 session-restore 的默认扫描对象——
**fork 直跑产生的 person 层候选永远不进治理 digest**，且 fork 直跑时看不到母版 28 条通用偏好。
这是事故性分叉，不是设计。

### 1.4 Eval 侧现状（分散门禁清单）

| 触点 | 评什么 | rubric | grader | 在跑？ |
|---|---|---|---|---|
| quality-gate（Skill Mode） | skill 产出完整性/约束合规/handoff | **无**（`Score: N/10` 无标尺，`quality-gate.md:215,231`） | LLM（sonnet，只读） | ✅ |
| quality-gate（Free Task Mode） | plan-agent 断言列表 | 客观（shell exit code，[BLOCKING]/[WARNING]） | code | ✅ |
| tech-spec Phase 5 | MUST 需求→设计覆盖率 | 客观（逐 ID 核对，"严禁静默通过"） | code/自检 | ✅（22/22 出处） |
| task-plan Phase 7 | REQ/DEC/STATE→dev+test+assert 覆盖率 | 客观（ASSERT-NNN 可执行三段式） | code/自检 | ✅ |
| ux-audit | 视觉/交互/业务 | **有**（35/40/25 权重+阈值，invariants 保护） | LLM specialists | ✅ |
| muse-proto-judge | 原型 vs acceptance_criteria | **有**（逐 AC 二元+证据+偏见规避） | LLM（冷启动隔离） | ✅（fork 专属） |
| taste-review / design-review / redteam | 品味锚点/设计结构/对抗质疑 | 锚点式/无分数 | LLM/human | ✅ |
| handoff gate | 交接文件契约 | 客观（`gate_result` 存在性，`check-quality-gates.mjs`） | code | ✅ |
| observability | 是否复犯历史错误 | rules.yaml 7 条 | 注入式预防 | ✅（源=用户纠错，非 eval 分） |
| evals skill | 汇总各门禁分数 | 只抄录不评分 | — | ❌ `docs/evals/*-evals.md` 从未生成 |
| GEPA 数据层 | eval-pair 回归 | eval-schema.md 有定义 | `judge_eval.py` **不存在** | ❌ 冻结，pairs.jsonl 0 条 |

关键病灶：**主观分与客观分混用**（PROGRESS.md 同页出现无标尺的 "10/10" 与可数的 "22/22"）；
**设计/研究类产出零门禁**（eval-log 里 ux-brainstorm/design-brief/open-design 的 score 全 null）；
**无统一 Eval 定义**把这些碎片收编。

---

## Part 2 — 业界借鉴（采纳 / 不采纳判定)

### 采纳（5 项，均已映射到 Part 3 具体方案）

| 借鉴 | 来源 | 落点 |
|---|---|---|
| 写入决策四态化 ADD/UPDATE/DELETE/NOOP | Mem0 memory-operations | P1-1：extraction-bar 信号②升级（`--supersedes` 参数已存在，`propose_semantic.py:70-71`） |
| bi-temporal 事实失效（superseded 不删除） | Zep/Graphiti | 写侧已有；读侧维持 BACKLOG #2 触发条件，P1-1 落地将加速触发 |
| 项目 context 文件套装 + always-apply token 预算（≤200 词教训） | Kiro steering / Cursor rules / spec-kit constitution | Part 3A（裁剪为两文件一节，注入预算 ≤80 行） |
| eval 步骤法（成功标准→真实失败攒 case→grader 选型→迭代）+ error-analysis-first + 逐 criteria 二元 judge | Anthropic demystifying-evals / Hamel Husain / LLM-judge 实践 | Part 3C 四步法 + quality-gate 改造 |
| just-in-time retrieval（索引存轻量指针，按需加载全文） | Anthropic context engineering | decisions.md 读取策略（指针进 MEMORY.md，不进注入面） |

### 不采纳（4 项，已有等价物或不符合规模）

| 不采纳 | 理由（现有等价物） |
|---|---|
| Letta core memory blocks self-editing | ≈ static-fallback allowlist 注入面：SF 节就是"常驻 context 的受控 block"，且写入受白名单+晋升门禁管控，比 self-editing 更符合本框架的人工闸门哲学 |
| LangMem hot-path/background 双通道 | ≈ 已有：信号①对话中即写（hot-path）vs Stop 拦截统一裁决（background 批处理） |
| LangMem consolidation 独立机制 | ≈ `daily_governance.py` 的 dup/conflict/stale surfacing 已覆盖，队列近空，无膨胀压力 |
| Mem0 式向量 novelty-gate | 当前规模（50 episodic + ~28 facts）文本检索足够；引向量库违反最小依赖，收益不成立 |

---

## Part 3A — 项目 context 套装设计（两文件一节）

> 设计原则：每个新文件必须同时回答——解决什么真实问题 / 谁写 / 谁读 / token 成本多少。
> 回答不全的不装。

### A1. 项目根 `CONTEXT.md`（新增，模板由 `project.sh new` 生成）

**解决**：agent 回到项目时对"这是什么/技术约束/术语"无廉价恢复途径（缺口①）。
**先例**：todo-capsule 已自发长出根级 CONTEXT.md；gstack 自身 CONTEXT.md + 红线节被
quality-gate grep 消费——沿用已验证的模式，不造新概念。

模板（写进 `ensure_project()`，`scripts/project.sh:50-70` 旁增）：

```markdown
# <项目名> — CONTEXT

> 项目级长期约束与共识。激活/绑定本项目时注入（硬预算 ≤80 行，超了精简或外移）。

## 概览
- 一句话：<这个项目是什么、给谁、解决什么问题>
- 当前阶段：<idea / 原型 / 开发 / 上线维护>

## 技术栈与禁用项
- 栈：<语言/框架/关键依赖>
- 禁用：<明确不用的方案，防 agent 推荐偏离>

## 目录结构要点
- <关键目录>：<一句话作用>（完整结构按需 /code-recon，不在此维护长清单）

## 红线
- <本项目不可违反的硬约束，每条一行>

## 术语表
<!-- 超过 15 条时独立成 glossary.md，此处留一行指针 -->
- <术语>：<一句话定义，防 agent 对业务名词理解不一致>
```

**谁写**：`project.sh new` 生成骨架；`/retro`、`/design-brief` 的"CONTEXT.md 写入时机"
（CLAUDE.md 已有规定，现指向 gstack 自身）平移为**写当前激活项目的 CONTEXT.md**；用户手工。
**谁读**：`inject_project_memory()` 扩展为同时注入 CONTEXT.md（沿用"有真实内容才注入"门控——
骨架模板未填不打扰）；P0-2 落地后绑定时也注入。
**token 成本**：硬预算 ≤80 行（Cursor always-apply ≤200 词的 token-tax 教训，中文放宽）。
**glossary 为何不独立**：当前 0 个项目有术语积累源，独立空文件违反最小文件原则；
以节起步，>15 条时再独立并留指针（增长路径明确，不是永久否决）。

### A2. `.luca/memory/decisions.md`（新增，ADR-lite 决策台账）

**解决**：agent 不知道历史决策和原因（缺口①）；`docs/decisions/` 名不副实无法承担此职。

格式（一行一条，头部说明写进模板）：

```markdown
# <项目名> — 决策台账（ADR-lite）

> 只记「为什么这么定」且不可从代码/产出文档推导的决策。被推翻的标 superseded_by，不删除。

- [D-20260709-1] <决策一句话> — why: <一句话>
- [D-20260601-2] <旧决策> — why: <...>（superseded_by: D-20260709-1）
```

**防双写漂移（本设计的关键论证）**：episodic 的 `--decision` 字段**仍是唯一裁决入口**——
Stop 裁决时若 `--decision` 非空且项目归属明确（`--project` 已推导），**同一来源同步一行**到该
项目 decisions.md。即"一个来源、两个视图"：框架侧 jsonl 流水（50 条滚动、跨项目检索用）+
项目侧持久台账（可浏览、不淘汰、带失效链）。不是两次独立判断，无漂移面。
**与 `docs/decisions/` 的分工**：后者保持原样（skill 产出稿桶，design-brief 等继续写入）；
decisions.md 只装"一句话决策+why"，两者在模板头部互相指认，避免混淆。
**谁读**：just-in-time——`MEMORY.md` 模板加一行固定指针
（`- [决策台账](decisions.md) — 本项目历史决策与 why`），需要决策历史时按需 Read，
**不进注入面**（Anthropic just-in-time retrieval：索引存轻量指针）。
**superseded_by 与 bi-temporal 的关系**：与 semantic 层 `supersedes` 字段同一语义，
项目层先用纯文本标注即可（无读侧过滤需求，人和 agent 直接看得懂）。

### A3. 不装清单（显式否决，防止后续重提）

| 不装 | 理由 |
|---|---|
| 独立 constitution 文件 | CONTEXT.md 红线节已承担（gstack 先例，quality-gate 已消费此模式） |
| 独立 structure.md | `/code-recon` 按需产出 architecture brief 已覆盖，静态文件会腐烂 |
| 独立 conventions.md | 无写入源；约定类经验命中四信号时自然落 MEMORY.md/decisions.md |
| Kiro 式七件套全量 | 空文件多、维护重；先"两文件一节"，用增长路径（glossary >15 条独立）应对膨胀 |

**落地改动面（供裁决估算）**：`scripts/project.sh`（ensure_project 模板 ~30 行 +
inject_project_memory 扩展 ~8 行）、CLAUDE.md 写入协议段 ~5 行、extraction-bar.md 项目层
补一句 decisions 同步规则。effort：半个框架 session 内。
**验收**：`project.sh new test-proj` 生成两文件；填入内容后 `switch` 注入包含 CONTEXT.md；
空骨架不注入；`npm run check:project-links` 不回归。

---

## Part 3B — memory 修复项清单

### P0-1 person 层割裂修复（缺口④）

**方案（两步）**：
① **一次性 union 合并**：fork 目录 4 条逐条人工裁决合入母版目录（遵守
parallel-lucagstack-fork-merge-care：union 不覆盖；`commit-muban-if-changed`、
`parallel-fork-merge-care` 本身是 fork 工作语境的教训，可双存——母版收通用版，fork 留原文）。
② **机制修复**，两个候选供裁决：
- **(a) 写入统一指母版（推荐）**：在 fork 的 auto-memory 目录放一条 reference 记忆 + MEMORY.md
  索引行，规定"person 层写入一律用母版绝对路径
  `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/`"——写入由 Write 工具执行，
  路径可被记忆指引覆盖。单一真值源，治理面（daily_governance 默认已指母版）自动闭合。
- (b) daily_governance 扩展扫 fork 目录并列入 digest（保持分桶、治理时合流）——
  多一个扫描面、digest 更吵，且不解决"fork 直跑看不到母版 28 条"的读取侧，不推荐。

**风险**：方案 (a) 依赖 agent 遵守指引（与三分归属同级别的 prose 约束，可接受）；
母版是并行演进仓，合并时段避开母版 session。
**effort**：①人工 10 分钟；②一条记忆文件。**验收**：fork 直跑 session 的 Stop 裁决写入落母版
目录；daily_governance digest 能看到其候选。

### P0-2 绑定即注入（缺口②，按方案A 修订）

**方案**：主 Agent 行为规则一句话（CLAUDE.md Project Gate 段）——**确认/绑定项目时，若本
session 尚未注入该项目记忆，幂等执行 `./scripts/project.sh switch <name>`**（方案A 下软链已
退化为纯展示，重复 switch 无副作用，而 `inject_project_memory` 恰好挂在它身上）。
覆盖两条无注入路径：affirmsCur 静默绑定、继承确认。
**备选（不推荐本轮做）**：给 project.sh 加只读 `context <name>` 子命令、或 route-guard 绑定时
直接 cat——多一个机制面，先用零代码方案验证价值。
**约束**：注意 BACKLOG #17 的启动提醒通道饱和问题——本方案走对话内 Bash stdout，不占
session-restore 启动注入面，无冲突。
**effort**：CLAUDE.md ~3 行。**验收**：并行保留态下用户点名确认项目 → 该项目 MEMORY.md/
CONTEXT.md 内容出现在对话上下文。

### P1-1 写入决策四态化（零代码，prose 升级）

**方案**：extraction-bar.md 信号②的 search-before-write 升级为显式四态决策指引：
- **ADD**：检索无近邻 → 正常新增；
- **UPDATE**：新经验修正/取代旧条目 → `propose_semantic.py --supersedes <旧id>`
  （参数已存在，`propose_semantic.py:70-71`，从未被用过）；项目层在 decisions.md 标
  `superseded_by`；
- **DELETE**：发现旧条目已错 → 标失效不物理删（semantic 走 `--valid-until`/治理；
  全局 person 层仍走人工裁决红线）；
- **NOOP**：已有等价条目 → 不写，避免近义膨胀。

**连锁效应（显式写明）**：第一条真实 `supersedes` 写入即满足 **BACKLOG #2 的触发条件**
（bi-temporal 读侧过滤 ~20 行 + 回归测试随之落地），两项应同批裁决。
**effort**：extraction-bar.md ~6 行。**验收**：下一次 UPDATE 型经验产生首条带 supersedes 的候选。

### P1-2 Working memory 命名收口（纯文档，缺口③）

**方案**：`memory/README.md` 分层表加第四层 **Working** = `workflow-state.yaml` +
`docs/PROGRESS.md` + `current-topic.txt`，定义：session/任务内短期状态，项目本地、
不治理、不跨项目、不进检索。使四层记忆模型（Working/Episodic/Semantic/Procedural）概念完备。
**IN_PROGRESS 失配不在本项处理**——维持 BACKLOG #18 的触发条件（真实 workflow-mode 崩溃恢复
需求出现时再二选一），本项只做概念命名，不动 reader/writer。
**effort**：README ~8 行。

### P2 维持项（不做，防重提）

- **bi-temporal 读侧过滤**：维持 BACKLOG #2 触发条件（注：P1-1 落地会很快触发它）。
- **consolidation 新机制**：daily_governance 已覆盖（dup/conflict/stale surfacing），队列近空。
- **IN_PROGRESS writer**：维持 BACKLOG #18。
- **向量检索/novelty-gate**：规模不足，见 Part 2 不采纳表。

---

## Part 3C — Eval 方法论设计

### C1. 统一 Eval 定义（本框架语境）

一个 **Eval** = 对一次产出的结构化评估，五要素齐全才算：

```yaml
eval:
  task: 评估对象（某 skill 的一次产出 / 复杂任务的最终交付物）
  success_criteria:            # 3-7 条；每条二元可判定；每条绑一个真实 failure mode
    - id: C1
      criterion: <可 true/false 判定的一句话>
      failure_mode: <这条防的真实失败，来自 error analysis，不许拍脑袋>
      evidence: <判定必须给出的证据形式：引用/行号/命令输出>
  grader: code | llm-judge | human   # 选型规则见 C2 Step 3
  verdict:
    per_criterion: pass | fail | unknown   # unknown 逃生口，防 judge 幻觉硬判
    overall: PASS | FAIL | CONDITIONAL_PASS # 沿用 quality-gate 现有三态
  iteration: <FAIL 退回到哪 + criteria 演进规则（漏网失败→新增 criterion）>
```

对照现状：tech-spec/task-plan 断言链 = grader:code 的 Eval（已达标）；quality-gate Skill Mode
= 有 grader 无 criteria 结构（C3 改造对象）；deepresearch/brainstorm 产出 = 五要素全缺
（C2 Step 2 冷启动对象）。

### C2. 四步法（拟新增 `.claude/skill-os/eval-methodology.md`，以下即该文件草案主体）

**Step 1 — 定义无歧义成功标准。**
产出 = criteria 表（3-7 条，二元）。合格判据："两位领域专家能独立得出相同 pass/fail"；
写不出二元判定句的标准（"功能正常""质量好"）退回重写——与 task-plan Phase 5 现有
"模糊断言 FAIL"规则同源，此处推广到所有产出类型。

**Step 2 — 从真实失败攒 case（error analysis 先于 rubric）。**
禁止脱离数据拍脑袋写 rubric。流程：open coding（审阅现有 traces——episodic 50 条、
observations.jsonl、PROGRESS/handoff 里的门禁记录与返工记录——对不良行为写开放笔记，
**只标注 first upstream failure**，级联下游不重复记）→ axial coding（归堆命名失败类别）→
**失败类别即 criteria 来源**。冷启动不求完美：20-50 个源自真实失败的 case 起步。
本框架的冷启动现成语料：quality-gate findings、handoff-review FAILED 项、redteam findings、
observability observations——都是已发生的真实失败。

**Step 3 — grader 选型。**
- **code assertion**（确定性 end-state：文件存在/ID 覆盖率/语法/结构）→ 最优先，便宜可复现。
  现有 tech-spec Phase 5、task-plan Phase 7、plan-agent 断言、check-quality-gates.mjs 全部归此类。
- **llm-judge**（品质类：忠实度/完整性/一致性）→ 逐 criteria 二元 + 证据要求 + unknown 逃生口
  + 偏见规避（位置/长度/自我偏好）。**模板 = muse-proto-judge**（冷启动隔离、只传产出+criteria
  不传生成过程、永不自动修复），推广为通用 judge 模式。
- **human + 锚点**（品味/主观域）→ taste-review/ux-audit 保持现状，兼作 llm-judge 的校准源。
- 原则："grade what the agent produced, not the path"——end-state 优先；trajectory 检查仅限
  合规/安全敏感场景（防"结果对但绕过治理门槛"的 false positive）。

**Step 4 — 迭代。**
FAIL 退回沿用现有机制（task-plan Phase 7 退回模式）。**criteria 演进规则**：每次真实失败若未被
现有 criterion 捕获 → 新增一条 criterion（附 failure_mode 出处）；与 observability 闭环衔接——
eval FAIL findings 是合法的 observation 写入源（现有闭环源头只有用户纠错，此处扩一个入口，
不改 rules.yaml 机制）。

### C3. quality-gate 改造（唯一动现有承重文件的项）

**改法**：`quality-gate.md` Skill Mode 报告格式删 `Score: <N>/10`（L215/L231），替换为：

```
Criteria:
- [C1] <criterion> → PASS（证据: <引用/行号/输出>）
- [C2] <criterion> → FAIL（证据: ...）
- [C3] <criterion> → UNKNOWN（原因: ...）
Overall: PASS | FAIL | CONDITIONAL_PASS（通过率 5/6）
```

**criteria 从哪来**：quality-gate.md Skill Mode 现有检查维度表（完整性/约束合规/handoff/state
+ 产出类型专项）**本来就是事实上的 criteria**——改造实质是"显式逐条化 + 去掉无标尺总分"，
不是推倒重来。各 SKILL.md 质量 gate 节的检查项逐步收编为该 skill 的 criteria 附录（分批，
非一次性）。
**eval-log.jsonl 兼容**：`quality_gate_score` 改记 0-1 通过率（pass_count/total）；历史 10.0/8.0
为旧制主观分，collect_eval.py 注释标注切换日期；`null` 语义保留（未跑 judge）。
**验证要求（硬约束）**：quality-gate.md 是承重文件——改动必须行为级 A/B 验证
（BACKLOG #1 回退教训：不加 demonstrably 改变行为的指令；本次预期可测差异 = 同一产出下
新旧格式的判定一致性与 FAIL 定位精度）。

### C4. 资产收编关系（一图流）

```
统一 Eval 定义（C1）
├─ 收编为 grader:code —— tech-spec/task-plan/plan-agent 断言、check-quality-gates.mjs（零改动，只是归类）
├─ 收编为 grader:llm-judge 模板 —— muse-proto-judge（推广其模式，文件不动）
├─ 改造 —— quality-gate Skill Mode（C3，删 N/10 改逐 criteria）
├─ 保持独立 —— ux-audit 权重 rubric（已有成文标尺）、taste-review 锚点、redteam（只提问不评分）
├─ 保持独立 —— observability 闭环（源=用户纠错；C2 Step 4 给它扩一个 eval-FAIL 入口）
└─ 保持 dormant —— evals skill（汇总表，从未落盘）与 GEPA 数据层（GAP-eval-frozen 重访条件不变）
     裁决点：evals skill 建议维持 dormant，eval-log.jsonl 为唯一记录层（Simplicity First）；
     若裁决要接线，改为 quality-gate 结果自动追加 eval-log（不再生成 docs/evals 汇总文档）
```

---

## Part 4 — 拟进 BACKLOG 的条目（可直接拷贝，编号衔接现有 #19）

### #20 — 项目 context 套装（CONTEXT.md + decisions.md + glossary 节）
- **真实缺口**：项目侧无 overview/glossary/决策台账，`docs/decisions/` 是 skill 产出稿桶名不副实；agent 回项目无廉价 context 恢复途径。
- **为何本轮不落**：框架建设预算；模板与注入扩展需一次专门 session 落地并用真实项目验收。
- **🔔 裁决点**：方案见提案 Part 3A（两文件一节 + 不装清单）。裁决通过即可落地，无外部触发条件。
- **落地点**：`scripts/project.sh`（模板 ~30 行 + inject 扩展 ~8 行）、CLAUDE.md 写入协议 ~5 行、extraction-bar.md ~2 行。effort：≤0.5 session。

### #21 — person 层记忆母版/fork 割裂修复
- **真实缺口**：母版 ~28 条 feedback vs fork 直跑目录 4 条，按启动方式分叉；fork 直跑候选不进治理 digest（daily_governance 默认只扫母版，`daily_governance.py:23-24`）。
- **为何本轮不落**：涉及母版目录写入（parallel-fork-merge-care 约束），需避开母版并行 session 人工执行。
- **🔔 裁决点**：机制方案 (a) 写入统一指母版 vs (b) 治理扫双目录——提案推荐 (a)，见 Part 3B P0-1。
- **落地点**：一次性 union 合并（人工 ~10 分钟）+ fork auto-memory 目录一条 reference 记忆。effort：~10 分钟。

### #22 — 绑定即注入（项目记忆读取盲区，方案A 语境）
- **真实缺口**：pin 两个写入点（affirmsCur / PROJECT_SWITCH）均不伴随 `inject_project_memory`；确认继承项目的 session 全程无项目记忆。
- **为何本轮不落**：依赖 #20 的 CONTEXT.md 注入扩展一并生效更划算。
- **🔔 裁决点**：零代码方案（CLAUDE.md 规定"确认绑定即幂等跑 `project.sh switch`"）vs 加 `project.sh context` 只读子命令——提案推荐前者先验证价值。
- **落地点**：CLAUDE.md Project Gate 段 ~3 行。effort：搭 #20 的车。

### #23 — 写入四态化 + Working memory 命名（prose 批，可搭车）
- **真实缺口**：UPDATE/DELETE 语义有参数无指引（`--supersedes` 从未被用过）；working memory 概念无名。
- **🔔 连锁**：首条真实 supersedes 写入 → **触发既有 BACKLOG #2**（bi-temporal 读侧过滤），两项同批处理。
- **落地点**：extraction-bar.md ~6 行 + memory/README.md ~8 行。effort：搭车级。

### #24 — Eval 方法论 + quality-gate 逐 criteria 改造（独立成批）
- **真实缺口**：无统一 Eval 定义；`Score: N/10` 无 rubric；设计/研究类产出零门禁。
- **为何独立成批**：quality-gate.md 是承重文件，改动必须行为级 A/B 验证（BACKLOG #1 教训）；方法论文档 + 改造 + 验证 = 一次完整框架 session。
- **🔔 裁决点**：①`.claude/skill-os/eval-methodology.md` 草案（提案 Part 3C C2，可直接成文）；②quality-gate 改造范围（仅报告格式 vs 连带各 SKILL.md criteria 附录分批收编）；③evals skill 维持 dormant（推荐）vs 接线 eval-log 自动追加。
- **落地点**：新文件 eval-methodology.md + `quality-gate.md` L215/L231 一带 + collect_eval.py 注释。effort：1 session（含 A/B）。
- **不触碰**：GEPA 数据层冻结（GAP-eval-frozen）、pairs.jsonl、judge_eval.py 缺失——重访条件不变。

### 建议节奏
- **下一次框架 session**：#20 + #21 + #22 + #23 一次收掉（#21 人工 10 分钟、#22/#23 搭车，合计 <1 session）。
- **再下一次框架 session**：#24 独立跑（含行为级 A/B）。
- 与每月 ≤2 次纯框架 session 软上限兼容。

<!-- FILE_END: 2026-07-09-memory-eval-architecture-proposal -->
