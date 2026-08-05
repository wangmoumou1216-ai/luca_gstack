#!/usr/bin/env node
// workflow-runner 的**运行时**回归测试（2026-08-05 深审新增）。
//
// 【为什么必须单独有这一份】
// 既有 scripts/test-workflow-runner.mjs 全部用 --dry-run，而 `if (DRY) return null` 在
// runCodex 之前短路 —— 独立评审用变异测试实证：把 agent() 改成 throw（违反核心契约）、
// 把 runCodex 首行改成直接抛错，**15/15 依旧全绿**。即 spawn / 沙箱参数 / effort 落地 /
// 超时与进程组 / stderr 捕获 / 退出码分支 / JSON 读回 / schema 写盘 的覆盖率是 **0%**，
// 而深审找到的三个 BLOCKER 全部住在这块。
//
// 本文件用一个**假 codex 可执行体**（放进 PATH 首位）真正驱动 runCodex，
// 从而在不烧真实 API token 的前提下覆盖上述路径。

import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, chmodSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(ROOT, '.codex', 'workflow-runner.mjs');
const WF_DIR = join(ROOT, '.claude', 'workflows');
let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { c ? (console.log(`PASS ${n}`), pass++) : (console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`), fail++); };

const sandbox = mkdtempSync(join(tmpdir(), 'wf-rt-'));
const binDir = join(sandbox, 'bin');
spawnSync('mkdir', ['-p', binDir]);

// 假 codex：按 FAKE_MODE 模拟不同行为。解析 -o 目标文件后写入结果。
function installFakeCodex(body) {
  const p = join(binDir, 'codex');
  writeFileSync(p, `#!/usr/bin/env node\n${body}\n`);
  chmodSync(p, 0o755);
}
const FAKE_HEADER = `
const args = process.argv.slice(2);
const oi = args.indexOf('-o'); const outFile = oi >= 0 ? args[oi + 1] : null;
const si = args.indexOf('--output-schema'); const schemaFile = si >= 0 ? args[si + 1] : null;
const fs = require('fs');
`;

// 用 runner 跑一个临时 workflow（非 dry-run，真正走 runCodex）
function runWF(scriptBody, env = {}) {
  const name = '__rt_probe';
  const f = join(WF_DIR, `${name}.js`);
  writeFileSync(f, scriptBody);
  const r = spawnSync('node', [RUNNER, name], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, ...env },
  });
  rmSync(f, { force: true });
  return r;
}
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

// ── G1 正常路径：runCodex 真的 spawn 并把结果解析回来 ────────────────────────
{
  installFakeCodex(`${FAKE_HEADER}
fs.writeFileSync(outFile, JSON.stringify({ ok: true, who: 'fake' }));
process.exit(0);`);
  const r = runWF(`phase('P'); const x = await agent('hi', { label: 'g1', schema: { type:'object', properties:{ok:{type:'boolean'}}, required:['ok'] } }); return { x };`);
  const o = parse(r.stdout);
  ok('G1 runCodex 真实执行并解析结果（非 dry-run 短路）', o?.x?.ok === true, `stdout=${String(r.stdout).slice(0, 120)}`);
  ok('G1b 成功计数递增', /ok=1 fail=0/.test(String(r.stderr)), String(r.stderr).match(/agent ok=\d+ fail=\d+/)?.[0]);
}

