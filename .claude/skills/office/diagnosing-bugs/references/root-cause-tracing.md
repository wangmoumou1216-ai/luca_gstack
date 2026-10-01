# Root Cause Tracing

Trace the failing value/control flow backward to its original trigger. A nearby thrown error marks
a symptom, not automatically the cause. Use the exact red loop from SKILL.md to verify the chain.

## Procedure

1. Capture the exact symptom and stack from an actually run reproduction.
2. Find the immediate operation and arguments that caused it.
3. Identify its caller and the values the caller supplied.
4. Repeat until the earliest wrong state, ordering or input is supported by evidence.
5. Form a falsifiable prediction, probe it in the authorized loop, and distinguish alternatives.

Example causal chain (illustrative): empty projectDir reaches `execFile('git',['init'],{cwd})`;
caller passed a fixture's tempDir before beforeEach initialized it. An empty cwd falls back to the
process directory. The source defect is fixture lifetime/access, not Git's error message. Only an
actual rerun can establish that this is the user's bug.

## Targeted instrumentation

Where stack reading is insufficient, inspect debugger state or add an authorized tagged probe before
the suspect operation. Record selected redacted arguments, cwd, relevant environment facts and stack;
never dump all environment variables or auth material. In tests, console.error may be more visible
than a suppressed logger. Use one unique `[DEBUG-<id>]` and remove it at cleanup.

To identify test pollution, the existing `../scripts/find-polluter.sh` is a possible helper only after
its execution and filesystem effects are authorized in isolated scratch. Do not run it on live
source as a read-only diagnostic or copy its command into a guessed environment.

If tracing dead-ends, report the missing observation and uncertainty rather than patching the symptom
and claiming root cause. A source fix followed by correct-seam regression and original-loop recheck
is the primary evidence. Read defense-in-depth.md only for independently justified guards at real
data/authority boundaries; no “bug impossible” claim follows from static examples.

Legacy personal systematic-debugging supplement; see ../PROVENANCE.md. All output is redacted.

<!-- FILE_END: diagnosing-bugs/references/root-cause-tracing.md -->
