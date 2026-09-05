#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHECKER = join(ROOT, 'scripts/check-agent-context.mjs');
const fixturePaths = [
  'AGENTS.md', 'CLAUDE.md', 'CONTEXT.md',
  '.claude/skill-os/crm-profile.md',
  '.claude/agents/plan-agent.md',
  '.claude/agents/orchestrator.md',
  '.claude/skills/office',
  '.claude/skill-os/agent-root-kernel.json',
  '.claude/skill-os/agent-context-manifest.json',
  '.claude/skill-os/agent-context-state.json',
  '.claude/skill-os/skill-visibility.json',
  '.claude/skill-os/model-routing.yaml',
  '.claude/skill-os/skill-routing-map.yaml',
  '.claude/skill-os/input-modes.yaml',
  '.claude/skill-os/extraction-bar.md',
  '.claude/skill-os/correction-attribution.md',
  '.claude/skill-os/routing-chain-check.md',
  '.claude/skill-os/runtime',
  '.claude/skill-os/generated',
  'memory/semantic/promoted-facts.yaml',
  'memory/semantic/static-fallback-allowlist.txt',
  'memory/README.md',
  'scripts/build-agent-context.py',
  'scripts/check-agent-context.mjs',
  '.githooks/commit-msg',
];

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'agent-context-'));
  for (const rel of fixturePaths) cpSync(join(ROOT, rel), join(dir, rel), { recursive: true });
  return dir;
}

function run(dir) {
  return spawnSync(process.execPath, [CHECKER, '--root', dir], { encoding: 'utf8' });
}

function mutate(name, edit, expected) {
  const dir = fixture();
  edit(dir);
  const result = run(dir);
  assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
  assert.match(`${result.stdout}${result.stderr}`, expected, `${name} failed for the wrong reason`);
  console.log(`PASS mutation: ${name}`);
}

const clean = run(fixture());
assert.equal(clean.status, 0, `clean compatibility fixture must pass\n${clean.stdout}${clean.stderr}`);
console.log('PASS clean compatibility fixture');

{
  const dir = fixture();
  const promoted = join(dir, 'memory/semantic/promoted-facts.yaml');
  writeFileSync(promoted, readFileSync(promoted, 'utf8').replace('CRM objects use stable IDs', 'CRM objects use fixture-stable IDs'));
  const synced = spawnSync('python3', [join(dir, 'scripts/build-agent-context.py'), 'sync'], { cwd: dir, encoding: 'utf8' });
  assert.equal(synced.status, 0, `single projection writer failed\n${synced.stdout}${synced.stderr}`);
  assert.equal(run(dir).status, 0, 'single projection writer left the fixture inconsistent');
  for (const path of ['CLAUDE.md', 'AGENTS.md', '.claude/skill-os/generated/static-fallback.md']) {
    assert.match(readFileSync(join(dir, path), 'utf8'), /CRM objects use fixture-stable IDs/, `${path} was not updated by the single writer`);
  }
  console.log('PASS single projection writer updates generated + both roots consistently');
}

for (const fact of [String.raw`Use regex \d+ for integer IDs`, String.raw`Keep literal \n in shell examples`]) {
  const dir = fixture();
  const promoted = join(dir, 'memory/semantic/promoted-facts.yaml');
  writeFileSync(promoted, readFileSync(promoted, 'utf8').replace('"CRM objects use stable IDs"', () => JSON.stringify(fact)));
  const synced = spawnSync('python3', [join(dir, 'scripts/build-agent-context.py'), 'sync'], { cwd: dir, encoding: 'utf8' });
  assert.equal(synced.status, 0, `literal fact projection failed: ${fact}\n${synced.stdout}${synced.stderr}`);
  for (const path of ['CLAUDE.md', 'AGENTS.md', '.claude/skill-os/generated/static-fallback.md']) {
    assert.ok(readFileSync(join(dir, path), 'utf8').includes(fact), `${path} interpreted a canonical fact escape: ${fact}`);
  }
  assert.equal(run(dir).status, 0, `literal fact left inconsistent projections: ${fact}`);
}
console.log('PASS real projection writer preserves literal backslashes in both roots and generated fallback');

