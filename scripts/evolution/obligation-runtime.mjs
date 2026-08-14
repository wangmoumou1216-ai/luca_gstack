#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { jsonBytes, stable } from './obligation-census.mjs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(MODULE_DIR, '../..');
export const INDEX_PATH = join(MODULE_DIR, 'obligation-index.json');
export const APPROVED_CENSUS_SHA256 = 'c27abc72cdbc34e78be4e40018eaa1f90f216a43f495ce89e71717f954b84107';
export const IMPLEMENTATION_RECEIPT_SHA256 = '3c1c7cb59818167d450c3c8adbe3bdb396737764918ef4f98ce1969a6a22e30c';
export const APPROVED_TARGET_COMMIT = '318814876e3ad6e82384ae7570a872aa1b7a9cd4';
export const APPROVED_TARGET_TREE = 'ee8690606c30f99d1a00ca4a9717516a182683c9';
export const APPROVED_SOURCE_MANIFEST_SHA256 = '6a13816b785ebc59e83ccef88f61254f4554d315f5ddeeb4179afcc3a6e6bee9';
export const APPROVED_OBLIGATION_COUNT = 1808;

export const RUNTIME_EXECUTOR = 'scripts/evolution/obligation-runtime.mjs#recordEvidence';
export const RUNTIME_ACTIVATION_PROBE = 'scripts/evolution/verify-obligation-runtime.mjs#probeProductionActivation';
export const RUNTIME_VERIFIER = 'scripts/evolution/obligation-runtime.mjs#aggregateLedger';

export const LANES = Object.freeze([
  'L1_HERMETIC',
  'L2_LOCAL_LIVE',
  'L3_EXTERNAL',
]);

export const RESULT_LATTICE = Object.freeze([
  'PASS',
  'NOT_APPLICABLE',
  'BLOCKED',
  'DEGRADED',
  'NOT_RUN',
  'UNKNOWN',
]);

export const OBLIGATION_CLASSES = Object.freeze([
  'S0_MACHINE_SAFETY',
  'S1_ROUTING_DISPATCH',
  'S2_COMPLETION_QUALITY',
  'S3_HUMAN_TASTE',
  'S4_NATIVE_CAPABILITY',
]);

const RESULT_SET = new Set(RESULT_LATTICE);
const CLASS_SET = new Set(OBLIGATION_CLASSES);
const LANE_SET = new Set(LANES);
const HASH_RE = /^[a-f0-9]{64}$/;
const OBLIGATION_RE = /^OBL-[A-F0-9]{20}$/;
const FORBIDDEN_PROSE_KEYS = new Set(['text', 'rule', 'prose', 'excerpt', 'quote', 'content']);

function fail(message) {
  throw new Error(message);
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (stable(actual) !== stable(wanted)) fail(`${label} keys must be exact`);
}

function exactStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail(`${label} must be a string array`);
  return [...new Set(value)].sort();
}

function assertPointerOnly(value, path = 'index') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPointerOnly(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PROSE_KEYS.has(key)) fail(`pointer-only index forbids ${path}.${key}`);
    assertPointerOnly(child, `${path}.${key}`);
  }
}

