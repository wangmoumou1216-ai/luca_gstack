# 设计流程前段轻量化（frontlight）：从计划到落地的整体评估

评估人：Claude（红队 + 专家会审 + 交接指定的 Claude 整体验证）。日期：2026-10-19。
评估对象：origin/main `5d95451`（含 `cda4d56`、`081b1b0`、`5422065`），两个 Codex session 全部对话，
计划全部修订（§1–7 原方案、§8 R1、预算 22→10→2、R2、R2 delta1；本次已入库
`framework-audit/plans/2026-10-15-design-workflow-frontlight-plan.md`），Codex 留存的实验证据
（Codex worktree `framework-audit/design-workflow-frontlight/`，私有材料未入库），以及
`framework-audit/design-workflow-frontlight/CLAUDE-VALIDATION-HANDOFF.md` 指定的 Claude 验证项。

证据规则：写"成立"的都附工具输出或文件位置；没被运行验证的标 UNKNOWN。三层分开判定：
**源码正确 / 完整 skill 执行 / 实际效果**。本报告初稿经一次冷启动独立红队（PASS_WITH_FIXES，
1 BLOCKER + 4 MAJOR），下文已全部吸收。

---

## 0. 结论

**源码层基本到位；Claude 端执行层本次补测了 3 个 skill 的关键分支（由主会话或 subagent 按 SKILL.md 全文
执行，未经 slash/Skill 工具的发现与调用），行为与合同一致并暴露多处合同缺口（已修 4 处）；效果层仍未证明，
你最在意的"用了这些 skill 比只用 brief 更好"没有任何一组实验测到。**

- **源码**：focused 路径、竞品分析方法、按缺口选节点、局部回退都已写入；核心检查独立复跑全绿；双端同源。
- **执行（本次新增）**：Claude 端按 SKILL.md 全文执行了 deepresearch focused 全流程（研究者+独立审查；
  handoff 结构校验 exit 0）、ux-brainstorm focused 到真人取舍门、design-brief 到真人门。brainstorm、ux-research
  未原生跑；legacy deep/full 未回归运行；Codex 端仍沿用其 426/502 失败记录（UNKNOWN）。
- **效果**：唯一实验的 B、C 都是"原始需求直达 design-brief"，只比较了 Brief 规则新旧版本；四个前段
  skill 均未进入效果对照。两份原型都没全过关键任务。
- **体验**：focused 档位是 opt-in、默认 deep/full；但"成熟需求直达 Brief"已是 A/B/D 场景的默认推荐
  路径（C 保留 ux-audit）。实际是否变轻没有原生运行证据。常驻 SKILL.md 文本 +7.1%。

---

## 1. 计划 → 落地对账

| # | 要求（来源） | 状态 | 证据 |
|---|---|---|---|
| R-1 | 捋清全部节点职责（原始） | 成立 | 计划 §2；`plan-design-guidance.md` §Select design work by the unresolved gap |
| R-2 | 轻量化四个前段 skill（原始） | 源码成立 / 体验未证 | focused 写入四 skill；`input-modes.yaml` research_depth default deep、discovery_mode default full |
| R-3 | GitHub 等渠道对比（原始） | 成立 | 计划 §3 四组锁版本源码 |
| R-4 | 解决后必须更好（原始） | 未证明 | §3 |
| R-5 | 双向钢人+专家会审（原始） | 计划层成立；实现层部分 | 计划三轮会审；R2 源码第二轮 PASS，合并裁决 FAIL 15/16（双端 UNKNOWN） |
| R-6 | 研究为何没转化成更好设计（R1 核心） | 诊断未完成 | 无 A/C0；唯一案例为成熟需求 |
| R-7 | 用了这些 skill 比只用 brief 更好（成功标准） | 零覆盖 | B、C 均 direct-Brief（`two-attempt-evaluation.md` Scope 段） |
| R-8 | 每个 skill 可独立使用 | 源码成立；V2/V4 以 standalone 原生运行通过入口 | input-modes standalone 最小输入未加前置 |
| R-9 | ux-research 竞品分析，轻量独立、转化到下游 | 源码成立 / 执行未验证 | `ux-research/references/competitor-analysis.md`；消费点 `ux-brainstorm/SKILL.md:185,477`、`design-brief/references/input-contract.md:50` |
| R-10 | 每多一个 skill 都要带来值得的改变——明确并验证 | 明确了；未验证 | guidance"进入前说清缺口、无增量如实报告" |
| R-11 | 别太死：按缺口串联、局部回退 | 源码成立 | guidance 两节；graph 场景 A/B/D 首行新增 `[design-brief, design-output]`，**C 仍以 ux-audit 开头**；R3 指针 `routing-chain-check.md:78-80` |
| R-12 | 改完验证完 → 提交推送拉回 | 提交推送成立；"验证完"不成立 | `081b1b0`、`5422065` 在 origin/main |
| R-13 | 额度 22→10→2、研究预算维持 8 | 遵守 | 计划 Budget Amendment 2 |

