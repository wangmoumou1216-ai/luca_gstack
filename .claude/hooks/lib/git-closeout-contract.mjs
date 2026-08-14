import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { isAbsolute, join, resolve } from 'path';
import { withoutLocalGitEnv } from './git-env.mjs';
import { verifyHumanGateApproval } from './human-gate-contract.mjs';

export const LOCAL_DESCRIPTOR_SCHEMA = 'luca.git-local-closeout.v1';
export const REMOTE_DESCRIPTOR_SCHEMA = 'luca.git-remote-closeout.v1';
export const REMOTE_RECEIPT_SCHEMA = 'luca.git-remote-readback.v1';

const SHA1_RE = /^[a-f0-9]{40}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const PLAN_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REMOTE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const REF_RE = /^refs\/(?:heads|tags)\/[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/;
const ZERO_SHA1 = '0'.repeat(40);

export class GitCloseoutError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GitCloseoutError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new GitCloseoutError(code, message);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return sha256(Buffer.from(stable(value), 'utf8'));
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_DESCRIPTOR', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('INVALID_DESCRIPTOR', `${label} keys must be exactly: ${wanted.join(', ')}`);
  }
}

function canonicalInstant(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    fail('INVALID_DESCRIPTOR', `${label} must be canonical UTC date-time`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    fail('INVALID_DESCRIPTOR', `${label} is not a real canonical UTC date-time`);
  }
  return milliseconds;
}

function parseCanonicalJson(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('INVALID_DESCRIPTOR', `${label} is not valid JSON`);
  }
  if (!jsonBytes(value).equals(bytes)) fail('INVALID_DESCRIPTOR', `${label} is not canonical JSON`);
  return value;
}

function writeExclusive(path, value) {
  const target = resolve(path);
  writeFileSync(target, jsonBytes(value), { flag: 'wx', mode: 0o600 });
  return target;
}

