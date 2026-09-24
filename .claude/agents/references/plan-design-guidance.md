# Plan Agent design and research Phase guidance

Read this file through EOF before proposing a Phase that performs research, product/design
exploration, prototype generation, or a design-tool handoff. It narrows Phase construction; it does
not choose a tool for the user or grant external effects.

## Research angle and cost gates

Map the request to the smallest matching set of object angles:

- external knowledge or technical feasibility → `deepresearch`;
- external UX, competitors, precedents, or behaviour design → `ux-research`;
- user-supplied first-party qualitative data → `insight-synthesis` before PRD;
- missing first-party data needed to test a key hypothesis → `research-kit`, then pause for human
  collection and resume with `insight-synthesis`.

Recommend an unrequested high-value blind-spot angle at the Plan confirmation gate and list angles
considered but not selected. Trivial work triggers no research suggestion. Angle selection belongs
to Plan; a research skill's later human gate controls depth/cost at a different granularity.

When a task is both complex and novel, research is the default. Here, complex means any main Plan
trigger is true (three-or-more created/modified files, two-or-more independent subagents, phase
dependency, or an irreversible operation); novel means the core mechanism/interaction lacks a
mature precedent or the user explicitly identifies it as new to them/the field. Choose
`quick-research` for a
narrow primary-source question worth retaining, `deepresearch` for broad multi-source or technical
feasibility work, and `ux-research` for UX/competitor precedent. A very narrow fact may use one web
spike. Skipping research must be explicit in the proposed Phase plan and confirmed; cost, schedule,
or the ability to ask the user are not sufficient silent-skip reasons.

## Heavy skill isolation

`deepresearch`, `brainstorm`, `ux-research`, and `ux-brainstorm` each consume substantial context
and must occupy a separate Work Agent/Phase. Never combine two of them in one Work Agent. Non-
interactive research (`deepresearch`, `ux-research`) may use a subagent; interactive work
(`brainstorm`, `ux-brainstorm`, `design-brief`) stays in the main agent. Independent non-interactive
research phases may fan out together, up to three.

Use skills according to evidence, not a fixed script:

| Skill | Use | execution_context |
|---|---|---|
| `deepresearch` | broad external evidence or feasibility | subagent |
| `brainstorm` | ambiguous product requirements with live user choices | main_agent |
| `ux-research` | systematic UX/competitor evidence | subagent |
| `ux-brainstorm` | live exploration of UX alternatives | main_agent |
| `design-brief` | convert an agreed solution into interaction specification | main_agent |
| `open-design` | preferred design output; desktop by default, headless opt-in | main_agent |
| `magicpath` | user-selected React component prototype alternative | subagent |
| `html-prototype` | user-selected local HTML alternative | subagent |
| `muse-req-triage` | user has a requirement corpus needing human triage first | main_agent |

`muse-req-triage` keeps its own AskUserQuestion decision gate. Plan may schedule its position but
must not skip or answer that human gate.

## Ordered design chain

For a full design chain, preserve this order and omit a node only when its applicability was
explicitly assessed:

```text
research → brainstorm/PRD → ux-brainstorm → design-brief → design output → implementation
```

The design-output Phase is independent from implementation and exists to validate interaction; it
must not be merged with a production implementation Phase. It starts only after the design-brief
handoff gate passes and the chosen tool's availability/authority gate is resolved.

When a design chain proceeds from `design-brief` to implementation, the intervening design-output
Phase is mandatory: it must not be omitted, merged with implementation, or bypassed by proceeding
directly to implementation.

`ux-research` may run alongside an already-started brainstorm only when a PRD file exists, it
contains target users and core features, and no blocking `[待确认]` remains. Otherwise it waits.

## Design output choice and authority

Prefer `open-design`, but only the user's actual choice or an already approved named fallback plan
authorizes a different tool. A daemon, authentication, platform, or framework failure does not
grant permission to switch tools. `skills_needed` must match the approved choice. Tool switching
does not waive the upstream handoff gate or expand external write authority.

- `open-design`: use its Phase 0 daemon check. Completion requires actual non-empty generated HTML
  recovered from the exact bound project; `EXPORTED` or `STAGED` is not generated/DONE. After an
  authorized headless retry fails, recover through the same staged project's desktop UI rather than
  switching to MagicPath.
- `magicpath`: use its own availability and execution contract. Require the job status to be
  `completed` and inspect the actual generated filename; platform casing must not be hard-coded.
- `html-prototype`: use its input/output and QA contract. Require the exact output and Phase 4.5 QA.

MagicPath completion example, only after the user selected it:

```bash
# [BLOCKING] <ID> — MagicPath component build completed
npx -y magicpath-ai code status <jobId> -o json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('status')=='completed' else 1)" \
  && echo "PASS <ID>" || echo "FAIL <ID>"
```

After `code start`, list `src/components/generated/` before binding a component filename. When a
plan compares a generated name with the design brief, use a `[WARNING]` case-insensitive assertion;
reasonable platform casing must not block the Phase.

## Phase shape reminder

Research/design phases still use the main Plan contract: declare `phase_type`, orchestration,
agent ownership, exact outputs, model tier, dependencies, stage gate, binary criteria, and user
decisions. `skill_execution` requires a handoff whose `gate_result` is PASS. Interactive skills
cannot be hidden in parallel subagents.

<!-- FILE_END: agents/references/plan-design-guidance.md -->
