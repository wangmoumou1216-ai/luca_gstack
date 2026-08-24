# Transcript / rollout authorization evidence

> Extracted: 2026-08-20  
> Purpose: freeze the minimum fields needed to design lazy prompt attestation. This is evidence, not runtime authorization.

## Claude Code archive (2.1.235; origin-binding evidence only)

Source:
`/Users/luca/.claude/projects/-Users-luca-Desktop----muse-lucagstack/d5721f1c-67be-4258-942f-0a94251bf712.jsonl`

Canonical text extraction rule used by the future fixture:

- string content: the string unchanged;
- array content: accept only bounded `type=text` and `type=image` blocks; concatenate ordered text values with
  one LF, validate but omit image bytes from authorization text, and reject `tool_result` or unknown blocks;
- encode the result as UTF-8 without normalization.

| line | source-line SHA256 | promptId | origin / meta | sessionId | content |
|---:|---|---|---|---|---|
| 8 | `e018c5bb8ed89ed1f9c8f685050d43901c1b942f291f6109d9b41be148920bab` | `f68131aa-2596-4161-b65e-2afae2b728bc` | `human` / false-or-absent | `d5721f1c-67be-4258-942f-0a94251bf712` | array; first ordered text block begins `[Image #1] luca app设置有一个问题…` |
| 847 | `b15ac1b77e8abff5531b618ecf32eb76af3740a33f465f6716251fb81029fa88` | `f4dd1793-a1b7-4385-a1a3-6e426545963a` | `peer` / true | `d5721f1c-67be-4258-942f-0a94251bf712` | string beginning `Another Claude session sent a message:` |

The peer row precedes the hook attachment/assistant rows in the transcript. Historical order is suggestive but
does not prove synchronous UserPromptSubmit visibility; the selected architecture therefore performs lazy
attestation at the first PreToolUse or Stop boundary and requires a fresh hook-time timing probe before runtime
edits. Current Claude Code 2.1.237 positive delivery and terminal shapes must come from that L0 probe, not from
this archive.

### Claude parent-boundary counterexamples (historical 2.1.220)

These records are negative architectural evidence only. They prove that neither unequal `promptId` nor a raw
`parentUuid` comparison is a safe cross-version drain oracle; they do **not** replace the fresh 2.1.237 terminal
marker census required by the plan.

| source | line | raw-line SHA256 | minimum relevant fact |
|---|---:|---|---|
| `68b091ed-9c91-4682-bb56-b14bd3246cad.jsonl` | 37 | `a6e96043e1d2702a77a098a3cea4d4a3209207892bc0fd6ef682ba7d0a42e2b8` | assistant `stop_reason=tool_use`, uuid `d3f577c4-...` |
| same | 38 | `6296ce1d219f2626c383b19b928639ae80c5da774ca3400f7f7010e96139ba1c` | tool_result child of line 37 |
| same | 41 | `39ddfafd1dee7774b12900164a7db18d5aa89cf3a0e1d65d95da146457a385c1` | wrapper user record, promptId `39bc22d1-...` |
| same | 43 | `e9ac83abfeebd0cf448912ac2720eccc6af5d5772cbc6dc4112d5d965e807108` | human `promptSource=queued`, same promptId as line 41, ancestry still under the tool chain |
| `9f426dac-c8b7-4338-88da-f9d088b9fb30.jsonl` | 1980 | `c717d75ee9336fe96c1e9becb205f41eb3d005b27f613dd53e88374c7192a17b` | typed human promptId `993ef0d4-...`, parentUuid `7f8fcd6d-...` |
| same | 1983 | `6e391f13aaaa3e713389508f591256dd6fd7ee8bb116b9ae42e36582a342dac5` | typed human promptId `cc794ded-...`, the same parentUuid `7f8fcd6d-...` |

Line 43 also shows that one human delivery can have a wrapper record plus a later origin-bearing record with
the same promptId. Claude attestation must collapse that exact bounded wrapper shape rather than assume one
promptId equals one JSONL line.

## Codex rollout (0.148.0)

Source:
`/Users/luca/.codex/sessions/2026/08/20/rollout-2026-08-20T17-41-22-01a01e8b-ee89-70f3-baf1-a1b79deb8a8d.jsonl`

| line | source-line SHA256 | native message id | parent turn id | text |
|---:|---|---|---|---|
| 1 | `09baf211bf7c40f832fe43e12567cf9b28a63826cf055c1dc40909a9c51850bb` | session meta | n/a | `session_id` and filename suffix both equal `01a01e8b-ee89-70f3-baf1-a1b79deb8a8d` |
| 60 | `91bccacd5f21472f74872a100c0f61efaf5997f90287e5a332f79faea91f7343` | `msg_01a01e8d-4cfe-7430-a75b-f2e4f4955ed7` | `01a01e8c-c476-7091-b410-1eecc434f725` | `项目是muse的luca app 啊` |
| 61 | `7304ea8140bce01fa11826d47f5e356546b5f3fde41cd866de8f74e648681109` | `UserMessage:01a01e8d-4cff-72d1-8bd0-89170c9055ac` | `01a01e8c-c476-7091-b410-1eecc434f725` | adjacent `event_msg/item_completed`; exact same text as line 60 |
| 63 | `5dc476b5d0d8f39056f5bf2f0e41d859328480352c67b1f6013002d24a83002e` | `msg_01a01e8d-4d7a-7b73-8cfa-35133f0ac301` | `01a01e8c-c476-7091-b410-1eecc434f725` | `这个你还需要问我？` |
| 64 | `c9dc30825d8f0729d9d997c650ccb97a5dd813badb697d3b8a59df7adc89ec1e` | `UserMessage:01a01e8d-4d7b-7e11-8bf7-dc6260fc8882` | `01a01e8c-c476-7091-b410-1eecc434f725` | adjacent `event_msg/item_completed`; exact same text as line 63 |
| 2395 | `f996bfcb8b524462ecaf873523e464cf247987c9b365506b62049739023f3e25` | `msg_01a01eef-8434-79d1-8adf-c5cd99ae495c` | `01a01e98-b43e-72b0-b273-9c7936323615` | `你 做完计划了吗` |

Codex therefore has the missing per-message identity in the durable rollout even though UserPromptSubmit raw
stdin exposes only the shared parent `turn_id`. The admissible native delivery is the adjacent two-record pair,
not either record alone: `response_item/message/role=user` followed immediately by
`event_msg/item_completed/UserMessage`, with session/thread, turn and decoded UTF-8 text equal. A lazy attester
can bind the pending prompt to that next unread pair and include both native record IDs in the anti-replay event
identity.

## Capture consistency note

`payload-census/claude-events.jsonl` line 1 is excluded: its `native_identity_fields` cannot be reproduced by the
frozen collector even though `raw_input.prompt_id` exists. Valid current-collector Claude evidence is line 2
SHA `0cd80a26a5415e3501fe5c90203a5cec675ea72cc3677675e0211317346fa969` and line 3 SHA
`09920960900b793a9394c6098473099638f421bd02478f953fd1a26b37b7260f`. The Codex parent/steer rows are line 3
SHA `c8b7ab98aef657851dea575f712560944eb45efbf269b14a752b10ab2ad92597` and line 4 SHA
`c8461da8a68eee98f1b6faf4afd6746ec6ce4f95d7be7edb4bd84d6a8aca304d`.
