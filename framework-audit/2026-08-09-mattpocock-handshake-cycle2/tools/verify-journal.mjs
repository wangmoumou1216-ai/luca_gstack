#!/usr/bin/env node

import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

function finish(status, exit, reason, extra = {}) {
  process.stdout.write(`${JSON.stringify({ status, exit, reason, ...extra })}\n`);
  process.exitCode = exit;
}

function same(a, b) {
  return canonical(a) === canonical(b);
}

const args = argsOf(process.argv);
const requiredArgs = ['fixture', 'trust-bundle', 'pre-h4-public-key', 'recovery-public-key'];
const missingArgs = requiredArgs.filter((key) => !args[key]);
if (missingArgs.length) {
  finish('FAIL', 51, 'missing out-of-band journal verification inputs', { missing_args: missingArgs });
} else {
  let journal;
  let trust;
  let preKey;
  let recoveryKey;
  try {
    journal = JSON.parse(readFileSync(resolve(String(args.fixture)), 'utf8'));
    trust = JSON.parse(readFileSync(resolve(String(args['trust-bundle'])), 'utf8'));
    preKey = createPublicKey(readFileSync(resolve(String(args['pre-h4-public-key']))));
    recoveryKey = createPublicKey(readFileSync(resolve(String(args['recovery-public-key']))));
  } catch (error) {
    finish('FAIL', 51, 'journal, trust bundle, or public key is unreadable', { error: error.message });
  }

  if (journal && trust && preKey && recoveryKey) {
    const preFingerprint = sha256(preKey.export({ type: 'spki', format: 'der' }));
    const recoveryFingerprint = sha256(recoveryKey.export({ type: 'spki', format: 'der' }));
    const required = [
      'schema_version', 'transaction_id', 'target_commit', 'initial_repo_head',
      'status', 'trust_bundle', 'events', 'chain_head_sha256',
    ];
    const missing = required.filter((key) => journal[key] === undefined);
    if (missing.length) {
      finish('FAIL', 51, 'journal missing required fields', { missing });
    } else if (journal.schema_version !== '3.0.0') {
      finish('FAIL', 51, 'unsupported journal schema', { observed: journal.schema_version });
    } else if (!same(journal.trust_bundle, trust)) {
      finish('FAIL', 51, 'journal trust bundle differs from the out-of-band H4 bundle');
    } else if (
      trust.transaction_id !== journal.transaction_id
      || trust.target_commit !== journal.target_commit
      || trust.pre_h4_signer?.algorithm !== 'Ed25519'
      || trust.recovery_signer?.algorithm !== 'ECDSA_P256_SHA256'
      || trust.pre_h4_signer?.fingerprint !== preFingerprint
      || trust.recovery_signer?.fingerprint !== recoveryFingerprint
    ) {
      finish('FAIL', 51, 'public keys or transaction identity differ from H4 trust bundle', {
        pre_fingerprint: preFingerprint,
        recovery_fingerprint: recoveryFingerprint,
      });
    } else if (
      trust.recovery_helper?.key_storage !== 'SECURE_ENCLAVE_KEYCHAIN'
      || !/^[0-9a-f]{64}$/.test(String(trust.recovery_helper?.binary_sha256 || ''))
      || !String(trust.recovery_helper?.designated_requirement || '')
      || !String(trust.recovery_helper?.durable_ledger_id || '')
    ) {
      finish('FAIL', 51, 'H4 bundle lacks a pinned durable recovery-helper identity');
    } else if (!Array.isArray(journal.events) || !journal.events.length) {
      finish('FAIL', 51, 'journal events are absent');
    } else {
      let previous = '0'.repeat(64);
      const errors = [];
      for (let index = 0; index < journal.events.length; index += 1) {
        const event = journal.events[index];
        const sequence = index + 1;
        const core = { ...event };
        delete core.prev_hash;
        delete core.event_hash;
        delete core.signature;
        const eventHash = sha256(Buffer.from(`${previous}\n${canonical(core)}`));
        const message = `${sequence}\n${previous}\n${eventHash}`;
        const isPre = event.signer_epoch === 'PRE_H4';
        const expectedAlgorithm = isPre ? 'Ed25519' : 'ECDSA_P256_SHA256';
        const expectedFingerprint = isPre ? preFingerprint : recoveryFingerprint;
        const key = isPre ? preKey : recoveryKey;
        let signatureOk = false;
        try {
          signatureOk = verifySignature(
            isPre ? null : 'sha256',
            Buffer.from(message),
            key,
            Buffer.from(event.signature || '', 'base64'),
          );
        } catch {
          signatureOk = false;
        }
        if (event.sequence !== sequence) errors.push(`sequence:${sequence}`);
        if (event.prev_hash !== previous) errors.push(`prev_hash:${sequence}`);
        if (event.event_hash !== eventHash) errors.push(`event_hash:${sequence}`);
        if (event.signature_algorithm !== expectedAlgorithm) errors.push(`signature_algorithm:${sequence}`);
        if (event.signer_fingerprint !== expectedFingerprint) errors.push(`signer_fingerprint:${sequence}`);
        if (!signatureOk) errors.push(`signature:${sequence}`);
        if (Date.parse(event.started_at) > Date.parse(event.finished_at)) errors.push(`time_order:${sequence}`);
        previous = eventHash;
      }

      if (previous !== journal.chain_head_sha256) errors.push('chain_head');
      if (errors.length) {
        finish('FAIL', 51, 'journal signature/hash chain is invalid', { errors });
      } else {
        const events = journal.events;
        const forward = events.filter((event) => event.event_type === 'FORWARD');
        const rollback = events.filter((event) => event.event_type === 'ROLLBACK');
        const cutoverClaims = events.filter((event) => event.event_type === 'CUTOVER_CLAIM');
        const recoveryClaims = events.filter((event) => event.event_type === 'RECOVERY_CLAIM');
        const forwardStates = forward.map((event) => event.state);
        const prefix = ORDER.slice(0, forwardStates.length);
        const sequenceErrors = [];
        if (!same(forwardStates, prefix)) sequenceErrors.push('forward_not_prefix');

        const repoCommitted = forward.find((event) => event.state === 'REPO_COMMITTED');
        const firstExposure = forward.find((event) => event.state === 'GLOBAL_SWAPPED');
        const h4 = trust.h4_anchor || {};
        const h4Valid = firstExposure
          ? repoCommitted
            && h4.sequence === repoCommitted.sequence
            && h4.chain_head_sha256 === repoCommitted.event_hash
            && typeof h4.approved_at === 'string'
          : h4.sequence === 0
            && h4.chain_head_sha256 === '0'.repeat(64)
            && h4.approved_at === null;
        if (!h4Valid) sequenceErrors.push('invalid_h4_anchor');

        for (const event of forward) {
          const index = ORDER.indexOf(event.state);
          const expectedEpoch = index <= ORDER.indexOf('REPO_COMMITTED') ? 'PRE_H4' : 'POST_H4';
          if (event.signer_epoch !== expectedEpoch) sequenceErrors.push(`wrong_epoch:${event.state}`);
          if (event.claim_of_head !== null) sequenceErrors.push(`forward_claim:${event.state}`);
        }

        if (firstExposure) {
          const claim = cutoverClaims[0];
          const repoIndex = events.indexOf(repoCommitted);
          if (
            cutoverClaims.length !== 1
            || !claim
            || events.indexOf(claim) !== repoIndex + 1
            || claim.state !== 'REPO_COMMITTED'
            || claim.signer_epoch !== 'POST_H4'
            || claim.result !== 'PASS'
            || claim.prev_hash !== h4.chain_head_sha256
            || claim.claim_of_head !== h4.chain_head_sha256
          ) sequenceErrors.push('invalid_cutover_claim');
        } else if (cutoverClaims.length) {
          sequenceErrors.push('cutover_claim_without_exposure');
        }

        if (recoveryClaims.length > 1) sequenceErrors.push('multiple_recovery_claims');
        if (recoveryClaims.length === 1) {
          const claim = recoveryClaims[0];
          const claimIndex = events.indexOf(claim);
          if (
            !cutoverClaims.length
            || claim.signer_epoch !== 'POST_H4'
            || claim.result !== 'PASS'
            || claim.claim_of_head !== claim.prev_hash
            || events.slice(claimIndex + 1).some((event) => event.event_type === 'FORWARD')
          ) sequenceErrors.push('invalid_recovery_claim');
        }

        const firstRollbackIndex = events.findIndex((event) => event.event_type === 'ROLLBACK');
        if (
          firstRollbackIndex >= 0
          && events.slice(firstRollbackIndex).some((event) => ['FORWARD', 'CUTOVER_CLAIM'].includes(event.event_type))
        ) sequenceErrors.push('forward_after_rollback');
        if (rollback.some((event) => event.claim_of_head !== null)) sequenceErrors.push('rollback_claim_field');
        if (sequenceErrors.length) {
          finish('FAIL', 51, 'journal signer epochs or transition order are invalid', { errors: sequenceErrors });
        } else {
          const failures = forward.filter((event) => event.result === 'FAIL');
          const casMismatches = forward.flatMap((event) => (event.cas || [])
            .filter((entry) => entry.expected !== entry.observed)
            .map((entry) => ({ state: event.state, ...entry })));
          const expected = String(args.expect || '');
          if (journal.status === 'VERIFIED') {
            if (!same(forwardStates, ORDER) || failures.length || rollback.length || recoveryClaims.length) {
              finish('FAIL', 51, 'VERIFIED journal is incomplete or contains failure/recovery');
            } else {
              finish('VERIFIED', expected && expected !== 'VERIFIED' ? 51 : 0, 'two-epoch signed activation DAG is complete');
            }
          } else if (journal.status === 'BLOCKED') {
            if (!casMismatches.length || firstExposure || rollback.length || cutoverClaims.length) {
              finish('FAIL', 51, 'BLOCKED journal did not stop before H4/live exposure', { cas_mismatches: casMismatches });
            } else if (expected && expected !== 'BLOCKED') {
              finish('FAIL', 51, 'status differs from --expect', { expected, actual: journal.status });
            } else {
              finish('BLOCKED', 0, 'signed CAS mismatch stopped activation before H4/live exposure', { cas_mismatches: casMismatches });
            }
          } else if (journal.status === 'ROLLED_BACK') {
            const crashRecovery = recoveryClaims.length === 1;
            const reached = [...forwardStates].reverse();
            const rolled = rollback.map((event) => event.state);
            const commandsMatch = rollback.every((event) => {
              const source = forward.find((candidate) => candidate.state === event.state);
              return source && source.compensation_command_id === event.command_id && event.result === 'PASS';
            });
            if ((!crashRecovery && failures.length !== 1) || (crashRecovery && failures.length > 1)) {
              finish('FAIL', 51, 'rollback has neither one live failure nor one authenticated recovery claim');
            } else if (!same(reached, rolled) || !commandsMatch) {
              finish('FAIL', 51, 'rollback did not execute exact signed reverse DAG', { reached, rolled, commandsMatch });
            } else if (expected && expected !== 'ROLLED_BACK') {
              finish('FAIL', 51, 'status differs from --expect', { expected, actual: journal.status });
            } else {
              finish('ROLLED_BACK', 0, crashRecovery
                ? 'authenticated recovery claim completed the signed reverse DAG'
                : 'signed reverse-DAG compensation is complete');
            }
          } else if (journal.status === 'BLOCKED_MANUAL_RECOVERY') {
            if (!recoveryClaims.length || same(rollback.map((event) => event.state), [...forwardStates].reverse())) {
              finish('FAIL', 51, 'manual-recovery status lacks an authenticated incomplete recovery');
            } else if (expected && expected !== 'BLOCKED_MANUAL_RECOVERY') {
              finish('FAIL', 51, 'status differs from --expect', { expected, actual: journal.status });
            } else {
              finish('BLOCKED_MANUAL_RECOVERY', 0, 'authenticated recovery stopped without claiming VERIFIED');
            }
          } else {
            finish('FAIL', 51, 'unsupported terminal journal status', { status: journal.status });
          }
        }
      }
    }
  }
}
