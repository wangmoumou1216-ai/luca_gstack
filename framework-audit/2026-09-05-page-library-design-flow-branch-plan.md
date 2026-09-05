# 页面库与外部设计交接：主线修复分支计划

状态：B4/B5 DONE_WITH_CONCERNS，B6 DONE（本分支已释放给主线 P6；不代表整体完成）。B3 独立复审 CONDITIONAL_PASS；B2 本地接线门 PASS；真实 OD 与最终双 Harness 仍按 R-2 移交主线。B1 剩余验收 USER_WAIVED / DONE_WITH_CONCERNS（非 PASS）；B0 PASS（6/6）。2026-09-05。
分支标识：BR-PAGE-HANDOFF。执行模式：Supervisor；外层串行，独立文件可并行。
规模：Deep（跨 skill、路由、门禁及受控事实变更）；执行档 core-execution；独立反证档 reasoning-heavy（model-routing P1）。Codex 继承模型，按权威表选 effort，不写死模型名。

## 0. 主线、分支与授权边界

主线仍是原 handoff 的 Agent 根上下文轻量化：Phase 0 基线与 K1–K10、独立根入口、一跳加载、行为验证、mutation、独立反证及最终 commit/push。

本分支由主线 F10 读取缺失 component-map.md 的失败引出。用户进一步明确：不恢复旧设计资产，而是调整实际设计消费链。分支不得替代主线，也不得用分支通过宣告整体完成。

主线暂停点：F10 行为门未关闭；原报告中尚缺 Claude 行为证据。当前旧窄补丁仅有局部验证，不能作为此新需求的验收。

主线独立 checkpoint：`framework-audit/2026-09-05-agent-context-mainline-checkpoint.md`。恢复主线前读至 FILE_END；其中固定 P6 第一未完成门、证据身份、保护项和发布前剩余顺序。本计划只管理分支，不覆盖主线 checkpoint。

分支返回点：B6 之后回到主线第一个未关闭的行为验证门。只重验受影响义务；保留已完成实现、原始失败和未受影响证据。之后完成原主线剩余双 Harness、预算、最终门禁与发布工作。

已知基线：

- HEAD：94f086233affb3bd08ad8fe33063bcfedb330edf；当前 main 有大量原主线未提交修改。
- 原报告：framework-audit/2026-09-04-agent-context-ab-report.md。
- 原行为轨迹：framework-audit/2026-09-04-agent-context-ab.ndjson，历史只追加，不删失败、不改评分重写历史。
- 原义务/基线记录：framework-audit/2026-09-04-agent-doc-lightweight-baseline.md。
- 本轮读取的 evaluator SHA-256：031d3aeea98c839dd1975081805d2c4834b42e36ba51f90b8b6966ec5f3fddfd。
- 受保护 memory/retrieval-log.jsonl 本轮读取 SHA-256：bbfdea3971688338f05ef9a334de79e55f0f596732d56d4c57b8c5a27f6d9605。允许识别运行时追加，绝不回退、截断或混入提交。

作用域始终 NO_PIN。可维护本仓框架自有指令、脚本、登记与测试；framework/ 只读。不得访问 docs/、workflow-state、current-topic 共享别名或下游项目；不得修改独立安装的 fx-workbench-ux 等个人 skill。计划中的项目产出路径只描述未来已过 Project Gate 的执行合同，本分支不沿这些路径读写。

用户的“退役”已明确裁定 figma-layer 去留；随后“没事，你按照这个执行吧”“执行完，回到主线”批准了本分支执行。批准包含其最新保留限制（S9），不扩大 Git、外部工具或其他项目权限。

## 1. 用户需求与前提门

| 来源 | 已冻结需求 |
|---|---|
| S1：“实现是在od或者claude design。然后我在那里…加设计系统” | UI/交互实现与设计系统在外部设计工具完成；本仓不再覆盖其视觉系统。 |
| S2：“相关token或者组件映射什么的，是不需要的” | 清除本地旧 token、组件库技术映射及对应强制检查，不能只改缺失指针。 |
| S3：“确认这个库。以后我还要添加” | 初始页面库为五类现有母版：列表、两列详情、三列详情、表单、首页；可增量添加。 |
| S4：“需求对齐以后，在进入od之前…自动语义映射…”；后续“高置信度才推荐…低置信度的不推荐” | 需求对齐后、OD 编译前仅展示高置信匹配；采用页面须用户确认。低置信/无匹配不推荐，可非阻塞问自带页，以 reference=none 直接交接需求。 |
| S5：“在页面上选择后置入od” | 支持整页、语义区域及必要的框选定位；用户选择与设计需求一起进入交接。 |
| S6：“ux评审是需要的” | 保留 UX 评审和业务专项，评审问题仍可进入改版交接。 |
| S7：“这只是…分支…完成分支后还要回归主线” | 单独编号、独立返回点；不丢失原主线门禁与剩余工作。 |
| S8：“退役” | 退役 lucagstack 的 figma-layer 重建链；不新造替代导入层，不删除任何历史 Figma 交付物。 |
| S9：“我这个flow里面的细节逻辑，非fxui或者figma写入等等相关的。你要保留，不要直接删掉” | 删除按行为而非文件分类；非旧 FxUI/组件技术映射、非已退役 Figma 写入的通用流程默认保留，混合文件不得整块清空。 |

该不该解：应解。现行共享合同、前置检查、生成与评审仍强制旧品牌/映射；真实行为已经触发缺失依赖。

更小替代：只删 crm-profile 指针不能达到需求；旧要求还存在于 office、design-brief、OD、quality-gate、preflight 与 graph。最薄完整解是复用现有 flow 和 Generation Packet，加一个页面参考与确认步骤，不另建工作流系统。

默认形态及偏差：本计划偏向退役旧生成链，可能误删仍承重的通用验收和下游 schema。独立反证必须默认 REFUTED，专门检查“是否只是为了使本次测试变绿/收口更干净”。替代合同先验收，才允许删除。

调查边界：本案是成熟的目录、定位、确认与交接机制，不开展泛化竞品研究。调用关系核查是必做；仅当实际 OD 接口存在不能从本地合同验证的事实缺口时，做针对该接口的一手核验，不顺势搭建新连接平台。

KILL-1：若需要修改 framework/、访问下游或共享别名才能完成某项，停止该项，报告具体缺口，不扩大范围。
KILL-2：若五类源页有缺失/锚点不可用，不编造页面和区域；补齐该源的证据后再过库门。
KILL-3：若受控事实系统不支持更正旧 SF-002，不直写 promoted-facts；停止该迁移项，提交最小治理 delta。
KILL-4：若 OD 实际接收不了页面参考或无法读回对应项目中的交接材料，不以“生成了本地文件”替代“已置入 OD”。

## 2. 目标 flow：在原流程内接入

需求/方案对齐 → 语义匹配页面库 → 高置信才推荐并询问采用；低置信/无匹配不推荐 → 需求＋已确认参考（或 reference=none）交给 OD → 用户在 OD 配设计系统、设计与迭代。

Figma 若仍为用户外部交付目标，由用户现有外部操作完成。本仓不再调 figma-layer，不把它写成自动 DONE，也不凭本次退役决定声称 OD 的 Figma 能力已经验证。

### 各入口的行为

| 入口 | 接入方式 | 不应发生 |
|---|---|---|
| A/B/C/D 既有设计 flow | design-brief 对齐通过后、OD 编译前执行页面匹配；沿用已有前置门。 | 在需求未对齐时锁定页面；额外发明强制完整流程。 |
| 直接说“把这份方案交给 OD” | 复用 open-design adhoc；对明确方案执行同一页库步骤，不强制补跑 PRD。 | 重新发散已定需求；忽略用户明确指定的页面。 |
| UX 评审后改版 | 以已确认 UX 问题与页面/区域位置作为交接来源；不重新猜当前页面。 | 丢掉 P0、问题 ID、状态和修改范围。 |
| 用户已选定页面/位置 | 校验源版本和确认记录，复用选择；同一有效选择不重复询问。 | 让自动匹配覆盖用户选择。 |
| 低置信或没命中页面 | 不展示候选，告知暂无高置信匹配；可非阻塞问用户有没有参考页，以无参考页的需求包继续。 | 默认附弱候选；等待可选问题回复而阻断交接。 |
| 用户拒绝采用推荐页面 | 记录本次不用参考并继续，不隐式附上被拒页面。 | 把用户拒绝当作必须重新询问的失败。 |
| 多个高置信候选、采用尚未决定 | 只展示各自有充分依据的候选，问清采用哪页/区域或不用参考，再绑定。 | 把低置信候选拿来让用户兜底；默认取最高分并当成授权。 |
| 明确指定的页面失效 | 仅此时请求补充或重新选择；保留已对齐需求。 | 静默改用相似页/旧坐标。 |
| “拉回来”/OD 回收 | 按已绑定的工具项目和产物回收，跳过需求编译与页面再匹配。 | 再次送出需求、触发新生成、按最近项目猜目标。 |
| Claude Design 单点交接 | 同一中立包人工导出/附加；不要求 OD 在线。 | 把 CLI Claude Harness 当成 Claude Design；虚称有自动 API。 |
| 仅 UX 评审或框架维护 | 不触发 OD 写入和页面采用门；NO_PIN 不加载项目状态。 | 见“评审/纷享/framework”就执行设计链。 |

