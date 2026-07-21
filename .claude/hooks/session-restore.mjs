#!/usr/bin/env node
// Session 启动时：检测中断节点，加载 PROGRESS.md，加载记忆摘要
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync, unlinkSync, lstatSync, openSync, closeSync, mkdirSync, readlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execSync, spawn } from 'child_process';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');

// 记忆数据根（audit 2026-07-07 F2-01/P0）：memory 脚本全部以 MEMORY_ROOT 为最高优先解析数据根
// （muse app 有意注入以共享母版经验层），但本 hook 原先用 projectRoot 认领 .checked-<date> 与找
// digest，daily_governance 却继承 env 把 digest 写到 MEMORY_ROOT——同一天 fork 只落 0 字节标记、
// 母版落真 digest 的 split-brain（2026-07-08 实测）。治理触发/展示路径统一走 memoryRoot。
const memoryRoot = process.env.MEMORY_ROOT || projectRoot;
if (memoryRoot !== projectRoot) {
  process.stderr.write(`[session-restore] ⚠️ MEMORY_ROOT 重定向生效 → ${memoryRoot}（episodic/semantic 读写与每日治理均落该仓，非本仓 ${projectRoot}）\n`);
}

// 会话粘性（G6，2026-07-04）：读 SessionStart stdin JSON 拿 source + session_id。
// source 用于"仅 startup 清 symlink"的 allowlist 判断（安全侧：未知/缺失 → 不清 + canary）；
// session_id 用于活跃探测时排除本 session 自己的计数/transcript。sanitize 与其余 hook 逐字一致。
let startPayload = {};
try { startPayload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { }
const startSource = typeof startPayload.source === 'string' ? startPayload.source : '';
const ownSid = String(startPayload.session_id || '').replace(/[^\w-]/g, '').slice(0, 36);

// hooks 日志 size-cap：5 个 hook 共写 2>>，~27KB/天；/tmp 周期清理按 mtime 判老，对活跃追加文件永不命中。
// 两个候选名都 cap：母版写 hooks.log，fork（muse）写 hooks.muse.log——分文件防两仓混写互截（audit F1-11）。
for (const hookLog of ['/tmp/luca-gstack-hooks.log', '/tmp/luca-gstack-hooks.muse.log']) {
  try {
    if (statSync(hookLog).size > 524288) {
      writeFileSync(hookLog, readFileSync(hookLog, 'utf8').slice(-65536));
    }
  } catch { }
}

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
  // pending-extraction 软兜底文件同样 TTL GC（7天）：写后无人处理会无限堆积并制造启动提醒
  //（audit F1-03：7 天实测积压 11 个，多为 trivial session stub）
  const obsDir = join(claudeDir, 'observability');
  for (const f of readdirSync(obsDir)) {
    if (!f.startsWith('pending-extraction') || !f.endsWith('.md')) continue;
    try {
      if (nowMs - statSync(join(obsDir, f)).mtimeMs > COUNTER_TTL) unlinkSync(join(obsDir, f));
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
  // transcript 目录：优先用 SessionStart payload 的 transcript_path 取其父目录（最稳，无需推导）；
  // 缺失时回退到路径推导——CC 把绝对路径里【所有非字母数字】都换成 -（不只是 /，下划线/CJK 亦然，
  // 如 luca_gstack→luca-gstack、项目→----）。原来只换 / 会算出不存在的目录，静默让 transcript
  // 信号失效（决策红队 killer，2026-07-04 修）。env 覆盖仅供测试注入。
  try {
    const projDir = process.env.SESSION_STICKY_TRANSCRIPT_DIR
      || (startPayload.transcript_path ? dirname(startPayload.transcript_path)
          : join(homedir(), '.claude', 'projects', projectRoot.replace(/[^a-zA-Z0-9]/g, '-')));
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
  // 治理触发路径走 memoryRoot（非 projectRoot）：daily_governance 以 MEMORY_ROOT 解析数据根，
  // 认领标记/digest 探测必须与其一致，否则 redirect 生效时触发侧与写入侧分裂（F2-01/P0）
  const todayDigest = join(memoryRoot, 'memory', 'digests', `${today}.md`);
  const todayChecked = join(memoryRoot, 'memory', 'digests', `.checked-${today}`);
  if (existsSync(govScript) && !existsSync(todayDigest)) {
    // 并发隔离（G2，2026-07-04）：两个 session 近同时启动都读到 !exists → 都 spawn 治理
    // （TOCTOU）。改为 O_EXCL 原子认领 .checked-<date>：抢到的 spawn，EEXIST 的静默跳过；
    // 目录先 mkdir（全新环境首日两个 session 也要能正确竞争同一把锁）；
    // 其他异常 → fail-open 照旧 spawn（宁重复不静默丢，governance 自身幂等）。
    let claimed = false;
    try {
      mkdirSync(join(memoryRoot, 'memory', 'digests'), { recursive: true });
      closeSync(openSync(todayChecked, 'wx'));
      claimed = true;
    } catch (e) { claimed = !e || e.code !== 'EEXIST'; }
    if (claimed) {
      // detached 子进程的 stdout/stderr 都重定向到日志文件（而非 'ignore'）：stderr 静默 = 崩溃无痕（V4）；
      // stdout 静默 = 结果 JSON（含 loop_anomalies 计数）丢弃（评审切面 c C2 第三层，2026-07-15）。
      let govErr = 'ignore';
      try { govErr = openSync('/tmp/luca-gstack-governance.log', 'a'); } catch { }
      const child = spawn('python3', [govScript], {
        cwd: projectRoot, detached: true, stdio: ['ignore', govErr, govErr],
        // 显式告知治理脚本调用方仓根：loop-health 的 pending 积压检查须覆盖捕获侧真正写入的仓
        env: { ...process.env, GOVERNANCE_CALLER_ROOT: projectRoot },
      });
      child.unref();
      // stdout 才是用户可见通道（stderr 进 /tmp 死信日志，无人读——评审切面 c C4）
      process.stdout.write(`[session-restore] 🌱 已后台触发每日记忆治理（今日首次启动；运行留痕 /tmp/luca-gstack-governance.log）\n`);
    } else {
      // C3 可见性（2026-07-15 记忆层评审）：marker 已被认领但内容为空且超过 2 小时——
      // 治理健康跑完会把结果 JSON 写进 marker，空 = 认领方中断。提示补跑，不自动重试。
      try {
        const st = statSync(todayChecked);
        if (st.size === 0 && Date.now() - st.mtimeMs > 2 * 3600 * 1000) {
          process.stdout.write(`[session-restore] ⚠️ 今日治理认领后未完成（.checked 空且超2小时，疑中断）——补跑：python3 ${govScript}\n`);
        }
      } catch { }
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
      // scout 是 propose-only 的（workflow 无 fs，只 return 数据）：簿记落盘走确定性脚本
      // evolution-bookkeep.mjs（曾靠人手动追加 candidate-log 而漏做 → 跨月去重失效，故脚本化）；
      // digest 仍人工写，但首节四件套（采纳复盘/opportunities 裁决/addressed 复核/重访到期）是强制项。
      process.stdout.write(`[session-restore] ↳ 跑完落盘：① 把 Workflow 返回 JSON 存文件后跑 node scripts/evolution-bookkeep.mjs <json路径>（自动追加 candidate-log + 更新 yield_stats/streak，替代手工）；② 写 digests/${curMonth}-evolution.md，首节必含四件套：采纳复盘（返回值 adoption_review）+ 上期 opportunities 逐条裁决（prior_opportunities_to_adjudicate：开 gap/对标深评(高信号 hub→BENCHMARK-RUNBOOK 模式2)/归档/观察）+ addressed 复核（addressed_recheck）+ 重访到期（revisit_due：自设重访条件已满足的 open gap，逐条裁决开工/改条件/关闭）。\n`);
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
  const digestsDir = join(memoryRoot, 'memory', 'digests'); // 与治理写入侧一致（F2-01）
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
        // 预览窗按「待你裁决」整节收尾，而非固定 14 行（2026-07-21 BACKLOG #17 实证：该节标题
        // 恰在第 14 行、条目在 15-20 行，全部被切在窗外——队列"每日贴脸"20 天实为从未送达）。
        // 硬上限 40 行防刷屏；找不到该节时退回原 14 行行为。
        const digestLines = readFileSync(join(digestsDir, newest), 'utf8').split('\n');
        let end = 14;
        const decideAt = digestLines.findIndex(l => /^#{1,3}\s.*待你裁决/.test(l));
        if (decideAt >= 0) {
          let sectionEnd = digestLines.findIndex((l, i) => i > decideAt && /^#{1,3}\s/.test(l));
          if (sectionEnd < 0) sectionEnd = digestLines.length;
          end = Math.min(Math.max(end, sectionEnd), 40);
        }
        const preview = digestLines.slice(0, end).join('\n').trim();
        process.stdout.write(`[session-restore] 🌱 成长摘要 (${newest}，每个 digest 只提示一次):\n${preview}\n\n`);
      }
    }
  }
} catch { }

// ── 单真值源 behind 软提醒（2026-07-16 B2 合并）：本检出落后 tracking 分支 → 提示 pull。
// 只查本地 ref 不 fetch（session 启动零网络零延迟；有网刷新交给 verify S23）。fail-open。
try {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const up = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  // 后台静默 fetch（detached 不阻塞启动）：让本地 ref 保持新鲜，本条与 route-guard 的
  // 每消息 behind 提醒在下一次检查时即拿到准确落后数。离线/失败静默。
  try { spawn('git', ['fetch', '-q', '--no-tags', up.split('/')[0]], { cwd, detached: true, stdio: 'ignore' }).unref(); } catch { }
  const behind = parseInt(execSync(`git rev-list --count HEAD..${up}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(), 10);
  if (behind > 0) {
    process.stdout.write(`[session-restore] ⚠ 本检出落后 ${up} ${behind} 条——建议 git pull（单真值源纪律）\n`);
  }
} catch { }
