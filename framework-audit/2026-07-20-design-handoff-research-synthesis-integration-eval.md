# 报告：design-handoff / research-synthesis 纳入 luca_gstack —— 结论 + 框架层集成方案

> 交付形态：**分析报告**（供下一个 session 执行），本文件不含任何落地改动。
> 作者：Claude（Opus 4.8）· 授权：luca · 完成 2026-07-20（评估始于 2026-07-19）· 落盘 `framework-audit/2026-07-20-design-handoff-research-synthesis-integration-eval.md`。
> 落地实现（新建 skill、改路由/workflow-graph/plan-agent 等）留给下个 session，逐条见 §6 变更清单；关键决策已在 §7 锁定、深审修正见 §10。

---

## 0. Context（为什么做）

资深 UX 用户拿到"适合你的设计类 skill"推荐表，列了 design-handoff、research-synthesis 两个 skill，
要判断：能否帮到 luca_gstack 的自我提升？与现有设计/研究 skill 是**替换 / 结合 / 新增节点**哪一种？
用户明确追加：**不要只当单体 skill 评估，要在框架层想清楚"它在流程里怎么加进去、怎么路由"——它可能是一条流程，也可能是一个单节点。**

已完成一手取证：两个 Explore agent 逐行核对相关 SKILL.md（带行号引用）、web 查证两个外部 skill 真实定义、用户两个高频场景确认。

---

## 1. 地面真相（先纠正前提）

**design-handoff**（Anthropic 官方，claudeskills.info 确证）：输入**做好的视觉设计** → 输出面向开发者的交接规格
（布局/design tokens/组件 props/交互状态/响应式断点/边缘情况/动效）。方向 = **成品视觉 → 反向抽取 dev spec**，与我方"契约在前、生成在后"的正向链**相反**。
- Explore agent-1 判定：**部分覆盖·薄·方向相反**。7 维里——交互状态**强**；组件 props、响应式断点**完全缺失**；design token、动效**薄**；`tech-spec` 最接近但**显式"不得含 UI 布局描述"**排除了这层。

**research-synthesis**："官方"标签**不准**。官方同形的是 `knowledge-synthesis`（多源**搜索结果**去重+置信打分，≈deepresearch 的活）；你要的"一手访谈/工单→洞察、区分 observation vs interpretation"实为**社区 skill**（interview-synthesis 一类）。→ 采纳应采**方法论**，挑观察-解读纪律最到位的母版自建，别盲抓官方那个（会拿错能力）。
- Explore agent-2 判定：**完全缺失**。`idea` 钉死"只忠实、禁推断"（只有 observation）；`ux-research/deepresearch/quick-research` 综合的是二手/外部源（共识矩阵用在错入口）；`brainstorm` 吃二手 research.md，还把一手批量显式外包给 `muse-req-triage`。

**治理**：两者都命中 `gaps-register.yaml → GAP-design-methodology-review`（application 层，status: open），fit-to-gap 通过，进场正当。

---

## 2. 结论（替换 / 结合 / 新增节点）

| Skill | 处置 | 一句话 | 优先级 |
|---|---|---|---|
| research-synthesis | **新增节点** | 框架里完全缺失的"一手定性综合"入口，与 deepresearch/ux-research 并列的第三研究模态 | **高** |
| design-handoff | **结合（能力注入）** | 不是节点也不是流程，是织进现有 prototype→tech-spec 接缝的交接维度清单 | **中低** |

**追加项 C（2026-07-19 新增）—— 研究方向的动态编排**：非 skill，是对 Plan Agent + `research_default` 的机制扩展（诉求→研究角度组合 + 盲区主动推荐）。经一手核实判定为**真问题**（非既有机制重复），详见 §5.5。优先级**中**，与 B 天然合批。

**被否决**（败因）：① 替换任一——无对象可换，且 design-handoff 换不掉 design-brief/tech-spec（方向/职责不同）。② design-handoff 建成新节点——你无外部开发团队场景（见 §3 用户确认），为 4 维缺口加整套 skill+命令+路由违反 Simplicity First。③ research-synthesis 做成 ux-research 的 mode——污染其"外部研究编排器"defining constraint。④ 直接 install 官方 knowledge-synthesis——拿到错能力。

---

## 3. 用户确认的两个高频场景（决定处置的锚）

