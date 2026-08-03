# 握手记录 R1 — 能力可达性治理 plan 红队深审

> 被审对象：`~/.claude/plans/abundant-shimmying-thunder.md`
> 红队：4 路独立 opus，冷启动，default-REFUTE，各攻一维
> 裁决：**四路全 BLOCKER-FOUND**。plan 判定为**重写级**，非修补级。
> 编排者（我）逐条独立核验，三分类归档。**驳回条目附反驳证据**。

---

## 一、接受为真缺陷（已独立验证，改 plan）

### 批 2「零使用 skill → 内核留下、外壳存档」：**三条动机全部为假 → 整批撤回**

| 原动机 | 实测反证 | 位置 |
|---|---|---|
| handoff-review 要三件套 AND，1/11 齐全 → 「设计得跑不起来」 | **AND 门不存在**：Phase 0 多选、场景 B 自动隐藏节 3、单节 BLOCKED 有「跳过此节继续」出口 | `handoff-review/SKILL.md:56,73,96` |
| design-review 三处共享判据 → 选一处作真值源 | **原文明令禁止**：「据此路由，**不因判据同批而混用**」；且三条判据实际仅 1/3 真重合 | `design-review/SKILL.md:135` |
| taste-review 内核已被 design-brief 引用 → 存档零损失 | **验收是同义反复**：存档动作不触碰 design-brief（grep `taste-review` 零命中），「行为一字不变」恒为真 | 实测 |
| — | 差集实测：slop 扫描 taste-review **8** 处 / design-brief **1** 处 → 内核不在接收方 | 实测 grep -ci |
| — | 拆壳杀掉 `iteration` 唯一写者（handoff-review 是全仓唯一写者，`session-restore.mjs:52` 唯一读者，CLAUDE.md 启动协议第 2 步依赖它） | 实测 |
| — | `model-routing.yaml:75` fable P0 白名单含「handoff-review 的 oracle 环节」，壳没了成空指针 | 实测 |

### 批 3「持续保证」：**机制不可实施 → 整批撤回重设计**

| 原设计 | 实测反证 |
|---|---|
| 挂 `check:registration`（verify.sh S19） | 该脚本跑在 CI runner，产出数据在 `~/Desktop/项目/` **仓库外** → ENOENT 或全判零使用 |
| 用「reference 被引用数」当留任判据 | **无区分度**：handoff-review=5、taste-review=4，而活着的 muse-req-triage=4 / research-kit=3 / code-recon=1。任何能退掉壳的阈值同时退掉活 skill；`vetting-registry.yaml` 42 行死引用随 evolution-scout 单调增长 |
| 「让规则对隐藏层生效」 | `check-registration-sync.mjs:23` 只枚举带 `invoke` 的 21 个一级 skill，隐藏层 11 个**结构上进不了循环** |
| 处罚 = 降级为隐藏 | 隐藏层处罚是**空集**（三样本来都没有），而 plan 又禁止删磁盘资产 → no-op |
| 「产出文件存在性」 | `input-modes.yaml` 只有 2/34 个 skill 登记 `output_path` → 无机器可读输入，实现它就是新建机器（与「不新建检查器」自相矛盾） |
| **更根本** | 「使用即留任」**从未有过执行者**（全仓无实现）。问题不是「数据源脏」而是「规则从未运行」。真跑一遍会藏掉 `/auto` 与 `/muse-loop-orchestrate`——而这两个是 tracked `settings.json` `ROUTE_GUARD_HEAVY_SKILLS` 的依赖项 |

### 批 1「砍限制性门禁」：**方向成立，做法全错**

