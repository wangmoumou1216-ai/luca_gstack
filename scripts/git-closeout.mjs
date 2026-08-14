#!/usr/bin/env node
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
  verifyLocalCommit,
  verifyLocalIndex,
  verifyPrePush,
  verifyRemotePost,
  verifyRemotePre,
  writeExclusive,
} from '../.claude/hooks/lib/git-closeout-contract.mjs';

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
  'record-remote': {
    required: ['repo', 'descriptor', 'out', 'observed-at'],
  },
  'verify-remote-post': {
    required: ['repo', 'descriptor', 'receipt'],
  },
  'pre-push': {
    required: [
      'repo', 'descriptor', 'remote-name', 'remote-url', 'gate-root',
      'proposal-id', 'plan', 'envelope', 'writer',
    ],
  },
};

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
  } else if (mode === 'record-remote') {
    const loaded = readRemoteDescriptor(options.descriptor);
    const receipt = recordRemoteReadback({
      repo: options.repo,
      descriptor: loaded.value,
      descriptorBytes: loaded.bytes,
      observedAt: options['observed-at'],
    });
    writeExclusive(options.out, receipt);
    process.stdout.write(`GIT_REMOTE_RECEIPT_CREATED ${receipt.receipt_id} ${receipt.after}\n`);
  } else if (mode === 'verify-remote-post') {
    const descriptor = readRemoteDescriptor(options.descriptor);
    const receipt = readRemoteReceipt(options.receipt).value;
    const result = verifyRemotePost({
      repo: options.repo,
      descriptor: descriptor.value,
      descriptorBytes: descriptor.bytes,
      receipt,
    });
    process.stdout.write(`GIT_REMOTE_POST_PASS ${result.receipt_id} ${result.after}\n`);
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
    });
    process.stdout.write(`G_REMOTE_PRE_PUSH_PASS ${descriptor.value.descriptor_id} ${result.proposal_sha256} ${result.binding_sha256}\n`);
  }
} catch (error) {
  if (error instanceof GitCloseoutError) reject(error.message, error.code);
  reject(String(error?.message || error));
}
