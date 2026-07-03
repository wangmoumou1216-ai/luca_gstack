#!/usr/bin/env node
// Session 启动时：检测中断节点，加载 PROGRESS.md，加载记忆摘要
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync, unlinkSync, lstatSync, openSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync, spawn } from 'child_process';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');

// hooks 日志 size-cap：4 个 hook 共写 2>>，~27KB/天；/tmp 周期清理按 mtime 判老，对活跃追加文件永不命中
try {
  const hookLog = '/tmp/luca-gstack-hooks.log';
  if (statSync(hookLog).size > 524288) {
    writeFileSync(hookLog, readFileSync(hookLog, 'utf8').slice(-65536));
  }
} catch { }

if (existsSync(stateFile)) {
  const content = readFileSync(stateFile, 'utf8');
  const inProgressMatch = content.match(/^  (\w[\w-]+):\s*\n\s+status:\s*IN_PROGRESS/m);
  if (inProgressMatch) {
    process.stdout.write(`[session-restore] ⚠️  上次 session 在 "${inProgressMatch[1]}" 节点中断，建议继续或重置状态。\n`);
  }
  const iterMatch = content.match(/^iteration:\s*(\d+)/m);
  if (iterMatch && parseInt(iterMatch[1]) >= 3) {
    process.stdout.write(`[session-restore] ⚠️  handoff-review 已连续失败 ${iterMatch[1]} 次。\n`);
  }
}

// 每次 Session 启动重置轮次计数器（保证 Checkpoint 提醒每 session 都生效）
const counterFile = join(projectRoot, '.claude', '.session-turn-count');
try { writeFileSync(counterFile, '0'); } catch { }

// 重置本 session 编辑/工具计数 + 清除上一 session 的自成长 marker（保证 Stop hook 的拦截守卫是「每 session 一次」）
try { writeFileSync(join(projectRoot, '.claude', '.session-edit-count'), '0'); } catch { }
try { writeFileSync(join(projectRoot, '.claude', '.session-tool-count'), '0'); } catch { }
try {
  const claudeDir = join(projectRoot, '.claude');
  for (const f of readdirSync(claudeDir)) {
    if (f.startsWith('.episode-written-')) {
      try { unlinkSync(join(claudeDir, f)); } catch { }
    }
  }
} catch { }

// 读取 PROGRESS.md（在清除 symlink 之前，docs/ 还存在时读取）
const progressFile = join(projectRoot, 'docs', 'PROGRESS.md');
if (existsSync(progressFile)) {
  try {
    const progressContent = readFileSync(progressFile, 'utf8');
    const lines = progressContent.split('\n');
    const preview = lines.slice(0, 25).join('\n').trim();
    if (preview) {
      process.stdout.write(`[session-restore] 📋 PROGRESS.md 实时进度:\n${preview}\n\n`);
    }
  } catch { }
}

// 每次启动自动清除激活项目，确保走全新项目流程
const docsLink = join(projectRoot, 'docs');
const stateLink = join(projectRoot, '.claude', 'workflow-state.yaml');
const topicLink = join(projectRoot, '.claude', 'current-topic.txt');
for (const link of [docsLink, stateLink, topicLink]) {
  try { if (lstatSync(link).isSymbolicLink()) unlinkSync(link); } catch { }
}

// 显示项目列表（无激活项目）
try {
  const projectsRoot = join(homedir(), 'Desktop', '项目');
  if (existsSync(projectsRoot)) {
    const entries = readdirSync(projectsRoot).filter(e => {
      try { return statSync(join(projectsRoot, e)).isDirectory(); } catch { return false; }
    });
    const lines = entries.map(e => `  ○ ${e}`).join('\n');
    process.stdout.write(`[session-restore] 📁 项目列表（无激活项目，请告知要做什么）:\n${lines}\n\n`);
  }
} catch { }

// Check for pending skill-rule extraction from last session.
// This intentionally lives outside docs/handoff so startup does not treat it as upstream handoff context.
const pendingExtraction = join(projectRoot, '.claude', 'observability', 'pending-extraction.md');
if (existsSync(pendingExtraction)) {
  try {
    const content = readFileSync(pendingExtraction, 'utf8');
    const firstLine = content.split('\n').find(l => l.startsWith('> Topic:'));
    const hint = firstLine ? ` (${firstLine.replace('> Topic:', '').trim()})` : '';
    process.stdout.write(`[session-restore] 📝 上次 session 有待提取的 skill-rule${hint}。文件: .claude/observability/pending-extraction.md\n`);
  } catch { }
}