function sourcePath(sourcePointer) {
  const match = String(sourcePointer || '').match(/^(.+)#L[1-9][0-9]*$/);
  if (!match) fail(`invalid source pointer ${sourcePointer}`);
  return match[1];
}

const HOOK_EVENTS = Object.freeze([
  [/route-guard\.mjs$|skill-routing-map\.yaml$/, 'UserPromptSubmit'],
  [/session-restore\.mjs$/, 'SessionStart'],
  [/project-scope-guard\.mjs$/, 'PreToolUse'],
  [/post-edit\.mjs$/, 'PostToolUse'],
  [/session-sync\.mjs$/, 'Stop'],
  [/session-end\.mjs$/, 'SessionEnd'],
]);

export function deriveApplicability(sourcePointer) {
  const path = sourcePath(sourcePointer);
  let match = path.match(/^\.claude\/skills\/office\/([^/]+)\//);
  if (match) return { kind: 'SKILL_ROUTE', key: match[1] };
  match = path.match(/^\.agents\/skills\/([^/]+)\//);
  if (match) return { kind: 'SKILL_ROUTE', key: match[1] };
  match = path.match(/^\.(?:claude|codex)\/agents\/([^/.]+)(?:\.(?:md|toml))?$/);
  if (match) return { kind: 'AGENT_ROLE', key: match[1] };
  match = path.match(/^\.claude\/workflows\/([^/.]+)\.js$/);
  if (match) return { kind: 'WORKFLOW_ROUTE', key: match[1] };
  for (const [pattern, event] of HOOK_EVENTS) {
    if (pattern.test(path)) return { kind: 'HOOK_EVENT', key: event };
  }
  const actionRules = [
    [/correction|纠错/u, 'correction'],
    [/human-gate|gate-(?:binding|proposal|result)/u, 'human-gate'],
    [/project-|project\/|project_|current-topic|workflow-state/u, 'project'],
    [/memory\/|semantic|observability/u, 'memory'],
    [/\.githooks\/|\.github\/workflows\/|git-|remote|push/u, 'git'],
    [/model-routing|codex-viability|agent-launcher/u, 'agent-runtime'],
    [/skill-authoring|skill-invariants/u, 'skill-authoring'],
    [/optional-workflow|input-modes|routing-chain/u, 'routing'],
    [/evolution|external-skill/u, 'evolution'],
  ];
  for (const [pattern, action] of actionRules) {
    if (pattern.test(path)) return { kind: 'ACTION_CONTEXT', key: action };
  }
  return { kind: 'GLOBAL_RUNTIME', key: null };
}

function validateTrigger(trigger, label) {
  exactKeys(trigger, ['kind', 'markers'], `${label}.trigger`);
  if (trigger.kind !== 'SOURCE_NORMATIVE_MARKER' || exactStringArray(trigger.markers, `${label}.trigger.markers`).length === 0) {
    fail(`${label}.trigger is invalid`);
  }
}

function validateApplicability(value, label) {
  exactKeys(value, ['kind', 'key'], `${label}.applicability`);
  if (!['GLOBAL_RUNTIME', 'SKILL_ROUTE', 'AGENT_ROLE', 'WORKFLOW_ROUTE', 'HOOK_EVENT', 'ACTION_CONTEXT'].includes(value.kind)) {
    fail(`${label}.applicability kind is invalid`);
  }
  if ((value.kind === 'GLOBAL_RUNTIME') !== (value.key === null)) fail(`${label}.applicability key is invalid`);
  if (value.key !== null && (typeof value.key !== 'string' || value.key.length === 0)) fail(`${label}.applicability key is invalid`);
}

export function validateIndex(index) {
  assertPointerOnly(index);
  exactKeys(index, ['schema_version', 'plan_id', 'approved', 'records'], 'obligation index');
  if (index.schema_version !== 'luca.obligation-index.v1' || index.plan_id !== 'REX-20260811-001') fail('obligation index identity mismatch');
  exactKeys(index.approved, [
    'census_sha256', 'implementation_receipt_sha256', 'target_commit', 'target_tree',
    'source_manifest_sha256', 'obligation_count',
  ], 'obligation index approved binding');
  if (index.approved.census_sha256 !== APPROVED_CENSUS_SHA256
    || index.approved.implementation_receipt_sha256 !== IMPLEMENTATION_RECEIPT_SHA256
    || index.approved.target_commit !== APPROVED_TARGET_COMMIT
    || index.approved.target_tree !== APPROVED_TARGET_TREE
    || index.approved.source_manifest_sha256 !== APPROVED_SOURCE_MANIFEST_SHA256
    || index.approved.obligation_count !== APPROVED_OBLIGATION_COUNT) fail('approved census binding mismatch');
  if (!Array.isArray(index.records) || index.records.length !== APPROVED_OBLIGATION_COUNT) fail('obligation index denominator mismatch');
  const ids = new Set();
  const classes = new Set();
  for (const record of index.records) {
    const label = `obligation ${record?.id || '<unknown>'}`;
    exactKeys(record, [
      'id', 'source_pointer', 'source_anchor_hash', 'class', 'trigger', 'harnesses',
      'executor', 'activation_probe', 'verifier', 'mutant_ids', 'receipt_kind',
      'degradation_code', 'owner', 'enforcement', 'approved_native_status',
      'wiring_state', 'applicability',
    ], label);
    if (!OBLIGATION_RE.test(record.id || '') || ids.has(record.id)) fail(`${label} id is invalid or duplicated`);
    ids.add(record.id);
    classes.add(record.class);
    sourcePath(record.source_pointer);
    if (!HASH_RE.test(record.source_anchor_hash || '') || !CLASS_SET.has(record.class)) fail(`${label} source/class is invalid`);
    validateTrigger(record.trigger, label);
    if (stable(exactStringArray(record.harnesses, `${label}.harnesses`)) !== stable(['claude', 'codex'])) fail(`${label} harness set is invalid`);
    if (record.executor !== RUNTIME_EXECUTOR || record.activation_probe !== RUNTIME_ACTIVATION_PROBE || record.verifier !== RUNTIME_VERIFIER) {
      fail(`${label} runtime wiring is invalid`);
    }
    if (exactStringArray(record.mutant_ids, `${label}.mutant_ids`).length === 0
      || record.receipt_kind !== 'OBLIGATION_LEDGER_ENTRY'
      || typeof record.owner !== 'string' || !record.owner
      || typeof record.enforcement !== 'string' || !record.enforcement
      || record.approved_native_status !== 'MISSING_WIRING'
      || record.wiring_state !== 'WIRED_UNPROBED') fail(`${label} metadata is invalid`);
    if (![null, 'NATIVE_CAPABILITY_DIFFERENCE'].includes(record.degradation_code)) fail(`${label} degradation code is invalid`);
    if ((record.class === 'S0_MACHINE_SAFETY' || record.class === 'S3_HUMAN_TASTE') && record.degradation_code !== null) {
      fail(`${record.class} cannot be DEGRADED`);
    }
    validateApplicability(record.applicability, label);
    if (stable(record.applicability) !== stable(deriveApplicability(record.source_pointer))) fail(`${label} applicability is not source-derived`);
  }
  if (stable([...classes].sort()) !== stable([...OBLIGATION_CLASSES].sort())) fail('obligation index lacks a class sentinel');
  return index;
}

function parseJsonBytes(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch (error) { fail(`${label} is not JSON: ${error.message}`); }
  return value;
}

export function loadIndex(path = INDEX_PATH) {
  return validateIndex(parseJsonBytes(readFileSync(path), 'obligation index'));
}

export function buildIndex({ approvedBytes, implementationReceiptBytes }) {
  if (sha256(approvedBytes) !== APPROVED_CENSUS_SHA256) fail('approved census sha256 mismatch');
  if (sha256(implementationReceiptBytes) !== IMPLEMENTATION_RECEIPT_SHA256) fail('implementation receipt sha256 mismatch');
  const approved = parseJsonBytes(approvedBytes, 'approved census');
  const receipt = parseJsonBytes(implementationReceiptBytes, 'implementation receipt');
  if (approved.schema_version !== 'luca.obligation-census.v1'
    || approved.plan_id !== 'REX-20260811-001'
    || approved.approval_state !== 'APPROVED_G_OBLIGATION_SCOPE'
    || approved.target_commit !== APPROVED_TARGET_COMMIT
    || approved.target_tree !== APPROVED_TARGET_TREE
    || approved.source_manifest_sha256 !== APPROVED_SOURCE_MANIFEST_SHA256
    || !Array.isArray(approved.obligations)
    || approved.obligations.length !== APPROVED_OBLIGATION_COUNT) fail('approved census identity mismatch');
  if (receipt.schema_version !== 'luca.obligation-census-implementation-receipt.v1'
    || receipt.status !== 'VERIFIED_APPROVED_CENSUS'
    || receipt.approved_census_sha256 !== APPROVED_CENSUS_SHA256
    || receipt.target_commit !== APPROVED_TARGET_COMMIT
    || receipt.target_tree !== APPROVED_TARGET_TREE
    || receipt.counts?.obligations !== APPROVED_OBLIGATION_COUNT
    || receipt.counts?.missing_wiring !== APPROVED_OBLIGATION_COUNT) fail('implementation receipt binding mismatch');
  const records = approved.obligations.map((row) => ({
    id: row.id,
    source_pointer: row.source_pointer,
    source_anchor_hash: row.source_anchor_hash,
    class: row.class,
    trigger: row.trigger,
    harnesses: row.harnesses,
    executor: RUNTIME_EXECUTOR,
    activation_probe: RUNTIME_ACTIVATION_PROBE,
    verifier: RUNTIME_VERIFIER,
    mutant_ids: [...new Set([...row.mutant_ids, 'MUT-RUNTIME-CONSUMER-REMOVED', 'MUT-RUNTIME-REAL-NOOP'])],
    receipt_kind: row.receipt_kind,
    degradation_code: row.degradation_code,
    owner: row.owner,
    enforcement: row.enforcement,
    approved_native_status: row.native_status,
    wiring_state: 'WIRED_UNPROBED',
    applicability: deriveApplicability(row.source_pointer),
  }));
  return validateIndex({
    schema_version: 'luca.obligation-index.v1',
    plan_id: 'REX-20260811-001',
    approved: {
      census_sha256: APPROVED_CENSUS_SHA256,
      implementation_receipt_sha256: IMPLEMENTATION_RECEIPT_SHA256,
      target_commit: APPROVED_TARGET_COMMIT,
      target_tree: APPROVED_TARGET_TREE,
      source_manifest_sha256: APPROVED_SOURCE_MANIFEST_SHA256,
      obligation_count: APPROVED_OBLIGATION_COUNT,
    },
    records,
  });
}

function validateContext(context) {
  exactKeys(context, ['schema_version', 'invocation_id', 'harness', 'lane', 'event', 'cwd', 'task_sha256', 'route'], 'task context');
  if (context.schema_version !== 'luca.obligation-task-context.v1'
    || typeof context.invocation_id !== 'string' || !context.invocation_id
    || !['claude', 'codex', 'ci', 'pre-commit', 'manual'].includes(context.harness)
    || !LANE_SET.has(context.lane)
    || typeof context.event !== 'string' || !context.event
    || typeof context.cwd !== 'string' || !context.cwd
    || !HASH_RE.test(context.task_sha256 || '')) fail('task context identity is invalid');
  exactKeys(context.route, ['complete', 'skills', 'roles', 'workflows', 'actions', 'paths'], 'task route context');
  if (typeof context.route.complete !== 'boolean') fail('task route completeness is invalid');
  for (const key of ['skills', 'roles', 'workflows', 'actions', 'paths']) context.route[key] = exactStringArray(context.route[key], `task route ${key}`);
  return context;
}

function applicabilityDecision(selector, context) {
  if (selector.kind === 'GLOBAL_RUNTIME') return 'APPLICABLE';
  if (selector.kind === 'HOOK_EVENT') return selector.key === context.event ? 'APPLICABLE' : 'NOT_APPLICABLE';
  const collection = {
    SKILL_ROUTE: 'skills',
    AGENT_ROLE: 'roles',
    WORKFLOW_ROUTE: 'workflows',
    ACTION_CONTEXT: 'actions',
  }[selector.kind];
  if (context.route[collection].includes(selector.key)) return 'APPLICABLE';
  return context.route.complete ? 'NOT_APPLICABLE' : 'UNKNOWN';
}

function evidence(kind, uri, value) {
  return { kind, uri, sha256: sha256(Buffer.from(stable(value), 'utf8')) };
}

export function compileObligations({ index, context }) {
  validateIndex(index);
  validateContext(context);
  const entries = index.records.map((record) => {
    const state = applicabilityDecision(record.applicability, context);
    const applicable = state !== 'NOT_APPLICABLE';
    const result = state === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : state === 'UNKNOWN' ? 'UNKNOWN' : 'NOT_RUN';
    return {
      obligation_id: record.id,
      source_pointer: record.source_pointer,
      class: record.class,
      applicable,
      applicability_state: state,
      result,
      lane: context.lane,
      evidence: [evidence('COMPILER_APPLICABILITY', `obligation:${record.id}`, {
        invocation_id: context.invocation_id,
        selector: record.applicability,
        route: context.route,
        state,
      })],
    };
  });
  return {
    schema_version: 'luca.obligation-ledger.v1',
    context,
    index_sha256: sha256(jsonBytes(index)),
    entries,
    aggregate: aggregateResults(entries),
  };
}

function validateEvidenceRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) fail('evidence must be a non-empty array');
  for (const row of rows) {
    exactKeys(row, ['kind', 'uri', 'sha256'], 'evidence row');
    if (typeof row.kind !== 'string' || !row.kind || typeof row.uri !== 'string' || !row.uri || !HASH_RE.test(row.sha256 || '')) {
      fail('evidence row is invalid');
    }
  }
}

export function validateLedger(ledger) {
  exactKeys(ledger, ['schema_version', 'context', 'index_sha256', 'entries', 'aggregate'], 'obligation ledger');
  if (ledger.schema_version !== 'luca.obligation-ledger.v1' || !HASH_RE.test(ledger.index_sha256 || '') || !RESULT_SET.has(ledger.aggregate)) {
    fail('obligation ledger identity is invalid');
  }
  validateContext(ledger.context);
  if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) fail('obligation ledger entries are invalid');
  const ids = new Set();
  for (const entry of ledger.entries) {
    exactKeys(entry, ['obligation_id', 'source_pointer', 'class', 'applicable', 'applicability_state', 'result', 'lane', 'evidence'], 'obligation ledger entry');
    if (!OBLIGATION_RE.test(entry.obligation_id || '') || ids.has(entry.obligation_id) || !CLASS_SET.has(entry.class)
      || typeof entry.applicable !== 'boolean'
      || !['APPLICABLE', 'NOT_APPLICABLE', 'UNKNOWN'].includes(entry.applicability_state)
      || !RESULT_SET.has(entry.result) || !LANE_SET.has(entry.lane)) fail('obligation ledger entry is invalid');
    ids.add(entry.obligation_id);
    sourcePath(entry.source_pointer);
    validateEvidenceRows(entry.evidence);
    aggregateResults([entry]);
    if (entry.applicability_state === 'NOT_APPLICABLE' && (entry.applicable || entry.result !== 'NOT_APPLICABLE')) fail('NOT_APPLICABLE entry mismatch');
    if (entry.applicability_state === 'UNKNOWN' && (!entry.applicable || entry.result !== 'UNKNOWN')) fail('UNKNOWN applicability must remain UNKNOWN');
  }
  const aggregate = aggregateResults(ledger.entries);
  if (aggregate !== ledger.aggregate) fail('obligation ledger aggregate mismatch');
  return ledger;
}

