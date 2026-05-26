#!/usr/bin/env node
// UserPromptSubmit hook: project context gate + route hints + checkpoint reminder
import {
  existsSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const projectRoot = process.cwd();
const dryRun = process.env.ROUTE_GUARD_DRY_RUN === '1' || process.argv.includes('--dry-run');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function parsePrompt() {
  try {
    const raw = readFileSync('/dev/stdin', { encoding: 'utf8', flag: 'r' });
    try {
      const data = JSON.parse(raw || '{}');
      return String(data.prompt || data.message || '');
    } catch {
      process.stderr.write(`[route-guard] ⚠️  stdin JSON 解析失败（内容前20字: ${raw.slice(0, 20)}），路由跳过。\n`);
    }
  } catch {
    // stdin unavailable in some non-interactive runs.
  }
  return '';
}

function loadRoutes(yamlPath) {
  let content;
  try {
    content = readFileSync(yamlPath, 'utf-8');
  } catch {
    return [];
  }
  const routes = [];
  let currentSection = null;
  let currentEntry = null;

  for (const line of content.split('\n')) {
    if (line.startsWith('project_skills:')) {
      currentSection = 'project';
      continue;
    }
    if (line.startsWith('builtin_skills:')) {
      currentSection = 'builtin';
      continue;
    }
    if (line.startsWith('project_context:')) {
      currentSection = 'context';
      continue;
    }
    if (!currentSection || currentSection === 'context') continue;

    const skillMatch = line.match(/^  (\w[\w_]+):(\s*)$/);
    if (skillMatch) {
      if (currentEntry?.triggers?.length) routes.push(currentEntry);
      currentEntry = { type: currentSection, invoke: '', hint: '', triggers: [], w: 7 };
      continue;
    }
    if (!currentEntry) continue;

    const invokeM = line.match(/^\s+invoke:\s+"?([^"#\n]+?)"?\s*$/);
    const skillM = line.match(/^\s+skill:\s+"?([^"#\n]+?)"?\s*$/);
    const hintM = line.match(/^\s+hint:\s+"(.+?)"\s*$/);
    const weightM = line.match(/^\s+weight:\s+(\d+)/);
    const triggersM = line.match(/^\s+triggers:\s+\[(.+)\]/);

    if (invokeM) currentEntry.invoke = invokeM[1].trim();
    if (skillM && !currentEntry.invoke) currentEntry.invoke = skillM[1].trim();
    if (hintM) currentEntry.hint = hintM[1];
    if (weightM) currentEntry.w = parseInt(weightM[1], 10);
    if (triggersM) {
      currentEntry.triggers = triggersM[1]
        .split(',')
        .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
  }
  if (currentEntry?.triggers?.length) routes.push(currentEntry);
  return routes;
}

function envList(name) {
  return String(process.env[name] || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function listProjects() {
  const fromEnv = envList('ROUTE_GUARD_PROJECTS');
  if (fromEnv.length) return fromEnv;
  const projectsRoot = join(homedir(), 'Desktop', '项目');
  try {
    return readdirSync(projectsRoot)
      .filter(name => {
        try {
          return statSync(join(projectsRoot, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  } catch {
    return [];
  }
}

function readCurrentProject(projects) {
  if (process.env.ROUTE_GUARD_CURRENT_PROJECT) return process.env.ROUTE_GUARD_CURRENT_PROJECT;
  try {
    const docsPath = join(projectRoot, 'docs');
    const target = readlinkSync(docsPath);
    const marker = 'Desktop/项目/';
    const idx = target.indexOf(marker);
    if (idx >= 0) return target.slice(idx + marker.length).replace(/\/docs$/, '');
    const match = projects.find(name => target.endsWith(`/${name}/docs`));
    return match || '';
  } catch {
    return '';
  }
}

function projectGate(prompt, projects, currentProject) {
  const text = normalize(prompt);
  if (!text) return null;
  if (/当前项目|这个项目|本项目/.test(prompt)) return null;

  const named = projects.find(name => text.includes(normalize(name)));
  if (named && normalize(named) !== normalize(currentProject)) {
    return {
      decision: 'PROJECT_SWITCH',
      projectAction: 'switch_existing_project',
      project: named,
      message: `切换到 ${named} 后再继续路由。`,
    };
  }

  if (/老项目|已有项目|已有的项目|旧项目|继续项目|上次那个项目|接着上次|上次的项目|之前那个项目|之前的项目|之前那个/.test(prompt) && !named) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'select_existing_project',
      projects,
      message: '你说的是老项目，请先指定要继续哪个项目。',
    };
  }

  if (/我想做一个需求|我想做个需求|做一个需求|做个需求|我想做一个项目|我想做个项目/.test(prompt)) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'clarify_project_scope',
      currentProject: currentProject || '',
      projects,
      message: '请先确认这是新项目、当前项目里的需求，还是继续老项目。',
    };
  }

  if (/我想做一个.+|我想做个.+|我要做一个.+|我要做个.+/.test(prompt)) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'confirm_new_project',
      currentProject: currentProject || '',
      projects,
      message: '这是新项目或当前项目里的新需求，请先确认项目归属。',
    };
  }

  if (!currentProject && prompt.length > 5 && !prompt.endsWith('?') && !prompt.endsWith('？')) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'choose_new_or_existing',
      projects,
      message: '当前没有激活项目，请先确认新项目还是继续老项目。',
    };
  }

  return null;
}

function complexityDecision(prompt) {
  const text = normalize(prompt);
  const signals = [
    {
      name: '多模块',
      weight: 3,
      test: t => {
        const sys = ['obsidian', 'figma', 'lark', '飞书', 'mac', '数据库', 'api', 'memory', '知识库', '定时', 'scheduler', '推送系统'];
        return sys.filter(s => t.includes(normalize(s))).length >= 2;
      },
    },
    { name: '规划意图', weight: 3, regex: /整体规划|整体设计|整体方案|全链路|端到端|系统设计|做个规划|规划一下|大框架|架构设计/ },
    { name: '多需求并列', weight: 2, regex: /第一.*第二|首先.*其次|一方面.*另一方面|(?:功能|模块|系统).{1,20}(?:功能|模块|系统)/ },
    { name: '跨系统集成', weight: 3, regex: /定时.*推送|记录.*学习|学习路径|知识图谱|跨.*聚合|个性化.*推荐|每日.*定时/ },
    { name: '显式复杂', weight: 4, regex: /负责的功能|复杂的需求|复杂功能|plan\s*agent|task编排|多个skill|skill.*组合|这是一个复杂/ },
    { name: '长输入', weight: 0, test: t => t.length > 400 },
  ];
  let complexityScore = 0;
  const firedSignals = [];
  for (const signal of signals) {
    const hit = signal.regex ? signal.regex.test(prompt) : signal.test(text);
    if (hit) {
      complexityScore += signal.weight;
      firedSignals.push(signal.name);
    }
  }
  if (complexityScore >= 6) {
    return { decision: 'PLAN_MODE', complexityScore, signals: firedSignals };
  }
  return { complexityScore, signals: firedSignals };
}

function skillDecision(prompt) {
  const direct = prompt.match(/^\/[a-z][\w-]*/i)?.[0];
  if (direct) return { decision: 'SINGLE_SKILL', skill: direct, candidates: [direct] };

  const routes = loadRoutes(join(projectRoot, '.claude/skill-os/skill-routing-map.yaml'));
  const text = normalize(prompt);

  // ADR-0002 stopgap: longest-match-wins disambiguation (CJK-safe; no \b).
  // Collect, per matched route, the exact normalized triggers that matched.
  let matched = routes
    .map(route => ({ route, matchedTriggers: route.triggers.map(normalize).filter(t => t && text.includes(t)) }))
    .filter(entry => entry.matchedTriggers.length);

  // If a shorter matched trigger is a substring of a longer matched trigger
  // from a DIFFERENT, STRICTLY HIGHER-WEIGHT route that also matched, the
  // shorter one is shadowed (e.g. 调研[w6]⊂设计调研[w7]). Drop shadowed
  // triggers; drop the route entirely if none survive. Generic — no
  // hand-maintained blacklist.
  // The strict weight guard (other.route.w > entry.route.w) is a safety net:
  // never silently drop an equal/higher-weight candidate, else a safe
  // ambiguity (tie → MULTI/STOP) collapses into a confident WRONG route.
  // E.g. 多维表格[lark_base w9] ⊂ 飞书多维表格[lark_sheets w9] are a tie and
  // must stay → STOP, not silently resolve to lark_sheets.
  // Known limitation: English substring-in-word (research⊂research-proof)
  // is NOT fixed here — normalize() strips spaces so \b is unreliable for
  // multi-word English; deferred to ADR-0005 description-based routing.
  const allMatched = matched.flatMap(e => e.matchedTriggers.map(t => ({ t, route: e.route })));
  matched = matched
    .map(entry => {
      const surviving = entry.matchedTriggers.filter(t =>
        !allMatched.some(other =>
          other.route !== entry.route && other.t.length > t.length && other.t.includes(t)
          && other.route.w > entry.route.w));
      return { ...entry, matchedTriggers: surviving };
    })
    .filter(entry => entry.matchedTriggers.length);

  const hits = matched.map(entry => entry.route).sort((a, b) => b.w - a.w);

  if (!hits.length) {
    const looksLikeTask = prompt.length > 5
      && !prompt.match(/^(你好|hi\b|hello\b|谢谢[你您]?[！!。]?$|好的[！!。]?$|ok[！!。]?$|是的[！!。]?$|明白[了]?[！!。]?$|没问题[！!。]?$)/i)
      && !prompt.endsWith('?') && !prompt.endsWith('？');
    return looksLikeTask
      ? { decision: 'STOP', reason: 'no_keyword_match' }
      : { decision: 'NONE' };
  }

  const topWeight = hits[0].w;
  const candidates = hits.filter(hit => hit.w >= topWeight - 1);
  const unique = [...new Map(candidates.map(hit => [hit.invoke || hit.hint, hit])).values()];

  if (unique.length === 1) {
    return {
      decision: 'SINGLE_SKILL',
      skill: unique[0].invoke || unique[0].hint,
      routeType: unique[0].type,
      candidates: [unique[0].invoke || unique[0].hint],
    };
  }

  return {
    decision: 'MULTI_SKILL',
    candidates: unique.map(hit => hit.invoke || hit.hint),
    routes: unique.map(hit => ({ type: hit.type, skill: hit.invoke || hit.hint })),
  };
}

// Skills that always require Plan Agent check regardless of keyword complexity score.
// These skills spawn ≥2 subagents and have multi-phase dependencies by design.
const HEAVY_ORCHESTRATOR_SKILLS = new Set([
  '/deepresearch', 'deepresearch',
  '/ux-research', 'ux-research',
  '/auto', 'auto',
  '/figma-demo', 'figma-demo',
]);

function buildDecision(prompt) {
  const projects = listProjects();
  const currentProject = readCurrentProject(projects);
  const gate = projectGate(prompt, projects, currentProject);
  if (gate) return gate;

  const complexity = complexityDecision(prompt);
  if (complexity.decision === 'PLAN_MODE') return complexity;

  const skillResult = skillDecision(prompt);
  if (
    skillResult.decision === 'SINGLE_SKILL' &&
    HEAVY_ORCHESTRATOR_SKILLS.has(skillResult.skill)
  ) {
    return {
      ...skillResult,
      decision: 'PLAN_CHECK',
      complexityScore: complexity.complexityScore,
      signals: complexity.signals,
    };
  }

  return { ...skillResult, complexityScore: complexity.complexityScore, signals: complexity.signals };
}

function decisionToHints(decision) {
  switch (decision.decision) {
    case 'PROJECT_STOP':
      return [`[route-guard] 🧭 PROJECT GATE — ${decision.message}`];
    case 'PROJECT_SWITCH':
      return [`[route-guard] 🧭 PROJECT GATE — ${decision.message}\n确认后执行：./scripts/project.sh switch "${decision.project}"`];
    case 'PLAN_MODE':
      return [
        `[route-guard] 🧠 PLAN MODE — 检测到复杂任务信号（${decision.signals.join('、')}，总分 ${decision.complexityScore}）\n` +
        '禁止直接路由到单个 skill。必须先读取 .claude/agents/plan-agent.md，输出 Phase 分解计划。\n' +
        '等用户确认计划后，再进入 Orchestrator 模式执行。',
      ];
    case 'PLAN_CHECK': {
      const prefix = decision.routeType === 'builtin' ? '内置 skill: ' : '项目 skill: ';
      return [
        `[route-guard] ⚠️ PLAN CHECK — 高置信命中${prefix}${decision.skill}，但该 skill 是重型编排器（多 subagent + 多阶段）。\n` +
        '执行前必须检查 Plan Agent 4条件（≥2 subagent / phase deps / ≥3文件 / 不可逆操作）。\n' +
        '满足任一 → 先读 .claude/agents/plan-agent.md，输出 Phase 计划，等用户确认后再执行。',
      ];
    }
    case 'SINGLE_SKILL': {
      const prefix = decision.routeType === 'builtin' ? '内置 skill: ' : '项目 skill: ';
      return [`[route-guard] ✅ 高置信命中 → 建议调用${prefix}${decision.skill}`];
    }
    case 'MULTI_SKILL':
      return [
        '[route-guard] ❓ STOP — 路由置信度低（多个候选权重相近，无法自动决策）。\n' +
        '你必须在执行任何操作前，先主动询问用户选择哪个 skill，禁止自行判断。\n' +
        `候选列表（供用户选择）：${decision.candidates.join(', ')}`,
      ];
    case 'STOP':
      return [
        '[route-guard] ❓ STOP — 路由置信度低（无关键词命中）。\n' +
        '你必须在执行任何操作前，先主动询问用户想用哪个 skill。\n' +
        '参考选项：/auto（自动识别全流程）、/office（查看所有 skill）、或请用户补充描述。\n' +
        '禁止在未询问的情况下自行判断并执行。',
      ];
    default:
      return [];
  }
}

const prompt = parsePrompt();
const hints = [];

const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');
if (existsSync(stateFile) && !dryRun) {
  const content = readFileSync(stateFile, 'utf8');
  const match = content.match(/^  (\w[\w-]+):\s*\n\s+status:\s*IN_PROGRESS/m);
  if (match) hints.push(`[route-guard] ⚠️  当前有未完成节点: ${match[1]}`);
}

if (prompt) {
  const decision = buildDecision(prompt);
  if (dryRun) {
    process.stdout.write(JSON.stringify(decision, null, 2) + '\n');
    process.exit(0);
  }
  hints.push(...decisionToHints(decision));
}

if (!dryRun) {
  const counterFile = join(projectRoot, '.claude', '.session-turn-count');
  let turns = 0;
  try {
    turns = parseInt(readFileSync(counterFile, 'utf8').trim()) || 0;
  } catch {}
  turns++;
  try {
    writeFileSync(counterFile, String(turns));
  } catch {}
  if (turns === 20 || turns === 30 || (turns > 30 && turns % 10 === 0)) {
    hints.push(`[route-guard] 📋 Checkpoint 提醒：已进行 ${turns} 轮对话，建议执行 /compact 或写入 Checkpoint。`);
  }
}

if (hints.length > 0) process.stdout.write(hints.join('\n') + '\n');
