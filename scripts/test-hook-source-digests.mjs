#!/usr/bin/env node
// Exercise the registered shell gates without loading any privileged hook.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    assert.ok(gate.startsWith('cd "$(git rev-parse --show-toplevel)" || exit 2; h=$(find '),
      `${event}: missing source integrity check`);
    return { event, gate };
  })));
assert.equal(gates.length, 11, 'all registered privileged entries must be checked');
function check(cwd, rejected = false) {
  for (const { event, gate } of gates) {
    const result = spawnSync('/bin/sh', ['-c', gate], {
      cwd, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.error, undefined, `${event}: ${result.error}`);
    assert.equal(result.status, rejected ? 2 : 0, `${event}: ${result.stderr}`);
    if (rejected) assert.match(result.stderr, /hook source integrity mismatch/);
  }
}
check(root);
const fixture = mkdtempSync(join(tmpdir(), 'hook-source-digests-'));
try {
  assert.equal(spawnSync('git', ['init', '-q', fixture]).status, 0);
  for (const folder of ['.codex', '.claude/hooks', 'scripts', 'memory/scripts']) {
    cpSync(join(root, folder), join(fixture, folder), { recursive: true });
  }
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
