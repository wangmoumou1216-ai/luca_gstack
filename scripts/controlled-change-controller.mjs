#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  RECEIPT_STATES,
  TERMINAL_WITNESS_STATES,
  assertFreshBootstrapReceipt,
  atomicWriteJson,
  canonicalJson,
  checkManifest,
  controlRoot,
  discoverControlState,
  loadManifestFile,
  manifestSha256,
  parseCli,
  readJson,
  sha256Bytes,
  sha256File,
  stateDirFor,
  unlinkJsonCas,
  validateBoundRequired,
  witnessAnchor,
} from './controlled-change.mjs';

const GENERATION_RE = /^[A-Za-z0-9][A-Za-z0-9-]{7,127}$/;

function fail(message) {
  throw new Error(message);
}

function nowMs(options) {
  if (options.now === undefined) return Date.now();
  const value = Number(options.now);
  if (!Number.isInteger(value) || value <= 0) fail('--now must be positive epoch milliseconds');
  return value;
}

function statePaths(manifest) {
  const dir = stateDirFor(manifest.task_id, manifest.repo_realpath);
  return {
    dir,
    witness: `${dir}/required-witness.json`,
    active: `${dir}/active-context.json`,
    receipt: `${dir}/receipt.json`,
  };
}

const PREPARE_LOCK_HELPER = String.raw`
import fcntl, os, sys
root = sys.argv[1]
fd = os.open(root, os.O_RDONLY)
try:
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.stderr.write("repo-scoped prepare lock is already held\n")
        sys.exit(73)
    sys.stdout.write("LUCA_CONTROLLED_FLOCK_READY\n")
    sys.stdout.flush()
    sys.stdin.buffer.read()
finally:
    os.close(fd)
`;

