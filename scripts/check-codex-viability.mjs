#!/usr/bin/env node
// Codex 存活性 registry tripwire（P0 / WS-A0b，2026-07-25）。
//
// 设计（深审 R3C-5：registry 不得复述可派生量，否则必漂移）：
//  · **可派生量**（fanout / mcp / web / askUser / daemon / workflow）由本脚本从 SKILL.md 的
//    allowed-tools + 正文**实时派生** —— 单一来源就是 skill 文件本身。
//  · **不可派生量**（tier 裁决 + degrade 路径）才存进 `.claude/skill-os/codex-viability.yaml`。
//  · tripwire = 二者必须自洽：派生出阻断性能力的 skill 不得被判 tier-1；tier-2 必须写 degrade；
//    且 registry 必须**逐条覆盖**磁盘上的 skill（新增 skill 未定档即红 → 防静默漏判）。
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// 深审：用 CLAUDE_PROJECT_DIR 定位会在双检出下验错仓并报绿（实测）。改脚本相对：
// 本文件在 scripts/ → 上 1 级 = 仓根，与被验文件恒同仓。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OFFICE = join(ROOT, '.claude', 'skills', 'office');
const REG = join(ROOT, '.claude', 'skill-os', 'codex-viability.yaml');

// 阻断性能力：在 Codex 上不可直接假定可用 → 不能判 tier-1
const BLOCKING = new Set(['fanout', 'mcp', 'daemon', 'workflow']);

