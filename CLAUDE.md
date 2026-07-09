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

---

## 核心行为原则

**并发原则：** 所有相互独立的工具调用必须在同一条消息中并发执行，不得串行等待。

**最小文件原则：** 不创建任何非任务必要的文件；优先编辑已有文件，而非新建。

**读前先写原则：** 编辑任何文件前，必须先用 Read 工具读取当前内容，再 Edit。

**最小注释原则：** 默认不写注释；只在"为什么这样做"不明显时写一行说明。

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

**Plan Agent 原则：** 满足以下任一条件时，在执行前先读取
`.claude/agents/plan-agent.md`，输出结构化计划（阶段分解 + 编排模式 +
断言列表），复杂任务（Supervisor/Hierarchical 模式）
暂停等用户确认后再执行：
- 任务涉及 ≥ 3 个文件的创建或修改
- 任务需要 ≥ 2 个独立 subagent 协作（**内部 HITL 编排类 skill 除外**：`/auto`、`/deepresearch`、
  `/ux-research`、`/figma-demo`——它们把多 subagent 编排设计成核心功能，这条对其恒真等于每次强制
  触发，且各自 SKILL.md 内含 fan-out 前的用户确认门；条件 2 对它们不适用，其余 4 条件仍正常触发。
  判定原则与名单的权威源见 `.claude/agents/plan-agent.md`「条件 2 豁免」段）
- 任务有明确的阶段依赖（B 必须等 A 完成）
- 任务涉及不可逆操作（git 操作、文件批量覆盖）
- 用户明确要求：「先做个计划」、「plan 一下」、「想清楚再做」

**研究默认门：** 任务**同时复杂且新颖**（命中上面任一条件，且核心机制/交互无成熟先例）时，
研究阶段（`/deepresearch` 或 `/ux-research`，强度按 fact-gap 自适应）是**默认动作**。
跳过研究必须在计划中**显式声明理由并经用户确认，不得静默省略**。详见
`.claude/agents/plan-agent.md`「研究默认门」与 `.claude/skill-os/optional-workflow-graph.yaml`
`research_default`。

---

## Context 工程协议

> Context 窗口是有限资源。主 Agent 必须主动管理，防止溢出导致状态丢失。

### 触发 Checkpoint 的条件（满足任一即写）

- 当前 session 已启动 ≥ 2 个重型 Agent（每个 runtime > 5K tokens）
- 多 Phase 任务完成一个 Phase 后
- 即将执行不可逆操作（git push、批量文件覆盖）前
- 感知到 context 已消耗约 60%（以对话轮数 > 20 作为近似指标；route-guard 在第
  20 轮起、每 10 轮自动提醒（无上限））

### Checkpoint 写法

写入 `docs/handoff/YYYY-MM-DD-<topic>-checkpoint.md`，必须包含：
1. **已完成**：每项用 ✅ 标注，列出具体文件和验证结果
2. **进行中**：Agent ID（如已失效注明）、负责内容
3. **待执行**：剩余任务的具体描述
4. **关键决策**：本 session 做过的重要判断（不可从代码推导的）
5. **恢复指令**：新 session 应该执行什么命令/读什么文件来接续

### PROGRESS.md — 实时任务进度

**触发条件：** 执行多 Phase 长任务时（≥ 3 个 Phase），在任务开始时初始化
`docs/PROGRESS.md`，每完成一个 Phase 后更新。

**更新规则：**
- 每完成一个 Phase → 移入"已完成 ✅"，更新 Last updated 时间戳
- 遇到卡点/决策 → 记录在"进行中 🔄"的说明内
- session 结束前 → 更新"恢复指令"

**session-restore.mjs 在每次启动时自动读取并显示前 25 行，无需手动操作。**

格式参见 `docs/PROGRESS.md` 模板。

### 懒加载原则（节省 context）

- 不在 session 开头一次性读取所有文件
- 只在真正需要某文件内容时才 Read
- 长文件（> 200 行）先读前 50 行确认结构，再按需读具体段落
- Agent 的 prompt 只传入它实际需要的上下文，不传完整会话历史

### Agent Context 预算

| Agent 类型 | 推荐 prompt 长度 | 原则 |
|-----------|----------------|------|
| Explore Agent | < 500 tokens | 只给搜索目标，不给背景 |
| Work Agent | < 2000 tokens | 给精确任务 + 必要文件路径，不给决策背景 |
| Eval Agent | < 1000 tokens | 只给断言列表 + 文件路径 |
| Plan Agent | < 1500 tokens | 给任务描述 + 约束，不给执行细节 |

