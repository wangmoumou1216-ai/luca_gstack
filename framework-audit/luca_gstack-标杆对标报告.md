# luca_gstack 三层能力 × GitHub 标杆对标 — 最终结论报告

> 生成日期：2026-06-01
> 方法：3 轮 GitHub 研究（发现→深读交叉验证→gap 打分）→ 苏格拉底问询 → 单轮综合红队 → 11 争议候选 3 轮对抗辩论 → 主 agent 裁决
> 证据规格：全程工具验证，每条判定落到 `file:line`；所有 GitHub 库经 star/活跃度门禁 + ≥2 独立来源交叉验证
> 工作产物：`framework-audit/`（Round1 底料、各 Workflow 结构化输出 JSON 全部落盘可复核）

---

## 0. 一句话结论

**luca_gstack 的工程纪律远高于它对标的多数 GitHub 高星框架。** 17 个从标杆提炼的优化候选里，**没有一条是"立刻照抄"级别的真空白**——它们要么 luca 已用等价机制覆盖，要么是团队/CI/多租户标杆对单人桌面工具的水土不服，要么只是行级裂缝。真正值得做的是**少数几件缩到行级、且应先验证频率/数据的小补丁**，这件事本身就证明了项目当前的成熟度。

但有一个**重要的过程修正**：红队第一轮 over-kill 了。它把 11 个 gap 判成"假/已有"，而 3 轮对抗辩论（双方各自读真实文件找证据）证明**其中 6 个 gap 是真实的**——红队的真正价值是否决了错误的"解法"（新建 constitution.md、字面相等 CI、新增 Phase -1、OnFailAction 分类法），但它越界把"解法错"误判成了"缺口假"。辩论把这两件事分开了。

---

## 1. 自身基线（对标锚点）

luca_gstack = Claude Code 上自建的「产品设计→工程」Skill OS，**单人使用**。架构原则：Skill-first/Graph-optional、最小文件、Simplicity-First、读前先写、Surgical Changes、measure-first。

| 层 | 组成 | 现有强资产 |
|---|---|---|
| **L1 设计流水线** | `.claude/skills/office/` 16+ skill：idea→deepresearch→brainstorm→ux-research→ux-brainstorm→design-brief→magicpath/html-prototype/figma→tech-spec→task-plan；评审 ux-audit/design-review/redteam/retro | 三层覆盖率门禁（tech-spec Phase 5 + task-plan Phase 7 + plan-agent 块1.5），MUST 需求 N/N 全覆盖才放行；强 handoff gate + 稳定 ID traceability matrix |
| **L2 控制面** | route-guard.mjs（关键词路由+复杂度评分≥6→PLAN_MODE+项目门禁）→ plan-agent.md（Phase分解+断言矩阵）→ orchestrator.md（双模行为）→ work-agent→ quality-gate（独立上下文跑断言）+ preflight | 路由回归集（test-route-guard.mjs 25 labeled case 入 pre-commit gate）+ SSOT 一致性 gate（check-routing-map SSOT-7）；三态质量门禁 PASS/FAIL/CONDITIONAL_PASS |
| **L3 记忆治理** | 三层记忆 episodic/semantic(promoted-facts + candidates，Hermes-lite 候选→review→晋升)/skill-rule；observability rules.yaml；skill-invariants P1-P7 | 人在环受控晋升门禁；序号化产物永不覆盖（P2-V，文档约定）；检索埋点 retrieval-log（measure-first 真实路径） |

---

## 2. GitHub 标杆全景（40 shortlist + 29 excluded）

按 7 类目并行发现 → 门禁筛选（star≥2k、近半年活跃、非营销页/非 awesome-list、≥2 独立来源）→ 40 进 shortlist，29 被排除（含 autogen 进入 maintenance、Reflexion 16 月未更新、Braintrust/Helicone 闭源或被收购转维护、litellm Router 越界等，理由全部 API 核实落盘）。

