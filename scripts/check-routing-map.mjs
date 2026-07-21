#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import assert from 'assert/strict';

const content = readFileSync('.claude/skill-os/skill-routing-map.yaml', 'utf8');
const claudeMd = readFileSync('CLAUDE.md', 'utf8');
const claudeHead = claudeMd.split('\n').slice(0, 40).join('\n');
const agentsHead = readFileSync('AGENTS.md', 'utf8').split('\n').slice(0, 40).join('\n');
// /compare, magicpath, /figma-demo removed 2026-07-03 (full-review P2-6): demoted to
// hidden skills (zero episodic use in 30 days) — no longer required project_skills.
const requiredInvokes = [
  '/auto',
  '/idea',
  '/deepresearch',
  '/brainstorm',
  'superpowers:brainstorming',
  '/ux-research',
  '/ux-audit',
  '/ux-brainstorm',
  '/design-brief',
  '/html-prototype',
  '/figma-layer',
  '/tech-spec',
  '/task-plan',
];

for (const invoke of requiredInvokes) {
  assert.match(content, new RegExp(`invoke:\\s+"?${invoke.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?`), `missing invoke ${invoke}`);
}

assert.ok(!content.includes('invoke: "/status"'), '/status must not be a fake first-level skill');
assert.match(content, /project_context:/, 'missing project_context section');
assert.match(content, /老项目/, 'missing old-project trigger');
assert.match(content, /新项目/, 'missing new-project trigger');
assert.ok(existsSync('.claude/skills/office/compare/SKILL.md'), 'compare skill file missing');
assert.match(claudeHead, /Routing Contract TL;DR/, 'CLAUDE.md routing contract must stay in first 40 lines');
assert.match(agentsHead, /Routing Contract TL;DR/, 'AGENTS.md routing contract must stay in first 40 lines');
assert.match(claudeHead, /Project Gate first/, 'CLAUDE.md must front-load Project Gate priority');
assert.match(agentsHead, /Project Gate first/, 'AGENTS.md must front-load Project Gate priority');
// #14 (benchmark debate): anchor the SHARED TL;DR routing-contract items 2-5
// across BOTH surfaces so the human-readable contract can't silently drift.
// Items 1-5 are verbatim-identical in CLAUDE.md and AGENTS.md TL;DR. Item 6
// (Scene) is intentionally CLAUDE-only (AGENTS carries it later in body), so it
// is NOT anchored here — forcing it would wrongly inject a 6th item into
// AGENTS.md's EN-adapted TL;DR (the rejected literal-equality form).
for (const surface of [{ name: 'CLAUDE.md', head: claudeHead }, { name: 'AGENTS.md', head: agentsHead }]) {
  assert.match(surface.head, /Complexity second/, `${surface.name} TL;DR missing shared item "Complexity second"`);
  assert.match(surface.head, /Ambiguity third/, `${surface.name} TL;DR missing shared item "Ambiguity third"`);
  assert.match(surface.head, /Single skill last/, `${surface.name} TL;DR missing shared item "Single skill last"`);
  assert.match(surface.head, /Keyword source/, `${surface.name} TL;DR missing shared item "Keyword source"`);
}

console.log('PASS routing map coverage');

// ─────────────────────────────────────────────────────────────────────────────
// ADR-0005(a): Single-source-of-truth consistency checker.
// The skill SET is the source of truth. The hand-maintained config surfaces
// (routing-map / input-modes / commands) must stay consistent with it.
// Non-destructive: read-only validation, no generation. Exits non-zero on drift.
// ─────────────────────────────────────────────────────────────────────────────

