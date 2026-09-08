# OD 后续 skill：覆盖调研与专家握手方案

日期：2026-09-08。范围：framework/meta，NO_PIN。仅调研和方案；未修改 skill、路由或工作流，未操作 OD/Figma 交付物。

用户前提：按最新版 OD 评估；专家对抗最多两轮；实施须等待用户后续执行指令。

当前状态：调研与两轮专家对抗完成。独立专家 agent `/root/od_overlap_expert` 对 V2 裁决 **ACCEPT_WITH_CONCERNS，无未解决阻断**。两项具体措辞建议已纳入下文；真实项目收益尚未验证。实施未开始。

最终建议：**不增加默认后置节点，不新增 skill 或审查模式。先交付以下分流方案；用户后续明确要求执行/固化时，只补 open-design 的一处内部交接指针。**

## 判断标准

不能从 skill 名称推断能力，也不能从“有生成规范”推断“实际验收通过”。按三个问题裁决：OD 有没有相同职责；现有 flow 是否已经承担剩余职责；再加一步能否改变具体交付决定。仅有理论差异，不足以增加默认必跑节点。

## 证据索引

官方最新 main，2026-09-08 查阅；独立专家取证时记录 SHA `d82385309f5f76466313b020ed8cd8e53e22938a`。这是源码合同评估，未证明某个实际生成任务执行了全部能力；遵用户指示，不以本机安装版本限制评估。

