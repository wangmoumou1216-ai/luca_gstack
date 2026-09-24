#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  '.claude/agents/references/plan-engineering-modes.md',
  '.claude/agents/references/plan-design-guidance.md',
  '.claude/agents/references/plan-assertion-examples.md',
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
  'framework-audit/2026-09-21-context-case-extract.md',
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

const EXPECTED_MUTATIONS = 105;
let mutationCount = 0;
function mutate(name, edit, expected) {
  const dir = fixture();
  edit(dir);
  const result = run(dir);
  assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
  assert.match(`${result.stdout}${result.stderr}`, expected, `${name} failed for the wrong reason`);
  mutationCount += 1;
  console.log(`PASS mutation: ${name}`);
}

const clean = run(fixture());
assert.equal(clean.status, 0, `clean compatibility fixture must pass\n${clean.stdout}${clean.stderr}`);
console.log('PASS clean compatibility fixture');

const contextIndexPath = '.claude/skill-os/generated/context-index.md';
const indexBody = readFileSync(join(ROOT, contextIndexPath), 'utf8');
const indexEntries = JSON.parse(indexBody.match(/```json\n([\s\S]*?)\n```/)[1]);
const manifestEntries = JSON.parse(readFileSync(join(ROOT, '.claude/skill-os/agent-context-manifest.json'), 'utf8')).entries;
const projectedFields = ['id', 'obligation_ids', 'runtime', 'leading_words', 'condition', 'load_before',
  'target', 'contains', 'loader', 'read_to_end', 'fallback', 'truth_owner'];
assert.deepEqual(indexEntries, manifestEntries.map(entry => Object.fromEntries(projectedFields
  .filter(key => key in entry && (key !== 'truth_owner' || entry[key] !== entry.target))
  .map(key => [key, entry[key]]))),
  'agent index must preserve every operational field of every entry');
assert.ok(Buffer.byteLength(indexBody) < readFileSync(join(ROOT, '.claude/skill-os/agent-context-manifest.json')).length,
  'agent projection must be smaller than its machine source');
console.log('PASS complete operational projection is smaller than the manifest');

