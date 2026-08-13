#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import {
  censusLiveTargets,
  classificationReport,
  generateCandidate,
  jsonBytes,
  recomputeSourceManifest,
  sha256,
  sourceDelta,
  stable,
  validateCandidate,
} from './evolution/obligation-census.mjs';

const SOURCE_ROOT = process.cwd();
const ENGINE = resolve(SOURCE_ROOT, 'scripts/evolution/obligation-census.mjs');
const SCHEMA = resolve(SOURCE_ROOT, '.claude/skill-os/obligation-census.schema.json');
const TEST = resolve(SOURCE_ROOT, 'scripts/test-obligation-census.mjs');
let pass = 0;

function check(label, fn) {
  try {
    fn();
    pass += 1;
    process.stdout.write(`PASS ${label}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${label}: ${String(error?.stack || error)}\n`);
    process.exitCode = 1;
  }
}

function mkdir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
}

function write(path, bytes, mode = 0o600) {
  mkdir(resolve(path, '..'));
  writeFileSync(path, bytes, { mode });
  chmodSync(path, mode);
}

function git(root, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, {
    GIT_AUTHOR_NAME: 'obligation-test',
    GIT_AUTHOR_EMAIL: 'obligation-test@localhost',
    GIT_COMMITTER_NAME: 'obligation-test',
    GIT_COMMITTER_EMAIL: 'obligation-test@localhost',
    GIT_NO_REPLACE_OBJECTS: '1',
  });
  const result = spawnSync('git', args, { cwd: root, env, input: '', encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function clone(value) {
  return structuredClone(value);
}

function fixture() {
  const base = mkdtempSync('/private/tmp/obligation-census-test-');
  const repo = join(base, 'repo');
  const home = join(base, 'home');
  mkdir(repo);
  mkdir(home);
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'obligation-test']);
  git(repo, ['config', 'user.email', 'obligation-test@localhost']);

  write(join(repo, 'RULES.md'), [
    '# Rules',
    '',
    'Project isolation MUST reject a write outside the pinned project.',
    'A top-level user MUST approve activation scope.',
    'The handoff must include evidence.',
    '',
  ].join('\n'));
  const routeMap = [
    'version: 1',
    'project_skills:',
    '  demo:',
    '    invoke: "/demo"',
    'builtin_skills:',
    '  external:',
    '    skill: external',
    '  resolver:',
    '    skill: resolving-merge-conflicts',
    '  plugin_route:',
    '    invoke: "superpowers:brainstorming"',
    '',
  ].join('\n');
  write(join(repo, '.claude/skill-os/skill-routing-map.yaml'), routeMap);
  write(join(repo, '.claude/skills/office/demo/SKILL.md'), '# demo\n');
  mkdir(join(repo, '.agents/skills'));
  symlinkSync('../../.claude/skills/office/demo', join(repo, '.agents/skills/demo'));
  const initial = [
    ['RULES.md', sha256(readFileSync(join(repo, 'RULES.md')))],
    ['.claude/skill-os/skill-routing-map.yaml', sha256(readFileSync(join(repo, '.claude/skill-os/skill-routing-map.yaml')))],
  ].sort(([a], [b]) => a.localeCompare(b)).map(([path, hash]) => ({ path, sha256: hash }));
  const baseline = {
    schema_version: 1,
    plan_id: 'REX-20260811-001',
    purpose: 'test source denominator',
    generation_rules: ['fixed RULES and recursive skill-os yaml/json'],
    selection: {
      fixed: ['RULES.md'],
      dynamic: [{ root: '.claude/skill-os', mode: 'extensions_recursive', extensions: ['.yaml', '.json'] }],
    },
    exclusions: ['test outputs'],
    resolved_count: initial.length,
    resolved: initial,
  };
  const baselinePath = join(repo, 'framework-audit/obligation-source-manifest.json');
  write(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  git(repo, ['add', '--', 'RULES.md', '.claude/skill-os/skill-routing-map.yaml', '.claude/skills/office/demo/SKILL.md', '.agents/skills/demo', 'framework-audit/obligation-source-manifest.json']);
  git(repo, ['commit', '-q', '-m', 'fixture']);
  const commit1 = git(repo, ['rev-parse', 'HEAD']);

  write(join(home, '.claude/skills/external/SKILL.md'), '# external\n');
  write(join(home, '.claude/skills/resolving-merge-conflicts/SKILL.md'), [
    '---',
    'name: resolving-merge-conflicts',
    'containment: fail-closed',
    '---',
    'Return NEEDS_HUMAN_CHOICE.',
    '',
  ].join('\n'));
  write(join(home, '.agents/skills/tdd/SKILL.md'), '# tdd\n');
  write(join(home, '.codex/skills/local/SKILL.md'), '# local\n');
  write(join(home, '.claude/settings.json'), `${JSON.stringify({
    skillOverrides: { external: 'off' },
    enabledPlugins: { 'superpowers@claude-plugins-official': false },
    unrelated: 'excluded-from-normalization',
  }, null, 2)}\n`);
  const claudePluginTarget = join(home, '.claude/plugins/superpowers');
  const codexPluginTarget = join(home, '.codex/plugins/superpowers');
  write(join(claudePluginTarget, 'plugin.json'), '{}\n');
  write(join(codexPluginTarget, 'plugin.json'), '{}\n');
  const claudePluginsPath = join(base, 'claude-plugins.json');
  write(claudePluginsPath, `${JSON.stringify([{
    id: 'superpowers@claude-plugins-official', version: '1.0.0', scope: 'user', enabled: false,
    installPath: claudePluginTarget, installedAt: 'ignored', lastUpdated: 'ignored',
  }], null, 2)}\n`);
  const codexPluginsPath = join(base, 'codex-plugins.json');
  write(codexPluginsPath, `${JSON.stringify({ installed: [{
    pluginId: 'superpowers@claude-plugins-official', version: '1.0.0', installed: true, enabled: false,
    source: { source: 'local', path: codexPluginTarget }, installPolicy: 'ignored',
  }], available: [] }, null, 2)}\n`);
  return { base, repo, home, baseline, baselinePath, commit1, claudePluginsPath, codexPluginsPath };
}

const value = fixture();
const baselineSha = sha256(readFileSync(value.baselinePath));
const effective1 = recomputeSourceManifest({
  root: value.repo, targetCommit: value.commit1, baseline: value.baseline, baselineSha256: baselineSha,
});
const delta1 = sourceDelta(value.baseline, effective1);
const liveOptions = {
  root: value.repo,
  targetCommit: value.commit1,
  home: value.home,
  claudeSettingsPath: join(value.home, '.claude/settings.json'),
  claudePluginJsonPath: value.claudePluginsPath,
  codexPluginJsonPath: value.codexPluginsPath,
};
const targets1 = censusLiveTargets(liveOptions);
const candidate1 = generateCandidate({ root: value.repo, effective: effective1, liveTargets: targets1 });
const report1 = classificationReport({ candidate: candidate1, delta: delta1, liveTargets: targets1 });

check('source recomputation freezes exact commit and complete denominator', () => {
  assert.equal(effective1.target_commit, value.commit1);
  assert.equal(effective1.resolved_count, 2);
  assert.equal(effective1.baseline_manifest_sha256, baselineSha);
  assert.equal(delta1.status, 'NO_SOURCE_SET_DRIFT');
  assert.deepEqual(effective1.resolved.map((row) => row.path), [
    '.claude/skill-os/skill-routing-map.yaml', 'RULES.md',
  ]);
});

check('live target census distinguishes route states and binds four discovery roots plus repo office', () => {
  assert.equal(targets1.summary.route_count, 4);
  assert.deepEqual(Object.keys(targets1.catalogs).sort(), [
    'agents_home', 'claude_home', 'codex_home', 'repo_agents', 'repo_office',
  ]);
  const demo = targets1.routes.find((row) => row.id === 'demo');
  const external = targets1.routes.find((row) => row.id === 'external');
  const resolver = targets1.routes.find((row) => row.id === 'resolver');
  const plugin = targets1.routes.find((row) => row.id === 'plugin_route');
  assert.equal(demo.claude.state, 'PRESENT_UNPROBED');
  assert.equal(demo.codex.state, 'PRESENT_UNPROBED');
  assert.equal(external.claude.state, 'DISABLED_BY_OVERRIDE');
  assert.equal(resolver.claude.state, 'CONTAINED_FAIL_CLOSED');
  assert.equal(resolver.codex.state, 'CONTAINED_FAIL_CLOSED');
  assert.equal(plugin.claude.state, 'MISSING_WIRING');
  assert.equal(plugin.codex.state, 'MISSING_WIRING');
});

check('candidate is pointer-only and covers every source and normative anchor exactly once', () => {
  validateCandidate(candidate1, effective1, targets1, 'gate-ready');
  assert.equal(candidate1.summary.source_count, 2);
  assert.equal(candidate1.summary.obligation_count, 3);
  assert.equal(candidate1.anchors.length, candidate1.obligations.length);
  assert.ok(candidate1.obligations.every((row) => !Object.hasOwn(row, 'text') && !Object.hasOwn(row, 'rule')));
  assert.equal(report1.decision, 'READY_FOR_SCOPE_PROPOSAL');
  assert.equal(report1.missing_wiring_ids.length, 3);
});

check('ASSERT-016: deleting one source coverage row is rejected', () => {
  const mutant = clone(candidate1);
  mutant.source_coverage.pop();
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /source coverage/);
});

