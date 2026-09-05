#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadCatalog, readPageSource } from './page-context.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://page-context.invalid';
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
// These are the existing local compiler and the two reviewed, literal theme configurations.
// They render source references only; none of these styles enter the design handoff contract.
const compilerHash = '176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15';
const configHashes = new Set([
  'bc8ee371377139cf2e600b77dfc1ee5960647fb2d7ccdb4707118590280cf77d',
  '8526ff2fa4ed4220f33fb6d3adffb117dcef6682e8b923abd915128584a46561',
]);
const contentTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.css': 'text/css', '.js': 'text/javascript' };

async function readAsset(root, sourceRef, url) {
  const base = await realpath(root);
  const parsed = new URL(url, `${origin}/${sourceRef}`);
  if (parsed.origin !== origin || parsed.search || parsed.hash) fail('PREVIEW_RESOURCE', `Unsupported resource: ${url}`);
  const ref = decodeURIComponent(parsed.pathname.slice(1));
  const allowed = resolve(base, dirname(sourceRef), 'assets');
  const path = resolve(base, ref);
  if (!path.startsWith(`${allowed}${sep}`)) fail('PREVIEW_RESOURCE', `Asset is outside this source's assets directory: ${url}`);
  let cursor = base;
  for (const part of relative(base, path).split(sep)) {
    cursor = resolve(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) fail('PREVIEW_RESOURCE', `Symlink asset refused: ${url}`);
  }
  if (!(await lstat(path)).isFile() || !contentTypes[extname(path)]) fail('PREVIEW_RESOURCE', `Unsupported asset: ${url}`);
  const bytes = await readFile(path);
  if (extname(path) === '.css' && /@import|url\s*\(/i.test(bytes.toString())) fail('PREVIEW_RESOURCE', 'Linked CSS must be self-contained; nested resource loading is not supported');
  return { url: parsed.href, bytes, contentType: contentTypes[extname(path)] };
}

export async function renderPreview({ catalog, pageId, root = repoRoot, browser: suppliedBrowser } = {}) {
  const entry = catalog?.pages?.find(page => page.page_id === pageId);
  if (!entry) fail('PREVIEW_PAGE', `Unknown page: ${pageId}`);
  const { bytes } = await readPageSource(entry, { root });
  const browser = suppliedBrowser ?? await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: entry.viewport, deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: false });
  try {
    const page = await context.newPage();
    const rejectedRequests = [];
    const violations = [];
    const scriptErrors = [];
    const resources = new Map();
    let documentHtml = '';
    const nonce = randomBytes(24).toString('base64');
    const csp = `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src ${origin}; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url === `${origin}/preview` && route.request().isNavigationRequest() && route.request().frame() === page.mainFrame()) {
        await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': csp }, body: documentHtml });
      } else if (resources.has(url) && route.request().method() === 'GET') {
        const asset = resources.get(url);
        await route.fulfill({ status: 200, contentType: asset.contentType, body: asset.bytes });
      } else {
        rejectedRequests.push(url);
        await route.abort('blockedbyclient');
      }
    });
    page.on('console', message => { if (/Content Security Policy|content security policy/i.test(message.text())) violations.push(message.text()); });
    page.on('pageerror', error => scriptErrors.push(error.message));
    // DOMParser is inert. Source scripts are inspected as text, and never evaluated here.
    const parsed = await page.evaluate(({ html, base }) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const scripts = [...doc.querySelectorAll('script')].map(script => ({ src: script.getAttribute('src'), text: script.textContent }));
      doc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv],template').forEach(node => node.remove());
      const assets = [];
      let removedEvents = 0;
      for (const node of doc.querySelectorAll('*')) {
        for (const attr of [...node.attributes]) {
          if (/^on/i.test(attr.name)) { node.removeAttribute(attr.name); removedEvents++; }
          if (['nonce', 'srcdoc', 'autofocus', 'action', 'formaction', 'srcset', 'ping'].includes(attr.name)) node.removeAttribute(attr.name);
          if (attr.name === 'href' || attr.name === 'xlink:href') {
            if (node.tagName !== 'LINK' || node.getAttribute('rel') !== 'stylesheet') node.removeAttribute(attr.name);
          }
        }
        const attr = node.tagName === 'IMG' ? 'src' : node.tagName === 'LINK' && node.getAttribute('rel') === 'stylesheet' ? 'href' : null;
        if (attr && node.getAttribute(attr)) {
          const url = new URL(node.getAttribute(attr), base).href;
          assets.push(url);
          node.setAttribute(attr, url);
        } else if (node.hasAttribute('src')) node.removeAttribute('src');
      }
      doc.querySelectorAll('link:not([rel="stylesheet"])').forEach(node => node.remove());
      return { html: `<!DOCTYPE html>${doc.documentElement.outerHTML}`, scripts, assets, removedEvents };
    }, { html: bytes.toString('utf8'), base: `${origin}/${entry.source_ref}` });
    const trustedScripts = [];
    let usesCompiler = false;
    for (const script of parsed.scripts) {
      if (script.src) {
        if (usesCompiler || script.src !== './assets/vendor/tailwindcss.com.js') fail('PREVIEW_SCRIPT', `Unreviewed source script: ${script.src}`);
        const compiler = await readAsset(root, entry.source_ref, script.src);
        if (hash(compiler.bytes) !== compilerHash) fail('PREVIEW_SCRIPT', 'Local style compiler differs from reviewed version');
        trustedScripts.push(compiler.bytes.toString('utf8'));
        usesCompiler = true;
      } else {
        if (!usesCompiler || !configHashes.has(hash(script.text))) fail('PREVIEW_SCRIPT', 'Only the reviewed static style configuration can run');
        trustedScripts.push(script.text);
      }
    }
    if (usesCompiler && trustedScripts.length !== 2) fail('PREVIEW_SCRIPT', 'Style compiler requires one reviewed configuration');
    for (const url of new Set(parsed.assets)) {
      const asset = await readAsset(root, entry.source_ref, url);
      if (asset.contentType === 'text/javascript') fail('PREVIEW_RESOURCE', 'Script cannot be loaded as a display asset');
      resources.set(asset.url, asset);
    }
    documentHtml = parsed.html.replace(/<head>/i, () => `<head>${trustedScripts.map(text => `<script nonce="${nonce}">${text}</script>`).join('')}`);
    await page.goto(`${origin}/preview`, { waitUntil: 'load' });
    if (usesCompiler) {
      try { await page.waitForFunction(() => [...document.styleSheets].some(sheet => [...sheet.cssRules].some(rule => rule.selectorText === '.flex')), null, { timeout: 5000 }); }
      catch { fail('PREVIEW_STYLE', `Reviewed style compilation did not finish: ${[...scriptErrors, ...violations].join('; ') || 'no compiled flex rule'}`); }
    }
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
    if (rejectedRequests.length || violations.length) fail('PREVIEW_RESOURCE', `Unapproved resource blocked: ${[...rejectedRequests, ...violations].join('; ')}`);
    const regions = await page.evaluate(entries => entries.map(region => {
      const anchor = region.anchor;
      const candidates = anchor.kind === 'attribute'
        ? [...document.querySelectorAll(`[${anchor.name}]`)].filter(node => node.getAttribute(anchor.name) === anchor.value)
        : [...document.querySelectorAll(anchor.tag)].filter(node => node.textContent.replace(/\s+/g, ' ').trim() === anchor.text.replace(/\s+/g, ' ').trim());
      if (candidates.length !== 1) throw new Error(`PREVIEW_ANCHOR: ${region.region_id} matched ${candidates.length} elements`);
      let target = candidates[0];
      for (let i = 0; i < (anchor.ancestor_levels ?? 0); i++) {
        target = target.parentElement;
        if (!target) throw new Error(`PREVIEW_ANCHOR: ${region.region_id} has no requested ancestor`);
      }
      const rect = target.getBoundingClientRect();
      let left = Math.max(0, rect.left), top = Math.max(0, rect.top), right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
      for (let node = target.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node), clip = node.getBoundingClientRect();
        if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
        if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
      }
      const bounds = { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
      return { region_id: region.region_id, name: region.name, bounds, visible: bounds.width > 0 && bounds.height > 0 };
    }), entry.regions);
    const png = await page.screenshot({ type: 'png', animations: 'disabled', fullPage: false });
    const screenshot = { sha256: hash(png), width: png.readUInt32BE(16), height: png.readUInt32BE(20), source_hash: entry.source_hash, viewport: entry.viewport };
    return { png, manifest: { schema_version: 1, page_id: entry.page_id, name: entry.name, source_hash: entry.source_hash, viewport: entry.viewport, screenshot, regions, render: { mode: 'isolated-static-source', scripts: usesCompiler ? 'pinned-style-compiler' : 'none', removed_events: parsed.removedEvents, network_requests: 0 } } };
  } finally {
    await context.close();
    if (!suppliedBrowser) await browser.close();
  }
}

function selectorApp(manifest) {
  const byId = id => document.getElementById(id);
  let choice = null;
  let downloadUrl = null;
  let mode = 'region';
  let scale = 1;
  let drawing = null;
  byId('page-name').textContent = manifest.name;
  byId('shot').alt = `${manifest.name}，来源页面的默认视口截图`;
  byId('canvas').style.width = `${manifest.screenshot.width}px`;
  byId('canvas').style.height = `${manifest.screenshot.height}px`;
  function choose(next, label) {
    choice = next;
    if (next.kind !== 'box') { mode = 'region'; byId('canvas').classList.remove('box-mode'); byId('box-outline').hidden = true; }
    byId('status').textContent = `已选${label}，请确认。`;
    byId('confirm').disabled = false;
    byId('record').value = '';
    byId('download').hidden = true;
    for (const button of document.querySelectorAll('.region')) button.classList.toggle('chosen', button.dataset.region === next.region_id);
  }
  function clearChoice(message) {
    choice = null;
    byId('confirm').disabled = true;
    byId('record').value = '';
    byId('download').hidden = true;
    byId('box-outline').hidden = true;
    byId('status').textContent = message;
    for (const button of document.querySelectorAll('.region')) button.classList.remove('chosen');
  }
  function showBox(raw) {
    const x = (raw.client_x - raw.origin_x) / raw.scale + raw.scroll_x;
    const y = (raw.client_y - raw.origin_y) / raw.scale + raw.scroll_y;
    const width = raw.width / raw.scale, height = raw.height / raw.scale;
    Object.assign(byId('box-outline').style, { left: `${x / manifest.screenshot.width * 100}%`, top: `${y / manifest.screenshot.height * 100}%`, width: `${width / manifest.screenshot.width * 100}%`, height: `${height / manifest.screenshot.height * 100}%` });
    byId('box-outline').hidden = false;
    return { x, y, width, height };
  }
  byId('box-mode').addEventListener('click', () => {
    mode = 'box';
    byId('canvas').classList.add('box-mode');
    clearChoice('在截图上拖动框选位置。');
  });
  byId('zoom').addEventListener('change', event => {
    scale = Number(event.target.value);
    byId('canvas').style.width = `${manifest.screenshot.width * scale}px`;
    byId('canvas').style.height = `${manifest.screenshot.height * scale}px`;
    if (drawing) { drawing = null; clearChoice('缩放已改变，请重新框选。'); }
  });
  byId('viewer').addEventListener('scroll', () => {
    if (drawing) { drawing = null; clearChoice('拖动时视口已滚动，请重新框选。'); }
  });
  byId('canvas').addEventListener('pointerdown', event => {
    if (mode !== 'box' || event.button !== 0) return;
    event.preventDefault();
    const view = byId('viewer'), rect = view.getBoundingClientRect();
    const start = { start_x: event.clientX, start_y: event.clientY, origin_x: rect.left + view.clientLeft, origin_y: rect.top + view.clientTop, scale, scroll_x: view.scrollLeft / scale, scroll_y: view.scrollTop / scale };
    clearChoice('正在框选。');
    drawing = start;
    byId('canvas').setPointerCapture(event.pointerId);
  });
  function dragRecord(event) {
    return { client_x: Math.min(drawing.start_x, event.clientX), client_y: Math.min(drawing.start_y, event.clientY), width: Math.abs(event.clientX - drawing.start_x), height: Math.abs(event.clientY - drawing.start_y), origin_x: drawing.origin_x, origin_y: drawing.origin_y, scale: drawing.scale, scroll_x: drawing.scroll_x, scroll_y: drawing.scroll_y };
  }
  byId('canvas').addEventListener('pointermove', event => { if (drawing) showBox(dragRecord(event)); });
  byId('canvas').addEventListener('pointercancel', () => { drawing = null; clearChoice('框选已取消。'); });
  byId('canvas').addEventListener('pointerup', event => {
    if (!drawing) return;
    const selection = dragRecord(event), box = showBox(selection);
    drawing = null;
    byId('canvas').releasePointerCapture(event.pointerId);
    if (box.width < 1 || box.height < 1 || box.x < 0 || box.y < 0 || box.x + box.width > manifest.screenshot.width || box.y + box.height > manifest.screenshot.height) {
      clearChoice('请在截图内框选一个有效范围。');
      return;
    }
    choose({ kind: 'box', screenshot: manifest.screenshot, selection }, `框选位置（${Math.round(box.x)}, ${Math.round(box.y)}；${Math.round(box.width)} × ${Math.round(box.height)}）`);
  });
  byId('whole').addEventListener('click', () => choose({ kind: 'page' }, '整页'));
  for (const region of manifest.regions) {
    const side = document.createElement('button');
    side.type = 'button';
    side.textContent = region.name + (region.visible ? '' : '（当前截图外）');
    side.disabled = !region.visible;
    side.addEventListener('click', () => choose({ kind: 'region', region_id: region.region_id }, region.name));
    document.querySelector('aside').append(side);
    if (!region.visible) continue;
    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'region';
    overlay.dataset.region = region.region_id;
    overlay.setAttribute('aria-label', `选取 ${region.name}`);
    overlay.title = region.name;
    const box = region.bounds;
    Object.assign(overlay.style, { left: `${box.x / manifest.screenshot.width * 100}%`, top: `${box.y / manifest.screenshot.height * 100}%`, width: `${box.width / manifest.screenshot.width * 100}%`, height: `${box.height / manifest.screenshot.height * 100}%` });
    overlay.addEventListener('click', () => choose({ kind: 'region', region_id: region.region_id }, region.name));
    byId('canvas').append(overlay);
  }
  byId('confirm').addEventListener('click', event => {
    if (!event.isTrusted || !choice) return;
    const record = {
      schema_version: 1, status: 'confirmed', page_id: manifest.page_id, source_hash: manifest.source_hash,
      ...choice,
      confirmation: { actor: 'user', evidence: 'page-context-preview: explicit confirmation button', confirmed_at: new Date().toISOString() },
    };
    const text = JSON.stringify(record, null, 2);
    byId('record').value = text;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    byId('download').href = downloadUrl;
    byId('download').download = `${manifest.page_id}-selection.json`;
    byId('download').hidden = false;
    byId('status').textContent = '选择已确认，可以复制或下载选择记录。';
  });
}

export function selectorHtml({ manifest, png }) {
  if (!Buffer.isBuffer(png) || hash(png) !== manifest?.screenshot?.sha256) fail('PREVIEW_IMAGE', 'Selector requires the actual matching screenshot bytes');
  const script = `(${selectorApp.toString()})(${JSON.stringify(manifest).replaceAll('<', '\\u003c')});`;
  const scriptHash = createHash('sha256').update(script).digest('base64');
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>选择页面参考</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,sans-serif;color:#20252b;background:#f3f5f7}h1{margin:0;font-size:22px}p{margin:8px 0 16px;color:#5b6570}button,select{font:inherit;padding:8px 12px;background:white;border:1px solid #aeb7c2;border-radius:6px;cursor:pointer}button:focus-visible,select:focus-visible{outline:3px solid #386ab7;outline-offset:2px}button:disabled{opacity:.5;cursor:default}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px}aside{display:flex;flex-direction:column;gap:8px}#viewer{height:540px;overflow:auto;border:1px solid #aeb7c2;background:white;position:relative}#canvas{position:relative;touch-action:none}#shot{display:block;width:100%;height:100%;user-select:none;pointer-events:none}.region{position:absolute;padding:0;border:1px dashed transparent;border-radius:0;background:transparent}.region:hover,.region.chosen{border-color:#386ab7;background:#386ab714}#status{min-height:24px;margin:16px 0 8px}textarea{display:block;width:100%;height:180px;margin-top:8px;padding:12px;font:12px/1.5 ui-monospace,monospace}#download{margin-left:16px}@media(max-width:700px){.layout{grid-template-columns:1fr}aside{flex-direction:row;flex-wrap:wrap}#viewer{height:440px}}
.box-mode{cursor:crosshair}.box-mode .region{pointer-events:none}#viewer{overflow-anchor:none}#box-outline{position:absolute;pointer-events:none;border:2px solid #386ab7;background:#386ab720}label[for="record"]{display:block;margin-top:16px}.view-tools{display:flex;gap:12px;align-items:center;margin-bottom:12px}
</style></head><body><h1 id="page-name">页面参考</h1><p>选择要参考的位置，再确认。页面仅供结构与位置参考。</p><div class="view-tools"><button id="box-mode" type="button">框选位置</button><label for="zoom">缩放</label><select id="zoom"><option value="0.5">50%</option><option value="0.75">75%</option><option value="1" selected>100%</option><option value="1.5">150%</option></select></div><div class="layout"><aside><button id="whole" type="button">选择整页</button></aside><div id="viewer" aria-label="页面截图"><div id="canvas"><img id="shot" draggable="false" src="data:image/png;base64,${png.toString('base64')}"><div id="box-outline" hidden></div></div></div></div><div id="status" role="status" aria-live="polite">尚未选择。</div><button id="confirm" type="button" disabled>确认选择</button><a id="download" hidden>下载选择记录</a><label for="record">选择记录</label><textarea id="record" readonly></textarea><script>${script}</script></body></html>`;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--page', '--root', '--catalog', '--output-dir'].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) fail('CLI_USAGE', 'Usage: page-context-preview.mjs render --page ID [--root PATH] [--catalog PATH] [--output-dir PATH]');
    options[args[i]] = args[i + 1];
  }
  if (command !== 'render' || !options['--page']) fail('CLI_USAGE', 'Expected render --page ID');
  const root = options['--root'] ?? repoRoot;
  const catalog = await loadCatalog({ root, ...(options['--catalog'] ? { catalogPath: options['--catalog'] } : {}) });
  const preview = await renderPreview({ catalog, pageId: options['--page'], root });
  const output = resolve(root, options['--output-dir'] ?? 'output/playwright/page-library');
  const outputRoot = resolve(root, 'output/playwright');
  if (output !== outputRoot && !output.startsWith(`${outputRoot}${sep}`)) fail('PREVIEW_OUTPUT', 'Preview artifacts must stay under output/playwright/');
  let cursor = await realpath(root);
  for (const part of relative(resolve(root), output).split(sep)) {
    cursor = resolve(cursor, part);
    try { if ((await lstat(cursor)).isSymbolicLink()) fail('PREVIEW_OUTPUT', 'Symlink output refused'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await mkdir(output, { recursive: true });
  const stem = resolve(output, preview.manifest.page_id);
  for (const [extension, data] of [['png', preview.png], ['json', `${JSON.stringify(preview.manifest, null, 2)}\n`], ['html', selectorHtml(preview)]]) {
    const file = `${stem}.${extension}`;
    try { if ((await lstat(file)).isSymbolicLink()) fail('PREVIEW_OUTPUT', 'Symlink output refused'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(file, data);
  }
  console.log(JSON.stringify({ page_id: preview.manifest.page_id, screenshot: `${stem}.png`, manifest: `${stem}.json`, selector: `${stem}.html`, status: 'preview-ready' }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (error) { console.error(JSON.stringify({ error: { code: error.code ?? 'PREVIEW_FAILED', message: error.message } })); process.exitCode = 1; }
}
