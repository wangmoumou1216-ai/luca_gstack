# AGENTS.md — Codex root adapter

This is the independent Codex entry contract for **luca_gstack**. It contains only the always-on
safety and routing kernel. Detailed truth lives in the one-hop owners named below; read a target
directly and through its final line when its condition matches. Do not load another runtime's root
adapter.
Conditional loading: read matching targets through EOF by their `load_before` boundary; citing one
unread afterward is noncompliant.

<!-- K1:START -->
## K1 — Repository identity

`luca_gstack` is a **product-neutral Skill OS**, not a generic app and not one product. Product,
brand, domain vocabulary, and implementation constraints come only from the verified **active project**
and its `CONTEXT.md`; never infer them from this framework checkout. The architecture is
Skill-first, Graph-optional, Memory-light, Growth-gated, Governance-callable.
<!-- K1:END -->

<!-- K2:START -->
## K2 — Routing order

For every non-mechanical request, classify in this exact order:

1. **Project Gate** — old/existing/continuing project before any scenario or skill.
2. **Plan** — test complexity before accepting a route-guard skill hit.
3. **Framework Flow** — framework evolution, self-growth, benchmark, or governance work.
4. **Multi-Skill** — several independent high-confidence skill matches.
5. **Single-Skill** — one high-confidence match and no Plan trigger.
6. **STOP** — ambiguity or no match; assess and discover, never treat STOP as permission.

The routing truth is `.claude/skill-os/skill-routing-map.yaml`. A user-chosen Workflow may add
handoff gates; otherwise skills remain standalone.
<!-- K2:END -->

<!-- K3:START -->
## K3 — Plan and approval gate

The **five** Plan triggers are: `≥ 3 files created or modified`; `≥ 2 independent subagents`; explicit **phase
dependency**; **irreversible operations**; or an explicit user plan request such as “先做个计划”.
On a trigger, read `.claude/agents/plan-agent.md` through EOF before producing the phase plan,
assertions, or approval scope. **Supervisor** or **Hierarchical** execution requires real user **approval**
after the plan; planning permission is not mutation permission. A failed critical gate
stops the next phase.
<!-- K3:END -->

<!-- K4:START -->
## K4 — Skill discovery and STOP

Before classifying as **Multi-Skill**, **Single-Skill**, or **STOP**, and before choosing or
invoking a skill, read `.claude/skill-os/generated/skill-catalog.md` through `FILE_END`. Route by
**semantic** intent, not keyword coincidence. Direct invocation still obeys Plan and safety. Exempt
only a truly **mechanical single-file** edit with no design, research, review, or product judgment.
Ambiguity needs user choice; no match needs catalog discovery. In discovery, **name the exact matching catalog skill** and authority; a generic catalog mention is incomplete.
<!-- K4:END -->

<!-- K5:START -->
## K5 — Project/session isolation

The per-**session** project pin is binding truth. `docs/`, workflow-state, and current-topic
**symlink** aliases are display-only; never derive or repair a pin from them. Framework/meta work
stays **NO_PIN** and must not touch those aliases or downstream projects. A project switch/create
uses only the complete current-turn **transaction** emitted by route-guard—never a hand-written bare
switch command. Read `.claude/skill-os/runtime/project-session.md` through EOF before deciding
project identity or project authority, or the first project-scoped read/write/switch/create/cross-
project reference. A project name, implication, switch, creation, or cross-read reaches it. A
framework/meta/`NO_PIN` explanation making no such decision or project I/O uses the inline NO_PIN
floor without reading the cold owner. Codex uses `scripts/project-read.mjs` only for granted
text reads.
<!-- K5:END -->

<!-- K6:START -->
## K6 — Safety and scope

Treat `framework/` as **read-only** template source. Preserve **user work**, including unrelated
dirty files; inspect before editing and keep changes surgical. Destructive, irreversible, Git
publication, GUI, network, or other **external** effects require the authority and approval defined
by the runtime. Never widen a read/write scope merely because a tool can access it. Prefer `rg`,
deterministic commands, `apply_patch`, and the narrowest reliable verification. A three-times
repeated failure is `BLOCKED` with evidence rather than another blind retry.
<!-- K6:END -->

<!-- K7:START -->
## K7 — Human decisions

A **Human Gate** is invariant across harnesses. If platform choice, design decision, scope, or other
machine-nonselectable input is required, stop for a real **user response**. Absence of a
**structured** question widget does not authorize a default; ask one concise plain-text question
and wait.
<!-- K7:END -->

<!-- K8:START -->
## K8 — Governed memory and Static Fallback

Normal startup uses memory summary/search only; extraction defaults to no write. On a
correction/remember/governance signal, read `.claude/skill-os/extraction-bar.md` through EOF before deciding whether to store.
If needed, read `.claude/skill-os/correction-attribution.md` through EOF before choosing a person,
framework, or project landing or resuming related work. The **Static Fallback** below is the exact projection of
`memory/semantic/static-fallback-allowlist.txt` from
`memory/semantic/promoted-facts.yaml`; it must remain inline even when hooks or memory loading fail.

