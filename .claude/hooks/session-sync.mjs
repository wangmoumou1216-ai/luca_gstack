#!/usr/bin/env node
// Stop hook —— Session 结束时：
//  · 若本 session 有「实质工作」且尚未沉淀经验 → 拦截（decision:block），
//    强制主 Agent 就地做「自成长提取」（分 项目级 / 通用 两类落地）再结束。
//  · 否则放行，并保留旧行为（有中断节点时写 checkpoint）。
//
// 安全契约（务必维持）：
//  · 任何异常一律 fail-open —— 不输出 JSON、exit 0，绝不卡住 session 结束。
//  · 三重防循环：stop_hook_active（CC 已在拦截续跑）/ 本 session marker / 环境变量 SESSION_SYNC_BLOCK=0 kill-switch。
//  · 拦截路径 stdout 只能是「纯 JSON」，不能混任何文本（否则 CC 解析 decision 失败）。
import { existsSync, readFileSync, writeFileSync, mkdirSync, readlinkSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const now = new Date().toISOString();
const dateStr = now.slice(0, 10);

// ---- 读取 Stop 事件 payload（stdin）----
let payload = {};
try { payload = JSON.parse(readFileSync('/dev/stdin', 'utf8') || '{}'); } catch { }
const stopHookActive = payload.stop_hook_active === true;
const sessionId =
  (payload.session_id && String(payload.session_id).replace(/[^\w-]/g, '').slice(0, 32)) ||
  `date-${dateStr}`;

// ---- 解析 topic + workflow 节点状态 ----
let topic = 'session';
let nodeStates = [];
const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');
if (existsSync(stateFile)) {
  try {
    const content = readFileSync(stateFile, 'utf8');
    const tm = content.match(/^topic:\s*"([^"]*)"/m) || content.match(/^topic:\s*'([^']*)'/m) || content.match(/^topic:\s*(\S+)/m);
    if (tm && tm[1].trim()) topic = tm[1].trim();
    const nm = [...content.matchAll(/^  (\w[\w-]+):\s*\n\s+status:\s*(IN_PROGRESS|DONE)/gm)];
    nodeStates = nm.map(m => ({ name: m[1], status: m[2] }));
  } catch { }
}

// ---- 当前激活项目（docs 软链 .../项目/<name>/docs）----
let project = '';
try {
  const m = readlinkSync(join(projectRoot, 'docs')).match(/\/项目\/([^/]+)/);
  if (m) project = m[1];
} catch { }

// ---- 写 checkpoint（仅当有 IN_PROGRESS 节点；纯文件 I/O，两条路径都可调）----
function writeCheckpointIfInProgress() {
  const inProgress = nodeStates.filter(n => n.status === 'IN_PROGRESS').map(n => n.name);
  // 无激活项目（docs 非软链）时不落 checkpoint，否则会在 luca_gstack 仓内生成杂散 docs/handoff（HOOK-005）。
  if (inProgress.length === 0 || !project) return;
  try {
    const dir = join(projectRoot, 'docs', 'handoff');
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
    process.stderr.write(`[session-sync] ✅ 已自动写入 checkpoint: docs/handoff/${dateStr}-auto-checkpoint.md\n`);
  } catch { }
}

// ---- 拦截用的「自成长提取」指令 ----
function buildReason() {
  const projArg = project ? `--project "${project}" ` : '';
  // 项目级落点：有激活项目 → 持久事实进该项目本地记忆，单次经历进 episodic；
  //            无激活项目 → 暂记 episodic 不带 --project，待项目激活后归位。
  const projBullet = project
    ? [
        `  · 只对某个具体下游项目成立（部署坑 / 状态路径 / 项目结构等，仅适用「${project}」）→`,
        `      持久事实 → 追加到该项目本地记忆：`,
        `        ~/Desktop/项目/${project}/.luca/memory/MEMORY.md（加一行「- [标题](file.md) — 钩子」，必要时同目录建正文 .md）`,
        `      单次经历流水 → python3 memory/scripts/append_episode.py ${projArg}--topic "<简述>" \\`,
        `        --summary "<做了什么>" --skills "<skill>" --outcomes "<产出路径>" \\`,
        `        --decision "<为什么这么判断>" --next-risk "<下次注意>"`,
      ]
    : [
        `  · 只对某个具体下游项目成立 →（当前无激活项目）暂用 append_episode.py 记入 episodic 不带 --project，`,
        `      待该项目激活后归位到其 ~/Desktop/项目/<name>/.luca/memory/MEMORY.md。`,
      ];
  return [
    `本次 session 有实质工作但尚未沉淀经验。结束前必须就地完成「自成长提取」（仅一次，勿循环）：`,
    ``,
    `【1】反思本次 session：做了什么、做过哪些非显而易见的判断、踩了什么坑、有无可复用规律。`,
    `     若确为纯查询/闲聊/无判断 → 直接跳到【4】落 marker 结束。`,
    ``,
    `【2】每条经验先用「还原问题」判定归属，再分别落地（单 session 通常 0–2 条，勿凑数）：`,
    `     判据：「换一个完全无关的项目、甚至重建 luca_gstack，这条还成立/有用吗？」`,
    `  · 跟项目无关、跟框架无关，只关于 luca 这个人怎么工作（偏好/反复纠正/行为教训）→ 全局个人记忆：`,
    `      在 /Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/ 下`,
    `      新建 feedback_<slug>.md（带 frontmatter）并在 MEMORY.md 索引追加一行。`,
    `  · 只在 luca_gstack 框架内成立（skill 规则 / 路由 / 品牌 / 跨项目方法论）→ 受控候选`,
    `      （勿直接写 promoted-facts.yaml，红线 SC-20260523-003）：`,
    `      python3 memory/scripts/propose_semantic.py --domain skill-rule|tech|workflow \\`,
    `        --fact "<规则>" --confidence high --evidence "<复现/来源>" \\`,
    `        --scope "<适用范围>" --reviewer "luca" --tags "<tags>"`,
    ...projBullet,
    ``,
    `【3】只沉淀真有信息量的；占位/凑数的 episode 会被 consolidate 判为 noisy 归档。`,
    ``,
    `【4】完成后写 marker 解除拦截，然后正常结束、勿重复本流程：`,
    `      touch ".claude/.episode-written-${sessionId}"`,
  ].join('\n');
}

