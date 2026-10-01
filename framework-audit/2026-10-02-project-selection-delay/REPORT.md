# Luca project-selection delay — 2026-10-02

Status: DONE_WITH_CONCERNS for the bounded repair; real-provider and App GUI
acceptance remain unverified. Scope: explicit single-project selection and native
subagent identity correlation; no change to provider credentials, model choice,
Desktop Hook switches, project transaction authority or conflict protection.

## Observed incident

Session `01a0f998-1ffe-7080-b8f1-672a4e26505f` requested creation of
`matt-skill-acceptance-20260930`. Request at 06:31:48 and committed creation at
06:39:05 (Asia/Shanghai): approximately 7m17s. The public creation command itself
returned successfully in 0.8s, with COMMITTED, created=true and bound=true.
The project was created; the long delay preceded that command.
The sanitized [native timeline](timeline.json) preserves exact source line numbers.

## Causal findings

1. Root/Plan instructions counted three files without defining the operation
   boundary. The executing agent explicitly counted project initialization,
   reservation and binding as independent files, then invoked another planning
   agent. The public project-selection transaction already owns those details.
2. The agent added reconnaissance before the simple operation and repeatedly
   waited on agents. No project-creation error justified that implementation scan.
   The route guard itself did not issue a project-specific planning decision.
   The captured runtime also supplied proactive-delegation guidance, conditional
   on saving time or improving quality; the repository lacked an explicit
   single-selection procedure to bound that discretionary choice.
3. The first native spawn had an exact parent `SubAgentActivity started` record,
   but its SubagentStart callback had not bound the model-route ticket yet. A
   second ordinary spawn was therefore denied despite the existing native ID.
4. The first child also encountered five provider timeouts before HTTP fallback,
   over roughly 95.5 seconds. This is an independent latency contributor, not
   evidence that project creation itself was blocked for seven minutes.

These causes interact: unnecessary delegation exposes a simple selection to both
native-callback timing and provider availability. Their durations overlap and
must not be added as disjoint parts of the observed total.

## Changes and boundaries

The two root adapters point to the Project Gate operation boundary. The Plan
owner excludes only existing single-project new/switch internals from file and
phase counting; the Project Gate gives a direct main-session procedure and a
receipt/binding completion test. Explicit plan-first, batch work, implementation
changes and later engineering still retain applicable gates. Ambiguous intent
still needs human input; actual transaction failures must be diagnosed.

The Codex model-route hook reconciles an unbound ordinary ticket from a unique,
validated current-parent/current-turn native spawn call and started event. It
reuses project association validation and the locked external-identity writer.
It never infers identity from a task name or assistant text. Later SubagentStart
is idempotent. Identity correlation leaves completion pending and does not satisfy
critical review/model-adoption obligations; missing or inconsistent evidence
still refuses. No polling service or arbitrary retry delay is added.

Expected improvement: ordinary create/switch requests no longer depend on
reconnaissance/planning agents, and eligible ordinary parallel spawns no longer
fail solely because the native startup callback is late. This does not promise
fixed model response time or repair provider/network outages.

## Verification

- Plan independent REFUTE review: PASS 6/6.
- Agent context contracts: PASS; root/module context-size budgets preserved.
- Public project selection/replay/recovery and controlled-selection tests: PASS.
- Project gate dual-host behavior: PASS 27/27.
- Route guard: PASS 249/249; no project-name heuristic or route code changed.
- Native identity focused red/green: PASS 286 after original regression failed.
- Real installed Codex CLI, isolated HOME/provider/projects, all 11 hooks enabled:
  PASS 8/8; public creation followed by two ordinary spawns under an eight-second
  delayed SubagentStart. Second dispatch completed 7.874s before the first callback
  ended; both children finished. See [native runtime evidence](native-runtime.json).
- Context mutation suite: PASS 105/105 (including projection and staged-index gates).
- [Semantic CLI probes](semantic-probes.md): UNKNOWN. Both Codex arms timed out;
  both Claude arms failed before inference due to expired OAuth. A process-only
  HTTPS override was rejected by the reserved built-in provider configuration,
  so no alternate transport or credentials were installed. These failed probes
  cannot establish user-visible latency improvement.
- Final independent review: CONDITIONAL_PASS 9/10; no blocking safety defect.
  See [verdict](final-review.json) and [reviewed hashes](reviewed-files.json).
- Isolated App GUI: not completed. The installed App fixture had all 11 Hooks
  enabled, but the UI adapter selected the formal instance sharing its bundle ID.
  The App exposes no public send-message API. No test prompt was sent to the
  formal instance. This is a test-access limitation, not evidence of App failure.
- Standard repository pre-commit gate is mandatory for this code publication;
  no FAST_COMMIT bypass is allowed. Its result is recorded in the publication
  receipt. Earlier gate runs identified root-budget and explicit-plan example
  contract failures, both corrected before the final gate.

Claude and Codex consume separate root adapters and the shared Project Gate/Plan
owners. The runtime identity change is Codex-only. Claude's semantic CLI probe
currently fails before inference because its OAuth refresh is expired; no
credentials were changed and no Claude-model behavioral pass is claimed.

The local eval log is intentionally excluded from publication to avoid touching
the mother checkout’s unrelated 46 appended eval records; the frozen independent
verdict is included here.

Publication/local adoption must preserve the Desktop-OFF config and user dirty
files. Luca retains its already installed process-local11 Hook opt-in; this
framework change needs no App binary replacement.
