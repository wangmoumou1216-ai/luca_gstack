---
name: office
preamble-tier: 1
version: 2.0.0
description: |
  luca_gstack 入口。向导式：先问你想做什么，推荐对应 workflow。
  展示一级可见 skill 列表，含描述和输入模式。(luca_gstack)
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
```

---

## 共享规范（所有 skill 继承，不重复写）

### Skill OS 原则

`luca_gstack` 是 Skill OS，不是强制 workflow engine。

核心原则：
- **Skill-first**：一级可见 skill 必须能直接调用，除非该 skill 自己声明只能作为下游工具。
- **Graph-optional**：workflow graph 只在用户选择流程化工作时启用。
- **Memory-light**：常规运行只加载短规则，不读长历史。
- **Growth-gated**：Hermes 自成长先进入候选池，不自动改长期 context。
- **Governance-callable**：evals / redteam / retro 可作为流程后置，也可单独调用。

执行模式：
- **Standalone mode**：用户直接点名某个 skill，或提供直接输入。只强制该 skill
  自己的输入和质量 gate。
- **Workflow mode**：用户通过 `/office` 选择推荐流程，
  或明确要求“继续流程/进入下一步”。此时检查上游 artifacts 和 handoff
  gate。

读取契约：
```
.claude/skill-os/input-modes.yaml
.claude/skill-os/optional-workflow-graph.yaml
```

Workflow gate 不得阻塞 standalone，除非该 gate 同时是质量或安全 gate。

### Voice

直接、具体、不废话。说文件名，说路径，说具体行动。
问题一次只问一个。等用户回答后才继续。
不说「我理解你的需求」。不说「让我们一起」。

### Execution Discipline（所有 skill 继承）

此规则来自 Karpathy-inspired coding discipline，作为执行纪律继承到所有 office skill。
它不是新的一级 skill，不进入 `/office` 列表，也不改变路由。

- **Think Before Coding**：不要隐藏影响方案的假设。需求、场景、输入源或约束不清时，
  先问一个会改变结果的问题；能从文件或 handoff 中查到的事实先查再问。
- **Simplicity First**：只产出当前 skill 质量 gate 要求的内容。不扩展未请求功能，
  不把 v2 想法写成 MVP，不为了“完整”增加额外流程或产物。
- **Surgical Changes**：修改原型、文档或 skill 时只触碰目标区域。不得顺手重构
  framework、路由、状态文件或无关文案；只清理本次改动造成的孤儿内容。
- **Goal-Driven Execution**：开始执行前在内部确认完成状态和验证方式；结束前用对应
  gate、脚本、读回文件或浏览器检查验证。未验证的假设必须标注为风险，不得写成结论。

### Completion Status Protocol

每个 skill 完成时，用以下之一报告：

- **DONE** — 所有步骤完成，产出文件已写入磁盘，路径已告知
- **DONE_WITH_CONCERNS** — 完成，但有具体问题需要注意（列出）
- **BLOCKED** — 无法继续。说明原因 + 已尝试的方法 + 建议的下一步
- **NEEDS_CONTEXT** — 缺少必要信息。说明具体缺什么

升级规则：同一问题尝试 3 次失败，立即 BLOCKED，不继续循环。

**标记 DONE 或 DONE_WITH_CONCERNS 之前，必须执行 Post-Completion Self-Reflection：**

对以下三个问题逐一作答（内心判断，不输出给用户）：

1. 执行中是否遇到任何**不在 get_rules.py 输出中**的约束、路径规则或格式要求？
2. 是否做出了任何**需要修正的错误假设**，导致返工或调整？
3. 是否发现了可以让下次同类任务更快/更准的**可复用模式**？

若任一为 YES → 立即运行（`--rule` 为可选，有明确规则时填写）：

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<简要描述发现了什么>" \
  --problem "<执行中遇到的隐性约束或错误假设>" \
  --correction "<下次如何避免或加速>" \
  --source self_reflection \
  [--rule "<一句可执行规则>" --applies-to <skill-name> --scenes "*"]
```

若三个问题均为 NO → 跳过，直接 DONE。无需向用户解释此步骤。

### Handoff Summary Protocol（按模式分级）

**Workflow 模式（workflow-state 有本 skill 节点）：在标记 DONE 之前，必须写 handoff
summary 文件。** 无 handoff 的 DONE 视为不完整。

**Standalone 豁免：** standalone 模式 + 轻量 skill（frontmatter `context-cost: lightweight`
或 `runtime-estimate ≤ 5000`）+ 产出为终端交付（无下游 skill 消费）→ 免写 handoff，
DONE 合法。compare / status 即此规则的既有实例。standalone 重型 skill 仍须写
（跨 session 恢复依赖 handoff）。

> 本豁免规则与 `references/handoff-protocol.md`「豁免规则」保持同步：阈值（`runtime-estimate ≤ 5000` 等）以 handoff-protocol.md 为详版真值源，改阈值须同步两处。

写入路径：`docs/handoff/YYYY-MM-DD-<topic>-<skill-name>-handoff.md`
格式规范：见 `references/handoff-protocol.md`
硬约束：≤2000 tokens（≈8000 chars）

