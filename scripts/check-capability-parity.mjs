#!/usr/bin/env node
// 能力锚点自检：CLAUDE.md「单真值源 + 双检出原则」下的仓内 tripwire（2026-07-16 B2 合并，
// 前身为双仓奇偶校验）。清单：.claude/skill-os/capability-parity.json；本仓任一缺锚点 → FAIL。
// 防的是关键能力小节被误删/误改名后无人察觉（127 锚点=历史双仓期沉淀的护栏，保留复用）。
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const manifest = JSON.parse(
  readFileSync(join(repoRoot, ".claude", "skill-os", "capability-parity.json"), "utf8"),
);
const missing = [];
for (const [file, anchors] of Object.entries(manifest.files)) {
  const p = join(repoRoot, file);
  if (!existsSync(p)) {
    for (const a of anchors) missing.push(`${file} 缺文件（锚点「${a}」）`);
    continue;
  }
  const text = readFileSync(p, "utf8");
  for (const a of anchors) if (!text.includes(a)) missing.push(`${file} 缺锚点「${a}」`);
}
if (missing.length) {
  console.error(`❌ 能力锚点自检 FAIL（${missing.length} 处，防误删关键小节）：`);
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
console.log("能力锚点自检: 全部锚点在位 ✓");
