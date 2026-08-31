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
const ciMode = process.argv.includes('--ci');
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
  // 注意查的是**每个 group**而非只查第一个：2026-08-07 起 UserPromptSubmit 挂了两条
  // （route-guard + sidebar-focus），只查 [0] 会让后加的条目漏检、被默认值悄悄截断。
  const limsOf = (e) => (hooks?.hooks?.[e] || []).flatMap((g) => (g.hooks || []).map((h) => h.additionalContextLimit));
  const bad = [];
  for (const e of ['SessionStart', 'UserPromptSubmit']) {
    const ls = limsOf(e);
    if (!ls.length || ls.some((v) => v !== 0)) bad.push(`${e}=${JSON.stringify(ls)}`);
  }
  ok('S4 SessionStart/UserPromptSubmit 的**每个** hook 都设 additionalContextLimit=0（0=完整直传，语义反直觉）',
    bad.length === 0, bad.join(' '));
}

// S5 matcher 必须匹配 **实测** tool_name。2026-08-05 用 matcher='.*' 抓真实载荷：
//   shell 执行 → tool_name='Bash'（**不是 'shell'**）；文件编辑 → 'apply_patch'。
// 初版据文档写 `^(shell|apply_patch)$`，PreToolUse/PostToolUse 因此**永远不触发**——
// 即项目隔离强制（project-scope-guard）在 Codex 下完全失效，且静默无声。
// 本断言现在守实测值；PostToolUse 同样要匹配，否则编辑计数链断。
{
  // 2026-08-05 评审绕过实证：matcher 写成 `^(Bash|apply_patch)$never`（含全部关键词但
  // **永不匹配任何 tool_name**）时本断言照样 PASS —— 查子串存在性守不住"正则真能用"。
  // 而这**正是 56500da 修的那一类 bug**。改为拿实测 tool_name 真跑一遍这个正则。
  const need = (m) => {
    try {
      const re = new RegExp(m);
      return re.test('Bash') && re.test('apply_patch') && !re.test('shell');
    } catch { return false; }
  };
  const pre = hooks?.hooks?.PreToolUse?.[0]?.matcher || '';
  const post = hooks?.hooks?.PostToolUse?.[0]?.matcher || '';
  ok('S5 Pre/PostToolUse matcher 用实测 tool_name（Bash|apply_patch；写 shell 永不触发）',
    need(pre) && need(post), `pre=${pre} post=${post}`);
}

