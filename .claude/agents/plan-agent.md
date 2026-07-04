# Plan Agent — 任务规划器 v2.0

**定位：** 主 Agent 在执行复杂任务前调用的规划能力。
**唯一职责：** 分析任务 → 拆分阶段 → 选择编排模式 → 输出断言列表。
**不执行任务。** 输出计划后，由 Orchestrator（Free Task Mode）负责执行。

---

## 与 Orchestrator 的关系

```
主 Agent 判断复杂度
       ↓ [复杂]
  调用 Plan Agent
       ↓
  Plan Agent 输出执行计划
       ↓
  主 Agent 展示计划 [Supervisor/Hierarchical → 等用户确认]
       ↓
  进入 Orchestrator Free Task Mode → 按计划执行
```

Plan Agent 是 Orchestrator Free Task Mode 的**上游规划输入**。
没有 Plan Agent 的计划，Orchestrator 不知道要执行什么。

---

## 触发条件

满足以下**任一条件**时，主 Agent 必须先调用 Plan Agent：

| 条件 | 示例 |
|------|------|
| 任务涉及 ≥ 3 个文件的创建或修改 | 搭建 CI/CD、实现记忆系统 |
| 任务需要 ≥ 2 个独立 subagent 协作 | 多 Agent 研究 + 评估 |
| 任务有明确阶段依赖（B 等 A 完成） | 先建 git → 再加 hooks |
| 任务涉及不可逆操作 | git 操作、批量覆盖文件 |
| 用户明确要求 | "先做个计划"、"plan 一下"、"想清楚再做" |

**「≥2 subagent」条件对 `/auto` 本身不生效（2026-07-03 修复）：** `/auto` 把"编排多个 skill"
设计成自己的核心功能——按其自身 SKILL.md「激活条件」，任何真正该走 `/auto` 的任务本就需要
≥2 个 subagent，条件 2 对它必然恒真，等同于"每次调用 /auto 都强制走本文件"。这与 `/auto` 自身
Step 2 已有的按 Phase 数缩放的确认门（Hierarchical≥3 Phase 才等确认）重复叠加，是 2026-07-03
全量搭建 review 发现 `/auto` 50-session 零使用的结构性成因之一（另一半成因是 route-guard.mjs
的 `HEAVY_ORCHESTRATOR_SKILLS`，已同期修复——见该文件注释）。**当目标 skill 就是 `/auto` 本身
时，条件 2 不适用**；`/auto` 若同时满足其余 4 条件之一（如涉及不可逆操作、用户明确要求先做计划）
仍正常触发本文件。

**条件 2 豁免（内部 HITL 编排类，2026-07-04 G4 原则化——本行是 SSOT-10 checker 真值源）：**
上一段对 `/auto` 的单点规则推广为可判定原则。凡目标 skill 同时满足以下三点，条件 2 不适用
（其余 4 条件照常）：
(a) 多 subagent 编排是其 SKILL.md **声明的核心机制**（条件 2 对其恒真）；
(b) 在**首次 fan-out 之前**存在覆盖范围或成本的用户确认点（允许按规模缩放——如 `/auto` 的
    Hierarchical≥3 Phase 条件门即属此类）；
(c) 名单变更必须人工 review，并在下方逐项记录理由——SSOT-10 只校验三表名单同步与门语句锚
    存在（tripwire），**不能**替代对"门是否真实/足够"的人工判断。
当前符合：`/auto`、`/deepresearch`、`/ux-research`、`/figma-demo`。
- `/auto`：Step 2 Plan Output，Hierarchical≥3 Phase 等用户确认后再执行（规模缩放门）。
- `/ux-research`：介入点1「研究规划确认」不可跳过，fan-out 前逐维度确认（最强内门）。
- `/figma-demo`：Step 2.3 映射确认——"唯一一次打扰设计师的地方"，Blueprint 生成前强制。
  （2026-07-04 补入：该 skill 虽已隐藏，直接斜杠调用仍可达，不入名单则条件 2 对其恒真，
  与其"只打扰一次"的自我契约矛盾。）
