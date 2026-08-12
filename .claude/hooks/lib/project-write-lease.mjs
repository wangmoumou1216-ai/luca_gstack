import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { createHash, randomUUID } from 'crypto';
import { hostname } from 'os';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import { PROJECTS_ROOT, canonicalProjectIdentity } from './project-substrate.mjs';

const LEASE_DIRECTORY = '.project-write-lease';
const OWNER_FILE = 'owner.json';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const OWNER_TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,180}$/;
const OWNER_KEYS = [
  'schema_version',
  'owner_token',
  'patch_hash',
  'inventory_hash',
  'transaction_nonce',
  'pid',
  'host',
  'acquired_at',
  'project',
  'project_path',
  'project_dev',
  'project_ino',
  'target_paths',
  'ancestor_vector',
  'lock_dev',
  'lock_ino',
  'owner_hash',
];

function fail(message, cause) {
  const error = new Error(`project write lease: ${message}`);
  if (cause !== undefined) error.cause = cause;
  return error;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function lstatIfPresent(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function numericIdentity(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw fail(`invalid ${label}`);
  return value;
}

function validateHash(value, label) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw fail(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function validateOwnerToken(value) {
  if (typeof value !== 'string' || !OWNER_TOKEN_PATTERN.test(value)) {
    throw fail('owner token is invalid');
  }
  return value;
}

function pathRelativeTo(root, candidate) {
  const value = relative(root, candidate);
  if (value === '') return '';
  if (value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) return null;
  return value;
}

function validateCanonicalAbsolutePath(rawPath, label) {
  if (typeof rawPath !== 'string' || rawPath.length === 0 || !isAbsolute(rawPath)) {
    throw fail(`${label} must be an absolute path`);
  }
  if (rawPath.includes('\0') || /[\r\n]/.test(rawPath)) {
    throw fail(`${label} contains a forbidden control character`);
  }
  if (resolve(rawPath) !== rawPath) {
    throw fail(`${label} must already be lexically canonical`);
  }
  return rawPath;
}

function targetIdentity(rawTargetPath, projectsRoot = PROJECTS_ROOT, allowProjectRoot = false) {
  const targetPath = validateCanonicalAbsolutePath(rawTargetPath, 'target path');
  const declaredRoot = resolve(projectsRoot);
  let physicalRoot;
  try {
    physicalRoot = realpathSync(declaredRoot);
  } catch (error) {
    throw fail(`cannot resolve projects root ${declaredRoot}`, error);
  }

  const physicalRelative = pathRelativeTo(physicalRoot, targetPath);
  const declaredRelative = pathRelativeTo(declaredRoot, targetPath);
  const targetRelative = physicalRelative ?? declaredRelative;
  if (targetRelative === null || targetRelative === '') {
    throw fail(`target is outside a physical project: ${targetPath}`);
  }

  const segments = targetRelative.split(sep);
  const project = segments.shift();
  if (
    !project
    || (!allowProjectRoot && segments.length === 0)
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw fail(`target does not name a file inside a project: ${targetPath}`);
  }

  let identity;
  try {
    identity = canonicalProjectIdentity(project, physicalRoot);
  } catch (error) {
    throw fail(`cannot establish physical identity for project ${project}`, error);
  }

  const canonicalTarget = join(identity.realpath, ...segments);
  const expectedSpelling = physicalRelative !== null
    ? canonicalTarget
    : join(declaredRoot, project, ...segments);
  if (targetPath !== expectedSpelling) {
    throw fail(`target is not the canonical project path: ${targetPath}`);
  }

  return {
    project: identity.project,
    projectPath: identity.realpath,
    projectDev: numericIdentity(identity.dev, 'project device'),
    projectIno: numericIdentity(identity.ino, 'project inode'),
    targetPath: canonicalTarget,
    relativeSegments: segments,
  };
}

function directoryEntry(path, stat) {
  return {
    path,
    dev: numericIdentity(stat.dev, 'directory device'),
    ino: numericIdentity(stat.ino, 'directory inode'),
    mode: numericIdentity(stat.mode, 'directory mode'),
  };
}

function inspectTarget(target) {
  const ancestors = [];
  const rootStat = lstatSync(target.projectPath);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw fail(`physical project root is not a real directory: ${target.projectPath}`);
  }
  ancestors.push(directoryEntry(target.projectPath, rootStat));

  let cursor = target.projectPath;
  for (let index = 0; index < target.relativeSegments.length; index += 1) {
    cursor = join(cursor, target.relativeSegments[index]);
    const stat = lstatIfPresent(cursor);
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      throw fail(`symlink or dangling symlink is forbidden in target ancestry: ${cursor}`);
    }

    const isLeaf = index === target.relativeSegments.length - 1;
    if (isLeaf) {
      if (!stat.isFile()) throw fail(`existing target is not a regular file: ${cursor}`);
      if (stat.nlink !== 1) throw fail(`existing target is hard-linked: ${cursor}`);
      break;
    }

    if (!stat.isDirectory()) {
      throw fail(`target ancestry contains a non-directory: ${cursor}`);
    }
    ancestors.push(directoryEntry(cursor, stat));
  }

  return ancestors;
}

function normalizeTargetPaths({ targetPath, targetPaths }) {
  const paths = targetPaths ?? (targetPath === undefined ? undefined : [targetPath]);
  if (!Array.isArray(paths) || paths.length === 0) {
    throw fail('at least one target path is required');
  }
  if (targetPath !== undefined && targetPaths !== undefined) {
    throw fail('provide targetPath or targetPaths, not both');
  }
  return paths;
}

function buildInventory(options) {
  const rawPaths = normalizeTargetPaths(options);
  const targets = rawPaths.map((path) => targetIdentity(path, options.projectsRoot));
  const first = targets[0];
  const seenTargets = new Set();
  const ancestors = new Map();

  for (const target of targets) {
    if (
      target.project !== first.project
      || target.projectPath !== first.projectPath
      || target.projectDev !== first.projectDev
      || target.projectIno !== first.projectIno
    ) {
      throw fail('one patch transaction cannot span physical projects');
    }
    if (seenTargets.has(target.targetPath)) {
      throw fail(`duplicate target in patch inventory: ${target.targetPath}`);
    }
    seenTargets.add(target.targetPath);

    for (const entry of inspectTarget(target)) {
      const prior = ancestors.get(entry.path);
      if (prior && JSON.stringify(prior) !== JSON.stringify(entry)) {
        throw fail(`directory identity changed while inventory was built: ${entry.path}`);
      }
      ancestors.set(entry.path, entry);
    }
  }

  return {
    project: first.project,
    projectPath: first.projectPath,
    projectDev: first.projectDev,
    projectIno: first.projectIno,
    targetPaths: targets.map((target) => target.targetPath),
    ancestorVector: [...ancestors.values()].sort((left, right) => (
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0
    )),
  };
}

function inventoryMaterial(owner) {
  return {
    project: owner.project,
    project_path: owner.project_path,
    project_dev: owner.project_dev,
    project_ino: owner.project_ino,
    target_paths: owner.target_paths,
    ancestor_vector: owner.ancestor_vector,
  };
}

function ownerMaterial(owner) {
  return {
    schema_version: owner.schema_version,
    owner_token: owner.owner_token,
    patch_hash: owner.patch_hash,
    inventory_hash: owner.inventory_hash,
    transaction_nonce: owner.transaction_nonce,
    pid: owner.pid,
    host: owner.host,
    acquired_at: owner.acquired_at,
    project: owner.project,
    project_path: owner.project_path,
    project_dev: owner.project_dev,
    project_ino: owner.project_ino,
    target_paths: owner.target_paths,
    ancestor_vector: owner.ancestor_vector,
    lock_dev: owner.lock_dev,
    lock_ino: owner.lock_ino,
  };
}

function validateAncestorVector(value, projectPath) {
  if (!Array.isArray(value) || value.length === 0) throw fail('owner ancestor vector is invalid');
  const seen = new Set();
  let previous = null;
  for (const entry of value) {
    const keys = Object.keys(entry ?? {}).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['dev', 'ino', 'mode', 'path'])) {
      throw fail('owner ancestor entry has an invalid shape');
    }
    validateCanonicalAbsolutePath(entry.path, 'ancestor path');
    if (pathRelativeTo(projectPath, entry.path) === null) {
      throw fail(`owner ancestor is outside its project: ${entry.path}`);
    }
    numericIdentity(entry.dev, 'ancestor device');
    numericIdentity(entry.ino, 'ancestor inode');
    numericIdentity(entry.mode, 'ancestor mode');
    if (seen.has(entry.path) || (previous !== null && previous >= entry.path)) {
      throw fail('owner ancestor vector is not uniquely sorted');
    }
    seen.add(entry.path);
    previous = entry.path;
  }
}

