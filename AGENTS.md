# AGENTS.md - Codex Agent Operating Contract

This file defines how Codex-style agents must operate in this repository. It is the project-level
contract for prompt discipline, context loading, tool harness behavior, and cross-model
collaboration.

The repository also contains `CLAUDE.md`, `.claude/commands/`, and `.claude/skills/office/` for
Claude Code. Those files remain authoritative for Claude slash-command workflows. This file makes
the same workspace legible and executable for Codex.

<!-- FILE_END marker policy: every mandatory context file in this repo should be read through its
final line when a task depends on it. -->

---

## Routing Contract TL;DR

1. Project Gate first: 老项目 / 已有项目 / 继续项目 → 先确认或切换项目。
2. Complexity second: 复杂需求 → Plan Agent，不进单个 skill。**即使 route-guard 高置信命中 skill，仍须检查 Plan Agent 5条件；满足任一不得直接执行。**
3. Ambiguity third: 多候选 → 问用户，不自行判断。
4. Single skill last: 只在高置信且不触发 Plan Agent 5条件的前提下调用 skill。
5. Keyword source: `.claude/skill-os/skill-routing-map.yaml`。

---

## 0. Repository Identity

This repository is **luca_gstack** — a product-neutral Skill OS (design/engineering workflow runtime).
Product-specific facts (brand tokens, component maps, domain vocabulary) are **profile-activated**
via the active project's `CONTEXT.md`, never hardcoded here (SF-001/SF-004 were deliberately moved
out of the Static-Fallback allowlist to search-only for exactly this reason).

Core facts:

- Product domain: **whatever the active project declares** in its `CONTEXT.md` (this runtime is product-neutral).
- Prototype stack: plain HTML + local Tailwind CDN + native JavaScript.
- Prototype framework: `framework/`.
- Workflow outputs: `docs/`, which must be a symlink to the active project at
  `<PROJECTS_ROOT>/<project>/docs`, where **PROJECTS_ROOT = `$LUCA_PROJECTS_ROOT` or `$HOME/Desktop/项目`**
  (WS-B2, 2026-07-25: overridable so cloud/headless checkouts can point at a writable root; all 7 sites —
  4 identity parsers + project-scope-guard + project.sh + check-project-links — resolve it from one place).
  Session stickiness (G6, 2026-07-04): `session-restore.mjs` clears the three project symlinks on SessionStart
  only when `source === 'startup'` AND no active parallel session is detected AND `SESSION_RESTORE_ALWAYS_CLEAR`
  is unset; a dangling link is cleared unconditionally.
  **Session-level project isolation (方案A, 2026-07-08 — supersedes the earlier "global shared symlink" model):**
  the per-session pin `.claude/.session-project-<sid>` is the single truth for "which project is this session on".
  `project-scope-guard` (PreToolUse) rewrites every docs/ · workflow-state · current-topic path to the pinned
  project's absolute path, and **denies** those writes when the session has no pin — so the shared symlink
  degrades to display only and a parallel `switch` can no longer pull another session onto the wrong project.
  The pin is written only when the user explicitly names/confirms a project, **never derived from the symlink**.
  Name-to-switch (2026-07-06): naming an existing project (or semantically describing another/new project) makes
  the main agent switch/create decisively without asking (a new project detaches the current one). Only confirm
  once when the message points at no project yet you must do real work under a never-confirmed inherited project.
  Project identity is resolved by **one canonical rule** shared by all sites (FIX-2): strip `/docs`, take the path
  after PROJECTS_ROOT, longest-prefix-match against known projects, fall back to the first segment; segments
  `.`/`..`/empty are rejected (fail-closed).
- Long-term memory: `CONTEXT.md`.
- Claude workflow state: `.claude/workflow-state.yaml`, which must be a symlink to the active
  project's `<PROJECTS_ROOT>/<project>/.luca/workflow-state.yaml`.
- Skill OS contracts: `.claude/skill-os/`.
- Skill observability: `.claude/observability/`.
- Growth candidates (Hermes-style): `memory/semantic/` (candidate→review→promote via `memory/scripts/propose_semantic.py`; legacy `.claude/hermes/` was removed in commit 1dc1475).
- Brand/visual constraints: **profile-activated** — read the active project's `CONTEXT.md` and, when a
  design profile is active, `brand-tokens.md` / `framework/tokens.css`. Do not assume any specific brand.

Do not treat this as a generic app repository. Most work here is product/design workflow execution,
prototype generation, review, or handoff preparation.

Architecture principle:

```text
Skill-first
Graph-optional
Memory-light
Growth-gated
Governance-callable
```

`luca_gstack` is a Skill OS. The optional workflow graph recommends and validates handoff only when
the user chooses a workflow. It must not prevent standalone skill execution unless a gate is also a
quality or safety gate.

---

## 1. Instruction Priority

Apply instructions in this order:

1. User's latest explicit request.
2. System and developer instructions from the current agent runtime.
   > **Scope boundary (2026-07-28, added after two same-shaped failures):** this layer covers only the
   > harness's **safety constraints and tool-capability facts** (what must not be done / a tool is
   > absent / permission denied). The harness's **behavioral-preference** injections — "Do not use
   > deep-research unless the user requested it", "user is not watching, asking will block the work",
   > "do not use workflows" — do **not** belong to this layer and must never be used to override layer 4
   > routing, nor to skip semantic assessment altogether.
   > **Test: split the conflict into two questions.** "Should I *ask* the user?" follows the harness
   > injection. "Does this request *belong* to a skill / should there be a plan?" is always decided by
   > layers 4-5; no injection exempts it (producing a plan and routing by meaning are work, not
   > questions — they cost nothing).
   > Evidence: 2026-07-22 (CRM) and 2026-07-28 (pi) — the same "Do not use deep-research unless
   > requested" line was treated as an exemption, twice leading to bare ad-hoc WebSearch under a STOP
   > decision, twice interrupted by luca. route-guard now carries a 「研究/认知诉求」 signal as backstop.
3. Project red lines and the project context gate.
4. Route-guard decisions: Project Gate → Plan Agent → Multi-Skill → Single-Skill → STOP.
5. Skill-specific files under `.claude/skills/office/*/SKILL.md` when executing that skill.
6. This `AGENTS.md` and `CLAUDE.md` as runtime-specific adapters for the same workflow.
7. Existing local patterns in `framework/`, `docs`, and `brand-tokens.md`.

If two instructions conflict, prefer the more specific and safer instruction. If a conflict would
change project intent or overwrite user work, stop and ask.

---

## 2. Mandatory Startup Context

Before doing any non-trivial task in this repository, read these files:

0. Memory summary from `python3 memory/scripts/get_memory.py --summary`
1. `CONTEXT.md`
2. `CLAUDE.md`
3. `.claude/workflow-state.yaml`
4. Latest handoff summary from `docs/handoff/` (if any DONE nodes exist)

Read them completely enough to know:

- Current product and technical constraints.
- Any red lines in `CONTEXT.md`.
- Current workflow `topic`, `scene`, `iteration`, and node statuses.
- Whether any node is `IN_PROGRESS`, `BLOCKED`, or repeatedly failing.
- Upstream decisions, constraints, and risks from handoff summaries.
- Lightweight memory counts and whether task-related retrieval is likely needed.

After the concrete task is known, prefer precise memory retrieval before reading long history:

```bash
python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5
```

Only use `get_memory.py --layer ...` after search indicates a specific layer is needed. Do not
read memory long files during normal startup.

If a task involves design workflow, prototype work, PRD, idea analysis, review, Figma, or a
slash-command-like request, also read:

5. `.claude/skills/office/SKILL.md`
6. The relevant command file in `.claude/commands/<command>.md`
7. The relevant skill file in `.claude/skills/office/<skill>/SKILL.md`
8. The relevant input mode from `.claude/skill-os/input-modes.yaml`.
9. The short rule output from
   `python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>`; do not read full
   observability logs during normal startup.
10. If growth rules are needed, run
   `python3 memory/scripts/search_memory.py "<skill-name> skill-rule" --limit 5` first; only then
   use `get_memory.py --layer semantic --domain skill-rule` if layer detail is required. Do not
   read full candidate/review/eval logs during normal startup.

Examples:

- User says "按 /idea 做": read `.claude/commands/idea.md` and `.claude/skills/office/idea/SKILL.md`.
- User says "做 HTML 原型": read `framework/README.md`, `.claude/commands/html-prototype.md`,
  and `.claude/skills/office/html-prototype/SKILL.md`.
Do not bulk-read every skill file. Load only the command and skill needed for the current task.

---

## 3. Prompt Engineering Contract

When executing a task, keep the operating prompt explicit and bounded:

- Restate the task goal in operational terms before significant work.
- Identify the workflow scene when relevant:
  - Scene A: new feature design.
  - Scene B: existing feature optimization.
  - Scene C: online page review and redesign.
  - Scene D: agent-ification — turn an existing manual feature into user-supervised agent operation.
- State assumptions only when they affect output or risk.
- Ask at most one necessary blocking question at a time.
- Prefer concrete file paths, module names, and output names over vague descriptions.
- Do not claim that a Claude slash command was actually invoked. In Codex, emulate the workflow by
  reading its files and executing the same procedure.
- Keep user-facing updates concise and action-oriented.

Completion status language for skill-like tasks:

- `DONE`: all required steps completed, output paths provided.
- `DONE_WITH_CONCERNS`: completed, but specific concerns remain.
- `BLOCKED`: cannot continue; include reason, attempts, and next step.
- `NEEDS_CONTEXT`: missing required input; state exactly what is missing.

If the same issue fails 3 times, stop and report `BLOCKED`.

### 3.1 Coding Discipline

For coding, document edits, skill edits, reviews, refactors, and prototype file changes, apply this
Karpathy-inspired discipline:

- **Think Before Coding:** do not silently choose a high-impact interpretation. State assumptions
  when they affect output or risk, and ask one blocking question when ambiguity would change the
  result.
- **Simplicity First:** implement the smallest solution that satisfies the request. Do not add
  speculative features, configuration, abstraction, or fallback behavior.
- **Surgical Changes:** touch only lines that trace to the user's request or the verification
  standard. Do not perform drive-by refactors, formatting, comment edits, or cleanup of pre-existing
  dead code.
- **Goal-Driven Execution:** define the completed state before editing and verify after editing with
  the narrowest reliable check: test, script, read-back, browser check, or grounded review.

This discipline is not a separate route or visible skill. It is a default execution contract layered
under the project router and skill files.

---

## 4. Context Engineering Contract

Use a layered context strategy:

### 4.1 Always-On Context

Keep these facts active during the whole task:

- Product context comes from the **active project's `CONTEXT.md`** (product-neutral runtime; no hardcoded product).
- Brand/visual constraints are profile-activated (see §0); read them before any visual output.
- Prototype outputs belong under `docs/prototype/YYYY-MM-DD-<topic>/`.
- Workflow artifacts belong under the path conventions defined in `.claude/skills/office/SKILL.md`.
- `framework/` contains source templates and should generally be treated as read-only.

### 4.2 Task-Scoped Context

Load only the files required for the current task:

- Requirements: latest relevant files in `docs/idea/` and `docs/prd/`.
- Design decisions: `docs/decisions/`.
- Reviews: `docs/evaluation/`, `docs/review/`, `docs/redteam/`.
- Prototypes: specific folder under `docs/prototype/`.
- Brand and visual constraints: `brand-tokens.md`, `framework/tokens.css`, `framework/README.md`.

### 4.3 Context Budget

Summarize long files after reading. Do not paste large source blocks into the conversation unless
the user asks. When a file has a required final marker such as `<!-- FILE_END: ... -->`, read
through that marker before relying on the file.

### 4.4 Memory Writes

Write back to `CONTEXT.md` only when the task discovers durable project-level constraints:

- A new red line.
- A design assumption was proven false.
- A brand or technical constraint changed.
- A workflow improvement was validated by review or retro.

Do not write transient task notes into `CONTEXT.md`.

For stable facts, use the memory candidate pipeline instead of direct writes:

```bash
python3 memory/scripts/propose_semantic.py \
  --domain <crm|fxui|skill-rule> \
  --fact "<fact>" \
  --confidence high \
  --evidence "<source>" \
  --scope "<scope>" \
  --reviewer "<reviewer>"
```

Stable facts must go candidate → review → promoted. Do not directly edit
`memory/semantic/promoted-facts.yaml` except through the governed promotion flow.

### 4.5 Skill Observability

Use `.claude/observability/` for feedback memory:

- `observations.jsonl`: raw user feedback; cold storage.
- `rules.yaml`: distilled active rules; load only through `scripts/get_rules.py`.
- `run-log.jsonl`: skill run history; cold storage.

For normal skill execution, do not read full `observations.jsonl`, `run-log.jsonl`, or `rules.yaml`. Run:

```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> <scene>
```

For task-related historical experience, Codex should prefer:

```bash
python3 memory/scripts/search_memory.py "<task/skill/topic>" --limit 5
```

Use `consolidate_memory.py --json` only for governance, retrospection, memory-health checks, or
explicit user requests. It is a dry-run/read-only review queue by default and must not become a
normal skill startup step.

If the user explicitly points out a mistake or says to remember a future constraint, record it with
`write_observation.py`. If it is actionable and reusable, also append an active rule through the
same script.

### 4.6 Skill OS Standalone / Workflow Modes

Use `.claude/skill-os/input-modes.yaml` to decide whether a skill is running in standalone or workflow mode.

- Standalone mode: the user directly calls a skill or provides a direct brief. Require only that
  skill's own inputs and quality gates.
- Workflow mode: the user selected a recommended flow or explicitly asks to continue from upstream
  artifacts. Validate handoff gates from `.claude/skill-os/optional-workflow-graph.yaml`.
- Workflow gates are advisory unless the user chose workflow mode. Quality gates remain mandatory in both modes.
- Do not silently force `/idea -> /brainstorm -> ...` when the user directly asks for
  `/ux-research`, `/ux-brainstorm`, `/design-brief`, `/open-design`, or `/html-prototype`.
  (`figma-demo` is hidden since 2026-07-03 — no slash entry; reachable only via internal
  Skill-tool dispatch.)
- New first-class skills (2026-07-21, same routing semantics as CLAUDE.md 一级表): `/research-kit`
  (一手研究工具设计——访谈提纲/问卷/可用性测试计划/卡片分类法；三不产：不产发现/不产解读/不采集；
  triggers: 访谈提纲/访谈脚本/问卷设计/可用性测试计划/卡片分类法) and `/ux-writing`（内容与语言设计
  ——voice/tone 规范+微文案+文案评审；语义层 pre-brief 供 design-brief 继承，逐字层仅本地生成不进 OD；
  triggers: 微文案/界面文案/UX文案/空态文案/错误文案/文案规范）。

