# luca_gstack — AI 产品设计工作流 Skill OS

> 一个跑在 Claude Code 之上的 AI 产品设计操作系统：斜杠命令驱动全链路（需求 → 研究 → 原型 → 工程规格），
> 但它真正的分量不在这些命令，而在命令背后那一层——**自动路由、会自成长的记忆、多 Agent 编排、
> 分层模型调度、环境隔离与框架自进化**。skill 只是入口，OS 才是主体。

---

## Overview — 这是什么

luca_gstack 是一个 **Skill OS**，不是一个被写死的 workflow engine。它把"AI 帮你做产品设计"这件事
拆成一组可独立调用的 skill，再在它们之上叠一层操作系统：**你说人话，它决定该走哪条路、调哪个模型、
读哪段记忆、在哪里停下来等你拍板，做完把该记住的沉淀下来。**

五条设计公理（`.claude/skill-os/README.md` 为真值源）：

```text
Skill-first        每个 skill 默认能单独用，不依赖流程
Graph-optional     流程编排是可选项，只在你主动选择时启用
Memory-light       启动只加载摘要与短规则，长历史是冷存储、按需检索
Growth-gated       记忆/规则的成长走候选 → 评审 → 晋升门禁，绝不自动写长期上下文
Governance-callable 治理（评审/评估/复盘/自进化）随时可调，但只提议、不擅自改
```

**产品中性，四类场景跨项目适用：**

| 场景 | 名称 | 说明 |
|------|------|------|
| **A** | 新功能设计 | 从 0 到原型 |
| **B** | 已有功能优化 | 评审驱动改版 |
| **C** | 线上评审改版 | 对现网页面做审计与重设计 |
| **D** | Agent 化改造 | 把"用户手动操作"改成"用户监督 AI 执行" |

---

## 它和一般 AI Agent 框架有什么不同

大多数"AI workflow"要么是一条写死的流水线（你只能顺着走），要么是一个放养的 agent（你只能祈祷它别跑偏）。
luca_gstack 的取舍在两者之间，靠的是下面这几条刻意的选择：

- **不是强制流水线，而是 Skill-first / Graph-optional。** 每个 skill 单独就能用；流程图只在你说"按流程走"
  时才接管。流程 gate 不会拦截 standalone 调用，除非它同时是质量或安全 gate。
- **记忆会自成长，但受门禁治理。** 不是"聊过就记"，也不是"全靠人工维护"。稳定事实必须先落候选，经
  consolidate/review 的晋升门禁才进长期记忆——杜绝把一次性巧合固化成"规律"。这是它和"无记忆"或
  "盲目追加记忆"两类系统的根本分野。
- **机器提议，人类裁定。** 真伪判断、优先级、方向选择这类需要人拍板的节点，机器只做可回溯性检查、
  打分和分类，绝不代替人下结论。关键流程里的人类卡点是硬约束，不是可跳过的礼节。
- **环境与项目彻底分离。** 这个仓是"运行环境"，本身不存任何项目产出；项目产出与状态放在独立目录，
  通过 symlink + 会话级项目绑定暴露当前项目。而记忆与观察这类"经验层"是跨项目的，不随项目切换而丢失。
- **原生优先（native-first）。** 能用 Claude Code harness 原生能力（hooks、subagent、/loop、schedule、
  Workflow）就不自建平行机器。框架层刻意做薄，只喂输入、设停止条件、卡人类断点、写回记忆。
- **不臆造是硬性质量门。** "没有数据支撑就不编"在所有 skill 里恒定生效——宁可标注"信息缺口"也不
  产出看起来合理的假事实。
- **框架自己会进化，但只提议。** 内置的自进化侦察会定期扫描外部生态、比对自身能力缺口、给出采纳建议，
  但零自动编辑——所有演进都以 digest 形式等人裁决。
- **模型是一个旋钮，不是一个常量。** 判定/对抗用重推理档，承重执行用主力档，机械活用廉价档——
  按任务的"判断杠杆 × 错判代价"分层调度，而不是所有活都用同一个模型硬扛。

---

## 系统架构

```text
Claude Code Runtime（模型 + harness 原生 loop / hooks / subagent）
        ↓
luca_gstack Skill OS
   · standalone skills          每个 skill 自带输入契约与质量 gate
   · input / output contracts   skill 之间通过 docs/** artifacts + 稳定 ID 协作
   · skill-level quality gates
        ↓
Optional Workflow Graph（可选，主动启用）
   · recommended paths          4 场景推荐路径
   · handoff validation         节点间交接门禁 + 可追溯性覆盖
   · state recovery             跨 session 断点恢复
   · downstream suggestions
        ↓
经验与治理层（跨项目，常驻）
   · Observability   记录反馈 → 蒸馏可立即生效的短规则
   · Memory          三层记忆 + 自成长闭环
   · Evolution       框架自进化侦察（propose-only）
   · Evals / Redteam / Retro   评估、对抗审计、复盘
```