function rawGit(repo, args, { env = {}, input } = {}) {
  return spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    env: { ...withoutLocalGitEnv(), ...env },
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function git(repo, args, options = {}) {
  const result = rawGit(repo, args, options);
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    fail('GIT_CLOSEOUT_REJECTED', `git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout;
}

export function repositoryIdentity(repo) {
  const root = realpathSync(git(resolve(repo), ['rev-parse', '--show-toplevel']).trim());
  let common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim();
  if (!isAbsolute(common)) common = resolve(root, common);
  common = realpathSync(common);
  const stat = lstatSync(common, { bigint: true });
  return {
    root,
    common_dir: common,
    common_dev: String(stat.dev),
    common_ino: String(stat.ino),
  };
}

function validateRepository(value) {
  exactKeys(value, ['root', 'common_dir', 'common_dev', 'common_ino'], 'repository');
  if (![value.root, value.common_dir].every((item) => typeof item === 'string' && isAbsolute(item))) {
    fail('INVALID_DESCRIPTOR', 'repository paths must be absolute');
  }
  if (![value.common_dev, value.common_ino].every((item) => typeof item === 'string' && /^\d+$/.test(item))) {
    fail('INVALID_DESCRIPTOR', 'repository identity must use decimal dev/ino strings');
  }
}

function sameRepository(left, right) {
  return left.root === right.root
    && left.common_dir === right.common_dir
    && left.common_dev === right.common_dev
    && left.common_ino === right.common_ino;
}

function treeEntry(repo, tree, path) {
  const output = git(repo, ['ls-tree', '-z', tree, '--', path]);
  if (!output) return { mode: '000000', blob: ZERO_SHA1 };
  const row = output.split('\0').filter(Boolean);
  if (row.length !== 1) fail('INVALID_DESCRIPTOR', `ambiguous tree entry for ${path}`);
  const tab = row[0].indexOf('\t');
  const meta = row[0].slice(0, tab).split(' ');
  if (tab < 0 || meta.length !== 3 || meta[1] !== 'blob' || !SHA1_RE.test(meta[2])) {
    fail('INVALID_DESCRIPTOR', `unsupported non-blob tree entry for ${path}`);
  }
  return { mode: meta[0], blob: meta[2] };
}

function indexEntry(repo, indexPath, path) {
  const output = git(repo, ['ls-files', '--stage', '-z', '--', path], { env: { GIT_INDEX_FILE: indexPath } });
  if (!output) return { mode: '000000', blob: ZERO_SHA1 };
  const rows = output.split('\0').filter(Boolean);
  if (rows.length !== 1) fail('BLOCKED_DIRTY_OVERLAP', `unmerged or ambiguous index entry for ${path}`);
  const tab = rows[0].indexOf('\t');
  const meta = rows[0].slice(0, tab).split(' ');
  if (tab < 0 || meta.length !== 3 || meta[2] !== '0' || !SHA1_RE.test(meta[1])) {
    fail('BLOCKED_DIRTY_OVERLAP', `unsupported index entry for ${path}`);
  }
  return { mode: meta[0], blob: meta[1] };
}

function buildExpectedIndex(repo, baseCommit, patchBytes) {
  const root = repositoryIdentity(repo).root;
  const temp = mkdtempSync(join(tmpdir(), 'git-closeout-index-'));
  const indexPath = join(temp, 'index');
  const patchPath = join(temp, 'approved.patch');
  writeFileSync(patchPath, patchBytes, { flag: 'wx', mode: 0o600 });
  try {
    git(root, ['read-tree', baseCommit], { env: { GIT_INDEX_FILE: indexPath } });
    git(root, ['apply', '--cached', '--check', '--whitespace=nowarn', patchPath], { env: { GIT_INDEX_FILE: indexPath } });
    git(root, ['apply', '--cached', '--whitespace=nowarn', patchPath], { env: { GIT_INDEX_FILE: indexPath } });
    const expectedTree = git(root, ['write-tree'], { env: { GIT_INDEX_FILE: indexPath } }).trim();
    const changed = git(root, ['diff-index', '--cached', '--name-only', '-z', baseCommit, '--'], { env: { GIT_INDEX_FILE: indexPath } })
      .split('\0').filter(Boolean).sort();
    if (changed.length === 0) fail('INVALID_DESCRIPTOR', 'approved patch produces no change');
    const changes = changed.map((path) => {
      const before = treeEntry(root, baseCommit, path);
      const after = indexEntry(root, indexPath, path);
      return {
        path,
        old_mode: before.mode,
        old_blob: before.blob,
        new_mode: after.mode,
        new_blob: after.blob,
      };
    });
    return { expectedTree, changes };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function validateChange(change) {
  exactKeys(change, ['path', 'old_mode', 'old_blob', 'new_mode', 'new_blob'], 'local change');
  if (typeof change.path !== 'string' || !change.path || change.path.startsWith('/') || change.path.includes('\0')) {
    fail('INVALID_DESCRIPTOR', 'local change path must be a non-empty repository-relative path');
  }
  if (![change.old_mode, change.new_mode].every((mode) => /^[0-7]{6}$/.test(mode))) fail('INVALID_DESCRIPTOR', 'invalid Git mode');
  if (![change.old_blob, change.new_blob].every((blob) => SHA1_RE.test(blob))) fail('INVALID_DESCRIPTOR', 'invalid blob id');
  if (change.old_blob === ZERO_SHA1 && change.new_blob === ZERO_SHA1) fail('INVALID_DESCRIPTOR', 'change cannot be absent on both sides');
}

export function validateLocalDescriptor(value) {
  exactKeys(value, [
    'schema_version', 'descriptor_id', 'plan_id', 'repository', 'base_commit', 'base_tree',
    'index_before_tree', 'patch_sha256', 'expected_index_tree', 'changes', 'created_at',
  ], 'local descriptor');
  if (value.schema_version !== LOCAL_DESCRIPTOR_SCHEMA) fail('INVALID_DESCRIPTOR', 'wrong local descriptor schema');
  if (typeof value.plan_id !== 'string' || !PLAN_RE.test(value.plan_id)) fail('INVALID_DESCRIPTOR', 'invalid plan_id');
  validateRepository(value.repository);
  for (const key of ['base_commit', 'base_tree', 'index_before_tree', 'expected_index_tree']) {
    if (!SHA1_RE.test(value[key])) fail('INVALID_DESCRIPTOR', `invalid ${key}`);
  }
  if (!SHA256_RE.test(value.patch_sha256)) fail('INVALID_DESCRIPTOR', 'invalid patch_sha256');
  canonicalInstant(value.created_at, 'created_at');
  if (!Array.isArray(value.changes) || value.changes.length === 0) fail('INVALID_DESCRIPTOR', 'changes must be non-empty');
  value.changes.forEach(validateChange);
  const paths = value.changes.map((item) => item.path);
  if (new Set(paths).size !== paths.length || paths.some((path, index) => index > 0 && paths[index - 1] >= path)) {
    fail('INVALID_DESCRIPTOR', 'changes must have unique paths in lexical order');
  }
  const body = { ...value };
  delete body.descriptor_id;
  if (value.descriptor_id !== `gld-${stableHash(body)}`) fail('INVALID_DESCRIPTOR', 'local descriptor_id content binding mismatch');
  return value;
}

export function prepareLocalDescriptor({ repo, patchBytes, planId, createdAt }) {
  if (!Buffer.isBuffer(patchBytes) || patchBytes.length === 0) fail('INVALID_DESCRIPTOR', 'patch bytes are required');
  const repository = repositoryIdentity(repo);
  const baseCommit = git(repository.root, ['rev-parse', 'HEAD^{commit}']).trim();
  const baseTree = git(repository.root, ['rev-parse', 'HEAD^{tree}']).trim();
  const actualIndex = git(repository.root, ['write-tree']).trim();
  if (actualIndex !== baseTree) fail('BLOCKED_DIRTY_OVERLAP', 'prepare-local requires an index identical to HEAD');
  const expected = buildExpectedIndex(repository.root, baseCommit, patchBytes);
  const body = {
    schema_version: LOCAL_DESCRIPTOR_SCHEMA,
    plan_id: planId,
    repository,
    base_commit: baseCommit,
    base_tree: baseTree,
    index_before_tree: actualIndex,
    patch_sha256: sha256(patchBytes),
    expected_index_tree: expected.expectedTree,
    changes: expected.changes,
    created_at: createdAt,
  };
  canonicalInstant(createdAt, 'created_at');
  if (typeof planId !== 'string' || !PLAN_RE.test(planId)) fail('INVALID_DESCRIPTOR', 'invalid plan_id');
  return validateLocalDescriptor({ schema_version: body.schema_version, descriptor_id: `gld-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) });
}

