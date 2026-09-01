#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  discoverControlState,
  gitCommonDirRealpath,
  pathTuple,
  sha256Bytes,
} from './controlled-change.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER = join(ROOT, 'scripts', 'controlled-change-controller.mjs');
const CORE = join(ROOT, 'scripts', 'controlled-change.mjs');
const GUARD = join(ROOT, '.claude', 'hooks', 'controlled-change-guard.mjs');
const ADAPTER = join(ROOT, '.codex', 'codex-hook-adapter.mjs');
const CODEX_HOOKS = join(ROOT, '.codex', 'hooks.json');
const PLAN_SHA = '1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9';

const tests = new Map();
function test(name, fn) { tests.set(name, fn); }

// git 钩子会把仓库位置注入环境，而这些变量**压过 `-C`**：本测试所有 `git(repo, …)` 调用
// 都会被重定向到真仓。链接 worktree 尤其危险——实测 git 在 worktree 的 pre-commit 里注入
// **绝对路径**的 GIT_DIR + GIT_INDEX_FILE（普通仓只注入相对的 GIT_INDEX_FILE，不注入 GIT_DIR），
// 于是 fixture 的 `git commit -qm fixture` 会拿**当时的暂存区**在**用户的分支**上造出一条
// 名为 `fixture` 的提交（内容 = 用户已 add 的文件 + target.txt）。`verify.sh` 是 pre-commit
// 的最后一步，所以这条路径在每次 worktree 提交时都会走到。故显式剥离位置类 GIT_*。
const GIT_LOCATION_ENV = [
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_PREFIX',
];

function run(command, args, options = {}) {
  const inherited = { ...process.env };
  for (const key of GIT_LOCATION_ENV) delete inherited[key];
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...inherited, ...(options.env || {}) },
    input: options.input,
    encoding: 'utf8',
    timeout: 30000,
  });
}

