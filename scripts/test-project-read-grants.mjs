#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, statSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  authorizeRead,
  closeGrants,
  denyLatchPath,
  grantLockPath,
  grantSetPath,
  readGrantSet,
  reconcilePromptGrants,
  turnWitnessPath,
} from '../.claude/hooks/lib/project-read-grants.mjs';

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.stack || error}`);
  }
}

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'project-read-grants-'));
  const gstackRoot = join(base, 'gstack');
  const projectsRoot = join(base, 'projects');
  mkdirSync(join(gstackRoot, '.claude'), { recursive: true });
  for (const project of ['alpha', 'beta']) {
    mkdirSync(join(projectsRoot, project, 'docs', 'nested'), { recursive: true });
    mkdirSync(join(projectsRoot, project, '.git'), { recursive: true });
    mkdirSync(join(projectsRoot, project, '.luca'), { recursive: true });
  }
  writeFileSync(join(projectsRoot, 'alpha', 'docs', 'current.md'), 'alpha');
  writeFileSync(join(projectsRoot, 'beta', 'docs', 'reference.md'), 'beta reference');
  writeFileSync(join(projectsRoot, 'beta', 'docs', 'sibling.md'), 'sibling');
  writeFileSync(join(projectsRoot, 'beta', 'docs', 'nested', 'child.md'), 'child');
  writeFileSync(join(projectsRoot, 'beta', '.git', 'config'), 'secret');
  symlinkSync(join(projectsRoot, 'alpha', 'docs'), join(projectsRoot, 'beta', 'docs', 'escape'));
  return { base, gstackRoot, projectsRoot };
}

function binding(env, project = 'alpha', epoch = 3) {
  const realpath = realpathSync(join(env.projectsRoot, project));
  const stat = statSync(realpath);
  return { project, epoch, realpath, dev: Number(stat.dev), ino: Number(stat.ino) };
}

function issue(env, {
  sid = 'session-a',
  turnId = 'turn-1',
  prompt,
  projectBinding = null,
} = {}) {
  return reconcilePromptGrants({
    gstackRoot: env.gstackRoot,
    projectsRoot: env.projectsRoot,
    sessionId: sid,
    turnId,
    prompt,
    binding: projectBinding,
  });
}

function allow(env, {
  sid = 'session-a',
  turnId = 'turn-1',
  projectBinding = null,
  operation = 'read',
  toolName = 'Read',
  targetPath,
  grantId,
} = {}) {
  return authorizeRead({
    gstackRoot: env.gstackRoot,
    projectsRoot: env.projectsRoot,
    sessionId: sid,
    turnId,
    binding: projectBinding,
    operation,
    toolName,
    targetPath,
    grantId,
  });
}

check('exact file directive creates a prompt-bound turn grant', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const prompt = `只读引用: \`${target}\``;
    const result = issue(env, { prompt });
    assert.equal(result.issued.length, 1);
    const state = readGrantSet(env.gstackRoot, 'session-a').value;
    const witness = JSON.parse(readFileSync(turnWitnessPath(env.gstackRoot, 'session-a'), 'utf8'));
    assert.equal(state.grants[0].lifetime, 'turn');
    assert.equal(state.grants[0].kind, 'file');
    assert.equal(state.grants[0].authority.turn_generation, witness.generation);
    assert.equal(witness.open, true);
    assert.ok(!readFileSync(grantSetPath(env.gstackRoot, 'session-a'), 'utf8').includes(prompt));
    assert.equal(allow(env, { targetPath: target }).allowed, true);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('ordinary path mention is not authorization', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const result = issue(env, { prompt: `请看看 ${target}` });
    assert.equal(result.issued.length, 0);
    assert.equal(allow(env, { targetPath: target }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('file grant rejects sibling and write operation', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    issue(env, { prompt: `只读引用: "${target}"` });
    assert.equal(allow(env, { targetPath: join(env.projectsRoot, 'beta', 'docs', 'sibling.md') }).allowed, false);
    assert.equal(allow(env, { targetPath: target, operation: 'write', toolName: 'Write' }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('explicit directory grant confines descendants and read/list/search', () => {
  const env = fixture();
  try {
    const directory = join(env.projectsRoot, 'beta', 'docs', 'nested');
    const child = join(directory, 'child.md');
    const result = issue(env, { prompt: `只读引用目录：\`${directory}\`` });
    const grantId = result.issued[0].id;
    assert.equal(allow(env, { targetPath: child, grantId }).allowed, true);
    assert.equal(allow(env, { targetPath: directory, grantId, operation: 'list', toolName: 'Glob' }).allowed, true);
    assert.equal(allow(env, { targetPath: directory, grantId, operation: 'search', toolName: 'Grep' }).allowed, true);
    assert.equal(allow(env, { targetPath: join(env.projectsRoot, 'beta', 'docs', 'sibling.md'), grantId }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('session grant survives a new turn only under the same binding snapshot', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const current = binding(env);
    issue(env, { prompt: `本会话只读引用: \`${target}\``, projectBinding: current });
    issue(env, { turnId: 'turn-2', prompt: '继续处理', projectBinding: current });
    assert.equal(allow(env, { turnId: 'turn-2', projectBinding: current, targetPath: target }).allowed, true);
    assert.equal(allow(env, { turnId: 'turn-2', projectBinding: { ...current, epoch: 4 }, targetPath: target }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('closing witness invalidates stale turn grant even when grant sidecar remains', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const issued = issue(env, { prompt: `只读引用: \`${target}\`` });
    const stale = readFileSync(grantSetPath(env.gstackRoot, 'session-a'));
    closeGrants({
      gstackRoot: env.gstackRoot,
      sessionId: 'session-a',
      scope: 'turn',
      generation: issued.generation,
      turnId: 'turn-1',
    });
    writeFileSync(grantSetPath(env.gstackRoot, 'session-a'), stale, { mode: 0o600 });
    assert.equal(allow(env, { targetPath: target }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('new prompt generation invalidates previous turn grant', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const first = issue(env, { prompt: `只读引用: \`${target}\`` });
    issue(env, { turnId: 'turn-2', prompt: '继续' });
    assert.equal(allow(env, { turnId: 'turn-2', targetPath: target, grantId: first.issued[0].id }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('delayed Stop generation CAS cannot revoke a newer turn grant', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const first = issue(env, { turnId: 'turn-1', prompt: `只读引用: \`${target}\`` });
    const second = issue(env, { turnId: 'turn-2', prompt: `只读引用: \`${target}\`` });
    const result = closeGrants({
      gstackRoot: env.gstackRoot,
      sessionId: 'session-a',
      scope: 'turn',
      generation: first.generation,
      turnId: 'turn-1',
    });
    assert.equal(result.stale, true);
    assert.equal(allow(env, {
      turnId: 'turn-2',
      targetPath: target,
      grantId: second.issued[0].id,
    }).allowed, true);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('lexical traversal is rejected before path normalization', () => {
  const env = fixture();
  try {
    const exact = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const traversal = `${join(env.projectsRoot, 'beta', 'docs', 'nested')}/../reference.md`;
    const result = issue(env, { prompt: `只读引用: \`${traversal}\`` });
    assert.equal(result.issued.length, 0);
    assert.match(result.hints.join('\n'), /traversal|dot/);
    issue(env, { turnId: 'turn-2', prompt: `只读引用: \`${exact}\`` });
    assert.equal(allow(env, { turnId: 'turn-2', targetPath: traversal }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('incomplete grant transaction lock keeps consumers fail-closed', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    issue(env, { prompt: `只读引用: \`${target}\`` });
    writeFileSync(grantLockPath(env.gstackRoot, 'session-a'), '{}\n', { mode: 0o600 });
    assert.equal(allow(env, { targetPath: target }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('symlink escape, control plane, project root, and global root are rejected', () => {
  const env = fixture();
  try {
    const paths = [
      env.projectsRoot,
      join(env.projectsRoot, 'beta'),
      join(env.projectsRoot, 'beta', '.git', 'config'),
      join(env.projectsRoot, 'beta', 'docs', 'escape', 'current.md'),
    ];
    for (const target of paths) {
      const result = issue(env, { turnId: `turn-${paths.indexOf(target) + 1}`, prompt: `只读引用: \`${target}\`` });
      assert.equal(result.issued.length, 0, `must reject ${target}`);
    }
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('malformed sidecar and wrong session fail closed', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    issue(env, { prompt: `只读引用: \`${target}\`` });
    writeFileSync(grantSetPath(env.gstackRoot, 'session-a'), '{broken', { mode: 0o600 });
    assert.equal(allow(env, { targetPath: target }).allowed, false);
    assert.equal(allow(env, { sid: 'session-b', targetPath: target }).allowed, false);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('pre-latched interrupted transaction stays denied until a full publish succeeds', () => {
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    issue(env, { prompt: `只读引用: \`${target}\`` });
    writeFileSync(denyLatchPath(env.gstackRoot, 'session-a'), `${JSON.stringify({
      schema_version: 1,
      session_id: 'session-a',
      reason: 'witness-close-failed',
      created_at: new Date().toISOString(),
    })}\n`, { mode: 0o600 });
    assert.equal(allow(env, { targetPath: target }).allowed, false, 'pre-latch must win over an old open witness');
    issue(env, { turnId: 'turn-2', prompt: `只读引用: \`${target}\`` });
    assert.equal(allow(env, { turnId: 'turn-2', targetPath: target }).allowed, true, 'full publish may clear the latch');
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

check('kill-switch restores baseline deny behavior', () => {
  const env = fixture();
  const previous = process.env.LUCA_READ_GRANTS_DISABLE;
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    issue(env, { prompt: `只读引用: \`${target}\`` });
    process.env.LUCA_READ_GRANTS_DISABLE = '1';
    assert.equal(allow(env, { targetPath: target }).allowed, false);
  } finally {
    if (previous === undefined) delete process.env.LUCA_READ_GRANTS_DISABLE;
    else process.env.LUCA_READ_GRANTS_DISABLE = previous;
    rmSync(env.base, { recursive: true, force: true });
  }
});

console.log(`\nRESULT pass=${passed} fail=${failed}`);
if (failed) process.exitCode = 1;
