import { createHash, randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readlinkSync,
  readFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import {
  CORRECTION_VERIFIER_REGISTRY,
  CORRECTION_VERIFIER_REGISTRY_VERSION,
  verifyCorrectionEvidence,
} from './correction-verifiers.mjs';

export const CORRECTION_TICKET_SCHEMA_VERSION = 'correction-ticket-v1';
export const CORRECTION_RECEIPT_SCHEMA_VERSION = 'correction-receipt-v2';
export const CORRECTION_COMPLETION_SCHEMA_VERSION = 'correction-completion-v1';
export const CORRECTION_REQUEST_SCHEMA_VERSION = 'correction-close-request-v1';
export const CORRECTION_EVIDENCE_BINDING_SCHEMA_VERSION = 'correction-evidence-binding-v1';
export const CORRECTION_CLOSING_SCHEMA_VERSION = 'correction-closing-v1';

const HASH_RE = /^[a-f0-9]{64}$/;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TICKET_RE = /^ct-[a-f0-9]{64}$/;
const RECEIPT_RE = /^cr-[a-f0-9]{64}$/;
const EVIDENCE_PROOF_RE = /^cep-[a-f0-9]{64}$/;
const ISO_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const LEVELS = new Set(['NONE', 'L1', 'L2', 'L3', 'L4', 'L5']);
const PROMPT_SIGNALS = new Set(['NO_EXPLICIT_CORRECTION', 'EXPLICIT_CORRECTION']);
const EVIDENCE_KINDS = new Set([
  'DISCLOSURE',
  'AFFECTED_ARTIFACT',
  'OBSERVATION_RULE',
  'SEMANTIC_CANDIDATE',
  'FIX_OR_TASK_POINTER',
  'ROUTING_FIXTURE',
]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function processStartIdentity(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const close = stat.lastIndexOf(')');
    const fieldsAfterCommand = close >= 0 ? stat.slice(close + 2).trim().split(/\s+/) : [];
    const startTicks = fieldsAfterCommand[19];
    if (startTicks && /^\d+$/.test(startTicks)) return `proc-start-ticks:${startTicks}`;
  } catch { }
  const result = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const started = result.status === 0 ? String(result.stdout || '').trim().replace(/\s+/g, ' ') : '';
  return started ? `ps-lstart:${started}` : '';
}

const CURRENT_PROCESS_START_IDENTITY = processStartIdentity(process.pid);
if (!CURRENT_PROCESS_START_IDENTITY) throw new Error('cannot establish correction process start identity');
const CURRENT_PROCESS_START_SHA256 = sha256(Buffer.from(CURRENT_PROCESS_START_IDENTITY, 'utf8'));

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return sha256(Buffer.from(stable(value), 'utf8'));
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} keys must be exactly: ${wanted.join(', ')}`);
  }
}

function validDate(value, label) {
  const match = typeof value === 'string' ? value.match(ISO_DATE_TIME_RE) : null;
  if (!match) throw new Error(`${label} must be an ISO date-time`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = month >= 1 && month <= 12
    ? [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    : 0;
  if (
    month < 1 || month > 12 || day < 1 || day > daysInMonth
    || hour > 23 || minute > 59 || second > 59
    || offsetHour > 23 || offsetMinute > 59
    || Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`${label} must be an ISO date-time`);
  }
}

function validatePromptSignal(value) {
  if (!PROMPT_SIGNALS.has(value)) throw new Error('invalid correction prompt_signal');
  return value;
}

export function classifyCorrectionPrompt(prompt) {
  const text = String(prompt || '').normalize('NFKC').trim();
  if (!text) return 'NO_EXPLICIT_CORRECTION';
  const explicitCorrection = [
    /(?:纠正|更正|改正|修正(?:一下)?|你(?:刚才|前面)?(?:做|说|理解|路由)?错(?:了)?|不对|不是.{0,80}而是|不要再|别再|以后(?:不要|必须|应该|请)|今后(?:不要|必须|应该|请)|听懂(?:了)?吗|我要求你(?:以后|今后)|记住(?:这个|这一点|以后|今后))/u,
    /(?:\bcorrection\b|\bcorrect\s+(?:this|that|your)\b|\byou(?:'re| are| were)?\s+wrong\b|\bthat(?:'s| is)\s+(?:wrong|incorrect)\b|\bnot\s+.{1,80}\s+but\b|\bdo not\s+.{0,80}\s+again\b|\bdon't\s+.{0,80}\s+again\b|\bfrom now on\b|\bin the future\b|\bremember (?:that|to)\b|\byou should have\b|\byou must not\b)/iu,
  ].some(pattern => pattern.test(text));
  return explicitCorrection ? 'EXPLICIT_CORRECTION' : 'NO_EXPLICIT_CORRECTION';
}

function validateSessionId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,36}$/.test(value)) throw new Error('invalid correction session_id');
  return value;
}

function validateEventId(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 256 || value.includes('\0')) throw new Error('invalid correction event_id');
  return value;
}

function ensureDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const st = lstatSync(path);
  if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`correction state component is not a real directory: ${path}`);
}

function fsyncDirectory(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function writeStagingFile(path, bytes) {
  let fd;
  try {
    fd = openSync(path, 'wx', 0o600);
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  fsyncDirectory(dirname(path));
}

function publicationFault(label, phase) {
  return process.env.CORRECTION_PUBLICATION_FAULT === `${label}:${phase}`;
}

function publicationCrash(label, phase) {
  if (process.env.CORRECTION_PUBLICATION_CRASH === `${label}:${phase}`) process.kill(process.pid, 'SIGKILL');
}

function publicationLockPath(path) {
  return `${path}.publish-lock`;
}

function publicationLockTarget(owner) {
  return `correction-publication-lock-v1.${Buffer.from(JSON.stringify(owner), 'utf8').toString('base64url')}`;
}

function validatePublicationLockOwner(owner) {
  exactKeys(owner, ['schema_version', 'pid', 'process_nonce', 'process_start_sha256', 'acquired_at'], 'correction publication lock');
  if (
    owner.schema_version !== 1
    || !Number.isSafeInteger(owner.pid)
    || owner.pid < 1
    || !UUID_V4_RE.test(owner.process_nonce)
    || !HASH_RE.test(owner.process_start_sha256)
  ) {
    throw new Error('invalid correction publication lock owner');
  }
  validDate(owner.acquired_at, 'correction publication lock acquired_at');
  return owner;
}

function readPublicationLock(path, label) {
  const lockPath = publicationLockPath(path);
  const lst = lstatSync(lockPath);
  if (!lst.isSymbolicLink()) throw new Error(`${label} publication lock must be an owned symlink`);
  const target = readlinkSync(lockPath);
  const prefix = 'correction-publication-lock-v1.';
  if (!target.startsWith(prefix)) throw new Error(`${label} publication lock target is invalid`);
  let owner;
  try { owner = JSON.parse(Buffer.from(target.slice(prefix.length), 'base64url').toString('utf8')); }
  catch { throw new Error(`${label} publication lock owner is invalid JSON`); }
  validatePublicationLockOwner(owner);
  if (target !== publicationLockTarget(owner)) throw new Error(`${label} publication lock is not canonical`);
  return { lockPath, target, owner };
}

function publicationOwnerAlive(owner) {
  validatePublicationLockOwner(owner);
  let permissionDenied = false;
  try { process.kill(owner.pid, 0); }
  catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') permissionDenied = true;
    else {
      throw new Error(`correction publication lock liveness is unknown: ${error?.code || error}`);
    }
  }
  const identity = processStartIdentity(owner.pid);
  if (!identity) {
    try { process.kill(owner.pid, 0); }
    catch (error) {
      if (error?.code === 'ESRCH') return false;
      if (error?.code !== 'EPERM') {
        throw new Error(`correction publication lock liveness is unknown: ${error?.code || error}`);
      }
    }
    throw new Error(`correction publication lock process identity is unknown for pid=${owner.pid}`);
  }
  return sha256(Buffer.from(identity, 'utf8')) === owner.process_start_sha256;
}

function waitBriefly(milliseconds) {
  const signal = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(signal, 0, 0, milliseconds);
}

function acquirePublicationLock(path, label, waitMs = 0) {
  const lockPath = publicationLockPath(path);
  const deadline = Date.now() + waitMs;
  for (;;) {
    const owner = {
      schema_version: 1,
      pid: process.pid,
      process_nonce: randomUUID(),
      process_start_sha256: CURRENT_PROCESS_START_SHA256,
      acquired_at: new Date().toISOString(),
    };
    const target = publicationLockTarget(owner);
    try {
      symlinkSync(target, lockPath);
      fsyncDirectory(dirname(lockPath));
      return { lockPath, target, owner };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
    let current;
    try { current = readPublicationLock(path, label); }
    catch (error) {
      // The owner may release between our EEXIST and lstat/readlink. That is
      // normal contention resolution, not malformed lock state.
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (publicationOwnerAlive(current.owner)) {
      if (Date.now() < deadline) {
        waitBriefly(5);
        continue;
      }
      const busy = new Error(`${label} publication is owned by live pid=${current.owner.pid}`);
      busy.code = 'EEXIST';
      throw busy;
    }
    const parked = `${current.lockPath}.dead-${current.owner.process_nonce}-${randomUUID()}`;
    try { renameSync(current.lockPath, parked); }
    catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (readlinkSync(parked) !== current.target) throw new Error(`${label} publication lock changed during dead-owner recovery`);
    unlinkSync(parked);
    fsyncDirectory(dirname(lockPath));
  }
}

function releasePublicationLock(path, label, handle) {
  const current = readPublicationLock(path, label);
  if (!handle || current.lockPath !== handle.lockPath || current.target !== handle.target) {
    throw new Error(`${label} publication lock owner changed; exact recovery required`);
  }
  const parked = `${current.lockPath}.release-${current.owner.process_nonce}`;
  renameSync(current.lockPath, parked);
  if (readlinkSync(parked) !== current.target) throw new Error(`${label} publication lock changed during release`);
  unlinkSync(parked);
  fsyncDirectory(dirname(current.lockPath));
}

function verifyPublicationLockOwnership(path, label, handle) {
  const current = readPublicationLock(path, label);
  if (!handle || current.lockPath !== handle.lockPath || current.target !== handle.target) {
    throw new Error(`${label} publication lock owner changed; exact recovery required`);
  }
  return current;
}

function publicationPaths(path) {
  return { marker: `${path}.publish-recovery` };
}

function readPublicationMarker(path, label) {
  const { marker: markerPath } = publicationPaths(path);
  if (!existsSync(markerPath)) return null;
  const raw = readRegularBytesUnsettled(markerPath, `${label} publication marker`);
  let marker;
  try { marker = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error(`${label} publication marker is invalid JSON`); }
  exactKeys(marker, ['schema_version', 'final_path', 'staging_path', 'content_sha256'], `${label} publication marker`);
  if (
    marker.schema_version !== 1
    || marker.final_path !== path
    || !HASH_RE.test(marker.content_sha256)
    || typeof marker.staging_path !== 'string'
    || !marker.staging_path.startsWith(`${path}.publish-`)
    || !/^\d+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(marker.staging_path.slice(`${path}.publish-`.length))
  ) throw new Error(`${label} publication marker binding is invalid`);
  return { marker, markerPath };
}

function readStagedPublication(path, label) {
  const recovery = readPublicationMarker(path, label);
  if (!recovery) return null;
  const bytes = readRegularBytesUnsettled(recovery.marker.staging_path, `${label} publication staging`);
  if (sha256(bytes) !== recovery.marker.content_sha256) throw new Error(`${label} publication staging hash mismatch`);
  return { ...recovery, bytes };
}

function recoverUnpublishedExclusive(path, label) {
  if (existsSync(path)) return false;
  const staged = readStagedPublication(path, label);
  if (!staged) return false;
  createExclusive(path, staged.bytes, label);
  return true;
}

function settleExclusivePublicationUnlocked(path, label) {
  if (!existsSync(path)) return;
  const final = lstatSync(path);
  if (final.isSymbolicLink() || !final.isFile()) return;
  if (final.nlink !== 1) return;
  const recovery = readPublicationMarker(path, label);
  if (final.size === 0) {
    if (!recovery) throw new Error(`${label} is an incomplete reservation without recovery metadata: ${path}`);
    const staging = readStagedPublication(path, label);
    if (!staging) throw new Error(`${label} publication recovery metadata disappeared`);
    renameSync(recovery.marker.staging_path, path);
    unlinkSync(recovery.markerPath);
    fsyncDirectory(dirname(path));
    return;
  }
  if (!recovery) return;
  if (existsSync(recovery.marker.staging_path)) {
    throw new Error(`${label} has an ambiguous final plus staging publication: ${path}`);
  }
  const finalBytes = readRegularBytesUnsettled(path, label);
  if (sha256(finalBytes) !== recovery.marker.content_sha256) throw new Error(`${label} publication final hash mismatch`);
  unlinkSync(recovery.markerPath);
  fsyncDirectory(dirname(path));
}

function settleExclusivePublication(path, label) {
  const publication = acquirePublicationLock(path, label);
  try { settleExclusivePublicationUnlocked(path, label); }
  finally { releasePublicationLock(path, label, publication); }
}

function createExclusiveUnlocked(path, bytes, label) {
  if (existsSync(path)) {
    settleExclusivePublicationUnlocked(path, label);
    const collision = new Error(`${label} already exists: ${path}`);
    collision.code = 'EEXIST';
    throw collision;
  }
  const recovery = readPublicationMarker(path, label);
  const staging = recovery?.marker.staging_path || `${path}.publish-${process.pid}-${randomUUID()}`;
  const marker = publicationPaths(path).marker;
  let leaveStaging = false;
  try {
    if (recovery) {
      const staged = readRegularBytesUnsettled(staging, `${label} publication staging`);
      if (recovery.marker.content_sha256 !== sha256(bytes) || !staged.equals(bytes)) {
        throw new Error(`${label} publication retry content mismatch`);
      }
    } else {
      writeStagingFile(staging, bytes);
      atomicReplace(marker, jsonBytes({
        schema_version: 1,
        final_path: path,
        staging_path: staging,
        content_sha256: sha256(bytes),
      }));
    }
    if (publicationFault(label, 'after-staging')) {
      leaveStaging = true;
      throw new Error(`injected ${label} publication fault after staging`);
    }
    publicationCrash(label, 'after-staging');
    let reservation;
    try {
      reservation = openSync(path, 'wx', 0o600);
      fsyncSync(reservation);
    } finally {
      if (reservation !== undefined) closeSync(reservation);
    }
    fsyncDirectory(dirname(path));
    if (publicationFault(label, 'after-reserve')) {
      leaveStaging = true;
      throw new Error(`injected ${label} publication fault after reserve`);
    }
    publicationCrash(label, 'after-reserve');
    renameSync(staging, path);
    fsyncDirectory(dirname(path));
    if (publicationFault(label, 'after-publish')) {
      leaveStaging = true;
      throw new Error(`injected ${label} publication fault after publish`);
    }
    publicationCrash(label, 'after-publish');
  } finally {
    if (!leaveStaging) {
      if (existsSync(staging)) unlinkSync(staging);
      if (existsSync(marker)) unlinkSync(marker);
      fsyncDirectory(dirname(path));
    }
  }
}

function createExclusive(path, bytes, label = 'durable correction state') {
  const publication = acquirePublicationLock(path, label);
  try { return createExclusiveUnlocked(path, bytes, label); }
  finally { releasePublicationLock(path, label, publication); }
}

function atomicReplace(path, bytes) {
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`;
  writeStagingFile(temp, bytes);
  renameSync(temp, path);
  fsyncDirectory(dirname(path));
}

