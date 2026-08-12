#!/usr/bin/env node
// Stop hook —— Session 结束时：
//  · 若本 session 有「实质工作」且没有可验证 correction receipt → 拦截（decision:block），
//    强制主 Agent 就地做「自成长提取」（分 项目级 / 通用 两类落地）再结束。
//  · 否则放行，并保留旧行为（有中断节点时写 checkpoint）。
//
// 安全契约（务必维持）：
//  · receipt/ticket 异常按未闭合处理；外围非治理异常维持 fail-open。
//  · stop_hook_active 与旧 marker 都没有放行权；只有验证 receipt 或显式 kill-switch 能放行。
//  · 拦截路径 stdout 只能是「纯 JSON」，不能混任何文本（否则 CC 解析 decision 失败）。
import { existsSync, readFileSync, writeFileSync, mkdirSync, readlinkSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { resolveMemoryRoot } from './lib/memroot.mjs';
import { withoutLocalGitEnv } from './lib/git-env.mjs';
import {
  PROJECTS_ROOT as SUBSTRATE_PROJECTS_ROOT,
  closeProjectTurn,
  closeSwitchTurn,
  readProjectState,
  validatedBindingForState,
} from './lib/project-substrate.mjs';
import {
  ensureRearmCorrectionTicket,
  readActiveCorrectionTicket,
  readCurrentCorrectionReceipt,
} from './lib/correction-contract.mjs';

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const now = new Date().toISOString();
const dateStr = now.slice(0, 10);

// ---- 读取 Stop 事件 payload（stdin）----
let payload = {};
// fd 0 直读 stdin：比 '/dev/stdin' 路径在 CI runner / 非交互管道下更可移植
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { }
const stopHookActive = payload.stop_hook_active === true;
const hasSid = Boolean(payload.session_id);
const sessionId =
  (payload.session_id && String(payload.session_id).replace(/[^\w-]/g, '').slice(0, 36)) ||
  `date-${dateStr}`;

// ---- 当前项目：pin 优先，并收紧为只认 TURN_ACTIVE identity+epoch snapshot ----
// Stop hook 直接读写磁盘，不经过 PreToolUse；因此绝不能回退共享展示软链。
const PROJECTS_ROOT = SUBSTRATE_PROJECTS_ROOT; // FIX-2/WS-B2：支持 LUCA_PROJECTS_ROOT 覆盖
let project = '';
let projectFromPin = false;
let projectState = null;
if (hasSid) {
  try {
    projectState = readProjectState(projectRoot, sessionId).value;
    if (projectState.state === 'TURN_ACTIVE') {
      const binding = validatedBindingForState(projectState, PROJECTS_ROOT);
      project = binding.project;
      projectFromPin = true;
    }
  } catch { }
}

let closeSnapshotOnExit = false;
process.on('exit', () => {
  if (!closeSnapshotOnExit || !projectState || !hasSid) return;
  try {
    if (projectState.state === 'TURN_ACTIVE') {
      closeProjectTurn({
        gstackRoot: projectRoot,
        projectsRoot: PROJECTS_ROOT,
        sessionId,
        turnId: projectState.turn.turn_id,
        expectedEpoch: projectState.turn.epoch,
        outcome: 'stop',
      });
    } else if (projectState.state === 'BOUND' && projectState.terminal) {
      closeSwitchTurn({
        gstackRoot: projectRoot,
        projectsRoot: PROJECTS_ROOT,
        sessionId,
        turnId: projectState.terminal.turn_id,
        expectedEpoch: projectState.binding.epoch,
        outcome: 'switch-stop',
      });
    }
  } catch (error) {
    try { process.stderr.write(`[session-sync] ⚠️ turn snapshot close failed: ${error.message}\n`); } catch { }
  }
});

// ---- 解析 topic + workflow 节点状态（pin 态直读 <pin>/.luca/，与归因落点同源）----
let topic = 'session';
let nodeStates = [];
const stateFile = projectFromPin ? join(PROJECTS_ROOT, project, '.luca', 'workflow-state.yaml') : null;
if (stateFile && existsSync(stateFile)) {
  try {
    const content = readFileSync(stateFile, 'utf8');
    const tm = content.match(/^topic:\s*"([^"]*)"/m) || content.match(/^topic:\s*'([^']*)'/m) || content.match(/^topic:\s*(\S+)/m);
    if (tm && tm[1].trim()) topic = tm[1].trim();
    const nm = [...content.matchAll(/^  (\w[\w-]+):\s*\n\s+status:\s*(IN_PROGRESS|DONE)/gm)];
    nodeStates = nm.map(m => ({ name: m[1], status: m[2] }));
  } catch { }
}

