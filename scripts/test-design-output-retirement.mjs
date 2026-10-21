#!/usr/bin/env node
// RET-20261020-001/002: html-prototype and magicpath are retired from the design flow.
// Static contract over the working tree plus a mutation proof; framework-audit/** snapshots are excluded.
import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readAuthority } from './lib/semantic-projection.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const gone = (rel) => { try { lstatSync(join(root, rel)); return false; } catch { return true; } };
const RETIRED = [
  { name: 'html-prototype', id: 'RET-20261020-001' },
  { name: 'magicpath', id: 'RET-20261020-002' },
];

function verifyTombstones(visibility, catalog) {
  for (const { name, id } of RETIRED) {
    const entry = visibility.retired?.find((item) => item.name === name);
    assert.ok(entry, `${name}: tombstone missing`);
    assert.equal(entry.status, 'retired-unavailable', `${name}: status`);
    assert.equal(entry.decision_id, id, `${name}: decision id`);
    assert.equal(entry.replacement, 'open-design', `${name}: replacement`);
    assert.match(entry.boundary, /Refuse its invocation; do not automatically select another generator/, `${name}: boundary`);
    assert.ok(!visibility.hidden.includes(name), `${name}: still listed as hidden`);
    assert.ok(!new RegExp('^\\| `' + name + '` ', 'm').test(catalog), `${name}: back in the callable skill table`);
    assert.ok(catalog.includes('`' + name + '` — `retired-unavailable`'), `${name}: catalog lacks tombstone`);
  }
}

function verifyEntriesGone() {
  for (const rel of [
    '.claude/skills/office/html-prototype', '.claude/skills/office/magicpath',
    '.agents/skills/html-prototype', '.agents/skills/magicpath',
    '.claude/commands/html-prototype.md', '.claude/commands/magicpath.md',
    '.claude/skill-os/generated/input-modes/html-prototype.json', '.claude/skill-os/generated/input-modes/magicpath.json',
    'scripts/sync-magicpath-projection.mjs',
  ]) assert.ok(gone(rel), `${rel} must not exist`);
  assert.ok(!('magicpath' in (JSON.parse(read('skills-lock.json')).skills || {})), 'skills-lock still pins magicpath');
  for (const dir of ['.claude/skills', '.agents/skills', '.claude/commands']) {
    const found = spawnSync('find', [dir, '-maxdepth', '1', '-type', 'l', '!', '-exec', 'test', '-e', '{}', ';', '-print'], { cwd: root, encoding: 'utf8' });
    assert.equal(found.stdout.trim(), '', `dangling symlink in ${dir}: ${found.stdout}`);
  }
  const routing = read('.claude/skill-os/skill-routing-map.yaml');
  assert.ok(!/invoke:\s+"?\/(html-prototype|magicpath)"?/.test(routing), 'routing map still routes a retired skill');
  assert.match(routing, /做个原型/, 'prototype wording must still route somewhere');
}

// Output-neutrality contract (user premise 2026-10-21): acceptance never reshapes what OD/CD generated.
function verifyOutputText(output) {
  assert.ok(output.includes('design-output/scripts/verify-prototype.mjs'), 'design-output must reference the acceptance script');
  assert.match(output, /--mode=external/, 'design-output must run the acceptance script in external mode for OD/CD output');
  assert.match(output, /报告写到临时目录，不写进交付目录/, 'external reports must not be written into the delivery directory');
  assert.match(output, /--out-dir=<调用方给定的稳定路径>/, 'a judge needs a stable report path (--out-dir) to find qa-results.json');
  assert.match(output, /NEEDS_CONTEXT/, 'design-output must state the both-exits-unavailable outcome');
  assert.match(output, /没有第三个出口/, 'design-output must state there is no third exit');
  assert.match(output, /AI Slop 扫描/, 'design-output must carry the acceptance-side slop report that replaced the retired generator firewall');
  assert.match(output, /由用户决定是否修复/, 'slop findings are reported, the user decides');
  assert.match(output, /不自动触发重新生成/, 'slop findings must not trigger regeneration');
  assert.doesNotMatch(output, /N ≥ 3[^\n]*必须返工/, 'acceptance must not force rework from the slop threshold');
  assert.doesNotMatch(output, /MagicPath|本地 HTML/, 'design-output still inherits a retired tool');
}

