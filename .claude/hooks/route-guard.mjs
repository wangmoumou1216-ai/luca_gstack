#!/usr/bin/env node
// UserPromptSubmit hook: project context gate + route hints + checkpoint reminder
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readlinkSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import {
  PROJECTS_ROOT,
  beginProjectTurn,
  cancelProjectSwitch,
  closeProjectTurn,
  closeSwitchTurn,
  prepareProjectSwitch,
  projectNameFromLink,
  readProjectState,
  validateProjectName,
  validatedBindingForState,
} from './lib/project-substrate.mjs';

// cwd 漂移时 hook 内部路径会整体失效（实测 /tmp 日志 196 次 Cannot find module），优先用 Claude Code 注入的项目根
const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dryRun = process.env.ROUTE_GUARD_DRY_RUN === '1' || process.argv.includes('--dry-run');
let runtimeCurrentProject = '';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

// 项目名词边界匹配（2026-07-14 P5 修复）：projectGate 具名匹配与 pin 层 affirmsCur 共用同一套
// 严谨度——此前 affirmsCur 用裸 includes()，"amusement" 会误绑 pin=muse（实证）。参数为已
// normalize 的文本；边界规则与原 projectGate 逐字一致（长名只查后界 latin 延续，短名 ≤2 双侧严查）。
function nameMatchesIn(text, name) {
  const normalizedName = normalize(name);
  const idx = text.indexOf(normalizedName);
  if (idx === -1) return false;
  const charAfter = text[idx + normalizedName.length];
  // Only English identifier-continuation chars count as "not a boundary".
  // CJK chars after the name (e.g. "luca-dev 的任务") ARE a boundary, so
  // common follow-up particles do not break the match.
  const afterOk = charAfter === undefined || !/[a-z0-9_-]/i.test(charAfter);
  // Short names (≤2 chars) keep the stricter CJK-also-extends check on both
  // sides to avoid false positives like 名"AI"误中"AIxxx".
  if (normalizedName.length <= 2) {
    const charBefore = idx > 0 ? text[idx - 1] : undefined;
    const beforeOk = charBefore === undefined || !/[一-鿿a-z0-9]/i.test(charBefore);
    const strictAfterOk = charAfter === undefined || !/[一-鿿a-z0-9]/i.test(charAfter);
    return strictAfterOk && beforeOk;
  }
  return afterOk;
}

