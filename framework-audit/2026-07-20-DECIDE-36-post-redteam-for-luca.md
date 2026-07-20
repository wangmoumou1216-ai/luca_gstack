# DECIDE 终裁清单（红队单轮后）— 36 条待 luca 裁决

> 2026-07-20 · 51 条剩余 DECIDE 经单轮对抗红队(serial fable, 0 err)：**19 APPLY / 29 LUCA_DECISION / 3 DROP**。
> 其中 **14 条已落地**（12 净正向机械修 + 2 已被兄弟修复连带修好），**1 条转 KNOWN-BOUNDARY**，**36 条留你裁决**（见下）。
> 每条附红队 verdict + 建议。带 ⚑ = 红队判 APPLY 但触保护区/软化门/需我代写新行为，我未自行落地、等你一句话。

---

## ① 保护区精确编辑（红队已核可，建议 approve、我来落地）  （5 条）

**FW4-134** ⚑ · `challenge` · pz=none
- 问题：challenge 产出路径与 _OUTPUT 是未解析的 glob `docs/prd/*-challenge.md`，既作为写入目标又作为 workflow-state 的 _OUTPUT 值——不是可写的具体文件路径，也不遵循其它 skill 的 `YYYY-MM-DD-<topic>-` 命…
- 红队(APPLY/HIGH)建议：把该行（line 185，全文件唯一出现）改为 export _OUTPUT="docs/prd/$(date +%Y-%m-%d)-${_TOPIC}-challenge.md" —— 只改值不改 _OUTPUT 变量含义；_TOPIC 在同一 bash 块上方已解析导出，可直接引用。

**FW3-058** ⚑ · `ux-audit` · pz=P7
- 问题：ux-audit workflow-state 写入块 export 的 _NODE / _STATUS 从未被下方 python 读取（python 硬编码 'ux-audit' 与 status='DONE'），是死变量。
- 红队(APPLY/HIGH)建议：在「export _NODE="ux-audit"」上方插入一行注释：「# _NODE/_STATUS 为 P7 契约标记；下方 python 块硬编码同义值（'ux-audit'/'DONE'），改这两行不影响实际写入」。不动 export 两行本身。

**FW5-dc-designA-05** · `design-brief` · pz=none
- 问题：边界项：design-brief frontmatter 的 recommended-model 注释写『judge/oracle环节按fable_whitelist P1单独dispatch fable』，但 design-brief 正文全流程（Phase A→8）没有任何 Oracle/jud…
- 红队(LUCA_DECISION/HIGH)建议：批准仅改注释文字（值 core-execution 一字不动）：改为『# 2026-07-10 Fable手术刀：整场收敛opus；本 skill 无 judge/oracle 环节』。零行为影响、消除 daily_governance 漂移看护误判源；不建议反向补 Oracle Phase + Task 权限（未请求的 scope 扩张）。

**FW9-r1-03** · `open-design` · pz=none
- 问题：open-design/SKILL.md frontmatter 的 shared-refs 声明 `brand-tokens`，破坏了 shared-refs = references 池文件的加载契约——references/ 里没有 brand-tokens.md（该文件在仓库根），而其余所有…
- 红队(LUCA_DECISION/HIGH)建议：推荐经授权做最小 P1 编辑：把 shared-refs 改为 [handoff-protocol]，同时在 open-design 正文 Phase 0/1（编译 OD 指令处，即 FxUI 品牌色/文字色叠加块的取值来源）显式加一句「Read 仓库根 ./brand-tokens.md 取品牌 token」——比在 shared-refs 里留一个违反池内约定的条目更诚实，也不动被广泛根路径引用的 brand-tokens.md 本体。不推荐搬文件入 references/（断 10+ 处既有引用，违最小改动）…

