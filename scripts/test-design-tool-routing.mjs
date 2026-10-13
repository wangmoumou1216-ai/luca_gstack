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
  assert.equal(value.primary, 'design-output', 'keep the thin selection entry');
  assert.deepEqual(value.adapters, ['open-design', 'claude-design']);
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
console.log('PASS OD/CD selection entry, user-selected alternatives, same-tool desktop recovery');

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
  assert.throws(() => verifyEntryContract(route.replaceAll(before, after)), undefined, label);
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

// A1: execute the production selection seam against exact on-disk Packet bytes.
const { mkdtempSync, writeFileSync, rmSync, realpathSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { createHash } = await import('node:crypto');
const { resolveDesignOutput } = await import('./design-output-selection.mjs');
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'design-selection-')));
try {
  const path = join(dir, 'packet.md');
  const body = 'Complete frozen Packet: D-1 STATE-1 AC-1 KEEP-1\n';
  writeFileSync(path, body);
  const sha256 = createHash('sha256').update(body).digest('hex');
  const packet = { path, sha256, tool: null };
  const task = { source_ref: 'test-user-turn:full', scope: { template: 'original', preserve: ['KEEP-1'], downstream: ['notes','engineering'] }, execution_mode: 'workflow', unresolved: ['template-adoption'] };
  const missing = resolveDesignOutput({ packet, task });
  assert.equal(missing.status, 'NEEDS_CONTEXT'); assert.equal(missing.node, null);
  const selected = resolveDesignOutput({ packet, task, choice: { tool: 'claude-design', source_ref: 'test-user-turn:choice' } });
  assert.equal(selected.node, 'claude-design'); assert.deepEqual(selected.task, task);
  assert.equal(readFileSync(path, 'utf8'), body);
  const resumed = resolveDesignOutput({ packet, task, selection: selected.selection });
  assert.equal(resumed.status, 'SELECTED'); assert.equal(resumed.question, undefined);
  assert.deepEqual(resumed, selected);
  assert.throws(() => resolveDesignOutput({ packet, task, selection: selected.selection, choice: { tool: 'open-design', source_ref: 'test-user-turn:change' } }), /CONFLICT_RETURN_BRIEF/);
  for (const tool of ['open-design', 'claude-design', 'html-prototype', 'magicpath']) {
    const bound = { ...packet, tool, choice_source_ref: 'test-user-turn:existing' };
    assert.equal(resolveDesignOutput({ packet: bound, task }).tool, tool);
    assert.throws(() => resolveDesignOutput({ packet: bound, task, choice: { tool: tool === 'open-design' ? 'claude-design' : 'open-design', source_ref: 'test-user-turn:conflict' } }), /FROZEN_TOOL_CONFLICT_RETURN_BRIEF/);
  }
  assert.throws(() => resolveDesignOutput({ packet, task: { ...task, scope: 'short reply only' }, selection: selected.selection }), /SELECTION_DRIFT/);
  assert.throws(() => resolveDesignOutput({ packet, task, choice: { tool: 'claude-design' } }), /REAL_CHOICE_SOURCE_REQUIRED/);
  assert.throws(() => resolveDesignOutput({ packet: { ...packet, tool: undefined }, task }), /UNKNOWN_DESIGN_TOOL/);
  const altered = structuredClone(selected.selection); altered.packet.sha256 = 'a'.repeat(64);
  assert.throws(() => resolveDesignOutput({ packet, task, selection: altered }), /SELECTION_DRIFT/);
  writeFileSync(path, body + 'drift');
  assert.throws(() => resolveDesignOutput({ packet, task, selection: selected.selection }), /PACKET_DRIFT/);
  console.log('PASS A1 real selection seam: unresolved, once/inherit, full-task retention, frozen/sidecar conflict, drift, old OD choice');
} finally { rmSync(dir, { recursive: true, force: true }); }
for (const skill of ['design-output', 'claude-design']) {
  const authority = join(root, '.claude/skills/office', skill, 'SKILL.md');
  const command = readFileSync(join(root, '.claude/commands', skill + '.md'), 'utf8');
  assert.ok(command.includes('.claude/skills/office/' + skill + '/SKILL.md'));
  assert.equal(realpathSync(join(root, '.agents/skills', skill, 'SKILL.md')), realpathSync(authority));
  assert.ok(readFileSync(join(root,'.claude/skill-os/generated/skill-catalog.md'),'utf8').includes('`'+skill+'`'));
  const view = JSON.parse(readFileSync(join(root,'.claude/skill-os/generated/input-modes',skill+'.json'),'utf8'));
  assert.equal(view.skill,skill);
  console.log('PASS Claude command + Codex alias + catalog + input discoverability: ' + skill + ' (not live host parity)');
}