- **design 终点**：场景1 = HTML → **luca_gstack 自家开发链**（tech-spec/task-plan/开发）直接跑；场景2 = HTML → 写入 Figma，结束。**两者都无"交外部人类开发团队"**——故 design-handoff 独立产物大部分冗余，但 4 维薄点（props/断点/token/动效）真实咬场景1。
- **研究起点**：一手定性资料（访谈/工单/回访）与自己想法**都有**。故 research-synthesis 填的是真实高频缺口。

---

## 4. 框架层集成矩阵（核心：每格定死）

> 正交维度 × 两个 skill，逐格给判定。这是"它在流程里怎么加、怎么路由"的完整回答。

### 4.1 research-synthesis（新增节点）—— 已按 §10 深审修正

| 维度 | 定死判定（修正版） |
|---|---|
| **节点 vs 流程** | **单节点**，且**默认单 agent（非 fan-out）**〔修正：首版误设为 fan-out 重型〕。一个 agent 编码→亲和聚类→综合，interpretation 前一个内联 `AskUserQuestion` 卡点即够。fan-out（并行编码器做 inter-rater）**仅大语料才需**——**已定不采（luca 2026-07-20）**，走单 agent，省掉条件2豁免。 |
| **管线落位** | 研究段**第三"对象角度"**〔修正：非"第三 tool/模态"——`research_default.tool_choice` 已有 4 条：deepresearch/ux-research/quick-research/web_spike〕。两轴：深度轴 web_spike<quick-research<deepresearch + 对象轴 ux-research；insight-synthesis 是**对象轴新角度**（内部一手定性）。前置入口"三兄弟"仍成立，但是**概念划分**（实际靠词表+语义分流，非框架里的形式 dispatcher）：idea/muse-req-triage/insight-synthesis。 |
| **与相邻节点分工** | deepresearch/ux-research：对象相反（外部 vs 你自己一手数据）。**idea：语义撞车点，必须显式划界**——输入同类（"一手资料"≈idea 的"原始语料"），差别在**输出**：idea 忠实结构化·**禁推断**（只 observation），insight-synthesis 做 observation→interpretation 跃迁。边界句 = "忠实 vs 解读"，不写死 route-guard 会两边摇摆。**muse-req-triage：①已并入 main（2026-07-20 两检出 `git ls-files` 实证；其 frontmatter"母版无此 skill"是 F6-04 合并前陈旧文本，落地时顺手修）②输入重叠**——客户反馈同为 triage(筛哪些做) 与 synthesis(数据说明什么) 的合法输入，靠**意图消歧**路由。 |
| **路由（关键词）** | 8 个复合触发词经核实**全部无字面占用**（`访谈综合/访谈洞察/工单综合/定性综合/一手资料提炼洞察/把访谈变成洞察/区分观察与解读/亲和图`）；**避免裸"用户"字样**（撞 ux-research）。条目形态照 idea/muse_req_triage：键下划线、`invoke` 连字符、`weight`、`triggers`。 |
| **路由（语义兜底）** | CLAUDE.md「语义路由契约」加一条，**必含 idea 划界句 + muse-req-triage 意图消歧句**。 |
| **input-modes** | 在 **`skills:` 节下**加键 `insight-synthesis:`（SSOT-3 的 parseTopKeys 只扫 `skills:`/`governance_tools:` 两节——照字面放文件顶层反而 FAIL；只查键存在，**不查内部 schema**）；schema 按 auto/brainstorm 惯例（modes.standalone/workflow.required/optional + quality_gates）。 |
| **workflow-graph** | 〔修正：此文件**无 nodes/edges 语法**〕"登记"= `tool_choice` 加一行（连字符键）+ 塞进相关 scene 的 `recommended_paths` 数组 + 可选 `handoff_gates` 块（仿 `brainstorm_to_downstream`）。**SSOT-8 只查引用完整性、不强制登记**——workflow-graph 是"想接入才登"，非硬门。 |
| **场景** | A / B / D；非 C。 |
| **Plan Agent 交互** | 〔修正：取决于是否 fan-out〕**默认单 agent → 不触发条件2、无需豁免**（照 quick-research 先例）。**若选 fan-out** → 才需条件2豁免，是**四文件+checker锚**同步：plan-agent.md roster(:59 句末`。`前)+专属逐项理由 / CLAUDE.md:57 / AGENTS.md:466 / check-routing-map.mjs HITL_ANCHOR 登记门语句正则，**且 SKILL.md 正文须含该门语句**，漏一处 FAIL。**别混**：条件2豁免(拿掉触发) ≠ `ROUTE_GUARD_HEAVY_SKILLS` env(加 PLAN_CHECK 门)；两者都不进（除非要 muse-loop 那种双保险）。 |
| **模型档** | 〔修正〕主体=生成/中杠杆+中-大token → `recommended-model: core-execution`(opus)，据 rubric 行132「大token+中杠杆→core-execution」+ deepresearch 先例（deepresearch=core-execution / ux-research=guided-execution，均实读确认）。**默认不 dispatch fable**：置信度标定是生成(≤opus)、observation-interpretation 分层由 opus 主体**内联**强制；**仅当**另建真·独立对抗验证 subagent（专职证伪"把解读当观察"）才按 fable_whitelist **P1** dispatch，且须显式声明其对抗性质。三问须对**主体(中)/对抗子步(极高)各跑一遍**，不用笼统"高"压成一档。**已定 core-execution(opus)（luca 2026-07-20）；单 agent → 无对抗子步 → 无 fable dispatch**。 |
| **Handoff** | 重型即写 handoff；产出 `docs/research/YYYY-MM-DD-<topic>-synthesis.md`。 |
| **登记面（真实强制）** | 〔修正："七面全登记"高估〕**commit 级阻断只有 5 面，分布两个脚本**：① routing-map `project_skills` 条目(check-routing-map SSOT-2/3/4/5/6) ② CLAUDE.md 表行(REG-1) ③ SKILL.md+frontmatter `recommended-model`(SSOT-4+REG-2) ④ command 文件(SSOT-2/6) ⑤ input-modes 顶层键(SSOT-3)。**非阻断（仍建议做）**：/office 表(office-wizard.md，仅 warn)、workflow-graph(不强制登记)、model-routing(无 commit checker，仅 YAML lint+每日治理；REG-2 只查 frontmatter 有那行、不查 tier 合法)。 |
| **与既有纪律对账** | 不做平行体系：置信度分级复用 ux-research、逐条溯源复用 idea；defining-constraint 明写"输入=内部一手定性"以防误路由；**新增 idea 划界**为最薄弱边界。 |

