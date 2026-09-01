#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLAN_SHA = '1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9';
const PRODUCTION_REPO = '/Users/luca/Desktop/项目/muse/lucagstack';
const PRODUCTION_AUDIT_PREIMAGE_SHA = 'd54872be61ee5fd0fc1e6936c236b895098edf3a6c15ac3e0f76d3985308ef20';
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ABSENT = Object.freeze({ type: 'absent', mode: '-', sha256: '-' });
const RENAME_EXCL_NOFOLLOW = String.raw`
import ctypes
import os
import sys

libc = ctypes.CDLL(None, use_errno=True)
try:
    renamex_np = libc.renamex_np
except AttributeError:
    sys.stderr.write("renamex_np unavailable\n")
    sys.exit(127)
renamex_np.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint]
renamex_np.restype = ctypes.c_int
flags = 0x04 | 0x10
if renamex_np(os.fsencode(sys.argv[1]), os.fsencode(sys.argv[2]), flags) != 0:
    number = ctypes.get_errno()
    sys.stderr.write(f"renamex_np errno={number}: {os.strerror(number)}\n")
    sys.exit(1)
`;

function fail(message, code = 1) {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
}

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function tuple(path) {
  if (!existsSync(path) && !lstatSafe(path)) return { ...ABSENT };
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    return { type: 'symlink', mode: '120000', sha256: sha256(Buffer.from(readlinkSync(path), 'utf8')) };
  }
  if (!stat.isFile()) fail(`unsupported path type: ${path}`);
  return {
    type: 'file',
    mode: (stat.mode & 0o111) ? '100755' : '100644',
    sha256: sha256(readFileSync(path)),
  };
}