function validateOwner(owner) {
  if (!owner || typeof owner !== 'object' || Array.isArray(owner)) throw fail('owner record is invalid');
  if (JSON.stringify(Object.keys(owner).sort()) !== JSON.stringify([...OWNER_KEYS].sort())) {
    throw fail('owner record has an invalid shape');
  }
  if (owner.schema_version !== 1) throw fail('owner schema version is unsupported');
  validateOwnerToken(owner.owner_token);
  validateHash(owner.patch_hash, 'patch hash');
  validateHash(owner.inventory_hash, 'inventory hash');
  validateHash(owner.owner_hash, 'owner hash');
  if (typeof owner.transaction_nonce !== 'string' || !/^[0-9a-f-]{36}$/.test(owner.transaction_nonce)) {
    throw fail('owner transaction nonce is invalid');
  }
  if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw fail('owner pid is invalid');
  if (typeof owner.host !== 'string' || owner.host.length === 0 || /[\r\n\0]/.test(owner.host)) {
    throw fail('owner host is invalid');
  }
  if (typeof owner.acquired_at !== 'string' || Number.isNaN(Date.parse(owner.acquired_at))) {
    throw fail('owner acquisition time is invalid');
  }
  if (typeof owner.project !== 'string' || owner.project.length === 0) throw fail('owner project is invalid');
  validateCanonicalAbsolutePath(owner.project_path, 'owner project path');
  numericIdentity(owner.project_dev, 'owner project device');
  numericIdentity(owner.project_ino, 'owner project inode');
  numericIdentity(owner.lock_dev, 'owner lock device');
  numericIdentity(owner.lock_ino, 'owner lock inode');
  if (!Array.isArray(owner.target_paths) || owner.target_paths.length === 0) {
    throw fail('owner target inventory is empty');
  }
  const seenTargets = new Set();
  for (const targetPath of owner.target_paths) {
    validateCanonicalAbsolutePath(targetPath, 'owner target path');
    if (pathRelativeTo(owner.project_path, targetPath) === null || targetPath === owner.project_path) {
      throw fail(`owner target is outside its project: ${targetPath}`);
    }
    if (seenTargets.has(targetPath)) throw fail(`owner target is duplicated: ${targetPath}`);
    seenTargets.add(targetPath);
  }
  validateAncestorVector(owner.ancestor_vector, owner.project_path);

  if (sha256(JSON.stringify(inventoryMaterial(owner))) !== owner.inventory_hash) {
    throw fail('owner inventory hash mismatch');
  }
  if (sha256(JSON.stringify(ownerMaterial(owner))) !== owner.owner_hash) {
    throw fail('owner hash mismatch');
  }
  return owner;
}

