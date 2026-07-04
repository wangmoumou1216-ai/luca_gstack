#!/usr/bin/env node
// Session 启动时：检测中断节点，加载 PROGRESS.md，加载记忆摘要
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync, unlinkSync, lstatSync, openSync, closeSync, mkdirSync, readlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync, spawn } from 'child_process';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');

// 会话粘性（G6，2026-07-04）：读 SessionStart stdin JSON 拿 source + session_id。
// source 用于"仅 startup 清 symlink"的 allowlist 判断（安全侧：未知/缺失 → 不清 + canary）；
// session_id 用于活跃探测时排除本 session 自己的计数/transcript。sanitize 与其余 hook 逐字一致。
let startPayload = {};
try { startPayload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { }
const startSource = typeof startPayload.source === 'string' ? startPayload.source : '';
const ownSid = String(startPayload.session_id || '').replace(/[^\w-]/g, '').slice(0, 32);

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

// 并发隔离（G2，2026-07-04）：真实 session 的计数/marker 已按 -<sid> 后缀隔离
// （post-edit/route-guard/session-sync），启动时**绝不**触碰带后缀文件——那是并行
// session 的活状态，无差别清零/删除正是昨日三次互踩事故的根因。这里只做两件事：
//  1. 清零 legacy 无后缀计数器（无 sid 环境——测试/管道——的旧语义保持不变）
//  2. 按 mtime GC 过期残留（marker >48h、per-sid 计数器 >7天），只删死文件不删活的
try { writeFileSync(join(projectRoot, '.claude', '.session-turn-count'), '0'); } catch { }
try { writeFileSync(join(projectRoot, '.claude', '.session-edit-count'), '0'); } catch { }
try { writeFileSync(join(projectRoot, '.claude', '.session-tool-count'), '0'); } catch { }
try {
  const claudeDir = join(projectRoot, '.claude');
  const nowMs = Date.now();
  const MARKER_TTL = 48 * 3600 * 1000;
  const COUNTER_TTL = 7 * 24 * 3600 * 1000;
  for (const f of readdirSync(claudeDir)) {
    const isMarker = f.startsWith('.episode-written-');
    const isSidCounter = /^\.session-(turn|edit|tool)-count-./.test(f);
    const isPin = /^\.session-(project|projnag|inherited)-./.test(f); // G6-R7②：pin/nag/继承标记同样按 mtime GC，防永久堆积
    if (!isMarker && !isSidCounter && !isPin) continue;
    try {
      const age = nowMs - statSync(join(claudeDir, f)).mtimeMs;
      const ttl = isMarker ? MARKER_TTL : COUNTER_TTL; // pin 同 counter 7天
      if (age > ttl) unlinkSync(join(claudeDir, f));
    } catch { }
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

// 会话粘性（G6，2026-07-04）：活跃并行 session 探测——两路信号取 OR（红队 R1：
// 单靠计数器 mtime 在"纯读研究/权限等待/流式生成"期间死寂，两分钟即假死）：
//  ① 他-sid 计数文件 mtime（严格正则 + 排除本 ownSid + 排除 legacy 无后缀——R3）
//  ② 他-sid transcript mtime（~/.claude/projects/<repo-path>/<sid>.jsonl，每个事件都刷新，
//     覆盖只读/权限/流式全部盲区——R1 修正）
// 窗口 env 可调（仿 SESSION_SYNC_MIN_TOOLS 先例）。返回 true=有活跃并行 session。
function hasActiveParallelSession() {
  const windowMs = (parseInt(process.env.SESSION_STICKY_WINDOW_MIN, 10) || 15) * 60 * 1000;
  const nowMs = Date.now();
  const claudeDir = join(projectRoot, '.claude');
  const sidRe = /^\.session-(turn|edit|tool)-count-(.+)$/;
  try {
    for (const f of readdirSync(claudeDir)) {
      const m = f.match(sidRe);
      if (!m || m[2] === ownSid) continue; // 严格：只认带-sid 后缀；排除本 session 自己
      try { if (nowMs - statSync(join(claudeDir, f)).mtimeMs < windowMs) return true; } catch { }
    }
  } catch { }
  // transcript 目录：repo 绝对路径把 / 换成 -（CC projects 目录命名规则）；
  // env 覆盖仅供测试注入（避免污染真实 ~/.claude/projects）。
  try {
    const projDir = process.env.SESSION_STICKY_TRANSCRIPT_DIR
      || join(homedir(), '.claude', 'projects', projectRoot.replace(/\//g, '-'));
    for (const f of readdirSync(projDir)) {
      if (!f.endsWith('.jsonl')) continue;
      const sid = f.slice(0, -6);
      if (sid === ownSid) continue;
      try { if (nowMs - statSync(join(projDir, f)).mtimeMs < windowMs) return true; } catch { }
    }
  } catch { }
  return false;
}

// ── 激活项目清除决策（G6 会话粘性，2026-07-04；红队定稿）──
// 原设计：每次启动无条件清三个共享 symlink，"走全新项目流程"。但多并发 session 下，
// 任一新 session 启动即清空其它 session 正在用的项目上下文（昨日实测撞 3 次）。
// 改为决策树——清 symlink 当且仅当以下全部成立（否则保留）：
//  0. 悬空链（readlink 目标不存在）→ 无视下面直接清（R5：安全 gate，非粘性范围，
//     否则 gate ① 会静默继续一个已删项目、session-sync 会穿悬空链复活已删目录树）。
//  1. kill-switch SESSION_RESTORE_ALWAYS_CLEAR=1 → 无条件清（一键回退旧行为）。
//  2. source === 'startup'（冷启动）——allowlist（H1）：resume/compact 清自己上下文本就是
//     bug（session_id 跨 resume 不变，文档确认）；clear 是清对话非切项目，保留；未知/缺失
//     source → 保留 + canary（安全侧：误清摧毁并行活 session 数据面不可逆，误保留可 switch 恢复）。
//  3. 无活跃并行 session（hasActiveParallelSession()=false）——有则保留 + 警告（R1+R2 核心）。
const docsLink = join(projectRoot, 'docs');
const stateLink = join(projectRoot, '.claude', 'workflow-state.yaml');
const topicLink = join(projectRoot, '.claude', 'current-topic.txt');
const alwaysClear = process.env.SESSION_RESTORE_ALWAYS_CLEAR === '1';

// 当前 docs 链指向的激活项目名（用于保留时的提示；悬空判断也用它）
let activeProject = '', docsDangling = false;
try {
  const tgt = readlinkSync(docsLink); // 悬空链 readlink 仍成功
  const m = tgt.match(/\/项目\/([^/]+)/);
  if (m) activeProject = m[1];
  docsDangling = !existsSync(docsLink); // existsSync 跟随链：目标不存在=悬空
} catch { /* 无链=无激活项目 */ }
// 终验核验修：三链任一悬空即视为悬空态（原只查 docs——部分悬空态如 state/topic 目标被删而
// docs 正常 + source=resume 会走保留分支留下悬空链）。
for (const l of [stateLink, topicLink]) {
  try { if (lstatSync(l).isSymbolicLink() && !existsSync(l)) docsDangling = true; } catch { }
}

const hasActiveLinks = [docsLink, stateLink, topicLink].some(l => {
  try { return lstatSync(l).isSymbolicLink(); } catch { return false; }
});

const doClear = () => {
  for (const link of [docsLink, stateLink, topicLink]) {
    try { if (lstatSync(link).isSymbolicLink()) unlinkSync(link); } catch { }
  }
};
// 决策树顺序关键（STICKY-004 回归钉死）：悬空 gate 与 kill-switch 必须**优先于**所有
// 保留条件——否则 source=resume 时悬空链会被 resume 分支先保留，绕过安全 gate。
let cleared = false;
if (hasActiveLinks) {
  if (docsDangling && !alwaysClear) {
    // R5 安全 gate：目标已删/改名 → 无视 source/活跃度直接清（否则 gate ① 静默继续已删项目、
    // session-sync 穿悬空链复活已删目录树）。最高优先。
    doClear(); cleared = true;
    process.stderr.write(`[session-restore] 🧹 检测到悬空项目链（目标已删/改名），已清除，走全新流程\n`);
  } else if (alwaysClear) {
    doClear(); cleared = true; // kill-switch：无条件回退旧行为
  } else if (startSource === 'resume' || startSource === 'compact') {
    // resume / compact → 保留（本 session 自己的上下文，清它是 bug；不打扰）
  } else if (startSource === 'clear') {
    // /clear 只清对话不切项目 → 保留激活项目（红队 H1）
  } else if (!startSource) {
    // source 缺失（stdin 读不到）→ 安全侧保留 + canary（防未来 harness 语义漂移静默误清）
    process.stderr.write(`[session-restore] ⚠️ SessionStart 未拿到 source 字段，保守保留激活项目 ${activeProject || '(未知)'}（如需清除：SESSION_RESTORE_ALWAYS_CLEAR=1）\n`);
  } else if (startSource !== 'startup') {
    // A1 加固（决策红队）：未知非空 source（如 harness 把 'startup' 改名——Task→Agent 同型漂移的
    // 可能形态）→ 安全侧保留 + canary。旧代码此处会静默保留无警告，冷启动被误判成继承旧项目。
    process.stderr.write(`[session-restore] ⚠️ SessionStart source 值未知（"${startSource}"，非 startup/resume/clear/compact）——疑似 harness 语义漂移，保守保留激活项目 ${activeProject || '(未知)'}（如确为冷启动需清除：SESSION_RESTORE_ALWAYS_CLEAR=1）\n`);
  } else if (hasActiveParallelSession()) {
    // 冷启动但检测到活跃并行 session → 保留 + 显式告知（R2/R4：不再谎称"无激活项目"）
    process.stdout.write(`[session-restore] 🔗 当前激活项目: ${activeProject || '(未知)'}（检测到活跃并行 session，已保留；如需切换请显式运行 ./scripts/project.sh switch <项目>）\n\n`);
    // 一次性继承标记（终验核验修）：只有"为并行 session 而保留"才是真继承；route-guard 认此标记
    // 而非 cur&&!pin，避免把 self-switch 误判成继承（单 session 正常流程 Msg2 假阳性）。
    if (ownSid) {
      try { writeFileSync(join(projectRoot, '.claude', `.session-inherited-${ownSid}`), activeProject || ''); } catch { }
    }
  } else {
    // 冷启动 + 无活跃并行 → 清，走全新项目流程（原始设计意图）
    doClear(); cleared = true;
  }
}

// 显示项目列表（仅在真清除后——保留态已在上面告知激活项目，不再谎称"无激活"，R4）
if (cleared || !hasActiveLinks) {
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
}

// Check for pending skill-rule extraction from previous sessions.
// This intentionally lives outside docs/handoff so startup does not treat it as upstream handoff context.
// 并发隔离（G2）：pending 文件按 session 命名（pending-extraction-<sid>.md），glob 逐个提醒；
// 兼容旧的单文件名 pending-extraction.md。最多列 3 个防刷屏，超出报总数。
try {
  const obsDir = join(projectRoot, '.claude', 'observability');
  const pendings = existsSync(obsDir)
    ? readdirSync(obsDir).filter(f => f.startsWith('pending-extraction') && f.endsWith('.md')).sort()
    : [];
  for (const f of pendings.slice(0, 3)) {
    let hint = '';
    try {
      const content = readFileSync(join(obsDir, f), 'utf8');
      const topicLine = content.split('\n').find(l => l.startsWith('> Topic:'));
      if (topicLine) hint = ` (${topicLine.replace('> Topic:', '').trim()})`;
    } catch { }
    process.stdout.write(`[session-restore] 📝 有待提取的 skill-rule${hint}。文件: .claude/observability/${f}\n`);
  }
  if (pendings.length > 3) {
    process.stdout.write(`[session-restore] 📝 …另有 ${pendings.length - 3} 个 pending-extraction 文件待处理\n`);
  }
} catch { }

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
  if (existsSync(govScript) && !existsSync(todayDigest)) {
    // 并发隔离（G2，2026-07-04）：两个 session 近同时启动都读到 !exists → 都 spawn 治理
    // （TOCTOU）。改为 O_EXCL 原子认领 .checked-<date>：抢到的 spawn，EEXIST 的静默跳过；
    // 目录先 mkdir（全新环境首日两个 session 也要能正确竞争同一把锁）；
    // 其他异常 → fail-open 照旧 spawn（宁重复不静默丢，governance 自身幂等）。
    let claimed = false;
    try {
      mkdirSync(join(projectRoot, 'memory', 'digests'), { recursive: true });
      closeSync(openSync(todayChecked, 'wx'));
      claimed = true;
    } catch (e) { claimed = !e || e.code !== 'EEXIST'; }
    if (claimed) {
      // detached 子进程的 stderr 重定向到日志文件（而非 'ignore'），否则 governance 崩溃/失败完全静默无痕（V4）。
      let govErr = 'ignore';
      try { govErr = openSync('/tmp/luca-gstack-governance.log', 'a'); } catch { }
      const child = spawn('python3', [govScript], { cwd: projectRoot, detached: true, stdio: ['ignore', 'ignore', govErr] });
      child.unref();
      process.stderr.write(`[session-restore] 🌱 已后台触发每日记忆治理（今日首次启动；失败留痕 /tmp/luca-gstack-governance.log）\n`);
    }
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
      // 并发隔离（G2，2026-07-04）：原 check-then-print-then-write 两 session 竞争会双展示或
      // 都不展示。改 O_EXCL 先抢占：成功才打印；EEXIST 静默；其他异常（权限等）按旧行为
      // 打印但不写 marker（fail-open——宁多展示一次不静默丢摘要）。
      let show = false;
      try { closeSync(openSync(shownMarker, 'wx')); show = true; } catch (e) { show = !e || e.code !== 'EEXIST'; }
      if (show) {
        const preview = readFileSync(join(digestsDir, newest), 'utf8').split('\n').slice(0, 14).join('\n').trim();
        process.stdout.write(`[session-restore] 🌱 成长摘要 (${newest}，每个 digest 只提示一次):\n${preview}\n\n`);
      }
    }
  }
} catch { }
