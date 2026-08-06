#!/usr/bin/env node
// .codex/codex-hook-adapter.mjs 的离线回归测试（2026-08-04）。
// 全部用**真实 hook 脚本**端到端跑，不 mock —— 订阅恢复前这是唯一能拿到的真凭据。
// 覆盖：入向 tool_name 归一化 / 出向四种方言翻译 / Claude 路径零回归。

import { spawnSync } from 'child_process';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADAPTER = join(ROOT, '.codex', 'codex-hook-adapter.mjs');
const HOOKS = join(ROOT, '.claude', 'hooks');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { console.log(`PASS ${name}`); pass++; }
  else { console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); fail++; }
};

// 经 adapter 跑一个 hook，返回 {stdout, stderr, status}
function runVia(hookFile, payload, env = {}) {
  return spawnSync('node', [ADAPTER, join(HOOKS, hookFile)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 30000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: '', ...env },
  });
}
// 不经 adapter 直跑（对照组，验 Claude 路径未被动过）
function runDirect(hookFile, payload, env = {}) {
  return spawnSync('node', [join(HOOKS, hookFile)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 30000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT, ...env },
  });
}
const parse = (s) => { try { return JSON.parse(String(s).trim()); } catch { return null; } };

const SID = 'codex-adapter-test';
const cleanup = () => {
  for (const f of ['.session-edit-count-' + SID, '.session-tool-count-' + SID,
                   '.session-turn-count-' + SID, '.session-project-' + SID]) {
    const p = join(ROOT, '.claude', f);
    if (existsSync(p)) rmSync(p, { force: true });
  }
};
cleanup();

// ── A. 出向：纯文本 → additionalContext 包装（route-guard 走这条）────────────
{
  const r = runVia('route-guard.mjs', {
    hook_event_name: 'UserPromptSubmit',
    session_id: SID,
    prompt: '帮我设计一个新功能',
    cwd: ROOT,
  });
  const o = parse(r.stdout);
  ok('A1 route-guard 纯文本被包成 hookSpecificOutput.additionalContext',
    !!o?.hookSpecificOutput?.additionalContext, `stdout=${String(r.stdout).slice(0, 120)}`);
  ok('A2 additionalContext 内容非空且保留原提示文本',
    typeof o?.hookSpecificOutput?.additionalContext === 'string'
    && o.hookSpecificOutput.additionalContext.length > 10);
  ok('A3 hookEventName 正确回填', o?.hookSpecificOutput?.hookEventName === 'UserPromptSubmit');
}

// ── B. 入向：tool_name 归一化（连锁失效的根因）──────────────────────────────
// Codex 传 apply_patch；不归一化则 post-edit 的 /^(Write|Edit|...)$/ 不命中 →
// .session-edit-count 恒 0 → session-sync 判"无实质工作" → Stop 自成长捕获永不触发。
{
  cleanup();
  runVia('post-edit.mjs', {
    hook_event_name: 'PostToolUse',
    session_id: SID,
    tool_name: 'apply_patch',
    tool_input: { file_path: join(ROOT, 'README.md') },
  });
  const p = join(ROOT, '.claude', '.session-edit-count-' + SID);
  const n = existsSync(p) ? parseInt(readFileSync(p, 'utf8').trim() || '0', 10) : 0;
  ok('B1 apply_patch 被归一化为 Write → 编辑计数器递增（解连锁失效）', n >= 1, `count=${n}`);
}
{
  cleanup();
  runVia('post-edit.mjs', {
    hook_event_name: 'PostToolUse',
    session_id: SID,
    tool_name: 'shell',
    tool_input: { command: 'ls' },
  });
  const p = join(ROOT, '.claude', '.session-tool-count-' + SID);
  const n = existsSync(p) ? parseInt(readFileSync(p, 'utf8').trim() || '0', 10) : 0;
  ok('B2 shell 被归一化为 Bash → 工具计数器递增', n >= 1, `count=${n}`);
}

