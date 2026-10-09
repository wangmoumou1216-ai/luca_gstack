# Workflow 横向排查与专家意见

基线：`1322121d473fcf733808e65125903202d8683e66`。作用域：NO_PIN 框架维护。
用户目标：排查其他 workflow 未考虑的场景，经专家会审后修复、提交、推送、同步主检出。

## 覆盖与方法

| 维度 | 实查范围 | 方法/限制 |
|---|---|---|
| 真实选择、门禁短回复、宿主差异 | R3、workflow-mode、office | 合同审查；Codex 不补问项目保持 |
| 产品设计 A/B/C/D 与成熟入口 | optional graph、Orchestrator | 路径和下一节点前置条件对照 |
| 一手研究、人工采集、主题决策 | research-kit、insight-synthesis | 完整合同审查；没有真实采集数据，不运行产品研究 |
| 现有代码工程入口 | code-recon、tech-spec、engineering paths | 架构摘要与正式需求输入区分 |
| auto 调度、Human Gate、失败终态 | auto、Orchestrator、handoff-protocol | 合同审查；已有有效保护不新增流程 |
| 断点恢复、验收待补、效果重复 | Orchestrator、handoff-protocol | 控制流对照；尚非真实产品恢复试验 |
| 发现、单点评估、失败分母 | 两个 scout workflow | 执行真实 JS 脚本体，agent 外部边界用确定返回 |
| 请求身份、参数、异常 schema | 两个 scout、Codex runner | 正/负例；区分省略与明确空/非法 |
| 裁决守恒、未知/越界值 | 两个 scout | 注入 UNKNOWN、null、99 等真实可表示返回 |
| 结果消费、来源更新、元数据 | evolution-bookkeep | 专家内存文件系统 dry-run；实施验收改用临时真实文件系统 |
| 产品中立性 | scout prompt 与 CONTEXT | 逐字来源比对，非模型实测 |
| Claude/Codex差异 | shared workflow + runner + model-routing | 执行合同分别核；不把共同脚本测试称为双端 live parity |

这不是全仓每个 skill 的穷尽审计。重点是共享交接边界、两份可执行 workflow、已确认有断裂的相邻合同。
既有大型原型/工程 writer 的内部实现及真实下游项目运行不在此次范围。

## 存活问题与建议

| ID | 严重性 | 场景及证据（基线行号） | 最小建议 |
|---|---|---|---|
| WF-01 | MAJOR | evolution `:251/:498`：丢一个 Intake、Discovery 或 Adoption 返回仍 COMPLETE；external `:286` Verify 丢失无完整状态。`baseline-probe.jsonl` 可重放。 | 分母在派发前固定，记录每个阶段缺失/非法结果；有效空结果与没返回分开；INCOMPLETE 隔离建议。 |
| WF-02 | MAJOR | evolution `:251/:257/:269`：请求 owner/one 可被 Intake 换成 other/repo；一目标两候选；Verify nullable/未知 gap 覆盖原映射仍 APPROVED。 | 每个指定目标严格一条且身份相等；保护 repo/source，合法 gap 校验；null 不抹掉原已知映射，未知显式拒绝。 |
| WF-03 | MAJOR | evolution `:439/:483`，external `:272`：99 分得到 3300 APPROVED；未知红队值让候选消失或两模式裁决不一致。 | 有限 0..3 数值和枚举校验；未知保留为未完成项；结果集合守恒。 |
| WF-04 | MAJOR | runner `:63` 与 evolution `:38`：坏 JSON/空 target 变成默认 sweep。 | 参数不合法在首个 agent 前拒绝；保留真正省略参数的默认行为。 |
| WF-05 | MAJOR | bookkeep `:48/:76/:87`：COMPLETE 标签与计数可以不对应候选，stats 可覆盖 run/bookkeep。 | 白名单计数、阶段/候选/请求集合一致性；本地生成元数据不受 stats 覆盖；不完整在任何写前拒绝。 |
| WF-06 | MAJOR | bookkeep `:116/:124`：S1 缺 yield 时匹配跨到 S10；字符串9参与相加成49；未知来源仍落账。 | 精确来源块、合法整数、所有更新先验证；任何来源缺失整批零写。 |
| WF-07 | MAJOR | Orchestrator `:372/:406/:448`：恢复待验节点变 IN_PROGRESS，循环仅处理 PENDING。 | 优先续接所选链中精确 IN_PROGRESS 的未完成工作/门；其后才取依赖就绪 PENDING；复用当前有效证据，避免效果重放。 |
| WF-08 | MAJOR | graph `:115` 的 code-recon→tech-spec→task-plan，未说明 TS 需要正式 PRD/Brief 或合法已定工程来源；recon只产 optional architecture brief。 | 推荐时说明可进入 TS 的来源条件；只有代码先做 recon 并交实际需求 owner，不承诺直接实现、不伪造 PRD/CONV。 |
| WF-09 | MINOR | research-kit `:127` 一律以 lightweight 豁免 handoff；自身 `runtime-estimate:12000` 不满足共享 ≤5000。 | 普通四模式与 decision-questionnaire 共同消费共享豁免规则；保留 metadata、路径及必需字段。 |
| WF-10 | MAJOR | evolution `:325/:467`、external `:117/:173/:252/:255` 固定 CRM/FxUI/旧模型宿主假设。 | 使用产品中立 Skill OS 与实际 focus、能力来源，不推断产品/品牌或模型。 |

