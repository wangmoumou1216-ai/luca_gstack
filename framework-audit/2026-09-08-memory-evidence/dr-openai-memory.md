# Angle 2 — OpenAI/Codex official memory, 2026-09-08

Local baseline: codex-cli 0.153.4. Narrow config-key inspection found no explicit native-memory configuration. Feature enablement is UNKNOWN, not inferred from absent keys.
Source pin: openai/codex main 4b0d9669cc46ba97bf85fa6312431b630d80498d (2026-09-08T02:29:17Z). Moving main was read and its pin retrieved in the same research session, not equated to installed version.

O1 FACT HIGH: Product docs separate local Codex memory from web ChatGPT memory; mandatory rules belong in checked-in instructions. https://learn.chatgpt.com/docs/customization/memories?surface=app
O2 FACT HIGH: Source describes bounded per-rollout extraction followed by globally serialized consolidation. Eligibility excludes ephemeral/subagent sessions, and failed jobs use retry backoff. https://raw.githubusercontent.com/openai/codex/main/codex-rs/memories/README.md
O3 FACT HIGH: The same source distinguishes successful output, successful no-output and failure. A hook event or no new notes alone cannot prove extraction success/failure. Same source as O2, not independent corroboration.
O4 FACT HIGH policy, enforcement UNKNOWN: Consolidation template supports progressive disclosure and meaningful no-op. https://raw.githubusercontent.com/openai/codex/main/codex-rs/memories/write/templates/memories/consolidation.md
O5 FACT HIGH: Raw rollout evidence is immutable by template policy; memory generation and consumption have distinct ownership. Same source family as O2/O4; no reliability benchmark claim.
O6 INFERENCE: Borrow source-backed receipts and stage-specific health, retain hard rules in versioned files. Native memory availability does not justify enabling another writer without ownership checks.

## Actual search log

Round 1: “site.developers.openai.com codex memories memory agent”; “site.openai.com harness engineering context memory agents”.
Round 2 full reads: official product page above via developers.openai.com redirect; GitHub and raw memory README; raw consolidation template; https://openai.com/index/harness-engineering/.
Round 3: “site.github.com/openai/codex memories generate_memories use_memories extraction_model consolidation_model”; local CLI version and config-key check; GitHub commits/main API pin. Model override search leads were not promoted into findings without source-body verification.
Depth: >=3 full pages, >=5 findings. Gaps: native writer has not been live-probed on installed CLI; no claim of automatic Claude/Codex shared native memory. Official design does not independently prove effectiveness.
