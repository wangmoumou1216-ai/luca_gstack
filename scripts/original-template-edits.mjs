import { createHash, randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
import { resolveAssetClosure } from './carrier-asset-profile.mjs';
import { parseCarrierDom } from './carrier-dom.mjs';
import { inspectOriginalResources } from './original-template-resources.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const voids = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const rawText = new Set('script style textarea title xmp iframe noembed noframes'.split(' '));
const forbiddenTargets = new Set('html head body script style base link meta'.split(' '));
function text(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 16 * 1024 * 1024) fail('ORIGINAL_BYTES_REQUIRED', 'Bounded nonempty original bytes required');
  const value = bytes.toString('utf8');
  if (!Buffer.from(value).equals(bytes)) fail('ORIGINAL_UTF8_REQUIRED', 'Original must round-trip without changing a byte');
  return value;
}

// Positions only. The browser below—not this tokenizer—decides the DOM tree.
// Raw text and comments are opaque so script strings cannot impersonate nodes.
function tokensOf(html) {
  const tokens = []; let at = 0;
  while (at < html.length) {
    if (html[at] !== '<') { at++; continue; }
    if (html.startsWith('<!--', at)) { const end = html.indexOf('-->', at + 4); if (end < 0) fail('ORIGINAL_RANGE_UNPROVABLE', 'Unclosed comment'); at = end + 3; continue; }
    if (html.startsWith('<![CDATA[', at)) { const end = html.indexOf(']]>', at + 9); if (end < 0) fail('ORIGINAL_RANGE_UNPROVABLE', 'Unclosed CDATA'); at = end + 3; continue; }
    const match = /^<(\/?)([A-Za-z][\w:-]*)\b/.exec(html.slice(at));
    if (!match) { at++; continue; }
    let end = at + match[0].length, quote = null;
    for (; end < html.length; end++) { const char = html[end]; if (quote) { if (char === quote) quote = null; } else if (char === '"' || char === "'") quote = char; else if (char === '>') break; }
    if (end === html.length) fail('ORIGINAL_RANGE_UNPROVABLE', 'Unclosed tag');
    const name = match[2].toLowerCase(), closing = Boolean(match[1]);
    const token = { id: tokens.length, start: at, end: end + 1, name, closing, nameEnd: at + match[0].length, selfClosing: /\/\s*>$/.test(html.slice(at, end + 1)) || voids.has(name) };
    tokens.push(token); at = end + 1;
    if (!closing && rawText.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'ig'); close.lastIndex = at;
      const found = close.exec(html); if (!found) fail('ORIGINAL_RANGE_UNPROVABLE', `Unclosed ${name}`);
      tokens.push({ id: tokens.length, start: found.index, end: close.lastIndex, name, closing: true }); at = close.lastIndex;
    }
  }
  return tokens;
}
function spanFor(tokens, opening) {
  if (opening.selfClosing) return { start: opening.start, openEnd: opening.end, closeStart: opening.end, end: opening.end, void: true };
  let depth = 0;
  for (let i = opening.id; i < tokens.length; i++) {
    const token = tokens[i]; if (token.name !== opening.name) continue;
    if (token.closing) depth--; else if (!token.selfClosing) depth++;
    if (depth === 0) return { start: opening.start, openEnd: opening.end, closeStart: token.start, end: token.end, void: false };
  }
  fail('ORIGINAL_RANGE_UNPROVABLE', 'Target has no explicit provable closing boundary');
}
function annotatedSlice(html, tokens, marker, start, end) {
  let value = '', cursor = start;
  for (const token of tokens) {
    if (token.closing || token.nameEnd < start || token.nameEnd >= end) continue;
    value += html.slice(cursor, token.nameEnd) + ` ${marker}="${token.id}"`; cursor = token.nameEnd;
  }
  return value + html.slice(cursor, end);
}
function validateActions(actions) {
  if (!Array.isArray(actions) || !actions.length || actions.length > 32) fail('ORIGINAL_ACTIONS_REQUIRED', 'One to 32 explicit source actions required');
  const ids = new Set();
  for (const action of actions) {
    if (!action || Object.keys(action).some(k => !['action_id', 'action', 'scope', 'locator'].includes(k)) || !/^[A-Za-z][\w.-]*$/.test(action.action_id ?? '') || ids.has(action.action_id) || !['add', 'modify', 'remove', 'preserve'].includes(action.action) || !Array.isArray(action.scope) || !action.locator) fail('ORIGINAL_ACTION_INVALID', 'Actions must contain only an ID, operation and version-bound original location');
    ids.add(action.action_id);
    const path = value => Array.isArray(value) && value.length > 0 && value.length <= 64 && value.every(i => Number.isSafeInteger(i) && i >= 0);
    for (const scope of action.scope) if (!scope || Object.keys(scope).sort().join(',') !== 'path,template_id' || !path(scope.path) || !(scope.template_id === null || typeof scope.template_id === 'string')) fail('ORIGINAL_LOCATOR_INVALID', 'Template scopes need only a bound element path and original template ID');
    const loc = action.locator;
    if (loc.kind === 'attribute') {
      if (Object.keys(loc).sort().join(',') !== 'kind,name,value' || !['id', 'data-od-id', 'data-slot'].includes(loc.name) || typeof loc.value !== 'string' || !loc.value) fail('ORIGINAL_LOCATOR_INVALID', 'Only original registered attributes are accepted');
    } else if (loc.kind !== 'element-path' || Object.keys(loc).sort().join(',') !== 'indices,kind' || !path(loc.indices)) fail('ORIGINAL_LOCATOR_INVALID', 'Only an exact original element path is accepted');
  }
  if (actions.every(a => a.action === 'preserve')) fail('ORIGINAL_NO_CHANGE', 'A derivative needs an actual change');
}
async function session(options, task) {
  const browser = options?.browser ?? await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
  try { await context.route('**/*', route => route.abort('blockedbyclient')); return await task(await context.newPage()); }
  finally { await context.close(); if (!options?.browser) await browser.close(); }
}