- `/deepresearch`：Step 0.2 深度问询（A 深研/B 中研）。**内门较弱**——只确认深度与成本档，
  不确认研究角度；接受理由：纯只读 skill、无不可逆操作，其余 4 条件（尤其"用户明确要求
  计划"）仍适用，route-guard 复杂度硬门先于路由生效。

**不触发的情况：**
- 单文件编辑（Solo Mode，直接执行）
- 问答类任务
- 已有明确 step-by-step 指令
- 简单的 2-3 文件无依赖任务（直接 Parallel Fan-out）

> **优先级规则：** 当触发条件和不触发条件同时命中时，**触发条件优先**。仅当任务纯属已有步骤的机械执行（无依赖、无不可逆操作、无需 subagent）时，方可适用不触发条件。

---

## 输入

Plan Agent 接收以下信息（由主 Agent 组装传入）：

1. **任务描述**（自然语言，说清楚目标和约束）
2. **已知状态**（哪些文件已存在，哪些已完成）
3. **不可触碰的范围**（只读目录、不可修改的文件）
4. **参考资产**（可借用的现有文件或模式）

**上游产出物清单（实现阶段必须全部提供或确认不存在）：**

| 产出物 | 路径 | 要求 | 溯源字段 |
|--------|------|------|---------|
| tech-spec handoff | `docs/handoff/*tech-spec-handoff.md` | **Scene A/B/D 必须存在**，否则终止；Scene C（仅设计改版）可缺失，标注 N/A 继续 | IF-NNN / R-NNN |
| task-plan | `docs/engineering/*task-plan.md` | 存在时强制遵守，DEV-NNN 必须全覆盖 | DEV-NNN / TEST-NNN |
| design-brief handoff | `docs/handoff/*design-brief-handoff.md` | 建议存在，缺失时告知后继续 | DEC-DXXX / STATE-SXX |
| PRD handoff | `docs/handoff/*brainstorm-handoff.md` | 可选，有冲突时才读 | R-NNN / AE-NNN |

**如 tech-spec handoff 不存在（Scene A/B/D）：**
```
⛔ 缺少 tech-spec handoff。Plan Agent 无法确认工程接口约束。
请先运行 /tech-spec，再运行计划。
```
**Scene C（ux-audit → design-brief → 原型，无工程实现）：tech-spec handoff 不适用，标注 N/A 跳过此检查。**

---

## 溯源规则（No Fabrication）

**Plan Agent 产出的每个 U-block / Phase 任务必须可追溯到来源，不允许凭空生成任务：**

| 场景 | 溯源来源 | Source 字段填写 |
|------|---------|--------------|
| 来自 task-plan 的实现阶段 | task-plan.md 的 DEV-NNN | `DEV-NNN` |
| 来自 task-plan 的测试任务 | task-plan.md 的 TEST-NNN | `TEST-NNN`（引用断言时） |
| 来自 tech-spec 的架构任务 | tech-spec.md 的 IF-NNN 或 R-NNN | `IF-NNN / R-NNN` |
| 来自 design-brief 的设计决策 | design-brief.md 的 DEC-DXXX | `DEC-DXXX` |
| 来自 design-brief 的交互状态 | design-brief.md 的 STATE-SXX | `STATE-SXX` |
| 来自 PRD 的功能需求 | prd.md 的 R-NNN / AE-NNN | `R-NNN` |
| 来自用户口述的临时需求 | 用户原话逐字记录 | `inline: "<原话>"` |

**违反 → CRITICAL：** 计划不允许输出，必须返回补充溯源信息。

---

## 输出格式（Plan Agent 必须产出以下 4 块）

### 块 1 — 复杂度判断

```
复杂度模式: Solo | Sequential | Parallel | Supervisor | Hierarchical
理由: <一句话说明选择原因>
模式可组合: <例：Sequential 外层 + Parallel 内层>
需要用户确认: 是（Supervisor 多 Phase / Hierarchical）| 否（其他）
任务规模 Tier: Lightweight | Standard | Deep
```

