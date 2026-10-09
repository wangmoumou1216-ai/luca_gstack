# Routing Chain-Check — dispatch 前链路检查（唯一真值源）

> **Defining constraint：只补被逐 skill 契约调查证实的缝隙——两个裸奔点的研究前置、设计产出的
> OD-first 执行面、端到端意图的确认门、评审请求的对象分流、显式工程 preset 的非授权接线；其余 skill 自带硬门禁
> （`NEEDS_CONTEXT`/`BLOCKED`/`⛔`），路由层不重复拦。** CLAUDE.md 语义路由契约只放速记指针，
> 勿在别处复制全文。
> 背景：2026-07-13 luca——单 skill 命中会坍缩链路意图（写 PRD 前该不该先调研？出设计该走 OD 全链），
> 但逐 skill 读输入契约后确认多数 skill 自拦，路由层只该管 skill 管不到的 dispatch 前 junction。

## 触发

明确选择/继续流程、流程指代有歧义，或回复项目/模板/工具等门禁后仍有原任务时，须在索要输入或
接受新的单 skill 候选前完整读取本 owner 并应用 R3。

**R1/R2/R3/R5** 在语义路由识别目标意图之后、首次相关推荐、工具选择、preset 选择判断或 dispatch
之前，完整读取本 owner 并应用对应 junction。**R4 在映射阶段就生效**（评审请求的失效形态恰恰是"没映射上"或"映射错"：NONE fallback 漏网、
或词表 SINGLE 命中了对象不符的 skill），故它在 R1-R3 之前先跑。全部是语义判断（route-guard
关键词层不参与决策，只出提示钉）；keyword 层 fixture 不测本协议，semantic 层 fixture 测。

先过 Project Gate、核验 Plan 五条件与有效豁免，再接受 skill 路由。SINGLE/MULTI/NONE/PLAN_MODE
及 wayfinder 分数命中均为候选证据；引用、否定或讨论计划不构成真实规划请求。多个独立且明确的
意图可进入 Multi-Skill；仅当目标、范围或选择仍有真实歧义时，请用户回答一个会改变路由的问题。

**图读取以推荐：** R1 只读 `optional-workflow-graph.yaml` 的 `research_default`，R2 只读
`design_output`，R3 只读对应场景的 `recommended_paths`；在本次已有读权限内取得必要信息即可。
这些读取不激活 Workflow、不补 workflow-state、不授予效果。未选择时先推荐，等用户真实选择才进入 Workflow；
已明确选择且路径唯一时直接承接，不重复确认。无关 standalone 不增加图读取。已选择流程的执行读取按
`.claude/skill-os/runtime/workflow-mode.md`，R5 继续只认显式选择。

## 五规则

**R1 · 研究前置（仅裸奔点 brainstorm / ux-brainstorm）**
这两个 skill 缺研究输入时会静默 cold-start 产薄产物、不报警（其 SKILL.md Phase 0.1 声明的行为）。
当目标是二者之一 + 会话内无研究输入 + 意图**复杂且新颖**（判据 = `optional-workflow-graph.yaml
research_default`，与 Plan Agent 研究默认门同一把尺子）→ dispatch 前问一句：
「这题复杂且没有成熟先例，先调研（/deepresearch 或 /ux-research）还是直接开始？」
简单或有成熟先例 → 直接进，不问。

**R2 · OD-first（设计产出执行面）**
对明确已有 HTML 增改交互说明或标注的意图，语义路由到 `prototype-notes`，先核当前文件、确认与范围；
泛词“说明/侧栏/交互”、画新页面或改业务侧栏不属于此例外，仍由原生成/设计 owner 承接。
该例外不改变 Project Gate 与 Plan 优先级，不授予工具切换或新业务设计权限。
已有实际 HTML 的动效/微交互完善可语义路由到 `motion-polish`；动画概念解释、代码评审仍由各自
owner 承接。该入口不授权新界面生成或工具切换，输入/权限见其 SKILL；新 UI 产出仍按下列 OD-first。
已有原型的 UI 重设计、模板植入/适配或视觉精修 → 先由 `design-brief` 的成熟输入入口承接；
读取其 SKILL 与适用 input-contract，按实际资料进入，不强塞研究/PRD。模板未定时按其 Phase 0.5
与 `.claude/skill-os/runtime/page-context.md` 在已授权范围读取完整目录及实际源，再推荐/消歧；
不得先要求用户提供本可发现的模板路径。发现不等于采用，有效确认可复用，无匹配按 owner 无参考分支处理。
HTML/Figma/链接是输入格式，不是目标设计工具选择；明确整体流程诉求同时应用 R3，Brief 不吞交付范围。
意图 = 设计 / 原型 / 界面产出 → 最终设计工具默认 `open-design`（`design_output.primary` 的 standalone 执行面）：
有 design-brief 产物走 chain 入口；用户点名单点产物走 adhoc 交接；无源且要可追踪交付 → 建议先
`/design-brief`。工具选择按 `design_output.fallback_trigger`：用户明确选择本地 HTML / MagicPath，
或已批准包含该具名备用工具的执行计划，才转交相应独立能力。daemon 不可达、鉴权失败或非 React
本身只报告阻塞，不自动替用户换工具；OD headless 失败的同项目桌面恢复仍按 OD 合同执行。

