#!/usr/bin/env node
// Run the real gates against disposable files. Never mutate the working tree for negative tests.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('..', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'claude-native-routing-'));
const policyPath = '.claude/skill-os/model-routing.yaml';
const pins = { 'quality-gate': 'opus', 'muse-proto-judge': 'opus', 'fact-collector': 'sonnet', 'preflight-agent': 'haiku' };
const write = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};
const originals = new Map();
let cases = 0;
const run = (command, args) => spawnSync(command, args, {
  cwd: root, encoding: 'utf8', timeout: 30_000,
  env: { ...process.env, MEMORY_ROOT: root, GLOBAL_MEMORY_DIR: join(root, 'global-memory'), PYTHONDONTWRITEBYTECODE: '1' },
});
const governance = () => {
  const result = run('python3', ['-P', '-c',
    "import json, runpy; m=runpy.run_path('memory/scripts/daily_governance.py'); print(json.dumps(m['check_model_routing'](), ensure_ascii=False))"]);
  assert.equal(result.status, 0, `governance must fail open: ${result.stderr}`);
  return JSON.parse(result.stdout);
};
const model = () => run(process.execPath, ['scripts/check-model-table.mjs']);
const green = (label) => {
  const result = model();
  assert.equal(result.status, 0, `${label}: ${result.stdout}${result.stderr}`);
  assert.deepEqual(governance(), [], `${label}: governance drift`);
};
const mutate = (label, path, change, expected) => {
  const original = originals.get(path);
  assert.equal(typeof original, 'string', `missing original for ${path}`);
  const changed = change(original);
  assert.ok(changed !== original, `${label}: mutation did not change fixture`);
  if (changed === null) rmSync(join(root, path));
  else write(path, changed);
  try {
    const result = model();
    assert.notEqual(result.status, 0, `${label}: model gate accepted bad fixture`);
    assert.match(`${result.stdout}${result.stderr}`, expected, `${label}: unrelated checker failure`);
    assert.match(governance().join('\n'), expected, `${label}: governance missed drift`);
  } finally { write(path, original); }
  green(`${label} restored`);
  cases++;
  console.log(`PASS ${label}: rejected and restored`);
};

try {
  for (const path of [policyPath, 'CLAUDE.md', 'AGENTS.md', '.claude/agents/orchestrator.md',
    '.codex/agents/fact-collector.toml', 'scripts/check-model-table.mjs',
    'scripts/check-registration-sync.mjs', 'memory/scripts/daily_governance.py', 'memory/scripts/_memroot.py',
    ...Object.keys(pins).map(name => `.claude/agents/${name}.md`)]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(source, path), join(root, path));
    originals.set(path, readFileSync(join(root, path), 'utf8'));
  }
  // Ordinary agents and skills require neither a central tier nor recommended-model.
  write('.claude/agents/ordinary.md', '---\nname: ordinary\n---\nInherit the caller.\n');
  write('.claude/skills/office/sample/SKILL.md', '---\nname: sample\n---\nA sample skill.\n');
  write('.claude/skill-os/skill-routing-map.yaml', 'project_skills:\n  sample:\n    invoke: "/sample"\n');
  write('.claude/skill-os/agent-context-state.json', '{"phase":"projected"}\n');
  write('.claude/skill-os/generated/skill-catalog.md', '| `sample` | `.claude/skills/office/sample/SKILL.md` |\n');
  write('.claude/skills/office/references/office-wizard.md', 'sample\n');
  green('native-first without skill metadata or no-pin registration');
  const registration = run(process.execPath, ['scripts/check-registration-sync.mjs']);
  assert.equal(registration.status, 0, registration.stderr);
  assert.match(registration.stdout, /REG-2 retired/);
  console.log('PASS native-first without recommended-model/no-pin registration');
  // Stale metadata is also inert, even when it names a nonexistent tier.
  write('.claude/skills/office/sample/SKILL.md', '---\nname: sample\nrecommended-model: obsolete-unknown-tier\n---\nA sample skill.\n');
  green('legacy metadata ignored');
  assert.equal(run(process.execPath, ['scripts/check-registration-sync.mjs']).status, 0);
  cases += 2;

  for (const field of ['known_lineup', 'default_tier', 'tiers', 'fable_whitelist', 'agents_no_pin', 'non_dispatchable', 'dispatch_rules', 'new_scenario_protocol']) {
    mutate(`retired ${field}`, policyPath, text => `${text}\n${field}: {}\n`, /retired tier policy restored/);
  }
  for (const [name, value] of Object.entries(pins)) {
    const path = `.claude/agents/${name}.md`;
    mutate(`${name} pin drift`, path, text => text.replace(new RegExp(`^model: ${value}\\b[^\\n]*`, 'm'), 'model: inherit'), /intentional pin drift/);
    mutate(`${name} file missing`, path, () => null, /intentional pin file missing/);
    mutate(`${name} registry missing`, policyPath, text => text.replace(new RegExp(`^  ${name}: ${value}[^\\n]*\\n`, 'm'), ''), /intentional pin registration drift/);
  }
  mutate('Claude fallback forbidden', policyPath, text => text.replace('automatic_fallback: none', 'automatic_fallback: opus'), /Claude native-first policy drift/);
  mutate('common critical failure', policyPath, text => text.replace('critical_failure: refuse-no-fallback', 'critical_failure: fallback'), /common critical failure boundary drift/);
  mutate('common critical scene', policyPath, text => text.replace(/(MR-004:[\s\S]*?critical:) true/, '$1 false'), /common critical scene drift/);
  mutate('common evidence', policyPath, text => text.replace('evidence: trusted-runtime-adoption-and-same-invocation-success', 'evidence: model-self-report'), /common invocation evidence boundary drift/);
  mutate('common role authority', policyPath, text => text.replace('peak: user-approved-higher-selection', 'peak: automatic-selection'), /common role authority drift/);
  mutate('common effort', policyPath, text => text.replace('effort: user-owned-not-a-routing-input', 'effort: scene-owned'), /effort/);
  mutate('Codex fixed effort', policyPath, text => text.replace(/(    preflight-agent:) low/, '$1 minimal'), /preflight-agent/);
  // A later top-level block cannot supply a missing common role (the old split swallowed it).
  mutate('common boundary decoy', policyPath, text => text.replace('    light: user-approved-lower-selection\n', '') + '\ndecoy:\n  roles:\n    light: user-approved-lower-selection\n', /light|role authority/);

  // Malformed YAML remains a governance issue, never a governance crash.
  write(policyPath, 'model_routing: [\n');
  assert.match(governance().join('\n'), /校验异常/);
  write(policyPath, originals.get(policyPath));
  green('malformed YAML restored');
  cases++;
  console.log(`PASS Claude native routing: ${cases} cases; actual checker/governance rejection + restoration`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