export function recordEvidence({ ledger, obligationId, result, evidence: evidenceRows }) {
  validateLedger(ledger);
  if (!RESULT_SET.has(result)) fail(`invalid result ${result}`);
  validateEvidenceRows(evidenceRows);
  const next = JSON.parse(JSON.stringify(ledger));
  const entry = next.entries.find((row) => row.obligation_id === obligationId);
  if (!entry) fail(`unknown obligation ${obligationId}`);
  if (entry.applicability_state === 'UNKNOWN' && result !== 'UNKNOWN' && result !== 'BLOCKED') fail('unknown applicability cannot be recorded as executed');
  if (!entry.applicable && result !== 'NOT_APPLICABLE') fail('non-applicable obligation must use NOT_APPLICABLE');
  if (entry.applicable && result === 'NOT_APPLICABLE') fail('applicable obligation cannot use NOT_APPLICABLE');
  if (result === 'DEGRADED' && (entry.class === 'S0_MACHINE_SAFETY' || entry.class === 'S3_HUMAN_TASTE')) fail(`${entry.class} cannot be DEGRADED`);
  entry.result = result;
  entry.evidence = evidenceRows;
  next.aggregate = aggregateResults(next.entries);
  return validateLedger(next);
}

export function aggregateLedger(ledger) {
  return validateLedger(ledger).aggregate;
}