function assertLocalDescriptorMatches(repo, descriptor, patchBytes) {
  validateLocalDescriptor(descriptor);
  const repository = repositoryIdentity(repo);
  if (!sameRepository(repository, descriptor.repository)) fail('BLOCKED_DIRTY_OVERLAP', 'repository identity drift');
  if (sha256(patchBytes) !== descriptor.patch_sha256) fail('BLOCKED_DIRTY_OVERLAP', 'approved patch bytes drift');
  const head = git(repository.root, ['rev-parse', 'HEAD^{commit}']).trim();
  const tree = git(repository.root, ['rev-parse', 'HEAD^{tree}']).trim();
  if (head !== descriptor.base_commit || tree !== descriptor.base_tree || descriptor.index_before_tree !== descriptor.base_tree) {
    fail('BLOCKED_DIRTY_OVERLAP', 'local base HEAD/tree drift');
  }
  const expected = buildExpectedIndex(repository.root, descriptor.base_commit, patchBytes);
  if (expected.expectedTree !== descriptor.expected_index_tree || stable(expected.changes) !== stable(descriptor.changes)) {
    fail('BLOCKED_DIRTY_OVERLAP', 'descriptor does not match exact patch result');
  }
  return repository;
}

export function verifyLocalIndex({ repo, descriptor, patchBytes }) {
  const repository = assertLocalDescriptorMatches(repo, descriptor, patchBytes);
  let actual;
  try {
    actual = git(repository.root, ['write-tree']).trim();
  } catch (error) {
    fail('BLOCKED_DIRTY_OVERLAP', error.message);
  }
  if (actual !== descriptor.expected_index_tree) {
    fail('BLOCKED_DIRTY_OVERLAP', `index tree ${actual} is not approved tree ${descriptor.expected_index_tree}`);
  }
  const actualPaths = git(repository.root, ['diff', '--cached', '--name-only', '-z', descriptor.base_commit, '--'])
    .split('\0').filter(Boolean).sort();
  const expectedPaths = descriptor.changes.map((item) => item.path);
  if (stable(actualPaths) !== stable(expectedPaths)) fail('BLOCKED_DIRTY_OVERLAP', 'staged path set is not exact');
  const worktree = rawGit(repository.root, ['diff', '--quiet', '--', ...expectedPaths]);
  if (worktree.status === 1) fail('BLOCKED_DIRTY_OVERLAP', 'descriptor-owned path contains unstaged or unknown WIP');
  if (worktree.status !== 0) fail('BLOCKED_DIRTY_OVERLAP', 'cannot prove descriptor-owned worktree paths equal the approved index');
  return { index_tree: actual, paths: actualPaths };
}

