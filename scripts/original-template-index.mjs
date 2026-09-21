import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';
import { verifyTemplateCopies } from './template-copy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

// Browser parsing is used as a read-only interpreter. No source node is
// attached to the live document, no source script is evaluated, and all
// requests are intercepted. The result is an index, never replacement HTML.
export async function inspectOriginalDom(bytes, { browser: suppliedBrowser } = {}) {
  if (!Buffer.isBuffer(bytes)) fail('Original bytes required');
  const browser = suppliedBrowser ?? await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
  const blockedRequests = [];
  try {
    await context.route('**/*', async route => { blockedRequests.push(route.request().url()); await route.abort('blockedbyclient'); });
    const page = await context.newPage();
    const result = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const anchors = [], states = [], scripts = [], styles = [];
      const controlTags = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'TABLE', 'FORM', 'H1', 'H2', 'H3']);
      const counts = new Map();
      function countScope(scopeRoot, scope) {
        // Count every matching attribute, including SVG/template elements and
        // elements whose preferred locator is a different attribute.
        for (const name of ['id', 'data-od-id', 'data-slot']) for (const node of scopeRoot.querySelectorAll(`[${name}]`)) {
          const value = node.getAttribute(name); if (!value) continue;
          const key = JSON.stringify({ scope, locator: { kind: 'attribute', name, value } });
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      function walk(parent, scope, path = []) {
        [...parent.children].forEach((node, index) => {
          const at = [...path, index];
          // Icon implementation is preserved in source, not confused with UI module IDs.
          if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
          if (node.tagName === 'SCRIPT') { scripts.push({ scope, path: at, type: node.getAttribute('type') ?? '', src: node.getAttribute('src'), dom_text: node.textContent }); return; }
          if (node.tagName === 'STYLE') { styles.push({ scope, path: at, dom_text: node.textContent }); return; }
          if (node.tagName === 'TEMPLATE') {
            const state = { template_id: node.id || null, parent_scope: scope, path: at };
            states.push(state);
            const childScope = [...scope, { template_id: node.id || null, path: at }];
            countScope(node.content, childScope);
            walk(node.content, childScope);
            return;
          }
          const attribute = ['id', 'data-od-id', 'data-slot'].find(name => node.hasAttribute(name) && node.getAttribute(name));
          if (attribute || controlTags.has(node.tagName)) {
            const locator = attribute ? { kind: 'attribute', name: attribute, value: node.getAttribute(attribute) } : { kind: 'element-path', indices: at };
            const text = node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder') || [...node.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ');
            const key = JSON.stringify({ scope, locator });
            if (!attribute) counts.set(key, 1);
            anchors.push({ scope, locator, element_path: at, tag: node.tagName.toLowerCase(), label: text.replace(/\s+/g, ' ').trim().slice(0, 160), source_node_hint: node.getAttribute('data-source-node'), evidence_key: key });
          }
          walk(node, scope, at);
        });
      }
      countScope(doc, []); walk(doc, []);
      return { title: doc.title, anchors: anchors.map(({ evidence_key, ...anchor }) => ({ ...anchor, unique_in_scope: counts.get(evidence_key) === 1 })), states, scripts, styles, source_scripts_executed: false };
    }, bytes.toString('utf8'));
    const fingerprints = entries => entries.map(({ dom_text, ...entry }) => ({ ...entry, normalized_dom_text_sha256: digest(Buffer.from(dom_text)), normalized_dom_text_bytes: Buffer.byteLength(dom_text) }));
    return { schema_version: 1, generated_by: 'original-template-index/v1', parser: { engine: 'chromium-domparser', version: browser.version() }, source_sha256: digest(bytes), source_bytes: bytes.length, ...result, scripts: fingerprints(result.scripts), styles: fingerprints(result.styles), blocked_requests: blockedRequests, assurance: 'inert DOM inventory only; paths require source hash and scope; not semantic adoption, interaction validation or generation authority' };
  } finally { await context.close(); if (!suppliedBrowser) await browser.close(); }
}

export async function indexOriginalTemplates({ write = false } = {}) {
  await verifyTemplateCopies({ root });
  const manifest = JSON.parse(await readFile(resolve(root, '.claude/skill-os/page-library/source-manifest.json'), 'utf8'));
  const out = resolve(root, '.claude/skill-os/page-library/original-index');
  if (write) {
    try { if ((await lstat(out)).isSymbolicLink()) fail('Index directory must not be a symlink'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; await mkdir(out); }
  }
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const source of manifest.sources) {
      const bytes = await readFile(resolve(root, source.copy_source));
      const index = { page_id: source.page_id, source_ref: source.copy_source, ...await inspectOriginalDom(bytes, { browser }) };
      if (index.source_sha256 !== source.raw_sha256) fail('Source changed during indexing');
      if (write) {
        const path = resolve(out, `${source.page_id}.json`);
        try {
          if ((await lstat(path)).isSymbolicLink()) fail('Index file must not be a symlink');
          if (JSON.parse(await readFile(path, 'utf8')).generated_by !== 'original-template-index/v1') fail('Refusing to overwrite a user-authored file');
        } catch (e) { if (e.code !== 'ENOENT') throw e; }
        await writeFile(path, `${JSON.stringify(index, null, 2)}\n`);
      }
      results.push({ page_id: source.page_id, source_sha256: index.source_sha256, anchors: index.anchors.length, ambiguous: index.anchors.filter(x => !x.unique_in_scope).length, template_states: index.states.map(x => x.template_id), scripts_preserved: index.scripts.length, source_scripts_executed: false });
    }
  } finally { await browser.close(); }
  await verifyTemplateCopies({ root });
  return { status: 'INDEXED_NOT_ADOPTED', written: write, results };
}

export async function locateOriginalNode(bytes, { source_sha256, scope, locator }, options = {}) {
  if (digest(bytes) !== source_sha256) throw Object.assign(new Error('Original source changed; locate again against the new version'), { code: 'ORIGINAL_SOURCE_STALE' });
  // Recompute from actual bytes rather than trusting an edited sidecar's
  // unique_in_scope flag. This still confers no editing/execution authority.
  const index = await inspectOriginalDom(bytes, options);
  const candidates = index.anchors.filter(node => isDeepStrictEqual(node.scope, scope) && isDeepStrictEqual(node.locator, locator));
  if (candidates.length !== 1 || !candidates[0].unique_in_scope) throw Object.assign(new Error('Original location is missing or ambiguous; clarification is required'), { code: 'ORIGINAL_LOCATION_UNRESOLVED' });
  return { source_sha256, parser: index.parser, node: candidates[0], execution_allowed: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(x => x !== '--write')) throw new Error('usage: original-template-index.mjs [--write]');
  console.log(JSON.stringify(await indexOriginalTemplates({ write: process.argv.includes('--write') }), null, 2));
}