export function makeExecutionReceipt({ entrypoint, lane, executedChecks, classes, result, evidence: evidenceRows }) {
  if (!['verify', 'pre-commit', 'ci', 'task-start', 'stop', 'local-live', 'external'].includes(entrypoint)) fail('invalid receipt entrypoint');
  if (!LANE_SET.has(lane) || !RESULT_SET.has(result)) fail('invalid receipt lane/result');
  const checks = exactStringArray(executedChecks, 'executed checks');
  const coveredClasses = exactStringArray(classes, 'covered classes');
  if (checks.length === 0) fail('execution receipt cannot claim an empty execution set');
  if (coveredClasses.length === 0 || coveredClasses.some((value) => !CLASS_SET.has(value))) fail('execution receipt class set is invalid');
  if (result === 'DEGRADED' && coveredClasses.some((value) => value === 'S0_MACHINE_SAFETY' || value === 'S3_HUMAN_TASTE')) {
    fail('execution receipt cannot DEGRADED an S0/S3 class');
  }
  validateEvidenceRows(evidenceRows);
  return {
    schema_version: 'luca.obligation-execution-receipt.v1',
    entrypoint,
    lane,
    executed_checks: checks,
    classes: coveredClasses,
    result,
    evidence: evidenceRows,
  };
}