### Compact 触发规则

- 完成一个完整 Phase 后，如果接下来还有 ≥ 2 个 Phase，执行 `/compact`
- 超过 30 轮对话后，在下一个 Phase 开始前执行 `/compact`
- Compact 前必须先写 Checkpoint（确保状态不丢失）

### 新 Session 恢复协议

1. 读 `docs/handoff/` 中最新的 checkpoint 文件
2. 运行 `bash scripts/verify.sh` 确认当前文件状态
3. 从 checkpoint 的"待执行"继续，不重复已完成项

### 框架建设预算（2026-07-03，全量搭建 review P2-8）

> 依据：review 发现 episodic 34-42% session 是 luca_gstack 自身框架建设（非下游项目产出），
> git 近 30 commits ~29 个是框架基建；"维护维护系统"的 session 链在自我复制
> （月度自进化→治理积压清算→健康度体检→体检收口→演进 digest……）。工具本身不应该
> 比它砍的柴还重。

- **软上限：** 纯框架自建 session（改 luca_gstack 自身 `.claude/`/`memory/scripts/`/`scripts/`，
  不产出任何下游项目 artifact）**每月建议 ≤ 2 次**；超出时先自问"这次框架改动是不是能等到
  真实使用中暴露问题再改"（by-design 的响应式改进优先于预防式重构）。
- **批处理优先：** 月度演进 scout、日常治理产出**默认攒批到季度裁决**，不追求每次发现都立即落地；
  见 `.claude/skill-os/evolution/digests/` 与本文件「治理 + 晋升」小节的降频规则。
- **不是硬门禁：** 本节是自省提示，不是 route-guard 拦截条件；真正的高优先级框架修复
  （红线违反/CI 红/安全问题）不受此软上限约束。

---

## 三层记忆系统

> 渐进式记忆，模仿 Hermes 自成长机制。懒加载优先，避免 session 开头全量读取。

### 三层结构

| 层 | 何时读 | 何时写 | 数据源 |
|---|---|---|---|
| Episodic | session 摘要/任务相关检索命中时 | session 结束后 | `memory/episodic/index.jsonl` |
| Semantic | session 摘要/任务相关检索命中时 | 候选通过 review 后晋升 | `memory/semantic/promoted-facts.yaml` |
| Procedural | ~~已并入 Semantic domain:skill-rule~~ | — | `get_memory.py --layer semantic --domain skill-rule` |

### 读取协议（懒加载）

四个脚本、完整调用语法与示例见 `memory/README.md`（`get_memory.py --summary` 已由
session-restore.mjs 自动跑；`search_memory.py`/`get_memory.py --layer`/`consolidate_memory.py --json`
按需手调）。规则（强制，不可从脚本用法反推省略）：
- 启动协议只使用 `get_memory.py --summary`，不得全量读取 episodic/semantic/eval 长历史。
- 具体任务优先运行 `search_memory.py "<task/skill/topic>" --limit 5`，再决定是否读取命中的层或文件。
- `get_memory.py --layer ...` 只用于明确需要某层内容时；不得替代任务相关检索。
- `consolidate_memory.py --json` 是治理入口，默认只读 dry-run；普通 skill 启动不运行。
- 不直接读取 `memory/episodic/index.jsonl`、`semantic/candidates.jsonl`、`semantic/reviews.jsonl`、`evals/eval-log.jsonl` 等长文件，除非进入治理/复盘/调试场景。

### 写入协议

**第 0 步——先过门槛再谈归属：默认不存。** 仅命中 `.claude/skill-os/extraction-bar.md`
四强信号才提取（速记：①明确纠正或对未来行为明确指示 ②二次复发 ③真实返工或不可逆险情
④重获成本高且确定复用；定义与按层分级以该文件为准，勿在别处复制全文）。
一次性问答、答案可从文档重推、纯执行无判断 → 一律不存。
提取时机：person/项目层只在 session 结束 Stop 拦截时统一裁决一次，对话中途仅信号①允许即写。

**写入前先裁决归属（三分，别二分）。** 每条待存经验先问一个还原问题：

> **「换一个完全无关的项目、甚至重建 luca_gstack，这条还成立 / 还有用吗？」**