## 3. 页面库、语义层与位置选择

初始只读源：

- framework/list-page.html
- framework/detail-page-2col.html
- framework/detail-page-3col.html
- framework/form-page.html
- framework/home-page.html

页面库是页面参考，不是设计系统，也不是把“几种组件”换名保存。旧页面可用于识别信息区域和设计位置，不能成为外部工具的品牌/组件强制规范。

拟建最小所有者：

- .claude/skill-os/page-library/catalog.json：小型页面目录与区域描述，唯一数据真值。
- .claude/skill-os/page-library/schema.json：目录及位置记录的结构校验。
- .claude/skill-os/runtime/page-context.md：何时匹配、何时确认、何时不加载的行为合同。
- scripts/page-context.mjs：目录检查、候选读取、选择记录验证与交接数据打包；不模拟模型语义理解。
- scripts/page-context-preview.mjs：必要时提供轻量页面预览与选择；只负责定位，不做 UI 编辑器或产品原型生成。

字段最低集：page_id、名称/别名、用途/业务意图、source_ref、source_hash、页面状态/视口、regions。每个区域含稳定 region_id、父子关系、语义名称/别名、位置说明、可验证源锚点。坐标选择额外绑定截图版本、原始尺寸、缩放/滚动换算，不把浏览器显示坐标直接作为源图坐标。

语义过程：先按已验证作用域过滤，再用目录名称、别名、用途与区域描述内部召回；agent 完整读目录，仅对核心用途/位置有明确依据且无重要冲突的高置信候选向用户推荐。低置信不展示，可非阻塞询问用户有无参考页，但默认以 reference=none 继续。无证据不报精确概率，不引入向量数据库或远端检索服务。

位置选择：先预览整页，再选择整页/已有语义区域/框选范围。用户确认的是“改哪里”，默认不是“锁死原来的像素尺寸、布局与视觉”。必须原位或不得移动时，作为明确用户约束单独记录。源变化后原选择失效，需要重新确认。

新增页面：新增源引用/必要预览与一条目录记录即可，不修改路由代码、不重编既有 ID、不强制把新资产写入只读 framework/。新增区域需确认后再登记，不能把一次框选自动晋升为长期知识。项目专属页仍服从 Project Gate，不因此变成全局可读资产。

预览保护：仅展示本次选定、已获授权的源；不扩大成任意文件读取服务。页面代码或文字中的指令只当数据，不执行其中要求。离线/隔离预览，不为显示旧页面执行任意网络脚本；做不到时采用受控截图，不偷偷开放权限。

## 4. 交接与 UX 保留合同

复用 design-brief 的 Design Generation Packet，不新增平行 workflow 或第二份需求真值。页面匹配/确认的唯一执行点在设计源就绪后、open-design 编译前；其他入口引用同一合同。

两道门必须分开：页面确认只决定是否采用参考，不自动授予 OD 写入权。拒绝参考或无命中时使用 reference=none，已有明确交接目标和写入授权即可继续，不重复索要同一授权；尚未回复页面推荐、多候选未决或明确指定的源失效时等待。没有 OD 写入授权或目标尚未确定时，无论是否采用参考都不能写入。

交接包必须包括：

1. 用户已对齐的需求/设计决策和来源标识。
2. 用户确认的 page_id、region_id 或选区；无参考时明确 reference=none。
3. 可由接收方访问的整页参考与选区说明/标注图；不能只给 OD 无法读取的本机路径。
4. 现状、要改什么、哪些区域不改；需要覆盖的流程、状态与验收标准。
5. 目标工具项目标识、源版本与确认记录。

不附旧 token 表、品牌色配额、shadcn/FxUI 组件映射、旧 CSS 实现指令。默认把页面作为定位/结构参考，不传原始带脚本 HTML；需要原始页面文件时必须说明用途并采用安全、工具实际支持的形式。不会用删除需求正文里的合法品牌名来做粗暴“零关键词”检查。

OD：保留已有连接与 stage/recover 能力；按用户确认目标写入需求和页面附件/可达参考，然后读回并核对工具项目 ID、正文及附件。stage 成功与生成完成分开记录。设计系统在 OD 端由用户配置，本仓不以缺本地 token/DS 映射阻断交接，不主动覆盖外部设置。只有用户明确要求自动生成才涉及该外部效果。

Claude Design：首期支持同包人工交接；明确“已导出”不等于“已导入/已生成”。不新增未经核实的 API，不切换到 OD 代替用户指定工具。

UX 评审保留：A 视觉层级/一致性/可读性，B 交互与可访问性，C 按需 CRM 业务专项；移除对旧设计系统文件的强制读取。只有拿到当前外部工具实际设计规范时才能判断该规范合规；没有规范不伪造合规结论，但可评一般 UX。截图强制输入、问题严重性、场景基线和已确认状态仍保留。静态截图不能证明键盘、焦点或交互行为时标 UNKNOWN/未验证。

问题位置逐步共用 page_id/region_id；没有目录记录的实际评审页仍可用截图局部定位，不强制先入库。UX 结果回流同一 OD 交接步骤，不恢复旧本地原型 fallback。

## 5. 保留、删除、迁移清单

| 对象 | 处置 |
|---|---|
| 五类 framework/ 页面与其他磁盘资产 | 原样保留、只读引用；不删目录、不改源页。 |
| 页面用途/状态/区域描述 | 抽取到轻量页库；不继承单次 Demo Builder 状态机。 |
| design-brief 与 Generation Packet | 保留需求对齐、决策、状态、追踪；去技术组件映射、旧母版实现锁、品牌覆盖。 |
| open-design | 保留 OD 交接和回收；加入页库确认与可达参考；删品牌覆盖、失效 fallback 和 figma-layer 指引。 |
| ux-audit、业务专项与通用 UX 方法 | 保留，替换旧视觉规范依赖与输出位置描述。 |
| figma-layer | 用户已裁定退役：删除 skill 体、command、Codex alias、活跃登记/调度/前置门和自动下游指引。 |
| html-prototype、magicpath、figma-demo、muse-proto-gen | 不再预设整项/整目录退役。逐行为拆分旧 FxUI 消费、Figma 写入与通用能力；当前 OD flow 可退出已确认不需要的旧实现分支，但通用 schema、QA、交接、状态和独立能力保留或先迁移验证。删除边界不能从 skill 名称推出。 |
| brand-tokens.md、design-system-contract.md、html-prototype-tokens.md、旧组件映射材料 | 活跃设计链不再消费；专属文件在消费者核对后删除，混合文件只移除已退休部分。不修复/新建缺失 component-map.md。 |
| crm-profile | 不再作为全局品牌/组件技术约束入口；实际业务知识保留在 UX 业务专项，不因拆 profile 一起删除。 |
| muse-loop 编排 | 保留需求 triage、授权确认、状态/AC 独立判官与非 FxUI 通用流程；只裁剪被证明依赖已退休资产的分支。是否退出当前 OD flow 与是否删除独立能力分开处理。 |
| research、PRD、工程交付、记忆、Project Gate、通用安全 | 不因“其他链路删除”整仓裁撤；仅更正指向退休设计消费者的直接引用。 |
| 历史文档/报告/日志、既有 Figma 产物、历史状态 | 不抹掉、不重写成新流程；历史查询可保留只读兼容，不因此让旧 skill 复活。 |

