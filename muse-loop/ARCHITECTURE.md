# muse-loop · 隔离架构与加法纪律（决策文档）

> 本目录 `muse-loop/` 及下述脚手架是 **muse fork 专属新增**，只落 fork、绝不回污母版 luca_gstack。
> 母版 = `/Users/luca/Desktop/luca_gstack`（只读升级源）；本 fork = `~/Desktop/项目/muse/gstack`（muse 分支）。

## 隔离 + 继承机制（已落地）
- **隔离**：本 fork 是母版的独立 git 克隆。muse app 内嵌 claude 的 cwd = 本 fork，所有改动物理上到不了母版。
- **继承**：`upstream` 远程指母版；`./sync-upstream.sh [母版分支]` 把母版升级 merge 进来（未改文件干净合入 = 直接引用，仅 muse 改过的文件才冲突，在 fork 内解决）。
- **经验层共享**：muse app 给 pty 注入 `MEMORY_ROOT` + `GLOBAL_MEMORY_DIR` 指母版 → memory/semantic/全局个人记忆与母版一套，不分叉。
- **验证**：改 fork 任意文件 → `cd ~/Desktop/luca_gstack && git status` 母版零变化。

## 加法纪律（最小化 merge 冲突——关键约定）
母版升级最常改 3 个集中真值源：`skill-routing-map.yaml`、`CLAUDE.md`(+`AGENTS.md`)、`scripts/check-routing-map.mjs`。
muse 的"需求→原型 Loop"新增应**尽量少碰**它们，以让每次 `sync-upstream` 近乎零冲突：
1. **muse 命名空间**：新增 skill 目录用 `muse-*` 前缀（如 `.claude/skills/office/muse-req-extract/`），与母版 skill 隔开、便于识别与后续可能的独立注册。
2. **Loop 脚手架放 fork 根/本目录**：`constitution.md`、`specs/`、`corpus/`、`traceability.md` 全在 fork（不放母版），见下。
3. **驱动方式（待实现时定，倾向 A）**：
   - **A｜独立 orchestrator（加法，推荐）**：Loop 由 `muse-loop-orchestrate` skill 显式驱动状态机（draft→triaged→designed→built→verified），**不改母版 route-guard.mjs** → 零 SSOT 冲突。
   - B｜route-guard 当状态机（方案原设计）：改 **fork 的** route-guard.mjs 按 spec status 路由 → 母版该文件升级时 merge 冲突，但在 fork 内解决、不回污母版。
   - 结论：优先 A；仅当 A 表达力不足再退 B。

## 脚手架（本 Phase 只立目录与骨架，不实现 Loop 逻辑）
- `constitution.md`（fork 根）— 设计哲学 + FxUI token 规则 + AX 原则 + 真伪判据 + RICE/Kano 打分定义（骨架，待实现填充）
- `specs/REQ-*/`（fork 根）— 每需求 4 文件：requirement.md / design.md / prototype.html / scorecard.md（模板待建）
- `corpus/`（fork 根）— L0 语料（或软链 Obsidian vault）
- `traceability.md`（fork 根）— 全局可追溯矩阵（骨架）

## 落地顺序（后续独立大任务，非本次）
方案主张"先建判官(proto-judge)再向输入端倒着建"，Phase 0-4，判官校准一致率 <75% 则 Loop 不成立。
详见母版旁的 `~/Desktop/luca_gstack_需求到原型Loop_深度解决方案.md`。

---

## Phase 0+1 红队验证结论（2026-07-01）

两轮 Workflow（`muse-loop-plan-validation` run `wf_749d4562-7ed` + `muse-loop-coexistence-validation` run `wf_ac857623-273`，共 52 agent、约 380 万 subagent tokens）对深度解决方案报告做全量落地核验+对抗，产出 20 条裁决。完整计划见 `~/.claude/plans/bubbly-frolicking-wand.md`（session 相关路径，可能变化——本节是永久摘要，勿依赖该路径长期存在）。

### 核心发现：6 个拟新增 skill 里只有 2 个是真新能力

