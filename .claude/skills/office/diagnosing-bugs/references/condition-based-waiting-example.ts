// Illustrative condition waiting; adapt EventReader at an authorized public seam.
// Legacy systematic-debugging supplement; see ../PROVENANCE.md.
export type Readiness<T> = { ready: boolean; value: T };
export interface DiagnosticEvent {
  type: string;
  correlationId?: string;
  data?: unknown;
}
export interface EventReader<E extends DiagnosticEvent> {
  getEvents(threadId: string): readonly E[];
}

export async function waitFor<T>(
  read: () => Readiness<T>,
  description: string,
  timeoutMs = 5000,
  intervalMs = 10,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 ||
      !Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError('timeoutMs must be finite and nonnegative; intervalMs positive');
  }
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const result = read();
    if (result.ready) return result.value;
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    await new Promise<void>(resolve => setTimeout(resolve, Math.min(intervalMs, remaining)));
  }
}

export async function waitForEventMatch<E extends DiagnosticEvent>(
  reader: EventReader<E>, threadId: string, predicate: (event: E) => boolean,
  description: string, timeoutMs = 5000,
): Promise<E> {
  const event = await waitFor(() => {
    const found = reader.getEvents(threadId).find(predicate);
    return { ready: found !== undefined, value: found };
  }, description, timeoutMs);
  if (event === undefined) throw new Error('Ready event was absent');
  return event;
}

export function waitForEvent<E extends DiagnosticEvent>(
  reader: EventReader<E>, threadId: string, eventType: string, timeoutMs = 5000,
): Promise<E> {
  return waitForEventMatch(reader, threadId, event => event.type === eventType,
    `${eventType} event`, timeoutMs);
}

export function waitForEventCount<E extends DiagnosticEvent>(
  reader: EventReader<E>, threadId: string, eventType: string, count: number, timeoutMs = 5000,
): Promise<E[]> {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('count must be a nonnegative integer');
  return waitFor(() => {
    const events = reader.getEvents(threadId).filter(event => event.type === eventType);
    return { ready: events.length >= count, value: events };
  }, `${count} ${eventType} events`, timeoutMs);
}

// For one operation, pass a correlation-aware predicate to avoid matching prior events:
// await waitForEventMatch(reader, threadId,
//   event => event.type === 'TOOL_RESULT' && event.correlationId === operationId,
//   'result for current operation');
