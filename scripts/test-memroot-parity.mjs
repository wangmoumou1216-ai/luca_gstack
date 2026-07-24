#!/usr/bin/env node
// 跨语言 parity：resolveMemoryRoot (JS) 与 _memroot.resolve_memory_root (py) 对同一 fixture
// 返回**同一 {path, mode}**（比 COMPOSED ALGORITHM，非仅 isDir）。含 FIX-1 决定性 fixture。
import { resolveMemoryRoot, SCRIPT_REPO_ROOT } from '../.claude/hooks/lib/memroot.mjs';
import { execFileSync } from 'child_process';
import { realpathSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const REPO = SCRIPT_REPO_ROOT;
const PY = join(REPO, 'memory', 'scripts', '_memroot.py');
const norm = (p) => { try { return realpathSync(p); } catch { return String(p); } };

// 干净 base env：剥掉可能污染的 3 个键，再叠 fixture
function childEnv(memEnv) {
  const e = { ...process.env };
  delete e.MEMORY_ROOT; delete e.CLAUDE_PROJECT_DIR; delete e.MEMORY_STANDALONE;
  return { ...e, ...(memEnv || {}) };
}
function pyResolve(memEnv, cwd) {
  const out = execFileSync('python3', [PY], { env: childEnv(memEnv), cwd, encoding: 'utf8' });
  const lines = out.trim().split('\n');
  return { path: lines[0], mode: lines[1] };
}
function jsResolve(memEnv) {
  return resolveMemoryRoot(memEnv || {}, { loud: () => {} });
}

const nonStore = mkdtempSync(join(tmpdir(), 'memroot-nonstore-'));  // 存在但非 store 形状

const fixtures = [
  { name: 'F1 MEMORY_ROOT 未设 → repo-fallback', memEnv: {}, cwd: REPO,
    expect: { path: REPO, mode: 'repo-fallback' } },
  { name: 'F2 MEMORY_ROOT 不存在 → repo-fallback', memEnv: { MEMORY_ROOT: '/nonexistent/xyz-123' }, cwd: REPO,
    expect: { path: REPO, mode: 'repo-fallback' } },
  { name: 'F3 MEMORY_ROOT=仓根(store 形) → env', memEnv: { MEMORY_ROOT: REPO }, cwd: REPO,
    expect: { path: REPO, mode: 'env' } },
  { name: 'F4 MEMORY_ROOT=存在但非 store → repo-fallback(哨兵)', memEnv: { MEMORY_ROOT: nonStore }, cwd: REPO,
    expect: { path: REPO, mode: 'repo-fallback' } },
  // FIX-1 决定性：非仓 cwd + CLAUDE_PROJECT_DIR 未注入 + MEMORY_ROOT 不存在
  //  → py 子进程从 /tmp 跑仍归脚本相对仓根（非 cwd）；JS 亦然。二者相等 = 分裂根消除。
  { name: 'F5 [FIX-1] 非仓 cwd + 无 CLAUDE_PROJECT_DIR + MEMORY_ROOT 不存在 → 皆脚本相对仓根',
    memEnv: { MEMORY_ROOT: '/nonexistent/cloud-master' }, cwd: tmpdir(),
    expect: { path: REPO, mode: 'repo-fallback' } },
  { name: 'F6 [FIX-1] 非仓 cwd + MEMORY_ROOT 未设 → 皆脚本相对仓根（不取 cwd）',
    memEnv: {}, cwd: tmpdir(),
    expect: { path: REPO, mode: 'repo-fallback' } },
];

let fail = 0;
for (const fx of fixtures) {
  const js = jsResolve(fx.memEnv);
  const py = pyResolve(fx.memEnv, fx.cwd);
  const jsPath = norm(js.path), pyPath = norm(py.path), expPath = norm(fx.expect.path);
  const parity = jsPath === pyPath && js.mode === py.mode;
  const correct = jsPath === expPath && js.mode === fx.expect.mode;
  const ok = parity && correct;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${fx.name}`);
  if (!ok) {
    console.log(`     JS={path:${jsPath}, mode:${js.mode}}`);
    console.log(`     PY={path:${pyPath}, mode:${py.mode}}`);
    console.log(`     EXPECT={path:${expPath}, mode:${fx.expect.mode}}  parity=${parity} correct=${correct}`);
  }
}
// ── 判别器（py-only，daily_governance 用）：FAIL-SAFE 向检测 + standalone opt-in ──
// 现有 test:memory 在本机 auth（master）存在下从不触发 auth-absent 分支，故此处专项覆盖，
// 否则该分支 mutation（如"auth 缺一律 NOTE"）测试不会变红 = 静默裂脑回归漏网。
function pyVerdict(authArg, resolvedArg, standalone) {
  const code = [
    "import sys; sys.path.insert(0, 'memory/scripts')",
    'from _memroot import memory_anomaly_verdict',
    'from pathlib import Path',
    `env = {'MEMORY_STANDALONE':'1'} if ${standalone ? 'True' : 'False'} else {}`,
    `v, _ = memory_anomaly_verdict(Path(${JSON.stringify(authArg)}), Path(${JSON.stringify(resolvedArg)}), env)`,
    'print(v)',
  ].join('\n');
  return execFileSync('python3', ['-c', code], { cwd: REPO, encoding: 'utf8' }).trim();
}
const dcases = [
  { n: 'D1 auth缺+无optin → ANOMALY（本地 master 改名/删除仍大声报，R2F2-1）', auth: '/nonexistent-abc', resolved: REPO, standalone: false, exp: 'ANOMALY' },
  { n: 'D2 auth缺+MEMORY_STANDALONE=1 → NOTE（合法 cloud/单检出）', auth: '/nonexistent-abc', resolved: REPO, standalone: true, exp: 'NOTE' },
  { n: 'D3 auth在+resolved≠auth → ANOMALY（fork 写路径分裂）', auth: REPO, resolved: join(REPO, 'memory'), standalone: false, exp: 'ANOMALY' },
  { n: 'D4 auth在+resolved==auth → NOTE（单一权威 store OK）', auth: REPO, resolved: REPO, standalone: false, exp: 'NOTE' },
];
for (const d of dcases) {
  const got = pyVerdict(d.auth, d.resolved, d.standalone);
  const ok = got === d.exp;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${d.n}${ok ? '' : `  got=${got} exp=${d.exp}`}`);
}

const total = fixtures.length + dcases.length;
console.log(`\n=== test-memroot summary: PASS=${total - fail} FAIL=${fail}（parity ${fixtures.length} + discriminator ${dcases.length}）===`);
process.exit(fail ? 1 : 0);
