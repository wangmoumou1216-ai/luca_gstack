#!/usr/bin/env node
// appendix 指针奇偶校验（claude5-unhobble C1，2026-07-29）
// 双向守卫 CLAUDE.md ↔ claude-md-appendix.md 的可达性：
//  前向：appendix 每个 `## ` 节必须登记在 MAPPING（新增节未登记 → 红）——07-28 孤儿模式
//  后向：每行 witness 在 CLAUDE.md 出现次数 ≥ minCount（同串双站点靠计数防假绿）
// 设计裁决：string-anchor 键非行号；多对一合法（PG 附则两节共 witness）；`###` 并入父节；
// Session 启动节 witness=泛路径串（软链 blockquote 零改动豁免，R6-③m2）。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const claudeMd = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
const appendix = readFileSync(join(root, '.claude/skill-os/claude-md-appendix.md'), 'utf8');

// 节题（`## ` 后全文）→ { witness, minCount }
const MAPPING = new Map([
  ['Checkpoint 写法', { witness: '「Checkpoint 写法」', minCount: 1 }],
  ['PROGRESS.md 更新规则', { witness: '「PROGRESS.md 更新规则」', minCount: 1 }],
  ['Agent Context 预算', { witness: '「Agent Context 预算」', minCount: 1 }],
  ['框架建设预算——依据与沿革（2026-07-03，全量搭建 review P2-8）', { witness: '「框架建设预算」', minCount: 1 }],
  ['自动自成长（auto-grow，2026-06-05 起）机制细节', { witness: '「自动自成长」', minCount: 1 }],
  // 软链 blockquote（零改动块）内的泛路径指针即该节唯一发现通道——硬编码例外
  ['Session 启动——G6 会话粘性修订 + 方案A 并行安全（全文沿革）', { witness: '.claude/skill-os/claude-md-appendix.md', minCount: 1 }],
  ['Project Gate 附则（被「命名即切换」升级取代的原文存档，2026-07-10）', { witness: '「Project Gate 附则」', minCount: 1 }],
  ['Project Gate 附则：总原则 + 绑定即注入（全文）', { witness: '「Project Gate 附则」', minCount: 1 }],
  ['insight-synthesis 划界（三处消歧全文，2026-07-20）', { witness: '「insight-synthesis 划界」', minCount: 1 }],
  // 引用错位 tie-break：Figma 节经邻节题发现（:536/:542 同串，计数 2 防删一漏一）
  ['Figma 写入后主动开侧栏看结果（全文，2026-07-22 luca 明确指示）', { witness: '「luca app 侧栏感知」', minCount: 2 }],
  ['luca app 侧栏感知（全文，2026-07-11）', { witness: '「luca app 侧栏感知」', minCount: 2 }],
  ['muse 工具通道（MCP，2026-07-30）', { witness: '「muse 工具通道」', minCount: 1 }],
  ['harness 注入边界（规则优先级第 2 层的适用范围，2026-07-28）', { witness: '「harness 注入边界」', minCount: 1 }],
]);

const count = (hay, needle) => hay.split(needle).length - 1;
const errors = [];

const headings = [...appendix.matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
for (const h of headings) {
  if (!MAPPING.has(h)) {
    errors.push(`前向：appendix 新增节「${h}」未登记映射表——正文须留指针并在本表加行（07-28 孤儿模式防线）`);
  }
}
for (const [section, { witness, minCount }] of MAPPING) {
  if (!headings.includes(section)) {
    errors.push(`映射表陈旧：appendix 已无节「${section}」——同 commit 更新本表`);
    continue;
  }
  const n = count(claudeMd, witness);
  if (n < minCount) {
    errors.push(`后向：节「${section}」的 witness ${witness} 在 CLAUDE.md 出现 ${n} 次 < ${minCount}——指针丢失`);
  }
}

if (errors.length) {
  console.error(`FAIL check-appendix-pointers (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`PASS appendix 指针奇偶校验：${headings.length} 节全可达（映射 ${MAPPING.size} 行）`);