function acquirePrepareFlock(root) {
  return new Promise((resolveLock, rejectLock) => {
    const child = spawn('/usr/bin/python3', ['-c', PREPARE_LOCK_HELPER, root], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let ready = false;
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (!ready && stdout.includes('LUCA_CONTROLLED_FLOCK_READY\n')) {
        ready = true;
        resolveLock(child);
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectLock);
    child.once('close', (status) => {
      if (!ready) rejectLock(new Error(status === 73
        ? 'another prepare holds the repo-scoped advisory flock'
        : `prepare flock helper failed: ${(stderr || stdout || `status ${status}`).trim()}`));
    });
  });
}

function releasePrepareFlock(child) {
  return new Promise((resolveRelease, rejectRelease) => {
    child.once('error', rejectRelease);
    child.once('close', (status) => {
      if (status === 0) resolveRelease();
      else rejectRelease(new Error(`prepare flock helper release failed with status ${status}`));
    });
    child.stdin.end();
  });
}

function readReceipt(path, taskId) {
  if (!existsSync(path)) return { schema_version: 1, task_id: taskId, history: [] };
  const receipt = readJson(path, 'receipt');
  if (receipt.schema_version !== 1 || receipt.task_id !== taskId || !Array.isArray(receipt.history)) fail('existing receipt identity is invalid');
  return receipt;
}

function receiptEvent(manifest, generation, state, at, details = {}) {
  if (!RECEIPT_STATES.has(state)) fail(`invalid receipt state: ${state}`);
  return {
    state,
    at,
    generation,
    u_id: manifest.u_id,
    plan_sha256: manifest.plan_sha256,
    manifest_sha256: manifestSha256(manifest),
    ...details,
  };
}

function appendReceipt(path, manifest, generation, state, at, details = {}) {
  const beforeSha = existsSync(path) ? sha256File(path) : '-';
  const receipt = readReceipt(path, manifest.task_id);
  const event = receiptEvent(manifest, generation, state, at, details);
  const latest = receipt.history.at(-1);
  if (latest && canonicalJson(latest) === canonicalJson(event)) return { receipt, sha256: beforeSha };
  const next = { ...receipt, history: [...receipt.history, event] };
  const sha256 = atomicWriteJson(path, next, { expectedSha256: beforeSha });
  return { receipt: next, sha256 };
}

function assertBootstrapDormancy(manifest, options) {
  if (manifest.dormant_until !== 'fresh_bootstrap_pass') return;
  const path = options['fresh-bootstrap-receipt'];
  if (!path) fail('manifest authority is dormant until --fresh-bootstrap-receipt is provided');
  assertFreshBootstrapReceipt(manifest, path);
}

function generationFrom(options) {
  const value = options.generation || randomUUID();
  if (!GENERATION_RE.test(value)) fail('generation is invalid');
  return value;
}

function activeFor(manifest, witnessBase) {
  return {
    schema_version: 1,
    state: 'ACTIVE',
    task_id: manifest.task_id,
    u_id: manifest.u_id,
    generation: witnessBase.generation,
    plan_sha256: manifest.plan_sha256,
    manifest_sha256: manifestSha256(manifest),
    repo_realpath: manifest.repo_realpath,
    created_at: witnessBase.created_at,
    expires_at: witnessBase.expires_at,
    witness_anchor_sha256: witnessAnchor(witnessBase),
    manifest,
  };
}

function resumePrepareIfPossible(manifest, options, paths, at) {
  if (!existsSync(paths.witness)) return null;
  const witness = readJson(paths.witness, 'required witness');
  if (witness.state !== 'REQUIRED') return null;
  const digest = manifestSha256(manifest);
  for (const [field, expected] of Object.entries({
    task_id: manifest.task_id,
    u_id: manifest.u_id,
    plan_sha256: manifest.plan_sha256,
    manifest_sha256: digest,
    repo_realpath: manifest.repo_realpath,
  })) {
    if (witness[field] !== expected) fail(`cannot resume prepare: witness ${field} mismatch`);
  }
  if (options.generation && options.generation !== witness.generation) fail('cannot resume prepare: generation mismatch');
  if (!GENERATION_RE.test(String(witness.generation || ''))) fail('cannot resume prepare: invalid persisted generation');
  if (!Number.isInteger(witness.expires_at) || witness.expires_at <= at) fail('cannot resume prepare: persisted witness is stale');
  const active = activeFor(manifest, witness);
  const activeSha = sha256Bytes(Buffer.from(`${canonicalJson(active)}\n`, 'utf8'));
  if (witness.active_context_sha256 !== activeSha) fail('cannot resume prepare: persisted witness does not bind the reconstructed active context');
  if (existsSync(paths.active)) {
    const existingActive = readJson(paths.active, 'active context');
    validateBoundRequired(witness, existingActive, at);
    if (canonicalJson(existingActive) !== canonicalJson(active)) fail('cannot resume prepare: active context bytes differ');
  } else {
    atomicWriteJson(paths.active, active, { expectedSha256: '-' });
  }
  maybeCrash('after-active');
  appendReceipt(paths.receipt, manifest, witness.generation, 'PREPARED', witness.created_at, { checked_preimages: true });
  maybeCrash('after-prepared-receipt');
  return {
    state: 'REQUIRED',
    generation: witness.generation,
    manifest_sha256: digest,
    expires_at: witness.expires_at,
    state_dir: paths.dir,
    recovered: true,
  };
}

function maybeCrash(point) {
  if (process.env.LUCA_CONTROLLED_TEST_CRASH === point) fail(`injected crash: ${point}`);
}

function loadBound(paths, now) {
  if (!existsSync(paths.witness) || !existsSync(paths.active)) fail('required witness or active context is missing');
  const witness = readJson(paths.witness, 'required witness');
  const active = readJson(paths.active, 'active context');
  return validateBoundRequired(witness, active, now);
}

async function prepareWithLease(manifest, options) {
  assertBootstrapDormancy(manifest, options);
  const root = controlRoot(manifest.repo_realpath);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const holder = await acquirePrepareFlock(root);
  if (process.env.LUCA_CONTROLLED_TEST_FLOCK_READY === '1') process.stderr.write('LUCA_CONTROLLED_FLOCK_READY\n');
  try { return prepareLocked(manifest, options, nowMs(options)); }
  finally { await releasePrepareFlock(holder); }
}

function prepareLocked(manifest, options, preparedAt) {
  const paths = statePaths(manifest);
  if (process.env.LUCA_CONTROLLED_TEST_HOLD_BEFORE_WITNESS_MS) {
    const hold = Number(process.env.LUCA_CONTROLLED_TEST_HOLD_BEFORE_WITNESS_MS);
    if (!Number.isInteger(hold) || hold < 1 || hold > 10000) fail('invalid LUCA_CONTROLLED_TEST_HOLD_BEFORE_WITNESS_MS');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, hold);
  }
  const resumed = resumePrepareIfPossible(manifest, options, paths, preparedAt);
  if (resumed) return resumed;
  const current = discoverControlState(manifest.repo_realpath, preparedAt);
  if (current.kind === 'required' || current.kind === 'invalid') fail(`cannot prepare while controlled state is ${current.kind}: ${current.reason || current.current?.witness?.task_id}`);
  checkManifest(manifest, 'pre');
  const generation = generationFrom(options);
  const createdAt = preparedAt;
  const ttl = options['ttl-seconds'] === undefined ? 3600 : Number(options['ttl-seconds']);
  if (!Number.isInteger(ttl) || ttl < 30 || ttl > 86400) fail('--ttl-seconds must be an integer from 30 to 86400');
  const expiresAt = manifest.expires_at || createdAt + ttl * 1000;
  const digest = manifestSha256(manifest);
  const witnessBase = {
    schema_version: 1,
    task_id: manifest.task_id,
    state: 'REQUIRED',
    u_id: manifest.u_id,
    generation,
    plan_sha256: manifest.plan_sha256,
    manifest_sha256: digest,
    repo_realpath: manifest.repo_realpath,
    created_at: createdAt,
    expires_at: expiresAt,
  };
  const active = activeFor(manifest, witnessBase);
  const witness = {
    ...witnessBase,
    active_context_sha256: sha256Bytes(Buffer.from(`${canonicalJson(active)}\n`, 'utf8')),
    effect_authorizations: [],
  };
  const witnessPre = existsSync(paths.witness) ? sha256File(paths.witness) : '-';
  atomicWriteJson(paths.witness, witness, { expectedSha256: witnessPre });
  maybeCrash('after-witness');
  const activePre = existsSync(paths.active) ? sha256File(paths.active) : '-';
  atomicWriteJson(paths.active, active, { expectedSha256: activePre });
  maybeCrash('after-active');
  validateBoundRequired(readJson(paths.witness), readJson(paths.active), createdAt);
  appendReceipt(paths.receipt, manifest, generation, 'PREPARED', createdAt, { checked_preimages: true });
  maybeCrash('after-prepared-receipt');
  return { state: 'REQUIRED', generation, manifest_sha256: digest, expires_at: expiresAt, state_dir: paths.dir };
}

