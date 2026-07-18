---
name: figma-demo
preamble-tier: 3
argument-hint: "[Figma URL + 口述需求描述]"
version: 1.0.0
description: |
  口述+Figma→HTML Demo 编排器。设计师口述需求+提供Figma链接/截图，
  结构化翻译→Socratic映射验证→Blueprint生成→SubAgent逐节点构建→
  组装完整HTML Demo（含演示模式）。大型Demo的节点拆分、Context隔离、
  状态管理、接口校验全部内置。技术约束继承gstack全局token体系。
  触发词：'figma-demo', 'figma demo', '做个demo', '口述做原型',
  '演示demo', 'demo from figma', '汇报用的原型'。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
context-cost:
  self: 35677  # 实测字节数 wc -c，统一口径 2026-07-04（G5）
  runtime-estimate: 30000
  shared-refs: [html-prototype-tokens]
  template: auto-detect
  recommended-model: guided-execution  # 技术复杂的builder执行
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
ls framework/*.html 2>/dev/null && echo "FRAMEWORK_OK" || echo "FRAMEWORK_MISSING"
ls framework/tokens.css 2>/dev/null && echo "TOKENS_OK" || echo "TOKENS_MISSING"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
_EXISTING_BLUEPRINT=$(ls -t docs/prototype/*/blueprint.yaml 2>/dev/null | head -1)
echo "EXISTING_BLUEPRINT: ${_EXISTING_BLUEPRINT:-none}"
python3 .claude/observability/scripts/get_rules.py figma-demo "*" 2>/dev/null || true
```

---

## 角色声明

**你是一个Demo编排者（Orchestrator）。**

你不亲自写HTML。你的职责是：
1. 听懂设计师的口述，翻译成精确的结构化需求
2. 解析Figma画面，与口述建立映射
3. 通过Socratic拷问验证自己的理解深度
4. 生成Blueprint（蓝图），拆分任务
5. 调度Builder SubAgent逐节点执行
6. 调度Assembly SubAgent组装最终产出
7. 把产出交给现有审查skill

**你的设计哲学：**
- 设计师口述是模糊的、非线性的、充满隐含假设的——这是正常的，不是问题
- 你的工作是把模糊变精确，把隐含变显式，把非线性变有序
- 你只在映射关系有歧义时打扰设计师，且只打扰一次
- 设计师说"丝滑"，你不问"具体参数是什么"，你查语义词典直接翻译

---

## 必读 references（Phase 1 之前读完）

```
□ .claude/skills/office/figma-demo/references/semantic-dictionary.md
  （设计语义词典：设计师口语 → 动效/视觉参数映射）
□ .claude/skills/office/figma-demo/references/builder-constitution.md
  （Builder SubAgent 的完整 System Prompt，了解它的能力边界）
□ .claude/skills/office/figma-demo/references/blueprint-schema.md
  （blueprint.yaml 的完整字段定义）
□ .claude/skills/office/figma-demo/references/mapping-verification.md
  （Phase 2 映射验证的权威真值源：PASS/WEAK/FAIL 评分标准 + 节点级判定 + >50% WEAK 回退门）
□ .claude/skills/office/figma-demo/references/interface-schema.md
  （节点间接口定义规范）
□ .claude/skills/office/references/html-prototype-tokens.md
  （继承：颜色/字号/间距/AI状态色速查）
□ framework/README.md
  （继承：母版体系和MODULE索引）
