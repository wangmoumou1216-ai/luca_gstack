# 交互说明计划：独立会审与红队记录

范围：NO_PIN 框架计划；只审计划可实施性，不声称功能已实现。主文档为同目录 `2026-10-04-prototype-notes-plan.md`。

**当前状态：DONE（v5规划包，第四轮冻结）**。最终同版独立Agent会审：架构7/7、前端8/8、UX8/8、红队8/8；无存活MAJOR/BLOCKER。14条需求已映射到具体方案、实施单元与验收条件。功能实施尚未开始。

**最终定案**：可单独调用的薄 `prototype-notes` skill，共用固定侧栏/数据核心，OD在完成前内部调用；插入在用户确认UI、交互和动效版本之后、最终组合验收与父节点完成之前。详见[节点与形式复审](./2026-10-04-prototype-notes-decision.md)、[主计划](./2026-10-04-prototype-notes-plan.md)、[执行手册](./2026-10-04-prototype-notes-execution.md)。

当前有效指纹、原票ID、问题关闭和完成条件在文末“最终定案”节。以下按版本保留历史审查，不以旧版本票替代当前结论。

## 输入与版本

- 用户目标：OD 产出、完成 UI/交互/动效调整并经用户确认后，在同一份离线 HTML 内附加可开关侧栏、数字标号、AI 说明及人工新增编辑能力；固定通用 UI；需同类 UX 产品调研、专家会审、红队。
- preflight native `/root/notes_preflight`：quick-research / redteam 均 PASS；其预检 hash 是编辑中快照，不用作终版评审对象。
- 前端第一票对象 SHA-256：`60f66feda4f27c641f1d37e12e1c22668bbef3001a4730378ca8e04a097c9ee3`。
- 所有专家使用 native quality-gate、fork_turns=none；不提供作者推导历史。每票真实返回后才汇总。

## 第一轮：前端架构

Native invocation：`/root/notes_frontend_review`；eval_run_id：`notes-frontend-plan-r1-20261004-01`。

以下为原始人类报告：

> Status: FAIL（通过率 3/5）
>
> PASS 哈希：python/hashlib 实测与冻结 SHA256 一致；未运行未来测试。
>
> PASS F1：L151–163 明确原始源重建、重复导出幂等、缓存失效降级及人工修改后的验收身份，保存闭环可实施。
>
> FAIL F2｜MAJOR：L169–173、A-09 要求兼容原生 dialog，但未确定顶层与焦点方案。反例：业务 showModal() 使同级说明 host inert，侧栏无法点击或编辑；普通覆盖层不能解决。应在 P1 冻结 host 挂载、焦点恢复方案及不可支持边界，并验证模态弹窗纵切。
>
> FAIL F3｜MAJOR：L119、U-004 承诺选区不触发业务，但缺事件隔离方案。反例：原型先注册 window capture pointerdown 执行业务，后注入监听器无法撤销已发生动作。应明确选区命中层、pointer/keyboard 隔离及全局监听兼容边界，加入对应负例。
>
> PASS F4：U-001–008 文件责任和阶段门明确；真实 OD 纵切先行，后续含离线重开、独立引擎及 mutation，未另建服务或编辑器平台。

处置：v2 §7/U-002/A-03/A-09 增加最早 bootstrap 事件闸门、原生 modal 内工具 host/top layer 及焦点合同和失败边界。修订不等于通过，等待同版本回验。完整 envelope 已由 record_eval.py 原样落账，原始票保留于本会话工具返回。

## 第一轮：框架接线

Native invocation：`/root/notes_framework_review`；eval_run_id：`notes-framework-plan-r1-20261004-01`。对象同首票 SHA。

> Status: FAIL（4/5）
>
> PASS SHA：实际 hashlib.sha256 与指定 60f66fed…c9ee3 一致。
>
> PASS G1：计划 L65–82 明确用户确认版本→说明加工→组合验收→父级完成一次；U-006 覆盖 OD/QG/orchestrator 接线。
>
> FAIL G2 — MAJOR：U-005 限定“仅增 processor_id”不足以实现 L82 的 accepted motion→notes。同一交付根内的 motion content 作为 base 时，现有 prototype-delivery.mjs:191 必然拒绝 SOURCE_OUTPUT_OVERLAP，换 namespace 不解决。须规划受限的前序产物派生入口：绑定并重验 exact accepted ref、验证源与新 attempt 不重叠、保留来源链；增加同根连续加工及越界拒绝测试，不能整体取消 overlap guard。
>
> PASS G3：U-001–008 有文件、依赖、权限与阶段门；A-10/U-008 明确双 harness 真验及缺能力出口。属于实施规划，未执行未来测试。
>
> PASS G4：§5 有字段级人工保护、tombstone、语义变化重绑；§6 明确人工导出使旧验收失效，进入工程链前重验。
>
> 建议：修复 G2 后按新指纹复审。无已证实 BLOCKER。

处置：v2 U-005 新增受限 derive-from-accepted 派生入口，与 namespace 一起做最小兼容扩展；普通 overlap guard 不变。A-10 增加同根连续加工与非法派生拒绝。该票 FAIL 已原样落账，不覆盖成 PASS。

## v2 冻结候选

SHA-256：`615ac73dce9ba647ecd267df0e4198cd1578ad66969693269c552bb46e4ebdd2`。新增 §1.1 将 Axure/UXPin/Zeplin/Figma 的官方事实、采用和不采用逐项绑定到设计与验收；本轮没有运行商业产品或真实 OD 样本。

