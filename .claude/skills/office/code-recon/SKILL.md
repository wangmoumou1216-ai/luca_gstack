---
name: code-recon
preamble-tier: 1
version: 1.0.0
description: |
  Brownfield「从现有代码起步」的正门 skill：把一个已有代码库逆向成一份**设计可消费的架构 brief**，
  再作为输入喂给设计管线（ux-brainstorm / design-brief / tech-spec）。补齐 pipeline 缺的入口——
  现有 skills 默认从需求/语料起步，没有「先读懂现有代码再在其上做产品设计」的正门。
  **native-first, 零新依赖**：默认用并行只读 recon agent 逆向；只有代码库大到原生 recon 太贵/看不全跨模块耦合时，
  才**提示**（不硬装）在**那个下游项目**装 codegraph MCP。
  边界：不是 code-hygiene（清理）、不是 systematic-debugging（根因）、不是 deepresearch（联网研究）。
  只读 recon——**绝不修改被 recon 的代码**。(luca_gstack)
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Agent
  - Write
context-cost:
  self: 3600
  runtime-estimate: 18000
  shared-refs: [none]
  recommended-model: guided-execution  # 并行 recon 派发 + brief 合成；判断密度中等
---

## 定位（先读）

**Brownfield 正门**：`已有代码 → 理解结构 → 产出架构 brief → 喂设计管线 →（确认后）继续生成代码`。
本 skill 只负责**理解 + 产出 brief** 这一步，不做设计、不写实现代码。

与既有能力的边界（**不重复**）：
- `code-hygiene`=对代码做清理 + 完成前验证，**改代码**；本 skill 只读、只产 brief，正交。
- 全局 `systematic-debugging`=根因排查一个具体 bug；本 skill 是**全局架构理解**，非定点排障。
- `deepresearch`/`ux-research`=联网/竞品研究外部信息；本 skill 只看**本地这份代码**。
- `tech-spec`/`task-plan`=索引**需求/设计文档**（RTM）；本 skill 索引**代码结构**，是它们的上游输入。
- `muse-loop-orchestrate` 的 "map"=需求映射；本 skill 的 map=**代码结构**映射，命名近但对象不同。

下游消费：产出的 brief 作为 `ux-brainstorm` / `design-brief` / `tech-spec` 的 **optional 输入 artifact**
（见 `input-modes.yaml` 各自 optional 里的 `architecture_brief`）——设计基于真实代码，而非凭空。

## Preamble (run first)

```bash
_ROOT=$(pwd)
echo "TARGET_ROOT: $_ROOT"
_BRANCH=$(git branch --show-current 2>/dev/null || echo "not-a-git-repo")
echo "BRANCH: $_BRANCH"
# 规模探针（Phase 1 用）：源文件数 + 粗 LOC。排除 vendor/构建产物。
_FILES=$(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
  -o -name '*.py' -o -name '*.go' -o -name '*.rs' -o -name '*.java' -o -name '*.swift' \
  -o -name '*.kt' -o -name '*.rb' -o -name '*.cs' -o -name '*.php' -o -name '*.c' -o -name '*.cpp' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' \
  -not -path '*/.build/*' -not -path '*/vendor/*' 2>/dev/null | wc -l | tr -d ' ')
echo "SRC_FILES: $_FILES"
python3 .claude/observability/scripts/get_rules.py code-recon "*" 2>/dev/null || true
```

---

## Phase 0：确认目标与设计意图（必问一次）

AskUserQuestion（或在 agent 自调用时按上下文确定）：

> 1）要读懂哪个代码库？（路径，默认=当前目录）
> 2）读懂之后**想在其上加什么产品设计/功能**？（decides recon 的重点——扩展点该往哪看）
> 3）范围：全仓，还是某个模块/子目录？

有明确设计意图时，recon 的「扩展点」维度要围绕它展开（"要加 X 该在哪插、会碰哪些现有面"）。

**确定 `<topic>`（供 Phase 3/5 产出文件名 `<date>-<topic>-architecture-brief.md` 用）：** 优先读
`.claude/current-topic.txt`；为空则从「仓名 + 设计意图」派生一个 2-4 词 kebab-case topic
（如仓名 `acme-crm` + 意图"加导出" → `acme-crm-export`）。**同一代码库固定复用同一 topic**，
保证 brief 文件名稳定、下游 ux-brainstorm/design-brief 按名可匹配 `architecture_brief`。

---

## Phase 1：规模探针 + 路径决策（native vs codegraph MCP）

用 Preamble 的 `SRC_FILES`（源文件数）按**升级信号**判路径。**注：** signal #1 的「LOC」半支
Preamble 未预算，需要时现算（如 `git ls-files | xargs wc -l`）；文件数已过 ~400 阈值即可直接判定、
不必等 LOC。

**默认 native recon。** 命中 **≥ 2 条**信号才建议 Path B（下游装 codegraph MCP）：

| # | 升级信号 | 判据 |
|---|---|---|
| 1 | 规模 | > ~30K LOC 或 > ~400 源文件（原生一遍读+Explore 覆盖不全/太烧 token）|
| 2 | 陌生度 | 非自己写、无上下文的大仓 |
| 3 | 重复性 | 同一仓要跨多 session 反复查结构（持久索引才摊得平建图成本）|
| 4 | 耦合可见性 | 强类型语言、耦合走 import/call（tree-sitter 看得见）。**反例**：若耦合走 subprocess 字符串/配置值（如 gstack 自身），codegraph 也看不见——**别装，老实读** |

