# CLAUDE.md — luca_gstack 项目配置

This file is read by Claude Code at the start of every session.

---

## Routing Contract TL;DR

1. Project Gate first: 老项目 / 已有项目 / 继续项目 → 先确认或切换项目。
2. Complexity second: 复杂需求 → Plan Agent，不进单个 skill。**即使 route-guard 高置信命中 skill，仍须检查 Plan Agent 5条件；满足任一不得直接执行。**
3. Ambiguity third: 多候选 → 问用户，不自行判断。
4. Single skill last: 只在高置信且不触发 Plan Agent 5条件的前提下调用 skill。
5. Keyword source: `.claude/skill-os/skill-routing-map.yaml`。
6. Scene (A=新功能 / B=已有优化 / C=线上评审 / D=Agent化) **由用户或上下文确认**，
   route-guard 不做自动分类；不得把"老项目"直接解释为场景 B（见 SC-20260523-002）。

## 仓库概览与非显然的坑

luca_gstack = luca 的个人 Skill OS：`.claude/skills/office/` 一级 skill 集 + hooks +
`memory/` 三层记忆 + `framework/`（只读母版）。`main` 单真值源、双检出。**非显然的坑**：
`docs/`·workflow-state·current-topic 是指向激活项目的软链（**软链空≠项目空**）；本文件被
8+ 个脚本当**数据结构**解析（节标题/表行/字面锚，消费者清单见
`framework-audit/2026-07-29-claude5-unhobble-inventory.md`）。**放置协议**：新增常驻规则
默认落 appendix/skill-os，进正文须在 commit message 声明 `B1-余量:`；因帽进不了正文的
宪法级内容必留正文一行指针。harness 注入边界（规则优先级第 2 层不含行为偏好注入）全文见
appendix「harness 注入边界」。

---

## 核心行为原则

**最小文件原则：** 不创建任何非任务必要的文件；优先编辑已有文件，而非新建。

**单真值源 + 双检出原则（2026-07-16，取代双仓一致）：** `main` 是唯一真值源；
`~/Desktop/luca_gstack`（框架/meta + 记忆权威 store）与 `~/Desktop/项目/muse/lucagstack`
（luca app 运行时）是其两个检出。Git 收口统一遵循 `.claude/skill-os/git-closeout-policy.md`；
风险实验用分支/worktree，不开永久 fork；capability-parity 降级为仓内锚点自检。

### Coding Discipline（Karpathy-inspired）

适用范围：写代码、改文档、改 skill、review、refactor、原型文件修改。
这不是新的一级 skill，不加入 `/office`，也不进入 `skill-routing-map.yaml`。

- **Think Before Coding**：不要替用户静默选择高影响解释。假设会影响输出或风险时先说清；
  多个合理解释并存时先问一个关键问题。
- **Simplicity First**：实现当前请求所需的最小方案；不添加未请求的功能、配置、
  抽象层或兜底逻辑。简单任务可简化流程，但不能扩大 scope。
- **Surgical Changes**：只改和目标直接相关的行；不顺手重构、格式化、改注释或删除
  既有死代码。只清理本次改动新产生的孤儿 import / 变量 / 函数。
- **Goal-Driven Execution**：执行前明确完成状态；实现后用测试、脚本、读回文件或
  可观察检查验证。每个非平凡改动都应能追溯到用户请求或验证标准。
- **写/改 skill 先读手艺与保护区**：编辑任何 SKILL.md 或框架文档前，读
  `.claude/skill-os/skill-authoring.md`（正面手艺：根德性/六失败模式/修剪纪律）与
  `skill-invariants.md`（保护区 P1-P7）。

**Plan Agent 原则：** 满足以下任一条件时，在执行前先读取
`.claude/agents/plan-agent.md`，输出结构化计划（阶段分解 + 编排模式 +
断言列表），复杂任务（Supervisor/Hierarchical 模式）
暂停等用户确认后再执行：
- 任务涉及 ≥ 3 个文件的创建或修改
- 任务需要 ≥ 2 个独立 subagent 协作（**内部 HITL 编排类 skill 除外**：`/auto`、`/deepresearch`、
  `/ux-research`、`/figma-demo`、`/muse-loop-orchestrate`——它们把多 subagent 编排设计成核心功能，这条对其恒真等于每次强制
  触发，且各自 SKILL.md 内含 fan-out 前的用户确认门；条件 2 对它们不适用，其余 4 条件仍正常触发。
  判定原则与名单的权威源见 `.claude/agents/plan-agent.md`「条件 2 豁免」段）
- 任务有明确的阶段依赖（B 必须等 A 完成）
- 任务涉及尚未批准的不可逆操作；已批准计划内 local exact commit 按 Git policy 收口，不重复进 Plan
- 用户明确要求：「先做个计划」、「plan 一下」、「想清楚再做」

**研究默认门：** 任务**同时复杂且新颖**（命中上面任一条件，且核心机制/交互无成熟先例）时，
研究阶段（`/deepresearch` 或 `/ux-research`，强度按 fact-gap 自适应）是**默认动作**。
跳过研究必须在计划中**显式声明理由并经用户确认，不得静默省略**。详见
`.claude/agents/plan-agent.md`「研究默认门」与 `.claude/skill-os/optional-workflow-graph.yaml`
`research_default`。

---

## Loop 宪法（依据 framework-audit/proposals/2026-07-10-loop-*.md）

1. **Inner loop 不重造**：gather→act→verify 是模型/harness 原生资产，框架只喂输入，不中途切碎。
2. **Outer loop 默认薄**，只用四原语：停止条件（绿灯即停/硬上限）、spec/eval 信号、人类卡点、记忆写回；硬任务可升结构化档，仍只用四原语。
3. **复杂度双向自证**：新增须可测地改善结果；既有结构定期用数据复核，不划算就砍。
4. **优先接 harness 原生原语**（/loop、schedule、ralph-wiggum、ScheduleWakeup、Workflow），不自建平行机器。
5. **自主度是旋钮**：新/真任务默认低自主短皮带；iteration/cost 上限是承重不变量，须验证真生效、永不默认无限。