评审原票账簿：`memory/evals/eval-log.jsonl`，由 record_eval.py 校验写入；本文件的人类汇总不代替原始裁决。

## 当前检查点

研究 executor `/root/notes_ux_research` 已完成产品及写作研究并由主控读回（21 个实际读取的一手来源）。v4 红队及三类专家审查已完成。v5 正补充执行手册与工程接点，由主控唯一写 plan/execution/review；只读 explorer `/root/notes_execution_contract_audit` 核对现有 helper 接口，无修改权。尚需对新整包冻结指纹、独立专家与红队终审及逐目标完成审计。当前没有功能源码修改。

## 第一轮：UX 交付

Native invocation：`/root/notes_ux_review`；eval_run_id：`notes-ux-plan-r1-20261004-01`；对象为 v2 SHA。

> Status: FAIL（5/6）
>
> PASS X0：实际执行 hashlib，SHA256 与冻结值完全一致。
>
> PASS X1：同一 HTML 交付，用户确认 UI/交互/动效后才加工说明。
>
> PASS X2：来源与实现状态独立；人工修改、删除及冲突保护明确。
>
> FAIL X3 — MAJOR：键盘选区仅支持“从已选元素开始”，首次选择仍只有悬停、点选；无法保证键盘用户能新增或重绑到非可聚焦模块。需定义无需鼠标的首次目标选择、目标遍历和确认路径，并纳入 A-03。
>
> PASS X4：采用决定关联研究 claim ID；单文件、离线编辑与竞品未知项明确分开。
>
> PASS X5：阶段、依赖、离线往返及接收者查找任务具体，范围排除协作平台。

处置：v3 §4 定义初始目标树、父子/同级遍历、Enter 确认与 Esc 返回，包含不可聚焦的模块；A-03 追加全程无鼠标新增与重绑。原始 FAIL 已落账，终版待回验。

## 用户追加要求与终审对象

- R-12：说明内容本身有规范，采用自然、面向前端同事的 UX 语言；研究 Carbon/GOV.UK/Digital.gov 后形成 §3.1 写作合同，唯一实施落点为模块 content-guidelines.md，生成、人工模板和内容审查共用；A-11/C8 验证。
- R-13：AI 自动生成只覆盖本次新增流程/模块/组件，人工可跨全原型支持区域操作。§5.1 明确独立范围、跨页状态、共享组件实例、保留范围外条目；A-12/C9 验证。
- v4 冻结 SHA-256：`227e7fd05ce2db63f056153f7a43efa0e47bb6b309793261d593c10ce28cf432`。下面所有终审票必须重新实际校验该对象；任何修改需另冻结版本重审。

## 终审：红队

Native invocation：`/root/notes_redteam`；eval_run_id：`notes-redteam-plan-v4-20261004-01`。实际前后 hash 校验一致，未收到其他专家投票。

**PASS 7/7**：T0 版本、T1 需求阶段与范围、T2 事件/modal 高风险前置验证、T3 保存及人工保护、T4 内容规范与来源、T5 框架权限与真实样本/双端证据、T6 AI/人工范围分离全部通过规划门。未发现存活 MAJOR/BLOCKER。

原始逐项报告见 [独立红队记录](./2026-10-04-prototype-notes-redteam.md)。原始 envelope 已落账。真实运行验证仍须实施后取证。

## 终审：前端工程

Native invocation：`/root/notes_frontend_review`；eval_run_id：`notes-frontend-plan-final-20261004-01`。对象为 v4；原始报告：

> Status: PASS（通过率 6/6）
>
> PASS F0：hashlib 实测匹配冻结 SHA256；全文读回完成，未执行未来脚本。
>
> PASS F1：L240–252 保留源码快照、幂等重建、缓存失败降级及新版验收身份；A-04 覆盖两轮离线导出重开。
>
> PASS F2：L266–268 明确单 modal 内迁移 host、manual popover、焦点恢复和失败边界；U-002/A-09 验证关键组合。首轮问题闭合。
>
> PASS F3：L260–264 明确最早同步闸门、同控制器直接处理工具命令、保留输入默认行为及禁止事件重放；A-03 同验工具可用与业务不触发。首轮问题闭合。
>
> PASS F4：U-001–008 将高风险纵切置于完整组件之前，文件责任、阻塞门和回归路径足以指导实施。
>
> PASS F5：L220–228 分离 AI scope 与人工范围，明确范围外旧说明和删除记录保护；A-12 包含跨状态、同名实例及范围限制负例。
>
> Recommendation：工程计划可进入既定批准流程；隔离与模态方案仍须 P1 实测，本票不证明功能通过。

原始 envelope 已落账；首轮 F2/F3 正式闭合。

## 终审：框架接线

Native invocation：`/root/notes_framework_review`；eval_run_id：`notes-framework-plan-final-20261004-01`。对象为 v4；原始报告：