async function prepareInPage(page, html, actions, tokens, marker) {
  const marked = annotatedSlice(html, tokens, marker, 0, html.length);
  const result = await page.evaluate(({ html, marked, marker, actions }) => {
    const parse = s => new DOMParser().parseFromString(s, 'text/html');
    const original = parse(html), probe = parse(marked);
    const all = root => [...root.querySelectorAll('*')].flatMap(n => n.tagName === 'TEMPLATE' ? [n, ...all(n.content)] : [n]);
    const equal = (a, b) => { if (!a.isEqualNode(b)) return false; if (a.tagName === 'TEMPLATE') return equal(a.content, b.content); const x = [...(a.querySelectorAll?.('template') ?? [])], y = [...(b.querySelectorAll?.('template') ?? [])]; return x.length === y.length && x.every((n, i) => equal(n.content, y[i].content)); };
    const stripped = probe.cloneNode(true); for (const node of all(stripped)) node.removeAttribute(marker);
    if (!equal(original, stripped)) throw Error('Probe altered HTML parsing; source range cannot be proven');
    const byPath = (root, path) => {
      if (!Array.isArray(path) || path.some(i => !Number.isSafeInteger(i) || i < 0)) throw Error('Invalid original element path');
      for (const i of path) { root = root.children[i]; if (!root) throw Error('Original path is absent'); } return root;
    };
    const locate = (doc, action) => {
      let scope = doc;
      for (const step of action.scope) { const node = byPath(scope, step.path); if (node.tagName !== 'TEMPLATE' || (node.id || null) !== step.template_id) throw Error('Original template scope drifted'); scope = node.content; }
      const loc = action.locator;
      if (loc.kind === 'element-path') return byPath(scope, loc.indices);
      if (loc.kind !== 'attribute' || !['id', 'data-od-id', 'data-slot'].includes(loc.name) || typeof loc.value !== 'string') throw Error('Unsupported original locator');
      const nodes = [...scope.querySelectorAll(`[${loc.name}]`)].filter(n => n.getAttribute(loc.name) === loc.value);
      if (nodes.length !== 1) throw Error('Original locator is missing or ambiguous'); return nodes[0];
    };
    return actions.map(action => {
      const a = locate(original, action), b = locate(probe, action), id = b.getAttribute(marker);
      if (id === null || all(probe).filter(n => n.getAttribute(marker) === id).length !== 1) throw Error('Browser-created or reconstructed node cannot be a source target');
      return { action_id: action.action_id, token_id: Number(id), tag: a.tagName.toLowerCase(), outer: a.outerHTML };
    });
  }, { html, marked, marker, actions });
  const ranges = result.map(item => {
    if (forbiddenTargets.has(item.tag)) fail('ORIGINAL_TARGET_FORBIDDEN', `Cannot replace document, style or script control: ${item.tag}`);
    const opening = tokens[item.token_id];
    if (!opening || opening.closing) fail('ORIGINAL_RANGE_UNPROVABLE', 'Target does not identify an original start tag');
    return { ...item, ...spanFor(tokens, opening) };
  });
  for (let i = 0; i < ranges.length; i++) for (let j = i + 1; j < ranges.length; j++) if (ranges[i].start < ranges[j].end && ranges[j].start < ranges[i].end) fail('ORIGINAL_ACTION_OVERLAP', 'Original actions must not overlap, including preserve scopes');
  // Native contextual parsing must agree with the computed lexical boundary.
  const equivalent = await page.evaluate(({ html, actions, ranges }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const equal = (a, b) => { if (!a.isEqualNode(b)) return false; if (a.tagName === 'TEMPLATE') return equal(a.content, b.content); const x = [...(a.querySelectorAll?.('template') ?? [])], y = [...(b.querySelectorAll?.('template') ?? [])]; return x.length === y.length && x.every((n, i) => equal(n.content, y[i].content)); };
    function locate(action) { let root = doc; const path = (n, p) => p.reduce((v, i) => v.children[i], n); for (const s of action.scope) root = path(root, s.path).content; const l = action.locator; return l.kind === 'element-path' ? path(root, l.indices) : [...root.querySelectorAll(`[${l.name}]`)].find(n => n.getAttribute(l.name) === l.value); }
    return ranges.every(range => { const target = locate(actions.find(a => a.action_id === range.action_id)); const r = doc.createRange(); r.selectNode(target); const fragment = r.createContextualFragment(html.slice(range.start, range.end)); return fragment.childNodes.length === 1 && equal(fragment.firstChild, target); });
  }, { html, actions, ranges });
  if (!equivalent) fail('ORIGINAL_RANGE_UNPROVABLE', 'Lexical target boundary differs from the real browser DOM');
  return { ranges, marked };
}