function readRegularBytesUnsettled(path, label, expectedLinks = 1) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== expectedLinks) {
      throw new Error(`${label} must be a regular non-symlink file with exactly ${expectedLinks} link(s): ${path}`);
    }
    const raw = readFileSync(fd);
    const after = fstatSync(fd);
    if (
      after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || after.nlink !== expectedLinks
    ) throw new Error(`${label} changed while being read: ${path}`);
    return raw;
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error(`${label} must be a regular non-symlink file: ${path}`);
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function readRegularBytes(path, label) {
  settleExclusivePublication(path, label);
  return readRegularBytesUnsettled(path, label);
}

function statePaths(root, sessionId) {
  const sid = validateSessionId(sessionId);
  const stateRoot = resolve(root, '.claude', 'correction-state');
  const sessionRoot = join(stateRoot, sid);
  return {
    claudeRoot: resolve(root, '.claude'),
    stateRoot,
    sessionRoot,
    evidenceBindings: join(stateRoot, 'evidence-bindings'),
    active: join(sessionRoot, 'active-ticket.json'),
    completion: join(sessionRoot, 'completion.json'),
    receipts: join(sessionRoot, 'receipts'),
    consumed: join(sessionRoot, 'consumed'),
    superseded: join(sessionRoot, 'superseded'),
    pendingExplicit: join(sessionRoot, 'pending-explicit-ticket.json'),
    eventBarrier: join(sessionRoot, '.event-barrier'),
    closing: join(sessionRoot, 'closing.json'),
    lock: join(sessionRoot, '.transition.lock'),
  };
}

function ensureState(root, sessionId) {
  const paths = statePaths(root, sessionId);
  ensureDirectory(resolve(root, '.claude'));
  ensureDirectory(paths.stateRoot);
  ensureDirectory(paths.evidenceBindings);
  ensureDirectory(paths.sessionRoot);
  ensureDirectory(paths.receipts);
  ensureDirectory(paths.consumed);
  ensureDirectory(paths.superseded);
  return paths;
}