// ---- 写 checkpoint（仅当有 IN_PROGRESS 节点；纯文件 I/O，两条路径都可调）----
function writeCheckpointIfInProgress() {
  const inProgress = nodeStates.filter(n => n.status === 'IN_PROGRESS').map(n => n.name);
  // 无激活项目（docs 非软链）时不落 checkpoint，否则会在 luca_gstack 仓内生成杂散 docs/handoff（HOOK-005）。
  if (inProgress.length === 0 || !project) return;
  try {
    if (!projectFromPin) return;
    const dir = join(PROJECTS_ROOT, project, 'docs', 'handoff');
    mkdirSync(dir, { recursive: true });
    const body = [
      `# Auto Checkpoint — ${now}`, '', `**Topic:** ${topic}`, '', '## 节点状态', '',
      nodeStates.map(n => `- **${n.name}**: ${n.status}`).join('\n'), '', '## 恢复指令', '',
      '1. 读取 `.claude/workflow-state.yaml` 确认当前节点状态',
      '2. 运行 `bash scripts/verify.sh` 验证文件完整性',
      `3. 继续 ${inProgress.join(', ')} 节点的工作`,
      '4. 如有 PROGRESS.md，读取 `docs/PROGRESS.md` 了解实时任务状态', '',
    ].join('\n');
    writeFileSync(join(dir, `${dateStr}-auto-checkpoint.md`), body);
    process.stderr.write(`[session-sync] ✅ 已自动写入 checkpoint: ${projectFromPin ? dir : 'docs/handoff'}/${dateStr}-auto-checkpoint.md\n`);
  } catch { }
}

// ---- 拦截用的「自成长提取」指令（短指针契约，HOOK-007 锁定 reason ≤900 字符）----
// 不复制门槛/归属全文：四信号定义在 .claude/skill-os/extraction-bar.md（按需 Read），
// 归属三分表在 CLAUDE.md「写入协议」（每 session 已在 context）。
// 只动态注入两样真正只有 hook 知道的：激活项目落点、本 session 的 marker 文件名。
// 改四信号速记必须同步 extraction-bar.md（HOOK-007 钉关键词）。
function buildReason({ rearm = false, deltaEdit = 0, deltaTool = 0, ticket = null, ticketError = '' } = {}) {
  const projLine = project
    ? `【项目】当前激活项目「${project}」：项目级持久事实 → ~/Desktop/项目/${project}/.luca/memory/MEMORY.md；单次经历 → python3 memory/scripts/append_episode.py --project "${project}"；若本 session 实为框架/meta 工作（改 luca_gstack 自身），episodic 改用 --meta 防误标。`
    : `【项目】当前无激活项目：项目级经验暂记 append_episode.py（不带 --project），待项目激活后归位到其 .luca/memory/MEMORY.md。`;
  return [
    rearm
      ? `自上次提取裁决后，本 session 又新增大量实质工作（Δedit=${deltaEdit}, Δtool=${deltaTool}）。对【新增部分】再做一次「自成长提取」裁决（仅一次，勿循环）：`
      : `本 session 有实质工作但尚未沉淀经验。结束前就地完成一次「自成长提取」（仅一次，勿循环）：`,
    `【门槛 · 默认不存】仅四强信号提取：①明确纠正/未来指示 ②复发 ③返工/不可逆险情 ④高成本且复用（细则：.claude/skill-os/extraction-bar.md）。绕行先按 correction-attribution.md 修源头；全不中直接解锁。`,
    `【归因/归属】按 L1–L5 后走 CLAUDE.md「写入协议」三分表：个人①→feedback_；②③④→candidate_feedback_（不索引）／框架→semantic 候选／项目→项目本地。`,
    projLine,
    ticket
      ? `【解锁】ticket=${ticket.ticket_id}。全不中：node scripts/close-correction-ticket.mjs close --session ${sessionId} --level NONE；命中：node scripts/close-correction-ticket.mjs template --session ${sessionId} --level L<n> [--route]，审阅填证据后 close --request <file>。旧 ".episode-written-${sessionId}" marker 仅提示，绝无放行权。`
      : `【解锁】ticket 不可用（${ticketError || 'missing'}），不得伪造 receipt；需由下一顶层 prompt 的 hook 先签发。旧 ".episode-written-${sessionId}" marker 仅提示，绝无放行权。`,
  ].join('\n');
}