| 这条经验是… | 存哪 | 落点 |
|---|---|---|
| 跟项目无关、跟框架无关，只关于 **luca 这个人怎么工作**（偏好 / 反复纠正 / 行为教训） | **全局个人记忆** | 仅信号①直写 `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/feedback_<slug>.md` + `MEMORY.md` 索引；信号②③④写 `candidate_feedback_<slug>.md`（同目录、不进索引），每日治理列入 digest 待 luca 裁决 |
| 只在 **luca_gstack 框架内**成立（skill 规则 / 路由 / 品牌 / 跨项目方法论） | **框架 semantic 候选** | `propose_semantic.py`（走门禁晋升，红线 [SC-20260523-003]） |
| 只对**某个具体下游项目**成立（部署坑 / 状态真值路径 / 项目结构） | **该项目本地记忆** | `~/Desktop/项目/<name>/.luca/memory/MEMORY.md`（只在该项目激活时注入）；单次经历另走 episodic |

附加：**默认不存——四信号全不中（含纯咨询 / 闲聊 / 纯执行）→ 什么都不存，落 marker 直接结束。** session-sync 已据此放过（无文件产出且工具调用不足不拦截、不提醒）。
项目本地记忆与全局个人记忆的区别：全局每 session 无差别注入，项目本地只在 `project.sh switch/new` 激活该项目时注入——具体项目事实务必入项目本地，避免跨项目上下文污染。

**三个写入脚本**（`append_episode.py` = Episodic，session 结束触发；`propose_semantic.py --domain <crm/fxui/...>`
= Semantic 候选，稳定事实待 review 晋升；`propose_semantic.py --domain skill-rule` = Procedural，
已并入 Semantic）——完整参数与示例见 `memory/README.md`，不在此重复。`--decision`/`--next-risk`
有非显而易见判断时必填，纯执行型任务可省略。

### 自动自成长（auto-grow，2026-06-05 起）

> 经验沉淀**不再依赖用户开口提醒**。三个自动环节：

1. **捕获（每 session 自动）：** Stop hook（`.claude/hooks/session-sync.mjs`）在「本 session 有实质工作
   （有编辑 或 工具调用 ≥8 次；纯轮次不拦截，HOOK-006）且尚未沉淀」时**拦截结束**，注入短指针
   （四信号速记 + `.claude/skill-os/extraction-bar.md` 路径，细则按需读；HOOK-007 锁定 ≤900 字符）
   要求当前 Agent 先就地裁决——过门槛的经验分
   **项目级**（`append_episode.py --project`，自动从 docs 软链推导项目）
   与 **通用**（`propose_semantic.py` 候选 ／ 全局 `feedback_*.md` 或 `candidate_feedback_*.md`）落地，
   全不中则直接 `touch .claude/.episode-written-<sid>` 解锁。三重防循环：`stop_hook_active` ／ 本 session marker ／
   `SESSION_SYNC_BLOCK=0` kill-switch；任何异常 fail-open（绝不卡住结束）。
2. **治理 + 晋升（每日检查，按需写 digest）：** `session-restore.mjs` 每天首次 session 启动时后台 detached 跑
   `daily_governance.py`（跑在 Claude 已获 Desktop 访问的 TCC 上下文，绕开 launchd 对 ~/Desktop 的 TCC 限制——见 review DG-01；
   `scripts/launchd/com.luca.memory-governance.plist` 是可选的真·无人值守路径，但需手动授 Full Disk Access）：消化候选 → **只晋升 promotion_ready 门禁内的候选**（红线 SC-20260523-003 不变，
   冲突/重复/borderline 留给你裁决）。**2026-07-03 治理降频（全量搭建 review P2-4，实测每日治理近4周
   空转率>90%）：只在有真实状态变化时才写 `memory/digests/<date>.md`；无变化则跳过写入，仅留
   `.checked-<date>` 轻量标记维持"每日一次"节流，改为**至少每 7 天强制心跳一次**（哪怕零变化，
   digest 头部会标注"周度强制心跳"以区分真实变化）。超期候选（`age_days` 达阈值）呈现升级为
   带一键命令的醒目行，不再逐日原样复读同一条（原有的告警疲劳问题）。
3. **回看（下次启动自动）：** `session-restore.mjs` 在 SessionStart 把最新 digest 提示一次。

**项目级 vs 通用检索：** episodic 记录带 `project` 字段；
`search_memory.py --project <名>` / `get_memory.py --layer episodic --project <名>` 按项目过滤
（无字段的历史记录用文本兜底匹配）。

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

**架构原则：Skill-first, Graph-optional。**

**环境/项目剥离原则：**
`luca_gstack` 是运行环境，只保留 skills、hooks、framework、scripts、memory 和
observability。项目产出和项目状态属于当前激活项目，固定放在
`/Users/luca/Desktop/项目/<项目名>/`。

