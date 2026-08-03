# Plan v2 — 能力可达性治理（R1 握手后重写）

> v1（`~/.claude/plans/abundant-shimmying-thunder.md`）被四路红队全判 BLOCKER，**判据本身被证伪**，非修补级。
> R1 握手记录：`2026-08-03-capability-reachability-handshake-r1.md`
> luca 已裁决：①范围＝两件都做、价值裁决优先 ②保护区＝批 `:163` 改措辞 + P6 顺序重排，**P1 `allowed-tools` 不批**

---

## 一、判据（v1 判据已证伪，这是替换版）

### 被证伪的 v1 判据

> ~~知识内核＝增强＝全活；流程外壳（硬门禁）＝限制＝全死~~

**证伪数据**（同一口径，取证 3）：

| | taste-review | design-review | handoff-review | design-brief | brainstorm |
|---|---|---|---|---|---|
| 硬门禁总数 | 13 | 6 | 20 | **41**（+45 `block_if`） | **30** |
| 产出 | 0 | 0 | 0 | **15** | **14** |

门禁最多的活得最好。**门禁数量与存活无关，甚至正相关。**

### v2 判据（两个条件，一必要一充分）

| | 可达性面(5) | 是几个下游 gate 的源 | 产出 |
|---|---|---|---|
| taste-review / design-review / handoff-review | **0/5** | 0 | 0 |
| **auto** | **5/5** | **0** | **0** |
| **ux-audit** | 4/5 | **0** | **0** |
| design-brief | 5/5 | **4** | 15 |
| brainstorm | 5/5 | **1** | 14 |
| task-plan | 5/5 | 1 | 4 |
| research-kit | 5/5 | 1 | 1 |

**判据 1（必要条件）**：有可达入口。0/5 的三个全死。
**判据 2（充分条件）**：**是下游 gate 的源** —— 下游 skill 因为缺它的产出而被 `block_if` 拦住。
auto/ux-audit 可达性满格却死，正因为**没有任何下游会因为缺它们的产出而卡住**。

**判据 3（luca 的第二把尺子）**：触发后是否限制模型能力。判定问三条——
① 它给模型加信息（判据/领域知识/项目约束），还是替模型决定（硬拦截/顺序锁/窄映射表）？
② 模型变强后这条会不会挡路？③ 有没有退场条件？

**判据 4（存档前必答）**：逐条差集——该 skill 的每个可执行条款，在拟接收方里是否存在？「三处均无」的条数就是存档的真实损失。
（v1 用「内核已被引用」代替差集，是 R1 的 BLOCKER 之一。）

**判据 5（取证纪律，R1 教训）**：判「有无出处」两侧必须**同法取证**——五源穷尽检索（`rules.yaml` / `promoted-facts` / episodic / `framework-audit` / SKILL.md 正文），**禁止用 `git blame`**（本仓 `7295ec2` 是根提交，85–96% 基准率，零区分度）。

---

## 二、裁决对象（三次修正后：11 → 5）

「使用即留任」是 60 天窗口规则，**对未满 60 天的 skill 不适用**。加年龄维度后只剩 5 个，且全部是仓库首个快照（`7295ec2` 2026-05-26）就存在的那批：

| skill | 存在 | 产出 | 可达 | gate 源 | 独有资产 | 限制能力? |
|---|---|---|---|---|---|---|
| auto | 69d | 0 | 5/5 | 0 | 意图→Pipeline 7 行表 / WA 模板 15 字段 / 失败处理表 | **是** |
| ux-audit | 69d | 0 | 4/5 | 0 | Nielsen 10 + Norman 7 + WCAG AA 7 / A6 Gestalt 8 锚点 / GOMS-KLM | **是** |
| taste-review | 69d | 0 | **0/5** | 0 | 9 条三处均无 + 5 条模板结构 | 否 |
| design-review | 69d | 0 | **0/5** | 0 | 仅 `:130-135` 三方边界声明 | 否 |
| handoff-review | 69d | 0 | **0/5** | 0 | `iteration` / oracle-taste 分类表 / auto-revise-once | 否 |

**7 月新落地的 6 个 skill 全都跑过至少一次**（research-kit 1 份+事故补丁、code-recon ≥1、muse-loop 2 个 REQ 目录、muse-req-triage 三次契约修复源自真实运行、task-plan 4 份）。ux-writing/insight-synthesis 仅 13–14 天，未到评判期。

---

## 三、处置

### A · auto → 降级隐藏（撤一级入口，磁盘零删除）

