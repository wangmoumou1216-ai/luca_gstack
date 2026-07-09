# luca_gstack 记忆体系与评估体系优化 — 最终执行方案

> 状态：**final（已经用户确认方向 + 三路红队修订）** ｜ 日期：2026-07-09
> 本文件自足：执行 session **只需读本文件**即可开工，不必重读 v1 提案或对话历史。
> 调研档案（背景细节需要时才看）：`framework-audit/proposals/2026-07-09-memory-eval-architecture-proposal.md`（v1，已被本文件取代）。
> 分两批执行，每批 ≤0.5 框架 session（月度 ≤2 次纯框架 session 软上限内）。
> 执行状态：批次1 done (2026-07-09, commit 08e1fb2) ｜ 批次2 done (2026-07-09, commit 86827eb)
> 执行注记：①经用户批准，两批在同一 session 连续执行（原"分两个 session"为预算建议非硬约束）；
> ②E5 连带的 score 字段写入者实为 memory/scripts/record_eval.py（plan 笔误写作 collect_eval.py）；
> ③E1 行为级验证已做（subagent 扮演 skill 完成时刻，产出真 FAIL/UNKNOWN 判定非模板）；
> ④基线预存失败 C11（并行 session 未提交 session-sync.mjs WIP 所致）不属本 plan 范围，留该 session 收口。

---

## 0. 背景与已定决策（执行 session 不得重新裁决）

**为什么做**：luca 四问（经验沉淀归属 / 项目 vs 框架记忆架构 / 项目 context 套装 / Eval 体系）→ 三路调研（本地 memory、本地 eval、业界 2025-2026）→ 三路红队评审（先进性 / 真实价值 / 落点架构）后收敛出本方案。

**核心结论**：
- 三分归属 + 三层物理隔离的记忆骨架**健康，不动**。修的是执行层缺口。
- 本仓铁律（红队实证）：**没有强制机制的 prose 会进空转墓地**（evals skill 从未落盘、GEPA 冻结、digest 空转、IN_PROGRESS 无 writer），**有 hook/CI 的 prose 才活**（extraction-bar 靠 Stop hook、rules 靠 route-guard）。因此本方案所有新增评估逻辑都锚在**已存在且在跑的强制机制**上。
- 评估体系的落点 = **handoff 交付契约层（触发）+ check-quality-gates.mjs CI（硬校验）+ Plan Agent 断言（复杂任务源头）**；方法论文档只是被引用的认知层，不是触发点。

**用户已拍板**：eval 数据层维持冻结（GAP-eval-frozen 不碰）；context 套装按红队裁决取缩水版；红队砍掉的项不做（见 §4 不做清单，均带重启触发条件）。

**红队三路结论存档（一句话版）**：①先进性 B 级——补了 Anthropic memory tool 归属与 Agent-as-a-Judge 反驳（已吸收进 E4）；②价值——M1/M2 有真实证据，glossary/四态化/quality-gate 重改造缺痛点证据已砍/降级；③落点——v1 落在无触发力的方法论文档上，已重做为三层绑定架构（E1-E3）。

---

## 1. 批次 1 — memory 侧（M1-M4，合计 ≤0.5 session）

### M1｜person 层割裂修复（P0）

**事实**：母版 CC memory 目录 `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/`（~28 条 feedback）是 `memory/scripts/daily_governance.py:23-24` 与 session-restore 的默认扫描对象；muse fork 直跑（非 muse app 内嵌终端）时 harness auto-memory 落 `~/.claude/projects/-Users-luca-Desktop----muse-gstack/memory/`（现存 4 条）。**危害方向（注意，别写反）**：fork 新生的真人格教训上浮不了治理面（其中 `feedback_verify-with-real-evidence-before-reporting.md` 记录了一次 confidently-wrong 写盘事故）——不是"fork 缺母版记忆而犯错"（无此证据）。

**动作**：
1. 人工 union 合并 fork 目录 4 条进母版目录 + 母版 `MEMORY.md` 加对应索引行。fork 语境专属的两条（`parallel-lucagstack-fork-merge-care.md`、`feedback_commit-muban-if-changed.md`）**双存**：母版收通用表述、fork 留原文。
2. 在 fork auto-memory 目录新建 `reference_person-memory-canonical-dir.md` + fork `MEMORY.md` 索引行，内容：person 层（feedback_*/candidate_feedback_*）写入一律用母版绝对路径 `~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/`；fork 目录只保留 fork 语境专属条目。