| 缺陷 | 实测证据 |
|---|---|
| **计分函数会把「没看见」记成「没问题」** | Module A 扣分制 `100 - (P0×20+P1×10+P2×5)`（`module-a-visual.md:150`）→ 看不见=找不到问题=**100分**；Module C「不适用的节按满分计」（`:117`）。**plan 断言「A/C 既有『无法判断』出口」是事实错误**：实测 `grep -c 无法 module-a-visual.md` = **0**，那是 Module B 独有（=4） |
| 虚高分会**持久化污染** | 场景 C 的 `baseline_score` 写进 workflow-state → 改版后永远达不到「+10 分」，验收门永久失效 |
| 只改 Phase 0 门会**复活** | `ux-audit/SKILL.md:315` 末尾约束 #2「截图是强制输入…不能继续执行」仍在；CLAUDE.md 冲突处理条款「以约束更严格的那条为准」→ 必然复活 |
| **风险披露错误** | 批 1.3 要动的 `skill-invariants.md:106` 在 **P6 严格保护区**，比我标注的 `:163`（各 Skill 可进化区）更重——我把轻的标成「须批准」，重的只字未提 |
| task-plan 降级方向**反了** | MUST 节点空集 → Phase 7 真空通过 → 打印 `TASK PLAN GATE PASS（MUST 0/0）` → 下游 `block_if` 全放行 → 执行 agent 在零覆盖率验证的任务卡上写代码。**降级 = 门自动变绿** |
| task-plan 只改 1/4 个执行点 | 另三处：`preflight-agent.md:71`、`optional-workflow-graph.yaml:197-205`、`routing-chain-check.md:74`。且 `routing-chain-check.md:74` 明文承诺「路由层不预拦、依赖 skill 自拦」→ skill 不自拦后 standalone 路径掉到**零提示** |
| 编辑面漏 ≥6 处 | 含 `routing-chain-check.md:49`（**我两天前刚写的 R4 资产表**，同文件 `:87` 明写「新增/退役评审资产改这一处」——自己定的规矩自己没遵守）、`skill-routing-map.yaml:73`、`office-wizard.md:206`（REG-3 展示面真值源）、`muse-loop-orchestrate/SKILL.md:101`、`ux-audit/SKILL.md:8` |
| 「我自己截图」通道不存在 | ux-audit 及 3 个 specialist 的 `allowed-tools` 均无截图/网络工具，要开须动 **P1** |

### 数据层错误（我算错的）

| plan 断言 | 实测 |
|---|---|
| task-plan 双 handoff 「2/11」 | **3/11**（muse/roam-cards/todo-capsule）——C、A 双独立测出同一数字。且按 preflight 判据（`coverage_gate.*PASS`）只有 muse → **1/11**：两套门判据不等价 |
| ux-audit 产出统计走 `review/` | ux-audit 实际写 `evaluation/`（`SKILL.md:105/150/177/196`）。该路径有 8 个非自身消费者 + 1 份产出 = **高消费者低产出反例**，正是我自己要求红队找的反事实 |
| 分母 11 个项目 | 4 个是空壳（agent-e2e-test 无 docs、projA/projB 空、ai宠物提示 仅 1 份）→ 真实分母 ≈ **7** |
| taste-anchors「5 引用 → 存活」 | 5 个引用者 = design-brief + design-review + evals + redteam + taste-review。**4 个是死的或本批待存档的**，活引用 = **1**。我在批 3.8 flag 了「引用数被死引用撑起来」，却没把它用在自己的证据上 |
| redteam「产出契约要求一件不会发生的事」 | 落盘契约今天（`fae3e5e`）已补框架治理分支——**我自己几小时前改的**，写 plan 时没算进去 |

---

## 二、举证驳回（红队错的，附反驳证据）

**1. C 把「blame 判据是伪判据」定 BLOCKER → 降 MAJOR。**
判据错**成立**（实测 `git rev-list --max-parents=0 HEAD` = `7295ec2`，373 files 一次性 import，85–96% 基准率，零区分度）。
**但** A 独立用正确方法（`rules.yaml` 全查 + `memory/` 检索 + `promoted-facts` 穷尽）验证了 ux-audit / task-plan 的「无出处」结论**成立**。C 自己也写「结论可能仍对，但目前无证据」。
→ 真 BLOCKER 在「下一轮 50+ 条按同判据工业化」那句承诺。**处置：删掉该承诺 + 判据 1 改写为「五源穷尽检索」，而非 blame。**

