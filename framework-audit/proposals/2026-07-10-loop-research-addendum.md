# Loop 架构调研补编（Round 2 — 堵上一轮缺口）

> 2026-07-10。配套计划：`~/.claude/plans/claude-code-loop-agentic-coding-loop-lu-tranquil-karp.md`。
> 上一轮（Opus 单轮）只调研了"关于 loop 的评论文章"，漏了用户点名的 **X 实践者原帖** 与 **GitHub 真实实现**。本编补齐这两层，并对 round-1 的 5 条关键引用逐条核验。
> **执行方式：** 2 个 opus subagent 并行、一轮不递归（有界）。

---

## 门控判定（最重要的一行）

**补调研是否推翻 round-1 任一共识？ → 否。全线 CONFIRMS，零 CONTRADICTS。**

round-1 三条共识：**(A)** inner loop 是模型/harness 原生资产、不重造；**(B)** 框架层只加**薄** outer loop；**(C)** 复杂度必须自证。两轮补调研的裁定：

| 共识 | X 实践者层 | GitHub 实现层 | 合并裁定 |
|---|---|---|---|
| (A) inner 原生不重造 | CONFIRMS（无人重造，唯 autonomy 长度有分歧） | CONFIRMS（philschmid 逐字、SWE-agent 改接口不改 loop、Letta v1 删 heartbeat 保持 in-distribution） | **CONFIRMS，可沿用** |
| (B) outer loop 要薄 | NUANCES（硬骨头代码库有"结构化但仍由原语搭成"的合法档） | CONFIRMS+NUANCE（ralph-wiggum = 一个 Stop hook 的存在证明；但薄 loop 的上限必须真的有效） | **CONFIRMS，措辞收紧（见下）** |
| (C) 复杂度自证 | CONFIRMS（一致，无异议） | CONFIRMS 强化（OpenHands/BMAD 对自己砍抽象；claude-flow 反例） | **CONFIRMS，强化** |

→ Phase 2 决策备忘的所有条目**可基于 round-1 共识继续**，无需重议。唯一措辞修正：见 §(B) 收紧。

---

## §X — 实践者原帖层（6 人，一手源优先）

| 人 | 实际用的 loop 形态 | 对 (A)/(B)/(C) |
|---|---|---|
| **Karpathy** | 监督式短爆发委派，**非**自主 loop；"autonomy slider" 默认调低、真/新任务短皮带、side-IDE 逐步 review；nanochat 因 off-distribution 干脆手写 | A支持(强调短皮带) / B支持(只加行为规则+人审) / C强支持(过度工程是其头号抱怨) |
| **Boris Cherny**（CC 作者） | 开箱即用的原生 loop + 三个薄习惯：并行(~5本地+5-10云)、plan-first、verification 反馈环；人在 plan 批准门 | A强确认 / B强确认(plan门+test停止条件) / C确认("开箱即用不定制") |
| **Simon Willison** | "agent 在 loop 里跑工具达成目标"；投资在**设计工具与 loop**而非 prompt；**干净通过的测试套件**是停止条件；AGENTS.md 记工具、反对重 MCP | A确认 / B确认(test+markdown+sandbox，明确反对重工具) / C确认 |
| **swyx** | 最偏框架的一位：IMPACT 六元素、"editable plans 是 SOTA"、"Loopcraft: 堆叠 loop" | A细化 / B部分反对(IMPACT 比"薄"重) / C细化(经验主义而非极简纪律) |
| **Dex Horthy** | **RPI（Research→Plan→Implement）+ 阶段间刻意 compaction**，context 利用率压 40-60%；人**硬**在 research/plan 门、轻在代码；300k-LOC Rust 一周活一天干完过专家 review | A细化(不重造但包多阶段) / B细化("结构化但纪律化"，每块仍是 spec/stop/memory 原语) / C确认(结构由实测结果背书) |
| **ghuntley** | ralph 已从"无限喂同 prompt"进化成 **orchestrator 模式**：一组 backing specs + 一个 goal，**每 loop 一个任务**、fresh context、进度存 files/git；升级路径 → Loom；人在 CTRL+C 暂停 + 观察者角色 | A细化(不重造但整体是外层 looping harness) / B细化(core ralph 极简，Loom 升复杂) / C细化(base ralph 极便宜、Loom 越界) |

**净结论（实践者层）：** (A)(C) 一致加固；(B) 被**细化而非否定**——日常编码要薄，但硬骨头代码库存在一个**证据背书的"结构化 outer loop"档**（RPI + compaction + 人类 spec 门），**其每一块仍由 stop-condition/spec/memory 原语搭成，永不重造内循环**。关键新概念：**Karpathy autonomy slider**——自主度是可调旋钮，真/新任务默认调低。

---

## §G — GitHub 真实实现层（7 个，读 repo 非读评论）

