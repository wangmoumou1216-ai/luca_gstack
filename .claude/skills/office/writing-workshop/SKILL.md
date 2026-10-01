---
name: writing-workshop
description: >
  Explicit writing workshop with three modes: fragments explores the author's observations;
  shape builds an article one agreed block at a time; beats follows reachable concepts one
  user-selected beat at a time. Preserves the real files and the author's edits. Invoke only
  when the user chooses this workshop and a mode, not for ordinary editing or UX microcopy.
license: MIT
disable-model-invocation: true
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

# Writing Workshop

The defining constraint is **the author chooses the writing journey, and the disk is its
truth**. This is an explicit workshop, not a general writing router. Claude invokes
`/writing-workshop`; Codex invokes `$writing-workshop` or its skill selector. Both consume
this same body. Invocation permits neither publication nor another path or external effect.

## Preamble (run first, after scope binding)

Read `.claude/skills/office/SKILL.md` and
`.claude/skill-os/runtime/project-session.md` through EOF before the preamble. For a
project-bound call, freeze the verified pin's `binding.realpath` as absolute `_PROJECT_ROOT`;
in NO_PIN leave it unset. Cwd and shared aliases never establish a project or file authority.

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_SESSION_ID="$$-$(date +%s)"
echo "BRANCH: $_BRANCH"
echo "SESSION: $_SESSION_ID"
_TOPIC=$(if [ -n "${_PROJECT_ROOT:-}" ]; then cat "$_PROJECT_ROOT/.luca/current-topic.txt" 2>/dev/null || echo "none"; else echo "none"; fi)
echo "CURRENT_TOPIC: $_TOPIC"
python3 .claude/observability/scripts/get_rules.py writing-workshop "*" 2>/dev/null || true
```

This preamble observes the bound scope; it does not grant a write. Do not switch projects or
read `docs/`, workflow-state or current-topic display aliases to find writing materials.

## 1. Bind the explicit mode, inputs and exact paths

The three `entry_modes` are independent:

| Mode | Required input | Writing target | Method owner |
|---|---|---|---|
| `fragments` — explore | Topic and real conversation, starting with the initial user message | Exact authorized `output_path` | [fragments.md](./references/fragments.md) |
| `shape` — exploit | Full readable Markdown `material_path` and real reader prerequisites | A separate exact authorized article `output_path` | [shape.md](./references/shape.md) |
| `beats` — exploit | Full readable Markdown `material_path` and real reader prerequisites | A separate exact authorized article `output_path` | [beats.md](./references/beats.md) |

Require an explicit workshop/mode choice. A normal article revision, proofreading request or
product microcopy task stays with its existing owner. Do not infer a mode from such work or
silently switch from explore to exploit. A caller's engineering/product scene is not a new
writing-workshop input requirement.

Before judging inputs, overrides or handoff, read
`.claude/skill-os/runtime/workflow-mode.md` and the complete selected static view
`.claude/skill-os/generated/input-modes/writing-workshop.json`. Use that owner's complete
`input-modes.yaml` fallback only on missing/unreadable/stale view. A missing registry entry
keeps this body's input contract; it is not permission to invent an empty contract or an
automatic Workflow. Workflow is active only when the user chose one.

Use answers already supplied. If mode, topic, material or output is missing, ask one concise
question for the missing input, remember the answer, and **wait for a real response**. Do
not repeatedly ask an answered path. Preserve initial usable fragments in the conversation
while a path is unanswered; no placeholder fragment or article write occurs. Unreadable
material or an unapproved output path returns NEEDS_CONTEXT without writing.

Verify the current task's read/write scope first. Record the actual absolute material and
output targets, access granted, and any caller U-ID/resume target. NO_PIN may use explicitly
authorized framework/OS writing artifacts only; it gains no downstream project access.
`framework/` is read-only. A file name, symlink, installation location or cwd is not a grant.

For `shape` and `beats`, resolve the input's existing canonical path, and the output's
canonical path (or its real existing parent plus intended name if absent). Inspect existing
targets with a following stat and compare `(st_dev, st_ino)`. **Reject either the same
canonical path or the same device/inode**, including soft-link and hard-link aliases.
A dangling link or unresolved parent must be clarified, not silently replaced. Recheck
canonical targets and identities before a write; link retargeting pauses the write.

Read the entire material file through EOF before prerequisites, openings or beats. Keep
its path, identity and SHA as a read-only input. The pile may be fragments, prose or a
transcript; its internal organization does not matter. Never edit, normalize or add notes
to that file. If someone changes it, read the new bytes and identify the change with the
author before rebasing the journey; do not keep mining a stale cached pile.

## 2. Run only the chosen method

Before the first interview or writing proposal, read the selected method owner above
through FILE_END. That file owns its method; the shared file protocol below owns mutations.
Do not load or run another mode as a mandatory phase.

- **fragments** starts with the initial message's usable material and interviews for further
  observations and a load-bearing leading word. The authorized session appends discoveries
  without save dialogs; it does not produce an outline.
- **shape** confirms prerequisites with the real author, offers 2–3 openings for real
  choice/hybrid, and debates each block's role and form. Agree one block, write that block
  immediately, then STOP writing until the next real agreement.
- **beats** confirms prerequisites, offers 2–3 reachable starting/next beats with their
  requires/grounds/unlocks, and waits for one real selection. Write only that beat, then
  STOP. No later beat is authorized by the earlier selection.

Concept grounding is established by what the reader actually knows and what the current
article actually teaches, not by the presence of matching words. An appealing jump calls
for a grounding unit or an explicitly confirmed prerequisite change. Missing support calls
for real material or an agreed cut; no invented examples, facts, quotes or user answers.

## 3. Re-read before each narrow increment

Before **every** write, read the real output file from disk (or verify its absence), recheck
scope/identity and capture its current preimage. Use a narrow append or the exact requested
in-place cut/rewrite/merge. An existing task's CAS/controlled-change boundary still applies.
If bytes change before application, re-read and recompute the proposed increment instead
of replaying an old complete file. Preserve all unrelated bytes and user edits.

An explicit fragments call with an exact authorized output grants its ongoing capture
appends. A user's choice of one shape block/beat grants only that single increment within
the already authorized path. Neither expands file scope. Existing content is not disposable:
if a fragments file's format conflicts with this method, name the conflict and obtain a
specific correction instruction rather than normalizing the file automatically.

After a substantive edit, deletion or rollback, reconstruct introduced concepts from the
current article and recompute `grounded = confirmed prerequisites + currently established
concepts`. Do not preserve deleted grounding in session memory. If a rewrite breaks a later
dependency, explain it and ask which next unit to repair; do not silently rewrite the rest.
The material stays read-only; the article alone holds the chosen writing journey.

Do not write a whole article ahead, add unrequested frontmatter or platform formatting,
publish, send messages, or create a second article-state file. New paths and external effects
remain separate authorized actions. Human choice always requires a real user response;
plain-text questions are the fallback when a structured widget is unavailable.

## 4. Stop, finish or resume truthfully

Shape ends when the author decides it is done. Beats reaches a natural end when the journey
has answered the article's question; confirm that with the author, leaving unused pile
material unused. Fragments ends or pauses when the author asks, without forced structuring.
An unanswered selection is NEEDS_CONTEXT, not completion. A requested unit can be delivered
without pretending the complete article is finished.

Read `.claude/skills/office/references/handoff-protocol.md` through EOF for completion or
cross-session resumption. Apply the **actual** mode/context-cost/terminal-delivery conditions;
this skill has `context-cost: heavy`, and a short paragraph alone does not waive handoff.
The shared lightweight/runtime-estimate exemption applies only when all its conditions
are actually satisfied. Workflow and non-exempt standalone completion require the shared
handoff and its real quality-gate check before DONE, within separately authorized scope.

Use the verified project's absolute
`docs/handoff/YYYY-MM-DD-<topic>-writing-workshop-handoff.md` target only when authorized,
with P2-V same-day sequencing. NO_PIN uses an explicitly approved framework/OS handoff
artifact and never writes a project alias; no project handoff is performed in NO_PIN.
Missing handoff write authority is reported as a concrete gap, not bypassed by declaring
the session lightweight. Never place handoff metadata in the article itself.

Alongside the shared gate_result, 3–7 evidenced criteria, decisions, constraints, risks and
output path, preserve the chosen mode; actual material/output paths, identities and SHA;
reader prerequisites and current grounded set; last actually written/selected unit and
pending decision; and the exact resume target. Omit secrets/PII. This is recovery evidence,
not another article truth or an automatic memory write. Resume by re-reading the current
material and article, respecting user edits and recomputing grounding before continuing.

Report DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED using the shared definitions,
with real disk paths and remaining questions. Record neither an imaginary write nor a
user's imagined answer. This body provides the writing method; Htest proves native
behavior separately for Claude and Codex before any cross-harness parity claim.

Sources: Matt Pocock `skills/in-progress/writing-{fragments,shape,beats}`, MIT,
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`; sources 26/27/25 respectively.
Their method owners retain full method coverage while local scope, input, file identity,
Human Gate and handoff owners retain execution authority.

<!-- FILE_END: writing-workshop/SKILL.md -->