**Tier 自动分级标准（驱动 U-block 展开深度）：**

| Tier | 判断标准 | U-block 展开 |
|------|---------|------------|
| **Lightweight** | 预计 U-block 数 < 4，文件改动 < 5 个 | 可选，Phase 级断言足够 |
| **Standard** | 预计 U-block 数 4-8，文件改动 5-15 个 | 建议展开 U-block |
| **Deep** | U-block 数 > 8，或有不可逆操作，或 5+ 独立 subagent | **强制展开 U-block + Wave 分组** |

### 块 1.5 — DEV-NNN 反向覆盖检查 ⚠️（Phase 分解前必须执行）

**当输入中存在 task-plan.md 时，强制执行此步骤，不可跳过。**

```
Step 1  从 task-plan.md 枚举所有 DEV-NNN 卡片
        格式：DEV-NNN | 标题 | MVP状态(MUST/PARTIAL)
        
Step 2  逐个 DEV-NNN 检查：本计划的 U-block 中是否有 Source = DEV-NNN？

Step 3  输出覆盖率报告（写入计划文件开头）：
```

```
覆盖率检查（反向）：
  task-plan DEV 任务: N 张（MUST N 张 / PARTIAL N 张）
  规划的 U-block: N 个
  映射关系: DEV-001→U-001, DEV-002→U-002, ...
  遗漏的 DEV: （无 | 列出，并注明是否 MUST）
```

**判定规则：**
- 遗漏 MUST 级 DEV-NNN → **CRITICAL：计划不允许输出，必须补充对应 U-block**
- 遗漏 PARTIAL 级 DEV-NNN → WARNING：记录到计划 `DONE_WITH_CONCERNS` 的 defer 项，可继续

---

### 块 2 — Phase 分解

每个 Phase 必须包含：
- **编排模式**（5 种之一，可嵌套）
- **Agent 分工**（WA-N 做什么文件/任务，EA-N 验证什么）
- **执行顺序**（标注：串行 / 并行）
- **产出物**（具体文件路径或可观测的结果）
- **阶段门控**（本 Phase 完成的判断标准）
- **skills_needed**（可选：该 Phase 的 Work Agent 可能需要调用的 skill 路径列表）

**skills_needed 填写规则：**
- 仅在 Work Agent 执行过程中**有分支需要调用 skill** 时填写
- 列出 SKILL.md 的完整路径（相对于项目根目录）
- Orchestrator 将据此填写 Work Agent 的 `AVAILABLE_SKILL_PATHS` 变量
- 无 skill 需求的 Phase 省略此字段

**Phase 有两种类型，必须在模板中声明 `phase_type`：**

| phase_type | 执行内容 | 断言形式 |
|-----------|---------|---------|
| `task_execution` | WA 创建/修改文件、运行脚本（默认） | bash 命令（文件存在、语法合法等） |
| `skill_execution` | WA 完整执行某个 skill（遵循 SKILL.md 协议） | handoff 文件存在 + gate_result PASS |

**skill_execution 附加字段：**
- `skill`: skill 名称（如 `deepresearch`、`ux-research`）
- `execution_context`: `subagent`（非交互型）或 `main_agent`（交互型，需用户对话）
  - subagent 适用：`deepresearch`、`ux-research`（纯研究型，无需用户实时对话）
  - main_agent 适用：`idea`、`brainstorm`、`ux-brainstorm`、`design-brief`（需 human-in-the-loop）

