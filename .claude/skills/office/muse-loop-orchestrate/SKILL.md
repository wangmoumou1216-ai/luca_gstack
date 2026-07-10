---
name: muse-loop-orchestrate
preamble-tier: 2
argument-hint: "[语料/需求描述，或已有 REQ-* 的下一步指令]"
version: 1.0.0
description: |
  需求→原型自治 Loop 的独立正向单趟编排器（muse fork 专属新增）。
  extract→triage→map→open-design生成+judge核对 一次性单向链（2026-07-02 OD 改造后
  默认路径=open-design 生成+judge 核对+用户主导迭代，「轮数上限3」=最多3轮 judge 核对；
  gen↔judge 自动内循环仅为 OD daemon 不可达时的 fallback）。
  自行 dispatch 子任务、自带 Plan-Agent 等效门禁，零接入母版 Orchestrator
  的 Skill Workflow Mode，零改动 workflow-state.yaml/orchestrator.md。
  触发短语（fork 内 skill-routing-map.yaml 注册）：'muse loop'、'muse自进化循环'、
  '需求到原型闭环'、'跑一下muse loop'——均为复合词，不含裸"需求"/"原型"单字，
  避免撞现有 brainstorm/html-prototype/design-brief 词条。
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
context-cost:
  self: 15000
  runtime-estimate: 90000
  shared-refs: []
  recommended-model: core-execution  # 2026-07-10 Fable手术刀：编排降opus，GATE/终验裁决按fable_whitelist P0
---

## Preamble（run first）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "MUSE_LOOP_ORCHESTRATE_ENTRY: $(date +%s)"
ls docs/loop/specs/ 2>/dev/null && echo "SPECS_DIR_OK" || echo "SPECS_DIR_EMPTY_OR_MISSING"
```

## 角色声明

**你是 muse-loop 的编排器，自己驱动状态机，不借用母版 Orchestrator 的 Skill Workflow Mode。**

红队验证过：母版 Orchestrator 的 `WHILE 有 PENDING 节点` 是终止型、skill-keyed 的 DAG（`workflow-state.yaml` 是硬编码的真实 `/office` skill 名枚举，没有回退到早期阶段的机制），muse-loop 需要的是"extract→triage→map→gen→judge，gen↔judge 段可以打回重来"的形状，套用母版机制需要改 `workflow-state.yaml` 模板 + `orchestrator.md` 章节——那是母版共享文件，加法纪律下不碰。**所以本 skill 自己实现一个小状态机，只借鉴母版 Orchestrator 的"扫描待办→查门禁→dispatch→更新状态"这个 prose 模式，不字面复用其代码/数据结构。**

本状态机的拓扑选型（workflow+2个不可省略人类卡点，只在 gen↔judge 段放内循环）以 `constitution.md` 第1节「设计哲学」为权威依据，不在本文件重复论证。

## 状态机（单向链 + 一处有界内循环）

```
draft ──[抽取]──▶ triaged ──[GATE-1(含design_reference确认)]──▶ approved
    ──[场景B/C:基线采集→baseline.md]──[/brainstorm 完整跑一遍(B/C附baseline)]──▶ prd_ready
    ──[场景B/C:变更映射→change-map.md+轻量确认]──[design-map]──▶
    designed ──[GATE-2]──[open-design生成(主)/proto-gen(fallback)+judge核对]──▶ built ──▶ verified
