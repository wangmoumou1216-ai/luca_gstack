// Test-only instance binding for the two opt-in native CLI suites. This records
// observations; it neither drives a second harness nor supplies a QG verdict.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const json = value => JSON.stringify(value, null, 2) + '\n';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();
export const fileRef = path => ({ path: resolve(path), sha256: sha(readFileSync(path)) });
export function moduleSourceFiles(entries) {
  const seen = new Set();
  function visit(file) {
    file = resolve(file); if (seen.has(file)) return; seen.add(file);
    if (!file.endsWith('.mjs')) return;
    for (const match of readFileSync(file, 'utf8').matchAll(/(?:from\s*|import\s*\()(['"])((?:\.{1,2}\/|file:\/\/)[^'"\n]+)\1/g)) {
      const target = match[2].startsWith('file:') ? fileURLToPath(match[2]) : resolve(dirname(file), match[2]);
      if (existsSync(target)) visit(target);
    }
  }
  entries.forEach(visit); return [...seen];
}
export function evidenceOptions(argv = process.argv) {
  const option = name => argv.includes(name) ? argv[argv.indexOf(name) + 1] : null;
  const dir = option('--evidence-dir'), scope = option('--scope-ref');
  assert.equal(Boolean(dir), Boolean(scope), '--evidence-dir and --scope-ref must be supplied together');
  if (!dir) return null;
  assert.ok(!existsSync(resolve(dir)), 'use a fresh evidence directory; failed attempts are immutable');
  mkdirSync(resolve(dir), { recursive: true });
  return { dir: realpathSync(resolve(dir)), scope: fileRef(scope) };
}
function command(argv, cwd) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: 10000 });
  return { argv, cwd, exit_code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message };
}
function processTable() {
  const capture = command(['/bin/ps', '-axo', 'pid=,pgid=,ppid=,command='], '/');
  assert.equal(capture.exit_code, 0, capture.stderr);
  return { capture, rows: capture.stdout.split('\n').map(line => line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/))
    .filter(Boolean).map(row => ({ pid: +row[1], pgid: +row[2], ppid: +row[3], command: row[4] })) };
}
const isWithin = (parent, child) => { const part = relative(parent, child); return part === '' || (!part.startsWith('..') && !part.startsWith('/')); };

