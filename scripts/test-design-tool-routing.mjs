#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAuthority } from './lib/semantic-projection.mjs';

// Contract checks only: real model routing remains a separate Harness gate.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const graph = readAuthority(root, '.claude/skill-os/optional-workflow-graph.yaml#design_output');
function verifySelectionGate(value) {
  assert.equal(value.primary, 'open-design', 'keep the default OD entry');
  assert.deepEqual(value.fallback, ['magicpath', 'html-prototype'], 'keep independent local capabilities');
  assert.equal(value.requires_explicit_tool_choice, true, 'explicit tool choice is required');
  assert.deepEqual(value.fallback_trigger, [
    'user requests local html',
    'user explicitly selects magicpath',
    'user approves named fallback in execution plan',
  ], 'only actual user choice authorizes cross-tool fallback');
  assert.equal(value.od_headless_unavailable.degrade_target, 'open-design-desktop-generate',
    'headless recovery stays in OD');
}
verifySelectionGate(graph);
console.log('PASS OD default, user-selected alternatives, same-tool desktop recovery');

const route = readFileSync(join(root, '.claude/skill-os/routing-chain-check.md'), 'utf8');
const plan = readFileSync(join(root, '.claude/agents/plan-agent.md'), 'utf8');
const orchestrator = readFileSync(join(root, '.claude/agents/orchestrator.md'), 'utf8');
assert.match(route, /已批准包含该具名备用工具的执行计划/);
assert.match(plan, /Gap 2 — 已选设计工具的可用性与断言（故障不授予换工具权）/);
assert.match(orchestrator, /故障不自动授予换工具权/);
for (const source of [route, plan, orchestrator]) {
  assert.doesNotMatch(source, /OD_FALLBACK|MAGICPATH_FALLBACK|daemon 真不可达 → 降级|双 FALLBACK/,
    'old automatic dispatch instructions must not remain active');
}
console.log('PASS graph consumers retain an explicit selection gate, not automatic fault dispatch');

for (const [name, mutate, message] of [
  ['fault grants tool switch', (value) => value.fallback_trigger.push('open-design daemon unreachable'), /actual user choice/],
  ['choice guard removed', (value) => delete value.requires_explicit_tool_choice, /explicit tool choice/],
  ['headless silently switches tool', (value) => { value.od_headless_unavailable.degrade_target = 'html-prototype'; }, /recovery stays in OD/],
  ['independent capability removed', (value) => { value.fallback = ['magicpath']; }, /independent local capabilities/],
]) {
  const changed = structuredClone(graph);
  mutate(changed);
  assert.throws(() => verifySelectionGate(changed), message, name);
  verifySelectionGate(graph);
  console.log(`PASS mutation: ${name} -> exact assertion fails -> original passes`);
}
