---
name: code-recon
preamble-tier: 1
version: 1.0.0
description: |
  Brownfield「从现有代码起步」的正门 skill：把一个已有代码库逆向成一份**设计可消费的架构 brief**，
  再作为输入喂给设计管线（ux-brainstorm / design-brief / tech-spec）。补齐 pipeline 缺的入口——
  现有 skills 默认从需求/语料起步，没有「先读懂现有代码再在其上做产品设计」的正门。
  **native-first, 零新依赖**：默认用固定队列串行只读 recon agent 逆向；只有代码库大到原生 recon 太贵/看不全跨模块耦合时，
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
  recommended-model: guided-execution  # 串行 recon 派发 + brief/候选报告合成
---

## 定位（先读）

**Brownfield 正门**：`已有代码 → 理解结构 → 产出架构 brief → 喂设计管线 →（确认后）继续生成代码`。
本 skill 默认 `entry_mode=brief`，只负责理解并产出原架构 brief。用户明确请求架构改善/候选选择才
使用同 key 的 `entry_mode=architecture-opportunities`，只呈现深化机会 HTML，不预先提新 interface。
两个模式均不修改被读代码、项目词汇或 ADR，不是第二个设计或执行所有者。

与既有能力的边界（**不重复**）：
- `code-hygiene`=对代码做清理 + 完成前验证，**改代码**；本 skill 只读、只产 brief，正交。
- 全局 `systematic-debugging`=根因排查一个具体 bug；本 skill 是**全局架构理解**，非定点排障。
- `deepresearch`/`ux-research`=联网/竞品研究外部信息；本 skill 只看**本地这份代码**。
- `tech-spec`/`task-plan`=索引**需求/设计文档**（RTM）；本 skill 索引**代码结构**，是它们的上游输入。

下游消费：产出的 brief 作为 `ux-brainstorm` / `design-brief` / `tech-spec` 的 **optional 输入 artifact**
（见 `input-modes.yaml` 各自 optional 里的 `architecture_brief`）——设计基于真实代码，而非凭空。

## 目标权限前置（在 preamble/任何目标 I/O 前）

按 project-session 核验 canonical 绝对根、有限读取路径及报告输出范围；框架/meta 保持 NO_PIN。
缺 pin、授权根或项目 owner 则停，绝不从 cwd、共享 docs/workflow-state/current-topic symlink
推断或修复 pin。下面原 preamble 仅作规模诊断；只有目标 scope 已核验、且工具显式工作目录
是该根时才运行。`pwd` 是诊断输出，不是读写授权。不要在本技能运行项目 switch。

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

> 1）要读懂哪个代码库？（已验证的 canonical 路径，无 cwd 默认授权）
> 2）普通 brief 的产品设计/功能意图是什么？架构机会模式有无指定 module、痛点或方向？
> 3）范围：全仓，还是某个模块/子目录？

有明确设计意图时，recon 的「扩展点」维度要围绕它展开（"要加 X 该在哪插、会碰哪些现有面"）。

**确定 `<topic>`（原 brief 文件名与 architecture_brief 消费保持）：** 使用已验证项目 handoff 的
topic，或用户确认的仓名+意图派生 2–4 词 kebab-case；同一任务固定复用。共享 current-topic
别名不作身份或落点来源。普通输出在已批准 canonical 目标内保留
`docs/engineering/<date>-<topic>-architecture-brief.md` 形状，不从共享 docs 别名写入。

架构机会模式先冻结 direction / scope。用户有方向时沿该方向，不用 churn 改写意图；无方向才
读真实 `git -C '<目标绝对根>' log --oneline` 与有限路径历史定界，高频项须有 commit/path 证据。
散布时在原批准范围内扩看；无 Git/不可读记 UNVERIFIED，不编 hotspot。先读该项目已授权的
词汇 owner 和相关 ADR，并把 `.claude/skills/office/codebase-design/SKILL.md` 全文作为架构词汇
reference 读取（不运行该 skill/preamble），再完整读取
[references/architecture-candidates-report.md](references/architecture-candidates-report.md)。
默认建议真实 OS temp 下 `architecture-review-<timestamp>.html`；明确 `report_path` 可以替代。
两者在写前都须取得 canonical 路径、真实 preimage、有限 scope 与报告写权限，TMPDIR 可见不
授予任意写。缺落点权限可继续只读准备候选，不能落盘或偷偷改为 repo 文档。
父 U-ID、scope、resume_target、读写/effect authority 交集始终保留。

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

