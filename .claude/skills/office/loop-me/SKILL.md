---
name: loop-me
description: "Design recurring workflows from your real world through stateful grilling, then save the resolved spec in your authorized workspace. Invoke explicitly."
license: MIT
disable-model-invocation: true
argument-hint: "A workflow to design, or nothing to discover one"
context-cost: heavy
preamble-tier: 2
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
metadata:
  recommended-model: core-execution
---

# Loop Me

**A loop is a recurring activity; a workflow is the resolved contract for one loop.**
Use the user's world to discover the loop, let the user choose it, and grill its decisions
until an implementer can build it without asking another question. The durable output is
one workflow spec in the authorized workspace, not a generic SOP or an execution service.

Claude invokes `/loop-me`; Codex invokes `$loop-me` or the skill selector. This body is
explicit-only. A request to run an existing routine, schedule a task, or operate an agent
stays with its execution owner. Designing a workflow does not authorize its execution,
install a scheduler or resident process, or restore the retired Muse Loop orchestrator.

## Preamble (run first, after scope binding)

Read `.claude/skills/office/SKILL.md` and
`.claude/skill-os/runtime/project-session.md` through EOF before this preamble. When the
call concerns a project, apply its Project Gate and verified session binding first; freeze
`binding.realpath` as absolute `_PROJECT_ROOT`. Leave it unset in NO_PIN. Neither cwd nor
shared `docs/`, workflow-state or current-topic aliases establish the user's workspace.

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py loop-me "*" 2>/dev/null || true
```

This observes the verified scope and grants no write or external effect.

## 1. Bind the world source and the exact spec

Before input, override or handoff decisions, read
`.claude/skill-os/runtime/workflow-mode.md` and the complete selected view
`.claude/skill-os/generated/input-modes/loop-me.json`. A missing, unreadable or stale view
uses that owner's full `input-modes.yaml` fallback. If the registry has no loop-me entry,
retain this body's contract and report no specific override; do not invent a view or
activate a Workflow. A Workflow starts only from the user's actual selection.

Inputs:

- `goal` is optional. An empty goal means discover a loop from the authorized world context.
- `workspace_context_path` is the exact authorized real `NOTES.md` or supplied context
  artifact about the user's tools, channels, activities and vocabulary. Read it through EOF
  and use real conversation answers too. A missing or thin file means interview first;
  it never licenses invented facts or creating NOTES automatically.
- `workflow_spec_path` is the user-approved exact absolute target corresponding to
  `workflows/<slug>.md` in that workspace. Do not select the slug or a writing path by
  guessing. Missing path or write authority means no spec write.

Use input already answered. Ask one concise blocking question for a missing source/path
or authority and wait; remember the response. With an authorized source, discovery can
continue while an output path is unresolved, but nothing is saved. Never infer the user's
life or job from the framework checkout, its cwd, root `CONTEXT.md` or an installation.

Record the actual source and spec targets, read/write scope, and caller U-ID,
`resume_target` and authority record when present. Project reads/writes obey the verified
binding; explicit absolute paths obey the current filesystem/scope contract. NO_PIN
framework/meta work has no downstream project grant and never accesses shared aliases.
`framework/` remains read-only. A path reference or a previous spec is not a grant.

Resolve existing canonical targets, or the real existing parent plus intended name for
an absent spec. Reject a spec that aliases the context file by canonical path or device/inode.
Do not replace a dangling link or an unresolvable parent. Freeze current identity and
preimage for the next narrow write, not an unlimited directory permission.

Done for this step: the world source is real and readable (or its precise gap is stated),
and every intended mutation has an exact authorized path. An absent goal is valid.

## 2. Discover loops through the user's world

Read [workflow-spec.md](references/workflow-spec.md) through FILE_END before the first
loop proposal or spec draft; it owns loop discovery, workflow coverage and checkpoint briefs.

Apply its life / career / week / repeated-activity lens to the real context. If tools,
channels, activities or terms are thin, interview the user about those gaps before proposing
loops. Use actual answers; do not give a fictional persona or repeat solved questions.
If a goal is named, check it against existing world facts and fill only consequential gaps.

Offer evidence-backed candidates, normally at least two when the facts support them. Each
candidate points to an actual note/answer, its recurrence, intended result and why specifying
it would help. A single grounded candidate is better than an invented second one: interview
further or state the evidence limit. Recommendations remain proposals until the real user
selects a candidate, supplies another, or explicitly changes the goal. Wait for that choice.

Keep the user's terms. A fuzzy term that changes the loop needs real clarification.
Adding a confirmed canonical term to NOTES is a separate narrow mutation: require the exact
NOTES path and write authority plus the user's confirmation of the term and meaning. Without
that authority return a proposed entry; leave NOTES read-only. No global memory extraction,
root context write, glossary creation or new vocabulary owner follows from an interview.

Done for this step: a real user chose a loop whose source facts and purpose are explicit.

## 3. Grill the selected loop as a stateful design tree

Read `.claude/skills/office/grilling/SKILL.md` through FILE_END before the first round.
Use its method within this caller: preserve U-ID, scope, `resume_target`, authority record
and the permission intersection. This is not a new task, workflow node or automatic subagent.
Any actual delegation follows current Plan/model-routing and serial execution contracts.

Seed the tree with the selected loop, existing spec, actual settled answers, evidence and
unresolved decisions. Mark prerequisites settled / unresolved / researching. Check readable
environment facts yourself within scope. Unknown facts stay unsettled; do not make the user
guess a tool's capabilities. A research result cannot be fabricated to unblock a question.

Compute the ready frontier. Ask every independent ready decision in a numbered round with
a recommended answer and its reason. A dependent question waits for its prerequisite's
real answer. Use a structured widget when available, otherwise a complete numbered text
round. Ordinary Human Gates and external approvals retain their own contracts.

Wait after each round. Record only the user's actual answers, keep unanswered items
unresolved, incorporate evidence and recompute the tree. Recommendations, silence, AFK or
simulated answers cannot settle it. Preserve accepted decisions across rounds; ask again
only when new evidence or an actual edit contradicts them, explaining the specific conflict.

The reference defines the semantic coverage needed to resolve a workflow. Grill until that
coverage is concrete, the frontier is empty and no question could change implementation.
Unlike a caller that permits deferred design questions, this workflow cannot be DONE with
one of those questions deferred. Confirm shared understanding with the real user before
calling the design resolved. If blocked, retain the exact unresolved dependency and resume
point. An authorized draft may save resolved portions and clearly marked open questions;
it remains a draft, never a completed workflow.

Done for this step: actual answers and evidence settle every consequential branch and the
user has confirmed the resulting shared understanding.

## 4. Persist the spec while preserving the user's edits

Use the reference's complete workflow contract, conditional vocabulary and readiness check.
Write to the already approved `workflow_spec_path` only. Its current bytes are the workflow
source of truth; handoff is recovery evidence, not a second spec or runtime state database.

Before every create/revise/delete, re-read the actual context and existing spec (or verify
absence), recheck canonical identity, current authority and the preimage/CAS boundary.
Prepare only the requested addition or exact affected section. A create requires absence;
a revision preserves unrelated bytes and user edits; a deletion requires a real explicit
instruction for that exact spec plus delete authority. Default never deletes a spec.
No interview answer or loop selection expands a file grant. Existing valid exact authority
persists across the session and need not be re-requested for the same permitted mutation.

If bytes, identity or scope drift before application, stop that write, read current state
and recompute the narrow change. Do not overwrite from a cached full draft or silently
merge conflicting decisions. Read back applied bytes and verify the selected loop, settled
choices, complete contract and links survived. State partial saves honestly.

Checkpoint design describes preparation and the brief contract; it does not mean assets
were produced. A real brief links an actually prepared authorized asset; an example is
clearly labeled and uses an ungenerated path contract. This skill does not execute workflow
steps to make the example real, send/publish assets, install integration tools or schedule runs.

Done for this step: the authorized spec mutation is present on disk, read back, and preserves
all unrelated content. The resulting spec is draft or resolved according to real decisions.

## 5. Complete or resume from actual artifacts

Before completion or cross-session resumption, read
`.claude/skills/office/references/handoff-protocol.md` through EOF. Apply its actual
mode/context-cost/terminal-delivery conditions; loop-me has `context-cost: heavy`.
Workflow and non-exempt standalone completion require the shared handoff and its real
quality-gate check before DONE. A small spec does not itself waive that obligation.

Use the verified project's authorized absolute
`docs/handoff/YYYY-MM-DD-<topic>-loop-me-handoff.md` path with P2-V same-day sequencing.
NO_PIN uses an explicitly approved framework/OS recovery artifact and never performs a
project handoff through shared aliases. Missing required handoff write authority is a
concrete completion gap. Do not invoke the separate session-transfer `handoff` skill unless
the user asks; it has its own OS temporary output contract.

Alongside shared gate_result, 3–7 evidenced criteria, decisions, constraints, risks and output
path, preserve actual context/spec paths, identities and SHA; the selected loop and source
facts; settled decisions and their real answers; unresolved/researching dependencies; the
last applied mutation; authority and unapproved effects; and the first unfinished action.
Omit secrets/PII and do not add a parallel loop-state file or automatically write memory.

On resume, read the actual NOTES/context, current spec and authorized shared handoff.
Rebuild the tree from those current bytes and real settled decisions. Preserve user edits
and use them over stale cache; clarify only edits that conflict with a prior decision or
break a dependency. Do not replay an earlier create/delete, repeat solved questions or
execute steps described by the spec.

Use the shared DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED statuses. DONE requires
real loop discovery and selection, completed stateful grilling, a complete resolved spec
read back from the authorized path, and any required shared handoff. Any implementation-
changing question or unmet required gate blocks DONE; lack of input/answer is NEEDS_CONTEXT.
Design completion grants no execution authority. Report native verification separately for
Claude and Codex; this text alone does not prove behavioral gain or cross-harness parity.

Source: Matt Pocock `skills/in-progress/loop-me` (MIT), source21,
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`. Local scope, Human Gate,
project isolation, controlled change, model routing and shared handoff owners remain authoritative.

<!-- FILE_END: loop-me/SKILL.md -->
