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

Research is gated on a named decision, not on complexity or novelty. Write down the design decision
that external evidence could overturn or confirm, and the fact that would do so; if the fact is not
already in the inputs and the user cannot simply answer it, research that question at the smallest
sufficient depth. Complexity (any main Plan trigger: three-or-more created/modified files,
two-or-more independent subagents, phase dependency, or an irreversible operation) or novelty alone
does not require research, and not researching needs no confirmation. Choose `quick-research` for a
narrow primary-source question worth retaining, `deepresearch` for broad multi-source or technical
feasibility work, and `ux-research` for UX/competitor precedent. A very narrow fact may use one web
spike. Cost or schedule are not reasons to skip a named, decision-changing question; a research
phase whose named decision cannot be written is not scheduled.

## Heavy skill isolation

Depth and discovery effort are separate from product scope. Explicit `research_depth=focused`
in deepresearch/ux-research uses their one-researcher decision-question contract; legacy
deep/moderate stay available and deep remains the default. Explicit `discovery_mode=focused`
in brainstorm/ux-brainstorm removes fixed scans and answered-question repetition while keeping
all relevant checks, real user choices and independent Oracle. Missing selection means full;
new/mixed labels alone never upgrade focused. Do not promote these experiments by default.
Choose only the unresolved fact/product/interaction work; mature agreed inputs may enter Brief
directly under its input contract. Critical unfamiliar mechanisms or first-party unknowns still
need named evidence and cannot be declared ready; local escalation does not grant full-mode work.

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
| `design-output` | inherit choice or ask OD/CD once; no separate node | main_agent |
| `claude-design` | trusted Muse Design staging; manual generation; exact export/recovery | main_agent |
| `open-design` | explicitly selected OD; headless by default, preserve explicit desktop/stage-only scope | main_agent |
| `motion-polish` | refine motion in actual existing HTML within confirmed scope | main_agent |
| `muse-req-triage` | user has a requirement corpus needing human triage first | main_agent |

`muse-req-triage` keeps its own AskUserQuestion decision gate. Plan may schedule its position but
must not skip or answer that human gate.

## Select design work by the unresolved gap

This is the shared selection and local-return owner for product-design Phase planning and R3
workflow recommendations/resumption. A/B/C/D describes the task; it does not require an entire
static path. The default design entry is design-brief (C keeps its ux-audit baseline); add an upstream
skill only for a named gap in the table below. Direct single-skill requests stay standalone and do not load a graph or upstream
skills for completeness. Apply the named-decision research rule and real human gates above unchanged.

Before invoking a node, use the existing entry/plan sentence to name the unresolved gap, the
capability, the decision it could affect and the stopping condition. Inherit readable evidence
and actual prior answers; add no routing questionnaire, report or approval. Do not invoke research
merely to discover it was unnecessary; its zero-question branch still has its own examiner.

| Actual gap | Smallest relevant work | When it is unnecessary |
|---|---|---|
| Raw expression cannot yet be faithfully understood | idea | requirements already understandable |
| Product goal, scope or core solution unresolved | brainstorm | those product decisions already confirmed |
| Consequential external fact or feasibility unknown | research matching object and question breadth, under the research gates above | evidence already sufficient; no consequential fact question |
| Competitor design/interaction precedent needed | ux-research, with its conditional competitor method | no applicable decision/risk gap; existing evidence sufficient |
| Current interface problem unclear | ux-audit | valid existing problem/baseline can be reused under its contract |
| Core interaction mechanism has a real unresolved tradeoff | ux-brainstorm | mechanism chosen; remaining work is specification |
| Agreed goals/mechanism need executable design | design-brief | request ends at research/analysis, or an explicitly chosen standalone tool owns its own legal input path |

Competitor analysis may end at ux-research. With a settled mechanism it may feed Brief directly;
with an unresolved mechanism it feeds UX exploration first. A research title does not require
ux-brainstorm. Findings must retain evidence limits and actual adoption, not become MUST merely
because they were researched. Keep, reject or report no increment honestly; do not invent change.
First-party unknowns still require actual user evidence, not competitor observations.

Mature A/B inputs may start at Brief. C preserves its actual ux-audit baseline, same-scope
recheck, P0 and score requirements; do not relabel C as B to escape them. D may start at Brief only
when role, authority, confirmation/takeover and recovery decisions are settled; critical unknowns
return to their owner and real user, not a fabricated mature-input label. These paths do not
promote focused by default or bypass the evidence-gated research rule.

