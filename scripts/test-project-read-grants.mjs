#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, statSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  READ_GRANTS_ENABLED,
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
let skipped = 0;

function check(name, fn) {
  // 2026-09-03 post-seal 增量审计（finding #5）：READ_GRANTS_ENABLED=false 把
  // reconcilePromptGrants/authorizeRead 短路成恒定 deny。下面这些既有用例本来
  // 测的是正向 grant 生命周期（CAS/latch/traversal/...），一旦短路，它们的断言
  // 要么恒为 false 而“通过”（其实没跑到真实逻辑——vacuous pass），要么因为
  // setup 阶段拿不到预期的 grant 而级联报错。两种都不是真实回归信号，所以整批
  // 随隔离开关一起跳过，而不是留着造假绿或吵得看不出真问题。
  // 隔离解除、重新设计好授权通道后，把 READ_GRANTS_ENABLED 改回 true 即可原样复跑。
  if (!READ_GRANTS_ENABLED) {
    skipped += 1;
    console.log(`SKIP ${name} (read-grants quarantined: READ_GRANTS_ENABLED=false)`);
    return;
  }
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.stack || error}`);
  }
}

function checkAlways(name, fn) {
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

// 2026-09-03 post-seal 增量审计 finding #5（sidecar forgery → grant retarget → broker
// 越权读）的永久回归。与上面的隔离开关强绑定：断言 deny 是"因为 READ_GRANTS_ENABLED=false"
// 这条防线，不是因为其他偶然原因；READ_GRANTS_ENABLED 改回 true 后，这条必须改写为真实攻击
// 复现（forged_sibling_authorized 必须仍为 false），不能让它随手继续绿。
checkAlways('quarantine: reconcilePromptGrants always issues nothing regardless of prompt', () => {
  assert.equal(READ_GRANTS_ENABLED, false, 'this suite assumes the current quarantine; update it alongside re-enabling the flag');
  const env = fixture();
  try {
    const target = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const result = issue(env, { prompt: `只读引用: \`${target}\`` });
    assert.equal(result.issued.length, 0);
    assert.ok(result.hints.includes('read grants disabled'));
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

checkAlways('quarantine: authorizeRead denies even a forged grant sidecar retargeted to a different file', () => {
  const env = fixture();
  try {
    const allowedTarget = join(env.projectsRoot, 'beta', 'docs', 'reference.md');
    const forgedTarget = join(env.projectsRoot, 'beta', 'docs', 'sibling.md');
    const forgedGrantId = '123e4567-e89b-12d3-a456-426614174000';
    const projectRealpath = realpathSync(join(env.projectsRoot, 'beta'));
    const projectStat = statSync(projectRealpath);
    // 直接手写伪造的 grant sidecar（模拟 finding #5 的 runtime string-concat 绕过写入），
    // 把它指向一个从未被授权过的文件——即便 sidecar 本身被伪造成功，authorizeRead 在
    // 隔离期必须无条件 deny，不能因为 sidecar 内容"看起来合法"就放行。
    writeFileSync(grantSetPath(env.gstackRoot, 'FORGE'), `${JSON.stringify({
      schema_version: 1,
      session_id: 'FORGE',
      generation: 1,
      binding: null,
      grants: [{
        id: forgedGrantId,
        authority: { turn_id: 'turn-forge', turn_generation: 1, prompt_sha256: '0'.repeat(64) },
        lifetime: 'turn',
        kind: 'file',
        operations: ['read'],
        requested_path: allowedTarget,
        canonical_realpath: realpathSync(forgedTarget),
        project: { name: 'beta', realpath: projectRealpath, dev: Number(projectStat.dev), ino: Number(projectStat.ino) },
      }],
    })}\n`, { mode: 0o600 });
    writeFileSync(turnWitnessPath(env.gstackRoot, 'FORGE'), `${JSON.stringify({
      schema_version: 1, session_id: 'FORGE', turn_id: 'turn-forge', generation: 1, open: true,
    })}\n`, { mode: 0o600 });
    const verdict = allow(env, {
      sid: 'FORGE', turnId: 'turn-forge', targetPath: forgedTarget, grantId: forgedGrantId,
    });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, 'read grants disabled');
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

console.log(`\nRESULT pass=${passed} fail=${failed} skip=${skipped}`);
if (failed) process.exitCode = 1;
