#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_SHA = '1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9';
const PLAN_RECORDED_BASELINE = '4658595ac20ce544cb406657c70ba3259eb1f842';
const AUDIT_REL = 'framework-audit/2026-08-30-mattpocock-six-skills-integration';
const ALLOWLIST = join(ROOT, AUDIT_REL, 'IMPLEMENTATION-ALLOWLIST.txt');
const HEADER = 'path\ttype\tmode\tsha256';
const FINAL_EVIDENCE = [
  'FINAL-MASTER-PLAN.md',
  'SOURCE-MANIFEST.tsv',
  'DECISION-MATRIX.md',
  'IMPLEMENTATION-ALLOWLIST.txt',
  'CANDIDATE-MANIFEST.tsv',
  'IMPLEMENTATION-RECEIPT.md',
  'REVIEW-LEDGER.md',
].map((name) => `${AUDIT_REL}/${name}`).sort();

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function safeRelative(path) {
  assert.ok(path && !isAbsolute(path) && !path.includes('\\'), `unsafe manifest path: ${path}`);
  assert.equal(path.split('/').some((part) => !part || part === '.' || part === '..'), false, `unsafe manifest path: ${path}`);
  return path;
}
function tuple(relativePath) {
  const path = join(ROOT, safeRelative(relativePath));
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return { type: 'symlink', mode: '120000', sha256: sha256(Buffer.from(readlinkSync(path), 'utf8')) };
  assert.equal(stat.isFile(), true, `candidate path must be a file or symlink: ${relativePath}`);
  return { type: 'file', mode: (stat.mode & 0o111) ? '100755' : '100644', sha256: sha256(readFileSync(path)) };
}
function allowlistRows() {
  const rows = readFileSync(ALLOWLIST, 'utf8').trimEnd().split('\n');
  assert.equal(rows.length, 87, 'approved implementation allowlist must contain exactly 87 paths');
  assert.deepEqual(rows, [...rows].sort(), 'implementation allowlist must be C-locale/ASCII sorted');
  assert.equal(new Set(rows).size, rows.length, 'implementation allowlist contains duplicates');
  for (const path of rows) safeRelative(path);
  return rows;
}
function runtimeDenominator() {
  return allowlistRows().filter((path) => !path.startsWith(`${AUDIT_REL}/`));
}
function render(paths) {
  return `${HEADER}\n${paths.map((path) => {
    const value = tuple(path);
    return [path, value.type, value.mode, value.sha256].join('\t');
  }).join('\n')}\n`;
}
function parse(path) {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  assert.equal(lines.shift(), HEADER, 'candidate manifest header drift');
  return lines.map((line, index) => {
    const fields = line.split('\t');
    assert.equal(fields.length, 4, `candidate manifest row ${index + 2} field count`);
    const [relativePath, type, mode, digest] = fields;
    safeRelative(relativePath);
    assert.match(digest, /^[0-9a-f]{64}$/, `candidate manifest row ${index + 2} SHA`);
    return { path: relativePath, type, mode, sha256: digest, line };
  });
}
function verify(path) {
  const rows = parse(path);
  const expectedPaths = runtimeDenominator();
  assert.deepEqual(rows.map((row) => row.path), expectedPaths, 'candidate manifest denominator mismatch');
  assert.equal(new Set(rows.map((row) => row.path)).size, rows.length, 'candidate manifest contains duplicate paths');
  for (const row of rows) assert.deepEqual(tuple(row.path), { type: row.type, mode: row.mode, sha256: row.sha256 }, `candidate tuple drift: ${row.path}`);
  return { rows, sha256: sha256(readFileSync(path)) };
}
function git(args) {
  const result = spawnSync('/usr/bin/git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || '').trim();
}
function receiptField(receipt, key) {
  const match = receipt.match(new RegExp(`^${key}:\\s*(\\S+)\\s*$`, 'm'));
  assert.ok(match, `implementation receipt lacks ${key}`);
  return match[1];
}
function verifyPublishReceipt(candidatePath, planPath) {
  const candidate = verify(candidatePath);
  assert.equal(sha256(readFileSync(planPath)), PLAN_SHA, 'published plan SHA mismatch');
  const receiptBody = readFileSync(join(ROOT, AUDIT_REL, 'IMPLEMENTATION-RECEIPT.md'), 'utf8');
  assert.equal(receiptField(receiptBody, 'state'), 'PUBLISHED');
  assert.equal(receiptField(receiptBody, 'candidate_manifest_sha256'), candidate.sha256);
  const commit = receiptField(receiptBody, 'published_commit_oid');
  const parent = receiptField(receiptBody, 'published_parent_oid');
  const remote = receiptField(receiptBody, 'remote_observed_oid');
  assert.match(commit, /^[0-9a-f]{40}$/);
  assert.equal(parent, PLAN_RECORDED_BASELINE);
  assert.equal(remote, commit);
  assert.equal(git(['rev-parse', `${commit}^`]), PLAN_RECORDED_BASELINE, 'published commit parent mismatch');
  assert.equal(git(['rev-list', '--parents', '-n', '1', commit]).split(/\s+/).length, 2, 'published commit must have exactly one parent');
  for (const invariant of ['shared_index', 'symbolic_head', 'local_main']) {
    assert.equal(receiptField(receiptBody, `${invariant}_pre_tuple`), receiptField(receiptBody, `${invariant}_post_tuple`), `${invariant} changed during isolated publication`);
  }
  const publishPaths = [...candidate.rows.map((row) => row.path), ...FINAL_EVIDENCE].sort();
  const expectedSetSha = sha256(Buffer.from(`${publishPaths.join('\n')}\n`, 'utf8'));
  assert.equal(receiptField(receiptBody, 'publish_path_set_sha256'), expectedSetSha, 'publish path-set proof mismatch');
  assert.equal(receiptField(receiptBody, 'remote_url'), 'https://github.com/wangmoumou1216-ai/luca_gstack.git');
  assert.equal(receiptField(receiptBody, 'remote_ref'), 'refs/heads/main');
  assert.equal(receiptField(receiptBody, 'evidence_policy'), 'final-master-v1');
  return commit;
}

const argv = process.argv.slice(2);
try {
  if (argv.includes('--inventory')) {
    process.stdout.write('RED_NOT_IMPLEMENTED\tcandidate-manifest-final\nRED_NOT_IMPLEMENTED\tpublish-receipt\n');
  } else if (argv[0] === '--write' && argv[1]) {
    const output = resolve(ROOT, argv[1]);
    assert.ok(output.startsWith(`${ROOT}/`), 'candidate manifest output must stay inside the repository');
    writeFileSync(output, render(runtimeDenominator()), { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`PASS\tcandidate-manifest-write\t${sha256(readFileSync(output))}\n`);
  } else if (argv[0] === '--verify' && argv[1]) {
    const result = verify(resolve(ROOT, argv[1]));
    process.stdout.write(`PASS\tcandidate-manifest\t${result.rows.length} rows\t${result.sha256}\n`);
  } else if (argv[0] === '--verify-publish-receipt' && argv[1]) {
    const planIndex = argv.indexOf('--plan');
    assert.ok(planIndex >= 0 && argv[planIndex + 1], '--plan is required');
    const commit = verifyPublishReceipt(resolve(ROOT, argv[1]), resolve(ROOT, argv[planIndex + 1]));
    process.stdout.write(`PASS\tpublish-receipt\t${commit}\n`);
  } else throw new Error('usage: candidate-manifest.mjs --inventory | --write <path> | --verify <path> | --verify-publish-receipt <path> --plan <path>');
} catch (error) {
  process.stderr.write(`FAIL\tcandidate-manifest\t${error.stack || error}\n`);
  process.exitCode = 1;
}
