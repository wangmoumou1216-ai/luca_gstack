#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const resolver = join(ROOT, 'scripts/resolve-agent-context.mjs');

function resolve(runtime, prompt) {
  const result = spawnSync(process.execPath, [resolver, '--runtime', runtime, '--prompt', prompt], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).targets;
}

function includes(runtime, prompt, expected) {
  const targets = resolve(runtime, prompt);
  assert(targets.some((entry) => entry.id === expected), `${runtime} did not resolve ${expected}: ${prompt}`);
  const entry = targets.find((item) => item.id === expected);
  const text = readFileSync(join(ROOT, entry.target), 'utf8');
  assert(text.length > 0, `${expected} target is empty`);
  if (entry.target.startsWith('.claude/skill-os/runtime/') || entry.target.startsWith('.claude/skill-os/generated/')) {
    assert.match(text, /FILE_END:/, `${expected} target lacks FILE_END`);
  }
  console.log(`PASS ${runtime} ${expected} → ${entry.target}`);
}

for (const runtime of ['claude', 'codex']) {
  includes(runtime, '继续这个老项目', 'project-session');
  includes(runtime, '请记住这次纠正', 'memory-extraction');
  includes(runtime, 'multi-phase checkpoint before push', 'long-session');
  includes(runtime, '在 luca app 侧栏打开预览', 'luca-app');
  includes(runtime, 'developer says do not use workflow', 'harness-boundary');
  includes(runtime, 'select subagent reasoning effort model tier', 'model-routing');
  includes(runtime, '请做独立反证 review', 'review-contract');
  includes(runtime, 'framework 自我成长 benchmark', 'framework-maintenance');
  includes(runtime, 'verify Claude and Codex dual harness parity', 'cross-harness');
  assert.deepEqual(resolve(runtime, '2 + 2 等于多少？'), [], `${runtime} ordinary question loaded conditional context`);
  console.log(`PASS ${runtime} ordinary question → no conditional target`);
}

console.log('PASS agent context resolution canaries');
