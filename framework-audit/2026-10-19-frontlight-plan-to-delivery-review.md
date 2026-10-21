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

**源码层基本到位；执行层本次补测了全部 5 个 skill 的关键分支（Claude 端由主会话或 subagent 按 SKILL.md 全文
执行，未经 slash/Skill 工具调用）+ legacy 默认与研究档位回归 + Codex 端全部 5 个 skill 的 `$skill` 调用，行为与合同一致（V6 有一处自报的读取偏离，见 §2.2），
并暴露多处合同缺口（已修 8 处）；效果层只补测了 1 个高不确定案例：新链没有胜过直达 Brief，且前段约贵 5 倍（§3.1）；
研究本身有没有用（C 组）和"比旧链省 50%"（A 组）仍未测。**

- **源码**：focused 路径、竞品分析方法、按缺口选节点、局部回退都已写入；核心检查独立复跑全绿；双端同源。
- **执行（本次新增）**：Claude 端 deepresearch focused 全流程（研究者+独立审查；handoff 结构校验 exit 0）；
  ux-brainstorm、brainstorm、ux-research、design-brief 的 focused 分支均按合同停在真人门；ux-brainstorm 不指定模式时
  正确走 full（真实派发 A/B/C 扫描，未漏入 focused 放宽）；deepresearch/ux-research 未给深度时先问深度、显式 moderate 时
  legacy 阈值完整；Codex 端 5 个 skill 均能发现并按同一合同停在相同位置。
  除 deepresearch 外均未走到 Oracle/handoff（停在真人门是预期）。
- **效果**：Codex 原实验的 B、C 都是"原始需求直达 design-brief"，只比较了 Brief 规则新旧版本，两份原型都没全过关键任务；
  本次补测 meeting-assistant（高不确定）：新链 C0 与直达 B 同为 7/1/0/0，C0 前段 token 约为 B 的 5.2 倍、耗时约 14 倍。
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
| R-7 | 用了这些 skill 比只用 brief 更好（成功标准） | 1 例补测：**未显示更好**，同为 7/1/0/0，新链前段约 5 倍 token（§3.1）；原 Codex 的 B/C 实验仍是 direct-Brief 对比 | `two-attempt-evaluation.md` Scope 段；§3.1 |
| R-8 | 每个 skill 可独立使用 | 源码成立；V1–V6 全部以 standalone 运行通过入口 | input-modes standalone 最小输入未加前置 |
| R-9 | ux-research 竞品分析，轻量独立、转化到下游 | 源码成立；V5 验证到研究规划门（读竞品方法、共享 8 项预算、只交付研究），研究执行与下游转化未跑 | `ux-research/references/competitor-analysis.md`；消费点 `ux-brainstorm/SKILL.md:185,477`、`design-brief/references/input-contract.md:50` |
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

### 2.2 完整 skill 执行 —— 本次补测