---

## Context 工程协议

> Context 窗口是有限资源。主 Agent 必须主动管理，防止溢出导致状态丢失。

### 触发 Checkpoint 的条件（满足任一即写）

- 当前 session 已启动 ≥ 2 个重型 Agent（每个 runtime > 5K tokens）
- 多 Phase 任务完成一个 Phase 后
- 即将执行不可逆操作（git push、批量文件覆盖）前
- 感知到 context 已消耗约 60%（以对话轮数 > 20 作为近似指标；route-guard 在第 20/40 轮
  及此后每 20 轮提醒，100 轮封顶）

### Checkpoint 写法 与 PROGRESS.md

- 执行 `/compact` 前必须先写 Checkpoint（确保状态不丢失）
- Checkpoint 写入 `docs/handoff/YYYY-MM-DD-<topic>-checkpoint.md`，五要素：已完成✅ /
  进行中 / 待执行 / 关键决策 / 恢复指令
- 多 Phase 长任务（≥3 Phase）开始时初始化 `docs/PROGRESS.md`，每 Phase 完成后更新；
  session-restore.mjs 启动时自动显示前 25 行
- 写法模板与更新规则全文见 appendix「Checkpoint 写法」「PROGRESS.md 更新规则」

### 懒加载原则（节省 context）

不在 session 开头全量读；只在真需要时 Read；长文件（>200 行）先读前 50 行确认结构再按需读具体段落；Agent 的 prompt 只传其实际需要的上下文，不传完整会话历史。

Agent prompt 预算细表见 appendix「Agent Context 预算」。

### 新 Session 恢复协议

1. 读 `docs/handoff/` 中最新的 checkpoint 文件
2. 运行 `bash scripts/verify.sh` 确认当前文件状态
3. 从 checkpoint 的"待执行"继续，不重复已完成项

### 框架建设预算（2026-07-03 P2-8）

纯框架自建 session **每月建议 ≤2 次**（软上限；红线/CI 红/安全修复不受限；响应式优先于预防式）；治理产出批处理、攒批到季度裁决。依据全文见 appendix「框架建设预算」。

---

## 三层记忆系统

三层：**Episodic**（session 结束写，`memory/episodic/`）/ **Semantic**（候选过 review
晋升，`promoted-facts.yaml`）/ **Procedural**（已并入 Semantic domain:skill-rule）。
懒加载优先，避免 session 开头全量读取。

### 读取协议（懒加载）

四个脚本、完整调用语法见 `memory/README.md`（`--summary` 由 session-restore 自动跑，其余按需手调）。规则（强制，不可从脚本用法反推省略）：
- 启动协议只使用 `get_memory.py --summary`，不得全量读取 episodic/semantic/eval 长历史。
- 具体任务优先运行 `search_memory.py "<task/skill/topic>" --limit 5`，再决定是否读取命中的层或文件。
- **检索改变了行动时补跑 `search_memory.py --mattered "<query>"`**（ADR-0006 唯一主观信号；query 拆关键词，引擎是关键词匹配非语义）。
- `get_memory.py --layer ...` 只用于明确需要某层内容时；不得替代任务相关检索。
- `consolidate_memory.py --json` 是治理入口，默认只读 dry-run；普通 skill 启动不运行。
- 不直接读取 `memory/episodic/index.jsonl`、`semantic/candidates.jsonl`、`semantic/reviews.jsonl`、`evals/eval-log.jsonl` 等长文件，除非进入治理/复盘/调试场景。

### 写入协议

**第 0 步——先过门槛再谈归属：默认不存。** 仅命中 `.claude/skill-os/extraction-bar.md`
四强信号才提取（速记：①明确纠正或对未来行为明确指示 ②二次复发 ③真实返工或不可逆险情
④重获成本高且确定复用；定义与按层分级以该文件为准，勿在别处复制全文）。
一次性问答、答案可从文档重推、纯执行无判断 → 一律不存。
提取时机：person/项目层只在 session 结束 Stop 拦截时统一裁决一次，对话中途仅信号①允许即写。

**中途纠正 A 与绕行入库 B 都须过归因阶梯 L1-L5**（判据/矩阵/三条件/退化触发器全文见
`.claude/skill-os/correction-attribution.md`，勿在别处复制）：A 判「同样输入重跑还复现吗」→不复现只修
内容(L1/L2)、复现升 skill(L3)/框架(L4)；B 判「根因在自有系统吗」→是则升源头修复、记忆只存指针+兜底，
否则才存绕法。归因≠提取：仍走四信号+三分表。

**写入前先裁决归属（三分，别二分）。** 每条待存经验先问一个还原问题：

> **「换一个完全无关的项目、甚至重建 luca_gstack，这条还成立 / 还有用吗？」**

| 这条经验是… | 存哪 | 落点 |
|---|---|---|
| 跟项目无关、跟框架无关，只关于 **luca 这个人怎么工作**（偏好 / 反复纠正 / 行为教训） | **全局个人记忆** | 仅信号①直写 `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/feedback_<slug>.md` + `MEMORY.md` 索引；信号②③④写 `candidate_feedback_<slug>.md`（同目录、不进索引），每日治理列入 digest 待 luca 裁决 |
| 只在 **luca_gstack 框架内**成立（skill 规则 / 路由 / 品牌 / 跨项目方法论） | **框架 semantic 候选** | `propose_semantic.py`（走门禁晋升，红线 [SC-20260523-003]） |
| 只对**某个具体下游项目**成立（部署坑 / 状态真值路径 / 项目结构） | **该项目本地记忆** | `~/Desktop/项目/<name>/.luca/memory/MEMORY.md`（只在该项目激活时注入）；单次经历另走 episodic |

