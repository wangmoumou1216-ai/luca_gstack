#!/usr/bin/env node
import { spawnSync } from 'child_process';
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
