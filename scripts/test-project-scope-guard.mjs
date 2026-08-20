#!/usr/bin/env node
// 会话级项目隔离（方案A，2026-07-08）回归套件 —— 独立文件（同 test-route-guard.mjs 模式），
// 不并入 test-hooks.mjs：后者在首个断言失败即崩（当前 HOOK-001-reverse 是 fork 内先存的失败，
// 与本 skill 无关），并入会被它挡住不执行。
//
// 全程 hermetic：任务专用 LUCA_PROJECTS_ROOT + 临时 CLAUDE_PROJECT_DIR，不改写 HOME。
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync, existsSync, realpathSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import assert from 'assert';

const HOOK = resolve(process.cwd(), '.claude/hooks/project-scope-guard.mjs');
let pass = 0, fail = 0;
function ok(name) { pass++; console.log('PASS ' + name); }
function bad(name, e) { fail++; console.log('FAIL ' + name + ' :: ' + (e && e.message || e)); }
function check(name, fn) { try { fn(); ok(name); } catch (e) { bad(name, e); } }

// pins 传入则预写 schema v2 TURN_ACTIVE identity+epoch snapshot。
function makeEnv({ pins = {}, nestedFramework = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'psg-root-'));
  const projects = join(root, 'projects');
  const gstack = nestedFramework ? join(projects, 'muse', 'lucagstack') : join(root, 'gstack');
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  for (const [sid, proj] of Object.entries(pins)) {
    const project = join(projects, proj);
    mkdirSync(join(project, 'docs'), { recursive: true });
    mkdirSync(join(project, '.luca'), { recursive: true });
    const st = statSync(project);
    const binding = { project: proj, epoch: 1, realpath: realpathSync(project), dev: Number(st.dev), ino: Number(st.ino) };
    writeFileSync(join(gstack, '.claude', `.session-project-${sid}`), `${JSON.stringify({
      schema_version: 2,
      state: 'TURN_ACTIVE',
      session_id: sid,
      binding,
      turn: { turn_id: `turn-${sid}`, epoch: 1 },
    })}\n`);
  }
  return { root, gstack, projects };
}
function run(env, payload, extraEnv = {}) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    cwd: env.gstack,
    env: { ...process.env, CLAUDE_PROJECT_DIR: env.gstack, LUCA_GSTACK_ROOT: env.gstack, LUCA_PROJECTS_ROOT: env.projects, ...extraEnv },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, 'hook 必须永远 exit 0（fail-open），stderr=' + r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null; // 空 stdout = pass-through
}
const abs = (env, proj, rest) => join(realpathSync(join(env.projects, proj)), rest);

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
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /NO_PIN|TURN_ACTIVE|switch/);
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

