import assert from 'node:assert/strict';
import { resolveDesignExecutionDefaults as resolve } from './design-execution-defaults.mjs';

let count = 0;
const test = (name, run) => { run(); count++; console.log(`PASS ${name}`); };
const base = { selectedTool: 'open-design', topic: '审批工作台', handoffId: 'h-20261012-01' };
const currentDS = { tool: 'open-design', choice: 'current', configurationRef: 'od-config-current', sourceRef: 'real-user-message' };
const rejects = (input, code) => assert.throws(() => resolve(input), error => error.code === code);

test('OD missing parameters: automatic generation and one DS question', () => {
  const result = resolve(base);
  assert.equal(result.generationMode, 'headless');
  assert.equal(result.platform, 'responsive-web');
  assert.equal(result.fidelity, 'high');
  assert.deepEqual(result.parameterQuestions, ['design-system']);
  assert.equal(result.boundTarget, null);
  assert.match(result.proposedTarget.projectId, /^[a-z0-9][a-z0-9-]{0,63}$/);
  assert.equal(result.proposedTarget.creation, 'create-only');
});
test('CD stages with automatic display name, manual generation and no invented ID', () => {
  const result = resolve({ ...base, selectedTool: 'claude-design' });
  assert.equal(result.generationMode, 'manual');
  assert.deepEqual(result.proposedTarget, { name: '审批工作台', creation: 'create-only' });
  assert.equal(result.boundTarget, null);
  assert.deepEqual(result.parameterQuestions, ['design-system']);
  rejects({ ...base, selectedTool: 'claude-design', generationMode: 'headless' }, 'CD_MANUAL_GENERATION_REQUIRED');
  rejects({ ...base, selectedTool: 'claude-design', generationMode: 'desktop' }, 'CD_MANUAL_GENERATION_REQUIRED');
});
test('selected tool is required; policy never picks one', () => {
  for (const selectedTool of [undefined, null, 'od', 'magicpath', 'html-prototype']) rejects({ ...base, selectedTool }, 'SELECTED_TOOL_REQUIRED');
});
test('CD titles fit the host display boundary without changing the full topic or existing target', () => {
  for (const topic of ['A'.repeat(121), 'Invoice\nreview', '📐'.repeat(100), '\0\u202e']) {
    const input = { ...base, selectedTool: 'claude-design', topic };
    const name = resolve(input).proposedTarget.name;
    assert.ok(name.trim() && name.length <= 120);
    assert.doesNotMatch(name, /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/);
    assert.equal(Buffer.from(name).toString('utf8'), name, 'do not split a Unicode surrogate pair');
    assert.equal(input.topic, topic);
    assert.equal(resolve(input).proposedTarget.name, name);
  }
  assert.equal(resolve({ ...base, selectedTool: 'claude-design', topic: 'Invoice\nreview' }).proposedTarget.name, 'Invoice review');
  const target = { tool: 'claude-design', workspaceId: 'existing', name: 'Keep\nthis existing title' };
  assert.deepEqual(resolve({ ...base, selectedTool: 'claude-design', target }).boundTarget, target);
});
test('explicit desktop, mobile and wireframe facts are inherited', () => {
  const result = resolve({ ...base, platform: 'mobile-standard', fidelity: 'wireframe', generationMode: 'desktop', designSystem: currentDS });
  assert.equal(result.generationMode, 'desktop');
  assert.equal(result.platform, 'mobile-standard');
  assert.equal(result.fidelity, 'wireframe');
  assert.deepEqual(result.parameterQuestions, []);
});
test('screenshot dimensions cannot become target platform', () => {
  assert.equal(resolve({ ...base, screenshot: { width: 390, height: 844 } }).platform, 'responsive-web');
});
test('unresolved product facts return Brief; empty parameters never silently default', () => {
  rejects({ ...base, unresolvedDesignQuestions: ['mobile and desktop-only conflict'] }, 'RETURN_BRIEF_UNRESOLVED_DESIGN');
  rejects({ ...base, platform: '' }, 'RETURN_BRIEF_INVALID_PARAMETER');
  rejects({ ...base, fidelity: '' }, 'RETURN_BRIEF_INVALID_PARAMETER');
});
test('names are deterministic, safe and bounded for non-ASCII and hostile titles', () => {
  for (const topic of ['审批工作台', '../../Bad / Name', 'A'.repeat(300), ' Hello World ']) {
    const result = resolve({ ...base, topic });
    assert.match(result.proposedTarget.projectId, /^[a-z0-9][a-z0-9-]{0,63}$/);
    assert.equal(result.proposedTarget.projectId, resolve({ ...base, topic }).proposedTarget.projectId);
    assert.notEqual(result.proposedTarget.projectId, resolve({ ...base, topic, handoffId: 'other-handoff' }).proposedTarget.projectId);
  }
});
test('existing target is preserved; collision cannot cause an update', () => {
  const target = { tool: 'open-design', projectId: 'existing-design', name: 'Existing' };
  assert.deepEqual(resolve({ ...base, target }).boundTarget, target);
  assert.equal(resolve({ ...base, target }).proposedTarget, null);
  const id = resolve(base).proposedTarget.projectId;
  rejects({ ...base, knownProjectIds: [id] }, 'TARGET_COLLISION_INSPECT_CURRENT_RESULT');
  rejects({ ...base, target: { tool: 'open-design', projectId: '../escape' } }, 'BOUND_TARGET_REQUIRED');
});
test('CD workspace identity is preserved including exact artifact/revision', () => {
  const target = { tool: 'claude-design', workspaceId: 'opaque/workspace', artifactId: 'artifact-7', revisionId: 'revision-3' };
  const result = resolve({ ...base, selectedTool: 'claude-design', target, operation: 'recover' });
  assert.deepEqual(result.boundTarget, target);
  assert.equal(result.proposedTarget, null);
  assert.equal(result.generationMode, null);
  assert.deepEqual(result.parameterQuestions, []);
});
test('recover needs exact target and never asks DS or generates new project', () => {
  rejects({ ...base, operation: 'recover' }, 'RECOVERY_IDENTITY_REQUIRED');
  const result = resolve({ ...base, operation: 'recover', target: { tool: 'open-design', projectId: 'existing-design' } });
  assert.equal(result.proposedTarget, null);
  assert.equal(result.generationMode, null);
  assert.deepEqual(result.parameterQuestions, []);
});
test('DS decisions scoped to tool and explicit source; none must be a real choice', () => {
  const cdDS = { ...currentDS, tool: 'claude-design', configurationRef: 'cd-config-current' };
  assert.deepEqual(resolve({ ...base, selectedTool: 'claude-design', designSystem: cdDS }).parameterQuestions, []);
  rejects({ ...base, selectedTool: 'claude-design', designSystem: currentDS }, 'DESIGN_SYSTEM_CONFIRMATION_REQUIRED');
  rejects({ ...base, designSystem: { ...currentDS, sourceRef: '' } }, 'DESIGN_SYSTEM_CONFIRMATION_REQUIRED');
  rejects({ ...base, designSystem: { ...currentDS, configurationRef: '' } }, 'DESIGN_SYSTEM_CONFIRMATION_REQUIRED');
  assert.deepEqual(resolve({ ...base, designSystem: { tool: 'open-design', choice: 'none', sourceRef: 'explicit-no-ds' } }).parameterQuestions, []);
});
test('policy neither mutates input nor manufactures effect authority', () => {
  const input = { ...base, designSystem: currentDS };
  const before = structuredClone(input);
  const result = resolve(input);
  assert.deepEqual(input, before);
  assert.equal(result.executionAuthority, 'NOT_PROVIDED');
  for (const key of ['grant', 'write', 'stage', 'run', 'recover', 'send', 'capabilityReceipt']) assert.equal(result[key], undefined);
  result.designSystem.sourceRef = 'mutated';
  assert.deepEqual(input, before);
});
test('unsafe handoff and missing new-task title refused', () => {
  rejects({ ...base, handoffId: '../h' }, 'HANDOFF_ID_REQUIRED');
  rejects({ ...base, topic: '' }, 'TOPIC_REQUIRED');
});
console.log(`PASS ${count} design execution defaults behavior groups (pure policy; no live external effect)`);