// ── C. 出向：Stop 拦截方言翻译 decision:block → continue:false ──────────────
{
  cleanup();
  // 先制造"有实质工作但未沉淀"的状态，让 session-sync 真的产出 block
  for (let i = 0; i < 3; i++) {
    runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', session_id: SID,
      tool_name: 'apply_patch', tool_input: { file_path: join(ROOT, 'README.md') },
    });
  }
  const r = runVia('session-sync.mjs', { hook_event_name: 'Stop', session_id: SID, cwd: ROOT });
  const o = parse(r.stdout);
  // C0 是 C1-C3 的**前置断言**，不是 skip 条件（2026-08-05 评审变异逼出）：
  // 若把它写成 `if (...) {...} else { SKIP }`，则「Stop 控制动词整个消失」这一最坏失效
  // 会被判成"本次没触发"而报绿——恰恰是最该红的情形最不会红。
  ok('C0 Stop hook 确实产出了控制动词（前置断言：动词消失必须红，不能 SKIP 掉）',
    !!o && (o.decision !== undefined || o.continue !== undefined),
    `stdout=${String(r.stdout).slice(0, 160)}`);
  if (o && (o.decision || o.continue !== undefined)) {
    // 2026-08-05 深审纠正：Codex 与 CC **同字段同语义**（运行中二进制的校验串
    // "Stop hook returned decision:block without a non-empty reason"），故必须原样透传。
    // 初版译成 continue:false 是语义反转：block=「别停、这是继续的提示词」被改成「终止本轮」，
    // 自成长捕获不再发生且用户回合被杀。本组断言现在守的正是"不翻译"。
    ok('C1 Stop 的 decision:block 原样透传（不得译成 continue:false）', o.decision === 'block');
    ok('C2 拦截理由经 reason 传出（信息不丢失）',
      typeof o.reason === 'string' && o.reason.length > 0);
    ok('C3 未产生语义反转的 continue:false', o.continue !== false);
  } else {
    // 走到这里说明 C0 已红；不再打 SKIP 假装无事发生
    ok('C1 Stop 的 decision:block 原样透传', false, '未产出控制动词，见 C0');
  }
  cleanup();
}

// ── D. 出向：PreToolUse 动词 ────────────────────────────────────────────────
{
  // D1-D3（2026-08-05 深审纠正）：updatedInput **受支持**，二进制校验串
  // "PreToolUse hook returned updatedInput without permissionDecision:allow" 证明它是一等字段。
  // 初版据一个 OPEN 的旧版 issue 把它降级成 deny，等于把 project-scope-guard 的**正常重定向
  // 路径**（pinned session 写产出目录的常态）变成硬拒绝——比 fail-open 更糟。
  // 用**实测载荷形状**：Codex 的 shell 工具名是 Bash，载荷是 {command}。
  // 原用例给 apply_patch 传 file_path —— Codex 从不这样传，等于测一个不存在的场景（假绿）。
  const r = runVia('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: 'no-such-pin-' + Date.now(),
    tool_name: 'Bash',
    tool_input: { command: 'echo hi > docs/x.md' },
  });
  const o = parse(r.stdout);
  const hso = o?.hookSpecificOutput;
  ok('D1 未绑定项目写产出目录 → deny 原样透传（强制未因 harness 丢失）',
    hso?.permissionDecision === 'deny', `stdout=${String(r.stdout).slice(0, 160)}`);
  ok('D2 deny 理由非空（模型可据此改正）',
    typeof hso?.permissionDecisionReason === 'string' && hso.permissionDecisionReason.length > 10);
}
{
  // D3：带 updatedInput 的重定向必须透传并自动补 permissionDecision:allow
  const fake = join(ROOT, '.claude', 'workflows', '__adapter_probe_ui.js');
  writeFileSync(fake, `console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput:{file_path:'/redirected/x.md'}}}))`);
  const r = spawnSync('node', [ADAPTER, fake], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: SID, cwd: ROOT, tool_name: 'apply_patch', tool_input: {} }),
    encoding: 'utf8', cwd: ROOT, timeout: 30000,
  });
  rmSync(fake, { force: true });
  const o = parse(r.stdout);
  const h = o?.hookSpecificOutput;
  ok('D3 updatedInput 原样透传且自动补 permissionDecision:allow（不再降级成 deny）',
    !!h?.updatedInput && h.permissionDecision === 'allow', `stdout=${String(r.stdout).slice(0, 200)}`);
}


