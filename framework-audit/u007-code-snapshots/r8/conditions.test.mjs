import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, readdirSync,
  rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONDITION_IDS, materializeCondition } from './conditions.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ROOT_ENTRY = readFileSync(new URL('../../AGENTS.md', import.meta.url));
const REQUIRED = [
  'CONTEXT.md', '.claude/skill-os/generated/context-index.md',
  '.claude/skill-os/generated/skill-catalog.md', '.claude/agents/plan-agent.md',
  '.claude/skill-os/runtime/project-session.md', '.claude/skills/office/SKILL.md',
  '.claude/observability/scripts/get_rules.py', '.claude/observability/rules.yaml',
  '.claude/skill-os/agent-context-manifest.json',
  'scripts/build-agent-context.py', 'scripts/model-route.mjs', 'scripts/model-route-host.mjs',
  'memory/semantic/promoted-facts.yaml', 'memory/semantic/static-fallback-allowlist.txt',
  ...['_memroot', '_project', 'get_memory', 'search_memory', 'daily_governance',
    'consolidate_memory', 'check_memory_integrity', 'check_memory_health',
    'append_episode', 'propose_semantic', 'review_candidates', 'record_eval']
    .map(name => `memory/scripts/${name}.py`),
  ...['MODEL_ROUTING.md', 'agents/muse-proto-judge.toml', 'agents/preflight-agent.toml',
    'agents/quality-gate.toml', 'codex-hook-adapter.mjs', 'codex-source-guard-bootstrap.mjs',
    'codex-source-guard-loader.mjs', 'hook-source-integrity.mjs', 'host-launch-adapter.mjs',
    'host-launch-hook.mjs', 'model-route-hook.mjs', 'model-routing-bindings.example.json',
    'stop-integrity-failure.mjs', 'workflow-runner.mjs'].map(path => `.codex/${path}`),
];

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'tri-condition-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const sourceRoot = join(base, 'source'); mkdirSync(sourceRoot);
  const records = [];
  const add = (path, bytes, kind = 'file') => {
    mkdirSync(dirname(join(sourceRoot, path)), { recursive: true });
    if (kind === 'file') writeFileSync(join(sourceRoot, path), bytes);
    else symlinkSync(bytes, join(sourceRoot, path));
    records.push({ path, kind, bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
  };
  add('AGENTS.md', ROOT_ENTRY);
  for (const path of REQUIRED) add(path, `Frozen domain/rule material: ${path}\n`);
  add('.claude/skills/office/sample/SKILL.md', 'Domain owner uses stable keys.\n');
  add('.claude/skills/sample', 'office/sample', 'symlink-text-not-target');
  add('scripts/helper.mjs', 'export const marker = 7;\n');
  const sourceManifestPath = join(base, 'manifest.json');
  const save = () => writeFileSync(sourceManifestPath, JSON.stringify({ root: sourceRoot, tracked_sources: records }));
  save();
  return { base, sourceRoot, sourceManifestPath, records, add, save,
    build: (conditionId, name = conditionId) => materializeCondition({ conditionId, sourceRoot,
      sourceManifestPath, destination: join(base, name) }) };
}

function independentDigest(root, allowSourceLinks = false) {
  const rows = [];
  function walk(directory, prefix) {
    for (const name of readdirSync(directory)) {
      const path = prefix + name, full = join(directory, name), stat = lstatSync(full);
      if (allowSourceLinks && stat.isSymbolicLink()) {
        rows.push({ path, sha256: digest(readlinkSync(full)) }); continue;
      }
      assert.equal(stat.isSymbolicLink(), false, path);
      if (stat.isDirectory()) walk(full, path + '/');
      else rows.push({ path, sha256: digest(readFileSync(full)) });
    }
  }
  walk(root, '');
  const ordered = rows.map(row => row.path).sort().map(path => rows.find(row => row.path === path));
  return digest(JSON.stringify(ordered));
}

test('B builds real frozen bytes, expands internal aliases and returns a replayable digest', async t => {
  const f = fixture(t), result = await f.build('B');
  assert.deepEqual(CONDITION_IDS, ['B', 'T', 'S', 'I']);
  assert.deepEqual(readFileSync(join(result.root, 'AGENTS.md')), ROOT_ENTRY);
  assert.deepEqual(readFileSync(join(result.root, '.claude/skills/sample/SKILL.md')),
    readFileSync(join(f.sourceRoot, '.claude/skills/office/sample/SKILL.md')));
  assert.ok(result.allowedReadPaths.includes('.claude/skills/sample/SKILL.md'));
  assert.ok(!result.allowedReadPaths.includes('scripts/helper.mjs'));
  for (const binding of result.sourceBindings) {
    assert.equal(binding.copySha256, digest(readFileSync(join(result.root, binding.path))));
  }
  assert.equal(result.materialSha256, independentDigest(result.root));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  const same = await f.build('B', 'other-location');
  assert.equal(result.materialSha256, same.materialSha256, 'temporary paths cannot affect material identity');
  writeFileSync(join(same.root, 'CONTEXT.md'), 'changed copy');
  assert.notEqual(independentDigest(same.root), result.materialSha256);
  assert.equal(readFileSync(join(f.sourceRoot, 'CONTEXT.md'), 'utf8'), 'Frozen domain/rule material: CONTEXT.md\n');
});

test('S changes only its three declared root obligations, preserving every other source', async t => {
  const f = fixture(t), b = await f.build('B'), s = await f.build('S');
  assert.notEqual(s.materialSha256, b.materialSha256);
  const changed = s.sourceBindings.filter(x => x.copySha256 !== x.sourceSha256);
  assert.deepEqual(changed.map(x => x.path), ['AGENTS.md']);
  assert.deepEqual(changed[0].patch.map(x => x.id), ['K2', 'K4', 'K10-startup']);
  const before = ROOT_ENTRY.toString(), after = readFileSync(join(s.root, 'AGENTS.md'), 'utf8');
  for (const id of [1, 3, 5, 6, 7, 8, 9]) {
    const block = new RegExp(`<!-- K${id}:START -->[\\s\\S]*?<!-- K${id}:END -->`);
    assert.equal(after.match(block)[0], before.match(block)[0]);
  }
  assert.equal(after.slice(after.indexOf('4. Only with a verified project pin')),
    before.slice(before.indexOf('4. Only with a verified project pin')));
  assert.equal(s.complexity.units.entryObligationPatches, 3);
});

test('T and I compile without opening any baseline manifest or exposing baseline materials', async t => {
  const f = fixture(t);
  writeFileSync(f.sourceManifestPath, 'not JSON; must never be opened by T/I');
  const native = await f.build('T'), independent = await f.build('I');
  for (const item of [native, independent]) {
    assert.deepEqual(item.allowedReadPaths, ['AGENTS.md']);
    assert.deepEqual(readdirSync(item.root), ['AGENTS.md']);
    assert.equal(item.materialSha256, independentDigest(item.root));
    assert.equal(item.complexity.units.copiedSourceRecords, 0);
    assert.equal(item.complexity.actualTokens, null);
  }
  assert.notEqual(native.materialSha256, independent.materialSha256);
  assert.equal(native.complexity.units.conditionalHandoffMechanisms, 0);
  assert.equal(independent.complexity.units.conditionalHandoffMechanisms, 3);
});

test('excluded cases, answers, archive and evaluation files are neither opened nor copied', async t => {
  const f = fixture(t);
  // Deliberately absent: a builder that tries to read them must fail this test.
  for (const path of ['framework-audit/u004-cases/public/answers.json',
    '.claude/skill-os/private/secret.md', '.claude/skills/office/archive/old.md',
    '.claude/skill-os/hidden/secret.md', 'scripts/hidden-case.mjs',
    '.claude/skill-os/fixtures.jsonl', 'scripts/answers.json',
    '.claude/skill-os/developer-cases.json', '.claude/agents/private.md',
    '.claude/observability/observations.yaml', '.claude/observability/scripts/other.py',
    'scripts/test-example.mjs', 'scripts/run-agent-context-ab.mjs']) {
    f.records.push({ path, kind: 'file', bytes: 6, sha256: digest('poison') });
  }
  f.save();
  const b = await f.build('B');
  for (const path of b.complexity.excludedSourcePaths) {
    assert.ok(!existsSync(join(b.root, path)));
    assert.ok(!b.allowedReadPaths.includes(path));
  }
});

test('source drift refuses before creating destination; restored bytes build again', async t => {
  const f = fixture(t);
  await f.build('B', 'before');
  writeFileSync(join(f.sourceRoot, 'CONTEXT.md'), 'unreviewed edit');
  await assert.rejects(f.build('B', 'drift'), { code: 'SOURCE_DRIFT' });
  assert.ok(!existsSync(join(f.base, 'drift')));
  writeFileSync(join(f.sourceRoot, 'CONTEXT.md'), 'Frozen domain/rule material: CONTEXT.md\n');
  const restored = await f.build('B', 'restored');
  assert.equal(restored.materialSha256, independentDigest(restored.root));
});

test('existing destination directory, file and symlink are preserved', async t => {
  const f = fixture(t);
  for (const kind of ['dir', 'file', 'link']) {
    const dest = join(f.base, kind);
    if (kind === 'dir') { mkdirSync(dest); writeFileSync(join(dest, 'user-work'), 'keep'); }
    if (kind === 'file') writeFileSync(dest, 'keep');
    if (kind === 'link') symlinkSync(f.sourceRoot, dest);
    await assert.rejects(f.build('T', kind));
    assert.equal(lstatSync(dest).isSymbolicLink(), kind === 'link');
    if (kind === 'file') assert.equal(readFileSync(dest, 'utf8'), 'keep');
    if (kind === 'dir') assert.equal(readFileSync(join(dest, 'user-work'), 'utf8'), 'keep');
  }
});

test('traversal, absolute paths and duplicate source records are rejected', async t => {
  for (const path of ['../outside', '/absolute', 'scripts/../bad', 'scripts\\bad']) {
    const f = fixture(t);
    f.records.push({ path, kind: 'file', bytes: 1, sha256: digest('x') }); f.save();
    await assert.rejects(f.build('B'), { code: 'UNSAFE_PATH' });
  }
  const f = fixture(t); f.records.push({ ...f.records[0] }); f.save();
  await assert.rejects(f.build('B'), { code: 'DUPLICATE_SOURCE' });
});

test('external symlink and source-parent symlink cannot expand frozen read scope', async t => {
  const f = fixture(t);
  f.add('.claude/skills/external', '../../../outside', 'symlink-text-not-target'); f.save();
  await assert.rejects(f.build('B'), { code: 'SYMLINK_ESCAPE' });
  const g = fixture(t), external = join(g.base, 'external'); mkdirSync(external);
  writeFileSync(join(external, 'owner.md'), 'private');
  symlinkSync(external, join(g.sourceRoot, '.claude/agents/foreign'));
  g.records.push({ path: '.claude/agents/foreign/owner.md', kind: 'file', bytes: 7, sha256: digest('private') }); g.save();
  await assert.rejects(g.build('B'), { code: 'SOURCE_PARENT' });
});

test('unrepresented internal alias is reported, never followed or silently claimed copied', async t => {
  const f = fixture(t);
  f.add('.claude/skills/unavailable', '../../.agents/skills/unavailable', 'symlink-text-not-target'); f.save();
  const b = await f.build('B');
  assert.deepEqual(b.complexity.omittedLinks.map(x => x.path), ['.claude/skills/unavailable']);
  assert.ok(!existsSync(join(b.root, '.claude/skills/unavailable')));
  assert.ok(!b.sourceBindings.some(x => x.path === '.claude/skills/unavailable'));
});

test('absolute aliases and a regular-file record replaced by a symlink are rejected', async t => {
  const f = fixture(t);
  f.add('.claude/skills/absolute', f.sourceRoot, 'symlink-text-not-target'); f.save();
  await assert.rejects(f.build('B'), { code: 'SYMLINK_ESCAPE' });
  const g = fixture(t), context = join(g.sourceRoot, 'CONTEXT.md');
  rmSync(context); symlinkSync(join(g.sourceRoot, 'AGENTS.md'), context);
  await assert.rejects(g.build('B'), { code: 'SOURCE_KIND' });
});

test('S must match the startup boundary; a failed build leaves no partial condition', async t => {
  const f = fixture(t);
  const bytes = ROOT_ENTRY.toString().replace('4. Only with a verified project pin', '4. changed boundary');
  writeFileSync(join(f.sourceRoot, 'AGENTS.md'), bytes);
  Object.assign(f.records[0], { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) }); f.save();
  await assert.rejects(f.build('S'), { code: 'PATCH_CONTEXT' });
  assert.ok(!existsSync(join(f.base, 'S')));
});

