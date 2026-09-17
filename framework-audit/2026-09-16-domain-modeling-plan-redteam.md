# domain-modeling 接入方案红队评审

日期：2026-09-16

- 对象：上一条对话中的 domain-modeling 接入方案；不是上游 skill 的再次评级，也不是安装结果验收。
- 范围：当前框架 checkout，NO_PIN；不读写下游项目或共享项目 aliases。
- 方法：主线契约核对 + 冷启动独立 default-REFUTE 评审；独立评审未获得主线推理或修复方案。
- 基线 HEAD：`2b01fb04699d03c749aaea00b5591cb27de2da29`；存在用户未提交改动，未将当前状态当作干净安装基线。
- 本轮动作：只读检查与此评审报告；未安装、未修订被审方案、未修改 Flow、未运行行为测试或 Git 写操作。
- Completion：`DONE_WITH_CONCERNS`，表示评审完成但执行方案尚未就绪，不表示接入能力完成。

## 结论

**方向通过，不能直接作为安装执行计划。** 独立评审未发现已证实的概念级 BLOCKER，但指出两项 MAJOR 执行缺口和一项双端验证细化缺口。

支持保留的方向：

- 适配为独立可调用、可被模型识别的 skill，而非原样移植文件语义。
- 同时支持人工调用与按需内部调用；自动触发不赋予自动定案或额外写入权限。
- 作为横切领域建模能力，不预先增加所有任务必经的 Flow 节点。
- 复用已经吸收的术语持久化与 ADR 提议规则，避免复制第二套权威规则。

上述支持是静态契约判断；不是宿主兼容性、无关键词触发或安装成功的运行证据。

## 被审方案快照

方案主张安装 Luca 适配版，权威正文位于 `.claude/skills/office/domain-modeling/`；提供 Claude `/domain-modeling` 与 Codex `$domain-modeling`；依据术语混用、概念边界不清、领域关系与代码矛盾进行语义识别；由 brainstorm、code-recon、tech-spec 按需调用并返回原任务。

方案排除只读词汇、普通变量改名、启动 CONTEXT 读取；承诺遵守项目绑定、人工决策和受控记忆。安装步骤为固定版本、隔离适配、登记双端入口/路由/输入/模型/版本追踪、接宿主与规划器指针、验证触发与权限；明确实际安装仍需批准修改计划和双端行为验证。

## 质疑清单

### DMR-001 — MAJOR：执行范围与门控未形成批准对象

是否已经明确此次适配进入 framework-evolution 的哪条接入路径，并列出目标 checkout、固定上游版本、精确修改文件、阶段依赖、断言、受保护的用户改动及 Git/external effects？

如果这个质疑成立：用户只能批准方向，不能批准一个边界明确且可恢复的安装事务；“隔离工作区”和“之后批准修改计划”不能代替执行 payload。此项是执行就绪度缺口，不是概念错误。

依据：`.claude/skill-os/runtime/framework-maintenance.md`；`AGENTS.md` K3/K6；`.claude/agents/plan-agent.md` 块 2–4；`.claude/skill-os/evolution/FUSION-RUNBOOK.md`。

### DMR-002 — MAJOR：结果、定案与写入契约未定义

领域建模完成后究竟更新现有词汇节、专用 glossary、ADR 还是其他正式产物，哪些情况仅返回建议，哪些定案必须等待用户，缺少真人回应或出现代码矛盾时如何把未决项返回宿主？

如果这个质疑成立：不同 Agent 会在不同位置落盘，或把建议当成已接受术语；既可能污染长期 CONTEXT，也可能因完全不写而失去跨会话价值。“遵守受控记忆”尚不足以区分建模产物与记忆晋升。

依据：`.claude/skills/office/SKILL.md` 的 Skill OS、Execution Discipline、Growth 约束；`.claude/skill-os/runtime/project-session.md`；`.claude/skill-os/extraction-bar.md`；`CONTEXT.md` 红线。

### DMR-003 — MAJOR：动态可达性尚无可判定验收

无固定关键词的领域歧义由哪个真实消费面识别，宿主按什么条件调用、完成后按什么结果继续或暂停，怎样区分 domain-modeling 与原任务 owner，验收中是否分别覆盖正例、非触发例、混合意图和未授权写入？

如果这个质疑成立：登记目录和增加指针可能全部通过静态检查，但自动调用仍不发生或错误劫持原任务；无法兑现用户要求的动态识别。此项由主线契约核对提出，未用运行结果证明能力失败。

依据：`.claude/skill-os/skill-authoring.md` 第 6 节“登记 ≠ 生效”和消费面检查；`.claude/skills/office/writing-for-agents/SKILL-MECHANICS.md` 的实际 reach/non-reach 要求。

### DMR-004 — MINOR：双 harness 验证矩阵仍过于概括

Claude 与 Codex 的发现、调用、不可用原语、降级/拒绝路径及行为证据是否分别列出，而非共用一句“通过双端行为验证”？

如果这个质疑成立：同名入口或元数据可能被误当成两端执行等价；当前属于验证计划缺口，不是已发生的测试失败。

依据：`.claude/skill-os/runtime/cross-harness.md` 五项分别验证要求；近期反馈 `O-20260807-001` 的双 harness 适配约束。

## 独立评审结果

冷启动 reviewer `domain_modeling_plan_review` 判定：方向通过、执行批准不通过；两项 MAJOR 为执行门控与能力契约，双端矩阵为 MINOR。其未核验的上游许可证、具体配置及宿主运行兼容性保持 UNKNOWN，不补写为 PASS。

“不设必经节点”与 Graph-optional 相容；本地主线另核验 SKILL-MECHANICS 明确仅真实 workflow transition 才增加 graph edge。该证据支持横切能力的默认方向，不替代未来接入后的实际宿主行为验证。

## 验证与限制

已完成：读取相关框架契约、核对现有术语/ADR 条款、过滤 active rules 与读取近期反馈、检查 worktree、独立静态反证评审。

尚未完成：安装范围冻结、完整阶段执行计划、建模输入/输出/定案/返回合同、模型与输入配置验证、双端真实触发与权限行为验收。

无运行物变更，本轮不做 mutation，也不宣称测试覆盖了安装行为。未修改被审方案，因此不存在“修订后已终版闭合”的声明。

## 出门 criteria

- C1 PASS：评审对象绑定到上一条接入方案，没有扩成上游全量对标或项目审计。
- C2 PASS：每条质疑均有影响与框架原文依据；独立意见与主线补充发现分别标注。
- C3 PASS：方向判断、执行就绪度、运行验证明确区分；未安装能力不标 DONE。
- C4 PASS：未读写下游项目、修改 Flow 或执行 Git/publication 效果；已有用户改动保留。

<!-- FILE_END: domain-modeling-plan-redteam -->
