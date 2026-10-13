#!/usr/bin/env node
// .codex/workflow-runner.mjs 的离线回归测试（2026-08-04）。
// 不调用真实模型（--dry-run），故与订阅状态无关。
// 守护的核心不变量：**workflow 脚本零改写即可在 Codex 后端执行**，且 agent 失败时
// 走 workflow 自己的降级路径，而不是炸掉整个 run。

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync, mkdirSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(ROOT, '.codex', 'workflow-runner.mjs');
const WF_DIR = join(ROOT, '.claude', 'workflows');
const callerFixtures = [];
const freezeCaller = () => {
  const root = mkdtempSync(join(tmpdir(),'workflow-runner-freeze-')); callerFixtures.push(root);
  const dir = join(root,'.claude/skill-os/evolution'); mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'adoption-log.jsonl'),'{"fused_candidate_id":"same/id"}\n\n{"fused_candidate_id":"same/id"}\n');
  const argv = [join(ROOT,'scripts/evolution-adoption-snapshot.mjs'),'--root',root,'--workflow-args','--date','2026-10'];
  const started_at = new Date().toISOString();
  const r = spawnSync(process.execPath,argv,{cwd:ROOT,encoding:'utf8',timeout:10000});
  const ended_at = new Date().toISOString();
  if (r.status !== 0) throw new Error(`caller CLI freeze failed: ${r.stderr}`);
  const path = join(root,'caller-args.json'); writeFileSync(path,r.stdout);
  const actual = readFileSync(path,'utf8'); if (actual !== r.stdout) throw new Error('caller freeze readback mismatch');
  console.log(JSON.stringify({kind:'CALLER_CLI_FREEZE_NOT_NATIVE',argv:[process.execPath,...argv],cwd:ROOT,started_at,ended_at,exit_code:r.status,path,sha256:createHash('sha256').update(actual).digest('hex'),root}));
  return {args:actual,root};
};
let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { c ? (console.log(`PASS ${n}`), pass++) : (console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`), fail++); };
const runDry = (name, timeout = 240000) => {
  const freeze = name === 'framework-evolution-scout' ? freezeCaller() : null;
  return spawnSync('node', [RUNNER, name, '--dry-run',...(freeze ? ['--args',freeze.args] : [])],
    { cwd: ROOT, encoding: 'utf8', timeout, env:{...process.env,...(freeze ? {LUCA_WF_WORK_ROOT:freeze.root} : {})} });
};
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
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'workflow-runner-dry-'));
  for (const dir of ['.codex', 'scripts', '.claude/workflows']) mkdirSync(join(fixtureRoot, dir), {recursive: true});
  for (const file of ['.codex/workflow-runner.mjs', 'scripts/model-route.mjs', 'scripts/model-route-host.mjs', 'scripts/evolution-adoption-snapshot.mjs']) copyFileSync(join(ROOT, file), join(fixtureRoot, file));
  const probe = join(fixtureRoot, '.claude/workflows/__probe_tmp.js');
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
  const r = spawnSync('node', [join(fixtureRoot, '.codex/workflow-runner.mjs'), '__probe_tmp', '--dry-run'],
    { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  rmSync(fixtureRoot, {recursive: true, force: true});
  const out = parse(r.stdout);
  ok('W3 parallel 保持输入顺序（乱序完成也不错位）',
    !!out && JSON.stringify(out.out) === JSON.stringify(['a', 'b', null, 'd']),
    `got=${JSON.stringify(out && out.out)}`);
  ok('W3b parallel 中单个 thunk 抛错收敛为 null，不炸整批',
    !!out && Array.isArray(out.out) && out.out.length === 4 && out.out[2] === null);
}

// ── W4：共同模型路由与沙箱纪律 ─────────────────────────────────────────────
{
  const src = readFileSync(RUNNER, 'utf8');
  ok('W4 runner 通过共同 resolver 选择显式 model，且不注入 reasoning effort',
    /resolveDispatchScene/.test(src) && /model:\s*route\.requested_model/.test(src)
    && !/model_reasoning_effort/.test(src) && !/effort:\s*["'`]/.test(src));
  // 【2026-08-05 红队裁决的回归门】沙箱取舍不是二选一：codex 的读全局、只有写受工作根约束，
  // 故 -C <scratch> + workspace-write + network_access 同时拿到「网络通」与「仓库写被硬拦」。
  // 这三件必须同时在场——少任一件就退回被否决的形态：
  //   缺 -C        → 工作根是仓库，模型可写 .claude/skills、memory（实测可写）
  //   缺 network   → 发现层 16+12 处 gh 全废，静默产出零候选
  //   缺白名单校验 → danger-full-access 可被直接设进逃生舱
  ok('W4b app-server thread/turn 工作根隔离到 scratch，仓库不在可写面内',
    /cwd:\s*AGENT_CWD/.test(src) && /const AGENT_CWD = join\(tmp,/.test(src));
  ok('W4b2 workspace-write 档必须同时开 networkAccess（否则发现层全废）',
    /networkAccess:\s*true/.test(src));
  ok('W4b3 沙箱档有白名单校验且不含 danger-full-access',
    /SANDBOX_ALLOWED\s*=\s*\['read-only',\s*'workspace-write'\]/.test(src)
    && !/danger-full-access/.test(src.replace(/^\s*\/\/.*$/gm, '')));
  ok('W4b4 prompt 前缀告知 REPO_ROOT（工作根非仓库，否则相对路径读不到文件）',
    /REPO_ROOT=\$\{ROOT\}/.test(src));
  ok('W4c 并发有上限（无节流会打爆速率限制，且 agent 失败是静默 falsy 极难归因）',
    /MAX_CONCURRENCY/.test(src));
  ok('W4d 取消停止后续调度并终止已启动的子进程组',
    /process\.kill\(-pid,\s*'SIGKILL'\)/.test(src)
    && /\['SIGINT',\s*'SIGTERM',\s*'SIGHUP'\]/.test(src)
    && /child\.kill\('SIGTERM'\)/.test(src));
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

// Bad CLI JSON must never broaden to the default sweep or reach agent dispatch.
for (const tail of [['--args'], ['--args','--dry-run'], ['--args','{bad'], ['--args','{}','--args','{}']]) {
  const r=spawnSync('node',[RUNNER,'framework-evolution-scout','--dry-run',...tail],{encoding:'utf8',timeout:10000});
  ok(`W6 reject malformed args ${JSON.stringify(tail)}`,r.status===2 && !/runner: agent/.test(r.stderr),r.stderr);
}
for (const raw of ['null', '[]', '1']) {
  const r=spawnSync('node',[RUNNER,'framework-evolution-scout','--dry-run','--args',raw],{encoding:'utf8',timeout:10000});
  ok(`W6 reject non-object args ${raw}`,r.status===1 && /workflow args must be an object/.test(r.stderr)
    && /agent ok=0 fail=0/.test(r.stderr) && !r.stdout.trim(),r.stderr);
}
for (const [name,value] of [['framework-evolution-scout',null],['external-skill-scout','testing']]) {
  const freeze=name==='framework-evolution-scout'?freezeCaller():null;
  const r=spawnSync('node',[RUNNER,name,'--dry-run','--args',freeze?freeze.args:JSON.stringify(value)],
    {encoding:'utf8',timeout:10000,env:{...process.env,...(freeze?{LUCA_WF_WORK_ROOT:freeze.root}:{})}});
  ok(`W6 valid args ${name}`,r.status===0 && parse(r.stdout)!==null,r.stderr);
}
{
  const r=spawnSync('node',[RUNNER,'framework-evolution-scout','--dry-run','--args','{}'],{encoding:'utf8',timeout:10000});
  ok('W6 missing caller freeze refuses before any agent',r.status===1 && /caller snapshot does not match live ledger|requires caller CLI freeze/.test(r.stderr)
    && /agent ok=0 fail=0/.test(r.stderr) && !r.stdout.trim(),r.stderr);
}
{
  const freeze = freezeCaller();
  const make = () => JSON.parse(freeze.args);
  const forgedHash = make(); forgedHash.adoption_snapshot.sha256 = 'f'.repeat(64);
  const forgedEntries = make(); forgedEntries.adoption_snapshot.entries = [];
  const mixed = make(); mixed.target_repos = ['owner/one'];
  for (const [label, args] of [['forged hash', forgedHash], ['forged entries', forgedEntries], ['mixed punctual+sweep', mixed]]) {
    const r = spawnSync('node', [RUNNER, 'framework-evolution-scout', '--dry-run', '--args', JSON.stringify(args)], {
      cwd: ROOT, encoding: 'utf8', timeout: 10000, env: { ...process.env, LUCA_WF_WORK_ROOT: freeze.root },
    });
    ok(`W7 ${label} rejected before agent`, r.status === 1 && /agent ok=0 fail=0/.test(r.stderr)
      && /does not match live ledger|不得混用/.test(r.stderr), r.stderr);
  }
  callerFixtures.push(freeze.root);
}
for(const root of callerFixtures) {
  if(fail || process.env.U3_KEEP_TEST_ROOT) console.log('RETAINED_CALLER_FIXTURE='+root);
  else rmSync(root,{recursive:true,force:true});
}
console.log(`\n=== test-workflow-runner summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
