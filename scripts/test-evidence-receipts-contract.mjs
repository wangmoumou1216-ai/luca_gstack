#!/usr/bin/env node
// Real local reads/replay of the reference example; this script never emits a native QG verdict.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const relativeOwner = '.claude/agents/references/evidence-receipts.md';
let sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let evidencePath;
let keepFixtures = false;
let mutation = true;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source-root' && args[i + 1]) sourceRoot = resolve(args[++i]);
  else if (args[i] === '--evidence' && args[i + 1]) evidencePath = args[++i];
  else if (args[i] === '--keep-fixtures') keepFixtures = true;
  else if (args[i] === '--no-mutation') mutation = false;
  else throw Error(`Unknown/incomplete option: ${args[i]}`);
}
if (evidencePath && !isAbsolute(evidencePath)) throw Error('--evidence requires an absolute path');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureRoot = mkdtempSync(join(tmpdir(), 'evidence-receipts-contract-'));
const failures = [], checks = [], processes = [], mutationRuns = [];
const json = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const clone = value => structuredClone(value);
const execute = (command, argv, timeout = 20000) => {
  const started_at = new Date().toISOString();
  const result = spawnSync(command, argv, {encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024});
  const record = {command, args: argv, started_at, completed_at: new Date().toISOString(),
    exit_code: result.status, pid: result.pid, signal: result.signal, stdout: result.stdout ?? '', stderr: result.stderr ?? '',
    error: result.error?.message ?? null};
  processes.push(record);
  return record;
};
const check = (name, body) => {
  try { body(); checks.push({name, status: 'PASS'}); console.log(`PASS ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); checks.push({name, status: 'FAIL', reason: error.message});
    console.error(`FAIL ${name}: ${error.message}`); }
};

try {
  const ownerPath = join(sourceRoot, relativeOwner);
  const ownerBytes = readFileSync(ownerPath);
  const ownerText = ownerBytes.toString('utf8');
  // Extraction is static reachability only. The following checks execute the extracted bytes.
  const block = ownerText.match(/<!-- RECEIPT_REPLAY_START -->\s*```javascript\n([\s\S]*?)\n```\s*<!-- RECEIPT_REPLAY_END -->/);
  assert.ok(block, 'missing executable reference example');
  assert.ok(ownerText.trimEnd().endsWith('<!-- FILE_END: evidence-receipts.md -->'), 'missing owner EOF');
  const examplePath = join(fixtureRoot, 'reference-replay.mjs');
  writeFileSync(examplePath, `${block[1]}\n`);
  const driverExport = execute(process.execPath, ['--input-type=module', '-e',
    `const {driver} = await import(${JSON.stringify(pathToFileURL(examplePath).href)}); process.stdout.write(driver);`]);
  assert.equal(driverExport.exit_code, 0, driverExport.stderr);
  const driver = driverExport.stdout;

  const sourceA = join(fixtureRoot, 'candidate-a.md');
  const sourceB = join(fixtureRoot, 'candidate-b.md');
  const sourceC = join(fixtureRoot, 'optional-source.md');
  writeFileSync(sourceA, '# Candidate A\nStable IDs: A-001.\nUnicode measurement: Ω 😄.\nBoundary: original scope retained.\nEOF A\n');
  writeFileSync(sourceB, '# Candidate B\nStable IDs: B-001.\nGraft: explicit failure evidence.\nExtra feature: outside current task.\nEOF B\n');
  writeFileSync(sourceC, '# Optional source\nSupplementary context only.\nEOF C\n');
  const bytesA = readFileSync(sourceA), bytesB = readFileSync(sourceB), bytesC = readFileSync(sourceC);
  const readMethod = {kind: 'read', operation: 'emit-bytes'};
  const measureMethod = {kind: 'measure', operation: 'byte-length', sample_count: 3,
    sample_unit: 'one complete file read', order: [sourceA, sourceA, sourceA]};
  const assertionLevels = {'ASSERT-COVERAGE': 'BLOCKING', 'ASSERT-MEASURE': 'BLOCKING', 'ASSERT-OPTIONAL': 'WARNING'};
  const scopePath = join(fixtureRoot, 'parent-task-scope.json');
  json(scopePath, {required_assertions: ['ASSERT-COVERAGE', 'ASSERT-MEASURE'], optional_claim: 'supplementary context',
    assertion_levels: assertionLevels, permitted_sources: [sourceA, sourceB, sourceC], permitted_methods: [readMethod, measureMethod]});
  const scopeSha256 = digest(readFileSync(scopePath));
  const expected = [
    {slice_id: 'READ-A', source_locator: sourceA, source_sha256_or_version: digest(bytesA),
      read_or_measure_range: {unit: 'bytes', start: 0, end: bytesA.length, eof: true}, required_method: readMethod,
      required_for_assertions: ['ASSERT-COVERAGE'], authority_ref: scopePath},
    {slice_id: 'READ-B', source_locator: sourceB, source_sha256_or_version: digest(bytesB),
      read_or_measure_range: {unit: 'bytes', start: 0, end: bytesB.length, eof: true}, required_method: readMethod,
      required_for_assertions: ['ASSERT-COVERAGE'], authority_ref: scopePath},
    {slice_id: 'MEASURE-A', source_locator: sourceA, source_sha256_or_version: digest(bytesA),
      read_or_measure_range: {unit: 'samples', start: 0, end: 3}, required_method: measureMethod,
      required_for_assertions: ['ASSERT-MEASURE'], authority_ref: scopePath},
    {slice_id: 'OPTIONAL-C', source_locator: sourceC, source_sha256_or_version: digest(bytesC),
      read_or_measure_range: {unit: 'bytes', start: 0, end: bytesC.length, eof: true}, required_method: readMethod,
      required_for_assertions: ['ASSERT-OPTIONAL'], authority_ref: scopePath},
  ];
  const expectedPath = join(fixtureRoot, 'parent-frozen-expected.json');
  json(expectedPath, expected); // Freeze before reader processes, not after their return.
  const expectedSha256 = digest(readFileSync(expectedPath));
  const captures = new Map();
  const observed = expected.map(wanted => {
    const capture = execute(process.execPath, ['-e', driver, wanted.source_locator,
      JSON.stringify(wanted.read_or_measure_range), JSON.stringify(wanted.required_method)]);
    assert.equal(capture.exit_code, 0, capture.stderr);
    const result = JSON.parse(capture.stdout);
    const capturePath = join(fixtureRoot, `${wanted.slice_id}-tool-output.json`);
    json(capturePath, capture);
    captures.set(wanted.slice_id, capture);
    const findingsPath = join(fixtureRoot, `${wanted.slice_id}-findings.json`);
    json(findingsPath, {source: wanted.source_locator, actual_result: result});
    return {slice_id: wanted.slice_id, actual_source_version: result.actual_source_version,
      actual_range: result.actual_range, actual_method: result.actual_method, method_evidence_ref: capturePath,
      findings_ref: findingsPath, reader_identity: `local-process:${capture.pid}:${capturePath}`,
      provenance_level: 'tool-observed', status: 'COMPLETE', gap_reason: null};
  });

  // Ordinary findings carry synthesis provenance; no parallel arena engine is introduced.
  const synthesisPath = join(fixtureRoot, 'comparison-findings.json');
  json(synthesisPath, {base: {slice_id: 'READ-A', version: digest(bytesA),
    reason: 'A preserves the original scope and stable IDs.'},
    grafts: [{slice_id: 'READ-B', version: digest(bytesB), idea: 'explicit failure evidence',
      reason: 'compatible with the existing receipt transport and failure contract'}],
    non_adoptions: [{slice_id: 'READ-B', idea: 'extra feature', reason: 'outside the frozen task scope'},
      {slice_id: 'OPTIONAL-C', reason: 'supplementary context adds no required behavior'}],
    evidence_refs: observed.map(item => item.method_evidence_ref)});

  const caseRuns = [];
  const runCase = (name, {observations = observed, returned = expected, parentRef,
    levels = assertionLevels} = {}) => {
    const dir = join(fixtureRoot, name);
    mkdirSync(dir);
    const returnedPath = join(dir, 'returned-expected.json'), observedPath = join(dir, 'observed.json');
    json(returnedPath, returned); json(observedPath, observations);
    const inputPath = join(dir, 'input.json');
    json(inputPath, {parent_expected_ref: parentRef ?? {path: expectedPath, sha256: expectedSha256},
      parent_scope_ref: {path: scopePath, sha256: scopeSha256},
      returned_expected_path: returnedPath, observed_path: observedPath, assertion_levels: levels});
    const processResult = execute(process.execPath, [examplePath, inputPath]);
    let result;
    if (processResult.stdout.trim()) result = JSON.parse(processResult.stdout);
    const entry = {name, input_path: inputPath, process: processResult, result};
    caseRuns.push(entry);
    return entry;
  };
  const rejects = (entry, assertion, reason) => {
    assert.equal(entry.process.exit_code, 1, 'known-bad receipt unexpectedly accepted');
    if (assertion) assert.ok(entry.result.blocked_assertions.includes(assertion), 'wrong claim blocked');
    if (reason) assert.ok(entry.result.findings.some(item => item.gap_reason.includes(reason)), 'missing rejection reason');
  };

  check('positive: original four-slice denominator and actual replay', () => {
    const good = runCase('positive');
    assert.equal(good.process.exit_code, 0, good.process.stderr);
    assert.equal(good.result.mechanical_check, 'CONSISTENT');
    assert.equal(good.result.expected_count, 4);
    assert.equal(good.result.observed_count, 4);
    assert.equal(good.result.native_qg, 'NOT_RUN_BY_THIS_EXAMPLE');
    assert.equal(good.result.replays.length, 4);
    const measurement = good.result.replays.find(item => item.slice_id === 'MEASURE-A');
    assert.deepEqual(JSON.parse(measurement.stdout).samples, [bytesA.length, bytesA.length, bytesA.length]);
    assert.equal(measurement.exit_code, 0);
    assert.notEqual(bytesA.length, bytesA.toString('utf8').length, 'fixture must distinguish bytes from characters');
    assert.equal(Buffer.from(JSON.parse(captures.get('READ-B').stdout).content_base64, 'base64').toString('utf8'), bytesB.toString('utf8'));
  });
  check('N-1 required source remains a coverage gap', () => {
    const entry = runCase('missing-required', {observations: observed.filter(item => item.slice_id !== 'READ-B')});
    rejects(entry, 'ASSERT-COVERAGE', 'missing observation');
    assert.equal(entry.result.expected_count, 4);
  });
  check('wrong source version rejected', () => {
    const bad = clone(observed); bad[0].actual_source_version = '0'.repeat(64);
    rejects(runCase('wrong-version', {observations: bad}), 'ASSERT-COVERAGE', 'wrong source version');
  });
  check('wrong measurement method rejected', () => {
    const bad = clone(observed); bad[2].actual_method.operation = 'character-length';
    rejects(runCase('wrong-method', {observations: bad}), 'ASSERT-MEASURE', 'wrong method');
  });
  check('summary cannot claim EOF even with correct whole-file hash', () => {
    const wanted = expected[0], prefix = {unit: 'bytes', start: 0, end: 14, eof: false};
    const short = execute(process.execPath, ['-e', driver, sourceA, JSON.stringify(prefix), JSON.stringify(readMethod)]);
    assert.equal(short.exit_code, 0, short.stderr);
    const tracePath = join(fixtureRoot, 'summary-tool-output.json'); json(tracePath, short);
    const bad = clone(observed); bad[0].method_evidence_ref = tracePath;
    // A dishonest COMPLETE/EOF self-report is disproved by the real emitted prefix.
    rejects(runCase('summary-false-eof', {observations: bad}), 'ASSERT-COVERAGE', 'captured range/method');
    assert.equal(JSON.parse(short.stdout).actual_source_version, wanted.source_sha256_or_version);
    assert.equal(JSON.parse(short.stdout).actual_range.eof, false);
  });
  check('child denominator deletion rejected independently of observed count', () => {
    const entry = runCase('child-delete-denominator', {returned: expected.slice(0, 3)});
    rejects(entry);
    assert.match(entry.process.stderr, /child denominator changed/);
  });
  check('child cannot reclassify a required assertion as optional', () => {
    const entry = runCase('reclassified-required', {levels: {...assertionLevels, 'ASSERT-MEASURE': 'WARNING'}});
    rejects(entry); assert.match(entry.process.stderr, /parent assertion levels changed/);
  });
  check('optional dropout downgrades only its claim', () => {
    const entry = runCase('optional-dropout', {observations: observed.filter(item => item.slice_id !== 'OPTIONAL-C')});
    assert.equal(entry.process.exit_code, 0, entry.process.stderr);
    assert.equal(entry.result.mechanical_check, 'OPTIONAL_GAP');
    assert.deepEqual(entry.result.blocked_assertions, []);
    assert.deepEqual(entry.result.findings[0].affected_assertions, ['ASSERT-OPTIONAL']);
    assert.equal(entry.result.expected_count, 4);
  });
  check('duplicate cannot replace coverage', () => {
    rejects(runCase('duplicate', {observations: [...observed, clone(observed[0])]}), 'ASSERT-COVERAGE', 'duplicate observed');
  });
  check('extra slice is preserved as a rejected unassigned result', () => {
    const extra = clone(observed[0]); extra.slice_id = 'UNASSIGNED';
    const entry = runCase('extra', {observations: [...observed, extra]});
    rejects(entry); assert.match(entry.process.stderr, /unassigned observed ID/);
  });
  check('self-report provenance cannot certify source reading', () => {
    const bad = clone(observed); bad[0].provenance_level = 'self-report';
    rejects(runCase('self-report', {observations: bad}), 'ASSERT-COVERAGE', 'self-report only');
  });
  check('missing evidence stays a required gap', () => {
    const bad = clone(observed); bad[2].method_evidence_ref = join(fixtureRoot, 'absent-tool-output.json');
    rejects(runCase('missing-evidence', {observations: bad}), 'ASSERT-MEASURE', 'evidence/replay gap');
  });
  check('fabricated measurement values disagree with actual replay', () => {
    const capture = clone(captures.get('MEASURE-A'));
    const reported = JSON.parse(capture.stdout); reported.samples[1] -= 1;
    capture.stdout = `${JSON.stringify(reported)}\n`;
    const tracePath = join(fixtureRoot, 'fabricated-measurement-output.json'); json(tracePath, capture);
    const bad = clone(observed); bad[2].method_evidence_ref = tracePath;
    rejects(runCase('fabricated-values', {observations: bad}), 'ASSERT-MEASURE', 'capture disagrees with independent replay');
  });
  check('partial observation preserves its explicit required gap', () => {
    const bad = clone(observed); bad[1].status = 'PARTIAL'; bad[1].gap_reason = 'tail range never delivered';
    rejects(runCase('partial', {observations: bad}), 'ASSERT-COVERAGE', 'tail range never delivered');
  });
  check('reported method cannot hide actual captured sampling order', () => {
    const changed = {...measureMethod, order: [sourceB, sourceA, sourceA]};
    const wrongTrace = execute(process.execPath, ['-e', driver, sourceA,
      JSON.stringify(expected[2].read_or_measure_range), JSON.stringify(changed)]);
    assert.equal(wrongTrace.exit_code, 1, 'invalid-order driver must fail');
    const tracePath = join(fixtureRoot, 'wrong-order-output.json'); json(tracePath, wrongTrace);
    const bad = clone(observed); bad[2].method_evidence_ref = tracePath;
    rejects(runCase('actual-wrong-order', {observations: bad}), 'ASSERT-MEASURE', 'captured range/method');
  });
  check('source drift found by independent replay despite copied expected hash', () => {
    writeFileSync(sourceA, Buffer.concat([bytesA, Buffer.from('Changed after capture.\n')]));
    try { rejects(runCase('source-drift'), 'ASSERT-MEASURE', 'replayed source drift'); }
    finally { writeFileSync(sourceA, bytesA); }
  });
  check('tampered parent snapshot cannot gain authority', () => {
    const changedPath = join(fixtureRoot, 'tampered-parent.json'); json(changedPath, expected.slice(0, 3));
    const entry = runCase('parent-drift', {parentRef: {path: changedPath, sha256: expectedSha256}});
    rejects(entry); assert.match(entry.process.stderr, /parent snapshot drift/);
  });
  check('base/graft/non-adoption findings retain source evidence', () => {
    const synthesis = JSON.parse(readFileSync(synthesisPath, 'utf8'));
    assert.equal(synthesis.base.version, digest(bytesA));
    assert.equal(synthesis.grafts[0].version, digest(bytesB));
    assert.ok(synthesis.non_adoptions.every(item => item.reason));
    synthesis.evidence_refs.forEach(path => assert.equal(JSON.parse(readFileSync(path, 'utf8')).exit_code, 0));
  });

  if (mutation) check('denominator guard removal red; exact restoration green', () => {
    const isolatedRoot = join(fixtureRoot, 'mutation-root');
    const isolatedOwner = join(isolatedRoot, relativeOwner);
    mkdirSync(dirname(isolatedOwner), {recursive: true});
    const guard = "  if (!equal(expected, returned)) throw Error('child denominator changed'); // denominator guard";
    assert.equal(ownerText.split(guard).length, 2, 'guard mutation target must occur once');
    writeFileSync(isolatedOwner, ownerText.replace(guard, ''));
    const red = execute(process.execPath, [fileURLToPath(import.meta.url), '--source-root', isolatedRoot, '--no-mutation']);
    mutationRuns.push({mutation: 'remove exact parent/child denominator guard in isolated owner', process: red});
    assert.equal(red.exit_code, 1, 'removed guard did not turn the same suite red');
    assert.match(red.stderr, /child denominator deletion.*unexpectedly accepted/);
    writeFileSync(isolatedOwner, ownerBytes);
    const green = execute(process.execPath, [fileURLToPath(import.meta.url), '--source-root', isolatedRoot, '--no-mutation']);
    mutationRuns.push({mutation: 'restore exact owner bytes', process: green});
    assert.equal(green.exit_code, 0, green.stderr);
    assert.equal(digest(readFileSync(isolatedOwner)), digest(ownerBytes));
  });

  const evidence = {schema_version: 1, test: 'evidence-receipts-contract', owner_path: ownerPath,
    owner_sha256: digest(ownerBytes), example_sha256: digest(block[1]), fixture_root: fixtureRoot,
    parent_expected_ref: {path: expectedPath, sha256: expectedSha256}, expected, observed,
    parent_scope_ref: {path: scopePath, sha256: scopeSha256},
    source_hashes: {[sourceA]: digest(bytesA), [sourceB]: digest(bytesB), [sourceC]: digest(bytesC)},
    synthesis_path: synthesisPath, checks, cases: caseRuns, processes, mutations: mutationRuns,
    failures, native_qg: 'NOT_RUN; root must invoke actual cold consumer after integration',
    scope: 'local synthetic byte-read/measurement fixtures; no permission/model/source-signature authentication'};
  if (evidencePath) json(evidencePath, evidence);
  console.log(`Evidence receipts: ${checks.length - failures.length}/${checks.length} local checks; native QG not run.`);
  if (evidencePath) console.log(`Evidence: ${evidencePath}`);
  if (keepFixtures) console.log(`Fixtures: ${fixtureRoot}`);
} catch (error) {
  failures.push(error.message);
  console.error(error.stack);
} finally {
  if (!keepFixtures) rmSync(fixtureRoot, {recursive: true, force: true});
}
process.exitCode = failures.length ? 1 : 0;