function git(repo, ...args) {
  const result = run('/usr/bin/git', ['-C', repo, ...args]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function fixture() {
  const root = mkdtempSync(join(process.env.LUCA_CONTROLLED_TEST_TMPDIR || tmpdir(), 'luca-controlled-change-test-'));
  const repo = join(root, 'repo');
  const scratchPath = join(root, 'scratch');
  mkdirSync(repo, { recursive: true });
  mkdirSync(scratchPath, { recursive: true });
  const scratch = realpathSync(scratchPath);
  assert.equal(run('/usr/bin/git', ['init', '-q', repo]).status, 0);
  git(repo, 'config', 'user.name', 'Controlled Change Test');
  git(repo, 'config', 'user.email', 'controlled-change@example.invalid');
  writeFileSync(join(repo, 'target.txt'), 'before\n');
  git(repo, 'add', 'target.txt');
  git(repo, 'commit', '-qm', 'fixture');
  const repoReal = realpathSync(repo);
  const head = git(repo, 'rev-parse', 'HEAD');
  const post = { type: 'file', mode: '100644', sha256: sha256Bytes(Buffer.from('after\n')) };
  const manifest = {
    schema_version: 1,
    task_id: 'matt-six-testfixture',
    u_id: 'U-003',
    repo_realpath: repoReal,
    git_common_dir_realpath: gitCommonDirRealpath(repoReal),
    plan_sha256: PLAN_SHA,
    plan_recorded_baseline: head,
    observed_baseline: head,
    session: 'test-session',
    scratch_root: scratch,
    repo_paths: [{ path: 'target.txt', mutation: 'modify', preimage: pathTuple(join(repo, 'target.txt')), postimage: post }],
    external_paths: [],
    mutation_classes: ['modify'],
    approved_effects: [],
    allowed_commands: ['node scripts/example-read-only.mjs'],
  };
  const manifestPath = join(scratch, 'manifest.json');
  writeFileSync(manifestPath, `${canonicalJson(manifest)}\n`);
  return {
    root, repo: repoReal, scratch, manifest, manifestPath,
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

function controller(f, command, extra = [], env = {}) {
  return run(process.execPath, [CONTROLLER, command, '--manifest', f.manifestPath, ...extra], { cwd: f.repo, env });
}

function persistManifest(f) {
  writeFileSync(f.manifestPath, `${canonicalJson(f.manifest)}\n`);
}

function assertManifestRejected(f, path, label) {
  const variant = { ...f.manifest, repo_paths: [{ ...f.manifest.repo_paths[0], path }] };
  const candidate = join(f.scratch, `invalid-${label}.json`);
  writeFileSync(candidate, `${canonicalJson(variant)}\n`);
  const result = run(process.execPath, [CORE, 'manifest-sha', '--manifest', candidate], { cwd: f.repo });
  assert.equal(result.status, 2, `${label} manifest path must be rejected`);
}

function guard(f, payload) {
  return run(process.execPath, [GUARD], {
    cwd: f.repo,
    env: { CLAUDE_PROJECT_DIR: f.repo },
    input: JSON.stringify(payload),
  });
}

function prepare(f, generation = 'generation-test-0001') {
  const result = controller(f, 'prepare', ['--generation', generation, '--ttl-seconds', '3600']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function abort(f) {
  const result = controller(f, 'abort', ['--reason', 'test-cleanup']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function installFreshBootstrapFixture(f) {
  const bootstrapTarget = join(f.repo, 'bootstrap.txt');
  writeFileSync(bootstrapTarget, 'bootstrapped\n');
  const bootstrapPatch = join(f.scratch, 'BOOTSTRAP.patch');
  const patchBytes = [
    'diff --git a/bootstrap.txt b/bootstrap.txt',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/bootstrap.txt',
    '@@ -0,0 +1 @@',
    '+bootstrapped',
    '',
  ].join('\n');
  writeFileSync(bootstrapPatch, patchBytes);
  const bootstrapManifest = join(f.scratch, 'BOOTSTRAP-MANIFEST.tsv');
  const header = [
    'plan_sha256', 'plan_recorded_baseline', 'observed_baseline', 'scope', 'path', 'action',
    'pre_type', 'pre_mode', 'pre_sha256', 'post_type', 'post_mode', 'post_sha256', 'patch_included',
  ].join('\t');
  const postimage = pathTuple(bootstrapTarget);
  const row = [
    PLAN_SHA, f.manifest.plan_recorded_baseline, f.manifest.observed_baseline, 'repo', 'bootstrap.txt', 'add',
    'absent', '-', '-', postimage.type, postimage.mode, postimage.sha256, 'yes',
  ].join('\t');
  writeFileSync(bootstrapManifest, `${header}\n${row}\n`);
  f.manifest.dormant_until = 'fresh_bootstrap_pass';
  f.manifest.metadata = {
    bootstrap: {
      patch_path: bootstrapPatch,
      patch_sha256: sha256Bytes(Buffer.from(patchBytes, 'utf8')),
      manifest_path: bootstrapManifest,
      manifest_sha256: sha256Bytes(readFileSync(bootstrapManifest)),
    },
  };
  mkdirSync(join(f.repo, 'scripts'), { recursive: true });
  writeFileSync(join(f.repo, 'scripts', 'test-controlled-change.mjs'), 'process.stdout.write("PASS M6-A01 fixture\\n");\n');
  writeFileSync(join(f.repo, 'scripts', 'verify-codex-wiring.mjs'), 'process.stdout.write("PASS M6-A02 Codex fixture\\n");\n');
  writeFileSync(join(f.repo, 'scripts', 'check-hooks-fixture.mjs'), 'process.stdout.write("PASS M6-A02 Claude fixture\\n");\n');
  writeFileSync(join(f.repo, 'package.json'), `${JSON.stringify({
    private: true,
    scripts: { 'check:hooks': 'node scripts/check-hooks-fixture.mjs' },
  })}\n`);
  persistManifest(f);
  const receiptPath = join(f.scratch, 'fresh-bootstrap-receipt.json');
  const produced = run(process.execPath, [
    CORE, 'fresh-bootstrap-receipt', '--manifest', f.manifestPath, '--output', receiptPath,
  ], { cwd: f.repo });
  assert.equal(produced.status, 0, `fresh bootstrap producer failed\n${produced.stderr}\n${produced.stdout}`);
  return { bootstrapTarget, bootstrapPatch, bootstrapManifest, receiptPath };
}

function installAdapterFixture(f) {
  mkdirSync(join(f.repo, '.codex'), { recursive: true });
  mkdirSync(join(f.repo, '.claude', 'hooks'), { recursive: true });
  mkdirSync(join(f.repo, 'scripts'), { recursive: true });
  copyFileSync(ADAPTER, join(f.repo, '.codex', 'codex-hook-adapter.mjs'));
  copyFileSync(CORE, join(f.repo, 'scripts', 'controlled-change.mjs'));
  copyFileSync(CODEX_HOOKS, join(f.repo, '.codex', 'hooks.json'));
  writeFileSync(join(f.repo, '.claude', 'hooks', 'project-scope-guard.mjs'), 'process.exitCode = 0;\n');
  copyFileSync(GUARD, join(f.repo, '.claude', 'hooks', 'controlled-change-guard.mjs'));
  const hooksBytes = readFileSync(CODEX_HOOKS);
  assert.equal(sha256Bytes(hooksBytes), 'be5732086a10d51939d382f22a6404827b85818502f30c3f49b965dd52d99dae', 'registered Codex hooks trust bytes drifted');
  const registered = JSON.parse(hooksBytes).hooks.PreToolUse[0].hooks[0].command;
  const sink = join(f.scratch, 'registered-wrapper.log');
  const executable = registered.replace('2>> /tmp/luca-gstack-hooks.log', `2>> "${sink}"`);
  assert.notEqual(executable, registered, 'test harness must relocate exactly one log sink into authorized scratch');
  assert.equal(executable.replace(`2>> "${sink}"`, '2>> /tmp/luca-gstack-hooks.log'), registered, 'test wrapper may change only the log sink, not registered command semantics');
  return { registered, executable };
}

function runRegisteredPreToolWrapper(f, executable, env = {}, options = {}) {
  const payload = {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: options.command || 'node scripts/example-read-only.mjs' },
  };
  if (options.includeCwd !== false) payload.cwd = options.cwd || f.repo;
  return run('/bin/sh', ['-c', executable], {
    cwd: f.repo,
    env,
    input: JSON.stringify(payload),
  });
}

test('scratch-authority-boundary', () => {
  for (const placement of ['repo-equal', 'repo-descendant', 'repo-ancestor']) {
    const f = fixture();
    try {
      const unauthorizedScratch = placement === 'repo-equal'
        ? f.repo
        : placement === 'repo-descendant' ? join(f.repo, 'scratch-authority') : realpathSync(f.root);
      if (placement === 'repo-descendant') mkdirSync(unauthorizedScratch, { recursive: true });
      f.manifest.scratch_root = unauthorizedScratch;
      persistManifest(f);
      const result = controller(f, 'prepare', ['--generation', `generation-scratch-${placement}`, '--ttl-seconds', '3600']);
      assert.equal(result.status, 2, `${placement} scratch authority must be rejected`);
      const witness = join(f.manifest.git_common_dir_realpath, 'luca-controlled-change', f.manifest.task_id, 'required-witness.json');
      assert.equal(existsSync(witness), false, `${placement} must be rejected before writing a witness`);
    } finally { f.cleanup(); }
  }
});

test('exact-patch-binding', () => {
  const f = fixture();
  try {
    prepare(f, 'generation-patch-metadata');
    const patch = ['*** Begin Patch', `*** Update File: ${join(f.repo, 'target.txt')}`, '@@', '-before', '+after', '*** End Patch'].join('\n');
    const missingMetadata = guard(f, { tool_name: 'apply_patch', tool_input: { command: patch } });
    assert.equal(missingMetadata.status, 2, 'apply_patch must require an exact manifest metadata.patch_sha256 binding');
    abort(f);
  } finally { f.cleanup(); }
});

test('effect-command-binding', () => {
  const f = fixture();
  try {
    f.manifest.approved_effects = ['git-stage'];
    persistManifest(f);
    prepare(f, 'generation-effect-command');
    const command = 'git add target.txt';
    const authorized = controller(f, 'authorize-effect', [
      '--effect', 'git-stage', '--gate', 'gate-stage-target',
      '--command-sha256', sha256Bytes(Buffer.from(command, 'utf8')),
      '--cwd', f.repo, '--authorization-token', 'effect-token-command-0001',
    ]);
    assert.equal(authorized.status, 0, authorized.stderr);
    const overbroad = guard(f, { cwd: f.repo, tool_name: 'Bash', tool_input: { command: 'git add -A' } });
    assert.equal(overbroad.status, 2, 'category authorization for git add target.txt must not authorize git add -A');
    const exact = guard(f, { cwd: f.repo, tool_name: 'Bash', tool_input: { command } });
    assert.equal(exact.status, 0, exact.stderr);
    const consumedState = discoverControlState(f.repo);
    assert.equal(consumedState.current.witness.effect_authorizations[0].remaining_uses, 0);
    assert.equal(consumedState.current.witness.effect_authorizations[0].outcome, 'EFFECT_UNKNOWN');
    const unknown = controller(f, 'record', ['--state', 'EFFECT_UNKNOWN']);
    assert.equal(unknown.status, 0, unknown.stderr);
    const reused = guard(f, { cwd: f.repo, tool_name: 'Bash', tool_input: { command } });
    assert.equal(reused.status, 2, 'one-use exact command authorization must not be reusable');
    const reauthorized = controller(f, 'authorize-effect', [
      '--effect', 'git-stage', '--gate', 'gate-stage-target',
      '--command-sha256', sha256Bytes(Buffer.from(command, 'utf8')),
      '--cwd', f.repo, '--authorization-token', 'effect-token-command-0001',
    ]);
    assert.equal(reauthorized.status, 2, 'a consumed authorization token must not be reauthorized');
    abort(f);
  } finally { f.cleanup(); }
});

test('effect-crash-recovery', () => {
  const f = fixture();
  try {
    f.manifest.approved_effects = ['git-stage'];
    persistManifest(f);
    prepare(f, 'generation-effect-crash');
    const command = 'git add target.txt';
    const commonArgs = [
      '--effect', 'git-stage', '--gate', 'gate-stage-crash',
      '--command-sha256', sha256Bytes(Buffer.from(command, 'utf8')),
      '--cwd', f.repo, '--authorization-token', 'effect-token-crash-0001',
    ];
    const crashed = controller(f, 'authorize-effect', commonArgs, { LUCA_CONTROLLED_TEST_CRASH: 'after-effect-authorization' });
    assert.equal(crashed.status, 2, 'post-write effect authorization crash point must report failure');
    assert.equal(discoverControlState(f.repo).kind, 'required', 'effect authorization crash must preserve a valid witness/active pair');
    const recovered = controller(f, 'authorize-effect', commonArgs);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(JSON.parse(recovered.stdout).recovered, true, 'exact authorization retry must be idempotent');
    const differentToken = controller(f, 'authorize-effect', [
      ...commonArgs.slice(0, -2), '--authorization-token', 'effect-token-crash-0002',
    ]);
    assert.equal(differentToken.status, 2, 'a different token must not take over an outstanding authorization');
    const changedCommand = controller(f, 'authorize-effect', [
      '--effect', 'git-stage', '--gate', 'gate-stage-crash',
      '--command-sha256', sha256Bytes(Buffer.from('git add -A', 'utf8')),
      '--cwd', f.repo, '--authorization-token', 'effect-token-crash-0001',
    ]);
    assert.equal(changedCommand.status, 2, 'a token must not be rebound to different command bytes');
    abort(f);
  } finally { f.cleanup(); }
});

test('dormant-bootstrap-binding', () => {
  const valid = fixture();
  try {
    const artifacts = installFreshBootstrapFixture(valid);
    const prepared = controller(valid, 'prepare', [
      '--generation', 'generation-bootstrap-valid', '--fresh-bootstrap-receipt', artifacts.receiptPath,
    ]);
    assert.equal(prepared.status, 0, prepared.stderr);
    abort(valid);
  } finally { valid.cleanup(); }

  for (const mutant of ['zero-patch-sha', 'mismatched-manifest', 'stale-postimage', 'forged-gate-output']) {
    const f = fixture();
    try {
      const artifacts = installFreshBootstrapFixture(f);
      if (mutant === 'stale-postimage') {
        writeFileSync(artifacts.bootstrapTarget, 'stale-bootstrap-postimage\n');
      } else {
        const receipt = JSON.parse(readFileSync(artifacts.receiptPath, 'utf8'));
        if (mutant === 'zero-patch-sha') receipt.bootstrap_patch_sha256 = '0'.repeat(64);
        else if (mutant === 'mismatched-manifest') receipt.bootstrap_manifest_sha256 = 'f'.repeat(64);
        else receipt.gates[0].commands[0].output_sha256 = 'e'.repeat(64);
        writeFileSync(artifacts.receiptPath, `${canonicalJson(receipt)}\n`);
      }
      const denied = controller(f, 'prepare', [
        '--generation', `generation-bootstrap-${mutant}`, '--fresh-bootstrap-receipt', artifacts.receiptPath,
      ]);
      assert.equal(denied.status, 2, `${mutant} bootstrap receipt/artifact mutant must remain dormant`);
      const witness = join(f.manifest.git_common_dir_realpath, 'luca-controlled-change', f.manifest.task_id, 'required-witness.json');
      assert.equal(existsSync(witness), false, `${mutant} must deny before writing the required witness`);
    } finally { f.cleanup(); }
  }
});

test('adapter-runtime-fail-closed', () => {
  for (const injection of ['throw', 'timeout', 'read-error', 'spawn-throw', 'null-result']) {
    const required = fixture();
    try {
      prepare(required, `generation-adapter-${injection}`);
      const { executable } = installAdapterFixture(required);
      const env = injection === 'throw'
        ? { LUCA_CONTROLLED_TEST_ADAPTER_THROW: 'after-context' }
        : injection === 'timeout'
          ? { LUCA_CONTROLLED_TEST_ADAPTER_TIMEOUT: 'project-scope' }
          : injection === 'read-error'
            ? { LUCA_CONTROLLED_TEST_ADAPTER_READ_ERROR: 'project-scope' }
            : injection === 'spawn-throw'
              ? { LUCA_CONTROLLED_TEST_ADAPTER_SPAWN_THROW: 'project-scope' }
              : { LUCA_CONTROLLED_TEST_ADAPTER_NULL_RESULT: 'project-scope' };
      const result = runRegisteredPreToolWrapper(required, executable, env);
      assert.equal(result.status, 2, `registered wrapper must preserve required-witness denial on adapter ${injection}`);
      abort(required);
    } finally { required.cleanup(); }

    const inactive = fixture();
    try {
      const { executable } = installAdapterFixture(inactive);
      const env = injection === 'throw'
        ? { LUCA_CONTROLLED_TEST_ADAPTER_THROW: 'after-context' }
        : injection === 'timeout'
          ? { LUCA_CONTROLLED_TEST_ADAPTER_TIMEOUT: 'project-scope' }
          : injection === 'read-error'
            ? { LUCA_CONTROLLED_TEST_ADAPTER_READ_ERROR: 'project-scope' }
            : injection === 'spawn-throw'
              ? { LUCA_CONTROLLED_TEST_ADAPTER_SPAWN_THROW: 'project-scope' }
              : { LUCA_CONTROLLED_TEST_ADAPTER_NULL_RESULT: 'project-scope' };
      const result = runRegisteredPreToolWrapper(inactive, executable, env);
      assert.equal(result.status, 0, `strictly inactive adapter ${injection} must retain legacy fail-open semantics`);
    } finally { inactive.cleanup(); }
  }

  const compromised = fixture();
  try {
    prepare(compromised, 'generation-adapter-syntax');
    const { executable } = installAdapterFixture(compromised);
    writeFileSync(join(compromised.repo, '.codex', 'codex-hook-adapter.mjs'), 'this is deliberately invalid JavaScript !\n');
    const syntaxResult = runRegisteredPreToolWrapper(compromised, executable);
    assert.equal(syntaxResult.status, 0, 'byte-level syntax corruption prevents adapter execution and remains the explicit FINAL-MASTER §0.4 compromised-hook exclusion');
    assert.match(readFileSync(ADAPTER, 'utf8'), /syntax-byte corruption[\s\S]*compromised hook/i, 'adapter must document the mechanically unavoidable trusted-command boundary');
  } finally { compromised.cleanup(); }
});

test('adapter-outside-cwd-fail-closed', () => {
  const required = fixture();
  try {
    prepare(required, 'generation-adapter-outside-cwd');
    const { executable } = installAdapterFixture(required);
    const unauthorized = `git -C ${required.repo} add -A`;

    const missingCwd = runRegisteredPreToolWrapper(required, executable, {}, {
      includeCwd: false,
      command: unauthorized,
    });
    assert.equal(missingCwd.status, 2, 'missing cwd control must deny the unauthorized Git effect under REQUIRED witness');

    const outsideCwd = runRegisteredPreToolWrapper(required, executable, {}, {
      cwd: '/private/tmp',
      command: unauthorized,
    });
    assert.equal(outsideCwd.status, 2, 'outside payload cwd must not bypass a durable REQUIRED witness');

    const fallback = run(process.execPath, [CORE, 'hook-failure-decision', '--repo', required.repo], { cwd: required.repo });
    assert.equal(fallback.status, 2, 'durable witness fallback must independently deny while REQUIRED');
    abort(required);
  } finally { required.cleanup(); }

  const inactive = fixture();
  try {
    const { executable } = installAdapterFixture(inactive);
    const outsideCwd = runRegisteredPreToolWrapper(inactive, executable, {}, {
      cwd: '/private/tmp',
      command: `git -C ${inactive.repo} add -A`,
    });
    assert.equal(outsideCwd.status, 0, 'strictly inactive outside-cwd invocation must preserve legacy fail-open behavior');
  } finally { inactive.cleanup(); }
});

test('manifest-cas-receipt', () => {
  const f = fixture();
  try {
    assertManifestRejected(f, '../escape.txt', 'traversal');
    assertManifestRejected(f, '*.txt', 'glob');
    assertManifestRejected(f, join(f.repo, 'target.txt'), 'absolute');

    const external = join(f.root, 'external.txt');
    writeFileSync(external, 'external-before\n');
    f.manifest.external_paths = [{
      path: external,
      mutation: 'modify',
      preimage: pathTuple(external),
      postimage: { type: 'file', mode: '100644', sha256: sha256Bytes(Buffer.from('external-after\n')) },
    }];
    persistManifest(f);
    const prepared = prepare(f);
    assert.equal(prepared.state, 'REQUIRED');
    assert.equal(discoverControlState(f.repo).kind, 'required');

    writeFileSync(join(f.repo, 'target.txt'), 'drift\n');
    const stale = run(process.execPath, [CORE, 'check', '--manifest', f.manifestPath, '--phase', 'pre'], { cwd: f.repo });
    assert.equal(stale.status, 2, 'stale preimage must fail');
    writeFileSync(join(f.repo, 'target.txt'), 'before\n');

    writeFileSync(external, 'external-drift\n');
    const externalDrift = run(process.execPath, [CORE, 'check', '--manifest', f.manifestPath, '--phase', 'pre'], { cwd: f.repo });
    assert.equal(externalDrift.status, 2, 'concurrent external edit must fail CAS');
    writeFileSync(external, 'external-before\n');

    writeFileSync(join(f.repo, 'target.txt'), 'after\n');
    writeFileSync(external, 'external-after\n');
    const post = run(process.execPath, [CORE, 'check', '--manifest', f.manifestPath, '--phase', 'post'], { cwd: f.repo });
    assert.equal(post.status, 0, post.stderr);
    const finished = controller(f, 'finish', ['--state', 'COMPLETED']);
    assert.equal(finished.status, 0, finished.stderr);
    const state = discoverControlState(f.repo);
    assert.equal(state.kind, 'inactive');
    const receipt = JSON.parse(readFileSync(join(f.manifest.git_common_dir_realpath, 'luca-controlled-change', f.manifest.task_id, 'receipt.json'), 'utf8'));
    assert.deepEqual(receipt.history.map((event) => event.state), ['PREPARED', 'COMPLETED']);
  } finally { f.cleanup(); }
});

test('controller-required-active-crash', async () => {
  for (const point of ['after-witness', 'after-active']) {
    const f = fixture();
    try {
      const generation = `generation-${point}-0001`;
      const crashed = controller(f, 'prepare', ['--generation', generation, '--ttl-seconds', '3600'], { LUCA_CONTROLLED_TEST_CRASH: point });
      assert.equal(crashed.status, 2, `${point} must report failure`);
      const failClosed = run(process.execPath, [CORE, 'hook-failure-decision', '--repo', f.repo], { cwd: f.repo });
      assert.equal(failClosed.status, 2, `${point} must leave a fail-closed witness`);

      const resumed = controller(f, 'prepare', ['--generation', generation, '--ttl-seconds', '3600']);
      assert.equal(resumed.status, 0, resumed.stderr);
      assert.equal(JSON.parse(resumed.stdout).recovered, true);
      const receiptPath = join(f.manifest.git_common_dir_realpath, 'luca-controlled-change', f.manifest.task_id, 'receipt.json');
      const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
      assert.equal(receipt.history.at(-1).state, 'PREPARED');
      abort(f);
      assert.equal(discoverControlState(f.repo).kind, 'inactive');
    } finally { f.cleanup(); }
  }

  const f = fixture();
  try {
    const crashed = controller(f, 'prepare', ['--generation', 'generation-mismatch-0001'], { LUCA_CONTROLLED_TEST_CRASH: 'after-witness' });
    assert.equal(crashed.status, 2);
    const mismatch = controller(f, 'prepare', ['--generation', 'generation-mismatch-0002']);
    assert.equal(mismatch.status, 2, 'mismatched generation must remain fail-closed');
    const resumed = controller(f, 'prepare', ['--generation', 'generation-mismatch-0001']);
    assert.equal(resumed.status, 0, resumed.stderr);
    abort(f);
  } finally { f.cleanup(); }

  const terminal = fixture();
  try {
    prepare(terminal, 'generation-terminal-cas-0001');
    const crashed = controller(terminal, 'abort', ['--reason', 'terminal-cas-test'], { LUCA_CONTROLLED_TEST_CRASH: 'after-terminal-witness' });
    assert.equal(crashed.status, 2, 'terminal witness crash point must report failure');
    const stateDir = join(terminal.manifest.git_common_dir_realpath, 'luca-controlled-change', terminal.manifest.task_id);
    const activePath = join(stateDir, 'active-context.json');
    const activeOriginal = readFileSync(activePath, 'utf8');
    const foreignActive = `${canonicalJson({ ...JSON.parse(activeOriginal), generation: 'generation-foreign-active-0001' })}\n`;
    writeFileSync(activePath, foreignActive);
    const rejected = controller(terminal, 'abort', ['--reason', 'must-not-delete-foreign-active']);
    assert.equal(rejected.status, 2, 'terminal recovery must reject a foreign-generation active context');
    assert.equal(readFileSync(activePath, 'utf8'), foreignActive, 'terminal recovery must not delete or rewrite foreign active bytes');
    writeFileSync(activePath, activeOriginal);
    const recovered = controller(terminal, 'abort', ['--reason', 'terminal-cas-test']);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(JSON.parse(recovered.stdout).recovered, true);
    assert.equal(existsSync(activePath), false, 'matching bound active context must be removed by CAS');
  } finally { terminal.cleanup(); }

  const concurrent = fixture();
  let first;
  try {
    const secondManifest = {
      ...concurrent.manifest,
      task_id: 'matt-six-testfixture-second',
      u_id: 'U-004',
    };
    const secondManifestPath = join(concurrent.scratch, 'manifest-second.json');
    writeFileSync(secondManifestPath, `${canonicalJson(secondManifest)}\n`);
    first = spawn(process.execPath, [
      CONTROLLER, 'prepare', '--manifest', concurrent.manifestPath,
      '--generation', 'generation-concurrent-first', '--ttl-seconds', '3600',
    ], {
      cwd: concurrent.repo,
      env: {
        ...process.env,
        LUCA_CONTROLLED_TEST_FLOCK_READY: '1',
        LUCA_CONTROLLED_TEST_HOLD_BEFORE_WITNESS_MS: '2000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let firstStdout = '';
    let firstStderr = '';
    first.stdout.on('data', (chunk) => { firstStdout += chunk; });
    let readyResolve;
    const ready = new Promise((resolveReady) => { readyResolve = resolveReady; });
    first.stderr.on('data', (chunk) => {
      firstStderr += chunk;
      if (firstStderr.includes('LUCA_CONTROLLED_FLOCK_READY')) readyResolve(true);
    });
    const controlRootPath = join(concurrent.manifest.git_common_dir_realpath, 'luca-controlled-change');
    const firstWitness = join(controlRootPath, concurrent.manifest.task_id, 'required-witness.json');
    const secondWitness = join(controlRootPath, secondManifest.task_id, 'required-witness.json');
    const readyObserved = await Promise.race([
      ready,
      new Promise((resolveReady) => setTimeout(() => resolveReady(false), 3000)),
    ]);
    assert.equal(readyObserved, true, `first prepare did not expose the held-flock sentinel\n${firstStderr}`);
    assert.equal(existsSync(firstWitness), false, 'flock sentinel must precede the first task witness write');
    assert.equal(existsSync(secondWitness), false, 'flock sentinel must precede every competing task witness write');
    const second = run(process.execPath, [
      CONTROLLER, 'prepare', '--manifest', secondManifestPath,
      '--generation', 'generation-concurrent-second', '--ttl-seconds', '3600',
    ], { cwd: concurrent.repo });
    assert.equal(second.status, 2, 'a concurrent prepare for a second task must be rejected before writing its witness');
    assert.equal(existsSync(secondWitness), false, 'rejected concurrent task must not create a required witness');
    assert.equal(existsSync(firstWitness), false, 'first task must still be in the pre-witness hold when the competing prepare is rejected');
    const firstStatus = await new Promise((done) => first.once('close', done));
    assert.equal(firstStatus, 0, firstStderr || firstStdout);
    assert.equal(existsSync(join(controlRootPath, 'prepare-lease.json')), false, 'advisory flock must not create an unauthorized lease path');
    abort(concurrent);
  } finally {
    if (first && first.exitCode === null) {
      const closed = new Promise((done) => first.once('close', done));
      first.kill('SIGTERM');
      await closed;
    }
    concurrent.cleanup();
  }
});

test('dual-harness-active-guard', () => {
  const f = fixture();
  try {
    const inactive = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'outside.txt'), content: 'x' } });
    assert.equal(inactive.status, 0, 'inactive ordinary task must pass');
    const codexPatch = ['*** Begin Patch', `*** Update File: ${join(f.repo, 'target.txt')}`, '@@', '-before', '+after', '*** End Patch'].join('\n');
    f.manifest.metadata = { patch_sha256: sha256Bytes(Buffer.from(codexPatch, 'utf8')) };
    persistManifest(f);
    prepare(f);

    const claudeAllowed = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'target.txt'), content: 'after\n' } });
    assert.equal(claudeAllowed.status, 0, claudeAllowed.stderr);
    const claudeExtra = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'outside.txt'), content: 'x' } });
    assert.equal(claudeExtra.status, 2, 'Claude extra path must deny');

    const codexAllowed = guard(f, { tool_name: 'apply_patch', tool_input: { command: codexPatch } });
    assert.equal(codexAllowed.status, 0, codexAllowed.stderr);
    const wrongHashPatch = codexPatch.replace('+after', '+partial');
    const wrongHash = guard(f, { tool_name: 'apply_patch', tool_input: { command: wrongHashPatch } });
    assert.equal(wrongHash.status, 2, 'partial/wrong exact patch bytes must deny');
    const codexExtraPatch = ['*** Begin Patch', `*** Add File: ${join(f.repo, 'outside.txt')}`, '+x', '*** End Patch'].join('\n');
    const codexExtra = guard(f, { tool_name: 'apply_patch', tool_input: { command: codexExtraPatch } });
    assert.equal(codexExtra.status, 2, 'Codex extra path must deny');

    const bashWrite = guard(f, { tool_name: 'Bash', tool_input: { command: `printf x > ${join(f.repo, 'target.txt')}` } });
    assert.equal(bashWrite.status, 2, 'arbitrary Bash must deny');
    const gitStage = guard(f, { tool_name: 'Bash', tool_input: { command: 'git add target.txt' } });
    assert.equal(gitStage.status, 2, 'implicit Git stage must deny');
    const selfAbort = guard(f, { tool_name: 'Bash', tool_input: { command: `node scripts/controlled-change-controller.mjs abort --manifest ${f.manifestPath}` } });
    assert.equal(selfAbort.status, 2, 'active writer must not clear its marker through controller');
    const selfAuthorize = guard(f, { tool_name: 'Bash', tool_input: { command: `node scripts/controlled-change-controller.mjs authorize-effect --manifest ${f.manifestPath} --effect git-push --gate fake` } });
    assert.equal(selfAuthorize.status, 2, 'active writer must not self-authorize an effect');
    const exactRead = guard(f, { tool_name: 'Bash', tool_input: { command: 'node scripts/example-read-only.mjs' } });
    assert.equal(exactRead.status, 0, exactRead.stderr);
    writeFileSync(join(f.repo, 'target.txt'), 'partially-applied\n');
    const partialApply = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'target.txt'), content: 'after\n' } });
    assert.equal(partialApply.status, 2, 'partial apply must turn the next CAS check red');
    writeFileSync(join(f.repo, 'target.txt'), 'before\n');
    abort(f);
  } finally { f.cleanup(); }
});

