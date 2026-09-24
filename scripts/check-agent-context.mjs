#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
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
  if (!rootText[path].includes('.claude/skill-os/generated/context-index.md')) errors.push(`${path} lacks conditional context index loader`);
  if (!rootText[path].includes('.claude/skill-os/agent-context-manifest.json')) errors.push(`${path} lacks conditional context manifest loader`);
  if (!rootText[path].includes('≥ 3 files created or modified')) errors.push(`${path} Plan file trigger must specify creation or modification`);
  if (!rootText[path].includes('.claude/skill-os/runtime/workflow-mode.md')
      || !rootText[path].includes('.claude/skill-os/generated/input-modes/<key>.json')) {
    errors.push(`${path} lacks selected input-mode loading contract`);
  }
}
if (!/Select a subagent model role[\s\S]{0,240}reasoning effort remains independent/.test(rootText['AGENTS.md'])) {
  errors.push('AGENTS.md must keep model role selection independent from reasoning effort');
}
if (/Select subagent reasoning effort/.test(rootText['AGENTS.md'])) {
  errors.push('AGENTS.md must not route subagents by reasoning effort');
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
const contextIndex = read('.claude/skill-os/generated/context-index.md');
const operationalFields = ['id', 'obligation_ids', 'runtime', 'leading_words', 'condition', 'load_before',
  'target', 'contains', 'loader', 'read_to_end', 'fallback', 'truth_owner'];
try {
  const indexed = JSON.parse(contextIndex.match(/```json\n([\s\S]*?)\n```/)?.[1] || 'null');
  const expected = entries.map(entry => Object.fromEntries(operationalFields
    .filter(key => key in entry && (key !== 'truth_owner' || entry[key] !== entry.target))
    .map(key => [key, entry[key]])));
  if (JSON.stringify(indexed) !== JSON.stringify(expected)) errors.push('context index operational field/coverage drift');
} catch { errors.push('context index invalid JSON or operational drift'); }
if (!contextIndex.includes('<!-- FILE_END: skill-os/generated/context-index.md -->')) errors.push('context index lacks FILE_END');
const seenEntries = new Set();
for (const entry of entries) {
  for (const field of requiredFields) {
    if (!(field in entry)) errors.push(`${entry.id || '<unknown>'} missing manifest field ${field}`);
  }
  for (const field of Object.keys(entry)) {
    if (!requiredFields.includes(field)) errors.push(`${entry.id || '<unknown>'} unclassified manifest field ${field}`);
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

const workflowEntry = entries.find((entry) => entry.id === 'workflow-mode');
if (workflowEntry?.truth_owner !== '.claude/skill-os/input-modes.yaml'
    || workflowEntry?.target !== '.claude/skill-os/runtime/workflow-mode.md') {
  errors.push('workflow-mode must keep YAML truth_owner and runtime loading owner separate');
}
const workflowMode = read('.claude/skill-os/runtime/workflow-mode.md');
if (!workflowMode.includes('<!-- FILE_END: skill-os/runtime/workflow-mode.md -->')
    || !/selected.*generated\/input-modes\/<key>\.json|所选.*generated\/input-modes\/<key>\.json/s.test(workflowMode)
    || !/missing, unreadable, or proven stale|缺失、不可读或已证实过期/.test(workflowMode)
    || !/no specific input-mode override|无特定.*override/.test(workflowMode)) {
  errors.push('workflow-mode lacks selected-view, fallback, missing-key, or EOF contract');
}

const inputModeKeys = [
  'auto', 'handoff', 'wait-what', 'domain-modeling', 'writing-for-agents', 'magicpath',
  'open-design', 'idea', 'deepresearch', 'quick-research', 'brainstorm',
  'superpowers-brainstorming', 'ux-research', 'ux-brainstorm', 'design-brief',
  'html-prototype', 'figma-demo', 'tech-spec', 'task-plan', 'grilling', 'diagnosing-bugs',
  'resolving-merge-conflicts', 'to-spec', 'to-tickets', 'wayfinder', 'implement',
  'code-hygiene', 'code-review', 'codebase-design', 'code-recon', 'muse-req-triage',
  'insight-synthesis', 'research-kit', 'ux-writing', 'compare', 'ux-audit', 'redteam',
  'evals', 'retro',
];
const inputModeDir = join(ROOT, '.claude/skill-os/generated/input-modes');
const generatedModeEntries = existsSync(inputModeDir) ? readdirSync(inputModeDir, { withFileTypes: true }) : [];
const generatedModeNames = generatedModeEntries.map((entry) => entry.name).sort();
const expectedModeNames = inputModeKeys.map((key) => `${key}.json`).sort();
if (JSON.stringify(generatedModeNames) !== JSON.stringify(expectedModeNames)) {
  errors.push(`generated input-mode closed set drift: expected=39 actual=${generatedModeNames.length}`);
}
if (generatedModeEntries.some((entry) => !entry.isFile())) errors.push('generated input-mode closed set contains a non-file entry');
const inputModeSource = readFileSync(join(ROOT, '.claude/skill-os/input-modes.yaml'));
const inputModeSourceSha = createHash('sha256').update(inputModeSource).digest('hex');
for (const key of inputModeKeys) {
  const view = json(`.claude/skill-os/generated/input-modes/${key}.json`);
  const fields = Object.keys(view).sort();
  if (JSON.stringify(fields) !== JSON.stringify(['contract', 'global', 'group', 'schema_version', 'skill', 'source_sha256'])) {
    errors.push(`${key} input-mode view field set drift`);
    continue;
  }
  if (view.schema_version !== 1 || view.source_sha256 !== inputModeSourceSha || view.skill !== key
      || !['skills', 'governance_tools'].includes(view.group)
      || JSON.stringify(Object.keys(view.global || {}).sort()) !== JSON.stringify(['principle', 'version'])
      || view.global.version !== 1 || view.global.principle !== 'Skill-first, Graph-optional'
      || !view.contract || typeof view.contract !== 'object' || Array.isArray(view.contract)) {
    errors.push(`${key} input-mode view binding or complete-contract shape drift`);
  }
}
const builderCheck = spawnSync('python3', [join(ROOT, 'scripts/build-agent-context.py'), 'check'], {
  cwd: ROOT, encoding: 'utf8',
});
if (builderCheck.status !== 0) {
  errors.push(`generated input-mode semantic projection drift: ${`${builderCheck.stdout}${builderCheck.stderr}`.trim()}`);
}

const model = read('.claude/skill-os/model-routing.yaml');
const commonStart = model.indexOf('\nmodel_routing:');
const commonEnd = model.indexOf('\nknown_lineup:', commonStart);
const commonModel = commonStart >= 0
  ? model.slice(commonStart, commonEnd > commonStart ? commonEnd : undefined)
  : '';
const codexStart = model.indexOf('\ncodex:');
const codexEnd = model.indexOf('\nnew_scenario_protocol:', codexStart);
const codex = codexStart >= 0 ? model.slice(codexStart, codexEnd > codexStart ? codexEnd : undefined) : '';
if (!/\n\s{2}version:\s*2\b/.test(commonModel)) errors.push('common model policy must be v2');
if (!/\n\s{2}status:\s*active\b/.test(commonModel)) errors.push('common model policy must be active');
if (!/\n\s{2}scope:\s*common\b/.test(commonModel)) errors.push('model policy must be harness-neutral');
for (const role of ['anchor', 'peak', 'light']) {
  if (!new RegExp(`\\n\\s{4}${role}:`).test(commonModel)) errors.push(`common model policy lacks ${role} role`);
}
if (!/MR-008:[\s\S]*?role:\s*light\b/.test(commonModel)) errors.push('low-risk mechanical scene must use light role');
if (!/quality-gate:\s*MR-004\b/.test(commonModel)) errors.push('native quality-gate dispatch drift');
if (!/Redteam:\s*MR-003\b/.test(commonModel)) errors.push('workflow Redteam dispatch drift');
if (!/effort:\s*user-owned-not-a-routing-input\b/.test(commonModel)) errors.push('effort must not be a model-routing input');
if (/\bgpt-[\w.-]+\b/.test(commonModel)) errors.push('public common policy contains an account model name');
if (/^\s{2}model_routing:/m.test(codex)) errors.push('Codex contains a second model policy');
if (/^\s{2}tier_to_effort:/m.test(codex)) errors.push('Codex tier_to_effort must remain absent');
if (/reasoning effort[^\n]*minimal/i.test(codex)) errors.push('Codex effort order contradicts the rejected minimal value');
if (!/effort_rejected_by_model:\s*\[minimal\]/.test(codex)) errors.push('Codex rejected effort list must contain minimal');
if (!/\n\s{4}preflight-agent:\s*low\b/.test(codex)) errors.push('Codex fixed preflight-agent effort must remain low');
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
const engineeringModes = read('.claude/agents/references/plan-engineering-modes.md');
const designGuidance = read('.claude/agents/references/plan-design-guidance.md');
const expectedDesignGuidanceSha256 = '27d996d59268d48af48494b943d5dad225e294db52f2612a38316a5f3e10c645';
const designGuidanceSha256 = createHash('sha256').update(designGuidance).digest('hex');
const assertionExamples = read('.claude/agents/references/plan-assertion-examples.md');
const mandatoryDesignOutputGate = 'When a design chain proceeds from `design-brief` to implementation, the intervening design-output\n'
  + 'Phase is mandatory: it must not be omitted, merged with implementation, or bypassed by proceeding\n'
  + 'directly to implementation.';
const expectedOrderedDesignChain = [
  'For a full design chain, preserve this order and omit a node only when its applicability was',
  'explicitly assessed:',
  '',
  '```text',
  'research → brainstorm/PRD → ux-brainstorm → design-brief → design output → implementation',
  '```',
  '',
  'The design-output Phase is independent from implementation and exists to validate interaction; it',
  'must not be merged with a production implementation Phase. It starts only after the design-brief',
  "handoff gate passes and the chosen tool's availability/authority gate is resolved.",
  '',
  'When a design chain proceeds from `design-brief` to implementation, the intervening design-output',
  'Phase is mandatory: it must not be omitted, merged with implementation, or bypassed by proceeding',
  'directly to implementation.',
  '',
  '`ux-research` may run alongside an already-started brainstorm only when a PRD file exists, it',
  'contains target users and core features, and no blocking `[待确认]` remains. Otherwise it waits.',
].join('\n');
const orderedDesignChainMatch = designGuidance.match(/(?:^|\n)## Ordered design chain\n\n([\s\S]*?)\n\n## Design output choice and authority/);
const orderedDesignChain = orderedDesignChainMatch?.[1];
const orderedDesignChainPrefix = orderedDesignChainMatch
  ? designGuidance.slice(0, orderedDesignChainMatch.index) : designGuidance;
function markdownContainerState(text) {
  let fence = null;
  let htmlBlock = null;
  const blankTerminatedTags = /^(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)$/i;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  for (const line of lines) {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[\t ]*$/);
      if (close && close[1][0] === fence.marker && close[1].length >= fence.length) fence = null;
      continue;
    }
    if (htmlBlock) {
      if (htmlBlock.blankTerminated && /^[\t ]*$/.test(line)) htmlBlock = null;
      else if (htmlBlock.end && htmlBlock.end.test(line)) htmlBlock = null;
      continue;
    }
    const opener = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opener && !(opener[1][0] === '`' && opener[2].includes('`'))) {
      fence = { marker: opener[1][0], length: opener[1].length };
      continue;
    }
    const raw = line.replace(/^ {0,3}/, '');
    const typeOne = raw.match(/^<(script|pre|style|textarea)(?=[\t >]|$)/i);
    if (typeOne) {
      const end = /<\/(?:script|pre|style|textarea)>/i;
      if (!end.test(raw.slice(typeOne[0].length))) htmlBlock = { type: 'raw-tag', end };
      continue;
    }
    if (raw.startsWith('<!--')) {
      if (!raw.slice(4).includes('-->')) htmlBlock = { type: 'comment', end: /-->/ };
      continue;
    }
    if (raw.startsWith('<?')) {
      if (!raw.slice(2).includes('?>')) htmlBlock = { type: 'processing', end: /\?>/ };
      continue;
    }
    if (/^<![A-Z]/.test(raw)) {
      if (!raw.slice(2).includes('>')) htmlBlock = { type: 'declaration', end: />/ };
      continue;
    }
    if (raw.startsWith('<![CDATA[')) {
      if (!raw.slice(9).includes(']]>')) htmlBlock = { type: 'cdata', end: /\]\]>/ };
      continue;
    }
    const blockTag = raw.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)(?=[\t />]|$)/);
    if (blockTag && blankTerminatedTags.test(blockTag[1])) {
      htmlBlock = { type: 'block-tag', blankTerminated: true };
      continue;
    }
    const completeOpenTag = /^<[A-Za-z][A-Za-z0-9-]*(?:[\t ]+[A-Za-z_:][A-Za-z0-9_.:-]*(?:[\t ]*=[\t ]*(?:[^"'=<>`\u0000-\u0020]+|'[^']*'|"[^"]*"))?)*[\t ]*\/?>[\t ]*$/;
    const completeCloseTag = /^<\/[A-Za-z][A-Za-z0-9-]*[\t ]*>[\t ]*$/;
    if (completeOpenTag.test(raw) || completeCloseTag.test(raw)) {
      htmlBlock = { type: 'complete-tag', blankTerminated: true };
    }
  }
  return { inHtmlComment: htmlBlock?.type === 'comment', inRawHtmlBlock: htmlBlock !== null,
    inCodeFence: fence !== null };
}
const orderedDesignChainContainer = markdownContainerState(orderedDesignChainPrefix);
const invalidDesignControlCharacters = /[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/.test(designGuidance);
const designGuidanceOutsideOrderedChain = orderedDesignChainMatch
  ? designGuidance.replace(orderedDesignChainMatch[0], '') : designGuidance;
const designContradictionCorpus = designGuidance.replace(mandatoryDesignOutputGate, '')
  .replaceAll('`', '').replace(/\s+/g, ' ');
const contradictoryDesignOutputGate = [
  /\b(?:may|can)\s+(?:omit|skip|bypass)[^.]{0,220}\b(?:design-output|prototype)\b[^.]{0,220}\bimplementation\b/i,
  /\b(?:design-output|prototype)(?:\s+phase)?\b[^.]{0,100}\b(?:optional|unnecessary|dispensable|not\s+required|need\s+not|does\s+not\s+need\s+to|may\s+be\s+(?:omitted|skipped|bypassed)|can\s+be\s+(?:omitted|skipped|bypassed))\b[^.]{0,180}\b(?:implementation|design-brief)\b/i,
  /\bimplementation(?:\s+phase)?\b[^.]{0,100}\b(?:may|can|is\s+allowed\s+to|is\s+permitted\s+to)\b[^.]{0,100}\b(?:proceed|start|begin|move|advance|transition)\b[^.]{0,60}\b(?:directly|straight|immediately|right\s+away|at\s+once)\b[^.]{0,100}\b(?:from|after)\s+design-brief\b/i,
  /\b(?:after|from)\s+design-brief\b[^.]{0,160}\b(?:proceed|go|start|begin|move|advance|transition)\b[^.]{0,60}\b(?:directly|straight|immediately|right\s+away|at\s+once)\b[^.]{0,80}\b(?:to|into)\s+(?:the\s+)?implementation\b/i,
  /\b(?:may|can|is\s+allowed\s+to|is\s+permitted\s+to)\b[^.]{0,80}\b(?:proceed|go|move|advance|transition)\b[^.]{0,50}\b(?:directly|straight|immediately)\b[^.]{0,80}\b(?:from\s+design-brief\s+)?(?:to|into)\s+(?:the\s+)?implementation\b/i,
  /\b(?:implementation|design-brief)\b[^.]{0,180}\b(?:without|skipping|omitting|bypassing|dispensing\s+with|forgoing)\b[^.]{0,80}\b(?:the\s+)?(?:design-output|prototype)(?:\s+phase)?\b/i,
].some((pattern) => pattern.test(designContradictionCorpus));
if (!/wayfinder[\s\S]{0,320}plan-engineering-modes\.md/.test(plan)
    || !/研究、产品\/设计探索、原型或设计工具交接[\s\S]{0,200}plan-design-guidance\.md/.test(plan)
    || !/stock assertion template|stock.*template|模板[\s\S]{0,100}plan-assertion-examples\.md/.test(plan)) {
  errors.push('plan contract lacks conditional engineering/design/assertion reference loading');
}
if (!engineeringModes.includes('<!-- FILE_END: agents/references/plan-engineering-modes.md -->')
    || !/huge AND multi-session AND fog/.test(engineeringModes)
    || !/task_plan_sha256/.test(engineeringModes) || !/explicit confirmation|明确确认/.test(engineeringModes)) {
  errors.push('plan engineering-mode reference lost facade eligibility or approval boundary');
}
if (!designGuidance.includes('<!-- FILE_END: agents/references/plan-design-guidance.md -->')
    || designGuidanceSha256 !== expectedDesignGuidanceSha256
    || !/failure does not|故障.*does not|故障.*不/.test(designGuidance)
    || !/research → brainstorm\/PRD → ux-brainstorm → design-brief → design output → implementation/.test(designGuidance)
    || !/must occupy a separate Work Agent\/Phase/.test(designGuidance)
    || orderedDesignChain !== expectedOrderedDesignChain
    || orderedDesignChainContainer.inHtmlComment || orderedDesignChainContainer.inRawHtmlBlock
    || orderedDesignChainContainer.inCodeFence
    || invalidDesignControlCharacters
    || /\bimplementation\b/i.test(designGuidanceOutsideOrderedChain)
    || !designGuidance.includes(mandatoryDesignOutputGate)
    || contradictoryDesignOutputGate) {
  errors.push('plan design reference lost research, isolation, order, mandatory design-output/no-skip, or no-tool-switch boundary');
}
if (!assertionExamples.includes('<!-- FILE_END: agents/references/plan-assertion-examples.md -->')
    || !/npm test --silent/.test(assertionExamples) || !/bash scripts\/verify\.sh/.test(assertionExamples)
    || !/every MUST\s+requirement still needs at least one behavioural/.test(plan)) {
  errors.push('plan assertion examples or main behavioural-evidence rule drift');
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
  if (entry.status !== 'retired-unavailable' || !(entry.replacement === null || skillNames.includes(entry.replacement))
      || !/^(?:SC|RET)-\d{8}-\d{3}$/.test(entry.decision_id) || typeof entry.boundary !== 'string' || !entry.boundary.trim()) {
    errors.push(`invalid retired skill metadata: ${entry.name}`);
  }
  const line = `- \`${entry.name}\` — \`${entry.status}\`; replacement: \`${entry.replacement ?? 'none'}\`; ${entry.boundary} (\`${entry.decision_id}\`)`;
  if (!catalog.includes(line)) errors.push(`skill catalog lacks retired tombstone: ${entry.name}`);
}
if (!retiredNames.has('figma-layer')) errors.push('required figma-layer retirement tombstone missing');

const office = read('.claude/skills/office/SKILL.md');
if (!/only user selected Workflow|仅用户选择 Workflow/.test(office)
    || !/只做路由、分类或 skill 合同判断时[\s\S]{0,80}不加载[\s\S]{0,60}graph/.test(office)
    || !/实际执行 skill 且输入模式条件命中时[\s\S]{0,80}先完整读取[\s\S]{0,80}workflow-mode\.md[\s\S]{0,100}再只读取所选 skill[\s\S]{0,100}generated\/input-modes\/<key>\.json/.test(office)) {
  errors.push('office graph loading is not bounded to Workflow execution');
}
const learningActions = read('.claude/skills/office/references/learning-actions.md');
if (!/三个问题[\s\S]{0,800}\.claude\/skills\/office\/references\/learning-actions\.md/.test(office)
    || !/用户明确指出问题时必须记录 observation[\s\S]{0,800}\.claude\/skills\/office\/references\/learning-actions\.md/.test(office)
    || !/候选写入前完整读取 `\.claude\/skills\/office\/references\/learning-actions\.md`/.test(office)
    || !learningActions.includes('<!-- FILE_END: office/references/learning-actions.md -->')
    || !/write_observation\.py/.test(learningActions) || !/propose_semantic\.py/.test(learningActions)
    || !/Never write `CONTEXT\.md`/.test(learningActions)) {
  errors.push('office learning triggers, action owner, or no-auto-promotion boundary drift');
}
// Scope: the office-wizard section only, and each mention is judged by its OWN sentence.
//
// Two earlier versions of this guard were refuted by independent review. The first blacklisted
// phrasings and caught only the sentence its own mutation emitted. The second counted mentions
// document-wide and checked that the conditionality phrases existed *somewhere* in the file —
// so replanting `若明确要求审查` as a decoy line elsewhere let the real governing sentence be
// rewritten to unconditional while the checker still passed. Existence is not the property we
// need; sentence-local gating is.
//
// (1) Mention count inside the `## /office` section, over NFKC-normalised, case-folded,
//     backtick/space-stripped text, not requiring the `references/` prefix.
// (2) Every sentence in that section that names the file must carry a gating word BEFORE the
//     mention, and no universal quantifier before it. A decoy elsewhere cannot satisfy this,
//     because the test runs on the bearing sentence itself.
//
// WHAT THIS DOES NOT DO, stated so no one mistakes its reach: it is a drift detector for ordinary
// rewrites, not an adversarial boundary. A filename obfuscated with zero-width characters,
// combining marks, Cyrillic homoglyphs, or markdown/HTML splitting is not recognised as a mention
// and slips past, as does a pronoun-only reference naming no path. Chasing those spellings is a
// losing enumeration. Note also that nothing in `.claude/hooks/` enforces this at runtime — the
// exact-target policy in the A/B evaluator only runs during an authorized live call, so between
// those runs this prose gate is the only standing check, with the limits just stated.
const WIZARD_SECTION = /## \/office[\s\S]*$/;
const WIZARD_GATE_WORDS = /才|若|不得|除非|仅|只有/;
// A sentence cannot be both gated and universally quantified. This vetoes the shape that keeps the
// gate word while negating the condition around it ("无论…是否实际调用…时，才必须完整读取 <file>").
// This enumerates the logical operator class, not phrasings — deliberately small and closed.
// `均` is excluded on purpose: the prohibition sentence legitimately reads "…均不构成…调用".
const WIZARD_UNCONDITIONAL_WORDS = /无论|不论|任何|一律|总是|始终|每次|凡|regardless|whenever|always/i;
const stripForMatch = (text) => text.normalize('NFKC').toLowerCase().replace(/[`\s]/g, '');
function wizardMentionsAreSanctioned(office) {
  const section = office.match(WIZARD_SECTION)?.[0];
  if (!section) return false;
  if ([...stripForMatch(section).matchAll(/office-wizard\.md/g)].length !== 3) return false;
  const bearing = section.split(/[。\n]/).filter((line) => stripForMatch(line).includes('office-wizard.md'));
  // The gate must PRECEDE the mention: a conditional word in a trailing clause does not make the
  // read conditional. "无论用户是否提出要求，都应审查 <file>，但除非…否则不执行其中流程" still contains
  // 除非, yet the read it authorises is unconditional.
  return bearing.length > 0 && bearing.every((line) => {
    const at = line.toLowerCase().indexOf('office-wizard.md');
    const head = at >= 0 ? line.slice(0, at) : line;
    return WIZARD_GATE_WORDS.test(head) && !WIZARD_UNCONDITIONAL_WORDS.test(head);
  });
}

if (!/实际调用 office 向导入口[\s\S]{0,100}`\/office`[\s\S]{0,80}`\$office`[\s\S]{0,100}自然语言要求进入\/使用 office 向导[\s\S]{0,180}完整读取[\s\S]{0,20}执行[\s\S]{0,80}office-wizard\.md[\s\S]{0,220}审查对象[\s\S]{0,100}不执行其中流程[\s\S]{0,320}均不构成 office 向导入口调用[\s\S]{0,100}不得读取[\s\S]{0,80}office-wizard\.md/.test(office)
    || !wizardMentionsAreSanctioned(office)) {
  errors.push('office wizard loading is not bounded to explicit native or natural-language office-wizard invocation');
}
const openDesign = read('.claude/skills/office/open-design/SKILL.md');
if (!/稳定 ID[^\n]{0,80}完整原文/.test(openDesign) || !/只有 ID 的清单不是需求正文/.test(openDesign)) {
  errors.push('open-design handoff does not preserve ID plus complete source text');
}
const designBrief = read('.claude/skills/office/design-brief/SKILL.md');
if (!/phase-a-discovery/.test(designBrief)
    || !/CandidateHint[\s\S]{0,180}(?:不得写入|不写入)[\s\S]{0,80}Packet/.test(designBrief)
    || !/得到 `NO_HINT`，继续\s+design-brief/.test(designBrief)
    || !/Packet[\s\S]{0,260}冻结[\s\S]{0,600}carrier-binding/.test(designBrief)) {
  errors.push('design-brief lacks the V2 transient CandidateHint and frozen-Packet binding boundary');
}
const referenceOnlyHasExplicitNonDerivation = /reference_only[\s\S]{0,120}(?:必须明确标为|明确标为)[\s\S]{0,80}非模板衍生/.test(designBrief);
const referenceOnlyHasCarrierBoundary = /reference_only[\s\S]{0,220}(?:不含|没有)[\s\S]{0,160}carrier hash/.test(designBrief);
if (!referenceOnlyHasExplicitNonDerivation || !referenceOnlyHasCarrierBoundary) {
  errors.push('design-brief does not keep reference_only separate from template-derived carrier delivery');
}
const codexCarrierProbeRefusal = /Codex 不假设 OD carrier parity[\s\S]{0,140}capability probe 有成功证据后才可执行 carrier stage\/run\/recover；\s*此前拒绝或受控降级/.test(openDesign);
if (!/stage、run、recover 权限彼此独立/.test(openDesign)
    || !/handoff ID\/output root[\s\S]{0,160}不全项目枚举 HTML/.test(openDesign)
    || !/structural_carrier[\s\S]{0,200}(?:不构成视觉验收|不继承视觉)/.test(openDesign)
    || !/visual_carrier[\s\S]{0,180}(?:viewport|基线)[\s\S]{0,120}(?:阈值|差异)/.test(openDesign)
    || !codexCarrierProbeRefusal) {
  errors.push('open-design lacks the V2 authority, scoped-recovery, carrier-profile, or Codex-probe boundary');
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
  const contextCaseExtract = read('framework-audit/2026-09-21-context-case-extract.md');
  const crmProfile = read('.claude/skill-os/crm-profile.md');
  for (const [path, text] of [['CONTEXT.md', context], ['.claude/skill-os/crm-profile.md', crmProfile]]) {
    if (text.includes('component-map.md')) errors.push(`${path} restores the missing CRM component-map startup pointer`);
  }
  if (!context.includes('`.claude/skill-os/crm-profile.md`')) errors.push('CONTEXT.md lacks the direct CRM profile owner');
  if (!context.includes('`framework-audit/2026-09-21-context-case-extract.md`')
      || !/归因前先拉满样本矩阵/.test(context) || !/取数之前先问 luca 近期工作分布/.test(context)
      || /原生AI思维小结/.test(context)
      || !contextCaseExtract.includes('<!-- FILE_END: framework-audit/2026-09-21-context-case-extract.md -->')
      || !/原生AI思维小结/.test(contextCaseExtract)) {
    errors.push('CONTEXT historical extraction lost archive pointer, live investigation discipline, or exact case');
  }
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
