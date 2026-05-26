# CLAUDE.md — luca_gstack 项目配置

This file is read by Claude Code at the start of every session.

---

## Routing Contract TL;DR

1. Project Gate first: 老项目 / 已有项目 / 继续项目 → 先确认或切换项目。
2. Complexity second: 复杂需求 → Plan Agent，不进单个 skill。**即使 route-guard 高置信命中 skill，仍须检查 Plan Agent 4条件；满足任一不得直接执行。**
3. Ambiguity third: 多候选 → 问用户，不自行判断。
4. Single skill last: 只在高置信且不触发 Plan Agent 的前提下调用 skill。
5. Keyword source: `.claude/skill-os/skill-routing-map.yaml`。

---

## 核心行为原则

**并发原则：** 所有相互独立的工具调用必须在同一条消息中并发执行，不得串行等待。

**最小文件原则：** 不创建任何非任务必要的文件；优先编辑已有文件，而非新建。

**读前先写原则：** 编辑任何文件前，必须先用 Read 工具读取当前内容，再 Edit。

**最小注释原则：** 默认不写注释；只在"为什么这样做"不明显时写一行说明。

### Coding Discipline（Karpathy-inspired）

适用范围：写代码、改文档、改 skill、review、refactor、原型文件修改。
这不是新的一级 skill，不加入 `/office`，也不进入 `skill-routing-map.yaml`。

- **Think Before Coding**：不要替用户静默选择高影响解释。假设会影响输出或风险时先说清；
  多个合理解释并存时先问一个关键问题。
- **Simplicity First**：实现当前请求所需的最小方案；不添加未请求的功能、配置、
  抽象层或兜底逻辑。简单任务可简化流程，但不能扩大 scope。
- **Surgical Changes**：只改和目标直接相关的行；不顺手重构、格式化、改注释或删除
  既有死代码。只清理本次改动新产生的孤儿 import / 变量 / 函数。
- **Goal-Driven Execution**：执行前明确完成状态；实现后用测试、脚本、读回文件或
  可观察检查验证。每个非平凡改动都应能追溯到用户请求或验证标准。

**Plan Agent 原则：** 满足以下任一条件时，在执行前先读取
`.claude/agents/plan-agent.md`，输出结构化计划（阶段分解 + 编排模式 +
断言列表），复杂任务（Supervisor/Hierarchical 模式）
暂停等用户确认后再执行：
- 任务涉及 ≥ 3 个文件的创建或修改
- 任务需要 ≥ 2 个独立 subagent 协作
- 任务有明确的阶段依赖（B 必须等 A 完成）
- 任务涉及不可逆操作（git 操作、文件批量覆盖）

---

## Context 工程协议

> Context 窗口是有限资源。主 Agent 必须主动管理，防止溢出导致状态丢失。

### 触发 Checkpoint 的条件（满足任一即写）

- 当前 session 已启动 ≥ 2 个重型 Agent（每个 runtime > 5K tokens）
- 多 Phase 任务完成一个 Phase 后
- 即将执行不可逆操作（git push、批量文件覆盖）前
- 感知到 context 已消耗约 60%（以对话轮数 > 20 作为近似指标；route-guard 在第
  20 轮起、每 10 轮自动提醒（无上限））

### Checkpoint 写法

写入 `docs/handoff/YYYY-MM-DD-<topic>-checkpoint.md`，必须包含：
1. **已完成**：每项用 ✅ 标注，列出具体文件和验证结果
2. **进行中**：Agent ID（如已失效注明）、负责内容
3. **待执行**：剩余任务的具体描述
4. **关键决策**：本 session 做过的重要判断（不可从代码推导的）
5. **恢复指令**：新 session 应该执行什么命令/读什么文件来接续

### PROGRESS.md — 实时任务进度

**触发条件：** 执行多 Phase 长任务时（≥ 3 个 Phase），在任务开始时初始化
`docs/PROGRESS.md`，每完成一个 Phase 后更新。

**更新规则：**
- 每完成一个 Phase → 移入"已完成 ✅"，更新 Last updated 时间戳
- 遇到卡点/决策 → 记录在"进行中 🔄"的说明内
- session 结束前 → 更新"恢复指令"

**session-restore.mjs 在每次启动时自动读取并显示前 25 行，无需手动操作。**

格式参见 `docs/PROGRESS.md` 模板。

