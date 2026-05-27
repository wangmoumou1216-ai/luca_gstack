#!/usr/bin/env node
// Session 启动时：检测中断节点，加载 PROGRESS.md，加载记忆摘要
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync, unlinkSync, lstatSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');

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
    const firstLine = content.split('\n').find(l => l.startsWith('**Skills run:**'));
    const hint = firstLine ? ` (${firstLine.replace('**Skills run:**', '').trim()})` : '';
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