| repo | loop 形状 | 停止条件 | 状态存放 | 可抄的参数 |
|---|---|---|---|---|
| **anthropics/claude-code · ralph-wiggum**（已验证存在） | 最薄：Stop hook 阻止退出、重注入**同一** prompt；进度存文件/git | ①iteration≥max ②`<promise>` 文本**精确串比** | `.claude/ralph-loop.local.md`(YAML counter) | Stop-hook + markdown counter + 精确 sentinel + **硬 iteration 上限**（#18646 证明默认无限是危险的） |
| **Aider** | architect/editor 双模型(顺序非协作) + reflection 环 | **max_reflections=3 硬编码** | chat史+repo+git | **自修正上限=小整数(3)**；推理与编辑分离 |
| **OpenHands** | 事件流 `_step()` model→Action→Obs | FinishAction / **MAX_ITER~100** / 成本上限 / StuckDetector | EventStream + **LLM condenser**(>80 事件压缩，留前4) | **StuckDetector 启发式**(4+相同动作↔观察、3+相同动作↔错误、3+连续无工具独白、6+交替→中止)；**V1 删掉 AgentController** |
| **SWE-agent** | ReAct + 押注 **ACI**(为 LLM 定制命令、lint-before-apply 护栏) | `per_instance_cost_limit`(论文$4)、超限**自动提交部分工作**；~50 turn | 容器环境 + trajectory | **投资工具接口而非 loop**；成本上限超限优雅降级而非硬杀 |
| **claude-flow/ruflo**（反面案例） | swarm/hive-mind、Queen 层级、27 hooks、12 workers | 无干净 loop 上限 | SQLite `.swarm/memory.db` + Artifacts | 反面：MCP 工具 87→314、版本剧烈翻动 = **未自证的编排税**；可取的只有持久 SQLite 记忆 + Artifacts-out-of-prompt |
| **BMAD-METHOD** | 非 runtime loop，**4 阶段文档管线**：PRD→架构→story 分片→Dev→QA | 每 story 完成；`workflow-status.md` 追 TODO/IN_PROGRESS/DONE | markdown artifacts（story 文件是上下文单元） | **story 文件=上下文单元 + 一个状态账本**；人审在 plan/story 阶段。近期**把 SM+QA 合并进 Dev**（多余 agent 不划算） |
| **humanlayer/12-factor** | 原则+工具非单一 runtime | Factor 8 自己拥有 while 循环 | 统一执行+业务状态 | **显式拥有 while 循环 + HITL 做成异步 tool call（非 hook）+ 代码生成挂在已批准 spec 后**（get-shit-done: `SPEC.md==FINALIZED` 才许写码） |

**5 条 round-1 引用核验：全部 VERIFIED（多数逐字）。** 唯一修正：Cognition 博客域名 `cognition.ai`→**`cognition.com`**(301)。逐条：BEA byline(Erik Schluntz & Barry Zhang)✓；Letta v1 删 heartbeat + "stay in-distribution"✓逐字；philschmid "loop is hardcoded"✓逐字；Cognition 两原则(share full traces / actions carry implicit decisions)✓逐字；Manus "Keep the Wrong Stuff In"(Yichao "Peak" Ji)✓逐字。

**两个最有力的新经验证据（对 CUT 立场直接背书）：**
1. **旗舰框架对自己砍抽象**：OpenHands V1 删 AgentController、BMAD 合并 SM+QA→Dev——"复杂度必须自证"不是空话，是被工业界对自己执行过的。
2. **claude-flow 是活体反例**：87→314 工具的膨胀正是本框架该防的编排税。

---

## 沉淀：可抄进"薄层"的 loop 机制清单（供未来"接 ralph / /loop 使用指引"一页纸用，本次不实现）

1. 硬 iteration 上限，且**必须真的生效**（ralph #18646 教训）；编码任务起步 10-20，**永不默认无限**。
2. 精确串 completion sentinel（`<promise>DONE</promise>` 字面匹配）确定性收尾。
3. reflection 上限 = 3（Aider）。
4. 成本/turn 上限 + 超限**优雅自动提交部分工作**（SWE-agent）。
5. StuckDetector 启发式（OpenHands，可直接移植的数字见上表）。
6. context condenser 阈值（>80 事件压缩、留前 4）。
7. 状态存 files+git、一个状态账本文件（BMAD workflow-status.md）。
8. 人类门在 **plan 阶段**、做成异步 tool call（humanlayer）——比审 final diff 便宜。
9. **保留错误在 context**（Manus）、**分派时传完整 trace**（Cognition）。

**元结论：** 赢法 = 在原生 loop 外**加有界护栏**（上限/sentinel/stuck 检测/状态账本/plan 门），并**定期删掉不划算的抽象**（OpenHands、BMAD 的自我示范）。这正是本计划 A1 宪法条款 + NOT-DOING 清单要 codify 的东西。
