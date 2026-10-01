# Skill mechanics — local harness adaptation

Universal hierarchy, pointers, loads, leading words, completion and pruning live in SKILL.md.
Before choosing a skill package's reach, read `.claude/skill-os/skill-authoring.md` and
`.claude/skill-os/skill-invariants.md` through EOF. They own structure, registration and protected
fields; this method cannot edit name/allowed-tools/context-cost/preamble-tier, protected paths,
preamble, phase order, workflow writes or FILE_END just to fit upstream packaging.

## Invocation and the two loads

Model-reachable reference needs a model-facing description listing distinct trigger branches,
with its leading word up front. This pays context load so agents or other skills can find it;
direct user invocation remains available. Explicit-only behavior pays human cognitive load and
keeps its description a concise human summary. Choose the reach the local policy actually grants.

Upstream `disable-model-invocation` is not proof of every harness's behavior. Claude uses registered
native commands/loader policy; Codex uses the canonical skill/selector, narrow semantic routing and
agents/openai.yaml `allow_implicit_invocation`. A true value never grants effects; a false value
requires the explicit user choice. The local router and tests must preserve both intended reach and
non-reach. Do not claim descriptions disappear from Codex context or that one field enforces parity.

## Splitting and shared reference

Split by invocation only when a distinct leading word deserves independent reach or another skill
needs that method. The extra permanent pointer must justify its context load. Otherwise disclose a
branch from its current owner. Two explicit-only callers can share a plain reference file with a
condition/deadline pointer; do not create a duplicate method or pretend an explicit-only skill was
automatically invoked. A reference read is different from running a skill session.

A router such as office can name explicit-only choices when human cognitive load grows; it remains
an index. Its recommendation cannot fire a protected child or stand in for a human choice.

## Registration and completion

Follow skill-authoring's existing registration and consumer checklist: one canonical body, thin
aliases, input contract, model role/viability, narrow routing, applicable visible command and actual
reach/non-reach probes. Workflow graph remains optional and receives edges only for real owned
transitions. Use common native roles and actual runtime evidence, never account model names or
Claude flags copied into Codex.

Completion criterion: every applicable local protection preserved; reach agrees across frontmatter,
OpenAI metadata, route, aliases/commands and tested consumption; references are readable, the method
has one owner and unverified harness behavior remains UNKNOWN. Source38 SKILL-MECHANICS is adapted
to local loaders rather than installed or invoked by this writing task.

<!-- FILE_END: writing-for-agents/SKILL-MECHANICS.md -->