| 类目 | 对标锚点（star） | luca 对应层 |
|---|---|---|
| **C1 spec/PRD 驱动流水线** | spec-kit(107k)、**superpowers(213k，架构最近亲)**、OpenSpec(52k)、BMAD(48k)、get-shit-done(64k)、task-master(27k) | L1 全链 |
| **C2 多 Agent 编排** | MetaGPT(68k)、CrewAI(52k)、LangGraph(33k)、OpenAI Agents SDK(27k)、MS Agent Framework(11k)、AG2(4.6k) | L2 orchestrator/plan-agent |
| **C3 CC 技能生态** | wshobson/agents(36k)、claude-code-router(35k)、SuperClaude(23k)、anthropics/skills、claudekit | L2 skill OS + hooks |
| **C4 Agent 记忆** | mem0(57k)、Graphiti/Zep(27k)、Letta/MemGPT(23k)、cognee(18k)、MemOS(9.5k)、A-MEM(1k) | L3 三层记忆 |
| **C5 语义路由** | RouteLLM(5k)、vLLM Semantic Router(4.2k)、Plano(6.6k)、semantic-router(3.6k) | L2 route-guard |
| **C6 Eval/自进化** | DSPy(35k)、Langfuse(28k)、promptfoo(22k)、OpenAI Evals(19k)、DeepEval(16k)、GEPA(4.9k)、TextGrad(3.6k) | L3 eval/observability |
| **C7 断言/护栏** | guardrails-ai、instructor、pydantic、outlines（补充调研） | L2 quality-gate/preflight |

**三层 gap 分布（gap 分析原始口径）：** ALREADY_HAVE 10 / PARTIAL 18 / MISSING 6（共 34 条 practice，去重后 24 个排名候选，取 score≥4 的 17 条进对抗）。

---

## 3. 主 Agent 终裁表（17 候选，含辩论修正）

> 流程：gap 打分 → 苏格拉底（6 SERVES/7 WEAK/4 SOLUTION_FIRST）→ 红队单轮（12 KILLED/5 DOWNGRADED，判 11 条 real_gap=false）→ **对 11 条争议做 3 轮对抗辩论 → 主 agent 裁决**。
> 下表"辩论结果"列即对红队"假 gap"判定的最终修正。

### 3.1 立即可做（低风险 · 已证实缺口 · 行级）

| # | 候选 | 辩论关键证据 | 落地（缩到最小） |
|---|---|---|---|
| **#16** | 复杂度维度防退化回归 case | 控方**认输**：辩方跑突变测试，阈值 6→3、核心权重 3→0 **全 0 fail**；全套仅 1 处 complexityScore 断言且超阈值，零下界负向锚点；git 10ba339 证明权重表正在漂移而回归集一个都没抓到 | 在 test-route-guard.mjs 补 2-3 条负向/下界 case（complexityScore<6 边界 + 权重退化哨兵），共用现有 harness |
| **#3'** | 填实 CONTEXT.md 红线节 | 控方**撤回"伪造证据"指控**：quality-gate.md:107/189-190 确有 `grep -A 999 "红线" CONTEXT.md`，而 CONTEXT.md:19 红线节是"（暂无。）"→ 既有校验在空跑 | 把红线节填成指向 CLAUDE.md 核心原则/SF 的实质内容（**不**新建 constitution.md） |

### 3.2 值得做 · 先缩范围或验证频率/数据（measure-first）

