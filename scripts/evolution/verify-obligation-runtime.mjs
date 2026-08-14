#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  aggregateLaneReceipts,
  createExecutionRun,
  INDEX_PATH,
  loadIndex,
  readExecutionReceipt,
  readExecutionRun,
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
const NATIVE_HOOK_COMMANDS = Object.freeze({
  claude: Object.freeze({
    UserPromptSubmit: 'node "${CLAUDE_PROJECT_DIR:-.}/scripts/evolution/obligation-task-start-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2',
    Stop: 'node "${CLAUDE_PROJECT_DIR:-.}/scripts/evolution/obligation-stop-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2',
  }),
  codex: Object.freeze({
    UserPromptSubmit: 'node "$(git rev-parse --show-toplevel)/.codex/codex-hook-adapter.mjs" "$(git rev-parse --show-toplevel)/scripts/evolution/obligation-task-start-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2',
    Stop: 'node "$(git rev-parse --show-toplevel)/.codex/codex-hook-adapter.mjs" "$(git rev-parse --show-toplevel)/scripts/evolution/obligation-stop-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2',
  }),
});
const PRODUCTION_ENTRYPOINT_LINES = Object.freeze({
  verify: 'check S34 "obligation runtime L1 只回执本入口真实执行集合" "node scripts/evolution/verify-obligation-runtime.mjs l1-verify"',
  'pre-commit': 'node scripts/evolution/verify-obligation-runtime.mjs l1-pre-commit',
  ci: 'run: node scripts/evolution/verify-obligation-runtime.mjs l1-ci',
});

const fail = (message) => { throw new Error(message); };

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
      if (hook.command !== NATIVE_HOOK_COMMANDS[harness][event]) fail(`${harness} ${event} obligation command is not the exact fail-closed native consumer`);
    }
  }
  for (const [name, spec] of [
    ['verify', matrix.production_entrypoints.verify],
    ['pre-commit', matrix.production_entrypoints.pre_commit],
    ['ci', matrix.production_entrypoints.ci],
  ]) {
    const text = readFileSync(join(root, spec.path), 'utf8');
    const exactLines = text.split('\n').map((line) => line.trim()).filter((line) => line === PRODUCTION_ENTRYPOINT_LINES[name]);
    if (exactLines.length !== 1) fail(`${name} production entrypoint exact command missing or duplicated`);
  }
  const precommit = readFileSync(join(root, matrix.production_entrypoints.pre_commit.path), 'utf8');
  const obligationOffset = precommit.indexOf(matrix.production_entrypoints.pre_commit.command_fragment);
  const fastOffset = precommit.indexOf('if [ "${FAST_COMMIT');
  if (obligationOffset < 0 || fastOffset < 0 || obligationOffset > fastOffset) fail('FAST_COMMIT can bypass obligation pre-commit receipt');
  if (!index.records.every((row) => row.receipt_kind === matrix.production_entrypoints.task_start.receipt_kind)) fail('index receipt wiring mismatch');
  return { index_count: index.records.length, entrypoints: ['task-start', 'stop', 'verify', 'pre-commit', 'ci'] };
}

export function verifyRealBehavior({ root = DEFAULT_ROOT, indexPath = INDEX_PATH }) {
  const sessionId = 'tst-010-real-behavior';
  const gitDir = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: root, encoding: 'utf8', input: '' });
  if (gitDir.status !== 0 || !gitDir.stdout.trim()) fail('cannot resolve real-behavior ledger root');
  const ledgerPath = join(gitDir.stdout.trim(), 'luca-obligation-runtime', `${sha256(Buffer.from(sessionId)).slice(0, 32)}.json`);
  const input = JSON.stringify({
    session_id: sessionId,
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
  const env = { ...process.env };
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
    rmSync(ledgerPath, { force: true });
  }
}

export function verifyRuntimeLattice({ root = DEFAULT_ROOT } = {}) {
  const runtime = join(root, 'scripts/evolution/obligation-runtime.mjs');
  const result = spawnSync(process.execPath, [runtime, 'self-test-lattice'], { cwd: root, encoding: 'utf8', input: '', timeout: 30000 });
  if (result.status !== 0 || result.stdout.trim() !== 'OBLIGATION_LATTICE_SELF_TEST_PASS') {
    fail(`runtime lattice production self-test failed: ${result.stderr || result.stdout}`);
  }
  return { token: result.stdout.trim(), runtime_sha256: sha256(readFileSync(runtime)) };
}