**依据**：
- 零使用**已被诊断并修复过两次**：`plan-agent.md:46`「2026-07-03 全量搭建 review 发现 /auto 50-session 零使用的结构性成因之一（另一半成因是 route-guard.mjs 的 HEAVY_ORCHESTRATOR_SKILLS，已同期修复）」。修完至今一个月仍是 0。
- **判据 3 全中**：它把「我自己判断该派什么 skill、怎么编排」替换成 7 行固定映射表（替模型决定）；模型编排能力增强后这张表只会更窄（会挡路）；无退场条件。
- 判据 2 = 0（workflow-graph 零命中，不是任何 gate 的源）。

**动作**（照「使用即留任」既定处罚：撤一级入口，磁盘/逻辑零删除）：
1. `skill-routing-map.yaml` 移除 `auto:` 条目
2. 删 `.claude/commands/auto.md`
3. `CLAUDE.md` 一级表移除该行，移入隐藏名单；同步 `AGENTS.md`
4. `office-wizard.md` 移除展示条目（REG-3 真值源）
5. **必须同改**（否则 CI 红）：`check-routing-map.mjs:20` `requiredInvokes`、SSOT-10 的 `HITL_ANCHOR['/auto']`、`.claude/settings.json` 的 `ROUTE_GUARD_HEAVY_SKILLS`（去掉 `auto`，保留 `muse-loop-orchestrate`）、`plan-agent.md` 条件 2 豁免 roster、`check-registration-sync.mjs` 的 21→20 计数
6. `CLAUDE.md`「组合升级 /auto」语义规则改写为「多 skill 组合 → 按语义路由契约自行编排，不走固定映射表」

**可逆性**：全部是登记面改动，恢复 = 反向加回 6 处。

### B · ux-audit → 先修计分函数，再解门

**顺序不可颠倒**（R1 BLOCKER）：当前 Module A 是扣分制 `100-(P0×20+P1×10+P2×5)`，Module C「不适用的节按满分计」，而 `grep -c 无法 module-a-visual.md` = **0**——先解门会让「没看见」= 找不到问题 = **100 分**。

**B1（先做）· 计分函数 evidence-aware**：
- 三个 specialist 统一新增 `EVIDENCE-INSUFFICIENT` 判定值，**不计入分母**（对齐 `module-b-interaction.md:98` 既有做法）
- 禁止「不适用按满分计」用于「无法判断」——`module-c-crm.md:117` 改为区分「结构上不适用（跳过节，不计入分母）」与「材料不足（EVIDENCE-INSUFFICIENT，不计入分母）」
- `module-a-visual.md:150` 扣分制改为：`得分 = 100 - 扣分`，但**当可判定项 < 阈值时输出 `EVIDENCE-INSUFFICIENT` 而非分数**

**B2 · 顺带修 `baseline_score` 的真实缺陷**（取证 2 新发现，比 R1 报的更严重）：
- 取值链路是「主报告 → `grep -o '[0-9]\+' | head -1`」，非从模块得分直传
- 写入块**无条件执行**（不分场景 B/C），而场景条件只出现在报告文本里
- **全仓无任何脚本/hook/skill 读取该字段**（死字段，唯一引用是本轮握手记录）
- `except: state = {}` 分支会在 yaml 解析失败时把 workflow-state **清成只剩 ux-audit 一个节点**
→ 动作：改为从模块得分变量直传；加场景判断；`except` 分支改为**报错退出不写入**（绝不用 `{}` 覆写）。