| 运行 | 入口 | 结果 | 证据 |
|---|---|---|---|
| V1 deepresearch focused（2 个决策问题） | 主会话编排：1 名原生研究者 → 主会话证据评估 → 1 名独立 Socratic 审查者 → 报告 + handoff | **全流程完成**。8/8 预算含失败计数；6 条发现含反证；审查 PASS_WITH_REVISIONS 已吸收；handoff `gate_result` 为编排方自评 5/5，真实 validator `--handoff` 与 `--require-gate PASS` 结构校验均 exit 0 | 本机 scratchpad `v1/`（研究方式由调度方选定，不是用户批准的产品研究；产出未写 `docs/`，因 NO_PIN 不得触碰项目别名） |
| V2 ux-brainstorm focused（非 AI，继承决定 + 1 个真实取舍） | 原生 subagent 按 SKILL.md 全文执行 | **停在 Phase 4.2 真人取舍门**（正确）。未派固定扫描 agent、未凑第 3 方案、AI 范式判 not_suitable、无 Agent/信任表；继承决定未重问；产出 4 步走读 + 失败/过期恢复分支；Oracle 在 4.2 之后，未到达 | scratchpad `v2/` |
| V4 design-brief（原始需求，非 AI，含未采纳研究建议） | 原生 subagent 按 SKILL.md 全文执行 | **停在真人门 HG-1**（正确）。MUST-1..3 全链追到 Packet 无丢失；未采纳建议登记为 DEFERRED、非 MUST；已确认决定填有源 N/A 未编造否决；**新 F-1 句使"已带入摘要"失效语义未定被识别并阻断冻结** | scratchpad `v4/` |
| V3 brainstorm focused（新功能，方向全部已确认） | 原生 subagent | **停在 Phase 3 第 1 问**（一方事实缺口）。未派 A/B/C；未为已确认方向编造备选/否决/投票；new 标签未推回 full；AI 判 not_suitable；已答的窄切入点未重问 | scratchpad `v3/` |
| V5 ux-research focused（竞品分析：批量操作撤销） | 原生 subagent | **停在 Phase 0 研究规划门**，0/8 预算未动。规划前完整读取竞品方法；1 名研究者、2 个决策问题、整次共享 8 项（明确不按竞品分配）；无固定 5+1 维度、无 AI 维度；写明只交付研究、不自动进入下游 | scratchpad `v5/` |
| V6 ux-brainstorm **默认模式**（AI 相关新功能，未指定模式） | 原生 subagent | **正确选 full**（`SKILL.md:78,190`），真实串行派发 A/B/C 三个扫描 agent（3/3 返回），按 Deep-feature 路由 6 个 UX 逼问，计划恰好 3 个方案与 AI Native 方向；**无 focused 放宽漏入**。停在 Phase 3 Q1 真人门；自报偏离：K3 触发后 plan-agent.md 未读到 EOF | scratchpad `v6/` |
| Codex `$ux-brainstorm` focused（与 V2 同输入） | `codex exec -s read-only`（codex-cli 0.163.0） | **发现与执行成功**（websocket 426 后自动降级完成；skill 正文由模型用 shell 全文读取，exec 日志看不到宿主注入）。未派扫描 agent、无 AI 范式、未重问 CSV/异步、两方向 4 步走读 + 恢复规则，停在 Phase 4.2 同一真人问题。差异：规模判 Lightweight（Claude 判 Standard） | 本机 scratchpad `codex-probe.log` |

| V7 legacy 研究档位回归（deepresearch / ux-research × 未给深度 / 显式 moderate，4 例） | 原生 subagent，未联网、未派发 | 未给深度时两者都**先问深度**（A Deep / B Moderate / C Focused），不默认选 focused（`deepresearch/SKILL.md:172`、`ux-research/SKILL.md:189`）；显式 moderate 时 legacy 阈值完整（2 轮、每角度/维度 ≥3、Socratic 只审争议、维度/角度数不降、3 个 Human Gate），技术话题附加角度仍适用；ux-research moderate 规划门呈现 D1–D6；**无 focused 放宽漏入** | scratchpad `v7/` |

| Codex 其余 4 个 skill（`$brainstorm` / `$ux-research` / `$deepresearch` / `$design-brief`，与 V3/V5/V1/V4 同输入，只读、禁联网） | `codex exec -s read-only`，串行 | 4 个均发现并执行成功（同上：skill 正文由模型用 shell 读取，日志看不到宿主注入）：brainstorm 未派 A/B/C、未编造备选，停在 Phase 3 Q1（需求证据）；ux-research 未派发、停在研究规划门、共享 8 项；deepresearch 停在 Phase 1 派发前（派发 0），未把待验证机制冒充"零问题"；design-brief 继承 3 条 MUST、未采纳建议不升需求，**依据 `SKILL.md:149` 的状态失效句停下追问"已带入摘要"提示如何变化——追问语义与 Claude V4 一致（停点阶段不同：Codex 在 Phase 0，V4 在 Phase 3/5）** | 本机 scratchpad `codex-{brainstorm,ux-research,deepresearch,design-brief}.log` |

宿主差异：brainstorm 在 Codex 按 `pressure-test.md:185` 直接问了 Standard 档的 Q1；Claude V3 把 Q1 改为条件追问（Q2 缺具体行为/成本时才问），理由是 focused 下 Q1 不属于"consequential"（V3 自报）。两种读法都能从 `pressure-test.md:177-178` 读出，根源是 F-12 已登记的"consequential 无定义"，不单是某一端的执行偏离。

