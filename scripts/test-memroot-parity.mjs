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
// 深审#86：比 **raw 字符串**（不经 realpathSync），才能抓出 env 路径规范化（尾斜杠/// 等）发散；
// env 模式两侧已 normalizeAbs/str(Path) 同规范，fallback 两侧已 realpath/resolve 同根 → raw 即应逐字相等。
const norm = (p) => String(p);

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
  // 哨兵语义（深审#61 + 沙箱回归修正）：目录**存在即接受**（显式意图，含 bootstrap 空 store /
  // 测试沙箱 temp 根）；只有"不存在/不可访问"才回落。wrong-but-existing 由判别器兜底。
  { name: 'F4 MEMORY_ROOT=存在的空目录（bootstrap/沙箱）→ env（不逃逸回真实仓）', memEnv: { MEMORY_ROOT: nonStore }, cwd: REPO,
    expect: { path: nonStore, mode: 'env' } },
  { name: 'F4b MEMORY_ROOT=普通文件（非目录）→ repo-fallback', memEnv: { MEMORY_ROOT: join(REPO, 'package.json') }, cwd: REPO,
    expect: { path: REPO, mode: 'repo-fallback' } },
  // FIX-1 决定性：非仓 cwd + CLAUDE_PROJECT_DIR 未注入 + MEMORY_ROOT 不存在
  //  → py 子进程从 /tmp 跑仍归脚本相对仓根（非 cwd）；JS 亦然。二者相等 = 分裂根消除。
  { name: 'F5 [FIX-1] 非仓 cwd + 无 CLAUDE_PROJECT_DIR + MEMORY_ROOT 不存在 → 皆脚本相对仓根',
    memEnv: { MEMORY_ROOT: '/nonexistent/cloud-master' }, cwd: tmpdir(),
    expect: { path: REPO, mode: 'repo-fallback' } },
  { name: 'F6 [FIX-1] 非仓 cwd + MEMORY_ROOT 未设 → 皆脚本相对仓根（不取 cwd）',
    memEnv: {}, cwd: tmpdir(),
    expect: { path: REPO, mode: 'repo-fallback' } },
  // 深审#86：尾斜杠 env——JS 曾原样回传带斜杠、py Path 规范化去斜杠 → raw 发散（被旧 realpathSync 掩盖）
  { name: 'F7 [深审] MEMORY_ROOT 带尾斜杠 → 两侧规范化同值（raw 逐字相等）',
    memEnv: { MEMORY_ROOT: REPO + '/' }, cwd: REPO,
    expect: { path: REPO, mode: 'env' } },
  { name: 'F8 [深审] MEMORY_ROOT 含 // 与 /./ → 两侧规范化同值',
    memEnv: { MEMORY_ROOT: REPO.replace('/Users', '//Users') + '/./' }, cwd: REPO,
    expect: { path: REPO, mode: 'env' } },
  // 深审#93：相对 MEMORY_ROOT 按各自进程 cwd 解析 → 一侧 env 一侧 fallback = 裂脑。现两侧一律拒绝回落。
  { name: 'F9 [深审] 相对 MEMORY_ROOT="." 从仓内跑 → 两侧均拒绝、回落（不因 cwd 而 env）',
    memEnv: { MEMORY_ROOT: '.' }, cwd: REPO,
    expect: { path: REPO, mode: 'repo-fallback' } },
  { name: 'F10 [深审] 相对 MEMORY_ROOT="." 从 /tmp 跑 → 与 F9 同解（cwd 不改变结论）',
    memEnv: { MEMORY_ROOT: '.' }, cwd: tmpdir(),
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
// ── [深审 M2 存活缺口] JS fallback **源**必须是脚本相对根，不是进程 cwd ──
// 旧 fixture 的 JS 侧是 in-process 调用（cwd 恒=仓根），故 `SCRIPT_REPO_ROOT` 换成 `process.cwd()`
// 的 mutation 测不出来。这里真在非仓 cwd **spawn node 子进程**跑 memroot CLI，cwd 与脚本根分离。
{
  const MJS = join(REPO, '.claude', 'hooks', 'lib', 'memroot.mjs');
  const out = execFileSync('node', [MJS], { env: childEnv({}), cwd: tmpdir(), encoding: 'utf8' });
  const [p, mode] = out.trim().split('\n');
  const ok = norm(p) === norm(REPO) && mode === 'repo-fallback';
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} F11 [深审M2] node 子进程 cwd=/tmp + 未设 MEMORY_ROOT → 回落脚本相对仓根（非 cwd）${ok ? '' : `  got={${p}, ${mode}} exp={${REPO}, repo-fallback}`}`);
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

const total = fixtures.length + dcases.length + 1; // +1 = F11 子进程 fallback-源断言
console.log(`\n=== test-memroot summary: PASS=${total - fail} FAIL=${fail}（parity ${fixtures.length}+F11 + discriminator ${dcases.length}）===`);
process.exit(fail ? 1 : 0);
