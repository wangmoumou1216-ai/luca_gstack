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

This repository is a design and prototype workspace for **纷享销客 CRM**.

Core facts:

- Product domain: CRM, enterprise sales workflows, AI-assisted productivity.
- Prototype stack: plain HTML + local Tailwind CDN + native JavaScript.
- Prototype framework: `framework/`.
- Workflow outputs: `docs/`, which must be a symlink to the active project at
  `/Users/luca/Desktop/项目/<project>/docs`. Session stickiness (G6, 2026-07-04): `session-restore.mjs`
  clears the three project symlinks on SessionStart only when `source === 'startup'` AND no active
  parallel session is detected (other-session counter/transcript mtime < 15min) AND
  `SESSION_RESTORE_ALWAYS_CLEAR` is unset; a dangling link is cleared unconditionally. When the link
  is preserved, the session "inherits" the active project — route-guard notes it on the first message.
  Name-to-switch (2026-07-06): naming an existing project (or semantically describing another/new
  project) makes the main agent switch/create decisively without asking (a new project detaches the
  current one). Only confirm once when the message points at no project yet you must do real work
  under the never-confirmed inherited project. The active project is still a global shared symlink
  (lightweight fix, not per-session isolation): switching overwrites a parallel session's pointer, but
  no longer silently — the switched-away session gets a route-guard drift warning next turn and a
  post-edit "may write to wrong project" warning on any docs/ write.
- Long-term memory: `CONTEXT.md`.
- Claude workflow state: `.claude/workflow-state.yaml`, which must be a symlink to the active
  project's `/Users/luca/Desktop/项目/<project>/.luca/workflow-state.yaml`.
- Skill OS contracts: `.claude/skill-os/`.
- Skill observability: `.claude/observability/`.
- Growth candidates (Hermes-style): `memory/semantic/` (candidate→review→promote via `memory/scripts/propose_semantic.py`; legacy `.claude/hermes/` was removed in commit 1dc1475).
- Brand primary color: `#FF8000`.
- Brand color budget: use the primary color no more than 3 times per page unless a task explicitly overrides it.

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

- Product is 纷享销客 CRM.
- Brand primary is `#FF8000`, limited to no more than 3 visible uses per page.
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
docs/review/YYYY-MM-DD-<topic>-handoff-review.md
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
- Active project artifacts and workflow state live under `/Users/luca/Desktop/项目/<project>/`.
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
   or `PLAN CHECK` (a skill in the `HEAVY_ORCHESTRATOR_SKILLS` extension point was hit — **in this
   fork the set is injected via settings.json as `ROUTE_GUARD_HEAVY_SKILLS=auto,muse-loop-orchestrate`;
   hitting either escalates to PLAN_CHECK**. The mother repo keeps the set empty by default as of
   2026-07-04 — deepresearch/ux-research/figma-demo/auto rely on their own internal HITL gates, see
   plan-agent.md "条件 2 豁免" — and retains it as a fork/env extension point),
   or the hit skill is known to satisfy any of the Plan Agent 5 conditions,
   read `.claude/agents/plan-agent.md` and produce a phase plan before any single skill. Even on a
   high-confidence single-skill hit, still check the Plan Agent 5 conditions; if any holds, do not
   execute the skill directly. The plan-agent.md trigger table is the single authoritative source;
   PLAN MODE is its keyword approximation and the research-default gate = these 5 conditions + novelty.
   The Plan Agent 5 conditions (任一满足即触发):
   - The task creates or modifies ≥ 3 files.
   - The task needs ≥ 2 independent subagents collaborating (**except internal-HITL orchestrator skills**:
     `/auto`, `/deepresearch`, `/ux-research`, `/figma-demo` — orchestrating multiple subagents is their
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
   question; substantial feature/code requirement → check the Plan Agent 5 conditions first. This one
   reflex unifies all semantic special-case handoffs declared in this file — OD single-point handoff,
   project self-judgment, sidebar sensing, luca-open file preview, HTML preview push. **Boundary (乙 —
   NOT dispatch targets):** memory-retrieval timing, model-tier selection, checkpoint/compact, the
   research-default gate, observability rules, Coding Discipline, and handoff/parity are standing
   process disciplines — enforced by deterministic hooks or the orchestration layer, never "routed by
   meaning"; do not force them through semantic dispatch.

Hidden skill semantics still require explicit user intent: `challenge`, `handoff-review`,
`design-review`, `taste-review`, `redteam`, `evals`, `retro`, `careful`, `fx-icon-search`,
`compare`, `figma-demo`, and `magicpath` are not proactive first-level routes (same 12-item
hidden/advanced roster as CLAUDE.md).

Muse fork additions (this fork only — the mother repo `luca_gstack` has none of these files):

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
- Do not edit `CLAUDE.md` or `.claude/skills/office/*` unless the user explicitly asks to change
  the Claude workflow itself.

<!-- FILE_END: AGENTS.md -->
