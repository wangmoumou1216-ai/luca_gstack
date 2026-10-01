#!/usr/bin/env node
// Execute the same frozen command bytes before and after explicit reviewed installs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_SCAN, sourceDigest } from '../.codex/hook-source-integrity.mjs';
import { installTestSourceGuard } from './source-guard-test-fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, '.codex/hooks.json')));
const entries = Object.entries(config.hooks).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({ event, command: hook.command }))));
assert.equal(entries.length, 11);
const normalize = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(normalize)
  : Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(JSON.stringify(normalize(config.hooks))), '217d8a0116f375282aa67e0b59415e3ca742b42bc24685082c2b17fcb7635189');
const base = realpathSync(mkdtempSync(join(tmpdir(), 'hook-source-digests-')));
const fixture = join(base, 'repo'), home = join(base, 'home');
mkdirSync(home, { mode: 0o700 });
const guardRoot = join(home, '.codex/luca-child-project/source-guard');
mkdirSync(dirname(guardRoot), { recursive: true, mode: 0o700 });
const env = { ...process.env, HOME: home, NODE_ENV: 'test', NODE_OPTIONS: '', LUCA_SOURCE_GUARD_TEST_ROOT: guardRoot };
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  for (const folder of ['.codex', '.claude/hooks/lib', 'scripts', 'memory/scripts', '.claude/skill-os', '.claude/skills/office', '.claude/agents']) mkdirSync(join(fixture, folder), { recursive: true });
  for (const name of ['hook-source-integrity.mjs', 'codex-source-guard-bootstrap.mjs', 'codex-source-guard-loader.mjs', 'hooks.json']) cpSync(join(root, '.codex', name), join(fixture, '.codex', name));
  const launch = `import {readFileSync,writeFileSync} from 'node:fs';\nconst p=readFileSync(0,'utf8'); if(process.env.PROBE_PAYLOAD) writeFileSync(process.env.PROBE_PAYLOAD,p); if(process.env.PROBE_ADAPTER_FAIL) process.exit(7); process.stdout.write(p);\n`;
  for (const name of ['model-route-hook.mjs', 'host-launch-hook.mjs', 'codex-hook-adapter.mjs']) writeFileSync(join(fixture, '.codex', name), launch);
  writeFileSync(join(fixture, '.codex/stop-integrity-failure.mjs'), `import {readFileSync} from 'node:fs'; if(process.env.PROBE_RECOVERY_FAIL) process.exit(9); const payload=readFileSync(0,'utf8'); process.stdout.write(JSON.stringify({continue:false,payload}));\n`);
  for (const name of ['project-substrate', 'event-attestation', 'project-selection', 'project-event-closure']) writeFileSync(join(fixture, `.claude/hooks/lib/${name}.mjs`), 'export {};\n');
  writeFileSync(join(fixture, 'CLAUDE.md'), 'isolated fixture');
  for (const name of ['probe.mjs', 'probe.js', 'probe.py', 'probe.sh', 'test-probe.mjs']) writeFileSync(join(fixture, 'scripts', name), '// fixture\n');
  const approve = () => {
    const installed = installTestSourceGuard({ roots: [fixture], destination: guardRoot, directory: base, preserveOtherRoots: true });
    assert.equal(installed.status, 0, installed.stderr);
  };
  const payload = JSON.stringify({ hook_event_name: 'Stop', cwd: fixture, session_id: 'payload-replay', text: 'quoted " text\nsecond line' });
  const run = (entry, extra = {}) => spawnSync('/bin/sh', ['-c', entry.command], { cwd: fixture, encoding: 'utf8', input: payload,
    timeout: 15000, env: { ...env, ...extra } });
  const check = (rejected = false, all = false, extra = {}) => {
    for (const entry of all ? entries : [entries[1], entries.find(entry => entry.event === 'Stop')]) {
      const result = run(entry, extra);
      assert.equal(result.error, undefined, `${entry.event}: ${result.error}`);
      assert.equal(result.status, rejected && entry.event !== 'Stop' ? 2 : 0, `${entry.event}: ${result.stderr}`);
      if (rejected && entry.event === 'Stop') {
        const stopped = JSON.parse(result.stdout);
        assert.equal(stopped.continue, false);
        if (stopped.payload !== undefined) assert.equal(stopped.payload, payload, 'failed helper must not consume Stop payload');
      } else if (!rejected) assert.equal(result.stdout, payload, `${entry.event}: helper consumed stdin`);
    }
  };
  approve(); check(false, true);
  const cached = entries.map(entry => ({ command: entry.command, hash: sha(entry.command) }));
  for (const name of ['probe.mjs', 'probe.js', 'probe.py', 'probe.sh', 'test-probe.mjs']) {
    const path = join(fixture, 'scripts', name), original = readFileSync(path);
    appendFileSync(path, '\n// changed\n'); check(true); writeFileSync(path, original);
    rmSync(path); check(true); writeFileSync(path, original);
    const added = join(fixture, 'scripts', `new-${name}`); writeFileSync(added, original); check(true);
    approve(); check(); rmSync(added); check(true); approve(); check();
  }
  assert.deepEqual(entries.map(entry => ({ command: entry.command, hash: sha(entry.command) })), cached, 'reviewed update must preserve cached command/hash');
  const linked = join(fixture, 'scripts/link.mjs'); symlinkSync(join(fixture, 'scripts/probe.mjs'), linked); check(true); rmSync(linked);
  const fifo = join(fixture, 'scripts/special.mjs'); assert.equal(spawnSync('mkfifo', [fifo]).status, 0); check(true); rmSync(fifo);
  const unreadable = join(fixture, 'scripts/probe.py'); chmodSync(unreadable, 0); check(true); chmodSync(unreadable, 0o600);
  const missing = join(fixture, 'memory/scripts'); rmSync(missing, { recursive: true }); check(true); mkdirSync(missing); check();
  chmodSync(missing, 0); check(true); chmodSync(missing, 0o700);
  const faulty = join(base, 'faulty-bin'); mkdirSync(faulty); writeFileSync(join(faulty, 'sort'), '#!/bin/sh\n/usr/bin/sort "$@"\nexit 1\n', { mode: 0o700 });
  check(true, false, { PATH: `${faulty}:${process.env.PATH}` });
  // shasum escaping is part of the source algorithm, including shell substitution trimming.
  for (const name of ['with space.mjs', 'with\\backslash.mjs', 'with\nnewline.mjs']) writeFileSync(join(fixture, 'scripts', name), 'export {};\n');
  const shell = spawnSync('/bin/bash', ['-o', 'pipefail', '-c', `${SOURCE_SCAN}; printf '%s' "$h"`], { cwd: fixture, encoding: 'utf8' });
  assert.equal(sourceDigest(fixture), shell.stdout);
  for (const name of ['with space.mjs', 'with\\backslash.mjs', 'with\nnewline.mjs']) rmSync(join(fixture, 'scripts', name));
  check();
  // A failing adapter consumes stdin; protected recovery must receive its original bytes.
  const stop = entries.find(entry => entry.event === 'Stop');
  const capture = join(base, 'adapter-payload');
  const failedAdapter = run(stop, { PROBE_ADAPTER_FAIL: '1', PROBE_PAYLOAD: capture });
  assert.equal(failedAdapter.status, 0); assert.equal(readFileSync(capture, 'utf8'), payload);
  assert.equal(JSON.parse(failedAdapter.stdout).payload, payload);
  const failedRecovery = run(stop, { PROBE_ADAPTER_FAIL: '1', PROBE_RECOVERY_FAIL: '1' });
  assert.equal(failedRecovery.status, 0); assert.equal(JSON.parse(failedRecovery.stdout).continue, false);
  const failedOrdinary = run(entries[1], { PROBE_ADAPTER_FAIL: '1' }); assert.equal(failedOrdinary.status, 2);
  // Full frozen commands close the empty/nonexistent root branches before node/helper/recovery.
  const bin = join(base, 'root-probe-bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'node'), '#!/bin/sh\nprintf x >> "$ROOT_PROBE_CALLS"\nexit 0\n', { mode: 0o700 });
  for (const shellName of ['/bin/sh', '/bin/bash', '/bin/zsh']) for (const mode of ['git-error', 'git-empty', 'git-invalid']) {
    const git = mode === 'git-error' ? 'exit 1' : mode === 'git-empty' ? 'exit 0' : `printf '%s\\n' '${join(base, 'absent')}'`;
    writeFileSync(join(bin, 'git'), `#!/bin/sh\n${git}\n`, { mode: 0o700 });
    const calls = join(base, 'node-calls'); writeFileSync(calls, '');
    for (const entry of entries) {
      const result = spawnSync(shellName, ['-c', entry.command], { cwd: fixture, encoding: 'utf8', input: payload,
        env: { ...env, PATH: `${bin}:${process.env.PATH}`, ROOT_PROBE_CALLS: calls }, timeout: 5000 });
      assert.equal(result.status, entry.event === 'Stop' ? 0 : 2, `${shellName}/${mode}/${entry.event}`);
      if (entry.event === 'Stop') assert.equal(JSON.parse(result.stdout).continue, false);
    }
    assert.equal(readFileSync(calls, 'utf8'), '', `${shellName}/${mode}: node/helper/recovery executed without root`);
  }
  console.log('PASS frozen 11 commands: cached approval add/delete/change matrix, special files, upstream failure, stdin/recovery, three-shell root resolution');
} finally { rmSync(base, { recursive: true, force: true }); }
