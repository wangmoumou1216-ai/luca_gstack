# Skill OS & 路由 诊断

## 现状摘要

luca_gstack 的 Skill OS 是一个 keyword→skill 路由层，由 `route-guard.mjs`（UserPromptSubmit hook）在每次用户输入时评分并输出路由提示。`.claude/skills/office/` 下有 24 个可调用 skill（外加 `references/` 只读目录），其中 15 个暴露为一级斜杠命令、9 个为隐藏/高级 skill（只能由 agent 直接读文件触发）。路由真相源被拆成 5 处并行维护：`skill-routing-map.yaml`（关键词）、`input-modes.yaml`（I/O 契约）、`optional-workflow-graph.yaml`（场景路径）、`.claude/commands/*.md`（斜杠命令）和 `CLAUDE.md` 表格。route-guard 的关键词匹配是纯子串包含（`text.includes(normalize(trigger))`），tie-break 窗口为 `weight >= topWeight-1`，因此相邻权重 + 子串包含会产生大量多候选与误命中。整体设计意图清晰（Skill-first / Graph-optional、保护区 invariants、handoff gate），但配置一致性和关键词隔离存在多处可量化缺陷。

## 优点

1. **路由意图明确且分层**：route-guard 输出 Project Gate → Plan Mode → Plan Check → Multi/Single → STOP 五级决策（route-guard.mjs:268-291），重型编排 skill 用 `HEAVY_ORCHESTRATOR_SKILLS` 白名单强制 Plan 检查（route-guard.mjs:259-266），避免复杂任务直接落单 skill。
2. **隐藏 skill 设计自洽**：9 个高级 skill（careful/challenge/design-review/evals/handoff-review/redteam/retro/taste-review/fx-icon-search）刻意不在 routing-map、不在 commands、不在 /office 暴露，符合 CLAUDE.md 声明的「不主动入口」，且 commands 与 skill 目录一一对应、无悬空命令。
3. **保护区契约清晰**：skill-invariants.md 定义 P1-P7 保护区（frontmatter / 输出路径 / preamble / handoff / FILE_END / Phase 顺序 / workflow-state 写入），为自动优化（GEPA）和人工编辑划出明确红线（skill-invariants.md:10-110）。
4. **handoff gate 可证伪**：optional-workflow-graph.yaml 的 gate 用 `block_if` 列出具体可检查条件，并区分 `allow_standalone_override` true/false（optional-workflow-graph.yaml:55-157），不是空泛的「需要审查」。
5. **有一致性测试**：`scripts/check-routing-map.mjs` 断言 16 个 invoke 必须存在、/status 不得伪装成一级 skill、CLAUDE.md/AGENTS.md 路由契约必须在前 40 行（check-routing-map.mjs:27-39），说明已意识到漂移风险。

## 问题清单

- **[严重度:中][类型:健壮性] 子串包含匹配导致跨 skill 误命中**。route-guard 用 `text.includes(normalize(trigger))`（route-guard.mjs:227），关键词作为子串即命中。证据：`调研`(deepresearch,w6) 是 `设计调研`/`UX调研`(ux_research,w7) 的子串 → 用户输入「设计调研」会同时点亮 deepresearch 与 ux_research；`brainstorm`(w6) 是 `设计brainstorm`(ux_brainstorm,w7) 的子串；`网页`(web_access,w9) 是 `访问网页`(agent_browser,w7)、`网页演示`(frontend_slides,w7) 的子串。共检出 17 处跨 skill 子串包含（skill-routing-map.yaml:39/44/49/79/103/109/211 等）。

- **[严重度:中][类型:健壮性] tie-break 窗口 `topWeight-1` 与子串叠加放大多候选**。候选筛选为 `hit.w >= topWeight - 1`（route-guard.mjs:240），权重差 ≤1 即并列。结合上一条：`设计调研` 命中 ux_research(7)+deepresearch(6)，差值 1 → 落入窗口 → 输出 MULTI_SKILL 要求用户二选一，而语义上明确应是 ux_research。多数一级 skill 权重集中在 6-7（skill-routing-map.yaml:23/28/38/43/48/53/58/63/68/73/88/93），窗口几乎吞掉所有区分度。

- **[严重度:中][类型:一致性] superpowers brainstorming 标识符三种写法不统一**。`superpowers_brainstorming`(skill-routing-map.yaml:31)、`superpowers-brainstorming`(input-modes.yaml:55、optional-workflow-graph.yaml:18/30)、`superpowers:brainstorming`(CLAUDE.md:266、check-routing-map.mjs:13)。三处下划线/连字符/冒号混用，任何按 key 做关联的脚本都会断链；目前靠人工记忆维持。

- **[严重度:中][类型:一致性] `compare` 缺失 I/O 契约**。compare 在 routing-map(:71)、commands/compare.md、CLAUDE.md 表均存在，但 input-modes.yaml 完全没有 compare 条目（grep 确认）。任何依赖 input-modes 判定 standalone/workflow required 输入的逻辑对 compare 静默失效。

