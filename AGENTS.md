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
3. Framework flow before skills: 自成长/演进/对标 → `framework-evolution`（研究仅作内部阶段）。
4. Ambiguity next: 多候选 → 问用户，不自行判断。
5. Single skill last: 只在高置信且不触发 Plan Agent 5条件的前提下调用 skill。
6. Keyword source: `.claude/skill-os/skill-routing-map.yaml`。

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
  project's absolute path, and **denies reads and writes through those shared aliases** when the session has no pin — so the shared symlink
  degrades to display only and a parallel `switch` can no longer pull another session onto the wrong project.
  The pin is written only when the user explicitly names/confirms a project, **never derived from the symlink**.
  Cross-project dependency reads are orthogonal to the pin: only the strict `只读引用:` /
  `只读引用目录:` directives may issue turn-scoped grants (`本会话…` is the explicit session opt-in).
  Grants never create a second binding and never authorize write tools, raw Bash, root scans, traversal,
  symlinks, or control-plane paths; Codex consumes them only through `scripts/project-read.mjs`.
  The MVP is text-only; image, PDF, and MCP local-path consumption remains DEFERRED.
  State reads and `check-project-links` are read-only: legacy text pins require the explicit
  `project-pin.mjs migrate-legacy-pin` command, or exact-value `quarantine-legacy-pin` when their project no longer exists.
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
3. `.claude/workflow-state.yaml` only after the session has a verified project pin; a `NO_PIN`
   framework/meta session skips this shared alias.
4. Latest handoff summary from `docs/handoff/` only for a verified pinned project with DONE nodes.

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

Since 2026-08-15 the **person** (global personal memory) and **project** (project-local) layers
are searchable: `search_memory.py "<query>" --layer person|project` (both are also included in
`--layer all`). `MEMORY.md` itself and un-adjudicated `candidate_*` files are excluded from the
search surface; `--include-candidates` opts the latter in and tags them `status: CANDIDATE`.

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

### 4.8.2 Model routing（能力档 — Codex 侧落在 reasoning effort，2026-08-04 spike 已核验）