function lstatSafe(path) {
  try { return lstatSync(path); } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function sameTuple(left, right) {
  return left.type === right.type && left.mode === right.mode && left.sha256 === right.sha256;
}

function requireTuple(path, expected, label) {
  const actual = tuple(path);
  if (!sameTuple(actual, expected)) fail(`${label} tuple mismatch: ${JSON.stringify({ path, expected, actual })}`);
  return actual;
}

function inside(path, root) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function insideApprovedTemp(path) {
  return [realpathSync(tmpdir()), '/private/tmp'].some((root) => inside(path, root) && path !== root);
}

function readJson(path, label) {
  const stat = lstatSafe(path);
  if (!stat?.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file: ${path}`);
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { fail(`${label} is invalid JSON: ${error.message}`); }
}

function fsyncDirectory(path) {
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function tupleForBytes(bytes, mode = 0o644) {
  return { type: 'file', mode: (mode & 0o111) ? '100755' : '100644', sha256: sha256(bytes) };
}

function deterministicOperationPaths(kind, path, operationKey, expected, postimage) {
  if (!['create', 'replace', 'remove'].includes(kind)) fail(`unsupported operation kind: ${kind}`);
  if (typeof operationKey !== 'string' || operationKey.length === 0) fail('operation key must be a non-empty string');
  const absolute = resolve(path);
  const normalized = JSON.stringify({
    plan_sha256: PLAN_SHA,
    kind,
    operation_key: operationKey,
    path: absolute,
    expected: [expected.type, expected.mode, expected.sha256],
    postimage: [postimage.type, postimage.mode, postimage.sha256],
  });
  const operationHash = sha256(Buffer.from(normalized, 'utf8'));
  const prefix = join(dirname(absolute), `.${basename(absolute)}.luca-cutover-${PLAN_SHA.slice(0, 16)}-${operationHash.slice(0, 32)}`);
  return { stage: `${prefix}.stage`, recovery: `${prefix}.recovery`, operationHash };
}

function deterministicCleanupPath(path, expected, cleanupKey) {
  if (typeof cleanupKey !== 'string' || cleanupKey.length === 0) fail('cleanup key must be a non-empty string');
  const absolute = resolve(path);
  const normalized = JSON.stringify({
    plan_sha256: PLAN_SHA,
    kind: 'cleanup',
    cleanup_key: cleanupKey,
    path: absolute,
    expected: [expected.type, expected.mode, expected.sha256],
  });
  const cleanupHash = sha256(Buffer.from(normalized, 'utf8'));
  return join(dirname(absolute), `.${basename(absolute)}.luca-cutover-${PLAN_SHA.slice(0, 16)}-${cleanupHash.slice(0, 32)}.cleanup`);
}

function renameExclusive(source, destination, label) {
  if (dirname(source) !== dirname(destination)) fail(`${label} requires adjacent source/destination`);
  const result = spawnSync('/usr/bin/python3', ['-c', RENAME_EXCL_NOFOLLOW, source, destination], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', PYTHONDONTWRITEBYTECODE: '1' },
  });
  if (result.error || result.status !== 0) {
    fail(`${label} kernel no-replace rename failed: ${(result.error?.message || result.stderr || result.stdout || `status ${result.status}`).trim()}`);
  }
  fsyncDirectory(dirname(source));
}

function unlinkCapturedExact(path, expected, label, cleanupKey, checkWindowHook = null) {
  const cleanup = deterministicCleanupPath(path, expected, cleanupKey);
  const existingCleanup = tuple(cleanup);
  if (!sameTuple(existingCleanup, ABSENT)) {
    if (!sameTuple(existingCleanup, expected)) {
      fail(`${label} deterministic cleanup slot drift: ${JSON.stringify({ expected, actual: existingCleanup })}; CLEANUP_PATH=${cleanup}`);
    }
    const source = tuple(path);
    if (!sameTuple(source, ABSENT)) {
      fail(`${label} preserves an occupied source beside its owned cleanup slot: ${JSON.stringify({ source })}; SOURCE_PATH=${path}; CLEANUP_PATH=${cleanup}`);
    }
    // Ownership boundary: a prior no-replace capture created this previously absent,
    // operation-specific slot. Its tuple was just validated; never unlink the source pathname.
    unlinkSync(cleanup);
    fsyncDirectory(dirname(cleanup));
    return;
  }
  requireTuple(path, expected, `${label} source precheck`);
  if (checkWindowHook) checkWindowHook();
  try { renameExclusive(path, cleanup, `${label} cleanup capture`); }
  catch (error) {
    error.message = `${error.message}; SOURCE_PATH=${path}; CLEANUP_PATH=${cleanup}`;
    throw error;
  }
  const captured = tuple(cleanup);
  if (!sameTuple(captured, expected)) {
    if (sameTuple(tuple(path), ABSENT)) {
      try { renameExclusive(cleanup, path, `${label} foreign restore`); }
      catch (restoreError) {
        fail(`${label} captured foreign tuple and could not restore without overwrite: ${restoreError.message}; SOURCE_PATH=${path}; CLEANUP_PATH=${cleanup}`);
      }
      fail(`${label} captured a check-window replacement and restored its foreign bytes: ${JSON.stringify({ expected, captured })}; SOURCE_PATH=${path}; CLEANUP_PATH=${cleanup}`);
    }
    fail(`${label} captured a check-window replacement and preserved it in the cleanup slot: ${JSON.stringify({ expected, captured })}; SOURCE_PATH=${path}; CLEANUP_PATH=${cleanup}`);
  }
  // Ownership boundary: the no-replace rename atomically captured the source into this
  // operation-specific slot and validation proved it is the expected inode content contract.
  unlinkSync(cleanup);
  fsyncDirectory(dirname(cleanup));
}

function captureExact(path, expected, recovery, label) {
  requireTuple(path, expected, `${label} preimage`);
  requireTuple(recovery, ABSENT, `${label} recovery slot`);
  try { renameExclusive(path, recovery, `${label} capture`); }
  catch (error) {
    error.message = `${error.message}; RECOVERY_PATH=${recovery}`;
    throw error;
  }
  const captured = tuple(recovery);
  if (!sameTuple(captured, expected)) {
    if (sameTuple(tuple(path), ABSENT)) {
      try {
        renameExclusive(recovery, path, `${label} mismatch restore`);
        fail(`${label} captured drifted tuple and restored it: ${JSON.stringify({ expected, captured })}`);
      }
      catch (restoreError) {
        if (sameTuple(tuple(recovery), ABSENT)) throw restoreError;
        fail(`${label} captured drift and restore failed: ${restoreError.message}; RECOVERY_PATH=${recovery}`);
      }
    }
    fail(`${label} captured drifted tuple: ${JSON.stringify({ expected, captured })}; RECOVERY_PATH=${recovery}`);
  }
  return recovery;
}

function writeDeterministicStage(path, bytes, mode, postimage, label) {
  let fd;
  try {
    fd = openSync(path, 'wx', mode);
    writeFileSync(fd, bytes);
    chmodSync(path, mode);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    fsyncDirectory(dirname(path));
    requireTuple(path, postimage, `${label} staged postimage`);
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    throw error;
  }
}

function reconcileCreateExact(path, postimage, operationKey, label, existingOnly = false) {
  const paths = deterministicOperationPaths('create', path, operationKey, ABSENT, postimage);
  const stageTuple = tuple(paths.stage);
  const targetTuple = tuple(path);
  if (!sameTuple(stageTuple, ABSENT) && !sameTuple(stageTuple, postimage)) {
    fail(`${label} deterministic stage drift: ${JSON.stringify({ expected: postimage, actual: stageTuple })}; STAGE_PATH=${paths.stage}`);
  }
  if (sameTuple(stageTuple, ABSENT)) {
    if (sameTuple(targetTuple, postimage)) return { state: 'COMPLETE', paths };
    if (existingOnly) return { state: 'INACTIVE', paths };
    if (sameTuple(targetTuple, ABSENT)) return { state: 'FRESH', paths };
    fail(`${label} refuses to overwrite target: ${JSON.stringify({ path, actual: targetTuple })}; STAGE_PATH=${paths.stage}`);
  }
  if (sameTuple(targetTuple, postimage)) {
    unlinkCapturedExact(paths.stage, postimage, `${label} completed stage cleanup`, `create-stage:${operationKey}`);
    return { state: 'COMPLETE', paths };
  }
  if (!sameTuple(targetTuple, ABSENT)) {
    fail(`${label} preserves a foreign target beside its exact stage: ${JSON.stringify({ path, actual: targetTuple })}; STAGE_PATH=${paths.stage}`);
  }
  try { linkSync(paths.stage, path); }
  catch (error) {
    error.message = `${label} no-replace install failed: ${error.message}; STAGE_PATH=${paths.stage}`;
    throw error;
  }
  fsyncDirectory(dirname(path));
  requireTuple(path, postimage, `${label} installed postimage`);
  unlinkCapturedExact(paths.stage, postimage, `${label} stage cleanup`, `create-stage:${operationKey}`);
  return { state: 'COMPLETE', paths };
}

function atomicCreate(path, bytes, mode = 0o644, operationKey = 'create') {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const postimage = tupleForBytes(bytes, mode);
  const label = `atomic create ${operationKey}`;
  let result = reconcileCreateExact(path, postimage, operationKey, label);
  if (result.state === 'COMPLETE') return requireTuple(path, postimage, `${label} postimage`);
  try {
    writeDeterministicStage(result.paths.stage, bytes, mode, postimage, label);
    result = reconcileCreateExact(path, postimage, operationKey, label);
  } catch (error) {
    if (!error.message.includes('STAGE_PATH=')) error.message = `${error.message}; STAGE_PATH=${result.paths.stage}`;
    throw error;
  }
  if (result.state !== 'COMPLETE') fail(`${label} did not reach COMPLETE; STAGE_PATH=${result.paths.stage}`);
  return requireTuple(path, postimage, `${label} postimage`);
}

function reconcileReplaceTupleExact(path, expected, postimage, label, operationKey, existingOnly = false) {
  const paths = deterministicOperationPaths('replace', path, operationKey, expected, postimage);
  const stageTuple = tuple(paths.stage);
  const recoveryTuple = tuple(paths.recovery);
  const targetTuple = tuple(path);
  if (!sameTuple(stageTuple, ABSENT) && !sameTuple(stageTuple, postimage)) {
    fail(`${label} deterministic stage drift: ${JSON.stringify({ expected: postimage, actual: stageTuple })}; STAGE_PATH=${paths.stage}`);
  }
  if (!sameTuple(recoveryTuple, ABSENT) && !sameTuple(recoveryTuple, expected)) {
    fail(`${label} deterministic recovery drift: ${JSON.stringify({ expected, actual: recoveryTuple })}; RECOVERY_PATH=${paths.recovery}`);
  }
  const hasStage = sameTuple(stageTuple, postimage);
  const hasRecovery = sameTuple(recoveryTuple, expected);
  if (!hasRecovery && !hasStage) {
    if (sameTuple(targetTuple, postimage)) return { state: 'COMPLETE', paths, postimage };
    if (sameTuple(targetTuple, expected)) return { state: 'FRESH', paths, postimage };
    if (existingOnly) return { state: 'INACTIVE', paths, postimage };
    fail(`${label} target is neither preimage nor postimage: ${JSON.stringify({ path, expected, postimage, actual: targetTuple })}`);
  }
  if (!hasRecovery) {
    if (sameTuple(targetTuple, expected)) return { state: 'STAGED', paths, postimage };
    if (sameTuple(targetTuple, postimage)) {
      unlinkCapturedExact(paths.stage, postimage, `${label} redundant stage cleanup`, `replace-stage:${operationKey}`);
      return { state: 'COMPLETE', paths, postimage };
    }
    fail(`${label} exact stage cannot reconcile target: ${JSON.stringify({ path, actual: targetTuple })}; STAGE_PATH=${paths.stage}`);
  }
  if (sameTuple(targetTuple, ABSENT) && hasStage) {
    renameExclusive(paths.stage, path, `${label} reconciled install`);
    requireTuple(path, postimage, `${label} reconciled postimage`);
    unlinkCapturedExact(paths.recovery, expected, `${label} reconciled recovery cleanup`, `replace-recovery:${operationKey}`);
    return { state: 'COMPLETE', paths, postimage };
  }
  if (sameTuple(targetTuple, postimage)) {
    if (hasStage) unlinkCapturedExact(paths.stage, postimage, `${label} redundant stage cleanup`, `replace-stage:${operationKey}`);
    unlinkCapturedExact(paths.recovery, expected, `${label} reconciled recovery cleanup`, `replace-recovery:${operationKey}`);
    return { state: 'COMPLETE', paths, postimage };
  }
  fail(`${label} preserves unresolved recovery and target: ${JSON.stringify({ path, actual: targetTuple, has_stage: hasStage })}; RECOVERY_PATH=${paths.recovery}${hasStage ? `; STAGE_PATH=${paths.stage}` : ''}`);
}

function reconcileReplaceExact(path, expected, bytes, mode, label, operationKey, existingOnly = false) {
  return reconcileReplaceTupleExact(path, expected, tupleForBytes(bytes, mode), label, operationKey, existingOnly);
}

function atomicReplaceExact(path, expected, bytes, mode, label, commitWindowHook = null,
  operationKey = 'replace', hardCrashHook = null, cleanupCheckHook = null) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  let result = reconcileReplaceExact(path, expected, bytes, mode, label, operationKey);
  if (result.state === 'COMPLETE') return requireTuple(path, result.postimage, `${label} committed postimage`);
  try {
    if (result.state === 'FRESH') {
      writeDeterministicStage(result.paths.stage, bytes, mode, result.postimage, label);
      result = reconcileReplaceExact(path, expected, bytes, mode, label, operationKey);
    }
    if (result.state !== 'STAGED') fail(`${label} expected a staged operation, got ${result.state}`);
    captureExact(path, expected, result.paths.recovery, label);
    if (hardCrashHook) hardCrashHook('after-capture');
    if (commitWindowHook) commitWindowHook();
    renameExclusive(result.paths.stage, path, `${label} install`);
    if (hardCrashHook) hardCrashHook('after-install');
    requireTuple(path, result.postimage, `${label} postimage`);
    unlinkCapturedExact(result.paths.recovery, expected, `${label} recovery cleanup`,
      `replace-recovery:${operationKey}`, cleanupCheckHook);
  } catch (error) {
    if (!sameTuple(tuple(result.paths.recovery), ABSENT) && !error.message.includes('RECOVERY_PATH=')) {
      error.message = `${error.message}; RECOVERY_PATH=${result.paths.recovery}`;
    }
    if (!sameTuple(tuple(result.paths.stage), ABSENT) && !error.message.includes('STAGE_PATH=')) {
      error.message = `${error.message}; STAGE_PATH=${result.paths.stage}`;
    }
    throw error;
  }
  return requireTuple(path, result.postimage, `${label} committed postimage`);
}

function reconcileRemoveExact(path, expected, label, operationKey, existingOnly = false) {
  const paths = deterministicOperationPaths('remove', path, operationKey, expected, ABSENT);
  const recoveryTuple = tuple(paths.recovery);
  const targetTuple = tuple(path);
  if (!sameTuple(recoveryTuple, ABSENT) && !sameTuple(recoveryTuple, expected)) {
    fail(`${label} deterministic recovery drift: ${JSON.stringify({ expected, actual: recoveryTuple })}; RECOVERY_PATH=${paths.recovery}`);
  }
  if (sameTuple(recoveryTuple, ABSENT)) {
    if (existingOnly) return { state: 'INACTIVE', paths };
    if (sameTuple(targetTuple, ABSENT)) return { state: 'COMPLETE', paths };
    if (sameTuple(targetTuple, expected)) return { state: 'FRESH', paths };
    fail(`${label} refuses to remove drifted path: ${JSON.stringify({ path, expected, actual: targetTuple })}`);
  }
  if (!sameTuple(targetTuple, ABSENT)) {
    fail(`${label} preserves a target created after capture: ${JSON.stringify({ path, actual: targetTuple })}; RECOVERY_PATH=${paths.recovery}`);
  }
  unlinkCapturedExact(paths.recovery, expected, `${label} reconciled removal`, `remove-recovery:${operationKey}`);
  return { state: 'COMPLETE', paths };
}

function removeExact(path, expected, label, commitWindowHook = null, operationKey = 'remove', hardCrashHook = null) {
  let result = reconcileRemoveExact(path, expected, label, operationKey);
  if (result.state === 'COMPLETE') return;
  try {
    captureExact(path, expected, result.paths.recovery, label);
    if (hardCrashHook) hardCrashHook('after-capture');
    if (commitWindowHook) commitWindowHook();
    const replacement = tuple(path);
    if (!sameTuple(replacement, ABSENT)) {
      fail(`${label} detected a commit-window replacement and preserved it: ${JSON.stringify(replacement)}; RECOVERY_PATH=${result.paths.recovery}`);
    }
    unlinkCapturedExact(result.paths.recovery, expected, `${label} removal`, `remove-recovery:${operationKey}`);
  } catch (error) {
    if (!sameTuple(tuple(result.paths.recovery), ABSENT) && !error.message.includes('RECOVERY_PATH=')) {
      error.message = `${error.message}; RECOVERY_PATH=${result.paths.recovery}`;
    }
    throw error;
  }
}

function fixtureReplace(path, bytes, mode = 0o644) {
  const absolute = resolve(path);
  if (absolute !== path || !insideApprovedTemp(absolute)) fail(`fixture replace path is outside approved temp: ${path}`);
  const current = tuple(path);
  if (current.type !== 'file') fail(`fixture replace requires an existing regular file: ${path}`);
  removeExact(path, current, 'fixture replace preimage removal');
  atomicCreate(path, bytes, mode);
}

function regularFileTuple(path, label) {
  const value = tuple(path);
  if (value.type !== 'file' || value.mode !== '100644') fail(`${label} must be a 100644 regular file: ${path}`);
  return value;
}

function productionConfig(repoArgument) {
  if (!repoArgument) fail('--repo is required');
  const repo = realpathSync(repoArgument);
  if (repo !== PRODUCTION_REPO) fail(`production repo identity mismatch: ${repo}`);
  return normalizeConfig({
    schema_version: 1,
    plan_sha256: PLAN_SHA,
    fixture: false,
    root: repo,
    repo_root: repo,
    audit_path: `/Users/luca/.luca/audit/matt-six-skill-personal-cutover-${PLAN_SHA}.json`,
    audit_preimage_sha256: PRODUCTION_AUDIT_PREIMAGE_SHA,
    targets: [
      {
        id: 'resolving-merge-conflicts',
        target_path: '/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md',
        backup_path: `/Users/luca/.claude/skills/.luca-backups/${PLAN_SHA}/resolving-merge-conflicts.SKILL.md`,
        adapter_path: join(repo, '.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md'),
        canonical_path: join(repo, '.claude/skills/office/resolving-merge-conflicts/SKILL.md'),
        legacy_sha256: '5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de',
      },
      {
        id: 'systematic-debugging',
        target_path: '/Users/luca/.agents/skills/systematic-debugging/SKILL.md',
        backup_path: `/Users/luca/.agents/skills/.luca-backups/${PLAN_SHA}/systematic-debugging.SKILL.md`,
        adapter_path: join(repo, '.claude/skill-os/compat/systematic-debugging/SKILL.md'),
        canonical_path: join(repo, '.claude/skills/office/diagnosing-bugs/SKILL.md'),
        legacy_sha256: '9982f0cfae330af0cb94724c561688db39800012994322df43dafcda65a6a4c5',
      },
    ],
  });
}

function fixtureConfig(path, trustedSelfTest = false) {
  if (!trustedSelfTest && process.env.LUCA_CUTOVER_TEST_FIXTURE !== '1') fail('fixture config is test-only');
  const input = readJson(path, 'fixture config');
  input.fixture = true;
  return normalizeConfig(input);
}

function normalizeConfig(input) {
  if (input?.schema_version !== 1 || input.plan_sha256 !== PLAN_SHA) fail('config plan/schema mismatch');
  if (!Array.isArray(input.targets) || input.targets.length !== 2) fail('config requires exactly two targets');
  const root = resolve(input.root);
  const repoRoot = resolve(input.repo_root);
  const auditPath = resolve(input.audit_path);
  const fixture = input.fixture === true;
  const auditPreimageTuple = input.audit_preimage_sha256 === undefined
    ? { ...ABSENT }
    : { type: 'file', mode: '100644', sha256: input.audit_preimage_sha256 };
  if (input.audit_preimage_sha256 !== undefined && !/^[0-9a-f]{64}$/.test(input.audit_preimage_sha256)) {
    fail('audit preimage SHA is invalid');
  }
  if (!fixture && input.audit_preimage_sha256 !== PRODUCTION_AUDIT_PREIMAGE_SHA) fail('production audit preimage SHA mismatch');
  if (fixture) {
    if (!insideApprovedTemp(root)) fail('fixture root must be a child of an approved OS temp directory');
    for (const path of [repoRoot, auditPath, ...input.targets.flatMap((target) => [
      target.target_path, target.backup_path, target.adapter_path, target.canonical_path,
    ])]) {
      if (!inside(resolve(path), root)) fail(`fixture path escapes root: ${path}`);
    }
  }
  const expectedIds = ['resolving-merge-conflicts', 'systematic-debugging'];
  const targets = input.targets.map((target, index) => {
    if (target.id !== expectedIds[index]) fail(`target order/id mismatch at ${index}`);
    if (!/^[0-9a-f]{64}$/.test(target.legacy_sha256)) fail(`target ${target.id} legacy SHA is invalid`);
    return {
      id: target.id,
      targetPath: resolve(target.target_path),
      backupPath: resolve(target.backup_path),
      adapterPath: resolve(target.adapter_path),
      canonicalPath: resolve(target.canonical_path),
      legacyTuple: { type: 'file', mode: '100644', sha256: target.legacy_sha256 },
    };
  });
  return { fixture, root, repoRoot, auditPath, auditPreimageTuple, targets };
}

function loadEvidence(path, cfg, phase) {
  const evidence = readJson(path, `${phase} loader evidence`);
  if (evidence.schema_version !== 1 || evidence.plan_sha256 !== PLAN_SHA || evidence.phase !== phase) {
    fail(`${phase} loader evidence plan/schema/phase mismatch`);
  }
  if (!Array.isArray(evidence.selected_targets) || !Array.isArray(evidence.probes)) fail('loader evidence arrays are missing');
  const expectedOrder = cfg.targets.map((target) => target.id).filter((id) => evidence.selected_targets.includes(id));
  if (JSON.stringify(expectedOrder) !== JSON.stringify(evidence.selected_targets)) fail('selected_targets contains unknown, duplicate, or unsorted values');
  for (const probe of evidence.probes) {
    if (!['claude', 'codex'].includes(probe.harness)) fail(`invalid loader harness: ${probe.harness}`);
    if (!['resolving-merge-conflicts', 'diagnosing-bugs', 'systematic-debugging'].includes(probe.skill)) fail(`invalid probe skill: ${probe.skill}`);
    if (!['project', 'personal', 'absent'].includes(probe.scope)) fail(`invalid probe scope: ${probe.scope}`);
    if (probe.scope === 'absent') {
      if (probe.resolved_path !== null || probe.resolved_sha256 !== '-') fail('absent probe tuple is invalid');
    } else {
      if (!isAbsolute(probe.resolved_path) || !/^[0-9a-f]{64}$/.test(probe.resolved_sha256)) fail('resolved probe tuple is invalid');
    }
  }
  validateEvidenceSemantics(evidence, cfg, phase);
  return evidence;
}

function findProbe(evidence, predicate, label) {
  const probe = evidence.probes.find(predicate);
  if (!probe) fail(`loader evidence lacks ${label}`);
  return probe;
}

function projectProbe(evidence, harness, skill, sha) {
  return evidence.probes.find((probe) => probe.harness === harness && probe.skill === skill
    && probe.scope === 'project' && probe.resolved_sha256 === sha);
}

function validateEvidenceSemantics(evidence, cfg, phase) {
  const resolver = cfg.targets[0];
  const debuggerTarget = cfg.targets[1];
  const resolverCanonical = regularFileTuple(resolver.canonicalPath, 'resolver canonical');
  const debugCanonical = regularFileTuple(debuggerTarget.canonicalPath, 'diagnosing canonical');
  const resolverAdapter = regularFileTuple(resolver.adapterPath, 'resolver adapter');
  const debugAdapter = regularFileTuple(debuggerTarget.adapterPath, 'debug adapter');
  const selected = new Set(evidence.selected_targets);

  if (!selected.has(resolver.id)) {
    for (const harness of ['claude', 'codex']) {
      if (!projectProbe(evidence, harness, resolver.id, resolverCanonical.sha256)) {
        fail(`${phase} evidence does not prove ${harness} project resolver precedence`);
      }
    }
  } else if (phase === 'pre') {
    findProbe(evidence, (probe) => probe.skill === resolver.id && probe.scope === 'personal'
      && probe.resolved_path === resolver.targetPath && probe.resolved_sha256 === resolver.legacyTuple.sha256,
    'resolver personal shadow');
  } else {
    findProbe(evidence, (probe) => probe.skill === resolver.id
      && ((probe.scope === 'personal' && probe.resolved_path === resolver.targetPath && probe.resolved_sha256 === resolverAdapter.sha256)
        || (probe.scope === 'project' && probe.resolved_sha256 === resolverCanonical.sha256)),
    'post-cutover resolver path');
  }

  findProbe(evidence, (probe) => probe.skill === 'diagnosing-bugs' && probe.scope === 'project'
    && probe.resolved_sha256 === debugCanonical.sha256, `${phase} diagnosing project canonical`);
  if (selected.has(debuggerTarget.id)) {
    const expected = phase === 'pre' ? debuggerTarget.legacyTuple.sha256 : debugAdapter.sha256;
    findProbe(evidence, (probe) => probe.skill === debuggerTarget.id && probe.scope === 'personal'
      && probe.resolved_path === debuggerTarget.targetPath && probe.resolved_sha256 === expected,
    `${phase} systematic-debugging personal ${phase === 'pre' ? 'legacy shadow' : 'compat adapter'}`);
  } else {
    findProbe(evidence, (probe) => probe.skill === debuggerTarget.id
      && ((probe.scope === 'absent' && probe.resolved_path === null)
        || (probe.scope === 'personal' && probe.resolved_sha256 === debugAdapter.sha256)),
    `${phase} systematic-debugging non-shadow`);
  }
}

function targetSummary(cfg, evidence, phase) {
  const selected = new Set(evidence.selected_targets);
  return cfg.targets.map((target) => {
    const adapter = regularFileTuple(target.adapterPath, `${target.id} adapter`);
    const selectedTarget = selected.has(target.id);
    return {
      id: target.id,
      path: target.targetPath,
      decision: selectedTarget ? 'CUTOVER' : 'NOOP_PROJECT_PRECEDENCE',
      preimage: { ...target.legacyTuple },
      postimage: selectedTarget ? adapter : { ...target.legacyTuple },
      backup: selectedTarget ? { path: target.backupPath, ...target.legacyTuple } : { path: target.backupPath, ...ABSENT },
      rollback: 'PASS',
      fresh_loader: phase === 'VERIFIED' ? 'PASS' : 'PENDING',
    };
  });
}

function receiptBytes(cfg, evidence, state) {
  const selected = evidence.selected_targets;
  const receipt = {
    schema_version: 1,
    plan_sha256: PLAN_SHA,
    state,
    decision: selected.length ? (state === 'VERIFIED' ? 'CUTOVER_VERIFIED' : 'CUTOVER_PENDING_VERIFY') : 'NOOP_PROJECT_PRECEDENCE',
    selected_targets: selected,
    targets: targetSummary(cfg, evidence, state),
  };
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function inspect(cfg, evidence) {
  const selected = new Set(evidence.selected_targets);
  return {
    plan_sha256: PLAN_SHA,
    decision: selected.size ? 'CUTOVER_REQUIRED' : 'NOOP_PROJECT_PRECEDENCE',
    targets: cfg.targets.map((target) => ({
      id: target.id,
      selected: selected.has(target.id),
      target: { path: target.targetPath, tuple: tuple(target.targetPath) },
      backup: { path: target.backupPath, tuple: tuple(target.backupPath) },
      adapter: { path: target.adapterPath, tuple: tuple(target.adapterPath) },
    })),
    audit: { path: cfg.auditPath, tuple: tuple(cfg.auditPath) },
  };
}

function preflightSelected(target) {
  const targetTuple = tuple(target.targetPath);
  const adapterTuple = regularFileTuple(target.adapterPath, `${target.id} adapter`);
  const backupTuple = tuple(target.backupPath);
  if (!sameTuple(targetTuple, target.legacyTuple) && !sameTuple(targetTuple, adapterTuple)) {
    fail(`${target.id} target drifted before cutover: ${JSON.stringify(targetTuple)}`);
  }
  if (!sameTuple(backupTuple, ABSENT) && !sameTuple(backupTuple, target.legacyTuple)) {
    fail(`${target.id} backup collision: ${JSON.stringify(backupTuple)}`);
  }
  if (sameTuple(targetTuple, adapterTuple) && sameTuple(backupTuple, ABSENT)) {
    fail(`${target.id} adapter exists without recoverable backup`);
  }
  return { targetTuple, adapterTuple, backupTuple };
}

function injectFixtureRace(cfg, actual, expected, path) {
  if (actual !== expected) return;
  if (!cfg.fixture) fail('--simulate-race-at is test-only');
  const foreign = Buffer.from(`FOREIGN_RACE:${expected}\n`);
  if (expected.startsWith('target:')) fixtureReplace(path, foreign, 0o644);
  else atomicCreate(path, foreign, 0o644);
}

function injectCommitWindowRace(cfg, actual, expected, path) {
  if (actual !== expected) return;
  if (!cfg.fixture) fail('--simulate-commit-race-at is test-only');
  atomicCreate(path, Buffer.from(`FOREIGN_COMMIT_WINDOW:${expected}\n`), 0o644);
}

function cleanupCheckRaceBytes(racePoint) {
  return Buffer.from(`FOREIGN_CLEANUP_CHECK_WINDOW:${racePoint}\n`);
}

function cleanupCheckRacePreservePath(path, expected, racePoint) {
  return deterministicCleanupPath(path, expected, `fixture-preserve:${racePoint}`);
}

function injectCleanupCheckRace(cfg, actual, expected, path, expectedTuple) {
  if (actual !== expected) return;
  if (!cfg.fixture) fail('--simulate-cleanup-check-race-at is test-only');
  const preserved = cleanupCheckRacePreservePath(path, expectedTuple, expected);
  requireTuple(preserved, ABSENT, 'cleanup check-window fixture preserve slot');
  renameExclusive(path, preserved, 'cleanup check-window fixture exact preimage preserve');
  requireTuple(preserved, expectedTuple, 'cleanup check-window fixture preserved preimage');
  atomicCreate(path, cleanupCheckRaceBytes(expected), 0o644,
    `fixture-cleanup-check-race:${expected}`);
}

function injectHardCrash(cfg, actual, expected) {
  if (actual !== expected) return;
  if (!cfg.fixture) fail('--simulate-hard-crash-at is test-only');
  process.kill(process.pid, 'SIGKILL');
  fail(`failed to deliver SIGKILL at ${expected}`);
}

function reconcileApplyOperations(cfg, evidence, pendingBytes) {
  for (const target of cfg.targets.filter((row) => evidence.selected_targets.includes(row.id))) {
    reconcileCreateExact(target.backupPath, target.legacyTuple, `apply-backup:${target.id}`, `${target.id} backup create`, true);
    reconcileReplaceExact(target.targetPath, target.legacyTuple, readFileSync(target.adapterPath), 0o644,
      `${target.id} target CAS`, `apply-target:${target.id}`, true);
  }
  const pendingTuple = tupleForBytes(pendingBytes, 0o644);
  if (sameTuple(cfg.auditPreimageTuple, ABSENT)) {
    reconcileCreateExact(cfg.auditPath, pendingTuple, 'apply-audit', 'apply audit create', true);
  } else {
    reconcileReplaceExact(cfg.auditPath, cfg.auditPreimageTuple, pendingBytes, 0o644,
      'apply audit CAS', 'apply-audit', true);
  }
}

function validateCutoverState(cfg, evidence, label) {
  const selected = new Set(evidence.selected_targets);
  for (const target of cfg.targets) {
    const expectedTarget = selected.has(target.id)
      ? regularFileTuple(target.adapterPath, `${target.id} adapter`)
      : target.legacyTuple;
    requireTuple(target.targetPath, expectedTarget, `${target.id} ${label} target`);
    requireTuple(target.backupPath, selected.has(target.id) ? target.legacyTuple : ABSENT,
      `${target.id} ${label} backup`);
  }
}

function applyTransaction(cfg, evidence, simulateCrashAfter = 0, simulateRaceAt = '', simulateCommitRaceAt = '',
  simulateHardCrashAt = '', simulateCleanupCheckRaceAt = '') {
  if (!evidence.selected_targets.length) return { decision: 'NOOP_PROJECT_PRECEDENCE', writes: 0 };
  const selected = cfg.targets.filter((target) => evidence.selected_targets.includes(target.id));
  const pendingBytes = receiptBytes(cfg, evidence, 'APPLIED_PENDING_VERIFY');
  const pendingTuple = tupleForBytes(pendingBytes, 0o644);
  reconcileApplyOperations(cfg, evidence, pendingBytes);
  if (sameTuple(tuple(cfg.auditPath), pendingTuple)) {
    validateCutoverState(cfg, evidence, 'idempotent apply');
    return { decision: 'CUTOVER_PENDING_VERIFY', writes: 0, audit: cfg.auditPath };
  }
  requireTuple(cfg.auditPath, cfg.auditPreimageTuple, 'apply audit precondition');
  for (const target of selected) preflightSelected(target);
  let completed = 0;
  for (const target of selected) {
    const { targetTuple, adapterTuple, backupTuple } = preflightSelected(target);
    if (sameTuple(backupTuple, ABSENT)) {
      injectFixtureRace(cfg, simulateRaceAt, `backup:${target.id}`, target.backupPath);
      atomicCreate(target.backupPath, readFileSync(target.targetPath), 0o644, `apply-backup:${target.id}`);
    }
    requireTuple(target.backupPath, target.legacyTuple, `${target.id} backup`);
    if (sameTuple(targetTuple, target.legacyTuple)) {
      injectFixtureRace(cfg, simulateRaceAt, `target:${target.id}`, target.targetPath);
      const targetOperation = deterministicOperationPaths('replace', target.targetPath,
        `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
      atomicReplaceExact(target.targetPath, target.legacyTuple, readFileSync(target.adapterPath), 0o644, `${target.id} target CAS`,
        () => injectCommitWindowRace(cfg, simulateCommitRaceAt, `target:${target.id}`, target.targetPath),
        `apply-target:${target.id}`,
        (point) => injectHardCrash(cfg, simulateHardCrashAt, `target-${point}:${target.id}`),
        () => injectCleanupCheckRace(cfg, simulateCleanupCheckRaceAt,
          `target-recovery:${target.id}`, targetOperation.recovery, target.legacyTuple));
    }
    requireTuple(target.targetPath, adapterTuple, `${target.id} postimage`);
    completed++;
    if (simulateCrashAfter === completed) fail(`SIMULATED_CRASH_AFTER_TARGET_${completed}`, 86);
  }
  injectFixtureRace(cfg, simulateRaceAt, 'audit', cfg.auditPath);
  if (sameTuple(cfg.auditPreimageTuple, ABSENT)) atomicCreate(cfg.auditPath, pendingBytes, 0o644, 'apply-audit');
  else atomicReplaceExact(cfg.auditPath, cfg.auditPreimageTuple, pendingBytes, 0o644, 'apply audit CAS',
    () => injectCommitWindowRace(cfg, simulateCommitRaceAt, 'apply-audit', cfg.auditPath),
    'apply-audit',
    (point) => injectHardCrash(cfg, simulateHardCrashAt, `apply-audit-${point}`));
  return { decision: 'CUTOVER_PENDING_VERIFY', writes: completed, audit: cfg.auditPath };
}

