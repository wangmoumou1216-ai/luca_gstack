import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const cli = process.env.PAGE_CONTEXT_TEST_CLI ?? resolve('scripts/page-context.mjs');
const root = await mkdtemp(join(tmpdir(), 'page-context-'));
const html = '<!doctype html><main><h1>Tickets</h1><section data-module="table">Rows</section></main>';
const hash = createHash('sha256').update(html).digest('hex');
const page = { page_id: 'list', name: '列表', aliases: ['工单'], intent: '管理记录', scope: 'framework', source_ref: 'framework/list.html', source_hash: hash, viewport: { width: 1200, height: 800 }, states: ['default'], regions: [{ region_id: 'table', parent_id: null, name: '记录表格', aliases: ['数据'], intent: '管理行记录', anchor: { kind: 'attribute', name: 'data-module', value: 'table' } }] };
let catalog = { schema_version: 1, retired_page_ids: [], pages: [page] };
const catalogPath = join(root, 'catalog.json');
async function save() { await writeFile(catalogPath, JSON.stringify(catalog)); }
function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root, '--catalog', catalogPath], { encoding: 'utf8' });
  assert.ok(result.stdout.trim(), result.stderr);
  return { status: result.status, body: JSON.parse(result.stdout) };
}
try {
  await mkdir(join(root, 'framework'));
  await writeFile(join(root, page.source_ref), html);
  await save();
  const result = run('validate');
  assert.equal(result.status, 0, JSON.stringify(result.body));
  assert.equal(result.body.pages, 1);
  console.log('PASS: catalog CLI validates source hash and exact region anchors');
  const recalled = run('candidates', '--query', '我想查看工单数据');
  assert.equal(recalled.status, 0, JSON.stringify(recalled.body));
  assert.equal(recalled.body.candidates[0].page_id, 'list');
  assert.deepEqual(recalled.body.candidates[0].matched_terms, ['工单', '数据']);
  assert.equal(recalled.body.candidates[0].regions[0].region_id, 'table');
  assert.equal('confidence' in recalled.body.candidates[0], false);
  for (const id of ['detail-two', 'detail-three', 'form', 'home']) catalog.pages.push({ ...page, page_id: id, name: id, aliases: [], regions: [] });
  await mkdir(join(root, '.claude/skill-os/page-library/sources'), { recursive: true });
  await writeFile(join(root, '.claude/skill-os/page-library/sources/timeline.html'), html);
  catalog.pages.push({ ...page, page_id: 'timeline', name: '时间轴', aliases: ['活动轨迹'], source_ref: '.claude/skill-os/page-library/sources/timeline.html', regions: [] });
  await save();
  assert.equal(run('validate').body.pages, 6);
  assert.equal(run('candidates', '--query', '按活动轨迹展示').body.candidates[0].page_id, 'timeline');
  assert.deepEqual(run('candidates', '--query', 'unrelated astronomy').body.candidates, []);
  assert.equal(run('candidates', '--query', '列表', '--scope', 'project').body.error.code, 'SOURCE_SCOPE');
  console.log('PASS: lexical reasons, explicit empty result and sixth-page extension without route edits');
  const recordPath = join(root, 'selection.json');
  async function select(record, ...args) {
    await writeFile(recordPath, JSON.stringify(record));
    return run('selection', '--record', recordPath, ...args);
  }
  const confirmed = { schema_version: 1, status: 'confirmed', page_id: 'list', source_hash: hash, kind: 'page', confirmation: { actor: 'user', evidence: 'fixture user message: use the list page', confirmed_at: '2026-09-05T12:00:00Z' } };
  const selected = await select(confirmed);
  assert.equal(selected.status, 0, JSON.stringify(selected.body));
  assert.equal(selected.body.reference.page_id, 'list');
  assert.equal(selected.body.reference.kind, 'page');
  const badActor = await select({ ...confirmed, confirmation: { ...confirmed.confirmation, actor: 'assistant' } });
  assert.equal(badActor.body.error?.code, 'SCHEMA_INVALID', 'selection actor must be user');
  assert.equal((await select({ ...confirmed, confirmation: { ...confirmed.confirmation, evidence: '  ' } })).body.error?.code, 'SCHEMA_INVALID', 'confirmation needs evidence');
  const region = await select({ ...confirmed, kind: 'region', region_id: 'table' });
  assert.equal(region.body.reference.region.region_id, 'table');
  for (const status of ['declined', 'no-match']) {
    assert.deepEqual((await select({ schema_version: 1, status, reference: 'none' })).body, { schema_version: 1, status, reference: 'none' });
  }
  assert.equal((await select({ schema_version: 1, status: 'pending' })).body.error.code, 'PENDING_SELECTION');
  assert.equal((await select({ ...confirmed, source_hash: '0'.repeat(64) })).body.error?.code, 'STALE_SELECTION', 'stale source selection must require reconfirmation');
  assert.equal((await select({ ...confirmed, kind: 'region', region_id: 'missing' })).body.error.code, 'UNKNOWN_REGION');
  console.log('PASS: confirmed page/region, explicit no-reference branches, pending and stale guards');
  const previewPath = join(root, 'preview.json');
  const screenshot = { sha256: 'a'.repeat(64), width: 1200, height: 1600, source_hash: hash, viewport: page.viewport };
  const preview = { schema_version: 1, page_id: 'list', source_hash: hash, viewport: page.viewport, screenshot, regions: [{ region_id: 'table', name: '记录表格', bounds: { x: 100, y: 200, width: 700, height: 600 } }] };
  await writeFile(previewPath, JSON.stringify(preview));
  const boxRecord = { ...confirmed, kind: 'box', screenshot, selection: { client_x: 150, client_y: 100, width: 200, height: 150, origin_x: 100, origin_y: 50, scale: 0.5, scroll_x: 20, scroll_y: 300 } };
  const box = await select(boxRecord, '--preview', previewPath);
  assert.equal(box.status, 0, JSON.stringify(box.body));
  assert.deepEqual(box.body.reference.box, { x: 120, y: 400, width: 400, height: 300, screenshot });
  assert.equal((await select(boxRecord)).body.error.code, 'PREVIEW_REQUIRED');
  assert.equal((await select({ ...boxRecord, screenshot: { ...screenshot, sha256: 'b'.repeat(64) } }, '--preview', previewPath)).body.error.code, 'STALE_SCREENSHOT');
  for (const changed of [{ width: 1199 }, { height: 1599 }, { source_hash: 'b'.repeat(64) }, { viewport: { width: 390, height: 844 } }]) {
    assert.equal((await select({ ...boxRecord, screenshot: { ...screenshot, ...changed } }, '--preview', previewPath)).body.error?.code, 'STALE_SCREENSHOT');
  }
  assert.equal((await select({ ...boxRecord, selection: { ...boxRecord.selection, width: 900 } }, '--preview', previewPath)).body.error.code, 'BOX_BOUNDS');
  assert.equal((await select({ ...boxRecord, selection: { ...boxRecord.selection, scale: 0 } }, '--preview', previewPath)).body.error.code, 'SCHEMA_INVALID');
  assert.equal((await select(boxRecord, '--preview', previewPath)).status, 0);
  const { validateSelection, loadCatalog } = await import(pathToFileURL(cli));
  const loaded = await loadCatalog({ root, catalogPath });
  await assert.rejects(validateSelection(loaded, { ...boxRecord, selection: { ...boxRecord.selection, client_x: NaN } }, { root, preview }), { code: 'SCHEMA_INVALID' });
  await assert.rejects(validateSelection(loaded, boxRecord, { root, preview: { manifest: preview, png: Buffer.from('not a PNG') } }), { code: 'STALE_SCREENSHOT' });
  const noReferenceForgery = await select({ schema_version: 1, status: 'declined', reference: 'none', page_id: 'list' });
  assert.equal(noReferenceForgery.body.error?.code, 'REFERENCE_CONFLICT');
  console.log('PASS: zoom/scroll conversion and screenshot mutation PASS -> STALE_SCREENSHOT/BOX_BOUNDS -> PASS');
  const realCatalog = await loadCatalog({ root: resolve('.') });
  const realList = realCatalog.pages.find(entry => entry.page_id === 'list');
  const realSelection = { ...confirmed, source_hash: realList.source_hash, kind: 'region', region_id: 'filters' };
  assert.equal((await validateSelection(realCatalog, realSelection, { root: resolve('.') })).status, 'confirmed');
  const falseParent = structuredClone(realCatalog);
  falseParent.pages.find(entry => entry.page_id === 'list').regions.find(entry => entry.region_id === 'filters').parent_id = 'pagination';
  await assert.rejects(validateSelection(falseParent, realSelection, { root: resolve('.') }), { code: 'REGION_CONTAINMENT' }, 'source parent must actually contain its child region');
  assert.equal((await validateSelection(realCatalog, realSelection, { root: resolve('.') })).status, 'confirmed');
  console.log('PASS: real source containment -> forged filters/pagination rejected -> restored confirmed');
  const treeHtml = '<main id="outer"><section id="group"><h2>Fields</h2><input><hr><div id="child"><span id="leaf">Value</span></div></section><aside id="sibling">Other</aside></main>';
  const treePage = { ...page, page_id: 'tree', source_ref: 'framework/tree.html', source_hash: createHash('sha256').update(treeHtml).digest('hex'), regions: [
    { ...page.regions[0], region_id: 'group', anchor: { kind: 'heading', tag: 'h2', text: 'Fields', ancestor_levels: 1 } },
    { ...page.regions[0], region_id: 'child', parent_id: 'group', anchor: { kind: 'attribute', name: 'id', value: 'child' } },
    { ...page.regions[0], region_id: 'sibling', anchor: { kind: 'attribute', name: 'id', value: 'sibling' } }
  ] };
  await writeFile(join(root, treePage.source_ref), treeHtml);
  const treeCatalog = { schema_version: 1, retired_page_ids: [], pages: [treePage] };
  const treeRecord = { ...confirmed, page_id: 'tree', source_hash: treePage.source_hash, kind: 'region', region_id: 'child' };
  assert.equal((await validateSelection(treeCatalog, treeRecord, { root })).status, 'confirmed', 'heading ancestor resolves to the group container');
  const wrongHeadingParent = structuredClone(treeCatalog);
  wrongHeadingParent.pages[0].regions[0].anchor.ancestor_levels = 0;
  await assert.rejects(validateSelection(wrongHeadingParent, treeRecord, { root }), { code: 'REGION_CONTAINMENT' });
  const missingAncestor = structuredClone(treeCatalog);
  missingAncestor.pages[0].regions[0].anchor.ancestor_levels = 4;
  await assert.rejects(validateSelection(missingAncestor, treeRecord, { root }), { code: 'REGION_ANCESTOR' });
  const sameNode = structuredClone(treeCatalog);
  sameNode.pages[0].regions[1].anchor.value = 'group';
  await assert.rejects(validateSelection(sameNode, treeRecord, { root }), { code: 'REGION_CONTAINMENT' });
  const reverseParent = structuredClone(treeCatalog);
  reverseParent.pages[0].regions[0].parent_id = 'child';
  reverseParent.pages[0].regions[1].parent_id = null;
  await assert.rejects(validateSelection(reverseParent, treeRecord, { root }), { code: 'REGION_CONTAINMENT' });
  assert.equal((await validateSelection(treeCatalog, treeRecord, { root })).status, 'confirmed');
  console.log('PASS: heading container, void elements, missing ancestor, equal-node and reversed containment');
  for (const reparsedHtml of [
    '<p id="group"><h2>Fields</h2><div id="child">Value</div></p><aside id="sibling">Other</aside>',
    '<table id="group"><h2>Fields</h2><div id="child">Value</div></table><aside id="sibling">Other</aside>',
    '<button id="group"><h2>Fields</h2><button id="child">Value</button></button><aside id="sibling">Other</aside>',
    '<ul><li id="group"><h2>Fields</h2><li id="child">Value</li></li></ul><aside id="sibling">Other</aside>'
  ]) {
    const reparsedCatalog = structuredClone(treeCatalog);
    reparsedCatalog.pages[0].source_hash = createHash('sha256').update(reparsedHtml).digest('hex');
    await writeFile(join(root, treePage.source_ref), reparsedHtml);
    await assert.rejects(validateSelection(reparsedCatalog, { ...treeRecord, source_hash: reparsedCatalog.pages[0].source_hash }, { root }), { code: 'SOURCE_STRUCTURE' }, 'browser repair cannot manufacture source ancestry');
  }
  await writeFile(join(root, treePage.source_ref), treeHtml);
  const baseline = structuredClone(catalog);
  async function catalogMutation(name, edit, code) {
    catalog = structuredClone(baseline);
    edit(catalog);
    await save();
    const result = run('validate');
    assert.equal(result.status, 1, name);
    assert.equal(result.body.error.code, code, `${name}: ${JSON.stringify(result.body)}`);
    catalog = structuredClone(baseline);
    await save();
    assert.equal(run('validate').status, 0, `${name}: restore`);
    console.log(`PASS mutation: ${name} -> ${code} -> restored PASS`);
  }
  await catalogMutation('schema version', data => { data.schema_version = 2; }, 'SCHEMA_INVALID');
  await catalogMutation('wrong scope', data => { data.pages[0].scope = 'project'; }, 'SCHEMA_INVALID');
  await catalogMutation('retired ID', data => data.retired_page_ids.push('list'), 'PAGE_ID_REUSED');
  await catalogMutation('duplicate page ID', data => data.pages.push(data.pages[0]), 'PAGE_ID_REUSED');
  await catalogMutation('duplicate region ID', data => data.pages[0].regions.push(data.pages[0].regions[0]), 'REGION_ID_REUSED');
  await catalogMutation('missing parent', data => { data.pages[0].regions[0].parent_id = 'missing'; }, 'REGION_PARENT');
  await catalogMutation('parent cycle', data => { data.pages[0].regions[0].parent_id = 'table'; }, 'REGION_CYCLE');
  await catalogMutation('missing anchor', data => { data.pages[0].regions[0].anchor.value = 'missing'; }, 'REGION_ANCHOR');
  await catalogMutation('anchor selector injection', data => { data.pages[0].regions[0].anchor.value = 'table\"] *'; }, 'REGION_ANCHOR');
  for (const ancestor_levels of [-1, 1.5, 5]) {
    await catalogMutation(`heading ancestor bound ${ancestor_levels}`, data => { data.pages[0].regions[0].anchor = { kind: 'heading', tag: 'h1', text: 'Tickets', ancestor_levels }; }, 'SCHEMA_INVALID');
  }
  await catalogMutation('source hash', data => { data.pages[0].source_hash = '0'.repeat(64); }, 'SOURCE_HASH');
  for (const ref of ['../outside.html', 'framework/../../outside.html', 'framework/../docs/private.html', '/etc/passwd', 'docs/private.html', 'framework\\list.html', '.claude/workflow-state.html']) {
    await catalogMutation(`source boundary ${ref}`, data => { data.pages[0].source_ref = ref; }, 'SOURCE_SCOPE');
  }
  await symlink(join(root, 'framework/list.html'), join(root, 'framework/link.html'));
  await catalogMutation('source symlink', data => { data.pages[0].source_ref = 'framework/link.html'; }, 'SOURCE_SYMLINK');
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs/catalog.json'), JSON.stringify(baseline));
  await writeFile(join(root, 'docs/selection.json'), JSON.stringify(confirmed));
  await writeFile(join(root, 'docs/preview.json'), JSON.stringify(preview));
  const deniedCatalog = spawnSync(process.execPath, [cli, 'validate', '--root', root, '--catalog', 'docs/catalog.json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(deniedCatalog.stdout).error.code, 'SOURCE_SCOPE');
  assert.equal(run('selection', '--record', 'docs/selection.json').body.error.code, 'SOURCE_SCOPE');
  assert.equal((await select(boxRecord, '--preview', 'docs/preview.json')).body.error.code, 'SOURCE_SCOPE');
  for (const markup of ['<!-- <section data-module="table"> -->', '<script>const fake = \'<section data-module="table">\';</script>', '<textarea><section data-module="table"></textarea>', '<template><section data-module="table"></section></template>', '<script>unclosed <section data-module="table">']) {
    const source = '<h1>Tickets</h1>' + markup;
    await writeFile(join(root, 'framework/list.html'), source);
    catalog = structuredClone(baseline);
    for (const entry of catalog.pages.filter(entry => entry.source_ref === 'framework/list.html')) entry.source_hash = createHash('sha256').update(source).digest('hex');
    await save();
    assert.equal(run('validate').body.error.code, 'REGION_ANCHOR', markup);
  }
  await writeFile(join(root, 'framework/list.html'), html);
  catalog = structuredClone(baseline);
  await save();
  assert.equal(run('validate').status, 0);
  console.log('PASS: project display paths and fake anchors refused; original sources restored');
  catalog.pages[0].regions[0].anchor = { kind: 'heading', tag: 'h1', text: 'Tickets' };
  await save();
  assert.equal(run('validate').status, 0);
  catalog.pages[0].regions[0].anchor.ancestor_levels = 1;
  await save();
  assert.equal(run('validate').status, 0, 'bounded ancestor locator preserves heading anchor exactness');
  await writeFile(join(root, 'framework/list.html'), html + '<h1>Tickets</h1>');
  for (const entry of catalog.pages.filter(entry => entry.source_ref === 'framework/list.html')) entry.source_hash = createHash('sha256').update(html + '<h1>Tickets</h1>').digest('hex');
  await save();
  assert.equal(run('validate').body.error?.code, 'REGION_ANCHOR', 'duplicate exact headings are ambiguous');
  await writeFile(join(root, 'framework/list.html'), html);
  catalog = structuredClone(baseline);
  await save();
  assert.equal(run('validate').status, 0);
  console.log('PASS: heading anchor exactness and ambiguity guard restored');
  if (process.argv.includes('--mutation')) {
    const mutantRoot = join(root, 'mutants');
    await mkdir(join(mutantRoot, 'scripts'), { recursive: true });
    await mkdir(join(mutantRoot, '.claude/skill-os/page-library'), { recursive: true });
    const original = await readFile(cli, 'utf8');
    const mutantCli = join(mutantRoot, 'scripts/page-context.mjs');
    await writeFile(join(mutantRoot, '.claude/skill-os/page-library/schema.json'), await readFile(resolve('.claude/skill-os/page-library/schema.json')));
    for (const [name, target, replacement, diagnostic] of [
      ['confirmation guard bypass', 'shape(record, schema.$defs.selection);', '// mutation: bypass selection shape', 'selection actor must be user'],
      ['stale source guard bypass', 'if (page.source_hash !== record.source_hash)', 'if (false)', 'stale source selection must require reconfirmation'],
      ['source containment guard bypass', 'if (ancestor !== expectedParent)', 'if (false)', 'source parent must actually contain its child region']
    ]) {
      assert.equal(original.split(target).length, 2, `unique mutation seam: ${name}`);
      await writeFile(mutantCli, original.replace(target, replacement));
      const result = spawnSync(process.execPath, [resolve('scripts/test-page-context.mjs')], { env: { ...process.env, PAGE_CONTEXT_TEST_CLI: mutantCli }, encoding: 'utf8' });
      assert.equal(result.status, 1, `mutant must be killed: ${name}`);
      assert.ok(result.stderr.includes(diagnostic), `expected named public assertion for ${name}: ${result.stderr}`);
      await writeFile(mutantCli, original);
      const restored = spawnSync(process.execPath, [resolve('scripts/test-page-context.mjs')], { env: { ...process.env, PAGE_CONTEXT_TEST_CLI: mutantCli }, encoding: 'utf8' });
      assert.equal(restored.status, 0, restored.stderr);
      console.log(`PASS guard mutation: ${name} -> named assertion FAIL -> restored suite PASS`);
    }
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