```

（基线采集/变更映射/GATE-2 都是子步骤不是新状态——状态枚举不变，红队裁定 A2：产物文件存在性即是前置条件，镜像 traceable_delivery 模式。GATE-2 是 designed→built 之间的门，不新增 approved_design 枚举，与 schema.md 的 status 枚举保持一致。）

- **只有 gen↔judge 是循环**（`muse-proto-gen` ↔ `muse-proto-judge`，见下）。其余全是**只能往前走**的单向链，不回退到更早阶段——这个设计选择是刻意的：既匹配报告原始设想（"其余全自动，只有2个人类卡点"），也避免了套用母版 Orchestrator 时会撞见的"无回退机制"限制。
- 每个 REQ 的状态字段存在**它自己的 spec 文件**里（`status:` 字段，见 `muse-loop/schema.md` v0.5），不是一个全局共享的 `workflow-state.yaml`——这样多个 REQ 可以各自处于不同阶段，互不干扰。

## 产出物理落点

**不进 fork 自身 git 追踪树。** 走 muse 项目已有的 `docs/` 软链（跟 `docs/prd`、`docs/decisions`、`docs/prototype` 同一约定）：

```
docs/loop/specs/REQ-<项目缩写>-<编号>/
  requirement.md   # L1，含 status 字段
  design.md        # L2（design-brief 完整跑一遍的产出，见下）
  prototype.html   # L3
  scorecard.md      # L4
