#!/usr/bin/env node
// .codex/codex-hook-adapter.mjs 的离线回归测试（2026-08-04）。
// 全部用**真实 hook 脚本**端到端跑，不 mock —— 订阅恢复前这是唯一能拿到的真凭据。
// 覆盖：入向 tool_name 归一化 / 出向四种方言翻译 / Claude 路径零回归。

import { spawnSync } from 'child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  linkSync,
  writeFileSync,
} from 'fs';
import { dirname, resolve, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { parsePatchTargets } from '../.codex/lib/patch-targets.mjs';
import { projectWriteLeaseForPath } from '../.claude/hooks/lib/project-write-lease.mjs';
import { acquireProjectLease, releaseProjectLease } from './project-lease.mjs';

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
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function withPatchState(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'codex-patch-state-test.'));
  try { return fn({ LUCA_PATCH_STATE_DIR: dir }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

function nativePatchLifecycle(command, preHook = 'project-scope-guard.mjs', postHook = 'post-edit.mjs', env = {}) {
  const payload = {
    cwd: ROOT, session_id: SID, tool_name: 'apply_patch', tool_input: { command },
  };
  const pre = runVia(preHook, { ...payload, hook_event_name: 'PreToolUse' }, env);
  const preOut = parse(pre.stdout);
  const transformed = preOut?.hookSpecificOutput?.updatedInput?.command || command;
  const post = preOut?.hookSpecificOutput?.permissionDecision === 'deny' ? null : runVia(postHook, {
    ...payload, hook_event_name: 'PostToolUse', tool_input: { command: transformed },
  }, env);
  return { pre, preOut, transformed, post, postOut: post ? parse(post.stdout) : null };
}

function writeTurnActiveState(sessionId, projectName, projectPath) {
  const st = statSync(projectPath);
  const statePath = join(ROOT, '.claude', `.session-project-${sessionId}`);
  writeFileSync(statePath, `${JSON.stringify({
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: sessionId,
    binding: {
      project: projectName,
      epoch: 1,
      realpath: realpathSync(projectPath),
      dev: Number(st.dev),
      ino: Number(st.ino),
    },
    turn: { turn_id: `turn-${sessionId}`, epoch: 1 },
  })}\n`);
  return statePath;
}

function preservedOutsidePaths(buffer, spans) {
  const chunks = [];
  let cursor = 0;
  for (const span of spans) {
    chunks.push(buffer.subarray(cursor, span.start));
    cursor = span.end;
  }
  chunks.push(buffer.subarray(cursor));
  return Buffer.concat(chunks);
}

const SID = 'codex-adapter-test';
const DIRECT_SID = 'codex-adapter-direct-test';
const cleanup = () => {
  for (const f of ['.session-edit-count-' + SID, '.session-tool-count-' + SID,
                   '.session-turn-count-' + SID, '.session-project-' + SID,
                   '.session-consumed-turns-' + SID,
                   '.session-project-' + DIRECT_SID,
                   '.session-consumed-turns-' + DIRECT_SID]) {
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
// Native apply_patch is covered end-to-end in F/G. This baseline keeps the
// existing Write accounting contract explicit without fabricating a Post event
// that has no matching patch Pre/inventory.
{
  cleanup();
  runVia('post-edit.mjs', {
    hook_event_name: 'PostToolUse',
    session_id: SID,
    tool_name: 'Write',
    tool_input: { file_path: join(ROOT, 'README.md') },
  });
  const p = join(ROOT, '.claude', '.session-edit-count-' + SID);
  const n = existsSync(p) ? parseInt(readFileSync(p, 'utf8').trim() || '0', 10) : 0;
  ok('B1 synthetic Write 进入 post-edit → 编辑计数器递增', n >= 1, `count=${n}`);
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
      tool_name: 'Write', tool_input: { file_path: join(ROOT, 'README.md') },
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
  withPatchState((env) => nativePatchLifecycle(
    '*** Begin Patch\n*** Add File: x.md\n+hi\n*** End Patch',
    'project-scope-guard.mjs', 'post-edit.mjs', env));
  const p1 = join(ROOT, '.claude', '.session-edit-count-' + SID);
  const n1 = existsSync(p1) ? parseInt(readFileSync(p1, 'utf8').trim() || '0', 10) : 0;
  ok('F1 native apply_patch Pre→Post 冻结 inventory 后按 Write 计编辑',
    n1 === 1, `count=${n1}`);
  cleanup();
}
{
  // F1b: a body-only project-looking literal cannot influence classification.
  const command = [
    '*** Begin Patch',
    '*** Update File: README.md',
    '@@',
    '-old prose',
    '+ordinary prose mentions docs/should-not-classify.md',
    '+*** Add File: docs/body-only.md',
    '*** End Patch',
  ].join('\n');
  const result = withPatchState((env) => nativePatchLifecycle(
    command, 'project-scope-guard.mjs', 'post-edit.mjs', env));
  ok('F1b patch body 路径与 +*** 字面量不参与 target classification',
    result.preOut?.hookSpecificOutput?.permissionDecision === 'allow'
      && result.transformed === command && result.post?.status === 0,
    `pre=${String(result.pre.stdout).slice(0, 180)} post=${result.post?.status}`);
}
{
  const malformed = [
    ['missing Begin', '*** Add File: x.md\n+x\n*** End Patch'],
    ['missing End', '*** Begin Patch\n*** Add File: x.md\n+x'],
    ['duplicate Begin', '*** Begin Patch\n*** Begin Patch\n*** Add File: x.md\n+x\n*** End Patch'],
    ['duplicate End', '*** Begin Patch\n*** Add File: x.md\n+x\n*** End Patch\n*** End Patch'],
    ['data after End', '*** Begin Patch\n*** Add File: x.md\n+x\n*** End Patch\ntrailer'],
    ['missing target', '*** Begin Patch\n+x\n*** End Patch'],
    ['empty target', '*** Begin Patch\n*** Add File: \n+x\n*** End Patch'],
    ['move syntax', '*** Begin Patch\n*** Update File: x.md\n*** Move to: y.md\n@@\n-x\n+y\n*** End Patch'],
    ['unknown control', '*** Begin Patch\n*** Rename File: x.md\n*** End Patch'],
    ['duplicate target', '*** Begin Patch\n*** Add File: x.md\n+x\n*** Update File: X.md\n@@\n-x\n+y\n*** End Patch'],
    ['empty Add body', '*** Begin Patch\n*** Add File: x.md\n*** End Patch'],
    ['empty Update hunk', '*** Begin Patch\n*** Update File: x.md\n@@\n*** End Patch'],
    ['malformed Add body', '*** Begin Patch\n*** Add File: x.md\nplain\n*** End Patch'],
    ['malformed Update body', '*** Begin Patch\n*** Update File: x.md\n+x\n*** End Patch'],
    ['malformed Delete body', '*** Begin Patch\n*** Delete File: x.md\n+x\n*** End Patch'],
    ['traversal target', '*** Begin Patch\n*** Add File: ../escape.md\n+x\n*** End Patch'],
    ['absolute target', '*** Begin Patch\n*** Add File: /tmp/escape.md\n+x\n*** End Patch'],
    ['backslash target', '*** Begin Patch\n*** Add File: docs\\escape.md\n+x\n*** End Patch'],
    ['case variant target', '*** Begin Patch\n*** Add File: Docs/escape.md\n+x\n*** End Patch'],
  ];
  withPatchState((env) => {
    for (const [name, command] of malformed) {
      const r = runVia('project-scope-guard.mjs', {
        hook_event_name: 'PreToolUse', cwd: ROOT, session_id: SID,
        tool_name: 'apply_patch', tool_input: { command },
      }, env);
      const o = parse(r.stdout);
      ok(`F1-negative ${name} → structured fail-closed`,
        r.status === 0 && o?.hookSpecificOutput?.permissionDecision === 'deny'
          && /retry apply_patch/.test(o.hookSpecificOutput.permissionDecisionReason || ''),
      `exit=${r.status} stdout=${String(r.stdout).slice(0, 180)}`);
    }
  });
  const invalidUtf8 = Buffer.concat([
    Buffer.from('*** Begin Patch\n*** Add File: bad-'),
    Buffer.from([0xff]),
    Buffer.from('.md\n+x\n*** End Patch'),
  ]);
  let invalidUtf8Denied = false;
  try { parsePatchTargets(invalidUtf8); } catch { invalidUtf8Denied = true; }
  ok('F1-negative invalid UTF-8 cannot desynchronize byte offsets', invalidUtf8Denied);
}
{
  // F2: strict parser derives the real header target, then sends only that
  // target to the guard as a synthetic Write.
  const r = runVia('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse',
    session_id: 'no-such-pin-' + Date.now(),
    tool_name: 'apply_patch',
    tool_input: { command: `*** Begin Patch\n*** Add File: docs/leak.md\n+x\n*** End Patch` },
  });
  const o = parse(r.stdout);
  ok('F2 apply_patch 越界 target → synthetic Write guard 拦下',
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
    session_id: DIRECT_SID, prompt: '帮我设计一个新功能', cwd: ROOT,
  });
  ok('E2 [零回归] Claude 直调 route-guard 仍输出裸文本（未被包成 JSON）',
    String(r.stdout).trim().length > 0 && parse(r.stdout) === null);
}

// ── G0. Patch-only safety module failure must not kill Bash/read lanes ──────
{
  const temp = mkdtempSync(join(tmpdir(), 'codex-patch-module-missing.'));
  const copiedAdapter = join(temp, '.codex', 'codex-hook-adapter.mjs');
  const fakeGuard = join(temp, '.claude', 'hooks', 'project-scope-guard-probe.mjs');
  try {
    mkdirSync(dirname(copiedAdapter), { recursive: true });
    mkdirSync(dirname(fakeGuard), { recursive: true });
    writeFileSync(copiedAdapter, readFileSync(ADAPTER));
    writeFileSync(fakeGuard, [
      'process.stdout.write(JSON.stringify({hookSpecificOutput:{',
      'hookEventName:"PreToolUse",updatedInput:{command:"ls"}}}));',
    ].join(''));
    const invoke = (payload) => spawnSync('node', [copiedAdapter, fakeGuard], {
      input: JSON.stringify(payload), encoding: 'utf8', cwd: temp, timeout: 30000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: '' },
    });
    const patchRun = invoke({
      hook_event_name: 'PreToolUse', cwd: temp, session_id: SID,
      tool_name: 'apply_patch',
      tool_input: { command: '*** Begin Patch\n*** Add File: x.md\n+x\n*** End Patch' },
    });
    const patchOut = parse(patchRun.stdout);
    const bashRun = invoke({
      hook_event_name: 'PreToolUse', cwd: temp, session_id: SID,
      tool_name: 'Bash', tool_input: { command: 'ls' },
    });
    ok('G0a missing parser/lease module denies only apply_patch with native recovery text',
      patchRun.status === 0 && patchOut?.hookSpecificOutput?.permissionDecision === 'deny'
        && /retry apply_patch/.test(patchOut.hookSpecificOutput.permissionDecisionReason || '')
        && /Bash and read-only inspection remain available/.test(patchOut.hookSpecificOutput.permissionDecisionReason || '')
        && !/\b(?:Edit|Write|MultiEdit)\b/.test(patchOut.hookSpecificOutput.permissionDecisionReason || ''),
      `status=${patchRun.status} stdout=${String(patchRun.stdout).slice(0, 200)}`);
    ok('G0b missing patch modules leave the Bash lane executable',
      bashRun.status === 0 && parse(bashRun.stdout)?.hookSpecificOutput?.updatedInput?.command === 'ls',
      `status=${bashRun.status} stderr=${bashRun.stderr}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// ── G. Native patch inventory: Pre classifies, Post reuses exact targets ─────────
{
  const patch = '*** Begin Patch\n*** Update File: framework/list-page.html\n@@\n+x\n*** End Patch';
  const r = runVia('project-scope-guard.mjs', {
    hook_event_name: 'PreToolUse', cwd: ROOT, session_id: SID,
    tool_name: 'apply_patch', tool_input: { command: patch },
  });
  const o = parse(r.stdout);
  ok('G1 framework target 在 Pre synthetic Write 阶段即被拒绝',
    o?.hookSpecificOutput?.permissionDecision === 'deny'
      && /framework\//.test(o.hookSpecificOutput.permissionDecisionReason || ''),
    `输出=${String(r.stdout).slice(0, 160)}`);
}
{
  const editCount = join(ROOT, '.claude', '.session-edit-count-' + SID);
  if (existsSync(editCount)) rmSync(editCount, { force: true });
  const patch = '*** Begin Patch\n*** Update File: a.md\n@@\n+x\n*** Update File: b.md\n@@\n+y\n*** End Patch';
  withPatchState((env) => nativePatchLifecycle(
    patch, 'project-scope-guard.mjs', 'post-edit.mjs', env));
  let n = 0;
  try { n = parseInt(readFileSync(editCount, 'utf8'), 10) || 0; } catch { }
  ok('G2 多文件 patch → Post 按 Pre 冻结 inventory 每目标各触发一次', n === 2, `edit-count=${n}`);
}
{
  // Boundary probe records the real child-hook payloads outside the repository.
  const probeRoot = mkdtempSync(join(tmpdir(), 'codex-patch-probe.'));
  const log = join(probeRoot, 'events.jsonl');
  const mk = (name) => {
    const p = join(HOOKS, name);
    writeFileSync(p, [
      'import{appendFileSync,readFileSync}from"node:fs";',
      'appendFileSync(process.env.PATCH_PROBE_LOG,readFileSync(0,"utf8")+"\\n");',
    ].join(''));
    return p;
  };
  const patch = '*** Begin Patch\n*** Update File: a.md\n@@\n+x\n*** Update File: b.md\n@@\n+y\n*** End Patch';
  const pe = mk('.b5-echo-post-edit.mjs'), pg = mk('.b5-echo-project-scope-guard.mjs');
  try {
    withPatchState((stateEnv) => nativePatchLifecycle(
      patch, '.b5-echo-project-scope-guard.mjs', '.b5-echo-post-edit.mjs',
      { ...stateEnv, PATCH_PROBE_LOG: log }));
    const events = readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(parse);
    const pre = events.filter((event) => event?.hook_event_name === 'PreToolUse');
    const post = events.filter((event) => event?.hook_event_name === 'PostToolUse');
    ok('G3 Pre 对每个 header target 恰合成一次 Write，正文不进入 file_path',
      pre.length === 2 && pre.every((event) => event.tool_name === 'Write')
        && pre.map((event) => event.tool_input?.file_path).join(',') === 'a.md,b.md',
      `events=${events.length} pre=${pre.length}`);
    ok('G4 Post 只复用同一有序 target inventory，不重新解析 body',
      post.length === 2 && post.every((event) => event.tool_name === 'Write')
        && post.map((event) => event.tool_input?.file_path).join(',') === 'a.md,b.md',
      `events=${events.length} post=${post.length}`);
  } finally {
    for (const p of [pe, pg]) if (existsSync(p)) rmSync(p, { force: true });
    rmSync(probeRoot, { recursive: true, force: true });
  }
}

// ── I. Isolated native consumer + project lease lifecycle ───────────────────
{
  const temp = mkdtempSync(join(tmpdir(), `codex-native-${'x'.repeat(88)}.`));
  const projects = join(temp, 'projects');
  const stateDir = join(temp, 'patch-state');
  const a = join(projects, 'A');
  const b = join(projects, 'B');
  const nativeSid = `u005-native-${process.pid}`.slice(0, 36);
  const failSid = `u005-fail-${process.pid}`.slice(0, 36);
  const postFailSid = `u005-postfail-${process.pid}`.slice(0, 36);
  const switchSid = `u005-switch-${process.pid}`.slice(0, 36);
  const globalSid = `u005-global-${process.pid}`.slice(0, 36);
  const deleteSid = `u005-delete-${process.pid}`.slice(0, 36);
  const updateSid = `u005-update-${process.pid}`.slice(0, 36);
  const mixedSid = `u005-mixed-${process.pid}`.slice(0, 36);
  const inventorySid = `u005-inventory-${process.pid}`.slice(0, 36);
  const raceSid = `u005-race-${process.pid}`.slice(0, 36);
  const linkSid = `u005-link-${process.pid}`.slice(0, 36);
  const transient = [nativeSid, failSid, postFailSid, switchSid, globalSid, deleteSid,
    updateSid, mixedSid, inventorySid, raceSid, linkSid];
  const display = join(ROOT, 'docs');
  let createdDisplay = false;
  let displayA = null;
  const env = { LUCA_PROJECTS_ROOT: projects, LUCA_PATCH_STATE_DIR: stateDir, LUCA_APP: '0' };
  const patchState = (sid) => join(stateDir, `.codex-patch-contract-${sid}.json`);
  const cleanupSid = (sid) => {
    for (const file of [
      join(ROOT, '.claude', `.session-project-${sid}`),
      join(ROOT, '.claude', `.session-edit-count-${sid}`),
      join(ROOT, '.claude', `.session-tool-count-${sid}`),
      patchState(sid),
    ]) {
      if (existsSync(file)) rmSync(file, { force: true });
    }
  };
  try {
    for (const project of [a, b]) {
      mkdirSync(join(project, 'docs'), { recursive: true });
      mkdirSync(join(project, '.luca'), { recursive: true });
      writeFileSync(join(project, '.luca', 'workflow-state.yaml'), 'topic: ""\nnodes: {}\n');
      writeFileSync(join(project, '.luca', 'current-topic.txt'), '');
    }
    mkdirSync(stateDir, { recursive: true });
    if (existsSync(display)) {
      const st = lstatSync(display);
      if (!st.isSymbolicLink()) throw new Error(`native fixture refuses non-symlink display path: ${display}`);
      displayA = realpathSync(display);
    } else {
      symlinkSync(join(a, 'docs'), display);
      createdDisplay = true;
      displayA = realpathSync(display);
    }

    writeTurnActiveState(nativeSid, 'B', b);
    const unique = `.u005-native-${process.pid}`;
    const sourceText = [
      '*** Begin Patch',
      `*** Add File: docs/${unique}-a.txt`,
      '+literal docs/not-a-target.txt',
      '+*** Add File: docs/still-not-a-target.txt',
      `*** Add File: docs/${unique}-中文 空格.txt`,
      '+第二个文件',
      '*** End Patch',
    ].join('\n');
    const source = Buffer.from(sourceText);
    const parsed = parsePatchTargets(source);
    const pre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: nativeSid,
      tool_name: 'apply_patch', tool_input: { command: sourceText },
    }, env);
    const preOut = parse(pre.stdout);
    const transformedText = preOut?.hookSpecificOutput?.updatedInput?.command || '';
    const transformed = Buffer.from(transformedText);
    const state = parse(readFileSync(patchState(nativeSid), 'utf8'));
    const outputSpans = state.span_map.map((item) => item.output);
    const firstDelta = outputSpans[0].end - outputSpans[0].start
      - (state.span_map[0].source.end - state.span_map[0].source.start);
    const secondStartDelta = outputSpans[1].start - state.span_map[1].source.start;
    const sourceOutside = preservedOutsidePaths(source, parsed.path_spans);
    const outputOutside = preservedOutsidePaths(transformed, outputSpans);
    ok('I1 native Pre redirects exact ordered headers to pinned B and holds one project lease',
      pre.status === 0 && state.targets.length === 2
        && state.targets.every((item) => item.output_path.startsWith(realpathSync(b) + '/'))
        && !!projectWriteLeaseForPath(join(b, 'docs'), projects),
      `status=${pre.status} stdout=${String(pre.stdout).slice(0, 180)}`);
    ok('I2 long first redirect has cumulative span offsets and every non-path byte is identical',
      firstDelta >= 80 && secondStartDelta === firstDelta
        && sourceOutside.equals(outputOutside)
        && sha256(sourceOutside) === state.non_path_hash,
      `firstDelta=${firstDelta} secondStartDelta=${secondStartDelta} bytesEqual=${sourceOutside.equals(outputOutside)} sourceHash=${sha256(sourceOutside)} stateHash=${state.non_path_hash}`);

    const txEnv = {
      ...process.env,
      CLAUDE_PROJECT_DIR: ROOT,
      LUCA_GSTACK_ROOT: ROOT,
      LUCA_PROJECTS_ROOT: projects,
      LUCA_ACTUAL_HARNESS: 'claude',
    };
    const prepared = spawnSync('node', [join(ROOT, 'scripts', 'project-pin.mjs'),
      'prepare', '--session', switchSid, '--operation', 'switch', '--target', 'B',
      '--turn-id', `turn-${switchSid}`], {
      cwd: ROOT, env: txEnv, encoding: 'utf8', timeout: 30000,
    });
    const proposal = parse(prepared.stdout);
    const competingSwitch = proposal ? spawnSync('bash', [join(ROOT, 'scripts', 'project.sh'),
      'switch', 'B', '--session-id', switchSid, '--tx', proposal.tx,
      '--expected-epoch', String(proposal.expected_epoch)], {
      cwd: ROOT, env: txEnv, encoding: 'utf8', timeout: 30000,
    }) : prepared;
    ok('I2b project transaction acquires global lock then refuses an active target write lease',
      prepared.status === 0 && competingSwitch.status !== 0
        && /active patch write lease/.test(String(competingSwitch.stderr)),
      `prepare=${prepared.status} switch=${competingSwitch.status} stderr=${competingSwitch.stderr}`);

    const consumer = spawnSync('apply_patch', [], {
      input: transformedText, encoding: 'utf8', cwd: ROOT, timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    });
    ok('I3 guard output passes the real apply_patch consumer', consumer.status === 0,
      `status=${consumer.status} stdout=${consumer.stdout} stderr=${consumer.stderr}`);
    const aFirst = join(displayA, `${unique}-a.txt`);
    const aSecond = join(displayA, `${unique}-中文 空格.txt`);
    const bFirst = join(b, 'docs', `${unique}-a.txt`);
    const bSecond = join(b, 'docs', `${unique}-中文 空格.txt`);
    ok('I4 display A is unchanged and only pinned B receives both files with literal body intact',
      !existsSync(aFirst) && !existsSync(aSecond)
        && readFileSync(bFirst, 'utf8').includes('docs/still-not-a-target.txt')
        && readFileSync(bSecond, 'utf8') === '第二个文件\n');

    const post = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: nativeSid,
      tool_name: 'apply_patch', tool_input: { command: transformedText },
      tool_response: { success: true },
    }, env);
    const count = Number.parseInt(readFileSync(join(ROOT, '.claude', `.session-edit-count-${nativeSid}`), 'utf8'), 10);
    ok('I5 native Post consumes exact Pre inventory and releases lease/state',
      post.status === 0 && count === 2 && !existsSync(patchState(nativeSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects),
      `status=${post.status} count=${count} stderr=${post.stderr}`);

    writeTurnActiveState(updateSid, 'B', b);
    const updateText = `*** Begin Patch\n*** Update File: docs/${unique}-中文 空格.txt\n@@\n-第二个文件\n+第二个文件已更新\n*** End Patch`;
    const updatePre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: updateSid,
      tool_name: 'apply_patch', tool_input: { command: updateText },
    }, env);
    const updateCommand = parse(updatePre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    const updateConsumer = spawnSync('apply_patch', [], {
      input: updateCommand, encoding: 'utf8', cwd: ROOT, timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    });
    const updatePost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: updateSid,
      tool_name: 'apply_patch', tool_input: { command: updateCommand },
      tool_response: { success: true },
    }, env);
    ok('I5a valid Update preserves real apply_patch semantics through redirect and Post',
      updatePre.status === 0 && updateConsumer.status === 0 && updatePost.status === 0
        && readFileSync(bSecond, 'utf8') === '第二个文件已更新\n'
        && !existsSync(patchState(updateSid)),
      `pre=${updatePre.status} consumer=${updateConsumer.status} post=${updatePost.status}`);

    writeTurnActiveState(deleteSid, 'B', b);
    const deleteText = `*** Begin Patch\n*** Delete File: docs/${unique}-a.txt\n*** End Patch`;
    const deletePre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: deleteSid,
      tool_name: 'apply_patch', tool_input: { command: deleteText },
    }, env);
    const deleteCommand = parse(deletePre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    const deleteConsumer = spawnSync('apply_patch', [], {
      input: deleteCommand, encoding: 'utf8', cwd: ROOT, timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    });
    const deletePost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: deleteSid,
      tool_name: 'apply_patch', tool_input: { command: deleteCommand },
      tool_response: { success: true },
    }, env);
    ok('I5b legitimate Delete may change/remove the leaf inode while directory ancestry stays frozen',
      deletePre.status === 0 && deleteConsumer.status === 0 && deletePost.status === 0
        && !existsSync(bFirst) && !existsSync(patchState(deleteSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects),
      `pre=${deletePre.status} consumer=${deleteConsumer.status} post=${deletePost.status}`);

    writeTurnActiveState(mixedSid, 'B', b);
    const mixedText = [
      '*** Begin Patch',
      `*** Add File: docs/${unique}-allowed.txt`,
      '+x',
      '*** Update File: framework/list-page.html',
      '@@',
      '-old',
      '+new',
      '*** End Patch',
    ].join('\n');
    const mixed = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: mixedSid,
      tool_name: 'apply_patch', tool_input: { command: mixedText },
    }, env);
    ok('I5c one denied target rejects the whole multi-file patch before state/lease publication',
      mixed.status === 0 && parse(mixed.stdout)?.hookSpecificOutput?.permissionDecision === 'deny'
        && !existsSync(patchState(mixedSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects)
        && !existsSync(join(b, 'docs', `${unique}-allowed.txt`)),
      `status=${mixed.status} stdout=${String(mixed.stdout).slice(0, 180)}`);

    writeTurnActiveState(inventorySid, 'B', b);
    const inventoryText = `*** Begin Patch\n*** Add File: docs/${unique}-inventory.txt\n+x\n*** End Patch`;
    const inventoryPre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: inventorySid,
      tool_name: 'apply_patch', tool_input: { command: inventoryText },
    }, env);
    const inventoryCommand = parse(inventoryPre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    const inventoryPath = patchState(inventorySid);
    const inventoryRaw = readFileSync(inventoryPath);
    const wrongBodyPost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: inventorySid,
      tool_name: 'apply_patch', tool_input: { command: `${inventoryCommand}\n` },
      tool_response: { success: false },
    }, env);
    const forged = parse(inventoryRaw);
    forged.targets[0].output_path = join(b, 'docs', `${unique}-forged.txt`);
    writeFileSync(inventoryPath, `${JSON.stringify(forged)}\n`);
    const forgedStatePost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: inventorySid,
      tool_name: 'apply_patch', tool_input: { command: inventoryCommand },
      tool_response: { success: false },
    }, env);
    const heldAfterFailures = !!projectWriteLeaseForPath(join(b, 'docs'), projects);
    writeFileSync(inventoryPath, inventoryRaw);
    const inventoryRecovery = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: inventorySid,
      tool_name: 'apply_patch', tool_input: { command: inventoryCommand },
      tool_response: { success: false },
    }, env);
    ok('I5d Post rejects changed body bytes and forged frozen inventory, then exact retry releases',
      inventoryPre.status === 0 && wrongBodyPost.status === 2 && forgedStatePost.status === 2
        && heldAfterFailures && inventoryRecovery.status === 0
        && !existsSync(inventoryPath) && !projectWriteLeaseForPath(join(b, 'docs'), projects),
      `pre=${inventoryPre.status} body=${wrongBodyPost.status} forged=${forgedStatePost.status} recovery=${inventoryRecovery.status}`);

    const raceDir = join(b, 'docs', `${unique}-race`);
    const raceOld = `${raceDir}-old`;
    mkdirSync(raceDir);
    writeTurnActiveState(raceSid, 'B', b);
    const raceText = `*** Begin Patch\n*** Add File: docs/${unique}-race/x.txt\n+x\n*** End Patch`;
    const racePre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: raceSid,
      tool_name: 'apply_patch', tool_input: { command: raceText },
    }, env);
    const raceCommand = parse(racePre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    renameSync(raceDir, raceOld);
    mkdirSync(raceDir);
    const driftPost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: raceSid,
      tool_name: 'apply_patch', tool_input: { command: raceCommand },
      tool_response: { success: false },
    }, env);
    rmSync(raceDir, { recursive: true, force: true });
    renameSync(raceOld, raceDir);
    const driftRecovery = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: raceSid,
      tool_name: 'apply_patch', tool_input: { command: raceCommand },
      tool_response: { success: false },
    }, env);
    ok('I5e directory inode drift retains lease/state until exact ancestry is restored',
      racePre.status === 0 && driftPost.status === 2 && driftRecovery.status === 0
        && !existsSync(patchState(raceSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects),
      `pre=${racePre.status} drift=${driftPost.status} recovery=${driftRecovery.status}`);

    writeTurnActiveState(linkSid, 'B', b);
    const hardBase = join(b, 'docs', `${unique}-hard-base.txt`);
    const hardTarget = join(b, 'docs', `${unique}-hard-target.txt`);
    writeFileSync(hardBase, 'old\n');
    linkSync(hardBase, hardTarget);
    const hardText = `*** Begin Patch\n*** Update File: docs/${unique}-hard-target.txt\n@@\n-old\n+new\n*** End Patch`;
    const hardPre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: linkSid,
      tool_name: 'apply_patch', tool_input: { command: hardText },
    }, env);
    const outside = join(temp, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(b, 'docs', `${unique}-sym`));
    const symText = `*** Begin Patch\n*** Add File: docs/${unique}-sym/x.txt\n+x\n*** End Patch`;
    const symPre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: linkSid,
      tool_name: 'apply_patch', tool_input: { command: symText },
    }, env);
    ok('I5f hard-linked leaf and symlink ancestry both fail closed before patch execution',
      parse(hardPre.stdout)?.hookSpecificOutput?.permissionDecision === 'deny'
        && parse(symPre.stdout)?.hookSpecificOutput?.permissionDecision === 'deny'
        && !existsSync(patchState(linkSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects),
      `hard=${hardPre.status}/${String(hardPre.stdout).slice(0, 100)} sym=${symPre.status}/${String(symPre.stdout).slice(0, 100)}`);

    writeTurnActiveState(failSid, 'B', b);
    const failureText = `*** Begin Patch\n*** Add File: docs/${unique}-not-created.txt\n+x\n*** End Patch`;
    const failurePre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: failSid,
      tool_name: 'apply_patch', tool_input: { command: failureText },
    }, env);
    const failureCommand = parse(failurePre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    const failurePost = runVia('post-edit.mjs', {
      hook_event_name: 'PostToolUse', cwd: ROOT, session_id: failSid,
      tool_name: 'apply_patch', tool_input: { command: failureCommand },
      tool_response: { success: false, error: 'injected consumer failure' },
    }, env);
    ok('I6 failed real-tool result releases exact lease/state without post-edit side effects',
      failurePre.status === 0 && failurePost.status === 0
        && !existsSync(patchState(failSid))
        && !projectWriteLeaseForPath(join(b, 'docs'), projects)
        && !existsSync(join(b, 'docs', `${unique}-not-created.txt`)));

    writeTurnActiveState(postFailSid, 'B', b);
    const postFailText = `*** Begin Patch\n*** Add File: docs/${unique}-postfail.txt\n+x\n*** End Patch`;
    const postFailurePre = runVia('project-scope-guard.mjs', {
      hook_event_name: 'PreToolUse', cwd: ROOT, session_id: postFailSid,
      tool_name: 'apply_patch', tool_input: { command: postFailText },
    }, env);
    const postFailureCommand = parse(postFailurePre.stdout)?.hookSpecificOutput?.updatedInput?.command;
    const failingHook = join(HOOKS, '.u005-failing-post-edit.mjs');
    writeFileSync(failingHook, 'process.stderr.write("injected post failure\\n");process.exitCode=1;\n');
    try {
      const postFailure = runVia('.u005-failing-post-edit.mjs', {
        hook_event_name: 'PostToolUse', cwd: ROOT, session_id: postFailSid,
        tool_name: 'apply_patch', tool_input: { command: postFailureCommand },
        tool_response: { success: true },
      }, env);
      ok('I7 post-edit child failure still releases exact lease/state before reporting failure',
        postFailurePre.status === 0 && postFailure.status === 2
          && !existsSync(patchState(postFailSid))
          && !projectWriteLeaseForPath(join(b, 'docs'), projects),
        `status=${postFailure.status} stderr=${postFailure.stderr}`);
    } finally {
      if (existsSync(failingHook)) unlinkSync(failingHook);
    }

    writeTurnActiveState(globalSid, 'B', b);
    const globalLease = acquireProjectLease({
      root: ROOT,
      ownerToken: `u005-global-${process.pid}`,
      pid: process.pid,
    });
    try {
      const blockedText = `*** Begin Patch\n*** Add File: docs/${unique}-global-blocked.txt\n+x\n*** End Patch`;
      const blocked = runVia('project-scope-guard.mjs', {
        hook_event_name: 'PreToolUse', cwd: ROOT, session_id: globalSid,
        tool_name: 'apply_patch', tool_input: { command: blockedText },
      }, env);
      const denied = parse(blocked.stdout);
      ok('I8 active global project transaction blocks patch lease acquisition before mutation',
        blocked.status === 0 && denied?.hookSpecificOutput?.permissionDecision === 'deny'
          && /project switch transaction is active/.test(denied.hookSpecificOutput.permissionDecisionReason || '')
          && !existsSync(patchState(globalSid))
          && !projectWriteLeaseForPath(join(b, 'docs'), projects));
    } finally {
      releaseProjectLease({ root: ROOT, ownerHandle: globalLease.owner_handle });
    }
  } catch (error) {
    ok('I-native fixture completed without unexpected exception', false, error.stack || String(error));
  } finally {
    for (const sid of transient) cleanupSid(sid);
    if (createdDisplay && existsSync(display) && lstatSync(display).isSymbolicLink()) unlinkSync(display);
    rmSync(temp, { recursive: true, force: true });
  }
}

cleanup();
console.log(`\n=== test-codex-adapter summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail === 0 ? 0 : 1);