async function codexHooksList(root) {
  return new Promise((resolvePromise, reject) => {
    const configuredBinary = '/Users/luca/.local/bin/codex';
    if (!existsSync(configuredBinary)) throw new Error('bound Codex executable is missing');
    const binary = realpathSync(configuredBinary);
    const child = spawn(binary, ['-C', root, 'app-server'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
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

export async function probeProductionActivation({ root = DEFAULT_ROOT, harness, codexHooksProvider = codexHooksList }) {
  const entrypoints = verifyProductionEntrypoints({ root, indexPath: join(root, 'scripts/evolution/obligation-index.json'), matrixPath: join(root, 'scripts/evolution/obligation-mutation-matrix.json') });
  const behavior = verifyRealBehavior({ root, indexPath: join(root, 'scripts/evolution/obligation-index.json') });
  const checks = ['ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'REAL-BEHAVIOR'];
  if (harness === 'codex') {
    if (typeof codexHooksProvider !== 'function') fail('Codex hooks provider must be a function');
    const hooks = await codexHooksProvider(root);
    if (!Array.isArray(hooks)) fail('Codex hooks/list payload is invalid');
    const configPath = realpathSync(join(root, '.codex/hooks.json'));
    const configBytes = readFileSync(configPath);
    const config = JSON.parse(configBytes);
    const expected = [];
    const snake = (value) => value.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toLowerCase();
    for (const event of ['UserPromptSubmit', 'Stop']) {
      (config.hooks[event] || []).forEach((group, groupIndex) => (group.hooks || []).forEach((hook, hookIndex) => {
        if (/obligation-(?:task-start|stop)-hook\.mjs/u.test(hook.command || '')) {
          expected.push({ event, suffix: `:${snake(event)}:${groupIndex}:${hookIndex}`, command: hook.command });
        }
      }));
    }
    if (expected.length !== 2) fail('Codex obligation hook config exact set is missing or duplicated');
    for (const item of expected) {
      const matches = hooks.filter((hook) => String(hook.key || '').endsWith(item.suffix));
      const hook = matches[0];
      const nativeEvent = item.event[0].toLowerCase() + item.event.slice(1);
      if (matches.length !== 1 || hook.eventName !== nativeEvent || hook.command !== item.command
        || hook.trustStatus !== 'trusted' || !/^sha256:[a-f0-9]{64}$/.test(hook.currentHash || '')
        || !hook.key.startsWith(`${configPath}:`)) {
        fail(`Codex native hook is missing, duplicated, or untrusted: ${item.event}`);
      }
    }
    if (codexHooksProvider === codexHooksList) {
      const trustPath = realpathSync(join(process.env.CODEX_HOME || join(process.env.HOME || '', '.codex'), 'config.toml'));
      const trustText = readFileSync(trustPath, 'utf8');
      for (const item of expected) {
        const hook = hooks.find((candidate) => String(candidate.key || '').endsWith(item.suffix));
        const header = `[hooks.state."${hook.key}"]`;
        const offset = trustText.split('\n').findIndex((line) => line === header);
        if (offset < 0) fail('Codex native trust state is missing');
        const block = trustText.split('\n').slice(offset + 1).find((line) => line.trim() && !line.startsWith('['));
        if (block?.trim().match(/^trusted_hash\s*=\s*"([^"]+)"$/u)?.[1] !== hook.currentHash) fail('Codex native trusted hash differs from hooks/list');
      }
    }
    checks.push('ACTIVATION-CODEX-TRUST');
  } else if (harness !== 'claude') fail('local-live harness must be claude or codex');
  return { entrypoints, behavior, checks };
}

function processRecord(pid) {
  const parent = spawnSync('/bin/ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8', input: '' });
  const command = spawnSync('/bin/ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8', input: '' });
  if (parent.status !== 0 || command.status !== 0) return null;
  return { pid, ppid: Number(parent.stdout.trim()), command: command.stdout.trim() };
}

function assertNativePreCommitContext() {
  const chain = [];
  let pid = process.ppid;
  for (let depth = 0; depth < 6 && Number.isSafeInteger(pid) && pid > 1; depth += 1) {
    const record = processRecord(pid);
    if (!record) break;
    chain.push(record);
    pid = record.ppid;
  }
  if (!chain[0]?.command.includes('.githooks/pre-commit')
    || !chain.some((row) => /(?:^|\/)git(?:\s|$).*\bcommit\b/u.test(row.command))) {
    fail('l1-pre-commit requires an actual git commit hook process chain');
  }
  return chain;
}

function assertGitHubActionsContext(root) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const chain = [];
  let pid = process.ppid;
  for (let depth = 0; depth < 10 && Number.isSafeInteger(pid) && pid > 1; depth += 1) {
    const record = processRecord(pid);
    if (!record) break;
    chain.push(record);
    pid = record.ppid;
  }
  const nativeRunner = chain.some((row) => (
    /(?:^|\s)(?:\S*\/)?Runner\.(?:Worker|Listener)(?:\s|$)/u.test(row.command)
    || /(?:^|\s)\S*\/actions-runner\/(?:run|runsvc)\.sh(?:\s|$)/u.test(row.command)
  ));
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true'
    || !/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '')
    || !/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || '')
    || !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '')
    || process.env.GITHUB_SHA !== spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', input: '' }).stdout.trim()
    || !String(process.env.GITHUB_WORKFLOW_REF || '').includes('.github/workflows/ci.yml@')
    || typeof process.env.GITHUB_JOB !== 'string' || !process.env.GITHUB_JOB
    || !/^[^/]+\/[^/]+$/u.test(process.env.GITHUB_REPOSITORY || '')
    || !['macOS', 'Linux', 'Windows'].includes(process.env.RUNNER_OS)
    || !process.env.RUNNER_NAME || !process.env.RUNNER_TEMP || !process.env.GITHUB_WORKSPACE
    || realpathSync(process.env.GITHUB_WORKSPACE) !== realpathSync(root)
    || !eventPath || !nativeRunner) fail('l1-ci requires GitHub Actions native runner ancestry/context');
  readJson(realpathSync(eventPath), 'GitHub Actions event payload');
  return realpathSync(eventPath);
}