附加：**四信号全不中→不存，以 `NONE` receipt 解锁；旧 marker 仅提示、不放行。** 无产出且工具不足仍不拦截、不提醒。
项目本地记忆与全局个人记忆的区别：全局每 session 无差别注入，项目本地只在 `project.sh switch/new` 激活该项目时注入——具体项目事实务必入项目本地，避免跨项目上下文污染。

**写入脚本**：`append_episode.py`=Episodic、`propose_semantic.py --domain <...>`=Semantic
候选（参数见 `memory/README.md`；`--decision`/`--next-risk` 有非显而易见判断时必填）。

### 自动自成长（auto-grow）

三环闭环：**捕获**（Stop hook）→**治理+晋升**（`daily_governance.py` 只晋升门禁内候选）→
**回看**（启动提示 digest）；机制细节全文见 appendix「自动自成长」。**项目级检索**：
`search_memory.py --project <名>`。

### 关键约束速查（Static Fallback — 脚本失败时此节仍有效）

> 本节为 semantic memory 的**关键子集**（宪法级：品牌锁 / framework 只读 / 架构 / 红线），
> 由 `memory/semantic/static-fallback-allowlist.txt` 白名单管控、每 session 注入；脚本失效时此节优先。
> **完整稳定事实见 `promoted-facts.yaml`，按需 `search_memory.py` 检索——niche 操作型事实不进本节。**

- [SF-002 / fxui] HTML 原型必须基于 framework/ 目录母版，framework/ 为只读保护区不得直接修改（不因 CRM profile 是否激活而失效——保护磁盘资产，与场景无关）
- [SF-003 / workflow] Skill-first, Graph-optional 架构：每个 skill 默认 standalone 可用，Workflow 仅在用户主动选择流程时启用
- [SF-005 / workflow] 产品设计场景四类（产品中性，跨项目适用）：A=新功能、B=已有功能优化、C=线上评审改版、D=Agent化改造；分类由用户/上下文确认，非绑定任何具体产品
- [SC-20260523-001 / crm] CRM objects use stable IDs（仅 CRM profile 激活时适用）
- [SC-20260523-002 / skill-rule] route-guard: 老项目/已有项目/继续项目必须先触发 Project Gate，列出或确认项目；不得直接解释为场景B已有功能优化或进入单个 skill
- [SC-20260523-003 / skill-rule] memory: 稳定事实不得直接写 promoted-facts.yaml；必须先写 semantic candidate，经过 consolidate/review 的 promotion_ready 门禁后才能晋升；普通启动只用 summary/search，治理时才运行 consolidate_memory.py --json

> 维护规则：本节只镜像 `static-fallback-allowlist.txt` 白名单内的宪法级/红线事实。新晋升的 stable
> fact **默认只入 promoted-facts.yaml（search-only），不自动进本节**；三个 sync 写入口
> （consolidate/review/propose）均按白名单门控。要让某事实进每-session SF，须人工把其 id 加入白名单
> （改白名单 = 改每 session context 注入面，慎重）。

> 详细脚本用法见 memory/README.md

---

## 强制读完规则（全局）

**在执行任何任务之前，必须完整读完所有被指定的 skill 文件和上下文文件。**
每个文件必须读到最后一行，包括末尾的 `<!-- FILE_END: xxx -->` 标记。
**判断标准：能否复述文件最后一节的内容？不能 → 还没读完。**

---

## luca_gstack

本项目使用 luca_gstack skill 集。skill 集位于 `.claude/skills/office/`。

**环境/项目剥离原则：**
`luca_gstack` 是运行环境，只保留 skills、hooks、framework、scripts、memory 和
observability。项目产出和项目状态属于当前激活项目，固定放在
`/Users/luca/Desktop/项目/<项目名>/`。

- `docs/` 必须是 symlink，指向当前项目的 `docs/`。
- `.claude/workflow-state.yaml` 必须是 symlink，指向当前项目的 `.luca/workflow-state.yaml`。
- `.claude/current-topic.txt` 必须是 symlink，指向当前项目的 `.luca/current-topic.txt`。
- 切换/新建项目只能执行当前 `UserPromptSubmit` 的 route-guard 生成的**完整事务命令**
  （含 `--session-id`、`--tx`、`--expected-epoch`）；禁止手写裸
  `scripts/project.sh switch/new <项目名>`。事务完成后运行 `npm run check:project-links`
  验证 docs/state 指向同一项目。
- `memory/**` 和 `.claude/observability/**` 是跨项目经验层，不随项目切换。

`luca_gstack` 是 Skill OS，不是强制 workflow engine：
- 每个一级可见 skill 默认可以 standalone 使用，除非对应 `SKILL.md` 明确声明只作为下游工具。
- Workflow 只在用户选择流程化工作时启用，用于推荐路径、handoff gate、
  状态恢复和下游建议。
- Workflow gate 不得阻止 standalone skill，除非该 gate 同时也是质量或安全 gate。
- skill 之间通过 `docs/**` artifacts、稳定 ID 和 output path 协作。
- 具体输入模式以 `.claude/skill-os/input-modes.yaml` 为准；可选编排以
  `.claude/skill-os/optional-workflow-graph.yaml` 为准。

**全局共享规范读取：**
每次 session 启动后，如果用户涉及任何 skill 操作，先读取：
`.claude/skills/office/SKILL.md`（包含 Voice/Completion Status/品牌约束等共享规范）

**一级可见 skill 列表（斜杠命令）：**