**FW4-109** ⚑ · `office-shared` · pz=P3
- 问题：边界项(P3保护区)：skill-invariants P3 规定每个 skill 的 preamble bash 块含『不得删除』的关键命令 get_rules.py 与 cat .claude/current-topic.txt；office/SKILL.md 的 preamble 块（16-2…
- 红队(APPLY/HIGH)建议：在 Preamble bash 块内、锚文本行之后追加三行（照抄 html-prototype L41-44 规范形态）：_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")、echo "CURRENT_TOPIC: $_TOPIC"、python3 .claude/observability/scripts/get_rules.py office "*" 2>/dev/null || true。只增不删不改既有行。


## ② allowed-tools 权限面变更（P1，改权限边界，须你授权）  （7 条）

**FW4-151** · `compare` · pz=P1
- 问题：compare/SKILL.md declares `allowed-tools: Read, Bash` but Phase 4 requires writing an output markdown file to docs/decisions/ — no Write tool is grant…
- 红队(LUCA_DECISION/HIGH)建议：推荐批准把 allowed-tools 改为 `Read, Bash, Write`：Phase 4 的 docs/decisions/ 产出是该 skill 自己声明的 P2 输出契约，正文也写明『对比报告本身写入 docs/decisions/』（line 13）——当前白名单让 skill 自己的契约不可达，agent 只能用 CLAUDE.md 不鼓励的 Bash heredoc 绕行。加 Write 是让声明匹配既有承诺的最小拓宽，不引入新能力面。compare 现为隐藏 skill，风险面进一步有限。

**FW4-090** · `figma-layer` · pz=P1
- 问题：figma-layer allowed-tools 不含 Skill 工具，但正文三处把「先加载 /figma-use skill」列为 use_figma 的强制前置——权限面与执行指令不匹配
- 红队(LUCA_DECISION/HIGH)建议：推荐批准把 Skill 加入 allowed-tools：/figma-use 加载在正文被三处（Phase 0 / Phase 3 / 末尾约束1）定为不可跳过的强制前置，且 figma 插件自身 description 也要求 use_figma 前必载该 skill——不加则该门在权限收紧的执行环境下必然卡死或形同虚设。这是把权限面对齐既有承重指令的最小增补，不引入新行为。次选（不推荐）：验证当前 harness 对主 agent 执行 skill 时是否根本不执行 allowed-tools 约束，若确认不…

**FW4-091** · `figma-layer` · pz=P1
- 问题：figma-layer 正文捕获快路径使用 generate_figma_design，但该工具未在 allowed-tools 声明
- 红队(LUCA_DECISION/HIGH)建议：推荐批准把 mcp__figma__generate_figma_design 加入 allowed-tools 而非删节：该快路径标注为 2026-06-10 实验验证、评审/预览级可省约15分钟手搭，且正文已写清其局限与分流条件（保险层级仍走手搭），是有真实价值的既有能力；删除是能力回退。加一条 mcp 工具声明即令权限面与正文一致。

**FW9-r9-47** · `redteam` · pz=none
- 问题：redteam / retro / taste-review 的 allowed-tools 只声明 [Read, Write, AskUserQuestion]，都漏了 Bash——但三者的 Preamble（git branch/ls/get_rules.py）与 redteam/retro 的…
- 红队(LUCA_DECISION/HIGH)建议：建议批准：给 redteam、retro、taste-review 三个 SKILL.md 的 allowed-tools 各加一行 `- Bash`。三者现状逐一核实：redteam L8-11 / retro L7-10 / taste-review L10-13 均只声明 [Read, Write, AskUserQuestion]，但三者 Preamble 全是 bash 代码块（`_BRANCH=$(git branch --show-current ...)`；redteam 还有 get_rules.…

**FW3-022** · `deepresearch` · pz=P1
- 问题：边界项：frontmatter 缺 allowed-tools（P1 将其列为受保护的权限边界字段）。该 skill 自述『read-only research skill』却用 Write 写报告、用 task() dispatch 子 agent，无任何工具边界声明。（同类缺失见 auto/br…
- 红队(LUCA_DECISION/HIGH)建议：建议不单点补 deepresearch：同类缺失是 auto/brainstorm/magicpath/ux-brainstorm 共享的被容忍模式，validate-skills.sh 也不校验。若要修，一次性对整个家族补 allowed-tools（deepresearch 实际集合约为 Read/Write/Bash/Task/WebFetch/WebSearch/AskUserQuestion）并在 validate-skills.sh 加存在性校验，让『read-only』承诺有机器保障；单补一个 ski…

