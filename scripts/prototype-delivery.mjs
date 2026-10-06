#!/usr/bin/env node
// Per-attempt identity checks. Caller authority and independent reviewer authenticity stay outside this module.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml, parseFragment as parseHtmlFragment } from 'parse5';
import { parse as parseJavaScript } from 'acorn';

const schema = JSON.parse(fs.readFileSync(new URL('../.claude/skill-os/prototype-delivery.schema.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, detail) => { throw new Error(`${code}: ${detail}`); };
const requireThat = (test, code, detail) => { if (!test) fail(code, detail); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const within = (file, root) => file === root || file.startsWith(root + path.sep);
const ref = file => ({ path: file, sha256: hash(fs.readFileSync(file)) });
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
// Private analysis tokens never enter ticket bytes and cannot be supplied as caller attestations.
const dynamicHtmlSlot = '__prototype_delivery_dynamic_slot_' + randomUUID() + '__';
const currentDomHtml = '__prototype_delivery_current_dom_html_' + randomUUID() + '__';

function absolute(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value), 'ABSOLUTE_PATH_REQUIRED', String(value));
  requireThat(!value.split(path.sep).some(part => part === '.' || part === '..'), 'PATH_ESCAPE', value);
  return path.normalize(value);
}
function relative(value) {
  requireThat(typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[\\\0?#]/.test(value), 'PATH_ESCAPE', String(value));
  requireThat(value.split('/').every(part => part && part !== '.' && part !== '..'), 'PATH_ESCAPE', value);
  return value;
}
function noSymlink(file, mustExist = true) {
  const full = absolute(file);
  let cursor = path.parse(full).root;
  for (const part of full.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) {
      try { requireThat(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED', cursor); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      requireThat(!mustExist || cursor !== full, 'MISSING_FILE', full);
      continue;
    }
    requireThat(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED', cursor);
  }
  if (mustExist) requireThat(fs.existsSync(full), 'MISSING_FILE', full);
  return full;
}
function rootPath(value) {
  const full = noSymlink(value);
  requireThat(fs.statSync(full).isDirectory(), 'DIRECTORY_REQUIRED', full);
  requireThat(fs.realpathSync(full) === full, 'NONCANONICAL_ROOT', full);
  return full;
}
function contextFor(context = {}, deliveryRoot) {
  const roots = (context.read_roots || []).map(rootPath);
  if (deliveryRoot) roots.push(rootPath(deliveryRoot));
  const files = (context.read_paths || []).map(file => noSymlink(file));
  return { ...context, read_roots: roots, read_paths: files };
}
function read(file, context) {
  const full = absolute(file);
  requireThat(context.read_paths.includes(full) || context.read_roots.some(root => within(full, root)), 'READ_SCOPE_REFUSED', full); // guard:read-context
  noSymlink(full);
  requireThat(fs.statSync(full).isFile(), 'FILE_REQUIRED', full);
  return fs.readFileSync(full);
}
function checkedRef(item, context) {
  validate(item, 'ref');
  const bytes = read(item.path, context);
  requireThat(hash(bytes) === item.sha256, 'HASH_DRIFT', item.path); // guard:hash
  return bytes;
}
function sourceRef(item, context) {
  if (path.isAbsolute(item.locator)) checkedRef({ path: item.locator, sha256: item.sha256 }, context);
  else requireThat(context.source_refs?.some(source => equal(source, item)), 'SOURCE_CONTEXT_REQUIRED', item.locator);
}
function scopeRef(item, context) {
  if (path.isAbsolute(item.reference)) checkedRef({ path: item.reference, sha256: item.sha256 }, context);
  else requireThat(context.scope_refs?.some(scope => equal(scope, item)), 'SCOPE_CONTEXT_REQUIRED', item.reference);
}
function effects(context, deliveryRoot, names) {
  const actual = context.effects;
  requireThat(actual && actual.authorized_delivery_root === deliveryRoot, 'EFFECT_SCOPE_REQUIRED', deliveryRoot);
  requireThat(actual.framework_fixture === true || (actual.verified_active_project && actual.canonical_project_root &&
    path.dirname(deliveryRoot) === path.join(rootPath(actual.canonical_project_root), 'docs/prototype') &&
    /^\d{4}-\d{2}-\d{2}-.+/.test(path.basename(deliveryRoot))), 'VERIFIED_PROJECT_REQUIRED', deliveryRoot);
  for (const name of names) requireThat(actual[name] === true, 'EFFECT_REFUSED', name);
}
function processorNamespace(subject) {
  const processor = subject.processor_id === undefined ? 'motion-polish' : subject.processor_id;
  requireThat(['motion-polish', 'prototype-notes'].includes(processor), 'PROCESSOR_ID', String(processor));
  return processor;
}
function notesRawEffects(bound, deliveryRoot, context) {
  if (context.effects?.framework_fixture === true || bound.base.origin === 'external-html') return;
  requireThat(path.dirname(bound.base.asset_root) === path.dirname(deliveryRoot) &&
    /^\d{4}-\d{2}-\d{2}-.+/.test(path.basename(bound.base.asset_root)) &&
    path.basename(deliveryRoot) === path.basename(bound.base.asset_root) + '-notes', 'NOTES_RAW_ROOT', deliveryRoot);
}

// The deliberately small JSON-schema subset used by the adjacent schema, with strict objects.
function validate(value, name) {
  function visit(value, rule, at) {
    if (rule.$ref) return visit(value, schema.$defs[rule.$ref.split('/').at(-1)], at);
    if (rule.anyOf) {
      requireThat(rule.anyOf.some(option => { try { visit(value, option, at); return true; } catch { return false; } }), 'SCHEMA', at);
      return;
    }
    if ('const' in rule) requireThat(value === rule.const, 'SCHEMA', at);
    if (rule.enum) requireThat(rule.enum.includes(value), 'SCHEMA', at);
    if (rule.type === 'object') {
      requireThat(value && typeof value === 'object' && !Array.isArray(value), 'SCHEMA', at);
      for (const key of rule.required || []) requireThat(Object.hasOwn(value, key), 'SCHEMA', `${at}.${key}`);
      for (const [key, item] of Object.entries(value)) {
        requireThat(rule.additionalProperties !== false || Object.hasOwn(rule.properties || {}, key), 'SCHEMA', `${at}.${key}`);
        if (rule.properties?.[key]) visit(item, rule.properties[key], `${at}.${key}`);
      }
    }
    if (rule.type === 'array') {
      requireThat(Array.isArray(value) && value.length >= (rule.minItems || 0), 'SCHEMA', at);
      if (rule.uniqueItems) requireThat(new Set(value.map(item => JSON.stringify(item))).size === value.length, 'SCHEMA', at);
      value.forEach((item, index) => visit(item, rule.items, `${at}[${index}]`));
    }
    if (rule.type === 'string') requireThat(typeof value === 'string' && value.length >= (rule.minLength || 0) &&
      (!rule.pattern || new RegExp(rule.pattern).test(value)), 'SCHEMA', at);
    if (rule.type === 'boolean') requireThat(typeof value === 'boolean', 'SCHEMA', at);
    if (rule.type === 'integer') requireThat(Number.isSafeInteger(value) && value >= (rule.minimum || 0), 'SCHEMA', at);
  }
  visit(value, schema.$defs[name], name);
}

function closure(items, root, context) {
  const names = new Set();
  for (const item of items) {
    relative(item.path);
    requireThat(!names.has(item.path), 'DUPLICATE_CLOSURE', item.path);
    names.add(item.path);
    const bytes = checkedRef({ path: path.join(root, item.path), sha256: item.sha256 }, context);
    requireThat(bytes.length === item.bytes, 'BYTE_DRIFT', item.path);
  }
  return names;
}
// Typed CSS input only. This is a finite locator lexer, never CSS/JS execution.
function cssResources(text, subject, {partial = false} = {}) {
  requireThat(typeof text === 'string' && !text.includes(dynamicHtmlSlot) && !text.includes(currentDomHtml), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS text`);
  const urls = [];
  const quoted = (start) => {
    const quote = text[start]; let end = start + 1;
    while (end < text.length && text[end] !== quote) { if (text[end] === '\\') end++; end++; }
    requireThat(end < text.length, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS string`);
    return {value: text.slice(start + 1, end), end: end + 1};
  };
  for (let index = 0; index < text.length;) {
    if (text.startsWith('/*', index)) { const end = text.indexOf('*/', index + 2); requireThat(end >= 0, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS comment`); index = end + 2; continue; }
    if ('"\''.includes(text[index])) { index = quoted(index).end; continue; }
    if (text[index] === '\\') fail('DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: escaped CSS syntax`);
    const tail = text.slice(index), imported = /^@import\b\s*/i.exec(tail);
    if (imported) {
      index += imported[0].length;
      if ('"\''.includes(text[index] || '\0')) { const value = quoted(index); requireThat(!value.value.includes('\\'), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: escaped CSS import`); urls.push(value.value); index = value.end; continue; }
      requireThat(/^url\s*\(/i.test(text.slice(index)), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS import`);
    }
    const url = /^url\s*\(/i.exec(text.slice(index));
    if (url && (index === 0 || !/[\w-]/.test(text[index - 1]))) {
      index += url[0].length; while (/\s/.test(text[index] || '\0')) index++;
      let value;
      if ('"\''.includes(text[index] || '\0')) { const result = quoted(index); value = result.value; index = result.end; while (/\s/.test(text[index] || '\0')) index++; }
      else { const end = text.indexOf(')', index); if (end < 0 && partial) return urls; requireThat(end >= 0, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS URL`); value = text.slice(index, end).trim(); index = end; }
      if (index >= text.length && partial) return urls;
      requireThat(text[index] === ')' && !/[\\()\s]/.test(value), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS URL`); urls.push(value); index++; continue;
    }
    index++;
  }
  return urls;
}
function htmlTagIndex(text) {
  const result = new Map(), visit = node => { const id = (node.attrs || []).find(value => value.name === 'id')?.value; if (id) result.set(id, [...(result.get(id) || []), node.tagName]); (node.childNodes || []).forEach(visit); if (node.content) visit(node.content); };
  visit(parseHtml(text)); return result;
}
function scriptResources(text, subject, {sourceType = 'script', handler = false, external = false, loaders = [], domTags = new Map(), domText = new Map(), units, loadScript, documentSubject = subject, materialContext} = {}) {
  // Material discovery has no resource/native acceptance output. The final consumer runs only
  // after every finitely admitted executable fragment contributes its document effects.
  if (!materialContext) {
    const initial = units || [{text, subject, sourceType, handler, external, loaders}];
    const context = {units: [...initial], keys: new Set(), collecting: true};
    for (;;) {
      const count = context.units.length;
      scriptResources(text, subject, {sourceType, handler, external, loaders, domTags, domText, units: context.units, loadScript, documentSubject, materialContext: context});
      requireThat(context.units.length <= 512, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${documentSubject}: executable material closure`);
      if (count === context.units.length) break;
    }
    context.collecting = false;
    return scriptResources(text, subject, {sourceType, handler, external, loaders, domTags, domText, units: context.units, loadScript, documentSubject, materialContext: context});
  }
  function admitExecutable(unit) {
    const key = JSON.stringify([unit.subject, !!unit.handler, unit.sourceType, !!unit.external, unit.text]);
    if (materialContext.keys.has(key)) return;
    requireThat(materialContext.collecting, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${documentSubject}: uncollected executable material`);
    materialContext.keys.add(key); materialContext.units.push({...unit, key: 'installed:' + hash(key)});
  }
  // Parse each source separately, then share only the document's classic-script lexical environment.
  // Modules and handlers retain private scopes; recognized global effects still affect the document.
  const programs = [], admitted = new Set(), nodeUnits = new WeakMap(); let opaqueDocument = false;
  const syntaxChildren = node => Object.values(node).flatMap(value => Array.isArray(value) ? value : [value]).filter(value => value && typeof value.type === 'string');
  function admit(unit) {
    if (unit.key && admitted.has(unit.key)) return; if (unit.key) admitted.add(unit.key);
    let program; const options = {ecmaVersion: 'latest', sourceType: unit.sourceType || 'script', allowReturnOutsideFunction: !!unit.handler};
    try { program = parseJavaScript(unit.text, options); }
    catch (error) {
      if (unit.external) { try { program = parseJavaScript(unit.text, {...options, sourceType: options.sourceType === 'module' ? 'script' : 'module'}); } catch { fail('SCRIPT_PARSE_REFUSED', `${unit.subject}: ${error.message}`); } }
      else fail('SCRIPT_PARSE_REFUSED', `${unit.subject}: ${error.message}`);
    }
    unit = {...unit, sourceType: program.sourceType};
    programs.push({program, unit}); if (unit.opaque) opaqueDocument = true;
    const imports = node => {
      if (node.type === 'ImportDeclaration' || /Export(?:Named|All)Declaration/.test(node.type) && node.source || node.type === 'ImportExpression') {
        const value = node.source?.type === 'Literal' && typeof node.source.value === 'string' ? node.source.value : undefined;
        if (loadScript) { if (value === undefined) opaqueDocument = true; else { const loaded = loadScript(value, {...unit, imported: true}); if (loaded) admit(loaded); else opaqueDocument = true; } }
      }
      syntaxChildren(node).forEach(imports);
    }; imports(program);
  }
  for (const unit of units || [{text, subject, sourceType, handler, external, loaders}]) admit(unit);
  const urls = [], properties = new Set(['src', 'href', 'poster', 'action', 'srcset']), nodeScopes = new WeakMap(), nodes = [], memberWrites = new Map();
  const children = node => Object.values(node).flatMap(value => Array.isArray(value) ? value : [value]).filter(value => value && typeof value.type === 'string');
  function bind(pattern, init, scope) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') scope.bindings.set(pattern.name, {init, htmlInit: init, scope, inputs: [], fileReads: []});
    else if (pattern.type === 'RestElement') bind(pattern.argument, null, scope);
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left, null, scope);
    else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(value => bind(value, null, scope));
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(value => bind(value.type === 'RestElement' ? value.argument : value.value, null, scope));
  }
  function declare(statement, scope) {
    if (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') { if (statement.declaration) declare(statement.declaration, scope); }
    else if (statement.type === 'VariableDeclaration') statement.declarations.forEach(value => { bind(value.id, statement.kind === 'const' ? value.init : null, scope); if (value.id.type === 'Identifier') scope.bindings.get(value.id.name).htmlInit = value.init; });
    else if (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') bind(statement.id, statement, scope);
  }
  function constant(node, scope, seen = new Set()) {
    if (!node) return undefined;
    if (node.type === 'Literal' && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))) return node.value;
    if (node.type === 'Identifier') {
      let owner = scope; while (owner && !owner.bindings.has(node.name)) owner = owner.parent;
      const binding = owner?.bindings.get(node.name);
      if (!binding || binding.inputs.length || seen.has(binding)) return undefined;
      return constant(binding.init, binding.scope, new Set([...seen, binding]));
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const left = constant(node.left, scope, seen), right = constant(node.right, scope, seen);
      if (left !== undefined && right !== undefined) return left + right;
    }
    if (node.type === 'TemplateLiteral') {
      const values = node.expressions.map(value => constant(value, scope, seen));
      if (values.every(value => value !== undefined)) return node.quasis.map((part, index) => part.value.cooked + (index < values.length ? String(values[index]) : '')).join('');
    }
    if (node.type === 'MemberExpression') {
      const key = node.computed ? constant(node.property, scope, seen) : node.property.name;
      const owner = constant(node.object, scope, seen);
      if (owner && typeof owner === 'object' && Object.hasOwn(owner, key)) return owner[key];
      if (key === 'textContent') {
        const values = sourceNodes(node.object, scope, seen).map(value => {
          const call = value.node;
          if (call.type !== 'CallExpression' || call.callee.type !== 'MemberExpression' || !documentReceiver(call.callee.object, value.scope)) return undefined;
          const method = call.callee.computed ? constant(call.callee.property, value.scope, seen) : call.callee.property.name, id = constant(call.arguments[0], value.scope, seen);
          return ['getElementById', 'querySelector'].includes(method) && typeof id === 'string' ? domText.get(id.replace(/^#/, '')) : undefined;
        });
        if (values.length && typeof values[0] === 'string' && values.every(value => value === values[0])) return values[0];
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'JSON' && !bindingFor('JSON', scope) && (node.callee.computed ? constant(node.callee.property, scope, seen) : node.callee.property.name) === 'parse' && !globalChanged(['JSON', 'parse'])) {
      const value = constant(node.arguments[0], scope, seen); if (typeof value === 'string') { try { return JSON.parse(value); } catch { return undefined; } }
    }
    return undefined;
  }
  function documentReceiver(node, scope, seen = new Set()) {
    if (node?.type === 'Identifier') {
      let owner = scope; while (owner && !owner.bindings.has(node.name)) owner = owner.parent;
      const binding = owner?.bindings.get(node.name);
      if (!binding) return node.name === 'document' && !globalChanged(['document']);
      if (seen.has(binding)) return false;
      if (binding.inputs.length) return false;
      return documentReceiver(binding.init, binding.scope, new Set([...seen, binding]));
    }
    return node?.type === 'MemberExpression' && (node.computed ? constant(node.property, scope) : node.property.name) === 'document'
      && node.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(node.object.name) && !bindingFor(node.object.name, scope) && !globalChanged(['document']);
  }
  function globalPath(node, scope, seen = new Set()) {
    if (!node || seen.has(node)) return null; seen = new Set([...seen, node]);
    if (node.type === 'Identifier') {
      const binding = bindingFor(node.name, scope);
      if (binding) return seen.has(binding) ? null : globalPath(binding.htmlInit, binding.scope, new Set([...seen, binding]));
      return ['window', 'globalThis', 'self'].includes(node.name) ? [] : [node.name];
    }
    if (node?.type !== 'MemberExpression') return null;
    const owner = globalPath(node.object, scope, seen); if (!owner) return null;
    const key = node.computed ? constant(node.property, scope) : node.property.name; return [...owner, key === undefined ? '*' : String(key)];
  }
  let sourcesBound = false, nativeEffectsCache;
  function mutationCall(callee, args, scope, seen = new Set()) {
    if (!callee || seen.has(callee)) return null; const next = new Set([...seen, callee]);
    if (callee.type === 'Identifier') {
      const binding = bindingFor(callee.name, scope);
      if (binding) return mutationCall(binding.htmlInit, args, binding.scope, next);
    }
    if (callee.type === 'CallExpression' && callee.callee.type === 'MemberExpression' && (callee.callee.computed ? constant(callee.callee.property, scope) : callee.callee.property.name) === 'bind') return mutationCall(callee.callee.object, [...callee.arguments.slice(1).map(node => ({node, scope})), ...args], scope, next);
    if (callee.type === 'MemberExpression') {
      const method = callee.computed ? constant(callee.property, scope) : callee.property.name;
      if (['call', 'apply'].includes(method)) {
        const actual = method === 'call' ? args.slice(1) : args[1]?.node.type === 'ArrayExpression' ? args[1].node.elements.map(node => ({node, scope: args[1].scope})) : [{node: null, scope}];
        return mutationCall(callee.object, actual, scope, next);
      }
    }
    const parts = globalPath(callee, scope);
    return parts?.length === 2 && (parts[0] === 'Reflect' && parts[1] === 'set' || parts[0] === 'Object' && ['assign', 'defineProperty'].includes(parts[1])) ? {method: parts[1], args} : null;
  }
  function nativeEffects() {
    if (sourcesBound && nativeEffectsCache) return nativeEffectsCache;
    const effects = [], add = (target, scope, key, kind, pathOverride) => {
      const base = globalPath(target, scope), name = typeof key === 'string' ? key : '*'; effects.push({target, scope, key: name, kind, path: pathOverride || (base ? [...base, name] : null)});
    };
    for (const node of nodes) {
      const scope = nodeScopes.get(node), target = node.type === 'AssignmentExpression' ? node.left : node.type === 'UpdateExpression' || node.type === 'UnaryExpression' && node.operator === 'delete' ? node.argument : null;
      if (target?.type === 'MemberExpression') add(target.object, scope, target.computed ? constant(target.property, scope) : target.property.name, 'assignment');
      else if (target?.type === 'Identifier') effects.push({target, scope, kind: 'assignment', key: '*', path: globalPath(target, scope)});
      if (node.type !== 'CallExpression') continue;
      const call = mutationCall(node.callee, node.arguments.map(node => ({node, scope})), scope); if (!call) continue;
      const first = call.args[0]; if (!first?.node) continue;
      if (call.method !== 'assign') { const key = call.args[1]; add(first.node, first.scope, key?.node && constant(key.node, key.scope), call.method); continue; }
      for (const argument of call.args.slice(1)) {
        const bags = argument.node ? sourceNodes(argument.node, argument.scope) : [];
        if (!bags.length) add(first.node, first.scope, undefined, 'assign');
        for (const bag of bags) {
          if (bag.node.type !== 'ObjectExpression') { add(first.node, first.scope, undefined, 'assign'); continue; }
          for (const field of bag.node.properties) add(first.node, first.scope, field.type === 'Property' && field.kind === 'init' ? field.computed ? constant(field.key, bag.scope) : field.key.name ?? field.key.value : undefined, 'assign');
        }
      }
    }
    if (sourcesBound) nativeEffectsCache = effects; return effects;
  }
  function globalChanged(parts) {
    return opaqueDocument || nativeEffects().some(({path: actual}) => actual && actual.length <= parts.length && actual.every((part, index) => part === '*' || part === parts[index]));
  }
  function nativeIdentity(node, name, scope, seen = new Set()) {
    if (node?.type === 'Identifier') {
      const binding = bindingFor(node.name, scope);
      if (binding) return !binding.inputs.length && !seen.has(binding) && nativeIdentity(binding.init, name, binding.scope, new Set([...seen, binding]));
    }
    const parts = globalPath(node, scope); return parts?.length === 1 && parts[0] === name && !globalChanged([name]);
  }
  function bindingFor(name, scope) { let owner = scope; while (owner && !owner.bindings.has(name)) owner = owner.parent; return owner?.bindings.get(name); }
  function memberIdentity(node, scope, seen = new Set()) {
    if (node?.type === 'Identifier') {
      const binding = bindingFor(node.name, scope); if (!binding || seen.has(binding)) return null;
      if (['Identifier', 'MemberExpression'].includes(binding.htmlInit?.type)) return memberIdentity(binding.htmlInit, binding.scope, new Set([...seen, binding]));
      return {binding, keys: []};
    }
    if (node?.type === 'MemberExpression') {
      const owner = memberIdentity(node.object, scope, seen); if (!owner) return null;
      const key = node.computed ? constant(node.property, scope) : node.property.name;
      return {...owner, keys: [...owner.keys, key === undefined ? '*' : String(key)]};
    }
    return null;
  }
  function sourceNodes(node, scope, seen = new Set()) {
    if (!node || seen.has(node)) return [];
    seen = new Set([...seen, node]);
    if (node.type === 'ChainExpression') return sourceNodes(node.expression, scope, seen);
    if (node.type === 'Identifier') {
      const binding = bindingFor(node.name, scope);
      if (!binding || seen.has(binding)) return [];
      const next = new Set([...seen, binding]);
      const values = binding.parameter && binding.inputs.length ? binding.inputs : [{node: binding.htmlInit, scope: binding.scope}, ...binding.inputs];
      return values.filter(value => value.node).flatMap(value => { const resolved = sourceNodes(value.node, value.scope, next); return resolved.length ? resolved : [value]; });
    }
    if (node.type === 'MemberExpression') {
      const key = node.computed ? constant(node.property, scope) : node.property.name;
      const values = sourceNodes(node.object, scope, seen).flatMap(value => {
        if (value.node.type === 'ObjectExpression') {
          const selected = value.node.properties.filter(property => property.type === 'Property' && (key === undefined || String(property.computed ? constant(property.key, value.scope) : property.key.name ?? property.key.value) === String(key)));
          const fields = selected.flatMap(property => { const resolved = sourceNodes(property.value, value.scope, seen); return resolved.length ? resolved : [{node: property.value, scope: value.scope}]; });
          if (!selected.length || value.node.properties.some(property => property.type === 'SpreadElement')) fields.push({node, scope});
          return fields;
        }
        if (value.node.type === 'ArrayExpression' && /^\d+$/.test(String(key))) return sourceNodes(value.node.elements[Number(key)], value.scope, seen);
        return [{node, scope}];
      });
      const identity = memberIdentity(node, scope);
      for (const write of memberWrites.get(identity?.binding) || []) {
        if (write.keys.length === identity.keys.length && write.keys.every((part, index) => part === '*' || part === identity.keys[index])) { const resolved = sourceNodes(write.node, write.scope, seen); values.push(...(resolved.length ? resolved : [write])); }
      }
      return values;
    }
    return [{node, scope}];
  }
  function readerBinding(node, scope) {
    if (node?.type !== 'Identifier') return null;
    const binding = bindingFor(node.name, scope), origin = sourceNodes(node, scope);
    if (!binding || origin.length !== 1 || origin[0].node.type !== 'NewExpression' || !nativeIdentity(origin[0].node.callee, 'FileReader', origin[0].scope)) return null;
    const relevant = ['readAsDataURL', 'result', 'onload', 'addEventListener', '__proto__'];
    if (relevant.some(name => globalChanged(['FileReader', 'prototype', name])) || globalChanged(['FileReader', 'prototype'])) return null;
    const changed = nativeEffects().some(effect => {
      if (effect.key !== '*' && !relevant.includes(effect.key) || effect.key === 'onload' && effect.kind === 'assignment') return false;
      let target = effect.target; while (target?.type === 'MemberExpression') target = target.object;
      return sourceNodes(target, effect.scope).some(value => value.node === origin[0].node);
    });
    return changed ? null : binding;
  }
  function inlineData(node, scope) {
    if (materialContext.collecting) return false;
    if (node?.type !== 'MemberExpression' || (node.computed ? constant(node.property, scope) : node.property.name) !== 'result') return false;
    let loadScope = scope; while (loadScope && !loadScope.readerLoad) loadScope = loadScope.parent;
    const binding = readerBinding(node.object, scope);
    return !!binding && loadScope?.readerLoad === binding && !binding.manualLoadInvoke && binding.fileReads.length > 0 && binding.fileReads.every(method => method === 'readAsDataURL');
  }
  function domReceiver(node, scope, seen = new Set()) {
    if (node?.type === 'CallExpression') {
      if (node.callee.type === 'MemberExpression' && ['getElementById', 'querySelector', 'createElement'].includes(node.callee.property.name) && documentReceiver(node.callee.object, scope)) return true;
      if (node.callee.type === 'Identifier') return sourceNodes(node.callee, scope).some(value => {
        if (seen.has(value.node) || !/Function/.test(value.node.type)) return false;
        return returns(value.node).some(result => domReceiver(result, nodeScopes.get(result) || value.scope, new Set([...seen, value.node])));
      });
    }
    if (node?.type === 'Identifier') return sourceNodes(node, scope).some(value => value.node !== node && domReceiver(value.node, value.scope, seen));
    return false;
  }
  function returns(fn) {
    if (fn.type === 'ArrowFunctionExpression' && fn.body.type !== 'BlockStatement') return [fn.body];
    const result = [];
    const collect = node => { if (node !== fn.body && /Function/.test(node.type)) return; if (node.type === 'ReturnStatement' && node.argument) result.push(node.argument); children(node).forEach(collect); };
    collect(fn.body); return result;
  }
  // A finite structural summary of HTML-building expressions, never execution of user JS.
  // Text/data holes stay holes. Any hole reaching a resource URL or executable slot is refused.
  const choices = values => {
    const unique = [...new Set(values)];
    if (unique.length === 1) return unique[0];
    // Alternatives are not concatenation: a safe data:/# branch cannot cover another unknown URL.
    if (!unique.some(value => value.includes('<') || value.includes(currentDomHtml))) return dynamicHtmlSlot;
    return dynamicHtmlSlot + unique.join('');
  };
  function htmlShape(node, scope, seen = new Set()) {
    if (!node) return dynamicHtmlSlot;
    const literal = constant(node, scope); if (literal !== undefined) return String(literal);
    if (inlineData(node, scope)) return 'data:application/octet-stream;base64,AA==';
    if (seen.has(node)) return dynamicHtmlSlot;
    const next = new Set([...seen, node]), shape = value => htmlShape(value, nodeScopes.get(value) || scope, next);
    if (node.type === 'ChainExpression') return shape(node.expression);
    if (node.type === 'BinaryExpression' && node.operator === '+') return shape(node.left) + shape(node.right);
    if (node.type === 'TemplateLiteral') return node.quasis.map((part, index) => part.value.cooked + (index < node.expressions.length ? shape(node.expressions[index]) : '')).join('');
    if (node.type === 'ConditionalExpression') return choices([shape(node.consequent), shape(node.alternate)]);
    if (node.type === 'LogicalExpression') return choices([shape(node.left), shape(node.right)]);
    if (node.type === 'MemberExpression' && (node.computed ? constant(node.property, scope) : node.property.name) === 'innerHTML' && domReceiver(node.object, scope)) return currentDomHtml;
    if (node.type === 'Identifier' || node.type === 'MemberExpression') {
      const sources = sourceNodes(node, scope); if (sources.length) return choices(sources.map(value => htmlShape(value.node, value.scope, next)));
    }
    if (node.type === 'CallExpression') {
      if (node.callee.type === 'MemberExpression') {
        const method = node.callee.computed ? constant(node.callee.property, scope) : node.callee.property.name;
        if (method === 'map') {
          const callback = node.arguments[0];
          if (callback && /Function/.test(callback.type)) return choices(returns(callback).map(shape));
        }
        if (method === 'join') return shape(node.callee.object);
      }
      if (node.callee.type === 'Identifier') {
        const functions = sourceNodes(node.callee, scope).filter(value => /Function/.test(value.node.type));
        if (functions.length) return choices(functions.flatMap(value => returns(value.node).map(result => htmlShape(result, nodeScopes.get(result) || value.scope, next))));
        if (node.callee.name === 'String' && !bindingFor('String', scope)) return shape(node.arguments[0]);
      }
    }
    if (node.type === 'ArrayExpression') return node.elements.map(shape).join('');
    return dynamicHtmlSlot;
  }
  const html = (value, sink) => {
    requireThat(typeof value === 'string', 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: ${sink}`);
    if (!materialContext.collecting) requireThat(value.replaceAll(dynamicHtmlSlot, '').replaceAll(currentDomHtml, '').length > 0 || value === '' || value.includes(currentDomHtml), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: ${sink}`);
    const child = sink === 'srcdoc' || sink === 'parseFromString';
    const options = {loadScript, scriptsExecutable: sink === 'srcdoc' || ['write', 'writeln', 'createContextualFragment'].includes(sink), ...(child ? {} : {admitExecutable, collecting: materialContext.collecting})};
    const found = htmlResources(value, documentSubject, true, options); if (!materialContext.collecting) urls.push(...found);
  };

  function visit(node, parent, unit) {
    let scope = parent; nodeUnits.set(node, unit);
    if (node.type === 'Program') {
      scope = unit.sourceType === 'module' || unit.handler ? {parent, bindings: new Map()} : parent;
      if (scope !== parent) node.body.forEach(statement => declare(statement, scope));
    } else if (node.type === 'BlockStatement') {
      scope = {parent, bindings: new Map()}; node.body.forEach(statement => declare(statement, scope));
    } else if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
      scope = {parent, bindings: new Map(), functionNode: node}; bind(node.id, null, scope); node.params.forEach(value => { bind(value, null, scope); const id = value.type === 'AssignmentPattern' ? value.left : value; if (id.type === 'Identifier') scope.bindings.get(id.name).parameter = true; if (value.type === 'AssignmentPattern' && value.left.type === 'Identifier') scope.bindings.get(value.left.name).htmlInit = value.right; });
      const variables = value => {
        if (value !== node.body && /Function/.test(value.type)) return;
        if (value.type === 'VariableDeclaration' && value.kind === 'var') value.declarations.forEach(declaration => bind(declaration.id, null, scope));
        children(value).forEach(variables);
      }; variables(node.body);
    } else if (node.type === 'CatchClause') {
      scope = {parent, bindings: new Map()}; bind(node.param, null, scope);
    } else if (['ForStatement', 'ForInStatement', 'ForOfStatement'].includes(node.type)) {
      scope = {parent, bindings: new Map()}; const declaration = node.init || node.left; if (declaration?.type === 'VariableDeclaration') declare(declaration, scope);
    }
    nodeScopes.set(node, scope); nodes.push(node);
    children(node).forEach(value => visit(value, scope, unit));
  }
  const documentScope = {parent: null, bindings: new Map()};
  for (const {program, unit} of programs) if (unit.sourceType !== 'module' && !unit.handler) program.body.forEach(statement => declare(statement, documentScope));
  for (const {program, unit} of programs) visit(program, documentScope, unit);
  for (const node of nodes) {
    const scope = nodeScopes.get(node);
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
      const identity = memberIdentity(node.left, scope);
      if (identity) { if (!memberWrites.has(identity.binding)) memberWrites.set(identity.binding, []); memberWrites.get(identity.binding).push({keys: identity.keys, node: node.right, scope}); }
      const method = node.left.computed ? constant(node.left.property, scope) : node.left.property.name, reader = readerBinding(node.left.object, scope);
      if (reader && method === 'onload' && /Function/.test(node.right.type)) nodeScopes.get(node.right).readerLoad = reader;
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const reader = readerBinding(node.callee.object, scope), method = node.callee.computed ? constant(node.callee.property, scope) : node.callee.property.name;
      if (reader && method === 'onload') reader.manualLoadInvoke = true;
      if (reader && method === 'addEventListener' && constant(node.arguments[0], scope) === 'load' && /Function/.test(node.arguments[1]?.type || '')) nodeScopes.get(node.arguments[1]).readerLoad = reader;
    }
  }
  // Bind actual declared function arguments/local writes and native reader methods before summaries.
  for (const node of nodes) {
    const scope = nodeScopes.get(node);
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') bindingFor(node.left.name, scope)?.inputs.push({node: node.right, scope});
    if (node.type === 'CallExpression' && (node.callee.type === 'Identifier' || /Function/.test(node.callee.type))) {
      for (const value of sourceNodes(node.callee, scope).filter(value => /Function/.test(value.node.type))) {
        value.node.params.forEach((param, index) => {
          const id = param.type === 'AssignmentPattern' ? param.left : param;
          if (id.type === 'Identifier' && node.arguments[index]) nodeScopes.get(value.node).bindings.get(id.name)?.inputs.push({node: node.arguments[index], scope});
        });
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const binding = readerBinding(node.callee.object, scope), method = node.callee.computed ? constant(node.callee.property, scope) : node.callee.property.name;
      if (binding && /^readAs/.test(method || '')) binding.fileReads.push(method);
    }
  }
  // One finite native-entry dispatcher: origins/aliases and material slots share consumers.
  sourcesBound = true;
  const parents = new WeakMap(); for (const node of nodes) for (const child of children(node)) parents.set(child, node);
  const cssState = new Map(), textState = new Map(), textOwners = new Map();
  const keyOf = (node, scope) => node?.computed ? constant(node.property, scope) : node?.property?.name;
  const dynamic = detail => fail('DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: ${detail}`);
  const builtin = nativeIdentity;
  const plain = (node, scope) => { const values = sourceNodes(node, scope); return values.length > 0 && values.every(value => ['ObjectExpression', 'ArrayExpression', 'FunctionExpression', 'ArrowFunctionExpression'].includes(value.node.type)); };
  function alternatives(node, scope, seen = new Set()) {
    if (!node || seen.has(node)) return [undefined]; const next = new Set([...seen, node]);
    if (node.type === 'ConditionalExpression') return [...alternatives(node.consequent, scope, next), ...alternatives(node.alternate, scope, next)];
    const value = constant(node, scope); if (value !== undefined) return [value];
    const values = sourceNodes(node, scope, seen); return values.length ? values.flatMap(value => value.node === node ? [undefined] : alternatives(value.node, value.scope, next)) : [undefined];
  }
  function fields(node, scope, seen = new Set()) {
    if (!node || seen.has(node)) dynamic('opaque native property bag'); const next = new Set([...seen, node]);
    if (node.type === 'ConditionalExpression') return [...fields(node.consequent, scope, next), ...fields(node.alternate, scope, next)];
    if (node.type === 'ObjectExpression') return node.properties.flatMap(property => {
      if (property.type === 'SpreadElement') return fields(property.argument, scope, next);
      if (property.type !== 'Property' || property.kind !== 'init' || property.method) dynamic('native property bag');
      const name = property.computed ? constant(property.key, scope) : property.key.name ?? property.key.value; if (typeof name !== 'string') dynamic('native property name');
      return [{name, value: property.value, scope, bag: node}];
    });
    const values = sourceNodes(node, scope, seen); if (!values.length || values.some(value => value.node === node)) dynamic('opaque native property bag'); return values.flatMap(value => fields(value.node, value.scope, next));
  }
  function role(node, scope, seen = new Set()) {
    if (!node || seen.has(node)) return null; seen = new Set([...seen, node]);
    if (node.type === 'Identifier') {
      const values = sourceNodes(node, scope); const roles = values.filter(value => value.node !== node).map(value => role(value.node, value.scope, seen));
      if (roles.length && roles.every(Boolean)) { const first = roles[0]; return roles.every(value => value.kind === first.kind && value.origin === first.origin) ? first : {kind: first.kind, uncertain: true}; }
      return null;
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && documentReceiver(node.callee.object, scope)) {
      const method = keyOf(node.callee, scope);
      if (globalChanged(['document', method])) dynamic('document method identity');
      if (['createElement', 'createElementNS'].includes(method)) { const argument = node.arguments[method === 'createElementNS' ? 1 : 0], tag = constant(argument, scope), tags = alternatives(argument, scope); return {kind: 'element', tag: typeof tag === 'string' ? tag.toLowerCase() : undefined, nonStyle: tags.length > 0 && tags.every(value => typeof value === 'string' && value.toLowerCase() !== 'style'), origin: node, fresh: true, ...(method === 'createElementNS' ? {namespace: constant(node.arguments[0], scope)} : {})}; }
      if (method === 'createTextNode') return {kind: 'text', origin: node, initial: constant(node.arguments[0], scope)};
      if (['querySelector', 'getElementById'].includes(method)) {
        const values = sourceNodes(node.arguments[0], scope).map(value => constant(value.node, value.scope)); const tags = values.flatMap(value => typeof value === 'string' ? method === 'getElementById' || value.startsWith('#') ? domTags.get(value.replace(/^#/, '')) || [] : /^[a-z]+$/i.test(value) ? [value.toLowerCase()] : [] : []);
        const absent = !domTags.has('*') && values.length > 0 && values.every(value => typeof value === 'string' && (method === 'getElementById' || /^#[\w-]+$/.test(value)) && !domTags.has(value.replace(/^#/, '')));
        return {kind: 'element', tag: tags.length && tags.every(value => value === tags[0]) ? tags[0] : undefined, nonStyle: absent || values.length > 0 && tags.length >= values.length && tags.every(value => value !== 'style'), absent, origin: node};
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const functions = sourceNodes(node.callee, scope).filter(value => /Function/.test(value.node.type));
      const values = functions.flatMap(value => {
        if (seen.has(value.node)) return []; const original = nodeScopes.get(value.node), copies = new Map();
        const copy = owner => {
          if (!owner) return owner;
          let ancestor = owner; while (ancestor && ancestor !== original) ancestor = ancestor.parent; if (!ancestor) return owner;
          if (copies.has(owner)) return copies.get(owner);
          const local = {parent: owner === original ? original.parent : copy(owner.parent), bindings: new Map()}; copies.set(owner, local);
          for (const [name, binding] of owner.bindings) local.bindings.set(name, {...binding, scope: copy(binding.scope)});
          return local;
        }, local = copy(original);
        value.node.params.forEach((param, index) => { const id = param.type === 'AssignmentPattern' ? param.left : param; if (id.type === 'Identifier' && node.arguments[index]) local.bindings.set(id.name, {init: node.arguments[index], htmlInit: node.arguments[index], scope, inputs: [], fileReads: []}); });
        return returns(value.node).map(result => role(result, copy(nodeScopes.get(result)), new Set([...seen, value.node])));
      });
      if (values.length && values.every(Boolean)) { const first = values[0]; return values.every(value => value.kind === first.kind && value.tag === first.tag) ? first : {kind: first.kind, nonStyle: values.every(value => value.kind === 'element' && (value.nonStyle || value.tag && value.tag !== 'style')), uncertain: true}; }
    }
    if (node.type === 'NewExpression') {
      if (builtin(node.callee, 'CSSStyleSheet', scope)) return {kind: 'sheet', origin: node};
      if (builtin(node.callee, 'Text', scope)) return {kind: 'text', origin: node, initial: constant(node.arguments[0], scope)};
    }
    if (node.type === 'MemberExpression') {
      const key = keyOf(node, scope), owner = role(node.object, scope, seen);
      if (owner?.kind === 'element' && key === 'style') return {...owner, kind: 'declaration'};
      if (owner?.kind === 'element' && key === 'sheet') return {...owner, kind: 'sheet', uncertain: owner.tag !== 'style'};
      if (owner?.kind === 'element' && ['firstChild', 'lastChild'].includes(key) && owner.tag === 'style') return {kind: 'text', origin: node, cssOwner: owner.origin};
      if (documentReceiver(node.object, scope) && ['body', 'head', 'documentElement'].includes(key)) return {kind: 'element', tag: key === 'documentElement' ? 'html' : key, origin: node};
      if (node.object.type === 'MemberExpression' && keyOf(node.object, scope) === 'styleSheets' && documentReceiver(node.object.object, scope)) return {kind: 'sheet', origin: node, uncertain: true};
      if (key === 'prototype' && ['Element', 'HTMLElement', 'HTMLScriptElement', 'HTMLImageElement', 'HTMLIFrameElement', 'CSSStyleSheet'].some(name => builtin(node.object, name, scope))) return {kind: 'prototype', origin: node};
    }
    if (domReceiver(node, scope)) return {kind: 'element', origin: node};
    return null;
  }
  function nativeTarget(callee, scope, seen = new Set()) {
    if (!callee || seen.has(callee)) return null; seen = new Set([...seen, callee]);
    if (callee.type === 'Identifier') {
      const binding = bindingFor(callee.name, scope);
      if (binding) { const target = nativeTarget(binding.htmlInit, binding.scope, seen); if (target && binding.inputs.length) return {...target, uncertain: true}; return target; }
      for (const name of ['fetch', 'Worker', 'URL']) if (builtin(callee, name, scope)) return {kind: 'loader', method: name};
      if (['fetch', 'Worker', 'URL'].includes(callee.name) && !bindingFor(callee.name, scope)) return {kind: 'unsupported', method: 'loader identity'};
      return null;
    }
    if (callee.type === 'CallExpression' && callee.callee.type === 'MemberExpression' && keyOf(callee.callee, scope) === 'bind') {
      const target = nativeTarget(callee.callee.object, scope, seen); return target ? {...target, receiver: callee.arguments[0] || target.receiver, bound: callee.arguments.slice(1)} : null;
    }
    if (callee.type !== 'MemberExpression') return null;
    const method = keyOf(callee, scope), receiver = callee.object;
    for (const name of ['fetch', 'Worker', 'URL']) if (builtin(callee, name, scope)) return {kind: 'loader', method: name};
    if (globalPath(callee, scope)?.length === 1 && ['fetch', 'Worker', 'URL'].includes(method)) return {kind: 'unsupported', method: 'loader identity'};
    if (builtin(receiver, 'Reflect', scope) && method === 'set') return globalChanged(['Reflect', method]) ? {kind: 'unsupported', method: 'Reflect identity'} : {kind: 'reflect', method};
    if (builtin(receiver, 'Object', scope) && ['assign', 'defineProperty'].includes(method)) return globalChanged(['Object', method]) ? {kind: 'unsupported', method: 'Object identity'} : {kind: 'object', method};
    if (receiver.type === 'CallExpression' && receiver.callee.type === 'MemberExpression' && builtin(receiver.callee.object, 'Object', scope) && keyOf(receiver.callee, scope) === 'getOwnPropertyDescriptor' && ['set', 'get'].includes(method)) return {kind: 'descriptor', receiver: receiver.arguments[0]};
    if (documentReceiver(receiver, scope) && ['write', 'writeln'].includes(method)) return {kind: 'html', method, receiver};
    const actual = role(receiver, scope);
    const identity = memberIdentity(receiver, scope), changed = (memberWrites.get(identity?.binding) || []).some(write => write.keys.length === (identity?.keys.length || 0) + 1 && write.keys.slice(0, -1).every((part, index) => part === '*' || part === identity.keys[index]) && ['*', method].includes(write.keys.at(-1)));
    const root = globalPath(receiver, scope);
    if (actual && (changed || root && globalChanged([...root, method]))) return {kind: 'unsupported', method: 'native method identity'};
    if (['setAttribute', 'setAttributeNS', 'setAttributeNode', 'setAttributeNodeNS'].includes(method) && !plain(receiver, scope)) return {kind: 'attribute', method, receiver, role: actual};
    if (['setNamedItem', 'setNamedItemNS'].includes(method) && receiver.type === 'MemberExpression' && keyOf(receiver, scope) === 'attributes') return {kind: 'unsupported', method, receiver};
    if (['insertAdjacentHTML', 'createContextualFragment', 'parseFromString'].includes(method) && !plain(receiver, scope)) return {kind: 'html', method, receiver};
    if (actual?.kind === 'sheet' && ['insertRule', 'replaceSync', 'replace'].includes(method)) return {kind: 'cssSheet', method, receiver, role: actual};
    if (['insertRule', 'replaceSync'].includes(method) && !plain(receiver, scope)) return {kind: 'unsupported', method: 'unknown CSS receiver'};
    if (actual?.kind === 'declaration' && method === 'setProperty') return {kind: 'cssDeclaration', method, receiver, role: actual};
    if (actual?.kind === 'element' && ['append', 'prepend', 'appendChild', 'insertBefore', 'replaceChildren', 'insertAdjacentText'].includes(method)) return {kind: 'textInsert', method, receiver, role: actual};
    if (actual?.kind === 'text' && ['appendData', 'insertData', 'replaceData', 'deleteData'].includes(method)) return {kind: 'textMutation', method, receiver, role: actual};
    if (method === undefined && actual) return {kind: 'unsupported', method: 'dynamic native method', receiver};
    return null;
  }
  function invocation(node, scope) {
    let callee = node.callee, args = node.arguments, receiver;
    if (callee?.type === 'MemberExpression' && ['call', 'apply'].includes(keyOf(callee, scope))) {
      const method = keyOf(callee, scope); receiver = args[0]; args = method === 'call' ? args.slice(1) : args[1]?.type === 'ArrayExpression' ? args[1].elements : null; callee = callee.object;
    }
    const target = nativeTarget(callee, scope); if (!target) return null;
    if (!args || args.some(value => !value || value.type === 'SpreadElement') || target.uncertain) dynamic('opaque native invocation');
    return {...target, receiver: receiver || target.receiver, args: [...(target.bound || []), ...args]};
  }
  // Only actual HTML-producing sinks contribute current DOM tag identity; inert literals do not.
  for (const node of nodes) {
    const scope = nodeScopes.get(node); let values = [];
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && keyOf(node.left, scope) === 'id') {
      const actual = role(node.left.object, scope), id = constant(node.right, scope);
      if (actual?.kind === 'element') { if (typeof id === 'string') domTags.set(id, [...new Set([...(domTags.get(id) || []), actual.tag || 'style'])]); else domTags.set('*', ['style']); }
    }
    if (node.type === 'CallExpression') {
      const call = invocation(node, scope);
      if (call?.kind === 'attribute' && call.method === 'setAttribute' && constant(call.args[0], scope) === 'id') {
        const actual = role(call.receiver, scope), id = constant(call.args[1], scope); if (typeof id === 'string') domTags.set(id, [...new Set([...(domTags.get(id) || []), actual?.tag || 'style'])]); else domTags.set('*', ['style']);
      }
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && ['innerHTML', 'outerHTML', 'srcdoc'].includes(keyOf(node.left, scope))) values = [node.right];
    if (node.type === 'CallExpression') { const call = invocation(node, scope); if (call?.kind === 'html') values = ['write', 'writeln'].includes(call.method) ? call.args : [call.args[call.method === 'insertAdjacentHTML' ? 1 : 0]]; }
    for (const value of values) for (const [id, tags] of htmlTagIndex(htmlShape(value, scope))) domTags.set(id, [...new Set([...(domTags.get(id) || []), ...tags])]);
  }
  const cssMaterial = name => name === 'cssText' || name?.startsWith('--') || /^(?:background|mask|borderImage|listStyle|cursor|content|filter|clipPath|src)/i.test(name || '');
  function cssValue(value, scope, label, actual) {
    const text = typeof value === 'string' ? value : constant(value, scope); if (typeof text !== 'string') dynamic(label);
    const found = cssResources(text, subject); if (actual?.uncertain && found.some(url => !/^(?:data:|#)/.test(url))) dynamic('stylesheet material base'); urls.push(...found); return text;
  }
  function localBlob(value, scope) {
    const origins = sourceNodes(value, scope);
    return origins.length > 0 && origins.every(({node, scope: owner}) => node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && builtin(node.callee.object, 'URL', owner) && keyOf(node.callee, owner) === 'createObjectURL' && !globalChanged(['URL', 'createObjectURL']) && node.arguments[0]?.type === 'NewExpression' && builtin(node.arguments[0].callee, 'Blob', owner));
  }
  let materialNode;
  function installedScriptType(actual) {
    if (Object.hasOwn(actual, 'namespace')) { if (actual.namespace === undefined) dynamic('script namespace'); if (actual.namespace !== 'http://www.w3.org/1999/xhtml') return 'inert'; }
    const writes = [];
    const add = (target, name, value, owner, node, {namespaced = false, namespace} = {}) => {
      if (role(target, owner)?.origin !== actual.origin || name !== 'type') return;
      // HTML reflected type uses only its exact null-namespace attribute.
      // Namespaced metadata cannot make an executable script inert.
      if (namespaced) { if (namespace === undefined) dynamic('script type namespace'); if (namespace !== null && namespace !== '') return; }
      linear(node, 'script type control flow', {before: materialNode, orderLabel: 'script type order', ownerLabel: 'script type execution owner'});
      const type = constant(value, owner); if (typeof type !== 'string') dynamic('script type'); writes.push(type.trim().toLowerCase());
    };
    for (const node of nodes) {
      const owner = nodeScopes.get(node);
      if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') add(node.left.object, keyOf(node.left, owner), node.right, owner, node);
      if (node.type !== 'CallExpression') continue;
      const call = invocation(node, owner); if (!call) continue;
      if (call.kind === 'attribute') {
        const namespaced = call.method === 'setAttributeNS', offset = namespaced ? 1 : 0, name = constant(call.args[offset], owner);
        add(call.receiver, typeof name === 'string' && !namespaced ? name.toLowerCase() : name, call.args[offset + 1], owner, node, {namespaced, namespace: namespaced ? constant(call.args[0], owner) : null});
      }
      if (['reflect', 'object'].includes(call.kind) && role(call.args[0], owner)?.origin === actual.origin) {
        if (call.method === 'assign') for (const object of call.args.slice(1)) for (const field of fields(object, owner)) add(call.args[0], field.name, field.value, field.scope, node);
        else if (call.method === 'set') add(call.args[0], constant(call.args[1], owner), call.args[2], owner, node);
      }
    }
    if (!writes.length && !actual.fresh) dynamic('script type origin');
    if (new Set(writes).size > 1) dynamic('script type drift');
    const type = writes[0] || '';
    return type === 'module' ? 'module' : !type || /^(?:application|text)\/(?:x-)?(?:java|ecma)script(?:1\.[0-5])?$/.test(type.split(';')[0].trim()) || ['text/jscript', 'text/livescript'].includes(type) ? 'script' : 'inert';
  }
  function slot(name, value, scope, actual, {attribute = false, namespace, download = false} = {}) {
    if (typeof name !== 'string') dynamic('native material name');
    if (attribute) name = name.toLowerCase();
    if (properties.has(name) || name === 'data' && actual?.tag === 'object') {
      if (name === 'src' && actual?.kind === 'element' && actual.tag === 'script') {
        const sourceType = installedScriptType(actual);
        if (sourceType !== 'inert') {
          const locator = typeof value === 'string' ? value : constant(value, scope);
          if (typeof locator !== 'string' || !loadScript || !locator.trim() || /^(?:data:|blob:|#)/i.test(locator)) dynamic('executable script origin');
          const unit = loadScript(locator, {subject: documentSubject, sourceType});
          if (!unit) dynamic('executable script origin');
          admitExecutable(unit);
        }
      }
      if (materialContext.collecting) return;
      // A proven anchor download of a native local Blob has no current material load.
      // Its future downloaded user HTML is not an attestation of offline closure.
      if (name === 'href' && download && localBlob(value, scope)) return;
      if (namespace !== undefined && namespace !== null && namespace !== '' && !(namespace === 'http://www.w3.org/1999/xlink' && name.replace(/^xlink:/, '') === 'href')) dynamic('material namespace');
      const shape = typeof value === 'string' ? value : htmlShape(value, scope);
      if (shape.includes(dynamicHtmlSlot) || shape.includes(currentDomHtml)) { if (!/^(?:data:|#)/.test(shape)) dynamic('resource.' + name); }
      urls.push(...(name === 'srcset' ? shape.split(',').map(part => part.trim().split(/\s+/)[0]) : [shape])); return;
    }
    if (name === 'xlink:href') return slot('href', value, scope, actual, {attribute, namespace});
    if (['innerHTML', 'outerHTML', 'srcdoc'].includes(name)) { if (actual?.tag === 'style' && name === 'innerHTML') { const text = cssValue(value, scope, name); cssState.set(actual.origin, text); } else html(typeof value === 'string' ? value : htmlShape(value, scope), name); return; }
    if (attribute && name === 'style') { cssValue(value, scope, 'style attribute'); return; }
    if (attribute && /^on[a-z]+$/.test(name)) { const text = typeof value === 'string' ? value : constant(value, scope); if (typeof text !== 'string') dynamic('executable handler'); admitExecutable({text, subject: documentSubject, handler: true, sourceType: 'script'}); }
  }
  function linear(node, label = 'CSS composite control flow', proof) {
    // Shared control-flow classification; callers keep their own diagnostics.
    // A type witness also needs a known eager path in the same execution owner,
    // unit and order as its sink. Unknown syntax cannot establish inert material.
    if (proof && (node.optional || node.type === 'AssignmentExpression' && node.operator !== '=')) dynamic(label);
    for (let parent = parents.get(node); parent && !/Function/.test(parent.type); parent = parents.get(parent)) {
      if (['IfStatement', 'ConditionalExpression', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement', 'SwitchStatement'].includes(parent.type)) dynamic(label);
      if (proof && (parent.optional || parent.type === 'AssignmentExpression' && ['&&=', '||=', '??='].includes(parent.operator) || !['ExpressionStatement', 'BlockStatement', 'Program', 'SequenceExpression', 'AssignmentExpression', 'CallExpression', 'NewExpression', 'ArrayExpression', 'ObjectExpression', 'Property', 'VariableDeclarator', 'VariableDeclaration', 'MemberExpression', 'BinaryExpression', 'UnaryExpression', 'UpdateExpression', 'TemplateLiteral'].includes(parent.type))) dynamic(label);
    }
    if (proof) {
      if (nodeUnits.get(node) !== nodeUnits.get(proof.before) || node.start > proof.before.start) dynamic(proof.orderLabel || label);
      const owner = value => { for (let parent = value; parent; parent = parents.get(parent)) if (parent.type === 'Program' || /Function/.test(parent.type)) return parent; };
      if (!owner(node) || owner(node) !== owner(proof.before)) dynamic(proof.ownerLabel || label);
    }
  }
  function setCss(actual, text, node, append = false) {
    linear(node); if (actual.uncertain || !actual.origin) dynamic('CSS owner');
    if (typeof text !== 'string') dynamic('CSS text'); const previous = cssState.get(actual.origin) ?? (actual.fresh ? '' : undefined);
    if (append && previous === undefined) dynamic('CSS previous text'); const result = append ? previous + text : text; cssState.set(actual.origin, result); urls.push(...cssResources(result, subject, {partial: true}));
  }
  function textValue(actual) { return textState.has(actual.origin) ? textState.get(actual.origin) : actual.initial; }
  for (const node of nodes) {
    materialNode = node;
    const unit = nodeUnits.get(node); subject = unit.subject; external = !!unit.external; loaders = unit.loaders || loaders;
    const scope = nodeScopes.get(node);
    if (node.type === 'ImportDeclaration' || /Export(?:Named|All)Declaration/.test(node.type) && node.source) { const value = constant(node.source, scope); if (typeof value !== 'string') dynamic('module locator'); (external ? loaders : urls).push(value); }
    if (node.type === 'ImportExpression') { const value = constant(node.source, scope); if (typeof value !== 'string') dynamic('import locator'); (external ? loaders : urls).push(value); }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
      const name = keyOf(node.left, scope), actual = role(node.left.object, scope);
      if (plain(node.left.object, scope)) continue;
      if (name === undefined && actual) dynamic('dynamic native property');
      if (actual?.kind === 'declaration' && cssMaterial(name)) { cssValue(node.right, scope, name); continue; }
      if (['textContent', 'innerText'].includes(name) && actual?.kind === 'element') {
        if (actual.tag !== 'style' && (actual.tag || actual.nonStyle)) continue;
        if (actual.tag !== 'style') dynamic('possible STYLE text owner'); setCss(actual, constant(node.right, scope), node, node.operator === '+='); continue;
      }
      if (['data', 'nodeValue', 'textContent'].includes(name) && actual?.kind === 'text') {
        const owner = textOwners.get(actual.origin) || actual.cssOwner, value = constant(node.right, scope); if (owner && typeof value !== 'string') dynamic('CSS Text value'); textState.set(actual.origin, node.operator === '+=' ? String(textValue(actual) ?? '') + value : value);
        if (owner) setCss({kind: 'element', tag: 'style', origin: owner}, textState.get(actual.origin), node); continue;
      }
      if ((properties.has(name) || ['innerHTML', 'outerHTML', 'srcdoc'].includes(name) || name === 'data' && actual?.tag === 'object') && (node.operator === '=' || ['innerHTML', 'outerHTML', 'srcdoc'].includes(name) && node.operator === '+=')) slot(name, node.right, scope, actual);
    }
    if (!['CallExpression', 'NewExpression'].includes(node.type)) continue;
    const call = invocation(node, scope); if (!call) continue; const args = call.args;
    if (['unsupported', 'descriptor'].includes(call.kind)) dynamic(call.method || 'native descriptor');
    if (call.kind === 'loader') {
      if (call.method === 'URL' && !(args[1]?.type === 'MemberExpression' && keyOf(args[1], scope) === 'url' && args[1].object.type === 'MetaProperty')) dynamic('URL base');
      const value = constant(args[0], scope); if (typeof value !== 'string') dynamic('loader.' + call.method); (external ? loaders : urls).push(value); continue;
    }
    if (call.kind === 'attribute') {
      if (call.method.startsWith('setAttributeNode')) dynamic('unsupported Attr writer');
      const ns = call.method === 'setAttributeNS' ? constant(args[0], scope) : undefined, name = constant(args[call.method === 'setAttributeNS' ? 1 : 0], scope), value = args[call.method === 'setAttributeNS' ? 2 : 1];
      if (name === undefined && call.method === 'setAttribute' && args[0]?.type === 'Identifier' && value?.type === 'Identifier') {
        let loop = parents.get(node); while (loop && loop.type !== 'ForOfStatement' && !/Function/.test(loop.type)) loop = parents.get(loop);
        const pattern = loop?.left?.declarations?.[0]?.id, entries = loop?.right;
        if (pattern?.type === 'ArrayPattern' && pattern.elements[0]?.name === args[0].name && pattern.elements[1]?.name === value.name && entries?.type === 'CallExpression' && entries.callee.type === 'MemberExpression' && builtin(entries.callee.object, 'Object', scope) && keyOf(entries.callee, scope) === 'entries' && !globalChanged(['Object', 'entries'])) {
          const actual = role(call.receiver, scope);
          const properties = fields(entries.arguments[0], scope);
          for (const field of properties) {
            const callSite = parents.get(field.bag), anchor = callSite?.type === 'CallExpression' && role(callSite, field.scope)?.tag === 'a', download = anchor && properties.some(other => other.bag === field.bag && other.name === 'download' && typeof constant(other.value, other.scope) === 'string');
            slot(field.name, field.value, field.scope, actual, {attribute: true, download});
          }
          continue;
        }
      }
      const actual = role(call.receiver, scope), material = typeof name !== 'string' || properties.has(name.toLowerCase()) || ['data', 'style', 'srcdoc', 'xlink:href'].includes(name.toLowerCase()) || /^on/i.test(name);
      if (material && actual?.kind !== 'element') dynamic('native attribute receiver');
      if (call.method === 'setAttributeNS' && ns === undefined) dynamic('native namespace'); slot(name, value, scope, actual, {attribute: true, namespace: ns}); continue;
    }
    if (call.kind === 'reflect' || call.kind === 'object') {
      const target = args[0], actual = role(target, scope); if (plain(target, scope)) continue;
      if (call.method === 'assign') {
        for (const object of args.slice(1)) { const values = sourceNodes(object, scope); if (!values.length || values.some(value => value.node.type !== 'ObjectExpression')) dynamic('opaque native property bag');
          for (const {node: value, scope: owner} of values) for (const property of value.properties) { if (property.type !== 'Property' || property.kind !== 'init') dynamic('native property bag'); const name = property.computed ? constant(property.key, owner) : property.key.name ?? property.key.value; slot(name, property.value, owner, actual); }
        }
      } else { const name = constant(args[1], scope); if (call.method === 'defineProperty') { if (typeof name !== 'string' || actual?.kind === 'prototype' || properties.has(name) || ['innerHTML', 'srcdoc', 'style', 'textContent'].includes(name) || /^on/.test(name)) dynamic('unproven native descriptor'); } else slot(name, args[2], scope, actual); }
      continue;
    }
    if (call.kind === 'cssSheet') { cssValue(args[0], scope, call.method, role(call.receiver, scope) || call.role); continue; }
    if (call.kind === 'cssDeclaration') { const name = constant(args[0], scope); if (typeof name !== 'string') dynamic('CSS property'); if (cssMaterial(name)) cssValue(args[1], scope, name); continue; }
    if (call.kind === 'textInsert') {
      // Clearing/no-op native text calls have no incoming resource text.
      if (!args.length) continue;
      const actual = role(call.receiver, scope) || call.role; if (actual.tag !== 'style' && (actual.tag || actual.nonStyle)) continue; if (actual.tag !== 'style') dynamic('possible STYLE insertion');
      let text = '', selected = call.method === 'insertAdjacentText' ? args.slice(1) : ['appendChild', 'insertBefore'].includes(call.method) ? args.slice(0, 1) : args;
      for (const argument of selected) { const value = constant(argument, scope), child = role(argument, scope); if (typeof value === 'string') text += value; else if (child?.kind === 'text') { const content = textValue(child); if (typeof content !== 'string') dynamic('CSS Text content'); text += content; textOwners.set(child.origin, actual.origin); } else dynamic('opaque CSS Text'); }
      if (['prepend', 'insertBefore', 'insertAdjacentText'].includes(call.method) && cssState.has(actual.origin)) dynamic('CSS insertion order');
      setCss(actual, text, node, call.method !== 'replaceChildren'); continue;
    }
    if (call.kind === 'textMutation') {
      const actual = role(call.receiver, scope) || call.role, owner = textOwners.get(actual.origin) || actual.cssOwner; if (!owner) continue; const previous = textValue(actual); if (typeof previous !== 'string') dynamic('CSS Text previous value');
      const offset = call.method === 'appendData' ? previous.length : constant(args[0], scope), length = call.method === 'replaceData' || call.method === 'deleteData' ? constant(args[1], scope) : 0;
      if (!Number.isInteger(offset) || !Number.isInteger(length)) dynamic('CSS Text offsets'); const value = call.method === 'deleteData' ? '' : constant(args[call.method === 'appendData' ? 0 : call.method === 'replaceData' ? 2 : 1], scope); if (typeof value !== 'string') dynamic('CSS Text value');
      const result = previous.slice(0, offset) + value + previous.slice(offset + length); textState.set(actual.origin, result); setCss({kind: 'element', tag: 'style', origin: owner}, result, node); continue;
    }
    if (call.kind === 'html') {
      const method = call.method;
      if (method === 'parseFromString') { const mime = constant(args[1], scope); if (typeof mime !== 'string') dynamic('parseFromString type'); if (mime.toLowerCase() !== 'text/html') continue; }
      const values = ['write', 'writeln'].includes(method) ? args : [args[method === 'insertAdjacentHTML' ? 1 : 0]]; html(values.map(value => htmlShape(value, scope)).join(''), method);
    }
  }
  for (const text of cssState.values()) urls.push(...cssResources(text, subject));
  return urls;
}

function htmlResources(text, subject, fragment = false, {loadScript, admitExecutable, collecting = false, scriptsExecutable = true} = {}) {
  const urls = [], units = [];
  const domTags = htmlTagIndex(text), domText = new Map(), css = value => urls.push(...cssResources(value, subject));
  const tree = fragment ? parseHtmlFragment(text) : parseHtml(text);
  const collect = node => { const id = (node.attrs || []).find(value => value.name === 'id')?.value; if (id && node.tagName === 'script' && !(node.attrs || []).some(value => value.name === 'src') && (node.attrs || []).some(value => value.name === 'type' && value.value.trim().toLowerCase() === 'application/json')) domText.set(id, (node.childNodes || []).map(child => child.value || '').join('')); (node.childNodes || []).forEach(collect); if (node.content) collect(node.content); }; collect(tree);
  const visit = node => {
    requireThat(node.tagName !== 'base', 'BASE_URL_REFUSED', subject);
    for (const attribute of node.attrs || []) {
      if (['src', 'href', 'poster', 'action'].includes(attribute.name) || node.tagName === 'object' && attribute.name === 'data') urls.push(attribute.value);
      if (attribute.name === 'srcset') urls.push(...attribute.value.split(',').map(part => part.trim().split(/\s+/)[0]));
      if (attribute.name === 'srcdoc') urls.push(...htmlResources(attribute.value, subject, true, {loadScript}));
      if (/^on[a-z]+$/.test(attribute.name)) {
        requireThat(!attribute.value.includes(dynamicHtmlSlot) && !attribute.value.includes(currentDomHtml), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: executable handler`);
        units.push({text: attribute.value, subject, handler: true, sourceType: 'script'});
      }
      if (attribute.name === 'style') css(attribute.value);
    }
    if (node.tagName === 'style') css((node.childNodes || []).map(child => child.value || '').join(''));
    if (node.tagName === 'script') {
      const scripts = [];
      const type = (node.attrs || []).find(attribute => attribute.name === 'type')?.value.trim().toLowerCase() || '';
      if (type === '' || type === 'module' || /^(?:application|text)\/(?:x-)?(?:java|ecma)script(?:1\.[0-5])?$/.test(type.split(';')[0].trim()) || ['text/jscript', 'text/livescript'].includes(type)) {
        const src = (node.attrs || []).find(attribute => attribute.name === 'src');
        if (src && loadScript) {
          const unit = loadScript(src.value, {subject, sourceType: type === 'module' ? 'module' : 'script'});
          // Unavailable executable material cannot attest unchanged native document identities.
          scripts.push(unit || {text: '', subject, sourceType: 'script', opaque: true});
        } else if (!src) {
          const code = (node.childNodes || []).map(child => child.value || '').join('');
          requireThat(!code.includes(dynamicHtmlSlot) && !code.includes(currentDomHtml), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: executable script`);
          scripts.push({text: code, subject, sourceType: type === 'module' ? 'module' : 'script'});
        }
      }
      if (scriptsExecutable) units.push(...scripts);
      else if (scripts.length) urls.push(...scriptResources('', subject, {units: scripts, domTags, domText, loadScript, documentSubject: subject}));
    }
    for (const child of node.childNodes || []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(tree);
  if (admitExecutable) units.forEach(admitExecutable);
  else if (units.length) urls.push(...scriptResources('', subject, {units, domTags, domText, loadScript, documentSubject: subject}));
  if (!collecting) requireThat(!urls.some(url => !url.startsWith('#') && !url.startsWith('data:') && (url.includes(dynamicHtmlSlot) || url.includes(currentDomHtml))), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: HTML resource URL`);
  return urls;
}

function dependencies(items, root, entry, context) {
  const selected = new Set(items.map(item => item.path)), referenced = new Set(), texts = new Map();
  requireThat(selected.has(entry), 'ENTRY_NOT_IN_CLOSURE', entry);
  const textOf = name => { if (!texts.has(name)) texts.set(name, read(path.join(root, name), context).toString('utf8')); return texts.get(name); };
  const domTags = htmlTagIndex(textOf(entry));
  const verify = (url, referringPath, subject) => {
    if (!url || url.startsWith('#') || url.startsWith('data:')) return;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) { requireThat((context.allowed_urls || []).includes(url), 'NETWORK_SCOPE_REFUSED', url); return; }
    requireThat(!url.startsWith('/') && !url.includes('\\') && !/%(?:2e|2f|5c)/i.test(url), 'DEPENDENCY_ESCAPE', url);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(referringPath), url.split(/[?#]/)[0])); relative(resolved);
    requireThat(selected.has(resolved), 'MATERIAL_CLOSURE_MISSING', `${subject} -> ${resolved}`); // guard:closure
    return resolved;
  };
  for (const item of items.filter(value => /\.html?$/i.test(value.path))) {
    const loaderResources = [];
    const loadScript = (url, owner) => {
      const name = verify(url, owner.subject, owner.subject); if (!name) return null;
      referenced.add(name); const loaders = []; loaderResources.push({path: name, loaders});
      return {text: textOf(name), subject: name, sourceType: owner.imported ? 'module' : owner.sourceType, external: true, loaders, key: name + ':' + (owner.imported ? 'module' : owner.sourceType)};
    };
    const urls = htmlResources(textOf(item.path), item.path, false, {loadScript});
    for (const url of urls) verify(url, item.path, item.path);
    for (const {path: name, loaders} of loaderResources) for (const url of loaders) verify(url, name, name);
  }
  for (const item of items) {
    if (!/\.(?:css|[mc]?js)$/i.test(item.path) || referenced.has(item.path)) continue;
    const text = textOf(item.path), urls = [], documentResources = [];
    // Standalone admitted JS retains its existing loader base; referenced JS was analyzed with its document.
    if (/\.[mc]?js$/i.test(item.path)) documentResources.push(...scriptResources(text, item.path, {sourceType: 'module', external: true, loaders: urls, domTags, documentSubject: entry}));
    if (/\.css$/i.test(item.path)) urls.push(...cssResources(text, item.path));
    for (const url of urls) verify(url, item.path, item.path);
    for (const url of documentResources) verify(url, entry, item.path);
  }
}

function boundChecks(bound, context) {
  processorNamespace(bound);
  validate(bound.source, 'source'); validate(bound.base, 'base'); validate(bound.scope, 'scope');
  validate(bound.methods, 'methods');
  sourceRef(bound.source, context); scopeRef(bound.scope, context);
  const root = rootPath(bound.base.asset_root);
  relative(bound.base.entry_relative);
  requireThat(bound.base.entry === path.join(root, bound.base.entry_relative), 'BASE_ENTRY_MISMATCH', bound.base.entry);
  const names = closure(bound.base.closure, root, context);
  requireThat(names.has(bound.base.entry_relative), 'ENTRY_NOT_IN_CLOSURE', bound.base.entry);
  checkedRef({ path: bound.base.entry, sha256: bound.base.sha256 }, context);
  requireThat(bound.base.origin !== 'open-design' || bound.base.recovery_ref, 'OD_RECOVERY_REQUIRED', bound.base.entry);
  if (bound.base.recovery_ref) checkedRef(bound.base.recovery_ref, context);
  if (bound.base.spec) checkedRef(bound.base.spec, context);
  for (const method of bound.methods) checkedRef({ path: method.path, sha256: method.sha256 }, context);
  dependencies(bound.base.closure, root, bound.base.entry_relative, context);
}

export function bindBase(input, context = {}) {
  requireThat(!Object.hasOwn(input, 'parent_accepted_ref'), 'DERIVATION_ENTRY_REQUIRED', 'Use deriveFromAccepted');
  const actual = contextFor(context);
  const bound = structuredClone(input);
  boundChecks(bound, actual);
  return bound;
}

export function prepareCopy(bound, options, context = {}) {
  const deliveryRoot = rootPath(options.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  boundChecks(bound, actual);
  const kind = options.kind || 'enhanced-copy';
  requireThat(['adequate-original', 'adequate-copy', 'enhanced-copy'].includes(kind), 'KIND', kind);
  const processor = processorNamespace(options);
  requireThat(!bound.parent_accepted_ref && !options.parent_accepted_ref, 'DERIVATION_ENTRY_REQUIRED', 'Use deriveFromAccepted');
  requireThat(processor !== 'prototype-notes' || kind !== 'adequate-original', 'PROCESSOR_KIND', kind);
  const attemptDir = attemptPath({ ...options, delivery_root: deliveryRoot });
  effects(actual, deliveryRoot, kind === 'adequate-original' ? ['metadata'] : ['copy', 'metadata']);
  if (kind === 'enhanced-copy') effects(actual, deliveryRoot, ['edit']);
  if (processor === 'prototype-notes') notesRawEffects(bound, deliveryRoot, actual);
  requireThat(!within(deliveryRoot, bound.base.asset_root) && !within(bound.base.asset_root, deliveryRoot) || kind === 'adequate-original', 'SOURCE_OUTPUT_OVERLAP', deliveryRoot);
  if (kind === 'adequate-original') requireThat(within(bound.base.entry, deliveryRoot), 'OUTSIDE_ROOT_FINAL', bound.base.entry);
  return createAttempt(bound, { ...options, kind, processor_id: processor }, actual, attemptDir);
}
function createAttempt(bound, options, actual, attemptDir) {
  const kind = options.kind;
  const parent = path.dirname(attemptDir);
  noSymlink(parent, false);
  noSymlink(attemptDir, false);
  fs.mkdirSync(parent, { recursive: true });
  try { fs.mkdirSync(attemptDir); } catch (error) { if (error.code === 'EEXIST') fail('ATTEMPT_EXISTS', attemptDir); throw error; }
  const contentRoot = path.join(attemptDir, 'content');
  if (kind !== 'adequate-original') {
    fs.mkdirSync(contentRoot);
    for (const item of bound.base.closure) {
      const target = path.join(contentRoot, item.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, read(path.join(bound.base.asset_root, item.path), actual), { flag: 'wx' });
    }
  }
  return { attempt_id: options.attempt_id, attempt_dir: attemptDir, content_root: kind === 'adequate-original' ? null : contentRoot,
    entry: kind === 'adequate-original' ? bound.base.entry : path.join(contentRoot, bound.base.entry_relative), kind,
    processor_id: processorNamespace(options) };
}

function baseFromParent(parent) {
  const assetRoot = parent.delivery.kind === 'adequate-original' ? parent.base.asset_root : path.join(attemptPath(parent.candidate), 'content');
  return { ...structuredClone(parent.base), entry: parent.final_entry, sha256: parent.final_sha256, asset_root: assetRoot,
    closure: parent.delivery.closure.map(item => ({ ...item, path: path.relative(assetRoot, path.join(parent.delivery_root, item.path)).split(path.sep).join('/') })),
    spec: { path: parent.spec_path, sha256: parent.spec_sha256 } };
}
function acceptedMotion(parentRef, deliveryRoot, context) {
  // Check the processor before recursively resolving. Notes cannot nominate another notes child or a cycle.
  const certificate = JSON.parse(checkedRef(parentRef, context));
  validate(certificate, 'accepted');
  const candidate = JSON.parse(checkedRef(certificate.candidate_ref, context));
  validate(candidate, 'candidate');
  requireThat(processorNamespace(certificate) === 'motion-polish' && processorNamespace(candidate) === 'motion-polish' &&
    !candidate.parent_accepted_ref, 'PARENT_PROCESSOR', parentRef.path);
  return resolveFinal({ ...parentRef, delivery_root: deliveryRoot }, context);
}
function parentChecks(subject, deliveryRoot, context) {
  requireThat(processorNamespace(subject) === 'prototype-notes', 'PARENT_PROCESSOR', 'Only accepted motion to notes');
  const parent = acceptedMotion(subject.parent_accepted_ref, deliveryRoot, context);
  requireThat(parent.delivery_root === deliveryRoot, 'PARENT_ROOT', deliveryRoot);
  requireThat(equal(subject.source, parent.source_ref) && equal(subject.base, baseFromParent(parent)), 'PARENT_BASE_MISMATCH', subject.base.entry); // guard:parent-base
  const content = path.join(attemptPath(subject), 'content');
  noSymlink(content, false);
  const parentRoot = rootPath(subject.base.asset_root);
  requireThat(!within(content, parentRoot) && !within(parentRoot, content), 'PARENT_CONTENT_OVERLAP', content);
  if (subject.required_behavior_refs) requireThat(parent.required_behavior_refs.every(id => subject.required_behavior_refs.includes(id)), 'PARENT_REQUIRED_MISSING', deliveryRoot); // guard:parent-required
  return parent;
}
export function deriveFromAccepted(input, context = {}) {
  const keys = ['accepted_ref', 'delivery_root', 'attempt_id', 'processor_id', 'scope', 'methods', 'authority_ref'];
  requireThat(input && keys.every(key => Object.hasOwn(input, key)) && Object.keys(input).every(key => keys.includes(key)), 'DERIVATION_INPUT', 'Exact accepted ref, no caller base');
  requireThat(processorNamespace(input) === 'prototype-notes', 'PROCESSOR_TRANSITION', 'Only accepted motion to notes');
  requireThat(typeof input.authority_ref === 'string' && input.authority_ref.length, 'SCHEMA', 'authority_ref');
  const deliveryRoot = rootPath(input.delivery_root), actual = contextFor(context, deliveryRoot);
  effects(actual, deliveryRoot, ['copy', 'edit', 'metadata']);
  const attemptDir = attemptPath(input);
  const parent = acceptedMotion(input.accepted_ref, deliveryRoot, actual);
  const bound = { source: structuredClone(parent.source_ref), base: baseFromParent(parent), scope: structuredClone(input.scope),
    methods: structuredClone(input.methods), authority_ref: input.authority_ref, processor_id: 'prototype-notes', parent_accepted_ref: structuredClone(input.accepted_ref) };
  boundChecks(bound, actual);
  parentChecks({ ...bound, ...input }, deliveryRoot, actual);
  const attempt = createAttempt(bound, { ...input, kind: 'enhanced-copy' }, actual, attemptDir);
  // Source and accepted dependencies must still be the exact snapshot after every copy read.
  boundChecks(bound, actual);
  parentChecks({ ...bound, ...input }, deliveryRoot, actual);
  closure(bound.base.closure, attempt.content_root, actual);
  return { bound, attempt, parent_accepted_ref: structuredClone(input.accepted_ref) };
}

function publish(file, bytes) {
  noSymlink(path.dirname(file)); noSymlink(file, false);
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    try { fs.linkSync(temp, file); } catch (error) { // guard:no-replace
      if (error.code !== 'EEXIST') fail('ATOMIC_NO_REPLACE_UNAVAILABLE', `${file}: ${error.code}`);
      requireThat(fs.readFileSync(file).equals(bytes), 'PUBLICATION_CONFLICT', file);
    }
    const directory = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    requireThat(fs.readFileSync(file).equals(bytes), 'PUBLICATION_DRIFT', file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
  return ref(file);
}
function attemptPath(candidate) {
  requireThat(typeof candidate.attempt_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(candidate.attempt_id), 'ATTEMPT_ID', String(candidate.attempt_id)); // guard:attempt-id
  const parent = path.join(absolute(candidate.delivery_root), processorNamespace(candidate));
  const directory = path.join(parent, candidate.attempt_id);
  requireThat(within(directory, parent), 'PATH_ESCAPE', directory);
  return directory;
}
function contentInventory(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      noSymlink(full);
      if (entry.isDirectory()) walk(full);
      else { requireThat(entry.isFile(), 'CONTENT_FILE_REQUIRED', full); files.push(path.relative(root, full).split(path.sep).join('/')); }
    }
  }
  walk(root);
  return files.sort();
}
function candidateChecks(candidate, context) {
  validate(candidate, 'candidate');
  const deliveryRoot = rootPath(candidate.delivery_root);
  const processor = processorNamespace(candidate);
  if (candidate.parent_accepted_ref) parentChecks(candidate, deliveryRoot, context);
  else if (processor === 'prototype-notes') requireThat(!within(deliveryRoot, candidate.base.asset_root) && !within(candidate.base.asset_root, deliveryRoot), 'SOURCE_OUTPUT_OVERLAP', deliveryRoot);
  requireThat(processor === 'prototype-notes' || !candidate.notes_manifest_ref, 'NOTES_PROCESSOR_REQUIRED', deliveryRoot);
  requireThat(processor !== 'prototype-notes' || candidate.delivery.kind !== 'adequate-original', 'PROCESSOR_KIND', candidate.delivery.kind);
  boundChecks(candidate, context);
  const attemptDir = noSymlink(attemptPath(candidate));
  requireThat(candidate.delivery.id === candidate.attempt_id, 'ATTEMPT_MISMATCH', candidate.attempt_id);
  const entry = path.join(deliveryRoot, relative(candidate.delivery.entry));
  checkedRef({ path: entry, sha256: candidate.delivery.sha256 }, context);
  closure(candidate.delivery.closure, deliveryRoot, context);
  const copied = candidate.delivery.kind !== 'adequate-original';
  const contentRoot = copied ? path.join(attemptDir, 'content') : candidate.base.asset_root;
  if (copied) requireThat(entry === path.join(contentRoot, candidate.base.entry_relative), 'COPY_TOPOLOGY', entry);
  else requireThat(entry === candidate.base.entry, 'ORIGINAL_ENTRY', entry);
  const local = candidate.delivery.closure.map(item => ({ ...item, path: path.relative(contentRoot, path.join(deliveryRoot, item.path)).split(path.sep).join('/') }));
  local.forEach(item => relative(item.path));
  if (copied) requireThat(equal(contentInventory(contentRoot), local.map(item => item.path).sort()), 'UNDECLARED_CONTENT', contentRoot);
  dependencies(local, contentRoot, candidate.base.entry_relative, context);
  checkedRef(candidate.delivery.spec, context);
  requireThat(within(candidate.delivery.spec.path, attemptDir) && !within(candidate.delivery.spec.path, path.join(attemptDir, 'content')) ||
    candidate.delivery.kind === 'adequate-original' && candidate.base.spec && equal(candidate.delivery.spec, candidate.base.spec), 'SPEC_LOCATION', candidate.delivery.spec.path);
  checkedRef(candidate.methods_ref, context);
  requireThat(candidate.methods_ref.path === path.join(attemptDir, 'methods.json') && equal(JSON.parse(read(candidate.methods_ref.path, context)), candidate.methods), 'METHODS_MISMATCH', attemptDir);
  const patch = JSON.parse(checkedRef({ path: candidate.patch.path, sha256: candidate.patch.sha256 }, context));
  validate(patch, 'patch_data');
  requireThat(candidate.patch.path === path.join(attemptDir, 'patch.json') && equal(patch.operations, candidate.patch.operations) &&
    patch.base_sha256 === candidate.patch.base_sha256 && patch.content_changed === candidate.patch.content_changed &&
    patch.base_sha256 === candidate.base.sha256, 'PATCH_MISMATCH', candidate.patch.path);
  const base = new Map(candidate.base.closure.map(item => [item.path, item]));
  const final = new Map(local.map(item => [item.path, item]));
  requireThat([...base.keys()].every(key => final.has(key)), 'COPY_CLOSURE_MISSING', attemptDir);
  const changed = [...new Set([...base.keys(), ...final.keys()])].filter(key => base.get(key)?.sha256 !== final.get(key)?.sha256);
  const operations = patch.operations;
  requireThat(operations.length === changed.length && new Set(operations.map(item => item.path)).size === operations.length &&
    operations.every(item => changed.includes(item.path) && item.before_sha256 === (base.get(item.path)?.sha256 || null) && item.after_sha256 === final.get(item.path)?.sha256), 'PATCH_CONTENT_MISMATCH', attemptDir);
  if (candidate.delivery.kind !== 'enhanced-copy') {
    requireThat(!changed.length && operations.length === 0 && patch.content_changed === false, 'ADEQUATE_COPY_CHANGED', attemptDir); // guard:adequate-bytes
  } else requireThat(changed.length > 0 && patch.content_changed === true, 'ENHANCEMENT_UNCHANGED', attemptDir);
  if (processor === 'prototype-notes') notesManifestChecks(candidate, attemptDir, context);
  return { entry, attemptDir };
}
function notesManifestChecks(candidate, attemptDir, context) {
  requireThat(candidate.notes_manifest_ref, 'NOTES_MANIFEST_REQUIRED', attemptDir);
  const file = absolute(candidate.notes_manifest_ref.path);
  requireThat(within(file, attemptDir) && !within(file, path.join(attemptDir, 'content')) &&
    file !== absolute(candidate.delivery.spec.path) &&
    !['methods.json', 'patch.json', 'candidate-subject.json', 'qa-results.json', 'accepted-delivery.json', 'prototype-spec.md'].includes(path.basename(file)), 'NOTES_MANIFEST_LOCATION', file);
  const manifest = JSON.parse(checkedRef(candidate.notes_manifest_ref, context));
  validate(manifest, 'notes_manifest');
  requireThat(equal(manifest.scope, candidate.scope), 'NOTES_SCOPE_MISMATCH', file);
  const ids = manifest.required_behavior_refs, mapped = manifest.behavior_mapping.map(item => item.behavior_id);
  requireThat(ids.length === candidate.required_behavior_refs.length && candidate.required_behavior_refs.every(id => ids.includes(id)) &&
    mapped.length === ids.length && new Set(mapped).size === mapped.length && ids.every(id => mapped.includes(id)) &&
    equal([...manifest.notes_instance_refs].sort(), ids.filter(id => id.startsWith('NOTES:')).sort()), 'NOTES_REQUIRED_SET_MISMATCH', file); // guard:notes-set
  checkedRef(manifest.input_data_ref, context);
  checkedRef({ path: manifest.runtime.path, sha256: manifest.runtime.sha256 }, context);
  checkedRef({ path: manifest.content_guideline.path, sha256: manifest.content_guideline.sha256 }, context);
}

export function checkCandidate(input, context = {}) {
  const candidate = { schema_version: 1, kind: 'preaccept-candidate', ...structuredClone(input) };
  const deliveryRoot = rootPath(candidate.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  effects(actual, deliveryRoot, ['metadata']);
  processorNamespace(candidate);
  if (processorNamespace(candidate) === 'prototype-notes' && !candidate.parent_accepted_ref) {
    validate(candidate.base, 'base');
    notesRawEffects(candidate, deliveryRoot, actual);
  }
  const attemptDir = noSymlink(attemptPath(candidate));
  candidate.methods_ref = publish(path.join(attemptDir, 'methods.json'), encode(candidate.methods));
  candidateChecks(candidate, actual);
  if (candidate.delivery.kind === 'enhanced-copy') {
    effects(actual, deliveryRoot, ['edit']);
    requireThat(candidate.patch.operations.every(item => actual.effects.edit_paths?.includes(item.path)), 'EDIT_SCOPE_REFUSED', attemptDir);
  }
  const candidateRef = publish(path.join(attemptDir, 'candidate-subject.json'), encode(candidate));
  return { candidate_ref: candidateRef, ...resolvedCandidate(candidate, candidateRef) };
}
function resolvedCandidate(candidate, candidateRef) {
  return { candidate_ref: candidateRef, delivery_root: candidate.delivery_root, final_entry: path.join(candidate.delivery_root, candidate.delivery.entry),
    final_sha256: candidate.delivery.sha256, spec_path: candidate.delivery.spec.path, spec_sha256: candidate.delivery.spec.sha256,
    source_ref: candidate.source, base: candidate.base, raw_provenance: candidate.base.recovery_ref || null,
    required_behavior_refs: candidate.required_behavior_refs, delivery: candidate.delivery, candidate,
    processor_id: processorNamespace(candidate), parent_accepted_ref: candidate.parent_accepted_ref || null, notes_manifest_ref: candidate.notes_manifest_ref || null };
}
export function resolveCandidateSubject(input, context = {}) {
  const deliveryRoot = rootPath(input.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  const candidateRef = { path: absolute(input.path), sha256: input.sha256 };
  requireThat(within(candidateRef.path, deliveryRoot), 'SUBJECT_OUTSIDE_ROOT', candidateRef.path);
  const candidate = JSON.parse(checkedRef(candidateRef, actual));
  requireThat(candidate.delivery_root === deliveryRoot && candidateRef.path === path.join(attemptPath(candidate), 'candidate-subject.json'), 'SUBJECT_PATH_MISMATCH', candidateRef.path);
  candidateChecks(candidate, actual);
  return resolvedCandidate(candidate, candidateRef);
}
function reportChecks(reportRef, resolved, context) {
  const report = JSON.parse(checkedRef(reportRef, context));
  validate(report, 'report');
  requireThat(processorNamespace(report) === resolved.processor_id, 'REPORT_PROCESSOR_MISMATCH', reportRef.path);
  requireThat(reportRef.path === path.join(attemptPath(resolved.candidate), 'qa-results.json'), 'REPORT_LOCATION', reportRef.path);
  requireThat(equal(report.candidate_ref, resolved.candidate_ref) && report.final_sha256 === resolved.final_sha256, 'REPORT_SUBJECT_MISMATCH', reportRef.path);
  const ids = report.required_behavior_results.map(item => item.id);
  requireThat(ids.length === resolved.required_behavior_refs.length && new Set(ids).size === ids.length &&
    resolved.required_behavior_refs.every(id => ids.includes(id)), 'REQUIRED_SET_MISMATCH', reportRef.path); // guard:required-set
  requireThat(report.status === 'PASS' && report.required_behavior_results.every(item => item.status === 'PASS'), 'REQUIRED_NOT_PASS', reportRef.path);
  for (const item of report.required_behavior_results) for (const evidence of item.evidence_refs) checkedRef(evidence, context);
  checkedRef(report.reviewer_provenance.invocation_ref, context);
  checkedRef(report.reviewer_provenance.output_ref, context);
  return report;
}
export function sealAccepted(input, context = {}) {
  const actual = contextFor(context, input.delivery_root);
  effects(actual, input.delivery_root, ['metadata']);
  const resolved = resolveCandidateSubject({ ...input.candidate_ref, delivery_root: input.delivery_root }, actual);
  if (resolved.processor_id === 'prototype-notes' && resolved.delivery.kind === 'enhanced-copy') {
    effects(actual, input.delivery_root, ['edit']);
    requireThat(resolved.candidate.patch.operations.every(item => actual.effects.edit_paths?.includes(item.path)), 'EDIT_SCOPE_REFUSED', resolved.candidate.attempt_id);
  }
  reportChecks(input.report_ref, resolved, actual);
  const certificate = { schema_version: 1, kind: 'accepted-prototype-delivery', attempt_id: resolved.candidate.attempt_id,
    candidate_ref: input.candidate_ref, acceptance_ref: input.report_ref,
    final: { entry: resolved.candidate.delivery.entry, sha256: resolved.final_sha256, spec: resolved.candidate.delivery.spec } };
  if (Object.hasOwn(resolved.candidate, 'processor_id')) certificate.processor_id = resolved.candidate.processor_id;
  if (resolved.parent_accepted_ref) certificate.parent_accepted_ref = resolved.parent_accepted_ref;
  if (resolved.notes_manifest_ref) certificate.notes_manifest_ref = resolved.notes_manifest_ref;
  validate(certificate, 'accepted');
  // Re-read all frozen dependencies immediately before publication, including when reusing identical bytes.
  resolveCandidateSubject({ ...input.candidate_ref, delivery_root: input.delivery_root }, actual);
  reportChecks(input.report_ref, resolved, actual);
  const acceptedRef = publish(path.join(attemptPath(resolved.candidate), 'accepted-delivery.json'), encode(certificate));
  return resolveFinal({ ...acceptedRef, delivery_root: input.delivery_root }, actual);
}
export function resolveFinal(input, context = {}) {
  const deliveryRoot = rootPath(input.delivery_root);
  const actual = contextFor(context, deliveryRoot);
  const acceptedRef = { path: absolute(input.path), sha256: input.sha256 };
  requireThat(within(acceptedRef.path, deliveryRoot), 'ACCEPTED_OUTSIDE_ROOT', acceptedRef.path);
  const certificate = JSON.parse(checkedRef(acceptedRef, actual));
  validate(certificate, 'accepted');
  const resolved = resolveCandidateSubject({ ...certificate.candidate_ref, delivery_root: deliveryRoot }, actual);
  requireThat(processorNamespace(certificate) === resolved.processor_id && equal(certificate.parent_accepted_ref || null, resolved.parent_accepted_ref) &&
    equal(certificate.notes_manifest_ref || null, resolved.notes_manifest_ref), 'CERTIFICATE_PROCESSOR_MISMATCH', acceptedRef.path);
  requireThat(acceptedRef.path === path.join(attemptPath(resolved.candidate), 'accepted-delivery.json') &&
    certificate.attempt_id === resolved.candidate.attempt_id && equal(certificate.final, { entry: resolved.candidate.delivery.entry,
      sha256: resolved.final_sha256, spec: resolved.candidate.delivery.spec }), 'CERTIFICATE_MISMATCH', acceptedRef.path);
  reportChecks(certificate.acceptance_ref, resolved, actual);
  return { ...resolved, accepted_ref: acceptedRef, acceptance_ref: certificate.acceptance_ref, integrity: 'PASS', reviewer_authenticity: 'CALLER_RESPONSIBILITY' };
}

function cli(argv) {
  const [command, ...args] = argv;
  requireThat(['candidate-check', 'validate', 'resolve'].includes(command), 'CLI_USAGE', 'candidate-check|validate|resolve');
  const options = { read_paths: [], read_roots: [] };
  const acceptedFlags = new Set(['--subject', '--accepted', '--sha256', '--delivery-root', '--read-path', '--read-root']);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    requireThat(acceptedFlags.has(flag) && value && !value.startsWith('--'), 'CLI_USAGE', flag);
    if (flag === '--read-path') options.read_paths.push(absolute(value));
    else if (flag === '--read-root') options.read_roots.push(absolute(value));
    else { requireThat(!options[flag], 'CLI_USAGE', `duplicate ${flag}`); options[flag] = value; }
  }
  requireThat(options['--sha256'] && options['--delivery-root'] &&
    (command === 'candidate-check' ? options['--subject'] && !options['--accepted'] : options['--accepted'] && !options['--subject']), 'CLI_USAGE', 'exact identity flags required');
  const input = { path: options[command === 'candidate-check' ? '--subject' : '--accepted'], sha256: options['--sha256'], delivery_root: options['--delivery-root'] };
  return command === 'candidate-check' ? resolveCandidateSubject(input, options) : resolveFinal(input, options);
}
if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) { // guard:cli-entry
  try { console.log(JSON.stringify(cli(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
