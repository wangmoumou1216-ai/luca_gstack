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

// 4. 非项目路径（.claude/skills、memory、scripts、任意）→ 放行不改写
//    注：framework/ 曾在此列（项目隔离视其为「非 docs 路径」放行），2026-07-22 起有独立只读保护（D3），
//    Write framework/ 改为 deny —— 由下方 FW-WRITE 用例覆盖；此处换 docs/adr（另一非 scoped 路径）验原意。
for (const p of ['.claude/skills/office/x.md', 'memory/episodic/index.jsonl', 'scripts/x.sh', 'CLAUDE.md']) {
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

// 13. 放宽（#2）：无 pin READ docs/ → pass-through（纯对话/审计可读当前项目 docs，跟软链）
check('no-pin Read docs/ → pass-through (relaxed read)', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: 'docs/PROGRESS.md' } });
  assert.equal(o, null, '无 pin 读类应放行');
});

// 14. 放宽仅限读：无 pin Grep path=docs → pass-through；但无 pin Write docs → 仍 deny（不变）
check('no-pin Grep path=docs → pass-through; Write still deny', () => {
  const env = makeEnv();
  const g = run(env, { session_id: 'NP', tool_name: 'Grep', tool_input: { pattern: 'x', path: 'docs' } });
  assert.equal(g, null, '无 pin Grep 应放行');
  const w = run(env, { session_id: 'NP', tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.equal(w.hookSpecificOutput.permissionDecision, 'deny', '无 pin 写仍 deny');
});

// 15. 收紧（#4）：project.sh switch 出现在 echo 字符串里 → 不误置 pin
check('project.sh switch inside echo string → NOT claimed', () => {
  const env = makeEnv();
  run(env, { session_id: 'E', tool_name: 'Bash', tool_input: { command: 'echo "run ./scripts/project.sh switch mobile-list"' } });
  assert.ok(!existsSync(join(env.gstack, '.claude', '.session-project-E')), 'echo 里的 project.sh 不得置 pin');
});

// 16. 收紧后真调用仍认领：命令段起始位（含 && 后一段）的 project.sh switch → 置 pin
check('real project.sh switch (after &&) still claims pin', () => {
  const env = makeEnv();
  run(env, { session_id: 'R', tool_name: 'Bash', tool_input: { command: 'echo start && ./scripts/project.sh switch mobile-list' } });
  const pin = readFileSync(join(env.gstack, '.claude', '.session-project-R'), 'utf8').trim();
  assert.equal(pin, 'mobile-list');
});

// 17. ★回归★（sid 截断 bug，2026-07-09）：真实 36 字符 UUID sid。route-guard 用 slice(0,36)
//     写 pin，本 hook 必须以同长度读到它。曾有 slice(0,32) 砍掉 UUID 末段 4 位 → 读不到 pin →
//     误判"未绑定" → docs 写被 deny（架空命名即切换）。前面用例的短 sid（<32 字符）令
//     slice(0,32)==slice(0,36) 掩盖了它，故此处必须用满 36 字符方能守住回归。
check('REGRESSION: 36-char UUID sid pin is read, not truncated to 32', () => {
  const uuid = 'aabbccdd-1122-4a55-9c66-778899aabbcc'; // 36 字符；第 33-36 位若被截掉即读不到 pin
  const env = makeEnv({ pins: { [uuid]: 'muse' } });
  const o = run(env, { session_id: uuid, tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.ok(o && o.hookSpecificOutput && o.hookSpecificOutput.updatedInput,
    '36 字符 sid 的 pin 必须被读到并重定向；截断到 32 会读不到 → 误 deny（正是本次修复的 bug）');
  assert.equal(o.hookSpecificOutput.updatedInput.file_path, abs(env, 'muse', 'docs/x.md'));
});

// ── framework/ 只读母版保护（2026-07-22，D3）：写 framework/ → deny；读放行；escape 生效；无误伤 ──
check('FW-WRITE: Write 到 framework/ → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'framework/list-page.html', content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /只读母版|SF-002/);
});
check('FW-WRITE: Edit 绝对路径 framework/ → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Edit', tool_input: { file_path: join(env.gstack, 'framework', 'shared-head.html'), old_string: 'a', new_string: 'b' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('FW-READ: Read framework/ → 放行（读不拦）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'framework/list-page.html' } });
  assert.equal(o, null, 'Read framework/ 必须放行');
});
check('FW-BASH: 重定向写 framework/ → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'echo x > framework/list-page.html' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('FW-BASH: sed -i framework/ → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: "sed -i 's/a/b/' framework/home-page.html" } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('FW-BASH: cat framework/（读）→ 放行', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'cat framework/list-page.html' } });
  assert.equal(o, null, 'cat 读 framework/ 不得拦');
});
check('FW-BASH: cp framework/src dest（读源，html-prototype 复制母版）→ 不误伤', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'cp framework/list-page.html docs/proto/x.html' } });
  // framework/ 在源位；命令还含 docs/ 会被项目隔离重定向，但绝不能是 framework deny
  assert.notEqual(o && o.hookSpecificOutput && o.hookSpecificOutput.permissionDecision, 'deny',
    'cp 读 framework/ 源不得被 framework 保护误伤');
});
check('FW-NOISE: framework-audit/ 不被误命中', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'framework-audit/x.md', content: 'x' } });
  assert.equal(o, null, 'framework-audit/ 不是 framework/，必须放行');
});
check('FW-ESCAPE: marker 文件放行母版维护', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  writeFileSync(join(env.gstack, '.claude', '.allow-framework-write'), '');
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'framework/list-page.html', content: 'x' } });
  assert.equal(o, null, 'escape marker 存在时 framework/ 写放行');
});
// ── 2026-07-22 安全验收后收紧：B#4 误伤锚定 + A#1 cp/mv 目标 + A#4 大小写 + A#2 ./ ──
check('FW-B4: Write src/framework/ → 放行（不误伤下游项目的 framework 模块）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'src/framework/x.js', content: 'x' } });
  assert.equal(o, null, 'src/framework/ 不是仓根 framework/，必须放行（B#4 误伤修复）');
});
check('FW-B4: Write /tmp/framework/ → 放行（仓外 framework 不误伤）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: '/tmp/framework/x', content: 'x' } });
  assert.equal(o, null, '仓外 /tmp/framework/ 必须放行');
});
check('FW-B4: Write <仓根>/framework/ 绝对路径 → 仍 deny（真母版）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: join(env.gstack, 'framework', 'x.html'), content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny', '仓根 framework/ 绝对路径必须拦');
});
check('FW-A1: cp x framework/y（写目标）→ deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'cp /tmp/evil framework/list-page.html' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny', 'cp 写 framework 目标位必须拦（A#1 核心漏防）');
});
check('FW-A1: mv/install/ln 写 framework 目标 → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  for (const cmd of ['mv /tmp/x framework/y', 'install -m644 evil framework/x', 'ln -sf /tmp/evil framework/x']) {
    const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: cmd } });
    assert.equal(o && o.hookSpecificOutput && o.hookSpecificOutput.permissionDecision, 'deny', cmd + ' 必须拦');
  }
});
check('FW-A1: cp framework/src dest（读源）→ 仍放行（不误伤复制母版）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'cp framework/list-page.html /tmp/x.html' } });
  assert.equal(o, null, 'cp 读 framework 源位必须放行（framework/ 不在命令末尾）');
});
check('FW-A4: Write FRAMEWORK/（大小写变体，APFS 真能覆盖）→ deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'FRAMEWORK/list-page.html', content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny', '大小写变体必须拦（case-insensitive）');
});
check('FW-A2: echo > ./framework/（./ 前缀）→ deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'echo x > ./framework/list-page.html' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny', './framework/ 前缀必须拦');
});
check('FW-NOISE2: Bash 读 src/framework（下游）不误命中', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'cat src/framework/x.js' } });
  assert.equal(o, null, 'src/framework/ 读不拦');
});

console.log(`\n=== test-project-scope-guard summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