- `docs/` 必须是 symlink，指向当前项目的 `docs/`。
- `.claude/workflow-state.yaml` 必须是 symlink，指向当前项目的 `.luca/workflow-state.yaml`。
- `.claude/current-topic.txt` 必须是 symlink，指向当前项目的 `.luca/current-topic.txt`。
- 切换项目必须使用 `scripts/project.sh switch <项目名>`，并运行
  `npm run check:project-links` 验证 docs/state 指向同一项目。
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
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD（替代原 /prd）|
| `superpowers:brainstorming` | A B | 轻量设计文档（superpowers plugin，/brainstorm 的轻量替代）|
| `/ux-research` | A B D | 多维度UX深度研究（5+1并行agent，共识矩阵，苏格拉底审查）|
| `/ux-brainstorm` | A B D | **发散引擎**：研究/想法 → 2-3方案 + Oracle对抗 + 交互架构 + AI-Native判定（7逼问）|
| `/design-brief` | A B C D | **收敛引擎**：方向 → 规格契约（决策卡/状态/组件映射/Generation Packet）；可独立，有 ux-brainstorm 产出则继承不重做 |
| `/open-design` | A B C D | **Open Design 产出（设计产出首选）**：编译需求成 OD 指令 → 评估并让你选 platform+design system → 绑定建项目 + 写 brief.md → **默认你在 OD 桌面端按生成（订阅会话，可靠）→「拉回来」回收**；headless 一次性出图为 opt-in（实测不稳/慢，失败即降级桌面端）→ 落盘 + figma-layer；FxUI 只叠品牌色+文字色，其余走所选 design system |
| `/html-prototype` | A B C | HTML 原型生成（备选，OD/MagicPath 不可用时） |
| `/ux-audit` | B C | UX 评审（多选模块） |
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格节点：PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：渐进式索引 + 断言矩阵 + 开发/测试任务卡，执行前必须通过门禁 |

**工程/质量 skill（代码层，非设计场景）：** `/code-hygiene` — 代码层工程约束：完成前验证铁律（声明 done 前必须有当场跑出的证据）+ 8 清理算子（死代码/循环/去重/类型/弱类型/防御性/遗留/slop，只自动应用 HIGH 置信；luca 护栏保护 fail-open hooks / Static Fallback / 兼容语义 / WHY 注释）。代码审查复用 `redteam`/`quality-gate`，不另造 reviewer。可路由（route-guard 触发词）+ `/code-hygiene` 斜杠调用。

**Brownfield 正门 skill（代码层，非设计场景）：** `/code-recon` — 从现有代码起步的入口：并行只读 recon 把已有代码库逆向成一份架构 brief（入口/模块/关键流程/数据模型/扩展点，诚实标 VERIFIED vs INFERRED），作为 `ux-brainstorm`/`design-brief`/`tech-spec` 的 `architecture_brief` optional 输入——让「先读懂代码再在其上做产品设计」成为正门（现管线默认从需求/语料起步）。native-first、零新依赖、只读不改代码；规模阈值命中 ≥2 信号才**提示**（不硬装）在下游项目装 codegraph MCP（`colbymchenry/codegraph`，装下游不进 gstack）。可路由 + `/code-recon` 斜杠调用。

**muse fork 专属新增 skill（本 fork 独有，母版 luca_gstack 无这些文件）：**

| 命令 | 用途 |
|------|------|
| `/muse-loop-orchestrate` | 需求→原型自治 Loop 编排器：extract→triage→map→gen→judge 单向链（gen↔judge 有界内循环），自带两个不可省略人类卡点（GATE-1/GATE-2）。触发短语见 `.claude/skill-os/skill-routing-map.yaml`（复合词，不撞现有 brainstorm/html-prototype/design-brief 词条）|
| `/muse-req-triage` | 批量候选需求 triage：rule-based 打分 + 独立分类，产出待裁清单。双入口：独立使用（入口A，筛过再投 `/brainstorm`）或被 `/muse-loop-orchestrate` 内部 dispatch（入口B）|

**语义兜底（route-guard 词表不中时同样适用）：** 用户描述"筛一遍这堆需求"、"要不要先过一遍再进 brainstorm"这类批量需求预筛意图 → `/muse-req-triage`；"从需求到原型跑一遍完整流程/闭环"这类端到端自治编排意图 → `/muse-loop-orchestrate`。`muse-proto-gen`（隐藏，仅被 `/muse-loop-orchestrate` 在 OD daemon 不可达时内部 dispatch，无独立入口）与 `muse-proto-judge`（agent 定义，同上仅内部调用）不对用户暴露。