配套还有一层**会话生命周期编织**（hooks）贯穿始终：进场恢复状态、每条消息自动路由、
编辑后校验、收尾沉淀记忆。

---

## 核心能力

### 1. 分层智能路由（route-guard）

每次你发消息，`route-guard` 都会按关键词表打分并注入一条路由决策，主 Agent 必须遵守。它不是简单的
关键词匹配，而是一套**优先级由高到低的分层裁决**：

| 层级 | 触发 | 行为 |
|------|------|------|
| **项目上下文门禁** | "老项目/已有项目/继续项目" | 先确认或切换项目，不得直接进入某个 skill |
| **Plan Agent 层** | 复杂度达标 / 命中重编排 skill / 满足 5 条件之一 | 先出结构化计划（阶段分解 + 编排模式 + 断言），等确认 |
| **Multi-Skill 层** | 多候选、置信度低 | 向你列出候选组合，问清顺序再执行 |
| **Single-Skill 层** | 单一高置信命中且不触发 Plan Agent | 直接调用对应 skill |
| **低置信兜底** | 零关键词命中 | 展示软匹配候选或 skill 列表请你选，禁止无依据自行执行 |

关键词真值源是 `.claude/skill-os/skill-routing-map.yaml`。route-guard 还顺带追踪对话轮数，
到点自动提醒你写 Checkpoint 或 compact。

**Plan Agent 5 条件**（满足任一即先规划、复杂任务暂停等确认）：涉及 ≥3 文件改动 / 需 ≥2 独立 subagent
协作 / 有明确阶段依赖 / 涉及不可逆操作 / 你明确要求"先做个计划"。

### 2. 三层记忆 + 自成长

| 层 | 存什么 | 何时写 |
|----|--------|--------|
| **Episodic** | 单次 session 的经历与决策 | session 结束触发 |
| **Semantic** | 跨 session 的稳定事实 | 候选通过评审后晋升 |
| **Procedural** | skill 规则（已并入 Semantic `domain:skill-rule`）| 同上 |

记忆不是"想记就记"，而是三环自动闭环：

```text
捕获（Stop hook 拦截"有实质工作未沉淀"的 session，就地按门槛裁决）
   ↓
治理 + 晋升（每日首 session 后台跑：只晋升门禁内候选、降频写 digest、Loop 健康自检）
   ↓
回看（下次启动提示最新 digest）
```

两道纪律确保记忆不膨胀：**提取门槛**（`extraction-bar.md` 四强信号——明确纠正/二次复发/真实返工/
高重获成本，全不中就什么都不存）和**归属三分**（这条经验是关于"人怎么工作"、"框架规则"、还是
"某个具体项目"？分别落不同位置，避免跨项目上下文污染）。启动只用 `get_memory.py --summary`
加载摘要，具体任务用 `search_memory.py` 做相关检索——长历史永远是冷存储。

### 3. Observability — 从反馈蒸馏短规则

`observations.jsonl` 记录原始用户反馈（冷存储）；`get_rules.py <skill> [scene]` 把其中明确、可复用的
反馈蒸馏成**短规则**，只在跑对应 skill 时按需加载。它和记忆自成长互补：Observability 的明确规则可立即
生效，记忆候选则必须经评审才晋升——两条速度不同的成长通道。

### 4. Agent 编排体系

主 session 不是一个人在战斗，而是一套分工明确的 agent 角色：

| Agent | 定位 | 关键约束 |
|-------|------|----------|
| **Orchestrator** | 主 session 的执行行为模式（双模式：自由任务 / skill 流程）| 不是 subagent dispatcher；skill 内部自管 subagent |
| **Plan Agent** | 规划器 | 输出阶段计划 + 编排模式 + 断言，供 Orchestrator 执行 |
| **Preflight Agent** | 前置校验 | skill 启动前验证前置条件，返回 PASS/FAIL |
| **Quality Gate** | 测试层 | 独立 context 跑断言、审查产出质量，不污染主 session |
| **Work Agent** | 单阶段执行器 | 只做一件有界的事，返回结构化完成报告，不规划、不再派 subagent |

