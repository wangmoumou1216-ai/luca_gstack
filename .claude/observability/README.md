# Skill Observability

This folder records skill feedback without loading long history into every run.

- `observations.jsonl`: raw user feedback. Cold storage; do not read during normal skill startup.
- `rules.yaml`: active short rules distilled from feedback. Only load through `scripts/get_rules.py`.
- `run-log.jsonl`: one line per skill run. Cold storage; use for evals/retro only.
- `scripts/`: deterministic readers/writers.

Runtime rule:

```bash
python3 .claude/observability/scripts/get_rules.py <skill-name> [scene]
```

Only the command output should be loaded into context.

Hermes relationship:

- Observability records what happened and what the user corrected.
- Hermes proposes controlled growth candidates from repeated observations, evals, redteam, or retro.
- Observability active rules may be used immediately when explicit and reusable.
- Hermes candidates must be reviewed before promotion and must not directly write long-term context.
