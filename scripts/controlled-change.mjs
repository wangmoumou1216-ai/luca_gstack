#!/usr/bin/env node

import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export const NON_TERMINAL_WITNESS_STATES = new Set(['REQUIRED']);
export const TERMINAL_WITNESS_STATES = new Set(['VERIFIED', 'COMPLETED', 'ABORTED']);
export const RECEIPT_STATES = new Set(['PREPARED', 'APPLIED', 'VERIFIED', 'EFFECT_UNKNOWN', 'COMPLETED', 'ABORTED']);
export const ZERO_SHA256 = '-';

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA256_RE = /^[0-9a-f]{64}$/;
const OID_RE = /^[0-9a-f]{40}$/;
const TASK_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const U_ID_RE = /^U-[0-9]{3}(?:-[a-z])?$/;
const MODE_RE = /^(?:-|100644|100755|120000)$/;
const TYPES = new Set(['absent', 'file', 'symlink']);
const MUTATIONS = new Set(['add', 'modify', 'delete', 'symlink']);
const BOOTSTRAP_HEADER = [
  'plan_sha256', 'plan_recorded_baseline', 'observed_baseline', 'scope', 'path', 'action',
  'pre_type', 'pre_mode', 'pre_sha256', 'post_type', 'post_mode', 'post_sha256', 'patch_included',
];
const FRESH_BOOTSTRAP_GATE_SPECS = [
  {
    id: 'M6-A01',
    commands: [[process.execPath, 'scripts/test-controlled-change.mjs', '--all']],
  },
  {
    id: 'M6-A02',
    commands: [
      ['npm', 'run', 'check:hooks', '--silent'],
      [process.execPath, 'scripts/verify-codex-wiring.mjs'],
    ],
  },
];