export function aggregateLaneReceipts(receipts) {
  if (!Array.isArray(receipts)) fail('lane receipts must be an array');
  const byLane = new Map();
  for (const receipt of receipts) {
    exactKeys(receipt, ['schema_version', 'entrypoint', 'lane', 'executed_checks', 'classes', 'result', 'evidence'], 'execution receipt');
    if (receipt.schema_version !== 'luca.obligation-execution-receipt.v1' || byLane.has(receipt.lane)) fail('lane receipt identity/uniqueness mismatch');
    makeExecutionReceipt({
      entrypoint: receipt.entrypoint,
      lane: receipt.lane,
      executedChecks: receipt.executed_checks,
      classes: receipt.classes,
      result: receipt.result,
      evidence: receipt.evidence,
    });
    byLane.set(receipt.lane, receipt);
  }
  const entries = LANES.map((lane) => {
    const receipt = byLane.get(lane);
    return {
      class: receipt?.result === 'DEGRADED' ? 'S4_NATIVE_CAPABILITY' : 'S0_MACHINE_SAFETY',
      applicable: true,
      result: receipt ? receipt.result : 'NOT_RUN',
    };
  });
  return aggregateResults(entries);
}

function writeAtomic(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, bytes, { mode: 0o600 });
  renameSync(temporary, path);
}

