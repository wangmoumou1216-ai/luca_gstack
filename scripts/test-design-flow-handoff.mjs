import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';
import { computeBindingHash, computeModuleContractHash, computeCatalogHash } from './page-context.mjs';
import { canonicalJson, carrierContentHash, resolveAssetClosure } from './carrier-asset-profile.mjs';

const modulePath = process.env.DESIGN_HANDOFF_TEST_MODULE ?? fileURLToPath(new URL('./design-flow-handoff.mjs', import.meta.url));
const api = await import(pathToFileURL(modulePath));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = await mkdtemp(join(tmpdir(), 'design-flow-handoff-'));
const body = '\uFEFF# Generation Packet\r\nR-001：纷享销客 / FxUI 客户数据。\r\nD-007：采用列表；依据=批量核对；否决=自动删除。\r\nSTATE-09：失败保留输入，可撤销；AI 接管先暂停。\r\nP0 / UX-014：已确认；只改筛选，保留详情。\r\nAC-03：拒绝后不执行；N/A：支付，本方案无支付。\r\n';
const source = { mode: 'chain', id: 'generation-packet-1', body };
const target = { tool: 'od', projectId: 'od-test-bound-id' };
const none = { schema_version: 1, status: 'no-match', reference: 'none' };

// Offline raster fixture: real PNG chunks and compressed RGB scanlines, no browser or OD.
function pngFixture(width, height) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length); out.write(type, 4); data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc((width * 3 + 1) * height))), chunk('IEND', Buffer.alloc(0))]);
}
const html = '<!doctype html><main id="records"><section id="filters">Filters</section><section id="rows">Rows</section></main>';
// Legacy reference transport deliberately remains available for a live page
// that is not eligible for the new carrier branch.
const page = { page_id: 'list', name: '列表', aliases: [], intent: '记录管理', scope: 'framework', source_ref: 'framework/list.html', source_hash: hash(html), viewport: { width: 1200, height: 800 }, states: ['default'], lifecycle: 'live', carrier_eligible: false, regions: [{ region_id: 'filters', parent_id: null, name: '筛选区域', aliases: [], intent: '筛选记录', anchor: { kind: 'attribute', name: 'id', value: 'filters' } }] };
const catalog = { schema_version: 2, retired_page_ids: [], pages: [page] };
const png = pngFixture(1200, 800);
const screenshot = { sha256: hash(png), width: 1200, height: 800, source_hash: page.source_hash, viewport: page.viewport };
const preview = { png, manifest: { schema_version: 1, page_id: 'list', source_hash: page.source_hash, viewport: page.viewport, screenshot, regions: [{ region_id: 'filters', bounds: { x: 20, y: 80, width: 1000, height: 120 } }] } };
const selection = { schema_version: 1, status: 'confirmed', page_id: 'list', source_hash: page.source_hash, kind: 'page', confirmation: { actor: 'user', evidence: 'fixture:user-message:7', confirmed_at: '2026-09-05T12:00:00Z' } };
const decisionFor = record => ({ messageRef: record.confirmation.evidence, evidence: record.confirmation.evidence, confirmedAt: record.confirmation.confirmed_at, selection: structuredClone(record), previewSha256: screenshot.sha256 });
const options = { root, catalog, preview, verifiedUserDecision: decisionFor(selection) };

