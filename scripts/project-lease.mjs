#!/usr/bin/env node
import {
  mkdirSync,
  openSync,
  closeSync,
  fsyncSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const LOCK_NAME = '.project-switch.lock';
const OWNER_NAME = 'owner.json';

function cleanToken(value) {
  const token = String(value || '');
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(token)) throw new Error('invalid owner token');
  return token;
}

function ownerAlive(owner) {
  if (!owner.process_nonce || typeof owner.process_nonce !== 'string') {
    throw new Error('lease owner record lacks process nonce; manual recovery required');
  }
  const pid = Number(owner.pid);
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('lease owner pid is malformed; manual recovery required');
  try { process.kill(pid, 0); return true; }
  catch (error) {
    if (error?.code === 'EPERM') return true;
    if (error?.code === 'ESRCH') return false;
    throw new Error(`lease owner liveness is unknown (${error?.code || error}); manual recovery required`);
  }
}

function lockPaths(root) {
  const claudeDir = join(resolve(root), '.claude');
  return { claudeDir, lock: join(claudeDir, LOCK_NAME) };
}

function fsyncDir(path) {
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function readOwner(lock) {
  const value = JSON.parse(readFileSync(join(lock, OWNER_NAME), 'utf8'));
  if (!value || value.schema_version !== 1) throw new Error('invalid lease owner record');
  return value;
}

function sameOwner(actual, expected) {
  return ['schema_version', 'owner_token', 'pid', 'process_nonce', 'acquired_at']
    .every(field => actual?.[field] === expected?.[field]);
}

function removeExactLockDir(lock, expectedOwner) {
  // The lock contract permits exactly one file. Refuse unexpected contents instead
  // of using recursive deletion: recovery must never broaden beyond the lease.
  const entries = readdirSync(lock).sort();
  if (entries.length !== 1 || entries[0] !== OWNER_NAME) {
    throw new Error(`lease directory has unexpected contents; manual recovery required: ${entries.join(',')}`);
  }
  const existing = readOwner(lock);
  if (!sameOwner(existing, expectedOwner)) throw new Error('lease owner changed after directory rename; manual recovery required');
  unlinkSync(join(lock, OWNER_NAME));
  rmdirSync(lock);
}

export function acquireProjectLease({ root, ownerToken, pid = process.pid }) {
  const token = cleanToken(ownerToken);
  const ownerPid = Number(pid);
  if (!Number.isSafeInteger(ownerPid) || ownerPid <= 0) throw new Error(`invalid owner pid=${ownerPid}`);
  const { claudeDir, lock } = lockPaths(root);
  mkdirSync(claudeDir, { recursive: true });
  try { mkdirSync(lock); }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let existing;
    try { existing = readOwner(lock); }
    catch { throw new Error(`lease exists but owner record is not safely recoverable: ${lock}`); }
    const liveness = ownerAlive(existing) ? 'live' : 'stale';
    throw new Error(`project lease has ${liveness} owner pid=${existing.pid}; acquire never steals it. Inspect and explicitly recover the exact stale owner handle.`);
  }

  const record = {
    schema_version: 1,
    owner_token: token,
    pid: ownerPid,
    process_nonce: randomUUID(),
    acquired_at: new Date().toISOString(),
  };
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`);
  const ownerPath = join(lock, OWNER_NAME);
  let fd = null;
  try {
    if (process.env.LUCA_PROJECT_LEASE_FAULT === 'after-mkdir') throw new Error('injected lease fault after-mkdir');
    fd = openSync(ownerPath, 'wx', 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    fsyncDir(lock);
    fsyncDir(claudeDir);
    if (process.env.LUCA_PROJECT_LEASE_FAULT === 'after-owner-write') throw new Error('injected lease fault after-owner-write');
    return { acquired: true, owner_handle: { lock, owner: record } };
  } catch (error) {
    if (fd !== null) try { closeSync(fd); } catch { }
    // Roll back only the directory and owner bytes created by this exact attempt.
    // Unexpected contents are left fail-closed for explicit manual recovery.
    try {
      const entries = readdirSync(lock).sort();
      if (entries.length === 0) rmdirSync(lock);
      else if (entries.length === 1 && entries[0] === OWNER_NAME && readFileSync(ownerPath).equals(bytes)) {
        unlinkSync(ownerPath);
        rmdirSync(lock);
      }
    } catch { }
    throw error;
  }
}

export function inspectProjectLease({ root }) {
  const { lock } = lockPaths(root);
  const owner = readOwner(lock);
  return { owner_handle: { lock, owner }, owner_alive: ownerAlive(owner) };
}

export function recoverProjectLease({ root, ownerHandle }) {
  const { lock } = lockPaths(root);
  if (!ownerHandle || ownerHandle.lock !== lock || !ownerHandle.owner) throw new Error('complete lease owner handle required');
  const existing = readOwner(lock);
  if (!sameOwner(existing, ownerHandle.owner)) throw new Error('lease recovery owner handle mismatch');
  if (ownerAlive(existing)) throw new Error(`refusing to recover live project lease pid=${existing.pid}`);
  const token = cleanToken(existing.owner_token);
  const parked = `${lock}.manual-recovery-${token}-${randomUUID()}`;
  renameSync(lock, parked);
  removeExactLockDir(parked, existing);
  fsyncDir(resolve(root, '.claude'));
  return { recovered: true, owner_handle: ownerHandle };
}

export function releaseProjectLease({ root, ownerHandle }) {
  const { lock } = lockPaths(root);
  if (!ownerHandle || ownerHandle.lock !== lock || !ownerHandle.owner) throw new Error('complete lease owner handle required');
  const token = cleanToken(ownerHandle.owner.owner_token);
  const existing = readOwner(lock);
  if (!sameOwner(existing, ownerHandle.owner)) throw new Error('lease owner handle mismatch');
  if (process.env.LUCA_PROJECT_LEASE_FAULT === 'before-release-rename') {
    throw new Error('injected lease fault before-release-rename');
  }
  const parked = `${lock}.release-${token}-${randomUUID()}`;
  renameSync(lock, parked);
  // Once the canonical lock name has been atomically moved away, the lease is
  // logically released and a new owner may proceed. Cleanup failure after that
  // point is residue, not a failed release; report it without inviting callers
  // to retry an already-committed project transaction.
  try {
    if (process.env.LUCA_PROJECT_LEASE_FAULT === 'after-release-rename') {
      throw new Error('injected lease fault after-release-rename');
    }
    removeExactLockDir(parked, ownerHandle.owner);
    fsyncDir(resolve(root, '.claude'));
    return { released: true };
  } catch (error) {
    return {
      released: true,
      cleanup_required: true,
      parked_path: parked,
      error: String(error?.message || error),
      owner_handle: ownerHandle,
    };
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

async function cli() {
  const command = process.argv[2];
  const root = arg('--root');
  const ownerToken = arg('--owner-token');
  if (!command || !root) throw new Error('usage: project-lease.mjs acquire --root <gstack> --owner-token <token> [--pid <pid>] | inspect --root <gstack> | release|recover --root <gstack> --handle-json <json>');
  const result = command === 'acquire'
    ? acquireProjectLease({ root, ownerToken: cleanToken(ownerToken), pid: Number(arg('--pid') || process.pid) })
    : command === 'inspect'
      ? inspectProjectLease({ root })
    : command === 'release'
      ? releaseProjectLease({ root, ownerHandle: JSON.parse(arg('--handle-json') || 'null') })
      : command === 'recover'
        ? recoverProjectLease({ root, ownerHandle: JSON.parse(arg('--handle-json') || 'null') })
      : (() => { throw new Error(`unknown command: ${command}`); })();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  cli().catch((error) => {
    process.stderr.write(`[project-lease] ${error.message}\n`);
    process.exitCode = 1;
  });
}