**约束**：遵守 parallel-fork-merge-care（union 不覆盖、逐条裁决）；避开母版并行 session 时段；若触碰母版仓文件，同 session git commit（feedback_commit-muban-if-changed）。
**验收**：fork 直跑 session 的 Stop 裁决新写入落母版目录；`daily_governance.py` digest 能列出其候选。
**effort**：~10 分钟人工。

### M2｜绑定即注入（P0）

**事实**：2026-07-08 方案A（会话级项目隔离）后，pin（`.claude/.session-project-<sid>`）的两个写入点——route-guard `affirmsCur` 分支（`.claude/hooks/route-guard.mjs` ~L680）与 PROJECT_SWITCH 分支——**均不伴随项目记忆注入**；`inject_project_memory()` 只挂在 `scripts/project.sh:131-141` 的 switch/new stdout 上。**立论（注意措辞）**：被注入资产真实高价值（muse `.luca/memory/MEMORY.md` 9 条是该项目工作地基：vault 真值位置、CHECKPOINT 真值源、grounding 校验器等），结构缺口真实；**不声称"已造成返工"**（无实测样本）。

**动作**：CLAUDE.md「项目上下文门禁」段加 ~3 行规则：**确认/绑定项目时，若本 session 尚未注入该项目记忆，幂等执行 `./scripts/project.sh switch <name>`**（方案A 下共享软链已是纯展示，重复 switch 无副作用，而注入恰好挂在它身上）。覆盖两条无注入路径：affirmsCur 静默绑定、继承确认。

**验收**：并行保留态下用户点名确认项目 → 该项目 MEMORY.md（及 M3 后的 CONTEXT.md）内容出现在对话上下文。
**effort**：3 行 prose。

### M3｜项目 context 套装缩水版：CONTEXT.md + decisions.md（glossary 已砍）

**装两个文件，不装 glossary**（砍除理由：50 条 episodic + observations 全文检索"术语理解不一致"痛点零命中，违反响应式原则；重启触发条件见 §4）。

**(a) 项目根 `CONTEXT.md`**
写入源（按优先级）：
1. **主路径（覆盖外部 repo 项目——真实入场痛点所在）**：入场行为规则（全局记忆 feedback_project-entry-orient：第一步 ls 项目根 + 读 README/HANDOFF）的结果**落盘缓存**为 CONTEXT.md——把每次入场的重复劳动变成一次性 artifact，下次入场直接读。
2. 次路径：`project.sh new` 的 `ensure_project()`（`scripts/project.sh:50-70`）生成骨架模板。
3. `/retro`、`/design-brief` 的"CONTEXT.md 写入时机"（CLAUDE.md 已有规定）平移为写当前激活项目的 CONTEXT.md。

模板（写入 ensure_project）：

```markdown
# <项目名> — CONTEXT

> 项目级长期约束与共识。激活/绑定本项目时注入（硬预算 ≤80 行，超了精简或外移）。

## 概览
- 一句话：<这个项目是什么、给谁、解决什么问题>
- 当前阶段：<idea / 原型 / 开发 / 上线维护>

## 技术栈与禁用项
- 栈：<语言/框架/关键依赖>
- 禁用：<明确不用的方案，防 agent 推荐偏离>

## 目录结构要点
- <关键目录>：<一句话作用>（完整结构按需 /code-recon，不在此维护长清单）

## 红线
- <本项目不可违反的硬约束，每条一行>
```

读取：`inject_project_memory()` 扩展 ~8 行，同时注入 CONTEXT.md（沿用"有真实内容才注入"门控——grep 检测模板占位符之外的实际内容；空骨架不打扰）。

**(b) `.luca/memory/decisions.md`**（ADR-lite 决策台账；标注：无直接痛点证据、以低成本+设计自洽留任的搭车项，预算紧可先跳过）

```markdown
# <项目名> — 决策台账（ADR-lite）

> 只记「为什么这么定」且不可从代码/产出文档推导的决策。被推翻的标 superseded_by，不删除。

- [D-20260709-1] <决策一句话> — why: <一句话>
```

