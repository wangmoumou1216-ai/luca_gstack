#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { jsonBytes, stable } from './obligation-census.mjs';
import { verifyHumanGateChain } from '../../.claude/hooks/lib/human-gate-contract.mjs';

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
const PROOF_ID_RE = /^op-[a-f0-9]{64}$/;

export const CLASS_VERIFIER_CONTRACTS = Object.freeze({
  S0_MACHINE_SAFETY: 'S0_DUAL_HARNESS_MECHANICAL_NEGATIVE_V1',
  S1_ROUTING_DISPATCH: 'S1_DETERMINISTIC_ROUTE_LIVE_TRACE_V1',
  S2_COMPLETION_QUALITY: 'S2_INVOCATION_EVIDENCE_V1',
  S3_HUMAN_TASTE: 'S3_HUMAN_GATE_CHAIN_V1',
  S4_NATIVE_CAPABILITY: 'S4_CAPABILITY_LIVE_READBACK_V1',
});

export const CLASS_PROOF_SENTINELS = Object.freeze({
  S0_MACHINE_SAFETY: 'OBL-EE12F74B436DDD584A51',
  S1_ROUTING_DISPATCH: 'OBL-DCF1D6F08DAA83B4AD0E',
  S2_COMPLETION_QUALITY: 'OBL-5A7F1C2DC5125FB7ABAA',
  S3_HUMAN_TASTE: 'OBL-CE42D444CB5F300FD1CA',
  S4_NATIVE_CAPABILITY: 'OBL-825C5DF3FD1AAF2A0C25',
});

const SENTINEL_EXECUTABLE_SHA256 = Object.freeze({
  '.claude/hooks/project-scope-guard.mjs': '0d1f6f247a29c1b83fed5dbd74d244d595b8a2f2b1a6c28047c207c3df40f17f',
  '.codex/codex-hook-adapter.mjs': 'bd4b16d7e70333f27731268fd82bb8c3aee0a4c9a74d6001a7c7dcfef1baa756',
  '.claude/hooks/route-guard.mjs': '90ee48345da5339e5f5baf499b516b9703cf21a9d1e32475b5d96c4d56fc753b',
  'scripts/check-codex-viability.mjs': '089a40c11c35acba83be657dc6c439cf4652c5587c4de166d41c1b6ece5cb243',
});

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

function validDate(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail(`${label} must be an ISO timestamp`);
  return value;
}

