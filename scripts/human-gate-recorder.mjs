#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  recordHumanGateApproval,
  recordHumanGateResult,
} from '../.claude/hooks/lib/human-gate-contract.mjs';

const MODES = new Set(['approve', 'result']);

function fail(message, code = 2, token = 'HUMAN_GATE_REJECTED') {
  process.stderr.write(`${token} ${message}\n`);
  process.exit(code);
}

function parseArguments(mode) {
  const boolean = new Set(['approval-stdin']);
  const allowed = {
    approve: new Set(['root', 'writer', 'gate', 'proposal-id', 'plan', 'payload', 'envelope', 'approval-stdin', 'role', 'top-level', 'event-id', 'event-created-at', 'observed-at', 'harness', 'session']),
    result: new Set(['root', 'writer', 'gate', 'proposal-id', 'plan', 'payload', 'envelope', 'readback', 'post-state-sha256', 'observed-at']),
  }[mode];
  const values = {};
  for (let index = 3; index < process.argv.length; index += 1) {
    const raw = process.argv[index];
    if (!raw.startsWith('--')) fail(`unexpected argument: ${raw}`);
    const key = raw.slice(2);
    if (!allowed.has(key) || Object.hasOwn(values, key)) fail(`unsupported or duplicate option: --${key}`);
    if (boolean.has(key)) values[key] = true;
    else {
      const value = process.argv[++index];
      if (value === undefined || value.startsWith('--')) fail(`missing value for --${key}`);
      values[key] = value;
    }
  }
  for (const key of allowed) {
    if (boolean.has(key)) continue;
    if (!Object.hasOwn(values, key)) {
      if (mode === 'approve' && ['role', 'top-level', 'event-id', 'event-created-at', 'observed-at', 'harness', 'session'].includes(key)) {
        fail('native top-level user event is unavailable', 3, 'BLOCKED_HUMAN_CHANNEL');
      }
      if (mode === 'result' && key === 'observed-at') continue;
      fail(`missing --${key}`);
    }
  }
  return values;
}

function fileBytes(path) {
  return readFileSync(resolve(path));
}

try {
  const mode = process.argv[2] || '';
  if (!MODES.has(mode)) fail('usage: human-gate-recorder.mjs <approve|result> [exact options]');
  const options = parseArguments(mode);
  if (mode === 'approve') {
    if (!options['approval-stdin']) fail('native top-level user event feed is unavailable', 3, 'BLOCKED_HUMAN_CHANNEL');
    const rawPromptBytes = readFileSync(0);
    const output = recordHumanGateApproval({
      receiptRoot: options.root,
      secureWriterPath: resolve(options.writer),
      gate: options.gate,
      proposalId: options['proposal-id'],
      planBytes: fileBytes(options.plan),
      payloadBytes: fileBytes(options.payload),
      executionEnvelopeBytes: fileBytes(options.envelope),
      rawPromptBytes,
      event: {
        role: options.role,
        top_level: options['top-level'] === 'true',
        authority: 'trusted-bootstrap-main',
        event_id: options['event-id'],
        event_created_at: options['event-created-at'],
        observed_at: options['observed-at'],
        harness: options.harness,
        session_id: options.session,
      },
    });
    process.stdout.write(`HUMAN_GATE_BINDING_CREATED ${output.binding.binding_id} ${output.bindingSha256}\n`);
    process.exit(0);
  }

  const output = recordHumanGateResult({
    receiptRoot: options.root,
    secureWriterPath: resolve(options.writer),
    gate: options.gate,
    proposalId: options['proposal-id'],
    planBytes: fileBytes(options.plan),
    payloadBytes: fileBytes(options.payload),
    executionEnvelopeBytes: fileBytes(options.envelope),
    readbackBytes: fileBytes(options.readback),
    postStateSha256: options['post-state-sha256'],
    observedAt: options['observed-at'] || new Date().toISOString(),
  });
  process.stdout.write(`HUMAN_GATE_RESULT_CREATED ${output.result.result_id} ${output.resultSha256}\n`);
} catch (error) {
  fail(String(error?.message || error));
}
