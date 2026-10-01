# Semantic probe result: UNKNOWN

Candidate four-document SHA-256 values match the frozen review scope. Six cases were bundled separately in each baseline/candidate Claude/Codex invocation. No invocation returned a semantic answer.

| Harness | Arm | Seconds | Result |
|---|---|---:|---|
| claude | baseline | 1.1 | OAuth session expired before inference |
| claude | candidate | 0.903 | OAuth session expired before inference |
| codex | baseline | 120.01 | Provider request timeouts; terminated at 120s |
| codex | candidate | 120.011 | Provider request timeouts; terminated at 120s |

All six semantic criteria are **UNKNOWN**. No auth/config changes or follow-up retries were attempted. Codex CLI performed its own internal reconnects before the deadline.

This probes supplied instruction text with startup completed by premise; it does not exercise the actual App, hook lifecycle, or project creation. It supplies no evidence of end-to-end latency improvement.

Exact argv, timestamps, hashes: `manifest.json`. Full prompts, stdout/stderr and per-invocation execution metadata are retained in each harness-arm subdirectory. `report.json` records scope and limitations.

## Controlled HTTPS-only follow-up

A single candidate-only attempt used the locally configured built-in provider `openai`, with process-local `model_providers.openai.supports_websockets=false`. The option is present in the existing isolated custom-provider fixture, but this CLI rejects overriding built-in provider IDs. It exited in 0.015s before inference/network: “model_providers contains reserved built-in provider IDs: `openai`. Built-in providers cannot be overridden.”

No provider rename, model/auth change, persistent config write, or further retry was attempted. Exact final-root wording changed after this attempt's snapshot; since no inference occurred, this supplies no semantic behavior proof for either digest. See `codex-candidate-https/execution.json` and `stderr.txt`. Overall result remains UNKNOWN.
