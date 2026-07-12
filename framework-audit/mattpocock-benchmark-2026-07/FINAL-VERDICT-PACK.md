# FINAL-VERDICT-PACK — mattpocock/skills 对标裁决包

> GATE-2 交付物 · 2026-07-12
> 对方 commit `391a2701`（2026-07-10）· 分母 51 单元（39 skill + 12 机制）
> 覆盖断言 `check-coverage.py --assert all` = **PASS**（ids/complete/evidence/absence/redteam/reconciliation/hash 七项全绿）
> 方法链：P0 冻结清单 → P1 映射矩阵+rubric（GATE-1 批准）→ P2 并行采证（39 agent，引文全 grep 回验）→ P2.5 单 judge 串行打分（分数红队前预注册）→ P3 对抗红队（23 个 APPROVE 级中 22 个有完整前向红队块，第 23 个 git-guardrails 的击杀块经复审官核出缺失后按证据重建 + 7 反向）→ fable 出门前复审（SHIP-WITH-FIXES，4 修正项全部落实）→ 本包
> 采纳雄心（rubric §3.5，2026-07-12 用户强化）已贯彻：capability_type 逐项标注 + 高 D merge 的"为什么不是 replace"回检 + 反向红队查错杀

---

## 0. 一页总览

| 桶 | 数量 | 说明 |
|---|---|---|
| **adopt（新增采纳）** | 6 | 4 全局 install + 1 框架资产 port + 1 待你 replace-or-port 二选一 |
| **merge（补强合并）** | 15 | 全部 port-pattern 加法，红队后 scope 已收紧 |
| **leave（不动）** | 30 | 每项一段式理由在 verdict；其中 **2 项反向红队判 revive**（升提案，见 §4） |
| **replace（替换）** | 0 常规 + **1 个真替换候选在案**（diagnosing-bugs vs 已装 systematic-debugging，你二选一） |

红队战绩：**2 killed（prototype + git-guardrails）+ 12 downgraded（收 scope）+ 14 stands + 2 revive**——不是橡皮图章。（git-guardrails 的击杀块曾因执行 agent 限额阵亡而物理缺失、致本包初版误把它当活 merge 呈现——fable 出门前复审官捕获，已修：verdict 块已按其留下的击杀理由+prove-it-bites 交叉佐证重建，标明"重建非独立复攻"。）

**Top-5 收获（按杠杆排序）**：① skill-authoring 框架资产（对方最高含金量元词汇，六机制汇一处落地）② 工程线三 skill install（codebase-design/resolving-merge-conflicts + tdd 刷新）③ task-plan 竖切三判准 + 宽面重构通道 ④ diagnosing-bugs vs systematic-debugging 的替换/移植裁决 ⑤ 两条反向红队复活提案（轻量研究 skill + 登记面同步 checker）。

---

## 1. 诚实披露（先读这节）

1. **锚 A 两次重校准**：grilling 预注册 D=8 → judge 依 dossier 证据下调 5 → 红队再砍"抽 primitive"项（无真实第二消费者=过早抽象）落定 **D=3，仅剩 facts/decisions 一行显式化**。桶始终 merge 未翻。全程留痕于 verdict。
2. **P2 采证的系统性盲区被红队捕获**：diagnosing-bugs 原判"空缺口 adopt-93"，红队实地查出 **systematic-debugging 已装**（obra/superpowers，vetting 90 已批，routing weight-7 已接线，~65% 重叠）——P2 只做机制级 grep、漏查 skill 级 counterpart。已针对全部 6 个 adopt 补做尽调：4 个无已装同类 ✓ + A1 有相邻已装 skill-creator（已核互补，见下条）+ A5 本就是对既有安装的刷新。**教训将写回 external-skill-scout 的核验协议**（P6）。
3. **writing-great-skills 有已装相邻物 skill-creator**：核验后互补不冗余（skill-creator=建 skill 的流程+eval 环；writing-great-skills=什么算好 skill 的 doctrine；元词汇 grep 0 重叠）。采纳后你将拥有三条腿：流程（skill-creator）/边界（skill-invariants）/手艺（skill-authoring）。
4. **过程扰动**：红队分三批完成（两次撞用量限额）；前 2 个（to-tickets/wayfinder）由 fable 完成，其余 26 个按你指令走 opus，反向 7 个 opus。评分=主线程单 judge（防漂移设计），采证与红队=独立 subagent。
5. **0 常规 replace 是证据结论不是保守**：高 D merge 逐个做过"为什么不是 replace"回检（§3），每个都指得出现任真赢的承重轴；唯一支配关系可能成立的（diagnosing-bugs vs systematic-debugging）已按 §3.5 原样呈给你二选一。

