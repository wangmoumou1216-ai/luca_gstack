#!/usr/bin/env node
// Exercise the registered shell gates without loading any privileged hook.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
  symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'));
const gates = Object.entries(config.hooks).flatMap(([event, groups]) =>
  groups.flatMap(group => (group.hooks || []).map(hook => {
    const marker = '; export LUCA_CHILD_SOURCE_ROOT=';
    const index = hook.command.indexOf(marker);
    assert.ok(index > 0, `${event}: missing source gate boundary`);
    const gate = hook.command.slice(0, index);
    assert.ok(gate.startsWith('cd "$(git rev-parse --show-toplevel)" || exit 2; links=$(find '),
      `${event}: missing source integrity check`);
    return { event, gate };
  })));
assert.equal(gates.length, 11, 'all registered privileged entries must be checked');
function check(cwd, rejected = false, env = process.env) {
  for (const { event, gate } of gates) {
    const result = spawnSync('/bin/sh', ['-c', gate], {
      cwd, encoding: 'utf8', timeout: 15000, env,
    });
    assert.equal(result.error, undefined, `${event}: ${result.error}`);
    assert.equal(result.status, rejected && event !== 'Stop' ? 2 : 0, `${event}: ${result.stderr}`);
    if (rejected) assert.match(result.stderr, /hook source integrity mismatch/);
    if (rejected && event === 'Stop') {
      assert.equal(JSON.parse(result.stdout).continue, false, 'Stop integrity failure must terminate, not request continuation');
    }
  }
}
check(root);
const fixture = mkdtempSync(join(tmpdir(), 'hook-source-digests-'));
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  for (const folder of ['.codex', '.claude/hooks', 'scripts', 'memory/scripts']) {
    cpSync(join(root, folder), join(fixture, folder), { recursive: true });
  }
  // A failed adapter consumes stdin. Recovery must receive the same payload again.
  const bin = join(fixture, 'probe-bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'node'), '#!/bin/sh\ncase "$1" in --input-type=module) cat ;; *) cat > /dev/null; exit 2 ;; esac\n', { mode: 0o700 });
  const stopCommand = config.hooks.Stop[0].hooks[0].command;
  const tail = stopCommand.slice(stopCommand.indexOf('; export LUCA_CHILD_SOURCE_ROOT=') + 2);
  const payload = JSON.stringify({ hook_event_name: 'Stop', session_id: 'payload-replay', last_assistant_message: 'quoted " text\nsecond line' });
  const recovery = spawnSync('/bin/sh', ['-c', tail], { cwd: fixture, encoding: 'utf8', input: payload,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.equal(recovery.stdout, payload, 'recovery must retain stdin after adapter failure');
  check(fixture);
  // A shell word-splitting digest silently omitted filenames containing spaces.
  const spacedSource = join(fixture, 'scripts', 'hook source fixture.mjs');
  writeFileSync(spacedSource, 'export {};\n');
  check(fixture, true);
  rmSync(spacedSource);
  check(fixture);
  const linkedSource = join(fixture, 'scripts', 'linked source.mjs');
  symlinkSync(join(fixture, 'scripts', 'test-host-launch.mjs'), linkedSource);
  check(fixture, true);
  rmSync(linkedSource);
  check(fixture);
  const unreadableSource = join(fixture, 'scripts', 'unreadable-source.mjs');
  writeFileSync(unreadableSource, 'export {};\n');
  chmodSync(unreadableSource, 0o000);
  // A privileged test runner may still read mode-000 files; only assert the
  // command-failure path when shasum itself confirms it cannot read this file.
  const unreadableProbe = spawnSync('/usr/bin/shasum', ['-a', '256', unreadableSource]);
  if (unreadableProbe.status !== 0) check(fixture, true);
  chmodSync(unreadableSource, 0o600);
  rmSync(unreadableSource);
  check(fixture);
  const faultySortDir = join(fixture, 'faulty-sort-bin');
  mkdirSync(faultySortDir);
  writeFileSync(join(faultySortDir, 'sort'),
    '#!/bin/sh\n/usr/bin/sort "$@"\nexit 1\n', { mode: 0o700 });
  // Even if an upstream stage emits the approved bytes, its failure must fail closed.
  check(fixture, true, { ...process.env, PATH: `${faultySortDir}:${process.env.PATH}` });
  rmSync(faultySortDir, { recursive: true });
  check(fixture);
  // Include a test file: changing it without updating the digest caused the release regression.
  for (const name of ['.claude/hooks/lib/codex-child-project.mjs', 'scripts/test-host-launch.mjs']) {
    const path = join(fixture, name), original = readFileSync(path);
    appendFileSync(path, '\n// source integrity regression fixture\n');
    check(fixture, true);
    writeFileSync(path, original);
    check(fixture);
  }
  console.log(`PASS ${gates.length} hook gates: clean, changed security/test source rejected, restored`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
