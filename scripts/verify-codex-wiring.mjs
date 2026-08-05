#!/usr/bin/env node
// Codex 接线验收（2026-08-04）。分两段：
//   [静态] 不需要 ChatGPT 订阅，任何时候都能跑，验证接线本身完整。
//   [活体] 需要可用订阅——真跑一次 codex exec，确认 hook 在**真实 Codex session** 里触发。
//         订阅未恢复时自动跳过并显式标 BLOCKED，绝不用静态结果冒充端到端。
//
// 用法： node scripts/verify-codex-wiring.mjs         （自动判断能否跑活体段）
//        node scripts/verify-codex-wiring.mjs --static （只跑静态段）

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticOnly = process.argv.includes('--static');
let pass = 0, fail = 0, blocked = 0;
const ok = (n, c, extra = '') => { c ? (console.log(`PASS ${n}`), pass++) : (console.log(`FAIL ${n}${extra ? ' — ' + extra : ''}`), fail++); };
const skip = (n, why) => { console.log(`BLOCKED ${n} — ${why}`); blocked++; };

console.log('── [静态] 接线完整性 ──────────────────────────────────');

// S1 hooks.json
const hooksPath = join(ROOT, '.codex', 'hooks.json');
let hooks = null;
try { hooks = JSON.parse(readFileSync(hooksPath, 'utf8')); } catch { }
ok('S1 .codex/hooks.json 存在且是合法 JSON', !!hooks?.hooks);

// S2 六个生命周期事件齐全
const NEED = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd'];
const have = hooks ? Object.keys(hooks.hooks) : [];
ok('S2 六个事件全部注册', NEED.every((e) => have.includes(e)), `缺=${NEED.filter((e) => !have.includes(e))}`);

// S3 每个 hook 都经 adapter，且引用的脚本真实存在
{
  let bad = [];
  for (const ev of have) for (const g of hooks.hooks[ev]) for (const h of g.hooks) {
    if (!/codex-hook-adapter\.mjs/.test(h.command)) { bad.push(`${ev}:未走adapter`); continue; }
    const m = h.command.match(/\.claude\/hooks\/([a-z-]+\.mjs)/);
    if (!m || !existsSync(join(ROOT, '.claude', 'hooks', m[1]))) bad.push(`${ev}:脚本缺失`);
  }
  ok('S3 全部 hook 经 adapter 且目标脚本存在', bad.length === 0, bad.join(','));
}

// S4 上下文注入不被截断（0 = 完整直传）
{
  const lim = (e) => hooks?.hooks?.[e]?.[0]?.hooks?.[0]?.additionalContextLimit;
  ok('S4 SessionStart/UserPromptSubmit 设 additionalContextLimit=0（启动注入与路由提示不被 spill）',
    lim('SessionStart') === 0 && lim('UserPromptSubmit') === 0);
}

// S5 PreToolUse matcher 必须匹配 Codex 真实 tool_name，而非 CC 工具名
{
  const m = hooks?.hooks?.PreToolUse?.[0]?.matcher || '';
  ok('S5 PreToolUse matcher 用 Codex 的 shell/apply_patch（用 CC 名会静默永不触发）',
    /shell/.test(m) && /apply_patch/.test(m), `matcher=${m}`);
}

// S6 adapter 本体
ok('S6 .codex/codex-hook-adapter.mjs 存在且语法合法',
  existsSync(join(ROOT, '.codex', 'codex-hook-adapter.mjs'))
  && spawnSync('node', ['--check', join(ROOT, '.codex', 'codex-hook-adapter.mjs')]).status === 0);

// S7 skills 发现层：.agents/skills 软链全部可解析
{
  const dir = join(ROOT, '.agents', 'skills');
  let links = 0, broken = 0;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (!statSync(p, { throwIfNoEntry: false })) { broken++; continue; }
    if (existsSync(join(p, 'SKILL.md'))) links++; else broken++;
  }
  ok('S7 .agents/skills 下每个条目都能解析到 SKILL.md', broken === 0 && links >= 30, `可用=${links} 断=${broken}`);
}