function fail(message) {
  const error = new Error(message);
  error.code = 'CONTROLLED_CHANGE_INVALID';
  throw error;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

export function readJson(path, label = path) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { fail(`${label} is not readable JSON: ${error.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(`${label} must be a JSON object`);
  return parsed;
}

function git(repoRoot, args) {
  const result = spawnSync('/usr/bin/git', ['-C', repoRoot, ...args], { encoding: 'utf8' });
  if (result.status !== 0) fail(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  return String(result.stdout || '').trim();
}

export function repoRealpath(input = process.env.LUCA_CONTROLLED_REPO || MODULE_ROOT) {
  const top = git(resolve(input), ['rev-parse', '--show-toplevel']);
  return realpathSync(top);
}

export function gitCommonDirRealpath(repoRoot = repoRealpath()) {
  const common = git(repoRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return realpathSync(common);
}

export function currentHead(repoRoot = repoRealpath()) {
  return git(repoRoot, ['rev-parse', 'HEAD']);
}

export function controlRoot(repoRoot = repoRealpath()) {
  return join(gitCommonDirRealpath(repoRoot), 'luca-controlled-change');
}

export function stateDirFor(taskId, repoRoot = repoRealpath()) {
  if (!TASK_RE.test(String(taskId || ''))) fail(`invalid task_id: ${taskId}`);
  return join(controlRoot(repoRoot), taskId);
}

function assertExactKeys(object, required, optional, label) {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in object)) fail(`${label}.${key} is required`);
  for (const key of Object.keys(object)) if (!allowed.has(key)) fail(`${label}.${key} is not allowed`);
}

export function normalizeTuple(tuple, label = 'tuple') {
  if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple)) fail(`${label} must be an object`);
  assertExactKeys(tuple, ['type', 'mode', 'sha256'], [], label);
  if (!TYPES.has(tuple.type)) fail(`${label}.type is invalid`);
  if (!MODE_RE.test(String(tuple.mode))) fail(`${label}.mode is invalid`);
  if (tuple.type === 'absent') {
    if (tuple.mode !== '-' || tuple.sha256 !== ZERO_SHA256) fail(`${label} absent tuple must use mode=- and sha256=-`);
  } else {
    if (!SHA256_RE.test(String(tuple.sha256))) fail(`${label}.sha256 must be lowercase SHA-256`);
    if (tuple.type === 'symlink' && tuple.mode !== '120000') fail(`${label} symlink mode must be 120000`);
    if (tuple.type === 'file' && !['100644', '100755'].includes(tuple.mode)) fail(`${label} file mode must be 100644 or 100755`);
  }
  return { type: tuple.type, mode: tuple.mode, sha256: tuple.sha256 };
}

function validateRepoRelative(path, label) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\')) fail(`${label} must be a POSIX repo-relative path`);
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) fail(`${label} contains an unsafe segment`);
  if (path.includes('*') || path.includes('?') || path.includes('[')) fail(`${label} must not contain a glob`);
  return path;
}

function validateExternalAbsolute(path, label) {
  if (typeof path !== 'string' || !isAbsolute(path)) fail(`${label} must be absolute`);
  const normalized = resolve(path);
  if (normalized !== path || path.split('/').some((part) => part === '..' || part === '.')) fail(`${label} must be normalized`);
  return path;
}

function normalizePathRow(row, scope, index) {
  const label = `${scope}[${index}]`;
  if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`${label} must be an object`);
  assertExactKeys(row, ['path', 'mutation', 'preimage', 'postimage'], [], label);
  const path = scope === 'repo_paths' ? validateRepoRelative(row.path, `${label}.path`) : validateExternalAbsolute(row.path, `${label}.path`);
  if (!MUTATIONS.has(row.mutation)) fail(`${label}.mutation is invalid`);
  const preimage = normalizeTuple(row.preimage, `${label}.preimage`);
  const postimage = normalizeTuple(row.postimage, `${label}.postimage`);
  if (row.mutation === 'add' && preimage.type !== 'absent') fail(`${label} add requires absent preimage`);
  if (row.mutation === 'delete' && postimage.type !== 'absent') fail(`${label} delete requires absent postimage`);
  if (row.mutation === 'symlink' && postimage.type !== 'symlink') fail(`${label} symlink requires symlink postimage`);
  if (row.mutation === 'modify' && (preimage.type === 'absent' || postimage.type === 'absent')) fail(`${label} modify requires present tuples`);
  return { path, mutation: row.mutation, preimage, postimage };
}

function normalizeManifestMetadata(value, scratchRoot) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('manifest.metadata must be an object');
  assertExactKeys(value, [], ['patch_sha256', 'bootstrap'], 'manifest.metadata');
  const out = {};
  if (value.patch_sha256 !== undefined) {
    if (!SHA256_RE.test(String(value.patch_sha256))) fail('manifest.metadata.patch_sha256 must be lowercase SHA-256');
    out.patch_sha256 = value.patch_sha256;
  }
  if (value.bootstrap !== undefined) {
    const binding = value.bootstrap;
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) fail('manifest.metadata.bootstrap must be an object');
    assertExactKeys(binding, ['patch_path', 'patch_sha256', 'manifest_path', 'manifest_sha256'], [], 'manifest.metadata.bootstrap');
    const patchPath = validateExternalAbsolute(binding.patch_path, 'manifest.metadata.bootstrap.patch_path');
    const manifestPath = validateExternalAbsolute(binding.manifest_path, 'manifest.metadata.bootstrap.manifest_path');
    if (patchPath !== join(scratchRoot, 'BOOTSTRAP.patch')) fail('bootstrap patch_path must be the deterministic scratch BOOTSTRAP.patch');
    if (manifestPath !== join(scratchRoot, 'BOOTSTRAP-MANIFEST.tsv')) fail('bootstrap manifest_path must be the deterministic scratch BOOTSTRAP-MANIFEST.tsv');
    if (!SHA256_RE.test(String(binding.patch_sha256))) fail('manifest.metadata.bootstrap.patch_sha256 must be lowercase SHA-256');
    if (!SHA256_RE.test(String(binding.manifest_sha256))) fail('manifest.metadata.bootstrap.manifest_sha256 must be lowercase SHA-256');
    out.bootstrap = {
      patch_path: patchPath,
      patch_sha256: binding.patch_sha256,
      manifest_path: manifestPath,
      manifest_sha256: binding.manifest_sha256,
    };
  }
  return out;
}

export function validateManifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('manifest must be an object');
  const required = [
    'schema_version', 'task_id', 'u_id', 'repo_realpath', 'git_common_dir_realpath',
    'plan_sha256', 'plan_recorded_baseline', 'observed_baseline', 'session', 'scratch_root',
    'repo_paths', 'external_paths', 'mutation_classes', 'approved_effects', 'allowed_commands',
  ];
  const optional = ['dormant_until', 'expires_at', 'metadata'];
  assertExactKeys(input, required, optional, 'manifest');
  if (input.schema_version !== SCHEMA_VERSION) fail(`unsupported manifest schema_version: ${input.schema_version}`);
  if (!TASK_RE.test(String(input.task_id))) fail('manifest.task_id is invalid');
  if (!U_ID_RE.test(String(input.u_id))) fail('manifest.u_id is invalid');
  if (!SHA256_RE.test(String(input.plan_sha256))) fail('manifest.plan_sha256 is invalid');
  if (!OID_RE.test(String(input.plan_recorded_baseline))) fail('manifest.plan_recorded_baseline is invalid');
  if (!OID_RE.test(String(input.observed_baseline))) fail('manifest.observed_baseline is invalid');
  if (typeof input.session !== 'string' || !input.session.trim()) fail('manifest.session is required');
  const repo = realpathSync(input.repo_realpath);
  if (repo !== input.repo_realpath) fail('manifest.repo_realpath must be a realpath');
  const common = realpathSync(input.git_common_dir_realpath);
  if (common !== input.git_common_dir_realpath) fail('manifest.git_common_dir_realpath must be a realpath');
  if (!isAbsolute(input.scratch_root) || resolve(input.scratch_root) !== input.scratch_root) fail('manifest.scratch_root must be a normalized absolute path');
  const scratch = realpathSync(input.scratch_root);
  const scratchStat = lstatSync(input.scratch_root);
  if (scratch !== input.scratch_root || !scratchStat.isDirectory() || scratchStat.isSymbolicLink()) {
    fail('manifest.scratch_root must be an existing realpath directory');
  }
  if (inside(scratch, repo) || inside(repo, scratch)) {
    fail('manifest.scratch_root and manifest.repo_realpath must be disjoint in both directions');
  }
  if (input.dormant_until !== undefined && input.dormant_until !== 'fresh_bootstrap_pass') fail('manifest.dormant_until is invalid');
  const metadata = input.metadata === undefined ? undefined : normalizeManifestMetadata(input.metadata, scratch);
  if (input.dormant_until === 'fresh_bootstrap_pass' && !metadata?.bootstrap) {
    fail('dormant manifest requires exact bootstrap artifact bindings in metadata.bootstrap');
  }
  if (!Array.isArray(input.repo_paths) || !Array.isArray(input.external_paths)) fail('manifest path sets must be arrays');
  const repoPaths = input.repo_paths.map((row, i) => normalizePathRow(row, 'repo_paths', i));
  const externalPaths = input.external_paths.map((row, i) => normalizePathRow(row, 'external_paths', i));
  const allPaths = [...repoPaths.map((r) => `repo:${r.path}`), ...externalPaths.map((r) => `external:${r.path}`)];
  if (new Set(allPaths).size !== allPaths.length) fail('manifest contains duplicate paths');
  if (!Array.isArray(input.mutation_classes) || input.mutation_classes.some((v) => !MUTATIONS.has(v))) fail('manifest.mutation_classes is invalid');
  const used = new Set([...repoPaths, ...externalPaths].map((row) => row.mutation));
  for (const mutation of used) if (!input.mutation_classes.includes(mutation)) fail(`manifest mutation ${mutation} is not authorized`);
  for (const field of ['approved_effects', 'allowed_commands']) {
    if (!Array.isArray(input[field]) || input[field].some((v) => typeof v !== 'string' || !v)) fail(`manifest.${field} must be a string array`);
    if (new Set(input[field]).size !== input[field].length) fail(`manifest.${field} contains duplicates`);
  }
  if (input.expires_at !== undefined && (!Number.isInteger(input.expires_at) || input.expires_at <= 0)) fail('manifest.expires_at must be epoch milliseconds');
  return {
    schema_version: SCHEMA_VERSION,
    task_id: input.task_id,
    u_id: input.u_id,
    repo_realpath: repo,
    git_common_dir_realpath: common,
    plan_sha256: input.plan_sha256,
    plan_recorded_baseline: input.plan_recorded_baseline,
    observed_baseline: input.observed_baseline,
    session: input.session,
    scratch_root: scratch,
    repo_paths: repoPaths,
    external_paths: externalPaths,
    mutation_classes: [...input.mutation_classes],
    approved_effects: [...input.approved_effects],
    allowed_commands: [...input.allowed_commands],
    ...(input.dormant_until !== undefined ? { dormant_until: input.dormant_until } : {}),
    ...(input.expires_at !== undefined ? { expires_at: input.expires_at } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

export function manifestSha256(manifest) {
  return sha256Bytes(Buffer.from(canonicalJson(validateManifest(manifest)), 'utf8'));
}

function nearestExistingParent(path) {
  let cursor = path;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) fail(`cannot resolve parent for ${path}`);
    cursor = parent;
  }
  return realpathSync(cursor);
}

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export function absolutePathForRow(manifest, row, scope) {
  if (scope === 'external_paths') return row.path;
  const target = resolve(manifest.repo_realpath, row.path);
  if (!inside(target, manifest.repo_realpath)) fail(`repo path escapes root: ${row.path}`);
  const parentReal = nearestExistingParent(dirname(target));
  if (!inside(parentReal, manifest.repo_realpath)) fail(`repo path parent escapes through symlink: ${row.path}`);
  return target;
}

export function pathTuple(path) {
  let stat;
  try { stat = lstatSync(path); }
  catch (error) {
    if (error.code === 'ENOENT') return { type: 'absent', mode: '-', sha256: ZERO_SHA256 };
    throw error;
  }
  if (stat.isSymbolicLink()) return { type: 'symlink', mode: '120000', sha256: sha256Bytes(Buffer.from(readlinkSync(path), 'utf8')) };
  if (!stat.isFile()) fail(`unsupported target type at ${path}`);
  return { type: 'file', mode: (stat.mode & 0o111) ? '100755' : '100644', sha256: sha256File(path) };
}

export function tupleEqual(a, b) {
  return a.type === b.type && a.mode === b.mode && a.sha256 === b.sha256;
}

export function checkBaseline(manifest) {
  const actualRepo = repoRealpath(manifest.repo_realpath);
  if (actualRepo !== manifest.repo_realpath) fail(`repo realpath drift: ${actualRepo}`);
  const actualCommon = gitCommonDirRealpath(actualRepo);
  if (actualCommon !== manifest.git_common_dir_realpath) fail(`git common dir drift: ${actualCommon}`);
  const actualHead = currentHead(actualRepo);
  if (actualHead !== manifest.observed_baseline) fail(`baseline HEAD drift: expected ${manifest.observed_baseline}, got ${actualHead}`);
  return actualHead;
}

export function checkManifest(manifestInput, phase = 'pre') {
  const manifest = validateManifest(manifestInput);
  if (!['pre', 'post'].includes(phase)) fail(`invalid check phase: ${phase}`);
  checkBaseline(manifest);
  const mismatches = [];
  for (const [scope, rows] of [['repo_paths', manifest.repo_paths], ['external_paths', manifest.external_paths]]) {
    for (const row of rows) {
      const path = absolutePathForRow(manifest, row, scope);
      const actual = pathTuple(path);
      const expected = phase === 'pre' ? row.preimage : row.postimage;
      if (!tupleEqual(actual, expected)) mismatches.push({ scope, path: row.path, expected, actual });
    }
  }
  if (mismatches.length) fail(`${phase}image CAS mismatch: ${JSON.stringify(mismatches)}`);
  return { ok: true, phase, checked: manifest.repo_paths.length + manifest.external_paths.length };
}

function assertRegularArtifact(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular non-symlink file`);
  if (realpathSync(path) !== path) fail(`${label} must be addressed by its realpath`);
}

function parseBootstrapManifest(path, manifest) {
  const source = readFileSync(path, 'utf8');
  if (!source.endsWith('\n')) fail('bootstrap manifest must end with LF');
  const lines = source.slice(0, -1).split('\n');
  if (lines.length < 2) fail('bootstrap manifest must contain a header and at least one row');
  const header = lines.shift().split('\t');
  if (canonicalJson(header) !== canonicalJson(BOOTSTRAP_HEADER)) fail('bootstrap manifest header mismatch');
  const rows = [];
  const seen = new Set();
  for (const [index, line] of lines.entries()) {
    const fields = line.split('\t');
    if (fields.length !== BOOTSTRAP_HEADER.length) fail(`bootstrap manifest row ${index + 1} field count mismatch`);
    const row = Object.fromEntries(BOOTSTRAP_HEADER.map((name, fieldIndex) => [name, fields[fieldIndex]]));
    if (row.plan_sha256 !== manifest.plan_sha256) fail(`bootstrap manifest row ${index + 1} plan SHA mismatch`);
    if (row.plan_recorded_baseline !== manifest.plan_recorded_baseline) fail(`bootstrap manifest row ${index + 1} plan baseline mismatch`);
    if (row.observed_baseline !== manifest.observed_baseline) fail(`bootstrap manifest row ${index + 1} observed baseline mismatch`);
    if (row.scope !== 'repo') fail(`bootstrap manifest row ${index + 1} scope must be repo`);
    const repoPath = validateRepoRelative(row.path, `bootstrap manifest row ${index + 1} path`);
    if (seen.has(repoPath)) fail(`bootstrap manifest duplicate path: ${repoPath}`);
    seen.add(repoPath);
    if (!['add', 'modify', 'delete', 'noop'].includes(row.action)) fail(`bootstrap manifest row ${index + 1} action is invalid`);
    const preimage = normalizeTuple({ type: row.pre_type, mode: row.pre_mode, sha256: row.pre_sha256 }, `bootstrap manifest row ${index + 1} preimage`);
    const postimage = normalizeTuple({ type: row.post_type, mode: row.post_mode, sha256: row.post_sha256 }, `bootstrap manifest row ${index + 1} postimage`);
    if (row.action === 'add' && (preimage.type !== 'absent' || postimage.type === 'absent')) fail(`bootstrap manifest add row ${repoPath} is invalid`);
    if (row.action === 'delete' && (preimage.type === 'absent' || postimage.type !== 'absent')) fail(`bootstrap manifest delete row ${repoPath} is invalid`);
    if (row.action === 'modify' && (preimage.type === 'absent' || postimage.type === 'absent' || tupleEqual(preimage, postimage))) fail(`bootstrap manifest modify row ${repoPath} is invalid`);
    if (row.action === 'noop' && !tupleEqual(preimage, postimage)) fail(`bootstrap manifest noop row ${repoPath} is invalid`);
    const expectedPatchFlag = row.action === 'noop' ? 'no' : 'yes';
    if (row.patch_included !== expectedPatchFlag) fail(`bootstrap manifest row ${repoPath} patch_included mismatch`);
    rows.push({ path: repoPath, action: row.action, preimage, postimage, patch_included: row.patch_included });
  }
  const paths = rows.map((row) => row.path);
  const sorted = [...paths].sort();
  if (canonicalJson(paths) !== canonicalJson(sorted)) fail('bootstrap manifest paths must be C-locale sorted');
  return rows;
}

export function verifyBootstrapArtifacts(manifestInput) {
  const manifest = validateManifest(manifestInput);
  const binding = manifest.metadata?.bootstrap;
  if (!binding) fail('manifest lacks metadata.bootstrap artifact bindings');
  assertRegularArtifact(binding.patch_path, 'bootstrap patch');
  assertRegularArtifact(binding.manifest_path, 'bootstrap manifest');
  const patchSha256 = sha256File(binding.patch_path);
  const bootstrapManifestSha256 = sha256File(binding.manifest_path);
  if (patchSha256 !== binding.patch_sha256) fail('bootstrap patch bytes do not match dormant manifest binding');
  if (bootstrapManifestSha256 !== binding.manifest_sha256) fail('bootstrap manifest bytes do not match dormant manifest binding');
  checkBaseline(manifest);
  const rows = parseBootstrapManifest(binding.manifest_path, manifest);
  const patchSource = readFileSync(binding.patch_path, 'utf8');
  const patchPaths = [...patchSource.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].map((match) => {
    if (match[1] !== match[2]) fail('bootstrap patch rename is outside approved bootstrap semantics');
    return validateRepoRelative(match[1], 'bootstrap patch path');
  });
  const expectedPatchPaths = rows.filter((row) => row.patch_included === 'yes').map((row) => row.path);
  if (canonicalJson(patchPaths) !== canonicalJson(expectedPatchPaths)) fail('bootstrap patch path set does not match bootstrap manifest');
  for (const row of rows) {
    const actual = pathTuple(resolve(manifest.repo_realpath, row.path));
    if (!tupleEqual(actual, row.postimage)) {
      fail(`bootstrap postimage drift for ${row.path}: expected ${canonicalJson(row.postimage)}, got ${canonicalJson(actual)}`);
    }
  }
  const hooks = rows.find((row) => row.path === '.codex/hooks.json');
  if (hooks && (hooks.action !== 'noop' || !tupleEqual(hooks.preimage, hooks.postimage))) {
    fail('.codex/hooks.json bootstrap row must remain an exact no-op to preserve trust bytes');
  }
  const postimageSetSha256 = sha256Bytes(Buffer.from(canonicalJson(rows.map((row) => ({
    path: row.path,
    postimage: row.postimage,
  }))), 'utf8'));
  return {
    plan_sha256: manifest.plan_sha256,
    plan_recorded_baseline: manifest.plan_recorded_baseline,
    observed_baseline: manifest.observed_baseline,
    repo_realpath: manifest.repo_realpath,
    bootstrap_patch_path: binding.patch_path,
    bootstrap_patch_sha256: patchSha256,
    bootstrap_manifest_path: binding.manifest_path,
    bootstrap_manifest_sha256: bootstrapManifestSha256,
    postimage_set_sha256: postimageSetSha256,
    checked_postimages: rows.length,
  };
}

function validateFreshBootstrapGates(gates) {
  if (!Array.isArray(gates) || gates.length !== FRESH_BOOTSTRAP_GATE_SPECS.length) fail('fresh bootstrap receipt gates are incomplete');
  for (const [index, expected] of FRESH_BOOTSTRAP_GATE_SPECS.entries()) {
    const gate = gates[index];
    if (!gate || gate.id !== expected.id || gate.state !== 'PASS' || !Array.isArray(gate.commands) || gate.commands.length !== expected.commands.length) {
      fail(`fresh bootstrap receipt gate ${expected.id} is invalid`);
    }
    for (const [commandIndex, expectedArgv] of expected.commands.entries()) {
      const command = gate.commands[commandIndex];
      if (!command || canonicalJson(command.argv) !== canonicalJson(expectedArgv)
        || command.exit_status !== 0 || !SHA256_RE.test(String(command.output_sha256 || ''))) {
        fail(`fresh bootstrap receipt gate ${expected.id} command ${commandIndex + 1} is invalid`);
      }
    }
  }
}

export function assertFreshBootstrapReceipt(manifestInput, receiptPath) {
  const manifest = validateManifest(manifestInput);
  const expected = verifyBootstrapArtifacts(manifest);
  const path = validateExternalAbsolute(receiptPath, 'fresh bootstrap receipt path');
  if (path !== join(manifest.scratch_root, 'fresh-bootstrap-receipt.json')) fail('fresh bootstrap receipt path must be deterministic inside scratch_root');
  assertRegularArtifact(path, 'fresh bootstrap receipt');
  const receipt = readJson(path, 'fresh bootstrap receipt');
  assertExactKeys(receipt, [
    'schema_version', 'gate', 'state', 'plan_sha256', 'plan_recorded_baseline', 'observed_baseline',
    'repo_realpath', 'bootstrap_patch_path', 'bootstrap_patch_sha256', 'bootstrap_manifest_path',
    'bootstrap_manifest_sha256', 'postimage_set_sha256', 'checked_postimages', 'gates', 'verified_at',
  ], [], 'fresh bootstrap receipt');
  if (receipt.schema_version !== 1 || receipt.gate !== 'fresh-bootstrap' || receipt.state !== 'VERIFIED') fail('fresh bootstrap receipt state is invalid');
  for (const [field, value] of Object.entries(expected)) {
    if (receipt[field] !== value) fail(`fresh bootstrap receipt ${field} mismatch`);
  }
  if (!Number.isInteger(receipt.verified_at) || receipt.verified_at <= 0) fail('fresh bootstrap receipt verified_at is invalid');
  validateFreshBootstrapGates(receipt.gates);
  const gates = runFreshBootstrapGates(manifest.repo_realpath);
  const after = verifyBootstrapArtifacts(manifest);
  if (canonicalJson(expected) !== canonicalJson(after)) fail('bootstrap artifacts or postimages drifted while activation gates reran');
  if (canonicalJson(gates) !== canonicalJson(receipt.gates)) {
    fail('fresh bootstrap receipt gate outputs do not match a current exact gate rerun');
  }
  return { receipt, expected: after };
}

function runFreshBootstrapGates(repoRoot) {
  return FRESH_BOOTSTRAP_GATE_SPECS.map((gate) => ({
    id: gate.id,
    state: 'PASS',
    commands: gate.commands.map((argv) => {
      const result = spawnSync(argv[0], argv.slice(1), {
        cwd: repoRoot,
        env: { ...process.env, LUCA_CONTROLLED_FRESH_GATE: '1' },
        encoding: 'utf8',
        timeout: 300000,
        maxBuffer: 64 * 1024 * 1024,
      });
      const output = `${result.stdout || ''}${result.stderr || ''}`;
      if (result.error || result.status !== 0) fail(`fresh bootstrap gate ${gate.id} failed: ${result.error?.message || output.trim() || `status ${result.status}`}`);
      return { argv, exit_status: 0, output_sha256: sha256Bytes(Buffer.from(output, 'utf8')) };
    }),
  }));
}

export function produceFreshBootstrapReceipt(manifestInput, outputPath, verifiedAt = Date.now()) {
  const manifest = validateManifest(manifestInput);
  if (manifest.dormant_until !== 'fresh_bootstrap_pass') fail('fresh bootstrap receipt requires a dormant manifest');
  if (!Number.isInteger(verifiedAt) || verifiedAt <= 0) fail('fresh bootstrap receipt verified_at is invalid');
  const path = validateExternalAbsolute(outputPath, 'fresh bootstrap receipt output');
  if (path !== join(manifest.scratch_root, 'fresh-bootstrap-receipt.json')) fail('fresh bootstrap receipt output must be deterministic inside scratch_root');
  if (existsSync(path)) fail('fresh bootstrap receipt output already exists; refusing to trust or overwrite it');
  const before = verifyBootstrapArtifacts(manifest);
  const gates = runFreshBootstrapGates(manifest.repo_realpath);
  const after = verifyBootstrapArtifacts(manifest);
  if (canonicalJson(before) !== canonicalJson(after)) fail('bootstrap artifacts or postimages drifted while fresh gates ran');
  const receipt = {
    schema_version: 1,
    gate: 'fresh-bootstrap',
    state: 'VERIFIED',
    ...after,
    gates,
    verified_at: verifiedAt,
  };
  const receiptSha256 = atomicWriteJson(path, receipt, { expectedSha256: ZERO_SHA256 });
  return { receipt_path: path, receipt_sha256: receiptSha256, ...receipt };
}

function fsyncDirectory(path) {
  let fd;
  try { fd = openSync(path, 'r'); fsyncSync(fd); }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function atomicWriteJson(path, value, options = {}) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  if (options.expectedSha256 !== undefined) {
    const actual = existsSync(path) ? sha256File(path) : ZERO_SHA256;
    if (actual !== options.expectedSha256) fail(`state CAS mismatch for ${path}: expected ${options.expectedSha256}, got ${actual}`);
  }
  const body = `${canonicalJson(value)}\n`;
  const temp = join(dirname(path), `.${process.pid}.${Date.now()}.${sha256Bytes(body).slice(0, 12)}.tmp`);
  let fd;
  try {
    fd = openSync(temp, 'wx', options.mode ?? 0o600);
    writeFileSync(fd, body, 'utf8');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  renameSync(temp, path);
  fsyncDirectory(dirname(path));
  return sha256File(path);
}

export function unlinkJsonCas(path, expectedSha256) {
  if (!existsSync(path)) fail(`state file missing: ${path}`);
  const actual = sha256File(path);
  if (actual !== expectedSha256) fail(`state unlink CAS mismatch for ${path}`);
  unlinkSync(path);
  fsyncDirectory(dirname(path));
}

export function witnessAnchor(witness) {
  const identity = {
    schema_version: witness.schema_version,
    task_id: witness.task_id,
    state: witness.state,
    u_id: witness.u_id,
    generation: witness.generation,
    plan_sha256: witness.plan_sha256,
    manifest_sha256: witness.manifest_sha256,
    repo_realpath: witness.repo_realpath,
    expires_at: witness.expires_at,
  };
  return sha256Bytes(Buffer.from(canonicalJson(identity), 'utf8'));
}

function validateEffectAuthorizations(witness, manifest) {
  if (!Array.isArray(witness.effect_authorizations)) fail('required witness effect_authorizations must be an array');
  const tokens = new Set();
  for (const [index, item] of witness.effect_authorizations.entries()) {
    const label = `required witness effect_authorizations[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail(`${label} must be an object`);
    assertExactKeys(item, [
      'effect', 'gate', 'command_sha256', 'repo_realpath', 'cwd_realpath',
      'token', 'authorized_at', 'remaining_uses',
    ], ['consumed_at', 'outcome'], label);
    if (!manifest.approved_effects.includes(item.effect)) fail(`${label}.effect is absent from manifest approved_effects`);
    if (typeof item.gate !== 'string' || !item.gate.trim()) fail(`${label}.gate is required`);
    if (!SHA256_RE.test(String(item.command_sha256 || ''))) fail(`${label}.command_sha256 must be lowercase SHA-256`);
    if (item.repo_realpath !== manifest.repo_realpath || item.cwd_realpath !== manifest.repo_realpath) {
      fail(`${label} must bind the exact manifest repo identity and cwd`);
    }
    if (!TASK_RE.test(String(item.token || ''))) fail(`${label}.token is invalid`);
    if (tokens.has(item.token)) fail('required witness contains duplicate effect authorization tokens');
    tokens.add(item.token);
    if (!Number.isInteger(item.authorized_at) || item.authorized_at <= 0) fail(`${label}.authorized_at is invalid`);
    if (![0, 1].includes(item.remaining_uses)) fail(`${label}.remaining_uses must be zero or one`);
    if (item.remaining_uses === 1 && (item.consumed_at !== undefined || item.outcome !== undefined)) {
      fail(`${label} unused authorization must not have consumption fields`);
    }
    if (item.remaining_uses === 0) {
      if (!Number.isInteger(item.consumed_at) || item.consumed_at <= 0) fail(`${label}.consumed_at is invalid`);
      if (item.outcome !== 'EFFECT_UNKNOWN') fail(`${label}.outcome must remain EFFECT_UNKNOWN until human reconciliation`);
    }
  }
}

export function validateBoundRequired(witness, active, now = Date.now()) {
  if (!witness || !active) fail('required witness and active context are both required');
  if (witness.schema_version !== SCHEMA_VERSION || active.schema_version !== SCHEMA_VERSION) fail('state schema mismatch');
  if (!NON_TERMINAL_WITNESS_STATES.has(witness.state)) fail(`witness is not non-terminal: ${witness.state}`);
  for (const field of ['task_id', 'u_id', 'generation', 'plan_sha256', 'manifest_sha256', 'repo_realpath', 'expires_at']) {
    if (witness[field] !== active[field]) fail(`state binding mismatch: ${field}`);
  }
  if (!Number.isInteger(witness.expires_at) || witness.expires_at <= now) fail('controlled context is stale');
  const anchor = witnessAnchor(witness);
  if (active.witness_anchor_sha256 !== anchor) fail('active context does not bind the witness anchor');
  if (witness.active_context_sha256 !== sha256Bytes(Buffer.from(`${canonicalJson(active)}\n`, 'utf8'))) fail('witness does not bind active-context bytes');
  const manifest = validateManifest(active.manifest);
  if (manifestSha256(manifest) !== witness.manifest_sha256) fail('active manifest SHA mismatch');
  if (manifest.plan_sha256 !== witness.plan_sha256 || manifest.task_id !== witness.task_id || manifest.u_id !== witness.u_id) fail('active manifest identity mismatch');
  if ('effect_authorizations' in active) fail('effect authorizations must not mutate the active-context anchor');
  validateEffectAuthorizations(witness, manifest);
  return { witness, active, manifest, anchor };
}

function receiptMatchesTerminal(witness, receipt) {
  if (!receipt || !Array.isArray(receipt.history) || receipt.task_id !== witness.task_id) return false;
  if (witness.receipt_sha256 !== sha256Bytes(Buffer.from(`${canonicalJson(receipt)}\n`, 'utf8'))) return false;
  const latest = receipt.history.at(-1);
  return Boolean(latest && latest.generation === witness.generation && latest.state === witness.state
    && latest.plan_sha256 === witness.plan_sha256 && latest.manifest_sha256 === witness.manifest_sha256);
}

export function inspectStateDirectory(dir, now = Date.now()) {
  const paths = {
    witness: join(dir, 'required-witness.json'),
    active: join(dir, 'active-context.json'),
    receipt: join(dir, 'receipt.json'),
  };
  const hasWitness = existsSync(paths.witness);
  const hasActive = existsSync(paths.active);
  if (!hasWitness && !hasActive) return { kind: 'inactive', dir, paths };
  if (!hasWitness && hasActive) return { kind: 'invalid', dir, paths, reason: 'active context exists without required witness' };
  let witness;
  try { witness = readJson(paths.witness, 'required witness'); }
  catch (error) { return { kind: 'invalid', dir, paths, reason: error.message }; }
  if (NON_TERMINAL_WITNESS_STATES.has(witness.state)) {
    if (!hasActive) return { kind: 'invalid', dir, paths, witness, reason: 'non-terminal witness exists without active context' };
    try {
      const active = readJson(paths.active, 'active context');
      const bound = validateBoundRequired(witness, active, now);
      return { kind: 'required', dir, paths, ...bound };
    } catch (error) { return { kind: 'invalid', dir, paths, witness, reason: error.message }; }
  }
  if (!TERMINAL_WITNESS_STATES.has(witness.state)) return { kind: 'invalid', dir, paths, witness, reason: `unknown witness state ${witness.state}` };
  if (hasActive) return { kind: 'invalid', dir, paths, witness, reason: 'terminal witness still has an active context' };
  if (!existsSync(paths.receipt)) return { kind: 'invalid', dir, paths, witness, reason: 'terminal witness lacks durable receipt' };
  try {
    const receipt = readJson(paths.receipt, 'receipt');
    if (!receiptMatchesTerminal(witness, receipt)) return { kind: 'invalid', dir, paths, witness, receipt, reason: 'terminal witness receipt mismatch' };
    return { kind: 'terminal', dir, paths, witness, receipt };
  } catch (error) { return { kind: 'invalid', dir, paths, witness, reason: error.message }; }
}

export function discoverControlState(repoRoot = repoRealpath(), now = Date.now()) {
  const root = controlRoot(repoRoot);
  if (!existsSync(root)) return { kind: 'inactive', root, entries: [] };
  const entries = [];
  for (const name of readdirSync(root).sort()) {
    if (!TASK_RE.test(name)) continue;
    let stat;
    try { stat = lstatSync(join(root, name)); } catch { continue; }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    const inspected = inspectStateDirectory(join(root, name), now);
    if (inspected.kind !== 'inactive') entries.push(inspected);
  }
  const invalid = entries.filter((entry) => entry.kind === 'invalid');
  if (invalid.length) return { kind: 'invalid', root, entries, reason: invalid.map((e) => `${e.dir}: ${e.reason}`).join('; ') };
  const required = entries.filter((entry) => entry.kind === 'required');
  if (required.length > 1) return { kind: 'invalid', root, entries, reason: 'multiple non-terminal required witnesses exist' };
  if (required.length === 1) return { kind: 'required', root, entries, current: required[0] };
  return { kind: 'inactive', root, entries };
}

export function loadManifestFile(path) {
  return validateManifest(readJson(path, 'manifest'));
}

export function parseCli(argv) {
  const [command, ...rest] = argv;
  const options = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith('--')) { options._.push(token); continue; }
    const key = token.slice(2);
    if (!key || i + 1 >= rest.length || rest[i + 1].startsWith('--')) fail(`missing value for --${key}`);
    if (key in options) fail(`duplicate option --${key}`);
    options[key] = rest[++i];
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (command === 'tuple') {
    if (!options.path) fail('--path is required');
    process.stdout.write(`${canonicalJson(pathTuple(options.path))}\n`);
    return 0;
  }
  if (command === 'manifest-sha') {
    if (!options.manifest) fail('--manifest is required');
    process.stdout.write(`${manifestSha256(loadManifestFile(options.manifest))}\n`);
    return 0;
  }
  if (command === 'check') {
    if (!options.manifest) fail('--manifest is required');
    const result = checkManifest(loadManifestFile(options.manifest), options.phase || 'pre');
    process.stdout.write(`${canonicalJson(result)}\n`);
    return 0;
  }
  if (command === 'fresh-bootstrap-receipt') {
    if (!options.manifest || !options.output) fail('--manifest and --output are required');
    const verifiedAt = options.now === undefined ? Date.now() : Number(options.now);
    const result = produceFreshBootstrapReceipt(loadManifestFile(options.manifest), options.output, verifiedAt);
    process.stdout.write(`${canonicalJson(result)}\n`);
    return 0;
  }
  if (command === 'inspect') {
    const state = discoverControlState(options.repo || undefined);
    process.stdout.write(`${canonicalJson(state)}\n`);
    return state.kind === 'invalid' ? 2 : 0;
  }
  if (command === 'hook-failure-decision') {
    const state = discoverControlState(options.repo || undefined);
    if (state.kind === 'inactive') return 0;
    process.stderr.write(`[controlled-change] deny: guard failure while controlled mode is required (${state.reason || state.kind})\n`);
    return 2;
  }
  fail('usage: controlled-change.mjs tuple|manifest-sha|check|fresh-bootstrap-receipt|inspect|hook-failure-decision');
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await main(); }
  catch (error) {
    process.stderr.write(`[controlled-change] ${error.message}\n`);
    process.exitCode = 2;
  }
}
