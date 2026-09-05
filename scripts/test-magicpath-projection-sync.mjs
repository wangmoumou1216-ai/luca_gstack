#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareMagicpathProjection } from './sync-magicpath-projection.mjs';

const WRAPPER = '.claude/skills/office/magicpath/SKILL.md';
const TARGET = '.agents/skills/magicpath/SKILL.md';
const GRAPH = '.claude/skill-os/optional-workflow-graph.yaml';
const AUTHORITY = `${GRAPH}#handoff_gates.design_brief_to_magicpath`;
const OLD_DIGEST = `sha256:${'0'.repeat(64)}`;
// Worked schema-v2 example: unordered "packet missing" and "mapping missing".
const EXPECTED = 'sha256:5fd740b76df55280ad783522386ec17cad68ec48dd06752845007a33b91af62c';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'luca-magicpath-projection-'));
  const files = {
    [WRAPPER]: `---\nname: magicpath\nmetadata:\n  codex-projection-mode: external-delegation\n  codex-projection-target: ${TARGET}\n  codex-obligation-source: ${AUTHORITY}\n---\n# Wrapper authority\n`,
    [TARGET]: `---\nname: magicpath\nmetadata:\n  author: MagicPathAI\n  luca-wrapper: ${WRAPPER}\n  luca-obligation-source: ${AUTHORITY}\n  luca-obligation-digest: ${OLD_DIGEST}\n---\n# 上游正文\nKeep \'quotes\', CRLF, and digest-looking text ${OLD_DIGEST}.\n`,
    [GRAPH]: 'handoff_gates:\n  design_brief_to_magicpath:\n    applies_when: workflow_mode\n    order_significant: false\n    block_if: [packet missing, mapping missing]\n    allow_standalone_override: false\n    allow_parallel_start: false\n',
  };
  for (const [relative, text] of Object.entries(files)) {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return root;
}