try {
  const importProbe = `
    import { buildDesignHandoff } from ${JSON.stringify(pathToFileURL(modulePath).href)};
    const bundle = await buildDesignHandoff(${JSON.stringify({ source, target, selection: none })});
    console.log(bundle.status);
  `;
  const fileProbe = join(root, 'import-probe.mjs');
  await writeFile(fileProbe, importProbe);
  for (const [name, args, input] of [
    ['stdin', ['--input-type=module', '-'], importProbe],
    ['eval', ['--input-type=module', '-e', importProbe], undefined],
    ['file', [fileProbe], undefined],
    ['non-file launcher', ['--input-type=module', '-e', `process.argv[1] = ${JSON.stringify(join(root, 'missing-launcher'))}; await import(${JSON.stringify(pathToFileURL(modulePath).href)}); console.log('EXPORTED');`], undefined],
  ]) {
    const result = spawnSync(process.execPath, args, { input, encoding: 'utf8' });
    assert.equal(result.status, 0, `library import must support ${name}: ${result.stderr}`);
    assert.equal(result.stdout.trim(), 'EXPORTED', `library import must not execute CLI: ${name}`);
  }
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL('./page-context.mjs', pathToFileURL(modulePath)))], { encoding: 'utf8' });
  assert.equal(cli.status, 1, 'direct CLI keeps its usage failure');
  assert.equal(JSON.parse(cli.stdout).error.code, 'CLI_USAGE');
  console.log('PASS: stdin / eval / file / non-file launcher imports; direct CLI still executes');
  await mkdir(join(root, 'framework'));
  await writeFile(join(root, page.source_ref), html);
  for (const mode of ['chain', 'adhoc', 'ux']) {
    const bundle = await api.buildDesignHandoff({ source: { ...source, mode }, target, selection: none });
    assert.equal(bundle.status, 'EXPORTED');
    assert.equal(bundle.brief, body, 'source decisions, states and legitimate brand names remain verbatim');
    assert.deepEqual(bundle.files.map(file => file.name), ['brief.md', 'page-reference.json']);
    assert.deepEqual(bundle.files[0].bytes, Buffer.from(body), 'source UTF-8 bytes including BOM and CRLF remain unchanged');
    assert.deepEqual(bundle.source, { mode, id: source.id, sha256: hash(Buffer.from(body)) });
    assert.equal(bundle.reference, 'none');
  }
  console.log('PASS: chain / adhoc / UX preserve the original source bytes, decisions and states');
  for (const status of ['no-match', 'declined']) {
    const bundle = await api.buildDesignHandoff({ source, target, selection: { ...none, status } }, { preview: { png: Buffer.from('old page must not leave this process') } });
    assert.deepEqual(bundle.files.map(file => file.name), ['brief.md', 'page-reference.json'], 'no-reference must not attach a rejected or weak candidate');
    assert.deepEqual(JSON.parse(bundle.files[1].bytes), { source: bundle.source, target, status, reference: 'none' }, 'no-reference metadata carries provenance and decision without a page');
  }
  await assert.rejects(api.buildDesignHandoff({ source, target, selection: { schema_version: 1, status: 'pending' } }), { code: 'PENDING_SELECTION' });
  await assert.rejects(api.buildDesignHandoff({ source, target, selection: { ...none, page_id: 'old-candidate' } }), { code: 'REFERENCE_CONFLICT' });
  for (const invalid of [undefined, { ...source, body: '  ' }, { ...source, id: '' }, { ...source, mode: 'recover' }]) {
    await assert.rejects(api.buildDesignHandoff({ source: invalid, target, selection: none }), { code: 'SOURCE_REQUIRED' });
  }
  console.log('PASS: declined / no-match metadata excludes candidates; pending and missing source stop');
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, verifiedUserDecision: { ...decisionFor(selection), messageRef: '' } }), { code: 'USER_DECISION_REQUIRED' }, 'confirmation record alone must not authorize a reference');
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, verifiedUserDecision: undefined }), { code: 'USER_DECISION_REQUIRED' });
  const adopted = await api.buildDesignHandoff({ source, target, selection }, options);
  assert.deepEqual(adopted.files.map(file => file.name), ['brief.md', 'page-reference.json', 'reference.png']);
  assert.equal(adopted.reference.page_id, 'list');
  assert.equal(adopted.reference.usage, 'structure-and-location-only');
  assert.deepEqual(adopted.files[2].bytes, png);
  assert.deepEqual(adopted.reference.location.bounds, { x: 0, y: 0, width: 1200, height: 800 });
  assert.equal(adopted.reference.attachment, 'reference.png');
  assert.equal(adopted.reference.confirmation.evidence, selection.confirmation.evidence);
  for (const badWitness of [
    { ...options.verifiedUserDecision, messageRef: '' },
    { ...options.verifiedUserDecision, confirmedAt: '2026-09-05T13:00:00Z' },
    { ...options.verifiedUserDecision, selection: { ...selection, kind: 'region', region_id: 'filters' } },
    { ...options.verifiedUserDecision, previewSha256: '0'.repeat(64) }
  ]) await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, verifiedUserDecision: badWitness }), { code: 'USER_DECISION_REQUIRED' });
  console.log('PASS: confirmed reference requires a separate caller-checked message and screenshot witness');
  const regionSelection = { ...selection, kind: 'region', region_id: 'filters' };
  const regionBundle = await api.buildDesignHandoff({ source, target, selection: regionSelection }, { ...options, verifiedUserDecision: decisionFor(regionSelection) });
  assert.equal(regionBundle.reference.location.region_id, 'filters');
  assert.match(regionBundle.reference.location.description, /筛选区域/);
  assert.deepEqual(regionBundle.reference.location.bounds, { x: 20, y: 80, width: 1000, height: 120 });
  const boxSelection = { ...selection, kind: 'box', screenshot, selection: { client_x: 150, client_y: 100, width: 200, height: 150, origin_x: 100, origin_y: 50, scale: 0.5, scroll_x: 20, scroll_y: 300 } };
  const boxBundle = await api.buildDesignHandoff({ source, target, selection: boxSelection }, { ...options, verifiedUserDecision: decisionFor(boxSelection) });
  assert.deepEqual(boxBundle.reference.location.bounds, { x: 120, y: 400, width: 400, height: 300 }, 'box reference uses source coordinates after zoom and scroll conversion');
  for (const [record, code] of [
    [{ ...selection, source_hash: '0'.repeat(64) }, 'STALE_SELECTION'],
    [{ ...regionSelection, region_id: 'missing' }, 'UNKNOWN_REGION'],
    [{ ...boxSelection, screenshot: { ...screenshot, sha256: '0'.repeat(64) } }, 'STALE_SCREENSHOT']
  ]) await assert.rejects(api.buildDesignHandoff({ source, target, selection: record }, { ...options, verifiedUserDecision: decisionFor(record) }), { code });
  await assert.rejects(api.buildDesignHandoff({ source, target, selection: regionSelection }, { ...options, preview: { ...preview, manifest: { ...preview.manifest, regions: [] } }, verifiedUserDecision: decisionFor(regionSelection) }), { code: 'LOCATION_REQUIRED' });
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, preview: { ...preview, png: '/local-only/reference.png' } }), { code: 'PNG_REQUIRED' });
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, preview: { ...preview, png: Buffer.from('<html><script>active()</script></html>') } }), { code: 'PNG_REQUIRED' });
  const appendedHtml = Buffer.concat([png, Buffer.from('<script>active()</script>')]);
  const forgedPreview = { png: appendedHtml, manifest: { ...preview.manifest, screenshot: { ...screenshot, sha256: hash(appendedHtml) } } };
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, preview: forgedPreview, verifiedUserDecision: { ...decisionFor(selection), previewSha256: hash(appendedHtml) } }), { code: 'PNG_REQUIRED' }, 'PNG header cannot disguise an appended active document');
  for (const changedManifest of [
    { ...preview.manifest, source_hash: '0'.repeat(64) },
    { ...preview.manifest, page_id: 'wrong-page' },
    { ...preview.manifest, viewport: { width: 390, height: 844 } },
    { ...preview.manifest, screenshot: { ...screenshot, width: 1199 } }
  ]) await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, preview: { png, manifest: changedManifest } }), { code: 'STALE_SCREENSHOT' });
  const wrongSource = structuredClone(catalog);
  wrongSource.pages[0].source_ref = '../outside.html';
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, { ...options, catalog: wrongSource }), { code: 'SOURCE_SCOPE' });
  await writeFile(join(root, page.source_ref), html + '<p>changed</p>');
  await assert.rejects(api.buildDesignHandoff({ source, target, selection }, options), { code: 'SOURCE_HASH' });
  await writeFile(join(root, page.source_ref), html);
  console.log('PASS: regions / converted boxes, safe transport bytes, preview versions and existing source scope guards');
  const grant = { tool: 'od', projectId: target.projectId, write: true, messageRef: 'fixture:user-message:3' };
  assert.deepEqual(api.authorizeStage(adopted, grant), target);
  for (const badGrant of [undefined, { ...grant, write: false }, { ...grant, projectId: 'another-project' }, { ...grant, tool: 'claude-design' }, { ...grant, messageRef: '' }]) {
    assert.throws(() => api.authorizeStage(adopted, badGrant), { code: 'STAGE_NOT_AUTHORIZED' }, 'page confirmation cannot substitute for exact OD write authorization');
  }
  const noPageBundle = await api.buildDesignHandoff({ source, target, selection: none });
  assert.deepEqual(api.authorizeStage(noPageBundle, grant), target, 'no-reference continues under the existing explicit write grant');
  const unbound = await api.buildDesignHandoff({ source, target: { tool: 'od' }, selection: none });
  assert.throws(() => api.authorizeStage(unbound, grant), { code: 'STAGE_NOT_AUTHORIZED' });
  const claude = await api.buildDesignHandoff({ source, target: { tool: 'claude-design' }, selection }, options);
  assert.equal(claude.status, 'EXPORTED');
  assert.equal(claude.brief, adopted.brief);
  assert.deepEqual(claude.files.map(file => file.name), adopted.files.map(file => file.name));
  assert.deepEqual(claude.files[2].bytes, adopted.files[2].bytes);
  assert.throws(() => api.authorizeStage(claude, grant), { code: 'STAGE_NOT_AUTHORIZED' });
  assert.deepEqual(api.recoverTarget(target), target);
  for (const badTarget of [undefined, {}, { tool: 'od' }, { tool: 'od', projectId: '' }, { tool: 'claude-design', projectId: 'cd-id' }]) {
    assert.throws(() => api.recoverTarget(badTarget), { code: 'RECOVER_TARGET_REQUIRED' });
  }
  console.log('PASS: explicit tool / project / write grant; Claude Design export and bound recover stay independent');
  // These receipts simulate the external read boundary for logic tests only.
  // A real STAGED claim requires caller-read OD bytes, never these fixtures.
  const readbackFor = bundle => ({ tool: 'od', projectId: target.projectId, readRef: 'fixture:read:1', files: bundle.files.map(file => ({ name: file.name, bytes: Buffer.from(file.bytes) })) });
  const receipt = readbackFor(adopted);
  const staged = api.verifyReadback(adopted, receipt);
  assert.equal(staged.status, 'STAGED');
  assert.equal(staged.projectId, target.projectId);
  assert.equal(adopted.status, 'EXPORTED', 'readback does not mutate export into a generated design');
  assert.equal(api.verifyReadback(noPageBundle, readbackFor(noPageBundle)).status, 'STAGED');
  assert.throws(() => api.verifyReadback(adopted, { status: 200, ok: true }), { code: 'READBACK_REQUIRED' });
  assert.throws(() => api.verifyReadback(adopted, { ...receipt, projectId: 'another-project' }), { code: 'READBACK_TARGET_MISMATCH' });
  assert.throws(() => api.verifyReadback(adopted, { ...receipt, tool: 'claude-design' }), { code: 'READBACK_TARGET_MISMATCH' });
  for (const name of ['reference.png', 'brief.md', 'page-reference.json']) {
    assert.throws(() => api.verifyReadback(adopted, { ...receipt, files: receipt.files.filter(file => file.name !== name) }), { code: 'READBACK_MISSING_FILE' }, 'missing actual attachment bytes cannot be reported as STAGED');
  }
  for (const name of ['brief.md', 'reference.png', 'page-reference.json']) {
    const wrong = readbackFor(adopted);
    const actual = wrong.files.find(file => file.name === name);
    actual.bytes = Buffer.concat([actual.bytes, Buffer.from('\nchanged')]);
    actual.sha256 = adopted.files.find(file => file.name === name).sha256;
    assert.throws(() => api.verifyReadback(adopted, wrong), { code: 'READBACK_CONTENT_MISMATCH' }, 'readback compares actual bytes rather than trusting declared hashes');
  }
  const localOnly = readbackFor(adopted);
  localOnly.files[2] = { name: 'reference.png', path: '/local/reference.png', sha256: adopted.files[2].sha256 };
  assert.throws(() => api.verifyReadback(adopted, localOnly), { code: 'READBACK_CONTENT_MISMATCH' });
  assert.throws(() => api.verifyReadback(adopted, { ...receipt, files: [...receipt.files, receipt.files[2]] }), { code: 'READBACK_REQUIRED' });
  assert.throws(() => api.verifyReadback(claude, receipt), { code: 'READBACK_TARGET_MISMATCH' });
  const tamperedBundle = { ...adopted, brief: body + 'wrong', source: { ...adopted.source, sha256: hash(body + 'wrong') } };
  assert.throws(() => api.verifyReadback(tamperedBundle, receipt), { code: 'BUNDLE_CHANGED' });
  for (const projectId of ['../other', 'a/b', 'https://od.example/project', ' ', ' padded ', 'UPPER', '-prefix', 'a'.repeat(65)]) {
    const badTarget = { tool: 'od', projectId };
    const badBundle = { ...adopted, target: badTarget };
    await assert.rejects(api.buildDesignHandoff({ source, target: badTarget, selection: none }), { code: 'TARGET_REQUIRED' }, 'OD export accepts only the bound safe project slug');
    assert.throws(() => api.authorizeStage(badBundle, { ...grant, projectId }), { code: 'STAGE_NOT_AUTHORIZED' });
    assert.throws(() => api.verifyReadback(badBundle, { ...receipt, projectId }), { code: 'READBACK_TARGET_MISMATCH' });
    assert.throws(() => api.recoverTarget(badTarget), { code: 'RECOVER_TARGET_REQUIRED' });
  }
  assert.deepEqual(api.recoverTarget({ tool: 'od', projectId: 'a'.repeat(64) }), { tool: 'od', projectId: 'a'.repeat(64) });
  const manualTarget = { tool: 'claude-design', projectId: 'Design Space/Idea v1' };
  assert.deepEqual((await api.buildDesignHandoff({ source, target: manualTarget, selection: none })).target, manualTarget, 'OD slug policy does not rewrite a manual Claude Design identity');
  console.log('PASS: readback checks exact project, complete brief, provenance and every actual attachment byte');

  // V2 carrier fixtures are deliberately isolated from the repository page
  // library.  They exercise the real page-context V2 validator against a
  // temporary, eligible page without writing a framework asset.
  const carrierHtml = Buffer.from('<!doctype html><main id="carrier-root"><section id="carrier-module">before</section><aside id="preserved-module">keep</aside><div id="carrier-slot"></div></main>');
  await writeFile(join(root, 'framework/carrier.html'), carrierHtml);
  const carrierPage = {
    page_id: 'carrier-page', name: 'Carrier page', aliases: [], intent: 'Carrier test', scope: 'framework', source_ref: 'framework/carrier.html', source_hash: hash(carrierHtml), viewport: { width: 1200, height: 800 }, states: ['default'], regions: [], lifecycle: 'live', carrier_eligible: true,
    modules: [
      { module_id: 'carrier-root', parent_module_id: null, name: 'Carrier root', intent: 'Carrier root', anchor: { kind: 'attribute', name: 'id', value: 'carrier-root' }, required: true, allowed_actions: ['modify', 'preserve'], invariants: [{ invariant_id: 'root-stays', name: 'Root remains', anchor: { kind: 'attribute', name: 'id', value: 'carrier-root' } }] },
      { module_id: 'carrier-module', parent_module_id: 'carrier-root', name: 'Carrier module', intent: 'Carrier change', anchor: { kind: 'attribute', name: 'id', value: 'carrier-module' }, required: false, allowed_actions: ['modify', 'remove', 'preserve'], invariants: [{ invariant_id: 'module-stays', name: 'Module remains', anchor: { kind: 'attribute', name: 'id', value: 'carrier-module' } }] },
      { module_id: 'preserved-module', parent_module_id: 'carrier-root', name: 'Preserved module', intent: 'Keep content', anchor: { kind: 'attribute', name: 'id', value: 'preserved-module' }, required: false, allowed_actions: ['preserve'], invariants: [{ invariant_id: 'preserved-stays', name: 'Preserved remains', anchor: { kind: 'attribute', name: 'id', value: 'preserved-module' } }] }
    ],
    slots: [{ slot_id: 'carrier-slot', parent_module_id: 'carrier-root', name: 'Carrier slot', intent: 'Add content', anchor: { kind: 'attribute', name: 'id', value: 'carrier-slot' }, allowed_actions: ['add'] }]
  };
  carrierPage.state_support = [{ state_id: 'default', status: 'supported', reason: 'Fixture default structure is explicitly present', anchors: [carrierPage.modules[0].anchor], target_ids: [...carrierPage.modules.map(item => item.module_id), ...carrierPage.slots.map(item => item.slot_id)] }];
  carrierPage.module_contract_hash = computeModuleContractHash(carrierPage);
  const carrierCatalog = { schema_version: 2, retired_page_ids: [], pages: [carrierPage] };
  const packetDocument = { schema_version: 1, packet_kind: 'design-generation', items: [{ source_kind: 'decision', id: 'D-001', text: 'D-001: change the module.' }], scopes: [] };
  const carrierSource = { mode: 'chain', id: 'carrier-packet-1', body: api.createCarrierPacket(packetDocument) };
  const applicability = api.inspectCarrierPacket(carrierSource.body).applicability;
  const frozen = { source_packet_sha256: hash(Buffer.from(carrierSource.body)), applicability_set_sha256: hash(Buffer.from(canonicalJson(applicability))) };
  const binding = { page_id: carrierPage.page_id, source_ref: carrierPage.source_ref, source_hash: carrierPage.source_hash, module_contract_hash: carrierPage.module_contract_hash, carrier_profile: 'structural_carrier', actions: [{ action_id: 'C-01', action: 'modify', module_id: 'carrier-module' }, { action_id: 'C-02', action: 'preserve', module_id: 'preserved-module' }] };
  const assessmentFor = (actions, facts = packetDocument.items, frozenPacket = frozen) => ({ schema_version: 1, catalog_sha256: computeCatalogHash(carrierCatalog), frozen_packet: frozenPacket, decision: 'carrier', reason: 'Explicit offline fixture mapping, not model semantic proof', reviewed_fact_ids: facts.map(item => item.id), candidate_evidence: [{ page_id: carrierPage.page_id, disposition: 'selected', reason: 'Single isolated fixture candidate' }], judgments: facts.flatMap(fact => actions.map(action => {
    const targetId = action.module_id ?? action.slot_id;
    const target = [...carrierPage.modules, ...carrierPage.slots].find(item => (item.module_id ?? item.slot_id) === targetId);
    return { fact_id: fact.id, excerpt: fact.text, page_id: carrierPage.page_id, state_id: 'default', target_id: targetId, action_id: action.action_id, purpose_excerpt: carrierPage.intent, target_excerpt: target.intent, purpose_evidence: 'Fixture fact maps to this page', location_evidence: 'Fixture target is the intended exact region', alternative_target_ids: [], confidence: 'high' };
  })) });
  binding.match_assessment = assessmentFor(binding.actions);
  const draftRecord = { schema_version: 2, bundle_kind: 'carrier', frozen_packet: frozen, binding };
  const carrierHash = carrierContentHash(resolveAssetClosure({ baseTemplate: carrierHtml }), carrierPage.module_contract_hash);
  const tac = { template: { page_id: carrierPage.page_id, module_contract_hash: carrierPage.module_contract_hash, carrier_content_hash: carrierHash }, source_packet_sha256: frozen.source_packet_sha256, applicability_set_sha256: frozen.applicability_set_sha256, applicability_set: applicability, changes: [{ change_id: 'C-01', action: 'modify', module_id: 'carrier-module', source_projections: applicability }, { change_id: 'C-02', action: 'preserve', module_id: 'preserved-module', invariants: ['preserved-stays'] }], coverage: [{ ...applicability[0], disposition: { kind: 'change', change_id: 'C-01' } }], output: { entry: 'output/index.html', base_must_remain_unchanged: true } };
  const tacBytes = Buffer.from(canonicalJson(tac), 'utf8');
  const pageReferenceBytes = Buffer.from(canonicalJson({ page_id: carrierPage.page_id, source_hash: carrierPage.source_hash, source_packet_sha256: frozen.source_packet_sha256 }), 'utf8');
  const prepareArgs = { source: carrierSource, target, handoffId: 'carrier-handoff-1', carrierBinding: draftRecord, baseTemplate: carrierHtml, tacJson: tacBytes, tacMarkdown: api.renderTacMarkdown(tac, carrierSource.body), pageReference: pageReferenceBytes };
  const carrierBundle = await api.prepareCarrierHandoff(prepareArgs, { root, catalog: carrierCatalog });
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, source: { ...carrierSource, body: '# Legacy prose\nD-001: change\n' } }, { root, catalog: carrierCatalog }), { code: 'PACKET_REFREEZE_REQUIRED' }, 'unstructured carrier Packet must be explicitly refrozen');
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, tacMarkdown: '# TAC\nRemove the navigation instead.' }, { root, catalog: carrierCatalog }), { code: 'TAC_MARKDOWN_MISMATCH' }, 'contradictory readable TAC cannot bypass the exact projection');
  const injectedTac = structuredClone(tac);
  injectedTac.changes[0].implementation_instruction = 'Add an unrequested public export-all-customers button.';
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, tacJson: canonicalJson(injectedTac), tacMarkdown: api.renderTacMarkdown(injectedTac, carrierSource.body) }, { root, catalog: carrierCatalog }), { code: 'TAC_FIELDS_INVALID' }, 'a matching Markdown projection cannot authorize extra TAC instruction fields');
  for (const locate of [value => value, value => value.template, value => value.changes[1], value => value.changes[0].source_projections[0], value => value.applicability_set[0], value => value.coverage[0], value => value.coverage[0].disposition, value => value.output]) {
    const extraField = structuredClone(tac);
    locate(extraField).implementation_instruction = 'Undeclared instruction';
    await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, tacJson: canonicalJson(extraField), tacMarkdown: api.renderTacMarkdown(extraField, carrierSource.body) }, { root, catalog: carrierCatalog }), { code: 'TAC_FIELDS_INVALID' }, 'every TAC object is a closed projection shape');
  }
  const conflictingHashes = { ...tac, carrier_content_hash: carrierHash, template: { ...tac.template, carrier_content_hash: '0'.repeat(64) } };
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, tacJson: canonicalJson(conflictingHashes), tacMarkdown: api.renderTacMarkdown(conflictingHashes, carrierSource.body) }, { root, catalog: carrierCatalog }), { code: 'TAC_STALE' }, 'two supported carrier hash positions cannot contradict each other');
  const topLevelHash = { ...tac, carrier_content_hash: carrierHash, template: { page_id: tac.template.page_id, module_contract_hash: tac.template.module_contract_hash } };
  assert.equal((await api.prepareCarrierHandoff({ ...prepareArgs, tacJson: canonicalJson(topLevelHash), tacMarkdown: api.renderTacMarkdown(topLevelHash, carrierSource.body) }, { root, catalog: carrierCatalog })).status, 'EXPORTED', 'top-level carrier hash compatibility remains supported');
  const fakeApplicability = [{ source_kind: 'decision', id: 'D-999', packet_span_hash: hash('invented source') }];
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, tacJson: canonicalJson({ ...tac, applicability_set: fakeApplicability }) }, { root, catalog: carrierCatalog }), { code: 'TAC_APPLICABILITY_INVALID' }, 'invented source ID and span must be rejected');
  const completeDoc = { ...packetDocument, items: [...packetDocument.items, { source_kind: 'state', id: 'STATE-002', text: 'Empty results keep the clearing action available.' }] };
  const completeBody = api.createCarrierPacket(completeDoc);
  const completePacket = api.inspectCarrierPacket(completeBody);
  const reducedFrozen = { source_packet_sha256: completePacket.source_packet_sha256, applicability_set_sha256: frozen.applicability_set_sha256 };
  // Bypass only the unrelated draft gate to isolate the handoff's own denominator guard.
  await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, source: { ...carrierSource, body: completeBody }, tacJson: canonicalJson({ ...tac, source_packet_sha256: reducedFrozen.source_packet_sha256 }) }, { root, catalog: carrierCatalog, validateCarrierBindingDraft: async () => ({ ...carrierBundle.binding_draft, frozen_packet: reducedFrozen }) }), { code: 'TAC_APPLICABILITY_INVALID' }, 'caller cannot shrink applicability by omitting a real frozen state');
  for (const kind of ['non_template_effect', 'out_of_scope']) {
    const scopedDoc = { ...completeDoc, scopes: [{ scope_id: 'SCOPE-1', kind, text: 'Explicit freeze decision: this state is handled outside the carrier.', source_ids: ['STATE-002'], ...(kind === 'out_of_scope' ? { confirmation_ref: 'fixture:user-scope-approval' } : {}) }] };
    const scopedBody = api.createCarrierPacket(scopedDoc);
    const inspected = api.inspectCarrierPacket(scopedBody);
    const scopedFrozen = { source_packet_sha256: inspected.source_packet_sha256, applicability_set_sha256: inspected.applicability_set_sha256 };
    const assessment = assessmentFor(binding.actions, scopedDoc.items, scopedFrozen);
    assessment.judgments = assessment.judgments.filter(item => item.fact_id !== 'STATE-002');
    const scopedDraft = { ...draftRecord, frozen_packet: scopedFrozen, binding: { ...binding, match_assessment: assessment } };
    const scope = inspected.scopes[0];
    const scopedTac = { ...tac, ...scopedFrozen, applicability_set: inspected.applicability, coverage: [...tac.coverage, { ...inspected.applicability[1], disposition: { kind, scope_span_hash: scope.scope_span_hash, ...(kind === 'out_of_scope' ? { confirmation_ref: scope.confirmation_ref } : {}) } }] };
    const scopedArgs = { ...prepareArgs, source: { ...carrierSource, body: scopedBody }, carrierBinding: scopedDraft, tacJson: canonicalJson(scopedTac), tacMarkdown: api.renderTacMarkdown(scopedTac, scopedBody), pageReference: canonicalJson({ page_id: carrierPage.page_id, source_hash: carrierPage.source_hash, source_packet_sha256: scopedFrozen.source_packet_sha256 }) };
    const accepted = await api.prepareCarrierHandoff(scopedArgs, { root, catalog: carrierCatalog });
    assert.equal(accepted.status, 'EXPORTED', 'real frozen scope decisions remain expressible without shrinking the denominator');
    const counterfeit = { ...scopedTac, coverage: [scopedTac.coverage[0], { ...scopedTac.coverage[1], disposition: { ...scopedTac.coverage[1].disposition, scope_span_hash: hash('fake scope') } }] };
    await assert.rejects(api.prepareCarrierHandoff({ ...scopedArgs, tacJson: canonicalJson(counterfeit), tacMarkdown: api.renderTacMarkdown(counterfeit, scopedBody) }, { root, catalog: carrierCatalog }), { code: 'TAC_SCOPE_INVALID' }, 'scope basis must come from the actual frozen Packet');
    const incompleteScopedTac = { ...scopedTac, coverage: scopedTac.coverage.slice(0, 1) };
    await assert.rejects(api.prepareCarrierHandoff({ ...scopedArgs, tacJson: canonicalJson(incompleteScopedTac), tacMarkdown: api.renderTacMarkdown(incompleteScopedTac, scopedBody) }, { root, catalog: carrierCatalog }), { code: 'TAC_COVERAGE_INVALID' }, 'scoped applicable facts cannot disappear from coverage');
    const excludedButProjected = { ...scopedTac, changes: [{ ...scopedTac.changes[0], source_projections: inspected.applicability }, scopedTac.changes[1]] };
    // Keep the mapping internally consistent to isolate scope-vs-projection,
    // rather than letting the independent assessment-pair guard kill this mutant.
    const scopeConflictAssessment = { ...assessment, judgments: [...assessment.judgments, ...assessmentFor(binding.actions, scopedDoc.items, scopedFrozen).judgments.filter(item => item.fact_id === 'STATE-002' && item.action_id === 'C-01')] };
    const scopeConflictArgs = { ...scopedArgs, carrierBinding: { ...scopedDraft, binding: { ...scopedDraft.binding, match_assessment: scopeConflictAssessment } } };
    await assert.rejects(api.prepareCarrierHandoff({ ...scopeConflictArgs, tacJson: canonicalJson(excludedButProjected), tacMarkdown: api.renderTacMarkdown(excludedButProjected, scopedBody) }, { root, catalog: carrierCatalog }), { code: 'TAC_TRACE_COVERAGE_CONFLICT' }, 'excluded facts cannot simultaneously authorize a modifying projection');
    const scopeOverridden = { ...excludedButProjected, coverage: scopedTac.coverage.map(row => ({ ...row, disposition: { kind: 'change', change_id: 'C-01' } })) };
    await assert.rejects(api.prepareCarrierHandoff({ ...scopeConflictArgs, tacJson: canonicalJson(scopeOverridden), tacMarkdown: api.renderTacMarkdown(scopeOverridden, scopedBody) }, { root, catalog: carrierCatalog }), { code: 'TAC_SCOPE_CONFLICT' }, 'TAC change coverage cannot override an explicit frozen scope exclusion');
    assert.throws(() => api.createCarrierPacket({ ...scopedDoc, scopes: [...scopedDoc.scopes, { ...scopedDoc.scopes[0], scope_id: 'SCOPE-2', kind: kind === 'out_of_scope' ? 'non_template_effect' : 'out_of_scope', confirmation_ref: 'fixture:conflicting-scope-approval' }] }), { code: 'PACKET_SCOPE_CONFLICT' }, 'a frozen fact cannot have multiple contradictory scope decisions');
  }
  await assert.rejects(api.prepareCarrierHandoff({ source: carrierSource, target, handoffId: 'carrier-bad-coverage', carrierBinding: draftRecord, baseTemplate: carrierHtml, tacJson: Buffer.from(canonicalJson({ ...tac, coverage: [] })), tacMarkdown: api.renderTacMarkdown({ ...tac, coverage: [] }, carrierSource.body), pageReference: pageReferenceBytes }, { root, catalog: carrierCatalog }), { code: 'TAC_COVERAGE_INVALID' }, 'TAC cannot omit an applicability disposition');
  assert.equal(carrierBundle.status, 'EXPORTED');
  assert.equal(carrierBundle.manifest.input_root, 'input');
  assert.equal(carrierBundle.manifest.output_root, 'output');
  assert.notEqual(carrierBundle.manifest.input_root, carrierBundle.manifest.output_root);
  assert.equal(carrierBundle.carrier_output_profile, 'single');
  assert.equal(carrierBundle.manifest.carrier_profile, 'structural_carrier');
  assert.deepEqual(carrierBundle.files.map(item => item.path), ['input/base-template.html', 'control/brief.md', 'control/template-adaptation.json', 'control/template-adaptation.md', 'control/module-contract.json', 'control/carrier-binding.json', 'control/page-reference.json', 'control/handoff-manifest.json']);
  assert.throws(() => api.authorizeCarrierStage(carrierBundle, {}), { code: 'CARRIER_STAGE_NOT_AUTHORIZED' }, 'export does not imply a write grant');
  const bindingSha256 = computeBindingHash({ frozen_packet: frozen, binding });
  const finalRecord = { ...draftRecord, adoption: { actor: 'user', evidence: 'fixture:user-carrier-confirmation', confirmed_at: '2026-09-18T10:00:00Z', binding_sha256: bindingSha256, tac_sha256: hash(tacBytes), carrier_content_hash: carrierBundle.carrier_content_hash, handoff_bundle_hash: carrierBundle.handoff_bundle_hash, carrier_profile: 'structural_carrier', output_profile: 'single' } };
  await assert.rejects(api.confirmCarrierBundle(carrierBundle, { ...finalRecord, adoption: { ...finalRecord.adoption, handoff_bundle_hash: '0'.repeat(64) } }, { root, catalog: carrierCatalog }), { code: 'CARRIER_ADOPTION_STALE' }, 'a stale adoption cannot approve a different bundle');
  const confirmedCarrier = await api.confirmCarrierBundle(carrierBundle, finalRecord, { root, catalog: carrierCatalog });
  const callerRuntime = { runtime: 'codex' };
  const capability = (operations, bundle = carrierBundle) => ({ version: 1, kind: 'od-handoff-capability', status: 'PASS', runtime: 'codex', receipt_ref: `fixture:capability:${operations.join('-')}`, tool: 'od', project_id: target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', operations });
  const carrierGrant = { tool: 'od', projectId: target.projectId, handoff_id: carrierBundle.handoff_id, namespace: carrierBundle.namespace, handoff_bundle_hash: carrierBundle.handoff_bundle_hash, output_profile: 'single', stage: true, messageRef: 'fixture:user-stage-grant', capabilityReceipt: capability(['stage']) };
  const { confirmation: _removedConfirmation, ...unconfirmedCarrier } = confirmedCarrier;
  assert.throws(() => api.authorizeCarrierStage(unconfirmedCarrier, carrierGrant, callerRuntime), { code: 'CARRIER_STAGE_NOT_AUTHORIZED' }, 'removing the confirmation cannot turn an adopted carrier back into an authorizable draft');
  for (const confirmation of [
    { ...confirmedCarrier.confirmation, actor: 'agent' },
    { ...confirmedCarrier.confirmation, evidence: '' },
    { ...confirmedCarrier.confirmation, confirmed_at: 'not-a-date' },
    { ...confirmedCarrier.confirmation, tac_sha256: '0'.repeat(64) },
    { ...confirmedCarrier.confirmation, handoff_bundle_hash: '0'.repeat(64) }
  ]) assert.throws(() => api.authorizeCarrierStage({ ...confirmedCarrier, confirmation }, carrierGrant, callerRuntime), { code: 'CARRIER_ADOPTION_STALE' }, 'authorization must revalidate the exact user adoption instead of trusting a mutable confirmation cache');
  assert.deepEqual(api.authorizeCarrierStage(confirmedCarrier, carrierGrant, callerRuntime).scope, ['stage']);
  assert.throws(() => api.authorizeCarrierStage(confirmedCarrier, { ...carrierGrant, capabilityReceipt: undefined }, callerRuntime), { code: 'OD_CAPABILITY_RECEIPT_REQUIRED' }, 'Codex cannot stage without a caller/runtime success receipt');
  assert.throws(() => api.authorizeCarrierStage(confirmedCarrier, { ...carrierGrant, capabilityReceipt: { ...capability(['stage']), runtime: 'claude' } }, callerRuntime), { code: 'OD_CAPABILITY_RECEIPT_REQUIRED' }, 'Codex cannot reuse a Claude runtime receipt');
  assert.throws(() => api.authorizeCarrierStage(confirmedCarrier, { ...carrierGrant, namespace: 'handoffs/other' }, callerRuntime), { code: 'CARRIER_STAGE_NOT_AUTHORIZED' }, 'grant binds the exact namespace');
  assert.throws(() => api.authorizeCarrierStage(confirmedCarrier, { ...carrierGrant, handoff_bundle_hash: '0'.repeat(64) }, callerRuntime), { code: 'CARRIER_STAGE_NOT_AUTHORIZED' }, 'grant binds the exact bundle hash');
  const preInventory = [{ path: 'existing/readme.txt', bytes: Buffer.from('unchanged') }];
  const stagedFiles = confirmedCarrier.files.map(item => ({ path: `${confirmedCarrier.namespace}/${item.path}`, bytes: Buffer.from(item.bytes) }));
  const postStageInventory = [...preInventory, ...stagedFiles];
  assert.throws(() => api.verifyCarrierReadback(confirmedCarrier, { tool: 'od', projectId: target.projectId, namespace: confirmedCarrier.namespace, readRef: 'fixture:stage-read', files: [...stagedFiles, { path: `${confirmedCarrier.namespace}/output/index.html`, bytes: Buffer.from('premature') }], pre_inventory: preInventory, post_inventory: [...postStageInventory, { path: `${confirmedCarrier.namespace}/output/index.html`, bytes: Buffer.from('premature') }] }), error => ['PROJECT_INVENTORY_CHANGED', 'READBACK_EXTRA_FILE'].includes(error?.code), 'input/output overlap or pre-existing output blocks STAGED');
  const stagedCarrier = api.verifyCarrierReadback(confirmedCarrier, { tool: 'od', projectId: target.projectId, namespace: confirmedCarrier.namespace, readRef: 'fixture:stage-read', files: stagedFiles, pre_inventory: preInventory, post_inventory: postStageInventory });
  assert.equal(stagedCarrier.status, 'STAGED', 'readback is only STAGED, never a generated claim');
  assert.throws(() => api.authorizeCarrierRun(unconfirmedCarrier, stagedCarrier, { ...carrierGrant, stage: undefined, run: true, prompt_hash: hash(Buffer.from('fixture prompt')), messageRef: 'fixture:user-run-grant', capabilityReceipt: capability(['run']) }, callerRuntime), { code: 'CARRIER_ADOPTION_STALE' }, 'later operation authorization must still require the exact adoption');
  assert.throws(() => api.authorizeCarrierRun(confirmedCarrier, stagedCarrier, carrierGrant, callerRuntime), { code: 'CARRIER_RUN_NOT_AUTHORIZED' }, 'stage grant never implies run');
  const runAuthorization = api.authorizeCarrierRun(confirmedCarrier, stagedCarrier, { ...carrierGrant, stage: undefined, run: true, prompt_hash: hash(Buffer.from('fixture prompt')), messageRef: 'fixture:user-run-grant', capabilityReceipt: capability(['run']) }, callerRuntime);
  assert.equal(runAuthorization.status, 'OD_RUN_AUTHORIZED');
  const derivative = Buffer.from('<!doctype html><main id="carrier-root"><section id="carrier-module">after</section><aside id="preserved-module">keep</aside><div id="carrier-slot"></div></main>');
  const outputFile = { path: `${confirmedCarrier.namespace}/output/index.html`, bytes: derivative };
  const mechanical_verification = { module_traces: [{ change_id: 'C-01', source_keys: [`decision:D-001:${applicability[0].packet_span_hash}`], status: 'PASS' }], preserve_invariants: [{ module_id: 'preserved-module', invariant_id: 'preserved-stays', status: 'PASS' }] };
  const outputReadback = { tool: 'od', projectId: target.projectId, namespace: confirmedCarrier.namespace, readRef: 'fixture:output-read', files: [...stagedFiles, outputFile], post_inventory: [...postStageInventory, outputFile], mechanical_verification };
  const recoverGrant = { ...carrierGrant, stage: undefined, recover: true, messageRef: 'fixture:user-recover-grant', capabilityReceipt: capability(['recover']) };
  assert.throws(() => api.authorizeCarrierRecover(confirmedCarrier, stagedCarrier, recoverGrant, callerRuntime), { code: 'CARRIER_RECOVER_NOT_AUTHORIZED' }, 'plain STAGED cannot authorize recovery');
  const reportedCarrier = api.reportCarrierGeneration(stagedCarrier, { messageRef: 'fixture:user-generation-report' });
  const recoverAuthorization = api.authorizeCarrierRecover(confirmedCarrier, reportedCarrier, recoverGrant, callerRuntime);
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, outputReadback), { code: 'CARRIER_RECOVER_NOT_AUTHORIZED' }, 'output bytes cannot be observed before recover authorization');
  const observedCarrier = api.observeCarrierOutput(confirmedCarrier, reportedCarrier, outputReadback, recoverAuthorization);
  assert.equal(observedCarrier.status, 'GENERATED_OBSERVED');
  assert.equal(observedCarrier.provenance, 'output_observed_only', 'a file observation does not overclaim OD causality');
  assert.throws(() => api.recoverCarrierOutput(confirmedCarrier, observedCarrier), { code: 'CARRIER_RECOVER_NOT_AUTHORIZED' }, 'stage authorization never implies recover');
  const recovery = api.recoverCarrierOutput(confirmedCarrier, observedCarrier, recoverAuthorization);
  assert.equal(recovery.status, 'RECOVERED');
  assert.equal(recovery.semantic_acceptance, 'PENDING_INDEPENDENT_REVIEW');
  const withOutput = (bytes, extra = {}) => {
    const file = { ...outputFile, bytes: Buffer.from(bytes) };
    return { ...outputReadback, files: [...stagedFiles, file], post_inventory: [...postStageInventory, file], ...extra };
  };
  const observe = (bytes, extra) => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, withOutput(bytes, extra), recoverAuthorization);
  const headlessRecover = api.authorizeCarrierRecover(confirmedCarrier, runAuthorization, recoverGrant, callerRuntime);
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, runAuthorization, withOutput(derivative, { run: { run_id: 'fixture-run', handoff_id: confirmedCarrier.handoff_id, prompt_hash: runAuthorization.prompt_hash, status: 'canceled' } }), headlessRecover), { code: 'RUN_RECEIPT_MISMATCH' }, 'canceled headless run cannot be recovered');
  assert.equal(api.observeCarrierOutput(confirmedCarrier, runAuthorization, withOutput(derivative, { run: { run_id: 'fixture-run', handoff_id: confirmedCarrier.handoff_id, prompt_hash: runAuthorization.prompt_hash, status: 'succeeded' } }), headlessRecover).provenance, 'od_run_observed');
  for (const leakedResource of [
    '<table background="https://example.invalid/leak.png"><tbody><tr><td>x</td></tr></tbody></table>',
    '<input type="image" src="https://example.invalid/leak.png">',
    '<input type="im&#97;ge" src="https://example.invalid/leak.png">',
    '<video poster="https://example.invalid/leak.png"></video>',
    '<link rel="preload" as="image" href="data:image/png;base64,AA==" imagesrcset="https://example.invalid/leak.png 1x">',
    '<meta http-equiv="re&#102;resh" content="0;url=https://example.invalid/escape">',
    '<meta http-equiv=" refresh " content="0;url=https://example.invalid/escape">',
    '<span style="background-image:image-set(&quot;assets/missing.png&quot; 1x)">x</span>',
    '<span style="background-image:u&#114;l(&quot;assets/missing.png&quot;)">x</span>',
    '<span style="background-image:u&#114l(assets/missing.png)">x</span>'
  ]) assert.throws(() => observe(derivative.toString().replace('>after</section>', `>after${leakedResource}</section>`)), error => ['REMOTE_URL_FORBIDDEN', 'CSS_UNSUPPORTED', 'ASSET_MISSING', 'HTML_UNSUPPORTED_SYNTAX', 'SRCSET_UNSUPPORTED'].includes(error?.code), 'generated carrier output cannot bypass the explicit asset closure through legacy or encoded resource syntax');
  assert.throws(() => observe(carrierHtml.toString() + '\n<!-- generated -->'), { code: 'MODULE_ACTION_NO_CHANGE' }, 'comment or whitespace alone cannot satisfy a modify action');
  assert.throws(() => observe('<!-- ' + derivative.toString() + ' -->'), { code: 'MODULE_ANCHOR_INVALID' }, 'comment-only anchors are not real DOM nodes');
  for (const tag of ['figure', 'details', 'figcaption']) {
    const escapedParagraph = derivative.toString().replace('<section id="carrier-module">after</section>', `<p id="carrier-module">after<${tag}>Escaping content</${tag}></p>`);
    assert.throws(() => observe(escapedParagraph), { code: 'CARRIER_DOM_UNSUPPORTED' }, 'paragraph auto-close cannot escape an authorized target in a real browser');
    await assert.rejects(api.prepareCarrierHandoff({ ...prepareArgs, baseTemplate: Buffer.from(escapedParagraph) }, { root, catalog: carrierCatalog }), { code: 'CARRIER_DOM_UNSUPPORTED' }, 'unsupported source DOM must be rejected before carrier export');
  }
  for (const malformed of [
    derivative.toString().replace('</section>', ''),
    derivative.toString().replace('>after</section>', '><p>after<div>browser repairs this</div></p></section>'),
    derivative.toString().replace('>after</section>', '><table><tr><td>implicit tbody</td></tr></table></section>'),
    derivative.toString().replace('>after</section>', '><template><b>inert fake tree</b></template></section>'),
    derivative.toString().replace('>after</section>', '><script>"<p id=preserved-module>fake</p>"</script></section>'),
    derivative.toString().replace('id="carrier-module"', 'id="carrier-module" id="duplicate"'),
    derivative.toString().replace('>after</section>', '><head><div>browser reparents this</div></head></section>'),
    derivative.toString().replace('>after</section>', '><select><div>browser drops this</div></select></section>')
  ]) assert.throws(() => observe(malformed), error => ['CARRIER_DOM_UNSUPPORTED', 'ACTIVE_CONTENT_FORBIDDEN', 'HTML_UNSUPPORTED_SYNTAX'].includes(error.code), 'unsupported HTML error recovery and inert/active trees fail closed');
  assert.throws(() => observe(derivative.toString().replace('</main>', '<p>Unrequested content</p></main>')), { code: 'UNAUTHORIZED_STRUCTURE_CHANGE' }, 'unrequested structure outside authorized targets must not change');
  assert.throws(() => observe(derivative, { post_inventory: postStageInventory }), { code: 'READBACK_INVENTORY_MISMATCH' }, 'output bytes must be present in the complete post-inventory');
  assert.throws(() => observe(derivative, { post_inventory: [...postStageInventory, { ...outputFile, bytes: Buffer.from('different bytes') }] }), { code: 'READBACK_INVENTORY_MISMATCH' }, 'output bytes must equal the complete post-inventory bytes');
  assert.equal(observe(derivative.toString().replace('<main ', '<main class="new-tool-style" style="color:red" ')).status, 'GENERATED_OBSERVED', 'structural carrier permits target-tool visual style changes');
  for (const property of ['tac_contract', 'carrier_contract', 'binding_draft']) {
    const mutated = { ...confirmedCarrier, [property]: structuredClone(confirmedCarrier[property]) };
    if (property === 'tac_contract') mutated[property].changes.pop();
    else if (property === 'carrier_contract') mutated[property].modules.pop();
    else mutated[property].binding.actions.pop();
    assert.throws(() => api.observeCarrierOutput(mutated, reportedCarrier, outputReadback, recoverAuthorization), { code: 'CARRIER_BUNDLE_CHANGED' }, 'mutable verification contracts must stay bound to immutable bytes');
  }
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, { ...outputReadback, mechanical_verification: { ...mechanical_verification, preserve_invariants: [] } }, recoverAuthorization), { code: 'PRESERVE_INVARIANT_FAILED' }, 'mechanical PASS requires all preserve invariants');
  const changedPreserve = { ...outputFile, bytes: Buffer.from(derivative.toString('utf8').replace('>keep</aside>', '>changed</aside>')) };
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, { ...outputReadback, files: [...stagedFiles, changedPreserve], post_inventory: [...postStageInventory, changedPreserve] }, recoverAuthorization), { code: 'PRESERVE_DOM_CHANGED' }, 'preserve requires canonical DOM identity, not anchor presence alone');
  const extraOutput = { path: `${confirmedCarrier.namespace}/output/unexpected.txt`, bytes: Buffer.from('evidence stays; no deletion') };
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, { ...outputReadback, files: [...outputReadback.files, extraOutput], post_inventory: [...outputReadback.post_inventory, extraOutput] }, recoverAuthorization), { code: 'OUTPUT_EXTRA_FILE' }, 'single profile rejects extra output without deleting evidence');
  const baseOutput = { path: `${confirmedCarrier.namespace}/output/index.html`, bytes: Buffer.from(carrierHtml) };
  assert.throws(() => api.observeCarrierOutput(confirmedCarrier, reportedCarrier, { ...outputReadback, files: [...stagedFiles, baseOutput], post_inventory: [...postStageInventory, baseOutput] }, recoverAuthorization), { code: 'OUTPUT_BASE_MASQUERADE' }, 'base renamed or copied as output is not a derivative');
  const staleBundle = { ...confirmedCarrier, files: confirmedCarrier.files.map(item => ({ ...item, bytes: Buffer.from(item.bytes) })) };
  staleBundle.files.find(item => item.path === 'control/template-adaptation.json').bytes[0] ^= 1;
  assert.throws(() => api.authorizeCarrierStage(staleBundle, carrierGrant, callerRuntime), { code: 'CARRIER_BUNDLE_CHANGED' }, 'TAC/file mutation invalidates prior confirmation and stage authority');
  // Independent action variants exercise actual insertion/removal with preserve.
  for (const action of ['add', 'remove']) {
    const actions = [{ action_id: 'C-01', action, ...(action === 'add' ? { slot_id: 'carrier-slot' } : { module_id: 'carrier-module' }) }, binding.actions[1]];
    const variantBinding = { ...binding, actions, match_assessment: assessmentFor(actions) };
    const variantDraft = { ...draftRecord, binding: variantBinding };
    const variantTac = { ...tac, changes: [{ change_id: 'C-01', action, ...(action === 'add' ? { slot_id: 'carrier-slot' } : { module_id: 'carrier-module' }), source_projections: applicability }, tac.changes[1]] };
    const exported = await api.prepareCarrierHandoff({ ...prepareArgs, handoffId: `carrier-${action}`, carrierBinding: variantDraft, tacJson: canonicalJson(variantTac), tacMarkdown: api.renderTacMarkdown(variantTac, carrierSource.body) }, { root, catalog: carrierCatalog });
    const variant = await api.confirmCarrierBundle(exported, { ...variantDraft, adoption: { ...finalRecord.adoption, binding_sha256: exported.binding_sha256, tac_sha256: exported.manifest.tac_sha256, handoff_bundle_hash: exported.handoff_bundle_hash } }, { root, catalog: carrierCatalog });
    const files = variant.files.map(item => ({ path: `${variant.namespace}/${item.path}`, bytes: item.bytes }));
    const staged = api.verifyCarrierReadback(variant, { ...target, namespace: variant.namespace, readRef: 'fixture:variant-stage', pre_inventory: [], post_inventory: files, files });
    const reported = api.reportCarrierGeneration(staged, { messageRef: 'fixture:variant-generation-report' });
    const variantGrant = { ...recoverGrant, handoff_id: variant.handoff_id, namespace: variant.namespace, handoff_bundle_hash: variant.handoff_bundle_hash, capabilityReceipt: { ...capability(['recover']), handoff_id: variant.handoff_id, namespace: variant.namespace, handoff_bundle_hash: variant.handoff_bundle_hash } };
    const auth = api.authorizeCarrierRecover(variant, reported, variantGrant, callerRuntime);
    const check = bytes => {
      const output = { path: `${variant.namespace}/output/index.html`, bytes: Buffer.from(bytes) };
      return api.observeCarrierOutput(variant, reported, { ...target, namespace: variant.namespace, readRef: 'fixture:variant-read', files: [...files, output], post_inventory: [...files, output], mechanical_verification }, auth);
    };
    if (action === 'add') {
      const added = carrierHtml.toString().replace('<div id="carrier-slot"></div>', '<div id="carrier-slot"><button>New filter</button></div>');
      assert.equal(check(added).status, 'GENERATED_OBSERVED');
      assert.throws(() => check(carrierHtml.toString().replace('</main>', '<button>Wrong location</button></main>')), { code: 'MODULE_ACTION_NO_CHANGE' }, 'add must produce new content inside its registered slot');
      assert.throws(() => check(added.replace('id="carrier-slot"', 'id="carrier-slot" aria-label="changed container"')), { code: 'ADD_SLOT_VIOLATION' }, 'add cannot modify its slot container');
      assert.throws(() => check(added.replace('>before</section>', '>destructive unrelated edit</section>')), { code: 'UNAUTHORIZED_STRUCTURE_CHANGE' }, 'valid slot insertion cannot mask an unrelated destructive edit');
    } else {
      const removed = carrierHtml.toString().replace('<section id="carrier-module">before</section>', '');
      assert.equal(check(removed).status, 'GENERATED_OBSERVED', 'remove plus preserve must remain a valid derivative');
      assert.throws(() => check(removed.replace('>keep</aside>', '>changed</aside>')), { code: 'PRESERVE_DOM_CHANGED' });
    }
  }
  const pairedDoc = { ...packetDocument, items: [...packetDocument.items, { source_kind: 'decision', id: 'D-002', text: 'Add a filter inside the slot.' }] };
  const pairedBody = api.createCarrierPacket(pairedDoc);
  const pairedPacket = api.inspectCarrierPacket(pairedBody);
  const pairedFrozen = { source_packet_sha256: pairedPacket.source_packet_sha256, applicability_set_sha256: pairedPacket.applicability_set_sha256 };
  const pairedActions = [binding.actions[0], { action_id: 'C-03', action: 'add', slot_id: 'carrier-slot' }];
  const pairedAssessment = assessmentFor(pairedActions, pairedDoc.items, pairedFrozen);
  pairedAssessment.judgments = pairedAssessment.judgments.filter(item => (item.fact_id === 'D-001' && item.action_id === 'C-01') || (item.fact_id === 'D-002' && item.action_id === 'C-03'));
  const pairedDraft = { ...draftRecord, frozen_packet: pairedFrozen, binding: { ...binding, actions: pairedActions, match_assessment: pairedAssessment } };
  const pairedTac = { ...tac, ...pairedFrozen, applicability_set: pairedPacket.applicability, changes: pairedActions.map((action, index) => ({ change_id: action.action_id, action: action.action, ...(action.module_id ? { module_id: action.module_id } : { slot_id: action.slot_id }), source_projections: [pairedPacket.applicability[index]] })), coverage: pairedPacket.applicability.map((item, index) => ({ ...item, disposition: { kind: 'change', change_id: pairedActions[index].action_id } })) };
  const pairedArgs = { ...prepareArgs, source: { ...carrierSource, body: pairedBody }, carrierBinding: pairedDraft, tacJson: canonicalJson(pairedTac), tacMarkdown: api.renderTacMarkdown(pairedTac, pairedBody), pageReference: canonicalJson({ page_id: carrierPage.page_id, source_hash: carrierPage.source_hash, source_packet_sha256: pairedFrozen.source_packet_sha256 }) };
  assert.equal((await api.prepareCarrierHandoff(pairedArgs, { root, catalog: carrierCatalog })).status, 'EXPORTED', 'two distinct fact/action mappings are supported');
  const swappedTac = { ...pairedTac, changes: pairedTac.changes.map((change, index) => ({ ...change, source_projections: [pairedPacket.applicability[1 - index]] })), coverage: pairedTac.coverage.map((row, index) => ({ ...row, disposition: { kind: 'change', change_id: pairedActions[1 - index].action_id } })) };
  await assert.rejects(api.prepareCarrierHandoff({ ...pairedArgs, tacJson: canonicalJson(swappedTac), tacMarkdown: api.renderTacMarkdown(swappedTac, pairedBody) }, { root, catalog: carrierCatalog }), { code: 'TAC_MATCH_ASSESSMENT_CONFLICT' }, 'TAC cannot swap fact/action mappings after match assessment');
  const keepDoc = { ...packetDocument, items: [...packetDocument.items, { source_kind: 'constraint', id: 'KEEP-001', text: 'Keep the preserved module content unchanged.' }] };
  const keepBody = api.createCarrierPacket(keepDoc);
  const keepPacket = api.inspectCarrierPacket(keepBody);
  const keepFrozen = { source_packet_sha256: keepPacket.source_packet_sha256, applicability_set_sha256: keepPacket.applicability_set_sha256 };
  const keepAssessment = assessmentFor(binding.actions, keepDoc.items, keepFrozen);
  keepAssessment.judgments = keepAssessment.judgments.filter(item => (item.fact_id === 'D-001' && item.action_id === 'C-01') || (item.fact_id === 'KEEP-001' && item.action_id === 'C-02'));
  const keepDraft = { ...draftRecord, frozen_packet: keepFrozen, binding: { ...binding, match_assessment: keepAssessment } };
  const keepTac = { ...tac, ...keepFrozen, applicability_set: keepPacket.applicability, changes: [tac.changes[0], { ...tac.changes[1], source_projections: [keepPacket.applicability[1]] }], coverage: [...tac.coverage, { ...keepPacket.applicability[1], disposition: { kind: 'change', change_id: 'C-02' } }] };
  const keepArgs = { ...prepareArgs, source: { ...carrierSource, body: keepBody }, carrierBinding: keepDraft, tacJson: canonicalJson(keepTac), tacMarkdown: api.renderTacMarkdown(keepTac, keepBody), pageReference: canonicalJson({ page_id: carrierPage.page_id, source_hash: carrierPage.source_hash, source_packet_sha256: keepFrozen.source_packet_sha256 }) };
  assert.equal((await api.prepareCarrierHandoff(keepArgs, { root, catalog: carrierCatalog })).status, 'EXPORTED', 'an explicit KEEP fact can close coverage through its assessed preserve action');
  const referenceOnly = await api.buildReferenceOnlyHandoff({ source, target, selection: none, handoffId: 'reference-handoff-1' });
  assert.equal(referenceOnly.bundle_kind, 'reference_only');
  assert.equal(referenceOnly.derivation, 'not-template-derived');
  assert.equal('carrier_content_hash' in referenceOnly, false);
  assert.ok(referenceOnly.files.every(item => !item.path.startsWith('input/') && !item.path.includes('template-adaptation')), 'reference-only transport has an independent control namespace and no carrier/TAC tree');
  const referenceGrant = { tool: 'od', projectId: target.projectId, handoff_id: referenceOnly.handoff_id, namespace: referenceOnly.namespace, handoff_bundle_hash: referenceOnly.handoff_bundle_hash, output_profile: 'single', stage: true, messageRef: 'fixture:reference-stage', capabilityReceipt: capability(['stage'], referenceOnly) };
  assert.deepEqual(api.authorizeReferenceStage(referenceOnly, referenceGrant, callerRuntime).scope, ['stage']);
  const referenceFiles = referenceOnly.files.map(item => ({ path: `${referenceOnly.namespace}/${item.path}`, bytes: Buffer.from(item.bytes) }));
  const referencePost = [...preInventory, ...referenceFiles];
  const stagedReference = api.verifyReferenceReadback(referenceOnly, { tool: 'od', projectId: target.projectId, namespace: referenceOnly.namespace, readRef: 'fixture:reference-stage-read', files: referenceFiles, pre_inventory: preInventory, post_inventory: referencePost });
  const referenceOutput = { path: `${referenceOnly.namespace}/output/index.html`, bytes: Buffer.from('<!doctype html><main>independent design</main>') };
  const referenceRecoverGrant = { ...referenceGrant, stage: undefined, recover: true, messageRef: 'fixture:reference-recover', capabilityReceipt: capability(['recover'], referenceOnly) };
  const referenceRecoverAuthorization = api.authorizeReferenceRecover(referenceOnly, stagedReference, referenceRecoverGrant, callerRuntime);
  const referenceReadback = { tool: 'od', projectId: target.projectId, namespace: referenceOnly.namespace, readRef: 'fixture:reference-output-read', files: [...referenceFiles, referenceOutput], post_inventory: [...referencePost, referenceOutput] };
  assert.throws(() => api.observeReferenceOutput(referenceOnly, stagedReference, referenceReadback), { code: 'REFERENCE_RECOVER_NOT_AUTHORIZED' }, 'reference output bytes cannot be observed before recover authorization');
  const observedReference = api.observeReferenceOutput(referenceOnly, stagedReference, referenceReadback, referenceRecoverAuthorization);
  const recoveredReference = api.recoverReferenceOutput(referenceOnly, observedReference, referenceRecoverAuthorization);
  assert.equal(recoveredReference.derivation, 'not-template-derived');
  assert.equal(['carrier_content_hash', 'module_contract_hash', 'tac_sha256', 'carrier_profile'].some(key => key in recoveredReference), false, 'reference-only recovery never acquires carrier/TAC semantics');
  console.log('PASS: V2 carrier namespace/hash/TAC/adoption/readback/recovery gates and reference-only separation');
  if (process.argv.includes('--mutation')) {
    const mutantRoot = join(root, 'mutants');
    const mutantScripts = join(mutantRoot, 'scripts');
    await mkdir(mutantScripts, { recursive: true });
    await mkdir(join(mutantRoot, '.claude/skill-os/page-library'), { recursive: true });
    // Copy the real selection dependency unchanged; only the new handoff guard is mutated.
    await writeFile(join(mutantScripts, 'page-context.mjs'), await readFile(new URL('./page-context.mjs', import.meta.url)));
    await writeFile(join(mutantScripts, 'carrier-asset-profile.mjs'), await readFile(new URL('./carrier-asset-profile.mjs', import.meta.url)));
    await writeFile(join(mutantScripts, 'carrier-packet.mjs'), await readFile(new URL('./carrier-packet.mjs', import.meta.url)));
    await writeFile(join(mutantScripts, 'carrier-dom.mjs'), await readFile(new URL('./carrier-dom.mjs', import.meta.url)));
    await writeFile(join(mutantRoot, '.claude/skill-os/page-library/schema.json'), await readFile(new URL('../.claude/skill-os/page-library/schema.json', import.meta.url)));
    const original = await readFile(modulePath, 'utf8');
    const mutantModule = join(mutantScripts, 'design-flow-handoff.mjs');
    const witnessGuard = original.split('\n').find(line => line.includes("fail('USER_DECISION_REQUIRED'"));
    const missingGuard = original.split('\n').find(line => line.includes("if (!actual) fail('READBACK_MISSING_FILE'"));
    const mutations = [
      ['caller confirmation guard', witnessGuard, '', 'confirmation record alone must not authorize a reference'],
      ['no-reference attachment exclusion', "if (validated.status === 'confirmed') bundle.files.push", 'if (preview?.png) bundle.files.push', 'no-reference must not attach a rejected or weak candidate'],
      ['V2 exact bundle-hash authorization', 'grant.handoff_bundle_hash !== bundle.handoff_bundle_hash', 'false', 'grant binds the exact bundle hash'],
      ['runtime capability receipt', 'return capabilityFor(bundle, grant.capabilityReceipt, operation, runtime);', "return { runtime: 'codex', receipt_ref: 'mutant' };", 'Codex cannot stage without a caller/runtime success receipt'],
      ['TAC applicability coverage', "if (covered.size !== applicable.size) fail('TAC_COVERAGE_INVALID', 'Coverage must close the complete applicability set');", '', 'scoped applicable facts cannot disappear from coverage'],
      ['preserve invariant recovery', "if (!isDeepStrictEqual(actualInvariants, normalizedInvariants)) fail('PRESERVE_INVARIANT_FAILED', 'Every declared preserve invariant must have one exact PASS result');", '', 'mechanical PASS requires all preserve invariants'],
      ['unauthorized DOM boundary', original.split('\n').find(line => line.includes("if (!isDeepStrictEqual(structuralDom(baseHtml, beforeMasks)")), '', 'unrequested structure outside authorized targets must not change'],
      ['deterministic TAC projection', original.split('\n').find(line => line.includes("if (!markdown.equals(Buffer.from(renderTacMarkdown")), '', 'contradictory readable TAC cannot bypass the exact projection'],
      ['TAC closed fields', '  assertTacFields(tac);', '', 'a matching Markdown projection cannot authorize extra TAC instruction fields'],
      ['compatible carrier hash positions', original.split('\n').find(line => line.includes("if (Object.hasOwn(tac, 'carrier_content_hash')")), '', 'two supported carrier hash positions cannot contradict each other'],
      ['assessed fact/action projection identity', original.split('\n').find(line => line.includes("if (!isDeepStrictEqual(projectedPairs, assessedPairs))")), '', 'TAC cannot swap fact/action mappings after match assessment'],
      ['scope original evidence', original.split('\n').find(line => line.includes("if (disposition.kind !== 'change' &&")), '', 'scope basis must come from the actual frozen Packet'],
      ['scope exclusion cannot authorize modification', original.split('\n').find(line => line.includes("if (disposition?.kind !== 'change' || disposition.change_id !== changeId)")), '', 'excluded facts cannot simultaneously authorize a modifying projection'],
      ['frozen scope cannot be overridden', original.split('\n').find(line => line.includes("if (packet.scopes.some(scope => scope.source_ids.includes(row.id)))")), '', 'TAC change coverage cannot override an explicit frozen scope exclusion'],
      ['actual target change', original.split('\n').find(line => line.includes("if (isDeepStrictEqual(original, generated))")), '', 'comment or whitespace alone cannot satisfy a modify action'],
      ['readback inventory cross-check', '  assertReadbackInventory(namespaceFiles, after);', '', 'output bytes must be present in the complete post-inventory'],
      ['immutable verification cache binding', original.split('\n').find(line => line.includes("if (pageContext.computeModuleContractHash(contract)")), '', 'mutable verification contracts must stay bound to immutable bytes'],
      ['missing attachment readback', missingGuard, '    if (!actual) continue;', 'missing actual attachment bytes cannot be reported as STAGED']
    ];
    const runSuite = () => spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { encoding: 'utf8', env: { ...process.env, DESIGN_HANDOFF_TEST_MODULE: mutantModule } });
    for (const [name, guard, replacement, diagnostic] of mutations) {
      assert.ok(guard, `mutation target exists: ${name}`);
      assert.equal(original.split(guard).length, 2, `mutation target is unique: ${name}`);
      await writeFile(mutantModule, original);
      const before = runSuite();
      assert.equal(before.status, 0, `baseline public suite: ${before.stderr}`);
      await writeFile(mutantModule, original.replace(guard, replacement));
      const defeated = runSuite();
      assert.equal(defeated.status, 1, `guard mutation must fail the same public suite: ${name}`);
      assert.ok(defeated.stderr.includes('AssertionError') && defeated.stderr.includes(diagnostic), `mutation must reach its exact public assertion: ${name}\n${defeated.stderr}`);
      assert.ok(defeated.stderr.includes('Missing expected') || defeated.stderr.includes("operator: 'deepStrictEqual'"), `mutation must expose accepted bad behavior, not an unrelated runtime exception: ${name}\n${defeated.stderr}`);
      await writeFile(mutantModule, original);
      const restored = runSuite();
      assert.equal(restored.status, 0, `restored public suite: ${restored.stderr}`);
      console.log(`PASS mutation: ${name} -> ${diagnostic} FAIL -> restored PASS`);
    }
    const packetPath = join(mutantScripts, 'carrier-packet.mjs');
    const packetOriginal = await readFile(packetPath, 'utf8');
    const scopeGuard = packetOriginal.split('\n').find(line => line.includes("if (scopedFactIds.has(id))"));
    assert.equal(packetOriginal.split(scopeGuard).length, 2, 'unique Packet scope conflict mutation target');
    assert.equal(runSuite().status, 0, 'Packet scope conflict mutation baseline');
    await writeFile(packetPath, packetOriginal.replace(scopeGuard, ''));
    const conflictedScope = runSuite();
    assert.equal(conflictedScope.status, 1, 'competing scope mutation must fail the public suite');
    assert.match(conflictedScope.stderr, /Missing expected exception: a frozen fact cannot have multiple contradictory scope decisions/);
    await writeFile(packetPath, packetOriginal);
    assert.equal(runSuite().status, 0, 'restored Packet scope conflict suite');
    console.log('PASS mutation: competing Packet scopes -> accepted contradictory fact scope FAIL -> restored PASS');
    const domPath = join(mutantScripts, 'carrier-dom.mjs');
    const domOriginal = await readFile(domPath, 'utf8');
    const paragraphGuard = domOriginal.split('\n').find(line => line.includes("if (!paragraphContent.has(tag)"));
    assert.equal(domOriginal.split(paragraphGuard).length, 2, 'unique paragraph whitelist mutation target');
    assert.equal(runSuite().status, 0, 'paragraph whitelist mutation baseline');
    await writeFile(domPath, domOriginal.replace(paragraphGuard, ''));
    const escapedParagraph = runSuite();
    assert.equal(escapedParagraph.status, 1, 'paragraph auto-close mutation must fail the public suite');
    assert.match(escapedParagraph.stderr, /Missing expected exception: paragraph auto-close cannot escape an authorized target in a real browser/);
    await writeFile(domPath, domOriginal);
    assert.equal(runSuite().status, 0, 'restored paragraph whitelist suite');
    console.log('PASS mutation: paragraph auto-close -> accepted target escape FAIL -> restored PASS');
    const dependencyPath = join(mutantScripts, 'page-context.mjs');
    const dependency = await readFile(dependencyPath, 'utf8');
    const entryCheck = 'if (entryPath === fileURLToPath(import.meta.url)) {';
    assert.equal(dependency.split(entryCheck).length, 2, 'unique library entry-point mutation target');
    assert.equal(runSuite().status, 0, 'library entry-point mutation baseline');
    await writeFile(dependencyPath, dependency.replace(entryCheck, 'if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {'));
    const brokenImport = runSuite();
    assert.equal(brokenImport.status, 1, 'old entry-point check must fail the public suite');
    assert.match(brokenImport.stderr, /library import must support stdin/);
    assert.match(brokenImport.stderr, /ENOENT/);
    await writeFile(dependencyPath, dependency);
    assert.equal(runSuite().status, 0, 'restored library entry-point suite');
    console.log('PASS mutation: old entry-point check -> stdin import FAIL -> restored PASS');
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