内容必须包含：决策列表（≤8 条）、下游约束（≤5 条）、风险（≤3 条）、产出路径。
如适用：AI Native 范式判断。

**下游 skill 启动时读取上游 handoff summary，不读取上游完整 SKILL.md 或完整产出。**

### Pre-Task Context Retrieval（所有 skill 继承）

**每个 skill 启动时，在执行核心逻辑之前，自动加载历史上下文。** 这是
Ruflo hooks pre-task 模式的轻量实现。

**Step 1：加载 observability 规则（已有）**
```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>
```

**Step 2：检索上游 handoff summary（workflow 模式下）**
```bash
# 读取 workflow-state.yaml 中最新的 DONE 节点的 handoff_path
# 如果 handoff_path 非空 → 读取该文件
# 重点关注：## 约束 和 ## 风险 章节
```

**Step 3：任务相关 memory search（如有）**
```bash
python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5
```

检索范围包含 episodic summary、semantic stable facts 和 eval log 索引。只读取输出中
与当前任务直接相关的结果；如果需要展开，再按命中的 layer/path 精确读取，不全量打开
长历史文件。

**规则：**
- Step 1 和 Step 2 是必须的。Step 3 是可选的（任务需要历史经验时运行；无命中跳过）
- 如果 Step 3 找到了高相关历史成功模式，告知用户并建议复用
- Step 3 最多读取 5 条检索结果，总加载量不超过 2K tokens；Pre-Task 总加载量不超过 5K tokens
- 不读取完整 `observations.jsonl`、`run-log.jsonl`、`semantic/candidates.jsonl`、
  `semantic/reviews.jsonl` 或 `evals/eval-log.jsonl`
- `python3 memory/scripts/consolidate_memory.py --json` 只用于治理、复盘、记忆健康度检查或用户明确询问；
  普通 skill 启动不运行 consolidate
- 加载完成后不需要向用户汇报，直接进入 skill 核心逻辑

### Observability Protocol（所有 skill 继承）

目标：记录用户明确指出的问题，沉淀成下次可执行的短规则，
同时避免读取长历史污染上下文。

**启动时只热加载短规则，不读长日志：**

```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>
```

规则：
- 只读取这条命令的输出。
- 不直接读取 `observations.jsonl` 或 `run-log.jsonl`。
- 不全量读取 `rules.yaml`；必须通过 `get_rules.py` 过滤当前 skill 和 scene。
- 如果输出 `none`，继续执行。
- 如果有 active rules，必须在当前 skill 执行中遵守；
  若规则与用户最新明确要求冲突，以用户最新要求为准，
  并在收尾记录该冲突。

**用户明确指出问题时必须记录 observation：**

触发表达包括但不限于：
- 「这个不对」
- 「以后不要这样」
- 「下次记住」
- 「你又犯了」
- 「这个 skill 有 bug」
- 「这个流程有问题」
- 「不要再...」
- 「必须...」

记录命令：

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>"
```

如果用户给的是明确、可复用的未来约束，同时沉淀为 active rule：

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>" \
  --rule "<一句可执行规则>" \
  --applies-to <skill-name> [other-skill] \
  --scenes <A|B|C|D|*>
```

**收尾时记录轻量 run log：**

```bash
python3 .claude/observability/scripts/append_run_log.py \
  --skill <skill-name> \
  --status DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT \
  --output "<主要产出路径>" \
  --rules <命中的规则ID...>
```

**上下文预算红线：**
- `observations.jsonl` 是冷存储，只有 `/evals`、`redteam`、`retro` 或用户明确要求复盘时读取。
- `run-log.jsonl` 是冷存储，只有 `/evals`、`retro` 或调试历史时读取。
- `rules.yaml` 是规则库，但常规 skill 只能通过 `get_rules.py` 加载相关短规则。

### Skill 成长记录协议（可选自成长层）

用来将 skill-rule 沉淀为长期稳定规则（semantic memory domain:skill-rule）。

触发时机：
- 用户指出同类问题重复出现。
- `/evals` 或 `redteam` 发现可复用流程缺陷。
- `/retro` 形成明确下次改进动作。
- 某 skill 发生 2 次以上同类 BLOCKED / DONE_WITH_CONCERNS。
- Post-Completion Self-Reflection 发现高置信度规则。

候选写入（高置信候选，仍需 review 后晋升）：

```bash
python3 memory/scripts/propose_semantic.py \
  --domain skill-rule \
  --fact "<skill名>: <规则描述>" \
  --confidence high \
  --evidence "<来源/复现>" \
  --scope "<skill名>" \
  --reviewer "<reviewer>" \
  --tags "<skill名>,rule"
```

查询当前已有规则：

```bash
python3 memory/scripts/search_memory.py "<skill名> skill-rule" --limit 5
# 需要展开 semantic 层明细时才运行：
python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule
```