- **req-extract**（不能直接复用 `/idea`）：`/idea` 是 `main_agent`（交互型，会 AskUserQuestion 阻塞）且每次运行无条件覆写 `.claude/current-topic.txt`/`workflow-state.yaml`/`docs/handoff/*` 三个单例状态——循环重复调用会冲掉这些状态。落地：把"忠实抽取、不臆造"铁律抽成共享参考文档，供 `/idea` 和一个更轻量、无状态的抽取步骤共同引用。每轮迭代的真实输入形态（单次静态语料 vs. 跨轮演化多源流）尚未定义，需先定义。
- **req-triage**（不能照搬现有打分/枚举）：`ux-brainstorm` 的 OST 公式输入绑定 research/live-user-answer，`brainstorm` 的 8 值 disposition 枚举绑定单 PRD 内部结构，硬套要么破坏原规则要么等于另造。自建独立 proxy 打分 + 独立 triage 分类，加防火墙：进 PRD 前必须先过 brainstorm 真 Phase 1.5，保护 tech-spec 覆盖率门禁现有信任前提。
- **design-map**（强重叠，`/design-brief` Phase 6/6.5 已是"需求→组件受控词汇表映射+覆盖矩阵"）：不能做"design-brief 精简模式跳到 Phase 6/6.5"（结构不可行，6/6.5 依赖 4/5 产出的 D-系列决策 ID）。若需完整映射，须走 design-brief **完整** phase 顺序（复用其对 ux-brainstorm 上游已有的"继承并核验"checkpoint 模式），且需先修复 tech-spec 现有"取最新 handoff 文件"的朴素逻辑（会跟 design-brief 同日重跑碰撞——对现有可用 gate 的真实回归风险，须先单独修）。共享的 MAPPED/DEFERRED/NEEDS_CONTEXT/REMOVED 词汇表抽成独立参考文件供引用。
  **⚠️ 2026-07-01 用户反馈：认为"拆两个 skill 很奇怪"，要求 Phase 2 执行前重新想清楚融合 vs 独立——"跳过重建"已被红队否决，但"design-brief 完整跑一遍、把 L2 schema 作为 Phase 6/6.5 正常产出的副产品"这条路径尚未被红队正面验证过，是 Phase 2 规划下一步优先核验项。**
- **proto-gen**（强重叠，`/html-prototype` Phase 3/4.5 已是"设计→交互原型+QA"）：不能给 html-prototype 加旁路 flag 跳过人工确认（该 skill 自身文本明确"任何模式下质量 gate 不可跳过"，直接矛盾）。本仓已有解法：`figma-demo` 精确复刻这种"同引擎、不同触发场景"的需求——独立瘦身 skill、自己 frontmatter、`shared-refs` 引用 html-prototype 的防 slop/token 规则、复用 `verify-prototype.mjs`（`allowedModes` 加新模式）。**这不是凭空拆分——是复用本仓已验证的先例**（proto-gen 类比 figma-demo，html-prototype 不变）。
- **proto-judge**（唯一确认的真新能力）：与 ux-audit 须显式区分职责（proto-judge 只对 Loop 验收标准打分，ux-audit 保留通用截图评审），永不静默自动应用任何发现到已产出 HTML/CSS（沿用 ux-audit"P0 必须用户确认"先例，figma-layer 下游也消费同一份 HTML）。内循环收敛借鉴 Oracle 模式"形状"（轮数上限 3、同一发现连续两轮不变则强制退出），不照搬其 PRD 专属分类维度（需新一套：视觉保真度/品牌 token 合规/交互状态覆盖/可访问性）。
- **muse-loop-orchestrate**：独立正向单趟 skill（extract→triage→map→gen→judge 一次性单向链，只有 gen↔judge 有界内循环）；不接入现有 Orchestrator 的 Skill Workflow Mode（终止型、skill-keyed DAG，无回退早期阶段机制，套用需改 plan-agent.md 现有"节点顺序只能前进"绝对规则）。有专属 `/muse-loop-orchestrate` 命令 + fork 的 `skill-routing-map.yaml` 一个词条（触发短语用复合词，不含裸"需求"/"原型"子串）+ fork 自己 `route-guard.mjs` 的 `HEAVY_ORCHESTRATOR_SKILLS` 一行（绝不碰母版对应文件）。5 个流水线阶段 skill 不单独注册，由 muse-loop-orchestrate 内部 dispatch。命名不缩写成"loop"（本环境已有内置 `loop` 定时调度 skill，命名相邻会误触发）。

