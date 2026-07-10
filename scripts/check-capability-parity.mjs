#!/usr/bin/env node
// 双仓能力奇偶校验：CLAUDE.md「双仓一致原则」的机械 tripwire（2026-07-10）。
// 清单：.claude/skill-os/capability-parity.json；两仓任一缺锚点 → FAIL。
// 某仓目录不存在（CI/单仓环境）→ SKIP 该仓（parity 只在本机双仓在位时可全量校验）。
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(here, "..", ".claude", "skill-os", "capability-parity.json"), "utf8"),
);
const missing = [];
let skipped = false;
for (const repo of manifest.repos) {
  if (!existsSync(repo)) {
    console.log(`SKIP: 仓库不存在（CI/单仓环境）: ${repo}`);
    skipped = true;
    continue;
  }
  for (const [file, anchors] of Object.entries(manifest.files)) {
    const p = join(repo, file);
    if (!existsSync(p)) {
      for (const a of anchors) missing.push(`${repo} :: ${file} 缺文件（锚点「${a}」）`);
      continue;
    }
    const text = readFileSync(p, "utf8");
    for (const a of anchors) if (!text.includes(a)) missing.push(`${repo} :: ${file} 缺锚点「${a}」`);
  }
}
if (missing.length) {
  console.error("❌ 双仓能力奇偶校验 FAIL——框架能力改动须同 session 落双仓（CLAUDE.md 双仓一致原则）：");
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
console.log(skipped ? "capability-parity: 部分仓库跳过，可校验范围内 OK" : "capability-parity: 双仓全部锚点齐备 ✓");
