#!/usr/bin/env node
// UserPromptSubmit hook: project context gate + route hints + checkpoint reminder
import {
  existsSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// cwd 漂移时 hook 内部路径会整体失效（实测 /tmp 日志 196 次 Cannot find module），优先用 Claude Code 注入的项目根
const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dryRun = process.env.ROUTE_GUARD_DRY_RUN === '1' || process.argv.includes('--dry-run');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

// 并发隔离（G2，2026-07-04）：UserPromptSubmit stdin 公共字段 session_id，供轮次计数
// per-session 隔离。sanitize 表达式与 session-sync.mjs / post-edit.mjs 逐字一致。
let hookSessionId = '';
function parsePrompt() {
  try {
    const raw = readFileSync(0, 'utf8'); // fd 0 直读：比 '/dev/stdin' 在 CI/管道下更可移植
    try {
      const data = JSON.parse(raw || '{}');
      hookSessionId = String(data.session_id || '').replace(/[^\w-]/g, '').slice(0, 32);
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

    const skillMatch = line.match(/^  ([\w-]+):(\s*)$/);
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
  // 显式设置（含空串="无激活项目"）即生效——空串回退真实 symlink 会让 dry-run 测试
  // 依赖宿主机的项目状态（G3 修复测试时发现）。
  if (process.env.ROUTE_GUARD_CURRENT_PROJECT !== undefined) return process.env.ROUTE_GUARD_CURRENT_PROJECT;
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

// 对话延续/状态询问豁免（G3，2026-07-04）：整句就是"继续/停/问进度"类 check-in 时不注入
// 路由提示——此前 >5 字、非?结尾的陈述句一律 STOP/PROJECT_STOP，实测几乎每条对话性消息
// 都吃一段噪音注入。双闸防误豁免：① 整句锚定（前缀限 都/全部/现在，尾部限语气助词）
// ② 长度 ≤10。「继续做个原型」含实义任务词、锚定失败 → 照常路由；「继续项目」被上游
// 老项目正则先捕获 → 仍走 Project Gate。
const CONTINUATION_RE = /^\s*(?:都|全部|现在)?(?:继续|接着来|接着做|然后呢|下一步|往下走|好了吗|行了吗|怎么样|进度如何|到哪(?:一步)?了|卡住了|卡在哪|完成了吗|做完了吗|还在跑吗|等一下|先停|暂停|停一下|不用了|就这样|可以了|收到)(?:一下)?[吧呢吗呀了的！!。.？?…\s]*$/;
function isContinuation(prompt) {
  return prompt.length <= 10 && CONTINUATION_RE.test(prompt.trim());
}

function projectGate(prompt, projects, currentProject) {
  const text = normalize(prompt);
  if (!text) return null;
  if (/当前项目|这个项目|本项目/.test(prompt)) return null;
  // 寒暄/确认类非任务输入不进项目门禁（与 skill 路由层 looksLikeTask 同口径；红队 C7 实测漏网）
  if (/^\s*(你好|hi\b|hello\b|谢谢[你您]?[！!。]?$|好的[！!。]?$|ok[！!。]?$|是的[！!。]?$|明白[了]?[！!。]?$|没问题[！!。]?$)/i.test(prompt)) {
    return null;
  }
  // New-project signals must not be misread as switching to an existing
  // project whose name is a substring (e.g. "项目" ⊂ "新项目"). Strip the
  // trigger words before matching existing project names.
  const newProjectTriggers = ['新项目', '新需求', '新功能'];
  const hasNewProjectSignal = newProjectTriggers.some(t => text.includes(normalize(t)));
  let searchText = text;
  for (const t of newProjectTriggers) searchText = searchText.split(normalize(t)).join('');

  const named = projects.find(name => {
    const normalizedName = normalize(name);
    const idx = searchText.indexOf(normalizedName);
    if (idx === -1) return false;
    const charAfter = searchText[idx + normalizedName.length];
    // Only English identifier-continuation chars count as "not a boundary".
    // CJK chars after the name (e.g. "luca-dev 的任务") ARE a boundary, so
    // common follow-up particles do not break the match.
    const afterOk = charAfter === undefined || !/[a-z0-9_-]/i.test(charAfter);
    // Short names (≤2 chars) keep the stricter CJK-also-extends check on both
    // sides to avoid false positives like 名"AI"误中"AIxxx".
    if (normalizedName.length <= 2) {
      const charBefore = idx > 0 ? searchText[idx - 1] : undefined;
      const beforeOk = charBefore === undefined || !/[一-鿿a-z0-9]/i.test(charBefore);
      const strictAfterOk = charAfter === undefined || !/[一-鿿a-z0-9]/i.test(charAfter);
      return strictAfterOk && beforeOk;
    }
    return afterOk;
  });

  // Audit C2: meta/audit/help questions are framework-level, not project work.
  // Skip Project Gate so they route via the normal skill/STOP path instead of
  // forcing "新项目还是继续老项目" on what is clearly a question about the system.
  // Guarded by !named: an audit-verb query that NAMES an existing project must
  // still gate (handled by the named-switch below), not be exempted here
  // (红线 SC-20260523-002; fixes C2 shadowing a genuine project switch).
  if (!named && /^\s*(评估|审计|查看|看看|为什么|是什么|什么是|解释|说明|讲一下|讲讲|你能|你会|能不能告诉|帮我看看|帮我看一下|帮我解释|给我解释|帮我讲)/.test(prompt)) {
    return null;
  }
  // Audit M2: content-tool skills are standalone-capable — they don't need a
  // project context (e.g. /idea ingesting meeting notes, /compare diffing two
  // files, agent-browser/web-access fetching URLs). Let them route via
  // skillDecision; don't short-circuit them through the project gate.
  if (/会议纪要|会议语料|语音稿|语音转文字|转文字稿|原始语料|讨论记录|语料转需求|整理这段记录|梳理这段记录|对比|比较一下|版本对比|两个方案比较|看看区别|哪个好|截图|浏览网站|访问网页|浏览器操作|爬取|抓取|翻译/.test(prompt)) {
    return null;
  }
  // Audit M3: framework self-maintenance code-hygiene (清理/体检 luca 自身
  // .mjs/.py/hooks/scripts) is a Meta task on luca_gstack itself, not project
  // work. Exempt from Project Gate ONLY when a code-hygiene trigger CO-OCCURS
  // with a framework path/artifact — so downstream-project cleanup (which DOES
  // want a project) is not over-exempted. Lets /code-hygiene surface via skill
  // routing for genuine self-maintenance with no active project.
  if (/清理|死代码|代码体检|工程体检|cleanup|完成前验证|code-hygiene|代码去重|弱类型|代码质量/.test(prompt) &&
      /\.claude\/hooks|memory\/scripts|scripts\/|\.mjs|\.py|luca_gstack|路由|hook|框架自/.test(prompt)) {
    return null;
  }

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

  if (!currentProject && (hasNewProjectSignal || /我想做一个.+|我想做个.+|我要做一个.+|我要做个.+/.test(prompt))) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'confirm_new_project',
      currentProject: currentProject || '',
      projects,
      message: '这是新项目或当前项目里的新需求，请先确认项目归属；若是多能力复杂需求，确认后先读 .claude/agents/plan-agent.md 走 Plan Agent，不要直接进单个 skill。',
    };
  }

  // 对话延续豁免（G3）：放在所有具名项目/老项目/新项目专有检查之后——那些必须先赢；
  // 只拦下面这个"一切>5字陈述句都 PROJECT_STOP"的兜底网。
  if (isContinuation(prompt)) return null;

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
        // G3-C3（2026-07-04）：'claude' 从系统词除名——助手自身名字在 meta 提问里高频出现，
        // 与任一其他系统词共现即误发多模块(w3)，把闲聊/咨询误升级 PLAN_MODE。
        const sys = ['obsidian', 'figma', 'lark', '飞书', 'mac', '桌面', 'desktop', '卡片', '数据库', 'api', 'memory', '知识库', '定时', '调度', 'scheduler', '推送'];
        return sys.filter(s => t.includes(normalize(s))).length >= 2;
      },
    },
    { name: '规划意图', weight: 3, regex: /整体规划|整体设计|整体方案|全链路|端到端|系统设计|做个规划|规划一下|大框架|架构设计/ },
    { name: '多需求并列', weight: 2, regex: /第一.*第二|首先.*其次|一方面.*另一方面|(?:功能|模块|系统).{1,20}(?:功能|模块|系统)/ },
    { name: '跨系统集成', weight: 3, regex: /定时.*推送|记录.*学习|学习路径|知识图谱|跨.*聚合|个性化.*推荐|每日.*定时|每天.{0,4}[个张次]|一天.{0,4}[个张次]|设置.{0,8}时间|定时.{0,6}(吐|推|发|提醒|生成)/ },
    { name: '显式复杂', weight: 4, regex: /负责的功能|复杂的需求|复杂功能|plan\s*agent|task编排|多个skill|skill.*组合|这是一个复杂/ },
    // Audit C3: explicit user plan request — plan-agent.md:38 lists this as
    // the 5th trigger condition. Standalone weight 6 puts it past the PLAN_MODE
    // threshold; uses normalized-text regex (normalize() lowercases).
    { name: '用户明确要求 plan', weight: 6, regex: /先做个计划|先做计划|plan\s*一下|想清楚再做|做个计划再说|做个规划再说/ },
    {
      name: '新项目复杂需求',
      weight: 6,
      test: t => {
        if (!/新项目|新需求|新功能|想做一个|想做个|要做一个|要做个/.test(prompt)) return false;
        const caps = ['然后', '可以', '还能', '并且', '以及', '入口', '形式', '设置', '支持', '吐出', '展示', '唤起', '一天', '每天', '每日', '自动', '定时', '同步', '提醒', '统计', '拖拽',
          // Audit M3: UI/function nouns commonly enumerated in product reqs.
          '登录', '注册', '权限', '头像', '侧边栏', '按钮', '弹窗', '列表', '详情', '表单', '搜索', '筛选', '编辑', '创建', '导出', '导入'];
        const capHits = caps.filter(c => t.includes(normalize(c))).length;
        // Audit M3: capHits >= 4 already is a strong signal — short prompts
        // listing 4+ feature nouns ("新项目登录权限头像侧边栏") are clearly
        // complex regardless of total length. Dropping the length >30 floor.
        return capHits >= 4;
      },
    },
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

function softSkillDecision(prompt, routes) {
  const text = normalize(prompt);
  const promptLower = prompt.toLowerCase();
  const scored = routes.map(route => {
    let score = 0;
    const matchedTokens = [];
    for (const trigger of route.triggers) {
      const t = normalize(trigger);
      // G3-C2（2026-07-04）：纯 latin trigger 不做 3-6 字滑窗子串——那是 'design'⊂'designer'、
      // 'claude'⊂'claude-api' 类误报的根源。改为完整 trigger + 词边界匹配（保留空格的小写原文）；
      // CJK/混合 trigger 维持子串逻辑（中文无词边界，滑窗是刻意设计）。
      if (/^[a-z0-9 ._-]+$/i.test(trigger)) {
        const esc = trigger.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(promptLower)) {
          score += Math.min(t.length, 6);
          matchedTokens.push(trigger.toLowerCase());
        }
        continue;
      }
      let bestLen = 0;
      for (let len = Math.min(t.length, 6); len >= 3; len--) {
        for (let i = 0; i <= t.length - len; i++) {
          const sub = t.slice(i, i + len);
          // 混合 trigger（如'接入Claude'）滑出的纯 latin 碎片（'claude'）与 C2 同病——
          // 纯 ASCII 窗口一律跳过，latin 匹配只走上面的完整 trigger + 词边界路径。
          if (!/[^\x00-\x7f]/.test(sub)) continue;
          if (text.includes(sub)) { bestLen = len; matchedTokens.push(sub); break; }
        }
        if (bestLen) break;
      }
      score += bestLen;
    }
    return { route, score, matchedTokens: [...new Set(matchedTokens)] };
  });
  return scored
    .filter(e => e.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(e => ({ skill: e.route.invoke || e.route.hint, tokens: e.matchedTokens }));
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
      && !prompt.endsWith('?') && !prompt.endsWith('？')
      && !isContinuation(prompt); // G3：整句延续/状态询问不当任务，静默放行
    if (!looksLikeTask) return { decision: 'NONE' };
    const softCandidates = softSkillDecision(prompt, routes);
    return { decision: 'STOP', reason: 'no_keyword_match', softCandidates };
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

// PLAN_CHECK 扩展点：命中此 set 的 SINGLE_SKILL 会被升级为 PLAN_CHECK（外部计划确认门）。
//
// 母版默认【空】（2026-07-04 流程优化 G4，红队裁决后定稿）：原成员 deepresearch/
// ux-research/figma-demo 已全部迁入 plan-agent.md「条件 2 豁免（内部 HITL 编排类）」
// 名单——三者 SKILL.md 各自内含 fan-out 前的用户确认门（ux-research 介入点1 研究规划
// 确认不可跳过；figma-demo Step 2.3 映射确认；deepresearch Step 0.2 深度问询——内门较弱、
// 只问深度不问计划，但该 skill 纯只读无不可逆操作，Plan Agent 其余 4 条件经 CLAUDE.md
// ③ 仍适用，buildDecision 的复杂度硬门也先于本 set 生效，接受这一取舍）。
// 这修正了 2026-07-03 注释"它们无等价内部确认步骤"的说法——那一版把"内容确认"与
// "计划确认"混为一谈；真实差异是内门强弱，不是有无（G4 红队 R4 裁决，正面改写不静默覆盖）。
//
// ⚠️ 本 set + 下方 PLAN_CHECK 分支是 fork/env 扩展点，**勿当死代码清理**（code-hygiene
// 死代码算子注意）：muse fork 的副本在此处有自己的成员（/auto、/muse-loop-orchestrate），
// 依赖分支机制本身；母版测试经 ROUTE_GUARD_HEAVY_SKILLS 注入回归该分支。
// env 格式：ASCII 逗号分隔 skill 名；带不带前导 / 均可——下方初始化自动补全双形态。
const HEAVY_ORCHESTRATOR_SKILLS = new Set(
  envList('ROUTE_GUARD_HEAVY_SKILLS').flatMap(s => {
    const bare = s.replace(/^\//, '');
    return [bare, `/${bare}`];
  })
);

function buildDecision(prompt) {
  const projects = listProjects();
  const currentProject = readCurrentProject(projects);
  const gate = projectGate(prompt, projects, currentProject);
  const complexity = complexityDecision(prompt);

  // The gate short-circuits before skill/complexity routing. Carry the
  // complexity result through so a complex requirement bundled into a
  // new-project / switch message still flags Plan Agent at the gate, instead
  // of being silently downgraded once the project is confirmed.
  if (gate) {
    return {
      ...gate,
      complexityScore: complexity.complexityScore,
      signals: complexity.signals,
      planHint: complexity.complexityScore >= 6,
    };
  }

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
    case 'PROJECT_STOP': {
      const base = `[route-guard] 🧭 PROJECT GATE — ${decision.message}`;
      if (!decision.planHint) return [base];
      return [base + `\n[route-guard] 🧠 复杂度分 ${decision.complexityScore}（${(decision.signals || []).join('、')}）≥6：确认项目后必须先读 .claude/agents/plan-agent.md 走 Plan Agent，禁止直接进单个 skill。`];
    }
    case 'PROJECT_SWITCH': {
      const base = `[route-guard] 🧭 PROJECT GATE — ${decision.message}\n命名即切换（点到已有项目名＝切过去，无需确认）：立即执行 ./scripts/project.sh switch "${decision.project}"`;
      if (!decision.planHint) return [base];
      return [base + `\n[route-guard] 🧠 复杂度分 ${decision.complexityScore}（${(decision.signals || []).join('、')}）≥6：切换后先走 Plan Agent。`];
    }
    case 'PLAN_MODE':
      return [
        `[route-guard] 🧠 PLAN MODE — 检测到复杂任务信号（${decision.signals.join('、')}，总分 ${decision.complexityScore}；关键词近似判定，权威口径以 .claude/agents/plan-agent.md 触发条件表为准）\n` +
        '禁止直接路由到单个 skill。必须先读取 .claude/agents/plan-agent.md，输出 Phase 分解计划。\n' +
        '等用户确认计划后，再进入 Orchestrator 模式执行。',
      ];
    case 'PLAN_CHECK': {
      const prefix = decision.routeType === 'builtin' ? '内置 skill: ' : '项目 skill: ';
      return [
        `[route-guard] ⚠️ PLAN CHECK — 高置信命中${prefix}${decision.skill}，该 skill 被登记为需外部计划确认的重型编排器。\n` +
        '执行前先读 .claude/agents/plan-agent.md 的「触发条件」表（唯一权威口径，本提示不复述），\n' +
        '满足任一条件 → 输出 Phase 计划，等用户确认后再执行。',
      ];
    }
    case 'SINGLE_SKILL': {
      const prefix = decision.routeType === 'builtin' ? '内置 skill: ' : '项目 skill: ';
      return [`[route-guard] ✅ 高置信命中 → 建议调用${prefix}${decision.skill}`];
    }
    case 'MULTI_SKILL':
      return [
        '[route-guard] 🔀 MULTI — 路由命中多个候选（权重相近，无法自动决策）。\n' +
        '你必须在执行任何操作前，先主动询问用户选择哪个 skill，禁止自行判断。\n' +
        `候选列表（供用户选择）：${decision.candidates.join(', ')}`,
      ];
    case 'STOP': {
      const softCandidates = decision.softCandidates || [];
      const candidateHint = softCandidates.length
        ? '\n基于语义推断，最可能的 skill：\n' +
          softCandidates.map((c, i) =>
            `  ${i + 1}. ${c.skill}（参考词：${c.tokens.join('、')}）`
          ).join('\n') +
          '\n向用户展示候选列表，询问确认或请用户补充描述。'
        : '\n参考选项：/auto（自动识别全流程）、/office（查看所有 skill）、或请用户补充描述。\n禁止在未询问的情况下自行判断并执行。';
      return [
        '[route-guard] ❓ STOP — 路由置信度低（无完整关键词命中）。' + candidateHint,
      ];
    }
    default:
      return [];
  }
}

// Close the "inject" half of the learning loop: when a prompt routes to a
// skill, auto-surface that skill's active observability rules (distilled from
// past feedback) so they reach the agent deterministically at routing time,
// instead of depending on the model to remember `get_rules.py`. JS-native parse
// of rules.yaml (no subprocess); scene-agnostic (route-guard does not classify
// scene); silent when a skill has no rules (no empty-channel noise).
function loadRules(rulesPath) {
  let text;
  try {
    text = readFileSync(rulesPath, 'utf8');
  } catch {
    return [];
  }
  return text.split(/^- id:/m).slice(1).map(b => {
    const id = (b.match(/^\s*(\S+)/) || [])[1] || 'R-UNKNOWN';
    const status = (b.match(/^\s+status:\s*(\S+)/m) || [])[1] || 'active';
    const severity = (b.match(/^\s+severity:\s*(\S+)/m) || [])[1] || 'medium';
    const skillsRaw = (b.match(/^\s+skills:\s*\[([^\]]*)\]/m) || [])[1] || '';
    const skills = skillsRaw
      .split(',')
      .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    const rule = ((b.match(/^\s+rule:\s*(.+?)\s*$/m) || [])[1] || '').replace(/^["']|["']$/g, '');
    return { id, status, severity, skills, rule };
  });
}

function ruleApplies(rule, skill) {
  if ((rule.status || 'active') !== 'active') return false;
  const skills = rule.skills || [];
  if (skill !== '*' && skills.length && !skills.includes('*') && !skills.includes(skill)) return false;
  return true;
}

function matchedSkills(decision) {
  if (!decision) return [];
  if (decision.decision === 'SINGLE_SKILL' || decision.decision === 'PLAN_CHECK') {
    return decision.skill ? [decision.skill] : [];
  }
  return [];
}

function ruleHintsForSkills(skills) {
  const all = loadRules(join(projectRoot, '.claude', 'observability', 'rules.yaml'));
  if (!all.length) return [];
  const seen = new Set();
  const out = [];
  for (const raw of skills) {
    const skill = String(raw || '').replace(/^\//, '').trim();
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    const matches = all.filter(r => ruleApplies(r, skill));
    if (!matches.length) continue;
    out.push(
      `[route-guard] 📏 ${skill} 活跃规则(${matches.length})（学习闭环自动注入，执行时必须遵守）：\n` +
      matches.slice(0, 20).map(r => `  - ${r.id} [${r.severity}]: ${r.rule}`).join('\n')
    );
  }
  return out;
}

const prompt = parsePrompt();
const hints = [];

const stateFile = join(projectRoot, '.claude', 'workflow-state.yaml');
if (existsSync(stateFile) && !dryRun) {
  try {
    const content = readFileSync(stateFile, 'utf8');
    const match = content.match(/^  (\w[\w-]+):\s*\n\s+status:\s*IN_PROGRESS/m);
    if (match) hints.push(`[route-guard] ⚠️  当前有未完成节点: ${match[1]}`);
  } catch {}
}

let decision = null; // 提升到外层：pin 层（另一 if 块）需读它判定"命名即切换自切"
if (prompt) {
  decision = buildDecision(prompt);
  if (dryRun) {
    process.stdout.write(JSON.stringify(decision, null, 2) + '\n');
    process.exit(0);
  }
  hints.push(...decisionToHints(decision));
  hints.push(...ruleHintsForSkills(matchedSkills(decision)));
}

if (!dryRun && prompt) {
  // 并发隔离（G2）：有 sid 时轮次计数 per-session；无 sid（测试/管道）回退共享旧文件名
  const counterFile = join(projectRoot, '.claude',
    hookSessionId ? `.session-turn-count-${hookSessionId}` : '.session-turn-count');
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

  // ── 会话粘性 pin 层（G6-R2/R7，2026-07-04；命名即切换扩展 2026-07-06）──
  // session-restore 会保留并行 session 的激活项目 → 新 session 可能"继承"一个自己从未确认过的
  // 项目。pin 记录本 session 认过的项目，用于三件事：
  //  (a) 继承检测：首轮消息时 docs 有链但本 sid 无 pin = 继承态 → 一次性提示（防静默写错项目）
  //  (b) 漂移对账：docs 链被别的 session switch 走后与本 sid pin 不符 → 提示（携带计数收敛）
  //  (c) 命名即切换自切：本轮 route-guard 判定要切到具名项目（PROJECT_SWITCH）时，switch 由主
  //      Agent 在本轮之后执行、docs 链此刻仍是旧项目——故不做 cur 比对，直接把 pin 记成目标项目
  //      并跳过漂移对账，避免"自己主动切"下一轮被 (b) 误报成"被并行 session 切走"。并行 session
  //      不受影响（它本轮没发 PROJECT_SWITCH，照常走 (b) 告警）。
  if (hookSessionId) {
    try {
      const pinFile = join(projectRoot, '.claude', `.session-project-${hookSessionId}`);
      const selfSwitchTo = (decision && decision.decision === 'PROJECT_SWITCH' && decision.project) ? decision.project : null;
      if (selfSwitchTo) {
        try { writeFileSync(pinFile, selfSwitchTo); } catch {}
        try { unlinkSync(join(projectRoot, '.claude', `.session-inherited-${hookSessionId}`)); } catch {} // 自切即认领，继承态清除
        try { unlinkSync(join(projectRoot, '.claude', `.session-projnag-${hookSessionId}`)); } catch {} // 清可能残留的漂移计数
      } else {
        const projects = listProjects();
        const cur = readCurrentProject(projects); // docs 链当前指向
        let pin = null;
        try { pin = readFileSync(pinFile, 'utf8').trim() || null; } catch {}

        const inheritFile = join(projectRoot, '.claude', `.session-inherited-${hookSessionId}`);
        const inherited = existsSync(inheritFile); // session-restore 只在真保留态（活跃并行）写此标记
        if (cur && !pin) {
          // 区分"真继承"（有 session-restore 写的标记）vs"self-switch"（本 session 自己 switch，无标记）
          // ——只对真继承提示，避免单 session 正常流程 Msg2 的假阳性 + 多余确认（终验独立核验实证）。
          // 无论哪种都写 pin。
          if (inherited) {
            hints.push(`[route-guard] 🔗 本 session 当前激活项目「${cur}」（并行 session 保留）。命名即切换已生效：你一提别的项目名我就自动切过去，无需手动 switch。`);
            try { unlinkSync(inheritFile); } catch {} // 一次性，读后删
          }
          try { writeFileSync(pinFile, cur); } catch {}
        } else if (cur && pin && cur !== pin) {
          // 漂移：本 session 认过 pin，但 docs 被别的 session 切走了 → 提示 N 次后自愈收敛（R7-①）
          const nagFile = join(projectRoot, '.claude', `.session-projnag-${hookSessionId}`);
          let nag = 0;
          try { nag = parseInt(readFileSync(nagFile, 'utf8').trim()) || 0; } catch {}
          if (nag < 3) {
            hints.push(`[route-guard] ⚠️ 本 session 原在项目「${pin}」，当前激活已被切到「${cur}」（第 ${nag + 1}/3 次提醒）。如非预期请 switch 回「${pin}」。`);
            try { writeFileSync(nagFile, String(nag + 1)); } catch {}
          } else {
            // 收敛：连续提醒 3 次未纠正 → 接受新值为本 session pin，停止刷屏
            try { writeFileSync(pinFile, cur); unlinkSync(nagFile); } catch {}
          }
        } else if (cur && pin && cur === pin) {
          // 一致：刷新 pin mtime（供 SessionEnd/GC 判活）
          try { writeFileSync(pinFile, cur); } catch {}
        }
      }
    } catch {}
  }
}

if (hints.length > 0) process.stdout.write(hints.join('\n') + '\n');
