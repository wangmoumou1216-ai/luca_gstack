// Deny-only evidence survives failure to publish the main event state.
import { createHash } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

function identity(gstackRoot, sessionId, event) {
  if (typeof gstackRoot !== 'string' || !isAbsolute(gstackRoot)
      || !/^[\w-]{1,64}$/.test(String(sessionId || ''))
      || !String(event?.event_id || '') || !String(event?.boundary_id || '')) {
    throw Object.assign(new Error('event closure requires exact session and event identity'), { code: 'EVENT_IDENTITY_REQUIRED' });
  }
  const root = realpathSync(resolve(gstackRoot));
  const dir = join(root, '.claude');
  if (realpathSync(dir) !== dir) throw new Error('event closure directory must be canonical');
  const record = { schema_version: 1, session_id: String(sessionId),
    event_id: String(event.event_id), boundary_id: String(event.boundary_id) };
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`);
  const digest = createHash('sha256').update(bytes).digest('hex');
  return { dir, path: join(dir, `.session-event-closed-${sessionId}-${digest}`), bytes };
}

export function assertProjectEventOpen(gstackRoot, sessionId, event) {
  const { path } = identity(gstackRoot, sessionId, event);
  try { lstatSync(path); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  // Even malformed evidence, symlinks, or a interrupted write deny authority.
  throw Object.assign(new Error('native event has durable closure evidence'), { code: 'EVENT_CLOSED' });
}

export function revokeProjectEvent(gstackRoot, sessionId, event) {
  const { dir, path, bytes } = identity(gstackRoot, sessionId, event);
  let fd;
  try { fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Presence already denies this exact event; never remove or overwrite it.
    return { revoked: true, path, existing: true };
  }
  try { writeFileSync(fd, bytes); fsyncSync(fd); }
  finally { closeSync(fd); }
  const parent = openSync(dir, 'r');
  try { fsyncSync(parent); } finally { closeSync(parent); }
  return { revoked: true, path, existing: false };
}