{
  const codeRoot = fixture();
  const memoryRoot = mkdtempSync(join(tmpdir(), 'agent-context-memory-'));
  const semantic = join(memoryRoot, 'memory/semantic');
  mkdirSync(semantic, { recursive: true });
  const fact = 'Cross-checkout writer keeps governed fallback projections atomic';
  writeFileSync(join(semantic, 'static-fallback-allowlist.txt'), 'SC-cross-checkout\n');
  writeFileSync(join(semantic, 'promoted-facts.yaml'), 'version: 1\nfacts:\n');
  writeFileSync(join(semantic, 'reviews.jsonl'), '');
  writeFileSync(join(semantic, 'candidates.jsonl'), `${JSON.stringify({
    id: 'SC-cross-checkout', created_at: new Date().toISOString(), domain: 'skill-rule', fact,
    confidence: 'high', evidence: 'test fixture', scope: 'framework', reviewer: 'test',
    proposed_stable: true, status: 'CANDIDATE',
  })}\n`);
  const promoted = spawnSync('python3', [join(ROOT, 'memory/scripts/consolidate_memory.py'), '--promote-ready', '--json'], {
    cwd: codeRoot,
    encoding: 'utf8',
    env: { ...process.env, MEMORY_ROOT: memoryRoot, AGENT_CONTEXT_CODE_ROOT: codeRoot },
  });
  assert.equal(promoted.status, 0, `cross-checkout promotion writer failed\n${promoted.stdout}${promoted.stderr}`);
  assert.deepEqual(JSON.parse(promoted.stdout).actions.promoted, ['SC-cross-checkout']);
  for (const path of ['CLAUDE.md', 'AGENTS.md', '.claude/skill-os/generated/static-fallback.md']) {
    assert.match(readFileSync(join(codeRoot, path), 'utf8'), new RegExp(fact), `${path} missed the cross-checkout promotion`);
  }
  assert.match(readFileSync(join(semantic, 'promoted-facts.yaml'), 'utf8'), /SC-cross-checkout/);
  console.log('PASS real promotion writer separates memory root from projection checkout');
}

{
  const codeRoot = fixture();
  const memoryRoot = mkdtempSync(join(tmpdir(), 'agent-context-memory-rollback-'));
  const semantic = join(memoryRoot, 'memory/semantic');
  mkdirSync(semantic, { recursive: true });
  writeFileSync(join(semantic, 'static-fallback-allowlist.txt'), 'SC-rollback\n');
  writeFileSync(join(semantic, 'promoted-facts.yaml'), 'version: 1\nfacts:\n');
  writeFileSync(join(semantic, 'reviews.jsonl'), '');
  writeFileSync(join(semantic, 'candidates.jsonl'), `${JSON.stringify({
    id: 'SC-rollback', created_at: new Date().toISOString(), domain: 'skill-rule',
    fact: 'Injected install failures restore every projection preimage', confidence: 'high',
    evidence: 'test fixture', scope: 'framework', reviewer: 'test', proposed_stable: true,
    status: 'CANDIDATE',
  })}\n`);
  const surfaces = [
    join(semantic, 'promoted-facts.yaml'),
    ...['CLAUDE.md', 'AGENTS.md', '.claude/skill-os/generated/skill-catalog.md',
      '.claude/skill-os/generated/static-fallback.md'].map((path) => join(codeRoot, path)),
  ];
  const before = new Map(surfaces.map((path) => [path, readFileSync(path)]));
  const failed = spawnSync('python3', [join(ROOT, 'memory/scripts/consolidate_memory.py'), '--promote-ready', '--json'], {
    cwd: codeRoot,
    encoding: 'utf8',
    env: {
      ...process.env, MEMORY_ROOT: memoryRoot, AGENT_CONTEXT_CODE_ROOT: codeRoot,
      AGENT_CONTEXT_TEST_FAIL_AFTER_REPLACE: '2',
    },
  });
  assert.notEqual(failed.status, 0, 'injected projection install failure unexpectedly succeeded');
  assert.match(`${failed.stdout}${failed.stderr}`, /injected projection install failure/);
  for (const path of surfaces) {
    assert.deepEqual(readFileSync(path), before.get(path), `${path} was not restored to its preimage`);
  }
  console.log('PASS injected projection install failure restores promoted fact and all projection preimages');
}

mutate('delete K10', (dir) => {
  const p = join(dir, '.claude/skill-os/agent-root-kernel.json');
  const data = JSON.parse(readFileSync(p)); data.obligations.pop(); writeFileSync(p, JSON.stringify(data));
}, /K obligations/);