> Status: PASS（6/6）
>
> PASS G0：hashlib.sha256 实测为 227e7fd0…28cf432，与冻结值一致；已全文读取394行。
>
> PASS G1：§2、U-006/A-10 将确认绑定精确版本；确认后加工、组合验收，父级仅完成一次。
>
> PASS G2：U-005 已补受限 derive-from-accepted，重验前序、源漂移和实路径；保留普通 overlap guard、旧证书兼容及负例，首轮 MAJOR 已闭合。
>
> PASS G3：U-001–008 有文件、依赖和阶段门；U-008/A-10 要求 Claude/Codex 分别验证执行与拒绝路径。
>
> PASS G4：§5–6、A-05/08 保留人工字段与删除记录；新导出使旧票失效，工程消费须重验。
>
> PASS G5：§3.1 的唯一内容规范与现有 ux-writing/Packet 边界一致；§5.1、U-001/003/004/006、A-12 明确 AI 局部生成、人工全原型操作及范围外保留。
>
> 未发现存活 BLOCKER/MAJOR。此票通过可执行计划审查，不代表功能运行通过；实施仍待用户批准。

原始 envelope 已落账；首轮 G2 正式闭合。

## 终审：UX 与交付内容

Native invocation：`/root/notes_ux_review`；eval_run_id：`notes-ux-plan-final-20261004-01`。对象为 v4；原始报告：

> Status: PASS（8/8）
>
> PASS X0：实际执行 hashlib，SHA256 与指定冻结值完全一致。
>
> PASS X1：用户确认后加工，同一 HTML 交付（L73–97）。
>
> PASS X2：来源、实现状态独立；人工修改和删除受保护（L204–214）。
>
> PASS X3：首次键盘选择含非可聚焦模块，支持重绑、取消回焦点；查看、隐藏、过滤、导出闭合（L178–200、240–252；A-03）。首轮 MAJOR 已解决。
>
> PASS X4：竞品事实关联采用决定，离线编辑等未知能力未冒充事实（L58–69；研究 §4）。
>
> PASS X5：阶段依赖、真实样本及接收者复述验收具体（U-001–008、A-11）。
>
> PASS X6：写作规范唯一落点，生成、模板和审阅共用；术语、例子、无源数字限制明确（§3.1；研究 WR-01–05）。
>
> PASS X7：AI 限本次范围且要求完整覆盖；人工可操作全原型支持区域，范围外说明不被再生成破坏（§5.1、A-12）。
>
> 无存活 BLOCKER/MAJOR。可继续既定审批；本票仅确认计划可实施。

原始 envelope 已落账；首轮 X3 正式闭合。

## 关闭矩阵与收尾证据

| 首轮问题 | 修订落点 | 同版独立回验 |
|---|---|---|
| F2 原生 modal 会使同级工具 inert | §7 明确 host/顶层/焦点/失败边界；U-002/A-09 | 前端 final F2 PASS |
| F3 后注入选区监听无法阻止早期业务 capture | §7 最早闸门与工具控制器；U-002/A-03 同验工具可用和业务未触发 | 前端 final F3 PASS |
| G2 namespace 不能承接同根 accepted motion | U-005 受限派生与原保护保留；A-10 负例 | 框架 final G2 PASS |
| X3 键盘用户没有首次选区入口 | §4 目标树、父子遍历/重绑/回焦点；A-03 | UX final X3 PASS |

主控另做确定性文档检查：R-01–13、U-001–008、A-01–12、C1–C9 数量与唯一性正确；Markdown 围栏成对；最终计划 hash 与四票一致。功能脚本尚不存在，本轮未执行 §10 未来测试。

权限与作用域：仅四份 `framework-audit/2026-10-04-prototype-notes-*.md` 与规定的 `memory/evals/eval-log.jsonl` 评审落账。未改源码/运行规则/项目内容/别名/framework/；未做 Git 提交推送、外部 OD 写入或安装。未将框架任务绑定业务项目。

证据局限：研究为官方文档阅读，未运行商业产品；专家/红队均为独立 Agent，并非真人评审；最终通过是计划审查。实施阶段的真实 OD 来源、浏览器离线往返、兼容性及双 harness 行为必须另取证，保留 P1–P4 阻断门。

## v5：执行就绪补强

用户目标明确升级为“执行 Agent 看到计划后只需执行”。本轮将上一目标轮判为 progress（文件、研究、独立票均有实物），但不以旧票证明新增执行精度。

只读架构调查定位的真实缺口与处置：

| 缺口 | 处置 |
|---|---|
| 普通 raw 与 delivery root 重叠，同根 accepted 派生不能覆盖未做 motion 的默认路径 | E7.2 固定带日期的同项目 sibling notes 根，先纳入真实 effects 授权再调用原 prepareCopy；普通保护不变 |
| 单文件内联若删机器资产将违反 candidate 完整闭包要求 | E7.2 保留全部副本资产作为机器证据；用户只拿最终 HTML 去空目录断网验证 |
| required set 的一致不等于源分母完整 | E7.3 绑定 notes_manifest、继承 source/parent 集，实例测试与跨 harness 工程测试分开 |
| 普通 PREACCEPT/spec 模板仍明确只认 motion | E7.3 明确修改四处 owner，SCHEMA 只扩身份节，不启用第二生成器 |
| 当前测试现生成票不能证明旧 producer 字节兼容 | E7.2 冻结两份旧producer源码，在原临时绝对路径给新resolver消费并测drift |
| 数据/合并/模式/参数尚需执行者补定 | E1–6 明确输入、schema、合并表、定位范围、UI token/状态机和纯组包接口 |
| 真实样本命令和逐项证据未完全参数化 | E8 冻结 manifest、adapter、双引擎、EV-01–08、mutation及证据目录 |

本轮主控额外阅读 package.json；只读调查对 current helper、schema、runtime、OD/QG/Orchestrator/spec模板及 fixture seam 提供行号证据。构建 parser 补充采用官方 parse5 8.0.1/source-location 文档，仅定依赖方案，未安装。