```

fork 的 git 追踪树只留骨架/环境文件（`constitution.md`、`schema.md`、参考文档），保持 `sync-upstream.sh` 的 diff 干净。

## Phase 1（draft → triaged）：抽取 + Triage

1. 抽取步骤：**不直接调用 `/idea`**（它是交互型 main_agent，会阻塞，且每次运行覆写项目级单例状态）。按 `muse-loop/references/req-extraction-principles.md` 的三铁律做忠实抽取，先判断本轮输入是"单次静态语料"还是"跨轮演化多源流"。
2. dispatch `muse-req-triage`（走它的**入口B/workflow 模式**——已抽取候选直接进 Phase 1 打分，跳过它自己的语料读取步骤；`muse-req-triage` 2026-07-01 起已提升为项目级 skill，独立使用时走入口A，两者共用同一套打分+分类+GATE-1逻辑，仅入口和输出形态不同，见其 SKILL.md）：rule-based 打分 + 独立 triage 分类。

**GATE-1（人类卡点，不可省略）：** 就是 dispatch `muse-req-triage`（入口B）时它自己 Phase 3 触发的 `AskUserQuestion`。**呈现内容以 `muse-req-triage` SKILL.md Phase 3 为唯一权威定义，本节不复述其内容、不另定义**——下面括号只是索引这份权威清单包含哪 6 个条目名（一句话陈述+来源引用/Phase 1信号/Phase 2分类/EARS校验/design_reference一行/入口B专属brownfield问法；第1项"陈述+来源"合并计为一项，与 triage Phase 3 同构，故为 6 项），每项的具体展示格式、校验规则、问法原文一律以 triage Phase 3 为准，本文件不重复。用户确认后得到最终 `human_decision`（accept/defer/reject）。`allow_standalone_override: false`——这条卡点不可绕过，源方案明确写着"这个人类卡点不可省略，它是 Loop 质量的底线"。

**本节只定义 Loop 场景专属的编排逻辑——brownfield 问法何时触发、答案如何驱动下游**（呈现文案本身在 triage Phase 3，此处不重复措辞）：

**触发判定（注意：GATE-1 时刻场景 A/B/C/D 还没被正式分类——那是 design-brief Phase 0 的事，不能引用一个还不存在的分类，此处用 GATE-1 时刻真实可得的信号）：** `design_reference` 为 null，**且**满足以下任一 brownfield 信号 → 触发 triage Phase 3 的 brownfield 问法：
- `entailment.compared_against: shipped_product_behavior`（需求明确对照现有产品行为）
- `source_trace` 含 `type: existing_product`
- 语料/陈述里出现"改/优化/调整/替换现有…"这类对已有功能动刀的表述
- 以上都没有但机器拿不准 → 也问（宁多问一句，不静默假设全新——本次真实教训的方向就是"漏问"不是"多问"）

问法文案见 triage Phase 3（四选项：①Figma链接 ②线上地址 ③截图 ④确认全新功能）。**答案的编排语义（本节权威）：** 只有用户显式选④，才允许按 `none_confirmed_greenfield` 处理；机器不得代选、不得因用户没提就默认全新（本次真实教训：整条链没看过真实 Figma，把历史记录标签当成了入口按钮）。**用户的回答同时就是 brownfield/greenfield 的权威判定**（①②③=有现有UI，走基线采集；④=全新，显式跳过）——后续"场景 B/C 必做"的所有子步骤，触发依据都是这个 GATE-1 判定结果，不是等 design-brief Phase 0 的场景分类。

**回填契约（2026-07-08 补）：** triage 机器判定阶段永不自填 `design_reference`（见其 SKILL.md Phase 0）；GATE-1 人类作答后，**本编排器立即用 Write 更新该 REQ 的 `requirement.md`**——按答案回填 `design_reference.type/ref`（选④则填 `none_confirmed_greenfield`，`decided_by` 记人类）与 `captured_at`，回填完成后才进入基线采集与后续 Phase。

## 「基线采集」子步骤（GATE-1 通过后、Phase 1.5 之前——场景 B/C 必做，2026-07-02 新增）

**为什么在这（不在设计阶段）：** 第一条真实 REQ 的错误是在 PRD 层进来的——`/brainstorm` 对现有UI一无所知，把假设写进了 PRD，下游全部继承。外部依据：BMAD brownfield 工作流的第一步就是 `document-project`（"Always Document First"，先文档化现状再写增强PRD）。

对每条 `human_decision: accept` 且场景 B/C 的需求：
1. 按 `design_reference.type` 采集真实UI → 写 `docs/loop/specs/REQ-*/baseline.md`（格式见 `muse-loop/schema.md` v0.5）：
   - `figma` → Figma MCP `get_metadata` + `get_screenshot`（真实节点结构+截图）
   - `live_html` → 读取页面 + 截图
   - `screenshot` → 用户提供截图；**不给不继续**（复用 `ux-audit` 的强制截图阻塞契约先例）
2. 盘点范围按 BMAD 规模规则：小面积→全量盘点；大页面→只盘与本 REQ 相关区域并显式声明边界。
3. 机器盘点结果给用户**人工校正**（轻量确认；借鉴 Kiro steering 的"自动生成→人工校正"模式，但校正在本机制里是**强制**的——Kiro 原文校正是可选 Refine，本 Loop 判断"未经校正的基线不可信"，主动收紧为不可省略，这是本机制自己的加严选择，不是 Kiro 本身的强制要求）——机器采集必然有错。
4. `none_confirmed_greenfield` → 显式跳过本步骤并在 REQ 目录记录一行"经人类确认为全新功能，无基线"，**非静默跳过**。

## Phase 1.5（approved → prd_ready）：dispatch `/brainstorm`，产出真实 PRD（补丁：2026-07-01 修复的内部矛盾）

**这一步是必须的，不是可选项。** `muse-req-triage` 自己的防火墙规则写着"被接受的需求最终都要经过 `/brainstorm` 真实的 Phase 1.5，才能让下游门禁信任这条数据"——但 Phase 2 的 `traceable_delivery` 硬约束（下方）需要一份真实 PRD 才能满足，而这份 PRD 只能来自 `/brainstorm` 真正跑一遍，不能凭空生成。所以对每条 GATE-1 通过（`human_decision: accept`）的需求，dispatch **`/brainstorm`**（路径1里原有的 skill，**完整跑它自己的 Phase 0-5**，不是简化版；用 GATE-1 产出的一句话陈述+来源引用作为 cold-start 输入）。

**场景 B/C 的 cold-start 输入必须附上 `baseline.md`（2026-07-02 新增，本次失败的直接修复点）：** `/brainstorm` 的输入=一句话陈述+来源引用+**现状基线清单**——PRD 里对"现有结构长什么样"的一切陈述必须扎根基线的真实盘点（真实入口数量/真实名称/真实锚点），不允许再凭会议语料的转述臆想现有UI。

产出：一份真实 PRD，其 R/AE 条目带真实、基于 research/用户答案的 `confidence` 值——这正是 Phase 2 `traceable_delivery` 模式需要的输入形态。

（若某条需求走 Loop 之前已经有一份真实 PRD 存在——例如是从路径1里已经跑过 `/brainstorm` 的产出转进 Loop 的——则跳过本 Phase 直接复用该 PRD，不重复跑。**但场景 B/C 时仍须核对该 PRD 是否扎根过真实基线；没有 → 先补基线采集，把 PRD 与基线的错配摆到变更映射步骤里暴露，不静默放行。**）

## 「变更映射」子步骤（Phase 1.5 之后、Phase 2 之前——场景 B/C 必做，2026-07-02 新增）

对照 PRD 与 `baseline.md`，编制 `docs/loop/specs/REQ-*/change-map.md`（格式见 `muse-loop/schema.md` v0.5）：每条 MUST 级 R → 基线清单项 → `MODIFY|REMOVE|ADD(锚点)|UNCHANGED`，必含"保持区"一节（什么必须不动，Kiro Bugfix Spec 的 Unchanged Behavior）与"映射失败项"一节（**PRD 里映射不到任何基线项、也不是合法 ADD 的需求=PRD 与现实错配的信号，必须上报，不许静默吞掉**——这正是本机制要抓的错误类型）。

编制完成 → 轻量 `AskUserQuestion` 确认（同"范围完整性清单"先例，不是正式 GATE）：映射表 + 基线截图**并排呈现**（Chromatic 三联对照 + Figma added/edited/removed 呈现词汇），用户拒绝 → 重采基线或重编映射，不带病进 Phase 2。

## Phase 2（prd_ready → designed）：design-map = 完整跑一遍 `/design-brief`

**不建独立 design-map skill。** dispatch `/design-brief`，走它**完整的 Phase 顺序**（不跳过任何阶段），因为 Phase 6/6.5 依赖 Phase 4/5 产出的 D-系列决策 ID，跳不过去。

**硬约束（红队验证过的关键点）：** 必须让 `/design-brief` 跑在 `traceable_delivery` 模式（喂给它 Phase 1.5 产出的真实 PRD），**不接受 `standalone_light` 无 PRD 模式的 `TRACEABILITY GATE LIMITED` 结果继续往下游走**——那个模式下的产出结构性无法保证机器可信，会把可靠性缺口带进整条 Loop。若只能拿到 LIMITED 结果（说明 Phase 1.5 的 PRD 有缺口），必须在下面的 GATE-2 把这个情况显式呈现给用户，不静默放行。

**硬性前置（场景 B/C，2026-07-02 新增，镜像上面 traceable_delivery 的模式）：** `baseline.md` + `change-map.md` 不存在，或 change-map 未覆盖 PRD 全部 MUST 级 R → **不得 dispatch** `/design-brief`，先回补对应子步骤；dispatch 时这两份文件作为**输入0**（先于 prd-constraints）喂给 design-brief——这是 Loop 调度层的强制约束，不修改 design-brief 自身的锁死输入清单文本（同 AC 推导子步骤的红队裁定先例：不碰共享 skill）。

产出对照 `muse-loop/references/component-mapping-taxonomy.md` 的词汇表解读。

**GATE-2（人类卡点，不可省略）：** 用 `AskUserQuestion` 呈现设计映射结果（含是否达到 traceable_delivery），等用户确认。`allow_standalone_override: false`。

**GATE-2 通过后、进 Phase 3 前的 AC 推导子步骤（2026-07-02 补，真实端到端跑第一条REQ时发现的缺口——`design-brief` 真实产出是 D-系列决策卡，没有 Given/When/Then 字段，`muse-proto-judge` 却需要 AC 才能打分。红队裁定：不改 `design-brief` 本身（它的D-系列格式被 `html-prototype`/`tech-spec`/`task-plan` 共用，改了影响面太大），AC归属按真实 Kiro 先例留在需求层，本步骤只做"翻译"，不臆造）：**

对 `design-brief` 产出的每条 D-{NNN} 决策：
1. 先找这条决策对应的 PRD Requirement（R#）是否有关联的 Acceptance Example（AE#，PRD Phase 6 产出，见 `brainstorm/references/prd-template.md`）。有 → 把这条 AE# 的 Given/When/Then 翻译成这条 D-{NNN} 决策粒度的具体验收标准，写入 `schema.md` L2 的 `acceptance_criteria`，标注 `source: ae#`（引用具体 AE 编号）。
2. 若该 R# 没有关联 AE#（PRD 当时判断"无边缘情况"未触发 Acceptance Examples 一节）→ 退回从这条决策的"决策内容/排除方案/tradeoff/状态覆盖"机械推导 Given/When/Then，但**必须**标注 `source: derived-fallback`——不能冒充跟 AE# 关联的一样可信，`muse-proto-judge` 打分时看到 `derived-fallback` 标注应该对该条结果打折扣看待，不当作和 `ae#` 来源同等确定性。
3. 若 PRD 当时的 Acceptance Examples 判断确实遗漏了真实边缘情况（如本次首条 REQ 就补过），優先回到 PRD 补 AE#，而不是长期靠 `derived-fallback` 撑着——这是实例级修复，不是本步骤要自动做的事。

