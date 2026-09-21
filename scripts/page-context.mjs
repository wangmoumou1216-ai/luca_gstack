import { readFile, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectCarrierPacket } from './carrier-packet.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogDefault = '.claude/skill-os/page-library/catalog.json';
const schema = JSON.parse(await readFile(new URL('../.claude/skill-os/page-library/schema.json', import.meta.url), 'utf8'));
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('CANONICAL_INPUT', 'Non-finite values cannot enter a binding hash');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  fail('CANONICAL_INPUT', 'Unsupported value in canonical JSON');
}

const sha256 = value => createHash('sha256').update(value).digest('hex');

function moduleContractBody(page) {
  return {
    contract_version: 2,
    page_id: page.page_id,
    source_ref: page.source_ref,
    source_hash: page.source_hash,
    modules: page.modules,
    slots: page.slots,
    state_support: page.state_support ?? [],
  };
}

export function computeModuleContractHash(page) {
  return sha256(`luca-page-library-module-contract/v2\0${canonicalJson(moduleContractBody(page))}`);
}

export function computeBindingHash({ frozen_packet, binding }) {
  return sha256(`luca-page-context-binding/v2\0${canonicalJson({ frozen_packet, binding })}`);
}

export function computeCatalogHash(catalog) {
  return sha256(`luca-page-catalog/v1\0${canonicalJson(catalog)}`);
}

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

function resolveAnchor(anchors, anchor, code, label) {
  const matches = anchor.kind === 'attribute'
    ? anchors.attributes.filter(candidate => candidate.name === anchor.name && candidate.value === anchor.value)
    : anchors.headings.filter(candidate => candidate.tag === anchor.tag && candidate.text === normalizedText(anchor.text));
  if (matches.length !== 1) fail(code, `${label}: anchor must match exactly once; found ${matches.length}`);
  let node = matches[0].node;
  for (let level = 0; level < (anchor.ancestor_levels ?? 0); level++) {
    node = node.parent;
    if (!node) fail(code, `${label}: heading ancestor does not exist`);
  }
  return node;
}

function containsNode(ancestor, node) {
  for (let cursor = node; cursor; cursor = cursor.parent) if (cursor === ancestor) return true;
  return false;
}

function assertAcyclicParents(items, idKey, parentKey, missingCode, cycleCode, label) {
  const byId = new Map();
  for (const item of items) {
    if (byId.has(item[idKey])) fail('MODULE_ID_REUSED', `${label}: duplicate ${idKey} ${item[idKey]}`);
    byId.set(item[idKey], item);
  }
  for (const item of items) {
    const seen = new Set([item[idKey]]);
    let parent = item[parentKey];
    while (parent !== null) {
      if (!byId.has(parent)) fail(missingCode, `${label}/${item[idKey]}: missing parent ${parent}`);
      if (seen.has(parent)) fail(cycleCode, `${label}/${item[idKey]}: cyclic parent`);
      seen.add(parent);
      parent = byId.get(parent)[parentKey];
    }
  }
  return byId;
}

function assertCarrierContractShape(page) {
  if (page.lifecycle !== 'live') fail('CARRIER_LIFECYCLE', `${page.page_id}: only live pages can be carrier eligible`);
  if (!page.carrier_eligible) fail('CARRIER_INELIGIBLE', `${page.page_id}: page is not carrier eligible`);
  for (const field of ['module_contract_hash', 'modules', 'slots']) {
    if (!Object.hasOwn(page, field)) fail('CARRIER_CONTRACT_REQUIRED', `${page.page_id}: carrier page requires ${field}`);
  }
  if (computeModuleContractHash(page) !== page.module_contract_hash) fail('MODULE_CONTRACT_HASH', `${page.page_id}: module contract changed; refresh binding and reconfirm`);
}