### 懒加载原则（节省 context）

- 不在 session 开头一次性读取所有文件
- 只在真正需要某文件内容时才 Read
- 长文件（> 200 行）先读前 50 行确认结构，再按需读具体段落
- Agent 的 prompt 只传入它实际需要的上下文，不传完整会话历史

### Agent Context 预算

| Agent 类型 | 推荐 prompt 长度 | 原则 |
|-----------|----------------|------|
| Explore Agent | < 500 tokens | 只给搜索目标，不给背景 |
| Work Agent | < 2000 tokens | 给精确任务 + 必要文件路径，不给决策背景 |
| Eval Agent | < 1000 tokens | 只给断言列表 + 文件路径 |
| Plan Agent | < 1500 tokens | 给任务描述 + 约束，不给执行细节 |

### Compact 触发规则

- 完成一个完整 Phase 后，如果接下来还有 ≥ 2 个 Phase，执行 `/compact`
- 超过 30 轮对话后，在下一个 Phase 开始前执行 `/compact`
- Compact 前必须先写 Checkpoint（确保状态不丢失）

### 新 Session 恢复协议

1. 读 `docs/handoff/` 中最新的 checkpoint 文件
2. 运行 `bash scripts/verify.sh` 确认当前文件状态
3. 从 checkpoint 的"待执行"继续，不重复已完成项

---

## 三层记忆系统

> 渐进式记忆，模仿 Hermes 自成长机制。懒加载优先，避免 session 开头全量读取。

### 三层结构

| 层 | 何时读 | 何时写 | 数据源 |
|---|---|---|---|
| Episodic | session 摘要/任务相关检索命中时 | session 结束后 | `memory/episodic/index.jsonl` |
| Semantic | session 摘要/任务相关检索命中时 | 候选通过 review 后晋升 | `memory/semantic/promoted-facts.yaml` |
| Procedural | ~~已并入 Semantic domain:skill-rule~~ | — | `get_memory.py --layer semantic --domain skill-rule` |

### 读取协议（懒加载）

```bash
# session 启动时自动运行（session-restore.mjs 已集成）
python3 memory/scripts/get_memory.py --summary

# 任务相关历史优先用自然语言精细检索，限制结果数量
python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5

# 需要读取某一层明细时再按需调用
python3 memory/scripts/get_memory.py --layer episodic --limit 3
python3 memory/scripts/get_memory.py --layer semantic --domain crm
# Procedural 已并入 semantic，按 domain 过滤
python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule

# 只有治理、复盘、用户询问记忆健康度时运行；默认 dry-run 只读
python3 memory/scripts/consolidate_memory.py --json
```

规则：
- 启动协议只使用 `get_memory.py --summary`，不得全量读取 episodic/semantic/eval 长历史。
- 具体任务优先运行 `search_memory.py "<task/skill/topic>" --limit 5`，再决定是否读取命中的层或文件。
- `get_memory.py --layer ...` 只用于明确需要某层内容时；不得替代任务相关检索。
- `consolidate_memory.py --json` 是治理入口，默认只读 dry-run；普通 skill 启动不运行。
- 不直接读取 `memory/episodic/index.jsonl`、`semantic/candidates.jsonl`、`semantic/reviews.jsonl`、`evals/eval-log.jsonl` 等长文件，除非进入治理/复盘/调试场景。

### 写入协议

**Episodic**（session 结束时，由 agent 或用户触发）：
```bash
python3 memory/scripts/append_episode.py \
  --topic "任务名称" --summary "本次做了什么" \
  --skills "html-prototype" --outcomes "docs/prototype/xxx.html" \
  --decision "选择X方案而非Y，原因是..." \
  --next-risk "下次需要注意..."
```
`--decision` 和 `--next-risk` 为可选；有非显而易见判断时必填，纯执行型任务可省略。

**Semantic**（发现新 CRM/FxUI 事实时只写候选；稳定事实必须带证据并等待 review 晋升）：
```bash
python3 memory/scripts/propose_semantic.py \
  --domain crm --fact "事实描述" --confidence high \
  --evidence "来源路径或用户反馈" --scope "适用范围" --reviewer "reviewer"
```

**Procedural → 已并入 Semantic（domain: skill-rule）**