**FW3-044** · `ux-research` · pz=P1
- 问题：边界项：frontmatter allowed-tools 声明为封闭 4 项 [Read, Write, Bash, AskUserQuestion]，但 skill 核心机制在正文用 task()/background_output()/subagent 派发，子 agent 还依赖 webse…
- 红队(LUCA_DECISION/HIGH)建议：推荐删除整个 allowed-tools 块，与同族 deepresearch 对齐（后者不声明即开放，二者机制同为多 subagent 派发+websearch）。次选是在列表补 Task，但那仍是不完整声明（子 agent 依赖 websearch/webfetch）。注意当前 harness 对项目 skill 的 allowed-tools 未见强制执行，实害主要是声明误导读者，非运行时故障——不改也可接受，但改则建议删块而非补项。

**FW4-126** · `auto` · pz=P1
- 问题：auto frontmatter 只有 name/preamble-tier/argument-hint/recommended-model，缺 P1 涉及的 allowed-tools（权限边界）、context-cost（上游调度估算）与 description——而 auto 已注册进 ROU…
- 红队(LUCA_DECISION/HIGH)建议：分三件裁：① description 可直接补（P1 允许改措辞，写清『顶层自动化编排入口』+触发词），零风险；② context-cost 补实测值（self=wc -c 该文件，runtime-estimate 参照同为 heavy skill 的 muse-loop-orchestrate），供治理脚本/parity 锚点读取；③ allowed-tools 建议**有意留空并加一行注释说明**——auto 是全域编排器，合法工具面≈全集（Read/Write/Bash/Task/AskUserQuestio…


## ③ 删除孤儿文件（须你明确授权删除）  （6 条）

**FW4-086** · `references/workflow-state-writer.sh` · pz=None
- 问题：workflow-state-writer.sh 是孤儿：全库零引用（无 skill source/调用它），其 write_state/set_topic 功能已被 write_state.py 完全取代——后者被 design-brief/evals/figma-layer/redteam/op…
- 红队(LUCA_DECISION/HIGH)建议：建议批准删除 workflow-state-writer.sh：本轮全库 grep 复核零引用（唯一命中是它自己的用法注释与 framework-audit 审计文档），write_state.py 同目录并存、被 9+ skill 实际消费（本 bin 亲验 open-design Phase 6 即调 write_state.py），git 历史可随时找回。前序 checkpoint（framework-audit/2026-07-18-decide-adjudication-checkpoint.md L43…

**FW3-072** · `figma-demo` · pz=none
- 问题：assembly-constitution.md（294 行）是死引用文件：Phase 5 调度只『读取 assembly-agent.md』、必读清单也不含它，全 skill 无处引用；它与 assembly-agent.md 重复，且其内联 HTML 骨架的 tailwind 颜色表是 demo…
- 红队(LUCA_DECISION/HIGH)建议：推荐删除 assembly-constitution.md（或降为一行指针指向 assembly-agent.md）：它 294 行零引用、自述虚假、颜色表已漂移，保留只产生双权威维护税。当前实际执行链（assembly-agent.md + demo-template.html）已完整工作，删除零功能损失。与 FW6-sim-figma-demo-02 同一处置，一次裁决覆盖两条。

**FW6-sim-figma-demo-02** · `figma-demo` · pz=none
- 问题：assembly-constitution.md 是孤儿且与 specialists/assembly-agent.md 构成双权威：Phase 5 调度只传 assembly-agent.md + demo-template.html，从不传 assembly-constitution.md，而后…
- 红队(LUCA_DECISION/HIGH)建议：推荐方案二：删除 assembly-constitution.md，以 specialists/assembly-agent.md 为唯一权威。理由：当前实际执行链一直如此工作（改 constitution 从不生效），方案一需重构 Phase 5 调度并把两份已分叉的规则（transitions 键 'node-01→node-02' vs '0→1'）重新对齐，成本高且 skill 已隐藏低频、无观测收益。与 FW3-072 同一裁决。

