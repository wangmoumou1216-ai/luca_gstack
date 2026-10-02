#!/usr/bin/env node
// Retained isolated fixtures; fabricated local reports exercise integrity, not independent native acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import * as delivery from './prototype-delivery.mjs';

const workRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileRef = file => ({ path: file, sha256: hash(fs.readFileSync(file)) });
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
export const requiredBehaviors = ['AC-open', 'AC-mid-close-reverse', 'AC-repeat', 'AC-cancel', 'AC-reduced-motion', 'AC-keyboard-focus'];
export const rawCSS = `@import './extra.css';\n#drawer{position:fixed;right:0;top:0;width:260px;height:100vh;background:#eee;transform:translateX(100%);transition:none}body[data-open=true] #drawer{transform:translateX(0)}\n`;
export const enhancedCSS = rawCSS.replace('transition:none', 'transition:transform 420ms ease-in-out') + '#close{transform:translateX(-100%)}body:not([data-open=true]) #close{visibility:hidden}\n@media(prefers-reduced-motion:reduce){#drawer{transition:none}}\n';
export const fixtureHTML = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Scoped drawer fixture</title><link rel="stylesheet" href="../assets/base.css"><body data-open="false"><h1>Drawer</h1><button id="toggle" aria-expanded="false" aria-controls="drawer">Open drawer</button><aside id="drawer" aria-hidden="true" inert><h2>Details</h2><button id="close">Close drawer</button><p id="result">No business side effect</p></aside><a href="../prototype-spec.md">Original attachment</a><script type="module" src="../assets/state.js"></script></body></html>\n`;
export const fixtureJS = `import { baseline } from './state-util.js';\nconst toggle=document.querySelector('#toggle'),close=document.querySelector('#close'),drawer=document.querySelector('#drawer');\nfunction setOpen(open){document.body.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-hidden',String(!open));drawer.inert=!open;document.querySelector('#result').textContent=baseline;if(open)close.focus();else toggle.focus();}\ntoggle.addEventListener('click',()=>setOpen(document.body.dataset.open!=='true'));close.addEventListener('click',()=>setOpen(false));document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});\n`;

// Public test fixture factory for cold parent/child/QG consumers; owns only the supplied isolated directory.
export function createDeliveryFixture(root, { kind = 'enhanced-copy', helper = delivery, sufficient = kind !== 'enhanced-copy', freeze = true } = {}) {
  fs.mkdirSync(root, { recursive: true });
  root = fs.realpathSync(root);
  const deliveryRoot = path.join(root, 'delivery'); fs.mkdirSync(deliveryRoot);
  const sourceRoot = kind === 'adequate-original' ? path.join(deliveryRoot, 'original') : path.join(root, 'original');
  fs.mkdirSync(path.join(sourceRoot, 'views'), { recursive: true }); fs.mkdirSync(path.join(sourceRoot, 'assets'));
  const contents = { 'views/drawer.html': fixtureHTML, 'assets/base.css': sufficient ? enhancedCSS : rawCSS,
    'assets/extra.css': "@import './empty.css';\nbody{font-family:system-ui;margin:24px}\n", 'assets/empty.css': '', 'assets/state.js': fixtureJS,
    'assets/state-util.js': 'export const baseline="No business side effect";\n', 'prototype-spec.md': 'Original same-named spec attachment: KEEP exact bytes.\n' };
  for (const [name, bytes] of Object.entries(contents)) fs.writeFileSync(path.join(sourceRoot, name), bytes);
  const source = path.join(root, 'source.md'), scope = path.join(root, 'scope.md'), recovery = path.join(root, 'recovery-receipt.json');
  fs.writeFileSync(source, '# Actual isolated framework expectations\n' + requiredBehaviors.map(id => `${id}: ` + ({
    'AC-open': 'Open commits immediately; presentation has start, middle and endpoint.',
    'AC-mid-close-reverse': 'During close, reopening starts from current presentation in the same rendering frame; no old-endpoint jump.',
    'AC-repeat': 'Rapid repeated requests end in the last requested state with no duplicate handlers.',
    'AC-cancel': 'Escape closes with no business side effect and restores opener focus.',
    'AC-reduced-motion': 'Browser reduce preference gives usable immediate final state and preserves feedback.',
    'AC-keyboard-focus': 'Keyboard Enter opens, Escape closes; focused control matches actual visible state.'
  }[id])).join('\n') + '\n');
  fs.writeFileSync(scope, 'Explicit NO_PIN isolated framework fixture. Copy/edit/metadata/local browser allowed only here. KEEP raw bytes, original spec and no business side effect. Edit assets/base.css only.\n');
  writeJSON(recovery, { origin: 'isolated-framework-mechanical-recovery', mechanical: 'PASS', semantic: 'NOT_TESTED', production_pin: 'NONE' });
  const method = path.join(root, 'implementation-method.md');
  fs.copyFileSync(path.join(workRoot, '.claude/skills/office/references/motion/implementation.md'), method);
  const files = Object.keys(contents).map(name => ({ path: name, sha256: fileRef(path.join(sourceRoot, name)).sha256, bytes: fs.statSync(path.join(sourceRoot, name)).size }));
  const entry = path.join(sourceRoot, 'views/drawer.html');
  const context = { read_paths: [...files.map(item => path.join(sourceRoot, item.path)), source, scope, recovery, method], read_roots: [],
    effects: { framework_fixture: true, authorized_delivery_root: deliveryRoot, copy: true, edit: true, metadata: true, browser: true, edit_paths: ['assets/base.css'] } };
  const bound = helper.bindBase({ source: { locator: source, version: 'framework-fixture-v1', sha256: fileRef(source).sha256 },
    base: { entry, sha256: fileRef(entry).sha256, closure: files, asset_root: sourceRoot, entry_relative: 'views/drawer.html', origin: 'framework-fixture', recovery_ref: fileRef(recovery), spec: fileRef(path.join(sourceRoot, 'prototype-spec.md')) },
    scope: { reference: scope, sha256: fileRef(scope).sha256, preserved_expectations: ['KEEP-raw', 'KEEP-original-spec', 'KEEP-business-result'] },
    methods: [{ ...fileRef(method), pin_or_version: 'reference-phase-local-v1' }], authority_ref: scope }, context);
  const attempt = helper.prepareCopy(bound, { delivery_root: deliveryRoot, attempt_id: 'attempt-A', kind }, context);
  if (kind === 'enhanced-copy' && freeze) fs.writeFileSync(path.join(attempt.content_root, 'assets/base.css'), enhancedCSS);
  const specPath = path.join(attempt.attempt_dir, 'prototype-spec.md');
  fs.writeFileSync(specPath, '# Observation spec\nActual CSS transform transition; 420ms is a fixture parameter, not a framework threshold. CSS current-presentation reversal, reduced-motion immediate branch, logical commit and focus in actual DOM.\n' + fs.readFileSync(source, 'utf8'));
  function candidateInput() {
    const finalRoot = kind === 'adequate-original' ? sourceRoot : attempt.content_root;
    const finalFiles = files.map(item => ({ path: path.relative(deliveryRoot, path.join(finalRoot, item.path)).split(path.sep).join('/'),
      sha256: fileRef(path.join(finalRoot, item.path)).sha256, bytes: fs.statSync(path.join(finalRoot, item.path)).size }));
    const operations = files.filter(item => item.sha256 !== fileRef(path.join(finalRoot, item.path)).sha256).map(item =>
      ({ path: item.path, before_sha256: item.sha256, after_sha256: fileRef(path.join(finalRoot, item.path)).sha256 }));
    const patchData = { base_sha256: bound.base.sha256, operations, content_changed: operations.length > 0 };
    const patchPath = path.join(attempt.attempt_dir, 'patch.json'); writeJSON(patchPath, patchData);
    return { ...bound, attempt_id: attempt.attempt_id, delivery_root: deliveryRoot, required_behavior_refs: requiredBehaviors,
      delivery: { id: attempt.attempt_id, kind, entry: path.relative(deliveryRoot, attempt.entry).split(path.sep).join('/'),
        sha256: fileRef(attempt.entry).sha256, closure: finalFiles, spec: fileRef(specPath) }, patch: { ...fileRef(patchPath), ...patchData } };
  }
  const fixture = { root, deliveryRoot, sourceRoot, source, scope, recovery, context, bound, attempt, candidateInput };
  if (freeze) fixture.resolved = helper.checkCandidate(candidateInput(), context);
  writeJSON(path.join(root, 'fixture-context.json'), { scope: 'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE', context, raw_entry: entry,
    source_ref: bound.source, attempt, candidate_ref: fixture.resolved?.candidate_ref || null });
  return fixture;
}
export function createLocalIntegrityReport(fixture, { helper = delivery, seal = true, label = 'local-integrity-test' } = {}) {
  const resolved = fixture.resolved;
  const evidence = path.join(fixture.attempt.attempt_dir, 'local-integrity-evidence.txt');
  fs.writeFileSync(evidence, 'Synthetic local integrity evidence only. NOT native independent acceptance.\n');
  const invocation = path.join(fixture.attempt.attempt_dir, 'local-invocation.txt'), output = path.join(fixture.attempt.attempt_dir, 'local-output.txt');
  fs.writeFileSync(invocation, 'Local integrity test invocation\n'); fs.writeFileSync(output, label + '\n');
  const report = { schema_version: 1, candidate_ref: resolved.candidate_ref, final_sha256: resolved.final_sha256,
    required_behavior_results: requiredBehaviors.map(id => ({ id, status: 'PASS', expected: 'Integrity test fixture only', observed: 'Synthetic test payload', evidence_refs: [fileRef(evidence)] })),
    reviewer_provenance: { reviewer_role: 'local-test', invocation_ref: fileRef(invocation), output_ref: fileRef(output), origin: 'LOCAL_TEST_NOT_INDEPENDENT' }, status: 'PASS' };
  const reportPath = path.join(fixture.attempt.attempt_dir, 'qa-results.json'); writeJSON(reportPath, report);
  const reportRef = fileRef(reportPath);
  const input = { candidate_ref: resolved.candidate_ref, report_ref: reportRef, delivery_root: fixture.deliveryRoot };
  return { report, reportRef, input, accepted: seal ? helper.sealAccepted(input, fixture.context) : null };
}

async function main() {
  const evidenceRoot = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'luca-prototype-delivery-'));
  const receipts = [], helperPath = path.resolve(option('--helper') || path.join(workRoot, 'scripts/prototype-delivery.mjs'));
  const helper = await import(pathToFileURL(helperPath));
  const selected = option('--case');
  function command(label, args, expected = 0, entry = helperPath) {
    const result = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
    const out = path.join(evidenceRoot, `${label}.stdout`), err = path.join(evidenceRoot, `${label}.stderr`);
    fs.writeFileSync(out, result.stdout || ''); fs.writeFileSync(err, result.stderr || '');
    receipts.push({ argv: [process.execPath, entry, ...args], exit_code: result.status, stdout_ref: fileRef(out), stderr_ref: fileRef(err) });
    assert.equal(result.status, expected, `${label}: actual CLI exit code`);
    return result;
  }
  const ctxArgs = fixture => fixture.context.read_paths.flatMap(file => ['--read-path', file]);
  const argsFor = (fixture, commandName, item) => [commandName, commandName === 'candidate-check' ? '--subject' : '--accepted', item.path,
    '--sha256', item.sha256, '--delivery-root', fixture.deliveryRoot, ...ctxArgs(fixture)];
  const rejects = (fn, pattern, label) => assert.throws(fn, pattern, label);
  const cases = {
    'attempt-path': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'attempt-path'), { helper });
      fs.mkdirSync(path.join(fixture.deliveryRoot, 'motion-polish/nested/inside'), { recursive: true });
      fs.mkdirSync(path.join(fixture.root, 'outside'));
      const inventory = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
        const file = path.join(directory, item.name);
        return item.isDirectory() ? inventory(file) : [{ path: file, sha256: fileRef(file).sha256 }];
      });
      for (const attempt_id of ['nested/inside', '../../outside', '../attempt-path', '/outside', '.', '..', '', 123, null]) {
        const input = structuredClone(fixture.resolved.candidate);
        input.attempt_id = attempt_id;
        const before = inventory(fixture.root);
        rejects(() => helper.checkCandidate(input, fixture.context), /ATTEMPT_ID|PATH_ESCAPE|SCHEMA/);
        assert.deepEqual(inventory(fixture.root), before, 'Invalid candidate ID must fail before any publication');
        rejects(() => helper.prepareCopy(fixture.bound, { delivery_root: fixture.deliveryRoot, attempt_id }, fixture.context), /ATTEMPT_ID|PATH_ESCAPE/);
        assert.deepEqual(inventory(fixture.root), before, 'Invalid copy ID must fail before any filesystem mutation');
      }
    },
    'cli-entry': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'cli-entry'), { helper });
      const alias = path.join(evidenceRoot, 'helper-entry.mjs'); fs.symlinkSync(helperPath, alias);
      for (const [name, entry] of [['canonical', helperPath], ['symlink', alias]]) {
        const good = command(`cli-${name}-valid`, argsFor(fixture, 'candidate-check', fixture.resolved.candidate_ref), 0, entry);
        assert.equal(JSON.parse(good.stdout).candidate_ref.sha256, fixture.resolved.candidate_ref.sha256);
        const wrongHash = command(`cli-${name}-wrong-hash`, argsFor(fixture, 'candidate-check', { ...fixture.resolved.candidate_ref, sha256: '0'.repeat(64) }), 1, entry);
        assert.match(wrongHash.stderr, /HASH_DRIFT/);
        const missing = command(`cli-${name}-missing`, argsFor(fixture, 'candidate-check', { path: path.join(fixture.deliveryRoot, 'missing-candidate.json'), sha256: '0'.repeat(64) }), 1, entry);
        assert.match(missing.stderr, /MISSING_FILE/);
      }
      const argv = [process.execPath, '--input-type=module', '-'];
      const stdin = spawnSync(argv[0], argv.slice(1), { input: `import { resolveFinal } from ${JSON.stringify(pathToFileURL(helperPath).href)};console.log(typeof resolveFinal);\n`, encoding: 'utf8' });
      const out = path.join(evidenceRoot, 'cli-stdin-import.stdout'), err = path.join(evidenceRoot, 'cli-stdin-import.stderr');
      fs.writeFileSync(out, stdin.stdout || ''); fs.writeFileSync(err, stdin.stderr || '');
      receipts.push({ argv, exit_code: stdin.status, stdout_ref: fileRef(out), stderr_ref: fileRef(err) });
      assert.equal(stdin.status, 0, 'stdin module import does not execute the CLI');
      assert.equal(stdin.stdout.trim(), 'function'); assert.equal(stdin.stderr, '');
    },
    'three-kinds': () => {
      for (const kind of ['adequate-original', 'adequate-copy', 'enhanced-copy']) {
        const fixture = createDeliveryFixture(path.join(evidenceRoot, kind), { kind, helper });
        command(`${kind}-preaccept`, argsFor(fixture, 'candidate-check', fixture.resolved.candidate_ref));
        assert.ok(!fs.existsSync(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json')), 'PREACCEPT has no old accepted prerequisite');
        const { accepted } = createLocalIntegrityReport(fixture, { helper });
        const result = command(`${kind}-resolve`, argsFor(fixture, 'resolve', accepted.accepted_ref));
        assert.equal(JSON.parse(result.stdout).final_entry, fixture.attempt.entry);
        for (const item of fixture.bound.base.closure) assert.equal(fileRef(path.join(fixture.sourceRoot, item.path)).sha256, item.sha256, 'Raw closure preserved');
        assert.equal(fs.readFileSync(path.join(fixture.sourceRoot, 'prototype-spec.md'), 'utf8'), 'Original same-named spec attachment: KEEP exact bytes.\n');
        if (kind !== 'enhanced-copy') assert.equal(fixture.resolved.candidate.patch.operations.length, 0);
        const again = helper.sealAccepted({ candidate_ref: fixture.resolved.candidate_ref, report_ref: accepted.acceptance_ref, delivery_root: fixture.deliveryRoot }, fixture.context);
        assert.deepEqual(again.accepted_ref, accepted.accepted_ref);
        rejects(() => helper.prepareCopy(fixture.bound, { delivery_root: fixture.deliveryRoot, attempt_id: 'attempt-A', kind }, fixture.context), /ATTEMPT_EXISTS/);
      }
    },
    'read-context': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'read-context'), { helper });
      command('no-external-read-context', ['candidate-check', '--subject', fixture.resolved.candidate_ref.path, '--sha256', fixture.resolved.candidate_ref.sha256, '--delivery-root', fixture.deliveryRoot], 1);
      rejects(() => helper.bindBase(fixture.bound, { read_paths: [fixture.bound.base.entry] }), /READ_SCOPE_REFUSED/);
    },
    'closure': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'closure'), { helper });
      for (const omitted of ['assets/extra.css', 'assets/state-util.js']) {
        const bound = structuredClone(fixture.bound); bound.base.closure = bound.base.closure.filter(item => item.path !== omitted);
        rejects(() => helper.bindBase(bound, fixture.context), /MATERIAL_CLOSURE_MISSING/);
      }
      const bad = structuredClone(fixture.bound); bad.base.closure[1].path = '../outside.css';
      rejects(() => helper.bindBase(bad, fixture.context), /PATH_ESCAPE/);
      const asset = path.join(fixture.sourceRoot, 'assets/extra.css'); const saved = fs.readFileSync(asset);
      fs.unlinkSync(asset); fs.symlinkSync(fixture.source, asset);
      rejects(() => helper.bindBase(fixture.bound, fixture.context), /SYMLINK_REFUSED/);
      fs.unlinkSync(asset); fs.writeFileSync(asset, saved);
      const css = path.join(fixture.sourceRoot, 'assets/base.css'); const cssBytes = fs.readFileSync(css);
      for (const text of ["@import '/absolute.css';", "@import 'https://example.invalid/style.css';", "a{background:url(../../escape.png)}"]) {
        fs.writeFileSync(css, text); const bound = structuredClone(fixture.bound), item = bound.base.closure.find(item => item.path === 'assets/base.css');
        item.sha256 = fileRef(css).sha256; item.bytes = fs.statSync(css).size;
        rejects(() => helper.bindBase(bound, fixture.context), /DEPENDENCY_ESCAPE|NETWORK_SCOPE_REFUSED|PATH_ESCAPE/);
        if (text.includes('https:')) assert.ok(helper.bindBase(bound, { ...fixture.context, allowed_urls: ['https://example.invalid/style.css'] }));
      }
      fs.writeFileSync(css, cssBytes);
      const script=path.join(fixture.sourceRoot,'assets/state.js'),savedScript=fs.readFileSync(script);
      const rewrite=(name,text)=>{const bound=structuredClone(fixture.bound),file=path.join(fixture.sourceRoot,name);fs.writeFileSync(file,text);const item=bound.base.closure.find(item=>item.path===name);item.sha256=fileRef(file).sha256;item.bytes=fs.statSync(file).size;if(file===bound.base.entry)bound.base.sha256=item.sha256;return bound;};
      for(const text of ["fetch('./state-util.js' + suffix)","import('./state-util.js' + suffix)","new URL(asset, import.meta.url)"])
        rejects(()=>helper.bindBase(rewrite('assets/state.js',text),fixture.context),/DYNAMIC_DEPENDENCY_UNRESOLVED/,'Computed locator cannot masquerade as literal closed dependency');
      assert.ok(helper.bindBase(rewrite('assets/state.js',"const x=new URL('./state-util.js', import.meta.url);"),fixture.context));
      rejects(()=>helper.bindBase(rewrite('assets/state.js',"const x=new URL('./missing.png', import.meta.url);"),fixture.context),/MATERIAL_CLOSURE_MISSING/);
      fs.writeFileSync(script,savedScript);
      const html=fixture.bound.base.entry,savedHTML=fs.readFileSync(html);
      rejects(()=>helper.bindBase(rewrite('views/drawer.html',fixtureHTML.replace('src="../assets/state.js"','src=../assets/missing.js')),fixture.context),/MATERIAL_CLOSURE_MISSING/,'Unquoted src still requires actual closure');
      fs.writeFileSync(html,savedHTML);
      fs.writeFileSync(path.join(fixture.attempt.content_root,'undeclared.js'),'console.log("not selected")');
      rejects(()=>helper.resolveCandidateSubject({...fixture.resolved.candidate_ref,delivery_root:fixture.deliveryRoot},fixture.context),/UNDECLARED_CONTENT/);
    },
    'effect': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'effect'), { helper });
      rejects(() => helper.prepareCopy(fixture.bound, { delivery_root: fixture.deliveryRoot, attempt_id: 'no-scope' }, { ...fixture.context, effects: undefined }), /EFFECT_SCOPE_REQUIRED/);
      rejects(() => helper.prepareCopy(fixture.bound, { delivery_root: fixture.deliveryRoot, attempt_id: 'no-pin' }, { ...fixture.context, effects: { ...fixture.context.effects, framework_fixture: false } }), /VERIFIED_PROJECT_REQUIRED/);
      rejects(() => helper.prepareCopy(fixture.bound, { delivery_root: fixture.deliveryRoot, attempt_id: 'stage-only' }, { ...fixture.context, effects: { ...fixture.context.effects, edit: false, stage: true } }), /EFFECT_REFUSED/);
      const standalone = structuredClone(fixture.bound); delete standalone.base.recovery_ref; standalone.base.origin='external-html';
      assert.ok(helper.bindBase(standalone,fixture.context),'Standalone requires no invented OD recovery receipt');
      standalone.base.origin='open-design';rejects(()=>helper.bindBase(standalone,fixture.context),/OD_RECOVERY_REQUIRED/);
      const project=path.join(evidenceRoot,'production-shape');const nested=path.join(project,'docs/prototype/deep/2026-10-02-fixture');fs.mkdirSync(nested,{recursive:true});
      rejects(()=>helper.prepareCopy(fixture.bound,{delivery_root:nested,attempt_id:'nested'},{...fixture.context,effects:{...fixture.context.effects,framework_fixture:false,
        verified_active_project:true,canonical_project_root:project,authorized_delivery_root:nested}}),/VERIFIED_PROJECT_REQUIRED/);
    },
    'drift': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'drift'), { helper });
      const { accepted } = createLocalIntegrityReport(fixture, { helper });
      command('wrong-ref-hash', argsFor(fixture, 'resolve', { ...accepted.accepted_ref, sha256: '0'.repeat(64) }), 1);
      const targets = [fixture.source, fixture.scope, fixture.bound.base.entry, path.join(fixture.attempt.content_root, 'assets/base.css'), fixture.resolved.spec_path,
        fixture.resolved.candidate.patch.path, fixture.resolved.candidate.methods_ref.path, fixture.bound.methods[0].path, accepted.acceptance_ref.path];
      for (const [index, target] of targets.entries()) {
        const saved = fs.readFileSync(target); fs.appendFileSync(target, '\nDRIFT');
        command(`drift-${index}`, argsFor(fixture, 'validate', accepted.accepted_ref), 1); fs.writeFileSync(target, saved);
      }
      command('restored-all-identities', argsFor(fixture, 'resolve', accepted.accepted_ref));
    },
    'required-set': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'required-set'), { helper });
      const local = createLocalIntegrityReport(fixture, { helper, seal: false });
      const saved = JSON.stringify(local.report);
      for (const change of [report => report.required_behavior_results.pop(), report => report.required_behavior_results.push(report.required_behavior_results[0]),
        report => report.required_behavior_results[0].status = 'UNKNOWN', report => report.candidate_ref.sha256 = '0'.repeat(64)]) {
        const report = JSON.parse(saved); change(report); writeJSON(local.reportRef.path, report);
        rejects(() => helper.sealAccepted({ ...local.input, report_ref: fileRef(local.reportRef.path) }, fixture.context), /REQUIRED_SET_MISMATCH|REQUIRED_NOT_PASS|REPORT_SUBJECT_MISMATCH/);
      }
    },
    'adequate-bytes': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'adequate-bytes'), { helper, kind: 'adequate-copy' });
      fs.appendFileSync(path.join(fixture.attempt.content_root, 'assets/base.css'), '\n/* changed */\n');
      rejects(() => helper.checkCandidate(fixture.candidateInput(), fixture.context), /ADEQUATE_COPY_CHANGED/);
    },
    'no-replace': () => {
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'no-replace'), { helper });
      const local = createLocalIntegrityReport(fixture, { helper });
      const old = fs.readFileSync(local.accepted.accepted_ref.path);
      const stringify=JSON.stringify;
      // Fault-inject a differing incoming certificate, while all previously accepted dependencies stay frozen.
      JSON.stringify=(value,...rest)=>stringify(value?.kind==='accepted-prototype-delivery'?{...value,attempt_id:'competing-publisher'}:value,...rest);
      try {rejects(() => helper.sealAccepted(local.input, fixture.context), /PUBLICATION_CONFLICT/);}finally{JSON.stringify=stringify;}
      assert.ok(fs.readFileSync(local.accepted.accepted_ref.path).equals(old), 'Different certificate must not overwrite');
      assert.equal(helper.resolveFinal({...local.accepted.accepted_ref,delivery_root:fixture.deliveryRoot},fixture.context).final_entry,fixture.attempt.entry,'Original accepted dependencies still resolve');
    }
  };
  try {
    for (const name of selected ? [selected] : Object.keys(cases)) { assert.ok(cases[name], `Unknown case ${name}`); cases[name](); console.log(`PASS ${name}`); }
    if (!selected) {
      // Real child processes race identical no-replace publications and crash at the actual link boundary.
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'process-publication'), { helper });
      const local = createLocalIntegrityReport(fixture, { helper, seal: false });
      const payload = path.join(fixture.root, 'seal-input.json'); writeJSON(payload, { input: local.input, context: fixture.context });
      const runner = path.join(fixture.root, 'publisher.mjs');
      fs.writeFileSync(runner, `import fs from 'node:fs';import {sealAccepted} from ${JSON.stringify(pathToFileURL(helperPath).href)};const p=JSON.parse(fs.readFileSync(process.argv[2]));const mode=process.argv[3];const link=fs.linkSync;fs.linkSync=(a,b)=>{if(b.endsWith('accepted-delivery.json')&&mode==='before')process.exit(86);link(a,b);if(b.endsWith('accepted-delivery.json')&&mode==='after')process.exit(87)};try{console.log(JSON.stringify(sealAccepted(p.input,p.context)))}catch(e){console.error(e.message);process.exitCode=1}\n`);
      const runPublisher = mode => spawnSync(process.execPath, [runner, payload, mode], { encoding: 'utf8' });
      const before = runPublisher('before'); assert.equal(before.status, 86); assert.ok(!fs.existsSync(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json')));
      const after = runPublisher('after'); assert.equal(after.status, 87);
      const exact = fileRef(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json'));
      command('resume-after-publish', argsFor(fixture, 'resolve', exact));
      const racers = await Promise.all([0, 1].map(index => new Promise(resolve => { const child = spawn(process.execPath, [runner, payload, 'normal']); let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('close',code=>resolve({index,code,stdout,stderr})); })));
      for (const race of racers) { assert.equal(race.code, 0); fs.writeFileSync(path.join(evidenceRoot, `race-${race.index}.stdout`), race.stdout); fs.writeFileSync(path.join(evidenceRoot, `race-${race.index}.stderr`), race.stderr); }
      assert.deepEqual(fileRef(exact.path), exact);
      writeJSON(path.join(evidenceRoot, 'publication-processes.json'), { before: { exit_code: before.status, stdout: before.stdout, stderr: before.stderr }, after: { exit_code: after.status, stdout: after.stdout, stderr: after.stderr }, racers });
      // A second exact attempt under the SAME delivery root, with distinct candidate/report/certificate identities.
      const secondAttempt=helper.prepareCopy(fixture.bound,{delivery_root:fixture.deliveryRoot,attempt_id:'attempt-B',kind:'enhanced-copy'},fixture.context);
      fs.writeFileSync(path.join(secondAttempt.content_root,'assets/base.css'),enhancedCSS);
      const secondInput=structuredClone(fixture.resolved.candidate);delete secondInput.methods_ref;
      secondInput.attempt_id='attempt-B';secondInput.delivery.id='attempt-B';secondInput.delivery.entry=secondInput.delivery.entry.replace('/attempt-A/','/attempt-B/');
      secondInput.delivery.closure=secondInput.delivery.closure.map(item=>({...item,path:item.path.replace('/attempt-A/','/attempt-B/')}));
      const secondSpec=path.join(secondAttempt.attempt_dir,'prototype-spec.md');fs.copyFileSync(fixture.resolved.spec_path,secondSpec);secondInput.delivery.spec=fileRef(secondSpec);
      const secondPatch=path.join(secondAttempt.attempt_dir,'patch.json');fs.copyFileSync(fixture.resolved.candidate.patch.path,secondPatch);secondInput.patch={...secondInput.patch,...fileRef(secondPatch)};
      const secondFixture={...fixture,attempt:secondAttempt,resolved:helper.checkCandidate(secondInput,fixture.context)};
      const secondLocal=createLocalIntegrityReport(secondFixture,{helper,seal:false}),secondPayload=path.join(fixture.root,'seal-input-B.json');writeJSON(secondPayload,{input:secondLocal.input,context:fixture.context});
      const launch=payloadPath=>new Promise(resolve=>{const child=spawn(process.execPath,[runner,payloadPath,'normal']);let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('close',exit_code=>resolve({argv:[process.execPath,runner,payloadPath,'normal'],exit_code,stdout,stderr}));});
      const thirdAttempt=helper.prepareCopy(fixture.bound,{delivery_root:fixture.deliveryRoot,attempt_id:'attempt-C',kind:'enhanced-copy'},fixture.context);
      fs.writeFileSync(path.join(thirdAttempt.content_root,'assets/base.css'),enhancedCSS);
      const thirdInput=structuredClone(secondInput);thirdInput.attempt_id='attempt-C';thirdInput.delivery.id='attempt-C';
      thirdInput.delivery.entry=thirdInput.delivery.entry.replace('/attempt-B/','/attempt-C/');thirdInput.delivery.closure=thirdInput.delivery.closure.map(item=>({...item,path:item.path.replace('/attempt-B/','/attempt-C/')}));
      const thirdSpec=path.join(thirdAttempt.attempt_dir,'prototype-spec.md');fs.copyFileSync(fixture.resolved.spec_path,thirdSpec);thirdInput.delivery.spec=fileRef(thirdSpec);
      const thirdPatch=path.join(thirdAttempt.attempt_dir,'patch.json');fs.copyFileSync(fixture.resolved.candidate.patch.path,thirdPatch);thirdInput.patch={...thirdInput.patch,...fileRef(thirdPatch)};
      const thirdFixture={...fixture,attempt:thirdAttempt,resolved:helper.checkCandidate(thirdInput,fixture.context)};
      const thirdLocal=createLocalIntegrityReport(thirdFixture,{helper,seal:false}),thirdPayload=path.join(fixture.root,'seal-input-C.json');writeJSON(thirdPayload,{input:thirdLocal.input,context:fixture.context});
      assert.ok(!fs.existsSync(path.join(secondAttempt.attempt_dir,'accepted-delivery.json'))&&!fs.existsSync(path.join(thirdAttempt.attempt_dir,'accepted-delivery.json')),'Both distinct attempts start unpublished');
      const distinct=await Promise.all([launch(secondPayload),launch(thirdPayload)]);distinct.forEach(item=>assert.equal(item.exit_code,0));
      const secondExact=fileRef(path.join(secondAttempt.attempt_dir,'accepted-delivery.json'));assert.notEqual(secondExact.path,exact.path);assert.deepEqual(fileRef(exact.path),exact);
      const thirdExact=fileRef(path.join(thirdAttempt.attempt_dir,'accepted-delivery.json'));assert.notEqual(thirdExact.path,secondExact.path);
      command('same-root-exact-A',argsFor(fixture,'resolve',exact));command('same-root-exact-B',argsFor(secondFixture,'resolve',secondExact));
      command('same-root-exact-C',argsFor(thirdFixture,'resolve',thirdExact));
      // Differing same-attempt reports compete without mutating the accepted report. The singleton report boundary rejects B early.
      const competingReport=path.join(fixture.attempt.attempt_dir,'qa-results-competing.json');writeJSON(competingReport,{...local.report,reviewer_provenance:{...local.report.reviewer_provenance,origin:'DIFFERING_LOCAL_REPORT_NOT_INDEPENDENT'}});
      const competingPayload=path.join(fixture.root,'seal-input-competing.json');writeJSON(competingPayload,{input:{...local.input,report_ref:fileRef(competingReport)},context:fixture.context});
      const conflict=await Promise.all([launch(payload),launch(competingPayload)]);assert.equal(conflict[0].exit_code,0);assert.equal(conflict[1].exit_code,1);assert.match(conflict[1].stderr,/REPORT_LOCATION/);
      assert.deepEqual(fileRef(exact.path),exact);command('same-attempt-original-still-valid',argsFor(fixture,'resolve',exact));
      writeJSON(path.join(evidenceRoot,'parallel-distinct-and-conflict.json'),{delivery_root:fixture.deliveryRoot,distinct_attempts:distinct,differing_same_attempt:conflict,
        rejection_layer:'REPORT_LOCATION singleton before certificate publication',preserved_accepted_ref:exact,preserved_accepted_resolution:helper.resolveFinal({...exact,delivery_root:fixture.deliveryRoot},fixture.context)});
      // Mutate actual production guard lines only in an owned mirror, then run the same case RED and restored GREEN.
      const original = fs.readFileSync(helperPath, 'utf8');
      for (const [guard, name] of [['read-context','read-context'], ['hash','drift'], ['closure','closure'], ['required-set','required-set'], ['adequate-bytes','adequate-bytes'], ['no-replace','no-replace'], ['cli-entry','cli-entry'], ['attempt-id','attempt-path']]) {
        const mirror = path.join(evidenceRoot, `mutation-${guard}`); fs.mkdirSync(path.join(mirror, 'scripts'), { recursive: true }); fs.mkdirSync(path.join(mirror, '.claude/skill-os'), { recursive: true });
        fs.copyFileSync(path.join(workRoot, '.claude/skill-os/prototype-delivery.schema.json'), path.join(mirror, '.claude/skill-os/prototype-delivery.schema.json'));
        const mutant = path.join(mirror, 'scripts/prototype-delivery.mjs');
        const matcher = guard === 'required-set'
          ? /^  requireThat\(ids\.length ===[^\n]*\n[^\n]*\/\/ guard:required-set\n/m
          : new RegExp('^.*// guard:' + guard + '\\n', 'm');
        assert.ok(matcher.test(original));
        const replacement = guard === 'cli-entry' ? "if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {\n"
          : guard === 'no-replace' ? "    try { fs.copyFileSync(temp, file); } catch (error) {\n" : '  // isolated removed guard\n';
        fs.writeFileSync(mutant, original.replace(matcher, replacement));
        const syntax = spawnSync(process.execPath, ['--check', mutant], { encoding: 'utf8' });
        const syntaxOut = path.join(evidenceRoot, guard + '-syntax.stdout');
        const syntaxErr = path.join(evidenceRoot, guard + '-syntax.stderr');
        fs.writeFileSync(syntaxOut, syntax.stdout || ''); fs.writeFileSync(syntaxErr, syntax.stderr || '');
        receipts.push({ argv: [process.execPath, '--check', mutant], exit_code: syntax.status,
          stdout_ref: fileRef(syntaxOut), stderr_ref: fileRef(syntaxErr) });
        assert.equal(syntax.status, 0, guard + ' mutant must parse before behavior testing');
        for (const [label, sourcePath, expected] of [['removed',mutant,1],['restored',helperPath,0]]) {
          const argv = [fileURLToPath(import.meta.url), '--helper', sourcePath, '--case', name];
          const result = spawnSync(process.execPath, argv, { encoding: 'utf8' });
          fs.writeFileSync(path.join(evidenceRoot, `${guard}-${label}.stdout`), result.stdout); fs.writeFileSync(path.join(evidenceRoot, `${guard}-${label}.stderr`), result.stderr);
          receipts.push({ argv: [process.execPath, ...argv], exit_code: result.status,
            stdout_ref: fileRef(path.join(evidenceRoot, guard + '-' + label + '.stdout')),
            stderr_ref: fileRef(path.join(evidenceRoot, guard + '-' + label + '.stderr')) });
          assert.equal(result.status, expected, `${guard} same-case ${label} exit`);
        }
        console.log(`PASS mutation ${guard}: removed RED, restored GREEN`);
      }
      assert.equal(fs.readFileSync(helperPath, 'utf8'), original);
    }
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
  finally { writeJSON(path.join(evidenceRoot, 'commands.json'), receipts); writeJSON(path.join(evidenceRoot, 'test-summary.json'), { exit_code: process.exitCode || 0, selected_case: selected || 'all',
    helper_ref: fileRef(helperPath), scope: 'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE', independent_native_acceptance: 'NOT_TESTED', production_pin: 'NONE' }); console.log(`Evidence: ${evidenceRoot}`); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