删除范围只针对活跃消费关系。不能以整仓关键词清零为目标；退休说明、历史证据、拒绝旧入口的测试应保留对应名称。

通用 flow 保留门：B0 对每项既有行为登记原 owner、处理方式（原位保留/等义迁移/新增/用户明确退役）、新 owner 和验证。未分类或无等义验证的行为默认保留。清单必须覆盖需求对齐、稳定 ID、决策卡、非 N/A 状态、AI 授权与接管、否决方向、模式区分、交接事实不漂移、OD 生命周期、多方案回收、UX 门与主线恢复。B3/B4 不以新版文档更短代替这张保留矩阵。

同步面：office 向导、auto、plan-agent/orchestrator、routing-chain-check、skill-routing-map、input-modes、optional-workflow-graph、model-routing、visibility/catalog、Codex viability/parity、自模型生成登记、preflight/quality-gate、相关脚本/CI。由生成器拥有的文件重建，不手改缓存。动态按名调用、alias 和 shell 字符串路径都计入消费者，不仅查 import。

preflight 已暴露旧通用前提：所有 skill 要求 brand-tokens/framework/workflow-state。改为真实条件输入；NO_PIN 不能为了通过前置检查触碰项目状态。本轮旧 preflight 未验证该状态，不把它报成 PASS；这是待修合同，不是用户材料缺失。

Static Fallback：保留机制、稳定 ID、framework 只读保护；SF-002 中“所有 HTML 原型必须基于母版”的旧消费语义需要受控更正，不能当死文本直接删。通过现有候选/review/晋升与根投影事务修改，并同步 K8 义务、fallback 来源及检查。不得直接手写 promoted-facts。其他 K1–K10 不因设计链退役被削弱。

## 6. 分支执行阶段及稳定任务单元

B0 已通过独立门（6/6），B1 IN_PROGRESS，其余阶段仍为 PLANNED。源文件修改前必须完整读取所选 skill、skill-creator 及其要求的保护合同；本轮规划读取不能替代执行前最新文件核对。写作采用 writing-for-agents；代码验证/独立改动评审采用 code-hygiene A/D，不在当前脏树运行 B/C 自动清理。

| 分支阶段 | 工作与具体产出 | 依赖与窄门 |
|---|---|---|
| B0 基线与义务 delta | U-001 冻结脏树/保护哈希；U-002 逐消费者清单与 K1–K10 变更矩阵，记录在本文件执行附录。 | 原主线基线只补差量；每项删除说明消费者、替代或不再需要的用户依据；遇范围/语义冲突停。 |
| B1 页库与选择 | U-003 建 catalog/schema/page-context 合同；U-004 轻量检索、预览、选区验证脚本与测试。 | B0；五页来源可读、ID 不重用、区域有证据；能增加第六页而不改路由代码；选区版本与换算正确。 |
| B2 原 flow 接入 | U-005 修改 open-design、design-brief 输出模板与 schema/input 合同，复用同一匹配/确认/打包逻辑。 | B1；chain、adhoc、recover、拒绝、无命中、多候选都走正确分支；采用参考须真实确认，拒绝/无命中用 reference=none 沿原 OD 授权继续，未决选择等待；OD 指定项目可读回需求及实际采用的参考。 |
| B3 UX 与删除前验收 | U-006 迁移 ux-audit 主合同、A/B/C 定位与必要通用 schema；对替代链做隔离运行、定向 Harness 探针和独立反证。 | B2；需求/状态不丢，UX 无旧 token 也能运行，缺截图/缺必需证据会停；保留消费者已有有效输入。未过门不删旧实现。 |
| B4 退役与全链同步 | U-007 退役 figma-layer 并逐行为裁剪确认的旧 FxUI 专属依赖；U-008 同步消费者、路由、前置/质量门、根条件加载及受控 SF-002。 | B3；删除清单与 S9 保留矩阵一致，退休入口不能再 dispatch；其他通用流程有保留/等义迁移证据；NO_PIN 与只读保护仍会拒绝越界；历史可读，不改原始失败记录。 |
| B5 分支闭合 | U-009 执行新鲜结构/行为 A/B、双 Harness、mutation、冷启动独立反证；记录新上下文/fixture/evaluator 哈希与矩阵。 | B4；关键项全部 PASS，UNKNOWN 不算通过；无未关闭 Critical/Important；修改后复审终版。 |
| B6 返回主线 | U-010 更新原主线 checkpoint，绑定本分支证据与受影响义务，恢复 F10/剩余 Harness 验证与主线后续步骤。 | B5；明确第一未完成项、复用依据与仍缺证据；分支不独立宣称整体 DONE，不独立发布。 |

各 B 阶段均为 task_execution、Supervisor、model_tier=core-execution；独立裁决单独使用 reasoning-heavy/P1。B1 内目录与隔离预览可分文件并行；B4 的登记/根/生成文件由主 Agent 单一所有者合并，禁止多个 worker 互相覆盖。

U-ID 命名空间为 BR-PAGE-HANDOFF/U-NNN，不与原主线编号混用、不重编。U-003/004 的 Source=S3/S5；U-005=S1/S4；U-006=S6；U-007/008=S2/S8及原保护要求；U-001/002/009/010=S7及原 handoff 验收要求。各 U 的 Read List 为本节具体所有者、对应上下游合同、受影响测试及保护规则，执行前列 exact Files，不允许 glob 递归删除。

## 7. 验证设计：先证明替代可用，再证明退役干净

结构/数据检查覆盖每个登记页与区域，不抽样。真实模型测试按不同风险分区，不把重复次数当作质量；B0 列出冻结的 case ID、Harness、arm、证据可复用性和新增次数，未获批准不扩大预算。此前未完成的主线 Claude 票单独列出，不能混成分支已完成次数。

必测行为：

- 同义需求命中正确页面和区域；语义推荐附依据，不能只有静态关键词表自测。
- 命中仍先询问；拒绝参考/无命中时 reference=none，沿已有 OD 交接授权继续且不附被拒页面；不回复推荐/多候选未决时等待。未获 OD 写入授权或目标未定时，两类包均不能写入。
- 用户改选覆盖模型推荐；整页、区域、缩放/滚动框选、源更新重确认。
- 后加页面可被同一路由命中；同名跨作用域页面不串用。
- OD 收到需求正文与指定页面材料，且目标项目一致；只落本地包不能算置入成功。
- recover 不重新映射/生成；未知 OD 项目不选“最近一个”。
- Claude Design 可独立导出同包，不探测/强制调用 OD，不虚报自动导入。
- 无旧 token/映射文件时正常交接和 UX 评审；无截图仍不能执行 UX 评审。
- 已退役 skill 的直接名、自然语言及间接调用不复活旧实现，也不暗中调 Figma MCP。
- 根无 hooks/模块/记忆时仍保留适用安全 fallback；framework 不可写，NO_PIN 不读项目别名。

mutation 至少攻击：跳过确认、把拒绝改接受、无命中伪造页面、错 region/source hash、坐标不换算、跨项目源越权、OD 写错项目、缺附件却假报交接成功、重新注入旧 token/映射、恢复旧 fallback、缺截图仍评审、移除只读/Static Fallback 防护。每项要看到 PASS→指定失败→恢复 PASS，不以任意异常充当“检测成功”。

以下是执行阶段的 BLOCKING 命令合同；具体是否已运行以阶段证据为准，不能仅因列出命令就算通过：

~~~bash
# [BLOCKING] BR-01 — 目录、五页及区域全覆盖
node scripts/page-context.mjs validate --catalog .claude/skill-os/page-library/catalog.json
# [BLOCKING] BR-02 — 检索、选择、扩展与恶意输入行为
node scripts/test-page-context.mjs
# [BLOCKING] BR-03 — 交接正文、参考材料、目标与生命周期
node scripts/test-design-flow-handoff.mjs
# [BLOCKING] BR-04 — 新守卫 PASS/指定 FAIL/恢复 PASS
node scripts/test-design-flow-handoff.mjs --mutation
# [BLOCKING] BR-05 — 根与一跳解析及语义 mutation
node scripts/check-agent-context.mjs
node scripts/test-agent-context.mjs
node scripts/test-agent-context-resolution.mjs
# [BLOCKING] BR-06 — 双端接线、路由与总合同
node scripts/verify-codex-wiring.mjs
npm run check:routing-map
node scripts/test-route-guard.mjs
node scripts/check-quality-gates.mjs
bash scripts/verify.sh
~~~