### 用户已裁定的 5 个真判断分歧（AskUserQuestion，2026-07-01）

1. 编排机制 → 独立正向单趟管线（非接入 Orchestrator）
2. proto-judge 与 ux-audit 关系 → 永不静默自动应用，显式区分职责
3. Loop 产出物理落点 → 走 fork 已有 `docs/` 软链（同 docs/prd 等现有约定），不进 fork 自身 git 追踪树
4. Phase 1 校准严谨度 → 加严：20-30 个独立历史原型 + 第二位盲标注者建人-人一致率基线 + 先写 AC 再看已知结果
5. muse-loop-orchestrate 调用方式 → 加专属 `/muse-loop-orchestrate` 命令（非仅靠自然语言撞关键词）

### 当前状态（2026-07-01）

- **Phase 0：已完成 ✅**。用速记项目真实妙记语料（`obcnhby93v6426u4y3za998v`，851 行逐字稿，luca 授权 lark-cli 拉取，subagent 忠实提取出 86 条具体条目）手填测试 L1/L2 schema，3 条代表性样例（推翻早期方案的定案/全篇分量最重的诉求/显式未决的架构问题）暴露 3 处缺口并已修复：① `entailment` 需要 `compared_against` 区分历史PRD/同会议内被推翻的发言/现有产品实现三种参照物；② `priority` 需要 `qualitative_signal`（强调强度/反复次数/是否被点名重点）承接 RICE 数字填不出时的真实质性信号；③ 需要 `type: requirement | open_question` 区分"可执行需求"与"待决策的开放问题"（语料里相当比例条目属于后者）。schema v0.2 见 `schema.md`，验证记录见 `schema-validation-examples.md`。
- **Phase 1：轻量版完成**（非严格盲标定量校准——见下方诚实记录）。21 条样本（`muse-loop/phase1-calibration-samples.md`：20 条来自 shareclawdemo 项目 decision log + 1 条 luca 指定的 Figma 节点）经朴素 LLM 判官打分：47 条 AC，40 PASS/4 FAIL/3 PARTIAL，全部有真实代码/设计引用支撑，无明显误判（4 条 FAIL 都是真发现，如 `object-detail-overlay.html` 其实仍被引用、conversation.html 设置弹窗与其他7页不一致等）。**诚实记录**：luca 的"第一轮标注"是在看过判官结论之后才表态认同的，不是独立盲标——不构成真实的判官-人类一致率数字。luca 已知情选择接受这个较弱证据强度，直接解锁 Phase 2，而非重新走一遍真正盲标流程。
- **Phase 2：已完成 ✅**。6 个 skill 里最终落地为：`muse-req-triage`、`muse-proto-gen`、`muse-loop-orchestrate` **3 个新 skill 目录**（`.claude/skills/office/`）+ `muse-proto-judge` **1 个新 agent 定义**（`.claude/agents/muse-proto-judge.md`，非 skill 目录，见 Phase 2.1）+ `design-map`（不建独立 skill，= 完整跑一遍 `/design-brief`，母版零改动）+ `req-extract`（不建独立 skill，= `muse-loop/references/req-extraction-principles.md` 三铁律 + orchestrator 内部抽取逻辑，`/idea` 零改动）。新增共享参考文档：`muse-loop/references/{req-extraction-principles.md,component-mapping-taxonomy.md}`。fork 内改动（均在 fork，母版零触碰）：`route-guard.mjs`（`HEAVY_ORCHESTRATOR_SKILLS` 加 1 项）、`skill-routing-map.yaml`（`muse_loop_orchestrate` 1 个词条，复合触发短语）、`input-modes.yaml`（`muse-loop-orchestrate` 项目级 + 3 个隐藏 skill 的 governance_tools 契约）、`verify-prototype.mjs`（`allowedModes` 加 `muse-proto-gen`）、新增 `.claude/commands/muse-loop-orchestrate.md`。`node scripts/check-routing-map.mjs` 与 `bash scripts/verify.sh` 均已跑过：routing/SSOT/route-golden-test/skill校验/coding-discipline/symlink 全部 PASS；仅存的 2 项 FAIL（G2 hooks路径未接、S14 一份无关的 2026-06-30 旧 handoff 缺 gate_result）均为本次改动前就存在的问题，与 muse-loop 无关，未处理。
- **Phase 2.1（曝光机制修正）：已完成 ✅**。luca 2026-07-01 追问"这4个新skill跟我日常场景有没有关系，Plan Agent 规划普通任务时会不会用上"——起初被我理解反了（以为是问"会不会误触发污染"），澄清后是问"有没有被低估的日常价值，该不该主动接进日常流程"。第三轮 Workflow（8 agent）核验：确认 `muse-req-triage`（brainstorm 一次只吃一个输入，缺一道批量候选需求的便宜前置筛选）、`muse-proto-judge`（全仓库无任何 Given/When/Then 语义级原型验证，`verify-prototype.mjs` 只做结构性正则检查）都填了真实的日常缺口，但两份"如何曝光"的初稿都被红队打回（`muse-req-triage`：Phase 1 信号无上游计算来源、frontmatter/input-modes.yaml/argument-hint 仍自称隐藏+Loop专属，自相矛盾；`muse-proto-judge`：混淆了"改母版 vs 只改fork"的范围、混淆了"command文件+Skill工具"与"quality-gate式冷启动Task工具"两种不同调度机制、错误引用了design-brief决策卡有G/W/T字段）。luca 确认曝光范围**仅限 muse fork**（与今天所有改动一致，不碰母版）。已按红队修正方案落地：`muse-req-triage` 升级为项目级双模式 skill（入口A独立使用自己算信号+送进`/brainstorm`；入口B被Loop dispatch），注册路由词条+command文件，`brainstorm`/`plan-agent.md`各加一条引用；`muse-proto-judge` 转为 `.claude/agents/muse-proto-judge.md`（同 `quality-gate` 的 Task 工具冷启动模式，不再是 Skill+command 路径），移除其 input-modes.yaml 治理条目（agents 不归该文件管，`quality-gate` 本身也不在里面）。二次跑 `check-routing-map.mjs`+`verify.sh`：仍是 45 PASS / 同样 2 项无关 FAIL，母版复查确认零影响（HEAD 仍 `b2b83d3`）。
- 完整决策依据（20+8=28 条红队裁决原文）来自三个 Workflow（run id 见本节开头及 `muse-skill-daily-scenario-fit`），原始 JSON 输出未做长期归档，细节如需复核可重新跑同名 Workflow。

