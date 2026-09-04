#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_SHA = '1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9';
const AUDIT_REL = 'framework-audit/2026-08-30-mattpocock-six-skills-integration';
const SOURCE_PATH = join(ROOT, AUDIT_REL, 'SOURCE-MANIFEST.tsv');
const FROZEN_UPSTREAM_COMMIT = '6654f6b60cd9d5be8b54c6fafe44346dabeb3b76';
const RECORDED_UPSTREAM_ROOT = '/private/tmp/mattpocock-skills.N87j2v/skills-main';
const RECOVERABLE_UPSTREAM_SNAPSHOT = join(
  ROOT,
  AUDIT_REL,
  'upstream',
  `mattpocock-skills-${FROZEN_UPSTREAM_COMMIT}`,
);
const RECEIPT_PATH = join(ROOT, AUDIT_REL, 'IMPLEMENTATION-RECEIPT.md');
const CANDIDATE_PATH = join(ROOT, AUDIT_REL, 'CANDIDATE-MANIFEST.tsv');
const LEDGER_PATH = join(ROOT, AUDIT_REL, 'REVIEW-LEDGER.md');
const PERSONAL_CUTOVER_PATH = `/Users/luca/.luca/audit/matt-six-skill-personal-cutover-${PLAN_SHA}.json`;
const RESOLVER_TARGET_PATH = '/Users/luca/.claude/skills/resolving-merge-conflicts/SKILL.md';
const DEBUG_TARGET_PATH = '/Users/luca/.agents/skills/systematic-debugging/SKILL.md';
const RESOLVER_BACKUP_PATH = `/Users/luca/.claude/skills/.luca-backups/${PLAN_SHA}/resolving-merge-conflicts.SKILL.md`;
const DEBUG_BACKUP_PATH = `/Users/luca/.agents/skills/.luca-backups/${PLAN_SHA}/systematic-debugging.SKILL.md`;
const FILE_644 = (value) => ({ type: 'file', mode: '100644', sha256: value });
const EXPECTED_PERSONAL_CUTOVER = {
  schema_version: 1,
  plan_sha256: PLAN_SHA,
  state: 'VERIFIED',
  decision: 'CUTOVER_VERIFIED',
  selected_targets: ['resolving-merge-conflicts', 'systematic-debugging'],
  targets: [
    {
      id: 'resolving-merge-conflicts',
      path: RESOLVER_TARGET_PATH,
      decision: 'CUTOVER',
      preimage: FILE_644('5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de'),
      postimage: FILE_644('95eed4a2d01844c772cc61fe7f0b9843d9dfa3f1c5b5f15c0e928e35a71e071d'),
      backup: { path: RESOLVER_BACKUP_PATH, ...FILE_644('5befc05bd6cc6513485521b0f62b80de39abb38cfb8703daa3aed9abb30fd4de') },
      rollback: 'PASS',
      fresh_loader: 'PASS',
    },
    {
      id: 'systematic-debugging',
      path: DEBUG_TARGET_PATH,
      decision: 'CUTOVER',
      preimage: FILE_644('9982f0cfae330af0cb94724c561688db39800012994322df43dafcda65a6a4c5'),
      postimage: FILE_644('52de09479bbaced8601b4862558d531e1cc21c9b63be89d64d962b2e4d4f052b'),
      backup: { path: DEBUG_BACKUP_PATH, ...FILE_644('9982f0cfae330af0cb94724c561688db39800012994322df43dafcda65a6a4c5') },
      rollback: 'PASS',
      fresh_loader: 'PASS',
    },
  ],
};
const EXPECTED_PERSONAL_CUTOVER_BYTES = Buffer.from(`${JSON.stringify(EXPECTED_PERSONAL_CUTOVER, null, 2)}\n`, 'utf8');
const EXPECTED_PERSONAL_CUTOVER_TUPLE = FILE_644(sha256(EXPECTED_PERSONAL_CUTOVER_BYTES));
const SOURCE_HEADER = [
  'source_kind', 'source_skill', 'commit', 'upstream_source_root', 'legacy_root',
  'relative_path', 'type', 'mode', 'sha256', 'license',
];

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function tuple(path) {
  let stat;
  try { stat = lstatSync(path); } catch (error) {
    if (error?.code === 'ENOENT') return { type: 'absent', mode: '-', sha256: '-' };
    throw error;
  }
  if (stat.isSymbolicLink()) return { type: 'symlink', mode: '120000', sha256: sha256(Buffer.from(readlinkSync(path), 'utf8')) };
  assert.equal(stat.isFile(), true, `unsupported source type: ${path}`);
  return { type: 'file', mode: (stat.mode & 0o111) ? '100755' : '100644', sha256: sha256(readFileSync(path)) };
}