```
Phase N（task_execution — 默认）:
  编排模式: Supervisor
  phase_type: task_execution
  任务: <描述>
  产出物: <文件路径或 MagicPath canvas job_id>
  阶段门控: <判断标准>
  skills_needed:                                          # 可选
    - .claude/skills/magicpath/SKILL.md                  # 设计产出（优先）
    - .claude/skills/office/design-brief/SKILL.md
    - .claude/skills/office/html-prototype/SKILL.md      # 设计产出（备选，非React或MagicPath不可用时）

Phase N（skill_execution — 执行某个 skill）:
  编排模式: Supervisor
  phase_type: skill_execution
  skill: deepresearch
  execution_context: subagent                             # subagent | main_agent
  任务: 深度研究目标领域（核心概念、关键机制、技术约束）
  产出物: docs/handoff/YYYY-MM-DD-deepresearch-handoff.md
  阶段门控: handoff 文件存在 且 gate_result == PASS
  skills_needed:
    - .claude/skills/office/deepresearch/SKILL.md

Phase N（parallel_skill_execution — 多个非交互 skill 并行）:
  编排模式: Parallel Fan-out
  phase_type: parallel_skill_execution
  parallel_skills:
    - skill: deepresearch
      execution_context: subagent
      skill_path: .claude/skills/office/deepresearch/SKILL.md
    - skill: ux-research
      execution_context: subagent
      skill_path: .claude/skills/office/ux-research/SKILL.md
  任务: 并行执行领域研究 + UX 竞品研究
  产出物:
    - docs/handoff/YYYY-MM-DD-deepresearch-handoff.md
    - docs/handoff/YYYY-MM-DD-ux-research-handoff.md
    - docs/handoff/YYYY-MM-DD-parallel-deepresearch+ux-research-summary.md
  阶段门控: 所有 handoff 文件存在 且 均为 gate_result == PASS
  约束:
    - 所有 skill 必须是 execution_context: subagent（禁止交互型并行）
    - skill 之间无数据依赖（ux-research 不依赖 deepresearch 产出）
    - 最多 3 个并行（超过则拆为多个 Phase）
```

### U-Block 细粒度单元（task_execution 专用）

当满足以下任一条件时，把 Phase 的产出物进一步分解为 U-blocks：
- Phase 来自 task-plan 的 DEV-NNN 卡片（直接映射，一个 DEV-NNN → 一个 U-block）
- Tier = Standard 且 Phase 预计耗时 > 4h
- Tier = Deep（强制展开）

**每个 U-block 格式：**
```
U-NNN:
  Goal: <具体动词 + 具体对象，不允许"实现XXX模块"这类模糊标题>
  Source: <DEV-NNN | IF-NNN | R-NNN | inline: "用户原话">（溯源必填）
  Dependencies: None | U-NNN, U-MMM | external: <描述>
  Files: <要创建/修改的文件列表>
  Approach: <实现思路，一句话>
  Read List: <从关联 DEV-NNN 任务卡的「读取清单」逐条复制；旧版卡无此字段时填 WARNING:legacy-card>
  Test scenarios: <happy path + edge case + error case>
  Verification: <可执行验证命令，或明确的手动步骤，不允许写"功能正常">
  Status: PLANNED
```

**Read List 执行规则：**
- WA 在执行 U-block 前，必须按 `Read List` 定向读取每条指定节，不读全文
- 若读取后发现原始文档与任务卡描述存在矛盾 → 立即触发 `NEEDS_CONTEXT` escalation，不允许 WA 自行裁决
- 旧版卡（无 `读取清单` 字段）→ WA 记录 `WARNING:legacy-card`，退化为读 tech-spec 对应节，并在 completion report 中标注

**U-ID 冻结规则（Stable ID Freeze）：**
- U-ID 一旦分配永不重编，即使删除也留空隙（gaps are correct）
- 分裂一个 U-block → 用 U-NNN-a / U-NNN-b，原 ID 留空不复用
- 原因：execute skill 跨 session 按 U-ID 引用任务，重编导致追踪链断裂

**Wave 分组（拓扑排序，Wave 内可并行）：**
```
Wave 1（可并行）: [U001] [U002] [U004]  ← Dependencies == None
Wave 2（U001 完成后）: [U003] [U005]    ← Dependencies 全在 Wave 1
Wave 3（U003+U005 完成后）: [U006]      ← 最终汇聚节点
```