### 路径2（Loop）对路径1（母版/既有 skill）的依赖清单（2026-07-01 认真梳理，含一处真实缺陷修复）

luca 追问"路径2会不会用到路径1的skill"时，发现并修复了一处真实内部矛盾：`muse-req-triage` 自己的防火墙规则要求被接受的需求"必须经过 `/brainstorm` 真实 Phase 1.5"，但 `muse-loop-orchestrate` 的 Phase 流程原本 GATE-1 后直接跳到 Phase 2 跑 `/design-brief`，从未安排调用 `/brainstorm`——导致 Phase 2 的 `traceable_delivery` 硬约束（需要真实 PRD 输入）实际上无米下锅。已补 **Phase 1.5**：GATE-1 通过后先完整 dispatch `/brainstorm`（Phase 0-5 全跑，产出真实 PRD），再进 Phase 2。状态机、`schema.md` 的 `status` 枚举（新增 `prd_ready`）均已同步更新。

**真实 dispatch 级依赖（会整个调用该 skill 走完整流程）：**
- `/brainstorm`（Phase 1.5，新补）——GATE-1 通过后，每条需求完整跑一遍，产出真实 PRD。
- `/design-brief`（Phase 2）——design-map 阶段完整跑一遍，不跳过任何 Phase。

**文件/脚本复用级依赖（引用具体文件，不 dispatch 整个 skill）：**
- `html-prototype/scripts/verify-prototype.mjs`——`muse-proto-gen` 直接调用做确定性检查（今天加了 `muse-proto-gen` mode）。
- `references/html-prototype-tokens.md`——`muse-proto-gen` 的 `shared-refs` 直接引用，不重复定义 token 速查表。