## Phase 2：串行只读 recon（两模式共用派发内核）

`max_active_subagents=1`。先读取 model-routing，以真实冷 `explorer` / MR-006 anchor、
`fork_turns=none` 派发；每次只给已核验绝对根、有限路径、词汇/ADR、搜索目标及方向，
不传作者历史、不复制父 pin/SID，不硬编码模型。多独立代理触发 Plan 时先取得该只读 phase/
scope 的真实批准。原生任务真实 completed 后，读回同次 accepted、起止、输入 SHA 与实证，
前一个未闭合不派下一个；缺证据记 UNKNOWN，不由主线模拟 explorer。合成不替代真实派发。

普通 brief 保留以下**固定五维队列**，按 1→5 逐个冷启动，不跳维、不并发：

1. **入口 & 运行形态**：main/入口文件、启动脚本、构建产物、进程/服务形态
2. **模块划分**：顶层目录/包的职责，谁依赖谁（粗依赖图，读 import/require/package 声明）
3. **关键流程**：1-3 条核心用户/数据流程，端到端经过哪些文件
4. **数据模型**：核心实体/表/结构体，状态存哪（DB/文件/内存）
5. **扩展点**：围绕 Phase 0 的设计意图——"要加 X 功能，该在哪插、会碰哪些现有面、有无现成扩展位"

每个 agent 返回时**诚实标注 VERIFIED（读到实证）vs INFERRED（推断）**——复用 gstack-map 的诚实审计习惯，
不把推断当事实。

architecture-opportunities 不跑五维 brief 队列，而用同一内核派**一个真实冷 explorer**：
记录理解概念时的跨文件跳转、interface 几乎匹配 implementation 的 shallow module、为测试
抽纯函数却使调用处真实 bug 难测、跨 seam 泄漏和现有测试盲区。每个候选绑定 files/行与真实
friction、已知 dependency category 和 deletion evidence：删浅包装复杂度消失→shallow；
删承重 module 后复杂度散回 N callers→load-bearing，不倒置。未知项保留 UNKNOWN。

---

## Phase 3：合成架构 brief

brief 分支把五维真实返回合成原结构，仅在已批准 canonical 目标输出目录可写时创建目录，写：
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
  模块跑 **deletion test**：删浅包装后复杂度消失 → shallow/deepening candidate；删 module 后
  复杂度散回 callers → load-bearing。不能把承重模块误判为应删包装。
  词汇引项目共享 `codebase-design` skill（deep module/seam）；该入口是框架内置工程原语
- **churn 富化信号（2026-07-23 对标 merge，源 improve-codebase-architecture YAGNI 定界的
  有方向面）**：有 git 历史时对待扩展面跑 `git log --oneline -- <路径>`：高频变动区 →
  INFERRED 风险标注上调并提示"活跃开发区"。仅作**有方向时**的富化信号，不引入无方向
  fallback（Phase 0 已强制问范围+意图）
- **开放问题**：要继续设计前需向用户澄清的点

若实体归属/术语重载或代码与领域说法冲突影响 brief，完整读取
`.claude/skills/office/domain-modeling/SKILL.md` 后按其 internal 合同只读分析；
继承本任务 scope/authority 的交集，返回 code_evidence 与 open_questions，
分别归本 brief 的 VERIFIED/INFERRED 审计与开放问题，再恢复 Phase 3。
brief 输出权限不授权修改被 recon 的代码、glossary 或 CONTEXT.md；不新增 Flow 节点。