- **[严重度:低][类型:重叠] idea vs brainstorm 边界靠文字声明维持**。两者关键词都落在「需求」语义域：idea 触发 `需求确认/需求分析`(routing-map:24)，brainstorm 触发 `需求文档/需求梳理`(routing-map:29)，权重同为 6。区分仅靠 SKILL.md 文字（idea/SKILL.md:38「忠实记录者，不是产品顾问」「与 /brainstorm 是独立关系」）。`需求分析→idea`、`需求梳理→brainstorm` 的切分对用户不可见，易错路由。

- **[严重度:低][类型:重叠] deepresearch vs ux-research 功能近邻**。两者都是「多 agent 并行研究 + 共识矩阵 + 苏格拉底审查」编排器（deepresearch/SKILL.md frontmatter、ux-research/SKILL.md:8）。区别仅在研究对象（知识主题 vs 设计决策问题，ux-research/SKILL.md:43）。关键词 `调研` 子串重叠（见第一条），二者 runtime-estimate 分别 150K/30K，误路由代价不对称。

- **[严重度:低][类型:重叠] design-brief vs html-prototype 职责相邻但已用 carrier 契约切分**。design-brief 产出 Design Generation Packet（决策契约），html-prototype 消费它产 HTML（input-modes.yaml:88-114）。切分是清楚的，但 magicpath 触发词含 `原型界面`，与 html_prototype 的 `原型界面` 完全同词冲突（见下条），三者在「原型/界面产出」语义上仍需用户区分载体。

- **[严重度:低][类型:健壮性] 完全同词冲突 `原型界面`**。`原型界面` 同时是 html_prototype(w7,:59) 和 magicpath(w8,:84) 的触发词。magicpath 权重高 1，落入 tie-break 窗口 → 每次输入「原型界面」都产生 MULTI_SKILL 二选一，无自动 tie-break。

- **[严重度:低][类型:复杂度/一致性] 路由真相源散落 5 处，无单一来源**。同一份 skill 列表在 skill-routing-map.yaml、input-modes.yaml、optional-workflow-graph.yaml、commands/*.md、CLAUDE.md 表格中各维护一份；其中 routing-map 16 个 project key、input-modes 18 个 key（含 4 governance + 缺 compare）、CLAUDE.md 表 17 行。check-routing-map.mjs 只校验 16 个 invoke 存在性，不校验 input-modes 与 routing-map 的双向覆盖，因此 compare 缺失、superpowers 命名漂移都未被测试拦住。

## 量化指标

- 可调用 skill 目录数：24（含 references 共 25 个目录；references 自声明不可调用）
- 一级斜杠命令 skill：15（commands 共 17 文件，含 office/status）
- 隐藏/高级 skill：9（careful/challenge/design-review/evals/handoff-review/redteam/retro/taste-review/fx-icon-search）
- routing-map：212 行；project_skills 16 条 + builtin_skills 17 条
- input-modes：194 行；14 主 skill + 4 governance_tools = 18 条（缺 compare；多 evals/redteam/retro 三条不在 routing-map）
- optional-workflow-graph：166 行；4 场景 × 多路径 + 8 个 handoff gate
- 跨 skill 子串包含冲突：17 处；完全同词冲突：1 处（`原型界面`）
- 同一 skill 列表重复出现的配置面：5（routing-map / input-modes / workflow-graph / commands / CLAUDE.md 表）
- superpowers 标识符写法分歧：3 种（`_` / `-` / `:`），跨 4 文件
- 路由权重分布：一级 skill 14/16 集中在 weight 6-7，tie-break 窗口 ±1 几乎覆盖全集

## 优化机会（候选方向，未下结论）

1. **匹配语义收紧**：将子串 `includes` 改为边界感知匹配（中文 token / 英文 word-boundary），或为「长触发词优先」加规则，消除 `调研⊂设计调研`、`网页⊂访问网页` 一类误命中。
2. **单一来源生成**：以一份 skill registry（如扩展 routing-map 或新建 manifest）为真相源，用脚本生成/校验 input-modes、CLAUDE.md 表、commands，replace 5 处手维护。
3. **补 check**：在 check-routing-map.mjs 增加「routing-map ↔ input-modes 双向覆盖」「superpowers 标识符一致」断言，把 compare 缺失与命名漂移变成 CI 失败。
4. **tie-break 策略**：对完全同词冲突（原型界面）与高代价误路由（deepresearch 150K）定义显式优先级或追问规则，而非依赖 ±1 权重窗口。
5. **重叠 skill 评估**：idea/brainstorm、deepresearch/ux-research 是否合并或改为「一个入口 + 模式参数」，需结合实际误路由频率（observability 数据）再定，本卡不下结论。