function withFixture(run) {
  const root = fixture();
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

withFixture((root) => {
  const target = join(root, TARGET);
  const before = readFileSync(target);
  const initialStat = statSync(target, { bigint: true });
  const plan = prepareMagicpathProjection(root);
  assert.equal(plan.changed, true);
  assert.equal(plan.current, OLD_DIGEST);
  assert.equal(plan.expected, EXPECTED);
  assert.deepEqual(readFileSync(target), before, 'checking never writes');
  assert.equal(statSync(target, { bigint: true }).mtimeNs, initialStat.mtimeNs);
  assert.equal(plan.write(), true);
  assert.deepEqual(readFileSync(target), Buffer.from(before.toString().replace(
    `luca-obligation-digest: ${OLD_DIGEST}`, `luca-obligation-digest: ${EXPECTED}`,
  )), 'only the metadata digest bytes change');
  const synced = prepareMagicpathProjection(root);
  assert.equal(synced.changed, false);
  const syncedStat = statSync(target, { bigint: true });
  assert.equal(synced.write(), false);
  assert.equal(statSync(target, { bigint: true }).mtimeNs, syncedStat.mtimeNs, 'no-op write preserves file');
});
console.log('PASS stale -> check without write -> digest sync -> PASS -> no-op');

withFixture((root) => {
  prepareMagicpathProjection(root).write();
  const graph = join(root, GRAPH);
  writeFileSync(graph, readFileSync(graph, 'utf8').replace(
    '[packet missing, mapping missing]', '[packet missing, mapping missing, traceability missing]',
  ));
  const changed = prepareMagicpathProjection(root);
  assert.equal(changed.changed, true);
  assert.equal(changed.expected, 'sha256:9f0467137ae9fd9ab3f79237e20f65208c70282293f30f6973dd6b36c954fd2d');
  changed.write();
  assert.equal(prepareMagicpathProjection(root).changed, false);
});
console.log('PASS adding a gate obligation yields the known new canonical digest');

for (const [relative, from, to] of [
  [WRAPPER, TARGET, '../../outside/SKILL.md'],
  [WRAPPER, AUTHORITY, `${GRAPH}#handoff_gates.other`],
  [WRAPPER, 'name: magicpath', 'name: other'],
  [WRAPPER, 'external-delegation', 'shared-symlink'],
  [TARGET, WRAPPER, '.claude/skills/office/other/SKILL.md'],
  [TARGET, AUTHORITY, '../outside.yaml#handoff_gates.design_brief_to_magicpath'],
  [TARGET, 'name: magicpath', 'name: other'],
]) {
  withFixture((root) => {
    const path = join(root, relative);
    writeFileSync(path, readFileSync(path, 'utf8').replace(from, to));
    const before = readFileSync(join(root, TARGET));
    assert.throws(() => prepareMagicpathProjection(root), /mismatch/, `${relative}: ${to}`);
    assert.deepEqual(readFileSync(join(root, TARGET)), before);
  });
}
console.log('PASS swapped target/authority/name/wrapper and wrong delegation mode are rejected');

for (const relative of [WRAPPER, TARGET, GRAPH]) {
  withFixture((root) => {
    const path = join(root, relative);
    const moved = join(root, 'linked-source');
    renameSync(path, moved);
    symlinkSync(moved, path);
    assert.throws(() => prepareMagicpathProjection(root), /regular file|symlink/);
  });
}
for (const relative of ['.agents', '.agents/skills/magicpath', '.claude/skills', '.claude/skill-os']) {
  withFixture((root) => {
    const path = join(root, relative);
    const moved = join(root, 'linked-directory');
    renameSync(path, moved);
    symlinkSync(moved, path, 'dir');
    assert.throws(() => prepareMagicpathProjection(root), /directory|symlink/);
  });
}
withFixture((root) => {
  unlinkSync(join(root, TARGET));
  mkdirSync(join(root, TARGET));
  assert.throws(() => prepareMagicpathProjection(root), /regular file/);
});
console.log('PASS symlinked files/ancestors and nonregular targets are rejected');

for (const relative of [WRAPPER, GRAPH, TARGET]) {
  withFixture((root) => {
    const plan = prepareMagicpathProjection(root);
    const changed = join(root, relative);
    writeFileSync(changed, `${readFileSync(changed, 'utf8')}\n# concurrent user change\n`);
    const before = readFileSync(join(root, TARGET));
    assert.throws(() => plan.write(), /changed/, `stale plan must reject ${relative}`);
    assert.deepEqual(readFileSync(join(root, TARGET)), before, 'concurrent edits are preserved');
  });
}
withFixture((root) => {
  const plan = prepareMagicpathProjection(root);
  const source = join(root, GRAPH);
  const text = readFileSync(source);
  unlinkSync(source);
  writeFileSync(source, text);
  assert.throws(() => plan.write(), /changed/, 'same bytes with a different file version are stale');
});
withFixture((root) => {
  prepareMagicpathProjection(root).write();
  const currentPlan = prepareMagicpathProjection(root);
  const source = join(root, GRAPH);
  writeFileSync(source, readFileSync(source, 'utf8').replace('packet missing', 'new obligation'));
  assert.throws(() => currentPlan.write(), /changed/, 'even a no-op plan must reject a changed source');
});
console.log('PASS concurrent source/target edits and same-content replacement reject stale plans');

withFixture((root) => {
  const plan = prepareMagicpathProjection(root);
  const directory = join(root, '.agents/skills/magicpath');
  const moved = join(root, 'original-projection');
  renameSync(directory, moved);
  mkdirSync(directory);
  const destination = join(directory, 'SKILL.md');
  copyFileSync(join(moved, 'SKILL.md'), destination);
  const before = readFileSync(destination);
  assert.throws(() => plan.write(), /changed/);
  assert.deepEqual(readFileSync(destination), before);
  assert.deepEqual(readdirSync(directory), ['SKILL.md']);
});
console.log('PASS replacing a target ancestor rejects the write without staging leftovers');

for (const replacement of [
  '',
  '  luca-obligation-digest: invalid\n',
  `  luca-obligation-digest: ${OLD_DIGEST}\n  luca-obligation-digest: ${OLD_DIGEST}\n`,
  `luca-obligation-digest: ${OLD_DIGEST}\n`,
]) {
  withFixture((root) => {
    const target = join(root, TARGET);
    writeFileSync(target, readFileSync(target, 'utf8').replace(`  luca-obligation-digest: ${OLD_DIGEST}\n`, replacement));
    const before = readFileSync(target);
    assert.throws(() => prepareMagicpathProjection(root), /digest|duplicate key/);
    assert.deepEqual(readFileSync(target), before);
  });
}
withFixture((root) => {
  const graph = join(root, GRAPH);
  writeFileSync(graph, readFileSync(graph, 'utf8').replace('    order_significant: false', '    order_significant: false\n    order_significant: true'));
  assert.throws(() => prepareMagicpathProjection(root), /duplicate key/);
});
console.log('PASS missing/malformed/duplicate metadata digest and duplicate authority keys are rejected');

withFixture((root) => {
  const target = join(root, TARGET);
  const before = readFileSync(target, 'utf8').replace(
    `luca-obligation-digest: ${OLD_DIGEST}`, `luca-obligation-digest: ${OLD_DIGEST}  # retain this comment`,
  ).replaceAll('\n', '\r\n');
  writeFileSync(target, before);
  chmodSync(target, 0o640);
  const sourceBefore = readFileSync(join(root, WRAPPER));
  const graphBefore = readFileSync(join(root, GRAPH));
  prepareMagicpathProjection(root).write();
  assert.deepEqual(readFileSync(target), Buffer.from(before.replace(
    `luca-obligation-digest: ${OLD_DIGEST}`, `luca-obligation-digest: ${EXPECTED}`,
  )), 'CRLF, comments, Unicode and upstream body bytes survive unchanged');
  assert.deepEqual(readFileSync(join(root, WRAPPER)), sourceBefore);
  assert.deepEqual(readFileSync(join(root, GRAPH)), graphBefore);
  assert.deepEqual(readdirSync(dirname(target)), ['SKILL.md'], 'no staging file remains');
  assert.equal(statSync(target).mode & 0o777, 0o640, 'file permissions survive atomic replacement');
});
console.log('PASS byte-preserving CRLF/comment update leaves authority and wrapper untouched');

withFixture((root) => {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const cliDirectory = join(root, 'scripts');
  mkdirSync(join(cliDirectory, 'lib'), { recursive: true });
  copyFileSync(join(scriptDirectory, 'sync-magicpath-projection.mjs'), join(cliDirectory, 'sync-magicpath-projection.mjs'));
  copyFileSync(join(scriptDirectory, 'lib/semantic-projection.mjs'), join(cliDirectory, 'lib/semantic-projection.mjs'));
  const run = (args) => spawnSync(process.execPath, [join(cliDirectory, 'sync-magicpath-projection.mjs'), ...args], {
    cwd: tmpdir(), encoding: 'utf8',
  });
  const target = join(root, TARGET);
  const before = readFileSync(target);
  for (const args of [[], ['--check']]) {
    const result = run(args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /^DRIFT MagicPath projection digest:/);
    assert.deepEqual(readFileSync(target), before);
  }
  for (const args of [['--root', root], ['--write', '--root', root], ['--fix'], ['--write', '--check']]) {
    const result = run(args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /^Usage:/);
    assert.deepEqual(readFileSync(target), before);
  }
  const write = run(['--write']);
  assert.equal(write.status, 0, write.stderr);
  assert.match(write.stdout, /^WROTE MagicPath projection digest:/);
  const pass = run([]);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /^PASS MagicPath projection digest:/);
  const version = statSync(target, { bigint: true });
  const noop = run(['--write']);
  assert.equal(noop.status, 0, noop.stderr);
  assert.match(noop.stdout, /^PASS MagicPath projection digest:/);
  assert.equal(statSync(target, { bigint: true }).ino, version.ino);
  assert.equal(statSync(target, { bigint: true }).mtimeNs, version.mtimeNs);
});
console.log('PASS CLI defaults to check, fixes only its checkout with --write, and refuses target/root arguments');
