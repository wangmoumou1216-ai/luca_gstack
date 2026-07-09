#!/usr/bin/env node
// SessionEnd hook（会话粘性 G6，2026-07-04）——session 真正结束时清理本 sid 的残留状态：
//  · .session-{turn,edit,tool}-count-<sid>（G2 per-sid 计数）
//  · .session-project-<sid>（G6 pin）
// 目的（红队 H2）：优雅退出时立即回收本 session 的活跃信号，把"僵尸粘住窗口"从 15min GC
// 兜底缩到 0——否则刚结束的 session 残留 <15min 新鲜的计数文件会让下一个新 session 误判
// "有活跃并行 session"而保留一个其实没人在用的项目。
// SessionEnd 只支持副作用、不能控制流程（文档确认）——本 hook 纯清理，与该约束一致。
// 全程 fail-open：任何异常都不得报错（session 已在结束）。
import { readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

try {
  const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let sid = '';
  try {
    const payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
    sid = String(payload.session_id || '').replace(/[^\w-]/g, '').slice(0, 36);
  } catch { }
  if (!sid) process.exit(0); // 无 sid 无从定位本 session 文件，安全退出（GC 会兜底）

  const claudeDir = join(projectRoot, '.claude');
  const targets = [
    `.session-turn-count-${sid}`,
    `.session-edit-count-${sid}`,
    `.session-tool-count-${sid}`,
    `.session-project-${sid}`,
    `.session-projnag-${sid}`,
    `.session-inherited-${sid}`,
  ];
  for (const f of targets) {
    try { unlinkSync(join(claudeDir, f)); } catch { } // 不存在即跳过
  }
} catch { }
process.exit(0);