---

## 2. Adopt 桶（6 项）

| # | 单元 | capability_type | 分 | 红队 | 落地 | 你需要拍的板 |
|---|---|---|---|---|---|---|
| A1 | **writing-great-skills**（+A2 metavocab 共用落地） | **framework** | D=7 | downgraded（砍 invariants 头部改动，改走 CLAUDE.md 可选行） | port→新建 `.claude/skill-os/skill-authoring.md`：Predictability 根德性 + 六 failure mode 诊断表 + 信息层级三阶梯 + 修剪纪律 + dual-load 成本模型 + leading-word 技法 + `_Avoid_` 装置 + 搭车四条（anti-cargo-cult/defining-constraint/组合优于重复/自造词取舍）。1 次 whole-file A/B，双仓 | 附带 **GAP-skill-authoring-craft** 提案（先裁 gap） |
| A3 | **codebase-design** | **skill**（+词汇 primitive） | 门禁 83 | downgraded（删"接口设计"设计邻词触发，防劫持设计管线） | install 全局 + routing 词条（纯工程词），MIT 署名 | 它是 4 个落地项的词汇地基（deletion-test/seam 系全靠它）；**消费者归零则不装**（红队锁的联动条件） |
| A4 | **resolving-merge-conflicts** | **skill** | 门禁 73 | downgraded（去"never --abort"绝对化——与 sync-upstream.sh 逃生口冲突，已记 reconciliation） | install 全局 + routing 词条 | 双仓 merge 摩擦（sync-upstream）是真实复发场景 |
| A5 | **tdd（刷新既有安装）** | **skill** | D=2 | downgraded | 全局刷新到 391a2701（收 seam 确认门 + tautological 反模式） | ⚠️ **刷新会删掉** deep-modules.md + interface-design.md 两份真实内容——**保留副本还是放弃，须你拍板**（红队 refresh_caveat） |
| A6 | **diagnosing-bugs** | **skill 或 replace** | 门禁 93*（含已失效的"空缺口"成分） | **downgraded→GATE-2 裁决**（verdict 原文为 replace/port 二选一；本包按扩大你主权方向补了"不动"为第三项） | 见下 | **三选一**：(a) **replace**——整体换掉已装 systematic-debugging，须过支配测试+其独有行为（反向追栈/find-polluter.sh/防御纵深等 6 项）逐条 ported/written-off 你签字；(b) **port**——只把 4 个真缺席机制（3-5 排序可证伪假设/[DEBUG-]打标/seam 诚实度/HITL 脚本）搬进 systematic-debugging，强制 A/B；(c) 不动。两条落地路径都先做 routing 词表去重（现触发词全撞车） |

## 3. Merge 桶（15 项，红队后 scope）+ 高 D"为什么不是 replace"回检

按落地簇分组（同簇=同一次 FUSION）：

**簇 B · skill-authoring 资产**（与 A1 同落地，A/B 计 1 次）
| 单元 | ct | D | 红队 | 内容 |
|---|---|---|---|---|
| mech:invocation-cost-model | framework | 4 | stands | dual-load 成本模型 + granularity 切分原则一节 |
| mech:leading-word | framework | 4 | stands | leitwort 技法 + 预训练词优先 + 我方现存 leitwort 盘点 |
| mech:avoid-alias-table | framework | 3 | downgraded（砍 CONTEXT.md 骨架扩张与命名锁迁移，只留资产一节） | `_Avoid_` 收敛装置一节 |
| mech:writing-great-skills-metavocab | framework | 6 | stands | 与 A1 同落地 |