function readVerifiedPersonalCutoverReceipt(required = true) {
  const auditTuple = tuple(PERSONAL_CUTOVER_PATH);
  if (auditTuple.type === 'absent') {
    if (required) throw new Error(`RED_NOT_IMPLEMENTED: missing personal cutover receipt ${PERSONAL_CUTOVER_PATH}`);
    return null;
  }
  assert.deepEqual(auditTuple, EXPECTED_PERSONAL_CUTOVER_TUPLE, 'personal cutover audit tuple drift');
  const receipt = JSON.parse(readFileSync(PERSONAL_CUTOVER_PATH, 'utf8'));
  assert.deepEqual(receipt, EXPECTED_PERSONAL_CUTOVER, 'personal cutover receipt schema/content drift');
  for (const target of EXPECTED_PERSONAL_CUTOVER.targets) {
    assert.deepEqual(tuple(target.path), target.postimage, `personal cutover target postimage drift: ${target.path}`);
    const expectedBackup = { type: target.backup.type, mode: target.backup.mode, sha256: target.backup.sha256 };
    assert.deepEqual(tuple(target.backup.path), expectedBackup, `personal cutover backup drift: ${target.backup.path}`);
  }
  return receipt;
}
function parseTsv(path) {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  const header = lines.shift().split('\t');
  return { header, rows: lines.map((line, index) => ({ line, index: index + 2, fields: line.split('\t') })) };
}

function validateSourceManifest(cutoverReceipt) {
  const { header, rows } = parseTsv(SOURCE_PATH);
  assert.deepEqual(header, SOURCE_HEADER, 'SOURCE-MANIFEST header drift');
  assert.deepEqual(rows.map((row) => row.line), [...rows.map((row) => row.line)].sort(), 'SOURCE-MANIFEST rows must use C-locale/ASCII order');
  const seen = new Set();
  const cutoverTargets = cutoverReceipt?.targets || [];
  const recoveredCutovers = new Set();
  for (const row of rows) {
    assert.equal(row.fields.length, SOURCE_HEADER.length, `SOURCE-MANIFEST row ${row.index} field count`);
    const record = Object.fromEntries(SOURCE_HEADER.map((key, i) => [key, row.fields[i]]));
    assert.match(record.sha256, /^[0-9a-f]{64}$/, `SOURCE-MANIFEST row ${row.index} SHA`);
    let sourceRoot;
    if (record.source_kind === 'upstream') {
      assert.equal(record.commit, FROZEN_UPSTREAM_COMMIT);
      assert.equal(record.legacy_root, '-', `upstream row ${row.index} must not infer a legacy root`);
      assert.equal(isAbsolute(record.upstream_source_root), true, `upstream row ${row.index} root must be absolute`);
      assert.equal(
        record.upstream_source_root,
        RECORDED_UPSTREAM_ROOT,
        `upstream row ${row.index} provenance root drift`,
      );
      // SOURCE-MANIFEST records the original capture location for provenance. That location was
      // under /private/tmp, so it cannot be the durable verification surface. The committed,
      // commit-named snapshot below preserves the same byte tuples and makes this receipt
      // reproducible after temp cleanup and on a fresh checkout.
      sourceRoot = RECOVERABLE_UPSTREAM_SNAPSHOT;
    } else if (record.source_kind === 'legacy') {
      assert.equal(record.commit, '-');
      assert.equal(record.upstream_source_root, '-', `legacy row ${row.index} must not infer an upstream root`);
      assert.equal(isAbsolute(record.legacy_root), true, `legacy row ${row.index} root must be absolute`);
      sourceRoot = record.legacy_root;
    } else assert.fail(`unknown source_kind at row ${row.index}: ${record.source_kind}`);
    assert.ok(record.relative_path && !isAbsolute(record.relative_path) && !record.relative_path.split('/').includes('..'), `unsafe relative path at row ${row.index}`);
    const key = `${sourceRoot}\0${record.relative_path}`;
    assert.equal(seen.has(key), false, `duplicate source row ${key}`);
    seen.add(key);
    const livePath = join(sourceRoot, record.relative_path);
    const cutover = cutoverTargets.find((target) => target.path === livePath);
    let sourcePath = livePath;
    if (record.source_kind === 'legacy' && record.relative_path === 'SKILL.md' && cutover?.decision === 'CUTOVER') {
      sourcePath = cutover.backup.path;
      recoveredCutovers.add(cutover.path);
    }
    const actual = tuple(sourcePath);
    assert.deepEqual(actual, { type: record.type, mode: record.mode, sha256: record.sha256 }, `source tuple drift at row ${row.index}`);
  }
  for (const target of cutoverTargets.filter((target) => target.decision === 'CUTOVER')) {
    assert.equal(recoveredCutovers.has(target.path), true, `CUTOVER target lacks a recoverable SOURCE-MANIFEST legacy SKILL row: ${target.path}`);
  }
  const systematicRoot = dirname(DEBUG_TARGET_PATH);
  const resolverRoot = dirname(RESOLVER_TARGET_PATH);
  const systematic = rows.filter((row) => row.fields[4] === systematicRoot);
  assert.ok(systematic.length >= 2, 'systematic-debugging legacy_root rows are missing');
  assert.ok(systematic.some((row) => row.fields[5] === 'SKILL.md'), 'systematic-debugging legacy SKILL row is missing');
  assert.ok(rows.some((row) => row.fields[4] === resolverRoot && row.fields[5] === 'SKILL.md'), 'resolving legacy_root SKILL row is missing');
  return rows.length;
}