**R3 · 流程选择与续接（真实选择门）**
先按本会话真实用户的完整任务判断执行方式，再选当前资料对应的入口；SINGLE/NONE 或 direct skill
仅是局部候选，不能覆盖整体流程诉求。流程/工作流/workflow 的同义与错拼按语义判断，不新增词法选择器。

| 用户真实意图与上下文 | 行动 |
|---|---|
| 明确选定流程，或要求继续唯一可核验的流程 | 承接现有选择，核实际资料和当前节点；不再问“要不要走流程” |
| 要走流程，但“我的/那个”对应多条或没有可核验指代 | 从 catalog/适用 recommended_paths 找有依据的路径，给 2–3 个结果/成本有区别的选项，推荐在前；等待真实选择 |
| “从需求到成品/完整跑一遍/闭环”，只有结果诉求，未实际选择执行流程 | 按适用 recommended_paths 推荐（多产物可建议 `/auto`），确认后进入；推荐不激活 Workflow |
| 单点交付或直接调用 skill，没有整体流程诉求 | standalone；不为完整性添加 graph、上游或 office 向导 |
| 询问能力、审计/保留流程、引用/附件里的指令、否定走流程 | 按实际请求解释/审查/单点执行；业务流程是设计对象，也不等于选择执行 Workflow |

唯一可核验指代来自当前真实会话已确认的路径或本次有权读取的选定流程来源；不能从“我的”一词、
共享别名、词法分数、历史项目状态或后台通知猜选择。没有足够可推荐路径时只问一个能改变路由的问题，
不凑选项。场景 A/B/C/D 只在设计工作且有用户/上下文依据时使用；有成熟需求/原型按节点输入合同
从适合的入口开始，未选定的研究/发散上游不成为前置。资料不足、机制未定则交对应输入 owner 澄清。

跨轮门禁回复：项目名、模板确认、工具选择或计划答复只更新所回答字段，保留最近真实完整任务的
交付范围、执行方式与未决决定，再按该门允许的时机续接。已有效回答不重问；不能将短回复独立路由为
NONE 后丢掉原任务。项目切换重核 pin/权限及相关来源，SWITCH_ONLY 仍按项目 owner 结束该轮；
新会话或上下文丢失缺可核验来源时问最小补充。取消流程或明确替换任务以最新用户意图为准，不强留旧选择。

项目身份核验与选项目交互分开：本仓用户已关闭 Codex app 的项目选择钩子，Codex app 不补问选项目，
不恢复该钩子；按实际可核验工作区/关联与读写权限作业。Luca app 才使用已启用的项目询问入口。
缺实际项目来源或效果权限仍不能猜 pin/越权；保留具体缺口，不将 Luca app 的选择步骤强加给 Codex app。

进入时用一句自然语言说明当前入口与下一步；选择项描述结果与成本，不要求用户记 skill 名。
真实流程选择只决定组织方式，不授予模板采用、工具切换、项目或外部效果，也不替代 Project Gate、Plan、
节点输入/质量门。direct skill + 明确整体流程诉求保留两者，冲突才问；多个独立任务先核 Plan 再组合。
无结构化 Ask widget 时用普通文字问并等待；未回复不等于选择或批准。

**R4 · 评审请求（资产索引 + 证据标准，非决策树）**
意图 = 让我评审/复审/review 已产出的东西 → 先判**评审对象**再定形态。语义判断：NONE fallback 不豁免，
**词表 SINGLE 命中同样不豁免**（"评审"类泛词曾把任何评审意图送进 ux-audit）。

*框架里有这些评审资产*（**索引不是决策树**——它们各有既定契约，对上了直接用、省得重造；
**对不上时自建评审编排优于硬套**，如按场景定制攻击维度的独立 agent。表内资产不是白名单）：