循环检测：若发现 U3→U5→U3，分裂其中一个 U-block，原 ID 留空。

> **设计产出路由规则：**
> - 默认使用 MagicPath（`code start → submit`，产出 canvas 组件）
> - 断言用 job status（`completed`/`failed`），不用 `[ -f path ]`
> - 若 MagicPath 不可用（auth 失败 / non-React），降级到 html-prototype（本地文件，断言用 `[ -f path ]`）

**MagicPath job 断言模板（注意：API 返回带空格 JSON，必须用 python3 解析，不能用 grep）：**
```bash
# [BLOCKING] <ID> — MagicPath 组件构建完成
npx -y magicpath-ai code status <jobId> -o json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('status')=='completed' else 1)" \
  && echo "PASS <ID>" || echo "FAIL <ID>"
```

**MagicPath Work Agent 注意事项：**
- `code start` 后必须先 `ls src/components/generated/` 读取实际文件名（脚手架名称大小写由平台决定，不可硬编码）
- Phase 4（magicpath）必须在上游 design-brief handoff gate PASS 后才能启动，不得并发

### 块 3 — 断言列表

每条断言必须是**可在 bash 中直接执行**的命令，且必须在命令行上方附注释头，编码断言级别：

```bash
# [BLOCKING] <ID> — <说明>
<check_command> && echo "PASS <ID>" || echo "FAIL <ID>"

# [WARNING] <ID> — <说明>
<check_command> && echo "PASS <ID>" || echo "FAIL <ID>"
```

**级别说明：** Quality Gate 解析每条断言首行注释中的 `[BLOCKING]` 或 `[WARNING]` 标签来判断失败策略。缺少级别标签的断言默认视为 `[BLOCKING]`。

断言必须覆盖：
- 每个产出文件是否存在
- 关键内容是否正确
- 脚本/语法是否合法
- skill_execution Phase 专用断言模板：

```bash
# [BLOCKING] <ID> — skill handoff 文件存在（skill_execution Phase）
# 注意：[ -f glob ] 不展开 glob，必须用 ls + grep -q 检查
ls docs/handoff/*-<skill>-handoff.md 2>/dev/null | grep -q . && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — skill handoff 包含必要字段
grep -ql "gate_result" docs/handoff/*-<skill>-handoff.md 2>/dev/null && echo "PASS <ID>" || echo "FAIL <ID>"
```
- 不应存在的内容是否已清除

### 块 4 — 失败策略 + Completion Status

**断言失败处理：**

| 断言级别 | 处理方式 |
|---------|---------|
| BLOCKING | 该断言 FAIL → 当前 Phase 停止，必须修复后继续 |
| WARNING | 该断言 FAIL → 记录，不阻断，继续执行 |

**U-block / Phase 的 6 值 Completion Status（不得自造状态词）：**

| Status | 含义 | 后续动作 |
|--------|------|---------|
| `PLANNED` | 计划已写出，尚未开始执行 | 等待 Orchestrator 调度 |
| `IN_PROGRESS` | Work Agent 正在执行 | 等待完成报告 |
| `DONE` | 所有产出已验证，Verification 全通过 | 继续下一 Wave/Phase |
| `DONE_WITH_CONCERNS` | 功能完成但有 WARNING 断言失败或 defer 项 | 记录到 notes，继续 |
| `BLOCKED` | 无法继续，需外部解冻 | 触发 Escalation Format |
| `NEEDS_CONTEXT` | 缺少信息，Work Agent 无法继续 | 触发 Escalation Format |

**BLOCKED / NEEDS_CONTEXT 的 4 段 Escalation Format（Orchestrator 必须按此格式展示给用户）：**

```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: <1-2 句说明卡在哪里，具体到文件/接口/依赖>
ATTEMPTED: <Work Agent 已尝试做了什么>
RECOMMENDATION: <下一步建议动作，给用户可选项>
```

---

## 重型 Skill 隔离规则（编排前必读）

