#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import assert from 'assert/strict';

const baseEnv = {
  ...process.env,
  ROUTE_GUARD_DRY_RUN: '1',
  ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示',
  ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示',
  // G4-R6: 显式钉空——HEAVY set 现由 env 初始化，若开发者 shell/CI 恰好导出该变量会污染
  // 默认用例（假红/假绿）。注入用例通过 extraEnv 覆盖。
  ROUTE_GUARD_HEAVY_SKILLS: '',
  // 2026-07-13 fable review A-F1 同款：route-guard 的 projectRoot 优先读 CLAUDE_PROJECT_DIR，
  // session 锚在别的仓时会用错误仓的路由词表评本仓 golden（假红/假绿）。钉到本仓。
  CLAUDE_PROJECT_DIR: process.cwd(),
};

function route(prompt, extraEnv = {}) {
  const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
    cwd: process.cwd(),
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    env: { ...baseEnv, ...extraEnv },
  });
  assert.equal(result.status, 0, result.stderr);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Expected JSON dry-run output for ${prompt}, got:\n${result.stdout}\n${result.stderr}`);
  }
}

function loadScopeMatrixFixtures() {
  return readFileSync('memory/evals/routing/fixtures.jsonl', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => JSON.parse(line))
    .filter(row => row.matrix === 'U-003');
}

function expectScopeMatrixDecision(fixture, decision) {
  if (fixture.expected === 'PLAN_MODE') {
    assert.equal(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
    return;
  }
  if (fixture.expected.startsWith('project:switch:')) {
    assert.equal(decision.decision, 'PROJECT_SWITCH', `got ${decision.decision}`);
    assert.equal(decision.project, fixture.expected.slice('project:switch:'.length));
    return;
  }
  assert.equal(fixture.expected, 'NEEDS_CONTEXT');
  assert.equal(decision.decision, 'NEEDS_CONTEXT', `got ${decision.decision}`);
  assert.equal(decision.projectAction, 'clarify_framework_or_project_scope');
}

const cases = [
  {
    name: 'explicitly named new project declaration reaches operation:new',
    prompt: '新建项目 beta',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_SWITCH');
      assert.equal(decision.projectAction, 'create_new_project');
      assert.equal(decision.operation, 'new');
      assert.equal(decision.project, 'beta');
    },
  },
  {
    name: 'quoted new project name with spaces remains deterministic',
    prompt: '创建一个名为「客户 成功」的新项目',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_SWITCH');
      assert.equal(decision.operation, 'new');
      assert.equal(decision.project, '客户 成功');
    },
  },
  {
    name: 'unnamed new project remains a human gate even with an active project',
    prompt: '新项目想做用户管理',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'confirm_new_project_name');
    },
  },
  {
    name: 'ambiguous new project names remain a human gate',
    prompt: '新建项目 alpha 或 beta',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'confirm_new_project_name');
    },
  },
  {
    name: 'new declaration colliding with an existing identity requires a human choice',
    prompt: '新建项目 luca-dev',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'new_project_name_conflict');
    },
  },
  {
    name: 'ambiguous demand asks project context before idea',
    prompt: '我想做一个需求',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'clarify_project_scope');
    },
  },
  {
    // Audit 2026-05-28 C1: with active project, "我想做一个 X" (X 不是泛词
    // "需求/项目") 现行实现 (route-guard.mjs:187 守护 !currentProject) 让其
    // fall through 到 skillDecision；具体 domain 词无 trigger 命中 → STOP。
    // 主 Claude 应在 STOP 时询问用户是否新建项目/继续。
    name: 'new natural idea with active project falls through to STOP',
    prompt: '我想做一个客户跟进助手',
    expect: decision => {
      assert.equal(decision.decision, 'STOP', `got ${decision.decision}`);
    },
  },
  {
    name: 'old project wording asks which existing project',
    prompt: '我要对老项目进行优化',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'select_existing_project');
      assert.deepEqual(decision.projects, ['luca-dev', 'ai 宠物提示']);
    },
  },
  {
    name: 'last project wording asks which existing project',
    prompt: '接着上次的项目做 UX评审',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'select_existing_project');
    },
  },
  {
    name: 'existing project variant asks which existing project',
    prompt: '已有的项目 需求分析',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'select_existing_project');
    },
  },
  {
    name: 'previous one wording asks which existing project',
    prompt: '之前那个 任务计划',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'select_existing_project');
    },
  },
  {
    // Fix: an audit-verb (查看/看看/评估…) query that NAMES an existing project
    // must still trigger the Project Gate switch, not be short-circuited by the
    // C2 meta-verb exemption (红线 SC-20260523-002).
    name: 'audit-verb naming an existing project switches, not C2-exempted',
    prompt: '查看 luca-dev 的列表页 UX 问题',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_SWITCH', `got ${decision.decision}`);
      assert.equal(decision.project, 'luca-dev');
    },
  },
  {
    // Guard the other side: audit-verb with NO existing project named stays
    // C2-exempt (framework/meta question) — must not force the Project Gate.
    name: 'audit-verb without a named project stays C2-exempt',
    prompt: '查看 route-guard 的实现逻辑',
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_SWITCH', `got ${decision.decision}`);
      assert.notEqual(decision.decision, 'PROJECT_STOP', `got ${decision.decision}`);
    },
  },
  {
    name: 'named existing project is handled before skill routing',
    prompt: '继续 luca-dev 的任务计划',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_SWITCH');
      assert.equal(decision.projectAction, 'switch_existing_project');
      assert.equal(decision.project, 'luca-dev');
    },
  },
  {
    name: 'complex current-project work enters plan mode',
    prompt: '在当前项目里整体规划 Obsidian + 飞书 + 定时推送系统',
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE');
      assert.ok(decision.complexityScore >= 6);
    },
  },
  {
    // #16 (benchmark debate): lower-bound negative anchor — guards the >=6 gate
    // against being silently lowered. '帮我做个整体规划' fires only 规划意图 (w3) =>
    // score 3 < 6, must NOT be PLAN_MODE. If the threshold erodes toward <=3 this
    // flips to PLAN_MODE and fails loudly. The suite previously had no <6 anchor.
    name: 'single weak complexity signal stays below plan-mode threshold',
    prompt: '帮我做个整体规划',
    expect: decision => {
      assert.ok(decision.complexityScore < 6, `expected complexityScore <6, got ${decision.complexityScore}`);
      assert.notEqual(decision.decision, 'PLAN_MODE');
    },
  },
  {
    // #16 (benchmark debate): weight-degradation sentinel pinned at EXACTLY 6.
    // '把飞书数据库定时推送给我' fires 多模块(w3)+跨系统集成(w3)=6 => PLAN_MODE.
    // Pinned ===6 so any silent drift in either signal's weight (the git 10ba339
    // class of weight edits the old suite caught zero of) breaks this and forces
    // a deliberate review + pin update.
    name: 'two w3 complexity signals sum to exactly the plan-mode threshold',
    prompt: '把飞书数据库定时推送给我',
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE');
      // Tight golden pin: ONLY 多模块(w3)+跨系统集成(w3) fire => exactly 6. Pinning
      // the signal set (not just the score) makes any drift — a weight change OR a
      // new signal matching this prompt's tokens — fail loudly with the actual
      // signals/score printed, so the reviewer sees exactly what moved.
      assert.deepEqual([...decision.signals].sort(), ['多模块', '跨系统集成'].sort());
      assert.equal(decision.complexityScore, 6);
    },
  },
  {
    name: 'page review routes to ux-audit',
    prompt: '评审这个页面有什么 UX 问题',
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/ux-audit');
    },
  },
  {
    name: '2026-07-03: magicpath demoted to hidden (full-review P2-6, zero 30-day use) — direct interface wording now STOPs, no keyword left to match',
    prompt: '直接产出一个线索管理界面',
    expect: decision => {
      assert.equal(decision.decision, 'STOP');
    },
  },
  {
    name: 'html prototype routes explicitly',
    prompt: '生成 HTML 原型',
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/html-prototype');
    },
  },
  {
    name: '2026-07-03: figma prototype wording — magicpath demoted, /html-prototype now wins alone (no more multi-candidate)',
    prompt: '做一个 Figma 原型界面',
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/html-prototype');
    },
  },
  {
    name: 'greeting stays quiet',
    prompt: '你好',
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  // --- G3 (2026-07-04) 对话延续/状态询问豁免：>5字 check-in 不再 STOP/PROJECT_STOP ---
  {
    name: 'G3: 现在进度如何 (6字check-in) → NONE，不再 PROJECT_STOP',
    prompt: '现在进度如何',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE', `check-in 应静默，got ${decision.decision}`);
    },
  },
  {
    name: 'G3: 全部做完了吗 (6字check-in，无项目态) → NONE',
    prompt: '全部做完了吗',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3: 现在怎么样了 → NONE',
    prompt: '现在怎么样了',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3 反例: 继续做个原型 (含实义任务词) → 照常路由 /html-prototype',
    prompt: '继续做个原型',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'testproj' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/html-prototype');
    },
  },
  {
    name: 'G3 保护面: 无 pin 时继续做原型仍须先绑定项目',
    prompt: '继续做个原型',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'choose_new_or_existing');
    },
  },
  {
    name: 'G3 反例: 继续项目 → 仍走老项目 PROJECT_STOP（上游专有检查先赢）',
    prompt: '继续项目',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
    },
  },
  {
    name: 'G3: 长续接句不因长度被当成新项目任务',
    prompt: '把昨天没写完的那个报告接着写完整理好',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3: 对上一轮判断的纠正保持静默',
    prompt: '我认为这个判断不对，你再检查一下触发逻辑',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3: 要求换成易懂说法保持静默',
    prompt: '说我能听懂的话',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3: 框架 hook 讨论不消费下游项目上下文',
    prompt: '先第一性原理定义是不是问题。其他hook有没有相关问题',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3: 转述 route-guard 输出时不把输出里的项目词当成用户项目意图',
    prompt: 'UserPromptSubmit hook (completed) hook context: [route-guard] PROJECT GATE — 当前没有激活项目，请先确认新项目还是继续老项目。这个hook每次在中间对话都会出现，请检查触发逻辑。',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  {
    name: 'G3 保护面: 明确的无 pin 项目修改仍触发 Project Gate',
    prompt: '帮我修改登录页面的交互',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'choose_new_or_existing');
    },
  },
  {
    name: 'G3 反担保: 描述页面现状不是项目修改请求',
    prompt: '这个页面做得挺好，不用改',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP');
    },
  },
  // --- G3-C2 latin 词边界：产品名子串不再误报 soft candidate ---
  {
    name: 'G3-C2: designer 不得诱发 design 系 soft candidate',
    prompt: '帮我看看那位designer的排期表怎么安排',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'testproj' },
    expect: decision => {
      assert.equal(decision.decision, 'STOP');
      const skills = (decision.softCandidates || []).map(c => c.skill).join(',');
      assert.ok(!/design/.test(skills), `designer 子串不应产出 design 系候选: ${skills}`);
    },
  },
  {
    name: 'G3-C2: 提到 claude 一词不得诱发 claude-api soft candidate',
    prompt: '记录一下这次和claude协作的心得体会',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'testproj' },
    expect: decision => {
      const skills = (decision.softCandidates || []).map(c => c.skill).join(',');
      assert.ok(!/claude-api/.test(skills), `claude 子串不应产出 claude-api 候选: ${skills}`);
    },
  },
  // --- G3-C3 claude 从复杂度信号词除名 ---
  {
    name: 'G3-C3: 用 claude 分析 api 文档 → 不再计多模块信号',
    prompt: '在当前项目用 claude 分析这个 api 文档',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'testproj' },
    expect: decision => {
      assert.ok(!(decision.signals || []).includes('多模块'),
        `claude+api 不应再凑成多模块信号: ${JSON.stringify(decision.signals)}`);
    },
  },
  // --- ADR-0002 negative cases: longest-match-wins disambiguation ---
  {
    name: '设计调研 routes ux_research, NOT deepresearch (调研⊂设计调研)',
    prompt: '帮我做一下设计调研',
    expect: decision => {
      // G4 (2026-07-04): HEAVY set 母版默认空 → ux-research 关键词命中现在是 SINGLE_SKILL
      // （此前 heavy orchestrator 会升 PLAN_CHECK；.skill 字段两态都带，故此断言跨改动稳定）。
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/ux-research');
      assert.ok(!decision.candidates.includes('/deepresearch'),
        `deepresearch should be shadowed, got ${JSON.stringify(decision.candidates)}`);
    },
  },
  {
    // ADR-0002 weight guard: 网页[web_access w9] is NOT shadowed by the longer
    // 访问网页[agent_browser w7], because the longer trigger's route is LOWER
    // weight. web_access wins by weight (baseline behavior preserved); the
    // guard never silently drops the higher-weight candidate.
    name: '访问网页: higher-weight web_access not shadowed by lower-weight agent_browser',
    prompt: '帮我访问网页看看内容',
    expect: decision => {
      assert.ok(decision.candidates.includes('web-access'),
        `web_access (w9) must survive, got ${JSON.stringify(decision.candidates)}`);
    },
  },
  {
    // ADR-0002 REGRESSION GUARD (quality-gate HIGH finding): 多维表格[lark_base
    // w9] ⊂ 飞书多维表格[lark_sheets w9] are EQUAL weight. Generic longest-match
    // would silently drop lark_base → confident WRONG route to lark_sheets. The
    // strict weight guard keeps both → MULTI_SKILL (safe ambiguity), never a
    // silent drop of an equal/higher-weight candidate.
    name: '飞书多维表格 keeps lark_base candidate (equal-weight tie not shadowed)',
    prompt: '用飞书多维表格做个数据看板',
    expect: decision => {
      assert.ok(decision.candidates.includes('lark-base'),
        `lark_base must NOT be silently dropped, got ${JSON.stringify(decision.candidates)}`);
    },
  },
  {
    // KNOWN LIMITATION (deferred to ADR-0005): the English substring-in-word
    // case is NOT fixed by this stopgap. normalize() strips spaces, so a \b
    // check would also kill legitimate multi-word phrases like "deep research".
    // This case documents that research-proof STILL misfires deepresearch.
    name: 'KNOWN LIMITATION: research-proof still fires deepresearch (ADR-0005)',
    prompt: 'please research-proof this sentence',
    expect: decision => {
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  {
    name: 'CJK 调研 keyword still fires deepresearch (true positive preserved)',
    prompt: '帮我做一个全面调研',
    expect: decision => {
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  // ─────────────────────────────────────────────────────────────────────────
  // Audit 2026-05-28: regression cases for the 8 routing scenarios.
  // Each maps to a specific finding in .claude/audit/2026-05-28-...md §2.
  // Some are EXPECTED to FAIL until their corresponding Phase 3-9 is applied;
  // they are listed in failing order to surface real implementation gaps.
  // ─────────────────────────────────────────────────────────────────────────
  {
    // Audit C2: meta/audit task should NOT be blocked by Project Gate.
    name: 'audit meta task escapes project gate (no current project)',
    prompt: '评估当前路由是否合理',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP',
        `meta task must escape project gate, got ${decision.decision}`);
    },
  },
  {
    // Audit C2: why-question is a meta task too.
    name: 'meta why-question escapes project gate (no current project)',
    prompt: '为什么这次没触发 plan mode',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP',
        `meta why-question must escape project gate, got ${decision.decision}`);
    },
  },
  {
    // Audit M2: content-tool skill (/idea) is standalone-capable; should not
    // be short-circuited by Project Gate when no current project.
    name: 'idea standalone allowed without project (会议纪要)',
    prompt: '会议纪要整理需求',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/idea');
    },
  },
  {
    name: 'handoff slash command works without an active project',
    prompt: '/handoff',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/handoff');
    },
  },
  {
    name: 'handoff Codex skill syntax works without an active project',
    prompt: '$' + 'handoff 给下个 session',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/handoff');
    },
  },
  {
    name: 'handoff slashless command alias works without an active project',
    prompt: 'handoff',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/handoff');
    },
  },
  {
    name: 'explicit Chinese session-transfer intent routes to handoff without a project',
    prompt: '把当前会话交给下一个 agent',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/handoff');
    },
  },
  {
    name: 'handoff-protocol mention does not trigger the session handoff skill',
    prompt: '检查 handoff-protocol 的规则',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.skill, '/handoff');
    },
  },
  {
    name: 'generic task delegation does not trigger the session handoff skill',
    prompt: '把这个任务交给下一个 agent',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.skill, '/handoff');
    },
  },
  {
    name: 'workflow handoff artifact mention does not trigger the session handoff skill',
    prompt: '检查 ' + 'do' + 'cs/handoff 里的 workflow handoff',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.skill, '/handoff');
    },
  },
  {
    // 2026-07-03: compare demoted to hidden (full-review P2-6) — no trigger left,
    // so this prompt falls through to STOP. The M2 content-tool exemption (比较一下)
    // still keeps it out of the project gate, which is the half worth pinning.
    name: 'compare hidden since 2026-07-03 — M2 exemption keeps it out of project gate, no trigger left → STOP',
    prompt: '比较一下两个方案',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'STOP',
        `hidden compare prompt should fall through to STOP, got ${decision.decision}`);
    },
  },
  {
    // Audit C3: explicit user request for plan should enter PLAN_MODE.
    // plan-agent.md:38 lists this as the 5th trigger condition but
    // route-guard has no detection for "先做个计划/plan 一下/想清楚再做".
    name: 'explicit user plan request triggers PLAN_MODE',
    prompt: '先做个计划再说',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE',
        `explicit plan request must enter PLAN_MODE, got ${decision.decision}`);
    },
  },
  {
    // Audit M3: short-but-explicit complex new requirement should also trigger
    // PLAN_MODE/planHint. Current capHits >= 4 misses UI vocab (登录/权限/
    // 头像/侧边栏) which are real complexity signals.
    name: 'short complex new requirement triggers PLAN_MODE/planHint',
    prompt: '新项目想做用户管理，需要登录、权限、头像、侧边栏功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      const ok = decision.decision === 'PLAN_MODE'
        || (decision.decision === 'PROJECT_STOP' && decision.planHint === true);
      assert.ok(ok, `expected PLAN_MODE or PROJECT_STOP+planHint=true, got ${JSON.stringify(decision)}`);
    },
  },
  {
    // 2026-07-03 (full-review P2-5): /auto removed from HEAVY_ORCHESTRATOR_SKILLS —
    // it now resolves to SINGLE_SKILL, letting /auto's own internal Step 2 Plan
    // Output gate (Hierarchical ≥3 Phase) be the single confirmation point instead
    // of stacking a redundant external PLAN_CHECK before /auto even starts.
    name: '全流程做 with active project routes SINGLE_SKILL to /auto (internal Phase gate handles confirmation, not route-guard)',
    prompt: '全流程做客户管理',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/auto');
    },
  },
  // --- G4 (2026-07-04) HEAVY_ORCHESTRATOR_SKILLS 母版默认空 + env 扩展点 ---
  {
    // R7: 钉「新默认」——空 env 下 deepresearch 直呼不再升级 PLAN_CHECK（此前主线零 PLAN_CHECK 断言）
    name: 'G4: 母版默认空 HEAVY set → /deepresearch 直呼是 SINGLE_SKILL，不叠外部 PLAN_CHECK',
    prompt: '/deepresearch',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  {
    // R7: 钉「分支机制」——env 注入成员即恢复 PLAN_CHECK（fork/测试回归该分支的唯一路径）
    name: 'G4: env 注入 ROUTE_GUARD_HEAVY_SKILLS 后 /deepresearch → PLAN_CHECK（扩展点可达）',
    prompt: '/deepresearch',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示', ROUTE_GUARD_HEAVY_SKILLS: 'deepresearch' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_CHECK');
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  {
    // R10: env 自动补全双形态——只写不带斜杠也能命中带斜杠的直呼
    name: 'G4: env 成员不带前导斜杠也命中带斜杠直呼（双形态自动补全）',
    prompt: '/ux-research',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示', ROUTE_GUARD_HEAVY_SKILLS: 'ux-research' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_CHECK');
    },
  },
  // ─────────────────────────────────────────────────────────────────────────
  // 2026-07-12（B：多功能需求门召回修复）：'新项目复杂需求'→'多功能需求'，前缀锁改为
  // build/add 意图门 + 双阈值（capHits>=4 || (enum>=2 && capHits>=1)），覆盖已有项目。
  // ─────────────────────────────────────────────────────────────────────────
  {
    // 正向：已有项目里的自然口语多功能需求，此前得 0 分 → STOP，现在应 PLAN_MODE（caps>=4 路径）。
    name: 'B: 已有项目多功能需求（caps>=4）触发 PLAN_MODE',
    prompt: '帮我加上订单查询、库存管理、报表导出三个功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok((decision.signals || []).includes('多功能需求'),
        `应含 多功能需求 信号: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 顿号路径独立锚：capHits 不足 4，靠 enum>=2 && capHits>=1 触发——单独钉住枚举分支。
    name: 'B: 顿号枚举路径（enum>=2 + capHits>=1）触发 PLAN_MODE',
    prompt: '帮我新增 收藏夹、分享、评论 三个功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok((decision.signals || []).includes('多功能需求'),
        `应含 多功能需求 信号: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 下界负锚（防未来 cap 词表扩张把单功能编辑静默推进 PLAN_MODE；哲学同上面 '帮我做个整体规划' <6）：
    // '加个登录按钮' 命中 trigger 加个，但 capHits=2（登录/按钮）、顿号=0 → 不触发多功能需求。
    name: 'B 下界负锚: 单功能编辑（加个登录按钮）不得进 PLAN_MODE',
    prompt: '帮我加个登录按钮',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok(decision.complexityScore < 6, `expected <6, got ${decision.complexityScore}`);
      assert.notEqual(decision.decision, 'PLAN_MODE');
      assert.ok(!(decision.signals || []).includes('多功能需求'),
        `单功能不应触发多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 刻意取舍文档化：裸名词枚举（无 build/add 动词）拿不到分 → STOP，由 CLAUDE.md 语义路由契约兜底，
    // 非 B 兜底。钉住"TRIGGER 门"这个取舍，防未来有人误以为它该被 B 命中。
    name: 'B 取舍: 裸枚举无动词（订单查询、库存管理、报表导出）落 STOP（语义契约兜底）',
    prompt: '订单查询、库存管理、报表导出',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'STOP', `got ${decision.decision}`);
      assert.ok(!(decision.signals || []).includes('多功能需求'),
        `无动词裸枚举不应触发多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 2026-07-13 fable review 反担保：诊断句里的'增加'是叙述不是构建意图——曾实测误升 PLAN_MODE。
    name: 'B 反担保: 诊断句（为什么增加缓存后列表、详情、搜索变慢）不得进 PLAN_MODE',
    prompt: '帮我看看为什么增加了缓存后列表、详情、搜索都变慢了',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok(!(decision.signals || []).includes('多功能需求'),
        `诊断句不应触发多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 同上：事故报告里的'上线之后'是时间状语不是构建意图。
    name: 'B 反担保: 事故报告（上线之后订单、库存、报表都延迟）不得进 PLAN_MODE',
    prompt: '上线之后订单、库存、报表都出现了延迟',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok(!(decision.signals || []).includes('多功能需求'),
        `事故报告不应触发多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  // ─────────────────────────────────────────────────────────────────────────
  // 2026-07-13 fable review 第二轮（冷上下文对抗审查 B 的实证发现）修复锚点。
  // ─────────────────────────────────────────────────────────────────────────
  {
    // B-F1：显式斜杠直呼 = 用户最新明确请求，不被复杂度门替换——复杂度降级为 planHint 附加。
    name: 'B-F1: 斜杠直呼+枚举不被 PLAN_MODE 劫持（直呼归还，planHint 附加）',
    prompt: '/brainstorm 新增登录、权限、导出、通知功能的需求',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL', `got ${decision.decision}`);
      assert.equal(decision.skill, '/brainstorm');
      assert.equal(decision.planHint, true, 'planHint 应为 true（提醒仍在）');
    },
  },
  {
    // B-F1 fork 面：HEAVY 成员的斜杠直呼+复杂内容走 PLAN_CHECK（较软门），不被 PLAN_MODE 压过。
    // extraEnv 为机制测试自包含注入——auto 已于 2026-08-03 移出生产 env（截流实验），
    // 此处保留 auto 作分支机制测试载体（机制本身仍服务 muse-loop-orchestrate），非生产值复现。
    name: 'B-F1: HEAVY 成员直呼+枚举 → PLAN_CHECK（fork 设计恢复，不被 PLAN_MODE 吞）',
    prompt: '/auto 新增订单、库存、报表管理',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示', ROUTE_GUARD_HEAVY_SKILLS: 'auto,muse-loop-orchestrate' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_CHECK', `got ${decision.decision}`);
      assert.equal(decision.skill, '/auto');
    },
  },
  {
    // B-F2：连接词（然后/并且…）不算"真功能词"——占位符枚举+连接词曾击穿 enum 路径。
    name: 'B-F2: 占位符枚举+连接词（红、黄、蓝然后保存）不得进 PLAN_MODE',
    prompt: '帮我加个红、黄、蓝三个主题色，然后保存',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok(!(decision.signals || []).includes('多功能需求'),
        `连接词不应凑成多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // B-F4：会议纪要摄入语境是 /idea 的地盘（纪要天然枚举功能点，非构建请求）。
    name: 'B-F4: 会议纪要+功能枚举 → /idea 不被多功能需求劫持',
    prompt: '帮我把这段会议纪要整理成需求：大家讨论决定新增订单查询、库存管理、报表导出',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL', `got ${decision.decision}`);
      assert.equal(decision.skill, '/idea');
    },
  },
  {
    // B-F5：诊断反担保 v2 改句式框架后，可观测域的构建需求（异常/延迟/报错作为功能名词）
    // 不再被整域压制——召回恢复。
    name: 'B-F5: 可观测域构建需求（监控看板：异常统计、延迟分布…）→ PLAN_MODE 召回恢复',
    prompt: '新增监控看板：展示异常统计、延迟分布、报错列表、故障详情',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE', `got ${decision.decision}`);
      assert.ok((decision.signals || []).includes('多功能需求'),
        `应含多功能需求: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 2026-07-13 web_access 裸'搜索'宽词修复：功能需求含'搜索'二字不再被误路由 web-access。
    name: 'web_access 修复: 加个搜索功能 → 不再误命中 web-access（落 STOP）',
    prompt: '帮我加个搜索功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'STOP', `got ${decision.decision}`);
      assert.ok(!(decision.candidates || []).includes('web-access'),
        `搜索功能不应命中 web-access: ${JSON.stringify(decision.candidates)}`);
    },
  },
  {
    // 意图锚定形召回保留：真联网搜索意图仍确定性可达。
    name: 'web_access 修复: 搜索一下（真检索意图）仍命中 web-access',
    prompt: '帮我搜索一下 React 19 的新特性',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL', `got ${decision.decision}`);
      assert.equal(decision.skill, 'web-access');
    },
  },
  {
    // 2026-07-13 同日复发（信号②）：'查一下'⊂'审查一下'——用户消息"你再审查一下"实测被误路由
    // web-access。≤3 字裸动词短语类修复的第二例（第一例'搜索'）。
    name: 'web_access 复发修复: 审查一下/检查一下 不得误命中 web-access',
    prompt: '你再审查一下，还有问题没有',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok(!(decision.candidates || []).includes('web-access'),
        `审查一下不应命中 web-access: ${JSON.stringify(decision.candidates)}`);
    },
  },
  {
    // 锚定形召回保留：帮我查一下（真查询意图）仍确定性可达。
    name: 'web_access 复发修复: 帮我查一下（真查询意图）仍命中 web-access',
    prompt: '帮我查一下 React 19 什么时候发布',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL', `got ${decision.decision}`);
      assert.equal(decision.skill, 'web-access');
    },
  },
  {
    // 2026-07-28 认知/研究轴（信号②，同族第二次）：7-22 CRM 与 7-28 pi 两次同型失效——
    // harness 注入 "Do not use deep-research unless requested" 被当成豁免、STOP 下裸奔
    // WebSearch。根因：7 个复杂度信号全在构建轴，研究类诉求 score 恒 0，STOP 分支那颗
    // 防"把 STOP 当直接执行"的提示钉永不触发。本组用例锁住新补的研究轴信号。
    name: '研究轴 2026-07-28: 认知类诉求（看框架/有何优势/可借鉴）拿到 score>0 以触发提示钉',
    prompt: '我需要你帮我来看一下pi这个agent它的框架结构是什么？还有没有什么好的优势能让我的lucagstack可能有借鉴的地方。',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok((decision.signals || []).includes('研究/认知诉求'),
        `研究轴信号未命中: ${JSON.stringify(decision.signals)}`);
      assert.ok(decision.complexityScore > 0, `score 须 >0 才能触发提示钉, got ${decision.complexityScore}`);
    },
  },
  {
    // 中间插入宾语的研究句式——"怎么做的"死写法会整条漏掉，实测发现后放宽为"怎么做|如何实现|…"。
    name: '研究轴: 宾语插在中间的句式（怎么做X的 / 如何实现X）不得漏',
    prompt: '帮我了解一下 LangGraph 是怎么做状态管理的',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok((decision.signals || []).includes('研究/认知诉求'),
        `研究轴信号未命中: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // weight 取 2 而非 3 的锚：与"规划意图"(w3) 叠加须停在 5，越过 6 会误升 PLAN_MODE，
    // 把纯理解型诉求强制拖进 Plan Agent。
    name: '研究轴: 与规划意图叠加须 <6，不得误升 PLAN_MODE',
    prompt: '了解一下整体架构设计',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok(decision.complexityScore < 6,
        `叠加后须 <6 否则误升 PLAN_MODE, got ${decision.complexityScore}`);
      assert.notEqual(decision.decision, 'PLAN_MODE');
    },
  },
  {
    // 反担保2：平凡任务豁免不得被研究轴劫持（否则每句"看一下"都挂提示噪声）。
    // 用例刻意让 认知动词∧认知对象 **都命中**（看一下 ∧ 架构/是什么），使其唯一的不命中
    // 理由就是反担保本身——变异测试实证：原用例"看一下这个文件写了什么"是假绿（OBJ 本就
    // 不匹配，拆掉反担保也不转红），换成本句后 M3 变异可正常转红。
    name: '研究轴反担保: 本地文件对象即使谈"架构"也走平凡任务豁免',
    prompt: '看一下这个文件的架构是什么',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok(!(decision.signals || []).includes('研究/认知诉求'),
        `平凡任务不应命中研究轴: ${JSON.stringify(decision.signals)}`);
    },
  },
  {
    // 反担保1：同上，认知动词∧认知对象都命中，唯一拦截理由是诊断语境。
    name: '研究轴反担保: 诊断语境（谈机制但在问为什么报错）不得命中',
    prompt: '看看这个缓存机制为什么会报错',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.ok(!(decision.signals || []).includes('研究/认知诉求'),
        `诊断语境不应命中研究轴: ${JSON.stringify(decision.signals)}`);
    },
  },
  // ── 评审轴 2026-07-31（R4 评审请求分流）──────────────────────────────────
  // 钉住"确定性层"行为：词表增删 + Project Gate 豁免。提示钉在 hints 层（decisionToHints），
  // dry-run 只吐 decision，故此处只测决策；钉的正/负样本走 fixtures.jsonl semantic 层。
  {
    name: '评审轴: 对象绑定词命中 code-review（不被 ux-audit 抢）',
    prompt: '代码评审',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/code-review');
    },
  },
  {
    // preview ⊃ review：正是不收泛动词 `review代码` 的理由，钉住防日后加回来。
    name: '评审轴: preview 句不得命中 code-review（子串碰撞防回归）',
    prompt: '帮我 preview 代码改完的效果',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.notEqual(decision.skill, '/code-review', 'preview 不得被当成 review');
    },
  },
  {
    // 撤裸词「评审」后，页面评审仍须靠复合词直达——这是撤词的安全边界。
    name: '评审轴: 撤泛词后页面评审复合词仍直达 ux-audit',
    prompt: '评审这个页面有什么 UX 问题',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/ux-audit');
    },
  },
  {
    // 零对象泛词已撤：不得再把任意评审意图硬送进强制截图的页面 skill。
    name: '评审轴: 零对象泛词不再误路由到 ux-audit',
    prompt: '这次改动有什么问题吗',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.notEqual(decision.skill, '/ux-audit', '零对象泛词不得硬映射到页面评审 skill');
    },
  },
  {
    // 红线 SC-20260523-002：M3 豁免加 !named 守卫前，这句会 SINGLE 直达并静默吞掉切换。
    name: '评审轴/红线: 点名已有项目的框架动词请求仍须过 Project Gate',
    prompt: '清理一下 muse 里 scripts/ 的死代码',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_SWITCH', '点名项目不得绕 Gate');
      assert.equal(decision.project, 'muse');
    },
  },
  {
    // M3 豁免收评审动词的目的：框架自评审在无激活项目时不被 gate 兜底网吃掉。
    name: '评审轴: 无激活项目 + 框架路径的代码审查不被 Project Gate 截断',
    prompt: '代码审查一下 .claude/hooks/route-guard.mjs 的改动',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP', '框架自评审须能到达路由层');
      assert.equal(decision.skill, '/code-review');
    },
  },
  {
    name: '评审轴: 英文 code review 分支请求命中专用入口',
    prompt: 'code review this branch against the spec',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/code-review');
    },
  },
  {
    name: '模块设计轴: 深模块与 seam 对象命中 codebase-design',
    prompt: '评估订单模块是不是浅模块，seam 应该放在哪里',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/codebase-design');
    },
  },
  {
    name: '模块设计轴: 泛产品接口设计不得误触 codebase-design',
    prompt: '设计一下支付接口页面的用户流程',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.notEqual(decision.skill, '/codebase-design', '无工程模块对象的接口设计不得误触');
    },
  },
  {
    // 大小写轴：M3 豁免读原文 prompt，词表读 normalize 后文本；不加 /i 会"词表中了、豁免没中"。
    name: '评审轴: 大写 Review 的框架自评审同样不被截断（豁免正则 /i）',
    prompt: '代码 Review 一下 scripts/build.mjs 的改动',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP', '大小写变体不得被 gate 吃掉');
    },
  },
  {
    // 框架演进是顶层 workflow；研究只是其证据采集阶段。旧路由只有 skill 命名空间，
    // 因此本句被通用“调研”词稳定压成 /deepresearch，完全绕过 self-evolution 流程。
    name: '框架演进轴: luca_gstack 自我成长对标请求命中顶层 benchmark 流程，而非 /deepresearch',
    prompt: '我要做luca gstack的自我成长，帮我调研一下codex开源了的harness。对比我们的luca gstgack。有什么可以值得借鉴的地方，我需要你进入深度调研模式，进行自我和codex的harness的评估',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'FRAMEWORK_FLOW');
      assert.equal(decision.flow, 'framework-evolution');
      assert.equal(decision.mode, 'benchmark');
    },
  },
  {
    name: '框架演进轴极性: 显式否定下游范围不得反向制造 Project Gate',
    prompt: '这是 luca_gstack 的框架任务，不是下游产品项目任务，保持 NO_PIN，不要触发 Project Gate。执行 framework-evolution Mode 2，深度调研 Codex harness。',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'FRAMEWORK_FLOW');
      assert.equal(decision.flow, 'framework-evolution');
      assert.equal(decision.mode, 'benchmark');
    },
  },
  {
    name: '框架演进轴极性: 禁止激活/确认/切换下游项目仍保持纯框架范围',
    prompt: 'luca_gstack 框架演进：不要激活、确认或切换任何下游项目，执行 framework-evolution Mode 2。',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'FRAMEWORK_FLOW');
      assert.equal(decision.flow, 'framework-evolution');
    },
  },
  {
    name: '框架演进轴极性反担保: 真正的框架与未具名产品项目混合请求仍须澄清',
    prompt: '评估 luca_gstack 框架，并同步改造某个产品项目的页面功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'NEEDS_CONTEXT');
      assert.equal(decision.projectAction, 'clarify_framework_or_project_scope');
    },
  },
  {
    name: '框架演进轴: 用户纠正“应该是自我成长流程”时不再掉进 Project Gate',
    prompt: '我这个不是命中的应该是自我成长流程吗',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'FRAMEWORK_FLOW');
      assert.equal(decision.flow, 'framework-evolution');
    },
  },
  {
    name: '框架演进轴: 显式 framework-evolution-scout 走 scout 模式且无需下游项目',
    prompt: '请运行 framework-evolution-scout',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'FRAMEWORK_FLOW');
      assert.equal(decision.mode, 'scout');
    },
  },
  {
    name: '框架演进轴反担保: 句首显式 /deepresearch 仍尊重用户直呼',
    prompt: '/deepresearch luca gstack 自我成长',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  {
    name: '框架演进轴反担保: Codex 句首显式 $deepresearch 同样尊重用户直呼',
    prompt: '$deepresearch luca gstack 自我成长',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/deepresearch');
    },
  },
  {
    name: '框架演进轴反担保: 下游产品的“用户自我成长功能”不得误进框架流程',
    prompt: '给 crm 项目做用户人格自我成长功能',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.notEqual(decision.decision, 'FRAMEWORK_FLOW');
    },
  },
];