// ── G2 契约：任何异常都不得 throw，必须收敛成 null ───────────────────────────
{
  // 循环引用 schema：JSON.stringify 会抛；原实现在 Promise executor 里无 try/catch → reject
  installFakeCodex(`${FAKE_HEADER}\nfs.writeFileSync(outFile, '{}'); process.exit(0);`);
  const r = runWF(`
phase('P');
const s = { type:'object', properties:{ a:{type:'string'} }, required:['a'] };
s.properties.self = s;                       // 循环引用
let threw = false, val = 'unset';
try { val = await agent('hi', { label:'g2', schema: s }); } catch (e) { threw = true; }
return { threw, val };`);
  const o = parse(r.stdout);
  ok('G2 循环引用 schema 不抛异常（契约：失败=falsy 不是 throw）', o?.threw === false, `out=${JSON.stringify(o)}`);
}
{
  installFakeCodex(`${FAKE_HEADER}\nfs.writeFileSync(outFile, '{}'); process.exit(0);`);
  const r = runWF(`
phase('P');
let threw = false;
try { await agent('hi', { label:'g2b', schema: { type:'object', properties:{ n:{ type:'number', const: 1n } }, required:['n'] } }); }
catch { threw = true; }
return { threw };`);
  const o = parse(r.stdout);
  ok('G2b BigInt schema 不抛异常', o?.threw === false, `out=${JSON.stringify(o)}`);
}

// ── G3 退出码非 0 → null，且理由带上 API 报错 ───────────────────────────────
{
  installFakeCodex(`${FAKE_HEADER}
process.stderr.write(JSON.stringify({ error: { message: 'Invalid schema for response_format' } }));
process.exit(1);`);
  const r = runWF(`phase('P'); const x = await agent('hi', { label:'g3' }); return { x };`);
  const o = parse(r.stdout);
  ok('G3 子进程 exit≠0 → agent 返回 null（不 throw）', o !== null && o.x === null);
  ok('G3b 失败原因含 API 报错关键句（可归因，非静默）',
    /Invalid schema for response_format/.test(String(r.stderr)), String(r.stderr).slice(-160));
}

// ── G4 stdout 巨量输出不得挂死（M7：pipe 无消费者会阻塞到超时）──────────────
// 【区分性设计（2026-08-05 变异测试逼出）】首版假 codex 是 **Node** 写的，Node 会自动
// drain 管道 → 把 stdio 改回 'pipe' 时测试**照样绿**，是个安慰剂断言。
// 现改为：①用 **shell(dd)** 做非-Node 的阻塞写 ②**先写 stdout、后写结果文件**。
// 管道若无人消费而阻塞，结果文件就永远写不出来 → agent 得 null → 断言必红。
{
  const fakeSh = join(binDir, 'codex');
  writeFileSync(fakeSh, [
    '#!/bin/sh',
    'out=""; while [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then out="$2"; fi; shift; done',
    'dd if=/dev/zero bs=1024 count=2048 2>/dev/null | tr "\\0" "X"',   // 2MB 到 stdout
    'printf \'{"ok":true}\' > "$out"',                                   // 阻塞则永不执行
    'exit 0',
  ].join('\n') + '\n');
  chmodSync(fakeSh, 0o755);
  const t0 = Date.now();
  const r = runWF(`phase('P'); const x = await agent('hi', { label:'g4' }); return { x };`,
    { LUCA_WF_AGENT_TIMEOUT_MS: '15000' });
  const ms = Date.now() - t0;
  const o = parse(r.stdout);
  ok('G4 子进程(非-Node)写 2MB 到 stdout 后仍能写出结果（stdio 已设 ignore，管道不阻塞）',
    o?.x?.ok === true && ms < 12000, `ms=${ms} out=${JSON.stringify(o)}`);
}

// ── G5 超时杀整个进程组（M6：只杀直接子进程会留下孤儿孙进程）────────────────
{
  const marker = join(sandbox, 'grandchild-alive.txt');
  installFakeCodex(`${FAKE_HEADER}
const { spawn } = require('child_process');
// 孙进程：若存活到 8s 后会写 marker
spawn('sh', ['-c', 'sleep 8; echo alive > ${marker}'], { stdio: 'ignore' });
setInterval(() => {}, 1000);                                  // 自己不退出，等被杀
`);
  const r = runWF(`phase('P'); const x = await agent('hi', { label:'g5' }); return { x };`,
    { LUCA_WF_AGENT_TIMEOUT_MS: '2000' });
  const o = parse(r.stdout);
  ok('G5 超时后 agent 返回 null 且 runner 正常收尾', o !== null && o.x === null, `out=${JSON.stringify(o)}`);
  // 等过孙进程的存活窗口，确认它已被连带杀掉
  spawnSync('sleep', ['9']);
  ok('G5b 超时杀的是整个进程组（孙进程未存活）', !existsSync(marker),
    existsSync(marker) ? '孙进程活过了超时，成为孤儿' : '');
}

