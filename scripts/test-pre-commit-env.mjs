#!/usr/bin/env node
// pre-commit must not hand git's repository-location variables to verify.sh (2026-09-11).
//
// Git gives a pre-commit hook an absolute GIT_INDEX_FILE for `git commit -- <paths>` and `git commit -a`,
// and an absolute GIT_DIR plus GIT_INDEX_FILE for every commit in a linked worktree; only a plain commit
// in a main checkout gets the relative `.git/index`. verify.sh runs tests that build fixture repositories
// and call `git add`; with those variables inherited, the fixture writes into the index being committed.
// See framework-audit/2026-09-11-precommit-verify-leaks-git-index-file.md.
//
// Each scenario runs twice: through a bare hook that only execs verify.sh, which must show the leak (so the
// fixture is proven to bite on this git), and through the pre-commit under test, which must not.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK_UNDER_TEST = resolve(process.env.PRE_COMMIT_UNDER_TEST || join(REPO, '.githooks', 'pre-commit'));
const LOCATION = /^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|PREFIX)=/m;

// This test itself runs inside pre-commit; its own git calls must not inherit that hook's variables.
const baseEnv = Object.fromEntries(Object.entries(process.env)
  .filter(([key]) => !key.startsWith('GIT_') && key !== 'FAST_COMMIT'));
Object.assign(baseEnv, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' });

const BARE_HOOK = '#!/bin/bash\nexec bash scripts/verify.sh\n';

// Stands in for verify.sh: records the location variables it received, then does what the leaking fixture
// test did — `git init` and `git add` in a fresh temporary directory.
const VERIFY_STUB = `#!/bin/bash
set -e
{ echo ran; env | grep -E '^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|PREFIX)=' || true; } > "$PRE_COMMIT_ENV_LOG"
fixture=$(mktemp -d "$PRE_COMMIT_SCRATCH/fixture.XXXXXX")
cd "$fixture"
git init -q
printf 'leaked\\n' > leaked.txt
git add leaked.txt
`;

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n  ${String(error?.message || error).split('\n').join('\n  ')}`);
  }
}

function git(cwd, args, extraEnv = {}) {
  return spawnSync('git', args, { cwd, env: { ...baseEnv, ...extraEnv }, encoding: 'utf8' });
}

function ok(cwd, args) {
  const result = git(cwd, args);
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function makeRepo(root, hookSource) {
  const repo = join(root, 'repo');
  mkdirSync(repo);
  ok(repo, ['init', '-q']);
  ok(repo, ['config', 'user.name', 'pre-commit-env']);
  ok(repo, ['config', 'user.email', 'pre-commit-env@example.invalid']);
  ok(repo, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(repo, 'tracked.txt'), 'base\n');
  writeFileSync(join(repo, 'secret.txt'), 'benign\n');
  mkdirSync(join(repo, 'scripts'));
  writeFileSync(join(repo, 'scripts', 'verify.sh'), VERIFY_STUB);
  mkdirSync(join(repo, '.githooks'));
  writeFileSync(join(repo, '.githooks', 'pre-commit'), hookSource);
  chmodSync(join(repo, '.githooks', 'pre-commit'), 0o755);
  ok(repo, ['add', '-A']);
  ok(repo, ['commit', '-qm', 'base']); // core.hooksPath is not set yet, so no hook runs for the base commit
  ok(repo, ['config', 'core.hooksPath', '.githooks']);
  return repo;
}

function runScenario(hookSource, { worktree = false, stage = false, file = 'tracked.txt', content = 'changed\n', args }) {
  const root = mkdtempSync(join(tmpdir(), 'pre-commit-env-'));
  try {
    const scratch = join(root, 'scratch');
    mkdirSync(scratch);
    const log = join(root, 'verify-env.log');
    const repo = makeRepo(root, hookSource);
    let dir = repo;
    if (worktree) {
      dir = join(root, 'wt');
      ok(repo, ['worktree', 'add', '-q', '--detach', dir, 'HEAD']);
    }
    const base = ok(dir, ['rev-parse', 'HEAD']);
    writeFileSync(join(dir, file), content);
    if (stage) ok(dir, ['add', file]);
    const commit = git(dir, args, { PRE_COMMIT_ENV_LOG: log, PRE_COMMIT_SCRATCH: scratch });
    const head = git(dir, ['rev-parse', 'HEAD']).stdout.trim();
    const verifyLog = existsSync(log) ? readFileSync(log, 'utf8') : '';
    return {
      status: commit.status,
      output: `${commit.stdout}${commit.stderr}`,
      committed: head !== base,
      changed: head !== base
        ? git(dir, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']).stdout.split('\n').filter(Boolean)
        : [],
      leakedInIndex: [dir, repo].some(where => git(where, ['ls-files', 'leaked.txt']).stdout.trim() !== ''),
      verifyRan: verifyLog.startsWith('ran\n'),
      verifyEnv: verifyLog,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const SCENARIOS = {
  'commit -- <path>': { args: ['commit', '-qm', 'change', '--', 'tracked.txt'] },
  'commit -a': { args: ['commit', '-qam', 'change'] },
  'linked worktree, commit -- <path>': { worktree: true, args: ['commit', '-qm', 'change', '--', 'tracked.txt'] },
  'linked worktree, plain commit': { worktree: true, stage: true, args: ['commit', '-qm', 'change'] },
};

const hookUnderTest = readFileSync(HOOK_UNDER_TEST, 'utf8');

for (const [name, scenario] of Object.entries(SCENARIOS)) {
  check(`control: a hook that passes git's variables on lets the fixture leak (${name})`, () => {
    const result = runScenario(BARE_HOOK, scenario);
    assert.equal(result.verifyRan, true, `the verify stub must run\n${result.output}`);
    assert.match(result.verifyEnv, /^GIT_INDEX_FILE=\//m, 'git must hand this hook an absolute GIT_INDEX_FILE');
    const clean = result.status === 0 && result.changed.join(',') === 'tracked.txt' && !result.leakedInIndex;
    assert.equal(clean, false, `without the fix the leak must show: ${JSON.stringify(result)}`);
  });
  check(`pre-commit: ${name} commits exactly the intended change`, () => {
    const result = runScenario(hookUnderTest, scenario);
    assert.equal(result.verifyRan, true, `verify.sh must still run\n${result.output}`);
    assert.doesNotMatch(result.verifyEnv, LOCATION, `verify.sh must not receive a git location variable\n${result.verifyEnv}`);
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(result.changed, ['tracked.txt']);
    assert.equal(result.leakedInIndex, false, 'the fixture must not reach any index of the repository');
  });
}

check('pre-commit: the secret scan still reads the index being committed for commit -- <path>', () => {
  const result = runScenario(hookUnderTest, {
    file: 'secret.txt', content: `${'AKIA'}${'Q'.repeat(16)}\n`, args: ['commit', '-qm', 'change', '--', 'secret.txt'],
  });
  assert.notEqual(result.status, 0, 'a staged secret must still block the commit');
  assert.match(result.output, /AWS Access Key ID/);
  assert.equal(result.committed, false);
});

console.log(`\npre-commit env: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
