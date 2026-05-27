#!/usr/bin/env node
// Session 结束时：自动写 checkpoint（如有活跃节点），提示写入情景记忆
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const now = new Date().toISOString();
const dateStr = now.slice(0, 10);

let topic = 'session';
let nodeStates = [];

const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');
if (existsSync(stateFile)) {
  const content = readFileSync(stateFile, 'utf8');
  const topicMatch = content.match(/^topic:\s*"([^"]*)"/m)
                  || content.match(/^topic:\s*'([^']*)'/m)
                  || content.match(/^topic:\s*(\S+)/m);
  if (topicMatch) {
    const parsedTopic = topicMatch[1].trim();
    if (parsedTopic) topic = parsedTopic;
  }

  const nodeMatches = [...content.matchAll(/^  (\w[\w-]+):\s*\n\s+status:\s*(IN_PROGRESS|DONE)/gm)];
  nodeStates = nodeMatches.map(m => ({ name: m[1], status: m[2] }));
}

process.stdout.write(`[session-sync] Session 结束于 ${now}。当前 topic: ${topic}\n`);

// Auto-write checkpoint only for interrupted active work. DONE-only history should not pollute handoff.
const inProgressNodes = nodeStates.filter(n => n.status === 'IN_PROGRESS').map(n => n.name);
if (inProgressNodes.length > 0) {
  const handoffDir = join(projectRoot, 'docs', 'handoff');
  try {
    mkdirSync(handoffDir, { recursive: true });
    const checkpointFile = join(handoffDir, `${dateStr}-auto-checkpoint.md`);
    const nodeList = nodeStates.map(n => `- **${n.name}**: ${n.status}`).join('\n');
    const resumeHint = `继续 ${inProgressNodes.join(', ')} 节点的工作`;
    const checkpointContent = [
      `# Auto Checkpoint — ${now}`,
      '',
      `**Topic:** ${topic}`,
      '',
      '## 节点状态',
      '',
      nodeList,
      '',
      '## 恢复指令',
      '',
      '1. 读取 `.claude/workflow-state.yaml` 确认当前节点状态',
      '2. 运行 `bash scripts/verify.sh` 验证文件完整性',
      `3. ${resumeHint}`,
      '4. 如有 PROGRESS.md，读取 `docs/PROGRESS.md` 了解实时任务状态',
      '',
    ].join('\n');
    writeFileSync(checkpointFile, checkpointContent);
    process.stdout.write(`[session-sync] ✅ 已自动写入 checkpoint: docs/handoff/${dateStr}-auto-checkpoint.md\n`);
  } catch (e) {
    process.stderr.write(`[session-sync] ⚠️  Checkpoint 写入失败: ${e.message?.slice(0, 80)}\n`);
  }
}

const episodicDir = join(projectRoot, 'memory', 'episodic');
if (existsSync(episodicDir)) {
  process.stdout.write(
    `[session-sync] 💡 记录本次 session:\n` +
    `  python3 memory/scripts/append_episode.py --topic "${topic}" --summary "..." --skills "..." --outcomes "..." --decision "..." --next-risk "..."\n`
  );
  process.stdout.write(
    `[session-sync] 🧠 如有多 Agent 编排，提取 skill-rule 模式（满足任一：non-obvious blocker / 重复风险 / 未记录约束）：\n` +
    `  python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "<skill>: <规则>" --confidence high --evidence "<来源>" --scope "<skill>" --reviewer "<reviewer>" --tags "<skill>,rule"\n`
  );
}

// Write pending-extraction.md so next session is reminded to extract skill rules.
// Keep this outside docs/handoff; it is a governance reminder, not an upstream handoff summary.
const observabilityDir = join(projectRoot, '.claude', 'observability');
const pendingExtractionFile = join(observabilityDir, 'pending-extraction.md');
try {
  // Idempotent: only write if no unprocessed reminder exists. A pending reminder
  // that hasn't been handled should NOT be re-timestamped every session; once it
  // is processed and deleted, the next session recreates it.
  if (existsSync(pendingExtractionFile)) {
    process.stdout.write(`[session-sync] 📝 pending-extraction.md 已存在（待处理），保持不变\n`);
  } else {
    mkdirSync(observabilityDir, { recursive: true });
    const extractionContent = [
      `# Pending Skill-Rule Extraction`,
      ``,
      `> 自动生成于 ${now}。下次 session 启动时由 session-restore 提醒处理。`,
      `> 处理后请删除此文件，或执行提取命令后手动删除。`,
      ``,
      `**Topic:** ${topic}`,
      `**Skills run:** 未读取 run-log；如需复盘，请通过 observability 短规则或 memory search 定向检索。`,
      ``,
      `## 提取模板`,
      ``,
      `满足任一条件时填写并执行：`,
      `- 发现 non-obvious blocker（不在 CLAUDE.md 中的约束）`,
      `- 某类错误在本次或跨 session 重复出现`,
      `- 执行时发现文件、路径、格式等隐性规则`,
      ``,
      `\`\`\`bash`,
      `python3 memory/scripts/propose_semantic.py \\`,
      `  --domain skill-rule \\`,
      `  --fact "<skill名>: <规则描述>" \\`,
      `  --confidence high \\`,
      `  --evidence "<来源/复现>" \\`,
      `  --scope "<skill名>" \\`,
      `  --reviewer "<reviewer>" \\`,
      `  --tags "<skill名>,rule"`,
      `\`\`\``,
      ``,
      `## 完成后`,
      ``,
      `\`\`\`bash`,
      `rm .claude/observability/pending-extraction.md`,
      `\`\`\``,
      ``,
    ].join('\n');
    writeFileSync(pendingExtractionFile, extractionContent);
    process.stdout.write(`[session-sync] 📝 已写入 .claude/observability/pending-extraction.md（下次 session 启动时提醒提取 skill-rule）\n`);
  }
} catch (e) {
  process.stderr.write(`[session-sync] ⚠️  pending-extraction.md 写入失败: ${e.message?.slice(0, 60)}\n`);
}
