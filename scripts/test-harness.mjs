#!/usr/bin/env node
// harness 检测 + 能力探针回归（P0 / WS-A0，2026-07-25）。
// 核心不变量：CC 专有强制动词（decision:block / permissionDecision:deny / updatedInput）
// **只在正向确定是 Codex 时降级**为纯文本；claude 与 unknown 照常输出——unknown 多是
// CLAUDE_PROJECT_DIR 被剥的 Claude 会话，关掉会静默丢失主路径治理强制（详见 lib/harness.mjs 头注）。
// E1-E4 是**端到端接线断言**：spawn 真 hook 验证该门确实作用于生产 emitter（首版只测纯函数，
// 导致 harness.mjs 零生产调用者而门 100% 永绿）。
import { detectHarness, capabilities, canEmitControlVerb, HARNESS } from '../.claude/hooks/lib/harness.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// ① 三态检测
ok('H1 CLAUDE_PROJECT_DIR 在 → claude', detectHarness({ CLAUDE_PROJECT_DIR: '/x' }) === HARNESS.CLAUDE);
ok('H2 CODEX_* 在 → codex', detectHarness({ CODEX_HOME: '/y' }) === HARNESS.CODEX);
ok('H3 都不在 → unknown（不猜）', detectHarness({}) === HARNESS.UNKNOWN);

// ② 安全默认：强制动词仅 claude 正向可用
ok('H4 claude → canEmitControlVerb=true', canEmitControlVerb({ CLAUDE_PROJECT_DIR: '/x' }) === true);
ok('H5 codex → canEmitControlVerb=false（正向确定才降级）', canEmitControlVerb({ CODEX_HOME: '/y' }) === false);
// 深审修正：unknown 多为 CLAUDE_PROJECT_DIR 被剥的 Claude 会话；关掉会静默丢失主路径治理强制
// （Stop 不再拦、PreToolUse 不再 deny），比在未知 harness 多吐一行 JSON 严重得多 → 失效方向偏向保住强制。
ok('H6 unknown → canEmitControlVerb=true（失效方向偏向保住强制）', canEmitControlVerb({}) === true);

// ③ 能力表：CC 专有原语在非-claude 下全关；harness-agnostic 能力不受影响
{
  const c = capabilities(HARNESS.CODEX);
  ok('H7a codex: 强制动词全关（正向确定）',
    !c.blockVerb && !c.writeHook && !c.inputMutation && !c.workflow && !c.askUserWidget);
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
//   · Codex 正向检出 → stdout 无 CC JSON，stderr 有 advisory
//   · Claude → 仍吐 CC JSON（零回归）
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

  // ② Codex：降级为 advisory，stdout 不得含 CC JSON
  const rX = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-x' }),
  });
  ok('E2 [接线] session-sync @codex → stdout 无 CC JSON + stderr advisory',
    !/"decision"/.test(rX.stdout || '') && /无 Stop-block 强制能力/.test(rX.stderr || ''),
    `stdout=${(rX.stdout || '').slice(0, 40)} stderr=${(rX.stderr || '').slice(0, 80)}`);

  // ③ project-scope-guard：Codex 下 deny 降级
  const gX = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-g', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E3 [接线] project-scope-guard @codex → stdout 无 permissionDecision + stderr advisory',
    !/permissionDecision/.test(gX.stdout || '') && /无 PreToolUse 强制能力/.test(gX.stderr || ''),
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
