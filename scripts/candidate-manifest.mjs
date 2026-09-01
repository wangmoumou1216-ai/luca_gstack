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
// 发布提交（六项集成实际落地的那一条）。它是一个**历史事实**，不是可变配置：
// `--verify-at` 会断言 `<PUBLISHED_COMMIT>^ === PLAN_RECORDED_BASELINE`，
// 所以填错锚点不会静默通过，只会当场失败。
const PUBLISHED_COMMIT = '6aaa1c6511af6845042e9dc541524934ed57bfe9';
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
function gitBuffer(args) {
  const result = spawnSync('/usr/bin/git', ['-C', ROOT, ...args], { maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr || ''));
  return result.stdout;
}
// 与 tuple() 同形，但内容取自某个 git 提交的 blob 而非工作树。
// 符号链接在 git 里就是「内容为目标字符串的 blob」，与 tuple() 的 readlink 口径一致。
function tupleAt(ref, relativePath) {
  const path = safeRelative(relativePath);
  const record = git(['ls-tree', '-z', ref, '--', path]).replace(/\0+$/, '');
  assert.ok(record, `candidate path missing at ${ref}: ${path}`);
  const [meta, name] = record.split('\t');
  assert.equal(name, path, `ls-tree returned a different path at ${ref}: ${name}`);
  const [mode, type, oid] = meta.split(' ');
  assert.equal(type, 'blob', `candidate path must be a blob at ${ref}: ${path}`);
  const digest = sha256(gitBuffer(['cat-file', 'blob', oid]));
  return mode === '120000'
    ? { type: 'symlink', mode, sha256: digest }
    : { type: 'file', mode, sha256: digest };
}
// `verify()` 断言的是**工作树当前内容**。那是发布当时的正确口径，但作为常驻健康检查会把
// 这 81 个 runtime 文件永久冻结——其中包含 route-guard.mjs / codex-hook-adapter.mjs /
// verify.sh / CLAUDE.md 等，任何一次合法修改都会让 verify.sh 变红，且没有任何被支持的
// 变更路径。CANDIDATE-MANIFEST 是**发布记录**，它要证明的是「那一次发布确实发布了这些字节」，
// 而不是「这些字节此后不许再改」。故常驻检查改为对**发布提交的不可变 blob** 求证：
// manifest 被篡改会红、denominator 漂移会红、锚点填错会红（父提交断言），而后续合法修改不再误伤。
function verifyAt(path, ref) {
  const resolved = git(['rev-parse', `${ref}^{commit}`]);
  assert.equal(git(['rev-parse', `${resolved}^`]), PLAN_RECORDED_BASELINE,
    `publication anchor ${ref} is not the child of PLAN_RECORDED_BASELINE`);
  const rows = parse(path);
  const expectedPaths = runtimeDenominator();
  assert.deepEqual(rows.map((row) => row.path), expectedPaths, 'candidate manifest denominator mismatch');
  assert.equal(new Set(rows.map((row) => row.path)).size, rows.length, 'candidate manifest contains duplicate paths');
  for (const row of rows) {
    assert.deepEqual(tupleAt(resolved, row.path), { type: row.type, mode: row.mode, sha256: row.sha256 },
      `candidate tuple drift at published commit: ${row.path}`);
  }
  // 活体漂移只作信息，不作判定：它是「发布之后有人改过什么」，不是发布记录是否完整。
  // 复用 tuple()——它已正确处理符号链接（取链接目标字符串而非跟随读取目标文件）。
  const drifted = rows.filter((row) => {
    try {
      const live = tuple(row.path);
      return live.type !== row.type || live.mode !== row.mode || live.sha256 !== row.sha256;
    } catch { return true; }
  }).map((row) => row.path);
  return { rows, sha256: sha256(readFileSync(path)), commit: resolved, drifted };
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
  } else if (argv[0] === '--verify-at' && argv[1]) {
    const refIndex = argv.indexOf('--ref');
    const ref = refIndex >= 0 && argv[refIndex + 1] ? argv[refIndex + 1] : PUBLISHED_COMMIT;
    const result = verifyAt(resolve(ROOT, argv[1]), ref);
    process.stdout.write(`PASS\tcandidate-manifest-at\t${result.commit.slice(0, 12)}\t${result.rows.length} rows\t${result.sha256}\n`);
    if (result.drifted.length) {
      process.stdout.write(`INFO\tlive-drift-since-publication\t${result.drifted.length}/${result.rows.length}\t${result.drifted.join(',')}\n`);
    }
  } else if (argv[0] === '--verify' && argv[1]) {
    const result = verify(resolve(ROOT, argv[1]));
    process.stdout.write(`PASS\tcandidate-manifest\t${result.rows.length} rows\t${result.sha256}\n`);
  } else if (argv[0] === '--verify-publish-receipt' && argv[1]) {
    const planIndex = argv.indexOf('--plan');
    assert.ok(planIndex >= 0 && argv[planIndex + 1], '--plan is required');
    const commit = verifyPublishReceipt(resolve(ROOT, argv[1]), resolve(ROOT, argv[planIndex + 1]));
    process.stdout.write(`PASS\tpublish-receipt\t${commit}\n`);
  } else throw new Error('usage: candidate-manifest.mjs --inventory | --write <path> | --verify <path> | --verify-at <path> [--ref <rev>] | --verify-publish-receipt <path> --plan <path>');
} catch (error) {
  process.stderr.write(`FAIL\tcandidate-manifest\t${error.stack || error}\n`);
  process.exitCode = 1;
}
