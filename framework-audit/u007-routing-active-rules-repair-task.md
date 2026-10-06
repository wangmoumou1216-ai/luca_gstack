# W24：修复 B/S active-rule 只读材料闭包

角色：原“制定模块一计划”会话继续模块一实现。你不是独自在代码库工作；保留他人/用户修改，不回退别人的内容。独占8812中的conditions.mjs及conditions.test.mjs。root集成f351、其他owner及生产R只读。本次是W21已经结束后的新实际turn，单独计工作第24次，不能并回旧turn。继承现有模型/effort。

## 零、所有后续 Session 必须继承的背景

**luca_gstack 是在 Codex 桌面、Codex CLI、Claude Code CLI 中通用使用的一个框架。评估按三体系及其协同作用组织，最终产出一份统一的评估执行计划。** 本文将用户口述的“Cloud Code”按 Claude Code 理解；该名称不改变通用框架这一评估对象。

用户本次明确要求：“按照它们的通用价值，然后去考虑我的框架上面的这几大模块的问题以及计划的输出。”据此，以下约束适用于目的整理、研究、独立规划、设计、审计、比较、裁决和迁移：

- **以共同用途定义价值。** 从理解任务、组织执行、保持信息连续性和必要的人类控制出发，研究框架在当前模型与实际运行环境能力之上增加了什么价值；这些价值是否值得其规则、协调和维护成本。
- **保持一个框架的规划对象。** 不按三个使用端拆成三套方案、三组模块或平台专项 Session，不预设需要新增适配层、平台分支或配置体系。若证据表明统一目标存在无法消除的能力冲突，记录影响并回到共同用途裁决，不由执行者自行扩大架构。
- **区分能力事实与架构选择。** 模型本身的能力、环境实际提供的执行能力、框架增加的机制，分别作为归因依据。环境名称不充当方案分组依据；必要的能力核实服务于同一方案的可行性判断。
- **通用性不等于采用最弱能力。** 不要求实现方式完全相同，也不凭空假设各处都有同一能力。无法取得必要能力时，先检验现有能力能否以更简单方式达到同一结果；仍不能满足必要控制或用途时明确限制，不静默削弱目标。特有增强的收益不能冒充通用收益。
- **以证据控制复杂度。** 每个保留或新增机制都要说明服务的共同用途、必要能力前提、最小替代及净价值。确需核实环境差异时，只检查可能改变结论的行为与控制点，复用同一任务和判据；不得以此自动扩成全端、全组合的独立评估工程。
- **按模块职责限定范围。** 三体系评估负责通用的任务分流、Agent 协作、Context 提供及其交接；技能内部领域方法、动效或其他具体交付流程仍由技能 owner 负责。技能作为真实任务的消费方或案例时，只检查与三体系有关的输入、输出和控制衔接。发现技能内部问题，记录具体责任边界，不自动扩大为技能重构或新增评估模块。
- **允许高价值交集优先进入。** 主协调者可将直接改善共同用途或评估可信度、且能保留最新提交有效行为的交集列为优先项。先复用现有 owner；确有额外收益才设计最小增补实验，并记录收益依据、责任边界和回归要求。优先项使用既有任务卡，不新增阶段或审批体系，也不扩大实施授权。

本节是共同输入合同，必须随最小任务包和跨 Session 交接传递。执行者不能只读某一阶段而丢失本节约束。

**最新用户侧重（2026-10-02）：Codex 桌面与 Codex CLI 是主要研究、开发校准和收益验证环境。** 先查这两者可用的原生能力及框架增量；Claude Code 仅做可能改变共同用途判断的兼容/必要控制检查。API 是单列的能力表面，区分本地 Codex SDK/app-server、托管 Agents API、应用内 Agents SDK 和 Responses；不自动新增平台工程。保持一个框架，不按三个宿主平分实验、不凭空编造用户使用比例。此优先级随全部派发传递。

## 必读与复用

完整读本任务、u007-interface-addendum-7.md、u007-readiness-review-r2.md及root新增事实u007-baseline-active-rules-gap.json。已完整读过且未变的v4/模块包v3、共同合同/补充1—6沿用，不再全量复读。当前root R4记录u007-root-integration-r4.json SHA0d3da9db81b058eb7ab74094a3bd00b4aaf71553b6f96e9b4eed1f5e7bf767a1。你的conditions当前交付应为1406739d77c6025cac9b7efc1cd4621d0c1a3ed51a456273df26f7f3db1c88a3，test c9a95ac014676c7ea50121a5e59e446a845ce448474b45d2ebc6f0fcd48a8775；先核身份，备份，漂移则先报告不能覆盖。

## 具体实施

1. 读源 /Users/luca/Desktop/luca_gstack/.claude/observability/scripts/get_rules.py 及其唯一数据文件 ../rules.yaml。root已确认均为HEAD0512019原字节（精确SHA在gap记录）。核必要直接依赖：stdlib/PyYAML及解释器；不扩读observations或来源ID指向的历史记录。完整规则文件不到10KB，保原内容/状态/顺序，不为案例裁掉不利规则。
2. 在 /Users/luca/Desktop/luca_gstack/framework-audit/ 创建 u002-source-manifest-active-rules-v1.json，保留旧u002-source-manifest.json（SHA cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9）的全部记录，新增恰好两条已提交源身份。按现有manifest消费者支持的结构写；补充关系可以另记录到本报告，不为此设计schema层。严禁修改原U002或当前master release。
3. 最小修conditions构建及自己的测试，把这两条纳入B/S所需闭包；不通配复制整个observability。旧输入若缺必需项应明确拒绝/保留已知限制，不能再默认为与真实source等价。保留48个native技能入口去重、相对路径/字节身份和清单外/链接拒绝。说明T/I是否材料变化与原因；不更改它们的机制、能力或公共任务事实。
4. 先证明R4生成副本的规则加载缺失，再用新版manifest及代码构建B/S，实际执行相同只读loader命令，与源脚本比较stdout/stderr/exit和必要依赖身份。至少office '*'、一个确有适用规则的领域skill、一个无规则skill、active与retired/superseded过滤；也核被公开开发case实际触达的skill/scene，不读隐藏材料。不要仅断言包含新文件/hash。不要使用||true掩盖脚本出错；另说明真实office前导中的||true为何曾遮住缺口。
5. 用当前条件的窄回归检查，不需无变化重跑整套其它owner测试。PyYAML的宿主可用/版本路径可记录，但未经真实模型sandbox执行不得称原生路径已证。不安装依赖、不改全局配置。任一其它依赖缺失给精确证据，不顺手大扩闭包。

## 界限与交付

只写你的两个源文件、新manifest、u007-routing-active-rules-repair-report.md及临时证据；不改driver/protocol/integration/root工作树、生产、framework、真实项目、docs alias、全局配置。没有模型/新Agent/探针/网络/commit/push授权；普通只读Python loader对比属于本次离线验证，不占模型行为池，但时间/动作/失败成本全记。

任务限45分钟/90保守动作/120000可观察token，不重置，未知诚实标unknown。完成后报告：实际diff/精确文件hash、新旧manifest保留关系与增加项、源/副本RED→GREEN原始命令输出/退出及日志hash、B/S材料hash、受影响case/用途、仍未知的原生sandbox/其余闭包、资源账。DONE_WITH_CONCERNS仅本卡交付，绝不称整个模块/项目已完成。主协调收到稳定交付后会收取和非作者复核；不用等待额外启动批准。

<!-- FILE_END: u007-routing-active-rules-repair-task.md -->