## 专家会审

1. 原生冷审 `/root/workflow_contract_audit`（quality-gate/MR-004；eval `workflow-contract-audit-20261009-01`）：3/7 PASS，WF-07/08/09 存活，运行时 UNKNOWN。实查 graph/Orchestrator/handoff、research-kit、insight-synthesis、code-recon、tech-spec、auto。
2. 原生冷审 `/root/workflow_runtime_audit`（quality-gate/MR-004；eval `workflow-runtime-audit-20261009-01`）：1/9 PASS，WF-01…06/10 存活，完整模型/OS运行 UNKNOWN。独立重放脚本，增加目标替换、null gap、bookkeep 元数据和跨块更新反例。

两名专家都建议修原 owner、复用原失败/隔离/完成状态；不新增调度器、采集状态机、持久化 workflow 选择或项目询问。
以上是问题审查结果，不是修复验收。精确会话原票保留在本次原生工具记录中；最终方案另行冷审。

第三位原生冷审 `/root/workflow_plan_closure` 首轮计划判决 6/7，指出收紧参数时必须保留既有合法的 `target_repos: "owner/repo"` 单字符串入口，并用两份真实 scout schema 经 Codex strict 转换后的 nullable 响应作组合正例。此项已纳入待确认计划；不能为修非法参数而删合法入口。

## 被现有保护覆盖，不改

- R3 已覆盖真实选择、引用/否定、短答续接与 Codex/Luca 项目交互差异。
- insight-synthesis 已阻止缺真实数据的综合和未经确认的解读；不自动采集或模拟答案。
- auto 已保留真实用户参数、质量门、失败终态；不以“自动”绕过真人门。
- 两 scout 的非 PASS 硬门拒绝已有保护；evolution 的 Verify/Redteam null 已隔离。
- Codex runner critical latch 能阻断 Adoption/Verify/Redteam 的运输失败；因此相关 JS 反例不能冒充 Codex live 漏洞。Discovery/Intake 及 schema 可表达的非法语义值仍需修复。
- bookkeep 现有 INCOMPLETE 拒绝与同 run 去重保留；本次不扩展为通用事务/恢复系统。

## 验证边界

诊断脚本 `probe.mjs` 读取真实 workflow 源，在已有 agent 外部边界返回 fixture，不调用模型、不联网、不写产品状态。
`baseline-probe.jsonl` 是修复前实际输出，原样保留。合同审查只能证明源规则冲突；模型实际遵循、双宿主多轮产品链、OS沙箱不是本报告的 PASS。