// ============== 主决策（全程 try/catch，异常即 fail-open 放行）==============
try {
  const killSwitch = process.env.SESSION_SYNC_BLOCK === '0';
  const markerFile = join(projectRoot, '.claude', `.episode-written-${sessionId}`);
  const legacyMarkerPresent = existsSync(markerFile);

  // 并发隔离（G2，2026-07-04）：stdin 带真实 session_id 时只读本 session 的 per-sid 计数
  // （post-edit 同 sid 写入；缺文件=本 session 无产出动作，不回退共享文件——否则会把并行
  // legacy session 的计数误算进来）；无 sid（测试/管道）读共享旧文件名。
  const readCount = (name) => {
    const f = hasSid ? `${name}-${sessionId}` : name;
    try { return parseInt(readFileSync(join(projectRoot, '.claude', f), 'utf8'), 10) || 0; } catch { return 0; }
  };
  const editCount = readCount('.session-edit-count');
  const toolCount = readCount('.session-tool-count');
  const minTools = parseInt(process.env.SESSION_SYNC_MIN_TOOLS || '8', 10);
  // 拦截（当场 block 强制提取）只看「本 session 有产出动作」：文件编辑 或 足量工具调用。
  // 纯轮次(turns)不再触发拦截——「聊了几轮有结论」≠「有实质工作」，否则纯咨询会被误拦（HOOK-006 锁定）。
  // 未拦截的 session 仍走下方 pending-extraction 软兜底（不打断结束，只下次启动提醒）。
  // nodeStates(含 DONE)是跨 session 历史状态，同样不参与拦截（HOOK-002）。
  const substantive = (editCount >= 1) || (toolCount >= minTools);

  // U-006: receipt 是唯一放行权。旧 marker 只保留可见性/迁移提示；即使存在、为空或被改写，
  // 都不能改变下面的裁决。任何 receipt/ticket/evidence 读回异常都折叠为未闭合（fail-closed）。
  let completed = null;
  let completionError = '';
  try { completed = readCurrentCorrectionReceipt({ root: projectRoot, sessionId }); }
  catch (error) { completionError = String(error?.message || error); }

  // ---- 增量重拦：baseline 只来自已验证 receipt，不再来自可自报的 marker ----
  let rearm = false, deltaEdit = 0, deltaTool = 0;
  if (completed && process.env.SESSION_SYNC_REARM !== '0') {
    deltaEdit = editCount - completed.receipt.baseline_counts.edit;
    deltaTool = toolCount - completed.receipt.baseline_counts.tool;
    const rearmEdits = parseInt(process.env.SESSION_SYNC_REARM_EDITS || '10', 10);
    const rearmTools = parseInt(process.env.SESSION_SYNC_REARM_TOOLS || '50', 10);
    if (deltaEdit >= rearmEdits || deltaTool >= rearmTools) {
      rearm = true;
    }
  }

  // ---- 拦截：首次闭合、receipt 损坏或增量重拦。stop_hook_active 不再构成旁路。----
  if (!killSwitch && ((!completed && substantive) || rearm)) {
    let active = null;
    let ticketError = completionError;
    try {
      active = rearm
        ? ensureRearmCorrectionTicket({ root: projectRoot, sessionId, completed })
        : readActiveCorrectionTicket({ root: projectRoot, sessionId });
      if (!active && !ticketError) ticketError = 'missing active ticket';
    } catch (error) {
      ticketError = String(error?.message || error);
    }
    writeCheckpointIfInProgress();
    const reason = buildReason({ rearm, deltaEdit, deltaTool, ticket: active?.ticket || null, ticketError });
    // harness 门（P0/WS-A0 接线，2026-07-25）：decision:block 是 CC 专有动词，正向确定是 Codex
    // 时降级为纯文本 advisory（claude/unknown 照常 block——失效方向偏向保住自成长捕获强制）。
    let canBlock = true;
    try { canBlock = (await import('./lib/harness.mjs')).canEmitControlVerb(process.env); } catch { }
    if (canBlock) {
      process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    } else {
      process.stderr.write(`[session-sync] ⚠️ 本 session 有实质工作但未沉淀经验（当前 harness 无 Stop-block 强制能力，此为 advisory）：\n${reason}\n`);
    }
    process.exit(0);
  }

  // Only a non-blocking Stop is a turn-closing boundary. A blocked Stop keeps
  // TURN_ACTIVE so the required extraction continuation cannot cross epochs.
  closeSnapshotOnExit = projectState?.state === 'TURN_ACTIVE'
    || (projectState?.state === 'BOUND' && Boolean(projectState?.terminal));

  // ---- 放行 ----
  // kill-switch 可见性（audit 2026-07-07 F1-02）：环境残留 SESSION_SYNC_BLOCK=0 曾静默关停
  // 自成长拦截一整个 session（EP-20260706-057 当事记录自认）。命中时留痕，不再无声。
  if (killSwitch) {
    process.stderr.write(`[session-sync] ⚠️ SESSION_SYNC_BLOCK=0 生效——自成长拦截已被环境变量禁用（如非有意设置，请在启动终端 unset 后重开进程）。\n`);
  }
  process.stderr.write(`[session-sync] Session 结束于 ${now}。topic: ${topic}${project ? ` · 项目: ${project}` : ''}\n`);
  writeCheckpointIfInProgress();

  // 未提交的记忆/演进状态提醒（纯提醒、非阻塞、fail-open）：本机正常使用会写这些
  // git-tracked 状态文件，与 GitHub 漂移；收尾用 scripts/sync.sh 一条命令推回。
  // 只走 stderr —— stdout 在 Stop 路径专用于 block 决策 JSON（见文件头契约）。
  // MEMORY_ROOT 重定向时记忆写入落的是那个仓（session-restore F2-01 同款 split-brain）：
  // 两仓都查，否则 fork session 写脏母版永远无人提醒（2026-07-14 P3 实证，前日 A11 WARN 即此症）。
  const memoryRoot = resolveMemoryRoot(process.env, { fallbackRoot: projectRoot }).path;
  for (const repo of [...new Set([projectRoot, memoryRoot])]) {
    try {
      const dirty = execSync(
        'git status --porcelain -- memory/episodic/index.jsonl memory/episodic/archive memory/semantic/promoted-facts.yaml memory/semantic/archive memory/evals/eval-log.jsonl .claude/skill-os/evolution .claude/observability/observations.jsonl',
        { cwd: repo, encoding: 'utf8', env: withoutLocalGitEnv() }
      ).trim();
      if (dirty) process.stderr.write(`[session-sync] 🔔 ${repo === projectRoot ? '本仓' : `MEMORY_ROOT 仓（${repo}）`}有未提交的记忆/演进状态 — 收尾请在该仓跑 \`bash scripts/sync.sh\` 推到 GitHub。\n`);
    } catch { }
  }

  if (completed) {
    // 提取已完成 → 回收本 sid 早先回合落下的 pending 兜底文件，防已处理仍被提醒（audit F1-03）
    try {
      const stalePending = join(projectRoot, '.claude', 'observability',
        hasSid ? `pending-extraction-${sessionId}.md` : 'pending-extraction.md');
      if (existsSync(stalePending)) unlinkSync(stalePending);
    } catch { }
    process.stderr.write(`[session-sync] ✅ correction receipt 已验证（${completed.receipt.receipt_id}），放行。\n`);
    process.exit(0);
  }

  if (legacyMarkerPresent) {
    process.stderr.write(`[session-sync] ⚠️ 旧 marker 存在但仅作迁移提示，不具放行权。\n`);
  }

  // 未拦截（trivial / kill-switch / stop_hook_active 但无 marker）：保留旧提醒 + pending-extraction 作兜底
  const episodicDir = join(projectRoot, 'memory', 'episodic');
  if (existsSync(episodicDir)) {
    process.stderr.write(
      `[session-sync] 💡 如需手动沉淀：python3 memory/scripts/append_episode.py --topic "${topic}" --summary "..." --decision "..." --next-risk "..."\n`
    );
  }
  // 并发隔离（G2，2026-07-04）：pending 文件按 session 命名——全局单文件会被并发 session
  // 互相吞写、topic 张冠李戴；session-restore 按 glob pending-extraction*.md 逐个提醒（兼容旧名）。
  // 只对 substantive-但-未拦截（kill-switch / stop_hook_active）写软兜底；trivial session 不写——
  // 与 CLAUDE.md「无文件产出且工具调用不足不拦截、不提醒」对齐（audit F1-03；原 HOOK-006 时
  // 「未拦截一律写」在 Stop 按回合触发下会让每个 session 首回合都落一个 stub，只增不减）。
  if (!substantive) process.exit(0);
  const pending = join(projectRoot, '.claude', 'observability',
    hasSid ? `pending-extraction-${sessionId}.md` : 'pending-extraction.md');
  try {
    if (existsSync(pending)) {
      process.stderr.write(`[session-sync] 📝 ${pending.split('/').pop()} 已存在（待处理），保持不变\n`);
    } else {
      mkdirSync(join(projectRoot, '.claude', 'observability'), { recursive: true });
      writeFileSync(pending, [
        `# Pending Skill-Rule Extraction`, ``,
        `> 自动生成于 ${now}。下次 session 启动时由 session-restore 提醒处理。`,
        `> Topic: ${topic}`,
        ...(project ? [`> Project: ${project}`] : []),
        `> 处理后请删除此文件。`,
        `> 提取前先过 .claude/skill-os/extraction-bar.md 四信号门槛，全不中则直接删除本文件。`, ``,
        `python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "<skill>: <规则>" \\`,
        `  --confidence high --evidence "<来源>" --scope "<skill>" --reviewer "luca" --tags "<skill>,rule"`, ``,
      ].join('\n'));
      process.stderr.write(`[session-sync] 📝 已写入 ${pending.split('/').pop()}（下次启动提醒）\n`);
    }
  } catch { }
  process.exit(0);
} catch (e) {
  // fail-open：任何异常都不得阻止 session 结束
  try { process.stderr.write(`[session-sync] ⚠️ 异常，已放行: ${String(e && e.message).slice(0, 80)}\n`); } catch { }
  process.exit(0);
}
