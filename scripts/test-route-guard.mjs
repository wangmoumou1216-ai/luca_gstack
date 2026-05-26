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
    name: 'new natural project asks for project confirmation',
    prompt: '我想做一个客户跟进助手',
    expect: decision => {
      assert.equal(decision.decision, 'PROJECT_STOP');
      assert.equal(decision.projectAction, 'confirm_new_project');
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
];

for (const testCase of cases) {
  const decision = route(testCase.prompt);
  testCase.expect(decision);
  console.log(`PASS ${testCase.name}`);
}
