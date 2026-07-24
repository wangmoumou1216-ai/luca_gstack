#!/usr/bin/env node
// 工具调用后：累计本 session 的「活动信号」，供 Stop hook 判断"是否有实质工作"。
//  · .session-edit-count[-<sid>] —— 仅文件编辑类工具（Write/Edit/MultiEdit/NotebookEdit）
//  · .session-tool-count[-<sid>] —— 任何被 matcher 命中的工具（Bash/Task/Agent/MCP/web…）；
//    用于兜住"重 Bash/subagent/MCP、零文件编辑、少轮次"的实质 session（V3）。
// 并发隔离（G2，2026-07-04）：stdin 带 session_id（PostToolUse 公共字段，已实测）时计数文件
// 带 -<sid> 后缀——并行 session 互不污染；无 sid（非交互管道/测试）回退共享旧文件名，
// 该 legacy 路径仍由 session-restore 启动清零。sid sanitize 表达式必须与
// session-sync.mjs / route-guard.mjs 逐字一致：replace(/[^\w-]/g,'').slice(0,36)。
// Claude Code 的 PostToolUse hook 通过 stdin 传入 JSON: { session_id, tool_name, tool_input, … }
import { readFileSync, writeFileSync, statSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
const sid = String(data?.session_id || '').replace(/[^\w-]/g, '').slice(0, 36);
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
  maybeSpoolAutoOpen(data, sid);
}

// ── 产出物自动打开（2026-07-24）：luca app 内嵌会话（pty 注入 LUCA_APP=1）里，Write/Edit 落盘的
//    html/md/图片投递 ~/.luca/open-spool（JSON 载荷，app 端 auto 模式后台打开）。终端 session 无
//    LUCA_APP 静默跳过；legacy 裸路径协议（luca-open.sh）不受影响。全段 fail-open。
function maybeSpoolAutoOpen(data, sid) {
  try {
    if (process.env.LUCA_APP !== '1') return;
    if (!/^(Write|Edit|MultiEdit)$/.test(data?.tool_name || '')) return;
    const p = String(data?.tool_input?.file_path || '');
    if (!p.startsWith('/')) return;
    const base = p.slice(p.lastIndexOf('/') + 1);
    if (base.startsWith('.')) return;
    if (!/\.(html?|md|markdown|mdx|png|jpe?g|svg|webp|gif)$/i.test(base)) return;
    const EXCLUDED_SEGS = ['memory', '.claude', '.luca', 'observability', 'node_modules', '.git'];
    if (p.split('/').some(s => EXCLUDED_SEGS.includes(s))) return;
    if (!statSync(p).isFile()) return;
    const spool = join(homedir(), '.luca', 'open-spool');
    mkdirSync(spool, { recursive: true });
    const now = Date.now();
    // 2s 去重压 spool churn；dedup 状态放点前缀文件（drainSpool 天然跳过）。IO 异常放行投递——
    // app 端同文件复用页签，重复条目幂等。
    try {
      const dedupFile = join(spool, '.dedup.json');
      let m = {};
      try { m = JSON.parse(readFileSync(dedupFile, 'utf8')) || {}; } catch { }
      if (now - (m[p] || 0) < 2000) return;
      for (const k of Object.keys(m)) if (now - m[k] > 60000) delete m[k];
      m[p] = now;
      writeFileSync(dedupFile, JSON.stringify(m));
    } catch { }
    const payload = JSON.stringify({ v: 1, path: p, mode: 'auto', ts: now, sid: sid || '', src: 'hook' });
    const rand = Math.floor(Math.random() * 1e6);
    const tmp = join(spool, `.tmp.${process.pid}.${rand}`);
    writeFileSync(tmp, payload);
    renameSync(tmp, join(spool, `${now}.${process.pid}.${rand}`));
  } catch { }
}
