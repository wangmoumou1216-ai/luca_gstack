import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';

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
const page = { page_id: 'list', name: '列表', aliases: [], intent: '记录管理', scope: 'framework', source_ref: 'framework/list.html', source_hash: hash(html), viewport: { width: 1200, height: 800 }, states: ['default'], regions: [{ region_id: 'filters', parent_id: null, name: '筛选区域', aliases: [], intent: '筛选记录', anchor: { kind: 'attribute', name: 'id', value: 'filters' } }] };
const catalog = { schema_version: 1, retired_page_ids: [], pages: [page] };
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
  if (process.argv.includes('--mutation')) {
    const mutantRoot = join(root, 'mutants');
    const mutantScripts = join(mutantRoot, 'scripts');
    await mkdir(mutantScripts, { recursive: true });
    await mkdir(join(mutantRoot, '.claude/skill-os/page-library'), { recursive: true });
    // Copy the real selection dependency unchanged; only the new handoff guard is mutated.
    await writeFile(join(mutantScripts, 'page-context.mjs'), await readFile(new URL('./page-context.mjs', import.meta.url)));
    await writeFile(join(mutantRoot, '.claude/skill-os/page-library/schema.json'), await readFile(new URL('../.claude/skill-os/page-library/schema.json', import.meta.url)));
    const original = await readFile(modulePath, 'utf8');
    const mutantModule = join(mutantScripts, 'design-flow-handoff.mjs');
    const witnessGuard = original.split('\n').find(line => line.includes("fail('USER_DECISION_REQUIRED'"));
    const missingGuard = original.split('\n').find(line => line.includes("if (!actual) fail('READBACK_MISSING_FILE'"));
    const mutations = [
      ['caller confirmation guard', witnessGuard, '', 'confirmation record alone must not authorize a reference'],
      ['no-reference attachment exclusion', "if (validated.status === 'confirmed') bundle.files.push", 'if (preview?.png) bundle.files.push', 'no-reference must not attach a rejected or weak candidate'],
      ['exact target authorization', 'grant.projectId !== bundle.target.projectId', 'false', 'page confirmation cannot substitute for exact OD write authorization'],
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