export function deriveCaps(src) {
  const fmEnd = src.startsWith('---') ? src.indexOf('\n---', 3) : -1;
  const fm = fmEnd > 0 ? src.slice(3, fmEnd) : '';
  const body = fmEnd > 0 ? src.slice(fmEnd) : src;
  // 【深审修复①】allowed-tools 支持 **YAML 块状列表**：旧写法 /allowed-tools:\s*(.+)/ 的 \s* 会
  // 吃掉换行，只捕获第一项 → 实测全仓触发率 0/35（8 个 skill 的 `- Agent` 全被漏掉）。
  // 现取 allowed-tools 到下一个同级 key 之间的整段（含后续 `- xxx` 行）。
  const atMatch = fm.match(/allowed-tools:[ \t]*([^\n]*)((?:\n[ \t]*-[^\n]*)*)/);
  const at = atMatch ? (atMatch[1] + '\n' + atMatch[2]) : '';
  const caps = new Set();
  // 【深审修复②】fanout 的否定声明改为**就近**判定：旧的全文级 kill-switch 让正文任意一处出现
  // "单 agent" 就抑制整篇（实测误伤 quick-research——它真派 agent 却被判无 fanout）。
  // 现只在"派发证据句所在行"附近看否定词。
  const FANOUT_RE = /`?Agent`?[\s`]*tool|SubAgent|sub-?agent|Work-Agent|run_in_background|task\(|fan-?out|并行[^。\n]{0,8}agent|派[^。\n]{0,6}agent/i;
  const DENY_RE = /单\s*agent|不\s*fan-?out|不并行|no fan-?out|不 fan-?out/i;
  if (/(^|[\s,[\-])Agent([\s,\]]|$)|(^|[\s,[\-])Task([\s,\]]|$)/.test(at)) caps.add('fanout');
  for (const line of body.split('\n')) {
    if (FANOUT_RE.test(line) && !DENY_RE.test(line)) { caps.add('fanout'); break; }
  }
  if (/mcp__/.test(at) || /mcp__/.test(body)) caps.add('mcp');
  if (/WebSearch|WebFetch/.test(at) || /WebSearch|WebFetch/.test(body)) caps.add('web');
  if (/AskUserQuestion/.test(at) || /AskUserQuestion/.test(body)) caps.add('askUser');
  if (/daemon|pgrep .*sidecar|订阅会话/.test(body)) caps.add('daemon');
  if (/Workflow\(\{?\s*name/.test(body)) caps.add('workflow');
  return [...caps].sort();
}

// registry 读取。【深审修复③】同时支持 flow（`{tier: 1}`）与**块状**（下一行 `  tier: 1`）两种
// 合法 YAML 写法——旧版只认 flow，块状条目的 tier 解析为 undefined 后被 else 分支静默计 PASS。
function readRegistry() {
  const txt = readFileSync(REG, 'utf8');
  const out = {};
  let cur = null;
  for (const line of txt.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const m = line.match(/^  ([\w-]+):[ \t]*(.*)$/);
    if (m) {
      cur = m[1];
      const inline = m[2].trim();
      out[cur] = { tier: undefined, degrade: false, reason: false };
      const t = inline.match(/tier:\s*([\w-]+)/);
      if (t) out[cur].tier = t[1];
      if (/degrade:/.test(inline)) out[cur].degrade = true;
      if (/reason:/.test(inline)) out[cur].reason = true;
      continue;
    }
    // 块状延续行（缩进更深）
    const c = line.match(/^\s{4,}([\w-]+):\s*(.*)$/);
    if (c && cur) {
      if (c[1] === 'tier') out[cur].tier = c[2].trim().replace(/['"]/g, '');
      if (c[1] === 'degrade') out[cur].degrade = true;
      if (c[1] === 'reason') out[cur].reason = true;
    }
  }
  return out;
}

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

if (!existsSync(REG)) { console.log(`FAIL registry 缺失: ${REG}`); process.exit(1); }
const reg = readRegistry();

const skills = readdirSync(OFFICE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'references' && existsSync(join(OFFICE, d.name, 'SKILL.md')))
  .map((d) => d.name).sort();

// ① 覆盖：磁盘上每个 skill 都必须在 registry 里定档（新增 skill 未定档即红）
const missing = skills.filter((s) => !reg[s]);
ok(`覆盖: registry 覆盖全部 ${skills.length} 个 skill`, missing.length === 0, `未定档: ${missing.join(', ')}`);
const extra = Object.keys(reg).filter((s) => !skills.includes(s));
ok('覆盖: registry 无幽灵条目（skill 已删但档还在）', extra.length === 0, `幽灵: ${extra.join(', ')}`);

// ② 自洽。【深审修复④】旧版是 else-if 链：非 '1'/'2'/'3' 的档（仓内真有 `tier: report`）
// 直接落到 else 计 PASS，三条断言全部静默跳过；且从不校验 tier 取值合法。现改为**逐条独立断言**。
const VALID_TIERS = new Set(['1', '2', '3', 'report']);
for (const s of skills) {
  const e = reg[s]; if (!e) continue;
  const caps = deriveCaps(readFileSync(join(OFFICE, s, 'SKILL.md'), 'utf8'));
  const blocking = caps.filter((c) => BLOCKING.has(c));
  let bad = false;
  if (!VALID_TIERS.has(String(e.tier))) {
    fail++; bad = true; console.log(`FAIL 自洽: ${s} tier=${JSON.stringify(e.tier)} 非法（合法：1/2/3/report；拼错或块状未解析都会落这里）`);
  }
  if (blocking.length && e.tier === '1') {
    fail++; bad = true; console.log(`FAIL 自洽: ${s} 派生出阻断能力 [${blocking}] 却判 tier-1（应 ≥2/report 并写 degrade）`);
  }
  if (e.tier === '2' && !e.degrade) {
    fail++; bad = true; console.log(`FAIL 自洽: ${s} 判 tier-2 但未写 degrade 路径（降级须可执行，非口号）`);
  }
  if (e.tier === 'report' && !e.degrade) {
    fail++; bad = true; console.log(`FAIL 自洽: ${s} 判 report 但未写 degrade（须说明缺什么能力、挂上什么即恢复）`);
  }
  if (e.tier === '3' && !e.reason) {
    fail++; bad = true; console.log(`FAIL 自洽: ${s} 判 tier-3 但未写 reason（真锁死须点名原因+恢复触发器）`);
  }
  if (!bad) pass++;
}
console.log(`\n=== check-codex-viability summary: PASS=${pass} FAIL=${fail}（${skills.length} skills）===`);
process.exit(fail ? 1 : 0);