// 9. Legacy direct switch without tx is rejected and cannot create a pin.
check('Bash project.sh switch X without tx → denied, no pin prewrite', () => {
  const env = makeEnv();
  const out = run(env, { session_id: 'CLI', tool_name: 'Bash', tool_input: { command: './scripts/project.sh switch mobile-list' } });
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(!existsSync(join(env.gstack, '.claude', '.session-project-CLI')));
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
    env: { ...process.env, CLAUDE_PROJECT_DIR: env.gstack, LUCA_GSTACK_ROOT: env.gstack, LUCA_PROJECTS_ROOT: env.projects }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// 12. 无 sid（管道/测试）→ 无 pin 视角，docs 写 deny；非项目放行
check('no session_id → treated as no-pin (docs denied)', () => {
  const env = makeEnv();
  const o = run(env, { tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});

// 13. 无 pin 读共享 docs 同样 fail-closed。
check('no-pin Read docs/ → deny', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: 'docs/PROGRESS.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});

// 14. 无 pin Grep/Write 都 fail-closed。
check('no-pin Grep path=docs and Write docs → both deny', () => {
  const env = makeEnv();
  const g = run(env, { session_id: 'NP', tool_name: 'Grep', tool_input: { pattern: 'x', path: 'docs' } });
  assert.equal(g.hookSpecificOutput.permissionDecision, 'deny');
  const w = run(env, { session_id: 'NP', tool_name: 'Write', tool_input: { file_path: 'docs/x.md', content: 'x' } });
  assert.equal(w.hookSpecificOutput.permissionDecision, 'deny', '无 pin 写仍 deny');
});

// 15. 收紧（#4）：project.sh switch 出现在 echo 字符串里 → 不误置 pin
check('project.sh switch inside echo string → NOT claimed', () => {
  const env = makeEnv();
  run(env, { session_id: 'E', tool_name: 'Bash', tool_input: { command: 'echo "run ./scripts/project.sh switch mobile-list"' } });
  assert.ok(!existsSync(join(env.gstack, '.claude', '.session-project-E')), 'echo 里的 project.sh 不得置 pin');
});

// 16. 复合命令永不构成合法 SWITCH_ONLY mutation。
check('compound project.sh switch (after &&) is denied and does not prewrite pin', () => {
  const env = makeEnv();
  const out = run(env, { session_id: 'R', tool_name: 'Bash', tool_input: { command: 'echo start && ./scripts/project.sh switch mobile-list' } });
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(!existsSync(join(env.gstack, '.claude', '.session-project-R')));
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
check('FW-A2abs: Bash 绝对路径写仓根 framework → deny', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: `echo x > ${join(env.gstack, 'framework', 'list-page.html')}` } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny', '仓根绝对路径写 framework 必须拦（A#2 手滑级）');
});
check('FW-A2abs: Bash 绝对路径写仓外 framework → 放行（不越界）', () => {
  const env = makeEnv({ pins: { s: 'muse' } });
  const o = run(env, { session_id: 's', tool_name: 'Bash', tool_input: { command: 'echo x > /tmp/framework/x' } });
  assert.equal(o, null, '仓外 framework 绝对路径不拦（只保护本仓母版）');
});

// ── DEV-004 身份边界增量：direct absolute / broad search / malformed state ──
check('IDENTITY-DIRECT-001 no-pin direct absolute project Read → deny', () => {
  const env = makeEnv();
  mkdirSync(join(env.projects, 'alpha', 'docs'), { recursive: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: join(env.projects, 'alpha', 'docs', 'x.md') } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-DIRECT-002 active same-project direct absolute Read → canonical allow', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const target = abs(env, 'alpha', 'docs/x.md');
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: target } });
  assert.equal(o.hookSpecificOutput.updatedInput.file_path, target);
});
check('IDENTITY-DIRECT-003 active cross-project direct absolute Read → deny', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  mkdirSync(join(env.projects, 'beta', 'docs'), { recursive: true });
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: join(env.projects, 'beta', 'docs', 'x.md') } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-DIRECT-004 active same-project direct absolute Bash → allow', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `test -f ${abs(env, 'alpha', 'docs/x.md')}` } });
  assert.equal(o, null);
});
check('IDENTITY-DIRECT-005 active cross-project direct absolute Bash → deny', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  mkdirSync(join(env.projects, 'beta', 'docs'), { recursive: true });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `test -f ${join(env.projects, 'beta', 'docs', 'x.md')}` } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-BROAD-001 no-pin pathless Grep → deny', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Grep', tool_input: { pattern: 'x' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-BROAD-002 active pathless Glob → deny with explicit-path guidance', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Glob', tool_input: { pattern: '**/*.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /明确.*路径|共享 docs/);
});
check('IDENTITY-STATE-001 malformed state never falls back to display path', () => {
  const env = makeEnv();
  writeFileSync(join(env.gstack, '.claude', '.session-project-BAD'), '{not-json');
  const o = run(env, { session_id: 'BAD', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /INVALID/);
});
check('IDENTITY-STATE-002 corrupt turn epoch never authorizes project access', () => {
  const env = makeEnv({ pins: { BAD: 'alpha' } });
  const path = join(env.gstack, '.claude', '.session-project-BAD');
  const value = JSON.parse(readFileSync(path, 'utf8'));
  value.turn.epoch = value.binding.epoch + 1;
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  const o = run(env, { session_id: 'BAD', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-001 docs traversal cannot escape active binding', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/../../beta/secret.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /traversal/);
});
check('IDENTITY-PATH-002 direct PROJECTS/A/../B traversal is denied', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  mkdirSync(join(env.projects, 'beta'), { recursive: true });
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: `${env.projects}/alpha/../beta/secret.md` } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-003 in-project symlink escape is denied by nearest-parent realpath', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const beta = join(env.projects, 'beta');
  mkdirSync(beta, { recursive: true });
  symlinkSync(beta, join(env.projects, 'alpha', 'docs', 'escape'));
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/escape/secret.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-004 Bash exact docs token rewrites; no-pin exact token denies', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const active = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'ls docs' } });
  assert.equal(active.hookSpecificOutput.updatedInput.command, `ls ${abs(env, 'alpha', 'docs')}`);
  const noPin = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'ls docs' } });
  assert.equal(noPin.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-005 PROJECTS_ROOT probe is denied even for active binding', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `ls ${env.projects}` } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-006 projects-root symlink swap invalidates prior binding', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const parked = `${env.projects}-old`;
  renameSync(env.projects, parked);
  const replacement = `${env.projects}-replacement`;
  mkdirSync(join(replacement, 'alpha', 'docs'), { recursive: true });
  symlinkSync(replacement, env.projects);
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/x.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-007 dangling in-project symlink is not treated as a missing leaf', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  symlinkSync(join(env.projects, 'missing-target'), join(env.projects, 'alpha', 'docs', 'dangling'));
  const o = run(env, { session_id: 'S', tool_name: 'Read', tool_input: { file_path: 'docs/dangling/secret.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-008 Bash checks every docs token, not only the first', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'ls docs/a; ls docs/../beta' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-009 Bash docs symlink escape is denied when statically resolvable', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const beta = join(env.projects, 'beta');
  mkdirSync(beta, { recursive: true });
  symlinkSync(beta, join(env.projects, 'alpha', 'docs', 'escape'));
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'cat docs/escape/secret.md' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});

check('IDENTITY-PATH-010 no-pin Bash cannot reach projects through LUCA_PROJECTS_ROOT env', () => {
  const env = makeEnv();
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'find "$LUCA_PROJECTS_ROOT" -maxdepth 2 -type f' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /环境变量|binding/);
});
check('IDENTITY-PATH-011 active Bash cannot cross projects through HOME or alias env', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  mkdirSync(join(env.projects, 'beta'), { recursive: true });
  const home = resolve(env.projects, '..', 'fake-home');
  const alias = env.projects;
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'cat "$PROJECT_ALIAS/beta/secret"' } }, {
    HOME: home,
    PROJECT_ALIAS: alias,
  });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-012 PWD/docs env alias is denied instead of following display link', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'cat "$PROJECT_CWD/docs/secret"' } }, {
    PROJECT_CWD: env.gstack,
  });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-013 APFS case aliases are classified as project scope', () => {
  const env = makeEnv();
  const variant = env.projects.replace(/^\/private\//, '/PRIVATE/').replace(/projects$/, 'PROJECTS');
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: `${variant}/alpha/secret` } });
  if (process.platform === 'darwin') assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  else assert.equal(o, null);
});
check('IDENTITY-PATH-014 literal absolute display path rewrites to binding', () => {
  const env = makeEnv({ pins: { S: 'alpha' } });
  const o = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: `cat ${env.gstack}/docs/secret` } });
  assert.equal(o.hookSpecificOutput.updatedInput.command, `cat ${abs(env, 'alpha', 'docs/secret')}`);
});

