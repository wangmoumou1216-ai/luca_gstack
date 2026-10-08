# U014-a-fix 编排最小可采用修复

已从旧版05120197构造可集成的最小patch，**2文件、13行增加/7行删除**；不是把原132行候选整体采用。现有契约86/86、保护/接缝16/16通过，正向/反向apply检查exit0。状态DONE_WITH_CONCERNS：构造与自测完成；精确新版指令消费、非作者逐项采用及发布归root，模块二持续处理返修，不在报告处终止原升级任务。

## 可立即收取的精确产物

- [patch](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/adoptable-minimum.patch)，SHA256 `e164955742a703ab483a9f6d0f3a7dc72648b09532884ae807e4b51ab30ec55a`。
- [完整收取清单](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/minimum-patch-ready.json)与[原始输入身份](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/inputs.json)。只向本人临时目录写候选/测试镜像，不写root/新集成WT，也不覆盖当前工作树的全量候选。

| 文件 | 旧版SHA256 | 本次最小候选SHA256 / 范围 |
| --- | --- | --- |
| `.claude/agents/orchestrator.md` | `3eed1c58e4c6cbdd5b3a8ad0fa3c0841723012de0cf789fb7f369980905dc29e` | `33073be1c0766746d9fc5a936adcc34a303a17fa2506d439c879fbe6e98ae21b`；§2d、§3.5确认分支 |
| `.claude/skills/office/auto/SKILL.md` | `2806bf06a486818934a194a4355713ddc395bc838860ed1ec47689ebf1494078` | `75de696b34da6cb286c366e84e9f20f2c8c95a8340b4df1629bdce67e8bc54b3`；§3.3重试入口、W9等待/重试接缝 |
| `.claude/agents/work-agent-template.md` | `2d4fb9acbdaff28f82c207b4f085fb8cc6b3c5f695d1baa0f7a781f57ca67bf2` | **原字节未改**；本次没有必须修改模板的接缝，不为凑三文件带入共读输入、MODE、handoff或Context改造 |

基线来自真实git blobs。root若当前main漂移，须在其隔离集成树重新绑定preimages并检查同一语义，不能强套旧hash。未纳入的完整候选仍原样保留；本次不移入driver、评估工具、全量startup缩减、新schema或审计制度。

## 两项旧反例与修复价值

| 旧版问题及可复查来源 | 具体修复 / 保留用途 | 用户收益、证据层与反证 |
| --- | --- | --- |
| orchestrator旧§2b主会话skill分支已说“已有明确后续授权且无未决Human Gate时继续”，但后面的§2d每Phase无条件“等待用户确认”；§3.5在用户明确继续后仍问“是否继续”。同文档控制冲突，已授权任务可被机械停顿 | 只将再次确认改成两分支：下一步处于**当前有效执行授权**且无未决Human Gate则继续；缺授权/计划范围变更/真实待决事项仍等真人。首次Supervisor/Hierarchical计划批准、Plan不授执行权限、独立验收/eval全部原样 | 消除共享指令的重复确认冲突，可减少不必要催办是待测行为收益。没有旧模型停顿→精确最小新版继续的配对观测；当前desktop高优先级持续执行指令可能已覆盖旧文案，若两版本同样继续，不宣称实际提速或省一次询问 |
| auto旧W9“超时无响应（>5min）→同BLOCKED首次处理”，后者“重新启动同一WA、传相同参数”；§3.3产物缺失又可直接重试。wait返回超时而任务还活着时，该指令导向第二执行；已完成效果也可能被重放 | W9区分**等待返回与任务终态**：原句柄继续收取；无可观察终态则暂停该依赖/报告缺口。仅原执行已终止、在途已收取、效果核对后，按已有授权重试未完部分。§3.3缺产物转W9，不绕计数。NEEDS_CONTEXT补料后续未完部分 | 原生工具确有“timedOut且inProgress”及进程yield后同句柄终态，是已观察的必要区分；删除直接重启理由可防重复效果，精确最小新版实际遵守仍待root消费验证。若确认真实失败后不能进行既有一次合法retry，或真实Human Gate被跨越，则该patch不通过 |

原目的保持：职责分工/独立回收、顺序依赖、实际失败与恢复、准确消费和持续完成；不是减少Agent/质量门。代价是少量共享控制文案和W9终态/效果核对，原生最小替代是同一执行对象等待至真实终态、明确当前授权。这里修现有矛盾，不新造调度或平台。没有质量/成本权重、使用频率或总体价值分数；13/7只描述范围，不证明收益。

## 原生语义、复用证据与现有自测