const memScript = join(projectRoot, 'memory', 'scripts', 'get_memory.py');
if (existsSync(memScript)) {
  try {
    const summary = execSync(`python3 "${memScript}" --summary`, {
      cwd: projectRoot, encoding: 'utf8', timeout: 4000, stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (summary) process.stdout.write(`[session-restore] 🧠 ${summary}\n`);
  } catch (e) {
    const reason = e.code === 'ETIMEDOUT' ? '超时 (>4s)' : `错误: ${e.message?.slice(0, 60)}`;
    process.stderr.write(`[session-restore] ⚠️  记忆加载失败（${reason}）。回退至 CLAUDE.md「关键约束速查」节。\n`);
  }
}

// 每日记忆治理：SessionStart 触发（跑在 Claude Code 已获 Desktop 访问的 TCC 上下文里，
// 绕开 launchd agent 对 ~/Desktop 的 TCC 限制——见 review DG-01）。仅当今日尚未检查过时跑一次，
// detached 后台执行不阻塞启动；本次启动展示的是上一份 digest，今日 digest（如果真的写了）下次启动可见。
// 2026-07-03 治理降频：daily_governance.py 现在只在"有状态变化"或"周度强制心跳"时才写
// today.md——若仍只拿 todayDigest 存在与否当节流闸，降频后会变成每个 session 都重跑 consolidate。
// 改用 .checked-<date> 轻量标记（daily_governance.py 每次调用无条件 touch）判断"今天是否已跑过"。
try {
  const today = new Date().toISOString().slice(0, 10); // UTC，与 daily_governance 的 digest 文件名一致
  const govScript = join(projectRoot, 'memory', 'scripts', 'daily_governance.py');
  const todayDigest = join(projectRoot, 'memory', 'digests', `${today}.md`);
  const todayChecked = join(projectRoot, 'memory', 'digests', `.checked-${today}`);
  if (existsSync(govScript) && !existsSync(todayDigest) && !existsSync(todayChecked)) {
    // detached 子进程的 stderr 重定向到日志文件（而非 'ignore'），否则 governance 崩溃/失败完全静默无痕（V4）。
    let govErr = 'ignore';
    try { govErr = openSync('/tmp/luca-gstack-governance.log', 'a'); } catch { }
    const child = spawn('python3', [govScript], { cwd: projectRoot, detached: true, stdio: ['ignore', 'ignore', govErr] });
    child.unref();
    process.stderr.write(`[session-restore] 🌱 已后台触发每日记忆治理（今日首次启动；失败留痕 /tmp/luca-gstack-governance.log）\n`);
  }
} catch { }

// 月度框架自进化：SessionStart 到期探测 + 升级提示（助理式，FM-8）。
// 不在此 headless 跑 scout——发现需 agent harness（Workflow），纯后台 python 驱动不了；
// 这里只「探测到期 + 提示在 session 内运行」。digest 缺失即为待办真值（不另立 marker，遵循最小文件）。
try {
  const evoDir = join(projectRoot, '.claude', 'skill-os', 'evolution');
  const selfModel = join(evoDir, 'self-model.yaml');
  const evoDigests = join(evoDir, 'digests');
  if (existsSync(selfModel)) {  // 仅当演进子系统已启用才提示
    const now = new Date();
    const ym = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
    const curY = now.getUTCFullYear(), curM = now.getUTCMonth() + 1;
    const curMonth = ym(curY, curM);
    if (!existsSync(join(evoDigests, `${curMonth}-evolution.md`))) {
      let missing = 0;  // 最近 3 个月（含本月）缺失数 → 升级提示
      for (let i = 0; i < 3; i++) {
        let y = curY, m = curM - i;
        while (m <= 0) { m += 12; y -= 1; }
        if (!existsSync(join(evoDigests, `${ym(y, m)}-evolution.md`))) missing++;
      }
      const cmd = `Workflow({name:'framework-evolution-scout', args:{date:'${curMonth}'}})`;
      if (missing >= 2) {
        process.stdout.write(`[session-restore] ⚠️ 已跳过 ${missing} 次月度演进扫描（最近含本月 ${curMonth}）。在 session 内运行：${cmd}\n`);
      } else {
        process.stdout.write(`[session-restore] 🧬 月度演进扫描到期 (${curMonth}) — 在 session 内运行：${cmd}\n`);
      }
    }
  }
} catch { }

// person 层记忆候选提示（独立于 digest 预览——digest 只显示前 14 行且每份只展示一次，候选排后面会不可见）
try {
  const globalMemDir = process.env.GLOBAL_MEMORY_DIR
    || join(homedir(), '.claude', 'projects', '-Users-luca-Desktop-luca-gstack', 'memory');
  const candidates = readdirSync(globalMemDir).filter(f => f.startsWith('candidate_feedback_') && f.endsWith('.md'));
  if (candidates.length > 0) {
    process.stdout.write(`[session-restore] 🧍 ${candidates.length} 条 person 记忆候选待裁决（见最新 digest，或直接看 ${globalMemDir}/candidate_feedback_*.md）\n`);
  }
} catch { }

// 展示最新「成长摘要」digest（每个 digest 只在第一次启动时展示一次）
try {
  const digestsDir = join(projectRoot, 'memory', 'digests');
  if (existsSync(digestsDir)) {
    const files = readdirSync(digestsDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
    const newest = files[files.length - 1];
    if (newest) {
      // 清理过期 marker：必须保留 newest 对应的——全删会致当日 digest 每 session 重展示
      try {
        const keep = `.digest-shown-${newest.replace('.md', '')}`;
        for (const f of readdirSync(join(projectRoot, '.claude'))) {
          if (f.startsWith('.digest-shown-') && f !== keep) {
            try { unlinkSync(join(projectRoot, '.claude', f)); } catch { }
          }
        }
      } catch { }
      const shownMarker = join(projectRoot, '.claude', `.digest-shown-${newest.replace('.md', '')}`);
      if (!existsSync(shownMarker)) {
        const preview = readFileSync(join(digestsDir, newest), 'utf8').split('\n').slice(0, 14).join('\n').trim();
        process.stdout.write(`[session-restore] 🌱 成长摘要 (${newest}，每个 digest 只提示一次):\n${preview}\n\n`);
        try { writeFileSync(shownMarker, ''); } catch { }
      }
    }
  }
} catch { }