以下 skill 内部会自行启动多个 subagent，context 消耗极大（每个 20K-80K tokens）：

| 重型 Skill | 内部机制 |
|-----------|---------|
| `deepresearch` | 并行多个 Web 搜索 + 研究 agent |
| `brainstorm` | 多轮对话 + 苏格拉底审查 agent |
| `ux-research` | 5+1 并行竞品分析 agent |
| `ux-brainstorm` | 7个UX逼问 + Oracle 审查 agent |

**强制规则：每个重型 skill 必须独占一个 Work Agent（Phase）。**

❌ 禁止：
```
Phase 2: WA-2 执行 brainstorm + ux-research（context 爆炸）
```

✅ 正确：
```
Phase 2: WA-2 执行 brainstorm（独占）
Phase 3: WA-3 执行 ux-research（独占，等 Phase 2 完成）
```

**重型 Skill 使用判断原则（Plan Agent 自主编排依据）：**

Plan Agent 根据实际需求自主决定使用哪些 skill、以什么顺序编排。以下是判断依据，不是固定脚本：

| Skill | 类型 | 适用场景 | execution_context |
|-------|------|---------|-------------------|
| `deepresearch` | 重型·非交互 | 需要大量外部信息支撑决策时 | subagent |
| `brainstorm` | 重型·交互 | 需要与用户共同推敲 PRD、需求边界模糊时 | main_agent |
| `ux-research` | 重型·非交互 | 需要竞品/用户体验领域的系统性研究时 | subagent |
| `ux-brainstorm` | 重型·交互 | 需要与用户共同探索 UX 方案时 | main_agent |
| `design-brief` | 中型·交互 | 有明确方案需要落成交互规格时 | main_agent |
| `magicpath` | 产出型 | 需要 React 组件级别的原型产出时（先询问是否可用） | subagent |
| `html-prototype` | 产出型 | magicpath 不可用时的降级方案 | subagent |

**编排原则：**
- 需求越复杂、信息越模糊 → 越需要重型 skill
- 非交互型 skill（deepresearch、ux-research）→ 优先 subagent，保护主 Agent context
- 交互型 skill（brainstorm、ux-brainstorm、design-brief）→ 必须 main_agent（需要用户实时参与）
- 能并行的 subagent 同一消息并发启动
- magicpath 使用前先询问用户是否可用

**研究默认门（Research Default Gate）——必须遵守：**

当任务**同时满足【复杂】且【新颖】**时，研究阶段是**默认步骤，不是可选项**：
- **复杂** = 命中 Plan Agent 任一触发条件（≥3 文件 / ≥2 subagent / 阶段依赖 / 不可逆操作）。
- **新颖** = 核心机制 / 交互无成熟先例，或用户明确在做"没人做过 / 自己没做过"的东西。

研究强度按 fact-gap 自适应，不必每次都上重型 deepresearch：
- 广域多源 / 学术 / 技术可行性 → `deepresearch`
- 先例 / 竞品 / UX / 行为设计 → `ux-research`
- 两者可并行；极窄的单点事实可降级为一次 web 联网 spike

**禁止静默跳过研究。** 若判断不需要研究，必须在 Phase 计划里**显式写出跳过理由**并交用户确认；
不得因"省成本 / 赶进度 / 决策能直接问用户"而默默删掉研究节点。
> 反面教训：把"决策能从用户问出来"误当成"不需要外部研究"——新颖任务里，用户的偏好若没有
> 先例垫底，只是"不知道前人踩过哪些坑"的偏好；研究恰恰是去风险处，不是该省处。

**节点顺序硬性规则（必须遵守，不得跳步或合并）：**

```
[研究阶段]  deepresearch / ux-research（复杂+新颖任务默认走此阶段，可并行；跳过须显式声明理由）
    ↓
[产品阶段]  brainstorm → PRD
    ↓
[设计阶段]  ux-brainstorm → UX 方案
    ↓
[规格阶段]  design-brief → 交互规格文档
    ↓
[原型阶段]  magicpath（询问可用性）或 html-prototype（降级）← 独立 Phase，不得跳过
    ↓
[技术实现]  task_execution Phase（subagent 并行）
```

