# W27：准备一次原生启动恢复的精确检查包

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

你不是唯一在工作的owner。不得覆盖、回滚或修改其他人的文件；只在自己原工作树和下述独占产物中工作。复用已经完成的启动/方法读取，只补读精确新合同和适用变更；不要重新规划整个框架。完整读补充9、R6身份与本任务到EOF。用户授权完整生命周期；此卡是具体代码/准备工作，不是只回ACK。禁止private/archives，禁止全局配置/凭据/快照、真实项目/framework修改。无模型、probe、app-server新会话、网络、新agent、提交或推送。每轮25分钟/60保守动作/80000观察token，实际turn独立记账。

共同输入：u007-interface-addendum-9.md、u007-root-integration-r6.json、u007-native-launch-metadata-r1.json、u007-routing-native-launch-advice.md。已有P06失败/诊断和J09结论按需定位，不重开全量日志。最终报告给变更/测试/精确hash、必要限制、实际成本；短final≤2000中文字符。不同owner字段冲突直接报告root，不能擅自降判据。

## 所有权与交付

原owner 制定模块一计划，工作树8812。独占B下 u007-p07-prepare.py、u007-p07-preparation.json、u007-p07-case-draft.json、u007-p07-registration-draft.json、u007-p07-manifest-draft.json、u007-p07-preparation-report.md；可创建一个自有临时instance，不能写root/别的owner代码。B=/Users/luca/Desktop/luca_gstack/framework-audit。

以既有u007-p06-preparation.json、case/registration/manifest和launch.py为精确模板，在新owned instance准备相同合成检查与规则源副本、outside marker/symlink，验证Python/Codex/PyYAML已有文件身份，不安装。保留原八项控制/loader、四checkpoint、输入交付规则和T条件内容，仅新run/case/owned路径及补充9的entry.native_launch、resources变化。请求中可明确原生exec_command使用shell=/bin/sh、login=false、tty=false执行同一检查命令（参数支持尚非P06已证）；模型不采用或报不支持时如实失败。绝不以独立command/exec或unsandboxed thread shell替代。检查脚本不运行，草案不能称READY/REGISTERED。

通过现有conditions和case protocol作纯静态/离线材料准备允许；不得代写driver。最终新driver identity还未收取时明确标PENDING，不伪绑定R6为最终；root在实际版本冻结后机械填入精确hash再审。随机选择端口仅检查可用、不要预留长期socket；真正运行前root包装器必须bind无listen并保持到终态。不要生成会自启动模型的脚本，prepare.py只准备和核hash，launch由root负责。任何fixture变更逐项说明不能隐去失败。阶段任务结束于一套可审阅的精确草案，不再研究新方案。

<!-- FILE_END: u007-native-recovery-preparation-task.md -->
