#!/usr/bin/env node
// Default native-trust commands do not depend on optional source approval.
// Retain the fixed stable-v3 regression separately.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_SCAN, sourceDigest } from '../.codex/hook-source-integrity.mjs';
import { installTestSourceGuard } from './source-guard-test-fixture.mjs';


// Fixed stable-v3 fixture remains independent of the default native registration.
function stableRegistration(config) {
  const prefix = "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" || exit 2; export LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\"; export NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\"; node \"$(git rev-parse --show-toplevel)/.codex/hook-source-integrity.mjs\" --verify || { echo \"[luca_gstack] hook source integrity mismatch\" >&2; exit 2; }; ";
  const stop = "luca_stop_payload=$(cat); luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" || { printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0; }; export LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\"; export NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\"; node \"$(git rev-parse --show-toplevel)/.codex/hook-source-integrity.mjs\" --verify || { echo \"[luca_gstack] hook source integrity mismatch\" >&2; printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\" NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\" node --input-type=module -e 'await import(process.env.LUCA_PROTECTED_CODE_ROOT + \"/.codex/stop-integrity-failure.mjs\")' || printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0; }; printf '%s' \"$luca_stop_payload\" | MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$(git rev-parse --show-toplevel)/.codex/codex-hook-adapter.mjs\" \"$(git rev-parse --show-toplevel)/.claude/hooks/session-sync.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0; printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\" NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\" node --input-type=module -e 'await import(process.env.LUCA_PROTECTED_CODE_ROOT + \"/.codex/stop-integrity-failure.mjs\")' || printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0";
  for (const [event, groups] of Object.entries(config.hooks)) for (const group of groups) for (const hook of group.hooks) {
    if (event === 'Stop') hook.command = stop;
    else {
      const marker = 'export LUCA_NATIVE_HOOK_STRICT=1; ';
      const suffix = hook.command.slice(hook.command.indexOf(marker) + marker.length)
        .replaceAll('$luca_hook_root', '$(git rev-parse --show-toplevel)');
      hook.command = prefix + suffix;
      if (hook.command.includes('/.codex/host-launch-hook.mjs')) {
        hook.command = hook.command.replace('; c=$?;', ' 2>> /tmp/luca-gstack-hooks.log; c=$?;');
      }
    }
  }
  return config;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nativeConfig = JSON.parse(readFileSync(join(root, '.codex/hooks.json')));
const nativeEntries = Object.entries(nativeConfig.hooks).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({ event, command: hook.command }))));
const config = stableRegistration(structuredClone(nativeConfig));
const entries = Object.entries(config.hooks).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({ event, command: hook.command }))));
assert.equal(entries.length, 11);
const normalize = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(normalize)
  : Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(JSON.stringify(normalize(nativeConfig.hooks))), '071dcae5ae935ce15318dea12d1deaee3cddec60c74bda6d82ec1c422eb885e4');
