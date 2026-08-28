#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checker = join(root, 'scripts', 'check-ci-contract.mjs');
const ciPath = join(root, '.github', 'workflows', 'ci.yml');

function run(ciFile) {
  return spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LUCA_CI_FILE: ciFile },
  });
}

const real = run(ciPath);
assert.equal(real.status, 0, `${real.stdout}${real.stderr}`);
console.log('PASS real CI contract');

const tempDir = mkdtempSync(join(tmpdir(), 'luca-ci-contract-test-'));
const mutatedPath = join(tempDir, 'ci.yml');
const mutated = readFileSync(ciPath, 'utf8').replace('npm run test:project-scope', 'npm run omitted-project-scope');
writeFileSync(mutatedPath, mutated);
const rejected = run(mutatedPath);
assert.equal(rejected.status, 1, `${rejected.stdout}${rejected.stderr}`);
assert.match(`${rejected.stdout}${rejected.stderr}`, /CI missing blocking command: npm run test:project-scope/);
console.log('PASS missing blocking command is rejected');
console.log('PASS CI contract proof-it-bites 2/2');