## v5 节点／形式复审与冻结检查点

用户要求再次严审“哪个形式最好、在哪个节点插入”。只读替代分析由 `/root/notes_insertion_alternatives` 承担，结论只作论证输入，不计独立通过票。发现仅内部模块缺事后再次调用责任，方案已修订为薄公开 skill + 共享核心 + OD internal；比较与反证留在 decision.md。

新增 U-009，不重编号原有 U；新增 R-14/A-13。execution 明确三类输入、三层版本身份、业务回流 rebase、三种输入模式、恢复与完成责任，以及两条持续验证链。当前源码仍未改动，框架基线 HEAD 不变。

本次第一轮冻结集（四个文件必须一起审，后续修订须重冻结）：

| 文件（同目录前缀 2026-10-04-prototype-notes-） | SHA-256 |
|---|---|
| plan.md | 2751ffc6cbc4db56cbd2587300d95b69fecc28b7cde658c2a1defc599be92660 |
| execution.md | 4f4c0b5b89d248e7a0a4d75a2e9b2c59874649e506df6c15515ccb63c3065f7f |
| decision.md | 49828d37f86b5a9ae62624794fba615d91b9e540851dc0268626cc892d1055cf |
| research.md | 7f6bc9671e962386d4b9226d51b2ee9d80614f00c393ae8a729ca608b36c2e0d |

主控机械检查：R 14条、U 9条、A 13条且各自唯一；四文件围栏成对、相对文档链接可解析。它只证明文档结构，不代替语义会审。功能目录未创建；所有工程 EV/A 仍为未来验收合同。

当前在审：冷上下文 `/root/notes_v5_architecture`，phase/eval `notes-v5-architecture-20261004-01`；7条 criteria 覆盖替代比较、精确节点、三条生命周期、注册/模式、现有delivery接线和实施分解。后续依次为前端、UX内容和默认REFUTE红队；未获齐票前不称规划DONE。

恢复：核 HEAD 与 git status，按本表核四文件hash；读取本节之后的新票/问题表，等待或继续首个未闭合评审。不得以此前v4的27/27代替本轮四文件终审。

### v5 独立架构／节点／形式审查

Native invocation：`/root/notes_v5_architecture`；eval_run_id：`notes-v5-architecture-20261004-01`。对象是上述四文件冻结集；报告原文：

> Quality Gate: notes-v5-architecture  
> Status: PASS（7/7；仅规划门）
>
> - PASS G0：四文件完整读取，前后 SHA 均匹配；核心合同一致。
> - PASS G1：decision:30–39。加强 B 为“OD 新增本地加工模式”仍扩大 OD 输入职责；C 仍需统一接单入口。A 更适配，未被反证。
> - PASS G2：decision:53、execution:240–247 明确修改 Phase 5 确认规则及 Phase 6/P7 有限例外。
> - PASS G3：decision:57–68、execution:177–187、281：三场景有唯一完成者、业务回流及恢复合同。
> - PASS G4：execution:255–285 覆盖三模式、权限、双端注册及生成投影；不强制 graph/Brief/receipt。
> - PASS G5：execution:197–238 与现行 helper 六 API/schema 相容；新增派生、旧票及完整 required 分母明确。
> - PASS G6：plan:303–333、execution:289–359：九个 U 块、依赖、运行门和 CI 范围足以实施。
>
> 可继续审批实施；P1 真实样本可行性尚待验证，本票不代表功能通过。

严格原始 envelope 由主控 recorder 校验落账；判官没有写文件。存活 MAJOR/BLOCKER：0。下一票为同版独立前端工程审查。

### v5 独立前端工程审查

Native invocation：`/root/notes_v5_frontend`；eval_run_id：`notes-v5-frontend-20261004-01`。对象为同一四文件冻结集；原文：

> Quality Gate: notes-v5-frontend  
> Status: PASS（8/8，规划可实施性）
>
> P=plan.md，E=execution.md。
>
> - F0 PASS：四文件完整读取；前后 SHA 均与冻结值一致，核心合同一致。
> - F1 PASS：版本、稳定 ID、覆盖分母、逐字段三方合并及删除保护明确（E43–117）。
> - F2 PASS：早期控制器处理传播阻断后的工具操作；单 modal、IME、键盘树均有纵切与失败门（P265–275、308）。
> - F3 PASS：parse5 定位原文区间、不可变快照、双轮单文件导出、缓存分支及安全文本渲染形成完整合同（E117、153–177；P249）。
> - F4 PASS：rebase 保留区块间最新业务 bytes；重新确认、失效绑定和无法分离出口明确，人工记录继承（E179–187）。
> - F5 PASS：隐藏态、portal 根、重复实例、固定工具 UI 与性能边界可执行（E119–151、312）。
> - F6 PASS：已核当前 helper 175–365 行；API、副作用、闭包、旧票兼容与 required 分母扩展描述吻合（E193–247）。
> - F7 PASS：文件职责、依赖、真实样本 manifest、独立引擎、mutation 和 CI 接入齐备（P303–333；E289–359）。
>
> 未发现阻止按既定规则实施的 MAJOR/BLOCKER。可进入用户批准门；本票不代表运行功能已通过。

原始 envelope 已经主控 recorder 校验落账。存活 MAJOR/BLOCKER：0。

### v5 UX 初审：发现两项缺口