function regularReadback(path, label) {
  const absolute = resolve(path);
  const stat = lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat || stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a non-symlink regular file`);
  const real = realpathSync(absolute);
  const bytes = readFileSync(real);
  return { path: real, sha256: sha256(bytes), size: bytes.length, bytes };
}

function artifact(readback, role) {
  return { role, path: readback.path, sha256: readback.sha256, size: readback.size };
}

function validateArtifactReadback(item, label) {
  exactKeys(item, ['role', 'path', 'sha256', 'size'], label);
  if (typeof item.role !== 'string' || !item.role || typeof item.path !== 'string' || !item.path
    || !HASH_RE.test(item.sha256 || '') || !Number.isSafeInteger(item.size) || item.size < 0) fail(`${label} is invalid`);
  const observed = regularReadback(item.path, label);
  if (observed.path !== item.path || observed.sha256 !== item.sha256 || observed.size !== item.size) fail(`${label} readback changed`);
  return observed;
}

export function validateLedgerAgainstIndex(ledger, index) {
  validateLedger(ledger);
  validateIndex(index);
  if (ledger.index_sha256 !== sha256(jsonBytes(index)) || ledger.entries.length !== index.records.length) {
    fail('ledger/index denominator binding mismatch');
  }
  const records = new Map(index.records.map((record) => [record.id, record]));
  for (const entry of ledger.entries) {
    const record = records.get(entry.obligation_id);
    if (!record || entry.source_pointer !== record.source_pointer || entry.class !== record.class
      || entry.lane !== ledger.context.lane || entry.applicability_state !== applicabilityDecision(record.applicability, ledger.context)
      || entry.applicable !== (entry.applicability_state !== 'NOT_APPLICABLE')) fail(`ledger/index row binding mismatch ${entry.obligation_id}`);
  }
  return ledger;
}

function proofConsumptionPath(proof) {
  return join(dirname(proof.activation_receipt.path), `consumed-${proof.receipt_id}.json`);
}

function proofConsumptionCore(proof, ledger) {
  return {
    schema_version: 'luca.obligation-proof-consumption.v1',
    plan_id: 'REX-20260811-001',
    receipt_id: proof.receipt_id,
    activation_id: proof.activation_receipt.activation_id,
    invocation_id: ledger.context.invocation_id,
    index_sha256: ledger.index_sha256,
    obligation_id: proof.obligation_id,
  };
}

function consumeObligationProof(proof, ledger) {
  const core = proofConsumptionCore(proof, ledger);
  const consumption = { ...core, consumption_id: `opc-${sha256(Buffer.from(stable(core)))}` };
  return writeExclusive(proofConsumptionPath(proof), jsonBytes(consumption), 'obligation proof consumption');
}

function verifyProofConsumption(proof, ledger) {
  const readback = regularReadback(proofConsumptionPath(proof), 'obligation proof consumption');
  let consumption;
  try { consumption = JSON.parse(readback.bytes.toString('utf8')); } catch { fail('obligation proof consumption is not JSON'); }
  exactKeys(consumption, [
    'schema_version', 'plan_id', 'consumption_id', 'receipt_id', 'activation_id',
    'invocation_id', 'index_sha256', 'obligation_id',
  ], 'obligation proof consumption');
  const { consumption_id: ignored, ...core } = consumption;
  if (consumption.schema_version !== 'luca.obligation-proof-consumption.v1'
    || consumption.plan_id !== 'REX-20260811-001'
    || consumption.consumption_id !== `opc-${sha256(Buffer.from(stable(core)))}`
    || stable(core) !== stable(proofConsumptionCore(proof, ledger))) fail('obligation proof consumption binding mismatch');
  return readback;
}

function alternateContext(record, context) {
  const next = JSON.parse(JSON.stringify(context));
  next.route.complete = true;
  const collection = {
    SKILL_ROUTE: 'skills',
    AGENT_ROLE: 'roles',
    WORKFLOW_ROUTE: 'workflows',
    ACTION_CONTEXT: 'actions',
  }[record.applicability.kind];
  if (collection) next.route[collection] = next.route[collection].filter((value) => value !== record.applicability.key);
  else if (record.applicability.kind === 'HOOK_EVENT') next.event = '__obligation_negative_probe__';
  return next;
}

function verifyAuthoritativeHumanGate(humanGate, artifacts, ledger, record) {
  exactKeys(humanGate, [
    'receipt_root', 'secure_writer_path', 'gate', 'proposal_id', 'plan_path', 'payload_path',
    'execution_envelope_path', 'readback_path', 'expected_post_state_sha256',
  ], 'S3 authoritative human gate');
  if (![humanGate.receipt_root, humanGate.secure_writer_path, humanGate.gate, humanGate.proposal_id,
    humanGate.plan_path, humanGate.payload_path, humanGate.execution_envelope_path, humanGate.readback_path]
    .every((value) => typeof value === 'string' && value) || !HASH_RE.test(humanGate.expected_post_state_sha256 || '')) {
    fail('S3 authoritative human gate metadata is invalid');
  }
  const required = {
    human_gate_writer: humanGate.secure_writer_path,
    human_gate_plan: humanGate.plan_path,
    human_gate_payload: humanGate.payload_path,
    human_gate_execution_envelope: humanGate.execution_envelope_path,
    human_gate_readback: humanGate.readback_path,
  };
  for (const [role, path] of Object.entries(required)) {
    const claimed = artifacts.find((item) => item.role === role);
    const observed = regularReadback(path, `S3 ${role}`);
    if (!claimed || claimed.path !== observed.path || claimed.sha256 !== observed.sha256 || claimed.size !== observed.size) {
      fail(`S3 ${role} artifact binding mismatch`);
    }
  }
  let payload;
  try { payload = JSON.parse(readFileSync(humanGate.payload_path, 'utf8')); } catch { fail('S3 human gate payload is not JSON'); }
  exactKeys(payload, ['schema_version', 'invocation_id', 'index_sha256', 'obligation_id', 'class', 'lane'], 'S3 human gate payload');
  if (payload.schema_version !== 'luca.obligation-human-gate-payload.v1'
    || payload.invocation_id !== ledger.context.invocation_id || payload.index_sha256 !== ledger.index_sha256
    || payload.obligation_id !== record.id || payload.class !== record.class || payload.lane !== ledger.context.lane) {
    fail('S3 human gate payload binding mismatch');
  }
  const verified = verifyHumanGateChain({
    receiptRoot: humanGate.receipt_root,
    secureWriterPath: humanGate.secure_writer_path,
    gate: humanGate.gate,
    proposalId: humanGate.proposal_id,
    planBytes: readFileSync(humanGate.plan_path),
    payloadBytes: readFileSync(humanGate.payload_path),
    executionEnvelopeBytes: readFileSync(humanGate.execution_envelope_path),
    readbackBytes: readFileSync(humanGate.readback_path),
    expectedPostStateSha256: humanGate.expected_post_state_sha256,
  });
  return {
    proposal_id: verified.proposal.proposal_id,
    binding_id: verified.binding.binding_id,
    result_id: verified.result.result_id,
    proposal_sha256: verified.proposalSha256,
    binding_sha256: verified.bindingSha256,
    result_sha256: verified.resultSha256,
  };
}

function persistClassInvocation(captureRoot, record, variant, invocation) {
  if (!captureRoot) return null;
  const readback = writeExclusive(join(captureRoot, `${record.id}-${variant}-invocation.json`), jsonBytes(invocation), `${variant} invocation`);
  return artifact(readback, `class_probe_${variant}`);
}

function invocationRecord({ variant, executable, argv, cwd, input, envBindings, result, semantic, scripts }) {
  return {
    schema_version: 'luca.obligation-class-invocation.v1',
    contract_id: variant,
    executable: artifact(regularReadback(executable, `${variant} executable`), 'executable'),
    argv,
    cwd: realpathSync(cwd),
    input,
    env_bindings: envBindings,
    exit_code: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    scripts: scripts.map((path, index) => artifact(regularReadback(path, `${variant} script[${index}]`), `script_${index}`)),
    semantic,
  };
}

function runS0Evidence(root, captureRoot, record) {
  const temporary = mkdtempSync(join(tmpdir(), 'obl-s0-contract-'));
  const projectsRoot = join(temporary, 'projects');
  mkdirSync(projectsRoot);
  const guard = join(root, '.claude/hooks/project-scope-guard.mjs');
  const adapter = join(root, '.codex/codex-hook-adapter.mjs');
  const specs = [
    { harness: 'claude', outcome: 'allow', tool_name: 'Write', tool_input: { file_path: 'scripts/obl-s0-safe.md', content: 'not-executed' } },
    { harness: 'claude', outcome: 'deny', tool_name: 'Write', tool_input: { file_path: 'docs/obl-s0-negative.md', content: 'must-not-run' } },
    { harness: 'codex', outcome: 'allow', tool_name: 'Bash', tool_input: { command: 'printf x > scripts/obl-s0-safe.md' } },
    { harness: 'codex', outcome: 'deny', tool_name: 'Bash', tool_input: { command: 'printf x > docs/obl-s0-negative.md' } },
  ];
  try {
    const invocations = specs.map((spec) => {
      const variant = `s0_${spec.harness}_${spec.outcome}`;
      const input = JSON.stringify({
        session_id: `obl-${variant}`,
        hook_event_name: 'PreToolUse',
        cwd: root,
        tool_name: spec.tool_name,
        tool_input: spec.tool_input,
      });
      const argv = spec.harness === 'codex' ? [adapter, guard] : [guard];
      const env = {
        ...process.env,
        CLAUDE_PROJECT_DIR: root,
        LUCA_ACTUAL_HARNESS: spec.harness,
        LUCA_PROJECTS_ROOT: projectsRoot,
      };
      const result = spawnSync(process.execPath, argv, { cwd: temporary, env, encoding: 'utf8', input, timeout: 30000 });
      let parsed = null;
      if ((result.stdout || '').trim()) {
        try { parsed = JSON.parse(result.stdout); } catch { fail(`${variant} emitted non-JSON output`); }
      }
      const hookOutput = parsed?.hookSpecificOutput;
      const denied = hookOutput?.permissionDecision === 'deny';
      if (result.status !== 0 || (spec.outcome === 'deny') !== denied
        || (denied && (hookOutput.hookEventName !== 'PreToolUse' || !/NO_PIN/u.test(hookOutput.permissionDecisionReason || '')))) {
        fail(`S0 executable ${variant} contract failed`);
      }
      const semantic = {
        variant,
        harness: spec.harness,
        outcome: spec.outcome,
        exit_code: result.status,
        decision: denied ? 'deny' : 'allow',
        hook_event: denied ? hookOutput.hookEventName : 'NO_CONTROL_OUTPUT',
        no_pin_reason: denied ? /NO_PIN/u.test(hookOutput.permissionDecisionReason || '') : false,
      };
      const invocation = invocationRecord({
        variant,
        executable: process.execPath,
        argv,
        cwd: temporary,
        input,
        envBindings: { CLAUDE_PROJECT_DIR: root, LUCA_ACTUAL_HARNESS: spec.harness, LUCA_PROJECTS_ROOT: projectsRoot },
        result,
        semantic,
        scripts: argv,
      });
      return { semantic, invocation, artifact: persistClassInvocation(captureRoot, record, variant, invocation) };
    });
    return { observations: invocations.map((item) => item.semantic), artifacts: invocations.map((item) => item.artifact).filter(Boolean) };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function runS1Evidence(root, captureRoot, record) {
  const temporary = mkdtempSync(join(tmpdir(), 'obl-s1-contract-'));
  const guard = join(root, '.claude/hooks/route-guard.mjs');
  const input = JSON.stringify({ session_id: 'obl-s1-root-drift', hook_event_name: 'UserPromptSubmit', cwd: temporary, prompt: '生成 HTML 原型' });
  const baseEnv = {
    ...process.env,
    ROUTE_GUARD_DRY_RUN: '1',
    CLAUDE_PROJECT_DIR: root,
    LUCA_ACTUAL_HARNESS: 'claude',
    LUCA_PROJECTS_ROOT: join(temporary, 'no-projects'),
    ROUTE_GUARD_PROJECTS: 'sentinel',
    ROUTE_GUARD_CURRENT_PROJECT: 'sentinel',
    ROUTE_GUARD_HEAVY_SKILLS: '',
  };
  try {
    const variants = [
      ['s1_positive', baseEnv],
      ['s1_replay', baseEnv],
      ['s1_missing_project_root_negative', Object.fromEntries(Object.entries(baseEnv).filter(([key]) => key !== 'CLAUDE_PROJECT_DIR'))],
    ];
    const invocations = variants.map(([variant, env]) => {
      const result = spawnSync(process.execPath, [guard], { cwd: temporary, env, encoding: 'utf8', input, timeout: 30000 });
      let parsed;
      try { parsed = JSON.parse(result.stdout); } catch { fail(`${variant} did not emit route decision JSON`); }
      const semantic = {
        variant,
        exit_code: result.status,
        decision: parsed.decision,
        skill: parsed.skill || null,
        reason: parsed.reason || null,
        stdout_sha256: sha256(Buffer.from(result.stdout || '')),
      };
      const invocation = invocationRecord({
        variant,
        executable: process.execPath,
        argv: [guard],
        cwd: temporary,
        input,
        envBindings: {
          ROUTE_GUARD_DRY_RUN: env.ROUTE_GUARD_DRY_RUN,
          CLAUDE_PROJECT_DIR: env.CLAUDE_PROJECT_DIR || null,
          LUCA_ACTUAL_HARNESS: env.LUCA_ACTUAL_HARNESS,
          LUCA_PROJECTS_ROOT: env.LUCA_PROJECTS_ROOT,
          ROUTE_GUARD_PROJECTS: env.ROUTE_GUARD_PROJECTS,
          ROUTE_GUARD_CURRENT_PROJECT: env.ROUTE_GUARD_CURRENT_PROJECT,
        },
        result,
        semantic,
        scripts: [guard],
      });
      return { semantic, invocation, artifact: persistClassInvocation(captureRoot, record, variant, invocation) };
    });
    const [positive, replay, negative] = invocations.map((item) => item.semantic);
    if (positive.exit_code !== 0 || positive.decision !== 'SINGLE_SKILL' || positive.skill !== '/html-prototype'
      || replay.exit_code !== 0 || replay.decision !== positive.decision || replay.skill !== positive.skill
      || replay.stdout_sha256 !== positive.stdout_sha256 || negative.exit_code !== 0
      || negative.decision !== 'STOP' || negative.reason !== 'no_keyword_match') fail('S1 executable route/replay/negative contract failed');
    return { observations: invocations.map((item) => item.semantic), artifacts: invocations.map((item) => item.artifact).filter(Boolean) };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function runCommandEvidence({ root, captureRoot, record, variant, executable, argv, scripts }) {
  const result = spawnSync(executable, argv, { cwd: root, env: { ...process.env }, encoding: 'utf8', input: '', timeout: 120000 });
  const semantic = {
    variant,
    exit_code: result.status,
    signal: result.signal,
    stdout_sha256: sha256(Buffer.from(result.stdout || '')),
    stderr_sha256: sha256(Buffer.from(result.stderr || '')),
  };
  if (result.status !== 0) fail(`${variant} executable contract failed: ${result.stderr || result.stdout}`);
  const invocation = invocationRecord({
    variant,
    executable,
    argv,
    cwd: root,
    input: '',
    envBindings: {},
    result,
    semantic,
    scripts,
  });
  return { observations: [semantic], artifacts: [persistClassInvocation(captureRoot, record, variant, invocation)].filter(Boolean) };
}

function verifySentinelExecutable(root, relativePath) {
  const observed = regularReadback(join(root, relativePath), `sentinel executable ${relativePath}`);
  if (observed.sha256 !== SENTINEL_EXECUTABLE_SHA256[relativePath]) fail(`sentinel executable hash changed: ${relativePath}`);
  return observed;
}

function productionClassEvidence({ index, ledger, record, captureRoot = null }) {
  if (record.id !== CLASS_PROOF_SENTINELS[record.class]) fail(`obligation ${record.id} has no executable class proof contract`);
  const root = ledger.context.cwd;
  if (regularReadback(join(root, 'scripts/evolution/obligation-index.json'), 'class proof index').sha256 !== ledger.index_sha256
    || index.records.find((row) => row.id === record.id)?.source_pointer !== record.source_pointer) fail('class proof index/row binding mismatch');
  if (record.class === 'S0_MACHINE_SAFETY') {
    verifySentinelExecutable(root, '.claude/hooks/project-scope-guard.mjs');
    verifySentinelExecutable(root, '.codex/codex-hook-adapter.mjs');
    return runS0Evidence(root, captureRoot, record);
  }
  if (record.class === 'S1_ROUTING_DISPATCH') {
    verifySentinelExecutable(root, '.claude/hooks/route-guard.mjs');
    return runS1Evidence(root, captureRoot, record);
  }
  if (record.class === 'S2_COMPLETION_QUALITY') {
    const command = "awk '/^## 红线/{f=1;next} /^## /{f=0} f' CONTEXT.md | { c=$(cat); echo \"$c\" | grep -c '^[0-9]\\.' | grep -qE '^[6-9]|^[0-9]{2}' && echo \"$c\" | grep -q 'SF-002' && echo \"$c\" | grep -q 'SC-20260523-002' && echo \"$c\" | grep -q 'SC-20260523-003' && echo \"$c\" | grep -q 'Surgical' && ! echo \"$c\" | grep -q '见上「激活条件」'; }";
    const verifyText = readFileSync(join(root, 'scripts/verify.sh'), 'utf8');
    const sourceLines = verifyText.split('\n').filter((line) => line.includes('check S32 '));
    if (sourceLines.length !== 1 || ![
      "awk '/^## 红线/", 'CONTEXT.md', 'SF-002', 'SC-20260523-002', 'SC-20260523-003', 'Surgical', '见上「激活条件」',
    ].every((fragment) => sourceLines[0].includes(fragment))) fail('S2 sentinel command is not the bound verify.sh check');
    return runCommandEvidence({ root, captureRoot, record, variant: 's2_verify_s32', executable: '/bin/bash', argv: ['-c', command], scripts: [join(root, 'scripts/verify.sh'), join(root, 'CONTEXT.md')] });
  }
  if (record.class === 'S4_NATIVE_CAPABILITY') {
    verifySentinelExecutable(root, 'scripts/check-codex-viability.mjs');
    return runCommandEvidence({ root, captureRoot, record, variant: 's4_codex_viability', executable: process.execPath, argv: [join(root, 'scripts/check-codex-viability.mjs')], scripts: [join(root, 'scripts/check-codex-viability.mjs'), join(root, '.claude/skill-os/codex-viability.yaml')] });
  }
  return null;
}

function verifyCapturedInvocation(item, currentObservation) {
  const readback = validateArtifactReadback(item, `class invocation ${item.role}`);
  let invocation;
  try { invocation = JSON.parse(readback.bytes.toString('utf8')); } catch { fail(`${item.role} is not JSON`); }
  exactKeys(invocation, [
    'schema_version', 'contract_id', 'executable', 'argv', 'cwd', 'input', 'env_bindings',
    'exit_code', 'signal', 'stdout', 'stderr', 'scripts', 'semantic',
  ], item.role);
  if (invocation.schema_version !== 'luca.obligation-class-invocation.v1'
    || item.role !== `class_probe_${invocation.contract_id}` || stable(invocation.semantic) !== stable(currentObservation)
    || invocation.exit_code !== currentObservation.exit_code || !Array.isArray(invocation.argv) || !Array.isArray(invocation.scripts)) {
    fail(`${item.role} invocation binding mismatch`);
  }
  validateArtifactReadback(invocation.executable, `${item.role} executable`);
  invocation.scripts.forEach((script, index) => validateArtifactReadback(script, `${item.role} script[${index}]`));
}

function verifiedProductionEvidence({ index, ledger, record, artifacts, productionEvidence }) {
  const evidenceValue = productionEvidence || productionClassEvidence({ index, ledger, record });
  for (const observation of evidenceValue.observations) {
    const captured = artifacts.find((item) => item.role === `class_probe_${observation.variant}`);
    if (!captured) fail(`${record.class} proof lacks ${observation.variant} invocation artifact`);
    verifyCapturedInvocation(captured, observation);
  }
  return evidenceValue;
}

function classObservation({ index, ledger, record, artifacts, humanGate, productionEvidence = null }) {
  const entry = ledger.entries.find((row) => row.obligation_id === record.id);
  if (!entry || entry.applicability_state !== 'APPLICABLE' || !['NOT_RUN', 'PASS'].includes(entry.result)) {
    fail('proof target must be an applicable NOT_RUN/PASS entry');
  }
  if (record.class === 'S0_MACHINE_SAFETY') {
    const evidenceValue = verifiedProductionEvidence({ index, ledger, record, artifacts, productionEvidence });
    return { contract_id: CLASS_VERIFIER_CONTRACTS[record.class], production_probes: evidenceValue.observations };
  }
  if (record.class === 'S1_ROUTING_DISPATCH') {
    if (record.applicability.kind === 'GLOBAL_RUNTIME') fail('S1 row has no deterministic route matcher verifier');
    const evidenceValue = verifiedProductionEvidence({ index, ledger, record, artifacts, productionEvidence });
    return { contract_id: CLASS_VERIFIER_CONTRACTS[record.class], production_probes: evidenceValue.observations };
  }
  if (record.class === 'S2_COMPLETION_QUALITY') {
    const evidenceValue = verifiedProductionEvidence({ index, ledger, record, artifacts, productionEvidence });
    return { contract_id: CLASS_VERIFIER_CONTRACTS[record.class], production_probes: evidenceValue.observations };
  }
  if (record.class === 'S3_HUMAN_TASTE') {
    if (!humanGate) fail('S3 proof requires an authoritative human gate chain');
    return { contract_id: CLASS_VERIFIER_CONTRACTS[record.class], ...verifyAuthoritativeHumanGate(humanGate, artifacts, ledger, record) };
  }
  if (record.class === 'S4_NATIVE_CAPABILITY') {
    const evidenceValue = verifiedProductionEvidence({ index, ledger, record, artifacts, productionEvidence });
    return { contract_id: CLASS_VERIFIER_CONTRACTS[record.class], production_probes: evidenceValue.observations };
  }
  fail(`no verifier contract for ${record.class}`);
}

function proofCore(proof) {
  const { receipt_id: ignored, ...core } = proof;
  return core;
}

function activationReceiptCore(receipt) {
  const { activation_id: ignored, ...core } = receipt;
  return core;
}

function activationReceiptPath(ledger, record) {
  const git = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: ledger.context.cwd, encoding: 'utf8', input: '' });
  if (git.status !== 0 || !git.stdout.trim()) fail('cannot resolve repository git dir for activation receipt');
  const invocation = sha256(Buffer.from(ledger.context.invocation_id)).slice(0, 32);
  return join(git.stdout.trim(), 'luca-obligation-runtime', 'activation', invocation, `${record.id}.json`);
}

function writeExclusive(path, bytes, label) {
  mkdirSync(dirname(path), { recursive: true });
  try { writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 }); }
  catch (error) { fail(`${label} exclusive publication failed: ${error.code || error.message}`); }
  const observed = regularReadback(path, label);
  if (!observed.bytes.equals(bytes)) fail(`${label} publication readback mismatch`);
  return observed;
}

export function createObligationProof({ index, ledger, obligationId, outputPath, humanGate = null, startedAt = new Date().toISOString(), finishedAt = startedAt, nonce = randomUUID() }) {
  validateLedgerAgainstIndex(ledger, index);
  const record = index.records.find((row) => row.id === obligationId);
  if (!record) fail(`unknown obligation ${obligationId}`);
  const runtime = regularReadback(fileURLToPath(import.meta.url), 'obligation proof runtime');
  const source = regularReadback(join(ledger.context.cwd, sourcePath(record.source_pointer)), 'obligation proof source');
  const artifactReadbacks = [artifact(source, 'source_rule')];
  if (humanGate) {
    for (const [role, path] of [
      ['human_gate_writer', humanGate.secure_writer_path],
      ['human_gate_plan', humanGate.plan_path],
      ['human_gate_payload', humanGate.payload_path],
      ['human_gate_execution_envelope', humanGate.execution_envelope_path],
      ['human_gate_readback', humanGate.readback_path],
    ]) artifactReadbacks.push(artifact(regularReadback(path, role), role));
  }
  const productionEvidence = productionClassEvidence({
    index,
    ledger,
    record,
    captureRoot: dirname(resolve(outputPath)),
  });
  if (productionEvidence) artifactReadbacks.push(...productionEvidence.artifacts);
  artifactReadbacks.forEach((item, indexValue) => validateArtifactReadback(item, `proof artifact[${indexValue}]`));
  const producer = { path: runtime.path, sha256: runtime.sha256, argv: ['create-proof', record.id] };
  const verifier = { id: CLASS_VERIFIER_CONTRACTS[record.class], path: runtime.path, sha256: runtime.sha256 };
  const observation = classObservation({ index, ledger, record, artifacts: artifactReadbacks, humanGate, productionEvidence });
  const activationCore = {
    schema_version: 'luca.obligation-activation-receipt.v1',
    plan_id: 'REX-20260811-001',
    nonce,
    invocation_id: ledger.context.invocation_id,
    index_sha256: ledger.index_sha256,
    obligation_id: record.id,
    source_pointer: record.source_pointer,
    class: record.class,
    lane: ledger.context.lane,
    contract_id: verifier.id,
    producer,
    verifier,
    artifact_readbacks: artifactReadbacks,
    observation_sha256: sha256(Buffer.from(stable(observation))),
    created_at: validDate(finishedAt, 'activation receipt created_at'),
  };
  const activationReceipt = { ...activationCore, activation_id: `oa-${sha256(Buffer.from(stable(activationCore)))}` };
  const activationReadback = writeExclusive(activationReceiptPath(ledger, record), jsonBytes(activationReceipt), 'obligation activation receipt');
  const core = {
    schema_version: 'luca.obligation-proof.v1',
    plan_id: 'REX-20260811-001',
    nonce,
    invocation_id: ledger.context.invocation_id,
    index_sha256: ledger.index_sha256,
    obligation_id: record.id,
    source_pointer: record.source_pointer,
    class: record.class,
    lane: ledger.context.lane,
    human_gate: humanGate,
    activation: { from: record.wiring_state, to: 'PROBED_ACTIVE' },
    activation_receipt: { path: activationReadback.path, sha256: activationReadback.sha256, activation_id: activationReceipt.activation_id },
    producer,
    verifier,
    started_at: validDate(startedAt, 'proof started_at'),
    finished_at: validDate(finishedAt, 'proof finished_at'),
    exit_code: 0,
    artifact_readbacks: artifactReadbacks,
    observation,
  };
  if (Date.parse(core.finished_at) < Date.parse(core.started_at)) fail('proof timestamps are out of order');
  const proof = { ...core, receipt_id: `op-${sha256(Buffer.from(stable(core)))}` };
  writeAtomic(resolve(outputPath), jsonBytes(proof));
  const bytes = readFileSync(resolve(outputPath));
  return { kind: 'OBLIGATION_PROOF', uri: pathToFileURL(realpathSync(resolve(outputPath))).href, sha256: sha256(bytes), receipt_id: proof.receipt_id };
}

export function verifyObligationProof({ index, ledger, obligationId, evidenceRow }) {
  validateLedgerAgainstIndex(ledger, index);
  exactKeys(evidenceRow, ['kind', 'uri', 'sha256', 'receipt_id'], 'obligation proof evidence');
  if (evidenceRow.kind !== 'OBLIGATION_PROOF' || !String(evidenceRow.uri).startsWith('file:')
    || !HASH_RE.test(evidenceRow.sha256 || '') || !PROOF_ID_RE.test(evidenceRow.receipt_id || '')) fail('obligation proof evidence is invalid');
  let proofPath;
  try { proofPath = fileURLToPath(evidenceRow.uri); } catch { fail('obligation proof URI is invalid'); }
  const proofReadback = regularReadback(proofPath, 'obligation proof');
  if (proofReadback.sha256 !== evidenceRow.sha256) fail('obligation proof artifact hash mismatch');
  let proof;
  try { proof = JSON.parse(proofReadback.bytes.toString('utf8')); } catch { fail('obligation proof is not JSON'); }
  exactKeys(proof, [
    'schema_version', 'plan_id', 'receipt_id', 'nonce', 'invocation_id', 'index_sha256',
    'obligation_id', 'source_pointer', 'class', 'lane', 'human_gate', 'activation', 'activation_receipt', 'producer',
    'verifier', 'started_at', 'finished_at', 'exit_code', 'artifact_readbacks', 'observation',
  ], 'obligation proof');
  const record = index.records.find((row) => row.id === obligationId);
  const entry = ledger.entries.find((row) => row.obligation_id === obligationId);
  if (!record || !entry || proof.schema_version !== 'luca.obligation-proof.v1' || proof.plan_id !== 'REX-20260811-001'
    || proof.receipt_id !== evidenceRow.receipt_id || proof.receipt_id !== `op-${sha256(Buffer.from(stable(proofCore(proof))))}`
    || proof.invocation_id !== ledger.context.invocation_id || proof.index_sha256 !== ledger.index_sha256
    || proof.obligation_id !== record.id || proof.source_pointer !== record.source_pointer || proof.class !== record.class
    || proof.lane !== entry.lane || proof.exit_code !== 0) fail('obligation proof identity/binding mismatch');
  if (typeof proof.nonce !== 'string' || !proof.nonce || Date.parse(validDate(proof.finished_at, 'proof finished_at')) < Date.parse(validDate(proof.started_at, 'proof started_at'))) fail('obligation proof time/nonce is invalid');
  exactKeys(proof.activation, ['from', 'to'], 'obligation proof activation');
  if (record.approved_native_status !== 'MISSING_WIRING' || proof.activation.from !== 'WIRED_UNPROBED' || proof.activation.to !== 'PROBED_ACTIVE') fail('obligation proof activation transition is invalid');
  exactKeys(proof.producer, ['path', 'sha256', 'argv'], 'obligation proof producer');
  exactKeys(proof.verifier, ['id', 'path', 'sha256'], 'obligation proof verifier');
  const runtime = regularReadback(fileURLToPath(import.meta.url), 'obligation proof runtime');
  if (proof.producer.path !== runtime.path || proof.producer.sha256 !== runtime.sha256
    || stable(proof.producer.argv) !== stable(['create-proof', record.id])
    || proof.verifier.id !== CLASS_VERIFIER_CONTRACTS[record.class]
    || proof.verifier.path !== runtime.path || proof.verifier.sha256 !== runtime.sha256) fail('obligation proof producer/verifier binding mismatch');
  exactKeys(proof.activation_receipt, ['path', 'sha256', 'activation_id'], 'obligation proof activation receipt');
  const activationReadback = regularReadback(proof.activation_receipt.path, 'obligation activation receipt');
  if (activationReadback.path !== activationReceiptPath(ledger, record)
    || activationReadback.sha256 !== proof.activation_receipt.sha256
    || !/^oa-[a-f0-9]{64}$/.test(proof.activation_receipt.activation_id || '')) fail('obligation activation receipt readback mismatch');
  let activationReceipt;
  try { activationReceipt = JSON.parse(activationReadback.bytes.toString('utf8')); } catch { fail('obligation activation receipt is not JSON'); }
  exactKeys(activationReceipt, [
    'schema_version', 'plan_id', 'activation_id', 'nonce', 'invocation_id', 'index_sha256',
    'obligation_id', 'source_pointer', 'class', 'lane', 'contract_id', 'producer', 'verifier',
    'artifact_readbacks', 'observation_sha256', 'created_at',
  ], 'obligation activation receipt');
  if (activationReceipt.activation_id !== proof.activation_receipt.activation_id
    || activationReceipt.activation_id !== `oa-${sha256(Buffer.from(stable(activationReceiptCore(activationReceipt))))}`
    || activationReceipt.schema_version !== 'luca.obligation-activation-receipt.v1'
    || activationReceipt.plan_id !== proof.plan_id || activationReceipt.nonce !== proof.nonce
    || activationReceipt.invocation_id !== proof.invocation_id || activationReceipt.index_sha256 !== proof.index_sha256
    || activationReceipt.obligation_id !== proof.obligation_id || activationReceipt.source_pointer !== proof.source_pointer
    || activationReceipt.class !== proof.class || activationReceipt.lane !== proof.lane
    || activationReceipt.contract_id !== proof.verifier.id
    || stable(activationReceipt.producer) !== stable(proof.producer)
    || stable(activationReceipt.verifier) !== stable(proof.verifier)
    || stable(activationReceipt.artifact_readbacks) !== stable(proof.artifact_readbacks)
    || activationReceipt.observation_sha256 !== sha256(Buffer.from(stable(proof.observation)))) {
    fail('obligation activation receipt binding mismatch');
  }
  if (!Array.isArray(proof.artifact_readbacks) || proof.artifact_readbacks.length === 0) fail('obligation proof has no artifact readbacks');
  const roles = new Set();
  proof.artifact_readbacks.forEach((item, indexValue) => {
    if (roles.has(item.role)) fail('obligation proof artifact role is duplicated');
    roles.add(item.role);
    validateArtifactReadback(item, `obligation proof artifact[${indexValue}]`);
  });
  const source = proof.artifact_readbacks.find((item) => item.role === 'source_rule');
  const expectedSource = regularReadback(join(ledger.context.cwd, sourcePath(record.source_pointer)), 'obligation proof source');
  if (!source || source.path !== expectedSource.path || source.sha256 !== expectedSource.sha256 || source.size !== expectedSource.size) fail('obligation proof source readback mismatch');
  const expectedObservation = classObservation({
    index,
    ledger,
    record,
    artifacts: proof.artifact_readbacks,
    humanGate: proof.human_gate,
  });
  if (stable(expectedObservation) !== stable(proof.observation)) fail('obligation proof class verifier mismatch');
  return proof;
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
    exactKeys(row, row?.kind === 'OBLIGATION_PROOF' ? ['kind', 'uri', 'sha256', 'receipt_id'] : ['kind', 'uri', 'sha256'], 'evidence row');
    if (typeof row.kind !== 'string' || !row.kind || typeof row.uri !== 'string' || !row.uri || !HASH_RE.test(row.sha256 || '')) {
      fail('evidence row is invalid');
    }
    if (row.kind === 'OBLIGATION_PROOF' && !PROOF_ID_RE.test(row.receipt_id || '')) fail('obligation proof evidence receipt_id is invalid');
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

export function recordEvidence({ ledger, index = null, obligationId, result, evidence: evidenceRows }) {
  if (!RESULT_SET.has(result)) fail(`invalid result ${result}`);
  validateEvidenceRows(evidenceRows);
  if (!index) fail('recordEvidence requires the bound obligation index');
  validateExecutableLedger(ledger, index, { requireConsumption: true });
  if (result === 'PASS' && evidenceRows.some((row) => row.kind !== 'OBLIGATION_PROOF' || !row.uri.startsWith('file:'))) {
    fail('PASS requires file-backed OBLIGATION_PROOF evidence');
  }
  let verifiedProof = null;
  if (result === 'PASS') {
    if (evidenceRows.length !== 1) fail('PASS requires exactly one OBLIGATION_PROOF');
    verifiedProof = verifyObligationProof({ index, ledger, obligationId, evidenceRow: evidenceRows[0] });
  }
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
  if (verifiedProof) consumeObligationProof(verifiedProof, ledger);
  return validateExecutableLedger(next, index, { requireConsumption: true });
}

export function validateExecutableLedger(ledger, index, { requireConsumption = true } = {}) {
  validateLedgerAgainstIndex(ledger, index);
  for (const entry of ledger.entries.filter((row) => row.result === 'PASS')) {
    if (entry.evidence.length !== 1 || entry.evidence[0].kind !== 'OBLIGATION_PROOF') {
      fail(`PASS entry lacks a single obligation proof ${entry.obligation_id}`);
    }
    const proof = verifyObligationProof({ index, ledger, obligationId: entry.obligation_id, evidenceRow: entry.evidence[0] });
    if (requireConsumption) verifyProofConsumption(proof, ledger);
  }
  return ledger;
}

export function aggregateLedger(ledger, index) {
  return validateExecutableLedger(ledger, index).aggregate;
}

const EXECUTION_RECEIPT_KEYS = Object.freeze([
  'schema_version', 'plan_id', 'receipt_id', 'run_id', 'nonce', 'repo_root', 'index_sha256',
  'commit', 'tree', 'run_ticket', 'entrypoint', 'lane', 'started_at', 'finished_at',
  'producer', 'verifier', 'mint_authorization', 'entrypoint_binding', 'argv', 'command', 'exit_code', 'executed_check_ids',
  'classes', 'result', 'artifact_readbacks',
]);

const ENTRYPOINT_BINDINGS = Object.freeze({
  verify: Object.freeze({ path: 'scripts/verify.sh', command_fragment: 'verify-obligation-runtime.mjs l1-verify', exact_line: 'check S34 "obligation runtime L1 只回执本入口真实执行集合" "node scripts/evolution/verify-obligation-runtime.mjs l1-verify"' }),
  'pre-commit': Object.freeze({ path: '.githooks/pre-commit', command_fragment: 'verify-obligation-runtime.mjs l1-pre-commit', exact_line: 'node scripts/evolution/verify-obligation-runtime.mjs l1-pre-commit' }),
  ci: Object.freeze({ path: '.github/workflows/ci.yml', command_fragment: 'verify-obligation-runtime.mjs l1-ci', exact_line: 'run: node scripts/evolution/verify-obligation-runtime.mjs l1-ci' }),
  'local-live-claude': Object.freeze({ path: '.claude/settings.json', command_fragment: 'obligation-task-start-hook.mjs', event: 'UserPromptSubmit', exact_hook_command: 'node "${CLAUDE_PROJECT_DIR:-.}/scripts/evolution/obligation-task-start-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2' }),
  'local-live-codex': Object.freeze({ path: '.codex/hooks.json', command_fragment: 'obligation-task-start-hook.mjs', event: 'UserPromptSubmit', exact_hook_command: 'node "$(git rev-parse --show-toplevel)/.codex/codex-hook-adapter.mjs" "$(git rev-parse --show-toplevel)/scripts/evolution/obligation-task-start-hook.mjs" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ "$c" = "0" ] && exit 0 || exit 2' }),
  external: Object.freeze({ path: 'scripts/evolution/verify-obligation-runtime.mjs', command_fragment: "else if (mode === 'l3')", exact_line: "} else if (mode === 'l3') {" }),
});

function verifyEntrypointBindingText(binding, text) {
  if (binding.exact_line) {
    const matches = text.split('\n').map((line) => line.trim()).filter((line) => line === binding.exact_line);
    if (matches.length !== 1) fail('execution receipt entrypoint exact command is missing or duplicated');
    return;
  }
  let config;
  try { config = JSON.parse(text); } catch { fail('execution receipt hook entrypoint is not JSON'); }
  const commands = (config?.hooks?.[binding.event] || []).flatMap((group) => group.hooks || []).map((hook) => hook.command);
  if (commands.filter((command) => command === binding.exact_hook_command).length !== 1
    || commands.filter((command) => typeof command === 'string' && command.includes(binding.command_fragment)).length !== 1) {
    fail('execution receipt hook entrypoint exact command is missing or duplicated');
  }
}
const ENTRYPOINT_MODES = Object.freeze({
  verify: ['l1-verify'],
  'pre-commit': ['l1-pre-commit'],
  ci: ['l1-ci'],
  'local-live-claude': ['l2', '--harness', 'claude'],
  'local-live-codex': ['l2', '--harness', 'codex'],
  external: ['l3'],
});

function entrypointFromMode(mode, argv) {
  if (mode === 'l1-verify') return 'verify';
  if (mode === 'l1-pre-commit') return 'pre-commit';
  if (mode === 'l1-ci') return 'ci';
  if (mode === 'l3') return 'external';
  if (mode === 'l2') {
    const harnessOffsets = argv.reduce((offsets, value, index) => value === '--harness' ? [...offsets, index] : offsets, []);
    if (harnessOffsets.length !== 1 || !['claude', 'codex'].includes(argv[harnessOffsets[0] + 1])) fail('l2 mint authorization has no exact harness');
    return `local-live-${argv[harnessOffsets[0] + 1]}`;
  }
  fail('mint authorization mode is not a receipt-producing mode');
}
const L1_CHECK_IDS = Object.freeze([
  'INDEX-SCHEMA', 'REVERSE-DENOMINATOR', 'ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER',
  'ACTIVATION-FAIL-CLOSED', 'LEDGER-EVIDENCE', 'REAL-BEHAVIOR', 'MUTATION-MATRIX',
]);
const EXECUTION_PROFILES = Object.freeze({
  verify: Object.freeze({ lane: 'L1_HERMETIC', result: 'PASS', exit_code: 0, checks: L1_CHECK_IDS, artifact_roles: ['execution_detail', 'mutation_matrix', 'obligation_index'], allowed_options: ['--approved', '--receipt-output', '--run-ticket', '--u009-receipt'] }),
  'pre-commit': Object.freeze({ lane: 'L1_HERMETIC', result: 'PASS', exit_code: 0, checks: L1_CHECK_IDS, artifact_roles: ['execution_detail', 'mutation_matrix', 'obligation_index'], allowed_options: ['--approved', '--receipt-output', '--run-ticket', '--u009-receipt'] }),
  ci: Object.freeze({ lane: 'L1_HERMETIC', result: 'PASS', exit_code: 0, checks: L1_CHECK_IDS, artifact_roles: ['execution_detail', 'github_event', 'mutation_matrix', 'obligation_index'], allowed_options: ['--approved', '--receipt-output', '--run-ticket', '--u009-receipt'] }),
  'local-live-claude': Object.freeze({ lane: 'L2_LOCAL_LIVE', result: 'PASS', exit_code: 0, checks: ['ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'REAL-BEHAVIOR'], artifact_roles: ['execution_detail', 'mutation_matrix', 'obligation_index'], allowed_options: ['--receipt-output', '--run-ticket'] }),
  'local-live-codex': Object.freeze({ lane: 'L2_LOCAL_LIVE', result: 'PASS', exit_code: 0, checks: ['ACTIVATION-CODEX-TRUST', 'ACTIVATION-CONSUMER', 'ACTIVATION-MATCHER', 'ACTIVATION-FAIL-CLOSED', 'REAL-BEHAVIOR'], artifact_roles: ['execution_detail', 'mutation_matrix', 'obligation_index'], allowed_options: ['--receipt-output', '--run-ticket'] }),
  external: Object.freeze({ lane: 'L3_EXTERNAL', result: 'NOT_RUN', exit_code: 1, checks: ['GLOBAL-READBACK-NOT-RUN'], artifact_roles: ['execution_detail', 'mutation_matrix', 'obligation_index'], allowed_options: ['--receipt-output', '--run-ticket'] }),
});

function validateProducerArgv(entrypoint, argv, producerScriptPath) {
  if (!Array.isArray(argv) || argv.length === 0 || argv.some((value) => typeof value !== 'string' || !value)) fail('execution receipt argv is invalid');
  const prefix = ENTRYPOINT_MODES[entrypoint];
  if (realpathSync(argv[0]) !== producerScriptPath || stable(argv.slice(1, 1 + prefix.length)) !== stable(prefix)) {
    fail('execution receipt argv does not match its hardcoded producer mode');
  }
  const allowed = new Set(EXECUTION_PROFILES[entrypoint].allowed_options);
  const tail = argv.slice(1 + prefix.length);
  const seen = new Set();
  for (let index = 0; index < tail.length; index += 2) {
    const name = tail[index];
    const value = tail[index + 1];
    if (!allowed.has(name) || seen.has(name) || typeof value !== 'string' || !value || value.startsWith('--')) {
      fail('execution receipt argv contains an unbound or duplicated option');
    }
    seen.add(name);
  }
}

function processSnapshot(pid) {
  const command = spawnSync('/bin/ps', ['-ww', '-o', 'command=', '-p', String(pid)], { encoding: 'utf8', input: '' });
  const started = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', input: '' });
  if (command.status !== 0 || started.status !== 0 || !command.stdout.trim() || !started.stdout.trim()) fail('cannot authenticate receipt verifier process');
  return { command: command.stdout.trim(), started_at: started.stdout.trim() };
}

function authorizationCore(authorization) {
  const { authorization_id: ignored, ...core } = authorization;
  return core;
}

function verifyMintAuthorization(path) {
  const readback = regularReadback(path, 'receipt mint authorization');
  let authorization;
  try { authorization = JSON.parse(readback.bytes.toString('utf8')); } catch { fail('receipt mint authorization is not JSON'); }
  exactKeys(authorization, [
    'schema_version', 'plan_id', 'authorization_id', 'nonce', 'parent_pid', 'parent_started_at',
    'parent_command', 'root', 'index_path', 'run_ticket_path', 'mode', 'argv', 'started_at',
    'finished_at', 'producer', 'verifier', 'artifact_paths',
  ], 'receipt mint authorization');
  if (authorization.schema_version !== 'luca.obligation-mint-authorization.v1'
    || authorization.plan_id !== 'REX-20260811-001'
    || !/^oma-[a-f0-9]{64}$/.test(authorization.authorization_id || '')
    || authorization.authorization_id !== `oma-${sha256(Buffer.from(stable(authorizationCore(authorization))))}`
    || typeof authorization.nonce !== 'string' || !authorization.nonce
    || authorization.parent_pid !== process.ppid) fail('receipt mint authorization identity/parent mismatch');
  const observedParent = processSnapshot(process.ppid);
  if (authorization.parent_started_at !== observedParent.started_at || authorization.parent_command !== observedParent.command) {
    fail('receipt mint authorization parent process changed');
  }
  if (!Array.isArray(authorization.argv) || authorization.argv.some((value) => typeof value !== 'string' || !value || /\s/u.test(value))) {
    fail('receipt mint authorization argv is invalid');
  }
  const commandTokens = observedParent.command.split(/\s+/u);
  const observedArgv = commandTokens.slice(1);
  if (observedArgv.length !== authorization.argv.length
    || realpathSync(observedArgv[0]) !== realpathSync(authorization.argv[0])
    || stable(observedArgv.slice(1)) !== stable(authorization.argv.slice(1))) {
    fail('receipt mint authorization is not the direct verifier argv');
  }
  const observedExecutable = commandTokens[0].includes('/')
    ? realpathSync(commandTokens[0])
    : realpathSync(spawnSync('/usr/bin/which', [commandTokens[0]], { encoding: 'utf8', input: '' }).stdout.trim());
  exactKeys(authorization.producer, ['executable_path', 'executable_sha256', 'script_path', 'script_sha256'], 'mint authorization producer');
  exactKeys(authorization.verifier, ['executable_path', 'executable_sha256', 'script_path', 'script_sha256'], 'mint authorization verifier');
  const runtime = regularReadback(fileURLToPath(import.meta.url), 'receipt mint runtime');
  const verifier = regularReadback(join(REPO_ROOT, 'scripts/evolution/verify-obligation-runtime.mjs'), 'receipt verifier');
  const executable = regularReadback(process.execPath, 'receipt executable');
  if (observedExecutable !== executable.path
    || authorization.producer.executable_path !== executable.path || authorization.producer.executable_sha256 !== executable.sha256
    || authorization.producer.script_path !== runtime.path || authorization.producer.script_sha256 !== runtime.sha256
    || authorization.verifier.executable_path !== executable.path || authorization.verifier.executable_sha256 !== executable.sha256
    || authorization.verifier.script_path !== verifier.path || authorization.verifier.script_sha256 !== verifier.sha256
    || realpathSync(authorization.argv[0]) !== verifier.path || authorization.mode !== authorization.argv[1]) {
    fail('receipt mint authorization producer/verifier readback mismatch');
  }
  if (realpathSync(authorization.root) !== REPO_ROOT || realpathSync(authorization.index_path) !== realpathSync(INDEX_PATH)) {
    fail('receipt mint authorization root/index identity mismatch');
  }
  validDate(authorization.started_at, 'mint authorization started_at');
  validDate(authorization.finished_at, 'mint authorization finished_at');
  if (Date.parse(authorization.finished_at) < Date.parse(authorization.started_at)) fail('mint authorization timestamps are out of order');
  if (!Array.isArray(authorization.artifact_paths) || authorization.artifact_paths.length === 0) fail('mint authorization has no artifact paths');
  for (const [indexValue, item] of authorization.artifact_paths.entries()) exactKeys(item, ['role', 'path'], `mint authorization artifact[${indexValue}]`);
  const entrypoint = entrypointFromMode(authorization.mode, authorization.argv);
  validateProducerArgv(entrypoint, authorization.argv, verifier.path);
  const consumedPath = join(dirname(readback.path), `consumed-${authorization.authorization_id}.json`);
  const consumed = writeExclusive(consumedPath, readback.bytes, 'receipt mint authorization consumption');
  rmSync(readback.path, { force: true });
  return { authorization, entrypoint, consumed };
}

function gitValue(root, args, label) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', input: '' });
  if (result.status !== 0 || !result.stdout.trim()) fail(`cannot read git ${label}`);
  return result.stdout.trim();
}

function currentRepositoryBinding(root, indexPath) {
  const repoRoot = realpathSync(resolve(root));
  const index = regularReadback(indexPath, 'obligation index');
  loadIndex(index.path);
  const commit = gitValue(repoRoot, ['rev-parse', 'HEAD'], 'commit');
  const tree = gitValue(repoRoot, ['rev-parse', 'HEAD^{tree}'], 'tree');
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-f0-9]{40}$/.test(tree)) fail('git commit/tree binding is invalid');
  return { repo_root: repoRoot, index_sha256: index.sha256, commit, tree };
}

function executionRunCore(run) {
  const { run_id: ignored, ...core } = run;
  return core;
}

export function createExecutionRun({ root = REPO_ROOT, indexPath = INDEX_PATH, outputPath = null, nonce = randomUUID(), startedAt = new Date().toISOString() } = {}) {
  const binding = currentRepositoryBinding(root, indexPath);
  const core = {
    schema_version: 'luca.obligation-execution-run.v1',
    plan_id: 'REX-20260811-001',
    nonce,
    ...binding,
    started_at: validDate(startedAt, 'execution run started_at'),
  };
  const run = { ...core, run_id: `orun-${sha256(Buffer.from(stable(core)))}` };
  let path = outputPath ? resolve(outputPath) : null;
  if (!path) {
    const gitDir = gitValue(binding.repo_root, ['rev-parse', '--absolute-git-dir'], 'directory');
    path = join(gitDir, 'luca-obligation-runtime', 'runs', `${run.run_id}.json`);
  }
  const readback = writeExclusive(path, jsonBytes(run), 'obligation execution run');
  return { run, path: readback.path, sha256: readback.sha256 };
}

export function readExecutionRun(path, { root = REPO_ROOT, indexPath = INDEX_PATH } = {}) {
  const readback = regularReadback(path, 'obligation execution run');
  let run;
  try { run = JSON.parse(readback.bytes.toString('utf8')); } catch { fail('obligation execution run is not JSON'); }
  exactKeys(run, ['schema_version', 'plan_id', 'run_id', 'nonce', 'repo_root', 'index_sha256', 'commit', 'tree', 'started_at'], 'obligation execution run');
  const current = currentRepositoryBinding(root, indexPath);
  if (run.schema_version !== 'luca.obligation-execution-run.v1' || run.plan_id !== 'REX-20260811-001'
    || !/^orun-[a-f0-9]{64}$/.test(run.run_id || '') || run.run_id !== `orun-${sha256(Buffer.from(stable(executionRunCore(run))))}`
    || typeof run.nonce !== 'string' || !run.nonce || run.repo_root !== current.repo_root
    || run.index_sha256 !== current.index_sha256 || run.commit !== current.commit || run.tree !== current.tree) fail('obligation execution run binding mismatch');
  validDate(run.started_at, 'execution run started_at');
  return { run, path: readback.path, sha256: readback.sha256 };
}

function executionReceiptCore(receipt) {
  const { receipt_id: ignored, ...core } = receipt;
  return core;
}

function mintExecutionReceipt(authorizationRecord) {
  const { authorization, entrypoint, consumed } = authorizationRecord;
  const profile = EXECUTION_PROFILES[entrypoint];
  const checks = [...profile.checks].sort();
  const coveredClasses = [...OBLIGATION_CLASSES].sort();
  const runRecord = readExecutionRun(authorization.run_ticket_path, { root: authorization.root, indexPath: authorization.index_path });
  const bindingSpec = ENTRYPOINT_BINDINGS[entrypoint];
  const entrypointFile = regularReadback(join(runRecord.run.repo_root, bindingSpec.path), 'execution receipt entrypoint');
  const entrypointText = entrypointFile.bytes.toString('utf8');
  verifyEntrypointBindingText(bindingSpec, entrypointText);
  const readbacks = authorization.artifact_paths.map((item, indexValue) => {
    exactKeys(item, ['role', 'path'], `execution artifact path[${indexValue}]`);
    return artifact(regularReadback(item.path, `execution artifact ${item.role}`), item.role);
  });
  if (new Set(readbacks.map((item) => item.role)).size !== readbacks.length) fail('execution artifact role is duplicated');
  if (stable(readbacks.map((item) => item.role).sort()) !== stable([...profile.artifact_roles].sort())) fail('execution artifact roles differ from fixed entrypoint profile');
  const start = validDate(authorization.started_at, 'execution receipt started_at');
  const finish = validDate(authorization.finished_at, 'execution receipt finished_at');
  if (Date.parse(start) < Date.parse(runRecord.run.started_at) || Date.parse(finish) < Date.parse(start)) fail('execution receipt timestamps are out of order');
  const entrypointBinding = { path: entrypointFile.path, sha256: entrypointFile.sha256, command_fragment: bindingSpec.command_fragment };
  const exactArgv = [...authorization.argv];
  validateProducerArgv(entrypoint, exactArgv, authorization.verifier.script_path);
  const verifier = {
    ...authorization.verifier,
    pid: authorization.parent_pid,
    process_started_at: authorization.parent_started_at,
    process_command: authorization.parent_command,
  };
  const core = {
    schema_version: 'luca.obligation-execution-receipt.v2',
    plan_id: 'REX-20260811-001',
    run_id: runRecord.run.run_id,
    nonce: runRecord.run.nonce,
    repo_root: runRecord.run.repo_root,
    index_sha256: runRecord.run.index_sha256,
    commit: runRecord.run.commit,
    tree: runRecord.run.tree,
    run_ticket: { path: runRecord.path, sha256: runRecord.sha256 },
    entrypoint,
    lane: profile.lane,
    started_at: start,
    finished_at: finish,
    producer: authorization.producer,
    verifier,
    mint_authorization: { path: consumed.path, sha256: consumed.sha256, authorization_id: authorization.authorization_id },
    entrypoint_binding: entrypointBinding,
    argv: exactArgv,
    command: JSON.stringify([verifier.executable_path, ...exactArgv]),
    exit_code: profile.exit_code,
    executed_check_ids: checks,
    classes: coveredClasses,
    result: profile.result,
    artifact_readbacks: readbacks,
  };
  return { ...core, receipt_id: `orc-${sha256(Buffer.from(stable(core)))}` };
}

export function validateExecutionReceipt(receipt, { root = REPO_ROOT, indexPath = INDEX_PATH } = {}) {
  exactKeys(receipt, EXECUTION_RECEIPT_KEYS, 'execution receipt');
  if (receipt.schema_version !== 'luca.obligation-execution-receipt.v2' || receipt.plan_id !== 'REX-20260811-001'
    || !/^orc-[a-f0-9]{64}$/.test(receipt.receipt_id || '')
    || receipt.receipt_id !== `orc-${sha256(Buffer.from(stable(executionReceiptCore(receipt))))}`) fail('execution receipt identity mismatch');
  exactKeys(receipt.run_ticket, ['path', 'sha256'], 'execution receipt run ticket');
  const runRecord = readExecutionRun(receipt.run_ticket.path, { root, indexPath });
  if (runRecord.sha256 !== receipt.run_ticket.sha256 || receipt.run_id !== runRecord.run.run_id
    || receipt.nonce !== runRecord.run.nonce || receipt.repo_root !== runRecord.run.repo_root
    || receipt.index_sha256 !== runRecord.run.index_sha256 || receipt.commit !== runRecord.run.commit || receipt.tree !== runRecord.run.tree) {
    fail('execution receipt run/index/commit binding mismatch');
  }
  exactKeys(receipt.producer, ['executable_path', 'executable_sha256', 'script_path', 'script_sha256'], 'execution receipt producer');
  exactKeys(receipt.verifier, [
    'executable_path', 'executable_sha256', 'script_path', 'script_sha256', 'pid',
    'process_started_at', 'process_command',
  ], 'execution receipt verifier');
  const executable = regularReadback(receipt.producer.executable_path, 'execution receipt producer executable');
  const producerScript = regularReadback(receipt.producer.script_path, 'execution receipt producer script');
  const verifierExecutable = regularReadback(receipt.verifier.executable_path, 'execution receipt verifier executable');
  const verifierScript = regularReadback(receipt.verifier.script_path, 'execution receipt verifier script');
  if (receipt.producer.executable_path !== realpathSync(process.execPath) || receipt.producer.executable_sha256 !== executable.sha256
    || receipt.producer.script_path !== realpathSync(fileURLToPath(import.meta.url)) || receipt.producer.script_sha256 !== producerScript.sha256) {
    fail('execution receipt producer readback mismatch');
  }
  if (receipt.verifier.executable_path !== executable.path || receipt.verifier.executable_sha256 !== verifierExecutable.sha256
    || receipt.verifier.script_path !== realpathSync(join(receipt.repo_root, 'scripts/evolution/verify-obligation-runtime.mjs'))
    || receipt.verifier.script_sha256 !== verifierScript.sha256 || !Number.isSafeInteger(receipt.verifier.pid) || receipt.verifier.pid <= 1
    || typeof receipt.verifier.process_started_at !== 'string' || !receipt.verifier.process_started_at
    || typeof receipt.verifier.process_command !== 'string' || !receipt.verifier.process_command) {
    fail('execution receipt verifier readback mismatch');
  }
  exactKeys(receipt.mint_authorization, ['path', 'sha256', 'authorization_id'], 'execution receipt mint authorization');
  const authorizationReadback = regularReadback(receipt.mint_authorization.path, 'execution receipt mint authorization');
  if (authorizationReadback.sha256 !== receipt.mint_authorization.sha256) fail('execution receipt mint authorization hash mismatch');
  let authorization;
  try { authorization = JSON.parse(authorizationReadback.bytes.toString('utf8')); } catch { fail('execution receipt mint authorization is not JSON'); }
  exactKeys(authorization, [
    'schema_version', 'plan_id', 'authorization_id', 'nonce', 'parent_pid', 'parent_started_at',
    'parent_command', 'root', 'index_path', 'run_ticket_path', 'mode', 'argv', 'started_at',
    'finished_at', 'producer', 'verifier', 'artifact_paths',
  ], 'execution receipt mint authorization payload');
  if (authorization.schema_version !== 'luca.obligation-mint-authorization.v1'
    || authorization.plan_id !== receipt.plan_id || authorization.authorization_id !== receipt.mint_authorization.authorization_id
    || authorization.authorization_id !== `oma-${sha256(Buffer.from(stable(authorizationCore(authorization))))}`
    || authorization.parent_pid !== receipt.verifier.pid || authorization.parent_started_at !== receipt.verifier.process_started_at
    || authorization.parent_command !== receipt.verifier.process_command || stable(authorization.producer) !== stable(receipt.producer)
    || stable(authorization.verifier) !== stable({
      executable_path: receipt.verifier.executable_path,
      executable_sha256: receipt.verifier.executable_sha256,
      script_path: receipt.verifier.script_path,
      script_sha256: receipt.verifier.script_sha256,
    })
    || authorization.root !== receipt.repo_root || realpathSync(authorization.index_path) !== realpathSync(indexPath)
    || realpathSync(authorization.run_ticket_path) !== runRecord.path || entrypointFromMode(authorization.mode, authorization.argv) !== receipt.entrypoint
    || stable(authorization.argv) !== stable(receipt.argv) || authorization.started_at !== receipt.started_at
    || authorization.finished_at !== receipt.finished_at) fail('execution receipt mint authorization binding mismatch');
  exactKeys(receipt.entrypoint_binding, ['path', 'sha256', 'command_fragment'], 'execution receipt entrypoint binding');
  const bindingSpec = ENTRYPOINT_BINDINGS[receipt.entrypoint];
  if (!bindingSpec) fail('execution receipt entrypoint is invalid');
  const entrypointFile = regularReadback(receipt.entrypoint_binding.path, 'execution receipt entrypoint');
  if (receipt.entrypoint_binding.path !== realpathSync(join(receipt.repo_root, bindingSpec.path))
    || receipt.entrypoint_binding.sha256 !== entrypointFile.sha256
    || receipt.entrypoint_binding.command_fragment !== bindingSpec.command_fragment) fail('execution receipt entrypoint readback mismatch');
  verifyEntrypointBindingText(bindingSpec, entrypointFile.bytes.toString('utf8'));
  if (!Array.isArray(receipt.argv) || receipt.argv.some((value) => typeof value !== 'string' || !value)
    || receipt.command !== JSON.stringify([receipt.verifier.executable_path, ...receipt.argv])) fail('execution receipt command/argv mismatch');
  validateProducerArgv(receipt.entrypoint, receipt.argv, receipt.verifier.script_path);
  const checks = exactStringArray(receipt.executed_check_ids, 'execution receipt check ids');
  const classes = exactStringArray(receipt.classes, 'execution receipt classes');
  const profile = EXECUTION_PROFILES[receipt.entrypoint];
  if (checks.length === 0 || classes.length === 0 || classes.some((value) => !CLASS_SET.has(value))
    || stable(checks) !== stable([...profile.checks].sort()) || stable(classes) !== stable([...OBLIGATION_CLASSES].sort())) {
    fail('execution receipt check/class set differs from fixed entrypoint profile');
  }
  if (!RESULT_SET.has(receipt.result) || !LANE_SET.has(receipt.lane) || !Number.isInteger(receipt.exit_code)
    || receipt.lane !== profile.lane || receipt.result !== profile.result || receipt.exit_code !== profile.exit_code) fail('execution receipt result/exit differs from fixed entrypoint profile');
  validDate(receipt.started_at, 'execution receipt started_at');
  validDate(receipt.finished_at, 'execution receipt finished_at');
  if (Date.parse(receipt.started_at) < Date.parse(runRecord.run.started_at) || Date.parse(receipt.finished_at) < Date.parse(receipt.started_at)) fail('execution receipt timestamps are out of order');
  if (!Array.isArray(receipt.artifact_readbacks) || receipt.artifact_readbacks.length === 0) fail('execution receipt has no artifact readbacks');
  const roles = new Set();
  for (const [indexValue, item] of receipt.artifact_readbacks.entries()) {
    if (roles.has(item.role)) fail('execution receipt artifact role is duplicated');
    roles.add(item.role);
    validateArtifactReadback(item, `execution receipt artifact[${indexValue}]`);
  }
  if (stable([...roles].sort()) !== stable([...profile.artifact_roles].sort())) fail('execution receipt artifact roles differ from fixed entrypoint profile');
  if (stable(authorization.artifact_paths.map((item) => ({ role: item.role, path: realpathSync(item.path) })).sort((a, b) => a.role.localeCompare(b.role)))
    !== stable(receipt.artifact_readbacks.map((item) => ({ role: item.role, path: item.path })).sort((a, b) => a.role.localeCompare(b.role)))) {
    fail('execution receipt artifact authorization mismatch');
  }
  const detailArtifact = receipt.artifact_readbacks.find((item) => item.role === 'execution_detail');
  let detail;
  try { detail = JSON.parse(readFileSync(detailArtifact.path, 'utf8')); } catch { fail('execution detail artifact is not JSON'); }
  exactKeys(detail, ['schema_version', 'entrypoint', 'checks', 'detail'], 'execution detail artifact');
  if (detail.schema_version !== 'luca.obligation-execution-detail.v1' || detail.entrypoint !== receipt.entrypoint
    || stable(exactStringArray(detail.checks, 'execution detail checks')) !== stable(checks)) fail('execution detail artifact binding mismatch');
  if (receipt.result === 'DEGRADED' && classes.some((value) => value === 'S0_MACHINE_SAFETY' || value === 'S3_HUMAN_TASTE')) fail('execution receipt cannot DEGRADED an S0/S3 class');
  return receipt;
}

export function readExecutionReceipt(path, options = {}) {
  const readback = regularReadback(path, 'execution receipt');
  let receipt;
  try { receipt = JSON.parse(readback.bytes.toString('utf8')); } catch { fail('execution receipt is not JSON'); }
  return { receipt: validateExecutionReceipt(receipt, options), path: readback.path, sha256: readback.sha256 };
}

export function aggregateLaneReceipts(receipts, options = {}) {
  if (!Array.isArray(receipts)) fail('lane receipts must be an array');
  const byEntrypoint = new Map();
  const laneMembers = new Map(LANES.map((lane) => [lane, []]));
  let shared = null;
  for (const candidate of receipts) {
    const receipt = validateExecutionReceipt(candidate, options);
    if (byEntrypoint.has(receipt.entrypoint)) fail('entrypoint receipt identity/uniqueness mismatch');
    const identity = [receipt.run_id, receipt.nonce, receipt.repo_root, receipt.index_sha256, receipt.commit, receipt.tree];
    if (shared && stable(identity) !== stable(shared)) fail('foreign/stale lane receipt run binding mismatch');
    shared = identity;
    byEntrypoint.set(receipt.entrypoint, receipt);
    laneMembers.get(receipt.lane).push(receipt);
  }
  if (laneMembers.get('L1_HERMETIC').length > 1 || laneMembers.get('L3_EXTERNAL').length > 1) fail('lane receipt identity/uniqueness mismatch');
  const l2 = laneMembers.get('L2_LOCAL_LIVE');
  const l2Exact = l2.length === 2
    && byEntrypoint.has('local-live-claude') && byEntrypoint.has('local-live-codex');
  if (l2.length > 0 && !l2Exact) {
    // A single live harness never represents the dual-harness lane.
    laneMembers.set('L2_LOCAL_LIVE', []);
  }
  const entries = LANES.map((lane) => {
    const members = laneMembers.get(lane);
    const result = members.length === 0 ? 'NOT_RUN' : aggregateResults(members.map((receipt) => ({
      class: receipt.result === 'DEGRADED' ? 'S4_NATIVE_CAPABILITY' : 'S0_MACHINE_SAFETY',
      applicable: true,
      result: receipt.result,
    })));
    return { class: result === 'DEGRADED' ? 'S4_NATIVE_CAPABILITY' : 'S0_MACHINE_SAFETY', applicable: true, result };
  });
  const result = aggregateResults(entries);
  if (receipts.length > 0) {
    const runTicketPath = receipts[0].run_ticket.path;
    const core = {
      schema_version: 'luca.obligation-lane-aggregation.v1',
      plan_id: 'REX-20260811-001',
      run_id: receipts[0].run_id,
      receipt_ids: receipts.map((receipt) => receipt.receipt_id).sort(),
      result,
    };
    const aggregation = { ...core, aggregation_id: `ola-${sha256(Buffer.from(stable(core)))}` };
    writeExclusive(join(dirname(runTicketPath), `aggregation-${receipts[0].run_id}.json`), jsonBytes(aggregation), 'lane aggregation');
  }
  return result;
}

function writeAtomic(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, bytes, { mode: 0o600 });
  renameSync(temporary, path);
}

function runtimeLedgerPath(root, sessionId) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', input: '' });
  if (top.status !== 0 || !top.stdout.trim() || realpathSync(top.stdout.trim()) !== realpathSync(REPO_ROOT)) {
    fail('obligation runtime cwd escapes the canonical repository');
  }
  const git = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: REPO_ROOT, encoding: 'utf8', input: '' });
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
  const index = loadIndex(INDEX_PATH);
  const prompt = String(input.prompt || input.user_prompt || input.message || '');
  const sessionId = String(input.session_id || input.sessionId || 'missing-session');
  const harness = process.env.LUCA_ACTUAL_HARNESS === 'codex' || input.harness === 'codex' ? 'codex' : 'claude';
  const event = String(input.hook_event_name || input.event || 'UserPromptSubmit');
  if (!event) fail('hook event is empty');
  const context = {
    schema_version: 'luca.obligation-task-context.v1',
    invocation_id: `${sessionId}:${sha256(Buffer.from(prompt, 'utf8')).slice(0, 24)}`,
    harness,
    lane: 'L2_LOCAL_LIVE',
    event,
    cwd: REPO_ROOT,
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
  const root = resolve(input.cwd || REPO_ROOT);
  const path = runtimeLedgerPath(root, input.session_id || input.sessionId || 'missing-session');
  if (!existsSync(path)) return { decision: 'block', reason: `Obligation ledger NOT_RUN: ${path}` };
  const ledger = validateLedger(parseJsonBytes(readFileSync(path), 'obligation ledger'));
  const result = aggregateLedger(ledger, loadIndex(INDEX_PATH));
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
  if (mode === 'receipt-producer') {
    const authorizationPath = resolve(option(args, '--authorization'));
    process.stdout.write(JSON.stringify(mintExecutionReceipt(verifyMintAuthorization(authorizationPath))));
    return 0;
  }
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
    const index = loadIndex(INDEX_PATH);
    const ledger = validateLedger(parseJsonBytes(readFileSync(path), 'obligation ledger'));
    const next = recordEvidence({
      ledger,
      index,
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
    process.stdout.write(`${aggregateLedger(ledger, loadIndex(INDEX_PATH))}\n`);
    return 0;
  }
  if (mode === 'self-test-lattice') {
    if (aggregateResults([{ class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'NOT_RUN' }]) !== 'NOT_RUN') {
      fail('NOT_RUN lattice self-test failed');
    }
    for (const className of ['S0_MACHINE_SAFETY', 'S3_HUMAN_TASTE']) {
      let rejected = false;
      try { aggregateResults([{ class: className, applicable: true, result: 'DEGRADED' }]); } catch { rejected = true; }
      if (!rejected) fail(`${className} DEGRADED lattice self-test failed`);
    }
    process.stdout.write('OBLIGATION_LATTICE_SELF_TEST_PASS\n');
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
  fail('usage: obligation-runtime.mjs receipt-producer --authorization <one-time-ticket> | <build-index|compile|record|aggregate|self-test-lattice|task-start-hook|stop-hook>');
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