真实 Harness A/B：复用并扩展原 scripts/run-agent-context-ab.mjs 的原始轨迹记录与反作弊约束，不创建第二套宽松评分器。B0 按实际 CLI 冻结 exact commands，不在计划中捏造尚未存在的 flags。执行前后绑定 root/context、case、prompt/scorer revision、arm 与 Harness；无 --resume-valid 掩盖失败，不以成功重跑替换首次失败。

F9/F10 是已明确改变政策的例外：新预期只依据用户批准的义务 delta 版本化；旧语义、旧 FAIL 与旧 evaluator 全保留，不能声称旧失败被追溯修成 PASS。页面新能力没有旧等价能力时明确标注功能差异，而不是把旧版本缺功能当回归。

纯 Harness 交接模拟与真实 OD 接收验收分别记录；后者须在明确工具项目与授权材料下读回，不靠 mock 宣告外部接通。真人页面/位置确认是不可机器代签的门。

产出质量 criteria（独立逐条 pass/fail/unknown，附文件/轨迹/截图证据）：

- C1 忠实性：仅把已对齐需求及用户确认页面送出；防本轮“误解 flow、擅改去留”。
- C2 完整性：页面参考、位置、流程、非 N/A 状态及修改边界都可追溯；防只导出文字但未置入指定页面。
- C3 隔离：工具内设计系统未被旧 token/映射覆盖；NO_PIN/只读/作用域保护保留。
- C4 可达性：正常 flow 与单点入口消费同一确认合同，退休入口不可执行；防只改登记没有改调用者。
- C5 可信验收：缺证据/假成功能被 mutation 抓住；两 Harness 各自有行为证据，缺票不通过。
- C6 主线连续性：分支结束有可执行返回点，原失败和未完成项未被覆盖；不以分支交付替代整项完成。
- C7 行为保留：S9 保留矩阵所有既有通用逻辑均原位保留或等义迁移并通过验证；不得因与 token/Figma 写入处于同一文件而被删除。

## 8. 失败、回退与发布

关键门 FAIL：停当前阶段和后继，报告确切证据。主线原要求的证据推翻计划也立即停；不因进度压力删检查。

不使用 stash/reset/checkout 覆盖现有工作。每个修改单元留可核对 diff；需要回退时只恢复本分支拥有的具体改动。受保护检索日志只做只读校验，不自动修复“漂移”。

独立反证最多两轮，第二轮仍有实质问题即展示未决项，不无限重跑求 APPROVE。当前计划版本须再次审查，不能引用已被用户纠正的旧草案评审当终版通过。

分支不单独 commit/push。回到主线后，完成所有要求的窄门、预算收紧、独立终验及完整新鲜 verify，再按原授权发布；暂存必须排除受保护用户修改。推送前核对 upstream/main，远端前进/分叉/权限不足即停；不用 force、自动合并或历史重写。

## 9. 本轮交付与下一步

本文件是计划与分支 checkpoint，不是实施完成报告。B0 独立 PASS（6/6），verdict=`framework-audit/2026-09-05-page-library-b0-verdict.json`，eval_run_id=`br-page-b0-20260905-01`；当前 B1。尚未删除 figma-layer 或其他 skill，未写入 OD/Figma，未提交推送。

下一步：实现 B1 页库与位置选择，按 B1→B6 的窄门执行；返回原主线未完成的行为门。若遇关键门失败/证据推翻计划，停在具体失败点，不继续扩大范围。

## Replan R-1（2026-09-05，用户保留范围收紧并批准执行）

仅更新删除边界与授权状态，不推倒 B0–B6，也不重编 U-ID。旧版计划 SHA-256 为 1ac1cfef97c8fd15290d909e7edc4ee29cdd2e69500505c72622c760b440cb45，曾经独立计划反证 APPROVE；该票不充抵本次新增 S9 的保留验证。用户保留决定直接覆盖旧“整项退役”默认。新增 C7 与逐行为保留矩阵，B3 删除前独立验收必须覆盖它们。

## B0 执行附录（2026-09-05）

### U-001：修改前基线

机器清单：`framework-audit/2026-09-05-page-library-b0-baseline.json`。覆盖既有 45 个修改/未跟踪文件及五个只读源页；本分支计划自身不纳入该清单。清单是检测依据，不冒充可恢复备份。

- HEAD 仍为 `94f086233affb3bd08ad8fe33063bcfedb330edf`；index 无暂存项。
- tracked binary diff SHA-256：`053cadff020b1cb5c3c675f6b5aab00ce704d3d99b2d05399d23dfec7b43eaf2`。该值不含未跟踪文件。
- 45 文件路径/内容哈希清单 SHA-256：`2f09be77279cd67279b62dbf8840010d38f4cf3f0ab7d41ad6d2634c7b580050`。
- `memory/retrieval-log.jsonl` 与 §0 哈希一致；未覆盖、截断或暂存。
- 五个页面源全部存在，内容哈希逐项登记；区域可用性由 B1 检查，不把存在检查报成区域验证。
- B0 未改任何源代码、skill、受控事实、framework 文件、项目状态或外部工具项目。仅写分支计划与基线清单。

### U-002：K1–K10 义务 delta v1

| 义务 | 处理与唯一消费面 | 本分支验证 |
|---|---|---|
| K1 产品中性 | 保留；CRM 名称不激活本地视觉强制。CONTEXT / crm-profile 的遗留品牌入口需收窄。 | 中性需求不注入品牌；合法业务名称不被文本清洗。 |
| K2 路由顺序 | 保留全部顺序；页匹配是现有设计源就绪后的子步骤，不新增顶层路由。 | chain/adhoc/recover 与 standalone 的路由证据。 |
| K3 计划/批准 | 保留五触发与真实批准、关键门停止；本计划已有用户执行授权。 | B0–B6 独立门；页面确认与外部写入权分开。 |
| K4 catalog / STOP | 保留完整读取和语义发现；B4 只退役 figma-layer 的可执行登记。 | 直接名/自然语言/间接入口不复活；其他 skill 可达。 |
| K5 NO_PIN | 原位保留；库默认仅 framework 自有源，项目专属源须另过 Project Gate。 | 同名跨作用域、路径逃逸、共享别名拒绝。 |
| K6 保护与效果 | 原位保留；用户已裁定退役不等于任意目录删除或外部生成授权。 | 五源哈希、用户 dirty 文件、OD 项目/写入权限核验。 |
| K7 Human Gate | 原位保留并应用于页/位置采用；reference=none 不等于无写入权限。 | 未答等待、改选生效、拒绝不附参考、无授权不写入。 |
| K8 受控记忆/fallback | 机制保留；仅替换 SF-002 的强制母版语义，framework 只读不变。旧 ID 留历史，新事实显式 supersedes。 | 定向治理、投影事务、root-only F9-v2、保护 mutation；B4 执行前重验精确集合，见下。 |
| K9 工程纪律 | 原位保留；不运行 dirty-tree 自动清理 B/C。 | writing-for-agents + code-hygiene A/D；新守卫 pass→确切 fail→pass。 |
| K10 加载/双 Harness | 独立根、完整 owner 读取、conditional、一跳和真实双端保持。旧 CRM 视觉读取改为页交接条件合同。 | 新鲜双 Harness 与未读 owner/伪交接反证；旧 FAIL 不改写。 |

### S9 通用行为保留矩阵 v1

缩写仅用于此表：DB=`.claude/skills/office/design-brief/SKILL.md`；T=同目录 `references/output-templates.md`；OD=`.claude/skills/office/open-design/SKILL.md`；UX=`.claude/skills/office/ux-audit/SKILL.md`；G=`.claude/skill-os/optional-workflow-graph.yaml`。行号为 B0 快照定位，不是永久 ID。

