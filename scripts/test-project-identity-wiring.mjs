#!/usr/bin/env node
// Identity wiring integration: display symlinks and session identity are
// deliberately different projects. Every project-aware hook must follow the
// schema-v2 binding (or fail closed), never infer identity from display state.
import assert from 'assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const HOOKS = join(REPO, '.claude', 'hooks');
const root = mkdtempSync(join(tmpdir(), 'luca-identity-wiring-'));
const projectsRoot = join(root, 'roots');
mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });

function makeProject(name, node) {
  const project = join(projectsRoot, name);
  mkdirSync(join(project, 'docs'), { recursive: true });
  mkdirSync(join(project, '.luca'), { recursive: true });
  writeFileSync(join(project, '.luca', 'workflow-state.yaml'),
    `topic: "${name}"\nmode: "standalone"\nnodes:\n  ${node}:\n    status: IN_PROGRESS\niteration: 1\n`);
  writeFileSync(join(project, '.luca', 'current-topic.txt'), `${name}\n`);
  writeFileSync(join(project, 'docs', 'PROGRESS.md'), `# ${name} progress\n`);
  return project;
}

const boundProject = makeProject('bound-alpha', 'alpha-node');
const displayProject = makeProject('display-beta', 'beta-node');
symlinkSync(join(displayProject, 'docs'), join(root, 'docs'));
symlinkSync(join(displayProject, '.luca', 'workflow-state.yaml'), join(root, '.claude', 'workflow-state.yaml'));
symlinkSync(join(displayProject, '.luca', 'current-topic.txt'), join(root, '.claude', 'current-topic.txt'));

const SID = 'identity-wiring';
const st = statSync(boundProject);
const binding = {
  project: 'bound-alpha',
  epoch: 7,
  realpath: realpathSync(boundProject),
  dev: Number(st.dev),
  ino: Number(st.ino),
};
const statePath = join(root, '.claude', `.session-project-${SID}`);
function writeActive(epoch = binding.epoch) {
  writeFileSync(statePath, `${JSON.stringify({
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: SID,
    binding,
    turn: { turn_id: 'turn-identity', epoch },
  })}\n`);
}
writeActive();