| # | 候选 | 辩论结果 | 落地方向 |
|---|---|---|---|
| **#6** | 跨产物一致性校验 | 真裂缝：tech-spec Phase 5.1 拿矩阵自校验、不回 PRD 源比对 | 改 Phase 5.1 **一行**（对照 PRD 全 MUST 枚举），不建独立 grep 子系统 |
| **#1** | 反抽象检查 | 双方落 PARTIAL：工程层门禁全是正向覆盖、无"模块→MUST 反向锚定"，**场景 A 绿地架构无任何反膨胀围栏**（design-brief 只在场景 B/D 生效） | tech-spec Phase 2 后加一条轻量 checklist（新模块无 MUST 锚点→标 SPECULATIVE），**不**新建 Phase -1 |
| **#7** | 不确定性跨链承载 | 控方**认输**：brainstorm 合法放行的 `Deferred to Planning` 项在 handoff 边界蒸发（tech-spec 只读 PRD 前 60 行 + handoff schema 无该字段 + 全链 grep=0） | handoff schema 加 Outstanding/Deferred 字段 + 下游读取；**不**搞扁平 `[CLARIFY:]` grep |
| **#8** | 失败 Phase 重跑前归档 | 控方**认输**：P2-V 是纯文档约定零代码，brainstorm 写固定 mandatory 路径，同日重跑直接覆盖 | git 已兜底（外部项目均 git 仓）；最小动作=重试前 git stash 或真正实现 P2-V 序号；低优先 |
| **#14** | CLAUDE↔AGENTS TL;DR 防漂移 | 控方**认输**："门禁已存在"是错的——SSOT-7 只锚 5 个 Plan Agent 条件，**不覆盖 Routing Contract TL;DR**，item2-6 零漂移断言 | 把 SSOT-7 的 anchor 手法扩展到 TL;DR item2-5；**否决**字面相等断言（AGENTS.md 故意 EN 适配，强制相等会误删正确项） |
| **#2** | 记忆时效读写一致性 | 真 bug：写侧埋 valid_until/supersedes（consolidate_memory.py:388），读侧 get_memory/search_memory 不消费 | ~20 行读侧过滤；但**仅当晋升真正开始写 supersedes 后做**（当前库内 0 条带该字段，否则为 0 数据建过滤器违 measure-first） |
| **#4** | framework/ PreToolUse 硬阻断 | 技术 gap 真实（仅 PostToolUse 警告）；但被防事件全历史 0 次命中、html-prototype 复制母版而非原地改 | 低优先；若做需保留显式 escape（母版正当维护不被误伤） |
| **#17** | 记忆治理积压提醒 | 技术 gap 真实但 trivial：队列实测 1 stale/0 其余 | 仅在与 #12 合并为单行 + 设非空阈值（队列 0 项静默）前提下做 |

### 3.3 维持否决（红队/辩论确认：假 gap · 违背原则 · 已实现）

| # | 候选 | 否决依据 |
|---|---|---|
| **#5** | delta-spec 增量规格 | 辩方苦战后**认输**：8 项目 tech-spec 仅产出 1 次、task-plan 0 次、roam-cards 20+ 场景B commit **全部零 spec**——"轻量 what-changed spec"需求出现约 20 次、被主动放弃约 20 次；为近零频链造抽象，且撞 task-plan glob 硬编码 + Phase5 门禁语义 |
| **#9** | 路由准确率指标 | 残留是恒满分构造样本上的混淆矩阵=空矩阵，虚荣指标；防退化结构已由 #16 同套基建闭合 |
| **#10** | 解冻 eval 闭环 | 辩方**认输**：eval-infra 是 git 显式冻结（commit deb2ef4 "dormant unwired, not broken"，README:65 红线"勿在度量结论前修复"），读路径全 null-safe，真实度量走 retrieval-log |
| **#11** | 校验失败自动回灌自修复 | findings 是 markdown 散文非机器 error，回灌=LLM 自说自话循环；直接违背 orchestrator.md:355 MUST-NOT（不自动跳过 human-in-the-loop）——BLOCKING 失败正是单人保持控制的关键介入点 |
| **#12** | 自动抽取候选记忆 | 抽取源不存在：run-log.jsonl 0 行未接 hook，Stop hook 是确定性 Node 脚本拿不到 transcript；单人每 2-3 天 1 条信号，机器候选会把 review 从把关退化成疲劳拒 |
| **#13** | 矩阵↔断言交叉引用闸 | "双写漂移"前提假——矩阵是单一真相源、task-plan 经稳定 REQ-ID 携带（非两份可漂移副本）。**但记一个真实子缺口**：task-plan Phase 7 覆盖率是 LLM 自查散文、非机器强制门禁（verify.sh 无任何 check 解析 tech-spec/task-plan 正文）——这是更根本但更大工程的事，候选机制不对路 |
| **#15** | OnFailAction 失败分类 | 辩方**认输**：三态门禁/per-断言级别/auto-fix→复跑回路全已存在；真实意图是删人工 gate，而那正是用户 #1 价值"保持控制"的兑现点；与 #11 同病 |

