# E3 native event identity — Phase 1 L0 results

Plan: `E3-NATIVE-EVENT-20260908-01`

Approved plan SHA-256:
`b95ad7aa07cc955e4cf6d6f99ed37e410a15827ed31e6783f0386fdf810224b1`

G3 baseline commit:
`14cf47d559fe2a0aea29227eddd7503964721364`

Status: `PHASE_1_PASS_BLOCKED_ON_OWNERSHIP_ONLY`

This record contains only redacted conclusions and artifact hashes. Raw native records remain outside
the repository. No Memory file, downstream project, hook trust, activation, restart, or push was
touched.

## 1. Codex 0.153.4 — PARTIAL_PASS

Current native root rollouts prove that distinct real user events can share one transport boundary:

- boundary `01a07ee2-…`: two independent native source/anchor pairs;
- boundary `01a07ef0-…`: three independent native source/anchor pairs;
- boundary `01a07f19-…`: two independent native source/anchor pairs.

Each source is a `response_item/message/role=user/msg_*` record with a passthrough `turn_id`; each
anchor is a separate `event_msg/item_completed/UserMessage` record carrying the same boundary.
This directly falsifies the current substrate assumption that the raw parent `turn_id` is a
single-use user event.

The first-attempt bounded scan of current-version September user-root rollouts found:

- 164 source/anchor pairs;
- 35 shared boundaries;
- 81 events on shared boundaries;
- all observed current-version pairs at distance 1;
- zero same-boundary identical-text pairs.

For the real `报告进度` event, durable ordering was:

1. native source at `03:35:29.687Z`;
2. native anchor at `03:35:29.688Z`;
3. route-guard/UserPromptSubmit context at `03:35:29.690Z`;
4. first tool record at `03:35:50.024Z`.

The source and anchor were therefore durable before the first PreToolUse opportunity. A no-tool
terminal sample also exists in the order source/anchor → route context → `task_complete`, but the
rollout has no explicit Stop-hook receipt, so exact Stop stdin fields remain `UNKNOWN`.

Provenance warning: subagent rollouts can copy part of a root `response_item/user` record without
copying its native `UserMessage` anchor. The attester must constrain source and anchor to the native
user thread/session and must never borrow an anchor across a fork.

Unproven current-version cases:

- safe distance 2: historical real evidence exists, but the current scan found no current-version
  occurrence;
- same boundary + identical text + distinct native IDs: no natural current-version sample exists;
- explicit raw PreToolUse and Stop payload receipts: hook registration exists, but rollout evidence
  alone cannot prove the payload.

One isolated explicit-hook probe was attempted and retained. It stopped during CLI argument parsing
before a model session or hook started because `-a` was placed after the `exec` subcommand even
though this installation accepts it only as a global option. The attempt was not retried. A corrected
temporary-hook invocation would require invocation-scoped `--dangerously-bypass-hook-trust`; the
approved plan explicitly requires separate user authority before any hook-trust bypass, even when it
does not persist configuration. UserPromptSubmit, PreToolUse, and Stop receipts therefore remain
`UNKNOWN`.

The user subsequently approved that invocation-scoped bypass in evidence amendment 01. The one
corrected command first failed inside the workspace sandbox before model or hook startup with
`failed to initialize in-process app-server client: Operation not permitted`. Per the runtime
permission contract, the exact command was then approved and resumed once outside that sandbox; it
was not changed or rerun to select a better result.

The sandbox-exempt execution completed successfully after WebSocket timeouts and HTTPS fallback:

- ephemeral thread: `01a07f52-958c-7e03-908e-6cf905d5529e`;
- exactly one read-only command: `/bin/zsh -lc pwd`;
- command output: `/private/tmp/e3-codex-hook-l0-iQwQ0I`;
- final message: `E3-CODEX-HOOK-L0-DONE`;
- usage: 40,997 input tokens, 31,744 cached input tokens, 56 output tokens;
- exit: 0.

However, neither `raw-events.jsonl` nor `receipts.jsonl` was created. The model/tool execution is
valid evidence that the invocation ran, but it is zero evidence for Hook payloads. Whether the temp
non-Git root or an isolation flag suppressed project Hook discovery is not inferred after the fact.
At that point the one-probe authorization was consumed, and UserPromptSubmit, PreToolUse,
response-only Stop, and ordinary Stop receipts remained `UNKNOWN`.

After deterministic non-model preflight, the user approved one final corrected probe. The preflight
used an isolated Git root and `hooks/list` to prove that exactly the temporary UserPromptSubmit,
PreToolUse, and Stop collectors were discovered with non-empty Codex-computed hashes before any
model call. A TOML inline-table trust override and `--dangerously-bypass-hook-trust` applied only to
that invocation; `--ignore-user-config` excluded all global hooks.

The final Codex 0.153.4 probe completed successfully after WebSocket timeouts and HTTPS fallback:

- ephemeral session: `01a07f67-877a-7d80-8535-744fff5a0584`;
- boundary: `01a07f67-87b1-7ed3-b12e-a65f15825137`;
- one read-only `Bash` tool call running `pwd`;
- final message: `E3-CODEX-HOOK-L0-DONE`;
- usage: 40,998 input tokens, 31,744 cached input tokens, 57 output tokens;
- exit: 0.

The collector captured exactly three receipts:

| Event | Captured UTC | Raw keys relevant to E3 |
|---|---|---|
| UserPromptSubmit | `05:05:03.987Z` | `session_id`, `turn_id`, `cwd`, `prompt`, `model`, `permission_mode`, `transcript_path` |
| PreToolUse | `05:06:46.919Z` | `session_id`, `turn_id`, `cwd`, `tool_name`, `tool_input`, `tool_use_id`, `model`, `permission_mode`, `transcript_path` |
| Stop | `05:06:51.662Z` | `session_id`, `turn_id`, `cwd`, `last_assistant_message`, `stop_hook_active`, `model`, `permission_mode`, `transcript_path` |

