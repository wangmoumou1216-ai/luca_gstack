#!/usr/bin/env node
// harness 检测 + 能力探针回归（P0 / WS-A0，2026-07-25）。
// 核心不变量：当前 Codex 与 Claude 均原生接受 decision:block、permissionDecision:deny
// 与 updatedInput（后者需 permissionDecision:allow）。能力表必须反映实测事实，不再把
// 历史方言假设钉成永久降级。
// E1-E4 是**端到端接线断言**：spawn 真 hook 验证该门确实作用于生产 emitter（首版只测纯函数，
// 导致 harness.mjs 零生产调用者而门 100% 永绿）。
import { detectHarness, capabilities, canEmitControlVerb, HARNESS } from '../.claude/hooks/lib/harness.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// ① 三态检测
ok('H1 CLAUDE_PROJECT_DIR 在 → claude', detectHarness({ CLAUDE_PROJECT_DIR: '/x' }) === HARNESS.CLAUDE);
ok('H2 CODEX_* 在 → codex', detectHarness({ CODEX_HOME: '/y' }) === HARNESS.CODEX);
ok('H3 都不在 → unknown（不猜）', detectHarness({}) === HARNESS.UNKNOWN);

// ② 安全默认：两家共享强制动词；unknown 仍偏向保住强制
ok('H4 claude → canEmitControlVerb=true', canEmitControlVerb({ CLAUDE_PROJECT_DIR: '/x' }) === true);
ok('H5 codex → canEmitControlVerb=true（实测共享控制动词）', canEmitControlVerb({ CODEX_HOME: '/y' }) === true);
// 深审修正：unknown 多为 CLAUDE_PROJECT_DIR 被剥的 Claude 会话；关掉会静默丢失主路径治理强制
// （Stop 不再拦、PreToolUse 不再 deny），比在未知 harness 多吐一行 JSON 严重得多 → 失效方向偏向保住强制。
ok('H6 unknown → canEmitControlVerb=true（失效方向偏向保住强制）', canEmitControlVerb({}) === true);

// ③ 能力表：两家共享控制原语；Workflow/AskUser widget 仍是 Claude 专有。
{
  const c = capabilities(HARNESS.CODEX);
  ok('H7a codex: block/write hook/input mutation 均可用，Workflow/AskUser 关闭',
    c.blockVerb && c.writeHook && c.inputMutation && !c.workflow && !c.askUserWidget);
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
// 现两个 CC 强制动词出口（session-sync 的 decision:block / project-scope-guard 的
// permissionDecision:deny）都经 canEmitControlVerb 门控；此处 spawn 真 hook 验证：
//   · Codex 正向检出 → 原样输出共享控制 JSON
//   · Claude → 同样输出控制 JSON（零回归）
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
    cwd: root, encoding: 'utf8', env: { ...base, CLAUDE_PROJECT_DIR: root, SESSION_SYNC_FORCE_ON_STOP: '1' },
    input: JSON.stringify({ session_id: 'e2e-c' }),
  });
  ok('E1 [接线] session-sync @claude → stdout 仍是 decision:block JSON（零回归）',
    /"decision"\s*:\s*"block"/.test(rC.stdout || ''), `stdout=${(rC.stdout || '').slice(0, 60)}`);

  // ② Codex：原生接受同一 decision:block JSON
  const rX = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx', SESSION_SYNC_FORCE_ON_STOP: '1' },
    input: JSON.stringify({ session_id: 'e2e-x' }),
  });
  ok('E2 [接线] session-sync @codex → stdout 保留 decision:block JSON',
    /"decision"\s*:\s*"block"/.test(rX.stdout || ''),
    `stdout=${(rX.stdout || '').slice(0, 40)} stderr=${(rX.stderr || '').slice(0, 80)}`);

  // ③ project-scope-guard：Codex 原生接受 permissionDecision:deny
  const gX = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-g', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E3 [接线] project-scope-guard @codex → stdout 保留 permissionDecision',
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

console.log(`\n=== test-harness summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