| 命令 | 适用场景 | 用途 |
|------|---------|------|
| `/office` | — | 显示一级可见 skill |
| `/auto` | A B C D | **全自动多 Agent 编排**：自然语言需求 → 自动 Skill Pipeline → 并行执行 → 聚合产出 |
| `/idea` | A B | 已有原始语料忠实结构化（会议纪要/语音稿/讨论记录转需求，不延展不推断；新想法的方向探索/需求梳理走 /brainstorm，不走 /idea）|
| `/deepresearch` | A B D | 多 Agent 深度研究（产出研究报告，可作为 brainstorm 输入）|
| `/quick-research` | A B D | 轻量研究（单 agent 后台查 primary source，单文件落盘；三档研究的中档，发散题升 deepresearch）|
| `/insight-synthesis` | A B D | 一手定性综合：用户提供的访谈/工单/回访 → observation+interpretation 两层洞察（第三对象角度·内部一手；消歧见 appendix「insight-synthesis 划界」）|
| `/research-kit` | A B D | 一手研究工具设计：假设→访谈提纲/问卷/可用性测试计划/卡片分类法（采集之前；三不产：不产发现/解读/不采集；采回数据投 insight-synthesis）|
| `/ux-writing` | A B C D | 内容与语言设计：voice/tone+微文案系统+文案评审改写；双相位（语义规范 pre-brief 供 design-brief 继承进 Packet / 逐字层仅本地生成不进 OD；D=hedging 主战场）|
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD（替代原 /prd）|
| `superpowers:brainstorming` | A B | 轻量设计文档（superpowers plugin，/brainstorm 的轻量替代）|
| `/ux-research` | A B D | 多维度UX深度研究（5+1并行agent，共识矩阵，苏格拉底审查）|
| `/ux-brainstorm` | A B D | **发散引擎**：研究/想法 → 2-3方案 + Oracle对抗 + 交互架构 + AI-Native判定（7逼问）|
| `/design-brief` | A B C D | **收敛引擎**：方向 → 规格契约（决策卡/状态/组件映射/Generation Packet）；可独立，有 ux-brainstorm 产出则继承不重做 |
| `/open-design` | A B C D | **Open Design 产出（设计产出首选）**：需求→OD 指令→选 platform+design system→**默认桌面端生成（订阅会话可靠）+「拉回来」回收**（headless opt-in，失败降桌面端）→落盘+figma-layer；FxUI 只叠品牌色+文字色。全流程见 SKILL.md |
| `/html-prototype` | A B C | HTML 原型生成（备选，OD/MagicPath 不可用时） |
| `/ux-audit` | B C | UX 评审（多选模块） |
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格节点：PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：渐进式索引 + 断言矩阵 + 开发/测试任务卡，执行前必须通过门禁 |

**工程/质量 skill（代码层，非设计场景）：** `/code-hygiene` — 代码层工程约束：完成前验证铁律（done 前须有当场跑出的证据）+ 8 清理算子（只自动应用 HIGH 置信，luca 护栏保护 fail-open hooks/Static Fallback/兼容语义/WHY 注释）。审查优先复用 `redteam`/`quality-gate`（对得上就别重造）；既有资产与被审对象对不上时，按 routing-chain-check R4 自建评审编排是合法且更优的（禁的是重复造同款常驻 reviewer，不是禁按场景定制）。可路由 + 斜杠调用，细节见 SKILL.md。

**Brownfield 正门 skill（代码层，非设计场景）：** `/code-recon` — 从现有代码起步：并行只读 recon 把代码库逆向成架构 brief（入口/模块/流程/数据模型/扩展点，标 VERIFIED vs INFERRED），作 `ux-brainstorm`/`design-brief`/`tech-spec` 的 `architecture_brief` optional 输入。native-first、只读不改；规模命中 ≥2 信号才**提示**下游装 codegraph MCP（`colbymchenry/codegraph`，不进 luca_gstack）。可路由 + 斜杠调用，细节见 SKILL.md。

**muse 专属 skill（muse 产品线）：**

| 命令 | 用途 |
|------|------|
| `/muse-loop-orchestrate` | 需求→原型自治 Loop 编排器：extract→triage→map→gen→judge 单向链（gen↔judge 有界内循环），自带两个不可省略人类卡点（GATE-1/GATE-2）。触发短语见 `.claude/skill-os/skill-routing-map.yaml`（复合词，不撞现有 brainstorm/html-prototype/design-brief 词条）|
| `/muse-req-triage` | 批量候选需求 triage：rule-based 打分 + 独立分类，产出待裁清单。双入口：独立使用（入口A，筛过再投 `/brainstorm`）或被 `/muse-loop-orchestrate` 内部 dispatch（入口B）|

**语义兜底（route-guard 词表不中时同样适用）：** 用户描述"筛一遍这堆需求"、"要不要先过一遍再进 brainstorm"这类批量需求预筛意图 → `/muse-req-triage`；"从需求到原型跑一遍完整流程/闭环"这类端到端自治编排意图 → `/muse-loop-orchestrate`；"这假设没数据支撑/得去问问真实用户/怎么验证这个前提"这类**需一手采集但工具还没有**的意图 → `/research-kit`（产提纲问卷，不代采集）；"这些提示语太生硬/空状态该说什么/报错文案改改"这类**界面语言**意图 → `/ux-writing`；"访谈做完了/收了一批工单反馈/回访记录在手，看看说明了什么"这类**一手定性数据已在手**的意图 → `/insight-synthesis`（observation+interpretation 两层，不臆造语料）。

**隐藏/高级 skill：** `challenge`、
`redteam`、`evals`、`retro`、`careful`、`compare`、`figma-demo`、`magicpath`。
这些不占一级入口（无斜杠命令、不在 `/office` 展示），由 agent 按名调用（如 `open-design`
备选链内部 dispatch `magicpath`）。**「不占入口」≠「等点名」——执行中命中其场景时主动提出是
义务不是推销**（luca 不可能记得点名低频 skill）：评审/复审 → R4 资产分流；多方案对比 →
`compare`；大流程收尾 → `retro`（route-guard 40 轮钉兜底）；场景 A PRD 后 → `challenge`
（brainstorm Phase 7 钉兜底）。仅"用户未表达且场景未出现"时不提。
**兼容语义：** 用户说「写 PRD」时路由到 `/brainstorm`；不再暴露独立 `/prd` 命令。