**约定/模式借鉴级依赖（沿用设计但零代码调用关系，需注意后续维护漂移风险）：**
- `html-prototype` Phase 3 的防 slop 检查清单 + `DECISION:D-NNN` 注释格式——`muse-proto-gen` 文本承诺"同一份，不另造"，但没有代码级强制同步机制；`html-prototype` 未来若改清单，`muse-proto-gen` 需要人工同步，否则会漂移。**这是本次梳理新发现的一处待办风险，暂未建自动化检测，先记录。**
- `quality-gate.md` 的 agent 定义写法（frontmatter + Task 工具冷启动）——`muse-proto-judge` 照抄这个模式，不调用 quality-gate 本身。
- 母版 `orchestrator.md` 的"扫描待办→查门禁→dispatch→更新状态" prose 模式——`muse-loop-orchestrate` 状态机设计哲学借鉴，明确不复用其代码/`workflow-state.yaml`。
- Oracle 模式（`brainstorm`/`ux-brainstorm` 的 `adversarial-review.md`）——`muse-proto-judge` 内循环收敛"形状"（轮数上限3、连续两轮不变退出）借鉴，不借用其 PRD 专属判据内容。

**Hook 机制级依赖（不是 skill，是钩子行为模式）：**
- 母版 `route-guard.mjs` 的 `HEAVY_ORCHESTRATOR_SKILLS` 门禁模式——fork 内已加 `muse-loop-orchestrate` 一项，母版对应文件零改动。

**明确区分、非依赖关系（只是写了对比说明，互不调用）：**
- `ux-audit`——`muse-proto-judge` 的文件里专门写了一段职责区分，两者不互相调用。

### Phase 2.2（完整性审计 + 修复）：已完成 ✅（2026-07-02）

luca 追问"回溯一下我的诉求，你是否已经满足了"——不凭记忆回答，起了第4轮 Workflow（6 agent，真读文件+真跑 `check-routing-map.mjs`/`verify.sh`，不是复述之前的结论）逐条核对原始报告诉求 vs. 实际文件。查出 2 条阻塞级缺陷 + 4 条文档过时，全部已修：

1. **【阻塞】`tech-spec/SKILL.md` 的"取最新 design-brief handoff"朴素逻辑**——`ARCHITECTURE.md` 自己在决定"design-map=完整跑一遍design-brief"时就标注过"须先修复，否则同日多份handoff会碰撞"，但从未真正修过。已修（v1.0.1）：Preamble 改为先按 `.claude/current-topic.txt` 过滤再取最新，且同日出现≥2份 design-brief handoff 时输出告警，不静默假设。
2. **【阻塞】`muse-req-triage` Entry B 声称写入 `requirement.md` 但自己没有 `Write` 工具**——已修（v2.1.0）：加 `Write` 权限，明确责任在本 skill 自己完成写入，不依赖调度方代写。
3. **【文档过时】`constitution.md` 从未真正填充**（原始承诺的"设计哲学/token规则/AX原则/真伪判据/RICE·Kano定义"一样都不存在，也没有任何 skill 真正引用它）——已重写为真实内容（含如实记录"RICE/Kano 被 `qualitative_signal` 取代"这一真实设计偏离，不假装原样落地），并从 `muse-req-triage`/`muse-proto-gen`/`muse-proto-judge`/`muse-loop-orchestrate` 四个文件各加一条引用回指，让"所有步骤引用本文件"这句话变成真的。
4. **【文档过时】`specs/README.md`/`corpus/README.md`** 仍是 Phase 0 之前的骨架，跟"REQ数据走docs/loop/软链"的最终决定矛盾——已重写为明确的对齐说明（不在这两个fork根目录存真实数据，指向真实落点）。
5. **【文档过时】`traceability.md`**——早期骨架本身被 git 追踪在 fork 根，跟"产出不进fork自身git追踪树"的决定正好相反。已重写为**格式定义**（fork根，git追踪，跟`schema.md`同类），真实、随REQ增长的矩阵实例改落 `docs/loop/traceability.md`（软链，不进fork追踪树）；并把维护职责写进 `muse-loop-orchestrate` 的 Phase 3 收尾步骤。
6. **design-map 的红队验证债**（"design-brief完整跑一遍"这条路径本身"尚未被红队正面验证过"，标注过是"下一步优先核验项"，但被采纳为已完成时没有回去核验）——**如实记录：这条债跟"Loop从未真正端到端跑过一次"是同一个缺口，没有单独补一次假验证去凑数**。第一次真实处理 REQ 时，这条路径是否真的走得通，才是唯一真正的验证。

