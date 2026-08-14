#!/usr/bin/env node
// harness 检测 + 能力探针回归（P0 / WS-A0，2026-07-25）。
// 核心不变量：decision:block / permissionDecision:deny / updatedInput 是 Claude/Codex 共享
// 控制面，三态都保留结构化强制；只有 Workflow 与 AskUserQuestion widget 仍只对 Claude 开放。
// E1-E4 是**端到端接线断言**：spawn 真 hook 验证该门确实作用于生产 emitter（首版只测纯函数，
// 导致 harness.mjs 零生产调用者而门 100% 永绿）。
import { detectHarness, capabilities, canEmitControlVerb, HARNESS } from '../.claude/hooks/lib/harness.mjs';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// ① 三态检测
ok('H1 CLAUDE_PROJECT_DIR 在 → claude', detectHarness({ CLAUDE_PROJECT_DIR: '/x' }) === HARNESS.CLAUDE);
ok('H2 CODEX_* 在 → codex', detectHarness({ CODEX_HOME: '/y' }) === HARNESS.CODEX);
ok('H3 都不在 → unknown（不猜）', detectHarness({}) === HARNESS.UNKNOWN);

// ② 共享控制面：三态都可原样输出强制动词
ok('H4 claude → canEmitControlVerb=true', canEmitControlVerb({ CLAUDE_PROJECT_DIR: '/x' }) === true);
ok('H5 codex → canEmitControlVerb=true（共享结构化控制面）', canEmitControlVerb({ CODEX_HOME: '/y' }) === true);
// 深审修正：unknown 多为 CLAUDE_PROJECT_DIR 被剥的 Claude 会话；关掉会静默丢失主路径治理强制
// （Stop 不再拦、PreToolUse 不再 deny），比在未知 harness 多吐一行 JSON 严重得多 → 失效方向偏向保住强制。
ok('H6 unknown → canEmitControlVerb=true（失效方向偏向保住强制）', canEmitControlVerb({}) === true);

// ③ 能力表：治理控制面三态全开；交互/Workflow widget 仍只在 Claude 开
{
  const c = capabilities(HARNESS.CODEX);
  ok('H7a codex: block/write/input 强制面开，workflow/askUser 关',
    c.blockVerb && c.writeHook && c.inputMutation && !c.workflow && !c.askUserWidget
      && c.stopVerbDialect === 'shared');
}
{
  const c = capabilities(HARNESS.UNKNOWN);
  ok('H7b unknown: 强制动词保留（保住强制），但 workflow/askUser 仍关（吐了也没人能执行）',
    c.blockVerb && c.writeHook && c.inputMutation && !c.workflow && !c.askUserWidget);
}
{
  const c = capabilities(HARNESS.CLAUDE);
  ok('H8 claude: CC 专有原语全开', c.blockVerb && c.writeHook && c.inputMutation && c.workflow && c.askUserWidget);
}

// ── [深审 BLOCKER 修复] 端到端接线断言：harness 门必须真作用于**生产 emitter** ──
// 首版只测纯函数 → harness.mjs 零生产调用者、S30 100% 永绿（守着不存在的不变量）。
// 两个强制动词出口（session-sync 的 decision:block / project-scope-guard 的
// permissionDecision:deny）都经 canEmitControlVerb 门控；此处 spawn 真 hook 验证双端结构化输出。
{
  const { spawnSync } = await import('child_process');
  const { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { fileURLToPath } = await import('url');
  const REPO = fileURLToPath(new URL('..', import.meta.url));
  const D = 'do' + 'cs';

  const root = mkdtempSync(join(tmpdir(), 'harness-e2e-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
  mkdirSync(join(root, '项目', 'p1', D), { recursive: true });
  symlinkSync(join(root, '项目', 'p1', D), join(root, D));
  writeFileSync(join(root, '.claude', 'workflow-state.yaml'), 'topic: "t"\nnodes:\n  n1:\n    status: IN_PROGRESS\niteration: 1\n');
  for (const sid of ['e2e-c', 'e2e-x']) {
    writeFileSync(join(root, '.claude', `.session-edit-count-${sid}`), '9');
    writeFileSync(join(root, '.claude', `.session-tool-count-${sid}`), '25');
  }
  const base = { PATH: process.env.PATH, HOME: join(root, 'home'), LANG: 'en_US.UTF-8' };
  const SYNC = join(REPO, '.claude/hooks/session-sync.mjs');
  const GUARD = join(REPO, '.claude/hooks/project-scope-guard.mjs');

  // ① Claude：block JSON 照常
  const rC = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'e2e-c' }),
  });
  ok('E1 [接线] session-sync @claude → stdout 仍是 decision:block JSON（零回归）',
    /"decision"\s*:\s*"block"/.test(rC.stdout || ''), `stdout=${(rC.stdout || '').slice(0, 60)}`);

  // ② Codex：与 Claude 同样输出 decision:block
  const rX = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-x' }),
  });
  ok('E2 [接线] session-sync @codex → stdout 是 decision:block JSON',
    /"decision"\s*:\s*"block"/.test(rX.stdout || ''),
    `stdout=${(rX.stdout || '').slice(0, 40)} stderr=${(rX.stderr || '').slice(0, 80)}`);

  // ③ project-scope-guard：Codex 下仍输出结构化 deny
  const gX = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-g', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E3 [接线] project-scope-guard @codex → stdout 含 permissionDecision',
    /permissionDecision/.test(gX.stdout || ''),
    `stdout=${(gX.stdout || '').slice(0, 40)}`);

  // ④ project-scope-guard @claude：仍吐 CC JSON
  const gC = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'e2e-gc', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E4 [接线] project-scope-guard @claude → 仍吐 permissionDecision（零回归）',
    /permissionDecision/.test(gC.stdout || ''), `stdout=${(gC.stdout || '').slice(0, 60)}`);

  try { (await import('fs')).rmSync(root, { recursive: true, force: true }); } catch { }
}

