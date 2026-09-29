#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, mkdirSync, realpathSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'));
const commands = Object.values(config.hooks).flatMap(groups => groups.flatMap(group => group.hooks || []))
  .map(hook => hook.command);
const modelCommands = commands.filter(command => command.includes('model-route-hook.mjs'));
assert.equal(modelCommands.length, 5, 'all native model-route hook entries must be present');
assert.equal(new Set(modelCommands).size, 1, 'all native model-route entries must share one integrity gate');
assert.ok(commands.every(command => command.startsWith('cd "$(git rev-parse --show-toplevel)" || exit 2; links=$(find ')),
  'every privileged native hook entry must verify source integrity before executing workspace code');
const command = modelCommands[0];
// Test the actual guarded command against an isolated approved installation.
// A development worktree must not require changing the user's live approvals.
const testHome = realpathSync(mkdtempSync(join(tmpdir(), 'codex-child-hook-home-')));
const guardRoot = join(testHome, '.codex', 'luca-child-project', 'source-guard');
mkdirSync(dirname(guardRoot), { recursive: true, mode: 0o700 });
const testEnv = { ...process.env, HOME: testHome, NODE_ENV: 'test', NODE_OPTIONS: '',
  LUCA_SOURCE_GUARD_TEST_ROOT: guardRoot };
const installed = spawnSync(process.execPath, [join(root, 'scripts/install-codex-source-guard.mjs'),
  '--root', root, '--test-dest', guardRoot], { env: testEnv, encoding: 'utf8' });
assert.equal(installed.status, 0, installed.stderr);
try {
const run = cwd => spawnSync('/bin/sh', ['-c', command], {
  cwd, encoding: 'utf8', input: '{}', timeout: 5000, env: testEnv,
});
const valid = run(root);
assert.equal(valid.status, 0, valid.stderr);
assert.equal(valid.stdout.trim(), '{}');
console.log('PASS approved native hook source executes');

const missingBootstrapHome = mkdtempSync(join(tmpdir(), 'codex-child-missing-bootstrap-'));
try {
  const visibleStderrCommand = command.replace('2>> /tmp/luca-gstack-hooks.log', '2>&2');
  assert.notEqual(visibleStderrCommand, command);
  const missingBootstrap = spawnSync('/bin/sh', ['-c', visibleStderrCommand], {
    cwd: root, encoding: 'utf8', input: '{}', timeout: 5000,
    env: {...testEnv, HOME: missingBootstrapHome},
  });
  assert.equal(missingBootstrap.status, 2,
    `missing protected bootstrap must block: ${missingBootstrap.stderr}`);
  assert.match(missingBootstrap.stderr, /ERR_MODULE_NOT_FOUND/);
  console.log('PASS missing protected bootstrap blocks the native hook');
} finally {
  rmSync(missingBootstrapHome, {recursive: true, force: true});
}

const fixture = mkdtempSync(join(tmpdir(), 'codex-child-hook-integrity-'));
try {
  const init = spawnSync('git', ['init', '-q', fixture], { encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr);
  for (const folder of ['.codex', '.claude/hooks', 'scripts', 'memory/scripts']) {
    cpSync(join(root, folder), join(fixture, folder), { recursive: true });
  }
  const gateOnly = command.slice(0, command.indexOf('node "$(git rev-parse --show-toplevel)/.codex/model-route-hook.mjs"')) + 'true';
  const baseline = spawnSync('/bin/sh', ['-c', gateOnly], { cwd: fixture, encoding: 'utf8' });
  assert.equal(baseline.status, 0, baseline.stderr);
  for (const target of ['.claude/hooks/lib/codex-child-project.mjs', '.codex/codex-hook-adapter.mjs']) {
    appendFileSync(join(fixture, target), '\n// unapproved mutation\n');
    const tampered = run(fixture);
    assert.equal(tampered.status, 2, `tampered hook source must block: ${tampered.stderr}`);
    assert.match(tampered.stderr, /source integrity mismatch/);
  }
  console.log('PASS modified receipt writer and adapter fail before native hook import');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

} finally { rmSync(testHome, { recursive: true, force: true }); }
