import path from 'node:path';
import { parse } from 'parse5';
import { sha256Bytes } from './carrier-asset-profile.mjs';
import { crc32 } from './design-handoff-archive.mjs';
import { verifyMaterialDependencies } from './material-dependencies.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_MEMBERS = 1000;
const order = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

// This boundary accepts the observed official STORE/UTF-8 export, not the full
// ZIP specification. Unknown flags, descriptors, compression, extras, comments,
// disk layouts and attributes are explicitly unsupported rather than guessed.
export function safeClaudeDesignExportPath(name) {
  if (typeof name !== 'string' || !name || Buffer.byteLength(name) > 1024 || name !== name.normalize('NFC') || name.includes('\\') || name.includes(':') || /[\u0000-\u001f\u007f]/.test(name) || name.startsWith('/') || path.posix.normalize(name) !== name || name.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) fail('CD_EXPORT_PATH');
  return name;
}

function htmlText(bytes) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text).equals(bytes) || !/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(text.slice(0, 512)) || !/<html\b/i.test(text) || !/<\/html\s*>/i.test(text)) fail('CD_MANUAL_HTML_REQUIRED');
  return text;
}

// Check literal local HTML resources without executing any downloaded script.
// The complete inventory also retains members that HTML does not reference.
function checkHTMLResources(entry, files, budget) {
  const names = new Set(files.map(f => f.path)), text = htmlText(entry.bytes);
  const resourceAttributes = { script: ['src'], link: ['href'], img: ['src'], source: ['src'], audio: ['src'], video: ['src', 'poster'], iframe: ['src'], embed: ['src'], object: ['data'], input: ['src'], image: ['href', 'xlink:href'], use: ['href', 'xlink:href'] };
  const check = value => {
    if (!value || /^\s*(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return;
    const raw = value.split(/[?#]/, 1)[0];
    if (!raw) return;
    let decoded; try { decoded = decodeURIComponent(raw); } catch { fail('CD_EXPORT_RESOURCE'); }
    if (decoded.startsWith('/') || decoded.includes('\\') || decoded.includes(':') || /[\u0000-\u001f\u007f]/.test(decoded)) fail('CD_EXPORT_RESOURCE');
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(entry.path), decoded));
    try { safeClaudeDesignExportPath(relative); } catch { fail('CD_EXPORT_RESOURCE'); }
    if (!names.has(relative)) fail('CD_EXPORT_RESOURCE_MISSING');
  };
  const pending = [[parse(text), 0]]; let nodes = 1;
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth > 128 || ++budget.nodes > 2000000) fail('CD_EXPORT_HTML_ANALYSIS_LIMIT');
    if (node.tagName === 'base') fail('CD_EXPORT_RESOURCE_BASE_UNSUPPORTED');
    const attributes = Object.hasOwn(resourceAttributes, node.tagName) ? resourceAttributes[node.tagName] : [];
    for (const attr of node.attrs || []) {
      // Candidate-list parsing is outside the observed export contract. Reject
      // the whole attribute so missing or escaping candidates cannot pass.
      if ((['img', 'source'].includes(node.tagName) && attr.name === 'srcset') || (node.tagName === 'link' && attr.name === 'imagesrcset')) fail('CD_EXPORT_RESOURCE_SRCSET_UNSUPPORTED');
      if (attributes.includes(attr.name)) check(attr.value);
    }
    const add = child => { if (++nodes > 20000) fail('CD_EXPORT_HTML_ANALYSIS_LIMIT'); pending.push([child, depth + 1]); };
    if (node.content) add(node.content);
    const children = node.childNodes || [];
    for (let i = children.length - 1; i >= 0; i--) add(children[i]);
  }
}