**B3 · 截图门 skill 级 → 材料级**（luca 已批 `:163` 改措辞）：
- `skill-invariants.md:163`「截图强制输入约束」→「**评审材料强制输入约束（截图 / 页面 URL / HTML 源码，任一）**」（不删条目，保住「禁止零材料裸评」）
- **P1 `allowed-tools` 未获批** → 本轮材料门只收 **HTML 源码 / 本地文件路径**（`Read` 即可），页面 URL 需 `Bash curl` 取 markup 并标注「仅静态 markup，行为态判 EVIDENCE-INSUFFICIENT」；「我自己截图」通道**不开**
- **完整编辑面**（R1 查出漏 ≥6 处，逐处列出）：
  `ux-audit/SKILL.md:8`(description) / `:51` / `:66` / `:102` / `:148` / `:174`(三处 dispatch 输入行) / `:315`(末尾约束 #2，**不改则按 CLAUDE.md「以更严格者为准」门会复活**)
  `routing-chain-check.md:49`（R4 资产表——**同文件 `:87` 明写「新增/退役评审资产改这一处」**）
  `skill-routing-map.yaml:73`（撤词理由注释仍以「强制截图」立论）
  `office-wizard.md:206`（REG-3 展示面真值源）
  `muse-loop-orchestrate/SKILL.md:101`（「复用 ux-audit 的强制截图阻塞契约先例」）
  `memory/evals/routing/fixtures.jsonl:48-49`（两条 semantic fixture 的 note）

**B4 · P6 顺序重排**（luca 已批）：
`skill-invariants.md:106` 的 `ux-audit: Phase 0（三个询问必须按顺序）` → 顺序改为 **场景 → 模块 → 材料**，**保留顺序锁**。
理由：解门后新造出依赖（要什么材料取决于激活哪些模块）；单纯解锁会重现「为不跑的模块要截图」的过度索取。同步改 `ux-audit/SKILL.md` Phase 0 三问顺序。

### C · taste-review → 迁资产，不存档

**依据**：13 条门禁**全是散文、0 脚本强制**（不限制能力）；问题是 0 可达 + 0 拉动力。
**逐条差集**（穷尽 40 条）：**9 条三处均无** —— #1 审查对象三选一 / #3「模式≠场景」澄清 / #13 L1-L2 数量约束 / #18「无来源 AI 输出 = 0」量化门 / #30 Slop 四列扫描表 / #31 Slop ≥3 阈值 / #33 模式 2 产出格式 / #34 模式 3 产出格式 / #40 workflow-state 豁免；另 5 条扫描表结构（#4/#6/#9/#12/#20）三处均无。

**动作**：把这 9+5 条**补进 `references/ai-native-taste-anchors.md`**（design-brief Phase 4 真读的那份，`design-brief/SKILL.md:87` Phase-gated 挂载）。壳保留、不存档、不改可达性。
**反向补漏**：anchors 有 3 条 taste-review 未收录（`:73-76` >30% 元素不合格整页返工 / `:130-131` 超 3 步无法简化须记录理由 / `:187-188` 对照 tokens 第 2 节重做）——一并对齐。
**验收（可证伪，替换 v1 的同义反复）**：取一份**已生成的原型**，迁移前后各跑一次品味检查，比对是否仍能产出「8 锚点结论 + 10 项 Slop 扫描 + Slop 总数与阈值判定」。

### D · design-review → 唯一可壳存档（迁走一段之后）

**依据**：知识 50.8% 中几乎全是别处真值源的副本（节名真值源 `design-brief/SKILL.md:697-714`、组件映射来源 `:532`、品牌色 `design-system-contract.md`）。
**唯一独有**：`:130-135` 的三方去重边界声明（含「**据此路由，不因判据同批而混用**」——v1 的「选一处当真值源」正是这句禁的）。

**动作**：
1. 先把 `:130-135` 整段迁到 `references/design-system-contract.md`（三方共同的上游真值源），三处改指针
2. 再照 `references/ux-evaluation-framework.md:3` 既有范式给 SKILL.md 加存档声明
3. **必须同改**（R1 查出，否则登记面把它当活 skill）：`codex-viability.yaml`、`model-routing.yaml:61-62` guided-execution roster、`self-model.generated.yaml`（重生成）、`daily_governance.py:165-172` 的 frontmatter 一致性检查
4. **不移到 `references/`**——R1 实测：移动 skill 目录会让 `validate-skills.sh` 红（verify.sh S5）+ `build-self-model --check` DRIFT

### E · handoff-review → 绝不存档，给拉动力

**依据（R1 BLOCKER，已独立验证）**：
- `iteration` 是 workflow-state 中**唯一由单个 skill 独占写入、且被 hook 消费**的字段（`handoff-review/SKILL.md:280-281` 唯一写者，`session-restore.mjs:52-54` 唯一读者，`CLAUDE.md:383` 启动协议依赖）。存档 = 连续失败告警**永久沉默**。
- oracle/taste 分类表（`:215-229`，10 行）全仓唯一。
- `auto-revise-once` 被 `promoted-facts.yaml SC-20260615-002`（**stable:true，reviewer: luca**）称为 luca_gstack「HARNESS 非 Loop」定位下的「**唯一正向例外**」，并写明「再遇『给 gstack 加 automation/loop/worktree』提案，直接引用此判定」。**存档 = 让该 stable fact 的实例化载体消失。**
- `model-routing.yaml:75` fable P0 白名单唯一的设计链条目。

**v1 的解耦方案已撤回**（R1 证伪）：AND 门不存在（Phase 0 多选 + 场景 B 自动隐藏节 3 + 单节 BLOCKED「跳过此节继续」）；且 `requirements-check` 挂 tech-spec 开场会让 AND 可得率**不降反升**（它 5/5 检查项要原型，而 tech-spec 输入契约无原型）。

**动作**（按 v2 判据：补必要条件 + 补充分条件）：
1. **补可达性**（判据 1）：`skill-routing-map.yaml` 加条目（窄触发词，避开 `评审`/`审查` 泛词）+ `.claude/commands/handoff-review.md`
2. **补拉动力**（判据 2，关键）：在 `optional-workflow-graph.yaml` 的 `execution_to_acceptance` gate 增一条 `block_if`——交付验收前需 handoff-review 结论，`allow_standalone_override: true`（**只作提示不当门**，遵 luca 8-03 裁决）
3. 修复 `design-review/SKILL.md:277` 的悬空指针（写成 `/handoff-review` 斜杠命令但文件不存在）

---

## 四、明确不做（含 v1 已撤回项）

- **不给 auto/ux-audit 加触发词**——它们可达性已满格，判据 2 才是死因
- **不整批存档三个 review skill**（v1 批 2 撤回，三条动机全为假）
- **不换「使用即留任」数据源**（v1 批 3.8 撤回）：R1 实测 reference 引用数**无区分度**（handoff-review=5 / taste-review=4，而活着的 muse-req-triage=4 / research-kit=3 / code-recon=1）；`check:registration` 跑在 CI runner 而产出数据在仓库外；隐藏层结构上进不了它的枚举循环
- **不新建可达性检查器**
- **不删任何磁盘资产**
- **不动 P1 `allowed-tools`**（luca 未批）
- **不承诺「下一轮按同判据处理 design-brief B 系列 + html-prototype D 系列 50+ 条」**（v1 该承诺会把伪 blame 判据工业化）
- **本轮不动 ux-writing / insight-synthesis**（13–14 天，未到评判期）

---

## 五、验证

1. **B1 计分函数变异测试**：构造「零材料」输入，验证三个 module 都输出 `EVIDENCE-INSUFFICIENT` 而非高分；改坏 `EVIDENCE-INSUFFICIENT` 逻辑，验证测试转红
2. **B2 workflow-state 安全性**：构造损坏 yaml，验证写入块**报错退出**而非用 `{}` 覆写
3. **B3 门复活检测**：改完后 grep 全部 6 处编辑面，确认无残留「截图是强制输入」；真跑一次无截图仅给 HTML 路径的 ux-audit，验证 Module B 能跑完
4. **C 差集验收（可证伪）**：取一份已生成原型，迁移前后各跑品味检查，比对 8 锚点 + 10 项 Slop + 阈值判定是否仍完整
5. **A 降级后门禁全绿**：`verify.sh`（基线 70 PASS/0 FAIL/1 WARN）+ `check-routing-map` + `check-registration-sync`（21→20）+ `test-route-guard`（基线 68/68）+ `validate-skills.sh`
6. **E 拉动力验证**：确认新增 `block_if` 在 standalone 下只提示不阻断
7. **跨面一致性**：`AGENTS.md:603-604` 隐藏名单与 `CLAUDE.md:274` 同步（R1 查出现有漂移无 checker 覆盖）

---

## 六、R2 红队重点攻击面（我主动标出）

1. **判据 2 是否又是同义反复**？「是 gate 的源」会不会只是「在链条前段」的另一种说法——用 task-plan（末端却有 gate、有产出）证伪或坐实
2. **A 撤 auto 一级入口会不会误伤**：`ROUTE_GUARD_HEAVY_SKILLS` 去掉 auto 后，PLAN_CHECK 分支是否还有其他依赖；SSOT-10 的 HITL_ANCHOR 删除是否留下孤儿断言
3. **B1 的 `EVIDENCE-INSUFFICIENT` 会不会成为新的逃生舱**：模型是否会滥用它来回避判定
4. **E 补 `block_if` 是否违背 luca「只作提示不当门」的裁决**：`allow_standalone_override: true` 够不够
5. **C 迁 9 条进 anchors 会不会撑爆 design-brief Phase 4 的 context**：anchors 已 657 行

<!-- FILE_END: 2026-08-03-capability-reachability-plan-v2.md -->

---

## 追记（2026-08-03 晚）：三条「明确不做」的反转记录

独立评审指出本节三条承诺其后被反转且未声明——补记如下（反转本身合法：luca 晚间新指令
「这三个 skill 有价值、价值要被命中、给深度方案」优先于本 plan 的自我约束；未声明是错的）：

1. **「不新建可达性检查器」→ 新建了 `check-skill-scene-coverage.py`**。与被撤销的 v1 批 3 的
   实质区别：数据源不是被证伪的「reference 引用数」（死引用撑高、无区分度），而是产出文件
   存在性 + 场景计数；且遵守 R1-D 的 CI 教训（数据模式仅本地，selftest 才进 CI）。
2. **「不换使用即留任数据源」→ 换成了产出文件 + 场景计数**。v1 被否的方案是「挂
   check:registration + reference 引用数」，两个否决理由（CI 拿不到仓外数据 / 引用数无区分度）
   在新方案中均不复现。
3. **「本轮不动 ux-writing / insight-synthesis」→ 动了（补低频声明 + 挂载）**。当时理由是
   「未到评判期」（防误判）；luca 明确指示保护 + 命中后，改动方向从「处置」变为「保护与挂载」，
   与原承诺要防的风险（把太新的 skill 判死）方向相反，不冲突。

教训（同 FW3-059 族）：推翻既有裁决必须当场留痕，否则下一个读 plan 的人会把反转当违规。
