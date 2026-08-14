#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  aggregateLaneReceipts,
  INDEX_PATH,
  loadIndex,
  makeExecutionReceipt,
  OBLIGATION_CLASSES,
  RESULT_LATTICE,
  sha256,
  validateLedger,
} from './obligation-runtime.mjs';
import {
  extractSourceAnchors,
  jsonBytes,
  recomputeSourceManifest,
  stable,
} from './obligation-census.mjs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(MODULE_DIR, '../..');
const MATRIX_PATH = join(MODULE_DIR, 'obligation-mutation-matrix.json');
const SOURCE_MANIFEST_PATH = 'framework-audit/2026-08-11-rule-execution-handshake/obligation-source-manifest.json';
const REQUIRED_MUTANTS = Object.freeze([
  'MUT-RUNTIME-CONSUMER-REMOVED',
  'MUT-RUNTIME-MATCHER-WRONG',
  'MUT-RUNTIME-TRUST-UNTRUSTED',
  'MUT-RUNTIME-RECEIPT-REMOVED',
  'MUT-RUNTIME-SOURCE-REMOVED',
  'MUT-RUNTIME-REAL-NOOP',
  'MUT-RUNTIME-EXIT1-NORMALIZED',
  'MUT-RUNTIME-NOT-RUN-PASS',
  'MUT-RUNTIME-S0-DEGRADED',
  'MUT-RUNTIME-S3-DEGRADED',
]);

const fail = (message) => { throw new Error(message); };
const evidence = (kind, uri, value) => ({ kind, uri, sha256: sha256(Buffer.from(stable(value), 'utf8')) });

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || stable(Object.keys(value).sort()) !== stable([...keys].sort())) fail(`${label} keys must be exact`);
}

function readJson(path, label) {
  let value;
  try { value = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { fail(`${label} is not JSON: ${error.message}`); }
  return value;
}

function option(args, name, required = true) {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    if (required) fail(`missing ${name}`);
    return null;
  }
  return args[index + 1];
}

function commandsFor(config, event, fragment) {
  const groups = config?.hooks?.[event] || [];
  const matches = [];
  groups.forEach((group, groupIndex) => {
    (group.hooks || []).forEach((hook, hookIndex) => {
      if (typeof hook.command === 'string' && hook.command.includes(fragment)) {
        matches.push({ group, hook, groupIndex, hookIndex });
      }
    });
  });
  return matches;
}

function verifyMatrix(matrix) {
  exactKeys(matrix, ['schema_version', 'plan_id', 'production_entrypoints', 'mutants'], 'mutation matrix');
  if (matrix.schema_version !== 'luca.obligation-mutation-matrix.v1' || matrix.plan_id !== 'REX-20260811-001') fail('mutation matrix identity mismatch');
  exactKeys(matrix.production_entrypoints, ['task_start', 'stop', 'verify', 'pre_commit', 'ci'], 'production entrypoints');
  if (!Array.isArray(matrix.mutants)) fail('mutation matrix mutants are invalid');
  const ids = matrix.mutants.map((row) => row.id).sort();
  if (stable(ids) !== stable([...REQUIRED_MUTANTS].sort())) fail('mutation matrix mutant exact-set mismatch');
  for (const row of matrix.mutants) {
    exactKeys(row, ['id', 'expected_killers'], `mutant ${row?.id}`);
    if (!Array.isArray(row.expected_killers) || row.expected_killers.length === 0) fail(`mutant ${row.id} has no expected killer`);
  }
  return matrix;
}