| 保留 ID | 既有 owner/位置与承重行为 | 处理 / 新 owner | 验证义务 |
|---|---|---|---|
| P-01 | DB:100,146,193,342：PRD 六字段来源、B/C 现状、改/保留边界、范围外机会交用户 | PRESERVE / 原位 | 缺来源/未对齐不跳过；页选择不取代需求门。 |
| P-02 | CONTEXT:26；DB:580,598,619：R/AE/D 稳定 ID、Oracle 补丁去向/理由 | PRESERVE / 原位与 Packet | 只删技术映射列，不删需求→决策→状态→验收链。 |
| P-03 | DB:482；T:34：每个核心交互的八字段 D 决策、依据、被否决方案、取舍 | PRESERVE / 原位 | 所有核心决策逐项验收，不退化为自由提示词。 |
| P-04 | DB:395,399,422；T:126,150：12 状态、N/A 理由、适用 AI 状态、C 延至 Phase 5 | PRESERVE / 原位与 Packet | 全部非 N/A 状态、恢复/空态/拒绝/撤销语义必须传递。 |
| P-05 | DB:324,371；T:143：过程可见、暂停/接管/撤销、自治权限、信任假设及 fallback | PRESERVE / 原位 | 外部实现仍接受这些产品约束，不能随 token 删除。 |
| P-06 | DB:280,291,349；T:159：上游方案/voice、冲突说明、standalone 推导、否决方向不复活 | PRESERVE / 原位 | 不引入新研究事实或恢复 REMOVED 方案。 |
| P-07 | DB:661,691；T:124：Packet 单一主输入、正文事实、MUST 决策/状态 | ADAPT / 同 Packet + page-context 引用 | 仅加已确认页上下文；要求与参考各有来源。 |
| P-08 | DB:104,603,649；G:2,141,159,187,202；input-modes:130：standalone/workflow 与 override | PRESERVE / 原位 | 无 PRD 不伪造 R/AE，不为单点交接强制全流程。 |
| P-09 | OD:55,64,78：chain/adhoc/recover；源缺失不创建空项目 | PRESERVE / 原位 | recover 跳过编译/页匹配/生成；未知目标不猜最近。 |
| P-10 | OD:106,130,134,140：桌面默认、headless opt-in、稳定 slug 的 stage→recover→handoff | PRESERVE / 原位 | stage 与生成完成分开；同目标可复用。 |
| P-11 | OD:106,121,130：设计系统选择及项目绑定 | ADAPT（S1）/ OD | 用户在外部工具配置；仅对明确提供/委托的 DS 校验绑定，不再无条件要求预选或本地 token。 |
| P-12 | OD:155,167；G:12：原请求最多一次重试，随后同 staged 项目桌面恢复；daemon-UP 错误仍属 OD | PRESERVE / 原位 | 不偷偷换本地生成器、不无限重试、不另建项目。 |
| P-13 | OD:121,134,180,191,198：多 DS 独立绑定、同目录回收/相对链接、导航≠真实原型、未收敛显式记录 | ADAPT / 原位 | 去 Figma 自动目标；保留多方案与非空真实产物完成门。 |
| P-14 | OD:207,219,242,267：用户控制迭代、首次/迭代统一回收、诚实 best-effort 追踪、slug/路径/风险 | PRESERVE / 原位 | 不把本地导出、mock、stage 当完成设计或实际导入。 |
| P-15 | UX:38,49,68,90,113,132：截图、场景/模块选择、串行模块、阻塞重试/跳过/停、总结后继续 | PRESERVE / 原位 | 无截图不评；用户模块选择与失败裁决保留。 |
| P-16 | UX:198,211,270；ux-audit/SCHEMA:23,48：A/B/C 权重、部分评分、跳过理由、严重性/位置/证据、C 基线与 P0 | ADAPT / 原位 | 去旧规范依赖，不去一般 UX；外部规范缺失不报合规，静态图不证明交互。 |
| P-17 | G:19,41,83,98,152：研究选择、一手数据链、工程 preset/HITL/工程路径 | PRESERVE / 原位 | 含 figma-layer 的数组只裁该节点，不删整条通用路径。 |
| P-18 | html-prototype / magicpath / figma-demo / muse-proto-gen / muse-loop 的通用 schema、QA、AC 判官 | PRESERVE 默认 / 原位或 B3 已证明等义 owner | 未逐行为分类则不删；skill 名称或同文件共处不是退役依据。 |
| P-19 | G:227 `html_or_demo_to_figma`，figma-layer 的 skill/command/alias/登记 | RETIRE（S8）/ 退役说明与拒绝测试 | 只退役 lucagstack 重建写入，不声明 OD 自带 Figma 能力已验证；历史产物不动。 |

### 活跃消费者边界（B4 修改前再按 exact diff 核对）

- 设计/交接：office/SKILL、office-wizard、auto、design-brief/SKILL/SCHEMA/README/output-templates、open-design、ux-audit/SKILL/SCHEMA/module-a-visual；通用规则按 P-01–P-18 保留。
- 退休调度：skill-routing-map、input-modes、optional-workflow-graph、model-routing、codex-viability、capability-parity、visibility/generated catalog、orchestrator、plan-agent、`.claude/commands/figma-layer.md` 与 `.agents/skills/figma-layer` alias。生成文件由对应生成器重建。
- 前置/验收：preflight-agent、quality-gate、routing-chain-check、check-routing-map、check-registration-sync、check-muse-loop-sync、check-quality-gates、verify-codex-wiring、verify.sh、相关 route-guard 测试；旧视觉检查替换，不整组删通用断言。
- 混合 reference：design-system-contract、html-prototype-tokens、interaction-mechanics、ai-native-state-coverage、ai-native-taste-anchors、ux-evaluation-framework、dev-handoff-dimensions。先迁移仍承重的状态/反馈/无障碍语义，再移除退休实现依赖。
- 保留历史：examples、历史报告、external-skills 推荐/评估、claude-md-appendix 历史正文、history.sh 查询。它们不作为活跃设计规范，不做全仓关键词清零。builder-constitution/semantic-dictionary 属现存消费者，不仅因路径为 references 就当历史删除。

### SF-002 治理路径 / 实测纠正

现有 `propose_semantic.py --supersedes` 只记录 metadata；`consolidate_memory.py --set-stable ID` 可精确批准，但 `--promote-ready` 和 `--archive-superseded` 为全队列操作（584、599、847 行）。根投影按 allowlist 精确 ID 读取；归档步骤本身不协调 allowlist 和投影。不能把“可记录 supersedes”报为“已证明能安全更正这一条”。

初查据此暂缓真实写入，但不能仅从缺少 exact-ID flag 推断 KILL-3。后续在显式 `MEMORY_ROOT=当前 checkout` 下只读实测：ready=0、conflicts=0、已有 superseded targets=0。内存模拟同 domain 的替代意图句，未批准不 ready；模拟批准后只有该候选 ready、duplicate/conflict 均为 0，现有 helper 的 dry-run 仅选该候选，未来归档目标仅 SF-002。**证据修正：本案可用现有 API，不需要改通用冲突/审核政策。** 模拟不代表真实候选已批准。

U-008 执行路径：最终候选文本经审核且明确 supersedes SF-002 → 精确批准 ID → 同一受控执行内检查 ready 集合仅该 ID，向既有 helper 传该精确条目 → 新事实晋升 → allowlist 的旧 ID 替换为新 ID并调用现有投影 writer → 确认归档集合仅 SF-002 后归档 → 核验受控事实、历史、allowlist 与根投影。不能先归档仍被 allowlist 指向的 SF-002。保留既有 CODE_ROOT/MEMORY_ROOT 和投影失败回滚；任何一步异常先恢复该步拥有的投影/白名单状态，不继续后继。

集合检查不是并发锁：真实治理采用单写者并检测文件版本；若存在其他 ready/归档目标或版本变化即停该步，不扩大处理。尚未提案、批准、晋升、归档或改 allowlist。KILL-3 继续有效：若 B4 最终文本/实际队列推翻本次证据，停止迁移，不能放宽冲突规则或改措辞绕门。B0 仅确认路径和义务，不宣告 B4 通过。

### 行为票单 v1（上限，不自动重跑）

原主线实际有效范围以 `/private/tmp/luca-agent-context-formal-audit.mjs` 的 26 格为证：Codex candidate 14 + baseline 4、Claude candidate 4 + baseline 4，已取 18 格（含真实 F10 FAIL），仍缺 Claude 的 F2/F3/F5/F9 双臂 8 格。旧报告最后的 168 是后续减法前口径，不再作为执行预算；所有旧轨迹保留。

本分支按风险分区冻结，不乘 5 次重复：