Native invocation：`/root/notes_v5_ux`；eval_run_id=`notes-v5-ux-20261004-01`。对象是第一轮四文件冻结集。原始判决已由 recorder 落账；原文：

> Status: FAIL（6/8）。仅判规划。P/E/D/R 分别指 plan/execution/decision/research。
>
> - PASS X0：四文件完整读取，前后 SHA 均匹配冻结值；版本一致（P5、E7、D3）。
> - PASS X1：确认后加工；首次与后续调用分开，不重开旧流程（D48–68）。
> - FAIL X2：允许人工全局规则（E91），但新增必经选区（E140–142），缺少无目标规则的创建路径。须补入口与键盘验收。
> - PASS X3：唯一规范、术语、模板及正反例齐备；来源与实现分开（P114、133–179）。
> - FAIL X4：范围与保护明确；冲突仅在框架摘要比较（E106），E135–151 未定义保留／采用／暂缓及建议清除规则。须补用户处置路径。
> - PASS X5：下载反馈、缓存分支、验收失效及业务回流明确（P245–257；E115–117、179–187）。
> - PASS X6：事实、设计推论、未实测边界分列（R21、69、87–99）。
> - PASS X7：真实 OD、五类复述、独立语义与一次 UI 采用均有门（P308、331、351）。
>
> Recommendation：修复 X2/X4 后重验；未将未来运行验证误判为失败。

主控将两项按 MAJOR 跟踪，均在授权的计划范围内修复，尚待原判官回验：

| Finding | 修订 | 验收落点 |
|---|---|---|
| X2 无目标规则入口缺失 | 主§4新增区域说明/整体规则选择；E4/5允许整体规则直达表单、全局/已知上下文、无画面pin | A-03/04与E8双路径键盘/导出 |
| X4 缺人工冲突处置 | 主§5及E2/3/5增加逐字段对比、保留/采用/暂缓/撤销、建议key、再次生成及来源状态规则 | A-05与E8各事务/重开/相同建议去重 |

第二轮冻结集：plan=`4c55f0064ab407ea9f31a6a830beaf7158e0958e4e3c4ca4e911f8bac9502f88`；execution=`fd3c23520792910c3de7a8bc3161d221d6c274e8893a5375ada9510108eca424`；decision/research不变。前述架构/前端初票保留历史，须回验本轮精确版本后才计终审通过。

### v5 UX 终审：两项缺口闭合

Native invocation：`/root/notes_v5_ux`；eval_run_id=`notes-v5-ux-final-20261004-01`。对象为第二轮冻结集，原文：

> Status: PASS（8/8）。P/E/D/R 分别指 plan/execution/decision/research。
>
> - PASS X0：四文件完整重读；前后 SHA 均匹配新冻结值，版本一致。
> - PASS X1：确认后加工；首次、再次调用及完成责任明确（D48–68；E275–299）。
> - PASS X2：整体规则可跳过选区；键盘、隐藏态、撤销、焦点和窄屏路径有定义与断言（P183–205；E155–169、319）。
> - PASS X3：唯一内容规范、术语、模板及正反例完整，区分来源与实现（P114、133–179）。
> - PASS X4：逐字段保留／采用／暂缓／撤销、建议去重和保守事实状态均已定义，并要求导出重验（E104–129、158–159、321）。
> - PASS X5：下载、草稿、验收失效及业务回流不误导（P247–259；E131、195–205）。
> - PASS X6：竞品事实、设计推论和未实测边界分开（R21、69、87–99、155–171）。
> - PASS X7：真实 OD、五类复述、独立语义与固定 UI 采用均有验收门（P310、333、353）。
>
> Recommendation：本票范围可继续；X2/X4 已闭合。此为规划通过，不代表实现或运行验收通过。

原始 envelope 已落账；X2/X4 正式 CLOSED。架构与前端继续对同一新版回验，红队仍需冷审。

### v5 架构回验：新增去重边界缺口与局部重规划

Native invocation `/root/notes_v5_architecture`，eval_run_id=`notes-v5-architecture-final-20261004-01`，原票已落账。对第二轮冻结集判 **FAIL（6/7）**：G0–G5通过；G6的MAJOR原文为：

> execution:114 要求目标变化后重新审查，但固定 suggestion key 不含目标身份；156–160 的重绑也未规定清除已处理键。保留同一 annotation/context/source/N，仅把目标 A 换成 B，按公式计算得到相同键，可能静默抑制必须重审的建议。

原报告其余证据：G0四份前后hash匹配；G1 decision:30–39的A未被加强B/C推翻；G2 decision:53、execution:260–265确认门/P7例外；G3 decision:57–68、execution:197–205、299三场景单完成；G4 execution:273–303三模式注册权限；G5 execution:217–256交付API/旧票/原分母。该票不宣称形式或节点被推翻。

按主§12做一次**局部 delta 重规划**，保留所有 U-ID、范围、形式及节点；仅补强新建议去重的目标身份：Annotation增加binding_revision；key纳入document/base/binding revision；重绑/改上下文/rebase递增并清除已处理键。旧建议保留可读但目标版本不符不可直接采用，当前人工文字不变。E8与A-05增加“已处理建议、同context由A重绑B”的反例。不是对失败测试的盲目重跑。

第三轮冻结集：plan=`1bf0396745f7a3d84e24c429245e4f51bca4e4e381a50f7d2fdef2146d6b7b06`；execution=`ee1bd6a7174e985683577e292c09a2300457343f35c4c4e6d4efdf910efe8625`；decision/research不变。先用冷红队反证整包，再以同版完成专家回验；第二轮PASS不冒充本轮终票。G6关闭以原判官回验为准。