**核对后仍然真实成立、未受影响：** 路由/接线一致性、`muse-proto-gen` mode 注册、`muse-proto-judge` 最小权限、双入口设计跨文件一致、Phase 1.5 修复、docs/软链路由、母版隔离——第4轮 Workflow 独立重跑 `check-routing-map.mjs`（PASS+PASS）和 `verify.sh`（45 PASS，同样2项无关FAIL）确认无回归。

### Phase 2.3（溯源精确核验 + "完美标准"全面复查）：已完成 ✅（2026-07-02）

luca 连续追问三层："新增skill来源是什么"→"Kiro三件套为什么没引用"→"Spec Kit这个不需要吧"→"三件套核心内容你是不是看了全部该引用的"——每一层都用 WebFetch 抓了真实源头（`kiro.dev/docs/specs|steering|hooks`、AWS官方samples repo、`github.com/github/spec-kit/blob/main/spec-driven.md`），不满足于原始报告的转述。最后 luca 明确指示"我不接受差距,我要做到完美",按此标准对 muse-loop 全部 skill 做了一次穷尽式核对（第6轮Workflow，13 agent）。

**溯源精确度修正（对话中发现，非新缺陷）：**
- `constitution.md` 概念上是 Kiro"steering files"+Spec Kit"constitution.md"两者的融合，但**字面命名来自 Spec Kit**，不是 Kiro（Kiro 从不叫这个名字）——之前口头回答把这个记错了源头。
- Kiro 的 steering files 实际是**目录+多文件+YAML frontmatter条件加载**（`inclusion: always|fileMatch|manual|auto`），不是单文件——本仓 `constitution.md` 是单文件简化版，经核查（46行/2375字符/仅4个消费者）判定 ACCEPTABLE_AT_CURRENT_SCALE，暂不拆分。
- 原始报告称"Spec Kit 也有精简路径"——**抓取 spec-driven.md 原文后确认这个说法不准确**，真实 Spec Kit 原文明确写"没有简化路径，所有功能走同一套宪法门禁"，只有 Kiro 真的有 Quick Plan。这修正了 Phase 2.2 之前那轮红队"两个独立系统收敛证明快速路径重要"的证据基础（弱化，不是推翻——CLEAR_DEFER 结论不变，理由更扎实）。

**穷尽核对结果（6大类核查，2真缺陷+4非缺陷）：**
- ✅ 非缺陷：design.md 的架构/时序图/测试策略内容——确认是刻意范围边界（`design-brief`自己声明"非代码交付节点"+`tech-spec`的Architecture View+`task-plan`的Test Task Cards三处独立确认一致）；"Complexity Tracking"式豁免机制——GATE-1/GATE-2是人类审批卡点非agent自主宪法，豁免机制等于绕开人类审批，已被`allow_standalone_override:false`否决，同"快速路径"一样过早；Design-First入口——21条真实测试样本全部源自已表述的决策/批注，从未有"纯视觉倒推意图"的情形，且违反抽取"不推断意图"铁律；constitution.md条件加载——上述已述。
- ❗ 真缺陷1（Spec Kit `/converge` 对应）：Phase 3 判官只对预先给定的AC打分，design-map规划过、但没人写AC的组件，判官发现不了——**红队裁定 CLEAR_DEFER 全自动比对机制**（零端到端运行的系统上建第二套未验证机制，跟已否决的快速路径同类过早），**但先加零成本版本**：flip到verified前人工核对一次组件映射表vs实际原型，已写入 `muse-loop-orchestrate/SKILL.md` Phase 3。
- ❗ 真缺陷2（Spec Kit `/checklist` 对应）：GATE-1只检查"这条需求被说得多响"（triage信号全是loudness），不检查需求陈述本身够不够格——**红队裁定 CLEAR_ADD 但只做最小机制**：不建独立阻断门禁，只在GATE-1现有确认提示里顺手加2条质量提示（有无可衡量目标/有无清楚触发-响应），已写入 `muse-loop-orchestrate/SKILL.md` GATE-1。
- ❗ 真缺陷3（Kiro tasks.md 依赖图/并发波次对应，`task-plan`——既有母版skill非muse-loop自建）：现状只有自由文本"依赖"描述，且发现的候选方案里举例的ID格式（`TASK-03`）跟真实约定（`DEV-NNN`）对不上——**红队裁定 CLEAR_DEFER 自动依赖图/并发调度算法**（`muse-loop`目录里没有任何dispatcher/执行代码，"并发执行时序错误"是对不存在的系统的假想），**但先加零成本结构化字段**：任务卡"输入"里拆出独立的"依赖任务"字段（`DEV-NNN`列表），已写入 `task-plan/SKILL.md`（v1.0.1）。

