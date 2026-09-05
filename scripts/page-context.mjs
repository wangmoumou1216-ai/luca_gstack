import { readFile, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogDefault = '.claude/skill-os/page-library/catalog.json';
const schema = JSON.parse(await readFile(new URL('../.claude/skill-os/page-library/schema.json', import.meta.url), 'utf8'));
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

// This private walker implements only the vocabulary used by this owned schema.
function shape(value, rule, at = '$') {
  if (rule.$ref) return shape(value, schema.$defs[rule.$ref.split('/').at(-1)], at);
  if (rule.oneOf) {
    const matches = rule.oneOf.filter(option => { try { shape(value, option, at); return true; } catch { return false; } });
    if (matches.length !== 1) fail('SCHEMA_INVALID', `${at}: expected exactly one allowed shape`);
  }
  if ('const' in rule && value !== rule.const) fail('SCHEMA_INVALID', `${at}: expected ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) fail('SCHEMA_INVALID', `${at}: unsupported value`);
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (rule.type && !(rule.type === 'integer' ? Number.isSafeInteger(value) : type === rule.type)) fail('SCHEMA_INVALID', `${at}: expected ${rule.type}`);
  if (typeof value === 'number' && (!Number.isFinite(value) || (rule.minimum !== undefined && value < rule.minimum) || (rule.maximum !== undefined && value > rule.maximum) || (rule.exclusiveMinimum !== undefined && value <= rule.exclusiveMinimum))) fail('SCHEMA_INVALID', `${at}: number outside allowed bounds`);
  if (type === 'string' && ((rule.minLength && value.length < rule.minLength) || (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)))) fail('SCHEMA_INVALID', `${at}: invalid string`);
  if (type === 'array') {
    if (value.length < (rule.minItems ?? 0)) fail('SCHEMA_INVALID', `${at}: too few items`);
    if (rule.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) fail('SCHEMA_INVALID', `${at}: duplicate items`);
    if (rule.items) value.forEach((item, i) => shape(item, rule.items, `${at}[${i}]`));
  }
  if (type === 'object') {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail('SCHEMA_INVALID', `${at}.${key}: required`);
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(rule.properties ?? {}, key)) shape(value[key], rule.properties[key], `${at}.${key}`);
      else if (rule.additionalProperties === false) fail('SCHEMA_INVALID', `${at}.${key}: unknown property`);
    }
  }
}

async function confinedPath(root, ref, { source = false } = {}) {
  const base = await realpath(root);
  if (typeof ref !== 'string' || ref.includes('\\') || ref.includes('\0') || ref.split('/').includes('..')) fail('SOURCE_SCOPE', `Invalid path: ${ref}`);
  const local = relative(resolve(root), resolve(root, ref));
  if (!local || local.startsWith(`..${sep}`) || isAbsolute(local)) fail('SOURCE_SCOPE', `Path outside framework root: ${ref}`);
  if (local.split(sep).some(part => /^(?:docs|current-topic|workflow-state(?:\.[^/]*)?)$/.test(part))) fail('SOURCE_SCOPE', `Project display surfaces are not library inputs: ${ref}`);
  const target = resolve(base, local);
  if (source && (isAbsolute(ref) || !/^(framework\/|\.claude\/skill-os\/page-library\/sources\/).+\.html$/.test(ref))) fail('SOURCE_SCOPE', `Source is not a framework library HTML asset: ${ref}`);
  let cursor = base;
  for (const part of local.split(sep)) {
    cursor = resolve(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) fail('SOURCE_SYMLINK', `Symlink is not a permitted library path: ${ref}`);
  }
  if (!(await lstat(target)).isFile()) fail('SOURCE_SCOPE', `Expected a regular file: ${ref}`);
  return target;
}

const normalizedText = text => text.replace(/\s+/g, ' ').trim();
function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name) => {
    if (name[0] === '#') { const cp = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)); return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : entity; }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[name.toLowerCase()];
  });
}

function anchorsIn(html) {
  const attributes = [];
  const headings = [];
  const stack = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const restrictedChildren = { table: ['caption', 'colgroup', 'thead', 'tbody', 'tfoot'], thead: ['tr'], tbody: ['tr'], tfoot: ['tr'], tr: ['td', 'th'], colgroup: ['col'], select: ['option', 'optgroup', 'hr'], optgroup: ['option'], option: [] };
  let heading = null;
  let templateDepth = 0;
  // Raw-text blocks and comments cannot manufacture real source anchors.
  const tokens = html.match(/<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|title|xmp|iframe|noembed|noframes|noscript)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)|<plaintext\b[^>]*>[\s\S]*$|<\/?[a-z][a-z0-9:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+|</gi) ?? [];
  for (const token of tokens) {
    if (/^<!--|^<(script|style|textarea|title|xmp|iframe|noembed|noframes|noscript|plaintext)\b/i.test(token)) continue;
    if (/^<template\b/i.test(token)) { templateDepth++; continue; }
    if (/^<\/template\b/i.test(token)) { templateDepth = Math.max(0, templateDepth - 1); continue; }
    if (templateDepth) continue;
    const tag = token.match(/^<(\/?)([a-z][a-z0-9:-]*)\b/i);
    if (!tag) { if (heading) heading.text += decode(token); continue; }
    const name = tag[2].toLowerCase();
    if (tag[1]) {
      if (voidTags.has(name)) continue;
      if (stack.at(-1)?.tag !== name) fail('SOURCE_STRUCTURE', `Cannot establish static region ancestry across mismatched </${name}>`);
      if (heading?.tag === name) { headings.push({ ...heading, text: normalizedText(heading.text) }); heading = null; }
      stack.pop();
      continue;
    }
    const parent = stack.at(-1) ?? null;
    const node = { tag: name, parent, foreign: name === 'svg' || name === 'math' || Boolean(parent?.foreign) };
    // Browser repair can change ancestry despite balanced source tags; refuse those ambiguous forms.
    if (!node.foreign && stack.some(ancestor => ancestor.tag === 'p') && /^(address|article|aside|blockquote|details|dialog|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|main|menu|nav|ol|p|pre|search|section|table|ul)$/.test(name)) fail('SOURCE_STRUCTURE', `Implicit paragraph closing before <${name}> prevents static ancestry proof`);
    if (!node.foreign && restrictedChildren[parent?.tag] && !restrictedChildren[parent.tag].includes(name)) fail('SOURCE_STRUCTURE', `Browser may reparent or ignore <${name}> inside <${parent.tag}>`);
    if (!node.foreign && ['a', 'button', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(name) && stack.some(ancestor => ancestor.tag === name || (/^h[1-6]$/.test(name) && /^h[1-6]$/.test(ancestor.tag)))) fail('SOURCE_STRUCTURE', `Nested <${name}> prevents static ancestry proof`);
    if (!node.foreign && ['li', 'dt', 'dd'].includes(name)) {
      const scopeTags = name === 'li' ? ['ul', 'ol'] : ['dl'];
      for (let index = stack.length - 1; index >= 0 && !scopeTags.includes(stack[index].tag); index--) {
        if (stack[index].tag === name || (name !== 'li' && ['dt', 'dd'].includes(stack[index].tag))) fail('SOURCE_STRUCTURE', `Implicit list-item closing before <${name}> prevents static ancestry proof`);
      }
    }
    const seen = new Set();
    for (const match of token.slice(tag[0].length, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const attr = match[1].toLowerCase();
      if (!seen.has(attr) && ['id', 'data-module'].includes(attr)) attributes.push({ name: attr, value: decode(match[2] ?? match[3] ?? match[4] ?? ''), node });
      seen.add(attr);
    }
    if (name === 'h1' || name === 'h2') heading = { tag: name, text: '', node };
    if (!voidTags.has(name) && !(node.foreign && /\/\s*>$/.test(token))) stack.push(node);
  }
  return { attributes, headings };
}

async function validateCatalog(catalog, root) {
  shape(catalog, schema.$defs.catalog);
  const ids = new Set(catalog.retired_page_ids);
  // Validate every path before reading any source bytes.
  const paths = [];
  for (const page of catalog.pages) {
    if (ids.has(page.page_id)) fail('PAGE_ID_REUSED', `Duplicate or retired page_id: ${page.page_id}`);
    ids.add(page.page_id);
    paths.push(await confinedPath(root, page.source_ref, { source: true }));
    const regions = new Map();
    for (const region of page.regions) {
      if (regions.has(region.region_id)) fail('REGION_ID_REUSED', `${page.page_id}: duplicate region_id ${region.region_id}`);
      regions.set(region.region_id, region);
    }
    for (const region of page.regions) {
      const ancestors = new Set([region.region_id]);
      let parent = region.parent_id;
      while (parent !== null) {
        if (!regions.has(parent)) fail('REGION_PARENT', `${page.page_id}/${region.region_id}: missing parent ${parent}`);
        if (ancestors.has(parent)) fail('REGION_CYCLE', `${page.page_id}/${region.region_id}: cyclic parent`);
        ancestors.add(parent);
        parent = regions.get(parent).parent_id;
      }
    }
  }
  for (let i = 0; i < catalog.pages.length; i++) {
    const page = catalog.pages[i];
    const bytes = await readFile(paths[i]);
    if (createHash('sha256').update(bytes).digest('hex') !== page.source_hash) fail('SOURCE_HASH', `${page.page_id}: source changed; refresh catalog and reconfirm selection`);
    const anchors = anchorsIn(bytes.toString('utf8'));
    const regionNodes = new Map();
    for (const region of page.regions) {
      const anchor = region.anchor;
      const matches = anchor.kind === 'attribute' ? anchors.attributes.filter(a => a.name === anchor.name && a.value === anchor.value) : anchors.headings.filter(a => a.tag === anchor.tag && a.text === normalizedText(anchor.text));
      if (matches.length !== 1) fail('REGION_ANCHOR', `${page.page_id}/${region.region_id}: anchor must match exactly once; found ${matches.length}`);
      let node = matches[0].node;
      for (let level = 0; level < (anchor.ancestor_levels ?? 0); level++) {
        node = node.parent;
        if (!node) fail('REGION_ANCESTOR', `${page.page_id}/${region.region_id}: heading ancestor does not exist`);
      }
      regionNodes.set(region.region_id, node);
    }
    for (const region of page.regions) {
      if (region.parent_id === null) continue;
      const expectedParent = regionNodes.get(region.parent_id);
      let ancestor = regionNodes.get(region.region_id).parent;
      while (ancestor && ancestor !== expectedParent) ancestor = ancestor.parent;
      if (ancestor !== expectedParent) fail('REGION_CONTAINMENT', `${page.page_id}/${region.region_id}: source region is not contained by parent ${region.parent_id}`);
    }
  }
  return catalog;
}

export async function loadCatalog({ root = repoRoot, catalogPath = catalogDefault } = {}) {
  return validateCatalog(JSON.parse(await readFile(await confinedPath(root, catalogPath), 'utf8')), root);
}

export function candidates(catalog, query, { scope = 'framework' } = {}) {
  if (scope !== 'framework') fail('SOURCE_SCOPE', 'Project-specific sources require Project Gate');
  shape(catalog, schema.$defs.catalog);
  shape(query, schema.$defs.text);
  const input = query.normalize('NFKC').toLocaleLowerCase();
  function matches(item) {
    const terms = [item.name, ...item.aliases, item.intent];
    const matched_terms = [...new Set(terms.filter(term => input.includes(term.normalize('NFKC').toLocaleLowerCase())))];
    return { matched_terms, reasons: matched_terms.map(term => `Catalog text occurs in query: ${term}`) };
  }
  return catalog.pages.filter(page => page.scope === scope).map(page => {
    const own = matches(page);
    const regions = page.regions.map(region => ({ region_id: region.region_id, name: region.name, ...matches(region) })).filter(region => region.matched_terms.length);
    return { page_id: page.page_id, name: page.name, source_hash: page.source_hash, matched_terms: [...new Set([...own.matched_terms, ...regions.flatMap(region => region.matched_terms)])], reasons: [...own.reasons, ...regions.flatMap(region => region.reasons.map(reason => `${region.region_id}: ${reason}`))], regions };
  }).filter(page => page.matched_terms.length);
}

export async function readPageSource(page, { root = repoRoot } = {}) {
  shape(page, schema.$defs.page);
  const path = await confinedPath(root, page.source_ref, { source: true });
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== page.source_hash) fail('SOURCE_HASH', `${page.page_id}: source changed; refresh catalog and reconfirm selection`);
  return { path, bytes };
}

export async function validateSelection(catalog, record, { root = repoRoot, preview } = {}) {
  shape(record, schema.$defs.selection);
  if (record.status === 'pending') fail('PENDING_SELECTION', 'Wait for an actual user page/location decision');
  if (record.status === 'declined' || record.status === 'no-match') {
    if (Object.keys(record).some(key => !['schema_version', 'status', 'reference'].includes(key))) fail('REFERENCE_CONFLICT', 'No-reference decisions cannot carry an adopted page');
    return { schema_version: 1, status: record.status, reference: 'none' };
  }
  if (record.reference || (record.kind !== 'region' && record.region_id) || (record.kind !== 'box' && (record.screenshot || record.selection))) fail('REFERENCE_CONFLICT', 'Selection fields conflict with the chosen kind');
  if (!Number.isFinite(Date.parse(record.confirmation.confirmed_at))) fail('CONFIRMATION_INVALID', 'Confirmation date is invalid');
  await validateCatalog(catalog, root);
  const page = catalog.pages.find(candidate => candidate.page_id === record.page_id);
  if (!page) fail('UNKNOWN_PAGE', `Unknown page: ${record.page_id}`);
  if (page.source_hash !== record.source_hash) fail('STALE_SELECTION', 'Selection source hash differs from the current catalog; reconfirm');
  const reference = { page_id: page.page_id, source_ref: page.source_ref, source_hash: page.source_hash, viewport: page.viewport, kind: record.kind };
  if (record.kind === 'region') {
    reference.region = page.regions.find(region => region.region_id === record.region_id);
    if (!reference.region) fail('UNKNOWN_REGION', `Unknown region for ${page.page_id}: ${record.region_id}`);
  }
  if (record.kind === 'box') {
    if (!preview) fail('PREVIEW_REQUIRED', 'Box selection requires independently generated preview metadata');
    const manifest = preview.manifest ?? preview;
    shape(manifest, schema.$defs.preview);
    const sameViewport = (a, b) => a.width === b.width && a.height === b.height;
    const expected = manifest.screenshot;
    const actual = record.screenshot;
    if (manifest.page_id !== page.page_id || manifest.source_hash !== page.source_hash || expected.source_hash !== page.source_hash || actual.source_hash !== page.source_hash || !sameViewport(manifest.viewport, page.viewport) || !sameViewport(expected.viewport, page.viewport) || !sameViewport(actual.viewport, page.viewport) || expected.sha256 !== actual.sha256 || expected.width !== actual.width || expected.height !== actual.height) fail('STALE_SCREENSHOT', 'Screenshot does not match the independently supplied current preview');
    if (preview.png) {
      const png = preview.png;
      if (!Buffer.isBuffer(png) || png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || createHash('sha256').update(png).digest('hex') !== expected.sha256 || png.readUInt32BE(16) !== expected.width || png.readUInt32BE(20) !== expected.height) fail('STALE_SCREENSHOT', 'PNG bytes differ from preview digest or dimensions');
    }
    const input = record.selection;
    const box = { x: (input.client_x - input.origin_x) / input.scale + input.scroll_x, y: (input.client_y - input.origin_y) / input.scale + input.scroll_y, width: input.width / input.scale, height: input.height / input.scale };
    if (Object.values(box).some(value => !Number.isFinite(value)) || box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || box.x + box.width > expected.width || box.y + box.height > expected.height) fail('BOX_BOUNDS', 'Converted selection is outside screenshot bounds');
    reference.box = { ...box, screenshot: actual };
  }
  // A well-formed evidence record is not proof of a real user reply; the caller owns that gate.
  return { schema_version: 1, status: 'confirmed', reference, confirmation: record.confirmation };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--root', '--catalog', '--query', '--scope', '--record', '--preview'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) fail('CLI_USAGE', 'Usage: page-context.mjs validate|candidates|selection [--query text|--record path] [--preview path] [--root path] [--catalog path]');
    options[args[i]] = args[i + 1];
  }
  if (!['validate', 'candidates', 'selection'].includes(command)) fail('CLI_USAGE', 'Expected validate, candidates or selection command');
  const root = options['--root'] ?? repoRoot;
  const catalog = await loadCatalog({ root, catalogPath: options['--catalog'] ?? catalogDefault });
  if (command === 'candidates') return { candidates: candidates(catalog, options['--query'], { scope: options['--scope'] ?? 'framework' }), interpretation: 'Lexical hints only; agent must judge semantic fit and obtain user confirmation.' };
  if (command === 'selection') {
    if (!options['--record']) fail('CLI_USAGE', 'selection requires --record path');
    const record = JSON.parse(await readFile(await confinedPath(root, options['--record']), 'utf8'));
    const preview = options['--preview'] ? JSON.parse(await readFile(await confinedPath(root, options['--preview']), 'utf8')) : undefined;
    return validateSelection(catalog, record, { root, preview });
  }
  return { valid: true, schema_version: catalog.schema_version, pages: catalog.pages.length, regions: catalog.pages.reduce((count, page) => count + page.regions.length, 0) };
}

// Library callers may use stdin or a virtual launcher; only a real entry file runs the CLI.
const entryPath = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (entryPath === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await main())); }
  catch (error) { console.log(JSON.stringify({ error: { code: error.code ?? 'INVALID_INPUT', message: error.message } })); process.exitCode = 1; }
}
