# Luca Agent Skill OS

`luca_gstack` is a Skill OS, not a mandatory workflow engine.

Core principle:

```text
Skill-first
Graph-optional
Memory-light
Growth-gated
Governance-callable
```

## Layers

```text
Claude/Codex Runtime
  ↓
luca_gstack Skill OS
  - standalone skills
  - input/output contracts
  - skill-level quality gates
  - artifact-based collaboration
  ↓
Optional Workflow Graph
  - recommended paths
  - handoff validation
  - state recovery
  - downstream suggestions
  ↓
Observability / Hermes / Evals / Redteam / Retro
```

## Non-Negotiables

- A visible skill must remain callable on its own unless its own `SKILL.md` explicitly says it is only a downstream utility.
- Workflow gates must not block standalone use unless the gate is also a quality or safety gate.
- Artifacts in `docs/**` are the collaboration surface between skills.
- Long logs are cold storage. Normal skill runs load only short active rules.
- Hermes growth starts as candidates, not automatic edits to long-term context.

## Modes

Every visible skill should declare whether it supports:

- `standalone`: direct user input, screenshot, topic, URL, Figma reference, or pasted brief.
- `workflow`: upstream artifact handoff from another skill.
- `governance`: review/eval/retro use after or outside a workflow.

Use `input-modes.yaml` as the source of truth for current mode expectations.