check('ASSERT-016: deleting one source pointer is rejected', () => {
  const mutant = clone(candidate1);
  mutant.anchors.pop();
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /one-to-one|anchor count/);
});

check('ASSERT-016: deleting one registered obligation is rejected', () => {
  const mutant = clone(candidate1);
  mutant.obligations.pop();
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /invalid\/duplicate anchor|one-to-one/);
});

check('ASSERT-016: source hash substitution is rejected', () => {
  const mutant = clone(effective1);
  mutant.resolved[0].sha256 = '0'.repeat(64);
  assert.throws(() => validateCandidate(candidate1, mutant, targets1, 'gate-ready'), /binding mismatch/);
});

check('ASSERT-016: newly committed source and MUST line create explicit SOURCE_SET_DRIFT', () => {
  write(join(value.repo, 'RULES.md'), `${readFileSync(join(value.repo, 'RULES.md'), 'utf8')}A new gate MUST remain registered.\n`);
  write(join(value.repo, '.claude/skill-os/new-rule.json'), '{"policy":"A consumer MUST reject omission."}\n');
  git(value.repo, ['add', '--', 'RULES.md', '.claude/skill-os/new-rule.json']);
  git(value.repo, ['commit', '-q', '-m', 'source drift']);
  const commit2 = git(value.repo, ['rev-parse', 'HEAD']);
  const effective2 = recomputeSourceManifest({ root: value.repo, targetCommit: commit2, baseline: value.baseline, baselineSha256: baselineSha });
  const delta2 = sourceDelta(value.baseline, effective2);
  assert.equal(delta2.status, 'SOURCE_SET_DRIFT');
  assert.equal(delta2.added.length, 1);
  assert.equal(delta2.hash_changed.length, 1);
  assert.throws(() => validateCandidate(candidate1, effective2, targets1, 'gate-ready'), /identity or input binding/);
});