const scopeMatrixFixtures = loadScopeMatrixFixtures();
for (const matrixClass of ['pure_meta', 'project', 'mixed']) {
  assert.ok(
    scopeMatrixFixtures.filter(row => row.matrix_class === matrixClass).length >= 12,
    `U-003 ${matrixClass} fixtures must contain at least 12 cases`,
  );
}
assert.ok(
  scopeMatrixFixtures.some(row => row.matrix_class === 'pure_meta' && row.input === '我直接批准执行。'),
  'U-003 must retain the exact user prompt fixture',
);
for (const prompt of [
  '继续执行当前项目里的 route-guard 治理计划。',
  '继续执行 muse 项目里 route-guard 的治理计划。',
]) {
  assert.ok(
    scopeMatrixFixtures.some(row => row.input === prompt && row.expected === 'PLAN_MODE'),
    `U-003 must retain the Gate-satisfied reality fixture: ${prompt}`,
  );
}

for (const fixture of scopeMatrixFixtures) {
  cases.push({
    name: `U-003 ${fixture.matrix_class}: ${fixture.id}`,
    prompt: fixture.input,
    extraEnv: fixture.env || {},
    expect: decision => expectScopeMatrixDecision(fixture, decision),
  });
}

let passCount = 0;
let failCount = 0;
const failures = [];

