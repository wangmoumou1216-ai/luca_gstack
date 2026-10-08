# Agent 编排体系评审与改进方案
日期：2026-10-07。交付状态：DONE_WITH_CONCERNS。评审与方案完成，终版独立核验通过；生产修复及双端运行验收未执行。

## 结论

核心角色划分可以保留。问题集中在角色交接合同：**完成状态提交太早、冷调用丢失必要输入、skill编排能力与执行模板相互矛盾、必读材料被预算规则截断。** 建议修正这些接口，不重建一套 Agent OS。

本轮识别四项有当前原文和最小触发场景支持的合同设计缺口。没有把它们写成已发生的生产事故；也没有证据证明所有真实 Claude/Codex 调用都会触发。Fact Collector 的出处/内容分权、Preflight 的不可跳过安全边界、Proto Judge 的 PARTIAL 与弱校准声明均有现成防护，应保留。

交付范围是六角色深评和经独立审查的可落地方案，**不包含实施修复**。Plan Agent 已按用户要求排除，仅阅读其执行纪律以开展本次任务；没有将其问题或检查通过计入本轮结论。

## 对象、授权与独立性

- 源会话：评审 Agent 编排体系与改进方案，`01a11575-70e6-77a1-85b4-4a38b368b743`。该会话因派发错误没有有效独立票据，本轮未复用那些“成功”声明。
- 源工作树与当前工作树 HEAD 相同：`5956da6be6997326e2cb0eb14e65bc8099e8c7fe`；当前工作树启动时干净。
- 本轮 NO_PIN。只写本次 framework-audit 文档和临时测试夹具；六正文、Plan、framework/、项目状态和 memory 均不修改，无 Git 发布。
- 用户此前明确授权当前 session 派 subagent，并允许本次 Sol。本轮通过原生 collaboration 派发，没有创建侧栏聊天或冒充真人专家。
- 五个专业视角初次均 `fork_turns=none`，不接收主会话历史或其他专家意见。后续只接收被审候选/方案及自己的修订要求。单一模型族的不同冷上下文并不构成统计独立样本或模型间一致性证明。
- 工具可证明这些子任务实际返回；没有暴露可据以宣称 peak 的模型采用票，本报告不声称 peak 或双宿主实测闭合。

### 冻结正文

| 对象 | 行数 | SHA-256 |
|---|---:|---|
| Orchestrator | 538 | 6fb9ea1db97125026fcbccd68f8bbfdd3150f713652b10ae46b3b66ea8c436d8 |
| Work Agent | 307 | 2d4fb9acbdaff28f82c207b4f085fb8cc6b3c5f695d1baa0f7a781f57ca67bf2 |
| Preflight | 137 | 8a2d28351a7c60d50a5beadf5d5ad752890d61426542673acb1387b5a556463c |
| Quality Gate | 463 | 11078c693bff65123d7ded36362b1e8f92a6e957e42913aba04ec366df3b60ff |
| Fact Collector | 96 | 18543fe72f88e43c4dd25cac4c3cd52be3b1231b1dcf2609a79741ab4b3f80da |
| Muse Proto Judge | 78 | 71e3a1b42c2c53ba98a38c7700b0b3c2fe8f229aace9012c7a768387fcbfc4a6 |

全部来自当前根的 `.claude/agents/`。完整绝对路径和逐次工具证据存于 [evidence.json](/Users/luca/.codex/worktrees/a65e/luca_gstack/framework-audit/2026-10-07-agent-orchestration-evidence.json)。

## 四项确认问题

### AOR-01 · MAJOR：先落盘 DONE，再取得独立验收

[Orchestrator:421](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/orchestrator.md:421) 的顺序是写 DONE→派 Quality Gate→FAIL 再回滚。[Quality Gate:205](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/quality-gate.md:205) 又要求被审节点已是 DONE，形成提前写完成的循环依赖。

最小触发：产物与 handoff 已就绪，写 DONE 后、QG 派发或返回前发生中断。此时磁盘已经表示完成，但独立验收没有完成。正常 FAIL 回滚，以及恢复时不消费失败/未知的规则，能降低误用风险，却无法消除尚未得到任何判决时的落盘矛盾。直接写入器源码也未替主控补验 QG。