仍未覆盖：交接第 2 步中 stale review hash、缺恢复路径的阻断未演练（仅有静态 validator 夹具）；Claude 端 slash/Skill 工具发现未测；
除 deepresearch focused 外各 skill 走完真人门之后的 Oracle/handoff 段（需真人回答才能继续）。
subagent 无法向真人提问，停在门口是预期行为，不代表 skill 完成。

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

### 3.1 补测结果：高不确定案例 meeting-assistant，新链（C0）对直达 Brief（B）

你授权补跑后，因你说 token 有限，只跑了最小对照（原计划约 11 个组，实际 2 个）：同一案例、同一冻结渲染合同、
同一盲评标准（渲染与盲评均未告知组别）。原始证据（两份盲评报告、验收标准、成本表）在
`framework-audit/design-workflow-frontlight/u003-claude-batch/`。

| | C0：新链，不检索（brainstorm focused → ux-brainstorm focused → design-brief，候选规则 a1d3078） | B：原始需求直接进旧 design-brief（d0c33fa） |
|---|---|---|
| 关键任务 T1–T8 | 7 通过 / 1 部分 / 0 失败 | 7 通过 / 1 部分 / 0 失败 |
| 不完整项 | T5：检索失败后产品内没有用户可点的重试（只能靠演示控制恢复），评审判部分 | T8：桌面端展开依据后"主问题"卡被压成细条、文字重叠，手机端录音状态条随页面滚走，评审判部分 |
| 修订纠错（T4/Q2） | 通过，评审评"很强"（一次点击看更新版、上下文保留） | 通过 |
| 前段 token（Claude 子 agent 口径） | 657,644（197,140 + 248,234 + 212,270） | 127,221 |
| 前段耗时 | 约 62 分钟 | 约 4 分钟 |
| + 渲染 token | 130,436 | 95,704 |

**结论只能这样下：** 在这一个高不确定案例上，新链**没有**在预注册的关键任务上胜过直达 Brief：两边 T 项同为 7/1/0/0，
只是各缺一项；而新链前段 token 约为直达的 5.2 倍（含渲染 3.5 倍）、前段耗时约 14 倍。按计划自己的判定规则，
这是"B 质量不差于 C 且更便宜"的方向（计划 KILL-3），但**不能升级成采用结论**，因为只有 1 例，而计划的门槛是 4 例。

**这个结论的限度（不要读过头）：**
- 样本是每组 1 份生成物；B 的桌面端布局重叠更像渲染随机性，不能当作规则效应；两组由不同的评审实例打分。
- C0 的成本偏低估：嵌套的 Oracle 三轮评审 token 未必计入子 agent 口径（UNKNOWN）；B 没有独立评审。
- C0 的前段已经包含两处升级轮（超过默认两轮的第三轮 Oracle），属于该链的真实成本。
- **研究的增量没有测（C 组已停止）**：C0 关闭了检索。补做了 C 组的第 1 步（focused 研究，约 9.6 万 token）：8 项预算用完，**改变的设计决策为 0**，支持"修订要当作一等事件"这一条，但这是共同输入里已有的前提。第 2 步（brainstorm）独立 Oracle 两轮未过（第 2 轮 10/16，遗留一个由修复引入的置顶位矛盾），按上限未进入 Phase 6，PRD 不可交接。你选择停掉 C，之后的 ux-research、ux-brainstorm、design-brief、渲染、盲评都没有执行；停止时子 agent 已终止。因此"研究到底有没有用"仍是未回答的问题。
- A 组（旧完整链）按你对 token 的限制停掉了（已花约 11 万），所以"比旧链省 50%"仍是 UNKNOWN；可用的只有上面这对数据。
- 没有任何真实销售用户数据；设计偏好未征求你本人的盲选。

---

## 4. 发现清单

