# W13 — DECIDE 清单：交 luca 裁决（skills 内容深审 2026-07-18）

> 深审共 269 findings，222 CONFIRMED（129 FIX-NOW 已全部修复并经独立复审 + **83 DECIDE** + 9 KNOWN-BOUNDARY）+ 47 REFUTED。
> 本清单 83 条 DECIDE 需你拍板——多为**触保护区（改动需授权）**或**产品/架构裁决**，不属 agent 可自行修复范畴。

每条给：fid · severity · skill · 缺陷 · 推荐动作。你可逐条批「修/不修/改法」，或整桶批。


## 产品裁决（登记/删除/曝光）（5 条）

- **[FW4-126] P2 · auto** — auto frontmatter 只有 name/preamble-tier/argument-hint/recommended-model，缺 P1 涉及的 allowed-tools（权限边界）、context-cost（上游调度估算）与 description——而 auto 已注册进 ROUTE_GUARD_H
  - 推荐：（见台账）
- **[FW9-r7-37] P2 · html-prototype** — 场景B 硬前置 prd-constraints.md 在整个 skill 集里无任何生产者；html-prototype 的 BLOCK 补救指令把用户指向 /brainstorm 生成该文件，但 brainstorm 只产 prd.md/prd-ai-spec.md、从不写 prd-constraints.md → 
  - 推荐：（见台账）
- **[FW4-111] P3 · muse-x-digest** — muse-x-digest 三面失联（routing-map/office/slash 皆无）是其 frontmatter line 12 明写的设计意图、且它已登记进 model-routing.yaml(56)，故可达性经 muse app 注入完好；但它在 CLAUDE.md 全文零登记——连隐藏/muse 节都
  - 推荐：W11 defer→DECIDE：FW4-111=muse-x-digest 登记 vs 删除属产品裁决(F0-01)；FW5-dc-review-02=把品牌色/五态/组件映射判据抽取为新 references 文件属架构重构，均需 luca 拍板
- **[FW9-r4-25] P3 · skill-os** — input-modes.yaml 的 figma-layer 契约 source_kinds 与 workflow.optional 只登记 html-prototype/figma-demo 两源，缺 open-design——而 figma-layer/SKILL.md 与 html_or_demo_to_figm
  - 推荐：（见台账）
- **[FW9-r5-30] P3 · redteam** — redteam/SKILL.md 是注册为产品中性的对抗审查 skill（description『对当前决策链路发起全面质疑』），但其设计层唯一被点名的压力测试人格硬编码为『真实销售用户』——2026-07-03 去 CRM 身份裁定后残留的 CRM/销售时代沉积，与 auto/ux-research/evals 已确
  - 推荐：（见台账）

## 触保护区（改动需你授权）（34 条）

- **[FW4-090] P1 · figma-layer** — figma-layer allowed-tools 不含 Skill 工具，但正文三处把「先加载 /figma-use skill」列为 use_figma 的强制前置——权限面与执行指令不匹配
  - 推荐：在 allowed-tools 增加 Skill 工具；或若加载 skill 不受 allowed-tools 约束，则确认后无需改（仅需验证）。
- **[FW4-151] P1 · compare** — compare/SKILL.md declares `allowed-tools: Read, Bash` but Phase 4 requires writing an output markdown file to docs/decisions/ — no Write tool is granted.
  - 推荐：（见台账）
- **[FW3-022] P2 · deepresearch** — 边界项：frontmatter 缺 allowed-tools（P1 将其列为受保护的权限边界字段）。该 skill 自述『read-only research skill』却用 Write 写报告、用 task() dispatch 子 agent，无任何工具边界声明。（同类缺失见 auto/brainstorm/m
  - 推荐：（见台账）
- **[FW3-044] P2 · ux-research** — 边界项：frontmatter allowed-tools 声明为封闭 4 项 [Read, Write, Bash, AskUserQuestion]，但 skill 核心机制在正文用 task()/background_output()/subagent 派发，子 agent 还依赖 websearch/webfe
  - 推荐：（见台账）
- **[FW3-049] P2 · handoff-review** — handoff-review Preamble 缺少 P3 强制的 get_rules.py 命令，而同簇 ux-audit Preamble 有——观测规则不会在该 skill 启动时热加载。
  - 推荐：（见台账）
- **[FW3-065] P2 · brainstorm** — ai-spec-template.md's FILE_END marker names a stale path 'prd/SCHEMA-arch.md' — a leftover from a prior location that no longer matches the actual file (referen
  - 推荐：NOT edited — the fix necessarily rewrites the file's FILE_END line (references/ai-spec-template.md line 266), which is protected zone P5 ('文件末尾 FILE_END 行必须原样保留'); rule 2 says touching P5 → outcome=decide. Recommended ch