function readExistingState(root, sessionId) {
  const paths = statePaths(root, sessionId);
  for (const path of [paths.claudeRoot, paths.stateRoot, paths.evidenceBindings, paths.sessionRoot, paths.receipts, paths.consumed, paths.superseded]) {
    if (!existsSync(path)) throw new Error('no correction state for requested session');
    const st = lstatSync(path);
    if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`correction state component is not a real directory: ${path}`);
  }
  return paths;
}

function validateTicket(ticket) {
  exactKeys(ticket, [
    'schema_version', 'verifier_registry', 'ticket_id', 'session_id', 'event_id',
    'prompt_sha256', 'prompt_signal', 'nonce', 'created_at',
  ], 'correction ticket');
  if (ticket.schema_version !== CORRECTION_TICKET_SCHEMA_VERSION) throw new Error('wrong correction ticket schema_version');
  if (ticket.verifier_registry !== CORRECTION_VERIFIER_REGISTRY_VERSION) throw new Error('wrong correction verifier registry');
  if (!TICKET_RE.test(ticket.ticket_id)) throw new Error('invalid correction ticket_id');
  validateSessionId(ticket.session_id);
  validateEventId(ticket.event_id);
  if (!HASH_RE.test(ticket.prompt_sha256)) throw new Error('invalid correction prompt hash');
  validatePromptSignal(ticket.prompt_signal);
  if (!UUID_V4_RE.test(ticket.nonce)) throw new Error('invalid correction nonce');
  validDate(ticket.created_at, 'ticket created_at');
  const expectedId = `ct-${stableHash({
    session_id: ticket.session_id,
    event_id: ticket.event_id,
    prompt_sha256: ticket.prompt_sha256,
    prompt_signal: ticket.prompt_signal,
    nonce: ticket.nonce,
    created_at: ticket.created_at,
  })}`;
  if (ticket.ticket_id !== expectedId) throw new Error('correction ticket_id integrity mismatch');
  return ticket;
}

function readTicket(path) {
  settleExclusivePublication(path, 'correction ticket');
  return readTicketUnsettled(path);
}

function readTicketUnsettled(path) {
  const raw = readRegularBytesUnsettled(path, 'correction ticket');
  let ticket;
  try { ticket = JSON.parse(raw.toString('utf8')); } catch { throw new Error(`invalid correction ticket JSON: ${path}`); }
  return { ticket: validateTicket(ticket), raw, sha256: sha256(raw) };
}

function ticketFromBinding({ sessionId, eventId, promptSha256, promptSignal, now = new Date().toISOString() }) {
  const nonce = randomUUID();
  const binding = {
    session_id: validateSessionId(sessionId),
    event_id: validateEventId(eventId),
    prompt_sha256: promptSha256,
    prompt_signal: validatePromptSignal(promptSignal),
    nonce,
    created_at: now,
  };
  if (!HASH_RE.test(binding.prompt_sha256)) throw new Error('invalid correction prompt hash');
  validDate(binding.created_at, 'ticket created_at');
  return {
    schema_version: CORRECTION_TICKET_SCHEMA_VERSION,
    verifier_registry: CORRECTION_VERIFIER_REGISTRY_VERSION,
    ticket_id: `ct-${stableHash(binding)}`,
    ...binding,
  };
}

function preserveSupersededTicket(paths, ticketRecord) {
  const archivedPath = join(paths.superseded, `${ticketRecord.ticket.ticket_id}.json`);
  if (existsSync(archivedPath)) {
    const archived = readRegularBytes(archivedPath, 'superseded correction ticket');
    if (!archived.equals(ticketRecord.raw)) throw new Error('superseded correction ticket collision');
    return;
  }
  createExclusive(archivedPath, ticketRecord.raw, 'superseded-ticket');
}

function compareTicketOrder(left, right) {
  if (left.prompt_signal !== right.prompt_signal) {
    return left.prompt_signal === 'EXPLICIT_CORRECTION' ? 1 : -1;
  }
  const leftTime = orderedTimestamp(left.created_at);
  const rightTime = orderedTimestamp(right.created_at);
  const created = leftTime.wholeSecond - rightTime.wholeSecond;
  if (created !== 0) return created;
  const fractionWidth = Math.max(leftTime.fraction.length, rightTime.fraction.length);
  const leftFraction = leftTime.fraction.padEnd(fractionWidth, '0');
  const rightFraction = rightTime.fraction.padEnd(fractionWidth, '0');
  if (leftFraction !== rightFraction) return leftFraction < rightFraction ? -1 : 1;
  return 0;
}

function orderedTimestamp(value) {
  const match = value.match(ISO_DATE_TIME_RE);
  if (!match) throw new Error('ticket created_at must be an ISO date-time');
  const fraction = match[7] || '';
  const wholeSecondText = fraction ? value.replace(`.${fraction}`, '') : value;
  return { wholeSecond: Date.parse(wholeSecondText) / 1_000, fraction };
}

function publishPendingExplicit(paths, ticket) {
  const publication = acquirePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', 30_000);
  try {
    if (existsSync(paths.pendingExplicit)) {
      const existing = readTicketUnsettled(paths.pendingExplicit);
      if (existing.ticket.ticket_id === ticket.ticket_id || compareTicketOrder(existing.ticket, ticket) > 0) return existing;
    }
    atomicReplace(paths.pendingExplicit, jsonBytes(ticket));
    return readTicketUnsettled(paths.pendingExplicit);
  } finally {
    releasePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', publication);
  }
}

function promotePendingExplicit(paths) {
  const publication = acquirePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', 30_000);
  try {
    if (!existsSync(paths.pendingExplicit)) return null;
    const pending = readTicketUnsettled(paths.pendingExplicit);
    if (existsSync(paths.active)) {
      const displaced = readTicket(paths.active);
      if (displaced.ticket.ticket_id === pending.ticket.ticket_id || compareTicketOrder(displaced.ticket, pending.ticket) > 0) {
        if (displaced.ticket.ticket_id !== pending.ticket.ticket_id) preserveSupersededTicket(paths, pending);
        unlinkSync(paths.pendingExplicit);
        fsyncDirectory(paths.sessionRoot);
        return displaced;
      }
      if (displaced.ticket.ticket_id !== pending.ticket.ticket_id) preserveSupersededTicket(paths, displaced);
    }
    renameSync(paths.pendingExplicit, paths.active);
    fsyncDirectory(paths.sessionRoot);
    return readTicket(paths.active);
  } finally {
    releasePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', publication);
  }
}

export function issueCorrectionTicket({ root, sessionId, eventId, prompt, promptSha256, promptSignal, now }) {
  const invokedAt = now === undefined ? new Date().toISOString() : now;
  const paths = ensureState(root, sessionId);
  const hasPrompt = prompt !== undefined && prompt !== null;
  const derivedHash = hasPrompt ? sha256(Buffer.from(String(prompt), 'utf8')) : '';
  if (promptSha256 && hasPrompt && promptSha256 !== derivedHash) throw new Error('supplied correction prompt hash does not match prompt bytes');
  const promptHash = promptSha256 || derivedHash;
  if (!promptHash) throw new Error('correction prompt or promptSha256 is required');
  const derivedSignal = hasPrompt ? classifyCorrectionPrompt(prompt) : validatePromptSignal(promptSignal);
  if (hasPrompt && promptSignal && promptSignal !== derivedSignal) throw new Error('supplied correction prompt_signal does not match prompt bytes');
  // Capture event order before any lock wait. A delayed older issuer must not
  // overwrite a newer explicit correction merely because its rename runs last.
  const candidate = ticketFromBinding({
    sessionId, eventId, promptSha256: promptHash, promptSignal: derivedSignal, now: invokedAt,
  });
  // UserPromptSubmit issuance and Stop's verified allow decision share this
  // process-owned barrier. An allow path deliberately retains it until the
  // Stop process dies, so no new event can become durable before that process
  // has crossed its externally observable exit boundary.
  // Never time out and lose an event. If Stop is still alive, issuance waits;
  // once it dies, PID + start identity lets this loop recover the barrier.
  const eventBarrier = acquirePublicationLock(paths.eventBarrier, 'correction-event-barrier', Number.POSITIVE_INFINITY);
  let transition;
  try {
    try {
      transition = acquireTransitionLock(paths);
    } catch (error) {
      // Never lose the newest explicit correction merely because another
      // record/close transition owns the lock. The complete, atomic pending
      // ticket makes public receipt reads fail closed until a later lock holder
      // promotes it. Ordinary prompts do not create such out-of-lock state.
      if (derivedSignal === 'EXPLICIT_CORRECTION' && error?.code === 'CORRECTION_TRANSITION_BUSY') {
        publishPendingExplicit(paths, candidate);
      }
      throw error;
    }
    try {
      if (existsSync(paths.closing)) {
        if (derivedSignal === 'EXPLICIT_CORRECTION') {
          publishPendingExplicit(paths, candidate);
        }
        throw new Error('correction close already started; new ticket issuance is frozen');
      }
      recoverUnpublishedExclusive(paths.active, 'correction-ticket');
      // Recover an interrupted explicit supersession before evaluating a newer
      // prompt. A durable pending ticket can never be bypassed by closing the
      // older active ticket.
      promotePendingExplicit(paths);

      if (existsSync(paths.active)) {
        const existing = readTicket(paths.active);
        if (existing.ticket.session_id !== sessionId) throw new Error('active correction ticket belongs to another session');
        const sameBinding = existing.ticket.event_id === eventId
          && existing.ticket.prompt_sha256 === promptHash
          && existing.ticket.prompt_signal === derivedSignal;
        if (sameBinding || !hasPrompt || derivedSignal !== 'EXPLICIT_CORRECTION') {
          return { ...existing, path: paths.active, created: false };
        }

        publishPendingExplicit(paths, candidate);
        promotePendingExplicit(paths);
        const readback = readTicket(paths.active);
        return { ...readback, path: paths.active, created: true };
      }

      const raw = jsonBytes(candidate);
      createExclusive(paths.active, raw, 'correction-ticket');
      const readback = readTicket(paths.active);
      if (!raw.equals(readback.raw)) throw new Error('correction ticket read-back mismatch');
      return { ...readback, path: paths.active, created: true };
    } finally {
      releaseTransitionLock(paths, transition);
    }
  } finally {
    releasePublicationLock(paths.eventBarrier, 'correction-event-barrier', eventBarrier);
  }
}