独立方案复核又发现同一接口的内部入口：[deepresearch:496](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/skills/office/deepresearch/SKILL.md:496) 要求 skill 自己写 DONE，而 WA 要求完整执行。因此仅把 O 的写入移后仍不够；此处作为六角色接口的直接依赖证据，不另增一个 skill 深评对象。

不变量：持久完成应是必需验收的结果。修复让待验保持 IN_PROGRESS，QG 可审待验对象，当前票、必要记录及当前节点必需人类决定闭合后才由 O 提交 DONE。受管 skill 无论直接执行还是经 WA 委托，都只回交产物和完成请求；必须同步适配直接完成接口，未适配的入口不派发。standalone不新增 workflow 依赖。恢复只补缺失门，不重放已成功外部效果。

证据级别：原文冲突与直接实现旁证；没有 live 崩溃重现。分类 `CONFIRMED_DESIGN_GAP`，不是 `CONFIRMED_BUG`。

### AOR-02 · MAJOR：派发清单没有传消费者必须使用的字段

[Orchestrator:319](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/orchestrator.md:319) 和 [Quality Gate:121](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/quality-gate.md:121) 的 Free Task 清单不含 WA.status；QG 的下一步却必须据 status 区分 DONE、BLOCKED、NEEDS_CONTEXT。主控拥有状态并不等于冷判官收到状态。

同类接线问题出现在 [Orchestrator:130](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/orchestrator.md:130) / 411 的 Preflight 调用：只列 skill_name+topic，而 [Preflight:25](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/preflight-agent.md:25) 的 mode 默认 standalone，另需项目身份和精确输入路径。workflow 调用不能依赖此默认值。

最小触发：完全按列出的清单组装冷调用。结果是判官缺必要分支数据，或 Preflight 被按错误模式调用。现有 scope 和失败规则并非无效，但没有明确补齐传输合同。

修复应按真实来源传完成证据：WA执行传原 completion_report，主控执行传自身完成记录，最终汇总传冻结的全部 required Phase 及各自原记录，不能伪造单份 WA 报告。PF 显式传模式、已验证上下文和精确输入。缺失、非法、相互矛盾的字段在执行断言前拒绝；不能靠空 blockers 推断 DONE，已有阶段票也不能替代最终全断言验证。

证据级别：双边原文合同。严重度有分歧：可靠性视角初判 MINOR，架构与科学视角判 MAJOR；本报告按“合法清单无法满足消费者必需步骤”定为 MAJOR，不声称已证明假 PASS。分类 `CONFIRMED_DESIGN_GAP`。

### AOR-03 · MAJOR：skill 必须完整执行，但 WA 绝对禁止其内部子 Agent

[Work Agent:70](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/work-agent-template.md:70) 要求完整执行 skill，[Work Agent:244](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/work-agent-template.md:244) 又绝对禁止启动子 Agent；skill 模式只跳过 SECTION 1–3，没有豁免硬约束。与此同时，[Orchestrator:140](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/orchestrator.md:140) 允许委托需要内部 Agent 的研究 skill，533 行还说内部子 Agent 由 WA 管理。

最小触发：非 implement 的获批 skill_execution 需要独立研究者或判官。完整执行 skill 和遵守 WA 禁令不能同时满足。返回 BLOCKED 能防止虚假成功，却不能使这条合法派发路径可执行。

修复建议保留 task_execution 的禁令；skill_execution 的内部委托仅在原 skill 必需且父级明确批准时允许。模式分流前先读共用 scope、输入和继承约束；额度按整棵委托子树分配，所有在途后代计入并发，取消未结束不释放占用。模型、权限和外部效果不得超出父级。implement 保持不嵌套。不得用“允许调用skill”推导任意子代理权限。

曾考虑将所有多 Agent skill 移入主会话；本轮不采用这种一刀切做法，因为重型上下文隔离及已有 subagent 输入合同仍有价值。具体能力例外必须经方案反证和实际宿主验收，不能凭文字宣称运行时保证。

证据级别：当前正文矛盾与直接 skill 消费合同。分类 `CONFIRMED_DESIGN_GAP`。

### AOR-04 · MINOR：必读全集与最多十文件互斥

