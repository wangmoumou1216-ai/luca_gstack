# 非 Plan Agent：候选问题与实施方案 v3
状态：冻结的设计评审对象；最终评审状态见同目录 2026-10-07-agent-orchestration-review.md。本文件不含其他评审者意见。
对象：HEAD 5956da6be6997326e2cb0eb14e65bc8099e8c7fe；六正文的冻结 SHA 见同目录 evidence.json 的 subjects。
范围：只设计修复；本轮不改生产文件，不审 Plan Agent。修复后的原生行为、Claude/Codex双端验收均未执行。
缩写：O=.claude/agents/orchestrator.md；WA=work-agent-template.md；PF=preflight-agent.md；QG=quality-gate.md；FC=fact-collector.md；PJ=muse-proto-judge.md。

## AOR-01：独立验收前写 DONE
类别 CONFIRMED_DESIGN_GAP；严重度 MAJOR（持久状态不真实），不是已复现的生产越权。
证据：O421–427先写DONE，再调QG，只在FAIL回滚；QG205/363又把DONE当审查前提；O440–446从最后DONE恢复。直接写入器write_state.py138–152设置状态，无QG收据检验。直接被调skill deepresearch/SKILL.md496–503还要求内部写DONE，WA70–71要求完整执行；因此仅改O写入点仍留入口。
触发：产物和handoff已有；写DONE后、QG派发/返回前中断。
已有防护：O113–114与442不许消费未知、FAIL回滚；能减少错误后继，但不能使此时磁盘DONE对应真实独立验收，也未要求恢复补该票。
不变量：节点持久完成必须晚于全部该节点必需的独立验收及记录。

方案：
1. O管理的workflow节点从skill执行到独立验收期间保持IN_PROGRESS。O无论自身执行skill或委托WA，都在执行前明确当前节点唯一完成提交者为O；skill/WA完成产物、handoff及原有自检后，只回交真实执行记录和提交请求，不在内部提前写该节点DONE。执行报告的DONE仅指生产工作完成，不能代替workflow节点已验收。QG普通Skill Mode接受被本次调用明确选定的IN_PROGRESS待验对象，不要求未来DONE。
2. QG独立验真实产物、source/criteria和作用域；不以IN_PROGRESS或handoff自报作为内容通过证据。
3. 主控核对当前对象的有效独立票和required全分母，完成适用的eval recorder及属于当前节点完成条件的必需Human Gate之后，才用既有唯一writer写DONE；未来节点的真人门不得提前阻断当前节点。CONDITIONAL_PASS仅在原skill合同允许且全部required通过时可终结，原要求精确PASS的门保持。
4. 记录失败/冲突保持IN_PROGRESS或既有失败语义，不把重试转成重新执行产物副作用。正常记录幂等性复用现有recorder。
5. 恢复同一节点时先核当前产物身份/票/记录；旧DONE若不能证明本节点所需验收，先阻断其依赖消费、把本次恢复的精确节点转为IN_PROGRESS，再补缺失验收；此转换前后中断都不能凭旧DONE放行。不自动重跑产物，不批量重写历史节点。有旧票但无对象身份不直接采用。
位置：O §3.4c/d/3.5、WA §0b完成回交、QG §2.1 workflow-state/§3 Skill Mode。必要的直接兼容修改只涉及完成接口：office/references/handoff-protocol.md明确O管理节点的提交归属；office/deepresearch/SKILL.md完成协议Step 2将受管workflow分支改为回交请求。实施时对本次获准路径中的每个skill完成入口核此分支，未适配的入口不得派发或声称已覆盖；不能仅靠返回后把DONE改回去。这是六角色接口修复的直接依赖，不将所有skill新增为本轮深评对象。standalone保留自身真实完成合同，不新增O/QG或workflow状态依赖；没有workflow节点不写节点状态。若需记录当前票与产物身份，在现有handoff已有证据槽追加引用，不建平行状态机或通用签名服务。
验收用例：正常PASS只有一次终结；在skill内部原完成写入点前后、产物完成、dispatch后、回票后、recorder后、当前节点Human Gate前后、DONE前后及旧DONE转待验前后注入中断；主控直接执行及WA委托的deepresearch都不得在回交前把节点写DONE，未适配skill拒绝启动；缺票/旧hash/UNKNOWN/记录冲突/当前必需人类决定未答不能进入后继；已有有效票和记录可恢复不重复外部效果，未来节点人类门不误阻当前完成。standalone正例不依赖新建workflow或O存在。
残余：writer本身不是全局授权/语义判官；本方案首先闭合O↔QG合同。真实host能力、票关联读取与集成测试须实施后验证。