**2. C 的「这道 AND 门一次都没卡住过（3/3=100%）」过强。**
A 独立测出按 `preflight` 判据只有 muse 一个 → **1/3**。两套门判据不等价（A 的独立发现）。C 的结论只在 SKILL.md 判据下成立。

**3. B 称「input-modes.yaml 与 optional-workflow-graph.yaml 均无 handoff-review 条目，grep 零命中」——错。**
实测 `input-modes.yaml` **有 1 处命中**（workflow-graph 确为 0）。不影响其主论点（多选+隐藏+跳过出口是直接证据），但该断言本身不成立。

**4. C 的「redteam 产出不是 0」需限定。**
抽查 `framework-audit/2026-07-23-mattpocock-update-redteam-findings.md`，头部为「红队回票全文 + 编排者回应」，**不符合 redteam skill 的产出契约**（契约要求「每条质疑一句话 + 如果成立影响是什么」）。这些是 session 内手写的审计文档，非 skill 产物。
→ **但 C 的洞察反向更有力**：评审行为一直在发生、产物一直在落盘，只是**不走 skill 契约**。这是我原论点的加强版而非反驳。

**5. C 的「需求侧解释」隐含前提要驳。**
C 称「拆门后若产出仍为 0，无法判定是拆门无效还是需求为零」。但批 1.1 的目标不是提高产出，而是移除限制模型能力的门——按 luca 的认知一致点，判据是「限不限制能力」不是「用得多不多」。
→ **但 C 的洞察反向有效且更狠**：若需求本就为零，正确处置可能是砍掉整个 skill 而非修它的门。**已并入价值裁决轮。**

---

## 三、升 luca 裁决（已回）

**Q1 范围** → 裁决：**两件都做，价值裁决优先**。
先出零使用 skill 的价值裁决，再按结果决定谁修可达性、谁直接砍。

**Q2 保护区** → 裁决：**批 `:163` 改措辞 + P6 顺序重排**；**P1 `allowed-tools` 不批**。
推论：ux-audit 材料门本轮只收 HTML 源码 / 本地路径 / 页面 URL，「我自己截图」通道不开。
`:163` 做法 = 不删条目、只把「截图强制输入约束」改为「评审材料强制输入约束（截图 / 页面 URL / HTML 源码，任一）」——保护区条目数不变，「禁止零材料裸评」保住（解门后**更需要**它，见批 1 计分函数缺陷）。
P6 做法 = Phase 0 三问顺序重排为 **场景 → 模块 → 材料**并保留顺序锁（解门后新造出依赖：要什么材料取决于激活哪些模块；单纯解锁会重现「为不跑的模块要截图」）。

---

## 四、裁决对象名单（三次修正后定稿：11 → 5）

`skills_used` 字段脏（7 月缺失率 52%），红队 D 的「9 个从未使用」需修正。我连犯**三次同类 glob 错误**才拿到准确数字——每次都是「按 `*-<skill>*.md` 后缀猜产出路径」，而实际路径各不相同：

| 错误 | 真实路径 | 暴露方式 |
|---|---|---|
| task-plan 判 0 | `engineering/`（非 `tasks/`） | 自查 output_path 登记 |
| research-kit 判 0 | `research-kit-<topic>-<date>.md`（**前缀**非后缀） | 取证 1 引 commit `b7033ba`「首次实跑产出经独立方法学审查判 4 BLOCKER」 |
| code-recon / muse-loop 判 0 | `todo-capsule-architecture-brief.md`、`loop/specs/REQ-*/`（**产出不带 skill 名**） | 取证 2 引首 commit「todo-capsule 产出 104 行 brief」+ SKILL.md 内嵌三条真实事故记录 |

**加入年龄维度后**（「使用即留任」是 60 天窗口规则，对未满 60 天的 skill 根本不适用）：