All three receipts carried the same session, boundary, and cwd. All three carried
`transcript_path: null`. Therefore E3 cannot rely on a Codex Hook-provided transcript path; its
bounded native reader must locate the authoritative rollout from the attested session/provenance
contract and then reject ambiguity. UserPromptSubmit and PreToolUse payloads plus an ordinary Stop
payload are now directly proven. A response-only Stop receipt remains unobserved; the existing real
no-tool rollout proves source/anchor → route context → `task_complete`, and Stop has no matcher, but
combining those two evidence legs is an inference pending independent adjudication.

Explicit-hook probe artifacts:

- root: `/private/tmp/e3-codex-hook-l0-iQwQ0I`
- collector:
  `66cf2ed114d3293ebb560591dc275d9e491b134d627924e11a7e67efcc91ef5a`
- hooks configuration:
  `ca9ca986b2c4c7ff25b21926b3e07f4045314e58c811d78b1e79b4b23001d2a8`
- empty stdout:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- argument-error stderr:
  `29833afbf687d65d1003661236b8e916a8febac79f5a9a061789996b8be8337e`
- successful sandbox-exempt final message:
  `3dbfdb87f877171d598e0e87194037efe810e68294842ba16f70bdadd5e48837`
- final raw Hook payload ledger (3 lines):
  `2cb0414764ca20f051d267a275c52f7d5eed0ed5824b0cab6be34e302b538445`
- final redacted receipt ledger (3 lines):
  `caab540a5c46ee663e69c663f08f71610d5ab50c7e3f7fe02b50698d8bdd0171`

Codex artifact hashes:

- `/private/tmp/e3-codex-l0-inspect.mjs`:
  `74e009e253858a0817f35d50a2c175c9ce6347ad77155e987371ecfa71624fd0`
- `/private/tmp/e3-codex-l0-scan.mjs`:
  `9b48987c2ca093006456159b7f2c7cc8036513976e204d7e22d3526ccf855dfd`
- `/private/tmp/e3-codex-l0-scan-september.jsonl` (13 redacted lines):
  `2c9721f089654f67e6474e466978eef81836cc7e28db76c682b6df2041db2aa8`

## 2. Claude Code 2.1.263 — UNKNOWN / AUTH_BLOCKED

Two setup states are retained rather than replacing the first failure:

1. Fully isolated `CLAUDE_CONFIG_DIR`: stopped before model or hook execution because the isolated
   directory had no login.
2. Corrected restricted invocation using the existing authenticated config while ignoring
   user/project/local settings: stopped in 5.13 seconds with
   `Failed to authenticate. API Error: 403 Request not allowed`.

Local auth metadata reports a logged-in first-party session, so this is not evidence that E3 logic
failed. It is an external account/service authorization blocker. The collector received zero hook
events. Pre-hook SDK transcript rows lack the required human origin and are inadmissible as native
human-event evidence.

Consequently, all current-version Claude assertions remain `UNKNOWN`:

- UserPromptSubmit payload and publication timing;
- PreToolUse payload and durable visibility;
- response-only Stop payload and timing;
- distinct events under one boundary;
- native replay identity.

The user subsequently waived all further Claude CLI validation. These assertions are now recorded
as `USER_WAIVED / UNKNOWN`, never as PASS. Historical native-schema fixtures and static/non-CLI
compatibility checks remain required, and final completion is capped at `DONE_WITH_CONCERNS`.

Claude attempt ledger:

- `/private/tmp/e3-claude-l0-J8qi9G/attempts.jsonl` (2 lines):
  `1956f73522316fae098dd1d296b7724cd7870ee82ace9b406d354683ebf017d2`

## 3. Gate decision

Phase 1's original cross-harness critical assertion is not satisfied. User-approved amendment 02
removes further Claude CLI validation from this execution without converting any unknown into a
pass. Independent gate `e3-native-event-l0-composed-20260908-r1` accepted the current Codex evidence
4/4: explicit Stop interface/fields plus matcher-free registration and a real no-tool lifecycle form
a sufficient composed proof for the response-only observation point. This is not represented as a
direct no-tool receipt. Phase 2 red-test implementation still must not begin until the Memory
ownership gate is released.

Five conditions are required to resume:

1. **Resolved by user-approved waiver amendment 02:** run no further Claude CLI validation; retain
   current behavior as `USER_WAIVED / UNKNOWN` and cap final status at `DONE_WITH_CONCERNS`.
2. **Resolved by independent composed-evidence gate:** current Codex has explicit UserPromptSubmit,
   PreToolUse, and Stop payload/timing evidence; the explicit Stop schema plus matcher-free
   registration and real no-tool rollout sufficiently prove the response-only observation point.
3. **Resolved by user-approved evidence amendment 01:** use the preserved historical real
   distance-2 record as the immutable positive fixture while retaining current-version distance-1
   and intervening-user negative evidence.
4. **Resolved by user-approved evidence amendment 01:** use a strict synthetic native-schema
   identical-text fixture plus the already-proven current-version shared-boundary native cases.
5. The concurrent Memory governance session must release and re-freeze
   `.claude/hooks/session-sync.mjs`, `.claude/hooks/session-restore.mjs`, and
   `scripts/test-hooks.mjs` before any E3 implementation touches them.

No prompt hash, random identity, repeated best-of run, or historical Claude result may be substituted
for these gates.

<!-- FILE_END: E3-NATIVE-EVENT-L0-RESULTS -->
