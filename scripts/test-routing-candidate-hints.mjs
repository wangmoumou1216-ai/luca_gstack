#!/usr/bin/env node
// Production injection checks; these do not grade the downstream agent's semantic decision.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTING_PLAN_FIXTURES } from './routing-plan-v1-suite.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sandbox = mkdtempSync(join(tmpdir(), 'routing-candidate-hints-'));
mkdirSync(join(sandbox, '.claude/skill-os'), { recursive: true });
mkdirSync(join(sandbox, 'projects'));
cpSync(join(ROOT, '.claude/hooks'), join(sandbox, '.claude/hooks'), { recursive: true });
mkdirSync(join(sandbox, 'scripts'));
cpSync(join(ROOT, 'scripts/model-route-host.mjs'), join(sandbox, 'scripts/model-route-host.mjs'));
cpSync(join(ROOT, '.claude/skill-os/skill-routing-map.yaml'), join(sandbox, '.claude/skill-os/skill-routing-map.yaml'));

const hook = join(sandbox, '.claude/hooks/route-guard.mjs');
const original = readFileSync(hook, 'utf8');
let passed = 0;
function run(prompt, harness, dryRun = false) {
  const result = spawnSync(process.execPath, [hook], {
    cwd: sandbox, input: JSON.stringify({ prompt }), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: sandbox, LUCA_PROJECTS_ROOT: join(sandbox, 'projects'),
      LUCA_ACTUAL_HARNESS: harness, ROUTE_GUARD_DRY_RUN: dryRun ? '1' : '0',
      ROUTE_GUARD_PROJECTS: 'fixture', ROUTE_GUARD_CURRENT_PROJECT: 'fixture', ROUTE_GUARD_HEAVY_SKILLS: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  return dryRun ? JSON.parse(result.stdout) : result.stdout;
}

function assessment(out) {
  assert.match(out, /候选证据：SINGLE\/MULTI\/NONE\/PLAN_MODE 与分数均不覆盖语义判断/);
  assert.match(out, /先处理 Project Gate，再核验 Plan，最后接受 skill 路由/);
  assert.match(out, /按实际工作核验 .claude\/agents\/plan-agent.md 的五类触发条件、计数边界与有效豁免/);
  assert.match(out, /引用、否定或讨论计划不等于真实请求/);
  assert.match(out, /可能触发时先全文读取唯一 owner/);
  assert.match(out, /确认触发才产计划/);
  assert.doesNotMatch(out, /禁止直接路由到单个 skill|必须先[^\n]*输出 Phase|先主动询问用户选择哪个 skill|禁止自行判断/);
}

function planCandidate(out) {
  assessment(out);
  assert.match(out, /PLAN MODE 候选/);
  assert.match(out, /确认触发才输出 Phase 分解计划，未触发则继续语义路由/);
  assert.match(out, /候选与计划不产生执行权/);
}

function multiCandidate(out) {
  assessment(out);
  assert.match(out, /单一明确意图接受对应能力/);
  assert.match(out, /多个独立明确意图进入 Multi-Skill/);
  assert.match(out, /仅存在真实歧义时/);
}

try {
  for (const harness of ['claude', 'codex']) {
    for (const prompt of ['先做个计划', '标题写成「先做个计划」', '不要先做个计划，直接解释这个术语']) {
      const decision = run(prompt, harness, true);
      assert.equal(decision.decision, 'PLAN_MODE', 'lexical schema remains compatible');
      assert.equal(decision.complexityScore, 6, 'lexical scores remain compatible');
      planCandidate(run(prompt, harness));
      passed++;
    }
    for (const [prompt, decision] of [
      ['帮我整理这段会议纪要', 'SINGLE_SKILL'],
      ['$brainstorm 先做个计划', 'SINGLE_SKILL'],
      ['把 alpha.mjs、beta.mjs、gamma.mjs 各加一个注释', 'NONE'],
      ['请让两个独立 subagent 协作检查', 'NONE'],
      ['先完成 A，再用 A 的结果完成 B', 'NONE'],
      ['请删除远程资源', 'NONE'],
    ]) {
      assert.equal(run(prompt, harness, true).decision, decision);
      assessment(run(prompt, harness));
      passed++;
    }
    for (const prompt of ['帮我做一个PRD和HTML原型', '请分别整理会议纪要并写PRD']) {
      assert.equal(run(prompt, harness, true).decision, 'MULTI_SKILL');
      multiCandidate(run(prompt, harness));
      passed++;
    }
    const wayfinderPrompt = '这是一个复杂功能，要做整体方案，跨 session 而且路线不清';
    const wayfinder = run(wayfinderPrompt, harness, true);
    assert.equal(wayfinder.decision, 'PLAN_MODE');
    assert.deepEqual(wayfinder.recommendedSkills, ['/wayfinder']);
    const wayfinderHint = run(wayfinderPrompt, harness);
    assessment(wayfinderHint);
    assert.match(wayfinderHint, /词法证据提示 huge AND multi-session AND fog/);
    assert.match(wayfinderHint, /先核验实际 Plan 触发与豁免，再举证/);
    assert.doesNotMatch(wayfinderHint, /同时满足 huge/);
    passed++;

    const review = run('评审一下这份 PRD', harness);
    assert.ok(review.indexOf('先判**评审对象**') < review.indexOf('SINGLE 候选'), 'R4 must precede route acceptance');
    assessment(review);
    passed++;
    const reviewPlan = run('先做个计划，评审一下这份 PRD', harness);
    assert.ok(reviewPlan.indexOf('先判**评审对象**') < reviewPlan.indexOf('PLAN MODE 候选'), 'R4 must survive PLAN_MODE collision');
    passed++;

    for (const prompt of ['选择 engineering-delivery preset', '他提到「选择 engineering-delivery preset」，请解释这句话']) {
      assert.equal(run(prompt, harness, true).flow, 'engineering-delivery', 'selection-like lexical candidate remains compatible');
      const preset = run(prompt, harness);
      assert.match(preset, /R5，核验用户真实选择，提及、引用、询问或评审不构成选择/);
      assert.match(preset, /确认真实选择后才读取 optional-workflow-graph.yaml/);
      assert.match(preset, /不授予写入、Git、网络或 external effect authority/);
      assert.doesNotMatch(preset, /用户已显式选择/);
      passed++;
    }
    assessment(run(ROUTING_PLAN_FIXTURES['RP-07b'].request, harness));
    const selectedPreset = run(ROUTING_PLAN_FIXTURES['RP-12a'].request, harness);
    assert.match(selectedPreset, /核验用户真实选择/);
    assert.doesNotMatch(run(ROUTING_PLAN_FIXTURES['RP-12b'].request, harness), /用户已显式选择/);
    passed += 3;

    for (const skill of ['figma-layer', 'muse-loop-orchestrate', 'muse-proto-gen']) {
      const out = run(`$${skill}`, harness);
      assert.match(out, /⛔ RETIRED/);
      assert.doesNotMatch(out, /候选证据|SINGLE 候选|MULTI 候选|PLAN MODE 候选/);
      passed++;
    }
    assert.doesNotMatch(run('谢谢', harness), /候选证据|SINGLE 候选|MULTI 候选|PLAN MODE 候选|未命中路由词表|❓ STOP/,
      'ordinary no-task NONE adds no route injection; independent checkpoint reminders may still fire');
    const noAuthority = run('继续 fixture 项目的工作', harness);
    assert.doesNotMatch(noAuthority, /project\.sh|--tx|🧭 PROJECT GATE/);
    assert.equal(run('继续 fixture 项目的工作', harness, true).projectAction, undefined);
    passed++;
    console.log(`PASS ${harness} production candidate, Plan, review and hard-boundary checks`);
  }

  // Run broken production implementations only in the disposable checkout.
  for (const [label, before, after, prompt, check] of [
    ['forced MULTI choice', '单一明确意图接受对应能力；多个独立明确意图进入 Multi-Skill；仅存在真实歧义时，请用户回答一个会改变路由的问题。',
      '你必须先主动询问用户选择哪个 skill，禁止自行判断。', '帮我做一个PRD和HTML原型', multiCandidate],
    ['forced Plan from quotation', '确认触发才输出 Phase 分解计划，未触发则继续语义路由',
      '必须先输出 Phase 分解计划', '标题写成「先做个计划」', planCandidate],
  ]) {
    assert.ok(original.includes(before), `mutation target missing: ${label}`);
    writeFileSync(hook, original.replace(before, after));
    assert.throws(() => check(run(prompt, 'codex')), undefined, `${label} mutation escaped production checks`);
    writeFileSync(hook, original);
    passed++;
    console.log(`PASS mutation rejected: ${label}`);
  }
  console.log(`PASS routing candidate production hints ${passed} checks; downstream semantics remain for native-agent evaluation`);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