U-001 部分；U-002 源码完成（本次另修 4 处）；U-003 未完成（1 例 B/C）；U-004 未采用（正确地没切默认）。

---

## 2. 三层判定

### 2.1 源码正确 —— 基本成立

独立复跑（main 本地检出，本次修改后）：

```
[0] test-design-workflow-frontlight.mjs --mutation  27/27; mutation_failures=0; STATIC_ONLY_NOT_NATIVE
[0] test_focused_handoff.py OK · test-handoff-validator.mjs PASS · test_measure_native.py OK
[0] test-design-workflow-contract.mjs 240/240 · test-design-tool-routing.mjs PASS（not live host parity）
[0] build-agent-context.py check PASS · check-agent-contracts 144/144 · capability/agents parity PASS
```

双端同源：`.agents/skills/*` 是指向 `.claude/skills/office/*` 的符号链接；`.codex/agents/quality-gate.toml:16`
要求完整读取 `quality-gate.md`。测试性质：字面短语 tripwire（脚本第 2 行自述），mutation 替换的正是
regex 匹配的句子，只能抓"句子被删"，不能证明语义正确。

### 2.2 完整 skill 执行 —— Claude 端本次补测

| 运行 | 入口 | 结果 | 证据 |
|---|---|---|---|
| V1 deepresearch focused（2 个决策问题） | 主会话编排：1 名原生研究者 → 主会话证据评估 → 1 名独立 Socratic 审查者 → 报告 + handoff | **全流程完成**。8/8 预算含失败计数；6 条发现含反证；审查 PASS_WITH_REVISIONS 已吸收；handoff `gate_result` 为编排方自评 5/5，真实 validator `--handoff` 与 `--require-gate PASS` 结构校验均 exit 0 | 本机 scratchpad `v1/`（研究方式由调度方选定，不是用户批准的产品研究；产出未写 `docs/`，因 NO_PIN 不得触碰项目别名） |
| V2 ux-brainstorm focused（非 AI，继承决定 + 1 个真实取舍） | 原生 subagent 按 SKILL.md 全文执行 | **停在 Phase 4.2 真人取舍门**（正确）。未派固定扫描 agent、未凑第 3 方案、AI 范式判 not_suitable、无 Agent/信任表；继承决定未重问；产出 4 步走读 + 失败/过期恢复分支；Oracle 在 4.2 之后，未到达 | scratchpad `v2/` |
| V4 design-brief（原始需求，非 AI，含未采纳研究建议） | 原生 subagent 按 SKILL.md 全文执行 | **停在真人门 HG-1**（正确）。MUST-1..3 全链追到 Packet 无丢失；未采纳建议登记为 DEFERRED、非 MUST；已确认决定填有源 N/A 未编造否决；**新 F-1 句使"已带入摘要"失效语义未定被识别并阻断冻结** | scratchpad `v4/` |

