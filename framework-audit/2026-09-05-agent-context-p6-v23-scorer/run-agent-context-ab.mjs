#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { BRANCH_FIXTURE_VERSION, createBranchFixtures } from './agent-context-branch-fixtures.mjs';
import { branchFixturePositiveClaims, runBranchFixtureContractTests } from './test-agent-context-branch-fixtures.mjs';

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
const trials = Number(value('--trials') || 1);
const concurrency = Number(value('--concurrency') || 1);
const output = resolve(value('--output') || '');
const requirePass = process.argv.includes('--require-pass');
const resumeValid = process.argv.includes('--resume-valid');
const selfTest = process.argv.includes('--self-test');
const describe = process.argv.includes('--describe');
const releaseManifestPath = value('--release-manifest');
let releaseManifest;
let releaseManifestSha256 = null;
if (releaseManifestPath) {
  try {
    const bytes = readFileSync(releaseManifestPath);
    releaseManifest = JSON.parse(bytes);
    releaseManifestSha256 = sha256(bytes);
  } catch (error) {
    console.error(`Release manifest unreadable: ${error.message}`);
    process.exit(2);
  }
}
const fallbackIds = value('--fallback-ids')?.split(',') ?? releaseManifest?.fallback_ids;
const claudeModel = value('--claude-model');
const claudeEffort = value('--claude-effort');
const batchId = value('--batch-id') || randomUUID();
const PROTOCOL_VERSION = 23;
const SCORING_REVISION = 'v23-required-no-pin-project-session-eof';
const ROUTING_CLASSES = ['Project Gate', 'Plan', 'Framework Flow', 'Multi-Skill', 'Single-Skill', 'STOP'];
const SCOPE_CONTRACT = 'This is NO_PIN framework/meta work. Read only files inside the supplied checkout (or the single supplied root for root-only probes). Do not access docs/, workflow-state, current-topic aliases, downstream projects, or any other checkout. Do not switch or create a project. These scope limits apply equally to baseline and candidate.';
if (!value('--root') || !existsSync(root) || !['baseline', 'candidate'].includes(arm)
    || !['claude', 'codex'].includes(harness) || !output
    || (!selfTest && !describe && !value('--output'))
    || !Number.isInteger(trials) || trials < 1
    || !Number.isInteger(concurrency) || concurrency < 1) {
  console.error('usage: run-agent-context-ab.mjs --root <abs> --arm baseline|candidate --harness claude|codex --fixture all|F1 --trials 1 --concurrency 1 --output <ndjson> [--self-test|--describe] [--release-manifest <json>]');
  process.exit(2);
}
if (resumeValid) {
  console.error('--resume-valid is forbidden: preserve every attempted cell and failure; use an explicit evidence selection.');
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

const legacyFixtureIds = Object.keys(fixtures);
Object.assign(fixtures, createBranchFixtures({ fallbackIds }));
if (fixtureArg !== 'all' && !fixtures[fixtureArg]) {
  console.error(`unknown fixture ${fixtureArg}; expected one of ${Object.keys(fixtures).join(', ')}`);
  process.exit(2);
}
// `all` retains the historical fixture set; new fixtures never become live by removing a draft suffix.
const selected = fixtureArg === 'all' ? legacyFixtureIds : [fixtureArg];
const needsRelease = (ids) => ids.some((id) => !legacyFixtureIds.includes(id));
if (!selfTest && !describe && needsRelease(selected) && !releaseManifestPath) {
  console.error('Branch fixtures are RELEASE_REQUIRED: supply a reviewed frozen --release-manifest before live execution.');
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

function scoringIdentity() {
  return {
    evaluator_sha256: sha256(readFileSync(RUNNER)),
    scoring_sha256: sha256(`${SCORING_REVISION}\0${readFileSync(RUNNER)}\0${readFileSync(new URL('./agent-context-branch-fixtures.mjs', import.meta.url))}\0${readFileSync(new URL('./test-agent-context-branch-fixtures.mjs', import.meta.url))}`),
  };
}

function validateReleaseManifest(manifest, context, scorer, selectedArm, ids, suppliedFallbackIds, governedIds) {
  assert.equal(manifest?.schema_version, 1, 'release schema_version mismatch');
  assert.equal(manifest.branch_fixture_version, BRANCH_FIXTURE_VERSION, 'release branch_fixture_version mismatch');
  for (const key of ['candidate', 'baseline']) {
    assert.match(manifest.contexts?.[key] || '', /^[a-f0-9]{64}$/, `release contexts.${key} must be a frozen SHA-256`);
  }
  assert.equal(manifest.contexts[selectedArm], context.context_sha256, 'release context hash mismatch');
  assert.equal(manifest.scoring_revision, SCORING_REVISION, 'release scoring_revision mismatch');
  assert.equal(manifest.scoring_sha256, scorer.scoring_sha256, 'release scoring hash mismatch');
  assert.ok(Array.isArray(manifest.fallback_ids), 'release fallback_ids must be an array');
  createBranchFixtures({ fallbackIds: manifest.fallback_ids });
  assert.deepEqual([...(suppliedFallbackIds || [])].sort(), [...manifest.fallback_ids].sort(), 'release fallback binding mismatch');
  if (selectedArm === 'candidate') {
    assert.deepEqual([...manifest.fallback_ids].sort(), [...governedIds].sort(), 'release governed fallback mismatch');
  } else assert.ok(!ids.includes('F9-v2'), 'F9-v2 baseline is not authorized by this release contract');
}

function releaseStability(expected, observed) {
  return {
    context_stable: observed.context === expected.context,
    scoring_stable: observed.scoring === expected.scoring,
    release_manifest_stable: observed.manifest === expected.manifest,
  };
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const processGroup = process.platform !== 'win32';
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: processGroup,
    });
    child.stdin.end();
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    let timedOut = false;
    let forceKill;
    let closeDeadline;
    let settled = false;
    const killErrors = [];
    const terminate = (signal) => {
      try {
        if (processGroup && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) {
        if (error.code !== 'ESRCH') killErrors.push(`${signal}: ${error.message}`);
      }
    };
    const finish = (code, signal, cause, forcedClose = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(forceKill);
      clearTimeout(closeDeadline);
      // The leader can exit before a descendant; do not cancel its final group kill.
      if (timedOut) terminate('SIGKILL');
      if (cause || code !== 0 || timedOut) {
        const error = cause || new Error(`${command} ${timedOut ? 'timed out' : `exit=${code}`}: ${(stderr || stdout).slice(-2000)}`);
        error.execution = { stdout, stderr, exit_code: code, signal, timed_out: timedOut,
          streams_forced_closed: forcedClose, kill_errors: killErrors };
        reject(error);
      } else resolveRun({ stdout, stderr });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate('SIGTERM');
      forceKill = setTimeout(() => {
        terminate('SIGKILL');
        closeDeadline = setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
          child.unref();
          finish(child.exitCode, child.signalCode, null, true);
        }, options.closeGraceMs || 250);
      }, options.killGraceMs || 2000);
    }, options.timeoutMs || 300_000);
    child.on('error', (error) => finish(null, null, error));
    child.on('close', (code, signal) => finish(code, signal));
  });
}