[Work Agent:100](/Users/luca/.codex/worktrees/a65e/luca_gstack/.claude/agents/work-agent-template.md:100) / 193 要求执行前读完全部必读文件，300 行却规定最多 10 个，超出按相关性选。合法输入若列 11 项，合同没有一致执行路径。

修复只需把数字改成派发预算建议：必读集合不可静默裁剪；可分批读取或由父级在原 scope 内拆分；真实容量不足时报告未读项并停止依赖动作。可选参考可择优。

可靠性专家判 MAJOR，科学与人机视角判 MINOR。本报告区分“已证实的合同互斥”和“尚未观察到的关键约束丢失”，暂定 MINOR；这不允许某次执行省略必读材料。第 11 项若实际承载安全约束并被遗漏，需按影响升级。

证据级别：同一模板内部直接冲突。分类 `CONFIRMED_DESIGN_GAP`。

## 六角色 × 十二维度

A=当前合同有相应防护；F=本报告确认缺口；U=真实运行或测量未验证；N=该职责不承担此要求。A 不代表生产行为已经通过。O/WA/PF/QG/FC/PJ 对应上面的六角色。

| 维度 | O | WA | PF | QG | FC | PJ |
|---|---|---|---|---|---|---|
| 职责专业性 | F03：内部编排边界 | F03：职责冲突 | A：只检查不修复 | A：判断与记录分离 | A：只给候选 | A：AC核验不代UX审查 |
| 合同严谨性 | F01/02/03 | F03/04 | F02：调用mode不完整 | F01/02 | A：固定请求与候选schema | A：逐AC状态 |
| 科学性 | F01：完成先于验收 | F04：输入分母冲突 | A：实际输入核验 | A：证据/UNKNOWN；U：误判率 | A：出处≠内容，脚本已测 | A：明确弱校准；U：现版一致率 |
| 独立性 | A：冷派发要求 | N：生产者，自检非终验 | N：前置检查非独立终验 | A：冷审；U：实际各facet隔离 | A：冷快照；U：原始消息无硬隔离 | A：不传生成历史；U：live隔离 |
| 权限安全 | A：scope/取消/implement界限 | A：冻结根/保护项；F03 | A：不可跳过真人/授权门 | A：无写权声明；U：宿主强制 | A：来源授权/禁新来源 | A：不改对象；U：宿主渲染权限 |
| 证据链 | F01/02 | A：原输出/阻断；F04 | A：精确输入/handoff | A：eval identity、完整源证据 | A：request/source/quote/逐题核验 | A：AC来源；U：动态现场 |
| 失败语义 | A：依赖暂停；F01 | A：BLOCKED/NEEDS_CONTEXT | A：FAIL具体缺项 | A：FAIL/UNKNOWN；F02输入 | A：UNRESOLVED止依赖 | A：PARTIAL保留缺口 |
| 完成判定 | F01 | A：全部产物与自检，非终验 | N：PASS仅前置就绪 | F01/02 | A：所有题ACCEPT/RECOVERED | A：每AC必覆盖，不以未发现代PASS |
| 重试恢复 | F01；A：其余有限恢复 | A：2次自检/取消在途诚实 | A：补输入重试 | A：同对象重新判、主控记录 | A：失败anchor接手，不反复light | A：不自动修复；U：真实重验链 |
| 模型适配 | A：common与兼容分开；U：实际采用 | A：调用方分配；U：效果 | A：机械前检；U：实际强制 | A：关键审查角色；U：实际采用 | A：有限任务降档；U：自然错误率 | A：判官角色；U：实际采用 |
| 框架适配 | A：NO_PIN/Skill-first；F01/03 | F03/04；U：NO_PIN handoff线索 | A：项目身份/standalone | A：作用域/只读；F01/02 | A：候选不改状态/记忆 | A：独立能力未随旧Loop退役 |
| 可测试性 | U：状态中断待实测 | U：委托/11文件待实测 | A：scope helper有负向；U：Agent模式 | A：recorder/scope测试；U：主体行为 | A：22测试+身份mutation；U：采集模型 | U：缺当前动态/盲标实测 |

行号依据：O105–115、130–207、281–299、421–446、474–510；WA49–79、100–119、192–222、237–303；PF43–72、107–135；QG38–113、121–175、198–210、250–277、416–450；FC21–96；PJ24–78。矩阵的 U 不自动升级为确认缺陷或伪造通过率。

