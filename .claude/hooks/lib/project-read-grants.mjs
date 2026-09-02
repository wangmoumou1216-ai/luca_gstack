import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  PROJECTS_ROOT,
  canonicalProjectIdentity,
  sanitizeSessionId,
  verifyProjectBinding,
} from './project-substrate.mjs';

const SCHEMA_VERSION = 1;
const DIRECTIVE = /^(本会话)?只读引用(目录)?[：:]\s*(.+?)\s*$/;
const OPERATIONS = new Set(['read', 'list', 'search']);
const LIFETIMES = new Set(['turn', 'session']);
const KINDS = new Set(['file', 'directory']);

function sidOf(sessionId) {
  const sid = sanitizeSessionId(sessionId);
  if (!sid) throw new Error('session id required');
  return sid;
}

function claudeDir(gstackRoot) {
  const root = realpathSync(resolve(gstackRoot));
  const dir = join(root, '.claude');
  if (realpathSync(dir) !== dir) throw new Error('grant state parent must be a canonical directory');
  return dir;
}

export function grantSetPath(gstackRoot, sessionId) {
  return join(claudeDir(gstackRoot), `.session-read-grants-${sidOf(sessionId)}`);
}

export function turnWitnessPath(gstackRoot, sessionId) {
  return join(claudeDir(gstackRoot), `.session-read-turn-${sidOf(sessionId)}`);
}

export function denyLatchPath(gstackRoot, sessionId) {
  return join(claudeDir(gstackRoot), `.session-read-deny-${sidOf(sessionId)}`);
}

export function grantLockPath(gstackRoot, sessionId) {
  const name = `.${['session', 'read', 'lock'].join('-')}-${sidOf(sessionId)}`;
  return join(claudeDir(gstackRoot), name);
}

