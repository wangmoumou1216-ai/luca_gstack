import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { fork, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = dirname(dirname(fileURLToPath(import.meta.url)));

test('broker without an optional source guard still rejects an ordinary Node parent', async (t) => {
  const root = realpathSync(mkdtempSync('/private/tmp/host-parent-'));
  const projects = join(root, 'projects');
  mkdirSync(projects);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env };
  for (const name of ['NODE_OPTIONS', 'LUCA_CHILD_SOURCE_ROOT', 'LUCA_PROTECTED_CODE_ROOT']) delete env[name];
  const child = fork(join(repository, 'scripts/host-launch-broker.mjs'), [repository, projects], {
    env, execArgv: [], stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.notEqual(status, 0);
  assert.match(stderr, /HOST_PARENT_DENIED/);
  assert.doesNotMatch(stderr, /HOST_SOURCE_UNPROTECTED/);
});
function fixture(t) {
  const root = realpathSync(mkdtempSync('/private/tmp/host-guard-'));
  const gstack = join(root, 'gstack');
  mkdirSync(join(gstack, '.claude', 'host-launch'), { recursive: true });
  assert.equal(spawnSync('git', ['init', '--quiet', gstack], { encoding: 'utf8' }).status, 0);
  mkdirSync(join(gstack, '.codex'), { recursive: true });
  mkdirSync(join(gstack, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'projects'));
  for (const file of ['.codex/codex-hook-adapter.mjs', '.claude/hooks/project-scope-guard.mjs',
    '.claude/hooks/controlled-change-guard.mjs', 'scripts/controlled-change.mjs']) {
    cpSync(join(repository, file), join(gstack, file));
  }
  cpSync(join(repository, '.claude/hooks/lib'), join(gstack, '.claude/hooks/lib'), { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { gstack, run: (tool_name, tool_input, extraEnv = {}) => {
    const result = spawnSync(process.execPath, [join(gstack, '.codex/codex-hook-adapter.mjs'),
      join(gstack, '.claude/hooks/project-scope-guard.mjs')], {
      cwd: gstack, env: { ...process.env, LUCA_PROJECTS_ROOT: join(root, 'projects'),
        LUCA_ACTUAL_HARNESS: 'codex', LUCA_HARNESS_ADAPTED: '1', ...extraEnv },
      input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 'fixture-new-codex',
        cwd: gstack, tool_name, tool_input }), encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(result.error, undefined);
    let output = null;
    if (result.stdout.trim()) output = JSON.parse(result.stdout.trim());
    return { ...result, output };
  } };
}

test('native strict mode rejects adapter exceptions independently of the optional source guard', t => {
  const f = fixture(t);
  const result = f.run('Bash', { command: 'pwd' }, {
    LUCA_NATIVE_HOOK_STRICT: '1', LUCA_CHILD_SOURCE_ROOT: '',
    LUCA_CONTROLLED_TEST_ADAPTER_THROW: 'after-context',
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /injected adapter runtime throw/);
});

test('native strict host wrapper rejects malformed input without source guard or host launch', () => {
  const env = { ...process.env, LUCA_NATIVE_HOOK_STRICT: '1' };
  for (const name of ['NODE_OPTIONS', 'LUCA_CHILD_SOURCE_ROOT', 'LUCA_PROTECTED_CODE_ROOT',
    'MUSE_HOST_LAUNCH_ID', 'MUSE_HOST_LAUNCH_HANDLE']) delete env[name];
  const result = spawnSync(process.execPath, [join(repository, '.codex/host-launch-hook.mjs'),
    join(repository, '.claude/hooks/route-guard.mjs')], {
    input: '{bad-json', env, cwd: repository, encoding: 'utf8',
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /JSON/);
});

test('native strict adapter refuses a missing target', () => {
  const env = { ...process.env, LUCA_NATIVE_HOOK_STRICT: '1', NODE_OPTIONS: '', LUCA_CHILD_SOURCE_ROOT: '' };
  const result = spawnSync(process.execPath, [join(repository, '.codex/codex-hook-adapter.mjs')], {
    env, input: '{}', encoding: 'utf8',
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /目标 hook/);
});

test('Codex adapter denies direct host-launch journal and source-grant paths', (t) => {
  const f = fixture(t);
  const paths = ['.claude/host-launch', '.claude/host-launch/launch.json',
    './.claude/host-launch/launch.source.json', join(f.gstack, '.claude/host-launch/launch.json')];
  for (const file of paths) {
    const result = f.run('Bash', { command: `node -e 'require("fs").readFileSync("${file}")'` });
    assert.equal(result.output?.hookSpecificOutput?.permissionDecision, 'deny', file);
    assert.match(result.output.hookSpecificOutput.permissionDecisionReason, /host-launch/);
  }
});

test('ordinary tools cannot remove or forge event closure evidence', (t) => {
  const f = fixture(t);
  const path = '.claude/.session-event-closed-fixture-digest';
  for (const [name, input] of [
    ['Bash', { command: `rm ${path}` }],
    ['Write', { file_path: join(f.gstack, path), content: '{}' }],
    ['apply_patch', { command: `*** Begin Patch\n*** Delete File: ${path}\n*** End Patch` }],
  ]) {
    assert.equal(f.run(name, input).output?.hookSpecificOutput?.permissionDecision, 'deny');
  }
});

test('Codex apply_patch protects host-launch targets but not source-code text', (t) => {
  const f = fixture(t);
  const denied = f.run('apply_patch', { command: '*** Begin Patch\n*** Add File: .claude/host-launch/forged.source.json\n+{}\n*** End Patch' });
  assert.equal(denied.output?.hookSpecificOutput?.permissionDecision, 'deny');
  const allowed = f.run('apply_patch', { command: '*** Begin Patch\n*** Add File: scripts/fixture.mjs\n+const text = ".claude/host-launch";\n*** End Patch' });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.output?.hookSpecificOutput?.permissionDecision, undefined);
});

test('Codex search patterns remain data while actual host-launch path operands are denied', (t) => {
  const f = fixture(t);
  const allowed = f.run('Bash', { command: 'rg -n -F ".claude/host-launch" scripts .claude/hooks/lib' });
  assert.equal(allowed.status, 0);
  assert.equal(allowed.output?.hookSpecificOutput?.permissionDecision, undefined);
  const denied = f.run('Bash', { command: 'rg -n "launchId" .claude/host-launch' });
  assert.equal(denied.output?.hookSpecificOutput?.permissionDecision, 'deny');
});