export async function locateOriginalEditRanges(base, actions, options = {}) {
  const html = text(base); validateActions(actions); const tokens = tokensOf(html);
  const marker = `data-luca-internal-${randomBytes(12).toString('hex')}`;
  return session(options, async page => {
    const { ranges } = await prepareInPage(page, html, actions, tokens, marker);
    return { source_sha256: sha(base), targets: ranges.map(({ outer, token_id, ...r }) => ({ ...r, range_sha256: sha(Buffer.from(html.slice(r.start, r.end))), start_byte: Buffer.byteLength(html.slice(0, r.start)), end_byte: Buffer.byteLength(html.slice(0, r.end)) })), execution_allowed: false };
  });
}

export async function verifyOriginalEditedOutput({ base, output, actions, edits }, options = {}) {
  const html = text(base), actual = text(output); validateActions(actions);
  const changing = actions.filter(a => a.action !== 'preserve');
  if (!Array.isArray(edits) || edits.length !== changing.length || new Set(edits.map(x => x.action_id)).size !== edits.length) fail('ORIGINAL_EDIT_SET', 'Exactly one edit for every modifying action required');
  for (const edit of edits) {
    if (!edit || Object.keys(edit).some(k => !['action_id', 'html'].includes(k)) || !changing.some(a => a.action_id === edit.action_id) || typeof edit.html !== 'string' || Buffer.byteLength(edit.html) > 512 * 1024) fail('ORIGINAL_EDIT_SET', 'Edit manifests cannot add paths, selectors, source offsets or extra instructions');
    if (edit.html) {
      if (/data-luca-internal-|\b(?:srcdoc|action|formaction|nonce)\s*=/i.test(edit.html) || /<\/?(?:html|head|body|meta|link|base|template)\b/i.test(edit.html)) fail('ORIGINAL_FRAGMENT_UNSAFE', 'New fragments cannot change document controls or executable/navigation policy');
      await inspectOriginalResources(Buffer.from(edit.html), { browser: options.browser });
      resolveAssetClosure({ baseTemplate: Buffer.from(edit.html), assets: [] });
      // The strict parser also rejects browser-recovered tag/attribute syntax
      // that a lexical resource scan cannot classify safely.
      parseCarrierDom(edit.html);
    }
  }
  const tokens = tokensOf(html), marker = `data-luca-internal-${randomBytes(12).toString('hex')}`;
  return session(options, async page => {
    const { ranges, marked } = await prepareInPage(page, html, actions, tokens, marker);
    const substitutions = changing.map(action => {
      const range = ranges.find(r => r.action_id === action.action_id), edit = edits.find(e => e.action_id === action.action_id);
      if (action.action === 'remove') { if (edit.html !== '') fail('ORIGINAL_EDIT_SET', 'Remove must not smuggle replacement content'); return { ...range, from: range.start, to: range.end, replacement: '' }; }
      if (range.void) fail('ORIGINAL_RANGE_UNPROVABLE', 'Void-element changes need a separately reviewed attribute edit contract');
      if (action.action === 'add' && !edit.html.trim()) fail('ORIGINAL_NO_CHANGE', 'Add must insert actual content');
      return { ...range, from: action.action === 'add' ? range.closeStart : range.openEnd, to: range.closeStart, replacement: edit.html };
    }).sort((a, b) => a.from - b.from);
    let expected = '', markedAfter = '', cursor = 0;
    for (const item of substitutions) { expected += html.slice(cursor, item.from) + item.replacement; markedAfter += annotatedSlice(html, tokens, marker, cursor, item.from) + item.replacement; cursor = item.to; }
    expected += html.slice(cursor); markedAfter += annotatedSlice(html, tokens, marker, cursor, html.length);
    if (actual !== expected || !output.equals(Buffer.from(expected))) fail('ORIGINAL_OUTSIDE_EDIT_CHANGED', 'Output is not the original bytes plus only the declared local edits');
    if (output.equals(base)) fail('ORIGINAL_NO_CHANGE', 'Copying the original without a real edit is not a derivative');
    const scriptsAndStyles = value => { const ts = tokensOf(value); return ts.filter(t => !t.closing && ['script', 'style'].includes(t.name)).map(t => { const end = ts[t.id + 1]; return value.slice(t.start, end.end); }); };
    if (JSON.stringify(scriptsAndStyles(actual)) !== JSON.stringify(scriptsAndStyles(html))) fail('ORIGINAL_ACTIVE_CONTENT_CHANGED', 'Original scripts and styles must remain byte-identical');
    const dom = await page.evaluate(({ before, after, marker, actions, ranges }) => {
      const parse = s => new DOMParser().parseFromString(s, 'text/html'); const a = parse(before), b = parse(after);
      const all = root => [...root.querySelectorAll('*')].flatMap(n => n.tagName === 'TEMPLATE' ? [n, ...all(n.content)] : [n]);
      const equal = (x, y) => { if (!x.isEqualNode(y)) return false; if (x.tagName === 'TEMPLATE') return equal(x.content, y.content); const a = [...(x.querySelectorAll?.('template') ?? [])], b = [...(y.querySelectorAll?.('template') ?? [])]; return a.length === b.length && a.every((n, i) => equal(n.content, b[i].content)); };
      const withoutMarkers = node => { const copy = node.cloneNode(true); copy.removeAttribute?.(marker); for (const child of all(copy.tagName === 'TEMPLATE' ? copy.content : copy)) child.removeAttribute(marker); return copy; };
      const normalize = root => {
        for (const child of [...root.childNodes]) {
          if (child.nodeType === Node.COMMENT_NODE) child.remove();
          else if (child.nodeType === Node.TEXT_NODE) { child.textContent = child.textContent.replace(/\s+/g, ' ').trim(); if (!child.textContent) child.remove(); }
          else { normalize(child); if (child.tagName === 'TEMPLATE') normalize(child.content); }
        }
        root.normalize();
      };
      normalize(a); normalize(b);
      for (const action of actions) {
        const range = ranges.find(r => r.action_id === action.action_id), id = String(range.token_id);
        const left = all(a).filter(n => n.getAttribute(marker) === id), right = all(b).filter(n => n.getAttribute(marker) === id);
        if (left.length !== 1 || (action.action === 'remove' ? right.length !== 0 : right.length !== 1)) return { ok: false, reason: 'target identity changed or escaped' };
        if (action.action === 'preserve') { if (!equal(withoutMarkers(left[0]), withoutMarkers(right[0]))) return { ok: false, reason: 'preserve changed' }; continue; }
        if (action.action === 'remove') left[0].remove();
        else {
          if (equal(withoutMarkers(left[0]), withoutMarkers(right[0]))) return { ok: false, reason: 'no actual DOM change' };
          const content = n => n.tagName === 'TEMPLATE' ? n.content : n;
          content(left[0]).replaceChildren(); content(right[0]).replaceChildren();
        }
      }
      for (const doc of [a, b]) { for (const node of all(doc)) { node.removeAttribute(marker); if (node.tagName === 'TEMPLATE') node.content.normalize(); } doc.normalize(); }
      return { ok: equal(a, b), reason: 'outside DOM must match after masking authorized edits, including hidden template content' };
    }, { before: marked, after: markedAfter, marker, actions, ranges });
    if (!dom.ok) fail('ORIGINAL_DOM_SCOPE_VIOLATION', dom.reason);
    return { status: 'PASS', input_sha256: sha(base), output_sha256: sha(output), unchanged_outside_targets: true, original_scripts_styles_preserved: true, source_executed: false, semantic_acceptance: 'PENDING_INDEPENDENT_REVIEW' };
  });
}
