#!/usr/bin/env node
// 会话级项目隔离（方案A，2026-07-08）回归套件 —— 独立文件（同 test-route-guard.mjs 模式），
// 不并入 test-hooks.mjs：后者在首个断言失败即崩（当前 HOOK-001-reverse 是 fork 内先存的失败，
// 与本 skill 无关），并入会被它挡住不执行。
//
// 全程 hermetic：临时 HOME + 临时 CLAUDE_PROJECT_DIR，绝不碰真实 ~/Desktop/项目 或本仓库状态。
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import assert from 'assert';

const HOOK = resolve(process.cwd(), '.claude/hooks/project-scope-guard.mjs');
let pass = 0, fail = 0;
function ok(name) { pass++; console.log('PASS ' + name); }
function bad(name, e) { fail++; console.log('FAIL ' + name + ' :: ' + (e && e.message || e)); }
function check(name, fn) { try { fn(); ok(name); } catch (e) { bad(name, e); } }

// 每个 case 造独立 hermetic 环境：<tmp>/gstack 作 CLAUDE_PROJECT_DIR，<tmp> 作 HOME
// （hook 里 PROJECTS_ROOT = $HOME/Desktop/项目）。pins 传入则预写 .session-project-<sid>。
function makeEnv({ pins = {} } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'psg-home-'));
  const gstack = join(home, 'Desktop', '项目', 'gstack');
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  for (const [sid, proj] of Object.entries(pins)) {
    writeFileSync(join(gstack, '.claude', `.session-project-${sid}`), proj);
    mkdirSync(join(home, 'Desktop', '项目', proj, 'docs'), { recursive: true });
    mkdirSync(join(home, 'Desktop', '项目', proj, '.luca'), { recursive: true });
  }
  return { home, gstack };
}
function run(env, payload) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    cwd: env.gstack,
    env: { ...process.env, HOME: env.home, CLAUDE_PROJECT_DIR: env.gstack },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, 'hook 必须永远 exit 0（fail-open），stderr=' + r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null; // 空 stdout = pass-through
}
const abs = (env, proj, rest) => join(env.home, 'Desktop', '项目', proj, rest);

// 1. 已绑定 session 写 docs/ → 重定向到本 pin 项目绝对路径
check('pinned Write docs/ → redirect to own project', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const o = run(env, { session_id: 'S1', tool_name: 'Write', tool_input: { file_path: 'docs/a/b.md', content: 'x' } });
  assert.equal(o.hookSpecificOutput.updatedInput.file_path, abs(env, 'muse', 'docs/a/b.md'));
  assert.equal(o.hookSpecificOutput.updatedInput.content, 'x', 'content 等其它字段须原样带上');
});

// 2. ★核心保证★ 两个并行 session、不同 pin、同一相对 docs 路径 → 各自落各自项目，互不串扰
check('CROSS-SESSION isolation: same docs/ path redirects per-session', () => {
  const env = makeEnv({ pins: { A: 'muse', B: 'mobile-list' } });
  const oA = run(env, { session_id: 'A', tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: '1' } });
  const oB = run(env, { session_id: 'B', tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: '2' } });
  assert.equal(oA.hookSpecificOutput.updatedInput.file_path, abs(env, 'muse', 'docs/x.md'));
  assert.equal(oB.hookSpecificOutput.updatedInput.file_path, abs(env, 'mobile-list', 'docs/x.md'));
  assert.notEqual(oA.hookSpecificOutput.updatedInput.file_path, oB.hookSpecificOutput.updatedInput.file_path);
});

// 3. 无 pin session 写 docs/ → deny（绝不跟软链落别人项目）
check('no-pin Write docs/ → deny', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /未绑定|switch/);
});

// 4. 非项目路径（.claude/skills、memory、scripts、framework、任意）→ 放行不改写
for (const p of ['.claude/skills/office/x.md', 'memory/episodic/index.jsonl', 'scripts/x.sh', 'framework/base.html', 'CLAUDE.md']) {
  check(`pass-through non-project path: ${p}`, () => {
    const env = makeEnv({ pins: { S1: 'muse' } });
    const o = run(env, { session_id: 'S1', tool_name: 'Write', tool_input: { file_path: p, content: 'x' } });
    assert.equal(o, null, '非项目路径必须 pass-through（空 stdout）');
  });
}

// 5. workflow-state / current-topic → 重定向到 <pin>/.luca/
check('pinned Write .claude/workflow-state.yaml → redirect to <pin>/.luca/', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const o = run(env, { session_id: 'S1', tool_name: 'Write', tool_input: { file_path: '.claude/workflow-state.yaml', content: 'x' } });
  assert.equal(o.hookSpecificOutput.updatedInput.file_path, abs(env, 'muse', '.luca/workflow-state.yaml'));
});

// 6. Bash mkdir/cat docs → 重写命令
check('pinned Bash mkdir docs → rewrite command', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const o = run(env, { session_id: 'S1', tool_name: 'Bash', tool_input: { command: 'mkdir -p docs/handoff && echo ok' } });
  assert.equal(o.hookSpecificOutput.updatedInput.command, `mkdir -p ${abs(env, 'muse', 'docs')}/handoff && echo ok`);
});

// 7. Bash anchor：mydocs/ 与已绝对 /x/docs/ 不得误改写
check('pinned Bash mydocs/ and /abs/docs/ NOT rewritten', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const o = run(env, { session_id: 'S1', tool_name: 'Bash', tool_input: { command: 'ls mydocs/ && cat /abs/docs/keep' } });
  assert.equal(o, null, 'anchor 应避免误伤 → pass-through');
});

// 8. no-pin Bash 写 docs → deny
check('no-pin Bash docs write → deny', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'mkdir -p docs/x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});

// 9. Bash `project.sh switch X` → 认领 pin（闭合 CLI 直切的洞）
check('Bash project.sh switch X → claims pin', () => {
  const env = makeEnv();
  run(env, { session_id: 'CLI', tool_name: 'Bash', tool_input: { command: './scripts/project.sh switch mobile-list' } });
  const pin = readFileSync(join(env.gstack, '.claude', '.session-project-CLI'), 'utf8').trim();
  assert.equal(pin, 'mobile-list');
});

// 10. Read docs/ 也重定向（读也须落本项目）
check('pinned Read docs/ → redirect', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const o = run(env, { session_id: 'S1', tool_name: 'Read', tool_input: { file_path: 'docs/PROGRESS.md' } });
  assert.equal(o.hookSpecificOutput.updatedInput.file_path, abs(env, 'muse', 'docs/PROGRESS.md'));
});

// 11. fail-open：stdin 非法 JSON → 不崩、exit 0、pass-through
check('malformed stdin → fail-open pass-through', () => {
  const env = makeEnv({ pins: { S1: 'muse' } });
  const r = spawnSync('node', [HOOK], { input: 'not json{', cwd: env.gstack,
    env: { ...process.env, HOME: env.home, CLAUDE_PROJECT_DIR: env.gstack }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// 12. 无 sid（管道/测试）→ 无 pin 视角，docs 写 deny；非项目放行
check('no session_id → treated as no-pin (docs denied)', () => {
  const env = makeEnv();
  const o = run(env, { tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});

console.log(`\n=== test-project-scope-guard summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