function receiptEntrypoint(mode, argv) {
  if (mode === 'l1-verify') return 'verify';
  if (mode === 'l1-pre-commit') return 'pre-commit';
  if (mode === 'l1-ci') return 'ci';
  if (mode === 'l3') return 'external';
  if (mode === 'l2') {
    const offset = argv.indexOf('--harness');
    if (offset < 0 || !['claude', 'codex'].includes(argv[offset + 1])) fail('l2 receipt authorization lacks an exact harness');
    return `local-live-${argv[offset + 1]}`;
  }
  fail('mode cannot authorize a receipt');
}

function receiptProcessSnapshot() {
  const command = spawnSync('/bin/ps', ['-ww', '-o', 'command=', '-p', String(process.pid)], { encoding: 'utf8', input: '' });
  const started = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(process.pid)], { encoding: 'utf8', input: '' });
  if (command.status !== 0 || started.status !== 0 || !command.stdout.trim() || !started.stdout.trim()) fail('cannot capture verifier process identity');
  return { command: command.stdout.trim(), started_at: started.stdout.trim() };
}

function receiptAuthorizationCore(value) {
  const { authorization_id: ignored, ...core } = value;
  return core;
}

function receiptFor({ root, indexPath, runTicketPath, mode, checks, detail, startedAt, extraArtifactPaths = [] }) {
  const runRecord = runTicketPath
    ? readExecutionRun(resolve(runTicketPath), { root, indexPath })
    : createExecutionRun({ root, indexPath, startedAt });
  const argv = process.argv.slice(1);
  if (mode !== argv[1]) fail('receipt mode differs from the executing verifier argv');
  const entrypoint = receiptEntrypoint(mode, argv);
  const detailPath = join(dirname(runRecord.path), `${runRecord.run.run_id}-${entrypoint}-detail.json`);
  writeFileSync(detailPath, jsonBytes({ schema_version: 'luca.obligation-execution-detail.v1', entrypoint, checks: [...checks].sort(), detail }), { flag: 'wx', mode: 0o600 });
  const runtimePath = realpathSync(join(root, 'scripts/evolution/obligation-runtime.mjs'));
  const verifierPath = realpathSync(fileURLToPath(import.meta.url));
  const executablePath = realpathSync(process.execPath);
  const snapshot = receiptProcessSnapshot();
  const core = {
    schema_version: 'luca.obligation-mint-authorization.v1',
    plan_id: 'REX-20260811-001',
    nonce: randomUUID(),
    parent_pid: process.pid,
    parent_started_at: snapshot.started_at,
    parent_command: snapshot.command,
    root: realpathSync(root),
    index_path: realpathSync(indexPath),
    run_ticket_path: runRecord.path,
    mode,
    argv,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    producer: {
      executable_path: executablePath,
      executable_sha256: sha256(readFileSync(executablePath)),
      script_path: runtimePath,
      script_sha256: sha256(readFileSync(runtimePath)),
    },
    verifier: {
      executable_path: executablePath,
      executable_sha256: sha256(readFileSync(executablePath)),
      script_path: verifierPath,
      script_sha256: sha256(readFileSync(verifierPath)),
    },
    artifact_paths: [
      { role: 'execution_detail', path: detailPath },
      { role: 'obligation_index', path: indexPath },
      { role: 'mutation_matrix', path: MATRIX_PATH },
      ...extraArtifactPaths,
    ],
  };
  const authorization = { ...core, authorization_id: `oma-${sha256(Buffer.from(stable(core)))}` };
  const authorizationPath = join(dirname(runRecord.path), `${runRecord.run.run_id}-${entrypoint}-${authorization.authorization_id}.json`);
  writeFileSync(authorizationPath, jsonBytes(authorization), { flag: 'wx', mode: 0o600 });
  const producer = spawnSync(process.execPath, [runtimePath, 'receipt-producer', '--authorization', authorizationPath], {
    cwd: root,
    encoding: 'utf8',
    input: '',
    timeout: 30000,
  });
  if (producer.status !== 0) fail(`execution receipt producer failed: ${producer.stderr || producer.stdout}`);
  try { return JSON.parse(producer.stdout); } catch { fail('execution receipt producer returned invalid JSON'); }
}

