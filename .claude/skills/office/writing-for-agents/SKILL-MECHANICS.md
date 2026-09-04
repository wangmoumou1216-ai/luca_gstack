# Skill mechanics

Read this branch only when the target document is a skill. Universal writing rules remain in
`SKILL.md`; lucagstack's skill prose truth remains `.claude/skill-os/skill-authoring.md`, and protected
constraints remain `.claude/skill-os/skill-invariants.md`.

## Invocation choice

Choose one invocation contract before writing the description.

- **Model-invoked**: use when the agent must discover the skill on its own or another skill must reach
  it. Keep a model-facing description with the distinct trigger branches, omit
  `disable-model-invocation`, register narrow deterministic triggers in
  `.claude/skill-os/skill-routing-map.yaml`, and set Codex `allow_implicit_invocation: true`.
- **User-invoked**: use when the skill only runs by name. Set `disable-model-invocation: true`, make the
  description a human-facing one-line summary, keep routing to explicit forms, and set Codex
  `allow_implicit_invocation: false`.

Model invocation includes direct user invocation; it never removes `$skill-name` or the Claude command
entry. User-only invocation pays cognitive load instead of permanent context load.

## Splitting by invocation

Split a model-invoked skill only when it has a distinct leading word that should trigger independently,
or when another skill must reach it. Otherwise keep the branch behind a pointer in its existing owner.

When several user-invoked skills exceed what a human can remember, use a router entry such as
`office` to describe the choices. The router is an index, not authority to execute a user-only child.

## Luca registration

After the prose is valid, follow `skill-authoring.md`'s registration and consumption checklist. A
first-class lucagstack skill needs one canonical `office/<name>/SKILL.md`, thin Claude and Codex aliases,
an input mode, model and Codex viability tiers, a command when visible, routing coverage, and verification
that proves both intended reach and non-reach. Add no workflow-graph edge unless the skill owns a real
workflow transition.

Completion criterion: invocation policy agrees across frontmatter, OpenAI metadata, routing, command,
and tests; the canonical body has one owner and both harnesses point to it.

<!-- FILE_END: writing-for-agents/SKILL-MECHANICS.md -->