function runtimeLedgerPath(root, sessionId) {
  if (process.env.LUCA_OBLIGATION_LEDGER_PATH) return resolve(process.env.LUCA_OBLIGATION_LEDGER_PATH);
  const git = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: root, encoding: 'utf8', input: '' });
  if (git.status !== 0 || !git.stdout.trim()) fail('cannot resolve repository git dir for obligation ledger');
  const sessionKey = sha256(Buffer.from(String(sessionId || 'missing'), 'utf8')).slice(0, 32);
  return join(git.stdout.trim(), 'luca-obligation-runtime', `${sessionKey}.json`);
}

function parseHookInput(bytes) {
  if (!bytes.length) fail('hook input is empty');
  return parseJsonBytes(bytes, 'hook input');
}

function routeFromHookInput(input, prompt, index) {
  const supplied = input.obligation_route_context;
  if (supplied) {
    return {
      complete: supplied.complete === true,
      skills: exactStringArray(supplied.skills || [], 'hook route skills'),
      roles: exactStringArray(supplied.roles || [], 'hook route roles'),
      workflows: exactStringArray(supplied.workflows || [], 'hook route workflows'),
      actions: exactStringArray(supplied.actions || [], 'hook route actions'),
      paths: exactStringArray(supplied.paths || [], 'hook route paths'),
    };
  }
  const skills = [...new Set(index.records
    .filter((record) => record.applicability.kind === 'SKILL_ROUTE')
    .map((record) => record.applicability.key)
    .filter((skill) => new RegExp(`(?:^|\\s)[/$]${skill}(?:\\s|$)`, 'u').test(prompt)))].sort();
  return { complete: false, skills, roles: [], workflows: [], actions: [], paths: [] };
}

