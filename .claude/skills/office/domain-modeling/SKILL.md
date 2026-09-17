---
name: domain-modeling
description: >
  Build or sharpen a domain model when language overloads distinct concepts, relationships or ownership boundaries are ambiguous, or code contradicts a domain statement. Challenge terms and concrete scenarios, return evidence and unresolved decisions, and persist accepted language only within authorized scope. Not for merely reading a glossary, formatting, variable renames without domain changes, general programming concepts, or unrelated UI/module design.
license: MIT
context-cost: lightweight
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - AskUserQuestion
metadata:
  recommended-model: guided-execution
---

# Domain Modeling — Luca adaptation

Source: `mattpocock/skills`, `skills/engineering/domain-modeling`, MIT, path commit
`321658273cb1d20b76026717d027d505790106d4`. This edition preserves active modeling,
concrete scenarios and code cross-checks, not the upstream root-CONTEXT storage policy.

## 1. Bind scope and caller

Use this skill when **changing** a domain model, not merely consuming its vocabulary.
Manual entry is `/domain-modeling` on Claude or `$domain-modeling`/selector on Codex;
agents may invoke it semantically or internally without those literal words.

Read `.claude/skills/office/SKILL.md` and
`.claude/skill-os/runtime/project-session.md` through EOF. Bind the
verified project or explicit NO_PIN framework artifact; never infer a project from cwd,
`docs/` or display aliases. A request to inspect is not permission to write.

Internal input contains caller, modeling question/condition evidence, scope, original
task/U-ID when applicable, inherited authority and its effect intersection, and any exact
authorized artifact. Do not fabricate an authority record when absent: return analysis only.
The caller keeps its task, coverage gates, handoff and workflow state; return to that owner.

Done-condition: the question, scope, evidence access, artifact authority and resume target
are explicit. Unrelated UI/interface/module tasks remain with their existing owner.

## 2. Challenge and verify

Read existing authorized vocabulary before proposing changes. Call out conflicting or
overloaded terms; distinguish different concepts rather than picking a synonym for both.
Propose precise terms and stress-test their relationships with concrete edge scenarios.
Check authorized code when a claim concerns current behavior; cite exact evidence or mark
it unverified when unavailable. Separate facts, user statements and proposed model changes.
Surface code/domain contradictions without silently replacing either side.

Retrieve facts yourself. For a human domain-rule or naming choice, ask **one decision at
a time and wait for a real response**. Plain-text questions are the Codex fallback when a
structured widget is absent; no widget or no answer never authorizes a default.
Unanswered choices remain proposed/open and return NEEDS_CONTEXT. Only dependent caller
contracts block; independent work may continue. Preserve stable requirement/interface IDs.

Done-condition: every modeled concept/relationship is either supported and accepted, or
has explicit evidence/uncertainty and a question owned by the caller.

## 3. Persist accepted language, only when authorized

Default to analysis/proposals. Write with apply_patch only when the task already authorizes
the exact artifact, the human has accepted the domain choice, and the target is inside the
verified scope. Existing specific authority need not be asked again line by line.

Glossary: read [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) through EOF before an authorized
glossary patch. Prefer an existing explicitly authorized glossary owner. Otherwise the
verified project's default is `docs/domain/glossary.md`, a specification document protected
by skill-invariants P2, not governed memory. Create lazily after an accepted term; update
in place, without dated copies or automatic migration of project CONTEXT. NO_PIN writes
only an explicitly authorized framework artifact, never a downstream glossary or root
CONTEXT. Keep unrelated content and existing scope boundaries intact.

ADR: read `.claude/skill-os/extraction-bar.md` through EOF for the existing offer gate;
do not duplicate its doctrine here. Only an explicit record request and an authorized
exact ADR artifact permit a patch; then read [ADR-FORMAT.md](./ADR-FORMAT.md) through EOF.
No default ADR directory is introduced. Do not directly write decisions.md, person memory,
semantic candidates or promoted facts through this skill.

Done-condition: each patch names its authority, accepted decision and exact path; absent
any prerequisite, writes is empty and the item remains a proposal.

## 4. Return to the owner

Return one structured result (JSON or equivalently labeled fields):

```json
{"status":"DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED","scope":{},"resolved_terms":[],"relationships":[],"code_evidence":[],"open_questions":[],"writes":[],"blocking_for_caller":[],"resume_target":"caller/original task or user"}
```

Use the shared completion definitions. Each term distinguishes accepted/proposed status;
each code item names source or unverified, each question names the affected dependency,
each write names path/authority/accepted choice. No answer means NEEDS_CONTEXT, not success.
Internal callers include the result in their own artifact/handoff and conflict register;
standalone returns the analysis or exact authorized patch. An analysis-only standalone
result is a terminal delivery: use the shared lightweight standalone handoff exemption
in `.claude/skills/office/references/handoff-protocol.md`, read through EOF when applying
that exemption. A resolved terminal result may be DONE without a disk artifact; unanswered
human choices remain NEEDS_CONTEXT. Never create a handoff merely to obtain DONE or without
write authority. Internal delivery remains part of the caller's own artifact/handoff,
not this standalone exemption. This skill owns no workflow
node/state and adds no mandatory Flow phase. Invocation alone grants no Git, network,
project switch or external-effect authority.

Done-condition: unresolved dependencies can pause/resume at the original owner without
losing evidence or introducing a second task/spec truth.

<!-- FILE_END: domain-modeling/SKILL.md -->