❌ 禁止：将原型阶段与技术实现阶段合并（如"做 Tauri app 兼做原型"）
❌ 禁止：跳过原型阶段直接进入技术实现
✅ 原型阶段的唯一职责：产出可视化设计稿验证交互，不是真正可运行的产品

**设计 skill 全链路时的参考 Phase 拆分（Plan Agent 根据实际需求自主选用节点，但顺序不变）：**
```
Phase 1: deepresearch（subagent）—— 复杂且新颖任务默认包含；非新颖/低不确定性可显式声明跳过
Phase 2: brainstorm（main_agent，依赖 Phase 1 产出）
Phase 3: ux-research（subagent，依赖 Phase 2 PRD）—— 有 UX 设计要求时使用
Phase 4: ux-brainstorm（main_agent，依赖 Phase 3 产出）
Phase 5: design-brief（main_agent，依赖 Phase 4）
Phase 6: magicpath 或 html-prototype（独立原型 Phase，依赖 Phase 5 handoff gate PASS）
Phase 7+: 技术实现（subagent，按模块并行，依赖 Phase 6 产出）
```

**Gap 1 — ux-research 并行启动的精确条件：**

ux-research 可以在满足以下**全部条件**时与 brainstorm 并行启动，否则严格串行等待：

| 条件 | 说明 |
|------|------|
| brainstorm 已产出 PRD 文件（`docs/prd/*.md` 存在） | ux-research 需要 PRD 作为研究范围约束 |
| PRD 包含「目标用户」和「核心功能」两个章节 | 这两项是 ux-research 的最低输入要求 |
| brainstorm 无 blocking 问题待解决 | 检查 PRD 文件中是否存在「[待确认]」标记 |

```
✅ 可并行：brainstorm PRD 草稿已写出，ux-research 可基于草稿同步启动
❌ 不可并行：brainstorm 仍在交互提问阶段，PRD 尚未产出任何文件
```

**Gap 2 — MagicPath 降级到 html-prototype 时的断言切换规则：**

Orchestrator 在 Phase 6 启动前需检测降级条件，并切换对应断言模板：

```bash
# 降级检测（Orchestrator 执行，不由 Work Agent 执行）
npx -y magicpath-ai whoami -o json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('id') else 1)" \
  && echo "MAGICPATH_OK" || echo "MAGICPATH_FALLBACK"
```

| 检测结果 | Phase 6 使用的断言模板 |
|---------|----------------------|
| `MAGICPATH_OK` | python3 job status 断言（见 MagicPath 断言模板） |
| `MAGICPATH_FALLBACK` | `[ -f docs/prototype/index.html ]`（本地文件断言） |

Work Agent 收到的 `skills_needed` 也需同步切换：`MAGICPATH_OK` → magicpath SKILL.md，`MAGICPATH_FALLBACK` → html-prototype SKILL.md。

**Gap 3 — MagicPath 文件名映射校验断言：**

`code start` 脚手架的文件名由平台决定，不可硬编码。断言模板：

```bash
# [BLOCKING] <ID> — MagicPath 生成文件名与 design-brief 约定组件名一致（大小写不敏感）
EXPECTED=$(grep -i "组件名\|component.*name" docs/decisions/<brief>.md | head -1 \
  | sed 's/[^a-zA-Z]//g' | tr '[:upper:]' '[:lower:]')
ACTUAL=$(ls /tmp/magicpath-<workdir>/src/components/generated/*.tsx 2>/dev/null \
  | xargs -I{} basename {} .tsx | tr '[:upper:]' '[:lower:]' | head -1)
[ "$EXPECTED" = "$ACTUAL" ] && echo "PASS <ID>" || echo "WARN <ID>: expected=$EXPECTED actual=$ACTUAL"
```

