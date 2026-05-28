#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import assert from 'assert/strict';

const content = readFileSync('.claude/skill-os/skill-routing-map.yaml', 'utf8');
const claudeMd = readFileSync('CLAUDE.md', 'utf8');
const claudeHead = claudeMd.split('\n').slice(0, 40).join('\n');
const agentsHead = readFileSync('AGENTS.md', 'utf8').split('\n').slice(0, 40).join('\n');
const requiredInvokes = [
  '/auto',
  '/idea',
  '/deepresearch',
  '/brainstorm',
  'superpowers:brainstorming',
  '/ux-research',
  '/ux-audit',
  '/compare',
  '/ux-brainstorm',
  '/design-brief',
  'magicpath',
  '/html-prototype',
  '/figma-demo',
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
const EXTERNAL_SKILLS = new Set(['superpowers-brainstorming']);
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

if (ssotErrors.length) {
  console.error('FAIL skill SSOT consistency:');
  for (const e of ssotErrors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('PASS skill SSOT consistency');
