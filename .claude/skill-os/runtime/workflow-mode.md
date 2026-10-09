# Workflow / standalone input-mode contract

This owner defines how an agent consumes the selected skill's input contract without loading the
whole registry on every invocation. The sole hand-maintained truth remains
`.claude/skill-os/input-modes.yaml`; files below `generated/input-modes/` are deterministic views,
not new authority or executable selectors.

## Trigger and deadline

Load this file through EOF when the user selects or continues a Workflow, or directly invokes a
standalone skill and its input/quality contract must be applied. Consume the selected view before
applying Workflow handoff gates, standalone overrides, or deciding that required input is present.
Route discovery alone does not trigger selected input-view reads. If discovery reaches an R1/R2/R3
recommendation graph read, consume this owner's graph boundary before that read.

Workflow selection, ambiguous references and gate-reply continuity have one semantic owner:
`.claude/skill-os/routing-chain-check.md` R3. Read it through EOF before asking for missing input or
accepting a fresh skill candidate in those cases. A clear existing selection needs no second
confirmation; input format and a short reply do not replace the full task or select an output tool.
Apply the selected skill's actual entry/input contract; mature input does not require unselected
upstream stages. This does not create persistent workflow state or widen project authority.
Project identity checks do not imply a project picker. Respect the host interaction boundary in
R3: this user's Codex app project-selection hook is disabled; Luca app owns the enabled picker.
Do not restore the disabled hook or infer project authority from its absence.

## Healthy static-view path

1. Resolve exactly one already-selected catalog skill key. Do not glob the generated directory or
   use filenames to discover a skill.
2. Read `.claude/skill-os/generated/input-modes/<key>.json` completely.
3. Accept it only when all six top-level fields are present and no others exist:
   `schema_version`, `source_sha256`, `skill`, `group`, `global`, `contract`.
4. Require `schema_version == 1`, `skill == <key>`, `group` to be `skills` or
   `governance_tools`, `global` to contain the original registry `version` and `principle`, and
   `contract` to contain the selected entry's complete nested value. `source_sha256` must match
   the current source bytes through a trusted generated-state check; an agent assertion is not
   proof of freshness.
5. Treat a complete, healthy view as the selected entry's full input-mode contract. Reading one
   view is not evidence that the full YAML registry was read.

The view can constrain inputs and quality gates only. It does not grant file, network, Git,
publication, project-switch, external-effect, or workflow-state authority.

## Missing key and fallback

If the hand-maintained registry has no entry for the selected skill, retain the skill's own
contract and shared rules and report that there is no specific input-mode override. Never fabricate
an empty generated contract and call it success. If the selected key or its source is ambiguous,
stop and resolve the source rather than guessing a nearby filename.

If the selected view is missing, unreadable, or proven stale by trusted generated-state evidence,
preserve that original failure and read `.claude/skill-os/input-modes.yaml` completely through EOF.
Use only the selected entry plus the registry-wide `version` and `principle`; absence of the selected
entry keeps the no-specific-override meaning above. A truncated view, partial YAML read, fabricated
error message, or script output that merely claims freshness does not qualify as recovery.

## Graph boundary

This contract does not activate `.claude/skill-os/optional-workflow-graph.yaml`. Before user selection,
the R1/R2/R3 recommendation branches in `.claude/skill-os/routing-chain-check.md` permit only scoped
read-only graph consultation; consume that owner completely before recommending research, choosing
a design-output tool, or recommending a workflow. Graph consultation does not select or activate a
Workflow, write workflow-state, or grant effects. Unrelated standalone invocation adds no graph read.

Workflow execution graph reads begin only after the user has selected a Workflow under R3,
including a clear natural-language selection or continuation. A recommendation or unresolved
reference is not selection. Standalone invocation remains standalone, and a Workflow gate cannot block
it unless the same gate is independently a quality or safety gate.

<!-- FILE_END: skill-os/runtime/workflow-mode.md -->