**FW4-144** · `tech-spec` · pz=none
- 问题：边界项：tech-spec/SCHEMA.md 与 task-plan/SCHEMA.md 均为孤儿文件——两个 SKILL.md 全文 grep 零次引用 SCHEMA（Phase 6.1/8.1 改用行内节名清单），是无 context pointer 的 disclosed reference…
- 红队(LUCA_DECISION/HIGH)建议：推荐选项②：删除 tech-spec/SCHEMA.md 与 task-plan/SCHEMA.md 两个孤儿文件。理由：两个 SKILL.md 全文 grep『SCHEMA』本轮复核仍零引用，行内节名清单（tech-spec L244 起『文件必须包含以下节（节名锁定…）』）才是 agent 实际执行的承重真值，SCHEMA 已漂移（列/ID 冲突两条兄弟 finding）且无人指向——删掉即消除 SSOT 分裂，git 保历史。选项①（反转让 SCHEMA 当 SSOT + 删正文清单 + 补 pointer/…

**FW3-039** · `ux-research` · pz=none
- 问题：SCHEMA.md 是 report-template.md 的孤儿副本：SKILL.md 只加载 report-template.md，SCHEMA.md 全仓无任何引用（grep 确认），且两份报告模板已经漂移（SCHEMA 有『源多样性』列与『证据质量评估』表，report-template …
- 红队(LUCA_DECISION/HIGH)建议：推荐删除 .claude/skills/office/ux-research/SCHEMA.md，保留 references/report-template.md 为单一真值源：运行时链路只加载 report-template（第457行），SCHEMA 全仓零引用、已漂移，留着只会制造「按 schema 改却不生效」的维护陷阱。若想保留「源多样性」列的想法，先把该列合入 report-template 再删 SCHEMA，一次改动闭环。

**FW9-r5-29** · `evals` · pz=none
- 问题：evals/SCHEMA.md 是无人引用的孤儿模版且与 evals/SKILL.md 内联模版分叉：SKILL.md 从不『读取 SCHEMA.md』（grep 零命中），却内联一份自己的模版；两份对同一产出 docs/evals/…-evals.md 的节点表不一致——SCHEMA 有 12 节…
- 红队(LUCA_DECISION/MED)建议：推荐向姊妹约定收敛：先把内容合一（节点表/锚点表以哪版为准需拍板——SCHEMA 的 12 节点版更全，但含已隐藏的 figma-demo 与 challenge），然后在 evals/SKILL.md 执行节加『读取 SCHEMA.md，按格式写入产出文档』并把内联模版缩为指针；不删除 SCHEMA.md。注意与 FW4-139 的 CRM 行同批处理，避免两次编辑同一张表。


## ④ 门/行为逻辑变更（红队有建议，方向你定）  （10 条）

**FW9-r1-05** · `careful` · pz=none
- 问题：careful 的『警告并等待确认』『允许用户覆盖』被它自己的 PreToolUse hook 变成死锁：hook 对匹配命令一律 exit 2 硬拒，无任何确认/覆盖旁路，用户确认后重跑仍被同一 hook 再次拦死。
- 红队(LUCA_DECISION/HIGH)建议：推荐把 hook 的无条件 exit 2 改为输出 PreToolUse JSON `permissionDecision: "ask"`（Claude Code hooks 原生支持）——harness 会弹真实用户确认框，精确落地 SKILL.md 承诺的『警告+等待确认+可覆盖』语义，安全网不减（每次危险命令仍必经人确认），且顺带把 FW9-r4-18 的误杀代价降为多点一次确认。次选（最便宜）：改 SKILL.md description/正文措辞承认『硬拦截、无覆盖』，让承诺与实现一致——但这等于把死锁定…