Skill 执行规则先作为 semantic candidate 写入，domain 固定为 `skill-rule`；review 通过后才晋升为 stable fact：
```bash
python3 memory/scripts/propose_semantic.py \
  --domain skill-rule \
  --fact "html-prototype: framework/ 路径必须绝对引用，否则资源加载失败" \
  --confidence high \
  --evidence "复现/来源" --scope "html-prototype" --reviewer "reviewer" \
  --tags "html-prototype,framework"
```

### 关键约束速查（Static Fallback — 脚本失败时此节仍有效）

> 以下为 semantic memory 的静态副本，脚本可用时以 promoted-facts.yaml 为准；
> 脚本不可用时此节优先。

- [SF-001 / crm] 纷享销客品牌主色 #FF8000（橙色）、背景色 #EFF1F3、文字色 #181c25
- [SF-002 / fxui] HTML 原型必须基于 framework/ 目录母版，framework/ 为只读保护区不得直接修改
- [SF-003 / workflow] Skill-first, Graph-optional 架构：每个 skill 默认 standalone 可用，
  Workflow 仅在用户主动选择流程时启用
- [SF-004 / fxui] FxUI 组件库基于 framework/ 母版：list-page、detail-2col、detail-3col、
  form-page、home-page 五种布局
- [SF-005 / crm] 纷享销客产品设计场景四类：A=新功能、B=已有功能优化、
  C=线上评审改版、D=Agent化改造

- [SC-20260520-002 / skill-rule] brainstorm: 苏格拉底拷问顺序必须从用户目标出发，
  不得从技术方案出发

- [SC-20260522-001 / skill-rule] task-plan: Phase 6 任务卡必须包含「读取清单」字段，将每个来源节点（REQ/STATE/DEC）映射到原始文档的具体节路径；plan-agent U-block 必须携带 Read List；WA 执行时定向读指定节，不读全文，发现矛盾触发 NEEDS_CONTEXT

- [SC-20260523-001 / crm] CRM objects use stable IDs

- [SC-20260523-002 / skill-rule] route-guard: 老项目/已有项目/继续项目必须先触发 Project Gate，列出或确认项目；不得直接解释为场景B已有功能优化或进入单个 skill

- [SC-20260523-003 / skill-rule] memory: 稳定事实不得直接写 promoted-facts.yaml；必须先写 semantic candidate，经过 consolidate/review 的 promotion_ready 门禁后才能晋升；普通启动只用 summary/search，治理时才运行 consolidate_memory.py --json

> 维护规则：每次 promoted-facts.yaml 新增一条 stable fact，
> 同步在此节追加一行，格式 `- [ID / domain] 内容`。

> 详细脚本用法见 memory/README.md

---

## 强制读完规则（全局）

**在执行任何任务之前，必须完整读完所有被指定的 skill 文件和上下文文件。**
每个文件必须读到最后一行，包括末尾的 `<!-- FILE_END: xxx -->` 标记。
**判断标准：能否复述文件最后一节的内容？不能 → 还没读完。**

---

## luca_gstack

本项目使用 luca_gstack skill 集。skill 集位于 `.claude/skills/office/`。

**架构原则：Skill-first, Graph-optional。**

**环境/项目剥离原则：**
`luca_gstack` 是运行环境，只保留 skills、hooks、framework、scripts、memory 和
observability。项目产出和项目状态属于当前激活项目，固定放在
`/Users/luca/Desktop/项目/<项目名>/`。

- `docs/` 必须是 symlink，指向当前项目的 `docs/`。
- `.claude/workflow-state.yaml` 必须是 symlink，指向当前项目的 `.luca/workflow-state.yaml`。
- `.claude/current-topic.txt` 必须是 symlink，指向当前项目的 `.luca/current-topic.txt`。
- 切换项目必须使用 `scripts/project.sh switch <项目名>`，并运行
  `npm run check:project-links` 验证 docs/state 指向同一项目。
- `memory/**` 和 `.claude/observability/**` 是跨项目经验层，不随项目切换。

`luca_gstack` 是 Skill OS，不是强制 workflow engine：
- 每个一级可见 skill 默认可以 standalone 使用，除非对应 `SKILL.md` 明确声明只作为下游工具。
- Workflow 只在用户选择流程化工作时启用，用于推荐路径、handoff gate、
  状态恢复和下游建议。
