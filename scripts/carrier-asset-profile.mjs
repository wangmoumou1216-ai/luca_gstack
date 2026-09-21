import { createHash } from 'node:crypto';

// This module deliberately accepts bytes and explicit records, never filesystem
// paths.  A caller can therefore prove an asset closure without walking or
// staging an arbitrary template directory.
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = new TextDecoder('utf-8', { fatal: true });
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const MIME_BY_EXTENSION = Object.freeze({
  css: 'text/css; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', woff: 'font/woff',
  woff2: 'font/woff2', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
  ogg: 'audio/ogg', svg: 'image/svg+xml'
});
const EMBEDDED_MIME_LIMITS = Object.freeze({
  'image/png': 2 * 1024 * 1024,
  'image/jpeg': 2 * 1024 * 1024,
  'image/gif': 2 * 1024 * 1024,
  'image/webp': 2 * 1024 * 1024,
  'image/svg+xml': 2 * 1024 * 1024,
  'font/woff': 2 * 1024 * 1024,
  'font/woff2': 2 * 1024 * 1024
});

export const ASSET_PROFILES = Object.freeze({
  // The initial profile is intentionally narrower than a browser.  In
  // particular it does not try to interpret data: URLs or active markup.
  'p0-static-v1': Object.freeze({ id: 'p0-static-v1', embedded: false, inertActiveContent: false, maxFiles: 128, maxBytes: 16 * 1024 * 1024 }),
  // This versioned opt-in preserves the exact template bytes.  It records a
  // bounded subset of data: payloads as evidence, but never converts them into
  // files or executes active content.
  'structural-embedded-v1': Object.freeze({ id: 'structural-embedded-v1', embedded: true, inertActiveContent: true, maxFiles: 128, maxBytes: 16 * 1024 * 1024, maxEmbedded: 16 * 1024 * 1024, maxEmbeddedEntries: 64 })
});

export function safeRelativePath(value, { requiredPrefix } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240 || /[^\x21-\x7e]/.test(value) || /[\\\0%]/.test(value) || value.startsWith('/') || value.endsWith('/') || value.includes('//')) fail('UNSAFE_PATH', 'Paths must be short ASCII POSIX-relative paths without traversal or encoding ambiguity');
  const parts = value.split('/');
  if (parts.some(part => !SAFE_SEGMENT.test(part) || part === '.' || part === '..' || RESERVED.test(part))) fail('UNSAFE_PATH', `Unsafe path: ${value}`);
  const normalized = parts.join('/');
  if (requiredPrefix && !normalized.startsWith(requiredPrefix)) fail('UNSAFE_PATH', `Path must be inside ${requiredPrefix}`);
  return normalized;
}