assert.equal(sha(JSON.stringify(normalize(config.hooks))), '217d8a0116f375282aa67e0b59415e3ca742b42bc24685082c2b17fcb7635189');
const base = realpathSync(mkdtempSync(join(tmpdir(), 'hook-source-digests-')));
const fixture = join(base, "repo with space's quote"), home = join(base, 'home');
mkdirSync(home, { mode: 0o700 });
const guardRoot = join(home, '.codex/luca-child-project/source-guard');
mkdirSync(dirname(guardRoot), { recursive: true, mode: 0o700 });
const env = { ...process.env, HOME: home, NODE_ENV: 'test', NODE_OPTIONS: '', LUCA_SOURCE_GUARD_TEST_ROOT: guardRoot };
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  for (const folder of ['.codex', '.claude/hooks/lib', 'scripts', 'memory/scripts', '.claude/skill-os', '.claude/skills/office', '.claude/agents']) mkdirSync(join(fixture, folder), { recursive: true });
  for (const name of ['hook-source-integrity.mjs', 'codex-source-guard-bootstrap.mjs', 'codex-source-guard-loader.mjs', 'hooks.json']) cpSync(join(root, '.codex', name), join(fixture, '.codex', name));
  const launch = `import {readFileSync,writeFileSync} from 'node:fs';\nconst p=readFileSync(0,'utf8'); if(process.env.NATIVE_PROBE && (process.env.NODE_OPTIONS || process.env.LUCA_CHILD_SOURCE_ROOT || process.env.LUCA_PROTECTED_CODE_ROOT || process.env.LUCA_NATIVE_HOOK_STRICT!=='1' || process.env.MUSE_HOST_LAUNCH_ID!=='synthetic-host' || process.env.MEMORY_ROOT!=='/Users/luca/Desktop/luca_gstack')) process.exit(8); if(process.env.PROBE_PAYLOAD) writeFileSync(process.env.PROBE_PAYLOAD,p); if(process.env.PROBE_ADAPTER_FAIL) { if(process.env.PROBE_PARTIAL_OUTPUT) process.stdout.write('partial invalid output'); process.exit(7); } process.stdout.write(p);\n`;
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
  // An uninstalled new worktree runs all default commands, even after code edits.
  const nativeLog = join(base, 'native-hook.log');
  const nativeRun = (entry, extra = {}) => spawnSync('/bin/sh', ['-c', entry.command.replaceAll('/tmp/luca-gstack-hooks.log', nativeLog)], {
    cwd: fixture, encoding: 'utf8', input: payload, timeout: 15000,
    env: { ...env, NODE_OPTIONS: '--import=/absent-inherited-bootstrap.mjs',
      LUCA_CHILD_SOURCE_ROOT: '/unapproved-worktree', LUCA_PROTECTED_CODE_ROOT: '/unapproved-snapshot',
      MUSE_HOST_LAUNCH_ID: 'synthetic-host', MEMORY_ROOT: '/Users/luca/Desktop/luca_gstack', NATIVE_PROBE: '1', ...extra },
  });
  const nativeCheck = () => { for (const entry of nativeEntries) {
    const result = nativeRun(entry);
    assert.equal(result.error, undefined, entry.event);
    assert.equal(result.status, 0, entry.event + ': ' + result.stderr + (existsSync(nativeLog) ? readFileSync(nativeLog, 'utf8') : ''));
    assert.equal(result.stdout, payload, entry.event + ': native wrapper changed stdin');
  } };
  assert.equal(nativeEntries.length, 11);
  for (const entry of nativeEntries) {
    assert.ok(!/hook-source-integrity|source-guard|SOURCE_SCAN|shasum/.test(entry.command));
    assert.ok(entry.command.includes('export LUCA_NATIVE_HOOK_STRICT=1; '));
  }
  assert.equal(spawnSync('test', ['-e', join(guardRoot, 'manifest.json')]).status, 1);
  nativeCheck();
  appendFileSync(join(fixture, '.codex/model-route-hook.mjs'), '\n// code edited without source approval\n');
  appendFileSync(join(fixture, 'scripts/probe.mjs'), '\n// code edited without source approval\n');
  nativeCheck();
  const nativeStop = nativeEntries.find(entry => entry.event === 'Stop');
  const nativeCapture = join(base, 'native-adapter-payload');
  const nativeFailure = nativeRun(nativeStop, { PROBE_ADAPTER_FAIL: '1', PROBE_PARTIAL_OUTPUT: '1', PROBE_PAYLOAD: nativeCapture });
  assert.equal(nativeFailure.status, 0);
  assert.equal(readFileSync(nativeCapture, 'utf8'), payload);
  assert.equal(JSON.parse(nativeFailure.stdout).payload, payload);
  const nativeRecoveryFailure = nativeRun(nativeStop, { PROBE_ADAPTER_FAIL: '1', PROBE_RECOVERY_FAIL: '1' });
  assert.equal(nativeRecoveryFailure.status, 0);
  assert.equal(JSON.parse(nativeRecoveryFailure.stdout).continue, false);
  assert.equal(nativeRun(nativeEntries[1], { PROBE_ADAPTER_FAIL: '1' }).status, 2);
  console.log('PASS native-trust-v1: exact11 uninstalled worktree, source edits, inherited guard env isolation, strict/Host/MEMORY env, raw Stop replay and fallback');
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
    for (const entry of [...entries, ...nativeEntries]) {
      const result = spawnSync(shellName, ['-c', entry.command], { cwd: fixture, encoding: 'utf8', input: payload,
        env: { ...env, PATH: `${bin}:${process.env.PATH}`, ROOT_PROBE_CALLS: calls }, timeout: 5000 });
      assert.equal(result.status, entry.event === 'Stop' ? 0 : 2, `${shellName}/${mode}/${entry.event}`);
      if (entry.event === 'Stop') assert.equal(JSON.parse(result.stdout).continue, false);
    }
    assert.equal(readFileSync(calls, 'utf8'), '', `${shellName}/${mode}: node/helper/recovery executed without root`);
  }
  console.log('PASS frozen 11 commands: cached approval add/delete/change matrix, special files, upstream failure, stdin/recovery, three-shell root resolution');
} finally { rmSync(base, { recursive: true, force: true }); }