## 八条跨角色接口

| 接口 | 结论与依据 |
|---|---|
| O→WA | F03；模式能力必须相容，F04必读分母不可裁剪；冻结根与取消规则已有 |
| O→PF | F02；workflow显式mode、实际身份与input_paths要穿过调用 |
| O→QG | F02；真实来源的完整完成证据是分支前提；eval ID/原始envelope责任已有 |
| Parent→FC | 合同闭合；出处校验后仍需逐题语义验收，不能跳过 |
| AC source→PJ | 全部AC、来源强弱与PARTIAL均明确；本轮不证明UI实际合格 |
| QG→O | F01；验收票及必需落账早于持久DONE |
| WA→QG | F02；仅路径和blockers不足以代表完成报告 |
| Claude↔Codex | 合同区分成立；adapter读取/配置只作旁证，双端实际Agent执行未验证 |

## 真问题筛选与被否定的推断

| 主张 | 处置 | 理由 |
|---|---|---|
| AOR-01..04 | CONFIRMED_DESIGN_GAP | 有现行合同冲突、合法触发和不变量；未虚构生产事故 |
| Preflight未列skill即裸奔 | DUPLICATE_COVERED | PF51仍要求读实际skill合同；未列项有WARN |
| 用户说跳过可绕Human Gate | REFUTED | PF135明确排除项目、人类、外部授权及安全门 |
| Fact Collector校验exit0即采纳 | REFUTED | FC61–90和实际22测试将出处与内容分开 |
| Proto Judge把旧校准当现版准确率 | REFUTED | PJ74明确历史弱信号、不代表现版校准 |
| QG有Bash就一定会越权写 | RISK_ONLY | 权限继承不等于写授权，正文禁止；无实际越权证据 |
| MODE残留/晚查Done Criteria会形成误执行 | RISK_ONLY | WA存在防御性线索，但上游要求填全；未确认合法路径触发 |
| WA固定docs/handoff可写错项目 | RISK_ONLY | 路径合同需对实际NO_PIN调用验证；本轮无错误写入证据 |
| helper接收PASS+UNKNOWN，所以完整QG会误放行 | REFUTED（该推断） | helper仅格式检查，QG还需语义判定；脚本结果不能替代完整门结论 |

本轮第一性原理约束只有四项：完成晚于证据；消费者得到必需输入；合法任务存在合同一致的执行路径；必读集合不因预算静默缩小。没有以文件长、规则多或个人措辞偏好列bug。

## 实际测试与证据边界

| 命令/探针 | 实际结果 | 能证明什么 |
|---|---|---|
| node scripts/check-agent-contracts.mjs | exit0，96/96 | 静态引用/文本基线；含Plan断言，不计本轮六角色完备率 |
| node scripts/check-model-table.mjs | exit0 | common/兼容表和注册的静态一致性 |
| node scripts/check-routing-map.mjs | exit0 | 路由覆盖与skill SSOT静态一致 |
| node --test scripts/test-fact-candidates.mjs | exit0，22/22 | 出处校验、错误/缺题/未知source/CLI等脚本行为 |
| python3 scripts/test-gate-verdict-recorder.py | exit0，4/4 | 真正运行CLI；幂等、冲突、状态计数不一致、12并发重放 |
| node scripts/test-quality-gates-scope.mjs | exit0，3组PASS | NO_PIN拒别名、精确输入、逃逸/旧epoch/恢复；临时fixture中的项目模型 |
| MUT-FACT-STALE | 临时禁用request_id拒绝→1测试失败；恢复→22通过 | 此测试确实发现“旧请求被接收”这一具体故障 |
| scope suite内置mutation | 临时加入禁读alias探测被拒，恢复成功 | NO_PIN禁别名路径监测有效 |
| HANDOFF-PASS/UNKNOWN/FAIL | 三者均exit0 | 即使要求gate_result PASS，helper仍只验格式；不能据此证明语义通过 |

脚本、完整输入、输出、退出码保留在证据JSON。临时目录已由测试自行清理，保留证据足以重放。未跑修改后方案测试，因为生产代码未改；没有把未来验收写成已完成。未运行原生六角色的端到端行为/真实UI/Claude会话，也未测触发频率或误判率。

