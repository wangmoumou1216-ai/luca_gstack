// Pure material/dependency authority. Callers provide authorized immutable bytes.
// Downloaded material is parsed, never executed; this owner has no filesystem or network API.
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parse as parseHtml, parseFragment as parseHtmlFragment } from 'parse5';
import { parse as parseJavaScript } from 'acorn';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, detail) => { throw Object.assign(new Error(`${code}: ${detail}`), {code}); };
const requireThat = (test, code, detail) => { if (!test) fail(code, detail); };
const dynamicHtmlSlot = '__material_dynamic_slot_' + randomUUID() + '__';
const currentDomHtml = '__material_current_dom_' + randomUUID() + '__';
const MAX_BYTES = 50 * 1024 * 1024;
function relative(value) {
  requireThat(typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[\\\0?#]/.test(value), 'PATH_ESCAPE', String(value));
  requireThat(value.split('/').every(part => part && part !== '.' && part !== '..'), 'PATH_ESCAPE', value); return value;
}
function utf8(bytes, subject) {
  requireThat(Buffer.isBuffer(bytes), 'MATERIAL_BYTES_REQUIRED', subject); const text = bytes.toString('utf8');
  requireThat(Buffer.from(text).equals(bytes), 'MATERIAL_UTF8_REQUIRED', subject); return text;
}
function astBudget(program, budget) {
  const pending = [[program, 0]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    requireThat(depth <= 256 && ++budget.nodes <= 250000, 'MATERIAL_ANALYSIS_LIMIT', 'AST budget');
    for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child.type === 'string') pending.push([child, depth + 1]);
  }
}
// Validate both ordinary children and TEMPLATE content without using the native
// call stack. Each document has a finite shape and every walk shares the total
// analysis budget, including secondary members and installed HTML fragments.
function* htmlNodes(tree, budget, subject) {
  const pending = [[tree, 0]]; let nodes = 1;
  while (pending.length) {
    const [node, depth] = pending.pop();
    requireThat(depth <= 128 && ++budget.steps <= 2000000, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: HTML traversal budget`);
    yield node;
    const add = child => { requireThat(++nodes <= 20000, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: HTML node budget`); pending.push([child, depth + 1]); };
    if (node.content) add(node.content);
    const children = node.childNodes || [];
    for (let i = children.length - 1; i >= 0; i--) add(children[i]);
  }
}
function scanner(budget) {
let htmlAnalysisDepth = 0;
// Typed CSS input only. This is a finite locator lexer, never CSS/JS execution.
function cssResources(text, subject, {partial = false} = {}) {
  requireThat(typeof text === 'string' && !text.includes(dynamicHtmlSlot) && !text.includes(currentDomHtml), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS text`);
  requireThat(text.length <= MAX_BYTES, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: CSS bytes`);
  const urls = [];
  const quoted = (start) => {
    const quote = text[start]; let end = start + 1;
    while (end < text.length && text[end] !== quote) { if (text[end] === '\\') end++; end++; }
    requireThat(end < text.length, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS string`);
    return {value: text.slice(start + 1, end), end: end + 1};
  };
  for (let index = 0; index < text.length;) {
    requireThat(++budget.steps <= 2000000, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: CSS traversal budget`);
    if (text.startsWith('/*', index)) { const end = text.indexOf('*/', index + 2); requireThat(end >= 0, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: CSS comment`); index = end + 2; continue; }
    if ('"\''.includes(text[index])) { index = quoted(index).end; continue; }
    if (text[index] === '\\') fail('DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: escaped CSS syntax`);
    if (/^(?:(?:-webkit-)?image-set|image|cross-fade|paint|src|(?:-moz-)?element)\s*\(/i.test(text.slice(index)) && (index === 0 || !/[\w-]/.test(text[index - 1]))) fail('DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: unsupported CSS resource function`);
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
  const result = new Map();
  for (const node of htmlNodes(parseHtml(text), budget, 'HTML index')) { const id = (node.attrs || []).find(value => value.name === 'id')?.value; if (id) result.set(id, [...(result.get(id) || []), node.tagName]); }
  return result;
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
    astBudget(program, budget);
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
  let inferenceDepth = 0;
  const bounded = fn => function(...args) {
    requireThat(inferenceDepth < 64 && ++budget.steps <= 2000000, 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: inference budget`);
    inferenceDepth++; try { return fn(...args); } finally { inferenceDepth--; }
  };
  constant = bounded(constant); sourceNodes = bounded(sourceNodes); documentReceiver = bounded(documentReceiver);
  globalPath = bounded(globalPath); mutationCall = bounded(mutationCall); nativeEffects = bounded(nativeEffects);
  nativeIdentity = bounded(nativeIdentity); memberIdentity = bounded(memberIdentity); readerBinding = bounded(readerBinding);
  domReceiver = bounded(domReceiver); htmlShape = bounded(htmlShape); role = bounded(role); nativeTarget = bounded(nativeTarget);
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
    if (!node || seen.has(node)) return undefined; seen = new Set([...seen, node]);
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
      const key = node.computed ? constant(node.property, scope, seen) : node.property.name;
      const values = sourceNodes(node.object, scope, seen).flatMap(value => {
        if (value.node.type === 'ObjectExpression') {
          const selected = value.node.properties.filter(property => property.type === 'Property' && (key === undefined || String(property.computed ? constant(property.key, value.scope, seen) : property.key.name ?? property.key.value) === String(key)));
          const fields = selected.flatMap(property => { const resolved = sourceNodes(property.value, value.scope, seen); return resolved.length ? resolved : [{node: property.value, scope: value.scope}]; });
          if (!selected.length || value.node.properties.some(property => property.type === 'SpreadElement')) fields.push({node, scope});
          return fields;
        }
        if (value.node.type === 'ArrayExpression' && /^\d+$/.test(String(key))) return sourceNodes(value.node.elements[Number(key)], value.scope, seen);
        return [{node, scope}];
      });
      const identity = memberIdentity(node, scope, seen);
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
      const method = node.left.computed ? constant(node.left.property, scope) : node.left.property.name, reader = method === 'onload' ? readerBinding(node.left.object, scope) : null;
      if (reader && method === 'onload' && /Function/.test(node.right.type)) nodeScopes.get(node.right).readerLoad = reader;
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const method = node.callee.computed ? constant(node.callee.property, scope) : node.callee.property.name, reader = ['onload', 'addEventListener'].includes(method) ? readerBinding(node.callee.object, scope) : null;
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
      const method = node.callee.computed ? constant(node.callee.property, scope) : node.callee.property.name, binding = /^readAs/.test(method || '') ? readerBinding(node.callee.object, scope) : null;
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
  requireThat(htmlAnalysisDepth < 64, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: nested HTML analysis budget`);
  htmlAnalysisDepth++;
  try {
  requireThat(typeof text === 'string' && text.length <= MAX_BYTES, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: HTML material bytes`);
  const urls = [], units = [];
  const domTags = htmlTagIndex(text), domText = new Map(), css = value => urls.push(...cssResources(value, subject));
  const nodes = [...htmlNodes(fragment ? parseHtmlFragment(text) : parseHtml(text), budget, subject)];
  for (const node of nodes) { requireThat(++budget.steps <= 2000000, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: HTML collection budget`); const id = (node.attrs || []).find(value => value.name === 'id')?.value; if (id && node.tagName === 'script' && !(node.attrs || []).some(value => value.name === 'src') && (node.attrs || []).some(value => value.name === 'type' && value.value.trim().toLowerCase() === 'application/json')) domText.set(id, (node.childNodes || []).map(child => child.value || '').join('')); }
  const visit = node => {
    requireThat(++budget.steps <= 2000000, 'MATERIAL_ANALYSIS_LIMIT', `${subject}: HTML traversal budget`);
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
  };
  for (const node of nodes) visit(node);
  if (admitExecutable) units.forEach(admitExecutable);
  else if (units.length) urls.push(...scriptResources('', subject, {units, domTags, domText, loadScript, documentSubject: subject}));
  if (!collecting) requireThat(!urls.some(url => !url.startsWith('#') && !url.startsWith('data:') && (url.includes(dynamicHtmlSlot) || url.includes(currentDomHtml))), 'DYNAMIC_DEPENDENCY_UNRESOLVED', `${subject}: HTML resource URL`);
  return urls;
  } finally { htmlAnalysisDepth--; }
}

function dependencies(items, entry, bytesOf, allowedUrls) {
  const selected = new Set(items.map(item => item.path)), referenced = new Set(), texts = new Map();
  requireThat(selected.has(entry), 'ENTRY_NOT_IN_CLOSURE', entry);
  const textOf = name => { if (!texts.has(name)) texts.set(name, utf8(bytesOf(name), name)); return texts.get(name); };
  const domTags = htmlTagIndex(textOf(entry));
  const verify = (url, referringPath, subject) => {
    if (!url || url.startsWith('#') || url.startsWith('data:')) return;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) { requireThat(allowedUrls.includes(url), 'NETWORK_SCOPE_REFUSED', url); return; }
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

return {dependencies, cssResources, scriptResources, htmlResources, htmlTagIndex};
}

const DC_RUNTIME = Object.freeze([
  {path: 'vendor/react.js', sha256: 'd949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd'},
  {path: 'vendor/react-dom.js', sha256: '35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d'},
  {path: 'support.js', sha256: '654b7f6201e7e08c0aa3d9c670125d53b47f1438141ecd0d7df05589a877b324'}
]);
// Identity pins select this reviewed runtime; they are not an opaque-script waiver.
// support zt() refetches the same entry; dn() can fall back to React CDN if local
// preloads fail. x-import enables Babel/fetch/new Function; component references
// enable sibling fetch. The grammar below excludes those import/config triggers.
// Browser serving, globals, responses and self-refetch still require independent
// RUNTIME:DC_EXPORT_V1 evidence. Static inspection never certifies that environment.
const DC_TAGS = new Set('html head meta title body x-dc helmet style script sc-for sc-if div header aside section main span h1 h2 h3 h4 h5 h6 p ul ol li strong em b i small label input button dl dt dd br hr'.split(' '));
const forbiddenKeys = new Set(['constructor', 'prototype', '__proto__', 'call', 'apply', 'bind', 'ref', 'dangerouslySetInnerHTML', 'srcDoc', 'innerHTML', 'outerHTML']);
const attrsOf = node => new Map((node.attrs || []).map(a => [a.name, a.value]));
const textOfNode = node => (node.childNodes || []).map(n => n.value || '').join('');
const profileFail = detail => fail('DC_RUNTIME_PROFILE_REFUSED', detail);
const profileRequire = (test, detail) => { if (!test) profileFail(detail); };
const scalar = (type, values = null) => ({kind: 'scalar', type, values: values === null ? null : new Set(values)});
const literal = value => scalar(value === null ? 'null' : typeof value, [value]);
const undef = () => scalar('undefined', [undefined]);
const cellValue = value => value?.kind === 'cell' ? cellValue(value.value) : value;
function union(values) {
  const flat = values.flatMap(v => cellValue(v)?.kind === 'union' ? cellValue(v).values : [cellValue(v)]).filter(Boolean);
  if (!flat.length) return undef();
  const scalars = new Map(), others = new Set();
  for (const v of flat) { if (v.kind !== 'scalar') { others.add(v); continue; } const previous = scalars.get(v.type); scalars.set(v.type, scalar(v.type, previous?.values === null || v.values === null ? null : [...(previous?.values || []), ...v.values])); }
  const unique = [...scalars.values(), ...others]; return unique.length === 1 ? unique[0] : {kind: 'union', values: unique};
}
const variants = value => { const v = cellValue(value); return v?.kind === 'union' ? v.values : [v]; };
function finite(value, type) {
  const all = variants(value); profileRequire(all.every(v => v?.kind === 'scalar' && (!type || v.type === type) && v.values !== null), 'finite own-data value required');
  return [...new Set(all.flatMap(v => [...v.values]))];
}
function ownData(value, allowFunctions = false, seen = new Set()) {
  const v = cellValue(value); if (!v || seen.has(v)) return false; const next = new Set([...seen, v]);
  if (v.kind === 'scalar') return true;
  if (v.kind === 'union') return v.values.every(x => ownData(x, allowFunctions, next));
  if (v.kind === 'object') return [...v.fields.values()].every(x => ownData(x, allowFunctions, next));
  if (v.kind === 'array') return v.items.every(x => ownData(x, allowFunctions, next));
  return allowFunctions && v.kind === 'function';
}
function truthy(value) {
  const values = variants(value).flatMap(v => v.kind === 'scalar' && v.values !== null ? [...v.values].filter(Boolean).map(literal) : v.kind === 'scalar' && ['null', 'undefined'].includes(v.type) ? [] : [v]); return values.length ? union(values) : null;
}
function falsy(value) { const values = variants(value).flatMap(v => v.kind !== 'scalar' ? [] : v.values === null ? [literal(v.type === 'string' ? '' : v.type === 'number' ? 0 : false)] : [...v.values].filter(x => !x).map(literal)); return values.length ? union(values) : null; }
function stateJoin(a, b) {
  a = cellValue(a); b = cellValue(b);
  if (a.kind === 'object' && b.kind === 'object') {
    profileRequire(a.fields.size === b.fields.size && [...a.fields.keys()].every(k => b.fields.has(k)), 'state update changed own-data keys');
    return {kind: 'object', fields: new Map([...a.fields].map(([k, v]) => [k, stateJoin(v, b.fields.get(k))]))};
  }
  return union([a, b]);
}
function dataFingerprint(value) {
  const v = cellValue(value);
  if (v.kind === 'scalar') return [v.type, v.values === null ? '*' : [...v.values].map(x => String(x)).sort()];
  if (v.kind === 'union') return v.values.map(dataFingerprint);
  if (v.kind === 'array') return v.items.map(dataFingerprint);
  if (v.kind === 'object') return [...v.fields].map(([k, x]) => [k, dataFingerprint(x)]);
  profileFail('non-data state');
}

// A finite abstract interpreter for the admitted DC business capability set.
// It does not execute JS. Native values are private analysis records, not method
// spellings: a data object named focus/setState/querySelectorAll grants no capability.
function dcBusiness(program, tree, container, budget) {
  profileRequire(program.body.length === 1, 'exactly one business class');
  const component = program.body[0];
  profileRequire(component.type === 'ClassDeclaration' && component.id?.name === 'Component' && component.superClass?.type === 'Identifier' && component.superClass.name === 'DCLogic', 'Component extends DCLogic required');
  profileRequire(component.body.body.length === 2, 'only state and renderVals supported');
  const stateField = component.body.body.find(n => n.type === 'PropertyDefinition' && n.key?.name === 'state');
  const method = component.body.body.find(n => n.type === 'MethodDefinition' && n.key?.name === 'renderVals');
  profileRequire(stateField && !stateField.static && !stateField.computed && method && !method.static && !method.computed && method.kind === 'method' && !method.value.async && !method.value.generator && method.value.params.length === 0, 'business class shape');
  const stateLiteral = node => {
    if (node?.type === 'Literal' && !node.regex && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))) return literal(node.value);
    if (node?.type === 'ArrayExpression') { profileRequire(node.elements.every(Boolean), 'sparse state array'); return {kind: 'array', items: node.elements.map(stateLiteral), lengths: new Set([node.elements.length])}; }
    profileRequire(node?.type === 'ObjectExpression', 'literal-data state required'); const fields = new Map();
    for (const p of node.properties) {
      profileRequire(p.type === 'Property' && p.kind === 'init' && !p.method && !p.computed, 'state getter/spread/computed key');
      const key = p.key.name ?? p.key.value; profileRequire(typeof key === 'string' && !forbiddenKeys.has(key) && !fields.has(key), 'state key'); fields.set(key, stateLiteral(p.value));
    }
    return {kind: 'object', fields};
  };
  const initial = stateLiteral(stateField.value); profileRequire(initial.kind === 'object', 'state object required');
  const state = {kind: 'object', fields: new Map([...initial.fields].map(([k, value]) => [k, {kind: 'cell', value}]))};
  const initialKinds = new Map([...initial.fields].map(([k, value]) => [k, value.kind === 'scalar' ? value.type : value.kind]));
  let depth = 0, expressionDepth = 0; const functions = [], certified = new Set();
  const step = () => profileRequire(++budget.steps <= 2000000, 'business inference budget');
  const env = (parent = null) => ({parent, values: new Map()});
  const lookup = (scope, name) => { for (let s = scope; s; s = s.parent) if (s.values.has(name)) return s.values.get(name); return null; };
  const primitive = value => profileRequire(variants(value).every(v => v.kind === 'scalar'), 'primitive own-data required');
  const functionValue = (node, scope, thisValue) => { profileRequire(!node.async && !node.generator, 'async/generator business function'); const v = {kind: 'function', node, scope, thisValue: node.type === 'ArrowFunctionExpression' ? thisValue : null}; functions.push(v); if (!node.params.length) invoke(v, [], null); return v; };
  const bind = (pattern, value, scope) => {
    if (pattern.type === 'Identifier') { profileRequire(!forbiddenKeys.has(pattern.name) && !scope.values.has(pattern.name), 'local binding'); scope.values.set(pattern.name, value); return; }
    if (pattern.type === 'ObjectPattern') {
      for (const p of pattern.properties) { profileRequire(p.type === 'Property' && !p.computed, 'destructuring shape'); bind(p.value, member(value, p.key.name ?? p.key.value), scope); } return;
    }
    if (pattern.type === 'ArrayPattern') { pattern.elements.forEach((p, i) => { if (p) bind(p, member(value, i), scope); }); return; }
    profileFail('unsupported binding pattern');
  };
  const nodeValue = node => ({kind: 'node', node, tag: node.tagName});
  const descendant = (root, tag) => { const out = []; const walk = n => { if (n !== root && n.tagName === tag) out.push(nodeValue(n)); for (const c of n.childNodes || []) walk(c); if (n.content) walk(n.content); }; walk(root); return out; };
  const selector = value => { const keys = finite(value, 'string'); profileRequire(keys.length <= 256 && keys.every(k => typeof k === 'string' && k.length > 0 && /^[A-Za-z0-9_-]+$/.test(k)), 'finite document ID selector'); return keys; };
  const member = (value, key) => {
    profileRequire(typeof key === 'string' || Number.isInteger(key), 'own-data property key'); profileRequire(!forbiddenKeys.has(String(key)), 'prototype/native escape key');
    return union(variants(value).map(v => {
      if (v.kind === 'object') { profileRequire(v.fields.has(String(key)), 'unknown own-data property: ' + key); return v.fields.get(String(key)); }
      if (v.kind === 'array') {
        if (key === 'length') return scalar('number', [...v.lengths]);
        profileRequire(Number.isInteger(Number(key)) && String(Number(key)) === String(key) && Number(key) >= 0 && Number(key) < v.items.length, 'finite array index required');
        return union(v.lengths.size === 1 && v.lengths.has(v.items.length) ? [v.items[Number(key)]] : [...v.items, undef()]);
      }
      if (v.kind === 'logic') { profileRequire(key === 'state', 'unsupported logic property'); return state; }
      if (v.kind === 'event') {
        if (key === 'currentTarget') return nodeValue(v.node);
        if (key === 'target') { profileRequire(v.node.tagName === 'input' && ['oninput', 'onchange'].includes(v.event), 'event target provenance'); return nodeValue(v.node); }
        profileRequire(v.event === 'onkeydown' && ['key', 'shiftKey'].includes(key), 'event property provenance'); return key === 'key' ? scalar('string') : scalar('boolean');
      }
      if (v.kind === 'node') {
        if (key === 'ownerDocument') return {kind: 'document'};
        if (key === 'value') { profileRequire(v.tag === 'input', 'input value provenance'); return scalar('string'); }
        profileFail('unsupported DOM property: ' + key);
      }
      if (v.kind === 'document') { profileRequire(key === 'activeElement', 'readonly document property'); return {kind: 'node', tag: 'active', node: null}; }
      if (v.kind === 'scalar' && v.type === 'string' && key === 'length') return v.values === null ? scalar('number') : scalar('number', [...v.values].map(s => s.length));
      profileFail('unknown property provenance: ' + key);
    }));
  };
  function invoke(value, args, nativeEvent) {
    value = cellValue(value); profileRequire(value?.kind === 'function', 'local call target provenance'); profileRequire(depth < 48, 'business call depth');
    depth++; try {
      const scope = env(value.scope); profileRequire(args.length <= value.node.params.length + 2, 'local call arguments');
      value.node.params.forEach((p, i) => bind(p, args[i] ?? (nativeEvent ? nativeEvent : undef()), scope)); certified.add(value);
      const returns = []; if (value.node.body.type === 'BlockStatement') statements(value.node.body.body, scope, value.thisValue, returns); else returns.push(expression(value.node.body, scope, value.thisValue));
      return union(returns.length ? returns : [undef()]);
    } finally { depth--; }
  }
  function calls(node, scope, thisValue) {
    profileRequire(!node.optional && node.arguments.every(a => a.type !== 'SpreadElement'), 'unsupported invocation shape');
    if (node.callee.type === 'Identifier') {
      const local = lookup(scope, node.callee.name); if (local) return union(variants(local).map(v => invoke(v, node.arguments.map(a => expression(a, scope, thisValue)), null)));
      profileRequire(node.callee.name === 'setTimeout' && node.arguments.length === 2, 'unknown/global business call');
      const callback = expression(node.arguments[0], scope, thisValue), delay = finite(expression(node.arguments[1], scope, thisValue), 'number');
      profileRequire(delay.length === 1 && Number.isInteger(delay[0]) && delay[0] >= 0 && delay[0] <= 10000, 'bounded timer delay');
      for (const fn of variants(callback)) invoke(fn, [], null); return scalar('number');
    }
    profileRequire(node.callee.type === 'MemberExpression' && !node.callee.optional, 'business callee shape');
    const receivers = variants(expression(node.callee.object, scope, thisValue)), keys = node.callee.computed ? finite(expression(node.callee.property, scope, thisValue), 'string') : [node.callee.property.name];
    profileRequire(keys.length === 1 && !forbiddenKeys.has(keys[0]), 'business method key'); const key = keys[0], args = node.arguments.map(a => expression(a, scope, thisValue));
    return union(receivers.map(receiver => {
      if (receiver.kind === 'logic' && key === 'setState') {
        profileRequire(args.length === 1 && cellValue(args[0]).kind === 'object' && ownData(args[0]), 'own-data setState patch');
        for (const [field, update] of cellValue(args[0]).fields) {
          profileRequire(state.fields.has(field), 'state field provenance'); const next = cellValue(update), expected = initialKinds.get(field);
          profileRequire(variants(next).every(v => expected === 'null' ? v.kind === 'scalar' && v.values !== null : expected === 'object' || expected === 'array' ? v.kind === expected : v.kind === 'scalar' && v.type === expected), 'state update type');
          state.fields.get(field).value = stateJoin(state.fields.get(field).value, next);
        }
        return undef();
      }
      if (receiver.kind === 'document' && key === 'getElementById') {
        profileRequire(args.length === 1, 'document selector args'); const ids = selector(args[0]), found = [];
        const visit = n => { if (n.tagName) { const id = attrsOf(n).get('id'); if (id && ids.some(k => id === k || /^.*\{\{[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\}\}.*$/.test(id) && k.startsWith(id.split('{{')[0]) && k.endsWith(id.split('}}')[1]))) found.push(nodeValue(n)); } for (const c of n.childNodes || []) visit(c); if (n.content) visit(n.content); };
        visit(container); profileRequire(found.length > 0 && found.every(n => ['button', 'input'].includes(n.tag)), 'document selector target'); return union(found);
      }
      if (receiver.kind === 'node' && key === 'focus') { profileRequire(['button', 'input'].includes(receiver.tag) && args.length === 0, 'focus receiver/args'); return undef(); }
      if (receiver.kind === 'node' && key === 'querySelectorAll') {
        profileRequire(receiver.node && args.length === 1 && finite(args[0], 'string').length === 1 && finite(args[0], 'string')[0] === 'button', 'current-target button selector');
        const items = descendant(receiver.node, 'button'); profileRequire(items.length > 0 && items.length <= 256, 'bounded native button list'); return {kind: 'array', items, lengths: new Set([items.length])};
      }
      if (receiver.kind === 'event' && ['preventDefault', 'stopPropagation'].includes(key)) { profileRequire(args.length === 0, 'event action args'); return undef(); }
      if (receiver.kind === 'scalar' && receiver.type === 'string') {
        profileRequire(['trim', 'toLowerCase', 'indexOf'].includes(key), 'pure string method');
        if (key === 'indexOf') { profileRequire(args.length === 1 && variants(args[0]).every(v => v.kind === 'scalar' && v.type === 'string'), 'string indexOf args'); return scalar('number'); }
        profileRequire(args.length === 0, 'string transform args'); return receiver.values === null ? scalar('string') : scalar('string', [...receiver.values].map(s => key === 'trim' ? s.trim() : s.toLowerCase()));
      }
      if (receiver.kind === 'array' && ['map', 'filter'].includes(key)) {
        profileRequire(args.length === 1 && variants(args[0]).every(v => v.kind === 'function') && receiver.items.length <= 256, 'array callback provenance');
        const results = receiver.items.map((item, i) => union(variants(args[0]).map(fn => invoke(fn, [item, literal(i), receiver], null))));
        if (key === 'filter') { results.forEach(primitive); return {...receiver, lengths: new Set(Array.from({length: receiver.items.length + 1}, (_, i) => i))}; }
        return {kind: 'array', items: results, lengths: new Set(receiver.lengths)};
      }
      if (receiver.kind === 'object') { profileRequire(receiver.fields.has(key), 'local own function target'); return union(variants(receiver.fields.get(key)).map(fn => invoke(fn, args, null))); }
      profileFail('unknown receiver capability: ' + key);
    }));
  }
  function expression(node, scope, thisValue) {
    profileRequire(expressionDepth < 128, 'business expression/inference depth'); expressionDepth++;
    try { return expressionRaw(node, scope, thisValue); } finally { expressionDepth--; }
  }
  function expressionRaw(node, scope, thisValue) {
    step(); profileRequire(node && !node.optional, 'business expression');
    if (node.type === 'Literal') { profileRequire(!node.regex && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value)), 'business literal'); return literal(node.value); }
    if (node.type === 'Identifier') { const local = lookup(scope, node.name); if (local) return local; if (node.name === 'document') return {kind: 'document'}; if (node.name === 'undefined') return undef(); profileFail('unknown identifier provenance: ' + node.name); }
    if (node.type === 'ThisExpression') { profileRequire(thisValue?.kind === 'logic', 'this provenance'); return thisValue; }
    if (['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) return functionValue(node, scope, thisValue);
    if (node.type === 'ArrayExpression') { profileRequire(node.elements.every(n => n && n.type !== 'SpreadElement'), 'bounded array literal'); return {kind: 'array', items: node.elements.map(n => expression(n, scope, thisValue)), lengths: new Set([node.elements.length])}; }
    if (node.type === 'ObjectExpression') {
      const fields = new Map(); for (const p of node.properties) {
        if (p.type === 'SpreadElement') { const value = expression(p.argument, scope, thisValue); profileRequire(variants(value).every(v => v.kind === 'object' && ownData(v, true)), 'safe own-data spread'); for (const v of variants(value)) for (const [k, x] of v.fields) fields.set(k, fields.has(k) ? union([fields.get(k), x]) : x); continue; }
        profileRequire(p.type === 'Property' && p.kind === 'init' && !p.method, 'business object getter/method'); const keys = p.computed ? finite(expression(p.key, scope, thisValue), 'string') : [String(p.key.name ?? p.key.value)];
        profileRequire(keys.length > 0 && keys.length <= 256 && keys.every(k => !forbiddenKeys.has(k)), 'business object key'); const value = expression(p.value, scope, thisValue); for (const key of keys) fields.set(key, value);
      } return {kind: 'object', fields};
    }
    if (node.type === 'MemberExpression') {
      const value = expression(node.object, scope, thisValue), keys = node.computed ? finite(expression(node.property, scope, thisValue)) : [node.property.name];
      profileRequire(keys.length > 0 && keys.length <= 256, 'bounded property alternatives'); return union(keys.map(k => member(value, k)));
    }
    if (node.type === 'CallExpression') return calls(node, scope, thisValue);
    if (node.type === 'ConditionalExpression') { primitive(expression(node.test, scope, thisValue)); return union([expression(node.consequent, env(scope), thisValue), expression(node.alternate, env(scope), thisValue)]); }
    if (node.type === 'LogicalExpression') {
      profileRequire(['||', '&&'].includes(node.operator), 'business logical operator'); const left = expression(node.left, scope, thisValue), next = env(scope);
      if (node.operator === '&&' && node.left.type === 'Identifier') { const narrowed = truthy(left); profileRequire(narrowed, 'unresolved logical receiver'); next.values.set(node.left.name, narrowed); }
      const right = expression(node.right, next, thisValue); return node.operator === '||' ? union([truthy(left), right]) : union([falsy(left), right]);
    }
    if (node.type === 'UnaryExpression') { const value = expression(node.argument, scope, thisValue); profileRequire(node.operator === '!' || node.operator === '-' || node.operator === '+', 'business unary operator'); if (node.operator === '!') return scalar('boolean'); primitive(value); const numbers = finite(value, 'number'); return scalar('number', numbers.map(n => node.operator === '-' ? -n : n)); }
    if (node.type === 'BinaryExpression') {
      const a = expression(node.left, scope, thisValue), b = expression(node.right, scope, thisValue);
      if (['===', '!==', '==', '!=', '<', '>', '<=', '>='].includes(node.operator)) { profileRequire(variants(a).every(v => v.kind === 'scalar' || v.kind === 'node') && variants(b).every(v => v.kind === 'scalar' || v.kind === 'node'), 'comparison provenance'); return scalar('boolean'); }
      profileRequire(['+', '-'].includes(node.operator), 'business binary operator'); primitive(a); primitive(b);
      const all = [...variants(a), ...variants(b)], isString = node.operator === '+' && all.some(v => v.type === 'string');
      profileRequire(all.every(v => isString ? ['string', 'number'].includes(v.type) : v.type === 'number'), 'primitive arithmetic');
      if (all.some(v => v.values === null)) return scalar(isString ? 'string' : 'number');
      const av = finite(a), bv = finite(b); profileRequire(av.length * bv.length <= 1024, 'data alternative budget');
      return scalar(isString ? 'string' : 'number', av.flatMap(x => bv.map(y => node.operator === '+' ? x + y : x - y)));
    }
    profileFail('unsupported business expression: ' + node.type);
  }
  function statements(nodes, scope, thisValue, returns) {
    for (const node of nodes) {
      step();
      if (node.type === 'VariableDeclaration') { profileRequire(['const', 'let'].includes(node.kind), 'business declaration'); for (const d of node.declarations) { profileRequire(d.init, 'initialized local required'); bind(d.id, expression(d.init, scope, thisValue), scope); } }
      else if (node.type === 'ReturnStatement') returns.push(node.argument ? expression(node.argument, scope, thisValue) : undef());
      else if (node.type === 'ExpressionStatement') expression(node.expression, scope, thisValue);
      else if (node.type === 'IfStatement') {
        const tested = expression(node.test, scope, thisValue), branch = (n, positive) => { if (!n) return; const next = env(scope); if (node.test.type === 'Identifier') { const narrowed = positive ? truthy(tested) : falsy(tested); if (narrowed) next.values.set(node.test.name, narrowed); } n.type === 'BlockStatement' ? statements(n.body, next, thisValue, returns) : statements([n], next, thisValue, returns); }; branch(node.consequent, true); branch(node.alternate, false);
      }
      else if (node.type === 'BlockStatement') statements(node.body, env(scope), thisValue, returns);
      else if (node.type === 'EmptyStatement') continue;
      else profileFail('unsupported business statement: ' + node.type);
    }
  }
  function bindingValue(text, locals, result) {
    const match = /^\s*\{\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|true|false)\s*\}\}\s*$/.exec(text); profileRequire(match, 'bounded DC binding');
    if (match[1] === 'true' || match[1] === 'false') return literal(match[1] === 'true');
    const parts = match[1].split('.'); let value = locals.has(parts[0]) ? locals.get(parts[0]) : member(result, parts[0]); for (const key of parts.slice(1)) value = member(value, key); return value;
  }
  let result;
  for (let iteration = 0; iteration < 8; iteration++) {
    const before = JSON.stringify(dataFingerprint(state)), root = env(); functions.length = 0; certified.clear();
    const returns = []; statements(method.value.body.body, root, {kind: 'logic'}, returns); result = union(returns);
    profileRequire(variants(result).every(v => v.kind === 'object' && ownData(v, true)), 'renderVals own-data result');
    const visit = (node, locals = new Map()) => {
      let next = locals; const attrs = attrsOf(node);
      if (node.tagName === 'sc-for') {
        const list = bindingValue(attrs.get('list') || '', locals, result), as = attrs.get('as'); profileRequire(variants(list).every(v => v.kind === 'array') && typeof as === 'string' && /^[A-Za-z_$][\w$]*$/.test(as) && !forbiddenKeys.has(as), 'bounded loop binding');
        next = new Map(locals); next.set(as, union(variants(list).flatMap(v => v.items)));
      }
      if (node.tagName === 'sc-if') primitive(bindingValue(attrs.get('value') || '', next, result));
      for (const a of node.attrs || []) {
        if (/^on[a-z]+$/.test(a.name)) {
          profileRequire(['onclick', 'oninput', 'onchange', 'onkeydown'].includes(a.name), 'DC event capability'); const handler = bindingValue(a.value, next, result);
          for (const fn of variants(handler)) invoke(fn, [], {kind: 'event', event: a.name, node});
        } else if (a.value.includes('{{') && !['list', 'value', 'hint-placeholder-val'].includes(a.name)) {
          for (const m of a.value.matchAll(/\{\{[\s\S]*?\}\}/g)) { const value = bindingValue(m[0], next, result); primitive(value); if (a.name === 'id') finite(value, 'string'); }
        }
      }
      for (const child of node.childNodes || []) { if (child.nodeName === '#text') for (const m of (child.value || '').matchAll(/\{\{[\s\S]*?\}\}/g)) primitive(bindingValue(m[0], next, result)); visit(child, next); }
      if (node.content) visit(node.content, next);
    };
    visit(container);
    // Unreferenced function bodies get no implicit authority or unreachable exemption.
    for (const fn of functions) if (!certified.has(fn)) invoke(fn, [], null);
    if (before === JSON.stringify(dataFingerprint(state))) return;
  }
  profileFail('state/callback fixed-point budget');
}

function dcProfile({items, entry, bytesOf, tools, budget, verifyURL}) {
  const text = utf8(bytesOf(entry), entry), tree = parseHtml(text), nodes = [];
  const collect = (node, depth = 0) => { profileRequire(depth <= 128 && nodes.length < 20000, 'template traversal budget'); nodes.push(node); for (const c of node.childNodes || []) collect(c, depth + 1); if (node.content) collect(node.content, depth + 1); }; collect(tree);
  const dc = nodes.filter(n => n.tagName === 'x-dc'), business = nodes.filter(n => n.tagName === 'script' && (attrsOf(n).has('data-dc-script') || attrsOf(n).get('type') === 'text/x-dc'));
  if (!dc.length && !business.length) return {dispatch: 'NOT_APPLICABLE'};
  profileRequire(dc.length === 1 && business.length === 1 && /\.dc\.html?$/i.test(entry) && !entry.includes('/'), 'recognized DC document shape');
  profileRequire(items.filter(i => /\.html?$/i.test(i.path)).length === 1, 'single DC document profile');
  for (const runtime of DC_RUNTIME) profileRequire(items.some(i => i.path === runtime.path) && hash(bytesOf(runtime.path)) === runtime.sha256, 'unknown runtime identity: ' + runtime.path);
  const scripts = nodes.filter(n => n.tagName === 'script'); profileRequire(scripts.length === 4, 'extra script/config not supported');
  scripts.slice(0, 3).forEach((script, index) => {
    const attrs = attrsOf(script); profileRequire(script.parentNode?.tagName === 'head' && attrs.size === 1 && attrs.get('src') === './' + DC_RUNTIME[index].path && textOfNode(script).trim() === '', 'classic local runtime order/attributes');
  });
  const script = business[0], attrs = attrsOf(script);
  profileRequire(scripts[3] === script && script.parentNode?.tagName === 'body' && attrs.size === 3 && attrs.get('type') === 'text/x-dc' && attrs.get('data-dc-script') === '' && attrs.has('data-props'), 'business script attributes/order');
  let props; try { props = JSON.parse(attrs.get('data-props')); } catch { profileFail('business props JSON'); }
  profileRequire(props && typeof props === 'object' && Object.keys(props).join(',') === '$preview' && props.$preview && typeof props.$preview === 'object' && Object.keys(props.$preview).sort().join(',') === 'height,width' && [props.$preview.width, props.$preview.height].every(v => Number.isInteger(v) && v > 0 && v <= 16384), 'unsupported runtime props/config');
  const css = value => { profileRequire(!value.includes('{{') && !value.includes('}}'), 'STYLE interpolation'); for (const url of tools.cssResources(value, entry)) verifyURL(url, entry, false); };
  const resources = new Set(['src', 'href', 'poster', 'action', 'formaction', 'xlink:href', 'background', 'data']);
  for (const node of nodes) {
    if (!node.tagName) continue; profileRequire(DC_TAGS.has(node.tagName), 'unknown/custom/sibling template tag: ' + node.tagName);
    if (node.tagName === 'helmet') profileRequire((node.childNodes || []).every(c => c.nodeName === '#text' && !c.value.trim() || c.tagName === 'style'), 'helmet supports static STYLE only');
    if (node.tagName === 'style') css(textOfNode(node));
    for (const a of node.attrs || []) {
      profileRequire(!/^(?:sc-camel-|style-|data-keyframes-|data-dc-|data-om-|data-dm-)/i.test(a.name) || node === script && a.name === 'data-dc-script', 'transformed/reserved runtime attribute');
      profileRequire(!['ref', 'dangerouslysetinnerhtml', 'srcdoc', 'is', 'srcset', 'imagesrcset', 'component', 'from', 'import', 'component-from-global-scope'].includes(a.name), 'resource/runtime attribute unsupported');
      if (a.name === 'style') css(a.value);
      if (resources.has(a.name)) { profileRequire(!a.value.includes('{{') && !a.value.includes('}}'), 'resource interpolation'); verifyURL(a.value, entry, false); }
      if (/^on/.test(a.name)) profileRequire(isDescendant(node, dc[0]), 'script/native handler outside DC template');
    }
    if (node.tagName === 'meta') profileRequire(!attrsOf(node).has('http-equiv'), 'metadata redirect/config unsupported');
    if (node.tagName === 'input') profileRequire(['search', 'text'].includes(attrsOf(node).get('type') || 'text'), 'input capability');
    if (node.tagName === 'button') profileRequire(attrsOf(node).get('type') === 'button', 'button navigation capability');
    if (node.tagName === 'sc-for' && attrsOf(node).has('hint-placeholder-count')) profileRequire(/^\d{1,3}$/.test(attrsOf(node).get('hint-placeholder-count')) && Number(attrsOf(node).get('hint-placeholder-count')) <= 256, 'bounded placeholder count');
  }
  let program; try { program = parseJavaScript(textOfNode(script), {ecmaVersion: 'latest', sourceType: 'script'}); } catch (error) { profileFail('business parse: ' + error.message); }
  astBudget(program, budget); dcBusiness(program, tree, dc[0], budget);
  for (const item of items) {
    if (item.path === entry || DC_RUNTIME.some(r => r.path === item.path)) continue;
    if (/\.css$/i.test(item.path)) for (const url of tools.cssResources(utf8(bytesOf(item.path), item.path), item.path)) verifyURL(url, item.path, false);
    if (/\.[mc]?js$/i.test(item.path)) {
      const loaders = [], urls = tools.scriptResources(utf8(bytesOf(item.path), item.path), item.path, {sourceType: 'module', external: true, loaders, domTags: tools.htmlTagIndex(text), documentSubject: entry});
      for (const url of loaders) verifyURL(url, item.path, false); for (const url of urls) verifyURL(url, entry, false);
    }
  }
  return {dispatch: 'SUPPORTED', profile: 'claude-design-official-export-v1', runtime_requirements: ['RUNTIME:DC_EXPORT_V1']};
}
function isDescendant(node, ancestor) { for (let n = node; n; n = n.parentNode) if (n === ancestor) return true; return false; }

export function verifyMaterialDependencies({items, entry, bytesOf, allowedUrls = []}) {
  requireThat(Array.isArray(items) && items.length > 0 && items.length <= 1000 && typeof bytesOf === 'function' && Array.isArray(allowedUrls), 'MATERIAL_ANALYSIS_LIMIT', 'input inventory');
  const bytes = new Map(); let total = 0;
  for (const item of items) {
    requireThat(item && typeof item === 'object' && !Array.isArray(item), 'MATERIAL_BYTES_DRIFT', 'inventory record');
    relative(item.path); requireThat(!bytes.has(item.path), 'DUPLICATE_CLOSURE', item.path);
    const value = bytesOf(item.path); requireThat(Buffer.isBuffer(value) && Number.isSafeInteger(item.bytes) && item.bytes === value.length && /^[a-f0-9]{64}$/.test(item.sha256) && hash(value) === item.sha256 && (total += value.length) <= MAX_BYTES, 'MATERIAL_BYTES_DRIFT', item.path); bytes.set(item.path, value);
  }
  requireThat(bytes.has(entry), 'ENTRY_NOT_IN_CLOSURE', entry); const budget = {steps: 0, nodes: 0}, tools = scanner(budget), take = name => { requireThat(bytes.has(name), 'MATERIAL_CLOSURE_MISSING', name); return bytes.get(name); };
  const verifyURL = (url, referringPath, allowNetwork = false) => {
    if (!url || url.startsWith('#') || url.startsWith('data:')) return;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) { requireThat(allowNetwork && allowedUrls.includes(url), 'NETWORK_SCOPE_REFUSED', url); return; }
    requireThat(!url.startsWith('/') && !url.includes('\\') && !/%(?:2e|2f|5c)/i.test(url), 'DEPENDENCY_ESCAPE', url);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(referringPath), url.split(/[?#]/)[0])); relative(resolved);
    requireThat(bytes.has(resolved), 'MATERIAL_CLOSURE_MISSING', `${referringPath} -> ${resolved}`);
  };
  // REFUSED is an exception; only NOT_APPLICABLE reaches the generic checker.
  const profile = dcProfile({items, entry, bytesOf: take, tools, budget, verifyURL});
  if (profile.dispatch === 'SUPPORTED') return profile;
  requireThat(profile.dispatch === 'NOT_APPLICABLE', 'DC_RUNTIME_PROFILE_REFUSED', 'profile dispatch');
  tools.dependencies(items, entry, take, allowedUrls);
  return {dispatch: 'NOT_APPLICABLE', profile: null, runtime_requirements: []};
}