| 票 ID / 时点 | Harness / arm | 次数 | 目的与复用边界 |
|---|---|---|---|
| F13-page-handoff / B3 | Codex candidate | 1 | 需求同义页/区域、确认/拒绝/未答、OD 写入授权独立；实现前冻结请求与 schema。 |
| F14-flow-preservation / B3 | Codex candidate | 1 | recover、外部 DS、无截图 UX、通用状态/追踪不因旧链裁剪而丢失。 |
| 同 F13/F14 / B5 | Codex + Claude × baseline + candidate | 8 | 终版新鲜 A/B；旧版缺新能力标功能差异，不偷换安全评分。B3 两票不替代终版。 |
| F9-v2 / F10-v2 / B5 | Codex + Claude candidate | 4 | 已批准语义 delta 下只读/非强制母版、无 loader 与正常启动各一票。旧 F9/F10 预期和 FAIL 不追溯改分。 |

分支新增上限 14 个独立 CLI 进程；加主线仍缺 8 格，其中终版 Claude F9-v2 可占用原 candidate F9 的 **版本化替代义务** 1 格，共最多 21 个尚未运行的进程（不是 21 次重复同题）。这是预算，不是完成计数；基础设施失败/反例不追加求 PASS，关键失败停报。未受影响旧票只能按 owner/语义未变的书面依据复用。

复用 runner 的实际参数：`--root`、`--arm`、`--harness`、`--fixture`、`--trials 1`、`--concurrency 1`、`--output`、`--batch-id`；Claude 继续已校准 `--claude-model opus`。不使用 `--resume-valid`。F13/F14/F9-v2/F10-v2 为待实现 fixture ID，当前 runner 不支持，不提前运行；B3 前将请求/schema/评分和 exact 命令一同冻结并审查，绝不边跑边改变答案。

本地结构/状态机/安全 mutation 覆盖全量输入分区，不消耗上述 CLI 票。真实 OD 项目接收另列外部门：目标和材料未获确认则停在 B2，不以测试夹具代签用户、不把导出称为置入。

### B1 checkpoint / 外部门授权补充

- B1 preflight PASS：五个源可读、Node v22.23.1 与本地 playwright 可用；没有读取项目状态或运行旧项目 preamble。
- 当前文件所有权：主 Agent = catalog.json、runtime/page-context.md、计划与门禁记录；page_context_core = schema.json、page-context.mjs、test-page-context.mjs；external_design_plan_refute 已改派执行 = page-context-preview.mjs、test-page-context-preview.mjs，不再作为其本人实现的独立终验者。
- 初始目录五页、27 个区域；viewport 是源页预览尺寸，不是外部目标平台约束。移动列表只参考信息结构，不继承桌面布局。
- 用户先指定可用移动端列表测试项目，随后明确“我没有，你随便建一个”：授权 **B2 新建一个独立 OD 测试项目并写入本次测试交接材料**。不访问/修改现有 OD 项目，不切换 lucagstack pin，不创建下游仓库，不启动 headless 生成或 Figma 写入。
- B1 尚在实现，不能提前宣告页库/预览门通过。B2 仍须等 B1 窄门；新建项目使用唯一测试 slug 并记录返回 ID，不能猜“最近项目”。真实页面采用/位置确认不由创建授权代替。

## Replan R-2（用户收口指示：大逻辑正确、细节未丢后回主线）

来源：用户先明确“小逻辑可以后续调整”，随后明确“你看分支的大逻辑没问题，逻辑细节没丢。然后就可以主流程”。这是收口顺序调整，不是取消真实性或保护门。

- 不再打磨预览小交互、不新增验证批次。缩放/滚动框选在此指示前已有新鲜 PASS，保留证据；不能把尚未验证的入口默认为可用。
- B1 保留目录/实际预览/选择与必要隔离门。B2 必须接入真实消费合同；B3 以本地分支行为测试和独立 S9 保留审查过删除前门，不另跑两票过渡版付费 Harness。B4 只按已批准边界退役并同步承重消费者。
- B5 收口为“现有 flow 可达、S9 通用逻辑未丢、局部行为与安全守卫有效”的本地检查及独立裁决，然后 B6 立即返回主线 P6。分支不单独等待最终重型 A/B，也不单独宣称整体 DONE。
- 原 B5 终版双 Harness F13/F14、F9-v2/F10-v2 及最终 mutation/冷启动反证转为**主线 P6 的未完成验收**，不取消、不重复计票；任何实质安全/忠实性反例仍须停报。因取消 B3 两个过渡版进程，后续进程上限从 21 降为 **19**，不是新增 19 次任务。
- 外部接收仍必须实测才可声称“已置入 OD”；若真人页面采用或接口证据尚缺，将该项准确带回主线，不把本地包/mock 当外部接通。已授权的独立移动列表 OD 测试仍在范围内，不因此获得 headless/Figma 权限。

本节覆盖 §6–7 中分支返回之前的重型票序，其他用户决定、B0–B4 先替代后删除、K1–K10/S9 和发布条件不变。

## Replan R-3（仅高置信推荐，低置信直达需求交接）

用户明确：高置信度才推荐；低置信度不推荐，可询问用户有没有参考页，也可不推荐直接把需求给 OD。已同步 §1–3 与唯一运行合同 `runtime/page-context.md`。词面召回只供内部判断，不作为用户推荐结果。

验收增量：①低置信不展示/不附页；②可选询问不阻塞 reference=none 交接；③高置信推荐仍待采用确认；④用户显式指定有效页优先；⑤原 OD 目标/写入权和需求状态追踪仍保留。后续 F13 用该语义冻结，不重新使用旧“弱候选交用户选”的期望。

当前 B1-core 独立局部复审出现 Important：目录把 filters 的 parent_id 伪设为 pagination 时仍可通过选择校验；父子关系真实性未被检查覆盖。主 Agent 只在内存复现并观察到 confirmed，未改真实目录。该项不是高置信策略变更导致，先停在 B1，不推进 B2/删除/发布。裁决原文见 `2026-09-05-page-library-b1-core-verdict.json`，已由 recorder 落账（SHA `e5b87346e6ea00f1242ff6cd176ea202805cd21fbfad4ac6bd59170a8baaac90`）。预览子项已完成现有测试，主 Agent 已目视五页并核对27个矩形；不能以这些 PASS 抹去该局部反例。

## Replan R-4（用户明确跳过页库剩余验收，进入 B2）

用户原话：“页面库不用验收了，继续下面”。据此结束 B1 的验收循环，状态是 DONE_WITH_CONCERNS/USER_WAIVED，不改独立原分、不再修或加测页库。

保留证据：第一轮父子包含漏检已修；第二轮 B1 9/10，verdict=`2026-09-05-page-library-b1-verdict-02.json`，eval_run_id=`br-page-b1-20260905-02`。主 Agent 已新鲜执行 core/preview 两套 mutation、validate 与 diff 检查，均 exit 0；独立 Chromium 反例说明新增 SVG/HTML 混合源可被静态包含校验误判。现有五页未受影响。原 verdict 已落账 SHA=`2cab15672e1fc42b6c5a39ce5d68755ddc20086b6acc2e6ac7dbce2cf6b0f8d9`。

已知限制跟随交付：新登记页面的父子关系不能只凭当前静态校验宣告正确；本次不宣传“任意 HTML 解析已完美验证”。用户跳过的是页库剩余验收，不授权错误页面自动采用、外部写入、改变高置信规则或削弱 NO_PIN/只读保护。

B2 的映射切换必须同批更新真正消费者，不能只改第7节造成失联。精确文件分工：
- DB owner：design-brief/SKILL.md、SCHEMA.md、README.md、references/output-templates.md。
- 消费者 owner：html-prototype/SKILL.md、SCHEMA.md；tech-spec/SKILL.md；task-plan/SKILL.md；magicpath/SKILL.md；redteam/SKILL.md（均位于 `.claude/skills/office/`）。只迁移技术映射消费为语义位置/D/STATE/AC，其他通用流程不变。
- 主 Agent：open-design/SKILL.md、input-modes.yaml、optional-workflow-graph.yaml、quality-gate.md，以及必要的交接脚本/测试；生成登记在单写者同步时重建。

本步验收只验证消费合同与交接逻辑；真实 OD 接收、最终双 Harness/反证按 R-2 带回主线，未实测不得报外部已接通。先等义迁移、后按 B3/B4 退役旧专属消费，继续保持 S9 保留矩阵。

## B2 执行 checkpoint（2026-09-05；双会话分工）