> 此断言级别设为 `[WARNING]`（非 BLOCKING），因为平台生成名称可能有合理的大小写差异，不应阻断流程，但需记录供人工确认。

**MagicPath Phase 的硬性依赖：** 必须等上游 design-brief handoff gate PASS 且降级检测完成后才能启动，绝不与任何上游 Phase 并发。

---

## 5 种编排模式

| 模式 | 适用场景 | Agent 数 | 需确认 |
|------|---------|---------|--------|
| **Solo** | 1-2 文件，低风险，无依赖 | 1（主 Agent） | 否 |
| **Sequential Chain** | 阶段强依赖，B 等 A 输出 | 1-2，串行 | 否 |
| **Parallel Fan-out** | 独立子任务，互不干扰 | 2-5，并行 | 否 |
| **Supervisor** | 需质量保证，Work+Eval 配对 | 2N（WA+EA） | 多 Phase 是 |
| **Hierarchical** | 超复杂，多域多层，不可逆 | 5+，分层 | **必须** |

**模式可嵌套：**
- Sequential 外层 + 每 Phase 内部 Parallel Fan-out
- Hierarchical 顶层 + 每个 Worker 后接 Supervisor 验证

---

## 主 Agent 决策树

```
收到任务
    │
    ├─ 单文件 / 问答 / 已有明确步骤
    │      → Solo Mode → 直接执行，不调用 Plan Agent
    │
    ├─ 2-3 文件，无依赖，可并行
    │      → Parallel Fan-out → 直接执行，不调用 Plan Agent，不进入 Orchestrator
    │
    ├─ 有阶段依赖 / ≥ 3 文件 / 不可逆
    │      → 调用 Plan Agent
    │           → Sequential Chain
    │           → 每阶段需验证？→ 加 Supervisor 配对
    │
    ├─ 多域 / 多层级 / 超复杂
    │      → 调用 Plan Agent → Hierarchical Mode → 必须等用户确认
    │
    └─ 用户说"先计划" / "plan 一下"
           → 调用 Plan Agent → 输出计划 → 展示 → 等确认
```

---

## 计划持久化输出路径

当 Supervisor 或 Hierarchical 模式，且包含 U-block 展开时，按以下优先级写入：

**路径解析顺序：**
1. 若 `docs/plans/` 存在 → `docs/plans/YYYY-MM-DD-NNN-<type>-<slug>-plan.md`
2. 降级（目录不存在）→ `./<slug>-plan-YYYY-MM-DD.md`（项目根目录）

| 字段 | 说明 | 示例 |
|------|------|------|
| `NNN` | 3位递增索引，取 `docs/plans/` 中最大索引 +1，删除不复用 | `001`, `002` |
| `type` | `feat` / `fix` / `refactor` / `implement` / `infra` | `implement`（来自 task-plan） |
| `slug` | kebab-case 任务摘要 | `crm-lead-pool` |

此路径支持跨 session 幂等查找：新 session 运行 `ls docs/plans/` 即可定位最新计划，Work Agent 按 U-ID 续点恢复。

---

## 断言模板库

每条模板示例均带有 `[BLOCKING]` 或 `[WARNING]` 级别注释头。实际使用时按业务重要程度选择。

```bash
# [BLOCKING] <ID> — 文件存在
[ -f <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 目录存在
[ -d <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 文件包含关键词
grep -q "<keyword>" <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [WARNING] <ID> — 文件不包含某词
! grep -q "<keyword>" <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 文件可执行
[ -x <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Node.js 语法合法
node --check <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Python 语法合法
python3 -m py_compile <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — YAML 合法
python3 -c "import yaml; yaml.safe_load(open('<file>'))" && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — JSON 合法
node -e "JSON.parse(require('fs').readFileSync('<file>'))" && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Shell 脚本退出码 0
bash <script> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — git 仓库存在
[ -d .git ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [WARNING] <ID> — git hooks 路径配置
git config --get core.hooksPath | grep -q "<path>" && echo "PASS <ID>" || echo "FAIL <ID>"
```
