import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  canonicalJson, canonicalManifestHash, carrierContentHash, parseCanonicalJson,
  resolveAssetClosure, safeRelativePath, sha256Bytes, validateInertStorageReceipt
} from './carrier-asset-profile.mjs';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
const html = Buffer.from('<!doctype html><link rel="stylesheet" href="assets/site.css"><main id="root"><img src="assets/logo.png"></main>');
const assets = [
  { path: 'assets/site.css', bytes: Buffer.from('body { color: black; }') },
  { path: 'assets/logo.png', bytes: png }
];

const expectCode = (fn, code, label) => assert.throws(fn, error => error?.code === code, label ?? code);

const closure = resolveAssetClosure({ baseTemplate: html, assets });
assert.equal(closure.asset_profile, 'p0-static-v1');
assert.deepEqual(closure.base_template, html, 'profile records raw bytes and never rewrites the template');
assert.deepEqual(closure.assets.map(asset => asset.path), ['assets/logo.png', 'assets/site.css']);
assert.match(carrierContentHash(closure, 'a'.repeat(64)), /^[a-f0-9]{64}$/);
console.log('PASS: strict P0 records only the explicit local HTML/CSS/image closure without rewriting raw HTML');

for (const [name, source, code] of [
  ['data URI', '<img src="data:image/png;base64,iVBORw0KGgo=">', 'DATA_URI_FORBIDDEN'],
  ['inline script', '<script>doNotRun()</script>', 'ACTIVE_CONTENT_FORBIDDEN'],
  ['event handler', '<button onclick="doNotRun()">x</button>', 'ACTIVE_CONTENT_FORBIDDEN'],
  ['remote URL', '<img src="https://example.invalid/logo.png">', 'REMOTE_URL_FORBIDDEN'],
  ['legacy background URL', '<table background="https://example.invalid/leak.png"><tr><td>x</td></tr></table>', 'REMOTE_URL_FORBIDDEN'],
  ['image input URL', '<input type="image" src="https://example.invalid/leak.png">', 'REMOTE_URL_FORBIDDEN'],
  ['entity-encoded image input type', '<input type="im&#97;ge" src="https://example.invalid/leak.png">', 'HTML_UNSUPPORTED_SYNTAX'],
  ['video poster URL', '<video poster="https://example.invalid/leak.png"></video>', 'REMOTE_URL_FORBIDDEN'],
  ['legacy low-resolution URL', '<img lowsrc="https://example.invalid/leak.png">', 'REMOTE_URL_FORBIDDEN'],
  ['path traversal', '<img src="assets/../secret.png">', 'UNSAFE_PATH'],
  ['srcset', '<img srcset="assets/a.png 1x">', 'SRCSET_UNSUPPORTED'],
  ['link imagesrcset', '<link rel="preload" as="image" href="data:image/png;base64,AA==" imagesrcset="assets/a.png 1x">', 'SRCSET_UNSUPPORTED'],
  ['encoded meta refresh', '<meta http-equiv="re&#102;resh" content="0;url=https://example.invalid/escape">', 'HTML_UNSUPPORTED_SYNTAX'],
  ['spaced meta refresh', '<meta http-equiv=" refresh " content="0;url=https://example.invalid/escape">', 'HTML_UNSUPPORTED_SYNTAX'],
  ['inline CSS URL', '<style>.x { background: url(assets/a.png) }</style>', 'CSS_UNSUPPORTED'],
  ['CSS import', '<style>@import "assets/a.css";</style>', 'CSS_UNSUPPORTED'],
  ['CSS image-set', '<span style=\'background-image:image-set("assets/a.png" 1x)\'>x</span>', 'CSS_UNSUPPORTED'],
  ['entity-obfuscated CSS URL', '<span style="background-image:u&#114;l(&quot;assets/a.png&quot;)">x</span>', 'HTML_UNSUPPORTED_SYNTAX'],
  ['unterminated numeric-entity CSS URL', '<span style="background-image:u&#114l(assets/a.png)">x</span>', 'HTML_UNSUPPORTED_SYNTAX'],
  ['external script', '<script src="assets/code.js"></script>', 'SCRIPT_EXTERNAL_FORBIDDEN']
]) expectCode(() => resolveAssetClosure({ baseTemplate: Buffer.from(source), assets: [] }), code, `P0 rejects ${name}`);
expectCode(() => resolveAssetClosure({ baseTemplate: Buffer.from('<img src="assets/logo.png">'), assets: [...assets, { path: 'assets/unused.png', bytes: png }] }), 'UNREFERENCED_ASSET', 'closure never copies an unreferenced asset');
console.log('PASS: P0 fail-closed negative matrix covers data, active/remote/traversal syntax, CSS and unused assets');

