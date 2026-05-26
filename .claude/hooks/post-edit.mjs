#!/usr/bin/env node
// 文件编辑后：检测是否写入了 framework/ 只读区域
// Claude Code 的 PostToolUse hook 通过 stdin 传入 JSON: { tool_name, tool_input }
import { readFileSync } from 'fs';

let raw = '';
try {
  raw = readFileSync('/dev/stdin', { encoding: 'utf8', flag: 'r' });
} catch {
  // stdin 不可用时静默跳过（非交互式环境）
  process.exit(0);
}

try {
  const data = JSON.parse(raw || '{}');
  const editedFile = data?.tool_input?.file_path || '';
  if (editedFile.includes('/framework/') || editedFile.includes('\\framework\\')) {
    process.stdout.write(`[post-edit] ⚠️  framework/ 是只读模板目录，请确认此次编辑是有意为之。\n`);
  }
} catch {
  process.stderr.write(`[post-edit] ⚠️  stdin JSON 解析失败，跳过检测。\n`);
}