### 4.7 Hermes-Style Growth

Use governed memory for controlled self-growth:

- `memory/semantic/candidates.jsonl`: cold storage for proposed learnings.
- `memory/semantic/reviews.jsonl`: review trail for candidate promotion/rejection.
- `memory/semantic/promoted-facts.yaml`: stable facts and `skill-rule` rules after review.

Default behavior:

- Propose candidates after repeated failures, user corrections, eval findings, redteam findings, or retro findings.
- Do not automatically write `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, or skill rules.
- Promotion requires clear scope, evidence, context-risk review, and rollback criteria.
- Inspect governance state with `python3 memory/scripts/consolidate_memory.py --json` only when
  doing governance or being asked to review memory health; do not read candidate/review/eval logs
  directly during normal startup.

---

## 4.8 Governance Parity（治理平价 — 与 CLAUDE.md 同源，指针优先）

CLAUDE.md 承载的治理面在 Codex 侧同样生效。**除 Static Fallback 外一律用指针引用单一源**
（复制散文 = 复制漂移，正是 §0 身份与 G6 块曾变陈旧的机制）。

### 4.8.1 记忆写入门禁（extraction bar / 归因 / 三分归属）

写记忆前必须过门槛，**默认不存**：

- **四强信号**（命中任一才提取）：①用户明确纠正或对未来行为明确指示 ②同类问题二次复发
  ③真实返工或不可逆险情 ④重获成本高且确定复用。定义与按层分级以
  `.claude/skill-os/extraction-bar.md` 为准（唯一真值源，勿在别处复制全文）。
- **归因阶梯 L1–L5**：中途纠正与绕行入库都先过 `.claude/skill-os/correction-attribution.md`
  ——根因在自有系统则**修源头**，记忆只存指针 + 兜底。归因 ≠ 提取，仍须过四信号。
- **三分归属**（先问"换个项目/重建 luca_gstack 这条还成立吗"）：
  · 只关于 luca 这个人怎么工作 → 全局个人记忆（仅信号① 直写 `feedback_<slug>.md` + 索引；
    ②③④ 写 `candidate_feedback_<slug>.md`，不进索引）
  · 只在 luca_gstack 框架内成立 → `memory/scripts/propose_semantic.py` 候选（**红线
    SC-20260523-003**：稳定事实不得直接写 `promoted-facts.yaml`，必须走 candidate→review→promote）
  · 只对某个下游项目成立 → 该项目 `.luca/memory/MEMORY.md`
- **检索改变了行动时**补跑 `search_memory.py --mattered "<query>"`（ADR-0006 唯一主观信号）。

### 4.8.2 Model routing（能力档意图 — Codex 的 model dispatch 参数尚未核验，按意图自选）

真值源 `.claude/skill-os/model-routing.yaml`。**Codex 是否能传 per-agent model 参数尚未在真 Codex
上核验**（当前按"不能"保守假设），故档位分派本身暂判不可移植（见 §11 Non-goals；真-Codex spike
证伪则复审）；可移植的是**意图**——按判断杠杆选强弱：

- 出门前裁决 / 对抗判定 / 翻案复审 / 规划期 → **reasoning-heavy**（最强档）
- 写代码 / 规格 / 原型 / 编排 / 研究 / 判官常规 → **core-execution**（承重常驻档）
- 轻执行 / checklist 审查 / 一般检索 → **guided-execution**
- 机械执行 / 格式化 / 打分 / preflight → **mechanical**

纪律：拿不准就选更强档，不猜最强档；档位变更须用户批准（同 `model-routing.yaml` 白名单纪律）。

### 4.8.3 Session/项目隔离（方案A pin）

见 §0 Repository Identity 的 pin 段（per-session pin 是唯一真值、PreToolUse 重写/deny、
pin 永不从软链派生、canonical 身份裁决 fail-closed）。**Codex 侧若无等价 PreToolUse 写拦截，
此保护降级为「agent 必须自觉遵守的文档规则」——弱于 Claude，须显式声明而非假装等价。**

### 4.8.4 Human gates（缺结构化工具 ≠ 自动裁决许可）

任何**机器不可代选**的人类决策门（open-design 的 platform/design-system 选择、design-brief
决策卡、ux-audit Phase-0、muse-loop GATE-1/GATE-2 等），当前 harness 若无结构化提问工具
（AskUserQuestion），**必须以纯文本停下提问并等待真实回复**——绝不因缺 widget 而替用户决定。
门的不变量（停下问、机器提议人定夺）不随 widget 降级而降级。

### 4.8.5 关键约束速查（Static Fallback — 脚本失效时此节仍有效）

> 本节是 semantic memory 的**宪法级子集**，由 `memory/semantic/static-fallback-allowlist.txt`
> 白名单管控（改白名单 = 改每 session 注入面，人工拥有）。**唯一 inline 而非指针的一段**：
> 它的语义就是"脚本/检索失效时也必须在场"，指针在该场景下不可靠。

- [SF-002 / fxui] HTML 原型必须基于 `framework/` 母版；`framework/` 为**只读保护区**，不得直接修改
- [SF-003 / workflow] **Skill-first, Graph-optional**：每个 skill 默认 standalone 可用，Workflow 仅在用户主动选择流程时启用
- [SF-005 / workflow] 产品设计场景四类（产品中性）：A=新功能 / B=已有功能优化 / C=线上评审改版 / D=Agent化改造；分类由用户/上下文确认
- [SC-20260523-001 / crm] CRM objects use stable IDs（仅 CRM profile 激活时适用）
- [SC-20260523-002 / skill-rule] route-guard：老项目/已有项目/继续项目**必须先触发 Project Gate**，列出或确认项目；不得直接解释为场景B或进入单个 skill
- [SC-20260523-003 / skill-rule] memory：稳定事实不得直接写 `promoted-facts.yaml`；必须先写 semantic candidate，经 consolidate/review 的 promotion_ready 门禁后才能晋升


## 5. Harness Engineering Contract

The harness is the set of file, command, verification, and safety behaviors used to execute tasks.

### 5.1 File Safety

- Never overwrite user work without checking current file contents.
- Treat `framework/` as template source. Copy from it into `docs/prototype/...` for new prototypes
  unless the user explicitly asks to change templates.
- Keep edits scoped to the requested output and its directly related files.
- Preserve existing directory conventions.
- Use `apply_patch` for manual text edits.
- Use read-only commands first: `pwd`, `ls`, `find`, `rg`, `sed`.

### 5.2 Command Safety

- Prefer deterministic local commands.
- Use `rg` before slower search tools.
- Do not run destructive commands such as `rm`, `git reset`, or broad cleanup commands unless
  explicitly requested and confirmed.
- If network, GUI, or permission escalation is required, ask through the runtime approval mechanism.

### 5.3 Verification

Choose verification based on task type:

- Markdown/document task: read back the written file and check headings, paths, and instruction consistency.
- HTML prototype: inspect the generated file, verify asset paths, and run a local server when the page needs one.
- Review task: ground findings in exact files, screenshots, modules, or line references.

If verification cannot be run, say why and state the residual risk.

### 5.4 Output Paths

Follow the path convention from `.claude/skills/office/SKILL.md`:

```text
docs/idea/YYYY-MM-DD-<topic>-idea.md
docs/research/deepresearch-<topic>-YYYY-MM-DD.md
docs/prd/YYYY-MM-DD-<topic>-prd.md
docs/prd/YYYY-MM-DD-<topic>-prd-ai-spec.md
docs/research/ux-research-<topic>-YYYY-MM-DD.md
docs/decisions/YYYY-MM-DD-<topic>-ux-brainstorm.md
docs/decisions/YYYY-MM-DD-<topic>-interaction-architecture.md
docs/decisions/YYYY-MM-DD-<topic>-design-brief.md
docs/evaluation/YYYY-MM-DD-<topic>-ux-audit.md
docs/prototype/YYYY-MM-DD-<topic>/index.html
docs/prototype/YYYY-MM-DD-<topic>/prototype-spec.md
docs/prototype/YYYY-MM-DD-<topic>/blueprint.yaml
docs/prototype/YYYY-MM-DD-<topic>/mapping-proof.md
docs/prototype/YYYY-MM-DD-<topic>/requirement.md
docs/figma/YYYY-MM-DD-<topic>/figma-spec.md
docs/review/YYYY-MM-DD-<topic>-<review-type>.md
docs/evals/YYYY-MM-DD-<topic>-evals.md
docs/retro/YYYY-MM-DD-<topic>-retro.md
docs/redteam/YYYY-MM-DD-<topic>-redteam.md
```

Use the current date from the runtime environment, not from model memory.

---

## 6. Cross-Model Collaboration

Claude Code and Codex may both work in this repository. They must collaborate through files, not hidden assumptions.

### 6.1 Claude Owns

Claude Code owns the native slash-command experience:

- `.claude/commands/*`
- `.claude/skills/office/*`
- Claude-specific guided workflows.

When Claude runs a skill, its durable output should land in `docs/` and workflow status should be
reflected in `.claude/workflow-state.yaml`.

### 6.2 Codex Owns

Codex owns implementation-oriented execution:

- Reading and adapting workflow outputs.
- Editing HTML prototypes, Markdown specs, and implementation files.
- Running local commands and verification.
- Performing code review and debugging.
- Creating compatibility instructions such as this `AGENTS.md`.

Codex can emulate a Claude skill only by reading the command and skill files, then performing the steps manually.

### 6.3 Shared State

Use these files as the handoff surface:

- `CONTEXT.md`: durable project memory and red lines.
- `.claude/workflow-state.yaml`: current workflow node state for the active project; this file is
  a symlink into the active project's `.luca/` directory.
- `docs/handoff/`: per-skill handoff summaries (decisions, constraints, risks). Read the latest
  upstream handoff instead of full upstream SKILL.md or output files.
- `docs/**`: formal outputs and review artifacts.
- `framework/README.md`: prototype template contract.
- `brand-tokens.md`: visual identity constraints.

Environment/project split:

- `luca_gstack` stores the operating environment: skills, hooks, framework, scripts, memory, and
  observability.
- Active project artifacts and workflow state live under `<PROJECTS_ROOT>/<project>/`.
- `docs` and `.claude/workflow-state.yaml` are compatibility symlinks. Do not replace them with
  real directories/files.
- Run `npm run check:project-links` after project switching or state migration.

If one model creates or changes an artifact that the other model will consume, include exact file
paths in the final response.

---

## 7. Workflow Routing

Route user intent through the same layered router described in `CLAUDE.md`. Codex emulates the
Claude workflow; it must not maintain a separate flat routing system.

- Slashless aliases are supported for every command in `.claude/commands/`.
  - If the user's message starts with an exact command name without `/`, treat it as the
    corresponding Claude slash-command semantics.
  - Resolution order: first check `.claude/commands/<name>.md`; if missing, do not treat it as a visible workflow alias.
  - Examples: `office` equals `/office`; `idea` equals `/idea`; `html-prototype` equals
    `/html-prototype`; `ux-audit 截图如下` equals `/ux-audit 截图如下`.
  - This alias rule exists because some clients intercept leading `/` before the message reaches Codex.
  - Only trigger the alias when the command name is the first token of the message. Do not trigger
    from casual mentions such as "我有个 idea".
  - Hidden skill directories under `.claude/skills/office/` are not slashless aliases. Use them
    only when the user explicitly asks for that hidden skill or when a visible skill file instructs
    the agent to load one.

Layered routing order:

1. **Project context gate.** If the user says "老项目", "已有项目", "继续项目", or names an
   existing project, resolve the project first. Do not treat "老项目" as scene B by itself.
   Name-to-switch + semantic self-judgment (2026-07-06): project attribution is a **semantic** judgment,
   not keyword-matching — even when route-guard emits STOP, act decisively on what the language means:
   naming/implying an existing project → `project.sh switch` immediately (no confirm); explicitly a new
   project → `project.sh new {name}` (detaches current) immediately; a big new requirement you judge to
   be a new project but the user did not explicitly say so → one-line confirm, then create; a new
   requirement inside the current project → stay. Only the self-judged-new-project case confirms.
2. **Complexity gate.** If route-guard indicates `PLAN MODE` (复杂度分 ≥ 6, keyword-approximation only),
   or `PLAN CHECK` (a skill in the `HEAVY_ORCHESTRATOR_SKILLS` extension point was hit — **the set
   is injected via tracked settings.json `env` as `ROUTE_GUARD_HEAVY_SKILLS=muse-loop-orchestrate` (auto removed 2026-08-03 for the throttling experiment, see plan-agent.md),
   effective identically in both checkouts; hitting either escalates to PLAN_CHECK**.
   deepresearch/ux-research/figma-demo rely on their own internal HITL gates, see
   plan-agent.md "条件 2 豁免"),
   or the hit skill is known to satisfy any of the Plan Agent 5 conditions,
   read `.claude/agents/plan-agent.md` and produce a phase plan before any single skill. Even on a
   high-confidence single-skill hit, still check the Plan Agent 5 conditions; if any holds, do not
   execute the skill directly. The plan-agent.md trigger table is the single authoritative source;
   PLAN MODE is its keyword approximation and the research-default gate = these 5 conditions + novelty.
   The Plan Agent 5 conditions (任一满足即触发):
   - The task creates or modifies ≥ 3 files.
   - The task needs ≥ 2 independent subagents collaborating (**except internal-HITL orchestrator skills**:
     `/auto`, `/deepresearch`, `/ux-research`, `/figma-demo`, `/muse-loop-orchestrate` — orchestrating multiple subagents is their
     core function, so this condition is trivially true; each has a user confirmation gate before fan-out.
     Condition 2 does not apply to them; the other 4 conditions still do. Principle + roster authority:
     `.claude/agents/plan-agent.md` "条件 2 豁免").
   - The task has an explicit phase dependency (B must wait for A).
   - The task involves irreversible operations (git operations, bulk file overwrite).
   - The user explicitly requests a plan ("先做个计划", "plan 一下", "想清楚再做").
   - **Research Default Gate:** when the task is both complex (any condition above) AND novel
     (core mechanism/interaction has no established prior art), a research phase (`/deepresearch`
     or `/ux-research`, scaled to the fact-gap) is the DEFAULT step. Skipping it requires an
     explicit, user-confirmed reason in the plan — never silent. See
     `.claude/agents/plan-agent.md`「研究默认门」.
3. **Multi-skill ambiguity.** If route-guard reports competing candidates, ask the user to choose
   an order or suggest `/auto`.
4. **Single-skill route.** Use `.claude/skill-os/skill-routing-map.yaml` as the keyword and invoke
   source. Do not duplicate its full trigger table here.
5. **STOP / low confidence — semantic routing contract (2026-07-12).** route-guard is a keyword-only
   coarse net that runs before I read the prompt: honor its PLAN/MULTI/SINGLE hits, but its **STOP /
   miss never exempts my own semantic assessment**. On every request — and mid-execution whenever a
   new sub-goal, scope shift, or fresh design/engineering need surfaces — judge by **meaning** whether
   the request maps to a skill or a flow (design chain / engineering chain / Plan Agent) and route
   there, without waiting for the exact trigger word. Two-way discernment: ① STOP/miss ≠ "no skill" —
   if the meaning fits, route; ② genuinely single-file / mechanical / one-off trivial edits take the
   trivial-task exemption, don't force a skill/flow (multi-file features / cross-stage / multi-feature
   requirements do NOT qualify). Resolve: high confidence → route directly; several plausible → ask one
   question; substantial feature/code requirement → check the Plan Agent 5 conditions first; before
   dispatch, run the chain-check (R1 research-first for the two bare spots brainstorm/ux-brainstorm /
   R2 OD-first for design output / R3 end-to-end confirm / R4 review requests routed by review
   *object* — an asset index, not a decision tree — full text
   `.claude/skill-os/routing-chain-check.md`). This one
   reflex unifies the semantic special-case handoffs declared in this file (currently: OD single-point
   handoff, project self-judgment, sidebar sensing, luca-open file preview, etc.; in Claude app-embedded
   sessions these app actions prefer the `mcp__muse__*` tool channel when visible — agents without it,
   including Codex, use the shell-script paths as the documented degrade route (the channel now exposes
   six tools — workspace_state / preview_screenshot / open_in_view / web_locate / sidebar_read /
   sidebar_navigate; read-side tools default to not stealing focus, and claude.ai is hard-refused for
   agent read/screenshot); sidebar-delivery rule:
   show-intent URL opens go to the app sidebar — `open_in_view(url)` or `luca-open.sh --url` — and any
   browser-automation end state gets pulled back into the sidebar; Chrome automation itself is
   Claude-only tooling, out of scope for Codex) and covers mapping to
   a skill / a flow / a declared tool action. **Boundary (乙 — NOT dispatch targets):** memory-retrieval
   timing, model-tier selection, checkpoint/compact, the research-default gate, observability rules,
   Coding Discipline, handoff/single-truth-source discipline, and the HTML-output preview push are standing process disciplines
   — enforced by deterministic hooks or the orchestration layer, never "routed by meaning"; do not
   force them through semantic dispatch (explicit user naming of any item still executes it — the
   exclusion targets semantic recognition, not refusal).

Hidden skill semantics still require explicit user intent: `challenge`,
`redteam`, `evals`, `retro`, `careful`,
`compare`, `figma-demo`, and `magicpath` are not proactive first-level routes (same 8-item
hidden/advanced roster as CLAUDE.md). **Review carve-out:** when the user explicitly asks for a
review, picking a review asset per routing-chain-check R4 is not "proactive recommendation" — the
user asked for the review; which asset serves it is an execution detail.

Muse additions (muse product line — on the single truth source `main` since 2026-07-16):

- `/muse-loop-orchestrate` — requirement→prototype autonomous Loop orchestrator:
  extract→triage→map→gen→judge one-way chain (bounded gen↔judge inner loop), with two
  non-skippable human gates (GATE-1/GATE-2). Trigger phrases live in
  `.claude/skill-os/skill-routing-map.yaml` (compound phrases; they do not collide with existing
  brainstorm/html-prototype/design-brief entries).
- `/muse-req-triage` — batch candidate-requirement triage: rule-based scoring + independent
  classification, produces a to-adjudicate list. Two entrances: standalone (entrance A — screen
  first, then feed survivors into `/brainstorm`) or internally dispatched by
  `/muse-loop-orchestrate` (entrance B).
- Semantic fallback (applies even when the route-guard keyword table misses): batch
  requirement-prescreen intent such as "筛一遍这堆需求" / "要不要先过一遍再进 brainstorm" routes
  to `/muse-req-triage`; end-to-end autonomous orchestration intent such as
  "从需求到原型跑一遍完整流程/闭环" routes to `/muse-loop-orchestrate`.
- `muse-proto-gen` (hidden; dispatched internally by `/muse-loop-orchestrate` only when the OD
  daemon is unreachable; no standalone entrance) and `muse-proto-judge` (an agent definition,
  likewise internal-only) are never exposed to the user.

For slash-command-like requests, read `.claude/commands/<command>.md` first. That command usually
points to the exact skill file.

---

## 8. Prototype Rules

When generating or editing prototypes:

- Read `framework/README.md` before selecting or modifying a template.
- For `/open-design` (design-output primary), read `.claude/skills/office/open-design/SKILL.md`;
  it stages an OD project (binds the design system, writes brief.md) and **by default has the user
  generate in the OD desktop app (subscription session, reliable), then recovers on "拉回来"**;
  headless one-shot via the daemon `/api/chat` is opt-in only; it was unreliable this session (slow
  generation >2.5-3min + daemon SIGTERM restarts), so on failure it degrades to desktop (retry once),
  not magicpath. (Auth aside: the spawned `claude` needs the **correct** `USER` (the real username) in its
  env to use the subscription — empty/wrong USER falls back to API credit, LOGNAME won't
  substitute; OD provides it, so auth is not the failure.) Lands index.html + prototype-spec.md under
  docs/prototype/ for /figma-layer. Injects FxUI color/font/size tokens only (no component-library binding). Falls back to
  magicpath/html-prototype only when the OD daemon is truly unreachable.
- For `/html-prototype`, read `.claude/skills/office/html-prototype/SKILL.md`, then apply its
  dynamic reference protocol, current aesthetic rubric, and QA gate.
- For `figma-demo` (hidden skill — no slash entry; reachable only via internal Skill-tool
  dispatch), read `.claude/skills/office/figma-demo/SKILL.md`; its blueprint,
  mapping-proof, Builder/Assembly, and QA requirements override generic prototype generation flow.
- Copy the correct template into `docs/prototype/YYYY-MM-DD-<topic>/index.html`.
- Copy required assets into the prototype directory when the page must be portable.
- Keep top navigation, channel bar, and CRM sidebar unchanged unless requested.
- Replace only the intended `data-module` region.
- Use local Tailwind CDN: `./assets/vendor/tailwindcss.com.js`.
- Use `data-prototype-state` for prototype-only state markers; do not overload framework or component `data-state`.
- Use existing icons from `framework/assets/icons/` or `framework/assets/ai-notes/` before inventing new assets.
- When the prototype depends on current UI/AI-product aesthetics, use available tools to gather
  dynamic references from top-tier products, extract shared patterns, and document the reference
  basis in `prototype-spec.md`.
- For `/html-prototype`, run
  `node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs <prototype-dir>/index.html <design-brief.md>` when Node is
  available.
- For `figma-demo`, run
  `node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs <prototype-dir>/index.html --mode=figma-demo` when Node is
  available.
- Record pass/fail and residual risks.
- Respect type scale:
  - `text-15` for section titles.
  - `text-13` for core content and field values.
  - `text-12` for weak info and timestamps.
- Respect spacing scale: 4, 8, 12, 16, 24, 32, 40 px.
- Avoid turning every section into a card. Use cards only for repeated items, modals, and genuinely framed tools.

---

## 9. Review Rules

When reviewing, lead with findings:

- Order by severity.
- Include file paths and line references when available.
- Separate bugs, product risks, visual/interaction issues, and missing tests.
- If no issue is found, say so directly and mention remaining verification gaps.

Do not bury findings under a long summary.

---

## 10. Session Start Checklist

At the start of a task, silently check:

```text
[ ] Read CONTEXT.md.
[ ] Read CLAUDE.md.
[ ] Read .claude/workflow-state.yaml.
[ ] Apply project context gate before skill routing.
[ ] Apply route-guard layers: Project Gate / Plan Agent / Multi-Skill / Single-Skill / STOP.
[ ] If workflow-related, read .claude/skills/office/SKILL.md.
[ ] If slash-command-like, read .claude/commands/<command>.md.
[ ] If skill-like, read .claude/skills/office/<skill>/SKILL.md.
[ ] Identify scene A/B/C/D if relevant.
[ ] Identify output path before writing.
[ ] Verify after writing.
```

Only report this checklist to the user if it affects the work or the user asks.

---

## 11. Non-Goals

- Do not maintain a second, divergent workflow system in `AGENTS.md`.
- Do not duplicate every Claude skill body here.
- Do not pretend Codex can directly execute Claude slash commands.
- Do not use this file to store task-specific notes.
- **Do not attempt per-agent model-tier dispatch.** The capability tiers in §4.8.2 are *intent*, not
  a dispatch mechanism: `.claude/skill-os/model-routing.yaml` + the `recommended-model` frontmatter
  are consumed by Claude-side CI and the orchestrator prompt only. Whether Codex exposes a per-agent
  `model` parameter is **unverified on a real Codex (currently assumed "no", pending a spike)**, so tier
  **dispatch** is a Non-goal here until that spike; honor the intent, do not fake the wiring.
- Do not edit `CLAUDE.md` or `.claude/skills/office/*` unless the user explicitly asks to change
  the Claude workflow itself.

<!-- FILE_END: AGENTS.md -->