### 4.1b skill 内部逻辑与数据边界（Q4 补全，2026-07-20 复审新增——SKILL.md 设计的直接输入）

- **数据来源硬边界**：一手定性数据**一律由用户提供**（粘贴原文 / 单文件路径 / 目录批量），skill **不自行采集**——真正的数据获取（约访谈/发问卷/跑可用性测试）不是 skill 能替代的；外部系统（工单系统/研究库）接入属下游项目 MCP、opt-in、**不进 luca_gstack**。
- **诚实约束**：小样本不得伪造大置信度（2 条访谈只给 2 条访谈级置信度）；无原文依据的解读不得产出。
- **内部逻辑（单 agent 六步）**：① 接收+定标（几份/什么类型/要回答什么问题，按来源切独立单元）→ ② 逐条编码出 **observation 层**（原子观察，每条带原文引用+来源 ID，零解读；大语料内部分块**串行**处理，单 agent ≠ 单 pass）→ ③ 亲和聚类（跨来源聚主题，记录独立来源支持数=强度信号；矛盾观察不抹平、单独标出）→ ④ **内联 `AskUserQuestion` 卡点：主题经用户确认后才做解读跃迁**（解读是幻觉高发区，安全阀在此）→ ⑤ **interpretation 层**（每已确认主题产出"为什么"，显式标注为解读非事实，带置信度=f(来源广度/一致性/直接蕴含 vs 推断)，可选 JTBD）→ ⑥ 成型 {主题+支撑观察(引用+来源)+解读+置信度+可选机会点}，落盘 `docs/research/` + handoff。
- **defining constraint（一句锁死）**：输入=用户提供的一手定性数据；产出严格分 observation（带原文引用）与 interpretation（带置信度）两层；模型永不在未经用户确认主题的情况下自造解读。

### 4.2 design-handoff（能力注入，非节点非流程）