export async function taskStartHook(inputBytes) {
  const input = parseHookInput(inputBytes);
  const index = loadIndex(process.env.LUCA_OBLIGATION_INDEX || INDEX_PATH);
  const prompt = String(input.prompt || input.user_prompt || input.message || '');
  const sessionId = String(input.session_id || input.sessionId || 'missing-session');
  const harness = process.env.LUCA_ACTUAL_HARNESS === 'codex' || input.harness === 'codex' ? 'codex' : 'claude';
  const context = {
    schema_version: 'luca.obligation-task-context.v1',
    invocation_id: `${sessionId}:${sha256(Buffer.from(prompt, 'utf8')).slice(0, 24)}`,
    harness,
    lane: 'L2_LOCAL_LIVE',
    event: 'UserPromptSubmit',
    cwd: resolve(input.cwd || process.cwd()),
    task_sha256: sha256(Buffer.from(prompt, 'utf8')),
    route: routeFromHookInput(input, prompt, index),
  };
  const ledger = compileObligations({ index, context });
  const path = runtimeLedgerPath(context.cwd, sessionId);
  writeAtomic(path, jsonBytes(ledger));
  const counts = Object.fromEntries(RESULT_LATTICE.map((result) => [result, ledger.entries.filter((entry) => entry.result === result).length]));
  return `[obligation-runtime] invocation=${context.invocation_id} ledger=${path} aggregate=${ledger.aggregate} counts=${JSON.stringify(counts)}\n`;
}

export async function stopHook(inputBytes) {
  const input = parseHookInput(inputBytes);
  const root = resolve(input.cwd || process.cwd());
  const path = runtimeLedgerPath(root, input.session_id || input.sessionId || 'missing-session');
  if (!existsSync(path)) return { decision: 'block', reason: `Obligation ledger NOT_RUN: ${path}` };
  const ledger = validateLedger(parseJsonBytes(readFileSync(path), 'obligation ledger'));
  const result = aggregateLedger(ledger);
  if (result === 'PASS' || result === 'DEGRADED') return null;
  const counts = Object.fromEntries(RESULT_LATTICE.map((value) => [value, ledger.entries.filter((entry) => entry.result === value).length]));
  return { decision: 'block', reason: `Obligation ledger ${result}: ${JSON.stringify(counts)}` };
}