// Real hint surface (not dry-run JSON): this is what Claude/Codex actually receive.
// No session_id is supplied, so the hook cannot open or mutate project state.
{
  const prompt = '我要做luca gstack的自我成长，帮我调研一下codex开源了的harness。对比我们的luca gstgack。有什么可以值得借鉴的地方，我需要你进入深度调研模式，进行自我和codex的harness的评估';
  const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
    cwd: process.cwd(),
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    env: { ...baseEnv, ROUTE_GUARD_DRY_RUN: '0', ROUTE_GUARD_CURRENT_PROJECT: '' },
  });
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /FRAMEWORK FLOW/);
    assert.match(result.stdout, /模式 2（对标深评）/);
    assert.match(result.stdout, /不得替代顶层自成长流程/);
    assert.doesNotMatch(result.stdout, /建议调用项目 skill:\s*\/deepresearch/);
    console.log('PASS real hint surface routes self-evolution benchmark above deepresearch');
    passCount++;
  } catch (error) {
    console.log(`FAIL real hint surface routes self-evolution benchmark above deepresearch: ${error.message?.split('\n')[0]}`);
    failures.push({ name: 'real self-evolution hint fixture', error: error.message?.split('\n')[0] });
    failCount++;
  }
}

// Real UserPromptSubmit fixture: this exercises the stateful branch that calls
// prepareProjectSwitch, not only the dry-run decision builder.
{
  const root = mkdtempSync(join(tmpdir(), 'route-new-project-'));
  const gstack = join(root, 'gstack');
  const projects = join(root, 'projects');
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(projects, { recursive: true });
  const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
    cwd: process.cwd(),
    input: JSON.stringify({ session_id: 'REALNEW', turn_id: 'turn-new-1', prompt: '新建项目 beta' }),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: gstack,
      LUCA_GSTACK_ROOT: gstack,
      LUCA_PROJECTS_ROOT: projects,
      ROUTE_GUARD_PROJECTS: '',
      ROUTE_GUARD_CURRENT_PROJECT: '',
      ROUTE_GUARD_HEAVY_SKILLS: '',
    },
  });
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /project\.sh new beta --session-id REALNEW --tx .+ --expected-epoch 0/);
    const state = JSON.parse(readFileSync(join(gstack, '.claude', '.session-project-REALNEW'), 'utf8'));
    assert.equal(state.state, 'SWITCH_ONLY');
    assert.equal(state.switch.operation, 'new');
    assert.equal(state.switch.target, 'beta');
    assert.equal(state.switch.turn_id, 'turn-new-1');
    console.log('PASS real route fixture prepares deterministic operation:new transaction');
    passCount++;
  } catch (error) {
    console.log(`FAIL real route fixture prepares deterministic operation:new transaction: ${error.message?.split('\n')[0]}`);
    failures.push({ name: 'real route operation:new fixture', error: error.message?.split('\n')[0] });
    failCount++;
  }
}