## Phase 3（designed →[GATE-2]→ built → verified）：open-design 生成（主） + muse-proto-judge 核对

**2026-07-02 重大修正（真实端到端跑第一条REQ时发现的真实架构错误）：** 本 Phase 最初设计成"muse-proto-gen 直写HTML ↔ muse-proto-judge 自动内循环"，luca 看完真实原型后指出：这不是他真实的设计产出流程——他真实的流程是设计产出交给 **Open Design (OD)** 生成，他在 OD 里确认，再回写 Figma。已读完 `.claude/skills/office/open-design/SKILL.md` 全文改正如下。

**默认路径：dispatch `/open-design`（chain 模式，输入=本 REQ 的 design-brief 产出，已含 Phase 6.75 的 Design Generation Packet，天然兼容 open-design 的输入要求）：**

```
dispatch /open-design（chain：源=本REQ对应的 docs/decisions/*-design-brief.md）
  → Phase 0-1：确认输入源 + 编译OD指令（Generation Packet + FxUI品牌色/文字色叠加块
    + 【场景B/C 必含，2026-07-02 新增】change-map 摘要：改动区（MODIFY/REMOVE/ADD+锚点，
    带基线真实名称与定位）+ 保持区（哪些现有模块必须原样保留）——让 OD 知道"改哪、留哪、加在哪"，
    对着真实现状做增量生成，不再从0臆造整页）
  → Phase 2：真实 AskUserQuestion 问用户选 Target platform + Design system（不可机器代选）
  → Phase 3D（默认）：建OD项目绑定+写brief.md → 交用户在OD桌面端按生成键 → 用户说"拉回来"
    [OD daemon 真不可达时的 fallback：见下]
  → Phase 4：回收落盘 docs/prototype/YYYY-MM-DD-<topic>/index.html + prototype-spec.md
  → Phase 4 收尾（本编排器，2026-07-08 补）：将回收的最终 index.html 复制一份为
    docs/loop/specs/REQ-*/prototype.html（保持 REQ 目录 L3 契约与 traceability 引用有效），
    并在 requirement.md 记录 prototype_source 指向 docs/prototype/ 原始落点
  ↓
dispatch muse-proto-judge（Task 工具冷启动，仅传回收的原型路径 + AC，不可见 open-design 的生成过程）
  ↓
全部 AC pass？ → 是 → 人工核对范围完整性清单（见下）→ status = verified，本条 REQ 结束
              → 否 → 把 gap 列表**呈现给用户**（不自动重新 dispatch open-design 重生成——
                     open-design 自己的既定原则是"agent 不代理迭代轮，迭代主体在用户"，
                     2026-06-10 luca 原话："要迭代我会在od里面去迭代"）。
                     由用户决定：回OD桌面端手动改+再走一次recover+judge / 接受现状记Reviewer Concerns / 人工介入。
                     "轮数上限3"在这条路径下的含义改为"最多帮你跑3轮judge核对"，不是"自动重生成3轮"。
```