- Workflow gate 不得阻止 standalone skill，除非该 gate 同时也是质量或安全 gate。
- skill 之间通过 `docs/**` artifacts、稳定 ID 和 output path 协作。
- 具体输入模式以 `.claude/skill-os/input-modes.yaml` 为准；可选编排以
  `.claude/skill-os/optional-workflow-graph.yaml` 为准。

**全局共享规范读取：**
每次 session 启动后，如果用户涉及任何 skill 操作，先读取：
`.claude/skills/office/SKILL.md`（包含 Voice/Completion Status/品牌约束等共享规范）

**一级可见 skill 列表（斜杠命令）：**

| 命令 | 适用场景 | 用途 |
|------|---------|------|
| `/office` | — | 显示一级可见 skill |
| `/auto` | A B C D | **全自动多 Agent 编排**：自然语言需求 → 自动 Skill Pipeline → 并行执行 → 聚合产出 |
| `/idea` | A B | 需求方向确认 |
| `/deepresearch` | A B D | 多 Agent 深度研究（产出研究报告，可作为 brainstorm 输入）|
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD（替代原 /prd）|
| `superpowers:brainstorming` | A B | 轻量设计文档（superpowers plugin，/brainstorm 的轻量替代）|
| `/ux-research` | A B D | 多维度UX深度研究（5+1并行agent，共识矩阵，苏格拉底审查）|
| `/ux-brainstorm` | A B D | UX设计方案编排器（7个UX逼问，2-3方案，Oracle审查）|
| `/design-brief` | A B C D | 轻量交互文档与原型决策节点 |
| `magicpath` | A B C D | **MagicPath 界面产出（设计产出首选）**：需求描述 → React canvas 组件 |
| `/html-prototype` | A B C | HTML 原型生成（设计产出备选，MagicPath 不可用时） |
| `/figma-demo` | A B C D | 口述 + Figma → HTML 演示 Demo 编排器 |
| `/ux-audit` | B C | UX 评审（多选模块） |
| `/compare` | A B C D | 方案/版本/截图对比 |
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | 工程规格节点：PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：渐进式索引 + 断言矩阵 + 开发/测试任务卡，执行前必须通过门禁 |

**隐藏/高级 skill：** `challenge`、`handoff-review`、`design-review`、`taste-review`、
`redteam`、`evals`、`retro`、`careful`、`fx-icon-search`。
这些不作为一级斜杠命令暴露，不在 `/office` 展示，不主动推荐；需要时由
agent 直接读取对应 skill 文件。
**兼容语义：** 用户说「写 PRD」时路由到 `/brainstorm`；不再暴露独立 `/prd` 命令。

**场景说明：A = 新功能设计，B = 已有功能优化，C = 线上评审改版，D = Agent
化改造（把现有功能从"用户手动"变为"用户监督 Agent"）**

> 完整触发词表见 .claude/skill-os/skill-routing-map.yaml

---

## 路由层级（优先级由高到低）

route-guard 在每次 UserPromptSubmit 时自动评分，Claude 必须遵守输出的路由决策：

| 层级 | 触发条件 | Claude 行为 |
|------|---------|------------|
| **项目上下文门禁** | route-guard 输出 `PROJECT GATE` | 先确认/切换项目；“老项目/已有项目/继续项目”不得直接进入场景B或单个 skill |
| **Plan Agent 层** | route-guard 输出 `PLAN MODE`（复杂度分 ≥ 6）**或** route-guard 输出 `PLAN CHECK`（命中重型 skill）**或** 命中 skill 已知满足 Plan Agent 4条件之一 | 读取 `.claude/agents/plan-agent.md`，输出 Phase 计划，等用户确认后进入 Orchestrator |
| **Multi-Skill 层** | route-guard 输出多候选（置信度低，无法自动决策）| 向用户列出候选 skill 组合，询问确认顺序后依次执行；或建议 `/auto` |
| **Single-Skill 层** | route-guard 输出单一高置信命中，**且** 命中 skill 不触发 Plan Agent 4条件 | 直接调用对应 skill |
| **低置信兜底** | route-guard 输出 `STOP`（零关键词命中）| 必须先问用户选哪个 skill，禁止自行判断 |

**严禁：** 忽略 route-guard 的 `PLAN MODE` 输出而直接路由到单个 skill。

---

## Skill 调用规则

**当用户说以下内容时，主动调用对应 skill：**

