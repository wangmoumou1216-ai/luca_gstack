## Agent 编排 诊断

### 现状摘要（1 段）

luca_gstack 的多 Agent 编排层由 5 个 Markdown 规格文件组成（共 1570 行）：`orchestrator.md`（357）、`plan-agent.md`（560）、`work-agent-template.md`（289）、`quality-gate.md`（268）、`preflight-agent.md`（96）。这些不是真正注册为 Claude Code subagent 的实体——`.claude/settings.json` 只注册了 4 个 hook（session-restore / route-guard / post-edit / session-sync），没有任何 agent 注册或 env 注入。其中 **plan-agent 是唯一被实时 hook 主动接入** 的：`route-guard.mjs:302/310` 在 PLAN_MODE/PLAN_CHECK 时强制主 Agent 读取 `plan-agent.md`。其余 4 个文件均依赖主 Agent「按文档约定自觉读取并扮演」，没有运行时强制；orchestrator 自己也声明它「不是 subagent dispatcher，是主 session 的行为模式」（orchestrator.md:6）。整体设计把「真实 CC 只有单层 Agent tool + 主 session 即 orchestrator」的现实，包装成了一个借用了 Supervisor/Hierarchical/Worker Group 等多层 daemon 术语的纸面体系。

### 优点（公允）

1. **Work Agent 模板的隔离纪律是真实可用的**：work-agent-template.md 的冷启动假设（SECTION 7「不依赖会话历史，所有信息必须在 Input Contract 显式传入」，285 行）与真实 CC subagent 的隔离上下文完全吻合，这是少数 model↔reality 对齐良好的部分。
2. **占位符防御式 guard 设计扎实**：work-agent-template.md 对未填写变量（`{{MODE}}`/`{{SKILL_TO_EXECUTE}}`/`{{DONE_CRITERIA}}`/`{{AVAILABLE_SKILL_PATHS}}`）都写了字面量残留检测与降级行为（53、59、83-84、239-241、225 行），降低了模板被半填写后静默跑偏的风险。
3. **断言级别协议（BLOCKING/WARNING）跨文件一致**：plan-agent.md:284 定义「缺级别默认 BLOCKING」，quality-gate.md:70 严格复述同一规则，断言用纯 bash 可执行命令（plan-agent.md:520-560 模板库），可验证性强。
4. **handoff 用文件系统传状态而非 context**：用 `docs/handoff/*.md` 解耦 session（handoff-protocol.md），与「subagent 只返回一条最终消息」的现实相容，docs/handoff/ 实际有产出文件，说明这条链路真在用。
5. **plan-agent 的溯源/反向覆盖规则有工程价值**：No Fabrication（plan-agent.md:76-90）+ DEV-NNN 反向覆盖检查（114-138）把「凭空造任务」设为 CRITICAL，对真实开发任务是有用的约束。

### 问题清单

- **[严重度:中][类型:死代码]** `SPAWNED_SESSION` / `LUCA_SPAWNED` 全链路从不触发。CLAUDE.md:456-457 自认「当前系统中没有强制 Orchestrator 会设置 LUCA_SPAWNED 环境变量，此机制不会被触发」；SKILL.md:282-285 同样声明「当前未启用 Orchestrator，此机制为未来扩展预留」。但该 preamble 检测块仍被复制进 **至少 18 个 skill 文件**（`grep -c` 实测：office/SKILL.md:21、design-brief:44、figma-layer:44、figma-demo:40/127、idea:31、ux-audit:33、html-prototype:44、challenge:28、design-review:35、handoff-review:37 及其 4 个 specialists、ux-audit 3 个 specialists 等），且 `.agents/` 下还有一份完整镜像副本。没有任何 hook 或脚本 export 这个变量 → 永远走 false 分支。
- **[严重度:中][类型:一致性]** skill_execution 模式下「谁写 handoff」自相矛盾。work-agent-template.md:70 (Step 4) 要求 **Work Agent 自己写** handoff；但 orchestrator.md:85-86 的 `execution_context == main_agent` 分支写「skill 内部协议负责写 handoff，Orchestrator 不重复写」；handoff-protocol.md 又说「每个 skill 标记 DONE 之前必须先写」。三处主语不同（WA / skill 自身 / Orchestrator 更新 ADOPTED），实际执行时责任方不唯一。
- **[严重度:中][类型:健壮性]** Context 预算管理建立在「无法测量」的代理指标上。orchestrator.md:317 自承「Orchestrator 无法直接测量 token 占用率」，于是用「对话轮数」近似（<20=正常，20-30=60%，>30=80%），并依赖 route-guard 第 20 轮起的提醒。轮数与真实 token 占用毫无线性关系（一轮可能是一句话也可能是 80K token 的 deepresearch），这套阈值（orchestrator.md:319-323、CLAUDE.md Context 工程协议）实质不可靠。
- **[严重度:低][类型:复杂度]** 5 种编排模式（Solo/Sequential/Parallel/Supervisor/Hierarchical，plan-agent.md:461-469）中，Hierarchical 在真实 CC 里需要「agent 再 spawn agent」，而 work-agent-template.md:227「不调用其他 Agent 或启动 subagent」明确禁止 WA 嵌套。于是 Hierarchical 的「多 Worker Group、每 Group 内嵌 Supervisor」（orchestrator.md:212-216）只能由主 Agent 串行模拟，多层结构退化为单层循环，分层语义是纸面的。Hierarchical 失败恢复协议（orchestrator.md:218-229）同理：依赖一个并不真实存在的持久 supervisor。
- **[严重度:低][类型:重叠]** preflight 与 quality-gate 在「前置/产出 gate」上语义重叠。preflight-agent.md:61/64/67 用 `grep -ql "gate_result.*PASS" docs/handoff/*-design-brief-handoff.md` 检查上游 gate；quality-gate.md Skill Mode（109）也校验 handoff 的 `gate_result` 字段。两者一个在 skill 前跑、一个在 skill 后跑，检查的是同一批 handoff gate 字段，存在概念与实现重叠（preflight 检查的「上游 PASS」正是上一个 skill 的 quality-gate 写出的结果），可合并为单一 gate 文件的两个 mode。
- **[严重度:低][类型:context成本]** orchestrator.md 内嵌了一张 12 行的「Skill 路径映射表」（185-200）和 plan-agent.md 内嵌了 MagicPath 三套断言模板 + Gap1/2/3（424-457），这些在大多数 task_execution（非设计）任务里完全用不到，却每次进 orchestrator/plan 都被整文件读入，抬高固定 context 成本。
- **[严重度:低][类型:一致性]** 版本号与命名不统一：orchestrator v4.0、plan-agent v2.0、quality-gate v4.0、work-agent 无版本号，handoff-protocol v3.0。无法判断它们是否同一轮设计、是否经过整体一致性校对。