check('IDENTITY-PATH-015 no-pin nested framework cannot cd ../.. into PROJECTS_ROOT', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'cd ../.. && find . -maxdepth 2 -type f' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(o.hookSpecificOutput.permissionDecisionReason, /相对路径|未绑定/);
});
check('IDENTITY-PATH-016 no-pin nested framework cannot use ../.. as a command operand', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'find ../.. -maxdepth 2 -type f' } });
  assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-017 active binding may traverse only within its own containing project', () => {
  const env = makeEnv({ nestedFramework: true, pins: { S: 'muse' } });
  const same = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'cd .. && find . -maxdepth 1 -type f' } });
  assert.equal(same, null, 'validated muse binding may access muse outside nested lucagstack');
  mkdirSync(join(env.projects, 'beta'), { recursive: true });
  const cross = run(env, { session_id: 'S', tool_name: 'Bash', tool_input: { command: 'cd ../../beta && find . -maxdepth 1 -type f' } });
  assert.equal(cross.hookSpecificOutput.permissionDecision, 'deny');
});
check('IDENTITY-PATH-018 literal cwd simulation does not reject a round trip inside luca_gstack', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: 'cd scripts && cd .. && find . -maxdepth 1 -type f' } });
  assert.equal(o, null);
});
for (const command of [
  'cd "$(pwd)/../.." && ls',
  'cd `pwd`/../.. && ls',
  'cd "$(dirname "$PWD")/.." && ls',
]) {
  check(`IDENTITY-PATH-019 no-pin dynamic cd fails closed: ${command}`, () => {
    const env = makeEnv({ nestedFramework: true });
    const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command } });
    assert.equal(o.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(o.hookSpecificOutput.permissionDecisionReason, /相对路径|dynamic|未绑定/);
  });
}