function withGrantStateLock(gstackRoot, sessionId, work) {
  const sid = sidOf(sessionId);
  const lock = grantLockPath(gstackRoot, sid);
  const owner = {
    schema_version: SCHEMA_VERSION,
    session_id: sid,
    owner_token: randomUUID(),
    pid: process.pid,
    acquired_at: new Date().toISOString(),
  };
  const bytes = Buffer.from(`${JSON.stringify(owner)}\n`);
  let fd = null;
  try {
    fd = openSync(lock, 'wx', 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
  } catch (error) {
    if (fd !== null) try { closeSync(fd); } catch { }
    if (error?.code === 'EEXIST') throw new Error('read grant state lock exists; manual recovery required');
    try { unlinkSync(lock); } catch { }
    throw error;
  }
  let completed = false;
  let primaryError = null;
  try {
    const result = work();
    completed = true;
    return result;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let released = false;
    let parked = '';
    try {
      const current = readFileSync(lock);
      if (!current.equals(bytes)) throw new Error('read grant state lock owner changed');
      parked = `${lock}.release-${owner.owner_token}`;
      renameSync(lock, parked);
      released = true;
      const parkedBytes = readFileSync(parked);
      if (!parkedBytes.equals(bytes)) throw new Error('read grant state lock changed during release');
      unlinkSync(parked);
      try {
        const parentFd = openSync(dirname(lock), 'r');
        try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
      } catch (error) {
        process.stderr.write(`[project-read-grants] state lock released but directory durability check failed: ${String(error?.message || error)}\n`);
      }
    } catch (error) {
      const handle = JSON.stringify({ lock, owner });
      if (released) {
        process.stderr.write(`[project-read-grants] state lock released but exact residue cleanup failed: ${parked} error=${String(error?.message || error)}\n`);
      } else if (completed) {
        process.stderr.write(`[project-read-grants] state committed but lock release failed; grants remain deny-closed. owner_handle=${handle} error=${String(error?.message || error)}\n`);
      } else if (!primaryError) {
        throw error;
      }
    }
  }
}

function optionalBytes(path) {
  try { return readFileSync(path); }
  catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function atomicWrite(path, value, prefix) {
  const parent = dirname(path);
  if (realpathSync(parent) !== parent) throw new Error('grant state parent must remain canonical');
  const body = Buffer.from(`${JSON.stringify(value)}\n`);
  const tmp = join(parent, `.${prefix}-${process.pid}-${randomUUID()}`);
  let fd = null;
  try {
    fd = openSync(tmp, 'wx', 0o600);
    writeFileSync(fd, body);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    renameSync(tmp, path);
    const parentFd = openSync(parent, 'r');
    try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
  } finally {
    if (fd !== null) {
      try { closeSync(fd); } catch { }
    }
    try { unlinkSync(tmp); } catch { }
  }
  return body;
}

function createDenyLatch(gstackRoot, sessionId, reason) {
  const value = {
    schema_version: SCHEMA_VERSION,
    session_id: sidOf(sessionId),
    reason,
    created_at: new Date().toISOString(),
  };
  atomicWrite(denyLatchPath(gstackRoot, sessionId), value, 'read-deny');
  return value;
}

function removeOptional(path) {
  try { unlinkSync(path); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
}

function parseJsonBytes(raw, label) {
  if (raw === null) return null;
  let value;
  try { value = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error(`${label} is malformed`); }
  return value;
}

function validBindingShape(binding) {
  return binding === null || Boolean(
    binding
    && typeof binding.project === 'string' && binding.project
    && Number.isSafeInteger(binding.epoch) && binding.epoch > 0
    && typeof binding.realpath === 'string' && isAbsolute(binding.realpath)
    && Number.isFinite(binding.dev)
    && Number.isFinite(binding.ino)
  );
}

function canonicalBinding(binding, projectsRoot) {
  if (binding === null || binding === undefined) return null;
  if (!validBindingShape(binding)) throw new Error('binding shape is invalid');
  verifyProjectBinding(binding, projectsRoot);
  return {
    project: binding.project,
    epoch: Number(binding.epoch),
    realpath: binding.realpath,
    dev: Number(binding.dev),
    ino: Number(binding.ino),
  };
}

function sameBinding(a, b) {
  if (a === null || b === null) return a === b;
  return ['project', 'epoch', 'realpath', 'dev', 'ino'].every((field) => a?.[field] === b?.[field]);
}

function validateGrant(grant) {
  if (!grant || typeof grant.id !== 'string' || !grant.id) throw new Error('grant id is invalid');
  if (!LIFETIMES.has(grant.lifetime) || !KINDS.has(grant.kind)) throw new Error('grant kind/lifetime is invalid');
  if (!Array.isArray(grant.operations) || !grant.operations.length
      || grant.operations.some((op) => !OPERATIONS.has(op))) throw new Error('grant operations are invalid');
  if (!grant.authority || typeof grant.authority.turn_id !== 'string' || !grant.authority.turn_id
      || !Number.isSafeInteger(grant.authority.turn_generation) || grant.authority.turn_generation < 1
      || !/^[a-f0-9]{64}$/.test(grant.authority.prompt_sha256 || '')) throw new Error('grant authority is invalid');
  if (!isAbsolute(grant.requested_path || '') || !isAbsolute(grant.canonical_realpath || '')) {
    throw new Error('grant paths must be absolute');
  }
  if (!grant.project || typeof grant.project.name !== 'string' || !isAbsolute(grant.project.realpath || '')) {
    throw new Error('grant project identity is invalid');
  }
}

function validateGrantSet(value, sid) {
  if (!value || value.schema_version !== SCHEMA_VERSION || value.session_id !== sid
      || !Number.isSafeInteger(value.generation) || value.generation < 1
      || !validBindingShape(value.binding) || !Array.isArray(value.grants)) {
    throw new Error('read grant set is invalid');
  }
  value.grants.forEach(validateGrant);
  return value;
}

function validateWitness(value, sid) {
  if (!value || value.schema_version !== SCHEMA_VERSION || value.session_id !== sid
      || typeof value.turn_id !== 'string' || !value.turn_id
      || !Number.isSafeInteger(value.generation) || value.generation < 1
      || typeof value.open !== 'boolean') throw new Error('read turn witness is invalid');
  return value;
}

export function readGrantSet(gstackRoot, sessionId) {
  const sid = sidOf(sessionId);
  const raw = optionalBytes(grantSetPath(gstackRoot, sid));
  if (raw === null) return { raw: null, value: null };
  return { raw, value: validateGrantSet(parseJsonBytes(raw, 'read grant set'), sid) };
}

function readWitness(gstackRoot, sessionId) {
  const sid = sidOf(sessionId);
  const raw = optionalBytes(turnWitnessPath(gstackRoot, sid));
  if (raw === null) return { raw: null, value: null };
  return { raw, value: validateWitness(parseJsonBytes(raw, 'read turn witness'), sid) };
}

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function validateTarget(requestedPath, projectsRoot = PROJECTS_ROOT, expectedKind = null) {
  if (!isAbsolute(requestedPath || '')) throw new Error('grant target must be an absolute path');
  const lexicalParts = String(requestedPath).split(sep).slice(1);
  if (lexicalParts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('grant target must not contain dot, traversal, or empty path segments');
  }
  const rootInput = resolve(projectsRoot);
  const root = realpathSync(rootInput);
  const lexical = resolve(requestedPath);
  const lexicalBase = inside(lexical, rootInput) ? rootInput : inside(lexical, root) ? root : null;
  if (!lexicalBase || lexical === lexicalBase) throw new Error('grant target must be inside one project');
  const rel = relative(lexicalBase, lexical);
  const parts = rel.split(sep);
  const [project, ...tail] = parts;
  if (!project || tail.length === 0) throw new Error('project root grants are forbidden');
  if (tail[0] === '.git' || tail[0] === '.luca'
      || (tail[0] === '.claude' && String(tail[1] || '').startsWith('.session-'))) {
    throw new Error('control-plane paths cannot be granted');
  }
  const identity = canonicalProjectIdentity(project, root);
  let cursor = identity.realpath;
  for (const part of tail) {
    if (!part || part === '.' || part === '..') throw new Error('path traversal is forbidden');
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('symlink targets cannot be granted');
  }
  const canonical = realpathSync(cursor);
  if (!inside(canonical, identity.realpath) || canonical === identity.realpath) throw new Error('grant target escaped project');
  const stat = statSync(canonical);
  const kind = stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'special';
  if (kind === 'special') throw new Error('special files cannot be granted');
  if (expectedKind && kind !== expectedKind) throw new Error(`grant target must be a ${expectedKind}`);
  return {
    canonical,
    kind,
    project: { name: identity.project, realpath: identity.realpath, dev: identity.dev, ino: identity.ino },
  };
}

function directivePath(raw) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('grant path is missing');
  const quote = value[0];
  if (quote === '`' || quote === '"' || quote === "'") {
    if (value.length < 2 || value[value.length - 1] !== quote) throw new Error('quoted grant path is not closed');
    return value.slice(1, -1);
  }
  if (/\s/.test(value)) throw new Error('paths containing spaces must be quoted');
  return value;
}

function parseDirectives(prompt) {
  const directives = [];
  const hints = [];
  for (const line of String(prompt || '').split(/\r?\n/)) {
    const match = line.trim().match(DIRECTIVE);
    if (!match) continue;
    try {
      directives.push({
        lifetime: match[1] ? 'session' : 'turn',
        kind: match[2] ? 'directory' : 'file',
        requestedPath: directivePath(match[3]),
      });
    } catch (error) {
      hints.push(error.message);
    }
  }
  return { directives, hints };
}

function grantProjectStillValid(grant, projectsRoot) {
  try {
    const current = canonicalProjectIdentity(grant.project.name, projectsRoot);
    return ['realpath', 'dev', 'ino'].every((field) => current[field] === grant.project[field]);
  } catch { return false; }
}

export function reconcilePromptGrants({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  turnId,
  prompt,
  binding = null,
}) {
  const sid = sidOf(sessionId);
  const currentTurn = String(turnId || '');
  if (!currentTurn) throw new Error('turn id required');
  if (process.env.LUCA_READ_GRANTS_DISABLE === '1') {
    try { closeGrants({ gstackRoot, sessionId: sid, scope: 'session' }); } catch { }
    return { generation: 0, issued: [], hints: ['read grants disabled'] };
  }
  return withGrantStateLock(gstackRoot, sid, () => {
  const currentBinding = canonicalBinding(binding, projectsRoot);
  let previousSet = null;
  let previousWitness = null;
  try { previousSet = readGrantSet(gstackRoot, sid).value; } catch { }
  try { previousWitness = readWitness(gstackRoot, sid).value; } catch { }
  const generation = Math.max(previousSet?.generation || 0, previousWitness?.generation || 0) + 1;
  const kept = previousSet && sameBinding(previousSet.binding, currentBinding)
    ? previousSet.grants.filter((grant) => grant.lifetime === 'session' && grantProjectStillValid(grant, projectsRoot))
    : [];
  const { directives, hints } = parseDirectives(prompt);
  const issued = [];
  const grants = [...kept];
  const promptSha256 = createHash('sha256').update(String(prompt || '')).digest('hex');
  for (const directive of directives) {
    try {
      const target = validateTarget(directive.requestedPath, projectsRoot, directive.kind);
      if (currentBinding?.project === target.project.name) {
        hints.push(`${directive.requestedPath} belongs to the active project and needs no read grant`);
        continue;
      }
      const grant = {
        id: randomUUID(),
        authority: { turn_id: currentTurn, turn_generation: generation, prompt_sha256: promptSha256 },
        lifetime: directive.lifetime,
        kind: directive.kind,
        operations: directive.kind === 'file' ? ['read'] : ['read', 'list', 'search'],
        requested_path: directive.requestedPath,
        canonical_realpath: target.canonical,
        project: target.project,
        created_at: new Date().toISOString(),
      };
      grants.push(grant);
      issued.push({ id: grant.id, lifetime: grant.lifetime, kind: grant.kind, operations: grant.operations, path: grant.canonical_realpath });
    } catch (error) {
      hints.push(`${directive.requestedPath}: ${error.message}`);
    }
  }
  const nextSet = { schema_version: SCHEMA_VERSION, session_id: sid, generation, binding: currentBinding, grants };
  const nextWitness = { schema_version: SCHEMA_VERSION, session_id: sid, turn_id: currentTurn, generation, open: true };
  createDenyLatch(gstackRoot, sid, 'witness-publish-failed');
  try {
    atomicWrite(grantSetPath(gstackRoot, sid), nextSet, 'read-grants');
    atomicWrite(turnWitnessPath(gstackRoot, sid), nextWitness, 'read-turn');
    removeOptional(denyLatchPath(gstackRoot, sid));
  } catch (error) {
    throw error;
  }
  return { generation, issued, hints };
  });
}

function deny(reason) { return { allowed: false, reason }; }

export function authorizeRead({
  gstackRoot,
  projectsRoot = PROJECTS_ROOT,
  sessionId,
  turnId,
  binding = null,
  operation,
  toolName,
  targetPath,
  grantId,
}) {
  try {
    const sid = sidOf(sessionId);
    if (process.env.LUCA_READ_GRANTS_DISABLE === '1') return deny('read grants disabled');
    if (!OPERATIONS.has(operation)) return deny('operation is not read-only');
    if (existsSync(grantLockPath(gstackRoot, sid))) return deny('read grant state transaction is active or incomplete');
    if (existsSync(denyLatchPath(gstackRoot, sid))) return deny('read grant deny latch is active');
    const set = readGrantSet(gstackRoot, sid).value;
    const witness = readWitness(gstackRoot, sid).value;
    if (!set || !witness || !witness.open || set.generation !== witness.generation) return deny('turn witness is not active');
    if (turnId && String(turnId) !== witness.turn_id) return deny('turn id mismatch');
    const currentBinding = canonicalBinding(binding, projectsRoot);
    if (!sameBinding(set.binding, currentBinding)) return deny('project binding changed');
    const target = validateTarget(targetPath, projectsRoot, null);
    const candidates = set.grants.filter((grant) => (!grantId || grant.id === grantId) && grant.operations.includes(operation));
    for (const grant of candidates) {
      if (!grantProjectStillValid(grant, projectsRoot)) continue;
      if (grant.lifetime === 'turn'
          && (grant.authority.turn_id !== witness.turn_id || grant.authority.turn_generation !== witness.generation)) continue;
      if (grant.project.name !== target.project.name
          || grant.project.realpath !== target.project.realpath
          || grant.project.dev !== target.project.dev
          || grant.project.ino !== target.project.ino) continue;
      if (grant.kind === 'file') {
        if (operation === 'read' && target.kind === 'file' && target.canonical === grant.canonical_realpath) {
          return { allowed: true, grantId: grant.id, canonicalPath: target.canonical };
        }
        continue;
      }
      if (!inside(target.canonical, grant.canonical_realpath)) continue;
      if (operation === 'read' && target.kind !== 'file') continue;
      return { allowed: true, grantId: grant.id, canonicalPath: target.canonical };
    }
    return deny(`${toolName || 'tool'} has no matching read grant`);
  } catch (error) {
    return deny(String(error?.message || error));
  }
}

export function snapshotGrantTurn(gstackRoot, sessionId) {
  const witness = readWitness(gstackRoot, sessionId).value;
  if (!witness) return null;
  return { turnId: witness.turn_id, generation: witness.generation, open: witness.open };
}

export function closeGrants({ gstackRoot, sessionId, scope, generation, turnId }) {
  const sid = sidOf(sessionId);
  if (!['turn', 'session'].includes(scope)) throw new Error('scope must be turn or session');
  if (scope === 'turn' && (!Number.isSafeInteger(generation) || generation < 1 || !String(turnId || ''))) {
    throw new Error('turn close requires expected generation and turn id');
  }
  return withGrantStateLock(gstackRoot, sid, () => {
    const witness = readWitness(gstackRoot, sid).value;
    const set = readGrantSet(gstackRoot, sid).value;
    if (!witness && !set) return { revoked: 0, remaining: 0 };
    const before = set?.grants?.length || 0;
    if (scope === 'turn' && (witness?.generation !== generation || witness?.turn_id !== String(turnId))) {
      return { revoked: 0, remaining: before, stale: true };
    }
    createDenyLatch(gstackRoot, sid, 'witness-close-failed');
    if (witness?.open) {
      atomicWrite(turnWitnessPath(gstackRoot, sid), { ...witness, open: false }, 'read-turn-close');
    }
    if (scope === 'session') {
      removeOptional(grantSetPath(gstackRoot, sid));
      removeOptional(turnWitnessPath(gstackRoot, sid));
      removeOptional(denyLatchPath(gstackRoot, sid));
      return { revoked: before, remaining: 0 };
    }
    const remainingGrants = (set?.grants || []).filter((grant) => grant.lifetime === 'session');
    if (set) atomicWrite(grantSetPath(gstackRoot, sid), { ...set, grants: remainingGrants }, 'read-grants-close');
    removeOptional(denyLatchPath(gstackRoot, sid));
    return { revoked: before - remainingGrants.length, remaining: remainingGrants.length };
  });
}
