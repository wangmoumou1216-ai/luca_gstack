#!/usr/bin/env node

// Integrity checker only. A PASS proves bundle bytes, declared structure and frozen source-set
// closure. It does not judge plan truth and cannot replace the independent judge or Luca approval.

import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = resolve(root, '..', '..');
const PLAN = 'FINAL-EXECUTION-PLAN.md';
const REDTEAM = 'ROUND-1-REDTEAM.md';
const HANDOFF = 'REDTEAM-HANDOFF.md';
const JUDGE_R1 = 'FINAL-JUDGE-R1.md';
const JUDGE = 'FINAL-JUDGE.md';
const SOURCE_MANIFEST = 'obligation-source-manifest.json';
const MANIFEST = 'final-plan-manifest.json';
const PROPOSAL = 'g-plan-proposal.json';
const OLD_PLAN_SHA = '6690c1251ad3fd844a3b4c8511dedad04f3372c16f530a48c75a109bb40229cb';

function fail(message) { throw new Error(message); }
function read(name) { return readFileSync(join(root, name)); }
function text(name) { return read(name).toString('utf8'); }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function ids(source, pattern) { return [...source.matchAll(pattern)].map((match) => Number(match[1])); }

function assertSequence(actual, count, label) {
  const expected = Array.from({ length: count }, (_, index) => index + 1);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} sequence mismatch: ${JSON.stringify(actual)}`);
}

function validatePlan(source) {
  if (!source.includes('Plan ID：`REX-20260811-001`')) fail('wrong plan id');
  if (!source.includes('状态：`FINAL_CANDIDATE_AWAITING_USER_AUDIT`')) fail('wrong plan status');
  if (!source.trimEnd().endsWith('<!-- FILE_END: FINAL-EXECUTION-PLAN.md -->')) fail('plan FILE_END missing');
  if (source.includes('E4 接续 Cycle 2')) fail('refuted Cycle 2 continuation survived');

  const dev = ids(source, /^### DEV-(\d{3})\b/gm);
  const tst = ids(source, /^### TST-(\d{3})\b/gm);
  const assertions = ids(source, /^\| ASSERT-(\d{3}) \|/gm);
  const units = ids(source, /^#### U-(\d{3})$/gm);
  assertSequence(dev, 15, 'DEV');
  assertSequence(tst, 15, 'TST');
  assertSequence(assertions, 28, 'ASSERT');
  assertSequence(units, 15, 'U-block');

  for (let phase = 0; phase <= 6; phase += 1) {
    if (!source.includes(`| E${phase} | task_execution |`)) fail(`phase contract E${phase} missing`);
  }
  const gates = [...source.matchAll(/^### (G-[A-Z-]+)$/gm)].map((match) => match[1]);
  const expectedGates = ['G-PLAN', 'G-PACKAGE', 'G-CONTAIN', 'G-OBLIGATION-SCOPE', 'G-ACTIVATE', 'G-REMOTE'];
  if (JSON.stringify(gates) !== JSON.stringify(expectedGates)) fail(`gate set mismatch: ${JSON.stringify(gates)}`);

  const criteria = [...source.matchAll(/^  - "\[C(\d+)\]/gm)].map((match) => Number(match[1]));
  assertSequence(criteria, 7, 'criteria');
  const testArea = source.slice(source.indexOf('## 6. Dev / Test Task Cards'));
  for (const assertion of assertions) {
    const id = `ASSERT-${String(assertion).padStart(3, '0')}`;
    if (!testArea.includes(id)) fail(`${id} has no task-card mapping`);
  }

  for (let unit = 1; unit <= 15; unit += 1) {
    const id = String(unit).padStart(3, '0');
    const start = source.indexOf(`#### U-${id}`);
    const next = unit === 15 ? source.indexOf('```text', start) : source.indexOf(`#### U-${String(unit + 1).padStart(3, '0')}`, start);
    const block = source.slice(start, next);
    for (const field of ['Goal：', 'Source：', 'Dependencies：', 'Files：', 'Read List：', 'Test scenarios：', 'Verification：']) {
      if (!block.includes(field)) fail(`U-${id} missing ${field}`);
    }
  }
}

