# Condition-Based Waiting

Wait for the observable condition, not a guessed delay. Use for asynchronous completion, event/state
changes or flakiness caused by arbitrary sleeps. Timing behavior itself (debounce/throttle/ticks) is
the exception: first await its triggering condition, then observe its documented interval.

## Pattern

```typescript
// Getter runs afresh every poll; the result carries whether the condition is ready.
await waitFor(() => {
  const result = getResult();
  return { ready: result !== undefined, value: result };
}, 'result available');
```

Before each wait establish the expected public condition, timeout and symptom. Use a bounded polling
interval appropriate to the environment (10ms is an illustrative local default), always a deadline,
and a specific timeout description. Check current data inside the loop; cached state never progresses.
Predicate exceptions should surface, not be silently swallowed. Zero/false can be legitimate values,
so readiness is separate from truthiness. Validate timeout/interval parameters.

See `condition-based-waiting-example.ts` for self-contained illustrative waitFor, waitForEvent,
waitForEventCount and waitForEventMatch helpers. They need the caller's actual event interface, not
unavailable external imports. Event type alone may match old events; scope by correlation ID/cursor
when the actual operation requires it.

For timing tests: await TOOL_STARTED, then observe two known 100ms ticks over 200ms, with a WHY
comment explaining that interval. An arbitrary sleep used to suppress a race is not evidence.
Test against actual public outcomes and measured reproduction rates; a helper's existence proves
neither a flake fixed nor performance improved. Run only within the existing diagnostic authority.

Legacy personal systematic-debugging supplement; ../PROVENANCE.md. No historical pass metrics are
claimed as fresh validation.

<!-- FILE_END: diagnosing-bugs/references/condition-based-waiting.md -->