function verifyTransaction(cfg, preEvidence, postEvidence, simulateCommitRaceAt = '', simulateHardCrashAt = '') {
  assert.deepEqual(postEvidence.selected_targets, preEvidence.selected_targets, 'pre/post selected target drift');
  if (!preEvidence.selected_targets.length) return { decision: 'NOOP_PROJECT_PRECEDENCE', writes: 0 };
  const pendingBytes = receiptBytes(cfg, preEvidence, 'APPLIED_PENDING_VERIFY');
  const pendingTuple = tupleForBytes(pendingBytes, 0o644);
  const verifiedBytes = receiptBytes(cfg, preEvidence, 'VERIFIED');
  const verifiedTuple = tupleForBytes(verifiedBytes, 0o644);
  reconcileReplaceExact(cfg.auditPath, pendingTuple, verifiedBytes, 0o644,
    'verify audit CAS', 'verify-audit', true);
  if (sameTuple(tuple(cfg.auditPath), verifiedTuple)) {
    validateCutoverState(cfg, preEvidence, 'idempotent verify');
    return { decision: 'CUTOVER_VERIFIED', writes: 0, audit: cfg.auditPath, audit_tuple: verifiedTuple };
  }
  requireTuple(cfg.auditPath, pendingTuple, 'verify pending audit');
  validateCutoverState(cfg, preEvidence, 'final');
  atomicReplaceExact(cfg.auditPath, pendingTuple, verifiedBytes, 0o644, 'verify audit CAS',
    () => injectCommitWindowRace(cfg, simulateCommitRaceAt, 'verify-audit', cfg.auditPath),
    'verify-audit',
    (point) => injectHardCrash(cfg, simulateHardCrashAt, `verify-audit-${point}`));
  return { decision: 'CUTOVER_VERIFIED', writes: 1, audit: cfg.auditPath, audit_tuple: tuple(cfg.auditPath) };
}