async function main(argv) {
  const [mode, ...args] = argv;
  const root = DEFAULT_ROOT;
  const indexPath = join(root, 'scripts/evolution/obligation-index.json');
  const matrixPath = join(root, 'scripts/evolution/obligation-mutation-matrix.json');
  if (args.includes('--root') || args.includes('--index') || args.includes('--matrix')
    || args.includes('--entrypoint') || args.includes('--codex-hooks-fixture') || args.includes('--external-fixture')) {
    fail('production verifier forbids identity and fixture overrides');
  }
  if (mode === 'run-start') {
    const output = resolve(option(args, '--output'));
    const run = createExecutionRun({ root, indexPath, outputPath: output });
    process.stdout.write(`OBLIGATION_RUNTIME_RUN ${run.path} ${run.run.run_id}\n`);
    return 0;
  }
  if (mode === 'aggregate') {
    const paths = args.filter((arg) => !arg.startsWith('--'));
    const receipts = paths.map((path) => readExecutionReceipt(resolve(path), { root, indexPath }).receipt);
    const result = aggregateLaneReceipts(receipts, { root, indexPath });
    process.stdout.write(`${result}\n`);
    return result === 'PASS' || result === 'NOT_APPLICABLE' ? 0 : 1;
  }
  const startedAt = new Date().toISOString();
  const runTicketPath = option(args, '--run-ticket', false);
  let receipt;
  if (['l1-verify', 'l1-pre-commit', 'l1-ci'].includes(mode)) {
    const nativeContext = mode === 'l1-pre-commit' ? assertNativePreCommitContext()
      : mode === 'l1-ci' ? assertGitHubActionsContext(root) : null;
    const reverse = verifyReverseCoverage({
      root,
      indexPath,
      approvedPath: option(args, '--approved', false),
      receiptPath: option(args, '--u009-receipt', false),
    });
    const entrypoints = verifyProductionEntrypoints({ root, indexPath, matrixPath });
    const behavior = verifyRealBehavior({ root, indexPath });
    const lattice = verifyRuntimeLattice({ root });
    const syntax = spawnSync(process.execPath, ['--check', join(root, 'scripts/evolution/obligation-runtime.mjs')], { cwd: root, encoding: 'utf8', input: '' });
    if (syntax.status !== 0) fail(`runtime syntax check failed: ${syntax.stderr}`);
    receipt = receiptFor({
      root, indexPath, runTicketPath, mode,
      checks: ['INDEX-SCHEMA', 'REVERSE-DENOMINATOR', 'ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'LEDGER-EVIDENCE', 'REAL-BEHAVIOR', 'MUTATION-MATRIX'],
      detail: { reverse, entrypoints, behavior, lattice, native_context: nativeContext }, startedAt,
      extraArtifactPaths: mode === 'l1-ci' ? [{ role: 'github_event', path: nativeContext }] : [],
    });
  } else if (mode === 'l2') {
    const harness = option(args, '--harness');
    const detail = await probeProductionActivation({ root, harness });
    receipt = receiptFor({
      root, indexPath, runTicketPath, mode,
      checks: detail.checks, detail, startedAt,
    });
  } else if (mode === 'l3') {
    receipt = receiptFor({
      root, indexPath, runTicketPath, mode,
      checks: ['GLOBAL-READBACK-NOT-RUN'], detail: { external_receipt: null }, startedAt,
    });
  } else fail('usage: verify-obligation-runtime.mjs <run-start|l1-verify|l1-pre-commit|l1-ci|l2|l3|aggregate>');
  const output = option(args, '--receipt-output', false);
  if (output) writeFileSync(resolve(output), jsonBytes(receipt), { flag: 'wx', mode: 0o600 });
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
