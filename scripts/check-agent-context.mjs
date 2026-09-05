#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));
const rootArg = process.argv.indexOf('--root');
const ROOT = rootArg >= 0 ? normalize(process.argv[rootArg + 1] || '') : defaultRoot;
if (!ROOT || !isAbsolute(ROOT)) {
  console.error('FAIL agent context: --root must be an absolute path');
  process.exit(1);
}

const errors = [];
const read = (path) => {
  const full = join(ROOT, path);
  if (!existsSync(full)) { errors.push(`missing ${path}`); return ''; }
  return readFileSync(full, 'utf8');
};
const json = (path) => {
  try { return JSON.parse(read(path)); }
  catch (error) { errors.push(`invalid JSON ${path}: ${error.message}`); return {}; }
};

const kernel = json('.claude/skill-os/agent-root-kernel.json');
const manifest = json('.claude/skill-os/agent-context-manifest.json');
const state = json('.claude/skill-os/agent-context-state.json');
const visibility = json('.claude/skill-os/skill-visibility.json');
const roots = ['CLAUDE.md', 'AGENTS.md'];
const rootText = Object.fromEntries(roots.map((path) => [path, read(path)]));
for (const path of roots) {
  if (!rootText[path].includes('.claude/skill-os/generated/skill-catalog.md')) errors.push(`${path} lacks skill catalog loader`);
  if (!rootText[path].includes('.claude/skill-os/agent-context-manifest.json')) errors.push(`${path} lacks conditional context manifest loader`);
}

const expectedIds = Array.from({ length: 10 }, (_, i) => `K${i + 1}`);
const obligations = Array.isArray(kernel.obligations) ? kernel.obligations : [];
const ids = obligations.map((entry) => entry.id);
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  errors.push(`K obligations must be exactly K1-K10 in order; got ${JSON.stringify(ids)}`);
}
for (const obligation of obligations) {
  if (!obligation.statement || !Array.isArray(obligation.required_terms) || obligation.required_terms.length < 3
      || !Array.isArray(obligation.required_patterns) || obligation.required_patterns.length === 0
      || !Array.isArray(obligation.forbidden_patterns) || obligation.forbidden_patterns.length === 0) {
    errors.push(`${obligation.id || '<unknown>'} lacks a statement, terms, or semantic patterns`);
  }
}

const requiredFields = [
  'id', 'obligation_ids', 'runtime', 'truth_owner', 'leading_words', 'condition', 'load_before',
  'target', 'contains', 'loader', 'read_to_end', 'fallback', 'fixtures',
];
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const seenEntries = new Set();
for (const entry of entries) {
  for (const field of requiredFields) {
    if (!(field in entry)) errors.push(`${entry.id || '<unknown>'} missing manifest field ${field}`);
  }
  if (!entry.id || seenEntries.has(entry.id)) errors.push(`duplicate/empty manifest id ${entry.id || '<empty>'}`);
  seenEntries.add(entry.id);
  if (!Array.isArray(entry.leading_words) || entry.leading_words.length === 0) errors.push(`${entry.id} has no leading_words`);
  if (!Array.isArray(entry.fixtures) || entry.fixtures.length === 0) errors.push(`${entry.id} has no fixtures`);
  if (!Array.isArray(entry.runtime) || entry.runtime.some((value) => !['claude', 'codex'].includes(value))) errors.push(`${entry.id} has invalid runtime`);
  if (!Array.isArray(entry.obligation_ids) || entry.obligation_ids.some((value) => !expectedIds.includes(value))) errors.push(`${entry.id} has invalid obligation_ids`);
  if (entry.read_to_end !== true) errors.push(`${entry.id} must set read_to_end=true`);
  if (typeof entry.target !== 'string' || !entry.target) continue;
  if (isAbsolute(entry.target) || entry.target.split('/').includes('..')) errors.push(`${entry.id} target escapes repository`);
  if (entry.target === '.claude/skill-os/agent-context-manifest.json') errors.push(`${entry.id} pointer cycle targets the manifest`);
  const full = join(ROOT, entry.target);
  if (!existsSync(full)) errors.push(`${entry.id} target missing: ${entry.target}`);
}

