#!/usr/bin/env node
// Codex ↔ Claude Code hook 适配层。
//
// 【2026-08-05 深审重写 — 初版四个 BLOCKER 全部经一手证据证实并修正】
// 初版把 Codex 当成"协议相似但方言不同"的 harness，翻译了本不需要翻译的动词，且关键证据取自
// 一个 OPEN 的 GitHub issue 而非实际运行的二进制。实测（codex-cli 0.146.0，本会话期间自动从
// 0.133.0 升级）逐条推翻：
//
//  B1 仓库级 hooks.json **根本不被加载**。实测矩阵：`.codex/` `.agents/` `.claude/` 三处 ×
//     （无 trust / 加 projects trust / --dangerously-bypass-hook-trust）全组合均不触发。
//     唯一生效的注册点是**用户级 `~/.codex/hooks.json`**。
//     ⇒ 本 adapter 必须自带**仓库自守**（见 inRepo）：全局注册后只在本仓生效，其它项目立即退出。
//  B2 `process.stdout.write` 后立刻 `process.exit()` 会丢弃未落 OS 管道的数据（macOS 64KiB）。
//     实测 200000 字节 → 对端只收到 65536。大 payload（往 docs/ 写报告/原型时的 updatedInput）
//     恰在最需要控制动词时被截断成非法 JSON。⇒ 改用 process.exitCode，让 Node 自然退出。
//  B3 Stop 的 `decision:block` **不需要翻译**。运行中二进制内含校验串
//     "Stop hook returned decision:block without a non-empty reason" 与
//     "Stop hook requested continuation without a prompt; ignoring the block"
//     ——Codex 与 CC 同字段同语义（block = 别停、这是继续的提示词）。
//     初版译成 `continue:false`（=终止本轮）是**语义反转**：自成长捕获不再发生，用户回合还被杀掉。
//  B4 `updatedInput` **受支持**，不是被拒绝。二进制校验串
//     "PreToolUse hook returned updatedInput without permissionDecision:allow" 说明它是一等字段，
//     只是必须与 permissionDecision:allow 同发。初版据 openai/codex#18491（针对旧版本、且仍 OPEN）
//     降级为 deny，把 project-scope-guard 的**正常重定向路径**变成硬拒绝，比 fail-open 更糟。
//
// 【职责】只做三件必要的事，能不翻译就不翻译：
//  1. 仓库自守（B1 的必然要求）
//  2. 入向 tool_name 归一化：shell→Bash、apply_patch→Write，使现有 hook 的正则原样命中。
//     不归一化会连锁失效：post-edit 的 .session-edit-count 恒 0 → session-sync 判"无实质工作"
//     → Stop 自成长捕获永不触发。
//  3. 出向**最小**适配：updatedInput 补 allow；裸文本包 additionalContext（仅限支持该字段的事件）。
//
// 失败一律 fail-open（放行）**但留 stderr 诊断**——静默 fail-open 是初版被审出的可观测性黑洞。
//
// 用法：node codex-hook-adapter.mjs <hook脚本绝对路径>

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, resolve, relative, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const diag = (m) => { try { process.stderr.write(`[codex-adapter] ${m}\n`); } catch { } };

// Codex tool_name → Claude Code tool_name（PreToolUse 目前只对 shell / apply_patch 分发）
const TOOL_NAME_MAP = { shell: 'Bash', local_shell: 'Bash', apply_patch: 'Write' };

// 哪些事件的输出 schema 含 additionalContext。Stop 的 schema 是 additionalProperties:false
// 且**没有** hookSpecificOutput —— 往 Stop 塞它会被判 "invalid stop hook JSON output"。
const SUPPORTS_ADDITIONAL_CONTEXT = new Set([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
]);

// 本 adapter 经**用户级** ~/.codex/hooks.json 注册（B1：仓库级不被加载），因此会在所有项目里
// 被调用。只在本仓范围内工作，其它项目静默放行——全局注册不等于全局生效。
function inRepo(cwd) {
  try {
    const rel = relative(REPO_ROOT, resolve(cwd || process.cwd()));
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  } catch { return false; }
}