export function verifyReverseCoverage({ root = DEFAULT_ROOT, indexPath = INDEX_PATH, approvedPath = null, receiptPath = null }) {
  const index = loadIndex(indexPath);
  if ((approvedPath === null) !== (receiptPath === null)) fail('approved census and implementation receipt must be supplied together');
  if (approvedPath) {
    const approvedBytes = readFileSync(approvedPath);
    const receiptBytes = readFileSync(receiptPath);
    if (sha256(approvedBytes) !== index.approved.census_sha256) fail('bound approved census bytes changed');
    if (sha256(receiptBytes) !== index.approved.implementation_receipt_sha256) fail('bound implementation receipt bytes changed');
    const approved = JSON.parse(approvedBytes);
    if (approved.obligations.length !== index.records.length) fail('approved/index denominator mismatch');
    const approvedRows = new Map(approved.obligations.map((row) => [row.id, row]));
    for (const record of index.records) {
      const row = approvedRows.get(record.id);
      if (!row || stable({
        id: row.id,
        source_pointer: row.source_pointer,
        source_anchor_hash: row.source_anchor_hash,
        class: row.class,
        trigger: row.trigger,
        harnesses: row.harnesses,
        mutant_ids: row.mutant_ids,
        receipt_kind: row.receipt_kind,
        degradation_code: row.degradation_code,
        owner: row.owner,
        enforcement: row.enforcement,
        native_status: row.native_status,
      }) !== stable({
        id: record.id,
        source_pointer: record.source_pointer,
        source_anchor_hash: record.source_anchor_hash,
        class: record.class,
        trigger: record.trigger,
        harnesses: record.harnesses,
        mutant_ids: record.mutant_ids.filter((id) => !id.startsWith('MUT-RUNTIME-')),
        receipt_kind: record.receipt_kind,
        degradation_code: record.degradation_code,
        owner: record.owner,
        enforcement: record.enforcement,
        native_status: record.approved_native_status,
      })) fail(`approved/index provenance mismatch ${record.id}`);
    }
  }
  const baselinePath = join(root, SOURCE_MANIFEST_PATH);
  const baselineBytes = readFileSync(baselinePath);
  const baseline = readJson(baselinePath, 'obligation source manifest');
  const effective = recomputeSourceManifest({
    root,
    targetCommit: index.approved.target_commit,
    baseline,
    baselineSha256: sha256(baselineBytes),
  });
  const effectiveSha256 = sha256(jsonBytes(effective));
  if (effectiveSha256 !== index.approved.source_manifest_sha256) {
    fail(`approved source denominator binding mismatch: ${effectiveSha256} != ${index.approved.source_manifest_sha256}`);
  }
  const extracted = extractSourceAnchors({ root, effective });
  if (extracted.obligations.length !== index.records.length) fail('reverse denominator count mismatch');
  const records = new Map(index.records.map((row) => [row.id, row]));
  for (const row of extracted.obligations) {
    const record = records.get(row.id);
    if (!record || stable({
      source_pointer: record.source_pointer,
      source_anchor_hash: record.source_anchor_hash,
      class: record.class,
      trigger: record.trigger,
      harnesses: record.harnesses,
      receipt_kind: record.receipt_kind,
      degradation_code: record.degradation_code,
      owner: record.owner,
      enforcement: record.enforcement,
    }) !== stable({
      source_pointer: row.source_pointer,
      source_anchor_hash: row.source_anchor_hash,
      class: row.class,
      trigger: row.trigger,
      harnesses: row.harnesses,
      receipt_kind: row.receipt_kind,
      degradation_code: row.degradation_code,
      owner: row.owner,
      enforcement: row.enforcement,
    })) fail(`reverse source mismatch ${row.id}`);
  }
  const currentCandidateDelta = { changed_paths: [], missing_paths: [] };
  for (const row of effective.resolved) {
    const path = join(root, row.path);
    if (!existsSync(path)) currentCandidateDelta.missing_paths.push(row.path);
    else if (sha256(readFileSync(path)) !== row.sha256) currentCandidateDelta.changed_paths.push(row.path);
  }
  currentCandidateDelta.changed_paths.sort();
  currentCandidateDelta.missing_paths.sort();
  return {
    count: extracted.obligations.length,
    source_count: effective.resolved_count,
    current_candidate_delta: currentCandidateDelta,
  };
}