function ownerBytes(owner) {
  validateOwner(owner);
  return Buffer.from(`${JSON.stringify(owner)}\n`, 'utf8');
}

function readExactOwner(lockPath) {
  const ownerPath = join(lockPath, OWNER_FILE);
  let raw;
  try {
    const stat = lstatSync(ownerPath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) {
      throw fail(`lease owner is not one exclusive regular file at ${ownerPath}`);
    }
    raw = readFileSync(ownerPath);
  } catch (error) {
    if (error?.message?.startsWith('project write lease:')) throw error;
    throw fail(`cannot read lease owner at ${ownerPath}`, error);
  }

  let owner;
  try {
    owner = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    throw fail(`lease owner is malformed at ${ownerPath}`, error);
  }
  const canonical = ownerBytes(owner);
  if (!raw.equals(canonical)) throw fail(`lease owner bytes are not canonical at ${ownerPath}`);
  return { owner, raw };
}

function assertRealDirectory(path, label) {
  const stat = lstatIfPresent(path);
  if (!stat) throw fail(`${label} does not exist: ${path}`);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw fail(`${label} is not a real directory: ${path}`);
  if (realpathSync(path) !== path) throw fail(`${label} is not physically canonical: ${path}`);
  return stat;
}

function fsyncDirectory(path) {
  const descriptor = openSync(path, 'r');
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function leasePaths(projectPath) {
  const lucaPath = join(projectPath, '.luca');
  return {
    lucaPath,
    lockPath: join(lucaPath, LEASE_DIRECTORY),
  };
}

function cleanupOwnIncompleteLease(lockPath, expectedOwnerBytes) {
  try {
    const entries = readdirSync(lockPath);
    if (entries.length === 0) {
      rmdirSync(lockPath);
      return;
    }
    if (entries.length !== 1 || entries[0] !== OWNER_FILE) return;
    const ownerPath = join(lockPath, OWNER_FILE);
    const stat = lstatSync(ownerPath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) return;
    if (expectedOwnerBytes && !readFileSync(ownerPath).equals(expectedOwnerBytes)) return;
    unlinkSync(ownerPath);
    rmdirSync(lockPath);
  } catch {
    // A partial or contested lease remains visible and therefore fails closed.
  }
}

function assertCurrentFilesystem(owner, projectsRoot) {
  let identity;
  try {
    identity = canonicalProjectIdentity(owner.project, projectsRoot);
  } catch (error) {
    throw fail(`cannot re-establish project identity for ${owner.project}`, error);
  }
  if (
    identity.realpath !== owner.project_path
    || identity.dev !== owner.project_dev
    || identity.ino !== owner.project_ino
  ) {
    throw fail(`physical project identity changed for ${owner.project}`);
  }

  for (const entry of owner.ancestor_vector) {
    const stat = lstatIfPresent(entry.path);
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
      throw fail(`frozen directory ancestry changed: ${entry.path}`);
    }
    if (stat.dev !== entry.dev || stat.ino !== entry.ino || stat.mode !== entry.mode) {
      throw fail(`frozen directory identity changed: ${entry.path}`);
    }
  }

  // Leaf inodes are intentionally not frozen. Shape validation still rejects a
  // symlink, hard link, or non-file after an atomic replacement.
  for (const targetPath of owner.target_paths) {
    const target = targetIdentity(targetPath, projectsRoot);
    if (
      target.project !== owner.project
      || target.projectPath !== owner.project_path
      || target.projectDev !== owner.project_dev
      || target.projectIno !== owner.project_ino
    ) {
      throw fail(`target changed physical project identity: ${targetPath}`);
    }
    inspectTarget(target);
  }
}