**Fallback 路径（仅当 open-design 的 preamble 探测 `OD_DAEMON: DOWN` 时）：** dispatch `muse-proto-gen`（`.claude/skills/office/muse-proto-gen/`，Skill 工具）直接写HTML，走原来的"muse-proto-gen ↔ muse-proto-judge 自动内循环"（轮数上限3，判官打回自动重生成——这条路径不涉及用户手动生成，机制上允许自动重试）。**必须明确告知用户"OD daemon 不可达，降级到本地直接生成"，不静默切换路径。** **Loop 场景下 open-design 探测到 `OD_DAEMON: DOWN` 即停并交还控制权给本编排器，禁用 open-design 自有的 magicpath/html-prototype 备选链——Loop 的 fallback 只走 `muse-proto-gen`**（其产物才带 `DECISION: D-NNN` 追溯注释与受控词汇表，judge 的 AC 契约不断裂）。

`muse-proto-judge` 永不静默自动应用修复——无论走哪条路径，是否重新生成/如何处理gap，由本编排器的收敛逻辑（或用户，视路径而定）决定，不是判官自己执行。

**scorecard.md（L4）落盘责任在本编排器（2026-07-08 补）：** `muse-proto-judge` 无 Write 工具，只**返回**评分卡内容；每轮判定后（无论默认路径还是 fallback 路径），由本编排器用 Write 将其落盘到 `docs/loop/specs/REQ-*/scorecard.md`（多轮时追加，格式见 `muse-loop/schema.md`「scorecard.md」节）。

