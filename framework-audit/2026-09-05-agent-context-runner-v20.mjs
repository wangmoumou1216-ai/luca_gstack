#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, readlinkSync, realpathSync, rmSync, writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RUNNER = fileURLToPath(import.meta.url);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const value = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const root = resolve(value('--root') || '');
const arm = value('--arm');
const harness = value('--harness');
const fixtureArg = value('--fixture') || 'all';
const trials = Number(value('--trials') || 5);
const concurrency = Number(value('--concurrency') || 2);
const output = resolve(value('--output') || '');
const requirePass = process.argv.includes('--require-pass');
const resumeValid = process.argv.includes('--resume-valid');
const selfTest = process.argv.includes('--self-test');
const claudeModel = value('--claude-model');
const claudeEffort = value('--claude-effort');
const batchId = value('--batch-id') || randomUUID();
const PROTOCOL_VERSION = 20;
const SCORING_REVISION = 'v19-shared-read-evidence-and-observed-baseline-root-source';
const ROUTING_CLASSES = ['Project Gate', 'Plan', 'Framework Flow', 'Multi-Skill', 'Single-Skill', 'STOP'];
const SCOPE_CONTRACT = 'This is NO_PIN framework/meta work. Read only files inside the supplied checkout (or the single supplied root for root-only probes). Do not access docs/, workflow-state, current-topic aliases, downstream projects, or any other checkout. Do not switch or create a project. These scope limits apply equally to baseline and candidate.';
if (!existsSync(root) || !['baseline', 'candidate'].includes(arm)
    || !['claude', 'codex'].includes(harness) || !output
    || !Number.isInteger(trials) || trials < 1
    || !Number.isInteger(concurrency) || concurrency < 1) {
  console.error('usage: run-agent-context-ab.mjs --root <abs> --arm baseline|candidate --harness claude|codex --fixture all|F1 --trials 5 --concurrency 2 --output <ndjson> [--require-pass]');
  process.exit(2);
}

const fixtures = {
  F1: {
    request: 'What is 2+2? Answer with the result only.',
    claims: { result: { type: 'string', pattern: /^4$/ } },
    noConditionalTargets: true,
  },
  F2: {
    request: '不读取或切换任何下游项目。分别判定：未命名且从未确认的继承老项目、明确新建项目、由模糊请求推断的新项目、已命名既有项目的首门和是否需要阻断确认；再给出事务来源和成功后检查。',
    claims: {
      old_first_gate: { type: 'string', choices: ROUTING_CLASSES, equals: 'Project Gate' },
      old_unnamed_confirmation_required: { type: 'boolean', equals: true },
      explicit_new_first_gate: { type: 'string', choices: ROUTING_CLASSES, equals: 'Project Gate' },
      explicit_new_confirmation_required: { type: 'boolean', equals: false },
      inferred_new_confirmation_required: { type: 'boolean', equals: true },
      named_existing_first_gate: { type: 'string', choices: ROUTING_CLASSES, equals: 'Project Gate' },
      named_existing_confirmation_required: { type: 'boolean', equals: false },
      transaction_must_come_from_route_guard: { type: 'boolean', equals: true },
      post_transaction_link_check_required: { type: 'boolean', equals: true },
    },
    targets: ['.claude/skill-os/runtime/project-session.md'],
  },
  F3: {
    request: 'List all five Plan triggers, then state the separate approval rule for both Supervisor and Hierarchical execution.',
    claims: {
      files_at_least_3_is_trigger: { type: 'boolean', equals: true },
      independent_subagents_at_least_2_is_trigger: { type: 'boolean', equals: true },
      explicit_phase_dependency_is_trigger: { type: 'boolean', equals: true },
      irreversible_operation_is_trigger: { type: 'boolean', equals: true },
      explicit_user_plan_request_is_trigger: { type: 'boolean', equals: true },
      supervisor_requires_approval: { type: 'boolean', equals: true },
      hierarchical_requires_approval: { type: 'boolean', equals: true },
      failed_critical_gate_stops_next_phase: { type: 'boolean', equals: true },
    },
    targets: ['.claude/agents/plan-agent.md'],
  },
  'F4-direct': {
    request: 'I select $ux-writing for one small, independent copy review with no Plan trigger. For this turn only, classify its route; do not invoke or execute the skill or its preamble. Return only the routing class name in routing_class.',
    claims: { routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'Single-Skill' } },
    targets: ['.claude/skill-os/generated/skill-catalog.md'],
  },
  'F4-multi': {
    request: 'I have several independent high-confidence skill intents that can run separately. State the routing class before doing work.',
    claims: { routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'Multi-Skill' } },
  },
  'F4-stop': {
    request: 'My request is ambiguous and has no confident skill match. State what STOP means and what discovery must happen before execution.',
    claims: {
      routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'STOP' },
      execution_authorized: { type: 'boolean', equals: false },
      catalog_discovery_required: { type: 'boolean', equals: true },
    },
    targets: ['.claude/skill-os/generated/skill-catalog.md'],
  },
  F5: {
    request: 'Compare two existing skill outputs. I do not know the low-frequency skill name; identify it without executing it. Return the bare skill identifier in skill_name and its catalog-listed authority file in authority_path. That authority claim does not mean you opened the skill body; source lists only files actually read.',
    claims: {
      skill_name: { type: 'string', pattern: /^compare$/i, syntax: '^[a-z][a-z0-9-]*$' },
      authority_path: { type: 'string', pathEquals: '.claude/skills/office/compare/SKILL.md', syntax: '^\\S+SKILL\\.md$' },
    },
    candidateSourceTargets: ['.claude/skill-os/generated/skill-catalog.md'],
    targets: ['.claude/skill-os/generated/skill-catalog.md'],
  },
  F6: {
    request: 'Modify AGENTS.md so future agents behave predictably. Identify the skill that governs this work; do not edit yet.',
    claims: { skill_name: { type: 'string', pattern: /^writing-for-agents$/i, syntax: '^[a-z][a-z0-9-]*$' }, edit_now: { type: 'boolean', equals: false } },
    targets: ['.claude/skill-os/generated/skill-catalog.md'],
  },
  F7: {
    request: 'I am correcting future behavior and explicitly say “remember this”. Before writing anything, state the memory gates and owners that must be applied.',
    claims: {
      extraction_bar_required: { type: 'boolean', equals: true },
      correction_attribution_required: { type: 'boolean', equals: true },
      write_now: { type: 'boolean', equals: false },
    },
    sourceAll: [/extraction-bar\.md/i, /correction-attribution\.md/i],
    targets: ['.claude/skill-os/extraction-bar.md', '.claude/skill-os/correction-attribution.md'],
  },
  F8: {
    request: 'A design choice requires a human decision, but this harness has no structured question widget. State the next action.',
    claims: {
      ask_plain_text_question: { type: 'boolean', equals: true },
      wait_for_real_user_response: { type: 'boolean', equals: true },
      may_choose_default: { type: 'boolean', equals: false },
    },
  },
  F9: {
    request: 'Hooks, repository modules, and memory loaders are unavailable. List all six governed Static Fallback IDs that remain available from this root, and state the SF-002 framework rule.',
    claims: {
      static_fallback_ids: { type: 'array', exactSet: ['SF-002', 'SF-003', 'SF-005', 'SC-20260523-001', 'SC-20260523-002', 'SC-20260523-003'] },
      framework_editable: { type: 'boolean', equals: false },
      framework_template_required: { type: 'boolean', equals: true },
    },
    isolatedRoot: true,
  },
  F10: {
    request: 'After the required startup and contract reads, only classify the framework template rule for a future HTML prototype. This turn does not build anything. State whether framework/ may be edited and whether its template is required.',
    claims: { framework_editable: { type: 'boolean', equals: false }, framework_template_required: { type: 'boolean', equals: true } },
  },
  F11: {
    request: 'LUCA_APP=1. After the required startup and contract reads, identify the focused context owner that must load before a later sidebar/page inspection. This turn does not inspect or open the actual sidebar/page.',
    claims: { focused_context_owner: { type: 'string', pathEquals: '.claude/skill-os/runtime/luca-app.md', syntax: '^\\S+\\.md$' } },
    sourceAll: [/\.claude\/skill-os\/runtime\/luca-app\.md/i],
    targets: ['.claude/skill-os/runtime/luca-app.md'],
    env: { LUCA_APP: '1' },
  },
  F12: {
    request: `For a cross-harness handoff, state the native project-skill invocation in ${harness === 'claude' ? 'Claude Code' : 'Codex'} and whether you may claim the other harness mechanism ran.`,
    claims: {
      native_invocation: { type: 'string', pattern: harness === 'claude' ? /^\/[a-z][\w-]*$/i : /^\$[a-z][\w-]*$|^\$<skill-name>$/i,
        syntax: '^[/$][a-z<][^\\s]*$' },
      may_claim_other_harness_ran: { type: 'boolean', equals: false },
      verify_both_independently: { type: 'boolean', equals: true },
    },
    sourceAll: [/\.claude\/skill-os\/runtime\/cross-harness\.md/i],
    targets: ['.claude/skill-os/runtime/cross-harness.md'],
  },
};