| 维度 | 定死判定 |
|---|---|
| **节点 vs 流程** | **都不是**。是**横切能力清单**，织进已存在的 design→dev 接缝。理由：你的原型是 HTML(=代码)，tech-spec 已读 design-brief 且可读 HTML；为 4 维缺口另立节点=加路由+handoff+一个 stop，不划算。 |
| **管线落位** | 注入两处现有产物：① `open-design`/`html-prototype` 已产出的 `prototype-spec.md` —— **当下游为开发(场景1)时**追加"开发交接补全"节，重点补 **props / 断点 / token 清单 / 动效** 四薄弱维；② `tech-spec` intake —— 允许消费这四维。场景2(→Figma)路径**不触发**、figma-layer 产出不变。 |
| **路由** | **默认无路由项**（属于 open-design/html-prototype，本就已路由；补全节由"下游=开发"触发，非用户关键词）。 |
| **可选 on-demand** | 若你常需"从现成原型单独抽一份交接规格"（不重生成），可加一个**隐藏/高级 skill** `design-handoff`（magicpath/figma-demo 同级，不进 /office、不进关键词表），语义触发"从现有原型出 tokens/props/断点/动效交接规格"时内部 dispatch。默认**不建**，按需再加。 |
| **input-modes / workflow-graph** | 注入方案下**不新增节点**，只在 open-design/html-prototype/tech-spec 的既有节点描述里补字段；workflow-graph 不加边。 |
| **场景** | 仅场景1（→开发）激活；C（评审）可复用。 |
| **Plan Agent / 模型档** | 无新节点→不触发新 plan 条件；无独立档位（继承 open-design/html-prototype/tech-spec 现档）。 |
| **与 tech-spec 边界对账** | 注入的 props/断点/token/动效是**实现规格**，非"UI 布局描述"——绑到 `tech-spec` 现有 `CMP-NNN` 组件合同的附加字段即可，**不破坏** tech-spec"不是设计文档"的 defining constraint。 |
| **登记面** | 仅改 3 个 SKILL.md + 新建 1 个 references 清单；无路由/命令/office 变更 → registration-sync 面小。 |

---

## 5. 集成后的流程全图（两处插入已标注）

```
前置（按输入类型分流）
  单条已陈述需求/语料 ─────────────► idea
  批量候选需求 ──────────────────► muse-req-triage ──┐
  一手定性数据(访谈/工单/回访) ──► ★research-synthesis(新节点)─┐
                                                                  │
研究段（按对象分流）                                              ▼
  外部知识 ──► deepresearch ─────────────────────►  brainstorm(PRD)
  外部 UX ──► ux-research ───────────────────────►      │
  内部一手 ──► ★research-synthesis ──────────────►      ▼
                                                   ux-brainstorm(发散)
                                                         │
                                                         ▼
                                                   design-brief(收敛)
                                                         │
                                                         ▼
                                   open-design / html-prototype
                                     └─ prototype-spec.md
                                        └─ ★dev-handoff 4维补全(场景1时) ← design-handoff 注入
                                         │                         │
                              场景2 ─────┤                         │场景1
                                         ▼                         ▼
                                   figma-layer(终点)        tech-spec(intake+4维)
                                                                   │
                                                                   ▼
                                                              task-plan → 开发
```

★ = 本报告新增/改动点。

---

## 5.5 研究方向的动态编排（追加项 C，2026-07-19）

> 用户诉求：给一个需求时，希望按诉求**动态编排研究方向**，并能**主动提示是否增加其他方向**，让场景更丰富、产出更有价值。要求先判真伪、再判正向/负向。

**真问题判定 = 是。** 一手证据（本 session 直读）：
- `plan-agent.md:66-67` 明说 deepresearch 内门"**只确认深度与成本档，不确认研究角度**"——框架已承认"角度确认"没做。
- `optional-workflow-graph.yaml:19-31` 的 `research_default` 是**静态路径 + 二元门**（启发式列 deepresearch/ux-research/quick-research，`recommended_paths` 写死链条），无"按诉求动态组合角度"步，且 research-synthesis 尚未入表。
- Plan Agent 能并行研究（`plan-agent.md:273-290` Parallel Fan-out），但选的是"跑哪些 skill"，非"这条诉求需要哪些角度"的显式映射。
→ 能力现状缺失、非既有机制重复。

**正向 / 负向拆分：**
- **正向（纯加分）= 诉求→角度组合**：把诉求显式映射到三角度{外部知识 deepresearch / 外部UX ux-research / 内部一手 research-synthesis}，默认只跑**匹配到的最小集**（不自动全跑，防过度研究烧 token）。
- **易变负向 = "主动问要不要加方向"**：需求真，但若做成"每次单独弹一个提问"就撞 No Confirmation Loops 纪律→负向骚扰。**已选正向形态（用户 2026-07-19 拍板）**：**主动推荐盲区**——检测到高价值盲区角度时，在 **Plan Agent 已有的计划确认门**上明确建议"你没提但建议加 X（理由）"，用户拍板；未选角度以"考虑过·未选（理由）"一并列在同门。**骑现有卡点、不新增单独提问。**
- **硬防线**：简单/平凡诉求 → 平凡任务豁免，**不触发任何研究编排、不提示**。

