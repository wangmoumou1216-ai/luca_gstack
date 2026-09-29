#!/usr/bin/env node
// Install a reviewed source snapshot outside ordinary agent tool write access.
// Usage: node scripts/install-codex-source-guard.mjs --root /absolute/repo [--root /second/repo]
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_FILE = 64 * 1024 * 1024;
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__']);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`[luca source guard install] ${message}`); };
function inside(path, root) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
function canonical(path, label) {
  if (!isAbsolute(path)) fail(`${label} must be absolute`);
  const requested = resolve(path);
  const actual = realpathSync(requested);
  if (requested !== actual) fail(`${label} must be a physical canonical path`);
  return actual;
}
function privateDir(path, create = false) {
  if (create) {
    try { mkdirSync(path, { mode: 0o700 }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
  }
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== path
      || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) {
    fail(`untrusted protected directory: ${path}`);
  }
  return path;
}
function sourceBytes(path) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_FILE
      || realpathSync(path) !== path) fail(`unsafe source file: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      fail(`source changed while opening: ${path}`);
    }
    const bytes = readFileSync(fd);
    if (bytes.length > MAX_FILE) fail(`source file exceeds limit: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function writeNew(path, bytes) {
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
    | (constants.O_NOFOLLOW || 0), 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
function replaceProtected(path, bytes) {
  const temp = `${path}.${randomUUID()}.tmp`;
  writeNew(temp, bytes);
  renameSync(temp, path);
  const fd = openSync(dirname(path), constants.O_RDONLY);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function packageFormat(path, root) {
  for (let folder = dirname(path); inside(folder, root); folder = dirname(folder)) {
    const packagePath = join(folder, 'package.json');
    if (existsSync(packagePath)) {
      let value;
      try { value = JSON.parse(sourceBytes(packagePath).toString('utf8')); }
      catch { fail(`invalid package.json controlling ${path}`); }
      return value.type === 'module' ? 'module' : 'commonjs';
    }
    if (folder === root) break;
  }
  return 'commonjs';
}
function approvedJavaScript(root) {
  const files = Object.create(null);
  let visited = 0;
  function scan(folder) {
    if (++visited > 20000) fail(`too many source directories under ${root}`);
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) scan(path);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name);
      if (ext !== '.mjs' && ext !== '.js') continue;
      const rel = relative(root, path).split('\\').join('/');
      files[rel] = { sha256: sha(sourceBytes(path)),
        format: ext === '.mjs' ? 'module' : packageFormat(path, root) };
      if (Object.keys(files).length > 10000) fail(`too many JavaScript sources under ${root}`);
    }
  }
  scan(root);
  return files;
}
function copyTree(source, destination) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`unsafe snapshot source: ${source}`);
  privateDir(destination, true);
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isSymbolicLink()) fail(`snapshot source has a symlink: ${from}`);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) writeNew(to, sourceBytes(from));
    else fail(`snapshot source has a special file: ${from}`);
  }
}
function copySnapshot(root, destination, approved) {
  privateDir(join(destination, 'memory'), true);
  copyTree(join(root, 'memory', 'scripts'), join(destination, 'memory', 'scripts'));
  privateDir(join(destination, '.claude'), true);
  copyTree(join(root, '.claude', 'skill-os'), join(destination, '.claude', 'skill-os'));
  privateDir(join(destination, '.claude', 'skills'), true);
  copyTree(join(root, '.claude', 'skills', 'office'),
    join(destination, '.claude', 'skills', 'office'));
  copyTree(join(root, '.claude', 'agents'), join(destination, '.claude', 'agents'));
  writeNew(join(destination, 'CLAUDE.md'), sourceBytes(join(root, 'CLAUDE.md')));
  if (existsSync(join(root, '.codex', 'stop-integrity-failure.mjs'))) {
    privateDir(join(destination, '.codex'), true);
    privateDir(join(destination, '.claude', 'hooks'), true);
    privateDir(join(destination, '.claude', 'hooks', 'lib'), true);
    for (const file of ['.codex/stop-integrity-failure.mjs',
      '.claude/hooks/lib/project-substrate.mjs', '.claude/hooks/lib/event-attestation.mjs',
      '.claude/hooks/lib/project-selection.mjs', '.claude/hooks/lib/project-event-closure.mjs']) {
      const bytes = sourceBytes(join(root, file));
      if (sha(bytes) !== approved[file]?.sha256) fail(`Stop recovery source changed during installation: ${file}`);
      writeNew(join(destination, file), bytes);
    }
  }
}