test('source overlap and wrong source identity refuse without changing source', async t => {
  const f = fixture(t);
  await assert.rejects(materializeCondition({ conditionId: 'B', ...f,
    destination: join(f.sourceRoot, 'output') }), { code: 'SOURCE_DESTINATION_OVERLAP' });
  assert.ok(!existsSync(join(f.sourceRoot, 'output')));
  writeFileSync(f.sourceManifestPath, JSON.stringify({ root: f.base, tracked_sources: f.records }));
  await assert.rejects(f.build('B'), { code: 'MANIFEST_SCOPE' });
  assert.deepEqual(readFileSync(join(f.sourceRoot, 'AGENTS.md')), ROOT_ENTRY);
});

test('missing baseline owner, changed patch shape and invalid condition fail closed', async t => {
  const f = fixture(t);
  f.records.splice(f.records.findIndex(x => x.path === '.claude/agents/plan-agent.md'), 1); f.save();
  await assert.rejects(f.build('B'), { code: 'MISSING_BASELINE' });
  const g = fixture(t), bytes = 'unrecognized root';
  writeFileSync(join(g.sourceRoot, 'AGENTS.md'), bytes);
  Object.assign(g.records[0], { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) }); g.save();
  await assert.rejects(g.build('S'), { code: 'PATCH_CONTEXT' });
  await assert.rejects(g.build('X'), { code: 'CONDITION_ID' });
});

