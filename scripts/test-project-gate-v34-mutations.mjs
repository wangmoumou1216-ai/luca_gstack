#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const cases = [
  {
    id: 'A01',
    test: 'scripts/test-event-switch-e2e.mjs',
    file: 'scripts/project-pin.mjs',
    from: "      state: 'TURN_ACTIVE',\n      session_id: sid,\n      binding,",
    to: "      state: 'BOUND',\n      session_id: sid,\n      binding,",
    meaning: 'selection commit no longer keeps the native event active',
  },
  {
    id: 'A04',
    test: 'scripts/test-project-controlled-selection.mjs',
    file: '.claude/hooks/lib/project-selection.mjs',
    from: '&& item.target === parsed.target && item.expected_epoch === parsed.expected_epoch;',
    to: '&& (parsed.target = item.target) && item.expected_epoch === parsed.expected_epoch;',
    meaning: 'an altered expanded target is rewritten to the trusted target and accepted',
  },
  {
    id: 'A05',
    test: 'scripts/test-project-selection-v34.mjs',
    file: 'scripts/project-pin.mjs',
    from: '  if (replay) {\n',
    to: '  if (replay && false) {\n',
    meaning: 'a committed tx no longer takes the byte-idempotent replay path',
  },
  {
    id: 'A09',
    test: 'scripts/test-project-scope-guard.mjs',
    file: '.claude/hooks/project-scope-guard.mjs',
    from: "function mentionsReadBrokerInvocation(command) {\n  const source = String(command || '');\n",
    to: "function mentionsReadBrokerInvocation(command) {\n  const source = String(command || '');\n  if (source.includes('scripts/project-read.mjs')) return true;\n",
    meaning: 'a source-code mention is misclassified as a broker execution',
  },
];

function cleanEnv() {
  const env = { ...process.env };
  for (const key of ['CLAUDE_PROJECT_DIR', 'LUCA_GSTACK_ROOT', 'LUCA_PROJECTS_ROOT',
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_PREFIX']) delete env[key];
  return env;
}

function run(root, test) {
  return spawnSync(process.execPath, [join(root, test)], {
    cwd: root,
    env: cleanEnv(),
    encoding: 'utf8',
    timeout: 120_000,
  });
}

function copyExecutionTree(target) {
  mkdirSync(join(target, '.claude'), { recursive: true });
  cpSync(join(SOURCE_ROOT, 'scripts'), join(target, 'scripts'), { recursive: true });
  cpSync(join(SOURCE_ROOT, '.claude', 'hooks'), join(target, '.claude', 'hooks'), { recursive: true });
  const writeState = join('.claude', 'skills', 'office', 'references', 'write_state.py');
  mkdirSync(dirname(join(target, writeState)), { recursive: true });
  cpSync(join(SOURCE_ROOT, writeState), join(target, writeState));
}

for (const item of cases) {
  const baseline = run(SOURCE_ROOT, item.test);
  assert.equal(baseline.status, 0, `${item.id} baseline failed:\n${baseline.stderr || baseline.stdout}`);

  const scratch = mkdtempSync(join(tmpdir(), `project-gate-v34-${item.id.toLowerCase()}-`));
  try {
    copyExecutionTree(scratch);
    const isolatedBaseline = run(scratch, item.test);
    assert.equal(isolatedBaseline.status, 0,
      `${item.id} isolated negative control failed before mutation:\n${isolatedBaseline.stderr || isolatedBaseline.stdout}`);
    console.log(`PASS ${item.id} isolated negative control before mutation`);
    const path = join(scratch, item.file);
    const source = readFileSync(path, 'utf8');
    assert.equal(source.split(item.from).length, 2, `${item.id} mutation seam is not unique`);
    writeFileSync(path, source.replace(item.from, item.to));
    const mutant = run(scratch, item.test);
    assert.notEqual(mutant.status, 0, `${item.id} mutant survived: ${item.meaning}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  const restored = run(SOURCE_ROOT, item.test);
  assert.equal(restored.status, 0, `${item.id} restored baseline failed:\n${restored.stderr || restored.stdout}`);
  console.log(`PASS ${item.id} mutation killed: ${item.meaning}`);
}

console.log('PASS v3.4 isolated mutation proof: baseline → mutant red → restored baseline for A01/A04/A05/A09');
