#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createHumanGateProposal,
  verifyHumanGateChain,
} from '../.claude/hooks/lib/human-gate-contract.mjs';

function fail(message) {
  process.stderr.write(`HUMAN_GATE_VERIFY_REJECTED ${message}\n`);
  process.exit(2);
}

const mode = process.argv[2] || '';
if (!['prepare', 'verify'].includes(mode)) fail('usage: verify-human-gate.mjs <prepare|verify> [exact options]');
const allowed = mode === 'prepare'
  ? new Set(['root', 'writer', 'gate', 'plan', 'payload', 'envelope', 'harness', 'session', 'created-at', 'expires-at'])
  : new Set(['root', 'writer', 'gate', 'proposal-id', 'plan', 'payload', 'envelope', 'readback', 'post-state-sha256']);
const options = {};
for (let index = 3; index < process.argv.length; index += 1) {
  const raw = process.argv[index];
  if (!raw.startsWith('--')) fail(`unexpected argument: ${raw}`);
  const key = raw.slice(2);
  const value = process.argv[++index];
  if (!allowed.has(key) || Object.hasOwn(options, key) || value === undefined || value.startsWith('--')) fail(`invalid option: --${key}`);
  options[key] = value;
}
for (const key of allowed) if (!Object.hasOwn(options, key)) fail(`missing --${key}`);

try {
  if (mode === 'prepare') {
    const prepared = createHumanGateProposal({
      receiptRoot: options.root,
      secureWriterPath: resolve(options.writer),
      gate: options.gate,
      planBytes: readFileSync(resolve(options.plan)),
      payloadBytes: readFileSync(resolve(options.payload)),
      executionEnvelopeBytes: readFileSync(resolve(options.envelope)),
      harness: options.harness,
      sessionId: options.session,
      now: options['created-at'],
      expiresAt: options['expires-at'],
    });
    process.stdout.write(`HUMAN_GATE_PROPOSAL_CREATED ${prepared.proposal.proposal_id} ${prepared.proposalSha256}\n${prepared.exactReply}\n`);
    process.exit(0);
  }
  const result = verifyHumanGateChain({
    receiptRoot: options.root,
    secureWriterPath: resolve(options.writer),
    gate: options.gate,
    proposalId: options['proposal-id'],
    planBytes: readFileSync(resolve(options.plan)),
    payloadBytes: readFileSync(resolve(options.payload)),
    executionEnvelopeBytes: readFileSync(resolve(options.envelope)),
    readbackBytes: readFileSync(resolve(options.readback)),
    expectedPostStateSha256: options['post-state-sha256'],
  });
  process.stdout.write(`HUMAN_GATE_CHAIN_PASS ${result.proposalSha256} ${result.bindingSha256} ${result.resultSha256}\n`);
} catch (error) {
  fail(String(error?.message || error));
}