> **Codex 接线现状（2026-08-04）**：本仓已具备 Codex 侧完整接线，读取顺序与落点如下——
> `.codex/hooks.json`（6 个生命周期 hook，全部经 `.codex/codex-hook-adapter.mjs` 调用）／
> `.codex/agents/*.toml`（可 spawn subagent）／`.agents/skills/*`（42 条软链 → `.claude/skills/office/*`）／
> `.codex/workflow-runner.mjs`（Workflow 后端：Claude 的 Workflow 工具在 Codex 无对应物，本 runner 把
> workflow 脚本注入的 `agent()` 接到 `codex exec --output-schema` 上，`.claude/workflows/*.js` 零改写即可运行；
> 用法 `node .codex/workflow-runner.mjs <workflow名> [--args '<json>'] [--dry-run]`。
> **沙箱姿态（2026-08-05 红队裁决）**：`-C <scratch>` 把 agent 工作根隔离到临时目录 +
> `workspace-write` + `sandbox_workspace_write.network_access=true`。依据是实测
> **codex 沙箱的读是全局的、只有写受工作根约束**，故可同时拿到「发现层联网」与「仓库写入被沙箱硬拦」；
> 仓库仍可读（workflow 的需求全是读）。**propose-only 是 prompt 层影响，不是沙箱强制**——
> 真正的机械强制来自工作根隔离。)
> adapter 负责入向 `tool_name` **按目标 hook 分流**别名（`apply_patch`→给 project-scope-guard 是
> `Bash`〔其分支扫 `input.command`〕、给 post-edit 是 `Write`〔按工具名计编辑数〕）与出向**最小**适配
> （裸文本→`additionalContext`；`updatedInput` 补 `permissionDecision:allow` 后原样透传）
> ——因此 `.claude/hooks/*.mjs` 六个脚本零改动、Claude 路径零影响。
> **刻意不翻译 `decision:block`**：Codex 与 CC 同字段同语义（二进制校验串
> `Stop hook returned decision:block without a non-empty reason`），初版译成 `continue:false`
> 是语义反转（=终止本轮），已回退。**`updatedInput` 受支持**（校验串
> `PreToolUse hook returned updatedInput without permissionDecision:allow`），初版据旧版 issue
> 降级为 `deny` 亦已回退。
> 需要知道**实际跑在哪个 CLI** 时用 `harness.mjs` 的 `actualHarness()`（读 `LUCA_ACTUAL_HARNESS`），
> **不要**用 `detectHarness()`——后者回答的是"该按哪套协议输出"，在 adapter 下返回 `claude` 是正确的。
> 验收：`node scripts/verify-codex-wiring.mjs`（静态段随时可跑；活体段需可用订阅）。
>
> **调用语法（2026-08-05 活体实测）**：Codex **不执行** `.claude/commands/*.md`，`/brainstorm` 这类
> 斜杠语法无效；但同一批 skill 经 `.agents/skills/` 软链**完全可用**，用 **`$<skill-name>`**（如
> `$quick-research`）或 `/skills` 选择器调用，读到的是同一份 SKILL.md。`.claude/commands/` 里那 26 个
> 文件是薄包装（正文即"读 SKILL.md 并执行"），故**功能无缺口、仅语法不同**。
> subagent（`.codex/agents/*.toml`）**仓库级即可被发现**（与 hooks 不同），按名派发；
> 工具名里的连字符会转成下划线（`preflight-agent`→`preflight_agent`），注册名不变。
>
> **Codex 实测事实速查**（全模块矩阵与证据见 `framework-audit/2026-08-05-codex-module-matrix.md`）：
> tool_name：shell 执行=`Bash`（**非 `shell`**）／文件编辑=`apply_patch`，**两者 tool_input 均为
> `{command}`、无 `file_path``；hooks.json 事件名用 **PascalCase**（snake_case 仅是 trust-state key）；
> effort 枚举模型接受 `none/low/medium/high/xhigh/max`、**拒绝 `minimal`**；结构化输出为 strict
> （每层 `required` 须列全 properties + `additionalProperties:false`）；`codex exec` 在 stdin 未 EOF 时
> **永久挂起**，自动化调用必须 `< /dev/null`。
> **hooks 注册（2026-08-06 二次修正）**：**仓库级 `.codex/hooks.json` 完全可用**，配置随版本控制走，
> 不需要也**不应**并入用户级（全局注册会在其它项目里空跑）。此前判「仓库级不被加载」是错的——
> 真因是 hooks.json **顶层只接受 `description` 与 `hooks`**，多写一个 `_comment` 键会让整份文件被拒
> （`unknown field _comment`），而该警告只在会话启动时一闪而过，极易误判成机制不支持。
> 唯一仍需的一步是**授信**：新增/改动条目后跑 `node scripts/codex-trust-hooks.mjs`
> （用 Codex 自己的 `hooks/list` + `config/batchWrite`，只碰本仓条目；先 `--dry-run` 过目）。
> 断言 S11/S11b/S12 分别守：顶层键合法、未重复全局注册、已授信。

真值源 `.claude/skill-os/model-routing.yaml`（Codex 侧解析表在其 `codex:` 段）。
**per-agent 档位分派已在真 Codex 上核验可用**（2026-08-05：Codex 找到 `.codex/agents/preflight-agent.toml`、
按其 `low` 档派发、子 agent 正常返回），此前"尚未核验、按不能保守假设"的表述已过期，据实更新。
**但档位落在 `model_reasoning_effort`，绝不写死模型名**——模型名随账户/订阅失效（实测三个历史可用
名在订阅到期后全被服务端拒），effort 枚举则稳定；且实测**模型拒绝 `minimal`**（config 解析器却接受它），
可用集为 `none/low/medium/high/xhigh/max`。一致性由 `verify-codex-wiring.mjs` 的 S8b/S8c 守护
（S8c 把实测禁用值硬编码在检查脚本侧，改 yaml 松不动它）。
档位**意图**跨 harness 不变——按判断杠杆选强弱：

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
- `.claude/skills/{codebase-design,code-review,grilling,diagnosing-bugs,resolving-merge-conflicts,to-spec,to-tickets,wait-what,wayfinder,implement}`：
  仅为指向 `office/` 真值源的 Claude native aliases（不复制正文；`code-review`
  覆盖 bundled `/code-review`，其 `/review` alias 仍属原生）
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

### 7.0 First-class skill table（Codex 侧的路由基底，2026-08-08 补）

**为什么这张表必须在这里、而不是靠 skill 描述**（实测，别再假设）：Codex 会把**所有**已装
skill 的描述压进「2% skills context budget」——2026-08-08 实测本机加载 **106 条** skill
（当时项目 33 + `~/.claude/skills` 40 + 各插件），预算按条数均摊，于是**当时 33 条项目 skill 里有 32
条的描述被截到约 40 字符**（`brainstorm` 716→40、`magicpath` 774→40）。40 字符对语义路由等于没有。
Codex 的告警原文是「Codex can still see every skill, but some descriptions are shorter」——
**skill 一个都没丢，丢的是描述**。关插件解决不了：106→76 也只是把 40 字符抬到约 55。
AGENTS.md 全文注入、**不受该预算约束**，所以路由信息必须落在这里。
（同理，route-guard 经 `.codex/hooks.json` 的 UserPromptSubmit 注入、`additionalContextLimit=0`
完整直传，是第二条不受预算影响的路由通道。）

| 命令 | 场景 | 用途（一行） |
|---|---|---|
| `/auto` | A B C D | 全自动多 Agent 编排：自然语言需求 → Skill Pipeline → 并行执行 → 聚合产出 |
| `/handoff` | 会话工具 | 当前对话 → OS 临时目录 Markdown，供新 session/agent 接手；显式调用，不替代项目级 workflow handoff |
| `/idea` | A B | **已有原始语料**忠实结构化（会议纪要/语音稿/讨论记录）；新想法走 `/brainstorm` |
| `/brainstorm` | A B D | 苏格拉底拷问式 PRD（用户说「写 PRD」即路由到它，不暴露独立 `/prd`） |
| `/deepresearch` | A B D | 多 Agent 深度研究，产出研究报告 |
| `/quick-research` | A B D | 轻量研究（单 agent 后台查 primary source，单文件落盘）；发散题升 deepresearch |
| `/insight-synthesis` | A B D | **一手定性数据已在手**（访谈/工单/回访）→ observation+interpretation 两层洞察，不臆造语料 |
| `/research-kit` | A B D | 假设 → 访谈提纲/问卷/可用性测试计划/卡片分类法。**采集之前**用；三不产：不产发现/解读/不代采集 |
| `/ux-research` | A B D | 多维度 UX 深度研究（并行 agent + 共识矩阵 + 苏格拉底审查） |
| `/ux-brainstorm` | A B D | **发散引擎**：研究/想法 → 2-3 方案 + Oracle 对抗 + 交互架构 + AI-Native 判定 |
| `/design-brief` | A B C D | **收敛引擎**：方向 → 规格契约（决策卡/状态/组件映射/Generation Packet） |
| `/ux-writing` | A B C D | 界面语言：voice/tone + 微文案系统 + 文案评审改写（「提示语生硬/空态说什么/报错文案」） |
| `/open-design` | A B C D | **设计产出首选**：需求 → OD 指令 → 生成 HTML → 落盘 + figma-layer |
| `/html-prototype` | A B C | HTML 原型（备选，OD/MagicPath 不可用时） |
| `/ux-audit` | B C | UX 评审（多选模块） |
| `/figma-layer` | A C | Figma 保险层 |
| `/tech-spec` | A B D | PRD + design-brief → 技术合同，强制覆盖率验证 |
| `/task-plan` | A B D | 任务编排计划：渐进式索引 + 断言矩阵 + 开发/测试任务卡；执行前须过门禁 |
| `/grilling` | 工程/决策 | 一次只问一个尚未决定的关键取舍；先查可检索事实，不扩大 authority |
| `/diagnosing-bugs` | 代码层 | 意外失败/回归/偶发/性能回归的 diagnose-only red loop；expected TDD red 不触发，完成后回原 U-ID |
| `/resolving-merge-conflicts` | 代码层 | 真实进行中 Git 冲突才进；变更/stage/advance/abort 分门，不自动 commit/push |
| `/to-spec` | 工程层 | 已解决工程讨论 → canonical tech-spec 的 conversation_synthesis 薄入口 |
| `/to-tickets` | 工程层 | 显式把已过门、SHA 固定的 task-plan 发布为竖切 tickets；task-plan 仍是唯一真值 |
| `/wait-what` | 会话层 | 显式补足上一条缺失前提，用自然中文和项目术语重新讲清楚；零产物、零状态、零 authority 扩张 |
| `/wayfinder` | 规划层 | Plan Agent 薄入口；自动建议仅 huge AND multi-session AND fog，direct 按名可直达 |
| `/implement` | 工程层 | 已冻结、已批准 task-plan → exact U-ID；Plan Agent 编译，Orchestrator 拥有执行状态 |
| `/codebase-design` | 代码层 | Module/Interface/Depth/Seam/Adapter 共享原语；模块深化、接口收敛和测试面设计，不是 workflow 节点 |
| `/code-review` | 代码层 | 固定 WORKTREE_DIFF/比较点/FILE_SET 后分离 Standards/Spec 两轴，只读报告；复用 code-hygiene Mode D |
| `/code-hygiene` | 代码层 | 完成前验证铁律（done 前须有当场跑出的证据）+ 8 清理算子；只自动应用 HIGH 置信 |
| `/code-recon` | 代码层 | Brownfield 正门：并行只读 recon 把代码库逆向成架构 brief（标 VERIFIED vs INFERRED），只读不改 |
| `/muse-req-triage` | muse | 批量候选需求 triage：rule-based 打分 + 独立分类，产出待裁清单 |
| `/muse-loop-orchestrate` | muse | 需求→原型自治 Loop 编排器，自带两个不可省略的人类卡点（GATE-1/GATE-2） |

`engineering-delivery` 是可选无状态 preset：只有用户明确选择才作为 routing metadata。
未选择时七项全部 standalone，optional graph 可删且不是 loader/状态依赖；选择也不授予 effect authority。

场景：**A=新功能设计 · B=已有功能优化 · C=线上评审改版 · D=Agent 化改造**。
隐藏/高级 skill（`challenge`/`redteam`/`evals`/`retro`/`careful`/`compare`/`figma-demo`/`magicpath`）
不占入口但**不等点名**：执行中命中其场景时主动提出是义务。触发词唯一真值源仍是
`.claude/skill-os/skill-routing-map.yaml`。

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
   naming/implying an existing project → execute the exact `switch` transaction emitted for the current
   `UserPromptSubmit` (no confirm); explicitly a new project → execute its exact `new` transaction
   (detaches current) immediately; never hand-write a bare `project.sh switch/new`. A big new requirement you judge to
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
3. **Framework flow.** If route-guard reports `FRAMEWORK FLOW`, enter `framework-evolution` and
   choose benchmark or scout from `.claude/skill-os/evolution/BENCHMARK-RUNBOOK.md` and
   `CHECKPOINT.md`. Research skills are evidence-gathering stages inside this flow, not substitutes
   for it; framework/meta sessions never switch to a downstream project for this work.
4. **Multi-skill ambiguity.** If route-guard reports competing candidates, ask the user to choose
   an order or suggest `/auto`.
5. **Single-skill route.** Use `.claude/skill-os/skill-routing-map.yaml` as the keyword and invoke
   source. Do not duplicate its full trigger table here.
6. **STOP / low confidence — semantic routing contract (2026-07-12).** route-guard is a keyword-only
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
   sessions these app actions prefer the `mcp__muse__*` tool channel when visible — **Codex sees the
   same channel** (verified 2026-08-07; the app injects it per-CLI via
   `--mcp-config` for Claude and `-c mcp_servers.muse=` for Codex), so only sessions outside the app
   fall back to the shell-script paths as the documented degrade route (the channel now exposes
   seven tools — workspace_state / preview_screenshot / open_in_view / web_locate / sidebar_read /
   sidebar_selection / sidebar_navigate; read-side tools default to not stealing focus, and claude.ai
   is hard-refused for agent read/screenshot; when the user says "这个/这段/这里/this one" while the
   sidebar is open, call `sidebar_selection` to resolve the reference instead of guessing which
   element they mean — they are looking at the screen, you are not); sidebar-delivery rule:
   show-intent URL opens go to the app sidebar — `open_in_view(url)` or `luca-open.sh --url` — and any
   browser-automation end state gets pulled back into the sidebar; Chrome automation itself is
   Claude-only tooling, out of scope for Codex) and covers mapping to
   a skill / a flow / a declared tool action. **Boundary (乙 — NOT dispatch targets):** memory-retrieval
   timing, model-tier selection, checkpoint/compact, the research-default gate, observability rules,
   Coding Discipline, handoff/single-truth-source discipline, and the HTML-output preview push are standing process disciplines
   — enforced by deterministic hooks or the orchestration layer, never "routed by meaning"; do not
   force them through semantic dispatch (explicit user naming of any item still executes it — the
   exclusion targets semantic recognition, not refusal).

Hidden skills hold no first-level entry, but **"no entry" ≠ "wait to be named"** (aligned
with CLAUDE.md 2026-08-03): `challenge`, `redteam`, `evals`, `retro`, `careful`, `compare`,
`figma-demo`, and `magicpath` (same 8-item roster) are invoked by name, and **proactively
surfacing one when its scene occurs mid-execution is a duty, not promotion** — the user cannot
be expected to memorize low-frequency skill names. Review→R4 assets; comparison→`compare`;
major-delivery wrap-up→`retro` (route-guard 40-turn nail as backstop); Scene-A PRD→`challenge`
(brainstorm Phase 7 nail). Only stay silent when neither the user asked nor the scene appeared.

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
[ ] If project-pinned, read .claude/workflow-state.yaml; if NO_PIN, skip the shared alias.
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
- Do not pretend Codex can directly execute Claude **slash** commands (`/brainstorm` 等语法仍是
  Claude 侧的)。**但同一套 skill 本体在 Codex 下是可达的**（2026-08-04 接线）：`.agents/skills/`
  下 42 条软链指向 `.claude/skills/office/*`，Codex 按 `$<skill-name>` 或 `/skills` 选择器调用，
  读的是同一份 SKILL.md（软链非副本——复制会漂移，见 b2b83d3）。所以正确说法是
  「触发语法不同，skill 本体同源」，不是「Codex 用不了这些 skill」。
- Do not use this file to store task-specific notes.
- **Per-agent model-tier dispatch：spike 已完成（2026-08-04），结论是"能做，但不落在模型名上"。**
  此前本条基于「假设 Codex 不暴露该参数」判为 Non-goal，该假设已被实测推翻：Codex subagent
  （`.codex/agents/*.toml`）确实支持 `model` 与 `model_reasoning_effort` 字段。
  **但档位一律落在 `model_reasoning_effort`，绝不写死模型名**——模型名随账户/订阅失效
  （实证：本机 config.toml 的 `gpt-5.6-sol` 与另两个历史可用名在订阅到期后全部被服务端拒绝），
  而 effort 枚举（`none/minimal/low/medium/high/xhigh`）稳定。档位的不变量是**相对序**，
  Claude 侧投影为模型别名、Codex 侧投影为 effort。
  唯一真值源：`.claude/skill-os/model-routing.yaml` 的 `codex:` 段（`tier_to_effort` + `agents`）；
  一致性由 `scripts/verify-codex-wiring.mjs` 的 S8b 守护（含"禁止硬编码 model 名"断言）。
  `model` 字段一律省略以继承父会话，与 §main_loop「模型是用户 /model 主权」一致。
- Do not edit `CLAUDE.md` or `.claude/skills/office/*` unless the user explicitly asks to change
  the Claude workflow itself.

<!-- FILE_END: AGENTS.md -->
