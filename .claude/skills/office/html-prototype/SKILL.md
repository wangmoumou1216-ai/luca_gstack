---
name: html-prototype
preamble-tier: 3
argument-hint: "[场景 A/B/C + design-brief 路径]"
version: 1.0.0
description: |
  HTML 原型生成与可观测 QA。仅在用户明确选择本地 HTML，或明确批准包含本地 HTML
  备用路径的计划且触发条件满足时使用。三种场景行为完全不同：A（新功能，Step0认知门禁+
  原型承载方式确认+全量状态）；B（优化现有，区分改动区/保持区+对照截图）；
  C（评审改版，按 ux-audit报告逐条实现+每处注释FIX-ID）。启动时强制询问场景。
  技术约束：本地 HTML + 原生 JS，设计规范按用户提供或本次确认的实际来源。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
  - WebFetch
  - AskUserQuestion
context-cost:
  self: 40230  # 实测字节数 wc -c，统一口径 2026-07-04（G5）；2026-07-21 复测（ux-writing 逐字层挂载）
  runtime-estimate: 22000  # 2026-07-21：+ux-writing（4048B，Phase 3 文案块挂载）
  shared-refs: [ai-native-design-framework, design-system-contract, html-prototype-tokens, ux-writing]
  template: auto-detect
  recommended-model: core-execution  # 2026-07-10 承重执行档：自写HTML原型
---