| ID | 严重度 | 发现 | 处置 |
|---|---|---|---|
| F-1 | 高 | 两份原型共有的唯一实测缺陷（B 另有独有的 T9 焦点遮挡）：补入摘要后全选改写，仍提示"摘要已带入"。归因未定（原证据："cannot uniquely attribute the defect to research, Brief or generator"）；但两份 Packet 都没写明这一状态转移，Brief 的 12 状态表也没有"标记随后续写入失效"的要求 | **已补规格**：`design-brief/SKILL.md` Phase 3 一句通用要求（用户或系统的后续写入、晚到数据或撤销 → 写明失效触发、失效后呈现与 AC）+ tripwire F11 与 mutation（旧字节 FAIL、新字节 PASS）。V4 中该句被引用并使 Brief 识别、阻断冻结（构造案例，无旧版字节对照，不能证明旧规则必漏）。**生成层效果未验证**（无重新生成额度） |
| F-2 | 高 | focused 档位 opt-in、默认 deep/full；直达 Brief 已是 A/B/D 默认推荐，但没有原生证据表明日常更轻 | **需你决定**（§7），不擅自改默认 |
| F-3 | 高 | 核心问题覆盖仍极窄：补测后只有 1 个高不确定案例的 C0/B 一对，每组 1 份生成，无法区分规则效应与生成随机性；研究增量（C 组）、旧链成本（A 组）未测 | 记入结论边界，见 §3.1 |
| F-4 | 中 | 说明文本变长（`d0c33fa` → `5422065`）：常驻五个 SKILL.md 150,258 → 160,973 字节（+7.1%）；五个 skill 目录总量 402,569 → 448,082（+11.3%，含按需加载的 references）。frontmatter 成本元数据未同步（如 deepresearch `context-cost.self: 22149`，实际 26,330） | 后续精简项，需独立计划与回归 |
| F-5 | 中 | 计划 R1 之后各版从未进入任何分支；R1 版仅在 `refs/codex/snapshots/` 下的快照提交 `b72f753` | **已修**：计划与源 session 会审记录随本次提交入库（隐私通读后仅改本机绝对路径） |
| F-6 | 中 | 新增检查是字面 tripwire，26/26 不能当语义证据 | 记入边界；F11 同样标注 |
| F-7 | 中 | Codex 过程两次误报"完成"、偏好一度记反，靠用户追问纠正 | 复盘项 |
| F-8 | 中 | ux-brainstorm Phase 5.1 要求跑模板中的 16 项自检，但懒加载规则使模板到 Phase 6 才加载（基线即存在；frontlight 在该清单加了 focused 项后影响 focused） | **已修**：5.1 明确此时只读取模板 Finalization Checklist 段 |
| F-9 | 低 | ux-brainstorm 方案须"引用具体 Q 编号"，Phase 3 零问题时无可引 | **已修**：零问题时引用原始输入/已确认决定 |
| F-10 | 低 | design-brief SCHEMA 的 AI Slop 表自称"对照框架第 8 节"，实为 4 项视觉 slop + 6 项第 8 节（合并），且漏第 8 节"全屏 modal AI"（基线即存在） | **已修**：如实标注来源，第 8 节未单列项仍适用 |
| F-11 | 低 | 多处规则重复投影（input-modes notes、graph、guidance、SKILL.md），未来易漂移 | 随 F-4 收敛 |
| F-13 | 中 | brainstorm `SKILL.md` 把 Approaches Considered 的 ≥2/≥3 写成无条件，focused 例外在 50 行后（V3） | **已修**：注明这些计数只适用 full，focused 按模板例外只写实际选项 |
| F-14 | 中 | ux-research 研究规划模板的深度只列 deep/moderate、提问固定"按以下 6 个维度"，选了 focused 的用户会看到与选择矛盾的规划（V5） | **已修**：深度加 focused，focused 改呈现决策问题、来源策略与预算 |
| F-15 | 低 | 竞品方法写"导航、等待、审查均计真实成本"，易被读成占 8 项预算（V5） | **已修**：记入真实成本报告，但不占 8 项 |
| F-16 | 中 | ux-brainstorm 与 pressure-test 中 3 处 focused 放宽没限定作用域（"也不强制三角色扫描""只在问题框架不足时提出 full""冷启动也可复用/已答不重复问"），默认 full 运行可能误用（V6） | **已修**：逐处限定为 focused，并注明 full 照常扫描/问完整题集 |
| F-17 | 低 | F-14 首版把"focused 改为…"括注写进了 D1–D6 提问原文，legacy 运行可能原样念给用户（V7 发现，本次自身引入） | **已修**：括注移到提问说明行，提问原文恢复 |
| F-12 | 低 | V2–V7 记录的其余合同歧义（V7 另记："deep 是默认"易被读成可不问；ux-research 的 headless 无深度兜底写在 focused 段且与 deepresearch 的 BLOCKED 不一致；反模式表"跳过 Round 3 = CRITICAL"与 moderate 字面冲突；ux-research 无 AI 轻量维度在 moderate 下的条数未写；V3/V5 另记：NO_PIN 下 standalone handoff 写入规则冲突、"consequential"无定义、介入点 3 的预先回答边界；V6 另记："已批准调度"未说明由谁批准）：ux-brainstorm 声明模板未给 4.2 取舍问题留位、"单一可测指标"与"不虚构量化"张力、focused 有真实取舍时 Oracle 在用户选择之后；design-brief 12 节结构中"可追踪完整矩阵/Tool Consumption Contract"无模板、本地 HTML 冻结是否需真人批准不明、page-context 适用范围 | 登记待改；均需设计判断，非 frontlight 引入 |

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
6. F-13～F-16：`brainstorm/SKILL.md`、`ux-research/SKILL.md`、`ux-research/references/competitor-analysis.md`、
   `ux-brainstorm/SKILL.md`、`ux-brainstorm/references/pressure-test.md` 的一句话澄清（作用域限定，不改行为设计）。
   现有回归不覆盖这几行，"已过回归"只说明没改坏别处，不说明这几处本身被测到。