**FW9-r4-18** · `careful` · pz=none
- 问题：careful 的 PreToolUse 钩子对整个命令 payload 做字面 grep，会把仅在字符串字面量里提到危险模式的安全命令（grep 审计、echo 警告文本、git log --grep）一律 exit 2 硬拒——且无覆盖旁路，正常只读工作被误杀。这与已知 FW4-097（短写漏匹…
- 红队(LUCA_DECISION/HIGH)建议：不要动正则（锚定会产生真危险命令漏拦的假阴性，比误杀更贵）。与 FW9-r1-05 合并解决：hook 改输出 `permissionDecision: "ask"` 后，误杀的代价从『只读命令被永久卡死』降为『多确认一次』，保守正则反而变成可接受的设计。若不采纳 ask 方案，则建议接受现状（careful 是显式 opt-in 模式，保守即卖点），本条记为 by-design 关闭。

**FW9-r7-38** ⚑ · `figma-layer` · pz=none
- 问题：figma-layer Phase 0 对 source=html-prototype 硬性要求 design-brief.md 存在含 shadcn 组件映射表否则 BLOCKED——与其 input-modes 契约（design_brief 为 optional）以及同 Phase 内 fig…
- 红队(APPLY/HIGH)建议：把该检查项改为带 fallback 的两级判定：「□ source=html-prototype 时：design-brief.md 存在 → 已读取并确认 shadcn 组件映射表存在？；design-brief.md 缺失（standalone 合法，input-modes 中 design_brief 为 optional）→ 改用 prototype-spec.md「shadcn 组件清单」节作为组件清单来源（Phase 0 已必读）；两者皆缺 → BLOCKED — 组件清单来源缺失」。同时同步 Phas…

**FW3-051** · `handoff-review` · pz=none
- 问题：handoff-review Phase 2.5 auto-revise 派上游 skill『整体重生成』产物，却只重跑失败的 1–2 个 specialist，先前通过的检查不复检就把最终结果改为 PASSED。
- 红队(LUCA_DECISION/HIGH)建议：推荐采纳「重生成后全量复检」：把步骤3 改为「上游整体重生成后，重跑本次审查原选中的全部节1/节2 specialist（非仅失败者），全部通过才改 PASSED」。理由：specialist 是廉价的 checklist agent（单次远小于重生成成本），而 PASSED 是交付级承诺——用旧结论认证被重生成过的产物是拿正确性换小额 token。保持恰好一次、不二次循环的语义不变。备选（更便宜但弱）：维持只重跑失败节，但 PASSED 输出强制附注「节X结论基于重生成前产物，未复检」交人裁决——把盲区显式化而非…

**FW9-r4-19** ⚑ · `muse-req-triage` · pz=none
- 问题：muse-req-triage Phase 3 第4步无条件对 `statement_ears` 字段做 EARS 机械校验（两个入口都做），但该字段从未在本 skill 的 Phase 0/1 被产出——Phase 0 只指示三铁律忠实抽取+算信号+抽 design_reference，且入口 A…
- 红队(APPLY/HIGH)建议：在 Phase 0 的「设计参照引用的忠实抽取」段落之后（与其并列、标注两个入口都做）新增一段：「**statement_ears 规整（两个入口都做，schema.md 既定 Phase 0 必填字段）：** 对每条 type=requirement 候选，按 `muse-loop/schema.md` 的 EARS 四模板（事件驱动/状态驱动/条件驱动/通用型，按需求性质选）把一句话陈述规整为 `statement_ears`；type=open_question 可省略或写成疑问句。入口 B 接收的条目若已带…