**使用即留任原则（skill 输入面治理）：** 判据是**场景**不是时长——数该 skill 的触发场景在**60 天窗口内**发生几次（上下游产物 mtime 代理；口径表/豁免白名单**单真值源 = `scripts/check-skill-scene-coverage.py` TABLE**，散文不复制）。**分母为 0 或 skill 未满窗口一律不处置**——场景没发生推不出没价值（luca 长期修框架期间，研究/内容类 skill 零使用毫无信息量）。窗口内场景 ≥3 次（初始阈值，随治理复盘校准）且**强代理**而零调用 → 才降级为隐藏（撤入口；磁盘零删除，随时可恢复）；弱代理只出 DORMANT? 待人工确认。**两条硬豁免：**①SKILL.md 声明「非降级信号」+进脚本白名单（双确认，selftest 守护）不适用本规则；②`skills_used` 字段脏（7 月缺失率 52%）不得单独作判据，以产出文件为准。执行者挂月度演进提示（session-restore 同场治理行；仅本地，CI 无仓外数据）。

**场景说明：A = 新功能设计，B = 已有功能优化，C = 线上评审改版，D = Agent
化改造（把现有功能从"用户手动"变为"用户监督 Agent"）**

> 完整触发词表见 .claude/skill-os/skill-routing-map.yaml

---

## 路由层级（优先级由高到低）

route-guard 在每次 UserPromptSubmit 时自动评分，Claude 必须遵守输出的路由决策：

| 层级 | 触发条件 | Claude 行为 |
|------|---------|------------|
| **项目上下文门禁** | route-guard 输出 `PROJECT GATE` | 先确认/切换项目；“老项目/已有项目/继续项目”不得直接进入场景B或单个 skill |
| **Plan Agent 层** | route-guard 输出 `PLAN MODE`（复杂度分 ≥ 6，**关键词近似判定**）**或** `PLAN CHECK`（命中 `HEAVY_ORCHESTRATOR_SKILLS`——tracked settings.json env 注入 `ROUTE_GUARD_HEAVY_SKILLS=muse-loop-orchestrate`（auto 2026-08-03 移除做截流实验，见 plan-agent.md），两检出一致生效，命中即升 PLAN_CHECK；deepresearch/ux-research/figma-demo 靠各自内部 HITL 门，见 plan-agent.md「条件 2 豁免」）**或** 命中 skill 满足 Plan Agent 5 条件之一（**`.claude/agents/plan-agent.md` 触发条件表是唯一权威口径**；PLAN MODE 是其关键词近似、研究默认门 = 5 条件 + 新颖，均从属于它） | 读取 `.claude/agents/plan-agent.md`，输出 Phase 计划，等用户确认后进入 Orchestrator |
| **Multi-Skill 层** | route-guard 输出多候选（置信度低，无法自动决策）| 向用户列出候选 skill 组合，询问确认顺序后依次执行；或建议 `/auto` |
| **Single-Skill 层** | route-guard 输出单一高置信命中，**且** 命中 skill 不触发 Plan Agent 5条件 | 直接调用对应 skill |
| **低置信兜底** | route-guard 输出 `STOP`（零关键词命中）| 按下方「语义路由契约」裁决：语义高置信直接路由；多个合理一次一问；无推断依据 → 展示软候选或 /office 列表请用户选。禁止无依据自行执行 |

**严禁：** 忽略 route-guard 的 `PLAN MODE` 输出而直接路由到单个 skill。

### 语义路由契约（通用，2026-07-12）

route-guard 是跑在我读到 prompt 前的关键词粗网、无语义能力：PLAN/MULTI/SINGLE 命中照常遵守，
**但它的 STOP / 漏命中永不豁免我的语义评估**。本文件声明的语义特例交接（现为：单点交接 OD、项目归属
自判、侧栏感知、luca-open 文件预览等）统一为**一条**通用反射——**每次请求开始、以及执行途中冒出新
子目标 / 范围变化 / 新的设计或工程需求时**，我都以「含义」判断该请求是否映射到某 skill / 某流程（设计链
/ 工程链 / Plan Agent）/ 本文件声明的工具动作（含 muse 工具通道），据此路由，不等用户说对触发词。分寸闸双向：① STOP /
漏命中 ≠「无 skill」，含义对上就路由；② 真·单文件 / 机械 / 一次性小改动走平凡任务豁免、不硬套 skill/流程。
裁决：高置信直接路由；多个合理一次一问；实质功能 / 代码需求先过 Plan Agent 5 条件；dispatch 前过
**链路检查**（R1 研究前置-仅裸奔点 / R2 OD-first / R3 端到端确认 / R4 评审请求按对象分流-资产索引非决策树，
全文 `.claude/skill-os/routing-chain-check.md`）。
**边界（乙类不适用）**：
记忆检索时机、模型选档、checkpoint、research 门、observability、Coding Discipline、handoff/单真值源纪律是
**常驻过程纪律、非路由目标**，靠 hook 确定性或编排层强制，不塞进"按含义路由"（用户显式点名某项仍照做——
排除的是当语义识别目标，不是拒绝执行）。

---

## Skill 调用规则

先执行项目上下文门禁。门禁通过后进入 skill 路由。

**触发词唯一真值源：`.claude/skill-os/skill-routing-map.yaml`**（含项目 skill 与内置/外部
skill 全部词表）。route-guard 每条消息按 yaml 匹配并注入路由提示，Claude 遵循提示即可；
本节只保留词表无法表达的**语义规则**：

- **组合升级 `/auto`：** 「CRM/商机/客户管理 + 设计类词」或一句话里含多个 skill 的产物诉求
  → `/auto`（多 skill 组合时优先于单个 skill；这是组合判断，词表不覆盖）
- **`/idea` 边界：** 仅限"已有原始语料忠实结构化"（会议纪要/语音稿/讨论记录）；
  新想法 / 方向探索 / 需求梳理一律走 `/brainstorm`，不走 /idea
