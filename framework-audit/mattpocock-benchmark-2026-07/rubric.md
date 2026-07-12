# rubric.md — 对标评估标尺（GATE-1 冻结）

> 本文件在 GATE-1 由用户批准后冻结。P2.5 打分、P3 红队、P4 裁决全部以此为唯一标尺。

## 0. 透镜（本次比 2026-06-07 窄透镜宽在哪）

**旧透镜（vetting-registry 2026-06-07）**：「luca_gstack 是一个 CRM 产品设计管线 OS，
外来 skill 的 fit = 对 CRM 设计流程的贡献」。后果：工程/测试类 skill 的 fit 被系统性压低
（tdd 的 caveat 原话"useful for the rare code-writing detours, not the core design flow"），
`grill-me`/`handoff` 因与设计管线内已有环节冗余被拒。

**本次透镜（2026-07-11，用户拍板"工程+设计全量深评"）**：
「luca_gstack 是一个**通用产品设计工程框架**——设计管线是主干，但它同样自建并维护 hooks/
scripts/记忆/skill-os 等**工程资产**，且下游项目会跨入真实代码实现（tech-spec/task-plan/
code-hygiene/code-recon 已是既有工程线）。外来单元的 fit = 对**设计主干 或 工程执行线 或
框架自身建造**任一维度的贡献。」

**透镜移动的可判定后果（打分时据此，不得含糊）**：
- 工程纪律类（调试/TDD/竖切工单/代码审查）的 fit **不再因"非设计核心"被压低**——框架自建
  hooks/scripts 就是代码工作，下游实现就是代码工作。
- "与设计管线某环节冗余"**不自动等于**"与框架冗余"——需检查是否与**工程线**或**框架建造**
  互补（这正是 grill-me/handoff 翻案的判据来源）。
- 但"更宽"≠"更松"：承重墙保护、propose-only、双仓一致、skill-invariants 一字不松。
  透镜宽的是**评估视角**，不是**落地门槛**。

## 1. 三条评估轨（按 tier 分流）

| tier | 适用 | 用哪套 rubric | 可能落桶 |
|---|---|---|---|
| **A** | 有现任 counterpart 的 skill + 全部机制单元 | §2 头对头 D/I/C/E + §3 三桶判据 | 不动 / 补强合并 / 替换 |
| **B** | 无 counterpart 的 skill（新候选） | external-skill-scout 7 维门禁原样（3 硬门 + 4 软分 fit30/quality30/adoption20/maintenance20，加权 ≥70 APPROVED / ≥45 CONDITIONAL） | 新增采纳 / 不动 |
| **C** | deprecated / personal / author-env-bound / draft-stub | 只过 3 硬门（safety/compatibility/non_redundancy）+ 一段式裁决；deprecated 须答"matt 弃用理由对我方教训" | 不动（默认）/ 升 B（若意外高价值）|

**tier 不是价值判断**：diagnosing-bugs 高价值但 Tier B（无现任→7 维门禁才是对的工具，无 I 维可比）；
thin-shell（grill-me/implement）Tier A 但 dossier 只答"薄壳入口是否额外增值"，深度在其 primitive。

## 2. 头对头 rubric（Tier A：skill 有 counterpart + 机制单元）

| 维度 | 定义 | 量化规则 |
|---|---|---|
| **D 净增量** 0-10 | 对方单元中我方 counterpart **不具备**的机制部分 | 逐机制计数，每 1 分挂 **1 组双侧引文**（对方 path:line + 我方 path:line 或缺席证明）；对方有"咬过人"的实证（CHANGELOG 记录/复现实例）该机制 +1；纯 aspirational prose（in-progress draft）该单元 D 封顶 3 |
| **I 现任强度** 0-10 | 我方 counterpart 的确立度（机读） | routing-map 有 invoke 行(+2) / hooks·observability 有接线(+2) / 受 P1-P7 约束(+2) / adoption-log 或使用史(+2) / 有回归测试或 checker(+2)，满 10 |
| **C 集成成本** S/M/L | 落地触面 | fusion-preflight 影响文件数 S≤2 / M≤6 / L>6；**触碰承重墙自动 HIGH-INTEGRATION-RISK**（无论文件数） |
| **E 证据质量** 0-3 | 对方主张的实证度 | CHANGELOG 演进记录(+1) / .out-of-scope 有拒绝理由(+1) / 非 in-progress 且非 deprecated(+1) |