export function fileRecord(path, mediaType, bytes) {
  const safe = safeRelativePath(path);
  if (typeof mediaType !== 'string' || !/^[A-Za-z0-9!#$&^_.+\-]+\/[A-Za-z0-9!#$&^_.+\-]+(?:; charset=utf-8)?$/.test(mediaType)) fail('MEDIA_TYPE_REQUIRED', `Unsupported media type for ${safe}`);
  if (!Buffer.isBuffer(bytes)) fail('BYTES_REQUIRED', `Bytes are required for ${safe}`);
  return Object.freeze({ path: safe, media_type: mediaType, bytes: bytes.length, sha256: sha256(bytes) });
}

function mimeFor(path, declared) {
  const extension = path.split('.').at(-1).toLowerCase();
  const expected = MIME_BY_EXTENSION[extension];
  if (!expected) fail('UNSUPPORTED_ASSET', `Asset extension is not in this profile: ${path}`);
  if (declared !== undefined && declared !== expected) fail('MEDIA_TYPE_MISMATCH', `Declared media type differs from ${path}`);
  return expected;
}

function canonicalNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('NON_CANONICAL_NUMBER', 'Canonical handoff JSON only admits non-negative safe integer numbers');
  return String(value);
}

// A small JCS-like encoder for the deliberately narrow manifest vocabulary.
// Keeping number syntax narrow avoids accepting a parsed-but-not-round-trippable
// control document while still giving deterministic sorted UTF-8 JSON.
export function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return canonicalNumber(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  fail('CANONICAL_JSON_REQUIRED', 'Manifest values must be JSON primitives, arrays, or plain objects');
}

function skipWhitespace(state) { while (/[\t\n\r ]/.test(state.text[state.index] ?? '')) state.index += 1; }
function parseString(state) {
  const start = state.index;
  if (state.text[state.index] !== '"') fail('JSON_INVALID', 'Expected JSON string');
  state.index += 1;
  let escaped = false;
  while (state.index < state.text.length) {
    const char = state.text[state.index++];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') {
      const raw = state.text.slice(start, state.index);
      let decoded;
      try { decoded = JSON.parse(raw); } catch { fail('JSON_INVALID', 'Invalid JSON string'); }
      if (JSON.stringify(decoded) !== raw) fail('JSON_NON_CANONICAL', 'JSON strings must use canonical escaping');
      return decoded;
    }
    if (char < ' ') fail('JSON_INVALID', 'Control character in JSON string');
  }
  fail('JSON_INVALID', 'Unclosed JSON string');
}
function parseValue(state) {
  skipWhitespace(state);
  const char = state.text[state.index];
  if (char === '"') return parseString(state);
  if (char === '{') {
    state.index += 1; skipWhitespace(state);
    const value = {}; const keys = new Set();
    if (state.text[state.index] === '}') { state.index += 1; return value; }
    while (true) {
      skipWhitespace(state); const key = parseString(state);
      if (keys.has(key)) fail('JSON_DUPLICATE_KEY', `Duplicate JSON key: ${key}`);
      keys.add(key); skipWhitespace(state);
      if (state.text[state.index++] !== ':') fail('JSON_INVALID', 'Expected colon');
      value[key] = parseValue(state); skipWhitespace(state);
      const separator = state.text[state.index++];
      if (separator === '}') return value;
      if (separator !== ',') fail('JSON_INVALID', 'Expected object separator');
    }
  }
  if (char === '[') {
    state.index += 1; skipWhitespace(state);
    const values = [];
    if (state.text[state.index] === ']') { state.index += 1; return values; }
    while (true) {
      values.push(parseValue(state)); skipWhitespace(state);
      const separator = state.text[state.index++];
      if (separator === ']') return values;
      if (separator !== ',') fail('JSON_INVALID', 'Expected array separator');
    }
  }
  for (const [literal, value] of [['true', true], ['false', false], ['null', null]]) {
    if (state.text.startsWith(literal, state.index)) { state.index += literal.length; return value; }
  }
  const match = state.text.slice(state.index).match(/^(?:0|[1-9][0-9]*)/);
  if (!match) fail('JSON_INVALID', 'Only canonical non-negative integer numbers are supported');
  const value = Number(match[0]);
  if (!Number.isSafeInteger(value) || canonicalNumber(value) !== match[0]) fail('JSON_NON_CANONICAL', 'Non-canonical JSON number');
  state.index += match[0].length;
  return value;
}

export function parseCanonicalJson(bytes) {
  let source;
  try { source = utf8.decode(Buffer.from(bytes)); } catch { fail('JSON_UTF8_REQUIRED', 'Control JSON must be valid UTF-8'); }
  const state = { text: source, index: 0 };
  const value = parseValue(state); skipWhitespace(state);
  if (state.index !== source.length) fail('JSON_INVALID', 'Trailing data after JSON value');
  return value;
}

