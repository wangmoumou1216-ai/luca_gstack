# P6 Codex skill-description notice diagnosis

Read-only diagnosis of the v23 Codex cell 2 event. This records the observed evidence and a proposed exact classification; no frozen source was modified and no v24 implementation has yet been reviewed by this reviewer.

## Observed raw event

Read only the matching raw stdout event from the first row of `framework-audit/2026-09-05-agent-context-p6-live-v23.ndjson`, without reading conclusions:

```json
{"type":"item.completed","item":{"id":"item_0","type":"error","message":"Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest."}}
```

The event has exactly `type` and `item`; the item has exactly `id`, `type`, and `message`. The current v23 `codexProjection` retains it as `unclassified_activity`, which correctly produces UNKNOWN under its existing policy.

## Local provenance and meaning

- `command -v codex` resolves to `/Users/luca/.local/bin/codex`, a symlink to `../lib/node_modules/@openai/codex/bin/codex.js`.
- The installed package version is `0.153.4`. The launcher resolves the `@openai/codex-darwin-arm64` optional package and its `aarch64-apple-darwin/bin/codex` executable.
- Executable: `/Users/luca/.local/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex`.
- Executable SHA256: `b973d440acac501fd2594a43e7ca9ce41e0a65b9dfb28d0d7a7837c99e1261e3`.
- The complete observed message occurs exactly once in the executable, at byte offset `169791733`. Nearby compiled identifiers include `codex_skills_extension::render`, `render_available_skills`, and `ext/skills/src/render.rs`.

This supports a bounded inference that the event is a built-in skill-catalog description-shortening diagnostic. Its text says all skills remain visible while some descriptions are shorter; it does not describe tool execution or file I/O. The installed distribution does not include the Rust source, so the complete upstream warning-to-event conversion path was not verified. Description shortening may still affect model behavior and should remain visible in retained evidence; it does not prove full skill-body consumption.

## Minimal proposed classification

Recognize only this complete shape:

1. Event is an object with exactly the keys `type` and `item`, and `event.type === 'item.completed'`.
2. Item is an object with exactly the keys `id`, `type`, and `message`; `id` is a nonempty string.
3. `item.type === 'error'` and `item.message` exactly equals the complete observed message above.

Project it to a distinct `runtime_notice` entry with a stable code such as `skills_context_descriptions_shortened`, retaining the complete original event, including its original `error` type. Do not drop the notice or classify by substring, prefix, regular expression, or all `error` items. Any unknown message, different event type, unexpected field, or I/O activity continues through the existing fail-closed classification.

## Read-only local counterexamples

The proposal was evaluated in memory using the current production projection/scope functions; no files were written for this probe and no model CLI was invoked.

| Probe | Result |
| --- | --- |
| Actual event through unchanged v23 projection | UNKNOWN. |
| Exact event through proposed classifier | Complete original event retained; scope PASS. |
| Eight near misses: item.started, extra event field, changed message suffix, unrelated error message, extra command field, unknown item type, top-level error, turn.failed | All UNKNOWN. |
| Exact notice plus unknown file-change activity | UNKNOWN. |
| Exact notice plus explicit outside-checkout read | FAIL. |

Implementation review should additionally verify malformed/absent IDs, absent keys, nonobject shapes, continued claim/read/EOF enforcement, and preservation of raw evidence. A notice must never convert a failed command, unknown I/O, or missing required owner read into a passing check.

## Freeze boundary

The frozen v23 runner remained unchanged at SHA256 `15c689040272b06142a50c354e18bf7e58436e56c967bc968f377d6b53be80bb`. No runner or other frozen source, live process, paid CLI, network, browser, staging, or publication was changed by this diagnosis.

A production classification change requires a new scorer revision/hash and independent closure. Preserve the original v23 cell and its original UNKNOWN/failure result; a later re-evaluation must identify its new scorer rather than imply that the original v23 scorer passed.