**FW9-r4-23** ⚑ · `muse-loop-orchestrate` · pz=none
- 问题：muse-loop-orchestrate 把 design.md（L2）列为 REQ 目录必产物、并指示把派生的 acceptance_criteria『写入 schema.md L2』，但全篇没有任何写 design.md 的步骤，派生 AC 无落地文件——L1/L3/L4 都有显式 Write…
- 红队(APPLY/HIGH)建议：在锚文本（AC 推导子步骤第3点末尾）之后新增第4点：「4. 落盘（补齐 L2 契约文件，镜像 Phase 4 收尾 prototype.html 的复制先例）：按 `muse-loop/schema.md` L2 卡格式，把本 REQ 的 maps_to（取自 design-brief 产出的 D-系列决策/组件映射）与上面派生的全部 acceptance_criteria（含 source/ae_ref 标注）Write 到 `docs/loop/specs/REQ-*/design.md`，并在文件头记录来源…

**FW9-r5-27** · `figma-demo` · pz=none
- 问题：figma-demo Step 6.2 在 current-topic.txt 为空时把 _TOPIC 回退到 `ls -t docs/idea/*.md` 推出的最新 idea 主题，但 figma-demo 由 Figma/口述+blueprint 驱动、与 docs/idea 无关；据此拼出的…
- 红队(LUCA_DECISION/MED)建议：推荐把回退源从 docs/idea 换为本 skill 自己的产物：`ls -t docs/prototype/*/blueprint.yaml | head -1` 取目录名、剥日期前缀得 _TOPIC（Phase 3 刚写过 blueprint，同 session 内必然命中本次运行目录），最后兜底仍留 unknown。这让 _OUTPUT 始终指向 Step 6.1 真实写盘目录。若嫌复杂可退而求其次：直接删 docs/idea 回退、留 unknown——错误至少显式可见，不再静默指向无关主题。

**FW9-r6-33** · `evals` · pz=none
- 问题：evals 未被点名的 docs/idea topic 回退错配兄弟（已知 challenge/figma-demo/taste-review/design-brief）：evals 对既有决策/原型打分、与 docs/idea 无关，但 current-topic 为空时 _TOPIC 从最新 d…
- 红队(LUCA_DECISION/MED)建议：推荐与已列的 challenge/figma-demo/taste-review/design-brief 同批裁决：对不消费 docs/idea 的 skill（evals/challenge/taste-review 等）把回退从『最新 idea 文件名推断』改为 `unknown`（保留执行前必须确定 _TOPIC 的指令行为主防线）；idea 链路下游（design-brief 等）可保留现回退。一次改全家族，不单改 evals。P3 严重度，也可接受维持现状不修。

**FW6-sim-html-prototype-03** · `html-prototype` · pz=none
- 问题：边界项：P2-V 序号规则要求同日同 skill 多次运行加递增三位序号避免覆盖，但 Phase 4 对原型目录只做 `mkdir -p docs/prototype/<date>-<topic>` 无任何序号逻辑，且 P2 受保护路径把 index.html 定为无序号位的目录格式——同日同 to…
- 红队(LUCA_DECISION/HIGH)建议：推荐改 invariant 而非改 skill：在 P2-V 增加一条显式豁免——目录型产出（docs/prototype/<date>-<topic>/）有意就地覆盖、不加序号，理由：① P2 严格路径无序号位，下游 glob 依赖稳定路径；② handoff-review auto-revise 环依赖同路径就地重生成；③ 历史版本由 git 承担（仓库产物均入库）。这样两条保护声明自洽，Phase 4 无需改。不推荐给原型目录加序号逻辑：它同时破坏 P2 路径契约与 auto-revise 复检指向，净负。若…

**FW4-127** ⚑ · `muse-loop-orchestrate` · pz=P3
- 问题：边界项：auto 完全没有 Preamble bash 块，muse-loop/muse-req-triage/muse-proto-gen/muse-x-digest 的 Preamble 均不含 P3 列为不得删除的 get_rules.py 与 cat current-topic.txt——o…
- 红队(APPLY/HIGH)建议：五个文件按 html-prototype L41-44 规范形态补齐。① auto/SKILL.md：在锚文本标题前插入「## Preamble（run first）」节，bash 块含：_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown"); echo "BRANCH: $_BRANCH"; _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none"); echo …


