#!/usr/bin/env node
import { spawnSync } from 'child_process';
import assert from 'assert/strict';

const baseEnv = {
  ...process.env,
  ROUTE_GUARD_DRY_RUN: '1',
  ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示',
  ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示',
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

const cases = [
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
    name: 'magicpath wins direct interface output',
    prompt: '直接产出一个线索管理界面',
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, 'magicpath');
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
    name: 'figma prototype wording asks among candidates',
    prompt: '做一个 Figma 原型界面',
    expect: decision => {
      assert.equal(decision.decision, 'MULTI_SKILL');
      assert.ok(decision.candidates.includes('magicpath'));
      assert.ok(decision.candidates.includes('/html-prototype'));
    },
  },
  {
    name: 'greeting stays quiet',
    prompt: '你好',
    expect: decision => {
      assert.equal(decision.decision, 'NONE');
    },
  },
  // --- ADR-0002 negative cases: longest-match-wins disambiguation ---
  {
    name: '设计调研 routes ux_research, NOT deepresearch (调研⊂设计调研)',
    prompt: '帮我做一下设计调研',
    expect: decision => {
      // ux-research is a heavy orchestrator → SINGLE_SKILL becomes PLAN_CHECK.
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
    // Audit M2: /compare is governance_tools, also standalone-capable.
    name: 'compare standalone allowed without project',
    prompt: '比较一下两个方案',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.notEqual(decision.decision, 'PROJECT_STOP',
        `compare standalone must not be gated, got ${decision.decision}`);
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
    // Verification: /auto trigger words (全流程) with active project already
    // route to PLAN_CHECK via HEAVY_ORCHESTRATOR_SKILLS — confirms the audit
    // §0 误诊 correction (no missing complexity signal).
    name: '全流程做 with active project triggers PLAN_CHECK on /auto',
    prompt: '全流程做客户管理',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'ai 宠物提示' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_CHECK');
      assert.equal(decision.skill, '/auto');
    },
  },
];

let passCount = 0;
let failCount = 0;
const failures = [];
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

console.log(`\n=== test-route-guard summary: PASS=${passCount} FAIL=${failCount} ===`);
if (failCount > 0) {
  console.log('Failed cases:');
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
