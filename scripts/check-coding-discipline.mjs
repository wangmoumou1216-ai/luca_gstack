#!/usr/bin/env node
import assert from 'assert/strict';
import { readFileSync } from 'fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const required = [
  {
    path: 'CLAUDE.md',
    checks: [
      /Coding Discipline/,
      /Think Before Coding/,
      /Simplicity First/,
      /Surgical Changes/,
      /Goal-Driven Execution/,
      /不进入 `skill-routing-map\.yaml`/,
    ],
  },
  {
    path: 'AGENTS.md',
    checks: [
      /Coding Discipline/,
      /Think Before Coding/,
      /Simplicity First/,
      /Surgical Changes/,
      /Goal-Driven Execution/,
      /not a separate route or visible skill/,
    ],
  },
  {
    path: '.claude/skills/office/SKILL.md',
    checks: [
      /Execution Discipline/,
      /Karpathy-inspired coding discipline/,
      /Think Before Coding/,
      /Simplicity First/,
      /Surgical Changes/,
      /Goal-Driven Execution/,
    ],
  },
  {
    path: '.claude/agents/work-agent-template.md',
    checks: [
      /Coding Discipline/,
      /最小实现、手术式改动、可验证完成/,
      /speculative abstraction/,
      /drive-by refactor/,
      /GOAL、PRIMARY_OUTPUTS 或 DONE_CRITERIA/,
    ],
  },
];

for (const item of required) {
  const content = read(item.path);
  for (const pattern of item.checks) {
    assert.match(content, pattern, `${item.path} missing ${pattern}`);
  }
}

console.log('PASS coding discipline contracts');
