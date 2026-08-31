# Provenance — diagnosing-bugs

This LucaGStack skill adapts two MIT/personal sources frozen by
`framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv`.

## Upstream

Repository: `mattpocock/skills`  
Commit: `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`  
License: MIT, copyright Matt Pocock

Frozen inputs:

| Relative source | SHA-256 |
|---|---|
| `skills/engineering/diagnosing-bugs/SKILL.md` | `77f3cf31bc99b2f49af943222526531fcc9fc41d047626d3640e875e85af3e84` |
| `skills/engineering/diagnosing-bugs/agents/openai.yaml` | `3e430dbe4334a87597488c060cb3dc3786bb00c9182877d6f5ec41f62490e90b` |
| `skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh` | `35103539fc36873eea36074769ad454f9379d6fc8b2dc0e26ce987fd3bfe5503` |

Preserved method value: build a tight symptom-specific feedback loop, minimise the reproduction, rank
falsifiable hypotheses, tag instrumentation, and be honest when no correct regression-test seam exists.

## Legacy Luca source

Root: `/Users/luca/.agents/skills/systematic-debugging`  
License column in the frozen manifest: `personal`

The adapted references preserve the frozen legacy techniques for root-cause tracing, defense in depth, and
condition-based waiting. The canonical `SKILL.md` also retains the legacy discipline of tracing the source
instead of patching a symptom.

## Luca safety rewrite

The canonical method intentionally differs from upstream and legacy defaults:

- an expected TDD red is an explicit negative trigger;
- diagnosis is read-only/no-network by default and ends before implementation;
- write-producing reproductions must use task-owned scratch or separate authority;
- Git publication effects are never part of diagnosis;
- internal dispatch returns to the original U-ID with inherited authority only.

The repository-local `LICENSE` contains the upstream MIT text. Legacy personal material remains attributed
here and in the frozen source manifest.