function verifySharedAssets() {
  for (const rel of [
    '.claude/skills/office/references/prototype-spec-schema.md',
    '.claude/skills/office/references/html-prototype-tokens.md',
    '.claude/skills/office/design-output/scripts/verify-prototype.mjs',
    '.claude/skills/office/design-output/scripts/test-verify-prototype.mjs',
  ]) assert.ok(existsSync(join(root, rel)), `shared asset lost: ${rel}`);
  verifyOutputText(read('.claude/skills/office/design-output/SKILL.md'));
  assert.match(read('.claude/skills/office/open-design/SKILL.md'), /references\/prototype-spec-schema\.md/, 'open-design must read the migrated schema');
}

function verifyGraphAndSelection() {
  const output = readAuthority(root, '.claude/skill-os/optional-workflow-graph.yaml#design_output');
  assert.deepEqual(output.adapters, ['open-design', 'claude-design']);
  assert.deepEqual(output.fallback, [], 'no third design-output exit');
  const graph = read('.claude/skill-os/optional-workflow-graph.yaml');
  assert.ok(!/html-prototype|magicpath|design_brief_to_html|design_brief_to_magicpath/.test(graph), 'graph still mentions a retired tool');
  assert.match(read('scripts/design-output-selection.mjs'), /new Set\(\['open-design', 'claude-design'\]\)/, 'selection whitelist');
}

function verifyNoLiveReaders() {
  const result = spawnSync('git', ['grep', '-nE', 'html-prototype/(SCHEMA\\.md|scripts/)|skills/office/(html-prototype|magicpath)/SKILL\\.md', '--',
    '.', ':!framework-audit', ':!docs', ':!memory/episodic', ':!memory/semantic/archive', ':!memory/evals', ':!CHANGELOG.md', ':!U-REGISTER.md',
    ':!.claude/skill-os/evolution', ':!.claude/audit', ':!.workbuddy', ':!scripts/test-design-output-retirement.mjs',
    // synthetic projection fixture text, and a frozen plan-hash-bound live-run proposal (not a reader of the skill)
    ':!scripts/test-semantic-parity.mjs', ':!scripts/fixtures/agent-orchestration-cases.json'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1, `live readers of retired paths remain:\n${result.stdout}`);
}

function verifyActiveRulesDoNotOfferRetiredExits() {
  const blocks = read('.claude/observability/rules.yaml').split(/^- id: /m).slice(1);
  for (const block of blocks) {
    if (!/^\s*status: active\b/m.test(block)) continue;
    const id = block.split('\n', 1)[0].trim();
    assert.ok(!/magicpath|html-prototype/i.test(block), `active rule ${id} still names a retired tool`);
  }
}

const visibility = JSON.parse(read('.claude/skill-os/skill-visibility.json'));
const catalog = read('.claude/skill-os/generated/skill-catalog.md');
verifyTombstones(visibility, catalog);
verifyEntriesGone();
verifySharedAssets();
verifyGraphAndSelection();
verifyNoLiveReaders();
verifyActiveRulesDoNotOfferRetiredExits();
console.log('PASS html-prototype/magicpath retired: tombstones, entries gone, shared assets kept, OD/CD only, no live readers');

if (process.argv.includes('--mutation')) {
  const mutated = structuredClone(visibility);
  mutated.retired = mutated.retired.filter((item) => item.name !== 'magicpath');
  assert.throws(() => verifyTombstones(mutated, catalog), /magicpath: tombstone missing/);
  const unhidden = structuredClone(visibility);
  unhidden.hidden.push('html-prototype');
  assert.throws(() => verifyTombstones(unhidden, catalog), /still listed as hidden/);
  assert.throws(() => verifyTombstones(visibility, catalog.replace('`html-prototype` — `retired-unavailable`', '')), /catalog lacks tombstone/);
  console.log('PASS mutation: missing tombstone / hidden relapse / catalog tombstone removed -> exact assertion fails -> original passes');
  const outputText = read('.claude/skills/office/design-output/SKILL.md');
  assert.throws(() => verifyOutputText(outputText.replaceAll('--mode=external', '')), /external mode/);
  assert.throws(() => verifyOutputText(outputText.replaceAll('不自动触发重新生成', '')), /must not trigger regeneration/);
  assert.throws(() => verifyOutputText(outputText + '\nN ≥ 3 必须返工'), /must not force rework/);
  assert.throws(() => verifyOutputText(outputText.replaceAll('由用户决定是否修复', '')), /the user decides/);
  console.log('PASS mutation: external mode dropped / regeneration trigger / forced rework / user decision removed -> exact assertion fails');

}