**证据铁律（可复核性核心，机器强制）**：任何计分维度得分而无双侧引文 = 该 verdict 无效，
check-coverage.py 判死。`our_counterpart: none` 行的 D 计分必须挂 `absence_proof`（grep pattern
+ 0 命中记录）——**缺席也是证据**，防"不读己方即评"。

## 3. 三桶判据（不对称性内建在结构里，不靠调分数）

- **不动**：D < 3，**或**红队 killed，**或** Tier C 默认。
- **补强合并**（= FUSION 既有词汇 `port-pattern`；把对方机制搬进我方现任）：
  D ≥ 3 且 ≥2 条独立引证机制，且**融合后现任全部既有行为保留**（由 FUSION 步⑥ 行为 A/B
  非回归背书）。净正即可。
- **替换**（门槛结构性更高，全部满足才成立）：
  1. D ≥ 7；
  2. **支配测试**：现任 SKILL.md 职责段枚举的**每一条**承重轴上，对方 ≥ 现任——不存在
     "现任赢且该轴重要"的轴（逐轴表格）；
  3. 现任独有行为逐条标 `ported`（搬进对方）或 `written-off`（放弃），written-off 项 GATE-2
     由用户**逐条签字**；
  4. 红队 steelman-incumbent 后 verdict = `stands`；
  5. 现任路由场景 A/B **无回归**。
- **新增采纳**（Tier B，无 counterpart）：7 维门禁加权 ≥70 APPROVED / 45-69 CONDITIONAL / <45 不动。

> 合并只要**净正**，替换要 **Pareto 支配 + 红队存活 + 回归证明**。不对称在判据结构里，不靠抬分数线。

## 3.5 采纳雄心（admissibility，2026-07-12 用户强化）

> **lucagstack 的合法产出不止「补强合并」。** 只要**覆盖产品设计开发主线、且高价值高置信**，
> 以下四类都是被鼓励的、正当的裁决结果，评估**不得因"怕动现有结构"而保守回避**：
> 1. **新增框架能力**（framework）——skill-os / hooks / 记忆 / 治理机制层的新增（如 skill-authoring 资产）
> 2. **新增场景能力**（scene）——A=新功能 / B=已有优化 / C=线上评审 / D=Agent化 之内的新能力，或提议新场景
> 3. **新增 skill**（skill）——install 或 port 一个我方没有的能力（如 diagnosing-bugs / codebase-design）
> 4. **替换老 skill**（replace）——用对方能力整体取代我方某 skill

**判据不变，姿态校正：** 结构化门槛（替换的 Pareto 支配 + 红队存活 + 回归证明；新增的
7 维门禁 ≥70；机制层的 gap 提案）是用来**保证"高置信"这半个条件**的——它们让"我确信这值得动"
可证，**不是**用来把结果往"leave/merge 更安全"方向压。判据满足 → 该 replace 就 replace、该
新增就新增，不打折。

**因此每个 APPROVE 级 verdict 在 P4 额外标注 `capability_type`：** framework / scene / skill / replace
（一个 verdict 可多标，如 diagnosing-bugs = skill+scene〔工程执行线场景〕）。

**替换的诚实回检（P4 强制）：** 对每个高 D（≥6）的 merge verdict，显式回答一句「为什么不是
replace」——若答案只是"没敢动"而非"现任在某承重轴上真赢"，则该翻为 replace 候选交 GATE-2。
本轮若最终 0 replace，必须是"逐个查过支配测试、现任确有独有承重轴"的证据结论，不是默认保守。

## 4. 校准锚（主线程预评，P2.5 单 judge 以此对齐；防评分漂移）

三个锚在 GATE-1 冻结，作为 P2.5 打分的参照标尺。锚本身也走 P2 完整 dossier 复核（若复核推翻锚，
回 GATE 重校准）。