const runtimeDir = join(ROOT, '.claude/skill-os/runtime');
for (const entry of entries.filter((item) => String(item.target || '').startsWith('.claude/skill-os/runtime/'))) {
  const full = join(ROOT, entry.target);
  if (!existsSync(full)) continue;
  const bytes = statSync(full).size;
  if (bytes > Number(manifest.module_split_review_bytes || 16_384)) errors.push(`${entry.id} mega-module is ${bytes} bytes`);
  if (bytes > Number(manifest.module_soft_cap_bytes || 12_288)) errors.push(`${entry.id} exceeds module soft cap: ${bytes} bytes`);
  const text = readFileSync(full, 'utf8');
  const base = entry.target.split('/').pop();
  if (!text.includes(`<!-- FILE_END: skill-os/runtime/${base} -->`)) errors.push(`${entry.id} target lacks FILE_END`);
  if (/CONTEXT_TARGET:\s*\.claude\/skill-os\//.test(text)) errors.push(`${entry.id} creates a second-hop context pointer`);
}

const model = read('.claude/skill-os/model-routing.yaml');
const codexStart = model.indexOf('\ncodex:');
const codexEnd = model.indexOf('\nnew_scenario_protocol:', codexStart);
const codex = codexStart >= 0 ? model.slice(codexStart, codexEnd > codexStart ? codexEnd : undefined) : '';
if (/reasoning effort[^\n]*minimal/i.test(codex)) errors.push('Codex effort order contradicts the rejected minimal value');
if (!/effort_rejected_by_model:\s*\[minimal\]/.test(codex)) errors.push('Codex rejected effort list must contain minimal');
if (!/mechanical:\s*low\b/.test(codex)) errors.push('Codex mechanical tier must map to low');
if (!/effort_lineup:\s*\[none, low, medium, high, xhigh, max\]/.test(codex)) errors.push('Codex effort lineup drift');

const plan = read('.claude/agents/plan-agent.md');
for (const [name, pattern] of [
  ['three-file trigger', /≥\s*3\s*个文件/],
  ['two-subagent trigger', /≥\s*2\s*个独立 subagent/],
  ['phase-dependency trigger', /明确阶段依赖/],
  ['irreversible trigger', /不可逆操作/],
  ['explicit-plan trigger', /用户明确要求/],
  ['Supervisor approval', /Supervisor[\s\S]{0,120}用户确认/],
  ['Hierarchical approval', /Hierarchical[\s\S]{0,120}用户确认/],
]) {
  if (!pattern.test(plan)) errors.push(`plan contract missing ${name}`);
}

const promoted = read('memory/semantic/promoted-facts.yaml');
const allow = read('memory/semantic/static-fallback-allowlist.txt').split('\n')
  .map((line) => line.split('#')[0].trim()).filter(Boolean);
const promotedFacts = new Map();
const factPattern = /^\s*- id:\s*([^\n]+)\n\s+domain:\s*([^\n]+)\n\s+fact:\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([^\n]+))/gm;
for (const match of promoted.matchAll(factPattern)) {
  let fact = match[3] ?? match[4] ?? match[5] ?? '';
  if (match[3] !== undefined) {
    try { fact = JSON.parse(`"${match[3]}"`); } catch { /* reported as body drift below */ }
  }
  promotedFacts.set(match[1].trim(), { domain: match[2].trim(), fact: String(fact).trim() });
}
const canonicalLines = [];
for (const id of allow) {
  const fact = promotedFacts.get(id);
  if (!fact) { errors.push(`allowlisted fact missing from promoted facts: ${id}`); continue; }
  canonicalLines.push(`- [${id} / ${fact.domain}] ${fact.fact.replace(/\s+/g, ' ')}`);
}
const bounded = (text) => {
  const match = text.match(/<!-- STATIC_FALLBACK:START -->\n([\s\S]*?)\n<!-- STATIC_FALLBACK:END -->/);
  return match ? match[1].trim().split('\n').filter(Boolean) : null;
};
const generatedFallback = bounded(read('.claude/skill-os/generated/static-fallback.md'));
if (!generatedFallback || JSON.stringify(generatedFallback) !== JSON.stringify(canonicalLines)) errors.push('generated Static Fallback canonical body drift');
for (const path of roots) {
  const projected = bounded(rootText[path]);
  if (!projected || JSON.stringify(projected) !== JSON.stringify(canonicalLines)) errors.push(`${path} Static Fallback projection drift`);
}

