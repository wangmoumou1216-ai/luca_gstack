#!/usr/bin/env node
// C5 档表门（Phase6 工程盲审 MAJOR-1 修复：原 verify.sh 内联 node -e 经 eval 三层转义
// 后正则退化 [sS]、断言惰性 fail-open——移入 .mjs 文件按 C1 先例，转义面消失）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
const yaml = readFileSync(join(root, '.claude/skill-os/model-routing.yaml'), 'utf8');

const errors = [];
for (const tier of ['reasoning-heavy', 'core-execution', 'guided-execution', 'mechanical']) {
  const row = md.split('\n').find(l => l.trim().startsWith('| ' + tier + ' '));
  if (!row) { errors.push(`缺档表行 ${tier}`); continue; }
  // 锚定 yaml 键定义行（^  tier:）非全文首现——L31 default_tier 引用会让首现匹配吃到错块
  const m = yaml.match(new RegExp('\\n\\s{2}' + tier + ':\\s*\\n[\\s\\S]{0,300}?resolves_to:\\s*["\']?([\\w.-]+)'));
  if (!m) { errors.push(`model-routing.yaml 解析不到 ${tier} 的 resolves_to——真值源结构漂移，须同步本检查`); continue; }
  if (!row.toLowerCase().includes(m[1].toLowerCase())) {
    errors.push(`档表行 ${tier} 缺当前 alias ${m[1]}（快照漂移）`);
  }
}
if (errors.length) {
  console.error(`FAIL check-model-table (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('PASS 档表 4 行在场且含当前 alias（强断言，非惰性）');
