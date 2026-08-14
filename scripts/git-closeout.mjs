#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  GitCloseoutError,
  jsonBytes,
  prepareLocalDescriptor,
  prepareRemoteDescriptor,
  readLocalDescriptor,
  readRemoteDescriptor,
  readRemoteReceipt,
  recordRemoteReadback,
  remoteExecutionToken,
  verifyLocalCommit,
  verifyLocalIndex,
  verifyPrePush,
  verifyRemotePost,
  verifyRemotePre,
  writeExclusive,
} from '../.claude/hooks/lib/git-closeout-contract.mjs';
import { withoutLocalGitEnv } from '../.claude/hooks/lib/git-env.mjs';
import {
  recordHumanGateResult,
  verifyHumanGateApproval,
  verifyHumanGateChain,
} from '../.claude/hooks/lib/human-gate-contract.mjs';

const CONTRACTS = {
  'prepare-local': {
    required: ['repo', 'patch', 'out', 'plan-id', 'created-at'],
  },
  'verify-local': {
    required: ['repo', 'patch', 'descriptor'],
  },
  'verify-local-commit': {
    required: ['repo', 'descriptor', 'commit'],
  },
  'prepare-remote': {
    required: ['repo', 'remote', 'refspec', 'out', 'plan-id', 'created-at', 'expires-at'],
  },
  'verify-remote-pre': {
    required: ['repo', 'descriptor'],
  },
  'execute-remote': {
    required: [
      'repo', 'descriptor', 'out', 'gate-root', 'proposal-id', 'plan',
      'envelope', 'writer',
    ],
  },
  'verify-remote-post': {
    required: [
      'repo', 'descriptor', 'receipt', 'gate-root', 'proposal-id', 'plan',
      'envelope', 'writer',
    ],
  },
  'pre-push': {
    required: [
      'repo', 'descriptor', 'remote-name', 'remote-url', 'gate-root',
      'proposal-id', 'plan', 'envelope', 'writer', 'execution-token',
    ],
  },
};

function gateInputs(options, descriptorBytes) {
  return {
    receiptRoot: options['gate-root'],
    secureWriterPath: resolve(options.writer),
    gate: 'G-REMOTE',
    proposalId: options['proposal-id'],
    planBytes: readFileSync(resolve(options.plan)),
    payloadBytes: descriptorBytes,
    executionEnvelopeBytes: readFileSync(resolve(options.envelope)),
  };
}

function reject(message, code = 'GIT_CLOSEOUT_REJECTED') {
  process.stderr.write(`${code} ${message}\n`);
  process.exit(2);
}

function parse() {
  const mode = process.argv[2] || '';
  const contract = CONTRACTS[mode];
  if (!contract) reject(`unknown mode: ${mode || '<missing>'}`);
  const allowed = new Set(contract.required);
  const options = {};
  for (let index = 3; index < process.argv.length; index += 1) {
    const raw = process.argv[index];
    if (!raw.startsWith('--')) reject(`unexpected argument: ${raw}`);
    const key = raw.slice(2);
    const value = process.argv[++index];
    if (!allowed.has(key) || Object.hasOwn(options, key) || value === undefined || value.startsWith('--')) {
      reject(`invalid option: --${key}`);
    }
    options[key] = value;
  }
  for (const key of contract.required) if (!Object.hasOwn(options, key)) reject(`missing --${key}`);
  return { mode, options };
}