const catalog = read('.claude/skill-os/generated/skill-catalog.md');
if (!catalog.includes('FILE_END: skill-os/generated/skill-catalog.md')) errors.push('skill catalog lacks FILE_END');
const catalogRows = [...catalog.matchAll(/^\| `([^`]+)` \|[^\n]*\| `([^`]+)` \|$/gm)];
const catalogNames = catalogRows.map((match) => match[1]);
const skillNames = ['office'];
const officeDir = join(ROOT, '.claude/skills/office');
if (existsSync(officeDir)) {
  for (const entry of (await import('node:fs')).readdirSync(officeDir, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(officeDir, entry.name, 'SKILL.md'))) skillNames.push(entry.name);
  }
}
skillNames.sort();
if (JSON.stringify([...catalogNames].sort()) !== JSON.stringify(skillNames)) errors.push(`skill catalog coverage drift: catalog=${catalogNames.length} disk=${skillNames.length}`);
for (const match of catalogRows) {
  const authority = match[2];
  if (isAbsolute(authority) || authority.split('/').includes('..') || !existsSync(join(ROOT, authority))) errors.push(`invalid catalog authority for ${match[1]}: ${authority}`);
}
const classified = [
  ...(visibility.visible_additions || []), ...(visibility.hidden || []), ...(visibility.internal || []),
];
if (new Set(classified).size !== classified.length) errors.push('skill visibility metadata overlaps');
const retired = Array.isArray(visibility.retired) ? visibility.retired : [];
if (visibility.version !== 2 || !Array.isArray(visibility.retired)) errors.push('skill visibility must expose version 2 retired tombstones');
const retiredNames = new Set();
for (const entry of retired) {
  const keys = entry && typeof entry === 'object' ? Object.keys(entry).sort() : [];
  const expectedKeys = ['boundary', 'decision_id', 'name', 'replacement', 'status'];
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    errors.push('retired skill entry must contain exactly name/status/replacement/decision_id/boundary');
    continue;
  }
  if (!/^[a-z][a-z0-9-]*$/.test(entry.name) || retiredNames.has(entry.name)) errors.push(`invalid or duplicate retired skill ${entry.name}`);
  retiredNames.add(entry.name);
  if (classified.includes(entry.name) || skillNames.includes(entry.name)) errors.push(`retired skill remains active: ${entry.name}`);
  if (entry.status !== 'retired-unavailable' || !skillNames.includes(entry.replacement)
      || !/^SC-\d{8}-\d{3}$/.test(entry.decision_id) || typeof entry.boundary !== 'string' || !entry.boundary.trim()) {
    errors.push(`invalid retired skill metadata: ${entry.name}`);
  }
  const line = `- \`${entry.name}\` — \`${entry.status}\`; replacement: \`${entry.replacement}\`; ${entry.boundary} (\`${entry.decision_id}\`)`;
  if (!catalog.includes(line)) errors.push(`skill catalog lacks retired tombstone: ${entry.name}`);
}
if (!retiredNames.has('figma-layer')) errors.push('required figma-layer retirement tombstone missing');

const office = read('.claude/skills/office/SKILL.md');
if (!/only user selected Workflow|仅用户选择 Workflow/.test(office)
    || !/classification or skill contract judgment does not load the graph|只做路由、分类或 skill 合同判断时不加载 graph/.test(office)) {
  errors.push('office graph loading is not bounded to Workflow execution');
}
if (!/处理 `\/office` 命令时[\s\S]{0,120}office-wizard\.md[\s\S]{0,160}其他 skill[\s\S]{0,80}无需读取向导文件/.test(office)) {
  errors.push('office wizard loading is not bounded to the /office command');
}
const openDesign = read('.claude/skills/office/open-design/SKILL.md');
if (!/稳定 ID[^\n]{0,80}完整原文/.test(openDesign) || !/只有 ID 的清单不是需求正文/.test(openDesign)) {
  errors.push('open-design handoff does not preserve ID plus complete source text');
}
const pageContext = read('.claude/skill-os/runtime/page-context.md');
if (!/只判断[^\n]{0,80}也读取本合同[^\n]{0,80}不运行/.test(pageContext)) {
  errors.push('page-context lacks decision-only contract loading boundary');
}

if (!['compat', 'claude-projected', 'roots-projected', 'projected'].includes(state.phase)) errors.push(`invalid context state phase ${state.phase}`);
if (state.phase === 'compat' && state.legacy_roots_required !== true) errors.push('compat phase must require legacy roots');
const projectedRoots = state.phase === 'claude-projected'
  ? ['CLAUDE.md']
  : ['roots-projected', 'projected'].includes(state.phase) ? roots : [];