编排模式借鉴 Anthropic *Building Effective Agents*：能画出决策树的任务就用确定性编排，不交给 agent
自由探索。给每个 agent 的 context 有预算（Explore <500 / Work <2000 / Eval <1000 / Plan <1500 tokens），
只喂它实际需要的目标与路径，不灌完整会话历史。

### 5. Context 工程协议

Context 窗口被当作有限资源主动管理，防止溢出丢状态：

- **Checkpoint**：启动 ≥2 个重型 Agent、完成一个 Phase、或不可逆操作前，写五要素交接
  （已完成 / 进行中 / 待执行 / 关键决策 / 恢复指令）。
- **PROGRESS.md**：≥3 Phase 的长任务开场初始化，每 Phase 更新，启动时自动显示。
- **懒加载**：不在开头全量读文件；长文件先读前 50 行看结构再按需深读。
- **Compact 触发**：完成 Phase 且后面还有 ≥2 Phase、或超 30 轮对话，在下个 Phase 前 compact（compact 前必先写 Checkpoint）。
- **断点恢复**：新 session 读最新 checkpoint + 跑 `verify.sh`，从"待执行"继续，不重做已完成项。

### 6. 模型分层路由（Fable 手术刀）

真值源 `.claude/skill-os/model-routing.yaml`。按任务的 token 量级 × 判断杠杆 × 错判代价分四档调度：

| 能力档 | 任务类型 | 解析到 |
|--------|----------|--------|
| **reasoning-heavy** | 仅判定场景（出门前裁决 / 对抗判定 / 翻案复审 / 规划期）| 重推理档 |
| **core-execution** | 承重执行与整场交互（写代码、原型、规格、研究、判官常规）| 主力档 |
| **guided-execution** | 轻执行 / checklist 审查 / 一般检索 | 引导档 |
| **mechanical** | 机械执行、格式化、打分、preflight | 廉价档 |

档位是**别名**，运行时解析到该档当前最新模型——档内代际升级自动跟随、零维护。派 subagent 时按档位
显式传模型参数；发现原生动态模型调控发布时，框架会主动让位为语义补充（native-first）。

### 7. 环境 / 项目隔离

这个仓只保留 skills、hooks、framework 母版、scripts、memory、observability——**它是运行环境，不存项目产出**。

- `docs/`、`.claude/workflow-state.yaml`、`.claude/current-topic.txt` 都是 **symlink**，指向当前激活项目。
- 会话级项目绑定（`project-scope-guard`）：pin 是唯一真值，把本 session 对 docs/state 的读写重定向到
  pin 项目的绝对路径；未绑定 session 写 docs/ 直接拦截，防止落错项目。
- **命名即切换**：你一提某个已有项目名，就自动切过去（切换便宜可逆）；只有"名字是猜的新项目"才留一句确认。
- `memory/**` 与 `.claude/observability/**` 是跨项目经验层，**不随项目切换**——经验不因换项目而丢。

### 8. Session 生命周期 hooks

六个生命周期事件各有 hook 编织，你几乎无感但状态从不丢：

| 时机 | hook | 做什么 |
|------|------|--------|
| **SessionStart** | session-restore | 加载记忆摘要、恢复流程状态、显示 PROGRESS、清理悬空软链 |
| **UserPromptSubmit** | route-guard | 打分路由 + 项目门禁 + 轮数追踪提醒 |
| **PreToolUse** | project-scope-guard | 工具执行**前**把 docs/state 读写重定向到本 session 的 pin 项目；未绑定写 docs/ 直接拦 |
| **PostToolUse** | post-edit | 累计活动信号（edit/tool 计数，供 Stop 判"实质工作"）+ framework/ 只读警告 |
| **Stop** | session-sync | 拦截未沉淀的实质工作、就地裁决记忆、写 checkpoint、提示同步 |
| **SessionEnd** | session-end | 会话真正结束时清理本 session 的计数/pin 残留（僵尸窗口归零） |

### 9. 框架自进化（propose-only）

框架不靠人记着去优化，而是内置一套自进化侦察（`.claude/skill-os/evolution/`）：

- **月度侦察**：从 `sources-registry.yaml` 生成发现通道，按 `gaps-register.yaml` 做 fit-to-gap 门禁，
  用 `gh` 做证据核验 + 供应链 + 红队，产出演进 digest。