function reconcileRollbackOperations(cfg, evidence, pendingBytes, verifiedBytes) {
  const pendingTuple = tupleForBytes(pendingBytes, 0o644);
  const verifiedTuple = tupleForBytes(verifiedBytes, 0o644);
  reconcileReplaceExact(cfg.auditPath, pendingTuple, verifiedBytes, 0o644,
    'verify audit CAS', 'verify-audit', true);
  if (sameTuple(cfg.auditPreimageTuple, ABSENT)) {
    reconcileCreateExact(cfg.auditPath, pendingTuple, 'apply-audit', 'apply audit create', true);
  } else {
    reconcileReplaceExact(cfg.auditPath, cfg.auditPreimageTuple, pendingBytes, 0o644,
      'apply audit CAS', 'apply-audit', true);
  }
  const selected = cfg.targets.filter((target) => evidence.selected_targets.includes(target.id));
  for (const target of selected) {
    const adapterBytes = readFileSync(target.adapterPath);
    const adapterTuple = tupleForBytes(adapterBytes, 0o644);
    reconcileCreateExact(target.backupPath, target.legacyTuple, `apply-backup:${target.id}`, `${target.id} backup create`, true);
    reconcileReplaceExact(target.targetPath, target.legacyTuple, adapterBytes, 0o644,
      `${target.id} target CAS`, `apply-target:${target.id}`, true);
    reconcileReplaceTupleExact(target.targetPath, adapterTuple, target.legacyTuple,
      `${target.id} rollback target CAS`, `rollback-target:${target.id}`, true);
    reconcileRemoveExact(target.backupPath, target.legacyTuple, `${target.id} rollback cleanup`,
      `rollback-remove-backup:${target.id}`, true);
  }
  reconcileRemoveExact(cfg.auditPath, pendingTuple, 'pending audit rollback cleanup',
    'rollback-remove-audit:APPLIED_PENDING_VERIFY', true);
  reconcileRemoveExact(cfg.auditPath, verifiedTuple, 'verified audit rollback cleanup',
    'rollback-remove-audit:VERIFIED', true);
}