const embedded = Buffer.from('<img src="data:image/png;base64,iVBORw0KGgo=">');
const embeddedClosure = resolveAssetClosure({ baseTemplate: embedded, assets: [], profile: 'structural-embedded-v1' });
assert.deepEqual(embeddedClosure.base_template, embedded);
assert.equal(embeddedClosure.embedded.length, 1);
assert.equal(embeddedClosure.embedded[0].media_type, 'image/png');
expectCode(() => resolveAssetClosure({ baseTemplate: Buffer.from('<button onclick="x()">x</button>'), assets: [], profile: 'structural-embedded-v1' }), 'INERT_STORAGE_RECEIPT_REQUIRED', 'active markup needs a separate receipt');
const active = Buffer.from('<script>doNotRun()</script><button onclick="doNotRun()">x</button>');
const receipt = { version: 1, kind: 'inert-storage', template_sha256: (await import('./carrier-asset-profile.mjs')).sha256Bytes(active), receipt_ref: 'fixture:inert:1', handoff_id: 'handoff-1' };
const activeClosure = resolveAssetClosure({ baseTemplate: active, assets: [], profile: 'structural-embedded-v1', inertStorageReceipt: receipt });
assert.equal(activeClosure.active_content.script_tags, 1);
assert.equal(activeClosure.active_content.event_handlers, 1);
assert.deepEqual(validateInertStorageReceipt(receipt, { templateSha256: receipt.template_sha256, handoffId: 'handoff-1' }), { version: 1, kind: 'inert-storage', template_sha256: receipt.template_sha256, receipt_ref: 'fixture:inert:1', handoff_id: 'handoff-1' });
expectCode(() => validateInertStorageReceipt(receipt, { templateSha256: receipt.template_sha256, handoffId: 'another' }), 'INERT_STORAGE_RECEIPT_REQUIRED');
console.log('PASS: versioned structural embedded profile records bounded data and gates active content behind exact inert-storage evidence');

for (const [name, source, expectedKind] of [
  ['inline SVG', '<svg><path d="M0 0"></path></svg>', 'svg_content'],
  ['CSS data URL', '<style>.x{background:url(data:image/svg+xml,%3Csvg%2F%3E)}</style>', 'css_data_url'],
  ['root app navigation', '<a href="/app/settings">settings</a>', 'root_relative_app_navigation'],
  ['missing visual CSS URL', '<style>.x{background:url(../images/missing.png?rev=1)}</style>', 'missing_visual_css_url'],
  ['potential CSS execution', '<style>.x{background:url(javascript:alert(1))}</style>', 'potential_css_execution']
]) {
  const bytes = Buffer.from(source);
  expectCode(() => resolveAssetClosure({ baseTemplate: bytes, assets: [], profile: 'structural-embedded-v1' }), 'INERT_STORAGE_RECEIPT_REQUIRED', `${name} needs inert storage evidence`);
  const result = resolveAssetClosure({
    baseTemplate: bytes, assets: [], profile: 'structural-embedded-v1',
    inertStorageReceipt: { version: 1, kind: 'inert-storage', template_sha256: sha256Bytes(bytes), receipt_ref: `fixture:${name}` }
  });
  assert.deepEqual(result.base_template, bytes);
  assert.ok(result.inert_findings.some(item => item.kind === expectedKind), `${name} is explicitly registered`);
  assert.equal(result.assets.length, 0, `${name} cannot cause path-following or asset copying`);
}
console.log('PASS: SVG, CSS data, app navigation, missing visual URLs and potential execution are inert-only, receipt-gated findings');

