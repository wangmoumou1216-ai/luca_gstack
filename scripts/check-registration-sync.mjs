#!/usr/bin/env node
// check-registration-sync.mjs — 治理轨道登记面同步 tripwire（GAP-registration-sync，2026-07-12）
// 补 check-routing-map SSOT-1..9 未覆盖的三面（对方 resolving-merge-conflicts 漏登记 drift 实证：
// 散文契约必漂移，须已提交 checker）：
//   REG-1 每个带 invoke 的一级 skill 在 CLAUDE.md skill 表有行（/name 出现）
//   REG-2 其 SKILL.md frontmatter 申报 recommended-model（model-routing 三问的落点证据）
//   REG-3 office/SKILL.md 展示面提及该 skill（warn 级——office 可能按向导组织）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const routing = read('.claude/skill-os/skill-routing-map.yaml');
const claudeMd = read('CLAUDE.md');
// office 展示面真值 = references/office-wizard.md（office/SKILL.md:336 指定向导必须读它）
let officeMd = '';
try { officeMd = read('.claude/skills/office/references/office-wizard.md'); }
catch { try { officeMd = read('.claude/skills/office/SKILL.md'); } catch { /* warn later */ } }

// 从 project_skills 段提取带 invoke 的一级 skill（invoke: "/name"）
const invokes = [...routing.matchAll(/invoke:\s*"\/([a-z0-9-]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(invokes)];

const errors = [];
const warns = [];
// REG-1 定界化（claude5-unhobble C4）：全文件 substring 护不住表行（14/21 skill 在 prose
// 也出现，删表行仍绿）。注册行两类：① 表行 `| \`/name\` |`；② 具名 prose 注册段——行含
// `：**` 且其后首个反引号 token 为 `/name`（:272 /code-hygiene、:274 /code-recon 形态）。
// 名点段（如「隐藏/高级 skill」枚举、语义兜底句内提及）不计为注册。
const regLines = claudeMd.split('\n').filter(l =>
  /^\|\s*`\/[a-z0-9-]+`/.test(l.trim()) ||
  /：\*\*\s*`\/[a-z0-9-]+`/.test(l)
);
const registered = new Set();
for (const l of regLines) {
  for (const m of l.matchAll(/`\/([a-z0-9-]+)`/g)) { registered.add(m[1]); break; }
}
for (const name of uniq) {
  if (!registered.has(name)) {
    errors.push(`REG-1 CLAUDE.md 缺一级 skill 注册行（表行或具名 prose 注册段）: /${name}`);
  }
  // REG-2: recommended-model 申报（office 本地 skill 才有 SKILL.md；外部/内置跳过）
  const skillMd = `.claude/skills/office/${name}/SKILL.md`;
  if (fs.existsSync(path.join(ROOT, skillMd))) {
    const fm = read(skillMd).split(/^---$/m)[1] || '';
    if (!/recommended-model:\s*\S+/.test(fm)) {
      errors.push(`REG-2 ${skillMd} frontmatter 未申报 recommended-model（new_scenario_protocol 三问未落）`);
    }
  }
  // REG-3: office 展示面（warn）
  if (officeMd && !officeMd.includes(name)) {
    warns.push(`REG-3 office/SKILL.md 展示面未提及: ${name}`);
  }
}

for (const w of warns) console.log(`WARN ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`);
  console.error(`FAIL registration sync (${errors.length} issues, ${uniq.length} skills checked)`);
  process.exit(1);
}
console.log(`PASS registration sync (${uniq.length} first-level skills × REG-1/2 green, ${warns.length} warn)`);