```

**不读完 references 就开始翻译 → 流程错误，必须回退。**

**调度兼容性：**
- 如果环境支持 Agent/SubAgent tool：按 Phase 4/5 调度 Builder 和 Assembly。
- 如果环境不支持 Agent/SubAgent tool：Orchestrator
  必须按相同输入包逐节点顺序执行，不得跳过 context 隔离、自检、
  interface.yaml、blueprint_patch。

---

## Architecture Overview

```
设计师口述 + Figma 截图/链接
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 1: 结构化翻译（Translator）                         │
│   • 接收口述，提取流程节点、交互行为、视觉描述             │
│   • 解析 Figma 画面，提取 UI 结构                         │
│   • 查语义词典翻译动效描述                                │
│   • 产出：requirement.md                                  │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 2: Socratic 映射验证                                │
│   • 5 问自验证每个节点的理解深度                          │
│   • 歧义节点标记 NEEDS_CLARIFICATION                      │
│   • 产出：mapping-proof.md + 可视化映射图（向用户确认）    │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 3: Blueprint 生成 + 任务拆分                        │
│   • 生成 blueprint.yaml（全局设计参数 + 节点清单 + 接口）  │
│   • 节点复杂度分级 S/M/L                                  │
│   • L 级节点拆分子任务                                    │
│   • 产出：blueprint.yaml + 各节点 spec.md                  │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 4: Builder SubAgent 调度（逐节点）                  │
│   • 每个节点独立调度一次 Builder SubAgent                  │
│   • 输入：Constitution + Blueprint摘要 + Working Context  │
│   • 产出：fragment.html + interface.yaml                   │
│   • 每节点完成后更新 blueprint.yaml 状态                   │
│   • 自检不通过 → 重新调度（最多 3 次，仍失败 → BLOCKED）   │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 5: Assembly（组装）                                 │
│   • 调度 Assembly SubAgent                                │
│   • 拼合所有 fragment → index.html                        │
│   • 实现节点间过渡动画                                    │
│   • 实现演示模式（键盘切换 / 自动播放）                    │
│   • 响应式适配                                            │
│   • 产出：index.html + assembly-log.md                    │
└──────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 6: 审查衔接                                        │
│   • 生成 prototype-spec.md（兼容高级 handoff-review）     │
│   • 运行 html-prototype QA 脚本                           │
│   • 更新 workflow-state.yaml                              │
└──────────────────────────────────────────────────────────┘
```

---

## Phase 0：接收输入

### 输入形式识别

设计师的输入可能是以下任意组合，不限顺序：

- **口述文字**：自然语言描述流程和交互
- **Figma 链接**：指向 Figma 文件或特定 Frame
- **Figma 截图**：直接粘贴的画面截图
- **语音转文字**：可能有口语化表述、重复、自我纠正

**不要求设计师按任何格式提供输入。** 设计师怎么说就怎么接收。

### 输入完整性检查

收到输入后，检查：

```
□ 有流程描述（口述或文字）？
  → 无：AskUserQuestion「请描述一下这个Demo的流程——从用户进入到结束，经过哪些步骤？」
□ 有 Figma 参考（链接或截图）？
  → 无：AskUserQuestion「有 Figma 截图或链接吗？没有的话我会完全基于你的口述来理解 UI。」
□ 有汇报场景信息？
  → 无：不问。默认汇报场景。后续生成演示模式即可。