const realTemplateDir = '/Users/luca/Desktop/模版';
const realTemplateHashes = new Map([
  ['后台设置.html', '4bfd4b31b2bc738881507061e5b394de7984ccb93b799a0a1c1824dc673284e0'],
  ['客户列表到详情页.html', '05921e7ad5340df93c28637118b1599eaefb4a4827a1b8d351afa7868808e58b'],
  ['工作台首页.html', '7a30a15978929ede4177e213f1090cb4d3860e5b2ef33509434cfff7879631e5'],
  ['销售记录列表到详情页单.html', '1c2f45816993f022e13322757cc87b03b77d66d0be2971397d82b3cb1fad544f']
]);
if (process.argv.includes('--audit-originals')) {
  await access(realTemplateDir);
  const names = (await readdir(realTemplateDir)).filter(name => name.endsWith('.html')).sort();
  assert.deepEqual(names, [...realTemplateHashes.keys()].sort(), 'real package regression uses the exact four read-only HTML files');
  const observedKinds = new Set();
  for (const name of names) {
    const bytes = await readFile(join(realTemplateDir, name));
    const templateSha256 = sha256Bytes(bytes);
    assert.equal(templateSha256, realTemplateHashes.get(name), `${name} raw fixture changed`);
    expectCode(() => resolveAssetClosure({ baseTemplate: bytes, assets: [], profile: 'structural-embedded-v1' }), 'INERT_STORAGE_RECEIPT_REQUIRED', `${name} cannot be registered without exact inert receipt`);
    const result = resolveAssetClosure({
      baseTemplate: bytes, assets: [], profile: 'structural-embedded-v1',
      inertStorageReceipt: { version: 1, kind: 'inert-storage', template_sha256: templateSha256, receipt_ref: `readonly-real-package:${name}` }
    });
    assert.deepEqual(result.base_template, bytes, `${name} raw HTML bytes remain unchanged`);
    assert.equal(result.assets.length, 0, `${name} does not synthesize or escape-copy absent files`);
    for (const item of result.inert_findings) observedKinds.add(item.kind);
  }
  for (const kind of ['inline_script', 'svg_content', 'css_data_url', 'root_relative_app_navigation', 'missing_visual_css_url']) assert.ok(observedKinds.has(kind), `real packages register ${kind}`);
  console.log('PASS: exact four /Users/luca/Desktop/模版 packages register read-only with raw hashes and inert risk receipts');
} else {
  console.log('NOT RUN: original desktop source audit (explicit --audit-originals opt-in); repository fixtures are tested below');
}

const shadowManifest = JSON.parse(await readFile('.claude/skill-os/page-library/source-manifest.json', 'utf8'));
assert.equal(shadowManifest.profile, 'original-template-copy-v1');
assert.equal(shadowManifest.sources.length, 4);
for (const source of shadowManifest.sources) {
  const bytes = await readFile(source.copy_source);
  assert.equal(bytes.length, source.raw_bytes, `${source.page_id}: original copy byte count is frozen`);
  assert.equal(sha256Bytes(bytes), source.raw_sha256, `${source.page_id}: original copy hash is frozen`);
  assert.throws(() => resolveAssetClosure({ baseTemplate: bytes, assets: [] }), 'P0 inability is not permission to rewrite the source');
  const result = resolveAssetClosure({ baseTemplate: bytes, assets: [], profile: 'structural-embedded-v1', inertStorageReceipt: { version: 1, kind: 'inert-storage', template_sha256: source.raw_sha256, receipt_ref: 'fixture-only:raw-copy-scan-no-execution' } });
  assert.deepEqual(result.base_template, bytes, 'inert scan never changes original bytes');
}
console.log('PASS: four original copies stay byte-identical; inert inspection is not executable carrier approval');

assert.equal(canonicalJson({ z: [2, 1], a: 'x' }), '{"a":"x","z":[2,1]}');
assert.deepEqual(parseCanonicalJson(Buffer.from('{"a":"x","z":[2,1]}')), { a: 'x', z: [2, 1] });
expectCode(() => parseCanonicalJson(Buffer.from('{"a":1,"a":2}')), 'JSON_DUPLICATE_KEY');
expectCode(() => parseCanonicalJson(Buffer.from('{"a":1.0}')), 'JSON_INVALID');
expectCode(() => safeRelativePath('assets/../x.png'), 'UNSAFE_PATH');
const records = [{ path: 'input/base-template.html', media_type: 'text/html; charset=utf-8', bytes: 1, sha256: 'a'.repeat(64) }];
const manifest = { schema_version: 2, handoff_id: 'h1', handoff_bundle_hash: '0'.repeat(64) };
assert.notEqual(canonicalManifestHash(manifest, records), canonicalManifestHash({ ...manifest, handoff_id: 'h2' }, records));
console.log('PASS: canonical manifest body rejects duplicate/noncanonical controls and binds deterministic file records');