export function inspectClaudeDesignExportArchive(bytes, { entryPath = null } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 22 || bytes.length > MAX_BYTES) fail('CD_EXPORT_ARCHIVE_LIMIT');
  const end = bytes.length - 22;
  if (bytes.readUInt32LE(end) !== 0x06054b50) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
  const count = bytes.readUInt16LE(end + 10), centralSize = bytes.readUInt32LE(end + 12), centralOffset = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count || bytes.readUInt16LE(end + 20) || count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) fail('CD_EXPORT_ARCHIVE_UNSUPPORTED');
  if (!count || count > MAX_MEMBERS) fail('CD_EXPORT_ARCHIVE_LIMIT');
  if (centralOffset + centralSize !== end || centralOffset > end) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
  const files = [], names = new Set(), aliases = new Map();
  let central = centralOffset, localOffset = 0, total = 0;
  for (let i = 0; i < count; i++) {
    if (central + 46 > end || bytes.readUInt32LE(central) !== 0x02014b50) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
    const madeBy = bytes.readUInt16LE(central + 4), needed = bytes.readUInt16LE(central + 6), flags = bytes.readUInt16LE(central + 8), method = bytes.readUInt16LE(central + 10), crc = bytes.readUInt32LE(central + 16), size = bytes.readUInt32LE(central + 20), plain = bytes.readUInt32LE(central + 24), nameSize = bytes.readUInt16LE(central + 28), extra = bytes.readUInt16LE(central + 30), comment = bytes.readUInt16LE(central + 32), attrs = bytes.readUInt32LE(central + 38), offset = bytes.readUInt32LE(central + 42);
    if (((attrs >>> 16) & 0xf000) === 0xa000) fail('CD_EXPORT_SYMLINK');
    if (needed !== 20 || (madeBy & 0xff) !== 20 || ![0, 3].includes(madeBy >>> 8) || flags !== 0x800 || method !== 0 || extra || comment || attrs || bytes.readUInt16LE(central + 34) || bytes.readUInt16LE(central + 36) || size === 0xffffffff || plain !== size) fail('CD_EXPORT_ARCHIVE_UNSUPPORTED');
    if (!nameSize || central + 46 + nameSize > end || offset !== localOffset || offset + 30 > centralOffset || bytes.readUInt32LE(offset) !== 0x04034b50) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
    const nameBytes = bytes.subarray(central + 46, central + 46 + nameSize), name = nameBytes.toString('utf8');
    if (!Buffer.from(name).equals(nameBytes)) fail('CD_EXPORT_PATH');
    safeClaudeDesignExportPath(name);
    if (names.has(name)) fail('CD_EXPORT_DUPLICATE');
    names.add(name);
    let prefix = '';
    for (const part of name.split('/')) {
      prefix = prefix ? prefix + '/' + part : part;
      const alias = prefix.normalize('NFKC').toUpperCase().toLowerCase();
      if (aliases.has(alias) && aliases.get(alias) !== prefix) fail('CD_EXPORT_ALIAS');
      aliases.set(alias, prefix);
    }
    const dataOffset = offset + 30 + nameSize;
    if (bytes.readUInt16LE(offset + 4) !== needed || bytes.readUInt16LE(offset + 6) !== flags || bytes.readUInt16LE(offset + 8) !== method || bytes.readUInt32LE(offset + 10) !== bytes.readUInt32LE(central + 12) || bytes.readUInt32LE(offset + 14) !== crc || bytes.readUInt32LE(offset + 18) !== size || bytes.readUInt32LE(offset + 22) !== plain || bytes.readUInt16LE(offset + 26) !== nameSize || bytes.readUInt16LE(offset + 28) || dataOffset + size > centralOffset || !bytes.subarray(offset + 30, dataOffset).equals(nameBytes)) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
    if ((total += size) > MAX_BYTES) fail('CD_EXPORT_ARCHIVE_LIMIT');
    const member = Buffer.from(bytes.subarray(dataOffset, dataOffset + size));
    if (crc32(member) !== crc) fail('CD_EXPORT_ARCHIVE_CRC');
    files.push({ path: name, bytes: member });
    localOffset = dataOffset + size; central += 46 + nameSize;
  }
  if (central !== end || localOffset !== centralOffset) fail('CD_EXPORT_ARCHIVE_STRUCTURE');
  for (const name of names) {
    const segments = name.split('/');
    for (let i = 1; i < segments.length; i++) if (names.has(segments.slice(0, i).join('/'))) fail('CD_EXPORT_PATH_COLLISION');
  }
  files.sort(order);
  const htmlEntries = files.filter(f => /\.html?$/i.test(f.path));
  if (!htmlEntries.length) fail('CD_MANUAL_HTML_REQUIRED');
  if (entryPath === null) {
    if (htmlEntries.length !== 1) fail('CD_EXPORT_ENTRY_SELECTION_REQUIRED');
    entryPath = htmlEntries[0].path;
  } else safeClaudeDesignExportPath(entryPath);
  const entry = htmlEntries.find(f => f.path === entryPath);
  if (!entry) fail('CD_EXPORT_ENTRY_REQUIRED');
  const htmlBudget = {nodes: 0};
  for (const document of htmlEntries) checkHTMLResources(document, files, htmlBudget);
  const inventory = files.map(f => ({ path: f.path, sha256: sha256Bytes(f.bytes), bytes: f.bytes.length })), members = new Map(files.map(f => [f.path, f.bytes]));
  const dependencyProof = verifyMaterialDependencies({items: inventory, entry: entryPath, bytesOf: name => members.get(name)});
  return { files, entry, entryPath, inventory, dependencyProof };
}