防双写漂移（关键设计，必须保持）：episodic `--decision` 仍是**唯一裁决入口**；Stop 裁决时若 `--decision` 非空且项目归属明确 → **同一来源同步一行**到该项目 decisions.md（一个来源两个视图：框架侧 jsonl 流水 50 条滚动，项目侧持久台账）。`docs/decisions/`（skill 产出稿桶）保持原样，两者在模板头部互相指认。读取 just-in-time：`.luca/memory/MEMORY.md` 模板加一行指针（`- [决策台账](decisions.md) — 本项目历史决策与 why`），**不进注入面**。

**落地点**：`scripts/project.sh`（模板 ~30 行 + inject 扩展 ~8 行）、CLAUDE.md 写入协议段 ~5 行、`.claude/skill-os/extraction-bar.md` ~2 行（decisions 同步规则）。
**验收**：`project.sh new test-proj` 生成两文件 → 填入内容后 `switch` 注入 CONTEXT.md → 空骨架不注入 → `npm run check:project-links`、`bash scripts/verify.sh` 不回归 → 用一个真实外部 repo 项目验证主路径（入场后写 CONTEXT.md，二次入场直接读）。

### M4｜Working memory 命名收口（纯文档）

`memory/README.md` 分层表加第四层 **Working** = 每项目 `workflow-state.yaml` + `docs/PROGRESS.md` + `current-topic.txt`；定义：session/任务内短期状态，项目本地、不治理、不进检索。**IN_PROGRESS reader/writer 失配维持 BACKLOG #18 不动**（只命名，不接线）。~8 行。

---

## 2. 批次 2 — eval 侧三层绑定架构（E1-E5，合计 ≤0.5 session）

> 设计原则：触发保证全部锚在**已存在且在跑**的机制上（handoff 必写规则 + check-quality-gates.mjs CI 线 + Plan Agent 复杂任务门），方法论文档只做被引用的认知层。

### E1｜handoff 契约扩展：gate_result 必带逐 criteria 块（主绑定点）

**为什么绑这里**：handoff 是重型 skill 完成的**唯一强制产物**（workflow 必写；standalone 重型也必写，CLAUDE.md handoff 分级规则；轻量+终端交付豁免不变），且已有活的 CI 校验线（E2）。

**文件**：`.claude/skills/office/references/handoff-protocol.md`
**改法**：`gate_result` 单值扩展为必带 criteria 块：

```yaml
gate_result: PASS | FAIL | CONDITIONAL_PASS
criteria:
  - "[C1] <二元判定句> → PASS（证据: <引用/行号/输出>）"
  - "[C2] <二元判定句> → FAIL（证据: ...）"
  - "[C3] <二元判定句> → UNKNOWN（原因: ...）"   # unknown 逃生口，防幻觉硬判
```

规则：3-7 条；每条绑一个真实 failure mode；每条给证据；criteria 来源见 E4 方法论。
**验证要求（轻量，非重型 A/B）**：同一 skill 产出用新旧协议各跑一次，确认 criteria 块真实出现且非模板化空话（BACKLOG #1 教训的最小满足）。
**验收**：新产出的 handoff 含 criteria 块；存量 handoff 不回溯。

### E2｜check-quality-gates.mjs 升级（硬校验，借活的机制）

**文件**：`scripts/check-quality-gates.mjs`（已由 `verify.sh` S14 与 CI 每次跑）
**改法**（~3-5 行）：对 handoff 的现有 `gate_result` 存在性断言，升级为"存在**且含 ≥1 条 criterion 判定行**"。**新旧兼容**：按日期阈值豁免存量（E1 落地日之后新建的 handoff 才检查）。**失败等级 fail-open**：先 WARN，稳定运行一批（如 ≥5 份新 handoff）后再升 FAIL。
**验收**：构造一份缺 criteria 的新日期 handoff → S14 WARN；含 criteria → 通过；存量 handoff 不受影响。

### E3｜Plan Agent 断言增设"产出质量 criteria"子类（复杂任务源头）

