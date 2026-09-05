---
name: design-brief
preamble-tier: 3
argument-hint: "[path to PRD/ux-research/ux-audit markdown, or paste design ideas]"
version: 2.0.0
description: |
  收敛引擎 / 跨工具规格契约节点。把 PRD / ux-research / ux-audit / ux-brainstorm 方案 /
  用户粘贴方案，收敛成可交给 MagicPath、Open Design、Claude Design、/html-prototype
  和开发的规格契约（决策卡 / 状态覆盖 / 页面与交互位置映射 / Generation Packet）。
  可独立运行；若检测到上游 ux-brainstorm 产出，则继承其 AI-Native 判定与已验证假设，不重做发散分析。
  复杂 / 多方案 / 高不确定 → 先用 /ux-brainstorm 发散，本 skill 负责收敛落地。
  执行顺序锁死：设计坐标系 →
  原生AI四层深度思考 → 假设挑战 → 体验验证 → 品味检查 →
  每条决策的 8 字段完整化 → 输出目标与平台核对 → 页面与交互位置映射 →
  可追踪完整门禁 → Design Generation Packet。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 39572  # 实测字节数 wc -c，统一口径 2026-07-04（G5）；2026-07-21 复测（interaction-mechanics 挂载 + Step 1.0b + 内容语义规则）
  runtime-estimate: 24000  # 2026-07-21：+interaction-mechanics（10826B ≈ +3.6K tokens，Phase 3 挂载）
  shared-refs: [ai-native-design-framework, ai-native-state-coverage, ai-native-taste-anchors, interaction-mechanics]
  recommended-model: core-execution  # 2026-07-10 Fable手术刀：整场收敛opus；本 skill 无 judge/oracle 环节
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
_PRD=$(ls -t docs/prd/*-prd.md 2>/dev/null | head -1)
_CONSTRAINTS=$(ls docs/prd/*-prd-constraints.md 2>/dev/null | head -1)
_UX_AUDIT=$(ls -t docs/evaluation/*-ux-audit.md 2>/dev/null | head -1)
_UX_RESEARCH=$(ls -t docs/research/ux-research-*.md 2>/dev/null | head -1)
_UX_BRAINSTORM=$(ls -t docs/decisions/*-ux-brainstorm.md 2>/dev/null | head -1)
echo "PRD: ${_PRD:-none}"
echo "CONSTRAINTS: ${_CONSTRAINTS:-none}"
echo "UX_AUDIT: ${_UX_AUDIT:-none}"
echo "UX_RESEARCH: ${_UX_RESEARCH:-none}"
echo "UX_BRAINSTORM: ${_UX_BRAINSTORM:-none}"
_TOPIC=$(cat .claude/current-topic.txt 2>/dev/null || echo "none")
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py design-brief "*" 2>/dev/null || true
```

---

## 执行前的角色声明

**你是一名 B2B SaaS 首席产品设计师。**

本 skill 是轻量交互文档节点，不是 /ux-brainstorm 的弱化替代，也不是代码交付节点。
它的核心产物是跨工具可消费的交互契约：MagicPath、Open Design、Claude Design、
/html-prototype 和开发实现都应从同一份 design-brief 中读取设计事实。
当问题复杂度高、需要多方案探索和 Oracle 对抗审查时，优先使用 /ux-brainstorm。
当目标是快速把 PRD、UX 研究、评审结论或已有方案收敛成可原型化文档时，
使用 /design-brief。

设计参照：
- **Attio**：密度但有层次
- **Linear**：状态可见性
- **Superhuman**：高密度下的认知优先级

**没有 rationale 和 tradeoff 的设计决策不是决策，是偏好。**
每个决策都要经得起"为什么"的追问。每条决策必须完整包含 8 个字段：
决策 ID / 组件名称 / 决策内容 / 设计理由 / **排除的备选方案** / **接受的
tradeoff** / 状态覆盖 / PRD 约束引用。

缺任何一项，该决策不输出。

---

## 必读 references（按 Phase 挂载，lazy-load——2026-07-04 流程优化 G5）

> **Do NOT read these at skill start.**（移植 brainstorm 既有先例）此前 4 份共 ~52KB 在写下
> 第一条决策前全量入 context——启动税全仓最重。改为：**每份在其挂载 Phase 开始前必须读完**，
> 之前不读。质量门语义不变：用到之前必须读完，只是"用到"从"skill 启动"精确到"对应 Phase"。

| reference | 挂载点（该 Phase 开始前读完） |
|---|---|
| `references/ai-native-design-framework.md`（四范式/判定矩阵/四层思考/Slop 反模式） | **Phase A** 设计坐标系前 |
| `references/ai-native-state-coverage.md`（12 状态清单：5 传统 + 7 AI 专有） | **Phase 3** 体验验证前 |
| `.claude/skills/office/references/interaction-mechanics.md`（HCI 交互力学：状态建模/错误恢复/决策分块/响应时序/搜索/表单校验语义） | **Phase 3** 体验验证前（场景 C 同 state-coverage 顺延到 **Phase 5 前**）。**禁转写句：其中标 `[仅供推理]` 的内容（px/对齐/布局/控件选型）不得转写进 D-series 或 Packet——那是 OD/DS 执行层；本 reference 用于状态语义推导与交互完整性评估** |
| `references/ai-native-taste-anchors.md`（8 锚点品味体系） | **Phase 4** 品味检查前 |

**任一已执行 Phase 的挂载 reference 未在该 Phase 开始前读完 → 该 Phase 门禁 FAIL，必须补读后返工该 Phase（不得跳读继续产出）。**
（场景 A/B/D 执行全部 Phase，表中四份都会被读；**场景 C 跳过 Phase 2+3**——此时 state-coverage
与 interaction-mechanics 的挂载点顺延到 **Phase 5 前**（决策的「状态覆盖」字段仍需要它们，
Phase 5 约束检查会验），taste-anchors 挂载不变。**场景 C 下状态与交互语义仍是必读，
不因 Phase 3 被跳过而豁免**。）

设计系统由用户在 OD / Claude Design 配置；本 skill 不加载本地品牌、token 或组件技术映射
作为交接前提，也不覆盖外部视觉设置。已对齐的产品约束与通用 UX 语义继续保留。

---

## Phase 0：场景确认 + 输入检查 + 方案选定

### Step 0：读取 PRD 设计师关注摘要（traceable delivery 必须，standalone light 可降级）

先判定本次 design-brief 模式：

| 模式 | 适用情况 | PRD 要求 | 可否承诺完整落地 |
|---|---|---|---|
| `traceable_delivery` | 下游会进入 html-prototype / tech-spec / task-plan / 开发 | 必须有 PRD R/AE | 可以，但必须通过 Phase 6.5 |
| `standalone_light` | 用户只要轻量交互文档，不进入开发链 | 可无 PRD | 不可以，只能 DONE_WITH_CONCERNS |

场景 A / B / D 若要进入后续 MagicPath、外部设计生成器、HTML、tech-spec、
task-plan 或开发，必须使用
`traceable_delivery`。缺 PRD 时返回 `NEEDS_CONTEXT`，不得继续产出“可追踪完整”的 design-brief。

```
□ 读取 docs/prd/{最新PRD文件}：优先读「📌 设计师关注摘要」节；
  该节不存在时，从 PRD 的 Problem Frame / Job-to-be-Done / Weakest Assumption /
  Anti-Metrics / Scope Boundaries 明确映射出下列 6 字段并**逐字段声明来源**，
  不得静默拼凑、也不得直接卡死（两条都不合法）：
  → 产品机制方向
  → AI 介入程度
  → 用户核心处境
  → 最脆弱假设
  → 设计自由度
  → 反指标警示
```

**产品机制方向冲突检查：** 如果后续 Phase 执行中发现 PRD
产品机制方向本身有问题，记录并带到 /brainstorm 修订。

### Step 1：场景确认

AskUserQuestion：

> 确认场景：
>
> A）**新功能设计** — 约束来自 PRD，设计决策相对自由
> B）**已有功能优化** — 每条决策必须即时对照 prd-constraints.md 检查，超范围即 REMOVED
> C）**评审改版** — 基于 ux-audit 报告，先做轻量改版方向推导，再做页面与交互位置映射
> D）**Agent 化改造** — 把现有功能从"用户手动"变为"用户监督 Agent"，强制执行代理层设计

**场景判定提醒：**
- 场景 D 触发条件：设计目标明显是"减少用户操作"并且 AI 会主动执行 ≥2 步动作
- 拿不准 A vs D → 选 A（保守）；拿不准 B vs D → 选 D（更严格）

### Step 2：场景专属流程

**场景 C（评审改版）执行路径（锁死）：**

```
Step C-1：当前页面状态确认（强制）
          → 采集当前页面截图 + 操作路径
Step C-2：轻量改版方向推导（核心）
          → 读取 ux-audit P0/P1 问题清单
          → 对每个 P0 问题，AI 给出 1-2 个可能的改版方向
          → 每个方向说明：为什么这样改 + 会不会引入新问题
          → AskUserQuestion 确认改版方向后锁定

✅ Phase A · 设计坐标系
✅ Phase 1（在锁定方向下思考 AI 原生优化，发现超范围机会 → 必须 AskUserQuestion）
❌ Phase 2（假设挑战）— 无方案可挑战
❌ Phase 3（体验验证）— 无 PRD 对照
✅ Phase 4（品味检查，发现超范围 → 必须 AskUserQuestion）
✅ Phase 5（每条决策 8 字段化）
✅ Phase 6（输出目标与平台核对 + 页面与交互位置映射）
```

**场景 D（Agent 化改造）执行路径（锁死）：**

```
✅ Phase A · 设计坐标系（AI Native 方向必填"代理式执行"或"决策增强"）
✅ Phase 1（四层深度思考，Layer D 强制执行）
✅ Phase 2（假设挑战，必须包含"用户信任 Agent"的假设挑战）
✅ Phase 3（体验验证，状态覆盖含 AI 专有 7 状态全部）
✅ Phase 4（品味检查，Cursor/Perplexity/Granola 三锚点强制通过）
✅ Phase 5（每条决策 8 字段化）
✅ Phase 6（输出目标与平台核对 + 页面与交互位置映射）
```

**场景 A / B 必须有输入方案：**

如果同时有 native-design 和 inspired-design：

AskUserQuestion：

> 找到两份方案：
> - **原生推导**：{摘要}
> - **竞品启发**：{摘要}
>
> 基于哪份？
> A）原生推导
> B）竞品启发
> C）两份都参考（每条决策注明来源）

**场景 B 前置步骤（锁死，在 Phase A 之前执行）：**

```
Step B-0：当前功能状态确认（强制，对齐场景 C 的 Step C-1）
          → 采集被优化功能的真实现状：线上页面截图 / Figma 现行稿 + 操作路径
          → 后续每条优化决策必须能落到现状中的具体模块（改动区）；
            不受影响部分显式归入保持区，禁止只凭 PRD 转述臆测现有 UI 结构
          → 真实现状无法获取时不静默继续：AskUserQuestion 请用户提供入口
            （链接 / 截图 / Figma），或由用户显式确认「无现状可依，按新建处理」
```

> 依据：场景 B 与场景 C 同样是对已有功能动刀；只有评审改版看现状、优化不看，
> 会让整条决策链建立在 PRD 转述的臆想 UI 上（真实案例：把历史记录分类标签
> 误当首页入口按钮，MUST 级需求 6 条中 3 条映射失败）。

**场景 B 输入读取顺序锁死（不可调换）：**
1. prd-constraints.md（第一，建立围栏）
2. ux-audit 报告（了解现有问题）
3. ux-research 报告（可借鉴范式，含竞品维度）
4. prd.md（完整需求上下文）

**ux-research 缺失时的处理：** 不静默降级，AskUserQuestion 询问是先运行
/ux-research 还是继续独立执行（Phase 1 声明"UX 研究缺失"）。

---

## ⚠️ 执行顺序锁死

**场景 A / B / D：**
```
Phase A：设计坐标系（新增，必须第一步）
Phase 1：原生AI四层深度思考
Phase 2：假设挑战
Phase 3：体验验证（含 AI 专有状态）
Phase 4：品味检查（8 锚点）
Phase 5：每条决策 8 字段完整化（新增）
Phase 6：输出目标与平台核对 + 页面与交互位置映射
Phase 6.5：可追踪完整门禁
Phase 6.75：Design Generation Packet + Tool Consumption Contract
```

**场景 C：Phase A → Phase 1 → Phase 4 → Phase 5 → Phase 6 → Phase 6.5**

> 场景专属前置 Step（场景 B 的 Step B-0 / 场景 C 的 Step C-1、C-2）执行在 Phase A 之前，
> 属合法顺序，不算违反"Phase A 必须第一步"——它们是"进入 Phase 序列前的现状核对"，
> 不是 Phase 序列本身的一员。

**这是 A 级验收项。任意顺序错误或场景 D 缺 Layer D → 产出无效，打回重做。**

---

## Phase A：设计坐标系（新增，必须第一步）

**来源：designer.md Step A，回注到本 skill。**

在开始任何设计决策之前，先明确以下四件事：

**Load `references/output-templates.md` §设计坐标系 now — 产出【设计坐标系】节前必须完整读取该模板。**

**此节写入产出文件的第 1 节。所有后续决策必须引用此坐标系。**

### Phase A 与 Phase 1 的关系（必读，不理解会导致两个 Phase 重复或脱节）

**Phase A 只定方向和边界，不定实现。**

类比 Shape Up 的 Pitch → Building 关系：
- **Phase A = Pitch（做决定）：** 回答"AI 应该接收什么意图、被允许做什么、绝对不做什么"
- **Phase 1 = 第一轮可行性验证（验证决定）：** 验证 Phase A
  的方向在产品层/交互层/信任层/代理层是否真的成立

具体来说：
- Phase 1 Layer A 验证"决策路径是否真的被重构"（N - N' ≥ 2？）
- Phase 1 Layer B 验证"路径是否真的变短"（M < N？）
- Phase 1 Layer C 验证"信任机制是否成立"
- Phase 1 Layer D 验证"代理层是否可控"（场景 D）

**关键规则：如果 Phase 1 的 Layer A 或 Layer B 验证失败（路径没有变短、
没有重构），必须返回 Phase A 修改 AI 方向，而不是跳过 Phase 1 强行继续。**
Phase 1 不是走过场的确认步骤，它有权否决 Phase A 的结论。

---

## Phase 1：原生AI四层深度思考

**⚠️ 本 skill 的核心门禁。详细方法论见 `ai-native-design-framework.md` 第 4 节。
本 Phase 只负责执行。**

### Step 1.0：上游继承检查（解耦 ux-brainstorm，避免重做）

preamble 已探测 `_UX_BRAINSTORM`（docs/decisions/*-ux-brainstorm.md）。据此分两支——phase 仍执行、顺序不变：

- **有上游产出 → 继承模式**：读取其「AI Native评估」节（N→N'/范式/Evaluability）+「对下游Skill的交接」节（design-brief 需要知道的 / 不应该做的）。
  **承接** N→N' 压缩、范式判定、Evaluability 等级为**既定输入**，不再从零推导四层。
  本 Phase 降级为「交互层复核」：只校验承接判定在本规格的组件/交互粒度是否仍成立。
  保留否决权：若复核与承接结论**冲突** → 触发 `NEEDS_CONTEXT` 回 ux-brainstorm，**不得静默重算**或复活被否定方向。
  下面【四层思考】只填"承接值 + 交互层复核结论"。
- **无上游产出 → 独立模式**：按下面【四层思考】完整推导（design-brief standalone 原有行为）。

### Step 1.0b：上游 voice-spec 继承检查（解耦 /ux-writing，同款继承模式）

正文探测（不动 preamble）：`_VOICE_SPEC=$(ls -t docs/decisions/*-voice-copy-spec.md 2>/dev/null | head -1)`。

- **有上游 voice-spec → 继承模式**：读取其「语义层结论」节，**承接**为既定内容语义输入——Phase 3 状态声明中的空态/错误/拒答等描述直接引用其结论（落入 brief 正文，Packet 因此可追溯）。发现冲突 → 向用户确认，不得静默覆盖。
- **无上游 → 兜底模式**：Phase 3 用内联「内容语义规则」（见该节）自行声明。
  **提示钉（条件触发，只提示不当门）**：仅当场景 C（文案评审改版是 /ux-writing 自陈主场）、
  场景 D（hedging/拒答文案是承重面），或**从输入材料已可见**内容语义承重（PRD/评审报告里
  已出现大量文案面问题）时，向用户提一句「可先跑 `/ux-writing` 相位 1 产 voice-copy-spec，
  本 skill 会自动继承（Step 1.0b）」；
  用户不选则继续内联兜底，不追问、不阻断。其余情况不提，避免每次都吵。
- **消歧**：ux-writing 语义规范与本 skill 内联规则**不并列产同类文档**——有上游则继承不重做，无则内联兜底。

```
【四层思考】

Layer A · 产品层：AI 是否重构了决策路径？
→ 当前决策次数 N = {?}
→ AI 介入后 N' = {?}
→ 压缩 = N - N' = {?}（**含 AI 时**必须 ≥ 2，否则 Phase A 的 AI 方向设置有问题，返工；**若 Phase A AI 方向 = 不介入 → 本 Layer 记 N/A 并引用不介入理由，不触发 ≥2 返工门**）

Layer B · 交互层：AI 原生路径长什么样？
→ 传统路径：{步骤} 共 {N} 步
→ AI 原生路径：{步骤} 共 {M} 步
→ 比较：{M < N / M = N / M > N（不合格，返工）；**Phase A AI 方向 = 不介入时本 Layer 记 N/A，本 Phase 降级为无 AI 结构优化的路径复核**}
→ 关键假设：{前提条件}
→ Fallback：{失败路径}

Layer C · 信任层：用户凭什么相信 AI？
→ 不确定性表达：{引用依据 / 置信度 / hedging / 多候选 / 预览-执行}
→ 首次用户建立信任的路径：{说明}
→ AI 错了用户多久能发现：{说明}

Layer D · 代理层（场景 D 和涉及 agent 的功能强制）：
→ 过程可见：{是/否 + 具体如何呈现}
→ 可暂停：{是/否 + 暂停后状态}
→ 可接管：{是/否 + 接管流程}
→ 可撤销：{是/否 + undo 粒度}
→ 授权边界：{哪些动作 agent 可自主做，哪些必须用户确认}
```

**产出摘要（写入产出文件的「原生AI深度思考小结」节）：**

```
产品层：决策 {N}→{N'} 次（压缩 {N-N'}）
交互层：路径 {N}→{M} 步
信任层：{不确定性表达方式}
代理层：{仅场景 D / agent 功能填} 可见/暂停/接管/撤销 = {4项结果}
对当前决策的影响：{采纳了什么 / 预留了什么 / 暂不可行的原因}
```

**【场景 C 专有】超范围改进必须询问：** 发现 ux-audit 范围外的改进机会
→ AskUserQuestion 确认 A）纳入 B）不纳入。不得静默纳入。

**【C-02 修复】写入 CONTEXT.md：** Phase 1 小结追加到 `CONTEXT.md` 的「累积洞察」节。

---

## Phase 2：假设挑战

**上游继承检查**：若存在 ux-brainstorm 产出，读其「假设前提」节（用户已验证）+「被否定的方向」节。
有上游 → 切「checkpoint 模式」：核对这些**已验证假设**在本规格下是否仍成立、被否定方向不复活，不从零再挑战；
无上游 → 按下面流程做本 skill 自己的轻量假设挑战。

读取选定的方案，识别 1-2 个核心假设：

```
【假设挑战】

核心假设：
  假设1：{方案假设用户会/有/是什么}
  假设2：{可选}

若假设错，方案还成立吗？
  假设1：{成立/不成立，原因}

风险识别：
  最脆弱假设：{假设N}
  建议验证节点：{在哪个阶段验证}

【场景 D 专有】信任假设挑战：
  假设："用户会信任 agent 自动执行 {X 动作}"
  若用户不信任：{fallback 方案，如降级为"决策增强"范式或保留"预览-确认"}

结论：{方案继续 / 需要调整：{具体调整} / 建议 fallback：{具体设计}}
```

---

## Phase 3：体验验证

对照 PRD P0 用户故事逐条验证：

```
| P0 用户故事 | 方案覆盖情况 | 说明 |
|------------|------------|------|
| P0-001 | ✅/⚠️/❌ | {说明} |

核心任务路径：{步骤} 共 {N} 步
渐进披露：{是/否 + 说明}
体验风险：{具体描述}
设计边界：{没有/有：描述}
```

### 状态覆盖声明（12 状态全必须声明）

**来源：`ai-native-state-coverage.md`。N/A 的要写原因。**

**内容语义规则（写各状态「方案处理方式」时必须满足；有上游 voice-spec 则以其语义层结论为准——见 Step 1.0b；场景 C 跳过本 Phase 时本规则顺延至 Phase 5 决策的状态覆盖字段）：**
- 错误态/幻觉兜底态描述必须含三要素：何事 + 为何（有助才写）+ 怎么办；不指责用户、无空话
- 空态描述必须含引导动作（这里会出现什么 + 下一步）
- 拒答态/低置信态必须用 hedging 语气（"根据…可能…"，不断言）并给出路
- 成功态给轻确认，可逆操作附撤销语义
- 语域统一中文 B2B（真实业务词汇，非 Lorem/口语）
- **只声明语义（内容必须达成什么），不写逐字文案**——逐字文案属 /ux-writing 逐字层与生成阶段

| 状态 | 方案处理方式 | 是否需要单独设计 |
|------|-----------|---------------|
| 默认态 | {描述} | {是/否} |
| 空态 | {描述 / N/A：原因} | {是/否} |
| 加载态 | {描述 / N/A：原因} | {是/否} |
| 错误态 | {描述 / N/A：原因} | {是/否} |
| 成功态 | {描述 / N/A：原因} | {是/否} |
| 思考中态 | {描述 / N/A：原因} | {是/否} |
| 低置信态 | {描述 / N/A：原因} | {是/否} |
| 拒答态 | {描述 / N/A：原因} | {是/否} |
| 部分完成态 | {描述 / N/A：原因} | {是/否} |
| 待 Steer 态 | {描述 / N/A：原因} | {是/否} |
| 幻觉兜底态 | {描述 / N/A：原因} | {是/否} |
| Agent 执行中态 | {描述 / N/A：原因} | {是/否} |

**场景自动判定：**
- 场景 A/B 无 AI → 前 5 个必填，AI 专有 7 个统一写 "N/A — 本功能不涉及 AI"
- 场景 A/B 含 AI → 前 5 + 思考中/低置信/拒答/待 Steer/幻觉兜底 必填，其他看是否涉及 agent
- 场景 D → 12 个全部必填，不允许 N/A

---

## Phase 4：品味检查（产出节名锁死为「品味检查四锚点」，内容执行 8 锚点三维度）

**来源：`ai-native-taste-anchors.md`。**

### 效率维度（5 锚点）

```
- Ryo Lu：每个 UI 元素能回答「帮用户完成什么任务」？→ [是/否，如否列出]
- Linear：核心任务路径步骤数？→ [N步]；能再少？→ [是/否]
- Attio：信息层次 L1/L2/L3 可辨认？→ [是/否]
- Notion：首屏主要操作入口数量？→ [N个]；有无重复？→ [有/无]
- Raycast：AI 入口在任务上下文内？→ [是/否/无 AI]；AI 介入后路径变长？→ [是/否/无 AI]
```

### 信任维度（新增）

```
- Perplexity：AI 输出可追溯（来源/推理/置信度）？→ [是/否/无 AI]
  **无来源的 AI 输出：{个数，必须 = 0}**；不通过点：{列出具体}
- Granola：AI 诚实表达不确定性？→ [是/否/无 AI]
  **无不确定性表达的 AI 输出：{个数，必须 = 0}**；过度自信点：{列出具体}
```

### 代理维度（新增，场景 D 和 agent 功能强制）

```
- Cursor：AI 动作可见/可暂停/可接管/可撤销？→ [全部是/部分是/无 agent]
  不通过点：{列出具体}
```

### AI Slop 扫描（对照 ai-native-design-framework.md 第 8 节 10 项反模式）

按 `SCHEMA.md` §AI Slop 扫描的 **10 行表逐行作答**（每行必须写「有/无」，不允许留空或
只报总数）——只写「未发现 Slop」等于没扫。逐行答完再算总数。

**处理规则（可判定分级，不是"发现就改"）：**
`N ≥ 3` → 整体品味不合格，**必须返工**，不得进入 Phase 5；
`N = 1-2` → 修复建议写入本节，产出标「警告」；
`N = 0` → 通过。

### 严重性判断（按 ai-native-taste-anchors.md §5 严重性分级）

> 真值源 = ai-native-taste-anchors.md §5；下方阻断/警告清单为执行副本，改动须先改 §5 再同步本处。

- **阻断锚点不通过** → 必须先调整方案，不得进入 Phase 5：Linear / Raycast /
  Perplexity / Cursor / Granola
- **警告锚点不通过** → 记录，可在下次迭代修复：Ryo Lu / Attio / Notion

**【场景 C 专有】品味检查发现超范围调整时的处理：** AskUserQuestion 确认
A）执行 B）不执行。选 B 记录"已知品味问题"。

---

## Phase 5：每条决策 8 字段完整化（新增）

**来源：designer.md Layer 3 Quality Standards，回注。**

**对 Phase A 识别的每个核心交互点，产出一条独立决策。每条决策必须完整
8 字段，缺任何一项则该决策不输出。**

### 决策模版（每条决策独立写）

**Load `references/output-templates.md` §决策模版 now — 产出每条 D-{NNN} 决策前必须完整读取该模板。**

### 约束检查（每条决策产出后立即执行，不可批量）

```
□ 这个决策在 prd-constraints.md「优化方向边界」内？（场景 B/D）
□ 不在「Not-Do List」里？（场景 B/D）
□ 8 字段都填了，无一字段留空？
□ 设计理由有明确来源引用，不是主观判断？
□ 排除的备选方案 ≥ 1 条？
□ 接受的 tradeoff 不为"无"？
□ AI Native 判定引用了 Phase A 的全局结论？
□ 状态覆盖含本决策涉及的所有适用状态？

任一不通过 → 返回修正该决策，或删除并记录 REMOVED: OUT OF SCOPE
```

---

## Phase 6：输出目标与平台核对 + 页面与交互位置映射

### Step 1：输出目标与平台核对（位置映射前执行）

读取 /idea、PRD 或用户已确认方案中的目标工具、目标平台、整页/局部范围与参考策略，
逐项记录来源；已明确的选择直接继承。仅当缺失项影响设计意图时向用户确认，不把缺少本地母版
变成阻断条件。页面参考只说明位置与结构，不能把桌面源的布局或尺寸当成移动端需求。

产出文件必须写入：

```markdown
输出目标：{用户指定工具 / 尚未选择；Open Design 为默认推荐}
目标平台与范围：{desktop / mobile / embedded；整页 / 局部位置}
参考策略：{用户已有选择记录 / 明确不用参考 / 待交接入口执行页面匹配}
依据：{PRD 字段 / 已对齐方案位置 / 用户确认来源}
下游约束：{已确认的交互、修改/保留范围及平台约束}
```

完成条件：目标、平台与范围有来源或明确未决说明；未决项不被写成用户决定。
本 Phase 不运行页面推荐或采用询问；唯一执行点及确认规则见 Phase 6.75 的 page-context 指针。

### Step 2：页面与交互位置映射

**产出第 7 节固定标题为「页面与交互位置映射」，机器门名为 `page_interaction_mapping`。**
每个核心交互点都要落到语义页面/位置，保留决策、所有适用状态与需求/验收的追踪职责。

```markdown
| 语义页面/位置 | 交互职责 | D-ID | 全部适用 STATE | 需求/AC 来源 | 约束 | 下游目标 | 已确认 page_id / region_id（可选） |
|---------------|----------|------|---------------|-------------|------|----------|----------------------------------|
| {页面用途 / 区域或截图局部定位} | {用户在此完成什么、系统如何响应} | D-001 | {列出本决策全部非 N/A 状态} | {R/AE、问题 ID 或已对齐方案位置} | {修改/保留范围、授权、恢复等} | {目标工具 / tech-spec} | {确认记录引用；无则 N/A} |
```

语义页面/位置和来源必填。`reference=none` 仍须完整映射；没有目录记录的实际页面可以用
用户语言或截图局部位置定位，不强制先入库，也不编造 page_id/region_id。可选 ID 只索引
已有真人确认，不能靠 agent 填写的 JSON 将候选变为已采用。参考失效由交接入口重新核验。

**AI 功能区域的映射要求：**
- 思考中态写明过程可见性与用户可做的操作。
- 低置信态写明不确定性表达、人工判断或接管出口。
- 拒答态写明原因语义与可继续的路径；其他适用 AI 状态同样逐一映射。

组件名、variant、Tailwind/CSS、品牌色配额不属于本表；设计系统由用户在目标设计工具配置。

**场景 B 约束检查（每条映射产出后立即执行）：**

```
□ 在 prd-constraints.md「优化方向边界」范围内？
□ 不在「明确不做」列表？
□ 是「如何做」层面，不是「做什么」层面的功能扩展？
结论：✅ 保留 / REMOVED: OUT OF SCOPE — {原因}
```

---

## Phase 6.5：可追踪完整门禁

**目标：** 防止 research / PRD / ux-brainstorm 的诉求在进入 HTML、tech-spec、
task-plan 前丢失。此门禁不通过，不允许进入 Phase 7 写最终文件。

### Step 1：建立上游诉求索引

从输入中提取并编号：

```markdown
| Source Claim ID | 来源文档 | 来源章节 | 诉求摘要 | 类型 | MVP 状态 |
|----------------|---------|---------|---------|------|---------|
| REQ-R001 | PRD §R1 | ... | ... | requirement | MUST |
| AE-A001 | PRD §AE1 | ... | ... | acceptance | MUST |
| RS-C001 | ux-research §C1 | ... | ... | research constraint | SUPPORTING |
| UXB-D001 | ux-brainstorm §决策1 | ... | ... | design input | MUST |
```

规则：
- **MUST 派生规则（可复现，不靠主观打分）**：R/AE 的 Disposition = REQUIREMENT 且
  Confidence = explicitly_confirmed → MUST；明标「不在本次范围 / 已知局限」的 AE →
  强制 DEFERRED 并附原因，不判 MUST；其余高置信但未经确认项 → SUPPORTING。
- `traceable_delivery`：PRD 中所有 MUST 级 R/AE 必须进入索引。
- `standalone_light` 且无 PRD：不得伪造 R/AE；PRD 相关行标记 `NEEDS_CONTEXT`，
  最终状态只能是 `DONE_WITH_CONCERNS`，且交接块必须写“不得直接进入 tech-spec/task-plan”。
- ux-brainstorm 中所有核心设计决策、Oracle 补丁、下游约束必须进入索引。
- research 中只纳入被 PRD 或 ux-brainstorm 引用的高置信结论。

### Step 2：建立落地映射矩阵

```markdown
| Source Claim ID | 映射到设计决策 | 映射到状态 | 映射到页面与交互位置行 | 下游去向 | 结果 |
|----------------|---------------|-----------|----------------|---------|------|
| REQ-R001 | D-001 | default/success | 角色设置 / 当前角色切换位置 | 目标设计工具 + tech-spec | MAPPED |
```

结果只能是 `MAPPED`、`DEFERRED`、`NEEDS_CONTEXT`、`REMOVED`。
禁止写空白、“后续补充”、“开发时处理”、“设计时自然体现”。

### Step 3：门禁判定

```
□ 所有 PRD MUST R/AE 都是 MAPPED？
□ 所有 ux-brainstorm 核心决策都有 D-series 去向？
□ 所有 Oracle 补丁都有状态或页面/交互位置去向？
□ 每个 D-series 至少出现在一个页面与交互位置映射行？
□ 每行包含对应 D-series 的全部适用 STATE 与需求/AC 来源？
□ 每个“是否需要单独设计 = 是”的状态都有下游实现与验收指示？
□ DEFERRED / NEEDS_CONTEXT / REMOVED 都有原因？
```

任一不通过：

```
⛔ TRACEABILITY GATE FAIL
未映射项：
  - {Source Claim ID}: {原因}
→ 返回 Phase 5/6 修正，或标记 DEFERRED / NEEDS_CONTEXT / REMOVED。
```

全部通过：

```
✅ TRACEABILITY GATE PASS
PRD MUST: {N/N}
Design decisions: {N/N}
States needing design: {N/N}
Page/interaction mappings: {N/N}
```

`standalone_light` 无 PRD 时不得输出 `TRACEABILITY GATE PASS`；只能输出：

```
⚠️ TRACEABILITY GATE LIMITED
原因：缺少 PRD R/AE，不能保证端到端完整落地。
限制：不得直接进入 tech-spec/task-plan；如要开发，先补 PRD 后重跑 design-brief。
```

Phase 7 输出文件必须包含“可追踪完整矩阵”节，内容来自本 Phase。

---

## Phase 6.75：Design Generation Packet + Tool Consumption Contract

**目标：** 把完整 design-brief 压缩成一个外部工具可直接消费的设计生成包。这个包给
MagicPath、Open Design、Claude Design、/html-prototype 和开发前评审使用。

**硬规则：**
- Packet 的需求与设计事实只能引用本 design-brief 正文，不得新增产品诉求、交互决策或状态；
  页参考与目标绑定记录由下述交接入口核验后附入，并保留各自来源。
- Packet 是下游生成工具的主输入；上游 PRD / research / ux-brainstorm 只用于本文件的
  traceability 校验，不让外部工具重新做产品判断。
- Open Design（/open-design）是默认推荐交接路径；用户指定 Claude Design 时导出同包供人工
  附加。MagicPath / /html-prototype 的独立入口继续保留，按用户所选目标消费同一契约；
  工具不可达时在该入口报告状态并保留材料，不自动改用本地生成器。

**页面参考的唯一交接点：** 设计源已对齐、即将交给 OD / Claude Design 时，交接入口必须
完整读取 `.claude/skill-os/runtime/page-context.md` 至 FILE_END；OD 在 `/open-design`
编译前执行该合同。design-brief 在此只声明参考策略并引用已有记录，不重复执行匹配/询问。
仅高置信候选可推荐，采用须真人确认；低置信/无匹配不推荐，以 `reference=none` 非阻塞继续。
无参考仍保留第 7 节的语义位置与完整追踪。已有有效确认直接复用，JSON 标记不能代签真人。
第 7 节只引用本 brief 产出时已有的确认。交接入口的新确认放入同次 Packet 的运输元数据
（`page-reference.json`），指向已通过门禁的 brief 来源及版本；不反写正文或第 7 节，
不改变已冻结的源 hash，也不复制需求为第二事实源。
页面采用与外部写入授权分开核验，外部接收/生成状态由对应工具的真实证据判定。

### Step 1：生成 Design Generation Packet

**Load `references/output-templates.md` §Design Generation Packet now — 产出 Design Generation Packet 前必须完整读取该模板。**

### Step 2：生成 Tool Consumption Contract

```markdown
## Tool Consumption Contract

| 下游工具 | 主输入 | 可读校验源 | 不允许做 |
|---------|--------|------------|----------|
| MagicPath | Design Generation Packet + 页面与交互位置映射 + 状态覆盖 | design-brief 正文 | 不得新增 PRD 没有的产品功能；不得忽略 D/STATE/AC 映射 |
| Open Design / Claude Design | Design Generation Packet（同包附确认参考或 reference=none） | design-brief 正文及 page-context 确认来源 | 不得直接从 research 发散新方案；不得复活 REMOVED 方案；不得把参考页当成外部设计系统 |
| /html-prototype | Design Generation Packet + 输出目标与平台 + 页面与交互位置映射 | PRD / ux-research / deepresearch 仅用于 traceability 校验 | 不得绕过 design-brief 重新设计交互或遗漏 D/STATE/AC |
| tech-spec / task-plan | design-brief 正文 + Traceability Matrix | PRD R/AE | 不得从 research/design-brief 编造 R/AE |
```

### Step 3：单入口门禁

```
□ Design Generation Packet 存在？
□ Tool Consumption Contract 存在？
□ Packet 中所有需求、决策与状态事实都能在 design-brief 正文找到？
□ Packet 包含有来源的输出目标、平台与参考策略？
□ Packet 包含所有 MUST D-series 决策？
□ Packet 包含所有非 N/A 状态？
□ Packet 保留每项语义位置、需求/AC 来源、修改/保留范围及下游目标？
□ 页面上下文引用 page-context 合同，未决选择不伪报已采用，reference=none 不丢追踪？
□ Packet 不注入本地 token/组件技术映射，目标与用户选择一致？
```

任一不通过 → 不得进入 Phase 7。

---

## Phase 7：产出文件 + 写入长期记忆 + 更新状态

读取 SCHEMA.md 作为**字段级模版**（其含前 9 节的字段结构；**产出的节清单以下方 12 节为准**——SCHEMA 未含的「可追踪完整矩阵 / Design Generation Packet / Tool Consumption Contract」三节按 Phase 6.5 / 6.75 产出补入，不得因 SCHEMA 缺节而漏产），写入：
`docs/decisions/YYYY-MM-DD-<topic>-design-brief.md`

**产出文件必须包含以下所有节（节名锁死）：** MagicPath / 外部设计生成器 / html-prototype /
tech-spec 依赖第 4、7 节；**`redteam` 判据挂载表按本清单逐节做完整性核查**。

1. 设计坐标系（Phase A 产出）
2. **原生AI深度思考小结**（Phase 1 产出，内部扩展为四层）
3. **假设挑战结论**（Phase 2 产出）
4. **体验验证结论**（Phase 3 产出，含 12 状态覆盖表）
5. **品味检查四锚点**（Phase 4 产出，节名保持不变，内部扩展为 8 锚点）
6. 设计决策清单（Phase 5 产出，每条 8 字段）
7. **页面与交互位置映射**（Phase 6 产出；`page_interaction_mapping`）
8. **可追踪完整矩阵**（Phase 6.5 产出）
9. **Design Generation Packet**（Phase 6.75 产出，MagicPath / Open Design / Claude Design / HTML 生成器主输入）
10. **Tool Consumption Contract**（Phase 6.75 产出）
11. REMOVED 记录（场景 B / D 专有）
12. **交接块**（下游恢复索引；不得包含正文没有的新事实）

**节名约束说明：** 第 2/3/4/5 节保持原版，第 7 节固定为「页面与交互位置映射」——下游按节名定位内容
（第 4、7 节由 html-prototype / tech-spec / magicpath 直接消费；
第 2/3/5 节由 `redteam` 的 12 节完整性核查消费）。内部扩展（如四层思考 / 12 状态 / 8 锚点）
放在节的子结构里。

**写入 CONTEXT.md 长期记忆：**

将 Phase 1 的原生AI思维小结、Phase 2 的假设挑战结论、Phase 4
的品味检查结论追加到 `CONTEXT.md`。

```markdown
## 来自 [日期] /design-brief 的洞察 — [topic]

**原生AI思维小结（四层）：**
[Phase 1 四层摘要]

**假设风险：**
最脆弱假设：[Phase 2 识别]
建议验证节点：[建议]

**品味检查结论（8 锚点）：**
[8 锚点结论]
```

**workflow-state 写入：**

```bash
export _TOPIC=$(cat .claude/current-topic.txt 2>/dev/null)
[ -z "$_TOPIC" ] || [ "$_TOPIC" = "<topic>" ] && \
  _TOPIC=$(ls -t docs/idea/*.md 2>/dev/null | head -1 | \
           xargs basename 2>/dev/null | \
           sed 's/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-//' | \
           sed 's/-idea\.md$//' || echo "unknown")
export _NODE="design-brief"
export _STATUS="DONE"
export _OUTPUT="docs/decisions/$(date +%Y-%m-%d)-${_TOPIC}-design-brief.md"
python3 .claude/skills/office/references/write_state.py 2>/dev/null || echo "workflow-state 写入跳过"
```

**交接块格式：**

**Load `references/output-templates.md` §交接块格式 now — 产出交接块前必须完整读取该模板。**

---

## Phase 8：列出下游选项

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/design-brief 完成
文件：docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
场景：{A / B / C / D}

AI Native：{范式}，决策 {N}→{N'} 次，路径 {N}→{M} 步
品味检查：{通过 / 阻断项: X / 警告项: Y}；Slop: {N}
决策清单：{N} 条（每条 8 字段）
页面与交互位置映射：{N} 行；D/STATE/AC 覆盖：{N/N}
状态覆盖：{12 / 12}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 下一步？
>
> A）/open-design — 交接 Design Generation Packet 与页面上下文，由用户在 OD 配置设计系统（推荐）
> B）magicpath — 用户选择独立 React canvas 产出时使用
> C）/html-prototype — 用户选择本地 HTML 原型时使用
> D）先停这里
> E）Claude Design — 导出同一 Packet 供人工附加，设计系统在工具内配置

---

## ⚠️ 末尾核心约束

1. **执行顺序锁死**：Phase A 设计坐标系 → Phase 1 四层深度思考 → Phase 2
   假设挑战 → Phase 3 体验验证 → Phase 4 品味检查 → Phase 5 决策 8 字段化
   → Phase 6 输出目标与平台核对 + 页面与交互位置映射 → Phase 6.5 可追踪完整门禁
   → Phase 6.75 Design Generation Packet
   （**例外**：场景 B 的 Step B-0 / 场景 C 的 Step C-1、C-2 执行在 Phase A 之前，
   是进入本序列前的现状核对，不算违反本条——见「⚠️ 执行顺序锁死」节）
2. **必读 references 4 份，按挂载表在对应 Phase 开始前读完**（lazy-load，勿在 skill 启动时全量读）— 任一已执行 Phase 的挂载 ref 未读完 → 该 Phase 门禁 FAIL，补读后返工
3. **Phase A 设计坐标系必须第一步**（**场景 B/C 的前置 Step 除外，见上条**）— 不写坐标系直接跳进决策 = 没有设计
4. **Phase 1 四层深度思考** — Layer A/B 必填，Layer C 所有 AI 功能必填，Layer D
   场景 D 和 agent 功能必填
5. **场景 B / D 输入顺序锁死** — prd-constraints 第一
6. **场景 B / D 约束检查不可批量** — 每条决策产出后立即检查
7. **每条决策必须 8 字段完整** — 缺任一项该决策不输出。"排除的备选 ≥
   1 条"、"tradeoff 不为无"是硬约束
8. **页面与交互位置映射完整** — 每个 D-series 有语义位置、全部适用 STATE、需求/AC 来源、约束和下游目标；参考 ID 可选
9. **品味检查 8 锚点必须全部执行** —
   阻断锚点（Linear/Raycast/Perplexity/Cursor/Granola）不通过不得进 Phase 5
10. **状态覆盖 12 状态必须全部声明** — 场景 D 不允许 N/A
11. **Phase 6.5 可追踪完整门禁必须 PASS**
12. **REMOVED 记录必须保留**
13. **Design Generation Packet 不可省略** — MagicPath / Open Design / Claude Design / HTML 生成器统一消费它
14. **Tool Consumption Contract 不可省略**
15. **交接块不可省略** — 交接块只是索引，不是第二事实来源
16. **节名锁死** — 第 2/3/4/5 节保持原版，第 7 节为「页面与交互位置映射」；下游按节名定位内容、redteam 按 12 节清单核完整性
17. **下游询问必须执行** — 不能静默进入下一步

---

## 完成协议（Handoff Summary）

**标记 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写入 handoff summary：**
```
路径：docs/handoff/YYYY-MM-DD-<topic>-design-brief-handoff.md
格式：见 .claude/skills/office/references/handoff-protocol.md（≤2000 tokens）
```

必须包含：
- **决策列表**（≤8条）：8字段决策摘要（每条含 decision/rationale/tradeoff）、页面与交互位置映射、可追踪完整矩阵统计
- **下游约束**（≤5条）：MagicPath / 外部设计生成器 / html-prototype 必须遵守的设计决策、REMOVED 记录中不得复活的方案
- **风险**（≤3条）：未验证假设、场景覆盖盲点
- **产出路径**：decisions/ 文件完整路径
- **AI Native 判断**：是否采用 AI Native 范式及核心理由（必填）

**Step 2 — 更新 workflow-state.yaml：**
> 单写入口：workflow-state 仅由 Phase 7 的 `write_state.py` 写入一次（落 `nodes.design-brief`）。下方 YAML 是该节点的目标形态示意——`gate_result` / `handoff_path` / `ai_native_summary` 为 handoff 附加字段，如 write_state.py 未覆盖则补写到同一节点下（可经 `_EXTRA_JSON`）；**不要另手写顶层 `design-brief:` 键造成双写**（session-restore 只读 `nodes.*`，顶层块永不被读到）。

```yaml
design-brief:
  status: DONE
  output: "docs/decisions/<filename>"
  completed_at: "<YYYY-MM-DD>"
  gate_result: PASS
  handoff_path: "docs/handoff/<filename>"
  ai_native_summary: "<一句话结论>"
```

<!-- FILE_END: design-brief/SKILL.md -->