// 出向适配：**默认原样透传**，只做两处必要修补。
function adapt(text, event) {
  let obj = null;
  try { obj = JSON.parse(text); } catch { /* 非 JSON = 纯文本 */ }

  // 纯文本（route-guard / session-restore 的提示）→ additionalContext。
  // 仅限支持该字段的事件；Stop 不支持，塞了会被判非法输出，宁可丢弃并留诊断。
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (!SUPPORTS_ADDITIONAL_CONTEXT.has(event)) {
      diag(`${event || '(未知事件)'} 不支持 additionalContext，已丢弃非结构化 hook 输出`);
      return null;
    }
    return { hookSpecificOutput: { hookEventName: event, additionalContext: text } };
  }

  // decision:block —— **刻意不翻译**。Codex 与 CC 同字段同语义（见文件头 B3）。

  const hso = obj.hookSpecificOutput;
  if (hso && typeof hso === 'object' && hso.updatedInput) {
    // updatedInput 受支持，但必须与 permissionDecision:allow 同发（见文件头 B4）
    return {
      ...obj,
      hookSpecificOutput: {
        ...hso,
        hookEventName: hso.hookEventName || 'PreToolUse',
        permissionDecision: hso.permissionDecision || 'allow',
      },
    };
  }
  return obj;
}

// ── 主流程（全程 process.exitCode，绝不用 process.exit —— 见 B2）──────────────
function main() {
  const target = process.argv[2];
  if (!target) { diag('缺少目标 hook 路径参数'); return 0; }

  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch (e) {
    // EAGAIN（非阻塞 stdin）等：如实报告，不假装读到了空输入
    diag(`读取 stdin 失败(${(e && e.code) || e})——放行，hook 未执行`); return 0;
  }

  let data;
  try { data = JSON.parse(raw || '{}'); } catch {
    // 初版在此静默降级成 {} 并照常执行 hook —— 等于用空 payload 骗过守卫
    diag('stdin 不是合法 JSON——放行且不执行 hook（不以空 payload 冒充真实输入）'); return 0;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) { diag('stdin JSON 不是对象——放行'); return 0; }

  if (!inRepo(data.cwd)) return 0;      // 其它项目：静默放行，零副作用

  const event = data.hook_event_name || '';
  if (data.tool_name && TOOL_NAME_MAP[data.tool_name]) data.tool_name = TOOL_NAME_MAP[data.tool_name];
  // Codex 的 SessionStart 无 source 字段；给显式非-startup 值，让 session-restore 走
  // "保守保留软链"分支，避免误清并行 session 的软链。
  if (event === 'SessionStart' && !data.source) data.source = 'codex-start';

  const childEnv = { ...process.env };
  // REPO_ROOT 由本文件自身路径推得，永远正确；继承来的同名变量可能指向别的仓库
  // （例如从 Claude Code 的 shell 里启动 codex），必须以本值为准。
  childEnv.CLAUDE_PROJECT_DIR = REPO_ROOT;
  childEnv.LUCA_ACTUAL_HARNESS = 'codex';   // 真实 CLI 身份（detectHarness 回答的是"按哪套协议输出"）
  childEnv.LUCA_HARNESS_ADAPTED = '1';

  let r;
  try {
    r = spawnSync('node', [target], {
      input: JSON.stringify(data), env: childEnv, encoding: 'utf8',
      timeout: 30000, cwd: REPO_ROOT,
      maxBuffer: 64 * 1024 * 1024,   // 默认 1MiB 会让大 payload 的控制动词整个消失
    });
  } catch (e) { diag(`spawn 异常(${(e && e.message) || e})——放行`); return 0; }
  if (!r) { diag('spawnSync 无返回——放行'); return 0; }

  if (r.stderr) process.stderr.write(r.stderr);
  // 初版这些失败全部静默 exit 0，事后无从排查
  if (r.error) {
    diag(`hook 执行失败(${r.error.code || r.error.message})`
      + (r.error.code === 'ETIMEDOUT' ? '——30s 超时，控制动词已丢失' : ''));
  }

  const out = String(r.stdout || '').trim();
  if (out) {
    const payload = adapt(out, event);
    if (payload !== null) {
      try { process.stdout.write(JSON.stringify(payload) + '\n'); }
      catch (e) { diag(`输出序列化失败(${(e && e.message) || e})`); }
    }
  }
  return r.status === 2 ? 2 : 0;
}

process.exitCode = main();