test('required-context-bypass', () => {
  const f = fixture();
  try {
    prepare(f);
    const state = discoverControlState(f.repo);
    assert.equal(state.kind, 'required');
    const activeOriginal = readFileSync(state.current.paths.active, 'utf8');
    const activeObject = JSON.parse(activeOriginal);
    for (const [field, value] of [
      ['generation', 'wrong-generation-0001'],
      ['plan_sha256', 'b'.repeat(64)],
      ['manifest_sha256', 'c'.repeat(64)],
    ]) {
      writeFileSync(state.current.paths.active, `${canonicalJson({ ...activeObject, [field]: value })}\n`);
      const mismatch = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'target.txt'), content: 'after\n' } });
      assert.equal(mismatch.status, 2, `wrong active ${field} must deny`);
      writeFileSync(state.current.paths.active, activeOriginal);
    }
    unlinkSync(state.current.paths.active);
    const missing = guard(f, { tool_name: 'Write', tool_input: { file_path: join(f.repo, 'target.txt'), content: 'after\n' } });
    assert.equal(missing.status, 2, 'non-terminal witness + missing active must deny');
    const mutant = run(process.execPath, [CORE, 'hook-failure-decision', '--repo', f.repo], { cwd: f.repo });
    assert.equal(mutant.status, 2, 'wrapper fallback must remain non-zero when guard is unavailable');

    const badGuard = join(f.scratch, 'controlled-change-guard-mutant.mjs');
    writeFileSync(badGuard, 'throw new Error("mutant");\n');
    const adapted = run(process.execPath, [ADAPTER, badGuard], {
      cwd: ROOT,
      input: JSON.stringify({ cwd: ROOT, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'true' } }),
    });
    assert.equal(adapted.status, 1, 'Codex adapter must propagate a controlled guard crash to its witness-aware wrapper');

    // Normal Codex trust surface: the existing trusted project-scope entry calls the adapter,
    // which chains controlled-change internally. Exercise that exact path in an isolated repo.
    mkdirSync(join(f.repo, '.codex'), { recursive: true });
    mkdirSync(join(f.repo, '.claude', 'hooks'), { recursive: true });
    mkdirSync(join(f.repo, 'scripts'), { recursive: true });
    copyFileSync(ADAPTER, join(f.repo, '.codex', 'codex-hook-adapter.mjs'));
    copyFileSync(CORE, join(f.repo, 'scripts', 'controlled-change.mjs'));
    writeFileSync(join(f.repo, '.claude', 'hooks', 'project-scope-guard.mjs'), 'process.exitCode = 0;\n');
    writeFileSync(join(f.repo, '.claude', 'hooks', 'controlled-change-guard.mjs'), 'throw new Error("chain mutant");\n');
    const chained = run(process.execPath, [
      join(f.repo, '.codex', 'codex-hook-adapter.mjs'),
      join(f.repo, '.claude', 'hooks', 'project-scope-guard.mjs'),
    ], {
      cwd: f.repo,
      input: JSON.stringify({ cwd: f.repo, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'true' } }),
    });
    assert.equal(chained.status, 2, `already-trusted project-scope entry must fail closed when its chained controlled guard crashes\n${chained.stderr}\n${chained.stdout}`);

    const resumed = controller(f, 'prepare', ['--generation', state.current.witness.generation]);
    assert.equal(resumed.status, 0, resumed.stderr);
    const activePath = discoverControlState(f.repo).current.paths.active;
    writeFileSync(activePath, '{malformed');
    const malformed = guard(f, { tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** End Patch' } });
    assert.equal(malformed.status, 2, 'malformed active must deny');
  } finally { f.cleanup(); }

  const staleFixture = fixture();
  try {
    const oldNow = Date.now() - 120000;
    const stalePrepared = controller(staleFixture, 'prepare', [
      '--generation', 'generation-stale-0001', '--ttl-seconds', '30', '--now', String(oldNow),
    ]);
    assert.equal(stalePrepared.status, 0, stalePrepared.stderr);
    const stale = guard(staleFixture, { tool_name: 'Write', tool_input: { file_path: join(staleFixture.repo, 'target.txt'), content: 'after\n' } });
    assert.equal(stale.status, 2, 'stale active context must deny');
  } finally { staleFixture.cleanup(); }

  for (const receiptFailure of ['missing', 'mismatched']) {
    const terminalFixture = fixture();
    try {
      prepare(terminalFixture, `generation-terminal-${receiptFailure}`);
      abort(terminalFixture);
      const dir = join(terminalFixture.manifest.git_common_dir_realpath, 'luca-controlled-change', terminalFixture.manifest.task_id);
      const receiptPath = join(dir, 'receipt.json');
      if (receiptFailure === 'missing') unlinkSync(receiptPath);
      else writeFileSync(receiptPath, `${canonicalJson({ schema_version: 1, task_id: terminalFixture.manifest.task_id, history: [] })}\n`);
      const denied = guard(terminalFixture, { tool_name: 'Write', tool_input: { file_path: join(terminalFixture.repo, 'target.txt'), content: 'x' } });
      assert.equal(denied.status, 2, `terminal witness with ${receiptFailure} receipt must deny`);
    } finally { terminalFixture.cleanup(); }
  }
});