export function readActiveCorrectionTicket({ root, sessionId }) {
  const paths = readExistingState(root, sessionId);
  const transition = acquireTransitionLock(paths);
  try {
    recoverUnpublishedExclusive(paths.closing, 'closing-journal');
    if (existsSync(paths.closing)) {
      readClosing(paths);
      recoverUnpublishedExclusive(paths.active, 'correction-ticket');
      return existsSync(paths.active) ? { ...readTicket(paths.active), path: paths.active } : null;
    }
    recoverUnpublishedExclusive(paths.active, 'correction-ticket');
    promotePendingExplicit(paths);
    if (!existsSync(paths.active)) return null;
    return { ...readTicket(paths.active), path: paths.active };
  } finally {
    releaseTransitionLock(paths, transition);
  }
}

export function correctionEvidenceVariants(attributionLevel, routeCorrection) {
  if (!LEVELS.has(attributionLevel)) throw new Error(`invalid attribution level: ${attributionLevel}`);
  if (typeof routeCorrection !== 'boolean') throw new Error('route_correction must be boolean');
  if (attributionLevel === 'NONE' && routeCorrection) throw new Error('NONE cannot be a route correction');
  const route = routeCorrection ? ['ROUTING_FIXTURE'] : [];
  switch (attributionLevel) {
    case 'NONE': return [[]];
    case 'L1': return [['DISCLOSURE', ...route]];
    case 'L2': return [['AFFECTED_ARTIFACT', ...route]];
    case 'L3': return [
      ['OBSERVATION_RULE', ...route],
      ['SEMANTIC_CANDIDATE', ...route],
    ];
    case 'L4': return [['SEMANTIC_CANDIDATE', ...route]];
    case 'L5': return [['FIX_OR_TASK_POINTER', ...route]];
    default: throw new Error('unreachable attribution level');
  }
}

export function recordCorrectionEvidence({ root, request, now }) {
  const { request: validatedRequest } = validateRequest(request);
  if (now !== undefined) validDate(now, 'correction evidence recorded_at');
  const paths = readExistingState(root, validatedRequest.session_id);
  const transition = acquireTransitionLock(paths);
  try {
    if (existsSync(paths.pendingExplicit)) throw new Error('pending explicit correction supersedes evidence recording');
    if (existsSync(paths.closing)) throw new Error('correction close already started; evidence recording is frozen');
    if (!existsSync(paths.active)) throw new Error('no active correction ticket');
    const ticketRecord = readTicket(paths.active);
    assertRequestBindsTicket(validatedRequest, ticketRecord.ticket);
    const verified = validatedRequest.evidence.map(entry => verifyCorrectionEvidence(entry, {
      root,
      attributionLevel: validatedRequest.attribution_level,
      ticket: ticketRecord.ticket,
    }));
    const recordedAt = now || new Date().toISOString();
    if (Date.parse(recordedAt) < Date.parse(ticketRecord.ticket.created_at)) {
      throw new Error('correction evidence recording predates ticket');
    }
    for (const evidence of verified) {
      validDate(evidence.observed_at, 'correction evidence observed_at');
      if (Date.parse(evidence.observed_at) < Date.parse(ticketRecord.ticket.created_at)) {
        throw new Error('correction evidence predates ticket');
      }
      if (Date.parse(evidence.observed_at) > Date.parse(recordedAt)) {
        throw new Error('correction evidence postdates recording');
      }
    }
    const recorded = verified.map(evidence => bindCorrectionEvidence({
      paths,
      ticketRecord,
      evidence,
      boundAt: recordedAt,
      create: true,
    }));
    return { ticket: ticketRecord.ticket, evidence: recorded };
  } finally {
    releaseTransitionLock(paths, transition);
  }
}

function sameSet(actual, expected) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateRequest(request) {
  exactKeys(request, [
    'schema_version', 'ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce',
    'attribution_level', 'route_correction', 'evidence',
  ], 'correction close request');
  if (request.schema_version !== CORRECTION_REQUEST_SCHEMA_VERSION) throw new Error('wrong correction close request schema_version');
  if (!TICKET_RE.test(request.ticket_id)) throw new Error('invalid request ticket_id');
  validateSessionId(request.session_id);
  validateEventId(request.event_id);
  if (!HASH_RE.test(request.prompt_sha256)) throw new Error('invalid request prompt_sha256');
  validatePromptSignal(request.prompt_signal);
  if (!UUID_V4_RE.test(request.nonce)) throw new Error('invalid request nonce');
  if (!LEVELS.has(request.attribution_level)) throw new Error('invalid request attribution_level');
  if (typeof request.route_correction !== 'boolean') throw new Error('request route_correction must be boolean');
  if (!Array.isArray(request.evidence)) throw new Error('request evidence must be an array');
  const kinds = request.evidence.map((entry, index) => {
    exactKeys(entry, ['kind', 'verifier', 'path', 'selector'], `request evidence[${index}]`);
    if (!EVIDENCE_KINDS.has(entry.kind)) throw new Error(`unknown evidence kind: ${entry.kind}`);
    const registered = CORRECTION_VERIFIER_REGISTRY[entry.verifier];
    if (!registered) throw new Error(`unknown fixed verifier enum: ${entry.verifier}`);
    if (registered.kind !== entry.kind) throw new Error(`verifier ${entry.verifier} cannot verify ${entry.kind}`);
    return entry.kind;
  });
  if (new Set(kinds).size !== kinds.length) throw new Error('duplicate evidence kind');
  const variants = correctionEvidenceVariants(request.attribution_level, request.route_correction);
  const matched = variants.find(variant => sameSet(kinds, variant));
  if (!matched) throw new Error(`evidence kinds are not the exact attribution-derived set for ${request.attribution_level}`);
  return { request, requiredKinds: matched };
}

function assertRequestBindsTicket(request, ticket) {
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce']) {
    if (request[key] !== ticket[key]) throw new Error(`correction request ${key} does not bind active ticket`);
  }
}

function normalizeCounts(counts) {
  exactKeys(counts, ['edit', 'tool'], 'baseline counts');
  const edit = Number(counts.edit);
  const tool = Number(counts.tool);
  if (!Number.isSafeInteger(edit) || edit < 0 || !Number.isSafeInteger(tool) || tool < 0) throw new Error('baseline counts must be non-negative integers');
  return { edit, tool };
}

function evidenceProofCore(evidence) {
  return {
    kind: evidence.kind,
    verifier: evidence.verifier,
    selector: evidence.selector,
    claim_sha256: evidence.claim_sha256,
    artifact_sha256: evidence.artifacts.map(item => item.sha256).sort(),
  };
}

function evidenceReplayCore(evidence, ticketId) {
  return {
    ticket_id: ticketId,
    kind: evidence.kind,
    verifier: evidence.verifier,
    selector: evidence.selector,
    claim_sha256: evidence.claim_sha256,
  };
}

function evidenceProofId(evidence, ticketId) {
  return `cep-${stableHash(evidenceReplayCore(evidence, ticketId))}`;
}

