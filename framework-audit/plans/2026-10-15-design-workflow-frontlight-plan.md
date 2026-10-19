# 设计流程前半段轻量化：以最终界面和交互为验收对象

> 入库说明（2026-10-19，Claude 整体评估时导入）：本文件此前只存在于 Codex 临时 worktree，从未进入任何分支；R1 版仅在 `refs/codex/snapshots/` 下的快照提交 `b72f753` 中。正文按原样导入，仅把本机绝对路径改为仓库相对路径。评估结论见 `framework-audit/2026-10-19-frontlight-plan-to-delivery-review.md`。


计划 ID：`frontlight-20261015`。基线：`d0c33fa38706e847869b78bc40f655d085f370e4`。日期：2026-10-15。

**当前修订：R1，2026-10-16。请先读 §8。** §1–7 保留原方案及其历史取舍；R1 补全“研究为何没有改善设计”的诊断和转化机制，并明确替换旧试验、收益判据及实施顺序。旧评审票仅覆盖旧 SHA，不覆盖本修订。

本文件是改造计划，不是改造完成报告。范围为四项 skill 及必要的路由、交接、design-brief 输入合同；不实施业务项目、不安装第三方 skill、不更换生成工具。当前为 NO_PIN 框架工作。实施状态：PLANNED。

## 1. 判断、目标与现状证据

问题值得解决：用户实际体验到前期耗时、耗 token，最终 UI/交互却没有比原始需求直达 design-brief 更好。研究和发散的价值应来自：改变一个有后果的决策、发现遗漏风险，或为该决策提供必要的可信依据。文档长度、代理数量和讨论轮数都不是价值本身。

更小的替代已经存在：design-brief 支持原始需求、已有方案和现有原型直接进入。因此不新建总控 skill；首先让成熟资料走已有入口，其余任务只补真正缺失的证据或取舍。直接入口是对照组，也是可能的最终优胜方案。

用户确认的成功标准：质量优于旧完整链，至少不输原始需求直达 Brief；前段至 Brief 的时间、token 目标均降低至少 50%；不达验收门不切默认。新产品和已有功能都要覆盖。真实案例由用户之后指定，本次交付方案和独立评审。

| 已核验的结构 | 对体验的含义 | 尚未证实的部分 |
|---|---|---|
| deepresearch 固定 5–8 个研究角色，中档仍保留维度，并有独立审查 | 降档未必删除多少工作 | 这些工作在用户实际案例中的耗时占比 |
| ux-research 固定六维；非 AI 题目仍处理 AI/未来等维度 | 研究可能超出当前决策所需 | 哪些维度真正改善了最终设计 |
| 两项 brainstorm 即使轻档也有三角色扫描及独立 Oracle | 小任务依然有较高启动成本 | 扫描与审查各自的边际收益 |
| 新产品、混合范围倾向升档；UX 发散含强制 AI 范式要求 | 范围大小与研究投入耦合，可能引入原需求没有的问题 | 用户失败案例是否因此发生偏题 |
| Brief 已允许原始需求直达；pipeline 仍需读所选 PRD、方案和 handoff | 前序文档可能增加 Brief 的阅读与消歧成本 | 上下文噪声是否为效果下降的主因 |
| 当前静态合同检查 240/240 PASS，明确标注 STATIC_ONLY_NOT_NATIVE | 防漏项合同正常不等于真实设计好用 | 尚无本次真实界面 A/B/C 结果 |

上述是结构证据与待验证假设的区分，不以结构推算节省百分比。

**KILL-1：** 若压缩后关键风险、原始需求或任务质量退步，则不得推广该轻量机制。
**KILL-2：** 若把 Brief、审查、返工和人力负担计入后仍无收益，则停止该优化方向，定位真实瓶颈。
**KILL-3：** 若直接 Brief 支配轻量链，则采用直接路径，不为保留四项 skill 的出场率强推新链。

## 2. 全链节点各自应该解决什么

现有可选完整路径为：原始需求 → 可选 idea → deepresearch → brainstorm → ux-research → ux-brainstorm → design-brief → 实际设计生成工具 → 原型验收。已有功能和改版也支持从 ux-audit 直接接 Brief。图是可选流程，不应把全部节点变成每次必经步骤。

| 节点 | 核心问题与交付 | 何时需要 |
|---|---|---|
| idea | 把散乱原话整理为可理解的需求，保留出处 | 原始表达确实难以承接；不是 brainstorm 前置 |
| deepresearch | 领域事实、技术可行性和关键假设有哪些可靠证据 | 缺事实，且答案会改变产品决定 |
| brainstorm | 为谁解决什么、做什么、不做什么，形成选定方向与 PRD | 产品范围或价值取舍尚未确定 |
| ux-research | 用户行为、竞品先例、交互机制有哪些可用证据及边界 | 交互问题确实缺依据；不重复领域综述 |
| ux-brainstorm | 用户怎样完成任务，信息架构和交互机制如何选择 | 主路径或机制仍存在实质分歧 |
| design-brief | 把已确认意图转成设计决策、状态、语义位置和验收条件，冻结 Generation Packet | 所有正式生成交接的收敛点；可直接接原始需求 |
| design-output / 实际 adapter | 继承或确认工具；由 Open Design、Claude Design 等实际工具生成界面 | 薄入口不另造一个 DONE；工具选择沿用用户授权 |
| 原型验收 | 实际完成任务、检查状态/恢复路径、判断视觉与交互 | 验收最终结果，不以文档漂亮替代 |
| tech-spec → task-plan → implement | 把已验证设计变为工程合同、任务与实现 | 只有继续工程交付时进入，本次不改其门禁 |

条件分支同样保留：ux-audit 查现有页面；code-recon 查现有代码；insight-synthesis 综合用户提供的一手材料；research-kit 设计采集工具并等待真实采集；ux-writing 处理内容；challenge 处理范围挑战。它们按缺口进入，不再排成附加必经队列。

新的体验是先判断一个问题：**当前究竟缺事实、缺产品取舍、缺交互取舍，还是已经可以生成？** 四个节点都可独立调用；一次任务可以全跳过、只用一个，也可以在证据需要时组合。明确选过的旧完整流程继续兼容。

## 3. 外部对标：吸收机制，不整包搬入

已实际读取以下 GitHub 源码并固定版本，不按 stars 或宣传文案排名。它们不能证明本仓改造必然有效，只能提供可检验的机制候选。

