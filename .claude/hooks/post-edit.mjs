#!/usr/bin/env node
// 工具调用后：累计本 session 的「活动信号」，供 Stop hook 判断"是否有实质工作"。
//  · .session-edit-count[-<sid>] —— 仅文件编辑类工具（Write/Edit/MultiEdit/NotebookEdit）
//  · .session-tool-count[-<sid>] —— 任何被 matcher 命中的工具（Bash/Task/Agent/MCP/web…）；
//    用于兜住"重 Bash/subagent/MCP、零文件编辑、少轮次"的实质 session（V3）。
// 并发隔离（G2，2026-07-04）：stdin 带 session_id（PostToolUse 公共字段，已实测）时计数文件
// 带 -<sid> 后缀——并行 session 互不污染；无 sid（非交互管道/测试）回退共享旧文件名，
// 该 legacy 路径仍由 session-restore 启动清零。sid sanitize 表达式必须与
// session-sync.mjs / route-guard.mjs 逐字一致：replace(/[^\w-]/g,'').slice(0,32)。
// Claude Code 的 PostToolUse hook 通过 stdin 传入 JSON: { session_id, tool_name, tool_input, … }
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const claudeDir = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude');
function bump(file) {
  try {
    const cf = join(claudeDir, file);
    let n = 0;
    try { n = parseInt(readFileSync(cf, 'utf8'), 10) || 0; } catch { }
    writeFileSync(cf, String(n + 1));
  } catch { }
}

let raw = '';
try {
  raw = readFileSync(0, 'utf8'); // fd 0 直读：比 '/dev/stdin' 在 CI/管道下更可移植
} catch {
  // stdin 不可用（非交互式）：无从取 sid，记 legacy tool-count 后保守退出。
  bump('.session-tool-count');
  process.exit(0);
}

let data = {};
let parsed = true;
try {
  data = JSON.parse(raw || '{}');
} catch {
  parsed = false;
  process.stderr.write(`[post-edit] ⚠️  stdin JSON 解析失败，按 legacy 计数。\n`);
}
const sid = String(data?.session_id || '').replace(/[^\w-]/g, '').slice(0, 32);
const suffix = sid ? `-${sid}` : '';

// 任何命中本 hook 的工具都算一次"活动"。
bump(`.session-tool-count${suffix}`);

if (parsed) {
  const toolName = data?.tool_name || '';
  const editedFile = data?.tool_input?.file_path || '';
  // 仅文件编辑类工具额外计入 edit-count。
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)) {
    bump(`.session-edit-count${suffix}`);
  }
  if (editedFile.includes('/framework/') || editedFile.includes('\\framework\\')) {
    process.stdout.write(`[post-edit] ⚠️  framework/ 是只读模板目录，请确认此次编辑是有意为之。\n`);
  }
  // 会话级项目隔离（方案A，2026-07-08）后，docs/ 写入由 PreToolUse 的 project-scope-guard 直接
  // 重定向到本 session pin 项目的绝对路径 —— 落点由 pin 决定、与共享软链无关。故这里原先的
  // "pin ≠ docs 软链 → 可能落错项目"事后告警已失去意义（A 下 pin≠软链是常态，且写入并未落软链），
  // 留着只会每次误报，移除。真正的兜底前移到 PreToolUse（重定向或无 pin 时 deny）。
}