未运行：brainstorm、ux-research；legacy deep/full 回归；Codex 端（沿用 426/502）。交接第 2 步中 stale review
hash、缺恢复路径的阻断未演练（仅有静态 validator 夹具）；第 4 步按宿主分列 discovery/execution/refusal 未做，
Claude 端 discovery（slash/Skill 工具调用）未测。V2/V4 中 subagent 无法向真人提问，停在门口是预期行为，不代表 skill 完成。

此前 Codex 真实 focused 研究的"方法门 FAIL"需更正归因：判 FAIL 的理由之一是"未用 Context7"，但该要求位于
legacy Step 0.3（`deepresearch/SKILL.md:221`），而 `SKILL.md:189` 明确 focused "instead of the legacy
Step 0.3–Phase 4 procedure"。即审查方套用了已被 focused 替代的规则——是合同对审查方表达不清，不全是执行者违规。

### 2.3 实际效果 —— 未证明

| 门 | 结果 |
|---|---|
| 全 MUST/关键任务通过 | NOT_MET：B 的 T4/T7/T9、C 的 T4/T7 未全过（两位评审 FAIL/PARTIAL 用词不同，原证据警告不可比） |
| C 不差于 B（四例） | UNKNOWN：仅 1 例 |
| 研究增量（C vs C0） | NOT_RUN |
| 成本 ≥50% 节省 | UNKNOWN：已完成阶段 token B 6.70M / C 6.42M（−4.1%），活动时间 C +16.5%，端到端不可比 |
| 你的偏好 | B（截图更正后）。**B、C 都是直达 Brief，此偏好不能支持"直达优于研究链"**，最多是对新 Brief 规则的一个 n=1 弱反例 |

本实验唯一可下结论的变量是 **Brief 规则版本**。

---

## 3. 结构性问题：核心问题没被测到

```
B = 原始需求 → design-brief(旧规则) → HTML
C = 原始需求 → design-brief(新规则) → HTML   （新链判定成熟需求、无需研究，走直达分支）
```

C 走直达是计划内分支（计划 §1、§5）。研究链的效果本应由 A（旧完整链）和高不确定 holdout 测，未测到的直接
原因是额度降到 2、A 中途停止（计划 Budget Amendment 2）。结论不变：**R1 的核心诊断没有实证，仍是开放问题。**
补测时案例入选必须满足：会实际走进研究节点（有会改变决定的未知事实或交互取舍），否则不入选。

---

## 4. 发现清单