function validateCarrierContract(page, anchors) {
  assertCarrierContractShape(page);
  const ids = new Map();
  for (const attribute of anchors.attributes.filter(attribute => attribute.name === 'id')) {
    if (ids.has(attribute.value)) fail('DOM_ID_DUPLICATE', `${page.page_id}: duplicate DOM id ${attribute.value}`);
    ids.set(attribute.value, attribute.node);
  }
  const modules = assertAcyclicParents(page.modules, 'module_id', 'parent_module_id', 'MODULE_PARENT', 'MODULE_CYCLE', page.page_id);
  const roots = page.modules.filter(module => module.parent_module_id === null);
  if (roots.length !== 1 || !roots[0].required || roots[0].allowed_actions.includes('remove')) fail('MODULE_ROOT', `${page.page_id}: carrier contract requires one non-removable required root module`);
  const slots = new Map();
  for (const slot of page.slots) {
    if (slots.has(slot.slot_id) || modules.has(slot.slot_id)) fail('SLOT_ID_REUSED', `${page.page_id}: duplicate module or slot id ${slot.slot_id}`);
    if (!modules.has(slot.parent_module_id)) fail('SLOT_PARENT', `${page.page_id}/${slot.slot_id}: missing parent module ${slot.parent_module_id}`);
    if (slot.allowed_actions.length !== 1 || slot.allowed_actions[0] !== 'add') fail('SLOT_ACTION', `${page.page_id}/${slot.slot_id}: slots only allow add`);
    slots.set(slot.slot_id, slot);
  }
  const registeredNodes = new Map();
  const moduleNodes = new Map();
  for (const module of page.modules) {
    if (module.required && module.allowed_actions.includes('remove')) fail('MODULE_REQUIRED_ACTION', `${page.page_id}/${module.module_id}: required module cannot be removed`);
    const node = resolveAnchor(anchors, module.anchor, 'MODULE_ANCHOR', `${page.page_id}/${module.module_id}`);
    if (registeredNodes.has(node)) fail('REGISTERED_ANCHOR_REUSED', `${page.page_id}/${module.module_id}: module/slot anchors must resolve to distinct DOM nodes`);
    registeredNodes.set(node, `module:${module.module_id}`);
    moduleNodes.set(module.module_id, node);
    const invariantIds = new Set();
    for (const invariant of module.invariants) {
      if (invariantIds.has(invariant.invariant_id)) fail('MODULE_INVARIANT_REUSED', `${page.page_id}/${module.module_id}: duplicate invariant ${invariant.invariant_id}`);
      invariantIds.add(invariant.invariant_id);
      const invariantNode = resolveAnchor(anchors, invariant.anchor, 'MODULE_INVARIANT_ANCHOR', `${page.page_id}/${module.module_id}/${invariant.invariant_id}`);
      if (!containsNode(node, invariantNode)) fail('MODULE_INVARIANT_SCOPE', `${page.page_id}/${module.module_id}/${invariant.invariant_id}: invariant is outside its module`);
    }
  }
  for (const slot of page.slots) {
    const node = resolveAnchor(anchors, slot.anchor, 'SLOT_ANCHOR', `${page.page_id}/${slot.slot_id}`);
    if (registeredNodes.has(node)) fail('REGISTERED_ANCHOR_REUSED', `${page.page_id}/${slot.slot_id}: module/slot anchors must resolve to distinct DOM nodes`);
    if (!containsNode(moduleNodes.get(slot.parent_module_id), node)) fail('SLOT_CONTAINMENT', `${page.page_id}/${slot.slot_id}: slot is outside parent module ${slot.parent_module_id}`);
    registeredNodes.set(node, `slot:${slot.slot_id}`);
  }
  for (const module of page.modules) {
    if (module.parent_module_id !== null && !containsNode(moduleNodes.get(module.parent_module_id), moduleNodes.get(module.module_id))) fail('MODULE_CONTAINMENT', `${page.page_id}/${module.module_id}: module is outside parent ${module.parent_module_id}`);
  }
  const stateIds = new Set();
  for (const state of page.state_support ?? []) {
    if (stateIds.has(state.state_id) || !page.states.includes(state.state_id)) fail('STATE_SUPPORT_INVALID', `${page.page_id}: duplicate or unknown state ${state.state_id}`);
    stateIds.add(state.state_id);
    if (state.status === 'unsupported') {
      if (state.anchors.length || state.target_ids.length) fail('STATE_SUPPORT_INVALID', `${page.page_id}/${state.state_id}: unsupported states cannot authorize targets`);
      continue;
    }
    if (!state.anchors.length || !state.target_ids.length) fail('STATE_SUPPORT_INVALID', `${page.page_id}/${state.state_id}: supported state requires structure and target evidence`);
    const stateNodes = state.anchors.map(anchor => resolveAnchor(anchors, anchor, 'STATE_SUPPORT_ANCHOR', `${page.page_id}/${state.state_id}`));
    for (const id of state.target_ids) {
      const target = modules.get(id) ?? slots.get(id);
      if (!target) fail('STATE_SUPPORT_TARGET', `${page.page_id}/${state.state_id}: unknown target ${id}`);
      const node = resolveAnchor(anchors, target.anchor, 'STATE_SUPPORT_TARGET', id);
      if (!stateNodes.some(parent => containsNode(parent, node))) fail('STATE_SUPPORT_TARGET', `${id}: target is outside the evidenced state structure`);
    }
  }
  if (page.states.some(state => !stateIds.has(state))) fail('STATE_SUPPORT_REQUIRED', `${page.page_id}: every carrier state needs an explicit support decision`);
  return { modules, slots };
}