If a skill is selected, preserve its input, independent review and human gates. Stop at the
user's requested deliverable: research alone does not start downstream design; design delivery
includes actual output validation; engineering follows only when requested and its inputs pass.

### Local return after a failed check

| Failure belongs to | Return target |
|---|---|
| Missing consequential external fact | corresponding research question only |
| Product goal/scope conflict | product decision owner and real user |
| Core interaction tradeoff or implemented mechanism fails the task | UX decision owner, with targeted evidence if needed |
| Chosen mechanism lacks state/acceptance wording | design-brief |
| Packet is correct but generated UI omits its condition | generator/output repair and affected revalidation (at most two repair rounds, then report remaining items) |
| Visual refinement within confirmed change/preserve scope | existing visual/refinement owner; no automatic product redesign |

Preserve unaffected confirmed decisions and stable IDs. Invalidate and recheck only affected
consumers/evidence; do not restart unrelated upstream work or waive any affected gate.

## Ordered dependencies within the selected chain

Build only the applicable dependencies: evidence before the decision using it, the selected
product/interaction decisions before Brief, then the chosen output and actual validation.
The full-chain reference below is not a checklist or a reason to add missing nodes:

```text
applicable research → product/interaction choices → design-brief → design output + validation → requested implementation
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

Use `design-output` to inherit the actual tool or ask once between OD/CD. It retains the full task,
binds an unselected frozen Packet via sidecar, and returns conflicting frozen targets to Brief.
Replace the entry with the actual adapter node; it has no second DONE/handoff. Only the user's
actual choice between OD and CD, or an already approved named plan between them, authorizes a different tool. A daemon, authentication, platform, or framework failure does not
grant permission to switch tools. `skills_needed` must match the approved choice. Tool switching
does not waive the upstream handoff gate or expand external write authority.

- `open-design`: use its Phase 0 daemon check. Completion requires actual non-empty generated HTML
  recovered from the exact bound project; `EXPORTED` or `STAGED` is not generated/DONE.
  original_copy v1 is HEADLESS_ONLY: before any profile choice or external stage/run, require actual
  OD default headless plus independent current run grant under OD Phase 0; no extra mode permission
  question. Explicit desktop or missing run authority means STOP at the affected action.
  After original-copy headless failure, desktop generation/recovery is unsupported; retain failure
  and stop when the existing one-retry budget is exhausted, terminal evidence is missing or authority
  is absent. For ordinary carrier/reference_only, after an authorized headless retry fails, recover
  through the same staged project's desktop UI. OD owns the counter; no WA restart may reset it or
  authorize a tool switch.
- `claude-design`: main_agent with trusted Muse caller only; stage has zero sends, the user generates.
  Missing host/recovery/processor capability stops the dependent gate; formal exact artifact/revision
  export, original-copy integrity, independent full-source semantics and final resolution precede DONE.
  OD headless/desktop receipts cannot stand in for CD manual-generation provenance.
There is no third design exit: when neither OD nor CD is available, return NEEDS_CONTEXT with the actionable next step
(start OD, or use CD inside the Luca app Design) and do not switch tools.

## Phase shape reminder

When the approved design-output Phase promises final motion, schedule the explicitly approved
`motion-polish` subunit after scoped mechanical OD recovery and before final semantic acceptance.
Read its SKILL and `.claude/skill-os/runtime/prototype-delivery.md` through EOF at that boundary.
Raw semantic PASS and an OD DONE handoff are not child prerequisites: preserve any raw FAIL and
all original D/STATE/AC, repair only the authorized gap inside the same unfinished Phase, then resume
OD Phase 5/6 after complete independent final PASS. Do not skip the subunit or advance to TS on raw
FAIL. Stage/recover and local `postprocess_plan` metadata add no copy/edit/browser authority.
An existing-HTML refinement task uses the same exact artifact gate without adding a new UI Phase.

Research/design phases still use the main Plan contract: declare `phase_type`, orchestration,
agent ownership, exact outputs, model tier, dependencies, stage gate, binary criteria, and user
decisions. `skill_execution` requires a handoff whose `gate_result` is PASS. Interactive skills
cannot be hidden in parallel subagents.

<!-- FILE_END: agents/references/plan-design-guidance.md -->