// S8 subagent 定义
{
  const d = join(ROOT, '.codex', 'agents');
  const fs_ = existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.toml')) : [];
  ok('S8 .codex/agents/*.toml 已定义', fs_.length >= 3, `found=${fs_.length}`);
}

// S8b 档位一致性：.codex/agents/*.toml 的 effort 必须等于 model-routing.yaml 的 codex.agents
// （两处分散 = 迟早漂移；漂移的症状是"换个 CLI 就悄悄掉档"，不会报错）
{
  const yml = readFileSync(join(ROOT, '.claude', 'skill-os', 'model-routing.yaml'), 'utf8');
  const seg = yml.split(/^codex:/m)[1] || '';
  const agentsBlock = (seg.split(/^\s{2}agents:/m)[1] || '').split(/^\s{2}[a-z_]+:/m)[0] || '';
  const want = {};
  for (const m of agentsBlock.matchAll(/^\s{4}([a-z0-9-]+):\s*([a-z]+)/gm)) want[m[1]] = m[2];

  const dir = join(ROOT, '.codex', 'agents');
  let mismatch = [];
  for (const f of (existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.toml')) : [])) {
    const t = readFileSync(join(dir, f), 'utf8');
    const name = (t.match(/^name\s*=\s*"([^"]+)"/m) || [])[1];
    const eff = (t.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m) || [])[1];
    if (!name) { mismatch.push(`${f}:无name`); continue; }
    if (!eff) { mismatch.push(`${name}:未定档`); continue; }
    if (want[name] && want[name] !== eff) mismatch.push(`${name}:toml=${eff}≠yaml=${want[name]}`);
    if (!want[name]) mismatch.push(`${name}:yaml未登记`);
    // 模型名硬编码 = 把档位绑在会过期的凭证上（2026-08-04 实证）
    if (/^model\s*=/m.test(t)) mismatch.push(`${name}:硬编码了model名`);
  }
  ok('S8b subagent 档位与 model-routing.yaml 的 codex.agents 一致且无硬编码模型名',
    mismatch.length === 0, mismatch.join(','));
}