**簇 C · code-hygiene 增强**（1 文件 1 A/B，A/B 须含护栏场景——红队交接约束）
| 单元 | ct | D | 红队 | 内容 |
|---|---|---|---|---|
| skill:code-review | skill | 5 | stands | 双轴（Standards/Spec）并发审查分派 + Fowler 具名 smell 基线（护栏优先关系不动） |
| mech:prove-it-bites | framework | 3 | stands | Iron Law 增"护栏/检查类改动必须证明会咬"条款（fail-open 兼容措辞——红队约束） |

**簇 D-G · 设计-工程管线四补强**（各 1 文件）
| 单元 | ct | D | 红队 | 内容 | A/B |
|---|---|---|---|---|---|
| skill:to-tickets → task-plan | skill | 7 | stands | 竖切三判准 + 宽面重构 expand-contract 卡型（须写明来源节点豁免仅限该卡型）+ frontier 一行注记 | **2**（红队上调） |
| skill:wayfinder → plan-agent | framework | 6 | stands | fog-of-war 概念层（destination/fog 节/frontier）+ 毕业判准；不引 tracker/单票上限/name-not-ID | 1（落地补 CLAUDE.md 指针+parity 锚——红队指出） |
| skill:to-spec → tech-spec | skill | 4 | downgraded（砍 prototype-snippet；确认门条件化：交互才 Ask，headless 写清单不阻塞） | spec-time seam 前置步（明确不复制 tdd 的 test-time 门） | 1 |
| skill:grilling → brainstorm | skill | 3（锚 A 终值） | downgraded（砍抽 primitive） | facts/decisions 分离提为逼问环居中显式规则（一行） | 1 |

**簇 H · muse-req-triage（fork 专属，不双仓）**
| 单元 | ct | D | 红队 | 内容 |
|---|---|---|---|---|
| skill:triage | skill+scene | 6 | stands（②检索域已更正接 schema 既有槽位；③drift-brief 已砍） | verify-before-grill 前置门（归入"可回溯性检查"类目）+ 去重面扩到已实现（接 compared_against=shipped_product_behavior 槽位） |
| mech:out-of-scope-registry | skill | 4 | stands | TRIAGE_REJECT 落被拒需求台账 + 概念对照 surface 旧决定 + anti-poisoning 写入门 |

**簇 I-M · 其余四项**
| 单元 | ct | D | 红队 | 内容 | A/B |
|---|---|---|---|---|---|
| skill:domain-modeling | framework+scene | 3（红队修正，双重计分-1/无据 bite-1） | downgraded | CLAUDE.md 写入时机增术语 inline 条 + brainstorm Oracle 术语持久化一行 + decisions.md 三条件提议门（绑激活项目 CONTEXT 词汇节、守 Stop 纪律） | **3**（红队上调） |
| skill:handoff | framework | 3→2 复核后守 3* | downgraded（砍 argument-tailoring；suggested-skills 限描述性） | handoff-protocol.md 增脱敏一行 + 描述性 suggested-skills 节（P4 只增合规）；touched_files 补 CLAUDE.md checkpoint 面 | 1 |
| skill:improve-codebase-architecture | skill | 4→~3 | downgraded（砍 HTML 报告——形态差异+已有能力） | code-recon 增 deletion-test 深化透镜（依赖 A3） | 1 |
| mech:changelog-rationale-archive | framework | 3 | downgraded（砍手工 commit-hash 挂链——三重冗余） | CHANGELOG 头部约定：生命周期变更记"变更+为什么"一行 | 0（文档豁免） |

**已被红队击杀出 merge 桶的第 2 项（复审官修正）——git-guardrails → careful**：红队裁定
killed（原 merge）：剥掉反目标项（裸 push 拦截 vs 你的 autocommit 授权）与重复项（自测行归
prove-it-bites 落地）后，唯一独立机制（模式表扩展 clean -f/branch -D/checkout .）不足 §3
≥2 机制硬门槛。**不落地**；模式表扩展记 opportunity——若你仍想要（微成本），在 GATE-2 点名
恢复即视为显式否决红队。

