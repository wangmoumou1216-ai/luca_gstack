#!/usr/bin/env node

import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const fail = (reason, details = {}) => {
  process.stdout.write(`${JSON.stringify({ status: 'FAIL', exit: 42, reason, ...details })}\n`);
  process.exitCode = 42;
};

const pass = (receipt) => {
  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    harness: receipt.harness,
    role: receipt.role,
    run_id: receipt.run_id,
    child_session_id: receipt.child_session_id,
  })}\n`);
};

function argsOf(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    out[k.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label} is not readable JSON`, { path, error: error.message });
    return null;
  }
}

function parseJsonl(text) {
  const events = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    try {
      events.push(JSON.parse(raw));
    } catch (error) {
      fail('native log is not strict JSONL', { line: index + 1, error: error.message });
      return null;
    }
  }
  return events;
}

const args = argsOf(process.argv);
if (!args.receipt) {
  fail('missing --receipt');
} else {
  const receiptPath = resolve(String(args.receipt));
  const receipt = parseJson(receiptPath, 'receipt');
  if (receipt) {
    const required = [
      'schema_version', 'issuer', 'harness', 'run_id', 'nonce', 'parent_session_id',
      'child_session_id', 'role', 'target_commit', 'input_sha256', 'output_sha256',
      'started_at', 'finished_at', 'expires_at', 'status', 'source_log_path',
      'source_log_sha256', 'agent_definition_sha256', 'native_spawn_event_id',
      'event_chain_sha256', 'signing_key_fingerprint', 'signature_ed25519',
    ];
    const missing = required.filter((key) => receipt[key] === undefined || receipt[key] === null || receipt[key] === '');
    if (missing.length) {
      fail('receipt is missing required fields', { missing });
    } else if (receipt.schema_version !== '1.0.0' || receipt.issuer !== 'luca-agent-launcher') {
      fail('untrusted receipt issuer or schema', {
        schema_version: receipt.schema_version,
        issuer: receipt.issuer,
      });
    } else if (!['claude', 'codex'].includes(receipt.harness)) {
      fail('unsupported harness', { harness: receipt.harness });
    } else if (!['plan-agent', 'work-agent', 'oracle', 'quality-gate'].includes(receipt.role)) {
      fail('unsupported role', { role: receipt.role });
    } else if (receipt.parent_session_id === receipt.child_session_id) {
      fail('parent and child session IDs are identical');
    } else {
      const hex40 = /^[0-9a-f]{40}$/;
      const hex64 = /^[0-9a-f]{64}$/;
      const digestFields = [
        'input_sha256', 'output_sha256', 'source_log_sha256', 'agent_definition_sha256',
        'event_chain_sha256', 'signing_key_fingerprint',
      ];
      if (!hex40.test(receipt.target_commit) || digestFields.some((key) => !hex64.test(receipt[key]))) {
        fail('commit or digest has invalid shape');
      } else if (!/^[0-9a-f]{32,128}$/.test(receipt.nonce)) {
        fail('nonce has invalid shape');
      } else {
        const started = Date.parse(receipt.started_at);
        const finished = Date.parse(receipt.finished_at);
        const expires = Date.parse(receipt.expires_at);
        const at = args.at ? Date.parse(String(args.at)) : Date.now();
        if ([started, finished, expires, at].some(Number.isNaN)) {
          fail('receipt contains an invalid timestamp');
        } else if (!(started <= finished && finished < expires)) {
          fail('receipt timestamp order is invalid');
        } else if (at >= expires) {
          fail('receipt is expired', { expires_at: receipt.expires_at });
        } else if (!args['public-key'] || !args['trusted-fingerprint']) {
          fail('missing out-of-band --public-key or --trusted-fingerprint');
        } else {
          let publicKey;
          let actualFingerprint;
          try {
            publicKey = createPublicKey(readFileSync(resolve(String(args['public-key']))));
            actualFingerprint = sha256(publicKey.export({ type: 'spki', format: 'der' }));
          } catch (error) {
            fail('public key is unreadable', { error: error.message });
          }
          if (publicKey && (actualFingerprint !== String(args['trusted-fingerprint'])
            || actualFingerprint !== receipt.signing_key_fingerprint)) {
            fail('receipt signing key does not match the out-of-band trust anchor', {
              actual: actualFingerprint,
              trusted: String(args['trusted-fingerprint']),
              receipt: receipt.signing_key_fingerprint,
            });
          }
          if (publicKey) {
            const unsignedReceipt = { ...receipt };
            delete unsignedReceipt.signature_ed25519;
            const validReceiptSignature = verifySignature(
              null,
              Buffer.from(canonical(unsignedReceipt)),
              publicKey,
              Buffer.from(receipt.signature_ed25519, 'base64'),
            );
            if (!validReceiptSignature) fail('receipt Ed25519 signature is invalid');
          }
          if (process.exitCode) {
            // A trust failure must stop before native-log evaluation.
          } else {
          const logArg = args['native-log'] || receipt.source_log_path;
          const logPath = isAbsolute(String(logArg))
            ? resolve(String(logArg))
            : resolve(dirname(receiptPath), String(logArg));
          let logBytes;
          try {
            logBytes = readFileSync(logPath);
          } catch (error) {
            fail('native log is unreadable', { log_path: logPath, error: error.message });
          }
          if (logBytes) {
            const actualLogHash = sha256(logBytes);
            if (actualLogHash !== receipt.source_log_sha256) {
              fail('native log hash mismatch', {
                expected: receipt.source_log_sha256,
                actual: actualLogHash,
              });
            } else {
              if (args['native-log']) {
                try {
                  const declared = isAbsolute(receipt.source_log_path)
                    ? realpathSync(receipt.source_log_path)
                    : realpathSync(resolve(dirname(receiptPath), receipt.source_log_path));
                  if (declared !== realpathSync(logPath)) {
                    fail('receipt points at a different native log');
                  }
                } catch (error) {
                  fail('native log path cannot be canonicalized', { error: error.message });
                }
              }
              if (!process.exitCode) {
                const events = parseJsonl(logBytes.toString('utf8'));
                if (events) {
                  const attested = [];
                  let previous = '0'.repeat(64);
                  for (let index = 0; index < events.length; index += 1) {
                    const event = events[index];
                    const attestation = event.attestation;
                    const payload = { ...event };
                    delete payload.attestation;
                    const eventHash = sha256(Buffer.from(canonical(payload)));
                    const signatureMessage = `${index + 1}\n${previous}\n${eventHash}`;
                    const valid = attestation
                      && attestation.seq === index + 1
                      && attestation.prev_hash === previous
                      && attestation.event_hash === eventHash
                      && verifySignature(
                        null,
                        Buffer.from(signatureMessage),
                        publicKey,
                        Buffer.from(attestation.signature_ed25519 || '', 'base64'),
                      );
                    if (!valid) {
                      fail('native event attestation chain is invalid', { event_index: index + 1 });
                      break;
                    }
                    attested.push(eventHash);
                    previous = eventHash;
                  }
                  if (!process.exitCode) {
                    const chainHash = sha256(Buffer.from(attested.join('\n')));
                    if (chainHash !== receipt.event_chain_sha256) {
                      fail('native event-chain digest mismatch', { expected: receipt.event_chain_sha256, actual: chainHash });
                    }
                  }
                  const launch = events.find((e) => e.event === 'receipt_launch'
                    && e.run_id === receipt.run_id
                    && e.nonce === receipt.nonce
                    && e.parent_session_id === receipt.parent_session_id
                    && e.role === receipt.role
                    && e.target_commit === receipt.target_commit
                    && e.input_sha256 === receipt.input_sha256
                    && e.agent_definition_sha256 === receipt.agent_definition_sha256);
                  const child = events.find((e) => e.event === 'child_session'
                    && e.run_id === receipt.run_id
                    && e.child_session_id === receipt.child_session_id
                    && e.parent_session_id === receipt.parent_session_id
                    && e.native_spawn_event_id === receipt.native_spawn_event_id
                    && e.role === receipt.role
                    && e.harness === receipt.harness);
                  const result = events.find((e) => e.event === 'child_result'
                    && e.run_id === receipt.run_id
                    && e.child_session_id === receipt.child_session_id
                    && e.native_spawn_event_id === receipt.native_spawn_event_id
                    && e.output_sha256 === receipt.output_sha256
                    && e.status === receipt.status);
                  if (!process.exitCode && (!launch || !child || !result)) {
                    fail('native log does not back every receipt claim', {
                      launch: Boolean(launch), child: Boolean(child), result: Boolean(result),
                    });
                  } else if (!process.exitCode) {
                    pass(receipt);
                  }
                }
              }
            }
          }
          }
        }
      }
    }
  }
}
