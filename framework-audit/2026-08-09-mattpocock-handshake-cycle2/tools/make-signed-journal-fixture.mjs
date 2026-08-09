#!/usr/bin/env node

import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ORDER = [
  'PREPARED',
  'GLOBAL_STAGED',
  'REPO_COMMITTED',
  'GLOBAL_SWAPPED',
  'LEDGER_COMMITTED',
  'VERIFIED',
];

function argsOf(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const args = argsOf(process.argv);
if (!args.scenario || !args['out-dir']) {
  process.stderr.write('usage: make-signed-journal-fixture --scenario <json> --out-dir <dir>\n');
  process.exit(2);
}

const scenario = JSON.parse(readFileSync(resolve(String(args.scenario)), 'utf8'));
const outDir = resolve(String(args['out-dir']));
mkdirSync(outDir, { recursive: true, mode: 0o700 });

const preKeys = generateKeyPairSync('ed25519');
const recoveryKeys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const preDer = preKeys.publicKey.export({ type: 'spki', format: 'der' });
const recoveryDer = recoveryKeys.publicKey.export({ type: 'spki', format: 'der' });
const preFingerprint = sha256(preDer);
const recoveryFingerprint = sha256(recoveryDer);

const prePublicPath = resolve(outDir, 'pre-h4-public-key.pem');
const recoveryPublicPath = resolve(outDir, 'recovery-public-key.pem');
writeFileSync(prePublicPath, preKeys.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
writeFileSync(recoveryPublicPath, recoveryKeys.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });

let previous = '0'.repeat(64);
const events = [];

function append(core, epoch) {
  const sequence = events.length + 1;
  const isPre = epoch === 'PRE_H4';
  const enriched = {
    sequence,
    ...core,
    signer_epoch: epoch,
    signer_fingerprint: isPre ? preFingerprint : recoveryFingerprint,
    signature_algorithm: isPre ? 'Ed25519' : 'ECDSA_P256_SHA256',
  };
  const eventHash = sha256(Buffer.from(`${previous}\n${canonical(enriched)}`));
  const message = `${sequence}\n${previous}\n${eventHash}`;
  const signature = sign(
    isPre ? null : 'sha256',
    Buffer.from(message),
    isPre ? preKeys.privateKey : recoveryKeys.privateKey,
  ).toString('base64');
  const event = {
    ...enriched,
    prev_hash: previous,
    event_hash: eventHash,
    signature,
  };
  events.push(event);
  previous = eventHash;
  return event;
}

function forwardCore(step) {
  return {
    event_type: 'FORWARD',
    state: step.state,
    claim_of_head: null,
    started_at: step.started_at,
    finished_at: step.finished_at,
    result: step.result,
    cas: step.cas || [],
    artifacts: step.artifacts || [],
    command_id: `FORWARD_${step.state}`,
    compensation_command_id: step.compensation?.command_id || `COMPENSATE_${step.state}`,
    expected_state: `forward ${step.state}`,
    verified_state: step.result === 'PASS' ? `${step.state} committed` : `${step.state} failed`,
  };
}

const steps = scenario.steps || [];
const preSteps = steps.filter((step) => ORDER.indexOf(step.state) <= ORDER.indexOf('REPO_COMMITTED'));
const postSteps = steps.filter((step) => ORDER.indexOf(step.state) > ORDER.indexOf('REPO_COMMITTED'));
for (const step of preSteps) append(forwardCore(step), 'PRE_H4');

const exposes = postSteps.some((step) => step.state === 'GLOBAL_SWAPPED');
const repoCommitted = events.find((event) => event.event_type === 'FORWARD' && event.state === 'REPO_COMMITTED');
if (exposes && (!repoCommitted || repoCommitted.result !== 'PASS')) {
  throw new Error('post-H4 fixture requires a successful REPO_COMMITTED event');
}

const h4Anchor = exposes
  ? {
      sequence: repoCommitted.sequence,
      chain_head_sha256: repoCommitted.event_hash,
      approved_at: new Date(Date.parse(repoCommitted.finished_at) + 100).toISOString(),
      permitted_dag_sha256: sha256(canonical({ order: ORDER, transaction_id: scenario.transaction_id })),
    }
  : {
      sequence: 0,
      chain_head_sha256: '0'.repeat(64),
      approved_at: null,
      permitted_dag_sha256: sha256(canonical({ order: ORDER, transaction_id: scenario.transaction_id })),
    };

const trustBundle = {
  transaction_id: scenario.transaction_id,
  target_commit: scenario.target_commit,
  pre_h4_signer: { algorithm: 'Ed25519', fingerprint: preFingerprint },
  recovery_signer: { algorithm: 'ECDSA_P256_SHA256', fingerprint: recoveryFingerprint },
  recovery_helper: {
    binary_sha256: sha256('fixture:code-signed-macos-recovery-helper:v1'),
    designated_requirement: 'anchor apple generic and identifier "local.luca.evolution-recovery"',
    key_storage: 'SECURE_ENCLAVE_KEYCHAIN',
    durable_ledger_id: `ACTLEDGER-${scenario.transaction_id.slice(4)}`,
  },
  h4_anchor: h4Anchor,
};

if (exposes) {
  const claimStart = new Date(Date.parse(repoCommitted.finished_at) + 200).toISOString();
  const claimFinish = new Date(Date.parse(repoCommitted.finished_at) + 300).toISOString();
  append({
    event_type: 'CUTOVER_CLAIM',
    state: 'REPO_COMMITTED',
    claim_of_head: h4Anchor.chain_head_sha256,
    started_at: claimStart,
    finished_at: claimFinish,
    result: 'PASS',
    cas: [],
    artifacts: [],
    command_id: 'RECOVERY_HELPER_CUTOVER_CLAIM',
    compensation_command_id: 'RELEASE_CUTOVER_CLAIM',
    expected_state: 'H4 trust bundle and preparation head match',
    verified_state: 'recovery helper owns the unique post-H4 sequence',
  }, 'POST_H4');
  for (const step of postSteps) append(forwardCore(step), 'POST_H4');
}

if (scenario.recovery_claim === true) {
  if (!exposes) throw new Error('recovery claim requires an H4 cutover claim');
  const last = events.at(-1);
  const claimHead = previous;
  append({
    event_type: 'RECOVERY_CLAIM',
    state: last.state,
    claim_of_head: claimHead,
    started_at: new Date(Date.parse(last.finished_at) + 1000).toISOString(),
    finished_at: new Date(Date.parse(last.finished_at) + 1100).toISOString(),
    result: 'PASS',
    cas: [],
    artifacts: [],
    command_id: 'RECOVERY_HELPER_CRASH_CLAIM',
    compensation_command_id: 'EXECUTE_REMAINING_REVERSE_DAG',
    expected_state: 'durable helper ledger head equals presented journal head',
    verified_state: 'one recovery client owns the unique continuation',
  }, 'POST_H4');
}

const rollbackBase = events.at(-1);
for (const [index, step] of (scenario.rollback_steps || []).entries()) {
  const source = steps.find((candidate) => candidate.state === step.for_state);
  append({
    event_type: 'ROLLBACK',
    state: step.for_state,
    claim_of_head: null,
    started_at: new Date(Date.parse(rollbackBase.finished_at) + (index + 1) * 1000).toISOString(),
    finished_at: new Date(Date.parse(rollbackBase.finished_at) + (index + 1) * 1000 + 500).toISOString(),
    result: step.result,
    cas: [],
    artifacts: [],
    command_id: step.command_id,
    compensation_command_id: source?.compensation?.command_id || step.command_id,
    expected_state: source?.compensation?.expected_state || 'restored',
    verified_state: step.verified_state,
  }, exposes ? 'POST_H4' : 'PRE_H4');
}

const journal = {
  schema_version: '3.0.0',
  transaction_id: scenario.transaction_id,
  target_commit: scenario.target_commit,
  initial_repo_head: scenario.initial_repo_head,
  status: scenario.status,
  trust_bundle: trustBundle,
  events,
  chain_head_sha256: events.at(-1).event_hash,
};

const journalPath = resolve(outDir, 'journal.json');
const trustPath = resolve(outDir, 'h4-trust-bundle.json');
writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 });
writeFileSync(trustPath, `${JSON.stringify(trustBundle, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  journal: journalPath,
  trust_bundle: trustPath,
  pre_h4_public_key: prePublicPath,
  recovery_public_key: recoveryPublicPath,
  pre_h4_fingerprint: preFingerprint,
  recovery_fingerprint: recoveryFingerprint,
})}\n`);