**后续项：** F-4/F-11 文本精简（独立计划）；F-12 合同歧义；核心问题补测——已按你授权做了最小对照（C0 与 B，1 例），因你说 token 有限，A 组（旧完整链，约 150 万以上）已停、
C 组（加 focused 研究的新链）已由你决定停掉，另 3 个案例未跑；各 skill 走完真人门之后的
Oracle/handoff 段；交接第 2 步的 stale hash / 缺恢复阻断演练。

**需要你决定：** F-2——是否让某些条件下默认走 focused / 直达 Brief。现有证据只有 1 例且不区分直达与研究链，弱于
原采用门。

---

## 8. 能说和不能说

**能说：** 源码写好了、静态检查过了、双端同源；deepresearch focused 在 Claude 端全流程跑通；其余 4 个 skill 的 focused
分支在 Claude 端按合同停在真人门；ux-brainstorm 默认仍走 full、研究档位 legacy 阈值完整，没有被 focused 稀释；Codex 端
5 个 skill 都能发现并按同样合同执行；竞品分析与按缺口串联在源码里成立；成熟需求直达 Brief 已是 A/B/D 默认推荐；Brief 补充了状态失效的规格要求，
在一个构造案例中被引用并阻断冻结，生成层效果未验证。

**补测后能多说一条（限 1 个高不确定案例）：** 新链（不检索）在关键任务上没有胜过直达 Brief，且前段约贵 5 倍。

**不能说：** 体验变轻了、设计变好了、研究有用了（C 组未测）、省了 50%（A 组停掉）、比只用 brief 好（1 例上未显示）、
偏好 B 证明直达更好、五个 skill 在两端都完整跑通。直达 Brief 优于新链也只是 1 例的方向，不是采用结论。

---

## 9. 处理方案（2026-10-20，用户要求跳出现有流程框架后决定执行）

**判断依据（都来自本报告的实测）：**
- 原型的真问题全部是浏览器里按任务实操才发现的；上游文档的多轮独立评审（C0 两个 skill 合计约 44 万 token）全部通过，原型仍有缺陷。
- 上游研究与发散没有改变结果：focused 研究改变 0 个决定，新链与直达 Brief 关键任务打平、前段约 5 倍成本。
- 真正命中缺陷的是 Brief 在关键缺口处停下问人（状态失效规则）。

**结论：价值在「Brief → 原型 → 按任务实测 → 定点修」这个回路里，不在原型之前的文档链里。**

