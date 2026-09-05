#!/usr/bin/env node
// Independent-root parity: both harness adapters carry the same K1-K10 obligations while retaining
// truthful runtime-specific invocation. Detailed semantics are validated by check-agent-context.mjs.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const roots = { 'CLAUDE.md': read('CLAUDE.md'), 'AGENTS.md': read('AGENTS.md') };
const expected = Array.from({ length: 10 }, (_, index) => `K${index + 1}`);

for (const [path, text] of Object.entries(roots)) {
  const starts = [...text.matchAll(/<!-- (K\d+):START -->/g)].map((match) => match[1]);
  const ends = [...text.matchAll(/<!-- (K\d+):END -->/g)].map((match) => match[1]);
  assert.deepEqual(starts, expected, `${path} K start markers must be exactly K1-K10 in order`);
  assert.deepEqual(ends, expected, `${path} K end markers must be exactly K1-K10 in order`);
  assert.ok(statSync(join(root, path)).size <= 11_264, `${path} exceeds the 11 KiB root budget`);
  assert.match(text, /agent-context-manifest\.json/, `${path} lacks conditional manifest loader`);
  assert.match(text, /generated\/skill-catalog\.md/, `${path} lacks STOP discovery catalog loader`);
  assert.doesNotMatch(text, /纷享销客|#FF8000/, `${path} hardcodes a profile-specific product or brand`);
  assert.match(text, /<!-- FILE_END: (?:CLAUDE|AGENTS)\.md -->\s*$/, `${path} lacks terminal FILE_END`);
}

assert.doesNotMatch(
  roots['AGENTS.md'],
  /(?:read|load)[^\n]{0,100}`?CLAUDE\.md`?/i,
  'AGENTS.md must not load the Claude root adapter',
);
assert.match(roots['CLAUDE.md'], /native slash-command|native slash commands/i, 'Claude invocation truth missing');
assert.match(roots['AGENTS.md'], /\$<skill-name>/, 'Codex $skill invocation truth missing');
assert.match(roots['AGENTS.md'], /does not execute Claude slash/i, 'Codex slash-command limitation missing');

console.log('PASS independent root parity: K1-K10, budgets, pointers, and harness differences');
