import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyCopyBytes, verifyTemplateCopies } from './template-copy.mjs';
import { loadCatalog, validateSelection } from './page-context.mjs';

const manifest = JSON.parse(await readFile('.claude/skill-os/page-library/source-manifest.json', 'utf8'));
for (const id of ['settings-lead-pool', 'customer-list-detail', 'crm-workbench-home', 'sales-record-list-detail']) assert.ok(manifest.sources.some(entry => entry.page_id === id), `approved original must not disappear: ${id}`);
for (const entry of manifest.sources) {
  const original = await readFile(entry.copy_source);
  assert.equal(verifyCopyBytes(original, entry).fidelity, 'byte-identical');
  for (const bad of [Buffer.from('<main>simplified replacement</main>'), Buffer.concat([original, Buffer.from('\n')]), Buffer.from(original.toString().replace(/<html/i, '<html data-extra="added"'))]) {
    assert.throws(() => verifyCopyBytes(bad, entry), { code: 'TEMPLATE_COPY_MISMATCH' });
  }
}
const result = await verifyTemplateCopies({ auditOriginals: process.argv.includes('--audit-originals') });
const catalog = await loadCatalog();
for (const entry of manifest.sources) {
  const page = catalog.pages.find(item => item.page_id === entry.page_id);
  assert.equal(page.source_ref, entry.copy_source);
  assert.equal(page.source_hash, entry.raw_sha256);
  assert.equal(page.carrier_eligible, false, 'unadapted originals must not inherit shadow carrier approval');
  const record = { schema_version: 1, status: 'confirmed', page_id: entry.page_id, source_hash: entry.raw_sha256, kind: 'page', confirmation: { actor: 'user', evidence: 'fixture only', confirmed_at: '2026-09-20T00:00:00Z' } };
  await assert.rejects(validateSelection(catalog, record), { code: 'ORIGINAL_ADAPTER_REQUIRED' });
  const aliased = structuredClone(catalog);
  const alias = aliased.pages.find(item => item.page_id === entry.page_id);
  alias.page_id = `alias-${entry.page_id}`;
  delete alias.original_copy;
  await assert.rejects(validateSelection(aliased, { ...record, page_id: alias.page_id }), { code: 'TEMPLATE_COPY_MISMATCH' });
  const reverted = structuredClone(catalog);
  const wrong = reverted.pages.find(item => item.page_id === entry.page_id);
  wrong.source_ref = entry.rejected_shadow.source;
  wrong.source_hash = entry.rejected_shadow.sha256;
  await assert.rejects(validateSelection(reverted, record), { code: 'REWRITTEN_TEMPLATE_FORBIDDEN' });
  wrong.page_id = `renamed-${entry.page_id}`;
  await assert.rejects(validateSelection(reverted, { ...record, page_id: wrong.page_id }), { code: 'REWRITTEN_TEMPLATE_FORBIDDEN' });
}
console.log(`PASS: ${result.copies.length} exact original copies; rewritten, formatted and anchor-injected replacements rejected; originals_audited=${result.originals_audited}`);
console.log('PASS: rejected shadows cannot return through original IDs or aliases; pending originals never inherit shadow adoption');