\* handoff 说明（复审官修正措辞）：红队后**有效 D=2，低于 §3 merge 阈值（≥3）**。judge 主张
例外维持 merge 的理由=redact 是 git-tracked 交接文档的真实泄露面 + suggested-skills 被收窄
未被删（机制仍在）；但这是**无引文支撑加分的例外主张**，数字上推不出 3。**默认按 §8.7 由你
拍板**：接受例外 merge（微成本两行）或按严格口径改 leave。

**高 D merge 的"为什么不是 replace"回检（§3.5 强制）**：
- **to-tickets(D7) vs task-plan**：task-plan 独有承重轴=Phase 7 覆盖率门禁（每 MUST→dev+test+断言，模糊即 FAIL）+ 渐进式索引 + 断言矩阵——对方无覆盖率概念。支配测试第 2 条即死。**merge 是证据结论。**
- **triage(D6) vs muse-req-triage**：现任独有=rule-based 真实信号打分（拒 RICE）+ 双入口 + ESCALATE 类目 + 宪法边界（机器不代裁）。**merge。**
- **wayfinder(D6) vs plan-agent**：现任独有=bash 可执行断言 + DEV/ASSERT 反向覆盖门 + U-ID 冻结。**merge。**
- **writing-great-skills(D7)**：无同位现任可替换（invariants 守边界职能保留），是**新增框架能力**非替换。
- **diagnosing-bugs**：唯一真替换候选，已按 §3.5 原样上桌（A6）。

## 4. 反向红队复活提案（2 项，你裁）

| 单元 | 反向红队结论 | 建议 | capability_type |
|---|---|---|---|
| **skill:research** | **revive**——leave 的"harness 已覆盖"前提被证伪：web spike 内联无纪律、bg Agent 是裸原语非研究 skill、deepresearch 重型且认识论相反（多源共识 vs primary 纯度）。轻量研究是高频真缺口 | 新增一个 right-sized **轻量研究 skill**（后台单 agent + primary-source 纪律 + 落盘约定），或 merge 进 deepresearch 轻档；scope S | **skill**（新增） |
| **mech:promoted-contract ①** | **revive（窄）**——judge"我方更强"系换轴自利（跨仓 parity 脚本 ≠ 同仓多登记面 checker，后者我方 4-5 面无守护）；且对方 resolving-merge-conflicts 漏登记 drift 是"咬过人"实证：连有明文契约的作者都漂移。与 setup 处置不对称（它有 gap 提案此处没有） | 升 **GAP-registration-sync 提案**：新增 `check-registration-sync.mjs` 已提交 checker（校验一级 skill 在 routing-map//office 表/input-modes/commands//workflow-graph/model-routing/parity 全登记面一致），接 verify 门。触面 S-M 零承重墙。机制②（文件夹桶）维持 leave | **framework** |

其余 5 个反向抽查（setup/loop-me/ask-matt/grill-with-docs/teach）均 **stands**——每个的 leave 前提都被逐条实地核验（与 diagnosing-bugs 假前提相反），证据在各 verdict。

## 5. 新 gap 提案（先裁 gap 再裁落地——gaps-register 人工拥有权）