红队前置检查：native `/root/notes_v5_preflight` 返回 PASS；实际核四份第三轮冻结文件存在与hash、standalone target明确、NO_PIN输出范围符合redteam合同，不要求未来功能样本或workflow-state。当前冷红队 invocation=`/root/notes_v5_redteam`，eval_run_id=`notes-v5-redteam-20261004-01`；未向其提供任何专家票或历史review。

## 最终需求覆盖审计（规划层）

以下检查“执行方案是否已定义”，不填写未来运行PASS。终审是否通过以随后同版票表为准。

| 用户要求 | 具体规划落点 | 实施验收责任 |
|---|---|---|
| R-01 专业交互说明 | 主§3/3.1，E1有源生成 | A-11语义与接收者复述 |
| R-02 开关/侧栏/数字对应 | 主§4，E4/5状态与定位 | A-01/02/09实际浏览器 |
| R-03 全局与模块UI/交互 | 主§3/4，E2与无目标整体规则路径 | A-03/11创建与内容分支 |
| R-04 AI初稿 | E1行为原分母/生成协议 | coverage及独立语义票 |
| R-05 人工增改删绑 | E3合并/冲突处置，E4/5全域操作 | A-03/04/05，含重绑后建议失效 |
| R-06 固定通用样式 | 主§7，E5工具token/唯一组件源码 | 首次UI采用及兼容性验证 |
| R-07 适配现有框架 | 主§1/2/9，E7真实API和登记 | A-10/13，两端真实调用 |
| R-08 专家与红队 | 本文件及redteam.md同版独立票 | 无存活MAJOR/BLOCKER；不借旧票 |
| R-09 同一离线HTML | E6快照组包，E7完整闭包/新票 | A-04空目录/断网/双轮导出 |
| R-10 动效迭代确认后 | decision D4/5，E1版本确认及Phase5例外 | A-10未确认/变版拒绝 |
| R-11 专业产品研究 | research AX/FG/ZE/UX，主§1.1映射 | 事实/采用/不采用/未知分开 |
| R-12 人对人UX写作 | 主§3.1，research WR，共享规范落点 | A-11五类说明，不编数值不AI腔 |
| R-13 AI局部/人工全域 | 主§5.1，E1/3/4守卫与人工picker | A-12全覆盖、零越界、外部人工往返 |
| R-14 深评形式和节点 | decision D1–7四形式/五时机比较 | 架构反证与红队冷审，A-13生命周期 |

### v5 冷红队：第三轮冻结集

`/root/notes_v5_redteam` 返回 **PASS 8/8**，eval_run_id=`notes-v5-redteam-20261004-01`。完整原文、四文件指纹及前置记录在同目录 redteam.md 的“v5 完整执行包独立红队”节；严格envelope已落账。未发现能推翻形式/节点或其余用户目标的存活MAJOR/BLOCKER。此票与架构/前端/UX终票共同完成本轮会审，不能代替尚未回来的同版专家回验。

### v5 架构终审：去重边界闭合

Native `/root/notes_v5_architecture`，eval=`notes-v5-architecture-r3-20261004-01`，第三轮冻结集；原票：

> PASS 7/7；原 G6 MAJOR 已关闭，未发现新增重大矛盾。仅判规划可执行性，未声称实现验收通过。
>
> - G0 PASS：四文全文读取，前后 SHA 均匹配冻结值。
> - G1 PASS：D3 比较最强 B/C；独立入口需求支持 A。
> - G2 PASS：P2、D4 明确确认后插入及 Phase5/6、P7 修订。
> - G3 PASS：D5、E7.5 明确三场景唯一完成者与恢复。
> - G4 PASS：E7.4 输入、路由、登记齐全，无强制 graph。
> - G5 PASS：E7.1–3 与现有 API、权限、来源及验收分母相容。
> - G6 PASS：E3:115–117、E5:163、A05、E8:324 联动关闭反例：重绑改变键并禁用旧建议采用；重绘保留键。公式复核成立，九 U 的执行范围完整。

原始envelope已落账。主控定位校注：原票G3的“E7.5”是章节编号笔误，恢复checkpoint实际位于 **E7.4**（execution第302行）；D5定位有效。保留原票措辞，不改判官JSON。G6正式CLOSED。

### v5 前端回验：多轮历史反例与完整状态补强

Native `/root/notes_v5_frontend`，eval_run_id=`notes-v5-frontend-final-20261004-01`，第三轮冻结集，原票已落账；原文：

> Status: FAIL（7/8，规划门）。P=plan.md，E=execution.md。
>
> - F0 PASS：四文件完整读取，前后 SHA 与本轮冻结值一致。
> - F1 FAIL / MAJOR：E79 仅存单个 resolved_suggestion_key，无法兑现 E115/P347 的去重承诺。同一来源/base/绑定下，依次保留 N1、N2，再生成 N1，旧 key 已丢，N1 会再次出现。须保存已处理 key 集合，明确撤销/重绑规则，并补 N1→N2→N1 导出回流反例。
> - F2 PASS：事件控制器、IME、键盘树及 modal 纵切/失败门保留（P267–275）。
> - F3 PASS：快照、parse5、缓存、安全渲染及离线双轮合同完整（E174–198；P251）。
> - F4 PASS：最新业务 bytes、重新确认及人工记录继承明确（E200–208）。
> - F5 PASS：整体规则无目标入口、动态定位、固定 UI 和性能边界明确（E136–172、333）。
> - F6 PASS：现有 API、旧票及 required 分母合同保持（E214–268）。
> - F7 PASS：实施文件、manifest、双引擎、mutation、CI 完整（P309–335；E310–380）。
>
> 建议先修复 F1，再关闭规划门；未运行未来功能测试。

