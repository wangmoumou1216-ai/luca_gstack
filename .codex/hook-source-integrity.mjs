#!/usr/bin/env node
// Read-only integrity gate. The protected bootstrap authenticates this entry first.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync,
  readdirSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_ALGORITHM = 'shell-source-scan-v2';
export const SOURCE_SCAN = String.raw`links=$(find .codex .claude/hooks scripts memory/scripts -type l -print -quit) && [ -z "$links" ] && lines=$(bash -o pipefail -c 'find .codex .claude/hooks scripts memory/scripts -type f \( -name "*.mjs" -o -name "*.js" -o -name "*.py" -o -name "*.sh" \) -print0 | LC_ALL=C sort -z | xargs -0 /usr/bin/shasum -a 256') && h=$(printf '%s\n' "$lines" | /usr/bin/shasum -a 256) || h=invalid` + '; h=${h%% *}';
const DIGEST = /^[a-f0-9]{64}$/;
const isDigest = value => typeof value === 'string' && DIGEST.test(value);
const MAX_FILE = 64 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`[hook source integrity] ${message}`); };
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const sorted = names => [...names].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
const canonical = path => typeof path === 'string' && isAbsolute(path)
  && resolve(path) === path && realpathSync(path) === path;
const validName = name => typeof name === 'string' && name && !isAbsolute(name)
  && !name.includes('\0') && !name.includes('\\') && !name.split('/').some(part => !part || part === '.' || part === '..');