export function verifyProductionEntrypoints({ root = DEFAULT_ROOT, indexPath = INDEX_PATH, matrixPath = MATRIX_PATH }) {
  const index = loadIndex(indexPath);
  const matrix = verifyMatrix(readJson(matrixPath, 'mutation matrix'));
  const claude = readJson(join(root, '.claude/settings.json'), 'Claude hook config');
  const codex = readJson(join(root, '.codex/hooks.json'), 'Codex hook config');
  for (const [event, spec] of [
    ['UserPromptSubmit', matrix.production_entrypoints.task_start],
    ['Stop', matrix.production_entrypoints.stop],
  ]) {
    for (const [harness, config] of [['claude', claude], ['codex', codex]]) {
      const matches = commandsFor(config, event, spec.command_fragment);
      if (matches.length !== 1) fail(`${harness} ${event} obligation consumer missing or duplicated`);
      const [{ group, hook }] = matches;
      if (Object.hasOwn(group, 'matcher') && group.matcher !== '') fail(`${harness} ${event} obligation matcher is wrong`);
      if (harness === 'codex' && !hook.command.includes('.codex/codex-hook-adapter.mjs')) fail('Codex obligation consumer bypasses native adapter');
      if (!hook.command.includes('[ "$c" = "0" ] && exit 0 || exit 2')) {
        fail(`${harness} ${event} obligation consumer normalizes unexpected nonzero exit`);
      }
    }
  }
  for (const [name, spec] of [
    ['verify', matrix.production_entrypoints.verify],
    ['pre-commit', matrix.production_entrypoints.pre_commit],
    ['ci', matrix.production_entrypoints.ci],
  ]) {
    const text = readFileSync(join(root, spec.path), 'utf8');
    const count = text.split(spec.command_fragment).length - 1;
    if (count !== 1) fail(`${name} production entrypoint missing or duplicated`);
  }
  const precommit = readFileSync(join(root, matrix.production_entrypoints.pre_commit.path), 'utf8');
  const obligationOffset = precommit.indexOf(matrix.production_entrypoints.pre_commit.command_fragment);
  const fastOffset = precommit.indexOf('if [ "${FAST_COMMIT');
  if (obligationOffset < 0 || fastOffset < 0 || obligationOffset > fastOffset) fail('FAST_COMMIT can bypass obligation pre-commit receipt');
  if (!index.records.every((row) => row.receipt_kind === matrix.production_entrypoints.task_start.receipt_kind)) fail('index receipt wiring mismatch');
  return { index_count: index.records.length, entrypoints: ['task-start', 'stop', 'verify', 'pre-commit', 'ci'] };
}