注：旧的 `.claude/hermes/scripts/*` 路径（propose_growth / review_growth / get_growth_rules）已废弃删除，不要使用；一律改用上述 `memory/scripts/propose_semantic.py --domain skill-rule` 写入、`search_memory.py` / `get_memory.py --domain skill-rule` 读取，candidate 经 memory review 晋升。

禁止：
- 自动写 `CONTEXT.md`
- 自动改 `CLAUDE.md` / `AGENTS.md`
- 自动改 skill 主规则
- 把一次性偏好晋升为长期规则

### 场景标识

所有 skill 使用统一的场景标识：
- **场景A** — 新功能设计（从零开始）
- **场景B** — 已有功能优化（现有功能改进）
- **场景C** — 线上页面评审改版（评审 → 报告 → 改版）
- **场景D** — Agent 化改造（把现有功能从"用户手动操作"变为"用户监督 Agent"）

### 产出路径约定

> 受保护产出路径的真值源见 `.claude/skill-os/skill-invariants.md` P2；本清单为速查、不含全部 glob（如 `docs/engineering/…-tech-spec.md`、`…-task-plan.md`）。新增产出路径先登记 P2，勿把本清单当完整索引。

```
docs/idea/YYYY-MM-DD-<topic>-idea.md
docs/research/deepresearch-<topic>-YYYY-MM-DD.md
docs/prd/YYYY-MM-DD-<topic>-prd.md
docs/prd/YYYY-MM-DD-<topic>-prd-ai-spec.md             ← AI Native 时条件产出
docs/prd/YYYY-MM-DD-<topic>-prd-constraints.md        ← 场景B专有
docs/research/ux-research-<topic>-YYYY-MM-DD.md
docs/decisions/YYYY-MM-DD-<topic>-ux-brainstorm.md
docs/decisions/YYYY-MM-DD-<topic>-interaction-architecture.md
docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md
docs/prototype/YYYY-MM-DD-<topic>/index.html
docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md
docs/prototype/YYYY-MM-DD-<topic>/blueprint.yaml          ← figma-demo 专有（隐藏，内部 dispatch）
docs/prototype/YYYY-MM-DD-<topic>/mapping-proof.md        ← figma-demo 专有（隐藏，内部 dispatch）
docs/prototype/YYYY-MM-DD-<topic>/requirement.md          ← figma-demo 专有（隐藏，内部 dispatch）
docs/figma/YYYY-MM-DD-<topic>/figma-spec.md
```

### 品牌与技术约束（所有 skill 强制遵守）

> ⚠ **品牌 token 唯一真值源 = `framework/shared-head.html`**（token 母版，verify.sh F6 守护、所有原型页依赖）+ 运行时镜像 `framework/tokens.css`。以下品牌色 / 字体 / 间距为**速查副本**：任何 token 变更改母版并同步本表；下游 skill 与 reference 引用 token 应指向母版、勿再复制字面值（此前多处硬编码已发生漂移）。

**品牌色：**
- 主色：`#FF8000`（Tailwind: `bg-primary / text-primary`）
- 全页限制：≤3 处

**字体四级：**

| 级别 | 场景 | 字号 | 字重 | 颜色 |
|------|------|------|------|------|
| L1 | 区块标题 | 15px (`text-15`) | 500 | #181C25 (`text-n19`) |
| L2 | 核心内容/字段值 | 13px (`text-13`) | 400 | #181C25 |
| L3 | 辅助标签/字段名 | 13px (`text-13`) | 400 | #91959E (`text-n11`) |
| L4 | 弱信息/时间戳 | 12px (`text-12`) | 400 | #91959E |

**间距系统：**
合法值：4 / 8 / 12 / 16 / 24 / 32 / 40 px
对应 Tailwind：p-1 / p-2 / p-3 / p-4 / p-6 / p-8 / p-10

**CSS Token（来自 `framework/tokens.css`）：**
```
--fx-primary: #ff8000      → bg-primary / text-primary
--fx-n19: #181c25          → text-n19（主要文字）
--fx-n11: #91959e          → text-n11（次要文字）
--fx-n05: #dee1e8          → border-n05（分割线）
--fx-page-bg: #eff1f3      → bg-page-bg
```

**原型技术栈：** 纯 HTML + 本地 Tailwind CDN（`framework/assets/vendor/tailwindcss.com.js`）+ 原生 JS
**可用母版（5个）：** 列表页 / 详情页（两列）/ 详情页（三列）/ 表单页 / 首页/仪表盘。AI速记入口页 / 录音工作页当前无整页母版，需走局部改动/独立组件或先补齐母版。（母版清单以本处为唯一真值源；design-brief / figma-demo / html-prototype 引用勿复述，补齐新母版只改此处。）
**图标：** 先查 `framework/assets/icons/`，找不到则如实说明缺图标、不臆造（原隐藏图标检索工具 fx-icon-search 已于 commit 5aa61a7 删除，勿调用）

---

## /office — 向导式入口

处理 `/office` 命令时，**必须完整读取并执行** `references/office-wizard.md`（含 Step 1-3 向导流程与一级 Skill 列表）。其他 skill 的共享规范到此为止，无需读取向导文件。

<!-- FILE_END: office/SKILL.md -->