## ⑤ CRM-vs-产品中性定位（产品裁决）  （3 条）

**FW4-139** · `evals` · pz=none
- 问题：边界项：evals 把「C CRM业务专项」作为固定评审模块硬写进节点表与 SCHEMA（镜像 ux-audit 模块 C），但框架 2026-07-03 已裁定去 CRM 身份、CRM 件转休眠层——CRM 专属模块作为承重评审维度是 CRM 时代残留
- 红队(LUCA_DECISION/HIGH)建议：推荐按 2026-07-03 去 CRM 裁定，把 ux-audit Module C 与 evals/SCHEMA 的 C 行一次性泛化为『业务领域专项（当前 profile 定义）』并允许非 CRM 产品标 N/A（权重归入 A/B）；次选是三处统一加注『仅 CRM profile 激活时填写』。不要只改 evals 一处。

**FW3-052** · `ux-audit` · pz=none
- 问题：ux-audit 的 defining constraint（description 首行）写死『CRM页面UX评审』，与 2026-07-03 去 CRM 身份裁定、以及 routing-map 的通用触发词（评审/UX问题/页面评审/挑毛病）冲突。
- 红队(LUCA_DECISION/HIGH)建议：建议与 FW3-054 一并裁决：description 首行改为「页面UX评审」（去掉 CRM 前缀），第7行 Module C 标注为「CRM 业务专项（可选，仅 CRM 类项目）」。这与 2026-07-03 去 CRM 身份裁定及 SF-005（场景四类产品中性）一致；description 措辞本身可改（P1 只锁 allowed-tools/context-cost/preamble-tier），阻力仅在定位判断。

**FW3-054** · `ux-audit` · pz=none
- 问题：边界项：module-c-crm 整节为纷享销客 CRM 专属（首屏字段清单/高频操作/CRM 列表专项），在 2026-07-03 去 CRM 裁定后其在通用 ux-audit 中占 25% 权重的地位待核。
- 红队(LUCA_DECISION/HIGH)建议：建议保留 module-c 文件不删（它对 CRM 项目仍有效，SC-20260523-001 也是 profile 门控思路），但在 SKILL.md Phase 0 询问3 和 Phase 2 评分规则中明确：C 仅 CRM 类项目适用；非 CRM 项目选 A+B 时按归一化权重（A 35/75 ≈ 47%、B 40/75 ≈ 53%）出**完整评分**，不再标「不完整评分」。这消除假 P0 与永久缺 25% 两个失败分支，改动最小且可逆。


## ⑥ 产品/架构杂项  （5 条）

**FW4-111** · `muse-x-digest` · pz=none
- 问题：muse-x-digest 三面失联（routing-map/office/slash 皆无）是其 frontmatter line 12 明写的设计意图、且它已登记进 model-routing.yaml(56)，故可达性经 muse app 注入完好；但它在 CLAUDE.md 全文零登记——连…
- 红队(LUCA_DECISION/HIGH)建议：推荐保留并登记：在 CLAUDE.md「muse 专属 skill」的语义兜底段（muse-proto-gen 登记处同段）加一句「`muse-x-digest`（仅由 muse app 注入调用，无 /office、无路由词条、无斜杠命令）」——理由：它被 muse app 实际使用、已登记 model-routing.yaml，治理面（盘点/降级复盘/可达性排查）应有记录，且登记方式与 muse-proto-gen 对齐、零行为影响。若 F0-01 裁定删除该 skill，本条随之作废。