function parseEvents(raw) {
  return raw.split('\n').filter(Boolean).map((line) => {
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object' && !Array.isArray(event)) return event;
    } catch { /* Preserve malformed transport lines as unclassified activity, never as a clean empty trace. */ }
    return { type: 'unparsed', text: line.slice(0, 1000) };
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
    if (event.type === 'unparsed') trace.push({ type: 'unclassified_activity', event });
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
    if (event.type?.startsWith('item.') && (!['command_execution', 'agent_message', 'reasoning', 'todo_list'].includes(item.type)
        || (item.type === 'command_execution' && !['item.started', 'item.completed'].includes(event.type)))) {
      trace.push({ type: 'unclassified_activity', event_type: event.type, item });
    }
    if (!['thread.started', 'turn.started', 'turn.completed'].includes(event.type) && !event.type?.startsWith('item.')) {
      trace.push({ type: 'unclassified_activity', event });
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
      // Type is public; expected cardinality is scorer-only, including an empty answer.
      claimProperties[key] = { type: 'array', items: { type: 'string' } };
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
  for (const entry of trace.filter((entry) => entry.type === 'unclassified_activity')) {
    violations.push({ reason: 'unclassified runtime activity', entry });
  }
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

function regularContextTarget(candidate, contextRoot = root) {
  if (typeof candidate !== 'string' || !candidate || candidate.startsWith('/')
      || candidate.split('/').some((part) => !part || part === '.' || part === '..')) return false;
  const path = join(contextRoot, candidate);
  try {
    return lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink()
      && realpathSync(path) === join(realpathSync(contextRoot), candidate);
  } catch { return false; }
}

function admitContractEdges(targets, fixture, contextRoot = root) {
  for (const edge of fixture.contractEdges || []) {
    if (!Array.isArray(edge) || edge.length !== 2) continue;
    const [owner, target] = edge;
    if (!targets.has(owner) || !(fixture.targets || []).includes(target)
        || !regularContextTarget(owner, contextRoot) || !regularContextTarget(target, contextRoot)) continue;
    const links = [...readFileSync(join(contextRoot, owner), 'utf8').matchAll(/`([^`\r\n]+)`/g)]
      .map((match) => match[1]);
    if (links.includes(target)) targets.add(target);
  }
}

function reachableContextTargets(fixture = {}) {
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const targets = new Set([ownRoot, 'CONTEXT.md']);
  const addRegular = (candidate) => {
    if (regularContextTarget(candidate)) targets.add(candidate);
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
  // Only fixture-declared ordered edges may extend the startup graph; never traverse neighbours.
  admitContractEdges(targets, fixture);
  return [...targets].sort();
}

function sharedScopeAudit(trace) {
  const violations = [];
  const unknown = [];
  const checkPath = (path) => {
    if (typeof path !== 'string' || !path) { violations.push('missing read path'); return; }
    const absolute = resolve(root, path);
    const rel = relative(root, absolute);
    if (!rel || rel === '..' || rel.startsWith('../') || rel.split('/').includes('docs')
        || /(?:^|\/)(?:workflow-state\.yaml|current-topic\.txt)$/.test(rel)) {
      violations.push(`read outside shared scope: ${path}`);
      return;
    }
    try {
      if (lstatSync(absolute).isSymbolicLink() || realpathSync(absolute) !== join(realpathSync(root), rel)) {
        violations.push(`noncanonical or symlink read: ${path}`);
      }
    } catch {
      // A missing baseline capability is not an observed cross-scope read. Its command result stays in the trace.
    }
  };
  for (const attempt of shellAttempts(trace)) {
    if (attempt.kind === 'read') checkPath(attempt.path);
    else if (attempt.kind !== 'memory-summary') unknown.push(attempt.command || attempt.raw);
  }
  for (const entry of trace.filter(isContextTool)) {
    if (entry.name === 'Read') checkPath(entry.input?.file_path);
    else if (entry.name !== 'Bash') unknown.push(entry.name);
  }
  const completed = new Set(trace.filter((entry) => entry.type === 'item.completed').map((entry) => entry.command));
  for (const entry of trace) {
    if (entry.type === 'unclassified_activity') unknown.push(entry);
    if (entry.type === 'item.started' && entry.command && !completed.has(entry.command)) unknown.push(entry.command);
  }
  return { status: violations.length ? 'FAIL' : unknown.length ? 'UNKNOWN' : 'PASS', violations, unknown };
}

function modelIdentityPass(requested, actualTrace) {
  if (harness !== 'claude' || !requested?.startsWith('claude-')) return true;
  const observed = actualTrace.filter((entry) => entry.type === 'init').map((entry) => entry.model);
  return observed.length > 0 && observed.every((model) => model === requested);
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
  let result;
  let invocationError;
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
      result = await run('claude', args, { cwd: isolation.cwd, env: { ...fixture.env, MEMORY_ROOT: root } });
      return { ...claudeProjection(parseEvents(result.stdout)), isolation, raw_stdout: result.stdout, raw_stderr: result.stderr };
    }
    const args = ['exec', '--ephemeral', '--sandbox', 'read-only', '--json', '-C', isolation.cwd];
    args.push('--output-schema', schemaPath);
    args.push('--ignore-user-config');
    if (fixture.isolatedRoot) args.push('--skip-git-repo-check');
    args.push(prompt);
    result = await run('codex', args, { cwd: isolation.cwd, env: { ...fixture.env, MEMORY_ROOT: root } });
    return { ...codexProjection(parseEvents(result.stdout)), isolation, raw_stdout: result.stdout, raw_stderr: result.stderr };
  } catch (error) {
    invocationError = error;
    if (!error.execution && result) error.execution = { ...result, exit_code: 0, timed_out: false };
    try { isolation.cleanup(); } catch (cleanupError) { error.message += `; isolation cleanup: ${cleanupError.message}`; }
    throw error;
  } finally {
    try { rmSync(schemaPath, { force: true }); } catch (cleanupError) {
      if (invocationError) invocationError.message += `; schema cleanup: ${cleanupError.message}`;
      else {
        cleanupError.execution = result ? { ...result, exit_code: 0, timed_out: false } : null;
        try { isolation.cleanup(); } catch (error) { cleanupError.message += `; isolation cleanup: ${error.message}`; }
        throw cleanupError;
      }
    }
  }
}

function evaluate(fixture, answer, trace, isolation, selectedArm = arm) {
  const claimsPass = claimsMatch(fixture, answer.claims);
  const sourcePass = sourceMatches(fixture, answer.source, trace, selectedArm);
  let reachabilityPass = true;
  const targetChecks = [];
  const scopeAudit = sharedScopeAudit(trace);
  const responseResults = new Map(trace.filter((entry) => entry.type === 'tool_result')
    .map((entry) => [entry.tool_use_id, entry]));
  const nativeResponsePass = trace.filter((entry) => entry.type === 'tool_use' && entry.name === 'StructuredOutput')
    .every((entry) => responseResults.has(entry.id) && !responseResults.get(entry.id).is_error);
  const contextActivity = trace.filter((entry) => isContextTool(entry)
    || entry.type === 'unclassified_activity'
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
      // The shared wrapper explicitly makes these requests NO_PIN framework/meta work.
      : ['CONTEXT.md', '.claude/skill-os/generated/skill-catalog.md', '.claude/skill-os/agent-context-manifest.json',
        '.claude/skill-os/runtime/project-session.md'];
    const requiredTargets = [...new Set([...startupTargets, ...(fixture.targets || [])])];
    const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
    const tracePolicy = candidateTracePolicy(trace, forbiddenRoot, reachableContextTargets(fixture));
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
  return { pass: claimsPass && sourcePass && reachabilityPass && nativeResponsePass && scopeAudit.status === 'PASS',
    shared_scope_audit: scopeAudit, claims_pass: claimsPass,
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
      if (actual.trim() !== actual || /[\r\n]/.test(actual)) return false;
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
    if (!Array.isArray(actual) || !actual.every((item) => typeof item === 'string')) return false;
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
      check: { pass: false, claims_pass: false, source_pass: false, reachability_pass: false,
        shared_scope_audit: sharedScopeAudit(invoked.trace), target_checks: [] },
    };
  }
  return { answer, check: evaluate(fixture, answer, invoked.trace, invoked.isolation) };
}

const stopsOnBehaviourFailure = (selectedArm) => selectedArm === 'candidate';

function failureEvidence(error, invoked) {
  const execution = error.execution || null;
  const stdout = invoked?.raw_stdout ?? execution?.stdout ?? null;
  const stderr = invoked?.raw_stderr ?? execution?.stderr ?? null;
  let trace = invoked?.trace;
  if (!trace) {
    try {
      trace = stdout === null ? [{ type: 'unclassified_activity', reason: 'no invocation output available' }]
        : (harness === 'claude' ? claudeProjection : codexProjection)(parseEvents(stdout)).trace;
    } catch (projectionError) {
      // Error reporting must survive the same malformed event that broke normal projection.
      trace = [{ type: 'unclassified_activity', reason: 'failure-path projection error', error: projectionError.message }];
    }
  }
  return { execution, raw_stdout: stdout, raw_stderr: stderr, trace,
    actual_model: trace.find((entry) => entry.type === 'init')?.model || null,
    shared_scope_audit: sharedScopeAudit(trace) };
}

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
  assert.deepEqual(fixtureArg === 'all' ? selected : legacyFixtureIds, legacyFixtureIds,
    'all silently expanded into unreleased branch fixtures');
  assert.equal(needsRelease(legacyFixtureIds), false);
  assert.equal(needsRelease([...legacyFixtureIds, 'F13-page-handoff']), true,
    'an all-style list containing a branch fixture bypasses release admission');
  const releaseTestIds = ['SF-901', 'SC-20000101-901'];
  const releaseContext = { context_sha256: 'a'.repeat(64) };
  const releaseScorer = { scoring_sha256: 'b'.repeat(64) };
  const releaseSample = { schema_version: 1, branch_fixture_version: BRANCH_FIXTURE_VERSION,
    contexts: { candidate: releaseContext.context_sha256, baseline: 'c'.repeat(64) },
    scoring_revision: SCORING_REVISION, scoring_sha256: releaseScorer.scoring_sha256,
    fallback_ids: releaseTestIds };
  const validateSample = (manifest) => validateReleaseManifest(manifest, releaseContext,
    releaseScorer, 'candidate', ['F13-page-handoff'], releaseTestIds, releaseTestIds);
  validateSample(releaseSample);
  for (const [field, wrong, message] of [
    ['schema_version', 0, /schema_version/], ['branch_fixture_version', 'p6-page-flow-v2-draft', /branch_fixture_version/],
    ['contexts', { candidate: 'd'.repeat(64), baseline: 'c'.repeat(64) }, /context hash/],
    ['contexts', { candidate: 'a'.repeat(64) }, /contexts.baseline/],
    ['scoring_revision', 'old-revision', /scoring_revision/], ['scoring_sha256', 'd'.repeat(64), /scoring hash/],
    ['fallback_ids', undefined, /fallback_ids/], ['fallback_ids', ['SF-902'], /fallback binding/],
  ]) assert.throws(() => validateSample({ ...releaseSample, [field]: wrong }), message);
  assert.throws(() => validateReleaseManifest(releaseSample, releaseContext, releaseScorer,
    'candidate', ['F13-page-handoff'], releaseTestIds, ['SF-902']), /governed fallback/);
  const baselineContext = { context_sha256: releaseSample.contexts.baseline };
  validateReleaseManifest(releaseSample, baselineContext, releaseScorer,
    'baseline', ['F13-page-handoff'], releaseTestIds, []);
  assert.throws(() => validateReleaseManifest(releaseSample, baselineContext, releaseScorer,
    'baseline', ['F9-v2'], releaseTestIds, []), /F9-v2 baseline/);
  validateSample(releaseSample);
  const stableRelease = { context: 'context', scoring: 'scorer', manifest: 'manifest' };
  assert.ok(Object.values(releaseStability(stableRelease, stableRelease)).every(Boolean));
  for (const key of Object.keys(stableRelease)) {
    const checks = releaseStability(stableRelease, { ...stableRelease, [key]: 'DRIFT' });
    assert.equal(Object.values(checks).filter((passed) => !passed).length, 1, `${key} drift escaped`);
  }
  assert.ok(Object.values(releaseStability(stableRelease, stableRelease)).every(Boolean));
  await assert.rejects(run(process.execPath, [RUNNER, '--root', root, '--arm', arm, '--harness', harness,
    '--fixture', 'F13-page-handoff', '--output', join(tmpdir(), `unreleased-${process.pid}.ndjson`)]),
  (error) => error.execution?.exit_code === 2 && /RELEASE_REQUIRED/.test(error.execution.stderr),
  'branch CLI reached live execution without a frozen manifest');
  await assert.rejects(run(process.execPath, ['-e', 'process.stdout.write("raw-before-error"); process.stderr.write("stderr-evidence"); process.exit(3)']),
    (error) => error.execution?.stdout === 'raw-before-error' && error.execution.stderr === 'stderr-evidence'
      && error.execution.exit_code === 3, 'failed CLI lost its raw evidence');
  await assert.rejects(run(process.execPath, ['-e', 'process.on("SIGTERM",()=>{}); process.stdout.write("before-timeout"); setInterval(()=>{},1000)'],
    { timeoutMs: 500, killGraceMs: 50 }),
  (error) => error.execution?.timed_out === true && error.execution.signal === 'SIGKILL'
    && error.execution.stdout === 'before-timeout', 'timeout lost evidence or failed to kill the child');
  const descendantStart = Date.now();
  await assert.rejects(run(process.execPath, ['-e', `
    require('node:child_process').spawn(process.execPath, ['-e',
      'process.on("SIGTERM",()=>{}); process.stdout.write("descendant-ready"); setTimeout(()=>process.stdout.write("escaped-deadline"),1800); setTimeout(()=>process.exit(0),2500)'],
      {stdio:['ignore','inherit','inherit']});
    setInterval(()=>{},1000);
  `], { timeoutMs: 600, killGraceMs: 50, closeGraceMs: 100 }),
  (error) => error.execution?.timed_out === true && error.execution.stdout.includes('descendant-ready')
    && !error.execution.stdout.includes('escaped-deadline'), 'timeout left a descendant holding output pipes');
  assert.ok(Date.now() - descendantStart < 1600, 'descendant pipes defeated bounded completion');
  const captured = { raw_stdout: 'successful-raw', raw_stderr: 'successful-stderr',
    trace: [{ type: 'init', model: 'claude-opus-4-6' }],
    get final() { throw new Error('injected scoring exception'); } };
  let scoringError;
  try { scoreDecision(fixtures.F1, captured); } catch (error) { scoringError = error; }
  assert.ok(scoringError, 'scoring exception injection did not execute');
  const retained = failureEvidence(scoringError, captured);
  assert.equal(retained.raw_stdout, captured.raw_stdout);
  assert.equal(retained.raw_stderr, captured.raw_stderr);
  assert.deepEqual(retained.trace, captured.trace);
  assert.equal(retained.actual_model, 'claude-opus-4-6');
  for (const stdout of ['null\n', '[]\n', '42\n', '{"type":"assistant","message":{"content":{}}}\n']) {
    const badTransport = new Error('injected projection error');
    badTransport.execution = { stdout, stderr: 'retain-stderr', exit_code: 0 };
    const evidence = failureEvidence(badTransport);
    assert.equal(evidence.raw_stdout, stdout, 'malformed transport lost raw stdout');
    assert.equal(evidence.raw_stderr, 'retain-stderr');
    assert.equal(evidence.shared_scope_audit.status, 'UNKNOWN', 'malformed transport produced a clean scope trace');
  }
  assert.equal(scoreDecision(fixtures.F1, { final: '{"claims":{"result":"4"},"source":[]}',
    trace: [], isolation: {} }).check.pass, true, 'restored scoring failed');
  console.log(JSON.stringify(runBranchFixtureContractTests({ claimsMatch, answerSchema: answerSchemaFor })));
  const projectOwner = '.claude/skill-os/runtime/project-session.md';
  const projectText = readFileSync(join(root, projectOwner), 'utf8');
  const ownProjectRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  for (const traceKind of ['claude', 'codex']) {
    const readTrace = (path, partial = false) => {
      const text = readFileSync(join(root, path), 'utf8');
      const content = partial ? text.split('\n')[0] : text;
      if (traceKind === 'codex') return codexProjection([{ type: 'item.completed', item: {
        type: 'command_execution', command: partial ? `head -n 1 ${path}` : `cat ${path}`,
        exit_code: 0, aggregated_output: content,
      } }]).trace;
      return claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: path, name: 'Read',
          input: { file_path: join(root, path), ...(partial ? { limit: 1 } : {}) } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: path, content }] } },
      ]).trace;
    };
    const summary = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
        command: 'python3 memory/scripts/get_memory.py --summary', exit_code: 0,
        aggregated_output: 'synthetic memory summary; no command executed' } }]).trace
      : claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'summary', name: 'Bash',
          input: { command: 'python3 memory/scripts/get_memory.py --summary' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'summary', content: 'synthetic memory summary; no command executed' }] } },
      ]).trace;
    for (const id of ['F13-page-handoff', 'F14-flow-preservation', 'F10-v2', 'F4-stop', 'F2']) {
      const fixture = fixtures[id];
      const claims = branchFixturePositiveClaims(id)
        || Object.fromEntries(Object.entries(fixture.claims).map(([key, spec]) => [key, spec.equals]));
      const otherTargets = [...new Set(['CONTEXT.md', '.claude/skill-os/generated/skill-catalog.md',
        '.claude/skill-os/agent-context-manifest.json', ...(fixture.targets || [])])]
        .filter((target) => target !== projectOwner);
      const baseTrace = [...summary, ...otherTargets.flatMap((path) => readTrace(path))];
      const answer = { claims, source: [ownProjectRoot, ...otherTargets] };
      const full = evaluate(fixture, answer, [...baseTrace, ...readTrace(projectOwner)], {}, 'candidate');
      assert.equal(full.pass, true, `${traceKind}/${id}: full required project-session read failed`);
      for (const [mode, trace] of [['missing', baseTrace], ['partial', [...baseTrace, ...readTrace(projectOwner, true)]]]) {
        const check = evaluate(fixture, answer, trace, {}, 'candidate');
        assert.equal(check.claims_pass, true, `${traceKind}/${id}/${mode}: claim sample drift`);
        assert.equal(check.source_pass, true, `${traceKind}/${id}/${mode}: source failure hides required-read check`);
        assert.equal(check.pass, false, `${traceKind}/${id}/${mode}: incomplete project-session read passed`);
        const ownerCheck = check.target_checks.find((entry) => entry.target === projectOwner);
        assert.equal(ownerCheck?.complete, false);
        assert.equal(ownerCheck.evidence.length > 0, mode === 'partial');
      }
      assert.equal(full.target_checks.filter((check) => check.target === projectOwner).length, 1,
        `${traceKind}/${id}: project-session target was not deduplicated`);
      assert.equal(evaluate(fixture, answer, [...baseTrace, ...readTrace(projectOwner)], {}, 'candidate').pass, true,
        `${traceKind}/${id}: restored project-session read failed`);
      assert.equal(evaluate(fixture, answer, baseTrace, {}, 'baseline').pass, true,
        `${traceKind}/${id}: candidate-only required read leaked into baseline`);
    }
  }
  assert.ok(projectText.split('\n').length > 1, 'partial-read counterexample needs a multi-line owner');
  const scopedRead = [{ type: 'item.completed', exit_code: 0, command: 'cat CONTEXT.md' }];
  assert.equal(sharedScopeAudit(scopedRead).status, 'PASS');
  for (const command of ['cat /not-supplied-checkout/forbidden.txt', 'cat docs/secret.md', 'cat .claude/workflow-state.yaml']) {
    assert.equal(sharedScopeAudit([{ type: 'item.completed', exit_code: 0, command }]).status, 'FAIL', command);
  }
  assert.equal(sharedScopeAudit([{ type: 'tool_use', name: 'Read', input: { file_path: '/not-supplied-checkout/forbidden.txt' } }]).status, 'FAIL');
  assert.equal(sharedScopeAudit([{ type: 'item.completed', exit_code: 0, command: 'unknown-reader' }]).status, 'UNKNOWN');
  assert.equal(sharedScopeAudit(scopedRead).status, 'PASS', 'restored shared scope did not pass');
  for (const itemType of ['mcp_tool_call', 'web_search', 'file_change', 'future_unknown_tool']) {
    const projected = codexProjection([{ type: 'item.completed', item: { type: itemType, sentinel: 'retain-me' } }]);
    assert.equal(projected.trace.length, 1, `${itemType} discarded by projection`);
    assert.equal(projected.trace[0].item.sentinel, 'retain-me');
    assert.equal(sharedScopeAudit(projected.trace).status, 'UNKNOWN', `${itemType} silently passed scope`);
    for (const selectedArm of ['baseline', 'candidate']) {
      assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, projected.trace, {}, selectedArm).pass, false);
    }
    const badAnswer = scoreDecision(fixtures.F1, { final: 'bad JSON', trace: projected.trace, isolation: {} });
    assert.equal(badAnswer.check.shared_scope_audit.status, 'UNKNOWN', 'malformed answer bypassed trace audit');
  }
  const malformedOutside = scoreDecision(fixtures.F1, { final: 'bad JSON',
    trace: [{ type: 'item.completed', command: 'cat /not-supplied-checkout/forbidden.txt', exit_code: 0 }], isolation: {} });
  assert.equal(malformedOutside.check.shared_scope_audit.status, 'FAIL', 'malformed answer hid a scope violation');
  assert.equal(sharedScopeAudit(codexProjection([{ type: 'item.completed', item: { type: 'agent_message', text: '4' } }]).trace).status, 'PASS');
  if (harness === 'claude') {
    assert.equal(modelIdentityPass('claude-opus-4-6', [{ type: 'init', model: 'claude-opus-4-6' }]), true);
    assert.equal(modelIdentityPass('claude-opus-4-6', [{ type: 'init', model: 'claude-opus-5' }]), false);
    assert.equal(modelIdentityPass('claude-opus-4-6', []), false);
    assert.equal(modelIdentityPass('claude-opus-4-6', [{ type: 'init', model: 'claude-opus-4-6' }]), true);
  }
  const modelTestRoot = mkdtempSync(join(tmpdir(), 'agent-context-model-identity-'));
  try {
    // A local transport stub exercises executeTask, evidence rows, dispatch, and exit status without a paid CLI.
    writeFileSync(join(modelTestRoot, 'claude'), `#!${process.execPath}
if (process.argv.includes('--version')) console.log('synthetic-local-test');
else {
  console.log(JSON.stringify({type:'system',subtype:'init',model:process.env.AGENT_CONTEXT_TEST_MODEL}));
  if (process.env.AGENT_CONTEXT_TEST_SCOPE) {
    console.log(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',id:'scope1',
      name:process.env.AGENT_CONTEXT_TEST_SCOPE === 'FAIL' ? 'Read' : 'UnknownTool',
      input:{file_path:'/not-supplied-checkout/forbidden.txt'}}]}}));
    console.log(JSON.stringify({type:'user',message:{content:[{type:'tool_result',tool_use_id:'scope1',content:'synthetic trace only'}]}}));
  }
  console.log(JSON.stringify({type:'result',result:JSON.stringify({claims:{result:'4'},source:[]})}));
}
`, { mode: 0o755 });
    for (const selectedArm of ['baseline', 'candidate']) {
      for (const [phase, actualModel, expectedRows, scope = ''] of [
        ['pass', 'claude-opus-4-6', 3], ['mismatch', 'claude-opus-5', 1], ['restored', 'claude-opus-4-6', 3],
        ['scope-fail', 'claude-opus-4-6', 1, 'FAIL'], ['scope-unknown', 'claude-opus-4-6', 1, 'UNKNOWN'],
        ['scope-restored', 'claude-opus-4-6', 3],
      ]) {
        const resultPath = join(modelTestRoot, `${selectedArm}-${phase}.ndjson`);
        const args = [RUNNER, '--root', root, '--arm', selectedArm, '--harness', 'claude',
          '--fixture', 'F1', '--trials', '3', '--concurrency', '1', '--claude-model', 'claude-opus-4-6', '--output', resultPath];
        const invocation = run(process.execPath, args, { env: {
          PATH: `${modelTestRoot}:${process.env.PATH}`, AGENT_CONTEXT_TEST_MODEL: actualModel,
          AGENT_CONTEXT_TEST_SCOPE: scope,
        } });
        if (expectedRows === 1) {
          await assert.rejects(invocation, (error) => error.execution?.exit_code === 1
            && /not_dispatched=2 stopped=true/.test(error.execution.stdout),
          `${selectedArm}: ${phase} did not stop the real execution branch with exit 1`);
        } else await invocation;
        const rows = readFileSync(resultPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
        assert.equal(rows.length, expectedRows, `${selectedArm}/${phase}: incorrect dispatch count`);
        for (const row of rows) {
          assert.equal(row.actual_model, actualModel, 'actual model evidence was lost');
          assert.equal(row.check.model_identity_pass, phase !== 'mismatch');
          assert.equal(row.check.shared_scope_audit.status, scope || 'PASS');
          assert.equal(row.check.claims_pass, true, 'the transport stub failed outside model identity');
          assert.equal(row.passed, expectedRows === 1 ? 0 : 1);
        }
      }
    }
  } finally { rmSync(modelTestRoot, { recursive: true, force: true }); }
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
  for (const id of ['F13-page-handoff', 'F14-flow-preservation', 'F10-v2']) {
    const fixture = fixtures[id];
    const admitted = reachableContextTargets(fixture);
    for (const target of fixture.targets) assert.ok(admitted.includes(target), `${id}: required owner is unreachable: ${target}`);
    const removed = reachableContextTargets({ ...fixture, contractEdges: [] });
    assert.ok(!removed.includes('.claude/skill-os/runtime/page-context.md'), `${id}: missing edge still admits page owner`);
    assert.ok(!removed.includes('.claude/skill-os/page-library/catalog.json'), `${id}: missing edge still admits catalog`);
  }
  const edgeRoot = mkdtempSync(join(tmpdir(), 'agent-context-edges-'));
  try {
    writeFileSync(join(edgeRoot, 'owner.md'), '```js\nexample();\n```\n`page.md` `neighbour.md` `linked.md` `alias/child.md` `directory` `missing.md` `../escape.md` `/absolute.md`');
    writeFileSync(join(edgeRoot, 'page.md'), '`catalog.json` `neighbour.md`');
    writeFileSync(join(edgeRoot, 'catalog.json'), '{}');
    writeFileSync(join(edgeRoot, 'neighbour.md'), 'unrelated neighbour');
    writeFileSync(join(edgeRoot, 'unlinked.md'), 'not named by owner');
    mkdirSync(join(edgeRoot, 'directory'));
    writeFileSync(join(edgeRoot, 'directory/child.md'), 'through symlink parent');
    symlinkSync('page.md', join(edgeRoot, 'linked.md'));
    symlinkSync('directory', join(edgeRoot, 'alias'));
    const edgeFixture = { targets: ['owner.md', 'page.md', 'catalog.json', 'neighbour.md'],
      contractEdges: [['owner.md', 'page.md'], ['page.md', 'catalog.json']] };
    const admit = (fixture) => {
      const targets = new Set(['owner.md']);
      admitContractEdges(targets, fixture, edgeRoot);
      return [...targets].sort();
    };
    assert.deepEqual(admit(edgeFixture), ['catalog.json', 'owner.md', 'page.md']);
    assert.deepEqual(admit({ ...edgeFixture, contractEdges: [] }), ['owner.md']);
    assert.deepEqual(admit({ ...edgeFixture, contractEdges: [...edgeFixture.contractEdges].reverse() }), ['owner.md', 'page.md'],
      'an unadmitted source was traversed recursively');
    assert.deepEqual(admit({ ...edgeFixture, targets: ['owner.md', 'catalog.json'] }), ['owner.md'],
      'unselected intermediate owner was admitted');
    for (const target of ['unlinked.md', 'linked.md', 'alias/child.md', '../escape.md', '/absolute.md', 'directory', 'missing.md']) {
      assert.deepEqual(admit({ targets: ['owner.md', target], contractEdges: [['owner.md', target]] }), ['owner.md'],
        `bad, symlink, or unlinked target admitted: ${target}`);
    }
    assert.deepEqual(admit({ ...edgeFixture, contractEdges: [['page.md', 'catalog.json']] }), ['owner.md'],
      'unadmitted source granted a linked selected target');
    assert.deepEqual(admit(edgeFixture), ['catalog.json', 'owner.md', 'page.md'], 'restored declared edges failed');
  } finally { rmSync(edgeRoot, { recursive: true, force: true }); }
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
    ['CONTEXT.md', '.claude/skill-os/generated/skill-catalog.md', '.claude/skill-os/agent-context-manifest.json',
      '.claude/skill-os/runtime/project-session.md']);
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
const scorer = scoringIdentity();
const evaluatorSha256 = scorer.evaluator_sha256;
const scoringSha256 = scorer.scoring_sha256;
if (releaseManifestPath) {
  try {
    const governedIds = arm === 'candidate'
      ? readFileSync(join(root, 'memory/semantic/static-fallback-allowlist.txt'), 'utf8')
        .split('\n').map((line) => line.split('#')[0].trim()).filter(Boolean) : [];
    validateReleaseManifest(releaseManifest, identity, scorer, arm, selected, fallbackIds, governedIds);
  } catch (error) {
    console.error(`Release binding rejected: ${error.message}`);
    process.exit(2);
  }
}
if (describe) {
  console.log(JSON.stringify({ status: releaseManifestPath ? 'RELEASE_BOUND' : 'RELEASE_REQUIRED', protocol_version: PROTOCOL_VERSION,
    scoring_revision: SCORING_REVISION, scoring_sha256: scoringSha256, evaluator_sha256: evaluatorSha256,
    release_manifest_sha256: releaseManifestSha256,
    ...identity, branch_fixture_version: BRANCH_FIXTURE_VERSION,
    unbound_fixtures: fixtures['F9-v2'] ? [] : ['F9-v2'],
    fixtures: Object.fromEntries(Object.entries(fixtures).map(([id, fixture]) => [id, {
      fixture_sha256: fixtureDigest(fixture), schema_sha256: schemaDigest(fixture),
      claims: Object.keys(fixture.claims).length, targets: fixture.targets || [], contract_edges: fixture.contractEdges || [],
      isolated_root: Boolean(fixture.isolatedRoot),
      live_ready: legacyFixtureIds.includes(id) || Boolean(releaseManifestPath && !(arm === 'baseline' && id === 'F9-v2')),
    }])) }, null, 2));
  process.exit(0);
}
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
const tasks = selected.flatMap((id) => Array.from({ length: trials }, (_, index) => ({ id, trial: index + 1 })));
const frozen = { context: identity.context_sha256, scoring: scoringSha256, manifest: releaseManifestSha256 };
function currentStability(afterIdentity) {
  let context = afterIdentity?.context_sha256 || 'UNREADABLE';
  let scoring = 'UNREADABLE';
  let manifest = null;
  try { if (!afterIdentity) context = contextIdentity().context_sha256; }
  catch { /* A removed or unreadable frozen input is drift, not an error-reporting exception. */ }
  try { scoring = scoringIdentity().scoring_sha256; }
  catch { /* Preserve invocation evidence even if a scorer dependency disappears. */ }
  try { if (releaseManifestPath) manifest = sha256(readFileSync(releaseManifestPath)); }
  catch { manifest = 'UNREADABLE'; }
  return releaseStability(frozen, { context, scoring, manifest });
}
async function executeTask(task) {
    const fixture = fixtures[task.id];
    const startedAt = new Date().toISOString();
    let invoked;
    try {
      assert.ok(Object.values(currentStability()).every(Boolean), 'frozen context, scorer, or release manifest drifted before invocation');
      invoked = await invoke(fixture);
      let decision;
      try { decision = scoreDecision(fixture, invoked); }
      finally { invoked.isolation.cleanup(); }
      const { check } = decision;
      check.model_identity_pass = modelIdentityPass(claudeModel, invoked.trace);
      const afterIdentity = contextIdentity();
      Object.assign(check, currentStability(afterIdentity));
      check.pass = check.pass && check.model_identity_pass && check.context_stable
        && check.scoring_stable && check.release_manifest_stable;
      appendFileSync(output, `${JSON.stringify({
        schema_version: 3, protocol_version: PROTOCOL_VERSION, batch_id: batchId,
        run_id: randomUUID(), arm, harness, harness_version: harnessVersion,
        harness_config: harnessConfig, actual_model: invoked.trace.find((entry) => entry.type === 'init')?.model || null,
        fixture: task.id, fixture_sha256: fixtureDigest(fixture), schema_sha256: schemaDigest(fixture),
        scoring_sha256: scoringSha256, evaluator_sha256: evaluatorSha256,
        scoring_revision: SCORING_REVISION, release_manifest_sha256: releaseManifestSha256,
        trial: task.trial, git_sha: gitSha, memory_root: root, memory_root_source: 'evaluator-env',
        ...identity, started_at: startedAt,
        prompt_mode: fixture.isolatedRoot ? 'single-fixture-root-only' : 'single-fixture-repository',
        passed: check.pass ? 1 : 0, total: 1, ...decision, trace: invoked.trace,
        raw_stdout: invoked.raw_stdout, raw_stderr: invoked.raw_stderr,
        context_after_sha256: afterIdentity.context_sha256,
        isolated_inventory: invoked.isolation.inventory,
      })}\n`);
      console.log(`RESULT arm=${arm} harness=${harness} fixture=${task.id} trial=${task.trial} passed=${check.pass ? 1 : 0}/1`);
      return { pass: check.pass,
        infrastructureError: !check.model_identity_pass || check.shared_scope_audit.status !== 'PASS' || !check.context_stable
          || !check.scoring_stable || !check.release_manifest_stable };
    } catch (error) {
      const stability = currentStability();
      appendFileSync(output, `${JSON.stringify({
        schema_version: 3, protocol_version: PROTOCOL_VERSION, batch_id: batchId,
        run_id: randomUUID(), arm, harness, harness_version: harnessVersion,
        harness_config: harnessConfig,
        fixture: task.id, fixture_sha256: fixtureDigest(fixture), schema_sha256: schemaDigest(fixture),
        scoring_sha256: scoringSha256, evaluator_sha256: evaluatorSha256,
        scoring_revision: SCORING_REVISION, release_manifest_sha256: releaseManifestSha256,
        trial: task.trial, git_sha: gitSha, memory_root: root, memory_root_source: 'evaluator-env',
        ...identity, started_at: startedAt,
        passed: 0, total: 1, error: error.message, ...stability, ...failureEvidence(error, invoked),
      })}\n`);
      console.log(`RESULT arm=${arm} harness=${harness} fixture=${task.id} trial=${task.trial} ERROR=${error.message.split('\n')[0]}`);
      return { pass: false, infrastructureError: true };
    }
}

mkdirSync(resolve(output, '..'), { recursive: true });
const queue = await runTaskQueue(tasks, concurrency, executeTask, stopsOnBehaviourFailure(arm));
console.log(`SUMMARY protocol=${PROTOCOL_VERSION} batch=${batchId} arm=${arm} harness=${harness} passed=${queue.completed - queue.failed}/${queue.completed} planned=${tasks.length} not_dispatched=${queue.not_dispatched} stopped=${queue.stopped} context=${identity.context_sha256} evaluator=${evaluatorSha256}`);
process.exit(queue.stopped || (requirePass && queue.failed) ? 1 : 0);
