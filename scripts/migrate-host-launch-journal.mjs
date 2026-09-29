#!/usr/bin/env node
// Explicit reviewed upgrade of legacy default-profile journals. Never called by a hook.
// Plan:  --root /canonical/framework --plan /private/manifest.json
// Apply: --apply /private/manifest.json --expected-sha256 <reviewed manifest digest>
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, readSync, readdirSync, realpathSync, writeFileSync, linkSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { userInfo } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { captureNativeEventFence } from '../.claude/hooks/lib/event-attestation.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = /^[a-f\d-]{36}$/i;
const fail = message => { throw new Error(`journal migration: ${message}`); };
function parseJson(bytes, label) {
  try { return JSON.parse(bytes); } catch { fail(`invalid ${label} JSON`); }
}
function physical(path) {
  if (resolve(path) !== path || realpathSync(path) !== path) fail(`noncanonical path: ${path}`);
  return path;
}
function identity(path) {
  physical(path); const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.uid !== process.getuid()) fail('unowned directory');
  return { realpath: path, dev: String(stat.dev), ino: String(stat.ino) };
}
function read(path, limit = 1024 * 1024) {
  physical(path); const before = lstatSync(path);
  if (!before.isFile() || before.uid !== process.getuid() || before.size > limit) fail(`unsafe file: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (stat.dev !== before.dev || stat.ino !== before.ino) fail('file changed during open');
    const bytes = readFileSync(fd);
    if (bytes.length > limit) fail('file exceeds bound');
    return bytes;
  } finally { closeSync(fd); }
}
function privatePath(path, create = false) {
  if (!existsSync(path)) {
    if (!create) return;
    mkdirSync(path, { mode: 0o700 });
  }
  physical(path); const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('unprotected destination directory');
}
function targetDirectories(home, root) {
  return [join(home, '.codex'), join(home, '.codex', 'luca-child-project'),
    join(home, '.codex', 'luca-child-project', 'host-launch'),
    join(home, '.codex', 'luca-child-project', 'host-launch', sha(root))];
}
function verifyCursor(cursor, latest) {
  if (cursor?.schema_version !== 1 || cursor.harness !== 'codex'
    || cursor.transcript_path !== latest.transcript_path || cursor.dev !== latest.dev || cursor.ino !== latest.ino
    || !Number.isSafeInteger(cursor.byte_offset) || cursor.byte_offset < 1
    || cursor.byte_offset > latest.byte_offset || !Number.isSafeInteger(cursor.record_index)
    || cursor.record_index < 1) fail('invalid native cursor');
  const fd = openSync(cursor.transcript_path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (String(stat.dev) !== cursor.dev || String(stat.ino) !== cursor.ino) fail('native identity changed');
    const hash = createHash('sha256'), buffer = Buffer.alloc(65536);
    let offset = 0, lines = 0, last = 0;
    while (offset < cursor.byte_offset) {
      const size = readSync(fd, buffer, 0, Math.min(buffer.length, cursor.byte_offset - offset), offset);
      if (!size) fail('native prefix truncated');
      const part = buffer.subarray(0, size); hash.update(part);
      for (const byte of part) if (byte === 10) lines++;
      offset += size; last = part.at(-1);
    }
    if (last !== 10 || lines !== cursor.record_index || hash.digest('hex') !== cursor.prefix_sha256) {
      fail('native cursor prefix changed');
    }
  } finally { closeSync(fd); }
}
function outputBytes(bytes, kind) {
  if (kind === 'source') return bytes;
  const record = parseJson(bytes, 'history');
  delete record.claimHandle; delete record.launchNonce;
  return Buffer.from(JSON.stringify(record));
}
function destinationPreimage(file) {
  if (!existsSync(file)) { if (existsSync(dirname(file))) {
    // lstat also rejects dangling symbolic links, which existsSync does not see.
    try { lstatSync(file); fail('dangling target'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  } return null; }
  const bytes = read(file);
  if ((lstatSync(file).mode & 0o077) !== 0) fail('unprotected destination file');
  return sha(bytes);
}
function makePlan(root) {
  const rootIdentity = identity(root), home = physical(resolve(userInfo().homedir));
  const defaultSource = identity(join(home, '.codex'));
  const dirs = targetDirectories(home, root); dirs.forEach(path => privatePath(path));
  const destination = dirs.at(-1), legacy = physical(join(root, '.claude', 'host-launch'));
  const files = readdirSync(legacy).sort();
  const histories = new Map(), seenOperations = new Set();
  for (const name of files) {
    if (!/^[a-f\d-]{36}\.json$/i.test(name)) continue;
    const bytes = read(join(legacy, name)), value = parseJson(bytes, 'history');
    if (value.launchId !== name.slice(0, -5) || !uuid.test(value.launchId)
      || typeof value.request?.operationId !== 'string' || !value.request.operationId
      || seenOperations.has(value.request.operationId)) fail('invalid or duplicate history identity');
    seenOperations.add(value.request.operationId);
    histories.set(value.launchId, { bytes, value });
  }
  // Cover references in both directions: a missing receipt cannot silently
  // disappear from a directory listing while a preserved session still needs it.
  const references = [];
  for (const name of readdirSync(join(root, '.claude')).sort()) {
    if (!/^\.session-project-[\w-]{1,36}$/.test(name)) continue;
    const bytes = read(join(root, '.claude', name));
    let state;
    try { state = JSON.parse(bytes); } catch { continue; } // unrelated legacy pin format
    const ref = state.host_launch_source;
    if (!ref) continue;
    if (!uuid.test(ref.launch_id) || name !== `.session-project-${state.session_id}`) fail('invalid host session reference');
    const sourceName = `${ref.launch_id}.source.json`;
    if (!files.includes(sourceName)) {
      // Existing protected receipts require no migration, but must already match.
      if (destinationPreimage(join(destination, sourceName)) !== ref.sha256) fail('referenced source receipt is missing');
    } else if (sha(read(join(legacy, sourceName))) !== ref.sha256) fail('referenced source receipt changed');
    references.push({ name, sha256: sha(bytes), launch_id: ref.launch_id });
  }
  const entries = [];
  for (const name of files) {
    if (!/^[a-f\d-]{36}(?:\.source)?\.json$/i.test(name)) fail(`unclassified legacy file: ${name}`);
    const source = join(legacy, name), bytes = read(source);
    const kind = name.endsWith('.source.json') ? 'source' : 'history';
    const entry = { name, kind, source_sha256: sha(bytes), output_sha256: sha(outputBytes(bytes, kind)),
      target_preimage: destinationPreimage(join(destination, name)) };
    if (kind === 'source') {
      const grant = parseJson(bytes, 'source'), history = histories.get(grant.launchId)?.value;
      if (grant.schemaVersion !== 1 || grant.provider !== 'codex' || !uuid.test(grant.sessionId)
        || name !== `${grant.launchId}.source.json` || grant.cwd !== root || !history
        || history.sid !== grant.sessionId) fail('source/launch identity mismatch');
      if (!isDeepStrictEqual(grant.sourceRoot, defaultSource)) fail('only independently verified default Codex home may migrate');
      const profile = history.request.profileIdentity;
      if (profile?.provider !== 'codex') fail('legacy profile provider mismatch');
      if (!isDeepStrictEqual(profile.sourceRoot, defaultSource)) fail('legacy profile root mismatch');
      for (const field of ['profileId', 'configRevision', 'sourceId']) {
        if (typeof grant[field] !== 'string' || !grant[field] || grant[field] !== profile[field]) fail('legacy profile linkage mismatch');
      }
      const statePath = join(root, '.claude', `.session-project-${grant.sessionId}`);
      const stateBytes = read(statePath), state = parseJson(stateBytes, 'session state');
      if (state.session_id !== grant.sessionId || state.host_launch_source?.launch_id !== grant.launchId
        || state.host_launch_source.sha256 !== sha(bytes)) fail('session source reference mismatch');
      const fence = state.event_control?.fence;
      if (fence?.harness !== 'codex' || fence.session_id !== grant.sessionId || fence.cwd !== root
        || fence.source_absent || !fence.cursor) fail('missing original native startup fence');
      // Independent native provenance, never a legacy host scope or arbitrary CODEX_HOME.
      const native = captureNativeEventFence({ sessionId: grant.sessionId, harness: 'codex', cwd: root });
      if (native.source_absent || !native.cursor) fail('native source unavailable');
      verifyCursor(fence.cursor, native.cursor);
      const cursor = state.event_control.cursor || fence.cursor; verifyCursor(cursor, native.cursor);
      entry.session = { id: grant.sessionId, state_sha256: sha(stateBytes), cursor, fence_cursor: fence.cursor };
    }
    entries.push(entry);
  }
  if (!entries.length) fail('legacy journal is empty');
  return { schema_version: 1, root: rootIdentity, default_source: defaultSource, destination, references, entries };
}
function exclusiveWrite(path, bytes) {
  const temp = join(dirname(path), `.luca-migrate-${randomUUID()}.tmp`);
  const fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    // Hard-link publication is atomic and never replaces an existing target.
    try { linkSync(temp, path); }
    catch (error) {
      if (error.code !== 'EEXIST' || destinationPreimage(path) !== sha(bytes)) throw error;
    }
    const directory = openSync(dirname(path), constants.O_RDONLY);
    try { fsyncSync(directory); } finally { closeSync(directory); }
  } finally { unlinkSync(temp); }
}
function applyPlan(plan, manifestBytes, approvedHash) {
  if (!/^[a-f0-9]{64}$/.test(approvedHash) || sha(manifestBytes) !== approvedHash) fail('reviewed manifest hash mismatch');
  const current = makePlan(plan.root?.realpath);
  const withoutTargets = value => ({ ...value, entries: value.entries.map(({ target_preimage, ...entry }) => entry) });
  if (!isDeepStrictEqual(withoutTargets(current), withoutTargets(plan))) fail('migration inputs changed since review');
  for (const entry of plan.entries) {
    const actual = current.entries.find(item => item.name === entry.name).target_preimage;
    if (actual !== entry.target_preimage && actual !== entry.output_sha256) fail('destination changed since review');
    if (actual !== null && actual !== entry.output_sha256) fail('destination conflict');
  }
  const dirs = targetDirectories(physical(resolve(userInfo().homedir)), plan.root.realpath);
  for (const directory of dirs) privatePath(directory, true);
  let written = 0;
  for (const entry of plan.entries) {
    const bytes = read(join(plan.root.realpath, '.claude', 'host-launch', entry.name));
    if (sha(bytes) !== entry.source_sha256) fail('legacy file changed before copy');
    if (entry.session) {
      const state = read(join(plan.root.realpath, '.claude', `.session-project-${entry.session.id}`));
      if (sha(state) !== entry.session.state_sha256) fail('session changed before copy');
      const native = captureNativeEventFence({ sessionId: entry.session.id, harness: 'codex', cwd: plan.root.realpath });
      verifyCursor(entry.session.cursor, native.cursor); verifyCursor(entry.session.fence_cursor, native.cursor);
    }
    const target = join(plan.destination, entry.name), existing = destinationPreimage(target);
    if (existing !== null && existing !== entry.output_sha256) fail('concurrent destination conflict');
    if (existing === null) { exclusiveWrite(target, outputBytes(bytes, entry.kind)); written++; }
    if (sha(read(target)) !== entry.output_sha256) fail('destination readback mismatch');
  }
  const fd = openSync(plan.destination, constants.O_RDONLY);
  try { fsyncSync(fd); } finally { closeSync(fd); }
  return { migrated: written, verified: plan.entries.length, source_receipts: plan.entries.filter(e => e.kind === 'source').length,
    execution_authority: 'NOT_PROVIDED', manifest_sha256: approvedHash };
}
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--root', '--plan', '--apply', '--expected-sha256'].includes(args[i]) || !args[i + 1] || options[args[i]]) fail('invalid arguments');
  options[args[i]] = args[i + 1];
}
if (options['--root'] && options['--plan'] && Object.keys(options).length === 2) {
  const plan = makePlan(options['--root']), bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  exclusiveWrite(options['--plan'], bytes);
  console.log(JSON.stringify({ plan: options['--plan'], sha256: sha(bytes), entries: plan.entries.length,
    source_receipts: plan.entries.filter(e => e.kind === 'source').length }));
} else if (options['--apply'] && options['--expected-sha256'] && Object.keys(options).length === 2) {
  const bytes = read(options['--apply']);
  console.log(JSON.stringify(applyPlan(parseJson(bytes, 'manifest'), bytes, options['--expected-sha256'])));
} else fail('use --root/--plan or --apply/--expected-sha256');
