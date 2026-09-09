#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = fileURLToPath(new URL('..', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'event-attestation-mutation-'));
const modulePath = join(root, '.claude/hooks/lib/event-attestation.mjs');
const testPath = join(root, 'scripts/test-event-attestation-negatives.mjs');
const original = readFileSync(join(repo, '.claude/hooks/lib/event-attestation.mjs'), 'utf8');
mkdirSync(join(root, '.claude/hooks/lib'), { recursive: true });
mkdirSync(join(root, 'scripts'), { recursive: true });
writeFileSync(testPath, readFileSync(join(repo, 'scripts/test-event-attestation-negatives.mjs')));

function run(source) {
  writeFileSync(modulePath, source);
  const result = spawnSync(process.execPath, [testPath], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined);
  return result;
}

try {
  const baseline = run(original);
  assert.equal(baseline.status, 0, baseline.stderr);
  console.log('PASS mutation baseline');
  const mutations = [
    ['missing bootstrap fence', 'if (!cursor && !(', 'if (false && !(', /FAIL codex unfenced same-text historical tail/],
    ['historical Stop outside ledger', 'index < currentAnchorIndex', 'index < 0', /FAIL codex Stop pre-fence history/],
    ['duplicate Stop witness', 'if (selected && matches > 1)', 'if (false)', /FAIL codex Stop duplicate current response/],
  ];
  for (const [name, before, after, expected] of mutations) {
    assert.ok(original.includes(before), `mutation anchor missing: ${name}`);
    const mutant = run(original.replace(before, after));
    assert.equal(mutant.status, 1, `mutation survived: ${name}\n${mutant.stdout}\n${mutant.stderr}`);
    assert.match(mutant.stderr, expected);
    assert.doesNotMatch(mutant.stderr, /SyntaxError|ReferenceError|ERR_MODULE_NOT_FOUND/);
    console.log(`PASS mutation rejected: ${name}`);
  }
  const restored = run(original);
  assert.equal(restored.status, 0, restored.stderr);
  console.log('PASS mutation restored baseline');
} finally {
  rmSync(root, { recursive: true, force: true });
}
