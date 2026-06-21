# /office 向导式入口（从 SKILL.md 外移，仅 /office 命令时加载）

## /office — 向导式入口

项目上下文门禁发生在 `/office` 场景分流之前。用户说“老项目/已有项目/继续项目”
时，必须先确认或切换项目；不得直接解释为场景 B「已有功能优化」。

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
> D）**我要把一个现有功能 Agent 化** — 从"用户手动操作"变为"用户监督 Agent"，强制执行代理层设计（可见/暂停/接管/撤销）
> E）**我已经在流程中了，想用某个具体工具** — 直接看 skill 列表

---

### Step 2：根据选择推荐 workflow

**用户选 A（新功能）：**

```
推荐流程：

1. /idea           → （可选）把原始语料整理成结构化需求清单
2. /deepresearch   → （可选）对主题做多 Agent 深度研究
3. /brainstorm     → 苏格拉底拷问式产品思考，写成 PRD
   superpowers:brainstorming → （轻量替代）需求明确时用这个快速出设计文档，
   跳过 subagent 和 Oracle
4. /ux-research    → UX多维度深度研究（5+1并行agent，共识矩阵，苏格拉底审查）
5. /ux-brainstorm  → UX设计方案编排器（7个UX逼问，2-3方案，Oracle审查）
6. /design-brief    → 轻量交互文档与原型决策（不跑 ux-brainstorm 时可独立使用）
7. /open-design     → **首选**：交互文档 → OD 桌面端生成 HTML（默认 / headless opt-in）→「拉回来」落盘
   magicpath       → （备选）需求描述 → React canvas 组件（OD 不可达时）
   /html-prototype → （备选）生成 HTML 原型
   /figma-demo     → （备选）口述 + Figma → HTML 演示 Demo
8. /figma-layer    → 还原到 Figma

从哪里开始都可以。/deepresearch 的报告可以直接传给 /brainstorm 作为输入。
需求范围明确、不需要重型拷问时，可以用 superpowers:brainstorming 替代第3步。
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
   superpowers:brainstorming → （轻量替代）优化点明确时快速出设计文档
3. /ux-audit       → 评审当前页面找问题（需要截图）
4. /ux-research    → UX多维度深度研究（竞品+范式+用户行为+AI可行性）
5. /ux-brainstorm  → UX设计方案编排器
6. /design-brief    → 轻量交互文档与原型决策
7. /open-design     → **首选**：交互文档 → OD 桌面端生成 HTML（默认 / headless opt-in）→「拉回来」落盘
   magicpath       → （备选）需求描述 → React canvas 组件（OD 不可达时）
   /html-prototype → （备选）生成改版原型
   /figma-demo     → （备选）基于 Figma 截图/链接和口述生成演示 Demo
/brainstorm 可以直接用，不需要先跑 /idea。需求范围明确时可用 superpowers:brainstorming 替代。
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
4. /open-design     → **首选**：交互文档 → OD 桌面端生成 HTML（默认 / headless opt-in）→「拉回来」落盘
   magicpath       → （备选）需求描述 → React canvas 组件（OD 不可达时）
   /html-prototype → （备选）按评审清单逐条生成改版原型
   /figma-demo     → （备选）基于 Figma 截图/链接和口述生成演示 Demo
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
8. /open-design     → **首选**：交互文档 → OD 桌面端生成 HTML（默认，含 Agent 专有状态 / headless opt-in）→「拉回来」落盘
   magicpath       → （备选）需求描述 → React canvas 组件（OD 不可达时）
   /html-prototype → （备选）生成原型
   /figma-demo     → （备选）口述 + Figma → Agent 化演示 Demo
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

── 全流程编排 ──────────────────────────────────────────────────

/auto          A B C D   全自动多 Agent 编排：自然语言需求 → 自动 Skill Pipeline →
               并行执行 → 聚合产出
               输入模式：standalone。直接描述需求即可，自动判断 skill 组合
               说明：不确定用哪个 skill 时首选；多 skill 组合场景优先于单个 skill

── 需求与策略 ──────────────────────────────────────────────────

/idea          A B C D   把一个模糊想法整理成清晰的需求方向
               输入模式：standalone。直接输入想法/语料即可；不是所有流程的强制起点

/deepresearch  A B D     多 Agent 并行深度研究（5-8 个研究 Agent +
共识矩阵交叉验证 + 苏格拉底质疑）
               输入模式：standalone 或 workflow。输入一个主题即可；也可读取
               idea/PRD 作为范围约束
               产出：docs/research/deepresearch-{topic}-{date}.md
               说明：可在 /brainstorm 之前使用，研究报告可作为 brainstorm 的输入

/brainstorm    A B D     苏格拉底拷问式 PRD（替代原 /prd）
               输入模式：standalone 或 workflow。可接受 deepresearch 报告、/idea 产出、或直接描述
               产出：PRD .md + 条件产出 prd-ai-spec.md（涉及 AI Native 时）
               机制：3 并行 Agent 提取+假设+缺口 → 内部压力测试 → AI Native
               评估 → 苏格拉底 6 问拷问 → 方案探索 → Oracle 对抗审查 → 写
               PRD
               说明：完整替代原 /prd。所有下游 skill 读取 brainstorm 产出的 PRD

── 研究与分析 ──────────────────────────────────────────────────

/ux-research     A B D   UX多维度深度研究（5+1并行agent，共识矩阵，苏格拉底审查）
                       输入模式：standalone 或 workflow。可直接输入设计问题，
                       也可读取 /brainstorm 的 PRD
                       场景D：重点分析 Agent 类竞品（Cursor/Granola/Claude Projects）
                       的"意图/反馈/权限"

/ux-audit      B C     评审一个已有页面，找出视觉、交互、业务上的问题
               输入模式：standalone 或 workflow。需要页面截图/页面参考（质量 gate）

/compare       A B C D 方案对比：两个设计方案/版本/截图并排比较，找差异和优劣
               输入模式：standalone。可接受两个 HTML/截图/文档路径

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
               说明：产出跨工具 Design Generation Packet，供 MagicPath / Open Design /
               Claude Design / HTML fallback / 开发消费

── 原型实现 ────────────────────────────────────────────────────

/open-design   A B C D **设计产出首选**：交互文档 → OD 桌面端生成 HTML（默认 / headless opt-in）→「拉回来」落盘
               输入模式：standalone 或 workflow。输入 design-brief 交互文档；
               默认在 OD 桌面端生成 + 在 OD UI 内判断「是否符合需求」，说「拉回来」落盘 docs/prototype/（headless 为 opt-in）
               说明：注入 FxUI 品牌色+文字色 token（不绑组件库）；OD daemon 不可达时退回 magicpath/html-prototype

magicpath      A B C D 备选（OD 不可达时）：需求描述 → React canvas 组件
               输入模式：standalone 或 workflow。standalone 可直接描述界面；
               workflow 必须消费 design-brief 的 Design Generation Packet
               说明：有 MagicPath canvas 环境时使用；不可用时退回 /html-prototype

/html-prototype A B C  生成可在浏览器查看的 HTML 原型（OD/MagicPath 不可用时备选）
               输入模式：standalone 或 workflow。可接 design-brief / ux-audit /
               screenshot_delta / figma-demo blueprint / standalone brief
               质量 gate：Step0认知门禁、framework契约、设计系统、动态参考、QA
               不因 standalone 取消

/figma-demo    A B C D 口述 + Figma → HTML 演示 Demo 编排器
               输入模式：standalone 优先。口述流程 + Figma 截图/链接；没有 Figma
               时可降级为纯口述
               产出：requirement.md + mapping-proof.md + blueprint.yaml + index.html + prototype-spec.md
               说明：适合汇报型 Demo、大型多节点 Demo、需要按 Figma
               画面拆节点并隔离构建上下文的场景

/figma-layer   A   C   把 HTML 原型还原到 Figma，作为交付稿（套 FxUI 品牌色+文字色 token）
               输入模式：standalone 转换工具或 workflow 下游。需要 /open-design、
               /html-prototype 或 /figma-demo 的 index.html + prototype-spec
               额外要求：需要 Figma MCP 已连接（新版 use_figma）

── 工程落地 ────────────────────────────────────────────────────

/tech-spec     A B D   工程规格文档：PRD + design-brief → 技术合同，强制覆盖率验证
               输入模式：standalone 或 workflow。可接 /brainstorm PRD + /design-brief 产出
               产出：docs/engineering/{topic}-tech-spec.md

/task-plan     A B D   任务编排计划：渐进式索引 + 断言矩阵 + 开发/测试任务卡
               输入模式：standalone 或 workflow。执行前必须通过门禁
               产出：docs/engineering/{topic}-task-plan.md

── 外部 Skill（superpowers plugin）─────────────────────────

superpowers:brainstorming  A B   轻量设计文档（来自 superpowers plugin）
               调用方式：Skill tool 调用 superpowers:brainstorming，或斜杠命令 /superpowers:brainstorming
               定位：/brainstorm 的轻量替代。不用 subagent、不做 Oracle 对抗审查、不写 ai-spec
               流程：探索上下文 → 逐个提问 → 2-3 方案 + trade-off →
               分节呈现设计 → 写设计文档
               适用：需求范围明确的中小型需求，想快速收敛而不需要重型苏格拉底拷问
               产出：设计文档（docs/plans/ 目录，superpowers 默认路径）
               前置：需要已安装 superpowers plugin（/plugin install superpowers@claude-plugins-official）
               说明：产出可作为下游 /ux-research、/design-brief、/html-prototype 的输入

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

然后 AskUserQuestion：

> 需要从哪个 skill 开始？或者描述你想做的事，我帮你判断用哪个。

<!-- FILE_END: office-wizard.md -->
