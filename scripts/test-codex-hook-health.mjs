import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync,
  readdirSync, realpathSync, chmodSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import nodeModule from 'node:module';
import { inspectHookHealth, sourceDigest } from './codex-hook-health.mjs';
const recoveryFiles = ['.codex/stop-integrity-failure.mjs', '.claude/hooks/lib/project-substrate.mjs',
  '.claude/hooks/lib/event-attestation.mjs', '.claude/hooks/lib/project-selection.mjs',
  '.claude/hooks/lib/project-event-closure.mjs'];

function fixture(t, seed = () => {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'hook-health-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'repo'), guardRoot = join(base, 'private', 'guard');
  mkdirSync(join(base, 'private'), { mode: 0o700 });
  for (const dir of ['scripts', '.codex', 'memory/scripts', '.claude/hooks',
    '.claude/skill-os', '.claude/skills/office', '.claude/agents']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'CLAUDE.md'), 'fixture');
  writeFileSync(join(root, 'scripts/probe.mjs'), 'export const value = 1;\n');
  for (const name of ['bootstrap', 'loader']) cpSync(new URL(`../.codex/codex-source-guard-${name}.mjs`, import.meta.url),
    join(root, '.codex', `codex-source-guard-${name}.mjs`));
  cpSync(new URL('../.codex/hooks.json', import.meta.url), join(root, '.codex/hooks.json'));
  mkdirSync(join(root, '.claude/hooks/lib'), { recursive: true });
  for (const name of recoveryFiles) cpSync(new URL(`../${name}`, import.meta.url), join(root, name));
  const hooksPath = join(root, '.codex/hooks.json');
  const refresh = () => {
    const config = JSON.parse(readFileSync(hooksPath)), digest = sourceDigest(root);
    for (const groups of Object.values(config.hooks)) for (const group of groups) for (const hook of group.hooks) {
      hook.command = hook.command.replace(/case "\$h" in [a-f0-9]{64}/, `case "$h" in ${digest}`);
    }
    writeFileSync(hooksPath, JSON.stringify(config));
  };
  seed(root);
  refresh();
  const install = spawnSync(process.execPath, [new URL('./install-codex-source-guard.mjs', import.meta.url).pathname,
    '--root', root, '--test-dest', guardRoot], { env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  return { base, root, guardRoot, hooksPath, refresh, inspect: () => inspectHookHealth(root, { guardRoot }) };
}
function tree(path) {
  return Object.fromEntries(readdirSync(path, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).map(entry =>
    [entry.name, entry.isDirectory() ? tree(join(path, entry.name)) : readFileSync(join(path, entry.name)).toString('base64')]));
}

test('healthy sources and protected installation pass without writing or claiming live-session verification', t => {
  const f = fixture(t), before = tree(f.base), report = f.inspect();
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.registration.hook_count, 11);
  assert.equal(report.installation.status, 'PASS');
  assert.match(report.live_session, /^UNVERIFIED/);
  assert.deepEqual(tree(f.base), before);
});
test('source-only inspection does not require or initialize a protected installation', t => {
  const f = fixture(t);
  rmSync(f.guardRoot, { recursive: true });
  const before = tree(f.base), report = inspectHookHealth(f.root, { sourceOnly: true });
  assert.equal(report.ok, true);
  assert.equal(report.scope, 'registration-source');
  assert.equal(report.installation.status, 'NOT_CHECKED');
  assert.deepEqual(tree(f.base), before);
  assert.equal(f.inspect().ok, false);
});
test('source drift and stale installed bytes are reported as separate failures', t => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'scripts/probe.mjs'), 'export const value = 2;\n');
  const drift = f.inspect();
  assert.match(drift.registration.problems.join(), /SOURCE_DIGEST_MISMATCH/);
  assert.deepEqual(drift.installation.changed_files, ['scripts/probe.mjs']);
  f.refresh();
  const refreshed = f.inspect();
  assert.equal(refreshed.registration.status, 'PASS');
  assert.equal(refreshed.ok, false);
  assert.match(refreshed.installation.problems.join(), /INSTALLED_SOURCE_MISMATCH/);
});
test('refreshing registration does not approve new JavaScript in the installed manifest', t => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'scripts/new.mjs'), 'export {};\n'); f.refresh();
  const report = f.inspect();
  assert.equal(report.registration.status, 'PASS');
  assert.equal(report.ok, false);
  assert.deepEqual(report.installation.unapproved_files, ['scripts/new.mjs']);
});
test('new JavaScript outside digest folders is rejected consistently with the real loader', t => {
  const f = fixture(t);
  mkdirSync(join(f.root, '.claude/workflows'));
  const path = join(f.root, '.claude/workflows/new.mjs');
  writeFileSync(path, 'throw new Error("must not execute");\n');
  const loaded = spawnSync(process.execPath, ['--import', join(f.guardRoot, 'bootstrap.mjs'), path],
    { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: '',
      LUCA_SOURCE_GUARD_TEST_ROOT: f.guardRoot, LUCA_CHILD_SOURCE_ROOT: f.root } });
  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /JavaScript is not listed/);
  const report = f.inspect();
  assert.equal(report.registration.status, 'PASS');
  assert.equal(report.ok, false, 'must detect the same unapproved source as the runtime');
  assert.deepEqual(report.installation.unapproved_files, ['.claude/workflows/new.mjs']);
});
test('all protected Stop recovery files must exist and match their approved source bytes', t => {
  for (const name of recoveryFiles) for (const mutation of ['missing', 'changed']) {
    const f = fixture(t), manifest = JSON.parse(readFileSync(join(f.guardRoot, 'manifest.json')));
    const path = join(f.guardRoot, 'roots', manifest.roots[0].snapshot, name);
    if (mutation === 'missing') rmSync(path); else writeFileSync(path, '// changed snapshot\n');
    const report = f.inspect();
    assert.equal(report.ok, false, `${name}: ${mutation} recovery passed health`);
    assert.equal(report.installation.status, 'FAIL');
  }
});
test('Python and policy snapshot drift cannot masquerade as healthy JavaScript approval', t => {
  for (const name of ['memory/scripts/new.py', '.claude/skill-os/policy.yaml']) {
    const f = fixture(t);
    writeFileSync(join(f.root, name), '# reviewed source changed\n'); f.refresh();
    const report = f.inspect();
    assert.equal(report.registration.status, 'PASS');
    assert.equal(report.ok, false);
    assert.match(report.installation.problems.join(), /INSTALLED_SNAPSHOT_MISMATCH/);
    assert.deepEqual(report.installation.snapshot_changed_files, [name]);
  }
});
test('symlinks and failed source scanners fail closed', t => {
  const f = fixture(t);
  symlinkSync(join(f.root, 'scripts/probe.mjs'), join(f.root, 'scripts/link.mjs'));
  assert.match(f.inspect().registration.problems.join(), /source scan failed/);
  rmSync(join(f.root, 'scripts/link.mjs'));
  rmSync(join(f.root, 'memory/scripts'), { recursive: true });
  assert.match(f.inspect().registration.problems.join(), /source scan failed/);
});
test('unrecognized registration text is data and cannot execute commands', t => {
  const f = fixture(t), config = JSON.parse(readFileSync(f.hooksPath));
  config.hooks.PreToolUse[0].hooks[0].command = `touch ${join(f.base, 'must-not-exist')}`;
  writeFileSync(f.hooksPath, JSON.stringify(config));
  assert.match(f.inspect().registration.problems.join(), /unrecognized source gate/);
  assert.ok(!readdirSync(f.base).includes('must-not-exist'));
});
test('complete registration contract rejects broken, disabled or misplaced hooks', t => {
  const mutations = {
    'shell syntax': config => { config.hooks.PreToolUse[0].hooks[0].command += '; ('; },
    'missing bootstrap': config => { config.hooks.PreToolUse[0].hooks[0].command =
      config.hooks.PreToolUse[0].hooks[0].command.replace(/export NODE_OPTIONS="[^"]*"; /, ''); },
    'no-op launch': config => { config.hooks.PreToolUse[0].hooks[0].command =
      config.hooks.PreToolUse[0].hooks[0].command.split('; export LUCA_CHILD_SOURCE_ROOT=')[0]
      + '; export LUCA_CHILD_SOURCE_ROOT="$(pwd -P)"; true'; },
    'fail-open digest': config => { config.hooks.PreToolUse[0].hooks[0].command =
      config.hooks.PreToolUse[0].hooks[0].command.replace('exit 2;; esac', 'exit 0;; esac'); },
    'missing event': config => { config.hooks = { SessionStart: Object.values(config.hooks).flat() }; },
    'inactive matcher': config => { config.hooks.PreToolUse[0].matcher = '^NEVER$'; },
    'short end timeout': config => { config.hooks.SessionEnd[0].hooks[0].timeoutSec = 1; },
    'unknown config key': config => { config._comment = 'Codex rejects unknown fields'; },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const f = fixture(t), config = JSON.parse(readFileSync(f.hooksPath));
    mutate(config); writeFileSync(f.hooksPath, JSON.stringify(config));
    const report = f.inspect();
    assert.equal(report.ok, false, `${name}: invalid registration passed health`);
    assert.equal(report.registration.status, 'FAIL', name);
  }
});
test('approved module formats must match the source extension and nearest package rules', t => {
  const f = fixture(t, root => {
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(join(root, 'scripts/esm.js'), 'export {};\n');
    mkdirSync(join(root, 'scripts/cjs'));
    writeFileSync(join(root, 'scripts/cjs/package.json'), '{}');
    writeFileSync(join(root, 'scripts/cjs/probe.js'), 'module.exports = 1;\n');
  });
  assert.equal(f.inspect().ok, true);
  const path = join(f.guardRoot, 'manifest.json'), original = JSON.parse(readFileSync(path));
  for (const name of ['scripts/probe.mjs', 'scripts/esm.js', 'scripts/cjs/probe.js']) {
    const manifest = structuredClone(original), row = manifest.roots[0].files[name];
    row.format = row.format === 'module' ? 'commonjs' : 'module';
    writeFileSync(path, JSON.stringify(manifest));
    const report = f.inspect();
    assert.equal(report.ok, false, `${name}: wrong format passed health`);
    assert.deepEqual(report.installation.format_changed_files, [name]);
  }
});
test('private runtime drift and invalid manifest metadata are rejected', t => {
  for (const kind of ['loader', 'bootstrap', 'manifest-mode', 'duplicate-root', 'file-traversal', 'missing-root']) {
    const f = fixture(t), manifestPath = join(f.guardRoot, 'manifest.json');
    if (['loader', 'bootstrap'].includes(kind)) writeFileSync(join(f.guardRoot, `${kind}.mjs`), '// changed');
    else if (kind === 'manifest-mode') chmodSync(manifestPath, 0o666);
    else {
      const manifest = JSON.parse(readFileSync(manifestPath));
      if (kind === 'duplicate-root') manifest.roots.push(manifest.roots[0]);
      if (kind === 'file-traversal') manifest.roots[0].files['../outside.mjs'] = { sha256: 'a'.repeat(64), format: 'module' };
      if (kind === 'missing-root') manifest.roots = [];
      writeFileSync(manifestPath, JSON.stringify(manifest));
    }
    assert.equal(f.inspect().ok, false, kind);
    assert.equal(f.inspect().installation.status, 'FAIL', kind);
  }
});
test('a Node runtime without the protected loader capability cannot pass installation health', t => {
  const f = fixture(t), original = nodeModule.registerHooks;
  try {
    nodeModule.registerHooks = undefined;
    const report = f.inspect();
    assert.equal(report.ok, false);
    assert.match(report.installation.problems.join(), /RUNTIME_CAPABILITY_MISSING/);
  } finally { nodeModule.registerHooks = original; }
});
test('digest matches the real shell gate for spaces, backslashes and newlines in source filenames', t => {
  const f = fixture(t);
  for (const name of ['with space.mjs', 'with\\backslash.mjs', 'with\nnewline.mjs']) writeFileSync(join(f.root, 'scripts', name), 'export {};\n');
  f.refresh();
  assert.equal(inspectHookHealth(f.root, { sourceOnly: true }).ok, true);
  assert.equal(spawnSync('git', ['init', '-q', f.root]).status, 0);
  const command = JSON.parse(readFileSync(f.hooksPath)).hooks.PreToolUse[0].hooks[0].command;
  const gate = command.split('; export LUCA_CHILD_SOURCE_ROOT=')[0];
  const result = spawnSync('/bin/sh', ['-c', gate], { cwd: f.root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
