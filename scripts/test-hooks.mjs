#!/usr/bin/env node
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const projectRoot = process.cwd();
const sessionSyncHook = resolve(projectRoot, '.claude/hooks/session-sync.mjs');
const sessionRestoreHook = resolve(projectRoot, '.claude/hooks/session-restore.mjs');
const routeGuardHook = resolve(projectRoot, '.claude/hooks/route-guard.mjs');

function makeFixture({ topic = '"hook-test"', statuses = ['IN_PROGRESS', 'DONE'] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-hooks-'));
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });
  mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
  const statusLines = statuses.flatMap((status, index) => [
    `  node-${index + 1}:`,
    `    status: ${status}`,
  ]);
  writeFileSync(
    join(root, '.claude', 'workflow-state.yaml'),
    [
      `topic: ${topic}`,
      'nodes:',
      ...statusLines,
      'iteration: 1',
      '',
    ].join('\n')
  );
  return root;
}

function runNode(scriptPath, cwd) {
  const result = spawnSync('node', [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

{
  const root = makeFixture();
  const result = runNode(sessionSyncHook, root);
  const observabilityPending = join(root, '.claude', 'observability', 'pending-extraction.md');
  const handoffPending = join(root, 'docs', 'handoff', 'pending-extraction.md');
  const handoffDir = join(root, 'docs', 'handoff');

  assert.match(result.stdout, /\.claude\/observability\/pending-extraction\.md/);
  assert.ok(existsSync(observabilityPending), 'pending extraction should live under .claude/observability');
  assert.equal(existsSync(handoffPending), false, 'pending extraction must not be written under docs/handoff');
  assert.ok(
    readdirSync(handoffDir).some(name => name.endsWith('-auto-checkpoint.md')),
    'session-sync should still write an auto checkpoint when nodes are active'
  );

  const pending = readFileSync(observabilityPending, 'utf8');
  assert.match(pending, /未读取 run-log/);
  assert.doesNotMatch(pending, /查看 \.claude\/observability\/run-log\.jsonl/);
  console.log('PASS session-sync writes governance reminder outside handoff without run-log prompt');
}

{
  const root = makeFixture({ topic: '""', statuses: ['DONE', 'DONE'] });
  const result = runNode(sessionSyncHook, root);
  const handoffDir = join(root, 'docs', 'handoff');
  const observabilityPending = join(root, '.claude', 'observability', 'pending-extraction.md');

  assert.match(result.stdout, /当前 topic: session/);
  assert.ok(existsSync(observabilityPending), 'DONE-only sessions should still write governance reminders');
  assert.equal(existsSync(handoffDir), false, 'DONE-only sessions must not create docs/handoff checkpoints');
  console.log('PASS session-sync does not write handoff checkpoint for DONE-only history');
}

{
  const root = makeFixture();
  const reviewMarker = join(root, 'review-candidates-ran.txt');
  writeFileSync(
    join(root, 'memory', 'scripts', 'get_memory.py'),
    'print("summary-only memory loaded")\n'
  );
  writeFileSync(
    join(root, 'memory', 'scripts', 'review_candidates.py'),
    [
      'from pathlib import Path',
      `Path(${JSON.stringify(reviewMarker)}).write_text("ran")`,
      'print("SHOULD_NOT_RUN")',
      '',
    ].join('\n')
  );
  writeFileSync(
    join(root, '.claude', 'observability', 'pending-extraction.md'),
    [
      '# Pending Skill-Rule Extraction',
      '',
      '**Skills run:** 未读取 run-log；如需复盘，请通过 memory search 定向检索。',
      '',
    ].join('\n')
  );

  const result = runNode(sessionRestoreHook, root);

  assert.match(result.stdout, /summary-only memory loaded/);
  assert.match(result.stdout, /\.claude\/observability\/pending-extraction\.md/);
  assert.doesNotMatch(result.stdout, /当前 skill-rules/);
  assert.doesNotMatch(result.stdout, /SHOULD_NOT_RUN/);
  assert.equal(existsSync(reviewMarker), false, 'session-restore must not run semantic candidate review');
  console.log('PASS session-restore stays memory-light on startup');
}

function makeRouteFixture() {
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-route-'));
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, '.claude', 'skill-os'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'observability', 'rules.yaml'),
    [
      'version: 1',
      'rules:',
      '- id: R-TEST-001',
      '  status: active',
      '  severity: medium',
      '  type: quality_rule',
      '  scope:',
      '    skills: [alpha]',
      '    scenes: [*]',
      '  rule: "alpha: 闭环注入回归测试规则"',
      '',
    ].join('\n')
  );
  writeFileSync(
    join(root, '.claude', 'skill-os', 'skill-routing-map.yaml'),
    [
      'version: 1',
      'project_skills:',
      '',
      '  alpha:',
      '    invoke: "/alpha"',
      '    weight: 6',
      '    triggers: [对比]',
      '',
      '  beta:',
      '    invoke: "/beta"',
      '    weight: 6',
      '    triggers: [比较一下]',
      '',
    ].join('\n')
  );
  return root;
}

function runRouteGuard(cwd, prompt) {
  const env = { ...process.env };
  delete env.ROUTE_GUARD_DRY_RUN;
  const result = spawnSync('node', [routeGuardHook], {
    cwd,
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    env,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

{
  // alpha has an active rule scoped to it; "对比" both bypasses the project gate
  // (Audit M2 content-tool exemption) and routes to alpha as SINGLE_SKILL, so the
  // learning loop's distilled rule must be auto-surfaced at routing time.
  const root = makeRouteFixture();
  const result = runRouteGuard(root, '对比两个版本');
  assert.match(result.stdout, /建议调用.*\/alpha/, 'should route to alpha');
  assert.match(result.stdout, /📏 alpha 活跃规则/, 'should auto-surface alpha rules at routing time');
  assert.match(result.stdout, /R-TEST-001/, 'should include the matched rule id');
  console.log('PASS route-guard auto-injects active rules for the matched skill');
}

{
  // beta has NO rule; "比较一下" routes to beta — the rule block must stay silent
  // (no empty-channel noise per BACKLOG #17 lesson).
  const root = makeRouteFixture();
  const result = runRouteGuard(root, '比较一下两个版本');
  assert.match(result.stdout, /建议调用.*\/beta/, 'should route to beta');
  assert.doesNotMatch(result.stdout, /活跃规则/, 'no rule block for a skill without rules');
  console.log('PASS route-guard stays silent when the matched skill has no rules');
}
