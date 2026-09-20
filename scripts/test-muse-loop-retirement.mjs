#!/usr/bin/env node
// Real runtime copies in a disposable fixture: mutations never touch the working tree.
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'muse-loop-retirement-'));
const hookRel = '.claude/hooks/route-guard.mjs';
const qaRel = '.claude/skills/office/html-prototype/scripts/verify-prototype.mjs';
const registryRel = '.claude/skill-os/skill-routing-map.yaml';
const retired = ['muse-loop-orchestrate', 'muse-proto-gen'];
const natural = ['muse loop', 'muse自进化循环', '需求到原型闭环', '跑一下muse loop'];
const env = { ...process.env, CLAUDE_PROJECT_DIR: scratch, LUCA_PROJECTS_ROOT: join(scratch, 'projects'),
  ROUTE_GUARD_PROJECTS: 'muse,fixture-project', ROUTE_GUARD_CURRENT_PROJECT: '',
  ROUTE_GUARD_HEAVY_SKILLS: '', ROUTE_GUARD_DRY_RUN: '1' };
function copy(rel) {
  mkdirSync(dirname(join(scratch, rel)), { recursive: true });
  copyFileSync(join(root, rel), join(scratch, rel));
}
function run(rel, args = [], input = '', overrides = {}) {
  return spawnSync(process.execPath, [join(scratch, rel), ...args], {
    cwd: scratch, input, encoding: 'utf8', timeout: 30000, env: { ...env, ...overrides },
  });
}
function route(prompt, overrides = {}) {
  const result = run(hookRel, [], JSON.stringify({ prompt }), overrides);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function noRetiredDispatch(result, prompt) {
  const choices = [result.skill, ...(result.candidates || []), ...(result.recommendedSkills || []),
    ...(result.softCandidates || []).map(item => item.skill)];
  assert.ok(!choices.some(value => retired.includes(String(value).replace(/^[$/]/, '').toLowerCase())),
    `retired dispatch: ${prompt}: ${JSON.stringify(result)}`);
}
function verifyRoutes() {
  for (const name of retired) {
    for (const variant of [name, name.toUpperCase()]) {
      for (const prefix of ['/', '$', '']) {
        for (const suffix of ['', ' 开始', ' 新增A、B、C、D，先计划再实现最后验证']) {
          const prompt = prefix + variant + suffix;
          const result = route(prompt);
          noRetiredDispatch(result, prompt);
          assert.equal(result.decision, 'STOP', `explicit retirement must stop: ${prompt}`);
          assert.equal(result.reason, 'retired_skill', prompt);
          assert.deepEqual(result.candidates, [], 'retirement must not select a replacement');
          assert.equal(result.project, undefined, 'retired name must not bind muse project');
        }
      }
    }
  }
  for (const prompt of natural) noRetiredDispatch(route(prompt), prompt);
  for (const name of ['html-prototype', 'figma-demo', 'open-design', 'magicpath', 'muse-req-triage',
    'muse-proto-judge', 'brainstorm', 'tech-spec', 'task-plan', 'custom-existing-skill', 'muse-proto-gen-helper']) {
    for (const prefix of ['/', '$']) {
      const result = route(prefix + name);
      assert.equal(result.decision, 'SINGLE_SKILL', `retained direct path: ${prefix}${name}`);
      assert.equal(result.skill, '/' + name);
    }
  }
  assert.equal(route('/deepresearch', { ROUTE_GUARD_HEAVY_SKILLS: 'deepresearch' }).decision, 'PLAN_CHECK');
  for (const name of retired) assert.equal(route('/' + name, { ROUTE_GUARD_HEAVY_SKILLS: name }).reason, 'retired_skill');
  const malformed = run(hookRel, [], '{not JSON');
  assert.equal(malformed.status, 0, 'malformed input preserves fail-open');
}
function verifyAdapter() {
  for (const name of retired) for (const prefix of ['/', '$', '']) {
    const result = run('.codex/codex-hook-adapter.mjs', [join(scratch, hookRel)], JSON.stringify({
      cwd: scratch, hook_event_name: 'UserPromptSubmit', prompt: prefix + name,
    }), { ROUTE_GUARD_DRY_RUN: '0' });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    assert.match(output.hookSpecificOutput.additionalContext, /RETIRED/, 'real Codex adapter preserves refusal');
  }
  const retained = run('.codex/codex-hook-adapter.mjs', [join(scratch, hookRel)], JSON.stringify({
    cwd: scratch, hook_event_name: 'UserPromptSubmit', prompt: '$html-prototype',
  }), { ROUTE_GUARD_DRY_RUN: '0' });
  assert.equal(retained.status, 0, retained.stderr);
  assert.match(JSON.parse(retained.stdout).hookSpecificOutput.additionalContext, /html-prototype/);
  assert.doesNotMatch(retained.stdout, /RETIRED/);
}
const htmlPath = join(scratch, 'qa/index.html');
function qa(mode) { return run(qaRel, [htmlPath, '--mode=' + mode]); }
function verifyRetiredQa() {
  for (const mode of ['muse-proto-gen', 'MUSE-PROTO-GEN']) {
    const result = qa(mode);
    assert.equal(result.status, 2, 'retired QA mode must exit 2');
    assert.match(result.stderr, /RETIRED: muse-proto-gen/, 'retired QA mode must refuse explicitly');
  }
}
function verifyNormalQa() {
  const spec = 'Dynamic Reference Status: NOT_REQUIRED\nCurrent Aesthetic Score: 26/30\nstandalone mobile traceability 不完整\nmapping-proof.md';
  writeFileSync(join(scratch, 'qa/prototype-spec.md'), spec);
  writeFileSync(join(scratch, 'qa/blueprint.yaml'), 'nodes:\n  - id: node-01\n');
  for (const mode of ['html-prototype', 'figma-demo', 'standalone-mobile', 'ux-audit', 'screenshot-delta', 'unknown-legacy']) {
    const result = qa(mode);
    assert.ok(result.status === 0 || result.status === 1, result.stderr);
    const report = JSON.parse(readFileSync(join(scratch, 'qa/qa-results.json'), 'utf8'));
    assert.equal(report.mode, mode === 'unknown-legacy' ? 'figma-demo' : mode, 'existing mode/fallback unchanged');
    const staticFailures = report.checks.filter(check => !check.passed && !check.name.startsWith('Browser'));
    assert.deepEqual(staticFailures, [], `normal ${mode} static QA: ${JSON.stringify(staticFailures)}`);
  }
  rmSync(join(scratch, 'qa/prototype-spec.md'));
  writeFileSync(htmlPath, '<html><body>Missing spec and state fixture</body></html>');
  qa('html-prototype');
  const report = JSON.parse(readFileSync(join(scratch, 'qa/qa-results.json'), 'utf8'));
  for (const name of ['Prototype spec exists', 'State coverage markers present']) {
    assert.equal(report.checks.find(check => check.name === name)?.passed, false, `normal QA still enforces ${name}`);
  }
}
function absent(path) {
  let found = false;
  try { lstatSync(join(root, path)); found = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert.equal(found, false, `retired entry still exists (including dangling symlink): ${path}`);
}
function verifyRegistry(base = root) {
  for (const rel of [registryRel, '.claude/skill-os/input-modes.yaml', '.claude/skill-os/model-routing.yaml',
    '.claude/skill-os/codex-viability.yaml']) {
    assert.doesNotMatch(readFileSync(join(base, rel), 'utf8'), /muse-loop-orchestrate|muse-proto-gen/,
      `retired active registry: ${rel}`);
  }
}
function verifyCatalogGenerator() {
  const source = join(root, 'scripts/build-agent-context.py');
  const fixture = join(scratch, 'catalog');
  mkdirSync(fixture);
  // Execute the real generator with an isolated minimal inventory; never alter repository metadata.
  const code = `import importlib.util,json,pathlib,sys
spec=importlib.util.spec_from_file_location('catalog_builder',sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=pathlib.Path(sys.argv[2]);m.ROOT=r;m.SKILLS=r/'skills';m.ROUTING=r/'routes.yaml';m.VISIBILITY=r/'visibility.json'
for name in ['office','open-design','references']:
 p=m.SKILLS/('SKILL.md' if name=='office' else name+'/SKILL.md');p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text('---\\nname: '+name+'\\ndescription: bounded fixture\\n---\\n',encoding='utf-8')
m.ROUTING.write_text('project_skills: {}\\n',encoding='utf-8')
real=json.loads(pathlib.Path(sys.argv[3]).read_text())
v={'visible_additions':['office','open-design'],'hidden':[],'internal':['references'],'retired':real['retired']}
def render():
 m.VISIBILITY.write_text(json.dumps(v),encoding='utf-8');return m.render_catalog()
out=render()
assert 'replacement: \\x60none\\x60' in out
assert 'replacement: \\x60open-design\\x60' in out
assert 'SC-20260905-003' in out and 'RET-20260920-001' in out and 'RET-20260920-002' in out
t=v['retired'][1]
def rejected(field,value,reason):
 old=t[field];t[field]=value
 try:
  try: render()
  except ValueError as e: assert reason in str(e),str(e)
  else: raise AssertionError('invalid tombstone accepted: '+field+'='+str(value))
 finally: t[field]=old
for value in ['', 'none', 'missing-skill', 'muse-proto-gen', [], {}]: rejected('replacement',value,'invalid retired skill status or replacement')
for value in ['', 'RET-20260920', 'FAKE-20260920-001']: rejected('decision_id',value,'invalid retired skill decision or boundary')
rejected('name','open-design','retired skill remains active')
assert render()==out
print('PASS real catalog: null+RET and legacy SC; invalid replacement/ID/active retirement rejected; restored PASS')
`;
  const result = spawnSync('python3', ['-c', code, source, fixture,
    join(root, '.claude/skill-os/skill-visibility.json')], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  console.log(result.stdout.trim());
}
function verifySurface() {
  verifyRegistry();
  for (const name of retired) for (const rel of [`.claude/skills/office/${name}`, `.agents/skills/${name}`, `.claude/commands/${name}.md`]) absent(rel);
  for (const rel of ['muse-loop', 'constitution.md', 'traceability.md', 'scripts/check-muse-loop-sync.mjs']) absent(rel);
  for (const rel of ['.claude/settings.json', '.codex/hooks.json']) assert.doesNotMatch(readFileSync(join(root, rel), 'utf8'), /muse-loop-orchestrate|muse-proto-gen/);
  const visibility = JSON.parse(readFileSync(join(root, '.claude/skill-os/skill-visibility.json'), 'utf8'));
  for (const name of retired) {
    for (const key of ['visible', 'hidden', 'internal']) assert.ok(!visibility[key]?.includes(name), `${name} remains ${key}`);
    const tombstone = visibility.retired?.find(entry => entry.name === name);
    assert.equal(tombstone?.status, 'retired-unavailable', `${name} needs discovery tombstone`);
    assert.ok(!tombstone.replacement || tombstone.replacement === 'none', 'retirement has no automatic replacement');
  }
  const catalog = readFileSync(join(root, '.claude/skill-os/generated/skill-catalog.md'), 'utf8');
  assert.doesNotMatch(catalog, /^\| `(?:muse-loop-orchestrate|muse-proto-gen)` /m);
  for (const name of retired) assert.ok(catalog.includes('`' + name + '` — `retired-unavailable`'));
  for (const rel of ['.claude/agents/muse-proto-judge.md', '.codex/agents/muse-proto-judge.toml']) assert.ok(existsSync(join(root, rel)), 'independent judge retained');
  // Shared design safeguards formerly checked by check-muse-loop-sync must survive its deletion.
  const htmlSkill = readFileSync(join(root, '.claude/skills/office/html-prototype/SKILL.md'), 'utf8');
  for (const needle of ['AI Slop 防火墙', 'DECISION: D-']) assert.ok(htmlSkill.includes(needle), needle);
  const tokens = readFileSync(join(root, '.claude/skills/office/references/html-prototype-tokens.md'), 'utf8');
  for (const needle of ['FILE_END: html-prototype-tokens.md', '思考中', '低置信', '拒答', '部分完成', 'Steer',
    '幻觉兜底', 'Agent 执行中', 'prefers-reduced-motion']) assert.ok(tokens.includes(needle), needle);
}
try {
  for (const rel of [hookRel, qaRel, registryRel, '.claude/hooks/lib/project-substrate.mjs',
    '.claude/hooks/lib/event-attestation.mjs', '.claude/hooks/lib/project-read-grants.mjs', '.claude/hooks/lib/harness.mjs',
    '.codex/codex-hook-adapter.mjs', '.claude/skill-os/input-modes.yaml', '.claude/skill-os/model-routing.yaml',
    '.claude/skill-os/codex-viability.yaml']) copy(rel);
  mkdirSync(join(scratch, 'projects'));
  mkdirSync(dirname(htmlPath));
  writeFileSync(htmlPath, '<!doctype html><html><body><!-- DECISION: D-001 --><!-- FIX: UX-01 --><!-- 改动区 START --><!-- 保持区 START -->'
    + ['idle', 'loading', 'success', 'empty', 'error'].map(state => `<p data-prototype-state="${state}">${'Realistic product content. '.repeat(4)}</p>`).join('')
    + '<div data-demo-node="node-01"></div></body></html>');
  verifyRoutes();
  verifyAdapter();
  verifyRetiredQa();
  assert.equal(existsSync(join(scratch, 'qa/qa-results.json')), false, 'retired mode writes no QA output');
  verifyNormalQa();
  verifySurface();
  verifyCatalogGenerator();
  console.log('PASS retired routes + real Codex adapter; independent direct/HEAVY/fail-open; QA modes/static checks; registries/aliases/shared safeguards');
  console.log('NOTE QA browser availability is not asserted by this fixture; normal static rules and mode selection are asserted.');
  if (process.argv.includes('--mutation')) {
    const hookPath = join(scratch, hookRel);
    const original = readFileSync(hookPath, 'utf8');
    const guard = /  if \(\['muse-loop-orchestrate', 'muse-proto-gen'\]\.includes\(retiredName\)\) \{[\s\S]*?\n  \}\n/;
    assert.match(original, guard);
    writeFileSync(hookPath, original.replace(guard, ''));
    assert.throws(verifyRoutes, /retired dispatch: \/muse-loop-orchestrate/);
    writeFileSync(hookPath, original);
    verifyRoutes();
    console.log('PASS mutation: actual route refusal removed -> exact retired-dispatch FAIL -> restored PASS');
    const qaPath = join(scratch, qaRel);
    const originalQa = readFileSync(qaPath, 'utf8');
    const qaGuard = /if \(explicitMode\?\.toLowerCase\(\) === "muse-proto-gen"\) \{[\s\S]*?\n\}\n/;
    assert.match(originalQa, qaGuard);
    writeFileSync(qaPath, originalQa.replace(qaGuard, ''));
    assert.throws(verifyRetiredQa, /retired QA mode must exit 2/);
    writeFileSync(qaPath, originalQa);
    verifyRetiredQa();
    console.log('PASS mutation: actual QA refusal removed -> exact exit-code FAIL -> restored PASS');
    const registryPath = join(scratch, registryRel);
    const registry = readFileSync(registryPath, 'utf8');
    writeFileSync(registryPath, registry + '\n  resurrected_loop:\n    invoke: "/muse-loop-orchestrate"\n    triggers: ["muse loop"]\n');
    assert.throws(() => verifyRegistry(scratch), /retired active registry/);
    writeFileSync(registryPath, registry);
    verifyRegistry(scratch);
    console.log('PASS mutation: retired registry dependency restored -> exact registry FAIL -> restored PASS');
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