// ── G6 自由形态 object 端到端还原（B1 的真正修复点）─────────────────────────
{
  installFakeCodex(`${FAKE_HEADER}
const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
// 断言 runner 递交的 schema 已 strict 合规：自由形态 object 必须已转成 string
const disc = schema.properties.sources.items.properties.discovery;
const okType = disc.type === 'string' || (Array.isArray(disc.type) && disc.type.includes('string'));
fs.writeFileSync(outFile, JSON.stringify({
  schema_discovery_type_ok: okType,
  sources: [{ id: 's1', discovery: JSON.stringify({ method: 'gh-search', queries: ['a','b'] }) }],
}));
process.exit(0);`);
  const r = runWF(`
phase('P');
const x = await agent('hi', { label:'g6', schema: { type:'object', properties:{
  schema_discovery_type_ok: { type:'boolean' },
  sources: { type:'array', items: { type:'object', properties:{
    id: { type:'string' },
    discovery: { type:'object', description:'method + queries' },
  }, required:['id','discovery'] } },
}, required:['sources'] } });
return { x };`);
  const o = parse(r.stdout);
  ok('G6 自由形态 object 递交前已转 string（否则真实 API 400）',
    o?.x?.schema_discovery_type_ok === true, `out=${JSON.stringify(o).slice(0, 200)}`);
  ok('G6b 响应回来后自动解析还原成对象（结构化消费方可用 .method）',
    o?.x?.sources?.[0]?.discovery?.method === 'gh-search',
    `discovery=${JSON.stringify(o?.x?.sources?.[0]?.discovery)}`);
}

// ── G7 env 非法值不得导致静默空转（M4/M5）───────────────────────────────────
{
  installFakeCodex(`${FAKE_HEADER}\nfs.writeFileSync(outFile, JSON.stringify({ ok: true })); process.exit(0);`);
  for (const bad of ['0', '-1', 'abc']) {
    const r = runWF(`phase('P'); const xs = await parallel([1,2,3].map(i => () => agent('p'+i, { label:'g7' }))); return { ran: xs.filter(Boolean).length };`,
      { LUCA_WF_CONCURRENCY: bad });
    const o = parse(r.stdout);
    ok(`G7 LUCA_WF_CONCURRENCY=${bad} 仍全部执行（非静默零执行）`, o?.ran === 3, `ran=${o?.ran}`);
  }
}

// ── G8 顶层 export 剥离不得误伤模板字符串里的内容 ───────────────────────────
{
  installFakeCodex(`${FAKE_HEADER}\nfs.writeFileSync(outFile, JSON.stringify({ ok: true })); process.exit(0);`);
  const r = runWF([
    "export const meta = { name: '__rt_probe' }",
    'phase(\'P\')',
    'const sample = `',
    'export const fromTemplate = 1',
    '`',
    'return { keptExport: sample.includes("export const fromTemplate"), metaOk: typeof meta === "object" }',
  ].join('\n'));
  const o = parse(r.stdout);
  ok('G8 模板字符串里的行首 export 未被改写（prompt 文本不被污染）', o?.keptExport === true, `out=${JSON.stringify(o)}`);
  ok('G8b 真正的顶层 export 已剥离（脚本可执行）', o?.metaOk === true);
}

rmSync(sandbox, { recursive: true, force: true });
console.log(`\n=== test-workflow-runner-runtime summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