**flip 到 `verified` 前的范围完整性清单（2026-07-02 补，红队裁定 CLEAR_DEFER 完整自动化机制、但先上这个零成本版本）：** `muse-proto-judge` 只对**预先给定的 AC 列表**逐条打分，AC 列表本身若漏了 design-map 阶段规划过的某个组件（比如映射表里有但没人写 AC 的一个状态/组件），判官不会、也不可能发现——它没被问过。全自动的"产出↔规划范围"结构化比对（借鉴 Spec Kit `/converge`）暂不建（红队判定：零端到端跑过的系统上建第二套没验证过的比对机制，跟已经否决的"快速路径"是同类过早施工）。**现在只做**：flip 到 `verified` 前，把这条 REQ 的组件映射表（design-map 产出）和 prototype.html 实际包含的组件并排给用户看一眼，人工确认没有"规划过但没做"的遗漏，再确认。等真跑过 2-3 条 REQ、事后比对真的发现过 AC 列表本身漏东西，再考虑建自动化版本。

**收尾（本编排器自己的职责，不是另一个 skill）：** 该 REQ 到达 `verified` 或 `Reviewer Concerns` 时，追加一行到 `docs/loop/traceability.md`（格式定义见 fork 根 `traceability.md`；文件不存在则先建表头）。中间状态（`triaged`/`prd_ready`/`designed`）不重复写。

## 自带 Plan-Agent 等效门禁（不依赖母版 route-guard 的 HEAVY_ORCHESTRATOR_SKILLS 硬编码名单——但仍需注册）

本 skill 本身满足 Plan Agent 5 条件里的"≥2 个独立 subagent 协作"+"明确的阶段依赖"，**经 `.claude/settings.json` 的 `ROUTE_GUARD_HEAVY_SKILLS` env 注入注册进 route-guard 的 `HEAVY_ORCHESTRATOR_SKILLS`**（route-guard.mjs 该 Set 全由 env 构建，机制见其 ~:441 注释；见 `muse-loop/ARCHITECTURE.md` 注册记录，仅改 fork 副本，母版对应文件零改动）。命中后会被强制升级到 `PLAN_CHECK`，执行前需与用户确认——这是本 skill 依赖母版 **hook 机制**（route-guard 的门禁模式）的唯一一处。**这不等于"唯一外部依赖"**——本 skill 在 Phase 1.5/Phase 2 还真实 dispatch 了两个母版 **skill**（`/brainstorm`、`/design-brief`），完整依赖清单见 `muse-loop/ARCHITECTURE.md`「路径2对路径1(母版) skill 的依赖清单」一节。

## 命名与调用

`/muse-loop-orchestrate` 命令直接调用（见 `.claude/commands/muse-loop-orchestrate.md`）。触发短语见本文件 frontmatter，全部是复合词，**不缩写成"loop"**——本环境已有内置 `loop` 定时调度 skill，命名相邻会引发误触发。
