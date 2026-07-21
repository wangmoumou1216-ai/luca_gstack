# 外部 Skill 节点映射与打通记录 — 2026-06-07

已安装 5 个外部 skill（1/3/4/5/6，#2 impeccable 未装）。本文件是它们在 luca_gstack 工作流/plan-agent 中**用在什么场景、什么节点、带什么护栏**的权威记录，以及"打通"改了哪些点。

## 红队结论（是否真打通）

- **5/6（systematic-debugging / tdd）= 已真打通**：无路由冲突、无 hook 注入、与 verify/careful/redteam 互补；经 Skill tool 直接触发。
- **1/3/4 = 能跑但 brand-blind，必须加护栏**：实证风险 ①ui-ux-pro-max `--persist` 写出 #2563EB 蓝、零 #FF8000 意识；②design-system-architect 全局 PROACTIVE + 品牌盲；③extract-design-system 的 `audit` 会建议用竞品 token 覆盖 #FF8000/framework，且输出污染 repo。
- 关键事实：**route-guard 只路由 `skill-routing-map.yaml` 里登记的 skill**；故 1/3/4 故意**不进** route-guard（其触发词会劫持设计管线），改用 observability `rules.yaml` 在对应节点注入"绑定+护栏"。

## 映射表（1/3/4/5/6 → 场景 + plan-agent 节点）