export function nativeEvidence(options) {
  const { audit, name, repo, driver, sources, sourceMetadata = {}, cwd, child, argv, env, seed, coverage, scratch, port, setupPids = [] } = options;
  if (!audit) return null;
  assert.ok(!isWithin(realpathSync(scratch), audit.dir), 'proof must live outside scratch cleanup root');
  const directory = join(audit.dir, name); mkdirSync(directory);
  const refs = new Map();
  const write = (name, value, raw = false) => {
    const path = join(directory, name); writeFileSync(path, raw ? value : json(value));
    const ref = fileRef(path); refs.set(ref.path, ref); return ref;
  };
  const sourcePaths = [...new Set([driver, ...sources].map(path => resolve(path)))].sort();
  const identity = () => ({ git_head: command(['git', 'rev-parse', 'HEAD'], repo).stdout.trim(),
    repository: realpathSync(repo), metadata: sourceMetadata,
    files: sourcePaths.map(path => ({ locator: path, sha256: sha(readFileSync(path)) })) });
  const sourceIdentity = identity();
  const sourceRef = write('source-revision.json', sourceIdentity);
  mkdirSync(join(directory, 'source-files'));
  for (const [index, source] of sourceIdentity.files.entries()) {
    const target = join(directory, 'source-files', `${index}-${basename(source.locator)}`);
    cpSync(source.locator, target); const ref = fileRef(target); refs.set(ref.path, ref);
  }
  const environmentRef = write('environment.json', Object.fromEntries(Object.entries(env).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, { sha256: sha(String(value)), value: /^(HOME|TMPDIR|TMP|TEMP|CODEX_HOME|CLAUDE_CONFIG_DIR|ANTHROPIC_BASE_URL|NO_PROXY|no_proxy|LUCA_GSTACK_ROOT|LUCA_PROJECTS_ROOT)$/.test(key) ? value : undefined }])));
  const seedRef = write('seed.json', seed);
  const driverRef = fileRef(driver);
  const project = { project: 'NO_PIN', fixture_id: basename(scratch) };
  const surface = { kind: 'native-cli', argv, cwd: realpathSync(cwd), environment_ref: environmentRef,
    model_boundary: `isolated loopback model at http://127.0.0.1:${port}; real CLI, tool dispatcher and hook processes` };
  const markerPath = join(scratch, `instance-${name}.json`);
  const marker = { project_identity: project, approved_scope_ref: audit.scope, surface,
    instance_id: `${basename(scratch)}:${name}:${child.pid}`, pid: child.pid, data_root: realpathSync(scratch) };
  writeFileSync(markerPath, json(marker));
  write('instance-seed.json', marker);
  let manifest, manifestRef, before, after, startedAt, endedAt, captured;
  const probe = (phase, observation) => {
    const table = processTable(), actual = table.rows.find(row => row.pid === child.pid);
    const cwdProbe = command(['/usr/sbin/lsof', '-a', '-p', String(child.pid), '-d', 'cwd', '-Fn'], cwd);
    const observedCwd = cwdProbe.stdout.split('\n').find(line => line.startsWith('n'))?.slice(1);
    const liveMarker = JSON.parse(readFileSync(markerPath));
    const currentSource = identity();
    const value = { ...liveMarker, pid: actual?.pid ?? null, source_revision: sha(json(currentSource)),
      ready: Boolean(actual && actual.pgid === child.pid && actual.command === argv.join(' ')
        && cwdProbe.exit_code === 0 && observedCwd === realpathSync(cwd)
        && observation.ready), observed_at: now(), observation, process: actual,
      cwd: observedCwd, cwd_probe: cwdProbe,
      process_group: table.rows.filter(row => row.pgid === child.pid),
      driver_ref: fileRef(driver), scope_ref: fileRef(audit.scope.path) };
    const ref = write(`probe-${phase}.json`, value);
    return { ...value, evidence_ref: ref };
  };
  return {
    name, directory, child, write,
    before(observation) {
      assert.ok(!before, `${name}: duplicate first-drive probe`);
      // The first API request proves the native CLI reached its real model
      // boundary. No functional response has been sent when these bytes freeze.
      before = probe('before', observation);
      assert.ok(before.ready, `${name}: live instance doctor failed`);
      const owned = [{ kind: 'process', pid: child.pid }, { kind: 'process-group', pgid: child.pid },
        ...setupPids.map(pid => ({ kind: 'process', pid })),
        { kind: 'loopback-server', host: '127.0.0.1', port, owner_pid: process.pid },
        { kind: 'directory', path: realpathSync(scratch) }];
      manifest = { schema_version: 1, project_identity: project,
        source_revision: { ...sourceRef, locator: sourceRef.path, git_head: sourceIdentity.git_head },
        approved_scope_ref: audit.scope, surface,
        instance_probe: { command: ['/bin/ps', '-axo', 'pid=,pgid=,ppid=,command='],
          cwd_command: ['/usr/sbin/lsof', '-a', '-p', String(child.pid), '-d', 'cwd', '-Fn'],
          expected: { ...marker, source_revision: sourceRef.sha256 },
          readiness: 'owned live process/group and actual cwd; first native model request before first tool response; after native results before teardown' },
        launch: { argv, cwd, environment_ref: environmentRef, detached_process_group: child.pid },
        doctor: { argv: ['/bin/ps', '-axo', 'pid=,pgid=,ppid=,command='], cwd, environment_ref: environmentRef,
          stop_recipe: 'native exit, then TERM/KILL only the exact owned process group if residue remains' },
        drive: { argv: [process.execPath, driver, ...process.argv.slice(2)], cwd: repo, environment_ref: environmentRef, driver_ref: driverRef },
        test_data: { seed_ref: seedRef, data_root: realpathSync(scratch), auth: 'isolated fake loopback credential; no account authentication',
          reset: 'fresh mkdtemp fixture and native process for each drive; resumed session explicitly reuses its owned persisted session' },
        coverage, evidence_location: directory, cleanup: { owned_resources: owned, preserve_evidence: true } };
      manifestRef = write('manifest.json', manifest);
      write('freeze.json', { frozen_at: now(), manifest_ref: manifestRef, first_functional_response_sent: false });
      startedAt = now();
    },
    after(observation) {
      assert.ok(before && !after, `${name}: missing before or duplicate after probe`);
      endedAt = now(); after = probe('after', observation);
    },
    capture({ exitCode, stdout, stderr, results, artifacts = {} }) {
      const stdoutRef = write('native-stdout.jsonl', stdout, true), stderrRef = write('native-stderr.log', stderr, true);
      for (const [name, value] of Object.entries(artifacts)) write(name, value);
      const resultRefs = coverage.map((_, index) => write(`result-${index}.json`, results?.[index]?.actual ?? { missing: true }));
      captured = { exitCode, results, stdoutRef, stderrRef, resultRefs };
    },
    finish({ cleanup }) {
      assert.ok(captured, `${name}: preserve actual capture outside scratch before cleanup`);
      const { exitCode, results, stdoutRef, stderrRef, resultRefs } = captured;
      const operations = [], actualResults = [], gaps = [];
      if (!manifest || !before || !after) gaps.push('missing frozen manifest or live before/after probe');
      for (const observed of [before, after].filter(Boolean)) {
        for (const [key, expected] of Object.entries(manifest?.instance_probe.expected || {})) {
          if (JSON.stringify(observed[key]) !== JSON.stringify(expected)) gaps.push(`instance ${key} drift`);
        }
        if (!observed.ready) gaps.push('instance not ready');
        if (observed.driver_ref.sha256 !== driverRef.sha256 || observed.scope_ref.sha256 !== audit.scope.sha256) gaps.push('driver or scope drift');
      }
      for (const [index, row] of coverage.entries()) {
        const value = results?.[index];
        if (!value) gaps.push(`missing result for ${row.feature}/${row.entry}/${row.state}`);
        const actual = value?.actual ?? { missing: true }, expected = value?.expected ?? { present: true };
        const resultRef = resultRefs[index];
        const operationId = `${name}:${index}`;
        operations.push({ operation_id: operationId, ...row, argv: manifest?.drive.argv || [process.execPath, driver], native_argv: argv,
          cwd, started_at: startedAt, ended_at: endedAt, exit_code: exitCode, stdout_ref: resultRef,
          native_stdout_ref: stdoutRef, stderr_ref: stderrRef, observed: actual });
        for (const assertId of row.assert_ids) actualResults.push({ feature: row.feature, entry: row.entry, state: row.state,
          assert_id: assertId, operation_id: operationId, expected, actual,
          status: JSON.stringify(actual) === JSON.stringify(expected) ? 'PASS' : 'FAIL', evidence_refs: [resultRef, stdoutRef, stderrRef] });
      }
      if (exitCode !== 0) gaps.push(`native CLI exit ${exitCode}`);
      if (cleanup.remaining_owned_resources.length) gaps.push('owned resource cleanup incomplete');
      const evidenceRefs = [...refs.values()];
      const readback = evidenceRefs.map(ref => ({ ...fileRef(ref.path), matches: fileRef(ref.path).sha256 === ref.sha256 }));
      if (readback.some(ref => !ref.matches)) gaps.push('post-cleanup evidence drift');
      const receipt = { schema_version: 1, manifest_sha256: manifestRef?.sha256, run_id: marker.instance_id,
        verified_instance: { before, after }, driver_revision: driverRef,
        source_assert_ids: [...new Set(coverage.flatMap(row => row.assert_ids))], operations, actual_results: actualResults,
        evidence_refs: evidenceRefs, cleanup_result: { ...cleanup, evidence_preserved: true, post_cleanup_readback: readback },
        remaining_gaps: gaps, status: actualResults.some(row => row.status === 'FAIL') ? 'FAIL' : gaps.length ? 'GAP' : 'PASS' };
      const receiptRef = write('receipt.json', receipt);
      return { name, status: receipt.status, manifest_ref: manifestRef, receipt_ref: receiptRef, remaining_gaps: gaps };
    },
  };
}