function changeIndex(dir, edit) {
  const path = join(dir, contextIndexPath);
  const text = readFileSync(path, 'utf8');
  const projected = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);
  edit(projected);
  writeFileSync(path, text.replace(/```json\n[\s\S]*?\n```/, () => `\`\`\`json\n${JSON.stringify(projected)}\n\`\`\``));
}
mutate('index drops a semantic condition', dir => changeIndex(dir, rows => { rows[0].condition = ''; }), /context index.*drift/);
mutate('index moves the consumption deadline', dir => changeIndex(dir, rows => { rows[0].load_before = 'after execution'; }), /context index.*drift/);
mutate('index drops a failure posture', dir => changeIndex(dir, rows => { delete rows[0].fallback; }), /context index.*drift/);
mutate('index omits a conditional entry', dir => changeIndex(dir, rows => { rows.pop(); }), /context index.*drift/);
mutate('index permits partial authority reads', dir => changeIndex(dir, rows => { rows[0].read_to_end = false; }), /context index.*drift/);
mutate('index drops a non-default truth owner', dir => changeIndex(dir, rows => { delete rows.find(row => row.truth_owner).truth_owner; }), /context index.*drift/);
mutate('root loses the generated index loader', dir => {
  const path = join(dir, 'AGENTS.md');
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll(contextIndexPath, '.claude/skill-os/generated/unknown-index.md'));
}, /lacks conditional context index loader/);
mutate('new manifest field cannot silently disappear from projection', dir => {
  const path = join(dir, '.claude/skill-os/agent-context-manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.entries[0].new_safety_condition = 'must be classified before projection';
  writeFileSync(path, JSON.stringify(manifest));
}, /unclassified manifest field/);
mutate('root mistakes three reads for a Plan trigger', dir => {
  const path = join(dir, 'AGENTS.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('≥ 3 files created or modified', '≥ 3 files'));
}, /Plan file trigger must specify creation or modification/);
mutate('workflow manifest bypasses the static-view owner', dir => {
  const p = join(dir, '.claude/skill-os/agent-context-manifest.json');
  const data = JSON.parse(readFileSync(p));
  data.entries.find(entry => entry.id === 'workflow-mode').target = '.claude/skill-os/input-modes.yaml';
  writeFileSync(p, JSON.stringify(data));
}, /workflow-mode must keep YAML truth_owner and runtime loading owner separate/);
mutate('selected input-mode view disappears', dir => {
  rmSync(join(dir, '.claude/skill-os/generated/input-modes/auto.json'));
}, /generated input-mode closed set drift/);
mutate('extra input-mode view expands the approved set', dir => {
  writeFileSync(join(dir, '.claude/skill-os/generated/input-modes/unapproved.json'), '{}\n');
}, /generated input-mode closed set drift/);
mutate('selected input-mode contract loses nested semantics', dir => {
  const p = join(dir, '.claude/skill-os/generated/input-modes/design-brief.json');
  const data = JSON.parse(readFileSync(p)); delete data.contract.modes_detail;
  writeFileSync(p, JSON.stringify(data));
}, /generated input-mode semantic projection drift/);
mutate('selected input-mode view lies about source binding', dir => {
  const p = join(dir, '.claude/skill-os/generated/input-modes/auto.json');
  const data = JSON.parse(readFileSync(p)); data.source_sha256 = '0'.repeat(64);
  writeFileSync(p, JSON.stringify(data));
}, /input-mode view binding/);
mutate('input-mode source adds an unapproved key', dir => {
  const p = join(dir, '.claude/skill-os/input-modes.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('governance_tools:\n', 'governance_tools:\n  unapproved-skill:\n    modes: {}\n'));
}, /generated input-mode semantic projection drift/);
mutate('input-mode source accepts an ambiguous duplicate group', dir => {
  const p = join(dir, '.claude/skill-os/input-modes.yaml');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\nskills: {}\n`);
}, /generated input-mode semantic projection drift/);
mutate('root drops selected input-mode loading', dir => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('.claude/skill-os/generated/input-modes/<key>.json', 'all-inputs.json'));
}, /lacks selected input-mode loading contract/);
mutate('office restores whole-table default loading', dir => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('先完整读取\n`.claude/skill-os/runtime/workflow-mode.md`，再只读取所选 skill 的完整静态视图',
    '直接完整读取 `.claude/skill-os/input-modes.yaml`，再读取'));
}, /office graph loading is not bounded/);
mutate('office drops the learning action owner', dir => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('references/learning-actions.md', 'inline commands'));
}, /office learning triggers/);
mutate('plan drops conditional design guidance', dir => {
  const p = join(dir, '.claude/agents/plan-agent.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('.claude/agents/references/plan-design-guidance.md', 'design guidance omitted'));
}, /plan contract lacks conditional/);
mutate('plan design guidance drops mandatory design-output gate', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    'When a design chain proceeds from `design-brief` to implementation, the intervening design-output\n'
      + 'Phase is mandatory: it must not be omitted, merged with implementation, or bypassed by proceeding\n'
      + 'directly to implementation.\n',
    '',
  ));
}, /mandatory design-output\/no-skip/);
mutate('plan appends an optional design-output contradiction outside the normative block', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '<!-- FILE_END: agents/references/plan-design-guidance.md -->',
    'After design-brief, the design-output Phase is optional.\n\n'
      + '<!-- FILE_END: agents/references/plan-design-guidance.md -->',
  ));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the exact mandatory gate in an obsolete note outside the normative block', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  const gate = 'When a design chain proceeds from `design-brief` to implementation, the intervening design-output\n'
    + 'Phase is mandatory: it must not be omitted, merged with implementation, or bypassed by proceeding\n'
    + 'directly to implementation.\n';
  writeFileSync(p, readFileSync(p, 'utf8').replace(gate, '')
    .replace('<!-- FILE_END: agents/references/plan-design-guidance.md -->',
      `<!-- obsolete example\n${gate}-->\n\n<!-- FILE_END: agents/references/plan-design-guidance.md -->`));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the entire exact ordered chain in an obsolete HTML comment', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<!-- obsolete full section\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n-->'));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the entire exact ordered chain in a Markdown code fence', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '~~~markdown\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n~~~'));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the ordered chain in a three-space-indented CommonMark fence', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '   ~~~markdown\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n   ~~~'));
}, /mandatory design-output\/no-skip/);
mutate('plan uses an unlike fence marker to fake closure before the ordered chain', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '```markdown\n~~~\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n```'));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the ordered chain in a CommonMark script raw HTML block', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<script type="text/plain">\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</script>'));
}, /mandatory design-output\/no-skip/);
mutate('plan uses a spaced fake script closer before the ordered chain', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<script>\n</script >\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</script>'));
}, /mandatory design-output\/no-skip/);
mutate('plan composes a cross-tag type-1 closer with a blank-terminated HTML block', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<script>\n</pre>\n<div>\n</script>\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</div>'));
}, /mandatory design-output\/no-skip/);
mutate('plan uses a CRLF-normalized end-of-line script opener', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<script\r\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</script>'));
}, /mandatory design-output\/no-skip/);
mutate('plan injects a non-Markdown C0 control character before the ordered chain', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('## Ordered design chain', '\u000b## Ordered design chain'));
}, /mandatory design-output\/no-skip/);
for (const [name, separator] of [['LINE SEPARATOR', '\u2028'], ['PARAGRAPH SEPARATOR', '\u2029']]) {
  mutate(`plan uses Unicode ${name} as a false Markdown line boundary`, dir => {
    const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('## Ordered design chain', `${separator}## Ordered design chain`));
  }, /mandatory design-output\/no-skip/);
}
mutate('plan hides the ordered-chain heading after a type-7 tag with quoted greater-than', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<x-note data-hidden=">">\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</x-note>'));
}, /mandatory design-output\/no-skip/);
mutate('plan hides the ordered-chain heading in a blank-terminated raw HTML block', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8')
    .replace('## Ordered design chain', '<div hidden>\n## Ordered design chain')
    .replace('## Design output choice and authority', '## Design output choice and authority\n</div>'));
}, /mandatory design-output\/no-skip/);
for (const [name, whitespace] of [['NBSP', '\u00a0'], ['EM SPACE', '\u2003']]) {
  mutate(`plan uses ${name} as a false CommonMark blank line`, dir => {
    const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
    writeFileSync(p, readFileSync(p, 'utf8')
      .replace('## Ordered design chain', `<div>\n${whitespace}\n## Ordered design chain`)
      .replace('## Design output choice and authority', '## Design output choice and authority\n</div>'));
  }, /mandatory design-output\/no-skip/);
}
mutate('plan turns the ordered-chain heading into indented code', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('## Ordered design chain', '    ## Ordered design chain'));
}, /mandatory design-output\/no-skip/);
mutate('plan keeps no-skip sentence but permits direct implementation', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '## Design output choice and authority',
    'A plan may skip the design-output Phase and proceed directly from design-brief to implementation after recording an applicability assessment.\n\n## Design output choice and authority',
  ));
}, /mandatory design-output\/no-skip/);
mutate('plan keeps no-skip sentence but starts implementation directly from design-brief', dir => {
  const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '## Design output choice and authority',
    'Implementation may proceed directly from design-brief after an applicability note.\n\n## Design output choice and authority',
  ));
}, /mandatory design-output\/no-skip/);
for (const [name, contradiction] of [
  ['allows implementation immediately after design-brief',
    'The implementation phase is allowed to start immediately after design-brief.'],
  ['makes design-output optional before implementation',
    'The design-output phase is optional when implementation follows design-brief.'],
  ['uses an imperative straight-to-implementation bypass',
    'After design-brief, proceed straight to implementation.'],
]) {
  mutate(`plan keeps no-skip sentence but ${name}`, dir => {
    const p = join(dir, '.claude/agents/references/plan-design-guidance.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(
      '## Design output choice and authority',
      `${contradiction}\n\n## Design output choice and authority`,
    ));
  }, /mandatory design-output\/no-skip/);
}
mutate('CONTEXT loses live investigation discipline', dir => {
  const p = join(dir, 'CONTEXT.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('归因前先拉满样本矩阵', 'historical note removed'));
}, /CONTEXT historical extraction/);

for (const replacement of ['', 'none', 'missing-skill']) {
  mutate(`retirement rejects invalid replacement ${JSON.stringify(replacement)}`, dir => {
    const p = join(dir, '.claude/skill-os/skill-visibility.json');
    const data = JSON.parse(readFileSync(p));
    data.retired.find(entry => entry.name === 'muse-loop-orchestrate').replacement = replacement;
    writeFileSync(p, JSON.stringify(data));
  }, /invalid retired skill metadata/);
}
mutate('retirement rejects malformed local decision ID', dir => {
  const p = join(dir, '.claude/skill-os/skill-visibility.json');
  const data = JSON.parse(readFileSync(p));
  data.retired.find(entry => entry.name === 'muse-loop-orchestrate').decision_id = 'RET-no-authority';
  writeFileSync(p, JSON.stringify(data));
}, /invalid retired skill metadata/);

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
      '.claude/skill-os/generated/static-fallback.md', contextIndexPath].map((path) => join(codeRoot, path)),
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

