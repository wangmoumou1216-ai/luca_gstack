#!/usr/bin/env node
// Stop hook —— 每个 assistant 回合结束时：
//  · 默认静默放行；有实质工作且尚未沉淀时只落 pending-extraction，供下次启动提醒。
//  · 仅显式设置 SESSION_SYNC_FORCE_ON_STOP=1 时保留旧的 decision:block 强制提取模式。
//  · 有中断节点时照常写 checkpoint，并关闭本轮项目快照。
//
// 安全契约（务必维持）：
//  · 任何异常一律 fail-open —— 不输出 JSON、exit 0，绝不卡住 session 结束。
//  · 强制模式三重防循环：stop_hook_active / 本 session marker / SESSION_SYNC_BLOCK=0 kill-switch。
//  · 拦截路径 stdout 只能是「纯 JSON」，不能混任何文本（否则 CC 解析 decision 失败）。
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { resolveMemoryRoot } from './lib/memroot.mjs';
import { withoutLocalGitEnv } from './lib/git-env.mjs';
import {
  PROJECTS_ROOT as SUBSTRATE_PROJECTS_ROOT,
  PROJECT_STATE_SCHEMA,
  activeProjectAuthority,
  attestPendingProjectEvent,
  closeAttestedProjectEvent,
  readProjectState,
  validatedBindingForState,
} from './lib/project-substrate.mjs';
import { closeGrants, snapshotGrantTurn } from './lib/project-read-grants.mjs';
import { actualHarness } from './lib/harness.mjs';

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
let projectEventSnapshot = null;
function observationBoundary(state) {
  const control = state?.event_control;
  const harness = control?.candidates?.[0]?.harness || control?.current?.harness;
  if (harness === 'claude') return sessionId;
  return String(payload.turn_id || payload.prompt_id || '');
}
if (hasSid) {
  try {
    projectState = readProjectState(projectRoot, sessionId).value;
    const control = projectState?.event_control;
    if (projectState.schema_version === PROJECT_STATE_SCHEMA
        && (control?.candidates?.length > 0 || control?.current?.status === 'active')) {
      const observed = attestPendingProjectEvent({
        gstackRoot: projectRoot,
        projectsRoot: PROJECTS_ROOT,
        sessionId,
        boundaryId: observationBoundary(projectState),
        cwd: payload.cwd || projectRoot,
        observation: 'stop',
        transcriptPath: payload.transcript_path || '',
        codexHome: process.env.CODEX_HOME || '',
        assistantText: typeof payload.last_assistant_message === 'string'
          ? payload.last_assistant_message : '',
      });
      projectState = observed.state;
      projectEventSnapshot = observed.event;
    }
    if (projectState.schema_version === PROJECT_STATE_SCHEMA && projectEventSnapshot) {
      const authority = projectState.state === 'TURN_ACTIVE'
        ? activeProjectAuthority(projectState, {
          boundaryId: observationBoundary(projectState),
          cwd: payload.cwd || projectRoot,
        }, PROJECTS_ROOT)
        : null;
      const binding = authority?.binding
        || (['BOUND', 'TURN_CLOSED', 'SWITCH_ONLY'].includes(projectState.state)
          ? validatedBindingForState(projectState, PROJECTS_ROOT) : null);
      if (projectState.state === 'TURN_ACTIVE' && !binding) {
        throw new Error('TURN_ACTIVE lacks current attested native event authority');
      }
      if (authority?.event) projectEventSnapshot = authority.event;
      if (binding) {
        project = binding.project;
        projectFromPin = true;
      }
    }
  } catch (error) {
    try { process.stderr.write(`[session-sync] ⚠️ native event observation failed (${error?.code || 'ERROR'}): ${String(error?.message || error)}\n`); } catch { }
    try { projectState = readProjectState(projectRoot, sessionId).value; } catch { }
  }
}

