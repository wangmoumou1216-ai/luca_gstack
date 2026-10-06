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
    required_behavior_results: resolved.required_behavior_refs.map(id => ({ id, status: 'PASS', expected: 'Integrity test fixture only', observed: 'Synthetic test payload', evidence_refs: [fileRef(evidence)] })),
    reviewer_provenance: { reviewer_role: 'local-test', invocation_ref: fileRef(invocation), output_ref: fileRef(output), origin: 'LOCAL_TEST_NOT_INDEPENDENT' }, status: 'PASS' };
  if (Object.hasOwn(resolved.candidate, 'processor_id')) report.processor_id = resolved.candidate.processor_id;
  const reportPath = path.join(fixture.attempt.attempt_dir, 'qa-results.json'); writeJSON(reportPath, report);
  const reportRef = fileRef(reportPath);
  const input = { candidate_ref: resolved.candidate_ref, report_ref: reportRef, delivery_root: fixture.deliveryRoot };
  return { report, reportRef, input, accepted: seal ? helper.sealAccepted(input, fixture.context) : null };
}

function inventory(root) {
  return fs.readdirSync(root, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(item => {
    const file = path.join(root, item.name);
    return item.isDirectory() ? [{ path: file, kind: 'directory' }, ...inventory(file)] :
      [{ path: file, kind: item.isSymbolicLink() ? 'symlink' : 'file', ...(item.isSymbolicLink() ? { target: fs.readlinkSync(file) } : { sha256: fileRef(file).sha256, bytes: fs.statSync(file).size }) }];
  });
}
// Synthetic notes identities test the delivery consumer, not notes behavior or production acceptance.
function createNotesFixture(root, { helper, derived = false, parentKind = 'enhanced-copy', freeze = true } = {}) {
  const parent = createDeliveryFixture(root, { helper, kind: parentKind });
  const parentLocal = derived ? createLocalIntegrityReport(parent, { helper }) : null;
  const input = { accepted_ref: parentLocal?.accepted.accepted_ref, delivery_root: parent.deliveryRoot, attempt_id: 'notes-A', processor_id: 'prototype-notes',
    scope: parent.bound.scope, methods: parent.bound.methods, authority_ref: parent.bound.authority_ref };
  const built = derived ? helper.deriveFromAccepted(input, parent.context) : {
    bound: { ...parent.bound, processor_id: 'prototype-notes' },
    attempt: helper.prepareCopy(parent.bound, { delivery_root: parent.deliveryRoot, attempt_id: input.attempt_id, processor_id: input.processor_id }, parent.context)
  };
  const context = structuredClone(parent.context); context.effects.edit_paths = ['views/drawer.html'];
  fs.appendFileSync(built.attempt.entry, '\n<!-- Synthetic notes final identity; not a behavior acceptance. -->\n');
  const spec = path.join(built.attempt.attempt_dir, 'prototype-spec.md');
  fs.writeFileSync(spec, 'New observation spec for notes final. Integrity fixture only.\n');
  const data = path.join(built.attempt.attempt_dir, 'notes-data.json'); writeJSON(data, { fixture: 'notes identity only' });
  const runtime = path.join(parent.root, 'notes-runtime.txt'), guideline = path.join(parent.root, 'notes-guideline.txt');
  fs.writeFileSync(runtime, 'Isolated runtime identity fixture\n'); fs.writeFileSync(guideline, 'Isolated guideline identity fixture\n');
  context.read_paths.push(runtime, guideline);
  const required = [...parent.resolved.required_behavior_refs, 'NOTES:offline', 'NOTES:edit'];
  const manifest = { schema_version: 1, scope: built.bound.scope, input_data_ref: fileRef(data),
    runtime: { ...fileRef(runtime), pin_or_version: 'fixture-runtime-v1' }, content_guideline: { ...fileRef(guideline), pin_or_version: 'fixture-guideline-v1' },
    required_behavior_refs: required, notes_instance_refs: ['NOTES:offline', 'NOTES:edit'],
    behavior_mapping: required.map(behavior_id => ({ behavior_id, annotation_ids: [], source_refs: ['fixture-source'] })) };
  const manifestPath = path.join(built.attempt.attempt_dir, 'notes-manifest.json'); writeJSON(manifestPath, manifest);
  const candidateInput = () => {
    const closure = built.bound.base.closure.map(item => ({ path: path.relative(parent.deliveryRoot, path.join(built.attempt.content_root, item.path)).split(path.sep).join('/'),
      sha256: fileRef(path.join(built.attempt.content_root, item.path)).sha256, bytes: fs.statSync(path.join(built.attempt.content_root, item.path)).size }));
    const operations = built.bound.base.closure.filter(item => item.sha256 !== fileRef(path.join(built.attempt.content_root, item.path)).sha256).map(item =>
      ({ path: item.path, before_sha256: item.sha256, after_sha256: fileRef(path.join(built.attempt.content_root, item.path)).sha256 }));
    const patchData = { base_sha256: built.bound.base.sha256, operations, content_changed: true }, patch = path.join(built.attempt.attempt_dir, 'patch.json'); writeJSON(patch, patchData);
    return { ...built.bound, attempt_id: built.attempt.attempt_id, processor_id: 'prototype-notes', delivery_root: parent.deliveryRoot, required_behavior_refs: required,
      notes_manifest_ref: fileRef(manifestPath), delivery: { id: built.attempt.attempt_id, kind: 'enhanced-copy', entry: path.relative(parent.deliveryRoot, built.attempt.entry).split(path.sep).join('/'),
        sha256: fileRef(built.attempt.entry).sha256, closure, spec: fileRef(spec) }, patch: { ...fileRef(patch), ...patchData } };
  };
  const fixture = { ...parent, bound: built.bound, attempt: built.attempt, context, candidateInput, parent, parentLocal, deriveInput: input, manifest, manifestPath, data, runtime, guideline };
  if (freeze) fixture.resolved = helper.checkCandidate(candidateInput(), context);
  return fixture;
}

async function main() {
  const evidenceRoot = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'luca-prototype-delivery-'));
  const retainedRoot = option('--output');
  if (retainedRoot) assert.ok(path.isAbsolute(retainedRoot) && !fs.existsSync(retainedRoot), 'Evidence output is a new exact caller-owned directory');
  const receipts = [], helperPath = path.resolve(option('--helper') || path.join(workRoot, 'scripts/prototype-delivery.mjs'));
  const caseResults = [], rejections = [], startedAt = new Date().toISOString();
  function recordProcess(label, argv, result, started_at, ended_at = new Date().toISOString()) {
    const out = path.join(evidenceRoot, `${label}.stdout`), err = path.join(evidenceRoot, `${label}.stderr`);
    fs.writeFileSync(out, result.stdout || ''); fs.writeFileSync(err, result.stderr || '');
    receipts.push({ label, argv, cwd: workRoot, started_at, ended_at, pid: result.pid || null,
      exit_code: result.status ?? result.exit_code, signal: result.signal || null, error: result.error?.message || null, stdout_ref: fileRef(out), stderr_ref: fileRef(err) });
  }
  const helper = await import(pathToFileURL(helperPath));
  const selected = option('--case');
  function command(label, args, expected = 0, entry = helperPath) {
    const start = new Date().toISOString();
    const result = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', cwd: workRoot });
    const out = path.join(evidenceRoot, `${label}.stdout`), err = path.join(evidenceRoot, `${label}.stderr`);
    fs.writeFileSync(out, result.stdout || ''); fs.writeFileSync(err, result.stderr || '');
    recordProcess(label, [process.execPath, entry, ...args], result, start);
    assert.equal(result.status, expected, `${label}: actual CLI exit code`);
    return result;
  }
  const ctxArgs = fixture => fixture.context.read_paths.flatMap(file => ['--read-path', file]);
  const argsFor = (fixture, commandName, item) => [commandName, commandName === 'candidate-check' ? '--subject' : '--accepted', item.path,
    '--sha256', item.sha256, '--delivery-root', fixture.deliveryRoot, ...ctxArgs(fixture)];
  const rejects = (fn, pattern, label) => {
    let error;
    assert.throws(() => { try { return fn(); } catch (caught) { error = caught; throw caught; } }, pattern, label);
    rejections.push({ label: label || fn.toString(), expected: String(pattern), observed: error.message });
  };
  // Generic public resource consumers; source strings are inert until the helper analyzes them.
  // Framework reports below prove identity only, never native/business acceptance.
  const resourceRows = [
  {
    "id": "html-src",
    "kind": "html",
    "code": "<img src=\"missing.png\">",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "html-base",
    "kind": "html",
    "code": "<base href=\"../\">",
    "expected": "BASE_URL_REFUSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "html-srcset",
    "kind": "html",
    "code": "<img srcset=\"../assets/empty.css 1x, missing.png 2x\">",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "svg-href",
    "kind": "html",
    "code": "<svg><image xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"missing.svg\"></image></svg>",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "object-data",
    "kind": "html",
    "code": "<object data=\"missing.html\"></object>",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "html-closed",
    "kind": "html",
    "code": "<img src=\"../assets/empty.css\"><a href=\"#local\">Go</a>",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "property-src",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.src=\"missing.js\";document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "property-constant-computed",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const key=\"s\"+\"rc\";el[key]=\"missing.js\";document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "property-dynamic-key",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el[inputKey]=\"missing.js\";document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "property-dynamic-value",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.src=inputURL;document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-src",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttribute(\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-namespace-null",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttributeNS(null,\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-namespace-xlink",
    "kind": "inline",
    "code": "const el=document.createElementNS(\"http://www.w3.org/2000/svg\",\"image\");el.setAttributeNS(\"http://www.w3.org/1999/xlink\",\"xlink:href\",\"missing.svg\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-constant-name",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const name=\"SRC\",value=\"missing.js\";el.setAttribute(name,value);document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-constant-method",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const method=\"set\"+\"Attribute\";el[method](\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-bound-alias",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const put=el.setAttribute.bind(el);put(\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-call-alias",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const put=el.setAttribute;put.call(el,\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-dynamic-name",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttribute(inputName,\"missing.js\");document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-dynamic-value",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttribute(\"src\",inputURL);document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-srcset",
    "kind": "inline",
    "code": "const el=document.createElement(\"img\");el.setAttribute(\"srcset\",\"../assets/empty.css 1x, missing.png 2x\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-style",
    "kind": "inline",
    "code": "const el=document.createElement(\"div\");el.setAttribute(\"style\",\"background-image:url(missing.png)\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-srcdoc",
    "kind": "inline",
    "code": "const el=document.createElement(\"iframe\");el.setAttribute(\"srcdoc\",'<img src=\"missing.png\">');document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-handler",
    "kind": "inline",
    "code": "const el=document.createElement(\"img\");el.setAttribute(\"onload\",'image.src=\"missing.png\"');document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-node",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const attr=document.createAttribute(\"src\");attr.value=\"missing.js\";el.setAttributeNode(attr);document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-map",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const attr=document.createAttribute(\"src\");attr.value=\"missing.js\";el.attributes.setNamedItem(attr);document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reflect-src",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Reflect.set(el,\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reflect-dynamic-key",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Reflect.set(el,inputKey,\"missing.js\");document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reflect-dynamic-value",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Reflect.set(el,\"src\",inputURL);document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "assign-src",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Object.assign(el,{src:\"missing.js\"});document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "assign-spread",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Object.assign(el,{...inputProperties});document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "define-own-data",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");Object.defineProperty(el,\"src\",{value:\"missing.js\",configurable:true});document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "innerHTML",
    "kind": "inline",
    "code": "const el=document.createElement(\"div\");el.innerHTML='<img src=\"missing.png\">';document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "sink-bound-alias",
    "kind": "inline",
    "code": "const el=document.createElement(\"div\");const put=el.insertAdjacentHTML.bind(el);put(\"beforeend\",'<img src=\"missing.png\">');document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "html-unknown",
    "kind": "inline",
    "code": "const el=document.createElement(\"div\");el.innerHTML=unknownHTML;document.body.append(el);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "document-write-alias",
    "kind": "inline",
    "code": "const put=document.write.bind(document);put('<img src=\"missing.png\">');",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "render-closed",
    "kind": "inline",
    "code": "function view(text){return `<p>${text}</p>`}document.querySelector(\"#result\").innerHTML=view(currentText);",
    "expected": "ALLOW_CURRENT_STRUCTURAL",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "fetch-static",
    "kind": "inline",
    "code": "fetch(\"missing.json\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "fetch-dynamic",
    "kind": "inline",
    "code": "fetch(inputURL);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "fetch-alias",
    "kind": "inline",
    "code": "const load=fetch;load(\"missing.json\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "fetch-call",
    "kind": "inline",
    "code": "fetch.call(globalThis,\"missing.json\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "worker-static",
    "kind": "inline",
    "code": "new Worker(\"missing.js\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "worker-alias",
    "kind": "inline",
    "code": "const Spawn=Worker;new Spawn(\"missing.js\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "import-static",
    "kind": "inline",
    "code": "import(\"missing.js\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "import-dynamic",
    "kind": "inline",
    "code": "import(moduleName);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "import-declaration",
    "kind": "module",
    "code": "import \"missing.js\";",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "url-static",
    "kind": "module",
    "code": "new URL(\"missing.js\",import.meta.url);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "inert-setter-string",
    "kind": "inline",
    "code": "const text='el.setAttribute(\"src\",\"missing.js\")';document.querySelector(\"#result\").textContent=text;",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "inert-setter-comparison",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");const same=el.setAttribute === \"missing.js\";/* el.setAttribute(\"src\",\"missing.js\") */",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "inert-data-script",
    "kind": "html",
    "code": "<script type=\"application/json\">{\"description\":\"el.setAttribute(src,missing.js)\"}</script>",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "inert-fetch-string",
    "kind": "inline",
    "code": "const text='fetch(\"missing.json\")';document.querySelector(\"#result\").textContent=text;",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "inert-css-string",
    "kind": "inline",
    "code": "const text=\"url(missing.png)\";document.querySelector(\"#result\").textContent=text;",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "plain-assign-data",
    "kind": "inline",
    "code": "const metadata={};Object.assign(metadata,{src:\"missing.js\"});document.querySelector(\"#result\").textContent=metadata.src;",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "plain-custom-setter",
    "kind": "inline",
    "code": "const metadata={setAttribute(name,value){return value}};metadata.setAttribute(\"src\",\"missing.js\");",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "attribute-closed",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttribute(\"src\",\"../assets/state-util.js\");document.body.append(el);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-unrelated",
    "kind": "inline",
    "code": "const el=document.createElement(\"script\");el.setAttribute(\"data-label\",inputText);document.body.append(el);",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "external-attribute-src",
    "kind": "external",
    "code": "const el=document.createElement(\"script\");el.setAttribute(\"src\",\"missing.js\");document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "external-property-src",
    "kind": "external",
    "code": "const el=document.createElement(\"script\");el.src=\"missing.js\";document.body.append(el);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textContent-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');s.textContent=\"body{background:url(../assets/css-guard.svg)}\";document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textContent-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');s.textContent=\"body{background:url(missing.png)}\";document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textContent-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');s.textContent=userCSS;document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerText-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerText=\"body{background:url(../assets/css-guard.svg)}\";document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerText-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerText=\"body{background:url(missing.png)}\";document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerText-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerText=userCSS;document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerHTML-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerHTML=\"body{background:url(../assets/css-guard.svg)}\";document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerHTML-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerHTML=\"body{background:url(missing.png)}\";document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-innerHTML-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');s.innerHTML=userCSS;document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textNode-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode(\"body{background:url(../assets/css-guard.svg)}\");s.appendChild(t);document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textNode-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode(\"body{background:url(missing.png)}\");s.appendChild(t);document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-textNode-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode(userCSS);s.appendChild(t);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-native-append-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');s.append(\"body{background:url(../assets/css-guard.svg)}\");document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-native-append-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');s.append(\"body{background:url(missing.png)}\");document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-native-append-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');s.append(userCSS);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-text-mutation-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.data=\"body{background:url(../assets/css-guard.svg)}\";document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-text-mutation-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.data=\"body{background:url(missing.png)}\";document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-text-mutation-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.data=userCSS;document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-characterData-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.appendData(\"body{background:url(../assets/css-guard.svg)}\");document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-characterData-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.appendData(\"body{background:url(missing.png)}\");document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-characterData-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');const t=document.createTextNode('');s.appendChild(t);t.appendData(userCSS);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-insertRule-closed",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.insertRule(\"body{background:url(../assets/css-guard.svg)}\",0);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-insertRule-missing",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.insertRule(\"body{background:url(missing.png)}\",0);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-insertRule-dynamic",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.insertRule(userCSS,0);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replaceSync-closed",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replaceSync(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replaceSync-missing",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replaceSync(\"body{background:url(missing.png)}\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replaceSync-dynamic",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replaceSync(userCSS);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replace-closed",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replace(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replace-missing",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replace(\"body{background:url(missing.png)}\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-replace-dynamic",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replace(userCSS);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-stable-alias-closed",
    "kind": "script",
    "code": "const Sheet=CSSStyleSheet;const sheet=new Sheet();const write=sheet.replaceSync.bind(sheet);write(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-stable-alias-missing",
    "kind": "script",
    "code": "const Sheet=CSSStyleSheet;const sheet=new Sheet();const write=sheet.replaceSync.bind(sheet);write(\"body{background:url(missing.png)}\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-stable-alias-dynamic",
    "kind": "script",
    "code": "const Sheet=CSSStyleSheet;const sheet=new Sheet();const write=sheet.replaceSync.bind(sheet);write(userCSS);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-stable-alias-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');const append=s.append.bind(s);append(\"body{background:url(../assets/css-guard.svg)}\");document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-stable-alias-missing",
    "kind": "script",
    "code": "const s=document.createElement('style');const append=s.append.bind(s);append(\"body{background:url(missing.png)}\");document.head.append(s);",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-stable-alias-dynamic",
    "kind": "script",
    "code": "const s=document.createElement('style');const append=s.append.bind(s);append(userCSS);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-split-text-closed",
    "kind": "script",
    "code": "const s=document.createElement('style');s.append('body{background:url(', '../assets/css-guard.svg', ')}');document.head.append(s);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-split-text-unknown",
    "kind": "script",
    "code": "const s=document.createElement('style');s.append('body{background:url(', userURL, ')}');document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-network",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replaceSync('body{background:url(https://example.invalid/missing.png)}');",
    "expected": "NETWORK_SCOPE_REFUSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-escape",
    "kind": "script",
    "code": "const s=document.createElement('style');s.textContent='body{background:url(/outside.png)}';document.head.append(s);",
    "expected": "DEPENDENCY_ESCAPE",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-ambiguous-alias",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();let write=sheet.replaceSync.bind(sheet);write=getWriter();write(userCSS);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-text-opaque-to-style",
    "kind": "script",
    "code": "const s=document.createElement('style');s.appendChild(getUnknownTextNode());document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-unknown-tag",
    "kind": "script",
    "code": "const s=document.createElement(tagName);s.textContent=userCSS;document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-inert-string",
    "kind": "script",
    "code": "const description='body{background:url(missing.png)}';const box=document.createElement('div');box.textContent=description;document.body.append(box);",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-ordinary-text",
    "kind": "script",
    "code": "const box=document.createElement('div');box.textContent=userText;document.body.append(box);",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-nonstyle-text-node",
    "kind": "script",
    "code": "const box=document.createElement('div');box.appendChild(document.createTextNode('body{background:url(missing.png)}'));document.body.append(box);",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-custom-sheet",
    "kind": "script",
    "code": "const sheet={replaceSync(value){return value}};sheet.replaceSync('body{background:url(missing.png)}');",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-plain-text-data",
    "kind": "script",
    "code": "const record={textContent:'body{background:url(missing.png)}'};record.innerText=userText;",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-inert-comparison",
    "kind": "script",
    "code": "const text='sheet.replaceSync(\\\"body{background:url(missing.png)}\\\")';if(text==='example')console.log(text);",
    "expected": "ALLOW_INERT_OR_PLAIN_TEXT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "attribute-namespace-closed",
    "kind": "script",
    "code": "const el=document.createElementNS(\"http://www.w3.org/2000/svg\",\"image\");el.setAttributeNS(\"http://www.w3.org/1999/xlink\",\"xlink:href\",\"../assets/icon.svg\");document.body.append(el);",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-network",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");el.setAttribute(\"src\",\"https://example.invalid/image.png\");",
    "expected": "NETWORK_SCOPE_REFUSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-escape",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");el.setAttribute(\"src\",\"/outside.png\");",
    "expected": "DEPENDENCY_ESCAPE",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-namespace-unsafe",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");el.setAttributeNS(\"https://example.invalid/namespace\",\"src\",\"../assets/icon.svg\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-unknown-receiver",
    "kind": "script",
    "code": "unknownElement.setAttribute(\"src\",\"../assets/icon.svg\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-native-method-overwrite",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");el.setAttribute=unknownWriter;el.setAttribute(\"src\",\"../assets/icon.svg\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-borrowed-unknown-receiver",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");const write=el.setAttribute;write.call(unknownElement,\"src\",\"../assets/icon.svg\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-prototype-borrowed-closed",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");Element.prototype.setAttribute.call(el,\"src\",\"../assets/icon.svg\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-prototype-borrowed-missing",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");Element.prototype.setAttribute.call(el,\"src\",\"missing.png\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "attribute-descriptor-setter",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,\"src\").set.call(el,\"../assets/icon.svg\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reflect-closed",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");Reflect.set(el,\"src\",\"../assets/icon.svg\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "assign-closed",
    "kind": "script",
    "code": "const el=document.createElement(\"img\");Object.assign(el,{src:\"../assets/icon.svg\"});",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "fetch-native-identity-overwrite",
    "kind": "script",
    "code": "window.fetch=unknownLoader;window.fetch(\"../assets/state-util.js\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-unknown-receiver",
    "kind": "script",
    "code": "unknownSheet.replaceSync(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-sheet-native-method-overwrite",
    "kind": "script",
    "code": "const sheet=new CSSStyleSheet();sheet.replaceSync=unknownWriter;sheet.replaceSync(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-declaration-closed",
    "kind": "script",
    "code": "const el=document.createElement(\"div\");el.style.setProperty(\"background-image\",\"url(../assets/css-guard.svg)\");",
    "expected": "ALLOW_CLOSED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-declaration-missing",
    "kind": "script",
    "code": "const el=document.createElement(\"div\");el.style.setProperty(\"background-image\",\"url(missing.png)\");",
    "expected": "MATERIAL_CLOSURE_MISSING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-declaration-dynamic",
    "kind": "script",
    "code": "const el=document.createElement(\"div\");el.style.backgroundImage=userCSS;",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-noop-clear",
    "kind": "script",
    "code": "const s=document.createElement(\"style\");s.replaceChildren();document.head.append(s);",
    "expected": "ALLOW_NO_INCOMING_RESOURCE",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-style-opaque-spread",
    "kind": "script",
    "code": "const s=document.createElement(\"style\");s.replaceChildren(...unknownNodes);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-opaque-node",
    "kind": "script",
    "code": "const s=document.createElement(\"style\");s.replaceChildren(unknownNode);document.head.append(s);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "css-style-order-unknown",
    "kind": "script",
    "code": "const s=document.createElement(\"style\");s.textContent=\"body{color:red}\";s.prepend(\"body{background:url(../assets/css-guard.svg)}\");",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "render-current-tag-text",
    "kind": "script",
    "code": "const root=document.createElement(\"div\");root.innerHTML='<span id=\"current-status\"></span>';const $=id=>document.getElementById(id);$(\"current-status\").textContent=currentText;",
    "expected": "ALLOW_CURRENT_STRUCTURAL",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "render-current-tag-style-unknown",
    "kind": "script",
    "code": "const root=document.createElement(\"div\");root.innerHTML='<style id=\"current-style\"></style>';const $=id=>document.getElementById(id);$(\"current-style\").textContent=userCSS;",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "div-noop-clear",
    "kind": "script",
    "code": "const el=document.createElement(\"div\");el.replaceChildren();document.body.append(el);",
    "expected": "ALLOW_NO_INCOMING_RESOURCE",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "plain-custom-sheet-unknown",
    "kind": "script",
    "code": "const sheet={replaceSync(value){return value}};sheet.replaceSync(userCSS);",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "plain-custom-shadow-loader",
    "kind": "script",
    "code": "const fetch=value=>value;fetch(\"missing.json\");",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "css-inert-string-replace",
    "kind": "script",
    "code": "const text=\"body{background:url(missing.png)}\";text.replace(\"body\",\"div\");",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "reader05-actual-counter",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>window.FileReader = function () { this.result = 'ghost.png'; this.readAsDataURL = function () { this.onload(); }; };\nconst reader = new FileReader();\nreader.onload = function () { document.getElementById('preview').src = reader.result; };\nreader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-global-this",
    "kind": "script",
    "code": "globalThis.FileReader=unknownConstructor;const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-global-alias",
    "kind": "script",
    "code": "const host=window;host[\"File\"+\"Reader\"]=unknownConstructor;const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-prototype-alias",
    "kind": "script",
    "code": "const NativeReader=FileReader;NativeReader.prototype.readAsDataURL=unknownRead;const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-reflect-global",
    "kind": "script",
    "code": "Reflect.set(window,\"FileReader\",unknownConstructor);const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-assign-global",
    "kind": "script",
    "code": "const bag={FileReader:unknownConstructor};Object.assign(window,bag);const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-define-global",
    "kind": "script",
    "code": "Object.defineProperty(window,\"FileReader\",{value:unknownConstructor});const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-instance-read",
    "kind": "script",
    "code": "const reader=new FileReader();reader.readAsDataURL=unknownRead;reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-instance-result",
    "kind": "script",
    "code": "const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.result=\"ghost.png\";reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-reflect-instance",
    "kind": "script",
    "code": "const reader=new FileReader();reader.onload=function(){image.src=reader.result};Reflect.set(reader,\"readAsDataURL\",unknownRead);reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-assign-instance-alias",
    "kind": "script",
    "code": "const reader=new FileReader();reader.onload=function(){image.src=reader.result};const alias=reader;Object.assign(alias,{readAsDataURL:unknownRead});reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-define-result",
    "kind": "script",
    "code": "const reader=new FileReader();reader.onload=function(){image.src=reader.result};Object.defineProperty(reader,\"result\",{get(){return \"ghost.png\"}});reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-unknown-global-key",
    "kind": "script",
    "code": "window[inputKey]=unknownConstructor;const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-reflect-alias",
    "kind": "script",
    "code": "const set=Reflect.set;set(window,\"FileReader\",unknownConstructor);const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-native-dataurl",
    "kind": "script",
    "code": "const reader=new FileReader();reader.onload=function(){image.src=reader.result};reader.readAsDataURL(file);",
    "expected": "ALLOW_NATIVE_DATAURL",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "reader05-inert-data",
    "kind": "script",
    "code": "const record={FileReader:\"ghost.png\",result:\"ghost.png\",readAsDataURL:\"example\"};Object.assign(record,{result:\"ghost.png\"});const description=\"window.FileReader=fake\";document.querySelector(\"#result\").textContent=description;",
    "expected": "ALLOW_INERT",
    "group": "inert-resource-entrypoints"
  },
  {
    "id": "r3-actual-split-reader-counter",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>window.FileReader = function () { this.result = 'ghost.png'; this.readAsDataURL = function () { this.onload(); }; };</script><script>\nconst reader = new FileReader();\nreader.onload = function () { document.getElementById('preview').src = reader.result; };\nreader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-external-effect-inline-reader",
    "kind": "html",
    "code": "<img id=\"preview\"><script src=\"../assets/r3-effect.js\"></script><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "materials": {
      "assets/r3-effect.js": "window.FileReader=unknownConstructor;"
    },
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-inline-effect-external-reader",
    "kind": "html",
    "code": "<img id=\"preview\"><script>window.FileReader=unknownConstructor;</script><script src=\"../assets/r3-reader.js\"></script>",
    "materials": {
      "assets/r3-reader.js": "const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));"
    },
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-classic-alias-effect-reader",
    "kind": "html",
    "code": "<script>const host=window;const property=\"FileReader\";</script><script>Reflect.set(host,property,unknownConstructor);</script><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-module-global-effect-reader",
    "kind": "html",
    "code": "<script type=\"module\">globalThis.FileReader=unknownConstructor;</script><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-handler-global-effect-reader",
    "kind": "html",
    "code": "<button onclick=\"window.FileReader=unknownConstructor;return false\">change</button><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-imported-effect-reader",
    "kind": "html",
    "code": "<script type=\"module\" src=\"../assets/r3-module.js\"></script><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "materials": {
      "assets/r3-module.js": "import \"./r3-effect.js\";",
      "assets/r3-effect.js": "window.FileReader=unknownConstructor;"
    },
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-native-reader-split",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const reader=new FileReader();</script><script>reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "expected": "ALLOW_NATIVE_READER_SHARED_BINDING",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-external-relative-loader-document-URL",
    "kind": "html",
    "code": "<script src=\"../assets/r3-loader.js\"></script>",
    "materials": {
      "assets/r3-loader.js": "fetch(\"state-util.js\");const image=document.createElement(\"img\");image.src=\"../assets/icon.svg\";"
    },
    "expected": "ALLOW_CLOSED_DISTINCT_RESOURCE_BASES",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r3-module-handler-local-inert",
    "kind": "html",
    "code": "<script type=\"module\">const FileReader=\"ghost.png\";const text=\"window.FileReader=fake\";</script><button onclick=\"const FileReader='ghost.png';return false\">text</button><script>const reader=new FileReader();reader.onload=function(){document.getElementById(\"preview\").src=reader.result};reader.readAsDataURL(new Blob([\"x\"]));</script>",
    "expected": "ALLOW_PRIVATE_LEXICAL_AND_INERT_DATA",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-actual-installed-handler-counter",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><button id=\"change\">change</button><script>\nconst button=document.getElementById('change');\nbutton.setAttribute('onclick', \"window.FileReader = function () { this.result = 'ghost.png'; this.readAsDataURL = function () { this.onload(); }; };\");\nbutton.click();\nconst reader = new FileReader();\nreader.onload = function () { document.getElementById('preview').src = reader.result; };\nreader.readAsDataURL(new Blob(['x']));\n</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-installed-handler-cross-script",
    "kind": "html",
    "code": "<button id=\"change\">change</button><img id=\"preview\"><script>const button=document.getElementById(\"change\");button.setAttribute(\"onclick\",\"window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};\");</script><script>const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-constant-handler-name-and-body",
    "kind": "html",
    "code": "<button id=\"change\">change</button><script>const button=document.getElementById(\"change\");const key=\"on\"+\"click\",code=\"window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};\";button.setAttribute(key,code);const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-installed-HTML-handler-effect",
    "kind": "html",
    "code": "<script>const box=document.createElement(\"div\");box.innerHTML=\"<button onclick=\\\"window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};\\\">change</button>\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-document-write-script-effect",
    "kind": "html",
    "code": "<script>document.write(\"<script>window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};<\\/script>\");const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-installed-child-document-boundary",
    "kind": "html",
    "code": "<script>const frame=document.createElement(\"iframe\");frame.setAttribute(\"srcdoc\",\"<script>window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};<\\/script>\");const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "ALLOW_DISTINCT_CHILD_DOCUMENT_NATIVE",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-safe-installed-handler-closed-material",
    "kind": "html",
    "code": "<img id=\"preview\"><button id=\"change\">change</button><script>const button=document.getElementById(\"change\");button.setAttribute(\"onclick\",\"document.getElementById('preview').src='../assets/icon.svg';return false;\");const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "ALLOW_CLOSED_HANDLER_AND_NATIVE_READER",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-installed-handler-private-lexical",
    "kind": "html",
    "code": "<button id=\"change\">change</button><script>const button=document.getElementById(\"change\");button.setAttribute(\"onclick\",\"const FileReader=\\\"ghost.png\\\";return false;\");const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "ALLOW_PRIVATE_HANDLER_LEXICAL",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-unknown-installed-handler-code",
    "kind": "html",
    "code": "<script>const button=document.createElement(\"button\");button.setAttribute(\"onclick\",futureCode);const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-inert-handler-data",
    "kind": "html",
    "code": "<script>const record={onclick:\"window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};\"};Object.assign(record,{onclick:\"window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};\"});const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "ALLOW_INERT_LITERAL_HANDLER_DATA",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r4-installed-inert-script-lexical",
    "kind": "html",
    "code": "<script>const box=document.createElement(\"div\");box.innerHTML=\"<script>window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload()};};<\\/script>\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));</script>",
    "expected": "ALLOW_INERT_INNERHTML_SCRIPT_EFFECT",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r5-installed-script-src",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-installed-script-attribute",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttribute('src','effect.js');installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-installed-script-reflect",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");Reflect.set(installed,\"src\",\"effect.js\");const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-installed-script-assign",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");Object.assign(installed,{src:\"effect.js\"});const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-safe-script-relative",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.src=\"../assets/r5-safe.js\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "ALLOW_CLOSED_NATIVE_READER",
    "group": "native-resource-entrypoints",
    "materials": {
      "assets/r5-safe.js": "fetch(\"state-util.js\");const image=document.createElement(\"img\");image.src=\"../assets/icon.svg\";"
    }
  },
  {
    "id": "r5-module-private",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.type=\"module\";installed.src=\"effect.js\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "ALLOW_PRIVATE_MODULE_LEXICAL",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "const FileReader=\"ghost.png\";export const marker=true;"
    }
  },
  {
    "id": "r5-json-inert",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.setAttribute(\"type\",\"application/json\");installed.src=\"effect.js\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "ALLOW_INERT_SCRIPT_DATA",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-image-inert",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"img\");installed.src=\"effect.js\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "ALLOW_INERT_IMAGE_MATERIAL",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-script-unknown-url",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.src=futureUrl;const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r5-script-unknown-type",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.type=futureType;installed.src=\"effect.js\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r5-script-opaque-data",
    "kind": "html",
    "code": "<img id=\"preview\"><script>const installed=document.createElement(\"script\");installed.src=\"data:text/javascript,window.FileReader=unknown\";const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));document.head.append(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints"
  },
  {
    "id": "r6-actual-namespaced-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(\"urn:notes-probe\",\"type\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r6-null-namespace-json",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(null,\"type\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_INERT_JSON",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r6-empty-namespace-json",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(\"\",\"type\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_INERT_JSON",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r6-nonnull-type-safe-native",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(\"urn:notes-probe\",\"type\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_CLOSED_NATIVE_READER",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.safeLoaded=true;"
    }
  },
  {
    "id": "r6-unknown-type-namespace",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(unknownNamespace,\"type\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r6-null-namespace-module",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(null,\"type\",\"module\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_PRIVATE_MODULE_LEXICAL",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "const FileReader=\"ghost.png\";export const safe=true;"
    }
  },
  {
    "id": "r6-null-uppercase-nonreflected-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(null,\"TYPE\",\"application/json\");installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r6-nonnull-unknown-type-value",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.setAttributeNS(\"urn:notes-probe\",\"type\",unknownMetadata);installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_INERT_TYPE_METADATA",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.safeLoaded=true;"
    }
  },
  {
    "id": "r7-actual-zero-forin-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');for (const key in {}) installed.type='application/json';installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-dowhile-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');do {installed.type='application/json';} while(false);installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-shortcircuit-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');false && (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-uncalled-function-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');function skipped(){installed.type='application/json';}installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-forin-reflect-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');for(const key in {}) Reflect.set(installed,'type','application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-forin-assign-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');for(const key in {}) Object.assign(installed,{type:'application/json'});installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-abrupt-try-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');try {throw 0;installed.type='application/json';}catch{}installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-optional-call-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');const absent=null;absent?.run(installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-stable-straight-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.type='application/json';installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_STABLE_INERT_TYPE",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r7-safe-forin-nonmaterial",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');for(const key in {}) installed.setAttribute('data-label','inert');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_CLOSED_NATIVE_READER",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.safeLoaded=true;"
    }
  },
  {
    "id": "r7-logical-assignment-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');installed.type &&= 'application/json';installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r8-actual-nested-and-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');let gate=false;gate &&= (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r8-nested-or-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');let gate=true;gate ||= (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r8-nested-nullish-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');let gate='';gate ??= (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "DYNAMIC_DEPENDENCY_UNRESOLVED",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r8-eager-ordinary-assignment-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');let gate='';gate = (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_STABLE_INERT_TYPE",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  },
  {
    "id": "r8-eager-add-assignment-type",
    "kind": "html",
    "code": "<!doctype html><img id=\"preview\"><script>const installed=document.createElement('script');let gate='';gate += (installed.type='application/json');installed.src='effect.js';installed.onload=function(){const reader=new FileReader();reader.onload=function(){document.getElementById('preview').src=reader.result};reader.readAsDataURL(new Blob(['x']));};document.head.appendChild(installed);</script>",
    "expected": "ALLOW_STABLE_INERT_TYPE",
    "group": "native-resource-entrypoints",
    "materials": {
      "views/effect.js": "window.FileReader=function(){this.result='ghost.png';this.readAsDataURL=function(){this.onload();};};"
    }
  }
];
  function resourceFixture(row) {
    const f = createDeliveryFixture(path.join(evidenceRoot, 'native-' + row.id), {helper, kind: 'adequate-copy', freeze: false});
    for (const name of ['icon.svg', 'css-guard.svg']) {
      const relative = 'assets/' + name, file = path.join(f.sourceRoot, relative);
      fs.writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
      f.bound.base.closure.push({path: relative, sha256: fileRef(file).sha256, bytes: fs.statSync(file).size}); f.context.read_paths.push(file);
    }
    for (const [relative, content] of Object.entries(row.materials || {})) {
      const file = path.join(f.sourceRoot, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, content);
      f.bound.base.closure.push({path: relative, sha256: fileRef(file).sha256, bytes: fs.statSync(file).size}); f.context.read_paths.push(file);
    }
    if (row.kind === 'external') fs.appendFileSync(path.join(f.sourceRoot, 'assets/state-util.js'), '\n' + row.code);
    else {
      const fragment = row.kind === 'html' ? row.code : '<script' + (row.kind === 'module' ? ' type="module"' : '') + '>' + row.code + '</script>';
      fs.writeFileSync(f.bound.base.entry, fixtureHTML.replace('</body>', fragment + '</body>'));
    }
    f.bound.base.sha256 = fileRef(f.bound.base.entry).sha256;
    f.bound.base.closure.forEach(item => Object.assign(item, {sha256: fileRef(path.join(f.sourceRoot, item.path)).sha256, bytes: fs.statSync(path.join(f.sourceRoot, item.path)).size}));
    const options = {delivery_root: f.deliveryRoot, attempt_id: 'native-current', processor_id: 'prototype-notes', kind: 'adequate-copy'};
    writeJSON(path.join(f.root, 'public-input.json'), {input: f.bound, context: f.context, options, row, scope: 'PUBLIC_API_INTEGRITY_ONLY_NO_NATIVE_LOAD_OR_SEMANTIC_PASS'});
    return {f, options};
  }
  function resourceFinal(f, attempt, bound) {
    const spec = path.join(attempt.attempt_dir, 'prototype-spec.md'), data = path.join(attempt.attempt_dir, 'notes-data.json');
    fs.writeFileSync(spec, 'Resource integrity only; no behavior or native QG acceptance.\n');writeJSON(data, {integrity: true});
    const runtime = path.join(f.root, 'runtime.txt'), guideline = path.join(f.root, 'guideline.txt');fs.writeFileSync(runtime, 'Synthetic runtime identity\n');fs.writeFileSync(guideline, 'Synthetic guideline identity\n');f.context.read_paths.push(runtime, guideline);
    const ids = [...requiredBehaviors, 'NOTES:resource-integrity'], manifest = path.join(attempt.attempt_dir, 'notes-manifest.json');
    writeJSON(manifest, {schema_version: 1, scope: bound.scope, input_data_ref: fileRef(data), runtime: {...fileRef(runtime), pin_or_version: 'fixture-v1'}, content_guideline: {...fileRef(guideline), pin_or_version: 'fixture-v1'}, required_behavior_refs: ids, notes_instance_refs: ['NOTES:resource-integrity'], behavior_mapping: ids.map(behavior_id => ({behavior_id, annotation_ids: [], source_refs: ['fixture-source']}))});
    const patch = path.join(attempt.attempt_dir, 'patch.json'), patchData = {base_sha256: bound.base.sha256, operations: [], content_changed: false};writeJSON(patch, patchData);
    const input = {...bound, processor_id: 'prototype-notes', attempt_id: attempt.attempt_id, delivery_root: f.deliveryRoot, required_behavior_refs: ids, notes_manifest_ref: fileRef(manifest), delivery: {id: attempt.attempt_id, kind: 'adequate-copy', entry: path.relative(f.deliveryRoot, attempt.entry).split(path.sep).join('/'), sha256: fileRef(attempt.entry).sha256, closure: bound.base.closure.map(item => ({...item, path: path.relative(f.deliveryRoot, path.join(attempt.content_root, item.path)).split(path.sep).join('/')})), spec: fileRef(spec)}, patch: {...fileRef(patch), ...patchData}};
    f.attempt = attempt;f.resolved = helper.checkCandidate(input, f.context);
    assert.equal(helper.resolveCandidateSubject({...f.resolved.candidate_ref, delivery_root: f.deliveryRoot}, f.context).processor_id, 'prototype-notes');
    const local = createLocalIntegrityReport(f, {helper});assert.equal(helper.resolveFinal({...local.accepted.accepted_ref, delivery_root: f.deliveryRoot}, f.context).final_sha256, fileRef(attempt.entry).sha256);
    return {candidate_ref: f.resolved.candidate_ref, accepted_ref: local.accepted.accepted_ref, scope: 'LOCAL_INTEGRITY_ONLY_NOT_INDEPENDENT_ACCEPTANCE'};
  }
  function runResourceRows(group) {
    const results = [], failures = [];
    for (const row of resourceRows.filter(value => value.group === group)) {
      let observed, f;
      try {
        const fixture = resourceFixture(row);f = fixture.f;
        const run = () => {const bound = helper.bindBase(f.bound, f.context), attempt = helper.prepareCopy(bound, fixture.options, f.context);return {bound, attempt}};
        if (row.expected.startsWith('ALLOW')) {
          const actual = run();assert.ok(fs.readFileSync(actual.attempt.entry).equals(fs.readFileSync(f.bound.base.entry)), row.id + ': exact copied bytes');
          observed = {returned: true, processor_id: actual.attempt.processor_id};
          if (['attribute-closed', 'css-sheet-replaceSync-closed', 'css-style-textContent-closed', 'html-closed'].includes(row.id)) observed.final = resourceFinal(f, actual.attempt, actual.bound);
        } else {
          let caught;try {run()} catch (error) {caught = error}
          observed = caught ? {error: caught.message} : {returned: true};assert.ok(caught, row.id + ': must refuse ' + row.expected);assert.match(caught.message, new RegExp(row.expected), row.id + ': exact refusal family');
          rejections.push({label: row.id, expected: row.expected, observed: caught.message});
        }
        results.push({id: row.id, expected: row.expected, observed, status: 'PASS', input_ref: fileRef(path.join(f.root, 'public-input.json'))});
      } catch (error) {failures.push(row.id);results.push({id: row.id, expected: row.expected, observed, status: 'FAIL', error: error.message, ...(f ? {input_ref: fileRef(path.join(f.root, 'public-input.json'))} : {})});}
    }
    writeJSON(path.join(evidenceRoot, group + '-observations.json'), {rows: results, generic_only: true, actual_public_bind_prepare: true, browser_native_load: 'NOT_RUN', independent_acceptance: 'NOT_RUN'});
    assert.equal(failures.length, 0, group + ': actual failures ' + failures.join(','));
  }
  const cases = {
    'native-resource-entrypoints': () => runResourceRows('native-resource-entrypoints'),
    'inert-resource-entrypoints': () => runResourceRows('inert-resource-entrypoints'),

    'js-executable-resource-assignments': () => {
      const variants = [
        ['parent04-innerHTML', '<script>const container=document.createElement("div");container.innerHTML=\'<img src="missing.png">\';document.body.append(container);</script>', /MATERIAL_CLOSURE_MISSING/],
        ['outerHTML', '<script>container.outerHTML=\'<img src="missing.png">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['iframe-srcdoc', '<script>frame.srcdoc=\'<img src="missing.png">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['iframe-srcdoc-attribute', '<iframe srcdoc="&lt;img src=&quot;missing.png&quot;&gt;"></iframe>', /MATERIAL_CLOSURE_MISSING/],
        ['range-fragment', '<script>const fragment=document.createRange().createContextualFragment(\'<img src="missing.png">\');document.body.append(fragment);</script>', /MATERIAL_CLOSURE_MISSING/],
        ['dom-parser-html', '<script>const parsed=new DOMParser().parseFromString(\'<img src="missing.png">\',"text/html");document.body.append(parsed.body.firstChild);</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-computed', '<script>const key="innerHTML",html=\'<img src="missing.png">\';container[key]=html;</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-concat', '<script>container.innerHTML="<img "+\'src="missing.png">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-template', '<script>const file="missing.png";container.innerHTML=`<img src="${file}">`;</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-append', '<script>container.innerHTML+=\'<img src="missing.png">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['adjacentHTML', '<script>container.insertAdjacentHTML("beforeend",\'<img src="missing.png">\');</script>', /MATERIAL_CLOSURE_MISSING/],
        ['adjacentHTML-computed', '<script>const method="insertAdjacentHTML";container[method]("beforeend",\'<img src="missing.png">\');</script>', /MATERIAL_CLOSURE_MISSING/],
        ['document-write', '<script>document.write(\'<img src="missing.png">\');</script>', /MATERIAL_CLOSURE_MISSING/],
        ['document-writeln', '<script>document.writeln(\'<img \',\'src="missing.png">\');</script>', /MATERIAL_CLOSURE_MISSING/],
        ['document-write-alias', '<script>const doc=document;doc.write(\'<img src="missing.png">\');</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-handler', '<button onclick="container.innerHTML=\'<img src=&quot;missing.png&quot;>\';return false">Load</button>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-nested-handler', '<script>container.innerHTML=\'<img onload="image.src=\\\'missing.png\\\'">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-srcset', '<script>container.innerHTML=\'<img srcset="../assets/empty.css 1x, missing.png 2x">\';</script>', /MATERIAL_CLOSURE_MISSING/],
        ['innerHTML-base', '<script>container.innerHTML=\'<base href="../">\';</script>', /BASE_URL_REFUSED/],
        ['innerHTML-network', '<script>container.innerHTML=\'<img src="https://example.invalid/missing.png">\';</script>', /NETWORK_SCOPE_REFUSED/],
        ['innerHTML-escape', '<script>container.innerHTML=\'<img src="../../outside.png">\';</script>', /PATH_ESCAPE/],
        ['innerHTML-dynamic', '<script>container.innerHTML=unknownHTML;</script>', /DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['adjacentHTML-dynamic', '<script>container.insertAdjacentHTML("beforeend",unknownHTML);</script>', /DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['document-write-dynamic', '<script>document.write(unknownHTML);</script>', /DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['independent03-inline-src', '<script>const resource=document.createElement("script");resource.src="../assets/missing.js";document.body.append(resource);</script>', /MATERIAL_CLOSURE_MISSING/],
        ['inline-href', '<script>const resource=document.createElement("link");resource.href="../assets/missing.css";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['inline-poster', '<script>const resource=document.createElement("video");resource.poster="../assets/missing.png";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['inline-action', '<script>const resource=document.createElement("form");resource.action="../missing.html";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['inline-srcset', '<script>const resource=document.createElement("img");resource.srcset="../assets/empty.css 1x, ../assets/missing.png 2x";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['computed-literal', '<script>resource["src"]="../assets/missing.js";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['computed-concat', '<script>resource["s"+"rc"]="../assets/"+"missing.js";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['computed-template', '<script>resource[`src`]=`../assets/missing.js`;</script>', /MATERIAL_CLOSURE_MISSING/],
        ['computed-const', '<script>const key="src",file="../assets/missing.js";resource[key]=file;</script>', /MATERIAL_CLOSURE_MISSING/],
        ['constant-template', '<script>const dir="../assets/";resource.src=`${dir}missing.js`;</script>', /MATERIAL_CLOSURE_MISSING/],
        ['nested-constant', '<script>const key="href";{const key="src";resource[key]="../assets/missing.js";}</script>', /MATERIAL_CLOSURE_MISSING/],
        ['module', '<script type="module">export const key="src";resource[key]="../assets/missing.js";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['script-mime-parameter', '<script type="text/javascript; charset=utf-8">resource.src="../assets/missing.js";</script>', /MATERIAL_CLOSURE_MISSING/],
        ['handler', '<button onclick="image.src=\'../assets/missing.png\';return false">Load</button>', /MATERIAL_CLOSURE_MISSING/],
        ['handler-computed', '<button onmouseover="const key=\'src\';image[key]=\'../assets/missing.png\';return true">Load</button>', /MATERIAL_CLOSURE_MISSING/],
        ['handler-entity', '<button onclick="image[&quot;src&quot;]=&quot;../assets/missing.png&quot;;return false">Load</button>', /MATERIAL_CLOSURE_MISSING/],
        ['inline-network', '<script>resource.src="https://example.invalid/missing.js";</script>', /NETWORK_SCOPE_REFUSED/],
        ['inline-root-absolute', '<script>resource.src="/outside.js";</script>', /DEPENDENCY_ESCAPE/],
        ['inline-escape', '<script>resource.src="../../outside.js";</script>', /PATH_ESCAPE/],
        ['inline-encoded-escape', '<script>resource.src="../%2e%2e/outside.js";</script>', /DEPENDENCY_ESCAPE/],
        ['inline-dynamic', '<script>resource.src=resourceName;</script>', /DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['handler-dynamic', '<button onclick="image.src=resourceName;return false">Load</button>', /DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['inline-parse', '<script>resource.src=;</script>', /SCRIPT_PARSE_REFUSED/],
        ['handler-parse', '<button onclick="image.src=;return false">Load</button>', /SCRIPT_PARSE_REFUSED/]
      ];
      const observations = [];
      for (const [label, fragment, expected] of variants) {
        const f=createDeliveryFixture(path.join(evidenceRoot,'js-assignment-'+label),{helper,freeze:false}),html=fixtureHTML.replace('</body>',fragment+'</body>');
        fs.writeFileSync(f.bound.base.entry,html);f.bound.base.sha256=hash(html);Object.assign(f.bound.base.closure.find(item=>item.path==='views/drawer.html'),{sha256:hash(html),bytes:Buffer.byteLength(html)});
        const input=path.join(f.root,'probe-input.json');writeJSON(input,{input:f.bound,context:f.context,fragment,expected_error:expected.source,scope:'INTEGRITY_ONLY_PUBLIC_API'});
        const invoke=()=>helper.bindBase(f.bound,f.context);let actual;try{invoke();actual='RETURNED'}catch(error){actual=error.message}
        observations.push({id:label,input_ref:fileRef(input),entry_ref:fileRef(f.bound.base.entry),actual});writeJSON(path.join(evidenceRoot,'js-resource-assignment-observations.json'),observations);
        rejects(invoke,expected);
      }
      for (const [label, code, expected] of [
        ['innerHTML','container.innerHTML=\'<img src="missing.png">\';',/MATERIAL_CLOSURE_MISSING/],
        ['adjacentHTML','container.insertAdjacentHTML("beforeend",\'<img src="missing.png">\');',/MATERIAL_CLOSURE_MISSING/],
        ['document-write','document.write(\'<img src="missing.png">\');',/MATERIAL_CLOSURE_MISSING/],
        ['dot','resource.src="./missing.js";',/MATERIAL_CLOSURE_MISSING/],
        ['computed','const key="src";resource[key]="./missing.js";',/MATERIAL_CLOSURE_MISSING/],
        ['srcset','resource.srcset="./empty.css 1x, ./missing.png 2x";',/MATERIAL_CLOSURE_MISSING/],
        ['network','resource.href="https://example.invalid/missing.css";',/NETWORK_SCOPE_REFUSED/],
        ['escape','resource.src="../../outside.js";',/PATH_ESCAPE/],
        ['dynamic','resource.src=resourceName;',/DYNAMIC_DEPENDENCY_UNRESOLVED/]
      ]) {
        const f=createDeliveryFixture(path.join(evidenceRoot,'js-external-'+label),{helper,freeze:false}),file=path.join(f.sourceRoot,'assets/state-util.js');
        fs.appendFileSync(file,'\n'+code);Object.assign(f.bound.base.closure.find(item=>item.path==='assets/state-util.js'),{sha256:fileRef(file).sha256,bytes:fs.statSync(file).size});
        const input=path.join(f.root,'probe-input.json');writeJSON(input,{input:f.bound,context:f.context,code,expected_error:expected.source,scope:'INTEGRITY_ONLY_PUBLIC_API'});
        rejects(()=>helper.bindBase(f.bound,f.context),expected);
      }
    },
    'js-resource-boundaries-and-existing-guards': () => {
      const accepted = [
        ['closed-innerHTML','<script>container.innerHTML=\'<img src="../assets/empty.css"><a href="#local">Go</a>\';</script>'],
        ['closed-outerHTML','<script>container.outerHTML=\'<img src="../assets/empty.css">\';</script>'],
        ['closed-srcdoc','<iframe srcdoc="&lt;img src=&quot;../assets/empty.css&quot;&gt;"></iframe><script>frame.srcdoc=\'<img src="../assets/empty.css">\';</script>'],
        ['closed-range-fragment','<script>document.createRange().createContextualFragment(\'<img src="../assets/empty.css">\');</script>'],
        ['closed-dom-parser','<script>new DOMParser().parseFromString(\'<img src="../assets/empty.css">\',"text/html");</script>'],
        ['closed-adjacentHTML','<script>container.insertAdjacentHTML("beforeend",\'<img src="../assets/empty.css">\');</script>'],
        ['closed-document-write','<script>document.write(\'<img \',\'src="../assets/empty.css">\');</script>'],
        ['inert-html-string','<script>const html=\'<img src="missing.png">\';container.textContent=html;const comparison=container.innerHTML === html;</script>'],
        ['non-document-writer','<script>const writer={write(value){return value}};writer.write(\'<img src="missing.png">\');</script>'],
        ['closed-inline','<script>resource.src="../assets/state-util.js";resource["href"]="../assets/empty.css";resource.poster="../assets/empty.css";resource.action="#local";resource.srcset="../assets/empty.css 1x, ../assets/extra.css 2x";</script>'],
        ['closed-handler','<button onclick="image.src=\'../assets/empty.css\';return false">Load</button>'],
        ['closed-constants','<script>const dir="../assets/",key="src";resource[key]=`${dir}state-util.js`;</script>'],
        ['closed-shadow','<script>const key="src";{const key="action";resource[key]="#local";}resource[key]="../assets/state-util.js";</script>'],
        ['inert-text','<p>resource.src="missing.png" action="missing.html"</p><!-- resource.src="missing.png" --><script>const text=\'resource.src="missing.png"\';const action="own";if(action === "own")window.own=true;const same=resource.src === "missing.png";/* resource.src="missing.png" */</script>'],
        ['inert-data-script','<script type="application/json">{"description":"resource.src=missing.png"}</script><script type="text/plain">resource.src="missing.png";</script>'],
        ['inert-handler-string','<button onclick="const text=\'image.src=missing.png\';return false">Load</button>'],
        ['external-body-inert','<script src="../assets/state.js">resource.src="missing.png";</script>'],
        ['closed-data','<script>resource.src="data:image/png;base64,AA==";</script>'],
        ['render-functions-and-map','<script>const glyphs={open:`<svg><path d="M0 0"></path></svg>`,closed:`<span>Closed</span>`};function icon(key){return glyphs[key]||""}const rows=[{title:"Current title"}];function render(){return `<section>${icon("open")}${rows.map(row=>`<p>${row.title}</p>`).join("")}</section>`}document.querySelector("#result").innerHTML=render();</script>'],
        ['render-known-material','<script>function image(item){return `<img src="${item.url}">`}const current={url:"../assets/empty.css"};container.innerHTML=image(current);</script>'],
        ['current-dom-pass-through','<script>const $=id=>document.getElementById(id);function textOf(id){const element=$(id);return element?element.innerHTML:""}const current=textOf("result");container.innerHTML=`<section>${current}</section>`;</script>'],
        ['reader-data-url','<script>const reader=new FileReader();reader.onload=()=>{container.innerHTML=`<img src="${reader.result}">`};reader.readAsDataURL(file);</script>'],
        ['reader-data-url-event','<script>const reader=new FileReader();reader.addEventListener("load",()=>{image.src=reader.result});reader.readAsDataURL(file);</script>'],
        ['render-text-not-resource','<script>function view(text){return `<p>${text}</p>`}container.innerHTML=view(futureText);</script>']
      ];
      for(const [label,fragment]of accepted){const f=createDeliveryFixture(path.join(evidenceRoot,'js-boundary-'+label),{helper,freeze:false}),html=fixtureHTML.replace('</body>',fragment+'</body>');fs.writeFileSync(f.bound.base.entry,html);f.bound.base.sha256=hash(html);Object.assign(f.bound.base.closure.find(item=>item.path==='views/drawer.html'),{sha256:hash(html),bytes:Buffer.byteLength(html)});writeJSON(path.join(f.root,'probe-input.json'),{input:f.bound,context:f.context,fragment,expected:'CURRENT_BOUND_RETURN',scope:'INTEGRITY_ONLY_PUBLIC_API'});assert.equal(helper.bindBase(f.bound,f.context).base.sha256,hash(html));}
      const external=createDeliveryFixture(path.join(evidenceRoot,'js-boundary-closed-external'),{helper,freeze:false}),script=path.join(external.sourceRoot,'assets/state-util.js');fs.appendFileSync(script,'\nconst key="src";resource[key]="../assets/state.js";resource.href="../assets/empty.css";const inert=\'resource.src="missing.png"\';');Object.assign(external.bound.base.closure.find(item=>item.path==='assets/state-util.js'),{sha256:fileRef(script).sha256,bytes:fs.statSync(script).size});assert.equal(helper.bindBase(external.bound,external.context).base.sha256,external.bound.base.sha256);
      for(const [label,fragment,expected]of [
        ['fetch-missing','<script>fetch("../assets/missing.json")</script>',/MATERIAL_CLOSURE_MISSING/],
        ['worker-missing','<script>new Worker("../assets/missing.js")</script>',/MATERIAL_CLOSURE_MISSING/],
        ['import-missing','<script type="module">import "../assets/missing.js"</script>',/MATERIAL_CLOSURE_MISSING/],
        ['import-dynamic','<script>import(moduleName)</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['worker-dynamic','<script>new Worker(workerName)</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['fetch-network','<script>fetch("https://example.invalid/x")</script>',/NETWORK_SCOPE_REFUSED/],
        ['url-missing','<script type="module">new URL("../assets/missing.js",import.meta.url)</script>',/MATERIAL_CLOSURE_MISSING/],
        ['url-dynamic','<script>new URL(resourceName,location.href)</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-static-missing','<script>function view(){return `<img src="../assets/missing.png">`}container.innerHTML=view();</script>',/MATERIAL_CLOSURE_MISSING/],
        ['render-unknown-url','<script>function view(url){return `<img src="${url}">`}container.innerHTML=view(futureURL);</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-map-unknown-url','<script>container.innerHTML=rows.map(row=>`<img src="${row.url}">`).join("");</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-object-updated-url','<script>const current={url:"../assets/empty.css"};current.url=futureURL;container.innerHTML=`<img src="${current.url}">`;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-object-spread-url','<script>const current={url:"../assets/empty.css",...futureObject};container.innerHTML=`<img src="${current.url}">`;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-mixed-arguments','<script>function image(item){return `<img src="${item.url}">`}container.innerHTML=image({url:"../assets/empty.css"});container.innerHTML=image(futureObject);</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-default-unknown','<script>function image(url="data:image/png;base64,AA=="){return `<img src="${url}">`}container.innerHTML=image(futureURL);</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-unknown-data-alternative','<script>const url=flag?"data:image/png;base64,AA==":futureURL;container.innerHTML=`<img src="${url}">`;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['render-unknown-fragment-alternative','<script>const url=flag?"#local":futureURL;resource.href=url;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['reader-text-not-data','<script>const reader=new FileReader();reader.onload=()=>{container.innerHTML=`<img src="${reader.result}">`};reader.readAsText(file);</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['reader-not-read','<script>const reader=new FileReader();reader.onload=()=>{image.src=reader.result};</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['reader-outside-load','<script>const reader=new FileReader();reader.readAsDataURL(file);container.innerHTML=`<img src="${reader.result}">`;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['reader-shadowed','<script>class FileReader{readAsDataURL(value){this.result=value}}const reader=new FileReader();reader.onload=()=>{image.src=reader.result};reader.readAsDataURL(futureURL);</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['reader-manual-load','<script>const reader=new FileReader();reader.onload=()=>{image.src=reader.result};reader.readAsDataURL(file);reader.onload();</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/],
        ['unknown-entire-html','<script>container.innerHTML=futureHTML;</script>',/DYNAMIC_DEPENDENCY_UNRESOLVED/]
      ]){const f=createDeliveryFixture(path.join(evidenceRoot,'js-existing-guard-'+label),{helper,freeze:false}),html=fixtureHTML.replace('</body>',fragment+'</body>');fs.writeFileSync(f.bound.base.entry,html);f.bound.base.sha256=hash(html);Object.assign(f.bound.base.closure.find(item=>item.path==='views/drawer.html'),{sha256:hash(html),bytes:Buffer.byteLength(html)});writeJSON(path.join(f.root,'probe-input.json'),{input:f.bound,context:f.context,fragment,expected_error:expected.source,scope:'INTEGRITY_ONLY_PUBLIC_API'});rejects(()=>helper.bindBase(f.bound,f.context),expected);}
      for(const [label,code,expected]of [['css','@import "./missing.css";',/MATERIAL_CLOSURE_MISSING/],['js','import "./missing.js";',/MATERIAL_CLOSURE_MISSING/]]){const f=createDeliveryFixture(path.join(evidenceRoot,'js-existing-external-'+label),{helper,freeze:false}),relative=label==='css'?'assets/extra.css':'assets/state-util.js',file=path.join(f.sourceRoot,relative);fs.appendFileSync(file,'\n'+code);Object.assign(f.bound.base.closure.find(item=>item.path===relative),{sha256:fileRef(file).sha256,bytes:fs.statSync(file).size});rejects(()=>helper.bindBase(f.bound,f.context),expected);}
    },

    'html-notes-actual-package': async () => {
      const notes = await import('./prototype-notes.mjs'), fixture = createDeliveryFixture(path.join(evidenceRoot,'actual-notes-package'),{helper,freeze:false});
      const source='<!doctype html><html><head><title>Actual notes package</title></head><body><button id="keep">Keep source</button></body></html>',sha=hash(source),document={schema_version:1,runtime_version:'1.0.0',content_guideline_version:'1.0.0',document_id:'20000000-0000-0000-0000-000000000001',base_revision:sha,notes_revision:0,next_display_number:1,generation_scope:null,annotations:[],provenance:{source_title:'Integrity-only package fixture',source_revision:'v1',business_revision:hash(JSON.stringify([{path:'views/drawer.html',sha256:sha}]))},validation_status:'unreviewed'},built=await notes.buildAnnotatedHtml({source,notes:document});
      assert.equal(built.ok,true,JSON.stringify(built));fs.writeFileSync(fixture.bound.base.entry,source);fixture.bound.base.sha256=sha;fixture.bound.base.closure=fixture.bound.base.closure.map(item=>item.path==='views/drawer.html'?{...item,sha256:sha,bytes:Buffer.byteLength(source)}:item);fs.writeFileSync(fixture.attempt.entry,built.value.html);
      const input=fixture.candidateInput();input.patch.operations=input.patch.operations.map(item=>({...item,before_sha256:fixture.bound.base.closure.find(base=>base.path===item.path).sha256}));const patchData={base_sha256:input.patch.base_sha256,operations:input.patch.operations,content_changed:input.patch.content_changed};writeJSON(input.patch.path,patchData);input.patch.sha256=fileRef(input.patch.path).sha256;fixture.context.effects.edit_paths=['views/drawer.html'];fs.writeFileSync(fixture.scope,'Isolated fixture authority: edit views/drawer.html for actual notes package; metadata and copy allowed here only.');fixture.bound.scope.sha256=fileRef(fixture.scope).sha256;input.scope=fixture.bound.scope;const actual=helper.checkCandidate(input,fixture.context);assert.equal(actual.final_sha256,hash(built.value.html));const extracted=await notes.extractNotes(fs.readFileSync(actual.final_entry,'utf8'));assert.equal(extracted.ok,true);assert.equal(extracted.value.source,source);assert.deepEqual(extracted.value.notes,document);fixture.resolved=actual;const local=createLocalIntegrityReport(fixture,{helper});assert.equal(helper.resolveFinal({...local.accepted.accepted_ref,delivery_root:fixture.deliveryRoot},fixture.context).final_sha256,hash(built.value.html));fs.writeFileSync(path.join(fixture.root,'package-claim.txt'),'Actual public builder/check/resolve executed. Integrity only; native semantic/human NOT_RUN.\n');
    },
    'html-actual-attributes': () => {
      const variants=[['src','<img src="../assets/missing.png">',/MATERIAL_CLOSURE_MISSING/],['href','<a href="../missing.html">Go</a>',/MATERIAL_CLOSURE_MISSING/],['poster','<video poster="../missing.png"></video>',/MATERIAL_CLOSURE_MISSING/],['action','<form action="../missing.html"></form>',/MATERIAL_CLOSURE_MISSING/],['srcset','<img srcset="../assets/empty.css 1x, ../missing.png 2x">',/MATERIAL_CLOSURE_MISSING/],['base','<base href="../">',/BASE_URL_REFUSED/],['network','<img src="https://example.invalid/image.png">',/NETWORK_SCOPE_REFUSED/],['encoded-network','<a href="&#x68;ttps://example.invalid/x">Go</a>',/NETWORK_SCOPE_REFUSED/],['escape','<img src="../../escape.png">',/PATH_ESCAPE/],['template','<template><img src="../missing.png"></template>',/MATERIAL_CLOSURE_MISSING/]];
      for(const [label,html,expected]of variants){const f=createDeliveryFixture(path.join(evidenceRoot,'actual-attribute-'+label),{helper,freeze:false}),bytes=fixtureHTML.replace('</body>',html+'</body>');fs.writeFileSync(f.bound.base.entry,bytes);f.bound.base.sha256=hash(bytes);f.bound.base.closure=f.bound.base.closure.map(item=>item.path==='views/drawer.html'?{...item,sha256:hash(bytes),bytes:Buffer.byteLength(bytes)}:item);rejects(()=>helper.bindBase(f.bound,f.context),expected);}
      const f=createDeliveryFixture(path.join(evidenceRoot,'attribute-text-positive'),{helper,freeze:false}),bytes=fixtureHTML.replace('</body>','<!-- action="missing.html" src="missing.png" <base href="../"> --><script>const action="local";if(action === "local") window.fixtureLocal=true;const inert="src=missing.png";</script><template><a href="../assets/empty.css">Closed local material</a></template></body>');fs.writeFileSync(f.bound.base.entry,bytes);f.bound.base.sha256=hash(bytes);f.bound.base.closure=f.bound.base.closure.map(item=>item.path==='views/drawer.html'?{...item,sha256:hash(bytes),bytes:Buffer.byteLength(bytes)}:item);assert.equal(helper.bindBase(f.bound,f.context).base.sha256,hash(bytes));
    },
    'processor-namespace': () => {
      const f = createDeliveryFixture(path.join(evidenceRoot, 'processor-namespace'), { helper });
      assert.equal(f.resolved.processor_id, 'motion-polish');
      assert.ok(!Object.hasOwn(f.resolved.candidate, 'processor_id'), 'Legacy candidate bytes acquire no default field');
      const explicit = helper.prepareCopy(f.bound, { delivery_root: f.deliveryRoot, attempt_id: 'explicit-motion', processor_id: 'motion-polish' }, f.context);
      assert.equal(explicit.attempt_dir, path.join(f.deliveryRoot, 'motion-polish/explicit-motion'));
      for (const processor_id of ['unknown', '', null, 0, 'notes', '../motion-polish']) {
        const before = inventory(f.root);
        rejects(() => helper.bindBase({ ...f.bound, processor_id }, f.context), /PROCESSOR_ID/);
        rejects(() => helper.prepareCopy(f.bound, { delivery_root: f.deliveryRoot, attempt_id: 'bad', processor_id }, f.context), /PROCESSOR_ID/);
        rejects(() => helper.checkCandidate({ ...f.resolved.candidate, processor_id }, f.context), /PROCESSOR_ID|SCHEMA/);
        assert.deepEqual(inventory(f.root), before, 'Unknown processor publishes nothing');
      }
    },
    'raw-notes': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'raw-notes'), { helper });
      assert.equal(f.attempt.attempt_dir, path.join(f.deliveryRoot, 'prototype-notes/notes-A'));
      assert.equal(f.resolved.parent_accepted_ref, null); assert.equal(f.resolved.processor_id, 'prototype-notes');
      command('raw-notes-preaccept', argsFor(f, 'candidate-check', f.resolved.candidate_ref));
      const local = createLocalIntegrityReport(f, { helper });
      const resolved = JSON.parse(command('raw-notes-resolve', argsFor(f, 'resolve', local.accepted.accepted_ref)).stdout);
      assert.equal(resolved.final_entry, f.attempt.entry); assert.deepEqual(resolved.notes_manifest_ref, fileRef(f.manifestPath));
      assert.equal(path.dirname(local.accepted.accepted_ref.path), f.attempt.attempt_dir);
      assert.equal(path.dirname(local.reportRef.path), f.attempt.attempt_dir);
      for (const item of f.bound.base.closure) assert.equal(fileRef(path.join(f.sourceRoot, item.path)).sha256, item.sha256);
      rejects(() => helper.prepareCopy(f.bound, { delivery_root: f.deliveryRoot, attempt_id: 'notes-A', processor_id: 'prototype-notes' }, f.context), /ATTEMPT_EXISTS/);
      rejects(() => helper.prepareCopy(f.bound, { delivery_root: f.deliveryRoot, attempt_id: 'original', processor_id: 'prototype-notes', kind: 'adequate-original' }, f.context), /PROCESSOR_KIND/);
      const project = path.join(evidenceRoot, 'raw-project'), rawRoot = path.join(project, 'docs/prototype/2026-10-04-topic'), notesRoot = rawRoot + '-notes';
      fs.mkdirSync(notesRoot, { recursive: true }); fs.cpSync(f.sourceRoot, rawRoot, { recursive: true });
      const raw = structuredClone(f.parent.bound); raw.base.asset_root = rawRoot; raw.base.entry = path.join(rawRoot, raw.base.entry_relative);
      raw.base.spec = fileRef(path.join(rawRoot, 'prototype-spec.md')); raw.base.origin = 'open-design';
      const context = { ...f.context, read_paths: [...f.context.read_paths, ...raw.base.closure.map(item => path.join(rawRoot, item.path))],
        effects: { ...f.context.effects, framework_fixture: false, verified_active_project: true, canonical_project_root: project, authorized_delivery_root: notesRoot } };
      const copy = helper.prepareCopy(helper.bindBase(raw, context), { delivery_root: notesRoot, attempt_id: 'sibling', processor_id: 'prototype-notes' }, context);
      assert.ok(fs.existsSync(copy.entry)); assert.equal(copy.content_root, path.join(notesRoot, 'prototype-notes/sibling/content'));
      const unrelated = path.join(project, 'docs/prototype/2026-10-04-other-notes'); fs.mkdirSync(unrelated);
      rejects(() => helper.prepareCopy(raw, { delivery_root: unrelated, attempt_id: 'bad-topic', processor_id: 'prototype-notes' },
        { ...context, effects: { ...context.effects, authorized_delivery_root: unrelated } }), /NOTES_RAW_ROOT/);
      for (const delivery_root of [rawRoot, path.dirname(rawRoot), path.join(rawRoot, 'nested')]) {
        fs.mkdirSync(delivery_root, { recursive: true });
        rejects(() => helper.prepareCopy(raw, { delivery_root, attempt_id: 'overlap', processor_id: 'prototype-notes' },
          { ...context, effects: { ...context.effects, framework_fixture: true, authorized_delivery_root: delivery_root } }), /SOURCE_OUTPUT_OVERLAP/);
      }
      const link = notesRoot + '-link'; fs.symlinkSync(notesRoot, link);
      rejects(() => helper.prepareCopy(raw, { delivery_root: link, attempt_id: 'link', processor_id: 'prototype-notes' }, context), /SYMLINK_REFUSED/);
      rejects(() => helper.prepareCopy(raw, { delivery_root: notesRoot + '/../escape', attempt_id: 'escape', processor_id: 'prototype-notes' }, context), /PATH_ESCAPE/);
    },
    'notes-authority': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'notes-authority'), { helper, derived: true });
      const input = { ...f.deriveInput, attempt_id: 'no-effect' };
      for (const name of ['copy', 'edit', 'metadata']) {
        const context = { ...f.context, effects: { ...f.context.effects, [name]: false } }, before = inventory(f.root);
        rejects(() => helper.deriveFromAccepted(input, context), /EFFECT_REFUSED/);
        assert.deepEqual(inventory(f.root), before);
        rejects(() => helper.prepareCopy(f.parent.bound, { delivery_root: f.deliveryRoot, attempt_id: 'raw-' + name, processor_id: 'prototype-notes' }, context), /EFFECT_REFUSED/);
      }
      rejects(() => helper.deriveFromAccepted(input, { ...f.context, effects: undefined }), /EFFECT_SCOPE_REQUIRED/);
      rejects(() => helper.deriveFromAccepted(input, { ...f.context, read_paths: [] }), /READ_SCOPE_REFUSED/);
      const deniedRead = { ...f.context, read_paths: f.context.read_paths.filter(file => file !== f.source) };
      const local = createLocalIntegrityReport(f, { helper, seal: false });
      for (const call of [() => helper.checkCandidate(f.resolved.candidate, deniedRead), () => helper.resolveCandidateSubject({ ...f.resolved.candidate_ref, delivery_root: f.deliveryRoot }, deniedRead),
        () => helper.sealAccepted(local.input, deniedRead)]) rejects(call, /READ_SCOPE_REFUSED/);
      rejects(() => helper.checkCandidate(f.resolved.candidate, { ...f.context, effects: { ...f.context.effects, edit: false } }), /EFFECT_REFUSED/);
      rejects(() => helper.checkCandidate(f.resolved.candidate, { ...f.context, effects: { ...f.context.effects, metadata: false } }), /EFFECT_REFUSED/);
      rejects(() => helper.checkCandidate(f.resolved.candidate, { ...f.context, effects: { ...f.context.effects, edit_paths: [] } }), /EDIT_SCOPE_REFUSED/);
      rejects(() => helper.sealAccepted(local.input, { ...f.context, effects: { ...f.context.effects, edit: false } }), /EFFECT_REFUSED/);
      rejects(() => helper.sealAccepted(local.input, { ...f.context, effects: { ...f.context.effects, metadata: false } }), /EFFECT_REFUSED/);
      const accepted = helper.sealAccepted(local.input, f.context);
      rejects(() => helper.resolveFinal({ ...accepted.accepted_ref, delivery_root: f.deliveryRoot }, deniedRead), /READ_SCOPE_REFUSED/);
      assert.match(command('notes-no-read-cli', ['resolve', '--accepted', accepted.accepted_ref.path, '--sha256', accepted.accepted_ref.sha256, '--delivery-root', f.deliveryRoot], 1).stderr, /READ_SCOPE_REFUSED/);
      assert.equal(helper.resolveFinal({ ...accepted.accepted_ref, delivery_root: f.deliveryRoot }, { read_paths: f.context.read_paths }).final_entry, f.attempt.entry, 'Read-only consumers require reads; no edit effect is performed');
    },
    'accepted-motion-notes': () => {
      for (const parentKind of ['adequate-original', 'adequate-copy', 'enhanced-copy']) {
        const f = createNotesFixture(path.join(evidenceRoot, 'accepted-motion-notes-' + parentKind), { helper, derived: true, parentKind });
        const before = inventory(f.parent.attempt.attempt_dir), raw = inventory(f.sourceRoot);
        assert.equal(f.bound.base.entry, f.parentLocal.accepted.final_entry);
        assert.equal(f.bound.base.sha256, f.parentLocal.accepted.final_sha256);
        assert.deepEqual(f.bound.base.recovery_ref, f.parent.bound.base.recovery_ref);
        assert.deepEqual(f.resolved.parent_accepted_ref, f.parentLocal.accepted.accepted_ref);
        assert.notEqual(f.bound.base.asset_root, f.attempt.content_root);
        assert.ok(!f.attempt.content_root.startsWith(f.bound.base.asset_root + path.sep));
        command(parentKind + '-notes-candidate', argsFor(f, 'candidate-check', f.resolved.candidate_ref));
        const local = createLocalIntegrityReport(f, { helper });
        const result = JSON.parse(command(parentKind + '-notes-final', argsFor(f, 'resolve', local.accepted.accepted_ref)).stdout);
        assert.deepEqual(result.parent_accepted_ref, f.parentLocal.accepted.accepted_ref); assert.equal(result.final_entry, f.attempt.entry);
        assert.deepEqual(inventory(f.parent.attempt.attempt_dir), before); assert.deepEqual(inventory(f.sourceRoot), raw);
        assert.ok(!fs.readFileSync(f.attempt.entry, 'utf8').includes(f.root), 'User HTML contains no local metadata path');
      }
    },
    'derived-refusals': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'derived-refusals'), { helper, derived: true });
      const input = { ...f.deriveInput, attempt_id: 'refusal' };
      for (const processor_id of ['unknown', 'motion-polish', null]) rejects(() => helper.deriveFromAccepted({ ...input, processor_id }, f.context), /PROCESSOR_ID|PROCESSOR_TRANSITION/);
      rejects(() => helper.deriveFromAccepted({ ...input, base: f.bound.base }, f.context), /DERIVATION_INPUT/);
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: f.parent.resolved.candidate_ref }, f.context), /SCHEMA/);
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: fileRef(f.parent.bound.base.entry) }, f.context), /SCHEMA|Unexpected token/);
      const fake = path.join(f.deliveryRoot, 'fake-accepted.json'); writeJSON(fake, JSON.parse(fs.readFileSync(f.parentLocal.accepted.accepted_ref.path)));
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: fileRef(fake) }, f.context), /CERTIFICATE_MISMATCH/);
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: { ...input.accepted_ref, sha256: '0'.repeat(64) } }, f.context), /HASH_DRIFT/);
      rejects(() => helper.deriveFromAccepted({ ...input, attempt_id: 'notes-A' }, f.context), /ATTEMPT_EXISTS/);
      const otherRoot = path.join(f.root, 'other-root'); fs.mkdirSync(otherRoot);
      rejects(() => helper.deriveFromAccepted({ ...input, delivery_root: otherRoot }, { ...f.context, read_roots: [f.deliveryRoot], effects: { ...f.context.effects, authorized_delivery_root: otherRoot } }), /ACCEPTED_OUTSIDE_ROOT|SUBJECT_PATH_MISMATCH/);
      const notesLocal = createLocalIntegrityReport(f, { helper });
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: notesLocal.accepted.accepted_ref }, f.context), /PARENT_PROCESSOR/);
      rejects(() => helper.checkCandidate({ ...f.resolved.candidate, parent_accepted_ref: notesLocal.accepted.accepted_ref }, f.context), /PARENT_PROCESSOR/);
      rejects(() => helper.bindBase(f.bound, f.context), /DERIVATION_ENTRY_REQUIRED/);
      rejects(() => helper.prepareCopy(f.bound, { delivery_root: f.deliveryRoot, attempt_id: 'fake-copy', processor_id: 'prototype-notes' }, f.context), /DERIVATION_ENTRY_REQUIRED/);
      for (const attempt_id of ['../motion-polish/attempt-A', '.', '', '/absolute']) rejects(() => helper.deriveFromAccepted({ ...input, attempt_id }, f.context), /ATTEMPT_ID|PATH_ESCAPE/);
      const link = path.join(f.deliveryRoot, 'prototype-notes/refusal'); fs.symlinkSync(f.parent.attempt.content_root, link);
      rejects(() => helper.deriveFromAccepted(input, f.context), /SYMLINK_REFUSED/); fs.unlinkSync(link);
      const parentLink = path.join(f.deliveryRoot, 'accepted-link.json'); fs.symlinkSync(input.accepted_ref.path, parentLink);
      rejects(() => helper.deriveFromAccepted({ ...input, accepted_ref: { ...input.accepted_ref, path: parentLink } }, f.context), /SYMLINK_REFUSED/);
      const forged = structuredClone(f.resolved.candidate); forged.base.recovery_ref.sha256 = '0'.repeat(64);
      rejects(() => helper.checkCandidate(forged, f.context), /PARENT_BASE_MISMATCH/);
      const motion = { ...f.parent.resolved.candidate, parent_accepted_ref: input.accepted_ref };
      rejects(() => helper.checkCandidate(motion, f.context), /PARENT_PROCESSOR/);
    },
    'parent-chain-drift': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'parent-chain-drift'), { helper, derived: true });
      const local = createLocalIntegrityReport(f, { helper });
      const targets = [f.source, f.parent.bound.base.entry, f.parentLocal.accepted.final_entry, f.parent.resolved.spec_path, f.parentLocal.accepted.accepted_ref.path,
        f.parent.resolved.candidate_ref.path, f.parentLocal.reportRef.path, f.parent.recovery];
      for (const [index, target] of targets.entries()) {
        const saved = fs.readFileSync(target); fs.appendFileSync(target, '\nPARENT-DRIFT\n');
        for (const call of [() => helper.checkCandidate(f.resolved.candidate, f.context), () => helper.resolveCandidateSubject({ ...f.resolved.candidate_ref, delivery_root: f.deliveryRoot }, f.context),
          () => helper.sealAccepted(local.input, f.context), () => helper.resolveFinal({ ...local.accepted.accepted_ref, delivery_root: f.deliveryRoot }, f.context)]) rejects(call, /HASH_DRIFT/);
        assert.match(command('notes-parent-drift-' + index, argsFor(f, 'validate', local.accepted.accepted_ref), 1).stderr, /HASH_DRIFT/);
        fs.writeFileSync(target, saved);
      }
      command('notes-parent-chain-restored', argsFor(f, 'resolve', local.accepted.accepted_ref));
      const alternate = helper.prepareCopy(f.parent.bound, { delivery_root: f.deliveryRoot, attempt_id: 'alternate-motion' }, f.parent.context);
      fs.writeFileSync(path.join(alternate.content_root, 'assets/base.css'), enhancedCSS);
      const alternateInput = structuredClone(f.parent.resolved.candidate); delete alternateInput.methods_ref;
      alternateInput.attempt_id = alternate.attempt_id; alternateInput.delivery.id = alternate.attempt_id;
      alternateInput.delivery.entry = alternateInput.delivery.entry.replace('/attempt-A/', '/alternate-motion/');
      alternateInput.delivery.closure = alternateInput.delivery.closure.map(item => ({ ...item, path: item.path.replace('/attempt-A/', '/alternate-motion/') }));
      const spec = path.join(alternate.attempt_dir, 'prototype-spec.md'), patch = path.join(alternate.attempt_dir, 'patch.json');
      fs.copyFileSync(f.parent.resolved.spec_path, spec); fs.copyFileSync(f.parent.resolved.candidate.patch.path, patch);
      alternateInput.delivery.spec = fileRef(spec); Object.assign(alternateInput.patch, fileRef(patch));
      const alternateFixture = { ...f.parent, attempt: alternate, resolved: helper.checkCandidate(alternateInput, f.parent.context) };
      const alternateLocal = createLocalIntegrityReport(alternateFixture, { helper });
      assert.equal(alternateLocal.accepted.final_sha256, f.parentLocal.accepted.final_sha256, 'Other accepted parent can have identical HTML bytes');
      rejects(() => helper.checkCandidate({ ...f.resolved.candidate, parent_accepted_ref: alternateLocal.accepted.accepted_ref }, f.context), /PARENT_BASE_MISMATCH/);
      const wrong = structuredClone(f.resolved.candidate); wrong.base.spec = wrong.delivery.spec;
      rejects(() => helper.checkCandidate(wrong, f.context), /PARENT_BASE_MISMATCH/);
      const parentless = structuredClone(f.resolved.candidate); delete parentless.parent_accepted_ref;
      rejects(() => helper.checkCandidate(parentless, f.context), /NOTES_RAW_ROOT|SOURCE_OUTPUT_OVERLAP/);
    },
    'derived-copy-drift': () => {
      for (const where of ['source', 'parent']) {
        const f = createDeliveryFixture(path.join(evidenceRoot, 'derived-copy-drift-' + where), { helper }), local = createLocalIntegrityReport(f, { helper });
        const input = { accepted_ref: local.accepted.accepted_ref, delivery_root: f.deliveryRoot, attempt_id: 'during-copy', processor_id: 'prototype-notes', scope: f.bound.scope, methods: f.bound.methods, authority_ref: f.bound.authority_ref };
        const target = where === 'source' ? f.source : local.accepted.final_entry, saved = fs.readFileSync(target), write = fs.writeFileSync;
        let changed = false;
        fs.writeFileSync = (file, ...args) => { if (!changed && String(file).includes('/prototype-notes/during-copy/content/')) { changed = true; fs.appendFileSync(target, '\nDRIFT-DURING-COPY\n'); } return write(file, ...args); };
        try { rejects(() => helper.deriveFromAccepted(input, f.context), /HASH_DRIFT/); } finally { fs.writeFileSync = write; fs.writeFileSync(target, saved); }
        assert.ok(changed, 'Fault occurs during actual helper copy');
        assert.ok(!fs.existsSync(path.join(f.deliveryRoot, 'prototype-notes/during-copy/candidate-subject.json')));
        assert.equal(helper.resolveFinal({ ...local.accepted.accepted_ref, delivery_root: f.deliveryRoot }, f.context).final_entry, local.accepted.final_entry);
      }
    },
    'notes-manifest': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'notes-manifest'), { helper, derived: true, freeze: false });
      const valid = f.candidateInput();
      rejects(() => { const v = structuredClone(valid); delete v.notes_manifest_ref; return helper.checkCandidate(v, f.context); }, /NOTES_MANIFEST_REQUIRED/);
      for (const change of [m => m.required_behavior_refs.pop(), m => m.behavior_mapping.pop(), m => m.behavior_mapping.push(m.behavior_mapping[0]), m => m.notes_instance_refs.pop(),
        m => m.notes_instance_refs.push('NOTES:absent'), m => m.scope.sha256 = '0'.repeat(64), m => m.input_data_ref.sha256 = '0'.repeat(64),
        m => m.runtime.pin_or_version = '', m => m.content_guideline.sha256 = '0'.repeat(64)]) {
        const m = structuredClone(f.manifest); change(m); writeJSON(f.manifestPath, m);
        rejects(() => helper.checkCandidate({ ...valid, notes_manifest_ref: fileRef(f.manifestPath) }, f.context), /NOTES_REQUIRED_SET_MISMATCH|NOTES_SCOPE_MISMATCH|HASH_DRIFT|SCHEMA/);
      }
      const omit = f.parent.resolved.required_behavior_refs[0], reduced = structuredClone(f.manifest); reduced.required_behavior_refs = reduced.required_behavior_refs.filter(id => id !== omit); reduced.behavior_mapping = reduced.behavior_mapping.filter(item => item.behavior_id !== omit);
      writeJSON(f.manifestPath, reduced);
      rejects(() => helper.checkCandidate({ ...valid, notes_manifest_ref: fileRef(f.manifestPath), required_behavior_refs: reduced.required_behavior_refs }, f.context), /PARENT_REQUIRED_MISSING/);
      writeJSON(f.manifestPath, f.manifest);
      const inContent = path.join(f.attempt.content_root, 'notes-manifest.json'); fs.copyFileSync(f.manifestPath, inContent);
      const inside = structuredClone(valid), newFile = { path: path.relative(f.deliveryRoot, inContent).split(path.sep).join('/'), sha256: fileRef(inContent).sha256, bytes: fs.statSync(inContent).size };
      inside.delivery.closure.push(newFile); inside.patch.operations.push({ path: 'notes-manifest.json', before_sha256: null, after_sha256: newFile.sha256 });
      writeJSON(inside.patch.path, { base_sha256: inside.patch.base_sha256, operations: inside.patch.operations, content_changed: true }); Object.assign(inside.patch, fileRef(inside.patch.path));
      rejects(() => helper.checkCandidate({ ...inside, notes_manifest_ref: fileRef(inContent) }, f.context), /NOTES_MANIFEST_LOCATION/); fs.unlinkSync(inContent);
      writeJSON(valid.patch.path, { base_sha256: valid.patch.base_sha256, operations: valid.patch.operations, content_changed: true });
      const locationProbes = [];
      for (const [id, location, manifestSeparators, specSeparators, expected] of [
        ['content-canonical', 'content', 1, 1, 'NOTES_MANIFEST_LOCATION'],
        ['content-double-separator', 'content', 2, 1, 'NOTES_MANIFEST_LOCATION'],
        ['content-triple-separator', 'content', 3, 1, 'NOTES_MANIFEST_LOCATION'],
        ['same-spec-canonical', 'same-spec', 1, 1, 'NOTES_MANIFEST_LOCATION'],
        ['same-spec-manifest-alias', 'same-spec', 2, 1, 'NOTES_MANIFEST_LOCATION'],
        ['same-spec-spec-alias', 'same-spec', 1, 2, 'NOTES_MANIFEST_LOCATION'],
        ['same-spec-both-aliases', 'same-spec', 2, 3, 'NOTES_MANIFEST_LOCATION'],
        ['metadata-distinct-alias', 'metadata', 2, 2, 'ACCEPTED'],
        ['explicit-dot-segment', 'dot', 1, 1, 'PATH_ESCAPE'],
        ['explicit-parent-segment', 'escape', 1, 1, 'PATH_ESCAPE'],
        ['metadata-symlink', 'symlink', 1, 1, 'SYMLINK_REFUSED']
      ]) {
        const probe = createNotesFixture(path.join(evidenceRoot, 'manifest-location-' + id), { helper, derived: true, freeze: false });
        const input = probe.candidateInput(), alias = (name, separators) => probe.attempt.attempt_dir + '/'.repeat(separators) + name;
        let manifestFile = probe.manifestPath;
        if (location === 'content') {
          manifestFile = path.join(probe.attempt.content_root, 'notes-manifest.json'); fs.copyFileSync(probe.manifestPath, manifestFile);
          const item = { path: path.relative(probe.deliveryRoot, manifestFile).split(path.sep).join('/'), sha256: fileRef(manifestFile).sha256, bytes: fs.statSync(manifestFile).size };
          input.delivery.closure.push(item); input.patch.operations.push({ path: 'notes-manifest.json', before_sha256: null, after_sha256: item.sha256 });
          writeJSON(input.patch.path, { base_sha256: input.patch.base_sha256, operations: input.patch.operations, content_changed: true }); Object.assign(input.patch, fileRef(input.patch.path));
          probe.context.effects.edit_paths.push('notes-manifest.json');
        }
        if (location === 'same-spec') input.delivery.spec = { ...fileRef(manifestFile), path: alias('notes-manifest.json', specSeparators) };
        else if (location === 'metadata') input.delivery.spec.path = alias('prototype-spec.md', specSeparators);
        if (location === 'symlink') { manifestFile = path.join(probe.attempt.attempt_dir, 'manifest-link.json'); fs.symlinkSync(probe.manifestPath, manifestFile); }
        input.notes_manifest_ref = { ...fileRef(manifestFile), path: location === 'content' ? alias('content/notes-manifest.json', manifestSeparators) :
          location === 'dot' ? alias('./notes-manifest.json', 1) : location === 'escape' ? alias('content/../notes-manifest.json', 1) :
          location === 'symlink' ? manifestFile : alias('notes-manifest.json', manifestSeparators) };
        const observe = fn => { try { fn(); return 'ACCEPTED'; } catch (error) { return error.message; } };
        const checked = observe(() => helper.checkCandidate(input, probe.context));
        const subject = path.join(probe.attempt.attempt_dir, 'candidate-subject.json');
        // An untrusted resolver input is caller-written only after the writer refuses it; no accepted certificate is fabricated.
        if (!fs.existsSync(subject)) writeJSON(subject, { schema_version: 1, kind: 'preaccept-candidate', ...input, methods_ref: fileRef(path.join(probe.attempt.attempt_dir, 'methods.json')) });
        const resolved = observe(() => helper.resolveCandidateSubject({ ...fileRef(subject), delivery_root: probe.deliveryRoot }, { ...probe.context, effects: {} }));
        locationProbes.push({ id, expected, checked, resolved, manifest_ref: input.notes_manifest_ref, spec_ref: input.delivery.spec,
          physical_manifest_path: fs.realpathSync(manifestFile), physical_spec_path: fs.realpathSync(input.delivery.spec.path), subject_ref: fileRef(subject) });
      }
      writeJSON(path.join(evidenceRoot, 'manifest-location-probes.json'), locationProbes);
      for (const probe of locationProbes) for (const consumer of ['checked', 'resolved']) {
        assert.ok(probe.expected === 'ACCEPTED' ? probe[consumer] === 'ACCEPTED' : probe[consumer].startsWith(probe.expected + ':'), `${probe.id} ${consumer}: expected ${probe.expected}, observed ${probe[consumer]}`);
      }
      rejects(() => helper.checkCandidate({ ...valid, notes_manifest_ref: { path: f.parent.resolved.spec_path, sha256: fileRef(f.parent.resolved.spec_path).sha256 } }, f.context), /NOTES_MANIFEST_LOCATION/);
      const motion = { ...f.parent.resolved.candidate, notes_manifest_ref: fileRef(f.manifestPath) };
      rejects(() => helper.checkCandidate(motion, f.context), /NOTES_PROCESSOR_REQUIRED/);
      f.resolved = helper.checkCandidate({ ...valid, notes_manifest_ref: fileRef(f.manifestPath) }, f.context);
      const local = createLocalIntegrityReport(f, { helper });
      for (const target of [f.manifestPath, f.data, f.runtime, f.guideline]) {
        const saved = fs.readFileSync(target); fs.appendFileSync(target, '\nMANIFEST-DRIFT\n');
        rejects(() => helper.resolveCandidateSubject({ ...f.resolved.candidate_ref, delivery_root: f.deliveryRoot }, f.context), /HASH_DRIFT/);
        rejects(() => helper.resolveFinal({ ...local.accepted.accepted_ref, delivery_root: f.deliveryRoot }, f.context), /HASH_DRIFT/);
        fs.writeFileSync(target, saved);
      }
      assert.equal(helper.resolveFinal({ ...local.accepted.accepted_ref, delivery_root: f.deliveryRoot }, f.context).final_entry, f.attempt.entry);
    },
    'notes-report-certificate': () => {
      const f = createNotesFixture(path.join(evidenceRoot, 'notes-report-certificate'), { helper, derived: true });
      const local = createLocalIntegrityReport(f, { helper, seal: false }), saved = fs.readFileSync(local.reportRef.path);
      for (const processor_id of [undefined, 'motion-polish', 'unknown']) {
        const report = structuredClone(local.report); if (processor_id === undefined) delete report.processor_id; else report.processor_id = processor_id;
        writeJSON(local.reportRef.path, report);
        rejects(() => helper.sealAccepted({ ...local.input, report_ref: fileRef(local.reportRef.path) }, f.context), /REPORT_PROCESSOR_MISMATCH|SCHEMA/);
      }
      fs.writeFileSync(local.reportRef.path, saved); const accepted = helper.sealAccepted(local.input, f.context), cert = fs.readFileSync(accepted.accepted_ref.path);
      for (const change of [c => delete c.processor_id, c => c.processor_id = 'motion-polish', c => delete c.parent_accepted_ref, c => c.notes_manifest_ref.sha256 = '0'.repeat(64)]) {
        const value = JSON.parse(cert); change(value); writeJSON(accepted.accepted_ref.path, value);
        rejects(() => helper.resolveFinal({ ...fileRef(accepted.accepted_ref.path), delivery_root: f.deliveryRoot }, f.context), /CERTIFICATE_PROCESSOR_MISMATCH/);
      }
      fs.writeFileSync(accepted.accepted_ref.path, cert);
      assert.equal(helper.resolveFinal({ ...accepted.accepted_ref, delivery_root: f.deliveryRoot }, f.context).processor_id, 'prototype-notes');
      assert.deepEqual(helper.sealAccepted(local.input, f.context).accepted_ref, accepted.accepted_ref);
    },
    'legacy-v1': async () => {
      const baseline = [ ['prototype-delivery.mjs', 'b2310aec692a1815847186cdf3c274d7db72845f65ef1efc493621cf54c97fe4'], ['prototype-delivery.schema.json', '2a774d1175f5d6ad859432edd2ea503aecf2005c73b69d6b846aefedb62c8c71'] ];
      const runtime = path.join(evidenceRoot, 'legacy-runtime'); fs.mkdirSync(path.join(runtime, 'scripts'), { recursive: true }); fs.mkdirSync(path.join(runtime, '.claude/skill-os'), { recursive: true });
      for (const [name, expected] of baseline) { const snapshot = path.join(workRoot, 'scripts/fixtures/prototype-delivery-v1', name); assert.equal(fileRef(snapshot).sha256, expected); fs.copyFileSync(snapshot, path.join(runtime, name.endsWith('.mjs') ? 'scripts' : '.claude/skill-os', name)); }
      const legacy = await import(pathToFileURL(path.join(runtime, 'scripts/prototype-delivery.mjs'))), records = [];
      for (const kind of ['adequate-original', 'adequate-copy', 'enhanced-copy']) {
        const f = createDeliveryFixture(path.join(evidenceRoot, 'legacy-' + kind), { helper: legacy, kind });
        const old = createLocalIntegrityReport(f, { helper: legacy }), before = inventory(f.root), exact = structuredClone(old.accepted.accepted_ref);
        assert.ok(!Object.hasOwn(JSON.parse(fs.readFileSync(exact.path)), 'processor_id'));
        const current = helper.resolveFinal({ ...exact, delivery_root: f.deliveryRoot }, f.context);
        assert.deepEqual(current.accepted_ref, exact); assert.equal(current.final_entry, old.accepted.final_entry);
        assert.equal(current.processor_id, 'motion-polish');
        command('legacy-' + kind + '-current-cli', argsFor(f, 'resolve', exact));
        const after = inventory(f.root); assert.deepEqual(after, before, 'No re-signing, path edits or inventory changes');
        const original = fs.readFileSync(f.source); fs.appendFileSync(f.source, '\nLEGACY-DRIFT\n');
        rejects(() => helper.resolveFinal({ ...exact, delivery_root: f.deliveryRoot }, f.context), /HASH_DRIFT/);
        assert.match(command('legacy-' + kind + '-drift', argsFor(f, 'validate', exact), 1).stderr, /HASH_DRIFT/);
        fs.writeFileSync(f.source, original); assert.deepEqual(inventory(f.root), before);
        records.push({ kind, old_helper_ref: fileRef(path.join(runtime, 'scripts/prototype-delivery.mjs')), old_schema_ref: fileRef(path.join(runtime, '.claude/skill-os/prototype-delivery.schema.json')),
          accepted_ref_before: exact, accepted_ref_after: fileRef(exact.path), before, after, drift_rejected: true, producer: 'ACTUAL_FROZEN_V1', independent_native_acceptance: 'NOT_TESTED' });
      }
      writeJSON(path.join(evidenceRoot, 'legacy-v1-inventory.json'), records);
    },
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
      const stdinStart = new Date().toISOString(), stdin = spawnSync(argv[0], argv.slice(1), { cwd: workRoot, input: `import { resolveFinal } from ${JSON.stringify(pathToFileURL(helperPath).href)};console.log(typeof resolveFinal);\n`, encoding: 'utf8' });
      const out = path.join(evidenceRoot, 'cli-stdin-import.stdout'), err = path.join(evidenceRoot, 'cli-stdin-import.stderr');
      fs.writeFileSync(out, stdin.stdout || ''); fs.writeFileSync(err, stdin.stderr || '');
      recordProcess('cli-stdin-import', argv, stdin, stdinStart);
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
    for (const name of selected ? [selected] : Object.keys(cases)) {
      assert.ok(cases[name], `Unknown case ${name}`); const start = new Date().toISOString();
      try { await cases[name](); caseResults.push({ id: name, started_at: start, ended_at: new Date().toISOString(), status: 'PASS' }); }
      catch (error) { caseResults.push({ id: name, started_at: start, ended_at: new Date().toISOString(), status: 'FAIL', error: error.stack }); throw error; }
      console.log(`PASS ${name}`);
    }
    if (!selected) {
      // Real child processes race identical no-replace publications and crash at the actual link boundary.
      const fixture = createDeliveryFixture(path.join(evidenceRoot, 'process-publication'), { helper });
      const local = createLocalIntegrityReport(fixture, { helper, seal: false });
      const payload = path.join(fixture.root, 'seal-input.json'); writeJSON(payload, { input: local.input, context: fixture.context });
      const runner = path.join(fixture.root, 'publisher.mjs');
      fs.writeFileSync(runner, `import fs from 'node:fs';import {sealAccepted} from ${JSON.stringify(pathToFileURL(helperPath).href)};const p=JSON.parse(fs.readFileSync(process.argv[2]));const mode=process.argv[3];const link=fs.linkSync;fs.linkSync=(a,b)=>{if(b.endsWith('accepted-delivery.json')&&mode==='before')process.exit(86);link(a,b);if(b.endsWith('accepted-delivery.json')&&mode==='after')process.exit(87)};try{console.log(JSON.stringify(sealAccepted(p.input,p.context)))}catch(e){console.error(e.message);process.exitCode=1}\n`);
      const runPublisher = mode => { const start = new Date().toISOString(), argv = [process.execPath, runner, payload, mode], result = spawnSync(argv[0], argv.slice(1), { encoding: 'utf8', cwd: workRoot }); recordProcess('publisher-' + mode, argv, result, start); return result; };
      const before = runPublisher('before'); assert.equal(before.status, 86); assert.ok(!fs.existsSync(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json')));
      const after = runPublisher('after'); assert.equal(after.status, 87);
      const exact = fileRef(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json'));
      command('resume-after-publish', argsFor(fixture, 'resolve', exact));
      const racers = await Promise.all([0, 1].map(index => new Promise(resolve => { const started_at=new Date().toISOString();const child = spawn(process.execPath, [runner, payload, 'normal'], { cwd: workRoot }); let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('close',code=>resolve({index,code,stdout,stderr,argv:[process.execPath,runner,payload,'normal'],cwd:workRoot,started_at,ended_at:new Date().toISOString(),pid:child.pid,signal:child.signalCode})); })));
      for (const race of racers) { recordProcess('race-' + race.index, race.argv, { ...race, exit_code: race.code }, race.started_at, race.ended_at); assert.equal(race.code, 0); fs.writeFileSync(path.join(evidenceRoot, `race-${race.index}.stdout`), race.stdout); fs.writeFileSync(path.join(evidenceRoot, `race-${race.index}.stderr`), race.stderr); }
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
      const launch=payloadPath=>new Promise(resolve=>{const started_at=new Date().toISOString();const child=spawn(process.execPath,[runner,payloadPath,'normal'],{cwd:workRoot});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('close',exit_code=>resolve({argv:[process.execPath,runner,payloadPath,'normal'],cwd:workRoot,started_at,ended_at:new Date().toISOString(),pid:child.pid,exit_code,stdout,stderr,signal:child.signalCode}));});
      const thirdAttempt=helper.prepareCopy(fixture.bound,{delivery_root:fixture.deliveryRoot,attempt_id:'attempt-C',kind:'enhanced-copy'},fixture.context);
      fs.writeFileSync(path.join(thirdAttempt.content_root,'assets/base.css'),enhancedCSS);
      const thirdInput=structuredClone(secondInput);thirdInput.attempt_id='attempt-C';thirdInput.delivery.id='attempt-C';
      thirdInput.delivery.entry=thirdInput.delivery.entry.replace('/attempt-B/','/attempt-C/');thirdInput.delivery.closure=thirdInput.delivery.closure.map(item=>({...item,path:item.path.replace('/attempt-B/','/attempt-C/')}));
      const thirdSpec=path.join(thirdAttempt.attempt_dir,'prototype-spec.md');fs.copyFileSync(fixture.resolved.spec_path,thirdSpec);thirdInput.delivery.spec=fileRef(thirdSpec);
      const thirdPatch=path.join(thirdAttempt.attempt_dir,'patch.json');fs.copyFileSync(fixture.resolved.candidate.patch.path,thirdPatch);thirdInput.patch={...thirdInput.patch,...fileRef(thirdPatch)};
      const thirdFixture={...fixture,attempt:thirdAttempt,resolved:helper.checkCandidate(thirdInput,fixture.context)};
      const thirdLocal=createLocalIntegrityReport(thirdFixture,{helper,seal:false}),thirdPayload=path.join(fixture.root,'seal-input-C.json');writeJSON(thirdPayload,{input:thirdLocal.input,context:fixture.context});
      assert.ok(!fs.existsSync(path.join(secondAttempt.attempt_dir,'accepted-delivery.json'))&&!fs.existsSync(path.join(thirdAttempt.attempt_dir,'accepted-delivery.json')),'Both distinct attempts start unpublished');
      const distinct=await Promise.all([launch(secondPayload),launch(thirdPayload)]);distinct.forEach((item,index)=>{recordProcess('distinct-'+index,item.argv,item,item.started_at,item.ended_at);assert.equal(item.exit_code,0)});
      const secondExact=fileRef(path.join(secondAttempt.attempt_dir,'accepted-delivery.json'));assert.notEqual(secondExact.path,exact.path);assert.deepEqual(fileRef(exact.path),exact);
      const thirdExact=fileRef(path.join(thirdAttempt.attempt_dir,'accepted-delivery.json'));assert.notEqual(thirdExact.path,secondExact.path);
      command('same-root-exact-A',argsFor(fixture,'resolve',exact));command('same-root-exact-B',argsFor(secondFixture,'resolve',secondExact));
      command('same-root-exact-C',argsFor(thirdFixture,'resolve',thirdExact));
      // Differing same-attempt reports compete without mutating the accepted report. The singleton report boundary rejects B early.
      const competingReport=path.join(fixture.attempt.attempt_dir,'qa-results-competing.json');writeJSON(competingReport,{...local.report,reviewer_provenance:{...local.report.reviewer_provenance,origin:'DIFFERING_LOCAL_REPORT_NOT_INDEPENDENT'}});
      const competingPayload=path.join(fixture.root,'seal-input-competing.json');writeJSON(competingPayload,{input:{...local.input,report_ref:fileRef(competingReport)},context:fixture.context});
      const conflict=await Promise.all([launch(payload),launch(competingPayload)]);conflict.forEach((item,index)=>recordProcess('conflict-'+index,item.argv,item,item.started_at,item.ended_at));assert.equal(conflict[0].exit_code,0);assert.equal(conflict[1].exit_code,1);assert.match(conflict[1].stderr,/REPORT_LOCATION/);
      assert.deepEqual(fileRef(exact.path),exact);command('same-attempt-original-still-valid',argsFor(fixture,'resolve',exact));
      writeJSON(path.join(evidenceRoot,'parallel-distinct-and-conflict.json'),{delivery_root:fixture.deliveryRoot,distinct_attempts:distinct,differing_same_attempt:conflict,
        rejection_layer:'REPORT_LOCATION singleton before certificate publication',preserved_accepted_ref:exact,preserved_accepted_resolution:helper.resolveFinal({...exact,delivery_root:fixture.deliveryRoot},fixture.context)});
      // Mutate actual production guard lines only in an owned mirror, then run the same case RED and restored GREEN.
      const original = fs.readFileSync(helperPath, 'utf8');
      for (const [guard, name] of [['read-context','read-context'], ['hash','drift'], ['closure','closure'], ['required-set','required-set'], ['adequate-bytes','adequate-bytes'], ['no-replace','no-replace'], ['cli-entry','cli-entry'], ['attempt-id','attempt-path'], ['parent-base','derived-refusals'], ['parent-required','notes-manifest'], ['notes-set','notes-manifest']]) {
        const mirror = path.join(evidenceRoot, `mutation-${guard}`); fs.mkdirSync(path.join(mirror, 'scripts'), { recursive: true }); fs.mkdirSync(path.join(mirror, '.claude/skill-os'), { recursive: true });
        fs.symlinkSync(path.join(workRoot, 'node_modules'), path.join(mirror, 'node_modules'), 'dir');
        fs.copyFileSync(path.join(workRoot, '.claude/skill-os/prototype-delivery.schema.json'), path.join(mirror, '.claude/skill-os/prototype-delivery.schema.json'));
        const mutant = path.join(mirror, 'scripts/prototype-delivery.mjs');
        const matcher = guard === 'required-set'
          ? /^  requireThat\(ids\.length ===[^\n]*\n[^\n]*\/\/ guard:required-set\n/m
          : guard === 'notes-set' ? /^  requireThat\(ids\.length === candidate[^\n]*\n[^\n]*\n[^\n]*\/\/ guard:notes-set\n/m
          : new RegExp('^.*// guard:' + guard + '\\n', 'm');
        assert.ok(matcher.test(original));
        const replacement = guard === 'cli-entry' ? "if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {\n"
          : guard === 'no-replace' ? "    try { fs.copyFileSync(temp, file); } catch (error) {\n" : '  // isolated removed guard\n';
        fs.writeFileSync(mutant, original.replace(matcher, replacement));
        const syntaxStart = new Date().toISOString(), syntax = spawnSync(process.execPath, ['--check', mutant], { encoding: 'utf8', cwd: workRoot });
        const syntaxOut = path.join(evidenceRoot, guard + '-syntax.stdout');
        const syntaxErr = path.join(evidenceRoot, guard + '-syntax.stderr');
        fs.writeFileSync(syntaxOut, syntax.stdout || ''); fs.writeFileSync(syntaxErr, syntax.stderr || '');
        recordProcess(guard + '-syntax', [process.execPath, '--check', mutant], syntax, syntaxStart);
        assert.equal(syntax.status, 0, guard + ' mutant must parse before behavior testing');
        for (const [label, sourcePath, expected] of [['removed',mutant,1],['restored',helperPath,0]]) {
          const argv = [fileURLToPath(import.meta.url), '--helper', sourcePath, '--case', name, '--output', path.join(evidenceRoot, guard + '-' + label + '-evidence')];
          const runStart = new Date().toISOString(), result = spawnSync(process.execPath, argv, { encoding: 'utf8', cwd: workRoot });
          fs.writeFileSync(path.join(evidenceRoot, `${guard}-${label}.stdout`), result.stdout); fs.writeFileSync(path.join(evidenceRoot, `${guard}-${label}.stderr`), result.stderr);
          recordProcess(guard + '-' + label, [process.execPath, ...argv], result, runStart);
          assert.equal(result.status, expected, `${guard} same-case ${label} exit`);
        }
        console.log(`PASS mutation ${guard}: removed RED, restored GREEN`);
      }
      assert.equal(fs.readFileSync(helperPath, 'utf8'), original);
    }
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
  finally {
    writeJSON(path.join(evidenceRoot, 'commands.json'), receipts);
    writeJSON(path.join(evidenceRoot, 'rejections.json'), rejections);
    writeJSON(path.join(evidenceRoot, 'test-summary.json'), { argv: process.argv, cwd: workRoot, pid: process.pid, started_at: startedAt, ended_at: new Date().toISOString(), exit_code: process.exitCode || 0, selected_case: selected || 'all',
      case_results: caseResults, helper_ref: fileRef(helperPath), test_ref: fileRef(fileURLToPath(import.meta.url)), schema_ref: fileRef(path.resolve(path.dirname(helperPath), '../.claude/skill-os/prototype-delivery.schema.json')),
      scope: 'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE', independent_native_acceptance: 'NOT_TESTED', production_pin: 'NONE' });
    if (retainedRoot) {
      fs.cpSync(evidenceRoot, retainedRoot, { recursive: true, dereference: false, verbatimSymlinks: true });
      const retained = receipts.map(item => ({ ...item, stdout_retained_ref: fileRef(path.join(retainedRoot, path.relative(evidenceRoot, item.stdout_ref.path))),
        stderr_retained_ref: fileRef(path.join(retainedRoot, path.relative(evidenceRoot, item.stderr_ref.path))) }));
      writeJSON(path.join(retainedRoot, 'retained-commands.json'), retained);
      const mappings = [{ executed_root: evidenceRoot, retained_root: retainedRoot }];
      for (const item of inventory(retainedRoot).filter(item => item.kind === 'file' && path.basename(item.path) === 'cleanup.json')) {
        const cleanup = JSON.parse(fs.readFileSync(item.path));
        mappings.push({ executed_root: cleanup.temporary_root, retained_root: path.dirname(item.path) });
      }
      // Retention references move; executed argv and all candidate/certificate bytes remain exact.
      for (const item of inventory(retainedRoot).filter(item => item.kind === 'file' && path.basename(item.path) === 'retained-commands.json')) {
        const commands = JSON.parse(fs.readFileSync(item.path));
        for (const command of commands) for (const kind of ['stdout', 'stderr']) {
          const old = command[kind + '_retained_ref'];
          if (old.path.startsWith(evidenceRoot + path.sep)) {
            const current = fileRef(path.join(retainedRoot, path.relative(evidenceRoot, old.path)));
            assert.equal(current.sha256, old.sha256, 'Retained process output stays byte-identical');
            command[kind + '_previous_retention_path'] = old.path; command[kind + '_retained_ref'] = current;
          }
        }
        writeJSON(item.path, commands);
      }
      writeJSON(path.join(retainedRoot, 'retention-index.json'), { mappings, scope: 'Copied evidence only; no certificate path edits or re-signing' });
      fs.rmSync(evidenceRoot, { recursive: true });
      writeJSON(path.join(retainedRoot, 'cleanup.json'), { temporary_root: evidenceRoot, removed: !fs.existsSync(evidenceRoot), processes: 'All synchronous or awaited close events; no live publishers',
        retained_root: retainedRoot, runtime_paths: 'Historical exact absolute paths are not rewritten in copied certificates. Replay through this same consumer for current fixtures.' });
    }
    console.log(`Evidence: ${retainedRoot || evidenceRoot}`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