### 锚 A — 清晰采纳（高 D，Tier A 机制）：`skill:productivity/grilling` 的 facts/decisions 分离
- D = **8**：对方 grilling 明令"facts 去 codebase 查、decisions 必须交人等回答"+ confirmation gate
  「未确认共识前不执行计划」（grilling/SKILL.md）；CHANGELOG 记录这条分离是为防止别的 skill 让
  grilling agent 自问自答（**咬过人的实证** +1）。我方 brainstorm 有逼问环但**未显式抽出 facts/
  decisions 分离**，也无"被 5 skill 复用的 primitive"抽象（brainstorm/SKILL.md 逼问内嵌在流程里）。
  双侧引文齐备。
- I = 6（brainstorm 有 routing-map invoke + P1-P7 约束 + 使用史，但无独立 primitive 接线）。
- C = M（触 brainstorm + 可能新建 grilling 共享 ref，≤6 文件）。E = 3（promoted + CHANGELOG）。
- **桶 = 补强合并**（把 facts/decisions 分离 + confirmation gate 显式化进 brainstorm；不替换 brainstorm）。
- 标尺含义：**D≥7 但不满足支配测试全部 5 条 → 仍是补强不是替换**。这是最常见的正确落点。

### 锚 B — 清晰不动（D≈0，Tier A thin-shell + 已拒）：`skill:productivity/grill-me`
- D = **1**：grill-me 正文仅 1 句「Run a /grilling session」，是 grilling 的无代码库薄壳。其**唯一**
  净增量 = "user-invoked 无触发词的纯人工入口"这一形态（grill-me/SKILL.md）；我方 brainstorm 直接
  斜杠调用已覆盖同等能力（brainstorm 路由词条）。grilling 的价值已在锚 A 单独计。
- I = 8（brainstorm 现任极强）。桶 = **不动**。reconciliation：2026-06 REJECTED（redundant with
  brainstorm）**在新透镜下仍成立**——薄壳形态对工程线/框架建造无额外贡献，透镜移动不改判。
- 标尺含义：**薄壳的净增量归其 primitive，壳本身 D→0；旧拒决在新透镜下"复核后仍拒"也是合法对账**（不是所有翻案都翻）。

### 锚 C — 边界（reconciliation 真两难）：`skill:productivity/handoff`
- D = **待 P2 定（预估 3-4）**：对方 handoff 有两点我方 handoff-protocol 未显式：① handoff（分叉给
  另一 agent）vs `/compact`（同会话续接）的**显式区分**；② 写 OS temp 目录而非 workspace（不落库）。
  但我方 Checkpoint/handoff-protocol + session-restore 自动加载 + PROGRESS 已覆盖"跨 session 状态
  传递"的**主体**。净增量是否 ≥3 取决于 P2 核验①②是否真为我方所无。
- I = 9（handoff-protocol 受 P4 保护 + session-restore 接线 + 使用史）。
- reconciliation：2026-06 REJECTED（redundant）。**新透镜可能松动**：若①②对"框架自建的多 agent
  交接"有贡献（不止设计管线），可能从"不动"升"补强"。**这正是边界该由 P2 双侧证据+红队定，不在 P1 预判**。
- 标尺含义：**边界项诚实标"待 P2 定"，不在打分前假装确定**；reconciliation 讲"新透镜下什么变了"，
  不重复旧论证。

## 5. 与既有机制的接口（不另造）

- Tier B 的 7 维门禁 = `external-skill-scout` 既有定义，分数格式对齐 `vetting-registry.yaml`。
- 替换/采纳的红队 = `framework-evolution-scout` 三问（steel-man 现任 / 攻击 fit 假设 / 集成成本）。
- 落地 = `FUSION-RUNBOOK` 九步；机制层 prose 吸收**强制行为 A/B**（无 A/B 一律 BLOCK）。
- 机制单元若无对应 open gap → P4 **提案新 gap**，GATE-2 用户先裁 gap（不绕过 gaps-register 人工拥有权）。

<!-- FILE_END: rubric.md -->