export function carrierContractForPage(page) {
  shape(page, schema.$defs.page);
  assertCarrierContractShape(page);
  return {
    page_id: page.page_id,
    source_ref: page.source_ref,
    source_hash: page.source_hash,
    module_contract_hash: page.module_contract_hash,
    modules: page.modules,
    slots: page.slots,
    state_support: page.state_support ?? [],
  };
}

async function validateCatalog(catalog, root) {
  let originals = [];
  try {
    const manifestPath = await confinedPath(root, '.claude/skill-os/page-library/source-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.profile === 'original-template-copy-v1') originals = manifest.sources;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  shape(catalog, schema.$defs.catalog);
  const ids = new Set(catalog.retired_page_ids);
  // Validate every path before reading any source bytes.
  const paths = [];
  for (const page of catalog.pages) {
    if (originals.some(source => page.source_ref === source.rejected_shadow?.source || page.source_hash === source.rejected_shadow?.sha256)) fail('REWRITTEN_TEMPLATE_FORBIDDEN', 'A rejected rewritten shadow cannot re-enter the template library under any page ID');
    const original = originals.find(source => source.page_id === page.page_id || source.copy_source === page.source_ref || source.raw_sha256 === page.source_hash);
    if (original && (page.page_id !== original.page_id || page.source_ref !== original.copy_source || page.source_hash !== original.raw_sha256 || page.original_copy?.bytes !== original.raw_bytes || page.original_copy?.sha256 !== original.raw_sha256)) fail('TEMPLATE_COPY_MISMATCH', `${page.page_id}: source binding must reference the exact approved original copy with its protected identity`);
    if (page.original_copy && (page.carrier_eligible || page.regions.length || page.source_hash !== page.original_copy.sha256)) fail('ORIGINAL_COPY_CONTRACT', 'Original copies cannot reuse rewritten-page bindings or static-carrier approval');
    if (ids.has(page.page_id)) fail('PAGE_ID_REUSED', `Duplicate or retired page_id: ${page.page_id}`);
    ids.add(page.page_id);
    if (page.lifecycle !== 'live' && page.aliases.length) fail('PAGE_ALIAS_LIFECYCLE', `${page.page_id}: non-live pages cannot retain selectable aliases`);
    if (page.lifecycle !== 'live' && page.carrier_eligible) fail('CARRIER_LIFECYCLE', `${page.page_id}: only live pages can be carrier eligible`);
    const carrierFields = ['module_contract_hash', 'modules', 'slots'];
    if (page.carrier_eligible) assertCarrierContractShape(page);
    else if (carrierFields.some(field => Object.hasOwn(page, field))) fail('CARRIER_CONTRACT_UNEXPECTED', `${page.page_id}: ineligible pages cannot retain a carrier contract`);
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
    if (sha256(bytes) !== page.source_hash) fail('SOURCE_HASH', `${page.page_id}: source changed; refresh catalog and reconfirm selection`);
    if (page.original_copy) {
      if (bytes.length !== page.original_copy.bytes) fail('TEMPLATE_COPY_MISMATCH', `${page.page_id}: original copy length changed`);
      // This branch attests exact storage only. Complex original HTML is not
      // silently reinterpreted by the restricted static carrier parser.
      continue;
    }
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
    if (page.carrier_eligible) validateCarrierContract(page, anchors);
  }
  return catalog;
}

export async function loadCatalog({ root = repoRoot, catalogPath = catalogDefault } = {}) {
  return validateCatalog(JSON.parse(await readFile(await confinedPath(root, catalogPath), 'utf8')), root);
}

function noCandidateHints() {
  return { schema_version: 2, mode: 'phase_a_discovery', status: 'NO_HINT', ephemeral: true, candidate_hints: [] };
}

async function hasNoDefaultCatalog(root) {
  try { await lstat(resolve(root)); }
  catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
  try { await lstat(resolve(root, catalogDefault)); }
  catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
  return false;
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
  return catalog.pages.filter(page => page.scope === scope && page.lifecycle === 'live').map(page => {
    const own = matches(page);
    const regions = page.regions.map(region => ({ region_id: region.region_id, name: region.name, ...matches(region) })).filter(region => region.matched_terms.length);
    return { page_id: page.page_id, name: page.name, source_hash: page.source_hash, matched_terms: [...new Set([...own.matched_terms, ...regions.flatMap(region => region.matched_terms)])], reasons: [...own.reasons, ...regions.flatMap(region => region.reasons.map(reason => `${region.region_id}: ${reason}`))], regions };
  }).filter(page => page.matched_terms.length);
}

export function discoverCandidateHints(catalog, query, { scope = 'framework' } = {}) {
  const candidate_hints = candidates(catalog, query, { scope })
    .map(hint => {
      const page = catalog.pages.find(candidate => candidate.page_id === hint.page_id);
      if (page?.original_copy?.status === 'adapter-available' && page.lifecycle === 'live') return { page_id: page.page_id, name: page.name, source_ref: page.source_ref, source_hash: page.source_hash, binding_mode: 'original-preserving-v1', matched_terms: hint.matched_terms, reasons: hint.reasons };
      if (!page?.carrier_eligible || page.lifecycle !== 'live') return null;
      const contract = carrierContractForPage(page);
      return {
        page_id: page.page_id,
        name: page.name,
        source_ref: page.source_ref,
        source_hash: page.source_hash,
        module_contract_hash: contract.module_contract_hash,
        matched_terms: hint.matched_terms,
        reasons: hint.reasons,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  return candidate_hints.length
    ? { schema_version: 2, mode: 'phase_a_discovery', status: 'CANDIDATE_HINTS', ephemeral: true, candidate_hints }
    : noCandidateHints();
}

export async function readPageSource(page, { root = repoRoot } = {}) {
  shape(page, schema.$defs.page);
  const path = await confinedPath(root, page.source_ref, { source: true });
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== page.source_hash) fail('SOURCE_HASH', `${page.page_id}: source changed; refresh catalog and reconfirm selection`);
  return { path, bytes };
}

function isAncestorModule(modules, ancestorId, descendantId) {
  for (let cursor = descendantId; cursor !== null; cursor = modules.get(cursor).parent_module_id) {
    if (cursor === ancestorId) return true;
  }
  return false;
}

function assertActionsDoNotOverlap({ modules, slots }, actions) {
  const targetIds = new Set();
  const actionIds = new Set();
  const targets = actions.map(action => {
    if (actionIds.has(action.action_id)) fail('CARRIER_ACTION_ID_REUSED', `Carrier action_id is reused: ${action.action_id}`);
    actionIds.add(action.action_id);
    if (action.action === 'add') {
      const slot = slots.get(action.slot_id);
      if (!slot) fail('UNKNOWN_SLOT', `Unknown add slot: ${action.slot_id}`);
      if (!slot.allowed_actions.includes('add')) fail('CARRIER_ACTION_FORBIDDEN', `Slot ${action.slot_id} does not allow add`);
      return { ...action, kind: 'slot', id: action.slot_id, parent_module_id: slot.parent_module_id };
    }
    const module = modules.get(action.module_id);
    if (!module) fail('UNKNOWN_MODULE', `Unknown module: ${action.module_id}`);
    if (!module.allowed_actions.includes(action.action)) fail('CARRIER_ACTION_FORBIDDEN', `Module ${action.module_id} does not allow ${action.action}`);
    if (action.action === 'remove' && module.required) fail('CARRIER_REQUIRED_MODULE', `Required module ${action.module_id} cannot be removed`);
    return { ...action, kind: 'module', id: action.module_id };
  });
  for (const target of targets) {
    const key = `${target.kind}:${target.id}`;
    if (targetIds.has(key)) fail('CARRIER_ACTION_TARGET_REUSED', `Carrier action target is reused: ${key}`);
    targetIds.add(key);
  }
  for (let left = 0; left < targets.length; left++) {
    for (let right = left + 1; right < targets.length; right++) {
      const a = targets[left];
      const b = targets[right];
      const aModule = a.kind === 'module' ? a.id : a.parent_module_id;
      const bModule = b.kind === 'module' ? b.id : b.parent_module_id;
      // An insertion slot is not its entire parent. A sibling module can be
      // preserved independently even when the slot's parent is the root.
      if (a.kind === 'slot' && b.kind === 'module' && !isAncestorModule(modules, b.id, a.parent_module_id)) continue;
      if (b.kind === 'slot' && a.kind === 'module' && !isAncestorModule(modules, a.id, b.parent_module_id)) continue;
      if (!isAncestorModule(modules, aModule, bModule) && !isAncestorModule(modules, bModule, aModule)) continue;
      if (aModule === bModule && a.kind === 'slot' && b.kind === 'slot') continue;
      fail('CARRIER_ACTION_OVERLAP', `Carrier actions ${a.action_id} and ${b.action_id} overlap in the module graph`);
    }
  }
  if (!targets.some(target => target.action !== 'preserve')) fail('CARRIER_NO_CHANGE', 'Carrier binding needs at least one add, modify, or remove action');
  return targets;
}

// This gate verifies inspectable provenance and consistency, not the truth of a
// model's semantic judgment. High confidence still needs model review + user adoption.
export function validateMatchAssessment(catalog, assessment, { packetBody, frozen_packet, binding } = {}) {
  shape(catalog, schema.$defs.catalog);
  shape(assessment, schema.$defs.match_assessment);
  if (!packetBody) fail('PACKET_EVIDENCE_REQUIRED', 'Match assessment requires the actual frozen Packet, not caller-supplied fact IDs');
  const packet = inspectCarrierPacket(packetBody);
  const expectedFrozen = { source_packet_sha256: packet.source_packet_sha256, applicability_set_sha256: packet.applicability_set_sha256 };
  if (canonicalJson(assessment.frozen_packet) !== canonicalJson(expectedFrozen) || (frozen_packet && canonicalJson(frozen_packet) !== canonicalJson(expectedFrozen))) fail('STALE_MATCH_PACKET', 'Assessment does not bind the inspected frozen Packet');
  if (assessment.catalog_sha256 !== computeCatalogHash(catalog)) fail('STALE_MATCH_CATALOG', 'Catalog changed; reassess candidates and reconfirm');
  const facts = new Map(packet.document.items.map(item => [item.id, item]));
  const scopedFacts = new Set(packet.document.scopes.flatMap(scope => scope.source_ids));
  if (assessment.reviewed_fact_ids.length !== facts.size || assessment.reviewed_fact_ids.some(id => !facts.has(id))) fail('MATCH_FACT_COVERAGE', 'Every frozen Packet fact must be reviewed, including constraints and states');
  const candidateIds = new Set();
  for (const evidence of assessment.candidate_evidence) {
    if (candidateIds.has(evidence.page_id) || !catalog.pages.some(page => page.page_id === evidence.page_id && page.lifecycle === 'live')) fail('MATCH_CANDIDATE_INVALID', 'Candidate evidence names a duplicate or unavailable page');
    candidateIds.add(evidence.page_id);
  }
  const pairs = new Set();
  for (const judgment of assessment.judgments) {
    const fact = facts.get(judgment.fact_id);
    if (!fact || fact.text !== judgment.excerpt) fail('MATCH_FACT_EVIDENCE', 'Judgment must quote the complete authoritative Packet item');
    const page = catalog.pages.find(page => page.page_id === judgment.page_id && page.lifecycle === 'live');
    const target = [...(page?.modules ?? []), ...(page?.slots ?? [])].find(target => (target.module_id ?? target.slot_id) === judgment.target_id);
    if (!page || !target || page.intent !== judgment.purpose_excerpt || target.intent !== judgment.target_excerpt) fail('MATCH_TARGET_EVIDENCE', 'Judgment purpose and location must quote current catalog evidence');
    if (!candidateIds.has(page.page_id)) fail('MATCH_CANDIDATE_INVALID', 'Judgment needs a candidate assessment');
    const pair = `${judgment.fact_id}:${judgment.action_id}`;
    if (pairs.has(pair)) fail('MATCH_JUDGMENT_DUPLICATE', 'Duplicate fact/action assessment');
    pairs.add(pair);
  }
  if (assessment.decision === 'needs_context') return { status: 'NEEDS_CONTEXT', reason: assessment.reason, binding_allowed: false };
  if (assessment.decision === 'reference_only') {
    if (assessment.candidate_evidence.some(item => item.disposition !== 'rejected') || assessment.judgments.some(item => item.confidence !== 'no_match')) fail('MATCH_DECISION_CONFLICT', 'reference_only cannot carry selected or unresolved candidates');
    return { status: 'REFERENCE_ONLY', reason: assessment.reason, binding_allowed: false, frozen_packet: expectedFrozen };
  }
  if (!binding) fail('MATCH_BINDING_REQUIRED', 'Carrier assessment requires its exact binding targets');
  const selected = assessment.candidate_evidence.filter(item => item.disposition === 'selected');
  if (selected.length !== 1 || selected[0].page_id !== binding.page_id || assessment.candidate_evidence.some(item => item.disposition === 'uncertain')) fail('MATCH_AMBIGUOUS', 'Resolve candidate ambiguity before binding');
  const coveredFacts = new Set();
  const coveredActions = new Set();
  for (const judgment of assessment.judgments) {
    if (judgment.confidence !== 'high' || judgment.alternative_target_ids.length) fail('MATCH_AMBIGUOUS', 'Uncertain confidence or multiple positions requires NEEDS_CONTEXT');
    const action = binding.actions.find(action => action.action_id === judgment.action_id);
    if (judgment.page_id !== binding.page_id || !action || (action.slot_id ?? action.module_id) !== judgment.target_id) fail('MATCH_ACTION_EVIDENCE', 'Fact judgment must bind the exact requested action and module/slot');
    const page = catalog.pages.find(page => page.page_id === judgment.page_id);
    const state = page.state_support?.find(state => state.state_id === judgment.state_id);
    if (!state || state.status !== 'supported' || !state.target_ids.includes(judgment.target_id)) fail('MATCH_STATE_UNSUPPORTED', `State ${judgment.state_id} is not supported for ${judgment.target_id}`);
    coveredFacts.add(judgment.fact_id);
    coveredActions.add(judgment.action_id);
  }
  if ([...facts.keys()].some(id => !scopedFacts.has(id) && !coveredFacts.has(id)) || coveredActions.size !== binding.actions.length) fail('MATCH_FACT_COVERAGE', 'Every unscoped Packet fact and every action requires location evidence; scoped facts remain in reviewed_fact_ids');
  return { status: 'AWAITING_ADOPTION', binding_allowed: true, semantic_verification: 'model-reviewed-not-machine-proven' };
}

export async function validateCarrierBindingDraft(catalog, record, { root = repoRoot, packetBody } = {}) {
  shape(record, schema.$defs.carrier_binding_draft);
  await validateCatalog(catalog, root);
  const page = catalog.pages.find(candidate => candidate.page_id === record.binding.page_id);
  if (!page) fail('UNKNOWN_PAGE', `Unknown page: ${record.binding.page_id}`);
  const contract = carrierContractForPage(page);
  if (record.binding.source_ref !== contract.source_ref || record.binding.source_hash !== contract.source_hash || record.binding.module_contract_hash !== contract.module_contract_hash) fail('STALE_CARRIER_BINDING', 'Carrier source or module contract changed; rebind and reconfirm');
  const graph = validateCarrierContract(page, anchorsIn((await readPageSource(page, { root })).bytes.toString('utf8')));
  const actions = assertActionsDoNotOverlap(graph, record.binding.actions);
  const assessment = validateMatchAssessment(catalog, record.binding.match_assessment, { packetBody, frozen_packet: record.frozen_packet, binding: record.binding });
  if (!assessment.binding_allowed) fail(assessment.status === 'NEEDS_CONTEXT' ? 'MATCH_NEEDS_CONTEXT' : 'MATCH_REFERENCE_ONLY', assessment.reason);
  const binding_sha256 = computeBindingHash({ frozen_packet: record.frozen_packet, binding: record.binding });
  return {
    schema_version: 2,
    bundle_kind: 'carrier',
    frozen_packet: record.frozen_packet,
    binding: record.binding,
    binding_sha256,
    contract,
    actions,
  };
}

export async function validateCarrierBinding(catalog, record, { root = repoRoot, packetBody } = {}) {
  shape(record, schema.$defs.carrier_binding);
  if (!Number.isFinite(Date.parse(record.adoption.confirmed_at))) fail('CONFIRMATION_INVALID', 'Carrier adoption date is invalid');
  const draft = await validateCarrierBindingDraft(catalog, {
    schema_version: record.schema_version,
    bundle_kind: record.bundle_kind,
    frozen_packet: record.frozen_packet,
    binding: record.binding,
  }, { root, packetBody });
  if (record.adoption.binding_sha256 !== draft.binding_sha256) fail('STALE_CARRIER_ADOPTION', 'Carrier adoption does not bind the current frozen packet and module binding');
  if (record.adoption.carrier_profile !== record.binding.carrier_profile) fail('STALE_CARRIER_ADOPTION', 'Carrier adoption does not bind the selected carrier profile');
  return { ...draft, adoption: record.adoption };
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
  if (page.original_copy) fail('ORIGINAL_ADAPTER_REQUIRED', 'Use the original-copy-handoff path with exact original locations and adoption; never substitute the static carrier or screenshot transport');
  if (page.lifecycle !== 'live') fail('PAGE_LIFECYCLE', `Page ${record.page_id} is not a live reference`);
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
    if (!['--root', '--catalog', '--query', '--scope', '--record', '--preview', '--packet'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) fail('CLI_USAGE', 'Usage: page-context.mjs validate|candidates|phase-a-discovery|selection|carrier-binding-draft|carrier-binding [--query text|--record path] [--packet path] [--preview path] [--root path] [--catalog path]');
    options[args[i]] = args[i + 1];
  }
  if (!['validate', 'candidates', 'phase-a-discovery', 'selection', 'carrier-binding-draft', 'carrier-binding'].includes(command)) fail('CLI_USAGE', 'Expected validate, candidates, phase-a-discovery, selection, carrier-binding-draft or carrier-binding command');
  const root = options['--root'] ?? repoRoot;
  if (command === 'phase-a-discovery') {
    if (!options['--query']) fail('CLI_USAGE', 'phase-a-discovery requires --query');
    if (!options['--catalog'] && await hasNoDefaultCatalog(root)) return noCandidateHints();
    const catalog = await loadCatalog({ root, catalogPath: options['--catalog'] ?? catalogDefault });
    return discoverCandidateHints(catalog, options['--query'], { scope: options['--scope'] ?? 'framework' });
  }
  const catalog = await loadCatalog({ root, catalogPath: options['--catalog'] ?? catalogDefault });
  if (command === 'candidates') {
    if (!options['--query']) fail('CLI_USAGE', 'candidates requires --query');
    return { candidates: candidates(catalog, options['--query'], { scope: options['--scope'] ?? 'framework' }), interpretation: 'Lexical hints only; agent must judge semantic fit and obtain user confirmation.' };
  }
  if (command === 'selection') {
    if (!options['--record']) fail('CLI_USAGE', 'selection requires --record path');
    const record = JSON.parse(await readFile(await confinedPath(root, options['--record']), 'utf8'));
    const preview = options['--preview'] ? JSON.parse(await readFile(await confinedPath(root, options['--preview']), 'utf8')) : undefined;
    return validateSelection(catalog, record, { root, preview });
  }
  if (command === 'carrier-binding-draft' || command === 'carrier-binding') {
    if (!options['--record']) fail('CLI_USAGE', `${command} requires --record path`);
    const record = JSON.parse(await readFile(await confinedPath(root, options['--record']), 'utf8'));
    const packetBody = options['--packet'] ? await readFile(await confinedPath(root, options['--packet']), 'utf8') : undefined;
    return command === 'carrier-binding-draft'
      ? validateCarrierBindingDraft(catalog, record, { root, packetBody })
      : validateCarrierBinding(catalog, record, { root, packetBody });
  }
  return { valid: true, schema_version: catalog.schema_version, pages: catalog.pages.length, regions: catalog.pages.reduce((count, page) => count + page.regions.length, 0) };
}

// Library callers may use stdin or a virtual launcher; only a real entry file runs the CLI.
const entryPath = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (entryPath === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await main())); }
  catch (error) { console.log(JSON.stringify({ error: { code: error.code ?? 'INVALID_INPUT', message: error.message } })); process.exitCode = 1; }
}
