// Return the bytes just verified. Node never reopens a workspace JS file after
// our hash check, so replacing it between checking and evaluation cannot win.
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let approved;
export function initialize(data) {
  if (!data || typeof data.sourceRoot !== 'string' || !data.files
      || typeof data.guardRoot !== 'string') throw new Error('[luca source guard] missing approval data');
  approved = data;
}
function inside(path, root) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
function guardedRead(path) {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > 64 * 1024 * 1024
      || realpathSync(path) !== path) throw new Error('[luca source guard] source is not a canonical regular file');
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error('[luca source guard] source changed while opening');
    }
    const bytes = readFileSync(fd);
    if (bytes.length > 64 * 1024 * 1024) throw new Error('[luca source guard] source is too large');
    return bytes;
  } finally { closeSync(fd); }
}
export function load(url, context, nextLoad) {
  if (!approved) throw new Error('[luca source guard] loader was not initialized');
  if (url.startsWith('node:')) return nextLoad(url, context);
  if (!url.startsWith('file:')) {
    throw new Error(`[luca source guard] non-file module is not approved: ${url}`);
  }
  const path = fileURLToPath(url);
  const ext = extname(path);
  if (inside(path, approved.guardRoot)) return nextLoad(url, context);
  if (ext === '.json') return nextLoad(url, context);
  if (ext !== '.mjs' && ext !== '.js') {
    throw new Error(`[luca source guard] executable file type is not approved: ${path}`);
  }
  if (!inside(path, approved.sourceRoot)) {
    throw new Error(`[luca source guard] external JavaScript is not approved: ${path}`);
  }
  const rel = relative(approved.sourceRoot, path).split('\\').join('/');
  const record = Object.hasOwn(approved.files, rel) ? approved.files[rel] : null;
  if (!record || !/^[a-f0-9]{64}$/.test(record.sha256)
      || !['module', 'commonjs'].includes(record.format)) {
    throw new Error(`[luca source guard] JavaScript is not listed: ${rel}`);
  }
  const bytes = guardedRead(path);
  if (createHash('sha256').update(bytes).digest('hex') !== record.sha256) {
    throw new Error(`[luca source guard] JavaScript changed after approval: ${rel}`);
  }
  return { format: record.format, source: bytes, shortCircuit: true };
}