const s0Index = candidate1.obligations.findIndex((row) => row.class === 'S0_MACHINE_SAFETY');
const s3Index = candidate1.obligations.findIndex((row) => row.class === 'S3_HUMAN_TASTE');
assert.notEqual(s0Index, -1);
assert.notEqual(s3Index, -1);

check('ASSERT-017: S0 degradation is rejected', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].degradation_code = 'NATIVE_CAPABILITY_DIFFERENCE';
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /S0 contract/);
});

check('ASSERT-017: S0 model-only enforcement is rejected', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].native_status = 'MODEL_ONLY';
  mutant.obligations[s0Index].executor = 'model';
  mutant.obligations[s0Index].activation_probe = 'model';
  mutant.obligations[s0Index].verifier = 'model';
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /S0 contract/);
});

check('ASSERT-017: S0 cannot drop one harness', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].harnesses = ['claude'];
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /invalid obligation|S0 contract/);
});

check('ASSERT-017: S3 degradation is rejected', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s3Index].degradation_code = 'NATIVE_CAPABILITY_DIFFERENCE';
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /classification basis\/class mismatch|S3 contract/);
});

check('ASSERT-017: wrong class without its enforcement contract is rejected', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].class = 'S3_HUMAN_TASTE';
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /classification basis\/class mismatch|S3 contract/);
});