function rollbackTransaction(cfg, evidence, simulateCommitRaceAt = '', simulateHardCrashAt = '') {
  const pendingBytes = receiptBytes(cfg, evidence, 'APPLIED_PENDING_VERIFY');
  const verifiedBytes = receiptBytes(cfg, evidence, 'VERIFIED');
  reconcileRollbackOperations(cfg, evidence, pendingBytes, verifiedBytes);
  const pendingTuple = tupleForBytes(pendingBytes, 0o644);
  const verifiedTuple = tupleForBytes(verifiedBytes, 0o644);
  const auditTuple = tuple(cfg.auditPath);
  let knownAuditTuple = null;
  if (!sameTuple(auditTuple, ABSENT) && !sameTuple(auditTuple, cfg.auditPreimageTuple)) {
    if (sameTuple(auditTuple, pendingTuple)) knownAuditTuple = pendingTuple;
    else if (sameTuple(auditTuple, verifiedTuple)) knownAuditTuple = verifiedTuple;
    else fail(`rollback refuses a drifted or unrelated audit receipt: ${JSON.stringify({ path: cfg.auditPath, actual: auditTuple })}`);
  }
  const selected = [...cfg.targets.filter((target) => evidence.selected_targets.includes(target.id))].reverse();
  for (const target of selected) {
    const targetTuple = tuple(target.targetPath);
    const adapterTuple = regularFileTuple(target.adapterPath, `${target.id} adapter`);
    const backupTuple = tuple(target.backupPath);
    if (sameTuple(backupTuple, ABSENT)) {
      if (!sameTuple(targetTuple, target.legacyTuple)) fail(`${target.id} cannot roll back without backup`);
      continue;
    }
    requireTuple(target.backupPath, target.legacyTuple, `${target.id} rollback backup`);
    if (sameTuple(targetTuple, adapterTuple)) {
      atomicReplaceExact(target.targetPath, adapterTuple, readFileSync(target.backupPath), 0o644,
        `${target.id} rollback target CAS`, null, `rollback-target:${target.id}`,
        (point) => injectHardCrash(cfg, simulateHardCrashAt, `rollback-target-${point}:${target.id}`));
    }
    else if (!sameTuple(targetTuple, target.legacyTuple)) fail(`${target.id} target drifted before rollback`);
    requireTuple(target.targetPath, target.legacyTuple, `${target.id} restored target`);
  }
  for (const target of selected) {
    removeExact(target.backupPath, target.legacyTuple, `${target.id} rollback cleanup`,
      () => injectCommitWindowRace(cfg, simulateCommitRaceAt, `remove-backup:${target.id}`, target.backupPath),
      `rollback-remove-backup:${target.id}`,
      (point) => injectHardCrash(cfg, simulateHardCrashAt, `remove-backup-${point}:${target.id}`));
  }
  if (knownAuditTuple) {
    const state = sameTuple(knownAuditTuple, pendingTuple) ? 'APPLIED_PENDING_VERIFY' : 'VERIFIED';
    removeExact(cfg.auditPath, knownAuditTuple, 'audit rollback cleanup', null,
      `rollback-remove-audit:${state}`,
      (point) => injectHardCrash(cfg, simulateHardCrashAt, `remove-audit-${point}`));
  }
  return { decision: 'ROLLED_BACK', selected_targets: evidence.selected_targets };
}

function parseOptions(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined || options.has(key)) fail(`invalid option list near ${key || '<end>'}`);
    options.set(key, value);
  }
  return options;
}

function configFromOptions(options) {
  if (options.has('--fixture-config')) return fixtureConfig(options.get('--fixture-config'));
  return productionConfig(options.get('--repo'));
}

function requirePlan(options) {
  if (options.get('--plan-sha') !== PLAN_SHA) fail('--plan-sha must equal the approved plan SHA');
}

function runCli(command, options) {
  requirePlan(options);
  const cfg = configFromOptions(options);
  const preEvidence = loadEvidence(options.get('--evidence'), cfg, 'pre');
  if (command === 'inspect') return inspect(cfg, preEvidence);
  if (command === 'render-final-receipt') {
    const postEvidence = loadEvidence(options.get('--post-evidence'), cfg, 'post');
    assert.deepEqual(postEvidence.selected_targets, preEvidence.selected_targets, 'pre/post selected target drift');
    return { raw: receiptBytes(cfg, preEvidence, 'VERIFIED').toString('utf8') };
  }
  if (command === 'apply') {
    const crash = options.has('--simulate-crash-after') ? Number(options.get('--simulate-crash-after')) : 0;
    if (crash && !cfg.fixture) fail('--simulate-crash-after is test-only');
    if (!Number.isInteger(crash) || crash < 0 || crash > 2) fail('invalid --simulate-crash-after');
    const race = options.get('--simulate-race-at') || '';
    const allowedRaces = ['', 'audit', ...cfg.targets.flatMap((target) => [`backup:${target.id}`, `target:${target.id}`])];
    if (!allowedRaces.includes(race)) fail('invalid --simulate-race-at');
    if (race && !cfg.fixture) fail('--simulate-race-at is test-only');
    const commitRace = options.get('--simulate-commit-race-at') || '';
    const allowedCommitRaces = ['', 'apply-audit', ...cfg.targets.map((target) => `target:${target.id}`)];
    if (!allowedCommitRaces.includes(commitRace)) fail('invalid --simulate-commit-race-at');
    if (commitRace && !cfg.fixture) fail('--simulate-commit-race-at is test-only');
    const hardCrash = options.get('--simulate-hard-crash-at') || '';
    const allowedHardCrashes = ['', 'apply-audit-after-capture', 'apply-audit-after-install',
      ...cfg.targets.flatMap((target) => [
        `target-after-capture:${target.id}`,
        `target-after-install:${target.id}`,
      ])];
    if (!allowedHardCrashes.includes(hardCrash)) fail('invalid apply --simulate-hard-crash-at');
    if (hardCrash && !cfg.fixture) fail('--simulate-hard-crash-at is test-only');
    const cleanupRace = options.get('--simulate-cleanup-check-race-at') || '';
    const allowedCleanupRaces = ['', ...cfg.targets.map((target) => `target-recovery:${target.id}`)];
    if (!allowedCleanupRaces.includes(cleanupRace)) fail('invalid apply --simulate-cleanup-check-race-at');
    if (cleanupRace && !cfg.fixture) fail('--simulate-cleanup-check-race-at is test-only');
    return applyTransaction(cfg, preEvidence, crash, race, commitRace, hardCrash, cleanupRace);
  }
  if (command === 'verify') {
    const postEvidence = loadEvidence(options.get('--post-evidence'), cfg, 'post');
    const commitRace = options.get('--simulate-commit-race-at') || '';
    if (!['', 'verify-audit'].includes(commitRace)) fail('invalid verify --simulate-commit-race-at');
    if (commitRace && !cfg.fixture) fail('--simulate-commit-race-at is test-only');
    const hardCrash = options.get('--simulate-hard-crash-at') || '';
    if (!['', 'verify-audit-after-capture', 'verify-audit-after-install'].includes(hardCrash)) {
      fail('invalid verify --simulate-hard-crash-at');
    }
    if (hardCrash && !cfg.fixture) fail('--simulate-hard-crash-at is test-only');
    return verifyTransaction(cfg, preEvidence, postEvidence, commitRace, hardCrash);
  }
  if (command === 'rollback') {
    const commitRace = options.get('--simulate-commit-race-at') || '';
    const allowed = ['', ...cfg.targets.map((target) => `remove-backup:${target.id}`)];
    if (!allowed.includes(commitRace)) fail('invalid rollback --simulate-commit-race-at');
    if (commitRace && !cfg.fixture) fail('--simulate-commit-race-at is test-only');
    const hardCrash = options.get('--simulate-hard-crash-at') || '';
    const allowedHardCrashes = ['', 'remove-audit-after-capture', ...cfg.targets.flatMap((target) => [
      `rollback-target-after-capture:${target.id}`,
      `rollback-target-after-install:${target.id}`,
      `remove-backup-after-capture:${target.id}`,
    ])];
    if (!allowedHardCrashes.includes(hardCrash)) fail('invalid rollback --simulate-hard-crash-at');
    if (hardCrash && !cfg.fixture) fail('--simulate-hard-crash-at is test-only');
    return rollbackTransaction(cfg, preEvidence, commitRace, hardCrash);
  }
  fail(`unknown command: ${command}`);
}

function fixtureEvidence(cfg, selectedTargets, phase) {
  const selected = new Set(selectedTargets);
  const resolver = cfg.targets[0];
  const debuggerTarget = cfg.targets[1];
  const resolverCanonical = tuple(resolver.canonicalPath);
  const debugCanonical = tuple(debuggerTarget.canonicalPath);
  const resolverAdapter = tuple(resolver.adapterPath);
  const debugAdapter = tuple(debuggerTarget.adapterPath);
  const probes = [];
  for (const harness of ['claude', 'codex']) {
    if (selected.has(resolver.id) && phase === 'pre') {
      probes.push({ harness, skill: resolver.id, scope: 'personal', resolved_path: resolver.targetPath, resolved_sha256: resolver.legacyTuple.sha256 });
    } else if (selected.has(resolver.id) && phase === 'post' && harness === 'claude') {
      probes.push({ harness, skill: resolver.id, scope: 'personal', resolved_path: resolver.targetPath, resolved_sha256: resolverAdapter.sha256 });
    } else {
      probes.push({ harness, skill: resolver.id, scope: 'project', resolved_path: resolver.canonicalPath, resolved_sha256: resolverCanonical.sha256 });
    }
  }
  probes.push({ harness: 'codex', skill: 'diagnosing-bugs', scope: 'project', resolved_path: debuggerTarget.canonicalPath, resolved_sha256: debugCanonical.sha256 });
  if (selected.has(debuggerTarget.id)) {
    probes.push({ harness: 'codex', skill: debuggerTarget.id, scope: 'personal', resolved_path: debuggerTarget.targetPath,
      resolved_sha256: phase === 'pre' ? debuggerTarget.legacyTuple.sha256 : debugAdapter.sha256 });
  } else {
    probes.push({ harness: 'codex', skill: debuggerTarget.id, scope: 'absent', resolved_path: null, resolved_sha256: '-' });
  }
  return { schema_version: 1, plan_sha256: PLAN_SHA, phase, selected_targets: selectedTargets, probes };
}

