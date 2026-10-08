# W19：实现可核对的原生命令权限，不再自动否决合法命令

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




你是原编排实现owner，继续写代码。完整读补充5、自己的W15/W17报告；旧共同合同前四附录已读可复用。P02只是命令沙箱成功，不能当app-server成功。现在按补充5实现native_command_permissions对象、登记等值校验、路径/配置保护、精确RPC、effective profile核对和未知分层。不要再只报告等待接口；具体接口已定。

独占 /Users/luca/.codex/worktrees/71f8/luca_gstack/scripts/tri-system-eval/driver.mjs、driver.test.mjs。其他人同时工作，不改条件/协议/integration文件，不还原他人改动。主协调持有公共manifest/真实release。现在仍只能fake transport/offline，不准新模型、真实thread/turn/hook或修改全局config。

保留兼容原未配置模式及其严格未知限制。permission profile已配置时thread/start config明确传同profile，thread/turn采用permissions且不混sandbox字段。当前id/extends只能核身份；无actual effective_probe时只有注册probe能探测，正式development/hidden拒绝。probe本身若观察command而未有生效证据，要返回可审计原始材料/unknown，不能伪称边界已通过；主协调依实际探针另冻结证据。

测试必须含登记漂移/路径逃逸/宽泛root拒绝、process和thread设置一致、错profile/extends拒绝、无proof正式运行拒绝、有合格proof与合法command时保留实际读取unknown而不自动污染、MCP/image不误继承证明、原有deadline/family/注册/失败证据不回归。proof只验证具体结构/hash/binding，不再建立签名服务。fake证据明确不授权live。

报告u007-orchestration-native-permissions-report.md，给稳定hash/实际测试及真实未测项。只读本机已生成schema/help和保存的官方captures可按需；不要新查全套文档。不读hidden/private/archives/真实项目、不给模型硬编码新的选择，不改HOME/CODEX_HOME，不commit/push/安装/Agent。准备池本次1次；45分钟/90动作/120000可观察token，真实run0。Context owner将读取完成文件联测，在本次尽量闭合具体问题。

<!-- FILE_END: u007-orchestration-native-permissions-task.md -->