- O1：[core-slim.ts](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/prompts/core-slim.ts)：交付前结构、内容、主交互、焦点等自检；需要时至多一次渲染。
- O2：[OD Next prototype profile](https://github.com/nexu-io/open-design/blob/main/plugins/_official/scenarios/od-next-strategy/assets/task-profiles/prototype.md)：生成要求覆盖层级、交互、状态、响应式、可访问性和内容。
- O3：[OD Next orchestration](https://github.com/nexu-io/open-design/blob/main/plugins/_official/scenarios/od-next-strategy/assets/general-orchestration.md)：ship-on-write，禁止在这条生成链内追加生成后截图、预览、测试和验收子任务。
- O4：[prompt composition](https://github.com/nexu-io/open-design/blob/main/docs/prompt-composition.md)：legacy 与 OD Next 是不同路径；不能将一条路径的检查说成所有任务默认发生。
- O5：[design-review](https://github.com/nexu-io/open-design/blob/main/skills/design-review/SKILL.md)、[copywriting](https://github.com/nexu-io/open-design/blob/main/skills/copywriting/SKILL.md)：这两个条目声明为目录入口，完整上游工作流需另装；后者主要面向营销文案。
- O6：[research-decision-room](https://github.com/nexu-io/open-design/blob/main/skills/research-decision-room/SKILL.md)：完整研究综合流程，包含来源证据、主题、置信度、矛盾、机会和决策建议。专家第 1 轮据此推翻“OD 不覆盖研究综合”的概括。
- O7：[Figma Import](https://github.com/nexu-io/open-design/blob/main/figma-plugin/README.md)：从页面捕获重建可编辑图层；字体可能替代、复杂 CSS 简化、图片可能丢失、SVG 栅格化。存在转换保真检查价值，但不能据此声称交互已迁移。
- O8：[writing-guidelines](https://github.com/nexu-io/open-design/blob/main/skills/writing-guidelines/SKILL.md)：完整文档写作规范，含 voice/tone 与少量 UI 文本规则；不能只看 copywriting 目录项就判断 OD 缺少全部语言规范。专家有限相邻检索还发现研究汇报模板，但未证实与 research-kit 等价的完整采集工具合同。

本地合同：

- L1：`.claude/skills/office/open-design/SKILL.md`，Phase 4 已核对回收文件与需求/状态覆盖；Phase 5 用户主导判断和迭代；外部 Figma 交付由用户现有工具操作。
- L2：`.claude/skill-os/optional-workflow-graph.yaml`，设计输出主路径终点为 open-design；ux-writing、research-kit、insight-synthesis 已有上游可选路径。
- L3：`.claude/skills/office/ux-audit/SKILL.md`，当前为 B/C 优化/改版评审，截图及模块证据约束；不能直接套作新原型全量验收。
- L4：`.claude/skills/office/ux-writing/SKILL.md`，支持具体文案审查；语义层通过 brief，逐字稿不进入 OD Packet。
- L5：`.claude/skills/office/research-kit/SKILL.md`、`insight-synthesis/SKILL.md`，工具设计→人工采集→一手定性综合；后者有来源及主题人工确认边界。
- L6：`.claude/skills/office/muse-loop-orchestrate/SKILL.md`，已有冷启动 muse-proto-judge 按给定 AC 核对；不能再造一份同范围评分，不能认为 AC 本身必然完整。

## 覆盖与增量价值

| 候选 | OD 覆盖判断 | 有价值的剩余部分 | 最终纳入裁决 |
|---|---|---|---|
| ux-audit | 视觉、交互、状态、可访问性规范大幅重叠；生成后独立取证并非所有路径提供 | 对真实最终产物的具体问题取证；覆盖既有检查未查到的页面/状态 | 复用现有优化参考目的；撤回新增模式，只在明确评审/诊断诉求时使用 |
| ux-writing | 一般文案、状态语义及文档写作规范部分覆盖；未证实等价的产品术语/语气/AI 语义系统 | 已发现的跨页面语言系统和关键操作语义问题 | 复用现有定向入口；单个错字或已明确的局部修改不升级专项 |
| research-kit | 暂不能证明完全覆盖或完全缺失；生成工具/实验建议与 OD 有交集 | 在确实要采集时，为具体研究问题准备可执行工具 | 保留已有可选路径，不加固定后链 |
| insight-synthesis | research-decision-room 明显覆盖综合职责 | 本地来源约束、人工主题确认和 brief 交接合同 | 不因能力缺口新增；有真实数据时按已有链选择使用 |
| report-html-generator | 报告呈现属于不同交付目的，OD 也能产 HTML 研究报告 | 用户确实要分享报告时的呈现 | 不纳入产品原型尾链 |

## 冻结提案 V1（第 1 轮送审，已被否决；留存审计）

1. 不新增 skill，不改变默认 OD 终点。只在用户已选择复核/验收，或提出具体问题时，进入独立的交付后定向复核。
2. 给 ux-audit 增加产出后目的，不增加产品场景，不套用 B/C 基线涨分要求。输入实际产物、需求/AC、页面状态与视口、版本及已有证据。只检查未覆盖项；截图无法证明动态行为，缺证据记 UNKNOWN。
3. 复用问题 ID，写位置、步骤、证据、影响、建议、修复归属和复核状态。引用同版本的已有证据，不复制 muse-proto-judge 的 AC 评分。
4. 文案问题达到专项价值时调用 ux-writing。语义修正走已有 brief/Packet；逐字稿由用户在外部工具落地，或在已有授权下修改本地 HTML。不绕开现有逐字稿边界。
5. 真实用户假设需要验证时，才选择 research-kit→人工采集→insight-synthesis；已有数据跳过采集工具。无真实数据不得生成“用户发现”。
6. 不走 Figma 时检查最终 HTML；走 Figma 时，导入后只补转换差异与目标交付检查。源问题回 OD，转换问题在 Figma 侧处理。不得把 HTML 交互检查充作 Figma 交互验证，也不恢复 figma-layer。
7. 拟修改范围限定在 ux-audit 的适用契约、OD Phase 5 可选衔接说明、必要的 ux-writing 交接澄清和既有 flow 说明。无新图 schema、无自动修复、无新全量评分。

## V1 验收断言草案（已由下文 V2 替代）

- 默认 OD 回收完成后仍可结束，无强制 audit/writing/research。
- 明确选择审查才续接；审查结束不给 OD 的生成状态改名为“已验收”。
- 同版且同范围的实际证据可引用；泛称“自检过”不算实际证据。
- 仅截图时，键盘/焦点行为等无证据项为 UNKNOWN。
- 已有 judge 结果不触发重复 AC 打分。
- 无真实资料不执行研究综合；文案逐字稿不偷偷进入 Packet。
- Figma 转换检查与 HTML 运行检查分开记录；修改后相关旧证据失效。

尚未用真实项目测量新增问题发现率、时间成本或收益，不声称提升转化率或节省 token。

## 对抗记录

- 第 1 轮：**REFUTED**。主要反驳一：ux-audit 现有优化参考目的已够用，新增模式会混入 AC 判定与 Figma 跨产物验收职责。主要反驳二：research-decision-room 已覆盖研究综合核心能力，不能以“OD 没有”论证新增 insight 尾链。采纳：撤回新模式、统一复核壳和 graph 同步规则，承认综合能力重叠。
- 第 2 轮：对冻结 V2 裁决 **ACCEPT_WITH_CONCERNS，无未解决阻断**。两项措辞建议：仅“明确请求 UX 评审或问题诊断”才接 audit；复用 OD 综合不等于本地 insight 已执行，也不跳过新解读的主题确认。两项均纳入终稿。不展开第三轮。
- 保留关注：目前只能证明职责边界及减少重复工作的机会，未实测质量/效率收益。新增自动路由或审查模式须有真实衔接失败证据再论证。

## V2 最终握手执行方案

### 用户后续指令授权后的唯一固化改动

目标文件：`.claude/skills/office/open-design/SKILL.md`，Phase 5，在既有“展示即止、用户主导迭代”规则后追加内部指针。不改变默认完成条件，不每次给用户推送菜单，不增加询问；graph、router、ux-audit、ux-writing、研究 skills 和 muse 判官都保持现有功能。

拟追加内容：

> **后续明确诉求的衔接（不属于 OD 生成或默认完成条件）**：继续遵守展示即止，不逐次推送菜单或询问是否审查。用户明确请求 UX 评审或问题诊断时，按现有 ux-audit 的优化参考目的及输入/模块确认合同处理；已说清具体修改内容的请求沿现有修改路径处理。跨页面术语、语气及关键操作语义需要系统处理时，使用现有 ux-writing，单个错字不升级为专项。用户要验证研究假设时，按现有 research-kit→人工采集→insight-synthesis 契约选择；已有原始数据可直接综合，已有可追溯综合先复用，不重复跑 OD 和本地综合。复用时保留来源和证据边界，不标记本地 insight-synthesis 已执行；若进入新的本地解读，仍遵守主题人工确认合同。语义修正遵守现有 brief/Packet 合同，逐字文案继续走用户外部编辑或已授权本地修改。muse 中的 AC 验收仍由既有 judge 承担；普通流程不因此宣称已接通 judge 自动路由。外部 Figma 交付维持现状，转换保真/可编辑性属于该交付任务的独立审查，不并入 ux-audit，不承诺 HTML 交互转换。相关既有证据仅在产物版本、页面状态和检查范围匹配时复用；修改使受影响结论失效。

这是一处可发现性说明，不是新增编排器或自动化分支。当前只提出；若用户不要求固化，无须改仓库。

### 两条交付路径

| 路径 | 衔接方式 | 问题回流 |
|---|---|---|
| 不走 Figma | OD 生成→回收 HTML→按原合同完成；明确评审/文案/研究诉求时才使用对应既有能力 | 原型问题交回 OD 或按已有授权本地修改；改后只复核受影响范围 |
| 走 Figma | OD HTML→用户现有外部工具导入 Figma；需要交付检查时，另外检查转换差异及 Figma 目标状态，不重复整套上游 UX 诊断 | 源问题反馈 OD；仅导入产生的字体、布局、内容遗漏等问题反馈 Figma 侧；目标产物修改需记录，不能假定两边已同步 |

HTML 实际交互证据不能证明 Figma 原型交互；Figma 截图也不能证明 HTML 可运行。可编辑性必须有节点结构等对应证据，不能仅看截图。

### 后续实施阶段与断言

规模：Lightweight；两阶段均为 task_execution，执行者继承当前模型配置。不启动真实设计项目或用户研究来替代本次框架说明修改。

1. **Phase 1：单文件说明固化。** 输入为用户后续明确执行指令及本节冻结文本；输出为 Phase 5 的聚焦改动。门控：保留用户已有改动，且没有新增强制节点、菜单、自动修复或外部写入。
2. **Phase 2：行为场景核对。** 检查下表反例与交接合同一致；失败先修正说明，不扩张成新路由实现。无需为文字说明创建运行时测试框架。通过后报告实际修改与核对结果。

| Given / When | Then |
|---|---|
| 正常回收 HTML，无后续请求 | 仍展示即止，不调用 audit/writing/research、不推送菜单 |
| 用户说“把这个字段移到右边” | 沿既有具体修改路径，不升级完整 UX 评审 |
| 用户明确请求 UX 评审 | 使用现有目的与模块确认合同；缺截图不绕过输入门 |
| 只有静态截图 | 动态行为无证据项为 UNKNOWN，不声称键盘/焦点已验收 |
| 单个错字 / 跨页面术语体系问题 | 前者局部处理；后者才有专项 writing 价值 |
| OD 已产可追溯研究综合 | 先复用、保留来源；不冒充本地 skill 已运行；新解读遵守确认门 |
| 没有真实一手资料 | 不产生冒充用户事实的发现 |
| 逐字文案改写 | 不绕过现有 Packet 边界 |
| Figma 导入后检查 | 不冒充 HTML 运行验收；无结构证据不声称已验证可编辑性 |
| 普通 flow 用户提 AC 验收 | 不谎称已接通 muse judge 自动路由 |
| 产物改版 | 受影响旧证据失效；不同版本结果不混为当前结论 |

## 本轮完成证据

已完成官方源码与本地合同比对、独立专家两轮对抗及最终文本收敛。当前任务只新增本报告；检查目标 skill/graph 路径的 Git 状态无修改。未执行 OD、Figma、真实研究或 skill 工作流，因此不声称这些运行验证通过。
