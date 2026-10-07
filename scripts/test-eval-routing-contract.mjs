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
function run(args) { return spawnSync('python3', ['memory/scripts/eval_routing.py', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ROUTING_FIXTURES: fixtures, ROUTING_RESULTS_DIR: results } }); }
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
  writeFileSync(fixtures, one('dup') + '\n' + one('dup') + '\n');
  const duplicate = run(['--report']);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr + duplicate.stdout, /重复 id/);
  writeFileSync(fixtures, one('bad', 'unknown') + '\n');
  const invalid = run(['--report']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr + invalid.stdout, /layer 无效/);
  console.log('PASS routing eval: blind judge input, independent answer key, non-zero denominator and fixture validation');
} finally { rmSync(dir, { recursive: true, force: true }); }
