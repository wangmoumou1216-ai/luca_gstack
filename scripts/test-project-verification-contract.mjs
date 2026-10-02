#!/usr/bin/env node
// Isolated process/receipt evidence; native Plan/TP/QG prose consumption is a separate gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const workRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const referencePath = path.resolve(option('--reference') || path.join(workRoot, '.claude/agents/references/project-verification.md'));
const selectedCase = option('--case');
const evidenceRoot = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'luca-project-verification-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileRef = filename => ({ path: filename, sha256: hash(fs.readFileSync(filename)) });
const writeJSON = (filename, value) => fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
const commandReceipts = [];

// The app exposes ordinary note creation/read routes. Identity is read-only doctor introspection.
const appSource = String.raw`
import fs from 'node:fs';
import http from 'node:http';
const config = JSON.parse(fs.readFileSync(process.argv[2]));
const db = config.data_root + '/notes.json';
const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/identity') return send(200, {
    ...config.identity, pid: process.pid, surface: 'http://127.0.0.1:' + server.address().port,
    data_root: config.data_root, ready: true
  });
  if (url.pathname !== '/notes') return send(404, { error: 'not-found' });
  const notes = JSON.parse(fs.readFileSync(db));
  if (req.method === 'GET') return send(200, notes);
  if (req.method !== 'POST') return send(405, { error: 'method' });
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return send(400, { error: 'invalid-json' }); }
  if (!input.title?.trim() && !config.broken_error_state) return send(422, { error: 'title-required' });
  const note = { id: notes.length + 1, title: input.title.trim(), body: input.body };
  notes.push(note);
  fs.writeFileSync(db, JSON.stringify(notes));
  send(201, note);
});
server.listen(0, '127.0.0.1', () => process.stdout.write(JSON.stringify({ port: server.address().port }) + '\n'));
`;

// One existing-style CLI driver exercises the API user surface; no internal setter or mock server.
const driverSource = String.raw`
const [url, action, payload] = process.argv.slice(2);
try {
  if (action === 'driver-failure') throw new Error('intentional driver transport failure');
  const doctor = action === 'doctor';
  const response = await fetch(url + (doctor ? '/identity' : '/notes'), {
    method: action === 'create' ? 'POST' : 'GET',
    ...(action === 'create' ? { headers: { 'content-type': 'application/json' }, body: payload } : {}),
    signal: AbortSignal.timeout(3000)
  });
  const body = await response.json();
  process.stdout.write(JSON.stringify(doctor ? { ...body, observed_at: new Date().toISOString() }
    : { status: response.status, body }) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 7;
}
`;

const scenarios = {
  good: { expected: 'PASS' },
  'restart-refreeze': { expected: 'PASS', restart: true, refreeze: true },
  'doctor-only': { expected: 'GAP', gap: 'coverage-missing-or-duplicate' },
  'wrong-instance': { expected: 'GAP', gap: 'instance:instance_id', restart: true },
  'wrong-revision': { expected: 'GAP', gap: 'instance:source_revision' },
  'missing-error': { expected: 'GAP', gap: 'coverage-missing-or-duplicate' },
  'broken-error-state': { expected: 'FAIL' },
  'driver-failure': { expected: 'GAP', gap: 'driver-failure' },
  'destroyed-evidence': { expected: 'GAP', gap: 'evidence-missing-or-drifted' },
  'source-drift': { expected: 'GAP', gap: 'source-drift' },
  'driver-drift': { expected: 'GAP', gap: 'driver-drift' },
  'data-drift': { expected: 'GAP', gap: 'data-drift' },
  'manifest-drift': { expected: 'GAP', gap: 'manifest-binding' },
  'cleanup-residue': { expected: 'GAP', gap: 'cleanup-residue' },
  'fake-result': { expected: 'GAP', gap: 'result-readback' }
};

function extractPredicate(reference, destination) {
  const text = fs.readFileSync(reference, 'utf8');
  const block = text.match(/<!-- RECEIPT_PREDICATE_START -->\s*```javascript\n([\s\S]*?)\n```\s*<!-- RECEIPT_PREDICATE_END -->/);
  assert.ok(block, 'Runnable predicate must come from the actual method owner');
  fs.writeFileSync(destination, block[1]);
}