test('concurrent builds cannot overwrite a destination; material IDs remain stable', async t => {
  const f = fixture(t);
  const outcomes = await Promise.allSettled([f.build('T', 'shared'), f.build('I', 'shared')]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  const built = outcomes.find(x => x.status === 'fulfilled').value;
  assert.equal(built.id, 'T');
  assert.equal(built.materialSha256, independentDigest(built.root));
});

test('B/S copy the same required closure and native skill owners without activating hooks/config', async t => {
  const f = fixture(t);
  f.add('.claude/skills/office/sample/references/contract.md', 'original contract bytes\n');
  f.add('.claude/skills/office/sample/helper.py', 'raise RuntimeError("never execute")\n');
  // Existing machine aliases and active registrations are deliberately absent.
  for (const path of ['.agents/skills/foreign/SKILL.md', '.codex/hooks.json', '.codex/config.toml',
    'memory/scripts/not-frozen-helper.py']) {
    f.records.push({ path, kind: 'file', bytes: 6, sha256: digest('poison') });
  }
  f.save();
  const b = await f.build('B'), s = await f.build('S');
  const contents = result => result.sourceBindings.map(row => [row.path,
    row.path === 'AGENTS.md' ? 'intentional root patch' : row.copySha256]).sort();
  assert.deepEqual(contents(b), contents(s));
  for (const path of REQUIRED) assert.deepEqual(readFileSync(join(b.root, path)), readFileSync(join(f.sourceRoot, path)));
  const generated = b.sourceBindings.filter(row => row.kind === 'generated-native-skill-file');
  assert.ok(generated.length > 0);
  for (const row of generated) {
    assert.deepEqual(readFileSync(join(b.root, row.path)), readFileSync(row.source));
    assert.equal(row.sourceBytes, readFileSync(row.source).length);
    assert.equal(row.copyBytes, row.sourceBytes);
    assert.equal(row.patch.originalAliasRead, false);
  }
  assert.equal(readFileSync(join(b.root, '.agents/skills/office/sample/references/contract.md'), 'utf8'), 'original contract bytes\n');
  assert.ok(b.allowedReadPaths.includes('.agents/skills/office/sample/SKILL.md'));
  assert.ok(!b.allowedReadPaths.includes('.agents/skills/office/sample/helper.py'));
  assert.equal(existsSync(join(b.root, '.agents/skills/sample')), false);
  const discoveredOwners = generated.filter(row => row.path.endsWith('/SKILL.md'));
  assert.equal(new Set(discoveredOwners.map(row => row.source)).size, discoveredOwners.length,
    'nested owner bodies must occur exactly once in the native discovery tree');
  for (const path of ['.codex/hooks.json', '.codex/config.toml', '.agents/skills/foreign', 'memory/scripts/not-frozen-helper.py']) {
    assert.equal(existsSync(join(b.root, path)), false);
  }
  for (const alias of b.complexity.materialClosure.nativeSkillAliases) {
    const entries = generated.filter(row => row.patch.generatedAlias === alias.path);
    assert.equal(alias.fileCount, entries.length);
    assert.equal(alias.bytes, entries.reduce((n, row) => n + row.copyBytes, 0));
  }
  assert.deepEqual(b.complexity.materialClosure, s.complexity.materialClosure);
  assert.ok(b.allowedReadPaths.includes('.claude/observability/rules.yaml'));
  assert.ok(!b.allowedReadPaths.includes('.claude/observability/scripts/get_rules.py'));
  assert.equal(b.materialSha256, (await f.build('B', 'replayed')).materialSha256);
});

test('W24 requires both active-rule inputs before creating B/S materials', async t => {
  for (const path of ['.claude/observability/scripts/get_rules.py', '.claude/observability/rules.yaml']) {
    const f = fixture(t);
    f.records.splice(f.records.findIndex(row => row.path === path), 1); f.save();
    for (const id of ['B', 'S']) {
      await assert.rejects(f.build(id), error => error.code === 'MISSING_BASELINE' && error.message.includes(path));
      assert.equal(existsSync(join(f.base, id)), false);
    }
  }
});

test('W24 copied loader preserves rule filtering, stdout, stderr and exit without source or copy writes', async t => {
  const f = fixture(t);
  const script = '.claude/observability/scripts/get_rules.py', data = '.claude/observability/rules.yaml';
  const replace = (path, bytes) => {
    writeFileSync(join(f.sourceRoot, path), bytes);
    Object.assign(f.records.find(row => row.path === path), { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
  };
  replace(script, readFileSync(new URL(`../../${script}`, import.meta.url)));
  replace(data, `rules:
  - {id: active-first, status: active, scope: {skills: [office, sample], scenes: [B]}, rule: First}
  - {id: retired, status: retired, scope: {skills: [office, sample], scenes: ['*']}, rule: Retired}
  - {id: superseded, status: superseded, scope: {skills: [office, sample], scenes: ['*']}, rule: Superseded}
  - {id: active-second, status: active, scope: {skills: [office], scenes: ['*']}, rule: Second}
`);
  f.save();
  const b = await f.build('B'), s = await f.build('S');
  const roots = [f.sourceRoot, b.root, s.root];
  const before = roots.map(root => independentDigest(root, root === f.sourceRoot));
  for (const [args, expectedIds, status] of [
    [['office', '*'], ['active-first', 'active-second'], 0],
    [['sample', 'B'], ['active-first'], 0],
    [['sample', 'A'], [], 0],
    [['no-rules', '*'], [], 0],
    [[], [], 2],
  ]) {
    const runs = roots.map(root => {
      const run = spawnSync('python3', ['-B', join(root, script), ...args], {
        cwd: root, encoding: 'utf8', timeout: 10000,
      });
      assert.ifError(run.error);
      return { stdout: run.stdout, stderr: run.stderr, status: run.status };
    });
    assert.equal(runs[0].status, status);
    if (status === 0) {
      assert.equal(runs[0].stderr, '', 'missing PyYAML or invalid YAML must not masquerade as no rules');
      assert.deepEqual([...runs[0].stdout.matchAll(/^- ([^ ]+) /gm)].map(match => match[1]), expectedIds);
      if (!expectedIds.length) assert.match(runs[0].stdout, /: none\n$/);
    } else assert.match(runs[0].stderr, /Usage: get_rules.py/);
    assert.deepEqual(runs[1], runs[0]); assert.deepEqual(runs[2], runs[0]);
  }
  assert.deepEqual(roots.map(root => independentDigest(root, root === f.sourceRoot)), before);
});

test('missing required helper, transitive relative import and helper drift fail before any output', async t => {
  const f = fixture(t);
  f.records.splice(f.records.findIndex(row => row.path === 'memory/scripts/daily_governance.py'), 1); f.save();
  await assert.rejects(f.build('B'), { code: 'MISSING_BASELINE' });
  assert.equal(existsSync(join(f.base, 'B')), false);
  const g = fixture(t);
  g.add('scripts/consumer.mjs', 'export { marker } from "./not-in-manifest.mjs";\n');
  writeFileSync(join(g.sourceRoot, 'scripts/not-in-manifest.mjs'), 'export const marker=9;\n'); g.save();
  await assert.rejects(g.build('S'), { code: 'MISSING_RUNTIME_DEPENDENCY' });
  assert.equal(existsSync(join(g.base, 'S')), false);
  const h = fixture(t); writeFileSync(join(h.sourceRoot, 'memory/scripts/consolidate_memory.py'), 'drift');
  await assert.rejects(h.build('B'), { code: 'SOURCE_DRIFT' });
  assert.equal(existsSync(join(h.base, 'B')), false);
});

test('an unmanifested MagicPath target is not followed; native alias uses only frozen office owner', async t => {
  const f = fixture(t);
  f.add('.claude/skills/magicpath', '../../.agents/skills/magicpath', 'symlink-text-not-target');
  mkdirSync(join(f.sourceRoot, '.agents/skills/magicpath'), { recursive: true });
  writeFileSync(join(f.sourceRoot, '.agents/skills/magicpath/SKILL.md'), 'unfrozen external owner');
  f.add('.claude/skills/office/magicpath/SKILL.md', 'frozen office wrapper\n'); f.save();
  const result = await f.build('B');
  assert.ok(result.complexity.omittedLinks.some(link => link.path === '.claude/skills/magicpath'));
  assert.equal(readFileSync(join(result.root, '.agents/skills/office/magicpath/SKILL.md'), 'utf8'), 'frozen office wrapper\n');
  assert.equal(existsSync(join(result.root, '.claude/skills/magicpath')), false);
  assert.ok(result.sourceBindings.every(row => !row.source.includes('/.agents/')));
});

test('real read-only startup consumes copied memory helper/data and leaves source and output unchanged', async t => {
  const f = fixture(t);
  const replace = (path, bytes) => {
    writeFileSync(join(f.sourceRoot, path), bytes);
    Object.assign(f.records.find(row => row.path === path), { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
  };
  for (const name of ['get_memory', '_memroot']) {
    replace(`memory/scripts/${name}.py`, readFileSync(new URL(`../../memory/scripts/${name}.py`, import.meta.url)));
  }
  replace('memory/semantic/promoted-facts.yaml', 'facts:\n  - id: synthetic-1\n    domain: test\n    fact: synthetic stable fact\n    stable: true\n');
  f.save();
  const result = await f.build('B'); const sourceBefore = independentDigest(f.sourceRoot, true);
  const run = spawnSync('python3', ['-B', join(result.root, 'memory/scripts/get_memory.py'), '--summary'], {
    cwd: result.root, env: { ...process.env, MEMORY_ROOT: result.root }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /1 semantic facts/);
  assert.match(run.stdout, /no episodic sessions/);
  assert.equal(independentDigest(result.root), result.materialSha256);
  assert.equal(independentDigest(f.sourceRoot, true), sourceBefore);
});