let closeSnapshotOnExit = false;
let closeReadGrantTurnOnExit = false;
let readGrantTurnSnapshot = null;
if (hasSid) {
  try { readGrantTurnSnapshot = snapshotGrantTurn(projectRoot, sessionId); } catch { }
}
process.on('exit', () => {
  if (closeSnapshotOnExit && projectState && hasSid) {
    try {
      if (projectState.schema_version === PROJECT_STATE_SCHEMA && projectEventSnapshot?.status === 'active') {
        closeAttestedProjectEvent({
          gstackRoot: projectRoot,
          projectsRoot: PROJECTS_ROOT,
          sessionId,
          eventId: projectEventSnapshot.event_id,
          boundaryId: projectEventSnapshot.boundary_id,
          outcome: 'stop',
        });
      }
    } catch (error) {
      try { process.stderr.write(`[session-sync] ⚠️ turn snapshot close failed: ${error.message}\n`); } catch { }
    }
  }
  if (closeReadGrantTurnOnExit && hasSid && readGrantTurnSnapshot?.open) {
    try {
      closeGrants({
        gstackRoot: projectRoot,
        sessionId,
        scope: 'turn',
        generation: readGrantTurnSnapshot.generation,
        turnId: readGrantTurnSnapshot.turnId,
      });
    }
    catch (error) {
      try { process.stderr.write(`[session-sync] ⚠️ read grant close failed (deny latch retained): ${error.message}\n`); } catch { }
    }
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
function buildReason(rearm = false, deltaEdit = 0, deltaTool = 0) {
  const projLine = project
    ? `【项目】当前激活项目「${project}」：项目级持久事实 → ~/Desktop/项目/${project}/.luca/memory/MEMORY.md；单次经历 → python3 memory/scripts/append_episode.py --project "${project}"；若本 session 实为框架/meta 工作（改 luca_gstack 自身），episodic 改用 --meta 防误标。`
    : `【项目】当前无激活项目：项目级经验暂记 append_episode.py（不带 --project），待项目激活后归位到其 .luca/memory/MEMORY.md。`;
  return [
    rearm
      ? `自上次提取裁决后，本 session 又新增大量实质工作（Δedit=${deltaEdit}, Δtool=${deltaTool}）。对【新增部分】再做一次「自成长提取」裁决（仅一次，勿循环）：`
      : `本 session 有实质工作但尚未沉淀经验。结束前就地完成一次「自成长提取」（仅一次，勿循环）：`,
    `【门槛 · 默认不存】四强信号才提取：①用户明确纠正/对未来行为明确指示 ②同类问题复发 ③真实返工或不可逆险情 ④重获成本高且确定复用（定义与按层分级 → 读 .claude/skill-os/extraction-bar.md）。绕行所得先问源头：根因在自有系统→修源头，记忆只存指针+兜底（correction-attribution.md L5）。全不中（纯查询/闲聊/纯执行）→ 直接跳【解锁】。`,
    `【归属】过门槛的经验按 CLAUDE.md「写入协议」三分表落地：全局个人记忆（仅① feedback_<slug>.md+MEMORY.md 索引；②③④ candidate_feedback_<slug>.md 不进索引）/ 框架 semantic 候选（propose_semantic.py，红线 SC-20260523-003）/ 项目本地。单 session 通常 0–2 条，勿凑数。`,
    projLine,
    rearm
      ? `【解锁】计数基线已自动刷新（同一增量至多拦一次）——完成后直接正常结束即可。`
      : `【解锁】完成后 touch ".claude/.episode-written-${sessionId}" 再正常结束。`,
  ].join('\n');
}

// ============== 主决策（全程 try/catch，异常即 fail-open 放行）==============
try {
  const killSwitch = process.env.SESSION_SYNC_BLOCK === '0';
  // Stop 是回合边界，不是 SessionEnd。默认在这里强制续跑会把正常中间对话变成额外的
  // “经验提取”回合；旧强制能力仅作为显式兼容开关保留。
  const forceOnStop = process.env.SESSION_SYNC_FORCE_ON_STOP === '1';
  const markerFile = join(projectRoot, '.claude', `.episode-written-${sessionId}`);
  const alreadyExtracted = existsSync(markerFile);

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

  // ---- 增量重拦（2026-07-13 M1，SC-20260713-001 落地）----
  // marker 只免"已裁决过的工作量"：内容 = 上次裁决时的计数基线（首次 touch 创建为空 →
  // 下一次 Stop 补写基线）。此后增量超阈值 → 再拦一次。防循环：拦截前由 hook 自己刷新
  // 基线，同一增量至多拦一次（agent 忽略或只 touch 都不会二次拦）。SESSION_SYNC_REARM=0 关闭。
  // 背景：马拉松 session 首次裁决后 marker 曾使后续实质工作零兜底（2026-07-13 实证）。
  let rearm = false, deltaEdit = 0, deltaTool = 0;
  if (alreadyExtracted && process.env.SESSION_SYNC_REARM !== '0') {
    let base = null;
    try {
      const m = readFileSync(markerFile, 'utf8').trim().match(/^(\d+)\s+(\d+)$/);
      if (m) base = { edit: parseInt(m[1], 10), tool: parseInt(m[2], 10) };
    } catch { }
    if (!base) {
      try { writeFileSync(markerFile, `${editCount} ${toolCount}`); } catch { }
    } else {
      deltaEdit = editCount - base.edit;
      deltaTool = toolCount - base.tool;
      const rearmEdits = parseInt(process.env.SESSION_SYNC_REARM_EDITS || '10', 10);
      const rearmTools = parseInt(process.env.SESSION_SYNC_REARM_TOOLS || '50', 10);
      if (deltaEdit >= rearmEdits || deltaTool >= rearmTools) {
        rearm = true;
      }
    }
  }

  // ---- 拦截：强制就地提取（首次裁决 或 增量重拦）----
  if (forceOnStop && !killSwitch && !stopHookActive && ((!alreadyExtracted && substantive) || rearm)) {
    writeCheckpointIfInProgress();
    const reason = buildReason(rearm, deltaEdit, deltaTool);
    // harness 门（P0/WS-A0 接线，2026-07-25）：decision:block 是 CC 专有动词，正向确定是 Codex
    // 时降级为纯文本 advisory（claude/unknown 照常 block——失效方向偏向保住自成长捕获强制）。
    let canBlock = true;
    try { canBlock = (await import('./lib/harness.mjs')).canEmitControlVerb(process.env); } catch { }
    if (canBlock) {
      if (rearm) writeFileSync(markerFile, `${editCount} ${toolCount}`);
      process.stdout.write(JSON.stringify({ decision: 'block', reason }));
      process.exit(0);
    } else {
      process.stderr.write(`[session-sync] ⚠️ 本 session 有实质工作但未沉淀经验（当前 harness 无 Stop-block 强制能力，此为 advisory）：\n${reason}\n`);
    }
  }

  // Only a non-blocking Stop is a turn-closing boundary. A blocked Stop keeps
  // TURN_ACTIVE so the required extraction continuation cannot cross epochs.
  closeSnapshotOnExit = projectState?.schema_version === PROJECT_STATE_SCHEMA
    ? projectEventSnapshot?.status === 'active'
    : projectState?.state === 'TURN_ACTIVE'
      || (projectState?.state === 'BOUND' && Boolean(projectState?.terminal));
  closeReadGrantTurnOnExit = hasSid;

  // ---- 放行 ----
  // kill-switch 可见性（audit 2026-07-07 F1-02）：环境残留 SESSION_SYNC_BLOCK=0 曾静默关停
  // 自成长拦截一整个 session（EP-20260706-057 当事记录自认）。命中时留痕，不再无声。
  if (killSwitch) {
    process.stderr.write(`[session-sync] ⚠️ SESSION_SYNC_BLOCK=0 生效——自成长拦截已被环境变量禁用（如非有意设置，请在启动终端 unset 后重开进程）。\n`);
  }
  process.stderr.write(`[session-sync] 回合结束于 ${now}。topic: ${topic}${project ? ` · 项目: ${project}` : ''}\n`);
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
        'git status --porcelain -- memory/episodic/index.jsonl memory/episodic/archive memory/semantic/promoted-facts.yaml memory/semantic/reviews.jsonl memory/semantic/archive memory/evals/eval-log.jsonl memory/retrieval-log.jsonl .claude/skill-os/evolution .claude/observability/observations.jsonl',
        { cwd: repo, encoding: 'utf8', env: withoutLocalGitEnv() }
      ).trim();
      if (dirty) process.stderr.write(`[session-sync] 🔔 ${repo === projectRoot ? '本仓' : `MEMORY_ROOT 仓（${repo}）`}有未提交的记忆/演进状态 — 收尾请在该仓跑 \`bash scripts/sync.sh\` 推到 GitHub。\n`);
    } catch { }
  }

  if (alreadyExtracted && !rearm) {
    // marker 只证明本 session 做过某种沉淀，不证明这个 pending 已逐项裁决。旧逻辑在这里
    // 直接 unlink，会把唯一 transcript locator 连同未裁决证据一起静默销毁。active pending
    // 只能经 daily_governance.py pending-disposition 先写 manifest evidence 后移入 quarantine。
    const retainedPending = join(projectRoot, '.claude', 'observability',
      hasSid ? `pending-extraction-${sessionId}.md` : 'pending-extraction.md');
    const retainedNote = existsSync(retainedPending)
      ? `；pending 仍保留，须显式记录 QUALIFIED / NO_SIGNAL / UNRESOLVED disposition：${retainedPending}`
      : '';
    process.stderr.write(`[session-sync] 本 session 裁决 marker 命中（不代表已有记忆内容落库），放行${retainedNote}。\n`);
    process.exit(0);
  }

  // 未拦截（默认软模式 / trivial / kill-switch / stop_hook_active）：pending-extraction 作兜底
  const episodicDir = join(projectRoot, 'memory', 'episodic');
  if (existsSync(episodicDir)) {
    process.stderr.write(
      `[session-sync] 💡 如需手动沉淀：python3 memory/scripts/append_episode.py ${project ? `--project "${project}"` : '--meta'} --topic "${topic}" --summary "..." --decision "..." --next-risk "..."\n`
    );
  }
  // 并发隔离（G2，2026-07-04）：pending 文件按 session 命名——全局单文件会被并发 session
  // 互相吞写、topic 张冠李戴；session-restore 按 glob pending-extraction*.md 逐个提醒（兼容旧名）。
  // 只对 substantive-但-未拦截（kill-switch / stop_hook_active）写软兜底；trivial session 不写——
  // 与 CLAUDE.md「无文件产出且工具调用不足不拦截、不提醒」对齐（audit F1-03；原 HOOK-006 时
  // 「未拦截一律写」在 Stop 按回合触发下会让每个 session 首回合都落一个 stub，只增不减）。
  if (!substantive) process.exit(0);
  const pending = join(projectRoot, '.claude', 'observability',
    rearm ? `pending-extraction-${sessionId}-e${editCount}-t${toolCount}.md`
      : hasSid ? `pending-extraction-${sessionId}.md` : 'pending-extraction.md');
  try {
    if (existsSync(pending)) {
      process.stderr.write(`[session-sync] 📝 ${pending.split('/').pop()} 已存在（待处理），保持不变\n`);
    } else {
      mkdirSync(join(projectRoot, '.claude', 'observability'), { recursive: true });
      const oneLine = (value, fallback = 'unavailable', max = 512) => {
        const clean = String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
        return clean || fallback;
      };
      const locatorSid = hasSid ? oneLine(sessionId) : 'unavailable';
      const locatorTranscript = oneLine(payload.transcript_path);
      const locatorHarness = oneLine(actualHarness(process.env));
      const relativePending = `.claude/observability/${pending.split('/').pop()}`;
      writeFileSync(pending, [
        `# Pending Experience Adjudication`, ``,
        `> This is retained evidence awaiting adjudication, not a pre-classified skill-rule.`,
        `> Session-ID: ${locatorSid}`,
        `> Captured-At: ${now}`,
        `> Topic: ${oneLine(topic, 'session')}`,
        `> Project: ${project ? oneLine(project) : 'NO_PIN'}`,
        `> Harness: ${locatorHarness}`,
        `> Transcript-Path: ${locatorTranscript}`, ``,
        `> Work-Window: edits=${editCount} tools=${toolCount} delta_edits=${deltaEdit} delta_tools=${deltaTool}`, ``,
        `先读 .claude/skill-os/extraction-bar.md，再显式选择一种 disposition：`, ``,
        `- QUALIFIED — 记录实际落点证据：L1/L2 内容修正、L3 skill 源头修复、L4 框架源头修复、L5 自有产品源头修复，或门槛允许的受控记忆落点。`,
        `- NO_SIGNAL — 四信号均不成立；记录判据后移出 active。`,
        `- UNRESOLVED — transcript/上下文不足；记录缺口并保留 active 文件。`, ``,
        `不得直接删除。用以下窄入口先写 append-only disposition evidence；QUALIFIED/NO_SIGNAL 随后自动移入 quarantine：`, ``,
        `python3 memory/scripts/daily_governance.py pending-disposition --pending "${relativePending}" \\`,
        `  --status <QUALIFIED|NO_SIGNAL|UNRESOLVED> --evidence "<裁决证据或未决缺口>" --actor "<name>"`, ``,
      ].join('\n'), { flag: 'wx' });
      process.stderr.write(`[session-sync] 📝 已写入 ${pending.split('/').pop()}（下次启动提醒）\n`);
    }
    // A failed capture must retain the previous baseline so the next Stop retries.
    if (rearm) writeFileSync(markerFile, `${editCount} ${toolCount}`);
  } catch (error) {
    process.stderr.write(`[session-sync] ⚠️ pending capture failed; baseline retained for retry: ${String(error?.message || error)}\n`);
  }
  process.exit(0);
} catch (e) {
  // fail-open：任何异常都不得阻止 session 结束
  try { process.stderr.write(`[session-sync] ⚠️ 异常，已放行: ${String(e && e.message).slice(0, 80)}\n`); } catch { }
  process.exit(0);
}