function recordCommand(argv, cwd, output) {
  const receipt = { argv, cwd, exit_code: output.status, signal: output.signal,
    stdout: output.stdout || '', stderr: output.stderr || '', error: output.error?.message };
  commandReceipts.push(receipt);
  return receipt;
}

async function runScenario(name, scenario, predicatePath) {
  const caseRoot = path.join(evidenceRoot, name);
  const proofRoot = path.join(caseRoot, 'evidence');
  const dataRoot = path.join(caseRoot, 'owned-data');
  fs.mkdirSync(proofRoot, { recursive: true });
  fs.mkdirSync(dataRoot);
  const app = path.join(caseRoot, 'notes-app.mjs');
  const driver = path.join(caseRoot, 'existing-notes-suite-driver.mjs');
  fs.writeFileSync(app, appSource);
  fs.writeFileSync(driver, driverSource);
  const seed = path.join(proofRoot, 'seed.json');
  writeJSON(seed, []);
  fs.copyFileSync(seed, path.join(dataRoot, 'notes.json'));
  const scope = path.join(proofRoot, 'approved-fixture-scope.json');
  writeJSON(scope, { fixture: 'NO_PIN', effects: ['owned-local-process', 'loopback-api', 'owned-data', 'preserve-evidence'] });
  const runId = randomUUID();
  const project = { mode: 'NO_PIN', fixture_id: 'notes-process-contract' };
  const scopeRef = fileRef(scope);
  const buildRevision = hash(fs.readFileSync(app));
  const children = [];
  const cleanupActions = [];
  const refs = [fileRef(seed), scopeRef];
  let sequence = 0;

  function capture(label, argv) {
    const startedAt = new Date().toISOString();
    const output = spawnSync(argv[0], argv.slice(1), { cwd: caseRoot, encoding: 'utf8', timeout: 5000 });
    const endedAt = new Date().toISOString();
    const captured = recordCommand(argv, caseRoot, output);
    const stdoutPath = path.join(proofRoot, `${++sequence}-${label}.stdout.txt`);
    const stderrPath = path.join(proofRoot, `${sequence}-${label}.stderr.txt`);
    fs.writeFileSync(stdoutPath, captured.stdout);
    fs.writeFileSync(stderrPath, captured.stderr);
    const stdoutRef = fileRef(stdoutPath);
    const stderrRef = fileRef(stderrPath);
    refs.push(stdoutRef, stderrRef);
    return { ...captured, started_at: startedAt, ended_at: endedAt, stdout_ref: stdoutRef, stderr_ref: stderrRef };
  }

  async function launch(revision = buildRevision) {
    const identity = { project_identity: project, source_revision: revision, approved_scope_ref: scopeRef,
      instance_id: randomUUID() };
    const config = path.join(proofRoot, `launch-${children.length + 1}.json`);
    writeJSON(config, { identity, data_root: dataRoot,
      broken_error_state: ['broken-error-state', 'fake-result'].includes(name) });
    refs.push(fileRef(config));
    const child = spawn(process.execPath, [app, config], { cwd: caseRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    const resource = { kind: 'process', pid: child.pid, ownership: runId };
    const owned = { child, resource, argv: [process.execPath, app, config], stopped: false, stdout: '', stderr: '' };
    children.push(owned);
    child.stdout.on('data', chunk => { owned.stdout += chunk; });
    child.stderr.on('data', chunk => { owned.stderr += chunk; });
    const ready = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Owned fixture did not become ready')), 5000);
      const onData = () => {
        if (!owned.stdout.includes('\n')) return;
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve(JSON.parse(owned.stdout.trim().split('\n')[0]));
      };
      child.stdout.on('data', onData);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Fixture exited before ready: ${code}`)); });
    });
    return { owned, url: `http://127.0.0.1:${ready.port}`, identity };
  }

  async function stop(owned) {
    if (owned.stopped) return;
    if (!owned.child.pid) { owned.stopped = true; return; }
    let exitCode = owned.child.exitCode;
    let signal = owned.child.signalCode;
    if (exitCode === null && signal === null) {
      const exited = once(owned.child, 'exit');
      owned.child.kill('SIGTERM');
      [exitCode, signal] = await exited;
    }
    owned.stopped = true;
    assert.throws(() => process.kill(owned.resource.pid, 0), { code: 'ESRCH' }, 'Only the exact owned process is stopped');
    const log = path.join(proofRoot, `process-${owned.resource.pid}.json`);
    const launchReceipt = recordCommand(owned.argv, caseRoot, {
      stdout: owned.stdout, stderr: owned.stderr, status: exitCode, signal
    });
    writeJSON(log, launchReceipt);
    refs.push(fileRef(log));
    cleanupActions.push({ action: 'stop', resource: owned.resource, exit_code: 0,
      observed_exit_code: exitCode, signal, evidence_ref: fileRef(log) });
  }

  function doctor(instance, label) {
    const observation = capture(label, [process.execPath, driver, instance.url, 'doctor']);
    assert.equal(observation.exit_code, 0, 'Doctor must execute successfully before interpreting identity');
    return { ...JSON.parse(observation.stdout), evidence_ref: observation.stdout_ref };
  }

  const directoryResource = { kind: 'directory', path: dataRoot, ownership: runId };
  try {
    let instance = await launch(name === 'wrong-revision' ? '0'.repeat(64) : buildRevision);
    let before = doctor(instance, 'doctor-before');
    const originalExpected = { ...before };
    delete originalExpected.ready;
    delete originalExpected.observed_at;
    delete originalExpected.evidence_ref;
    if (scenario.restart) {
      await stop(instance.owned);
      instance = await launch();
      const restartedProbe = doctor(instance, 'doctor-after-dev-restart');
      assert.notEqual(restartedProbe.instance_id, before.instance_id);
      assert.equal(restartedProbe.source_revision, before.source_revision);
      if (scenario.refreeze) before = restartedProbe;
    }
    const expectedInstance = scenario.refreeze ? { ...before } : originalExpected;
    delete expectedInstance.ready;
    delete expectedInstance.observed_at;
    delete expectedInstance.evidence_ref;
    // Negative controls deliberately retain stale doctor/revision evidence to test rejection.
    if (name === 'wrong-revision') expectedInstance.source_revision = buildRevision;
    const driverRef = fileRef(driver);
    const coverage = [
      { feature: 'read-note', entry: 'GET /notes', state: 'empty', assert_ids: ['ASSERT-001'] },
      { feature: 'create-note', entry: 'POST /notes', state: 'saved', assert_ids: ['ASSERT-002'] },
      { feature: 'read-note', entry: 'GET /notes', state: 'persisted', assert_ids: ['ASSERT-003'] },
      { feature: 'create-note', entry: 'POST /notes', state: 'error', assert_ids: ['ASSERT-004'] }
    ];
    const manifest = {
      schema_version: 1, project_identity: project, source_revision: { locator: app, sha256: buildRevision },
      approved_scope_ref: scopeRef, surface: expectedInstance.surface,
      instance_probe: { argv: [process.execPath, driver, instance.url, 'doctor'], expected: expectedInstance },
      launch: { argv: [process.execPath, app], cwd: caseRoot },
      doctor: { argv: [process.execPath, driver, instance.url, 'doctor'], cwd: caseRoot },
      drive: { driver_ref: driverRef, argv: [process.execPath, driver], cwd: caseRoot },
      test_data: { seed_ref: fileRef(seed), data_root: dataRoot, reset: 'copy owned immutable seed before launch' },
      coverage, evidence_location: proofRoot,
      cleanup: { owned_resources: [...children.map(item => item.resource), directoryResource], preserve_evidence: true }
    };
    const manifestPath = path.join(caseRoot, 'manifest.json');
    writeJSON(manifestPath, manifest);
    const frozenHash = fileRef(manifestPath).sha256;
    const operations = [];
    const actualResults = [];
    const recipes = [
      { action: 'list', expected: { status: 200, body: [] } },
      { action: 'create', payload: { title: 'Release checklist', body: 'Tag and publish' },
        expected: { status: 201, body: { id: 1, title: 'Release checklist', body: 'Tag and publish' } } },
      { action: 'list', expected: { status: 200, body: [{ id: 1, title: 'Release checklist', body: 'Tag and publish' }] } },
      { action: 'create', payload: { title: '', body: 'Invalid draft' }, expected: { status: 422, body: { error: 'title-required' } } }
    ];
    for (const [index, recipe] of recipes.entries()) {
      if (name === 'doctor-only' || (name === 'missing-error' && index === 3)) continue;
      const row = coverage[index];
      const argv = [process.execPath, driver, instance.url, recipe.action];
      if (recipe.payload) argv.push(JSON.stringify(recipe.payload));
      const operation = { ...row, operation_id: `operation-${index + 1}`, ...capture(`drive-${index + 1}`, argv) };
      operations.push(operation);
      assert.equal(operation.exit_code, 0, 'Functional API driver runs as an actual child process');
      const actual = JSON.parse(operation.stdout);
      actualResults.push({ feature: row.feature, entry: row.entry, state: row.state, assert_id: row.assert_ids[0],
        operation_id: operation.operation_id, expected: recipe.expected, actual,
        status: JSON.stringify(actual) === JSON.stringify(recipe.expected) ? 'PASS' : 'FAIL',
        evidence_refs: [operation.stdout_ref, operation.stderr_ref] });
    }
    if (name === 'driver-failure') {
      const failed = { ...coverage[3], operation_id: 'failed-driver-attempt',
        ...capture('failed-driver', [process.execPath, driver, instance.url, 'driver-failure']) };
      assert.equal(failed.exit_code, 7);
      assert.match(failed.stderr, /intentional driver transport failure/);
      operations.push(failed);
    }
    const after = doctor(instance, 'doctor-after-test');
    const current = doctor(instance, 'current-instance-readback');
    assert.notEqual(after.evidence_ref.path, before.evidence_ref.path, 'Post-TEST identity uses a new actual probe');
    const currentPath = path.join(caseRoot, 'current-probe.json');
    writeJSON(currentPath, current);
    for (const owned of children) await stop(owned);
    if (name !== 'cleanup-residue') fs.rmSync(dataRoot, { recursive: true });
    assert.equal(fs.existsSync(dataRoot), name === 'cleanup-residue');
    cleanupActions.push({ action: 'remove-owned-data', resource: directoryResource, exit_code: 0 });
    // Preserve proof, then deliberately destroy one owned proof artifact in the known-bad control.
    for (const ref of refs) assert.equal(fileRef(ref.path).sha256, ref.sha256);
    if (name === 'destroyed-evidence') fs.unlinkSync(operations[0].stderr_ref.path);
    if (name === 'source-drift') fs.appendFileSync(app, '\n// source changed after TEST\n');
    if (name === 'driver-drift') fs.appendFileSync(driver, '\n// driver changed after TEST\n');
    if (name === 'data-drift') writeJSON(seed, [{ title: 'different baseline' }]);
    const receipt = {
      manifest_sha256: frozenHash, run_id: runId, verified_instance: { before, after },
      driver_revision: driverRef, source_assert_ids: ['ASSERT-001', 'ASSERT-002', 'ASSERT-003', 'ASSERT-004'],
      operations, actual_results: actualResults, evidence_refs: refs,
      cleanup_result: { actions: cleanupActions, remaining_owned_resources: [], evidence_preserved: true },
      remaining_gaps: [], status: 'PASS'
    };
    if (name === 'manifest-drift') {
      // A child rewrites its denominator and hash; the caller's independent pre-TEST hash wins.
      manifest.coverage.pop();
      writeJSON(manifestPath, manifest);
      receipt.manifest_sha256 = fileRef(manifestPath).sha256;
      receipt.source_assert_ids.pop();
      receipt.actual_results.pop();
    }
    if (name === 'fake-result') {
      // The running app really returned HTTP201 for an invalid title; a claimed PASS cannot hide it.
      receipt.actual_results[3].actual = receipt.actual_results[3].expected;
      receipt.actual_results[3].status = 'PASS';
    }
    const receiptPath = path.join(caseRoot, 'receipt.json');
    writeJSON(receiptPath, receipt);
    const runner = path.join(caseRoot, 'receipt-check.mjs');
    fs.writeFileSync(runner, `import fs from 'node:fs';\nimport { verificationReceipt } from ${JSON.stringify(predicatePath)};\nconst result = verificationReceipt(process.argv[2], process.argv[3], JSON.parse(fs.readFileSync(process.argv[4])), process.argv[5]);\nconsole.log(JSON.stringify(result));\nprocess.exitCode = result.status === 'PASS' ? 0 : 1;\n`);
    const argv = [process.execPath, runner, manifestPath, receiptPath, currentPath, frozenHash];
    const output = spawnSync(argv[0], argv.slice(1), { cwd: caseRoot, encoding: 'utf8', timeout: 5000 });
    const check = recordCommand(argv, caseRoot, output);
    writeJSON(path.join(caseRoot, 'predicate-command.json'), check);
    assert.equal(check.exit_code, scenario.expected === 'PASS' ? 0 : 1, `${name}: actual predicate exit code`);
    const verdict = JSON.parse(check.stdout);
    assert.equal(verdict.status, scenario.expected, `${name}: source predicate must reject real counterexample`);
    if (scenario.gap) assert.ok(verdict.gaps.includes(scenario.gap), `${name}: missing specific ${scenario.gap} evidence`);
    writeJSON(path.join(caseRoot, 'verdict.json'), verdict);
    console.log(`PASS ${name}: ${verdict.status}`);
  } finally {
    for (const owned of children) if (!owned.stopped) await stop(owned);
    if (fs.existsSync(dataRoot)) fs.rmSync(dataRoot, { recursive: true });
  }
}

try {
  const predicate = path.join(evidenceRoot, 'predicate-from-owner.mjs');
  extractPredicate(referencePath, predicate);
  const cases = selectedCase ? [[selectedCase, scenarios[selectedCase]]] : Object.entries(scenarios);
  for (const [name, scenario] of cases) {
    assert.ok(scenario, `Unknown case: ${name}`);
    await runScenario(name, scenario, predicate);
  }
  if (!selectedCase) {
    const original = fs.readFileSync(referencePath, 'utf8');
    for (const [guard, testCase] of [['instance', 'wrong-instance'], ['coverage', 'missing-error'],
      ['driver', 'driver-failure'], ['evidence', 'destroyed-evidence']]) {
      const guardLine = new RegExp(`^.*// guard:${guard}\\n`, 'm');
      assert.ok(guardLine.test(original), `Actual source guard ${guard} must be present`);
      const mutation = path.join(evidenceRoot, `owner-without-${guard}.md`);
      fs.writeFileSync(mutation, original.replace(guardLine, `      // isolated removed ${guard} guard\n`));
      const argv = [process.execPath, fileURLToPath(import.meta.url), '--reference', mutation, '--case', testCase];
      const output = spawnSync(argv[0], argv.slice(1), { cwd: workRoot, encoding: 'utf8', timeout: 30000 });
      const red = recordCommand(argv, workRoot, output);
      writeJSON(path.join(evidenceRoot, `mutation-${guard}.json`), red);
      assert.equal(red.exit_code, 1, `${guard}: same counterexample must turn test red after guard removal`);
      assert.match(red.stderr, /actual predicate exit code|source predicate must reject real counterexample/);
      // Restored original owner, same named case, independently executed again.
      const restoredArgv = [process.execPath, fileURLToPath(import.meta.url), '--reference', referencePath, '--case', testCase];
      const greenOutput = spawnSync(restoredArgv[0], restoredArgv.slice(1), { cwd: workRoot, encoding: 'utf8', timeout: 30000 });
      const green = recordCommand(restoredArgv, workRoot, greenOutput);
      writeJSON(path.join(evidenceRoot, `restored-${guard}.json`), green);
      assert.equal(green.exit_code, 0, `${guard}: restored owner must turn same test green`);
      console.log(`PASS mutation ${guard}: original green, guard removed red, restored green`);
    }
    assert.equal(fs.readFileSync(referencePath, 'utf8'), original, 'Mutations leave the actual owner unchanged');
  }
  console.log('PASS project-verification process/driver fixtures; native Plan/TP/QG consumption remains separately gated');
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  writeJSON(path.join(evidenceRoot, 'commands.json'), commandReceipts);
  writeJSON(path.join(evidenceRoot, 'test-summary.json'), { reference: fileRef(referencePath),
    selected_case: selectedCase || 'all', exit_code: process.exitCode || 0,
    scope: 'isolated framework API/CLI process fixtures',
    native_consumption: 'NOT_TESTED; actual cold Plan/TP/QG required separately' });
  console.log(`Evidence: ${evidenceRoot}`);
}
