#!/usr/bin/env node
// .codex/workflow-runner.mjs 的离线回归测试（2026-08-04）。
// 不调用真实模型（--dry-run），故与订阅状态无关。
// 守护的核心不变量：**workflow 脚本零改写即可在 Codex 后端执行**，且 agent 失败时
// 走 workflow 自己的降级路径，而不是炸掉整个 run。

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(ROOT, '.codex', 'workflow-runner.mjs');
const WF_DIR = join(ROOT, '.claude', 'workflows');
let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { c ? (console.log(`PASS ${n}`), pass++) : (console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`), fail++); };
const runDry = (name, timeout = 240000) =>
  spawnSync('node', [RUNNER, name, '--dry-run'], { cwd: ROOT, encoding: 'utf8', timeout });
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

ok('W0 runner 存在且语法合法',
  existsSync(RUNNER) && spawnSync('node', ['--check', RUNNER]).status === 0);

// ── W1/W2：两个真实 workflow 零改写跑通（覆盖 export 剥离 + meta 不重复声明）──
{
  const r = runDry('framework-evolution-scout');
  const out = parse(r.stdout);
  ok('W1 framework-evolution-scout 零改写可执行（无 SyntaxError）',
    r.status === 0 && out !== null, `exit=${r.status} stderr=${String(r.stderr).slice(-180)}`);
  ok('W1b 全 agent 失败时走 workflow 自身降级路径而非崩溃',
    !!out && typeof out === 'object' && 'error' in out, `out=${JSON.stringify(out).slice(0, 160)}`);
}
{
  const r = runDry('external-skill-scout');
  const out = parse(r.stdout);
  ok('W2 external-skill-scout 零改写可执行', r.status === 0 && out !== null,
    `exit=${r.status} stderr=${String(r.stderr).slice(-180)}`);
  // 多个 channel 都留下结果占位 = parallel() 跑完了全部 thunk，没有静默丢项
  const blob = JSON.stringify(out || '');
  ok('W2b parallel() 执行了全部 channel（无静默丢项）',
    (blob.match(/NO RESULT/g) || []).length >= 3, `out=${blob.slice(0, 200)}`);
}

// ── W3：parallel 的保序与失败收敛（runner 自实现部分，最易错，直测）──
{
  const probe = join(WF_DIR, '__probe_tmp.js');
  // 与真实 workflow 同形：带 export、带顶层 return
  writeFileSync(probe, `
export const meta = { name: '__probe_tmp' }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
phase('P')
const out = await parallel([
  () => sleep(60).then(() => 'a'),
  () => sleep(10).then(() => 'b'),
  () => { throw new Error('boom') },
  () => sleep(30).then(() => 'd'),
])
log('done')
return { out }
`);
  const r = spawnSync('node', [RUNNER, '__probe_tmp', '--dry-run'],
    { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  rmSync(probe, { force: true });
  const out = parse(r.stdout);
  ok('W3 parallel 保持输入顺序（乱序完成也不错位）',
    !!out && JSON.stringify(out.out) === JSON.stringify(['a', 'b', null, 'd']),
    `got=${JSON.stringify(out && out.out)}`);
  ok('W3b parallel 中单个 thunk 抛错收敛为 null，不炸整批',
    !!out && Array.isArray(out.out) && out.out.length === 4 && out.out[2] === null);
}

// ── W4：档位与沙箱纪律（防未来改动悄悄写死模型名 / 放开写权限）──
{
  const src = readFileSync(RUNNER, 'utf8');
  ok('W4 runner 以 model_reasoning_effort 定档，未硬编码模型名',
    /model_reasoning_effort/.test(src) && !/gpt-5[.\w-]*/.test(src.replace(/^\/\/.*$/gm, '')));
  ok('W4b runner 用 read-only 沙箱执行（把 workflow 的 propose-only 红线变成沙箱强制）',
    /'-s',\s*'read-only'/.test(src));
  ok('W4c 并发有上限（无节流会打爆速率限制，且 agent 失败是静默 falsy 极难归因）',
    /MAX_CONCURRENCY/.test(src));
}

console.log(`\n=== test-workflow-runner summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