try {
  const { mode, options } = parse();
  if (mode === 'prepare-local') {
    const value = prepareLocalDescriptor({
      repo: options.repo,
      patchBytes: readFileSync(resolve(options.patch)),
      planId: options['plan-id'],
      createdAt: options['created-at'],
    });
    writeExclusive(options.out, value);
    process.stdout.write(`GIT_LOCAL_DESCRIPTOR_CREATED ${value.descriptor_id} ${value.expected_index_tree}\n`);
  } else if (mode === 'verify-local') {
    const descriptor = readLocalDescriptor(options.descriptor).value;
    const result = verifyLocalIndex({
      repo: options.repo,
      descriptor,
      patchBytes: readFileSync(resolve(options.patch)),
    });
    process.stdout.write(`GIT_LOCAL_INDEX_PASS ${descriptor.descriptor_id} ${result.index_tree}\n`);
  } else if (mode === 'verify-local-commit') {
    const descriptor = readLocalDescriptor(options.descriptor).value;
    const result = verifyLocalCommit({ repo: options.repo, descriptor, commit: options.commit });
    process.stdout.write(`GIT_LOCAL_COMMIT_PASS ${descriptor.descriptor_id} ${result.commit} ${result.tree}\n`);
  } else if (mode === 'prepare-remote') {
    const value = prepareRemoteDescriptor({
      repo: options.repo,
      remote: options.remote,
      refspec: options.refspec,
      planId: options['plan-id'],
      createdAt: options['created-at'],
      expiresAt: options['expires-at'],
    });
    writeExclusive(options.out, value);
    process.stdout.write(`GIT_REMOTE_DESCRIPTOR_CREATED ${value.descriptor_id} ${value.before} ${value.after}\n`);
  } else if (mode === 'verify-remote-pre') {
    const descriptor = readRemoteDescriptor(options.descriptor).value;
    const result = verifyRemotePre({ repo: options.repo, descriptor });
    process.stdout.write(`GIT_REMOTE_PRE_PASS ${descriptor.descriptor_id} ${result.before} ${result.after}\n`);
  } else if (mode === 'execute-remote') {
    const descriptor = readRemoteDescriptor(options.descriptor);
    verifyRemotePre({ repo: options.repo, descriptor: descriptor.value });
    const gate = verifyHumanGateApproval(gateInputs(options, descriptor.bytes));
    const token = remoteExecutionToken(descriptor.bytes, gate);
    const pushed = spawnSync('git', [
      '-C', descriptor.value.repository.root, 'push', '--porcelain', '--',
      descriptor.value.remote, descriptor.value.refspec,
    ], {
      encoding: 'utf8',
      env: {
        ...withoutLocalGitEnv(),
        GIT_CLOSEOUT_DESCRIPTOR: resolve(options.descriptor),
        GIT_CLOSEOUT_GATE_ROOT: options['gate-root'],
        GIT_CLOSEOUT_GATE_PROPOSAL_ID: options['proposal-id'],
        GIT_CLOSEOUT_GATE_PLAN: resolve(options.plan),
        GIT_CLOSEOUT_GATE_ENVELOPE: resolve(options.envelope),
        GIT_CLOSEOUT_GATE_WRITER: resolve(options.writer),
        GIT_CLOSEOUT_EXECUTION_TOKEN: token,
      },
      maxBuffer: 32 * 1024 * 1024,
    });
    if (pushed.error || pushed.status !== 0) {
      reject(String(pushed.error?.message || pushed.stderr || pushed.stdout || 'controlled push failed').trim(), 'REMOTE_EXECUTION_REJECTED');
    }
    const observedAt = new Date().toISOString();
    const receipt = recordRemoteReadback({
      repo: options.repo,
      descriptor: descriptor.value,
      descriptorBytes: descriptor.bytes,
      observedAt,
      gateApproval: gate,
    });
    writeExclusive(options.out, receipt);
    const receiptBytes = jsonBytes(receipt);
    const result = recordHumanGateResult({
      ...gateInputs(options, descriptor.bytes),
      readbackBytes: receiptBytes,
      postStateSha256: receipt.readback_sha256,
      observedAt,
    });
    process.stdout.write(
      `GIT_REMOTE_EXECUTED ${descriptor.value.descriptor_id} ${descriptor.value.before} ${descriptor.value.after}`
      + ` ${receipt.receipt_id} ${result.result.result_id}\n`,
    );
  } else if (mode === 'verify-remote-post') {
    const descriptor = readRemoteDescriptor(options.descriptor);
    const receipt = readRemoteReceipt(options.receipt);
    const chain = verifyHumanGateChain({
      ...gateInputs(options, descriptor.bytes),
      readbackBytes: receipt.bytes,
      expectedPostStateSha256: receipt.value.readback_sha256,
    });
    const result = verifyRemotePost({
      repo: options.repo,
      descriptor: descriptor.value,
      descriptorBytes: descriptor.bytes,
      receipt: receipt.value,
      gateApproval: chain,
    });
    process.stdout.write(`GIT_REMOTE_POST_PASS ${result.receipt_id} ${result.after} ${chain.result.result_id}\n`);
  } else if (mode === 'pre-push') {
    const descriptor = readRemoteDescriptor(options.descriptor);
    const result = verifyPrePush({
      repo: options.repo,
      descriptor: descriptor.value,
      descriptorBytes: descriptor.bytes,
      remoteName: options['remote-name'],
      remoteUrlArg: options['remote-url'],
      pushInput: readFileSync(0, 'utf8'),
      gateRoot: options['gate-root'],
      proposalId: options['proposal-id'],
      planBytes: readFileSync(resolve(options.plan)),
      envelopeBytes: readFileSync(resolve(options.envelope)),
      writerPath: options.writer,
      executionToken: options['execution-token'],
    });
    process.stdout.write(`G_REMOTE_PRE_PUSH_PASS ${descriptor.value.descriptor_id} ${result.proposal_sha256} ${result.binding_sha256}\n`);
  }
} catch (error) {
  if (error instanceof GitCloseoutError) reject(error.message, error.code);
  reject(String(error?.message || error));
}
