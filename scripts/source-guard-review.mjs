// Shared, read-only inventories bind an installation to its reviewed bytes.
import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';

export const MAX_FILE = 64 * 1024 * 1024;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const isDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = message => { throw new Error(message); };
export function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}
export function safeRelative(file) {
  return typeof file === 'string' && file.length > 0 && !file.includes('\\') && !file.includes('\0')
    && !isAbsolute(file) && !file.split('/').some(part => !part || part === '.' || part === '..');
}
export function inside(path, root) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
export function canonical(path, label = 'source root') {
  if (!isAbsolute(path) || resolve(path) !== path || realpathSync(path) !== path
      || !lstatSync(path).isDirectory()) fail(`${label} must be a physical canonical directory`);
  return path;
}
export function privateDir(path, create = false) {
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
export function sourceBytes(path, { protectedFile = false, limit = MAX_FILE } = {}) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > limit
      || realpathSync(path) !== path || (protectedFile
        && (before.uid !== process.getuid() || (before.mode & 0o077) !== 0))) fail(`unsafe ${protectedFile ? 'protected' : 'source'} file: ${path}`);
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino
        || (protectedFile && (opened.uid !== process.getuid() || (opened.mode & 0o077) !== 0))) fail(`file changed while opening: ${path}`);
    const bytes = readFileSync(fd), after = fstatSync(fd), named = lstatSync(path);
    if (bytes.length > limit || after.dev !== opened.dev || after.ino !== opened.ino
        || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs
        || named.dev !== opened.dev || named.ino !== opened.ino || named.isSymbolicLink()) fail(`file changed while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
export const protectedBytes = (path, options = {}) => sourceBytes(path, { ...options, protectedFile: true });
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
export function approvedJavaScript(root) {
  const files = Object.create(null), skip = new Set(['.git', 'node_modules', '__pycache__']);
  let visited = 0, count = 0;
  function scan(folder) {
    if (++visited > 20000) fail(`too many source directories under ${root}`);
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a,b) => byteOrder(a.name,b.name))) {
      const path = join(folder, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { if (!skip.has(entry.name)) scan(path); continue; }
      if (!entry.isFile() || !['.mjs','.js'].includes(extname(entry.name))) continue;
      const rel = relative(root, path);
      if (!safeRelative(rel)) fail(`unsafe source path: ${rel}`);
      files[rel] = { sha256: sha256(sourceBytes(path)),
        format: extname(entry.name) === '.mjs' ? 'module' : packageFormat(path, root) };
      if (++count > 10000) fail(`too many JavaScript sources under ${root}`);
    }
  }
  scan(root);
  return sortedMap(files);
}
function sortedMap(value) { return Object.fromEntries(Object.entries(value).sort(([a],[b]) => byteOrder(a,b))); }
function treeInventory(path, prefix, files, protectedTree = false) {
  if (protectedTree) privateDir(path);
  else if (!lstatSync(path).isDirectory() || realpathSync(path) !== path) fail(`unsafe snapshot directory: ${path}`);
  for (const entry of readdirSync(path, { withFileTypes: true }).sort((a,b) => byteOrder(a.name,b.name))) {
    if (!protectedTree && (entry.name === '__pycache__' || entry.name.endsWith('.pyc'))) continue;
    const child = join(path, entry.name), rel = `${prefix}${entry.name}`;
    if (!safeRelative(rel)) fail(`unsafe snapshot path: ${rel}`);
    if (entry.isDirectory()) treeInventory(child, `${rel}/`, files, protectedTree);
    else if (entry.isFile()) files[rel] = sha256(protectedTree ? protectedBytes(child) : sourceBytes(child));
    else fail(`snapshot has a symlink or special file: ${child}`);
  }
}
export function snapshotSourceInventory(root) {
  const files = Object.create(null);
  for (const folder of ['memory/scripts','.claude/skill-os','.claude/skills/office','.claude/agents']) treeInventory(join(root,folder), `${folder}/`, files);
  files['CLAUDE.md'] = sha256(sourceBytes(join(root,'CLAUDE.md')));
  if (existsSync(join(root,'.codex/stop-integrity-failure.mjs'))) {
    for (const file of ['.codex/stop-integrity-failure.mjs','.claude/hooks/lib/project-substrate.mjs',
      '.claude/hooks/lib/event-attestation.mjs','.claude/hooks/lib/project-selection.mjs',
      '.claude/hooks/lib/project-event-closure.mjs']) files[file] = sha256(sourceBytes(join(root,file)));
  }
  return sortedMap(files);
}
export function snapshotInventory(root, { excludeMetadata = false } = {}) {
  const files = Object.create(null); treeInventory(root, '', files, true);
  if (excludeMetadata) { delete files['.codex/hook-source-approval.json']; delete files['.codex/reviewed-install.json']; }
  return sortedMap(files);
}
export function sourceInventory(root) {
  const files = Object.create(null);
  function scan(path, prefix) {
    if (!lstatSync(path).isDirectory() || realpathSync(path) !== path) fail(`unsafe source scan directory: ${path}`);
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child=join(path,entry.name), rel=`${prefix}/${entry.name}`;
      if (!safeRelative(rel)) fail(`unsafe source scan path: ${rel}`);
      if (entry.isDirectory()) scan(child,rel);
      else if (entry.isFile()) { if (/\.(?:mjs|js|py|sh)$/.test(entry.name)) files[rel]=sha256(sourceBytes(child)); }
      else fail(`source scan has a symlink or special file: ${child}`);
    }
  }
  for (const folder of ['.codex','.claude/hooks','scripts','memory/scripts']) scan(join(root,folder),folder);
  return sortedMap(files);
}
export async function reviewRoot(root, { asRoot } = {}) {
  canonical(root);
  const hasHooks = existsSync(join(root,'.codex/hooks.json'));
  const files=approvedJavaScript(root), snapshot_files=snapshotSourceInventory(root);
  let source_files=null, source_sha256=null, hooks_sha256=null;
  if (hasHooks) {
    source_files=sourceInventory(root);
    const { sourceDigest } = await import('../.codex/hook-source-integrity.mjs');
    source_sha256=sourceDigest(root);
    if (!isDigest(source_sha256)) fail('invalid source digest');
    hooks_sha256=sha256(sourceBytes(join(root,'.codex/hooks.json')));
  }
  return {root:asRoot || root,files,snapshot_files,source_files,source_sha256,hooks_sha256};
}
export async function createReviewArtifact(roots, { bootstrap, loader, asRoot } = {}) {
  if (asRoot && roots.length !== 1) fail('--as-root requires exactly one root');
  if (asRoot) canonical(asRoot,'deployment root');
  const rows=[];
  for (const root of roots) rows.push(await reviewRoot(root,{asRoot}));
  return {schema_version:1,kind:'luca-source-guard-review',bootstrap_sha256:sha256(bootstrap),loader_sha256:sha256(loader),roots:rows};
}
function validateMap(map, js = false) {
  if (!map || typeof map !== 'object' || Array.isArray(map)
      || Object.keys(map).join('\0') !== Object.keys(map).sort(byteOrder).join('\0')) fail('invalid or unsorted review map');
  for (const [file,value] of Object.entries(map)) {
    if (!safeRelative(file)) fail('invalid review relative path');
    if (js ? !/\.(?:mjs|js)$/.test(file) || !exactKeys(value,['sha256','format'])
        || !isDigest(value.sha256) || !['module','commonjs'].includes(value.format)
      : !isDigest(value)) fail('invalid review file approval');
  }
}
export function parseReviewArtifact(bytes) {
  let value; try { value=JSON.parse(bytes.toString('utf8')); } catch { fail('invalid reviewed artifact JSON'); }
  if (!exactKeys(value,['schema_version','kind','bootstrap_sha256','loader_sha256','roots'])
      || value.schema_version!==1 || value.kind!=='luca-source-guard-review'
      || !isDigest(value.bootstrap_sha256) || !isDigest(value.loader_sha256)
      || !Array.isArray(value.roots) || !value.roots.length) fail('invalid reviewed artifact schema');
  const seen=new Set();
  for (const row of value.roots) {
    if (!exactKeys(row,['root','files','snapshot_files','source_files','source_sha256','hooks_sha256'])
        || typeof row.root!=='string' || !isAbsolute(row.root) || resolve(row.root)!==row.root || seen.has(row.root)) fail('invalid reviewed root');
    seen.add(row.root); validateMap(row.files,true); validateMap(row.snapshot_files);
    if (row.source_sha256===null && row.source_files===null && row.hooks_sha256===null) continue;
    if (!isDigest(row.source_sha256) || !isDigest(row.hooks_sha256)) fail('invalid hook review digest');
    validateMap(row.source_files);
    for (const file of Object.keys(row.source_files)) if (!['.codex/','.claude/hooks/','scripts/','memory/scripts/'].some(prefix=>file.startsWith(prefix)) || !/\.(?:mjs|js|py|sh)$/.test(file)) fail('invalid source inventory path');
  }
  return value;
}
export function equalArtifact(actual, expected) {
  // Object order is not semantic, but exact keys, row order and inventory values are.
  const normalize=value=>value && typeof value==='object' ? Array.isArray(value)
    ? value.map(normalize) : Object.fromEntries(Object.keys(value).sort(byteOrder).map(k=>[k,normalize(value[k])])) : value;
  return JSON.stringify(normalize(actual))===JSON.stringify(normalize(expected));
}