function writeJson(path, value) { atomicCreate(path, Buffer.from(`${JSON.stringify(value, null, 2)}\n`), 0o644); }

function createScenario(root, name, candidateRoot, auditPreimageBytes = null) {
  const scenario = mkdtempSync(join(root, `${name}-`));
  const repo = join(scenario, 'repo');
  const personal = join(scenario, 'personal');
  mkdirSync(repo, { recursive: true });
  mkdirSync(personal, { recursive: true });
  const targetSpecs = [
    {
      id: 'resolving-merge-conflicts',
      legacy: Buffer.from('---\nname: resolving-merge-conflicts\n---\n# Legacy resolver stub\n'),
      adapterSource: join(candidateRoot, '.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md'),
      canonical: Buffer.from('---\nname: resolving-merge-conflicts\n---\n# Resolving Merge Conflicts\n'),
    },
    {
      id: 'systematic-debugging',
      legacy: Buffer.from('---\nname: systematic-debugging\n---\n# Systematic Debugging\n'),
      adapterSource: join(candidateRoot, '.claude/skill-os/compat/systematic-debugging/SKILL.md'),
      canonical: Buffer.from('---\nname: diagnosing-bugs\n---\n# Diagnosing Bugs\n'),
    },
  ];
  const targets = targetSpecs.map((spec) => {
    const targetPath = join(personal, spec.id, 'SKILL.md');
    const backupPath = join(personal, '.luca-backups', PLAN_SHA, `${spec.id}.SKILL.md`);
    const adapterPath = join(repo, 'compat', spec.id, 'SKILL.md');
    const canonicalPath = join(repo, 'canonical', spec.id, 'SKILL.md');
    atomicCreate(targetPath, spec.legacy, 0o644);
    atomicCreate(adapterPath, readFileSync(spec.adapterSource), 0o644);
    atomicCreate(canonicalPath, spec.canonical, 0o644);
    return {
      id: spec.id,
      target_path: targetPath,
      backup_path: backupPath,
      adapter_path: adapterPath,
      canonical_path: canonicalPath,
      legacy_sha256: sha256(spec.legacy),
    };
  });
  const auditPath = join(personal, 'audit.json');
  if (auditPreimageBytes) atomicCreate(auditPath, auditPreimageBytes, 0o644);
  const configPath = join(scenario, 'fixture-config.json');
  writeJson(configPath, {
    schema_version: 1,
    plan_sha256: PLAN_SHA,
    root: scenario,
    repo_root: repo,
    audit_path: auditPath,
    ...(auditPreimageBytes ? { audit_preimage_sha256: sha256(auditPreimageBytes) } : {}),
    targets,
  });
  const cfg = fixtureConfig(configPath, true);
  return { scenario, configPath, cfg };
}

function child(command, fixture, preEvidencePath, extras = []) {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, command,
    '--plan-sha', PLAN_SHA,
    '--fixture-config', fixture.configPath,
    '--evidence', preEvidencePath,
    ...extras,
  ], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', LUCA_CUTOVER_TEST_FIXTURE: '1' },
  });
  return result;
}

