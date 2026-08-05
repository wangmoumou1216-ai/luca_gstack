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
  // 【2026-08-05 红队裁决的回归门】沙箱取舍不是二选一：codex 的读全局、只有写受工作根约束，
  // 故 -C <scratch> + workspace-write + network_access 同时拿到「网络通」与「仓库写被硬拦」。
  // 这三件必须同时在场——少任一件就退回被否决的形态：
  //   缺 -C        → 工作根是仓库，模型可写 .claude/skills、memory（实测可写）
  //   缺 network   → 发现层 16+12 处 gh 全废，静默产出零候选
  //   缺白名单校验 → danger-full-access 可被直接设进逃生舱
  ok('W4b 工作根隔离到 scratch（-C AGENT_CWD），仓库不在可写面内',
    /'-C',\s*AGENT_CWD/.test(src) && /const AGENT_CWD = join\(tmp,/.test(src));
  ok('W4b2 workspace-write 档必须同时开 network_access（否则发现层全废）',
    /sandbox_workspace_write\.network_access=true/.test(src));
  ok('W4b3 沙箱档有白名单校验且不含 danger-full-access',
    /SANDBOX_ALLOWED\s*=\s*\['read-only',\s*'workspace-write'\]/.test(src)
    && !/danger-full-access/.test(src.replace(/^\s*\/\/.*$/gm, '')));
  ok('W4b4 prompt 前缀告知 REPO_ROOT（工作根非仓库，否则相对路径读不到文件）',
    /REPO_ROOT=\$\{ROOT\}/.test(src));
  ok('W4c 并发有上限（无节流会打爆速率限制，且 agent 失败是静默 falsy 极难归因）',
    /MAX_CONCURRENCY/.test(src));
}

// ── W5：schema strict 归一化（2026-08-05 实测 BLOCKER 的回归门）──
// 不归一化 → codex 返回 400 invalid_json_schema → 每个 agent 静默返回 null →
// workflow 照常跑完但产出恒空。属"不报错的错"，必须有断言守住。
{
  const src = readFileSync(join(ROOT, '.codex', 'workflow-runner.mjs'), 'utf8');
  ok('W5 runner 在写 schema 前做 strict 归一化', /strictifySchema\(schema,\s*freeform\)/.test(src));

  // 注意：runner 是**脚本**不是模块，绝不能 import 它——import 会执行它并 process.exit，
  // 直接打断本测试进程（本行曾如此翻车）。取函数体受控求值是唯一安全取法。
  const sample = {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'string' } }, required: ['x'] },
      c: { type: 'array', items: { type: 'object', properties: { z: { type: 'string' } } } },
      d: { type: 'object', description: '自由形态：真实 schema 里 discovery 就是这形状' },
    },
    required: ['a'],
  };
  // 独立实现同规则做交叉校验（不复用被测函数，避免自证）
  const check = (n, path = '$') => {
    const errs = [];
    if (!n || typeof n !== 'object') return errs;
    if (n.properties) {
      const keys = Object.keys(n.properties);
      const req = Array.isArray(n.required) ? n.required : [];
      for (const k of keys) if (!req.includes(k)) errs.push(`${path}.required 缺 ${k}`);
      if (n.additionalProperties !== false) errs.push(`${path}.additionalProperties 未设 false`);
      for (const k of keys) errs.push(...check(n.properties[k], `${path}.${k}`));
    } else if (n.type === 'object' || (Array.isArray(n.type) && n.type.includes('object'))) {
      // 【本行是 BLOCKER-1 的回归门】原 check() 只在有 properties 时才查，与实现共享同一盲点，
      // 于是真实 schema 里那个自由形态 object 双方都放过、真实 API 却 400。
      // 交叉校验必须能抓到实现的盲点，否则它不是独立校验，只是同一个错误的第二份拷贝。
      errs.push(`${path} 是自由形态 object（strict 无法表达）——须转 string 或补 properties`);
    }
    if (n.items) errs.push(...check(n.items, `${path}[]`));
    return errs;
  };
  // 从 runner 源码里取出函数体求值（runner 无导出，故用受控 eval 而非 import 执行整脚本）
  let strictify = null;
  const m = src.match(/function strictifySchema[\s\S]*?\n\}\n/);
  if (m) { try { strictify = new Function(`${m[0]}; return strictifySchema;`)(); } catch { } }
  ok('W5b 归一化函数可独立求值（源码结构未被破坏）', typeof strictify === 'function');
  if (typeof strictify === 'function') {
    const norm = strictify(sample);
    const errs = check(norm);
    ok('W5c 归一化输出满足 OpenAI strict 三要求（含嵌套与数组元素）',
      errs.length === 0, errs.slice(0, 4).join('; '));
    ok('W5d 原可选字段转为 nullable（保住"可以没有"的语义，不是强行必填）',
      Array.isArray(norm.properties.b.type) && norm.properties.b.type.includes('null')
      && Array.isArray(norm.properties.b.properties.y.type)
      && norm.properties.b.properties.y.type.includes('null'));
    ok('W5e 原必填字段不被改成 nullable',
      norm.properties.a.type === 'string' && norm.properties.b.properties.x.type === 'number');
  }
}

console.log(`\n=== test-workflow-runner summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