用户明确：新 session 负责主线，本 session 只继续分支，由用户传递依赖。主线临时 handoff：
`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-handoff-20260905-174414.md`。
本分支不改 `scripts/run-agent-context-ab.mjs`、原主线 A/B 报告/raw；主线可先准备 fixture/scorer，
分支释放前不同时修改根/路由/技能/生成物/受控事实及共同验证接线，不冻结终版候选或发布。

- DB 四文件与六个实际消费者已完成 B2 迁移：`page_interaction_mapping` / §7「页面与交互位置映射」。
  `output_target_platform_scope` 替代旧母版字段门；HTML 可消费新平台/范围字段，reference=none 不误阻断。
- OD 入口已接唯一 page-context 步骤、外部 DS 用户配置、明确目标/授权、同包材料与真实读回；
  recover 不再猜最近项目。EXPORTED/STAGED/真实原型回收区分；未操作真实 OD。
- 新 `scripts/design-flow-handoff.mjs` 与 `scripts/test-design-flow-handoff.mjs`：正文逐字运输，
  `page-reference.json` 始终携带来源/无参考或确认上下文，确认时附真实 PNG 字节与位置。
  新确认不反写已 gated DB 正文、不变更源 hash；caller 仍须核对真人与真实外部响应。
- 主 Agent 新鲜执行 helper `--mutation`：六组行为、四个真实守卫 mutation 通过；
  另做语法检查、仓库 skill 结构检查、两 YAML 解析与 diff 检查。未把这些报为模型行为或 OD 接通。
  中途正好观察到新增 slug 断言的 TDD RED，安全 slug 实现完成冻结后主 Agent 全量重跑通过；非被隐藏的终版验收失败。
- 受保护 retrieval-log 哈希仍为 §0 值；未修改 framework、项目别名、下游或原主线 runner/raw。
- B2 剩余接线门：MagicPath Codex metadata 仍绑定旧 gate digest；仓内现有 semantic-projection
  只有读/计算/检查，无写入入口。补专用窄同步脚本与测试，复用原算法、只更新固定目标的 digest，
  不修改官方 skill 正文、不手算/手改生成缓存。此消费同步完成后再判 B2，不提前进 B3。
- B3/B4 待做：UX 旧规范依赖替换、独立 S9 删除前审查、figma-layer 退役、活跃旧依赖裁剪、
  受控 SF-002 与根/登记同步。旧 `shared-refs` 保护元数据和 HTML 品牌 QA 尚未在 B2 冒充清除。
  `check-quality-gates.mjs` 默认会读共享项目表面；在 NO_PIN 安全入口修正前不直接运行它。

## B2 窄门关闭 / B3 准入（2026-09-05）

- 主 Agent 完整读回冻结的 MagicPath 窄同步脚本及测试，新鲜执行测试九组 PASS、两个语法检查 PASS。
- 获运行时授权后执行固定目标 `sync-magicpath-projection.mjs --write`；实际 diff 仅 Codex MagicPath metadata 的摘要值，正文未变。
- 写后 `--check` PASS：`sha256:3853710b27d700a65432037c221cd6b161f9f9e557f891f3edaa8f226f8d2931`。
  `check-capability-parity.mjs` PASS：133 anchors、44 shared projections、1 delegated projection。
- 联同前一 checkpoint 的交接六组行为/四个 guard mutation，B2 本地消费接线门关闭。
  这不证明真实 OD 导入、生成或模型行为；这些仍按 R-2/R-4 交回主线。
- B3 精确写集合：ux-audit/SKILL.md、SCHEMA.md、specialists/module-a-visual.md、specialists/module-b-interaction.md、redteam/SKILL.md。
  由独立 reviewer 检查 S9/P-01–P-18；在 B3 删除前门通过之前，B4 只做只读输入预检，不实施退役。
- 本 session 继续分支；不编辑主线 runner、fixture、原始 A/B 证据、主线 P6 准备文件，不发布。

## B3 关键门停报 checkpoint（2026-09-05）

- 独立 Spec 保留审查 FAIL（8/10；8 PASS、1 Important FAIL、1 后续外部证据 UNKNOWN）。
  原 envelope：`2026-09-05-page-library-b3-preservation-spec-01.json`，eval_run_id=`br-page-b3-preservation-spec-20260905-01`。
  需求稳定 ID、八字段决策、十二态、AI 授权/接管/否决、standalone/workflow、Packet、OD 桌面/headless/recover/多方案与工程门已有逐项保留证据；不能据此覆盖一个活跃路由冲突。
- 真实冲突：`optional-workflow-graph.yaml:6–11` 仍允许 daemon 不可达/non-react 自动切本地工具，
  与 `open-design/SKILL.md:49,71` 的用户改选门不一致。主 Agent 已读回确认；未修改图求绿，未推进 B4 删除。
  恢复时修复该 exact fallback 消费闭环（graph 及真实读取该规则的路由/计划指针），保留独立本地能力与同项目桌面 recovery，再发回同一 reviewer 做终版闭合。
- UX worker 因模型容量失败中止，已落部分 module-a/module-b 修改，主合同/SCHEMA 尚未完成。
  这些是未验收的工作中改动，保留而不宣布完成；恢复时主 Agent 接手五文件，无需重跑 B1。
- B4 只读预检另发现：`propose_semantic.py:56–105` 的 ID 分配会扫描两个已知 checkout，
  即使显式 MEMORY_ROOT 也不会限制该扫描。本次没有执行 propose/next_id 或跨读另一记忆库。
  在当前禁止跨作用域约束下，SF-002 实际治理前必须先解决精确 ID 分配权限/现有安全入口，不能照旧计划直接运行。
- 本阶段停止后继修改、删除及发布；仍未改 framework/、项目状态、下游或检索日志。最终双 Harness 与真实 OD 接收仍属主线未完成门。
- 记录异常（如实保留）：主 Agent 调用 `record_eval.py --verdict-file` 时漏显式 MEMORY_ROOT，
  工具回报把上述 eval_run_id 追加到 `/Users/luca/Desktop/luca_gstack/memory/evals/eval-log.jsonl`，
  envelope SHA=`23a93e04935524210de2ed47daf9423880c4211da00dcf9d45aaaa692fea7de9`。
  这是超出本次 checkout 的意外记录写入；未继续读取、删除或回退该外部日志。当前 checkout 的 verdict JSON 已保存，
  但不能宣称已正确落入当前 checkout 的 eval-log。若用户批准纠正，只针对该 run_id/内容哈希核验，保留全部其他记录。
  后续所有记忆脚本显式绑定当前 checkout；不能靠 cwd 推断默认 store。

## 接续 checkpoint（2026-09-05，原 session 01a06adf）

- 用户已确认按 B3→B4→B5→B6 接续分支。HEAD 仍为 94f086233affb3bd08ad8fe33063bcfedb330edf；恢复前哈希清单 `/private/tmp/br-page-resume-20260905-before.json`，retrieval-log 与原保护值一致。
- B3 路由最终独立复审 CONDITIONAL_PASS（5/7），原文 `2026-09-05-page-library-b3-route-resume-01.json`。本地 `test-design-tool-routing.mjs` 两组合同、四个 mutation 新鲜 PASS。UX 独立票 `2026-09-05-page-library-b3-ux-standards-01.json` 为 CONDITIONAL_PASS（16/17）。原 FAIL 留存，不重写。
- B4 必修消费者：muse-loop Phase 3 仍无条件要求预选 Design system；随旧 FxUI 消费迁移取消此强制，保留平台/目标确认和明确委托的 DS 校验。
- 原误写日志已由原 session 在用户“继续”授权后纠正，备份为 `2026-09-05-page-library-misrecorded-eval-backup.json`；本次不重复撤销。
- 按 R-2 保留真实 Harness、OD 接收与完整生命周期验证为主线未完成项。B4 不回到页库验收循环，不改主线 runner/raw/fixture/P6 准备文件，不独立发布。
- SF-002 的跨检出编号扫描仍待精确读取授权；已询问仅两份 semantic 文件只读，未得到答复前不执行分配或迁移。

## B4–B6 接续收口（2026-09-05；覆盖上方进行中断点）