先执行项目上下文门禁。只有门禁通过后，才按以下触发词进入 skill 路由。

- 「全流程」「自动做」「auto」「一键」「完整设计」「功能设计」
  「端到端」「全套方案」「CRM/商机/客户管理 + 设计类词」→ `/auto`（多
  skill 组合时优先于单个 skill）
- 「需求分析」「有个想法」「原始想法」「需求确认」「功能方向」→ `/idea`
- 「写 PRD」「产品需求」「brainstorm」「需求文档」「需求梳理」→
  `/brainstorm`（注：`需求分析` 路由到 `/idea` 不到 `/brainstorm`）
- 「快速梳理」「轻量PRD」「quick brainstorm」「简单需求梳理」「superpowers
  brainstorm」→ `superpowers:brainstorming`（通过 Skill tool 调用）
- 「深度研究」「调研」「research」→ `/deepresearch`
- 「看看竞品」「竞品分析」「UX研究」「设计调研」→ `/ux-research`
- 「设计方案」「UI 方案」「设计brainstorm」→ `/ux-brainstorm`
- 「轻量交互文档」「原型决策」「design brief」「方案落地」→ `/design-brief`
- 「figma demo」「演示 demo」「口述做原型」「汇报用原型」→ `/figma-demo`
- 「做界面」「产出界面」「界面设计」「UI设计」「MagicPath」「生成组件」
  → `magicpath`（**设计产出首选**）
- 「做个原型」「生成 HTML」「本地原型」→ `/html-prototype`（备选）
- 「评审这个页面」「UX 问题」→ `/ux-audit`
- 「Figma」「保险层」→ `/figma-layer`
- 「工程规格」「技术文档」「tech spec」「engineering spec」「技术合同」
  「开发规格」→ `/tech-spec`
- 「任务编排」「任务计划」「开发计划」「task plan」「拆任务」
  「任务拆解」「编排任务」→ `/task-plan`
- 「状态」「进度」「做到哪了」「当前状态」「工作流状态」→ 状态工具意图（运行 `scripts/status.sh` 或读取 workflow-state），不是一级 skill
- 「对比」「compare」「版本对比」「两个方案比较」「迭代对比」→ `/compare`
隐藏/高级 skill 不做主动入口；除非用户明确要求使用某个高级 skill，
否则优先路由到上面的一级可见 skill。

**不得直接回答用户请求而绕过对应 skill。Skill 有专门的执行流程。**

### 内置 Skill 路由（全局安装，非项目 skill）

`route-guard.mjs` 会在用户每次输入时自动匹配并输出提示。以下规则与 hook
保持同步，Claude 应遵守：

| 用户意图 | 内置 Skill |
|---------|-----------|
| 搜索/查一下/联网/网页/爬取 | `web-access` |
| 截图/浏览网站/访问网页/浏览器操作 | `agent-browser` |
| 飞书消息/发消息/群聊 | `lark-im` |
| 日历/日程/会议/预约 | `lark-calendar` |
| 飞书文档/创建文档 | `lark-doc` |
| 飞书wiki/知识库 | `lark-wiki` |
| 飞书表格/多维表格 | `lark-sheets` |
| 飞书云盘 | `lark-drive` |
| 妙记/会议记录 | `lark-minutes` |
| 飞书Base/多维表格 | `lark-base` |
| 飞书任务/任务管理 | `lark-task` |
| Excel/xlsx/电子表格 | `xlsx` |
| PPT/pptx/幻灯片 | `pptx` |
| PDF/读取PDF | `pdf` |
| Word/docx | `docx` |
| Claude API/Anthropic SDK/接入Claude | `claude-api` |
| 有没有skill/找个skill/安装skill | `find-skills` |
| 改settings/配置权限/hook配置/添加权限 | `update-config` |
| 前端幻灯片/交互演示 | `frontend-slides` |

**自动提示机制：** `route-guard.mjs` 在每次 `UserPromptSubmit` 时读取用户 prompt，
关键词匹配后输出路由提示给 Claude。完整关键词表见
`.claude/skill-os/skill-routing-map.yaml`。

**自动 Checkpoint 提醒：** route-guard 追踪每 session 的对话轮数，在第 20 轮起每
10 轮自动提醒执行 `/compact` 或写入 Checkpoint。

---

## Session 启动协议（每次 Claude Code 启动必须执行）

**按顺序执行以下步骤：**

