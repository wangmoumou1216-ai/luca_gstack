#!/usr/bin/env node
// Model-routing SSOT gate: Claude native inheritance/pins and unchanged Codex common policy.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const yaml = read('.claude/skill-os/model-routing.yaml');
const orchestrator = read('.claude/agents/orchestrator.md');

// Stop at the next real top-level key; Claude/Codex must never satisfy common checks.
const topLevelBlock = (text, key) => text.match(new RegExp(`(?:^|\\n)${key}:[\\s\\S]*?(?=\\n[A-Za-z_][\\w-]*:|$)`))?.[0] || '';
const common = topLevelBlock(yaml, 'model_routing');

assert.match(common, /\n\s{2}version:\s*2\b/, 'common model policy must be v2');
assert.match(common, /\n\s{2}status:\s*active\b/, 'common model policy must be active');
assert.match(common, /\n\s{2}scope:\s*common\b/, 'model policy must be harness-neutral');
for (const role of ['anchor', 'peak', 'light']) {
  assert.match(common, new RegExp(`\\n\\s{4}${role}:`), `common model policy lacks ${role} role`);
}
assert.match(common, /^    MR-008:\n(?:      [^\n]*\n)*?      role: light\s*$/m, 'low-risk mechanical work must resolve to light');
assert.match(common, /quality-gate:\s*MR-004\b/, 'native quality-gate dispatch drift');
assert.match(common, /Redteam:\s*MR-003\b/, 'workflow Redteam dispatch drift');
assert.match(common, /effort:\s*user-owned-not-a-routing-input\b/, 'effort must not be a model-routing input');
assert.doesNotMatch(common, /\bgpt-[\w.-]+\b/, 'public common policy must not contain account model names');

for (const path of ['CLAUDE.md', 'AGENTS.md']) {
  const text = read(path);
  assert.match(text, /model-routing\.yaml/, `${path} lacks the model-routing truth pointer`);
  assert.doesNotMatch(text, /^\| (?:reasoning-heavy|core-execution|guided-execution|mechanical) /m,
    `${path} must not duplicate the model tier table`);
}
assert.match(yaml, /effort_rejected_by_model:\s*\[minimal\]/, 'Codex rejected effort guard missing');
const codex = topLevelBlock(yaml, 'codex');
assert.doesNotMatch(codex, /^\s{2}model_routing:/m, 'Codex must not own a second model policy');
assert.doesNotMatch(codex, /^\s{2}tier_to_effort:/m, 'Codex must not map model tiers to effort');
assert.match(codex, /\n\s{4}preflight-agent:\s*low\b/,
  'Codex fixed preflight-agent effort must remain low');
console.log('PASS common model-routing SSOT, Codex guards, and thin-root pointers');

// Parse the new shared role and its real adapters; prose snapshots alone are insufficient.
const collector = spawnSync('python3', ['-P', '-c', `
import pathlib, sys, tomllib, yaml
root = pathlib.Path(sys.argv[1])
p = yaml.safe_load((root/'.claude/skill-os/model-routing.yaml').read_text())
for retired in ('known_lineup', 'default_tier', 'tiers', 'fable_whitelist', 'agents_no_pin', 'non_dispatchable', 'dispatch_rules', 'new_scenario_protocol'):
    assert retired not in p, f'Claude retired tier policy restored: {retired}'
expected_claude = {'strategy':'native-first', 'default_model':'inherit', 'skill_tiers':'ignored', 'explicit_model':'user-request-or-agent-frontmatter', 'automatic_fallback':'none', 'critical_review':'independent-required'}
assert p.get('claude') == expected_claude, 'Claude native-first policy drift'
for name, model in {'quality-gate':'opus', 'muse-proto-judge':'opus', 'fact-collector':'sonnet', 'preflight-agent':'haiku'}.items():
    assert (p.get('agents') or {}).get(name) == model, f'Claude intentional pin registration drift: {name}'
    agent_file = root/'.claude/agents'/f'{name}.md'
    assert agent_file.is_file(), f'Claude intentional pin file missing: {name}'
    agent_body = agent_file.read_text()
    assert agent_body.startswith('---\\n'), f'Claude intentional pin frontmatter missing: {name}'
    frontmatter = yaml.safe_load(agent_body.split('---', 2)[1]) or {}
    assert frontmatter.get('model') == model, f'Claude intentional pin drift: {name}'
common = p['model_routing']
assert common['roles'] == {'anchor':'root-effective-selection', 'peak':'user-approved-higher-selection', 'light':'user-approved-lower-selection'}, 'common role authority drift'
for scene in ('MR-002', 'MR-003', 'MR-004', 'MR-005'):
    assert common['scenes'][scene]['critical'] is True and common['scenes'][scene]['role'] == 'peak', f'common critical scene drift: {scene}'
assert common['critical_failure'] == 'refuse-no-fallback', 'common critical failure boundary drift'
assert common['evidence'] == 'trusted-runtime-adoption-and-same-invocation-success', 'common invocation evidence boundary drift'
a = tomllib.loads((root/'.codex/agents/fact-collector.toml').read_text())
body = (root/'.claude/agents/fact-collector.md').read_text()
f = yaml.safe_load(body.split('---', 2)[1])
assert p['model_routing']['scenes']['MR-009'] == {'trigger':'bounded-verifiable-fact-collection','role':'light','critical':False}
assert p['model_routing']['dispatch']['native_agent_types']['fact-collector'] == 'MR-009'
assert p['agents']['fact-collector'] == f['model'] == 'sonnet'
assert f['name'] == a['name'] == 'fact-collector'
assert 'sandbox_mode' not in a, 'Codex custom agent files do not apply sandbox_mode; do not declare it'
assert 'model' not in a and 'model_reasoning_effort' not in a
assert p['codex']['agents']['fact-collector'] == 'inherit'
assert '.claude/agents/fact-collector.md' in a['developer_instructions']
assert a['developer_instructions'].split('\\n\\n', 1)[1].strip() == body.split('---', 2)[2].strip()
assert f['tools'] == 'Read, Glob, Grep'
`, root], {encoding: 'utf8'});
assert.equal(collector.status, 0, `model policy or native adapter drift: ${collector.stderr}`);
assert.match(orchestrator, /fact-collector/, 'collector needs a real caller selection instruction');
console.log('PASS Claude native-first/pins, common critical guards, and bounded collector adapters');