**场景矩阵（诉求形态 → 默认角度 / 门上可追加 / 护栏）：**

| 诉求形态 | 默认跑的角度 | 确认门上主动推荐/可追加 | 正向/负向护栏 |
|---|---|---|---|
| "这技术/领域业界怎么做" | deepresearch | ux-research、research-synthesis | 只是单题事实 → 降 quick-research，不编排不提示 |
| "给X做个新功能"（复杂+新颖） | 匹配集（常 deepresearch+ux-research） | research-synthesis（你若有一手用户资料） | 复杂+新颖 → research-default 强制；不新颖 → 走轻量路径 |
| 自带一手数据（"我有50条访谈想做X"） | **research-synthesis（前置门，先出洞察）** | deepresearch、ux-research | 数据在前，synthesis 必跑，其余为可选追加 |
| 优化已有功能（场景B） | ux-research（竞品）+ research-synthesis（工单/抱怨） | deepresearch（技术可行性） | 有 ux-audit 报告则接住，不重复研究 |
| 线上评审改版（场景C） | ux-audit → ux-research | research-synthesis（回访数据） | 骑 ux-audit 产物，不空跑 |
| 简单/平凡诉求 | 无 | 不提示 | **硬防线：绝不为小任务触发研究编排** |

**落点（不建平行体系）：**
- 扩 `plan-agent.md` 研究规划步：增"研究方向编排"子步（诉求→三**对象角度**映射 + 盲区推荐挂到**已有确认门**）；同步修订 66-67 注记（角度确认上移到 Plan Agent 层，高于单个 skill 内门）。
- 扩 `optional-workflow-graph.yaml` `research_default`：在 **`tool_choice`（现有 4 条：deepresearch/ux-research/quick-research/web_spike）** 加 insight-synthesis 作**第三对象角度**（≠"第三 tool"）；`recommended_paths` 现为**写死静态数组**，"诉求→动态编排"是**净新增行为**，须新增最小组合逻辑（现在无任何动态机制可改参数）。
- **不新增**节点/命令/提问/orchestrator。

**正向/负向自检**：正向=角度更贴诉求、盲区被补、你保留掌控；负向已规避=不每次单独发问（骑已有门）、不自动全跑（最小集）、小任务不触发。

---

## 6. 变更清单（供下个 session 执行）

### B —— research-synthesis 新节点（本体 + 5 个 commit 级硬门，已按 §10 修正）
> **前置**：先按 §7.3 定名（**默认 `insight-synthesis`**，未改名则直接用）；以下所有路径按定名替换。
1. 本体 `.claude/skills/office/insight-synthesis/SKILL.md`——**输入契约/六步逻辑/defining constraint 见 §4.1b**；`skill-authoring.md` doctrine：defining-constraint「输入=内部一手定性」/ 六失败模式 / 修剪；observation-interpretation 两段式 + 置信度分级为核心纪律；**默认单 agent**（编码→亲和→综合，interpretation 前一个内联 `AskUserQuestion` 卡点）。
2. **【硬门①】routing-map**：`skill-routing-map.yaml` 加 `project_skills` 条目（键下划线/invoke 连字符，复合触发词见 §4.1，避免裸"用户"）——触发 SSOT-2/3/4/5/6。
3. **【硬门②】CLAUDE.md 表**：加 `/insight-synthesis` 行（REG-1 阻断）；语义路由契约加 idea 划界句 + muse-req-triage 意图消歧句。
4. **【硬门③】SKILL.md + frontmatter `recommended-model`**（SSOT-4 + REG-2）。
5. **【硬门④】command 文件** `.claude/commands/insight-synthesis.md`（SSOT-2/6）。
6. **【硬门⑤】input-modes `skills:` 节下加键** `insight-synthesis:`（SSOT-3 只查键；勿放文件顶层）。
7. **非硬门（仍建议做，保一致性）**：/office 表(office-wizard.md，仅 warn) + workflow-graph `tool_choice` 一行 + 相关 scene `recommended_paths`（不强制登记）+ model-routing.yaml `new_scenario_protocol` 记档（无 commit checker，走每日治理）。
8. **条件2豁免仅当选 fan-out 才做**（§7 枢纽决策）：则四文件+checker锚同步（plan-agent.md roster+专属理由 / CLAUDE.md / AGENTS.md / check-routing-map.mjs HITL_ANCHOR 门语句 + SKILL.md 含该句）。默认单 agent → **跳过本步**。
9. 治理：红队对抗后定稿；`gaps-register` open→addressed 由 luca 裁决(+`addressed_at`)。

