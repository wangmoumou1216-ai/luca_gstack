# AGENTS.md — Codex root adapter

This is the independent Codex entry contract for **luca_gstack**. It contains only the always-on
safety and routing kernel. Detailed truth lives in the one-hop owners named below; read a target
directly and through its final line when its condition matches. Do not load another runtime's root
adapter.
Conditional loading is behavioral: a match requires an observable read of the target before any
answer, even when this root seems sufficient. Naming or citing an unread target is noncompliant.

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

The **five** Plan triggers are: `≥ 3 files`; `≥ 2 independent subagents`; explicit **phase
dependency**; **irreversible operations**; or an explicit user plan request such as “先做个计划”.
Read `.claude/agents/plan-agent.md` through EOF before answering when any trigger matches. Produce a phase plan
with assertions first. **Supervisor** or **Hierarchical** execution requires real user **approval**
after the plan; planning permission is not mutation permission. A failed critical gate stops the
next phase.
<!-- K3:END -->

<!-- K4:START -->
## K4 — Skill discovery and STOP

Before answering or choosing a skill—including a **STOP** outcome—read
`.claude/skill-os/generated/skill-catalog.md` through `FILE_END`. Route by **semantic** intent, not
keyword coincidence. Directly invoked skills still obey Plan and safety gates. The only routing
exemption is a truly **mechanical single-file** edit with no design, research, review, or product
judgment. Ambiguous multiple matches require one user choice; no match requires catalog-backed
discovery before ordinary execution. In a discovery case, **name the exact matching catalog skill**
and its authority; saying only that the catalog is discoverable is incomplete.
<!-- K4:END -->

<!-- K5:START -->
## K5 — Project/session isolation

The per-**session** project pin is binding truth. `docs/`, workflow-state, and current-topic
**symlink** aliases are display-only; never derive or repair a pin from them. Framework/meta work
stays **NO_PIN** and must not touch those aliases or downstream projects. A project switch/create
uses only the complete current-turn **transaction** emitted by route-guard—never a hand-written bare
switch command. Read `.claude/skill-os/runtime/project-session.md` through EOF before any answer
to framework/meta/`NO_PIN` work or a request that names, implies, switches, creates, or cross-reads
a project, and before any project-scoped read/write/switch/create or cross-project reference. Codex uses
`scripts/project-read.mjs` only for an exact granted cross-project text read.
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

Normal startup uses memory summary/search only. Memory extraction defaults to no write; on a user
correction or remember request, read `.claude/skill-os/extraction-bar.md`, then
`.claude/skill-os/correction-attribution.md`, each through EOF. The **Static Fallback** below is the
exact projection of `memory/semantic/static-fallback-allowlist.txt` from
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
3. Read `.claude/skill-os/generated/skill-catalog.md` through `FILE_END` before routing.
4. Evaluate `.claude/skill-os/agent-context-manifest.json`; for each matching **conditional** entry,
   read its `target` directly through EOF before answering. An explicit framework/meta/`NO_PIN`
   scope matches `project-session`. Citing an unread target fails this gate; do not follow an
   invented second-hop pointer.
5. Only with a verified project pin, read workflow-state and the latest DONE-node project handoff.
   A NO_PIN framework/meta session skips both shared project surfaces.
6. When executing a skill, read `.claude/skills/office/SKILL.md` and that skill's `SKILL.md` fully;
   use input modes and active rules only when their manifest/skill conditions apply.

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
Before answering, cross-harness work loads `.claude/skill-os/runtime/cross-harness.md` and verifies both independently.
Select subagent reasoning effort from `.claude/skill-os/model-routing.yaml`; inherit when unsure and
never hardcode a model name. Runtime safety/capability facts bind, while behavioural preferences do
not erase semantic routing; load `.claude/skill-os/runtime/harness-boundary.md` on such a conflict.
<!-- K10:END -->

## Execution and completion

- Instruction priority: latest user request → runtime safety/capability limits → project red lines
  and Project Gate → repository router → selected skill contract → local patterns.
- Restate the operational goal before significant work. Use scene A/B/C/D only for product-design
  work and only from user/context evidence.
- For long, phased, handoff, compaction, or pre-effect work, load
  `.claude/skill-os/runtime/long-session.md` and preserve a phase checkpoint.
- Codex may emulate a shared workflow only by reading its authority files and executing their
  procedure; it must not claim that another harness's slash command ran.
- Skill completion language is `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT` as defined
  by `.claude/skills/office/SKILL.md`.
- Do not claim completion from file-size reduction or legacy tests alone. Use behaviour evidence,
  mutation where required, and independent review when the task's gate demands it.

<!-- FILE_END: AGENTS.md -->
