#!/usr/bin/env node
import { spawnSync } from 'child_process';
import assert from 'assert/strict';
import { existsSync, readFileSync } from 'fs';

const before = spawnSync('readlink', ['docs'], { encoding: 'utf8' }).stdout.trim();
const counterPath = '.claude/.session-turn-count';
const counterBefore = existsSync(counterPath) ? readFileSync(counterPath, 'utf8') : null;
const result = spawnSync('node', ['.claude/hooks/route-guard.mjs'], {
  cwd: process.cwd(),
  input: JSON.stringify({ prompt: '我要对老项目进行优化' }),
  encoding: 'utf8',
  env: {
    ...process.env,
    ROUTE_GUARD_DRY_RUN: '1',
    ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示',
    ROUTE_GUARD_CURRENT_PROJECT: 'luca-dev',
  },
});
const after = spawnSync('readlink', ['docs'], { encoding: 'utf8' }).stdout.trim();
const counterAfter = existsSync(counterPath) ? readFileSync(counterPath, 'utf8') : null;

assert.equal(result.status, 0, result.stderr);
assert.equal(before, after, 'dry-run must not change docs symlink');
assert.equal(counterBefore, counterAfter, 'dry-run must not change .session-turn-count');
const decision = JSON.parse(result.stdout);
assert.equal(decision.decision, 'PROJECT_STOP');
assert.equal(decision.projectAction, 'select_existing_project');

console.log('PASS project routing dry-run');
