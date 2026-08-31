# Routing Chain-Check — dispatch 前链路检查（唯一真值源）

> **Defining constraint：只补被逐 skill 契约调查证实的缝隙——两个裸奔点的研究前置、设计产出的
> OD-first 执行面、端到端意图的确认门、评审请求的对象分流、显式工程 preset 的非授权接线；其余 skill 自带硬门禁
> （`NEEDS_CONTEXT`/`BLOCKED`/`⛔`），路由层不重复拦。** CLAUDE.md 语义路由契约只放速记指针，
> 勿在别处复制全文。
> 背景：2026-07-13 luca——单 skill 命中会坍缩链路意图（写 PRD 前该不该先调研？出设计该走 OD 全链），
> 但逐 skill 读输入契约后确认多数 skill 自拦，路由层只该管 skill 管不到的 dispatch 前 junction。

## 触发

**R1/R2/R3/R5** 在语义路由把意图映射到目标能力之后、dispatch 之前过一遍——它们是"已选定目标后的
junction"。**R4 在映射阶段就生效**（评审请求的失效形态恰恰是"没映射上"或"映射错"：STOP 漏网、
或词表 SINGLE 命中了对象不符的 skill），故它在 R1-R3 之前先跑。全部是语义判断（route-guard
关键词层不参与决策，只出提示钉）；keyword 层 fixture 不测本协议，semantic 层 fixture 测。

## 五规则

**R1 · 研究前置（仅裸奔点 brainstorm / ux-brainstorm）**
这两个 skill 缺研究输入时会静默 cold-start 产薄产物、不报警（其 SKILL.md Phase 0.1 声明的行为）。
当目标是二者之一 + 会话内无研究输入 + 意图**复杂且新颖**（判据 = `optional-workflow-graph.yaml
research_default`，与 Plan Agent 研究默认门同一把尺子）→ dispatch 前问一句：
「这题复杂且没有成熟先例，先调研（/deepresearch 或 /ux-research）还是直接开始？」
简单或有成熟先例 → 直接进，不问。

**R2 · OD-first（设计产出执行面）**
意图 = 设计 / 原型 / 界面产出 → 默认 `open-design`（`design_output.primary` 的 standalone 执行面）：
有 design-brief 产物走 chain 入口；用户点名单点产物走 adhoc 交接；无源且要可追踪交付 → 建议先
`/design-brief`。仅命中 `design_output.fallback_trigger`（OD daemon 不可达 / 用户明确要本地 HTML /
non-React）才落 `html-prototype` / `magicpath`。重要设计场景 = OD。

**R3 · 端到端意图（确认门）**
「从需求到成品 / 完整跑一遍 / 闭环」类意图 → 列出 `optional-workflow-graph.yaml` 对应场景的
recommended_path（muse 的端到端自治编排意图另有 CLAUDE.md 语义兜底 → `/muse-loop-orchestrate`；
多产物组合诉求可建议 `/auto`），**问一句确认后进入**——确认即 SF-003「用户主动选择」，
红线：不得跳过确认静默进整链。

**R4 · 评审请求（资产索引 + 证据标准，非决策树）**
意图 = 让我评审/复审/review 已产出的东西 → 先判**评审对象**再定形态。语义判断：STOP 不豁免，
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
| **跨产物交付验收**（PRD ↔ 原型 ↔ figma 三方对齐） | **自建独立评审编排** | 无单一 skill 覆盖三方一致性；**验证者须独立于各产物的生产者**（证据标准①）——figma-layer / html-prototype 的自检不算数 |

*证据标准（**下限非上限**——做得更多永远合法；严禁用打勾替代"针对这个场景该攻什么"的思考）*：
①验证者独立于修复者，冷启动派发、不给会话历史与实现过程（07-03）②default-REFUTE，证伪不了才放行
③有可运行物时深审须含真跑运行时分区，纯静态视角会集体漏运行时崩溃（07-28）④基建故障导致的缺票轮
不算完成轮，先补票再出结论（07-16）⑤评审后的任何改动都要发回做终版闭合（07-24/07-30）
⑥宣称"测试覆盖了"时做 mutation 抽查（把代码改坏看测试转不转红，07-24）⑦复犯检查：过一遍
observability active rules，看有没有重犯用户已明确指出过的问题。模型档位与串并行规则**不在此处**——
真值源 `model-routing.yaml` + `feedback_serial-subagents-default`。

*轮次上限（**这是停止条件，不是下限清单的一员**——Loop 宪法四原语之一，与上面"做得更多永远合法"
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

- 只问「要不要加上游 / 走哪条链」这**一个**决定，一次问清。
- 输入、场景、深度**由各 skill Phase 0 自问**——路由层问了就是双重打扰（唯一反例：R1 那一句
  是"加不加上游"的决定，不是要输入）。
- 硬门禁 skill（design-brief / open-design / html-prototype / tech-spec / task-plan）自拦，
  路由层不预拦；最多一句提前提示前置（体验优化，非门）。
- idea 与 brainstorm 相互独立（idea SKILL.md 显式声明），永不作为其前置。
- headless 编排场景（muse-loop 等 dispatch）不插计划外卡点，写入产出即可（tech-spec seam 先例）。

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