## AOR-02：冷启动派发输入未闭合
类别 CONFIRMED_DESIGN_GAP；严重度 MAJOR（合法调用缺必要上下文导致门不可确定），不声称已产生假PASS。
证据：O130/411只列PF skill_name+topic；PF25模式缺省standalone，PF26–27须project_session/input_paths。O319–322和QG121–126都只列phase、outputs、blockers、assertions等，QG132–135第一步却要WA.status。
触发：按清单完整组装冷调用；PF丢workflow模式，QG没有status。blockers空数组不能推断DONE。
防护：主控持有原报告，PF51需核实际合同，QG明确拒绝BLOCKED/NEEDS_CONTEXT；这些规则没有补齐必传输入。

方案：
- O两个PF调用点及parallel复用点：显式传skill_name/topic/execution_mode/经核验project context/精确input_paths；workflow输入不能依赖缺省standalone。
- PF保留直接standalone的便利默认；由O发起的调用必须显式给mode。项目身份由宿主验证，传父SID/路径不等于子会话权限；NO_PIN只用框架授权输入。
- O→QG的Free Task输入以completion_evidence区分真实来源（这是输入种类，不新增执行状态）：wa_phase传完整原WA completion_report及原调用引用；main_phase传主控自身完成记录并标明producer=main（不能伪造WA身份）；aggregate传本次已获批计划冻结的全部required Phase集合及每项真实原记录/适用验收引用，不用一份合成WA报告替代分母。三类都保留实际status/outputs/blockers，phase_id与真实来源相互校验，不设可漂移重复字段。引用验收票必须对应当前产物身份，同phase的新产物不得沿用旧票。
- 缺本类必需记录/status、非法枚举、phase不符、DONE却有required skipped/blockers、aggregate缺required Phase：返回具体失败/缺上下文，不运行断言、不猜状态；BLOCKED/NEEDS_CONTEXT保留原原因。wa/main的当前执行完成、或aggregate全部required执行完成后，才进入本次独立验证。作者自报只说明可开始验收，不代替本次QG判决；已有Phase票不替代最终全断言验证。DESIGN_DRAFT/PREACCEPT既有输入facet不被此普通Free Task合同误覆盖。
位置：O §2b/§2.3/§3.4a-pf，PF输入/模式说明，QG §1.1/1.2。旧caller缺字段当次拒绝并列补项；不从聊天或“最新”文件恢复。
验收：wa/main/aggregate三类各有合法正例；DONE/BLOCKED/NEEDS_CONTEXT/缺status/未知status/错phase/required skipped、aggregate缺一Phase各有负例；用不会产生副作用的探针证明拒绝分支未运行assertions。main正例不得伪造WA身份，aggregate不得缩分母或免最终断言。PF workflow必须检查选定上游；standalone和NO_PIN不得被误加项目状态依赖。两端各用真实冷调用留输入和返回证据。
残余：显式payload仍需语义/授权核验，不能把schema合法当用户批准。

## AOR-03：skill内部编排与WA禁止子代理冲突
类别 CONFIRMED_DESIGN_GAP；严重度 MAJOR（合法skill任务无法同时满足合同）。
证据：WA49/244禁止派Agent；WA70–71要求完整执行skill；O140–143可把非交互skill交WA，O533却说WA内部子代理由WA管理。直接skill deepresearch174允许subagent调用、229规定研究agents。非交互性不等于无需内部编排。
不变量：被接受的执行路径必须能同时满足所有适用合同。
防护：O implement单活跃/禁止嵌套明确有效；但不能消除非implement的合法skill_execution冲突。

