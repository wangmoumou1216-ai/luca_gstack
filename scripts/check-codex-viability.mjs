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

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const OFFICE = join(ROOT, '.claude', 'skills', 'office');
const REG = join(ROOT, '.claude', 'skill-os', 'codex-viability.yaml');

// 阻断性能力：在 Codex 上不可直接假定可用 → 不能判 tier-1
const BLOCKING = new Set(['fanout', 'mcp', 'daemon', 'workflow']);

export function deriveCaps(src) {
  const fmEnd = src.startsWith('---') ? src.indexOf('\n---', 3) : -1;
  const fm = fmEnd > 0 ? src.slice(3, fmEnd) : '';
  const at = (fm.match(/allowed-tools:\s*(.+)/) || [, ''])[1];
  const body = fmEnd > 0 ? src.slice(fmEnd) : src;
  const caps = new Set();
  // fanout：frontmatter 的 Agent/Task，或正文里的各种派发说法（含反引号/连字符变体）。
  // **显式否定声明优先**：skill 正文明说"单 agent / 不 fan-out / 不并行"时不判 fanout——
  // 否则宽松匹配会把"不 fan-out"这句话本身当成 fanout 证据（insight-synthesis 实测误判）。
  const deniesFanout = /单\s*agent|不\s*fan-?out|不并行|no fan-?out/i.test(body);
  if (/\bAgent\b|\bTask\b/.test(at)) caps.add('fanout');
  if (!deniesFanout && /`?Agent`?\s*tool|SubAgent|sub-?agent|Work-Agent|run_in_background|task\(|fan-?out|并行\s*(?:的)?\s*agent|派.{0,6}agent/i.test(body)) caps.add('fanout');
  if (/mcp__/.test(at) || /mcp__/.test(body)) caps.add('mcp');
  if (/WebSearch|WebFetch/.test(at) || /WebSearch|WebFetch/.test(body)) caps.add('web');
  if (/AskUserQuestion/.test(at) || /AskUserQuestion/.test(body)) caps.add('askUser');
  if (/daemon|pgrep .*sidecar|订阅会话/.test(body)) caps.add('daemon');
  if (/Workflow\(\{?\s*name/.test(body)) caps.add('workflow');
  return [...caps].sort();
}

// 极简 YAML 读取（registry 结构固定：skills: <name>: {tier: X, degrade: "..."}）
function readRegistry() {
  const txt = readFileSync(REG, 'utf8');
  const out = {};
  let cur = null;
  for (const line of txt.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const m = line.match(/^  ([\w-]+):\s*(.*)$/);
    if (m) {
      cur = m[1];
      const inline = m[2].trim();
      out[cur] = { raw: inline };
      const t = inline.match(/tier:\s*([\w-]+)/);
      if (t) out[cur].tier = t[1];
      out[cur].degrade = /degrade:/.test(inline);
      out[cur].reason = /reason:/.test(inline);
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

// ② 自洽：派生出阻断性能力 ⇒ 不得 tier-1；tier-2 必须有 degrade；tier-3 必须有 reason
for (const s of skills) {
  const e = reg[s]; if (!e) continue;
  const caps = deriveCaps(readFileSync(join(OFFICE, s, 'SKILL.md'), 'utf8'));
  const blocking = caps.filter((c) => BLOCKING.has(c));
  if (blocking.length && e.tier === '1') {
    fail++; console.log(`FAIL 自洽: ${s} 派生出阻断能力 [${blocking}] 却判 tier-1（应 ≥2 并写 degrade）`);
  } else if (e.tier === '2' && !e.degrade) {
    fail++; console.log(`FAIL 自洽: ${s} 判 tier-2 但未写 degrade 路径（降级须可执行，非口号）`);
  } else if (e.tier === '3' && !e.reason) {
    fail++; console.log(`FAIL 自洽: ${s} 判 tier-3 但未写 reason（真锁死须点名原因+恢复触发器）`);
  } else { pass++; }
}
console.log(`\n=== check-codex-viability summary: PASS=${pass} FAIL=${fail}（${skills.length} skills）===`);
process.exit(fail ? 1 : 0);