**FW4-088** · `references/office-wizard.md` · pz=None
- 问题：边界项：office-wizard.md Step 3 一级 skill 清单（145-273 行）与 CLAUDE.md「一级可见 skill 列表」表几乎逐条重复描述——同一份 skill 描述维护在两处，已发生漂移（见 html-prototype 标签 finding）。
- 红队(LUCA_DECISION/HIGH)建议：推荐折中案：不砍 office-wizard 的 Step 3 详表（/office 需要一份自包含、可直接展示给用户的清单，让它运行时去读 CLAUDE.md 拼表反而增耦合），而是在两份表头各加一行互指同步注（『本表与 CLAUDE.md「一级可见 skill 列表」为同一清单双呈现，改任一处必须同步另一处』），把双份维护从隐性变显性。若你更想要硬 SSOT，则选 finding 原案：wizard 只留场景推荐流程、详表整段替换为指向 CLAUDE.md 的 pointer——但这改变 /office 的用户…

**FW5-dc-review-02** · `design-review` · pz=none
- 问题：后置原型质量核查（品牌色≤3处 / 空·加载·错误·成功·默认五态 / 组件映射）同一批判据同时维护在 design-review 后置验收、handoff-review 节2、ux-audit Module A 三个文件；且 design-review 与 handoff-review 的 def…
- 红队(LUCA_DECISION/MED)建议：推荐最小方案：把 design-review 已有的那段同步注记镜像一份到 handoff-review 节2 与 ux-audit Module A specialist，三向可见即封住静默漂移；暂不抽取 references/prototype-quality-criteria.md（新文件+三处改指针的 churn 大于当前收益），除非未来判据真发生一次漂移再抽。

**FW5-dc-designA-01** · `ux-brainstorm` · pz=none
- 问题：ux-brainstorm 强制产出 interaction-architecture.md（Phase 7，跳过=CRITICAL），并在 handoff 里把「交互架构约束」列为下游约束，但没有任何下游 skill glob/读取该文件；design-brief（声明的继承方）只 glob ux…
- 红队(LUCA_DECISION/HIGH)建议：推荐选项1（design-brief 探测并继承 interaction-architecture.md）：ux-brainstorm 把跳过 Phase 7 定为 CRITICAL、handoff 明列其为下游约束，说明框架意图上它就是机器可消费契约，降级为纯人类交付物与既有强制语义自相矛盾。具体：design-brief preamble 增加 _INTERACTION_ARCH=$(ls -t docs/decisions/*-interaction-architecture.md ...) 探测行，Phas…

**FW9-r7-37** · `html-prototype` · pz=none
- 问题：场景B 硬前置 prd-constraints.md 在整个 skill 集里无任何生产者；html-prototype 的 BLOCK 补救指令把用户指向 /brainstorm 生成该文件，但 brainstorm 只产 prd.md/prd-ai-spec.md、从不写 prd-constra…
- 红队(LUCA_DECISION/HIGH)建议：推荐指定 brainstorm 场景B 为生产者：Phase 6 在 scene=B 时额外产出 docs/prd/{date}-{slug}-prd-constraints.md（围栏/Not-Do List 本就来自 PRD 的 Scope Boundaries）——理由：① html-prototype 的 BLOCK 文案已把用户指向 /brainstorm；② office SSOT 把该文件登记在 docs/prd/（brainstorm 的产出目录）；③ design-brief 把它当输入0，必须先…


---

## ⚠ 跨条冲突/联动（裁决前请注意）

- **FW3-022 ↔ FW3-044 方向相反**：FW3-022 建议给 deepresearch 家族**补** allowed-tools；FW3-044 建议给 ux-research **删** allowed-tools 块（对齐 deepresearch 的不声明）。二者是同一个战略选择的两端——**research 家族到底声明还是不声明 allowed-tools**，请先定家族方向，再一次性套用。
- **FW3-039 ↔ 已落地的 FW3-045**：我已给 ux-research/SCHEMA.md 补 FILE_END(FW3-045)；FW3-039 建议把这同一个 SCHEMA.md 当孤儿**删除**。若你批准删除，FILE_END 随之作废（无害，仅提示）。
- **FW3-072 = FW6-sim-figma-demo-02**（同一个 assembly-constitution.md 删除）；**FW9-r1-05 + FW9-r4-18** 红队建议合并为一个改动（careful hook 改 `permissionDecision:"ask"`，一并解决死锁+误杀）。