#!/usr/bin/env node

import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
const outDir = resolve(String(args['out-dir'] || 'signed-receipt-fixture'));
mkdirSync(outDir, { recursive: true, mode: 0o700 });

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const publicDer = publicKey.export({ type: 'spki', format: 'der' });
const fingerprint = sha256(publicDer);
const publicPath = resolve(outDir, 'public-key.pem');
writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });

const runId = 'run-signed-fixture-001';
const nonce = '0123456789abcdef0123456789abcdef';
const parent = 'dispatcher-fixture-001';
const child = 'child-fixture-001';
const spawn = 'spawn-fixture-001';
const role = 'plan-agent';
const target = 'dce92e6b8c91c617d086ac044e90187b68325fc6';
const inputHash = sha256('fixture input');
const outputHash = sha256('fixture output');
const definitionHash = sha256('fixture agent definition');

const payloads = [
  {
    event: 'receipt_launch', run_id: runId, nonce, parent_session_id: parent, role,
    target_commit: target, input_sha256: inputHash, agent_definition_sha256: definitionHash,
  },
  {
    event: 'child_session', run_id: runId, harness: 'codex', parent_session_id: parent,
    child_session_id: child, native_spawn_event_id: spawn, role,
  },
  {
    event: 'child_result', run_id: runId, child_session_id: child,
    native_spawn_event_id: spawn, output_sha256: outputHash, status: 'DONE',
  },
];

let previous = '0'.repeat(64);
const eventHashes = [];
const events = payloads.map((payload, index) => {
  const eventHash = sha256(Buffer.from(canonical(payload)));
  const message = `${index + 1}\n${previous}\n${eventHash}`;
  const signature = sign(null, Buffer.from(message), privateKey).toString('base64');
  const event = {
    ...payload,
    attestation: {
      seq: index + 1,
      prev_hash: previous,
      event_hash: eventHash,
      signature_ed25519: signature,
    },
  };
  eventHashes.push(eventHash);
  previous = eventHash;
  return event;
});

const logText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
const logPath = resolve(outDir, 'native-log.jsonl');
writeFileSync(logPath, logText, { mode: 0o600 });

const started = new Date(Date.now() - 1000);
const finished = new Date();
const expires = new Date(Date.now() + 10 * 60 * 1000);
const receipt = {
  schema_version: '1.0.0',
  issuer: 'luca-agent-launcher',
  harness: 'codex',
  run_id: runId,
  nonce,
  parent_session_id: parent,
  child_session_id: child,
  role,
  target_commit: target,
  input_sha256: inputHash,
  output_sha256: outputHash,
  started_at: started.toISOString(),
  finished_at: finished.toISOString(),
  expires_at: expires.toISOString(),
  status: 'DONE',
  source_log_path: 'native-log.jsonl',
  source_log_sha256: sha256(Buffer.from(logText)),
  agent_definition_sha256: definitionHash,
  native_spawn_event_id: spawn,
  event_chain_sha256: sha256(Buffer.from(eventHashes.join('\n'))),
  signing_key_fingerprint: fingerprint,
};
receipt.signature_ed25519 = sign(null, Buffer.from(canonical(receipt)), privateKey).toString('base64');
const receiptPath = resolve(outDir, 'receipt.json');
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });

process.stdout.write(`${JSON.stringify({ receipt: receiptPath, public_key: publicPath, trusted_fingerprint: fingerprint })}\n`);