0. **读取 memory summary**（轻量历史索引）
   - 运行 `python3 memory/scripts/get_memory.py --summary`
   - 只看摘要，不读取 memory 长文件
   - 第一条用户任务明确后，优先运行
     `python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5`
     做任务相关检索

1. **读取 `CONTEXT.md`**（长期项目约束）
   - 特别注意「红线」节，红线约束当前 session 的所有操作

2. **读取 `.claude/workflow-state.yaml`**（流程状态恢复）【C-04 修复】
   - 检查 `topic` 和 `scene` — 确定当前项目的上下文
   - 扫描各节点的 `status` — 了解流程执行到哪一步
   - 如果有节点状态为 `IN_PROGRESS` — 告知用户「上次 session 在 {节点名}
     中断，是否继续？」
   - 如果 `iteration ≥ 3` — 告知用户「handoff-review 已连续失败 {N} 次」

3. **读取上游 handoff summary**（跨 session 状态传递）
   - 如果 workflow-state 中有 DONE 的节点 → 读取 `docs/handoff/` 中最新的 handoff summary
   - 如果 handoff 文件不存在或 `docs/handoff/` 为空 → 跳过此步，继续执行第 4 步，不报错
   - handoff summary 包含上游的决策、约束和风险，下游 skill 必须遵守其中的约束
   - **不读取上游完整 SKILL.md 或完整产出文件**（用 handoff summary 替代）

4. **读取全局 `.claude/skills/office/SKILL.md`**（共享规范）
   - 仅在用户涉及 skill 操作时执行
   - 如果执行具体 skill，按 Observability Protocol 运行
     `.claude/observability/scripts/get_rules.py <skill-name> <scene>`，只加载输出的短规则
   - 如果需要历史经验，使用
     `memory/scripts/search_memory.py "<skill/topic>" --limit 5`，不要读取长日志或完整历史

5. **项目上下文门禁**（第一条用户消息后执行，任何 skill 运行前必须通过）

   读取 session-restore 的项目列表，按顺序判断：

   **① 有激活项目 + 消息中无其他项目名**
   → 静默继续；有任务直接做，无任务才说一句「当前项目: {name}」

   **② 消息中包含已有项目名**（匹配项目列表某一项）
   → 提示切换：「切换到 {name}」→ 用户确认后执行 `./scripts/project.sh switch {name}` → 继续

   **③ 消息描述新项目/新需求/新功能，或直接调用了 skill（`/brainstorm` `/idea` `/auto` 等）且没有明确当前项目**
   → 新项目信号；从描述/skill 参数推断候选名（如"商机管理" → "crm-bizop"）
   → 一句话确认：「这是新项目，建议叫 {name}，确认？」
   → 用户确认（或给出其他名字）→ `./scripts/project.sh new {name}` → 执行原始请求

   **④ 用户说老项目/已有项目/继续项目但没有项目名**
   → 列出现有项目，让用户选择。不得把“老项目”直接解释为场景 B「已有功能优化」。

   **⑤ 无激活项目 + 无法判断**
   → 问：「新项目还是继续老项目？」

   **规则：禁止自动创建 `default`；确认步骤最多 1 句话；中文项目名 OK**

**启动后不需要主动汇报以上步骤，
除非发现需要用户知道的重要状态（如中断恢复、连续失败告警）。**

## Orchestrator 模式

当用户通过 `/office` 选择推荐流程，
或说"继续流程/进入下一步/从断点恢复"时，进入 Orchestrator 模式。
详细规范见 `.claude/agents/orchestrator.md`。

**关键约束：**
- Orchestrator 是主 session 的行为模式，**不是** subagent dispatcher
- skill 内部可以自由使用 subagent（deepresearch/brainstorm/ux-research/figma-demo 都有内部 subagent）
- 每个 skill 完成后必须写 handoff summary（见 `.claude/skills/office/references/handoff-protocol.md`）
- 连续执行 2 个重型 skill（runtime > 20K tokens）后，建议 compact 或新 session
- **每个 Phase/Skill 完成后执行观察提取**（Hermes-lite）：检查 non-obvious
  blocker、重复风险、未记录约束 → 满足任一则
  `propose_semantic.py --domain skill-rule`（详见 orchestrator.md §2c-obs）

## Optional Workflow Graph（当前为协议层）