`schema.md` 同时修复了一处真实文档缺口（非判断类）：EARS语法实际有4种模板（事件驱动WHEN/状态驱动WHILE/条件驱动IF-THEN/通用型），之前3条测试样例恰好全是事件驱动型，掩盖了另外3种从未被文档化的事实——已在 `schema.md` 补全4种模板的选用说明。

全部改动后重跑 `check-routing-map.mjs`（PASS+PASS）+ `verify.sh`（45 PASS，同样2项无关FAIL），母版复查零影响。

### Phase 2.4（真实端到端模拟暴露的最大流程缺口：基线核对+变更映射，已修复）：已完成 ✅（2026-07-02）

**发现过程（模拟的价值所在）：** 第一条真实端到端 REQ（REQ-速记-008，场景B已有功能优化）跑到 Phase 3 open-design staging 后，luca 给出真实 Figma 链接（`TOuJ7fD3k6UjYtotJKPF4U` 速记汇报版本）。用 Figma MCP 真实读取后发现：**真实首页是4个入口（开始录音/视频会议/预约会议/导入文件），PRD 假设的"现场会议/在线会议"其实是历史记录列表的分类标签，不是入口按钮**——整条链（brainstorm PRD→design-brief D-决策→OD brief）从头到尾没看过真实现有UI，全部建立在会议语料转述的臆想上。luca 确认：模拟目的就是找流程问题，此缺口成立；修复须覆盖两层：①基线核对（获取真实UI）②需求→现状映射（每条改造项落到具体真实模块）；并明确要求"认真调研，不能硬做"。

