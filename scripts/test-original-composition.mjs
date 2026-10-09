import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { canonicalJson, sha256Bytes as hash } from './carrier-asset-profile.mjs';
import { createCarrierPacket } from './carrier-packet.mjs';
import { locateOriginalEditRanges, verifyOriginalEditedOutput } from './original-template-edits.mjs';
import { appendBoundBehavior, prepareBehaviorBindings } from './original-composition.mjs';
import { prepareOriginalCopyHandoff, confirmOriginalCopyHandoff, verifyOriginalStage, authorizeOriginalOperation, recoverOriginalOutput } from './original-copy-handoff.mjs';
import { loadCatalog, computeCatalogHash, computeDesignSourceRevision, validateAdaptationDraft } from './page-context.mjs';
import { locateOriginalNode } from './original-template-index.mjs';

// NO_PIN framework fixture. Real registered original; synthetic business modules
// and simulated OD transport/authority. No external service or real grant used.
const base = await readFile(new URL('../.claude/skill-os/page-library/sources/originals/crm-workbench-home.html', import.meta.url));
assert.equal(hash(base), '7a30a15978929ede4177e213f1090cb4d3860e5b2ef33509434cfff7879631e5');
const executionProfile = 'original-composition-v1';
const common = { scope: [], confidence: 'high', rationale: 'Exact registered original fixture location.', alternatives: [] };
const action = (id, kind, target, source_ids) => ({ ...common, action_id: id, action: kind, locator: { kind: 'attribute', name: 'id', value: target }, source_ids });
const navIds = Array.from({ length: 6 }, (_, i) => `NAV-${i + 1}`);
const actions = [action('NAV', 'add', 'crmMenuList', navIds), action('MOUNT', 'add', 'workspaceCard', ['STATE-RETAIN', 'KEYBOARD']), action('VIS', 'refine', 'activeTab', ['VISUAL']), action('KEEP', 'preserve', 'agentPanel', ['ORIGINAL-NAV'])];
const packetBody = createCarrierPacket({ schema_version: 1, packet_kind: 'design-generation', items: [...navIds, 'STATE-RETAIN', 'KEYBOARD', 'VISUAL', 'ORIGINAL-NAV'].map(id => ({ source_kind: 'decision', id, text: `Synthetic framework acceptance ${id}; preserve other original behavior.` })), scopes: [] });
const bridge = Buffer.from(`(() => {
  const menu = document.getElementById('crmMenuList');
  const mount = document.getElementById('workspaceCard');
  const group = document.getElementById('fixture-workspaces');
  const original = [...mount.children].filter(node => node !== group);
  menu.addEventListener('click', event => {
    const button = event.target.closest('.crm-menu-item');
    if (!button) return;
    group.hidden = !button.dataset.fixtureRoute;
    original.forEach(node => { node.hidden = !group.hidden; });
    group.querySelectorAll('[data-fixture-panel]').forEach(panel => {
      panel.hidden = panel.dataset.fixturePanel !== button.dataset.fixtureRoute;
    });
  });
  group.addEventListener('click', event => {
    if (event.target.matches('[data-fixture-increment]')) {
      const output = event.target.nextElementSibling;
      output.textContent = String(Number(output.textContent) + 1);
    }
  });
})();`);
const binding = { id: 'fixture-bridge', source_ids: [...navIds, 'STATE-RETAIN', 'KEYBOARD'], source_ref: 'scripts/test-original-composition.mjs: synthetic source and integration fixture, not product code', mount_action_id: 'MOUNT', acceptance_ids: [...navIds, 'STATE-RETAIN', 'KEYBOARD', 'ORIGINAL-NAV'], bytes: bridge };
const behaviorBindings = [binding];
const browser = await chromium.launch({ headless: true });
try {
  const catalog = await loadCatalog(), page = catalog.pages.find(p => p.page_id === 'crm-workbench-home');
  const sourceItems = [{ id: 'DRAFT-NAV', text: 'Add six business modules to this original.', required_states: ['fixture-extension'] }, { id: 'DRAFT-VIS', text: 'Refine the existing title without changing its behavior.', required_states: [page.states[0]] }];
  const judgments = [];
  for (const [index, target] of ['MOUNT', 'VIS'].entries()) {
    const act = actions.find(a => a.action_id === target), source = sourceItems[index];
    const located = await locateOriginalNode(base, { source_sha256: hash(base), scope: act.scope, locator: act.locator }, { browser });
    judgments.push({ source_id: source.id, excerpt: source.text, state_id: source.required_states[0], action: act.action, location: { scope: act.scope, locator: act.locator, label: located.node.label }, purpose_excerpt: page.intent, location_evidence: 'Actual original unique location.', state_evidence: index ? 'Existing title state retained.' : 'Explicitly planned fixture integration; code and behavior acceptance still pending.', state_status: index ? 'supported' : 'extension', confidence: 'high', alternatives: [] });
  }
  const draft = { schema_version: 1, mode: 'adaptation_draft', source_revision_sha256: computeDesignSourceRevision(sourceItems), catalog_sha256: computeCatalogHash(catalog), page_id: page.page_id, source_hash: page.source_hash, execution_profile: executionProfile, decision: 'ready', reason: 'Source-bound planned composition, not executable authority.', reviewed_source_ids: sourceItems.map(s => s.id), judgments };
  const ready = await validateAdaptationDraft(catalog, draft, { sourceItems, browser });
  assert.equal(ready.status, 'ADAPTATION_READY'); assert.equal(ready.execution_allowed, false); assert.equal(ready.binding_allowed, false);
  assert.equal(ready.behavior_acceptance, 'PENDING_SOURCE_BINDING_AND_REVIEW');
  const { execution_profile, ...legacyDraft } = draft;
  await assert.rejects(validateAdaptationDraft(catalog, legacyDraft, { sourceItems, browser }), { code: 'ORIGINAL_REFINEMENT_PROFILE' });
  for (const [change, code] of [[d => { d.judgments[0].state_status = 'unknown'; }, 'MATCH_AMBIGUOUS'], [d => { d.judgments[0].confidence = 'uncertain'; }, 'MATCH_AMBIGUOUS'], [d => { d.judgments.pop(); }, 'ADAPTATION_SOURCE_COVERAGE'], [d => { d.source_hash = '0'.repeat(64); }, 'STALE_ADAPTATION_TEMPLATE']]) {
    const changed = structuredClone(draft); change(changed);
    await assert.rejects(validateAdaptationDraft(catalog, changed, { sourceItems, browser }), { code });
  }
  console.log('PASS composition draft: mixed actions/planned extension, all sources/states retained, unknowns rejected, execution stays false');
  const locations = (await locateOriginalEditRanges(base, actions.map(({ action_id, action, scope, locator }) => ({ action_id, action, scope, locator })), { browser, executionProfile })).targets;
  const nav = navIds.map((_, i) => `<li><button type="button" class="crm-menu-item" data-menu="Fixture ${i + 1}" data-fixture-route="${i + 1}">Fixture ${i + 1}</button></li>`).join('');
  const panels = `<div id="fixture-workspaces" hidden>${navIds.map((_, i) => `<section data-fixture-panel="${i + 1}" hidden><h2>Module ${i + 1}</h2><input aria-label="Field ${i + 1}"><button type="button" data-fixture-increment>Increment</button><output>0</output></section>`).join('')}</div>`;
  const vis = locations.find(r => r.action_id === 'VIS');
  const visual = base.toString().slice(vis.start, vis.end).replace('id="activeTab"', 'id="activeTab" style="padding:12px"');
  const edits = [{ action_id: 'NAV', html: nav }, { action_id: 'MOUNT', html: panels }, { action_id: 'VIS', html: visual }];
  const build = chosen => {
    let text = base.toString();
    for (const edit of [...chosen].sort((a, b) => locations.find(r => r.action_id === b.action_id).start - locations.find(r => r.action_id === a.action_id).start)) {
      const range = locations.find(r => r.action_id === edit.action_id), refine = edit.action_id === 'VIS';
      const from = refine ? range.start : range.closeStart, to = refine ? range.end : range.closeStart;
      text = text.slice(0, from) + edit.html + text.slice(to);
    }
    return Buffer.from(text);
  };
  const structural = build(edits), output = appendBoundBehavior(structural, behaviorBindings);
  const plainActions = actions.map(({ action_id, action, scope, locator }) => ({ action_id, action, scope, locator }));
  const verify = (candidate = output, extra = {}) => verifyOriginalEditedOutput({ base, output: candidate, actions: plainActions, edits, executionProfile, behaviorBindings, ...extra }, { browser });
  const validation = await verify();
  assert.equal(validation.profile, executionProfile);
  assert.equal(validation.original_scripts_styles_preserved, true);
  assert.equal(validation.source_executed, false);
  assert.equal(validation.behavior_acceptance, 'PENDING_INDEPENDENT_REVIEW');
  await assert.rejects(verify(output, { executionProfile: undefined }), { code: 'ORIGINAL_PROFILE_INVALID' });
  await assert.rejects(verify(output, { behaviorBindings: undefined }), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  await assert.rejects(verify(Buffer.from(output.toString().replace('Number(output.textContent) + 1', 'Number(output.textContent) + 2'))), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  await assert.rejects(verify(Buffer.from(output.toString().replace('const STORAGE_KEY =', 'const CHANGED_STORAGE_KEY ='))), { code: 'ORIGINAL_OUTSIDE_EDIT_CHANGED' });
  await assert.rejects(verify(Buffer.from(output.toString().replace('</body>', '<script>window.unbound=true</script></body>'))), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  for (const fragment of ['<button onclick="window.unbound=true">Bad</button>', '<script>window.unbound=true</script>']) {
    const unsafe = edits.map(e => e.action_id === 'MOUNT' ? { ...e, html: fragment } : e);
    await assert.rejects(verify(appendBoundBehavior(build(unsafe), behaviorBindings), { edits: unsafe }), { code: 'ACTIVE_CONTENT_FORBIDDEN' });
  }
  const external = edits.map(e => e.action_id === 'MOUNT' ? { ...e, html: '<img src="https://example.invalid/asset.png">' } : e);
  await assert.rejects(verify(appendBoundBehavior(build(external), behaviorBindings), { edits: external }), { code: 'ORIGINAL_ASSETS_REQUIRED' });
  const paragraph = Buffer.from('<html><body><p id="edit">Before</p><aside>Keep</aside></body></html>');
  const paragraphAction = [{ action_id: 'MOUNT', action: 'modify', scope: [], locator: { kind: 'attribute', name: 'id', value: 'edit' } }];
  await assert.rejects(verifyOriginalEditedOutput({ base: paragraph, output: appendBoundBehavior(Buffer.from(paragraph.toString().replace('Before', '<figure>escape</figure>')), behaviorBindings), actions: paragraphAction, edits: [{ action_id: 'MOUNT', html: '<figure>escape</figure>' }], executionProfile, behaviorBindings }, { browser }), { code: 'ORIGINAL_DOM_SCOPE_VIOLATION' });
  for (const bytes of [Buffer.from('import("https://example.invalid/module.js")'), Buffer.from('import x from "./module.js"'), Buffer.from('"</script>"'), Buffer.from('const = invalid')]) assert.throws(() => prepareBehaviorBindings([{ ...binding, bytes }]), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  assert.throws(() => prepareBehaviorBindings([{ ...binding, mount_action_id: 'UNKNOWN' }], { actions }), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  assert.throws(() => prepareBehaviorBindings([{ ...binding, source_ids: ['UNKNOWN'] }], { factIds: navIds }), { code: 'ORIGINAL_BEHAVIOR_INVALID' });

  const args = { pageId: 'crm-workbench-home', packetBody, target: { tool: 'od', projectId: 'composition-fixture' }, handoffId: 'six-menu-fixture', actions, executionProfile, behaviorBindings };
  const bundle = await prepareOriginalCopyHandoff(args, { browser });
  assert.equal(bundle.carrier_profile, executionProfile);
  const manifest = JSON.parse(bundle.files.at(-1).bytes);
  // The generated tool sees the transported contract, not our local helper
  // implementation. Guard the missing instructions independently of DOM tests.
  const contract = JSON.parse(bundle.files.find(f => f.path === 'control/original-adaptation.json').bytes);
  for (const required of [/add appends edit\.html inside/, /modify replaces only its inner HTML/, /remove deletes the whole target node and requires empty edit\.html/, /preserve has no edit/, /refine uses the complete target outerHTML/, /only meaningful valid class\/style/, /Each non-preserve action needs exactly one/]) assert.match(contract.output.policy, required);
  const readableContract = bundle.files.find(f => f.path === 'control/original-adaptation.md').bytes.toString();
  assert.equal(JSON.parse(readableContract.match(/```json\n([\s\S]*?)\n```/)[1]).output.policy, contract.output.policy, 'Readable transported contract must carry the same complete instructions');
  assert.equal(bundle.files.find(f => f.path === 'input/behavior/fixture-bridge.js').sha256, hash(bridge));
  await assert.rejects(prepareOriginalCopyHandoff({ ...args, executionProfile: 'invented-profile' }, { browser }), { code: 'ORIGINAL_PROFILE_INVALID' });
  await assert.rejects(prepareOriginalCopyHandoff({ ...args, behaviorBindings: [{ ...binding, source_ids: ['UNKNOWN'] }] }, { browser }), { code: 'ORIGINAL_BEHAVIOR_INVALID' });
  const confirmed = confirmOriginalCopyHandoff(bundle, { actor: 'user', evidence: 'SIMULATED fixture-only; not real authority', confirmed_at: '2026-10-09T00:00:00Z', handoff_bundle_hash: bundle.handoff_bundle_hash, original_sha256: hash(base), tac_sha256: manifest.tac_sha256 });
  const files = bundle.files.map(f => ({ path: `${bundle.namespace}/${f.path}`, bytes: f.bytes }));
  const staged = verifyOriginalStage(confirmed, { tool: 'od', projectId: bundle.target.projectId, namespace: bundle.namespace, readRef: 'SIMULATED fixture readback', files, pre_inventory: [], post_inventory: files });
  const extra = [{ path: `${bundle.namespace}/output/index.html`, bytes: output }, { path: `${bundle.namespace}/output/implementation-manifest.json`, bytes: Buffer.from(canonicalJson({ schema_version: 1, edits })) }];
  for (const runtime of ['codex', 'claude']) {
    const capabilityReceipt = { version: 1, kind: 'od-handoff-capability', status: 'PASS', runtime, receipt_ref: 'SIMULATED fixture', tool: 'od', project_id: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', operations: ['stage', 'run', 'recover'] };
    const grant = { tool: 'od', projectId: bundle.target.projectId, handoff_id: bundle.handoff_id, namespace: bundle.namespace, handoff_bundle_hash: bundle.handoff_bundle_hash, output_profile: 'single', messageRef: 'SIMULATED fixture', capabilityReceipt };
    const run = authorizeOriginalOperation(confirmed, { ...grant, run: true, prompt_hash: hash(Buffer.from('fixture prompt')) }, 'run', { runtime, staged });
    const recovery = authorizeOriginalOperation(confirmed, { ...grant, recover: true }, 'recover', { runtime, staged: run });
    const readback = { tool: 'od', projectId: bundle.target.projectId, namespace: bundle.namespace, readRef: 'SIMULATED generated bytes', files: [...files, ...extra], post_inventory: [...files, ...extra], run: { run_id: `fixture-${runtime}`, handoff_id: bundle.handoff_id, prompt_hash: run.prompt_hash, status: 'succeeded' } };
    const recovered = await recoverOriginalOutput(confirmed, run, readback, recovery, { browser });
    assert.equal(recovered.mechanical_validation.profile, executionProfile);
    assert.equal(recovered.semantic_acceptance, 'PENDING_INDEPENDENT_REVIEW');
    await assert.rejects(recoverOriginalOutput(confirmed, run, { ...readback, run: { ...readback.run, status: 'canceled' } }, recovery, { browser }), { code: 'ORIGINAL_RUN_NOT_SUCCEEDED' });
    await assert.rejects(recoverOriginalOutput(confirmed, run, { ...readback, files: readback.files.filter(f => !f.path.endsWith('/input/behavior/fixture-bridge.js')) }, recovery, { browser }));
    console.log(`PASS simulated ${runtime} composition prepare/stage/run/recover integrity; no live OD or native consent claim`);
  }

  const drive = async (html, task) => {
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
    const requests = [], errors = [];
    await context.route('**/*', route => {
      if (route.request().url() === 'http://composition-fixture.test/') return route.fulfill({ contentType: 'text/html', body: html });
      requests.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    context.on('page', p => { if (p !== page) errors.push('unexpected popup'); });
    try { await page.goto('http://composition-fixture.test/'); await task(page); assert.deepEqual(requests, []); assert.deepEqual(errors, []); }
    finally { await context.close(); }
  };
  const selected = async (page, id) => {
    await page.locator(`[data-fixture-route="${id}"]`).click();
    assert.equal(await page.locator(`[data-fixture-panel="${id}"]`).isVisible(), true, `NAV-${id}`);
    assert.equal(await page.locator('[data-fixture-panel]:visible').count(), 1);
  };
  await drive(output, async page => {
    const originalMenu = page.locator('.crm-menu-item').filter({ hasNot: page.locator('[data-fixture-route]') }).first();
    const originalName = await originalMenu.getAttribute('data-menu');
    assert.equal(await page.locator('#activeTab').textContent(), originalName);
    for (let id = 1; id <= 6; id++) { await selected(page, id); console.log(`PASS NAV-${id}: click -> exactly one matching panel visible`); }
    await selected(page, 1);
    await page.getByRole('textbox', { name: 'Field 1', exact: true }).fill('retained value');
    await page.locator('[data-fixture-panel="1"] button').click();
    await selected(page, 6); await selected(page, 1);
    assert.equal(await page.getByRole('textbox', { name: 'Field 1', exact: true }).inputValue(), 'retained value');
    assert.equal(await page.locator('[data-fixture-panel="1"] output').textContent(), '1');
    await page.locator('[data-fixture-route="2"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-fixture-panel="2"]').isVisible(), true);
    await page.locator('#crmSearch').fill('Fixture 3');
    assert.equal(await page.locator('[data-fixture-route="1"]').isVisible(), false);
    assert.equal(await page.locator('[data-fixture-route="3"]').isVisible(), true);
    await page.locator('#crmSearch').fill('');
    await originalMenu.click();
    assert.equal(await page.locator('#activeTab').textContent(), originalName);
    assert.equal(await page.locator('#fixture-workspaces').isVisible(), false);
    console.log('PASS STATE-RETAIN, KEYBOARD, ORIGINAL-NAV/search, RUNTIME-ERRORS');
  });
  const staticEdits = edits.filter(e => e.action_id !== 'VIS'), staticOutput = build(staticEdits);
  assert.equal((await verifyOriginalEditedOutput({ base, output: staticOutput, actions: plainActions.filter(a => a.action_id !== 'VIS'), edits: staticEdits }, { browser })).status, 'PASS');
  await assert.rejects(drive(staticOutput, page => selected(page, 1)), /NAV-1/);
  const wrong = [{ ...binding, bytes: Buffer.from(bridge.toString().replace('panel.dataset.fixturePanel !== button.dataset.fixtureRoute', 'panel.dataset.fixturePanel !== "2"')) }];
  await assert.rejects(drive(appendBoundBehavior(structural, wrong), page => selected(page, 1)), /NAV-1/);
  assert.ok((await readFile(new URL('../.claude/skill-os/page-library/sources/originals/crm-workbench-home.html', import.meta.url))).equals(base));
  console.log('PASS mutations: missing bridge (static integrity PASS, behavior FAIL), wrong navigation mapping (behavior FAIL), changed frozen bytes (integrity FAIL); original preserved');
} finally { await browser.close(); }