for (const path of projectedRoots) {
    const text = rootText[path];
    for (const obligation of obligations) {
      const match = text.match(new RegExp(`<!-- ${obligation.id}:START -->([\\s\\S]*?)<!-- ${obligation.id}:END -->`));
      if (!match) { errors.push(`${path} missing ${obligation.id} inline block`); continue; }
      for (const term of obligation.required_terms) {
        if (!match[1].toLowerCase().includes(String(term).toLowerCase())) errors.push(`${path} ${obligation.id} missing required term ${term}`);
      }
      for (const source of obligation.required_patterns || []) {
        try {
          if (!new RegExp(source, 'i').test(match[1])) errors.push(`${path} ${obligation.id} missing required semantic pattern ${source}`);
        } catch (error) {
          errors.push(`${obligation.id} invalid required semantic pattern ${source}: ${error.message}`);
        }
      }
      for (const source of obligation.forbidden_patterns || []) {
        try {
          if (new RegExp(source, 'i').test(match[1])) errors.push(`${path} ${obligation.id} contains forbidden contradiction ${source}`);
        } catch (error) {
          errors.push(`${obligation.id} invalid forbidden semantic pattern ${source}: ${error.message}`);
        }
      }
      if (obligation.id === 'K4' && !match[1].includes('.claude/skill-os/generated/skill-catalog.md')) errors.push(`${path} K4 missing STOP discovery catalog pointer`);
      if (obligation.id === 'K4' && !match[1].includes('name the exact matching catalog skill')) errors.push(`${path} K4 missing exact skill discovery obligation`);
    }
}
if (['roots-projected', 'projected'].includes(state.phase)) {
  if (/mandatory startup context[\s\S]{0,800}read[^\n]*`?CLAUDE\.md`?/i.test(rootText['AGENTS.md'])) errors.push('AGENTS.md restored unconditional root cross-read');
}
if (state.phase === 'projected') {
  const context = read('CONTEXT.md');
  const crmProfile = read('.claude/skill-os/crm-profile.md');
  for (const [path, text] of [['CONTEXT.md', context], ['.claude/skill-os/crm-profile.md', crmProfile]]) {
    if (text.includes('component-map.md')) errors.push(`${path} restores the missing CRM component-map startup pointer`);
  }
  if (!context.includes('`.claude/skill-os/crm-profile.md`')) errors.push('CONTEXT.md lacks the direct CRM profile owner');
  if (!/仅做路由或母版保护规则判定[\s\S]{0,100}不继续读取设计/.test(crmProfile)) {
    errors.push('CRM profile lacks the decision-only asset-read boundary');
  }
  if (!crmProfile.includes('page_interaction_mapping') || !/缺少必需输入[\s\S]{0,100}停止并索取/.test(crmProfile)) {
    errors.push('CRM profile lost the real design missing-input gate');
  }
  for (const path of roots) {
    if (statSync(join(ROOT, path)).size > 11_264) errors.push(`${path} exceeds the 11 KiB root budget`);
    for (const legacy of ['## Loop 宪法', 'First-class skill table', 'Governance Parity']) {
      if (rootText[path].includes(legacy)) errors.push(`${path} restored legacy inline section: ${legacy}`);
    }
  }
  const claudeWithoutDenial = rootText['CLAUDE.md'].replace('Do not load `AGENTS.md`.', '');
  if (/(?:read|load)[^\n]{0,100}`?AGENTS\.md`?/i.test(claudeWithoutDenial)) errors.push('CLAUDE.md restored runtime root cross-read');
  if (/(?:read|load)[^\n]{0,100}`?CLAUDE\.md`?/i.test(rootText['AGENTS.md'])) errors.push('AGENTS.md restored runtime root cross-read');
  if (rootText['CLAUDE.md'].includes('claude-md-appendix.md') || rootText['AGENTS.md'].includes('claude-md-appendix.md') || JSON.stringify(manifest).includes('claude-md-appendix.md')) {
    errors.push('retired mega-appendix is reachable from runtime context');
  }
}

if (errors.length) {
  console.error(`FAIL agent context (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`PASS agent context: phase=${state.phase} K=10 pointers=${entries.length} catalog=${catalogNames.length} fallback=${canonicalLines.length}`);