**文件**：`.claude/agents/plan-agent.md` 块3（断言列表规范）
**改法**：断言列表在现有 shell 断言（`[BLOCKING]/[WARNING]`）外增设子类 **产出质量 criteria**（llm-judge 型，非 shell）：复杂任务（满足 Plan Agent 5 条件的）在计划阶段即定义 3-7 条二元 criterion；任务完成后由 quality-gate Free Task Mode 或主 agent 收尾逐条判定并附证据，结果进 handoff（与 E1 汇合）。
**验收**：下一个走 Plan Agent 的任务，计划含 criteria 子类，完成时收尾报告/handoff 含逐条判定。

### E4｜eval-methodology.md（认知层，被 E1/E3 引用——这就是它的 fire 机制）

**文件**：`.claude/skill-os/eval-methodology.md`（新建）
**文件头必写定位声明**：本文件是被 handoff-protocol.md 与 plan-agent.md 引用的方法论参考（how）；**触发保证在 E1/E2/E3，本文件不是触发点**。
**内容**：
1. **统一 Eval 定义**：一个 Eval = `{task, success_criteria(3-7 条二元 criterion，每条绑真实 failure mode + 证据要求), grader(code|llm-judge|human), verdict(逐条 pass/fail/unknown + overall PASS/FAIL/CONDITIONAL_PASS), iteration(FAIL 处置 + criteria 演进)}`。
2. **轻量四步法**（红队修正版，去 Hamel 全套仪式）：
   - Step 1 定义无歧义成功标准（"两位领域专家能独立同判"测试；写不出二元判定句的退回重写）。
   - Step 2 **轻量失败归类**（非 open/axial coding 仪式）：翻现有真实失败——episodic、observations.jsonl、门禁 FAIL 记录、redteam findings——归类命名，**类别即 criteria 来源；有多少用多少，不凑 20-50 case**；只归因 first upstream failure。
   - Step 3 grader 选型：code assertion 最优先（确定性 end-state；现有 tech-spec/task-plan/plan-agent 断言归此类）→ llm-judge（品质类：逐 criteria 二元+证据+unknown+偏见规避；格式参考 muse-proto-judge 的评分卡——**注意：该 judge 已建成但校准 aspirational，machine_confidence 是占位，只作格式参考不当作已验证组件**）→ human+锚点（品味域：taste-review/ux-audit 保持现状，兼校准源）。
   - Step 4 迭代：FAIL 退回沿用现有机制；未被现有 criterion 捕获的真实失败 → 新增 criterion（附出处）；eval FAIL findings 是合法 observation 写入源（observability 闭环扩一个入口，机制不变）。
3. **品质类 criteria 命名**对齐业界标准指标名：faithfulness / completeness / consistency（Ragas/DeepEval 同名概念，不自造轮子）。
4. **end-state 优先原则 + Agent-as-a-Judge 反驳注记**：显式引用 Agent-as-a-Judge（arXiv 2410.10934）"多步 agent 应评轨迹"的主张并反驳——个人 OS 规模下 end-state 便宜可复现且与 Anthropic "grade what the agent produced" 口径一致；trajectory 检查仅保留一个例外：**结果对但绕过治理门槛也判 FAIL**（anti-false-positive）。
5. 附注：写入四态决策（ADD/UPDATE/DELETE/NOOP）的概念归属是 Anthropic memory tool 原生 CRUD 原语（memory_20250818），非 Mem0 独创——此处仅记录概念，落地按 §4 触发条件。

### E5｜quality-gate.md 顺手对齐（降级项，搭车做，可跳过）

**文件**：`.claude/agents/quality-gate.md`
**改法**：删 `Score: <N>/10`（L215、L231），报告格式对齐 E1 的 criteria 块（`Overall: PASS (5/6)` 形式）。**定位是清洁不是修 bug**（N/10 无 rubric 从未造成过决策错误；quality-gate 真实调用频率低——6/7 项目 standalone 不经 orchestrator 调度），因此**不独立成批、不做重型 A/B**，触发保证已前移到 E1/E2。
**连带**：`memory/evals/scripts/collect_eval.py` 注释标注 `quality_gate_score` 切换日期（新值=0-1 通过率，历史 10.0/8.0 为旧制主观分，null 语义保留）；顺手注记 `memory/README.md:65`"从未产出数据"与 eval-log 6 条的 stale 矛盾。

---

## 3. 执行顺序与硬约束