const inventory = [
  'independent-methods',
  'facade-owner-candidate',
  'dual-loader-parity',
  'trigger-contract',
  'flow-and-owner-contract',
  'trigger-and-flow-contract',
  'personal-collision-cutover',
  'candidate-manifest-final',
  'publish-receipt',
];

function selectedCases(argv) {
  const caseIndex = argv.indexOf('--case');
  if (caseIndex >= 0) {
    const name = argv[caseIndex + 1];
    if (!tests.has(name)) throw new Error(`unknown case: ${name}`);
    return [name];
  }
  if (argv.includes('--inventory')) return [];
  if (argv.includes('--all')) return [...tests.keys()];
  throw new Error('usage: test-controlled-change.mjs --all | --case <name> | --inventory');
}

let failures = 0;
try {
  const selected = selectedCases(process.argv.slice(2));
  if (process.argv.includes('--inventory')) {
    for (const name of inventory) process.stdout.write(`RED_NOT_IMPLEMENTED\t${name}\n`);
  }
  for (const name of selected) {
    try { await tests.get(name)(); process.stdout.write(`PASS\t${name}\n`); }
    catch (error) { failures++; process.stderr.write(`FAIL\t${name}\t${error.stack || error}\n`); }
  }
} catch (error) {
  failures++;
  process.stderr.write(`FAIL\tcli\t${error.message}\n`);
}
process.exitCode = failures ? 1 : 0;