function record(manifest, options) {
  const state = options.state;
  if (!['APPLIED', 'VERIFIED', 'EFFECT_UNKNOWN'].includes(state)) fail('record --state must be APPLIED, VERIFIED, or EFFECT_UNKNOWN');
  const paths = statePaths(manifest);
  const bound = loadBound(paths, nowMs(options));
  if (bound.witness.manifest_sha256 !== manifestSha256(manifest)) fail('record manifest does not match active context');
  if (state === 'APPLIED' || state === 'VERIFIED') checkManifest(manifest, 'post');
  const at = nowMs(options);
  const result = appendReceipt(paths.receipt, manifest, bound.witness.generation, state, at,
    state === 'EFFECT_UNKNOWN'
      ? {
        effect_outcome: 'unknown',
        effect_authorizations: bound.witness.effect_authorizations.filter((item) => item.outcome === 'EFFECT_UNKNOWN'),
      }
      : { checked_postimages: true });
  return { state, generation: bound.witness.generation, receipt_sha256: result.sha256 };
}

function terminalize(manifest, options, forcedState) {
  const state = forcedState || options.state || 'COMPLETED';
  if (!TERMINAL_WITNESS_STATES.has(state)) fail('terminal state must be VERIFIED, COMPLETED, or ABORTED');
  const paths = statePaths(manifest);
  const at = nowMs(options);

  // Idempotent recovery for a crash after terminal witness persistence but before active removal.
  if (existsSync(paths.witness)) {
    const existingWitness = readJson(paths.witness, 'required witness');
    if (TERMINAL_WITNESS_STATES.has(existingWitness.state)) {
      const expectedIdentity = {
        task_id: manifest.task_id,
        u_id: manifest.u_id,
        plan_sha256: manifest.plan_sha256,
        manifest_sha256: manifestSha256(manifest),
        repo_realpath: manifest.repo_realpath,
      };
      if (existingWitness.state !== state) fail('terminal witness belongs to a different operation');
      for (const [field, expected] of Object.entries(expectedIdentity)) {
        if (existingWitness[field] !== expected) fail(`terminal witness ${field} mismatch`);
      }
      const receipt = readReceipt(paths.receipt, manifest.task_id);
      const receiptSha = sha256Bytes(Buffer.from(`${canonicalJson(receipt)}\n`, 'utf8'));
      if (existingWitness.receipt_sha256 !== receiptSha) fail('terminal recovery receipt mismatch');
      if (existsSync(paths.active)) {
        const active = readJson(paths.active, 'terminal recovery active context');
        for (const [field, expected] of Object.entries({
          schema_version: 1,
          state: 'ACTIVE',
          task_id: existingWitness.task_id,
          u_id: existingWitness.u_id,
          generation: existingWitness.generation,
          plan_sha256: existingWitness.plan_sha256,
          manifest_sha256: existingWitness.manifest_sha256,
          repo_realpath: existingWitness.repo_realpath,
          expires_at: existingWitness.expires_at,
        })) {
          if (active[field] !== expected) fail(`terminal recovery active ${field} mismatch`);
        }
        if (!/^[0-9a-f]{64}$/.test(String(existingWitness.active_context_sha256 || ''))) fail('terminal witness lacks the bound active-context SHA');
        unlinkJsonCas(paths.active, existingWitness.active_context_sha256);
      }
      return { state, generation: existingWitness.generation, recovered: true, receipt_sha256: receiptSha };
    }
  }

  const bound = loadBound(paths, at);
  if (bound.witness.manifest_sha256 !== manifestSha256(manifest)) fail('terminal manifest does not match active context');
  if (state !== 'ABORTED') checkManifest(manifest, 'post');
  const receiptResult = appendReceipt(paths.receipt, manifest, bound.witness.generation, state, at,
    state === 'ABORTED'
      ? { reason: options.reason || 'aborted-by-controller', effect_authorizations: bound.witness.effect_authorizations }
      : { checked_postimages: true, effect_authorizations: bound.witness.effect_authorizations });
  maybeCrash('after-terminal-receipt');
  const oldWitnessSha = sha256File(paths.witness);
  const terminalWitness = {
    schema_version: 1,
    task_id: bound.witness.task_id,
    state,
    u_id: bound.witness.u_id,
    generation: bound.witness.generation,
    plan_sha256: bound.witness.plan_sha256,
    manifest_sha256: bound.witness.manifest_sha256,
    repo_realpath: bound.witness.repo_realpath,
    created_at: bound.witness.created_at,
    expires_at: bound.witness.expires_at,
    finished_at: at,
    receipt_sha256: receiptResult.sha256,
    active_context_sha256: bound.witness.active_context_sha256,
  };
  atomicWriteJson(paths.witness, terminalWitness, { expectedSha256: oldWitnessSha });
  maybeCrash('after-terminal-witness');
  unlinkJsonCas(paths.active, bound.witness.active_context_sha256);
  maybeCrash('after-active-remove');
  return { state, generation: bound.witness.generation, receipt_sha256: receiptResult.sha256 };
}