export async function cleanupNativeEvidence(runs, scratch, port, setupPids = []) {
  const actions = [], groups = [...new Set(runs.map(run => run.child.pid))];
  for (const pgid of groups) {
    const initial = processTable().rows.filter(row => row.pgid === pgid);
    const signals = [];
    if (initial.length) {
      try { process.kill(-pgid, 'SIGTERM'); signals.push('SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      await new Promise(resolve => setTimeout(resolve, 150));
      if (processTable().rows.some(row => row.pgid === pgid)) {
        try { process.kill(-pgid, 'SIGKILL'); signals.push('SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    const residue = processTable().rows.filter(row => row.pgid === pgid);
    actions.push({ resource: { kind: 'process-group', pgid }, exit_code: residue.length ? 1 : 0, signals, before: initial, after: residue });
  }
  const remaining = processTable().rows;
  for (const pid of [...groups, ...setupPids]) actions.push({ resource: { kind: 'process', pid },
    exit_code: remaining.some(row => row.pid === pid) ? 1 : 0, observed: 'native exit/owned setup termination, read back through ps' });
  const listening = await new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000); socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false)); socket.once('timeout', () => { socket.destroy(); resolve(true); });
  });
  actions.push({ resource: { kind: 'loopback-server', host: '127.0.0.1', port, owner_pid: process.pid },
    exit_code: listening ? 1 : 0, observed: 'post-close loopback TCP connection probe', listening });
  const owned = realpathSync(scratch);
  if (!remaining.some(row => groups.includes(row.pgid) || setupPids.includes(row.pid))) rmSync(owned, { recursive: true, force: false });
  actions.push({ resource: { kind: 'directory', path: owned }, exit_code: existsSync(owned) ? 1 : 0, observed: 'owned mkdtemp root removed and absence read back' });
  return run => {
    const selected = actions.filter(action => !['process', 'process-group'].includes(action.resource.kind)
      || action.resource.pid === run.child.pid || action.resource.pgid === run.child.pid || setupPids.includes(action.resource.pid));
    return { actions: selected, remaining_owned_resources: selected.filter(action => action.exit_code !== 0).map(action => action.resource),
      observed_at: now(), process_table_after: remaining.filter(row => groups.includes(row.pgid) || setupPids.includes(row.pid)) };
  };
}