function validateEvidenceBinding(binding) {
  exactKeys(binding, [
    'schema_version', 'proof_id', 'binding_sha256', 'ticket_id', 'ticket_sha256',
    'session_id', 'event_id', 'prompt_sha256', 'nonce', 'evidence', 'bound_at',
  ], 'correction evidence binding');
  if (binding.schema_version !== CORRECTION_EVIDENCE_BINDING_SCHEMA_VERSION) throw new Error('wrong correction evidence binding schema');
  if (!EVIDENCE_PROOF_RE.test(binding.proof_id) || !HASH_RE.test(binding.binding_sha256)) throw new Error('invalid correction evidence binding hash');
  if (!TICKET_RE.test(binding.ticket_id) || !HASH_RE.test(binding.ticket_sha256)) throw new Error('invalid correction evidence binding ticket');
  validateSessionId(binding.session_id);
  validateEventId(binding.event_id);
  if (!HASH_RE.test(binding.prompt_sha256) || !UUID_V4_RE.test(binding.nonce)) throw new Error('invalid correction evidence binding event');
  exactKeys(binding.evidence, ['kind', 'verifier', 'selector', 'claim_sha256', 'artifact_sha256'], 'correction evidence binding proof');
  if (!EVIDENCE_KINDS.has(binding.evidence.kind) || typeof binding.evidence.verifier !== 'string' || typeof binding.evidence.selector !== 'string') {
    throw new Error('invalid correction evidence binding proof identity');
  }
  const registered = CORRECTION_VERIFIER_REGISTRY[binding.evidence.verifier];
  if (!registered || registered.kind !== binding.evidence.kind) throw new Error('invalid correction evidence binding verifier');
  if (!HASH_RE.test(binding.evidence.claim_sha256) || !Array.isArray(binding.evidence.artifact_sha256) || binding.evidence.artifact_sha256.length < 1) {
    throw new Error('invalid correction evidence binding proof hashes');
  }
  if (binding.evidence.artifact_sha256.some(value => !HASH_RE.test(value))) throw new Error('invalid correction evidence artifact hash');
  validDate(binding.bound_at, 'correction evidence bound_at');
  const { binding_sha256: ignored, ...core } = binding;
  if (binding.binding_sha256 !== stableHash(core)) throw new Error('correction evidence binding integrity mismatch');
  if (binding.proof_id !== `cep-${stableHash(evidenceReplayCore(binding.evidence, binding.ticket_id))}`) {
    throw new Error('correction evidence proof identity mismatch');
  }
  return binding;
}

function readEvidenceBinding(paths, proofId) {
  if (!EVIDENCE_PROOF_RE.test(proofId)) throw new Error('invalid correction evidence proof_id');
  const path = join(paths.evidenceBindings, `${proofId}.json`);
  if (!existsSync(path)) throw new Error('missing ticket-bound evidence binding');
  let binding;
  try { binding = JSON.parse(readRegularBytes(path, 'correction evidence binding').toString('utf8')); }
  catch (error) { throw new Error(`invalid correction evidence binding: ${error.message}`); }
  return validateEvidenceBinding(binding);
}

function assertEvidenceBindingMatches({ binding, ticketRecord, evidence }) {
  const ticket = ticketRecord.ticket;
  const proofId = evidenceProofId(evidence, ticket.ticket_id);
  if (binding.proof_id !== proofId || stable(binding.evidence) !== stable(evidenceProofCore(evidence))) {
    throw new Error('correction evidence changed after receipt close or ticket-bound proof mismatch');
  }
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'nonce']) {
    if (binding[key] !== ticket[key]) throw new Error('ticket-bound evidence proof already consumed by another ticket');
  }
  if (binding.ticket_sha256 !== ticketRecord.sha256) throw new Error('ticket-bound evidence ticket hash mismatch');
  if (Date.parse(binding.bound_at) < Date.parse(ticket.created_at)) throw new Error('ticket-bound evidence predates ticket');
  return binding;
}

function bindCorrectionEvidence({ paths, ticketRecord, evidence, boundAt, create = false }) {
  const proofId = evidenceProofId(evidence, ticketRecord.ticket.ticket_id);
  const path = join(paths.evidenceBindings, `${proofId}.json`);
  recoverUnpublishedExclusive(path, 'evidence-binding');
  if (!existsSync(path) && create) {
    const core = {
      schema_version: CORRECTION_EVIDENCE_BINDING_SCHEMA_VERSION,
      proof_id: proofId,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      session_id: ticketRecord.ticket.session_id,
      event_id: ticketRecord.ticket.event_id,
      prompt_sha256: ticketRecord.ticket.prompt_sha256,
      nonce: ticketRecord.ticket.nonce,
      evidence: evidenceProofCore(evidence),
      bound_at: boundAt,
    };
    const binding = { ...core, binding_sha256: stableHash(core) };
    createExclusive(path, jsonBytes(binding), 'evidence-binding');
  }
  if (!existsSync(path)) throw new Error('missing ticket-bound evidence binding; evidence must be recorded before close');
  const binding = assertEvidenceBindingMatches({
    binding: readEvidenceBinding(paths, proofId),
    ticketRecord,
    evidence,
  });
  return {
    ...evidence,
    proof_id: binding.proof_id,
    binding_sha256: binding.binding_sha256,
    bound_at: binding.bound_at,
  };
}

function validateReceiptShape(receipt) {
  exactKeys(receipt, [
    'schema_version', 'verifier_registry', 'receipt_id', 'ticket_id', 'ticket_sha256',
    'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce', 'attribution_level',
    'route_correction', 'required_evidence_kinds', 'evidence', 'baseline_counts', 'closed_at',
  ], 'correction receipt');
  if (receipt.schema_version !== CORRECTION_RECEIPT_SCHEMA_VERSION) throw new Error('wrong correction receipt schema_version');
  if (receipt.verifier_registry !== CORRECTION_VERIFIER_REGISTRY_VERSION) throw new Error('wrong receipt verifier registry');
  if (!RECEIPT_RE.test(receipt.receipt_id) || !TICKET_RE.test(receipt.ticket_id)) throw new Error('invalid correction receipt/ticket id');
  if (!HASH_RE.test(receipt.ticket_sha256) || !HASH_RE.test(receipt.prompt_sha256)) throw new Error('invalid correction receipt hash');
  validatePromptSignal(receipt.prompt_signal);
  validateSessionId(receipt.session_id);
  validateEventId(receipt.event_id);
  if (!UUID_V4_RE.test(receipt.nonce)) throw new Error('invalid correction receipt nonce');
  if (!LEVELS.has(receipt.attribution_level) || typeof receipt.route_correction !== 'boolean') throw new Error('invalid correction receipt attribution');
  if (!Array.isArray(receipt.required_evidence_kinds) || !Array.isArray(receipt.evidence)) throw new Error('invalid correction receipt evidence arrays');
  if (new Set(receipt.required_evidence_kinds).size !== receipt.required_evidence_kinds.length) throw new Error('duplicate receipt evidence kind');
  normalizeCounts(receipt.baseline_counts);
  validDate(receipt.closed_at, 'receipt closed_at');
  const expectedReceiptId = `cr-${stableHash({
    ticket_id: receipt.ticket_id,
    ticket_sha256: receipt.ticket_sha256,
    prompt_signal: receipt.prompt_signal,
    attribution_level: receipt.attribution_level,
    route_correction: receipt.route_correction,
    evidence: receipt.evidence,
    baseline_counts: receipt.baseline_counts,
    closed_at: receipt.closed_at,
  })}`;
  if (receipt.receipt_id !== expectedReceiptId) throw new Error('correction receipt_id integrity mismatch');
  return receipt;
}

