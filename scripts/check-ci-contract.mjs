#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ciPath = process.env.LUCA_CI_FILE
  ? resolve(process.env.LUCA_CI_FILE)
  : join(root, '.github', 'workflows', 'ci.yml');
const ci = readFileSync(ciPath, 'utf8');

for (const command of [
  'npm run test:project-scope',
  'npm run test:project-transaction',
  'python3 scripts/test-observability-writer.py',
  'python3 scripts/test-gate-verdict-recorder.py',
  'node scripts/verify-codex-wiring.mjs --static --ci',
  'npm run check:evolution-adjudication',
  'npm run check:agent-contracts',
  'npm run test:framework-html-baseline',
  'npm run test:ci-contract',
  'npm run test:semantic-parity',
]) {
  assert.ok(ci.includes(command), `CI missing blocking command: ${command}`);
}

const htmlSection = ci.split(/^  validate-html:/m)[1]?.split(/^  [\w-]+:/m)[0] || '';
assert.ok(htmlSection, 'CI missing validate-html job');
const htmlNodeVersion = htmlSection.match(
  /uses:\s*actions\/setup-node@v\d+\s*\n\s*with:\s*\n\s*node-version:\s*['"]?([^'"\s]+)['"]?/,
)?.[1];
assert.equal(
  htmlNodeVersion,
  '24',
  'validate-html must use Node 24 for html-validate@11.10.0 (requires >=24.8 on the Node 24 line)',
);
assert.match(htmlSection, /html-validate@11\.10\.0/, 'framework validator version must be pinned');
assert.match(htmlSection, /npm run check:framework-html/, 'framework HTML baseline gate must be blocking');
assert.doesNotMatch(htmlSection.split(/# Downstream prototypes are optional/)[0], /\|\|\s*(true|echo)/, 'framework HTML gate must not swallow failures');

const gatherer = ci.split(/^  required-checks:/m)[1] || '';
assert.match(gatherer, /needs:/, 'CI must expose one stable required-checks gatherer');
for (const job of ['validate-yaml', 'validate-markdown', 'validate-skills', 'validate-framework-logic', 'validate-html']) {
  assert.ok(gatherer.includes(job), `required-checks does not depend on ${job}`);
}

console.log('PASS CI blocking/coverage/gatherer contract');
