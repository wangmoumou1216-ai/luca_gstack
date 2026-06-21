#!/usr/bin/env node
// 工具调用后：累计本 session 的「活动信号」，供 Stop hook 判断"是否有实质工作"。
//  · .session-edit-count —— 仅文件编辑类工具（Write/Edit/MultiEdit/NotebookEdit）
//  · .session-tool-count —— 任何被 matcher 命中的工具（Bash/Task/MCP/web…）；用于兜住
//    "重 Bash/subagent/MCP、零文件编辑、少轮次"的实质 session（V3：substantive 判据过窄）。
// 两个计数都在 SessionStart 由 session-restore 清零。
// Claude Code 的 PostToolUse hook 通过 stdin 传入 JSON: { tool_name, tool_input }
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

// 任何命中本 hook 的工具都算一次"活动"。
bump('.session-tool-count');

let raw = '';
try {
  raw = readFileSync('/dev/stdin', { encoding: 'utf8', flag: 'r' });
} catch {
  // stdin 不可用（非交互式）：已记 tool-count，保守退出。
  process.exit(0);
}

try {
  const data = JSON.parse(raw || '{}');
  const toolName = data?.tool_name || '';
  const editedFile = data?.tool_input?.file_path || '';
  // 仅文件编辑类工具额外计入 edit-count。
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)) {
    bump('.session-edit-count');
  }
  if (editedFile.includes('/framework/') || editedFile.includes('\\framework\\')) {
    process.stdout.write(`[post-edit] ⚠️  framework/ 是只读模板目录，请确认此次编辑是有意为之。\n`);
  }
} catch {
  process.stderr.write(`[post-edit] ⚠️  stdin JSON 解析失败，跳过检测。\n`);
}
