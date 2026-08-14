#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'fs';
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

function loadRoutingFixtures() {
  return readFileSync('memory/evals/routing/fixtures.jsonl', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => JSON.parse(line));
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
    name: 'real CRM research prompt without a project binding stops at Project Gate',
    prompt: '我们有一个agent，然后这个agent是置入到crm里面的。我们希望当打开crm任何页面，agent都能识别当前页面，带入上下文，然后与agent对话，是可以针对当前页面的。那这块有一个执行上，透明度感知的问题。我如何让用户能感知到，当前你的提问时带入了当前页面的上下文的。这个 需要按照我们agent标准的ax规范。已经你需要调研一下其他标准的厂商他们在这种场景时怎么做到的透明度感知的问题',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'projA' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'choose_new_or_existing');
    },
  },
  {
    name: 'explicit quick-research selection outranks a negated deepresearch mention',
    prompt: '当前项目不要 deepresearch，quick-research 是一个 skill，按 quick-research 执行',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'muse', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/quick-research');
    },
  },
  {
    name: 'real framework rule system-review prompt enters Plan Mode without a project gate',
    prompt: '那我需要你看看你为什么没有执行，我现在很多规则你都没有执行。我需要你系统的review一下，还有什么执行不了，为什么',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '', ROUTE_GUARD_PROJECTS: 'muse,crm' },
    expect: decision => {
      assert.equal(decision.decision, 'PLAN_MODE');
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
    name: 'G3 反例: 继续项目 → 仍走老项目 PROJECT_STOP（上游专有检查先赢）',
    prompt: '继续项目',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
    },
  },
  {
    name: 'G3 反例: >10字陈述句不豁免（长度闸）→ 仍 PROJECT_STOP',
    prompt: '把昨天没写完的那个报告接着写完整理好',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: '' },
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
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
    name: '评审轴: 对象绑定词命中 code-hygiene（不被 ux-audit 抢）',
    prompt: '代码评审',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.equal(decision.decision, 'SINGLE_SKILL');
      assert.equal(decision.skill, '/code-hygiene');
    },
  },
  {
    // preview ⊃ review：正是不收泛动词 `review代码` 的理由，钉住防日后加回来。
    name: '评审轴: preview 句不得命中 code-hygiene（子串碰撞防回归）',
    prompt: '帮我 preview 代码改完的效果',
    extraEnv: { ROUTE_GUARD_CURRENT_PROJECT: 'crm' },
    expect: decision => {
      assert.notEqual(decision.skill, '/code-hygiene', 'preview 不得被当成 review');
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
      assert.equal(decision.skill, '/code-hygiene');
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
];

const allRoutingFixtures = loadRoutingFixtures();
const fixtureIds = allRoutingFixtures.map(row => row.id);
assert.equal(new Set(fixtureIds).size, fixtureIds.length, 'routing fixture ids must be unique');
for (const id of [
  'sem-explicit-quick-research-over-negated-deepresearch',
  'sem-no-pin-project-gate-before-deepresearch',
  'sem-framework-rule-system-review-no-project-gate',
]) {
  assert.ok(fixtureIds.includes(id), `merged canonical WIP fixture missing: ${id}`);
}
const scopeMatrixFixtures = allRoutingFixtures.filter(row => row.matrix === 'U-003');
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

console.log(`\n=== test-route-guard summary: PASS=${passCount} FAIL=${failCount} ===`);
if (failCount > 0) {
  console.log('Failed cases:');
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