**外部调研（2轮 Workflow，交叉核实）：** BMAD-METHOD brownfield 工作流 Phase 1=`document-project`（"Always Document First"，先文档化现状再写增强PRD；规模规则：小面积全量/大系统只盘相关区域）；Kiro Bugfix Spec 三段式（Current/Expected/**Unchanged** Behavior——保持区概念的外部印证）+ steering 模式（机器生成→人工校正→才可用）；ISO 14764/RTM（需求→受影响组件矩阵 + created/modified/discarded 分类）；Chromatic/BackstopJS 基线生命周期（刻意采集/人工批准更新/血统锚定/三联对照）。诚实标注：**"改造类PRD必须带现状截图"没有业界命名实践**，此门禁是合理自创规范，不得引用为既有标准；Kiro 的 Feature Spec 流程本身也没有强制现状核对；Spec Kit 完全没有基线机制。

**红队4争点裁决（13 agent）：** ①基线采集插 GATE-1后/Phase 1.5前（错误是在PRD层进来的），不加新状态枚举，Phase 2 加硬性前置（镜像 traceable_delivery）②轻量 AskUserQuestion 确认，不建第三个正式GATE，constitution 零改动 ③只改 Loop 自己的文件（同文件先例"不改design-brief本身"）；design-brief 场景B缺基线步骤（场景C有强制的 Step C-1，场景B没有——母版级不对称）**记录为上游提案**（见下）④`design_reference` 为 L1 一等字段，triage 忠实抽取（没有就null，不臆造），`none_confirmed_greenfield` 只能人选、机器永不自标。

**落地（全部 Loop-local）：** `schema.md` v0.5（`design_reference` 字段 + `baseline.md`/`change-map.md` 格式定义）；`muse-req-triage` v2.2.0（Phase 0 忠实抽取设计参照）；`muse-loop-orchestrate`（GATE-1 呈现含 design_reference+空值即问、「基线采集」子步骤、Phase 1.5 输入附 baseline、「变更映射」子步骤+轻量确认、Phase 2 硬性前置、Phase 3 OD brief 必含 change-map 摘要改动区/保持区）。

**上游提案（仅提案，待 luca 决定，不动 fork 副本）：** `design-brief` 场景B建议在母版加 Step B-0"当前页面状态确认"（对齐场景C已有的强制 Step C-1）——场景B同样是对已有功能动刀，没理由只有评审改版才看现状。

**模拟产物标注：** OD 项目 `suji-home-entry-structure` 的 brief.md 是基线机制建立**之前**的模拟产物（建立在错误的入口假设上），已过时，不用于真实生成；REQ-速记-008 的 prototype.html（muse-proto-gen 直写版）同理保留为流程测试历史证据。

**机制回归测试：** 用真实 Figma 给 REQ-速记-008 补 `baseline.md` + `change-map.md`——验收标准=矩阵必须暴露出已知的 PRD↔现实错配（抓不出=机制无效返工）。**结果：机制生效——6条 MUST 级 R 里 3 条落进"映射失败项"（R2要合并的入口在真实UI不存在、R5失去挂载点、R6要移除的"旧结构"名称全对不上），被误当入口的历史标签已显式列入保持区。** 见 `docs/loop/specs/REQ-速记-008/`。

## 已知残余风险（诚实边界——"完美标准"收口交付物，2026-07-02）

> luca 明确要求"做到完美"后，本节是收口原则：不用"完美"宣称零残余风险，而是把每条已知局限显式列出——每条已知的方法论局限都对应了缓解动作或被如实标注，没有被沉默略过。

**本轮真正新核实/新修复的（有真实证据支撑）：**
- 端到端真实模拟跑通了 Loop 的 GATE-1→基线前流程→brainstorm→AC推导→design-brief→GATE-2→OD staging→judge 全链（真实人类卡点、真实 Oracle 三轮、真实 OD 项目、真实判官评分卡），期间发现并修复：AC来源断链（AE#优先+derived-fallback标注）、Phase 3 生成路径架构错误（改为 open-design 主/proto-gen fallback）、**基线核对+变更映射整层缺失**（本次最大发现，机制已建成并通过"必须抓住已知错误"的回归测试）。
- 项目软链指错（roam-cards）这一真实环境事故被当场发现并用 `project.sh switch` 修复——正是"真跑才暴露"的典型。

**固有局限（不会被"更多轮数"消除，如实列出）：**
1. **全部核验仍是 AI 自查**（含红队/判官/调研 agent——同一底层模型），不是独立人类专家评审、不是生产遥测数据。红队能抓论证不自洽，不能替代真实世界检验。
2. **WebFetch 有摘要层损耗**——外部调研的"原文"经过小模型转述，已用双源交叉核实缓解，但损耗不为零。
3. **n=1**：端到端只跑过一条 REQ（且是模拟场景）。本轮修的每个机制（基线采集、变更映射、AC推导、OD路径）都只被一条真实路径检验过，不能外推为"任何 REQ 都顺畅"。快速路径/自动converge/判官正式校准等 CLEAR_DEFER 项的重启条件都写在各自章节，等真实使用量触发。
4. **判官严格盲标校准仍未做**（luca 知情跳过）——muse-proto-judge 的信任基础仍是 21 样本轻量核 + 本次 2 轮真实评分卡表现，无正式一致率数字。
5. **基线机制的前向检验已完成一条（2026-07-02 REQ-速记-036 自动化测试，7/7 断言通过）**——GATE-1问参照→真实Figma基线→PRD扎根基线→变更映射→Phase 2前置（含负测试），与 REQ-008 回溯测试构成正反对照（旧流程3条映射失败 vs 新流程零失败）。**残余：人类卡点全部 [AUTO-SIM]（luca 授权的自动化测试），真实人机交互体验未检验；PRD为轻量测试版。**详见 `docs/loop/specs/REQ-速记-036/test-report.md`。
6. **OD 生成+「拉回来」回收+figma-layer 回写 Figma 这后半段没有真实走完**（模拟在 staging 后转向了流程修复——这是正确的优先级，但后半段流程的真实检验仍是空白）。
