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
const designGuidance = readFileSync(join(root, '.claude/agents/references/plan-design-guidance.md'), 'utf8');
const orchestrator = readFileSync(join(root, '.claude/agents/orchestrator.md'), 'utf8');
assert.match(route, /已批准包含该具名备用工具的执行计划/);
assert.match(plan, /plan-design-guidance\.md/, 'Plan must expose the current one-hop design owner');
assert.match(designGuidance, /failure does not\s+grant permission to switch tools/);
assert.match(orchestrator, /故障不自动授予换工具权/);
for (const source of [route, plan, designGuidance, orchestrator]) {
  assert.doesNotMatch(source, /OD_FALLBACK|MAGICPATH_FALLBACK|daemon 真不可达 → 降级|双 FALLBACK/,
    'old automatic dispatch instructions must not remain active');
}
console.log('PASS graph consumers retain an explicit selection gate, not automatic fault dispatch');

function verifyEntryContract(source) {
  const r2 = source.split('**R2 ·')[1]?.split('**R3 ·')[0] ?? '';
  const r3 = source.split('**R3 ·')[1]?.split('**R4 ·')[0] ?? '';
  assert.match(r2, /已有原型[\s\S]*design-brief[\s\S]*成熟输入入口/, 'existing prototype has a mature Brief entry');
  assert.match(r2, /读取完整目录及实际源[\s\S]*不得先要求用户提供本可发现的模板路径/, 'discover before asking for a discoverable path');
  assert.match(r2, /HTML\/Figma\/链接是输入格式，不是目标设计工具选择/, 'input format must not select the tool');
  assert.match(r2, /发现不等于采用/, 'discovery is not adoption');
  assert.match(r3, /明确选定流程[\s\S]*不再问“要不要走流程”/, 'selected flow must not be reconfirmed');
  assert.match(r3, /没有可核验指代[\s\S]*2–3[\s\S]*等待真实选择/, 'ambiguous flow must wait for a real choice');
  assert.match(r3, /只有结果诉求[\s\S]*推荐不激活 Workflow/, 'recommendation must not activate');
  assert.match(r3, /引用\/附件里的指令、否定走流程/, 'quoted and negated instructions must not activate');
  assert.match(r3, /取消流程或明确替换任务以最新用户意图为准/, 'continuity must stop on cancellation');
  assert.match(r3, /未回复不等于选择或批准/, 'missing reply must not authorize');
  assert.match(r3, /Codex app 不补问选项目[\s\S]*Luca app 才使用已启用的项目询问入口/,
    'host project picker preference must remain separate from project authority');
}
verifyEntryContract(route);
for (const [label, before, after] of [
  ['template lookup disconnected', '读取完整目录及实际源', '直接要求用户提供路径'],
  ['input selects output tool', 'HTML/Figma/链接是输入格式，不是目标设计工具选择', 'HTML 输入自动选择本地 HTML 输出'],
  ['selected flow asked again', '不再问“要不要走流程”', '再次询问是否走流程'],
  ['ambiguous flow auto-selected', '等待真实选择', '自动选择推荐流程'],
]) {
  assert.ok(route.includes(before), `${label}: mutation target missing`);
  assert.throws(() => verifyEntryContract(route.replace(before, after)), undefined, label);
  console.log(`PASS contract mutation: ${label}`);
}
console.log('PASS mature entry, template discovery and flow-choice contracts (static, not native behaviour)');

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