function authorizeEffect(manifest, options) {
  const effect = options.effect;
  const gate = options.gate;
  const commandSha256 = options['command-sha256'];
  const cwd = options.cwd;
  const token = options['authorization-token'];
  if (!effect || !gate || !commandSha256 || !cwd || !token) {
    fail('authorize-effect requires --effect, --gate, --command-sha256, --cwd, and --authorization-token');
  }
  if (!/^[0-9a-f]{64}$/.test(commandSha256)) fail('--command-sha256 must be an exact lowercase SHA-256');
  if (!GENERATION_RE.test(token)) fail('--authorization-token is invalid');
  if (resolve(cwd) !== cwd) fail('--cwd must be a normalized absolute path');
  let cwdReal;
  try { cwdReal = resolve(realpathSync(cwd)); }
  catch (error) { fail(`--cwd is not an existing realpath: ${error.message}`); }
  if (cwdReal !== cwd || cwdReal !== manifest.repo_realpath) fail('--cwd must equal the exact manifest repo_realpath');
  if (!manifest.approved_effects.includes(effect)) fail(`effect is absent from manifest approved_effects: ${effect}`);
  const paths = statePaths(manifest);
  const at = nowMs(options);
  const bound = loadBound(paths, at);
  if (bound.witness.manifest_sha256 !== manifestSha256(manifest)) fail('effect manifest does not match active context');
  const binding = {
    effect,
    gate,
    command_sha256: commandSha256,
    repo_realpath: manifest.repo_realpath,
    cwd_realpath: cwdReal,
    token,
  };
  const existingToken = bound.witness.effect_authorizations.find((item) => item.token === token);
  if (existingToken) {
    const exact = Object.entries(binding).every(([field, expected]) => existingToken[field] === expected);
    if (!exact) fail('effect authorization token is already bound to different authority');
    if (existingToken.remaining_uses !== 1) fail('effect authorization token has already been consumed');
    return { state: 'AUTHORIZED', ...binding, remaining_uses: 1, recovered: true };
  }
  if (bound.witness.effect_authorizations.some((item) => item.effect === effect && item.remaining_uses > 0)) {
    fail('effect already has an unused authorization');
  }
  const authorization = { ...binding, authorized_at: at, remaining_uses: 1 };
  const nextWitness = {
    ...bound.witness,
    effect_authorizations: [...bound.witness.effect_authorizations, authorization],
  };
  atomicWriteJson(paths.witness, nextWitness, { expectedSha256: sha256File(paths.witness) });
  maybeCrash('after-effect-authorization');
  validateBoundRequired(readJson(paths.witness), readJson(paths.active), at);
  return { state: 'AUTHORIZED', ...binding, remaining_uses: 1, recovered: false };
}

async function main() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (!command || !options.manifest) fail('usage: controlled-change-controller.mjs <prepare|record|authorize-effect|finish|abort> --manifest <path>');
  const manifest = loadManifestFile(options.manifest);
  let result;
  if (command === 'prepare') result = await prepareWithLease(manifest, options);
  else if (command === 'record') result = record(manifest, options);
  else if (command === 'authorize-effect') result = authorizeEffect(manifest, options);
  else if (command === 'finish') result = terminalize(manifest, options);
  else if (command === 'abort') result = terminalize(manifest, options, 'ABORTED');
  else fail(`unknown controller command: ${command}`);
  process.stdout.write(`${canonicalJson(result)}\n`);
  return 0;
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await main(); }
  catch (error) {
    process.stderr.write(`[controlled-change-controller] ${error.message}\n`);
    process.exitCode = 2;
  }
}