<!-- STATIC_FALLBACK:START -->
- [SC-20260905-001 / fxui] framework/ 为只读参考资产；HTML 原型不再强制基于本地母版，视觉与组件约束来自当前已确认项目或用户在外部工具配置的设计系统。
- [SF-003 / workflow] Skill-first, Graph-optional 架构：每个 skill 默认 standalone 可用，Workflow 仅在用户主动选择流程时启用
- [SF-005 / workflow] 产品设计场景四类（产品中性，跨项目适用）：A=新功能、B=已有功能优化、C=线上评审改版、D=Agent化改造；route-guard 本身 scene-agnostic，分类由用户/上下文确认，非绑定任何具体产品
- [SC-20260523-001 / crm] CRM objects use stable IDs
- [SC-20260523-002 / skill-rule] route-guard: 老项目/已有项目/继续项目必须先触发 Project Gate，列出或确认项目；不得直接解释为场景B已有功能优化或进入单个 skill
- [SC-20260523-003 / skill-rule] memory: 稳定事实不得直接写 promoted-facts.yaml；必须先写 semantic candidate，经过 consolidate/review 的 promotion_ready 门禁后才能晋升；普通启动只用 summary/search，治理时才运行 consolidate_memory.py --json
<!-- STATIC_FALLBACK:END -->
<!-- K8:END -->

<!-- K9:START -->
## K9 — Coding discipline

- **Think Before Coding:** state high-impact assumptions; ask only when ambiguity changes intent.
- **Simplicity First:** implement the smallest complete solution; no speculative abstraction.
- **Surgical Changes:** touch only request-traceable lines; no drive-by refactor or cleanup.
- **Goal-Driven Execution:** define DONE and verify with the narrowest credible check.

This discipline is inline and always active; it is not a separate route or visible skill.
<!-- K9:END -->

<!-- K10:START -->
## K10 — Startup, conditional context, and harness truth

Minimal **startup** applies only to non-trivial work. A trivial mechanical question with no skill
or repository action answers directly and loads no conditional target. Otherwise:

1. Run `python3 memory/scripts/get_memory.py --summary`.
2. Read this checkout's `CONTEXT.md` through its `FILE_END`.
3. Read `.claude/skill-os/generated/context-index.md` through `FILE_END`. Each semantically matching
   conditional entry's `target` must be read through EOF by its exact `load_before` boundary.
   Only a boundary that precedes an answer blocks that answer; do not pre-read an owner whose
   boundary has not been reached. If the index is missing, unreadable, or stale, fully read
   `.claude/skill-os/agent-context-manifest.json`; absence never removes obligations.
4. Only with a verified project pin, read workflow-state and the latest DONE-node project handoff.
   A NO_PIN framework/meta session skips both shared project surfaces.
5. Before a skill's preamble, fully read `.claude/skills/office/SKILL.md` and its `SKILL.md`. Once
   skill/mode are known, read `.claude/skill-os/runtime/workflow-mode.md` and the selected
   `.claude/skill-os/generated/input-modes/<key>.json` before input/override/handoff decisions;
   honor fallback. Load active rules only when applicable.

A repository-contract question is non-trivial even when it only asks for classification or an
explanation. For name/route discovery, the catalog is sufficient. To decide a named skill's input,
authorization, handoff, or completion behavior, read that skill's `SKILL.md` and its explicitly
applicable one-hop contract owner even when execution is deferred. Do not run its preamble or load
execution-only schemas, templates, scripts, Git history, sibling metadata, or implementation owners.
Finish the required owners first and stop loading when they answer the request; a referenced
implementation name is not permission for another read.

**Codex** invokes project skills as `$<skill-name>` or through the skill selector; its
`.agents/skills/` aliases point to the same authority bodies. It does not execute Claude slash
wrappers. **Claude** Code uses native slash commands where present. The workflow backend absent in
Codex is exposed through `.codex/workflow-runner.mjs`; never claim native-tool equivalence.
Before designing or evaluating cross-harness work, load
`.claude/skill-os/runtime/cross-harness.md`; verify both before a parity claim. Read
`.claude/skill-os/model-routing.yaml` before selection/validation/dispatch. Select a subagent model role
from it; its adapter resolves private binding while reasoning effort remains independent.
Inherit the anchor role when unsure; never hardcode a model name. Safety/capability facts bind;
preferences do not erase semantic routing. On conflict, load
`.claude/skill-os/runtime/harness-boundary.md`.
<!-- K10:END -->

## Execution and completion

- Instruction priority: latest user request → runtime safety/capability limits → project red lines
  and Project Gate → repository router → selected skill contract → local patterns.
- Restate the operational goal before significant work. Use scene A/B/C/D only for product-design
  work and only from user/context evidence.
- For long work, keep checkpoint/evidence obligations hot; read
  `.claude/skill-os/runtime/long-session.md` before a phase boundary, two heavy agents,
  compaction/handoff, or Git/external effect.
- Codex may emulate a shared workflow only by reading its authority files and executing their
  procedure; it must not claim that another harness's slash command ran.
- Skill completion language is `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT` as defined
  by `.claude/skills/office/SKILL.md`.
- Do not claim completion from file-size reduction or legacy tests alone. Use behaviour evidence,
  mutation where required, and independent review when the task's gate demands it.

<!-- FILE_END: AGENTS.md -->