mutate('delete pointer target', (dir) => {
  const p = join(dir, '.claude/skill-os/agent-context-manifest.json');
  const data = JSON.parse(readFileSync(p)); data.entries[0].target = '.claude/skill-os/generated/missing.md'; writeFileSync(p, JSON.stringify(data));
}, /target missing/);

mutate('delete pointer trigger', (dir) => {
  const p = join(dir, '.claude/skill-os/agent-context-manifest.json');
  const data = JSON.parse(readFileSync(p)); data.entries[0].leading_words = []; writeFileSync(p, JSON.stringify(data));
}, /no leading_words/);

mutate('delete FILE_END', (dir) => {
  const p = join(dir, '.claude/skill-os/runtime/project-session.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/<!-- FILE_END:[^>]+-->\n?/, ''));
}, /lacks FILE_END/);

mutate('canonical SF changes without projection', (dir) => {
  const p = join(dir, 'memory/semantic/promoted-facts.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('CRM objects use stable IDs', 'CRM objects use immutable IDs'));
}, /Static Fallback canonical body drift/);

mutate('one root SF projection drifts', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('CRM objects use stable IDs', 'CRM objects use changing IDs'));
}, /AGENTS\.md Static Fallback projection drift/);

mutate('Codex model prose restores minimal', (dir) => {
  const p = join(dir, '.claude/skill-os/model-routing.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('xhigh>high>medium>low', 'xhigh>high>medium>minimal'));
}, /effort order contradicts/);

mutate('Plan condition disappears', (dir) => {
  const p = join(dir, '.claude/agents/plan-agent.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('明确阶段依赖', 'ordered work'));
}, /phase-dependency trigger/);

mutate('catalog loses a skill', (dir) => {
  const p = join(dir, '.claude/skill-os/generated/skill-catalog.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/^\| `careful`.*\n/m, ''));
}, /skill catalog coverage drift/);

mutate('retirement tombstone metadata disappears', (dir) => {
  const p = join(dir, '.claude/skill-os/skill-visibility.json');
  const data = JSON.parse(readFileSync(p)); data.retired = []; writeFileSync(p, JSON.stringify(data));
}, /required figma-layer retirement tombstone missing/);

mutate('generated catalog loses retirement tombstone', (dir) => {
  const p = join(dir, '.claude/skill-os/generated/skill-catalog.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/^- `figma-layer`.*\n/m, ''));
}, /skill catalog lacks retired tombstone/);

mutate('pointer cycle', (dir) => {
  const p = join(dir, '.claude/skill-os/agent-context-manifest.json');
  const data = JSON.parse(readFileSync(p)); data.entries[0].target = '.claude/skill-os/agent-context-manifest.json'; writeFileSync(p, JSON.stringify(data));
}, /pointer cycle/);

mutate('second-hop runtime module', (dir) => {
  const p = join(dir, '.claude/skill-os/runtime/project-session.md');
  writeFileSync(p, readFileSync(p, 'utf8') + '\nCONTEXT_TARGET: .claude/skill-os/runtime/long-session.md\n');
}, /second-hop/);

mutate('mega-module', (dir) => {
  const p = join(dir, '.claude/skill-os/runtime/project-session.md');
  writeFileSync(p, readFileSync(p, 'utf8') + 'x'.repeat(17_000));
}, /mega-module/);

mutate('root loses catalog loader', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('.claude/skill-os/generated/skill-catalog.md', 'catalog-removed'));
}, /AGENTS\.md lacks skill catalog loader/);

mutate('root loses bounded classification loading', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('For name/route discovery, the catalog is sufficient.',
    'For discovery, use whatever nearby files look useful.'));
}, /AGENTS\.md K10 missing required semantic pattern/);

mutate('office graph loading becomes unconditional', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '实际执行 skill 时读取 `input-modes.yaml`；仅用户选择 Workflow 或要求继续流程时读取',
    '每次路由或分类都读取 `input-modes.yaml`；每次都读取',
  ));
}, /office graph loading is not bounded/);

mutate('office wizard loading becomes unconditional', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '其他 skill 的共享规范到此为止，无需读取向导文件。',
    '所有 skill 都必须继续读取向导文件。',
  ));
}, /office wizard loading is not bounded/);

mutate('open-design handoff drops requirement bodies', (dir) => {
  const p = join(dir, '.claude/skills/office/open-design/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('每条稳定 ID 必须与其完整原文一起传递；只有 ID 的清单不是需求正文。',
    '只传稳定 ID 即可。'));
}, /does not preserve ID plus complete source text/);