本次不是无改动重跑：按§12将建议处理整理为持久化集合状态合同，补齐keep/adopt/skip/undo/rebind/redraw六种操作及五条顺序轨迹。scope、整体形式、精确节点、所有U-ID与工程范围不变。只把原本的去重承诺落实到跨多轮、缓存、导入/导出均成立的数据规则；未放松要求。

第四轮冻结集：plan=`8b49cd3197bbeb9124f2da444c9520e40a58bb29b8b75d19f534c9466fc05dc4`；execution=`4590d0eb168acbb2a90fe3f6864c73efa8628eddfeb486167ced5963e98933b5`；decision/research不变。第三轮红队及架构票仍只是历史，须对第四轮回验后计最终票。F1关闭以原判官回验为准。

### v5 第四轮前端终审：多轮历史闭合

Native `/root/notes_v5_frontend`，eval=`notes-v5-frontend-r4-20261004-01`，第四轮冻结集；原文：

> Status: PASS（8/8，规划可实施性）。P=plan.md，E=execution.md。
>
> - F0 PASS：完整重读四文件；前后 SHA 均与本轮冻结值一致。
> - F1 PASS：原 MAJOR 已闭合。持久化集合、优先查重、单步撤销、重绑清空及重绘保留明确；五条顺序轨迹覆盖 N1→N2→N1、采用不回滚及导出回流（E79、115–144）。
> - F2 PASS：早期事件控制器、IME、键盘树、单 modal 方案及失败门完整（P267–275）。
> - F3 PASS：快照、parse5、双轮导出、安全渲染及缓存分支保留；建议历史明确随缓存和导入保存（E126、144、184–208）。
> - F4 PASS：rebase 保留最新业务 bytes、人工记录并重核确认；旧绑定建议失效（E117、210–218）。
> - F5 PASS：整体规则直达表单；隐藏态、portal、重复实例和性能边界明确（E146–182、343）。
> - F6 PASS：API、副作用、闭包、旧证书及 required 分母合同一致（E224–278）。
> - F7 PASS：文件职责、依赖、真实样本、双引擎、mutation、CI 及新增历史轨迹齐备（P§9；E318–390）。
>
> 无存活 MAJOR/BLOCKER。可进入批准门；本票不代表功能运行通过。

严格原始envelope已落账。F1正式CLOSED；本轮其余终票继续串行收齐。

### v5 第四轮 UX 终审

Native `/root/notes_v5_ux`，eval=`notes-v5-ux-r4-20261004-01`，第四轮冻结集；原文：

> Status: PASS（8/8）。P/E/D/R 分别指 plan/execution/decision/research。
>
> - PASS X0：四文件全文重读，前后 SHA 均匹配本轮冻结值。
> - PASS X1：确认后加工；首次、回流与完成责任清楚（D48–68）。
> - PASS X2：无目标整体规则、键盘、隐藏态、撤销及焦点路径保持完整（P183–205；E168–182、332）。
> - PASS X3：内容规范唯一，术语、模板、正反例及事实边界完整（P133–179）。
> - PASS X4：人工保护、持久化去重集合、换绑失效和单步撤销已贯通；五条轨迹可验，采用不升级事实状态（E105–142、334）。
> - PASS X5：下载、草稿、验收失效与回流保护一致；新规则不恢复旧文字覆盖人工修改（P247–259；E126、144、208–218）。
> - PASS X6：来源事实、设计判断与未实测边界分开（R21、69、87–99、155–171）。
> - PASS X7：真实 OD、五类复述、独立语义及一次 UI 采用均有验收门（P310、333、353）。
>
> Recommendation：本票范围可继续。规划通过不代表运行验收通过。

原始envelope已落账。存活MAJOR/BLOCKER=0；原X2/X4修复仍成立。

### v5 第四轮架构／节点／形式终审

Native `/root/notes_v5_architecture`，eval=`notes-v5-architecture-r4-20261004-01`，第四轮冻结集；原文：

> PASS（7/7），可进入实施；未发现新增 MAJOR。仅规划通过，运行验收仍待实施。
>
> - G0 PASS：完整读取四文，前后 SHA 均匹配第四轮冻结值，跨文一致。
> - G1 PASS：D3 的最强 B/C 仍需补独立接单协议；A 统一入口且共享实现，符合用户目标。
> - G2 PASS：主计划 §2、D4、E7.3 明确确认后插入及 Phase5/6、P7 有限修订。
> - G3 PASS：D5、E7.4 checkpoint 保留三场景唯一完成者及恢复规则。
> - G4 PASS：E7.4 输入、Project Gate、注册与生成投影齐全，无强制 graph/假 Brief。
> - G5 PASS：E7.1–3 与当前 delivery API、权限、来源、旧票及 required 分母相容。
> - G6 PASS：E3:115–136 明确保护优先、历史集合、单步撤销及重绑失效；五条序列覆盖重复提示与人工文字回滚反例。E8.2:334 接入验收，九 U 无关键决定遗漏。