| ID | 严重度 | 发现 | 处置 |
|---|---|---|---|
| F-1 | 高 | 两份原型共有的唯一实测缺陷（B 另有独有的 T9 焦点遮挡）：补入摘要后全选改写，仍提示"摘要已带入"。归因未定（原证据："cannot uniquely attribute the defect to research, Brief or generator"）；但两份 Packet 都没写明这一状态转移，Brief 的 12 状态表也没有"标记随后续写入失效"的要求 | **已补规格**：`design-brief/SKILL.md` Phase 3 一句通用要求（用户或系统的后续写入、晚到数据或撤销 → 写明失效触发、失效后呈现与 AC）+ tripwire F11 与 mutation（旧字节 FAIL、新字节 PASS）。V4 中该句被引用并使 Brief 识别、阻断冻结（构造案例，无旧版字节对照，不能证明旧规则必漏）。**生成层效果未验证**（无重新生成额度） |
| F-2 | 高 | focused 档位 opt-in、默认 deep/full；直达 Brief 已是 A/B/D 默认推荐，但没有原生证据表明日常更轻 | **需你决定**（§7），不擅自改默认 |
| F-3 | 高 | 核心问题零覆盖；n=1、单次生成，无法区分规则效应与生成随机性 | 记入结论边界 |
| F-4 | 中 | 说明文本变长（`d0c33fa` → `5422065`）：常驻五个 SKILL.md 150,258 → 160,973 字节（+7.1%）；五个 skill 目录总量 402,569 → 448,082（+11.3%，含按需加载的 references）。frontmatter 成本元数据未同步（如 deepresearch `context-cost.self: 22149`，实际 26,330） | 后续精简项，需独立计划与回归 |
| F-5 | 中 | 计划 R1 之后各版从未进入任何分支；R1 版仅在 `refs/codex/snapshots/` 下的快照提交 `b72f753` | **已修**：计划与源 session 会审记录随本次提交入库（隐私通读后仅改本机绝对路径） |
| F-6 | 中 | 新增检查是字面 tripwire，26/26 不能当语义证据 | 记入边界；F11 同样标注 |
| F-7 | 中 | Codex 过程两次误报"完成"、偏好一度记反，靠用户追问纠正 | 复盘项 |
| F-8 | 中 | ux-brainstorm Phase 5.1 要求跑模板中的 16 项自检，但懒加载规则使模板到 Phase 6 才加载（基线即存在；frontlight 在该清单加了 focused 项后影响 focused） | **已修**：5.1 明确此时只读取模板 Finalization Checklist 段 |
| F-9 | 低 | ux-brainstorm 方案须"引用具体 Q 编号"，Phase 3 零问题时无可引 | **已修**：零问题时引用原始输入/已确认决定 |
| F-10 | 低 | design-brief SCHEMA 的 AI Slop 表自称"对照框架第 8 节"，实为 4 项视觉 slop + 6 项第 8 节（合并），且漏第 8 节"全屏 modal AI"（基线即存在） | **已修**：如实标注来源，第 8 节未单列项仍适用 |
| F-11 | 低 | 多处规则重复投影（input-modes notes、graph、guidance、SKILL.md），未来易漂移 | 随 F-4 收敛 |
| F-12 | 低 | V2/V4 记录的其余合同歧义：ux-brainstorm 声明模板未给 4.2 取舍问题留位、"单一可测指标"与"不虚构量化"张力、focused 有真实取舍时 Oracle 在用户选择之后；design-brief 12 节结构中"可追踪完整矩阵/Tool Consumption Contract"无模板、本地 HTML 冻结是否需真人批准不明、page-context 适用范围 | 登记待改；均需设计判断，非 frontlight 引入 |

已核实不是问题：双端漂移（同源）；竞品分析"只是多一份报告"（源码层写入既有 D3 与下游 owner）；独立使用被破坏；
额度/预算遵守。

---

## 5. 计划没考虑到的维度

| 维度 | 评估 |
|---|---|
| 评估有效性 | 缺"案例必须能激活被测机制"的前置门 |
| 说明文本即成本 | 只算运行 token，没算规则变长的常驻成本；常驻应按"SKILL.md + 被路由到的 reference"实际加载计 |
| 直达 Brief 的上下文收益 | 直达减少上游文档读取，可能比 focused 档位省得更多（计划 §1 已把上下文噪声列为假设），未测 |
| 默认值即产品 | opt-in 能力长期不切默认＝对日常体验无影响，计划没把它列为风险 |
| 状态转移覆盖 | quality-gate 已改为核"触发、转换、反馈、输入保留与恢复"（`081b1b0`），Brief 侧缺"状态/标记何时失效"的转换项（F-1 已补） |
| 改造本身的成本 | 仅 B/C 两臂已观测阶段约 1,310 万 token，产出 1 对 HTML；缺改造预算与止损点 |
| 收尾判定 | 完成判定多次依赖用户追问；计划单元全量对账（本报告 §1）应是收尾硬步骤 |
| 推广监测 | "首 5 次观察"没有落地位置；切默认时必须同时落地 |
| 路由误判（该研究时跳过研究） | 结构防线在：`optional-workflow-graph.yaml:24`"复杂且新颖任务，研究阶段是默认步骤，非可选"保留；guidance 明确直达路径不绕过该确认门；focused 零问题分支仍要独立审查查漏。但运行层只观测过按成熟输入预设走直达分支、未做研究的案例（Codex C，非路由器自主判定），**从未在一个确实需要研究的案例上测过路由是否会误跳**——UNKNOWN，补测案例应同时覆盖这一点 |
| 用户认知负担 | 选项变多：research_depth {focused, moderate, deep} × discovery_mode {focused, full} × 场景 A–D × 按缺口规则；focused 需每次显式说出。降负的是"按缺口选节点"只增加"进入前一句话说清缺口"，不加问卷。但仓库里此前**没有一份面向使用者的用法说明**（Codex 写的 usage-guide-r4.1 只在快照 ref） → 本次已导入为 `framework-audit/design-workflow-frontlight/usage-guide.md`（核对与当前 guidance 一致）。是否真的更易用仍无用户证据 |