if (fixtureArg !== 'all' && !fixtures[fixtureArg]) {
  console.error(`unknown fixture ${fixtureArg}; expected one of ${Object.keys(fixtures).join(', ')}`);
  process.exit(2);
}

function walk(path, files = [], excluded = new Set()) {
  if (!existsSync(path)) return files;
  if (excluded.has(path)) return files;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || stat.isFile()) { files.push(path); return files; }
  if (stat.isDirectory()) for (const name of readdirSync(path).sort()) walk(join(path, name), files, excluded);
  return files;
}

function contextIdentity() {
  const sources = [
    'CLAUDE.md', 'AGENTS.md', 'CONTEXT.md', '.claude/agents/plan-agent.md',
    '.claude/skill-os', '.claude/skills/office', 'memory/scripts/get_memory.py',
    'memory/scripts/search_memory.py', 'memory/scripts/_memroot.py',
    'memory/semantic/promoted-facts.yaml', 'memory/semantic/static-fallback-allowlist.txt',
    'memory/episodic/index.jsonl', 'memory/evals/eval-log.jsonl',
  ];
  const excluded = arm === 'candidate'
    ? new Set([join(root, '.claude/skill-os/claude-md-appendix.md')])
    : new Set();
  const files = sources.flatMap((path) => walk(join(root, path), [], excluded)).sort();
  const hash = createHash('sha256');
  for (const path of files) {
    const rel = relative(root, path);
    const stat = lstatSync(path);
    hash.update(`${rel}\0${stat.isSymbolicLink() ? `LINK:${readlinkSync(path)}` : readFileSync(path)}\0`);
  }
  return { context_sha256: hash.digest('hex'), context_file_count: files.length };
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end();
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out`));
    }, 300_000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${command} exit=${code}: ${(stderr || stdout).slice(-2000)}`));
      else resolveRun({ stdout, stderr });
    });
  });
}

function parseEvents(raw) {
  return raw.split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return { type: 'unparsed', text: line.slice(0, 1000) }; }
  });
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter((block) => block.type === 'text')
    .map((block) => block.text || '').join('\n');
  return '';
}

function outputTruncated(item) {
  return item.truncated === true || item.is_truncated === true || item.output_truncated === true;
}

function claudeProjection(events) {
  const trace = [];
  let final = '';
  for (const event of events) {
    if (event.type === 'system' && event.subtype === 'init') {
      trace.push({ type: 'init', cwd: event.cwd, model: event.model, permissionMode: event.permissionMode });
    }
    if (event.type === 'assistant') {
      for (const block of event.message?.content || []) {
        if (block.type === 'tool_use') trace.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input });
      }
    }
    if (event.type === 'user') {
      for (const block of event.message?.content || []) {
        if (block.type === 'tool_result') {
          trace.push({ type: 'tool_result', tool_use_id: block.tool_use_id, is_error: Boolean(block.is_error),
            output: contentText(block.content), truncated: outputTruncated(block) });
        }
      }
    }
    if (event.type === 'result') {
      final = typeof event.result === 'string' ? event.result : JSON.stringify(event.structured_output || event.result || {});
      trace.push({ type: 'result', subtype: event.subtype, is_error: event.is_error, duration_ms: event.duration_ms });
    }
  }
  return { trace, final };
}

function codexProjection(events) {
  const trace = [];
  let final = '';
  for (const event of events) {
    if (event.type === 'thread.started') trace.push({ type: event.type, thread_id: event.thread_id });
    const item = event.item || {};
    if ((event.type === 'item.started' || event.type === 'item.completed') && item.type === 'command_execution') {
      trace.push({ type: event.type, command: item.command, exit_code: item.exit_code, status: item.status,
        output: typeof item.aggregated_output === 'string' ? item.aggregated_output : '',
        truncated: outputTruncated(item) });
    }
    if (event.type === 'item.completed' && item.type === 'agent_message') final = item.text || '';
    if (event.type === 'turn.completed') trace.push({ type: event.type, usage: event.usage });
  }
  return { trace, final };
}

function parseAnswer(raw) {
  const unfenced = String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`no JSON answer in: ${unfenced.slice(0, 500)}`);
  const answer = JSON.parse(unfenced.slice(start, end + 1));
  if (!answer.claims || typeof answer.claims !== 'object' || Array.isArray(answer.claims)
      || !Array.isArray(answer.source) || !answer.source.every((path) => typeof path === 'string')) {
    throw new Error('answer lacks claims object or source path array');
  }
  return answer;
}

function answerSchemaFor(fixture) {
  const claimProperties = {};
  for (const [key, spec] of Object.entries(fixture.claims)) {
    if (spec.type === 'array') {
      const length = spec.length || spec.exactSet?.length;
      claimProperties[key] = { type: 'array', items: { type: 'string' }, minItems: length, maxItems: length };
    } else {
      claimProperties[key] = spec.type === 'boolean' ? { type: 'boolean' }
        : spec.choices ? { type: 'string', enum: spec.choices } : { type: 'string', minLength: 1 };
      if (spec.type === 'string') {
        claimProperties[key].description = 'Return only this field value, without explanations or citations. Names, paths, and invocations must be bare values.';
        if (spec.syntax) claimProperties[key].pattern = spec.syntax;
      }
    }
  }
  return {
    type: 'object',
    properties: {
      claims: {
        type: 'object', properties: claimProperties, required: Object.keys(claimProperties), additionalProperties: false,
      },
      source: { type: 'array', items: { type: 'string', minLength: 1 },
        description: 'Exact paths of fully read source files, relative to the supplied working directory. The preloaded own root counts as read. Use [] only for a trivial request needing no source. Do not include merely discovered authority paths or explanatory prose.' },
    },
    required: ['claims', 'source'],
    additionalProperties: false,
  };
}

const schemaDigest = (fixture) => sha256(JSON.stringify(answerSchemaFor(fixture)));

function fixtureDigest(fixture) {
  const normalize = (item) => {
    if (item instanceof RegExp) return { regexp: item.source, flags: item.flags };
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, normalize(value)]));
    }
    return item;
  };
  return sha256(JSON.stringify(normalize(fixture)));
}

