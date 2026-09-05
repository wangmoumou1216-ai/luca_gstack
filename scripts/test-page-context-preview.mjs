#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { validateSelection } from './page-context.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { renderPreview, selectorHtml } = await import('./page-context-preview.mjs');
const catalog = JSON.parse(readFileSync(resolve(root, '.claude/skill-os/page-library/catalog.json'), 'utf8'));
const preview = await renderPreview({ catalog, pageId: 'list', root });
assert.equal(preview.manifest.page_id, 'list');
assert.equal(preview.manifest.screenshot.width, 1440);
assert.equal(preview.manifest.screenshot.height, 900);
assert.equal(preview.manifest.screenshot.sha256, createHash('sha256').update(preview.png).digest('hex'));
assert.equal(preview.manifest.regions.length, 5);
assert.ok(preview.manifest.regions.find(region => region.region_id === 'filters').bounds.width > 500);
console.log('PASS screenshot renders the registered list page with styled, positioned regions');
const browser = await chromium.launch({ headless: true });
try {
  const screenshots = new Map([['list', preview]]);
  const artifacts = process.argv.includes('--artifacts') ? resolve(root, 'output/playwright/page-library-b1') : null;
  if (artifacts) mkdirSync(artifacts, { recursive: true });
  for (const entry of catalog.pages) {
    const shot = screenshots.get(entry.page_id) ?? await renderPreview({ catalog, pageId: entry.page_id, root, browser });
    screenshots.set(entry.page_id, shot);
    if (artifacts) {
      writeFileSync(resolve(artifacts, `${entry.page_id}.png`), shot.png);
      writeFileSync(resolve(artifacts, `${entry.page_id}.json`), `${JSON.stringify(shot.manifest, null, 2)}\n`);
      if (entry.page_id === 'list') writeFileSync(resolve(artifacts, 'list.html'), selectorHtml(shot));
    }
    assert.equal(shot.manifest.regions.length, entry.regions.length);
    for (const region of shot.manifest.regions) assert.ok(region.visible && region.bounds.width > 0 && region.bounds.height > 0, `${entry.page_id}/${region.region_id}: region must be visible in the default screenshot`);
    console.log(`PASS actual ${entry.page_id} screenshot and ${entry.regions.length} visible source regions`);
  }
  // The source section contains two 32px field rows, a 12px row gap, and its heading.
  assert.ok(screenshots.get('form').manifest.regions.find(region => region.region_id === 'basic').bounds.height > 76, 'form basic region encloses both field rows and its heading');
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.setContent(selectorHtml(preview));
  assert.equal(await page.getByLabel('选择记录').inputValue(), '');
  assert.equal(await page.getByRole('button', { name: '确认选择', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '选择整页', exact: true }).click();
  assert.equal(await page.getByLabel('选择记录').inputValue(), '');
  await page.getByRole('button', { name: '确认选择', exact: true }).click();
  const record = JSON.parse(await page.getByLabel('选择记录').inputValue());
  assert.equal(record.kind, 'page');
  assert.equal(record.page_id, 'list');
  assert.equal(record.source_hash, catalog.pages[0].source_hash);
  console.log('PASS screenshot selector emits a page choice only after an explicit confirm click');
  await page.getByRole('button', { name: '选取 搜索和筛选工具栏', exact: true }).click({ timeout: 2000 });
  assert.equal(await page.getByLabel('选择记录').inputValue(), '');
  await page.getByRole('button', { name: '确认选择', exact: true }).click();
  const regionRecord = JSON.parse(await page.getByLabel('选择记录').inputValue());
  assert.equal(regionRecord.kind, 'region');
  assert.equal(regionRecord.region_id, 'filters');
  const validated = await validateSelection(catalog, regionRecord, { root, preview });
  assert.equal(validated.reference.region.region_id, 'filters');
  console.log('PASS clicking a pictured semantic region replaces the earlier page choice');
  // A previously focused region can restore its scroll position during a later wheel event.
  // Start this independent seam with a fresh document; its 180/150/100/60 source-box oracle is unchanged.
  await page.goto('about:blank');
  await page.setContent(selectorHtml(preview));
  await page.getByRole('button', { name: '框选位置', exact: true }).click({ timeout: 2000 });
  await page.getByLabel('缩放').selectOption('1.5');
  const view = await page.getByLabel('页面截图', { exact: true }).boundingBox();
  await page.mouse.move(view.x + 200, view.y + 150);
  await page.mouse.wheel(240, 180);
  await page.waitForFunction(() => document.getElementById('viewer').scrollTop === 180 && document.getElementById('viewer').scrollLeft === 240);
  await page.mouse.move(view.x + 31, view.y + 46);
  await page.mouse.down();
  await page.mouse.move(view.x + 181, view.y + 136, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: '确认选择', exact: true }).click();
  const boxRecord = JSON.parse(await page.getByLabel('选择记录').inputValue());
  assert.equal(boxRecord.kind, 'box');
  const boxContext = await validateSelection(catalog, boxRecord, { root, preview });
  for (const [key, expected] of Object.entries({ x: 180, y: 150, width: 100, height: 60 })) assert.ok(Math.abs(boxContext.reference.box[key] - expected) < 0.01, `${key}: expected ${expected}, got ${boxContext.reference.box[key]}`);
  console.log('PASS box selection at 150% zoom with horizontal/vertical scrolling maps to original screenshot coordinates');
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'page-context-preview-'));
  const sourceRef = '.claude/skill-os/page-library/sources/sixth.html';
  const fixtureSource = resolve(fixtureRoot, sourceRef);
  mkdirSync(dirname(fixtureSource), { recursive: true });
  const sixth = {
    page_id: 'sixth', name: '新增参考页', aliases: ['新增页面'], intent: '验证后续登记的静态页面参考', scope: 'framework', source_ref: sourceRef,
    source_hash: '', viewport: { width: 320, height: 240 }, states: ['default'],
    regions: [{ region_id: 'card', parent_id: null, name: '信息卡片', aliases: ['主体'], intent: '阅读卡片信息', anchor: { kind: 'heading', tag: 'h1', text: '新增参考页', ancestor_levels: 1 } }],
  };
  const sixPageCatalog = { ...catalog, pages: [...catalog.pages, sixth] };
  const staticPage = '<!DOCTYPE html><style>body{margin:0}section{margin:12px;width:280px;height:180px;background:#e8ecf0}h1{font:20px system-ui;margin:0}</style><section><h1>新增参考页</h1><p>第六页的信息区域</p></section>';
  async function renderFixture(html, renderer = renderPreview) {
    writeFileSync(fixtureSource, html);
    sixth.source_hash = createHash('sha256').update(html).digest('hex');
    return renderer({ catalog: sixPageCatalog, pageId: 'sixth', root: fixtureRoot, browser });
  }
  const sixthPreview = await renderFixture(staticPage);
  assert.equal(sixthPreview.manifest.page_id, 'sixth');
  assert.deepEqual(sixthPreview.manifest.regions[0].bounds, { x: 12, y: 12, width: 280, height: 180 });
  assert.equal(sixthPreview.manifest.render.scripts, 'none');
  console.log('PASS sixth registered page renders through the same entry and heading ancestor encloses its card');

  let networkHits = 0;
  const sentinel = createServer((_request, response) => { networkHits++; response.end('unexpected network request'); });
  await new Promise((resolve, reject) => { sentinel.once('error', reject); sentinel.listen(0, '127.0.0.1', resolve); });
  const remote = `http://127.0.0.1:${sentinel.address().port}/should-not-load`;
  try {
    await assert.rejects(renderFixture(`${staticPage}<script>fetch(${JSON.stringify(remote)})</script>`), { code: 'PREVIEW_SCRIPT' });
    await assert.rejects(renderFixture(`${staticPage}<img src="${remote}">`), { code: 'PREVIEW_RESOURCE' });
    await assert.rejects(renderFixture(`${staticPage}<style>section{background-image:url("${remote}")}</style>`), { code: 'PREVIEW_RESOURCE' });
    const assets = resolve(dirname(fixtureSource), 'assets');
    mkdirSync(assets, { recursive: true });
    writeFileSync(resolve(assets, 'safe.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="blue"/></svg>');
    const withEvent = await renderFixture(`${staticPage}<img src="./assets/safe.svg" onload='fetch(${JSON.stringify(remote)})'>`);
    assert.equal(withEvent.manifest.render.removed_events, 1);
    assert.equal(networkHits, 0);
    console.log('PASS source scripts and remote image/CSS requests are rejected; source events stay inert with zero loopback hits');
    mkdirSync(resolve(assets, 'vendor'), { recursive: true });
    writeFileSync(resolve(assets, 'vendor/tailwindcss.com.js'), 'throw new Error("unreviewed compiler")');
    await assert.rejects(renderFixture(`${staticPage}<script src="./assets/vendor/tailwindcss.com.js"></script>`), { code: 'PREVIEW_SCRIPT' });
    await renderFixture(staticPage);
    console.log('PASS reviewed-compiler hash guard rejects changed code and safe source renders again');
  } finally { await new Promise(resolve => sentinel.close(resolve)); }
  const mismatchedImage = { manifest: preview.manifest, png: Buffer.from('not the captured screenshot') };
  assert.throws(() => selectorHtml(mismatchedImage), { code: 'PREVIEW_IMAGE' });
  writeFileSync(fixtureSource, `${staticPage}<!-- source changed -->`);
  await assert.rejects(renderPreview({ catalog: sixPageCatalog, pageId: 'sixth', root: fixtureRoot, browser }), { code: 'SOURCE_HASH' });
  await renderFixture(staticPage);
  console.log('PASS changed screenshot bytes and stale source hashes cannot be used for a selection');

  if (process.argv.includes('--mutation')) {
    const sourcePath = resolve(root, 'scripts/page-context-preview.mjs');
    const source = readFileSync(sourcePath, 'utf8');
    const guard = "!Buffer.isBuffer(png) || hash(png) !== manifest?.screenshot?.sha256";
    assert.equal(source.split(guard).length, 2, 'mutation must target exactly one real screenshot guard');
    const mutant = source.replace(guard, '!Buffer.isBuffer(png)')
      .replace("from 'playwright'", () => `from ${JSON.stringify(import.meta.resolve('playwright'))}`)
      .replace("from './page-context.mjs'", () => `from ${JSON.stringify(pathToFileURL(resolve(root, 'scripts/page-context.mjs')).href)}`);
    const mutantPath = resolve(fixtureRoot, 'mutant-preview.mjs');
    writeFileSync(mutantPath, mutant);
    const modified = await import(pathToFileURL(mutantPath).href);
    assert.throws(() => assert.throws(() => modified.selectorHtml(mismatchedImage), { code: 'PREVIEW_IMAGE' }), error => error.code === 'ERR_ASSERTION' && /Missing expected exception/.test(error.message));
    assert.throws(() => selectorHtml(mismatchedImage), { code: 'PREVIEW_IMAGE' });
    assert.ok(selectorHtml(preview).startsWith('<!DOCTYPE html>'));
    assert.equal(readFileSync(sourcePath, 'utf8'), source, 'real source is unchanged by the isolated code mutation');
    console.log('PASS guard mutation: screenshot guard PASS → disabled guard causes exact missing-exception FAIL → original guard PASS');
  }
  if (artifacts) console.log(`ARTIFACTS ${artifacts}`);
} finally { await browser.close(); }