function verifyReceiptAgainstTicket({ root, receipt, ticketRecord }) {
  validateReceiptShape(receipt);
  const ticket = ticketRecord.ticket;
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'prompt_signal', 'nonce']) {
    if (receipt[key] !== ticket[key]) throw new Error(`correction receipt ${key} does not bind ticket`);
  }
  if (receipt.ticket_sha256 !== ticketRecord.sha256) throw new Error('correction receipt ticket hash mismatch');
  if (Date.parse(receipt.closed_at) < Date.parse(ticket.created_at)) throw new Error('correction receipt predates ticket');
  if (receipt.attribution_level === 'NONE' && ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
    throw new Error('explicit correction cannot close as NONE');
  }

  const variants = correctionEvidenceVariants(receipt.attribution_level, receipt.route_correction);
  if (!variants.some(variant => sameSet(receipt.required_evidence_kinds, variant))) {
    throw new Error('receipt required evidence set is not attribution-derived');
  }
  if (!sameSet(receipt.evidence.map(entry => entry.kind), receipt.required_evidence_kinds)) {
    throw new Error('receipt evidence does not match required kinds');
  }
  const reverified = receipt.evidence.map((entry, index) => {
    exactKeys(entry, [
      'kind', 'verifier', 'path', 'selector', 'observed_at', 'claim_sha256', 'artifacts',
      'proof_id', 'binding_sha256', 'bound_at',
    ], `receipt evidence[${index}]`);
    validDate(entry.observed_at, `receipt evidence[${index}].observed_at`);
    validDate(entry.bound_at, `receipt evidence[${index}].bound_at`);
    if (Date.parse(entry.observed_at) < Date.parse(ticket.created_at)) throw new Error('correction evidence predates ticket');
    if (Date.parse(entry.observed_at) > Date.parse(receipt.closed_at)) throw new Error('correction evidence postdates receipt');
    if (Date.parse(entry.bound_at) < Date.parse(ticket.created_at) || Date.parse(entry.bound_at) > Date.parse(receipt.closed_at)) {
      throw new Error('ticket-bound evidence time is outside ticket receipt boundary');
    }
    if (!HASH_RE.test(entry.claim_sha256) || !EVIDENCE_PROOF_RE.test(entry.proof_id) || !HASH_RE.test(entry.binding_sha256)
      || !Array.isArray(entry.artifacts) || entry.artifacts.length < 1) throw new Error('invalid receipt evidence proof');
    for (const [artifactIndex, item] of entry.artifacts.entries()) {
      exactKeys(item, ['path', 'sha256'], `receipt evidence[${index}].artifacts[${artifactIndex}]`);
      if (typeof item.path !== 'string' || !item.path || !HASH_RE.test(item.sha256)) throw new Error('invalid receipt artifact proof');
    }
    const reverified = verifyCorrectionEvidence(
      { kind: entry.kind, verifier: entry.verifier, path: entry.path, selector: entry.selector },
      { root, attributionLevel: receipt.attribution_level, ticket },
    );
    const binding = assertEvidenceBindingMatches({
      binding: readEvidenceBinding(statePaths(root, ticket.session_id), entry.proof_id),
      ticketRecord,
      evidence: reverified,
    });
    if (binding.binding_sha256 !== entry.binding_sha256 || binding.bound_at !== entry.bound_at) {
      throw new Error('correction receipt evidence binding changed');
    }
    return {
      ...reverified,
      proof_id: binding.proof_id,
      binding_sha256: binding.binding_sha256,
      bound_at: binding.bound_at,
    };
  });
  if (stable(reverified) !== stable(receipt.evidence)) throw new Error('correction evidence changed after receipt close');
  return receipt;
}

function transitionLockBytes(owner) {
  return jsonBytes(owner);
}

function validateTransitionLockOwner(owner) {
  exactKeys(owner, ['schema_version', 'owner_token', 'pid', 'process_nonce', 'process_start_sha256', 'acquired_at'], 'correction transition lock');
  if (owner.schema_version !== 1 || typeof owner.owner_token !== 'string' || !UUID_V4_RE.test(owner.owner_token)) {
    throw new Error('invalid correction transition lock owner');
  }
  if (
    !Number.isSafeInteger(owner.pid)
    || owner.pid < 1
    || typeof owner.process_nonce !== 'string'
    || !UUID_V4_RE.test(owner.process_nonce)
    || !HASH_RE.test(owner.process_start_sha256)
  ) {
    throw new Error('invalid correction transition lock process');
  }
  validDate(owner.acquired_at, 'correction transition lock acquired_at');
  return owner;
}

function transitionOwnerAlive(owner) {
  validateTransitionLockOwner(owner);
  let permissionDenied = false;
  try { process.kill(owner.pid, 0); }
  catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') permissionDenied = true;
    else throw new Error(`correction transition lock liveness is unknown: ${error?.code || error}`);
  }
  const identity = processStartIdentity(owner.pid);
  if (!identity) {
    try { process.kill(owner.pid, 0); }
    catch (error) {
      if (error?.code === 'ESRCH') return false;
      if (error?.code !== 'EPERM') {
        throw new Error(`correction transition lock liveness is unknown: ${error?.code || error}`);
      }
    }
    throw new Error(`correction transition lock process identity is unknown for pid=${owner.pid}`);
  }
  return sha256(Buffer.from(identity, 'utf8')) === owner.process_start_sha256;
}

function readTransitionLock(paths) {
  const raw = readRegularBytes(paths.lock, 'correction transition lock');
  let owner;
  try { owner = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error('invalid correction transition lock JSON'); }
  validateTransitionLockOwner(owner);
  if (!raw.equals(transitionLockBytes(owner))) throw new Error('correction transition lock is not canonical');
  return { raw, owner };
}

function acquireTransitionLock(paths) {
  const owner = {
    schema_version: 1,
    owner_token: randomUUID(),
    pid: process.pid,
    process_nonce: randomUUID(),
    process_start_sha256: CURRENT_PROCESS_START_SHA256,
    acquired_at: new Date().toISOString(),
  };
  const raw = transitionLockBytes(owner);
  recoverUnpublishedExclusive(paths.lock, 'transition-lock');
  try { createExclusive(paths.lock, raw, 'transition-lock'); }
  catch (error) {
    if (error?.code === 'EEXIST') {
      const busy = new Error(`correction transition lock exists; exact recovery required: ${paths.lock}`);
      busy.code = 'CORRECTION_TRANSITION_BUSY';
      throw busy;
    }
    throw error;
  }
  return { path: paths.lock, owner, raw };
}

function releaseTransitionLock(paths, handle) {
  if (!handle || handle.path !== paths.lock || !Buffer.isBuffer(handle.raw)) throw new Error('exact correction transition lock handle required');
  const current = readTransitionLock(paths);
  if (!current.raw.equals(handle.raw)) throw new Error('correction transition lock owner changed; exact recovery required');
  const parked = `${paths.lock}.release-${handle.owner.process_nonce}`;
  renameSync(paths.lock, parked);
  const parkedRaw = readRegularBytes(parked, 'released correction transition lock');
  if (!parkedRaw.equals(handle.raw)) throw new Error('correction transition lock changed during release');
  unlinkSync(parked);
  fsyncDirectory(paths.sessionRoot);
}

export function inspectCorrectionTransitionLock({ root, sessionId }) {
  const paths = readExistingState(root, sessionId);
  recoverUnpublishedExclusive(paths.lock, 'transition-lock');
  if (!existsSync(paths.lock)) return { occupied: false, path: paths.lock };
  const { raw, owner } = readTransitionLock(paths);
  return {
    occupied: true,
    owner_alive: transitionOwnerAlive(owner),
    owner_handle: { path: paths.lock, owner, raw_sha256: sha256(raw) },
  };
}

export function recoverCorrectionTransitionLock({ root, sessionId, ownerHandle }) {
  const paths = readExistingState(root, sessionId);
  recoverUnpublishedExclusive(paths.lock, 'transition-lock');
  if (!ownerHandle || ownerHandle.path !== paths.lock || !ownerHandle.owner || !HASH_RE.test(ownerHandle.raw_sha256 || '')) {
    throw new Error('complete exact correction transition lock owner handle required');
  }
  const current = readTransitionLock(paths);
  if (stable(current.owner) !== stable(ownerHandle.owner) || sha256(current.raw) !== ownerHandle.raw_sha256) {
    throw new Error('correction transition lock owner handle mismatch');
  }
  if (transitionOwnerAlive(current.owner)) throw new Error(`refusing to recover live correction transition lock pid=${current.owner.pid}`);
  const parked = `${paths.lock}.manual-recovery-${current.owner.process_nonce}-${randomUUID()}`;
  renameSync(paths.lock, parked);
  const parkedRaw = readRegularBytes(parked, 'recovered correction transition lock');
  if (!parkedRaw.equals(current.raw)) throw new Error('correction transition lock changed during recovery');
  unlinkSync(parked);
  fsyncDirectory(paths.sessionRoot);
  return { recovered: true, owner_handle: ownerHandle };
}

function validateCompletion(completion) {
  exactKeys(completion, ['schema_version', 'ticket_id', 'ticket_sha256', 'receipt_id', 'receipt_sha256', 'completed_at'], 'correction completion');
  if (completion.schema_version !== CORRECTION_COMPLETION_SCHEMA_VERSION) throw new Error('wrong correction completion schema');
  if (!TICKET_RE.test(completion.ticket_id) || !RECEIPT_RE.test(completion.receipt_id)) throw new Error('invalid correction completion ids');
  if (!HASH_RE.test(completion.ticket_sha256) || !HASH_RE.test(completion.receipt_sha256)) throw new Error('invalid correction completion hashes');
  validDate(completion.completed_at, 'completion completed_at');
  return completion;
}