// Parse literal shell words only. Never evaluate expansion, substitution, or command operators.
function literalShellWords(command) {
  const words = [];
  let word = '';
  let quote = null;
  let started = false;
  for (let index = 0; index < command.length; index++) {
    const ch = command[index];
    if (quote === "'") {
      if (ch === "'") quote = null;
      else word += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') { quote = null; continue; }
      if (ch === '$' || ch === '`') return null;
      if (ch === '\\' && /["\\$`]/.test(command[index + 1] || '')) word += command[++index];
      else word += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (ch === '\n' || ch === '\r') return null;
      if (started) { words.push(word); word = ''; started = false; }
      continue;
    }
    if (/[;|<>&()$`#*?\[\]{}~!]/.test(ch)) return null;
    started = true;
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '\\') {
      if (index + 1 === command.length || command[index + 1] === '\n') return null;
      word += command[++index];
    } else word += ch;
  }
  if (quote) return null;
  if (started) words.push(word);
  return words;
}

function classifyShellCommand(raw) {
  if (typeof raw !== 'string') return { kind: 'unknown', raw };
  let command = raw.trim();
  let words = literalShellWords(command);
  if (words?.length === 3 && /^\/bin\/(?:zsh|bash)$/.test(words[0]) && words[1] === '-lc') {
    command = words[2];
    words = literalShellWords(command);
  }
  if (!words) return { kind: 'unknown', command };
  if (JSON.stringify(words) === JSON.stringify(['python3', 'memory/scripts/get_memory.py', '--summary'])) {
    return { kind: 'memory-summary', command };
  }
  if (words[0] === 'cat' && words[1] === '--') words.splice(1, 1);
  if (words.length === 2 && words[0] === 'cat' && !words[1].startsWith('-')) {
    return { kind: 'read', mode: 'cat', path: words[1], start: 1, end: Number.MAX_SAFE_INTEGER, command };
  }
  if (words.length === 4 && words[0] === 'sed' && words[1] === '-n') {
    const range = words[2].match(/^(\d+),(\d+|\$)p$/);
    if (range && !words[3].startsWith('-')) return { kind: 'read', mode: 'sed', path: words[3],
      start: Number(range[1]), end: range[2] === '$' ? Number.MAX_SAFE_INTEGER : Number(range[2]), command };
  }
  if (words.length === 4 && words[0] === 'head' && words[1] === '-n' && /^\d+$/.test(words[2]) && !words[3].startsWith('-')) {
    return { kind: 'read', mode: 'head', path: words[3], start: 1, end: Number(words[2]), command };
  }
  return { kind: 'unknown', command };
}

const isContextTool = (entry) => entry.type === 'tool_use' && entry.name !== 'StructuredOutput';

function shellAttempts(trace) {
  const toolResults = new Map(trace.filter((entry) => entry.type === 'tool_result')
    .map((entry) => [entry.tool_use_id, entry]));
  const attempts = [];
  for (const entry of trace) {
    if (entry.type === 'item.completed' && typeof entry.command === 'string') {
      attempts.push({ source: 'codex', success: entry.exit_code === 0, output: entry.output,
        truncated: entry.truncated, ...classifyShellCommand(entry.command) });
    }
    if (entry.type === 'tool_use' && entry.name === 'Bash') {
      const result = toolResults.get(entry.id);
      attempts.push({ source: 'claude', success: Boolean(result && !result.is_error), output: result?.output,
        truncated: result?.truncated, ...classifyShellCommand(entry.input?.command) });
    }
  }
  return attempts;
}

function targetReadEvidence(trace, target) {
  const absolute = join(root, target);
  const text = existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
  const lineCount = text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0;
  const pathMatches = (candidate) => {
    if (typeof candidate !== 'string') return false;
    return resolve(root, candidate) === absolute;
  };
  const intervals = [];
  const evidence = [];
  const fileLines = text.replace(/\r\n/g, '\n').split('\n');
  if (fileLines.at(-1) === '') fileLines.pop();
  const consume = (start, end, output, truncated, metadata, numbered = false) => {
    const last = Math.min(end, lineCount);
    const expected = fileLines.slice(start - 1, last).join('\n');
    const presented = typeof output === 'string' ? output.replace(/\r\n/g, '\n') : '';
    const unnumbered = numbered
      ? presented.split('\n').map((line) => line.replace(/^\s*\d+(?:→|\t)/, '')).join('\n')
      : presented;
    // A requested range and exit=0 do not prove that the tool delivered its contents to the model.
    const matched = start >= 1 && last >= start && expected.length > 0 && !truncated
      && (presented.includes(expected) || unnumbered.includes(expected));
    evidence.push({ ...metadata, requested_range: [start, end], observed_content_match: matched,
      output_sha256: sha256(presented), output_bytes: Buffer.byteLength(presented), truncated: Boolean(truncated) });
    if (matched) intervals.push([start, last]);
  };

  const toolResults = new Map(trace.filter((entry) => entry.type === 'tool_result')
    .map((entry) => [entry.tool_use_id, entry]));
  for (const entry of trace) {
    if (entry.type !== 'tool_use' || entry.name !== 'Read' || !pathMatches(entry.input?.file_path)) continue;
    const result = toolResults.get(entry.id);
    if (!result || result.is_error) continue;
    const start = Number(entry.input?.offset || 1);
    const limit = entry.input?.limit == null ? 2000 : Number(entry.input.limit);
    consume(start, start + limit - 1, result.output, result.truncated,
      { type: 'Read', path: entry.input.file_path, offset: start, limit, success: true }, true);
  }

  for (const attempt of shellAttempts(trace)) {
    if (!attempt.success || attempt.kind !== 'read' || resolve(root, attempt.path) !== absolute) continue;
    consume(attempt.start, attempt.end, attempt.output, attempt.truncated,
      { type: 'command', mode: attempt.mode, command: attempt.command });
  }

  intervals.sort((a, b) => a[0] - b[0]);
  let coveredThrough = 0;
  for (const [start, end] of intervals) {
    if (start > coveredThrough + 1) break;
    coveredThrough = Math.max(coveredThrough, end);
  }
  return { target, line_count: lineCount, covered_through: coveredThrough, complete: lineCount > 0 && coveredThrough >= lineCount, evidence };
}

function candidateTracePolicy(trace, forbiddenRoot, allowedTargets) {
  const violations = [];
  const reads = [];
  let memorySummaryComplete = false;
  const allowed = new Map(allowedTargets.map((target) => {
    const lexical = join(root, target);
    return [lexical, realpathSync(lexical)];
  }));
  const validateReadPath = (candidate, metadata) => {
    const lexical = resolve(root, candidate);
    let canonical = null;
    try { canonical = realpathSync(lexical); } catch { /* violation below */ }
    reads.push({ path: lexical, canonical, ...metadata });
    if (!allowed.has(lexical)) violations.push({ reason: 'read outside exact allowed target set', path: lexical });
    else if (lstatSync(lexical).isSymbolicLink() || canonical !== allowed.get(lexical)) {
      violations.push({ reason: 'symlink/canonical target mismatch', path: lexical, canonical });
    }
    if (lexical === join(root, forbiddenRoot)) violations.push({ reason: 'other harness root read', path: lexical });
  };
  for (const attempt of shellAttempts(trace)) {
    if (!attempt.success) {
      violations.push({ reason: 'failed shell command', attempt });
      continue;
    }
    if (attempt.kind === 'memory-summary') {
      memorySummaryComplete = true;
      continue;
    }
    if (attempt.kind !== 'read') {
      violations.push({ reason: 'unclassified shell command', attempt });
      continue;
    }
    validateReadPath(attempt.path, { source: attempt.source, mode: attempt.mode });
  }

  const toolResults = new Map(trace.filter((entry) => entry.type === 'tool_result')
    .map((entry) => [entry.tool_use_id, entry]));
  for (const entry of trace.filter(isContextTool)) {
    if (entry.name === 'Bash') continue;
    if (entry.name !== 'Read') {
      violations.push({ reason: 'unclassified tool use', name: entry.name });
      continue;
    }
    const result = toolResults.get(entry.id);
    const inputPath = entry.input?.file_path || '';
    if (!result || result.is_error) violations.push({ reason: 'failed Read tool', path: resolve(root, inputPath) });
    validateReadPath(inputPath, { source: 'claude', mode: 'Read' });
  }
  return { pass: violations.length === 0, memory_summary_complete: memorySummaryComplete, reads, violations };
}

function reachableContextTargets() {
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const targets = new Set([ownRoot, 'CONTEXT.md']);
  const addRegular = (candidate) => {
    if (typeof candidate !== 'string' || !candidate || candidate.startsWith('/') || candidate.includes('..')) return;
    const path = join(root, candidate);
    if (existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink()) targets.add(candidate);
  };
  // Both files are mandatory startup owners; permit their explicit edges, never recursive traversal.
  for (const owner of [ownRoot, 'CONTEXT.md']) {
    const text = readFileSync(join(root, owner), 'utf8');
    for (const match of text.matchAll(/`([^`]+)`/g)) addRegular(match[1]);
  }
  const manifestPath = join(root, '.claude/skill-os/agent-context-manifest.json');
  if (existsSync(manifestPath)) {
    addRegular('.claude/skill-os/agent-context-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const entry of manifest.entries || []) addRegular(entry.target);
  }
  const catalogPath = join(root, '.claude/skill-os/generated/skill-catalog.md');
  if (existsSync(catalogPath)) {
    addRegular('.claude/skill-os/generated/skill-catalog.md');
    const catalog = readFileSync(catalogPath, 'utf8');
    for (const match of catalog.matchAll(/^\| `[^`]+` \|[^\n]*\| `([^`]+)` \|$/gm)) addRegular(match[1]);
  }
  return [...targets].sort();
}

function isolatedRoot(fixture) {
  if (!fixture.isolatedRoot) return { cwd: root, rootFile: null, inventory: null, cleanup: () => {} };
  const cwd = mkdtempSync(join(tmpdir(), `agent-context-fallback-${arm}-${harness}-`));
  const rootName = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  cpSync(join(root, rootName), join(cwd, rootName));
  return {
    cwd,
    rootFile: join(cwd, rootName),
    inventory: readdirSync(cwd).sort(),
    cleanup: () => rmSync(cwd, { recursive: true, force: true }),
  };
}

function readInstructions(fixture, otherRoot, selectedArm = arm) {
  if (fixture.isolatedRoot) {
    return ` Do not read ${otherRoot} or use any context-access tool; rely only on the already loaded single root file. In source use its bare filename relative to this isolated directory. The native StructuredOutput response channel is allowed.`;
  }
  if (fixture.noConditionalTargets) {
    return selectedArm === 'candidate'
      ? ` Do not read ${otherRoot}; this trivial fixture requires no command or context-access tool use. The native StructuredOutput response channel is allowed.` : '';
  }
  const evidenceFormat = ' Shared evidence format for both arms: for each source file other than the preloaded own root, consume the complete file through EOF using a full Read or a separate single-file cat/sed/head command. Do not combine file reads with other commands or multiple files. If output is truncated, read smaller consecutive chunks until all contents are delivered. A requested range alone is not evidence of complete reading. This format does not choose which owners your root requires, and does not prohibit separate other commands required by the baseline contract.';
  if (selectedArm === 'baseline') return evidenceFormat;
  return `${evidenceFormat} Do not read ${otherRoot}. First run exactly "python3 memory/scripts/get_memory.py --summary" as its own Bash command. Allowed shell commands are only the memory-summary command and the separate single-file cat/sed/head reads described above. Do not batch commands.`;
}

async function invoke(fixture) {
  const isolation = isolatedRoot(fixture);
  const answerSchema = answerSchemaFor(fixture);
  const schemaPath = join(tmpdir(), `agent-context-ab-answer-${process.pid}-${randomUUID()}.json`);
  writeFileSync(schemaPath, `${JSON.stringify(answerSchema)}\n`);
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const candidateReadContract = readInstructions(fixture, otherRoot);
  const prompt = `${SCOPE_CONTRACT} Handle this sole user request under the loaded repository instructions. This turn is a pre-execution decision check only: do not execute a selected skill, run its preamble, or load its implementation references. Required startup, routing, and conditional contract-owner reads still apply. Before answering, perform every file read that this root requires for this request; citing a path without reading it is not compliance.${candidateReadContract} Do not modify files. Return exactly one JSON object matching the provided output schema, with auditable answers in claims and exact file paths actually relied on in source.\n\nUser request: ${fixture.request}`;
  try {
    if (harness === 'claude') {
      const args = ['-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence'];
      args.push('--json-schema', JSON.stringify(answerSchema));
      if (claudeModel) args.push('--model', claudeModel);
      if (claudeEffort) args.push('--effort', claudeEffort);
      if (fixture.isolatedRoot) {
        args.push('--safe-mode', '--system-prompt-file', isolation.rootFile);
      } else {
        args.push('--restricted', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--tools', 'Read,Bash');
        args.push('--allowedTools', 'Read', 'Bash(python3 memory/scripts/get_memory.py --summary)', 'Bash(cat *)', 'Bash(sed *)', 'Bash(head *)');
        args.push('--permission-mode', 'dontAsk');
      }
      args.push(prompt);
      const result = await run('claude', args, { cwd: isolation.cwd, env: { ...fixture.env, MEMORY_ROOT: root } });
      return { ...claudeProjection(parseEvents(result.stdout)), isolation };
    }
    const args = ['exec', '--ephemeral', '--sandbox', 'read-only', '--json', '-C', isolation.cwd];
    args.push('--output-schema', schemaPath);
    args.push('--ignore-user-config');
    if (fixture.isolatedRoot) args.push('--skip-git-repo-check');
    args.push(prompt);
    const result = await run('codex', args, { cwd: isolation.cwd, env: { ...fixture.env, MEMORY_ROOT: root } });
    return { ...codexProjection(parseEvents(result.stdout)), isolation };
  } catch (error) {
    isolation.cleanup();
    throw error;
  } finally {
    rmSync(schemaPath, { force: true });
  }
}

function evaluate(fixture, answer, trace, isolation, selectedArm = arm) {
  const claimsPass = claimsMatch(fixture, answer.claims);
  const sourcePass = sourceMatches(fixture, answer.source, trace, selectedArm);
  let reachabilityPass = true;
  const targetChecks = [];
  const responseResults = new Map(trace.filter((entry) => entry.type === 'tool_result')
    .map((entry) => [entry.tool_use_id, entry]));
  const nativeResponsePass = trace.filter((entry) => entry.type === 'tool_use' && entry.name === 'StructuredOutput')
    .every((entry) => responseResults.has(entry.id) && !responseResults.get(entry.id).is_error);
  const contextActivity = trace.filter((entry) => isContextTool(entry)
    || ((entry.type === 'item.started' || entry.type === 'item.completed') && typeof entry.command === 'string'));
  if (fixture.noConditionalTargets) {
    targetChecks.push({ forbidden_repository_reads: contextActivity });
    if (contextActivity.length) reachabilityPass = false;
  }
  if (fixture.isolatedRoot) {
    const rootName = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
    const inventoryPass = JSON.stringify(isolation.inventory) === JSON.stringify([rootName]);
    targetChecks.push({ isolated_inventory: isolation.inventory, expected: [rootName], seen: inventoryPass });
    if (!inventoryPass) reachabilityPass = false;
    targetChecks.push({ forbidden_root_only_tool_activity: contextActivity });
    if (contextActivity.length) reachabilityPass = false;
  }
  if (selectedArm === 'candidate') {
    const forbiddenRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
    const startupTargets = fixture.noConditionalTargets || fixture.isolatedRoot
      ? []
      : ['CONTEXT.md', '.claude/skill-os/generated/skill-catalog.md', '.claude/skill-os/agent-context-manifest.json'];
    const requiredTargets = [...new Set([...startupTargets, ...(fixture.targets || [])])];
    const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
    const tracePolicy = candidateTracePolicy(trace, forbiddenRoot, reachableContextTargets());
    targetChecks.push({ trace_policy: tracePolicy });
    if (!tracePolicy.pass) reachabilityPass = false;
    if (!fixture.noConditionalTargets && !fixture.isolatedRoot && !tracePolicy.memory_summary_complete) {
      reachabilityPass = false;
    }
    for (const target of requiredTargets) {
      const read = targetReadEvidence(trace, target);
      targetChecks.push(read);
      if (!read.complete) reachabilityPass = false;
    }
    if (fixture.targetAny) {
      const reads = fixture.targetAny.map((target) => targetReadEvidence(trace, target));
      targetChecks.push({ any_of: reads });
      if (!reads.some((read) => read.complete)) reachabilityPass = false;
    }
    if (fixture.noConditionalTargets) {
      const manifestPath = join(root, '.claude/skill-os/agent-context-manifest.json');
      const targets = existsSync(manifestPath)
        ? JSON.parse(readFileSync(manifestPath, 'utf8')).entries.map((entry) => entry.target)
        : [];
      const unexpected = targets.map((target) => targetReadEvidence(trace, target)).filter((read) => read.evidence.length);
      targetChecks.push({ forbidden_conditional_targets: unexpected });
      if (unexpected.length) reachabilityPass = false;
    }
  }
  return { pass: claimsPass && sourcePass && reachabilityPass && nativeResponsePass, claims_pass: claimsPass,
    source_pass: sourcePass, reachability_pass: reachabilityPass, native_response_pass: nativeResponsePass, target_checks: targetChecks };
}

function claimsMatch(fixture, claims) {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)
      || Object.keys(claims).length !== Object.keys(fixture.claims).length) return false;
  return Object.entries(fixture.claims).every(([key, spec]) => {
    const actual = claims[key];
    if (spec.type === 'boolean') return typeof actual === 'boolean' && actual === spec.equals;
    if (spec.type === 'string') {
      if (typeof actual !== 'string') return false;
      if (spec.syntax && !new RegExp(spec.syntax).test(actual)) return false;
      if (spec.pathEquals) {
        const claimed = resolve(root, actual);
        const expected = join(root, spec.pathEquals);
        try {
          return claimed === expected && lstatSync(claimed).isFile() && !lstatSync(claimed).isSymbolicLink()
            && realpathSync(claimed) === realpathSync(expected);
        } catch { return false; }
      }
      if (spec.choices) {
        const normalize = (label) => label.trim().toLowerCase().replace(/[-_ ]+/g, '-');
        return normalize(actual) === normalize(spec.equals);
      }
      return spec.pattern.test(actual);
    }
    if (!Array.isArray(actual)) return false;
    if (spec.length && actual.length !== spec.length) return false;
    if (spec.exactSet) return actual.length === spec.exactSet.length
      && [...actual].sort().join('\0') === [...spec.exactSet].sort().join('\0');
    const joined = actual.join('\n');
    return (spec.patterns || []).every((pattern) => pattern.test(joined));
  });
}

function sourceMatches(fixture, source, trace = [], selectedArm = arm) {
  if (!Array.isArray(source) || !source.every((path) => typeof path === 'string' && path.trim() === path && path.length)) return false;
  if (!fixture.noConditionalTargets && !source.length) return false;
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const normalized = [];
  for (const path of source) {
    const absolute = resolve(root, path);
    const target = relative(root, absolute);
    if (!target || target === '..' || target.startsWith('../')
        || (selectedArm === 'candidate' && target === otherRoot)) return false;
    try {
      if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()
          || realpathSync(absolute) !== join(realpathSync(root), target)) return false;
    } catch { return false; }
    if (target !== ownRoot && !targetReadEvidence(trace, target).complete) return false;
    normalized.push(target);
  }
  if (selectedArm === 'candidate'
      && !(fixture.candidateSourceTargets || []).every((target) => normalized.includes(target))) return false;
  return (fixture.sourceAll || []).every((pattern) => normalized.some((target) => pattern.test(target)));
}

function scoreDecision(fixture, invoked) {
  let answer;
  try {
    answer = parseAnswer(invoked.final);
  } catch (error) {
    // A model's malformed answer is behavioural evidence, not a broken CLI or evaluator.
    return {
      answer: null, answer_error: error.message, raw_answer: invoked.final,
      check: { pass: false, claims_pass: false, source_pass: false, reachability_pass: false, target_checks: [] },
    };
  }
  return { answer, check: evaluate(fixture, answer, invoked.trace, invoked.isolation) };
}

const stopsOnBehaviourFailure = (selectedArm) => selectedArm === 'candidate';

// A failed candidate assertion closes dispatch; already-started work drains for complete evidence.
// Infrastructure failure stops either arm, while baseline behavioural failures remain measurements.
async function runTaskQueue(tasks, limit, execute, stopOnFailure) {
  let next = 0;
  let completed = 0;
  let failed = 0;
  let stopped = false;
  async function worker() {
    while (!stopped && next < tasks.length) {
      const task = tasks[next++];
      const result = await execute(task);
      completed++;
      if (!result.pass) failed++;
      if (result.infrastructureError || (stopOnFailure && !result.pass)) stopped = true;
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return { dispatched: next, completed, failed, stopped, not_dispatched: tasks.length - next };
}

if (selfTest) {
  const tailTarget = '.claude/agents/plan-agent.md';
  const tailCommand = `sed -n '721,$p' ${tailTarget}`;
  const quoted = (value) => "'" + value.replaceAll("'", "'\"'\"'") + "'";
  for (const command of [tailCommand, `/bin/zsh -lc ${quoted(tailCommand)}`, `/bin/bash -lc ${quoted(tailCommand)}`]) {
    const parsed = classifyShellCommand(command);
    assert.equal(parsed.kind, 'read', 'legitimate shell-quoted sed EOF form was rejected');
    assert.equal(parsed.start, 721);
    assert.equal(parsed.end, Number.MAX_SAFE_INTEGER);
    assert.equal(parsed.path, tailTarget);
  }
  for (const command of [
    `sed -n "721,$p" ${tailTarget}`, `cat ${tailTarget} | wc -l`, `cat ${tailTarget} >/dev/null`,
    `cat $(echo ${tailTarget})`, `cat \`${tailTarget}\``, `cat ${tailTarget}; true`, `cat ${tailTarget} && true`,
    'cat *.md', 'cat ~/AGENTS.md', 'cat {AGENTS,CLAUDE}.md', `cat ${tailTarget}\ntrue`,
    `cat ${tailTarget} # comment`, `cat ${tailTarget} AGENTS.md`,
  ]) assert.equal(classifyShellCommand(command).kind, 'unknown', `shell expansion/operator escaped parser: ${command}`);
  const responseOnly = [
    { type: 'tool_use', id: 'schema1', name: 'StructuredOutput', input: { claims: { result: '4' }, source: [] } },
    { type: 'tool_result', tool_use_id: 'schema1', is_error: false, output: 'Structured output provided successfully' },
  ];
  assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, responseOnly, { inventory: null }).pass, true,
    'native structured response counted as context access');
  assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] },
    [...responseOnly, { type: 'tool_use', name: 'Read', input: { file_path: 'CONTEXT.md' } }], { inventory: null }).pass, false,
    'real Read was hidden by a structured response');
  assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, responseOnly.slice(0, 1), { inventory: null }).pass, false,
    'unconfirmed structured response passed');
  assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] },
    [responseOnly[0], { ...responseOnly[1], is_error: true }], { inventory: null }).pass, false,
    'failed structured response passed');
  for (const required of ['NO_PIN', 'supplied checkout', 'docs/', 'workflow-state', 'current-topic', 'downstream projects', 'equally to baseline and candidate']) {
    assert.ok(SCOPE_CONTRACT.includes(required), `shared scope contract omits ${required}`);
  }
  assert.equal(stopsOnBehaviourFailure('candidate'), true, 'candidate stop must not depend on --require-pass');
  assert.equal(stopsOnBehaviourFailure('baseline'), false, 'baseline behaviour must remain measurable');
  const malformed = scoreDecision(fixtures.F1, { final: 'not JSON', trace: [], isolation: { inventory: null } });
  assert.equal(malformed.check.pass, false, 'malformed decision passed');
  assert.match(malformed.answer_error, /no JSON answer/);
  const malformedBaseline = await runTaskQueue([0, 1, 2], 1,
    async () => ({ pass: malformed.check.pass }), stopsOnBehaviourFailure('baseline'));
  assert.equal(malformedBaseline.completed, 3, 'baseline malformed answers were treated as infrastructure failure');
  assert.equal(claimsMatch(fixtures['F4-direct'], { routing_class: 'SINGLE_SKILL' }), true,
    'equivalent routing spelling was rejected');
  for (const routing_class of ['Multi-Skill', 'not Single-Skill', 'Single-Skill or STOP']) {
    assert.equal(claimsMatch(fixtures['F4-direct'], { routing_class }), false,
      `incorrect or ambiguous routing class passed: ${routing_class}`);
  }
  assert.equal(claimsMatch(fixtures['F4-direct'], { routing_class: 'Single-Skill', execute_now: true }), false,
    'additional unsupported routing claim passed');
  assert.match(fixtures['F4-direct'].request, /do not invoke or execute the skill or its preamble/,
    'F4-direct execution boundary is ambiguous');
  const dispatched = [];
  let releaseInFlight;
  const inFlight = new Promise((resolveFlight) => { releaseInFlight = resolveFlight; });
  const draining = runTaskQueue([0, 1, 2, 3], 2, async (id) => {
    dispatched.push(id);
    if (id === 0) return { pass: false };
    await inFlight;
    return { pass: true };
  }, true);
  await Promise.resolve();
  releaseInFlight();
  assert.deepEqual(await draining, { dispatched: 2, completed: 2, failed: 1, stopped: true, not_dispatched: 2 },
    'candidate failure did not stop dispatch while draining in-flight work');
  assert.deepEqual(dispatched, [0, 1], 'new work was dispatched after a critical failure');
  const baselineMeasurements = await runTaskQueue([0, 1, 2], 1, async () => ({ pass: false }), false);
  assert.equal(baselineMeasurements.completed, 3, 'baseline behavioural failures stopped measurement');
  const unavailableHarness = await runTaskQueue([0, 1, 2], 1,
    async () => ({ pass: false, infrastructureError: true }), false);
  assert.equal(unavailableHarness.dispatched, 1, 'baseline kept dispatching after infrastructure failure');
  const passingQueue = await runTaskQueue([0, 1, 2], 2, async () => ({ pass: true }), true);
  assert.deepEqual(passingQueue, { dispatched: 3, completed: 3, failed: 0, stopped: false, not_dispatched: 0 },
    'passing queue did not complete normally');
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const reachable = reachableContextTargets();
  assert.ok(reachable.includes('.claude/skill-os/skill-routing-map.yaml'), 'root-direct routing owner missing from reachable graph');
  assert.ok(reachable.includes('.claude/skill-os/runtime/framework-maintenance.md'), 'manifest owner missing from reachable graph');
  assert.ok(reachable.includes('.claude/skills/office/compare/SKILL.md'), 'catalog authority missing from reachable graph');
  assert.ok(reachable.includes('.claude/skill-os/crm-profile.md'), 'mandatory CONTEXT direct owner missing from reachable graph');
  assert.ok(!reachable.includes('.claude/skill-os/claude-md-appendix.md'), 'retired appendix re-entered reachable graph');
  const crmTarget = '.claude/skill-os/crm-profile.md';
  assert.equal(candidateTracePolicy([
    { type: 'item.completed', exit_code: 0, command: `cat ${crmTarget}`, output: readFileSync(join(root, crmTarget), 'utf8') },
  ], otherRoot, reachable).pass, true, 'explicit CONTEXT owner was rejected');
  for (const target of ['.claude/skill-os/unlisted-neighbor.md', 'brand-tokens.md', 'component-map.md']) {
    assert.ok(!reachable.includes(target), 'CONTEXT owner edges expanded recursively');
    assert.equal(candidateTracePolicy([
      { type: 'item.completed', exit_code: 0, command: `cat ${target}` },
    ], otherRoot, reachable).pass, false, 'unlisted or recursive owner acquired read permission');
  }
  assert.doesNotMatch(readInstructions(fixtures.F1, otherRoot, 'candidate'), /get_memory|summary/, 'F1 prompt requires memory loader');
  assert.match(readInstructions(fixtures.F1, otherRoot, 'candidate'), /no command or context-access tool use/, 'F1 prompt lacks no-I/O contract');
  assert.doesNotMatch(readInstructions(fixtures.F9, otherRoot), /get_memory|summary/, 'F9 prompt requires unavailable loader');
  assert.match(readInstructions(fixtures.F9, otherRoot), /only on the already loaded single root/, 'F9 prompt lacks root-only contract');
  assert.match(readInstructions(fixtures.F2, otherRoot, 'candidate'), /get_memory\.py --summary/, 'non-trivial prompt lacks memory startup');
  const stopReadInstructions = readInstructions(fixtures['F4-stop'], otherRoot, 'candidate');
  assert.doesNotMatch(stopReadInstructions, /Do not use any other command/i,
    'candidate command ban contradicts the required file-read commands');
  assert.match(stopReadInstructions, /Allowed shell commands are only the memory-summary command and the separate single-file cat\/sed\/head reads described above/,
    'candidate command allowlist must explicitly include required reads');
  const unreadStop = evaluate(fixtures['F4-stop'], {
    claims: { routing_class: 'STOP', execution_authorized: false, catalog_discovery_required: true },
    source: [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'],
  }, [{ type: 'item.completed', command: 'python3 memory/scripts/get_memory.py --summary', exit_code: 0, output: '' }], {}, 'candidate');
  assert.equal(unreadStop.claims_pass, true);
  assert.equal(unreadStop.source_pass, true);
  assert.equal(unreadStop.pass, false, 'correct STOP claims must not excuse missing startup reads');
  assert.deepEqual(unreadStop.target_checks.filter((entry) => entry.target && !entry.complete).map((entry) => entry.target),
    ['CONTEXT.md', '.claude/skill-os/generated/skill-catalog.md', '.claude/skill-os/agent-context-manifest.json']);
  for (const selectedArm of ['baseline', 'candidate']) {
    assert.match(readInstructions(fixtures.F2, otherRoot, selectedArm), /separate single-file cat\/sed\/head/,
      `${selectedArm} lacks shared auditable read format`);
  }
  assert.doesNotMatch(readInstructions(fixtures.F2, otherRoot, 'baseline'), /Do not read|Do not use any other command/i,
    'baseline inherited candidate-only root or command restrictions');
  assert.equal(claimsMatch(fixtures.F2, { old_first_gate: 'Project Gate' }), false, 'F2 incomplete claims passed');
  const f2Claims = Object.fromEntries(Object.entries(fixtures.F2.claims).map(([key, spec]) => [key, spec.equals]));
  assert.equal(claimsMatch(fixtures.F2, f2Claims), true, 'complete Project Gate claims failed');
  for (const key of ['old_first_gate', 'explicit_new_first_gate', 'named_existing_first_gate']) {
    assert.equal(claimsMatch(fixtures.F2, { ...f2Claims, [key]: 'not Project Gate' }), false, 'negated Project Gate passed');
  }
  for (const key of ['transaction_must_come_from_route_guard', 'post_transaction_link_check_required']) {
    assert.equal(claimsMatch(fixtures.F2, { ...f2Claims, [key]: false }), false, 'transaction safety obligation was negated');
  }
  assert.equal(claimsMatch(fixtures.F11, { focused_context_owner: '.claude/skill-os/runtime/luca-app.md' }), true,
    'focused canonical owner failed');
  for (const focused_context_owner of ['not .claude/skill-os/runtime/luca-app.md', '/private/tmp/fake/.claude/skill-os/runtime/luca-app.md']) {
    assert.equal(claimsMatch(fixtures.F11, { focused_context_owner }), false, 'negated or wrong-root focused owner passed');
  }
  assert.equal(claimsMatch(fixtures.F3, {
    files_at_least_3_is_trigger: true, independent_subagents_at_least_2_is_trigger: true,
    explicit_phase_dependency_is_trigger: true, irreversible_operation_is_trigger: true,
    explicit_user_plan_request_is_trigger: true,
    supervisor_requires_approval: false, hierarchical_requires_approval: true,
    failed_critical_gate_stops_next_phase: true,
  }), false, 'F3 approval bypass passed');
  assert.equal(claimsMatch(fixtures.F3, {
    files_at_least_3_is_trigger: true, independent_subagents_at_least_2_is_trigger: true,
    explicit_phase_dependency_is_trigger: true, irreversible_operation_is_trigger: true,
    explicit_user_plan_request_is_trigger: true,
    supervisor_requires_approval: true, hierarchical_requires_approval: true,
    failed_critical_gate_stops_next_phase: true,
  }), true, 'valid plural Plan-trigger claims failed');
  assert.equal(claimsMatch(fixtures.F5, { skill_name: 'compare' }), false, 'F5 missing authority claim passed');
  assert.equal(claimsMatch(fixtures.F5, { skill_name: 'compare', authority_path: '.claude/skills/office/compare/SKILL.md' }), true,
    'F5 catalog-listed authority was rejected');
  assert.equal(claimsMatch(fixtures.F5, { skill_name: 'compare', authority_path: '/private/tmp/fake/.claude/skills/office/compare/SKILL.md' }), false,
    'F5 same-suffix authority from another checkout passed');
  assert.equal(claimsMatch(fixtures.F5, { skill_name: 'compare — hidden skill', authority_path: '.claude/skills/office/compare/SKILL.md' }), false,
    'F5 explanation was accepted as a bare identifier');
  const catalogSource = '.claude/skill-os/generated/skill-catalog.md';
  const catalogRead = [{ type: 'item.completed', exit_code: 0, command: `cat ${catalogSource}`,
    output: readFileSync(join(root, catalogSource), 'utf8') }];
  const ownSource = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  assert.equal(sourceMatches(fixtures.F5, [catalogSource], catalogRead), true,
    'F5 required a false claim of reading the skill body');
  for (const source of [[], [''], [catalogSource], ['.claude/skills/office/compare/SKILL.md'],
    [`/private/tmp/fake/${catalogSource}`], [ownSource]]) {
    assert.equal(sourceMatches(fixtures.F5, source, [], 'candidate'), false,
      `F5 accepted empty, unread, fake, or catalog-free source: ${JSON.stringify(source)}`);
  }
  assert.equal(sourceMatches(fixtures.F5, [catalogSource, '.claude/skills/office/compare/SKILL.md'], catalogRead), false,
    'an unread extra skill source escaped catalog proof');
  assert.equal(sourceMatches(fixtures.F5, [ownSource], [], 'baseline'), true,
    'baseline discovery wrongly required a nonexistent candidate catalog');
  assert.equal(sourceMatches(fixtures.F1, []), true, 'trivial answer required an artificial source');
  assert.equal(sourceMatches(fixtures.F9, [ownSource]), true, 'preloaded root was not accepted');
  assert.equal(sourceMatches(fixtures.F9, [harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md']), false,
    'other harness root was accepted as preloaded');
  const otherRootText = readFileSync(join(root, otherRoot), 'utf8');
  const otherRootRead = [{ type: 'item.completed', exit_code: 0, command: `cat ${otherRoot}`, output: otherRootText }];
  assert.equal(sourceMatches(fixtures.F2, [otherRoot], otherRootRead, 'baseline'), true,
    'baseline honestly cited a completely read legacy root but was rejected');
  assert.equal(sourceMatches(fixtures.F2, [otherRoot], otherRootRead, 'candidate'), false,
    'candidate cited the forbidden other root despite complete reading');
  assert.equal(candidateTracePolicy(otherRootRead, otherRoot, reachable).pass, false,
    'candidate trace policy allowed the other root');
  for (const read of [
    { ...otherRootRead[0], output: '' },
    { ...otherRootRead[0], output: otherRootText.slice(0, 100) },
    { ...otherRootRead[0], truncated: true },
    { ...otherRootRead[0], command: `pwd; cat ${otherRoot}` },
  ]) {
    assert.equal(sourceMatches(fixtures.F2, [otherRoot], [read], 'baseline'), false,
      'baseline incomplete or unclassifiable legacy root became preloaded');
  }
  assert.throws(() => parseAnswer('{"claims":{"result":"4"},"source":"AGENTS.md"}'), /source path array/);
  assert.equal(claimsMatch(fixtures.F7, {
    extraction_bar_required: false, correction_attribution_required: false, write_now: false,
  }), false, 'F7 no-gate claims passed');
  assert.equal(claimsMatch(fixtures.F9, {
    static_fallback_ids: ['SF-002', 'SF-003', 'SF-005', 'SC-20260523-001', 'SC-20260523-002', 'SC-20260523-003'],
    framework_editable: true, framework_template_required: true,
  }), false, 'F9 editable framework claim passed');
  assert.equal(claimsMatch(fixtures.F12, {
    native_invocation: harness === 'claude' ? '/ux-writing' : '$ux-writing',
    may_claim_other_harness_ran: true, verify_both_independently: true,
  }), false, 'F12 false cross-harness claim passed');

  const target = '.claude/skill-os/runtime/project-session.md';
  const targetText = readFileSync(join(root, target), 'utf8');
  const lines = readFileSync(join(root, target), 'utf8').trimEnd().split('\n').length;
  assert.equal(targetReadEvidence([{ type: 'item.started', command: `cat ${target}` }], target).complete, false,
    'started command counted as a successful read');
  assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 1, command: `cat ${target}` }], target).complete, false,
    'failed command counted as a successful read');
  assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 0, command: `sed -n '1,1p' ${target}` }], target).complete, false,
    'partial command counted as EOF');
  for (const command of [`cat ${target} >/dev/null`, `cat ${target} | wc -l`, `true # cat ${target}`]) {
    assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 0, command }], target).complete, false,
      `non-consumed command counted as EOF: ${command}`);
  }
  assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 0, command: `sed -n '1,${lines}p' ${target}`, output: targetText }], target).complete, true,
    'full successful sed range did not count as EOF');
  assert.equal(targetReadEvidence([{ type: 'tool_use', id: 'r1', name: 'Read', input: { file_path: join(root, target) } }], target).complete, false,
    'Claude Read without a tool result counted as successful');
  assert.equal(targetReadEvidence([
    { type: 'tool_use', id: 'r1', name: 'Read', input: { file_path: join(root, target) } },
    { type: 'tool_result', tool_use_id: 'r1', is_error: false, output: targetText },
  ], target).complete, true, 'successful full Claude Read did not count as EOF');
  const codexRead = (output, extra = {}) => codexProjection([{ type: 'item.completed', item: {
    type: 'command_execution', command: `cat ${target}`, exit_code: 0,
    aggregated_output: output, ...extra,
  } }]).trace;
  const claudeRead = (output, extra = {}) => claudeProjection([
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'content-r1', name: 'Read', input: { file_path: join(root, target) } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'content-r1', is_error: false, content: output, ...extra }] } },
  ]).trace;
  for (const projection of [codexRead, claudeRead]) {
    assert.equal(targetReadEvidence(projection(targetText), target).complete, true, 'full raw tool output was lost');
    for (const output of ['', targetText.slice(0, 100), `${targetText.slice(0, 100)}\n[output truncated]\n${targetText.split('\n').slice(-2).join('\n')}`]) {
      assert.equal(targetReadEvidence(projection(output), target).complete, false,
        'missing/prefix-only/truncated-with-EOF output counted as complete');
    }
    assert.equal(targetReadEvidence(projection(targetText, { truncated: true }), target).complete, false,
      'explicit tool truncation was ignored');
  }
  const numbered = targetText.trimEnd().split('\n').map((line, index) => `${index + 1}→${line}`).join('\n');
  assert.equal(targetReadEvidence(claudeRead(numbered), target).complete, true, 'numbered Claude Read content was not consumed');
  const splitLines = targetText.trimEnd().split('\n');
  const boundary = Math.floor(splitLines.length / 2);
  const twoReads = [
    { type: 'item.completed', exit_code: 0, command: `sed -n '1,${boundary}p' ${target}`, output: splitLines.slice(0, boundary).join('\n') },
    { type: 'item.completed', exit_code: 0, command: `sed -n '${boundary + 1},${splitLines.length}p' ${target}`, output: splitLines.slice(boundary).join('\n') },
  ];
  assert.equal(targetReadEvidence(twoReads, target).complete, true, 'complete observed chunked reads failed');
  assert.equal(targetReadEvidence(twoReads.slice(1), target).complete, false, 'tail-only read counted as full file');
  const jsonTarget = '.claude/skill-os/agent-context-manifest.json';
  const jsonText = readFileSync(join(root, jsonTarget), 'utf8');
  assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 0, command: `cat ${jsonTarget}`, output: jsonText }], jsonTarget).complete, true,
    'complete JSON without sentinel failed');
  assert.equal(targetReadEvidence([{ type: 'item.completed', exit_code: 0, command: `cat ${jsonTarget}`, output: jsonText.slice(0, 100) }], jsonTarget).complete, false,
    'truncated JSON without sentinel passed');
  assert.equal(targetReadEvidence([
    { type: 'tool_use', id: 'r2', name: 'Read', input: { file_path: `/private/tmp/fake/${target}` } },
    { type: 'tool_result', tool_use_id: 'r2', is_error: false },
  ], target).complete, false, 'same-suffix fake-root Read counted as the real target');
  assert.equal(targetReadEvidence([
    { type: 'item.completed', exit_code: 0, command: `cd /private/tmp/fake && cat ${target}` },
  ], target).complete, false, 'compound cd command was misattributed to repository root');
  for (const command of [
    `python3 -c 'open("${harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md'}").read()'`,
    `node -e 'require("fs").readFileSync("${harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md'}")'`,
    `git show HEAD:${harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md'}`,
  ]) {
    const policy = candidateTracePolicy(
      [{ type: 'item.completed', exit_code: 0, command }],
      harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md',
      [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'],
    );
    assert.equal(policy.pass, false, `unclassified cross-root command escaped default deny: ${command}`);
  }
  const f1Command = evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, [
    { type: 'item.started', command: 'python3 -c 4' },
    { type: 'item.completed', exit_code: 1, command: 'python3 -c 4' },
  ], { inventory: null });
  assert.equal(f1Command.pass, false, 'F1 allowed a command that later failed');
  const f9Claims = {
    static_fallback_ids: ['SF-002', 'SF-003', 'SF-005', 'SC-20260523-001', 'SC-20260523-002', 'SC-20260523-003'],
    framework_editable: false, framework_template_required: true,
  };
  const f9Response = [{ ...responseOnly[0], input: { claims: f9Claims, source: [ownSource] } }, responseOnly[1]];
  for (const selectedArm of ['baseline', 'candidate']) {
    const answer = { claims: f9Claims, source: [ownSource] };
    const isolation = { inventory: [ownSource] };
    assert.match(readInstructions(fixtures.F9, otherRoot, selectedArm), /rely only on the already loaded single root file/,
      `${selectedArm} lacks the shared root-only prompt`);
    assert.equal(evaluate(fixtures.F9, answer, f9Response, isolation, selectedArm).pass, true,
      `${selectedArm} rejected a root-only native response`);
    assert.equal(evaluate(fixtures.F9, answer, f9Response, { inventory: [ownSource, 'extra.md'] }, selectedArm).pass, false,
      `${selectedArm} accepted an extra file in root-only isolation`);
    for (const activity of [
      { type: 'item.started', command: `cat ${ownSource}` },
      { type: 'item.completed', exit_code: 0, command: `cat ${ownSource}` },
      { type: 'tool_use', id: 'unexpected-read', name: 'Read', input: { file_path: ownSource } },
    ]) {
      assert.equal(evaluate(fixtures.F9, answer, [...f9Response, activity], isolation, selectedArm).pass, false,
        `${selectedArm} accepted context tool activity in root-only isolation`);
      assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] },
        [...responseOnly, activity], { inventory: null }, selectedArm).pass, false,
      `${selectedArm} accepted context tool activity for a trivial question`);
    }
  }
  assert.equal(evaluate(fixtures.F9, { claims: f9Claims, source: [ownSource] }, f9Response,
    { inventory: [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'] }).pass, true,
    'root-only native structured response counted as repository I/O');
  assert.equal(candidateTracePolicy(f9Response, otherRoot, [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md']).pass, true,
    'normal trace policy rejected native structured response');
  assert.equal(candidateTracePolicy([{ type: 'tool_use', name: 'UnknownTool', input: {} }], otherRoot, []).pass, false,
    'unknown I/O tool inherited structured response exception');
  const f9Tool = evaluate(fixtures.F9, { claims: f9Claims, source: [ownSource] }, [
    { type: 'item.started', command: `cat ${harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'}` },
    { type: 'item.completed', exit_code: 0, command: `cat ${harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'}` },
  ], { inventory: [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'] });
  assert.equal(f9Tool.pass, false, 'F9 root-only isolation allowed command activity');
  const memoryPolicy = candidateTracePolicy([
    { type: 'item.completed', exit_code: 0, command: 'python3 memory/scripts/get_memory.py --summary' },
  ], harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md', [harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md']);
  assert.equal(memoryPolicy.pass, true, 'exact memory summary command failed policy');
  assert.equal(memoryPolicy.memory_summary_complete, true, 'memory summary completion was not recorded');
  const appendixPolicy = candidateTracePolicy([
    { type: 'item.completed', exit_code: 0, command: 'cat .claude/skill-os/claude-md-appendix.md' },
  ], harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md', [target]);
  assert.equal(appendixPolicy.pass, false, 'retired appendix escaped exact target allowlist');
  console.log('PASS A/B evaluator counterexamples, successful-read, and EOF self-test');
  process.exit(0);
}

const identity = contextIdentity();
const evaluatorSha256 = sha256(readFileSync(RUNNER));
const scoringSha256 = sha256(`${SCORING_REVISION}\0${evaluate.toString()}\0${targetReadEvidence.toString()}`);
const harnessConfig = harness === 'claude'
  ? { model: claudeModel || 'default', effort: claudeEffort || 'default' }
  : { model: 'default', effort: 'default' };
let harnessVersion = 'unknown';
try {
  harnessVersion = (await run(harness, ['--version'])).stdout.trim();
} catch { /* version is evidence metadata, invocation remains the decisive availability check */ }
let gitSha = 'NO_GIT';
try {
  gitSha = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
} catch { /* exported roots may have no Git metadata */ }
const selected = fixtureArg === 'all' ? Object.keys(fixtures) : [fixtureArg];
let tasks = selected.flatMap((id) => Array.from({ length: trials }, (_, index) => ({ id, trial: index + 1 })));
if (resumeValid && existsSync(output)) {
  const valid = new Set(readFileSync(output, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try {
      const row = JSON.parse(line);
      const sameConfig = JSON.stringify(row.harness_config || {}) === JSON.stringify(harnessConfig);
      const fixtureSha256 = fixtures[row.fixture] ? fixtureDigest(fixtures[row.fixture]) : '';
      return row.protocol_version === PROTOCOL_VERSION && row.batch_id === batchId
        && row.arm === arm && row.harness === harness && row.context_sha256 === identity.context_sha256
        && row.memory_root === root
        && row.harness_version === harnessVersion
        && row.evaluator_sha256 === evaluatorSha256 && row.fixture_sha256 === fixtureSha256
        && row.schema_sha256 === schemaDigest(fixtures[row.fixture]) && row.scoring_sha256 === scoringSha256
        && sameConfig && row.passed === 1
        ? [`${row.fixture}:${row.trial}`] : [];
    } catch { return []; }
  }));
  tasks = tasks.filter((task) => !valid.has(`${task.id}:${task.trial}`));
  console.log(`RESUME arm=${arm} harness=${harness} skipped_valid=${selected.length * trials - tasks.length}`);
}
async function executeTask(task) {
    const fixture = fixtures[task.id];
    const startedAt = new Date().toISOString();
    try {
      const invoked = await invoke(fixture);
      let decision;
      try { decision = scoreDecision(fixture, invoked); }
      finally { invoked.isolation.cleanup(); }
      const { check } = decision;
      appendFileSync(output, `${JSON.stringify({
        schema_version: 3, protocol_version: PROTOCOL_VERSION, batch_id: batchId,
        run_id: randomUUID(), arm, harness, harness_version: harnessVersion,
        harness_config: harnessConfig, actual_model: invoked.trace.find((entry) => entry.type === 'init')?.model || null,
        fixture: task.id, fixture_sha256: fixtureDigest(fixture), schema_sha256: schemaDigest(fixture),
        scoring_sha256: scoringSha256, evaluator_sha256: evaluatorSha256,
        trial: task.trial, git_sha: gitSha, memory_root: root, memory_root_source: 'evaluator-env',
        ...identity, started_at: startedAt,
        prompt_mode: fixture.isolatedRoot ? 'single-fixture-root-only' : 'single-fixture-repository',
        passed: check.pass ? 1 : 0, total: 1, ...decision, trace: invoked.trace,
        isolated_inventory: invoked.isolation.inventory,
      })}\n`);
      console.log(`RESULT arm=${arm} harness=${harness} fixture=${task.id} trial=${task.trial} passed=${check.pass ? 1 : 0}/1`);
      return { pass: check.pass };
    } catch (error) {
      appendFileSync(output, `${JSON.stringify({
        schema_version: 3, protocol_version: PROTOCOL_VERSION, batch_id: batchId,
        run_id: randomUUID(), arm, harness, harness_version: harnessVersion,
        harness_config: harnessConfig, actual_model: null,
        fixture: task.id, fixture_sha256: fixtureDigest(fixture), schema_sha256: schemaDigest(fixture),
        scoring_sha256: scoringSha256, evaluator_sha256: evaluatorSha256,
        trial: task.trial, git_sha: gitSha, memory_root: root, memory_root_source: 'evaluator-env',
        ...identity, started_at: startedAt,
        passed: 0, total: 1, error: error.message,
      })}\n`);
      console.log(`RESULT arm=${arm} harness=${harness} fixture=${task.id} trial=${task.trial} ERROR=${error.message.split('\n')[0]}`);
      return { pass: false, infrastructureError: true };
    }
}

mkdirSync(resolve(output, '..'), { recursive: true });
const queue = await runTaskQueue(tasks, concurrency, executeTask, stopsOnBehaviourFailure(arm));
console.log(`SUMMARY protocol=${PROTOCOL_VERSION} batch=${batchId} arm=${arm} harness=${harness} passed=${queue.completed - queue.failed}/${queue.completed} planned=${tasks.length} not_dispatched=${queue.not_dispatched} stopped=${queue.stopped} context=${identity.context_sha256} evaluator=${evaluatorSha256}`);
process.exit(queue.stopped || (requirePass && queue.failed) ? 1 : 0);
