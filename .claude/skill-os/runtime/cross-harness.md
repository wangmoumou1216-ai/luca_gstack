# Cross-harness collaboration contract

Load this file when an artifact, skill, hook, or workflow must work in both Claude Code and Codex.

The repository truth is shared through tracked files, not hidden conversation history. Claude owns its native slash-command surface; Codex invokes the same project skills through `$<skill-name>` or the skill selector. A slash command and a Codex skill invocation are different loaders for shared authority, not separate skill bodies.

For each changed capability, state and verify separately:

1. how Claude discovers and invokes it;
2. how Codex discovers and invokes it;
3. which runtime-only primitive is unavailable on the other harness;
4. the explicit degradation or refusal path;
5. the behavioural or live probe that demonstrates the claim.

Do not hard-code account-sensitive model names for Codex tiers; use the canonical reasoning-effort mapping. Do not claim parity when one harness only has a prose promise and the other has an enforced tool boundary. When one harness changes an artifact consumed by the other, report its exact path.

<!-- FILE_END: skill-os/runtime/cross-harness.md -->