- **[FW4-091] P2 · figma-layer** — figma-layer 正文捕获快路径使用 generate_figma_design，但该工具未在 allowed-tools 声明
  - 推荐：若捕获快路径仍启用，把 generate_figma_design 加入 allowed-tools；若已废弃则删除该节。
- **[FW4-093] P2 · magicpath** — 边界项：magicpath description 自称「设计产出首选」，与 office/CLAUDE.md 中 open-design 为设计产出首选、magicpath 2026-07-03 零调用降级为备选链的定位冲突
  - 推荐：The '设计产出首选' claim lives in the frontmatter `description:` block (P1 protected, lines 4-8). The skill body (line 11+) never repeats '首选', so the only fix point is inside the protected description. Intended fix: change '设
- **[FW4-125] P2 · muse-loop-orchestrate** — muse-loop-orchestrate / muse-req-triage / muse-proto-gen 三个 SKILL.md 末尾均缺 P5 强制的 FILE_END 标记（muse-x-digest、auto 有）。
  - 推荐：（见台账）
- **[FW4-127] P2 · muse-loop-orchestrate** — 边界项：auto 完全没有 Preamble bash 块，muse-loop/muse-req-triage/muse-proto-gen/muse-x-digest 的 Preamble 均不含 P3 列为不得删除的 get_rules.py 与 cat current-topic.txt——office 共享规范
  - 推荐：（见台账）
- **[FW4-132] P2 · redteam** — redteam 有两个 FILE_END 标记：第 82 行先出现 `<!-- FILE_END: redteam/SKILL.md -->`，其后第 84-104 行才是 workflow-state 写入块，第 105 行才是真正末尾——按「强制读完到 FILE_END」规则 agent 会在第 82 行止读，漏掉
  - 推荐：（见台账）
- **[FW4-133] P2 · evals** — evals 同 redteam：第 129 行先出现 `<!-- FILE_END: evals/SKILL.md -->`，workflow-state 写入块在其后第 133-150 行，第 152 行才是真末尾——首个 FILE_END 使 agent 提前止读、漏掉状态写入
  - 推荐：（见台账）
- **[FW4-134] P2 · challenge** — challenge 产出路径与 _OUTPUT 是未解析的 glob `docs/prd/*-challenge.md`，既作为写入目标又作为 workflow-state 的 _OUTPUT 值——不是可写的具体文件路径，也不遵循其它 skill 的 `YYYY-MM-DD-<topic>-` 命名
  - 推荐：W12 NOT_RESOLVED：写入目标已修但 _OUTPUT glob 在 P7 严格保护块(_OUTPUT 赋值不得改变含义)。推荐 luca 批准后改 line 185 _OUTPUT 的 glob '*-challenge.md' → date+topic 具体路径模板（对齐 retro 同款正确写法）。
- **[FW4-141] P2 · task-plan** — task-plan/SKILL.md 的 Preamble 是四个 skill 中唯一缺失 `get_rules.py` 调用的——违反 office/SKILL.md「Step 1 是必须的」的共享强制协议与 skill-invariants P3（该命令列为不得删除的关键命令）。
  - 推荐：在 task-plan Preamble 末尾补 `python3 .claude/observability/scripts/get_rules.py task-plan "*" 2>/dev/null || true`（与 tech-spec/code-hygiene/code-recon 一致）。
- **[FW4-156] P2 · retro** — retro/SKILL.md Preamble (lines 21-28) reads git branch + latest design-brief/review paths but omits the get_rules.py rules-loading call that P3 and the shared O
  - 推荐：（见台账）