// ── F. 真实载荷形状（2026-08-05 实测：Codex 的 tool_input 与 CC 不同）──────────
// 实测 matcher='.*' 抓到：shell 执行 → tool_name='Bash'、文件编辑 → 'apply_patch'，
// **两者 tool_input 都是 {command}，没有 file_path**。原 B/D 组用 file_path 构造
// apply_patch，与真实载荷不符，因此测不出"映射错了会让项目隔离失效"这一类缺陷。
// 本组一律用**实测形状**构造。
{
  cleanup();
  // F1: apply_patch(command 载荷) 送到 post-edit → 须按 Write 计编辑数
  runVia('post-edit.mjs', {
    hook_event_name: 'PostToolUse', session_id: SID,
    tool_name: 'apply_patch',
    tool_input: { command: '*** Begin Patch\n*** Add File: x.md\n+hi\n*** End Patch' },
  });
  const p1 = join(ROOT, '.claude', '.session-edit-count-' + SID);
  const n1 = existsSync(p1) ? parseInt(readFileSync(p1, 'utf8').trim() || '0', 10) : 0;
  ok('F1 apply_patch(真实 command 载荷) → post-edit 计为编辑（Stop 自成长链不断）',
    n1 >= 1, `count=${n1}`);
  cleanup();
}
{
  // F2: apply_patch 送到 project-scope-guard → 须走 Bash 命令串扫描分支并拦截越界写
  // （若误映射成 Write，guard 会找不存在的 file_path → 项目隔离静默失效）
  const r = runVia('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: 'no-such-pin-' + Date.now(),
    tool_name: 'apply_patch',
    tool_input: { command: `*** Begin Patch\n*** Add File: docs/leak.md\n+x\n*** End Patch` },
  });
  const o = parse(r.stdout);
  ok('F2 apply_patch 越界写产出目录 → guard 经命令串扫描拦下（项目隔离在 Codex 下真生效）',
    o?.hookSpecificOutput?.permissionDecision === 'deny',
    `stdout=${String(r.stdout).slice(0, 160)}`);
}
{
  // F3: Bash 是 Codex 的真实 shell 工具名，不得被改写
  cleanup();
  runVia('post-edit.mjs', {
    hook_event_name: 'PostToolUse', session_id: SID,
    tool_name: 'Bash', tool_input: { command: 'ls' },
  });
  const p3 = join(ROOT, '.claude', '.session-tool-count-' + SID);
  const n3 = existsSync(p3) ? parseInt(readFileSync(p3, 'utf8').trim() || '0', 10) : 0;
  ok('F3 Bash(Codex 真实 shell 工具名) 正常计入工具数', n3 >= 1, `count=${n3}`);
  cleanup();
}


// ── H. 大 payload 不被截断（B2 的回归门，2026-08-05 评审指出此前无守护）────────
// `process.stdout.write` 后立刻 `process.exit()` 会丢弃未落 OS 管道的数据（macOS 64KiB）。
// 失效场景正是最需要控制动词的时候：往产出目录写大文件时的 updatedInput。
// 评审实测：exit() 版对端收到 65536 字节且 JSON 不可解析；exitCode 版收到 30 万字节完整。
{
  const fake = join(ROOT, '.claude', 'workflows', '__adapter_big_probe.js');
  // hook 吐一个 ~300KB 的合法 JSON（带 updatedInput，走 adapter 的透传+补 allow 分支）
  writeFileSync(fake, `
const big = 'x'.repeat(300000);
console.log(JSON.stringify({ hookSpecificOutput: {
  hookEventName: 'PreToolUse', updatedInput: { file_path: '/redirected/x.md', blob: big },
} }));`);
  const r = spawnSync('node', [ADAPTER, fake], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: SID, cwd: ROOT, tool_name: 'apply_patch', tool_input: {} }),
    encoding: 'utf8', cwd: ROOT, timeout: 30000, maxBuffer: 64 * 1024 * 1024,
  });
  rmSync(fake, { force: true });
  const raw = String(r.stdout || '');
  const o = parse(raw);
  ok('H1 大 payload(300KB) 完整输出且 JSON 可解析（防 process.exit 截断）',
    raw.length > 250000 && !!o, `收到=${raw.length}B 可解析=${!!o}`);
  ok('H2 截断防护下控制动词仍完好（updatedInput + allow 都在）',
    o?.hookSpecificOutput?.updatedInput && o.hookSpecificOutput.permissionDecision === 'allow');
}

// ── E. 零回归：Claude 直调路径未被本次改动影响 ──────────────────────────────
{
  const r = runDirect('project-scope-guard.mjs', {
    session_id: 'no-such-pin-' + Date.now(),
    tool_name: 'Write',
    tool_input: { file_path: join(ROOT, 'docs', 'x.md') },
  });
  const o = parse(r.stdout);
  ok('E1 [零回归] Claude 直调仍吐 CC 形 permissionDecision',
    o?.hookSpecificOutput?.permissionDecision === 'deny');
}
{
  const r = runDirect('route-guard.mjs', {
    session_id: 'direct-' + Date.now(), prompt: '帮我设计一个新功能', cwd: ROOT,
  });
  ok('E2 [零回归] Claude 直调 route-guard 仍输出裸文本（未被包成 JSON）',
    String(r.stdout).trim().length > 0 && parse(r.stdout) === null);
}

cleanup();
console.log(`\n=== test-codex-adapter summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