**已执行的框架改动：**
1. `optional-workflow-graph.yaml` 的 `research_default`：由「复杂且新颖 → 研究默认、非可选」改为「写得出会被外部证据推翻或确认的具名决定才研究」，不研究无需确认；附 evidence 指针。
2. 场景推荐路径：A/B/D 去掉完整网上研究链（deepresearch → brainstorm → ux-research → ux-brainstorm）及对应 HTML 兜底链；保留 A 的 brainstorm 短路径（仅当「做什么」未定）、D 的 ux-brainstorm 路径（Agent 分工/权限/接管未定时）、C 的 ux-audit 基线。
3. `routing-chain-check.md` R1、`plan-agent.md` 出门自检、`plan-design-guidance.md`（默认入口为 design-brief）与 README 同步为同一把尺子；`scripts/check-agent-context.mjs` 中对指南文件的哈希锁随之更新。
4. 未改动：deepresearch / ux-research / brainstorm / ux-brainstorm 仍可单独调用；insight-synthesis、research-kit、ux-audit、ux-writing、code-recon、所有出口工具、工程链保持原样（本次证据不覆盖它们）。
5. 「实测 → 定点修」写成明确步骤：`design-output` 共同流程规定回收验收由独立执行者在真实浏览器按 Brief 的
   Given/When/Then 逐条实操，未通过项只修这些项并复测，最多两轮，仍未过的列为剩余项交用户；指南「局部回退」同步
   为「最多两轮修复」。依据是 §9.1：一轮修复能修好目标项，但不同验收者会报出新项。
6. Brief 不需改：其 AC 已是逐条 Given/When/Then（`output-templates.md:139`、`SKILL.md:218`），可直接作为验收任务。
7. 有意保留：A/B/D 中「自带一手数据」的路径（insight-synthesis / research-kit 开头，后接 brainstorm 或 ux-brainstorm）
   与工程链（brainstorm → design-brief → tech-spec）。它们服务的是用户自己的一手定性数据（访谈、工单、回访）、
   还没有数据时先设计采集工具、以及工程交付。本次证据没有任何一手数据，只覆盖网上研究与无数据的发散，不足以外推删除。
   使用情况报告（`check-skill-scene-coverage.py`，只读）：ux-brainstorm ACTIVE（场景 2 / 产出 1）；insight-synthesis 不落盘、
   无法观测；research-kit 低频豁免；brainstorm、deepresearch、ux-research 代理口径未定，均不判。
8. 按用户纠正再收两处：(a) ux-writing 的 PRD 要求不需要先跑 brainstorm——用户的原始需求本身可作 PRD 输入，
   路径改为 ux-writing → design-brief；(b) B 场景一手数据路径里的 ux-research 查的是外部竞品、与用户数据无关，
   按本报告的研究门不应写成固定步骤，已移出，竞品先例仍按缺口表单步调用。

**核心流程（据此判断哪些 skill 不在核心里）：** 原始需求（可直接作 PRD）→ design-brief → 用户选的出口工具
（design-output 下的 OD / Claude Design，或 html-prototype / magicpath）→ 独立浏览器验收 → 定点修。
场景 C 前置 ux-audit，工程交付走工程链。**不在核心流程里**：deepresearch、ux-research、brainstorm、ux-brainstorm
（按需单独调用）。本次**没有删除任何 skill**：只有 ux-brainstorm 有实际使用记录，其余无法判定是否闲置，
删除需要人工裁决；它们已从默认和推荐路径中移出，保留单独调用入口。

**仍需验证：** 证据只有 2 个案例；「定点修一次能把原型修到全过」正在用 B 原型做一次验证（结果见 §9.1）。

### 9.1 「实测 → 定点修」回路验证（B 原型，1 轮）

- 输入：B 的原型与盲评报告（T8 部分：桌面展开依据后主问题卡被压扁重叠、手机录音状态条随页面滚走）。
- 修复：只改两行 CSS（布局选择器 `.main` 误伤了 class 为 `card main` 的卡片；手机顶栏改为吸顶），约 8.1 万 token、不到 2 分钟。
- 独立复测（新评审实例，盲评编号 hfix01）：**两处目标问题均确认修复**；T1–T7 回归全部通过；但 T8 仍判部分，理由是新发现的两处问题——每次点击整页重绘导致键盘焦点回到页面顶部、手机端"更多""重试"点击区偏小（20/24px）。第一次盲评没有报这两处。
- 结论：回路有效且便宜，修什么就能修好什么；**但不同评审实例看到的缺陷范围不同，一轮修复不能保证全过**，通常需要预留第二轮。T 仍为 7/1/0/0。

