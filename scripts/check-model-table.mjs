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

const commonStart = yaml.indexOf('\nmodel_routing:');
const commonEnd = yaml.indexOf('\nknown_lineup:', commonStart);
const common = commonStart >= 0
  ? yaml.slice(commonStart, commonEnd > commonStart ? commonEnd : undefined)
  : '';

assert.match(common, /\n\s{2}version:\s*2\b/, 'common model policy must be v2');
assert.match(common, /\n\s{2}status:\s*active\b/, 'common model policy must be active');
assert.match(common, /\n\s{2}scope:\s*common\b/, 'model policy must be harness-neutral');
for (const role of ['anchor', 'peak', 'light']) {
  assert.match(common, new RegExp(`\\n\\s{4}${role}:`), `common model policy lacks ${role} role`);
}
assert.match(common, /MR-008:[\s\S]*?role:\s*light\b/, 'low-risk mechanical work must resolve to light');
assert.match(common, /quality-gate:\s*MR-004\b/, 'native quality-gate dispatch drift');
assert.match(common, /Redteam:\s*MR-003\b/, 'workflow Redteam dispatch drift');
assert.match(common, /effort:\s*user-owned-not-a-routing-input\b/, 'effort must not be a model-routing input');
assert.doesNotMatch(common, /\bgpt-[\w.-]+\b/, 'public common policy must not contain account model names');

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
const codex = (yaml.split(/^codex:/m)[1] || '').split(/^new_scenario_protocol:/m)[0] || '';
assert.doesNotMatch(codex, /^\s{2}model_routing:/m, 'Codex must not own a second model policy');
assert.doesNotMatch(codex, /^\s{2}tier_to_effort:/m, 'Codex must not map model tiers to effort');
assert.match(codex, /\n\s{4}preflight-agent:\s*low\b/,
  'Codex fixed preflight-agent effort must remain low');
console.log('PASS common model-routing SSOT, legacy compatibility, and thin-root pointers');