const env = {
  ...process.env,
  CLAUDE_PROJECT_DIR: root,
  LUCA_GSTACK_ROOT: root,
  LUCA_PROJECTS_ROOT: projectsRoot,
  MEMORY_ROOT: root,
  ROUTE_GUARD_PROJECTS: 'bound-alpha,display-beta',
};
for (const key of ['LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CODEX_HOME', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']) delete env[key];

function run(hook, payload, timeout = 4000, extraEnv = {}) {
  const r = spawnSync('node', [join(HOOKS, hook)], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    env: { ...env, ...extraEnv },
    input: JSON.stringify(payload),
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', `${hook} timed out`);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r;
}
const json = value => JSON.parse(String(value).trim());

// Ambient test overrides are allowed only in explicit dry-run mode. In a
// production hook event they must not replace the validated schema-v2 binding.
{
  const envSid = 'identity-env-override';
  writeFileSync(join(root, '.claude', `.session-project-${envSid}`), `${JSON.stringify({
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: envSid,
    binding,
    turn: { turn_id: 'turn-env-before', epoch: binding.epoch },
  })}\n`);
  run('route-guard.mjs', {
    session_id: envSid,
    turn_id: 'turn-env-switch',
    prompt: '继续 display-beta 的任务',
  }, 4000, { ROUTE_GUARD_CURRENT_PROJECT: 'display-beta' });
  const switched = JSON.parse(readFileSync(join(root, '.claude', `.session-project-${envSid}`), 'utf8'));
  assert.equal(switched.state, 'SWITCH_ONLY');
  assert.equal(switched.switch.target, 'display-beta');
  console.log('PASS production route identity ignores ambient env and follows schema-v2 binding');
}

// PreToolUse follows the exact active binding, not display-beta.
{
  const r = run('project-scope-guard.mjs', { session_id: SID, tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  const redirected = json(r.stdout).hookSpecificOutput.updatedInput.file_path;
  assert.equal(redirected, join(realpathSync(boundProject), 'docs', 'x.md'));
  assert.doesNotMatch(redirected, /display-beta/);
  console.log('PASS scope guard resolves schema-v2 identity, not display symlink');
}

// UserPromptSubmit closes the prior snapshot and opens a new exact TURN_ACTIVE.
{
  run('route-guard.mjs', {
    session_id: SID,
    turn_id: 'turn-next',
    prompt: '审查 luca_gstack route guard',
  });
  const next = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(next.state, 'TURN_ACTIVE');
  assert.equal(next.binding.project, 'bound-alpha');
  assert.equal(next.turn.turn_id, 'turn-next');
  assert.equal(next.turn.epoch, next.binding.epoch);
  console.log('PASS route guard preserves binding and rotates exact turn snapshot');
}

// Stop attribution/checkpoint also follows bound-alpha and never display-beta.
{
  writeFileSync(join(root, '.claude', `.session-edit-count-${SID}`), '1');
  const r = run('session-sync.mjs', { session_id: SID });
  const reason = json(r.stdout).reason;
  assert.match(reason, /当前激活项目「bound-alpha」/);
  assert.doesNotMatch(reason, /display-beta/);
  assert.ok(existsSync(join(boundProject, 'docs', 'handoff')));
  assert.ok(!existsSync(join(displayProject, 'docs', 'handoff')));
  console.log('PASS Stop hook attribution/checkpoint follows exact turn identity');
}

// SessionStart reads bound context only when the epoch snapshot is valid.
{
  const r = run('session-restore.mjs', { session_id: SID, source: 'resume' });
  assert.match(r.stdout, /alpha-node/);
  assert.doesNotMatch(r.stdout, /beta-node|display-beta progress/);
  console.log('PASS SessionStart loads only validated bound project context');
}

// Corrupt the turn epoch: every project consumer must fail closed.
{
  writeActive(binding.epoch - 1);
  const guard = run('project-scope-guard.mjs', { session_id: SID, tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(json(guard.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const restore = run('session-restore.mjs', { session_id: SID, source: 'resume' });
  assert.doesNotMatch(restore.stdout, /alpha-node|beta-node/);
  assert.match(restore.stderr, /identity 无效|epoch snapshot/);
  console.log('PASS corrupt turn epoch is rejected across guard and startup');
}

// A different no-pin sid cannot inherit display-beta identity.
{
  const noPin = 'identity-no-pin';
  const guard = run('project-scope-guard.mjs', { session_id: noPin, tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(json(guard.stdout).hookSpecificOutput.permissionDecision, 'deny');
  run('route-guard.mjs', { session_id: noPin, turn_id: 'turn-no-pin', prompt: '审查 luca_gstack route guard' });
  assert.ok(!existsSync(join(root, '.claude', `.session-project-${noPin}`)));
  console.log('PASS NO_PIN never adopts display project identity');
}

// Static wiring guard: all four project-aware hooks use the centralized shape validator.
for (const hook of ['project-scope-guard.mjs', 'route-guard.mjs', 'session-restore.mjs', 'session-sync.mjs']) {
  assert.match(readFileSync(join(HOOKS, hook), 'utf8'), /validatedBindingForState/,
    `${hook} must consume centralized identity+epoch validation`);
}
console.log('PASS project-aware hook wiring shares one identity/epoch validator');

// Preserve the Python resolver probe that originally caught nested checkout
// drift. append_episode is a legacy convenience resolver (explicit --project
// or --meta remains authoritative); it is not a production hook identity.
{
  const resolverProject = 'resolver-probe';
  const resolverRoot = join(root, 'resolver-memory');
  const nestedDocs = join(projectsRoot, resolverProject, 'inner-checkout', 'docs');
  mkdirSync(nestedDocs, { recursive: true });
  mkdirSync(resolverRoot, { recursive: true });
  symlinkSync(nestedDocs, join(resolverRoot, 'docs'));
  const code = [
    'import importlib.util as ilu',
    `s = ilu.spec_from_file_location('ae', ${JSON.stringify(join(REPO, 'memory/scripts/append_episode.py'))})`,
    'm = ilu.module_from_spec(s)',
    'try:\n    s.loader.exec_module(m)\nexcept SystemExit:\n    pass',
    'print(m.active_project())',
  ].join('\n');
  const output = execFileSync('python3', ['-c', code], {
    cwd: resolverRoot,
    encoding: 'utf8',
    env: { ...env, MEMORY_ROOT: resolverRoot },
  }).trim().split('\n').pop();
  assert.equal(output, resolverProject);
  console.log('PASS append_episode nested-checkout resolver probe remains discriminating');
}

console.log('\n=== test-project-identity-wiring summary: ALL PASS ===');
