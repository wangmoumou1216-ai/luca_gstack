---
name: design-brief
preamble-tier: 3
version: 2.0.0
description: |
  轻量交互文档与原型决策节点。用于在不运行重型 /ux-brainstorm 时，
  基于 PRD / ux-research / ux-audit / 用户直接粘贴方案，产出可交给
  /html-prototype 的原型前交互文档。执行顺序锁死：设计坐标系 →
  原生AI四层深度思考 → 假设挑战 → 体验验证 → 品味检查 →
  每条决策的 8 字段完整化 → shadcn 组件映射。(luca_gstack)
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 24248
  runtime-estimate: 20000
  shared-refs: [ai-native-design-framework, ai-native-state-coverage, ai-native-taste-anchors, design-system-contract]
  recommended-model: opus  # 设计决策核心+AI Native判断
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
```

---

## 执行前的角色声明

**你是一名 B2B SaaS 首席产品设计师。**

本 skill 是轻量交互文档节点，不是 /ux-brainstorm 的弱化替代，也不是代码交付节点。
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

## 必读 references（Phase 1 之前读完）

```
□ .claude/skills/office/references/ai-native-design-framework.md
  （核心方法论：四范式、判定矩阵、四层思考、AI 专有状态、Slop 反模式）
□ .claude/skills/office/references/ai-native-taste-anchors.md
  （8 锚点品味体系：Ryo Lu/Linear/Attio/Notion/Raycast + Perplexity/Cursor/Granola）
□ .claude/skills/office/references/ai-native-state-coverage.md
  （12 状态清单：5 传统 + 7 AI 专有）
□ .claude/skills/office/references/design-system-contract.md
  （品牌/间距/字体/组件硬约束）
```

**不读完 references 就开始决策 → SELF_CHECK_PASSED 不得写 YES。**

---

## Phase 0：场景确认 + 输入检查 + 方案选定

### Step 0：读取 PRD 设计师关注摘要（场景 A / B / D 必须，场景 C 跳过）

```
□ 读取 docs/prd/{最新PRD文件} 的「📌 设计师关注摘要」节
  提取并声明：
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
> C）**评审改版** — 基于 ux-audit 报告，先做轻量改版方向推导，再做组件映射
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
✅ Phase 6（母版 + 组件映射）
```

**场景 D（Agent 化改造）执行路径（锁死）：**

```
✅ Phase A · 设计坐标系（AI Native 方向必填"代理式执行"或"决策增强"）
✅ Phase 1（四层深度思考，Layer D 强制执行）
✅ Phase 2（假设挑战，必须包含"用户信任 Agent"的假设挑战）
✅ Phase 3（体验验证，状态覆盖含 AI 专有 7 状态全部）
✅ Phase 4（品味检查，Cursor/Perplexity/Granola 三锚点强制通过）
✅ Phase 5（每条决策 8 字段化）
✅ Phase 6（母版 + 组件映射）
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
Phase 6：母版确认 + shadcn 组件映射表
```

**场景 C：Phase A → Phase 1 → Phase 4 → Phase 5 → Phase 6**

**这是 A 级验收项。任意顺序错误或场景 D 缺 Layer D → 产出无效，打回重做。**

---

## Phase A：设计坐标系（新增，必须第一步）

**来源：designer.md Step A，回注到本 skill。**

在开始任何设计决策之前，先明确以下四件事：

```
【设计坐标系】

本次设计必须解决的问题（来自 PRD P0 用户故事 / ux-audit P0 问题）：
  1. {问题ID}：{问题简述}
  2. ...

本次设计可以借鉴的范式（来自 native-design / inspired-design）：
  1. {范式名称}：{对本次设计的含义}
  2. ...

本次设计绝对不能碰的范围（来自 prd-constraints.md Not-Do List）：
  1. {不做事项}
  2. ...

本次设计的 AI Native 方向（来自 Phase 1 之前的预判 + native/inspired 的范式选择）：
  结论：AI {介入 / 不介入}
  [若介入] 范式：{对话式替代 / 嵌入式预测 / 代理式执行 / 决策增强}
  [若介入] 介入节点：{具体交互节点，例："填写跟进记录时" / "筛选客户列表时"}
  [若不介入] 理由（4 选 1）：{超出语料 / 竞品证据 / 技术前提 / 场景不适合} — {一句话}
```

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

```
【四层思考】

Layer A · 产品层：AI 是否重构了决策路径？
→ 当前决策次数 N = {?}
→ AI 介入后 N' = {?}
→ 压缩 = N - N' = {?}（必须 ≥ 2，否则 Phase A 的 AI 方向设置有问题，返工）

Layer B · 交互层：AI 原生路径长什么样？
→ 传统路径：{步骤} 共 {N} 步
→ AI 原生路径：{步骤} 共 {M} 步
→ 比较：{M < N / M = N / M > N（不合格，返工）}
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
  不通过点：{列出具体}
- Granola：AI 诚实表达不确定性？→ [是/否/无 AI]
  过度自信点：{列出具体}