// ── IDENTITY-PATH-020：嵌套检出下的**绝对路径**框架作用域（此前整格无覆盖）────────────
// 缺陷：classifyPath 缺 resolvedRelativeProjectAccess 那条 frameworkRoot 短路，导致同一操作
// 写相对路径放行、写绝对路径被拒。Bash 与 Read/Edit 两条链都汇到 classifyPath，一处修复两处生效。
check('IDENTITY-PATH-020a no-pin nested framework: Bash 绝对路径读框架文件应放行', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: `cat ${env.gstack}/scripts/verify.sh` } });
  assert.equal(o, null, '框架自身文件不是项目作用域');
});
check('IDENTITY-PATH-020b no-pin nested framework: 仓根本身（无子路径）应放行', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Bash', tool_input: { command: `git -C ${env.gstack} status` } });
  assert.equal(o, null, 'insidePath 含根自身，仓根不该被判项目作用域');
});
check('IDENTITY-PATH-020c no-pin nested framework: Read 工具绝对路径读框架文件应放行', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: `${env.gstack}/.claude/settings.json` } });
  assert.equal(o, null, 'Read 与 Bash 必须同口径');
});
// —— 以下四条是**保护面**：豁免绝不能顺带放开共享展示路径或外层项目 ——
check('IDENTITY-PATH-020d [保护面] 豁免不得放开 <gstack> 内的共享 docs/', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: `${env.gstack}/docs/secret` } });
  assert.ok(o && o.hookSpecificOutput.permissionDecision === 'deny', '共享展示链虽在 gstackRoot 内但必须仍受保护');
});
check('IDENTITY-PATH-020e [保护面] 豁免不得放开 workflow-state.yaml', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: `${env.gstack}/.claude/workflow-state.yaml` } });
  assert.ok(o && o.hookSpecificOutput.permissionDecision === 'deny');
});
check('IDENTITY-PATH-020f [保护面] 豁免不得放开 current-topic.txt', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: `${env.gstack}/.claude/current-topic.txt` } });
  assert.ok(o && o.hookSpecificOutput.permissionDecision === 'deny');
});
check('IDENTITY-PATH-020g [保护面] 豁免不得放开外层承载项目自己的目录', () => {
  const env = makeEnv({ nestedFramework: true });
  const o = run(env, { session_id: 'NP', tool_name: 'Read', tool_input: { file_path: join(env.projects, 'muse', 'docs', 'x.md') } });
  assert.ok(o && o.hookSpecificOutput.permissionDecision === 'deny', 'lucagstack 的父项目目录不在豁免内');
});

console.log(`\n=== test-project-scope-guard summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