- **未命中（小库/自己的/一次性/隐式耦合）** → 直接 Phase 2 native recon，不提工具。
- **命中 ≥2** → 先在 brief 顶部**提示**建议 Path B（见 Phase 4），给命令，**但不硬装**；
  仍继续 native recon 作为兜底（codegraph 未就绪也能出 brief）。

---

## Phase 2：并行 recon（native 默认）

fan-out 只读 recon agents（`Agent` tool，Explore 类型，只读），按维度并行，每个只给**搜索目标 + 路径**，
不给会话历史（Explore Agent context 预算 < 500 tokens）。建议维度：

1. **入口 & 运行形态**：main/入口文件、启动脚本、构建产物、进程/服务形态
2. **模块划分**：顶层目录/包的职责，谁依赖谁（粗依赖图，读 import/require/package 声明）
3. **关键流程**：1-3 条核心用户/数据流程，端到端经过哪些文件
4. **数据模型**：核心实体/表/结构体，状态存哪（DB/文件/内存）
5. **扩展点**：围绕 Phase 0 的设计意图——"要加 X 功能，该在哪插、会碰哪些现有面、有无现成扩展位"

每个 agent 返回时**诚实标注 VERIFIED（读到实证）vs INFERRED（推断）**——复用 gstack-map 的诚实审计习惯，
不把推断当事实。

---

## Phase 3：合成架构 brief

把各 recon agent 的返回合成一份 brief（先 `mkdir -p docs/engineering`），写：
`docs/engineering/<YYYY-MM-DD>-<topic>-architecture-brief.md`

结构：
- **一句话定性**：这是个什么系统、什么形态、什么栈
- **入口 & 运行形态**
- **模块图**（谁依赖谁，文本即可）
- **关键流程**（端到端路径 + 涉及文件）
- **数据模型 & 状态真值**
- **扩展点**：针对设计意图，"加 X 该在哪插" + 影响面
- **VERIFIED vs INFERRED 审计**：哪些是读到的、哪些是推断的、哪些没读到（诚实空白）
- **深化机会（可选透镜，2026-07-12 对标 merge，源 improve-codebase-architecture）**：对疑似浅
  模块跑 **deletion test**——"删掉它，复杂度是集中还是只挪走？"集中 → 标 deepening candidate。
  词汇引全局 `codebase-design` skill（deep module/seam），该 skill 已装时启用，未装则跳过本透镜
- **churn 富化信号（2026-07-23 对标 merge，源 improve-codebase-architecture YAGNI 定界的
  有方向面）**：有 git 历史时对待扩展面跑 `git log --oneline -- <路径>`：高频变动区 →
  INFERRED 风险标注上调并提示"活跃开发区"。仅作**有方向时**的富化信号，不引入无方向
  fallback（Phase 0 已强制问范围+意图）
- **开放问题**：要继续设计前需向用户澄清的点

---

## Phase 4：升级分支（大库，装在下游项目、**不进 gstack**）

仅当 Phase 1 命中 ≥2 信号且用户确认要上工具：

- 默认 `colbymchenry/codegraph`（框架 `ADOPTED.md` 已钉 v1.0.1、判为下游可选）：
  **安全装 `npm i -g @colbymchenry/codegraph`（不 curl|sh）** → 在**该下游代码项目**里 session-connect 成 MCP
  → 用其 `codegraph_explore`/query 补 native recon 覆盖不到的跨模块调用/影响面 → 结果折进 Phase 3 的 brief。
- 仅当要 **code + docs 统一图谱**才考虑 Graphify（`uv tool install graphifyy`），接受更重栈 + LLM credit + hype/供应链打折。
- **红线**：工具装在**下游项目**、不进 luca_gstack 仓（符合「环境/项目剥离原则」；避免 CodeGraph orphan 结局 SC-20260621-004）。

## Phase 5：交接 + 记忆

- **handoff**：brief 作为下游设计 skill 的输入 artifact。workflow 模式先 `mkdir -p docs/handoff` 再写
  `docs/handoff/<date>-<topic>-code-recon-handoff.md`（含 gate_result + 产出路径 + 关键架构决策/风险）；
  standalone 轻量模式（终端交付、无下游消费）可免 handoff。之后建议路由到
  `/ux-brainstorm` 或 `/design-brief`（它们把这份 brief 作为 `architecture_brief` optional 输入消费）。
- **记忆**：把稳定架构事实写进**下游项目**的 `.luca/memory/MEMORY.md`（项目本地，只在该项目激活时注入），
  下次「理解代码」更便宜。**不**写框架级三层记忆（那是跨项目经验层，不装具体项目代码事实）。

---

## ⚠️ 末尾核心约束

1. **native-first**：默认并行只读 recon 出 brief；codegraph/Graphify 仅在规模阈值命中 ≥2 时**提示**，不硬装、不默认上。
2. **只读 recon**：本 skill 绝不修改被 recon 的代码；产出只有一份新 brief（+ 可选 handoff/memory）。
3. **工具装下游、不进 gstack**：任何 codegraph MCP 属**下游代码项目**，不写进 luca_gstack 仓。
4. **诚实审计**：brief 必须标 VERIFIED vs INFERRED 与没读到的空白，推断不得冒充事实。
5. **brief 是设计输入不是终点**：产出后交给 ux-brainstorm/design-brief，不在本 skill 里做设计或写实现。
6. **规模阈值第 4 条**：耦合走 subprocess 字符串/配置值的仓（如 gstack 自身），codegraph 看不见——别上工具，老实读。

handoff 协议：见 Phase 5（workflow 模式必写，standalone 轻量终端交付可免）。

<!-- FILE_END: code-recon/SKILL.md -->