## 计划本身的专家与红队审查

计划v2 hash `f56ba21771422598bc224fae22139dcb7443d6d4764a70ecd45db83baeb31138`。
架构、安全、治理视角AGREE；科学与人机视角DISAGREE：两票门可能掩盖少数强反例。修订为证据决定严重度、第二视角是复核义务，潜在MAJOR未复核仍阻断；另限定计划最多两轮。

计划v3 hash `553dcfa2f8163fb7ec4a55a66e7ede36e8346fb4246e2a35caed0ef4e716f130`。
科学、人机定向回验AGREE；独立红队对范围渗漏、循环自证、静态绿灯、证据洗白、上下文污染、失败误通过、修复反噬、少数证据八类攻击均未推翻规则。此票只是计划推演，不是系统行为验收。

## 问题与方案的会审

五视角均单独审六正文；原票中保留严重度分歧与各自例外。原始票据未覆盖写成统一结论，主控合议单列于本报告。

| 问题 | 支持来源（候选编号） | 合议 |
|---|---|---|
| AOR-01 | 架构C、可靠性R1、科学SC-02、治理G1 | 确认合同缺口；不宣称实际后继必然误放行 |
| AOR-02 | 架构A、可靠性R2、科学SC-01、治理G2 | 确认输入缺口；保留severity分歧 |
| AOR-03 | 架构B、人机H1、治理G3 | 确认能力冲突；方案不能损害重型隔离或implement限制 |
| AOR-04 | 可靠性R3、科学SC-03、人机H2 | 确认完整性冲突；暂MINOR，单次缺必读仍停门 |

方案审查已实际改变设计，而非在计划中留下“待评审”步骤：第一轮红队拒绝 v1，指出单份 WA 报告会误阻 Solo/main_agent 和最终汇总，且 skill 模式会跳过继承约束、子任务可能复制父预算。v2 补三类真实来源、共用前提入口及全树额度。随后科学视角拒绝 v2 的 AOR-01：skill 内部写 DONE 仍可绕过移后的主控提交。v3 将受管 skill 内部入口纳入提交归属和中断验收，并保留 standalone 正例。原始反对票与设计变更均保留；v3经三视角回验和红队第二轮通过。

| 设计审查视角 | 首次方案票 | v3 回验 | 精确原票ID |
|---|---|---|---|
| 架构 | 四项AGREE | 四项AGREE；内部完成入口兼容闭合 | S-ARCH / S-ARCH-R2 |
| 安全可靠性 | 四项AGREE | 四项AGREE；恢复、全树占用边界保留 | S-REL / S-REL-R2 |
| 评估科学 | AOR-01 DISAGREE；其余AGREE | 四项AGREE；内部DONE及分母/身份修订闭合 | S-SCI / S-SCI-R2 |
| 红队 | v1 BLOCKED，三类合法路径/约束入口/子树额度反例 | v3四项AGREE，SOLUTION_DESIGN_HANDSHAKE=PASS | S-RT-R1 / S-RT-R2 |

最终方案 v3 SHA-256：`b775c6af0f6b218757963a7fede4b9d31aeee5fcdeada9cc1eb51db88e9c31eb`。三位设计评审者均核对该对象；其票只认可设计，不等于运行验收。人机与治理已完成计划及正文审查，本轮没有把他们算作新增的方案赞成票。

## 可落地方案与顺序

精确修改位置、新旧行为、反例、失败路径、兼容迁移及残余风险见 [实施方案](/Users/luca/.codex/worktrees/a65e/luca_gstack/framework-audit/2026-10-07-agent-orchestration-proposal.md)。

建议 AOR-02→AOR-01→AOR-03→AOR-04。先补消费者输入，再纠正状态提交；其后修能力例外和必读预算。使用现有状态、writer、handoff、recorder和作用域，不引入新调度框架。旧调用缺字段明确停门，旧DONE缺当前证据补验，不重放外部副作用。

实施后的最低验收是：缺字段时断言没有执行；待验/失败/旧票不会留下可消费DONE；普通WA及implement仍禁止嵌套而获批skill确有可执行路径；第11份必读约束确实被消费或明确停门。各自要有改前失败、改后通过和Claude/Codex实际证据，不能只修改字符串检查。