// ============== 主决策（全程 try/catch，异常即 fail-open 放行）==============
try {
  const killSwitch = process.env.SESSION_SYNC_BLOCK === '0';
  const markerFile = join(projectRoot, '.claude', `.episode-written-${sessionId}`);
  const alreadyExtracted = existsSync(markerFile);

  let editCount = 0, toolCount = 0;
  try { editCount = parseInt(readFileSync(join(projectRoot, '.claude', '.session-edit-count'), 'utf8'), 10) || 0; } catch { }
  try { toolCount = parseInt(readFileSync(join(projectRoot, '.claude', '.session-tool-count'), 'utf8'), 10) || 0; } catch { }
  const minTools = parseInt(process.env.SESSION_SYNC_MIN_TOOLS || '8', 10);
  // 拦截（当场 block 强制提取）只看「本 session 有产出动作」：文件编辑 或 足量工具调用。
  // 纯轮次(turns)不再触发拦截——「聊了几轮有结论」≠「有实质工作」，否则纯咨询会被误拦（HOOK-006 锁定）。
  // 未拦截的 session 仍走下方 pending-extraction 软兜底（不打断结束，只下次启动提醒）。
  // nodeStates(含 DONE)是跨 session 历史状态，同样不参与拦截（HOOK-002）。
  const substantive = (editCount >= 1) || (toolCount >= minTools);

  // ---- 拦截：强制就地提取 ----
  if (!killSwitch && !stopHookActive && !alreadyExtracted && substantive) {
    writeCheckpointIfInProgress();
    process.stdout.write(JSON.stringify({ decision: 'block', reason: buildReason() }));
    process.exit(0);
  }

  // ---- 放行 ----
  process.stderr.write(`[session-sync] Session 结束于 ${now}。topic: ${topic}${project ? ` · 项目: ${project}` : ''}\n`);
  writeCheckpointIfInProgress();

  if (alreadyExtracted) {
    process.stderr.write(`[session-sync] ✅ 本 session 经验已沉淀（marker 命中），放行。\n`);
    process.exit(0);
  }

  // 未拦截（trivial / kill-switch / stop_hook_active 但无 marker）：保留旧提醒 + pending-extraction 作兜底
  const episodicDir = join(projectRoot, 'memory', 'episodic');
  if (existsSync(episodicDir)) {
    process.stderr.write(
      `[session-sync] 💡 如需手动沉淀：python3 memory/scripts/append_episode.py --topic "${topic}" --summary "..." --decision "..." --next-risk "..."\n`
    );
  }
  const pending = join(projectRoot, '.claude', 'observability', 'pending-extraction.md');
  try {
    if (existsSync(pending)) {
      process.stderr.write(`[session-sync] 📝 pending-extraction.md 已存在（待处理），保持不变\n`);
    } else {
      mkdirSync(join(projectRoot, '.claude', 'observability'), { recursive: true });
      writeFileSync(pending, [
        `# Pending Skill-Rule Extraction`, ``,
        `> 自动生成于 ${now}。下次 session 启动时由 session-restore 提醒处理。`,
        `> Topic: ${topic}`, `> 处理后请删除此文件。`, ``,
        `python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "<skill>: <规则>" \\`,
        `  --confidence high --evidence "<来源>" --scope "<skill>" --reviewer "luca" --tags "<skill>,rule"`, ``,
      ].join('\n'));
      process.stderr.write(`[session-sync] 📝 已写入 pending-extraction.md（下次启动提醒）\n`);
    }
  } catch { }
  process.exit(0);
} catch (e) {
  // fail-open：任何异常都不得阻止 session 结束
  try { process.stderr.write(`[session-sync] ⚠️ 异常，已放行: ${String(e && e.message).slice(0, 80)}\n`); } catch { }
  process.exit(0);
}