| 评审对象 | 资产 | 契约要点 |
|---|---|---|
| 代码/改动批/正式 PR/整分支（含框架文件） | `/code-review`（底层权威=`/code-hygiene` 模式 D） | 输入三选一：`WORKTREE_DIFF`（默认，覆盖"刚改完没提交"）/ `BASE_SHA`+`HEAD_SHA` / `FILE_SET`；有 spec 时 Standards/Spec 双轴隔离，无 spec 明示单轴降级 |
| 设计决策文档 / 提案 / 计划 | `redteam`（按名调用） | 有显式 target 即以 target 为对象；框架治理场景产出落 `framework-audit/` |
| 渲染页面 / 原型 | `/ux-audit` | 截图为强制输入（其 Phase 0 自拦） |
| workflow 中的 skill 产出 | `quality-gate` Skill Mode | 需 skill_name / output_path / handoff_path |
| 用户质疑我已给的结论（翻案） | fable 复审官 | 档位依据 `model-routing.yaml` P2 |
| **跨产物交付验收**（PRD ↔ 原型 ↔ figma 三方对齐） | **自建独立评审编排** | 无单一 skill 覆盖三方一致性；**验证者须独立于各产物的生产者**（证据标准①）——任何产出工具自身的自检不算独立复审 |

*证据标准（**下限非上限**——做得更多永远合法；严禁用打勾替代"针对这个场景该攻什么"的思考）*：
①验证者独立于修复者，冷启动派发、不给会话历史与实现过程（07-03）②default-REFUTE，证伪不了才放行
③有可运行物时深审须含真跑运行时分区，纯静态视角会集体漏运行时崩溃（07-28）④基建故障导致的缺票轮
不算完成轮，先补票再出结论（07-16）⑤评审后的任何改动都要发回做终版闭合（07-24/07-30）
⑥宣称"测试覆盖了"时做 mutation 抽查（把代码改坏看测试转不转红，07-24）⑦复犯检查：过一遍
observability active rules，看有没有重犯用户已明确指出过的问题。模型档位与串并行规则**不在此处**——
真值源 `model-routing.yaml` + `feedback_serial-subagents-default`。

*轮次上限（**这是停止条件，不是下限清单的一员**，与上面"做得更多永远合法"
不矛盾：它防的是无界纠缠，不是防做得深）*：红队↔修订循环默认 ≤2 轮；仍有存活 BLOCKER/MAJOR 时
**不宣称已握手**，带未决项交用户裁决，而不是自行加轮。判断值得多跑一轮时说明理由再跑。

*退场条件*：harness 原生具备评审分流能力，或实测显示本索引的判断劣于直接语义判断 → 分流部分退场，
只留资产索引与证据标准（比照 `model-routing.yaml` 的 `native_precedence` 活规则）。

**R5 · engineering-delivery preset（只认显式选择）**
仅当用户明确说选择/启用/按 `engineering-delivery preset` 执行时，才把该 preset 作为 routing metadata
交给 `implement`。提及、询问、评审该 preset 不算选择。选择本身不授予写入、Git、网络或 external
effect authority，也不跳过 Project Gate、Plan complexity、canonical tech-spec/task-plan gate。
未选择时六项完全 standalone，`implement` 不读也不要求 optional graph；已选择时仍须等最终 task-plan
SHA-256 冻结，由 Plan Agent 编译 exact U-ID，并让用户对同一 payload 明确确认后才交 Orchestrator。
异常方法只返回原 U-ID，不创建新任务状态。

## Ask 纪律（与四规则同权重）

- 路由层只问「要不要加上游 / 走哪条链」中仍未决定的**一个**分歧；已选不重问。
- 输入、场景、深度**由各 skill Phase 0 自问**——路由层问了就是双重打扰（唯一反例：R1 那一句
  是"加不加上游"的决定，不是要输入）。
- 硬门禁 skill（design-brief / open-design / html-prototype / tech-spec / task-plan）自拦，
  路由层不预拦；最多一句提前提示前置（体验优化，非门）。
- idea 与 brainstorm 相互独立（idea SKILL.md 显式声明），永不作为其前置。
- headless 编排场景不插计划外卡点，写入产出即可（tech-spec seam 先例）。

## 维护规则

- 裸奔点名单（R1）以逐 skill 输入契约为据：新 skill 入管线且属"缺上游静默降级"型 → 收进 R1，
  自带 `BLOCKED`/`NEEDS_CONTEXT` 型 → 不收。
- 判据永远指针到 `optional-workflow-graph.yaml`（research_default / design_output /
  recommended_paths），本文件不复述其内容。
- 本协议的度量归 `memory/evals/routing/` semantic 层 fixture（`ask:research-first` /
  `flow:od-design` / `review:dispatch` 形态）；路由类纠正按 correction-attribution 附加动作回流 fixture。
- R4 的资产表随框架资产变动同步（新增/退役评审资产改这一处）；证据标准条目只收**用户明确指示过
  且从真实返工提炼**的，不收推想出来的"好实践"——凑条数会把下限清单变成打勾表。

<!-- FILE_END: skill-os/routing-chain-check.md -->