## 交付验收条件

| 条件 | 证据 | 当前裁决 |
|---|---|---|
| C1：确认问题可追溯且无未处理的直接反证 | 四项问题卡、源hash、五视角原票、红队两轮；保留严重度分歧 | PASS |
| C2：六角色×十二维及八接口完整覆盖 | 72格矩阵与八接口表，运行未知显式标U | PASS |
| C3：问题、方案与终版均有真实独立审查 | P/A/S系列原票完整；终版独立核验F-GOV逐条PASS | PASS |
| C4：不混入Plan问题，不冒充实施或双端验收 | 固定范围；静态/行为/设计证据分开；生产源hash未变 | PASS |
| C5：修改与验收可定位，不重建调度体系 | v3逐项owner/位置、正负例、兼容迁移及残余风险 | PASS |

终版核验由 `/root/governance_plan` 完成，原票 F-GOV 存于 evidence.json。其核验对象报告 SHA 为 `f0551e1faa15a9c935cbbec830c959acded7f03b18327a7a0933945856b1b78e`；通过后只补本票、完成状态、表头和完整性摘要，不改实质结论。候选全文、收尾差异及最终报告 SHA 均保留在证据文件。归档共22份原票：计划8、正文5、方案8、终版1。

最后完整性检查：HEAD未变；六正文及两份直接依赖hash未变；tracked diff为空；仅新增本轮四份审计交付文件。未将静态绿灯、专家投票或报告完成替代生产验收。

## 最终交付状态

- PLAN_HANDSHAKE：PASS（v3，已完成定向回验及独立红队）。
- REVIEW_DELIVERY：DONE_WITH_CONCERNS（评审、方案及终版核验完成；运行证据边界保留）。
- SOLUTION_DESIGN_HANDSHAKE：PASS（v3，三视角回验与第二轮红队）。
- IMPLEMENTATION_ACCEPTANCE：NOT_EXECUTED。
- SYSTEM_READINESS：BLOCKED（确认的MAJOR尚未实施及验收；不代表全部体系不可用）。

未闭合的运行义务属于后续实施：O/WA/skill内部完成入口与旧DONE恢复、三类冷调用、委托树额度/取消、11项必读约束，以及Claude/Codex双端真实执行。后续实施 owner 应按方案逐项给出改前失败和改后通过证据；未完成前不得宣称生产修复通过。本轮交付只回答“问题是否成立、方案是否值得实施”。

## 历史checkpoint（非当前完成状态）

## Checkpoint 1 — U-01

- 目标：继续原会话 01a11575-70e6-77a1-85b4-4a38b368b743；六个非 Plan Agent 评审与方案，不实施修复。
- 源会话与当前工作树 HEAD 均为 5956da6be6997326e2cb0eb14e65bc8099e8c7fe；开始时工作树干净。
- 当前计划：同目录 2026-10-07-agent-orchestration-plan.md，v2 SHA f56ba21771422598bc224fae22139dcb7443d6d4764a70ecd45db83baeb31138。
- 已完成：恢复真实用户要求；原会话独立票据无效；冻结六正文；静态3项通过；Fact candidates 22测试、recorder 4测试、quality-gates scope与隔离mutation通过。
- 原生subagent已返回：架构AGREE；可靠性AGREE；科学性发现两票门可能掩盖真实少数反例，待修订。
- 活跃：human_plan 只读计划审查；owner=root负责编排、报告和证据。
- 待完成：其余计划审查→修订回验→正文与接口审计→真问题/方案会审与红队→终版。
- 关键决定：已有Sol例外与审查授权继承；不把方案通过混成系统修复通过；不创建侧栏聊天；六正文、Plan、framework/、memory和项目状态均不修改。
- 恢复：先读本文件、精确计划、2026-10-07-agent-orchestration-evidence.json；核HEAD和六正文hash，继续第一个未完成门。不得重跑已完成写入或把旧失败派发算票。

## Checkpoint 2 — U-01 DONE / U-02 IN_PROGRESS

