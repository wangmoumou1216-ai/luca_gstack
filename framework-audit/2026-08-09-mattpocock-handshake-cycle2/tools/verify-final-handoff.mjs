#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(import.meta.url);
const PACKAGE = resolve(dirname(TOOL), '..');
const REPO = resolve(PACKAGE, '..', '..');
const relPackage = relative(REPO, PACKAGE).split(sep).join('/');
const failures = [];

const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packagePath = (name) => join(PACKAGE, name);
const gitBytes = (...args) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 64 * 1024 * 1024 });
const gitText = (...args) => gitBytes(...args).toString('utf8');
const nulPaths = (bytes) => bytes.toString('utf8').split('\0').filter(Boolean).sort();

function exactIds(body, prefix, count) {
  const found = [...body.matchAll(new RegExp(`\\b${prefix}-(\\d{3})\\b`, 'g'))]
    .map((match) => match[1]);
  const unique = [...new Set(found)].sort();
  const expected = Array.from({ length: count }, (_, index) => String(index + 1).padStart(3, '0'));
  if (JSON.stringify(unique) !== JSON.stringify(expected)) {
    fail(`${prefix} exact set mismatch: expected ${expected.join(',')}; observed ${unique.join(',')}`);
  }
}

function walkFiles(root) {
  const rows = [];
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) rows.push(...walkFiles(path));
    else if (stat.isFile()) rows.push(relative(REPO, path).split(sep).join('/'));
    else fail(`package contains non-regular entry: ${relative(REPO, path)}`);
  }
  return rows;
}

const required = [
  'FINAL-EXECUTION-PLAN.md',
  'FINAL-HANDOFF.md',
  'NEXT-SESSION-PROMPT.md',
  'final-execution-manifest.json',
  'defer-promotion-register.json',
  'final-source-bundle.sha256',
  'decision-map.json',
  'head-decision-map.json',
  'harness-matrix.yaml',
  'architecture-decisions.md',
  'quick-research-framework-routing-defer-2026-08-09.md',
];
for (const name of required) if (!existsSync(packagePath(name))) fail(`missing required file: ${name}`);