architecture-opportunities 分支按已全文读取的 report reference 写一个离线 self-contained HTML：
每卡实际 files/evidence/problem/solution、locality/leverage/testing、recommendation strength、
dependency category、正确且非空 before/after 图、相关 ADR 冲突 callout，结尾 Top 推荐锚到实卡。
现状须来自代码，提议明确标 Proposed；不先设计 interface。renderer 用现有通用报告能力或
内联 CSS/SVG/已验证本地资源，不引 CDN、装依赖、空图或只交 Markdown。不是产品 UI，
不套五状态/24 分门。授权浏览器打开后验证图实际可见、锚点可导航、console 无错和零网络写；
未运行浏览器则诚实 NOT_RUN，不能把静态 markup 当可视通过。

---

## Phase 4：升级分支（大库，装在下游项目、**不进 gstack**）

仅当 Phase 1 命中 ≥2 信号且用户确认要上工具：

- 默认 `colbymchenry/codegraph`（框架 `ADOPTED.md` 已钉 v1.0.1、判为下游可选）：
  **安全装 `npm i -g @colbymchenry/codegraph`（不 curl|sh）** → 在**该下游代码项目**里 session-connect 成 MCP
  → 用其 `codegraph_explore`/query 补 native recon 覆盖不到的跨模块调用/影响面 → 结果折进 Phase 3 的 brief。
- 仅当要 **code + docs 统一图谱**才考虑 Graphify（`uv tool install graphifyy`），接受更重栈 + LLM credit + hype/供应链打折。
- **红线**：工具装在**下游项目**、不进 luca_gstack 仓（符合「环境/项目剥离原则」；避免 CodeGraph orphan 结局 SC-20260621-004）。

## Phase 5：交接 + 记忆

- **handoff**：brief 作为下游设计 skill 的输入 artifact。workflow 模式仅在已批准 canonical
  项目根内、该有限 handoff 路径有写权限时创建目录并写入（不跟共享 docs symlink），再写
  `docs/handoff/<date>-<topic>-code-recon-handoff.md`（含 gate_result + 产出路径 + 关键架构决策/风险）；
  standalone 轻量模式（终端交付、无下游消费）可免 handoff。之后建议路由到
  `/ux-brainstorm` 或 `/design-brief`（它们把这份 brief 作为 `architecture_brief` optional 输入消费）。
- **记忆**：输出 brief 不授予事实入库。仅在 governed extraction 门通过、项目落点已核验且有
  精确写许可时，由相应 memory owner 处理项目事实；未授权只保留建议，不自动写项目/全局 memory。
- **架构报告交接**：展示绝对 report_path 后真实询问选择，未选/拒绝/owner 缺失停在报告。
  真实选中才按许可交集交 `grilling`→`codebase-design`，继承同 U-ID/scope/resume_target。
  load-bearing 拒绝只提议 ADR；领域术语更新回 `domain-modeling` 的真实批准门。不自动改代码、
  memory、票据、全局配置或新建 Flow；替代 interface 仍须其独立串行设计门。

---

## ⚠️ 末尾核心约束

1. **native-first**：两模式同内核、max_active_subagents=1；brief 五维固定冷队列，架构模式一个真实冷 explorer；前票 completed/同次 accepted 后再派。工具仅按原阈值提示，不硬装。
2. **只读 recon**：绝不修改被读代码；只写获批 brief 或精确 report_path（+ 已授权 handoff），memory 另过治理和写门。
3. **工具装下游、不进 gstack**：任何 codegraph MCP 属**下游代码项目**，不写进 luca_gstack 仓。
4. **诚实审计**：brief 必须标 VERIFIED vs INFERRED 与没读到的空白，推断不得冒充事实。
5. **brief 是设计输入不是终点**：产出后交给 ux-brainstorm/design-brief，不在本 skill 里做设计或写实现。
6. **规模阈值第 4 条**：耦合走 subprocess 字符串/配置值的仓（如 gstack 自身），codegraph 看不见——别上工具，老实读。

handoff 协议：见 Phase 5（workflow 模式必写，standalone 轻量终端交付可免）。

<!-- FILE_END: code-recon/SKILL.md -->