export function verifyRealBehavior({ root = DEFAULT_ROOT, indexPath = INDEX_PATH }) {
  const temporary = mkdtempSync(join(tmpdir(), 'obligation-runtime-behavior-'));
  const ledgerPath = join(temporary, 'ledger.json');
  const input = JSON.stringify({
    session_id: 'tst-010-real-behavior',
    cwd: root,
    prompt: '$design-brief verify obligation behavior',
    obligation_route_context: {
      complete: true,
      skills: ['design-brief'],
      roles: [],
      workflows: [],
      actions: [],
      paths: [],
    },
  });
  const startCommand = join(root, 'scripts/evolution/obligation-task-start-hook.mjs');
  const stopCommand = join(root, 'scripts/evolution/obligation-stop-hook.mjs');
  const env = { ...process.env, LUCA_OBLIGATION_LEDGER_PATH: ledgerPath, LUCA_OBLIGATION_INDEX: indexPath };
  try {
    const start = spawnSync(process.execPath, [startCommand], { cwd: root, env, encoding: 'utf8', input, timeout: 30000 });
    if (start.status !== 0 || !existsSync(ledgerPath) || !/\[obligation-runtime\]/.test(start.stdout || '')) fail(`task-start native behavior failed: ${start.stderr || start.stdout}`);
    const ledger = validateLedger(readJson(ledgerPath, 'behavior ledger'));
    if (ledger.entries.length !== 1808 || ledger.aggregate === 'PASS') fail('task-start behavior did not compile the approved denominator truthfully');
    const stop = spawnSync(process.execPath, [stopCommand], { cwd: root, env, encoding: 'utf8', input, timeout: 30000 });
    let stopResult = null;
    try { stopResult = JSON.parse(stop.stdout); } catch { }
    if (stop.status !== 0 || stopResult?.decision !== 'block' || !/NOT_RUN|UNKNOWN|BLOCKED/.test(stopResult.reason || '')) fail('Stop consumer did not block unfinished applicable obligations');
    return { ledger_sha256: sha256(readFileSync(ledgerPath)), aggregate: ledger.aggregate };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function codexHooksList(root) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('codex', ['app-server'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch { }
      if (error) reject(error); else resolvePromise(value);
    };
    child.stdout.on('data', (data) => {
      stdout += String(data);
      for (const line of stdout.split('\n')) {
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 2) {
          const hooks = (message.result?.data || []).flatMap((group) => group.hooks || []);
          finish(null, hooks);
        }
      }
    });
    child.stderr.on('data', (data) => { stderr += String(data); });
    child.on('error', (error) => finish(error));
    child.on('close', () => finish(new Error(`Codex hooks/list closed without response: ${stderr.slice(0, 500)}`)));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'luca-obligation-probe', title: 'luca obligation probe', version: '1.0.0' } } })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'hooks/list', params: {} })}\n`);
    setTimeout(() => finish(new Error('Codex hooks/list timeout')), 10000);
  });
}

export async function probeProductionActivation({ root = DEFAULT_ROOT, harness, codexHooksFixture = null }) {
  const entrypoints = verifyProductionEntrypoints({ root, indexPath: join(root, 'scripts/evolution/obligation-index.json'), matrixPath: join(root, 'scripts/evolution/obligation-mutation-matrix.json') });
  const behavior = verifyRealBehavior({ root, indexPath: join(root, 'scripts/evolution/obligation-index.json') });
  const checks = ['ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'REAL-BEHAVIOR'];
  if (harness === 'codex') {
    const hooks = codexHooksFixture ? readJson(codexHooksFixture, 'Codex hooks/list fixture').hooks : await codexHooksList(root);
    if (!Array.isArray(hooks)) fail('Codex hooks/list payload is invalid');
    const needed = ['obligation-task-start-hook.mjs', 'obligation-stop-hook.mjs'];
    for (const fragment of needed) {
      const matches = hooks.filter((hook) => typeof hook.command === 'string' && hook.command.includes(fragment));
      if (matches.length !== 1 || matches[0].trustStatus !== 'trusted' || !/^sha256:[a-f0-9]{64}$/.test(matches[0].currentHash || '')) {
        fail(`Codex native hook is missing, duplicated, or untrusted: ${fragment}`);
      }
    }
    checks.push('ACTIVATION-CODEX-TRUST');
  } else if (harness !== 'claude') fail('local-live harness must be claude or codex');
  return { entrypoints, behavior, checks };
}

function receiptFor({ entrypoint, lane, checks, classes = OBLIGATION_CLASSES, result, detail }) {
  return makeExecutionReceipt({
    entrypoint,
    lane,
    executedChecks: checks,
    classes,
    result,
    evidence: [evidence('CHECK_SET', `entrypoint:${entrypoint}`, detail)],
  });
}

export function verifyExternalFixture(path) {
  if (!path) return receiptFor({
    entrypoint: 'external',
    lane: 'L3_EXTERNAL',
    checks: ['GLOBAL-READBACK-NOT-RUN'],
    classes: OBLIGATION_CLASSES,
    result: 'NOT_RUN',
    detail: { fixture: null },
  });
  const fixture = readJson(path, 'external fixture');
  exactKeys(fixture, ['schema_version', 'targets'], 'external fixture');
  if (fixture.schema_version !== 'luca.obligation-external-fixture.v1' || !Array.isArray(fixture.targets) || fixture.targets.length === 0) fail('external fixture identity/count mismatch');
  for (const row of fixture.targets) {
    exactKeys(row, ['id', 'class', 'result', 'evidence'], `external target ${row?.id}`);
    if (typeof row.id !== 'string' || !row.id || !OBLIGATION_CLASSES.includes(row.class) || !RESULT_LATTICE.includes(row.result)
      || !Array.isArray(row.evidence) || row.evidence.length === 0) fail(`external target is invalid: ${row?.id}`);
  }
  const result = fixture.targets.some((row) => row.result === 'BLOCKED') ? 'BLOCKED'
    : fixture.targets.some((row) => row.result === 'UNKNOWN') ? 'UNKNOWN'
      : fixture.targets.some((row) => row.result === 'NOT_RUN') ? 'NOT_RUN'
        : fixture.targets.some((row) => row.result === 'DEGRADED') ? 'DEGRADED' : 'PASS';
  return receiptFor({
    entrypoint: 'external',
    lane: 'L3_EXTERNAL',
    checks: fixture.targets.map((row) => `GLOBAL:${row.id}`),
    classes: [...new Set(fixture.targets.map((row) => row.class))],
    result,
    detail: fixture,
  });
}

async function main(argv) {
  const [mode, ...args] = argv;
  const root = resolve(option(args, '--root', false) || DEFAULT_ROOT);
  let receipt;
  if (mode === 'l1') {
    const entrypoint = option(args, '--entrypoint');
    if (!['verify', 'pre-commit', 'ci'].includes(entrypoint)) fail('L1 entrypoint must be verify, pre-commit, or ci');
    const indexPath = resolve(option(args, '--index', false) || join(root, 'scripts/evolution/obligation-index.json'));
    const matrixPath = resolve(option(args, '--matrix', false) || join(root, 'scripts/evolution/obligation-mutation-matrix.json'));
    const reverse = verifyReverseCoverage({
      root,
      indexPath,
      approvedPath: option(args, '--approved', false),
      receiptPath: option(args, '--u009-receipt', false),
    });
    const entrypoints = verifyProductionEntrypoints({ root, indexPath, matrixPath });
    const behavior = verifyRealBehavior({ root, indexPath });
    const syntax = spawnSync(process.execPath, ['--check', join(root, 'scripts/evolution/obligation-runtime.mjs')], { cwd: root, encoding: 'utf8', input: '' });
    if (syntax.status !== 0) fail(`runtime syntax check failed: ${syntax.stderr}`);
    receipt = receiptFor({
      entrypoint,
      lane: 'L1_HERMETIC',
      checks: ['INDEX-SCHEMA', 'REVERSE-DENOMINATOR', 'ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'LEDGER-EVIDENCE', 'REAL-BEHAVIOR', 'MUTATION-MATRIX'],
      result: 'PASS',
      detail: { reverse, entrypoints, behavior },
    });
  } else if (mode === 'l2') {
    const harness = option(args, '--harness');
    const detail = await probeProductionActivation({ root, harness, codexHooksFixture: option(args, '--codex-hooks-fixture', false) });
    receipt = receiptFor({ entrypoint: 'local-live', lane: 'L2_LOCAL_LIVE', checks: detail.checks, result: 'PASS', detail });
  } else if (mode === 'l3') {
    receipt = verifyExternalFixture(option(args, '--external-fixture', false));
  } else if (mode === 'aggregate') {
    const paths = args.filter((arg) => !arg.startsWith('--'));
    const receipts = paths.map((path) => readJson(resolve(path), 'lane receipt'));
    const result = aggregateLaneReceipts(receipts);
    process.stdout.write(`${result}\n`);
    return result === 'PASS' || result === 'NOT_APPLICABLE' ? 0 : 1;
  } else fail('usage: verify-obligation-runtime.mjs <l1|l2|l3|aggregate>');
  const output = option(args, '--receipt-output', false);
  if (output) writeFileSync(resolve(output), jsonBytes(receipt), { mode: 0o600 });
  process.stdout.write(`OBLIGATION_RUNTIME_RECEIPT ${JSON.stringify(receipt)}\n`);
  return receipt.result === 'PASS' || receipt.result === 'DEGRADED' || receipt.result === 'NOT_APPLICABLE' ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`[verify-obligation-runtime] ${error.message}\n`);
    process.exitCode = 1;
  }
}