各 skill 的 preamble 中有 `SPAWNED_SESSION` 检测逻辑。当前系统中没有强制
Orchestrator 会设置 `LUCA_SPAWNED` 环境变量，此机制不会被触发。

**保留原因：** 为可选 workflow graph / 子任务调度模式预留。当前所有一级
skill 均以交互模式（用户直接触发）为主。

执行原则：
- 用户直接点名某个 skill → standalone mode 优先。
- 用户选择 `/office` 推荐流程或明确说“按流程走” → workflow mode。
- workflow mode 可以检查上游产物、状态和 handoff gate。
- standalone mode 只要求该 skill 自己的输入和质量 gate，不强制补齐完整上游链路。

---

项目根目录的 `CONTEXT.md` 是跨 session 的长期项目约束文件；精细历史检索优先走
`memory/scripts/search_memory.py`。

**写入时机：**
- 高级 retro 复盘发现有价值的操作改变 → 追加到 CONTEXT.md
- `/design-brief` 完成后 → 追加原生AI思维小结和假设风险
- 任何设计假设被推翻 → 追加到 CONTEXT.md
- 品牌/技术约束有新发现 → 追加到 CONTEXT.md

稳定事实写入不直接修改 `CONTEXT.md` 或 `promoted-facts.yaml`。先运行
`memory/scripts/propose_semantic.py` 写 candidate，再通过 review / consolidate 治理晋升。
需要检查记忆治理队列时运行 `python3 memory/scripts/consolidate_memory.py --json`；
该命令默认作为只读 dry-run 使用，不属于普通 session 启动步骤。

---

```
□ framework/ 目录存在且包含所有母版？（html-prototype 必须）
□ brand-tokens.md 存在且非空？（html-prototype 必须）
□ Figma MCP 已连接？（figma-layer 必须）
```

---

## 产出目录结构

```
项目根目录/
  CLAUDE.md               ← 本文件
  CONTEXT.md              ← 长期记忆（跨 session）
  brand-tokens.md         ← 品牌色 token
  framework/              ← HTML 母版（只读）
    tokens.css
    list-page.html
    detail-page-2col.html
    detail-page-3col.html
    form-page.html
    home-page.html
    shared-head.html
    README.md
    assets/             ← 图片 / JS 资源
  .claude/
    commands/             ← 斜杠命令入口（每个文件一行）
    skill-os/             ← Skill OS 输入模式与可选 Workflow Graph 协议
    observability/        ← skill 反馈、短规则、运行流水（长日志默认不读）
    hermes/               ← 候选自成长记录与受控晋升规则
    workflow-state.yaml   ← symlink 到当前项目 .luca/workflow-state.yaml
    current-topic.txt     ← symlink 到当前项目 .luca/current-topic.txt
    skills/
      office/             ← luca_gstack skill 集
  docs/                   ← symlink 到当前项目 docs/；skill 产出不保存在 luca_gstack 本仓
    idea/
    prd/
    research/
    decisions/
    prototype/
    figma/
    review/
    PROGRESS.md          ← 实时任务进度（多Phase任务使用，session-restore自动读取）
    handoff/             ← 跨 skill/session 交接文件（Checkpoint 协议）
    adr/                 ← 架构决策记录
    engineering/         ← 工程文档（tech-spec 产出）
    evals/               ← 隐藏/高级工具产出
    retro/               ← 隐藏/高级工具产出
    redteam/             ← 隐藏/高级工具产出
```

---

## 规则优先级体系

1. **用户最新明确请求** — 最高优先级
2. **当前 agent runtime 的 system/developer 安全与工具约束**
3. **项目红线与项目上下文门禁**
4. **route-guard 层级决策** — Project Gate → Plan Agent → Multi-Skill → Single-Skill → STOP
5. **具体 Skill 文件**（`.claude/skills/office/*/SKILL.md`）— 执行步骤和质量 gate
6. **本文件与 AGENTS.md** — Claude/Codex 的执行适配层，必须保持同一套路由语义

**冲突处理：** 同一件事有多条规则时，以描述更详细、约束更严格的那条为准。

---

## 模型路由

| 任务类型 | 建议 |
|---------|------|
| 所有 skill 执行 | Claude Sonnet（默认） |
| 复杂设计决策分析 | Claude Opus（如有配额） |

<!-- FILE_END: CLAUDE.md -->