mutate('page decision skips its contract owner', (dir) => {
  const p = join(dir, '.claude/skill-os/runtime/page-context.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/只判断该交接[^\n]+\n/, ''));
}, /page-context lacks decision-only contract loading boundary/);

mutate('restore unconditional root cross-read', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8') + '\n## Mandatory Startup Context\nRead `CLAUDE.md` before work.\n');
}, /root cross-read/);

mutate('one root loses HITL approval obligation', (dir) => {
  const p = join(dir, 'CLAUDE.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    /<!-- K3:START -->[\s\S]*?<!-- K3:END -->/,
    (block) => block.replace(/approval/gi, 'consent'),
  ));
}, /CLAUDE\.md K3 missing required term approval/);

mutate('STOP discovery stops before naming the skill', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('name the exact matching catalog skill', 'consult the catalog'));
}, /K4 missing exact skill discovery obligation/);

mutate('HITL wording keeps tokens but reverses the decision', (dir) => {
  const p = join(dir, 'CLAUDE.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    'ask one concise plain-text question\nand wait.',
    'choose a default without a user response. Human Gate, structured, and user response remain documented.',
  ));
}, /K7 contains forbidden contradiction/);

mutate('framework wording keeps tokens but permits edits', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    'Treat `framework/` as **read-only** template source.',
    'Treat `framework/` as **read-only** template source, but framework/ may be edited.',
  ));
}, /K6 contains forbidden contradiction/);

mutate('approval wording keeps tokens but bypasses approval', (dir) => {
  const p = join(dir, 'CLAUDE.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    'requires real user **approval**',
    'requires real user **approval**, but Supervisor execution may proceed without approval',
  ));
}, /K3 contains forbidden contradiction/);

{
  const dir = fixture();
  const msg = join(dir, 'COMMIT_MSG');
  writeFileSync(msg, 'test: staged snapshot gate\n');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  assert.equal(spawnSync('git', ['add', '-A'], { cwd: dir }).status, 0);
  const validRoot = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  const contradicted = validRoot.replace(
    'Treat `framework/` as **read-only** template source.',
    'Treat `framework/` as **read-only** template source, but framework/ may be edited.',
  );
  writeFileSync(join(dir, 'AGENTS.md'), contradicted);
  let result = spawnSync(join(dir, '.githooks/commit-msg'), [msg], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, `worktree-only contradiction must not poison staged validation\n${result.stdout}${result.stderr}`);
  assert.equal(spawnSync('git', ['add', 'AGENTS.md'], { cwd: dir }).status, 0);
  writeFileSync(join(dir, 'AGENTS.md'), validRoot);
  result = spawnSync(join(dir, '.githooks/commit-msg'), [msg], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'staged contradiction must fail even when the worktree is valid');
  assert.match(`${result.stdout}${result.stderr}`, /K1-K10/, 'staged contradiction failed for the wrong reason');
  mkdirSync(join(dir, '.git'), { recursive: true });
  writeFileSync(join(dir, '.git/MERGE_HEAD'), '0000000000000000000000000000000000000000\n');
  result = spawnSync(join(dir, '.githooks/commit-msg'), [msg], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'MERGE_HEAD must not bypass staged agent-context validation');
  console.log('PASS commit gate validates staged index, not worktree');
}

for (const path of ['CONTEXT.md', '.claude/skill-os/crm-profile.md']) {
  mutate(`restore missing CRM pointer in ${path}`, (dir) => {
    const target = join(dir, path);
    writeFileSync(target, readFileSync(target, 'utf8') + '\n读取 component-map.md。\n');
  }, /missing CRM component-map startup pointer/);
}
mutate('CRM rule decision resumes design-asset reads', (dir) => {
  const target = join(dir, '.claude/skill-os/crm-profile.md');
  writeFileSync(target, readFileSync(target, 'utf8').replace('不继续读取设计', '继续读取设计'));
}, /decision-only asset-read boundary/);
mutate('CRM design silently ignores missing mapping input', (dir) => {
  const target = join(dir, '.claude/skill-os/crm-profile.md');
  writeFileSync(target, readFileSync(target, 'utf8').replace('停止并索取', '跳过并默认'));
}, /real design missing-input gate/);
assert.equal(run(fixture()).status, 0, 'restored CRM contract must pass');
console.log('PASS agent-context proof-it-bites 26/26 + CRM pointer/boundary 4/4 + projection rollback + staged-index/merge gate');