function option(args, name, required = true) {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    if (required) fail(`missing ${name}`);
    return null;
  }
  return args[index + 1];
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function main(argv) {
  const [mode, ...args] = argv;
  if (mode === 'build-index') {
    const output = resolve(option(args, '--output'));
    const index = buildIndex({
      approvedBytes: readFileSync(resolve(option(args, '--approved'))),
      implementationReceiptBytes: readFileSync(resolve(option(args, '--receipt'))),
    });
    writeAtomic(output, jsonBytes(index));
    process.stdout.write(`OBLIGATION_INDEX_BUILT ${index.records.length} ${sha256(jsonBytes(index))}\n`);
    return 0;
  }
  if (mode === 'compile') {
    const index = loadIndex(option(args, '--index', false) || INDEX_PATH);
    const context = parseJsonBytes(readFileSync(resolve(option(args, '--context'))), 'task context');
    const ledger = compileObligations({ index, context });
    const output = resolve(option(args, '--output'));
    writeAtomic(output, jsonBytes(ledger));
    process.stdout.write(`OBLIGATION_LEDGER_COMPILED ${ledger.entries.length} ${ledger.aggregate}\n`);
    return 0;
  }
  if (mode === 'record') {
    const path = resolve(option(args, '--ledger'));
    const ledger = validateLedger(parseJsonBytes(readFileSync(path), 'obligation ledger'));
    const next = recordEvidence({
      ledger,
      obligationId: option(args, '--obligation'),
      result: option(args, '--result'),
      evidence: parseJsonBytes(readFileSync(resolve(option(args, '--evidence'))), 'evidence'),
    });
    writeAtomic(path, jsonBytes(next));
    process.stdout.write(`OBLIGATION_LEDGER_RECORDED ${next.aggregate}\n`);
    return 0;
  }
  if (mode === 'aggregate') {
    const ledger = validateLedger(parseJsonBytes(readFileSync(resolve(option(args, '--ledger'))), 'obligation ledger'));
    process.stdout.write(`${aggregateLedger(ledger)}\n`);
    return 0;
  }
  if (mode === 'task-start-hook') {
    const text = await taskStartHook(await readStdin());
    process.stdout.write(text);
    return 0;
  }
  if (mode === 'stop-hook') {
    const result = await stopHook(await readStdin());
    if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  }
  fail('usage: obligation-runtime.mjs <build-index|compile|record|aggregate|task-start-hook|stop-hook>');
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`[obligation-runtime] ${error.message}\n`);
    process.exitCode = ['task-start-hook', 'stop-hook'].includes(process.argv[2]) ? 2 : 1;
  }
}

export function aggregateResults(entries) {
  if (!Array.isArray(entries) || entries.length === 0) fail('entries must be a non-empty array');
  const applicable = [];
  for (const entry of entries) {
    if (!entry || !CLASS_SET.has(entry.class)) fail(`invalid obligation class ${entry?.class}`);
    if (!RESULT_SET.has(entry.result)) fail(`invalid result ${entry.result}`);
    if (entry.result === 'DEGRADED' && (entry.class === 'S0_MACHINE_SAFETY' || entry.class === 'S3_HUMAN_TASTE')) {
      fail(`${entry.class} cannot be DEGRADED`);
    }
    if (entry.applicable === false) {
      if (entry.result !== 'NOT_APPLICABLE') fail('non-applicable obligation must use NOT_APPLICABLE');
      continue;
    }
    if (entry.applicable !== true) fail('applicability must be true or false');
    if (entry.result === 'NOT_APPLICABLE') fail('applicable obligation cannot use NOT_APPLICABLE');
    applicable.push(entry);
  }
  if (applicable.some((entry) => entry.result === 'BLOCKED')) return 'BLOCKED';
  if (applicable.some((entry) => entry.result === 'UNKNOWN')) return 'UNKNOWN';
  if (applicable.some((entry) => entry.result === 'NOT_RUN')) return 'NOT_RUN';
  if (applicable.some((entry) => entry.result === 'DEGRADED')) return 'DEGRADED';
  return 'PASS';
}
