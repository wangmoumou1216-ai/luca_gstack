---
name: office
preamble-tier: 1
version: 2.0.0
description: |
  luca_gstack 入口。向导式：先问你想做什么，推荐对应 workflow。
  展示一级可见 skill 列表，含描述和输入模式。(luca_gstack)
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
[ -n "$LUCA_SPAWNED" ] && echo "SPAWNED_SESSION: true" || echo "SPAWNED_SESSION: false"
```

---

## 共享规范（所有 skill 继承，不重复写）

### Skill OS 原则

`luca_gstack` 是 Skill OS，不是强制 workflow engine。

核心原则：
- **Skill-first**：一级可见 skill 必须能直接调用，除非该 skill 自己声明只能作为下游工具。
- **Graph-optional**：workflow graph 只在用户选择流程化工作时启用。
- **Memory-light**：常规运行只加载短规则，不读长历史。
- **Growth-gated**：Hermes 自成长先进入候选池，不自动改长期 context。
- **Governance-callable**：evals / redteam / retro 可作为流程后置，也可单独调用。

执行模式：
- **Standalone mode**：用户直接点名某个 skill，或提供直接输入。只强制该 skill
  自己的输入和质量 gate。
- **Workflow mode**：用户通过 `/office` 选择推荐流程，
  或明确要求“继续流程/进入下一步”。此时检查上游 artifacts 和 handoff
  gate。

读取契约：
```
.claude/skill-os/input-modes.yaml
.claude/skill-os/optional-workflow-graph.yaml
```

Workflow gate 不得阻塞 standalone，除非该 gate 同时是质量或安全 gate。

### Voice

直接、具体、不废话。说文件名，说路径，说具体行动。
问题一次只问一个。等用户回答后才继续。
不说「我理解你的需求」。不说「让我们一起」。

### Completion Status Protocol

每个 skill 完成时，用以下之一报告：

- **DONE** — 所有步骤完成，产出文件已写入磁盘，路径已告知
- **DONE_WITH_CONCERNS** — 完成，但有具体问题需要注意（列出）
- **BLOCKED** — 无法继续。说明原因 + 已尝试的方法 + 建议的下一步
- **NEEDS_CONTEXT** — 缺少必要信息。说明具体缺什么

升级规则：同一问题尝试 3 次失败，立即 BLOCKED，不继续循环。

### Handoff Summary Protocol（所有 skill 继承）

**在标记 DONE 之前，必须写 handoff summary 文件。** 无 handoff 的 DONE 视为不完整。

写入路径：`docs/handoff/YYYY-MM-DD-<topic>-<skill-name>-handoff.md`
格式规范：见 `references/handoff-protocol.md`
硬约束：≤2000 tokens（≈8000 chars）

内容必须包含：决策列表（≤8 条）、下游约束（≤5 条）、风险（≤3 条）、产出路径。
如适用：AI Native 范式判断。

**下游 skill 启动时读取上游 handoff summary，不读取上游完整 SKILL.md 或完整产出。**

### Pre-Task Context Retrieval（所有 skill 继承）

**每个 skill 启动时，在执行核心逻辑之前，自动加载历史上下文。** 这是
Ruflo hooks pre-task 模式的轻量实现。

**Step 1：加载 observability 规则（已有）**
```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>
```

**Step 2：检索上游 handoff summary（workflow 模式下）**
```bash
# 读取 workflow-state.yaml 中最新的 DONE 节点的 handoff_path
# 如果 handoff_path 非空 → 读取该文件
# 重点关注：## 约束 和 ## 风险 章节
```

**Step 3：检索历史成功模式（如有）**
```bash
# 检查 docs/handoff/ 目录中是否有与当前 topic 相关的历史 handoff
# 如果找到 → 读取其 ## 决策 章节中被标记为 [ADOPTED] 的条目
# 历史成功模式优先于从零推理
ls docs/handoff/*-<current-topic>-*-handoff.md 2>/dev/null
```

**规则：**
- Step 1 和 Step 2 是必须的。Step 3 是可选的（有就读，没有跳过）
- 如果 Step 3 找到了历史成功模式且相关度高，告知用户并建议复用
- 总加载量不超过 5K tokens（超过则只读最新的一个 handoff）
- 加载完成后不需要向用户汇报，直接进入 skill 核心逻辑

### Observability Protocol（所有 skill 继承）

目标：记录用户明确指出的问题，沉淀成下次可执行的短规则，
同时避免读取长历史污染上下文。

**启动时只热加载短规则，不读长日志：**

```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>
```

规则：
- 只读取这条命令的输出。
- 不直接读取 `observations.jsonl` 或 `run-log.jsonl`。
- 不全量读取 `rules.yaml`；必须通过 `get_rules.py` 过滤当前 skill 和 scene。
- 如果输出 `none`，继续执行。
- 如果有 active rules，必须在当前 skill 执行中遵守；
  若规则与用户最新明确要求冲突，以用户最新要求为准，
  并在收尾记录该冲突。

**用户明确指出问题时必须记录 observation：**

触发表达包括但不限于：
- 「这个不对」
- 「以后不要这样」
- 「下次记住」
- 「你又犯了」
- 「这个 skill 有 bug」
- 「这个流程有问题」
- 「不要再...」
- 「必须...」

记录命令：

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>"
```

如果用户给的是明确、可复用的未来约束，同时沉淀为 active rule：

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>" \
  --rule "<一句可执行规则>" \
  --applies-to <skill-name> [other-skill] \
  --scenes <A|B|C|D|*>
```

**收尾时记录轻量 run log：**

```bash
python3 .claude/observability/scripts/append_run_log.py \
  --skill <skill-name> \
  --status DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT \
  --output "<主要产出路径>" \
  --rules <命中的规则ID...>
```

**上下文预算红线：**
- `observations.jsonl` 是冷存储，只有 `/evals`、`redteam`、`retro` 或用户明确要求复盘时读取。
- `run-log.jsonl` 是冷存储，只有 `/evals`、`retro` 或调试历史时读取。
- `rules.yaml` 是规则库，但常规 skill 只能通过 `get_rules.py` 加载相关短规则。

### Hermes Growth Protocol（可选自成长层）

Hermes 用来记录候选成长，不直接改长期 context。

触发时机：
- 用户指出同类问题重复出现。
- `/evals` 或 `redteam` 发现可复用流程缺陷。
- `/retro` 形成明确下次改进动作。
- 某 skill 发生 2 次以上同类 BLOCKED / DONE_WITH_CONCERNS。

候选写入：

```bash
python3 .claude/hermes/scripts/propose_growth.py \
  --skill <skill-name> \
  --source observation|evals|redteam|retro|user \
  --task "<任务摘要>" \
  --observation "<发生了什么>" \
  --proposal "<下次怎么改>" \
  --scope "<适用范围>"
```

评审写入：

```bash
python3 .claude/hermes/scripts/review_growth.py \
  --candidate <HC-ID> \
  --reviewer self|redteam|user|subagent \
  --decision discard|keep_candidate|promote_ready \
  --reason "<理由>" \
  --context-risk low|medium|high \
  --rollback "<回滚条件>"
```

常规启动如需读取 Hermes 规则，只能运行：

```bash
python3 .claude/hermes/scripts/get_growth_rules.py <skill-name> <scene>
```

禁止：
- 自动写 `CONTEXT.md`
- 自动改 `CLAUDE.md` / `AGENTS.md`
- 自动改 skill 主规则
- 把一次性偏好晋升为长期规则

### SPAWNED_SESSION 规则

当前未启用 Orchestrator，此机制为未来扩展预留。
所有 skill 均以交互模式运行（用户直接触发）。

### 场景标识

所有 skill 使用统一的场景标识：
- **场景A** — 新功能设计（从零开始）
- **场景B** — 已有功能优化（现有功能改进）
- **场景C** — 线上页面评审改版（评审 → 报告 → 改版）
- **场景D** — Agent 化改造（把现有功能从"用户手动操作"变为"用户监督 Agent"）

### 产出路径约定

```
docs/idea/YYYY-MM-DD-<topic>-idea.md
docs/research/deepresearch-<topic>-YYYY-MM-DD.md
docs/prd/YYYY-MM-DD-<topic>-prd.md
docs/prd/YYYY-MM-DD-<topic>-prd-ai-spec.md             ← AI Native 时条件产出
docs/prd/YYYY-MM-DD-<topic>-prd-constraints.md        ← 场景B专有
docs/research/ux-research-<topic>-YYYY-MM-DD.md
docs/decisions/YYYY-MM-DD-<topic>-ux-brainstorm.md
docs/decisions/YYYY-MM-DD-<topic>-interaction-architecture.md
docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md
docs/prototype/YYYY-MM-DD-<topic>/index.html
docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md
docs/prototype/YYYY-MM-DD-<topic>/blueprint.yaml          ← /figma-demo 专有
docs/prototype/YYYY-MM-DD-<topic>/mapping-proof.md        ← /figma-demo 专有
docs/prototype/YYYY-MM-DD-<topic>/requirement.md          ← /figma-demo 专有
docs/figma/YYYY-MM-DD-<topic>/figma-spec.md
```

### 品牌与技术约束（所有 skill 强制遵守）

**品牌色：**
- 主色：`#FF8000`（Tailwind: `bg-primary / text-primary`）
- 全页限制：≤3 处

**字体四级：**

| 级别 | 场景 | 字号 | 字重 | 颜色 |
|------|------|------|------|------|
| L1 | 区块标题 | 15px (`text-15`) | 500 | #181C25 (`text-n19`) |
| L2 | 核心内容/字段值 | 13px (`text-13`) | 400 | #181C25 |
| L3 | 辅助标签/字段名 | 13px (`text-13`) | 400 | #91959E (`text-n11`) |
| L4 | 弱信息/时间戳 | 12px (`text-12`) | 400 | #91959E |

**间距系统：**
合法值：4 / 8 / 12 / 16 / 24 / 32 / 40 px
对应 Tailwind：p-1 / p-2 / p-3 / p-4 / p-6 / p-8 / p-10

**CSS Token（来自 `framework/tokens.css`）：**
```
--fx-primary: #ff8000      → bg-primary / text-primary
--fx-n19: #181c25          → text-n19（主要文字）
--fx-n11: #91959e          → text-n11（次要文字）
--fx-n05: #dee1e8          → border-n05（分割线）
--fx-page-bg: #eff1f3      → bg-page-bg
```

**原型技术栈：** 纯 HTML + 本地 Tailwind CDN（`framework/assets/vendor/tailwindcss.com.js`）+ 原生 JS
**可用母版（5个）：** 列表页 / 详情页（两列）/ 详情页（三列）/ 表单页 /
首页/仪表盘。AI速记入口页 / 录音工作页当前无整页母版，
需走局部改动/独立组件或先补齐母版。
**图标：** 先查 `framework/assets/icons/`，找不到再使用隐藏图标检索工具

---

## /office — 向导式入口

当用户触发 `/office` 时，执行以下流程：

### Step 1：问用户想做什么

```
你好，我是 luca_gstack 设计工程助手。

先告诉我你现在想做什么？
```

AskUserQuestion：

> A）**我有一个新功能想做** — 从需求梳理开始，到原型交付
> B）**我想优化一个已有功能** — 评审现有页面，找问题，出方案
> C）**我要评审一个线上页面，然后出改版原型** — 先评审，后改版
> D）**我要把一个现有功能 Agent 化** — 从"用户手动操作"变为"用户监督
> Agent"，强制执行代理层设计（可见/暂停/接管/撤销）
> E）**我已经在流程中了，想用某个具体工具** — 直接看 skill 列表

---

### Step 2：根据选择推荐 workflow

**用户选 A（新功能）：**

```
推荐流程：

1. /idea           → （可选）把原始语料整理成结构化需求清单
2. /deepresearch   → （可选）对主题做多 Agent 深度研究
3. /brainstorm     → 苏格拉底拷问式产品思考，写成 PRD
4. /ux-research    → UX多维度深度研究（5+1并行agent，共识矩阵，苏格拉底审查）
5. /ux-brainstorm  → UX设计方案编排器（7个UX逼问，2-3方案，Oracle审查）
6. /design-brief    → 轻量交互文档与原型决策（不跑 ux-brainstorm 时可独立使用）
7. /html-prototype → 生成 HTML 原型
   /figma-demo     → （可选替代）口述 + Figma → HTML 演示 Demo
8. /figma-layer    → 还原到 Figma

从哪里开始都可以。/deepresearch 的报告可以直接传给 /brainstorm 作为输入。
```

AskUserQuestion：
> A）开始 → 直接运行 `/idea`
> B）我想先看一级 skill 列表

---

**用户选 B（优化已有功能）：**

```
推荐流程：

1. /idea           → （可选）整理你对这个功能的优化想法和原始语料
2. /brainstorm     → 苏格拉底拷问式产品思考，写成优化 PRD（cold-start 模式）
3. /ux-audit       → 评审当前页面找问题（需要截图）
4. /ux-research    → UX多维度深度研究（竞品+范式+用户行为+AI可行性）
5. /ux-brainstorm  → UX设计方案编排器
6. /design-brief    → 轻量交互文档与原型决策
7. /html-prototype → 生成改版原型
   /figma-demo     → （可选替代）基于 Figma 截图/链接和口述生成演示 Demo
/brainstorm 可以直接用，不需要先跑 /idea。
```

AskUserQuestion：
> A）开始 → 直接运行 `/idea`
> B）我想先看一级 skill 列表

---

**用户选 C（评审改版）：**

```
推荐流程：

1. /idea       → 记录要评审的页面信息和截图
2. /ux-audit   → 系统评审页面（视觉/交互/业务三个维度）
3. /design-brief → 基于评审结论生成轻量交互文档
4. /html-prototype → 按评审清单逐条生成改版原型
   /figma-demo     → （可选替代）基于 Figma 截图/链接和口述生成演示 Demo
5. /figma-layer → 还原到 Figma
从 /idea 开始？
```

AskUserQuestion：
> A）开始 → 直接运行 `/idea`
> B）我想先看一级 skill 列表

---

**用户选 D（Agent 化改造）：**

```
推荐流程：

1. /idea           → （可选）整理 Agent 化的目标和现有功能背景
2. /deepresearch   → （可选）研究 Agent 类产品的设计范式
3. /brainstorm     → 苏格拉底拷问式产品思考（强制产出 prd-ai-spec.md 含 10 模块架构）
4. /ux-audit       → 评审当前功能的用户操作路径（要看截图）
5. /ux-research    → UX多维度深度研究（含AI Native/Agent Native可行性维度）
6. /ux-brainstorm  → UX设计方案编排器（含Agent控制边界逼问）
7. /design-brief → 轻量交互文档与原型决策（Cursor 锚点强制通过：可见/暂停/接管/撤销）
8. /html-prototype → 生成原型（含 Agent 执行中态等 AI 专有状态）
   /figma-demo     → （可选替代）口述 + Figma → Agent 化演示 Demo
Agent 化设计的核心红线：用户必须始终能 看见 / 暂停 / 接管 / 撤销 AI 的动作。
```

AskUserQuestion：
> A）开始 → 直接运行 `/idea`
> B）我想先看一级 skill 列表

---

**用户选 E，或在任意流程中选「看一级列表」：**

显示以下一级可见 skill 列表。

---

### Step 3：一级可见 Skill 列表

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
luca_gstack — 一级可见 Skill 列表
场景：A = 新功能   B = 已有功能优化   C = 线上评审改版   D = Agent 化改造
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── 需求与策略 ──────────────────────────────────────────────────

/idea          A B C D   把一个模糊想法整理成清晰的需求方向
               输入模式：standalone。直接输入想法/语料即可；不是所有流程的强制起点

/deepresearch  A B D     多 Agent 并行深度研究（5-8 个研究 Agent + 共识矩阵交叉验证 + 苏格拉底质疑）
               输入模式：standalone 或 workflow。输入一个主题即可；也可读取 idea/PRD 作为范围约束
               产出：docs/research/deepresearch-{topic}-{date}.md
               说明：可在 /brainstorm 之前使用，研究报告可作为 brainstorm 的输入

/brainstorm    A B D     苏格拉底拷问式 PRD（替代原 /prd）
               输入模式：standalone 或 workflow。可接受 deepresearch 报告、/idea 产出、或直接描述
               产出：PRD .md + 条件产出 prd-ai-spec.md（涉及 AI Native 时）
               机制：3 并行 Agent 提取+假设+缺口 → 内部压力测试 → AI Native 评估 → 苏格拉底 6 问拷问 → 方案探索 → Oracle 对抗审查 → 写 PRD
               说明：完整替代原 /prd。所有下游 skill 读取 brainstorm 产出的 PRD

── 研究与分析 ──────────────────────────────────────────────────

/ux-research     A B D   UX多维度深度研究（5+1并行agent，共识矩阵，苏格拉底审查）
                       输入模式：standalone 或 workflow。可直接输入设计问题，也可读取 /brainstorm 的 PRD
                       场景D：重点分析 Agent 类竞品（Cursor/Granola/Claude Projects）的"意图/反馈/权限"

/ux-audit      B C     评审一个已有页面，找出视觉、交互、业务上的问题
               输入模式：standalone 或 workflow。需要页面截图/页面参考（质量 gate）

── 设计决策 ────────────────────────────────────────────────────

/ux-brainstorm   A B D   UX设计方案编排器（7个UX逼问，2-3方案，Oracle审查）
               输入模式：standalone 或 workflow。可直接输入设计问题，也可读取 ux-research / PRD
               注意：Phase 0 会要求提供当前页面截图（场景B/D必须 / 场景A需要落点截图）
               场景D：强制执行 AI Native 四层深度思考的 Layer D（代理层）

               场景D：对 Agent 类竞品强制做"意图/反馈/权限"三维拆解

/design-brief A B C D 轻量交互文档与原型决策节点
               输入模式：standalone 或 workflow。
               场景A/B/D：可接 /ux-brainstorm 产出、/ux-research 报告、PRD，或用户直接粘贴方案
               场景C：需要 /ux-audit 的产出 + 当前页面截图（Phase 0 会要求提供）
               场景D：Cursor 锚点强制通过（可见/暂停/接管/撤销），12 状态全部必填
               说明：不想运行重型 /ux-brainstorm 时，可独立产出原型前交互文档

── 原型实现 ────────────────────────────────────────────────────

/html-prototype A B C  生成一个可以在浏览器里看的 HTML 原型
               输入模式：standalone 或 workflow。可接 design-brief / ux-audit / screenshot_delta / figma-demo blueprint / standalone brief
               质量 gate：Step0认知门禁、framework契约、设计系统、动态参考、QA 不因 standalone 取消

/figma-demo    A B C D 口述 + Figma → HTML 演示 Demo 编排器
               输入模式：standalone 优先。口述流程 + Figma 截图/链接；没有 Figma 时可降级为纯口述
               产出：requirement.md + mapping-proof.md + blueprint.yaml + index.html + prototype-spec.md
               说明：适合汇报型 Demo、大型多节点 Demo、需要按 Figma 画面拆节点并隔离构建上下文的场景

/figma-layer   A   C   把 HTML 原型还原到 Figma，作为交付稿
               输入模式：standalone 转换工具或 workflow 下游。需要 /html-prototype 或 /figma-demo 的 index.html + prototype-spec
               额外要求：需要 Figma MCP 已连接

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

然后 AskUserQuestion：

> 需要从哪个 skill 开始？或者描述你想做的事，我帮你判断用哪个。

<!-- FILE_END: SKILL.md -->
