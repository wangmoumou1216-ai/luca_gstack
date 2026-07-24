#!/usr/bin/env node
// luca-open.sh --url 回归：协议守卫 / HTML 转义（注入防御）/ 唯一路径 / 文件模式不回归 / NO_LAUNCH 守卫。
// HOME 隔离临时目录；LUCA_OPEN_NO_LAUNCH 阻止拉起真 app；LUCA_OPEN_LAUNCH_CMD 注入假拉起以验证守卫。
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const script = resolve(process.cwd(), 'scripts/luca-open.sh');
const homes = [];
process.on('exit', () => { for (const h of homes) { try { rmSync(h, { recursive: true, force: true }); } catch {} } });
const newHome = () => { const h = mkdtempSync(join(tmpdir(), 'lo-')); homes.push(h); return h; };

function run(home, args, extraEnv = {}) {
  return spawnSync('bash', [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, LUCA_OPEN_NO_LAUNCH: '1', ...extraEnv },
  });
}
const spoolEntries = h => { try { return readdirSync(join(h, '.luca', 'open-spool')).filter(n => !n.startsWith('.')); } catch { return []; } };
const mirrorShims = h => { try { return readdirSync(join(h, '.luca', 'mirror')).filter(n => n.endsWith('.html')); } catch { return []; } };
function shimHtml(h) {
  const abs = readFileSync(join(h, '.luca', 'open-spool', spoolEntries(h)[0]), 'utf8');
  return readFileSync(abs, 'utf8');
}

let passed = 0;
const ok = n => { passed++; console.log(`  ✅ ${n}`); };

// U1 合法 https → 一条 spool 条目指向一个 .html shim；shim 是 meta-refresh 且 & 已转义
{
  const home = newHome();
  const r = run(home, ['--url', 'https://example.com/x?a=1&b=2']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(spoolEntries(home).length, 1);
  const abs = readFileSync(join(home, '.luca', 'open-spool', spoolEntries(home)[0]), 'utf8');
  assert.ok(abs.startsWith(join(home, '.luca', 'mirror')) && abs.endsWith('.html'), `spool 指向 shim: ${abs}`);
  const html = readFileSync(abs, 'utf8');
  assert.match(html, /http-equiv="refresh"/, 'shim 含 meta-refresh');
  assert.ok(html.includes('https://example.com/x?a=1&amp;b=2'), 'URL 中 & → &amp;');
  ok('U1 https → shim + meta-refresh + & 转义');
}

// U2 非 http(s)/本地路径 → 非零退出、零副作用（大写 HTTP:// 现应被接受，见 U2b，故不在此列）
for (const bad of ['file:///etc/passwd', 'javascript:alert(1)', 'ftp://x', 'notaurl', '/local/path', 'http:/nohost']) {
  const home = newHome();
  const r = run(home, ['--url', bad]);
  assert.notEqual(r.status, 0, `应拒绝并非零退出: ${bad}`);
  assert.equal(spoolEntries(home).length, 0, `不应产 spool: ${bad}`);
  assert.equal(mirrorShims(home).length, 0, `不应产 shim: ${bad}`);
}
ok('U2 非 http(s)/本地路径/无 host 全部拒绝、零副作用');

// U2b scheme 大小写不敏感（MINOR-1 修复）：HTTP:// / HTTPS:// / 混合大小写应被接受
for (const good of ['HTTP://example.com', 'HTTPS://example.com/a', 'HtTpS://x.com']) {
  const home = newHome();
  const r = run(home, ['--url', good]);
  assert.equal(r.status, 0, `应接受: ${good} — ${r.stderr}`);
  assert.equal(spoolEntries(home).length, 1, `应产一条 spool: ${good}`);
}
ok('U2b 大写/混合大小写 HTTP(S) scheme 被接受');

// U3 --url 缺 URL → 用法错误退出、零副作用
{
  const home = newHome();
  const r = run(home, ['--url']);
  assert.notEqual(r.status, 0);
  assert.equal(spoolEntries(home).length, 0);
  assert.equal(mirrorShims(home).length, 0);
  ok('U3 --url 缺 URL 报错退出');
}

// U4 唯一路径：连推两个不同 URL → 两个不同 shim + 两条 spool（新开 tab/次，不复用）
{
  const home = newHome();
  run(home, ['--url', 'https://a.example']);
  run(home, ['--url', 'https://b.example']);
  assert.equal(spoolEntries(home).length, 2, '两条 spool');
  assert.equal(new Set(mirrorShims(home)).size, 2, '两个不同 shim（唯一路径）');
  ok('U4 唯一路径 → 每推一新 shim（不复用）');
}

// U5 文件模式不回归：真实文件 → 一条裸路径 spool 条目、不产 shim
{
  const home = newHome();
  const f = join(home, 'note.md');
  writeFileSync(f, '# hi');
  const r = run(home, [f]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(spoolEntries(home).length, 1);
  const abs = readFileSync(join(home, '.luca', 'open-spool', spoolEntries(home)[0]), 'utf8');
  assert.ok(abs.endsWith('/note.md') && !abs.includes('/.luca/mirror/'), `裸路径协议不变: ${abs}`);
  assert.equal(mirrorShims(home).length, 0, '文件模式不产 shim');
  ok('U5 文件模式裸路径协议不回归');
}

// U6 无参数 → 用法错误退出
{
  const home = newHome();
  assert.notEqual(run(home, []).status, 0);
  ok('U6 无参数报错退出');
}

// U7 注入防御：URL 里的 < > " & 必须全部 HTML 转义，原始危险序列不得字面出现在 shim
{
  const home = newHome();
  const r = run(home, ['--url', 'https://x.com/a?q=<b>"&x=1']);
  assert.equal(r.status, 0, r.stderr);
  const html = shimHtml(home);
  assert.ok(html.includes('&lt;b&gt;'), '< > 已转义');
  assert.ok(html.includes('&quot;'), '" 已转义');
  assert.ok(html.includes('&amp;x=1'), '& 已转义');
  assert.ok(!html.includes('<b>'), '原始 <b> 标签不得字面出现（否则属注入）');
  assert.ok(!html.includes('">&x'), '属性未被 " 突破');
  ok('U7 <>"& 全部转义、无属性突破/标签注入');
}

// U8 NO_LAUNCH 守卫：用 LUCA_OPEN_LAUNCH_CMD 注入假拉起、以 marker 观测
{
  // 8a NO_LAUNCH=1（run 默认）→ 假拉起不执行（无 marker）
  const home = newHome();
  const marker = join(home, 'LAUNCHED');
  run(home, ['--url', 'https://x.example'], { LUCA_OPEN_LAUNCH_CMD: `touch ${marker}` });
  assert.equal(existsSync(marker), false, 'NO_LAUNCH=1 应抑制拉起');
  // 8b 未设 NO_LAUNCH → 假拉起执行（有 marker），证明 launch 路径真会拉起
  const home2 = newHome();
  const marker2 = join(home2, 'LAUNCHED');
  run(home2, ['--url', 'https://x.example'], { LUCA_OPEN_NO_LAUNCH: '', LUCA_OPEN_LAUNCH_CMD: `touch ${marker2}` });
  assert.equal(existsSync(marker2), true, '未设 NO_LAUNCH 时 launch 应执行');
  ok('U8 NO_LAUNCH 守卫抑制拉起 / 未设时拉起执行');
}

console.log(`\ntest-luca-open-url: ${passed} 项断言组全部通过`);