- **兼容语义：** 「写 PRD」→ `/brainstorm`（不暴露独立 /prd）；「快速梳理/轻量PRD」→
  `superpowers:brainstorming`（轻量替代，通过 Skill tool 调用）
- **浏览 vs 研究：** 「看看竞品/截图」→ `agent-browser`（快速直观浏览）；
  「竞品分析/UX研究」→ `/ux-research`（完整多维研究）
- **ux-brainstorm vs design-brief 定位（避免误用）：** ux-brainstorm=发散引擎（出 2-3 方案+Oracle对抗+交互架构+AI-Native 判定）；design-brief=收敛引擎（把方向落成规格契约）。决策规则：① 简单/单方案明确 → design-brief 单独跑；② 复杂/多方案/高不确定 → 先 /ux-brainstorm 再 /design-brief（design-brief 自动继承上游 AI-Native 判定与已验证假设，不重做发散）；③ 二者永不并列产同类文档。
- 提到「Open Design / OD」要出设计 → `/open-design`（**设计产出首选**：交互文档 → OD 出 HTML →（可选）Figma）。
- **单点交接到 OD（语义识别非词表）**：用户以**任何措辞**表达「把刚产出/被点名的产物交给
  Open Design 生成设计」→ `/open-design` adhoc 单点交接。三要素：①明确源产物 ②目标是
  OD ③意图是"交它生成设计"；执行前一句话确认源产物（"用 OD 基于 <file> 生成，对吗？"）
  再路由；三要素清晰时 route-guard STOP 不豁免本判断。
- **界面产出备选链：** 首选 `/open-design`；OD 不可达 → `magicpath`；二者都不可用 → `/html-prototype`
- **状态工具意图：** 「状态/进度/做到哪了」→ 运行 `scripts/status.sh` 或读取 workflow-state，
  不是一级 skill

隐藏/高级 skill 不占入口但**不等点名**（口径与上文隐藏节一致，2026-08-03 统一）：
一般诉求优先路由一级可见 skill；**执行中命中隐藏 skill 的场景**（评审→R4、对比→compare、
收尾→retro 等）时主动提出是义务不是推销。

**不得直接回答用户请求而绕过对应 skill。Skill 有专门的执行流程。**
**平凡任务豁免（EP-20260703-056）：** **仅**真·单文件/纯机械/一次性小改动且 skill 流程不增值 →
直接执行，不强制过 skill；拿不准就声明「按平凡任务直接做」。**多文件特性/跨阶段/多功能诉求不适用**——
按上文「语义路由契约」评估该走的 skill/流程。

**route-guard 提示应遵守**；其失效（无 hint 输出）时，按本节语义规则 + 上节路由层级兜底路由。

**自动 Checkpoint 提醒：** route-guard 在第 20/40 轮及此后每 20 轮提醒写 Checkpoint
（100 轮封顶；harness 已原生自动摘要，不再建议 /compact）。

---

## Session 启动协议（每次 Claude Code 启动必须执行）

> **软链与并行安全（G6 2026-07-04 条件化清链 + 方案A 2026-07-08 会话级隔离；全文沿革见
> `.claude/skill-os/claude-md-appendix.md`）：** session-restore 仅在「冷启动 **且** 无活跃并行
> session **且** 未设 `SESSION_RESTORE_ALWAYS_CLEAR=1`」时清三软链（resume/compact/clear
> 保留；悬空链无条件清）。**会话级项目隔离：** `.claude/.session-project-<sid>` pin 是唯一真值，
> project-scope-guard 把本 session 对 `docs/`·workflow-state·current-topic 的读写重定向到 pin
> 项目绝对路径（软链退化为纯展示）；未绑定 session 写 `docs/` 直接 deny、读放行；pin 只在用户
> 显式声明/确认项目时写、永不从软链派生、漂移永不自动认领。继承态（并行保留的激活项目）做实质
> 项目任务前先声明/确认。回归：`scripts/test-project-scope-guard.mjs`。

**按顺序执行以下步骤：**

0. `python3 memory/scripts/get_memory.py --summary`（只看摘要不读长文件）；首条任务明确后
   `python3 memory/scripts/search_memory.py "<task/topic>" --limit 5` 做任务相关检索。
1. 读 `CONTEXT.md`——「红线」节约束本 session 全部操作。
2. 读 `.claude/workflow-state.yaml`：`topic`/`scene` 定当前上下文；有 `IN_PROGRESS` 节点 → 告知用户「上次 session 在
   {节点名} 中断，是否继续？」。
3. 有 DONE 节点 → 读 `docs/handoff/` 最新 handoff summary 并遵守其约束（缺文件跳过不报错；
   不读上游完整 SKILL.md 或产出全文，用 handoff summary 替代）。
4. 涉及 skill 操作时读 `.claude/skills/office/SKILL.md`（共享规范）；执行具体 skill 前跑
   `.claude/observability/scripts/get_rules.py <skill> <scene>`，只加载输出的短规则。