- 五视角首轮全部收票。v3修订少数强证据规则与计划两轮上限，科学性/人机专家定向回验AGREE；独立红队八类计划攻击全部不成立。
- v3计划hash：553dcfa2f8163fb7ec4a55a66e7ede36e8346fb4246e2a35caed0ef4e716f130。原票保留于证据JSON；v2无关已核条目保留，v3变更均回验。
- 活跃：architecture_plan 正文架构审查；其余专家逐个续派，只接收目标源文件，不接收彼此结论。
- 新增证据：MUT-FACT-STALE 临时禁用身份检查后1测试红，恢复22测试绿。HANDOFF-PASS/UNKNOWN/FAIL三个样例全部被语法helper以exit0接收；此证据只支持helper非语义判官，不证明完整QG误放行。
- 原六正文未修改。下步：完成五视角正文票→候选反证→最小方案与红队→终版。

## Checkpoint 3 — U-02 IN_PROGRESS

- 已收架构与安全可靠性两份正文原票，六角色均覆盖。共同确认合同候选：QG输入status缺失、验收前持久DONE。另发现skill委托/禁令冲突与必读集合/10文件上限冲突。
- 活跃：science_plan做科学性独立审查；root取证与方案准备，不向专家传此前票据。
- 现有实测仍只代表脚本分区，不代表Claude/Codex真实Agent全链。本轮独立审查使用用户允许的Sol例外，不宣称peak采用。
- 下一步：科学性→人机/治理定向覆盖及方案反证→红队→终版。

## Checkpoint 4 — U-02/U-03 DONE，U-04修订回验

- 五视角正文票全部已保存。四项合同缺口进入方案；scope绕过、collector直接采纳、旧校准等推断被反证或降为风险。
- 方案v1红队真实BLOCKED：强制单WA报告误伤Solo与最终汇总；skill模式未实际读取授权节；父预算可能被子树复制。
- 方案v2 SHA27d69aa1ed38c1b9d3e194f75746b84c0f2457df222d8c5d999c78cb07a2bec7 已补wa/main/aggregate、共用约束前置、全树累计额度及取消；顺带明确当前HumanGate与旧DONE迁移中断点。
- 架构方案票逐项AGREE；活跃reliability_plan独立审同版方案。剩余：科学方案票→红队第二轮→终版报告与冻结完整性核验。
- 本轮未实施任何生产修复；PLAN_HANDSHAKE=PASS不代表SYSTEM_READINESS。

## Checkpoint 5 — U-04第二次修订

- v2架构/可靠性逐项AGREE；科学视角发现deepresearch内部写DONE仍成立，AOR-01设计握手转为BLOCKED，未按多数票放行。
- v3 SHA b775c6af0f6b218757963a7fede4b9d31aeee5fcdeada9cc1eb51db88e9c31eb：补受管skill提交归属、WA回交、共享handoff及deepresearch完成接口适配；未适配入口不派发；standalone不引入新依赖。
- 活跃science_plan回验自己的反例。剩余：架构/可靠性定向回验v3变更→红队第二轮→终版独立审核与完整性核验。
- 原票、hash与未执行边界仍保留；不改六正文或其他生产文件。恢复读取本报告、v3方案及evidence，核HEAD及源hash后继续第一个未完成门。

## Checkpoint 6 — U-04 DONE / U-05 IN_PROGRESS

- v3的架构、可靠性、科学回验均AGREE；独立红队第二轮四项AGREE，方案握手PASS，原票已保留。
- 剩余仅终版文档独立核验及最终完整性检查；owner=root维护四份交付文档。不得把本轮方案通过改写为生产修复或双端live通过。
- 恢复先核相同HEAD/六正文hash，读取本报告、v3方案和evidence，继续U-05；无需重跑已通过的生产脚本基线。

## Checkpoint 7 — U-05 DONE_WITH_CONCERNS

- F-GOV已返回C1–C5全部PASS；22份原票完整保存。方案和计划握手均PASS，生产实施NOT_EXECUTED，SYSTEM_READINESS仍BLOCKED。
- 本轮无活跃审查任务或未完成交付门。后续若实施，按v3方案的既定顺序及真实运行验收推进，不将本轮设计通过复用为实施通过。
- 最终报告与候选间仅为核验票、状态和完整性摘要等收尾差异，详见evidence.final_delivery。
