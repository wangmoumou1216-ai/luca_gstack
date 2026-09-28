// Installed at ~/.codex/luca-child-project/source-guard/bootstrap.mjs.
// NODE_OPTIONS loads this protected copy before each hook entry point.
import { registerHooks } from 'node:module';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function die(message) { throw new Error(`[luca source guard] ${message}`); }
function privateDir(path, ownerOnly = true) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== path
      || stat.uid !== process.getuid() || (stat.mode & (ownerOnly ? 0o077 : 0o022)) !== 0) {
    die(`untrusted protected directory: ${path}`);
  }
}
function protectedBytes(path) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid()
      || (before.mode & 0o022) !== 0 || before.size > 32 * 1024 * 1024) {
    die(`untrusted protected file: ${path}`);
  }
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (opened.dev !== before.dev || opened.ino !== before.ino || !opened.isFile()) {
      die('protected file changed while opening');
    }
    return readFileSync(fd);
  } finally { closeSync(fd); }
}

const bootstrap = fileURLToPath(import.meta.url);
const guardRoot = dirname(bootstrap);
const expectedRoot = join(realpathSync(homedir()), '.codex', 'luca-child-project', 'source-guard');
const testRoot = process.env.NODE_ENV === 'test' && process.env.LUCA_SOURCE_GUARD_TEST_ROOT === guardRoot
  && [realpathSync(tmpdir()), realpathSync('/tmp')].some(temp => {
    const rel = relative(temp, guardRoot);
    return rel && !rel.startsWith('..') && !isAbsolute(rel);
  });
if (guardRoot !== expectedRoot && !testRoot) die('bootstrap is outside its protected installation');
if (!testRoot) {
  privateDir(homedir(), false);
  privateDir(join(homedir(), '.codex'));
  privateDir(join(homedir(), '.codex', 'luca-child-project'));
}
privateDir(guardRoot);
const requested = process.env.LUCA_CHILD_SOURCE_ROOT;
if (!requested || !isAbsolute(requested)) die('LUCA_CHILD_SOURCE_ROOT must be absolute');
const sourceRoot = realpathSync(requested);
if (sourceRoot !== resolve(requested)) die('source root must be canonical');
let manifest;
try { manifest = JSON.parse(protectedBytes(join(guardRoot, 'manifest.json'))); }
catch { die('protected manifest is unreadable'); }
if (manifest?.schema_version !== 1 || !Array.isArray(manifest.roots)) die('protected manifest is invalid');
const entry = manifest.roots.find(row => row.root === sourceRoot);
if (!entry || !entry.files || typeof entry.snapshot !== 'string'
    || !/^[a-f0-9]{64}-[a-f0-9-]{36}$/.test(entry.snapshot)) {
  die('source root is not approved');
}
const snapshotRoot = join(guardRoot, 'roots', entry.snapshot);
privateDir(join(guardRoot, 'roots'));
privateDir(snapshotRoot);
const loaderPath = join(guardRoot, 'loader.mjs');
const loaderBytes = protectedBytes(loaderPath);
if (createHash('sha256').update(loaderBytes).digest('hex') !== manifest.loader_sha256) {
  die('protected loader differs from approved manifest');
}
process.env.LUCA_PROTECTED_CODE_ROOT = snapshotRoot;
process.env.PYTHONDONTWRITEBYTECODE = '1';
if (typeof registerHooks !== 'function') die('this Node version cannot guard CommonJS loads');
const loader = await import(new URL('./loader.mjs', import.meta.url));
loader.initialize({ sourceRoot, files: entry.files, guardRoot });
registerHooks({ load: loader.load });