// S5b Codex 复用既有已授信 project-scope entry；新增 entry 会改变 trust currentHash，
// 在未授权写 ~/.codex/config.toml 的正常 fresh session 中被静默跳过。
{
  const codexPre = (hooks?.hooks?.PreToolUse || []).flatMap((group) => group.hooks || []);
  const projectScope = codexPre.find((hook) => /project-scope-guard\.mjs/.test(hook.command || ''));
  const accidentalSecondEntry = codexPre.find((hook) => /controlled-change-guard\.mjs/.test(hook.command || ''));
  const adapterSource = readFileSync(join(ROOT, '.codex', 'codex-hook-adapter.mjs'), 'utf8');
  let claude = null;
  try { claude = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8')); } catch { }
  const claudePre = (claude?.hooks?.PreToolUse || []).flatMap((group) => group.hooks || []);
  const claudeControlled = claudePre.find((hook) => /controlled-change-guard\.mjs/.test(hook.command || ''));
  const wrapperSafe = (command) => Boolean(command
    && /hook-failure-decision/.test(command)
    && /exit 2/.test(command)
    && !/controlled-change-guard[^\n]*\|\|\s*true/.test(command));
  const chained = /project-scope-guard/.test(adapterSource)
    && /controlled-change-guard\.mjs/.test(adapterSource)
    && /hook-failure-decision/.test(adapterSource);
  ok('S5b Claude 直接注册 controlled-change；Codex 不新增 trust entry而由既有 project-scope entry 在 adapter 内串行强制',
    Boolean(projectScope && !accidentalSecondEntry && chained && claudeControlled && wrapperSafe(claudeControlled.command)),
    `projectScope=${Boolean(projectScope)} accidentalSecondEntry=${Boolean(accidentalSecondEntry)} chained=${chained} claudeControlled=${Boolean(claudeControlled)}`);
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
  // 2026-08-05 评审绕过实证：禁令清单与被查对象**在同一个文件**里，把
  // effort_rejected_by_model 改成 [nonexistent-value] 再把 mechanical 改回 minimal → 照样 PASS。
  // 自证式门禁不是门禁。故把**实测结论**硬编码在检查脚本这一侧（改 yaml 无法松动它），
  // 同时仍要求 yaml 自己也登记（两侧都得对）。
  const REJECTED_BY_MODEL = ['minimal'];   // 实测：真实模型 400 unsupported_value
  const declared = ((seg.match(/effort_rejected_by_model:\s*\[([^\]]*)\]/) || [])[1] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const rejected = [...new Set([...REJECTED_BY_MODEL, ...declared])];
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
  const declaredOk = REJECTED_BY_MODEL.every((v) => declared.includes(v));
  ok('S8c 所有 effort 取值都在模型接受集内，且 yaml 已登记实测禁用值（脚本侧硬编码，改 yaml 松不动）',
    declaredOk && bad.length === 0 && tomlBad.length === 0 && runnerBad.length === 0,
    `yaml=${bad} toml=${tomlBad} runner=${runnerBad} 未登记=${REJECTED_BY_MODEL.filter((v) => !declared.includes(v))}`);
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

// S9c workflow-runner **运行时**覆盖（2026-08-05 深审 M-8）：既有 test-workflow-runner
// 全用 --dry-run，`if (DRY) return null` 在 runCodex 前短路 → spawn/超时/进程组/schema 写盘/
// 退出码分支覆盖率为 0%，而三个 BLOCKER 全住在那块。本套用假 codex 二进制真跑该路径。
ok('S9c workflow-runner 运行时测试全绿（scripts/test-workflow-runner-runtime.mjs）',
  spawnSync('node', [join(ROOT, 'scripts', 'test-workflow-runner-runtime.mjs')],
    { cwd: ROOT, timeout: 420000 }).status === 0);

// S10 Claude 侧零回归
ok('S10 Claude 路径零回归（test-harness + test-hooks）',
  spawnSync('node', [join(ROOT, 'scripts', 'test-harness.mjs')], { cwd: ROOT }).status === 0
  && spawnSync('node', [join(ROOT, 'scripts', 'test-hooks.mjs')], { cwd: ROOT }).status === 0);

// S11 【2026-08-06 二次修正——上一轮的 S11 把错误架构钉成了回归测试】
// 曾断言「必须并入用户级 ~/.codex/hooks.json，因为仓库级不被加载」。**那个前提是假的**：
// hooks.json 顶层只接受 `description` 与 `hooks`，我写的 `_comment` 键让整份文件被拒
// （`unknown field _comment`），而该警告只在会话启动时一闪而过。改名后 hooks/list
// 立刻从 7 条变 13 条（user 7 + project 6）。⇒ 仓库级完全可用，配置随版本控制走，
// 不需要全局注册、也就没有跨项目污染。本断言改为守正确架构。
{
  const top = hooks ? Object.keys(hooks) : [];
  const illegal = top.filter((k) => k !== 'description' && k !== 'hooks');
  ok('S11 .codex/hooks.json 顶层只用 description/hooks（多一个自定义键 → 整份文件被拒且警告一闪而过）',
    illegal.length === 0,
    `非法顶层键=${illegal.join(',')}（Codex 只接受 description 与 hooks）`);

  // 纵深：确认全局配置里**没有**本仓条目——仓库级可用后再全局注册就是跨项目污染
  let globalHasOurs = false;
  try {
    globalHasOurs = /codex-hook-adapter/.test(
      readFileSync(join(process.env.HOME || '', '.codex', 'hooks.json'), 'utf8'));
  } catch { }
  ok('S11b 未在用户级 ~/.codex/hooks.json 重复注册（仓库级已够；全局注册会污染其它项目）',
    !globalHasOurs,
    '全局配置里发现本仓 adapter 条目 —— 仓库级已可用，应移除以免在其它项目里空跑');
}

// S12 授信门：Codex 对**每个条目**单独要求授信，未授信时静默跳过（实测：日志零增长）。
// 注册 ≠ 生效，S11 全绿而 S12 红时 hook 一个都不会跑。
{
  if (ciMode) {
    ok('S12 CI 不伪验用户级 trust state（仓库结构由 S1-S11 验证）', true);
  } else {
    const cfg = join(process.env.HOME || '', '.codex', 'config.toml');
    let trusted = [];
    try {
      trusted = [...readFileSync(cfg, 'utf8').matchAll(/\[hooks\.state\."([^"]+)"\]/g)].map((m) => m[1]);
    } catch { }
    // 仓库级条目的 trust key 以本仓 hooks.json 绝对路径为前缀
    const ourPath = join(ROOT, '.codex', 'hooks.json');
    const mine = trusted.filter((k) => k.startsWith(ourPath + ':'));
    const evToSnake = (e) => e.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    let needKeys = [];
    for (const [ev, groups] of Object.entries(hooks?.hooks || {})) {
      groups.forEach((grp, gi) => (grp.hooks || []).forEach((h, hi) => {
        if (/codex-hook-adapter/.test(h.command || '')) needKeys.push(`${ourPath}:${evToSnake(ev)}:${gi}:${hi}`);
      }));
    }
    const missing = needKeys.filter((k) => !mine.includes(k));
    ok('S12 本仓 hook 已获授信（未授信时 Codex 静默跳过，hook 一个都不会跑）',
      needKeys.length > 0 && missing.length === 0,
      missing.length
        ? `未授信 ${missing.length}/${needKeys.length} 条。修复：node scripts/codex-trust-hooks.mjs`
          + `（先 --dry-run 过目；它用 Codex 自己的 hooks/list + config/batchWrite，只碰本仓条目）`
        : `已授信 ${needKeys.length}/${needKeys.length} 条`);
  }
}

// S13 【2026-08-06 真实使用终验发现】Codex 沙箱只约束**写**，且限死在工作根内。
// luca_gstack 有两类必须写在工作根之外的路径，缺了就 `Operation not permitted` 静默打断：
//   · MEMORY_ROOT（母版仓）—— 缺它则**整个记忆写入路径在 Codex 下是断的**（读正常、写全废）
//   · ~/.luca/**（muse app IPC spool）—— 缺它则 luca-open/luca-sidebar 全失效
// 二者都只在**真实使用**时暴露：测试套件全绿、hook 全触发，照样坏。
{
  const cfgPath = join(ROOT, '.codex', 'config.toml');
  let toml = '';
  try { toml = readFileSync(cfgPath, 'utf8'); } catch { }
  const roots = ((toml.match(/writable_roots\s*=\s*\[([^\]]*)\]/) || [])[1] || '');
  // MEMORY_ROOT 以 hooks.json 里内联的值为准（单真值源，避免两处漂移）
  const memRoot = (() => {
    try {
      const blob = readFileSync(join(ROOT, '.codex', 'hooks.json'), 'utf8');
      return (blob.match(/MEMORY_ROOT=([^\s"\\]+)/) || [])[1] || '';
    } catch { return ''; }
  })();
  const missing = [];
  if (memRoot && !roots.includes(memRoot)) missing.push(`MEMORY_ROOT(${memRoot})`);
  // 全局个人记忆（三分表第一层：feedback_*.md / MEMORY.md）——2026-08-06 同类扫描补入。
  // 少了它，person 层记忆写入在 Codex 下静默失败（实测 os.access W_OK = False）。
  if (!/\.claude\/projects\/[^"']*memory/.test(roots)) missing.push('~/.claude/projects/<repo>/memory（全局个人记忆）');
  if (!/\.luca/.test(roots)) missing.push('~/.luca（muse app IPC spool）');
  // PROJECTS_ROOT（skill 产出 + 流程状态）——2026-08-06 运行时探针补入。docs/·workflow-state·
  // current-topic 是软链，目标在工作根之外；脚本里只出现相对路径，故上一轮的绝对路径扫法结构上
  // 扫不到。取值以 project.sh 的默认根为单真值源（同 memRoot 取自 hooks.json，避免两处漂移）。
  const projRoot = (() => {
    try {
      const blob = readFileSync(join(ROOT, 'scripts', 'project.sh'), 'utf8');
      const raw = (blob.match(/PROJECTS_ROOT="\$\{LUCA_PROJECTS_ROOT:-([^}"]+)\}"/) || [])[1] || '';
      return raw.replace(/^\$HOME/, process.env.HOME || '');
    } catch { return ''; }
  })();
  if (projRoot && !roots.includes(projRoot)) missing.push(`PROJECTS_ROOT(${projRoot})（skill 产出 + 流程状态，软链目标）`);
  ok('S13 .codex/config.toml 的 writable_roots 覆盖工作根之外的必写路径（记忆 store + app spool + 产出根）',
    !!toml && missing.length === 0,
    !toml ? '缺 .codex/config.toml' : `writable_roots 缺: ${missing.join(', ')} —— 缺失时表现为静默 Operation not permitted`);
}

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
  const liveLogBefore = (() => { try { return statSync('/tmp/luca-gstack-hooks.log').size; } catch { return 0; } })();
  const r = spawnSync('codex', ['exec', '--skip-git-repo-check', '-s', 'read-only',
    '--dangerously-bypass-hook-trust',
    '运行 shell 命令 `echo codex-wiring-probe` 并报告输出，不要修改任何文件。'],
    { cwd: ROOT, encoding: 'utf8', timeout: 300000, input: '' });
  const blob = String(r.stdout) + String(r.stderr);

  if (/not supported when using Codex with a ChatGPT account/.test(blob)) {
    skip('L1-L3', '服务端拒绝了配置的模型（订阅或 config.toml 的 model 需要修正）');
  } else {
    // 【L1 判据两度返工，此为第三版——前两版都是假证据】
    //  v1 用 .session-* 文件差集：取决于模型这轮是否恰好调工具、sid 是否复用，两次跑出相反结论。
    //  v2 改用 Codex stderr 的 `hook: <Event>` 行——**同样是假的**：独立评审证明该行由
    //     ~/.codex/hooks.json 里既存的第三方 hook（adrafinil）产生，在一个完全没有
    //     luca_gstack 配置的空目录里也照样打印。据此判"我们的 hook 触发了"是彻头彻尾的误判。
    //  v3（本版）唯一可信判据：**只有本仓 hook 才可能产生的副作用**。用 luca-marker：
    //     adapter 在 inRepo 命中时会把 LUCA_HARNESS_ADAPTED 传给子 hook，子 hook 的 stderr
    //     经 hooks.json 重定向进 /tmp/luca-gstack-hooks.log —— 该日志增长是本仓专属证据。
    //  教训同族：证据必须能**区分**"我的东西生效了"与"某个东西生效了"。
    const logPath = '/tmp/luca-gstack-hooks.log';
    const sizeAfter = (() => { try { return statSync(logPath).size; } catch { return 0; } })();
    const grew = sizeAfter > liveLogBefore;
    const markerHit = /codex-adapter|luca_gstack/.test(blob);
    ok('L1 真实 Codex session 中**本仓** hook 被调用（本仓专属副作用，非泛化 hook: 行）',
      grew || markerHit,
      `日志 ${liveLogBefore}→${sizeAfter}B${grew ? '' : '（未增长）'}；`
      + `本仓标记=${markerHit}；`
      + `仓库级 hooks.json 已受支持；若未增长，优先检查本仓条目授信与启动时 schema 警告，`
      + `不得复制到用户级造成跨项目污染`);
    ok('L2 codex exec 正常结束（无 hook 导致的中断）', r.status === 0,
      `exit=${r.status} | ${(blob.match(/"message":\s*"([^"]{0,140})/) || [])[1] || ''}`);
    ok('L3 hook 未向 Codex 吐出它解析不了的内容（无 parser 报错）',
      !/unsupported updatedInput|hook returned/i.test(blob));
  }
}

console.log(`\n=== verify-codex-wiring: PASS=${pass} FAIL=${fail} BLOCKED=${blocked} ===`);
if (blocked > 0) console.log('注意：BLOCKED ≠ 通过。活体段未跑通前，不得声称 Codex 接线已端到端验证。');
process.exit(fail === 0 ? 0 : 1);