// 并发隔离（G2，2026-07-04）：UserPromptSubmit stdin 公共字段 session_id，供轮次计数
// per-session 隔离。sanitize 表达式与 session-sync.mjs / post-edit.mjs 逐字一致。
let hookSessionId = '';
let hookPayload = {};
let hookTurnId = '';
function parsePrompt() {
  try {
    const raw = readFileSync(0, 'utf8'); // fd 0 直读：比 '/dev/stdin' 在 CI/管道下更可移植
    try {
      const data = JSON.parse(raw || '{}');
      hookPayload = data;
      hookSessionId = String(data.session_id || '').replace(/[^\w-]/g, '').slice(0, 36);
      hookTurnId = String(data.turn_id || data.user_message_id || randomUUID());
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
    if (line.startsWith('framework_flows:')) {
      currentSection = 'framework_flow';
      continue;
    }
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
      currentEntry = { type: currentSection, invoke: '', hint: '', scope: 'any', triggers: [], w: 7 };
      continue;
    }
    if (!currentEntry) continue;

    const invokeM = line.match(/^\s+invoke:\s+"?([^"#\n]+?)"?\s*$/);
    const skillM = line.match(/^\s+skill:\s+"?([^"#\n]+?)"?\s*$/);
    const hintM = line.match(/^\s+hint:\s+"(.+?)"\s*$/);
    const scopeM = line.match(/^\s+scope:\s+"?([^"#\n]+?)"?\s*$/);
    const weightM = line.match(/^\s+weight:\s+(\d+)/);
    const triggersM = line.match(/^\s+triggers:\s+\[(.+)\]/);

    if (invokeM) currentEntry.invoke = invokeM[1].trim();
    if (skillM && !currentEntry.invoke) currentEntry.invoke = skillM[1].trim();
    if (hintM) currentEntry.hint = hintM[1];
    if (scopeM) currentEntry.scope = scopeM[1].trim();
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
  const projectsRoot = PROJECTS_ROOT; // FIX-2/WS-B2：支持 LUCA_PROJECTS_ROOT 覆盖（cloud/异机）
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
  // Production routing identity comes only from the validated session binding.
  // The shared docs symlink is display state, never an identity source.
  if (!dryRun) return runtimeCurrentProject;
  try {
    const docsPath = join(projectRoot, 'docs');
    const target = readlinkSync(docsPath);
    // FIX-2：4 个 marker 站点统一走单一裁决 helper（known-projects 最长前缀匹配，无命中回退首段）。
    // 旧实现在此做多段 slice + endsWith 兜底，与其余 3 站的首段正则在**嵌套**路径下发散
    // （…/项目/muse/lucagstack/docs → 'muse/lucagstack' vs 'muse'）= cross-hook 项目身份分裂。
    return projectNameFromLink(target, { projects });
  } catch {
    return '';
  }
}

// U-003：项目归属不是「meta 关键词豁免表」。先找具名 downstream identity，再用同一组
// 数据规则区分纯框架对象与框架×未具名项目混合对象；复杂度只在范围闭合后计算。
const FRAMEWORK_SCOPE_RULES = [
  { id: 'runtime', pattern: /luca[_\s-]?gstack|lucagstack|skill\s*os/i },
  { id: 'runtime-files', pattern: /(?:AGENTS|CLAUDE)\.md|workflow-state/i },
  { id: 'runtime-paths', pattern: /\.claude\/hooks|\.codex\/hooks|memory\/scripts|framework-audit/i },
  { id: 'runtime-guards', pattern: /project-scope-guard|route-guard|session-restore/i },
  // “自我成长”本身可能是下游产品功能，不能裸豁免 Project Gate。只收具名 workflow，
  // 或用户明确在纠正“自我成长流程”的路由归属这一窄语境。
  { id: 'framework-evolution', pattern: /framework-evolution(?:-scout)?|(?:命中|应该|不是).{0,12}自我成长流程|自我成长流程吗|自我演进流程|框架演进流程/i },
  { id: 'routing-meta', pattern: /项目(?:上下文)?门禁|路由(?:守卫|规则|闭环)?|plan\s*(?:agent|mode)/i },
  { id: 'framework-meta', pattern: /框架(?:自身|自审|治理)?|规则执行闭环|\bhooks?\b/i },
];

const FRAMEWORK_CONTROL_RULES = [
  { id: 'approval', pattern: /我(?:已经)?直接批准执行|不用再.{0,8}批准|批准(?=.{0,16}(?:方案|计划|执行))|(?:给你|授予你).{0,8}(?:最大|全部|完整)?权限/ },
  { id: 'execution-continuation', pattern: /继续执行|开始执行|直接执行|按.{0,12}计划.{0,8}(?:执行|完成|跑)|直接跑完|跑完|跑到底/ },
];

const DOWNSTREAM_SCOPE_RULES = [
  { id: 'project', pattern: /(?:产品|业务|下游|一个|某个)?项目(?:里|内|中|的)?/ },
  { id: 'product', pattern: /产品|业务|页面|功能|需求|客户|订单|原型|用户|接口|数据库|应用|网站|代码库|仓库|模块|\bcrm\b/i },
];

// 范围词有极性：明确说“不是/不涉及下游项目”是在收窄范围，不能再把其中的
// “产品/项目”当成正向 downstream 证据。这里只消去语义闭合的否定短语；同句中
// 另有“页面/功能/某个项目”等正向对象时仍会由 DOWNSTREAM_SCOPE_RULES 命中。
const NEGATED_DOWNSTREAM_SCOPE_RULES = [
  {
    id: 'not-downstream-project',
    pattern: /(?:不是|并非|不属于|不涉及|无关(?:于)?|非)\s*(?:任何)?\s*(?:下游)?\s*(?:产品|业务)?\s*项目(?:任务|工作)?/i,
  },
  {
    id: 'no-downstream-binding',
    pattern: /(?:不要|不得|无需|禁止)\s*(?:激活|确认|切换)(?:(?:\s*[、，,或和与]\s*)(?:激活|确认|切换))*\s*(?:任何)?\s*(?:下游)?\s*(?:产品|业务)?\s*项目/i,
  },
];

function matchingScopeRuleIds(value, rules) {
  return rules.filter(rule => rule.pattern.test(value)).map(rule => rule.id);
}

function stripScopeRules(value, rules) {
  let residual = value;
  for (const rule of rules) {
    const flags = `${rule.pattern.flags.replaceAll('g', '')}g`;
    residual = residual.replace(new RegExp(rule.pattern.source, flags), ' ');
  }
  return residual;
}

function projectIdentityText(prompt) {
  let text = normalize(prompt);
  for (const trigger of ['新项目', '新需求', '新功能']) {
    text = text.split(normalize(trigger)).join('');
  }
  return text;
}

function explicitNewProjectName(prompt) {
  const patterns = [
    /^\s*(?:请)?(?:新建|创建)(?:一个)?(?:新)?项目\s*(?:名为|叫|名称(?:是|为)|[:：])?\s*(.+?)\s*$/i,
    /^\s*(?:请)?(?:新项目|一个新项目)\s*(?:名为|叫|名称(?:是|为)|[:：])\s*(.+?)\s*$/i,
    /^\s*(?:请)?(?:新建|创建)(?:一个)?(?:名为|叫)\s*(.+?)\s*的?新项目\s*$/i,
    /^\s*new\s+project\s*(?::|named\s+)\s*(.+?)\s*$/i,
  ];
  const match = patterns.map(pattern => prompt.match(pattern)).find(Boolean);
  if (!match) return '';
  const raw = match[1].trim();
  if (/\s(?:或|或者|还是|or|and)\s/i.test(raw)) return '';
  const quoted = raw.match(/^[「『“"'](.+)[」』”"']$/u);
  const name = quoted ? quoted[1].trim() : raw;
  // Unquoted declarations deliberately require one token. Names containing
  // spaces remain supported through explicit quotes, preventing a trailing
  // requirement sentence from being mistaken for the project identity.
  if (!quoted && /\s/.test(name)) return '';
  if (!name || name.length > 80) return '';
  try { return validateProjectName(name); } catch { return ''; }
}

function classifyRoutingScope(prompt, projects, currentProject) {
  const namedProject = projects.find(name => nameMatchesIn(projectIdentityText(prompt), name));
  // Some clients surface hook output inside the next visible message. That
  // diagnostic text is evidence about the framework, not fresh project intent;
  // in particular, the standard "新项目还是继续老项目" wording must not feed
  // back into this classifier and manufacture another Project Gate.
  const isRouteGuardReport = /UserPromptSubmit\s+hook\s*\(completed\).*hook\s+context:\s*\[route-guard\]/is.test(prompt);
  const frameworkSignals = matchingScopeRuleIds(prompt, FRAMEWORK_SCOPE_RULES);
  const controlSignals = matchingScopeRuleIds(prompt, FRAMEWORK_CONTROL_RULES);
  const scopeResidual = stripScopeRules(
    stripScopeRules(prompt, FRAMEWORK_SCOPE_RULES),
    FRAMEWORK_CONTROL_RULES,
  );
  const negatedDownstreamSignals = matchingScopeRuleIds(scopeResidual, NEGATED_DOWNSTREAM_SCOPE_RULES);
  const residual = stripScopeRules(scopeResidual, NEGATED_DOWNSTREAM_SCOPE_RULES);
  const downstreamSignals = matchingScopeRuleIds(residual, DOWNSTREAM_SCOPE_RULES);

  // 具名 identity 仍决定最高优先级的 scope，但不再丢掉同句中的框架/续接信号：目标项目
  // 已经激活时 Gate 已满足，后面的 complexity 必须还能看见这些信号。
  if (namedProject) {
    return { kind: 'named_downstream', namedProject, frameworkSignals, controlSignals, downstreamSignals, negatedDownstreamSignals };
  }
  if (isRouteGuardReport) {
    return { kind: 'pure_framework_meta', frameworkSignals: [...new Set([...frameworkSignals, 'route-guard-report'])], controlSignals, negatedDownstreamSignals };
  }
  if (!frameworkSignals.length && !controlSignals.length) return { kind: 'ordinary' };

  if (downstreamSignals.length) {
    const affirmsCurrent = /当前项目|这个项目|本项目/.test(residual) && currentProject;
    if (affirmsCurrent) {
      return { kind: 'current_downstream', project: currentProject, frameworkSignals, controlSignals, downstreamSignals, negatedDownstreamSignals };
    }
    return { kind: 'mixed_ambiguous', frameworkSignals, controlSignals, downstreamSignals, negatedDownstreamSignals };
  }

  return { kind: 'pure_framework_meta', frameworkSignals, controlSignals, negatedDownstreamSignals };
}

// 对话延续/状态询问豁免（G3）：UserPromptSubmit 是“可以检查”的事件，不是“新任务开始”的
// 证据。短 check-in、引用上一轮判断、要求换种说法，以及带明确续接词的长句都属于同一任务。
// 真正的项目声明在 projectGate 里先检查；明确 skill 词仍会在 skillDecision 命中，因此这里
// 放宽续接识别不会吞掉“继续项目”或“继续做个原型”。
const CONTINUATION_RE = /^\s*(?:都|全部|现在)?(?:继续|接着来|接着做|然后呢|下一步|往下走|好了吗|行了吗|怎么样|进度如何|到哪(?:一步)?了|卡住了|卡在哪|完成了吗|做完了吗|还在跑吗|等一下|先停|暂停|停一下|不用了|就这样|可以了|收到)(?:一下)?[吧呢吗呀了的！!。.？?…\s]*$/;
const CONTEXTUAL_FOLLOWUP_RE = /(?:刚才|上一轮|上一条|上面|前面|这个判断|这个说法|你刚才|你再(?:检查|想想|解释|说明)|接着(?:写|做|说|看|检查|整理|完成)|说我能听懂的话|换(?:个|一种)说法|简单(?:点|一点)|说清楚|用大白话|没听懂)/;
// 会话 handoff 是项目无关工具。只豁免“明确把当前会话交给新 agent/session”这一窄意图；
// handoff-protocol、项目级 workflow handoff 等普通提及不能命中。
const SESSION_HANDOFF_INTENT_RE = /(?:^\s*[$/]?handoff(?:\s|$)|会话交接|生成(?:一份)?交接文档|(?:把)?(?:当前|这个)会话\s*交给(?:下个|下一个)\s*(?:agent|session)|新\s*session\s*接手(?:当前|这个)会话|session\s+handoff)/i;
function isContinuation(prompt) {
  const text = prompt.trim();
  return CONTINUATION_RE.test(text) || CONTEXTUAL_FOLLOWUP_RE.test(text);
}

function hasProjectWorkIntent(prompt, routingScope) {
  if (routingScope?.kind === 'pure_framework_meta') return false;
  if (/怎么做|如何做|怎么实现|如何实现|为什么|是什么/.test(prompt)) return false;
  const directAction = /^\s*(?:(?:请|帮我|麻烦|能不能|可以|继续|接着)\s*)*(?:做(?:个|一个|一下)?|创建|新建|新增|添加|增加|修改|改造|优化|修复|开发|实现|设计|生成|搭建|上线|接入|评审|审查|检查|重构|迁移|删除|调整|更新)/;
  const baAction = /^\s*(?:(?:请|帮我|麻烦|能不能|可以)\s*)?把.{1,60}(?:做|创建|新增|添加|修改|改造|优化|修复|实现|设计|生成|重构|迁移|删除|调整|更新)/;
  const desireAction = /^\s*(?:我想|我要|我需要|需要|希望|能不能|可以).{0,30}(?:做|创建|新建|新增|添加|修改|改造|优化|修复|开发|实现|设计|生成|搭建|上线|接入|重构|迁移|删除|调整|更新)/;
  const projectObject = /产品|业务|需求|页面|功能|原型|交互|用户流程|接口|数据库|应用|网站|代码库|仓库|模块|组件|登录|注册|订单|客户|报表|工作流|\bprd\b|技术规格|设计稿/i;
  return (directAction.test(prompt) || baAction.test(prompt) || desireAction.test(prompt))
    && projectObject.test(prompt);
}

function projectGate(prompt, projects, currentProject, routingScope) {
  const text = normalize(prompt);
  if (!text) return null;
  // 寒暄/确认类非任务输入不进项目门禁（与 skill 路由层 looksLikeTask 同口径；红队 C7 实测漏网）
  if (/^\s*(你好|hi\b|hello\b|谢谢[你您]?[！!。]?$|好的[！!。]?$|ok[！!。]?$|是的[！!。]?$|明白[了]?[！!。]?$|没问题[！!。]?$)/i.test(prompt)) {
    return null;
  }
  // New-project signals must not be misread as switching to an existing
  // project whose name is a substring (e.g. "项目" ⊂ "新项目"). Strip the
  // trigger words before matching existing project names.
  const newProjectTriggers = ['新项目', '新需求', '新功能'];
  const hasNewProjectSignal = newProjectTriggers.some(t => text.includes(normalize(t)));
  const hasNewProjectDeclaration = /新项目|新建(?:一个)?项目|创建(?:一个)?(?:名为.{1,80})?新?项目|new\s+project/i.test(prompt);
  const declaredNewProject = explicitNewProjectName(prompt);
  let searchText = text;
  for (const t of newProjectTriggers) searchText = searchText.split(normalize(t)).join('');

  const named = routingScope?.namedProject || projects.find(name => nameMatchesIn(searchText, name));

  // REQ-SCOPE-NULL-FIRST（§6.1）：作用域否定的结果绝不能走到会改绑定的分支。
  // 实测缺陷（改前基线为红）：`new project: 不涉及项目的route-guard` 里的否定词**命中**，
  // 下游信号被 NEGATED_DOWNSTREAM_SCOPE_RULES 剥掉 → mixed_ambiguous 短路消失 →
  // projectGate 继续往下 → 撞上 explicitNewProjectName → `project.sh new`：
  // 真的建一个叫「不涉及项目的route-guard」的项目、解绑当前、三条软链重指。
  // 危险方向是否定词**命中**而非漏掉，所以修法不是补词表（扩得越全越危险），而是臂序：
  // 空臂先于 explicitNewProjectName 评估。
  // 边界：**只在没有具名下游项目时**才提前返回——具名项目必须继续 gate
  // （SC-20260523-002：`route-guard 在 muse 里怎么走` 仍须 gate），故 named 上提到这里。
  if (routingScope?.kind === 'pure_framework_meta' && !named) return null;

  if (declaredNewProject) {
    const existing = projects.find(name => normalize(name) === normalize(declaredNewProject));
    if (existing) {
      return {
        decision: 'PROJECT_STOP',
        projectAction: 'new_project_name_conflict',
        project: existing,
        projects,
        message: `项目 ${existing} 已存在；请确认是切换到它，还是为新项目换一个名字。`,
      };
    }
    return {
      decision: 'PROJECT_SWITCH',
      projectAction: 'create_new_project',
      operation: 'new',
      project: declaredNewProject,
      message: `新建并绑定 ${declaredNewProject} 后再继续路由。`,
    };
  }

  // explicit downstream identity 永远先于 meta/content 豁免。即使请求审计的是该项目的
  // hook/路由，具名项目也必须先绑定；同一项目已经激活时视为 gate 已满足。
  if (named && normalize(named) !== normalize(currentProject)) {
    return {
      decision: 'PROJECT_SWITCH',
      projectAction: 'switch_existing_project',
      project: named,
      message: `切换到 ${named} 后再继续路由。`,
    };
  }
  if (/当前项目|这个项目|本项目/.test(prompt)) return null;

  // 纯 luca_gstack/framework meta 不消费 downstream project context，跳过无项目兜底网。
  if (routingScope?.kind === 'pure_framework_meta') return null;

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
  if (SESSION_HANDOFF_INTENT_RE.test(prompt) || /会议纪要|会议语料|语音稿|语音转文字|转文字稿|原始语料|讨论记录|语料转需求|整理这段记录|梳理这段记录|对比|比较一下|版本对比|两个方案比较|看看区别|哪个好|截图|浏览网站|访问网页|浏览器操作|爬取|抓取|翻译/.test(prompt)) {
    return null;
  }
  // Audit M3: framework self-maintenance（code-hygiene 清理/体检或 code-review
  // 审查 luca 自身 .mjs/.py/hooks/scripts）是 luca_gstack Meta task，不是下游
  // project work。仅当相应工程触发词与 framework path/artifact 共现时豁免
  // Project Gate，避免把真正的下游代码任务过度豁免；无 active project 时仍能
  // 让 /code-hygiene 或 /code-review 到达 skill routing。
  // Guarded by !named (same as C2 above): naming an existing project must still
  // gate — else "清理一下 muse 里 scripts/ 的死代码" silently swallows the switch
  // and runs against the wrong project (红线 SC-20260523-002). 2026-07-31: 评审动词
  // 同批纳入（否则框架自评审在无激活项目时被 PROJECT_STOP，而 meta session 又不得
  // switch）；latin 词写容空格形，因本处读原文 prompt 而词表读 normalize 去空格后的
  // 文本，不容空格会出现"词表中了、豁免没中"的错配。边界：仍要求共现框架路径/制品词，
  // 故"评审一下我刚做的框架改动"（无路径字样）仍走 gate——有意保守，不为评审拆松 gate。
  if (!named &&
      /清理|死代码|代码体检|工程体检|cleanup|完成前验证|code-hygiene|代码去重|弱类型|代码质量|代码审查|代码评审|评审代码|代码\s*review/i.test(prompt) &&
      /\.claude\/hooks|memory\/scripts|scripts\/|\.mjs|\.py|luca_gstack|路由|hook|框架自/.test(prompt)) {
    return null;
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

  if (hasNewProjectDeclaration) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'confirm_new_project_name',
      currentProject: currentProject || '',
      projects,
      message: '这是新项目声明，但项目名缺失或不唯一；请给出一个明确项目名（含空格时用引号）。',
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

  // NO_PIN 只是状态，不是项目意图。只有“动作 + 项目对象”同时出现，才要求用户先绑定
  // 项目；普通陈述、纠正和问答交给后续路由，不再由长度/标点制造 Project Gate。
  if (!currentProject && hasProjectWorkIntent(prompt, routingScope)) {
    return {
      decision: 'PROJECT_STOP',
      projectAction: 'choose_new_or_existing',
      projects,
      message: '当前没有激活项目，请先确认新项目还是继续老项目。',
    };
  }

  // 对话延续豁免放在所有明确项目工作检查之后：续接本身不制造 gate，但“继续做原型”
  // 这类仍要落项目产物的请求在 NO_PIN 下必须先绑定。
  if (isContinuation(prompt)) return null;

  return null;
}

function complexityDecision(prompt, routingScope = { kind: 'ordinary' }) {
  const text = normalize(prompt);
  const signals = [
    {
      name: '框架执行续接',
      weight: 6,
      test: () => routingScope.controlSignals?.length > 0 && (
        routingScope.kind === 'pure_framework_meta' ||
        (['named_downstream', 'current_downstream'].includes(routingScope.kind) && routingScope.frameworkSignals?.length > 0)
      ),
    },
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
      // 2026-07-12：'新项目复杂需求' → '多功能需求'。原信号被"新项目/新需求"前缀锁死，
      // 已有项目里的多功能需求（"给现有系统加订单查询、库存管理、报表导出"）拿不到分 →
      // route-guard STOP → 静默直接执行（用户实测根因）。改为 build/add 意图门 + 双阈值，
      // 覆盖已有项目。weight 6 单独命中即 PLAN_MODE（Plan Agent 人类卡点，误报只花一次确认）。
      name: '多功能需求',
      weight: 6,
      test: t => {
        // 摄入语境反担保（2026-07-13 fable review B-F4）：会议纪要/语料整理是 /idea 的地盘，
        // 枚举功能点是其常态，不是构建请求。
        if (/会议纪要|语音稿|讨论记录|原始语料|整理(这|一)段/.test(prompt)) return false;
        // 汇报文语境（B-F3 部分缓解；门级贴文噪声仍是已知残留——所有复杂度信号共有）。
        if (/周报|日报|评审报告/.test(prompt)) return false;
        // 诊断/事故语境反担保 v2（B-F5：v1 裸名词'异常/故障/延迟'误伤可观测域构建需求——
        // "新增监控看板：异常统计、延迟分布"被整域压制。改句式框架：名词仅在"出现了/发生了"
        // 叙述框架内才算诊断语境；'排查/诊断'要求祈使形'一下'）。压制后落回 skillDecision
        // （可能 STOP 或关键词命中），由语义路由契约兜底。
        if (/为什么|怎么回事|变慢|都报错|报错了|出错|崩溃|失败了|排查一下|诊断一下|(出现|发生)了.{0,8}(延迟|异常|故障|问题)/.test(prompt)) return false;
        // build/add 意图：原新项目前缀词 ∪ 明确构建动词（刻意不含"支持"等宽词，避免劫持单功能编辑）
        if (!/新项目|新需求|新功能|想做一个|想做个|要做一个|要做个|新做一个|新做个|新建|新增|搭建|开发|实现|做一个|做个|加一个|加个|加上|构建|上线|集成|添加|增加/.test(prompt)) return false;
        // 连接词单列（B-F2：连接词混在 caps 里让 enum 路径被"然后"击穿——"加个红、黄、蓝，然后保存"
        // 曾误升 PLAN_MODE）。连接词仍计入 capHits>=4 总门（保持既有行为），但不算"真功能词"。
        const connectors = ['然后', '可以', '还能', '并且', '以及'];
        const caps = [...connectors, '入口', '形式', '设置', '吐出', '展示', '唤起', '一天', '每天', '每日', '自动', '定时', '同步', '提醒', '统计', '拖拽',
          // UI/function nouns commonly enumerated in product reqs.
          '登录', '注册', '权限', '头像', '侧边栏', '按钮', '弹窗', '列表', '详情', '表单', '搜索', '筛选', '编辑', '创建', '导出', '导入',
          // 2026-07-12：补自然产品功能域名词，让"订单查询/库存管理/报表导出"等真需求可计分。
          '订单', '库存', '报表', '消息', '通知', '审批', '看板', '报销', '结算', '对账', '仪表盘', '工作流', '下单', '支付', '退款', '收藏', '标签', '角色', '菜单', '评论'];
        const capHits = caps.filter(c => t.includes(normalize(c))).length;
        const featureHits = caps.filter(c => !connectors.includes(c) && t.includes(normalize(c))).length;
        // 顿号枚举数（在 raw prompt 上数 '、'，normalize 虽保留 '、' 但 raw 更稳）。>=2 ≈ >=3 项枚举。
        const enumCount = (prompt.match(/、/g) || []).length;
        // capHits>=4：4+ 功能名词即复杂（不论长度）。enum 路径要求至少 1 个真功能词（连接词不算）。
        return capHits >= 4 || (enumCount >= 2 && featureHits >= 1);
      },
    },
    {
      // 2026-07-28 认知/研究轴：此前 7 个信号全在"构建轴"（做东西），研究-理解类诉求
      //（"看一下 X 是什么 / 有什么优势 / 能不能借鉴"）complexityScore 恒 0，于是下方 STOP
      // 分支那颗防"把 STOP 当直接执行"的提示钉对研究类**永不触发**。而 research 词表是
      // 刻意做窄的（quick_research 自注"宽表述靠语义兜底"）——两者叠加让研究轴成了唯一
      // 的单层保护，构建轴却有词表+复杂度网双层。本信号补齐这个不对称。
      // 实证两次同型失效：7-22 CRM 与 7-28 pi，均为 harness 注入 "Do not use deep-research
      // unless requested" 被当成豁免、裸奔 WebSearch，被用户打断质问。
      // weight 2 是刻意的：只为把 score 顶过 0 以触发提示钉，**不追求**到 PLAN_MODE 阈值 6
      //（研究诉求不该每次强制走 Plan Agent）。取 2 而非 3 是为了让它与任一 w3 信号叠加仍
      // 只到 5——否则"了解一下整体架构设计"会同时命中"规划意图"(w3) 而恰好 6 分误升 PLAN_MODE。
      name: '研究/认知诉求',
      weight: 2,
      test: t => {
        // 反担保1：诊断/排错是 debug 不是 research（句式框架同"多功能需求"B-F5）。
        if (/为什么|怎么回事|报错|出错|崩溃|失败了|排查|诊断|修一下|修复/.test(t)) return false;
        // 反担保2：指向本地具体代码对象的"看一下"属平凡任务豁免，不是研究。
        if (/这个文件|这段代码|这个函数|这个变量|这一?行|第\d+行|日志/.test(t)) return false;
        // 双要素（认知动词 ∧ 认知对象）——单要素太宽："看看状态"/"什么意思"都会误发。
        const cognitiveVerb = /了解|看一下|看看|搞懂|弄清楚|研究|摸清|调研|评估|对比|比较|学习|熟悉/;
        // "怎么做/如何X" 系列刻意不写死成"怎么做的"——实测"了解一下 X 是怎么做状态管理的"
        // 会因中间插入宾语而整条漏掉，而这正是最常见的研究句式。
        const cognitiveObject = /框架|架构|机制|原理|设计思路|怎么做|如何做|怎么设计|如何设计|怎么实现|如何实现|怎么处理|如何处理|怎么运作|如何运作|怎么工作|是什么|优势|劣势|区别|差异|竞品|开源|生态|最佳实践|借鉴|值不值得|要不要用|能不能用|适不适合/;
        return cognitiveVerb.test(t) && cognitiveObject.test(t);
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

// Engineering-delivery 新能力只在 route loader 无法表达的两个窄缝处写手工语义：
// 1) wayfinder 自动建议的三条件与；2) preset 的显式选择而非普通提及。
// 六项 skill 的普通 semantic route 仍只读 skill-routing-map.yaml。
const WAYFINDER_MULTI_SESSION_RE = /(?:跨\s*(?:session|会话)|多(?:个)?会话|multi[-\s]?session|长期分阶段|多人接力)/i;
const WAYFINDER_FOG_RE = /(?:路线不清|路径不清|不知道从哪开始|决策纠缠|范围迷雾|方向不清|fog(?:gy)?|fog[-\s]?of[-\s]?war)/i;

function wayfinderAutoPredicate(prompt, complexity) {
  return Number(complexity?.complexityScore || 0) >= 6
    && WAYFINDER_MULTI_SESSION_RE.test(prompt)
    && WAYFINDER_FOG_RE.test(prompt);
}

function explicitEngineeringDeliverySelection(prompt) {
  const preset = '(?:engineering[-\\s]?delivery(?:\\s+preset)?|工程交付(?:\\s*preset|预设|流程))';
  const selection = new RegExp(
    `(?:选择|启用|采用|使用)\\s*${preset}|(?:按|按照)\\s*${preset}\\s*(?:执行|走|继续)|(?:run|use|enable|select)\\s+(?:the\\s+)?${preset}`,
    'i',
  );
  if (!selection.test(prompt)) return false;

  // 询问、评审、否定都只是提及，不能制造 preset selection authority。
  const nonSelection = new RegExp(
    `(?:不(?:要)?|没有?|别|无需)\\s*(?:选择|启用|采用|使用|按)|(?:要不要|是否|能否|怎么|为什么).{0,16}${preset}|(?:评审|复审|审查|介绍|解释).{0,16}${preset}|(?:do\\s+not|don't|did\\s+not|should\\s+we|how\\s+to|review)\\s+.{0,16}${preset}`,
    'i',
  );
  return !nonSelection.test(prompt);
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

function frameworkFlowMode(flow, prompt) {
  if (flow !== 'framework-evolution') return 'default';
  // 显式点名 scout 是模式 1/1b，不被同句里的“评估”等宽词改写成模式 2。
  if (/framework-evolution-scout/i.test(prompt)) return 'scout';
  const explicitBenchmark = /对标|全面对一对|全面对比|深度对比|深评|benchmark|\bmode\s*2\b|模式\s*2/i.test(prompt);
  const comparativeBenchmark = /对比|比较|评估/.test(prompt)
    && /harness|框架|体系|仓库|repo|开源/i.test(prompt);
  return explicitBenchmark || comparativeBenchmark ? 'benchmark' : 'scout';
}

// AGENTS.md 的 slashless alias 契约：只有消息首 token 与真实 command 文件完全对应时，
// 才等价为斜杠命令。这样既兼容会拦截斜杠的客户端，也不把正文 casual mention 或隐藏
// skill 目录误当一级入口。
function visibleSlashlessAlias(prompt) {
  const name = prompt.match(/^\s*([a-z][\w-]*)(?:\s|$)/i)?.[1]?.toLowerCase();
  if (!name) return '';
  return existsSync(join(projectRoot, '.claude/commands', name + '.md')) ? '/' + name : '';
}

function skillDecision(prompt, routingScope = { kind: 'ordinary' }) {
  const direct = prompt.match(/^[$/][a-z][\w-]*/i)?.[0];
  if (direct) {
    const skill = direct.startsWith('$') ? `/${direct.slice(1)}` : direct;
    return { decision: 'SINGLE_SKILL', skill, candidates: [skill] };
  }

  const slashlessSkill = visibleSlashlessAlias(prompt);
  if (slashlessSkill) {
    return { decision: 'SINGLE_SKILL', skill: slashlessSkill, candidates: [slashlessSkill] };
  }

  const routes = loadRoutes(join(projectRoot, '.claude/skill-os/skill-routing-map.yaml'))
    .filter(route => route.scope !== 'framework_meta' || routingScope.kind === 'pure_framework_meta')
    // YAML 是候选短语 SSOT，但线性 loader 无法辨认「不要启用」/「要不要启用」。
    // 对这一个 preset 先过纯函数语义门，防止否定/询问被字面子串反向选中。
    .filter(route => route.invoke !== 'engineering-delivery' || explicitEngineeringDeliverySelection(prompt));
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
    if (routingScope.kind === 'pure_framework_meta' || isContinuation(prompt)) {
      return { decision: 'NONE' };
    }
    const looksLikeTask = prompt.length > 5
      && !prompt.match(/^(你好|hi\b|hello\b|谢谢[你您]?[！!。]?$|好的[！!。]?$|ok[！!。]?$|是的[！!。]?$|明白[了]?[！!。]?$|没问题[！!。]?$)/i)
      && !prompt.endsWith('?') && !prompt.endsWith('？')
      && !isContinuation(prompt);
    if (!looksLikeTask) return { decision: 'NONE' };
    const softCandidates = softSkillDecision(prompt, routes);
    return { decision: 'STOP', reason: 'no_keyword_match', softCandidates };
  }

  const topWeight = hits[0].w;
  const candidates = hits.filter(hit => hit.w >= topWeight - 1);
  const unique = [...new Map(candidates.map(hit => [hit.invoke || hit.hint, hit])).values()];

  if (unique.length === 1) {
    if (unique[0].type === 'framework_flow') {
      const flow = unique[0].invoke || unique[0].hint;
      return {
        decision: 'FRAMEWORK_FLOW',
        flow,
        mode: frameworkFlowMode(flow, prompt),
        routeType: unique[0].type,
        candidates: [flow],
      };
    }
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

// ══════════════════════════════════════════════════════════════════════════
// E1 别名解析（RESOLVE）—— hook 只**记录候选**，永不授权、永不择一、永不生成命令。
// 别名真值在下游项目自己的 <PROJECTS_ROOT>/<canonical>/.luca/project.json；
// **框架内不出现任何产品名字面量**。缺该文件 = 只有 canonical 名可用，合法且不报错。
// 切不切项目由 LLM 层按语义路由契约决定——这一层拿不到语义证据，所以这一层不裁决。
// ══════════════════════════════════════════════════════════════════════════
const ALIAS_LIMITS = {
  rootEntries: 512, projects: 256, manifestBytes: 8192, totalBytes: 262144,
  aliasesPerProject: 16, aliasesGlobal: 2048,
  aliasMinCp: 2, aliasMaxCp: 80, aliasMaxBytes: 256, candidates: 8,
};
// 保留词：别名不得取这些（取了会让任何一句带该词的话都产出候选，等于噪音发生器）
const ALIAS_RESERVED = new Set([
  'app', 'application', 'project', 'product', 'system', 'software',
  '项目', '工程', '应用', '产品', '系统', '软件', '页面', '界面', '功能',
]);
const ALIAS_MANIFEST_KEYS = new Set(['schema_version', 'canonical_project', 'aliases']);

function foldAlias(value) {
  return String(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}
function aliasCharsForbidden(value) {
  return /[\p{Cc}\p{Cf}]/u.test(value) || value.includes('/') || value.includes('\\');
}
// O_NOFOLLOW + regular-file fstat + limit+1 读取 + dev/ino/size 复核。
// 任何一步不满足都返回 null（该项目只剩 canonical 名可用），绝不抛出。
function readManifestBytes(path) {
  let fd;
  try {
    fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch { return null; }
  try {
    const pre = fstatSync(fd);
    if (!pre.isFile()) return null;
    const buf = Buffer.alloc(ALIAS_LIMITS.manifestBytes + 1);
    const read = readSync(fd, buf, 0, buf.length, 0);
    if (read > ALIAS_LIMITS.manifestBytes) return null;
    const post = fstatSync(fd);
    if (post.dev !== pre.dev || post.ino !== pre.ino || post.size !== pre.size || post.size !== read) return null;
    return buf.subarray(0, read);
  } catch {
    return null;
  } finally {
    try { closeSync(fd); } catch { /* fd 已失效，忽略 */ }
  }
}
// 重复键感知：JSON.parse 会静默保留最后一个同名键。schema 只有三个合法键，且合法值里
// 出现的字符串后面跟的是 `,`/`]` 而非 `:`，故按 `"key"\s*:` 计数即可判重复。
function parseManifestStrict(text) {
  for (const key of ALIAS_MANIFEST_KEYS) {
    const hits = text.match(new RegExp(`"${key}"\\s*:`, 'g'));
    if (hits && hits.length > 1) return null;
  }
  let doc;
  try { doc = JSON.parse(text); } catch { return null; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  for (const key of Object.keys(doc)) if (!ALIAS_MANIFEST_KEYS.has(key)) return null;
  if (doc.schema_version !== 1) return null;
  if (typeof doc.canonical_project !== 'string' || !doc.canonical_project) return null;
  if (doc.aliases !== undefined && !Array.isArray(doc.aliases)) return null;
  return doc;
}
// 返回 { complete, entries: Map<foldedSurface, canonical> }。
// complete=false（越界/普查超限）时**只保留 canonical 名**，非 canonical 名一律不解析。
function readAliasRegistry(projects) {
  const entries = new Map();
  let complete = true;
  const canonicalFolded = new Set();
  for (const name of projects) {
    const folded = foldAlias(name);
    if (folded) { entries.set(folded, name); canonicalFolded.add(folded); }
  }
  if (projects.length > ALIAS_LIMITS.projects) return { complete: false, entries };
  let totalBytes = 0;
  let globalAliases = 0;
  const ownerOf = new Map();
  const rejected = new Set();
  for (const name of projects) {
    let dir;
    try {
      dir = join(PROJECTS_ROOT, name, '.luca');
      // `.luca` 与 manifest 均不得是符号链接；canonical 包含性检查
      if (!lstatSync(dir).isDirectory()) continue;
    } catch { continue; }
    const bytes = readManifestBytes(join(dir, 'project.json'));
    if (!bytes) continue;
    totalBytes += bytes.length;
    if (totalBytes > ALIAS_LIMITS.totalBytes) { complete = false; break; }
    const doc = parseManifestStrict(bytes.toString('utf8'));
    if (!doc) continue;
    if (doc.canonical_project !== name) continue;      // 一份 manifest 只能声明自己
    const seenHere = new Set();
    const list = doc.aliases || [];
    if (list.length > ALIAS_LIMITS.aliasesPerProject) continue;
    for (const raw of list) {
      if (typeof raw !== 'string') { seenHere.clear(); break; }
      if (aliasCharsForbidden(raw)) continue;
      const folded = foldAlias(raw);
      if (!folded) continue;
      const cp = [...folded].length;
      if (cp < ALIAS_LIMITS.aliasMinCp || cp > ALIAS_LIMITS.aliasMaxCp) continue;
      if (Buffer.byteLength(folded, 'utf8') > ALIAS_LIMITS.aliasMaxBytes) continue;
      if (ALIAS_RESERVED.has(folded)) continue;
      if (canonicalFolded.has(folded)) continue;        // 别名不得等于某个 canonical ID
      if (seenHere.has(folded)) continue;               // 规范化后同项目内重名
      seenHere.add(folded);
      if (ownerOf.has(folded) && ownerOf.get(folded) !== name) { rejected.add(folded); continue; }
      ownerOf.set(folded, name);
      globalAliases += 1;
      if (globalAliases > ALIAS_LIMITS.aliasesGlobal) { complete = false; break; }
    }
    if (!complete) break;
  }
  if (!complete) {
    const canonicalOnly = new Map();
    for (const folded of canonicalFolded) canonicalOnly.set(folded, entries.get(folded));
    return { complete: false, entries: canonicalOnly };
  }
  for (const [folded, owner] of ownerOf) {
    if (rejected.has(folded)) continue;                 // 一名多主：整条别名作废
    if (!entries.has(folded)) entries.set(folded, owner);
  }
  return { complete: true, entries };
}
// 规范化并保留到原始下标的映射，使 span 始终指向**原始 prompt**。
function foldWithMap(text) {
  const out = [];
  const map = [];
  let pendingSpace = false;
  for (let i = 0; i < text.length; i++) {
    const folded = text[i].normalize('NFKC').toLowerCase();
    if (/^\s+$/.test(folded)) { pendingSpace = true; continue; }
    if (pendingSpace) { if (out.length) { out.push(' '); map.push(i); } pendingSpace = false; }
    for (const ch of folded) { out.push(ch); map.push(i); }
  }
  return { text: out.join(''), map };
}
// `项目|工程` 相邻与否**只记录**为 marker_present，绝不决定候选成不成立（变异体 2）。
const ALIAS_MARKER_SKIP = /[\s"'`«»「」『』()（）[\]【】{}<>《》,，、.。:：;；!！?？~-]/;
function markerNear(raw, start, end) {
  const scan = (from, step) => {
    let i = from;
    let skipped = 0;
    while (i >= 0 && i < raw.length && skipped < 4 && ALIAS_MARKER_SKIP.test(raw[i])) { i += step; skipped += 1; }
    if (i < 0 || i >= raw.length) return false;
    if (step > 0) return raw.startsWith('项目', i) || raw.startsWith('工程', i);
    return raw.slice(Math.max(0, i - 1), i + 1) === '项目' || raw.slice(Math.max(0, i - 1), i + 1) === '工程';
  };
  return scan(end, 1) || scan(start - 1, -1);
}
// RESOLVE：扫描原始 prompt，记录「哪些产品名出现在哪里」。
// 引号、反引号、否定、疑问、转述、从句结构**一律不看**（§3.3 六轮红队结论：
// 确定性 hook 判不了中文否定；在授权轴引回任何机械否定都是命名变异体）。
function resolveAliasCandidates(prompt, projects) {
  const registry = readAliasRegistry(projects);
  if (!registry.entries.size) return null;
  const folded = foldWithMap(String(prompt || ''));
  if (!folded.text) return null;
  const found = [];
  const seen = new Set();
  for (const [surface, canonical] of registry.entries) {
    let from = 0;
    for (;;) {
      const idx = folded.text.indexOf(surface, from);
      if (idx === -1) break;
      from = idx + 1;
      const start = folded.map[idx];
      const end = folded.map[idx + surface.length - 1] + 1;
      const key = `${canonical} ${start} ${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        surface: String(prompt).slice(start, end),
        canonical,
        span_start: start,
        span_end: end,
        marker_present: markerNear(String(prompt), start, end),
      });
    }
  }
  if (!found.length) return null;                        // 零候选 → 该对象缺席
  found.sort((a, b) => a.span_start - b.span_start || a.span_end - b.span_end);
  if (found.length > ALIAS_LIMITS.candidates) {
    // 第 9 条触发 cap 拒绝：不截断、不择一，整体不产候选。
    return { schema_version: 1, status: 'CAP_EXCEEDED', registry_complete: registry.complete, candidates: [] };
  }
  return { schema_version: 1, status: 'OK', registry_complete: registry.complete, candidates: found };
}

// 携带模式（§3.2）：信号必须穿过 `buildDecisionCore` 的**全部**早返。
// 用包装器而不是在每个 return 各补一次 spread——后者在新增分支时会静默漏掉
// （实测：upstream 6aaa1c6 新增的 `explicitEngineeringDeliverySelection → FRAMEWORK_FLOW`
// 早返，计划成稿时并不存在）。包装器对将来新增的早返同样生效。
function buildDecision(prompt) {
  const decision = buildDecisionCore(prompt);
  if (!decision || typeof decision !== 'object') return decision;
  try {
    const aliasResolution = resolveAliasCandidates(prompt, listProjects());
    if (aliasResolution) decision.aliasResolution = aliasResolution;
  } catch { /* RESOLVE 是证据记录，不得让路由整体失败 */ }
  return decision;
}

function buildDecisionCore(prompt) {
  const projects = listProjects();
  const currentProject = readCurrentProject(projects);
  const routingScope = classifyRoutingScope(prompt, projects, currentProject);

  if (routingScope.kind === 'mixed_ambiguous') {
    return {
      decision: 'NEEDS_CONTEXT',
      projectAction: 'clarify_framework_or_project_scope',
      projects,
      scopeSignals: {
        framework: routingScope.frameworkSignals,
        downstream: routingScope.downstreamSignals,
      },
      message: '请求同时指向 luca_gstack 框架与未具名项目，请先说明要改框架本身，还是哪个下游项目。',
    };
  }

  const gate = projectGate(prompt, projects, currentProject, routingScope);
  const complexity = complexityDecision(prompt, routingScope);

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

  // 2026-07-13 fable review B-F1：显式 / 或 $ 直呼 = 用户最新明确请求（规则优先级 #1），不被
  // 复杂度门替换——旧行为里 PLAN_MODE 会吞掉 '/brainstorm 新增A、B、C' 的直呼，还压过 fork
  // 较软 PLAN_CHECK 门（原为 /auto 设计；auto 已于 2026-08-03 移出 HEAVY 做截流实验，现成员仅 muse-loop-orchestrate）。直呼时复杂度降级为 planHint 附加（提醒仍在，直呼归还）。
  const directCall = /^[$/][a-z][\w-]*/i.test(prompt) || !!visibleSlashlessAlias(prompt);
  if (!directCall && complexity.decision === 'PLAN_MODE') {
    if (!wayfinderAutoPredicate(prompt, complexity)) return complexity;
    return {
      ...complexity,
      recommendedSkills: ['/wayfinder'],
      recommendationEvidence: { huge: true, multi_session: true, fog: true },
    };
  }

  // Preset 选择不是 skill 命中，也不是 authority；它只在 Project Gate 和 Plan
  // complexity 之后产生一个编译元数据入口。未选择时完全不读 optional graph。
  if (!directCall && explicitEngineeringDeliverySelection(prompt)) {
    return {
      decision: 'FRAMEWORK_FLOW',
      flow: 'engineering-delivery',
      mode: 'selected-preset-compile',
      routeType: 'framework_flow',
      candidates: ['engineering-delivery'],
      complexityScore: complexity.complexityScore,
      signals: complexity.signals,
      selectionAuthorityEffect: 'none',
    };
  }

  const skillResult = skillDecision(prompt, routingScope);
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

  return { ...skillResult, complexityScore: complexity.complexityScore, signals: complexity.signals, hasActiveProject: !!currentProject, planHint: complexity.complexityScore >= 6 };
}

// 评审轴提示钉（2026-07-31）。刻意是**独立分支**：不进 complexityScore、不挂 hasActiveProject——
//   ① 7 个复杂度信号全在构建轴，"review 一遍你做的内容"恒 0 分，挂上去钉子永不出现；
//   ② 若做成第 9 个复杂度信号，会把"评审一下这个复杂功能"从 4 分推到 6 分误触 PLAN_MODE。
//   挂在 STOP / SINGLE_SKILL / PROJECT_STOP / PROJECT_SWITCH 四支（不只 STOP）：R4 的两种失效
//   形态是"没映射上"和"映射错"——后者恰恰
//   表现为高置信 SINGLE（实测"评审一下这份 PRD"→SINGLE /brainstorm，撤 ux_audit 泛词前是 MULTI），
//   只挂 STOP 等于把 R4 自己点名的第二形态交还给记忆召回。钉不改决策，只多一行文本。
//   覆盖面含被撤的 ux_audit 泛词语义（挑毛病/有什么问题/给建议）：撤词是为停掉"任何评审意图→
//   截图 skill"的错误确定性，若提示钉不接住，这些句子就从"错的确定"退成"完全裸奔"=净变差。
//   latin 词带边界（preview⊃review）；研究轴优先（"评估一下这个架构设计"属研究不属评审）。
//   文案只放指针不复制 R4 证据标准（唯一权威落点在 R4，内联副本必漂移）。
function reviewAxisHint(decision) {
  if ((decision.signals || []).includes('研究/认知诉求')) return '';
  // 2026-08-03 补：验收/品味/对齐/一致性 —— 实现后评审实测这四类评审意图零命中，
  // 「对一下 PRD、原型和 figma」还会被 MULTI 误导到 /brainstorm、/figma-layer（去写 PRD 或搭 Figma）。
  // 「对齐/一致性」收窄为复合词，避免撞「对齐设计稿」这类生产意图。
  if (!/评审|复审|审一遍|审查一下|复查一下|复查一遍|把关一下|挑毛病|有什么问题|有没有问题|给点建议|给些建议|验收一下|做一次验收|交付验收|品味检查|跑一次品味|对齐检查|一致性检查|是否一致|对不对得上|(^|[^a-z])review([^a-z]|$)/i.test(prompt)) return '';
  return '\n[route-guard] 🔎 评审请求信号——先判**评审对象**（代码/设计文档/页面/skill 产出/翻案）再定形态，别被上面的词表命中带偏：全文 .claude/skill-os/routing-chain-check.md R4（资产索引非决策树，对不上时自建评审编排；证据标准在那里，是下限不是上限）。';
}

function decisionToHints(decision) {
  switch (decision.decision) {
    case 'NEEDS_CONTEXT':
      return [`[route-guard] 🧭 NEEDS CONTEXT — ${decision.message}`];
    case 'PROJECT_STOP': {
      const base = `[route-guard] 🧭 PROJECT GATE — ${decision.message}` + reviewAxisHint(decision);
      if (!decision.planHint) return [base];
      return [base + `\n[route-guard] 🧠 复杂度分 ${decision.complexityScore}（${(decision.signals || []).join('、')}）≥6：确认项目后必须先读 .claude/agents/plan-agent.md 走 Plan Agent，禁止直接进单个 skill。`];
    }
    case 'PROJECT_SWITCH': {
      // 框架自维护碰撞（2026-07-31）：产品线名同时是项目名时（如 muse），"清理/评审 muse 的 hook"
      //   会命中命名即切换，而 meta/框架 session 明令不得 switch（踩并行 session 指针）。加信息不改
      //   决策：命中框架路径/制品词时提醒这条例外，由模型判断自己是不是框架 session。
      //   正则**必须与 M3 豁免的第二条件同集**（:220）——两处对"什么算框架制品"的口径分叉，
      //   就会出现"豁免认它是框架活、警示却不认"的盲区（实测"评审一下 muse 工具通道的 hook 改动"
      //   曾漏警示，因当时少了 hook|路由 两词）。改一处必须同改另一处。
      const frameworkSelfMaint = /\.claude\/hooks|memory\/scripts|scripts\/|\.mjs|\.py|luca_gstack|路由|hook|框架自/i.test(prompt)
        ? '\n[route-guard] ⚠️ 同时命中框架路径/制品词：若本 session 是框架/meta 维护（非该项目的产品工作），**不要 switch**（会踩并行 session 的激活指针），直接在框架检出上作业。'
        : '';
      const operation = decision.operation === 'new' ? 'new' : 'switch';
      const command = decision.projectMutation
        || `./scripts/project.sh ${operation} ${decision.project} --session-id <sid> --tx <missing> --expected-epoch <missing>`;
      const base = `[route-guard] 🧭 PROJECT GATE — ${decision.message}\n本轮是 SWITCH_ONLY；只执行这一条事务命令，成功后立即结束本轮：${command}` + frameworkSelfMaint + reviewAxisHint(decision);
      if (!decision.planHint) return [base];
      return [base + `\n[route-guard] 🧠 复杂度分 ${decision.complexityScore}（${(decision.signals || []).join('、')}）≥6：切换后先走 Plan Agent。`];
    }
    case 'FRAMEWORK_FLOW': {
      if (decision.flow === 'engineering-delivery') {
        return [
          '[route-guard] 🧩 ENGINEERING DELIVERY PRESET — 用户已显式选择可选 preset；这只是 routing metadata，不授予写入、Git、网络或 external effect authority。\n' +
          '读取 optional-workflow-graph.yaml 的 engineering-delivery 建议边，以 compile-only selection envelope 进入 Plan Agent；不跳过 canonical tech-spec/task-plan gate，不预造代码 U-ID。\n' +
          '最终 task-plan SHA-256 冻结后，由 Plan Agent 编译 exact U-ID，用户对同一 SHA/baseline/U-ID/path/effect/assertion payload 再次确认后才能交 Orchestrator。',
        ];
      }
      const modeHint = decision.mode === 'benchmark'
        ? '模式 2（对标深评）：先完整读取 .claude/skill-os/evolution/BENCHMARK-RUNBOOK.md，按 inventory→matrix→rubric→红队→复审→人类 GATE 执行。'
        : '模式 1/1b（演进 scout）：先读取 .claude/skill-os/evolution/CHECKPOINT.md；Claude 用 Workflow framework-evolution-scout，Codex 用 .codex/workflow-runner.mjs 等价执行。';
      return [
        `[route-guard] 🧬 FRAMEWORK FLOW — 高置信命中顶层流程 ${decision.flow}（${decision.mode}）。\n` +
        `${modeHint}\n` +
        'deepresearch / quick-research 只作为流程内部的证据采集阶段，不得替代顶层自成长流程；框架/meta session 不切换下游项目。',
      ];
    }
    case 'PLAN_MODE':
      if ((decision.recommendedSkills || []).includes('/wayfinder')) {
        return [
          `[route-guard] 🧠 PLAN MODE — 检测到复杂任务信号（${decision.signals.join('、')}，总分 ${decision.complexityScore}）；同时满足 huge AND multi-session AND fog。\n` +
          '仍为 PLAN MODE，不降级为 SINGLE_SKILL。必须先读取 .claude/agents/plan-agent.md，由 Plan Agent 重验三条件后才可进入具名 /wayfinder mode。\n' +
          '等用户确认计划后，再进入 Orchestrator 模式执行。',
        ];
      }
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
      const base = `[route-guard] ✅ 高置信命中 → 建议调用${prefix}${decision.skill}` + reviewAxisHint(decision);
      // 直呼+复杂内容（B-F1）：直呼已归还，复杂度以提醒附加，权威口径仍是 plan-agent.md。
      if (!decision.planHint) return [base];
      return [base + `\n[route-guard] 🧠 复杂度分 ${decision.complexityScore}（${(decision.signals || []).join('、')}）≥6：直呼已尊重；执行前按 plan-agent.md 触发条件表自查，满足任一先出计划。`];
    }
    case 'MULTI_SKILL':
      // 2026-08-03：MULTI 同样挂评审钉。实现后评审实测「对一下 PRD、原型和 figma 是否一致」
      // 落 MULTI → 候选是 /brainstorm、/figma-layer（生产类 skill），会把一个评审请求
      // 导向"去写 PRD / 去搭 Figma"。候选相近时评审提示比在单命中时更需要。
      return [
        '[route-guard] 🔀 MULTI — 路由命中多个候选（权重相近，无法自动决策）。\n' +
        '你必须在执行任何操作前，先主动询问用户选择哪个 skill，禁止自行判断。\n' +
        `候选列表（供用户选择）：${decision.candidates.join(', ')}` + reviewAxisHint(decision),
      ];
    case 'STOP': {
      const softCandidates = decision.softCandidates || [];
      const candidateHint = softCandidates.length
        ? '\n基于语义推断，最可能的 skill：\n' +
          softCandidates.map((c, i) =>
            `  ${i + 1}. ${c.skill}（参考词：${c.tokens.join('、')}）`
          ).join('\n') +
          '\n语义映射清晰可按 CLAUDE.md「语义路由契约」直接路由；否则展示候选请用户确认或补充。'
        : '\n参考选项：/auto（自动识别全流程）、/office（查看所有 skill）、或请用户补充描述。\n无语义依据时禁止未询问自行执行；语义映射清晰 → 按 CLAUDE.md「语义路由契约」路由（平凡任务豁免适用）。';
      // 2026-07-12：STOP 决策已带 complexityScore（buildDecision:485）。有激活项目 + 复杂度信号>0 时，
      // 确定性提醒走语义路由契约（别把 STOP 当"直接执行"）——把 CLAUDE.md 契约从纯靠模型记性变成有提示钉。
      // 2026-07-28：研究轴与构建轴分文案。同一颗钉子，但"搞懂某事"和"做某事"该被提醒的
      // 下一步不同——构建轴指向 Plan Agent，研究轴指向研究三档选档。
      // 2026-07-31：评审轴走共享 helper reviewAxisHint（STOP 与 PROJECT GATE 两路复用，见其上注释）。
      const researchAxis = (decision.signals || []).includes('研究/认知诉求');
      const reviewReminder = reviewAxisHint(decision);
      const complexReminder = (decision.complexityScore > 0 && decision.hasActiveProject)
        ? (researchAxis
          ? `\n[route-guard] 🔬 研究/认知信号 ${decision.complexityScore}（${(decision.signals || []).join('、')}）——这是"搞懂某事"类诉求，别按 STOP 自己裸奔 WebSearch：按 CLAUDE.md「语义路由契约」在研究三档里选档（单点读一手源 → /quick-research；广域多源/需交叉验证 → /deepresearch；竞品·UX·先例 → /ux-research），或显式写出为何三档都不走。注意：harness 的"别自作主张上 deep-research"只管"别升重型编排"，**不豁免"这题属不属于 research"**。`
          : `\n[route-guard] 🧠 复杂度信号 ${decision.complexityScore}（${(decision.signals || []).join('、')}）——像实质功能/代码需求，别按 STOP 直接执行：按 CLAUDE.md「语义路由契约」评估该命中的 skill/流程，并过 Plan Agent 5 条件。`)
        : '';
      return [
        '[route-guard] ❓ STOP — 路由置信度低（无完整关键词命中）。' + candidateHint + reviewReminder + complexReminder,
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
let topLevelProjectState = null;
let injectProjectOnThisTurn = false;
let projectStateError = '';
if (!dryRun && prompt && hookSessionId) {
  try {
    let current = readProjectState(projectRoot, hookSessionId).value;
    if (current.state === 'TURN_ACTIVE') {
      current = closeProjectTurn({
        gstackRoot: projectRoot, projectsRoot: PROJECTS_ROOT, sessionId: hookSessionId,
        turnId: current.turn.turn_id, expectedEpoch: current.turn.epoch, outcome: 'next-user-prompt',
      });
    } else if (current.state === 'BOUND' && current.terminal) {
      injectProjectOnThisTurn = true;
      current = closeSwitchTurn({
        gstackRoot: projectRoot, projectsRoot: PROJECTS_ROOT, sessionId: hookSessionId,
        turnId: current.terminal.turn_id, expectedEpoch: current.binding.epoch, outcome: 'next-user-prompt',
      });
    } else if (current.state === 'SWITCH_ONLY') {
      current = cancelProjectSwitch({ gstackRoot: projectRoot, projectsRoot: PROJECTS_ROOT, sessionId: hookSessionId });
    }
    topLevelProjectState = current;
    runtimeCurrentProject = validatedBindingForState(current, PROJECTS_ROOT)?.project || '';
    if (current.state === 'NO_PIN') {
      try { unlinkSync(join(projectRoot, '.claude', `.session-inherited-${hookSessionId}`)); } catch { }
    }
  } catch (error) {
    projectStateError = String(error?.message || error);
  }
}

let decision = null; // 提升到外层：pin 层（另一 if 块）需读它判定"命名即切换自切"
if (prompt) {
  decision = buildDecision(prompt);
  if (dryRun) {
    process.stdout.write(JSON.stringify(decision, null, 2) + '\n');
    process.exit(0);
  }
  if (hookSessionId) {
    try {
      if (projectStateError) throw new Error(projectStateError);
      const current = topLevelProjectState || readProjectState(projectRoot, hookSessionId).value;
      const binding = validatedBindingForState(current, PROJECTS_ROOT);
      const named = listProjects().find(name => nameMatchesIn(projectIdentityText(prompt), name));
      // A display symlink is never enough to bind a no-pin session. Explicitly
      // naming that same display project still creates a real switch transaction.
      if (named && !binding && decision.decision !== 'PROJECT_SWITCH') {
        decision = {
          ...decision,
          decision: 'PROJECT_SWITCH',
          projectAction: 'switch_existing_project',
          project: named,
          message: `为本 session 事务绑定 ${named} 后再继续。`,
        };
      }

      if (decision.decision === 'PROJECT_SWITCH' && decision.project) {
        const operation = decision.operation === 'new' ? 'new' : 'switch';
        const prepared = prepareProjectSwitch({
          gstackRoot: projectRoot,
          projectsRoot: PROJECTS_ROOT,
          sessionId: hookSessionId,
          operation,
          target: decision.project,
          turnId: hookTurnId,
        });
        const sw = prepared.switch;
        decision = {
          ...decision,
          tx: sw.tx,
          expectedEpoch: sw.expected_epoch,
          projectMutation: `./scripts/project.sh ${sw.operation} ${sw.target} --session-id ${hookSessionId} --tx ${sw.tx} --expected-epoch ${sw.expected_epoch}`,
        };
        try { unlinkSync(join(projectRoot, '.claude', `.session-inherited-${hookSessionId}`)); } catch { }
        try { unlinkSync(join(projectRoot, '.claude', `.session-projnag-${hookSessionId}`)); } catch { }
      } else {
        const opened = beginProjectTurn({
          gstackRoot: projectRoot,
          projectsRoot: PROJECTS_ROOT,
          sessionId: hookSessionId,
          turnId: hookTurnId,
        });
        if (opened.state === 'TURN_ACTIVE') {
          const activeState = join(opened.binding.realpath, '.luca', 'workflow-state.yaml');
          if (existsSync(activeState)) {
            const content = readFileSync(activeState, 'utf8');
            const match = content.match(/^  (\w[\w-]+):\s*\n\s+status:\s*IN_PROGRESS/m);
            if (match) hints.push(`[route-guard] ⚠️  当前有未完成节点: ${match[1]}`);
          }
          if (injectProjectOnThisTurn) {
            const memory = join(opened.binding.realpath, '.luca', 'memory', 'MEMORY.md');
            const context = join(opened.binding.realpath, 'CONTEXT.md');
            if (existsSync(memory)) {
              const text = readFileSync(memory, 'utf8');
              if (/^- /m.test(text)) hints.push(`[route-guard] 🧠 项目本地记忆（${opened.binding.project}）:\n${text}`);
            }
            if (existsSync(context)) {
              const lines = readFileSync(context, 'utf8').split('\n').slice(0, 100);
              const hasRealContent = lines.some(line => !/^(#|>|<!--|\s*$)/.test(line) && !line.includes('<'));
              if (hasRealContent) hints.push(`[route-guard] 📌 项目 CONTEXT（${opened.binding.project}）:\n${lines.join('\n')}`);
            }
          }
        }
      }
    } catch (error) {
      hints.push(`[route-guard] ⛔ PROJECT STATE — ${String(error?.message || error)}。本轮不得访问项目路径。`);
    }
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
  // 4c（claude5-unhobble）：20/40/每20、100 封顶；harness 已原生自动摘要，不再建议 /compact
  if (turns === 20 || turns === 40 || (turns > 40 && turns % 20 === 0 && turns <= 100)) {
    hints.push(`[route-guard] 📋 Checkpoint 提醒：已进行 ${turns} 轮对话，建议写入 Checkpoint。`);
    // 2026-08-03 低频治理 skill 确定性下沉：retro/evals 的需求时刻（大流程收尾）没有产物信号，
    // 靠"自觉想起"实证不可靠（同日实证：提取 6/6 次全靠 Stop hook 强制、零次自觉）。
    // 长 session 提醒是它们唯一的确定性通道；40 轮起提示（20 轮的 session 多半还没到收尾）。
    if (turns >= 40) {
      hints.push(`[route-guard] ↳ 长 session 治理：若本 session 已完成完整流程链/重大交付，收尾前考虑 retro 复盘（隐藏 skill，按名调用）；workflow 模式下各节点指标记录归 evals。`);
    }
  }

}

// ── 单真值源 behind 兜底提醒（2026-07-16 luca 点名）：落后 tracking 分支即每条消息提醒，
// pull 后自动消失。只查本地 ref（~10ms，fetch 由 session-restore 后台刷新 + verify S23 负责）。fail-open。
try {
  const gitOpt = { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
  const up = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', gitOpt).trim();
  const behind = parseInt(execSync(`git rev-list --count HEAD..${up}`, gitOpt).trim(), 10);
  if (behind > 0) hints.push(`[route-guard] ⬇️ 本检出落后 ${up} ${behind} 条——动框架前请先 git pull（单真值源纪律，pull 后本提醒消失）。`);
} catch {}

if (hints.length > 0) process.stdout.write(hints.join('\n') + '\n');
