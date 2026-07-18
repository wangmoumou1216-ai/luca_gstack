# PRD Template — Right-Sized, Stable-ID, Handoff-Ready

This file is first loaded in **Phase 5.1** (to self-run the Finalization Checklist as the pre-Oracle pre-gate) and again in **Phase 6: Write PRD**. Do not load it before Phase 5.1 — it pollutes context.

## Scoping Preface — READ FIRST

Match the document's weight to the problem's ambiguity. There are three scope tiers, established in Phase 0.

| Tier | When | Signals |
|---|---|---|
| **Lightweight** | Scoped enhancement, small surface area | One subsystem touched · Clear user problem · Few unknowns |
| **Standard** | Normal feature work | 2-4 requirements · Some ambiguity · Decision needed on approach |
| **Deep-feature** | Substantial feature crossing surfaces | 5+ requirements · Architectural choice · Non-obvious risks |
| **Deep-product** | Establishes new product shape / identity | New user category · Strategic bet · Carrying cost is durable |

## Section Matrix — What to Include by Tier

`✓` = required · `triggered` = include only when activated by a signal · `—` = skip

| Section | Lightweight | Standard | Deep-feature | Deep-product |
|---|---|---|---|---|
| Problem Frame (with JTBD) | ✓ | ✓ | ✓ | ✓ |
| Demand Evidence | ✓ | ✓ | ✓ | ✓ |
| Research & Decision Coverage Matrix | triggered | ✓ | ✓ | ✓ |
| Status Quo | — | ✓ | ✓ | ✓ |
| Target Users & Narrowest Wedge | ✓ | ✓ | ✓ | ✓ |
| Actors (A#) | triggered | triggered | ✓ | ✓ |
| Requirements (R# with Situation/Switching/AI) | ✓ | ✓ | ✓ | ✓ |
| Key Flows (F#) | triggered | triggered | ✓ | ✓ |
| Acceptance Examples (AE#) | triggered | triggered | ✓ | ✓ |
| Premises | triggered | ✓ | ✓ | ✓ |
| AI Native Assessment | — | triggered | triggered | triggered |
| Socratic Interrogation Summary | — | ✓ | ✓ | ✓ |
| Agent Boundary Declaration | — | — | triggered | triggered |
| Approaches Considered | — | ✓ (≥2) | ✓ (≥2) | ✓ (≥3) |
| Recommended Approach (with Rejected + Weakest) | — | ✓ | ✓ | ✓ |
| Success Criteria (with Anti-Metrics + Window) | ✓ | ✓ | ✓ | ✓ |
| Scope Boundaries (with rationale) | single list | single list | single list | **split: Deferred / Outside Identity** |
| Distribution Plan | triggered | triggered | ✓ | ✓ |
| Dependencies & Assumptions | triggered | triggered | ✓ | ✓ |
| Outstanding Questions (split) | ✓ | ✓ | ✓ | ✓ |
| The Assignment | ✓ | ✓ | ✓ | ✓ |
| What I noticed about how you think | triggered | ✓ | ✓ | ✓ |

**Triggered sections fire when:**
- **Actors**: more than one distinct role interacts
- **Research & Decision Coverage Matrix**: required for Standard+ regardless of research source —
  in cold-start (no research) it is built from Phase-4 approach decisions + user answers, with
  research-claim rows added when a `deepresearch`, research report, idea artifact, or prior
  brainstorm decision source exists. For Lightweight it is triggered only when such a source exists
- **Key Flows**: sequence/timing matters for correctness
- **Acceptance Examples**: edge cases or numeric thresholds exist
- **Premises**: a non-obvious assumption underlies the approach
- **AI Native Assessment**: Phase 2.5 landing_judgment is NOT `not_suitable` (i.e., AI is relevant)
- **Agent Boundary Declaration**: Phase 2.5 `agent_involvement.agent_boundary_needed` is `true`
- **Distribution Plan**: users must find/adopt this (anything user-facing)
- **Dependencies**: external systems, libraries, or teams are required
- **What I noticed**: user revealed a repeatable thinking pattern worth reflecting

## Stable ID Rules — NON-NEGOTIABLE

- `R1`, `R2`, ... — Requirements
- `A1`, `A2`, ... — Actors
- `F1`, `F2`, ... — Flows
- `AE1`, `AE2`, ... — Acceptance Examples

**IDs are permanent.** When an item is deleted, split, merged, or reordered, the original IDs DO
NOT renumber. Gaps are correct. Downstream skills reference these IDs; renumbering breaks
traceability.

When splitting `R3` into two requirements, the result is `R3a` and `R3b` (or `R3` becomes a parent
and new leaf gets next unused integer like `R7`). Never recycle a deleted ID.

## Outstanding Questions — The Handoff Gate

This section MUST be split into two subsections, even if one is empty:

```markdown
## Outstanding Questions

### Resolve Before Planning
- [Affects R1][User decision] Which tier of support are paid users entitled to?
- [Affects R3][Product scope] Should offline mode be a launch requirement?

### Deferred to Planning
- [Affects R2][Technical] Which caching layer fits the read pattern?
- [Affects R4][Needs research] What does the existing auth middleware expose?
```

**Format:** `- [Affects R#][category] Question text`

**Categories:**
- `User decision` — only the requester can answer; product judgment
- `Product scope` — affects what we build, not how
- `Technical` — implementation detail, safe to defer
- `Needs research` — requires code exploration or external investigation

**Gate rule:** If `Resolve Before Planning` is non-empty, the PRD is **NOT handoff-ready**. Phase 7
must hide the "Proceed to Planning" option.

---

## PRD Document Template

Fill this out verbatim in the language of the user's input. Omit sections per the Section Matrix.
Do not invent content — if a section has no substance, mark it `_(not applicable for this scope)_` and move on.

```markdown
# PRD: {title}

**Generated**: {YYYY-MM-DD HH:MM} by `brainstorm` skill
**Source Research**: `{path to research.md}` (or `cold-start` if none)
**Scope Tier**: {Lightweight | Standard | Deep-feature | Deep-product}
**Status**: DRAFT
**Supersedes**: {prior PRD filename, if this is a revision; else `—`}

---

## Problem Frame

{2-4 sentences. What problem, for whom, why now. Grounded in research.md evidence or user's answers. No solution language yet.}

**Job-to-be-Done (structured)**:
When {situation: specific trigger moment, not abstract role},
the user needs to {specific task: verb + object},
but the current way fails because {specific failure point, not "inconvenient"},
and the cost of failure is {concrete impact on user}.
This means: what the user truly needs is not {surface need}, but {deeper job, one sentence}.

## Demand Evidence

{From Forcing Question Q1. What proves someone actually wants this — not "is interested," not "signed a waitlist," but would be upset if it disappeared? Cite research.md sections by heading where possible.}

- **Strongest signal**: {...}
- **Weakest signal (for honesty)**: {...}
- **What we don't yet know**: {...}

## Research & Decision Coverage Matrix

Every high-confidence research claim and every important brainstorm decision must have a visible
destination in this PRD. This section prevents downstream `/ux-research`, `/ux-brainstorm`,
`/design-brief`, `/html-prototype`, `tech-spec`, or `task-plan` from losing product intent.

| Claim ID | Source | Claim / Decision | Confidence | Disposition | PRD Destination | Rationale |
|---|---|---|---|---|---|---|
| C1 | `{research.md} → {section}` | {one-sentence claim} | {explicit / strongly_implied / consensus / high / user_confirmed} | {REQUIREMENT / ACCEPTANCE / PREMISE / SCOPE_BOUNDARY / REJECTED_DIRECTION / OUTSTANDING_BLOCKER / DEFERRED / REMOVED} | {R#, AE#, Premises #, Scope Boundaries, Rejected Directions, Outstanding Questions, etc.} | {why this mapping is correct} |
| C2 | `Phase 4 → Recommended Approach` | {selected or rejected approach decision} | user_confirmed | {REQUIREMENT / SCOPE_BOUNDARY / REJECTED_DIRECTION / DEFERRED} | {section or stable ID} | {why this belongs there} |

**Coverage rule:** `Disposition` cannot be blank. `PRD Destination` cannot be blank unless
`Disposition=REMOVED` and `Rationale` explains why it was removed. Do not use "implicit",
"covered generally", "handled downstream", or "TBD" as a destination.

## Status Quo

{From Q2. What are users doing RIGHT NOW to solve this — even badly? What does the workaround cost them?}

## Target Users & Narrowest Wedge

{From Q3 + Q4. Name the actual human. Title, what gets them promoted, what keeps them up at night. Then: the smallest possible version of this that someone would pay real money for this week.}

- **Primary user**: {role, context}
- **Narrowest wedge**: {smallest buyable slice}
- **Out of scope for wedge**: {what we explicitly do NOT target first}

## Actors

- **A1**: {role} — {their goal in this system}
- **A2**: {role} — {their goal in this system}

## Requirements

- **R1** — {single-sentence behavior statement in active voice}
  - **Situation**: {user's specific context when this requirement is triggered — time, place, what they're doing}
  - **Switching reason**: {why the current way fails — specific failure, not "inconvenient"}
  - **AI intervention**: {where AI intervenes in this requirement and how; write `N/A` if no AI}
  - **Rationale**: {why this requirement exists; tie to Problem Frame}
  - **Type**: {functional | non-functional | constraint}
  - **Confidence**: {explicitly_confirmed | strongly_implied | inferred}
  - **Source**: {interrogation Q# reference or research.md section}
- **R2** — ...

## Key Flows

- **F1: {flow name}** — {1-2 sentence description}
  1. {step}
  2. {step}
  3. {step}

## Acceptance Examples

- **AE1** (covers R1, R3): Given {setup}, when {action}, then {observable outcome}.
- **AE2** (covers R2): ...

## Premises

Numbered assumptions the user has explicitly agreed to (Phase 3 output). If unagreed, they belong in Outstanding Questions, not here.

1. {premise}
2. {premise}

## AI Native Assessment

_(From Phase 2.5. Include for Standard+ when AI intervention is relevant. Skip for Lightweight or when Phase 2.5 landing_judgment is `not_suitable`.)_

- **Current decision path**: {N} judgments + {E} executions
- **AI-compressed path**: {N'} judgments + {E'} executions
- **Compression**: {N-N'} decisions eliminated → {viable | not viable (delta < 2)}
- **Landing judgment**: {fully_native | partially_native | ai_assisted | not_suitable}
- **Rationale**: {one sentence — why this level, not higher or lower}
- **Agent involvement**: {yes — agent actions present | no}

→ Design signal: {what this means for the design team — e.g., "AI entry point must be in-context, not sidebar" or "trust layer required: user needs to verify AI output in < 3 seconds"}

## Socratic Interrogation Summary

_(From Phase 3. Include for Standard+.)_

**Dimensions challenged**: {which of the 6 YC forcing questions were asked}
**Total questions asked**: {N} (including follow-ups)

**Key findings**:
1. {Finding 1}: Before interrogation → {assumption} · After → {confirmed / revised to: {new understanding}}
2. {Finding 2}: ...

**Stance changes**:
- User changed position on: {list, or "none"}
- User held firm on: {list}
- User acknowledged uncertainty on: {list, or "none"}

**Impact on PRD**: {how interrogation findings shaped the Recommended Approach / Requirements / Scope — or "no change to initial direction, interrogation confirmed assumptions"}

## Agent Boundary Declaration

_(Conditional: include ONLY when Phase 2.5 `agent_involvement.agent_boundary_needed` is `true`. Skip entirely otherwise.)_

1. **Authorization boundary**:
   - Agent can do autonomously (no per-action confirmation): {list}
   - Agent must confirm each time before acting: {list}
   - Agent must NEVER do (even if user authorizes): {list}

2. **Trigger mechanism**:
   - How agent starts: {user-initiated | condition-triggered | scheduled}
   - How user cancels a running agent: {mechanism}

3. **Reversibility**:
   - All agent actions undoable: {yes | no — list non-reversible actions}
   - External communications (email/message) default to draft mode: {yes | no}

4. **Failure handling**:
   - User notification on failure: {push / in-app / both}
   - Completed steps on failure: {retained | rolled back}

## Approaches Considered

### Approach A: {name} — {minimal | ideal | lateral}
- **Description**: {2-3 sentences}
- **Pros**: {...}
- **Cons**: {...}
- **Risks**: {...}
- **When best**: {conditions under which this is the right call}

### Approach B: {name} — {minimal | ideal | lateral}
{same structure}

### Approach C: {name} — {lateral — non-obvious angle: inversion / constraint-removal / cross-domain analogy}
{same structure}

## Recommended Approach

**Selection**: Approach {A | B | C}
**Label**: {Reuse | Extend | Build new}
**Reasoning**: {why this one wins given the premises, demand evidence, and scope tier}
**What would flip the recommendation**: {concrete condition}

### Rejected Directions (→ design signal: these are explicitly NOT pursued)
- **Direction X**: {description} → Rejected because: {specific reason, not "not suitable"}
- **Direction Y**: {description} → Rejected because: {specific reason}
_(At least 1 rejected direction required for Standard+. If AI Native, at least 1 rejection must be on AI-level grounds — e.g., "AI path doesn't compress decisions by ≥ 2")_

### Weakest Assumption
The single assumption that, if wrong, invalidates the recommended approach:
{one sentence}
→ Suggested validation point: {when and how to test}

## Success Criteria

Outcome-level, measurable, time-bounded where possible. Cover BOTH human outcome AND downstream-agent handoff quality.

- {criterion — e.g., "90% of target users complete wedge flow in under 2 minutes within first session"}
- {criterion}
- **Handoff quality**: `/ux-research`, `/ux-brainstorm`, `/design-brief`, or `/html-prototype` can consume this PRD without requiring net-new product decisions.

### Anti-Metrics (if any of these happen, the direction is wrong)
- {anti-metric 1}: indicates {what problem — e.g., "users bypass the feature and revert to old workflow"}
- {anti-metric 2}: indicates {what problem}
_(Anti-metrics are not failure modes — they are signals that the product direction itself was wrong, not just the execution.)_

### Verification Window
{How long before we know if this direction is correct? What evidence will we look at? Why this timeframe?}

## Scope Boundaries

### In scope (this increment)
- {explicit inclusion} — **Priority rationale**: {why this is in scope — ties to which P0 requirement}

### Out of scope (deferred)
- {item} — {why deferred, not rejected} — **Cost of including now**: {what would break or delay if we did include it}

### _(Deep-product only)_ Outside Product Identity
- {item} — {why this never belongs, even later}

## Distribution Plan

How does a user discover, receive, and adopt this? Code without distribution is code nobody uses.

- **Discovery**: {how users learn this exists}
- **Onboarding**: {first-run experience, if any}
- **Adoption signal**: {what "picked up" looks like}

## Dependencies & Assumptions

- **Depends on**: {system / team / external API / library}
- **Assumes**: {environmental condition that must hold}

## Outstanding Questions

### Resolve Before Planning
- [Affects R#][category] {question}

### Deferred to Planning
- [Affects R#][category] {question}

## The Assignment

**One concrete, real-world next action** — not "go implement this." Something the user does in the next 24-72 hours that validates or refines the PRD itself.

Examples of good assignments:
- "Show this PRD to three target users and record which requirements they push back on."
- "Run `/design-brief` on this PRD and see which Outstanding Questions surface as blockers."
- "Sketch the wedge UI by hand, send to {specific person}, ask what's missing."

## What I Noticed About How You Think

2-4 quoted callbacks to things the user said during the interrogation. Use their actual words in quotes. This is not flattery — it's pattern reflection that helps the user see their own reasoning shape.

- "{direct quote}" — this suggests you {pattern observed}.
- "{direct quote}" — worth noticing: {pattern observed}.
```

---

## Finalization Checklist — RUN BEFORE WRITING THE FILE

Self-audit the draft against these 18 questions. If ANY answer is "no" or "unclear," fix before writing to disk.

1. Does every requirement trace to either research.md or an explicit user answer?
2. When a research source exists, does every high-confidence / consensus research claim have a
   Research & Decision Coverage Matrix row?
3. Does every selected or rejected Phase 4 approach decision have a coverage row?
4. Does every coverage row have a concrete disposition and PRD destination, or a justified
   `REMOVED` disposition?
5. Are requirement IDs stable — no renumbering after edits?
6. Is every premise one the user explicitly agreed to (not the skill's invention)?
7. Are there at least 2 approaches (3 for Deep-product), with at least one non-obvious angle?
8. Is the recommendation stated AFTER the options, not woven into them?
9. Does Outstanding Questions split blocking vs deferred correctly?
10. If `Resolve Before Planning` is non-empty, is the handoff gate respected in Phase 7?
11. Do Success Criteria include both user outcome AND downstream-agent handoff quality?
12. Is the Distribution Plan concrete (not "TBD" or "marketing handles it")?
13. Is "The Assignment" a real-world action, not a skill invocation?
14. Is the language matching the user's input language?
15. **The key question**: If `/ux-research`, `/ux-brainstorm`, `/design-brief`, or
    `/html-prototype` ran on this PRD right now, what product decision would it still have to
    invent? — If anything, the PRD is not done.
16. If Phase 2.5 judged `fully_native` or `partially_native`, is the AI Native Assessment section
    filled AND does `prd-ai-spec.md` exist?
17. If Phase 2.5 flagged `agent_boundary_needed`, is the Agent Boundary Declaration section present
    with all 4 items (authorization / trigger / reversibility / failure)?
18. If the coverage matrix contains `OUTSTANDING_BLOCKER`, is the same issue present under
    `Outstanding Questions → Resolve Before Planning`?

If #15 surfaces gaps, loop back to Phase 3 and ask the user; do not paper over with guesses.
