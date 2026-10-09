#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'eval-routing-contract-'));
const fixtures = join(dir, 'fixtures.jsonl');
const results = join(dir, 'results');
const one = (id, layer = 'semantic', note = 'hidden standard answer') => JSON.stringify({ id, input: '请判断这个请求', expected: 'flow:design-chain', layer, scene: 'A', note });
function run(args, fixturePath = fixtures) { return spawnSync('python3', ['memory/scripts/eval_routing.py', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ROUTING_FIXTURES: fixturePath, ROUTING_RESULTS_DIR: results } }); }
try {
  writeFileSync(fixtures, one('sem-001') + '\n');
  const empty = run(['--keyword-only']);
  assert.equal(empty.status, 1);
  assert.match(empty.stdout, /denominator is zero/);
  writeFileSync(fixtures, '');
  const emptyJudge = run(['--judge']);
  assert.equal(emptyJudge.status, 1);
  assert.match(emptyJudge.stdout, /fixtures 为空或缺失/);
  writeFileSync(fixtures, one('sem-001') + '\n');
  const judge = run(['--judge']);
  assert.equal(judge.status, 0, judge.stderr);
  const queueName = readdirSync(results).find((name) => name.startsWith('judge-queue-'));
  const keyName = readdirSync(results).find((name) => name.startsWith('judge-answer-key-'));
  assert.ok(queueName && keyName, 'judge outputs must be written');
  const queue = readFileSync(join(results, queueName), 'utf8');
  const key = readFileSync(join(results, keyName), 'utf8');
  assert.doesNotMatch(queue, /expected_capability|hidden standard answer|flow:design-chain/);
  assert.match(key, /flow:design-chain/);
  assert.equal(JSON.parse(queue.trim()).eval_kind, 'routing-label-review');
  assert.equal(JSON.parse(key.trim()).eval_kind, 'routing-label-answer-key');
  assert.doesNotMatch(judge.stdout, /再算 semantic-layer 命中率/);
  assert.match(judge.stdout, /标签审查/);
  writeFileSync(fixtures, one('dup') + '\n' + one('dup') + '\n');
  const duplicate = run(['--report']);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr + duplicate.stdout, /重复 id/);
  writeFileSync(fixtures, one('bad', 'unknown') + '\n');
  const invalid = run(['--report']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr + invalid.stdout, /layer 无效/);
  for (const change of [
    { input: ' \t ' }, { input: 123 }, { expected: '/figma-layer' },
    { expected: '/muse-loop-orchestrate' }, { expected: '/not-an-active-skill' },
    { expected: 'MULTI:/idea,/not-an-active-skill' }, { expected: 'direct|' },
  ]) {
    writeFileSync(fixtures, JSON.stringify({ ...JSON.parse(one('bad')), ...change }) + '\n');
    const rejected = run(['--judge']);
    assert.equal(rejected.status, 1, JSON.stringify(change) + rejected.stdout + rejected.stderr);
    assert.match(rejected.stderr, /input 无效|expected 无效/);
  }
  const calibrated = JSON.parse(readFileSync(join(root, 'framework-audit/routing-plan-audit/2026-10-06/semantic-calibration.json'), 'utf8'));
  assert.equal(calibrated.length, 23);
  const active = readFileSync(join(root, 'memory/evals/routing/fixtures.jsonl'), 'utf8').split('\n')
    .filter((line) => line.trim() && !line.startsWith('//')).map((line) => JSON.parse(line));
  for (const expected of calibrated) {
    const actual = active.find((row) => row.id === expected.id);
    assert.ok(actual, expected.id);
    assert.equal(actual.expected, expected.expected, expected.id);
    assert.equal(actual.context, expected.context, expected.id);
  }
  const actualJudge = run(['--judge'], join(root, 'memory/evals/routing/fixtures.jsonl'));
  assert.equal(actualJudge.status, 0, actualJudge.stderr);
  const actualQueue = readFileSync(join(results, queueName), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const semantic = active.filter((row) => row.layer === 'semantic');
  assert.equal(actualQueue.length, semantic.length, 'judge denominator must include every active semantic case');
  assert.equal(new Set(actualQueue.map((row) => row.id)).size, semantic.length, 'every semantic case must appear exactly once');
  for (const fixture of semantic) {
    const queued = actualQueue.find((row) => row.id === fixture.id);
    assert.ok(queued, fixture.id);
    assert.equal(queued.context, fixture.context ?? '');
    assert.equal(queued.expected_capability, undefined);
    assert.equal(queued.note, undefined, 'author answer notes must remain outside blind input');
  }
  const continuityCases = active.filter((row) => row.id.startsWith('routing-experience-S'));
  assert.equal(continuityCases.length, 24, 'all 24 reviewed routing experience cases must remain in the denominator');
  for (const expected of calibrated) {
    const actual = actualQueue.find((row) => row.id === expected.id);
    assert.equal(actual.context, expected.context);
    assert.equal(actual.expected_capability, undefined);
  }
  const keyword = run(['--keyword-only'], join(root, 'memory/evals/routing/fixtures.jsonl'));
  assert.equal(keyword.status, 0, keyword.stdout + keyword.stderr);
  console.log('PASS routing eval: blind judge input, independent answer key, non-zero denominator and fixture validation');
} finally { rmSync(dir, { recursive: true, force: true }); }