function validateRedteam(source) {
  if (!source.includes(`冻结 SHA-256：\`${OLD_PLAN_SHA}\``)) fail('redteam target sha mismatch');
  if (!source.includes('裁决：**REFUTE**')) fail('redteam verdict is not REFUTE');
  for (const section of ['## A. 路由、纠错与项目状态', '## B. Obligation、治理与 Git', '## C. Cycle 2、跨 harness 与最终握手']) {
    if (!source.includes(section)) fail(`redteam section missing: ${section}`);
  }
  if (!source.trimEnd().endsWith('<!-- FILE_END: ROUND-1-REDTEAM.md -->')) fail('redteam FILE_END missing');
}

function validateHandoff(source) {
  if (!source.includes('- status: `REFUTED`')) fail('handoff status mismatch');
  if (!source.includes(`- target_sha256: \`${OLD_PLAN_SHA}\``)) fail('handoff target mismatch');
  if (!source.trimEnd().endsWith('<!-- FILE_END: REDTEAM-HANDOFF.md -->')) fail('handoff FILE_END missing');
}

function walkFiles(rootRelative) {
  const absoluteRoot = join(repo, rootRelative);
  const found = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) found.push(posix.normalize(relative(repo, absolute).split('\\').join('/')));
    }
  }
  walk(absoluteRoot);
  return found;
}

function selectSourcePaths(sourceManifest) {
  const selected = new Set(sourceManifest.selection.fixed);
  for (const rule of sourceManifest.selection.dynamic) {
    let candidates = walkFiles(rule.root);
    if (rule.mode === 'extensions_recursive') candidates = candidates.filter((path) => rule.extensions.includes(extname(path)));
    else if (rule.mode === 'basename_recursive') candidates = candidates.filter((path) => posix.basename(path) === rule.basename);
    else if (rule.mode === 'top_level_allowlist_and_extensions') {
      candidates = candidates.filter((path) => {
        const rel = posix.relative(rule.root, path);
        return !rel.includes('/') && (rule.allow.includes(rel) || rule.extensions.includes(extname(rel)));
      });
    } else if (rule.mode !== 'all_files_recursive') fail(`unknown source selector: ${rule.mode}`);
    for (const path of candidates) selected.add(path);
  }
  return [...selected].sort();
}

function validateSourceManifest(sourceManifest) {
  if (sourceManifest.schema_version !== 1 || sourceManifest.plan_id !== 'REX-20260811-001') fail('source manifest identity mismatch');
  if (!sourceManifest.selection || !Array.isArray(sourceManifest.resolved)) fail('source manifest selection missing');
  const selected = selectSourcePaths(sourceManifest);
  const resolved = sourceManifest.resolved.map((entry) => entry.path);
  if (sourceManifest.resolved_count !== resolved.length) fail('source manifest count mismatch');
  if (JSON.stringify(selected) !== JSON.stringify(resolved)) fail('source manifest exact path set drift');
  for (const entry of sourceManifest.resolved) {
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) fail(`invalid source hash: ${entry.path}`);
    const absolute = join(repo, entry.path);
    const stat = lstatSync(absolute);
    if (!stat.isFile()) fail(`source is not a regular file: ${entry.path}`);
    if (sha256(readFileSync(absolute)) !== entry.sha256) fail(`source byte drift: ${entry.path}`);
  }
}

function validateJudge(source, expectedPlanSha) {
  if (!source.includes(`target_plan_sha256：\`${expectedPlanSha}\``)) fail('final judge target mismatch');
  if (!source.includes('verdict：**SURVIVES**')) fail('final judge did not SURVIVE');
  if (!source.includes('structural integrity is not plan truth')) fail('final judge evidence boundary missing');
  if (!source.trimEnd().endsWith('<!-- FILE_END: FINAL-JUDGE.md -->')) fail('final judge FILE_END missing');
}