**入口授权（调用方在进入本 skill 前核对）：** OD / MagicPath 不可达、认证失败或非 React/Canvas
场景只构成阻塞信息，不授权改成本地 HTML。仅在用户明确选择本地 HTML，或已批准计划明确包含
该备用路径且触发条件满足时进入；否则保留已选工具，报告 `BLOCKED` 并交还用户。已有明确授权
不重复询问工具选择，以下质量门禁仍完整执行。

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_DECISION=$(ls -t docs/decisions/*-design-brief.md 2>/dev/null | head -1)
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
_CONSTRAINTS=$(ls docs/prd/*-prd-constraints.md 2>/dev/null | head -1)
_UX_AUDIT=$(ls -t docs/evaluation/*-ux-audit.md 2>/dev/null | head -1)
echo "DECISION: ${_DECISION:-none}"
echo "PRD: ${_PRD:-none}"
echo "CONSTRAINTS: ${_CONSTRAINTS:-none}"
echo "UX_AUDIT: ${_UX_AUDIT:-none}"
ls framework/*.html 2>/dev/null && echo "FRAMEWORK_OK" || echo "FRAMEWORK_MISSING"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py html-prototype "*" 2>/dev/null || true
```

---

## Phase 0：强制询问（每次只问一个）

### 运行模式与输入源判定

`html-prototype` 支持 standalone 和 workflow 两种模式。不要把 `/design-brief` 当成全局强制前置。
但在 workflow / traceable delivery 中，它必须消费 `design-brief` 内的
`Design Generation Packet`；PRD、deepresearch、ux-research 只用于 traceability 校验，
不得作为 HTML 直接设计输入。

先根据用户输入和已有 artifacts 判定 `source_kind`：

| source_kind | 适用情况 | 是否需要完整上游 workflow |
|---|---|---|
| `design_brief` | 已有 `docs/decisions/*-design-brief.md`，且用户要求按交互文档落地；workflow 下主读 Design Generation Packet | 否，但 workflow mode 下优先 |
| `ux_audit` | 场景 C，按 UX audit 问题清单改版 | 否 |
| `screenshot_delta` | 场景 B，用户直接给截图和改动说明 | 否，但必须声明未覆盖区域风险 |
| `figma_demo_blueprint` | 从 `/figma-demo` 的 `blueprint.yaml` / `prototype-spec.md` 继续 | 否 |
| `standalone_brief` | 用户直接描述要做的原型，且不是 research / ux-brainstorm / design-brief 这类上游产物 | 否，但必须补齐最小上下文；不得承诺端到端可追踪完整 |
| `standalone_mobile_prototype` | 用户直接要求移动端独立原型，且确认不调用 framework 母版 | 否，但必须声明不调用母版原因；不得承诺端到端可追踪完整 |

**Workflow mode**：如果用户明确说“继续流程/进入下一步/按上游产物做”，
则执行对应 workflow gate。workflow / traceable delivery 在所有场景中均须通过
`page_interaction_mapping`：消费 design-brief §7「页面与交互位置映射」，确认页面/语义位置、
交互职责、D-ID、适用 STATE、真实需求来源与 AC、约束和下游去向完整。
页库 `page_id` / `region_id` 仅在已确认时引用；`reference=none` 不免除这些追踪项。

**Standalone mode**：如果用户直接要求做 HTML 原型，允许用 `standalone_brief`
或其它 source_kind 开始；但如果输入是 research 报告、ux-brainstorm 决策文档、
或用户要求“按照上游研究/决策完整落地”，不得走 standalone_brief 绕过
PRD / design-brief。此时必须先进入 traceable delivery 链路。
缺口必须在 `prototype-spec.md` 中声明，且不得承诺完整可追踪。

无论哪种模式，以下质量 gate 不可跳过：
- Step 0 认知门禁
- 已采用参考的来源与实际设计规范核对；无规范时规范合规项 N/A，通用 UX/QA 继续
- Design Generation Packet gate（workflow / traceable delivery）
- 动态参考扫描（触发条件成立时）
- QA 脚本与人工检查

### 询问 1：场景确认

AskUserQuestion：

> 这个原型对应什么场景？三种场景执行逻辑完全不同。
>
> A）**新功能设计** — 从零生成，需要确认原型承载方式，全量状态
> B）**优化现有功能** — 在现有界面改动，需要截图区分改动区/保持区
> C）**评审改版** — 按 ux-audit 报告的问题清单逐条实现

### 询问 2（仅场景B）：截图确认

如果用户没提供截图：

以下速查表仅当目标平台为桌面 / 后台管理页时适用。移动端必须先按上方平台规则判断。

```
⚠️ 优化场景需要现有功能截图来区分「改动区」和「保持区」。
没有截图无法保证未改动部分与现有产品一致。

请提供截图（建议）：
- 默认状态
- 空态
- 主要操作流程
```

### 询问 3（仅场景C）：确认 ux-audit 文件

```bash
cat "$_UX_AUDIT" 2>/dev/null | head -60
```

如果没有找到：

```
⚠️ 评审改版需要 ux-audit 报告（包含问题清单）。
未找到报告文件。
A）先运行 /ux-audit（场景C）
B）我直接粘贴问题清单
```

---

## Phase 1：前置检查（全部通过才能进入 Step 0）

**输出目标与平台消费：** 新版 design-brief 使用「输出目标」「目标平台与范围」「参考策略」
「依据」「下游约束」（`output_target_platform_scope`）。按这些已确认字段和当前用户指令继续；
`reference=none` 是有效参考策略，不是缺输入。用户已选择本地 HTML、平台和整页/局部范围时，
在该范围内安排独立页面或局部实现，不因缺少旧「原型承载方式 / 母版」字段而再次强制选整页母版。
若本次已选输出目标仍是 OD / Claude Design / MagicPath，交回相应交接入口，不自行改成本地实现。

**场景A：**
```
□ 确认以下适用 reference 文件存在（此处只查存在性，不读取——lazy-load，2026-07-04 G5：
  每份在其消费点已各自有"必须读取"强制，启动全量前读是重复税；挂载点见下方注）
  · framework/README.md（仅明确采用母版时） → 挂载：框架选择逻辑前 + 写 HTML 前
  · .claude/skills/office/references/html-prototype-tokens.md    → 挂载：Phase 2.5 设计系统宣告前
  · .claude/skills/office/html-prototype/references/dynamic-reference-protocol.md → 挂载：Phase 2.1 动态参考扫描前
  · .claude/skills/office/html-prototype/references/current-aesthetic-rubric.md   → 挂载：Phase 2.25 审美校准前
□ Workflow mode + source_kind=design_brief 时：
  - 读取 PRD，确认「设计范围」字段：{全新页面/局部改动/独立组件}
  - 读取 design-brief.md，确认以下两个字段：
    - `Design Generation Packet`：存在 → 作为 HTML 生成主 brief；不存在 → BLOCKED
    - `Tool Consumption Contract`：存在 → 继续；不存在 → BLOCKED
    - 「输出目标」「目标平台与范围」「参考策略」「依据」「下游约束」：消费已确认值；reference=none 可继续；仅实际目标/平台/范围未定或冲突时询问
    - §7「页面与交互位置映射」（`page_interaction_mapping`）：存在且追踪完整 → 继续；缺失或有未覆盖项 → BLOCKED
    - 状态覆盖表：存在 → 继续；不存在 → BLOCKED
  - 确认 Packet 未引入 design-brief 正文没有的新事实；如无法确认 → BLOCKED，返回 design-brief 修正
□ Standalone mode 或 source_kind 非 design_brief 时：
  - 从用户 brief / 截图 / blueprint 中提取设计范围
  - 如果页面与交互位置映射缺失，不 BLOCKED；从真实 brief / 截图 / blueprint / UX 问题提取语义位置、交互职责、状态与 AC，在 prototype-spec.md 中声明来源、假设及追踪缺口，不伪造 D/R/AE 编号
□ 如承载方式为 framework 母版：framework/ 目录存在且包含目标母版文件
  → 否：BLOCKED — 目标母版不存在
□ 如承载方式为独立整页（含 standalone mobile prototype）/ 局部组件：不要求目标母版存在，但必须在 prototype-spec.md 中声明不调用母版的原因
□ 核验本次实际采用的资源依赖；未采用 framework 时不要求其 token 或母版资产
```

**历史输入兼容：** 若既有 design-brief 仅有旧 `component_mapping` / shadcn 组件映射表，
只读提取其中的位置、交互职责、决策、状态、来源与验收语义，按 §7 核对覆盖；不要求补旧
variant/classes、token 或组件库资产，不重写历史文件。缺少承重语义时按当前模式补齐或报告缺口。

**历史承载兼容：** 旧「原型承载方式 / 母版」仅在能追溯到用户明确选择、且仍适用于本次平台
与范围时沿用；与新字段冲突时澄清冲突，不自动优先旧值。不补写或改写历史 design-brief。

**承载方式询问（仅用户要求协助选择本地承载，或实际平台/范围仍未定时触发）：**

AskUserQuestion：

> 本次本地 HTML 的承载范围尚需明确。请结合目标平台选择适用方式；也可说明独立整页或局部范围。
>
> 1）**列表页** — framework/list-page.html
> 2）**详情页（两列）** — framework/detail-page-2col.html
> 3）**详情页（三列）** — framework/detail-page-3col.html
> 4）**表单页** — framework/form-page.html
> 5）**首页/仪表盘** — framework/home-page.html
> 6）**局部改动/独立组件** — 不使用整页母版
> 7）**独立移动端原型** — standalone mobile prototype，不调用 framework 母版

注意：当前工程实际可用母版为 5 个。AI 速记入口页、
录音工作页母版未随包提供；遇到这类需求时，
可在已确认范围内使用独立整页或局部实现；不因没有对应母版而扩大需求或要求补建母版。

**移动端规则：**
- 如果用户或 design-brief 明确目标是移动端，而 framework 没有对应移动母版，
  不得默认套用 `framework/list-page.html`。
- 已确认移动平台与范围、且未选择适用母版时，按 `standalone mobile prototype` / 局部实现继续，不重复询问同一决定。
- 实际平台或整页/局部范围仍未确认或有冲突时，不得写 HTML。

**框架选择逻辑（仅用户已选择复用母版时使用，必须先读 `framework/README.md`）：**

先判定目标平台：
- 桌面/后台管理页 → 可使用下表母版速查。
- 移动端 → 只有在 framework 明确提供移动母版时才可使用母版；否则必须走 `standalone mobile prototype` 或局部组件。

```
需求描述包含                     → 使用母版
「列表」「筛选」「分页」「表格」   → framework/list-page.html
「详情」「Tab」「关联」（简版）   → framework/detail-page-2col.html
「客户详情」「商机详情」「三栏」  → framework/detail-page-3col.html
「新建」「创建」「编辑」「表单」  → framework/form-page.html
「首页」「仪表盘」「概览」「统计」 → framework/home-page.html
「AI速记」「录音入口」「会议入口」 → 当前无整页母版，使用局部改动/独立组件
「录音中」「会议进行中」「语料」  → 当前无整页母版，使用局部改动/独立组件
```

已明确不采用母版时跳过此速查；仅复用母版的选择仍不明确时，AskUserQuestion 确认适用于目标平台和范围的承载方式。

**场景B：**
```
□ 已有截图（对话里有截图附件）？
  → 否：告知用户「请先上传截图再继续」，等待截图
□ 已读取 design-brief.md（如果存在）
□ 场景B 建议有 prd-constraints.md（约束防火墙 = Not-Do List）：
  → _CONSTRAINTS 为 none → ⚠️ 软警告（不 BLOCKED）：当前 skill 集暂无自动生产 prd-constraints.md 的节点，
    缺它则 Not-Do List 防火墙不生效。可手写一份 docs/prd/*-prd-constraints.md 再跑；否则继续生成，
    但须在产出里显式标注「未受约束防火墙保护」，供人工复核。
```
**场景C：** 确认已有 ux-audit 报告

---

## Phase 2：Step 0 认知门禁（强制，不可跳过）

**这一步全部是思考，不调用任何工具，不写任何 HTML。**

**未完成 Step 0 四个阶段，不得写 HTML。违反返回：`BLOCKED: Step 0 未通过`**

### 阶段一：理解用户处境

问：这个用户在什么时候打开这个页面？他在做什么事情中间？情绪和注意力状态是什么？

```
❌ 「用户要填写表单」（这是功能）
✅ 「用户刚结束通话，坐在车里，需要在 3 分钟内录入跟进记录，注意力碎片化」（这是处境）
```

写出处境描述，再继续。

### 阶段二：规划空间结构

```
需要决定的四件事：
① 页面分几个区域，各区域功能定位和比例
② 视线路径：
   - 单任务页（新建/确认）→ 中心聚焦
   - 信息密集页（列表）→ F形扫视，左上角起点
   - 内容展示页（详情）→ Z形扫视
③ 视觉重心在哪里
④ 哪些区域需要呼吸感，哪些是信息密集区
```

**场景B额外（来自 CLAUDE-prototype-optimize.md 阶段四）：**

明确区分：
- **改动区**：design-brief.md 要求改动的具体区域
- **保持区**：截图中未被 design-brief.md 提及的区域

对「保持区」每个主要模块声明：
「{模块名} 保持与现有截图一致，无对应决策，不实施改动。」

### 阶段三：建立信息层次（L1/L2/L3）

```
L1（主角）每屏 1-2 个：核心任务与主操作，最高视觉优先级
L2（配角）每屏 3-5 个：正文与次要操作，清晰可读
L3（背景）不限：辅助信息，降低强调但保持可读性；具体样式按实际设计规范
```

### 阶段四：规划语义交互区域

按 design-brief §7「页面与交互位置映射」逐区规划：用户任务、交互职责、信息层次、
触发与反馈、适用 STATE、对应 D-ID / 来源与 AC，以及改动区和保持区；核对每项的下游实现位置。
Standalone 无该表时从已确认输入建立同样的区域计划，明确未获上游决策支持的假设。
已有页库引用仅用于定位；无参考页时仍保留区域、决策、状态和验收追踪。

**Step 0 验证：**
```
移除所有组件后：
✓ 空间规划仍有清晰区域划分？
✓ 视线路径仍然清晰？
✓ L1/L2/L3 仍然可识别？
全部「是」→ 通过；任意「否」→ 回到阶段二
```

---

## Phase 2.1：动态顶级产品参考扫描（按需强制）

**目标：** 根据当前功能需求，查询同类顶级产品的最新 UI、动效和 AI/Agent
交互做法，提取共性后转译到本原型。

**必须读取：** `.claude/skills/office/html-prototype/references/dynamic-reference-protocol.md`

### 触发条件

以下任一成立，必须执行动态扫描：

- 需求涉及 AI / Agent / 自动化 / 推荐 / 总结 / 生成 / 预测 / 分析。
- 需求涉及复杂 B2B 工作流：CRM 对象详情、销售跟进、审批、任务编排、
  仪表盘、设置、权限。
- 用户要求“高级感”“当前审美”“像一线产品”“动效”。
- 静态 reference 无法判断某个 UI pattern 是否过时。

### 执行流程

1. 从当前 PRD / design-brief / ux-audit 中提炼本次要查询的 1-3 个 pattern 问题：
   - UI 结构问题：{例如：AI 跟进建议应该放在哪里？}
   - 动效反馈问题：{例如：Agent 执行中如何表达进度和可接管？}
   - 信任控制问题：{例如：低置信建议如何让用户理解并纠正？}

2. 按 dynamic-reference-protocol 的“顶级产品筛选标准”选 5-8 个候选产品。

3. 使用 WebSearch / WebFetch 查询官方页面、官方 docs、changelog、engineering/design
   blog、公开视频或可信行业分析。优先一手来源。

4. 多轮验证：
   - Round 1：候选发现
   - Round 2：剔除营销图、过期材料、非同类功能、不可迁移参考
   - Round 3：从 3-5 个最终参考中提取共性
   - Round 4：判断哪些共性适合当前 CRM/B2B 场景，哪些必须适配本次实际设计规范

5. 输出 `Dynamic Reference Scan`，后续写入 `prototype-spec.md`。

### 输出格式

```
【Dynamic Reference Scan】
Status: COMPLETED / SKIPPED_TOOL_UNAVAILABLE
查询目标：{1-3 个 pattern 问题}

入选参考：
| 产品 | 来源 | 证据类型 | 借鉴点 | 采用/不采用 |

共性提取：
- 布局：
- 信息层级：
- AI/Agent 表达：
- 动效：
- 状态反馈：
- 信任/控制：

转译为本原型的设计决定：
- {决定 1}
- {决定 2}
- {决定 3}
```

如果联网工具不可用，不得编造外部参考。写 `SKIPPED_TOOL_UNAVAILABLE`，
继续使用静态 reference，并在最终结果中标注风险。

---

## Phase 2.25：当前审美校准（强制，不可跳过）

**目标：** 保证 UI 不只符合 token，还符合当前一线 B2B SaaS / AI Native 产品审美。

**必须读取：** `.claude/skills/office/html-prototype/references/current-aesthetic-rubric.md`

输出以下校准结果，写入后续 `prototype-spec.md`：

```
【当前审美校准】
参考坐标：{Linear / Attio / Notion AI / Granola / Cursor / Atlassian / Vercel / Salesforce Agentforce 中选择 2-4 个}
本次采用的审美原则：
  - {Calm Density / Invisible AI / Progressive Disclosure / Role Awareness / Trust Before Delight}
拒绝的方向：
  - {例如：不做卡片墙、不做聊天框、不做大面积渐变、不做 Hero 化后台页面}
角色语境：
  - 主要用户：{销售 / 销售管理者 / 运营 / 管理员}
  - 当前最需要建立的信心：{更快判断 / 更少误操作 / 更清楚 AI 来源 / 更容易接管 Agent}
预估 Current Aesthetic Score：{0-30，必须 ≥24}
```

低于 24/30，必须回到 Phase 2 重新规划空间结构和信息层级。

如果 Phase 2.1 已完成动态扫描，本阶段必须显式说明：哪些动态共性影响了
Current Aesthetic Score 和空间规划。

---

## Phase 2.5：设计系统宣告（强制前置，写代码前完成）

**来源借鉴：** ConardLi/web-design-skill 的核心方法论——"先用 Markdown
把设计系统说清楚，再写代码"。
**原因：** 不声明就直接写代码 → 颜色/字体/间距会随手写，不一致。

**必须在 Phase 3 写 HTML 之前，输出以下宣告（不要写代码，只用 Markdown）：**

先读取 `.claude/skills/office/references/html-prototype-tokens.md` 的中立规范、状态与可访问性合同。
声明实际规范来源与版本（用户提供的设计系统 / 本次本地实现约定）；缺少外部规范不阻断，
但不得将本地约定称为外部规范合规，也不把参考页的视觉当作设计系统。

### 宣告 1：颜色使用计划

逐项写出主操作、正文、辅助信息、背景、边界和状态反馈的用途与实际取值/变量来源。
含 AI 时覆盖所有适用状态，区分不确定性、拒答、错误与执行进度，并用文字或形状补足颜色含义。
无 AI 时相关项写 N/A；不设全局品牌色或使用次数配额。

### 宣告 2：字体层级使用计划

列出标题、正文、标签、辅助信息的字体、字号、行高及使用位置，依据实际设计规范与可读性。
字体资源须本地可用；没有指定字体时可用系统字体，不按字体名称判断设计质量。

### 宣告 3：间距系统使用计划

列出本次实际使用的间距、行高和密度策略，说明对应区域与层级；沿用已确认规范，
没有规范时定义一致的本地约定，不强制旧七档值。密集内容仍须可扫描、点击目标可操作。

### 宣告 4：动效使用计划（有动效时必填）

逐条记录名称、触发、时长、缓动与反馈目的；无动效写明无。
保留操作即时反馈与 `prefers-reduced-motion`，避免无任务用途的整页动效和妨碍高频操作的延迟。

### 宣告完成检查

```
□ 四项宣告全部输出，无待定/TBD；不适用项有原因
□ 颜色、字体、间距都有实际来源或明确本地约定及使用位置
□ 含 AI 时所有适用状态的反馈形式已定义，不只依赖颜色
□ 有动效时触发、时序与 reduced-motion 已声明
□ 已提供规范的可静态检验条款写入 design-rules.json（格式见 Phase 4.5）；无可检验规范则明确 N/A
```

**任一适用项不通过 → 回到本 Phase 补完，不得进入 Phase 2.75。**

---

## Phase 2.75：骨架确认（v0 Draft，Phase 3 前的中间检查点）

**来源借鉴：** ConardLi 的 v0 draft 策略——尽早用低保真度草稿让用户纠偏，
而不是黑箱交付完整代码。
**原因：** 一次性写完整原型 → 发现方向错了只能推翻；先给骨架 → 节省
80% 的返工时间。

**输出格式：用 Markdown 伪代码，不写真实 HTML。**

```
【骨架确认 · 页面结构】

区块 1：顶部 Hero / 标题栏
  - 视觉重心：{是 L1 / 否}
  - 主要元素：{列出 2-4 个}
  - 占位符策略：{图片位置用 [图] 标记 / 数据位置用 [数据] 标记}
  - 对应 design-brief 决策：D-{NNN}

区块 2：主体内容区
  - 布局模式：{表格 / 卡片网格 / 两栏 / 三栏}
  - 每列/每卡的信息层级：L1 = {字段名}，L2 = {字段名}，L3 = {字段名}
  - AI 专有内容位置：{如"每行末尾的 AI 建议徽章" / 无}
  - 对应决策：D-{NNN}, D-{NNN}

区块 N：...（按实际页面结构列出）

【骨架确认 · AI 状态切换计划（含 AI 时填）】
- 默认态（display: block）：上述结构
- 思考中态（display: none → 切换）：{描述与默认态的差异}
- 低置信态：{描述差异}
- 拒答态：{描述差异}
- 其他非 N/A 状态：{描述}

【骨架确认 · 占位符清单】
图片占位：{具体位置 + 推荐尺寸}
数据占位：{具体位置 + 数据类型}
图标占位：{用 [icon: 含义] 标记，后续再决定用什么图标库}
```

### 骨架确认的必须询问

AskUserQuestion：

> 骨架方向确认：
>
> A）方向对，继续生成完整原型（Phase 3）
> B）需要调整结构 — 我会说明调整点
> C）整体方向不对 — 回到 Phase 2 Step 0 重新规划空间结构

**选 A → Phase 3；选 B → 调整后重出骨架；选 C → 回 Phase 2。**

**禁止静默跳过骨架确认直接进 Phase 3。** 这是 A 级验收项，违反视为流程错误。

---

## Phase 3：生成 HTML

### 技术约束（三场景共用，硬约束）

按 Phase 2.5 已声明的实际设计规范实现颜色、字号、间距与动效，保持本地资源可用。
只有明确采用 framework 母版时才读其 README 并核验选定源依赖；生成到产出目录，源文件只读。
CSS 可使用实际设计系统变量或本地样式；Tailwind 仅在实际选择使用时配置，不强制注入旧 token。

**JS 只用于交互状态切换（Tab、弹窗、筛选模拟）。**

### 可追踪实现注释（强制）

每个来自 `design-brief` 的设计决策，都必须在 HTML 对应实现位置加入注释：

```html
<!-- DECISION: D-001 | source: design-brief | status: implemented -->
```

**覆盖率要求：**
- design-brief 中所有 `D-{NNN}` 决策必须在 HTML 中至少出现一次 `DECISION` 注释。
- 如果某个决策不产生可视 UI，必须在 `prototype-spec.md` 的“未实现/非可视决策”中说明原因。
- 不允许静默遗漏 design-brief 决策。

场景C的 ux-audit 修复继续使用：

```html
<!-- FIX: UX-A-P0-001 -->
```

### 状态切换 harness（强制）

所有原型状态必须用统一结构，便于自动检查和截图：

```html
<nav data-prototype-state-switcher>
  <button type="button" data-show-state="default">默认态</button>
  <button type="button" data-show-state="empty">空态</button>
</nav>

<section data-prototype-state="default">...</section>
<section data-prototype-state="empty" hidden>...</section>
```

JS 只负责点击 `[data-show-state]` 后切换对应 `[data-prototype-state]` 的 `hidden`
属性。不得只写散落的 `display:none` 而没有 `data-prototype-state`。

**状态覆盖要求：**
- 必须读取 design-brief 的“体验验证结论”状态覆盖表。
- 每个“是否需要单独设计 = 是”的状态必须有对应 `data-prototype-state`。
- 若状态写 N/A 但 HTML 设计中实际引入了该状态，不得静默补充，必须返回询问或回到 design-brief 修正。

### B2B SaaS 视觉反模式清单（禁用项，零容忍）

**来源借鉴：** ConardLi/web-design-skill 的 anti-cliché 清单 + B2B SaaS 场景专属约束。
**判定标准：** 以下任一项出现在产出里 → SELF_CHECK_PASSED 不得写 YES，必须返工。

**字体与颜色核对：**
- 按实际设计规范检查字体、色彩语义与层级；没有规范时检查可读性和一致性，不伪造规范合规。
- 字体资源本地可用，正文与辅助信息均须可读，状态反馈不能只靠颜色。
- 主色、默认蓝色、渐变、字体名称、原始 CSS 色值本身不构成违规；评审其是否服务本次任务与已确认规范。

**阴影与圆角核对：**
- 按实际设计规范表达组件和层级差异，保持同类语义一致。
- 没有规范时声明本地规则，避免装饰干扰信息层级，不设全局数值或次数门。

**图标禁用：**
- ❌ Emoji 充当图标（✨🤖💫📊💼）—— 这是 AI 最典型的偷懒
- ❌ 无意义的装饰性 SVG（如"AI 智能建议"旁边画一个歪歪扭扭的大脑图）
- ❌ 图标颜色 = 主色 + 放在卡片左上角当装饰（AI 默认模板，非信息层级）
- ✅ 图标来自本地图标库检索，且服务于具体任务
- ✅ 没找到合适图标时用文字占位 `[icon: 含义]`，不强行画 SVG

**AI 专有状态的视觉禁用：**
- ❌ AI 建议与可点击链接无法区分，或仅靠颜色区分状态
- ❌ 不确定性与错误使用相同反馈且没有语义说明
- ❌ AI 思考中态用普通 loading spinner（应该是 skeleton 或流式文字）
- ❌ 把 AI 输出包在"✨ AI Suggestion"标签里（装饰性，不提供信息）
- ✅ AI 建议保持辅助层级，并有可辨认的来源/状态标识
- ✅ 低置信态明确说明依据有限，并提供补充信息或人工判断出口
- ✅ 思考中态用 skeleton 或打字机效果 + stop 按钮

**布局禁用：**
- ❌ 英雄区（Hero）用大号渐变 + 霓虹效果（这是 landing page，不是 B2B 产品）
- ❌ 表格行间距 < 40px（py-3 是底线，低于这个值销售扫描会累）
- ❌ 列表页每行都是卡片样式（B2B 列表要用 table 或 divider，不是 card grid）
- ❌ 空态插画占满屏幕（空态要简洁：一句话说明 + 一个引导操作）
- ✅ 密度优先，呼吸感服务于信息层级

**数据和文案禁用：**
- ❌ 编造的用户好评、假客户 logo 墙、虚构统计数字
- ❌ Lorem Ipsum 填充正文（用真实的 B2B 销售场景文案）
- ❌ 无意义的 placeholder 数据（如"客户 A"、"订单 1"）
- ✅ 数据位置用 `[数据]` 或真实感示例（如"北京海淀科技有限公司"）

**Load `.claude/skills/office/references/ux-writing.md` now — 写页面真实文案前必须完整读取**（本地生成路径逐字执行其「逐字层」：CTA=动词+宾语、错误/空态/确认文案模板、语域规范；有 voice-copy-spec 上游产物时以其为准）。

**自检清单（Phase 4 产出前必过）：**

```
□ 字体、色彩和间距符合本次实际规范/本地声明，文字清晰可读？
□ 信息层级与交互状态可辨认，视觉装饰服务实际任务？
□ 没有 emoji 图标？
□ 阴影与圆角符合实际规范/本地声明，并服务于信息层级？
□ 已提供设计规范的可检验条款均有证据；缺失规范项明确 N/A？
□ AI 专有状态区分辅助、不确定、错误和执行中语义，且不只依赖颜色？
□ 表格/列表行高 ≥ 40px？
```

**任一不通过 → 返回修复。** 这是视觉层面的 AI Slop 防火墙。

### 场景A：新功能实现

**仅当用户明确采用母版时先读 `framework/README.md`；其余承载按已确认范围继续。**

```
全新页面（用户已确认使用 framework 母版时）：
  1. 把选定的 framework/*.html 复制到
     docs/prototype/YYYY-MM-DD-<topic>/index.html
  2. 把 framework/assets/ 复制到
     docs/prototype/YYYY-MM-DD-<topic>/assets/
  3. 保持以下 module 内容不变（直接沿用）：
     - mod-top-nav（顶栏）
     - mod-channel-bar（左侧频道栏）
     - mod-crm-sidebar（CRM 二级侧边栏，如存在）
  4. 只替换 data-module="mod-main-canvas" 内部的内容
     → 这是唯一的修改区域
  5. 在侧边栏找到当前功能的菜单项，加高亮 active 样式

局部改动：
  不复制框架文件，只生成新增部分的 HTML 片段
  文件头注释：
  <!-- 挂载位置：[页面名] 的 data-module="[module 名]" -->

独立组件（弹窗/抽屉）：
  完整 <html> 骨架
  使用本地可用资源及本次实际设计规范
  不使用任何框架文件的页面结构

独立整页原型（已选本地 HTML 且未采用母版，含 standalone mobile prototype）：
  完整 <html> 骨架
  按已确认目标平台与范围设计；移动端推荐 375/390px 内容宽度
  使用本地资源与必要样式，不调用任何 framework 母版页面结构
  prototype-spec.md 必须声明：
    - 不调用母版的原因
    - 已确认目标平台与尺寸
    - design-brief D 决策覆盖率
    - 状态覆盖率
```

**全量状态实现（必须，用状态切换 harness 切换）：**
- 默认态 / 空态 / 加载态 / 错误态 / 成功态
- 空态不能是空白，必须有提示 + 引导操作

**AI 专有状态检查（含 AI 功能时必须执行）：**

```bash
# 检查 design-brief 里是否有 AI 专有状态需要实现
grep -A2 "思考中态\|低置信态\|拒答态\|部分完成态\|待 Steer 态\|幻觉兜底态\|Agent 执行中态" \
  docs/decisions/*-design-brief.md 2>/dev/null | grep -v "N/A" | head -20
```

如果检查结果有非 N/A 的 AI 专有状态，
**必须额外生成**以下状态页（用状态切换 harness 切换，每个状态加
`<!-- STATE: xxx -->` 注释和 `data-prototype-state`）：

| AI 专有状态 | 触发条件 | 基础 UI 规范 |
|-----------|--------|-----------|
| 思考中态 | AI 正在生成，流式输出 | 打字机动画 / ghost text / Skeleton + stop 按钮 |
| 低置信态 | AI 有结果但置信度低 | 结果保持辅助层级 + "基于有限数据" 标注 + "提供更多信息" 入口 |
| 拒答态 | 超出 AI 能力边界 | 明确告知 + 替代操作建议，禁止空白 |
| 部分完成态 | Agent 中途失败 | 步骤清单：✅/❌/⏸️ + 每步重试/跳过/手动完成按钮 |
| 待 Steer 态 | AI 给多候选等用户选 | 2-3 个候选并列 + 差异高亮 + "都不满意/重新生成" 按钮 |
| 幻觉兜底态 | 用户标记 AI 错误后 | 👍/👎 反馈入口 + 标记后"已记录"响应 |
| Agent 执行中态 | Agent 长时间运行 | 后台任务条 + 当前步骤 + pause 按钮 + 完成通知 |

**执行顺序：**
1. 先生成基础 5 状态
2. 读取 design-brief.md 的"体验验证结论"节的 12 状态覆盖表
3. 对每个"是否需要单独设计 = 是"且非 N/A 的 AI 专有状态，按上表规范生成
4. 每个 AI 状态页加 `<!-- STATE: {状态名} -->` 注释，供后续高级审查核对
5. 若状态覆盖表某 AI 状态写 N/A 但本质上应该有（例如：有 agent
   动作但没有"Agent 执行中态"），不得静默补充，AskUserQuestion 确认

### 场景B：优化现有

```html
<!-- ===== 改动区 START =====
     对应 design-brief 决策 D-001: {决策名称}
===== -->
{精确实现设计决策}
<!-- ===== 改动区 END ===== -->

<!-- ===== 保持区 START =====
     无对应 design-brief，保持与现有截图一致
===== -->
{参照截图保持原有样式}
<!-- ===== 保持区 END ===== -->
```

**实现后视觉比对检查：**
```
□ 未改动区域与截图视觉一致？
□ 改动区域清晰体现设计决策变化？
□ prd-constraints Not-Do List 的功能未出现？
```

### 场景C：评审改版

```
输入：ux-audit 报告的问题清单

执行：
  1. 读取第一个问题（P0 优先）的描述和优化方向
  2. 实现对应改动
  3. 在改动处添加注释：<!-- FIX: UX-A-P0-001 -->
  4. 继续下一个问题

规则：
  - 按优先级顺序逐条实现（P0 → P1 → P2）
  - 不改动报告未提及的任何现有设计
  - 每处改动必须有 FIX-ID 注释（没有注释视为产出不完整）
```

---

## Phase 4：产出文件 + 更新状态

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
mkdir -p "docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}"
export _NODE="html-prototype"
export _STATUS="DONE"
export _OUTPUT="docs/prototype/$(date +%Y-%m-%d)-${_TOPIC}/index.html"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

**主文件：** `docs/prototype/YYYY-MM-DD-<topic>/index.html`

**规格文件（必须，来自 CLAUDE-prototype.md Step 4 交接块）：**
`docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md`

读取 SCHEMA.md 作为规格文件模版，填充。

`prototype-spec.md` 必须包含：

```markdown
## Traceability Coverage

| Design Decision | HTML Mapping | Status |
|----------------|--------------|--------|
| D-001 | `<!-- DECISION: D-001 ... -->` | implemented |

## State Coverage

| Required State | data-prototype-state | Status |
|---------------|----------------------|--------|
| 默认态 | default | implemented |
```

如果任何 design decision 或 required state 未实现，QA 不得 PASS。

同时保留 §7「页面与交互位置映射」到 HTML 实现位置的对应清单：逐项核对交互职责、
D/STATE、来源与 AC、约束、下游去向；已确认页库引用或 `reference=none` 如实记录。

**开发交接补全（仅下游=开发/场景1 时追加，非硬 QA 项）**：若原型将进自家开发链（tech-spec/task-plan），
在 prototype-spec.md 追加一节，补 **组件 props / 响应式断点 / design token 清单 / 动效** 四维
（从已产出 HTML 抽取，逐维方法见 `.claude/skills/office/references/dev-handoff-dimensions.md`）；
下游=Figma（场景2）**不触发**。

---

## Phase 4.5：可观测 QA（强制）

生成 `index.html` 和 `prototype-spec.md` 后，必须运行：

```bash
node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs \
  "docs/prototype/YYYY-MM-DD-<topic>/index.html" \
  "docs/decisions/YYYY-MM-DD-<topic>-design-brief.md"
```

如果 source_kind 不是 `design_brief`：
- `standalone_mobile_prototype`：运行同一脚本时使用 `--mode=standalone-mobile`，并在
  `prototype-spec.md` 中声明 traceability 不完整。
- `ux_audit`：使用 `--mode=ux-audit`，验证 FIX-ID 覆盖。
- `screenshot_delta`：使用 `--mode=screenshot-delta`，验证改动区/保持区声明。
- 不得伪造 design-brief 作为第二参数。

有实际设计规范时，可在原型目录写 `design-rules.json`，或传 `--design-rules=<path>`。
格式为 `{ "source": "实际规范来源及版本", "checks": [{ "id": "规则ID", "required": ["必须存在的字面片段"], "forbidden": ["不得出现的字面片段"], "maxOccurrences": { "text": "字面片段", "count": 3 } }] }`。
每条规则至少含一种检验；按真实规范填写，不复制例子作为规范。检查作用域为生成/改动区（无标记时整页），
只证明这些静态条款，不代替浏览器与人工 UX 核对。未提供文件时规范项 N/A；明确提供但无效时 FAIL。

该脚本会输出：

```
docs/prototype/YYYY-MM-DD-<topic>/prototype-qa-report.md
docs/prototype/YYYY-MM-DD-<topic>/qa-results.json
docs/prototype/YYYY-MM-DD-<topic>/screenshots/desktop.png   （Playwright 可用时）
docs/prototype/YYYY-MM-DD-<topic>/screenshots/tablet.png    （Playwright 可用时）
docs/prototype/YYYY-MM-DD-<topic>/screenshots/mobile.png    （Playwright 可用时）
```

必须检查并处理：

```
□ console errors = 0
□ design decisions mapped = N/N
□ states implemented ≥ 5（脚本仅计数 data-prototype-state 与 STATE: 标记；required AI states 是否均有 data-prototype-state 脚本不校验，须人工对照 design-brief 状态覆盖表交叉核对）
□ supplied design rules：PASS（已提供且可检验）或 N/A（没有实际规范/可自动条款）
□ no external CDN
□ no emoji icons
□ prototype-spec.md exists
```

如果脚本 FAIL：
- 能修复的，必须修复后重跑。
- 如果仅因为当前环境没有 Playwright，允许 `DONE_WITH_CONCERNS`，
  但必须说明“浏览器截图未生成”，且静态 lint/coverage 仍需通过。

---

## Phase 5：告知下一步

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/html-prototype 完成
场景：{A / B / C}
产出：
  docs/prototype/YYYY-MM-DD-<topic>/index.html
  docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md
  docs/prototype/YYYY-MM-DD-<topic>/prototype-qa-report.md
状态页：{N} 个
决策映射：{N/N}
QA：{PASS / DONE_WITH_CONCERNS}
设计规范：{来源 / 本地约定；外部规范合规未验证时明确说明}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 下一步？
>
> A）**/ux-audit** — 对原型进行 UX 评审（提供截图）
> B）先停这里

---

## ⚠️ 末尾核心约束

1. **场景询问不可跳过**
2. **Step 0 四阶段是强制认知门禁** — 未完成不得写 HTML
3. **实现依赖必须在交付环境可用**
4. **实际设计规范与可读性必须核对**，无外部规范不伪造合规结论
5. **场景B截图是强制输入** — 没有截图必须主动管用户要
6. **场景C每处改动必须有 FIX-ID 注释**
7. **每条 design-brief 决策必须有 DECISION 注释映射**
8. **所有状态必须实现** — 空态不能是空白，状态必须有 data-prototype-state
9. **Current Aesthetic Score ≥ 24/30**
10. **prototype-spec.md 交接块不可省略**
11. **Phase 4.5 QA 必须运行**
12. **承载方式不得擅自改写** — design-brief 写 standalone mobile prototype 时，不得调用 framework 母版

---

## 完成协议（Handoff Summary）

**标记 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写入 handoff summary：**
```
路径：docs/handoff/YYYY-MM-DD-<topic>-html-prototype-handoff.md
格式：见 .claude/skills/office/references/handoff-protocol.md（≤2000 tokens）
```

必须包含：
- **决策列表**（≤8条）：已实现的 design-brief 决策（DECISION 注释对应项）、页面与交互位置映射的实现去向、QA 通过状态
- **下游约束**（≤5条）：后续交付审查必须读取的 HTML 文件路径、Aesthetic Score、状态覆盖情况
- **风险**（≤3条）：未实现的状态、已知浏览器兼容问题
- **产出路径**：prototype HTML 文件完整路径 + prototype-spec.md 路径

**Step 2 — 更新 workflow-state.yaml：**

> 单写入口：workflow-state 仅由 Phase 4 的 `write_state.py` 写入一次（落 `nodes.html-prototype`）。下方 YAML 是该节点的目标形态示意——`gate_result` / `handoff_path` 为 handoff 附加字段，如 write_state.py 未覆盖则补写到同一节点下；**不要另手写顶层 `html-prototype:` 键造成双写**。

```yaml
html-prototype:
  status: DONE
  output: "docs/prototype/<filename>"
  completed_at: "<YYYY-MM-DD>"
  gate_result: PASS
  handoff_path: "docs/handoff/<filename>"
```

<!-- FILE_END: html-prototype/SKILL.md -->