**隐藏/高级 skill：** `challenge`、`handoff-review`、`design-review`、`taste-review`、
`redteam`、`evals`、`retro`、`careful`、`fx-icon-search`、`compare`、`figma-demo`、`magicpath`。
这些不作为一级斜杠命令暴露，不在 `/office` 展示，不主动推荐；需要时由
agent 直接读取对应 skill 文件或用 Skill 工具按名调用（如 `open-design` 的界面产出
备选链仍可内部 dispatch `magicpath`）。
**兼容语义：** 用户说「写 PRD」时路由到 `/brainstorm`；不再暴露独立 `/prd` 命令。

**skill 输入面收窄（2026-07-03，全量搭建 review P2-6）：** `compare`/`figma-demo`/`magicpath`
近 30 天 episodic 零调用记录，降级为隐藏 skill——磁盘目录与逻辑零删除，只撤销一级入口
（斜杠命令+路由词表+/office展示）。**使用即留任原则**：任一一级 skill 连续 60 天
`skills_used` 零记录 → 下次治理复盘时降级为隐藏（同上处理方式，不删文件）；
若用户明确要求某隐藏 skill 恢复一级曝光，随时可逆（加回路由词条+命令文件+表格行）。

**场景说明：A = 新功能设计，B = 已有功能优化，C = 线上评审改版，D = Agent
化改造（把现有功能从"用户手动"变为"用户监督 Agent"）**

> 完整触发词表见 .claude/skill-os/skill-routing-map.yaml

---

## 路由层级（优先级由高到低）

route-guard 在每次 UserPromptSubmit 时自动评分，Claude 必须遵守输出的路由决策：

| 层级 | 触发条件 | Claude 行为 |
|------|---------|------------|
| **项目上下文门禁** | route-guard 输出 `PROJECT GATE` | 先确认/切换项目；“老项目/已有项目/继续项目”不得直接进入场景B或单个 skill |
| **Plan Agent 层** | route-guard 输出 `PLAN MODE`（复杂度分 ≥ 6，**关键词近似判定**）**或** `PLAN CHECK`（命中 `HEAVY_ORCHESTRATOR_SKILLS` 扩展点——**本 fork 经 settings.json 注入 `ROUTE_GUARD_HEAVY_SKILLS=auto,muse-loop-orchestrate`，二者命中即升 PLAN_CHECK**；母版默认空、保留为 fork/env 扩展点，2026-07-04 起 deepresearch/ux-research/figma-demo/auto 靠各自内部 HITL 门，见 plan-agent.md「条件 2 豁免」）**或** 命中 skill 满足 Plan Agent 5 条件之一（**`.claude/agents/plan-agent.md` 触发条件表是唯一权威口径**；PLAN MODE 是其关键词近似、研究默认门 = 5 条件 + 新颖，均从属于它） | 读取 `.claude/agents/plan-agent.md`，输出 Phase 计划，等用户确认后进入 Orchestrator |
| **Multi-Skill 层** | route-guard 输出多候选（置信度低，无法自动决策）| 向用户列出候选 skill 组合，询问确认顺序后依次执行；或建议 `/auto` |
| **Single-Skill 层** | route-guard 输出单一高置信命中，**且** 命中 skill 不触发 Plan Agent 5条件 | 直接调用对应 skill |
| **低置信兜底** | route-guard 输出 `STOP`（零关键词命中）| 1. 若 hint 携带软匹配候选 → 直接向用户展示候选列表，说「我推断你想要 X，确认吗？」2. 若无候选（输入太简短或全是功能词）→ 展示 /office skill 列表请用户选择。禁止：无任何推断依据时自行执行 skill |

**严禁：** 忽略 route-guard 的 `PLAN MODE` 输出而直接路由到单个 skill。

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
- **单点交接到 OD（语义识别，不写死关键词）**：当你从用户的自然语言判断出「把刚产出/刚讨论出的
  某个产物（md/方案/文档）交给 Open Design 去生成设计」的意图——**措辞不限**（"给 OD"／"让 OD
  跑一下这个"／"用 OD 基于这个出图"／"丢进 OD"……都算）——路由到 `/open-design` 的 adhoc 单点交接。
  语义识别三要素：① 有明确源产物（刚产出或被点名）② 目标是 Open Design/OD ③ 意图是"交给它生成设计"。
  执行前先用一句话确认源产物（"用 OD 基于 <file> 生成，对吗？"）再路由。**这是语义判断不是词表匹配**：
  即使 route-guard 因无关键词输出 STOP，只要三要素清晰仍按本规则识别（这正是"结合语义、不靠词表"）。