### 9.2 退役 html-prototype / magicpath 的执行记录（2026-10-20）

- 依据：用户“批准B，四点都同意，开始执行”，计划见 `framework-audit/plans/2026-10-20-retire-html-prototype-magicpath-plan.md`。
- 与批准内容的偏差（已征得用户同意）：计划写“不删目录”，但框架的墓碑机制要求已登记的 skill 不能再有目录（`check-agent-context` 报 `retired skill remains active`）。用户改选“删目录，完整退役”；回滚点为本地 tag `pre-retire-html-prototype-magicpath`（指向迁移提交 63ee211）。
- 先于退役完成的提交：Step 0（研究默认值与指引哈希，64a3e13）、共享资产迁移（63ee211：SCHEMA 与验收脚本搬到中性路径）。
- 独立评审（冷启动、串行、默认推翻）：契约评审首轮 FAIL（1 个 BLOCKER：`test-design-tool-routing.mjs` 有一条失效断言且不在任何 gate，所以全量 verify 假绿；M1 生成侧 slop 防火墙无人承接；M2 取消的能力未披露；M3 冻结 live-run 提案失效未登记）。均已修复并复核为 PASS_WITH_FIXES；运行时评审 PASS（路由、验收脚本、变异、生成物、残留引用、跨宿主均实跑）。
- 已知遗留（不阻塞）：`scripts/fixtures/agent-orchestration-cases.json` 仍含 12 个 html-prototype 用例（与计划哈希绑定，需新 plan 重冻）；`memory/evals/matt-adaptation/method-coverage.json` M09 的 owner 仍是 U008 html-prototype；`memory/evals/routing/fixtures.jsonl` 的 `sem-ux-novel` 仍是旧语义标签；验收脚本里 QA 模式名仍叫 `html-prototype`（只是模式标签）；`~/.codex/skills/magicpath`（用户级，未触碰）。
- 评审局限：评审者是 AI 代理，不是人类专家；两个评审员各自覆盖契约与运行时，没有第三方复核。

### 9.3 补充复核与收尾修复（2026-10-21，另一条 session 对已落地退役再做的冷启动评审）

- 范围：`64a3e13..a00878dc`（含当时工作区未提交改动）。契约评审与运行时评审各一个冷启动代理，串行、默认推翻；二者结论均为 APPROVE_WITH_FIXES，均无 BLOCKER。
- 契约评审的 MAJOR：`.claude/observability/rules.yaml` 的 R-20260616-001（作用于 open-design，active）仍写“非 magicpath/html-prototype(后者仅 daemon 真不可达)”，等于在 OD 流程里把已退役工具当出口。已改为“不换其他工具，OD/CD 之外没有第三个出口”；`test-design-output-retirement.mjs` 新增断言：任何 active 规则不得再出现这两个名字（对旧版规则文件实测会失败）。
- 运行时评审的 MINOR：`.claude/skills/magicpath` 是被 git 跟踪的悬空软链（指向已删的 `.agents/skills/magicpath`）。已删除，并在退役测试里加“三个入口目录不得有悬空软链”的断言。
- 其他小项：补回旧触发词“生成HTML”“本地原型”到 design-brief 路由；`html-prototype-tokens.md` 的陈旧措辞改为已退役说明；`promoted-facts.yaml` 的 SC-20260905-003 把“保留独立 HTML、MagicPath 的已授权用法”改为已退役。
- 有意不改：`external-skill-scout.js` 的“已有 skill”名单（退役名字留在名单里是为了不被重复推荐，与 figma-layer 先例一致）；`agent-orchestration-cases.json` 的 html-prototype 用例（与 plan 哈希绑定，见 §9.2）；记忆条目 SC-20260527-002/003 措辞偏旧但不诱导调用工具。
- 已知小缺口：`verify-prototype.mjs` 的 flag 只认 `--out-dir=DIR`，写成 `--out-dir DIR` 会抛 `EISDIR` 堆栈而不是用法提示。该脚本属不可进化保护项，未改。
- 评审局限：评审者仍是 AI 代理，不是人类专家。