export function verifyLocalCommit({ repo, descriptor, commit = 'HEAD' }) {
  validateLocalDescriptor(descriptor);
  const repository = repositoryIdentity(repo);
  if (!sameRepository(repository, descriptor.repository)) fail('BLOCKED_DIRTY_OVERLAP', 'repository identity drift');
  const oid = git(repository.root, ['rev-parse', `${commit}^{commit}`]).trim();
  const parents = git(repository.root, ['show', '-s', '--format=%P', oid]).trim().split(/\s+/).filter(Boolean);
  if (parents.length !== 1 || parents[0] !== descriptor.base_commit) fail('BLOCKED_DIRTY_OVERLAP', 'commit parent is not the approved base');
  const tree = git(repository.root, ['rev-parse', `${oid}^{tree}`]).trim();
  if (tree !== descriptor.expected_index_tree) fail('BLOCKED_DIRTY_OVERLAP', 'commit tree is not the approved index tree');
  const paths = git(repository.root, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', oid])
    .split('\0').filter(Boolean).sort();
  if (stable(paths) !== stable(descriptor.changes.map((item) => item.path))) fail('BLOCKED_DIRTY_OVERLAP', 'commit path set is not exact');
  return { commit: oid, tree, parent: parents[0], paths };
}

function parseRefspec(value) {
  if (typeof value !== 'string' || value.startsWith('+') || value.includes('*') || value.includes('^') || value.includes('~')) {
    fail('INVALID_DESCRIPTOR', 'refspec must be a non-force exact full refspec');
  }
  const parts = value.split(':');
  if (parts.length !== 2 || !REF_RE.test(parts[0]) || !REF_RE.test(parts[1])) {
    fail('INVALID_DESCRIPTOR', 'refspec must be <full-source-ref>:<full-destination-ref>');
  }
  return { source: parts[0], destination: parts[1] };
}

function remoteUrl(repo, remote) {
  if (typeof remote !== 'string' || !REMOTE_RE.test(remote)) fail('INVALID_DESCRIPTOR', 'explicit remote name is required');
  const result = rawGit(repo, ['remote', 'get-url', '--push', '--all', remote]);
  if (result.status !== 0) fail('REMOTE_DESCRIPTOR_REJECTED', `unknown remote ${remote}`);
  const urls = result.stdout.split(/\r?\n/).filter(Boolean);
  if (urls.length !== 1) fail('REMOTE_DESCRIPTOR_REJECTED', `remote ${remote} must have exactly one push URL`);
  return urls[0];
}

function liveRemoteOid(url, destination) {
  const result = spawnSync('git', ['ls-remote', '--refs', url, destination], {
    encoding: 'utf8',
    env: withoutLocalGitEnv(),
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) fail('REMOTE_DESCRIPTOR_REJECTED', `cannot read remote destination ${destination}`);
  const rows = result.stdout.split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) fail('REMOTE_DESCRIPTOR_REJECTED', `remote destination ${destination} must already exist exactly once`);
  const [oid, ref] = rows[0].split('\t');
  if (!SHA1_RE.test(oid) || ref !== destination) fail('REMOTE_DESCRIPTOR_REJECTED', 'remote read-back is malformed');
  return oid;
}

function exactCommitRange(repo, before, after) {
  const known = rawGit(repo, ['cat-file', '-e', `${before}^{commit}`]);
  if (known.status !== 0) fail('FETCH_REQUIRED', `remote before ${before} is not present locally; fetch the exact remote/ref first`);
  const ancestry = rawGit(repo, ['merge-base', '--is-ancestor', before, after]);
  if (ancestry.status !== 0) fail('NON_FAST_FORWARD', `${before} is not an ancestor of ${after}`);
  const range = git(repo, ['rev-list', '--reverse', '--topo-order', `${before}..${after}`]).split(/\r?\n/).filter(Boolean);
  if (range.length === 0 || range.at(-1) !== after || range.some((oid) => !SHA1_RE.test(oid))) {
    fail('REMOTE_DESCRIPTOR_REJECTED', 'exact commit range is empty or does not terminate at after');
  }
  return range;
}

export function validateRemoteDescriptor(value) {
  exactKeys(value, [
    'schema_version', 'descriptor_id', 'plan_id', 'repository', 'remote', 'url', 'refspec',
    'source_ref', 'destination_ref', 'before', 'after', 'commit_range', 'force',
    'created_at', 'expires_at',
  ], 'remote descriptor');
  if (value.schema_version !== REMOTE_DESCRIPTOR_SCHEMA) fail('INVALID_DESCRIPTOR', 'wrong remote descriptor schema');
  if (typeof value.plan_id !== 'string' || !PLAN_RE.test(value.plan_id)) fail('INVALID_DESCRIPTOR', 'invalid plan_id');
  validateRepository(value.repository);
  if (typeof value.remote !== 'string' || !REMOTE_RE.test(value.remote)) fail('INVALID_DESCRIPTOR', 'invalid remote name');
  if (typeof value.url !== 'string' || value.url.length === 0 || value.url.includes('\0')) fail('INVALID_DESCRIPTOR', 'invalid remote URL');
  const refs = parseRefspec(value.refspec);
  if (value.source_ref !== refs.source || value.destination_ref !== refs.destination) fail('INVALID_DESCRIPTOR', 'refspec fields disagree');
  if (![value.before, value.after].every((oid) => SHA1_RE.test(oid))) fail('INVALID_DESCRIPTOR', 'invalid before/after SHA');
  if (value.before === value.after) fail('INVALID_DESCRIPTOR', 'remote descriptor cannot publish an empty range');
  if (!Array.isArray(value.commit_range) || value.commit_range.length === 0 || value.commit_range.some((oid) => !SHA1_RE.test(oid))) {
    fail('INVALID_DESCRIPTOR', 'commit_range must be a non-empty SHA list');
  }
  if (new Set(value.commit_range).size !== value.commit_range.length || value.commit_range.at(-1) !== value.after) {
    fail('INVALID_DESCRIPTOR', 'commit_range must be ordered, unique, and terminate at after');
  }
  if (value.force !== false) fail('FORCE_FORBIDDEN', 'remote descriptor force must be false');
  const created = canonicalInstant(value.created_at, 'created_at');
  const expires = canonicalInstant(value.expires_at, 'expires_at');
  if (expires <= created) fail('INVALID_DESCRIPTOR', 'expires_at must be newer than created_at');
  const body = { ...value };
  delete body.descriptor_id;
  if (value.descriptor_id !== `grd-${stableHash(body)}`) fail('INVALID_DESCRIPTOR', 'remote descriptor_id content binding mismatch');
  return value;
}

export function prepareRemoteDescriptor({ repo, remote, refspec, planId, createdAt, expiresAt }) {
  const repository = repositoryIdentity(repo);
  const refs = parseRefspec(refspec);
  const url = remoteUrl(repository.root, remote);
  const before = liveRemoteOid(url, refs.destination);
  const after = git(repository.root, ['rev-parse', `${refs.source}^{commit}`]).trim();
  if (!SHA1_RE.test(after)) fail('REMOTE_DESCRIPTOR_REJECTED', 'source ref is not a commit');
  const commitRange = exactCommitRange(repository.root, before, after);
  const body = {
    schema_version: REMOTE_DESCRIPTOR_SCHEMA,
    plan_id: planId,
    repository,
    remote,
    url,
    refspec,
    source_ref: refs.source,
    destination_ref: refs.destination,
    before,
    after,
    commit_range: commitRange,
    force: false,
    created_at: createdAt,
    expires_at: expiresAt,
  };
  canonicalInstant(createdAt, 'created_at');
  canonicalInstant(expiresAt, 'expires_at');
  if (Date.parse(expiresAt) <= Date.now()) fail('REMOTE_DESCRIPTOR_REJECTED', 'remote descriptor is already expired');
  if (typeof planId !== 'string' || !PLAN_RE.test(planId)) fail('INVALID_DESCRIPTOR', 'invalid plan_id');
  return validateRemoteDescriptor({ schema_version: body.schema_version, descriptor_id: `grd-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) });
}

export function verifyRemotePre({ repo, descriptor }) {
  validateRemoteDescriptor(descriptor);
  if (Date.now() >= Date.parse(descriptor.expires_at)) fail('REMOTE_DESCRIPTOR_EXPIRED', 'remote descriptor expired');
  const repository = repositoryIdentity(repo);
  if (!sameRepository(repository, descriptor.repository)) fail('REMOTE_DESCRIPTOR_DRIFT', 'repository identity drift');
  const url = remoteUrl(repository.root, descriptor.remote);
  if (url !== descriptor.url) fail('REMOTE_DESCRIPTOR_DRIFT', 'remote URL changed');
  const refs = parseRefspec(descriptor.refspec);
  if (refs.source !== descriptor.source_ref || refs.destination !== descriptor.destination_ref) fail('REMOTE_DESCRIPTOR_DRIFT', 'refspec drift');
  const after = git(repository.root, ['rev-parse', `${descriptor.source_ref}^{commit}`]).trim();
  if (after !== descriptor.after) fail('REMOTE_DESCRIPTOR_DRIFT', 'source after SHA changed');
  const before = liveRemoteOid(url, descriptor.destination_ref);
  if (before === descriptor.after) fail('REMOTE_DESCRIPTOR_REPLAY', 'descriptor was already consumed by this remote state');
  if (before !== descriptor.before) fail('REMOTE_DESCRIPTOR_DRIFT', 'remote before SHA changed');
  const range = exactCommitRange(repository.root, before, after);
  if (stable(range) !== stable(descriptor.commit_range)) fail('REMOTE_DESCRIPTOR_DRIFT', 'exact commit range changed');
  return { remote: descriptor.remote, url, before, after, refspec: descriptor.refspec, commit_range: range, force: false };
}

export function validateRemoteReceipt(value) {
  exactKeys(value, [
    'schema_version', 'receipt_id', 'descriptor_id', 'descriptor_sha256', 'repository',
    'remote', 'url', 'refspec', 'source_ref', 'destination_ref', 'before', 'after',
    'commit_range', 'force', 'gate', 'gate_proposal_id', 'gate_proposal_sha256',
    'gate_binding_id', 'gate_binding_sha256', 'readback_sha256', 'observed_at',
  ], 'remote receipt');
  if (value.schema_version !== REMOTE_RECEIPT_SCHEMA) fail('INVALID_RECEIPT', 'wrong remote receipt schema');
  validateRepository(value.repository);
  if (typeof value.descriptor_id !== 'string' || !/^grd-[a-f0-9]{64}$/.test(value.descriptor_id)) fail('INVALID_RECEIPT', 'invalid descriptor_id');
  if (!SHA256_RE.test(value.descriptor_sha256) || !SHA256_RE.test(value.readback_sha256)) fail('INVALID_RECEIPT', 'invalid receipt hash');
  if (typeof value.remote !== 'string' || !REMOTE_RE.test(value.remote)) fail('INVALID_RECEIPT', 'invalid remote');
  if (typeof value.url !== 'string' || !value.url) fail('INVALID_RECEIPT', 'invalid URL');
  const refs = parseRefspec(value.refspec);
  if (refs.source !== value.source_ref || refs.destination !== value.destination_ref) fail('INVALID_RECEIPT', 'receipt refspec drift');
  if (![value.before, value.after].every((oid) => SHA1_RE.test(oid))) fail('INVALID_RECEIPT', 'invalid receipt SHA');
  if (!Array.isArray(value.commit_range) || value.commit_range.length === 0 || value.commit_range.some((oid) => !SHA1_RE.test(oid))) fail('INVALID_RECEIPT', 'invalid receipt range');
  if (value.commit_range.at(-1) !== value.after || value.force !== false) fail('INVALID_RECEIPT', 'receipt range/force is invalid');
  if (value.gate !== 'G-REMOTE' || !/^hgp-[a-f0-9]{64}$/.test(value.gate_proposal_id)
      || !/^hgb-[a-f0-9]{64}$/.test(value.gate_binding_id)
      || !SHA256_RE.test(value.gate_proposal_sha256) || !SHA256_RE.test(value.gate_binding_sha256)) {
    fail('INVALID_RECEIPT', 'receipt human-gate binding is invalid');
  }
  canonicalInstant(value.observed_at, 'observed_at');
  const body = { ...value };
  delete body.receipt_id;
  if (value.receipt_id !== `grr-${stableHash(body)}`) fail('INVALID_RECEIPT', 'receipt_id content binding mismatch');
  return value;
}

export function recordRemoteReadback({ repo, descriptor, descriptorBytes, observedAt, gateApproval }) {
  validateRemoteDescriptor(descriptor);
  if (!jsonBytes(descriptor).equals(descriptorBytes)) fail('INVALID_DESCRIPTOR', 'descriptor bytes are not canonical or exact');
  if (!gateApproval || gateApproval.proposal?.gate !== 'G-REMOTE'
      || !/^hgp-[a-f0-9]{64}$/.test(gateApproval.proposal?.proposal_id || '')
      || !/^hgb-[a-f0-9]{64}$/.test(gateApproval.binding?.binding_id || '')
      || !SHA256_RE.test(gateApproval.proposalSha256 || '') || !SHA256_RE.test(gateApproval.bindingSha256 || '')) {
    fail('REMOTE_READBACK_REJECTED', 'exact G-REMOTE approval link is required');
  }
  const repository = repositoryIdentity(repo);
  if (!sameRepository(repository, descriptor.repository)) fail('REMOTE_READBACK_REJECTED', 'repository identity drift');
  const url = remoteUrl(repository.root, descriptor.remote);
  if (url !== descriptor.url) fail('REMOTE_READBACK_REJECTED', 'remote URL changed');
  const live = liveRemoteOid(url, descriptor.destination_ref);
  if (live !== descriptor.after) fail('REMOTE_READBACK_REJECTED', `remote read-back ${live} does not equal ${descriptor.after}`);
  const readbackSha = stableHash({ url, destination_ref: descriptor.destination_ref, sha: live });
  canonicalInstant(observedAt, 'observed_at');
  const body = {
    schema_version: REMOTE_RECEIPT_SCHEMA,
    descriptor_id: descriptor.descriptor_id,
    descriptor_sha256: sha256(descriptorBytes),
    repository,
    remote: descriptor.remote,
    url,
    refspec: descriptor.refspec,
    source_ref: descriptor.source_ref,
    destination_ref: descriptor.destination_ref,
    before: descriptor.before,
    after: descriptor.after,
    commit_range: descriptor.commit_range,
    force: false,
    gate: 'G-REMOTE',
    gate_proposal_id: gateApproval.proposal.proposal_id,
    gate_proposal_sha256: gateApproval.proposalSha256,
    gate_binding_id: gateApproval.binding.binding_id,
    gate_binding_sha256: gateApproval.bindingSha256,
    readback_sha256: readbackSha,
    observed_at: observedAt,
  };
  return validateRemoteReceipt({ schema_version: body.schema_version, receipt_id: `grr-${stableHash(body)}`, ...Object.fromEntries(Object.entries(body).slice(1)) });
}

export function verifyRemotePost({ repo, descriptor, descriptorBytes, receipt, gateApproval }) {
  validateRemoteDescriptor(descriptor);
  validateRemoteReceipt(receipt);
  const expected = recordRemoteReadback({ repo, descriptor, descriptorBytes, observedAt: receipt.observed_at, gateApproval });
  if (stable(expected) !== stable(receipt)) fail('REMOTE_READBACK_REJECTED', 'remote receipt does not match live read-back');
  return { receipt_id: receipt.receipt_id, after: receipt.after, readback_sha256: receipt.readback_sha256 };
}

export function remoteExecutionToken(descriptorBytes, gateApproval) {
  if (!Buffer.isBuffer(descriptorBytes) || !gateApproval) fail('REMOTE_EXECUTOR_REQUIRED', 'controlled remote executor inputs are missing');
  return sha256(Buffer.from(stable({
    descriptor_sha256: sha256(descriptorBytes),
    proposal_sha256: gateApproval.proposalSha256,
    binding_sha256: gateApproval.bindingSha256,
    executor: 'git-closeout-execute-remote-v1',
  }), 'utf8'));
}

export function verifyPrePush({
  repo, descriptor, descriptorBytes, remoteName, remoteUrlArg, pushInput,
  gateRoot, proposalId, planBytes, envelopeBytes, writerPath, executionToken,
}) {
  const pre = verifyRemotePre({ repo, descriptor });
  if (remoteName !== descriptor.remote || remoteUrlArg !== descriptor.url) fail('REMOTE_DESCRIPTOR_DRIFT', 'pre-push remote name/URL does not match descriptor');
  const lines = String(pushInput || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) fail('REMOTE_DESCRIPTOR_REJECTED', 'pre-push requires exactly one ref update');
  const fields = lines[0].trim().split(/\s+/);
  if (fields.length !== 4) fail('REMOTE_DESCRIPTOR_REJECTED', 'pre-push update line is malformed');
  const [localRef, localOid, remoteRef, remoteOid] = fields;
  if (localRef !== descriptor.source_ref || localOid !== descriptor.after
      || remoteRef !== descriptor.destination_ref || remoteOid !== descriptor.before) {
    fail('REMOTE_DESCRIPTOR_DRIFT', 'pre-push ref update is not the exact approved refspec/before/after');
  }
  const gate = verifyHumanGateApproval({
    receiptRoot: gateRoot,
    secureWriterPath: resolve(writerPath),
    gate: 'G-REMOTE',
    proposalId,
    planBytes,
    payloadBytes: descriptorBytes,
    executionEnvelopeBytes: envelopeBytes,
  });
  if (executionToken !== remoteExecutionToken(descriptorBytes, gate)) {
    fail('REMOTE_EXECUTOR_REQUIRED', 'push was not launched by the controlled non-force executor');
  }
  return { ...pre, proposal_sha256: gate.proposalSha256, binding_sha256: gate.bindingSha256 };
}

export function readLocalDescriptor(path) {
  const bytes = readFileSync(resolve(path));
  return { bytes, value: validateLocalDescriptor(parseCanonicalJson(bytes, 'local descriptor')) };
}

export function readRemoteDescriptor(path) {
  const bytes = readFileSync(resolve(path));
  return { bytes, value: validateRemoteDescriptor(parseCanonicalJson(bytes, 'remote descriptor')) };
}

export function readRemoteReceipt(path) {
  const bytes = readFileSync(resolve(path));
  return { bytes, value: validateRemoteReceipt(parseCanonicalJson(bytes, 'remote receipt')) };
}

export { writeExclusive };