for (const testCase of cases) {
  const decision = route(testCase.prompt, testCase.extraEnv || {});
  try {
    testCase.expect(decision);
    console.log(`PASS ${testCase.name}`);
    passCount++;
  } catch (e) {
    console.log(`FAIL ${testCase.name}: ${e.message?.split('\n')[0]}`);
    failures.push({ name: testCase.name, error: e.message?.split('\n')[0] });
    failCount++;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// A-ALIAS（E1 RESOLVE）—— hook 只记录候选、永不授权。
// 自带 fixture 根：这些用例必须真的读 <PROJECTS_ROOT>/<canonical>/.luca/project.json，
// 所以不能走 ROUTE_GUARD_PROJECTS 那条 env 列表捷径（那会绕开目录读取，让断言恒真）。
// ══════════════════════════════════════════════════════════════════════════
{
  const aliasRoot = mkdtempSync(join(tmpdir(), 'route-guard-alias-'));
  const manifest = (name, aliases) => {
    mkdirSync(join(aliasRoot, name, '.luca'), { recursive: true });
    writeFileSync(join(aliasRoot, name, '.luca', 'project.json'),
      `${JSON.stringify({ schema_version: 1, canonical_project: name, aliases })}\n`);
  };
  manifest('muse', ['luca app']);
  manifest('crm', ['商机管理']);
  manifest('demo', ['项目', 'crm']);          // 保留词 + 别名等于某 canonical ID：两条都必须被拒
  // 差分对照根：**同样的项目目录、零 manifest**。用于证明别名解析对授权面净影响为零。
  const barrenRoot = mkdtempSync(join(tmpdir(), 'route-guard-barren-'));
  for (const name of ['muse', 'crm', 'demo']) mkdirSync(join(barrenRoot, name), { recursive: true });
  const aliasEnv = { LUCA_PROJECTS_ROOT: aliasRoot, ROUTE_GUARD_PROJECTS: '', ROUTE_GUARD_CURRENT_PROJECT: 'muse' };
  const ar = (prompt, extra = {}) => route(prompt, { ...aliasEnv, ...extra });
  const check = (name, fn) => {
    try { fn(); console.log(`PASS ${name}`); passCount++; }
    catch (e) {
      console.log(`FAIL ${name}: ${e.message?.split('\n')[0]}`);
      failures.push({ name, error: e.message?.split('\n')[0] });
      failCount++;
    }
  };
  const candidatesFor = (decision, canonical) =>
    (decision.aliasResolution?.candidates || []).filter(c => c.canonical === canonical);
  // RESOLVE 永不授权。
  // ⚠ 首版查的是 `decision.command === undefined`——而 `command` 是 route-guard **从不产出**的键
  //   （`/usr/bin/grep -n "command:" route-guard.mjs` 零命中），所以那条断言恒真：深审把
  //   `aliasResolution` 直接接成 PROJECT_SWITCH/switch_existing_project 后，25 条 A-ALIAS 全绿。
  //   正解不是补字段名，而是**差分**：同一输入，有 manifest 与无 manifest 两次运行的
  //   全部授权字段必须逐字节相同——别名解析对授权面的净影响必须为零。
  //   这种写法无法靠「点一个不存在的字段」蒙混过关。
  const AUTHORITY_FIELDS = ['decision', 'projectAction', 'operation', 'project', 'tx',
    'expectedEpoch', 'projectMutation', 'command', 'capability'];
  const authoritySlice = decision => JSON.stringify(AUTHORITY_FIELDS.map(k => decision?.[k] ?? null));
  const assertNoAuthority = (prompt, extra = {}) => {
    const withAlias = route(prompt, { ...aliasEnv, ...extra });
    const withoutAlias = route(prompt, { ...aliasEnv, LUCA_PROJECTS_ROOT: barrenRoot, ...extra });
    assert.equal(authoritySlice(withAlias), authoritySlice(withoutAlias),
      `alias resolution changed the authority surface: ${authoritySlice(withAlias)} vs ${authoritySlice(withoutAlias)}`);
    assert.doesNotMatch(JSON.stringify(withAlias.aliasResolution || {}), /project\.sh|capability|operation/,
      'aliasResolution must carry no authority');
  };

  // §3.3 冻结 fixture：每条恰好一条 muse 候选。否定式**照样产候选**——授权轴上不做否定判定，
  // 在这里重新引入任何机械否定都会让这一组转红（变异体 3）。
  const frozen = [
    ['进入luca app项目', true], ['进入「luca app」项目', true],
    ['进入 luca app 项目页面看看', true], ['切到 luca app 项目功能', true],
    ['打开 luca app', false], ['继续 luca app 的登录流程', false],
    ['不进入 luca app 项目', true], ['别切到 luca app 项目', true],
    ['不想进入 luca app 项目', true], ['更别说进入 luca app 项目', true],
    ['免得又要进入 luca app 项目', true], ['难道现在要进入 luca app 项目', true],
    ['无论如何都要进入 luca app 项目', true], ['不妨进入 luca app 项目', true],
    ['进不进入 luca app 项目', true],
  ];
  for (const [prompt, marker] of frozen) {
    check(`A-ALIAS frozen fixture ${JSON.stringify(prompt)}`, () => {
      const decision = ar(prompt);
      const hits = candidatesFor(decision, 'muse');
      assert.equal(hits.length, 1, `expected exactly 1 muse candidate, got ${hits.length}`);
      // marker 只记录、不 gate：`打开 luca app` 无 marker 却**必须**仍产候选（变异体 2）
      assert.equal(hits[0].marker_present, marker, 'marker_present must be recorded as observed');
      assert.equal(prompt.slice(hits[0].span_start, hits[0].span_end).toLowerCase().replace(/\s+/g, ' '), 'luca app');
      assertNoAuthority(prompt);
    });
  }

  // 深审 BLOCKER-1：`aliasResolution` 只挂在 `decision` 上，而 `decision` **只有 dry-run 才写 stdout**；
  // 真实路径写的是 `hints`，`decisionToHints` 从不提它。实测改前改后真实输出逐字节相同 ——
  // 修复完全没接线。这条断言钉的是**生产面**，dry-run 断言全绿也救不了。
  check('A-ALIAS 候选必须出现在真实 hint 面（非 dry-run），否则等于没接线', () => {
    const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
      cwd: process.cwd(), input: JSON.stringify({ prompt: '进入 luca app 项目' }), encoding: 'utf8',
      env: { ...baseEnv, ...aliasEnv, ROUTE_GUARD_DRY_RUN: '0', ROUTE_GUARD_CURRENT_PROJECT: '' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /🔎 别名候选/, '真实 hint 面必须出现别名候选');
    assert.match(result.stdout, /muse/, '候选必须点名 canonical 目标');
    assert.match(result.stdout, /非授权/, '措辞必须表明这是证据不是授权');
    // 阳性对照：无 manifest 时不得出现该行（证明这行来自解析而非硬编码）
    const barren = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
      cwd: process.cwd(), input: JSON.stringify({ prompt: '进入 luca app 项目' }), encoding: 'utf8',
      env: { ...baseEnv, ...aliasEnv, LUCA_PROJECTS_ROOT: barrenRoot, ROUTE_GUARD_DRY_RUN: '0', ROUTE_GUARD_CURRENT_PROJECT: '' },
    });
    assert.doesNotMatch(barren.stdout, /🔎 别名候选/, '无 manifest 时不得出现候选行');
  });

  check('A-ALIAS 两个不同 canonical 目标全部记录、都不选', () => {
    const decision = ar('从 luca app 切换到 crm 项目');
    const names = (decision.aliasResolution?.candidates || []).map(c => c.canonical);
    assert.equal(new Set(names).size, 2, `expected both targets recorded, got ${names.join(',')}`);
    assert.equal(decision.aliasResolution.candidates.some(c => c.chosen || c.selected), false, 'RESOLVE must not choose');
  });

  check('A-ALIAS alias_not_found：零候选时该对象缺席且命令为空', () => {
    const decision = ar('进入 luca ap 项目');
    assert.equal(decision.aliasResolution, undefined, 'zero candidates must omit the object entirely');
    assert.equal(decision.command === undefined || decision.command === '', true);
  });

  check('A-ALIAS 第 9 条触发 cap 拒绝（不截断、不择一）', () => {
    const decision = ar(Array.from({ length: 9 }, (_, i) => `luca app ${i}`).join('、'));
    assert.equal(decision.aliasResolution?.status, 'CAP_EXCEEDED');
    assert.equal(decision.aliasResolution.candidates.length, 0);
  });

  check('A-ALIAS 保留词别名被拒，而其 canonical 名始终可用', () => {
    const reserved = ar('这个项目怎么样');
    assert.equal(candidatesFor(reserved, 'demo').length, 0, '「项目」是保留词，不得成为别名');
    const canonical = ar('看看 demo 的登录流程');
    assert.equal(candidatesFor(canonical, 'demo').length, 1, 'canonical 名必须始终可用');
  });

  check('A-ALIAS 别名等于某 canonical ID 被拒（不得改判归属）', () => {
    const decision = ar('打开 crm');
    const hits = decision.aliasResolution?.candidates || [];
    assert.equal(hits.every(c => c.canonical === 'crm'), true, '`crm` 必须解析为 crm 自己，不得被 demo 的别名劫持');
  });

  check('A-ALIAS .luca 是符号链接时该项目只剩 canonical 名可用', () => {
    const linkRoot = mkdtempSync(join(tmpdir(), 'route-guard-alias-link-'));
    mkdirSync(join(linkRoot, 'real', '.luca'), { recursive: true });
    writeFileSync(join(linkRoot, 'real', '.luca', 'project.json'),
      `${JSON.stringify({ schema_version: 1, canonical_project: 'linked', aliases: ['别名甲'] })}\n`);
    mkdirSync(join(linkRoot, 'linked'), { recursive: true });
    symlinkSync(join(linkRoot, 'real', '.luca'), join(linkRoot, 'linked', '.luca'));
    const env = { LUCA_PROJECTS_ROOT: linkRoot, ROUTE_GUARD_PROJECTS: '', ROUTE_GUARD_CURRENT_PROJECT: 'linked' };
    assert.equal((route('打开 别名甲', env).aliasResolution?.candidates || []).length, 0, '符号链接 .luca 不得被读取');
    assert.equal((route('打开 linked', env).aliasResolution?.candidates || []).length, 1, 'canonical 名仍必须可用');
  });

  // 携带模式（§3.2）：信号必须穿过 buildDecision 的**全部**早返。
  // 当前基线是四分支 / 五条 return——`explicitEngineeringDeliverySelection → FRAMEWORK_FLOW`
  // 是 upstream 6aaa1c6 新增、计划成稿时并不存在的那一条（变异体 12 只列了三个）。
  const carry = [
    ['FRAMEWORK_FLOW 早返', '按工程交付流程执行：重构 luca app 的设置页面信息架构，功能堆砌很难找', 'FRAMEWORK_FLOW'],
    ['裸 return complexity（PLAN_MODE）', '重构 luca app 的设置页面的信息架构，新增权限、通知、导出三个分组，层级太深很难找', 'PLAN_MODE'],
    ['mixed_ambiguous 早返', '改一下 route-guard 里 luca app 项目的东西', 'NEEDS_CONTEXT'],
    ['gate 短路早返', '切到 crm 项目，顺便看看 luca app 的登录流程', 'PROJECT_SWITCH'],
  ];
  for (const [label, prompt, expected] of carry) {
    check(`A-ALIAS 携带模式穿过${label}`, () => {
      const decision = ar(prompt);
      assert.equal(decision.decision, expected, `expected ${expected}, got ${decision.decision}`);
      assert.equal(candidatesFor(decision, 'muse').length >= 1, true, '早返路径上信号被静默丢弃');
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// A-SCOPE-NULL（§6.1 REQ-SCOPE-NULL-FIRST）
// 缺陷（改前基线为红，实测可触发）：`new project: 不涉及项目的route-guard` 里的否定词**命中**
// → 下游信号被剥掉 → mixed_ambiguous 短路消失 → projectGate 一路走到 explicitNewProjectName
// → `project.sh new`：真的建一个叫「不涉及项目的route-guard」的项目、解绑当前、三条软链重指。
//
// 承重不变量是「作用域否定的结果到不了会改绑定的分支」。计划 A-SCOPE-NULL 另写的
// 「否定式与肯定式必须返回**相同**决策」是过度指定：`不涉及项目` 本就该被判成框架活、不 gate，
// 那正是 NEGATED_DOWNSTREAM_SCOPE_RULES 存在的目的；要求两者同决策等于要求删掉该能力。
// 故这里钉后半句（安全属性），并用三条反向对照证明不是把 gate 一刀切关掉。
// ══════════════════════════════════════════════════════════════════════════
{
  const BINDING_ACTIONS = new Set(['create_new_project', 'switch_existing_project']);
  const scopeEnv = { ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示,muse' };
  const check = (name, fn) => {
    try { fn(); console.log(`PASS ${name}`); passCount++; }
    catch (e) {
      console.log(`FAIL ${name}: ${e.message?.split('\n')[0]}`);
      failures.push({ name, error: e.message?.split('\n')[0] });
      failCount++;
    }
  };
  const pairs = [
    ['涉及项目', '不涉及项目'],
    ['属于项目', '不属于项目'],
    ['项目相关', '非项目相关'],
  ];
  for (const [affirmative, negated] of pairs) {
    check(`A-SCOPE-NULL 作用域否定「${negated}」到不了会改绑定的分支`, () => {
      for (const form of [affirmative, negated]) {
        const decision = route(`new project: ${form}的route-guard`, scopeEnv);
        assert.equal(BINDING_ACTIONS.has(decision.projectAction), false,
          `「${form}」returned binding-changing ${decision.projectAction} (project=${decision.project})`);
      }
    });
  }

  // 深审 MAJOR-5：首版臂序以 `!named` 为条件，**否定短语里嵌一个真实项目名就绕开**——
  // `named` 为真 → kind 变 named_downstream → 空臂跳过 → explicitNewProjectName 开火，
  // 实测建出 project="不涉及项目的muse路由"。上面三组最小对里没有一条把项目名放进否定短语，
  // 因此对这个洞**结构性失明**。这两条补上，并各带一个只差项目名的阳性对照。
  for (const [label, prompt] of [
    ['new project 前缀', 'new project: 不涉及项目的muse路由'],
    ['显式新建前缀', '新建项目 不涉及项目的muse路由'],
  ]) {
    check(`A-SCOPE-NULL 否定短语内嵌真实项目名仍不得改绑定（${label}）`, () => {
      const decision = route(prompt, scopeEnv);
      assert.equal(BINDING_ACTIONS.has(decision.projectAction), false,
        `returned binding-changing ${decision.projectAction} (project=${decision.project})`);
      // 阳性对照：把 muse 换成非项目名 zzz，行为必须一致——证明差别不是靠「恰好没命中」蒙的
      const control = route(prompt.replace('muse', 'zzz'), scopeEnv);
      assert.equal(BINDING_ACTIONS.has(control.projectAction), false);
    });
  }

  // 反向对照 1：具名下游项目**必须继续 gate**（SC-20260523-002）。
  // 这条专门钉死「修法不是把空臂提到 named 之前一刀切」——那样会让具名项目不再 gate。
  // fixture 自带 ROUTE_GUARD_PROJECTS 且必须含 muse：默认列表里没有 muse 时，
  // 本用例与正例同样返回 NONE，零分辨力（会审 R-5 实测）。
  check('A-SCOPE-NULL 反向对照：具名下游项目仍然 gate', () => {
    const decision = route('route-guard 在 muse 里怎么走', scopeEnv);
    assert.equal(decision.projectAction, 'switch_existing_project', `got ${decision.projectAction}`);
    assert.equal(decision.project, 'muse');
  });

  // 反向对照 2：正常的显式新建仍然工作（没有把 explicitNewProjectName 整条废掉）。
  check('A-SCOPE-NULL 反向对照：正常新建项目仍然工作', () => {
    const decision = route('新建项目 beta', scopeEnv);
    assert.equal(decision.projectAction, 'create_new_project');
    assert.equal(decision.project, 'beta');
  });

  // 反向对照 3（对照组，防过度修复）：无框架信号的显式「新建项目 X」，
  // 肯定式与否定式必须**同样**建项目——那是用户显式声明项目名，不是作用域否定缺陷。
  check('A-SCOPE-NULL 对照组：显式新建时两种极性行为一致（未被过度修复）', () => {
    const yes = route('新建项目 涉及项目的东西', scopeEnv);
    const no = route('新建项目 不涉及项目的东西', scopeEnv);
    assert.equal(yes.projectAction, 'create_new_project');
    assert.equal(no.projectAction, 'create_new_project');
    assert.equal(yes.project, '涉及项目的东西');
    assert.equal(no.project, '不涉及项目的东西');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// A-SIGNAL（E2 §4.1）—— 三腿在**整条 prompt 内**命中即可产信号。
// 跨从句是**正例不是反例**：E2 原始复现串的结构腿落在第二个从句，「同从句」约束会把
// 该 bug 自己的复现串判为阴性（2026-08-30 会审推翻原设计的实测依据）。
// 信号不计分、不派 skill/flow、不改 Plan 五条件；此处同样不做否定判定。
// ══════════════════════════════════════════════════════════════════════════
{
  const check = (name, fn) => {
    try { fn(); console.log(`PASS ${name}`); passCount++; }
    catch (e) {
      console.log(`FAIL ${name}: ${e.message?.split('\n')[0]}`);
      failures.push({ name, error: e.message?.split('\n')[0] });
      failCount++;
    }
  };
  const legsOf = d => (d.semanticRouteAxis?.evidence || []).map(e => e.leg).sort().join(',');

  // E2 的直接回归断言。结构腿必须落在逗号之后——这条把「跨从句是正例」钉死，
  // 恢复「同从句」约束（变异体 11）会让它转红。
  check('A-SIGNAL E2 原始复现串产信号且结构腿跨从句', () => {
    const prompt = '帮我优化下设置页面，功能堆砌太严重了很难找';
    const decision = route(prompt);
    assert.ok(decision.semanticRouteAxis, 'E2 复现串必须产信号');
    assert.equal(decision.semanticRouteAxis.axis, 'interface_structure_change');
    assert.equal(legsOf(decision), 'change,structure,surface');
    const comma = prompt.indexOf('，');
    const structure = decision.semanticRouteAxis.evidence.find(e => e.leg === 'structure');
    assert.ok(structure.span_start > comma, `结构腿必须在第二从句（span=${structure.span_start} comma=${comma}）`);
  });

  check('A-SIGNAL negation_context 原样记录整条 prompt 字节', () => {
    const prompt = '帮我优化下设置页面，别动结构，其他随便你改';
    const decision = route(prompt);
    assert.equal(decision.semanticRouteAxis.negation_context, prompt, 'negation_context 必须逐字节等于原 prompt');
  });

  // §4.3 冻结 fixture（已按计划指示逐条重测后收敛）：三腿齐全者产信号，
  // 且**都不产生义务**——hook 不区分它们，否定判定属于 LLM 层。
  for (const prompt of [
    '调整设置里的颜色但结构不变',
    '别调整设置结构',
    '我们优化了设置页面，结构没变',
    '帮我优化下设置页面，别动结构，其他随便你改',
    '颜色不改，重组设置分组',
  ]) {
    check(`A-SIGNAL 冻结 fixture 产信号且不产生义务 ${JSON.stringify(prompt)}`, () => {
      const decision = route(prompt);
      assert.ok(decision.semanticRouteAxis, '三腿齐全必须产信号');
      assert.equal(decision.semanticRouteAxis.negation_context, prompt);
      assert.equal(decision.obligation, undefined, '光有信号不得产生义务（SIGNAL_UNCONFIRMED 确认门）');
    });
  }

  // 计划 §4.3 明写：删掉「同从句」后逐条重测，**仍缺腿的移出本 fixture 集**，
  // 不得为迁就它们再放宽腿规则——那等于把 §3.3 删掉的机制从另一个门引回来。
  // 这两条实测缺**界面腿**，故作为缺腿反例钉住，防止后人「顺手补全」腿规则。
  for (const prompt of ['结构别改', '没改结构，只动了配色']) {
    check(`A-SIGNAL 缺界面腿不得产信号（移出 fixture 集的两条）${JSON.stringify(prompt)}`, () => {
      assert.equal(route(prompt).semanticRouteAxis, undefined, '缺腿必须不产信号');
    });
  }

  for (const prompt of ['优化一下设置页面', '这个页面的信息架构很乱', '重构代码', '把颜色改成蓝色']) {
    check(`A-SIGNAL 缺腿反例不产信号 ${JSON.stringify(prompt)}`, () => {
      assert.equal(route(prompt).semanticRouteAxis, undefined);
    });
  }

  check('A-SIGNAL 一段证据不得兼任两腿', () => {
    // ⚠ 首版只有 `重构结构` 这一条——它**根本没有界面腿命中**，pickDisjointLegs 在
    //   `perLeg.some(spans => !spans.length)` 就返回 null，永远走不到区间相交判断。
    //   深审把 `overlaps` 整个改成 `() => false`（相交判定彻底删除）后本用例仍绿：典型影子守卫。
    //   下面这条才是真守卫——`regroup` ⊂ `grouping`，字节 2-7 会被变更腿与结构腿重复计入。
    assert.equal(route('重构结构').semanticRouteAxis, undefined);
    assert.equal(route('regrouping the settings page').semanticRouteAxis, undefined,
      'regroup ⊂ grouping：同一段字节不得同时充当变更腿与结构腿');
  });

  // 深审 BLOCKER-6：`semanticRouteAxis` 与别名候选同病——只活在 dry-run JSON 里。
  // E2 的原始故障恰恰发生在**第一轮**，而义务确认门要两轮才注入 📌，
  // 所以第一轮必须由信号证据行本身可见，否则「改后」与「改前」输出逐字节相同。
  check('A-SIGNAL 信号必须出现在真实 hint 面（故障发生的那一轮就可见）', () => {
    const run = prompt => spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
      cwd: process.cwd(), input: JSON.stringify({ prompt }), encoding: 'utf8',
      env: { ...baseEnv, ROUTE_GUARD_DRY_RUN: '0' },
    });
    const hit = run('帮我优化下设置页面，功能堆砌太严重了很难找');
    assert.equal(hit.status, 0, hit.stderr);
    assert.match(hit.stdout, /🧩 界面结构变更信号/, '第一轮就必须可见');
    assert.match(hit.stdout, /不计分、不派 skill/, '措辞必须表明这是证据不是判定');
    const miss = run('把颜色改成蓝色');   // 阳性对照：缺腿时不得出现
    assert.doesNotMatch(miss.stdout, /🧩 界面结构变更信号/);
  });

  check('A-SIGNAL 不计分、不派 skill/flow', () => {
    const decision = route('帮我优化下设置页面，功能堆砌太严重了很难找');
    assert.equal(decision.complexityScore || 0, 0, `信号不得计分，got ${decision.complexityScore}`);
    assert.equal(decision.recommendedSkills, undefined, '信号不得派 skill');
    assert.equal(decision.flow, undefined, '信号不得派 flow');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// A-OBLIG-VISIBLE / A-OBLIG-LIFECYCLE（E2 §4.2 / §4.2a）
// 义务是**任务载体不是拦截器**：任何状态都不拦 Stop、不拒 scope。唯一动作是每轮注入一行。
// 这些用例必须跑**真实 hint 面**（dry-run 走 JSON 分支并 process.exit(0)，注入根本不经过）。
// ══════════════════════════════════════════════════════════════════════════
{
  const INJECT = '📌 当前有未完成任务';
  const obligationFile = sid => join(process.cwd(), '.claude', `.session-obligation-${sid}`);
  const realRoute = (prompt, sid, extraEnv = {}) => {
    const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
      cwd: process.cwd(),
      input: JSON.stringify({ prompt, session_id: sid }),
      encoding: 'utf8',
      env: { ...baseEnv, ROUTE_GUARD_DRY_RUN: '0', ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示,muse', ...extraEnv },
    });
    assert.equal(result.status, 0, `route-guard exited ${result.status}: ${result.stderr}`);
    return result.stdout;
  };
  const injected = out => out.split('\n').filter(line => line.includes(INJECT)).length;
  const stateOf = sid => {
    try { return JSON.parse(readFileSync(obligationFile(sid), 'utf8')).state; } catch { return null; }
  };
  const cleanup = sid => { try { rmSync(obligationFile(sid), { force: true }); } catch { } };
  const SIGNAL_A = '帮我优化下设置页面，功能堆砌太严重了很难找';
  const SIGNAL_B = '再优化一下设置页面的信息架构，层级太深';
  const check = (name, fn) => {
    try { fn(); console.log(`PASS ${name}`); passCount++; }
    catch (e) {
      console.log(`FAIL ${name}: ${e.message?.split('\n')[0]}`);
      failures.push({ name, error: e.message?.split('\n')[0] });
      failCount++;
    }
  };

  check('A-OBLIG-VISIBLE 光有信号只落 SIGNAL_UNCONFIRMED，不注入（确认门）', () => {
    const sid = 'oblig-gate-1'; cleanup(sid);
    try {
      assert.equal(injected(realRoute(SIGNAL_A, sid)), 0, 'SIGNAL_UNCONFIRMED 不得注入');
      assert.equal(stateOf(sid), 'SIGNAL_UNCONFIRMED');
    } finally { cleanup(sid); }
  });

  // 变异体 14 专门要求：用例必须是**同一 sid 连续 ≥3 轮**——单轮用例判不出「每轮注入」，会恒绿。
  check('A-OBLIG-VISIBLE PENDING 起同一 sid 连续 3 轮每轮都注入', () => {
    const sid = 'oblig-every-turn'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid);
      assert.equal(injected(realRoute(SIGNAL_B, sid)), 1, '第二次信号应升 PENDING 并注入');
      assert.equal(stateOf(sid), 'PENDING');
      for (const turn of [1, 2, 3]) {
        assert.equal(injected(realRoute('嗯', sid)), 1, `第 ${turn} 个后续回合必须仍然注入`);
      }
    } finally { cleanup(sid); }
  });

  // R-6 / MINOR-4：route-guard 早已在同一 hints 通道发 `⚠️ 当前有未完成节点`，与注入串一字之差。
  // 断言必须锚定**含 📌 的完整串**，否则按 `当前有未完成` 子串匹配对两者都绿。
  check('A-OBLIG-VISIBLE 注入串锚定含 📌 的完整串，不与既有「未完成节点」提示混淆', () => {
    const sid = 'oblig-string'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid);
      const out = realRoute(SIGNAL_B, sid);
      const line = out.split('\n').find(l => l.includes(INJECT));
      assert.ok(line, '必须出现注入行');
      assert.match(line, /^\[route-guard\] 📌 当前有未完成任务：.+（完整字节见 .+\.claude\/\.session-obligation-.+）$/);
      assert.doesNotMatch(line, /当前有未完成节点/, '不得与既有节点提示同串');
    } finally { cleanup(sid); }
  });

  check('A-OBLIG-LIFECYCLE 20 轮封顶后自动停止注入（变异体 15）', () => {
    const sid = 'oblig-cap'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      for (let i = 0; i < 19; i++) realRoute('嗯', sid);
      assert.equal(injected(realRoute('嗯', sid)), 1, '第 20 轮仍应注入');
      assert.equal(injected(realRoute('嗯', sid)), 0, '第 21 轮起必须停止注入');
      assert.equal(stateOf(sid), null, '封顶后义务应被终结');
    } finally { cleanup(sid); }
  });

  // 深审 BLOCKER-3：DEFERRED→PENDING 的恢复分支原本 return 在计数分支之前且不计数，
  // 于是**任何 PROJECT_SWITCH 回合都把注入预算整份退还**——交替 40 轮实测 injected_turns 恒为 0、
  // 注入 40 次不停。上面那条封顶用例只用 '嗯'，对这条路径结构性失明。
  // 无有效绑定时 decision 每轮都会被重写成 PROJECT_SWITCH，这条路径一点都不 exotic。
  check('A-OBLIG-LIFECYCLE 切换回合不得退还注入预算（封顶对交替路径同样成立）', () => {
    const sid = 'oblig-cap-switch'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      let total = 0;
      for (let i = 0; i < 30; i++) {
        total += injected(realRoute('切到 muse 项目', sid));
        total += injected(realRoute('嗯', sid));
      }
      assert.ok(total <= 20, `交替 30 轮后注入 ${total} 次，超过 20 轮封顶——预算被退还了`);
      assert.equal(stateOf(sid), null, '封顶后义务必须被终结，不得永生');
    } finally { cleanup(sid); }
  });

  // 变异体 13：注入若放在 buildDecision 早返之后（或塞进 project-state 块内），
  // `PROJECT_SWITCH` 回合会静默不注入——而那正是义务必须存活转 DEFERRED 的一轮。
  check('A-OBLIG-LIFECYCLE 项目切换回合义务存活转 DEFERRED 且保留完整原始字节', () => {
    const sid = 'oblig-defer'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      realRoute('切到 muse 项目', sid);
      assert.equal(stateOf(sid), 'DEFERRED_BY_PROJECT_CHANGE');
      const doc = JSON.parse(readFileSync(obligationFile(sid), 'utf8'));
      assert.equal(doc.exact_task_text, SIGNAL_B, '必须保留完整原始任务字节，不得截断');
      assert.equal(injected(realRoute('嗯', sid)), 1, '事务后必须恢复注入');
    } finally { cleanup(sid); }
  });

  check('A-OBLIG-LIFECYCLE 取消语义终结义务并停止注入', () => {
    const sid = 'oblig-cancel'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      assert.equal(injected(realRoute('不用了', sid)), 0);
      assert.equal(stateOf(sid), null);
      assert.equal(injected(realRoute('嗯', sid)), 0, '终结后不得再注入');
    } finally { cleanup(sid); }
  });

  // 变异体 17：去掉义务读取的 try/catch，损坏的状态文件会让整轮路由失败或吞掉路由提示。
  check('A-OBLIG-VISIBLE 损坏的状态文件不得让 route-guard 失败或吞掉路由提示（变异体 17）', () => {
    const sid = 'oblig-corrupt'; cleanup(sid);
    try {
      writeFileSync(obligationFile(sid), 'not json at all {{{');
      const out = realRoute(SIGNAL_A, sid);
      assert.ok(out.includes('[route-guard]'), '本轮路由提示必须照常产出');
      assert.equal(injected(out), 0, '损坏状态只跳过注入');
    } finally { cleanup(sid); }
  });

  // 变异体 18：义务状态文件含完整 prompt 原文，必须被 .gitignore 覆盖。
  check('A-OBLIG-VISIBLE 义务状态文件被 .gitignore 覆盖（变异体 18）', () => {
    const ignored = spawnSync('git', ['check-ignore', '-q', '.claude/.session-obligation-probe'], { cwd: process.cwd() });
    assert.equal(ignored.status, 0, '义务状态文件必须被忽略，否则用户原话会被 git add -A 提交进仓库');
    const control = spawnSync('git', ['check-ignore', '-q', '.claude/settings.json'], { cwd: process.cwd() });
    assert.equal(control.status, 1, '阳性对照：settings.json 不得被这条规则误伤');
  });

  // 08-31 裁决的守卫：E2 **不拦截任何东西**。
  check('A-OBLIG-LIFECYCLE 义务不污染 decision 通道（只走 hints）', () => {
    const sid = 'oblig-channel'; cleanup(sid);
    try {
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      const decision = route(SIGNAL_A);
      assert.equal(decision.obligation, undefined, 'decision 不得携带义务');
      assert.equal(decision.injection, undefined);
    } finally { cleanup(sid); }
  });

  check('A-OBLIG-LIFECYCLE Stop 路径行为不因义务改变（session-sync stdout 恒定）', () => {
    const sid = 'oblig-stop'; cleanup(sid);
    const runStop = () => spawnSync('node', ['.claude/hooks/session-sync.mjs'], {
      cwd: process.cwd(), input: JSON.stringify({ session_id: sid }), encoding: 'utf8',
      env: { ...baseEnv, SESSION_SYNC_BLOCK: '0' },
    }).stdout;
    try {
      const before = runStop();
      realRoute(SIGNAL_A, sid); realRoute(SIGNAL_B, sid);
      assert.equal(stateOf(sid), 'PENDING', '前置条件：义务确实处于 PENDING');
      assert.equal(runStop(), before, 'Stop 侧 stdout 不得因义务存在而改变');
    } finally { cleanup(sid); }
  });
}

console.log(`\n=== test-route-guard summary: PASS=${passCount} FAIL=${failCount} ===`);
if (failCount > 0) {
  console.log('Failed cases:');
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
