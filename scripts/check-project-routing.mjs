#!/usr/bin/env node
import { spawnSync } from 'child_process';
import assert from 'assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'project-routing-check-'));

try {
  // All mutable/display surfaces belong to this fixture. Only the hook and its
  // imported framework code come from the checkout; inherited roots cannot win.
  const root = join(scratch, 'framework');
  const projectsRoot = join(scratch, 'projects');
  const claudeDir = join(root, '.claude');
  const docsTarget = join(projectsRoot, 'luca-dev', 'docs');
  mkdirSync(claudeDir, { recursive: true });
  mkdirSync(docsTarget, { recursive: true });
  mkdirSync(join(projectsRoot, 'ai 宠物提示'), { recursive: true });
  const docsLink = join(root, 'docs');
  symlinkSync(docsTarget, docsLink);
  const counterPath = join(claudeDir, '.session-turn-count');
  writeFileSync(counterPath, '17\n');
  const before = readlinkSync(docsLink);
  const counterBefore = readFileSync(counterPath, 'utf8');
  const filesBefore = readdirSync(claudeDir).sort();
  const result = spawnSync(process.execPath, [join(sourceRoot, '.claude/hooks/route-guard.mjs')], {
    cwd: root,
    input: JSON.stringify({ prompt: '我要对老项目进行优化' }),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      LUCA_PROJECTS_ROOT: projectsRoot,
      ROUTE_GUARD_DRY_RUN: '1',
      ROUTE_GUARD_PROJECTS: 'luca-dev,ai 宠物提示',
      ROUTE_GUARD_CURRENT_PROJECT: 'luca-dev',
      ROUTE_GUARD_HEAVY_SKILLS: '',
    },
  });
  const after = readlinkSync(docsLink);
  const counterAfter = existsSync(counterPath) ? readFileSync(counterPath, 'utf8') : null;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(before, after, 'dry-run must not change docs symlink');
  assert.equal(counterBefore, counterAfter, 'dry-run must not change .session-turn-count');
  assert.deepEqual(readdirSync(claudeDir).sort(), filesBefore, 'dry-run must not create project state files');
  const decision = JSON.parse(result.stdout);
  assert.equal(decision.decision, 'PROJECT_STOP');
  assert.equal(decision.projectAction, 'select_existing_project');
  assert.deepEqual(decision.projects, ['luca-dev', 'ai 宠物提示']);

  console.log('PASS project routing dry-run (isolated fixture; checkout aliases not inspected)');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
