#!/usr/bin/env node
// post-edit.mjs auto-open 投递段回归测试（T1-T7）。
// 隔离手法：HOME 指向临时目录（os.homedir() 在 POSIX 优先读 $HOME）→ spool 落
// $HOME/.luca/open-spool；cwd 指向临时 fixture → 计数文件落 fixture/.claude。
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const hook = resolve(process.cwd(), '.claude/hooks/post-edit.mjs');

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'luca-auto-open-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  return root;
}

function runHook(root, home, { env = {}, input } = {}) {
  // 剥离环境残留：app 内嵌会话里跑测试时 LUCA_APP=1 是环境态，会污染 T1。
  const baseEnv = { ...process.env };
  delete baseEnv.LUCA_APP;
  delete baseEnv.CLAUDE_PROJECT_DIR;
  return spawnSync('node', [hook], {
    cwd: root,
    encoding: 'utf8',
    env: { ...baseEnv, HOME: home, ...env },
    ...(input != null ? { input } : {}),
  });
}

function spoolEntries(home) {
  try {
    return readdirSync(join(home, '.luca', 'open-spool')).filter(n => !n.startsWith('.'));
  } catch { return []; }
}

function stdinFor(file, tool = 'Write') {
  return JSON.stringify({ session_id: 'test-sid', tool_name: tool, tool_input: { file_path: file } });
}

// 产出物文件须真实存在（hook 有 statSync 校验）
function makeArtifact(home, rel) {
  const abs = join(home, 'work', rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, 'x');
  return abs;
}

let passed = 0;
function ok(name) { passed++; console.log(`  ✅ ${name}`); }

// T1 无 LUCA_APP → 不投递，且 tool-count 照常 bump（既有行为回归）
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const abs = makeArtifact(home, 't1.md');
  const r = runHook(root, home, { input: stdinFor(abs) });
  assert.equal(r.status, 0);
  assert.equal(spoolEntries(home).length, 0);
  assert.equal(readFileSync(join(root, '.claude', '.session-tool-count-test-sid'), 'utf8'), '1');
  ok('T1 无 LUCA_APP 不投递 + 计数照常');
}

// T2 LUCA_APP=1 + Write .md → 恰一条 JSON 条目，字段正确
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const abs = makeArtifact(home, 't2.md');
  const r = runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs) });
  assert.equal(r.status, 0);
  const es = spoolEntries(home);
  assert.equal(es.length, 1);
  const j = JSON.parse(readFileSync(join(home, '.luca', 'open-spool', es[0]), 'utf8'));
  assert.equal(j.path, abs);
  assert.equal(j.mode, 'auto');
  assert.equal(j.sid, 'test-sid');
  assert.ok(Math.abs(Date.now() - j.ts) < 60000);
  ok('T2 Write .md 投递一条且字段正确');
}

// T3 白名单外扩展名不投
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const abs = makeArtifact(home, 't3.ts');
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs) });
  assert.equal(spoolEntries(home).length, 0);
  ok('T3 白名单外(.ts)不投');
}

// T4 排除路径段不投（memory / .claude / node_modules）
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  for (const rel of ['memory/a.md', '.claude/c.md', 'node_modules/b.html']) {
    const abs = join(home, 'work', rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, 'x');
    runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs) });
  }
  assert.equal(spoolEntries(home).length, 0);
  ok('T4 排除路径(memory/.claude/node_modules)不投');
}

// T5 2s 去重：连投两次一条；2.1s 后第三次 → 两条
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const abs = makeArtifact(home, 't5.html');
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs) });
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs, 'Edit') });
  assert.equal(spoolEntries(home).length, 1);
  spawnSync('sleep', ['2.1']);
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs, 'Edit') });
  assert.equal(spoolEntries(home).length, 2);
  ok('T5 2s 去重窗口生效');
}

// T6 非法 stdin → exit 0、零投递
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const r = runHook(root, home, { env: { LUCA_APP: '1' }, input: 'not-json{{' });
  assert.equal(r.status, 0);
  assert.equal(spoolEntries(home).length, 0);
  ok('T6 非法 stdin 安全退出零投递');
}

// T7 非编辑类工具（Bash/Task）不投
{
  const root = makeFixture(), home = mkdtempSync(join(tmpdir(), 'home-'));
  const abs = makeArtifact(home, 't7.md');
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs, 'Bash') });
  runHook(root, home, { env: { LUCA_APP: '1' }, input: stdinFor(abs, 'Task') });
  assert.equal(spoolEntries(home).length, 0);
  ok('T7 Bash/Task 不投');
}

console.log(`\ntest-auto-open: ${passed}/7 全部通过`);