function validateHandle(handle) {
  if (!handle || typeof handle !== 'object' || Array.isArray(handle)) throw fail('lease handle is invalid');
  validateCanonicalAbsolutePath(handle.lock, 'lease lock path');
  validateOwner(handle.owner);
  return handle;
}

export function ownerTokenForPatch(sessionId, patchHash) {
  if (typeof sessionId !== 'string' || sessionId.length === 0 || /[\r\n\0]/.test(sessionId)) {
    throw fail('session id is invalid');
  }
  validateHash(patchHash, 'patch hash');
  return sha256(Buffer.from(`${sessionId}\0${patchHash}`, 'utf8'));
}

export function acquireProjectWriteLease({
  targetPath,
  targetPaths,
  patchHash,
  ownerToken,
  projectsRoot = PROJECTS_ROOT,
}) {
  validateHash(patchHash, 'patch hash');
  validateOwnerToken(ownerToken);
  const inventory = buildInventory({ targetPath, targetPaths, projectsRoot });
  const { lucaPath, lockPath } = leasePaths(inventory.projectPath);
  assertRealDirectory(lucaPath, 'project metadata directory');

  try {
    mkdirSync(lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      let detail = 'unreadable or incomplete owner';
      try {
        detail = `owner_hash=${readExactOwner(lockPath).owner.owner_hash}`;
      } catch {
        // The existing lock remains authoritative even when its owner is corrupt.
      }
      throw fail(`lease is already held for ${inventory.project} (${detail})`, error);
    }
    throw fail(`cannot create exclusive lease for ${inventory.project}`, error);
  }

  let expectedOwnerBytes;
  try {
    const lockStat = assertRealDirectory(lockPath, 'lease directory');
    const baseOwner = {
      schema_version: 1,
      owner_token: ownerToken,
      patch_hash: patchHash,
      inventory_hash: sha256(JSON.stringify({
        project: inventory.project,
        project_path: inventory.projectPath,
        project_dev: inventory.projectDev,
        project_ino: inventory.projectIno,
        target_paths: inventory.targetPaths,
        ancestor_vector: inventory.ancestorVector,
      })),
      transaction_nonce: randomUUID(),
      pid: process.pid,
      host: hostname(),
      acquired_at: new Date().toISOString(),
      project: inventory.project,
      project_path: inventory.projectPath,
      project_dev: inventory.projectDev,
      project_ino: inventory.projectIno,
      target_paths: inventory.targetPaths,
      ancestor_vector: inventory.ancestorVector,
      lock_dev: numericIdentity(lockStat.dev, 'lease device'),
      lock_ino: numericIdentity(lockStat.ino, 'lease inode'),
    };
    const owner = {
      ...baseOwner,
      owner_hash: sha256(JSON.stringify(baseOwner)),
    };
    expectedOwnerBytes = ownerBytes(owner);

    const ownerPath = join(lockPath, OWNER_FILE);
    const descriptor = openSync(ownerPath, 'wx', 0o600);
    try {
      writeFileSync(descriptor, expectedOwnerBytes);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    fsyncDirectory(lockPath);
    fsyncDirectory(lucaPath);
    const ownerHandle = { lock: lockPath, owner };
    assertProjectWriteLease(ownerHandle, projectsRoot);
    return { acquired: true, owner_handle: ownerHandle };
  } catch (error) {
    cleanupOwnIncompleteLease(lockPath, expectedOwnerBytes);
    throw fail(`lease acquisition failed for ${inventory.project}`, error);
  }
}

export function assertProjectWriteLease(handle, projectsRoot = PROJECTS_ROOT) {
  validateHandle(handle);
  const expectedLock = leasePaths(handle.owner.project_path).lockPath;
  if (handle.lock !== expectedLock) throw fail('lease handle points at the wrong lock directory');

  const lockStat = assertRealDirectory(handle.lock, 'lease directory');
  if (lockStat.dev !== handle.owner.lock_dev || lockStat.ino !== handle.owner.lock_ino) {
    throw fail('lease directory identity changed');
  }
  const current = readExactOwner(handle.lock);
  if (!current.raw.equals(ownerBytes(handle.owner))) throw fail('lease owner no longer matches its handle');
  assertCurrentFilesystem(current.owner, projectsRoot);
  return true;
}

export function projectWriteLeaseForPath(targetPath, projectsRoot = PROJECTS_ROOT) {
  const target = targetIdentity(targetPath, projectsRoot, true);
  const lockPath = leasePaths(target.projectPath).lockPath;
  const stat = lstatIfPresent(lockPath);
  if (!stat) return null;
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw fail(`lease path is not a real directory: ${lockPath}`);
  }
  const handle = { lock: lockPath, owner: readExactOwner(lockPath).owner };
  assertProjectWriteLease(handle, projectsRoot);
  if (
    handle.owner.project !== target.project
    || handle.owner.project_path !== target.projectPath
    || handle.owner.project_dev !== target.projectDev
    || handle.owner.project_ino !== target.projectIno
  ) {
    throw fail(`lease owner does not match target project: ${targetPath}`);
  }
  return handle;
}