- **界面产出备选链：** 首选 `/open-design`；OD 不可达 → `magicpath`；二者都不可用 → `/html-prototype`
- **状态工具意图：** 「状态/进度/做到哪了」→ 运行 `scripts/status.sh` 或读取 workflow-state，
  不是一级 skill

隐藏/高级 skill 不做主动入口；除非用户明确要求使用某个高级 skill，
否则优先路由到一级可见 skill。

**不得直接回答用户请求而绕过对应 skill。Skill 有专门的执行流程。**

**自动提示机制：** `route-guard.mjs` 在每次 `UserPromptSubmit` 时读取用户 prompt，
按 yaml 词表匹配后输出路由提示（含内置/外部 skill 建议），Claude 应遵守输出的建议。
route-guard 失效（无 hint 输出）时，按本节语义规则 + 上节路由层级兜底路由。

**自动 Checkpoint 提醒：** route-guard 追踪每 session 的对话轮数，在第 20 轮起每
10 轮自动提醒执行 `/compact` 或写入 Checkpoint。

---

## Session 启动协议（每次 Claude Code 启动必须执行）

> **重要（2026-07-04 G6 会话粘性修订，原"每次启动无条件清除"已条件化）：**
> `session-restore.mjs` 在 SessionStart 清除三个 symlink（`docs/`→项目 docs、
> `.claude/workflow-state.yaml`→state、`.claude/current-topic.txt`→topic）**仅当**：
> ① `source === 'startup'`（冷启动；resume/compact/clear 保留——恢复态清自己上下文是 bug）
> **且** ② 无活跃并行 session（探测他-sid 计数/transcript mtime < 15min）**且** ③ 未设
> `SESSION_RESTORE_ALWAYS_CLEAR=1`。悬空链（目标已删/改名）无视上述直接清（安全 gate）。
> **原设计意图仍在**（防跨 session 状态污染、走全新项目确认流程），只是不再牺牲并行 session——
> luca 常同时开多个 session（muse app 内嵌终端 + CLI + 不同项目），旧的无条件清会让任一新
> session 启动即清空其它 session 正在用的项目上下文（曾实测撞 3 次）。
> **后果（分两种）：**
> - **冷启动 + 无并行**：呈"无激活项目"，第一条消息触发 Project Gate（同旧行为）。
> - **保留态**（继承并行 session 的激活项目）：启动打印"当前激活项目: X（检测到活跃并行
>   session 已保留）"；此时首条消息 route-guard 提示"全局激活项目 X 仅供参考，本 session 尚未绑定"。
>   **命名即切换（2026-07-06）后无需手动 switch**：你一提别的项目名 / 语义上描述别的项目或新项目，
>   主 Agent 就按 Project Gate ②③ **自动切换/新建**（新建会 detach 当前）；消息不指向任何项目、又要
>   在这个继承（未绑定）态下做实质项目任务时，先声明/switch 再动手（否则对 `docs/` 的写会被
>   project-scope-guard 直接 deny）。Meta/审计/内容工具 skill 例外分支不变。
>   **并行安全（会话级项目隔离 = 真隔离，2026-07-08 方案A，取代旧"命名即切换 + 告警"）：** 激活项目
>   已从"工作目录属性"（全局共享软链）升级为"session 属性"——每个 session 的
>   `.claude/.session-project-<sid>` pin 是唯一真值，PreToolUse 的 `project-scope-guard.mjs` 据此把该
>   session 对 `docs/`·workflow-state·current-topic 的读写**重定向到它自己 pin 项目的绝对路径**。于是
>   N 个 session 可同时在 N 个不同项目上干活、互不串扰；别的 session 怎么 switch 翻共享软链，都改不动
>   本 session 的落点（软链退化为纯展示）。未绑定 session（纯对话/框架任务）碰 `docs/` 直接 deny（绝不
>   静默跟软链落到别人项目），非项目路径（`.claude/skills`、`memory/`、`scripts/`、`framework/`…）原样
>   放行。pin **只在用户显式声明/确认项目时写、永不从软链派生、漂移永不自动认领**（旧的"3 次后接管
>   劫持者项目"是跨 session 污染的元凶，已删）。Bash 里字符串写 `docs/` 是唯一 best-effort 边（路径位
>   token 保守重写 + 无 pin 时 deny），文件类工具精确重定向。**未绑定 session 的读（Read/Grep/Glob）
>   放行、写 deny**；无 path 的 Grep/Glob 会经软链搜到当前项目（已知读/搜索侧局限，非写入损坏）。
>   回归：`scripts/test-project-scope-guard.mjs`。

