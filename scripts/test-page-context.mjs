import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const cli = process.env.PAGE_CONTEXT_TEST_CLI ?? resolve('scripts/page-context.mjs');
const root = await mkdtemp(join(tmpdir(), 'page-context-'));
const html = '<!doctype html><main><h1>Tickets</h1><section data-module="table">Rows</section></main>';
const hash = createHash('sha256').update(html).digest('hex');
const page = { page_id: 'list', name: '列表', aliases: ['工单'], intent: '管理记录', scope: 'framework', lifecycle: 'live', carrier_eligible: false, source_ref: 'framework/list.html', source_hash: hash, viewport: { width: 1200, height: 800 }, states: ['default'], regions: [{ region_id: 'table', parent_id: null, name: '记录表格', aliases: ['数据'], intent: '管理行记录', anchor: { kind: 'attribute', name: 'data-module', value: 'table' } }] };
let catalog = { schema_version: 2, retired_page_ids: [], pages: [page] };
const catalogPath = join(root, 'catalog.json');
async function save() { await writeFile(catalogPath, JSON.stringify(catalog)); }
function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root, '--catalog', catalogPath], { encoding: 'utf8' });
  assert.ok(result.stdout.trim(), result.stderr);
  return { status: result.status, body: JSON.parse(result.stdout) };
}
function runPhaseAAt(testRoot) {
  const result = spawnSync(process.execPath, [cli, 'phase-a-discovery', '--query', '我想查看工单数据', '--root', testRoot], { encoding: 'utf8' });
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
  const noHint = run('phase-a-discovery', '--query', '我想查看工单数据');
  assert.equal(noHint.status, 0, JSON.stringify(noHint.body));
  assert.deepEqual(noHint.body, { schema_version: 2, mode: 'phase_a_discovery', status: 'NO_HINT', ephemeral: true, candidate_hints: [] });
  const missingRoot = join(root, 'missing-phase-a-root');
  assert.deepEqual(runPhaseAAt(missingRoot), { status: 0, body: noHint.body }, 'an absent root is an unavailable discovery primitive, not a write target');
  await assert.rejects(lstat(missingRoot), { code: 'ENOENT' }, 'phase A must not initialize a missing root');
  const emptyRoot = join(root, 'empty-phase-a-root');
  await mkdir(emptyRoot);
  assert.deepEqual(runPhaseAAt(emptyRoot), { status: 0, body: noHint.body }, 'an uninitialized root returns the same controlled no-hint result');
  await mkdir(join(emptyRoot, '.claude/skill-os/page-library'), { recursive: true });
  await writeFile(join(emptyRoot, '.claude/skill-os/page-library/catalog.json'), '{ not-json');
  const malformedCatalog = runPhaseAAt(emptyRoot);
  assert.equal(malformedCatalog.status, 1, JSON.stringify(malformedCatalog.body));
  assert.equal(malformedCatalog.body.error.code, 'INVALID_INPUT', 'an existing malformed catalog remains fail-closed');
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
  const { carrierContractForPage, computeBindingHash, computeModuleContractHash, discoverCandidateHints, loadCatalog, validateCarrierBinding, validateCarrierBindingDraft, validateSelection } = await import(pathToFileURL(cli));
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
  assert.equal(realCatalog.schema_version, 2);
  const referenceIds = ['list', 'detail-2col', 'detail-3col', 'form', 'home'];
  const carrierIds = ['settings-lead-pool', 'customer-list-detail', 'crm-workbench-home', 'sales-record-list-detail'];
  assert.deepEqual(realCatalog.pages.slice(0, 5).map(entry => entry.page_id), referenceIds, 'the existing five page identities and order stay intact');
  assert.ok(realCatalog.pages.slice(0, 5).every(entry => entry.lifecycle === 'live' && entry.carrier_eligible === false), 'the existing five pages remain selectable references, not carriers');
  assert.deepEqual(realCatalog.pages.filter(entry => entry.carrier_eligible).map(entry => entry.page_id), carrierIds, 'the four confirmed templates are new live carrier pages');
  assert.equal(discoverCandidateHints(realCatalog, 'CRM 首页').candidate_hints[0].page_id, 'crm-workbench-home');
  await assert.rejects(Promise.resolve().then(() => carrierContractForPage(realList)), { code: 'CARRIER_INELIGIBLE' });
  for (const pageId of carrierIds) {
    const entry = realCatalog.pages.find(page => page.page_id === pageId);
    assert.equal(computeModuleContractHash(entry), entry.module_contract_hash, `${pageId}: module contract hash is current`);
    assert.equal(carrierContractForPage(entry).page_id, pageId);
    const addSlot = entry.slots[0];
    const draft = {
      schema_version: 2,
      bundle_kind: 'carrier',
      frozen_packet: { source_packet_sha256: '7'.repeat(64), applicability_set_sha256: '8'.repeat(64) },
      binding: {
        page_id: pageId,
        source_ref: entry.source_ref,
        source_hash: entry.source_hash,
        module_contract_hash: entry.module_contract_hash,
        carrier_profile: 'structural_carrier',
        actions: [{ action_id: `C-${pageId}`, action: 'add', slot_id: addSlot.slot_id }]
      }
    };
    assert.equal((await validateCarrierBindingDraft(realCatalog, draft, { root: resolve('.') })).contract.page_id, pageId);
  }
  const sourceManifest = JSON.parse(await readFile(resolve('.claude/skill-os/page-library/source-manifest.json'), 'utf8'));
  assert.equal(sourceManifest.profile, 'curated-structural-shadow-v1');
  assert.deepEqual(sourceManifest.sources.map(source => source.page_id), carrierIds);
  for (const source of sourceManifest.sources) {
    const [rawBytes, shadowBytes] = await Promise.all([readFile(source.raw_source), readFile(resolve(source.shadow_source))]);
    assert.equal(rawBytes.length, source.raw_bytes, `${source.page_id}: raw byte count is frozen`);
    assert.equal(createHash('sha256').update(rawBytes).digest('hex'), source.raw_sha256, `${source.page_id}: raw source identity is frozen`);
    assert.equal(shadowBytes.length, source.shadow_bytes, `${source.page_id}: shadow byte count is frozen`);
    assert.equal(createHash('sha256').update(shadowBytes).digest('hex'), source.shadow_sha256, `${source.page_id}: shadow source identity is frozen`);
    assert.equal(realCatalog.pages.find(entry => entry.page_id === source.page_id).source_hash, source.shadow_sha256);
  }
  console.log('PASS: existing five references coexist with four raw-bound, live carrier contracts and deterministic shadow sources');
  const carrierHtml = '<main id="app"><section id="toolbar" data-module="toolbar"><span id="toolbar-label">Toolbar</span><div id="toolbar-slot"></div></section><section id="content" data-module="content"><span id="content-label">Content</span></section></main>';
  await writeFile(join(root, 'framework/carrier.html'), carrierHtml);
  const carrierPage = {
    page_id: 'carrier', name: 'Carrier fixture', aliases: ['carrier records'], intent: 'Carrier contract fixture', scope: 'framework', lifecycle: 'live', carrier_eligible: true,
    source_ref: 'framework/carrier.html', source_hash: createHash('sha256').update(carrierHtml).digest('hex'), viewport: { width: 1200, height: 800 }, states: ['default'],
    regions: [{ region_id: 'canvas', parent_id: null, name: 'Canvas', aliases: [], intent: 'Carrier canvas', anchor: { kind: 'attribute', name: 'id', value: 'app' } }],
    modules: [
      { module_id: 'root', parent_module_id: null, name: 'Root', intent: 'Root module', anchor: { kind: 'attribute', name: 'id', value: 'app' }, required: true, allowed_actions: ['modify', 'preserve'], invariants: [{ invariant_id: 'root-shell', name: 'Root shell', anchor: { kind: 'attribute', name: 'id', value: 'app' } }] },
      { module_id: 'toolbar', parent_module_id: 'root', name: 'Toolbar', intent: 'Toolbar module', anchor: { kind: 'attribute', name: 'data-module', value: 'toolbar' }, required: false, allowed_actions: ['modify', 'preserve'], invariants: [{ invariant_id: 'toolbar-label', name: 'Toolbar label', anchor: { kind: 'attribute', name: 'id', value: 'toolbar-label' } }] },
      { module_id: 'content', parent_module_id: 'root', name: 'Content', intent: 'Content module', anchor: { kind: 'attribute', name: 'data-module', value: 'content' }, required: false, allowed_actions: ['modify', 'remove', 'preserve'], invariants: [{ invariant_id: 'content-label', name: 'Content label', anchor: { kind: 'attribute', name: 'id', value: 'content-label' } }] }
    ],
    slots: [{ slot_id: 'toolbar-slot', parent_module_id: 'toolbar', name: 'Toolbar slot', intent: 'Add toolbar controls', anchor: { kind: 'attribute', name: 'id', value: 'toolbar-slot' }, allowed_actions: ['add'] }]
  };
  carrierPage.module_contract_hash = computeModuleContractHash(carrierPage);
  const carrierCatalog = { schema_version: 2, retired_page_ids: [], pages: [carrierPage] };
  const carrierDraft = {
    schema_version: 2, bundle_kind: 'carrier',
    frozen_packet: { source_packet_sha256: '1'.repeat(64), applicability_set_sha256: '2'.repeat(64) },
    binding: { page_id: carrierPage.page_id, source_ref: carrierPage.source_ref, source_hash: carrierPage.source_hash, module_contract_hash: carrierPage.module_contract_hash, carrier_profile: 'structural_carrier', actions: [{ action_id: 'C-01', action: 'add', slot_id: 'toolbar-slot' }] }
  };
  const prepared = await validateCarrierBindingDraft(carrierCatalog, carrierDraft, { root });
  assert.equal(prepared.binding_sha256, computeBindingHash({ frozen_packet: carrierDraft.frozen_packet, binding: carrierDraft.binding }));
  assert.equal(prepared.contract.module_contract_hash, carrierPage.module_contract_hash);
  assert.equal(discoverCandidateHints(carrierCatalog, 'carrier records').candidate_hints[0].page_id, 'carrier');
  const manyCarrierPages = Array.from({ length: 4 }, (_, index) => {
    const entry = structuredClone(carrierPage);
    entry.page_id = `carrier-${index + 1}`;
    entry.name = `Carrier ${index + 1}`;
    entry.aliases = ['carrier'];
    entry.module_contract_hash = computeModuleContractHash(entry);
    return entry;
  });
  const boundedHints = discoverCandidateHints({ schema_version: 2, retired_page_ids: [], pages: manyCarrierPages }, 'carrier');
  assert.equal(boundedHints.status, 'CANDIDATE_HINTS');
  assert.equal(boundedHints.ephemeral, true);
  assert.equal(boundedHints.candidate_hints.length, 3, 'phase A emits no more than three non-binding hints');
  const adoption = { actor: 'user', evidence: 'fixture:user confirmed carrier and TAC', confirmed_at: '2026-09-18T12:00:00Z', binding_sha256: prepared.binding_sha256, tac_sha256: '3'.repeat(64), carrier_content_hash: '4'.repeat(64), handoff_bundle_hash: '5'.repeat(64), carrier_profile: 'structural_carrier', output_profile: 'single' };
  assert.equal((await validateCarrierBinding(carrierCatalog, { ...carrierDraft, adoption }, { root })).adoption.output_profile, 'single');
  await assert.rejects(validateCarrierBinding(carrierCatalog, { ...carrierDraft, adoption: { ...adoption, binding_sha256: '0'.repeat(64) } }, { root }), { code: 'STALE_CARRIER_ADOPTION' });
  await assert.rejects(validateCarrierBinding(carrierCatalog, { ...carrierDraft, adoption: { ...adoption, carrier_profile: 'visual_carrier' } }, { root }), { code: 'SCHEMA_INVALID' });
  const overlapDraft = structuredClone(carrierDraft);
  overlapDraft.binding.actions = [{ action_id: 'C-01', action: 'modify', module_id: 'root' }, { action_id: 'C-02', action: 'add', slot_id: 'toolbar-slot' }];
  await assert.rejects(validateCarrierBindingDraft(carrierCatalog, overlapDraft, { root }), { code: 'CARRIER_ACTION_OVERLAP' });
  const aliasLifecycle = structuredClone(carrierCatalog);
  aliasLifecycle.pages[0].lifecycle = 'legacy_fixture';
  aliasLifecycle.pages[0].carrier_eligible = false;
  delete aliasLifecycle.pages[0].module_contract_hash;
  delete aliasLifecycle.pages[0].modules;
  delete aliasLifecycle.pages[0].slots;
  await assert.rejects(validateCarrierBindingDraft(aliasLifecycle, carrierDraft, { root }), { code: 'PAGE_ALIAS_LIFECYCLE' });
  aliasLifecycle.pages[0].aliases = [];
  await assert.rejects(validateCarrierBindingDraft(aliasLifecycle, carrierDraft, { root }), { code: 'CARRIER_LIFECYCLE' });
  await writeFile(join(root, 'framework/carrier-copy.html'), carrierHtml);
  const sourceSwap = structuredClone(carrierCatalog);
  sourceSwap.pages[0].source_ref = 'framework/carrier-copy.html';
  sourceSwap.pages[0].module_contract_hash = computeModuleContractHash(sourceSwap.pages[0]);
  assert.notEqual(sourceSwap.pages[0].module_contract_hash, carrierPage.module_contract_hash, 'source_ref participates in the module contract hash even when bytes match');
  await assert.rejects(validateCarrierBindingDraft(sourceSwap, carrierDraft, { root }), { code: 'STALE_CARRIER_BINDING' });
  const duplicateHtml = carrierHtml.replace('id="content-label"', 'id="toolbar-label"');
  await writeFile(join(root, 'framework/carrier-duplicate.html'), duplicateHtml);
  const duplicateIds = structuredClone(carrierCatalog);
  duplicateIds.pages[0].source_ref = 'framework/carrier-duplicate.html';
  duplicateIds.pages[0].source_hash = createHash('sha256').update(duplicateHtml).digest('hex');
  duplicateIds.pages[0].module_contract_hash = computeModuleContractHash(duplicateIds.pages[0]);
  const duplicateDraft = structuredClone(carrierDraft);
  Object.assign(duplicateDraft.binding, { source_ref: duplicateIds.pages[0].source_ref, source_hash: duplicateIds.pages[0].source_hash, module_contract_hash: duplicateIds.pages[0].module_contract_hash });
  await assert.rejects(validateCarrierBindingDraft(duplicateIds, duplicateDraft, { root }), { code: 'DOM_ID_DUPLICATE' });
  const reusedAnchor = structuredClone(carrierCatalog);
  reusedAnchor.pages[0].slots[0].anchor = structuredClone(reusedAnchor.pages[0].modules[1].anchor);
  reusedAnchor.pages[0].module_contract_hash = computeModuleContractHash(reusedAnchor.pages[0]);
  const reusedDraft = structuredClone(carrierDraft);
  reusedDraft.binding.module_contract_hash = reusedAnchor.pages[0].module_contract_hash;
  await assert.rejects(validateCarrierBindingDraft(reusedAnchor, reusedDraft, { root }), { code: 'REGISTERED_ANCHOR_REUSED' });
  console.log('PASS: v2 carrier contracts bind frozen inputs, source identity, module graph, lifecycle and registered-anchor invariants');
  const treeHtml = '<main id="outer"><section id="group"><h2>Fields</h2><input><hr><div id="child"><span id="leaf">Value</span></div></section><aside id="sibling">Other</aside></main>';
  const treePage = { ...page, page_id: 'tree', source_ref: 'framework/tree.html', source_hash: createHash('sha256').update(treeHtml).digest('hex'), regions: [
    { ...page.regions[0], region_id: 'group', anchor: { kind: 'heading', tag: 'h2', text: 'Fields', ancestor_levels: 1 } },
    { ...page.regions[0], region_id: 'child', parent_id: 'group', anchor: { kind: 'attribute', name: 'id', value: 'child' } },
    { ...page.regions[0], region_id: 'sibling', anchor: { kind: 'attribute', name: 'id', value: 'sibling' } }
  ] };
  await writeFile(join(root, treePage.source_ref), treeHtml);
  const treeCatalog = { schema_version: 2, retired_page_ids: [], pages: [treePage] };
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
  await catalogMutation('schema version', data => { data.schema_version = 1; }, 'SCHEMA_INVALID');
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
