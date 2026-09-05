#!/usr/bin/env node
// Model-routing SSOT gate. Root adapters carry only a conditional pointer; the full tier snapshot
// remains in model-routing.yaml and orchestrator.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const yaml = read('.claude/skill-os/model-routing.yaml');
const orchestrator = read('.claude/agents/orchestrator.md');

for (const tier of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
  const match = yaml.match(new RegExp(`\\n  ${tier}:\\s*\\n[\\s\\S]{0,300}?resolves_to:\\s*["']?([\\w.-]+)`));
  assert.ok(match, `model-routing.yaml cannot resolve ${tier}`);
  const row = orchestrator.split('\n').find((line) => line.trim().startsWith(`| ${tier} `));
  assert.ok(row, `orchestrator.md lacks ${tier} snapshot row`);
  assert.ok(row.toLowerCase().includes(match[1].toLowerCase()), `orchestrator ${tier} row lacks ${match[1]}`);
}

for (const path of ['CLAUDE.md', 'AGENTS.md']) {
  const text = read(path);
  assert.match(text, /model-routing\.yaml/, `${path} lacks the model-routing truth pointer`);
  assert.doesNotMatch(text, /^\| (?:reasoning-heavy|core-execution|guided-execution|mechanical) /m,
    `${path} must not duplicate the model tier table`);
}
assert.match(yaml, /effort_rejected_by_model:\s*\[minimal\]/, 'Codex rejected effort guard missing');
assert.match(yaml, /mechanical:\s*low\b/, 'Codex mechanical tier must map to low');
console.log('PASS model-routing SSOT and thin-root pointers');