export function releaseProjectWriteLease(handle, projectsRoot = PROJECTS_ROOT) {
  assertProjectWriteLease(handle, projectsRoot);
  const expectedOwnerBytes = ownerBytes(handle.owner);
  const { lucaPath } = leasePaths(handle.owner.project_path);
  const parkedPath = `${handle.lock}.released-${handle.owner.transaction_nonce}-${randomUUID()}`;

  try {
    renameSync(handle.lock, parkedPath);
  } catch (error) {
    throw fail('lease release could not reach its atomic commit point', error);
  }

  try {
    fsyncDirectory(lucaPath);
    const parkedStat = assertRealDirectory(parkedPath, 'released lease directory');
    if (parkedStat.dev !== handle.owner.lock_dev || parkedStat.ino !== handle.owner.lock_ino) {
      throw fail('released lease directory identity changed');
    }
    const entries = readdirSync(parkedPath);
    if (entries.length !== 1 || entries[0] !== OWNER_FILE) {
      throw fail('released lease directory contains unexpected entries');
    }
    const parkedOwner = readExactOwner(parkedPath);
    if (!parkedOwner.raw.equals(expectedOwnerBytes)) throw fail('released lease owner changed');
    unlinkSync(join(parkedPath, OWNER_FILE));
    rmdirSync(parkedPath);
    fsyncDirectory(lucaPath);
    return { released: true, owner_hash: handle.owner.owner_hash };
  } catch (error) {
    return {
      released: true,
      cleanup_required: true,
      parked_path: parkedPath,
      owner_hash: handle.owner.owner_hash,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export const queryProjectWriteLease = projectWriteLeaseForPath;