function validatePersonalCutover() {
  const receipt = readVerifiedPersonalCutoverReceipt();
  validateSourceManifest(receipt);
}

function field(body, key) {
  const match = body.match(new RegExp(`^${key}:\\s*(\\S+)\\s*$`, 'm'));
  assert.ok(match, `receipt lacks ${key}`);
  return match[1];
}

function validateFinal() {
  const personalCutover = readVerifiedPersonalCutoverReceipt();
  validateSourceManifest(personalCutover);
  if (!existsSync(CANDIDATE_PATH)) throw new Error('RED_NOT_IMPLEMENTED: missing CANDIDATE-MANIFEST.tsv');
  if (!existsSync(LEDGER_PATH)) throw new Error('RED_NOT_IMPLEMENTED: missing REVIEW-LEDGER.md');
  const candidateSha = sha256(readFileSync(CANDIDATE_PATH));
  const receipt = readFileSync(RECEIPT_PATH, 'utf8');
  assert.equal(field(receipt, 'approved_plan_sha256'), PLAN_SHA);
  // `VERIFIED` 是**发布前**终态，`PUBLISHED` 是发布真的发生之后的终态。旧写法只认 VERIFIED，
  // 于是收据一旦如实推进到 PUBLISHED，本检查就永久变红且没有前进路径——与 S45 同型缺陷。
  // 这里不是放宽：PUBLISHED 需**额外**满足发布证明字段自洽（缺字段/半写入/被改过都判红），
  // 与 candidate-manifest.mjs 的 verifyPublishReceipt 同一套不变量。
  const state = field(receipt, 'state');
  assert.ok(['VERIFIED', 'PUBLISHED'].includes(state), `unexpected receipt state: ${state}`);
  if (state === 'PUBLISHED') {
    const commit = field(receipt, 'published_commit_oid');
    assert.match(commit, /^[0-9a-f]{40}$/, 'published_commit_oid must be a full OID');
    assert.match(field(receipt, 'published_parent_oid'), /^[0-9a-f]{40}$/, 'published_parent_oid must be a full OID');
    assert.equal(field(receipt, 'remote_observed_oid'), commit, 'remote_observed_oid must equal published_commit_oid');
    assert.equal(field(receipt, 'remote_url'), 'https://github.com/wangmoumou1216-ai/luca_gstack.git');
    assert.equal(field(receipt, 'remote_ref'), 'refs/heads/main');
    // 隔离发布的承重不变量：共享 index / HEAD / 本地 main 在发布过程中不得被动过。
    for (const invariant of ['shared_index', 'symbolic_head', 'local_main']) {
      assert.equal(field(receipt, `${invariant}_pre_tuple`), field(receipt, `${invariant}_post_tuple`),
        `${invariant} changed during isolated publication`);
    }
  }
  assert.equal(field(receipt, 'candidate_manifest_sha256'), candidateSha);
  assert.equal(/PENDING_U\d+|RED_NOT_IMPLEMENTED/.test(receipt), false, 'final receipt contains pending state');
  const ledger = readFileSync(LEDGER_PATH, 'utf8');
  for (const axis of ['flow', 'safety', 'quality']) {
    assert.equal(field(receipt, `${axis}_review`), `PASS:${candidateSha}`);
    assert.match(ledger, new RegExp(`${axis}[\\s\\S]{0,240}PASS[\\s\\S]{0,240}${candidateSha}`, 'i'), `${axis} ledger entry must bind the candidate SHA`);
  }
  return candidateSha;
}

const argv = process.argv.slice(2);
try {
  if (argv.includes('--inventory')) {
    for (const name of ['source-freeze', 'personal-cutover', 'candidate-manifest-final', 'publish-receipt']) {
      process.stdout.write(`RED_NOT_IMPLEMENTED\t${name}\n`);
    }
  } else if (argv.includes('--source-manifest')) {
    const count = validateSourceManifest(readVerifiedPersonalCutoverReceipt(false));
    process.stdout.write(`PASS\tsource-manifest\t${count} rows\n`);
  } else if (argv.includes('--final')) {
    process.stdout.write(`PASS\tfinal-receipt\t${validateFinal()}\n`);
  } else {
    const index = argv.indexOf('--case');
    if (index < 0 || argv[index + 1] !== 'personal-cutover') throw new Error('usage: validate-skill-integration-receipt.mjs --source-manifest | --case personal-cutover | --final | --inventory');
    validatePersonalCutover();
    process.stdout.write('PASS\tpersonal-cutover\n');
  }
} catch (error) {
  process.stderr.write(`FAIL\treceipt\t${error.stack || error}\n`);
  process.exitCode = 1;
}