- **外部 skill 侦察**：在 GitHub 上找有用的 skill/subagent，过 7 维门禁、逐个证据核验、给排序推荐。
- **采纳台账**：`adoption-log.jsonl` / `ADOPTED.md` 记录采纳审计；`CHANGELOG.md` 记面向使用者的演进叙事。
- **红线**：所有侦察**只提议、零自动编辑框架**——采纳与否人裁；采纳后必须走完编排层集成（触达 + 登记 +
  场景 + 验收）才算落地，"装完就完"不算数。

### 10. 质量纪律与不可协商项

- **Loop 宪法（四原则）**：① inner loop 不重造（gather→act→verify 是原生资产）；② outer loop 默认薄，
  只用四原语（停止条件 / spec 信号 / 人类卡点 / 记忆写回）；③ 复杂度双向自证（新增须可测地改善结果，
  既有结构定期用数据复核，不划算就砍）；④ 优先接 harness 原生原语。
- **Coding Discipline（Karpathy-inspired）**：Think Before Coding（不替用户静默选高影响解释）、
  Simplicity First（只实现所需的最小方案）、Surgical Changes（只改相关行，不顺手重构）、
  Goal-Driven Execution（每个改动可追溯到请求或验证标准）。
- **完成前验证铁律**：声明"做完了"之前，必须有当场跑出的证据（测试 / 脚本 / 读回文件 / 可观察检查）。
- **保护区**：`framework/` HTML 母版只读、`docs/evaluation/` 受保护、`skill-invariants.md` P1-P7 保护区、
  记忆红线（稳定事实不得直接写长期上下文）。
- **单真值源 + 双检出**：`main` 是唯一真值源，两个本地目录均为其检出（框架改动任一检出皆可做：动手前先 pull、做完立即 commit+push，另一侧开工前 pull）；`check-capability-parity.mjs` 降级为仓内能力锚点自检（verify 门 S18），behind tripwire 见 `check-behind-upstream.sh`（S23）。

---

## 端到端流程

### 设计链与工程链（并行，不互相替代）

```text
设计链     idea → deepresearch → brainstorm → ux-research → ux-brainstorm
                → design-brief → open-design → figma-layer

一手研究环  brainstorm（假设）→ research-kit（采集工具）→ [你亲自采集]
                → insight-synthesis（洞察）→ 回到设计链

内容维度   ux-writing（语义规范产在 design-brief 之前、被其继承进 Packet；
                逐字文案只喂 html-prototype 本地路径——OD 的生成自由度不被锁）

工程链     brainstorm → design-brief → tech-spec → task-plan → 执行 → 验收回验
```

**发散 vs 收敛的分工**：`ux-brainstorm` 是发散引擎（出 2-3 方案 + Oracle 对抗 + 交互架构 + AI-Native 判定）；
`design-brief` 是收敛引擎（把方向落成规格契约：决策卡 / 状态覆盖 / 组件映射 / Generation Packet）。
二者永不并列产同类文档——复杂题先发散再收敛，简单题直接收敛。

### 4 场景推荐路径（可选，主动启用）

真值源 `.claude/skill-os/optional-workflow-graph.yaml`。每个场景都有从轻到重的多条推荐路径，
外加"研究默认门"：**任务同时复杂且新颖时，研究阶段是默认步骤而非可选**，跳过必须显式声明理由并经你确认。

### Handoff gate 与可追溯性

流程模式下，节点之间有交接门禁，核心是**可追溯性覆盖**——例如 `tech-spec → task-plan` 会检查每条 MUST
需求是否都有开发任务、每个设计决策是否都有覆盖，coverage gate 不 PASS 就不许启动下游。standalone 模式
不被这些 gate 拦截（除非它同时是质量/安全 gate）。始终强制的质量 gate：不臆造、需要用户输入时一次只问
一个问题、品牌与设计系统约束、agentic 执行必须可见可暂停可接管可撤销。

### 记忆生命周期

```text
做事 → 命中提取门槛（四强信号）→ 裁决归属（人 / 框架 / 项目）
     → 落候选 → 每日治理评审 → 晋升长期记忆 → 下次启动回看
```

---

## Skill 索引

一级可见 skill（斜杠命令）：