| skill | 存在天数 | 真实产出 | 60 天规则 | 结论 |
|---|---|---|---|---|
| task-plan | 69 | 4 | 适用 | **活** |
| research-kit | 13 | 1（+ 事故驱动补丁） | **不适用** | 移出 |
| code-recon | 29 | ≥1 | **不适用** | 移出 |
| muse-loop-orchestrate | 32 | 2 个 REQ 目录 | **不适用** | 移出 |
| muse-req-triage | 32 | 随 loop 跑过（三次工具契约缺口修复均源自真实运行） | **不适用** | 移出 |
| ux-writing | **13** | 0 | **不适用**（未到评判期） | 移出 |
| insight-synthesis | **14** | 0 | **不适用**（未到评判期） | 移出 |
| **auto** | **69** | **0** | 适用 | **裁决对象** |
| **ux-audit** | **69** | **0** | 适用 | **裁决对象** |
| **taste-review** | **69** | **0** | 适用 | **裁决对象** |
| **design-review** | **69** | **0** | 适用 | **裁决对象** |
| **handoff-review** | **69** | **0** | 适用 | **裁决对象** |

**最终名单：5 个**，且全部是仓库首个快照（`7295ec2` 2026-05-26）就存在的那批。**7 月新落地的 6 个 skill 全都跑过至少一次**——这条本身是重要发现：新 skill 有人用，最初那批里有 5 个从来没用过。

对照组：brainstorm 13 / deepresearch 13 / design-brief 15 / tech-spec 6 / ux-brainstorm 9（同为 69 天，同期落地）。

### 已取证的裁决材料（取证 1、2）

**auto**——零使用**已被诊断并修复过两次**，修完仍是 0：
`plan-agent.md:46` 原文「是 2026-07-03 全量搭建 review 发现 /auto 50-session 零使用的结构性成因之一（另一半成因是 route-guard.mjs 的 HEAVY_ORCHESTRATOR_SKILLS，已同期修复）」。
→ **这是「修可达性无效」的第二个实证**（第一个是 ux-audit 入口最全仍零产出），且比 ux-audit 更强：ux-audit 是「入口一直很全」，auto 是「专门诊断过、专门修过、修完还是 0」。

**ux-audit**——截图门无事故出处**已由两路独立确认**（`rules.yaml` 3 条命中中 2 条 retired、1 条是 route 门禁与截图无关）。
知识 226 行（46%）但**大量重复**：间距白名单/品牌色 ≤3 处也在 `design-system-contract.md:99/:131`；C1-C4 也在 `crm-business-criteria.md`（621 行）与 `ux-evaluation-framework.md`；位置枚举在三个 specialist 里各存一份副本。
**独有知识**：module-b 的 Nielsen 10 + Norman 7 + WCAG 2.1 AA 7 项、module-a 的 A6 Gestalt 8 锚点（2026-07-21 新增）、GOMS/KLM 操作子计数。
**外壳自带缺陷**（取证 2 新发现，比红队 A 报的更严重）：`baseline_score` 取值链路是「主报告 → grep → 正则取首个整数」而非从模块得分直传；写入块**无条件执行**（不分场景 B/C）；**全仓无任何脚本/hook/skill 读取该字段**（死字段）；且 `except: state = {}` 分支会在 yaml 解析失败时把整个 workflow-state **清成只剩 ux-audit 一个节点**。

---

## 五、下一步

1. **[进行中]** 3 路取证员并行提取 11 个 skill 的结构化事实（硬门禁清单 / 知识内核 / 行数分布 / 创建背景 / 可达性面 / 能力依赖分类）。
   **含对照组 design-brief + brainstorm**——用以检验我自己的结论「硬门禁多 = 死因」是否成立（design-brief 据称 30 条硬门禁却产出最多，若成立则该结论被证伪）。
   **取证外包、判定自留**：取证员被明确禁止做价值判断。
2. 我做价值裁决（2×2：能否触发 × 触发后增强/限制），逐个 skill 出处置。
3. 出 plan v2 → R2 握手（上限 2 轮，本轮已用 1）。
4. 执行 → 实现后独立评审。

<!-- FILE_END: 2026-08-03-capability-reachability-handshake-r1.md -->
