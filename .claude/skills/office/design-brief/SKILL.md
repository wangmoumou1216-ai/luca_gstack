---
name: design-brief
preamble-tier: 3
argument-hint: "[PRD/requirements/prototype + target template/module, or spoken intent]"
version: 3.0.1
description: |
  设计收敛与模板适配节点。承接全流程已选方案、已有需求/口述转写，或已有原型的 UI 精修；
  继承确认事实，补齐关键缺口，按模板语义定位模块、验证动作/状态承载能力，界定生成工具自由度。
  输出可追踪决策、状态、位置、验收与唯一冻结 Generation Packet，交给 Open Design 等工具执行。
  适用于“拿现有需求直接设计”“把原型植入指定模板模块并美化”。不重做成熟上游，不直接生成UI；
  未定机制/多方案先发散。正式模板绑定/TAC在事实冻结后完成；工程交付仍要求实际PRD。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 39572  # 实测字节数 wc -c，统一口径 2026-07-04（G5）；2026-07-21 复测（interaction-mechanics 挂载 + Step 1.0b + 内容语义规则）
  runtime-estimate: 24000  # 2026-07-21：+interaction-mechanics（10826B ≈ +3.6K tokens，Phase 3 挂载）
  shared-refs: [ai-native-design-framework, ai-native-state-coverage, ai-native-taste-anchors, interaction-mechanics]
  recommended-model: core-execution  # 2026-07-10 Fable手术刀：整场收敛opus；本 skill 无 judge/oracle 环节
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
_CONSTRAINTS=$(ls docs/prd/*-prd-constraints.md 2>/dev/null | head -1)
_UX_AUDIT=$(ls -t docs/evaluation/*-ux-audit.md 2>/dev/null | head -1)
_UX_RESEARCH=$(ls -t docs/research/ux-research-*.md 2>/dev/null | head -1)
_UX_BRAINSTORM=$(ls -t docs/decisions/*-ux-brainstorm.md 2>/dev/null | head -1)
echo "PRD: ${_PRD:-none}"
echo "CONSTRAINTS: ${_CONSTRAINTS:-none}"
echo "UX_AUDIT: ${_UX_AUDIT:-none}"
echo "UX_RESEARCH: ${_UX_RESEARCH:-none}"
echo "UX_BRAINSTORM: ${_UX_BRAINSTORM:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py design-brief "*" 2>/dev/null || true
```

---

## 角色与定位

作为资深产品与交互设计师，把明确的设计输入收敛为可执行、可验收的契约。
产品、语言、品牌和设计系统来自已确认项目及用户输入，不能从框架模板推断。
本节点放在**设计输入就绪之后、Open Design 执行之前**；三种入口汇合于此：

| 入口 | 输入 | 工作 |
|---|---|---|
| pipeline | PRD / UX 研究、评审、已选方案 | 继承决策，补齐交互与模板适配 |
| existing_requirements | 已有需求、口述转写、需求文档 | 建立来源索引，直接收敛设计，不强制重跑需求链 |
| prototype_visual_refinement | 已有原型 + 模板/模块 + 精修要求 | 继承行为，锁定修改/保持边界，适配后交给 OD 美化 |

入口与 A/B/C/D 场景分开。有效的场景、模板、位置、工具和授权直接继承；
只有缺失且会改变意图的项目才询问。无 PRD 不等于无法设计生成。
六项能力：来源继承、口述结构化、模板语义定位、交互/状态适配、执行自由度、统一生成与验收。

## 按需读取（用到前完整读取）

| 边界 | 文件 |
|---|---|
| Phase 0 输入/模式选择 | [输入与原型继承合同](references/input-contract.md) |
| Phase A 新 AI 判断 | ../references/ai-native-design-framework.md |
| Phase 0.5 / 6 模板适配 | .claude/skill-os/runtime/page-context.md |
| Phase 3 状态与交互（所有入口） | ../references/ai-native-state-coverage.md、../references/interaction-mechanics.md |
| Phase 4 品味检查 | ../references/ai-native-taste-anchors.md |
| Phase 5 / 6.75 / 7 字段产出 | [输出模板](references/output-templates.md)、[字段 schema](SCHEMA.md) |

不在启动时加载全部方法论。原型/成熟方案可继承分析，但状态、来源、范围和冻结门不跳过。
引用中标“仅供推理”的视觉技术细节不转写成 OD 布局处方；外部 DS 由用户在工具内配置。

## Phase 0：输入继承与缺口核对

读取用户指定的精确材料，核对可达性、版本、话题和作用域；preamble 的最新文件只是发现线索，
不得自动混入其他话题。按输入合同登记用户/任务/对象/动作、目标/成功标准、平台/范围、
修改区/保持区、模板/语义位置、目标工具、来源、确认状态和未决项。
口述指用户提供的语音转写；不虚构未提供的音频读取/识别能力。

| 交付模式 | 必要来源 | 能力边界 |
|---|---|---|
| traceable_delivery | 实际 PRD R/AE + 设计输入 | 设计生成与工程，须过完整 PRD 追踪门 |
| design_generation | 已有需求/原型的来源索引、明确范围与 AC | 可交 OD / MagicPath / Claude Design / HTML；不宣称 PRD 工程 ready |
| standalone_light | 只要求探索性文档，关键输入仍未齐 | LIMITED，不能冒充可直接生成或开发的最终契约 |

缺 ID 用本轮 REQ-/AC-/SRC-；已有 ID 原样保留，不伪造 PRD R/AE。tech-spec/task-plan
仍需实际 PRD。pipeline 继承已验证假设、AI 范式、Oracle 修正、被否决方向及 voice-spec 语义。
已有需求不要求先有两份候选方案；原型入口以可观察行为及用户声明为源，不从截图推断隐藏交互。
B/C/D 读取实际现状和修改边界，现状缺失明确报告；C 继承已确认问题和改版方向。
D/实际 Agent 功能保留可见、暂停、接管、撤销及授权门。场景影响范围而不明时才消歧。

完成：成熟输入被继承，关键未知未伪装成事实；仅关键缺口需要真实用户回答。

## Phase A：设计坐标系

先确定目标、不能改变的范围、成功标准和设计自由度，再选实现位置。
有 PRD 摘要则引用；没有则从当前源逐字段声明依据，不制造摘要或产品约束。
成熟 AI 结论直接继承；纯 UI 精修不新增 AI 机制或重定产品方案。
原型暴露机制问题时列冲突，不能以“优化”为由静默改变行为。
完成：目标/边界/自由度都有来源，区分可决定、应继承与待确认。

## Phase 0.5：模板选择与语义适配草稿（冻结前）

用户不用模板时记 reference=none 并继续；指定模板优先验证。需要模板但未选时，
按 page-context 读取目录和实际源，做用途/位置匹配、必要预览和真实选择。
内部线索可调用：

```bash
node scripts/page-context.mjs phase-a-discovery --query '<页面用途、目标动作与范围>'
```

CandidateHint 只是临时线索，不得写入 Packet；不代替全目录评估、真人选择或正式绑定。
primitive 不可用或无线索时，得到 `NO_HINT`，继续
  design-brief；NO_HINT 不证明需求已澄清，也不覆盖用户指定模板。

用 page-context 的 adaptation-draft 合同记录 来源ID/完整原文→页面用途→区域职责→动作→
适用状态→源证据/替代位置/冲突。模板的语义由 catalog/原件索引及实际源拥有，
Brief 承载本轮“需求为什么放这里”的判断和适配结果，不复制维护第二套模板语义库。
页面合适但有两个合理承载区域时问一个消歧问题；不取词面第一名或编造置信百分比。
模型 high、JSON actor=user 和惰性预览都不是用户确认或交互已验证。

完成：无模板、已确认选择/位置或明确冲突；草稿不是 carrier-binding，不带冻结 hash/TAC/adoption。

## Phase 1：原生AI四层深度思考（按成熟度继承）

有已选上游则填“承接值 + 交互复核证据”，不重做发散；纯精修填“继承原型/本轮不改机制”。
无 AI 时写 N/A + 来源理由，不强制加 AI。新 AI 判断才做四层：产品任务收益、交互路径/恢复、
信任/来源/不确定性、代理控制/授权。D/实际 Agent 的 Layer D 强制。
新 AI 的决策压缩与路径门按 framework 执行；成熟方案复核冲突回原来源/用户，不静默重算。
完成：AI 判定有继承或推导证据，未扩大精修范围。

## Phase 2：假设挑战结论

继承已验证假设，只检查本次规格/模板适配是否使其失效；否则识别本轮 1–2 个关键假设及验证点。
精修重点核“模板能承载原型行为、信息、状态”，不重新挑战已确认目标。
Agent 保留信任假设和人工 fallback。关键假设失效影响意图时先处理，不能带冲突冻结。

## Phase 3：体验验证结论

所有入口都对照本轮 MUST/AC 验证主流程、动作、权限、响应、恢复与保持区。
12 状态全部声明，适用项给触发→可观察响应→下一步/恢复→验收；N/A 有原因。
D 按状态 owner 的强制覆盖执行。原型已有状态直接继承，关键未知问清楚，不凭默认截图全通过。
继承 voice-spec 或声明空态引导、错误恢复、轻量成功反馈、AI 不确定性/拒答出口等内容语义。
记录键盘任务、合理焦点顺序/恢复、状态可感知、窄屏任务保持的验收；UI 实现由工具决定。

逐状态回适配草稿核对实际支持/允许扩展/未知/不支持，不只看同名状态。
冲突写来源、动作/状态、位置、证据、影响和解决选项。换模板保留需求；改变范围须真实用户决定，
不能删需求迁就模板。完成：全部 MUST 和适用状态可验收，关键适配冲突已处理。

## Phase 4：品味检查四锚点

保留节名，按 taste-anchors 执行 8 锚点、10 项 Slop 与阻断/警告分级。
未生成界面时视觉项标“待生成后验收”，不能宣称视觉通过。精修只提出授权范围内的质量目标，
机制/流程问题单列。完成：阻断项处理，警告和待视觉验收点有位置及判据。

## Phase 5：设计决策清单

每个核心交互/保持决定有 D-ID；保留已有 ID。按输出模板完整填写名称、内容、rationale、
至少一项排除备选、真实 tradeoff、AI 引用、状态覆盖、来源/约束（八字段合同）。
原型继承项引用节点/路径/操作证据；备选说明本轮为什么保留，不虚构历史否决。
B/D 每条立即核边界；超范围保留 REMOVED 及处理依据。完成：无缺字段、隐藏新功能或无源决定。

## Phase 6：最终适配与页面、交互位置映射

工具/平台/整页或局部范围/参考策略逐项引用来源；仅影响意图的未决项再问。
将草稿与最终 D/STATE/AC 全量重核版本、用途、动作、位置、状态、保持区、原型行为与连接器能力。
初选不等于最终绑定；补齐设计后允许修改适配选择，不能改需求迁就初选。

第 7 节固定「页面与交互位置映射」，机器门名 page_interaction_mapping。
每个 D-ID 至少一行：语义位置、职责、全部适用 STATE、需求/AC 来源、修改/保持约束、下游目标。
reference=none 仍完整映射；ID 只用实际存在且有效的记录。模板版本/具体ID/选择证据放旁车，
Packet 只写语义位置。区分“语义适合”“状态/动作支持”“连接器可执行”三项结论。

精修 refine 与嵌入 add/modify 分开；preserve 不冒充精修。原件路径按 page-context §7，
不能把原件静默降为截图。能力不足报告具体 BLOCKED，保留契约，不伪报生成完成。
完成：全量语义映射可追踪，关键冲突解决，无能力谎报。

## Phase 6.5：可追踪完整门禁

按输入合同建立来源索引与落地矩阵：完整诉求/确认状态/本轮范围→D→STATE→位置→下游→AC。
MUST 由明确需求与用户确认确定；研究建议不能自动升级需求。结果仅 MAPPED/DEFERRED/
NEEDS_CONTEXT/REMOVED；非 MAPPED 有原因，必须项改变范围有真人依据。

门禁逐项检查：所有本轮 MUST/AC、上游核心决定/补丁、原型保持项有去向与验收；
每个 D 有语义位置、全部适用状态、来源和边界；关键未知未伪报验证，未决关键冲突不冻结。
traceable_delivery 另核实际 PRD 全部 MUST R/AE。
通过写 TRACEABILITY GATE PASS，coverage_scope=prd_end_to_end 或 design_source；
design_source 表示当前设计源完整覆盖，不代表工程 ready。standalone_light 写 LIMITED + 缺口，
不得直接生成或进入 tech-spec/task-plan。缺 PRD 本身不让 design_generation 降为 LIMITED。

## Phase 6.75：Design Generation Packet + Tool Consumption Contract

从 Brief 正文提取完整目标/需求/D/适用 STATE/语义位置/AC/修改与保持边界，按输出模板形成唯一
Packet，核对完整性后按原字节冻结。稳定 ID 与完整原文一起传递；无 PRD 用 REQ/AC，不伪造 R/AE。
Packet 不含 CandidateHint、最终模板/模块 binding、TAC/hash/adoption、OD 项目或收据。
原型版本与入口 provenance 放 Brief 来源登记；行为保持事实完整进入 Packet，不能只放附件路径。
原型 HTML/截图/状态说明用独立不可变证据附件运输实际 bytes；本机路径不是已上传附件，HTML 不执行。

Packet 冻结后按 page-context 执行正式 carrier-binding / 原件适配、TAC 和 bundle 真人采用；
有效的模板/位置确认重用，不让用户重述。冻结后核验版本/执行承诺，不重做产品或模板选型。
事实变化回 Brief 修订、重新冻结/绑定；TAC 只投影冻结事实，不允许 OD 现场改需求。
reference_only 必须明确标为**非模板衍生**；不含 base template、TAC、carrier hash 或模板衍生承诺。
用户指定原件不能靠此分支绕过冲突；structural_carrier 不继承视觉，visual_carrier 未验证能力不得宣称可用。

Tool Consumption Contract：生成工具在授权自由度内决定视觉表达，落实全部任务/状态/保持边界；
精修不得重设计行为、数据语义、权限、状态或复活否决项；工程消费者仍需实际 PRD/工程门禁。
stage/run/recover 权限及状态分开；导出/置入不称生成完成。完成：正文一致、全量覆盖、事实唯一、运输可达。

## Phase 7：文件、交接与状态

按 SCHEMA/output-templates 写 docs/decisions/YYYY-MM-DD-<topic>-design-brief.md，保留 12 节：
设计坐标系、原生AI深度思考小结、假设挑战结论、体验验证结论、品味检查四锚点、设计决策清单、
页面与交互位置映射、可追踪完整矩阵、Design Generation Packet、Tool Consumption Contract、REMOVED 记录、交接块。
继承/N/A 有证据，不伪造新分析。交接块只是索引，不是第二事实源。

完成协议（Handoff Summary）：写 docs/handoff/YYYY-MM-DD-<topic>-design-brief-handoff.md，
按 ../references/handoff-protocol.md（≤2000 tokens）填写 3–7 项 criteria 的判定与证据；
含决策摘要（≤8条，decision/rationale/tradeoff）、位置/追踪统计、下游约束（≤5条）、风险（≤3条）、
完整产出路径与 AI Native 判断。已有块内另记 entry/delivery_mode/coverage_scope、原型保持、
适配/选择旁车、冻结 Packet 与下游自由度，不复制事实清单。

verified project scope 用 write_state.py 单写 nodes.design-brief；仅选择 workflow 才核其要求上游，
standalone 不强制别的节点 DONE。LIMITED/关键未知/缺 handoff 不写 DONE；按事实为 DONE/
DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED。NO_PIN 框架维护不跑项目 preamble/产出/state。
不直接追加 CONTEXT.md；经验按 office 治理记忆入口，本轮默认不存。

## Phase 8：按已授权目标交接

用户已明确目标及后续范围则继续；未定才提供 OD（推荐）、Claude Design、MagicPath、本地HTML或停在文档。
不重复许可、不自动换工具。工具不可达保留材料并报告具体状态。
Brief DONE 只表示契约完成，不表示 OD 已生成或验收通过。

<!-- FILE_END: design-brief/SKILL.md -->