### A —— design-handoff 能力注入（轻）
1. 新建 `.claude/skills/office/references/dev-handoff-dimensions.md`：7 维清单 + "从产出 HTML 如何抽取每维"。
2. 编辑 `open-design/SKILL.md`、`html-prototype/SKILL.md` 的 `prototype-spec.md` 产出规范：场景1 追加"开发交接补全"节（重点 props/断点/token/动效）。
3. 编辑 `tech-spec/SKILL.md` intake：`CMP-NNN` 合同允许附加这四维（不动"不含 UI 布局"边界）。
4. 无命令、不进 routing-map、不上 /office。
5.（可选）如需 on-demand：另建隐藏 skill `design-handoff` + 语义触发，默认不做。

### C —— 研究方向动态编排（机制扩展，非新 skill；与 B 合批）
1. `plan-agent.md`：研究规划步增"研究方向编排"子步（诉求→三角度映射 + 盲区在**已有确认门**主动推荐）；修订 66-67 行注记（角度确认上移到 Plan Agent 层）。
2. `optional-workflow-graph.yaml` `research_default`：**同 B.7 是同一处改动，合批执行一次即可**——在 `tool_choice` 加〈定名〉作**第三对象角度**（勿写"第三 tool"，见 §10.2）+ "角度组合诉求驱动、非写死路径"说明。〔复审修正：原文"第三 tool"与 §10.2 自相矛盾、错引 B.3〕
3. 登记：随 B 一并过 `check-registration-sync`（research_default 与 routing/office 一致）。
4. **不新增**命令/节点/提问。

### 共用
- 单真值源：两检出（`~/Desktop/luca_gstack` 与本运行时）任一改，改前 pull、改完 commit+push。
- "commit 级阻断"以正常提交为前提——pre-commit 的 `FAST_COMMIT=1` 可跳过 verify.sh（含 S10/S19 两 checker）；**验收时不得用该逃生舱**。

---

## 7. 留给 luca 的开放决策
1. ~~【枢纽】skill 重量~~ **已定（2026-07-20，luca 拍板）：单 agent · core-execution(opus) · 无条件2豁免 · 无 fable dispatch**。interpretation 判断重用 opus；不 fan-out 省掉四文件豁免；obs/interp 分层由 opus 主体内联强制。
2. ~~模型 tier~~ **已定：core-execution(opus)**（随决策1）。
3. **新 skill 命名**：**默认 `insight-synthesis`**（§6 全部路径按此预写，不改名即直接用，不阻塞动工）；备选 `qual-synthesis` / `field-synthesis`；`research-synthesis` 与 deepresearch 概念易混，不建议。
4. **muse-req-triage 输入重叠消歧**：客户反馈同为 triage/synthesis 合法输入，靠意图分（筛/综合）；是否在语义路由写死判据。〔合并状态已核关闭：已并入 main、两检出一致（2026-07-20 实证）〕
5. **design-handoff 要不要 on-demand 隐藏 skill**（§4.2）：默认只做注入(A)。
6. **muse-req-triage 与 synthesis 的接续次序**是否在 workflow-graph 画死（数据→synthesis→triage vs 平行）。

---

## 8. 验证方式（落地后端到端确认）
- **B**：`bash scripts/verify.sh` + `node scripts/check-registration-sync.mjs` 全绿；route-guard 可达（`echo "帮我把这批访谈综合成洞察"`→命中）；样本访谈 dry-run，人工核对**每条 insight 都分 observation(原文引用) 与 interpretation(为什么)+置信度**。〔复审修正：原列的 `behavioral_ab.py` A/B 步**删除**——该工具做"既有 skill 的 baseline/candidate prose 对比"且依赖 episodic fixtures，全新 skill 两者皆无、按原写法跑不起来；行为验证以真实样本 dry-run 为准。〕
- **A**：样本原型跑 open-design/html-prototype → `prototype-spec.md` 新含 props/断点/token/动效 → tech-spec 能读取；场景2(→Figma) 不受影响。