// Canonical skill identifier = the `invoke` value with leading "/" removed and
// ":" normalized to "-". This is the normalizer that catches the
// superpowers_brainstorming-vs-`-`-vs-`:` class of naming drift, and the
// underscore(routing-map key) vs hyphen(input-modes key / command file) drift.
function canonical(name) {
  return name.replace(/^\//, '').replace(/:/g, '-');
}

// Skills that are intentionally NOT first-class slash commands (per CLAUDE.md
// "隐藏/高级 skill"). They are allowed to have no .claude/commands/ entry.
// Single-sourced from CLAUDE.md (ADR-0005): the "**隐藏/高级 skill：**" line is
// the SOURCE OF TRUTH. Parse the backtick-quoted names from that declaration
// (it may wrap across lines; it terminates at the first 。) instead of keeping
// a second hand-maintained list that could silently drift.
function parseHiddenSkills(md) {
  const start = md.indexOf('**隐藏/高级 skill：**');
  if (start === -1) {
    throw new Error('CLAUDE.md missing "**隐藏/高级 skill：**" declaration — cannot source hidden-skills list');
  }
  const end = md.indexOf('。', start);
  if (end === -1) {
    throw new Error('CLAUDE.md "隐藏/高级 skill" declaration is not terminated by 。');
  }
  const span = md.slice(start, end);
  const names = [...span.matchAll(/`([^`]+)`/g)].map(m => m[1].trim());
  if (names.length === 0) {
    throw new Error('CLAUDE.md "隐藏/高级 skill" declaration has no backtick-quoted skill names');
  }
  return new Set(names);
}
const HIDDEN_SKILLS = parseHiddenSkills(claudeMd);
// Skills invoked via the Skill tool / external plugins: they live in
// routing-map + input-modes but have neither a local skill dir nor a command.
// Derived below from routing-map itself (invoke contains ':') — same
// single-source philosophy as parseHiddenSkills, no second hand-kept list.
let EXTERNAL_SKILLS;
// Non-skill directories under skills/office that must not be treated as skills.
const NOT_A_SKILL_DIR = new Set(['references']);

// Parse "key: { invoke }" pairs out of routing-map project_skills section.
function parseProjectSkills(text) {
  const out = []; // { key, invoke, canonical }
  const lines = text.split('\n');
  let inSection = false;
  let curKey = null;
  for (const raw of lines) {
    if (/^project_skills:\s*$/.test(raw)) { inSection = true; continue; }
    if (inSection && /^[a-zA-Z#]/.test(raw)) break; // next top-level section
    if (!inSection) continue;
    const keyMatch = raw.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
    if (keyMatch) { curKey = keyMatch[1]; out.push({ key: curKey, invoke: null }); continue; }
    const invMatch = raw.match(/^    invoke:\s*"?([^"\n]+?)"?\s*$/);
    if (invMatch && out.length) out[out.length - 1].invoke = invMatch[1];
  }
  for (const e of out) e.canonical = e.invoke ? canonical(e.invoke) : canonical(e.key.replace(/_/g, '-'));
  return out;
}

// Parse top-level keys under a named mapping block in a yaml-ish file.
function parseTopKeys(text, sectionName) {
  const out = [];
  const lines = text.split('\n');
  let inSection = false;
  for (const raw of lines) {
    if (new RegExp(`^${sectionName}:\\s*$`).test(raw)) { inSection = true; continue; }
    if (inSection && /^[a-zA-Z#]/.test(raw)) break;
    if (!inSection) continue;
    const m = raw.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

const ssotErrors = [];

// SSOT-1: every .claude/commands/<x>.md points to an existing target.
//   - SKILL.md reference must resolve to an existing file, OR
//   - it may run a script (status.md style) — that path must exist too.
const cmdDir = '.claude/commands';
const commandSkillNames = new Set(); // command files that map to a skill dir
for (const file of readdirSync(cmdDir).filter(f => f.endsWith('.md'))) {
  const body = readFileSync(join(cmdDir, file), 'utf8');
  const skillRef = body.match(/`([^`]*\/SKILL\.md)`/);
  const scriptRef = body.match(/`[^`]*?(scripts\/[^\s`]+)[^`]*`/);
  if (skillRef) {
    if (!existsSync(skillRef[1])) ssotErrors.push(`command ${file} points to missing skill file: ${skillRef[1]}`);
    const m = skillRef[1].match(/office\/([^/]+)\/SKILL\.md$/);
    if (m) commandSkillNames.add(m[1]);
    else if (!/office\/SKILL\.md$/.test(skillRef[1])) ssotErrors.push(`command ${file} skill path not under office/<skill>/: ${skillRef[1]}`);
  } else if (scriptRef) {
    if (!existsSync(scriptRef[1])) ssotErrors.push(`command ${file} runs missing script: ${scriptRef[1]}`);
  } else {
    ssotErrors.push(`command ${file} references neither a SKILL.md nor a script`);
  }
}

const projectSkills = parseProjectSkills(content);
EXTERNAL_SKILLS = new Set(projectSkills.filter(s => s.invoke && s.invoke.includes(':')).map(s => s.canonical));
const inputModesText = readFileSync('.claude/skill-os/input-modes.yaml', 'utf8');
const inputModeKeys = new Set([
  ...parseTopKeys(inputModesText, 'skills'),
  ...parseTopKeys(inputModesText, 'governance_tools'),
]);

for (const skill of projectSkills) {
  const id = skill.canonical;

  // SSOT-2: first-class project skill must have a matching command file
  // (unless on the documented hidden/advanced or external exclusion list).
  if (!HIDDEN_SKILLS.has(id) && !EXTERNAL_SKILLS.has(id) && !commandSkillNames.has(id)) {
    ssotErrors.push(`routing-map skill "${skill.key}" (${id}) has no .claude/commands/${id}.md pointing to its SKILL.md`);
  }

  // SSOT-3: every project skill must have an input-modes.yaml entry
  // (this is the gap ADR-0004 fixed for `compare`).
  if (!inputModeKeys.has(id)) {
    ssotErrors.push(`routing-map skill "${skill.key}" (${id}) has no input-modes.yaml entry`);
  }

  // SSOT-4: local (non-external) skills must have a backing SKILL.md directory.
  if (!EXTERNAL_SKILLS.has(id) && !existsSync(join('.claude/skills/office', id, 'SKILL.md'))) {
    ssotErrors.push(`routing-map skill "${skill.key}" (${id}) has no .claude/skills/office/${id}/SKILL.md`);
  }
}

// SSOT-5: naming consistency — the routing-map KEY (underscores normalized to
// hyphens) must equal the canonical id derived from `invoke`, and that id must
// be exactly how it appears in input-modes + commands. Catches superpowers /
// underscore-vs-hyphen / colon drift.
for (const skill of projectSkills) {
  const keyNorm = skill.key.replace(/_/g, '-');
  if (keyNorm !== skill.canonical) {
    ssotErrors.push(`naming drift: routing-map key "${skill.key}" normalizes to "${keyNorm}" but invoke implies canonical "${skill.canonical}"`);
  }
}

// SSOT-6: reverse direction — every command file that maps to a skill dir must
// have a corresponding routing-map project skill (no orphan first-class command).
const routingCanon = new Set(projectSkills.map(s => s.canonical));
for (const name of commandSkillNames) {
  if (!routingCanon.has(name) && !HIDDEN_SKILLS.has(name)) {
    ssotErrors.push(`command "${name}.md" maps to skill but has no routing-map project skill entry`);
  }
}

// SSOT-7: Plan Agent trigger conditions must be present across 3 surfaces:
//   plan-agent.md (source of truth, CN), CLAUDE.md (CN), AGENTS.md (EN).
// Detects drift like "plan-agent.md v2 added '用户明确要求' but the other two
// surfaces forgot to sync" (Audit 2026-05-28 finding C3).
const planAgentMd = readFileSync('.claude/agents/plan-agent.md', 'utf8');
const agentsMd = readFileSync('AGENTS.md', 'utf8');
// Each anchor must be unique enough to identify the SPECIFIC trigger condition
// (not just the general topic word). For drift-prone "example-only" rows like
// user-explicit, use the example phrase ("先做个计划") instead of the generic
// "用户明确要求" — the latter appears elsewhere in CLAUDE.md.
const PLAN_AGENT_CONDITIONS = [
  { id: '3-files',          cn: /≥\s*3\s*个文件/,                  en: /≥\s*3\s*files/ },
  { id: '2-subagents',      cn: /≥\s*2\s*个独立\s*subagent/i,       en: /≥\s*2\s*independent\s*subagent/i },
  { id: 'phase-dependency', cn: /阶段依赖/,                         en: /phase\s*dependency/i },
  { id: 'irreversible',     cn: /不可逆操作/,                        en: /irreversible\s*operations/i },
  { id: 'user-explicit',    cn: /先做个计划/,                        en: /先做个计划/ },
];
const SURFACES = [
  { name: 'plan-agent.md', text: planAgentMd },
  { name: 'CLAUDE.md',     text: claudeMd },
  { name: 'AGENTS.md',     text: agentsMd },
];
for (const cond of PLAN_AGENT_CONDITIONS) {
  for (const surface of SURFACES) {
    const hit = cond.cn.test(surface.text) || cond.en.test(surface.text);
    if (!hit) ssotErrors.push(`SSOT-7 ${surface.name} missing Plan Agent trigger condition "${cond.id}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SSOT-8/9: skill-NAME references in satellite yamls (2026-07 evolution scout
// byproduct: these two files had zero checker coverage; renamed skill → silent
// dangling entries). Real YAML parse via python3+PyYAML — regex shape-lints
// break on legal reformatting (quoted scalars / block lists) and go blind on
// block-style paths (2026-07-02 redteam, 6 confirmed defects in the regex v1).
// PyYAML is already required by lint:yaml locally and installed by the same CI
// job that runs this script.
// ─────────────────────────────────────────────────────────────────────────────
function parseYamlViaPython(path) {
  const out = execFileSync('python3', ['-c',
    'import yaml,json,sys; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path],
    { encoding: 'utf8' });
  return JSON.parse(out);
}

// Valid skill-name set also admits builtin skills (routing-map builtin_skills
// section: web-access / agent-browser / tdd / lark-* …) — they are legal path
// nodes even though they are not project skills.
const routingDoc = parseYamlViaPython('.claude/skill-os/skill-routing-map.yaml');
const builtinSkillNames = Object.values(routingDoc.builtin_skills || {}).map(e => e && e.skill).filter(Boolean);
const validSkillNames = new Set([...routingCanon, ...HIDDEN_SKILLS, ...EXTERNAL_SKILLS, ...builtinSkillNames, 'office']);

// SSOT-8 contract: scenes.*.{recommended,engineering,fallback}_paths[*][*],
// design_output.primary and design_output.fallback[*] carry ONLY skill names.
// research_default.tool_choice keys + angle_orchestration.object_angles ALSO
// carry skill names — validated by SSOT-8b below (concept-key allowlist covers
// non-skill keys like web_spike). Remaining concept identifiers (degrade_target,
// handoff_gates ids) are still NOT validated — hand check on rename (2026-07-21).
const graph = parseYamlViaPython('.claude/skill-os/optional-workflow-graph.yaml');
const graphRefs = [];
for (const [sceneKey, scene] of Object.entries(graph.scenes || {})) {
  for (const [field, val] of Object.entries(scene || {})) {
    if (!field.endsWith('_paths') || !Array.isArray(val)) continue;
    for (const path of val) for (const name of [].concat(path)) {
      graphRefs.push({ name, where: `scenes.${sceneKey}.${field}` });
    }
  }
}
const dOut = graph.design_output || {};
if (dOut.primary) graphRefs.push({ name: dOut.primary, where: 'design_output.primary' });
for (const name of [].concat(dOut.fallback || [])) graphRefs.push({ name, where: 'design_output.fallback' });
for (const ref of graphRefs) {
  if (!validSkillNames.has(String(ref.name))) {
    ssotErrors.push(`SSOT-8 optional-workflow-graph.yaml ${ref.where} references unknown skill "${ref.name}"`);
  }
}

// SSOT-8b (2026-07-21): research_default carries skill-name refs the path-only
// SSOT-8 missed — a skill rename would silently dangle here (found: 2026-07-20
// insight-synthesis adoption review). Validate tool_choice keys (skills) +
// angle_orchestration.object_angles. tool_choice mixes skill names with genuine
// concept keys (web_spike = a "就地一查" concept, not a skill) — allowlist those.
const RESEARCH_CONCEPT_KEYS = new Set(['web_spike']);
const rd = graph.research_default || {};
for (const key of Object.keys(rd.tool_choice || {})) {
  if (RESEARCH_CONCEPT_KEYS.has(key)) continue;
  if (!validSkillNames.has(key)) {
    ssotErrors.push(`SSOT-8b optional-workflow-graph.yaml research_default.tool_choice references unknown skill "${key}" (add to RESEARCH_CONCEPT_KEYS if it is a non-skill concept key)`);
  }
}
for (const name of (rd.angle_orchestration && rd.angle_orchestration.object_angles) || []) {
  if (!validSkillNames.has(String(name))) {
    ssotErrors.push(`SSOT-8b optional-workflow-graph.yaml research_default.angle_orchestration.object_angles references unknown skill "${name}"`);
  }
}

// SSOT-9 contract: rules[*].scope.skills — get_rules.py matches by exact string
// ("*" = wildcard), so every name must be a canonical skill name. The list must
// also stay FLOW-style ([a, b]): route-guard.mjs's loadRules() is a hand-rolled
// JS regex parser that only recognizes flow lists — a block list silently breaks
// its rule injection. (get_rules.py switched to real YAML 2026-07-04 and no
// longer cares, but the route-guard parser is the surviving consumer this
// format pin protects. Do not delete this check while route-guard parses by regex.)
const rulesDoc = parseYamlViaPython('.claude/observability/rules.yaml');
for (const rule of rulesDoc.rules || []) {
  for (const name of (rule.scope && rule.scope.skills) || []) {
    if (name !== '*' && !validSkillNames.has(String(name))) {
      ssotErrors.push(`SSOT-9 rules.yaml rule ${rule.id || '?'} scope.skills references unknown skill "${name}"`);
    }
  }
}
readFileSync('.claude/observability/rules.yaml', 'utf8').split('\n').forEach((ln, i) => {
  if (/^\s+skills:\s*(#.*)?$/.test(ln)) {
    ssotErrors.push(`SSOT-9 rules.yaml:${i + 1} scope.skills must be flow-style ([a, b]) — route-guard.mjs's regex parser only recognizes flow lists`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SSOT-10 (2026-07-04 G4): 条件 2 豁免名单三表同步 tripwire。
// 真值源 = plan-agent.md「当前符合：」行的反引号名单。断言：
//   (a) 每个名字是严格 skill token /^\/[a-z][\w-]*$/（防把 `SKILL.md`/路径吸进名单，R9）；
//   (b) CLAUDE.md 与 AGENTS.md 的条件 2 附近含同一名单（三表同步）；
//   (c) 名单里每个 skill 各自的 SKILL.md 命中其【专属】HITL 门语句锚（不是泛四词联合——
//       泛词会被"描述如何绕过 HITL"的反证文本满足，R2/R3）。
// 职责边界（红队 R2/R3 裁决）：这是"名单同步 + 门语句存在"的 tripwire，**不**替代对
// "门是否真实/足够"的人工判断——名单变更本身走 PR review（plan-agent.md 豁免段是文档）。
// 每-skill 专属锚定，措辞一旦定稿即冻结（如同隐藏 skill 声明行）。
try {
  const marker = '当前符合：';
  const mi = planAgentMd.indexOf(marker);
  if (mi === -1) throw new Error('plan-agent.md 缺「当前符合：」名单行——SSOT-10 无真值源');
  const spanEnd = planAgentMd.indexOf('。', mi);
  const span = planAgentMd.slice(mi, spanEnd === -1 ? mi + 200 : spanEnd);
  const roster = [...span.matchAll(/`([^`]+)`/g)].map(m => m[1].trim());
  if (!roster.length) throw new Error('plan-agent.md「当前符合：」行无反引号 skill 名');

  // (a) 严格 token
  const STRICT = /^\/[a-z][\w-]*$/;
  for (const name of roster) {
    if (!STRICT.test(name)) {
      ssotErrors.push(`SSOT-10 豁免名单含非法 token "${name}"（须匹配 /^\\/[a-z][\\w-]*$/）`);
    }
  }
  // (b) 三表同步：CLAUDE.md / AGENTS.md 条件 2 区域含同一名单
  //     锚定各文件里"条件 2"上下文的一段（避免全文误匹配）。
  const cond2Ctx = (md, kw) => {
    const i = md.indexOf(kw);
    return i === -1 ? '' : md.slice(i, i + 600);
  };
  const claudeCtx = cond2Ctx(claudeMd, '内部 HITL 编排类 skill 除外');
  const agentsCtx = cond2Ctx(agentsMd, 'internal-HITL orchestrator skills');
  if (!claudeCtx) ssotErrors.push('SSOT-10 CLAUDE.md 条件 2 缺「内部 HITL 编排类 skill 除外」豁免段');
  if (!agentsCtx) ssotErrors.push('SSOT-10 AGENTS.md 条件 2 缺 "internal-HITL orchestrator skills" 豁免段');
  // (b) 双向名单同步（2026-07-04 终验修：独立核验发现原实现只查 CLAUDE/AGENTS ⊇ roster，
  //     反向不查——从 plan-agent.md roster 删项 checker 仍绿，而 CLAUDE.md 是运行时真读的，
  //     stale 豁免留在那里持续误导 agent 却 CI 绿。现改为双向精确相等）。
  const claudeNames = new Set([...(claudeCtx.matchAll(/`(\/[a-z][\w-]*)`/g))].map(m => m[1]));
  const agentsNames = new Set([...(agentsCtx.matchAll(/`?(\/[a-z][\w-]*)`?/g))].map(m => m[1]));
  const rosterStrict = roster.filter(n => STRICT.test(n));
  for (const name of rosterStrict) {
    if (claudeCtx && !claudeNames.has(name)) ssotErrors.push(`SSOT-10 CLAUDE.md 条件 2 豁免名单缺 "${name}"（roster 有）`);
    if (agentsCtx && !agentsNames.has(name)) ssotErrors.push(`SSOT-10 AGENTS.md 条件 2 豁免名单缺 "${name}"（roster 有）`);
  }
  // 反向：CLAUDE.md 列了但 roster 没有 = stale 豁免，运行时误导 agent（更危险方向）
  for (const name of claudeNames) {
    if (!rosterStrict.includes(name)) ssotErrors.push(`SSOT-10 CLAUDE.md 条件 2 列了 "${name}" 但不在 plan-agent.md roster——stale 豁免须删或补进 roster`);
  }
  // (c) 每-skill 专属 HITL 门语句锚（本地 skill 才查目录）
  const HITL_ANCHOR = {
    '/auto': /等用户确认/,
    '/deepresearch': /AskUserQuestion/,
    '/ux-research': /不可跳过/,
    '/figma-demo': /唯一一次/,
    // muse fork 专属（2026-07-14 编排层评审收编）：GATE-1 经 muse-req-triage Phase 3 触发，
    // 此锚是其「不可绕过」承诺的原文；PLAN_CHECK 双保险仍由 ROUTE_GUARD_HEAVY_SKILLS 保留。
    '/muse-loop-orchestrate': /allow_standalone_override: false/,
  };
  // 反向：HITL_ANCHOR 有键但 roster 没有 = checker 与真值源脱节
  for (const key of Object.keys(HITL_ANCHOR)) {
    if (!rosterStrict.includes(key)) ssotErrors.push(`SSOT-10 HITL_ANCHOR 登记了 "${key}" 但不在 plan-agent.md roster——checker 与真值源脱节`);
  }
  for (const name of roster.filter(n => STRICT.test(n))) {
    const anchor = HITL_ANCHOR[name];
    if (!anchor) {
      ssotErrors.push(`SSOT-10 豁免名单含未登记专属锚的 skill "${name}"——新增豁免须在 check-routing-map.mjs HITL_ANCHOR 里登记其门语句锚`);
      continue;
    }
    const skillPath = `.claude/skills/office/${name.replace(/^\//, '')}/SKILL.md`;
    if (!existsSync(skillPath)) continue; // 外部/隐藏无目录的跳过 body 检查（名单同步已由 b 覆盖）
    if (!anchor.test(readFileSync(skillPath, 'utf8'))) {
      ssotErrors.push(`SSOT-10 ${name} 的 SKILL.md 未命中其 HITL 门语句锚 ${anchor}——豁免前提（内含确认门）可能已失效`);
    }
  }
} catch (e) {
  ssotErrors.push(`SSOT-10 校验异常: ${e.message}`);
}

if (ssotErrors.length) {
  console.error('FAIL skill SSOT consistency:');
  for (const e of ssotErrors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('PASS skill SSOT consistency');