function validateClosing(closing) {
  exactKeys(closing, [
    'schema_version', 'journal_sha256', 'ticket_id', 'ticket_sha256', 'session_id',
    'event_id', 'prompt_sha256', 'nonce', 'request_sha256', 'baseline_counts', 'closed_at',
  ], 'correction closing journal');
  if (closing.schema_version !== CORRECTION_CLOSING_SCHEMA_VERSION || !HASH_RE.test(closing.journal_sha256)) {
    throw new Error('invalid correction closing journal schema/hash');
  }
  if (!TICKET_RE.test(closing.ticket_id) || !HASH_RE.test(closing.ticket_sha256) || !HASH_RE.test(closing.request_sha256)) {
    throw new Error('invalid correction closing journal binding');
  }
  validateSessionId(closing.session_id);
  validateEventId(closing.event_id);
  if (!HASH_RE.test(closing.prompt_sha256) || !UUID_V4_RE.test(closing.nonce)) throw new Error('invalid correction closing journal event');
  normalizeCounts(closing.baseline_counts);
  validDate(closing.closed_at, 'correction closing journal closed_at');
  const { journal_sha256: ignored, ...core } = closing;
  if (closing.journal_sha256 !== stableHash(core)) throw new Error('correction closing journal integrity mismatch');
  return closing;
}

function readClosing(paths) {
  const raw = readRegularBytes(paths.closing, 'correction closing journal');
  let closing;
  try { closing = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error('invalid correction closing journal JSON'); }
  return { closing: validateClosing(closing), raw };
}

function closingBindsTicket(closing, ticketRecord) {
  for (const key of ['ticket_id', 'session_id', 'event_id', 'prompt_sha256', 'nonce']) {
    if (closing[key] !== ticketRecord.ticket[key]) throw new Error('correction closing journal does not bind ticket');
  }
  if (closing.ticket_sha256 !== ticketRecord.sha256) throw new Error('correction closing journal ticket hash mismatch');
}

function readCloseTicketRecord(paths, closingBefore = null) {
  if (existsSync(paths.active)) {
    const record = readTicket(paths.active);
    if (closingBefore) closingBindsTicket(closingBefore.closing, record);
    return record;
  }
  if (!closingBefore) return null;
  const consumedPath = join(paths.consumed, `${closingBefore.closing.ticket_id}.json`);
  if (!existsSync(consumedPath)) throw new Error('closing correction has neither active nor consumed ticket');
  const record = readTicket(consumedPath);
  closingBindsTicket(closingBefore.closing, record);
  return record;
}

export function readCorrectionTicketForClose({ root, sessionId }) {
  const paths = readExistingState(root, sessionId);
  recoverUnpublishedExclusive(paths.closing, 'closing-journal');
  recoverUnpublishedExclusive(paths.active, 'correction-ticket');
  const closingBefore = existsSync(paths.closing) ? readClosing(paths) : null;
  const record = readCloseTicketRecord(paths, closingBefore);
  return record ? { ...record, path: existsSync(paths.active) ? paths.active : join(paths.consumed, `${record.ticket.ticket_id}.json`) } : null;
}

function createOrReadClosing({ paths, ticketRecord, request, observedCounts, closedAt }) {
  const requestSha256 = stableHash(request);
  recoverUnpublishedExclusive(paths.closing, 'closing-journal');
  if (!existsSync(paths.closing)) {
    const core = {
      schema_version: CORRECTION_CLOSING_SCHEMA_VERSION,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      session_id: ticketRecord.ticket.session_id,
      event_id: ticketRecord.ticket.event_id,
      prompt_sha256: ticketRecord.ticket.prompt_sha256,
      nonce: ticketRecord.ticket.nonce,
      request_sha256: requestSha256,
      baseline_counts: observedCounts,
      closed_at: closedAt,
    };
    createExclusive(paths.closing, jsonBytes({ ...core, journal_sha256: stableHash(core) }), 'closing-journal');
  }
  const record = readClosing(paths);
  const closing = record.closing;
  closingBindsTicket(closing, ticketRecord);
  if (closing.request_sha256 !== requestSha256) throw new Error('correction closing journal request mismatch');
  if (
    observedCounts.edit < closing.baseline_counts.edit
    || observedCounts.tool < closing.baseline_counts.tool
  ) throw new Error('correction closing journal observed counters moved backwards');
  return record;
}

export function buildCorrectionCloseRequest({ ticket, attributionLevel, routeCorrection = false, evidence = [] }) {
  validateTicket(ticket);
  if (attributionLevel === 'NONE' && ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
    throw new Error('explicit correction cannot close as NONE');
  }
  const request = {
    schema_version: CORRECTION_REQUEST_SCHEMA_VERSION,
    ticket_id: ticket.ticket_id,
    session_id: ticket.session_id,
    event_id: ticket.event_id,
    prompt_sha256: ticket.prompt_sha256,
    prompt_signal: ticket.prompt_signal,
    nonce: ticket.nonce,
    attribution_level: attributionLevel,
    route_correction: routeCorrection,
    evidence,
  };
  validateRequest(request);
  return request;
}

export function closeCorrectionTicket({ root, request, baselineCounts, now }) {
  const { requiredKinds } = validateRequest(request);
  if (now !== undefined) validDate(now, 'receipt closed_at');
  // A forged session id must not manufacture a new state tree before it is
  // rejected. Issuance is the only operation allowed to create session state.
  const paths = readExistingState(root, request.session_id);
  const observedCounts = normalizeCounts(baselineCounts);
  const transition = acquireTransitionLock(paths);
  let released = false;
  try {
    recoverUnpublishedExclusive(paths.closing, 'closing-journal');
    const closingBefore = existsSync(paths.closing) ? readClosing(paths) : null;
    if (existsSync(paths.pendingExplicit) && !closingBefore) {
      throw new Error('pending explicit correction supersedes active ticket');
    }
    if (existsSync(paths.completion) && !closingBefore) {
      const current = validateCompletion(JSON.parse(readRegularBytes(paths.completion, 'correction completion').toString('utf8')));
      if (current.ticket_id === request.ticket_id) throw new Error('correction ticket already consumed');
    }
    const ticketRecord = readCloseTicketRecord(paths, closingBefore);
    if (!ticketRecord) throw new Error('no active correction ticket');
    assertRequestBindsTicket(request, ticketRecord.ticket);
    if (request.attribution_level === 'NONE' && ticketRecord.ticket.prompt_signal === 'EXPLICIT_CORRECTION') {
      throw new Error('explicit correction cannot close as NONE');
    }
    const closedAtCandidate = closingBefore?.closing.closed_at || now || new Date().toISOString();
    const validatedEvidence = request.evidence.map(entry => verifyCorrectionEvidence(entry, {
      root,
      attributionLevel: request.attribution_level,
      ticket: ticketRecord.ticket,
    }));
    for (const evidence of validatedEvidence) {
      validDate(evidence.observed_at, 'correction evidence observed_at');
      if (Date.parse(evidence.observed_at) < Date.parse(ticketRecord.ticket.created_at)) {
        throw new Error('correction evidence predates ticket');
      }
      if (Date.parse(evidence.observed_at) > Date.parse(closedAtCandidate)) throw new Error('correction evidence postdates receipt');
    }
    const boundEvidence = validatedEvidence.map(evidence => bindCorrectionEvidence({
      paths,
      ticketRecord,
      evidence,
      boundAt: closedAtCandidate,
      create: false,
    }));
    const closedAt = closingBefore?.closing.closed_at || closedAtCandidate;
    const receiptCounts = closingBefore?.closing.baseline_counts || observedCounts;
    const receiptCore = {
      schema_version: CORRECTION_RECEIPT_SCHEMA_VERSION,
      verifier_registry: CORRECTION_VERIFIER_REGISTRY_VERSION,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      session_id: ticketRecord.ticket.session_id,
      event_id: ticketRecord.ticket.event_id,
      prompt_sha256: ticketRecord.ticket.prompt_sha256,
      prompt_signal: ticketRecord.ticket.prompt_signal,
      nonce: ticketRecord.ticket.nonce,
      attribution_level: request.attribution_level,
      route_correction: request.route_correction,
      required_evidence_kinds: [...requiredKinds],
      evidence: boundEvidence,
      baseline_counts: receiptCounts,
      closed_at: closedAt,
    };
    const receipt = {
      schema_version: receiptCore.schema_version,
      verifier_registry: receiptCore.verifier_registry,
      receipt_id: `cr-${stableHash({
        ticket_id: receiptCore.ticket_id,
        ticket_sha256: receiptCore.ticket_sha256,
        prompt_signal: receiptCore.prompt_signal,
        attribution_level: receiptCore.attribution_level,
        route_correction: receiptCore.route_correction,
        evidence: receiptCore.evidence,
        baseline_counts: receiptCore.baseline_counts,
        closed_at: receiptCore.closed_at,
      })}`,
      ...Object.fromEntries(Object.entries(receiptCore).slice(2)),
    };
    validateReceiptShape(receipt);
    // Complete verification is a pre-commit condition. A bad clock boundary
    // or evidence binding must never consume the active ticket first and fail
    // only during the final acknowledgement read-back.
    verifyReceiptAgainstTicket({ root, receipt, ticketRecord });
    const closingRecord = createOrReadClosing({
      paths,
      ticketRecord,
      request,
      observedCounts,
      closedAt,
    });
    if (
      closingRecord.closing.closed_at !== closedAt
      || stable(closingRecord.closing.baseline_counts) !== stable(receiptCounts)
    ) throw new Error('correction closing journal changed the verified receipt boundary');
    const receiptRaw = jsonBytes(receipt);
    const receiptPath = join(paths.receipts, `${ticketRecord.ticket.ticket_id}.json`);
    recoverUnpublishedExclusive(receiptPath, 'correction-receipt');
    if (existsSync(receiptPath)) {
      const existingRaw = readRegularBytes(receiptPath, 'correction receipt');
      const existing = JSON.parse(existingRaw.toString('utf8'));
      verifyReceiptAgainstTicket({ root, receipt: existing, ticketRecord });
      if (!existingRaw.equals(receiptRaw)) throw new Error('pre-existing receipt collision');
    } else {
      createExclusive(receiptPath, receiptRaw, 'correction-receipt');
    }
    if (process.env.CORRECTION_CLOSE_FAULT === 'after-receipt') {
      throw new Error('injected correction close fault after receipt');
    }

    const consumedPath = join(paths.consumed, `${ticketRecord.ticket.ticket_id}.json`);
    if (existsSync(paths.active)) {
      const activeReadback = readRegularBytes(paths.active, 'correction ticket');
      if (!activeReadback.equals(ticketRecord.raw)) throw new Error('active correction ticket changed before consumption');
      if (existsSync(consumedPath)) throw new Error('consumed correction ticket collision');
      renameSync(paths.active, consumedPath);
      fsyncDirectory(paths.sessionRoot);
      fsyncDirectory(paths.consumed);
    } else {
      const consumedReadback = readRegularBytes(consumedPath, 'consumed correction ticket');
      if (!consumedReadback.equals(ticketRecord.raw)) throw new Error('consumed correction ticket changed during recovery');
    }
    if (process.env.CORRECTION_CLOSE_FAULT === 'after-consume') {
      throw new Error('injected correction close fault after consume');
    }

    const completion = {
      schema_version: CORRECTION_COMPLETION_SCHEMA_VERSION,
      ticket_id: ticketRecord.ticket.ticket_id,
      ticket_sha256: ticketRecord.sha256,
      receipt_id: receipt.receipt_id,
      receipt_sha256: sha256(receiptRaw),
      completed_at: closedAt,
    };
    atomicReplace(paths.completion, jsonBytes(completion));
    if (process.env.CORRECTION_CLOSE_FAULT === 'after-completion') {
      throw new Error('injected correction close fault after completion');
    }
    const closingReadback = readRegularBytes(paths.closing, 'correction closing journal');
    if (!closingReadback.equals(closingRecord.raw)) throw new Error('correction closing journal changed before commit cleanup');
    unlinkSync(paths.closing);
    fsyncDirectory(paths.sessionRoot);
    const verified = readCommittedCorrectionReceipt({ root, paths });
    if (verified.receipt.receipt_id !== receipt.receipt_id) throw new Error('correction completion read-back mismatch');
    releaseTransitionLock(paths, transition);
    released = true;
    return verified;
  } finally {
    if (!released && existsSync(paths.lock)) releaseTransitionLock(paths, transition);
  }
}