5. **项目上下文门禁**（第一条用户消息后执行，任何 skill 运行前必须通过）

   读取 session-restore 的项目列表，按顺序判断：

   > **总原则（命名即切换 + 语义自判）：** 项目归属是**语义判断不靠词表**（route-guard STOP
   > 不豁免你判断）；切换便宜可逆→不确认；仅"名字是我猜的新项目"留一句确认。
   > **绑定即注入：** route-guard 为确认/绑定项目准备 `SWITCH_ONLY` 事务；只执行其输出的
   > 完整 `./scripts/project.sh switch/new ... --session-id ... --tx ... --expected-epoch ...` 命令来注入项目
   > 记忆；**meta/框架/审计 session 只 Read 项目文件、不得 switch**（never-switch，luca 标注
   > 严重问题）。两条全文：appendix「Project Gate 附则」。

   **① 有激活项目 + 消息中无其他项目名/新项目信号**
   → 静默继续；有任务直接做，无任务才说一句「当前项目: {name}」
   → **继承态例外：** 激活项目是继承来的（route-guard 提示"当前激活 X（并行保留）"）时，命名即
     切换已生效——你一提别的项目名 / 语义上描述别的项目，我就按 ②③ 自动切，无需手动。**仅当**消息
     不指向任何项目、又要在这个从未确认过的继承项目上做实质任务时，才用一句话确认「在 X 上做，
     对吗？」再动手（防落错项目）。

   **② 消息点到已有项目名 / 语义指向某已有项目**（匹配项目列表某一项）
   → **命名即切换**：执行 route-guard 本轮给出的完整 `switch` 事务命令，成功后立即结束本轮；下一轮一句话告知「已切到 {name}」，
     **不等确认**（便宜可逆；点到即切正是所需）。想只引用不切换时，用户会说"不用切 / 当前项目"。

   **③ 消息表达新项目 / 语义自判是新项目**（含直接调用 `/brainstorm` `/idea` `/auto` 等且无明确当前项目）
   → **明说**是全新项目（或明确"新做一个 X"）：从描述推断候选名（如"商机管理"→"crm-bizop"）
     → 执行 route-guard 本轮给出的完整 `new` 事务命令（**它会 detach 当前、把软链重指到新项目**）→ 成功后立即结束本轮，下一轮一句话告知
     「已新建并激活 {name}」→ 直接执行原始请求，**不等确认**。
   → **没明说、但用户诉说一个大需求/新方向，你据语义判断是新项目**：**一句话确认**——「听起来是
     新项目「{name}」，我从当前 {cur} 切出去新建，对吗？」→ 确认后 `new {name}`。（只有这格确认：
     名字是我猜的、新建会 detach 当前、较重。）

   **④ 用户说老项目/已有项目/继续项目但没有项目名**
   → 列出现有项目，让用户选择。不得把“老项目”直接解释为场景 B「已有功能优化」。

   **⑤ 无激活项目 + 无法判断**
   → 问：「新项目还是继续老项目？」

   **规则：禁止自动创建 `default`；确认步骤最多 1 句话；中文项目名 OK；
   纯闲聊、框架自身问题、与任何项目无关的一次性咨询/内容任务（翻译、解释、写封邮件）
   → 直接回答，不问项目归属（语义判断，route-guard 的 gate hint 仅是粗网提示）**

**启动后不需要主动汇报以上步骤，
除非发现需要用户知道的重要状态（如中断恢复、连续失败告警）。**

## Orchestrator 模式

用户经 `/office` 选流程或说"继续流程/进入下一步/从断点恢复"时进入；详细规范
`.claude/agents/orchestrator.md`。关键约束：Orchestrator 是主 session 行为模式**不是**
subagent dispatcher；skill 内部可自由用 subagent；每 skill 完成必写 handoff summary
（`references/handoff-protocol.md`）；连续 2 个重型 skill（>20K tokens）后建议 compact
或新 session；每 Phase/Skill 完成后执行观察提取（orchestrator.md §2c-obs）。

## Standalone / Workflow 执行模式

用户点名 skill → standalone 优先（只要求该 skill 自己的输入与质量 gate，不强制补齐上游
链路）；选 `/office` 流程或说"按流程走" → workflow mode（可检查上游产物/状态/handoff
gate）。handoff 分级：workflow 模式必写；standalone 模式 + 轻量 skill（frontmatter
`context-cost: lightweight` 或 `runtime-estimate ≤ 5000`）+ 产出为终端交付
（无下游 skill 消费）→ 免写 handoff，DONE 合法；standalone 重型 skill 仍须写。

---

项目根目录的 `CONTEXT.md` 是跨 session 的长期项目约束文件；精细历史检索优先走
`memory/scripts/search_memory.py`。**每个下游项目根也有自己的 `CONTEXT.md`**（2026-07-09 M3：
`project.sh new/switch` 会补骨架，激活/绑定时自动注入，硬预算 ≤80 行）——以下写入时机对
**当前激活项目**的 CONTEXT.md 同样适用；项目决策台账在 `.luca/memory/decisions.md`（just-in-time，
不注入）。

**写入时机：**
- **项目入场认知落盘（主路径，外部 repo 项目也适用）**：进项目先摸结构（ls 项目根 + 读
  README/HANDOFF）后，把一次性摸清的认知写进该项目 CONTEXT.md——下次入场直接读，不重复摸
- 高级 retro 复盘发现有价值的操作改变 → 追加到 CONTEXT.md
- `/design-brief` 完成后 → 追加原生AI思维小结和假设风险
- 任何设计假设被推翻 → 追加到 CONTEXT.md
- 品牌/技术约束有新发现 → 追加到 CONTEXT.md
- 术语/领域词汇冲突当场收敛（2026-07-12，源 domain-modeling）→ 定案即 inline 写入激活项目
  CONTEXT.md 词汇节（`**术语**: 定义 _Avoid_: 别名`），**不攒批**——与 extraction-bar 的记忆
  批处理并行不悖（对象是术语表非记忆）

---

## 产出目录结构

`docs/evaluation/` 是受保护 glob 路径，规则见 `.claude/skill-os/skill-invariants.md`。
需要确切结构时 `ls`/`tree` 现查，不必记此文档——目录本身就是最新真值。

---

## luca app 集成（**仅 `LUCA_APP=1` 或用户要「在 app/侧栏看」时适用；云端/headless/非-Claude 跳过**）

- 用户要"打开/查看某文件（在 app/新页签看）"→ `bash scripts/luca-open.sh <绝对路径>`
  （只读预览；相对路径先解析为绝对路径；文件不存在报错勿猜路径）。
- **HTML 产物主动推送（乙类过程纪律）：** Bash 产出/修改 `.html` 后**主动** luca-open
  （预览热刷新、复用页签、每文件一次即可；Write/Edit 产物已由 post-edit hook 自动开，
  07-24 收窄至仅 Bash 产物）。
