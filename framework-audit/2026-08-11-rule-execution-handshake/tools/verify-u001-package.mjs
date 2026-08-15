#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = resolve(packageRoot, '..', '..');
const descriptorPath = join(packageRoot, 'execution', 'G-PACKAGE-DESCRIPTOR.json');
const baselinePath = join(packageRoot, 'execution', 'U-001-BASELINE.json');
const descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8'));
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const args = new Set(process.argv.slice(2));

function fail(message) {
  process.stderr.write(`U001_PACKAGE_FAIL: ${message}\n`);
  process.exit(1);
}

function run(cwd, commandArgs) {
  return execFileSync('git', commandArgs, { cwd, encoding: 'utf8' }).trim();
}

function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fileSha(root, path) {
  return sha(readFileSync(join(root, path)));
}

function sorted(values) {
  return [...values].sort();
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${expected}, got ${actual}`);
}

function assertArray(actual, expected, label) {
  const left = JSON.stringify(sorted(actual));
  const right = JSON.stringify(sorted(expected));
  if (left !== right) fail(`${label}: expected ${right}, got ${left}`);
}

function validateDescriptor() {
  assertEqual(descriptor.schema_version, 1, 'schema_version');
  assertEqual(descriptor.plan_id, 'REX-20260811-001', 'plan_id');
  assertEqual(descriptor.gate, 'G-PACKAGE', 'gate');
  assertEqual(descriptor.parent, baseline.head, 'parent/baseline');
  if (Date.now() >= Date.parse(descriptor.expires_at)) fail('descriptor expired');
  const entryPaths = descriptor.commit_entries.map((entry) => entry.path);
  if (new Set(entryPaths).size !== entryPaths.length) fail('duplicate commit entry');
  assertArray(descriptor.exact_changed_paths, [descriptor.self_path, ...entryPaths], 'exact changed paths');
  const dirtyPaths = new Set(baseline.tracked_dirty.map((entry) => entry.path));
  const patchTargetPaths = new Set(descriptor.patch_targets.map((entry) => entry.path));
  const packagePrefix = 'framework-audit/2026-08-11-rule-execution-handshake/';
  for (const entry of descriptor.commit_entries) {
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) fail(`bad hash for ${entry.path}`);
    if (dirtyPaths.has(entry.path)) fail(`baseline dirty path cannot become a package member: ${entry.path}`);
    if (!entry.path.startsWith(packagePrefix) && !patchTargetPaths.has(entry.path)) {
      fail(`path is outside the frozen package boundary: ${entry.path}`);
    }
  }
  if (!descriptor.self_path.startsWith(packagePrefix)) fail('descriptor self path is outside package boundary');
}

function validateCanonicalUnrelated() {
  assertEqual(run(baseline.repo, ['rev-parse', 'HEAD']), baseline.head, 'canonical HEAD drift');
  assertEqual(run(baseline.repo, ['diff', '--cached', '--binary']).length, 0, 'canonical index is not empty');
  for (const entry of baseline.tracked_dirty) {
    assertEqual(fileSha(baseline.repo, entry.path), entry.worktree_sha256, `unrelated WIP drift ${entry.path}`);
  }
}

function computePatchResults() {
  const scratch = mkdtempSync(join(tmpdir(), 'rex-u001-check-'));
  for (const target of descriptor.patch_targets) {
    const destination = join(scratch, target.path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repo, target.path), destination);
    assertEqual(fileSha(repo, target.path), target.before_sha256, `live patch target drift ${target.path}`);
  }
  execFileSync('patch', ['--batch', '-p1', '-d', scratch, '-i', join(repo, descriptor.patch_path)], { stdio: 'pipe' });
  const results = new Map();
  for (const target of descriptor.patch_targets) {
    const after = fileSha(scratch, target.path);
    assertEqual(after, target.after_sha256, `patch result drift ${target.path}`);
    results.set(target.path, after);
  }
  return results;
}

function validatePre() {
  assertEqual(run(repo, ['rev-parse', 'HEAD']), descriptor.parent, 'pre HEAD');
  assertEqual(run(repo, ['diff', '--cached', '--binary']).length, 0, 'pre index is not empty');
  validateCanonicalUnrelated();
  const patchResults = computePatchResults();
  for (const entry of descriptor.commit_entries) {
    const actual = entry.mode === 'PATCH_RESULT' ? patchResults.get(entry.path) : fileSha(repo, entry.path);
    assertEqual(actual, entry.sha256, `pre member drift ${entry.path}`);
  }
  process.stdout.write('PACKAGE_PROPOSAL_PASS\n');
}

function commitBlob(path) {
  return execFileSync('git', ['show', `HEAD:${path}`], { cwd: repo });
}

function validatePost() {
  const approvedIndex = process.argv.indexOf('--approved-descriptor-sha');
  if (approvedIndex < 0 || !process.argv[approvedIndex + 1]) fail('missing approved descriptor SHA');
  const approvedDescriptorSha = process.argv[approvedIndex + 1];
  const head = run(repo, ['rev-parse', 'HEAD']);
  if (head === descriptor.parent) fail('post HEAD is still parent');
  const ancestry = run(repo, ['rev-list', '--parents', '-n', '1', 'HEAD']).split(/\s+/);
  if (ancestry.length !== 2) fail(`post commit must have exactly one parent, got ${ancestry.length - 1}`);
  assertEqual(ancestry[1], descriptor.parent, 'post parent');
  const changed = run(repo, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']).split('\n').filter(Boolean);
  assertArray(changed, descriptor.exact_changed_paths, 'post commit changed paths');
  assertEqual(sha(commitBlob(descriptor.self_path)), approvedDescriptorSha, 'approved descriptor blob');
  for (const entry of descriptor.commit_entries) {
    assertEqual(sha(commitBlob(entry.path)), entry.sha256, `post commit member ${entry.path}`);
  }
  const currentRoot = resolve(run(repo, ['rev-parse', '--show-toplevel']));
  if (currentRoot === resolve(baseline.repo)) fail('post verification must run in a linked execution worktree');
  const assemblyIndex = process.argv.indexOf('--assembly-worktree');
  if (assemblyIndex < 0 || !process.argv[assemblyIndex + 1]) fail('missing assembly worktree path');
  const assemblyRoot = resolve(process.argv[assemblyIndex + 1]);
  if (currentRoot === assemblyRoot) fail('execution worktree must differ from assembly worktree');
  const registered = run(repo, ['worktree', 'list', '--porcelain'])
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => resolve(line.slice('worktree '.length)));
  for (const required of [resolve(baseline.repo), assemblyRoot, currentRoot]) {
    if (!registered.includes(required)) fail(`required worktree is not registered: ${required}`);
  }
  const postStatus = run(repo, ['status', '--porcelain=v2', '--untracked-files=all']);
  assertEqual(postStatus, '', 'execution worktree is not clean');
  validateCanonicalUnrelated();
  process.stdout.write('PACKAGE_ISOLATION_PASS\n');
}

validateDescriptor();
if (args.has('--pre')) validatePre();
else if (args.has('--post')) validatePost();
else fail('choose --pre or --post');