function readCommittedCorrectionReceipt({ root, paths }) {
  let completion;
  try { completion = validateCompletion(JSON.parse(readRegularBytes(paths.completion, 'correction completion').toString('utf8'))); } catch (error) {
    throw new Error(`invalid correction completion: ${error.message}`);
  }
  const ticketPath = join(paths.consumed, `${completion.ticket_id}.json`);
  const receiptPath = join(paths.receipts, `${completion.ticket_id}.json`);
  if (!existsSync(ticketPath) || !existsSync(receiptPath)) throw new Error('correction completion points to missing ticket/receipt');
  const ticketRecord = readTicket(ticketPath);
  const receiptRaw = readRegularBytes(receiptPath, 'correction receipt');
  if (ticketRecord.sha256 !== completion.ticket_sha256 || sha256(receiptRaw) !== completion.receipt_sha256) {
    throw new Error('correction completion hash mismatch');
  }
  let receipt;
  try { receipt = JSON.parse(receiptRaw.toString('utf8')); } catch { throw new Error('invalid correction receipt JSON'); }
  verifyReceiptAgainstTicket({ root, receipt, ticketRecord });
  if (receipt.receipt_id !== completion.receipt_id) throw new Error('correction completion receipt id mismatch');
  return { completion, receipt, ticket: ticketRecord.ticket, ticket_sha256: ticketRecord.sha256, receipt_sha256: sha256(receiptRaw) };
}

export function acquireCurrentCorrectionReceiptSnapshot({ root, sessionId }) {
  const paths = statePaths(root, sessionId);
  if (!existsSync(paths.completion)) return { completed: null, release() { }, sealForProcessExit() { } };
  readExistingState(root, sessionId);
  const eventBarrier = acquirePublicationLock(paths.eventBarrier, 'correction-event-barrier', Number.POSITIVE_INFINITY);
  let transition;
  try { transition = acquireTransitionLock(paths); }
  catch (error) {
    releasePublicationLock(paths.eventBarrier, 'correction-event-barrier', eventBarrier);
    if (error?.code === 'CORRECTION_TRANSITION_BUSY') {
      throw new Error('correction transition is in progress; prior completion cannot release');
    }
    throw error;
  }
  let pendingPublication;
  let released = false;
  const release = () => {
    if (released) throw new Error('correction receipt snapshot already released');
    if (pendingPublication) releasePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', pendingPublication);
    releaseTransitionLock(paths, transition);
    releasePublicationLock(paths.eventBarrier, 'correction-event-barrier', eventBarrier);
    released = true;
  };
  const sealForProcessExit = () => {
    if (released) throw new Error('correction receipt snapshot already released');
    // The barrier is intentionally left behind, so prove its exact ownership
    // immediately before releasing the ordinary transaction locks.
    verifyPublicationLockOwnership(paths.eventBarrier, 'correction-event-barrier', eventBarrier);
    if (pendingPublication) releasePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', pendingPublication);
    releaseTransitionLock(paths, transition);
    // Deliberately retain eventBarrier. Its owner includes PID + process-start
    // identity, so the next event can recover it only after this process has
    // actually died. This closes release-before-EOF Stop races.
    released = true;
  };
  try {
    // The Stop decision holds both locks through its final output. Explicit
    // issuance that collides with the transition must publish through the
    // pending lock, so it cannot become durable between these guard checks
    // and the caller's allow/block linearization point.
    pendingPublication = acquirePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', 30_000);
    recoverUnpublishedExclusive(paths.closing, 'closing-journal');
    recoverUnpublishedExclusive(paths.active, 'correction-ticket');
    if (existsSync(paths.closing)) {
      readClosing(paths);
      throw new Error('correction closing transaction supersedes prior completion');
    }
    if (existsSync(paths.pendingExplicit)) {
      readTicketUnsettled(paths.pendingExplicit);
      throw new Error('pending explicit correction supersedes prior completion');
    }
    if (existsSync(paths.active)) {
      readTicket(paths.active);
      throw new Error('active correction ticket supersedes prior completion');
    }
    return { completed: readCommittedCorrectionReceipt({ root, paths }), release, sealForProcessExit };
  } catch (error) {
    if (pendingPublication) releasePublicationLock(paths.pendingExplicit, 'pending-explicit-ticket', pendingPublication);
    releaseTransitionLock(paths, transition);
    releasePublicationLock(paths.eventBarrier, 'correction-event-barrier', eventBarrier);
    released = true;
    throw error;
  }
}

export function readCurrentCorrectionReceipt({ root, sessionId }) {
  const snapshot = acquireCurrentCorrectionReceiptSnapshot({ root, sessionId });
  try { return snapshot.completed; }
  finally { snapshot.release(); }
}

export function ensureRearmCorrectionTicket({ root, sessionId, completed }) {
  const active = readActiveCorrectionTicket({ root, sessionId });
  if (active) return active;
  if (!completed?.ticket || completed.ticket.session_id !== sessionId) throw new Error('cannot rearm without a verified prior correction ticket');
  return issueCorrectionTicket({
    root,
    sessionId,
    eventId: completed.ticket.event_id,
    promptSha256: completed.ticket.prompt_sha256,
    promptSignal: completed.ticket.prompt_signal,
  });
}

export function correctionStatePath({ root, sessionId }) {
  return statePaths(root, sessionId).sessionRoot;
}

export function hashCorrectionPrompt(prompt) {
  return sha256(Buffer.from(String(prompt), 'utf8'));
}