- **[FW5-dc-designB-01] P2 · magicpath** — magicpath 与 open-design 的 defining constraint 撞车：两者 description 都自称「设计产出首选」，无法唯一区分谁是首选；且 magicpath 自称首选与 open-design 正文把它列为「备选」直接矛盾。
  - 推荐：Same root as FW4-093: the defining-constraint collision ('设计产出首选' vs open-design) is in the P1 frontmatter description. Intended fix: reword to its真实 downgrade role (e.g. 'OD daemon 不可达时的 React canvas 备选；隐藏 skill，仅内部 dis
- **[FW5-dup-B1a-03] P2 · redteam** — redteam/SKILL.md 与 retro/SKILL.md 各含两个 FILE_END 标记且路径串分叉：第一个是 `<skill>/SKILL.md`，第二个是 `.claude/skills/office/<skill>/SKILL.md`；且 P7 保护的 workflow-state 写入代码块整段位于
  - 推荐：（见台账）
- **[FW9-r1-03] P2 · open-design** — open-design/SKILL.md frontmatter 的 shared-refs 声明 `brand-tokens`，破坏了 shared-refs = references 池文件的加载契约——references/ 里没有 brand-tokens.md（该文件在仓库根），而其余所有 skill 的 s
  - 推荐：真实修复点在 frontmatter 的 context-cost.shared-refs=[brand-tokens, handoff-protocol]（line 23）——brand-tokens.md 实际在仓库根 ./brand-tokens.md，不在 references/ 池（其余 skill 的 shared-refs 条目均在 references/ 内）。已核实：references/brand-tokens.md
- **[FW9-r9-47] P2 · redteam** — redteam / retro / taste-review 的 allowed-tools 只声明 [Read, Write, AskUserQuestion]，都漏了 Bash——但三者的 Preamble（git branch/ls/get_rules.py）与 redteam/retro 的 workflow-
  - 推荐：redteam/retro/taste-review allowed-tools each declare only [Read, Write, AskUserQuestion] but run bash (Preamble / get_rules / workflow-state). The fix (add Bash to allowed-tools) necessarily edits the P1-protected front
- **[FW3-017] P3 · html-prototype** — frontmatter description 把本 skill 定位为『MagicPath 不可用...时的 fallback』，未反映当前路由中 Open Design 已是设计产出首选、html-prototype 是 OD 与 MagicPath 皆不可用时的末位备选
  - 推荐：description 补上 OD：定位为『Open Design 与 MagicPath 皆不可用时的本地 HTML 备选』
- **[FW3-023] P3 · deepresearch** — 边界项：完成协议 Step 1 写 handoff 处缺 `mkdir -p docs/handoff` 命令，而 P4 明确把该命令列为 handoff 写入节受保护/必备内容。（brainstorm/tech-spec/task-plan/design-brief/ux-research 同缺，Write 工具通常
  - 推荐：在 Step 1 的代码块内补 `mkdir -p docs/handoff` 一行，与 idea/ux-audit 的 handoff 节对齐。
- **[FW3-045] P3 · ux-research** — 边界项：4 个子文件缺文件末尾 FILE_END 标记（SCHEMA.md、agent-prompt-template.md、report-template.md、socratic-prompt.md；grep 确认仅 SKILL.md 有），P5 规定 FILE_END 必须存在于文件末尾、validate-skil
  - 推荐：（见台账）
- **[FW3-046] P3 · ux-research** — 边界项：完成协议的 handoff 写入节缺 `mkdir -p docs/handoff` 命令（grep 确认无 mkdir），P4 明确把 mkdir 列为受保护必备项（同族 deepresearch/brainstorm 亦缺，ux-audit 有）。
  - 推荐：（见台账）
- **[FW3-058] P3 · ux-audit** — ux-audit workflow-state 写入块 export 的 _NODE / _STATUS 从未被下方 python 读取（python 硬编码 'ux-audit' 与 status='DONE'），是死变量。
  - 推荐：（见台账）
- **[FW3-076] P3 · figma-demo** — SKILL.md description 内嵌一串路由触发词，但 figma-demo 已于 2026-07-03 降级为隐藏 skill、不在 skill-routing-map.yaml，route-guard 从不匹配这些词——触发词为失效残留
  - 推荐：触发词行位于 SKILL.md 顶部 --- 到 --- 之间的 description: | 字段内（第 11-12 行），属 P1 逐字不动保护区，未编辑。建议（供无保护区人工轨）：删除 description 的触发词行或改注『隐藏 skill，按名/语义调用，不经 route-guard』——已 grep 确认 skill-routing-map.yaml 零命中 figma-demo，触发词确为失效残留。
- **[FW3-077] P3 · figma-demo** — 边界项：完成协议 handoff 写入节缺 `mkdir -p docs/handoff` 命令，P4 将该 mkdir 列为受保护/必备项
  - 推荐：（见台账）
- **[FW4-109] P3 · office-shared** — 边界项(P3保护区)：skill-invariants P3 规定每个 skill 的 preamble bash 块含『不得删除』的关键命令 get_rules.py 与 cat .claude/current-topic.txt；office/SKILL.md 的 preamble 块（16-21）只有 git b
  - 推荐：（见台账）
- **[FW4-110] P3 · office-shared** — 边界项(P5保护区)：P5 规定 FILE_END 标记格式为『<!-- FILE_END: <skill>/SKILL.md -->』；office/SKILL.md 末尾用『<!-- FILE_END: SKILL.md -->』（缺 office/ 前缀），与兄弟文件（muse-x-digest/SKILL.md
  - 推荐：（见台账）
- **[FW4-147] P3 · code-recon** — 边界项：code-recon（Phase 3 写 docs/engineering、Phase 5 写 docs/handoff）与 tech-spec/task-plan 的 handoff 节均无 `mkdir -p docs/handoff`/`mkdir -p docs/engineering`；skill-i
  - 推荐：在 code-recon Phase 3/5 与 tech-spec 6.2、task-plan 8.2 写盘前补 `mkdir -p docs/engineering docs/handoff`。
- **[FW5-dc-designA-04] P3 · brainstorm** — 边界项：brainstorm 与 ux-brainstorm 均未声明 allowed-tools frontmatter，而两者恰是全组『HARD GATE — 不写代码/no implementation』约束最硬的 skill；同族的 design-brief 与 figma-layer 都显式声明了 allow
  - 推荐：（见台账）
- **[FW5-dc-designA-05] P3 · design-brief** — 边界项：design-brief frontmatter 的 recommended-model 注释写『judge/oracle环节按fable_whitelist P1单独dispatch fable』，但 design-brief 正文全流程（Phase A→8）没有任何 Oracle/judge 子 agent
  - 推荐：未编辑。修复点 = SKILL.md line 25 frontmatter 内 recommended-model 尾注（『judge/oracle 环节按 fable_whitelist P1 dispatch fable』系陈年复制残留，design-brief 无 Oracle/judge 环节且 allowed-tools 无 Task）。该行位于文件顶部 --- 到 --- 之间，命中 P1 frontmatter 保护区（
- **[FW5-dc-designB-03] P3 · figma-demo** — figma-demo 已于 2026-07-03 移出一级路由降级为隐藏 skill（routing-map 真值源已删触发词），但其 description 仍内嵌一整行一级触发词「做个demo/口述做原型/演示demo/汇报用的原型」，是过时沉积。
  - 推荐：与 FW3-076 同一位置（description 内触发词行，frontmatter --- 之间），P1 保护未编辑。建议人工轨删除触发词行；真值源 routing-map 已移除该 skill 一级触发。
- **[FW5-dc-designB-04] P3 · html-prototype** — 边界项：html-prototype description 把自己定位成「MagicPath 不可用…的 fallback」，完全没提 OD；但 OD 上线后 CLAUDE.md 一级表已把它改述为「备选，OD/MagicPath 不可用时」，description 停留在 OD 之前的旧优先级层。
  - 推荐：触 P1 保护区：待修的 description 字段（原 6-8 行）位于文件顶部 --- 到 --- 之间的 frontmatter，P1 要求逐字不动。修复必然改写 frontmatter description 的值，故不编辑，outcome=decide。修复点应由有 frontmatter 改写权限的环节把 description 的 fallback 从属对象从『MagicPath 不可用』补为『OD/MagicPath 
- **[FW6-sim-figma-demo-04] P3 · figma-demo** — 边界项：figma-demo 已隐藏（从 skill-routing-map.yaml 移除），但其 frontmatter description 仍列一串触发词（'做个demo'/'演示demo'/'汇报用的原型'/'demo from figma' 等），这些词现在对路由无任何效果。
  - 推荐：与 FW3-076/FW5-dc-designB-03 同位置（description 触发词行，frontmatter 保护区），P1 未编辑。建议人工轨改为『按名调用（隐藏 skill，无路由入口）』或删除触发词枚举。

## 架构/SSOT 重构（scope 判断）（1 条）

- **[FW5-dc-review-02] P2 · design-review** — 后置原型质量核查（品牌色≤3处 / 空·加载·错误·成功·默认五态 / 组件映射）同一批判据同时维护在 design-review 后置验收、handoff-review 节2、ux-audit Module A 三个文件；且 design-review 与 handoff-review 的 defining cons
  - 推荐：W11 defer→DECIDE：FW4-111=muse-x-digest 登记 vs 删除属产品裁决(F0-01)；FW5-dc-review-02=把品牌色/五态/组件映射判据抽取为新 references 文件属架构重构，均需 luca 拍板

## 其它设计裁决（43 条）

- **[FW3-010] P2 · html-prototype** — 强制 ≥24/30 的 current-aesthetic-rubric 把 CRM 身份钉进承重评分项：§2.4 断言『CRM 用户不是抽象用户』并要求原型回答销售/管理者/运营问题，评分表『文案真实感』满分判据是『CRM 真实』
  - 推荐：把 CRM 角色/文案判据泛化为『目标用户/真实业务语境』，让评分对任意产品线适用
- **[FW3-039] P2 · ux-research** — SCHEMA.md 是 report-template.md 的孤儿副本：SKILL.md 只加载 report-template.md，SCHEMA.md 全仓无任何引用（grep 确认），且两份报告模板已经漂移（SCHEMA 有『源多样性』列与『证据质量评估』表，report-template 无但有『来源质量评估
  - 推荐：删除孤儿 SCHEMA.md，或让 SKILL.md 明确声明 SCHEMA.md 为权威并删除 report-template.md，保留单一真值源。
- **[FW3-051] P2 · handoff-review** — handoff-review Phase 2.5 auto-revise 派上游 skill『整体重生成』产物，却只重跑失败的 1–2 个 specialist，先前通过的检查不复检就把最终结果改为 PASSED。
  - 推荐：（见台账）
- **[FW3-052] P2 · ux-audit** — ux-audit 的 defining constraint（description 首行）写死『CRM页面UX评审』，与 2026-07-03 去 CRM 身份裁定、以及 routing-map 的通用触发词（评审/UX问题/页面评审/挑毛病）冲突。
  - 推荐：（见台账）
- **[FW3-053] P2 · ux-audit** — module-a-visual（通用视觉规范模块）的 P0 严重程度定义把最高级绑死在『严重阻碍用户完成核心 CRM 任务』——一个纯视觉合规模块的分级判据被 CRM 语境污染。
  - 推荐：（见台账）
- **[FW3-054] P2 · ux-audit** — 边界项：module-c-crm 整节为纷享销客 CRM 专属（首屏字段清单/高频操作/CRM 列表专项），在 2026-07-03 去 CRM 裁定后其在通用 ux-audit 中占 25% 权重的地位待核。
  - 推荐：（见台账）
- **[FW3-072] P2 · figma-demo** — assembly-constitution.md（294 行）是死引用文件：Phase 5 调度只『读取 assembly-agent.md』、必读清单也不含它，全 skill 无处引用；它与 assembly-agent.md 重复，且其内联 HTML 骨架的 tailwind 颜色表是 demo-template.
  - 推荐：删除 assembly-constitution.md，或把它降为 assembly-agent.md 的一条指针（组合优于重复），单一真值源留 demo-template.html 的 config
- **[FW4-081] P2 · references/ux-evaluation-framework.md** — ux-evaluation-framework.md 的模块A/模块C 全文与 ux-audit specialists（module-a-visual.md、module-c-crm.md）重复——同一评审规则维护在两处，已出现漂移（见 14px 冲突 finding）。
  - 推荐：合并为单一真值源（specialists），ref 文件不再保留规则正文。
- **[FW4-084] P2 · references/role-sales-fxiaoke.md** — role-sales-fxiaoke.md（620 行 / 29KB，v1.0 2026-03-29）是重度 CRM 时代孤儿：声明适用于 business-evaluator/quality-gate-agent，但 quality-gate.md 不加载它、全库无任一文件按路径读它；框架已于 2026-07-03 
  - 推荐：确认无活消费链后移入 CRM 休眠层（与其余 CRM 件同处），或删除；保留则加「CRM 休眠件，产品中性任务勿注入」头注。
- **[FW4-086] P2 · references/workflow-state-writer.sh** — workflow-state-writer.sh 是孤儿：全库零引用（无 skill source/调用它），其 write_state/set_topic 功能已被 write_state.py 完全取代——后者被 design-brief/evals/figma-layer/redteam/open-design/
  - 推荐：删除 workflow-state-writer.sh（write_state.py 为单一真值源）。
- **[FW4-144] P2 · tech-spec** — 边界项：tech-spec/SCHEMA.md 与 task-plan/SCHEMA.md 均为孤儿文件——两个 SKILL.md 全文 grep 零次引用 SCHEMA（Phase 6.1/8.1 改用行内节名清单），是无 context pointer 的 disclosed reference，已与正文漂移（见列
  - 推荐：二选一：①在 SKILL.md Phase 6.1/8.1 加显式 pointer『输出模板见 SCHEMA.md，读到 FILE_END』并让 SCHEMA 成为唯一结构真值、删正文重复节名清单、给 SCHEMA 补 FILE_END；②若模板不再使用则整删两个 SCHEMA.md。
- **[FW5-dc-designA-01] P2 · ux-brainstorm** — ux-brainstorm 强制产出 interaction-architecture.md（Phase 7，跳过=CRITICAL），并在 handoff 里把「交互架构约束」列为下游约束，但没有任何下游 skill glob/读取该文件；design-brief（声明的继承方）只 glob ux-brainstor
  - 推荐：要么让 design-brief preamble 探测并读取 *-interaction-architecture.md（继承其流转/降级/信任决策，Phase 3 状态覆盖切复核模式），要么把 interaction-architecture 明确降级为纯人类交付物、从 ux-brainstorm handoff 的「下游约束」移除，二者取一消除孤儿产出的歧义。
- **[FW5-dup-B1b-02] P2 · references/ux-evaluation-framework.md** — references/ux-evaluation-framework.md 是 ux-audit 专家文件（module-a-visual/module-c-crm）的一份无人引用的孪生副本，其排版规则已反向漂移：A2『正文字号 ≥ 14px』『行高 1.4–1.6』与品牌 13px 正文/18px(1.38 比) 体
  - 推荐：确认 ux-evaluation-framework.md 无消费者后，或删除该孤儿文件（sediment），或将其 A2 字号/行高校正为 13px/18px 并加指针指向 module-a-visual.md 为单一真值源，消除反向漂移。
- **[FW6-sim-figma-demo-02] P2 · figma-demo** — assembly-constitution.md 是孤儿且与 specialists/assembly-agent.md 构成双权威：Phase 5 调度只传 assembly-agent.md + demo-template.html，从不传 assembly-constitution.md，而后者自称「Phase 
  - 推荐：二选一定权威：要么 Phase 5 像 Phase 4 传 builder-constitution 一样把 assembly-constitution.md 作为 CONSTITUTION 传入、assembly-agent.md 退为薄壳指针；要么删除 assembly-constitution.md、以 specialists/assembly-agent.md 为唯一权威，并去掉 constitution 里「Phase 5 传
- **[FW6-sim-html-prototype-03] P2 · html-prototype** — 边界项：P2-V 序号规则要求同日同 skill 多次运行加递增三位序号避免覆盖，但 Phase 4 对原型目录只做 `mkdir -p docs/prototype/<date>-<topic>` 无任何序号逻辑，且 P2 受保护路径把 index.html 定为无序号位的目录格式——同日同 topic 重跑会静默覆
  - 推荐：在 Phase 4 加同 prd 的序号探测（ls 当日目录取 max+1），或在 P2 路径列表显式声明原型目录采用 <date>-<seq>-<topic> 形式并让 Phase 4 计算 seq。
- **[FW9-r1-05] P2 · careful** — careful 的『警告并等待确认』『允许用户覆盖』被它自己的 PreToolUse hook 变成死锁：hook 对匹配命令一律 exit 2 硬拒，无任何确认/覆盖旁路，用户确认后重跑仍被同一 hook 再次拦死。
  - 推荐：（见台账）
- **[FW9-r4-18] P2 · careful** — careful 的 PreToolUse 钩子对整个命令 payload 做字面 grep，会把仅在字符串字面量里提到危险模式的安全命令（grep 审计、echo 警告文本、git log --grep）一律 exit 2 硬拒——且无覆盖旁路，正常只读工作被误杀。这与已知 FW4-097（短写漏匹配/欠匹配）和 FW
  - 推荐：（见台账）
- **[FW9-r4-19] P2 · muse-req-triage** — muse-req-triage Phase 3 第4步无条件对 `statement_ears` 字段做 EARS 机械校验（两个入口都做），但该字段从未在本 skill 的 Phase 0/1 被产出——Phase 0 只指示三铁律忠实抽取+算信号+抽 design_reference，且入口 A『永不写』L1 卡。
  - 推荐：（见台账）
- **[FW9-r4-22] P2 · muse-proto-gen** — muse-proto-gen 与 muse-proto-judge 对『acceptance_criteria 从哪来』的契约互相矛盾：proto-gen 声称 design-map/design-brief 产出含 AC，judge 文档明文否定这一说法并指其为错。
  - 推荐：（见台账）
- **[FW9-r4-23] P2 · muse-loop-orchestrate** — muse-loop-orchestrate 把 design.md（L2）列为 REQ 目录必产物、并指示把派生的 acceptance_criteria『写入 schema.md L2』，但全篇没有任何写 design.md 的步骤，派生 AC 无落地文件——L1/L3/L4 都有显式 Write 步骤，唯独 L2 
  - 推荐：（见台账）
- **[FW9-r4-24] P2 · agents/work-agent-template** — auto/SKILL.md 的 Work Agent 失败处理表只定义 DONE/BLOCKED/超时三种返回态，缺 NEEDS_CONTEXT——而它 dispatch 的 work-agent-template.md 明文可返回 NEEDS_CONTEXT 状态。
  - 推荐：（见台账）
- **[FW9-r5-28] P2 · evals** — evals/SKILL.md 的『品味检查得分』表只硬编码 5 个效率锚点（Ryo Lu/Linear/Attio/Notion/Raycast），完全漏掉它自己 shared-ref 声明的 ai-native-taste-anchors.md 中 3 个『阻断级/一票否决』信任·代理锚点（Perplexity/Gr
  - 推荐：（见台账）
- **[FW9-r6-31] P2 · design-brief** — design-brief 未被点名的双写 workflow-state 兄弟（figma-demo/open-design/figma-layer/html-prototype 已列）：Phase 7 write_state.py 写 nodes.design-brief（只 status/output/complet
  - 推荐：（见台账）
- **[FW9-r6-35] P2 · ux-audit** — ux-audit Module B 的 WCAG 项系统性欠分：3/7 个 WCAG 检查项(键盘可访问/焦点可见性/图片替代文本)明确允许取值'无法从截图判断'，而 module-b 在编排层收到的唯一输入就是截图，这三项永远无法判为 ✅；得分公式 WCAG 通过率=✅数/7 用固定分母 7，导致哪怕页面完全可访问，
  - 推荐：（见台账）
- **[FW9-r7-38] P2 · figma-layer** — figma-layer Phase 0 对 source=html-prototype 硬性要求 design-brief.md 存在含 shadcn 组件映射表否则 BLOCKED——与其 input-modes 契约（design_brief 为 optional）以及同 Phase 内 figma-demo/op
  - 推荐：（见台账）
- **[FW9-r7-39] P2 · open-design** — open-design Phase 4（落盘）与 Phase 6（写 workflow-state）的 bash 块引用 ${_TOPIC} 构造 docs/prototype 路径，但两块内从不重新导出 _TOPIC（env 不跨独立 bash 块持久），而 9 个同类 write_state.py 调用方都在写块内
  - 推荐：（见台账）
- **[FW9-r7-41] P2 · compare** — compare Phase 2 keys Design Brief extraction on ID `DEC-DXXX` + status `ADOPTED/REJECTED`, but design-brief emits cards as `D-001`/`D-003` with 0 ADOPTED/REJECT
  - 推荐：（见台账）
- **[FW9-r8-45] P2 · muse-loop-shared** — muse-loop 的两处权威 schema 定义对 L2 `components` 受控词汇表互相矛盾：schema.md 说词汇表是 {FxUI, shadcn}，而它自称『抽自 design-brief 原样』的 component-mapping-taxonomy.md 说来源『只能是 shadcn 或自绘，没
  - 推荐：（见台账）
- **[FW9-r9-48] P2 · compare** — compare Phase 2 抽取表把 PRD/brainstorm 的『核心功能列表』锚定为 `R-NNN`，但 brainstorm/SKILL.md L589 明令稳定 ID 用 `R1`/`R2`、『not `R-01` or `REQ-001`』——compare 找的连字+补零形式正是 brainstor
  - 推荐：（见台账）
- **[FW9-r9-50] P2 · references/ai-native-taste-anchors.md** — ai-native-taste-anchors.md 的自维护 consumer 清单双向漂移：header 声称被 /ux-brainstorm 引用（实际 ux-brainstorm/SKILL.md 零引用），且遗漏了真实通过 shared-refs 加载它的 evals 与 redteam 两个 skill。
  - 推荐：（见台账）
- **[FW9-r9-51] P2 · handoff-review** — handoff-review 的三个 specialist（requirements-check / prototype-quality / figma-consistency）均须把结果写入 docs/review/YYYY-MM-DD-<topic>-handoff-review.md，但它们的 Preamble 
  - 推荐：（见台账）
- **[FW4-088] P3 · references/office-wizard.md** — 边界项：office-wizard.md Step 3 一级 skill 清单（145-273 行）与 CLAUDE.md「一级可见 skill 列表」表几乎逐条重复描述——同一份 skill 描述维护在两处，已发生漂移（见 html-prototype 标签 finding）。
  - 推荐：考虑 office-wizard 只保留场景推荐流程，一级 skill 详表指向 CLAUDE.md/表 SSOT，避免双份维护。
- **[FW4-139] P3 · evals** — 边界项：evals 把「C CRM业务专项」作为固定评审模块硬写进节点表与 SCHEMA（镜像 ux-audit 模块 C），但框架 2026-07-03 已裁定去 CRM 身份、CRM 件转休眠层——CRM 专属模块作为承重评审维度是 CRM 时代残留
  - 推荐：将「CRM业务专项」泛化为「业务领域专项（当前 profile 定义）」，或标注仅 CRM profile 激活时填写；与 ux-audit 模块 C 的去 CRM 化同步处理
- **[FW9-r4-20] P3 · challenge** — challenge 的场景门只对 scene=B 或 C 报警拦截，scene=D（Agent化改造）静默放行——但 skill 定义为『仅场景A适用』。执行者在场景 D 项目上跑 challenge 不会得到任何提示，违反其 defining constraint。
  - 推荐：（见台账）
- **[FW9-r4-21] P3 · muse-req-triage** — muse-req-triage 三处把 muse-loop/schema.md 钉在 v0.5（第78行更断言『当前 schema 为 v0.5』），但磁盘上的 schema.md 头是 v0.6（2026-07-08），v0.6 已新增枚举化的必填 human_decision（accept/defer/reject
  - 推荐：（见台账）
- **[FW9-r5-27] P3 · figma-demo** — figma-demo Step 6.2 在 current-topic.txt 为空时把 _TOPIC 回退到 `ls -t docs/idea/*.md` 推出的最新 idea 主题，但 figma-demo 由 Figma/口述+blueprint 驱动、与 docs/idea 无关；据此拼出的 _OUTPUT /
  - 推荐：（见台账）
- **[FW9-r5-29] P3 · evals** — evals/SCHEMA.md 是无人引用的孤儿模版且与 evals/SKILL.md 内联模版分叉：SKILL.md 从不『读取 SCHEMA.md』（grep 零命中），却内联一份自己的模版；两份对同一产出 docs/evals/…-evals.md 的节点表不一致——SCHEMA 有 12 节点含 /challe
  - 推荐：（见台账）
- **[FW9-r6-32] P3 · muse-loop-orchestrate** — muse-loop-orchestrate 未被点名的 stale-schema-pin 兄弟（已知只 muse-req-triage/FW9-r4-21）：正文 58/98/118 把权威 schema 钉在 muse-loop/schema.md v0.5，但磁盘 schema.md 头是 v0.6（2026-07
  - 推荐：（见台账）
- **[FW9-r6-33] P3 · evals** — evals 未被点名的 docs/idea topic 回退错配兄弟（已知 challenge/figma-demo/taste-review/design-brief）：evals 对既有决策/原型打分、与 docs/idea 无关，但 current-topic 为空时 _TOPIC 从最新 docs/idea/*
  - 推荐：（见台账）
- **[FW9-r7-40] P3 · design-review** — design-review 前置审查 checklist 只核对 design-brief 的 6 个旧节，从不检查 Design Generation Packet / Tool Consumption Contract，而 optional-workflow-graph 的 design_brief_to_html
  - 推荐：（见台账）
- **[FW9-r7-42] P3 · compare** — scripts/history.sh (compare mode B depends on it) lists figma-demo/figma-layer/magicpath as supported in its banner but has no case branch; they fall to `*)` FI
  - 推荐：（见台账）
- **[FW9-r9-49] P3 · code-hygiene** — code-hygiene 与 code-recon 都声明了 allowed-tools 却漏了 AskUserQuestion，但二者 Phase 0『确认模式与范围（必问一次）』都用 AskUserQuestion 与用户交互。与 FW4-090/FW4-151 同族、但漏 AskUserQuestion 且这两 
  - 推荐：（见台账）
- **[FW9-r9-52] P3 · muse-x-digest** — muse-x-digest/SKILL.md description 声明「muse fork 专属新增，母版 luca_gstack 无此 skill」，此断言在 2026-07-16 muse fork union-merge 回 main（main 成为唯一真值源+双检出）后已为假——该 skill 现已存在于 
  - 推荐：（见台账）

## KNOWN-BOUNDARY（9 条，已知边界/修复不划算，记录不动）

- [FW3-026] P3 · deepresearch — 边界项：deepresearch 与 ux-research 各自维护同名三件套（agent-prompt-template.md / report-template.md / socratic-prompt.md），结构平行但内容已 diverge（diff
- [FW3-027] P3 · deepresearch — 边界项：三个 reference 文件（agent-prompt-template.md / report-template.md / socratic-prompt.md）均无 FILE_END 尾标，而全局『强制读完规则』以 FILE_END 作为『读到最
- [FW3-062] P2 · brainstorm — The forbidden-coverage-destination list ('implicit' / 'covered generally' / 'handled downstream' / 'TBD') is written verbatim in t
- [FW3-078] P3 · figma-demo — builder-constitution.md 逐类『禁止』小节（字体/颜色/字号/间距）已带正面等价表述，末尾『反模式清单（零容忍）』又把同批禁令重列一遍（手写 hex、Inter/Roboto、text-red-500、渐变），负向堆砌且与前文重复
- [FW4-105] P3 · office-shared — 启动命令 get_rules.py <skill-name> <scene> 在 office/SKILL.md 内部重复两次：Pre-Task Context Retrieval Step 1（131-133）与 Observability Protocol
- [FW4-148] P3 · code-hygiene — 边界项：code-hygiene 的核心行为『只自动应用 HIGH 置信』在 description、通用协议、末尾约束三处各写一遍，改行为需三处同步。
- [FW4-149] P3 · tech-spec — 边界项：tech-spec 与 task-plan 的『核心约束』/角色声明存在逐字或近逐字跨文件重复（如 5. 不读取 Obsidian Vault（只读）完全相同；6. 不修改… 近同；角色声明并列结构），是簇内维护税。
- [FW6-sim-design-brief-04] P3 · design-brief — 边界项：Phase 7 topic 回退从 docs/idea/*.md 派生，但本节点由 PRD（docs/prd/）驱动——current-topic.txt 为空时输出文件名可能取到无关 idea 的 topic。
- [FW9-r6-36] P3 · handoff-review — handoff-review frontmatter description 自相矛盾：首行声明'启动时询问场景（A/C）'，但同一段紧接着描述'场景B只有两节（自动隐藏 Figma 节）'，且 Phase 0 询问 1 实际给出 A/B/C 三个场景选项。d