// S8c effort 值必须在**模型**接受集内。config 解析器接受 minimal 但真实模型 400 拒绝
// （2026-08-05 实测）——从 config 报错取枚举是个陷阱，此断言把实测结论钉死。
{
  const yml = readFileSync(join(ROOT, '.claude', 'skill-os', 'model-routing.yaml'), 'utf8');
  const seg = yml.split(/^codex:/m)[1] || '';
  const rejected = ((seg.match(/effort_rejected_by_model:\s*\[([^\]]*)\]/) || [])[1] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const used = [...seg.matchAll(/^\s{4}[a-z0-9-]+:\s*([a-z]+)\s*(?:#.*)?$/gm)].map((m) => m[1]);
  const bad = used.filter((v) => rejected.includes(v));
  let tomlBad = [];
  const dir = join(ROOT, '.codex', 'agents');
  for (const f of (existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.toml')) : [])) {
    const eff = (readFileSync(join(dir, f), 'utf8').match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m) || [])[1];
    if (eff && rejected.includes(eff)) tomlBad.push(`${f}=${eff}`);
  }
  const runnerBad = (readFileSync(join(ROOT, '.codex', 'workflow-runner.mjs'), 'utf8')
    .match(/TIER_TO_EFFORT\s*=\s*\{[^}]*\}/) || [''])[0]
    .split(/['"]/).filter((v) => rejected.includes(v));
  ok('S8c 所有 effort 取值都在模型接受集内（未用 config 层接受但模型拒绝的值）',
    rejected.length > 0 && bad.length === 0 && tomlBad.length === 0 && runnerBad.length === 0,
    `yaml=${bad} toml=${tomlBad} runner=${runnerBad} rejected=${rejected}`);
}

// S9 adapter 行为回归（真实 hook 端到端）
ok('S9 adapter 行为测试全绿（scripts/test-codex-adapter.mjs）',
  spawnSync('node', [join(ROOT, 'scripts', 'test-codex-adapter.mjs')], { cwd: ROOT }).status === 0);

// S9b Workflow 后端：Claude 的 Workflow 工具在 Codex 无对应物，靠 .codex/workflow-runner.mjs
// 把 agent() 接到 codex exec 上。缺它 = 月度治理能力（演进侦察/外部 skill 侦察）在 Codex 下消失。
ok('S9b workflow-runner 存在且两个 workflow 零改写可执行（scripts/test-workflow-runner.mjs）',
  existsSync(join(ROOT, '.codex', 'workflow-runner.mjs'))
  && spawnSync('node', [join(ROOT, 'scripts', 'test-workflow-runner.mjs')],
    { cwd: ROOT, timeout: 420000 }).status === 0);

// S10 Claude 侧零回归
ok('S10 Claude 路径零回归（test-harness + test-hooks）',
  spawnSync('node', [join(ROOT, 'scripts', 'test-harness.mjs')], { cwd: ROOT }).status === 0
  && spawnSync('node', [join(ROOT, 'scripts', 'test-hooks.mjs')], { cwd: ROOT }).status === 0);

console.log('\n── [活体] 真实 Codex session ──────────────────────────');

// L0 订阅/模型可用性 —— 这是活体段的闸
let liveReady = false;
if (staticOnly) {
  skip('L1-L3', '--static 模式');
} else if (spawnSync('codex', ['--version'], { encoding: 'utf8' }).status !== 0) {
  skip('L1-L3', 'codex CLI 不可用');
} else {
  const authPath = join(process.env.HOME || '', '.codex', 'auth.json');
  let plan = 'unknown';
  try {
    const t = JSON.parse(readFileSync(authPath, 'utf8')).tokens.id_token.split('.')[1];
    const c = JSON.parse(Buffer.from(t + '='.repeat((4 - t.length % 4) % 4), 'base64url').toString());
    plan = c['https://api.openai.com/auth']?.chatgpt_plan_type || 'unknown';
  } catch { }
  console.log(`   检测到 ChatGPT 计划: ${plan}`);
  if (plan === 'free') {
    skip('L1-L3', `账户为 ${plan} 计划，Codex 主力模型不可用 —— 订阅恢复后重跑本脚本`);
  } else liveReady = true;
}

if (liveReady) {
  // stdin 必须关闭：codex exec 在 stdin 未 EOF 时会一直等待（"Reading additional input
  // from stdin..."），表现为无限挂起。spawnSync 默认继承，故显式给空 input。
  const r = spawnSync('codex', ['exec', '--skip-git-repo-check', '-s', 'read-only',
    '--dangerously-bypass-hook-trust',
    '运行 shell 命令 `echo codex-wiring-probe` 并报告输出，不要修改任何文件。'],
    { cwd: ROOT, encoding: 'utf8', timeout: 300000, input: '' });
  const blob = String(r.stdout) + String(r.stderr);

  if (/not supported when using Codex with a ChatGPT account/.test(blob)) {
    skip('L1-L3', '服务端拒绝了配置的模型（订阅或 config.toml 的 model 需要修正）');
  } else {
    // L1 证据用 **Codex 自己的一手报告**（stderr 里的 `hook: <Event>` / `Completed`），
    // 不用 .session-* 文件差集 —— 后者取决于模型这一轮是否恰好调了工具、以及 sid 是否复用，
    // 同一份接线两次跑出过相反结论（2026-08-05），是不可靠的代理指标。
    const fired = [...blob.matchAll(/hook:\s*(\w+)/g)].map((m) => m[1]);
    ok('L1 真实 Codex session 中 hook 被调用（据 Codex 自身 stderr 报告）',
      fired.length > 0, `已触发=${[...new Set(fired)].join(',') || '无'}`);
    ok('L2 codex exec 正常结束（无 hook 导致的中断）', r.status === 0,
      `exit=${r.status} | ${(blob.match(/"message":\s*"([^"]{0,140})/) || [])[1] || ''}`);
    ok('L3 hook 未向 Codex 吐出它解析不了的内容（无 parser 报错）',
      !/unsupported updatedInput|hook returned/i.test(blob));
  }
}

console.log(`\n=== verify-codex-wiring: PASS=${pass} FAIL=${fail} BLOCKED=${blocked} ===`);
if (blocked > 0) console.log('注意：BLOCKED ≠ 通过。活体段未跑通前，不得声称 Codex 接线已端到端验证。');
process.exit(fail === 0 ? 0 : 1);