最小方案：
- task_execution继续绝对禁止WA派Agent。
- skill_execution只允许执行已获批目标SKILL.md明确要求的内部委托；O派发时在既有INHERITED_CONSTRAINTS中明确是否准许、有限scope、获批预算/并发上限及取消边界。模式分流前必须实际消费共用scope/输入/继承约束；§0b只跳过task的具体执行步骤，不再跳过这些共用前提。缺明确许可仍禁止，不能从“skill可调用”自行推导任意派发。
- 父级预算按整棵委托子树累计：O在既有Phase/派发表内为每个skill WA分配不相互重复的额度，子级只能拆分自身剩余额度，不能各继承父级总额度。并发统计包含全部在途后代；不能可靠追踪或分配时停止新增派发。取消逐级传至后代，停止新动作并报告不能中断的在途项，真实完成/确认结束前不释放占用；不以主WA的技术turn结束假装后代已结束。
- 允许内部子任务的权限最多为父级交集；不变更用户model/effort、外部效果、HITL或原生关键串行门。只执行已有skill内部方法，不新增全局调度器。
- implement一律不许嵌套；需要内部委托的skill不能进入其WA执行分支，由主控保持原U-ID说明不适用/等待已有获准执行路径，不能通过例外突破单活跃。
- 宿主无必需子agent能力：明确BLOCKED/NEEDS_CONTEXT，不以作者内联自评替独立判官，不静默换main_agent。原skill中明确允许的非独立研究降级只按原合同，在不伪造独立性的前提执行。
位置：WA49/§0b/§4，O §2b/§2.3/§6；无需更改Plan Agent或新注册Agent身份。
验收：普通task WA拒绝spawn；无委托授权或未实际读继承约束的skill WA拒绝；获批非implement skill只完成许可范围子任务；两个WA不能各复制父总额度，实际全树在途数不超父上限；越界模型/文件/外部effect拒绝；implement路径始终拒绝嵌套；取消后后代停止新派发并报告在途，未结束不释放占用。核现有技能交互门/独立context及重型隔离不回退。
残余：能力例外必须由实际宿主验证，prompt约束不是sandbox；若运行时无法提供必要保证，保持不可执行而非伪称修好。

## AOR-04：必读集合被10文件预算截断
类别 CONFIRMED_DESIGN_GAP；初判MINOR（静态合同冲突；若实测丢权限/业务约束则上调），该次缺必读仍阻断执行。
证据：WA100/193要求全部先读；WA300规定最大10个，超出优先最相关的。
触发：合法INPUT_FILES有11项，第11项有唯一必需约束。
防护：歧义可NEEDS_CONTEXT，但择要规则本身仍授权省略。
方案：把10改为派发前上下文预算提示；必读分母冻结，不按数量/相关性裁剪。先分批读必需材料或由parent在原scope内拆任务；容量真实不足返回NEEDS_CONTEXT并列未读项，不能边写边补。只对可选参考排序。
位置：WA §1/§3/§7，同一不变量一处全文其余短指针。
验收：10项正常；11项第11项约束会改变正确输出；不可读第11项须停止其依赖动作；11个可分批材料不应只因数量被永久阻断；未读可选材料不得假称必读全覆盖。
残余：真实context容量无法从文件数推断；不引入虚构token遥测。

## 未升级为确认bug的线索
- WA56残留MODE走task_execution、DONE_CRITERIA到Self-Verify才检查：上游要求全部填好，是异常派发下的防御性缺口；尚未证明合法路径绕过，暂RISK_ONLY。可在AOR-02测试中观察，不先扩大修复。
- WA73–77固定docs/handoff和glob：NO_PIN适用性及原skill覆盖需针对真实调用核验，暂RISK_ONLY；不声称已写入错误项目。
- QG helper接受gate_result PASS但criterion UNKNOWN/FAIL：实际脚本probe exit0，仅证明其是格式检查；QG后续独立语义验证/required规则仍在，不能据此断言完整门误放行。
- PF未列skill仍读实际合同、跳过不含安全门；FC出处PASS不是内容采纳；PJ旧校准明确弱证据：目前为既有防护，非待修缺陷。

## 验收与实施次序
建议先AOR-02（显式输入）→AOR-01（完成提交），随后AOR-03（能力兼容）、AOR-04（完整必读）；先保留每个旧合同反例，再作最小修改。
现有回归命令：node scripts/check-agent-contracts.mjs；node scripts/check-model-table.mjs；node scripts/check-routing-map.mjs；node --test scripts/test-fact-candidates.mjs；python3 scripts/test-gate-verdict-recorder.py；node scripts/test-quality-gates-scope.mjs。
以上现有suite不覆盖新方案全部行为。实施者须为上述逐点中断、缺字段与真实委托增加测试/冷调用，证明改前红改后绿；禁止只加字符串断言宣布修复。
报告/方案可交付与生产就绪分开：确认的MAJOR尚未实施，SYSTEM_READINESS保持BLOCKED，IMPLEMENTATION_ACCEPTANCE=NOT_EXECUTED。