```

### 代理维度（新增，场景 D 和 agent 功能强制）

```
- Cursor：AI 动作可见/可暂停/可接管/可撤销？→ [全部是/部分是/无 agent]
  不通过点：{列出具体}
```

### 严重性判断（按 ai-native-taste-anchors.md 第 9 节）

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

```markdown
### D-{NNN}：{组件/模式名称}

- **决策内容：** {做什么，一句话}

- **设计理由：** {为什么这样做，必须引用以下之一}
  - PRD P0 故事：{引用具体故事编号}
  - ux-audit 发现：{引用具体 issue ID}
  - native-design / inspired-design 方案：{引用具体节}
  - ai-native-design-framework：{引用具体范式或原则}
  禁用："我觉得"、"直觉"、"参考业界"等无源依据。

- **排除的备选方案：** {还考虑过什么，为什么不选}
  - 备选 1：{描述} → 不选原因：{具体原因}
  - 备选 2（可选）：{描述} → 不选原因：{具体原因}
  最少 1 条，不允许留空。留空说明思考不充分。

- **接受的 tradeoff：** {这个选择放弃了什么}
  例："选了嵌入式预测，放弃了'让用户明确感到 AI 在帮忙'的显著性；代价是用户可能
      不会主动对 AI 建议道谢或反馈，需要通过其他方式收集 feedback"
  不允许写"无 tradeoff"——任何决策都有代价。

- **AI Native 判定引用：** {引用 Phase A 坐标系的全局结论，并说明本决策的体现}
  例："全局 AI 方向 = 嵌入式预测。本决策在 {字段名} 旁显示 ghost text 预填建议，
      用户按 Tab 接受——体现了嵌入式预测范式，不打断主路径。"
  不介入的决策写："本决策不涉及 AI 介入节点。"

- **状态覆盖：** 引用 Phase 3 状态覆盖表中与本决策相关的状态
  - 默认态：{描述}
  - 空态：{描述 / N/A：原因}
  - 思考中态：{描述 / N/A：原因}
  - 低置信态：{描述 / N/A：原因}
  - ... (列出本决策涉及的所有适用状态)

- **PRD 约束引用：** {prd-constraints.md 对应条目编号或具体引用}
  场景 A 可以写 "N/A — 新功能，无 prd-constraints"。
  场景 B / C / D 必填，留空视为决策不完整。
```

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

## Phase 6：母版确认 + shadcn 组件映射表

### Step 1：母版确认（组件映射前必须确定）

读取 /idea 或 PRD 里的「母版」字段。如果已填，直接声明。如果未填，AskUserQuestion：

> 这次原型使用哪个母版？
>
> 1）列表页 — framework/list-page.html
> 2）详情页（两列）— framework/detail-page-2col.html
> 3）详情页（三列）— framework/detail-page-3col.html
> 4）表单页 — framework/form-page.html
> 5）首页/仪表盘 — framework/home-page.html
> 6）局部改动/独立组件 — 不使用整页母版

注意：当前工程包只提供 5 个可用母版。AI速记入口页、
录音工作页母版未随包提供；遇到这类需求时，选择「局部改动/独立组件」
，或先补齐对应母版后再继续。

### Step 2：组件映射表

**来源字段硬约束：只能是 `shadcn` 或 `自绘`。**

判断逻辑：
- 交互元素（按钮/输入框/下拉/表格/对话框/标签页）→ `shadcn` + 组件名 + variant
- 布局容器/背景/分割线/纯文案区域 → `自绘` + Tailwind 颜色和间距

```markdown
| 页面/状态名称 | 区域 | 组件来源 | shadcn 组件名 | variant | 对应决策 ID | 备注 |
|-------------|------|---------|--------------|---------|-----------|------|
| {页面名} | {区域} | shadcn | Button | default | D-001 | 主操作，#FF8000 |
| {页面名} | {区域} | 自绘 | — | — | D-003 | {Tailwind类+颜色+间距} |
```

**AI 功能区域的映射特殊要求：**
- 思考中态的 UI（ghost text / skeleton / streaming）：必须写自绘或标注 shadcn 组件不够用
- 低置信态的视觉降级：标注在 variant 或 className 说明
- 拒答态的文案区：Alert 或 Card variant

**常用 shadcn：** Button / Input / Select / Table / Dialog / Tabs / Badge / Card / Form /
Checkbox / RadioGroup / Switch / DatePicker / Pagination / Alert / Skeleton / Tooltip /
DropdownMenu / Sheet

**场景 B 约束检查（每条映射产出后立即执行）：**

```
□ 在 prd-constraints.md「优化方向边界」范围内？
□ 不在「明确不做」列表？
□ 是「如何做」层面，不是「做什么」层面的功能扩展？
结论：✅ 保留 / REMOVED: OUT OF SCOPE — {原因}
```

---

## Phase 7：产出文件 + 写入长期记忆 + 更新状态

读取 SCHEMA.md 作为模版，写入：
`docs/decisions/YYYY-MM-DD-<topic>-design-brief.md`

**产出文件必须包含以下所有节（节名锁死，html-prototype 和高级审查依赖）：**

1. 设计坐标系（Phase A 产出）
2. **原生AI深度思考小结**（Phase 1 产出，节名对齐高级前置审查，内部扩展为四层）
3. **假设挑战结论**（Phase 2 产出）
4. **体验验证结论**（Phase 3 产出，含 12 状态覆盖表）
5. **品味检查四锚点**（Phase 4 产出，节名保持不变，内部扩展为 8 锚点）
6. 设计决策清单（Phase 5 产出，每条 8 字段）
7. **shadcn 组件映射表**（Phase 6 产出）
8. REMOVED 记录（场景 B / D 专有）
9. **交接块**（下游 /html-prototype 和 /figma-layer 必读）

**节名约束说明：** 为保持与高级前置审查的兼容，第 2/3/4/5/7
节的节名必须与原版保持一致。内部扩展（如四层思考 / 12 状态 / 8 锚点）
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

```markdown
## 交接块（下游 skill 必读）