| gap | 来源 | 你裁 |
|---|---|---|
| **GAP-skill-authoring-craft** | A1 簇（正面"怎么写好 skill"词汇/诊断体系缺位） | 开 → 簇 B 可落地；不开 → 簇 B 全部转 opportunity |
| **GAP-issue-tracker-integration** | setup/to-spec/to-tickets/triage/wayfinder 五单元的 tracker 簇聚合（是否引入可选 tracker 承载工作项层——框架级架构选择，与 docs/**+稳定ID 承重设计的关系须先裁） | 开 → tracker 簇下轮重入；不开 → 永久归档 |
| **GAP-registration-sync** | 反向红队复活（§4） | 开 → checker 进落地队列 |
| （非 gap）轻量研究 skill | 反向红队复活（§4） | 直接裁做/不做 |

## 6. 既有裁决对账（4 条，全部 append-only 回写 registry）

| 单元 | 旧裁决（2026-06-07） | 本轮结论 |
|---|---|---|
| tdd | APPROVED-90 | **维持**；"批而未装"假设被推翻（当天已装但 stale）；integration_note 与 routing 词条的漂移记录在案；刷新+删文件取舍待你拍板（A5） |
| handoff | REJECTED | **壳维持 REJECT**；"strictly a subset"措辞被事实推翻（3 项非子集元素），细化为 3→2 个微机制 port 进 handoff-protocol |
| grill-me | REJECTED | **维持**（复核后仍拒）；旧文两处事实偏差已记录（把 grilling 实质算在壳上/撞词对象挂错），不影响结论 |
| git-guardrails | REJECTED | **壳维持 REJECT 且加固**（政策事实基础反转使裸 push 拦截成反目标）；原拟 port 进 careful 的 2 微机制经红队 killed 全部不落地（①单机制破门槛②归 prove-it-bites）——REJECT 全面维持 |

## 7. 成本标价单 + 首批建议（WIP ≤3）

| 批 | 内容 | 触面 | A/B | 双仓 | 风险 |
|---|---|---|---|---|---|
| **①installs**（推荐首批） | A3+A4 install + A5 tdd 刷新（含你的删文件取舍）+ routing 词条 + FM-11 实测 | 仓内仅 routing-map | 0 | 词条双仓 | 最低（零 prose）。A3 的"消费者归零则不装"联动条件**批内自足**：同批 A5 tdd 刷新带来的 seam 门即为 codebase-design 词汇的第一个真实消费者 |
| **②skill-authoring**（推荐首批） | A1+簇 B（6 机制一文件） | 新文件+CLAUDE.md 行+parity 锚 | 1 | ✓ | 低（纯新增，需 gap①先开） |
| **③code-hygiene**（推荐首批） | 簇 C（双轴+Fowler+会咬条款） | 1 skill 文件 | 1（含护栏场景） | ✓ | 低-中 |
| ④task-plan | 竖切+宽面卡型 | 1 文件 | 2 | ✓ | 中（须处理来源节点豁免措辞） |
| ⑤plan-agent fog | wayfinder 概念层 | 3-4 文件 | 1 | ✓ | 中（plan-agent 是准承重文件） |
| ⑥tech-spec seam / ⑦brainstorm 一行 / ⑧handoff 微补 / ⑨changelog | 各微量 | 各 1 文件（⑧另触 CLAUDE.md checkpoint 面——此为包层补全的盲点项，超出 verdict 原 touched_files，触 session 注入面须留意） | 1/1/1/0 | ✓ | 低（⑧因注入面记低-中） |
| ⑩muse-triage 簇 | triage+out-of-scope | 2 文件 | 1 | fork only | 低 |
| ⑪domain-modeling 三点 | CLAUDE.md+Oracle+decisions 门 | 3 文件 | 3 | ✓ | 中（触 CLAUDE.md 注入面） |
| ⑫code-recon 透镜 | deletion-test | 1 文件 | 1 | ✓ | 低（依赖①中 A3） |
| （单列）diagnosing-bugs | 你三选一后另立 FUSION | 视选项 | port 必 A/B | ✓ | replace 走支配测试全套 |

**首批推荐 = ①+②+③**：① 零风险立即拿到三个工程 skill；② 本轮最高杠杆框架能力；③ 工程线单文件。其余排 adoption 队列分批（每周期 ≤3，禁多候选合一 worktree）。

## 8. GATE-2 需要你逐项拍板的清单

1. 三桶整体批准/逐项否决（§2/§3 表）
2. **diagnosing-bugs 三选一**：replace / port / 不动（A6）
3. **tdd 刷新的删文件取舍**：保留 deep-modules+interface-design 副本 / 放弃（A5）
4. **4 个 gap/新增提案**：skill-authoring / issue-tracker / registration-sync / 轻量研究 skill（§5）
5. **teach 个人安装**：装（全局零框架触面）/ 不装
6. **首批勾选**（建议①②③，可改）
7. handoff 的 D 临界复核：接受 merge（judge 结论）/ 改 leave（红队严格口径）