**按顺序执行以下步骤：**

0. **读取 memory summary**（轻量历史索引）
   - 运行 `python3 memory/scripts/get_memory.py --summary`
   - 只看摘要，不读取 memory 长文件
   - 第一条用户任务明确后，优先运行
     `python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5`
     做任务相关检索

1. **读取 `CONTEXT.md`**（长期项目约束）
   - 特别注意「红线」节，红线约束当前 session 的所有操作

2. **读取 `.claude/workflow-state.yaml`**（流程状态恢复）【C-04 修复】
   - 检查 `topic` 和 `scene` — 确定当前项目的上下文
   - 扫描各节点的 `status` — 了解流程执行到哪一步
   - 如果有节点状态为 `IN_PROGRESS` — 告知用户「上次 session 在 {节点名}
     中断，是否继续？」
   - 如果 `iteration ≥ 3` — 告知用户「handoff-review 已连续失败 {N} 次」

3. **读取上游 handoff summary**（跨 session 状态传递）
   - 如果 workflow-state 中有 DONE 的节点 → 读取 `docs/handoff/` 中最新的 handoff summary
   - 如果 handoff 文件不存在或 `docs/handoff/` 为空 → 跳过此步，继续执行第 4 步，不报错
   - handoff summary 包含上游的决策、约束和风险，下游 skill 必须遵守其中的约束
   - **不读取上游完整 SKILL.md 或完整产出文件**（用 handoff summary 替代）

4. **读取全局 `.claude/skills/office/SKILL.md`**（共享规范）
   - 仅在用户涉及 skill 操作时执行
   - 如果执行具体 skill，按 Observability Protocol 运行
     `.claude/observability/scripts/get_rules.py <skill-name> <scene>`，只加载输出的短规则
   - 如果需要历史经验，使用
     `memory/scripts/search_memory.py "<skill/topic>" --limit 5`，不要读取长日志或完整历史

5. **项目上下文门禁**（第一条用户消息后执行，任何 skill 运行前必须通过）

   读取 session-restore 的项目列表，按顺序判断：

   > **总原则（命名即切换 + 语义自判，2026-07-06）：** 项目归属是**语义判断，不靠词表**——
   > 即使 route-guard 因无关键词输出 STOP，只要你从用户语言能判断出「切某已有项目 / 这是个新项目 /
   > 当前项目内的新需求」，就**决定性执行**（同 OD 单点交接的「语义不靠词表」原则）。route-guard
   > 词表只是粗网，真判断在你。切换便宜可逆→不确认；新建会 detach 当前+建目录→仅"我自己猜的新项目"
   > 留一句确认。

   > **绑定即注入（2026-07-09）：** 确认/绑定项目时（含继承态确认、点名当前已激活项目这类
   > "pin 已写但没跑 switch"的路径），若本 session 尚未注入该项目本地记忆 → 幂等执行
   > `./scripts/project.sh switch {name}`（方案A 下共享软链是纯展示，重复 switch 无副作用；
   > 项目 MEMORY.md / CONTEXT.md 的注入恰好挂在它的 stdout 上）。

   **① 有激活项目 + 消息中无其他项目名/新项目信号**
   → 静默继续；有任务直接做，无任务才说一句「当前项目: {name}」
   → **继承态例外：** 激活项目是继承来的（route-guard 提示"当前激活 X（并行保留）"）时，命名即
     切换已生效——你一提别的项目名 / 语义上描述别的项目，我就按 ②③ 自动切，无需手动。**仅当**消息
     不指向任何项目、又要在这个从未确认过的继承项目上做实质任务时，才用一句话确认「在 X 上做，
     对吗？」再动手（防落错项目）。

   **② 消息点到已有项目名 / 语义指向某已有项目**（匹配项目列表某一项）
   → **命名即切换**：直接执行 `./scripts/project.sh switch {name}`，一句话告知「已切到 {name}」，
     **不等确认**（便宜可逆；点到即切正是所需）。想只引用不切换时，用户会说"不用切 / 当前项目"。

   **③ 消息表达新项目 / 语义自判是新项目**（含直接调用 `/brainstorm` `/idea` `/auto` 等且无明确当前项目）
   → **明说**是全新项目（或明确"新做一个 X"）：从描述推断候选名（如"商机管理"→"crm-bizop"）
     → `./scripts/project.sh new {name}`（**它会 detach 当前、把软链重指到新项目**）→ 一句话告知
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

当用户通过 `/office` 选择推荐流程，
或说"继续流程/进入下一步/从断点恢复"时，进入 Orchestrator 模式。
详细规范见 `.claude/agents/orchestrator.md`。

