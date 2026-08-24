# UserPromptSubmit payload census

> Gate: `G-PAYLOAD-CENSUS`  
> Date: 2026-08-20  
> Production hooks changed: **no**

## Method

A capture-only hook was installed in an isolated nested scratch repository. It read stdin, emitted no
stdout, and wrote the raw JSON plus field/type and prompt-digest receipts. Claude used a one-off settings
file; Codex used a scratch project hook with trust bypass limited to that scratch repository. No user-level
hook registration was created.

Reproducible inputs:

- `payload-census/collector.mjs`
- `payload-census/claude-settings.json`
- `payload-census/workspace/.codex/hooks.json`

Durable receipts:

- `payload-census/claude-events.jsonl`
- `payload-census/codex-events.jsonl`

## Observed contracts

### Claude Code 2.1.237

Raw keys were exactly:

```text
cwd, hook_event_name, permission_mode, prompt, prompt_id, session_id, transcript_path
```

`prompt_id` is a native UUID. Two separate deliveries with byte-identical decoded prompt strings produced
different native `prompt_id` values. The local OAuth token was expired, but the UserPromptSubmit hook ran
before the API request, so the payload observation is valid; model completion was not used as evidence.

Archived transcript evidence additionally shows:

- normal typed user entries carry `promptId`, `origin.kind="human"`, and `isMeta=false`;
- peer deliveries carry `promptId`, `origin.kind="peer"`, and `isMeta=true`;
- the old hook ignored `prompt_id`, fell through to `randomUUID()`, and allowed a peer message to prepare a
  project switch.

### Codex CLI 0.148.0

Raw keys were exactly:

```text
cwd, hook_event_name, model, permission_mode, prompt, session_id, transcript_path, turn_id
```

There is no native per-message/prompt event ID. A live interactive receipt captured the parent prompt and
a queued steering prompt with the same `session_id` and the same `turn_id`, but different decoded prompt
strings. This reproduces the identity collision in the production failure chain.

## Gate conclusion

`G-PAYLOAD-CENSUS` passes only for selecting a revoke-and-queue UserPromptSubmit boundary:

- Claude `prompt_id` is merely a native hint until the lazy attester binds it to the current human-origin
  transcript delivery, exact session/cwd/text and supported current record shape.
- Codex raw stdin has no per-message identity, so `turn_id + prompt digest` is **not** a final event identity.
  The durable rollout evidence frozen in `TRANSCRIPT-AUTH-EVIDENCE.md` shows that each direct delivery has an
  adjacent `response_item/message/role=user/msg_*` plus `event_msg/item_completed/UserMessage` pair. Lazy
  attestation binds both native IDs, allowing two identical-text deliveries in one transport turn to remain
  distinct while exact native replay still fails closed.
- `user_message_id`, prompt digest and random UUID are not supported final fallbacks. Native event identity and
  marker-proven execution boundary remain separate contracts.

The census does not itself authorize a runtime edit. It only closes the first-round identity blocker.