当前可用工具 `wait_threads` 文档明确timeout只返回各对象progress；一次只读0ms快照真实返回`timedOut:true`、root现有turn `inProgress`、error null、completedAt null，记录为[原生等待投影](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/native-wait-existing-chat-projection.json)。没有新建任务/模型或制造5min等待；该对象是已有协调chat，不是本patch下WA实测，不把0ms称>5min或采用行为。

复用root明确允许的N-A/B：[N-A原工具选段](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/n-a-selected-existing-receipts.json)实际session18948/63034，初次yield250；沿原句柄得到exit0/23，A一次效果、B原失败且无final。[N-B选段](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/n-b-selected-existing-receipts.json)明确仅许B一次retry，session53276同句柄exit0，A未重做；J19独立票支持这段限定行为/保留原失败。原始来源是root已导出的选定工具记录；不读取其source_path指向的private rollout，长JSON首读截断后只提取有关4条，并不声称整份逐字读完。

这些任务消费的是此前完整候选，不是本次`33073…/75de…`最小候选。可以证明该原生等待/有界retry做法确实可用，并限定旧合同冲突的意义；**不能给精确新版本继承模型行为通过，也不能证明真实两Agent协作、auto项目完整链、>5min旧模型重启、相对速度或全量编排净收益**。

本次[原样既有契约检查](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/existing-agent-contracts.log)为86/86，使用baseline真实依赖镜像加这两份候选，不在当前混合工作树造绿灯。原始[镜像身份](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/static-mirror-inputs.json)逐文件可回算。另[保护与接缝检查](/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u014-orchestration-adoptable-xl61j9l4/protection-and-seam-checks.json)16/16：首次批准、implement确权/单活跃、preflight/参数、独立QG/eval、workflow真实门、模型关键约束、auto工具切换/OD retry计数、frontmatter/模板/JSON/结束标记均原字节保持。一次retry上限未变，真实失败/取消/资源上限不因等待规则豁免。正反apply检查均exit0，回退为准确inverse patch；未知effects不盲重放。这些是静态/身份检查，不伪称运行了文案。

## 所需最少定向行为闭合（root决定是否登记至多两次专项）

先将本patch及上述旧反例交非作者逐项判断：是否已足以采用**共享合同纠错**。若仍须验证精确文案对实际行动的影响，使用一对来源消费试次（旧版1、最小新版1，共至多2完整专项），不再使用失败P系列入口、不挪开发/hidden池，不因无差异追加轮次。

两试次使用同一临时可逆任务、相同原事实/权限/模型条件/资源上限，明确完整两阶段的有效执行授权；显式读回精确两文档hash。第一阶段用原生执行对象，让真实wait返回尚在运行状态，保存同ID、工具起止与最终终态/效果计数；第二阶段属于已有授权、依赖已真实完成，应继续并产出合格结果。另一个真实待决事项未给答案，应明确等待/NEEDS_CONTEXT，不能从授权范围猜选项或写未授权final。如设真实受控失败，只有原终态后的一次已授权未完retry可执行，原成功效果保持一次；不把任务内合成事件冒称真实人类新授权。

预先判据：无重复对象/效果，等待不误转失败；既有授权内继续且required结果完整；真实未决Human Gate保持，独立验收和原retry计数不变。若未产生>5min真实对象，不声称覆盖旧5min触发；可以限于原生wait/终态分类及源合同纠错。若高优先级规则使旧新行动相同，只记无观察行为差异，是否作为维护一致性修复采用交非作者，不用文本断言造收益。所有父子/等待/失败与root协调成本仍留原账，无注册不启动；本owner本轮0模型、0新增Agent、0资格试验。

## 当前采用边界与持续责任

本次建议正式进入root最小修复版的逐项验收，优先解决这两条可定位矛盾。真正程序执行证据、共享文案静态正确性、精确新版模型消费与相对效率分别陈述；不把最低层证据冒充全层。root集成后核当前main、相关闭包/跨宿主执行或明确退化、独立review，再按已有授权发布；本owner不commit/push、不动其他owner、不重设全量候选或其失败。

Claude共享文本不新增Codex专属工具名；用本宿主实际wait/终态primitive，无对应观察能力时停受影响依赖并报告缺口。未实测Claude运行，不称跨宿主parity。原完整候选的MODE/输入/handoff/DONE顺序/Context等其余修改未纳入这次patch，继续留候选。新增维护成本、迁移效果和同质量相对资源尚未量化；整体三模块重构不因局部发布自动完成。

归因L4：重复确认与wait超时→重启是共享编排合同矛盾，重读旧规则仍复现；处置为上述已授权源头最小patch，未写长期memory/观测规则或新增治理机制。持续接受root具体finding并在原责任范围返修；源版本一旦改变，更新hash与必要验证，不拿旧票替新版本。

<!-- FILE_END: u014-orchestration-adoptable-fix.md -->