### 量化指标

- **总行数**：1570 行（orchestrator 357 + plan-agent 560 + work-agent 289 + quality-gate 268 + preflight 96）。
- **Agent 文件数**：5 个（均为规格文档，0 个注册为真实 CC subagent；settings.json 中 agent 注册数 = 0）。
- **估算「从不触发 / 纯协议层」行数占比**：约 **22%–30%**。明确死代码 = SPAWNED_SESSION 块（散落 18+ skill 文件，每处约 1-3 行，集中说明见 CLAUDE.md:454-457 + SKILL.md:282-285，约 8 行）+ Hierarchical 的多层/失败恢复协议（orchestrator.md:212-229 = 18 行 + plan-agent.md 相关约 10 行）+ Context 轮数阈值（不可靠估算，约 15 行）+ 用不到的 MagicPath/Gap 断言对纯任务流（plan-agent.md:255-457 约 200 行中，设计流之外永不触发的约 80 行）。综合估算约 **350–470 行 / 1570 ≈ 22%–30% 为 aspirational/never-fires**，其余 70%+ 为 operative（plan-agent 经 route-guard 实时接入；work-agent 模板与 quality-gate 断言在 /auto 路径真实使用）。
- **真正被 hook 主动接入的 agent**：1 / 5（仅 plan-agent，经 route-guard.mjs:302/310）；其余 4 个靠主 Agent「读文档自觉扮演」。

### 优化机会（候选方向）

1. **删除 SPAWNED_SESSION/LUCA_SPAWNED 全部残留**：18+ 文件的检测块 + `.agents/` 镜像副本均无运行时支撑，CLAUDE.md 已自认不触发。直接删，或落地为真实 hook（在 Agent 启动时 export），二选一，不要悬空。
2. **合并 preflight + quality-gate 为单文件双 mode**：两者都围绕 handoff `gate_result` 做前/后检查，合并可减一个 agent、消除重叠，并把「谁写 gate_result」的责任收敛到一处。
3. **统一 skill_execution 的 handoff 写入责任方**：在三个文件里只保留一个主语（建议「执行该 skill 的 WA / main_agent 写，Orchestrator 只更新 ADOPTED/REJECTED」），删掉另外两处矛盾表述。
4. **下调 Hierarchical 的承诺**：真实 CC 不支持 agent 嵌套 spawn，应把 Hierarchical 改述为「主 Agent 串行模拟的分组执行」，删除暗示持久 supervisor 的失败恢复协议，或明确标注「由主 Agent 单层模拟」。
5. **把 MagicPath/Gap 断言与路径映射表外移**为按需加载的 reference 文件，让 orchestrator/plan-agent 主体只保留通用编排逻辑，降低每次读入的固定 context。
6. **用更可信的 context 信号替换轮数阈值**：或至少在文档里明确标注「轮数仅为粗略代理，不可作为硬 gate」，避免给出虚假的精度。