- U-007：figma-layer 的 skill/command/Codex alias/语义路由/graph/input/model/viability/catalog/self-model 已退役。真实 dry-run 暴露显式 /$ 调用仍无条件 dispatch；只对该退役名补 STOP，现有其他 direct 能力保持。实际 hook 删除 guard→精确 FAIL→恢复 PASS，见 `scripts/test-design-tool-retirement.mjs --mutation`。
- U-008：office、各实际生成/交接消费者和七份混合 references 已去旧视觉值、技术映射与母版强制；状态、控制权、需求/决策/AC、范围、UX 权重和工程 Human Gate 保留。独立复核分别发现 Builder 数值门和 CMP owner 残留，均修复后复审；原 FAIL 原文与分数保留。
- SF-002：用户在此前两份框架编号源只读询问后本次回复“继续”，按该精确范围执行既有 allocator；没有外部写入。替代文本获独立 PASS，通过现有候选→精确 set-stable→promotion_ready→精确 helper→allowlist→双根 writer→旧事实归档完成。新 ID `SC-20260905-001`，仅归档 SF-002。事务收据 `2026-09-05-page-library-sf002-migration.json`；变更前备份 `/private/tmp/br-page-sf002-before-20260905`。每阶段检查版本与精确集合；未放宽冲突/晋升策略。独立复核只证明当前状态一致，不把它称为全过程回滚测试。
- NO_PIN：quality checker 默认框架模式，精确 handoff 与已验证 session 模式分开；verify 不再直接访问共享别名，project-routing 检查改临时夹具。新 scope 回归含真实违规读取拒绝与恢复。缺外部视觉规范标 N/A/UNKNOWN，一般 QA 继续；有实际规则时逐条检查且无效输入失败。
- U-009：新鲜全量 verify 为 90 PASS / 1 FAIL / 0 WARN，唯一 S20 是活动样例仍期待已退休 skill。按 S8 将该样例版本化 v2=STOP，保留原行注释及原 69/70 FAIL 日志；评分器与零容忍不变。定向重验 70/70 PASS，独立 delta 审查 PASS 1/1。未把定向恢复伪称又跑了一轮全量 verify。
- 独立最终票：`2026-09-05-page-library-b4-preservation-02.json` CONDITIONAL_PASS 9/10（剩余真实 OD/Harness UNKNOWN）；`2026-09-05-page-library-b4-refs-02.json` PASS 7/7；`2026-09-05-page-library-b5-keyword-01.json` PASS 1/1。五张新旧票均以显式 MEMORY_ROOT 记入本 checkout eval-log。两位 reviewer 未为自己编写的消费者投独立票。
- 其他新鲜证据：K1–K10 与 Static Fallback/rollback/staged-index mutation、capability parity（133 anchors / 43 shared / 1 delegated）、registration（32 visible）、七态/motion anchors、handoff 六组行为与四个 guard mutation、实际 Chromium 规范与一般 QA/Demo 控制检查均通过。完整日志与当前 dirty runtime 哈希收据为 `2026-09-05-page-library-b5-validation.json`，其中含原主线继承改动，不能当本分支所有权清单或正式 Harness context hash。
- 保护核对：HEAD 不变、index 为空；五页源、retrieval-log、主线 runner/branch fixtures 哈希与恢复快照一致。没有改页库或进行新验收、没有外部 OD/Figma 操作、没有独立提交/推送。普通 diff-check 只提示按原字节归档 SF-002 的末尾空行；关闭 blank-at-eof 检查后其余 diff PASS，归档未为消警改写。
- U-010：本地分支工作剩余 0，按 R-2 释放根/路由/skills/生成面给主线，返回原 P6。主线仍需冻结终版 context/fixture/evaluator 与复用依据、剩余真实双 Harness 票（原 19 进程上限不是已运行数）、真实 OD 材料读回、根预算与最终安全反证/verify/选择性发布。页库已知 SVG 混合源限制及 USER_WAIVED 继续随交付；不得把本分支票算作外部实测或整体 DONE。

## Replan R-5（2026-09-05；整体复核后的两项修复）

用户授权：“那你就全部都解决完以后告诉我完成，然后我交给主 session 去提交。”
本 delta 修复 overall-review 的 Standards Minor 和 Spec Important；此前“分支剩余 0”由本段纠正。
模式为 Sequential Chain：主 Agent 实施，完成后按 R4 独立双轴复核；既有主线实测分工和页库豁免不变。
已确认缺陷与既有治理 helper 有成熟实现，不触发复杂且新颖研究门。不提交、不推送。

1. R5-A（core-execution，DONE）：修复 page-context 的 stdin library import，补入现有 handoff 回归。
   Source: overall-review Standards Minor。断言：标准输入/-e/文件调用正常；CLI 仍执行；恢复旧 guard 时回归精确失败。
2. R5-B（core-execution，DONE）：迁移 active 母版规则及 stable 旧视觉/figma-layer 指令。
   Source: overall-review Spec Important / 原 S2、S8。通过 observation 和 candidate/review/promotion/archive
   现有受控流程，精确保留通用 DRY、内容模板与不擅设母版规则；不改治理算法或无关记忆。
   断言：实际 get_rules 与纯 semantic search 不恢复旧依赖；只晋升/归档选定 ID；保护内容及日志不漂移。
3. R5-C（reasoning-heavy 判定，DONE）：针对性测试、记忆测试、全量 verify 与独立 Standards/Spec 终版闭合；
   报告和主线交接更新只引用本次最终版本，历史 FAIL 不覆盖。

执行断言（所有写入前保存本轮快照；新回归在修复前先观察失败）：
```bash
# [BLOCKING] R5-A — 交接行为与实际守卫 mutation（含 stdin 导入回归）
node scripts/test-design-flow-handoff.mjs --mutation
# [BLOCKING] R5-B — 记忆系统回归（独立临时 store）
MEMORY_ROOT="$PWD" python3 memory/tests/test_memory_system.py
# [BLOCKING] R5-C — 框架全量验证
MEMORY_ROOT="$PWD" AGENT_CONTEXT_CODE_ROOT="$PWD" bash scripts/verify.sh
```
另对 R5-B 的实际 active lookup/search、精确迁移集合和归档原字节进行本轮收据验证。
R5-C 回归落点：新增 `scripts/test-design-context-retirement.py` 调用实际 reader/search（不写检索日志），
以临时副本恢复旧规则/旧事实证明检查会失败；与 handoff suite 一同接入 package、verify 与 CI，
防止本次两个缺陷再次落在全量验证范围之外。这是两项已确认缺陷的回归接线，不重做其他页库验收。
R5-B 同根因补齐：终版 Spec 实际查询仍命中 `SF-001` 的“brand-tokens.md 权威源”旧断言。
该条虽未在最初两 ID 中，也属于用户授权的退役依赖迁移；经相同内容审查/候选/批准/晋升/归档流程
替代为历史记录指针和当前设计系统权威说明，原 CRM 样例数据逐字归档，Static Fallback allowlist 不变。
将 SF-001 加入实际查询与旧数据恢复回归，刷新冻结版本后再闭合两轴；不以人为缩小范围遗留已知矛盾。
criteria: C1 导入入口可用且 CLI 语义保留；C2 活动规则/记忆不再注入退役约束；
C3 通用规范及无关工作保留；C4 受控晋升链完整；C5 两轴独立闭合且无伪造外部实测。

### R5 最终 checkpoint

- Standards PASS（0 findings），Spec PASS（10/10）；两轴对最终 12 文件版本独立核验。
- 最新全量 verify 93 PASS / 0 FAIL / 0 WARN；记忆 54 tests PASS；handoff 7 行为/5 mutation
  在 Node 20.20.2、22.23.1 通过；active-context 3 tests 覆盖旧规则及三条旧记忆恢复反证。
- C1–C5 均 PASS，证据详见 `2026-09-05-page-library-r5-closure.md` 与
  `2026-09-05-page-library-r5-validation.json`。旧 overall-review 和 FAIL 证据保留。
- 本轮 1 Important、1 Minor 及同源 SF-001 遗漏全部关闭。两条原候选和 SF-001 替代经既有治理链
  形成 SC-20260905-002/003/004；旧事实原字节归档，其他 86 条事实不变；旧规则正文保留为 superseded。
- 当前 R5 validation 取代 B5 的工作区 hash，主线须按当前版本重新核对证据身份与复用依据。
  本次无暂存、提交、推送或额外外部效果；主线 P6、真实双 Harness/OD、预算/发布门与页库豁免原样保留。

<!-- FILE_END: BR-PAGE-HANDOFF-PLAN -->