check('ASSERT-017: UNKNOWN classification blocks gate-ready while remaining explicit in candidate mode', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].class = 'UNKNOWN';
  mutant.obligations[s0Index].classification_basis = 'UNRESOLVED';
  mutant.obligations[s0Index].enforcement = 'UNRESOLVED';
  mutant.summary.class_counts.S0_MACHINE_SAFETY -= 1;
  mutant.summary.class_counts.UNKNOWN += 1;
  mutant.summary.unknown_count += 1;
  validateCandidate(mutant, effective1, targets1, 'candidate');
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /UNKNOWN classification/);
});

check('ASSERT-017: missing wiring cannot be relabeled native-impossible outside S4', () => {
  const mutant = clone(candidate1);
  mutant.obligations[s0Index].native_status = 'NATIVE_IMPOSSIBLE';
  mutant.obligations[s0Index].degradation_code = 'NATIVE_CAPABILITY_DIFFERENCE';
  mutant.obligations[s0Index].executor = 'forbidden-model-only-executor';
  mutant.obligations[s0Index].activation_probe = 'forbidden-model-only-probe';
  mutant.obligations[s0Index].verifier = 'forbidden-model-only-verifier';
  assert.throws(() => validateCandidate(mutant, effective1, targets1, 'gate-ready'), /S0 contract|native-impossible/);
});

check('global target tree or registry drift changes the bound census', () => {
  write(join(value.home, '.claude/skills/external/DRIFT.md'), 'drift\n');
  const current = censusLiveTargets({ ...liveOptions, targetCommit: value.commit1 });
  assert.notEqual(stable(current), stable(targets1));
  assert.throws(() => validateCandidate(candidate1, effective1, current, 'gate-ready'), /input binding mismatch/);
});

check('broken symlink remains fail-visible and cannot become PRESENT', () => {
  symlinkSync('missing-target', join(value.home, '.codex/skills/broken'));
  const current = censusLiveTargets({ ...liveOptions, targetCommit: value.commit1 });
  const broken = current.catalogs.codex_home.entries.find((row) => row.name === 'broken');
  assert.equal(broken.entry_type, 'broken_symlink');
  assert.equal(broken.real_path, null);
});