| 一手来源与固定版本 | 有价值的机制 | 对本方案的采用 / 不采用 |
|---|---|---|
| [mattpocock research，49dd158](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/research/SKILL.md) | 一个后台研究者、优先原始来源、结论带引用 | 用于窄问题取证；本仓 quick-research 已有类似能力，不再新造第五个 skill；不以它替代产品判断 |
| [obra/superpowers brainstorming，bb92a77](https://github.com/obra/superpowers/blob/bb92a77741419a4ab5f06e711a283343f1ada0c3/skills/brainstorming/SKILL.md) | 识别已有答案、按任务大小工作、按需显示比较和视觉探索 | 采用智能跳过和适量探索；不复制完整审批、写计划与实现链 |
| [phuryn prioritize-assumptions，c68487d](https://github.com/phuryn/pm-skills/blob/c68487d721e419ec87af1ae6412a842978eab785/pm-product-discovery/skills/prioritize-assumptions/SKILL.md)；[实验设计](https://github.com/phuryn/pm-skills/blob/c68487d721e419ec87af1ae6412a842978eab785/pm-product-discovery/skills/brainstorm-experiments-existing/SKILL.md) | 优先验证高影响、高不确定假设，用最小实验观察行为 | 每次研究绑定决定和可观察结果；不引入没有数据基础的精确评分 |
| [garrytan/gstack builder brainstorm，47d639a](https://github.com/garrytan/gstack/blob/47d639abffa882b8cbb641d7d1dedf08ecada9ec/office-hours/sections/phase-2b-builder-brainstorm.md.tmpl)；[design review](https://github.com/garrytan/gstack/blob/47d639abffa882b8cbb641d7d1dedf08ecada9ec/plan-design-review/sections/review-sections.md.tmpl) | 跳过已答问题、尽早形成可展示物；关注 IA、用户旅程、状态和设计系统 | 吸收任务与视觉证据；不复制其完整七轮评审和逐问题打扰 |

[Anthropic 多代理研究实践](https://www.anthropic.com/engineering/multi-agent-research-system)同时支持双方：多代理适合可独立展开的宽问题，也有显著成本，应按复杂度分配投入。其成本数据不能当作本仓节省估算。[上下文工程实践](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)支持保留高信号上下文、按需检索；它不证明用户此次失败就是上下文过长造成的。

工具与证据对应关系：`rg`、源码读取和 Git 用于还原真实合同与版本；GitHub connector / Web 读取上述一手原文；现有测试用于合同回归；实际宿主 trace 用于节点、token 和时间计量；用户所选生成器配合浏览器真实操作、截图和录屏验证界面；用户匿名比较与独立 quality-gate 分别判断设计偏好及任务正确性。联网遵循已读取的 web-access 来源核验要求，不安装被比较的 skill。

## 4. 具体改造设计

### 4.1 研究：围绕未决问题组织，而非固定角色组织

deepresearch 与 ux-research 的 `research_depth` 增加 `focused`，历史 `moderate` / `deep` 保持兼容。候选阶段仅显式试用，通过后才调整适配任务的默认行为。

focused 每次处理 1–3 个会改变决定的问题；一个研究者，无固定维度、来源篇数或 findings 数量下限。先复用已有可信资料。初始试验预算为检索与全文读取合计 8 项调用，批量逐项计；用户明确预算优先。8 是待实验的起始上限，不是研究充分性的标准。

每个关键假设都尝试寻找反证，记录证据来源、独立性、迁移边界及剩余未知。官网可单源证明其自身规格，不能单源推出用户行为或产品效果。focused 置信判断依据独立原始证据，不复用按代理票数计算的共识等级；旧深档的历史解释不改写。

独立审查聚焦会改变决定的单源、未知、冲突和风险结论。到预算上限时：已足够支持决定则结束；关键问题仍未解决则说明具体缺口和下一次投入价值，使用已有有效授权或请求必要决定；不可把“查满预算”写成结论成立。关键一手用户证据缺失时转真实采集，不用网上竞品材料代证。

### 4.2 发散：范围完整，不等于投入固定

brainstorm 与 ux-brainstorm 将产物 `scope` 与探索投入 `discovery_mode=focused|full` 分开。新产品仍能产产品级 PRD，但 new / mixed 标签本身不再强制三代理扫描。

focused 由主 Agent 扫描原始需求、假设和缺口；只询问尚未回答、会改变结果的问题。已有明确方向不制造备选；确有取舍时先给两个机制不同的方案，第三个只在有独立价值时加入。每个实际调用的 brainstorm 仍保留独立 Oracle，取消的是固定扫描开销，不是独立纠错。

非 AI 需求不强塞 AI 范式或信任架构；已做过的 AI 判断直接继承。UX 输出仍覆盖选定旅程、关键分支与交互架构，PRD 仍遵守已有稳定 ID 和必要字段，不将短文档视为唯一目标。

陌生核心机制、相互矛盾的行为证据、多角色高后果权限、不可逆交互及关键一手未知，必须触发具名问题的深入与独立检查；未解决前不得宣称 ready。能局部补证就局部补证；只有现有问题框架不足时才提出 full，并保留人的取舍权。明确选择 full 的请求继续照旧。

### 4.3 交接与 Brief：保留原意，避免再加工污染

在现有 handoff 内保留短决策记录：原始输入的精确来源/版本、已确认取舍、关键证据及适用边界、未决项。证据去向复用已有 coverage matrix，不增加第二张矩阵或通用 schema。

Brief 仍完整读取其合同要求的当前 PRD、选定方案及 handoff；压缩非必要叙述，不用“冷索引”绕过必读。历史全文按需追溯，节省是否成立由实际输入 token 决定。研究建议没有被用户或已确认方案采纳，不得变成 MUST。

设计决策 D、状态 STATE、语义位置、验收 AC 和冻结 Packet 继续由 Brief 维护。上游不再重复生产这些规格，不因轻量化丢掉适用状态、异常恢复和需求覆盖。只增加上述输入模式及可选决策记录，不新增工程 API、运行调度器或状态系统。

### 4.4 一次性实施顺序

执行方式：Sequential + Supervisor，Standard 规模；一个写 owner 串行修改，独立原生 quality-gate 验证。交互型 skill 在主会话运行；非交互研究独立运行。模型继承当前授权角色，不硬编码模型名。此次专家会审不变成用户每次设计的常规步骤。

| 单元与来源 | 工作 / 所有权 | 产出与阶段门 |
|---|---|---|
| U-001，inline:「捋清楚这个workflow的所有节点干什么」 | 主 Agent 固定旧合同、候选适用条件、语义回放样本；用户之后指定四个案例与实际工具 | 基线清单、预注册判据、每例节点/档位/预计删除工作；数据和比较规则齐备才能进真实试验 |
| U-002，inline:「轻量化我前面的这些…让体验轻」 | 一个 worker 负责四 skill 本体及直接引用模板；按真实引用同步输入模式源、路由图、计划指引、评审合同与生成视图；独立 quality-gate 检查 | 显式 opt-in 候选；旧 full 与历史输入保持兼容；不改无关调度、权限和工程门禁 |
| U-003，inline:「产出物给desigen brief以后产出效果还不好」 | 主 Agent 顺序跑候选与对照；非交互研究按 skill 执行，交互节点留主会话；独立评审真实原型 | 隔离上下文的运行记录、实际页面及盲评结果；合同与行为回放通过后才生成真实对照 |
| U-004，inline:「以价值导向和第一性原理出发」 | 主 Agent 按冻结规则作采用/保留试验/回退决定；独立 quality-gate 核对证据 | 明确结论及适用范围；只有质量、成本、兼容门全通过才限定推广 |

四单元均为 PLANNED，依赖 U-001 → U-002 → U-003 → U-004。U-001/002/004 为 task_execution；U-003 展开为各实际 skill 的 skill_execution 子阶段，真实案例、项目授权与用户所选 adapter 是其前置输入。没有可核验工具选择时保持 NEEDS_CONTEXT，不代选。实施不包含 commit、push、发布或安装。正式实施前绑定本计划的最终版本和范围；本次只是产出计划。

框架侧实验记录集中在 `framework-audit/design-workflow-frontlight/`，复用现有日志格式，每案例一行总量及运行引用，不建评测平台。业务原型按后续已授权项目/工具的精确产物引用记录，不读写共享项目别名。

## 5. 如何证明“确实更好”

### 合同与行为检查

既有回归使用 `node scripts/test-design-workflow-contract.mjs`、`node scripts/test-design-tool-routing.mjs`、`python3 scripts/build-agent-context.py check`。因新合同而失效的固定角色数断言应改为验证目标行为，不能仅删到全绿。

在 Codex 与 Claude 各自做真实语义回放：成熟需求直达；新产品不因标签强制 fan-out；缺事实只调研究；缺交互取舍只调 UX 发散；非 AI 不强制 AI；关键未知阻塞；明确 deep/full 不降档；历史 handoff 可读；Brief 不丢 MUST/状态且不将建议升格。静态通过不等于宿主行为一致。抽查故意恢复“new 就升档”、丢 MUST、将建议升 MUST 时测试是否失败；不能只验证文本出现。

### 四个真实案例的受控对照

- 用户之后选 2 个新产品、2 个已有功能；同时覆盖 2 个成熟问题、2 个高不确定问题。先导 2 例与保留 2 例各含一个成熟、一个高不确定案例。保留题在候选冻结后运行，不用其结果调提示词。
- 先导跑 A 旧完整链、B 原始需求直达 Brief、C 新路径；保留题跑 B/C，共 10 份初始输出。每例先登记 C 实际走哪些节点、档位和删除的工作；没进入候选机制就不算该机制已覆盖。
- 每例各臂使用相同原始资料、用户已有答案、生成器/模型、设计系统、模板与设置；独立上下文，匿名随机展示。不把不同生成器结果混为同条件。
- 生成前冻结 MUST、关键任务及恢复场景、2–3 个视觉锚点。功能评审实际操作；用户盲选视觉和交互“较好 / 相当 / 较差 / 无法判定”，可拒绝全部。
- 仅在用户无法判断或独立功能裁决冲突时，按案例编号顺序选最多 2 例，每例全臂配对重跑一次；最多 16 份输出。初跑/重跑冲突或仍不确定记 UNKNOWN，不挑最好；所有尝试、失败和返工计成本。

### 采用门：质量和效率分别判定

**质量门：** C 每例 MUST、关键任务和恢复场景全部通过，无新增严重缺陷；对 B 四例均不差且无 UNKNOWN；先导对 A 两例均不差，并至少一例严格质量更好。严格胜须在预登记维度上改善、其他硬项不退、用户认可。同质省钱记效率胜，不能冒充质量胜。

**成本门：** 从原始输入至冻结 Brief，计入全部 Agent、独立审查、失败及返工的真实 token；主动运行时间取全树活动区间的并集，不累加并行子 Agent 时长。活动区间包括工具调用、服务排队、网络等待、失败和重试；只有没有自动任务运行、纯等用户回复的空档排除。人工等待另外报告。配对重跑时按每案例、每臂累加全部尝试，再比较案例总量。

对每个先导案例计算 `1 - C/A`，时间与 token 的案例节省率中位数都至少 50%，且任何先导案例的这两项均不得比 A 增加。缺数据记 UNKNOWN，不拿预估 token 或代理数量替代。基线为零时不计算比例：候选同为零视为该项无变化，候选大于零则该项失败。

**成本转移门：** 以下均按每个先导案例 C 对 A 比较并同时满足：用户干预回合数、用户主动阅读/操作分钟数不增加；从冻结 Brief 到最终原型验收的生成与修复主动时间不超过 A 的 110%；该段全部生成/修复的计费量不超过 A 的 110%；从原始输入到原型验收的端到端主动时间不超过 A。10% 是试验前选定的操作容差，不是统计显著界限；不事后放宽。保留题仍报告相同数据及 B/C 差异，但不能把其差异冒充 A/C 的节省。

端到端主动时间取机器活动与用户主动阅读、操作区间的并集，重叠不重复计，纯等人空档排除；同时报告包含全部等待的真实总历时。生成计费量优先用可取得的真实 token；服务不暴露 token 时，在预注册中固定采用其实际 credits 或费用，各臂/重跑保持同单位，不宣称已测到该服务 token。没有可信计费量或时间记录则该门 UNKNOWN。不能通过删必要的真人决策来满足人力指标。

**兼容门：** 上述合同和双宿主行为检查全部通过，历史输入、稳定 ID、工具授权和工程交付门不退步。

| 结果 | 决定 |
|---|---|
| 质量、成本、兼容全通过 | 只在已验证工具和任务类别调整默认 |
| 节省 49%，或质量提高但成本增加 | 保留可选试验，不切默认 |
| 质量持平但成本下降 | 只证明效率收益，未满足本次质量改善目标 |
| 任一关键门失败或 UNKNOWN | 维持旧默认，定位失败环节；连续两轮失败只重规划受影响单元 |
| B 四例质量不差于 C、每例 token/主动时间均不高于 C、至少一例成本严格更低，且无 C 独有解决的关键风险 | 采用“成熟需求直接 Brief，必要时补研究”；不声称 C 改造成功 |

四例只支持可行性与有限推广，不支持统计显著或所有工具普适。推广后的首 5 次真实使用沿用核心计量；任一新增 MUST 丢失、关键任务失败或原意污染，立即停候选默认并回到上一个稳定版本。未覆盖工具先做同任务 B/C 对照。不开新仪表盘、不将三专家会审变为常驻成本。

### 最终验收的六条二元标准

| 编号 | 真实失效模式 | 必要证据 |
|---|---|---|
| C1 | 轻量只惠及成熟题，新产品仍强制重跑 | 新/旧、高/低不确定真实 trace 与适用性登记 |
| C2 | 原始意图被研究/发散重写 | 原话 → 已选决定 → Brief → 页面逐项核对，MUST 无遗漏 |
| C3 | 文档合格而界面不好用 | 实际任务、恢复场景、用户匿名视觉交互比较 |
| C4 | 删代理但总成本不降 | 完整前段+Brief Agent 树、返工、人力及下游成本记录 |
| C5 | 低预算掩盖关键未知 | 反证、证据独立性、残余风险及阻塞/升级的真实记录 |
| C6 | 优化破坏历史调用或工具边界 | 既有回归、双宿主语义回放和负例抽查 |

## 6. 双向钢人与专家会审记录

保留深度的最强论证：面对陌生用户、机制和矛盾行为证据，过早压缩可能连问题都选错；必须保留问题重构、反证、独立纠错和一手证据缺口处理。其反证条件是聚焦方案在高不确定保留题上同样识别关键风险、改善决策且更便宜。

支持轻量的最强论证：研究只是为决策服务，固定角色与固定维度不应成为用户的入场费；若直接 Brief 已足够好，额外链路必须证明增量价值。其反证条件是省下的研究成本被 Brief 补洞、返工和用户阅读吞掉，或关键质量下降。

第一轮三个独立原生 quality-gate 均提出了必要修改：深度方 3/5，轻量方 2/5，实验方法方 4/5。已据此补上反证/停止规则、focused 证据评级、scope 与投入分离、Brief 完整计量、明确质量胜/效率胜、50% 采用门、有限配对重跑，以及并行计时公式和下游成本转移阈值。

终版闭合票据单独记录在同目录 `2026-10-15-design-workflow-frontlight-review.md`，绑定本文件 SHA-256；本文件不自行宣布专家已放行。专家审的是计划自洽性与可实施性，不是尚未发生的真实设计收益。

## 7. 对用户原始要求的交付核对

| 用户要求 | 本方案的对应交付 |
|---|---|
| 捋清所有节点 | §2 全链及条件分支、各自职责与跳过条件 |
| 处理四项前序 skill，体验轻 | §4 取消固定工作、分离 scope/投入、智能跳过和短交接 |
| 最终效果更好 | §5 最终 UI/交互而非文档验收；A/B/C 与严格采用门 |
| 从多个专业维度思考 | 决策价值、研究有效性、产品/UX、上下文、交互负担、架构兼容、实验设计 |
| GitHub/不同渠道比较，明确依据 | §3 四组固定版本源码及两篇官方工程实践，逐项采用/不采用 |
| 明确工具、如何规划 | §3 工具-证据映射、§4 串行四单元和阶段门 |
| 双向钢人、专家会审 | §6 独立双方论证、第三方实验裁决及终版闭合 |
| 产出后 review，不足补全 | 本表逐项覆盖；最终独立复审票据另附，未闭合项不得写成通过 |

案例内容、设计工具选择及其实际授权是后续实验输入，按用户要求此刻不催要。当前可以完成的是经过复审的改造方案，真实收益仍须按本计划测量。

## 8. Replan R1 — 先修复研究到设计的转化，再轻量化

### 8.1 修订原因和当前可以下的结论

来源：用户指出“补充了必要的研究以后，效果并没有达到预期”，并要求“围绕这个核心问题重新梳理研究、brainstorm 到 design-brief 的链路……既要效果更好，也要轻量化”。

原方案偏重删固定工作和检验最终效果，没有充分定位**研究在哪里失去作用，或者怎样错误地影响了设计**。这属于本次规划内容的缺口；本轮补方案，不把它泛化为已经查明的框架根因，不写全局记忆。

当前已确认的是下表的合同事实与职责不一致；还没有取得用户指定的失败运行材料，因此不能把任何一个风险直接宣称为历史失败的真实成因。后续定位必须使用同一案例的原始需求、研究、取舍记录、Brief、实际 Packet 和生成结果，允许结论落在生成表达而非研究层。

| 链路位置 | 已读源码事实 | 对效果的风险 / 如何证伪 |
|---|---|---|
| 研究 → 发现 | UX 研究已要求面向设计问题、包含“对设计的信号意义”和边界；并非完全没有转化。deepresearch 的主要结构仍围绕主张、共识与证据 | 可信但无关的知识可能占据注意力。若真实发现均对应当前高影响取舍，排除此因 |
| 发现 → 产品取舍 | brainstorm 的 Coverage Matrix 要求高置信发现有去向和理由，允许 DEFERRED/REMOVED | 能证明“没有丢”，不能单凭该行证明选择比原方案更好。检查同一发现是否改变了具体决定、为何适用于当前用户 |
| 取舍 → UX 方案 | 已有机会排序、备选、翻转条件和“一句话最快验证方式”；同时要求理想/非显而易见路径、AI 范式转变 | 可能为满足探索形式而偏离原任务；写了验证方法仍不等于做过可观察验证。以选定方案对实际任务的影响裁决 |
| UX → Brief | 方案模板要求 Brief 不再发明设计判断；交互架构模板却要求 Brief 做组件选择、UI 组件映射，甚至把尺寸/字体归给它 | 职责不一致是已确认合同问题。可能造成僵化继承或重复设计，实际影响仍须沿产物核对 |
| Brief → Packet → 页面 | Brief 已有 rationale、tradeoff、STATE、AC；Packet 要求传 UI 之前的语义事实，视觉实现留给工具；视觉项本来就待生成后验收 | 不能以多加布局处方修复。分别核对：任务收益是否进入 Packet、工具是否落实、已落实后是否仍不好看/不好用 |

对应源码锚点：`ux-research/SKILL.md:41–46`、`ux-research/references/report-template.md:25–49`；`brainstorm/SKILL.md:126–132,259–300`；`ux-brainstorm/SKILL.md:397–435`；`ux-brainstorm/references/design-proposal-template.md:79–82,153–165`；`ux-brainstorm/references/interaction-architecture-template.md:23–24,349–350`；`design-brief/SKILL.md:161–176`、`design-brief/references/input-contract.md:41–44`、`design-brief/references/output-templates.md:141–145`。路径均相对 `.claude/skills/office/`，属于本次实际读取的框架源，不是业务项目推断。

本轮补充的一手方法依据：[GOV.UK 研究分析](https://www.gov.uk/service-manual/user-research/analyse-a-research-session)把观察、发现和下一步行动分开；[Design Council](https://www.designcouncil.org.uk/resources/framework-for-innovation/)要求在开发与交付中小规模测试方案、淘汰无效方案。采用的是“发现不等于行动、行动还需验证”的机制；不搬入整套工作坊，也不以外部方法论证明本仓原因。原 §3 的四组 GitHub 对比继续有效。

### 8.2 新的价值链与责任

**原始任务 → 需要证据的具体取舍 → 相关证据 → 机制不同的候选 → 关键任务走读 → 已选交互及预期收益 → Brief 的语义规格 → 实际界面验证。**

这些是现有节点内部的工作变化，不增加新 skill、固定会议或必经节点。需求已清楚、没有关键未知时仍可直接 Brief；有研究输入时，必须判断它究竟改变、支持还是未影响当前决定，不能只贴引用。

| owner | 改造后的具体责任 | 不由它决定的事 |
|---|---|---|
| deepresearch / ux-research | 回答哪个取舍缺证据，事实支持什么/不支持什么，目标场景迁移是否成立；保留反例和未知 | 不把观察直接变成最终组件、功能或用户已选方案；研究者不代替用户做价值取舍 |
| brainstorm | 将证据转成产品范围、优先级或风险处置；说明相对原需求理解改变了什么，用户价值和代价是什么 | 不重复展开视觉方案，不要求每条可靠资料都成为需求 |
| ux-brainstorm | 将已选目标转成关键旅程和交互机制；比较取舍，呈现主路径及一个最关键异常/恢复分支 | 不把“有行业依据”写成“已证明本产品更好”；不为范式创新牺牲任务完成 |
| design-brief | 继承已经确认的产品目标和核心机制；在授权自由度内补语义位置、信息优先级、状态和 AC；处理矛盾 | 不受“不得发明任何设计判断”这一过宽句子限制；也不接管生成工具的样式/组件处方 |
| 生成工具与最终验收 | 在真实设计系统内落实语义要求，接受真实任务操作与视觉评判 | 文档完整、已引用研究或字段齐全都不能代替最终体验通过 |

同步修正 UX 两份模板及 Oracle 的职责表述：**禁止下游擅改已确认产品目标和核心机制，允许 Brief 在既定范围内完成交互规格，允许工具在既定事实内完成视觉表达。** 若 Brief 发现机制与任务冲突，只将受影响决定回交用户/原 owner，保留其他已确认内容，不从头重跑全链。所有行为、状态及视觉保持事实仍按用户来源保留。

### 8.3 把“研究有用”写进已有决定，而不是再写一份报告

针对会影响当前任务的核心决定，在**现有** finding 说明、Coverage Matrix 的 rationale、方案推荐理由及 D/AC 中串接以下内容：

> 原始任务/痛点 → 证据及适用边界 → 当前可选机制 → 本次改变或保持的决定 → 预期可观察收益与代价 → 什么结果会推翻它。

不新建并行台账、强制卡片、ID 系统或 Packet schema。沿用现有来源 ID 和 D/AC；同一决定只有一个正文 owner，其他节点引用并补本节点负责的部分。保留旧 disposition 枚举，用已有 DEFERRED/REMOVED 及理由处置不相关发现。完整来源可追溯不等于每条资料都必须进入生成上下文。

轻量限制：默认只展开本轮 1–3 个最影响结果的决定，成熟任务允许零个；数值是展示/投入预算，不是安全分母。若超过三个关键风险，保留全部清单并提出明确扩展，不静默丢弃。每个决定用一段短说明，替换重复背景、通用最佳实践和强制 AI 叙述，不叠加第二份规格。

合法结果有三种，均诚实记录：研究改变了决定；研究确认原决定或排除了风险；研究没有带来当前可用信息。后两种不能包装成“界面已经改善”。没有设计增益但有真实风险消除价值时，单独说明价值，不为证明研究有效而故意改 UI。

**示例，仅示意机制，不是实际用户证据：** 假设真实观察发现用户看过结果后经常返回改筛选。研究不直接推出“必须用侧栏”。UX 可以比较“跳转编辑”和“保留结果上下文修改条件”；选中后，Brief 写成“用户修改条件时能核对当前结果、取消后原条件与结果不丢失”，并给任务/恢复 AC。具体侧栏、内联、弹层和样式由实际授权与工具决定。如果任务走读或真实测试显示它增加了干扰，就撤回该机制，而非继续给它补引用。

### 8.4 把设计思考变得可观察，但不提前造完整原型

在现有 UX 方案选择环节，将最重要的取舍表示为同一个任务的 3–5 步走读：用户看见什么 → 做什么 → 系统怎样反馈 → 出错如何继续。必要时附一张小型状态示意，标为概念说明、非最终布局。没有实质取舍时不制造两个方案；有取舍时沿用原方案数量预算，不另加一轮生成工具调用。

用户只需对真实未决取舍作决定，不逐条批准所有研究发现。已有独立 Oracle 检查“声称的收益是否能从这个机制推出、是否引入别处成本”；**模型走读只发现逻辑问题，不证明真实用户更快、更满意或视觉更好。** 真实行为收益仍待操作/用户测试，视觉质量仍待生成后匿名比较。

Brief 的已有 D.rationale 写清预期收益及代价；已有 AC 写可观察的动作和结果。推导的验收表达标为推导，不伪造用户原话，不增加未获确认的新行为。若收益依赖生成工具识别的语义优先级，完整进入现有 Packet 的 D/交互结构/AC 字段，不能只留在 handoff；研究报告及推理草稿不作为第二事实源。

若最终问题主要是视觉风格、信息层级或生成器未落实已正确表达的事实，定位到该层：使用已有用户审美锚点/设计系统做受控生成和验收；不再加研究轮数。风格不满意不能由引用数量解释，也不能由点击步数改善抵消。

### 8.5 先定位失败，再做有限实施：替换 U-001 至 U-004 的 Approach

U-ID、来源、串行写 owner 和权限边界保留。四个单元仍为 PLANNED；本轮不执行其中的 skill 改造。

| 单元 | 修订后的工作与阶段门 |
|---|---|
| U-001 定位 | 用户之后指定原方案四案例。先按真实不满意点登记：任务/内容偏离、交互机制、视觉层级/风格、工具落实。对每个先导案例追踪 1–3 个高影响决定，标出研究→取舍→Brief→Packet→页面的最早失真或缺证位置。历史材料完整时只读定位；不足时，在案例与工具/项目授权齐备后，先跑所需 A 旧链基线，必要时连同 B 直接基线，明确这是新实验而非补写历史。同条件结果供 U-003 复用、纳入初始 12 份并只计一次。仍缺材料则经验性归因 UNKNOWN，不阻止独立已证实合同冲突的局部修正 |
| U-002 修复 | 按已确认问题修改四 skill 与直接模板/Oracle/Brief 输入输出合同；重点加入决策收益说明、关键任务走读、职责校正，同时执行原 focused 减负。先改确有证据的接缝，不新增全面设计系统重构。若 U-001 定位到生成工具或视觉问题，当前范围内只修交接表达；需要改变 adapter/产品范围则重规划，不假称前序修好 |
| U-003 验证 | 合同检查、真实宿主回放与负例抽查，然后运行下述对照和有限定位试验。用户选工具与项目授权仍是前置；模型、生成器和 DS 固定，不用不同工具的好坏替代链路结论 |
| U-004 采用 | 同时判定整体设计收益、研究增量价值、总成本及兼容性。只推广已证实适配的模式。失败时回证据指向的 owner；若研究无增益，不强推研究链，也不把单纯删研究称为转化问题已解决 |

新增回放断言：高置信但与任务无关的发现可以有据排除；未验证研究建议不升 MUST；证据不蕴含具体组件时不能强制组件；预期收益必须在实际任务与 AC 中可辨认；Brief 对已定机制细化时不被过宽禁止；Packet 丢掉关键收益的执行条件要失败；最终 UI 缺目标行为与“UI 已落实但机制本身不好”必须回不同 owner。抽查故意破坏上述关系时检查是否能抓住，单纯 grep 字段出现不算通过。

### 8.6 定位与增量价值试验：替换旧 §5 的试验编排

四案例及新/旧、高/低不确定分层保留，案例及工具仍由用户稍后指定。先冻结用户眼中“不好”的 1–2 个可观察表现、必要行为、2–3 个视觉锚点与比较规则。用户期望本身不靠 Agent 自行推定；选择记录只冻结真实已有信息。

先导两例增加一个**相同新链、没有新增研究输入**的对照：

| 组 | 输入与链路 | 能回答什么 |
|---|---|---|
| A | 原始需求 → 原完整链 → Brief → 同一生成器 | 旧链实际效果与成本基线 |
| B | 原始需求 → Brief → 同一生成器 | 用户已有的最短强基线 |
| C | 原始需求 → 候选聚焦研究与转化机制 → Brief → 同一生成器 | 新链整体是否有效 |
| C0 | 同 C 的新 brainstorm/UX/Brief 规则，关闭本次新增研究输入与检索；只给同一份原始资料 | C 的优势是否真的来自追加研究，而非只因新 Brief/更好的思考方式 |

C/C0 从独立干净上下文起步，不把 C 产生的证据、改写后的需求、已选机制或回答暗送 C0。两组都有用户原始资料与试验前答案库，也都有模型本身已有知识；测试的是**追加研究的增量**，不是让 C0 无知。问题若不需要研究，C 与 C0 应可相同，不制造 research gain。

若 C0 因真实关键未知停止，保留该结果，不逼它编造可生成方案；它只能支持“研究解除真实阻塞”的证据，不能冒充视觉更好的对照。不同组新增的问题都向同一事实提供者求答并记成本；研究发现或 C 独有设计选择不以“用户回答”形式泄漏给其他组。

**版本与防污染规则：** U-002 完成后、首个 C/C0 运行之前，冻结本批候选规则及提示词版本、每例原始资料/试验前答案库、工具/模型/DS/参数和判据；C/C0 使用同一候选规则版本，仅新增研究可用性不同。A/B 绑定各自固定基线规则。先导与保留题只在同一候选版本下合并用于采用。先导结果可促成下一版，但不能边改边累积通过成绩。

候选或输入发生实质修订时，旧版本候选成绩仅作探索证据，不能用于新版本采用；重新运行所有受影响 C/C0 与所需保留题 C，未变且仍同条件的 A/B 可复用。若改变共享事实答案库，则所有受影响组一并失效。研究特有事实、答案和已选机制不得经共用规则修订泄漏给 C0；无法排除污染则研究增量判 UNKNOWN，不用更漂亮的结果补票。保留题不得参与调参；其 B/C 只验证整体收益，不能独立重证研究增量。

先导 A/B/C/C0 共 8 份，保留题只跑 B/C 共 4 份，合计 **12 份初始输出**。已有历史产物只有在来源、输入、工具/模型/DS 等全部同条件且可核验时才能替代相应重跑，否则只作历史诊断，不并入公平对照。

真实产物追踪发现候选断点后，每个先导案例最多一次**单接缝替换试验**：预登记要替换的一个上游产物、旧/新值、冻结下游规则及预期改善；其他来源和设置不变，只重跑其必要下游，最多新增两份最终输出。它是定位线索，不是独立的大样本因果证明；未改善就保留反证，不换一个归因故事宣布成功。

用户无法判断或独立功能判定冲突时，按案例编号选择最多两例，各重跑一次完整原对照组（先导四组、保留两组）。候选修订后的必要重验与这些配对重跑**共享最多 8 次额外生成尝试**，优先补当前版本必需证据，再处理不确定判定；不是每次修订重新获得额度。不重复局部替换。总预算上限 **22 次最终产物生成尝试**（12 初始 + 最多 2 局部替换 + 共享 8 次重验/配对重跑）；失败尝试也占额度，旧版本及所有失败成本保留。剩余额度不足以完成当前版本全部必需对照即 UNKNOWN，不以部分成功采用，也不缩小原分母。这是一次性改造诊断成本，不进入每次用户流程；日常前期研究、走读和审查开销仍全部进入候选成本。

归因顺序：先查原始任务与研究是否相关，再查证据是否被正确解释，再查是否形成可执行机制，再查 Brief/Packet 是否保留，再查生成器是否落实。最早失效处是优先修复点，不排除多个原因共存。C 对 A 只能证明整体变化，不能单独证明研究贡献；C 对 C0 才是追加研究的受控对照，仍受小样本与生成随机性限制。

### 8.7 效果与轻量化共同过门：替换旧采用条件的相关部分

**整体质量门保留并细化：** C 全部 MUST、关键任务和恢复场景通过，对 B 四例均不差且无 UNKNOWN，对 A 两个先导均不差且至少一例严格质量胜。用户预先指出的失败表现必须被实际检查。视觉和任务质量分别判定，不用某一项改善抵消另一项退步。用户盲评认可才算其设计预期得到改善，专家不能替用户决定审美。

**新增研究贡献门：** 对预登记为“确实需要研究”的高不确定先导，C 相对 C0 在事先声明的研究相关维度上有可观察的质量改善，且可沿证据→决定→界面解释；高不确定保留题 C 相对 B 也须在预登记目标上有明确改善，其他保护项不退。二者未满足时，不得宣布“研究转化问题已解决”或把研究型路径推广为默认。研究解除真实阻塞但没有可比较页面时，单记风险/可完成性收益；保持研究可选，不能把它当视觉提升通过本门。

**不奖励无效创新：** 研究确认原方案、减少风险或没有新增信息都可以是诚实结果，但不自动算本轮设计质量胜。若 C 与 C0 相当而都优于 B，归因为新转化/Brief 的候选收益，不能归功研究；若 B 支配 C，仍可采用直达路径，但将“研究为何无效”保留为未证实/待处理问题，不能以绕过问题冒充修复。

**轻量门保留：** 原 §5 的前段至 Brief 真实 token 与主动时间至少节省 50%、逐例不得更贵、人力不增加、下游 110% 容差、端到端不增加、缺测 UNKNOWN 继续生效。新增任务走读、收益说明和现有 Oracle 的开销都计入 C。C0 和局部替换是诊断成本，另列，不混入日常 C 单次成本；配对重复仍按各组全尝试计。到达效果门但没达到轻量门，仍只保留试验，不切默认。

**推广仍受范围限制：** 四例不证明普适；默认只覆盖通过的任务类型和工具，首五次实际使用继续观察原意、任务、视觉和成本。任一关键退步停止候选默认。没有证据改善的条件保持原路或直达入口，不把“所有任务必须研究”写回默认。

### 8.8 本修订的独立评审标准与版本关系

重新进行三位冷启动独立 Agent 的双向钢人与会审，不能复用上一版 5/5 作为当前通过证据。保留研究方须挑战“强求每次设计改变是否伤害风险消除和正确的原方案”；轻量方须挑战“收益说明、走读、四组诊断是否又造出更重流程”；实验方法方须检查归因、对照污染、收益门、视觉边界和停止条件。

六项评审标准：R1 已确认的合同事实与真实失败原因严格区分；R2 每段转化有具体 owner 与可观察结果而非新表格；R3 原始需求、人的取舍、视觉自由度与高风险检查保留；R4 对照能区分研究贡献与新链其他变化且有上限；R5 效果和完整成本共同验收、没有日常新增重流程；R6 四 skill、Brief 及直接模板/Oracle 的改动可实施，全部原始要求覆盖。

评审结果追加在原 review 文件，以当前全文 SHA 绑定；旧票保留为历史。本轮先对完整修订做会审，必要修正后再闭合。上文 §1–7 的节点说明、外部对标、兼容/权限底线、风险及成本公式继续有效；**U-001–004 Approach、试验组/数量/预算、研究贡献与采用规则，以 §8 为准**。本轮未实施 skill 修改，也未执行真实案例实验。


## Budget Amendment (2026-10-19, user-directed)

Source: 用户原话「生成尝试总上限 22 次变为10次」。

The total final-artifact generation-attempt cap is now **10**, superseding the
22-attempt cap in §8.6. Failures, retries, seam substitutions, and version
revalidations still consume this same shared cap. Already consumed: **1**;
remaining at amendment: **9**. No new allowance is granted per revision.

The original 12-initial-output comparison matrix and acceptance denominator are
not silently reduced. That matrix cannot be fully generated within the new cap.
Allocation/scope changes require an explicit decision; unrun comparisons remain
NOT_RUN/UNKNOWN and cannot support a completed four-case gate or default adoption.
Existing generated outputs and browser-only verification remain usable; browser
verification without regenerating an artifact does not consume a generation attempt.
All other quality, provenance, cost-accounting, and human-decision gates remain.


## Allocation Amendment (2026-10-19, user-approved)

Source: actual current native reply to request_user_input_async
`call_0bc52174af05472696b1b21ff9b8e7ba`, question0:
「8份完整对照＋1例B/C，无重试额度」。

U-003 allocation is now two complete four-arm pilots (mobile-recorder and
meeting-assistant: A/B/C/C0, 8 initial outputs) plus one two-arm holdout
(approval-conflict: B/C, 2 initial outputs). Total cap remains **10**, with
**zero reserved retries**. The synthetic uncertain existing-feature holdout
retains a check of the preregistered uncertainty/recovery mechanism; the mature
schedule-form case is deferred rather than substituted into the same denominator.

Only this allocation/budget changes. Source freezes, model/effort, independent
skill and runtime review, research/C0 isolation, task/visual standards and full
cost accounting remain. A failed generation consumes its slot; no autonomous
replacement or extra attempt is authorized. Continue applicable no-generation
verification, retain failure evidence, and mark affected comparisons UNKNOWN.

U-001/U-002 and completed evidence are unchanged. U-004 must distinguish the
10-output approved execution matrix from the original four-case promotion
denominator: the deferred fourth case is not proven, and reduced coverage does
not satisfy or silently weaken the original default-adoption gate.


## Budget Amendment 2 (2026-10-19, latest user instruction)

Source: actual current user message「10次生成额度2次即可。」

The shared final-HTML generation-attempt cap is now **2**, superseding the
10-attempt budget and its 8+2 allocation above. Already consumed: **1** (mobile B);
remaining: **1**; retry reserve: **0**. Failures still consume an attempt.
The sole remaining attempt is prioritised for mobile C against the existing B,
using unchanged frozen candidate rules, raw facts, shared renderer and criteria.
A's further research dispatch is stopped and all sunk work/cost is retained.
A/C0 and other cases are not silently considered complete. Existing preflights
and partial research are evidence only, not a full completed skill or chain.

This cap makes complete A/B/C/C0, research-increment and holdout comparisons
unavailable. Record them NOT_RUN/UNKNOWN and preserve the original acceptance
denominator; no original four-case adoption gate, broad cost-saving or research
contribution claim follows from the remaining B/C pair. No extra generation or
rerender is authorized. Existing artifact validation without generation may continue.

## Replan R2 (2026-10-19) — Complete U-002, not another prototype experiment

### Identity, premise and approval boundary

- Plan ID remains `frontlight-20261015`; U-001–U-004 are not renumbered.
- Exact plan: `framework-audit/plans/2026-10-15-design-workflow-frontlight-plan.md`.
- Source identity: user request in the current conversation, quoted below, plus this plan R1.
- Scope key: `frontlight-u002-contract-completion-r2`.
- Verified checkout HEAD: `1fb9b2e8c928f2b12f1653847790374e97d774a8` (detached).
- Important correction: inherited commit `cda4d560475966ceb19f5a5cf1d874ffd8deb07e`
  already implements focused/discovery changes in all four skills and their direct templates,
  Oracle and Brief contracts. A dirty diff is not the complete implementation history. The
  earlier claim that only one skill had been changed was false. Existing implementation is
  retained and tested, not re-added to manufacture a four-skill diff.
- Source: inline: "那就别再做局部验证了，按原计划把四个 skill 和相关模板/合同真正改完；先列出每个文件要改什么、验证什么，再开始执行。"
- Is this worth doing? Yes: inherited rules still conflict at their actual points of use,
  and the four-skill implementation lacks focused-specific regression and native coverage.
- Smaller alternative: preserve the already implemented rules and repair only demonstrated
  contradictions; a rewrite, new orchestrator or additional HTML comparison is unnecessary.
- Bias check: writing rules does not prove a lighter or better experience. Independent review
  must try to refute completeness and retained safeguards, not reward file/line reductions.
- KILL-R2: if a proposed change drops a real user decision, source MUST, applicable recovery,
  independent review or critical unknown, stop that change and return to its original owner.
- Complexity: Sequential + Supervisor, Standard; one source writer and one independent
  quality-gate at a time. Models/effort follow the current native role contract.
- No task-plan DEV/ASSERT input exists; engineering reverse-coverage sections are N/A.
- This is NO_PIN framework maintenance. No project aliases, `framework/`, memory promotion,
  new network research, package installation, HTML generation/repair, Git commit/push,
  publication, default adoption or other checkout synchronization is included.
- This addendum is a planning artifact, not source-execution approval. Show the finite file
  scope and its SHA to the user; obtain actual scope-matched approval before source mutation.

### U-002 exact file manifest

Paths in this table are relative to the verified framework checkout above. They identify the
finite source/test write scope; evidence is confined to the audit paths specified afterward.
An additional source file requires a delta, not silent scope expansion.

| File | Surgical change | Required verification |
|---|---|---|
| `.claude/skills/office/deepresearch/SKILL.md` | Preserve its implemented focused owner; make completion retain exact input/version, confirmed choices, decision/evidence limits and all critical risks, rather than a three-risk truncation. | focused/moderate/deep handoffs retain provenance and a four-critical-risk case; legacy depth thresholds remain unchanged. |
| `.claude/skills/office/ux-research/SKILL.md` | Make completion describe the actual mode rather than unconditional multidimensional findings; preserve provenance/all critical risks; explicitly require quality criteria and the existing handoff validator before completion. | One-question and zero-question branches; missing review/required UNKNOWN cannot pass; applicable Human Gates remain. |
| `.claude/skills/office/brainstorm/SKILL.md` | Replace unconditional 2–3/three/fourth-direction presentation and re-generation wording with actual mode/option counts; an already confirmed retained direction does not trigger a fictitious vote. | Focused retained direction, actual two-mechanism tradeoff, explicit full counts and real unanswered choice. |
| `.claude/skills/office/brainstorm/references/prd-template.md` | Correct four-tier description; record actual discovery mode and choice source; align local option/rejection placeholders and checklist with the existing focused exception. | No fabricated alternatives/rejections; full Deep-product still requires its original counts; stable IDs/coverage intact. |
| `.claude/skills/office/ux-brainstorm/SKILL.md` | Repair fixed-count presentation, unconditional Anti-Patterns and Phase 7 table/ID requirements; bind AI/Agent work to actual applicability; preserve the existing dirty completion repair and explicitly validate its handoff. | Focused non-AI retained direction without fake AI/Agent work; actual task/recovery complete; both outputs and handoff validate. |
| `.claude/skills/office/ux-brainstorm/references/design-proposal-template.md` | Apply focused/non-AI rules at local option, paradigm, evolution, rejection and checklist clauses, not only in a distant preface. | Non-AI and single-retained-direction cases pass honestly; full AI case preserves all applicable safeguards. |
| `.claude/skills/office/ux-brainstorm/references/interaction-architecture-template.md` | Make local full-day/task-type/trust/Agent-L2 tables and checklist applicability explicit; preserve every actual task and critical recovery branch. | No invented time periods/trust thresholds; omitted real permission/recovery fails. |
| `.claude/skills/office/ux-brainstorm/references/adversarial-review.md` | Make local rejected-direction/AI/evolution checks mode-aware while retaining five dimensions, independent review and blocking unknowns. | Oracle accepts sourced N/A, not missing actual checks; no synthetic rejection quota in focused. |
| `.claude/skills/office/ux-brainstorm/references/pressure-test.md` | Clarify the escape hatch cannot treat a critical unknown as a safe assumption or declare readiness; preserve source-backed answer reuse and genuine user decisions. | Impatience can defer noncritical work but cannot waive missing consequential evidence or preferences. |
| `.claude/agents/quality-gate.md` | Replace AI-state keyword presence as a sufficiency test with applicable state/transition/recovery evidence; non-AI has sourced N/A for AI-specific items only. | Keywords without recovery fail; non-AI complete states do not require AI words; unobserved behavior stays UNKNOWN. |
| `.claude/skills/office/references/handoff-protocol.md` | Clarify three entries is a summary limit, not a limit on retained critical risks; use full source references without a new schema. | Four-critical-risk handoff keeps the entire set within the current format/size limit; dropped risk fails semantic review. |
| `scripts/test-design-workflow-frontlight.mjs` (new) | Focused-specific contract tripwires and scoped in-memory source mutations; explicitly label source checks STATIC_ONLY_NOT_NATIVE. Do not create a production validator or routing engine. | Positive/negative cases and guard-removal checks fail for the targeted broken source and pass after restoration. |
| `framework-audit/design-workflow-frontlight/test_focused_handoff.py` | Extend the existing real-parser tests for the repaired completion seam; do not call parser fixtures native research evidence. | Actual validator accepts legal PASS and rejects NOT_RUN, required UNKNOWN and missing evidence. |
| `framework-audit/design-workflow-frontlight/u002-replay-fixtures.json` (new) | Freeze finite NO_PIN semantic-replay inputs and assertion IDs below; keep grader expectations separate from subject prompts. | Exact fixture/source hash, complete denominator and raw current-harness outputs; no fabricated human replies or completed skill claims. |

Retained and verified, not automatically rewritten: shared focused-research owner; both research
prompt/report/Socratic templates; brainstorm pressure-test/Oracle; Brief SKILL/input-contract/
output-templates; input-modes source; plan-design-guidance; routing map; stable-ID and Packet
schema. These already implement R1. A demonstrated new defect returns as a scope delta.
Generated input-mode/catalog views are never hand edited. No source metadata/input-mode change
is planned, so no generated churn is expected; if needed, use only
`python3 scripts/build-agent-context.py sync` then `check`, explaining the affected source first.

### Execution sequence and acceptance

1. U-002 source completion (`task_execution`, single main/worker source owner): read each exact
   owned file fully, preserve preimages/dirty work, add failing focused regression, repair the
   finite clauses above, run tests. Gate: all source/contract assertions below pass.
2. U-003 contract compatibility slice only (`task_execution`, main agent): freeze current source
   inventory and replay fixture, then exercise the finite semantic cases below in actual Claude
   and Codex separately. These are bounded behavior probes, not simulated full skill completion.
   Interactive skills remain main-agent work; stop and observe a required question rather than
   inventing a user answer. Missing actual host capability stays UNKNOWN and blocks its parity
   claim, not the other host's useful work.
3. Independent quality-gate (`task_execution`, cold native quality-gate, default REFUTE): inspect
   the final exact source set, original requirements, complete test results and native traces.
   Do not pass implementation history or authors' reasoning. Any source repair invalidates its
   old vote and affected probes. Default at most two review/repair rounds.

Exact new audit outputs (not a new evaluation platform):
`framework-audit/design-workflow-frontlight/u002-r2/source-inventory.json`,
`framework-audit/design-workflow-frontlight/u002-r2/test-results.txt`,
`framework-audit/design-workflow-frontlight/u002-r2/native-replays/` (raw per-host probe records),
`framework-audit/design-workflow-frontlight/u002-r2/independent-review.md`, and
`framework-audit/design-workflow-frontlight/u002-r2/completion.md`.
The original plan is append-only for status/evidence; hashes/receipts are evidence, not permission.

| Assertion | Actual required behavior / source |
|---|---|
| F01 | New-product focused does not auto-upgrade/fan out or repeat concrete answered questions (§4.2). |
| F02 | Actual product tradeoff produces different mechanisms and a real unanswered Human Gate (§4.2). |
| F03 | Agreed mechanism does not manufacture alternatives/rejections; independent Oracle remains (§4.2). |
| F04 | Non-AI UX keeps main 3–5-step task and key recovery without forced AI/Agent invention (§8.4). |
| F05 | Nonempty focused research has one researcher, one shared item budget and separate examiner (§4.1). |
| F06 | Common underlying evidence is not independent; own official spec does not prove user effects (§4.1). |
| F07 | Budget exhaustion/critical unknown is not zero-question PASS or an automatic depth upgrade (§4.1). |
| F08 | Irrelevant/unused evidence has justified existing disposition; no suggestion-to-MUST (§8.3). |
| F09 | Brief preserves MUST/ID/recovery, refines within scope, carries benefit conditions into Packet (§8.4). |
| F10 | Explicit deep/full, historical input and standalone/managed completion ownership remain (§4.3/§5). |

For F05/F06, offline supplied evidence can probe allocation and evidence reasoning but cannot
prove live web-research quality or savings. F02 succeeds at asking and waiting; no synthetic
reply is passed off as human approval. An actual full skill run is separately labeled only when
all of that skill's phases, independent examiner and human/completion gates truly execute.

Target mutations: restore new→full; restore focused fixed quotas; promote unused advice to
MUST/component; remove a source MUST/Packet benefit condition/actual recovery; or remove
examiner/allow required UNKNOWN/reuse stale review. Mechanical source mutation tests only prove
their narrow tripwire. Semantic corruptions are additionally judged against the original input
in cold native probes, never against an author's self-generated coverage matrix alone.

Blocking shell checks, each run in its own process with the real nonzero exit preserved:

```bash
# [BLOCKING] R2-SOURCE — focused contract and guard-removal checks
node scripts/test-design-workflow-frontlight.mjs --mutation
# [BLOCKING] R2-HANDOFF — real handoff parser positive/negative cases
python3 framework-audit/design-workflow-frontlight/test_focused_handoff.py
node scripts/test-handoff-validator.mjs
# [BLOCKING] R2-REGRESSION — existing workflow/tool/agent contracts
node scripts/test-design-workflow-contract.mjs
node scripts/test-design-tool-routing.mjs
node scripts/check-agent-contracts.mjs
# [BLOCKING] R2-VIEWS — freshness/discovery projection (not native parity)
python3 scripts/build-agent-context.py check
node scripts/check-agent-context.mjs
node scripts/check-capability-parity.mjs
node scripts/check-agents-parity.mjs
```

Binary quality criteria for the independent gate:
- R2-C1: all four skill branches and direct consumers agree at actual points of use; no fixed
  quota/AI escape contradicts focused; cite final source and F01–F04 evidence.
- R2-C2: original source, choice, all critical risks and required Human/Oracle gates survive;
  cite actual parser negatives and F05–F08/F10 traces.
- R2-C3: Brief/Packet retain original MUST/recovery/benefit conditions without inventing product
  or visual prescriptions; cite source-based F09 positive and corruption cases.
- R2-C4: legacy modes, IDs, standalone ownership, scope and generated-file discipline do not
  regress; cite current regression results and exact file inventory.
- R2-C5: Claude/Codex discovery, execution and refusal are separately evidenced; any missing
  native row remains UNKNOWN, and no static fixture is presented as a completed skill run.
- R2-C6: implementation completion, prototype quality, research increment and cost savings are
  reported separately; no current contract repair reuses old HTML as proof or promotes defaults.

Any BLOCKING failure stops the dependent phase; required UNKNOWN cannot be re-labeled PASS.
U-001 historical diagnosis remains partial. U-002 is not DONE until final-source independent
acceptance. U-003's A/B/C/C0/holdout/HTML comparison remains incomplete under the exhausted two-
generation cap. U-004 default adoption remains unapproved. No new generation allowance or weaker
quality/cost denominator is created by this addendum.

### R2 execution delta 1 — Brief consumer conflict (2026-10-19)

Independent round-one review found a MAJOR conflict: upstream focused permits a sourced
confirmed direction without fabricated alternatives, but Brief Phase 5/output template/SCHEMA
still demand a rejection for every D. This is a directly affected consumer within original
U-002/R1 §8.2–8.3 and the user's continuing instruction to finish the related contracts.
Extend the finite write list by only these three already-read files:

| File | Change | Verification |
|---|---|---|
| `.claude/skills/office/design-brief/SKILL.md` | Keep eight fields; for inherited confirmed decisions with no substantive current choice, cite the source and explain N/A instead of inventing a rejection. Real unresolved choices return to their owner. | Focused/mature inheritance keeps the decision without fabricated alternatives; actual rejections and rationale/tradeoff survive. |
| `.claude/skills/office/design-brief/references/output-templates.md` | Apply the same exception at the alternatives field; real new choices still require considered alternatives and reasons. | New source tripwire fails on round-one bytes, passes repaired bytes; reverse mutation restores failure. |
| `.claude/skills/office/design-brief/SCHEMA.md` | Replace unconditional ≥1 placeholder with the same source-backed inheritance rule without deleting the field. | All three owners agree; original eight-field/traceability tests still pass. |

Update the existing dedicated test and P07 grader expectation, re-freeze affected source hashes
and obtain round-two independent review. Round-one FAIL is retained. This is a reversible repair
of the already requested Brief seam, with no new human product choice, external effect, HTML,
default promotion or publication. The initial exact approval remains evidence for the original
R2 bytes; this delta relies on the actual user's continuing related-contract repair instruction,
not a fabricated second approval of the changed plan hash. Native coverage stays UNKNOWN.
