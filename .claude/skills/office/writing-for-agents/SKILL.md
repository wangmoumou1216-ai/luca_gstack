---
name: writing-for-agents
description: Writing and reviewing agent-facing instructions. Use when creating or editing skills, AGENTS.md, or CLAUDE.md; invoke explicitly for specs, tickets, runtime prompts, and other documents an agent consumes.
license: MIT
metadata:
  recommended-model: guided-execution
---

# Writing for Agents

Write any document an agent consumes so repeated runs follow a predictable process, even when their
outputs differ.

Source: `mattpocock/skills`, `skills/productivity/writing-for-agents` (MIT), adapted at upstream path
commit `321658273cb1d20b76026717d027d505790106d4`. The Luca edition is a thin callable entry over the
craft already adopted in `.claude/skill-os/skill-authoring.md`: that file remains the single source of
truth for predictability, the two loads, information hierarchy, leading words, failure modes, and
pruning. Read it through `FILE_END` before working; apply sections 0–5 to every agent-facing document
and section 6 only when the target is a lucagstack skill.

## 1. Bind the document and its owner

Identify the exact document, consuming agent, behaviour it must change, and observed failure or
requested outcome. Read the target through its final line plus every governing instruction file.

This skill owns Agent-facing structure and wording, not domain truth or workflow:

- For a skill, invoke `skill-creator` for creation, packaging, and evaluation; then read
  `SKILL-MECHANICS.md` and `.claude/skill-os/skill-invariants.md` through their final lines.
- The task's domain skill owns requirements, technical facts, product copy, and output location.
  `ux-writing`, for example, still owns user-facing interface language.
- A review request stays read-only. An edit changes only the requested target and directly required
  registration surfaces.

Completion criterion: target, consumer, desired behaviour, and truth owner are explicit; no domain
claim or execution authority has been invented or reassigned.

## 2. Audit context pointers

A context pointer names out-of-context material and encodes the branches that should load it. A skill
description and an `AGENTS.md` line naming another file are the same kind of object.

- Front-load the leading word that should trigger the pointer.
- Name one real trigger per branch; collapse synonyms that only rename one branch.
- State what the target contains and when it must be read.
- Sharpen a weak pointer before inlining its target.

Completion criterion: every required branch has one reachable pointer, and each always-loaded word
earns its context-load cost.

## 3. Sharpen completion criteria

End every step with a done-condition the agent can distinguish from partial progress. Test both
**clarity** (observable or executable) and **demand** (covers every relevant item, not a sample).

Sharpen a fuzzy bound first. Only when a step is irreducibly fuzzy and repeatedly rushed should later
steps move behind a real handoff or delegated fresh-context boundary; an inline heading does not clear
post-completion pressure.

Completion criterion: every instruction that can terminate has a checkable, exhaustive bound.

## 4. Prune and verify

Apply `skill-authoring.md`'s information hierarchy, co-location, leading-word, and failure-mode passes.
Treat scripts, config, schemas, and directory layout as the truth; prose that merely copies an easy
lookup is a cache that must justify its drift risk. Delete no-ops instead of polishing them.

Run the narrowest relevant lint, read-back, routing test, or behavioural comparison. This skill
creates no independent workflow state or handoff artifact and grants no new Git, network,
publication, or external-effect authority.

Completion criterion: the requested behaviour is covered, every applicable local invariant passes,
and the final report cites fresh verification evidence.

<!-- FILE_END: writing-for-agents/SKILL.md -->