---

## 4. 落地路线图（如要执行，按此顺序，全部 Surgical）

1. **#16**（最高杠杆，proven）：test-route-guard.mjs 补 2-3 条复杂度负向/下界 case → 直接堵住已证实的权重漂移盲区。
2. **#6**：tech-spec Phase 5.1 改一行，覆盖率改为对照 PRD 全 MUST 源枚举而非矩阵自提取。
3. **#3'**：填实 CONTEXT.md 红线节（让既有 quality-gate grep 不再空跑）；内容=指向 CLAUDE.md 核心原则的实质红线。
4. **#1**：tech-spec Phase 2 后加一条反抽象 checklist（场景 A 绿地新模块必须 trace 到 MUST，否则标 SPECULATIVE）。
5. **#7 / #14**：handoff schema 加 Deferred 承载字段；SSOT-7 anchor 扩展到 TL;DR——两条都低优先，先观察是否真出过漂移事故。
6. **#2 / #4 / #8 / #17**：watch-list，触发条件满足（晋升开始写 supersedes / framework 真被误写 / 出现重跑覆盖事故 / 队列积压）再做。

> **每条改动 ≤ 1 文件 + 行级**。没有任何一条需要新建子系统、新增抽象层或引入新依赖——这是对标结论与 luca 自身 Simplicity-First 原则的双重要求。

---

## 5. 元教训（这次流程本身暴露的东西）

1. **多 Agent gap 分析会过度自信，必须对抗验证。** Workflow B 的 gap 分析里至少 6 条把"解法可行"误当成"缺口存在"，1 条（#3）引用了**错误的文件名当承重证据**（写成 check-quality-gates.mjs，实际机制在 quality-gate.md）。单轮红队抓住了后者，但自己又 over-kill 把 6 个真 gap 误杀。**只有让辩方/控方各自读真实文件、多轮对抗，才把"解法错"和"缺口假"分开。** 这正是你坚持"交叉验证 + 红队 + 多轮"的价值兑现点。

2. **红队的可靠强项是否决错误解法，不是判定缺口真伪。** 它准确地杀掉了 constitution.md（第 4 份手工副本）、字面相等 CI（会误删正确项）、新增 Phase -1（已锁死层叠门禁）、OnFailAction 分类法（拆人工控制点）、解冻冻结子系统——这些都对。但"缺口是否真实"需要正反方独立举证才可靠。

3. **measure-first 是单人桌面工具最强的过滤器。** delta-spec(#5)、eval 解冻(#10)、自动记忆抽取(#12) 全部死于"为零频/空数据路径预造抽象"。对标库的高频解法（mem0/GEPA/promptfoo）服务的是多用户/CI/生产 API，搬到单人桌面是净负担。

4. **"看起来很专业"≠ 对你有用。** 11 条被否决/降级的候选全部来自团队协作或生产标杆。luca 的最小化取舍（不接 GEPA、不上向量库、不搞 worktree 并行、关键词路由够用）经对抗验证后**反而被确认是对的**。

---

## 附录 · 诚实声明（不可省略）

- **C7 类目**在原始 Round1 聚合时丢失，本轮由 gap 分析师现场补调研（guardrails/instructor/pydantic），深度略低于 C1-C6。
- **Workflow B 聚合计数 bug**：原始 result 的 `meta_counts` 显示 deepdived/practices=0，与 shortlist 实体内容矛盾（聚合阶段漏算）；本报告以实体内容为准。
- **对抗辩论 R3 限流**：11 条主辩论的第 3 轮多数 agent 撞限流报错；裁决基于 R1-R2 的有效论证（每条均有完整 R1-R2 交锋）。#5 因辩方全程报错单独补跑了一次完整 3 轮。
- **本任务来源**：续接 2026-05-31 因 session limit 中断的 Workflow A（GitHub 标杆研究已在后台跑完，Round1 底料完整落盘）；本轮接力完成 Task#2 复核+gap、Task#3 苏格拉底+红队、对抗辩论+主 agent 裁决、本报告。

<!-- FILE_END: luca_gstack-标杆对标报告 -->