| 命令 | 场景 | 用途 |
|------|------|------|
| `/office` | — | 显示所有一级可见 skill，向导式推荐 workflow |
| `/auto` | A B C D | 全自动多 Agent 编排：自然语言 → Skill Pipeline → 并行执行 → 聚合产出 |
| `/idea` | A B | 已有原始语料忠实结构化（会议纪要/语音稿转需求，不延展不推断）|
| `/deepresearch` | A B D | 多 Agent 深度研究报告 |
| `/quick-research` | A B D | 轻量研究（单 agent 查 primary source，三档研究的中档）|
| `/insight-synthesis` | A B D | 一手定性综合：你提供的访谈/工单/回访 → observation+interpretation 两层洞察 |
| `/research-kit` | A B D | 一手研究工具设计：假设 → 访谈提纲/问卷/可用性测试计划/卡片分类法（三不产：不产发现/不产解读/不采集）|
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD |
| `/ux-research` | A B D | 多维度 UX 深度研究（5+1 并行 agent，共识矩阵）|
| `/ux-brainstorm` | A B D | 发散引擎：2-3 方案 + Oracle 对抗 + AI-Native 判定 |
| `/design-brief` | A B C D | 收敛引擎：方向 → 规格契约（决策卡/状态/组件映射）|
| `/ux-writing` | A B C D | 内容与语言设计：voice/tone 规范 + 微文案系统 + 文案评审改写（语义规范跑在 design-brief 前被继承进 Packet；逐字层只喂本地生成，不锁 OD）|
| `/open-design` | A B C D | Open Design 产出（设计产出首选）：需求 → HTML →（可选）Figma |
| `/html-prototype` | A B C | HTML 原型生成（备选，OD 不可用时）|
| `/ux-audit` | B C | UX 评审（多选模块）|
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格节点：PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：断言矩阵 + 开发/测试任务卡 |

工程 / 质量 / brownfield skill：

| 命令 | 用途 |
|------|------|
| `/code-hygiene` | 代码层工程约束：完成前验证铁律 + 清理算子（死代码/重复/弱类型等，仅自动应用高置信项）|
| `/code-recon` | 从现有代码起步的入口：并行只读 recon 把代码库逆向成架构 brief，供下游 skill 消费 |

> 完整触发词与路由规则见 `.claude/skill-os/skill-routing-map.yaml` 与 `CLAUDE.md`。
> 高级/隐藏 skill（challenge、redteam、evals、retro、careful、compare 等）不作一级入口，需要时按名调用。

---

## Quick Start

### 先决条件

- [Claude Code](https://claude.ai/code) CLI 已安装
- macOS / Linux
- Git ≥ 2.x

### 安装

```bash
git clone https://github.com/wangmoumou1216-ai/luca_gstack.git luca_gstack
cd luca_gstack
git config core.hooksPath .githooks
```

### 使用

在项目目录下打开 Claude Code：

- 输入 `/office` 查看所有可用 skill 及推荐工作流；
- 或者直接说人话描述你要做什么——route-guard 会自动判断该走哪条路（单个 skill / 多 skill 组合 /
  先做计划 / 先确认项目）。

### 健康检查

```bash
bash scripts/verify.sh   # 项目健康检查（结构、软链、路由、覆盖等）
bash scripts/sync.sh     # 把记忆与自进化状态推回 GitHub（干净时会直接告诉你无需同步）
```

---

## 目录结构

```text
luca_gstack/                  ← 运行环境（不存项目产出）
  CLAUDE.md                   ← Claude Code 配置、路由契约、记忆/context 协议
  CONTEXT.md                  ← 跨 session 长期项目约束（含红线）
  brand-tokens.md             ← 品牌色 token
  framework/                  ← HTML 原型母版（只读保护区）
  memory/                     ← 三层记忆系统 + 治理脚本
    episodic/ semantic/ digests/ scripts/
  scripts/                    ← 验证、同步、项目切换等维护脚本
  .claude/
    skills/office/            ← Skill 定义文件
    commands/                 ← 斜杠命令入口
    skill-os/                 ← 路由表 / 编排图 / 输入模式 / 模型路由 / 自进化 / 契约配置
    observability/            ← skill 观察记录与短规则
    agents/                   ← Orchestrator / Plan / Preflight / Quality-gate / Work agent 定义
    hooks/                    ← Session 生命周期钩子（restore / route-guard / post-edit / sync 等）
    workflow-state.yaml       ← symlink → 当前项目 .luca/workflow-state.yaml
  docs/                       ← symlink → /Users/luca/Desktop/项目/<项目名>/docs
    handoff/                  ← 当前项目 Skill 交接摘要
```

`luca_gstack` 只通过 `docs/` 与 `.claude/workflow-state.yaml` 等 symlink 暴露当前激活项目；
项目产出与状态放在 `/Users/luca/Desktop/项目/<项目名>/`，切换项目用 `scripts/project.sh switch <名>`。

---

## Contributing

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

详见 [SECURITY.md](./SECURITY.md)

## License

MIT © 2025-2026 luca
