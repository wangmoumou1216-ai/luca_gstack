import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const TASK = realpathSync(dirname(fileURLToPath(import.meta.url)));
const SOURCE = '/Users/luca/.codex/worktrees/9343/luca_gstack';
const TEST = 'scripts/test-project-gate-v34-dual-host.mjs';
const INVENTORY = JSON.parse(readFileSync(join(TASK, 'source-inventory.json'), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const env = {...process.env};
for (const key of ['GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT', 'GIT_OBJECT_DIRECTORY', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE', 'GIT_INDEX_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_REPLACE_REF_BASE', 'GIT_PREFIX',
  'GIT_SHALLOW_FILE', 'GIT_COMMON_DIR', 'GIT_NAMESPACE']) delete env[key];
function run(command, args, cwd, extraEnv = {}) {
  return spawnSync(command, args, {cwd, env: {...env, ...extraEnv}, encoding: 'utf8', timeout: 60000});
}
function must(command, args, cwd) {
  const result = run(command, args, cwd);
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  return result.stdout.trim();
}
const actualCommon = realpathSync(must('/usr/bin/git', ['-C', SOURCE, 'rev-parse', '--path-format=absolute', '--git-common-dir'], SOURCE));
const trustedParent = join(homedir(), '.luca', 'codex');
assert.ok(lstatSync(trustedParent).isDirectory() && !lstatSync(trustedParent).isSymbolicLink(), 'pre-existing trusted fixture parent must be a real directory');
const sourceCheck = () => {
  for (const entry of INVENTORY.files) assert.equal(hash(readFileSync(join(SOURCE, entry.path))), entry.sha256, `frozen source drift: ${entry.path}`);
};
sourceCheck();
const results = [];
for (const witness of ['inactive', 'active']) {
  const parent = join(TASK, `baseline-${witness}`);
  assert.equal(existsSync(parent), false, `refuse to replace prior evidence: ${parent}`);
  const repo = join(parent, 'repo');
  const control = join(parent, 'control');
  mkdirSync(repo, {recursive: true});
  mkdirSync(control);
  for (const entry of INVENTORY.files) {
    const target = join(repo, entry.path);
    mkdirSync(dirname(target), {recursive: true});
    copyFileSync(join(SOURCE, entry.path), target);
    assert.equal(hash(readFileSync(target)), entry.sha256, `copied source differs: ${entry.path}`);
  }
  writeFileSync(join(repo, 'c24-target.txt'), 'scratch witness target\n');
  must('/usr/bin/git', ['init', '-q', repo], repo);
  const fixtureCommon = realpathSync(must('/usr/bin/git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], repo));
  assert.equal(fixtureCommon, realpathSync(join(repo, '.git')), 'fixture must use independent .git directory');
  assert.notEqual(fixtureCommon, actualCommon, 'fixture may never share production control state');
  const hookPath = run('/usr/bin/git', ['-C', repo, 'config', '--get', 'core.hooksPath'], repo);
  assert.ok(hookPath.status === 1 && !hookPath.stdout.trim(), 'refuse inherited/custom commit hooks; do not bypass them');
  must('/usr/bin/git', ['-C', repo, 'add', '--all'], repo);
  must('/usr/bin/git', ['-C', repo, '-c', 'user.name=C24 Fixture', '-c', 'user.email=c24-fixture@example.invalid', 'commit', '-qm', 'C24 isolated source snapshot'], repo);
  const head = must('/usr/bin/git', ['-C', repo, 'rev-parse', 'HEAD'], repo);
  const core = await import(pathToFileURL(join(repo, 'scripts', 'controlled-change.mjs')));
  assert.equal(core.discoverControlState(repo).kind, 'inactive');
  let manifestPath;
  if (witness === 'active') {
    const targetTuple = core.pathTuple(join(repo, 'c24-target.txt'));
    const manifest = {schema_version: 1, task_id: 'c24-baseline-active', u_id: 'U-003',
      repo_realpath: realpathSync(repo), git_common_dir_realpath: fixtureCommon,
      plan_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), plan_recorded_baseline: head,
      observed_baseline: head, session: 'c24-diagnostic', scratch_root: realpathSync(control),
      repo_paths: [{path: 'c24-target.txt', mutation: 'modify', preimage: targetTuple, postimage: targetTuple}],
      external_paths: [], mutation_classes: ['modify'], approved_effects: [],
      allowed_commands: ['node scripts/test-project-gate-v34-dual-host.mjs']};
    manifestPath = join(control, 'manifest.json');
    writeFileSync(manifestPath, `${core.canonicalJson(manifest)}\n`);
    const prepared = must(process.execPath, ['scripts/controlled-change-controller.mjs', 'prepare', '--manifest', manifestPath,
      '--generation', 'generation-c24-baseline-active-0001', '--ttl-seconds', '3600'], repo);
    writeFileSync(join(parent, 'prepare.json'), `${prepared}\n`);
    assert.equal(core.discoverControlState(repo).kind, 'required');
  }
  const before = core.discoverControlState(repo);
  const audit = join(parent, 'fixture-lifecycle.jsonl');
  const observed = run(process.execPath, ['--import', join(TASK, 'fixture-recorder.mjs'), TEST], repo,
    {LUCA_C24_AUDIT_PATH: audit});
  writeFileSync(join(parent, 'stdout.log'), observed.stdout || '');
  writeFileSync(join(parent, 'stderr.log'), observed.stderr || '');
  const after = core.discoverControlState(repo);
  const lifecycle = readFileSync(audit, 'utf8').trim().split('\n').map(JSON.parse);
  const owned = lifecycle.filter(row => row.kind === 'owned-directory').map(row => row.path);
  assert.ok(owned.every(path => !existsSync(path)), 'test must clean every exact owned fixture directory');
  assert.ok(lstatSync(trustedParent).isDirectory(), 'preserve existing trusted fixture parent');
  assert.equal(after.kind, before.kind, 'test must preserve outer control activation');
  const result = {witness, repo, fixtureCommon, actualCommon, head, originalTestSha256: INVENTORY.files.find(row => row.path === TEST).sha256,
    status: observed.status, signal: observed.signal, error: observed.error?.message || null,
    beforeKind: before.kind, afterKind: after.kind, ownedDirectories: owned, cleanupVerified: true};
  writeFileSync(join(parent, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  results.push(result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
sourceCheck();
writeFileSync(join(TASK, 'baseline-results.json'), `${JSON.stringify(results, null, 2)}\n`);
assert.equal(results[0].status, 0, 'inactive exact baseline must pass');
assert.notEqual(results[1].status, 0, 'active exact baseline must reproduce controlled denial');
assert.match(readFileSync(join(TASK, 'baseline-active', 'stderr.log'), 'utf8'), /codex enter uses the real scope-hook path.*|project selection authorization failed|deny-by-default/s,
  'active failure must expose the expected controlled project selection seam');