mutate('Codex fixed preflight effort restores minimal', (dir) => {
  const p = join(dir, '.claude/skill-os/model-routing.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('preflight-agent: low', 'preflight-agent: minimal'));
}, /fixed preflight-agent effort must remain low/);

for (const [name, from, to, expected] of [
  ['common policy version drifts', '  version: 2\n  status: active', '  version: 1\n  status: active', /common model policy must be v2/],
  ['common policy is paused', '  status: active\n  scope: common', '  status: paused\n  scope: common', /common model policy must be active/],
  ['common policy scope becomes Codex-only', '  scope: common\n  roles:', '  scope: codex\n  roles:', /harness-neutral/],
  ['light role disappears', '    light: user-approved-lower-selection', '    lower: user-approved-lower-selection', /lacks light role/],
  ['mechanical scene stops using light', '      role: light\n      critical: false', '      role: anchor\n      critical: false', /mechanical scene must use light/],
  ['native quality gate mapping drifts', '      quality-gate: MR-004', '      quality-gate: MR-001', /quality-gate dispatch drift/],
  ['workflow Redteam mapping drifts', '        Redteam: MR-003', '        Redteam: MR-001', /workflow Redteam dispatch drift/],
  ['effort re-enters routing inputs', '  effort: user-owned-not-a-routing-input', '  effort: route-by-scene', /effort must not be a model-routing input/],
]) {
  mutate(name, (dir) => {
    const p = join(dir, '.claude/skill-os/model-routing.yaml');
    writeFileSync(p, readFileSync(p, 'utf8').replace(from, to));
  }, expected);
}

mutate('Codex regains a nested model policy', (dir) => {
  const p = join(dir, '.claude/skill-os/model-routing.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('\ncodex:\n', '\ncodex:\n  model_routing:\n    version: 2\n'));
}, /Codex contains a second model policy/);

mutate('Codex regains tier-to-effort routing', (dir) => {
  const p = join(dir, '.claude/skill-os/model-routing.yaml');
  writeFileSync(p, readFileSync(p, 'utf8').replace('\ncodex:\n', '\ncodex:\n  tier_to_effort:\n    light: low\n'));
}, /tier_to_effort must remain absent/);

mutate('Codex root routes by reasoning effort again', (dir) => {
  const p = join(dir, 'AGENTS.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    'Select a subagent model role',
    'Select subagent reasoning effort',
  ));
}, /model role selection independent from reasoning effort/);

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
    '仅用户选择 Workflow\n或要求继续流程时读取',
    '每次路由或分类都读取',
  ));
}, /office graph loading is not bounded/);

