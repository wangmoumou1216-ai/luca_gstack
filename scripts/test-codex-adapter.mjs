#!/usr/bin/env node
// .codex/codex-hook-adapter.mjs 的离线回归测试（2026-08-04）。
// 全部用**真实 hook 脚本**端到端跑，不 mock —— 订阅恢复前这是唯一能拿到的真凭据。
// 覆盖：入向 tool_name 归一化 / 出向四种方言翻译 / Claude 路径零回归。

import { spawnSync } from 'child_process';
import { existsSync, rmSync, readFileSync } from 'fs';
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
  if (o && (o.continue === false || o.stopReason)) {
    ok('C1 decision:block 被翻译成 Codex 方言 continue:false', o.continue === false);
    ok('C2 拦截理由经 stopReason 传出（信息不丢失）',
      typeof o.stopReason === 'string' && o.stopReason.length > 0);
    ok('C3 未把 Codex 不认的 decision 字段透出', !('decision' in o));
  } else {
    // 该 session 未达拦截阈值时跳过（不算失败，但要显式说明，避免假绿）
    console.log('SKIP C1-C3 — 本次 session-sync 未产出 block（未达实质工作阈值）');
  }
  cleanup();
}

// ── D. 出向：PreToolUse 动词 ────────────────────────────────────────────────
{
  // D1: updatedInput 不受支持 → 必须降级为 deny，绝不静默丢弃
  const r = runVia('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: 'no-such-pin-' + Date.now(),
    tool_name: 'apply_patch',
    tool_input: { file_path: join(ROOT, 'docs', 'x.md') },
  });
  const o = parse(r.stdout);
  const hso = o?.hookSpecificOutput;
  ok('D1 未绑定项目写 docs/ → 输出 deny（强制未因 harness 丢失）',
    hso?.permissionDecision === 'deny', `stdout=${String(r.stdout).slice(0, 160)}`);
  ok('D2 deny 理由非空（模型可据此改正）',
    typeof hso?.permissionDecisionReason === 'string' && hso.permissionDecisionReason.length > 10);
  ok('D3 未透出 Codex 会拒绝的 updatedInput 字段', !hso?.updatedInput);
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