- **Figma 写入后主动开侧栏（乙类）：** 凡向 Figma 写入完成后主动在侧栏打开结果，不等
  用户开口；做法全文见 appendix「luca app 侧栏感知」。
- **侧栏当前页感知（乙类，语义识别非词表、STOP 不豁免）：** 用户说"看看我侧栏/当前页/
  基于侧栏这页做…"→ `bash scripts/luca-sidebar.sh` 取 meta；取内容**源头优先于 DOM**
  （GitHub→gh / 文档→WebFetch / X→FxTwitter / 本地 HTML→Read；兜底 capture）；15s 超时
  =app 未运行，**如实报告不臆造**；完整四步见 appendix「luca app 侧栏感知」。
- **muse 工具通道（MCP，可见即优先）：** `mcp__muse__*` 工具可见（app 内嵌 session）时，
  查工作台/截像素自验 UI/开文件网页分屏/定位读取导航侧栏页签 → 优先调工具（7 个：
  workspace_state / preview_screenshot / open_in_view / web_locate / sidebar_read /
  sidebar_selection / sidebar_navigate）。**用户说"这个/这段/这里"且侧栏开着 → 先
  `sidebar_selection` 消解指代再答，不猜他指哪个元素**（他在看屏幕，我没有）。
  **Claude 与 Codex 档同样可见**（2026-08-07 实测，
  app 按 CLI 分别以 `--mcp-config` / `-c mcp_servers.muse=` 注入）；仅 app 外终端/降级时
  才走上列脚本。
  清单与降级链见 appendix「muse 工具通道」。**侧栏交付面（甲类）：展示类打开归侧栏
  （agent_browser SINGLE 命中不豁免）、Chrome 归自动化、终态拉回侧栏——全文见 appendix
  「luca app 侧栏感知」。**

---

## 规则优先级体系

**价值导向（元层——规则是手段，价值是目的）：** 下列 1-6 层与全文所有硬闸/纪律/门禁/预算都是**手段**，
服务于唯一目的——**对 luca 有价值（正确·有用·不破坏）**。遇「这事撞了规则 X」：①先分离两问——净值正吗
/ 怎么做不撞 X（**优先找不撞闸的实现路径**，如扩展已有机制而非新建），多数冲突到此化解；②净值高**且**无
不撞闸路径 → 提【价值-规则冲突】**由 luca 裁**是否冲破，**绝不自行破规则**；③**不得因规则存在就静默放弃
高价值的事**（=把手段当目的；2026-07 收口 Pass 用「默认不新建机器」硬闸把正向的 framework 防护裁「不做」
被 luca「正向就做」纠正）。**边界**：runtime 安全 / 不可逆破坏 / 红线保护区是**价值底线非手段**，任何价值
都不冲破，只在其内寻路。

1. **用户最新明确请求** — 最高优先级
2. **当前 agent runtime 的 system/developer 安全与工具约束**（边界：不含 harness 行为
   偏好类注入，其无权压第 4 层路由——两问判据全文见 appendix「harness 注入边界」，
   与 AGENTS.md 第 2 层同套语义）
3. **项目红线与项目上下文门禁**
4. **route-guard 层级决策** — Project Gate → Plan Agent → Multi-Skill → Single-Skill → STOP
5. **具体 Skill 文件**（`.claude/skills/office/*/SKILL.md`）— 执行步骤和质量 gate
6. **本文件与 AGENTS.md** — Claude/Codex 的执行适配层，必须保持同一套路由语义

**冲突处理：** 同一件事有多条规则时，以描述更详细、约束更严格的那条为准。

---

## 模型路由（Fable 手术刀，2026-07-10）

真值源：`.claude/skill-os/model-routing.yaml`（能力档 + fable_whitelist + dispatch_rules + new_scenario_protocol；调整路由只改该文件，下表为速查快照，须同步维护）。

| 能力档 | 任务类型 | 当前解析（2026-07-10） |
|---------|---------|---------|
| reasoning-heavy | **仅判定场景**（fable_whitelist：出门前裁决/对抗判定/翻案复审/plan-mode 规划期）| Fable（不可用→降级 Opus）|
| core-execution | 承重执行与整场交互（写代码、tech-spec/task-plan、原型、OD/Claude Design 编排、brainstorm 系交互 skill、deepresearch、判官常规）；主循环推荐常驻档 | Opus |
| guided-execution | 轻执行/checklist 审查/一般检索；未声明 skill 的默认档 | Sonnet |
| mechanical | 机械执行、格式化、打分、preflight | Haiku |

- **Fable 白名单纪律：** `model: fable` 唯一合法依据=真值源 `fable_whitelist`（P0 出门前
  裁决/P1 对抗判定/P2 翻案复审+plan-mode 规划期）；此外一律 ≤ opus，拿不准用 opus；
  fable 不可用 → 自动降 opus 并告知用户。
- **主循环：** /model 是用户主权（框架无法中途切）；推荐 opus 常驻，fable 经白名单点状
  dispatch；重大架构/审查日可手动 `/model fable` 起 session。
- **强制传参：** spawn subagent 按真值源解析 tier→alias 显式传 Agent tool `model` 参数
  （frontmatter pin 可省略；Workflow 工具豁免）——见 orchestrator.md §5 与 dispatch_rules。
- **新场景入场：** 新增 skill/agent/节点须同一改动中按 `new_scenario_protocol` 三问声明
  档位，不得静默吃默认档；daily_governance tripwire 兜底告警+每日校验真值源一致性。
- 档位名是**别名**（档内升级自动跟随零维护）；SKILL.md frontmatter `recommended-model`
  写档名（tier）。
- **活规则：** ①发现 `known_lineup` 未收录的档位变化 → 主动提示更新真值源，不得沉默沿用；
  ②**原生优先（native_precedence）**：Claude Code 原生动态模型调控发布 → 主动告知并提案
  本路由层让位为语义补充。

<!-- FILE_END: CLAUDE.md -->