mutate('office wizard loading becomes unconditional', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '此时**不得读取** `references/office-wizard.md`。',
    '此时必须读取 `references/office-wizard.md`。',
  ));
}, /office wizard loading is not bounded/);

mutate('office wizard loses Codex native invocation', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('Codex 的 `$office`', 'Codex 的 office'));
}, /office wizard loading is not bounded/);

mutate('office wizard loses explicit natural-language invocation', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('或明确用自然语言要求进入/使用 office 向导', ''));
}, /office wizard loading is not bounded/);

mutate('office wizard appends a contradictory unconditional rule', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\n任何语境提到 office 都必须读取 references/office-wizard.md。\n`);
}, /office wizard loading is not bounded/);

mutate('office wizard contradiction reworded with a different quantifier', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\n任何时候提到 office 都必须读取 references/office-wizard.md。\n`);
}, /office wizard loading is not bounded/);

mutate('office wizard contradiction written in English', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\nAlways read references/office-wizard.md whenever office is mentioned.\n`);
}, /office wizard loading is not bounded/);

mutate('office wizard contradiction without backticks or an obligation verb', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\n凡涉及 office 的请求，读取 references/office-wizard.md 后再作答。\n`);
}, /office wizard loading is not bounded/);

mutate('office wizard mention drops the references/ prefix', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, `${readFileSync(p, 'utf8')}\n任何时候提到 office 都必须读取 office-wizard.md。\n`);
}, /office wizard loading is not bounded/);