**关键约束：**
- Orchestrator 是主 session 的行为模式，**不是** subagent dispatcher
- skill 内部可以自由使用 subagent（deepresearch/brainstorm/ux-research/figma-demo 都有内部 subagent）
- 每个 skill 完成后必须写 handoff summary（见 `.claude/skills/office/references/handoff-protocol.md`）
- 连续执行 2 个重型 skill（runtime > 20K tokens）后，建议 compact 或新 session
- **每个 Phase/Skill 完成后执行观察提取**（Hermes-lite）：检查 non-obvious
  blocker、重复风险、未记录约束 → 满足任一则
  `propose_semantic.py --domain skill-rule`（详见 orchestrator.md §2c-obs）

## Standalone / Workflow 执行模式

所有 skill 均以交互模式（用户直接触发）运行。

执行原则：
- 用户直接点名某个 skill → standalone mode 优先。
- 用户选择 `/office` 推荐流程或明确说“按流程走” → workflow mode。
- workflow mode 可以检查上游产物、状态和 handoff gate。
- standalone mode 只要求该 skill 自己的输入和质量 gate，不强制补齐完整上游链路。
- handoff 分级：workflow 模式必写；standalone 模式 + 轻量 skill（frontmatter
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

稳定事实写入不直接修改 `CONTEXT.md` 或 `promoted-facts.yaml`。先运行
`memory/scripts/propose_semantic.py` 写 candidate，再通过 review / consolidate 治理晋升。
需要检查记忆治理队列时运行 `python3 memory/scripts/consolidate_memory.py --json`；
该命令默认作为只读 dry-run 使用，不属于普通 session 启动步骤。

---

```
□ framework/ 目录存在且包含所有母版？（html-prototype 必须）
□ brand-tokens.md 存在且非空？（html-prototype 必须）
□ Figma MCP 已连接？（figma-layer 必须）
```

---

## 产出目录结构

顶层：`CLAUDE.md`/`CONTEXT.md`/`brand-tokens.md`（本文件+长期记忆+品牌token）、
`framework/`（HTML 母版，只读）、`.claude/`（commands/skill-os/observability/skills/office 等）、
`docs/`（**symlink 到当前项目 docs/**——idea/prd/research/decisions/prototype/figma/review/
handoff/adr/engineering/evals/retro/redteam 等按 skill 产出分子目录，`PROGRESS.md`/`handoff/`
见上方 Context 工程协议；`docs/evaluation/` 是受保护 glob 路径，规则见
`.claude/skill-os/skill-invariants.md`）。
需要确切结构时 `ls`/`tree` 现查，不必记此文档——目录本身就是最新真值。

---

## 规则优先级体系

1. **用户最新明确请求** — 最高优先级
2. **当前 agent runtime 的 system/developer 安全与工具约束**
3. **项目红线与项目上下文门禁**
4. **route-guard 层级决策** — Project Gate → Plan Agent → Multi-Skill → Single-Skill → STOP
5. **具体 Skill 文件**（`.claude/skills/office/*/SKILL.md`）— 执行步骤和质量 gate
6. **本文件与 AGENTS.md** — Claude/Codex 的执行适配层，必须保持同一套路由语义

**冲突处理：** 同一件事有多条规则时，以描述更详细、约束更严格的那条为准。

---

## 模型路由

真值源：`.claude/skill-os/model-routing.yaml`（按能力档定义，不写死版本；调整路由只改该文件，下表为速查快照，须同步维护）。

| 能力档 | 任务类型 | 当前解析（2026-06-10） |
|---------|---------|---------|
| reasoning-heavy | 深度研究、设计决策、brainstorm、红队 | Fable |
| guided-execution | 框架指导的执行与审查；未声明 skill 的默认档 | Sonnet |
| mechanical | 机械执行、格式化、打分、检索 | Haiku |

- 档位名（fable/opus/sonnet/haiku）是**别名**，运行时解析到该档当前最新模型；档位内升级（如 Opus 4.7→4.8）自动跟随，零维护。
- SKILL.md frontmatter 的 `recommended-model` 写档名（tier），按本表/真值源解析。
- **活规则：** 会话中发现 `known_lineup` 未收录的档位变化（新档位发布、档位退役、能力代际漂移）时，主动向用户提示是否更新 model-routing.yaml，不得沉默沿用旧映射。
- 漂移看护：`daily_governance.py` 每日校验真值源 ↔ frontmatter 一致性与复核期限，异常写入成长摘要待裁决。

<!-- FILE_END: CLAUDE.md -->
