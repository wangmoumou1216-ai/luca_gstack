import { readFile, lstat, realpath, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

// A source copy is data, not a new implementation. Never parse, sanitize,
// format, inject anchors into, or execute these bytes during import.
export function verifyCopyBytes(bytes, entry, original) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== entry.raw_bytes || sha(bytes) !== entry.raw_sha256)
    fail('TEMPLATE_COPY_MISMATCH', `${entry.page_id}: copy must match the frozen original bytes, not a rewritten page`);
  if (original && (!Buffer.isBuffer(original) || !bytes.equals(original)))
    fail('TEMPLATE_COPY_MISMATCH', `${entry.page_id}: original and copy differ byte-for-byte`);
  return { page_id: entry.page_id, bytes: bytes.length, sha256: sha(bytes), fidelity: 'byte-identical', execution: 'not-performed' };
}

async function copyPath(root, ref, create = false) {
  if (typeof ref !== 'string' || !/^\.claude\/skill-os\/page-library\/sources\/originals\/[a-z0-9-]+\.html$/.test(ref))
    fail('COPY_PATH_INVALID', 'Original copies must use an explicit originals/<id>.html path');
  let cursor = await realpath(root);
  const parts = ref.split('/');
  for (const [index, part] of parts.entries()) {
    cursor = resolve(cursor, part);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) fail('COPY_SYMLINK', 'Copy paths cannot traverse symlinks');
      if (index < parts.length - 1 && !stat.isDirectory()) fail('COPY_PATH_INVALID', 'Copy parent must be a directory');
      if (index === parts.length - 1 && !stat.isFile()) fail('COPY_PATH_INVALID', 'Copy must be a regular file');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (create && index < parts.length - 1) await mkdir(cursor);
      else if (index < parts.length - 1) throw error;
    }
  }
  return cursor;
}

export async function verifyTemplateCopies({ root = repo, auditOriginals = false, importOriginals = false } = {}) {
  const manifest = JSON.parse(await readFile(resolve(root, '.claude/skill-os/page-library/source-manifest.json'), 'utf8'));
  if (manifest.profile !== 'original-template-copy-v1' || manifest.policy?.byte_identical_copy_required !== true || !Array.isArray(manifest.sources) || !manifest.sources.length)
    fail('COPY_MANIFEST_INVALID', 'An original-template-copy manifest is required');
  const seen = new Set(); const results = [];
  for (const entry of manifest.sources) {
    if (!/^[a-z][a-z0-9-]*$/.test(entry.page_id ?? '') || seen.has(entry.page_id) || !/^[a-f0-9]{64}$/.test(entry.raw_sha256 ?? '') || !Number.isSafeInteger(entry.raw_bytes) || entry.raw_bytes <= 0)
      fail('COPY_MANIFEST_INVALID', 'Duplicate identity or missing original hash/bytes');
    seen.add(entry.page_id);
    const destination = await copyPath(root, entry.copy_source, importOriginals);
    let original;
    if (auditOriginals || importOriginals) {
      if (typeof entry.raw_source !== 'string' || !entry.raw_source.startsWith(`${sep}Users${sep}luca${sep}Desktop${sep}模版${sep}`))
        fail('ORIGINAL_SCOPE_INVALID', 'Raw audit requires the approved original template directory');
      if ((await lstat(entry.raw_source)).isSymbolicLink()) fail('COPY_SYMLINK', 'Original cannot be a symlink');
      if (await realpath(entry.raw_source) !== entry.raw_source) fail('COPY_SYMLINK', 'Original ancestors cannot be symlinks');
      original = await readFile(entry.raw_source);
      verifyCopyBytes(original, entry);
    }
    if (importOriginals) {
      // COPYFILE_EXCL prevents overwriting either prior evidence or user edits.
      try { await copyFile(entry.raw_source, destination, constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    results.push(verifyCopyBytes(await readFile(destination), entry, original));
  }
  return { status: 'PASS', profile: manifest.profile, originals_audited: auditOriginals || importOriginals, copies: results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['verify', 'import', '--audit-originals'].includes(arg)) || !['verify', 'import'].includes(args[0])) {
    console.error('usage: template-copy.mjs verify [--audit-originals] | import'); process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await verifyTemplateCopies({ auditOriginals: args.includes('--audit-originals'), importOriginals: args[0] === 'import' }), null, 2)); }
    catch (error) { console.error(JSON.stringify({ error: error.code ?? 'COPY_FAILED', message: error.message })); process.exitCode = 1; }
  }
}