**本步决定了什么：**
- 信息架构、主要组件选择、关键交互路径
- AI Native 范式选择及介入节点
- 12 状态的覆盖策略（包含 AI 专有状态）
- Agent 的授权边界（仅场景 D）

**下游 /html-prototype 需要知道：**
- 设计范围（来自 PRD）
- 框架类型（母版名称）
- 平台、状态覆盖策略、映射表路径
- **AI 专有状态的 UI 形式** — 本 skill 的状态覆盖表共 12 项，其中 AI 专有 7 项（思考中 / 低置信 / 拒答 / 部分完成 / 待 Steer / 幻觉兜底 / Agent 执行中）。**html-prototype 默认只处理前 5 项（默认/空/加载/错误/成功），若本决策含 AI 功能，必须额外生成所有非 N/A 的 AI 专有状态。**

**下游 /html-prototype 不应该做：**
- 不应重新设计已锁定的信息架构
- 不应绕过映射表选用其他组件
- **不应省略任何非 N/A 状态的实现** — 状态覆盖表里写了描述的状态必须在原型里有对应 UI（用 display:none 切换）
- 不应把 AI 输出做成"无来源无置信度"的纯文本（违反 Perplexity 锚点）
- 不应用浮球 / 新标签页作为 AI 入口（违反 Raycast 锚点和 AI Slop 反模式）

**对 /html-prototype 的命令式指示（逐条执行）：**
1. 读取本文件的"体验验证结论"节的 12 状态覆盖表
2. 对每个"是否需要单独设计 = 是"的状态，**必须**生成对应的状态页
3. 生成后用 `<!-- STATE: xxx -->` 注释标注，便于后续高级审查核对
4. 若发现状态覆盖表某状态写 N/A 但本质上应该有，**不得静默补充**，返回 AskUserQuestion 确认

**下游 /figma-layer 需要知道：**
- 同上
- 组件内 shadcn 优先，跳出组件的部分以 HTML 为准
```

---

## Phase 8：列出下游选项

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/design-brief 完成
文件：docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
场景：{A / B / C / D}

AI Native：{范式}，决策 {N}→{N'} 次，路径 {N}→{M} 步
品味检查：{通过 / 阻断项: X / 警告项: Y}
决策清单：{N} 条（每条 8 字段）
组件映射：{N} shadcn + {M} 自绘
状态覆盖：{12 / 12}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion：

> 下一步？
>
> A）/html-prototype — 生成 HTML 原型
> B）/figma-layer — 搭建 Figma 保险层
> C）先停这里

---

## ⚠️ 末尾核心约束

1. **执行顺序锁死**：Phase A 设计坐标系 → Phase 1 四层深度思考 → Phase 2
   假设挑战 → Phase 3 体验验证 → Phase 4 品味检查 → Phase 5 决策 8 字段化
   → Phase 6 组件映射
2. **必读 references 4 份，读完才能开始** — 未读完 SELF_CHECK_PASSED 不得写 YES
3. **Phase A 设计坐标系必须第一步** — 不写坐标系直接跳进决策 = 没有设计
4. **Phase 1 四层深度思考** — Layer A/B 必填，Layer C 所有 AI 功能必填，Layer D
   场景 D 和 agent 功能必填
5. **场景 B / D 输入顺序锁死** — prd-constraints 第一
6. **场景 B / D 约束检查不可批量** — 每条决策产出后立即检查
7. **每条决策必须 8 字段完整** — 缺任一项该决策不输出。"排除的备选 ≥
   1 条"、"tradeoff 不为无"是硬约束
8. **组件映射表来源只能是「shadcn」或「自绘」**
9. **品味检查 8 锚点必须全部执行** —
   阻断锚点（Linear/Raycast/Perplexity/Cursor/Granola）不通过不得进 Phase 5
10. **状态覆盖 12 状态必须全部声明** — 场景 D 不允许 N/A
11. **REMOVED 记录必须保留**
12. **交接块不可省略**
13. **节名锁死** — 第 2/3/4/5/7 节的节名保持原版，后续高级审查依赖这些节名做审查
14. **下游询问必须执行** — 不能静默进入下一步

<!-- FILE_END: design-brief/SKILL.md -->