**顺序**：批次 1（M1→M2→M3→M4，M1 的人工合并可最先做）→ 另一个框架 session 跑批次 2（E4→E1→E2→E3→E5：先有方法论文档才能被 E1/E3 引用）。

**硬约束（红线，全程遵守）**：
- `framework/` 只读（SF-002）；稳定事实不得直写 promoted-facts.yaml/CONTEXT.md（SC-20260523-003，如产生 semantic 经验走 propose_semantic.py）。
- 母版目录操作遵守 parallel-lucagstack-fork-merge-care（union 不覆盖）；触碰母版必须同 session commit。
- 改 CLAUDE.md/hook/脚本后回归：`npm run check:hooks`、`bash scripts/verify.sh`、`node scripts/test-hooks.mjs`、`npm run check:project-links`。
- fail-open 哲学：新校验一律 WARN 起步；任何新增逻辑不得阻塞 session 结束。
- 每批完成后 git commit（本仓 muse 分支）；写 handoff/checkpoint 按现行协议。

**明确不做（禁做清单，防执行 session 扩 scope）**：
- 不新增任何 hook；不改 route-guard/session-sync/session-restore 的行为逻辑（M2 只改 CLAUDE.md prose）。
- 不解冻 GEPA/eval 数据层；不建 judge_eval.py；不写 pairs.jsonl。
- 不做 glossary、不做写入四态化指引、不做 bi-temporal 读侧过滤、不做 IN_PROGRESS writer、不引入向量检索（触发条件见 §4）。
- 不重构 evals skill（维持 dormant）；不动 ux-audit 权重 rubric；不动 muse-proto-judge。

---

## 4. 不做清单（带重启触发条件，逐条可逆）

| 项 | 重启触发条件 |
|---|---|
| glossary（独立文件或 CONTEXT.md 节） | 某项目真实出现 ≥3 次术语误解返工记录 |
| 写入四态化指引（激活 `--supersedes`，`propose_semantic.py:70-71` 参数已在） | 首次出现真实 UPDATE 需求（需修正/取代一条旧记忆）；落地时连带 BACKLOG #2 读侧过滤 |
| bi-temporal 读侧过滤 | 维持 BACKLOG #2 原触发条件 |
| IN_PROGRESS writer/reader 收口 | 维持 BACKLOG #18 原触发条件 |
| GEPA 数据层解冻 | 维持 GAP-eval-frozen 重访条件 |
| Solo Mode（不写 handoff 的轻任务）强制评估 | measure-first 延后；若真实出现"轻任务烂产出未被发现"案例 → 做 Stop hook 高阈值软提醒（substantive 且无 handoff 且无 marker 才一行，防 BACKLOG #17 通道饱和） |
| evals skill 接线 | 维持 dormant；若裁决要接，形态=quality-gate 结果自动追加 eval-log（不生成 docs/evals 汇总文档） |
| person 层"最贵层"注入成本优化（Anthropic context editing / memory tool 方向） | future-watch：母版 MEMORY.md 索引超 ~40 条或启动注入明显拖慢时评估 |

---

## 5. 执行 session 快速上手（恢复指令）

1. 读本文件（自足）。确认当前在 muse fork：`/Users/luca/Desktop/项目/muse/gstack`，分支 muse。
2. 跑 `bash scripts/verify.sh` 确认基线绿。
3. 按 §3 顺序执行当前批次；每项完成对照其「验收」条目当场验证。
4. 批次完成：git commit（若触碰母版 `~/Desktop/luca_gstack`，母版也同 session commit）→ 按 extraction-bar 四信号裁决是否沉淀经验 → 更新本文件头部状态行（`批次1 done: <date>` / `批次2 done: <date>`）。
5. 卡点/偏离本方案的决策 → 停下问 luca，不自行扩 scope。

**关键文件速查**：`scripts/project.sh`（M1 参照/M3 主改）、`.claude/hooks/route-guard.mjs`（M2 事实依据，不改它）、`memory/README.md`（M4）、`.claude/skills/office/references/handoff-protocol.md`（E1）、`scripts/check-quality-gates.mjs`（E2）、`.claude/agents/plan-agent.md`（E3）、`.claude/skill-os/eval-methodology.md`（E4 新建）、`.claude/agents/quality-gate.md`（E5）。

<!-- FILE_END: 2026-07-09-memory-eval-final-plan -->