---

## 9. 优先级
1. 先 **B + C 合批**（research-synthesis 新节点 + 研究方向动态编排）——高价值、真缺口、分工清晰；C 的 `research_default` 改动与 B 入节点是同一处，天然一起做。
2. **A**（design-handoff 注入）作轻量补丁，可并入一次 design 链维护。
3. 各自过红队 + 五件套/清单验收，再由 luca 裁决 gaps-register 翻 addressed。

---

## 10. 框架深审修正记录（2026-07-19，三路 Explore + 一手核实）

> 首版计划承重断言与框架真实结构的不符点，6 处已改进（§4.1/§5.5/§6 已就地修正）。

1. **条件2豁免 ≠ `ROUTE_GUARD_HEAVY_SKILLS`**（plan-agent.md:51-73 / settings.json:4 / route-guard.mjs:504-513）：前者拿掉触发、后者加 PLAN_CHECK 门，方向相反；豁免是四文件+checker锚同步，且只在 fan-out+门时该加（quick-research 单 agent 故意不豁免）→ 改默认单 agent、不豁免。
2. **research_default 键=`tool_choice:`、有 4 条**（optional-workflow-graph.yaml:28-32，含漏掉的 web_spike）：insight-synthesis 是第三"对象角度"、非"第三 tool/模态"。两轴：深度轴 web_spike<quick<deep + 对象轴 ux-research。
3. **workflow-graph 无 nodes/edges 语法**（:34-204）：登记=tool_choice+recommended_paths+可选 handoff_gate；SSOT-8 只查引用完整性、不强制登记。首版边语法作废。
4. **fable P1 放水**（model-routing.yaml:72-83,127-133）：置信度标定是生成(≤opus，不进 fable)；observation/interpretation 分层默认 opus 内联，仅真独立对抗验证 subagent 才落 P1；三问须主体/对抗子步各跑一遍。
5. **"七面全登记"高估**（check-registration-sync REG-1/2/3 + check-routing-map SSOT-2..10）：commit 级阻断只 5 面；/office 表仅 warn、workflow-graph 不强制、model-routing 无 commit checker（REG-2 只查 frontmatter 有 recommended-model 那行、不查 tier 合法）。
6. **idea 撞车 + muse-req-triage 重叠**（skill-routing-map.yaml:21-25,126-132）：8 触发词无字面占用，但 idea 输入同类须"忠实vs解读"划界；客户反馈同为 triage/synthesis 合法输入，靠意图消歧。〔muse-req-triage 合并状态后经实证：已并入 main，其 frontmatter"fork 专属"为陈旧文本，见 §7.4〕

---

## 11. 高模型复审记录（2026-07-20，fable 主循环直查 + 独立干净上下文复审官）

- **结构**：作者侧 fable 直查（带工具核验）+ 1 名独立复审官（只给报告+用户六问、不给作者推理过程；抽查 12+ 承重断言逐一开文件比对，两 checker 脚本与 pre-commit 链路实证）。
- **独立票裁决：FIX_THEN_PASS** —— 事实底盘扎实（§10 六处修正全部实证有效；Q1/Q2/Q3/Q5/Q6 执行者可独立落地）；四个关键决策（新增节点 / 注入 / 单 agent·core-execution·无 fable / 骑 Plan Agent 确认门）均判**无更优替代**——第④条的关键实证：`require_research_when` 本就以"命中 Plan Agent 触发条件"为前件（optional-workflow-graph.yaml:24-26），研究编排骑其门=零新增卡点。
- **修复项（本轮已全部落进正文，修复后即 PASS）**：① §6 C.2 自相矛盾（"第三 tool"残留）+ 错引 B.3→改同 B.7；② §8 `behavioral_ab.py` 步对全新 skill 不可执行（无 baseline prose、无 episodic fixtures）→删除，换真实样本 dry-run；③ muse-req-triage 合并状态三处悬疑→实证已并入 main；④ Q4 输入契约缺口→新增 §4.1b（数据一律用户提供/六步逻辑/defining constraint）；⑤ 命名定默认 `insight-synthesis` 不阻塞动工；⑥ input-modes "顶层键"→`skills:` 节下；⑦ 补 `FAST_COMMIT=1` 逃生舱注记。
- **两票合并结论**：用户六问全覆盖（修复后），四决策为当前最优。