---

## 6. 双向钢人

**为"改造成功"辩护：** 规则层把"按缺口投入、成熟需求直达 Brief、研究说清改变了哪个决定、局部回退"写进唯一
owner，不破坏旧模式、独立入口和人工门；不切默认是遵守你批准的采用门；额度降到 2 后诚实标 UNKNOWN 是对的。
本次 Claude 端按 SKILL.md 全文执行也显示三个 skill 的关键分支按合同运行。
**反驳：** 方向正确≠价值兑现。你要的"体验轻 + 设计更好"在日常里都还没被证明，常驻文本反而 +7.1%。

**为"改造失败"辩护：** 核心问题零覆盖、效果零证明、两份原型都没过关键任务。
**反驳：** 有可复用的真实增量：按缺口选节点与直达 Brief 已成为 A/B/D 默认推荐；竞品分析有唯一 owner 与下游
规则；实验暴露的状态转移缺口已补到 Brief 规格，且 V4（构造案例、无旧版对照）中它让 Brief 停下来问而不是让生成器猜。

**裁决：** "规则层完成、执行层局部验证、价值层未兑现"。不能叫完成，也不能叫失败。

---

## 7. 本次修复与待决

**已修（均为可逆的文本改动，已过回归）：**
1. F-1：`design-brief/SKILL.md` Phase 3 状态失效触发句 + `scripts/test-design-workflow-frontlight.mjs` F11 与 mutation。
2. F-5：计划与会审记录入库 `framework-audit/plans/`；本报告入库。
3. F-8/F-9：`ux-brainstorm/SKILL.md` 两处一句话澄清。
4. F-10：`design-brief/SCHEMA.md` Slop 表来源如实标注。
5. 用法说明入库：`framework-audit/design-workflow-frontlight/usage-guide.md`（§5 认知负担）。

**后续项：** F-4/F-11 文本精简（独立计划）；F-12 合同歧义；核心问题补测（需会走进研究节点的高不确定案例 + 生成额度）；
brainstorm、ux-research、legacy 档位的原生运行；Codex 端原生验证。

**需要你决定：** F-2——是否让某些条件下默认走 focused / 直达 Brief。现有证据只有 1 例且不区分直达与研究链，弱于
原采用门。

---

## 8. 能说和不能说

**能说：** 源码写好了、静态检查过了、双端同源；Claude 端按 SKILL.md 全文执行时 deepresearch focused 全流程跑通、
ux-brainstorm 与 design-brief 的关键分支按合同停在真人门；竞品分析与按缺口串联在源码里成立；成熟需求直达 Brief 已是
A/B/D 默认推荐；Brief 补充了状态失效的规格要求，在一个构造案例中被引用并阻断冻结，生成层效果未验证。

**不能说：** 体验变轻了、设计变好了、研究有用了、省了 50%、比只用 brief 好、偏好 B 证明直达更好、四个 skill 在两端都完整跑通。