原始envelope已落账。其“可进入实施”指规划门允许后续批准，并不替用户批准；本轮仍未实施。原G6关闭且无新MAJOR/BLOCKER。

## 最终定案：DONE（v5 规划包，第四轮冻结）

最终选择：**公开可单独调用的薄 prototype-notes skill + 唯一共享核心 + OD 完成前内部调用**。节点：**UI/交互/可选动效迭代 → 用户确认当前业务版本 → 说明生成/合并/组包 → 最终组合验收 → 本次唯一完成者交付**。四种形式和五个插入时机的比较、反例及责任矩阵见 decision.md；独立架构与红队均尝试推翻，并未发现更符合本次硬条件的替代。

### 当前有效的同版终票

| 判官 | eval_run_id | 结果 | 存活MAJOR/BLOCKER |
|---|---|---|---|
| 框架／架构／节点形式 | notes-v5-architecture-r4-20261004-01 | PASS 7/7 | 0 |
| 前端工程 | notes-v5-frontend-r4-20261004-01 | PASS 8/8 | 0 |
| UX／交付写作 | notes-v5-ux-r4-20261004-01 | PASS 8/8 | 0 |
| 默认REFUTE红队 | notes-v5-redteam-r4-20261004-01 | PASS 8/8 | 0 |

合计31/31只是以上二元criteria的汇总，不是主观评分，也不是31项功能测试。均为独立Agent审查，不冒称真人专家会。每票原JSON通过record_eval.py校验，账本为memory/evals/eval-log.jsonl；原人读报告保留在本文件/同目录redteam.md。

| 当前冻结文件 | SHA-256 |
|---|---|
| plan.md | 8b49cd3197bbeb9124f2da444c9520e40a58bb29b8b75d19f534c9466fc05dc4 |
| execution.md | 4590d0eb168acbb2a90fe3f6864c73efa8628eddfeb486167ced5963e98933b5 |
| decision.md | 49828d37f86b5a9ae62624794fba615d91b9e540851dc0268626cc892d1055cf |
| research.md | 7f6bc9671e962386d4b9226d51b2ee9d80614f00c393ae8a729ca608b36c2e0d |

文件名前缀均为2026-10-04-prototype-notes-，都位于本目录。四份内容保持评审时字节不变，所以其页首“候选”是冻结时标识，**最终状态以本页同版终票为准**；不为改一个状态词而改变被审对象。

### 本轮发现与关闭

| 缺口 | 最终规则 | 关闭证据 |
|---|---|---|
| 整体规则没有无目标创建入口 | 区域说明/整体规则分流、键盘直达、无假pin | X2第四轮PASS；A03/04 |
| AI与人工冲突没有用户处置路径 | 逐字段保留/采用/暂缓/单步撤销，保守事实状态 | X4/F1第四轮PASS；A05 |
| 换绑后旧去重可能漏审新目标 | base/binding revision入key，旧建议不能直接采用 | G6/F1/T3第四轮PASS |
| 多轮生成遗忘较早已处理建议 | 持久化key集合、五条顺序轨迹、导出回流/撤销规则 | F1/X4/T3第四轮PASS |

### 完成条件复核

| 条件 | 证据 |
|---|---|
| C1 全部原始目标 | 14条R映射均有具体设计/实施/验收落点，见逐需求表；G0/X0/T0 |
| C2 最佳形式与精确节点 | decision D1–7，G1/G2/G3及T1/T2 |
| C3 来源与人工保护 | E1–3，F1/X3/X4/T3/T5 |
| C4 完整可观察路径 | 主§4、E5，X2/X5/F2/F5 |
| C5 同文件与动态状态 | E4/6/8，F3/F4/F5/T4/T6 |
| C6 固定唯一UI | 主§7、E5/6，F5/X7 |
| C7 独立同版闭合 | 上述四份原票31/31、同四文件hash、所有MAJOR关闭 |
| C8 写作规范与验证 | 主§3.1、research WR、E1，X3/X6/X7/T5 |
| C9 自动范围与人工自由 | 主§5.1、E1/3/4，X4/F1/T3及A12 |

实施分解为9个稳定U、4阶段；13条行为断言及明确的真实样本、双引擎、内容语义、双harness、CI和mutation门。已有框架真实接口、原保护区有限修改、公开入口登记、回流/恢复/一次完成均有执行步骤和文件责任。执行Agent不需重新选择能力形式或插入节点。

**边界**：DONE只代表本次研究、深度定案、完整实施计划与独立会审已经完成。功能代码、浏览器成品、真实OD兼容性、双端执行、接收者试用尚未实施，不能声称运行PASS。下一步须按E0取得用户对本计划的实施批准；真实样本/权限与用户设计确认只在各自明确门使用，不冒造。

**收尾范围**：六份framework-audit文档及必要eval落账；HEAD仍为d704734e53cc24096242b8595d4514d38831c83d。未改功能源码、运行规则、项目或framework/，未安装依赖、提交/推送Git、外部OD写入。恢复执行先核这四份hash，读E0，从U-001开始；实现进度另写新实施目录，不修改冻结规划包。

最终机械审计已实际执行并PASS：4份冻结hash匹配；14R/9U/13A/9C唯一；6份文档相对链接/围栏有效；账本中4个第四轮终票各唯一且同4路径、31/31、findings为空；HEAD不变，git status仅上述6文档与eval-log；功能目录未创建。此结果不冒充工程行为测试。