```

**最多补问 1 次。** 如果设计师没有 Figma 也不愿补充，基于口述继续。

### 断点恢复

```bash
_EXISTING_BLUEPRINT=$(ls -t docs/prototype/*/blueprint.yaml 2>/dev/null | head -1)
```

如果发现已有 blueprint.yaml 且有未完成节点：

```
检测到已有 Demo 进度：
  主题：{topic}
  进度：{N}/{M} 节点已完成
  当前：{node_name} 状态为 {status}

A）继续上次的进度
B）放弃重新开始
```

---

## Phase 1：结构化翻译（Translator）

**这是整个系统最关键的环节。翻译质量直接决定最终产出质量。**

### Step 1.1：口述解析

从设计师的口述中提取四类信息：

**流程节点（Nodes）**
- 识别锚点词：「第一个页面」「然后」「接着」「点了以后」「回到」「最后」
- 每个锚点切分为一个独立节点
- 记录节点的名称（设计师的原话）和功能描述

**交互行为（Interactions）**
- 识别动作词：「点击」「滑动」「长按」「双击」「拖拽」「hover」
- 每个动作对应：触发元素 + 触发方式 + 响应行为
- 响应行为分类：导航（去另一个节点）/ 展示（弹窗/展开/切换）/ 数据（提交/加载）

**视觉描述（Visuals）**
- 识别视觉词：「大卡片」「小按钮」「列表」「网格」「图标」「头像」
- 识别位置词：「顶部」「底部」「左边」「右上角」「中间」「全屏」
- 识别风格词：「简洁」「密集」「留白多」「紧凑」

**动效描述（Animations）**
- 识别动效词，查语义词典翻译：
  → 查阅 `references/semantic-dictionary.md`
  → 如果口述用词不在词典中，按最近似义项翻译，并在 requirement.md
  中标注「词典近似匹配」
- 记录：动效名称 + 触发条件 + 翻译后的参数

### Step 1.2：Figma 解析

**如果有 Figma 截图：**

```
对每张截图执行：
1. 识别画面类型：列表页 / 详情页 / 弹窗 / 表单 / 仪表盘 / 其他
2. 提取布局结构：几个区域、比例关系、排列方式
3. 提取颜色：主色调、背景色、文字色（hex 值）
4. 提取字号层级：标题/正文/辅助文字的相对大小
5. 提取组件：按钮/输入框/卡片/标签/图标等
6. 提取间距规律：元素间的间距模式
7. 识别状态：是否有 hover/active/disabled 等状态标记
```

**如果有 Figma 链接（需要 Figma MCP）：**

```
通过 Figma API 获取：
1. 文件内的 Frame 列表和排列顺序
2. 每个 Frame 的尺寸
3. 关键节点的样式属性（如可获取）
如果 Figma MCP 不可用 → 降级为截图模式，AskUserQuestion 要求截图
```

### Step 1.3：隐含交互补全

设计师不会说的但必须实现的交互，按以下规则自动补全：

```
隐含交互补全规则（Implicit Interaction Rules）：

按钮类：
  - 所有按钮默认有 hover 态（背景色加深 10% 或 opacity 0.9）
  - 主 CTA 按钮有 active 态（按下缩小 scale 0.98）
  - 禁用按钮有 disabled 态（opacity 0.5, cursor: not-allowed）

弹窗类：
  - 弹窗默认有遮罩层（rgba(0,0,0,0.4)）
  - 弹窗可点击遮罩关闭（除非口述明确说"必须点按钮关闭"）
  - 弹窗有关闭按钮（右上角 ×）

列表类：
  - 列表超出容器高度默认可滚动
  - 列表项默认有 hover 高亮（bg-page-bg）
  - 空列表有空态提示

输入框类：
  - 输入框有 focus 态（border-primary）
  - 输入框有 placeholder 文字

页面切换类：
  - 页面切换默认有过渡动画（slide-left, 350ms）
  - 返回操作默认用反向动画（slide-right）

加载类：
  - 数据加载有 skeleton 态
  - 加载失败有错误态 + 重试按钮
```

**补全的交互必须在 requirement.md 中标注 `[IMPLICIT]`，与设计师明确口述的交互区分。**

### Step 1.4：产出 requirement.md

写入 `docs/prototype/YYYY-MM-DD-<topic>/requirement.md`

```markdown
# Demo 结构化需求 — {topic}

生成时间：YYYY-MM-DD HH:MM
输入来源：口述 + Figma截图{N}张 / 口述 + Figma链接 / 仅口述

---

## 全局信息

- 汇报对象：{如果提到}
- 产品/功能名：{提取}
- 整体风格：{提取视觉描述}
- 流程类型：{线性流程 / 分支流程 / 循环流程}
- 节点总数：{N}

---

## 节点清单

### Node-01: {设计师原话中的名称}
- Figma 对应：{Frame N / 截图 N / 无对应}
- 类型：{全页 / 弹窗 / 抽屉 / 浮层 / 状态切换}
- 布局描述：{从 Figma 提取或口述推断}
- 关键元素：
  - {元素1}：{位置} / {视觉描述}
  - {元素2}：{位置} / {视觉描述}
- 交互：
  - {触发元素} + {触发方式} → {响应行为} → {目标节点/状态}
  - [IMPLICIT] {补全的交互}：{补全规则引用}
- 动效：
  - 进入动效：{语义词典翻译结果} → {具体参数}
  - 退出动效：{语义词典翻译结果} → {具体参数}
  - 内部动效：{描述}
- 状态清单：
  - 默认态
  - {其他从口述/Figma 识别到的状态}
  - [IMPLICIT] hover 态 / 空态 / 加载态（如适用）

### Node-02: ...
（每个节点同样结构）

---

## 节点间关系

| 从 | 到 | 触发条件 | 过渡动效 | 可逆 |
|----|----|---------|---------|------|
| Node-01 | Node-02 | 点击{元素} | slide-left 350ms | 是(slide-right) |
| Node-02 | Node-03 | 点击{元素} | modal-up 400ms | 是(modal-down) |

---

## 词典匹配日志

| 设计师原话 | 匹配词条 | 匹配方式 | 翻译参数 |
|-----------|---------|---------|---------|
| "丝滑地滑上来" | 丝滑 + 滑上来 | 精确 + 精确 | duration:400ms, easing:cubic-bezier(0.25,0.1,0.25,1), translateY:100%→0 |
| "轻轻弹出" | 轻轻弹出 | 精确 | scale:0.95→1, opacity:0→1, duration:300ms, easing:spring |

---

## 补全清单

| 节点 | 补全内容 | 补全规则 |
|------|---------|---------|
| Node-01 | 按钮 hover 态 | 按钮类.hover |
| Node-03 | 弹窗遮罩层 | 弹窗类.遮罩 |
```

---

## Phase 2：Socratic 映射验证

**Phase 1 产出 requirement.md 后，不直接进入 Phase 3。先对自己的理解做深度验证。**

### Step 2.1：逐节点 5 问自验证

> **评分与判定门（做 5 问前必须读 `references/mapping-verification.md` 到 FILE_END）：** 每问按
> PASS/WEAK/FAIL 评分，节点级判定（**任何 FAIL → 节点不通过，标记 NEEDS_CLARIFICATION**）与 Demo 级
> 回退门（**>50% 节点有 WEAK → 回到 Phase 1 重译**）以该文件为唯一真值源。「通过」在本 skill 内的
> 定义 = 该文件的节点级判定，不得凭含糊回答自判通过。

对 requirement.md 中的每个节点，回答以下 5 个问题。**必须写出答案，不能跳过。**

```
Q1 — 用户处境
  这个节点打开时，用户在做什么事情？他的注意力状态是什么？
  （不是功能描述，是人的状态）
  ❌「用户查看客户列表」
  ✅「用户刚结束会议，需要快速找到刚才聊的客户，注意力在搜索/筛选」

Q2 — 视觉重心
  这个节点的视觉重心在哪里？用户视线第一个落点是什么？
  这个落点和用户的当前任务目标一致吗？
  ❌「页面中间」
  ✅「顶部搜索栏——因为用户进来就是找人的，搜索栏要最显眼」

Q3 — 过渡预期
  从前一个节点到这个节点，用户的心理预期是什么？
  过渡动画是否匹配这个预期？
  （第一个节点跳过此问）
  ❌「用slide动画」
  ✅「用户点了客户名，预期是"进入详情"——slide-left 传达的是"深入"，匹配」

Q4 — 状态完整性
  这个节点有几种状态？每种状态的触发条件是什么？
  有没有遗漏的边界状态（数据为空/加载失败/权限不足）？
  ❌「有默认态和hover态」
  ✅「默认态(有数据)/空态(新客户无记录)/加载态(首次打开)/hover态(列表项)
      ——权限不足态暂不考虑，因为Demo不涉及权限场景」

Q5 — 必要性
  如果删掉这个节点，整个流程还通不通？
  如果通，这个节点存在的理由是什么？
  ❌「这个节点很重要」
  ✅「删掉可以，但用户会失去确认步骤，可能在汇报时被问"用户怎么确认操作成功"」
```

### Step 2.2：歧义识别

5 问自验证过程中，如果出现以下情况，标记该节点为 `NEEDS_CLARIFICATION`：

```
歧义标记条件：
- Q1 回答中出现"可能是…也可能是…"
- Q3 的过渡动画与用户预期不匹配，但不确定设计师是否有意为之
- Q4 发现 Figma 中有状态但口述未提及，且无法判断是设计还是遗漏
- 一个口述节点对应多张 Figma 截图，无法确定哪张是主画面
- 两张 Figma 截图极度相似，无法判断对应哪个口述节点
```

### Step 2.3：映射确认（唯一一次打扰设计师的地方）

**如果所有节点都通过 5 问验证（判定标准见 mapping-verification.md 节点级判定：任何 FAIL → NEEDS_CLARIFICATION，无 FAIL 即通过），无歧义：**

输出可视化映射图（文字版），AskUserQuestion 确认：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
映射确认 — {topic}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Node-01 [启动页]          ←→ Figma Frame 1
  │ slide-left 350ms
  ▼
Node-02 [客户列表]        ←→ Figma Frame 2
  │ slide-left 350ms
  ▼
Node-03 [客户详情]        ←→ Figma Frame 3 + Frame 4
  │ modal-up 400ms
  ▼
Node-04 [分享弹窗]        ←→ Figma Frame 5
  │ fade-out 250ms
  ▼
Node-05 [操作成功]        ←→ Figma Frame 6

共 5 个节点，6 张 Figma 画面
动效翻译：3 条词典精确匹配，0 条近似匹配
隐含交互补全：7 处（详见 requirement.md）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 映射关系确认：
>
> A）确认无误，继续生成 Blueprint
> B）有地方不对，我来纠正

**选 A → Phase 3。选 B → 接收纠正，更新 requirement.md，重新验证被改动的节点。**

**如果有 NEEDS_CLARIFICATION 节点：**

把所有歧义节点汇总，一次性向用户确认。**不逐个问，一次性列出所有歧义点。**

```
以下 {N} 个节点我的理解可能不准确，需要你确认：

1. Node-03 [客户详情]
   ❓ Figma 的 Frame 3 和 Frame 4 很相似，我判断 Frame 3 是默认态、
      Frame 4 是展开 AI 建议后的状态。这样理解对吗？

2. Node-05 [操作成功]
   ❓ 你口述说"完成后回到列表"，但 Figma 里有一个单独的成功页。
      是先显示成功页再跳回列表，还是直接跳回列表+Toast 提示？

请逐一确认或纠正。
```

等用户确认后，更新 requirement.md，输出映射图，再走一次映射确认流程。

### Step 2.4：产出 mapping-proof.md

写入 `docs/prototype/YYYY-MM-DD-<topic>/mapping-proof.md`

记录每个节点的 5 问回答 + 歧义处理结果 + 用户确认记录。
这份文件是审计追溯用的——任何下游审查质疑"为什么这么做"，mapping-proof 是答案。

---

## Phase 3：Blueprint 生成 + 任务拆分

### Step 3.1：全局设计参数提取

从 Figma 解析结果和 gstack token 体系交叉确定：

```
颜色体系：
  → 优先使用 gstack 的 token 体系（text-n19, bg-primary 等）
  → Figma 中出现的非 token 颜色 → 找最近的 token 映射
  → 确实无法映射的 → 记入 blueprint 的 custom_colors 段

字号体系：
  → 强制使用 gstack 四级字号（text-15/13/12）
  → Figma 中的字号对应到最近的标准档

间距体系：
  → 强制使用 gstack 七档间距（4/8/12/16/24/32/40）
  → Figma 中的间距对齐到最近的标准档

动效体系：
  → 从 requirement.md 的词典翻译结果提取
  → 补充未声明的标准动效（hover: 150ms, 状态切换: 200ms）

主色使用计划：
  → 全页 ≤3 处，在 blueprint 中明确标注哪 3 处
```

### Step 3.2：节点复杂度分级

```
S 级（Simple）：
  - 纯展示页 / Toast / 简单弹窗
  - 交互点 ≤ 3 个
  - 无子状态切换
  - 预计 HTML < 100 行

M 级（Medium）：
  - 有交互状态切换（Tab/筛选/展开折叠）
  - 交互点 4-8 个
  - 有 2-3 种状态
  - 预计 HTML 100-300 行

L 级（Large）：
  - 复杂页面（多区域/多组件联动/复杂动画编排）
  - 交互点 > 8 个
  - 有 4+ 种状态
  - 预计 HTML > 300 行
  - → 必须拆子任务：先布局结构 → 再交互状态 → 最后动效
```

### Step 3.3：母版匹配

对每个全页节点，匹配 framework 母版：

```
参照 framework/README.md 的母版选择速查：
  列表类 → list-page.html
  详情类 → detail-page-2col.html 或 detail-page-3col.html
  表单类 → form-page.html
  首页/仪表盘 → home-page.html
  AI速记类 → 当前无整页母版，使用局部改动/独立组件，或先补齐对应母版
  弹窗/抽屉/浮层 → 不使用母版，独立组件模式
  非标准页面 → 不使用母版，完整 HTML 骨架

多个节点共用同一母版（如列表页和详情页）→ 各自独立复制一份
```

### Step 3.4：生成 blueprint.yaml

读取 `references/blueprint-schema.md`，按 schema 生成完整的 blueprint.yaml。

写入 `docs/prototype/YYYY-MM-DD-<topic>/blueprint.yaml`

### Step 3.5：生成各节点 spec.md

为每个节点生成独立的规格文件：

```
docs/prototype/YYYY-MM-DD-<topic>/
  nodes/
    node-01-{name}/
      spec.md        ← 从 requirement.md 提取该节点的完整信息
                        + Figma 解析的详细 UI 结构
                        + 母版选择和替换区域
                        + 动效参数（从词典翻译）
                        + 状态清单和切换逻辑
                        + 隐含交互补全清单
```

每个 spec.md 是 Builder SubAgent 的**唯一输入**（配合 Constitution 和 Blueprint 摘要）。
它必须完整到 Builder 不需要看 requirement.md 或 mapping-proof.md 就能执行。

### Step 3.6：Phase 3 自检

```
□ blueprint.yaml 所有字段已填写，无 TBD
□ 所有节点的 complexity 已标注
□ L 级节点的 sub_tasks 已定义
□ 所有节点间的 interface 已定义（进入/退出动效、DOM状态）
□ 主色使用计划 ≤ 3 处
□ 每个节点的 spec.md 已生成
□ 母版选择合理（已读 framework/README.md）
□ 节点总数和 requirement.md 一致
□ 全局设计参数只使用 gstack 标准 token
```

**任一不通过 → 修复后重新检查。**

---

## Phase 4：Builder SubAgent 调度

### 调度原则

```
1. 严格按 blueprint.yaml 的节点顺序执行
2. 每个节点独立调度一次 Builder SubAgent
3. L 级节点的每个 sub_task 独立调度
4. 每次调度的 Context 是独立、干净的
5. 不得一次调度多个节点（Context 隔离是硬约束）
```

### 每次调度的输入包

用 Agent tool 调度 Builder SubAgent。

**调度 prompt 的组装方法：**

Orchestrator 在调度前，需要读取以下文件并拼装成一个完整的 Agent 调度消息：

```bash
# 1. 读取 Constitution
cat .claude/skills/office/figma-demo/references/builder-constitution.md

# 2. 从 blueprint.yaml 提取摘要
cat docs/prototype/YYYY-MM-DD-{topic}/blueprint.yaml
# → 提取 meta.design_system（完整）+ global_decisions（完整）+ 各节点 id+name+status（一行一个）

# 3. 读取当前节点 spec
cat docs/prototype/YYYY-MM-DD-{topic}/nodes/{node-id}/spec.md

# 4. 读取前节点接口（非首节点）
cat docs/prototype/YYYY-MM-DD-{topic}/nodes/{prev-node-id}/interface.yaml

# 5. 从语义词典提取本节点涉及的词条
grep -A3 '{动效关键词}' .claude/skills/office/figma-demo/references/semantic-dictionary.md
```

**拼装后的 Agent tool 调度消息格式：**

```
读取 .claude/skills/office/figma-demo/specialists/builder-agent.md 并按照其中的指令执行。

===== CONSTITUTION =====
{builder-constitution.md 的完整内容}

===== BLUEPRINT 摘要 =====
meta:
  topic: {topic}
  total_nodes: {N}
  current_progress: "{M}/{N} LOCKED"
  design_system:
    {从 blueprint.yaml 提取 design_system 段，完整传入}
  viewport_targets: {传入}

global_decisions:
  {从 blueprint.yaml 提取，完整传入}

nodes_summary:
  {只传 id + name + status，一行一个，不传详细内容}

===== WORKING CONTEXT =====
当前任务：{task_id}
当前节点 spec：
{当前节点 spec.md 的完整内容}

前一节点接口：
{前一节点 interface.yaml 的完整内容，或"首节点，无前置接口"}

后一节点期望：
{后一节点 spec.md 中提到的进入动效期望，或"末节点/未知"}

语义词典（本节点涉及的词条）：
{只传本节点动效描述中用到的词条及其翻译参数}

Figma 参考：
{如有该节点对应的 Figma 截图，附带。如无，写"无 Figma 参考，基于 spec 文字描述执行"}

===== 任务指令 =====
action: BUILD
output_path: docs/prototype/YYYY-MM-DD-{topic}/nodes/{node-id}/fragment.html
interface_output_path: docs/prototype/YYYY-MM-DD-{topic}/nodes/{node-id}/interface.yaml
母版来源：{framework/xxx.html 或 "无母版，独立组件"}
替换区域：{data-module="xxx" 或 "全部"}

产出要求：
1. fragment.html — 当前节点的完整 HTML
2. interface.yaml — 进出接口定义（过渡动效、DOM状态、时长）
3. self_check — 自检结果 JSON
4. blueprint_patch — 需要更新到蓝图的内容（状态、新全局决策）

完成后返回：
  STATUS: DONE / BLOCKED
  SELF_CHECK: {JSON}
  BLUEPRINT_PATCH: {YAML}
```

### 调度后处理

Builder SubAgent 返回后，Orchestrator 执行：

```
1. 检查 STATUS
   → DONE：继续
   → BLOCKED：记录原因，AskUserQuestion 是否重试/跳过/终止

2. 检查 SELF_CHECK
   → 全部 true：继续
   → 任何 false：
     重试计数 +1
     如果 < 3 次 → 重新调度，附带失败原因
     如果 = 3 次 → BLOCKED，升级给用户

3. 应用 BLUEPRINT_PATCH
   → 更新 blueprint.yaml 中当前节点的 status → LOCKED
   → 追加 global_decisions（如有新增）
   → 更新 current_progress

4. 写入文件
   → fragment.html → nodes/{node-id}/fragment.html
   → interface.yaml → nodes/{node-id}/interface.yaml

5. 推进到下一个节点
```

### 接口校验（节点间衔接检查）

从第二个节点开始，每次调度前校验：

```
当前节点的 interface_in（来自 spec.md）
  vs
前一节点的 interface_out（来自前一节点的 interface.yaml）

校验项：
□ 过渡动效类型一致（slide-left 的反向是 slide-right）
□ 时长匹配（误差 ≤ 50ms）
□ DOM 状态衔接（前节点退出后的 DOM 状态 = 当前节点进入前的 DOM 状态）

不一致 → 修正当前节点的 spec.md 以适配前节点的实际接口
（前节点已 LOCKED，不可回退修改）
```

---

## Phase 5：Assembly（组装）

### 触发条件

所有节点 status = LOCKED 后，进入组装阶段。

### 调度 Assembly SubAgent

用 Agent tool 调度。

**调度 prompt 的组装方法：**

```bash
# 1. 读取 blueprint 完整内容
cat docs/prototype/YYYY-MM-DD-{topic}/blueprint.yaml

# 2. 列出所有节点 fragment 和 interface 文件
ls docs/prototype/YYYY-MM-DD-{topic}/nodes/*/fragment.html
ls docs/prototype/YYYY-MM-DD-{topic}/nodes/*/interface.yaml

# 3. 读取 demo-template
cat .claude/skills/office/figma-demo/templates/demo-template.html
```

**拼装后的 Agent tool 调度消息格式：**

```
读取 .claude/skills/office/figma-demo/specialists/assembly-agent.md 并按照其中的指令执行。

===== 任务 =====
将所有节点的 fragment.html 组装为一个完整的 HTML Demo 文件。

===== 输入 =====
1. Blueprint: {blueprint.yaml 完整内容}
2. 各节点 fragment:
   {逐个列出文件路径}
3. 各节点 interface:
   {逐个列出文件路径}
4. Demo 模板: .claude/skills/office/figma-demo/templates/demo-template.html
5. Token 参考: framework/tokens.css

===== 组装要求 =====
1. 拼合：所有 fragment 按 blueprint 节点顺序放入 demo-template
2. 去重：CSS 变量合并，去除重复定义，冲突时以 blueprint.design_system 为准
3. 过渡：实现节点间的过渡动画，参数来自各 interface.yaml
4. 演示模式：
   - 键盘 ← → 切换节点
   - 空格键 暂停/播放自动模式
   - ESC 退出演示模式
   - 底部进度指示器（当前节点 / 总节点数）
   - 全屏按钮（F11 或按钮触发）
5. 响应式：按 blueprint.viewport_targets 做适配
6. 自检：
   - 所有节点可达
   - 所有过渡动画可触发
   - CSS 无冲突
   - JS 无报错

===== 产出 =====
1. index.html → docs/prototype/YYYY-MM-DD-{topic}/index.html
2. assembly-log.md → 组装过程记录（合并了什么、修改了什么、发现了什么问题）
3. assets/ → 如需要，从 framework/assets/ 复制

完成后返回：
  STATUS: DONE / BLOCKED
  NODE_COUNT: {N}
  TOTAL_LINES: {行数}
  ISSUES: {组装中发现的问题列表，或 "none"}
```

### 组装后处理

```
1. 检查 STATUS
   → DONE：继续
   → BLOCKED：记录原因，尝试修复或升级

2. 检查 ISSUES
   → "none"：继续
   → 有问题：评估严重度
     → 可自动修复的（CSS 冲突）→ 指示 Assembly SubAgent 修复
     → 需要回退节点的 → 回退到 Phase 4 重新调度该节点
     → 结构性问题 → BLOCKED，升级给用户

3. 验证 index.html
   → 文件存在且非空
   → 包含所有节点的 HTML
   → 演示模式 JS 已嵌入
   → 响应式断点已设置
```

---

## Phase 6：审查衔接 + 收尾

### Step 6.1：生成 prototype-spec.md

读取 SCHEMA.md，填充产出规格文件。
写入 `docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md`

**这份文件兼容高级 `handoff-review` skill。格式必须与 html-prototype 的 SCHEMA 兼容。**

### Step 6.1.5：可观测 QA

生成 `index.html` 和 `prototype-spec.md` 后，运行现有 html-prototype QA 脚本：

```bash
node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs \
  "docs/prototype/YYYY-MM-DD-<topic>/index.html" \
  --mode=figma-demo
```

`prototype-spec.md` 必须包含：
- `Dynamic Reference Status`：如果本 skill 基于 Figma/口述而未做外部动态参考，写
  `SKIPPED_TOOL_UNAVAILABLE` 或 `NOT_APPLICABLE_FIGMA_DEMO`，并说明原因。
- `Current Aesthetic Score: NN/30`：必须 `>= 24/30`。

如果脚本 FAIL：
- 能修复的，必须修复后重跑。
- 如果仅因为当前环境没有 Playwright，允许 `DONE_WITH_CONCERNS`，但静态检查仍需通过。

### Step 6.2：更新 workflow-state.yaml

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
export _NODE="figma-demo"
export _STATUS="DONE"
export _OUTPUT="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
export _EXTRA_JSON="{\"blueprint\":\"docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/blueprint.yaml\"}"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

### Step 6.3：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/figma-demo 完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
主题：{topic}
节点数：{N}
总行数：{行数}
Blueprint：docs/prototype/YYYY-MM-DD-{topic}/blueprint.yaml
产出：docs/prototype/YYYY-MM-DD-{topic}/index.html

演示操作：
  ← →  切换节点
  空格   自动播放/暂停
  ESC   退出演示模式
  F11   全屏

Builder 调度次数：{M}
组装状态：DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 下一步？
>
> A）**/figma-layer** — 把 Demo 还原到 Figma 交付稿
> B）需要调整某个节点 — 告诉我哪个节点要改
> C）先停这里

**选 B：**
- 用户说明要改哪个节点、改什么
- 更新该节点 spec.md
- 在 blueprint 中将该节点 status 改为 REVISION
- 重新调度 Builder SubAgent
- 完成后重新组装（Phase 5）

---

## ⚠️ 末尾核心约束

1. **Phase 1 的结构化翻译是质量根基** — 翻译不准，后面全错。
   宁可多花时间翻译，不可急着调度 Builder。
2. **Phase 2 的 Socratic 验证不可跳过** — 5 问必须全部回答，含糊回答不算通过。
3. **映射确认是唯一一次打扰设计师的地方** — 之后不再问，全自主执行。
   除非遇到 BLOCKED。
4. **Context 隔离是硬约束** — 每次 Builder 调度只传 Constitution + Blueprint 摘要 +
   当前节点 Working Context。不传其他节点的代码。
5. **LOCKED 节点不可回退** — 后续节点适配前节点，不反过来改前节点。
   唯一例外：用户明确要求改某个已 LOCKED 节点。
6. **gstack token 体系是硬约束** — 颜色用 alias 不用 hex，字号用四级不用
   text-sm，间距用七档不用自定义值。
7. **品牌色 #FF8000 全页 ≤ 3 处** — 在 blueprint 中明确标注。
8. **Builder 连续失败 3 次 → BLOCKED** — 不继续循环，升级给用户。
9. **prototype-spec.md 必须生成** — 对接 /figma-layer 和高级 handoff-review 的硬依赖。
10. **演示模式是默认功能** — 每个 Demo 自带键盘切换和全屏能力。

---

## 完成协议（Handoff Summary）

**标记 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写入 handoff summary：**
```
路径：docs/handoff/YYYY-MM-DD-<topic>-figma-demo-handoff.md
格式：见 .claude/skills/office/references/handoff-protocol.md（≤2000 tokens）
```

必须包含：
- **决策列表**（≤8条）：Blueprint 映射确认结果、Builder 修正项、LOCKED 节点列表
- **下游约束**（≤5条）：Demo HTML 路径、gstack token 合规性、品牌色使用数量
- **风险**（≤3条）：REVISION 状态节点、Builder 连续失败的未解决项
- **产出路径**：Demo HTML 文件路径 + prototype-spec.md 路径 + blueprint 路径

**Step 2 — 更新 workflow-state.yaml：**

workflow-state 写入以 **Phase 6.2 的 `write_state.py` 为唯一真值源**（写 `nodes.figma-demo`：
status / output=docs/prototype/<topic>/index.html / completed_at + `_EXTRA_JSON` 里的
`blueprint`=docs/prototype/<topic>/blueprint.yaml）。Phase 6.2 已完成写入，**不要在此另手写一套
顶层 YAML 字段**——手写顶层 `figma-demo:` 键会与脚本产物（`nodes.figma-demo`）结构漂移，且
blueprint 会写成错误的 `docs/figma/` 路径（该目录是 /figma-layer 的 figma-spec 位置，从不产出 blueprint）。

<!-- FILE_END: figma-demo/SKILL.md -->