// The count invariant cannot see this one: an existing sanctioned sentence rewritten from
// conditional to unconditional keeps the mention total at three. The conditionality anchor is
// what catches it.
mutate('office wizard review path is rewritten from conditional to unconditional', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '用户若明确要求审查',
    '无论用户是否提出要求，都应审查',
  ));
}, /office wizard loading is not bounded/);

// Neither the count nor a document-wide phrase search sees this: the governing sentence is gutted
// while the anchor phrase survives as a decoy elsewhere in the file. Only sentence-local gating does.
mutate('office wizard review rule is gutted while its anchor phrase survives as a decoy', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  const gutted = readFileSync(p, 'utf8').replace(
    '用户若明确要求审查 `references/office-wizard.md` 这个文件本身，则完整读取该文件作为审查对象，但除非同时调用向导入口，否则不执行其中流程。',
    '无论用户是否提出要求，都应完整读取并执行 `references/office-wizard.md` 这个文件本身。',
  );
  writeFileSync(p, gutted.replace('## Voice', '若明确要求审查历史归档时另行处理。\n\n## Voice'));
}, /office wizard loading is not bounded/);

// Keeps the gating word 才 in place while a universal quantifier negates the condition around it.
mutate('office wizard invocation gate is negated but the gate word is left in place', (dir) => {
  const p = join(dir, '.claude/skills/office/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(
    '当用户最新请求**实际调用 office 向导入口**',
    '无论用户最新请求是否**实际调用 office 向导入口**',
  ));
}, /office wizard loading is not bounded/);

mutate('open-design handoff drops requirement bodies', (dir) => {
  const p = join(dir, '.claude/skills/office/open-design/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('每条稳定 ID 必须与其完整原文一起传递；只有 ID 的清单不是需求正文。',
    '只传稳定 ID 即可。'));
}, /does not preserve ID plus complete source text/);

mutate('CandidateHint is allowed into Packet truth', (dir) => {
  const p = join(dir, '.claude/skills/office/design-brief/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('不得写入', '可写入'));
}, /transient CandidateHint and frozen-Packet binding boundary/);

mutate('NO_HINT blocks rather than continuing design-brief', (dir) => {
  const p = join(dir, '.claude/skills/office/design-brief/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('得到 `NO_HINT`，继续\n  design-brief', '得到 `NO_HINT`，停止\n  design-brief'));
}, /transient CandidateHint and frozen-Packet binding boundary/);

mutate('reference_only is renamed as a template derivative', (dir) => {
  const p = join(dir, '.claude/skills/office/design-brief/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('模板衍生', 'carrier delivery'));
}, /reference_only separate from template-derived carrier delivery/);

mutate('recover is allowed to enumerate project HTML', (dir) => {
  const p = join(dir, '.claude/skills/office/open-design/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('不全项目枚举 HTML', '可全项目枚举 HTML'));
}, /authority, scoped-recovery, carrier-profile, or Codex-probe boundary/);

mutate('Codex carrier is claimed before its probe', (dir) => {
  const p = join(dir, '.claude/skills/office/open-design/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll('拒绝或受控降级', '可直接执行'));
}, /authority, scoped-recovery, carrier-profile, or Codex-probe boundary/);

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
// A real denominator: `${n}/${n}` can never disagree with reality, so a silently
// deleted mutation case left no trace. This constant does disagree, and bites.
assert.equal(mutationCount, EXPECTED_MUTATIONS,
  `expected ${EXPECTED_MUTATIONS} mutation cases, ran ${mutationCount}`);
console.log(`PASS agent-context proof-it-bites ${mutationCount}/${EXPECTED_MUTATIONS} mutations + projection rollback + staged-index/merge gate`);