function protectedBytes(path) {
  const stat = lstatSync(path);
  if (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) fail(`untrusted protected file: ${path}`);
  return sourceBytes(path);
}
function validateSnapshotTree(path) {
  privateDir(path);
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) validateSnapshotTree(child);
    else if (entry.isFile()) protectedBytes(child);
    else fail(`unsafe protected snapshot: ${child}`);
  }
}
function preservedManifest(destination, bootstrap, loader) {
  privateDir(destination); privateDir(join(destination, 'roots'));
  if (!protectedBytes(join(destination, 'bootstrap.mjs')).equals(bootstrap)
      || !protectedBytes(join(destination, 'loader.mjs')).equals(loader)) {
    fail('preserving roots requires identical installed bootstrap and loader');
  }
  const bytes = protectedBytes(join(destination, 'manifest.json'));
  let value;
  try { value = JSON.parse(bytes); } catch { fail('invalid installed manifest JSON'); }
  const keys = (object, expected) => object && typeof object === 'object' && !Array.isArray(object)
    && Object.keys(object).sort().join(',') === [...expected].sort().join(',');
  if (!keys(value, ['schema_version','loader_sha256','roots']) || value.schema_version !== 1
      || value.loader_sha256 !== sha(loader) || !Array.isArray(value.roots) || !value.roots.length) {
    fail('invalid installed manifest');
  }
  const seen = new Set();
  for (const row of value.roots) {
    if (!keys(row, ['root','snapshot','files']) || typeof row.root !== 'string'
        || !isAbsolute(row.root) || resolve(row.root) !== row.root || seen.has(row.root)
        || typeof row.snapshot !== 'string'
        || !/^[a-f0-9]{64}-[a-f0-9-]{36}$/.test(row.snapshot)
        || row.snapshot.slice(0,64) !== sha(Buffer.from(row.root))
        || !row.files || typeof row.files !== 'object' || Array.isArray(row.files)) fail('invalid installed root');
    seen.add(row.root);
    for (const [file, approval] of Object.entries(row.files)) {
      if (!file || file.includes('\\') || isAbsolute(file) || file.split('/').some(part => !part || part === '.' || part === '..')
          || !/\.(?:mjs|js)$/.test(file) || !keys(approval, ['sha256','format'])
          || !/^[a-f0-9]{64}$/.test(approval.sha256) || !['module','commonjs'].includes(approval.format)) {
        fail('invalid installed file approval');
      }
    }
    // Inspect the protected snapshot only, never the preserved source checkout.
    validateSnapshotTree(join(destination, 'roots', row.snapshot));
  }
  return { value, bytes };
}

const args = process.argv.slice(2);
const requestedRoots = [];
let dryRun = false;
let preserveOtherRoots = false;
let testDest = '';
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--root' && args[index + 1]) requestedRoots.push(args[++index]);
  else if (arg === '--preserve-other-roots') preserveOtherRoots = true;
  else if (arg === '--dry-run') dryRun = true;
  else if (arg === '--test-dest' && args[index + 1]) testDest = args[++index];
  else fail(`unknown or incomplete argument: ${arg}`);
}
if (preserveOtherRoots && !requestedRoots.length) fail('--preserve-other-roots requires explicit --root');
const roots = [...new Set((requestedRoots.length ? requestedRoots : [scriptRoot])
  .map(path => canonical(path, 'source root')))];
const expectedDest = join(realpathSync(homedir()), '.codex', 'luca-child-project', 'source-guard');
let destination = expectedDest;
if (testDest) {
  if (process.env.NODE_ENV !== 'test' || !isAbsolute(testDest)
      || ![realpathSync(tmpdir()), realpathSync('/tmp')]
        .some(temp => inside(resolve(testDest), temp))) {
    fail('--test-dest requires NODE_ENV=test and a path below the system temp root');
  }
  destination = resolve(testDest);
}
const bootstrap = sourceBytes(join(scriptRoot, '.codex', 'codex-source-guard-bootstrap.mjs'));
const loader = sourceBytes(join(scriptRoot, '.codex', 'codex-source-guard-loader.mjs'));
// Validate preservation before creating any destination or snapshot.
if (preserveOtherRoots) {
  if (testDest) privateDir(dirname(destination));
  else {
    const home = canonical(homedir(), 'user home'), stat = lstatSync(home);
    if (stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) fail('user home is writable by others');
    privateDir(join(home, '.codex')); privateDir(join(home, '.codex', 'luca-child-project'));
  }
}
const previous = preserveOtherRoots ? preservedManifest(destination, bootstrap, loader) : null;
const updated = roots.map(root => ({ root,
  snapshot: `${sha(Buffer.from(root))}-${randomUUID()}`,
  files: approvedJavaScript(root) }));
const replacements = new Map(updated.map(row => [row.root, row]));
const entries = previous ? previous.value.roots.map(row => {
  const replacement = replacements.get(row.root); replacements.delete(row.root); return replacement || row;
}).concat([...replacements.values()]) : updated;
const summary = { destination, preserve_other_roots: preserveOtherRoots, roots: entries.map(row => ({ root: row.root,
  approved_js: Object.keys(row.files).length, snapshot: row.snapshot })) };
if (dryRun) {
  process.stdout.write(`${JSON.stringify({ dry_run: true, ...summary }, null, 2)}\n`);
  process.exit(0);
}
if (testDest) {
  privateDir(dirname(destination));
} else {
  const home = canonical(homedir(), 'user home');
  const homeStat = lstatSync(home);
  if (homeStat.uid !== process.getuid() || (homeStat.mode & 0o022) !== 0) fail('user home is writable by others');
  privateDir(join(home, '.codex'));
  privateDir(join(home, '.codex', 'luca-child-project'));
}
privateDir(destination, true);
const snapshots = privateDir(join(destination, 'roots'), true);
for (const row of updated) {
  const snapshotRoot = privateDir(join(snapshots, row.snapshot), true);
  copySnapshot(row.root, snapshotRoot, row.files);
}
if (previous) {
  if (!protectedBytes(join(destination, 'manifest.json')).equals(previous.bytes)
      || !protectedBytes(join(destination, 'bootstrap.mjs')).equals(bootstrap)
      || !protectedBytes(join(destination, 'loader.mjs')).equals(loader)) fail('protected installation changed during update');
} else {
  replaceProtected(join(destination, 'bootstrap.mjs'), bootstrap);
  replaceProtected(join(destination, 'loader.mjs'), loader);
}
replaceProtected(join(destination, 'manifest.json'), Buffer.from(`${JSON.stringify({
  schema_version: 1, loader_sha256: sha(loader), roots: entries,
})}\n`));
process.stdout.write(`${JSON.stringify({ installed: true, ...summary }, null, 2)}\n`);