check('schema is strict and declares all Plan-required obligation fields', () => {
  const schema = JSON.parse(readFileSync(SCHEMA, 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.obligations.items.additionalProperties, false);
  const required = schema.properties.obligations.items.required;
  for (const key of [
    'id', 'source_pointer', 'source_anchor_hash', 'class', 'trigger', 'harnesses', 'executor',
    'activation_probe', 'verifier', 'mutant_ids', 'receipt_kind', 'degradation_code', 'owner',
  ]) assert.ok(required.includes(key), `schema lacks ${key}`);
});

function runEngine(args) {
  return spawnSync(process.execPath, [ENGINE, ...args], {
    cwd: SOURCE_ROOT,
    input: '',
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
}

check('CLI recompute/generate/verify/make-gate-payload closes the pristine gate-ready path', () => {
  const cli = mkdtempSync('/private/tmp/obligation-census-cli-');
  const effectivePath = join(cli, 'effective.json');
  const deltaPath = join(cli, 'delta.json');
  const targetsPath = join(cli, 'targets.json');
  const candidatePath = join(cli, 'candidate.json');
  const reportPath = join(cli, 'report.json');
  const payloadPath = join(cli, 'payload.json');
  const envelopePath = join(cli, 'envelope.json');
  const planPath = join(cli, 'plan.md');
  write(planPath, '# Plan\n');
  const commonLive = [
    '--home', value.home,
    '--claude-settings', join(value.home, '.claude/settings.json'),
    '--claude-plugin-json', value.claudePluginsPath,
    '--codex-plugin-json', value.codexPluginsPath,
  ];
  let result = runEngine(['recompute-source', '--root', value.repo, '--target-commit', value.commit1,
    '--baseline', value.baselinePath, '--out', effectivePath, '--delta', deltaPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^SOURCE_MANIFEST_RECOMPUTED /);
  result = runEngine(['census-targets', '--root', value.repo, '--target-commit', value.commit1,
    '--out', targetsPath, ...commonLive]);
  assert.equal(result.status, 0, result.stderr);
  result = runEngine(['generate', '--root', value.repo, '--source', effectivePath, '--targets', targetsPath,
    '--delta', deltaPath, '--out', candidatePath, '--report', reportPath]);
  assert.equal(result.status, 0, result.stderr);
  result = runEngine(['verify', '--root', value.repo, '--target-commit', value.commit1,
    '--baseline', value.baselinePath, '--source', effectivePath, '--targets', targetsPath,
    '--delta', deltaPath, '--candidate', candidatePath, '--report', reportPath, '--mode', 'gate-ready', ...commonLive]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^OBLIGATION_CENSUS_GATE_READY /);
  result = runEngine(['make-gate-payload', '--root', value.repo, '--plan', planPath,
    '--baseline', value.baselinePath, '--source', effectivePath, '--delta', deltaPath,
    '--targets', targetsPath, '--candidate', candidatePath, '--report', reportPath,
    '--schema', SCHEMA, '--test', TEST, '--out', payloadPath, '--envelope', envelopePath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^OBLIGATION_SCOPE_PAYLOAD_READY /);
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
  assert.equal(payload.scope, 'approve census/classification only');
  assert.deepEqual(payload.prohibited, ['canonical rule edit', 'runtime wiring', 'activation', 'global mutation']);
});

check('CLI reverse checker rejects a canonical candidate mutation', () => {
  const cli = mkdtempSync('/private/tmp/obligation-census-cli-mutant-');
  const effectivePath = join(cli, 'effective.json');
  const deltaPath = join(cli, 'delta.json');
  const targetsPath = join(cli, 'targets.json');
  const candidatePath = join(cli, 'candidate.json');
  const mutantPath = join(cli, 'candidate-mutant.json');
  const reportPath = join(cli, 'report.json');
  const commonLive = [
    '--home', value.home,
    '--claude-settings', join(value.home, '.claude/settings.json'),
    '--claude-plugin-json', value.claudePluginsPath,
    '--codex-plugin-json', value.codexPluginsPath,
  ];
  assert.equal(runEngine(['recompute-source', '--root', value.repo, '--target-commit', value.commit1,
    '--baseline', value.baselinePath, '--out', effectivePath, '--delta', deltaPath]).status, 0);
  assert.equal(runEngine(['census-targets', '--root', value.repo, '--target-commit', value.commit1,
    '--out', targetsPath, ...commonLive]).status, 0);
  assert.equal(runEngine(['generate', '--root', value.repo, '--source', effectivePath, '--targets', targetsPath,
    '--delta', deltaPath, '--out', candidatePath, '--report', reportPath]).status, 0);
  const mutant = JSON.parse(readFileSync(candidatePath, 'utf8'));
  mutant.anchors.pop();
  write(mutantPath, jsonBytes(mutant));
  const result = runEngine(['verify', '--root', value.repo, '--target-commit', value.commit1,
    '--baseline', value.baselinePath, '--source', effectivePath, '--targets', targetsPath,
    '--delta', deltaPath, '--candidate', mutantPath, '--report', reportPath, '--mode', 'gate-ready', ...commonLive]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^OBLIGATION_CENSUS_REJECTED /);
});

check('CLI rejects unknown options instead of widening its authority surface', () => {
  const result = runEngine(['recompute-source', '--root', value.repo, '--target-commit', value.commit1,
    '--baseline', value.baselinePath, '--out', join(value.base, 'unused.json'), '--delta', join(value.base, 'unused-delta.json'),
    '--allow-shrink', 'true']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid option: --allow-shrink/);
});

check('production gate payload tracked-byte branch accepts tracked non-JSON generator and test files', () => {
  const source = readFileSync(ENGINE, 'utf8');
  assert.match(source, /function trackedBytes\(/);
  assert.match(source, /trackedBytes\(target\.root, target\.commit, path, label\)/);
  assert.doesNotMatch(source, /function trackedInput\(/);
  assert.match(source, /function trackedJson\(/);
});

process.stdout.write(`OBLIGATION_CENSUS_TESTS_PASS ${pass}\n`);