| # | Skill | 场景 | plan-agent 节点 | 角色 | 护栏 |
|---|---|---|---|---|---|
| 1 | ui-ux-pro-max | A/B/C/D 全设计 | [设计]ux-brainstorm·[规格]design-brief·[原型]open-design/magicpath/html-prototype·[评审]ux-audit | 只读"设计知识神谕"，`search.py` 查 UX/字体/图表/a11y 喂决策（非节点，是工具） | 只查询；**弃其配色**(#FF8000 权威)；**禁 --persist/--design-system**；**不进 route-guard** |
| 3 | design-system-architect (+visual-design-foundations, design-system-patterns) | A 新功能 / D Agent化（需 token 体系时） | [规格]design-brief ↔ [工程链]tech-spec | token 架构思维：把 brand-tokens.md 工程化成下游可消费 token | **#FF8000 固定输入**；禁多品牌/暗色/白标；framework/ 只读；从属 open-design |
| 4 | extract-design-system | B/C/D 竞品相关 | [研究]ux-research / 竞品分析（截图之后） | 抽竞品站 token 作研究输入（参考非真值） | 回源对账 brand-tokens；**禁 audit 扫 repo/framework**；输出 gitignore；仅项目目录内跑；需 chromium |
| 5 | systematic-debugging | 跨场景·工程尾段+OS自维护 | [技术实现]task_execution（WA 遇 bug/断言 FAIL） | 根因优先调试闸"改前先定位"，配 quality-gate | 无（无品牌面） |
| 6 | tdd | 跨场景·工程尾段 | [技术实现]task_execution（WA 写有逻辑的 DEV U-block） | 红绿重构，补 verify 之外的"测试先行" | 无；注意非交互 WA 里"求用户确认测试计划"会落空 |

口诀：**5/6 在管线末端（写代码时自冒出）；1/3/4 在管线中段（研究/设计/规格），是 brand-blind 外部知识源，按节点绑定 + 上品牌锁。**

## 2026-06-07 追加：ux-brainstorm ↔ design-brief 解耦 + #1 phase 级嵌入

**定位锁定**：ux-brainstorm = **发散引擎**（2-3方案+Oracle对抗+交互架构+AI-Native判定）；design-brief = **收敛引擎**（规格契约：决策卡/状态/组件映射/Generation Packet）。design-brief **可独立**；检测到 ux-brainstorm 产出即**继承**不重做。

**解耦改动**（均在 invariant 可改区——description / phase 内容 / 模板 / rules，未动 phase 顺序/产出路径/FILE_END）：
- `design-brief/SKILL.md`：Phase 1 加「Step 1.0 上游继承检查」（有上游→承接 §5 AI-Native 判定、仅交互层复核、保留否决；无上游→全四层）；Phase 2 加 checkpoint 分支（有上游→核对 §10 已验证假设，不重挑战）；description 改「收敛引擎 + 继承」。
- `ux-brainstorm/SKILL.md`：description 改「发散引擎」。
- `ux-brainstorm/references/design-proposal-template.md` §13：交接清单标注源章节（§5/§10/§9）+「design-brief 直接继承不重做」红线。
- `CLAUDE.md`：skill 表两条改发散/收敛措辞 + 加 3 行决策规则。
- `optional-workflow-graph.yaml` `ux_brainstorm_to_design_brief` gate：加 consume-aware note。

**#1 嵌入升级**：rules.yaml R-20260607-001 由泛泛「可用」sharpen 成 **phase 级取数 recipe**——ux-brainstorm Phase4 每方案取 UX/图表/字体依据；design-brief Phase3 取状态规则 + Phase6 取 `--stack shadcn` 组件映射；ux-audit 取规范当标尺。品牌锁不变。

## 打通改了哪些点（全套护栏，2026-06-07）

| 触点 | 改动 | 状态 |
|---|---|---|
| `.claude/skill-os/skill-routing-map.yaml` | builtin_skills 加 systematic-debugging（调试/报错/根因/debug…）+ tdd（tdd/测试驱动/写测试…），窄词、weight 7 | ✅ 已改 |
| `.claude/observability/rules.yaml` | 加 R-20260607-001/002/003：把 #1/#3/#4 绑到设计·规格·研究节点并带品牌锁，经 get_rules.py 注入（不动受保护 SKILL.md 正文） | ✅ 已改 |
| `.gitignore` | 加 `.extract-design-system/` `design-system/`，防竞品 token 污染 env repo | ✅ 已改 |
| `~/.claude/agents/design-system-architect.md` | 品牌锁段（blockquote 置于 frontmatter 后，CRM 场景必读；非 luca/CRM 项目可忽略） | ✅ 已贴（2026-06-07，全局 subagent，repo 外不入 git） |
| 本文件 | 落盘映射 | ✅ |

**未碰**：1/3/4 不进 route-guard；office 各 SKILL.md 正文（invariants P1–P7）；framework/（只读）。

## #3 全局 subagent 品牌锁片段（已贴 2026-06-07，留档）

下面这段**已加到** `~/.claude/agents/design-system-architect.md` frontmatter 之后（blockquote 形式）：

```md
## ⛔ luca_gstack brand-lock (CRM 场景必读)
为纷享销客 CRM 产品做设计系统时：brand-tokens.md 的 #FF8000 是**固定输入，不是可设计项**——
绝不发明/覆盖主色板；**不做多品牌、暗色、白标**主题层；`framework/` 母版**只读**，绝不改。
输出只在所选 design system 上叠**品牌色 + 文字色**。本 skill 的蓝/暗色示例仅为通用范式，落到本项目一律以 brand-tokens.md 为准。
```

## 2026-06-07 地毯式审计 + 修复（4 subagent 并行：场景 / 绑定 / 冲突 / 解耦）

审计发现并已修复（全部复验通过）：
- **3 orphan 注入**：ux-audit / tech-spec 的 preamble 缺 `get_rules` → 已补（现 ux-audit 注入 R-001/003/523，tech-spec 注入 R-002）；magicpath 是外部插件委托无法消费 → 从 R-001 scope 移除（design-brief 上游已带 #1 进 packet）。
- **§编号全错**：design-brief 继承分支 + 模板「对下游交接」块引用的 §5/§9/§10 与实际章节错位（模板标题本就无编号）→ 全改**按章节名引用**（已验 5 个章节名真实存在）。
- **场景覆盖洞**：#4 加 `ux-audit` 进 R-003（scene C / 评审可达竞品 token 抽取）；#1 加 `figma-demo` 进 R-001。
- **冲突**：RECOMMENDATIONS 示例 `--design-system`（R-001 已禁）→ 改 `--domain`；R-001 文本消歧（禁的是 search.py 的 flag，与 OD designSystemId 无关）。
- **latent**：rules.yaml `scenes: [*]` 非法 YAML → 全部 `["*"]`（现标准 safe_load 通过）。
- **R-001 scope 终值**：[ux-brainstorm, design-brief, open-design, html-prototype, ux-audit, figma-demo]。

审计判定 **clean（无需改）**：routing 5/6 无 substring 冲突（w7 平局 = intended MULTI）；解耦 standalone 路径完整；运行可行性全 pass；品牌锁 guard 在位。
**有意保留（LOW，已评估可接受）**：design-system-architect 正文仍含通用蓝/多品牌范式——guard 已声明「优先于下文一切通用范式」+「非 CRM 可忽略」+ R-002 双重注入，不重写上游 ~150 行；Phase A 仍自行推 AI 方向——Phase 1 继承四层 + NEEDS_CONTEXT 兜底已覆盖主要风险。

## 再跑/再扫机制

```
Workflow({ name:'external-skill-scout', args:'<focus 领域>' })   # 对 vetting-registry 去重，只报新东西
```
配套文件：`RECOMMENDATIONS-2026-06-07.md`（推荐报告）、`vetting-registry.yaml`（已审清单）。

## 2026-07-12 增补（mattpocock/skills 对标首批，vetting 见 framework-audit/mattpocock-benchmark-2026-07/）

| # | Skill | 场景 | plan-agent 节点 | 角色 | 护栏 |
|---|---|---|---|---|---|
| 7 | codebase-design | 跨场景·工程段 | [工程规格]tech-spec seam 步·[技术实现]task_execution（WA 设计模块接口）·[brownfield]code-recon deletion-test | 深模块**词汇 primitive**（seam/接口即测试面/deletion test），被 tdd/systematic-debugging(port)/tech-spec/code-recon 引用 | 无品牌面；routing 词条**纯工程词**（红队裁定不收「接口设计」类设计邻词，防劫持设计管线） |
| 8 | resolving-merge-conflicts | 框架自维护 + 工程尾段 | FUSION-RUNBOOK 步⑧（squash 冲突）·sync-upstream 双仓合并·WA git 冲突 | 按意图解决冲突（先溯源 commit/PR/issue 原意，绝不发明行为） | 「never --abort」绝对化已在 vetting 记录与 sync-upstream 逃生口的冲突——harness 层用户主权优先 |

（另装 teach=个人 user-invoked 零框架触面不进本表；tdd 同日刷新至 391a2701：+seam 确认门 +tautological 反模式，-deep-modules/-interface-design/-refactoring〔用户拍板不留副本；deep-modules 内容由 #7 更完整覆盖〕）

## 2026-07-21 Owl-Listener/designer-skills 蒸馏采纳（DISTILL-ADOPTED，零安装）+ 2 新一级 skill

> 评估：4 路第一手 fit-to-gap + 4 轮红队收敛循环（R1×3/R2×2/R3×2/R4 终验 CONVERGED；全记录
> `~/.claude/plans/iterative-sauteeing-pond.md`）。裁决基准=**真实运行链**（live prose + enforced 缝隙），
> 不采信休眠件覆盖。来源 MIT，https://github.com/Owl-Listener/designer-skills ，96 skill / 9 plugin。
> **纳入判据（luca 拍板）**：使用形态——独立可点名的交付物生产者→一级 skill；宿主流程中途消费的底料→references 蒸馏。不装任何 plugin（advisory 通道=休眠陷阱，见下"三件休眠实证"）。

### 蒸馏映射表（reference/skill ↔ 源 ↔ 挂载节点）

| 落点 | 源（designer-skills） | 挂载/曝光 |
|---|---|---|
| `office/references/interaction-mechanics.md`（9 主题两组，含 Packet 可写性 tag） | interaction-design×9：form-design/state-machine/doherty-threshold/loading-states/search-ux/fitts-law/hicks-law/millers-law/error-handling-ux | ux-brainstorm Phase 7 强制 load + design-brief 必读表 Phase 3（场景 C 顺延 Phase 5 前）；禁转写句随指针 |
| `office/references/ux-writing.md`（语义/逐字双层） | designer-toolkit/ux-writing + 本框架碎片收拢 | html-prototype Phase 3 文案块强制 load；design-brief 只内联 ≤10 行语义规则（Phase 3）+ Step 1.0b voice-spec 继承 |
| interaction-architecture-template §1.6 IA 判据 | ux-strategy/information-architecture（+navigation-patterns 参考） | ux-brainstorm Phase 7 模板内 |
| module-a A6 构图节 + 具名律注记 | visual-critique/critique-composition | ux-audit Module A（checklist 自引、不参与升级、权重不变） |
| **新一级 skill /research-kit** + `references/instruments.md` | design-research×4：interview-script/survey-design/usability-test-plan/card-sort-analysis | 六处登记全套；流程位=brainstorm→kit→[人工采集]→insight-synthesis |
| **新一级 skill /ux-writing**（双相位） | 同 ux-writing reference | 六处登记全套；相位1 pre-brief（design-brief Step 1.0b 继承）/相位2 standalone 评审 |
| output-templates.md 围栏外 Packet 填写指引（OD 交付边界） | 红队 R1-③ 起草 + luca OD 纠偏 | design-brief Phase 6.75 消费 |

新 skill 六处登记 = routing-map 窄复合词条 + `.claude/commands/` + office-wizard Step2+3 + CLAUDE.md 一级表 + input-modes.yaml + model-routing.yaml guided-execution（frontmatter 写 tier 名）。AGENTS.md 已同步两行。

### 96-skill 全量台账（scout 防重评；verdict 见 vetting-registry DISTILL-ADOPTED 条目）

- **interaction-design（16）**：蒸馏 9（上表）；参考未采纳 1（navigation-patterns→仅 IA 判据参考）；未采纳 6：animation-principles（tokens §7 动效已覆盖）/feedback-patterns（Norman N5+Nielsen H1 live）/gesture-patterns（桌面 CRM 低适配）/interfaces-that-feel（taste-anchors 情感层已覆盖）/micro-interaction-spec（interaction-architecture §3.2 状态流转已覆盖）/onboarding-design（冷启动态+首信任事件已覆盖，文案面归 ux-writing）。
- **design-research（12）**：蒸馏 4→/research-kit；冗余 2：affinity-diagram/summarize-interview（insight-synthesis 两层综合更深）；未采纳 6：user-persona/journey-map（interaction-architecture §1.1-1.2 旅程线已覆盖）/jobs-to-be-done（insight-synthesis 可选 JTBD）/empathy-map/research-repository（memory 系统）/diary-study-plan（niche）。
- **ux-strategy（12）**：蒸馏 1（information-architecture）；未采纳 11：design-brief（撞名+严格更浅于本框架 8-phase 契约）/competitive-analysis（ux-research 已含）/service-blueprint（**luca 裁决跳过**）/opportunity-framework（≈muse-req-triage）/content-strategy（部分归 ux-writing）/business-design/design-principles/experience-map/metrics-definition/north-star-vision/stakeholder-alignment（solo/企业组织语境不适配）。
- **designer-toolkit（7）**：蒸馏 1（ux-writing）；未采纳 6：design-rationale（=design-brief 8 字段决策卡）/design-token-audit（≈verify-prototype token lint）/case-study/presentation-deck/design-negotiation/design-system-adoption（团队/作品集语境）。
- **visual-critique（7）**：蒸馏 1（critique-composition→A6）；未采纳 6：critique-color/typography/visual-hierarchy（module-a+design-system-contract live 已覆盖）/information-density（taste-anchors Attio）/affordance（module-b Norman N1/N2/N7）/brand-consistency（预设 mood/voice 文件本框架不产）。
- **ui-design（14）**：全未采纳——字阶/色板/间距/层级由 live `design-system-contract.md`+`html-prototype-tokens.md` 覆盖，data-visualization 由内置 dataviz（含可跑 CVD validator）覆盖，且 OD 架构把视觉决策委托所选 DS；Gestalt proximity 已以具名律注记进 module-a，von Restorff/common-region 等法则名未采纳（机制已 live，仅缺名）。
- **design-systems（11）**：全未采纳——原型优先架构不维护常驻多品牌 DS；accessibility-audit=module-b WCAG 2.1 AA 已覆盖。若未来转向常驻 DS 维护再议（governance/token/theming/i18n/motion 挑件）。
- **design-ops（9）**：全未采纳——6 个团队仪式类 solo 不适配；handoff-spec=handoff-protocol 已覆盖；design-qa-checklist≈verify-prototype；design-debt-audit≈ux-audit+retro。
- **prototyping-testing（8）**：全未采纳——heuristic-evaluation=module-b（Nielsen 0-4 已 live）；wireframe-spec/user-flow-diagram/prototype-strategy=html-prototype/ux-brainstorm 已覆盖；a-b-test-design/click-test-plan/test-scenario 需真实被试；accessibility-test-plan 的 AT 协议 latent（无被试场景）。

### 2026-07-21 追加裁决（原「独立议题」三件已裁，下方原文保留作背景）

| 议题 | 裁决 | 依据 |
|---|---|---|
| **三件休眠外部件** | **停用其 rules.yaml 条目（R-20260607-001/002/003 → `status: retired`），保留磁盘安装** | 成本非零且是**假信号**：三条规则合计 ~306 tokens，按 scope 注入 ux-brainstorm/design-brief/open-design/html-prototype/ux-audit/figma-demo/tech-spec/ux-research 八个 skill 的每次路由；**本 session 实证**——open-design 路由时 R-001 被真实注入，而全程无人跑 `search.py`。写着"必须遵守"却从不遵守的规则，训练的是"规则可以不看"。停用后实测 `get_rules.py design-brief` 返回 `none`。磁盘安装零成本保留，随时可手动调用；INTEGRATION-MAP 记录仍在，可逆。 |
| **Packet 两处越界** | **不删块，改为按消费方分流填写**（规则已写入 `output-templates.md` 围栏外指引） | Packet 本就服务多个生成器，二者需求不同**且门禁已印证**：`design_brief_to_magicpath` 要求 `component_mapping`，`design_brief_to_open_design` 明确不要求。原"越界"实为**模板没说明消费方条件**，非内容错误。规则：组件结构块面向 shadcn 栈必填、面向 OD 填 N/A；视觉约束第 2 行面向 OD 收窄为"其余视觉交所选 DS"；消费方不明时按最不锁能力一侧填。 |
| **姊妹库 `ai-design-skills`** | **暂不侦察（响应式触发，非定期）** | 两条依据：①**预算纪律**——CLAUDE.md 框架建设预算 ≤2 次/月，本 session 已耗一次重型 slot，Loop 宪法「响应式优先于预防式」；②**预期产出低**——本轮实证 luca 的 AI-native 层是全框架最厚处（`ai-native-design-framework.md` / `ai-native-state-coverage.md` 12 态含 7 个 AI 专有 / `ai-native-taste-anchors.md` 8 锚点 / ux-brainstorm 与 design-brief 双 AI-Native 判定），与 design-practice 那 96 个的结论同理，大概率仍是高冗余。**触发条件（满足任一即启动侦察）**：muse 遇到现有 AI-native 层答不出的 agent 交互设计问题；或场景 D 任务连续两次感到方法论不足。届时侦察必须沿用本轮的「对真实运行链核实、不采信休眠件」判据。 |

### 附带登记（独立议题，非本次改动面）

1. **三件休眠实证**（2026-06-07 批次）：ui-ux-pro-max / design-system-architect / extract-design-system 全部处于休眠——不在路由、仅 rules.yaml advisory 注入、无 gate，实际零使用（luca 证言+机制核验 route-guard soft-candidate 不读 description）。处置（蒸馏/卸载/保留）待另立治理 session 裁决。**教训已入库**：advisory 通道=休眠轨迹；enforced 缝隙=路由/SKILL.md 强制 load/blocking gate。
2. **Packet 既有两处越界**（先于本计划）：output-templates「组件结构」块 shadcn 词表压进 OD 主输入；「品牌与视觉约束」第 2 行与 open-design SKILL 的 FxUI 收窄口径矛盾。已在围栏外指引中加警示；是否收窄两块待 luca 裁决。
3. **module-a 分数漂移提示**：A6 新增后可检出项变多→与历史 audit 分数不可直接比（基线不连续点 2026-07-21）。
4. **insight-synthesis 两处既有漂移**：AGENTS.md 全文零出现（新 skill 已同步，它未同步）；frontmatter `self: 1800` 单位异常（实测 6094B，G5 字节口径不符）。
5. **使用即留任预声明**：/research-kit 天然低频（kit 与 synthesis 之间隔着 luca 亲自采集）——60 天零 `skills_used` 属预期节奏，治理复盘按此判读不误降。
6. **workflow-state 口径**：两新 skill 照 insight-synthesis 先例不自写 workflow-state（由编排层更新）——与 R3-② M2 原修法的显式偏差，依据=最新一级 skill 活先例。
7. **窄词条已接受触达缺口**：「设计一份问卷」类倒序 prompt 零词表命中 → STOP → 语义路由契约兜底（窄词条防劫持的已接受代价；词表设计注释见 routing-map research_kit/ux_writing 条目）。
