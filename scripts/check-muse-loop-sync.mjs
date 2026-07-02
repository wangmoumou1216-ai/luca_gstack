#!/usr/bin/env node
// muse-proto-gen 声明与 html-prototype「同一份」的共享面锚点检查——
// 上游改清单/改名/改格式时在这里响，而不是运行时静默漂移（见 muse-loop/ARCHITECTURE.md 依赖清单）
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  {
    file: '.claude/skills/office/html-prototype/scripts/verify-prototype.mjs',
    needle: 'muse-proto-gen',
    why: 'allowedModes 必须含 muse-proto-gen（QA 脚本共用）',
  },
  {
    file: '.claude/skills/office/html-prototype/SKILL.md',
    needle: 'AI Slop 防火墙',
    why: 'muse-proto-gen 引用的防 slop 检查清单锚点（Phase 3 视觉防火墙节）',
  },
  {
    file: '.claude/skills/office/html-prototype/SKILL.md',
    needle: 'DECISION: D-',
    why: 'DECISION 注释可追溯格式（muse-proto-gen 承诺同一格式）',
  },
  {
    file: '.claude/skills/office/references/html-prototype-tokens.md',
    needle: 'FILE_END: html-prototype-tokens.md',
    why: 'shared-ref html-prototype-tokens 完整存在',
  },
  {
    file: '.claude/skills/office/muse-proto-gen/SKILL.md',
    needle: '与 html-prototype Phase 3 同一份',
    why: 'muse-proto-gen 自身的共享声明还在（声明变了则依赖关系变了，本检查锚点需同步更新）',
  },
];

let fail = 0;
for (const c of checks) {
  const p = resolve(ROOT, c.file);
  const ok = existsSync(p) && readFileSync(p, 'utf8').includes(c.needle);
  console.log(`${ok ? '✓' : '✗'} ${c.file} :: ${c.needle}${ok ? '' : `\n    → ${c.why}`}`);
  if (!ok) fail++;
}
if (fail) {
  console.error(`\nFAIL ${fail} 项：html-prototype 共享面已漂移，须同步 muse-proto-gen（清单/格式/模式）并更新本检查锚点。`);
  process.exit(1);
}
console.log('\nPASS muse-loop 共享面锚点一致');