function inside(path, root) {
  const rel = relative(root, path);
  return rel && !rel.startsWith('..') && !isAbsolute(rel);
}
function privateDir(path) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !canonical(path)
      || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail(`unsafe protected directory: ${path}`);
}
function fileBytes(path, privateFile = false, limit = MAX_FILE) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || !canonical(path) || before.size > limit
      || !(before.mode & 0o444)
      || (privateFile && (before.uid !== process.getuid() || (before.mode & 0o077)))) fail(`unsafe file: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino
        || opened.size > limit || (privateFile && (opened.uid !== process.getuid() || (opened.mode & 0o077)))) {
      fail(`file changed while opening: ${path}`);
    }
    const bytes = readFileSync(fd);
    const after = fstatSync(fd), named = lstatSync(path);
    if (bytes.length > limit || after.dev !== opened.dev || after.ino !== opened.ino
        || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs
        || named.dev !== opened.dev || named.ino !== opened.ino || named.isSymbolicLink()) fail(`file changed while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function validateSourceTree(root) {
  let visited = 0;
  function scan(folder) {
    const stat = lstatSync(folder);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !canonical(folder)
        || !(stat.mode & 0o444) || !(stat.mode & 0o111)) fail(`source scan failed: unsafe directory ${folder}`);
    if (++visited > 20000) fail('source scan failed: too many directories');
    for (const name of readdirSync(folder)) {
      const path = join(folder, name), child = lstatSync(path);
      if (child.isSymbolicLink()) fail(`source scan failed: symlink ${path}`);
      if (child.isDirectory()) scan(path);
      else if (!child.isFile()) fail(`source scan failed: special file ${path}`);
      else if (/\.(?:mjs|js|py|sh)$/.test(name)) fileBytes(path);
    }
  }
  for (const folder of ['.codex', '.claude/hooks', 'scripts', 'memory/scripts']) scan(join(root, folder));
}
export function sourceDigest(root) {
  try {
    if (!canonical(root)) fail('source root must be canonical');
    validateSourceTree(root);
    const result = spawnSync('/bin/bash', ['-o', 'pipefail', '-c', `${SOURCE_SCAN}; printf '%s' "$h"`],
      { cwd: root, encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    if (result.error || result.status !== 0 || !isDigest(result.stdout)) fail('source scan failed: upstream hashing command');
    return result.stdout;
  } catch (error) {
    if (error.message.includes('source scan failed')) throw error;
    fail(`source scan failed: ${error.message}`);
  }
}
function validFileMap(files, javascript = false, requireSorted = true) {
  if (!files || typeof files !== 'object' || Array.isArray(files)
      || (requireSorted && Object.keys(files).join('\0') !== sorted(Object.keys(files)).join('\0'))) return false;
  return Object.entries(files).every(([name, value]) => validName(name) && (javascript
    ? /\.(?:mjs|js)$/.test(name) && keys(value, ['sha256', 'format']) && isDigest(value.sha256)
      && ['module', 'commonjs'].includes(value.format)
    : typeof value === 'string' && isDigest(value)));
}
function sameMap(a, b) {
  const normalize = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(normalize)
    : Object.fromEntries(sorted(Object.keys(value)).map(name => [name, normalize(value[name])])) : value;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function guardLocation(requested) {
  const expected = join(realpathSync(homedir()), '.codex', 'luca-child-project', 'source-guard');
  const guardRoot = requested ?? expected;
  if (!canonical(guardRoot)) fail('protected guard root must be canonical');
  if (guardRoot !== expected) {
    if (process.env.NODE_ENV !== 'test' || ![realpathSync(tmpdir()), realpathSync('/tmp')].some(temp => inside(guardRoot, temp))) {
      fail('explicit guard root requires NODE_ENV=test and OS temp');
    }
    privateDir(dirname(guardRoot));
  } else {
    const home = lstatSync(realpathSync(homedir()));
    if (!home.isDirectory() || home.uid !== process.getuid() || (home.mode & 0o022)) fail('unsafe user home');
    privateDir(join(realpathSync(homedir()), '.codex'));
    privateDir(dirname(guardRoot));
  }
  privateDir(guardRoot); privateDir(join(guardRoot, 'roots'));
  return guardRoot;
}
export function readSourceApproval(root, { guardRoot: requested } = {}) {
  if (!canonical(root)) fail('source root must be canonical');
  const guardRoot = guardLocation(requested);
  const manifestBytes = fileBytes(join(guardRoot, 'manifest.json'), true, 32 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes);
  if (!keys(manifest, ['schema_version', 'loader_sha256', 'roots']) || manifest.schema_version !== 1
      || !isDigest(manifest.loader_sha256) || !Array.isArray(manifest.roots) || !manifest.roots.length) fail('invalid installed manifest');
  const seen = new Set();
  for (const entry of manifest.roots) {
    if (!keys(entry, ['root', 'snapshot', 'files']) || typeof entry.root !== 'string' || !isAbsolute(entry.root)
        || resolve(entry.root) !== entry.root || seen.has(entry.root)
        || typeof entry.snapshot !== 'string' || !/^[a-f0-9]{64}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(entry.snapshot)
        || entry.snapshot.slice(0, 64) !== sha(entry.root) || !validFileMap(entry.files, true, false)) fail('invalid installed root');
    seen.add(entry.root);
  }
  const entry = manifest.roots.find(row => row.root === root);
  if (!entry) fail('SOURCE_ROOT_NOT_INSTALLED');
  const snapshotRoot = join(guardRoot, 'roots', entry.snapshot);
  privateDir(snapshotRoot); privateDir(join(snapshotRoot, '.codex'));
  const approval = JSON.parse(fileBytes(join(snapshotRoot, '.codex', 'hook-source-approval.json'), true));
  if (!keys(approval, ['schema_version', 'kind', 'root', 'algorithm', 'sha256', 'artifact_sha256'])
      || approval.schema_version !== 1 || approval.kind !== 'luca-hook-source-approval' || approval.root !== root
      || approval.algorithm !== SOURCE_ALGORITHM || !isDigest(approval.sha256) || !isDigest(approval.artifact_sha256)) fail('invalid hook source approval');
  const artifactBytes = fileBytes(join(snapshotRoot, '.codex', 'reviewed-install.json'), true);
  if (sha(artifactBytes) !== approval.artifact_sha256) fail('reviewed artifact hash mismatch');
  const artifact = JSON.parse(artifactBytes);
  if (!keys(artifact, ['schema_version', 'kind', 'bootstrap_sha256', 'loader_sha256', 'roots'])
      || artifact.schema_version !== 1 || artifact.kind !== 'luca-source-guard-review'
      || !isDigest(artifact.bootstrap_sha256) || !isDigest(artifact.loader_sha256)
      || !Array.isArray(artifact.roots) || !artifact.roots.length) fail('invalid reviewed artifact');
  const artifactSeen = new Set();
  for (const row of artifact.roots) {
    if (!keys(row, ['root', 'files', 'snapshot_files', 'source_files', 'source_sha256', 'hooks_sha256'])
        || typeof row.root !== 'string' || !isAbsolute(row.root) || resolve(row.root) !== row.root || artifactSeen.has(row.root)
        || !validFileMap(row.files, true) || !validFileMap(row.snapshot_files)
        || !((row.source_sha256 === null && row.hooks_sha256 === null && row.source_files === null)
          || (isDigest(row.source_sha256) && isDigest(row.hooks_sha256) && validFileMap(row.source_files)))) fail('invalid reviewed artifact root');
    if (row.source_files && Object.keys(row.source_files).some(name => !['.codex/', '.claude/hooks/', 'scripts/', 'memory/scripts/'].some(prefix => name.startsWith(prefix))
        || !/\.(?:mjs|js|py|sh)$/.test(name))) fail('invalid reviewed source inventory path');
    artifactSeen.add(row.root);
  }
  const row = artifact.roots.find(row => row.root === root);
  if (!row || !isDigest(row.source_sha256) || row.source_sha256 !== approval.sha256
      || !sameMap(entry.files, row.files)) fail('approval and reviewed artifact root mismatch');
  const bootstrapBytes = fileBytes(join(guardRoot, 'bootstrap.mjs'), true);
  const loaderBytes = fileBytes(join(guardRoot, 'loader.mjs'), true, 32 * 1024 * 1024);
  if (sha(bootstrapBytes) !== artifact.bootstrap_sha256 || sha(loaderBytes) !== artifact.loader_sha256
      || manifest.loader_sha256 !== artifact.loader_sha256) fail('installed runtime and reviewed artifact mismatch');
  for (const [name, bytes] of [['bootstrap', bootstrapBytes], ['loader', loaderBytes]]) {
    if (!fileBytes(join(root, '.codex', `codex-source-guard-${name}.mjs`)).equals(bytes)) fail(`INSTALLED_RUNTIME_MISMATCH: ${name}`);
  }
  const helper = '.codex/hook-source-integrity.mjs';
  if (!entry.files[helper] || sha(fileBytes(join(root, helper))) !== entry.files[helper].sha256) fail('installed helper differs from reviewed artifact');
  return { approval, artifact, row, rootRow: row, entry, manifest, manifestBytes, artifactBytes,
    manifestSha256: sha(manifestBytes), snapshotRoot, guardRoot };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--verify') fail('Usage: hook-source-integrity.mjs --verify');
    const root = process.env.LUCA_CHILD_SOURCE_ROOT;
    if (!canonical(root) || root !== realpathSync(process.cwd())) fail('hook source root must match canonical cwd');
    const expected = join(realpathSync(homedir()), '.codex', 'luca-child-project', 'source-guard');
    const testRoot = process.env.NODE_ENV === 'test' ? process.env.LUCA_SOURCE_GUARD_TEST_ROOT : undefined;
    const selected = readSourceApproval(root, { guardRoot: testRoot || expected });
    if (process.env.NODE_OPTIONS !== `--import=${selected.guardRoot}/bootstrap.mjs`
        || process.env.LUCA_PROTECTED_CODE_ROOT !== selected.snapshotRoot) fail('protected bootstrap snapshot does not match manifest');
    if (sourceDigest(root) !== selected.approval.sha256) fail('SOURCE_DIGEST_MISMATCH: unapproved source');
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
}