function sortedRecords(records) {
  if (!Array.isArray(records)) fail('FILE_RECORDS_REQUIRED', 'A complete file-record array is required');
  const normalized = records.map(record => {
    if (!record || typeof record !== 'object' || typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes < 0) fail('FILE_RECORD_INVALID', 'Each record needs a path, media type, bytes and SHA-256');
    return { path: safeRelativePath(record.path), media_type: record.media_type, bytes: record.bytes, sha256: record.sha256 };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(normalized.map(item => item.path)).size !== normalized.length) fail('FILE_RECORD_DUPLICATE', 'A manifest cannot contain duplicate paths');
  return normalized;
}

function manifestBody(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('MANIFEST_REQUIRED', 'A manifest object is required');
  const { handoff_bundle_hash, manifest_sha256, signature, derived_display, ...body } = manifest;
  return body;
}

export function canonicalManifestHash(manifest, records) {
  const body = canonicalJson(manifestBody(manifest));
  const files = canonicalJson(sortedRecords(records));
  return sha256(Buffer.from(`luca-template-handoff/v1\0${body}\n${files}`, 'utf8'));
}

function attrsFrom(token, name) {
  const tail = token.slice(1 + name.length, token.endsWith('/>') ? -2 : -1);
  const attrs = new Map(); let index = 0;
  while (index < tail.length) {
    while (/\s/.test(tail[index] ?? '')) index += 1;
    if (index >= tail.length) break;
    const nameMatch = tail.slice(index).match(/^[^\s=/>]+/);
    if (!nameMatch) fail('HTML_UNSUPPORTED_SYNTAX', 'Cannot parse an HTML attribute safely');
    const attr = nameMatch[0].toLowerCase(); index += nameMatch[0].length;
    while (/\s/.test(tail[index] ?? '')) index += 1;
    let value = '';
    if (tail[index] === '=') {
      index += 1; while (/\s/.test(tail[index] ?? '')) index += 1;
      const quote = tail[index];
      if (quote === '"' || quote === "'") {
        const end = tail.indexOf(quote, index + 1);
        if (end < 0) fail('HTML_UNSUPPORTED_SYNTAX', 'Unclosed HTML attribute');
        value = tail.slice(index + 1, end); index = end + 1;
      } else {
        const valueMatch = tail.slice(index).match(/^[^\s"'=<>`]+/);
        if (!valueMatch) fail('HTML_UNSUPPORTED_SYNTAX', 'Cannot parse an HTML attribute value safely');
        value = valueMatch[0]; index += value.length;
      }
    }
    if (attrs.has(attr)) fail('HTML_UNSUPPORTED_SYNTAX', `Duplicate HTML attribute: ${attr}`);
    attrs.set(attr, value);
  }
  return attrs;
}

function strictCssSafe(bytes, location) {
  let css;
  try { css = utf8.decode(bytes); } catch { fail('CSS_UTF8_REQUIRED', `CSS must be UTF-8: ${location}`); }
  // Comments and escapes make a small resolver unable to prove that url()/an
  // @import/image-set was not obfuscated. HTML character references inside a
  // style attribute are decoded before CSS parsing, so the byte scanner must
  // also reject them rather than mistake u&#114;l(...) for inert text. Fail
  // closed until a dedicated CSS parser lands.
  if (/\0|\/\*|\\|@|&(?:#(?:x[0-9a-f]+|[0-9]+);?|[a-z][a-z0-9]+;)|url\s*\(|(?:-webkit-)?image-set\s*\(|(?:expression|behavior|-moz-binding)\s*\(|(?:data|javascript|https?|file|blob):/i.test(css)) fail('CSS_UNSUPPORTED', `Unsupported CSS syntax or external dependency: ${location}`);
}

function parseDataUri(value, location, profile, totals, { allowOpaque = false } = {}) {
  if (!profile.embedded) fail('DATA_URI_FORBIDDEN', `Data URI is forbidden by ${profile.id}: ${location}`);
  const strict = value.match(/^data:([A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  let mediaType; let decoded;
  if (strict) {
    mediaType = strict[1];
    decoded = Buffer.from(strict[2], 'base64');
    if (decoded.toString('base64') !== strict[2]) fail('DATA_URI_LIMIT', `Data URI has non-canonical base64: ${location}`);
  } else if (allowOpaque) {
    const opaque = value.match(/^data:([^,]*),([\s\S]*)$/);
    if (!opaque) fail('DATA_URI_UNSUPPORTED', `Data URI MIME or encoding is unsupported: ${location}`);
    const metadata = opaque[1].split(';');
    mediaType = metadata[0] || 'text/plain';
    if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(mediaType)) fail('DATA_URI_UNSUPPORTED', `Data URI MIME is invalid: ${location}`);
    if (metadata.at(-1)?.toLowerCase() === 'base64') {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(opaque[2])) fail('DATA_URI_UNSUPPORTED', `Data URI base64 is invalid: ${location}`);
      decoded = Buffer.from(opaque[2], 'base64');
      if (decoded.toString('base64') !== opaque[2]) fail('DATA_URI_LIMIT', `Data URI has non-canonical base64: ${location}`);
    } else {
      if (/%(?![A-Fa-f0-9]{2})/.test(opaque[2])) fail('DATA_URI_UNSUPPORTED', `Data URI percent encoding is invalid: ${location}`);
      try { decoded = Buffer.from(decodeURIComponent(opaque[2]), 'utf8'); }
      catch { fail('DATA_URI_UNSUPPORTED', `Data URI percent encoding is invalid: ${location}`); }
    }
  } else fail('DATA_URI_UNSUPPORTED', `Data URI MIME or encoding is unsupported: ${location}`);
  if (!allowOpaque && !Object.hasOwn(EMBEDDED_MIME_LIMITS, mediaType)) fail('DATA_URI_UNSUPPORTED', `Data URI MIME or encoding is unsupported: ${location}`);
  const limit = EMBEDDED_MIME_LIMITS[mediaType] ?? 2 * 1024 * 1024;
  if ((!allowOpaque && decoded.length === 0) || decoded.length > limit) fail('DATA_URI_LIMIT', `Data URI exceeds its bounded profile: ${location}`);
  totals.embedded += decoded.length; totals.entries += 1;
  if (totals.embedded > profile.maxEmbedded || totals.entries > profile.maxEmbeddedEntries) fail('DATA_URI_LIMIT', 'Embedded data exceeds the profile total limit');
  return { location, media_type: mediaType, bytes: decoded.length, sha256: sha256(decoded) };
}

function assertInertReceipt(receipt, templateSha256) {
  if (!receipt || receipt.version !== 1 || receipt.kind !== 'inert-storage' || receipt.template_sha256 !== templateSha256 || typeof receipt.receipt_ref !== 'string' || receipt.receipt_ref.trim() === '') fail('INERT_STORAGE_RECEIPT_REQUIRED', 'Active inline content needs a separately verified inert-storage capability receipt bound to this raw template');
  return Object.freeze({ version: 1, kind: 'inert-storage', template_sha256: templateSha256, receipt_ref: receipt.receipt_ref });
}

export function validateInertStorageReceipt(receipt, { templateSha256, handoffId } = {}) {
  const base = assertInertReceipt(receipt, templateSha256);
  if (!handoffId) return base;
  if (receipt.handoff_id !== handoffId) fail('INERT_STORAGE_RECEIPT_REQUIRED', 'Inert-storage receipt must bind the exact handoff ID before staging');
  return Object.freeze({ ...base, handoff_id: handoffId });
}

function profileFor(id) {
  if (!Object.hasOwn(ASSET_PROFILES, id)) fail('ASSET_PROFILE_UNKNOWN', `Unknown asset profile: ${id}`);
  return ASSET_PROFILES[id];
}

function materialAssets(assets, profile) {
  if (!Array.isArray(assets) || assets.length > profile.maxFiles) fail('ASSET_LIMIT', 'Asset list is missing or exceeds the profile file limit');
  const map = new Map(); let total = 0;
  for (const asset of assets) {
    const path = safeRelativePath(asset?.path, { requiredPrefix: 'assets/' });
    if (!Buffer.isBuffer(asset?.bytes)) fail('BYTES_REQUIRED', `Bytes are required for ${path}`);
    const key = path.toLowerCase();
    if (map.has(key)) fail('ASSET_PATH_COLLISION', `Duplicate/case-colliding asset path: ${path}`);
    const mediaType = mimeFor(path, asset.media_type ?? asset.mediaType);
    if (mediaType === 'image/svg+xml' && !profile.inertActiveContent) fail('SVG_UNSUPPORTED', 'SVG is not a safe P0 structural asset');
    total += asset.bytes.length;
    if (total > profile.maxBytes) fail('ASSET_LIMIT', 'Asset bytes exceed the profile total limit');
    map.set(key, { path, media_type: mediaType, bytes: Buffer.from(asset.bytes) });
  }
  return map;
}

function navigationSafe(value, location) {
  if (value === '' || value.startsWith('#')) return;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) fail('REMOTE_URL_FORBIDDEN', `External navigation is forbidden in a structural carrier: ${location}`);
  safeRelativePath(value);
}

function findingRecorder() {
  const findings = new Map();
  return {
    add(kind, location, reference, offset) {
      const normalizedReference = typeof reference === 'string' && reference.length <= 240 ? reference : undefined;
      const key = canonicalJson({ kind, location, reference: normalizedReference ?? null });
      const current = findings.get(key) ?? { kind, location, count: 0, sample_offsets: [] };
      current.count += 1;
      if (normalizedReference !== undefined) current.reference = normalizedReference;
      if (Number.isSafeInteger(offset) && current.sample_offsets.length < 5) current.sample_offsets.push(offset);
      findings.set(key, current);
      if (findings.size > 4096) fail('INERT_FINDING_LIMIT', 'Inert structural findings exceed the bounded profile');
    },
    values() {
      return [...findings.values()].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
    }
  };
}

function structuralCssScan(bytes, location, offset, context) {
  let css;
  try { css = utf8.decode(bytes); } catch { fail('CSS_UTF8_REQUIRED', `CSS must be UTF-8: ${location}`); }
  if (css.includes('\0')) fail('CSS_UNSUPPORTED', `NUL is not valid inert CSS evidence: ${location}`);
  for (const match of css.matchAll(/\\|&(?:#(?:x[0-9a-f]+|[0-9]+);?|[a-z][a-z0-9]+;)/gi)) context.findings.add('css_encoded_syntax', location, match[0], offset + match.index);
  for (const match of css.matchAll(/(?:expression|behavior|-moz-binding)\s*\(/gi)) context.findings.add('potential_css_execution', location, match[0], offset + match.index);
  for (const match of css.matchAll(/@import\b/gi)) context.findings.add('css_import', location, '@import', offset + match.index);
  for (const match of css.matchAll(/(?:-webkit-)?image-set\s*\(/gi)) context.findings.add('css_image_set', location, match[0], offset + match.index);

  const starts = [...css.matchAll(/url\s*\(/gi)];
  const urls = [...css.matchAll(/url\s*\(\s*(?:(["'])([\s\S]*?)\1|([^)]*?))\s*\)/gi)];
  if (starts.length !== urls.length) fail('CSS_UNSUPPORTED', `Cannot safely delimit every CSS url(): ${location}`);
  for (const match of urls) {
    const value = (match[2] ?? match[3] ?? '').trim();
    const itemOffset = offset + match.index;
    if (!value) fail('REFERENCE_INVALID', `Empty CSS resource reference: ${location}`);
    if (/^data:/i.test(value)) {
      const entry = parseDataUri(value, `${location}:url`, context.profile, context.totals, { allowOpaque: true });
      context.embedded.push(entry);
      context.findings.add('css_data_url', location, entry.media_type, itemOffset);
      if (entry.media_type === 'image/svg+xml') context.findings.add('svg_content', location, 'data:image/svg+xml', itemOffset);
      if (!Object.hasOwn(EMBEDDED_MIME_LIMITS, entry.media_type)) context.findings.add('opaque_embedded_mime', location, entry.media_type, itemOffset);
      continue;
    }
    if (/^(?:javascript|vbscript|file|blob):/i.test(value)) {
      context.findings.add('potential_css_execution', location, value, itemOffset);
      continue;
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      context.findings.add('external_css_url', location, value, itemOffset);
      continue;
    }
    if (value.startsWith('#')) continue;
    const asset = context.assetMap.get(value.toLowerCase());
    if (asset?.path === value) {
      context.refs.add(value.toLowerCase());
      if (asset.media_type === 'image/svg+xml') context.findings.add('svg_content', location, value, itemOffset);
      continue;
    }
    // Structural mode never follows or copies a missing path.  Traversal,
    // query strings and root-relative references remain inert raw evidence.
    context.findings.add('missing_visual_css_url', location, value, itemOffset);
  }
}

// Resolves only syntax which this module can prove.  It never opens a local
// path, executes markup, or copies an unreferenced file.
export function resolveAssetClosure({ baseTemplate, assets = [], profile: profileId = 'p0-static-v1', inertStorageReceipt } = {}) {
  if (!Buffer.isBuffer(baseTemplate) || baseTemplate.length === 0) fail('BASE_TEMPLATE_REQUIRED', 'Raw base-template bytes are required');
  const profile = profileFor(profileId);
  if (baseTemplate.length > profile.maxBytes) fail('ASSET_LIMIT', 'Base template exceeds the profile total limit');
  let html;
  try { html = utf8.decode(baseTemplate); } catch { fail('HTML_UTF8_REQUIRED', 'Template HTML must be valid UTF-8'); }
  if (html.includes('\0')) fail('HTML_UNSUPPORTED_SYNTAX', 'NUL is not valid HTML evidence');
  if (!profile.inertActiveContent && /<\/?(?:iframe|object|embed|base)\b/i.test(html)) fail('HTML_UNSUPPORTED_SYNTAX', 'Embedded browsing/object syntax is not a safe structural carrier');
  const assetMap = materialAssets(assets, profile);
  const refs = new Set(); const embedded = []; const totals = { embedded: 0, entries: 0 };
  const active = { script_tags: 0, event_handlers: 0, potential_execution: 0 };
  const findings = findingRecorder();
  const templateSha256 = sha256(baseTemplate);
  const cssContext = { assetMap, embedded, findings, profile, refs, totals };

  const register = (value, location, offset) => {
    if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) fail('REFERENCE_INVALID', `Invalid resource reference: ${location}`);
    if (/^data:/i.test(value)) {
      const entry = parseDataUri(value, location, profile, totals, { allowOpaque: profile.inertActiveContent });
      embedded.push(entry);
      if (entry.media_type === 'image/svg+xml') findings.add('svg_content', location, 'data:image/svg+xml', offset);
      if (!Object.hasOwn(EMBEDDED_MIME_LIMITS, entry.media_type)) findings.add('opaque_embedded_mime', location, entry.media_type, offset);
      return;
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      if (!profile.inertActiveContent) fail('REMOTE_URL_FORBIDDEN', `Remote/protocol URL is forbidden: ${location}`);
      findings.add(/^(?:javascript|vbscript|file|blob):/i.test(value) ? 'potential_resource_execution' : 'external_resource_url', location, value, offset);
      active.potential_execution += 1;
      return;
    }
    let path;
    try { path = safeRelativePath(value, { requiredPrefix: 'assets/' }); }
    catch (error) {
      if (!profile.inertActiveContent) throw error;
      findings.add('missing_visual_html_url', location, value, offset);
      return;
    }
    const asset = assetMap.get(path.toLowerCase());
    if (!asset || asset.path !== path) {
      if (!profile.inertActiveContent) fail('ASSET_MISSING', `Referenced asset is absent from the explicit closure: ${path}`);
      findings.add('missing_visual_html_url', location, value, offset);
      return;
    }
    refs.add(path.toLowerCase());
    if (asset.media_type === 'image/svg+xml') findings.add('svg_content', location, path, offset);
    if (asset.media_type === 'text/css; charset=utf-8') {
      if (profile.inertActiveContent) structuralCssScan(asset.bytes, path, 0, cssContext);
      else strictCssSafe(asset.bytes, path);
    }
  };

  const tagPattern = /<([A-Za-z][A-Za-z0-9:-]*)(?:\s+(?:(?:"[^"]*")|(?:'[^']*')|[^'"<>])*)?\s*\/?>/g;
  for (const match of html.matchAll(tagPattern)) {
    const tag = match[1].toLowerCase(); const attrs = attrsFrom(match[0], match[1]);
    const encodedResourceAttrs = ['type', 'rel', 'as', 'http-equiv', 'src', 'href', 'xlink:href', 'srcset', 'imagesrcset', 'style', 'background', 'poster', 'lowsrc', 'dynsrc'].filter(name => /&(?:#(?:x[0-9a-f]+|[0-9]+);?|[a-z][a-z0-9]+;)/i.test(attrs.get(name) ?? ''));
    if (encodedResourceAttrs.length) {
      if (!profile.inertActiveContent) fail('HTML_UNSUPPORTED_SYNTAX', `Encoded resource-dispatch attributes are not supported: ${tag}[${encodedResourceAttrs.join(',')}]`);
      for (const name of encodedResourceAttrs) findings.add('encoded_resource_attribute', `${tag}[${name}]`, attrs.get(name), match.index);
    }
    for (const attr of attrs.keys()) if (attr.startsWith('on')) {
      active.event_handlers += 1;
      if (profile.inertActiveContent) findings.add('event_handler', `${tag}[${attr}]`, undefined, match.index);
    }
    if (attrs.has('style')) {
      if (profile.inertActiveContent) structuralCssScan(Buffer.from(attrs.get('style')), `${tag}[style]`, match.index, cssContext);
      else strictCssSafe(Buffer.from(attrs.get('style')), `${tag}[style]`);
    }
    if (attrs.has('srcset')) fail('SRCSET_UNSUPPORTED', 'srcset is not parsed by this profile');
    if (attrs.has('imagesrcset')) fail('SRCSET_UNSUPPORTED', 'imagesrcset is not parsed by this profile');
    if (['iframe', 'object', 'embed', 'base'].includes(tag)) {
      active.potential_execution += 1;
      findings.add('potential_embedded_execution', tag, attrs.get('src') ?? attrs.get('data') ?? attrs.get('href'), match.index);
      continue;
    }
    if (tag === 'svg') findings.add('svg_content', 'svg', 'inline', match.index);
    if (tag === 'script') {
      active.script_tags += 1;
      if (profile.inertActiveContent) findings.add(attrs.has('src') ? 'external_script' : 'inline_script', 'script', attrs.get('src'), match.index);
      else if (attrs.has('src')) fail('SCRIPT_EXTERNAL_FORBIDDEN', 'External scripts are forbidden by every structural profile');
      continue;
    }
    if (tag === 'style') continue;
    if (tag === 'meta' && attrs.get('http-equiv')?.trim().toLowerCase() === 'refresh') {
      if (!profile.inertActiveContent) fail('HTML_UNSUPPORTED_SYNTAX', 'Meta refresh is not a safe structural carrier');
      active.potential_execution += 1;
      findings.add('meta_refresh', 'meta[http-equiv]', attrs.get('content'), match.index);
      continue;
    }
    if (tag === 'link') {
      const rel = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
      if (!attrs.has('href') || !rel.some(value => ['stylesheet', 'icon', 'preload'].includes(value))) fail('HTML_UNSUPPORTED_SYNTAX', 'Only explicit local stylesheet/icon/preload link assets are supported');
      register(attrs.get('href'), `${tag}[href]`, match.index); continue;
    }
    if (tag === 'a' && attrs.has('href')) {
      const href = attrs.get('href');
      if (!profile.inertActiveContent) navigationSafe(href, 'a[href]');
      else if (href.startsWith('/')) findings.add('root_relative_app_navigation', 'a[href]', href, match.index);
      else if (/^(?:javascript|vbscript|data|file|blob):/i.test(href)) {
        active.potential_execution += 1;
        findings.add('potential_navigation_execution', 'a[href]', href, match.index);
      } else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) findings.add('external_navigation', 'a[href]', href, match.index);
      continue;
    }
    if ((tag === 'img' || tag === 'source' || tag === 'video' || tag === 'audio' || tag === 'track' || tag === 'image' || (tag === 'input' && attrs.get('type')?.toLowerCase() === 'image')) && attrs.has('src')) register(attrs.get('src'), `${tag}[src]`, match.index);
    // Browser fetch surfaces not expressed through the modern src/href pair.
    // Treat every legacy background attribute as a URL carrier; accepting it
    // as decorative text would let generated output bypass the asset closure.
    if (attrs.has('background')) register(attrs.get('background'), `${tag}[background]`, match.index);
    if (tag === 'video' && attrs.has('poster')) register(attrs.get('poster'), `${tag}[poster]`, match.index);
    if (tag === 'img' && attrs.has('lowsrc')) register(attrs.get('lowsrc'), `${tag}[lowsrc]`, match.index);
    if (tag === 'img' && attrs.has('dynsrc')) register(attrs.get('dynsrc'), `${tag}[dynsrc]`, match.index);
    if ((tag === 'video' || tag === 'image') && attrs.has('href')) register(attrs.get('href'), `${tag}[href]`, match.index);
    if (tag === 'use' && attrs.has('href') && !attrs.get('href').startsWith('#')) fail('SVG_UNSUPPORTED', 'External SVG use references are not supported');
  }
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)];
  if ((html.match(/<style\b/gi) ?? []).length !== styles.length) fail('HTML_UNSUPPORTED_SYNTAX', 'Unclosed style element');
  for (const style of styles) {
    if (profile.inertActiveContent) structuralCssScan(Buffer.from(style[1]), 'inline style', style.index, cssContext);
    else strictCssSafe(Buffer.from(style[1]), 'inline style');
  }
  const inertFindings = findings.values();
  if (active.script_tags || active.event_handlers || active.potential_execution || inertFindings.length) {
    if (!profile.inertActiveContent) fail('ACTIVE_CONTENT_FORBIDDEN', 'Scripts and event handlers are forbidden by the default P0 profile');
    assertInertReceipt(inertStorageReceipt, templateSha256);
  }
  if (refs.size !== assetMap.size) fail('UNREFERENCED_ASSET', 'The explicit closure contains an unreferenced asset');
  const closureAssets = [...refs].map(key => assetMap.get(key)).sort((a, b) => a.path.localeCompare(b.path));
  return Object.freeze({
    asset_profile: profile.id, raw_template_sha256: templateSha256, raw_template_bytes: baseTemplate.length,
    base_template: Buffer.from(baseTemplate), assets: closureAssets.map(asset => Object.freeze({ ...asset, bytes: Buffer.from(asset.bytes) })),
    embedded: Object.freeze(embedded.sort((a, b) => a.location.localeCompare(b.location))),
    active_content: Object.freeze(active), inert_findings: Object.freeze(inertFindings.map(item => Object.freeze(item))),
    inert_storage: active.script_tags || active.event_handlers || active.potential_execution || inertFindings.length ? assertInertReceipt(inertStorageReceipt, templateSha256) : null
  });
}

export function carrierContentHash(closure, moduleContractHash) {
  if (!closure || typeof closure !== 'object' || !/^[a-f0-9]{64}$/.test(moduleContractHash ?? '')) fail('CARRIER_CONTENT_INVALID', 'Closure and module contract hash are required');
  const records = [fileRecord('input/base-template.html', 'text/html; charset=utf-8', closure.base_template), ...closure.assets.map(asset => fileRecord(`input/${asset.path}`, asset.media_type, asset.bytes))];
  return sha256(Buffer.from(`luca-template-carrier/v1\0${canonicalJson({ asset_profile: closure.asset_profile, module_contract_hash: moduleContractHash, embedded: closure.embedded, inert_findings: closure.inert_findings ?? [], files: sortedRecords(records) })}`, 'utf8'));
}

export const sha256Bytes = sha256;