// U-013 / ASSERT-023：当前诊断必须彼此一致；每个历史回归 mutant 都应让本检查失败。
function currentDiagnosticErrors(sources) {
  const errors = [];
  if (!/blockVerb:\s*true/.test(sources.harness)
      || !/writeHook:\s*true/.test(sources.harness)
      || !/inputMutation:\s*true/.test(sources.harness)
      || /blockVerb:\s*notCodex/.test(sources.harness)) {
    errors.push('harness shared control capabilities are stale');
  }
  if (!/仓库级 `\.codex\/hooks\.json` 注册/.test(sources.adapter)
      || /本 adapter 经\*\*用户级\*\*/.test(sources.adapter)) {
    errors.push('adapter hook registration advice is stale');
  }
  if (!/codex-trust-hooks\.mjs --dry-run/.test(sources.verifier)
      || /注意：codex 0\.146\.0 实测\*\*不加载仓库级 hooks\.json\*\*/.test(sources.verifier)) {
    errors.push('verifier recovery advice is stale');
  }
  if (!/本仓定义来自仓库级/.test(sources.trust)
      || /检查 ~\/\.codex\/hooks\.json/.test(sources.trust)) {
    errors.push('trust helper registration advice is stale');
  }
  if (!/都可在\*\*仓库级被发现\*\*/.test(sources.agents)
      || !/none\/low\/medium\/high\/xhigh\/max/.test(sources.agents)
      || /none\/minimal\/low\/medium\/high\/xhigh/.test(sources.agents)) {
    errors.push('AGENTS harness/effort facts are stale');
  }
  if (!/effort_lineup:\s*\[none, low, medium, high, xhigh, max\]/.test(sources.model)
      || !/mechanical:\s*low/.test(sources.model)
      || !/effort_rejected_by_model:\s*\[minimal\]/.test(sources.model)) {
    errors.push('model routing minimal/low contract is stale');
  }
  const recovery = sources.adapter.match(/permissionDecisionReason:\s*`Codex patch contract denied[^`]+`/)?.[0] || '';
  if (!/retry apply_patch/.test(recovery)
      || !/Bash and read-only inspection remain available/.test(recovery)
      || /\b(?:Edit|Write|MultiEdit)\b/.test(recovery)) {
    errors.push('Codex patch recovery recommends an unavailable/incorrect lane');
  }
  return errors;
}

const U013_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const diagnosticSources = {
  harness: readFileSync(join(U013_ROOT, '.claude/hooks/lib/harness.mjs'), 'utf8'),
  adapter: readFileSync(join(U013_ROOT, '.codex/codex-hook-adapter.mjs'), 'utf8'),
  verifier: readFileSync(join(U013_ROOT, 'scripts/verify-codex-wiring.mjs'), 'utf8'),
  trust: readFileSync(join(U013_ROOT, 'scripts/codex-trust-hooks.mjs'), 'utf8'),
  agents: readFileSync(join(U013_ROOT, 'AGENTS.md'), 'utf8'),
  model: readFileSync(join(U013_ROOT, '.claude/skill-os/model-routing.yaml'), 'utf8'),
};
ok('U13-1 current Codex effort/hook/recovery diagnostics are consistent',
  currentDiagnosticErrors(diagnosticSources).length === 0,
  currentDiagnosticErrors(diagnosticSources).join('; '));

const diagnosticMutants = [
  { id: 'control-off', source: 'harness', mutate: (s) => s.replace('blockVerb: true', 'blockVerb: notCodex') },
  { id: 'global-hook', source: 'adapter', mutate: (s) => s.replace('由仓库级 `.codex/hooks.json` 注册', '经**用户级** ~/.codex/hooks.json 注册') },
  { id: 'verifier-global-advice', source: 'verifier', mutate: (s) => s.replace('若本仓 hook 未触发：', '注意：codex 0.146.0 实测**不加载仓库级 hooks.json**；') },
  { id: 'minimal-effort', source: 'agents', mutate: (s) => s.replace('none/low/medium/high/xhigh/max', 'none/minimal/low/medium/high/xhigh') },
  { id: 'claude-only-recovery', source: 'adapter', mutate: (s) => s.replace('retry apply_patch', 'retry Edit') },
];
for (const mutant of diagnosticMutants) {
  const mutated = { ...diagnosticSources, [mutant.source]: mutant.mutate(diagnosticSources[mutant.source]) };
  ok(`U13-MUTANT-${mutant.id} killed`, currentDiagnosticErrors(mutated).length > 0);
}

console.log(`\n=== test-harness summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