if (!failures.length) {
  const plan = read(packagePath('FINAL-EXECUTION-PLAN.md'));
  const handoff = read(packagePath('FINAL-HANDOFF.md'));
  const prompt = read(packagePath('NEXT-SESSION-PROMPT.md'));
  const manifest = json(packagePath('final-execution-manifest.json'));
  const defer = json(packagePath('defer-promotion-register.json'));
  const head = json(packagePath('head-decision-map.json'));

  const markers = [
    [plan, '<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->'],
    [handoff, '<!-- FILE_END: FINAL-HANDOFF.md -->'],
    [prompt, '<!-- FILE_END: NEXT-SESSION-PROMPT.md -->'],
  ];
  for (const [body, marker] of markers) if (!body.trimEnd().endsWith(marker)) fail(`missing terminal marker: ${marker}`);
  if (manifest._file_end !== 'final-execution-manifest.json') fail('manifest FILE_END sentinel mismatch');
  if (defer._file_end !== 'defer-promotion-register.json') fail('defer FILE_END sentinel mismatch');

  if (manifest.status !== 'FINAL') fail('manifest status is not FINAL');
  if (manifest.authority.primary !== 'FINAL-EXECUTION-PLAN.md') fail('final Plan is not primary authority');
  if (manifest.authority.candidate_plan_role !== 'SOURCE_ONLY_SUPERSEDED') fail('candidate Plan is not source-only');
  if (manifest.authority.no_further_redteam !== true || manifest.authority.no_further_judge !== true) {
    fail('user terminal instruction about no further redteam/judge is not frozen');
  }
  if (manifest.authority.implementation_authorized_by_this_manifest !== false) fail('manifest improperly self-authorizes implementation');
  if (manifest.authority.human_gates_remain_required !== true) fail('human gates were removed');

  const expectedCounts = { ADAPT: 10, KEEP: 18, DEFER: 19, REJECT: 27, QUARANTINE: 0 };
  if (JSON.stringify(manifest.audit_universe.head_decisions) !== JSON.stringify(expectedCounts)) fail('manifest HEAD decision counts drifted');
  if (manifest.audit_universe.total !== 321 || manifest.audit_universe.acceptance_cells !== 2568) fail('audit universe/counts drifted');
  if (JSON.stringify(head.summary?.decisions) !== JSON.stringify(expectedCounts)) fail('head-decision-map counts drifted');

  const sourceDeferred = head.entries
    .filter((entry) => entry.independent_decision === 'DEFER')
    .map((entry) => entry.id)
    .sort();
  const registerDeferred = defer.families.flatMap((family) => family.atom_ids).sort();
  if (sourceDeferred.length !== 19 || JSON.stringify(sourceDeferred) !== JSON.stringify(registerDeferred)) {
    fail('19 DEFER atom exact-set mismatch between source decision map and final register');
  }
  const familyShape = defer.families.map((family) => `${family.priority}:${family.family}:${family.atom_count}`);
  const expectedFamilies = ['P1:questionnaire:8', 'P2:logic-prototype:10', 'P3:tdd-codebase-design:1'];
  if (JSON.stringify(familyShape) !== JSON.stringify(expectedFamilies)) fail(`DEFER priority shape mismatch: ${familyShape.join(',')}`);
  if (defer.summary.promoted_now_atoms !== 0 || defer.summary.promoted_now_families !== 0) fail('DEFER register falsely promotes a capability');
  if (defer.families.some((family) => family.promote_now !== false)) fail('a DEFER family is marked promote_now');
  if (defer.ranking_model.automatic_promotion !== false) fail('automatic DEFER promotion is enabled');

  exactIds(plan, 'DEV', 12);
  exactIds(plan, 'TST', 12);
  exactIds(plan, 'ASSERT', 18);
  for (const gate of ['G-PACKAGE', 'G-CONTAIN', 'G-ACTIVATE']) {
    if (!plan.includes(gate) || !(gate in manifest.human_gates)) fail(`human gate missing: ${gate}`);
  }
  if (!plan.includes('当前晋升 0 个') || !plan.includes('不新增产品 workflow 节点')) fail('Plan lost a terminal user-facing decision');
  if (!plan.includes('不再开新红队或 judge')) fail('Plan does not freeze the final review override');
  if (handoff.length > 8000) fail(`handoff exceeds 8000 characters: ${handoff.length}`);
  const criteria = [...handoff.matchAll(/^\d+\. /gm)].length;
  if (criteria < 3) fail('handoff does not contain a sufficient acceptance list');

  const expectedHashes = {
    'candidate-handshake-plan.md': manifest.frozen_inputs.hashes.candidate_handshake_plan,
    'atomic-manifest.yaml': manifest.frozen_inputs.hashes.atomic_manifest,
    'decision-map.json': manifest.frozen_inputs.hashes.decision_map,
    'harness-matrix.yaml': manifest.frozen_inputs.hashes.harness_matrix,
    'architecture-decisions.md': manifest.frozen_inputs.hashes.architecture_decisions,
    'codex-live-probe-receipt.json': manifest.frozen_inputs.hashes.codex_live_probe,
  };
  for (const [name, expected] of Object.entries(expectedHashes)) {
    const actual = sha256(packagePath(name));
    if (actual !== expected) fail(`${name} frozen hash mismatch: ${actual}`);
  }

  const bundleLines = read(packagePath('final-source-bundle.sha256')).trim().split(/\r?\n/u).filter(Boolean);
  const bundlePaths = [];
  for (const [index, line] of bundleLines.entries()) {
    const match = line.match(/^([0-9a-f]{64})  ([^\r\n]+)$/u);
    if (!match) {
      fail(`malformed bundle line ${index + 1}`);
      continue;
    }
    const [, expected, rel] = match;
    if (!rel.startsWith(`${relPackage}/`) || rel.includes('/../')) {
      fail(`bundle member escapes package: ${rel}`);
      continue;
    }
    const path = resolve(REPO, rel);
    if (!existsSync(path)) fail(`bundle member absent: ${rel}`);
    else if (sha256(path) !== expected) fail(`bundle member hash mismatch: ${rel}`);
    bundlePaths.push(rel);
  }
  const duplicates = bundlePaths.filter((path, index, all) => all.indexOf(path) !== index);
  if (duplicates.length) fail(`duplicate bundle members: ${[...new Set(duplicates)].join(',')}`);
  const bundleSelf = `${relPackage}/final-source-bundle.sha256`;
  const actualPackageFiles = walkFiles(PACKAGE).filter((path) => path !== bundleSelf).sort();
  const declaredPackageFiles = [...bundlePaths].sort();
  if (JSON.stringify(actualPackageFiles) !== JSON.stringify(declaredPackageFiles)) {
    const missing = actualPackageFiles.filter((path) => !declaredPackageFiles.includes(path));
    const extra = declaredPackageFiles.filter((path) => !actualPackageFiles.includes(path));
    fail(`bundle/package exact-set mismatch missing=${missing.join(',')} extra=${extra.join(',')}`);
  }

  try {
    const actualHead = gitText('rev-parse', 'HEAD').trim();
    const frozenHead = manifest.frozen_inputs.canonical_head;
    if (actualHead !== frozenHead) {
      const ancestry = gitText('rev-list', '--parents', '-n', '1', actualHead).trim().split(/\s+/u);
      if (ancestry.length !== 2) {
        fail(`post-package HEAD must have exactly one parent: ${actualHead}`);
      } else if (ancestry[1] !== frozenHead) {
        fail(`post-package HEAD parent drifted: expected ${frozenHead}; observed ${ancestry[1]}`);
      }

      const committedBundle = gitText('show', `${actualHead}:${bundleSelf}`);
      const committedEntries = [];
      for (const [index, line] of committedBundle.trim().split(/\r?\n/u).filter(Boolean).entries()) {
        const match = line.match(/^([0-9a-f]{64})  ([^\r\n]+)$/u);
        if (!match) {
          fail(`malformed committed bundle line ${index + 1}`);
          continue;
        }
        const [, expected, rel] = match;
        if (!rel.startsWith(`${relPackage}/`) || rel.includes('/../')) {
          fail(`committed bundle member escapes package: ${rel}`);
          continue;
        }
        const blob = gitBytes('show', `${actualHead}:${rel}`);
        const actual = sha256Bytes(blob);
        if (actual !== expected) fail(`committed bundle member hash mismatch: ${rel}`);
        committedEntries.push(rel);
      }

      const committedDuplicates = committedEntries.filter((path, index, all) => all.indexOf(path) !== index);
      if (committedDuplicates.length) {
        fail(`duplicate committed bundle members: ${[...new Set(committedDuplicates)].join(',')}`);
      }
      const expectedChanged = [...committedEntries, bundleSelf].sort();
      const changed = nulPaths(gitBytes(
        'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', frozenHead, actualHead,
      ));
      if (JSON.stringify(changed) !== JSON.stringify(expectedChanged)) {
        const missing = expectedChanged.filter((path) => !changed.includes(path));
        const extra = changed.filter((path) => !expectedChanged.includes(path));
        fail(`package commit exact-set mismatch missing=${missing.join(',')} extra=${extra.join(',')}`);
      }

      const committedPackageFiles = nulPaths(gitBytes(
        'ls-tree', '-r', '--name-only', '-z', actualHead, '--', relPackage,
      ));
      if (JSON.stringify(committedPackageFiles) !== JSON.stringify(expectedChanged)) {
        const missing = expectedChanged.filter((path) => !committedPackageFiles.includes(path));
        const extra = committedPackageFiles.filter((path) => !expectedChanged.includes(path));
        fail(`committed package exact-set mismatch missing=${missing.join(',')} extra=${extra.join(',')}`);
      }
    }
    const staleHead = execFileSync('git', ['-C', manifest.frozen_inputs.stale_checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (staleHead !== manifest.frozen_inputs.stale_checkout_head) fail(`stale checkout HEAD drifted: ${staleHead}`);
  } catch (error) {
    fail(`git identity read failed: ${error.message}`);
  }
}

if (failures.length) {
  process.stderr.write(`FINAL_HANDOFF_GATE_FAIL (${failures.length})\n`);
  for (const message of failures) process.stderr.write(`- ${message}\n`);
  process.exit(1);
}

process.stdout.write('FINAL_HANDOFF_GATE_PASS\n');
