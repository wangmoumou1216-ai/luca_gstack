#!/usr/bin/env node
// Codex ↔ Claude Code hook 适配层（2026-08-04）。
//
// 【为什么是 adapter 而不是改 6 个 hook】
// luca 明确要求「不要缩减现有框架的任何逻辑」。逐个改 hook 意味着在 6 个文件里各插一条
// harness 分支，每条都是一次回归风险，且 Codex 分支天然缺测（订阅恢复前跑不了真 session）。
// adapter 把差异收敛到**一个**文件：现有 hook 脚本零改动、Claude 路径零触碰，
// Codex 侧的行为由本文件单点负责翻译。要回退只需从 .codex/hooks.json 摘掉本包装。
//
// 【它做四件事】
// 1. 入向归一化：Codex 的 tool_name（shell / apply_patch）→ CC 名（Bash / Write），
//    使 post-edit.mjs 的 /^(Write|Edit|MultiEdit|NotebookEdit)$/、project-scope-guard.mjs
//    的写工具判定等**现有正则原样命中**。不归一化会造成连锁失效：post-edit 的
//    .session-edit-count 恒 0 → session-sync 判定"本 session 无实质工作" → Stop 自成长
//    捕获永不触发（2026-08-04 实测发现）。
// 2. 注入 CLAUDE_PROJECT_DIR：现有 hook 用它定位仓根，且 harness.detectHarness() 据此
//    判为 claude，从而走**完整 CC 强制路径**而非 stderr advisory 降级。降级判断由本层
//    接管——因为实测 Codex 支持 deny，首版那套"Codex 无强制能力"的假设是错的。
// 3. 出向翻译：CC 形控制动词 → Codex 方言（见 translate()）。
// 4. 纯文本 → Codex 的 hookSpecificOutput.additionalContext 包装（CC 接受裸文本，Codex 不）。
//
// 用法：node codex-hook-adapter.mjs <hook脚本绝对路径>
// 失败一律 fail-open（静默放行），绝不因适配层自身异常阻断 Codex。

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Codex tool_name → Claude Code tool_name。
// 依据：openai/codex#18491 —— PreToolUse 仅对 shell 与 apply_patch 分发；
// 0.123.0 起 tool_name 由 handler 提供（不再恒为 "Bash"）。
const TOOL_NAME_MAP = {
  shell: 'Bash',
  local_shell: 'Bash',
  apply_patch: 'Write',
};

function fail_open() { process.exit(0); }

const target = process.argv[2];
if (!target) fail_open();

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { fail_open(); }

let data = {};
try { data = JSON.parse(raw || '{}'); } catch { data = {}; }

// ── 1. 入向归一化 ────────────────────────────────────────────────────────────
const codexToolName = data.tool_name || '';
if (codexToolName && TOOL_NAME_MAP[codexToolName]) {
  data.tool_name = TOOL_NAME_MAP[codexToolName];
}
// Codex 的 SessionStart 无 source 字段；session-restore 对未知 source 走"保守保留软链"
// 分支（安全侧），无需伪造。此处只在确实缺失时补一个显式非-startup 值，避免误清并行软链。
if (data.hook_event_name === 'SessionStart' && !data.source) {
  data.source = 'codex-start';
}

const childEnv = { ...process.env };
if (!childEnv.CLAUDE_PROJECT_DIR) childEnv.CLAUDE_PROJECT_DIR = REPO_ROOT;

// ── 2. 执行目标 hook ─────────────────────────────────────────────────────────
let r;
try {
  r = spawnSync('node', [target], {
    input: JSON.stringify(data),
    env: childEnv,
    encoding: 'utf8',
    timeout: 30000,
    cwd: REPO_ROOT,
  });
} catch { fail_open(); }

if (!r || r.error) fail_open();
if (r.stderr) process.stderr.write(r.stderr);

const out = String(r.stdout || '').trim();
if (!out) process.exit(r.status === 2 ? 2 : 0);

// ── 3. 出向翻译 ──────────────────────────────────────────────────────────────
function translate(text, eventName) {
  let obj = null;
  try { obj = JSON.parse(text); } catch { /* 非 JSON = 纯文本上下文 */ }

  // 纯文本 → additionalContext（route-guard / session-restore 走这条）
  if (obj === null || typeof obj !== 'object') {
    return {
      hookSpecificOutput: {
        hookEventName: eventName || 'UserPromptSubmit',
        additionalContext: text,
      },
    };
  }

  // CC 形 Stop 拦截 {decision:'block',reason} → Codex 的 {continue:false,stopReason}
  // 能力两家都有，仅字段名不同——首版误判为"Codex 无 Stop 强制"而整个关掉。
  if (obj.decision === 'block') {
    return {
      continue: false,
      stopReason: obj.reason || 'blocked by luca_gstack Stop hook',
      systemMessage: obj.reason || undefined,
    };
  }

  const hso = obj.hookSpecificOutput;
  if (hso && typeof hso === 'object') {
    // deny：两家同字段同语义，原样透传（实测 Codex 支持）
    if (hso.permissionDecision === 'deny') return obj;

    // updatedInput：Codex 运行时**显式拒绝**（output_parser.rs / openai/codex#18491 OPEN）。
    // 静默丢弃会让"落错项目"从被自动纠正变成无声通过——失效方向必须偏向保住强制，
    // 故降级为 deny 并把本应重写成的路径写进 reason，让模型自己改对后重试。
    if (hso.updatedInput) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            '[codex-adapter] 当前 harness 不支持 PreToolUse 输入重写（openai/codex#18491），'
            + '无法自动把路径重定向到本 session 绑定的项目。请改用下列已重定向的输入后重试：'
            + JSON.stringify(hso.updatedInput),
        },
      };
    }
  }

  return obj;
}

try {
  process.stdout.write(JSON.stringify(translate(out, data.hook_event_name)) + '\n');
} catch { /* fail-open */ }

process.exit(r.status === 2 ? 2 : 0);