function assertChild(result, status, label) {
  assert.equal(result.status, status, `${label}: ${result.stderr || result.stdout}`);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

function assertNoTransactionResidues(cfg) {
  const paths = new Set();
  const add = (kind, path, operationKey, expected, postimage) => {
    const slots = deterministicOperationPaths(kind, path, operationKey, expected, postimage);
    paths.add(slots.stage);
    paths.add(slots.recovery);
    if (kind === 'create') {
      paths.add(deterministicCleanupPath(slots.stage, postimage, `create-stage:${operationKey}`));
    } else if (kind === 'replace') {
      paths.add(deterministicCleanupPath(slots.stage, postimage, `replace-stage:${operationKey}`));
      paths.add(deterministicCleanupPath(slots.recovery, expected, `replace-recovery:${operationKey}`));
    } else {
      paths.add(deterministicCleanupPath(slots.recovery, expected, `remove-recovery:${operationKey}`));
    }
  };
  for (const target of cfg.targets) {
    const adapterTuple = regularFileTuple(target.adapterPath, `${target.id} residue adapter`);
    add('create', target.backupPath, `apply-backup:${target.id}`, ABSENT, target.legacyTuple);
    add('replace', target.targetPath, `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    add('replace', target.targetPath, `rollback-target:${target.id}`, adapterTuple, target.legacyTuple);
    add('remove', target.backupPath, `rollback-remove-backup:${target.id}`, target.legacyTuple, ABSENT);
  }
  for (let mask = 0; mask < 4; mask++) {
    const selectedTargets = cfg.targets.filter((_target, index) => mask & (1 << index)).map((target) => target.id);
    const evidence = { selected_targets: selectedTargets };
    const pendingTuple = tupleForBytes(receiptBytes(cfg, evidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    const verifiedTuple = tupleForBytes(receiptBytes(cfg, evidence, 'VERIFIED'), 0o644);
    add(sameTuple(cfg.auditPreimageTuple, ABSENT) ? 'create' : 'replace', cfg.auditPath, 'apply-audit',
      cfg.auditPreimageTuple, pendingTuple);
    add('replace', cfg.auditPath, 'verify-audit', pendingTuple, verifiedTuple);
    add('remove', cfg.auditPath, 'rollback-remove-audit:APPLIED_PENDING_VERIFY', pendingTuple, ABSENT);
    add('remove', cfg.auditPath, 'rollback-remove-audit:VERIFIED', verifiedTuple, ABSENT);
  }
  for (const path of paths) requireTuple(path, ABSENT, 'deterministic transient residue');
}

function assertRestored(fixture) {
  for (const target of fixture.cfg.targets) {
    requireTuple(target.targetPath, target.legacyTuple, `${target.id} self-test restore`);
    requireTuple(target.backupPath, ABSENT, `${target.id} self-test backup cleanup`);
  }
  requireTuple(fixture.cfg.auditPath, ABSENT, 'self-test audit cleanup');
  assertNoTransactionResidues(fixture.cfg);
}

function selfTest(rootArgument, candidateRootArgument) {
  if (!rootArgument) fail('self-test requires --scratch-root');
  if (!candidateRootArgument) fail('self-test requires --candidate-root');
  const root = resolve(rootArgument);
  const candidateRoot = resolve(candidateRootArgument);
  if (!insideApprovedTemp(root) || existsSync(root)) fail('self-test scratch root must be a new child of an approved OS temp directory');
  for (const path of [
    '.claude/skill-os/compat/resolving-merge-conflicts/SKILL.md',
    '.claude/skill-os/compat/systematic-debugging/SKILL.md',
  ]) regularFileTuple(join(candidateRoot, path), `self-test candidate ${path}`);
  mkdirSync(root, { recursive: false, mode: 0o700 });
  const results = [];

  {
    const fixture = createScenario(root, 'no-collision', candidateRoot);
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [], 'pre'));
    assertChild(child('apply', fixture, pre), 0, 'no collision apply');
    assertRestored(fixture);
    results.push({ scenario: 'no collision no-op', status: 'PASS' });
  }

  for (const id of ['resolving-merge-conflicts', 'systematic-debugging']) {
    const fixture = createScenario(root, `${id}-shadow`, candidateRoot);
    const pre = join(fixture.scenario, 'pre.json');
    const post = join(fixture.scenario, 'post.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [id], 'pre'));
    writeJson(post, fixtureEvidence(fixture.cfg, [id], 'post'));
    assertChild(child('apply', fixture, pre), 0, `${id} apply`);
    assertNoTransactionResidues(fixture.cfg);
    assertChild(child('verify', fixture, pre, ['--post-evidence', post]), 0, `${id} verify`);
    assertNoTransactionResidues(fixture.cfg);
    assertChild(child('rollback', fixture, pre), 0, `${id} rollback`);
    assertChild(child('rollback', fixture, pre), 0, `${id} rollback idempotence`);
    assertRestored(fixture);
    results.push({ scenario: `${id} shadow`, status: 'PASS' });
  }

  for (const crashAfter of [1, 2]) {
    const fixture = createScenario(root, `crash-after-${crashAfter}`, candidateRoot);
    const selected = fixture.cfg.targets.map((target) => target.id);
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, selected, 'pre'));
    const crashed = child('apply', fixture, pre, ['--simulate-crash-after', String(crashAfter)]);
    assert.equal(crashed.status, 86, `crash after ${crashAfter} must use exit 86: ${crashed.stderr}`);
    assert.match(crashed.stderr, new RegExp(`SIMULATED_CRASH_AFTER_TARGET_${crashAfter}`));
    assertChild(child('rollback', fixture, pre), 0, `crash after ${crashAfter} rollback`);
    assertChild(child('rollback', fixture, pre), 0, `crash after ${crashAfter} rollback idempotence`);
    assertRestored(fixture);
    results.push({ scenario: `crash after target ${crashAfter}`, status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'backup-exists', candidateRoot);
    const target = fixture.cfg.targets[1];
    atomicCreate(target.backupPath, readFileSync(target.targetPath), 0o644);
    const pre = join(fixture.scenario, 'pre.json');
    const post = join(fixture.scenario, 'post.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    writeJson(post, fixtureEvidence(fixture.cfg, [target.id], 'post'));
    assertChild(child('apply', fixture, pre), 0, 'existing backup apply');
    assertChild(child('verify', fixture, pre, ['--post-evidence', post]), 0, 'existing backup verify');
    assertChild(child('rollback', fixture, pre), 0, 'existing backup rollback');
    assertRestored(fixture);
    results.push({ scenario: 'backup exists', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'audit-create-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const preEvidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, preEvidence);
    const foreignAudit = Buffer.from('{"owner":"foreign-racer"}\n');
    atomicCreate(fixture.cfg.auditPath, foreignAudit, 0o644);
    const foreignTuple = tuple(fixture.cfg.auditPath);
    const raced = child('apply', fixture, pre);
    assert.notEqual(raced.status, 0, 'apply must refuse an audit create race');
    requireTuple(fixture.cfg.auditPath, foreignTuple, 'audit create race preservation');
    requireTuple(target.targetPath, target.legacyTuple, 'audit create race target preservation');
    requireTuple(target.backupPath, ABSENT, 'audit create race backup preservation');
    removeExact(fixture.cfg.auditPath, foreignTuple, 'audit create race fixture cleanup');
    assertRestored(fixture);
    results.push({ scenario: 'audit create race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'backup-atomic-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const racePoint = `backup:${target.id}`;
    const raced = child('apply', fixture, pre, ['--simulate-race-at', racePoint]);
    assert.notEqual(raced.status, 0, 'apply must refuse an atomic backup create race');
    const foreignTuple = tupleForBytes(Buffer.from(`FOREIGN_RACE:${racePoint}\n`), 0o644);
    requireTuple(target.backupPath, foreignTuple, 'backup create race preservation');
    requireTuple(target.targetPath, target.legacyTuple, 'backup create race target preservation');
    requireTuple(fixture.cfg.auditPath, ABSENT, 'backup create race audit preservation');
    removeExact(target.backupPath, foreignTuple, 'backup create race fixture cleanup');
    assertRestored(fixture);
    results.push({ scenario: 'backup atomic create race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'target-cas-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const racePoint = `target:${target.id}`;
    const raced = child('apply', fixture, pre, ['--simulate-race-at', racePoint]);
    assert.notEqual(raced.status, 0, 'apply must refuse a target CAS race');
    const foreignTuple = tupleForBytes(Buffer.from(`FOREIGN_RACE:${racePoint}\n`), 0o644);
    requireTuple(target.targetPath, foreignTuple, 'target CAS race preservation');
    requireTuple(target.backupPath, target.legacyTuple, 'target CAS race backup preservation');
    requireTuple(fixture.cfg.auditPath, ABSENT, 'target CAS race audit preservation');
    atomicReplaceExact(target.targetPath, foreignTuple, readFileSync(target.backupPath), 0o644, 'target CAS race fixture restore');
    assertChild(child('rollback', fixture, pre), 0, 'target CAS race rollback');
    assertRestored(fixture);
    results.push({ scenario: 'target CAS race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'audit-atomic-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const raced = child('apply', fixture, pre, ['--simulate-race-at', 'audit']);
    assert.notEqual(raced.status, 0, 'apply must refuse an atomic audit create race');
    const foreignTuple = tupleForBytes(Buffer.from('FOREIGN_RACE:audit\n'), 0o644);
    requireTuple(fixture.cfg.auditPath, foreignTuple, 'audit atomic race preservation');
    requireTuple(target.targetPath, regularFileTuple(target.adapterPath, 'audit race adapter'), 'audit race target postimage');
    requireTuple(target.backupPath, target.legacyTuple, 'audit race backup postimage');
    removeExact(fixture.cfg.auditPath, foreignTuple, 'audit atomic race fixture cleanup');
    assertChild(child('rollback', fixture, pre), 0, 'audit atomic race rollback');
    assertRestored(fixture);
    results.push({ scenario: 'audit atomic create race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'audit-verify-drift', candidateRoot);
    const target = fixture.cfg.targets[1];
    const preEvidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const postEvidence = fixtureEvidence(fixture.cfg, [target.id], 'post');
    const pre = join(fixture.scenario, 'pre.json');
    const post = join(fixture.scenario, 'post.json');
    writeJson(pre, preEvidence);
    writeJson(post, postEvidence);
    assertChild(child('apply', fixture, pre), 0, 'verify drift apply');
    const drift = Buffer.from('{"plan_sha256":"drift-before-verify","state":"APPLIED_PENDING_VERIFY"}\n');
    fixtureReplace(fixture.cfg.auditPath, drift, 0o644);
    const driftTuple = tuple(fixture.cfg.auditPath);
    const verified = child('verify', fixture, pre, ['--post-evidence', post]);
    assert.notEqual(verified.status, 0, 'verify must refuse a drifted pending audit');
    requireTuple(fixture.cfg.auditPath, driftTuple, 'verify audit drift preservation');
    fixtureReplace(fixture.cfg.auditPath, receiptBytes(fixture.cfg, preEvidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    assertChild(child('rollback', fixture, pre), 0, 'verify drift rollback');
    assertRestored(fixture);
    results.push({ scenario: 'audit verify drift', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'audit-rollback-drift', candidateRoot);
    const target = fixture.cfg.targets[1];
    const preEvidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, preEvidence);
    assertChild(child('apply', fixture, pre), 0, 'rollback drift apply');
    const drift = Buffer.from(`${JSON.stringify({
      plan_sha256: PLAN_SHA,
      state: 'VERIFIED',
      owner: 'foreign-drift',
    })}\n`);
    fixtureReplace(fixture.cfg.auditPath, drift, 0o644);
    const driftTuple = tuple(fixture.cfg.auditPath);
    const rolledBack = child('rollback', fixture, pre);
    assert.notEqual(rolledBack.status, 0, 'rollback must refuse a drifted audit');
    requireTuple(fixture.cfg.auditPath, driftTuple, 'rollback audit drift preservation');
    requireTuple(target.targetPath, regularFileTuple(target.adapterPath, 'rollback drift adapter'), 'rollback drift target preservation');
    requireTuple(target.backupPath, target.legacyTuple, 'rollback drift backup preservation');
    fixtureReplace(fixture.cfg.auditPath, receiptBytes(fixture.cfg, preEvidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    assertChild(child('rollback', fixture, pre), 0, 'rollback drift recovery');
    assertRestored(fixture);
    results.push({ scenario: 'audit rollback drift', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'target-commit-window-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const racePoint = `target:${target.id}`;
    const raced = child('apply', fixture, pre, ['--simulate-commit-race-at', racePoint]);
    assert.notEqual(raced.status, 0, 'target commit-window race must fail closed');
    const foreignTuple = tupleForBytes(Buffer.from(`FOREIGN_COMMIT_WINDOW:${racePoint}\n`), 0o644);
    requireTuple(target.targetPath, foreignTuple, 'target commit-window foreign preservation');
    const recoveryMatch = raced.stderr.match(/RECOVERY_PATH=([^\s;]+)/);
    assert.ok(recoveryMatch, `target commit-window failure must expose recovery path: ${raced.stderr}`);
    requireTuple(recoveryMatch[1], target.legacyTuple, 'target commit-window captured preimage');
    removeExact(target.targetPath, foreignTuple, 'target commit-window fixture foreign cleanup');
    assertChild(child('apply', fixture, pre), 0, 'target commit-window retry');
    assertChild(child('rollback', fixture, pre), 0, 'target commit-window rollback');
    assertRestored(fixture);
    results.push({ scenario: 'target commit-window race', status: 'PASS' });
  }

  {
    const auditPreimageBytes = Buffer.from('{"fixture":"apply-audit-preimage"}\n');
    const fixture = createScenario(root, 'apply-audit-commit-window-race', candidateRoot, auditPreimageBytes);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const raced = child('apply', fixture, pre, ['--simulate-commit-race-at', 'apply-audit']);
    assert.notEqual(raced.status, 0, 'apply audit commit-window race must fail closed');
    const foreignTuple = tupleForBytes(Buffer.from('FOREIGN_COMMIT_WINDOW:apply-audit\n'), 0o644);
    requireTuple(fixture.cfg.auditPath, foreignTuple, 'apply audit commit-window foreign preservation');
    const recoveryMatch = raced.stderr.match(/RECOVERY_PATH=([^\s;]+)/);
    assert.ok(recoveryMatch, `apply audit failure must expose recovery path: ${raced.stderr}`);
    requireTuple(recoveryMatch[1], fixture.cfg.auditPreimageTuple, 'apply audit captured preimage');
    removeExact(fixture.cfg.auditPath, foreignTuple, 'apply audit fixture foreign cleanup');
    assertChild(child('apply', fixture, pre), 0, 'apply audit commit-window retry');
    assertChild(child('rollback', fixture, pre), 0, 'apply audit commit-window rollback');
    assertRestored(fixture);
    results.push({ scenario: 'apply audit commit-window race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'verify-audit-commit-window-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const preEvidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    const post = join(fixture.scenario, 'post.json');
    writeJson(pre, preEvidence);
    writeJson(post, fixtureEvidence(fixture.cfg, [target.id], 'post'));
    assertChild(child('apply', fixture, pre), 0, 'verify audit window apply');
    const pendingTuple = tupleForBytes(receiptBytes(fixture.cfg, preEvidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    const raced = child('verify', fixture, pre, ['--post-evidence', post, '--simulate-commit-race-at', 'verify-audit']);
    assert.notEqual(raced.status, 0, 'verify audit commit-window race must fail closed');
    const foreignTuple = tupleForBytes(Buffer.from('FOREIGN_COMMIT_WINDOW:verify-audit\n'), 0o644);
    requireTuple(fixture.cfg.auditPath, foreignTuple, 'verify audit commit-window foreign preservation');
    const recoveryMatch = raced.stderr.match(/RECOVERY_PATH=([^\s;]+)/);
    assert.ok(recoveryMatch, `verify audit failure must expose recovery path: ${raced.stderr}`);
    requireTuple(recoveryMatch[1], pendingTuple, 'verify audit captured pending receipt');
    removeExact(fixture.cfg.auditPath, foreignTuple, 'verify audit fixture foreign cleanup');
    assertChild(child('verify', fixture, pre, ['--post-evidence', post]), 0, 'verify audit commit-window retry');
    assertChild(child('rollback', fixture, pre), 0, 'verify audit commit-window rollback');
    assertRestored(fixture);
    results.push({ scenario: 'verify audit commit-window race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'rollback-remove-commit-window-race', candidateRoot);
    const target = fixture.cfg.targets[1];
    const preEvidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, preEvidence);
    assertChild(child('apply', fixture, pre), 0, 'rollback remove window apply');
    const racePoint = `remove-backup:${target.id}`;
    const raced = child('rollback', fixture, pre, ['--simulate-commit-race-at', racePoint]);
    assert.notEqual(raced.status, 0, 'rollback remove commit-window race must fail closed');
    const foreignTuple = tupleForBytes(Buffer.from(`FOREIGN_COMMIT_WINDOW:${racePoint}\n`), 0o644);
    requireTuple(target.backupPath, foreignTuple, 'rollback remove foreign preservation');
    const recoveryMatch = raced.stderr.match(/RECOVERY_PATH=([^\s;]+)/);
    assert.ok(recoveryMatch, `rollback remove failure must expose recovery path: ${raced.stderr}`);
    requireTuple(recoveryMatch[1], target.legacyTuple, 'rollback remove captured backup');
    requireTuple(target.targetPath, target.legacyTuple, 'rollback remove restored target');
    const pendingTuple = tupleForBytes(receiptBytes(fixture.cfg, preEvidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    requireTuple(fixture.cfg.auditPath, pendingTuple, 'rollback remove preserved pending audit');
    removeExact(target.backupPath, foreignTuple, 'rollback remove fixture foreign cleanup');
    assertChild(child('rollback', fixture, pre), 0, 'rollback remove commit-window recovery');
    assertRestored(fixture);
    results.push({ scenario: 'rollback remove commit-window race', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'hard-crash-target-capture', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    const evidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    writeJson(pre, evidence);
    const adapterTuple = regularFileTuple(target.adapterPath, 'target capture adapter');
    const slots = deterministicOperationPaths('replace', target.targetPath, `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    const crashed = child('apply', fixture, pre, ['--simulate-hard-crash-at', `target-after-capture:${target.id}`]);
    assert.equal(crashed.signal, 'SIGKILL', `target capture crash must be a real SIGKILL: ${crashed.stderr || crashed.stdout}`);
    requireTuple(target.targetPath, ABSENT, 'target capture crash target');
    requireTuple(slots.stage, adapterTuple, 'target capture crash stage');
    requireTuple(slots.recovery, target.legacyTuple, 'target capture crash recovery');
    assertChild(child('apply', fixture, pre), 0, 'target capture crash apply retry');
    assertNoTransactionResidues(fixture.cfg);
    assertChild(child('rollback', fixture, pre), 0, 'target capture crash rollback');
    assertRestored(fixture);
    results.push({ scenario: 'hard crash target capture retry', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'hard-crash-target-install', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const adapterTuple = regularFileTuple(target.adapterPath, 'target install adapter');
    const slots = deterministicOperationPaths('replace', target.targetPath, `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    const crashed = child('apply', fixture, pre, ['--simulate-hard-crash-at', `target-after-install:${target.id}`]);
    assert.equal(crashed.signal, 'SIGKILL', `target install crash must be a real SIGKILL: ${crashed.stderr || crashed.stdout}`);
    requireTuple(target.targetPath, adapterTuple, 'target install crash postimage');
    requireTuple(slots.stage, ABSENT, 'target install crash consumed stage');
    requireTuple(slots.recovery, target.legacyTuple, 'target install crash recovery');
    assertChild(child('apply', fixture, pre), 0, 'target install crash apply retry');
    assertNoTransactionResidues(fixture.cfg);
    assertChild(child('rollback', fixture, pre), 0, 'target install crash rollback');
    assertRestored(fixture);
    results.push({ scenario: 'hard crash target install retry', status: 'PASS' });
  }

  {
    const auditPreimageBytes = Buffer.from('{"fixture":"hard-crash-audit-preimage"}\n');
    const fixture = createScenario(root, 'hard-crash-apply-audit', candidateRoot, auditPreimageBytes);
    const target = fixture.cfg.targets[1];
    const evidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, evidence);
    const pendingTuple = tupleForBytes(receiptBytes(fixture.cfg, evidence, 'APPLIED_PENDING_VERIFY'), 0o644);
    const slots = deterministicOperationPaths('replace', fixture.cfg.auditPath, 'apply-audit', fixture.cfg.auditPreimageTuple, pendingTuple);
    const crashed = child('apply', fixture, pre, ['--simulate-hard-crash-at', 'apply-audit-after-capture']);
    assert.equal(crashed.signal, 'SIGKILL', `apply audit crash must be a real SIGKILL: ${crashed.stderr || crashed.stdout}`);
    requireTuple(fixture.cfg.auditPath, ABSENT, 'apply audit crash target');
    requireTuple(slots.stage, pendingTuple, 'apply audit crash stage');
    requireTuple(slots.recovery, fixture.cfg.auditPreimageTuple, 'apply audit crash recovery');
    assertChild(child('apply', fixture, pre), 0, 'apply audit crash retry');
    assertNoTransactionResidues(fixture.cfg);
    assertChild(child('rollback', fixture, pre), 0, 'apply audit crash rollback');
    assertRestored(fixture);
    results.push({ scenario: 'hard crash apply audit retry', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'hard-crash-remove-backup', candidateRoot);
    const target = fixture.cfg.targets[1];
    const evidence = fixtureEvidence(fixture.cfg, [target.id], 'pre');
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, evidence);
    assertChild(child('apply', fixture, pre), 0, 'remove backup crash apply');
    const slots = deterministicOperationPaths('remove', target.backupPath, `rollback-remove-backup:${target.id}`, target.legacyTuple, ABSENT);
    const crashed = child('rollback', fixture, pre, ['--simulate-hard-crash-at', `remove-backup-after-capture:${target.id}`]);
    assert.equal(crashed.signal, 'SIGKILL', `remove backup crash must be a real SIGKILL: ${crashed.stderr || crashed.stdout}`);
    requireTuple(target.backupPath, ABSENT, 'remove backup crash target');
    requireTuple(slots.recovery, target.legacyTuple, 'remove backup crash recovery');
    assertChild(child('rollback', fixture, pre), 0, 'remove backup crash rollback retry');
    assertRestored(fixture);
    results.push({ scenario: 'hard crash remove retry', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'deterministic-stage-drift', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const adapterTuple = regularFileTuple(target.adapterPath, 'stage drift adapter');
    const slots = deterministicOperationPaths('replace', target.targetPath, `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    const foreignBytes = Buffer.from('FOREIGN_DETERMINISTIC_STAGE\n');
    atomicCreate(slots.stage, foreignBytes, 0o644);
    const foreignTuple = tuple(slots.stage);
    const raced = child('apply', fixture, pre);
    assert.notEqual(raced.status, 0, 'foreign deterministic stage must fail closed');
    assert.match(raced.stderr, new RegExp(`STAGE_PATH=${escapeRegExp(slots.stage)}`));
    requireTuple(slots.stage, foreignTuple, 'foreign deterministic stage preservation');
    requireTuple(target.targetPath, target.legacyTuple, 'stage drift target preservation');
    requireTuple(target.backupPath, ABSENT, 'stage drift backup preservation');
    requireTuple(fixture.cfg.auditPath, ABSENT, 'stage drift audit preservation');
    removeExact(slots.stage, foreignTuple, 'stage drift fixture cleanup');
    assertRestored(fixture);
    results.push({ scenario: 'deterministic stage drift fail closed', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'deterministic-recovery-drift', candidateRoot);
    const target = fixture.cfg.targets[1];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const adapterTuple = regularFileTuple(target.adapterPath, 'recovery drift adapter');
    const slots = deterministicOperationPaths('replace', target.targetPath, `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    const foreignBytes = Buffer.from('FOREIGN_DETERMINISTIC_RECOVERY\n');
    atomicCreate(slots.recovery, foreignBytes, 0o644);
    const foreignTuple = tuple(slots.recovery);
    const raced = child('apply', fixture, pre);
    assert.notEqual(raced.status, 0, 'foreign deterministic recovery must fail closed');
    assert.match(raced.stderr, new RegExp(`RECOVERY_PATH=${escapeRegExp(slots.recovery)}`));
    requireTuple(slots.recovery, foreignTuple, 'foreign deterministic recovery preservation');
    requireTuple(target.targetPath, target.legacyTuple, 'recovery drift target preservation');
    requireTuple(target.backupPath, ABSENT, 'recovery drift backup preservation');
    requireTuple(fixture.cfg.auditPath, ABSENT, 'recovery drift audit preservation');
    removeExact(slots.recovery, foreignTuple, 'recovery drift fixture cleanup');
    assertRestored(fixture);
    results.push({ scenario: 'deterministic recovery drift fail closed', status: 'PASS' });
  }

  {
    const fixture = createScenario(root, 'cleanup-check-window-replacement', candidateRoot);
    const target = fixture.cfg.targets[1];
    const unselected = fixture.cfg.targets[0];
    const pre = join(fixture.scenario, 'pre.json');
    writeJson(pre, fixtureEvidence(fixture.cfg, [target.id], 'pre'));
    const racePoint = `target-recovery:${target.id}`;
    const adapterTuple = regularFileTuple(target.adapterPath, 'cleanup check-window adapter');
    const operation = deterministicOperationPaths('replace', target.targetPath,
      `apply-target:${target.id}`, target.legacyTuple, adapterTuple);
    const cleanup = deterministicCleanupPath(operation.recovery, target.legacyTuple,
      `replace-recovery:apply-target:${target.id}`);
    const preserved = cleanupCheckRacePreservePath(operation.recovery, target.legacyTuple, racePoint);
    const foreignTuple = tupleForBytes(cleanupCheckRaceBytes(racePoint), 0o644);
    const raced = child('apply', fixture, pre, ['--simulate-cleanup-check-race-at', racePoint]);
    assert.notEqual(raced.status, 0, 'cleanup check-window replacement must fail closed');
    assert.match(raced.stderr, new RegExp(`CLEANUP_PATH=${escapeRegExp(cleanup)}`));
    requireTuple(operation.recovery, foreignTuple, 'cleanup check-window foreign source preservation');
    requireTuple(cleanup, ABSENT, 'cleanup check-window owned slot restored empty');
    requireTuple(preserved, target.legacyTuple, 'cleanup check-window exact preimage preservation');
    requireTuple(target.targetPath, adapterTuple, 'cleanup check-window committed target preservation');
    requireTuple(target.backupPath, target.legacyTuple, 'cleanup check-window selected backup preservation');
    requireTuple(unselected.targetPath, unselected.legacyTuple, 'cleanup check-window unselected target preservation');
    requireTuple(unselected.backupPath, ABSENT, 'cleanup check-window unselected backup preservation');
    requireTuple(fixture.cfg.auditPath, ABSENT, 'cleanup check-window audit preservation');
    removeExact(operation.recovery, foreignTuple, 'cleanup check-window fixture foreign cleanup');
    renameExclusive(preserved, operation.recovery, 'cleanup check-window fixture exact recovery restore');
    assertChild(child('apply', fixture, pre), 0, 'cleanup check-window retry apply');
    assertChild(child('rollback', fixture, pre), 0, 'cleanup check-window retry rollback');
    requireTuple(cleanup, ABSENT, 'cleanup check-window retry cleanup slot residue');
    requireTuple(preserved, ABSENT, 'cleanup check-window fixture preserve residue');
    assertRestored(fixture);
    results.push({ scenario: 'cleanup check-window replacement preservation', status: 'PASS' });
  }

  return { schema_version: 1, plan_sha256: PLAN_SHA, state: 'PASS', results };
}

const [command, ...rest] = process.argv.slice(2);
try {
  let result;
  if (command === 'self-test') {
    const options = parseOptions(rest);
    result = selfTest(options.get('--scratch-root'), options.get('--candidate-root'));
  } else {
    result = runCli(command, parseOptions(rest));
  }
  if (result?.raw !== undefined) process.stdout.write(result.raw);
  else process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`FAIL\tskill-cutover-transaction\t${error.stack || error}\n`);
  process.exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
}