function validateManifest(manifest) {
  if (manifest.schema_version !== 1 || manifest.plan_id !== 'REX-20260811-001') fail('manifest identity mismatch');
  const required = [PLAN, REDTEAM, HANDOFF, JUDGE_R1, JUDGE, SOURCE_MANIFEST, 'tools/verify-final-plan.mjs'];
  if (!Array.isArray(manifest.members) || manifest.members.length !== required.length) fail('manifest member count mismatch');
  const names = manifest.members.map((member) => member.path);
  if (JSON.stringify([...names].sort()) !== JSON.stringify([...required].sort())) fail('manifest exact member set mismatch');
  if (new Set(names).size !== names.length) fail('manifest duplicate member');
  for (const member of manifest.members) {
    if (!/^[a-f0-9]{64}$/.test(member.sha256)) fail(`invalid member hash: ${member.path}`);
    if (sha256(read(member.path)) !== member.sha256) fail(`member drift: ${member.path}`);
  }
}

function validateProposal(proposal, manifestBytes, planBytes, redteamBytes, judgeBytes, sourceManifestBytes) {
  if (proposal.schema_version !== 1 || proposal.gate !== 'G-PLAN' || proposal.plan_id !== 'REX-20260811-001') fail('proposal identity mismatch');
  if (proposal.plan_sha256 !== sha256(planBytes)) fail('proposal plan hash mismatch');
  if (proposal.redteam_sha256 !== sha256(redteamBytes)) fail('proposal redteam hash mismatch');
  if (proposal.final_judge_sha256 !== sha256(judgeBytes)) fail('proposal judge hash mismatch');
  if (proposal.source_manifest_sha256 !== sha256(sourceManifestBytes)) fail('proposal source manifest hash mismatch');
  if (proposal.manifest_sha256 !== sha256(manifestBytes)) fail('proposal manifest hash mismatch');
  if (!/^[a-f0-9]{32}$/.test(proposal.nonce)) fail('proposal nonce invalid');
  const created = Date.parse(proposal.created_at);
  const expires = Date.parse(proposal.expires_at);
  if (!Number.isFinite(created) || !Number.isFinite(expires) || expires <= created) fail('proposal time window invalid');
  if (Date.now() >= expires) fail('proposal expired');
}

function runSelfTest(planSource, redteamSource, sourceManifest) {
  const mutations = [
    () => validatePlan(planSource.replace(/^### DEV-015.*$/m, '')),
    () => validatePlan(planSource.replace(/^\| ASSERT-028 .*$/m, '')),
    () => validatePlan(planSource.replace(/^### G-REMOTE$/m, '### G-OTHER')),
    () => validatePlan(planSource.replace(/^#### U-015$/m, '#### U-999')),
    () => validateRedteam(redteamSource.replace('裁决：**REFUTE**', '裁决：**SURVIVES**')),
    () => validateSourceManifest({ ...sourceManifest, resolved: sourceManifest.resolved.slice(1), resolved_count: sourceManifest.resolved_count - 1 }),
  ];
  for (const mutate of mutations) {
    let killed = false;
    try { mutate(); } catch { killed = true; }
    if (!killed) fail('self-test mutant survived');
  }
}

const planBytes = read(PLAN);
const redteamBytes = read(REDTEAM);
const sourceManifestBytes = read(SOURCE_MANIFEST);
const planSource = planBytes.toString('utf8');
const redteamSource = redteamBytes.toString('utf8');
const sourceManifest = JSON.parse(sourceManifestBytes.toString('utf8'));
validatePlan(planSource);
validateRedteam(redteamSource);
validateHandoff(text(HANDOFF));
validateSourceManifest(sourceManifest);

if (process.argv.includes('--self-test')) {
  runSelfTest(planSource, redteamSource, sourceManifest);
  process.stdout.write('FINAL_PLAN_SELF_TEST_PASS\n');
  process.exit(0);
}
if (process.argv.includes('--prejudge')) {
  process.stdout.write('FINAL_PLAN_PREJUDGE_INTEGRITY_PASS\n');
  process.exit(0);
}

const judgeBytes = read(JUDGE);
validateJudge(judgeBytes.toString('utf8'), sha256(planBytes));
const manifestBytes = read(MANIFEST);
validateManifest(JSON.parse(manifestBytes.toString('utf8')));
validateProposal(JSON.parse(text(PROPOSAL)), manifestBytes, planBytes, redteamBytes, judgeBytes, sourceManifestBytes);
process.stdout.write('FINAL_PLAN_BUNDLE_INTEGRITY_PASS\n');
