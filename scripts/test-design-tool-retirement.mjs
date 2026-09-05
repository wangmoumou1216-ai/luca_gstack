#!/usr/bin/env node
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readAuthority } from './lib/semantic-projection.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'design-tool-retirement-'));
const hookPath = join(scratch, '.claude/hooks/route-guard.mjs');
const graphPath = '.claude/skill-os/optional-workflow-graph.yaml';
const retired = '/figma-layer';

function route(prompt) {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd: scratch, input: JSON.stringify({ prompt }), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: scratch,
      LUCA_PROJECTS_ROOT: join(scratch, 'projects'), ROUTE_GUARD_DRY_RUN: '1',
      ROUTE_GUARD_PROJECTS: 'fixture-project', ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_HEAVY_SKILLS: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function assertNotDispatched(result, prompt) {
  const choices = [result.skill, ...(result.candidates || []), ...(result.recommendedSkills || []),
    ...(result.softCandidates || []).map(item => item.skill)];
  assert.ok(!choices.some(value => String(value).replace(/^\$/, '/').toLowerCase() === retired),
    `retired skill dispatched for ${prompt}: ${JSON.stringify(result)}`);
}

function verifyRoutes() {
  for (const prompt of ['/figma-layer', '$figma-layer', '/FIGMA-LAYER', 'figma-layer',
    '/figma-layer 请转换这个页面', '$figma-layer 开始', 'figma-layer 开始']) {
    const result = route(prompt);
    assertNotDispatched(result, prompt);
    assert.equal(result.decision, 'STOP', `retired direct call must stop: ${prompt}`);
    assert.equal(result.reason, 'retired_skill', `retirement must be explicit: ${prompt}`);
  }
  for (const prompt of ['保险层', 'figma保险层', '推到figma', '同步到Figma', '还原到figma', 'figma保险']) {
    assertNotDispatched(route(prompt), prompt);
  }
  for (const name of ['html-prototype', 'magicpath', 'figma-demo', 'muse-proto-gen', 'muse-loop-orchestrate',
    'open-design', 'brainstorm', 'tech-spec', 'task-plan', 'custom-existing-skill', 'figma-layer-helper']) {
    for (const prefix of ['/', '$']) {
      const result = route(`${prefix}${name}`);
      assert.equal(result.decision, 'SINGLE_SKILL', `${prefix}${name} direct semantics preserved`);
      assert.equal(result.skill, '/' + name);
    }
  }
}

function verifyGraph() {
  const graphText = readFileSync(join(root, graphPath), 'utf8');
  assert.doesNotMatch(graphText, /figma-layer|html_or_demo_to_figma/, 'retired graph dispatch must be removed');
  const scenes = readAuthority(root, `${graphPath}#scenes`);
  for (const scene of ['A', 'B', 'C', 'D']) {
    assert.ok(scenes[scene].recommended_paths.some(path => path.includes('open-design')), `${scene}: OD path retained`);
    for (const tool of ['html-prototype', 'magicpath']) {
      assert.ok(scenes[scene].fallback_paths.some(path => path.includes(tool)), `${scene}: independent ${tool} path retained`);
    }
  }
  const gates = readAuthority(root, `${graphPath}#handoff_gates`);
  for (const name of ['design_brief_to_open_design', 'design_brief_to_html', 'design_brief_to_magicpath']) {
    for (const clause of ['design_generation_packet missing', 'tool_consumption_contract missing',
      'packet contains facts absent from design_brief', 'page_interaction_mapping missing',
      'decision_cards missing required fields', 'traceability_matrix missing', 'traceability_gate != PASS',
      'required_state_coverage missing']) assert.ok(gates[name].block_if.includes(clause), `${name}: preserve ${clause}`);
  }
  assert.equal(gates.tech_spec_to_task_plan.allow_standalone_override, false);
  assert.equal(gates.task_plan_to_execution.allow_standalone_override, false);
  assert.ok(gates.tech_spec_to_task_plan.block_if.includes('any MUST requirement unmapped'));
  assert.ok(gates.task_plan_to_execution.block_if.includes('any required state has no dev/test coverage'));
  const preset = readAuthority(root, `${graphPath}#presets.engineering-delivery`);
  assert.equal(preset.authority_effect, 'none; selection is routing metadata only');
  assert.ok(preset.human_gates.some(gate => gate.includes('the user confirms')));
  const research = readAuthority(root, `${graphPath}#research_default.angle_orchestration`);
  assert.deepEqual(research.object_angles, ['deepresearch', 'ux-research', 'insight-synthesis']);

  const visibility = JSON.parse(readFileSync(join(root, '.claude/skill-os/skill-visibility.json'), 'utf8'));
  const tombstone = visibility.retired?.find(entry => entry.name === 'figma-layer');
  assert.deepEqual(tombstone, {
    name: 'figma-layer', status: 'retired-unavailable', replacement: 'open-design',
    decision_id: 'SC-20260905-003',
    boundary: "Only luca_gstack's reconstruction/write entry is retired; this neither verifies nor disables Open Design's own Figma capability.",
  });
  const catalog = readFileSync(join(root, '.claude/skill-os/generated/skill-catalog.md'), 'utf8');
  assert.doesNotMatch(catalog, /^\| `figma-layer` /m, 'retired figma-layer returned to the callable skill table');
  assert.match(catalog, /`figma-layer` — `retired-unavailable`; replacement: `open-design`;/,
    'generated discovery catalog lacks the retirement tombstone');
  assert.match(catalog, /neither verifies nor disables Open Design's own Figma capability/,
    'retirement tombstone invents an Open Design capability result');
}

try {
  for (const rel of ['.claude/hooks/route-guard.mjs', '.claude/hooks/lib/project-substrate.mjs',
    '.claude/hooks/lib/project-read-grants.mjs', '.claude/skill-os/skill-routing-map.yaml']) {
    mkdirSync(dirname(join(scratch, rel)), { recursive: true });
    copyFileSync(join(root, rel), join(scratch, rel));
  }
  mkdirSync(join(scratch, 'projects'), { recursive: true });
  verifyRoutes();
  verifyGraph();
  console.log('PASS retired direct/bare/semantic routes; independent direct skills; graph paths and gates retained');

  if (process.argv.includes('--mutation')) {
    const original = readFileSync(hookPath, 'utf8');
    const guard = /  if \(retiredName === 'figma-layer'\) \{[\s\S]*?\n  \}\n/;
    assert.match(original, guard, 'retirement guard mutation must target the actual hook');
    writeFileSync(hookPath, original.replace(guard, ''));
    assert.throws(() => verifyRoutes(), /retired skill dispatched for \/figma-layer/,
      'removing the actual guard must resurrect the retired dispatch and fail');
    writeFileSync(hookPath, original);
    verifyRoutes();
    verifyGraph();
    console.log('PASS actual guard removal -> retired dispatch exact FAIL -> restored PASS');
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
