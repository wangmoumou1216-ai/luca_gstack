#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync, chmodSync, closeSync, cpSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync,
  linkSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as branchFixtureContracts from './agent-context-branch-fixtures.mjs';
import {
  branchFixturePositiveClaims,
  runBranchFixtureContractTests,
  runG5ContractTests,
} from './test-agent-context-branch-fixtures.mjs';

const {
  BRANCH_FIXTURE_VERSION,
  G5_SUITE_VERSION,
  G5_FIXTURE_IDS,
  G5_CALIBRATION_CELL_IDS,
  createBranchFixtures,
  createG5Fixtures,
  g5PublicFixture,
  g5ExpectedClaims,
  g5TurnSchema,
  createG5Matrix,
  validateG5Matrix,
  splitG5Matrix,
} = branchFixtureContracts;

const RUNNER = fileURLToPath(import.meta.url);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const CLI_VALUE_OPTIONS = new Set([
  '--root', '--arm', '--harness', '--fixture', '--trials', '--concurrency', '--output',
  '--rescore', '--source-sha256', '--source-release-manifest', '--release-manifest',
  '--g5-phase', '--g5-cell', '--g5-ledger', '--batch-id', '--fallback-ids',
  '--claude-model', '--claude-effort', '--codex-model', '--codex-effort',
]);
const CLI_BOOLEAN_OPTIONS = new Set([
  '--require-pass', '--resume-valid', '--self-test', '--describe', '--offline-fake-transport-self-test',
]);
const seenCliOptions = new Set();
for (let index = 2; index < process.argv.length; index++) {
  const option = process.argv[index];
  const equalsName = option.includes('=') ? option.slice(0, option.indexOf('=')) : null;
  if (equalsName && (CLI_VALUE_OPTIONS.has(equalsName) || CLI_BOOLEAN_OPTIONS.has(equalsName))) {
    console.error(`${equalsName} requires separate flag and value arguments`);
    process.exit(2);
  }
  if (!CLI_VALUE_OPTIONS.has(option) && !CLI_BOOLEAN_OPTIONS.has(option)) {
    console.error(`unknown or malformed option: ${option}`);
    process.exit(2);
  }
  if (seenCliOptions.has(option)) {
    console.error(CLI_VALUE_OPTIONS.has(option)
      ? `duplicate option: ${option}; ${option} may appear only once`
      : `duplicate option: ${option}`);
    process.exit(2);
  }
  seenCliOptions.add(option);
  if (CLI_VALUE_OPTIONS.has(option)) {
    const supplied = process.argv[index + 1];
    if (supplied === undefined || supplied.startsWith('--')) {
      console.error(`${option} requires a value and may appear only once`);
      process.exit(2);
    }
    index++;
  }
}

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
const g5OfflineFakeTransport = process.argv.includes('--offline-fake-transport-self-test');
const rescorePath = value('--rescore');
const sourceSha256 = value('--source-sha256');
const sourceManifestPath = value('--source-release-manifest');
const releaseManifestPath = value('--release-manifest');
const g5Phase = value('--g5-phase');
const g5Mode = g5Phase !== undefined;
const g5Describe = g5Phase === 'describe';
const g5CodexCalibration = g5Phase === 'codex-calibration';
const g5Finalize = g5Phase === 'finalize';
const g5CellId = value('--g5-cell');
const g5LedgerPath = value('--g5-ledger');
const batchIdArg = value('--batch-id');
if (g5Mode) {
  const allowed = new Set(['--root', '--arm', '--harness', '--fixture', '--trials', '--concurrency',
    '--output', '--g5-phase']);
  if (!g5Describe) for (const option of ['--g5-ledger', '--batch-id', '--release-manifest']) allowed.add(option);
  if (!g5Describe) allowed.add('--offline-fake-transport-self-test');
  if (!g5Describe && !g5Finalize) for (const option of [
    '--g5-cell', '--claude-model', '--claude-effort', '--codex-model', '--codex-effort',
  ]) allowed.add(option);
  const unexpected = [...seenCliOptions].filter((option) => !allowed.has(option));
  if (unexpected.length) {
    console.error(`options not valid for G5 ${g5Phase}: ${unexpected.join(', ')}`);
    process.exit(2);
  }
}
let releaseManifest;
let releaseManifestSha256 = null;
if (releaseManifestPath) {
  try {
    const releaseStat = lstatSync(releaseManifestPath);
    assert.ok(releaseStat.isFile() && !releaseStat.isSymbolicLink(),
      'release manifest must be a regular non-symlink file');
    assert.equal(realpathSync(releaseManifestPath), resolve(releaseManifestPath),
      'release manifest path must be canonical');
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
const codexModel = value('--codex-model');
const codexEffort = value('--codex-effort');
const batchId = batchIdArg || randomUUID();
const PROTOCOL_VERSION = 27;
const SCORING_REVISION = 'v32-load-before-boundaries';
const CONTEXT_INDEX = '.claude/skill-os/generated/context-index.md';
const CONTEXT_MANIFEST = '.claude/skill-os/agent-context-manifest.json';
const SKILL_CATALOG = '.claude/skill-os/generated/skill-catalog.md';
const PROJECT_SESSION = '.claude/skill-os/runtime/project-session.md';
const LUCA_APP_OWNER = '.claude/skill-os/runtime/luca-app.md';
const PLAN_AGENT = '.claude/agents/plan-agent.md';
const PLAN_DESIGN_GUIDANCE = '.claude/agents/references/plan-design-guidance.md';
const OFFICE_SKILL = '.claude/skills/office/SKILL.md';
const LEARNING_ACTIONS = '.claude/skills/office/references/learning-actions.md';
const WORKFLOW_MODE = '.claude/skill-os/runtime/workflow-mode.md';
const INPUT_MODE_SOURCE = '.claude/skill-os/input-modes.yaml';
const INPUT_MODE_VIEW_TEMPLATE = '.claude/skill-os/generated/input-modes/<key>.json';
const G5_PLAN_PATH = '/Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-09-21-context-lightening-execution-plan.md';
const G5_PLAN_SHA256 = '2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a';
const G5_READINESS_PATH = '/private/tmp/context-lightening-p1.kHzsIW/g5-preapproval-artifacts/g5-preapproval-readiness.md';
const G5_READINESS_SHA256 = '1858f349b669185710327234cc62be3c7c5e2f378fbe01d97a8ba6dbac54a13f';
const G5_CONTEXTS = Object.freeze({
  baseline: Object.freeze({ root: '/private/tmp/context-lightening-p1.kHzsIW/baseline',
    sha256: 'a3978160c8727cc65ac940bd484529e600a5169e3d0662fdc5871186dc367fec' }),
  candidate: Object.freeze({ root: '/private/tmp/context-lightening-p1.kHzsIW/candidate',
    sha256: '633c5b32d9eb3f4b9f345cd768f1c51dc981cc7e052d70747c6796e16a6a5f2f' }),
});
const G5_HARNESS_VERSIONS = Object.freeze({ claude: '2.1.278', codex: '0.156.0' });
const G5_STATE_PARENT = '/private/tmp/context-lightening-p1.kHzsIW/g5-live-state';
const G5_CODEX_CALIBRATION_PROFILE = 'CODEX_CALIBRATION_4_PARTIAL';
const G5_CODEX_CALIBRATION_DECISION = 'APPROVED_CODEX_CALIBRATION_4_PARTIAL';
const G5_PARTIAL_OUTCOME_CEILING = 'INCONCLUSIVE';
const HTML_PROTOTYPE_SKILL = '.claude/skills/office/html-prototype/SKILL.md';
const HTML_PROTOTYPE_INPUT_MODE = '.claude/skill-os/generated/input-modes/html-prototype.json';
const OPERATIONAL_FIELDS = [
  'id', 'obligation_ids', 'runtime', 'leading_words', 'condition', 'load_before',
  'target', 'contains', 'loader', 'read_to_end', 'fallback', 'truth_owner',
];
const MANIFEST_ENTRY_FIELDS = [...OPERATIONAL_FIELDS, 'fixtures'];
const MANIFEST_TOP_FIELDS = ['version', 'purpose', 'module_soft_cap_bytes', 'module_split_review_bytes', 'entries'];
const MANIFEST_TEXT_FIELDS = ['id', 'truth_owner', 'condition', 'load_before', 'target', 'contains', 'loader', 'fallback'];
const MANIFEST_LIST_FIELDS = ['obligation_ids', 'runtime', 'leading_words', 'fixtures'];
const MANIFEST_RUNTIME_IDS = new Set(['claude', 'codex']);
const MANIFEST_OBLIGATION_IDS = new Set(Array.from({ length: 10 }, (_, index) => `K${index + 1}`));
const ROUTING_CLASSES = ['Project Gate', 'Plan', 'Framework Flow', 'Multi-Skill', 'Single-Skill', 'STOP'];
const SCOPE_CONTRACT = 'This is NO_PIN framework/meta work. Read only files inside the supplied checkout (or the single supplied root for root-only probes). Do not access docs/, workflow-state, current-topic aliases, downstream projects, or any other checkout. Do not switch or create a project. These scope limits apply equally to baseline and candidate.';
if (!value('--root') || !existsSync(root) || !['baseline', 'candidate'].includes(arm)
    || !['claude', 'codex'].includes(harness) || !output
    || (!selfTest && !describe && !g5Describe && !value('--output'))
    || !Number.isInteger(trials) || trials < 1
    || !Number.isInteger(concurrency) || concurrency < 1) {
  console.error('usage: run-agent-context-ab.mjs --root <abs> --arm baseline|candidate --harness claude|codex --fixture all|F1 --trials 1 --concurrency 1 --output <ndjson> [--self-test|--describe] [--release-manifest <json>] [--g5-phase describe|calibration|remaining --g5-cell <id> --g5-ledger <json> --release-manifest <json> --claude-model/--claude-effort or --codex-model/--codex-effort] [--g5-phase finalize --g5-ledger <json> --release-manifest <json>] [--rescore <source.ndjson> --source-sha256 <sha> --source-release-manifest <json>]');
  process.exit(2);
}
if (g5Mode && (!['describe', 'calibration', 'codex-calibration', 'remaining', 'finalize'].includes(g5Phase)
    || selfTest || describe || rescorePath || fixtureArg !== 'all' || trials !== 1 || concurrency !== 1
    || (!g5Describe && (!g5LedgerPath || !releaseManifestPath || !batchIdArg))
    || (g5Finalize ? Boolean(g5CellId) : !g5Describe && !g5CellId))) {
  console.error('G5 requires --g5-phase describe|calibration|codex-calibration|remaining|finalize; cell phases require one --g5-cell, while finalize forbids it; all non-describe phases require --g5-ledger, --release-manifest, --batch-id, --fixture all, --trials 1, --concurrency 1, and no legacy mode');
  process.exit(2);
}
if (g5OfflineFakeTransport && (!g5Mode || g5Describe || process.env.G5_OFFLINE_FAKE_TRANSPORT !== '1')) {
  console.error('offline fake transport is restricted to an explicitly marked G5 self-test subprocess');
  process.exit(2);
}
if (!g5Mode && (g5CellId || g5LedgerPath || codexModel || codexEffort)) {
  console.error('G5 cell/ledger and Codex identity options require --g5-phase');
  process.exit(2);
}
if (resumeValid) {
  console.error('--resume-valid is forbidden: preserve every attempted cell and failure; use an explicit evidence selection.');
  process.exit(2);
}
if (rescorePath && (selfTest || describe || harness !== 'codex' || trials !== 1 || concurrency !== 1
    || !releaseManifestPath || !sourceManifestPath || !/^[a-f0-9]{64}$/.test(sourceSha256 || ''))) {
  console.error('rescore requires codex, one trial, both release manifests and an explicit --source-sha256; not self-test/describe');
  process.exit(2);
}
if (!rescorePath && (sourceSha256 || sourceManifestPath)) {
  console.error('source evidence options require --rescore');
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
    targets: [PROJECT_SESSION],
  },
  F3: {
    request: 'List all five Plan triggers, then state the separate approval rule for both Supervisor and Hierarchical execution. For a full design chain that proceeds from design-brief to implementation, state whether the design-output Phase is required, may be skipped, or may be merged with implementation.',
    claims: {
      files_at_least_3_is_trigger: { type: 'boolean', equals: true },
      independent_subagents_at_least_2_is_trigger: { type: 'boolean', equals: true },
      explicit_phase_dependency_is_trigger: { type: 'boolean', equals: true },
      irreversible_operation_is_trigger: { type: 'boolean', equals: true },
      explicit_user_plan_request_is_trigger: { type: 'boolean', equals: true },
      supervisor_requires_approval: { type: 'boolean', equals: true },
      hierarchical_requires_approval: { type: 'boolean', equals: true },
      failed_critical_gate_stops_next_phase: { type: 'boolean', equals: true },
      design_output_required_before_implementation: { type: 'boolean', equals: true },
      may_skip_design_output: { type: 'boolean', equals: false },
      may_merge_design_output_with_implementation: { type: 'boolean', equals: false },
    },
    candidateSourceTargets: [PLAN_DESIGN_GUIDANCE],
    targets: [PLAN_AGENT, PLAN_DESIGN_GUIDANCE],
    contractEdges: [[PLAN_AGENT, PLAN_DESIGN_GUIDANCE]],
  },
  'F4-direct': {
    request: 'I select $ux-writing for one small, independent copy review with no Plan trigger. For this turn only, classify its route; do not invoke or execute the skill or its preamble. Return only the routing class name in routing_class.',
    claims: { routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'Single-Skill' } },
    targets: [SKILL_CATALOG],
  },
  'F4-multi': {
    request: 'I have several independent high-confidence skill intents that can run separately. State the routing class before doing work.',
    claims: { routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'Multi-Skill' } },
    targets: [SKILL_CATALOG],
  },
  'F4-stop': {
    request: 'My request is ambiguous and has no confident skill match. State what STOP means and what discovery must happen before execution.',
    claims: {
      routing_class: { type: 'string', choices: ROUTING_CLASSES, equals: 'STOP' },
      execution_authorized: { type: 'boolean', equals: false },
      catalog_discovery_required: { type: 'boolean', equals: true },
    },
    targets: [SKILL_CATALOG],
  },
  F5: {
    request: 'Compare two existing skill outputs. I do not know the low-frequency skill name; identify it without executing it. Return the bare skill identifier in skill_name and its catalog-listed authority file in authority_path. That authority claim does not mean you opened the skill body; source lists only files actually read.',
    claims: {
      skill_name: { type: 'string', pattern: /^compare$/i, syntax: '^[a-z][a-z0-9-]*$' },
      authority_path: { type: 'string', pathEquals: '.claude/skills/office/compare/SKILL.md', syntax: '^\\S+SKILL\\.md$' },
    },
    candidateSourceTargets: [SKILL_CATALOG],
    targets: [SKILL_CATALOG],
  },
  F6: {
    request: 'Modify AGENTS.md so future agents behave predictably. Identify the skill that governs this work; do not edit yet.',
    claims: { skill_name: { type: 'string', pattern: /^writing-for-agents$/i, syntax: '^[a-z][a-z0-9-]*$' }, edit_now: { type: 'boolean', equals: false } },
    targets: [SKILL_CATALOG],
  },
  F7: {
    request: 'I am correcting future behavior and explicitly say “remember this”. The office skill has determined that this explicit correction must be recorded. Before running any write command, state the memory gates, whether the learning-action owner must be read first, whether direct promotion is allowed, and whether recording may happen before that owner read.',
    claims: {
      extraction_bar_required: { type: 'boolean', equals: true },
      correction_attribution_required: { type: 'boolean', equals: true },
      learning_actions_required: { type: 'boolean', equals: true },
      direct_promotion_allowed: { type: 'boolean', equals: false },
      may_record_before_owner_read: { type: 'boolean', equals: false },
      write_now: { type: 'boolean', equals: false },
    },
    candidateSourceTargets: [LEARNING_ACTIONS],
    sourceAll: [/extraction-bar\.md/i, /correction-attribution\.md/i],
    targets: ['.claude/skill-os/extraction-bar.md', '.claude/skill-os/correction-attribution.md',
      OFFICE_SKILL, LEARNING_ACTIONS],
    contractEdges: [[OFFICE_SKILL, LEARNING_ACTIONS]],
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
    request: 'I select $html-prototype for a future standalone local HTML prototype and supply a prototype_brief. After the required startup and contract reads, perform input preflight only; do not execute the skill. State whether framework/ may be edited, whether its template is required, whether standalone mode requires prototype_brief, whether the supplied brief satisfies that static required-input contract, and whether standalone selection activates the optional Workflow graph.',
    claims: {
      framework_editable: { type: 'boolean', equals: false },
      framework_template_required: { type: 'boolean', equals: false },
      standalone_requires_prototype_brief: { type: 'boolean', equals: true },
      supplied_brief_satisfies_static_contract: { type: 'boolean', equals: true },
      standalone_activates_graph: { type: 'boolean', equals: false },
    },
    selectedInputModeKey: 'html-prototype',
    candidateSourceTargets: [WORKFLOW_MODE],
    targets: [SKILL_CATALOG, OFFICE_SKILL, HTML_PROTOTYPE_SKILL, WORKFLOW_MODE, HTML_PROTOTYPE_INPUT_MODE],
    contractEdges: [[WORKFLOW_MODE, HTML_PROTOTYPE_INPUT_MODE]],
  },
  F11: {
    request: 'LUCA_APP=1. From the hot root/index contract, identify the focused context owner that must load before a later sidebar/page inspection. This turn does not inspect, open, navigate, or present app content, so do not load that cold owner yet.',
    claims: { focused_context_owner: { type: 'string', pathEquals: LUCA_APP_OWNER, syntax: '^\\S+\\.md$' } },
    candidateSourceTargets: [CONTEXT_INDEX],
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
const g5Fixtures = createG5Fixtures();
const g5Matrix = createG5Matrix();
const g5MatrixSummary = validateG5Matrix(g5Matrix);
const g5MatrixSplit = splitG5Matrix(g5Matrix);
const g5MatrixSha256 = sha256(JSON.stringify(g5Matrix));
const g5Cell = g5CellId ? g5Matrix.find((cell) => cell.cell_id === g5CellId) : null;
const G5_CODEX_CALIBRATION_CELL_IDS = Object.freeze([
  'g5-03-t2-codex-candidate-r1',
  'g5-04-t2-codex-baseline-r1',
  'g5-07-t3-codex-baseline-r1',
  'g5-08-t3-codex-candidate-r1',
]);
const g5CodexCalibrationCells = Object.freeze(G5_CODEX_CALIBRATION_CELL_IDS.map((cellId) => {
  const cell = g5Matrix.find((candidate) => candidate.cell_id === cellId);
  assert.ok(cell, `missing Codex calibration cell: ${cellId}`);
  return cell;
}));
const g5SelectedCells = g5CodexCalibration ? g5CodexCalibrationCells : g5Matrix;
const g5SelectedCellIndex = g5Cell ? g5SelectedCells.findIndex((cell) => cell.cell_id === g5Cell.cell_id) : -1;
const g5SelectionSha256 = sha256(JSON.stringify(g5CodexCalibrationCells));
const G5_CODEX_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
const G5_CLAUDE_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const exactIdentityValue = (candidate) => typeof candidate === 'string' && candidate.trim() === candidate
  && candidate.length > 0 && candidate !== 'default' && !/[\r\n\0]/.test(candidate);
const exactBatchIdValue = (candidate) => typeof candidate === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(candidate);
if (g5Mode && !g5Describe) {
  if (!exactBatchIdValue(batchIdArg)) {
    console.error('G5 batch id must be a bounded path-safe identifier');
    process.exit(2);
  }
  if (g5Finalize) {
    if (claudeModel || claudeEffort || codexModel || codexEffort) {
      console.error('G5 finalize is evidence-only and forbids model or effort options');
      process.exit(2);
    }
  } else {
  const requestedModel = harness === 'claude' ? claudeModel : codexModel;
  const requestedEffort = harness === 'claude' ? claudeEffort : codexEffort;
  const effortSet = harness === 'claude' ? G5_CLAUDE_EFFORTS : G5_CODEX_EFFORTS;
  const phaseMatches = g5CodexCalibration
    ? g5Cell?.phase === 'calibration' && g5SelectedCellIndex >= 0
    : g5Cell?.phase === g5Phase;
  if (!g5Cell || !phaseMatches || g5Cell.arm !== arm || g5Cell.harness !== harness
      || !exactIdentityValue(requestedModel) || !effortSet.has(requestedEffort)
      || (g5CodexCalibration && (harness !== 'codex'
        || (!g5OfflineFakeTransport && requestedModel !== 'gpt-5.6-sol')
        || (g5OfflineFakeTransport && requestedModel !== 'offline-fake-codex')
        || requestedEffort !== (g5OfflineFakeTransport ? 'high' : 'max')))
      || (harness === 'claude' && (codexModel || codexEffort))
      || (harness === 'codex' && (claudeModel || claudeEffort))) {
    console.error('G5 cell/phase/arm/harness mismatch or missing exact selected-harness model+effort pin');
    process.exit(2);
  }
  }
}
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

function contextFiles() {
  const sources = [
    'CLAUDE.md', 'AGENTS.md', 'CONTEXT.md', '.claude/agents/plan-agent.md', '.claude/agents/references',
    '.claude/skill-os', '.claude/skills/office', 'memory/scripts/get_memory.py',
    'memory/scripts/search_memory.py', 'memory/scripts/_memroot.py',
    'memory/semantic/promoted-facts.yaml', 'memory/semantic/static-fallback-allowlist.txt',
    'memory/episodic/index.jsonl', 'memory/evals/eval-log.jsonl',
  ];
  const excluded = arm === 'candidate'
    ? new Set([join(root, '.claude/skill-os/claude-md-appendix.md')])
    : new Set();
  return sources.flatMap((path) => walk(join(root, path), [], excluded)).sort();
}

function contextIdentity() {
  const files = contextFiles();
  const hash = createHash('sha256');
  for (const path of files) {
    const rel = relative(root, path);
    const stat = lstatSync(path);
    hash.update(`${rel}\0${stat.isSymbolicLink() ? `LINK:${readlinkSync(path)}` : readFileSync(path)}\0`);
  }
  return { context_sha256: hash.digest('hex'), context_file_count: files.length };
}

function scoringIdentity() {
  const fixturePath = fileURLToPath(new URL('./agent-context-branch-fixtures.mjs', import.meta.url));
  const fixtureTestPath = fileURLToPath(new URL('./test-agent-context-branch-fixtures.mjs', import.meta.url));
  return {
    evaluator_sha256: sha256(readFileSync(RUNNER)),
    file_sha256: {
      'scripts/run-agent-context-ab.mjs': sha256(readFileSync(RUNNER)),
      'scripts/agent-context-branch-fixtures.mjs': sha256(readFileSync(fixturePath)),
      'scripts/test-agent-context-branch-fixtures.mjs': sha256(readFileSync(fixtureTestPath)),
    },
    scoring_sha256: sha256(`${SCORING_REVISION}\0${readFileSync(RUNNER)}\0${readFileSync(fixturePath)}\0${readFileSync(fixtureTestPath)}`),
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

const APP_ACTION_SERVER = 'muse';
const APP_ACTION_NAME = 'open_in_view';
const CLAUDE_APP_ACTION_NAMES = new Set([`mcp__${APP_ACTION_SERVER}__${APP_ACTION_NAME}`]);

function isClaudeAppActionUse(entry) {
  return entry?.type === 'tool_use' && CLAUDE_APP_ACTION_NAMES.has(entry.name);
}

function isCodexAppActionItem(item) {
  return item?.type === 'mcp_tool_call' && item.server === APP_ACTION_SERVER && item.tool === APP_ACTION_NAME;
}

function isAppActionEntry(entry) {
  return isClaudeAppActionUse(entry) || entry?.type === 'app_action';
}

function exactObjectKeys(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => keys.includes(key)) && keys.every((key) => allowed.has(key));
}

const CLAUDE_ASSISTANT_EVENT_OPTIONAL = [
  'parent_tool_use_id', 'request_id', 'session_id', 'timestamp', 'uuid',
];
const CLAUDE_ASSISTANT_MESSAGE_OPTIONAL = [
  'context_management', 'diagnostics', 'id', 'model', 'role', 'stop_details',
  'stop_reason', 'stop_sequence', 'type', 'usage',
];
const CLAUDE_USER_EVENT_OPTIONAL = [
  'parent_tool_use_id', 'session_id', 'timestamp', 'tool_use_result', 'uuid',
];

function claudeProjection(events) {
  const trace = [];
  let final = '';
  for (const event of events) {
    if (event.type === 'unparsed') {
      trace.push({ type: 'unclassified_activity', event });
      continue;
    }
    if (event.type === 'system' && event.subtype === 'init') {
      trace.push({ type: 'init', cwd: event.cwd, model: event.model, permissionMode: event.permissionMode });
      continue;
    }
    if (event.type === 'assistant') {
      if (!Array.isArray(event.message?.content)) {
        trace.push({ type: 'unclassified_activity', event });
        continue;
      }
      const messageText = event.message.content.filter((block) => block.type === 'text'
        && typeof block.text === 'string').map((block) => block.text).join('');
      for (const block of event.message.content) {
        if (block.type === 'tool_use') trace.push({ type: 'tool_use', id: block.id, name: block.name,
          input: block.input, caller: block.caller,
          native_shape_valid: exactObjectKeys(event, ['message', 'type'], CLAUDE_ASSISTANT_EVENT_OPTIONAL)
            && exactObjectKeys(event.message, ['content'], CLAUDE_ASSISTANT_MESSAGE_OPTIONAL)
            && exactObjectKeys(block, ['caller', 'id', 'input', 'name', 'type']) });
        else if (block.type === 'text' && typeof block.text === 'string') {
          if (block.text.trim()) trace.push({ type: 'assistant_text', text: block.text, message_text: messageText });
        } else trace.push({ type: 'unclassified_activity', event_type: event.type, block });
      }
      continue;
    }
    if (event.type === 'user') {
      if (!Array.isArray(event.message?.content)) {
        trace.push({ type: 'unclassified_activity', event });
        continue;
      }
      for (const block of event.message.content) {
        if (block.type === 'tool_result') {
          trace.push({ type: 'tool_result', tool_use_id: block.tool_use_id, is_error: block.is_error,
            output: contentText(block.content), raw_content: block.content,
            has_content: Object.hasOwn(block, 'content'),
            native_shape_valid: exactObjectKeys(event, ['message', 'type'], CLAUDE_USER_EVENT_OPTIONAL)
              && exactObjectKeys(event.message, ['content'], ['role'])
              && exactObjectKeys(block, ['content', 'is_error', 'tool_use_id', 'type']),
            truncated: outputTruncated(block) });
        } else trace.push({ type: 'unclassified_activity', event_type: event.type, block });
      }
      continue;
    }
    if (event.type === 'result') {
      final = typeof event.result === 'string' ? event.result : JSON.stringify(event.structured_output || event.result || {});
      trace.push({ type: 'result', subtype: event.subtype, is_error: event.is_error, duration_ms: event.duration_ms });
      continue;
    }
    trace.push({ type: 'unclassified_activity', event });
  }
  return { trace, final };
}

const CODEX_SKILL_BUDGET_NOTICE = 'Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.';
function isCodexSkillBudgetNotice(event) {
  // Observed in Codex 0.153.4. Preserve the event; do not exempt other errors or activity.
  const item = event.item;
  return event.type === 'item.completed' && Object.keys(event).sort().join(',') === 'item,type'
    && item?.type === 'error' && Object.keys(item).sort().join(',') === 'id,message,type'
    && typeof item.id === 'string' && item.id.trim().length > 0
    && item.message === CODEX_SKILL_BUDGET_NOTICE;
}

function isCodexTransportNotice(event) {
  // Native transport status has a stable envelope but platform-dependent reason text.
  // This only nominates a notice: recovery in the SAME turn is required below.
  if (event.type === 'error' && Object.keys(event).sort().join(',') === 'message,type') {
    const match = typeof event.message === 'string'
      && event.message.match(/^Reconnecting\.\.\. ([1-9]\d{0,2})\/([1-9]\d{0,2}) \(([^\r\n]+)\)$/);
    return Boolean(match && match[0] === event.message && event.message.length <= 4096
      && Number(match[1]) <= Number(match[2]) && match[3].trim());
  }
  const item = event.item;
  const prefix = 'Falling back from WebSockets to HTTPS transport. ';
  return event.type === 'item.completed' && Object.keys(event).sort().join(',') === 'item,type'
    && item?.type === 'error' && Object.keys(item).sort().join(',') === 'id,message,type'
    && typeof item.id === 'string' && item.id.trim().length > 0
    && typeof item.message === 'string' && item.message.startsWith(prefix)
    && item.message.length <= 4096 && item.message.slice(prefix.length).trim().length > 0
    && item.message === item.message.trim() && !/[\r\n]/.test(item.message);
}

function recoveredCodexNotices(events) {
  const recovered = new Set();
  let pending = [], active = false, answerAfterNotice = false;
  for (const event of events) {
    if (event.type === 'thread.started' || event.type === 'turn.started' || event.type === 'turn.failed') {
      pending = []; answerAfterNotice = false; active = event.type === 'turn.started';
    } else if (active && isCodexTransportNotice(event)) {
      pending.push(event); answerAfterNotice = false;
    } else if (active && event.type === 'item.completed' && event.item?.type === 'agent_message'
        && typeof event.item.text === 'string' && event.item.text.trim()) {
      answerAfterNotice = true;
    } else if (event.type === 'turn.completed') {
      if (active && answerAfterNotice) for (const notice of pending) recovered.add(notice);
      pending = []; active = false; answerAfterNotice = false;
    }
  }
  return recovered;
}

// Codex resolves auth from CODEX_HOME but reads transport (`model_providers`) from
// that home's config.toml. A custom provider therefore cannot survive
// `--ignore-user-config`. Detect one so the caller can keep the isolation flag in
// the ordinary case and drop it only when the model is otherwise unreachable.
function codexCustomProvider(codexHomeEnv) {
  const home = String(codexHomeEnv || join(homedir(), '.codex'));
  let config;
  try { config = readFileSync(join(home, 'config.toml'), 'utf8'); } catch { return ''; }
  const selected = config.match(/^\s*model_provider\s*=\s*"([^"]+)"/m);
  if (!selected) return '';
  const name = selected[1];
  const declared = new RegExp(`^\\s*\\[model_providers\\.${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'm');
  return declared.test(config) ? name : '';
}

function codexProjection(events) {
  const trace = [];
  let final = '';
  const recoveredNotices = recoveredCodexNotices(events);
  for (const event of events) {
    if (isCodexSkillBudgetNotice(event) || recoveredNotices.has(event)) {
      trace.push({ type: 'runtime_notice', event });
      continue;
    }
    if (event.type === 'thread.started') trace.push({ type: event.type, thread_id: event.thread_id });
    const item = event.item || {};
    const appActionEvent = ['item.started', 'item.completed'].includes(event.type) && isCodexAppActionItem(item);
    if (appActionEvent) {
      trace.push({ type: 'app_action', phase: event.type === 'item.started' ? 'started' : 'completed',
        id: item.id, server: item.server, name: item.tool, input: item.arguments, status: item.status,
        has_result: Object.hasOwn(item, 'result'), result: item.result,
        has_error: Object.hasOwn(item, 'error'), error: item.error, truncated: outputTruncated(item),
        native_shape_valid: exactObjectKeys(event, ['item', 'type'])
          && exactObjectKeys(item, event.type === 'item.started'
            ? ['arguments', 'id', 'server', 'status', 'tool', 'type']
            : ['arguments', 'id', 'result', 'server', 'status', 'tool', 'type']) });
    }
    if ((event.type === 'item.started' || event.type === 'item.completed') && item.type === 'command_execution') {
      trace.push({ type: event.type, id: item.id, command: item.command, exit_code: item.exit_code, status: item.status,
        output: typeof item.aggregated_output === 'string' ? item.aggregated_output : '',
        truncated: outputTruncated(item) });
      if (typeof item.command !== 'string' || !item.command.trim()) {
        trace.push({ type: 'unclassified_activity', event_type: event.type, item });
      }
    }
    if (event.type?.startsWith('item.') && (!['command_execution', 'agent_message', 'reasoning', 'todo_list'].includes(item.type)
        && !appActionEvent
        || (item.type === 'command_execution' && !['item.started', 'item.completed'].includes(event.type)))) {
      trace.push({ type: 'unclassified_activity', event_type: event.type, item });
    }
    if (!['thread.started', 'turn.started', 'turn.completed'].includes(event.type) && !event.type?.startsWith('item.')) {
      trace.push({ type: 'unclassified_activity', event });
    }
    if (event.type?.startsWith('item.') && ['reasoning', 'todo_list'].includes(item.type)) {
      trace.push({ type: 'runtime_activity', event_type: event.type, item_type: item.type, id: item.id });
    }
    if (event.type?.startsWith('item.') && item.type === 'agent_message' && event.type !== 'item.completed') {
      trace.push({ type: 'runtime_activity', event_type: event.type, item_type: item.type, id: item.id });
    }
    if (event.type === 'item.completed' && item.type === 'agent_message') {
      final = item.text || '';
      trace.push({ type: 'agent_message', id: item.id, text: final });
    }
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

const g5FixtureDigest = (fixture) => fixtureDigest(fixture);
const g5SchemaDigest = (fixture) => sha256(JSON.stringify(Object.fromEntries(
  ['baseline', 'candidate'].map((armName) => [armName,
    fixture.turns.map((_, turnIndex) => g5TurnSchema(fixture, turnIndex, armName))]),
)));

function g5ToolConfig(runtime) {
  if (runtime === 'codex') return {
    transport: 'app-server-stdio', thread_start: 1, turn_start_per_fixture_turn: 1,
    approval_policy: 'never', provider_fallback: false, network: false, sandbox: 'read-only',
    effects: 'host-mediated-hermetic-production-hook-replay',
  };
  return {
    transport: 'claude-stream-json', first_turn: 'session-id', later_turns: 'resume',
    session_persistence: true, restricted: true, strict_mcp_config: true,
    system_prompt_snapshot: 'on', network: false, tools: 'Read,Bash',
    effects: 'host-mediated-hermetic-production-hook-replay',
  };
}

const g5ToolConfigDigest = (runtime) => sha256(JSON.stringify(g5ToolConfig(runtime)));

function g5DescribePayload() {
  return {
    status: 'DESCRIPTION_ONLY_NO_LIVE_CALLS',
    suite_version: G5_SUITE_VERSION,
    protocol_version: PROTOCOL_VERSION,
    scoring_revision: SCORING_REVISION,
    matrix_sha256: g5MatrixSha256,
    matrix: g5Matrix,
    matrix_summary: g5MatrixSummary,
    calibration_cell_ids: G5_CALIBRATION_CELL_IDS,
    split: { calibration: g5MatrixSplit.calibration.length, remaining: g5MatrixSplit.remaining.length },
    fixtures: Object.fromEntries(G5_FIXTURE_IDS.map((id) => [id, {
      fixture_sha256: g5FixtureDigest(g5Fixtures[id]),
      schema_sha256: g5SchemaDigest(g5Fixtures[id]),
      turns: g5Fixtures[id].turns.length,
    }])),
    harness_tool_configs: Object.fromEntries(['claude', 'codex'].map((runtime) => [runtime, {
      config: g5ToolConfig(runtime), tool_config_sha256: g5ToolConfigDigest(runtime),
    }])),
    live_requirements: {
      named_cell: true, ledger: true, release_manifest: true, exact_model: true,
      exact_effort: true, concurrency: 1, retries: 0,
    },
  };
}

function g5ReadBoundRegular(path, expectedPath, expectedSha, label) {
  assert.equal(resolve(path), expectedPath, `${label} path mismatch`);
  assert.ok(existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    `${label} must be a regular non-symlink file`);
  const bytes = readFileSync(path);
  assert.equal(sha256(bytes), expectedSha, `${label} byte hash mismatch`);
  return bytes;
}

function g5ApprovalConfiguration(contract) {
  return {
    test_only: contract.test_only === true,
    suite_version: contract.suite_version,
    protocol_version: contract.protocol_version,
    matrix_sha256: contract.matrix_sha256,
    execution_profile: contract.execution_profile || null,
    profile_version: contract.profile_version || null,
    completeness: contract.completeness || null,
    outcome_ceiling: contract.outcome_ceiling || null,
    selected_cell_ids: contract.selected_cell_ids || null,
    selection_sha256: contract.selection_sha256 || null,
    cell_count: contract.cell_count,
    calibration_count: contract.calibration_count,
    harnesses: contract.harnesses,
    resources: contract.resources,
    cost: contract.cost,
  };
}

function validateG5ReleaseManifest(manifest, context, scorer, version) {
  assert.equal(manifest?.schema_version, 1, 'G5 release schema_version mismatch');
  for (const armName of ['baseline', 'candidate']) {
    assert.deepEqual(manifest?.contexts?.[armName], G5_CONTEXTS[armName],
      `G5 release ${armName} context binding mismatch`);
  }
  assert.equal(realpathSync(root), G5_CONTEXTS[arm].root, 'G5 selected root path mismatch');
  assert.equal(context.context_sha256, G5_CONTEXTS[arm].sha256, 'G5 selected context bytes drifted');
  assert.equal(manifest?.scoring?.revision, SCORING_REVISION, 'G5 release scoring revision mismatch');
  assert.equal(manifest?.scoring?.sha256, scorer.scoring_sha256, 'G5 release scoring hash mismatch');
  assert.deepEqual(manifest?.scoring?.files, scorer.file_sha256, 'G5 release scorer file binding mismatch');
  const contract = manifest.g5;
  const isPartial = contract?.execution_profile === G5_CODEX_CALIBRATION_PROFILE;
  if (isPartial) {
    assert.equal(contract.profile_version, 1, 'G5 partial profile version mismatch');
    assert.equal(contract.completeness, 'PARTIAL', 'G5 partial profile completeness mismatch');
    assert.equal(contract.outcome_ceiling, G5_PARTIAL_OUTCOME_CEILING, 'G5 partial outcome ceiling mismatch');
    assert.deepEqual(contract.selected_cell_ids, [...G5_CODEX_CALIBRATION_CELL_IDS],
      'G5 partial selected cell set mismatch');
    assert.equal(contract.selection_sha256, g5SelectionSha256, 'G5 partial selection hash mismatch');
    assert.equal(contract.cell_count, 4, 'G5 partial cell cap mismatch');
    assert.equal(contract.calibration_count, 4, 'G5 partial calibration cap mismatch');
  } else {
    assert.equal(contract?.execution_profile ?? null, null, 'G5 full release cannot carry a partial profile');
    assert.equal(contract?.cell_count, 56, 'G5 release cell cap mismatch');
    assert.equal(contract?.calibration_count, 8, 'G5 release calibration cap mismatch');
  }
  if (g5OfflineFakeTransport) assert.equal(contract?.test_only, true,
    'G5 offline fake release must be explicitly test-only');
  else assert.notEqual(contract?.test_only, true, 'G5 live release cannot be test-only');
  assert.equal(contract?.suite_version, G5_SUITE_VERSION, 'G5 release suite mismatch');
  assert.equal(contract?.protocol_version, PROTOCOL_VERSION, 'G5 release protocol mismatch');
  assert.equal(contract?.matrix_sha256, g5MatrixSha256, 'G5 release matrix mismatch');
  assert.deepEqual(contract?.authority?.plan, { path: G5_PLAN_PATH, sha256: G5_PLAN_SHA256 },
    'G5 release plan authority mismatch');
  assert.deepEqual(contract?.authority?.readiness, { path: G5_READINESS_PATH, sha256: G5_READINESS_SHA256 },
    'G5 release readiness authority mismatch');
  g5ReadBoundRegular(contract.authority.plan.path, G5_PLAN_PATH, G5_PLAN_SHA256, 'G5 plan');
  g5ReadBoundRegular(contract.authority.readiness.path, G5_READINESS_PATH, G5_READINESS_SHA256, 'G5 readiness');
  for (const id of G5_FIXTURE_IDS) {
    assert.equal(contract?.fixtures?.[id]?.fixture_sha256, g5FixtureDigest(g5Fixtures[id]),
      `G5 release fixture hash mismatch: ${id}`);
    assert.equal(contract?.fixtures?.[id]?.schema_sha256, g5SchemaDigest(g5Fixtures[id]),
      `G5 release schema hash mismatch: ${id}`);
  }
  assert.deepEqual(Object.keys(contract?.fixtures || {}).sort(), [...G5_FIXTURE_IDS].sort(),
    'G5 release fixture set mismatch');
  const expectedHarnesses = isPartial ? ['codex'] : ['claude', 'codex'];
  assert.deepEqual(Object.keys(contract?.harnesses || {}).sort(), [...expectedHarnesses].sort(),
    isPartial ? 'G5 partial release must bind Codex only' : 'G5 release must bind both harnesses');
  for (const runtimeName of expectedHarnesses) {
    const bound = contract.harnesses[runtimeName];
    assert.ok(exactIdentityValue(bound?.model), `G5 ${runtimeName} model pin missing`);
    assert.ok((runtimeName === 'claude' ? G5_CLAUDE_EFFORTS : G5_CODEX_EFFORTS).has(bound?.effort),
      `G5 ${runtimeName} effort pin missing`);
    assert.equal(bound?.version, G5_HARNESS_VERSIONS[runtimeName],
      `G5 ${runtimeName} version pin mismatch`);
    assert.equal(bound?.tool_config_sha256, g5ToolConfigDigest(runtimeName),
      `G5 ${runtimeName} tool config mismatch`);
  }
  if (isPartial) assert.equal(harness, 'codex', 'G5 partial release cannot dispatch Claude');
  const runtime = contract.harnesses[harness];
  if (!g5Finalize) {
    const requestedModel = harness === 'claude' ? claudeModel : codexModel;
    const requestedEffort = harness === 'claude' ? claudeEffort : codexEffort;
    assert.equal(runtime?.model, requestedModel, 'G5 release model pin mismatch');
    assert.equal(runtime?.effort, requestedEffort, 'G5 release effort pin mismatch');
    assert.equal(version.match(/\d+\.\d+\.\d+/)?.[0], runtime.version, 'G5 installed harness version mismatch');
  }
  assert.equal(contract?.resources?.session_cap, isPartial ? 4 : 56, 'G5 release session cap mismatch');
  assert.equal(contract?.resources?.calibration_cap, isPartial ? 4 : 8, 'G5 release calibration cap mismatch');
  assert.equal(contract?.resources?.concurrency, 1, 'G5 release concurrency mismatch');
  assert.equal(contract?.resources?.retry_limit, 0, 'G5 release retry cap mismatch');
  assert.ok(Number.isInteger(contract?.resources?.timeout_ms) && contract.resources.timeout_ms > 0,
    'G5 release timeout_ms must be positive');
  assert.ok(['KNOWN', 'UNKNOWN'].includes(contract?.cost?.estimate_status), 'G5 cost estimate status missing');
  assert.ok(typeof contract.cost.basis === 'string' && contract.cost.basis.trim(), 'G5 cost basis missing');
  if (contract.cost.estimate_status === 'UNKNOWN') assert.equal(contract.cost.estimate_usd, null,
    'G5 UNKNOWN cost must not invent an estimate');
  else assert.ok(Number.isFinite(contract.cost.estimate_usd) && contract.cost.estimate_usd >= 0,
    'G5 KNOWN cost estimate invalid');
  const claudeBudget = contract.cost.safeguards?.claude_max_budget_usd;
  assert.ok(claudeBudget == null || (Number.isFinite(claudeBudget) && claudeBudget > 0),
    'G5 Claude budget safeguard invalid');
  assert.equal(contract.cost.safeguards?.codex_claimed_usd_cap ?? null, null,
    'G5 cannot claim an unenforced Codex USD cap');
  assert.equal(contract?.batch_id, batchId, 'G5 batch id mismatch');
  assert.equal(resolve(contract?.state_root || ''), join(G5_STATE_PARENT, batchId), 'G5 state root mismatch');
  assert.ok(existsSync(contract.state_root) && lstatSync(contract.state_root).isDirectory()
    && !lstatSync(contract.state_root).isSymbolicLink(), 'G5 state root must pre-exist as a non-symlink directory');
  assert.equal(realpathSync(contract.state_root), contract.state_root, 'G5 state root must be canonical');
  assert.equal(resolve(g5LedgerPath), join(contract.state_root, 'ledger.json'), 'G5 ledger path is not release-bound');
  const verdictName = contract.execution_profile === G5_CODEX_CALIBRATION_PROFILE
    ? 'partial-verdict.json' : 'final-verdict.json';
  assert.equal(resolve(output), g5Finalize ? join(contract.state_root, verdictName)
    : join(contract.state_root, 'evidence', `${g5Cell.cell_id}.json`),
  `G5 output path is not the fixed ${g5Finalize ? verdictName : 'cell evidence'} path`);
  const receiptPath = join(contract.state_root, 'authorization.json');
  assert.ok(existsSync(receiptPath) && lstatSync(receiptPath).isFile()
    && !lstatSync(receiptPath).isSymbolicLink(), 'G5 authorization receipt must be a regular non-symlink file');
  assert.equal(realpathSync(receiptPath), receiptPath, 'G5 authorization receipt path must be canonical');
  const receiptBytes = readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes);
  if (g5OfflineFakeTransport) assert.equal(receipt?.test_only, true,
    'G5 offline fake authorization must be explicitly test-only');
  else assert.notEqual(receipt?.test_only, true, 'G5 live authorization cannot be test-only');
  assert.equal(receipt?.schema_version, 1, 'G5 authorization receipt schema mismatch');
  assert.equal(receipt?.decision, isPartial ? G5_CODEX_CALIBRATION_DECISION : 'APPROVED_56',
    'G5 authorization decision mismatch');
  assert.equal(receipt?.release_manifest_sha256, releaseManifestSha256, 'G5 approval release mismatch');
  assert.equal(receipt?.batch_id, batchId, 'G5 approval batch mismatch');
  assert.equal(receipt?.state_root, contract.state_root, 'G5 approval state root mismatch');
  assert.equal(receipt?.matrix_sha256, g5MatrixSha256, 'G5 approval matrix mismatch');
  assert.equal(receipt?.session_cap, isPartial ? 4 : 56, 'G5 approval session cap mismatch');
  if (isPartial) {
    assert.equal(receipt?.execution_profile, G5_CODEX_CALIBRATION_PROFILE,
      'G5 partial approval profile mismatch');
    assert.deepEqual(receipt?.selected_cell_ids, [...G5_CODEX_CALIBRATION_CELL_IDS],
      'G5 partial approval cell set mismatch');
    assert.equal(receipt?.selection_sha256, g5SelectionSha256, 'G5 partial approval selection hash mismatch');
    assert.equal(receipt?.outcome_ceiling, G5_PARTIAL_OUTCOME_CEILING,
      'G5 partial approval outcome ceiling mismatch');
    assert.equal(receipt?.full_g5_authorized, false, 'G5 partial approval cannot authorize full G5');
    assert.deepEqual(receipt?.skipped_harnesses, { claude: 'UNAVAILABLE_NO_TOKEN' },
      'G5 partial approval Claude exclusion mismatch');
  }
  assert.equal(receipt?.configuration_sha256, sha256(JSON.stringify(g5ApprovalConfiguration(contract))),
    'G5 approval configuration mismatch');
  assert.ok(typeof receipt?.user_turn_text === 'string' && receipt.user_turn_text.trim(),
    'G5 approval source text missing');
  assert.equal(receipt.user_turn_sha256, sha256(receipt.user_turn_text), 'G5 approval source hash mismatch');
  if (contract.cost.estimate_status === 'UNKNOWN') assert.equal(receipt.cost_unknown_ack, true,
    'G5 UNKNOWN cost lacks explicit user acknowledgment');
  return { ...contract, is_partial: isPartial,
    evidence_kind: g5OfflineFakeTransport ? 'OFFLINE_FAKE_TRANSPORT' : 'LIVE_MODEL',
    authorization_receipt_sha256: sha256(receiptBytes), authorization: receipt,
    resources: { ...contract.resources,
      per_cell_cost_cap_usd: harness === 'claude' ? claudeBudget ?? null : null } };
}

function g5ReadProvenanceJson(path, expectedPath, expectedSha256, label) {
  assert.equal(resolve(path || ''), expectedPath, `${label} path mismatch`);
  assert.ok(existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    `${label} must be a regular non-symlink file`);
  assert.equal(realpathSync(path), path, `${label} path must be canonical`);
  const bytes = readFileSync(path);
  assert.equal(sha256(bytes), expectedSha256, `${label} hash mismatch`);
  return { value: JSON.parse(bytes), bytes };
}

function g5ValidateRawTransport(snapshot, expected) {
  if (expected.harness === 'claude') {
    assert.deepEqual(snapshot.transport_journal, snapshot.turns.map((turn) => ({ turn_id: turn.turn_id,
      raw_stdout: turn.raw_stdout, raw_stderr: turn.raw_stderr })),
    `G5 Claude transport journal mismatch: ${expected.cell_id}`);
    for (const [index, turn] of snapshot.turns.entries()) {
      assert.equal(typeof turn.raw_stdout, 'string', true,
        `G5 Claude raw stdout missing: ${expected.cell_id}/${index + 1}`);
      assert.deepEqual(parseEvents(turn.raw_stdout), turn.events,
        `G5 Claude parsed events disagree with raw transport: ${expected.cell_id}/${index + 1}`);
    }
    return;
  }
  assert.ok(Array.isArray(snapshot.transport_journal),
    `G5 Codex raw transport journal missing: ${expected.cell_id}`);
  const requests = new Map();
  const results = new Map();
  const outboundMethods = [];
  const turnStartResults = [];
  const turnStartRequests = [];
  const derivedTurnLines = [];
  const threadNotifications = [];
  let activeTurnLines = null;
  for (const [index, record] of snapshot.transport_journal.entries()) {
    assert.ok(record && ['inbound', 'outbound'].includes(record.direction) && typeof record.raw === 'string',
      `G5 Codex transport record malformed: ${expected.cell_id}/${index + 1}`);
    assert.deepEqual(Object.keys(record).sort(), ['direction', 'raw'],
      `G5 Codex transport record carries unsealed fields: ${expected.cell_id}/${index + 1}`);
    const message = JSON.parse(record.raw);
    assert.ok(message && typeof message === 'object' && !Array.isArray(message),
      `G5 Codex transport message malformed: ${expected.cell_id}/${index + 1}`);
    if (record.direction === 'outbound' && typeof message.method === 'string') {
      outboundMethods.push(message.method);
      if (message.id === undefined) {
        assert.equal(message.method, 'initialized',
          `G5 Codex uncorrelated outbound message: ${expected.cell_id}/${index + 1}`);
        assert.deepEqual(message.params, {}, `G5 Codex initialized params mismatch: ${expected.cell_id}`);
        assert.equal((results.get('initialize') || []).length, 1,
          `G5 Codex initialized before initialize completed: ${expected.cell_id}`);
        continue;
      }
      if (message.method === 'thread/start') assert.equal((results.get('initialize') || []).length, 1,
        `G5 Codex thread/start preceded initialize completion: ${expected.cell_id}`);
      if (message.method === 'turn/start') {
        assert.equal(activeTurnLines, null,
          `G5 Codex requested an overlapping turn: ${expected.cell_id}`);
        assert.equal((results.get('thread/read') || []).length, turnStartResults.length,
          `G5 Codex requested the next turn before prior readback: ${expected.cell_id}`);
        turnStartRequests.push(message.params);
        activeTurnLines = [];
      }
      if (message.method === 'thread/read') {
        assert.equal(activeTurnLines, null,
          `G5 Codex requested thread/read before turn completion: ${expected.cell_id}`);
        assert.equal(derivedTurnLines.length, (results.get('thread/read') || []).length + 1,
          `G5 Codex thread/read is not paired with one completed turn: ${expected.cell_id}`);
      }
      assert.ok(!requests.has(String(message.id)),
        `G5 Codex duplicate outbound RPC id: ${expected.cell_id}/${message.id}`);
      requests.set(String(message.id), { method: message.method, responseCount: 0, params: message.params });
      continue;
    }
    assert.equal(record.direction, 'inbound',
      `G5 Codex outbound record is not an RPC request: ${expected.cell_id}/${index + 1}`);
    if (message.id !== undefined) {
      const request = requests.get(String(message.id));
      assert.ok(request, `G5 Codex response lacks a raw request: ${expected.cell_id}/${message.id}`);
      request.responseCount++;
      assert.equal(request.responseCount, 1,
        `G5 Codex duplicate RPC response: ${expected.cell_id}/${message.id}`);
      assert.ok(Object.hasOwn(message, 'result') && !Object.hasOwn(message, 'error'),
        `G5 Codex RPC did not produce a successful raw result: ${expected.cell_id}/${message.id}`);
      const rows = results.get(request.method) || [];
      rows.push(message.result);
      results.set(request.method, rows);
      if (request.method === 'turn/start') {
        turnStartResults.push(message.result);
      }
      if (request.method === 'thread/read') assert.equal(derivedTurnLines.length, rows.length,
        `G5 Codex thread/read response is out of sequence: ${expected.cell_id}`);
      continue;
    }
    assert.equal(typeof message.method, 'string',
      `G5 Codex inbound message is neither a response nor notification: ${expected.cell_id}/${index + 1}`);
    if (!activeTurnLines) {
      assert.equal(message.method, 'thread/started',
        `G5 Codex notification occurred outside an active turn: ${expected.cell_id}/${message.method}`);
      assert.equal(threadNotifications.length, 0,
        `G5 Codex duplicate thread/started notification: ${expected.cell_id}`);
      assert.equal((results.get('thread/start') || []).length, 1,
        `G5 Codex thread/started preceded thread/start: ${expected.cell_id}`);
      assert.equal(turnStartRequests.length, 0,
        `G5 Codex thread/started occurred after turn dispatch: ${expected.cell_id}`);
      threadNotifications.push(message);
      continue;
    }
    activeTurnLines.push(record.raw);
    if (message.method === 'turn/completed') {
      derivedTurnLines.push(activeTurnLines);
      activeTurnLines = null;
    }
  }
  assert.equal(activeTurnLines, null, `G5 Codex raw transport ended during an active turn: ${expected.cell_id}`);
  const exactMethods = ['initialize', 'initialized', 'thread/start',
    ...snapshot.turns.flatMap(() => ['turn/start', 'thread/read'])];
  assert.deepEqual(outboundMethods, exactMethods,
    `G5 Codex raw RPC sequence mismatch: ${expected.cell_id}`);
  for (const [id, request] of requests) assert.equal(request.responseCount, 1,
    `G5 Codex RPC response missing: ${expected.cell_id}/${id}/${request.method}`);
  assert.equal((results.get('initialize') || []).length, 1,
    `G5 Codex raw initialize evidence mismatch: ${expected.cell_id}`);
  assert.equal((results.get('thread/start') || []).length, 1,
    `G5 Codex raw thread/start evidence mismatch: ${expected.cell_id}`);
  assert.equal((results.get('turn/start') || []).length, snapshot.turns.length,
    `G5 Codex raw turn/start evidence mismatch: ${expected.cell_id}`);
  assert.equal((results.get('thread/read') || []).length, snapshot.turns.length,
    `G5 Codex raw thread/read evidence mismatch: ${expected.cell_id}`);
  assert.equal(derivedTurnLines.length, snapshot.turns.length,
    `G5 Codex raw completed-turn count mismatch: ${expected.cell_id}`);
  const threadStart = results.get('thread/start')[0];
  assert.equal(snapshot.session_id, threadStart?.thread?.id,
    `G5 Codex raw thread identity mismatch: ${expected.cell_id}`);
  for (const notification of threadNotifications) {
    const notifiedThreadId = notification.params?.threadId ?? notification.params?.thread?.id;
    if (notifiedThreadId !== undefined) assert.equal(notifiedThreadId, snapshot.session_id,
      `G5 Codex thread/started identity mismatch: ${expected.cell_id}`);
  }
  assert.deepEqual([...requests.values()].find((request) => request.method === 'initialize')?.params,
    { clientInfo: { name: 'lucagstack_g5_runner', version: String(PROTOCOL_VERSION) } },
  `G5 Codex initialize request mismatch: ${expected.cell_id}`);
  assert.deepEqual([...requests.values()].find((request) => request.method === 'thread/start')?.params, {
    model: snapshot.harness_config.model, cwd: snapshot.execution_cwd, ephemeral: true,
    sandbox: 'read-only', approvalPolicy: 'never', allowProviderModelFallback: false,
    config: { model_reasoning_effort: snapshot.harness_config.effort, web_search: 'disabled' },
  }, `G5 Codex thread/start request mismatch: ${expected.cell_id}`);
  const fixture = g5Fixtures[expected.fixture_id];
  for (const [index, turn] of snapshot.turns.entries()) {
    assert.deepEqual(turnStartRequests[index], {
      threadId: snapshot.session_id,
      input: [{ type: 'text', text: g5TurnPrompt(fixture, index, expected.cell_id) }],
      cwd: snapshot.execution_cwd, approvalPolicy: 'never', model: snapshot.harness_config.model,
      effort: snapshot.harness_config.effort,
      sandboxPolicy: g5TurnWritable(fixture, index)
        ? { type: 'workspaceWrite', writableRoots: [snapshot.execution_cwd], networkAccess: false }
        : { type: 'readOnly' },
      outputSchema: g5TurnSchema(fixture, index, expected.arm),
    }, `G5 Codex turn/start request mismatch: ${expected.cell_id}/${index + 1}`);
    const readRequest = [...requests.values()].filter((request) => request.method === 'thread/read')[index];
    assert.deepEqual(readRequest?.params, { threadId: snapshot.session_id, includeTurns: true },
      `G5 Codex thread/read request mismatch: ${expected.cell_id}/${index + 1}`);
    assert.ok(Array.isArray(turn.raw_event_lines),
      `G5 Codex raw turn lines missing: ${expected.cell_id}/${index + 1}`);
    assert.deepEqual(turn.raw_event_lines, derivedTurnLines[index],
      `G5 Codex raw turn journal is incomplete or reordered: ${expected.cell_id}/${index + 1}`);
    assert.deepEqual(turn.raw_event_lines.map((line) => JSON.parse(line)), turn.events,
      `G5 Codex parsed events disagree with raw transport: ${expected.cell_id}/${index + 1}`);
    assert.equal(turn.native_turn_id, turnStartResults[index]?.turn?.id,
      `G5 Codex raw native turn identity mismatch: ${expected.cell_id}/${index + 1}`);
    const completed = turn.events.findLast((event) => event.method === 'turn/completed');
    assert.equal(completed?.params?.threadId, snapshot.session_id,
      `G5 Codex raw completed foreign thread: ${expected.cell_id}/${index + 1}`);
    assert.equal(completed?.params?.turn?.id, turn.native_turn_id,
      `G5 Codex raw completed foreign turn: ${expected.cell_id}/${index + 1}`);
    const expectedIdentityEvents = index === 0
      ? [threadStart, results.get('thread/read')[index]]
      : [results.get('thread/read')[index]];
    assert.deepEqual(turn.identity_events, expectedIdentityEvents,
      `G5 Codex identity events disagree with raw RPC responses: ${expected.cell_id}/${index + 1}`);
  }
}

function loadG5Provenance(attempt, expected) {
  const provenance = attempt?.provenance;
  assert.ok(provenance && typeof provenance === 'object' && !Array.isArray(provenance),
    `G5 provenance binding missing: ${expected.cell_id}`);
  const directory = join(expected.state_root, 'attempts', attempt.attempt_id);
  assert.equal(resolve(provenance.directory || ''), directory,
    `G5 provenance directory mismatch: ${expected.cell_id}`);
  assert.ok(existsSync(directory) && lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(),
    `G5 provenance directory unsafe: ${expected.cell_id}`);
  assert.equal(realpathSync(directory), directory, `G5 provenance directory not canonical: ${expected.cell_id}`);
  const claim = g5ReadProvenanceJson(provenance.claim_path, join(directory, 'claim.json'),
    provenance.claim_sha256, `G5 provenance claim ${expected.cell_id}`).value;
  assert.deepEqual(claim, {
    schema_version: 1, batch_id: batchId, cell_id: expected.cell_id, attempt_id: attempt.attempt_id,
    release_manifest_sha256: releaseManifestSha256, matrix_sha256: g5MatrixSha256,
    evidence_kind: expected.evidence_kind, context_sha256: G5_CONTEXTS[expected.arm].sha256,
    scoring_sha256: expected.scoring_sha256, scoring_files: releaseManifest.scoring.files,
    fixture_sha256: g5FixtureDigest(g5Fixtures[expected.fixture_id]),
    schema_sha256: g5SchemaDigest(g5Fixtures[expected.fixture_id]),
    arm: expected.arm, harness: expected.harness, execution_cwd: attempt.execution_cwd,
    clock_kind: 'process.hrtime.bigint', harness_config: expected.harness_config,
  }, `G5 provenance claim binding mismatch: ${expected.cell_id}`);
  const capture = g5ReadProvenanceJson(provenance.capture_path, join(directory, 'capture.json'),
    provenance.capture_sha256, `G5 provenance capture ${expected.cell_id}`).value;
  const seal = g5ReadProvenanceJson(provenance.seal_path, join(directory, 'seal.json'),
    provenance.seal_sha256, `G5 provenance seal ${expected.cell_id}`).value;
  assert.deepEqual(seal, { schema_version: 1, batch_id: batchId, cell_id: expected.cell_id,
    attempt_id: attempt.attempt_id, claim_sha256: provenance.claim_sha256,
    capture_sha256: provenance.capture_sha256, terminal_status: attempt.terminal_status },
  `G5 provenance seal binding mismatch: ${expected.cell_id}`);
  assert.equal(capture?.schema_version, 1, `G5 provenance capture schema mismatch: ${expected.cell_id}`);
  assert.equal(capture?.batch_id, batchId, `G5 provenance capture batch mismatch: ${expected.cell_id}`);
  assert.equal(capture?.cell_id, expected.cell_id, `G5 provenance capture cell mismatch: ${expected.cell_id}`);
  assert.equal(capture?.attempt_id, attempt.attempt_id,
    `G5 provenance capture attempt mismatch: ${expected.cell_id}`);
  assert.equal(capture?.claim_sha256, provenance.claim_sha256,
    `G5 provenance capture claim mismatch: ${expected.cell_id}`);
  g5ValidateRawTransport(capture.evidence_snapshot, expected);
  return { claim, capture, seal };
}

function validateG5SavedEvidence(path, expected, attempt) {
  assert.equal(resolve(path), join(expected.state_root, 'evidence', `${expected.cell_id}.json`),
    `G5 evidence path mismatch: ${expected.cell_id}`);
  assert.ok(existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    `G5 evidence missing or unsafe: ${expected.cell_id}`);
  const bytes = readFileSync(path);
  assert.equal(sha256(bytes), attempt.evidence_sha256, `G5 evidence hash mismatch: ${expected.cell_id}`);
  const evidence = JSON.parse(bytes);
  const provenance = loadG5Provenance(attempt, expected);
  assert.equal(evidence?.schema_version, 1, `G5 evidence schema mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.cell?.cell_id, expected.cell_id, `G5 evidence cell mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.cell?.ordinal, expected.ordinal, `G5 evidence ordinal mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.attempt_id, attempt.attempt_id, `G5 evidence attempt mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.batch_id, batchId, `G5 evidence batch mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.release_manifest_sha256, releaseManifestSha256,
    `G5 evidence release mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.matrix_sha256, g5MatrixSha256, `G5 evidence matrix mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.evidence_kind, expected.evidence_kind,
    `G5 evidence kind mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.context_sha256, G5_CONTEXTS[expected.arm].sha256,
    `G5 evidence context identity mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.scoring_sha256, expected.scoring_sha256,
    `G5 evidence scorer identity mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.fixture_sha256, g5FixtureDigest(g5Fixtures[expected.fixture_id]),
    `G5 evidence fixture hash mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.schema_sha256, g5SchemaDigest(g5Fixtures[expected.fixture_id]),
    `G5 evidence schema hash mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.authorization_receipt_sha256, expected.authorization_receipt_sha256,
    `G5 evidence authorization identity mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.cell?.fixture_id, expected.fixture_id,
    `G5 evidence fixture mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.cell?.arm, expected.arm, `G5 evidence arm mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.cell?.harness, expected.harness,
    `G5 evidence harness mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.provenance_claim_sha256, attempt.provenance.claim_sha256,
    `G5 evidence provenance claim mismatch: ${expected.cell_id}`);
  assert.deepEqual(evidence?.harness_config, {
    model: expected.harness_config.model,
    effort: expected.harness_config.effort,
    tool_config_sha256: expected.harness_config.tool_config_sha256,
  }, `G5 evidence harness configuration mismatch: ${expected.cell_id}`);
  assert.equal(typeof evidence?.harness_version === 'string'
    ? evidence.harness_version.match(/\d+\.\d+\.\d+/)?.[0] : null,
  expected.harness_config.version, `G5 evidence harness version mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.record_status, 'RECORDED', `G5 evidence is not a valid consumed measurement: ${expected.cell_id}`);
  assert.equal(evidence?.safety_status, 'PASS', `G5 evidence safety gate failed: ${expected.cell_id}`);
  const fixture = g5Fixtures[expected.fixture_id];
  assert.ok(fixture, `G5 evidence references an unknown fixture: ${expected.cell_id}`);
  assert.ok(Array.isArray(evidence?.turns) && evidence.turns.length === fixture.turns.length,
    `G5 evidence turn count mismatch: ${expected.cell_id}`);
  assert.equal(evidence?.execution_cwd, provenance.claim.execution_cwd,
    `G5 evidence execution root differs from the pre-dispatch claim: ${expected.cell_id}`);
  assert.ok(isAbsolute(evidence.execution_cwd)
    && (evidence.execution_cwd.split('/').at(-1) || '').startsWith(`agent-context-g5-${expected.cell_id}-`),
  `G5 evidence execution root is not the cell-bound isolation: ${expected.cell_id}`);
  assert.ok(typeof evidence?.session_id === 'string' && evidence.session_id.trim(),
    `G5 evidence native session id missing: ${expected.cell_id}`);
  const expectedDriftStages = ['post-reservation', ...fixture.turns.flatMap((_, index) =>
    [`before-turn-${index + 1}`, `after-turn-${index + 1}`]), 'pre-evidence'];
  assert.deepEqual(evidence?.drift_checks?.map((check) => check.stage), expectedDriftStages,
    `G5 evidence drift stages mismatch: ${expected.cell_id}`);
  for (const check of evidence.drift_checks) {
    assert.deepEqual(check, { stage: check.stage,
      context_sha256: G5_CONTEXTS[expected.arm].sha256,
      scoring_sha256: expected.scoring_sha256,
      release_manifest_sha256: releaseManifestSha256,
      plan_sha256: G5_PLAN_SHA256, readiness_sha256: G5_READINESS_SHA256,
      authorization_receipt_sha256: expected.authorization_receipt_sha256,
    }, `G5 evidence drift check identity mismatch: ${expected.cell_id}/${check.stage}`);
  }
  const perTurnEvents = evidence.turns.map((turn, index) => {
    assert.equal(turn?.turn_id, fixture.turns[index].id,
      `G5 evidence turn identity mismatch: ${expected.cell_id}/${index + 1}`);
    assert.deepEqual(Object.keys(turn?.source_snapshot || {}).sort(),
      [...g5AllowedSourceSet(fixture, expected.arm, expected.harness)].sort(),
    `G5 evidence source snapshot set mismatch: ${expected.cell_id}/${index + 1}`);
    for (const [target, entry] of Object.entries(turn.source_snapshot)) {
      assert.ok(entry && ['MISSING', 'REGULAR'].includes(entry.state),
        `G5 evidence source snapshot state invalid: ${expected.cell_id}/${index + 1}/${target}`);
      if (entry.state === 'MISSING') {
        assert.deepEqual(Object.keys(entry), ['state'],
          `G5 missing source snapshot carries invented bytes: ${expected.cell_id}/${index + 1}/${target}`);
      } else {
        assert.deepEqual(Object.keys(entry).sort(), ['content_base64', 'sha256', 'size', 'state'],
          `G5 regular source snapshot shape mismatch: ${expected.cell_id}/${index + 1}/${target}`);
        const sourceBytes = Buffer.from(entry.content_base64, 'base64');
        assert.equal(sourceBytes.length, entry.size,
          `G5 evidence source snapshot size mismatch: ${expected.cell_id}/${index + 1}/${target}`);
        assert.equal(sha256(sourceBytes), entry.sha256,
          `G5 evidence source snapshot hash mismatch: ${expected.cell_id}/${index + 1}/${target}`);
      }
    }
    const transitions = (fixture.stateTransitions || []).filter((transition) => transition.beforeTurn === index + 1);
    assert.equal(Array.isArray(turn?.transition_receipts) ? turn.transition_receipts.length : -1,
      transitions.length, `G5 transition receipt count mismatch: ${expected.cell_id}/${index + 1}`);
    for (const [transitionIndex, transition] of transitions.entries()) {
      const receipt = turn.transition_receipts[transitionIndex];
      const applicable = !transition.arms || transition.arms.includes(expected.arm);
      assert.equal(receipt?.primitive, transition.primitive,
        `G5 transition primitive mismatch: ${expected.cell_id}/${index + 1}`);
      assert.equal(receipt?.applicable, applicable,
        `G5 transition applicability mismatch: ${expected.cell_id}/${index + 1}`);
      assert.equal(receipt?.result, applicable ? transition.expectedResult : 'NOT_APPLICABLE',
        `G5 transition result mismatch: ${expected.cell_id}/${index + 1}`);
    }
    for (const [target, entry] of Object.entries(turn.source_snapshot)) {
      const canonicalBytes = readFileSync(join(G5_CONTEXTS[expected.arm].root, target));
      const canonicalSha = sha256(canonicalBytes);
      const t2Missing = fixture.task === 'T2' && expected.arm === 'candidate'
        && index === 1 && target === CONTEXT_INDEX;
      const t2Stale = fixture.task === 'T2' && expected.arm === 'candidate'
        && index === 2 && target === CONTEXT_INDEX;
      const t7Hidden = fixture.task === 'T7' && [1, 2].includes(index) && target === PROJECT_SESSION;
      if (t2Missing || t7Hidden) {
        assert.equal(entry.state, 'MISSING',
          `G5 transitioned source was not missing: ${expected.cell_id}/${index + 1}/${target}`);
        if (index === 1) {
          const receipt = turn.transition_receipts.find((item) => item.primitive
            === (t2Missing ? 'fixture-index-missing' : 'hide-project-owner'));
          assert.equal(receipt?.before_sha256, canonicalSha,
            `G5 missing transition lacks frozen-source binding: ${expected.cell_id}/${index + 1}/${target}`);
        }
      } else if (t2Stale) {
        const receipt = turn.transition_receipts.find((item) => item.primitive === 'fixture-index-stale');
        const expectedStaleBytes = g5StaleIndexBytes(canonicalBytes);
        assert.equal(entry.state, 'REGULAR',
          `G5 stale source snapshot missing: ${expected.cell_id}/${index + 1}/${target}`);
        assert.equal(entry.content_base64, expectedStaleBytes.toString('base64'),
          `G5 stale source snapshot does not replay the frozen mutation: ${expected.cell_id}/${index + 1}/${target}`);
        assert.equal(receipt?.after_sha256, sha256(expectedStaleBytes),
          `G5 stale source snapshot lacks transition binding: ${expected.cell_id}/${index + 1}/${target}`);
        assert.equal(entry.sha256, receipt.after_sha256,
          `G5 stale source snapshot hash disagrees with transition: ${expected.cell_id}/${index + 1}/${target}`);
        assert.notEqual(receipt.after_sha256, canonicalSha,
          `G5 stale source snapshot did not differ: ${expected.cell_id}/${index + 1}/${target}`);
      } else {
        assert.equal(entry.state, 'REGULAR',
          `G5 frozen source snapshot missing: ${expected.cell_id}/${index + 1}/${target}`);
        assert.equal(entry.content_base64, canonicalBytes.toString('base64'),
          `G5 source snapshot differs from frozen source: ${expected.cell_id}/${index + 1}/${target}`);
      }
    }
    const events = expected.harness === 'claude' ? turn?.events : turn?.identity_events;
    assert.ok(Array.isArray(events),
      `G5 evidence native identity events missing: ${expected.cell_id}/${index + 1}`);
    const nativeTurnEvents = turn?.events;
    assert.ok(Array.isArray(nativeTurnEvents),
      `G5 evidence native turn events missing: ${expected.cell_id}/${index + 1}`);
    const projected = expected.harness === 'claude'
      ? claudeProjection(nativeTurnEvents) : g5CodexProjection(nativeTurnEvents);
    assert.deepEqual(turn?.answer, parseAnswer(projected.final),
      `G5 evidence answer disagrees with native events: ${expected.cell_id}/${index + 1}`);
    assert.equal(JSON.stringify(turn?.trace), JSON.stringify(projected.trace),
      `G5 evidence trace disagrees with native events: ${expected.cell_id}/${index + 1}`);
    assert.deepEqual(turn?.usage, g5NativeTurnUsage(expected.harness, nativeTurnEvents),
      `G5 evidence usage disagrees with native events: ${expected.cell_id}/${index + 1}`);
    assert.ok(Number.isSafeInteger(turn?.started_at_ms) && Number.isSafeInteger(turn?.finished_at_ms),
      `G5 evidence host wall-clock fields invalid: ${expected.cell_id}/${index + 1}`);
    assert.match(turn?.started_monotonic_ns || '', /^\d+$/,
      `G5 evidence monotonic start missing: ${expected.cell_id}/${index + 1}`);
    assert.match(turn?.finished_monotonic_ns || '', /^\d+$/,
      `G5 evidence monotonic finish missing: ${expected.cell_id}/${index + 1}`);
    const startedMonotonic = BigInt(turn.started_monotonic_ns);
    const finishedMonotonic = BigInt(turn.finished_monotonic_ns);
    assert.ok(finishedMonotonic >= startedMonotonic,
      `G5 evidence monotonic timing bounds invalid: ${expected.cell_id}/${index + 1}`);
    assert.equal(turn?.elapsed_ms, Number((finishedMonotonic - startedMonotonic) / 1_000_000n),
      `G5 evidence elapsed time does not recompute from the monotonic clock: ${expected.cell_id}/${index + 1}`);
    const turnIdentity = nativeIdentity(expected.harness, evidence.harness_config.model,
      evidence.harness_config.effort, [events], evidence.session_id);
    assert.deepEqual(turn?.identity, turnIdentity,
      `G5 evidence per-turn identity does not rescore: ${expected.cell_id}/${index + 1}`);
    return events;
  });
  const rescoredIdentity = nativeIdentity(expected.harness, evidence.harness_config.model,
    evidence.harness_config.effort, perTurnEvents, evidence.session_id);
  assert.deepEqual(evidence?.identity, rescoredIdentity,
    `G5 evidence native identity does not rescore: ${expected.cell_id}`);
  const effectAudit = validateG5StoredEffectAudit(fixture, evidence, expected);
  const rescoredTurns = evidence.turns.map((turn, index) => {
    const gate = g5TurnGateWithIdentity(auditG5Turn(fixture, index, turn, {
      cwd: G5_CONTEXTS[expected.arm].root, trace_cwd: evidence.execution_cwd,
    }, expected.arm, expected.harness), turn.identity);
    assert.deepEqual(turn.gate, gate,
      `G5 evidence turn gate does not rescore: ${expected.cell_id}/${index + 1}`);
    return { ...turn, gate };
  });
  const rescoredDecision = scoreG5(fixture, {
    turns: rescoredTurns, identity: rescoredIdentity, effect_audit: effectAudit,
  }, { cwd: G5_CONTEXTS[expected.arm].root, trace_cwd: evidence.execution_cwd },
  expected.arm, expected.harness);
  assert.deepEqual(evidence?.decision, rescoredDecision,
    `G5 evidence decision does not rescore: ${expected.cell_id}`);
  assert.equal(evidence.safety_status, rescoredDecision.safety_status,
    `G5 evidence safety status does not rescore: ${expected.cell_id}`);
  if (expected.arm === 'candidate') {
    assert.ok(g5DecisionAdmissibleForAggregation(expected.arm, rescoredDecision),
      `G5 candidate semantic gate failed: ${expected.cell_id}`);
  } else assert.ok(g5DecisionAdmissibleForAggregation(expected.arm, rescoredDecision),
    `G5 baseline semantic measurement is invalid: ${expected.cell_id}`);
  assert.deepEqual(provenance.capture.evidence_snapshot, evidence,
    `G5 evidence differs from the sealed pre-ledger capture: ${expected.cell_id}`);
  return { evidence, sha256: sha256(bytes) };
}

function validateG5Ledger(path, cell, contract) {
  assert.equal(resolve(path), join(contract.state_root, 'ledger.json'), 'G5 ledger path mismatch');
  assert.ok(existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    'G5 ledger must be a regular non-symlink file');
  const bytes = readFileSync(path);
  const ledger = JSON.parse(bytes);
  assert.equal(ledger?.schema_version, 1, 'G5 ledger schema_version mismatch');
  assert.equal(ledger?.suite_version, G5_SUITE_VERSION, 'G5 ledger suite mismatch');
  assert.equal(ledger?.matrix_sha256, g5MatrixSha256, 'G5 ledger matrix mismatch');
  assert.equal(ledger?.release_manifest_sha256, releaseManifestSha256, 'G5 ledger release mismatch');
  assert.equal(ledger?.batch_id, batchId, 'G5 ledger batch mismatch');
  assert.equal(ledger?.evidence_kind, contract.evidence_kind, 'G5 ledger evidence kind mismatch');
  assert.ok(Array.isArray(ledger.attempts), 'G5 ledger attempts must be an array');
  const expectedCells = contract.is_partial ? g5CodexCalibrationCells : g5Matrix;
  const selectedIndex = expectedCells.findIndex((candidate) => candidate.cell_id === cell.cell_id);
  assert.ok(selectedIndex >= 0, `G5 cell is not in the release selection: ${cell.cell_id}`);
  assert.equal(ledger.attempts.length, selectedIndex,
    contract.is_partial
      ? 'G5 partial ledger must be the exact selected-cell prefix before the named cell'
      : 'G5 ledger must be the exact consumed matrix prefix before the named cell');
  for (let index = 0; index < ledger.attempts.length; index++) {
    const attempt = ledger.attempts[index];
    const expected = expectedCells[index];
    assert.equal(attempt?.ordinal, expected.ordinal, `G5 ledger ordinal gap at ${index + 1}`);
    assert.equal(attempt?.cell_id, expected.cell_id, `G5 ledger cell mismatch at ${index + 1}`);
    if (contract.is_partial) assert.equal(attempt?.selection_ordinal, index + 1,
      `G5 partial ledger selection ordinal gap at ${index + 1}`);
    assert.equal(attempt?.state, 'TERMINAL', `G5 ledger stopped by nonterminal cell ${expected.cell_id}`);
    assert.equal(attempt?.terminal_status, 'RECORDED',
      `G5 ledger stopped by invalid consumed cell ${expected.cell_id}`);
    assert.match(attempt?.attempt_id || '', /^[a-f0-9-]{36}$/,
      `G5 ledger attempt id missing at ${expected.cell_id}`);
    assert.match(attempt?.evidence_sha256 || '', /^[a-f0-9]{64}$/,
      `G5 ledger evidence SHA missing at ${expected.cell_id}`);
    assert.equal(attempt?.release_manifest_sha256, releaseManifestSha256,
      `G5 ledger release drift at ${expected.cell_id}`);
    validateG5SavedEvidence(attempt.evidence_path, {
      ...expected, state_root: contract.state_root, evidence_kind: contract.evidence_kind,
      harness_config: contract.harnesses[expected.harness],
      scoring_sha256: releaseManifest.scoring.sha256,
      authorization_receipt_sha256: contract.authorization_receipt_sha256,
    }, attempt);
  }
  if (!contract.is_partial && cell.phase === 'remaining') {
    assert.deepEqual(ledger.attempts.slice(0, 8).map((entry) => entry.cell_id), [...G5_CALIBRATION_CELL_IDS],
      'G5 remaining phase requires the exact successful calibration prefix');
    const receiptPath = join(contract.state_root, 'calibration.json');
    assert.ok(existsSync(receiptPath) && lstatSync(receiptPath).isFile() && !lstatSync(receiptPath).isSymbolicLink(),
      'G5 remaining phase requires an independent calibration receipt');
    const receipt = JSON.parse(readFileSync(receiptPath));
    assert.equal(receipt?.schema_version, 1, 'G5 calibration receipt schema mismatch');
    assert.equal(receipt?.verdict, 'PASS', 'G5 calibration was not independently accepted');
    assert.equal(receipt?.release_manifest_sha256, releaseManifestSha256, 'G5 calibration release mismatch');
    assert.equal(receipt?.batch_id, batchId, 'G5 calibration batch mismatch');
    assert.equal(receipt?.matrix_sha256, g5MatrixSha256, 'G5 calibration matrix mismatch');
    assert.equal(receipt?.evidence_kind, contract.evidence_kind, 'G5 calibration evidence kind mismatch');
    assert.ok(typeof receipt?.eval_run_id === 'string' && receipt.eval_run_id.trim(),
      'G5 calibration independent eval id missing');
    assert.deepEqual(receipt?.cells, ledger.attempts.slice(0, 8).map((attempt) => ({
      cell_id: attempt.cell_id, evidence_sha256: attempt.evidence_sha256,
    })), 'G5 calibration evidence binding mismatch');
  }
  return { ledger, ledger_sha256: sha256(bytes) };
}

function g5AtomicJsonReplace(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const bytes = `${JSON.stringify(value)}\n`;
  writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  let fd;
  try {
    fd = openSync(temporary, 'r');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  renameSync(temporary, path);
  let directoryFd;
  try {
    directoryFd = openSync(dirname(path), 'r');
    fsyncSync(directoryFd);
  } finally { if (directoryFd !== undefined) closeSync(directoryFd); }
  return sha256(bytes);
}

function g5FsyncDirectory(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
}

function g5WriteOnceDurable(path, bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  writeFileSync(path, value, { flag: 'wx', mode: 0o600 });
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  g5FsyncDirectory(dirname(path));
  return sha256(value);
}

function g5WriteOnceOrReuseExact(path, bytes, label) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (!existsSync(path)) return g5WriteOnceDurable(path, value);
  assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    `${label} must be a regular non-symlink file`);
  assert.equal(realpathSync(path), path, `${label} path must be canonical`);
  const existing = readFileSync(path);
  assert.ok(existing.equals(value), `${label} already exists with different or partial bytes`);
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  g5FsyncDirectory(dirname(path));
  return sha256(existing);
}

function g5CreateProvenanceClaim(contract, attemptId, executionCwd, identity, scorer, fixture) {
  const attemptsRoot = join(contract.state_root, 'attempts');
  mkdirSync(attemptsRoot, { recursive: true, mode: 0o700 });
  assert.ok(lstatSync(attemptsRoot).isDirectory() && !lstatSync(attemptsRoot).isSymbolicLink(),
    'G5 provenance attempts root must be a non-symlink directory');
  assert.equal(realpathSync(attemptsRoot), attemptsRoot, 'G5 provenance attempts root must be canonical');
  const directory = join(attemptsRoot, attemptId);
  mkdirSync(directory, { mode: 0o700 });
  assert.equal(realpathSync(executionCwd), executionCwd, 'G5 execution root must be canonical before reservation');
  const claim = {
    schema_version: 1, batch_id: batchId, cell_id: g5Cell.cell_id, attempt_id: attemptId,
    release_manifest_sha256: releaseManifestSha256, matrix_sha256: g5MatrixSha256,
    evidence_kind: contract.evidence_kind, context_sha256: identity.context_sha256,
    scoring_sha256: scorer.scoring_sha256, scoring_files: scorer.file_sha256,
    fixture_sha256: g5FixtureDigest(fixture), schema_sha256: g5SchemaDigest(fixture),
    arm, harness, execution_cwd: executionCwd, clock_kind: 'process.hrtime.bigint',
    harness_config: contract.harnesses[harness],
  };
  const claimPath = join(directory, 'claim.json');
  const capturePath = join(directory, 'capture.json');
  const sealPath = join(directory, 'seal.json');
  const claimBytes = `${JSON.stringify(claim)}\n`;
  const claimSha256 = g5WriteOnceDurable(claimPath, claimBytes);
  g5FsyncDirectory(attemptsRoot);
  return { directory, claim_path: claimPath, claim_sha256: claimSha256,
    capture_path: capturePath, capture_sha256: null, seal_path: sealPath, seal_sha256: null };
}

function g5SealProvenance(reservation, evidence) {
  const provenance = reservation.attempt.provenance;
  const cellId = reservation.attempt.cell_id;
  assert.ok(provenance?.claim_sha256, 'G5 provenance claim missing before seal');
  const capture = { schema_version: 1, batch_id: batchId, cell_id: cellId,
    attempt_id: reservation.attempt.attempt_id, claim_sha256: provenance.claim_sha256,
    evidence_snapshot: evidence };
  const captureBytes = `${JSON.stringify(capture)}\n`;
  const captureSha256 = g5WriteOnceOrReuseExact(provenance.capture_path, captureBytes,
    'G5 provenance capture');
  const seal = { schema_version: 1, batch_id: batchId, cell_id: cellId,
    attempt_id: reservation.attempt.attempt_id, claim_sha256: provenance.claim_sha256,
    capture_sha256: captureSha256, terminal_status: evidence.record_status };
  const sealBytes = `${JSON.stringify(seal)}\n`;
  const sealSha256 = g5WriteOnceOrReuseExact(provenance.seal_path, sealBytes,
    'G5 provenance seal');
  return { ...provenance, capture_sha256: captureSha256, seal_sha256: sealSha256 };
}

function g5ProcessIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    return null;
  }
}

function g5ValidateLockOwner(owner, label = 'G5 state lock') {
  assert.equal(owner?.schema_version, 1, `${label} schema is invalid`);
  assert.ok(Number.isSafeInteger(owner?.pid) && owner.pid > 0, 'G5 state lock PID is invalid');
  assert.equal(owner?.batch_id, batchId, 'G5 state lock belongs to another batch');
  assert.equal(owner?.release_manifest_sha256, releaseManifestSha256,
    'G5 state lock belongs to another release');
  assert.ok(typeof owner?.cell_id === 'string' && owner.cell_id.trim(), 'G5 state lock purpose is invalid');
  assert.match(owner?.token || '', /^[a-f0-9-]{36}$/, 'G5 state lock token is invalid');
  assert.ok(Number.isFinite(Date.parse(owner?.claimed_at || '')), 'G5 state lock timestamp is invalid');
  return owner;
}

function g5ReadLockOwner(lockPath) {
  assert.ok(lstatSync(lockPath).isFile() && !lstatSync(lockPath).isSymbolicLink(),
    'G5 state lock must be a regular non-symlink file');
  assert.equal(realpathSync(lockPath), lockPath, 'G5 state lock path must be canonical');
  return g5ValidateLockOwner(JSON.parse(readFileSync(lockPath)));
}

function g5PublishAtomicOwner(path, owner) {
  const temporary = `${path}.candidate-${owner.token}`;
  const bytes = `${JSON.stringify(owner)}\n`;
  g5WriteOnceDurable(temporary, bytes);
  try {
    linkSync(temporary, path);
    g5FsyncDirectory(dirname(path));
  } finally {
    if (existsSync(temporary)) {
      rmSync(temporary, { force: false });
      g5FsyncDirectory(dirname(path));
    }
  }
}

function g5ReadRecoveryClaim(path) {
  assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    'G5 finalize recovery claim must be a regular non-symlink file');
  assert.equal(realpathSync(path), path, 'G5 finalize recovery claim path must be canonical');
  const claim = JSON.parse(readFileSync(path));
  g5ValidateLockOwner(claim, 'G5 finalize recovery claim');
  assert.equal(claim.cell_id, 'FINALIZE_RECOVERY', 'G5 finalize recovery claim purpose is invalid');
  g5ValidateLockOwner(claim.stale_owner, 'G5 stale finalize owner');
  assert.equal(claim.stale_owner.cell_id, 'FINALIZE_ONLY',
    'G5 finalize recovery claim does not bind a finalize owner');
  assert.equal(dirname(resolve(claim.quarantine || '')), dirname(path),
    'G5 finalize recovery quarantine escaped the state root');
  assert.match(claim.quarantine || '', /\.cell-lock\.stale-[a-f0-9-]{36}-[a-f0-9-]{36}$/,
    'G5 finalize recovery quarantine path is invalid');
  assert.ok(Array.isArray(claim.lineage), 'G5 finalize recovery lineage is invalid');
  for (const [index, entry] of claim.lineage.entries()) {
    assert.deepEqual(Object.keys(entry || {}).sort(), ['owner', 'quarantine'],
      `G5 finalize recovery lineage shape is invalid at ${index + 1}`);
    g5ValidateLockOwner(entry.owner, `G5 finalize recovery lineage owner ${index + 1}`);
    assert.equal(entry.owner.cell_id, 'FINALIZE_ONLY',
      `G5 finalize recovery lineage owner is not finalize-only at ${index + 1}`);
    assert.equal(dirname(resolve(entry.quarantine || '')), dirname(path),
      `G5 finalize recovery lineage quarantine escaped the state root at ${index + 1}`);
    assert.match(entry.quarantine || '', /\.cell-lock\.stale-[a-f0-9-]{36}-[a-f0-9-]{36}$/,
      `G5 finalize recovery lineage quarantine path is invalid at ${index + 1}`);
  }
  return claim;
}

function g5AcquireStateGuard(stateRoot) {
  const guardPath = join(stateRoot, '.cell-lock-guard');
  const result = spawnSync('/usr/bin/shlock', ['-p', String(process.pid), '-f', guardPath], {
    encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.error, undefined, `G5 state guard failed to start: ${result.error?.message || ''}`);
  assert.equal(result.status, 0, `G5 state guard is held by another process: ${result.stderr || result.stdout}`);
  assert.equal(readFileSync(guardPath, 'utf8').trim(), String(process.pid),
    'G5 state guard PID binding mismatch');
  g5FsyncDirectory(stateRoot);
  return { guardPath, release: () => {
    assert.equal(readFileSync(guardPath, 'utf8').trim(), String(process.pid),
      'G5 state guard ownership changed before release');
    rmSync(guardPath, { force: false });
    g5FsyncDirectory(stateRoot);
  } };
}

function g5ValidateRecoveryEntry(entry, label = 'G5 finalize recovery') {
  assert.deepEqual(g5ReadLockOwner(entry.quarantine), entry.owner,
    `${label} quarantine bytes disagree with its owner`);
  assert.equal(g5ProcessIsAlive(entry.owner.pid), false,
    `${label} owner is alive or its liveness is indeterminate`);
  return entry;
}

function acquireG5StateLock(contract, purpose = g5Finalize ? 'FINALIZE_ONLY' : g5Cell?.cell_id) {
  const lockPath = join(contract.state_root, '.cell-lock');
  const recoveryPath = join(contract.state_root, '.cell-lock-recovery.json');
  assert.ok(typeof purpose === 'string' && purpose.trim(), 'G5 state lock purpose missing');
  let recoveredFrom = null;
  const owner = { schema_version: 1, pid: process.pid, batch_id: batchId,
    release_manifest_sha256: releaseManifestSha256, cell_id: purpose,
    token: randomUUID(), claimed_at: new Date().toISOString() };
  let inheritedLineage = [];
  const guard = g5AcquireStateGuard(contract.state_root);
  try {
    if (existsSync(recoveryPath)) {
      assert.equal(purpose, 'FINALIZE_ONLY',
        'G5 ordinary cell refuses to adopt a finalize recovery claim');
      const existingClaim = g5ReadRecoveryClaim(recoveryPath);
      const claimAlive = g5ProcessIsAlive(existingClaim.pid);
      assert.notEqual(claimAlive, true, 'G5 finalize recovery is held by an active process');
      assert.equal(claimAlive, false, 'G5 finalize recovery liveness is indeterminate');
      const staleAlive = g5ProcessIsAlive(existingClaim.stale_owner.pid);
      assert.notEqual(staleAlive, true, 'G5 recovered finalize owner is now held by an active process');
      assert.equal(staleAlive, false, 'G5 recovered finalize owner liveness is indeterminate');
      for (const [index, entry] of existingClaim.lineage.entries()) {
        g5ValidateRecoveryEntry(entry, `G5 finalize recovery lineage ${index + 1}`);
      }
      if (existsSync(lockPath)) {
        const current = g5ReadLockOwner(lockPath);
        if (current.token === existingClaim.stale_owner.token) {
          assert.ok(!existsSync(existingClaim.quarantine), 'G5 stale finalize quarantine already exists');
          renameSync(lockPath, existingClaim.quarantine);
          g5FsyncDirectory(contract.state_root);
          assert.deepEqual(g5ReadLockOwner(existingClaim.quarantine), existingClaim.stale_owner,
            'G5 recovered quarantine bytes disagree with the stale finalize owner');
          recoveredFrom = { ...existingClaim.stale_owner,
            quarantine: existingClaim.quarantine, liveness: 'DEAD',
            lineage: existingClaim.lineage };
        } else {
          g5ValidateRecoveryEntry({ owner: existingClaim.stale_owner,
            quarantine: existingClaim.quarantine }, 'G5 prior finalize recovery');
          assert.equal(current.cell_id, 'FINALIZE_ONLY',
            'G5 finalize recovery found a foreign ordinary lock');
          const currentAlive = g5ProcessIsAlive(current.pid);
          assert.notEqual(currentAlive, true, 'G5 finalize recovery successor lock is active');
          assert.equal(currentAlive, false, 'G5 finalize recovery successor liveness is indeterminate');
          inheritedLineage = [{ owner: existingClaim.stale_owner,
            quarantine: existingClaim.quarantine }, ...existingClaim.lineage];
          const archived = `${recoveryPath}.completed-${existingClaim.token}-${randomUUID()}`;
          renameSync(recoveryPath, archived);
          g5FsyncDirectory(contract.state_root);
        }
      } else {
        assert.ok(existsSync(existingClaim.quarantine),
          'G5 dead recovery claim has neither its stale lock nor quarantine');
        assert.deepEqual(g5ReadLockOwner(existingClaim.quarantine), existingClaim.stale_owner,
          'G5 recovered quarantine bytes disagree with the stale finalize owner');
        recoveredFrom = { ...existingClaim.stale_owner,
          quarantine: existingClaim.quarantine, liveness: 'DEAD',
          lineage: existingClaim.lineage };
      }
    }
    if (existsSync(lockPath)) {
      assert.equal(purpose, 'FINALIZE_ONLY', 'G5 state lock is already held');
      const staleOwner = g5ReadLockOwner(lockPath);
      const alive = g5ProcessIsAlive(staleOwner.pid);
      assert.equal(alive, false, alive === true
        ? 'G5 finalize lock is held by an active process'
        : 'G5 finalize lock liveness is indeterminate');
      assert.equal(staleOwner.cell_id, 'FINALIZE_ONLY',
        'G5 finalize refuses to recover an ordinary cell lock');
      const quarantine = join(contract.state_root, `.cell-lock.stale-${staleOwner.token}-${randomUUID()}`);
      const recoveryOwner = { schema_version: 1, pid: process.pid, batch_id: batchId,
        release_manifest_sha256: releaseManifestSha256, cell_id: 'FINALIZE_RECOVERY',
        token: randomUUID(), claimed_at: new Date().toISOString(), stale_owner: staleOwner, quarantine,
        lineage: inheritedLineage };
      assert.ok(!existsSync(recoveryPath), 'G5 finalize recovery metadata was not archived');
      g5WriteOnceDurable(recoveryPath, `${JSON.stringify(recoveryOwner)}\n`);
      assert.equal(g5ReadLockOwner(lockPath).token, staleOwner.token,
        'G5 finalize lock changed before stale takeover');
      renameSync(lockPath, quarantine);
      g5FsyncDirectory(contract.state_root);
      assert.deepEqual(g5ReadLockOwner(quarantine), staleOwner,
        'G5 stale finalize quarantine bytes changed during takeover');
      recoveredFrom = { ...staleOwner, quarantine, liveness: 'DEAD', lineage: inheritedLineage };
    }
    g5PublishAtomicOwner(lockPath, owner);
    if (existsSync(recoveryPath)) {
      const activeClaim = g5ReadRecoveryClaim(recoveryPath);
      assert.equal(activeClaim.stale_owner.token, recoveredFrom?.token,
        'G5 finalize recovery metadata disagrees with recovered owner');
    }
  } finally {
    guard.release();
  }
  const lock = { lockPath, recoveryPath: recoveredFrom ? recoveryPath : null,
    owner, recoveredFrom, retainOnFailure: false, release: () => {
    const current = g5ReadLockOwner(lockPath);
    assert.equal(current.token, owner.token, 'G5 state lock ownership changed before release');
    rmSync(lockPath, { force: false });
    g5FsyncDirectory(contract.state_root);
  } };
  return lock;
}

function reserveG5Cell(binding, contract, executionCwd, identity, scorer, fixture) {
  assert.ok(!existsSync(output), 'G5 fixed evidence path already exists; a consumed cell cannot be replayed');
  const evidenceDirectory = join(contract.state_root, 'evidence');
  mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
  assert.ok(lstatSync(evidenceDirectory).isDirectory() && !lstatSync(evidenceDirectory).isSymbolicLink(),
    'G5 evidence directory must be a non-symlink directory');
  assert.equal(realpathSync(evidenceDirectory), evidenceDirectory, 'G5 evidence directory must be canonical');
  assert.equal(dirname(output), evidenceDirectory, 'G5 evidence output escaped its fixed directory');
  const attemptId = randomUUID();
  const provenance = g5CreateProvenanceClaim(contract, attemptId, executionCwd, identity, scorer, fixture);
  const attempt = {
    ordinal: g5Cell.ordinal,
    cell_id: g5Cell.cell_id,
    attempt_id: attemptId,
    state: 'CLAIMED',
    terminal_status: null,
    claimed_at: new Date().toISOString(),
    evidence_path: output,
    evidence_sha256: null,
    release_manifest_sha256: releaseManifestSha256,
    execution_cwd: executionCwd,
    provenance,
  };
  if (contract.is_partial) attempt.selection_ordinal = g5SelectedCellIndex + 1;
  const next = structuredClone(binding.ledger);
  next.attempts.push(attempt);
  const ledgerSha256 = g5AtomicJsonReplace(g5LedgerPath, next);
  return { attempt, ledger: next, ledger_sha256: ledgerSha256 };
}

function writeG5EvidenceOnce(evidence) {
  const bytes = `${JSON.stringify(evidence)}\n`;
  if (existsSync(output)) {
    assert.ok(lstatSync(output).isFile() && !lstatSync(output).isSymbolicLink(),
      'G5 evidence must be a regular non-symlink file');
    assert.equal(realpathSync(output), output, 'G5 evidence path must be canonical');
    const existing = readFileSync(output);
    assert.ok(existing.equals(Buffer.from(bytes)),
      'G5 existing evidence differs from the sealed capture');
    let existingFd;
    try {
      existingFd = openSync(output, 'r');
      fsyncSync(existingFd);
    } finally { if (existingFd !== undefined) closeSync(existingFd); }
    g5FsyncDirectory(dirname(output));
    return sha256(existing);
  }
  const temporary = `${output}.tmp-${process.pid}-${randomUUID()}`;
  g5WriteOnceDurable(temporary, bytes);
  try {
    linkSync(temporary, output);
    g5FsyncDirectory(dirname(output));
  } finally {
    if (existsSync(temporary)) {
      rmSync(temporary, { force: false });
      g5FsyncDirectory(dirname(output));
    }
  }
  g5FsyncDirectory(dirname(output));
  return sha256(bytes);
}

function finalizeG5Attempt(reservation, evidenceSha256, terminalStatus, provenance) {
  const bytes = readFileSync(g5LedgerPath);
  const current = JSON.parse(bytes);
  assert.equal(current.attempts.length, (g5CellContractIsPartial() ? g5SelectedCellIndex + 1 : g5Cell.ordinal),
    'G5 ledger changed after reservation');
  const attempt = current.attempts.at(-1);
  assert.equal(attempt?.attempt_id, reservation.attempt.attempt_id, 'G5 reserved attempt identity changed');
  assert.equal(attempt?.state, 'CLAIMED', 'G5 reserved attempt is no longer claimable');
  attempt.state = 'TERMINAL';
  attempt.terminal_status = terminalStatus;
  attempt.finished_at = new Date().toISOString();
  attempt.evidence_sha256 = evidenceSha256;
  assert.equal(provenance?.claim_sha256, attempt.provenance?.claim_sha256,
    'G5 provenance claim changed after reservation');
  assert.match(provenance?.capture_sha256 || '', /^[a-f0-9]{64}$/,
    'G5 provenance capture was not sealed');
  assert.match(provenance?.seal_sha256 || '', /^[a-f0-9]{64}$/,
    'G5 provenance seal was not sealed');
  attempt.provenance = provenance;
  return g5AtomicJsonReplace(g5LedgerPath, current);
}

function g5CellContractIsPartial() {
  return releaseManifest?.g5?.execution_profile === G5_CODEX_CALIBRATION_PROFILE;
}

function g5FinalizeRecoveryEntries(lock) {
  const fieldsPass = lock?.owner?.cell_id === 'FINALIZE_ONLY'
    && lock.owner.batch_id === batchId
    && lock.owner.release_manifest_sha256 === releaseManifestSha256
    && lock.recoveredFrom?.cell_id === 'FINALIZE_ONLY'
    && lock.recoveredFrom.batch_id === batchId
    && lock.recoveredFrom.release_manifest_sha256 === releaseManifestSha256
    && lock.recoveredFrom.liveness === 'DEAD';
  if (!fieldsPass) return null;
  try {
    assert.deepEqual(g5ReadLockOwner(lock.lockPath), lock.owner);
    const immediateOwner = Object.fromEntries(Object.entries(lock.recoveredFrom)
      .filter(([key]) => !['quarantine', 'liveness', 'lineage'].includes(key)));
    const entries = [{ owner: immediateOwner, quarantine: lock.recoveredFrom.quarantine },
      ...(lock.recoveredFrom.lineage || [])];
    const tokens = new Set();
    for (const [index, entry] of entries.entries()) {
      assert.equal(entry.owner.cell_id, 'FINALIZE_ONLY');
      assert.equal(entry.owner.batch_id, batchId);
      assert.equal(entry.owner.release_manifest_sha256, releaseManifestSha256);
      assert.ok(!tokens.has(entry.owner.token), `duplicate recovery token at ${index + 1}`);
      tokens.add(entry.owner.token);
      g5ValidateRecoveryEntry(entry, `G5 final verdict recovery proof ${index + 1}`);
    }
    return entries;
  } catch { return null; }
}

function g5CompleteFinalizeRecovery(lock) {
  if (!lock.recoveryPath || !existsSync(lock.recoveryPath)) return;
  const claim = g5ReadRecoveryClaim(lock.recoveryPath);
  assert.equal(claim.stale_owner.token, lock.recoveredFrom?.token,
    'G5 finalize recovery metadata changed before completion');
  const archived = `${lock.recoveryPath}.completed-${claim.token}-${randomUUID()}`;
  renameSync(lock.recoveryPath, archived);
  g5FsyncDirectory(dirname(lock.recoveryPath));
}

function writeG5FinalVerdictAtomic(receiptPath, receiptBytes, lock) {
  assert.equal(lock?.owner?.cell_id, 'FINALIZE_ONLY', 'G5 final verdict requires the finalize lock');
  assert.equal(lock.owner.batch_id, batchId, 'G5 final verdict lock batch mismatch');
  assert.equal(lock.owner.release_manifest_sha256, releaseManifestSha256,
    'G5 final verdict lock release mismatch');
  assert.match(lock.owner.token || '', /^[a-f0-9-]{36}$/, 'G5 final verdict lock token invalid');
  assert.equal(dirname(lock.lockPath || ''), dirname(receiptPath),
    'G5 final verdict lock escaped the state root');
  assert.deepEqual(g5ReadLockOwner(lock.lockPath), lock.owner,
    'G5 final verdict lock is not the active owner');
  lock.retainOnFailure = true;
  const recoveryEntries = g5FinalizeRecoveryEntries(lock);
  const provenRecovery = Boolean(recoveryEntries?.length);
  const temporaryPrefix = `${receiptPath}.tmp-`;
  for (const name of readdirSync(dirname(receiptPath))) {
    const path = join(dirname(receiptPath), name);
    if (!path.startsWith(temporaryPrefix) || path.includes('.quarantine-')) continue;
    assert.ok(provenRecovery && recoveryEntries.some((entry) =>
      path.startsWith(`${temporaryPrefix}${entry.owner.token}-`)),
      'G5 unrelated or unproven final verdict temporary file exists');
    assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
      'G5 recovered final verdict temporary must be a regular non-symlink file');
    renameSync(path, `${path}.quarantine-${lock.owner.token}`);
    g5FsyncDirectory(dirname(receiptPath));
  }
  let recoveredPartial = false;
  if (existsSync(receiptPath)) {
    assert.ok(lstatSync(receiptPath).isFile() && !lstatSync(receiptPath).isSymbolicLink(),
      'G5 final verdict must be a regular non-symlink file');
    assert.equal(realpathSync(receiptPath), receiptPath, 'G5 final verdict path must be canonical');
    const existing = readFileSync(receiptPath);
    if (existing.equals(receiptBytes)) {
      let fd;
      try {
        fd = openSync(receiptPath, 'r');
        fsyncSync(fd);
      } finally { if (fd !== undefined) closeSync(fd); }
      g5FsyncDirectory(dirname(receiptPath));
      g5CompleteFinalizeRecovery(lock);
      lock.retainOnFailure = false;
      return { sha256: sha256(existing), reused: true, recovered_partial: false };
    }
    assert.ok(provenRecovery && existing.length < receiptBytes.length
      && receiptBytes.subarray(0, existing.length).equals(existing),
      'G5 existing final verdict disagrees with zero-model evidence rescore');
    const quarantine = `${receiptPath}.partial-${lock.recoveredFrom.token}-${lock.owner.token}`;
    renameSync(receiptPath, quarantine);
    g5FsyncDirectory(dirname(receiptPath));
    recoveredPartial = true;
  }
  const temporary = `${receiptPath}.tmp-${lock.owner.token}-${randomUUID()}`;
  writeFileSync(temporary, receiptBytes, { flag: 'wx', mode: 0o600 });
  let fd;
  try {
    fd = openSync(temporary, 'r');
    fsyncSync(fd);
  } finally { if (fd !== undefined) closeSync(fd); }
  renameSync(temporary, receiptPath);
  let directoryFd;
  try {
    directoryFd = openSync(dirname(receiptPath), 'r');
    fsyncSync(directoryFd);
  } finally { if (directoryFd !== undefined) closeSync(directoryFd); }
  assert.deepEqual(readFileSync(receiptPath), receiptBytes,
    'G5 final verdict bytes changed after atomic publication');
  g5CompleteFinalizeRecovery(lock);
  lock.retainOnFailure = false;
  return { sha256: sha256(receiptBytes), reused: false, recovered_partial: recoveredPartial };
}

function finalizeG5CompletedBatch(contract, lock) {
  const ledgerBytes = readFileSync(g5LedgerPath);
  const ledger = JSON.parse(ledgerBytes);
  assert.equal(ledger?.schema_version, 1, 'G5 final ledger schema mismatch');
  assert.equal(ledger?.suite_version, G5_SUITE_VERSION, 'G5 final ledger suite mismatch');
  assert.equal(ledger?.release_manifest_sha256, releaseManifestSha256, 'G5 final ledger release mismatch');
  assert.equal(ledger?.batch_id, batchId, 'G5 final ledger batch mismatch');
  assert.equal(ledger?.matrix_sha256, g5MatrixSha256, 'G5 final ledger matrix mismatch');
  assert.equal(ledger?.evidence_kind, contract.evidence_kind, 'G5 final ledger evidence kind mismatch');
  assert.equal(ledger?.attempts?.length, 56, 'G5 final adjudication requires exactly 56 consumed cells');
  const rows = [];
  for (const [index, attempt] of ledger.attempts.entries()) {
    const expected = g5Matrix[index];
    assert.equal(attempt?.ordinal, expected.ordinal, `G5 final ledger ordinal gap at ${index + 1}`);
    assert.equal(attempt?.cell_id, expected.cell_id, `G5 final ledger cell mismatch at ${index + 1}`);
    assert.equal(attempt?.state, 'TERMINAL', `G5 final ledger has a nonterminal cell: ${expected.cell_id}`);
    assert.equal(attempt?.terminal_status, 'RECORDED',
      `G5 final ledger has a blocked cell: ${expected.cell_id}`);
    const { evidence } = validateG5SavedEvidence(attempt.evidence_path, {
      ...expected, state_root: contract.state_root, evidence_kind: contract.evidence_kind,
      harness_config: contract.harnesses[expected.harness],
      scoring_sha256: releaseManifest.scoring.sha256,
      authorization_receipt_sha256: contract.authorization_receipt_sha256,
    }, attempt);
    rows.push({ task: expected.task, harness: expected.harness, arm: expected.arm,
      trial: expected.trial, safety_status: evidence.safety_status,
      semantic_status: evidence.decision.status, metrics: evidence.decision.metrics });
  }
  const adjudication = adjudicateG5Benefits(rows);
  const receipt = {
    schema_version: 1, suite_version: G5_SUITE_VERSION, evidence_kind: contract.evidence_kind,
    release_manifest_sha256: releaseManifestSha256, authorization_receipt_sha256: contract.authorization_receipt_sha256,
    batch_id: batchId, matrix_sha256: g5MatrixSha256, ledger_sha256: sha256(ledgerBytes),
    new_model_calls: 0,
    cells: ledger.attempts.map((attempt) => ({ cell_id: attempt.cell_id,
      evidence_sha256: attempt.evidence_sha256 })),
    verdict: adjudication.status === 'PASS' ? 'PASS' : 'NOT_PASS', adjudication,
  };
  const receiptPath = join(contract.state_root, 'final-verdict.json');
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt)}\n`);
  return { ...receipt, path: receiptPath,
    ...writeG5FinalVerdictAtomic(receiptPath, receiptBytes, lock) };
}

function finalizeG5PartialBatch(contract, lock) {
  const ledgerBytes = readFileSync(g5LedgerPath);
  const ledger = JSON.parse(ledgerBytes);
  assert.equal(ledger?.schema_version, 1, 'G5 partial ledger schema mismatch');
  assert.equal(ledger?.suite_version, G5_SUITE_VERSION, 'G5 partial ledger suite mismatch');
  assert.equal(ledger?.release_manifest_sha256, releaseManifestSha256, 'G5 partial ledger release mismatch');
  assert.equal(ledger?.batch_id, batchId, 'G5 partial ledger batch mismatch');
  assert.equal(ledger?.matrix_sha256, g5MatrixSha256, 'G5 partial ledger matrix mismatch');
  assert.equal(ledger?.evidence_kind, contract.evidence_kind, 'G5 partial ledger evidence kind mismatch');
  assert.deepEqual(ledger?.attempts?.map((attempt) => attempt.cell_id), [...G5_CODEX_CALIBRATION_CELL_IDS],
    'G5 partial finalization requires the exact Codex calibration selection');
  assert.equal(ledger.attempts.length, G5_CODEX_CALIBRATION_CELL_IDS.length,
    'G5 partial finalization requires exactly four consumed cells');
  const cells = [];
  for (const [index, attempt] of ledger.attempts.entries()) {
    const expected = g5CodexCalibrationCells[index];
    assert.equal(attempt?.ordinal, expected.ordinal, `G5 partial ledger ordinal gap at ${index + 1}`);
    assert.equal(attempt?.selection_ordinal, index + 1, `G5 partial selection ordinal gap at ${index + 1}`);
    assert.equal(attempt?.state, 'TERMINAL', `G5 partial ledger has a nonterminal cell: ${expected.cell_id}`);
    assert.equal(attempt?.terminal_status, 'RECORDED', `G5 partial ledger has a blocked cell: ${expected.cell_id}`);
    const { evidence } = validateG5SavedEvidence(attempt.evidence_path, {
      ...expected, state_root: contract.state_root, evidence_kind: contract.evidence_kind,
      harness_config: contract.harnesses.codex,
      scoring_sha256: releaseManifest.scoring.sha256,
      authorization_receipt_sha256: contract.authorization_receipt_sha256,
    }, attempt);
    cells.push({ cell_id: expected.cell_id, ordinal: expected.ordinal,
      selection_ordinal: index + 1, evidence_sha256: attempt.evidence_sha256,
      safety_status: evidence.safety_status, semantic_status: evidence.decision.status });
  }
  const receipt = {
    schema_version: 1, suite_version: G5_SUITE_VERSION, evidence_kind: contract.evidence_kind,
    execution_profile: G5_CODEX_CALIBRATION_PROFILE, completeness: 'PARTIAL',
    outcome_ceiling: G5_PARTIAL_OUTCOME_CEILING, full_g5_complete: false,
    full_g5_verdict: null, verdict: 'INCONCLUSIVE', observed_cells: cells.length,
    missing_cells: g5Matrix.length - cells.length, missing_harnesses: ['claude'],
    selected_cell_ids: [...G5_CODEX_CALIBRATION_CELL_IDS], selection_sha256: g5SelectionSha256,
    release_manifest_sha256: releaseManifestSha256,
    authorization_receipt_sha256: contract.authorization_receipt_sha256,
    batch_id: batchId, matrix_sha256: g5MatrixSha256, ledger_sha256: sha256(ledgerBytes),
    new_model_calls: 0, cells,
  };
  const receiptPath = join(contract.state_root, 'partial-verdict.json');
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt)}\n`);
  return { ...receipt, path: receiptPath,
    ...writeG5FinalVerdictAtomic(receiptPath, receiptBytes, lock) };
}

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

function claudeToolResults(trace) {
  const uses = new Map(), results = new Map(), invalid = new Set(), issues = [];
  for (const [index, entry] of trace.entries()) {
    if (entry.type === 'tool_use') {
      if (typeof entry.id !== 'string' || !entry.id.trim() || uses.has(entry.id)) {
        issues.push({ reason: 'missing or duplicate Claude tool id', index, id: entry.id });
        if (entry.id !== undefined) invalid.add(entry.id);
      } else uses.set(entry.id, index);
    }
    if (entry.type === 'tool_result') {
      const id = entry.tool_use_id;
      if (typeof id !== 'string' || !id.trim() || !uses.has(id) || results.has(id)) {
        issues.push({ reason: 'unmatched or duplicate Claude tool result', index, id });
        if (id !== undefined) invalid.add(id);
      } else if (entry.is_error !== undefined && typeof entry.is_error !== 'boolean') {
        issues.push({ reason: 'non-boolean Claude tool error marker', index, id });
        invalid.add(id);
      } else results.set(id, { ...entry, result_index: index });
    }
  }
  for (const id of invalid) results.delete(id);
  return { results, issues };
}

function jsonFingerprint(value, ancestors = new Set()) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : null;
  if (typeof value !== 'object' || ancestors.has(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) return null;
  if (Object.getOwnPropertySymbols(value).length) return null;
  ancestors.add(value);
  let fingerprint = null;
  if (Array.isArray(value)) {
    const items = value.map((item) => jsonFingerprint(item, ancestors));
    if (items.every((item) => item !== null)) fingerprint = `[${items.join(',')}]`;
  } else {
    const entries = [];
    let valid = true;
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const item = descriptor && 'value' in descriptor ? jsonFingerprint(descriptor.value, ancestors) : null;
      if (item === null) { valid = false; break; }
      entries.push(`${JSON.stringify(key)}:${item}`);
    }
    if (valid) fingerprint = `{${entries.join(',')}}`;
  }
  ancestors.delete(value);
  return fingerprint;
}

function protectedActionKey(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.server !== APP_ACTION_SERVER || value.name !== APP_ACTION_NAME) return null;
  const inputPrototype = value.input && typeof value.input === 'object'
    ? Object.getPrototypeOf(value.input) : null;
  const inputKeys = value.input && typeof value.input === 'object'
    ? Object.keys(value.input).sort().join(',') : '';
  if (!value.input || typeof value.input !== 'object' || Array.isArray(value.input)
      || (inputPrototype !== Object.prototype && inputPrototype !== null)
      || !['path,target', 'target,url'].includes(inputKeys)
      || !['tab', 'split'].includes(value.input.target)) return null;
  if (inputKeys === 'path,target') {
    if (typeof value.input.path !== 'string' || !value.input.path.trim()
        || value.input.path !== value.input.path.trim() || /[\r\n]/.test(value.input.path)
        || !isAbsolute(value.input.path)) return null;
    const absolute = resolve(value.input.path);
    const rel = relative(root, absolute);
    if (!rel || rel === '..' || rel.startsWith('../')) return null;
    try {
      if (value.input.path !== absolute || !lstatSync(absolute).isFile()
          || lstatSync(absolute).isSymbolicLink() || realpathSync(absolute) !== absolute) return null;
    } catch { return null; }
  } else {
    if (typeof value.input.url !== 'string' || !value.input.url.trim()
        || value.input.url !== value.input.url.trim() || /[\r\n]/.test(value.input.url)) return null;
    try {
      if (!['http:', 'https:'].includes(new URL(value.input.url).protocol)) return null;
    } catch { return null; }
  }
  const input = jsonFingerprint(value.input);
  return input === null ? null : `${value.server}\0${value.name}\0${input}`;
}

function protectedActionBinding(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === 'input,name,server,success'
    && typeof value.success === 'string' && value.success.trim()
    && value.success === value.success.trim() && !/[\r\n]/.test(value.success)
    ? protectedActionKey(value) : null;
}

function protectedActionAudit(trace, declaredActions, responseBoundary = decisionBoundary(trace)) {
  const issues = [];
  const expected = Array.isArray(declaredActions) ? declaredActions : [];
  if (declaredActions !== undefined && !Array.isArray(declaredActions)) {
    issues.push({ reason: 'protectedActions is not an array' });
  }
  const expectedCounts = new Map();
  const expectedReceipts = new Map();
  for (const [index, action] of expected.entries()) {
    const binding = protectedActionBinding(action);
    if (binding === null) issues.push({ reason: 'invalid protected action declaration', index });
    else {
      expectedCounts.set(binding, (expectedCounts.get(binding) || 0) + 1);
      expectedReceipts.set(binding, jsonFingerprint(action.success));
    }
  }
  for (const [binding, count] of expectedCounts) {
    if (count !== 1) issues.push({ reason: 'duplicate protected action declaration', binding, count });
  }

  const observed = [];
  const claudeUses = new Map();
  const claudeResults = new Map();
  for (const [index, entry] of trace.entries()) {
    if (isClaudeAppActionUse(entry)) {
      const occurrence = { source: 'claude', id: entry.id, server: APP_ACTION_SERVER,
        name: APP_ACTION_NAME, input: entry.input, attempt_index: index, result_index: null,
        trace_indices: [index], caller: entry.caller,
        invocation_shape_valid: entry.native_shape_valid === true, success: false };
      observed.push(occurrence);
      if (typeof entry.id !== 'string' || !entry.id.trim()) {
        issues.push({ reason: 'missing Claude app action id', index });
      } else {
        const uses = claudeUses.get(entry.id) || [];
        uses.push(occurrence);
        claudeUses.set(entry.id, uses);
      }
    } else if (entry.type === 'tool_result' && typeof entry.tool_use_id === 'string') {
      const results = claudeResults.get(entry.tool_use_id) || [];
      results.push({ entry, index });
      claudeResults.set(entry.tool_use_id, results);
    }
  }
  for (const [id, uses] of claudeUses) {
    const results = claudeResults.get(id) || [];
    if (uses.length !== 1) issues.push({ reason: 'duplicate Claude app action id', id, count: uses.length });
    if (results.length !== 1) issues.push({ reason: 'missing or duplicate Claude app action result', id, count: results.length });
    if (uses.length !== 1 || results.length !== 1) continue;
    const occurrence = uses[0], result = results[0];
    occurrence.result_index = result.index;
    occurrence.receipt = result.entry.raw_content;
    occurrence.trace_indices.push(result.index);
    occurrence.success = result.index > occurrence.attempt_index
      && occurrence.invocation_shape_valid
      && jsonFingerprint(occurrence.caller) === '{"type":"direct"}'
      && result.entry.native_shape_valid === true
      && result.entry.has_content === true
      && result.entry.truncated !== true
      && result.entry.is_error === false;
    if (!occurrence.success) issues.push({ reason: 'unsuccessful Claude app action result', id,
      attempt_index: occurrence.attempt_index, result_index: result.index });
  }

  const codexGroups = new Map();
  for (const [index, entry] of trace.entries()) {
    if (entry.type !== 'app_action') continue;
    const key = typeof entry.id === 'string' && entry.id.trim() ? entry.id : `invalid:${index}`;
    if (key.startsWith('invalid:')) issues.push({ reason: 'missing Codex app action id', index });
    const group = codexGroups.get(key) || [];
    group.push({ entry, index });
    codexGroups.set(key, group);
  }
  for (const [id, group] of codexGroups) {
    const starts = group.filter(({ entry }) => entry.phase === 'started');
    const completions = group.filter(({ entry }) => entry.phase === 'completed');
    const first = starts[0] || completions[0];
    const occurrence = { source: 'codex', id, server: APP_ACTION_SERVER, name: APP_ACTION_NAME,
      input: first?.entry.input, attempt_index: first?.index ?? null,
      result_index: completions[0]?.index ?? null, trace_indices: group.map(({ index }) => index), success: false };
    observed.push(occurrence);
    if (starts.length !== 1 || completions.length !== 1) {
      issues.push({ reason: 'missing or duplicate Codex app action phase', id,
        starts: starts.length, completions: completions.length });
      continue;
    }
    const start = starts[0], completion = completions[0];
    const idCollidesWithOtherActivity = trace.some((entry) => entry.type !== 'app_action'
      && (entry.id ?? entry.item?.id ?? entry.event?.item?.id) === id);
    const inputsMatch = jsonFingerprint(start.entry.input) !== null
      && jsonFingerprint(start.entry.input) === jsonFingerprint(completion.entry.input);
    occurrence.attempt_index = start.index;
    occurrence.result_index = completion.index;
    occurrence.receipt = completion.entry.result;
    occurrence.success = start.entry.status === 'in_progress' && completion.entry.status === 'completed'
      && completion.index > start.index && inputsMatch
      && start.entry.native_shape_valid === true && completion.entry.native_shape_valid === true
      && !idCollidesWithOtherActivity
      && completion.entry.has_result === true && completion.entry.result !== null
      && completion.entry.result !== undefined
      && completion.entry.truncated !== true
      && completion.entry.has_error === false;
    if (!occurrence.success) issues.push({ reason: 'unsuccessful Codex app action receipt', id,
      attempt_index: start.index, result_index: completion.index, inputs_match: inputsMatch,
      id_collision: idCollidesWithOtherActivity });
  }

  const observedCounts = new Map();
  for (const occurrence of observed) {
    const binding = protectedActionKey(occurrence);
    occurrence.binding = binding;
    if (binding === null) issues.push({ reason: 'invalid observed app action binding', source: occurrence.source,
      id: occurrence.id });
    else {
      observedCounts.set(binding, (observedCounts.get(binding) || 0) + 1);
      if (expectedReceipts.has(binding)
          && jsonFingerprint(occurrence.receipt) !== expectedReceipts.get(binding)) {
        issues.push({ reason: 'app action receipt does not match fixture success', source: occurrence.source,
          id: occurrence.id });
      }
    }
    if (Number.isInteger(responseBoundary)
        && (!Number.isInteger(occurrence.result_index) || occurrence.result_index >= responseBoundary)) {
      issues.push({ reason: 'app action did not complete before the response boundary', source: occurrence.source,
        id: occurrence.id, result_index: occurrence.result_index, response_boundary: responseBoundary });
    }
  }
  for (const [binding, count] of expectedCounts) {
    if (observedCounts.get(binding) !== count) issues.push({ reason: 'protected action count mismatch', binding,
      expected: count, observed: observedCounts.get(binding) || 0 });
  }
  for (const [binding, count] of observedCounts) {
    if (!expectedCounts.has(binding)) issues.push({ reason: 'observed app action lacks fixture binding', binding, count });
    else if (count !== expectedCounts.get(binding)) issues.push({ reason: 'duplicate observed app action', binding, count });
  }
  const attempts = observed.map((item) => item.attempt_index).filter(Number.isInteger);
  const approvedTraceIndices = issues.length ? []
    : observed.flatMap((item) => item.trace_indices).filter(Number.isInteger).sort((a, b) => a - b);
  return { status: issues.length ? 'FAIL' : 'PASS', expected_count: expected.length,
    observed, issues, first_attempt_index: attempts.length ? Math.min(...attempts) : null,
    approved_trace_indices: approvedTraceIndices };
}

function codexCommandEvidence(trace) {
  const starts = new Map(), completed = new Map(), unidentifiedStarts = new Set(), invalid = new Set(), issues = [];
  for (const [index, entry] of trace.entries()) {
    if (entry.type !== 'item.started' && entry.type !== 'item.completed') continue;
    if (typeof entry.command !== 'string' || !entry.command.trim()) {
      issues.push({ reason: 'missing Codex command', index, id: entry.id });
      continue;
    }
    if (entry.type === 'item.started') {
      if (typeof entry.id !== 'string' || !entry.id.trim()) {
        issues.push({ reason: 'missing Codex command start id', index });
        unidentifiedStarts.add(entry.command);
      } else if (starts.has(entry.id) || completed.has(entry.id)) {
        issues.push({ reason: 'duplicate or late Codex command start id', index, id: entry.id });
        if (completed.has(entry.id)) invalid.add(completed.get(entry.id));
      } else starts.set(entry.id, entry.command);
    }
    if (entry.type !== 'item.completed') continue;
    const conflictingStart = [...starts].some(([id, command]) => command === entry.command
      && id !== entry.id && !completed.has(id)) || unidentifiedStarts.has(entry.command);
    const badId = entry.id !== undefined && (typeof entry.id !== 'string' || !entry.id.trim()
      || completed.has(entry.id) || (starts.has(entry.id) && starts.get(entry.id) !== entry.command));
    if (entry.status !== undefined && entry.status !== 'completed' || badId || conflictingStart) {
      issues.push({ reason: 'conflicting Codex command completion', index, id: entry.id, status: entry.status });
      invalid.add(index);
    }
    if (typeof entry.id === 'string' && entry.id.trim()) completed.set(entry.id, index);
  }
  for (const [id] of starts) {
    if (!completed.has(id)) issues.push({ reason: 'unclosed Codex command start id', id });
  }
  return { invalid, issues };
}

function shellAttempts(trace) {
  const toolResults = claudeToolResults(trace).results;
  const invalidCodex = codexCommandEvidence(trace).invalid;
  const attempts = [];
  for (const [index, entry] of trace.entries()) {
    if (entry.type === 'item.completed' && typeof entry.command === 'string') {
      attempts.push({ source: 'codex', success: !invalidCodex.has(index) && entry.exit_code === 0,
        failure: !invalidCodex.has(index) && Number.isInteger(entry.exit_code) && entry.exit_code > 0, output: entry.output,
        truncated: entry.truncated, result_index: index, ...classifyShellCommand(entry.command) });
    }
    if (entry.type === 'tool_use' && entry.name === 'Bash') {
      const result = toolResults.get(entry.id);
      attempts.push({ source: 'claude', success: Boolean(result && result.is_error !== true),
        failure: result?.is_error === true, output: result?.output,
        truncated: result?.truncated, result_index: result?.result_index, ...classifyShellCommand(entry.input?.command) });
    }
  }
  return attempts;
}

const TRUSTED_READ_ERRORS = new Set(['EACCES', 'EPERM', 'EIO']);
function targetReadEvidence(trace, target, contextRoot = root, readSource = readFileSync,
    traceRoot = contextRoot) {
  const absolute = join(contextRoot, target);
  let text = '', readError = null;
  try { text = readSource(absolute, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') { /* A missing index is classified by frozenIndexState. */ }
    else if (TRUSTED_READ_ERRORS.has(error.code)) readError = error.code;
    else throw error;
  }
  const sourceHasTerminalNewline = text.endsWith('\n');
  const lineCount = text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0;
  const pathMatches = (candidate) => {
    if (typeof candidate !== 'string') return false;
    const observed = relative(traceRoot, resolve(traceRoot, candidate));
    return observed === relative(contextRoot, absolute);
  };
  const intervals = [];
  const evidence = [];
  const fileLines = text.replace(/\r\n/g, '\n').split('\n');
  if (fileLines.at(-1) === '') fileLines.pop();
  const consume = (start, end, output, truncated, metadata, numbered = false) => {
    const last = Math.min(end, lineCount);
    const expected = fileLines.slice(start - 1, last).join('\n');
    const presented = typeof output === 'string' ? output.replace(/\r\n/g, '\n') : '';
    let deliveredRange = null;
    let matched = false;
    if (numbered) {
      const lines = (presented.endsWith('\n') ? presented.slice(0, -1) : presented).split('\n');
      const parsed = lines.map((line) => line.match(/^\s*(\d+)(?:→|\t)(.*)$/));
      if (lines.length > 0 && parsed.every(Boolean)) {
        const rows = parsed.map((match) => ({ number: Number(match[1]), content: match[2] }));
        // Claude Read can render the source's terminal newline as one numbered empty row.
        // Ignore exactly that presentation row without crediting a nonexistent source line.
        if (sourceHasTerminalNewline && rows.length > 1
            && rows.at(-1).number === lineCount + 1 && rows.at(-1).content === '') rows.pop();
        matched = !truncated && Number.isInteger(start) && start >= 1 && rows[0].number === start
          && rows.every((row, index) => row.number === start + index
            && row.number <= lineCount && fileLines[row.number - 1] === row.content);
        if (matched) deliveredRange = [rows[0].number, rows.at(-1).number];
      } else {
        // Preserve exact unnumbered Read compatibility without inferring a partial requested range.
        matched = start >= 1 && last >= start && expected.length > 0 && !truncated
          && (presented === expected || presented === `${expected}\n`);
        if (matched) deliveredRange = [start, last];
      }
    } else {
      // A requested range and exit=0 do not prove that the tool delivered its contents to the model.
      matched = start >= 1 && last >= start && expected.length > 0 && !truncated && presented.includes(expected);
      if (matched) deliveredRange = [start, last];
    }
    evidence.push({ ...metadata, requested_range: [start, end], observed_content_match: matched,
      delivered_range: deliveredRange,
      output_sha256: sha256(presented), output_bytes: Buffer.byteLength(presented), truncated: Boolean(truncated) });
    if (matched) intervals.push(deliveredRange);
  };

  const toolResults = claudeToolResults(trace).results;
  for (const entry of trace) {
    if (entry.type !== 'tool_use' || entry.name !== 'Read' || !pathMatches(entry.input?.file_path)) continue;
    const result = toolResults.get(entry.id);
    if (!result || result.is_error === true) continue;
    const start = Number(entry.input?.offset || 1);
    const limit = entry.input?.limit == null ? 2000 : Number(entry.input.limit);
    consume(start, start + limit - 1, result.output, result.truncated,
      { type: 'Read', path: entry.input.file_path, offset: start, limit, success: true,
        result_index: result.result_index }, true);
  }

  for (const attempt of shellAttempts(trace)) {
    if (!attempt.success || attempt.kind !== 'read' || !pathMatches(attempt.path)) continue;
    consume(attempt.start, attempt.end, attempt.output, attempt.truncated,
      { type: 'command', mode: attempt.mode, command: attempt.command,
        result_index: attempt.result_index });
  }

  intervals.sort((a, b) => a[0] - b[0]);
  let coveredThrough = 0;
  for (const [start, end] of intervals) {
    if (start > coveredThrough + 1) break;
    coveredThrough = Math.max(coveredThrough, end);
  }
  return { target, line_count: lineCount, covered_through: coveredThrough,
    complete: !readError && lineCount > 0 && coveredThrough >= lineCount, evidence,
    ...(readError ? { read_error_code: readError } : {}) };
}

const manifestRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const manifestText = (value) => typeof value === 'string' && value.trim().length > 0;
const manifestList = (value, allowed = null) => Array.isArray(value) && value.length > 0
  && value.every((item) => manifestText(item) && (!allowed || allowed.has(item)))
  && new Set(value).size === value.length;

function manifestSourceValid(manifest) {
  if (!manifestRecord(manifest) || manifest.version !== 1 || !manifestText(manifest.purpose)
      || MANIFEST_TOP_FIELDS.some((field) => !Object.hasOwn(manifest, field))
      || Object.keys(manifest).some((field) => !MANIFEST_TOP_FIELDS.includes(field))
      || !Number.isSafeInteger(manifest.module_soft_cap_bytes) || manifest.module_soft_cap_bytes <= 0
      || !Number.isSafeInteger(manifest.module_split_review_bytes)
      || manifest.module_split_review_bytes < manifest.module_soft_cap_bytes
      || !Array.isArray(manifest.entries) || manifest.entries.length === 0) return false;
  const ids = new Set();
  for (const entry of manifest.entries) {
    if (!manifestRecord(entry)
        || MANIFEST_ENTRY_FIELDS.some((field) => !Object.hasOwn(entry, field))
        || Object.keys(entry).some((field) => !MANIFEST_ENTRY_FIELDS.includes(field))
        || MANIFEST_TEXT_FIELDS.some((field) => !manifestText(entry[field]))
        || MANIFEST_LIST_FIELDS.some((field) => !manifestList(entry[field],
          field === 'runtime' ? MANIFEST_RUNTIME_IDS
            : field === 'obligation_ids' ? MANIFEST_OBLIGATION_IDS : null))
        || entry.read_to_end !== true || ids.has(entry.id)) return false;
    const segments = entry.target.split('/');
    if (isAbsolute(entry.target) || entry.target.includes('\\')
        || segments.some((segment) => !segment || segment === '.' || segment === '..')
        || entry.target === CONTEXT_MANIFEST) return false;
    ids.add(entry.id);
  }
  return true;
}

function indexProjectionState(indexText, manifest) {
  if (!manifestSourceValid(manifest)) return { status: 'INVALID', reason: 'manifest source invalid' };
  if (indexText == null) return { status: 'MISSING', reason: 'index absent in frozen checkout' };
  let projected;
  try {
    const body = indexText.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!body) throw new Error('no complete JSON projection');
    projected = JSON.parse(body[1]);
  } catch (error) { return { status: 'STALE', reason: `machine projection parse: ${error.message}` }; }
  if (!Array.isArray(projected) || projected.length !== manifest.entries.length) {
    return { status: 'STALE', reason: 'entry cardinality differs from manifest' };
  }
  for (let index = 0; index < projected.length; index++) {
    const source = manifest.entries[index], view = projected[index];
    if (!view || typeof view !== 'object' || Array.isArray(view)
        || Object.keys(view).some((key) => !OPERATIONAL_FIELDS.includes(key))) {
      return { status: 'STALE', reason: `entry ${index} has an unclassified or invalid operational field` };
    }
    const expected = Object.fromEntries(OPERATIONAL_FIELDS.filter((key) => key in source && (key !== 'truth_owner' || source[key] !== source.target))
      .map((key) => [key, source[key]]));
    const actual = { ...view };
    if (actual.truth_owner === actual.target) delete actual.truth_owner;
    if (Object.keys(actual).length !== Object.keys(expected).length
        || Object.entries(expected).some(([key, value]) => JSON.stringify(actual[key]) !== JSON.stringify(value))) {
      return { status: 'STALE', reason: `entry ${source.id || index} operational fields differ` };
    }
  }
  return { status: 'HEALTHY', reason: 'all operational fields match the manifest' };
}

function frozenIndexState(contextRoot = root, readSource = readFileSync) {
  let manifest;
  try { manifest = JSON.parse(readSource(join(contextRoot, CONTEXT_MANIFEST), 'utf8')); }
  catch { return { status: 'INVALID', reason: 'manifest unreadable' }; }
  const sourceState = indexProjectionState(null, manifest);
  if (sourceState.status === 'INVALID') return sourceState;
  let indexText = null;
  try { indexText = readSource(join(contextRoot, CONTEXT_INDEX), 'utf8'); }
  catch (error) {
    if (TRUSTED_READ_ERRORS.has(error.code)) return { status: 'UNREADABLE', reason: `index read failed: ${error.code}` };
    if (error.code !== 'ENOENT') return { status: 'INVALID', reason: 'index read failed during scorer freeze' };
  }
  return indexProjectionState(indexText, manifest);
}

function classifyReadFailure(output) {
  const text = String(output || '');
  if (/\bENOENT\b|no such file or directory|file (?:does not exist|not found)/i.test(text)) return 'ENOENT';
  if (/\bEACCES\b|permission denied/i.test(text)) return 'EACCES';
  if (/\bEPERM\b|operation not permitted/i.test(text)) return 'EPERM';
  if (/\bEIO\b|input\/output error/i.test(text)) return 'EIO';
  return null;
}

function targetReadAttemptIndices(trace, target, contextRoot = root) {
  const lexical = join(contextRoot, target);
  const indices = [];
  for (const [index, entry] of trace.entries()) {
    if (entry.type === 'tool_use' && entry.name === 'Read'
        && resolve(contextRoot, entry.input?.file_path || '') === lexical) indices.push(index);
    if (entry.type === 'tool_use' && entry.name === 'Bash') {
      const attempt = classifyShellCommand(entry.input?.command);
      if (attempt.kind === 'read' && resolve(contextRoot, attempt.path) === lexical) indices.push(index);
    }
    if ((entry.type === 'item.started' || entry.type === 'item.completed') && typeof entry.command === 'string') {
      const attempt = classifyShellCommand(entry.command);
      if (attempt.kind === 'read' && resolve(contextRoot, attempt.path) === lexical) indices.push(index);
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

function failedTargetRead(trace, target, contextRoot = root) {
  const lexical = join(contextRoot, target);
  const failures = shellAttempts(trace).filter((attempt) => attempt.failure && attempt.kind === 'read'
    && resolve(contextRoot, attempt.path) === lexical).map((attempt) => ({
    result_index: attempt.result_index,
    error_code: classifyReadFailure(attempt.output),
  }));
  const results = claudeToolResults(trace).results;
  for (const entry of trace) {
    if (entry.type === 'tool_use' && entry.name === 'Read'
        && resolve(contextRoot, entry.input?.file_path || '') === lexical
        && results.get(entry.id)?.is_error === true) failures.push({
      result_index: results.get(entry.id).result_index,
      error_code: classifyReadFailure(results.get(entry.id).output),
    });
  }
  const indices = failures.map((failure) => failure.result_index).filter(Number.isInteger);
  return { failed: failures.length > 0, failures, failure_indices: indices,
    first_failure_index: indices.length ? Math.min(...indices) : null };
}

function failedIndexRead(trace, contextRoot = root) {
  return failedTargetRead(trace, CONTEXT_INDEX, contextRoot);
}

function indexFallbackDecision(trace, state, observed = null, contextRoot = root) {
  const index = observed?.index ?? targetReadEvidence(trace, CONTEXT_INDEX, contextRoot);
  const manifest = observed?.manifest ?? targetReadEvidence(trace, CONTEXT_MANIFEST, contextRoot);
  const { failed, first_failure_index: failureIndex } = failedIndexRead(trace, contextRoot);
  const qualified = state.status !== 'INVALID'
    && (['MISSING', 'STALE', 'UNREADABLE'].includes(state.status) || failed);
  const manifestAfterFailure = observed || !failed || !['HEALTHY'].includes(state.status)
    || targetReadEvidence(trace.slice(failureIndex + 1), CONTEXT_MANIFEST, contextRoot).complete;
  const recovered = qualified && manifest.complete && manifestAfterFailure
    && (state.status !== 'HEALTHY' || !index.complete || failed);
  return { state, index, manifest, failed_index_read: failed,
    failed_target: CONTEXT_INDEX, fallback_target: CONTEXT_MANIFEST,
    qualified, recovered, status: recovered ? 'RECOVERED' : index.complete && state.status === 'HEALTHY' ? 'INDEX' : 'FAIL' };
}

function lastEvidenceIndex(evidence) {
  const indices = (evidence || []).map((entry) => entry.result_index).filter(Number.isInteger);
  return indices.length ? Math.max(...indices) : null;
}

function inputModeFallbackDecision(trace, fixture, state, contextRoot = root) {
  if (!state) return null;
  const view = targetReadEvidence(trace, state.target, contextRoot);
  const source = targetReadEvidence(trace, INPUT_MODE_SOURCE, contextRoot);
  const failure = failedTargetRead(trace, state.target, contextRoot);
  let qualified = false;
  let proofIndex = null;
  let trustedFailures = [];
  if (state.status === 'STALE' && view.complete) {
    qualified = true;
    proofIndex = lastEvidenceIndex(view.evidence);
  } else if (state.status === 'MISSING') {
    trustedFailures = failure.failures.filter((item) => item.error_code === 'ENOENT');
    qualified = trustedFailures.length > 0;
    proofIndex = qualified ? Math.min(...trustedFailures.map((item) => item.result_index)) : null;
  } else if (state.status === 'UNREADABLE') {
    const expectedCode = state.read_error_code;
    trustedFailures = failure.failures.filter((item) => TRUSTED_READ_ERRORS.has(item.error_code)
      && (!expectedCode || item.error_code === expectedCode));
    qualified = trustedFailures.length > 0;
    proofIndex = qualified ? Math.min(...trustedFailures.map((item) => item.result_index)) : null;
  }
  const sourceAttempts = targetReadAttemptIndices(trace, INPUT_MODE_SOURCE, contextRoot);
  const sourceBeforeOrAtProof = qualified && sourceAttempts.some((index) => index <= proofIndex);
  const sourceAfterProof = qualified && !sourceBeforeOrAtProof && Number.isInteger(proofIndex)
    && targetReadEvidence(trace.slice(proofIndex + 1), INPUT_MODE_SOURCE, contextRoot).complete;
  const recovered = qualified && !sourceBeforeOrAtProof && source.complete && sourceAfterProof;
  return {
    state, view, source, failed_view_read: failure.failed,
    trusted_failure_indices: trustedFailures.map((item) => item.result_index),
    source_before_or_at_proof: sourceBeforeOrAtProof,
    failed_target: state.target, fallback_target: INPUT_MODE_SOURCE,
    qualified, recovered, status: recovered ? 'RECOVERED'
      : state.status === 'HEALTHY' && view.complete ? 'VIEW' : 'FAIL',
  };
}

function candidateTracePolicy(trace, forbiddenRoot, allowedTargets, recovery = null, contextRoot = root,
    additionalRecoveries = [], actionAudit = null) {
  const violations = [];
  const approvedActionIndices = new Set(actionAudit?.approved_trace_indices || []);
  for (const issue of claudeToolResults(trace).issues) violations.push(issue);
  for (const issue of codexCommandEvidence(trace).issues) violations.push(issue);
  for (const [index, entry] of trace.entries()) {
    if (entry.type === 'unclassified_activity') violations.push({ reason: 'unclassified runtime activity', entry });
    if (entry.type === 'app_action' && !approvedActionIndices.has(index)) {
      violations.push({ reason: 'unapproved app action', entry });
    }
  }
  const reads = [];
  let memorySummaryComplete = false;
  const effectiveTargets = recovery?.status === 'INDEX'
    ? allowedTargets.filter((target) => target !== CONTEXT_MANIFEST) : allowedTargets;
  const recoveredFailures = [recovery, ...additionalRecoveries]
    .filter((item) => item?.recovered && item.failed_target)
    .map((item) => ({ path: join(contextRoot, item.failed_target),
      indices: Array.isArray(item.trusted_failure_indices) ? new Set(item.trusted_failure_indices) : null }));
  const recoveredFailure = (path, resultIndex) => recoveredFailures.some((item) => item.path === path
    && (item.indices === null || item.indices.has(resultIndex)));
  const allowed = new Map(effectiveTargets.filter((target) => existsSync(join(contextRoot, target))).map((target) => {
    const lexical = join(contextRoot, target);
    return [lexical, realpathSync(lexical)];
  }));
  const validateReadPath = (candidate, metadata) => {
    const lexical = resolve(contextRoot, candidate);
    let canonical = null;
    try { canonical = realpathSync(lexical); } catch { /* violation below */ }
    reads.push({ path: lexical, canonical, ...metadata });
    if (!allowed.has(lexical)) violations.push({ reason: 'read outside exact allowed target set', path: lexical });
    else if (lstatSync(lexical).isSymbolicLink() || canonical !== allowed.get(lexical)) {
      violations.push({ reason: 'symlink/canonical target mismatch', path: lexical, canonical });
    }
    if (lexical === join(contextRoot, forbiddenRoot)) violations.push({ reason: 'other harness root read', path: lexical });
  };
  for (const attempt of shellAttempts(trace)) {
    if (!attempt.success) {
      const failedPath = attempt.failure && attempt.kind === 'read'
        ? resolve(contextRoot, attempt.path) : null;
      if (failedPath && recoveredFailure(failedPath, attempt.result_index)) {
        reads.push({ path: failedPath, source: attempt.source, failed: true });
        continue;
      }
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

  const toolResults = claudeToolResults(trace).results;
  for (const [index, entry] of trace.entries()) {
    if (!isContextTool(entry)) continue;
    if (entry.name === 'Bash') continue;
    if (isClaudeAppActionUse(entry) && approvedActionIndices.has(index)) continue;
    if (entry.name !== 'Read') {
      violations.push({ reason: 'unclassified tool use', name: entry.name });
      continue;
    }
    const result = toolResults.get(entry.id);
    const inputPath = entry.input?.file_path || '';
    if (!result || result.is_error === true) {
      const failedPath = result?.is_error === true ? resolve(contextRoot, inputPath) : null;
      if (failedPath && recoveredFailure(failedPath, result.result_index)) {
        reads.push({ path: failedPath, source: 'claude', failed: true });
        continue;
      }
      violations.push({ reason: 'failed Read tool', path: resolve(contextRoot, inputPath) });
    }
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

const SELECTED_INPUT_MODE_VALIDATOR = String.raw`
import hashlib, json, sys, yaml

class UniqueKeyLoader(yaml.SafeLoader):
    pass

def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError("duplicate key")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result

UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
source_path, view_path, key = sys.argv[1:]
try:
    source_bytes = open(source_path, "rb").read()
    source = yaml.load(source_bytes.decode("utf-8"), Loader=UniqueKeyLoader)
    if not isinstance(source, dict) or set(source) != {"version", "principle", "skills", "governance_tools"}:
        raise ValueError("top level")
    if type(source["version"]) is not int or source["version"] != 1 or not isinstance(source["principle"], str) or not source["principle"].strip():
        raise ValueError("global")
    groups = {name: source[name] for name in ("skills", "governance_tools")}
    if any(not isinstance(group, dict) for group in groups.values()):
        raise ValueError("groups")
    if set(groups["skills"]) & set(groups["governance_tools"]):
        raise ValueError("overlap")
    expected_keys = {
        "auto", "handoff", "wait-what", "domain-modeling", "writing-for-agents", "magicpath",
        "open-design", "idea", "deepresearch", "quick-research", "brainstorm",
        "superpowers-brainstorming", "ux-research", "ux-brainstorm", "design-brief",
        "html-prototype", "figma-demo", "tech-spec", "task-plan", "grilling", "diagnosing-bugs",
        "resolving-merge-conflicts", "to-spec", "to-tickets", "wayfinder", "implement",
        "code-hygiene", "code-review", "codebase-design", "code-recon", "muse-req-triage",
        "insight-synthesis", "research-kit", "ux-writing", "compare", "ux-audit", "redteam",
        "evals", "retro",
    }
    if set(groups["skills"]) | set(groups["governance_tools"]) != expected_keys:
        raise ValueError("key set")
    hits = [name for name, group in groups.items() if key in group]
    if len(hits) != 1:
        raise ValueError("binding")
    group = hits[0]
    contract = groups[group][key]
    if not isinstance(contract, dict) or not contract:
        raise ValueError("contract")
except Exception:
    print("SOURCE_INVALID")
    raise SystemExit(3)

expected = {
    "schema_version": 1,
    "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
    "skill": key,
    "group": group,
    "global": {"version": source["version"], "principle": source["principle"]},
    "contract": contract,
}
def unique_json_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result
try:
    with open(view_path, encoding="utf-8") as handle:
        actual = json.load(handle, object_pairs_hook=unique_json_object)
except Exception:
    print("STALE")
    raise SystemExit(4)
def exact_equal(actual_value, expected_value):
    if type(actual_value) is not type(expected_value):
        return False
    if isinstance(expected_value, dict):
        return set(actual_value) == set(expected_value) and all(
            exact_equal(actual_value[name], expected_value[name]) for name in expected_value
        )
    if isinstance(expected_value, list):
        return len(actual_value) == len(expected_value) and all(
            exact_equal(actual_item, expected_item)
            for actual_item, expected_item in zip(actual_value, expected_value)
        )
    return actual_value == expected_value
if not exact_equal(actual, expected):
    print("STALE")
    raise SystemExit(4)
print("HEALTHY")
`;

const inputModeStateCache = new Map();
function selectedInputModeState(fixture, contextRoot = root) {
  const key = fixture.selectedInputModeKey;
  if (key === undefined) return null;
  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]*$/.test(key)) {
    return { status: 'INVALID', reason: 'invalid selected input-mode key', target: null };
  }
  const target = `.claude/skill-os/generated/input-modes/${key}.json`;
  if (!(fixture.targets || []).includes(target)) {
    return { status: 'INVALID', reason: 'selected input-mode target is not fixture-bound', target };
  }
  if (!regularContextTarget(WORKFLOW_MODE, contextRoot)) {
    return { status: 'INVALID', reason: 'workflow-mode owner is not canonical', target };
  }
  const ownerLinks = [...readFileSync(join(contextRoot, WORKFLOW_MODE), 'utf8').matchAll(/`([^`\r\n]+)`/g)]
    .map((match) => match[1]);
  if (!ownerLinks.includes(INPUT_MODE_VIEW_TEMPLATE)) {
    return { status: 'INVALID', reason: 'workflow-mode owner lacks the exact selected-view template', target };
  }
  if (!regularContextTarget(INPUT_MODE_SOURCE, contextRoot)) {
    return { status: 'INVALID', reason: 'input-mode source is not canonical', target };
  }
  const viewPath = join(contextRoot, target);
  let sourceBytes;
  try {
    sourceBytes = readFileSync(join(contextRoot, INPUT_MODE_SOURCE));
  } catch { return { status: 'INVALID', reason: 'input-mode source is unreadable', target }; }
  let viewBytes = null;
  let viewState = 'READABLE';
  let viewReadError = null;
  if (!existsSync(viewPath)) viewState = 'MISSING';
  else if (!regularContextTarget(target, contextRoot)) {
    return { status: 'INVALID', reason: 'selected view is not a canonical regular file', target };
  } else {
    try { viewBytes = readFileSync(viewPath); }
    catch (error) {
      if (!TRUSTED_READ_ERRORS.has(error.code)) {
        return { status: 'INVALID', reason: 'selected view validation failed', target };
      }
      viewState = 'UNREADABLE';
      viewReadError = error.code;
    }
  }
  const viewIdentity = viewBytes === null ? `${viewState}:${viewReadError || ''}` : sha256(viewBytes);
  const cacheKey = `${realpathSync(contextRoot)}\0${key}\0${sha256(sourceBytes)}\0${viewIdentity}`;
  if (!inputModeStateCache.has(cacheKey)) {
    const checked = spawnSync('python3', ['-c', SELECTED_INPUT_MODE_VALIDATOR,
      join(contextRoot, INPUT_MODE_SOURCE), viewPath, key], {
      cwd: contextRoot, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024,
    });
    inputModeStateCache.set(cacheKey, { status: checked.status });
  }
  const checked = inputModeStateCache.get(cacheKey);
  if (checked.status === 3 || ![0, 4].includes(checked.status)) {
    return { status: 'INVALID', reason: 'input-mode source or validator is invalid', target };
  }
  if (viewState === 'MISSING') return { status: 'MISSING', reason: 'selected view is missing', target };
  if (viewState === 'UNREADABLE') return { status: 'UNREADABLE',
    reason: `selected view read failed: ${viewReadError}`, read_error_code: viewReadError, target };
  return checked.status === 0 ? { status: 'HEALTHY', reason: 'source-bound semantic match', target }
    : { status: 'STALE', reason: 'selected view differs from source semantics', target };
}

function admitContractEdges(targets, fixture, contextRoot = root) {
  for (const edge of fixture.contractEdges || []) {
    if (!Array.isArray(edge) || edge.length !== 2) continue;
    const [owner, target] = edge;
    if (!targets.has(owner) || !(fixture.targets || []).includes(target)
        || !regularContextTarget(owner, contextRoot)) continue;
    if (/^\.claude\/skill-os\/generated\/input-modes\//.test(target)) {
      const state = selectedInputModeState(fixture, contextRoot);
      if (owner === WORKFLOW_MODE && state?.status === 'HEALTHY' && state.target === target) targets.add(target);
      continue;
    }
    if (!regularContextTarget(target, contextRoot)) continue;
    const links = [...readFileSync(join(contextRoot, owner), 'utf8').matchAll(/`([^`\r\n]+)`/g)]
      .map((match) => match[1]);
    if (links.includes(target)) targets.add(target);
  }
}

function reachableContextTargets(fixture = {}, contextRoot = root) {
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const targets = new Set([ownRoot, 'CONTEXT.md']);
  const addRegular = (candidate) => {
    if (regularContextTarget(candidate, contextRoot)) targets.add(candidate);
  };
  // Both files are mandatory startup owners; permit their explicit edges, never recursive traversal.
  for (const owner of [ownRoot, 'CONTEXT.md']) {
    const text = readFileSync(join(contextRoot, owner), 'utf8');
    for (const match of text.matchAll(/`([^`]+)`/g)) addRegular(match[1]);
  }
  const manifestPath = join(contextRoot, '.claude/skill-os/agent-context-manifest.json');
  if (existsSync(manifestPath)) {
    addRegular('.claude/skill-os/agent-context-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const entry of manifest.entries || []) addRegular(entry.target);
  }
  if (existsSync(join(contextRoot, CONTEXT_INDEX))) addRegular(CONTEXT_INDEX);
  const catalogPath = join(contextRoot, '.claude/skill-os/generated/skill-catalog.md');
  if (existsSync(catalogPath)) {
    addRegular('.claude/skill-os/generated/skill-catalog.md');
    const catalog = readFileSync(catalogPath, 'utf8');
    for (const match of catalog.matchAll(/^\| `[^`]+` \|[^\n]*\| `([^`]+)` \|$/gm)) addRegular(match[1]);
  }
  // Only fixture-declared ordered edges may extend the startup graph; never traverse neighbours.
  admitContractEdges(targets, fixture, contextRoot);
  return [...targets].sort();
}

function sharedScopeAudit(trace, contextRoot = root, actionAudit = null) {
  const violations = [];
  const unknown = [];
  const approvedActionIndices = new Set(actionAudit?.approved_trace_indices || []);
  const checkPath = (path) => {
    if (typeof path !== 'string' || !path) { violations.push('missing read path'); return; }
    const absolute = resolve(contextRoot, path);
    const rel = relative(contextRoot, absolute);
    if (!rel || rel === '..' || rel.startsWith('../') || rel.split('/').includes('docs')
        || /(?:^|\/)(?:workflow-state\.yaml|current-topic\.txt)$/.test(rel)) {
      violations.push(`read outside shared scope: ${path}`);
      return;
    }
    try {
      if (lstatSync(absolute).isSymbolicLink() || realpathSync(absolute) !== join(realpathSync(contextRoot), rel)) {
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
  for (const [index, entry] of trace.entries()) {
    if (!isContextTool(entry)) continue;
    if (entry.name === 'Read') checkPath(entry.input?.file_path);
    else if (isClaudeAppActionUse(entry) && approvedActionIndices.has(index)) continue;
    else if (entry.name !== 'Bash') unknown.push(entry.name);
  }
  for (const issue of codexCommandEvidence(trace).issues) unknown.push(issue);
  for (const [index, entry] of trace.entries()) {
    if (entry.type === 'unclassified_activity') unknown.push(entry);
    if (entry.type === 'app_action' && !approvedActionIndices.has(index)) unknown.push(entry);
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

function g5TreeSnapshot(cwd) {
  const snapshot = {};
  const visit = (path) => {
    const stat = lstatSync(path);
    const rel = relative(cwd, path) || '.';
    if (stat.isSymbolicLink()) {
      snapshot[rel] = { kind: 'symlink', link_target: readlinkSync(path), mode: stat.mode };
    } else if (stat.isFile()) {
      const bytes = readFileSync(path);
      snapshot[rel] = { kind: 'file', sha256: sha256(bytes), size: bytes.length, mode: stat.mode };
    } else if (stat.isDirectory()) {
      snapshot[rel] = { kind: 'directory', mode: stat.mode };
      for (const name of readdirSync(path).sort()) visit(join(path, name));
    } else throw new Error(`G5 snapshot refuses special filesystem entry: ${rel}`);
  };
  visit(cwd);
  return snapshot;
}

function g5Isolation(fixture) {
  const cellId = g5Cell?.cell_id || 'offline-self-test';
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), `agent-context-g5-${cellId}-`)));
  const effectRoot = realpathSync(mkdtempSync(join(tmpdir(), `agent-context-g5-effect-${cellId}-`)));
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const paths = new Set([ownRoot, 'CONTEXT.md', ...fixture.targetsByArm[arm]]);
  for (const rel of [
    'memory/scripts/get_memory.py', 'memory/scripts/_memroot.py',
    'memory/episodic/index.jsonl', 'memory/semantic/promoted-facts.yaml', 'memory/evals/eval-log.jsonl',
  ]) paths.add(rel);
  paths.delete(otherRoot);
  paths.delete(harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md');
  const originals = new Map();
  try {
    for (const rel of paths) {
      const source = resolve(root, rel);
      const inside = relative(root, source);
      assert.ok(inside && inside !== '..' && !inside.startsWith('../'), `G5 target escapes root: ${rel}`);
      assert.ok(existsSync(source) && lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink(),
        `G5 target must be a regular in-root file: ${rel}`);
      const bytes = readFileSync(source);
      const destination = join(cwd, inside);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
      originals.set(inside, bytes);
    }
    return { cwd, effectRoot, originals, initial: g5TreeSnapshot(cwd), effect: null,
      cleanup: () => {
        rmSync(cwd, { recursive: true, force: true });
        rmSync(effectRoot, { recursive: true, force: true });
      } };
  } catch (error) {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(effectRoot, { recursive: true, force: true });
    throw error;
  }
}

function g5IsolationSnapshot(isolation) {
  return { context: g5TreeSnapshot(isolation.cwd), effect: g5TreeSnapshot(isolation.effectRoot) };
}

function g5WriteSeed(path, body = '') {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

function g5SpawnSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout || 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { command, args, status: result.status, signal: result.signal,
    stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message || null };
}

async function g5WithProcessEnv(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  try { return await callback(); }
  finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function g5ProjectEnv(effect) {
  return {
    CLAUDE_PROJECT_DIR: effect.gstack,
    LUCA_GSTACK_ROOT: effect.gstack,
    LUCA_PROJECTS_ROOT: effect.projects,
    LUCA_ACTUAL_HARNESS: 'claude',
    LUCA_EVENT_ATTESTATION_TEST: '1',
    ROUTE_GUARD_PROJECTS: 'alpha,beta',
    ROUTE_GUARD_CURRENT_PROJECT: effect.boundProject || '',
  };
}

function g5MakeProject(effect, name, canary) {
  const project = join(effect.projects, name);
  g5WriteSeed(join(project, 'docs', 'canary.txt'), `${canary}\n`);
  g5WriteSeed(join(project, '.luca', 'workflow-state.yaml'), `mode: workflow\ntopic: "${name}"\nnodes: {}\n`);
  g5WriteSeed(join(project, '.luca', 'current-topic.txt'), `${name}\n`);
  g5WriteSeed(join(project, '.luca', 'memory', 'MEMORY.md'), `# ${name}\n`);
  g5WriteSeed(join(project, 'CONTEXT.md'), `# ${name}\n`);
  return project;
}

async function g5SeedProjectHarness(effect) {
  effect.gstack = join(effect.root, 'gstack');
  effect.projects = join(effect.root, 'projects');
  effect.transcripts = join(effect.root, 'transcripts');
  effect.replaySession = `g5fx-${String(g5Cell?.ordinal || 0).padStart(2, '0')}-${harness}`;
  effect.transcript = join(effect.transcripts, `${effect.replaySession}.jsonl`);
  mkdirSync(effect.projects, { recursive: true });
  mkdirSync(effect.transcripts, { recursive: true });
  g5WriteSeed(join(effect.gstack, '.claude', 'templates', 'workflow-state.yaml'), 'mode: workflow\ntopic: ""\nnodes: {}\n');
  mkdirSync(join(effect.gstack, '.claude', 'skill-os'), { recursive: true });
  cpSync(join(root, '.claude', 'skill-os', 'skill-routing-map.yaml'),
    join(effect.gstack, '.claude', 'skill-os', 'skill-routing-map.yaml'));
  if (existsSync(join(root, '.claude', 'observability', 'rules.yaml'))) {
    mkdirSync(join(effect.gstack, '.claude', 'observability'), { recursive: true });
    cpSync(join(root, '.claude', 'observability', 'rules.yaml'),
      join(effect.gstack, '.claude', 'observability', 'rules.yaml'));
  }
  const alphaCanary = sha256(`${g5Cell?.task_seed || 'offline'}:alpha`);
  const betaCanary = sha256(`${g5Cell?.task_seed || 'offline'}:beta`);
  effect.alpha = g5MakeProject(effect, 'alpha', alphaCanary);
  effect.beta = g5MakeProject(effect, 'beta', betaCanary);
  effect.alphaCanarySha256 = sha256(readFileSync(join(effect.alpha, 'docs', 'canary.txt')));
  effect.betaCanarySha256 = sha256(readFileSync(join(effect.beta, 'docs', 'canary.txt')));
  g5WriteSeed(effect.transcript, `${JSON.stringify({ type: 'system', sessionId: effect.replaySession })}\n`);
  effect.substrate = await import(pathToFileURL(join(root, '.claude', 'hooks', 'lib', 'project-substrate.mjs')).href);
  effect.projectPin = await import(pathToFileURL(join(root, 'scripts', 'project-pin.mjs')).href);
  await g5WithProcessEnv(g5ProjectEnv(effect), async () => effect.substrate.initializeProjectEventFence({
    gstackRoot: effect.gstack, projectsRoot: effect.projects, sessionId: effect.replaySession,
    harness: 'claude', cwd: effect.gstack, transcriptPath: effect.transcript,
  }));
}

function g5AppendReplayTurn(effect, prompt) {
  appendFileSync(effect.transcript, `${JSON.stringify({
    type: 'user', uuid: randomUUID(), sessionId: effect.replaySession, cwd: effect.gstack,
    userType: 'external', isSidechain: false, isMeta: false,
    origin: { kind: 'human' }, promptSource: 'typed', message: { role: 'user', content: prompt },
  })}\n`);
}

async function g5RouteAndAttest(effect, prompt) {
  g5AppendReplayTurn(effect, prompt);
  const hookPath = join(root, '.claude', 'hooks', 'route-guard.mjs');
  const payload = { session_id: effect.replaySession, prompt_id: effect.replaySession,
    cwd: effect.gstack, transcript_path: effect.transcript, prompt };
  const hookInput = JSON.stringify(payload);
  const hook = g5SpawnSync(process.execPath, [hookPath], {
    cwd: effect.gstack, env: g5ProjectEnv(effect), input: hookInput,
  });
  assert.equal(hook.status, 0, `G5 route-guard failed: ${hook.stderr || hook.stdout}`);
  const attested = await g5WithProcessEnv(g5ProjectEnv(effect), async () =>
    effect.substrate.attestPendingProjectEvent({
      gstackRoot: effect.gstack, projectsRoot: effect.projects, sessionId: effect.replaySession,
      boundaryId: effect.replaySession, cwd: effect.gstack, observation: 'pre-tool',
      transcriptPath: effect.transcript,
    }));
  return {
    transport: 'HERMETIC_HOOK_REPLAY', hook_kind: 'UserPromptSubmit/route-guard',
    hook_script_sha256: sha256(readFileSync(hookPath)), hook_input_sha256: sha256(hookInput),
    hook_exit: hook.status, hook_stdout_sha256: sha256(hook.stdout),
    event_id: attested.event?.event_id || null, state: attested.state,
  };
}

async function g5ProjectSwitch(effect) {
  const statePath = join(effect.gstack, '.claude', `.session-project-${effect.replaySession}`);
  const before = existsSync(statePath) ? sha256(readFileSync(statePath)) : null;
  const route = await g5RouteAndAttest(effect, '切换到已存在的 alpha 项目；本轮只切换。');
  assert.equal(route.state.state, 'SWITCH_ONLY', 'G5 route hook did not create SWITCH_ONLY');
  const proposal = route.state.switch;
  assert.equal(proposal?.target, 'alpha', 'G5 route hook targeted a foreign project');
  const transaction = g5SpawnSync('bash', [join(root, 'scripts', 'project.sh'), 'switch', 'alpha',
    '--session-id', effect.replaySession, '--tx', proposal.tx,
    '--expected-epoch', String(proposal.expected_epoch)], {
    cwd: effect.gstack, env: g5ProjectEnv(effect),
  });
  assert.equal(transaction.status, 0, `G5 project transaction failed: ${transaction.stderr || transaction.stdout}`);
  const state = effect.substrate.readProjectState(effect.gstack, effect.replaySession, effect.projects).value;
  const binding = effect.substrate.validatedBindingForState(state, effect.projects);
  assert.equal(state.state, 'BOUND', 'G5 project transaction did not end BOUND');
  assert.equal(binding.project, 'alpha', 'G5 project transaction bound a foreign project');
  effect.boundProject = 'alpha';
  effect.lastSwitch = { proposal, state, binding };
  return { primitive: 'project-switch-alpha', route, transaction_exit: transaction.status,
    transaction_stdout_sha256: sha256(transaction.stdout), authority_state_before_sha256: before,
    authority_state_after_sha256: sha256(readFileSync(statePath)), canonical_target_relative: 'projects/alpha',
    confined_under_effect_root: true, result: 'SWITCHED_TERMINAL' };
}

async function g5BeginProjectTurn(effect, label) {
  const route = await g5RouteAndAttest(effect, `继续 alpha：${label}`);
  assert.equal(route.state.state, 'TURN_ACTIVE', 'G5 project continuation did not create TURN_ACTIVE');
  const binding = effect.substrate.validatedBindingForState(route.state, effect.projects);
  assert.equal(binding.project, 'alpha', 'G5 project continuation changed binding');
  return route;
}

function g5ScopeHook(effect, toolName, toolInput) {
  const hookPath = join(root, '.claude', 'hooks', 'project-scope-guard.mjs');
  const payload = { session_id: effect.replaySession, prompt_id: effect.replaySession,
    cwd: effect.gstack, transcript_path: effect.transcript, tool_name: toolName, tool_input: toolInput };
  const hookInput = JSON.stringify(payload);
  const hook = g5SpawnSync(process.execPath, [hookPath], {
    cwd: effect.gstack, env: g5ProjectEnv(effect), input: hookInput,
  });
  assert.equal(hook.status, 0, `G5 scope guard failed: ${hook.stderr || hook.stdout}`);
  const response = hook.stdout.trim() ? JSON.parse(hook.stdout) : null;
  const specific = response?.hookSpecificOutput || {};
  assert.notEqual(specific.permissionDecision, 'deny', `G5 scope guard denied declared primitive: ${specific.permissionDecisionReason}`);
  assert.ok(specific.updatedInput, 'G5 scope guard did not provide a canonical updatedInput');
  return { updatedInput: specific.updatedInput, receipt: {
    transport: 'HERMETIC_HOOK_REPLAY', hook_kind: 'PreToolUse/project-scope-guard',
    hook_script_sha256: sha256(readFileSync(hookPath)), hook_input_sha256: sha256(hookInput),
    hook_exit: hook.status, permission_decision: specific.permissionDecision || 'allow-with-rewrite',
    updated_input_sha256: sha256(JSON.stringify(specific.updatedInput)),
  } };
}

function g5DeniedScopeProbe(effect, label, sessionId, toolInput) {
  const hookPath = join(root, '.claude', 'hooks', 'project-scope-guard.mjs');
  const payload = { session_id: sessionId, prompt_id: sessionId,
    cwd: effect.gstack, transcript_path: effect.transcript, tool_name: 'Read', tool_input: toolInput };
  const hookInput = JSON.stringify(payload);
  const hook = g5SpawnSync(process.execPath, [hookPath], {
    cwd: effect.gstack, env: g5ProjectEnv(effect), input: hookInput,
  });
  assert.equal(hook.status, 0, `G5 ${label} scope probe crashed: ${hook.stderr || hook.stdout}`);
  const response = hook.stdout.trim() ? JSON.parse(hook.stdout) : null;
  const specific = response?.hookSpecificOutput || {};
  assert.equal(specific.permissionDecision, 'deny', `G5 ${label} scope probe was not denied`);
  return { label, transport: 'HERMETIC_HOOK_REPLAY', hook_kind: 'PreToolUse/project-scope-guard',
    hook_script_sha256: sha256(readFileSync(hookPath)), hook_input_sha256: sha256(hookInput),
    hook_exit: hook.status, permission_decision: specific.permissionDecision,
    permission_reason_sha256: sha256(String(specific.permissionDecisionReason || '')), result: 'DENIED' };
}

function g5RunT4DenialProbes(effect) {
  const proposal = effect.lastSwitch?.proposal;
  assert.ok(proposal, 'G5 T4 denial probes lack the consumed switch transaction');
  const replay = g5SpawnSync('bash', [join(root, 'scripts', 'project.sh'), 'switch', 'alpha',
    '--session-id', effect.replaySession, '--tx', proposal.tx,
    '--expected-epoch', String(proposal.expected_epoch)], {
    cwd: effect.gstack, env: g5ProjectEnv(effect),
  });
  assert.notEqual(replay.status, 0, 'G5 T4 consumed transaction replay was accepted');
  const probes = [{ label: 'consumed-transaction', transaction_exit: replay.status,
    stderr_sha256: sha256(replay.stderr), result: 'DENIED' }];
  probes.push(g5DeniedScopeProbe(effect, 'foreign-beta-path', effect.replaySession,
    { file_path: join(effect.beta, 'docs', 'canary.txt') }));
  probes.push(g5DeniedScopeProbe(effect, 'wrong-session', `${effect.replaySession}-foreign`,
    { file_path: join(effect.alpha, 'docs', 'canary.txt') }));
  effect.guard_probes.push(...probes);
  return probes;
}

async function initializeG5EffectHarness(fixture, isolation, nativeSessionId) {
  if (isolation.effect) return isolation.effect;
  const effect = { root: isolation.effectRoot, task: fixture.task, nativeSessionId,
    receipts: [], guard_probes: [], prelude_receipts: [], protected: {} };
  isolation.effect = effect;
  if (['T4', 'T5', 'T7'].includes(fixture.task)) await g5SeedProjectHarness(effect);
  if (fixture.task === 'T5') {
    effect.prelude_receipts.push(await g5ProjectSwitch(effect));
    const output = join(effect.alpha, 'docs', 'design-brief', 'output.md');
    const oldHandoff = join(effect.alpha, 'docs', 'handoff', 'old-node-handoff.md');
    g5WriteSeed(output, '# Frozen design brief output\nTRACE=G5-T5\n');
    g5WriteSeed(oldHandoff, '# Old node handoff\ngate_result: PASS\ncriteria:\n  - "[C1] old → PASS（证据: old）"\n  - "[C2] old → PASS（证据: old）"\n  - "[C3] old → PASS（证据: old）"\n\n## 核心决策\n- old\n\n## 核心约束\n- old\n\n## 风险\n- old\n\n## 产出路径\n- old\n');
    effect.outputPath = output;
    effect.handoffPath = join(effect.alpha, 'docs', 'handoff', 'design-brief-handoff.md');
    effect.protected.output = sha256(readFileSync(output));
    effect.protected.old_handoff = sha256(readFileSync(oldHandoff));
    effect.protected.workflow = sha256(readFileSync(join(effect.alpha, '.luca', 'workflow-state.yaml')));
  } else if (fixture.task === 'T6') {
    const repo = join(effect.root, 'memory-repo');
    effect.memoryRoot = repo;
    for (const rel of ['memory/scripts/search_memory.py', 'memory/scripts/propose_semantic.py',
      'memory/scripts/consolidate_memory.py', 'memory/scripts/_memroot.py',
      '.claude/observability/scripts/write_observation.py']) {
      const destination = join(repo, rel);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, rel), destination);
    }
    g5WriteSeed(join(repo, 'memory', 'semantic', 'promoted-facts.yaml'), 'facts: []\n');
    g5WriteSeed(join(repo, 'memory', 'semantic', 'candidates.jsonl'), '');
    g5WriteSeed(join(repo, 'memory', 'episodic', 'index.jsonl'), '');
    g5WriteSeed(join(repo, 'memory', 'evals', 'eval-log.jsonl'), '');
    g5WriteSeed(join(repo, 'memory', 'retrieval-log.jsonl'), '');
    g5WriteSeed(join(repo, '.claude', 'observability', 'observations.jsonl'), '');
    g5WriteSeed(join(repo, '.claude', 'observability', 'rules.yaml'), 'rules: []\n');
    g5WriteSeed(join(repo, 'g5-input', 'learning-signal.json'), JSON.stringify({
      domain: 'skill-rule', fact: 'G5 fixture future rule requires a fresh authority read.',
      correction: 'Attribute the rule to the framework source before proposing it.',
    }));
    effect.protected.promoted = sha256(readFileSync(join(repo, 'memory', 'semantic', 'promoted-facts.yaml')));
    effect.protected.rules = sha256(readFileSync(join(repo, '.claude', 'observability', 'rules.yaml')));
  } else if (fixture.task === 'T7') {
    const old = await g5ProjectSwitch(effect);
    effect.oldAuthority = old;
    const deactivate = g5SpawnSync('bash', [join(root, 'scripts', 'project.sh'), 'deactivate', effect.replaySession], {
      cwd: effect.gstack, env: g5ProjectEnv(effect),
    });
    assert.equal(deactivate.status, 0, `G5 T7 prelude deactivate failed: ${deactivate.stderr || deactivate.stdout}`);
    effect.boundProject = '';
    effect.prelude_receipts.push(old, { primitive: 'deactivate-to-no-pin',
      transaction_exit: deactivate.status, result: 'NO_PIN' });
  }
  effect.seedSnapshot = g5TreeSnapshot(effect.root);
  return effect;
}

function g5ExpectedActions(fixture, turnIndex) {
  return (fixture.effectContract.allowed || []).filter((entry) => entry.turn === turnIndex + 1)
    .map((entry) => entry.primitive);
}

async function executeG5EffectPrimitive(fixture, turnIndex, primitive, isolation) {
  const effect = isolation.effect;
  if (primitive === 'project-switch-alpha') return g5ProjectSwitch(effect);
  if (primitive === 'project-read-alpha-canary') {
    const route = await g5BeginProjectTurn(effect, '读取 canary');
    const scoped = g5ScopeHook(effect, 'Read', { file_path: 'docs/canary.txt' });
    const path = scoped.updatedInput.file_path;
    assert.equal(realpathSync(path), realpathSync(join(effect.alpha, 'docs', 'canary.txt')),
      'G5 canary read escaped canonical alpha');
    const bytes = readFileSync(path);
    assert.equal(sha256(bytes), effect.alphaCanarySha256, 'G5 alpha canary readback mismatch');
    assert.notEqual(sha256(bytes), effect.betaCanarySha256, 'G5 alpha and beta canaries collided');
    return { primitive, route, ...scoped.receipt, canonical_target_relative: 'projects/alpha/docs/canary.txt',
      confined_under_effect_root: true, readback_sha256: sha256(bytes), result: 'READBACK_MATCH' };
  }
  if (primitive === 'check-design-brief-handoff') {
    await g5BeginProjectTurn(effect, '检查 design-brief handoff');
    const scoped = g5ScopeHook(effect, 'Read', { file_path: 'docs/handoff/design-brief-handoff.md' });
    const check = g5SpawnSync(process.execPath, [join(root, 'scripts', 'check-quality-gates.mjs'),
      '--handoff', scoped.updatedInput.file_path], { cwd: effect.gstack, env: g5ProjectEnv(effect) });
    assert.notEqual(check.status, 0, 'G5 missing handoff was incorrectly accepted');
    return { primitive, ...scoped.receipt, checker_exit: check.status,
      checker_stderr_sha256: sha256(check.stderr), result: 'MISSING_REJECTED' };
  }
  if (primitive === 'write-design-brief-handoff') {
    await g5BeginProjectTurn(effect, '写入 design-brief handoff');
    const scoped = g5ScopeHook(effect, 'Write', { file_path: 'docs/handoff/design-brief-handoff.md', content: '' });
    assert.equal(resolve(scoped.updatedInput.file_path), effect.handoffPath, 'G5 handoff write path mismatch');
    const outputSha = sha256(readFileSync(effect.outputPath));
    const body = `# Design Brief Handoff\ngate_result: PASS\ncriteria:\n  - "[C1] output bound → PASS（证据: ${outputSha}）"\n  - "[C2] node exact → PASS（证据: design-brief）"\n  - "[C3] readback required → PASS（证据: pending host readback）"\n\n## 核心决策\n- exact node design-brief\n\n## 核心约束\n- output_sha256=${outputSha}\n\n## 风险\n- isolated fixture only\n\n## 产出路径\n- docs/design-brief/output.md\n`;
    writeFileSync(effect.handoffPath, body, { flag: 'wx' });
    return { primitive, ...scoped.receipt, canonical_target_relative: 'projects/alpha/docs/handoff/design-brief-handoff.md',
      confined_under_effect_root: true, before_sha256: null,
      after_sha256: sha256(readFileSync(effect.handoffPath)), result: 'CREATED' };
  }
  if (primitive === 'readback-design-brief-handoff') {
    const scoped = g5ScopeHook(effect, 'Read', { file_path: 'docs/handoff/design-brief-handoff.md' });
    const bytes = readFileSync(scoped.updatedInput.file_path);
    const check = g5SpawnSync(process.execPath, [join(root, 'scripts', 'check-quality-gates.mjs'),
      '--handoff', scoped.updatedInput.file_path], { cwd: effect.gstack, env: g5ProjectEnv(effect) });
    assert.equal(check.status, 0, `G5 handoff readback failed validation: ${check.stderr || check.stdout}`);
    return { primitive, ...scoped.receipt, checker_exit: check.status,
      readback_sha256: sha256(bytes), result: 'VALIDATED_READBACK' };
  }
  if (primitive === 'query-semantic-duplicate') {
    const script = join(effect.memoryRoot, 'memory', 'scripts', 'search_memory.py');
    const query = g5SpawnSync('python3', [script, 'G5 fixture future rule fresh authority',
      '--layer', 'semantic', '--limit', '5', '--json'], {
      cwd: effect.memoryRoot, env: { MEMORY_ROOT: effect.memoryRoot },
    });
    assert.equal(query.status, 0, `G5 semantic duplicate query failed: ${query.stderr}`);
    const rows = JSON.parse(query.stdout || '[]');
    assert.ok(Array.isArray(rows) && rows.length === 0, 'G5 semantic seed unexpectedly duplicated the candidate');
    return { primitive, script_sha256: sha256(readFileSync(script)), stdout_sha256: sha256(query.stdout),
      result: 'NO_DUPLICATE' };
  }
  if (primitive === 'write-observation') {
    const script = join(effect.memoryRoot, '.claude', 'observability', 'scripts', 'write_observation.py');
    const write = g5SpawnSync('python3', [script, '--skill', 'framework-maintenance',
      '--message', 'G5 fixture future rule requires a fresh authority read.',
      '--problem', 'stale authority could be reused', '--correction', 'attribute and reread before action',
      '--severity', 'medium', '--source', 'g5_fixture'], {
      cwd: effect.memoryRoot, env: { MEMORY_ROOT: effect.memoryRoot },
    });
    assert.equal(write.status, 0, `G5 observation writer failed: ${write.stderr}`);
    return { primitive, script_sha256: sha256(readFileSync(script)), stdout_sha256: sha256(write.stdout),
      result: 'OBSERVATION_APPENDED' };
  }
  if (primitive === 'propose-semantic-candidate') {
    const script = join(effect.memoryRoot, 'memory', 'scripts', 'propose_semantic.py');
    const propose = g5SpawnSync('python3', [script, '--domain', 'skill-rule',
      '--fact', 'G5 fixture future rule requires a fresh authority read.', '--confidence', 'medium',
      '--source', 'g5_fixture', '--evidence', 'isolated observation', '--scope', 'framework'], {
      cwd: effect.memoryRoot, env: { MEMORY_ROOT: effect.memoryRoot },
    });
    assert.equal(propose.status, 0, `G5 semantic proposer failed: ${propose.stderr}`);
    return { primitive, script_sha256: sha256(readFileSync(script)), stdout_sha256: sha256(propose.stdout),
      result: 'CANDIDATE_APPENDED' };
  }
  if (primitive === 'write-no-pin-checkpoint') {
    const path = join(effect.root, 'checkpoints', `${g5Cell?.cell_id || 'offline'}.json`);
    const body = `${JSON.stringify({ suite: G5_SUITE_VERSION, cell_id: g5Cell?.cell_id || 'offline',
      project_binding: 'NO_PIN', native_session_sha256: sha256(effect.nativeSessionId) })}\n`;
    g5WriteSeed(path, body);
    effect.checkpointPath = path;
    return { primitive, canonical_target_relative: relative(effect.root, path), confined_under_effect_root: true,
      before_sha256: null, after_sha256: sha256(readFileSync(path)), result: 'CHECKPOINT_WRITTEN' };
  }
  if (primitive === 'create-authorized-scratch') {
    await g5BeginProjectTurn(effect, '创建获批 scratch');
    const scoped = g5ScopeHook(effect, 'Write', { file_path: 'docs/g5-authorized-scratch.txt', content: '' });
    const path = scoped.updatedInput.file_path;
    const body = `authorized:${g5Cell?.task_seed || 'offline'}\n`;
    writeFileSync(path, body, { flag: 'wx' });
    effect.scratchPath = path;
    return { primitive, ...scoped.receipt, canonical_target_relative: 'projects/alpha/docs/g5-authorized-scratch.txt',
      confined_under_effect_root: true, before_sha256: null, after_sha256: sha256(readFileSync(path)), result: 'CREATED' };
  }
  if (primitive === 'readback-authorized-scratch') {
    const scoped = g5ScopeHook(effect, 'Read', { file_path: 'docs/g5-authorized-scratch.txt' });
    const bytes = readFileSync(scoped.updatedInput.file_path);
    assert.equal(resolve(scoped.updatedInput.file_path), effect.scratchPath, 'G5 scratch readback path mismatch');
    return { primitive, ...scoped.receipt, readback_sha256: sha256(bytes), result: 'READBACK_MATCH' };
  }
  throw new Error(`G5 unknown effect primitive: ${primitive}`);
}

async function applyG5RequestedEffects(fixture, turnIndex, turn, isolation) {
  const expected = g5ExpectedActions(fixture, turnIndex);
  const requested = turn.answer?.claims?.action_requests || [];
  assert.deepEqual(requested, expected, `G5 ${fixture.task}.${turnIndex + 1} action request mismatch`);
  const receipts = [];
  for (const primitive of requested) {
    const before = g5TreeSnapshot(isolation.effectRoot);
    const receipt = await executeG5EffectPrimitive(fixture, turnIndex, primitive, isolation);
    const after = g5TreeSnapshot(isolation.effectRoot);
    receipts.push({ cell_id: g5Cell?.cell_id || 'offline', turn_id: fixture.turns[turnIndex].id,
      model_requested: true, request_sha256: sha256(JSON.stringify({ primitive })),
      path_delta: Object.keys({ ...before, ...after }).filter((path) =>
        JSON.stringify(before[path]) !== JSON.stringify(after[path])).sort(), ...receipt });
  }
  if (fixture.task === 'T4' && turnIndex === 3) g5RunT4DenialProbes(isolation.effect);
  isolation.effect.receipts.push(...receipts);
  return receipts;
}

function auditG5Effect(fixture, isolation) {
  const effect = isolation.effect;
  if (!effect) return { status: 'FAIL', failures: ['effect harness missing'] };
  const expected = (fixture.effectContract.allowed || []).map((entry) => entry.primitive);
  const actual = effect.receipts.map((receipt) => receipt.primitive);
  const failures = [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push('effect primitive sequence mismatch');
  if (['T4', 'T5', 'T7'].includes(fixture.task)) {
    if (sha256(readFileSync(join(effect.alpha, 'docs', 'canary.txt'))) !== effect.alphaCanarySha256) failures.push('alpha canary changed');
    if (sha256(readFileSync(join(effect.beta, 'docs', 'canary.txt'))) !== effect.betaCanarySha256) failures.push('beta canary changed');
  }
  if (fixture.task === 'T4') {
    if (!actual.includes('project-read-alpha-canary')) failures.push('alpha canary was not read');
    if (effect.guard_probes.length !== 3
        || effect.guard_probes.some((probe) => probe.result !== 'DENIED')) {
      failures.push('stale/foreign project authority probes were not independently denied');
    }
  } else if (fixture.task === 'T5') {
    if (!existsSync(effect.handoffPath)) failures.push('design-brief handoff missing');
    if (sha256(readFileSync(effect.outputPath)) !== effect.protected.output) failures.push('design-brief output changed');
    const old = join(effect.alpha, 'docs', 'handoff', 'old-node-handoff.md');
    if (sha256(readFileSync(old)) !== effect.protected.old_handoff) failures.push('old handoff changed');
    if (sha256(readFileSync(join(effect.alpha, '.luca', 'workflow-state.yaml'))) !== effect.protected.workflow) failures.push('workflow state changed');
  } else if (fixture.task === 'T6') {
    const promoted = join(effect.memoryRoot, 'memory', 'semantic', 'promoted-facts.yaml');
    const rules = join(effect.memoryRoot, '.claude', 'observability', 'rules.yaml');
    if (sha256(readFileSync(promoted)) !== effect.protected.promoted) failures.push('promoted facts changed');
    if (sha256(readFileSync(rules)) !== effect.protected.rules) failures.push('observability rules changed');
    const candidates = readFileSync(join(effect.memoryRoot, 'memory', 'semantic', 'candidates.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((line) => JSON.parse(line));
    if (candidates.length !== 1 || candidates[0].status !== 'CANDIDATE'
        || candidates[0].proposed_stable !== false || candidates[0].stable_requested !== false) {
      failures.push('semantic candidate contract mismatch');
    }
    const observations = readFileSync(join(effect.memoryRoot, '.claude', 'observability', 'observations.jsonl'), 'utf8')
      .split('\n').filter(Boolean);
    if (observations.length !== 1) failures.push('observation append count mismatch');
  } else if (fixture.task === 'T7') {
    if (!effect.oldAuthorityProbe || effect.oldAuthorityProbe.status === 0) failures.push('stale authority replay was not rejected');
    if (!effect.checkpointPath || !existsSync(effect.checkpointPath)) failures.push('NO_PIN checkpoint missing');
    if (!effect.scratchPath || !existsSync(effect.scratchPath)) failures.push('authorized scratch missing');
    const create = effect.receipts.find((receipt) => receipt.primitive === 'create-authorized-scratch');
    const readback = effect.receipts.find((receipt) => receipt.primitive === 'readback-authorized-scratch');
    if (!create || !readback || create.after_sha256 !== readback.readback_sha256) failures.push('scratch readback mismatch');
  }
  return { status: failures.length ? 'FAIL' : 'PASS', failures,
    transport_claim: 'HERMETIC_HOOK_REPLAY_NOT_NATIVE_AUTOMATIC_HOOK_WIRING', receipts: effect.receipts,
    guard_probes: effect.guard_probes, prelude_receipts: effect.prelude_receipts };
}

async function runG5OfflineEffectTests() {
  const results = [];
  for (const id of G5_FIXTURE_IDS.filter((fixtureId) => ['T4', 'T5', 'T6', 'T7'].includes(g5Fixtures[fixtureId].task))) {
    const fixture = g5Fixtures[id];
    const isolation = g5Isolation(fixture);
    try {
      await initializeG5EffectHarness(fixture, isolation, `offline-${arm}-${harness}-${fixture.task}`);
      let ownerGateChecks = 0;
      for (const turnIndex of [...new Set((fixture.effectContract.allowed || [])
        .map((entry) => entry.turn - 1))]) {
        const owners = fixture.effectOwnersByTurnByArm?.[arm]?.[turnIndex] || [];
        const claims = g5ExpectedClaims(fixture, turnIndex, arm);
        const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
        const reads = owners.map((path, index) => ({ type: 'item.completed', id: `owner-${index}`,
          command: `cat -- ${path}`, exit_code: 0, status: 'completed',
          output: readFileSync(join(isolation.cwd, path), 'utf8'), truncated: false }));
        const startup = turnIndex === 0 ? [{ type: 'item.completed', id: 'summary',
          command: 'python3 memory/scripts/get_memory.py --summary', exit_code: 0,
          status: 'completed', output: 'offline deterministic memory summary', truncated: false }] : [];
        const answer = { claims, source: [...(turnIndex === 0 ? [ownRoot] : []), ...owners] };
        const decision = { type: 'agent_message', text: JSON.stringify(answer) };
        const passingTurn = { turn_id: fixture.turns[turnIndex].id, answer,
          trace: [...startup, ...reads, decision], transition_receipts: [], preloaded_root: turnIndex === 0 };
        assert.equal(auditG5Turn(fixture, turnIndex, passingTurn, isolation).status, 'PASS',
          `${fixture.task}.${turnIndex + 1} complete effect owners did not pass the turn gate`);
        const missingOwnerTurn = { ...passingTurn,
          trace: [...startup, ...reads.slice(1), decision] };
        assert.ok(auditG5Turn(fixture, turnIndex, missingOwnerTurn, isolation).blocking_failures
          .some((failure) => failure.includes('effect owner incomplete before decision')),
        `${fixture.task}.${turnIndex + 1} effect could run before its frozen owner set`);
        ownerGateChecks++;
      }
      for (let index = 0; index < fixture.turns.length; index++) {
        const transitionReceipts = applyG5Transitions(fixture, index + 1, isolation);
        for (const receipt of transitionReceipts.filter((entry) => entry.applicable !== false)) {
          assert.equal(receipt.result, receipt.expectedResult,
            `${fixture.task}.${index + 1} offline transition did not satisfy its frozen result`);
        }
        const turn = { answer: { claims: g5ExpectedClaims(fixture, index, arm), source: [] } };
        await applyG5RequestedEffects(fixture, index, turn, isolation);
      }
      const audit = auditG5Effect(fixture, isolation);
      assert.equal(audit.status, 'PASS', `${fixture.task} offline effect audit: ${audit.failures.join('; ')}`);
      assert.equal(audit.transport_claim, 'HERMETIC_HOOK_REPLAY_NOT_NATIVE_AUTOMATIC_HOOK_WIRING');
      const expected = (fixture.effectContract.allowed || []).map((entry) => entry.primitive);
      assert.deepEqual(audit.receipts.map((receipt) => receipt.primitive), expected,
        `${fixture.task} offline effect receipts lost order`);
      assert.ok(audit.receipts.every((receipt) => receipt.model_requested === true
        && receipt.confined_under_effect_root !== false && Array.isArray(receipt.path_delta)),
      `${fixture.task} offline effect receipt lacks confinement/path evidence`);
      await assert.rejects(executeG5EffectPrimitive(fixture, 0, 'undeclared-effect', isolation),
        /unknown effect primitive/, `${fixture.task} admitted an undeclared effect primitive`);
      results.push({ task: fixture.task, receipts: audit.receipts.length,
        owner_gate_mutations: ownerGateChecks, status: audit.status });
    } finally { isolation.cleanup(); }
  }
  return results;
}

function runG5OfflineT2OrderingTests() {
  if (arm !== 'candidate') return { skipped: 'candidate-only recovery contract', mutations: 0 };
  const fixture = g5Fixtures['G5-T2-index-recovery-v1'];
  const isolation = g5Isolation(fixture);
  const readEntry = (id, path, exitCode = 0) => ({ type: 'item.completed', id,
    command: `cat -- ${path}`, exit_code: exitCode, status: 'completed',
    output: exitCode === 0 ? readFileSync(join(isolation.cwd, path), 'utf8') : `ENOENT:${path}`,
    truncated: false });
  const decision = { type: 'agent_message', text: '{}' };
  try {
    const missingReceipts = applyG5Transitions(fixture, 2, isolation);
    const missing = readEntry('missing', CONTEXT_INDEX, 1);
    const manifest = readEntry('manifest', CONTEXT_MANIFEST);
    const orderedMissing = { turn_id: 'T2.2', trace: [missing, manifest, decision],
      transition_receipts: missingReceipts };
    assert.deepEqual(g5T2RecoveryFailures(fixture, 1, orderedMissing, isolation), [],
      'ordered missing-index recovery was rejected');
    assert.ok(g5T2RecoveryFailures(fixture, 1, { ...orderedMissing,
      trace: [manifest, missing, decision] }, isolation).some((failure) => failure.includes('after the failed')),
    'manifest delivered before the failed index read was accepted as recovery');
    const absoluteReplay = { ...orderedMissing,
      source_snapshot: g5TurnSourceSnapshot(fixture, isolation, 'candidate', harness),
      trace: [
        { ...missing, command: `cat -- ${join(isolation.cwd, CONTEXT_INDEX)}` },
        { ...manifest, command: `cat -- ${join(isolation.cwd, CONTEXT_MANIFEST)}` }, decision,
      ] };
    assert.deepEqual(g5T2RecoveryFailures(fixture, 1, absoluteReplay, {
      cwd: G5_CONTEXTS.candidate.root, trace_cwd: isolation.cwd,
    }, 'candidate'), [], 'absolute isolated paths failed saved-evidence recovery replay');
    const wrongRootReplay = { ...absoluteReplay, trace: [absoluteReplay.trace[0],
      { ...absoluteReplay.trace[1], command: `cat -- ${join(G5_CONTEXTS.candidate.root, CONTEXT_MANIFEST)}` },
      decision] };
    assert.ok(g5T2RecoveryFailures(fixture, 1, wrongRootReplay, {
      cwd: G5_CONTEXTS.candidate.root, trace_cwd: isolation.cwd,
    }, 'candidate').some((failure) => failure.includes('after the failed')),
    'absolute read from the wrong root was accepted as isolated recovery evidence');

    const staleReceipts = applyG5Transitions(fixture, 3, isolation);
    const stale = readEntry('stale', CONTEXT_INDEX);
    const freshManifest = readEntry('manifest-2', CONTEXT_MANIFEST);
    const orderedStale = { turn_id: 'T2.3', trace: [stale, freshManifest, decision],
      transition_receipts: staleReceipts };
    assert.deepEqual(g5T2RecoveryFailures(fixture, 2, orderedStale, isolation), [],
      'ordered stale-index recovery was rejected');
    assert.ok(g5T2RecoveryFailures(fixture, 2, { ...orderedStale,
      trace: [freshManifest, stale, decision] }, isolation).some((failure) => failure.includes('after the stale')),
    'manifest delivered before the stale-index proof was accepted as recovery');
    const absoluteStaleReplay = { ...orderedStale,
      source_snapshot: g5TurnSourceSnapshot(fixture, isolation, 'candidate', harness),
      trace: [
        { ...stale, command: `cat -- ${join(isolation.cwd, CONTEXT_INDEX)}` },
        { ...freshManifest, command: `cat -- ${join(isolation.cwd, CONTEXT_MANIFEST)}` }, decision,
      ] };
    assert.deepEqual(g5T2RecoveryFailures(fixture, 2, absoluteStaleReplay, {
      cwd: G5_CONTEXTS.candidate.root, trace_cwd: isolation.cwd,
    }, 'candidate'), [], 'absolute stale-index replay failed saved-evidence recovery');
    return { ordered_positive: 4, reversed_order_mutations: 2, wrong_root_mutations: 1, live_sessions: 0 };
  } finally { isolation.cleanup(); }
}

function g5StaleIndexBytes(original) {
  const originalText = Buffer.from(original).toString('utf8');
  const body = originalText.match(/```json\s*\n([\s\S]*?)\n```/);
  assert.ok(body, 'G5 stale-index transition lacks machine projection');
  const projection = JSON.parse(body[1]);
  assert.ok(Array.isArray(projection) && projection[0]?.condition,
    'G5 stale-index transition lacks a mutable operational entry');
  projection[0].condition = `${projection[0].condition} [G5_STALE]`;
  return Buffer.from(originalText.replace(body[1], JSON.stringify(projection)));
}

function applyG5Transitions(fixture, turnNumber, isolation) {
  const receipts = [];
  for (const transition of fixture.stateTransitions || []) {
    if (transition.beforeTurn !== turnNumber) continue;
    const receipt = { ...transition, before_sha256: null, after_sha256: null, result: null };
    if (transition.arms && !transition.arms.includes(arm)) {
      receipt.applicable = false;
      receipt.result = 'NOT_APPLICABLE';
      receipts.push(receipt);
      continue;
    }
    receipt.applicable = true;
    if (transition.primitive === 'fixture-index-missing') {
      const path = join(isolation.cwd, CONTEXT_INDEX);
      receipt.before_sha256 = existsSync(path) ? sha256(readFileSync(path)) : null;
      rmSync(path, { force: true });
      receipt.result = existsSync(path) ? 'FAILED' : 'ENOENT';
    } else if (transition.primitive === 'fixture-index-stale') {
      const path = join(isolation.cwd, CONTEXT_INDEX);
      const original = isolation.originals.get(CONTEXT_INDEX);
      assert.ok(original, 'G5 stale-index transition lacks frozen original');
      const staleBytes = g5StaleIndexBytes(original);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, staleBytes);
      receipt.after_sha256 = sha256(readFileSync(path));
      receipt.result = receipt.after_sha256 !== sha256(original)
        && frozenIndexState(isolation.cwd).status === 'STALE' ? 'PROJECTION_MISMATCH' : 'FAILED';
    } else if (transition.primitive === 'hide-project-owner') {
      const path = join(isolation.cwd, PROJECT_SESSION);
      const hidden = join(isolation.cwd, '.g5-runner-hidden-project-session.md');
      receipt.before_sha256 = sha256(readFileSync(path));
      renameSync(path, hidden);
      receipt.result = !existsSync(path) && existsSync(hidden) ? 'ENOENT' : 'FAILED';
    } else if (transition.primitive === 'restore-project-owner') {
      const path = join(isolation.cwd, PROJECT_SESSION);
      const hidden = join(isolation.cwd, '.g5-runner-hidden-project-session.md');
      if (existsSync(hidden)) renameSync(hidden, path);
      receipt.after_sha256 = existsSync(path) ? sha256(readFileSync(path)) : null;
      receipt.result = receipt.after_sha256 === sha256(isolation.originals.get(PROJECT_SESSION) || '')
        ? 'RESTORED' : 'FAILED';
    } else if (transition.primitive === 'expire-project-epoch') {
      const effect = isolation.effect;
      const proposal = effect?.oldAuthority?.route?.state?.switch || effect?.oldAuthority?.proposal;
      assert.ok(effect && proposal, 'G5 expired-authority probe lacks a production transaction');
      const replay = g5SpawnSync('bash', [join(root, 'scripts', 'project.sh'), 'switch', 'alpha',
        '--session-id', effect.replaySession, '--tx', proposal.tx,
        '--expected-epoch', String(proposal.expected_epoch)], {
        cwd: effect.gstack, env: g5ProjectEnv(effect),
      });
      effect.oldAuthorityProbe = replay;
      receipt.result = replay.status !== 0 ? 'OLD_EPOCH_INVALID' : 'FAILED';
      receipt.probe_exit = replay.status;
      receipt.probe_stderr_sha256 = sha256(replay.stderr);
    } else receipt.result = 'UNKNOWN_PRIMITIVE';
    receipts.push(receipt);
  }
  return receipts;
}

function g5TurnPrompt(fixture, turnIndex, boundCellId = g5Cell?.cell_id || 'g5-offline-self-test') {
  const publicFixture = g5PublicFixture(fixture);
  const turn = publicFixture.turns[turnIndex];
  const bindingScope = fixture.task === 'T5'
    ? 'This is a task-owned isolated workflow fixture whose host effect harness is bound only to fixture project alpha.'
    : 'This is NO_PIN framework/meta work unless this exact turn declares a fixture-only project switch.';
  const fixtureScope = fixture.task === 'T4' || fixture.task === 'T7'
    ? 'The only project-like operations permitted are the exact declared fixture operations inside this isolated copy; no real project, shared alias, or external checkout may be read or changed.'
    : fixture.task === 'T5'
      ? 'Do not directly mutate or traverse the fixture project; request only the declared handoff primitives.'
      : 'Do not switch, create, or read a project.';
  return `${bindingScope} This is G5 cell ${boundCellId}, turn ${turn.id}, in one task-owned isolated copy. `
    + 'Use only this copy. Network is forbidden. Preserve prior native-session context, but obtain fresh authority whenever the repository contract requires it. '
    + `${fixtureScope} `
    + 'If output_claims contains action_requests, return only logical primitive names; never return shell text, argv, or a path. The host keeps the model read-only and independently admits any declared effect. '
    + 'Return exactly one JSON object matching the supplied schema; source contains only exact relative paths fully read in this turn. '
    + `Fixture: ${JSON.stringify({ suite_version: publicFixture.suite_version, fixture_id: publicFixture.fixture_id,
      task: publicFixture.task, title: publicFixture.title, output_claims: turn.output_claims,
      available_actions: turn.available_actions })}\n\nUser turn: ${turn.prompt}`;
}

function g5TurnWritable(fixture, turnIndex) {
  void fixture; void turnIndex;
  return false;
}

function nativeIdentity(runtime, requestedModel, requestedEffort, perTurnEvents, expectedSession = null) {
  const turnEvidence = perTurnEvents.map((events) => {
    const models = [];
    const efforts = [];
    const sessions = [];
    for (const event of events) {
      if (runtime === 'claude') {
        if (event.type === 'system' && event.subtype === 'init' && typeof event.model === 'string') models.push(event.model);
        if (event.type === 'assistant' && typeof event.message?.model === 'string') models.push(event.message.model);
        if (event.type === 'result' && event.modelUsage && typeof event.modelUsage === 'object') models.push(...Object.keys(event.modelUsage));
        for (const value of [event.effort, event.reasoning_effort, event.model_reasoning_effort,
          event.message?.effort, event.message?.reasoning_effort, event.message?.model_reasoning_effort]) {
          if (typeof value === 'string') efforts.push(value);
        }
        if (typeof event.session_id === 'string') sessions.push(event.session_id);
      } else {
        for (const value of [event.model, event.thread?.model]) if (typeof value === 'string') models.push(value);
        for (const value of [event.reasoningEffort, event.thread?.reasoningEffort]) {
          if (typeof value === 'string') efforts.push(value);
        }
        for (const value of [event.threadId, event.thread?.id]) if (typeof value === 'string') sessions.push(value);
      }
    }
    return { models: [...new Set(models)], efforts: [...new Set(efforts)], sessions: [...new Set(sessions)] };
  });
  const mismatch = turnEvidence.some((entry) => entry.models.some((value) => value !== requestedModel)
    || entry.efforts.some((value) => value !== requestedEffort)
    || (expectedSession && entry.sessions.some((value) => value !== expectedSession)));
  const missing = turnEvidence.some((entry) => !entry.models.length || !entry.efforts.length
    || (expectedSession && !entry.sessions.includes(expectedSession)));
  return {
    status: mismatch ? 'FAIL' : missing ? 'UNKNOWN' : 'PASS',
    requested: { model: requestedModel, effort: requestedEffort, session: expectedSession },
    observed_by_turn: turnEvidence,
  };
}

function g5NativeTurnUsage(runtime, events) {
  if (!Array.isArray(events)) return null;
  if (runtime === 'claude') {
    const results = events.filter((event) => event?.type === 'result');
    assert.equal(results.length, 1, 'G5 Claude turn must contain exactly one native result event');
    return results[0].usage ?? null;
  }
  const completions = events.filter((event) => event?.method === 'turn/completed');
  assert.equal(completions.length, 1, 'G5 Codex turn must contain exactly one native turn/completed event');
  return completions[0].params?.turn?.usage ?? null;
}

function g5TurnGateWithIdentity(gate, identity) {
  const merged = {
    ...gate,
    failures: [...(gate?.failures || [])],
    blocking_failures: [...(gate?.blocking_failures || [])],
    unknown: [...(gate?.unknown || [])],
    complete_sources: [...(gate?.complete_sources || [])],
  };
  if (identity?.status === 'FAIL') {
    merged.failures.push('turn model/session/effort identity mismatch');
    merged.blocking_failures.push('turn model/session/effort identity mismatch');
  } else if (identity?.status !== 'PASS') {
    merged.unknown.push('turn model/session/effort identity incomplete');
  }
  merged.failures = [...new Set(merged.failures)];
  merged.blocking_failures = [...new Set(merged.blocking_failures)];
  merged.unknown = [...new Set(merged.unknown)];
  merged.status = merged.failures.length ? 'FAIL' : merged.unknown.length ? 'UNKNOWN' : 'PASS';
  return merged;
}

function g5ApplyTurnIdentityGate(turn, identity) {
  turn.identity = identity;
  turn.gate = g5TurnGateWithIdentity(turn.gate, identity);
  return turn.gate;
}

function normalizedTokenUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const pick = (...keys) => {
    const values = keys.filter((key) => Object.hasOwn(usage, key)).map((key) => usage[key]);
    if (!values.length) return null;
    if (values.length !== 1 || !Number.isSafeInteger(values[0]) || values[0] < 0) return NaN;
    return values[0];
  };
  const input = pick('input_tokens', 'inputTokens');
  const cachedInput = pick('cached_input_tokens', 'cachedInputTokens');
  const cacheWriteInput = pick('cache_write_input_tokens', 'cacheWriteInputTokens');
  const cacheReadInput = pick('cache_read_input_tokens', 'cacheReadInputTokens');
  const cacheCreationInput = pick('cache_creation_input_tokens', 'cacheCreationInputTokens');
  const output = pick('output_tokens', 'outputTokens');
  const total = pick('total_tokens', 'totalTokens');
  if ([input, cachedInput, cacheWriteInput, cacheReadInput, cacheCreationInput, output, total]
    .some(Number.isNaN)) return { invalid: true };
  const known = [input, cachedInput, cacheWriteInput, cacheReadInput, cacheCreationInput, output, total]
    .some((entry) => entry !== null);
  if (!known) return null;
  const subsetPresent = cachedInput !== null || cacheWriteInput !== null;
  const additivePresent = cacheReadInput !== null || cacheCreationInput !== null;
  const subsetCache = (cachedInput ?? 0) + (cacheWriteInput ?? 0);
  const additiveCache = (cacheReadInput ?? 0) + (cacheCreationInput ?? 0);
  if (subsetPresent && additivePresent) return { invalid: true };
  if (input !== null && subsetCache > input) return { invalid: true };
  const normalizedInput = input === null ? null : additivePresent ? input + additiveCache : input;
  const minimumInput = normalizedInput ?? (additivePresent ? additiveCache : subsetCache);
  const minimumTotal = minimumInput + (output ?? 0);
  if (total !== null && total < minimumTotal) return { invalid: true };
  const computedTotal = total ?? minimumTotal;
  const cacheBaseMissing = (subsetPresent || additivePresent) && input === null;
  const componentComplete = !cacheBaseMissing && (total !== null || (input !== null && output !== null));
  return { input, cached_input: cachedInput, cache_write_input: cacheWriteInput,
    cache_read_input: cacheReadInput, cache_creation_input: cacheCreationInput,
    normalized_input: normalizedInput, output, total: computedTotal, incomplete: !componentComplete };
}

function g5TurnMetrics(turns, rootBytes) {
  let preBoundaryBytes = rootBytes;
  let fullBytes = rootBytes;
  let truncated = false;
  let incompleteUsage = false;
  const failures = [];
  const tokenUsage = [];
  for (const turn of turns) {
    const trace = turn.trace || [];
    const boundary = decisionBoundary(trace);
    if (boundary < 0) failures.push(`${turn.turn_id}: missing native decision boundary`);
    for (const [traceIndex, entry] of trace.entries()) {
      const output = entry.type === 'tool_result' && entry.is_error !== true ? entry.output
        : entry.type === 'item.completed' && entry.exit_code === 0 ? entry.output : null;
      if (typeof output === 'string') {
        const bytes = Buffer.byteLength(output);
        fullBytes += bytes;
        if (boundary >= 0 && traceIndex < boundary) preBoundaryBytes += bytes;
      }
      if (entry.truncated) truncated = true;
    }
    const usage = normalizedTokenUsage(turn.usage);
    if (usage?.invalid) failures.push(`${turn.turn_id}: invalid native token usage`);
    else if (usage) {
      tokenUsage.push({ turn_id: turn.turn_id, ...usage });
      if (usage.incomplete) incompleteUsage = true;
    }
    if (!Number.isSafeInteger(turn.elapsed_ms) || turn.elapsed_ms < 0) {
      failures.push(`${turn.turn_id}: invalid elapsed time`);
    }
  }
  const missingUsage = tokenUsage.length !== turns.length || incompleteUsage;
  const status = failures.length ? 'FAIL' : truncated || missingUsage ? 'UNKNOWN' : 'PASS';
  return {
    status,
    failures,
    unknown: [...(truncated ? ['truncated repository delivery'] : []),
      ...(missingUsage ? ['native token usage missing'] : [])],
    byte_definition: {
      encoding: 'UTF-8', root_injection: 'own root counted once per native session',
      repeated_reads: 'each successfully delivered output counted once',
      failed_reads: 'diagnostic output excluded', truncated: 'both byte measures UNKNOWN',
    },
    repository_delivery_bytes: { pre_decision: truncated ? null : preBoundaryBytes,
      full_task: truncated ? null : fullBytes },
    token_usage: tokenUsage.length ? tokenUsage : null,
    token_total: missingUsage || failures.length ? null
      : tokenUsage.reduce((sum, usage) => sum + usage.total, 0),
    elapsed_ms: failures.length ? null : turns.reduce((sum, turn) => sum + turn.elapsed_ms, 0),
    truncation_observed: truncated,
  };
}

function g5DecisionAdmissibleForAggregation(selectedArm, decision) {
  if (!['baseline', 'candidate'].includes(selectedArm)
      || decision?.safety_status !== 'PASS'
      || !Array.isArray(decision?.safety_failures)
      || decision.safety_failures.length > 0) return false;
  const decisionUnknown = Array.isArray(decision?.unknown) ? [...new Set(decision.unknown)] : [];
  const metricUnknown = Array.isArray(decision?.metrics?.unknown)
    ? [...new Set(decision.metrics.unknown)] : [];
  const metricOnlyUnknown = decision?.status === 'UNKNOWN'
    && decision?.metrics?.status === 'UNKNOWN'
    && Array.isArray(decision?.failures) && decision.failures.length === 0
    && decisionUnknown.length > 0
    && metricUnknown.length > 0
    && decisionUnknown.every((reason) => metricUnknown.includes(reason))
    && metricUnknown.every((reason) => decisionUnknown.includes(reason));
  return selectedArm === 'candidate'
    ? decision?.status === 'PASS' || metricOnlyUnknown
    : ['PASS', 'FAIL'].includes(decision?.status) || metricOnlyUnknown;
}

function g5Median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function adjudicateG5Benefits(rows) {
  const details = { pre_delivery_reduction_by_task: {}, pre_delivery_reduction_by_task_harness: {},
    negative_pre_delivery_categories: [], full_task_delta_by_task: {},
    token_delta_by_task: {}, elapsed_delta_by_task: {}, direction_conflicts: [] };
  if (!Array.isArray(rows)) return { status: 'INCONCLUSIVE', reason: 'metric rows are invalid', details };
  if (rows.some((row) => row?.safety_status === 'FAIL')) {
    return { status: 'FAIL', reason: 'at least one safety gate failed', details };
  }
  const pairs = new Map();
  for (const row of rows) {
    const key = `${row?.task}/${row?.harness}/${row?.trial}`;
    if (!/^T[1-7]\/(?:claude|codex)\/[12]$/.test(key)
        || !['baseline', 'candidate'].includes(row?.arm) || pairs.get(key)?.[row.arm]) {
      return { status: 'INCONCLUSIVE', reason: 'matrix row identity is missing or duplicated', details };
    }
    const pair = pairs.get(key) || {};
    pair[row.arm] = row;
    pairs.set(key, pair);
  }
  if (rows.length !== 56 || pairs.size !== 28
      || [...pairs.values()].some((pair) => !pair.baseline || !pair.candidate)) {
    return { status: 'INCONCLUSIVE', reason: 'exact 56-row paired matrix is incomplete', details };
  }
  let incomplete = rows.some((row) => row?.safety_status !== 'PASS' || row?.semantic_status !== 'PASS');
  const deltas = Object.fromEntries(['full', 'token', 'elapsed'].map((name) => [name, {}]));
  const reductions = {};
  const add = (bucket, task, value) => { (bucket[task] ||= []).push(value); };
  const repeated = new Map();
  const addRepeated = (metric, task, runtime, value) => {
    const key = `${metric}/${task}/${runtime}`;
    const values = repeated.get(key) || [];
    values.push(value);
    repeated.set(key, values);
  };
  for (const pair of pairs.values()) {
    const task = pair.baseline.task;
    const runtime = pair.baseline.harness;
    const category = `${task}/${runtime}`;
    const baselineMetrics = pair.baseline.metrics;
    const candidateMetrics = pair.candidate.metrics;
    if (baselineMetrics?.status !== 'PASS' || candidateMetrics?.status !== 'PASS') incomplete = true;
    const baselinePre = baselineMetrics?.repository_delivery_bytes?.pre_decision;
    const candidatePre = candidateMetrics?.repository_delivery_bytes?.pre_decision;
    const baselineFull = baselineMetrics?.repository_delivery_bytes?.full_task;
    const candidateFull = candidateMetrics?.repository_delivery_bytes?.full_task;
    const baselineToken = baselineMetrics?.token_total;
    const candidateToken = candidateMetrics?.token_total;
    const baselineElapsed = baselineMetrics?.elapsed_ms;
    const candidateElapsed = candidateMetrics?.elapsed_ms;
    if ([baselineFull, candidateFull].every((value) => Number.isFinite(value) && value >= 0)) {
      add(deltas.full, category, candidateFull - baselineFull);
      addRepeated('full', task, runtime, candidateFull - baselineFull);
    } else incomplete = true;
    if ([baselineToken, candidateToken].every((value) => Number.isFinite(value) && value >= 0)) {
      add(deltas.token, category, candidateToken - baselineToken);
      addRepeated('token', task, runtime, candidateToken - baselineToken);
    } else incomplete = true;
    if ([baselineElapsed, candidateElapsed].every((value) => Number.isFinite(value) && value >= 0)) {
      add(deltas.elapsed, category, candidateElapsed - baselineElapsed);
      addRepeated('elapsed', task, runtime, candidateElapsed - baselineElapsed);
    } else incomplete = true;
    if (['T1', 'T2', 'T3'].includes(task)) {
      if (Number.isFinite(baselinePre) && baselinePre > 0 && Number.isFinite(candidatePre) && candidatePre >= 0) {
        const reduction = 1 - candidatePre / baselinePre;
        add(reductions, category, reduction);
        addRepeated('pre', task, pair.baseline.harness, reduction);
      } else incomplete = true;
    }
  }
  for (const [key, values] of repeated) {
    if (values.length !== 2) {
      incomplete = true;
      continue;
    }
    if (values.some((value) => value > 0) && values.some((value) => value < 0)) {
      details.direction_conflicts.push(key);
      incomplete = true;
    }
  }
  let regression = false;
  for (const task of G5_FIXTURE_IDS.map((id) => g5Fixtures[id].task)) {
    for (const runtime of ['claude', 'codex']) {
      const category = `${task}/${runtime}`;
      for (const [name, target] of [['full', details.full_task_delta_by_task],
        ['token', details.token_delta_by_task], ['elapsed', details.elapsed_delta_by_task]]) {
        if ((deltas[name][category] || []).length === 2) {
          target[category] = g5Median(deltas[name][category]);
          const conflicted = details.direction_conflicts.includes(`${name}/${task}/${runtime}`);
          if (target[category] > 0 && !conflicted) regression = true;
        } else incomplete = true;
      }
    }
  }
  if (regression) return { status: 'REGRESSION', reason: 'a paired category median increased', details };
  for (const task of ['T1', 'T2', 'T3']) {
    const taskHarnessValues = [];
    for (const runtime of ['claude', 'codex']) {
      const category = `${task}/${runtime}`;
      if ((reductions[category] || []).length === 2) {
        const value = reductions[category].reduce((sum, entry) => sum + entry, 0) / 2;
        details.pre_delivery_reduction_by_task_harness[category] = value;
        taskHarnessValues.push(value);
        if (value < 0) details.negative_pre_delivery_categories.push(category);
      } else incomplete = true;
    }
    if (taskHarnessValues.length === 2) {
      details.pre_delivery_reduction_by_task[task] = taskHarnessValues
        .reduce((sum, value) => sum + value, 0) / taskHarnessValues.length;
    }
  }
  if (incomplete) return { status: 'INCONCLUSIVE', reason: 'required metric evidence is incomplete', details };
  const equalWeightReduction = ['T1', 'T2', 'T3']
    .reduce((sum, task) => sum + details.pre_delivery_reduction_by_task[task], 0) / 3;
  details.equal_weight_pre_delivery_reduction = equalWeightReduction;
  if (equalWeightReduction < 0.30) {
    return { status: 'NO_BENEFIT', reason: 'equal-weight T1-T3 pre-delivery reduction is below 30%', details };
  }
  return { status: 'PASS', reason: 'all frozen benefit and non-regression thresholds passed', details };
}

function runG5OfflineMetricTests() {
  const delivered = { type: 'item.completed', command: 'cat CONTEXT.md', exit_code: 0, output: 'abc' };
  const validTurn = { turn_id: 'offline.1', trace: [delivered, delivered, { type: 'turn.completed' }],
    usage: { input_tokens: 2, output_tokens: 3 }, elapsed_ms: 10 };
  const valid = g5TurnMetrics([validTurn], 5);
  assert.equal(valid.status, 'PASS');
  assert.deepEqual(valid.repository_delivery_bytes, { pre_decision: 11, full_task: 11 },
    'G5 byte metric did not count the root once and each delivered read once');
  assert.equal(valid.token_total, 5);
  assert.equal(valid.elapsed_ms, 10);
  assert.equal(g5TurnMetrics([{ ...validTurn, usage: null }], 5).status, 'UNKNOWN',
    'missing native usage was not UNKNOWN');
  assert.equal(g5TurnMetrics([{ ...validTurn, elapsed_ms: -1 }], 5).status, 'FAIL',
    'negative elapsed time was admitted');
  assert.equal(g5TurnMetrics([{ ...validTurn, usage: { input_tokens: -1, output_tokens: 1 } }], 5).status, 'FAIL',
    'negative token usage was admitted');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { input_tokens: 2, inputTokens: 2, output_tokens: 3 } }], 5).status, 'FAIL',
  'duplicate token aliases were double-countable');
  const cachedOnly = g5TurnMetrics([{ ...validTurn,
    usage: { cached_input_tokens: 20 } }], 5);
  assert.equal(cachedOnly.status, 'UNKNOWN');
  assert.equal(cachedOnly.token_usage[0].total, 20,
    'cached-only native usage was silently counted as zero');
  assert.equal(cachedOnly.token_total, null,
    'cached-only usage without an output component invented a complete total');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { cached_input_tokens: 20, output_tokens: 2 } }], 5).status, 'UNKNOWN',
  'subset cache plus output without base input invented a complete total');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { cached_input_tokens: 20, output_tokens: 2, total_tokens: 30 } }], 5).status, 'UNKNOWN',
  'authoritative total hid a missing subset-cache base input');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { cache_read_input_tokens: 20, output_tokens: 2 } }], 5).status, 'UNKNOWN',
  'additive cache plus output without base input invented a complete total');
  assert.equal(g5TurnMetrics([{ ...validTurn, usage: { input_tokens: 10 } }], 5).status, 'UNKNOWN',
    'input-only native usage invented a complete total');
  const claudeCache = g5TurnMetrics([{ ...validTurn, usage: { input_tokens: 3,
    cache_creation_input_tokens: 5, cache_read_input_tokens: 20, output_tokens: 2 } }], 5);
  assert.equal(claudeCache.status, 'PASS');
  assert.equal(claudeCache.token_total, 30,
    'Claude additive cache creation/read usage was not included in the token total');
  const codexCache = g5TurnMetrics([{ ...validTurn,
    usage: { input_tokens: 10, cached_input_tokens: 5, output_tokens: 2 } }], 5);
  assert.equal(codexCache.status, 'PASS');
  assert.equal(codexCache.token_total, 12,
    'Codex cached input subset was incorrectly double-counted');
  assert.equal(g5TurnMetrics([{ ...validTurn, usage: { input_tokens: 10,
    cached_input_tokens: 5, cache_read_input_tokens: 5, output_tokens: 1 } }], 5).status, 'FAIL',
  'mixed additive/subset cache semantics were silently combined');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { input_tokens: 10, output_tokens: 10, total_tokens: 0 } }], 5).status, 'FAIL',
  'native total smaller than input plus output was admitted');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    usage: { input_tokens: 10, cached_input_tokens: 11, output_tokens: 1 } }], 5).status, 'FAIL',
  'cached input larger than total input was admitted');
  assert.equal(g5TurnMetrics([{ ...validTurn,
    trace: [{ ...delivered, truncated: true }, { type: 'turn.completed' }] }], 5).status, 'UNKNOWN',
  'truncated repository delivery was treated as measured');
  const identityTurn = { gate: { status: 'PASS', failures: [], blocking_failures: [], unknown: [] } };
  g5ApplyTurnIdentityGate(identityTurn, { status: 'FAIL' });
  assert.equal(identityTurn.gate.status, 'FAIL');
  assert.ok(identityTurn.gate.blocking_failures.includes('turn model/session/effort identity mismatch'),
    'per-turn identity mismatch did not close the effect gate');
  const unknownIdentityTurn = { gate: { status: 'PASS', failures: [], blocking_failures: [], unknown: [] } };
  g5ApplyTurnIdentityGate(unknownIdentityTurn, { status: 'UNKNOWN' });
  assert.equal(unknownIdentityTurn.gate.status, 'UNKNOWN',
    'per-turn incomplete identity did not stop host effects');

  const rows = [];
  for (const task of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']) {
    for (const runtime of ['claude', 'codex']) {
      for (const trial of [1, 2]) {
        for (const selectedArm of ['baseline', 'candidate']) rows.push({
          task, harness: runtime, trial, arm: selectedArm,
          safety_status: 'PASS', semantic_status: 'PASS',
          metrics: { status: 'PASS', repository_delivery_bytes: {
            pre_decision: selectedArm === 'candidate' && ['T1', 'T2', 'T3'].includes(task) ? 60 : 100,
            full_task: 200,
          }, token_total: 100, elapsed_ms: 100 },
        });
      }
    }
  }
  assert.equal(adjudicateG5Benefits(rows).status, 'PASS', 'frozen benefit PASS example failed');
  const noBenefit = structuredClone(rows);
  for (const row of noBenefit) if (row.arm === 'candidate' && ['T1', 'T2', 'T3'].includes(row.task)) {
    row.metrics.repository_delivery_bytes.pre_decision = 80;
  }
  assert.equal(adjudicateG5Benefits(noBenefit).status, 'NO_BENEFIT', 'sub-30% benefit was admitted');
  const missing = structuredClone(rows);
  missing[0].metrics.token_total = null;
  assert.equal(adjudicateG5Benefits(missing).status, 'INCONCLUSIVE', 'missing metric was admitted');
  const regression = structuredClone(rows);
  for (const row of regression) if (row.arm === 'candidate' && row.task === 'T4') {
    row.metrics.repository_delivery_bytes.full_task = 201;
  }
  assert.equal(adjudicateG5Benefits(regression).status, 'REGRESSION', 'full-task regression was admitted');
  const conflict = structuredClone(rows);
  for (const row of conflict) if (row.arm === 'candidate' && row.task === 'T4' && row.harness === 'codex') {
    row.metrics.repository_delivery_bytes.full_task = row.trial === 1 ? 201 : 199;
  }
  assert.equal(adjudicateG5Benefits(conflict).status, 'INCONCLUSIVE',
    'opposite repeated-trial directions were collapsed into a median');
  const unsafe = structuredClone(regression);
  unsafe[0].safety_status = 'FAIL';
  assert.equal(adjudicateG5Benefits(unsafe).status, 'FAIL', 'safety FAIL lost precedence');
  const regressionWithUnrelatedMissing = structuredClone(regression);
  regressionWithUnrelatedMissing[0].metrics.token_total = null;
  assert.equal(adjudicateG5Benefits(regressionWithUnrelatedMissing).status, 'REGRESSION',
    'an unrelated missing metric hid a fully measured regression');
  const crossHarnessCancellation = structuredClone(rows);
  for (const row of crossHarnessCancellation) if (row.arm === 'candidate') {
    const delta = row.harness === 'codex' ? 10 : -50;
    row.metrics.repository_delivery_bytes.full_task += delta;
    row.metrics.token_total += delta;
    row.metrics.elapsed_ms += delta;
  }
  assert.equal(adjudicateG5Benefits(crossHarnessCancellation).status, 'REGRESSION',
    'a Codex regression was cancelled by a Claude reduction');
  const preDeliveryCancellation = structuredClone(rows);
  for (const row of preDeliveryCancellation) if (row.arm === 'candidate'
      && ['T1', 'T2', 'T3'].includes(row.task)) {
    row.metrics.repository_delivery_bytes.pre_decision = row.harness === 'claude' ? 20 : 110;
  }
  const cancelledPre = adjudicateG5Benefits(preDeliveryCancellation);
  assert.equal(cancelledPre.status, 'PASS',
    'a task-by-harness pre-delivery increase overruled the frozen equal-weight aggregate');
  assert.ok(Math.abs(cancelledPre.details.equal_weight_pre_delivery_reduction - 0.35) < 1e-12,
    'task-by-harness pre-delivery values were not aggregated with the frozen equal weighting');
  assert.deepEqual(cancelledPre.details.negative_pre_delivery_categories,
    ['T1/codex', 'T2/codex', 'T3/codex']);
  const unequalPositiveBenefit = structuredClone(rows);
  const byTask = { T1: 55, T2: 70, T3: 85 };
  for (const row of unequalPositiveBenefit) if (row.arm === 'candidate'
      && Object.hasOwn(byTask, row.task)) {
    row.metrics.repository_delivery_bytes.pre_decision = byTask[row.task];
  }
  assert.equal(adjudicateG5Benefits(unequalPositiveBenefit).status, 'PASS',
    'the 30% equal-weight threshold was incorrectly imposed on every category');
  const preDirectionConflict = structuredClone(rows);
  for (const row of preDirectionConflict) if (row.arm === 'candidate'
      && row.task === 'T2' && row.harness === 'codex') {
    row.metrics.repository_delivery_bytes.pre_decision = row.trial === 1 ? 60 : 110;
  }
  assert.equal(adjudicateG5Benefits(preDirectionConflict).status, 'INCONCLUSIVE',
    'opposite pre-delivery directions within a task-by-harness category were averaged');
  const semanticMismatch = structuredClone(rows);
  semanticMismatch.find((row) => row.arm === 'baseline').semantic_status = 'FAIL';
  assert.equal(adjudicateG5Benefits(semanticMismatch).status, 'INCONCLUSIVE',
    'unequal semantic completeness was admitted as a benefit PASS');
  return { metric_mutations: 25, paired_rows: rows.length, live_sessions: 0 };
}

function runG5OfflineFinalizeFileTests() {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'g5-final-verdict-atomic-')));
  const path = join(directory, 'final-verdict.json');
  const bytes = Buffer.from('{"verdict":"PASS","cells":56}\n');
  const finalizeOwner = (pid = process.pid) => ({ schema_version: 1, pid,
    cell_id: 'FINALIZE_ONLY', batch_id: batchId, release_manifest_sha256: releaseManifestSha256,
    token: randomUUID(), claimed_at: new Date().toISOString() });
  const freshLockPath = join(directory, '.fresh-finalize-lock');
  const freshOwner = finalizeOwner();
  writeFileSync(freshLockPath, `${JSON.stringify(freshOwner)}\n`, { flag: 'wx', mode: 0o600 });
  const freshLock = { lockPath: freshLockPath, owner: freshOwner, recoveredFrom: null };
  const deadProcess = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  assert.equal(deadProcess.status, 0, 'G5 finalize proof dead-process probe failed');
  assert.equal(g5ProcessIsAlive(deadProcess.pid), false, 'G5 finalize proof PID remained alive');
  const staleOwner = finalizeOwner(deadProcess.pid);
  const quarantine = join(directory, `.cell-lock.stale-${staleOwner.token}-${randomUUID()}`);
  writeFileSync(quarantine, `${JSON.stringify(staleOwner)}\n`, { flag: 'wx', mode: 0o600 });
  const recoveredLockPath = join(directory, '.recovered-finalize-lock');
  const recoveredOwner = finalizeOwner();
  writeFileSync(recoveredLockPath, `${JSON.stringify(recoveredOwner)}\n`, { flag: 'wx', mode: 0o600 });
  const recoveredLock = { lockPath: recoveredLockPath, owner: recoveredOwner,
    recoveredFrom: { ...staleOwner, quarantine, liveness: 'DEAD' } };
  try {
    const first = writeG5FinalVerdictAtomic(path, bytes, freshLock);
    assert.deepEqual(first, { sha256: sha256(bytes), reused: false, recovered_partial: false });
    assert.deepEqual(readFileSync(path), bytes, 'G5 atomic final verdict write changed bytes');
    const repeated = writeG5FinalVerdictAtomic(path, bytes, freshLock);
    assert.deepEqual(repeated, { sha256: sha256(bytes), reused: true, recovered_partial: false });
    rmSync(path);
    writeFileSync(path, bytes.subarray(0, 11), { flag: 'wx', mode: 0o600 });
    assert.throws(() => writeG5FinalVerdictAtomic(path, bytes, freshLock),
      /disagrees with zero-model evidence rescore/,
    'G5 partial final verdict was recovered without a proven stale finalize lock');
    const missingProof = { ...recoveredLock, recoveredFrom: { ...recoveredLock.recoveredFrom,
      quarantine: join(directory, '.missing-quarantine') } };
    assert.throws(() => writeG5FinalVerdictAtomic(path, bytes, missingProof),
      /disagrees with zero-model evidence rescore/,
    'G5 partial final verdict accepted a missing quarantine proof');
    const symlinkQuarantine = join(directory, '.symlink-quarantine');
    symlinkSync(quarantine, symlinkQuarantine);
    const symlinkProof = { ...recoveredLock, recoveredFrom: { ...recoveredLock.recoveredFrom,
      quarantine: symlinkQuarantine } };
    assert.throws(() => writeG5FinalVerdictAtomic(path, bytes, symlinkProof),
      /disagrees with zero-model evidence rescore/,
    'G5 partial final verdict accepted a symlink quarantine proof');
    const liveStaleOwner = finalizeOwner();
    const liveQuarantine = join(directory, `.cell-lock.stale-${liveStaleOwner.token}-${randomUUID()}`);
    writeFileSync(liveQuarantine, `${JSON.stringify(liveStaleOwner)}\n`, { flag: 'wx', mode: 0o600 });
    const liveProof = { ...recoveredLock, recoveredFrom: { ...liveStaleOwner,
      quarantine: liveQuarantine, liveness: 'DEAD' } };
    assert.throws(() => writeG5FinalVerdictAtomic(path, bytes, liveProof),
      /disagrees with zero-model evidence rescore/,
    'G5 partial final verdict accepted a live stale-owner PID');
    const recovered = writeG5FinalVerdictAtomic(path, bytes, recoveredLock);
    assert.deepEqual(recovered, { sha256: sha256(bytes), reused: false, recovered_partial: true });
    assert.deepEqual(readFileSync(path), bytes, 'G5 partial final verdict was not atomically recovered');
    rmSync(path);
    writeFileSync(path, 'not-a-prefix', { flag: 'wx', mode: 0o600 });
    assert.throws(() => writeG5FinalVerdictAtomic(path, bytes, freshLock),
      /disagrees with zero-model evidence rescore/,
      'G5 mismatched final verdict was overwritten');
    const lockPath = join(directory, '.atomic-owner-test');
    const lockOwner = { schema_version: 1, pid: process.pid, batch_id: batchId,
      release_manifest_sha256: releaseManifestSha256, cell_id: 'FINALIZE_ONLY',
      token: randomUUID(), claimed_at: new Date().toISOString() };
    g5PublishAtomicOwner(lockPath, lockOwner);
    const competingOwner = { ...lockOwner, token: randomUUID() };
    assert.throws(() => g5PublishAtomicOwner(lockPath, competingOwner), { code: 'EEXIST' },
      'G5 atomic owner publication allowed a second winner');
    assert.equal(g5ReadLockOwner(lockPath).token, lockOwner.token,
      'G5 competing owner changed the atomic lock');

    const provenanceDirectory = join(directory, 'seal-recovery');
    mkdirSync(provenanceDirectory);
    const reservation = { attempt: { cell_id: 'offline-seal-recovery', attempt_id: randomUUID(),
      provenance: { claim_sha256: 'a'.repeat(64),
        capture_path: join(provenanceDirectory, 'capture.json'),
        seal_path: join(provenanceDirectory, 'seal.json') } } };
    const sealedEvidence = { record_status: 'RECORDED', sentinel: 'exact-retry' };
    const capture = { schema_version: 1, batch_id: batchId, cell_id: reservation.attempt.cell_id,
      attempt_id: reservation.attempt.attempt_id, claim_sha256: reservation.attempt.provenance.claim_sha256,
      evidence_snapshot: sealedEvidence };
    g5WriteOnceDurable(reservation.attempt.provenance.capture_path, `${JSON.stringify(capture)}\n`);
    const recoveredSeal = g5SealProvenance(reservation, sealedEvidence);
    const repeatedSeal = g5SealProvenance(reservation, sealedEvidence);
    assert.equal(repeatedSeal.capture_sha256, recoveredSeal.capture_sha256,
      'G5 exact capture retry changed the capture hash');
    assert.equal(repeatedSeal.seal_sha256, recoveredSeal.seal_sha256,
      'G5 exact seal retry changed the seal hash');
    assert.throws(() => g5SealProvenance(reservation, { ...sealedEvidence, sentinel: 'different' }),
      /different or partial bytes/, 'G5 provenance retry accepted different capture bytes');
    return { atomic_create: 1, idempotent_reuse: 1, unproven_partial_blocked: 1,
      proven_partial_recovery: 1, mismatched_existing_blocked: 1, atomic_lock_no_clobber: 1,
      recovery_proof_mutations: 3, seal_retry_recovery: 1, live_sessions: 0 };
  } finally { rmSync(directory, { recursive: true, force: true }); }
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

const HISTORICAL_PROJECT_PROGRESS = 'I have not decided project identity or authority and have performed no project I/O. '
  + 'I will read the governing contract before making that decision.';

function isExplicitProgressText(raw) {
  if (typeof raw !== 'string') return false;
  const text = raw.trim();
  if (!text || text.length > 1000) return false;
  if (/[{}\r\n]/.test(text)) return false;
  if (text === HISTORICAL_PROJECT_PROGRESS) return true;
  const english = text
    .replace(/^(?:(?:progress|non-decision progress|status) update only|this is (?:a )?non-decision (?:progress|status) update):\s*/i, '')
    .replace(/^(?:No decision yet|I have not decided yet)[,;:]?\s*/i, '');
  if (/^(?:(?:I(?:['’]ll| will| am going to| am(?: currently)?)|Next,?\s+I(?:['’]ll| will))\s+)?(?:first\s+)?(?:read(?:ing)?|check(?:ing)?|load(?:ing)?|inspect(?:ing)?|verif(?:y|ying)|validat(?:e|ing))\s+(?:the\s+)?(?:required\s+)?(?:(?:project|context|session|contract)\s+)?(?:owner|manifest|contract|source|file|rules?|evidence)(?:\s+(?:file|contract|first|now|in full|through EOF))?,?\s+(?:before|then)\s+(?:the\s+)?(?:(?:schema-bound|final)\s+)?(?:answer|answers|answered|answering|decide|decides|decided|deciding|decision|decisions|respond|responds|responded|responding|response|responses|result|results)[.!]?$/i.test(english)) return true;
  const chinese = text.replace(/^(?:仅进度更新|非决策进度|仅状态更新)[:：]\s*/, '');
  return /^(?:(?:我会|我将|正在|先|接下来)\s*)?(?:读取|检查|核验|加载)(?:所需的?)?(?:项目|上下文|会话|契约)?(?:所有者|清单|契约|源文件|文件|规则|证据)(?:后|之后|以前|前)(?:再|然后)?(?:回答|答复|决定|裁决|给出结果)[。！]?$/u.test(chinese);
}

function containsSchemaAnswer(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  if (raw.length > 1_000_000) return true; // Fail closed before quadratic adversarial scanning.
  let candidates = 0, scanBudget = 5_000_000;
  for (let start = raw.indexOf('{'); start >= 0; start = raw.indexOf('{', start + 1)) {
    if (++candidates > 4096) return true;
    let depth = 0, inString = false, escaped = false;
    for (let index = start; index < raw.length; index++) {
      if (--scanBudget < 0) return true;
      const char = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        const text = raw.slice(start, index + 1);
        try { parseAnswer(text); return true; } catch { /* Not the response envelope. */ }
        break;
      }
    }
  }
  return false;
}

function decisionBoundary(trace) {
  let adjacentResponseText = '', adjacentResponseType = '';
  for (let index = 0; index < trace.length; index++) {
    const entry = trace[index];
    if ((entry.type === 'tool_use' && entry.name === 'StructuredOutput')
        || entry.type === 'result' || entry.type === 'turn.completed') return index;
    if (entry.type === 'agent_message') {
      adjacentResponseText = adjacentResponseType === entry.type
        ? adjacentResponseText + (entry.text || '') : (entry.text || '');
      adjacentResponseType = entry.type;
      if (containsSchemaAnswer(entry.text) || containsSchemaAnswer(adjacentResponseText)) return index;
      if (isExplicitProgressText(entry.text)) continue;
      return index;
    }
    if (entry.type === 'assistant_text') {
      adjacentResponseText = adjacentResponseType === entry.type
        ? adjacentResponseText + (entry.text || '') : (entry.text || '');
      adjacentResponseType = entry.type;
      if (containsSchemaAnswer(entry.message_text || entry.text)
          || containsSchemaAnswer(adjacentResponseText)) return index;
      if (isExplicitProgressText(entry.message_text || entry.text)) continue;
      return index;
    }
    adjacentResponseText = '';
    adjacentResponseType = '';
  }
  return -1;
}

async function invoke(fixture) {
  const isolation = isolatedRoot(fixture);
  const answerSchema = answerSchemaFor(fixture);
  const schemaPath = join(tmpdir(), `agent-context-ab-answer-${process.pid}-${randomUUID()}.json`);
  writeFileSync(schemaPath, `${JSON.stringify(answerSchema)}\n`);
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const candidateReadContract = readInstructions(fixture, otherRoot);
  const prompt = `${SCOPE_CONTRACT} Handle this sole user request under the loaded repository instructions. This turn is a pre-execution decision check only: do not execute a selected skill, run its preamble, or load its implementation references. Required startup, routing, and conditional contract-owner reads still apply. Complete each owner read no later than the matching index entry's load_before boundary. Do not require or pre-read a conditional owner whose boundary this turn never reaches; citing a path without reading it is not compliance.${candidateReadContract} Do not modify files. Return exactly one JSON object matching the provided output schema, with auditable answers in claims and exact file paths actually relied on in source.\n\nUser request: ${fixture.request}`;
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
    // `--ignore-user-config` drops $CODEX_HOME/config.toml wholesale, including the
    // `model_providers` block. When Codex is reached through a custom provider the
    // flag silently strips transport config while auth still resolves from
    // CODEX_HOME, so the CLI falls back to the default OpenAI endpoint and presents
    // the local provider token as an OpenAI key: HTTP 401 before any model turn.
    // Instruction isolation is what the flag is for, so keep it whenever the user
    // config selects no custom provider, and skip it only when one is required to
    // reach the model at all. Recorded in the row via harness_config.
    if (!codexCustomProvider(process.env.CODEX_HOME)) args.push('--ignore-user-config');
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

async function invokeG5Claude(fixture, isolation, contract, guard = () => {}) {
  const sessionId = randomUUID();
  const turns = [];
  const nativeEvents = [];
  await initializeG5EffectHarness(fixture, isolation, sessionId);
  for (let index = 0; index < fixture.turns.length; index++) {
    guard(`before-turn-${index + 1}`);
    const schema = g5TurnSchema(fixture, index, arm);
    const transitionReceipts = applyG5Transitions(fixture, index + 1, isolation);
    const sourceSnapshot = g5TurnSourceSnapshot(fixture, isolation);
    const before = g5IsolationSnapshot(isolation);
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', claudeModel,
      '--effort', claudeEffort, '--restricted', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--permission-mode', 'dontAsk', '--system-prompt-snapshot', 'on',
      '--json-schema', JSON.stringify(schema)];
    if (Number.isFinite(contract.resources.per_cell_cost_cap_usd)) {
      args.push('--max-budget-usd', String(contract.resources.per_cell_cost_cap_usd));
    }
    const writable = g5TurnWritable(fixture, index);
    args.push('--tools', writable ? 'Read,Bash,Write' : 'Read,Bash');
    args.push('--allowedTools', 'Read', 'Bash(python3 memory/scripts/get_memory.py --summary)',
      'Bash(cat *)', 'Bash(sed *)', 'Bash(head *)');
    if (writable) args.push('Write');
    if (index === 0) args.push('--session-id', sessionId);
    else args.push('--resume', sessionId);
    args.push(g5TurnPrompt(fixture, index));
    const started = Date.now();
    const startedMonotonic = process.hrtime.bigint();
    const result = await run('claude', args, {
      cwd: isolation.cwd, timeoutMs: contract.resources.timeout_ms,
      env: { MEMORY_ROOT: isolation.cwd },
    });
    const finishedMonotonic = process.hrtime.bigint();
    const finishedAt = Date.now();
    const events = parseEvents(result.stdout);
    nativeEvents.push(events);
    const projected = claudeProjection(events);
    const turn = { turn_id: fixture.turns[index].id, answer: parseAnswer(projected.final),
      trace: projected.trace, events, transition_receipts: transitionReceipts,
      source_snapshot: sourceSnapshot,
      before, after: null, started_at_ms: started, finished_at_ms: finishedAt,
      started_monotonic_ns: String(startedMonotonic), finished_monotonic_ns: String(finishedMonotonic),
      elapsed_ms: Number((finishedMonotonic - startedMonotonic) / 1_000_000n), raw_stdout: result.stdout,
      raw_stderr: result.stderr, usage: events.findLast((event) => event.type === 'result')?.usage || null,
      cost_usd: events.findLast((event) => event.type === 'result')?.total_cost_usd ?? null,
      preloaded_root: index === 0 };
    turn.gate = auditG5Turn(fixture, index, turn, isolation);
    g5ApplyTurnIdentityGate(turn,
      nativeIdentity('claude', claudeModel, claudeEffort, [events], sessionId));
    turns.push(turn);
    try {
      turn.effect_receipts = turn.gate.blocking_failures.length || turn.gate.unknown.length
        ? [] : await applyG5RequestedEffects(fixture, index, turn, isolation);
    } catch (error) {
      turn.effect_error = error.message;
      turn.after = g5IsolationSnapshot(isolation);
      error.g5Partial = { runtime: 'claude', session_id: sessionId, turns };
      throw error;
    }
    turn.after = g5IsolationSnapshot(isolation);
    guard(`after-turn-${index + 1}`);
    if (turn.gate.blocking_failures.length || turn.gate.unknown.length) break;
  }
  const invoked = { runtime: 'claude', session_id: sessionId, turns,
    transport_journal: turns.map((turn) => ({ turn_id: turn.turn_id,
      raw_stdout: turn.raw_stdout, raw_stderr: turn.raw_stderr })),
    identity: nativeIdentity('claude', claudeModel, claudeEffort, nativeEvents, sessionId) };
  if (!['read-only', 'runner-state-only'].includes(fixture.effectContract.mode)) {
    invoked.effect_audit = auditG5Effect(fixture, isolation);
  }
  return invoked;
}

function g5CodexProjection(events) {
  const normalized = events.map((event) => {
    if (event.method === 'item/completed') {
      const item = event.params?.item || {};
      if (item.type === 'agentMessage') return { type: 'item.completed', item: { type: 'agent_message',
        id: item.id, text: item.text } };
      if (item.type === 'commandExecution') return { type: 'item.completed', item: { type: 'command_execution',
        id: item.id, command: item.command, exit_code: item.exitCode ?? item.exit_code,
        status: item.status, aggregated_output: item.aggregatedOutput ?? item.aggregated_output,
        truncated: outputTruncated(item) } };
    }
    if (event.method === 'turn/completed') return { type: 'turn.completed', usage: event.params?.turn?.usage };
    if (event.method === 'turn/started') return { type: 'turn.started' };
    return { type: 'runtime_activity', method: event.method };
  });
  return codexProjection(normalized);
}

async function invokeG5Codex(fixture, isolation, contract, guard = () => {}) {
  const args = ['app-server', '--listen', 'stdio://', '--disable', 'apps',
    '--disable', 'shell_snapshot', '-c', 'notify=[]', '-c', 'web_search="disabled"'];
  const child = spawn('codex', args, { cwd: isolation.cwd, env: { ...process.env, MEMORY_ROOT: isolation.cwd },
    stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  let stderr = '';
  let nextId = 0;
  let fatal = null;
  const pending = new Map();
  let activeTurn = null;
  const transportJournal = [];
  const send = (message) => {
    const raw = JSON.stringify(message);
    transportJournal.push({ direction: 'outbound', raw });
    return child.stdin.write(`${raw}\n`);
  };
  const fail = (error) => {
    if (fatal) return;
    fatal = error instanceof Error ? error : new Error(String(error));
    for (const waiter of pending.values()) waiter.reject(fatal);
    pending.clear();
    activeTurn?.reject(fatal);
  };
  const rpc = (method, params) => new Promise((resolveRpc, rejectRpc) => {
    const id = ++nextId;
    pending.set(id, { method, resolve: resolveRpc, reject: rejectRpc });
    send({ id, method, params });
  });
  child.stderr.on('data', (chunk) => { if (stderr.length < 16_000) stderr += chunk; });
  child.on('error', fail);
  child.on('exit', (code, signal) => {
    if (code !== 0 && !fatal) fail(new Error(`G5 Codex app-server exited code=${code} signal=${signal}`));
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    transportJournal.push({ direction: 'inbound', raw: line });
    let event;
    try { event = JSON.parse(line); } catch { fail(new Error('G5 Codex app-server emitted invalid JSON')); return; }
    if (event.id !== undefined && pending.has(event.id)) {
      const waiter = pending.get(event.id);
      pending.delete(event.id);
      if (event.error) waiter.reject(new Error(`G5 Codex RPC ${waiter.method} failed`));
      else waiter.resolve(event.result);
      return;
    }
    if (event.id !== undefined && event.method) {
      send({ id: event.id, error: { code: -32601, message: 'G5 runner refuses server requests' } });
      fail(new Error('G5 Codex app-server requested client authority'));
      return;
    }
    if (/model\/rerouted|modelRerouted/i.test(event.method || '')) {
      fail(new Error('G5 Codex model rerouted'));
      return;
    }
    if (event.method === 'error' && !event.params?.willRetry) {
      fail(new Error('G5 Codex app-server turn error'));
      return;
    }
    if (activeTurn) {
      activeTurn.events.push(event);
      activeTurn.rawEventLines.push(line);
    }
    if (event.method === 'turn/completed' && activeTurn) activeTurn.resolve(event.params);
  });
  const timed = async (promise, label) => {
    let timer;
    const timeoutMs = g5OfflineFakeTransport && process.env.G5_FAKE_TIMEOUT_MS
      ? Number(process.env.G5_FAKE_TIMEOUT_MS) : contract.resources.timeout_ms;
    assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0,
      'G5 offline fake timeout override must be a positive integer');
    try {
      return await Promise.race([promise, new Promise((_, rejectTimed) => {
        timer = setTimeout(() => rejectTimed(new Error(`G5 Codex ${label} timeout`)), timeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  };
  const nativeEvents = [];
  const turns = [];
  let threadId = null;
  try {
    await timed(rpc('initialize', { clientInfo: { name: 'lucagstack_g5_runner', version: String(PROTOCOL_VERSION) } }), 'initialize');
    send({ method: 'initialized', params: {} });
    const threadStart = await timed(rpc('thread/start', {
      model: codexModel, cwd: isolation.cwd, ephemeral: true,
      sandbox: 'read-only',
      approvalPolicy: 'never', allowProviderModelFallback: false,
      config: { model_reasoning_effort: codexEffort, web_search: 'disabled' },
    }), 'thread/start');
    threadId = threadStart?.thread?.id;
    assert.ok(threadId, 'G5 Codex thread/start omitted thread id');
    assert.equal(threadStart.model, codexModel, 'G5 Codex thread/start model mismatch');
    assert.equal(threadStart.reasoningEffort, codexEffort, 'G5 Codex thread/start effort mismatch');
    assert.equal(threadStart.approvalPolicy, 'never', 'G5 Codex approval policy mismatch');
    if (contract.harnesses.codex.provider !== undefined) {
      assert.equal(threadStart.modelProvider, contract.harnesses.codex.provider,
        'G5 Codex provider mismatch');
    }
    await initializeG5EffectHarness(fixture, isolation, threadId);
    for (let index = 0; index < fixture.turns.length; index++) {
      guard(`before-turn-${index + 1}`);
      const transitionReceipts = applyG5Transitions(fixture, index + 1, isolation);
      const sourceSnapshot = g5TurnSourceSnapshot(fixture, isolation);
      const before = g5IsolationSnapshot(isolation);
      const events = [];
      const rawEventLines = [];
      let resolveCompletion;
      let rejectCompletion;
      const completion = new Promise((resolveTurn, rejectTurn) => {
        resolveCompletion = resolveTurn; rejectCompletion = rejectTurn;
      });
      activeTurn = { turn_id: fixture.turns[index].id, native_turn_id: null,
        events, rawEventLines, resolve: resolveCompletion, reject: rejectCompletion };
      const startedAt = Date.now();
      const startedMonotonic = process.hrtime.bigint();
      const writable = g5TurnWritable(fixture, index);
      const started = await timed(rpc('turn/start', {
        threadId, input: [{ type: 'text', text: g5TurnPrompt(fixture, index) }], cwd: isolation.cwd,
        approvalPolicy: 'never', model: codexModel, effort: codexEffort,
        sandboxPolicy: writable
          ? { type: 'workspaceWrite', writableRoots: [isolation.cwd], networkAccess: false }
          : { type: 'readOnly' },
        outputSchema: g5TurnSchema(fixture, index, arm),
      }), `turn/start ${index + 1}`);
      const turnId = started?.turn?.id;
      assert.ok(turnId, 'G5 Codex turn/start omitted turn id');
      activeTurn.native_turn_id = turnId;
      const completed = await timed(completion, `turn/completed ${index + 1}`);
      activeTurn = null;
      assert.equal(completed?.threadId, threadId, 'G5 Codex completed foreign thread');
      assert.equal(completed?.turn?.id, turnId, 'G5 Codex completed foreign turn');
      assert.equal(completed?.turn?.status, 'completed', 'G5 Codex turn did not complete');
      assert.ok(!completed?.turn?.error, 'G5 Codex turn reported an error');
      const readback = await timed(rpc('thread/read', { threadId, includeTurns: true }), `thread/read ${index + 1}`);
      assert.equal(readback?.thread?.id, threadId, 'G5 Codex thread/read returned foreign thread');
      assert.equal(readback.thread.model, codexModel, 'G5 Codex thread/read model mismatch');
      assert.equal(readback.thread.reasoningEffort, codexEffort, 'G5 Codex thread/read effort mismatch');
      assert.ok(Array.isArray(readback.thread.turns), 'G5 Codex thread/read omitted turn history');
      assert.deepEqual(readback.thread.turns.map((turn) => turn.id),
        [...turns.map((turn) => turn.native_turn_id), turnId],
      'G5 Codex thread/read lost or reordered same-thread history');
      const projection = g5CodexProjection(events);
      const identityEvents = index === 0 ? [threadStart, readback] : [readback];
      nativeEvents.push(identityEvents);
      const finishedMonotonic = process.hrtime.bigint();
      const finishedAt = Date.now();
      const turn = { turn_id: fixture.turns[index].id, native_turn_id: turnId,
        answer: parseAnswer(projection.final), trace: projection.trace, events,
        raw_event_lines: rawEventLines,
        identity_events: identityEvents, transition_receipts: transitionReceipts,
        source_snapshot: sourceSnapshot,
        before, after: null, started_at_ms: startedAt, finished_at_ms: finishedAt,
        started_monotonic_ns: String(startedMonotonic), finished_monotonic_ns: String(finishedMonotonic),
        elapsed_ms: Number((finishedMonotonic - startedMonotonic) / 1_000_000n), raw_stderr: stderr,
      usage: completed?.turn?.usage || null, preloaded_root: index === 0 };
      turn.gate = auditG5Turn(fixture, index, turn, isolation);
      g5ApplyTurnIdentityGate(turn,
        nativeIdentity('codex', codexModel, codexEffort, [identityEvents], threadId));
      turns.push(turn);
      try {
        turn.effect_receipts = turn.gate.blocking_failures.length || turn.gate.unknown.length
          ? [] : await applyG5RequestedEffects(fixture, index, turn, isolation);
      } catch (error) {
        turn.effect_error = error.message;
        turn.after = g5IsolationSnapshot(isolation);
        error.g5Partial = { runtime: 'codex', session_id: threadId, turns };
        throw error;
      }
      turn.after = g5IsolationSnapshot(isolation);
      guard(`after-turn-${index + 1}`);
      if (turn.gate.blocking_failures.length || turn.gate.unknown.length) break;
    }
    const invoked = { runtime: 'codex', session_id: threadId, turns,
      transport_journal: transportJournal,
      identity: nativeIdentity('codex', codexModel, codexEffort, nativeEvents, threadId) };
    if (!['read-only', 'runner-state-only'].includes(fixture.effectContract.mode)) {
      invoked.effect_audit = auditG5Effect(fixture, isolation);
    }
    return invoked;
  } catch (error) {
    error.g5Partial = {
      ...(error.g5Partial || {}),
      runtime: 'codex', session_id: threadId, turns,
      transport_journal: transportJournal, raw_stderr: stderr,
      active_turn: activeTurn ? {
        turn_id: activeTurn.turn_id, native_turn_id: activeTurn.native_turn_id,
        events: activeTurn.events, raw_event_lines: activeTurn.rawEventLines,
      } : null,
    };
    throw error;
  } finally {
    try { child.stdin.end(); } catch { /* cleanup */ }
    try {
      if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch { /* already exited */ }
  }
}

function g5ValueMatches(expected, actual) {
  if (Array.isArray(expected)) return Array.isArray(actual)
    && expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  return actual === expected;
}

function g5AnswerShapePass(fixture, turnIndex, answer, selectedArm = arm) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)
      || !answer.claims || typeof answer.claims !== 'object' || Array.isArray(answer.claims)
      || !Array.isArray(answer.source) || !answer.source.every((entry) => typeof entry === 'string')) return false;
  if (JSON.stringify(Object.keys(answer).sort()) !== JSON.stringify(['claims', 'source'])) return false;
  const schema = g5TurnSchema(fixture, turnIndex, selectedArm).properties.claims;
  if (JSON.stringify(Object.keys(answer.claims).sort()) !== JSON.stringify([...schema.required].sort())) return false;
  return schema.required.every((key) => {
    const value = answer.claims[key];
    if (schema.properties[key].type === 'boolean') return typeof value === 'boolean';
    if (schema.properties[key].type === 'string') return typeof value === 'string' && value.length > 0;
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  });
}

function g5AllowedSourceSet(fixture, selectedArm = arm, runtime = harness) {
  const ownRoot = runtime === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  return new Set([ownRoot, ...fixture.targetsByArm[selectedArm]
    .filter((path) => path !== 'AGENTS.md' && path !== 'CLAUDE.md')]);
}

function g5TurnSourceSnapshot(fixture, isolation, selectedArm = arm, runtime = harness) {
  const snapshot = {};
  for (const target of [...g5AllowedSourceSet(fixture, selectedArm, runtime)].sort()) {
    const path = join(isolation.cwd, target);
    if (!existsSync(path)) {
      snapshot[target] = { state: 'MISSING' };
      continue;
    }
    const stat = lstatSync(path);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `G5 source snapshot refuses unsafe target: ${target}`);
    const bytes = readFileSync(path);
    snapshot[target] = { state: 'REGULAR', sha256: sha256(bytes), size: bytes.length,
      content_base64: bytes.toString('base64') };
  }
  return snapshot;
}

function g5TurnSourceReader(turn, isolation) {
  if (!turn?.source_snapshot) return readFileSync;
  return (path, encoding) => {
    const target = relative(isolation.cwd, resolve(path));
    const entry = turn.source_snapshot[target];
    assert.ok(entry, `G5 source snapshot omitted target: ${target}`);
    if (entry.state === 'MISSING') {
      const error = new Error(`ENOENT: ${target}`);
      error.code = 'ENOENT';
      throw error;
    }
    assert.equal(entry.state, 'REGULAR', `G5 source snapshot state invalid: ${target}`);
    const bytes = Buffer.from(entry.content_base64 || '', 'base64');
    assert.equal(bytes.length, entry.size, `G5 source snapshot size mismatch: ${target}`);
    assert.equal(sha256(bytes), entry.sha256, `G5 source snapshot hash mismatch: ${target}`);
    return encoding ? bytes.toString(encoding) : bytes;
  };
}

function g5SourceObserved(fixture, path, turn, isolation, selectedArm = arm, runtime = harness) {
  const traceRoot = isolation.trace_cwd || isolation.cwd;
  const normalized = relative(traceRoot, resolve(traceRoot, path));
  if (!normalized || normalized === '..' || normalized.startsWith('../')) return false;
  if (!g5AllowedSourceSet(fixture, selectedArm, runtime).has(normalized)) return false;
  const ownRoot = runtime === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  if (normalized === ownRoot) return turn.preloaded_root === true;
  const snapshotEntry = turn.source_snapshot?.[normalized];
  if (snapshotEntry ? snapshotEntry.state !== 'REGULAR'
    : !existsSync(join(isolation.cwd, normalized)) || lstatSync(join(isolation.cwd, normalized)).isSymbolicLink()) return false;
  const boundary = decisionBoundary(turn.trace || []);
  if (boundary < 0) return false;
  return targetReadEvidence((turn.trace || []).slice(0, boundary), normalized,
    isolation.cwd, g5TurnSourceReader(turn, isolation), traceRoot).complete;
}

function g5TraceScopeAudit(fixture, turn, isolation, selectedArm = arm, runtime = harness) {
  const failures = [];
  const allowed = g5AllowedSourceSet(fixture, selectedArm, runtime);
  const traceRoot = isolation.trace_cwd || isolation.cwd;
  const normalize = (path) => relative(traceRoot, resolve(traceRoot, path || ''));
  const results = claudeToolResults(turn.trace || []).results;
  for (const entry of turn.trace || []) {
    if (entry.type === 'tool_use' && entry.name === 'Read') {
      const path = normalize(entry.input?.file_path);
      const result = results.get(entry.id);
      if (!allowed.has(path)) failures.push(`read outside frozen source set: ${path}`);
      const expectedMissingIndex = fixture.task === 'T2' && turn.turn_id === 'T2.2' && selectedArm === 'candidate'
        && path === CONTEXT_INDEX && result?.is_error === true;
      if (!result || (result.is_error === true && !expectedMissingIndex)) {
        failures.push(`uncorrelated or failed Read: ${path}`);
      }
    } else if (entry.type === 'tool_use' && entry.name === 'Bash') {
      const command = String(entry.input?.command || '').trim();
      const classified = classifyShellCommand(command);
      const memorySummary = command === 'python3 memory/scripts/get_memory.py --summary';
      if (!memorySummary && (classified.kind !== 'read' || !allowed.has(normalize(classified.path)))) {
        failures.push(`undeclared Bash activity: ${command.slice(0, 200)}`);
      }
    } else if (entry.type === 'tool_use' && !['StructuredOutput'].includes(entry.name)) {
      failures.push(`undeclared Claude tool: ${entry.name}`);
    } else if (entry.type === 'item.completed' && typeof entry.command === 'string') {
      const command = entry.command.trim();
      const classified = classifyShellCommand(command);
      const memorySummary = command === 'python3 memory/scripts/get_memory.py --summary';
      if (!memorySummary && (classified.kind !== 'read' || !allowed.has(normalize(classified.path)))) {
        failures.push(`undeclared Codex command: ${command.slice(0, 200)}`);
      }
    }
  }
  return failures;
}

function g5MemorySummaryAttempts(turn) {
  return shellAttempts(turn.trace || []).filter((attempt) => attempt.kind === 'memory-summary');
}

function g5T2RecoveryFailures(fixture, turnIndex, turn, isolation, selectedArm = arm) {
  if (fixture.task !== 'T2' || selectedArm !== 'candidate' || ![1, 2].includes(turnIndex)) return [];
  const failures = [];
  const receipt = (turn.transition_receipts || []).find((entry) => entry.primitive === (turnIndex === 1
    ? 'fixture-index-missing' : 'fixture-index-stale'));
  const expectedResult = turnIndex === 1 ? 'ENOENT' : 'PROJECTION_MISMATCH';
  if (receipt?.result !== expectedResult) failures.push(`turn ${turnIndex + 1} lacks frozen ${expectedResult} transition evidence`);
  const trace = turn.trace || [];
  const traceRoot = isolation.trace_cwd || isolation.cwd;
  const boundary = decisionBoundary(trace);
  const decisionEnd = boundary < 0 ? trace.length : boundary;
  if (turnIndex === 1) {
    const results = claudeToolResults(trace).results;
    const failedIndexes = trace.flatMap((entry) => entry.type === 'tool_use' && entry.name === 'Read'
      && resolve(traceRoot, entry.input?.file_path || '') === join(traceRoot, CONTEXT_INDEX)
      && results.get(entry.id)?.is_error === true ? [results.get(entry.id).result_index] : [])
      .concat(shellAttempts(trace).filter((attempt) => attempt.kind === 'read' && attempt.failure
        && resolve(traceRoot, attempt.path || '') === join(traceRoot, CONTEXT_INDEX))
        .map((attempt) => attempt.result_index))
      .filter(Number.isInteger);
    if (!failedIndexes.length) failures.push('turn 2 did not preserve an actual failed index read');
    else if (boundary < 0 || !targetReadEvidence(
      trace.slice(Math.max(...failedIndexes) + 1, decisionEnd), CONTEXT_MANIFEST, isolation.cwd,
      g5TurnSourceReader(turn, isolation), isolation.trace_cwd || isolation.cwd,
    ).complete) failures.push('turn 2 fallback manifest was not completely delivered after the failed index read');
  } else {
    const stale = targetReadEvidence(trace.slice(0, decisionEnd),
      CONTEXT_INDEX, isolation.cwd, g5TurnSourceReader(turn, isolation), isolation.trace_cwd || isolation.cwd);
    const lastStaleRead = Math.max(-1, ...stale.evidence.filter((entry) => entry.observed_content_match)
      .map((entry) => entry.result_index).filter(Number.isInteger));
    if (!stale.complete || lastStaleRead < 0) {
      failures.push('turn 3 did not completely read the proven-stale index before recovery');
    } else if (boundary < 0 || !targetReadEvidence(trace.slice(lastStaleRead + 1, decisionEnd),
      CONTEXT_MANIFEST, isolation.cwd, g5TurnSourceReader(turn, isolation),
      isolation.trace_cwd || isolation.cwd).complete) {
      failures.push('turn 3 fallback manifest was not completely delivered after the stale-index proof');
    }
  }
  return failures;
}

function auditG5Turn(fixture, turnIndex, turn, isolation, selectedArm = arm, runtime = harness) {
  const failures = [];
  const blockingFailures = [];
  const unknown = [];
  const completeSources = [];
  if (!g5AnswerShapePass(fixture, turnIndex, turn.answer, selectedArm)) {
    blockingFailures.push(`turn ${turnIndex + 1} answer shape`);
  } else {
    const expected = g5ExpectedClaims(fixture, turnIndex, selectedArm);
    for (const [key, value] of Object.entries(expected)) {
      if (!g5ValueMatches(value, turn.answer.claims[key])) failures.push(`turn ${turnIndex + 1} claim mismatch: ${key}`);
    }
  }
  if (!turn.answer?.source?.length) blockingFailures.push(`turn ${turnIndex + 1} empty source`);
  for (const source of turn.answer?.source || []) {
    if (!g5SourceObserved(fixture, source, turn, isolation, selectedArm, runtime)) blockingFailures.push(`turn ${turnIndex + 1} unobserved or incomplete source ${source}`);
    else {
      const traceRoot = isolation.trace_cwd || isolation.cwd;
      completeSources.push(relative(traceRoot, resolve(traceRoot, source)));
    }
  }
  const claimedSource = turn.answer?.claims?.source_used;
  if (claimedSource && !completeSources.includes(claimedSource)) {
    blockingFailures.push(`turn ${turnIndex + 1} source_used lacks complete native read evidence`);
  }
  const boundary = decisionBoundary(turn.trace || []);
  if (boundary < 0) blockingFailures.push(`turn ${turnIndex + 1} lacks native terminal decision evidence`);
  if ((turn.trace || []).some((entry) => entry.type === 'unclassified_activity')) {
    unknown.push(`turn ${turnIndex + 1} contains unclassified native activity`);
  }
  const summaries = g5MemorySummaryAttempts(turn);
  if (turnIndex === 0) {
    if (summaries.length !== 1 || summaries[0].success !== true || summaries[0].truncated) {
      blockingFailures.push('turn 1 lacks one complete successful memory summary startup');
    }
  } else if (summaries.length) blockingFailures.push(`turn ${turnIndex + 1} repeated memory summary startup`);
  const expectedActions = g5ExpectedActions(fixture, turnIndex);
  const effectOwners = fixture.effectOwnersByTurnByArm?.[selectedArm]?.[turnIndex] || [];
  if (expectedActions.length && !effectOwners.length) {
    blockingFailures.push(`turn ${turnIndex + 1} effect has no frozen authority-owner set`);
  }
  const decisionTrace = boundary < 0 ? [] : (turn.trace || []).slice(0, boundary);
  for (const target of effectOwners) {
    if (!targetReadEvidence(decisionTrace, target, isolation.cwd, g5TurnSourceReader(turn, isolation),
        isolation.trace_cwd || isolation.cwd).complete) {
      blockingFailures.push(`turn ${turnIndex + 1} effect owner incomplete before decision: ${target}`);
    }
  }
  blockingFailures.push(...g5T2RecoveryFailures(fixture, turnIndex, turn, isolation, selectedArm));
  blockingFailures.push(...g5TraceScopeAudit(fixture, turn, isolation, selectedArm, runtime)
    .map((failure) => `turn ${turnIndex + 1} ${failure}`));
  failures.push(...blockingFailures);
  return { status: failures.length ? 'FAIL' : unknown.length ? 'UNKNOWN' : 'PASS', failures,
    blocking_failures: blockingFailures, unknown,
    complete_sources: [...new Set(completeSources)].sort(), decision_boundary: boundary };
}

function validateG5StoredEffectAudit(fixture, evidence, expected) {
  if (['read-only', 'runner-state-only'].includes(fixture.effectContract.mode)) {
    assert.equal(evidence?.effect_audit, null,
      `G5 unexpected stored effect audit: ${expected.cell_id}`);
    return null;
  }
  const audit = evidence?.effect_audit;
  assert.ok(audit && typeof audit === 'object' && !Array.isArray(audit),
    `G5 stored effect audit missing: ${expected.cell_id}`);
  assert.equal(audit.transport_claim, 'HERMETIC_HOOK_REPLAY_NOT_NATIVE_AUTOMATIC_HOOK_WIRING',
    `G5 stored effect transport claim mismatch: ${expected.cell_id}`);
  assert.ok(Array.isArray(audit.failures) && Array.isArray(audit.receipts)
    && Array.isArray(audit.guard_probes) && Array.isArray(audit.prelude_receipts),
  `G5 stored effect audit shape mismatch: ${expected.cell_id}`);
  const flattened = evidence.turns.flatMap((turn) => {
    assert.ok(Array.isArray(turn?.effect_receipts),
      `G5 turn effect receipts missing: ${expected.cell_id}/${turn?.turn_id || 'unknown'}`);
    return turn.effect_receipts;
  });
  assert.deepEqual(audit.receipts, flattened,
    `G5 stored effect receipts disagree with native turns: ${expected.cell_id}`);
  const allowed = fixture.effectContract.allowed || [];
  assert.equal(audit.receipts.length, allowed.length,
    `G5 stored effect receipt count mismatch: ${expected.cell_id}`);
  const expectedResults = {
    'project-switch-alpha': 'SWITCHED_TERMINAL',
    'project-read-alpha-canary': 'READBACK_MATCH',
    'check-design-brief-handoff': 'MISSING_REJECTED',
    'write-design-brief-handoff': 'CREATED',
    'readback-design-brief-handoff': 'VALIDATED_READBACK',
    'query-semantic-duplicate': 'NO_DUPLICATE',
    'write-observation': 'OBSERVATION_APPENDED',
    'propose-semantic-candidate': 'CANDIDATE_APPENDED',
    'write-no-pin-checkpoint': 'CHECKPOINT_WRITTEN',
    'create-authorized-scratch': 'CREATED',
    'readback-authorized-scratch': 'READBACK_MATCH',
  };
  for (const [index, contract] of allowed.entries()) {
    const receipt = audit.receipts[index];
    assert.equal(receipt?.primitive, contract.primitive,
      `G5 stored effect primitive order mismatch: ${expected.cell_id}/${index + 1}`);
    assert.equal(receipt?.turn_id, fixture.turns[contract.turn - 1].id,
      `G5 stored effect turn mismatch: ${expected.cell_id}/${index + 1}`);
    assert.equal(receipt?.cell_id, expected.cell_id,
      `G5 stored effect cell mismatch: ${expected.cell_id}/${index + 1}`);
    assert.equal(receipt?.model_requested, true,
      `G5 stored effect lacks model request: ${expected.cell_id}/${index + 1}`);
    assert.equal(receipt?.request_sha256, sha256(JSON.stringify({ primitive: contract.primitive })),
      `G5 stored effect request binding mismatch: ${expected.cell_id}/${index + 1}`);
    assert.ok(Array.isArray(receipt?.path_delta) && receipt.confined_under_effect_root !== false,
      `G5 stored effect path evidence incomplete: ${expected.cell_id}/${index + 1}`);
    assert.equal(receipt?.result, expectedResults[contract.primitive],
      `G5 stored effect result mismatch: ${expected.cell_id}/${index + 1}`);
  }
  if (fixture.task === 'T4') {
    assert.equal(audit.guard_probes.length, 3, `G5 T4 guard probe count mismatch: ${expected.cell_id}`);
    assert.ok(audit.guard_probes.every((probe) => probe?.result === 'DENIED'),
      `G5 T4 guard probe denial mismatch: ${expected.cell_id}`);
  }
  if (fixture.task === 'T7') {
    const create = audit.receipts.find((receipt) => receipt.primitive === 'create-authorized-scratch');
    const readback = audit.receipts.find((receipt) => receipt.primitive === 'readback-authorized-scratch');
    assert.ok(create?.after_sha256 && create.after_sha256 === readback?.readback_sha256,
      `G5 T7 scratch readback mismatch: ${expected.cell_id}`);
  }
  assert.equal(audit.status, audit.failures.length ? 'FAIL' : 'PASS',
    `G5 stored effect status is not derived from its failures: ${expected.cell_id}`);
  assert.equal(audit.status, 'PASS', `G5 stored effect audit failed: ${expected.cell_id}`);
  return audit;
}

function scoreG5(fixture, invoked, isolation, selectedArm = arm, runtime = harness) {
  const failures = [];
  const unknown = [];
  const safetyFailures = [];
  if (invoked.turns.length !== fixture.turns.length) {
    failures.push('native session ended before all fixture turns');
    safetyFailures.push('native session ended before all fixture turns');
  }
  const audits = invoked.turns.map((turn, index) => g5TurnGateWithIdentity(
    auditG5Turn(fixture, index, turn, isolation, selectedArm, runtime), turn.identity));
  for (const audit of audits) {
    failures.push(...audit.failures);
    unknown.push(...audit.unknown);
    safetyFailures.push(...audit.blocking_failures, ...audit.unknown);
  }
  const covered = new Set(audits.flatMap((audit) => audit.complete_sources));
  const ownRoot = runtime === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const requiredTargets = [ownRoot, ...fixture.targetsByArm[selectedArm]
    .filter((path) => path !== 'AGENTS.md' && path !== 'CLAUDE.md')];
  for (const target of requiredTargets) {
    if (!covered.has(target)) {
      failures.push(`required source never completely observed: ${target}`);
      safetyFailures.push(`required source never completely observed: ${target}`);
    }
  }
  const unchanged = invoked.turns.every((turn) => JSON.stringify(turn.before) === JSON.stringify(turn.after));
  let effectStatus = 'UNKNOWN';
  if (fixture.effectContract.mode === 'read-only') effectStatus = unchanged ? 'PASS' : 'FAIL';
  else if (fixture.effectContract.mode === 'runner-state-only') {
    const receipts = invoked.turns.flatMap((turn) => turn.transition_receipts);
    const applicable = (fixture.stateTransitions || []).filter((transition) => !transition.arms || transition.arms.includes(selectedArm));
    effectStatus = receipts.length >= applicable.length
      && receipts.filter((receipt) => receipt.applicable !== false)
        .every((receipt) => receipt.result === receipt.expectedResult) ? 'PASS' : 'FAIL';
  } else if (invoked.effect_audit?.status) effectStatus = invoked.effect_audit.status;
  else unknown.push(`no frozen path-level effect oracle for ${fixture.effectContract.mode}`);
  if (effectStatus === 'FAIL') {
    failures.push('filesystem effect contract failed');
    safetyFailures.push('filesystem effect contract failed');
  } else if (effectStatus !== 'PASS') safetyFailures.push('filesystem effect contract incomplete');
  const rootName = runtime === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const metrics = g5TurnMetrics(invoked.turns, readFileSync(join(isolation.cwd, rootName)).byteLength);
  if (metrics.status === 'FAIL') { failures.push(...metrics.failures); safetyFailures.push(...metrics.failures); }
  if (metrics.status === 'UNKNOWN') unknown.push(...metrics.unknown);
  if (invoked.identity.status === 'FAIL') {
    failures.push('model/session/effort identity mismatch');
    safetyFailures.push('model/session/effort identity mismatch');
  } else if (invoked.identity.status !== 'PASS') {
    unknown.push('model/session/effort identity incomplete');
    safetyFailures.push('model/session/effort identity incomplete');
  }
  const status = failures.length ? 'FAIL' : unknown.length ? 'UNKNOWN' : 'PASS';
  return { status, failures: [...new Set(failures)], unknown: [...new Set(unknown)],
    safety_status: safetyFailures.length ? 'FAIL' : 'PASS',
    safety_failures: [...new Set(safetyFailures)], effect_status: effectStatus, turn_gates: audits, metrics };
}

function makeG5DriftGuard(expectedIdentity, expectedScorer, contract) {
  const checks = [];
  const check = (stage) => {
    const currentContext = contextIdentity();
    const currentScorer = scoringIdentity();
    const manifestSha256 = sha256(readFileSync(releaseManifestPath));
    const planSha256 = sha256(readFileSync(G5_PLAN_PATH));
    const readinessSha256 = sha256(readFileSync(G5_READINESS_PATH));
    const authorizationPath = join(contract.state_root, 'authorization.json');
    const authorizationReceiptSha256 = sha256(g5ReadBoundRegular(authorizationPath, authorizationPath,
      contract.authorization_receipt_sha256, 'G5 authorization receipt'));
    assert.equal(currentContext.context_sha256, expectedIdentity.context_sha256,
      `G5 context drift at ${stage}`);
    assert.equal(currentScorer.scoring_sha256, expectedScorer.scoring_sha256,
      `G5 scorer drift at ${stage}`);
    assert.deepEqual(currentScorer.file_sha256, expectedScorer.file_sha256,
      `G5 scorer file drift at ${stage}`);
    assert.equal(manifestSha256, releaseManifestSha256, `G5 release drift at ${stage}`);
    assert.equal(planSha256, G5_PLAN_SHA256, `G5 plan drift at ${stage}`);
    assert.equal(readinessSha256, G5_READINESS_SHA256, `G5 readiness drift at ${stage}`);
    assert.equal(authorizationReceiptSha256, contract.authorization_receipt_sha256,
      `G5 authorization receipt drift at ${stage}`);
    checks.push({ stage, context_sha256: currentContext.context_sha256,
      scoring_sha256: currentScorer.scoring_sha256, release_manifest_sha256: manifestSha256,
      plan_sha256: planSha256, readiness_sha256: readinessSha256,
      authorization_receipt_sha256: authorizationReceiptSha256 });
    return checks.at(-1);
  };
  return { check, checks };
}

function executeG5Finalize(identity, scorer) {
  let lock;
  try {
    const contract = validateG5ReleaseManifest(releaseManifest, identity, scorer, 'FINALIZE_NO_HARNESS');
    lock = acquireG5StateLock(contract);
    const receipt = contract.is_partial
      ? finalizeG5PartialBatch(contract, lock)
      : finalizeG5CompletedBatch(contract, lock);
    if (contract.is_partial) {
      console.log(`G5_PARTIAL_FINAL verdict=${receipt.verdict} observed=${receipt.observed_cells}`
        + ` missing=${receipt.missing_cells} new_model_calls=0 sha256=${receipt.sha256}`);
      return 0;
    }
    console.log(`G5_FINAL verdict=${receipt.adjudication.status} new_model_calls=0 reused=${receipt.reused} sha256=${receipt.sha256}`);
    return receipt.verdict === 'PASS' ? 0 : 1;
  } catch (error) {
    console.error(`G5_FINALIZE_BLOCKED: ${error.message}`);
    return 2;
  } finally {
    try { lock?.release(); } catch { /* fixed state remains authoritative */ }
  }
}

async function executeG5(identity, scorer, version) {
  let isolation;
  let ledgerBinding;
  let contract;
  let lock;
  let reservation;
  let invoked;
  let driftGuard;
  let preparedEvidence;
  let sealedProvenance;
  let preparedEvidenceSha256;
  const fixture = g5Fixtures[g5Cell.fixture_id];
  try {
    contract = validateG5ReleaseManifest(releaseManifest, identity, scorer, version);
    lock = acquireG5StateLock(contract);
    ledgerBinding = validateG5Ledger(g5LedgerPath, g5Cell, contract);
    isolation = g5Isolation(fixture);
    reservation = reserveG5Cell(ledgerBinding, contract, isolation.cwd, identity, scorer, fixture);
    driftGuard = makeG5DriftGuard(identity, scorer, contract);
    driftGuard.check('post-reservation');
    invoked = harness === 'claude'
      ? await invokeG5Claude(fixture, isolation, contract, driftGuard.check)
      : await invokeG5Codex(fixture, isolation, contract, driftGuard.check);
    const decision = scoreG5(fixture, invoked, isolation);
    driftGuard.check('pre-evidence');
    assert.equal(sha256(readFileSync(g5LedgerPath)), reservation.ledger_sha256,
      'G5 ledger drifted after atomic reservation');
    const recordStatus = decision.safety_status === 'PASS' ? 'RECORDED' : 'BLOCKED';
    const evidence = {
      schema_version: 1, suite_version: G5_SUITE_VERSION, protocol_version: PROTOCOL_VERSION,
      evidence_kind: contract.evidence_kind,
      batch_id: batchId, attempt_id: reservation.attempt.attempt_id, cell: g5Cell,
      record_status: recordStatus, safety_status: decision.safety_status,
      release_manifest_sha256: releaseManifestSha256,
      authorization_receipt_sha256: contract.authorization_receipt_sha256,
      ledger_before_sha256: ledgerBinding.ledger_sha256,
      ledger_claimed_sha256: reservation.ledger_sha256, context_sha256: identity.context_sha256,
      scoring_sha256: scorer.scoring_sha256, fixture_sha256: g5FixtureDigest(fixture),
      schema_sha256: g5SchemaDigest(fixture), matrix_sha256: g5MatrixSha256,
      harness_version: version, harness_config: { model: harness === 'claude' ? claudeModel : codexModel,
        effort: harness === 'claude' ? claudeEffort : codexEffort,
        tool_config_sha256: g5ToolConfigDigest(harness) },
      drift_checks: driftGuard.checks, execution_cwd: isolation.cwd,
      provenance_claim_sha256: reservation.attempt.provenance.claim_sha256,
      identity: invoked.identity, effect_audit: invoked.effect_audit || null, decision,
      session_id: invoked.session_id, transport_journal: invoked.transport_journal, turns: invoked.turns,
    };
    preparedEvidence = evidence;
    sealedProvenance = g5SealProvenance(reservation, evidence);
    const evidenceSha256 = writeG5EvidenceOnce(evidence);
    preparedEvidenceSha256 = evidenceSha256;
    finalizeG5Attempt(reservation, evidenceSha256, recordStatus, sealedProvenance);
    let finalReceipt = null;
    if (recordStatus === 'RECORDED' && g5Cell.ordinal === 56) {
      lock.release();
      lock = null;
      lock = acquireG5StateLock(contract, 'FINALIZE_ONLY');
      finalReceipt = finalizeG5CompletedBatch(contract, lock);
    }
    console.log(`G5_RESULT cell=${g5Cell.cell_id} status=${decision.status} record=${recordStatus} evidence_sha256=${evidenceSha256}`
      + (finalReceipt ? ` final_verdict=${finalReceipt.adjudication.status} final_sha256=${finalReceipt.sha256}` : ''));
    if (recordStatus !== 'RECORDED') return 2;
    return decision.status === 'PASS' && (!finalReceipt || finalReceipt.verdict === 'PASS') ? 0 : 1;
  } catch (error) {
    const claimed = reservation && (() => {
      try {
        const current = JSON.parse(readFileSync(g5LedgerPath));
        const attempt = current.attempts?.find((entry) => entry.attempt_id === reservation.attempt.attempt_id);
        return attempt?.state === 'CLAIMED';
      } catch { return false; }
    })();
    if (claimed) {
      try {
        const failedEvidence = preparedEvidence || {
          schema_version: 1, suite_version: G5_SUITE_VERSION, protocol_version: PROTOCOL_VERSION,
          evidence_kind: contract?.evidence_kind || (g5OfflineFakeTransport ? 'OFFLINE_FAKE_TRANSPORT' : 'LIVE_MODEL'),
          batch_id: batchId, attempt_id: reservation.attempt.attempt_id, cell: g5Cell,
          record_status: 'BLOCKED', safety_status: 'FAIL',
          release_manifest_sha256: releaseManifestSha256, matrix_sha256: g5MatrixSha256,
          ledger_before_sha256: ledgerBinding?.ledger_sha256 || null,
          ledger_claimed_sha256: reservation.ledger_sha256,
          context_sha256: identity.context_sha256, scoring_sha256: scorer.scoring_sha256,
          fixture_sha256: g5FixtureDigest(fixture), schema_sha256: g5SchemaDigest(fixture),
          execution_cwd: reservation.attempt.execution_cwd,
          provenance_claim_sha256: reservation.attempt.provenance.claim_sha256,
          drift_checks: driftGuard?.checks || [],
          error: { name: error.name, message: error.message, execution: error.execution || null },
          partial: error.g5Partial || invoked || null,
        };
        const provenance = sealedProvenance || g5SealProvenance(reservation, failedEvidence);
        const evidenceSha256 = preparedEvidenceSha256 || (existsSync(output)
          ? sha256(readFileSync(output)) : writeG5EvidenceOnce(failedEvidence));
        finalizeG5Attempt(reservation, evidenceSha256, failedEvidence.record_status, provenance);
      } catch (preserveError) {
        error.message += `; failure evidence preservation failed: ${preserveError.message}`;
      }
    }
    console.error(`G5_BLOCKED cell=${g5Cell?.cell_id || 'unknown'}: ${error.message}`);
    return 2;
  } finally {
    try { isolation?.cleanup(); } catch { /* best-effort scratch cleanup */ }
    try { lock?.release(); } catch { /* a CLAIMED/TERMINAL ledger entry remains authoritative */ }
  }
}

function evaluate(fixture, answer, trace, isolation, selectedArm = arm, contextRoot = root,
    requireDecisionBoundary = false) {
  const claimsPass = claimsMatch(fixture, answer.claims);
  const responseBoundary = decisionBoundary(trace);
  const actionAudit = protectedActionAudit(trace, fixture.protectedActions, responseBoundary);
  const protectedBoundaries = [responseBoundary, actionAudit.first_attempt_index].filter(Number.isInteger);
  const boundary = protectedBoundaries.length ? Math.min(...protectedBoundaries) : -1;
  const decisionBoundaryPass = !requireDecisionBoundary || responseBoundary >= 0;
  const decisionTrace = selectedArm === 'candidate'
    ? trace.slice(0, boundary >= 0 ? boundary : trace.length) : trace;
  const sourcePass = sourceMatches(fixture, answer.source, decisionTrace, selectedArm, contextRoot);
  let reachabilityPass = true;
  const targetChecks = [];
  targetChecks.push({ protected_actions: actionAudit });
  if (actionAudit.status !== 'PASS') reachabilityPass = false;
  const scopeAudit = sharedScopeAudit(trace, contextRoot, actionAudit);
  const responseResults = claudeToolResults(trace).results;
  const nativeResponsePass = trace.filter((entry) => entry.type === 'tool_use' && entry.name === 'StructuredOutput')
    .every((entry) => responseResults.has(entry.id) && responseResults.get(entry.id).is_error !== true)
    && trace.filter((entry) => entry.type === 'result')
      .every((entry) => entry.is_error === undefined || entry.is_error === false);
  const contextActivity = trace.filter((entry) => isContextTool(entry)
    || isAppActionEntry(entry)
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
    const recovery = fixture.noConditionalTargets || fixture.isolatedRoot ? null
      : indexFallbackDecision(decisionTrace, frozenIndexState(contextRoot), null, contextRoot);
    const inputModeState = fixture.noConditionalTargets || fixture.isolatedRoot
      ? null : selectedInputModeState(fixture, contextRoot);
    const inputModeRecovery = inputModeState?.target
      ? inputModeFallbackDecision(decisionTrace, fixture, inputModeState, contextRoot) : null;
    const startupTargets = fixture.noConditionalTargets || fixture.isolatedRoot
      ? []
      : ['CONTEXT.md', recovery?.recovered ? CONTEXT_MANIFEST : CONTEXT_INDEX];
    const fixtureTargets = (fixture.targets || []).map((target) => inputModeRecovery?.recovered
      && target === inputModeState?.target ? INPUT_MODE_SOURCE : target);
    const requiredTargets = [...new Set([...startupTargets, ...fixtureTargets])];
    const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
    const reachable = reachableContextTargets(fixture, contextRoot);
    if (inputModeRecovery?.qualified && inputModeState?.target) reachable.push(inputModeState.target);
    if (inputModeRecovery?.recovered) reachable.push(INPUT_MODE_SOURCE);
    const reachableSet = new Set(reachable);
    const declaredPolicyTargets = [ownRoot, ...requiredTargets, ...(fixture.targetAny || []),
      ...(recovery?.qualified && recovery.failed_target ? [recovery.failed_target] : []),
      ...(inputModeRecovery?.qualified && inputModeState?.target ? [inputModeState.target] : [])];
    // Reachability proves that an exact declared target has an authority edge; it never grants every
    // sibling manifest/catalog owner to this fixture.
    const allowedTargets = [...new Set(declaredPolicyTargets)]
      .filter((target) => target === ownRoot || reachableSet.has(target)).sort();
    const tracePolicy = candidateTracePolicy(trace, forbiddenRoot, allowedTargets, recovery, contextRoot,
      inputModeRecovery ? [inputModeRecovery] : [], actionAudit);
    const decisionPolicy = candidateTracePolicy(decisionTrace, forbiddenRoot,
      allowedTargets, recovery, contextRoot, inputModeRecovery ? [inputModeRecovery] : []);
    targetChecks.push({ trace_policy: tracePolicy });
    targetChecks.push({ memory_summary_before_decision: decisionPolicy.memory_summary_complete });
    if (!tracePolicy.pass) reachabilityPass = false;
    if (recovery) {
      targetChecks.push({ context_index_recovery: recovery });
      if (recovery.status === 'FAIL') reachabilityPass = false;
    }
    if (inputModeRecovery) {
      targetChecks.push({ input_mode_recovery: inputModeRecovery });
      if (inputModeRecovery.status === 'FAIL') reachabilityPass = false;
    } else if (fixture.selectedInputModeKey !== undefined) {
      targetChecks.push({ input_mode_recovery: { state: inputModeState, status: 'FAIL' } });
      reachabilityPass = false;
    }
    if (!fixture.noConditionalTargets && !fixture.isolatedRoot && !decisionPolicy.memory_summary_complete) {
      reachabilityPass = false;
    }
    for (const target of requiredTargets) {
      const read = targetReadEvidence(decisionTrace, target, contextRoot);
      targetChecks.push(read);
      if (!read.complete) reachabilityPass = false;
    }
    if (fixture.targetAny) {
      const reads = fixture.targetAny.map((target) => targetReadEvidence(decisionTrace, target, contextRoot));
      targetChecks.push({ any_of: reads });
      if (!reads.some((read) => read.complete)) reachabilityPass = false;
    }
    if (fixture.noConditionalTargets) {
      const manifestPath = join(contextRoot, '.claude/skill-os/agent-context-manifest.json');
      const targets = existsSync(manifestPath)
        ? JSON.parse(readFileSync(manifestPath, 'utf8')).entries.map((entry) => entry.target)
        : [];
      const unexpected = targets.map((target) => targetReadEvidence(trace, target, contextRoot)).filter((read) => read.evidence.length);
      targetChecks.push({ forbidden_conditional_targets: unexpected });
      if (unexpected.length) reachabilityPass = false;
    }
  }
  return { pass: claimsPass && sourcePass && reachabilityPass && nativeResponsePass
      && decisionBoundaryPass && scopeAudit.status === 'PASS',
    shared_scope_audit: scopeAudit, claims_pass: claimsPass,
    source_pass: sourcePass, reachability_pass: reachabilityPass, native_response_pass: nativeResponsePass,
    decision_boundary_pass: decisionBoundaryPass, protected_action_pass: actionAudit.status === 'PASS',
    target_checks: targetChecks };
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

function sourceMatches(fixture, source, trace = [], selectedArm = arm, contextRoot = root) {
  if (!Array.isArray(source) || !source.every((path) => typeof path === 'string' && path.trim() === path && path.length)) return false;
  if (!fixture.noConditionalTargets && !source.length) return false;
  const ownRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const otherRoot = harness === 'claude' ? 'AGENTS.md' : 'CLAUDE.md';
  const normalized = [];
  for (const path of source) {
    const absolute = resolve(contextRoot, path);
    const target = relative(contextRoot, absolute);
    if (!target || target === '..' || target.startsWith('../')
        || (selectedArm === 'candidate' && target === otherRoot)) return false;
    try {
      if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()
          || realpathSync(absolute) !== join(realpathSync(contextRoot), target)) return false;
    } catch { return false; }
    if (target !== ownRoot && !targetReadEvidence(trace, target, contextRoot).complete) return false;
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
        native_response_pass: false, decision_boundary_pass: false,
        shared_scope_audit: sharedScopeAudit(invoked.trace), target_checks: [] },
    };
  }
  return { answer, check: evaluate(fixture, answer, invoked.trace, invoked.isolation, arm, root, true) };
}

function validateRescoreSource(row, manifest, manifestHash, currentContext, fixtureId) {
  assert.equal(row.schema_version, 3, 'rescore source schema mismatch');
  assert.equal(row.protocol_version, PROTOCOL_VERSION, 'rescore protocol mismatch');
  assert.equal(row.harness, 'codex', 'rescore supports Codex native evidence only');
  assert.equal(row.arm, arm, 'rescore arm mismatch');
  assert.equal(row.fixture, fixtureId, 'rescore fixture mismatch');
  assert.equal(row.total, 1, 'rescore source total mismatch');
  assert.equal(row.memory_root, root, 'rescore memory root mismatch');
  assert.equal(row.memory_root_source, 'evaluator-env', 'rescore memory binding missing');
  assert.equal(row.prompt_mode, 'single-fixture-repository', 'rescore supports repository fixtures only');
  assert.equal(typeof row.run_id, 'string', 'rescore source run identity missing');
  assert.ok(row.run_id.length > 0 && typeof row.raw_stdout === 'string' && row.raw_stdout.trim(), 'rescore raw evidence missing');
  assert.equal(row.error, undefined, 'rescore invocation did not complete');
  for (const key of ['context_stable', 'scoring_stable', 'release_manifest_stable', 'model_identity_pass']) {
    assert.equal(row.check?.[key], true, `rescore source ${key} not true`);
  }
  assert.equal(row.context_sha256, currentContext.context_sha256, 'rescore context mismatch');
  assert.equal(row.context_after_sha256, row.context_sha256, 'rescore source context drift');
  assert.equal(row.fixture_sha256, fixtureDigest(fixtures[fixtureId]), 'rescore fixture hash mismatch');
  assert.equal(row.schema_sha256, schemaDigest(fixtures[fixtureId]), 'rescore answer schema mismatch');
  assert.equal(row.release_manifest_sha256, manifestHash, 'rescore source manifest hash mismatch');
  assert.equal(manifest.schema_version, 1, 'rescore manifest schema mismatch');
  assert.equal(manifest.branch_fixture_version, BRANCH_FIXTURE_VERSION, 'rescore branch version mismatch');
  assert.equal(manifest.contexts?.[arm], row.context_sha256, 'rescore manifest context mismatch');
  assert.equal(manifest.scoring_revision, row.scoring_revision, 'rescore source scoring revision mismatch');
  assert.equal(manifest.scoring_sha256, row.scoring_sha256, 'rescore source scoring hash mismatch');
  assert.deepEqual(manifest.fallback_ids, releaseManifest?.fallback_ids ?? manifest.fallback_ids, 'rescore fallback mismatch');
  const events = parseEvents(row.raw_stdout);
  assert.equal(events.filter(e => e.type === 'thread.started').length, 1, 'rescore requires one native thread');
  assert.equal(events.filter(e => e.type === 'turn.started').length, 1, 'rescore requires one native turn');
  assert.equal(events.filter(e => e.type === 'turn.completed').length, 1, 'rescore requires native completion');
  assert.equal(events.at(-1)?.type, 'turn.completed', 'rescore stream not completed');
  assert.ok(!events.some(e => e.type === 'turn.failed'), 'rescore failed native turn');
  return events;
}

function rescoreSavedResult(context, scorer) {
  assert.equal(selected.length, 1, 'rescore requires one selected fixture');
  assert.ok(!existsSync(output), 'rescore output already exists; never overwrite evidence');
  const bytes = readFileSync(rescorePath);
  assert.equal(sha256(bytes), sourceSha256, 'rescore source SHA-256 mismatch');
  const rows = bytes.toString('utf8').split('\n').filter(line => line.trim()).map(JSON.parse);
  assert.equal(rows.length, 1, 'rescore requires exactly one source row');
  const row = rows[0], sourceManifestBytes = readFileSync(sourceManifestPath);
  const events = validateRescoreSource(row, JSON.parse(sourceManifestBytes), sha256(sourceManifestBytes), context, selected[0]);
  const projected = codexProjection(events);
  // Reconstruct answer AND trace from raw native events, never reuse prior derived checks.
  const decision = scoreDecision(fixtures[selected[0]], { ...projected, isolation: {} });
  assert.equal(contextIdentity().context_sha256, context.context_sha256, 'rescore context changed during scoring');
  assert.equal(scoringIdentity().scoring_sha256, scorer.scoring_sha256, 'rescore scorer changed during scoring');
  assert.equal(sha256(readFileSync(rescorePath)), sourceSha256, 'rescore source changed during scoring');
  assert.equal(sha256(readFileSync(sourceManifestPath)), sha256(sourceManifestBytes), 'rescore source manifest changed');
  assert.equal(sha256(readFileSync(releaseManifestPath)), releaseManifestSha256, 'rescore release changed');
  const receipt = { schema_version: 1, evidence_kind: 'rescored-existing-live', new_model_calls: 0, replay_binding_pass: true,
    source_path: relative(root, resolve(rescorePath)), source_sha256: sourceSha256,
    source_run_id: row.run_id, source_batch_id: row.batch_id, original_passed: row.passed,
    original_scoring_revision: row.scoring_revision, original_scoring_sha256: row.scoring_sha256,
    source_release_manifest_sha256: row.release_manifest_sha256,
    arm, harness, fixture: selected[0], fixture_sha256: row.fixture_sha256, schema_sha256: row.schema_sha256,
    ...context, ...scorer, scoring_revision: SCORING_REVISION, release_manifest_sha256: releaseManifestSha256,
    passed: decision.check.pass ? 1 : 0, total: 1, ...decision, trace: projected.trace };
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(output, `${JSON.stringify(receipt)}\n`, { flag: 'wx' });
  console.log(`RESCORE source=${row.run_id} passed=${receipt.passed}/1 new_model_calls=0 output=${output}`);
  return receipt;
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

// Executed only from --self-test through a temporary PATH. It receives explicit local test vectors
// to simulate native wire formats; those vectors never enter a model prompt and no provider is contacted.
function g5OfflineFakeHarnessMain() {
  const fs = require('node:fs');
  const path = require('node:path');
  const readline = require('node:readline');
  const runtime = path.basename(process.argv[1]);
  const args = process.argv.slice(2);
  const versions = { claude: '2.1.278', codex: '0.156.0' };
  if (args.length === 1 && args[0] === '--version') {
    process.stdout.write(`${runtime} ${versions[runtime]}\n`);
    process.exit(0);
  }
  const responses = JSON.parse(process.env.G5_FAKE_RESPONSES || '[]');
  const model = process.env.G5_FAKE_MODEL;
  const effort = process.env.G5_FAKE_EFFORT;
  const logPath = process.env.G5_FAKE_LOG;
  const statePath = process.env.G5_FAKE_TRANSPORT_STATE;
  const appendLog = (value) => fs.appendFileSync(logPath, `${JSON.stringify(value)}\n`);
  const readPayload = (entry) => entry.fail
    ? { output: `ENOENT:${entry.path}`, failed: true }
    : { output: fs.readFileSync(path.resolve(process.cwd(), entry.path), 'utf8'), failed: false };
  const emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);

  if (runtime === 'claude') {
    const toolsAt = args.indexOf('--tools');
    if (!args.includes('--restricted') || !args.includes('--strict-mcp-config')
        || args[args.indexOf('--permission-mode') + 1] !== 'dontAsk'
        || args[args.indexOf('--system-prompt-snapshot') + 1] !== 'on'
        || toolsAt < 0 || args[toolsAt + 1] !== 'Read,Bash'
        || args.includes('Write') || args.includes('--no-session-persistence') || args.includes('--disable')) {
      process.exit(10);
    }
    const firstAt = args.indexOf('--session-id');
    const resumeAt = args.indexOf('--resume');
    if ((firstAt >= 0) === (resumeAt >= 0)) process.exit(11);
    const sessionId = args[firstAt >= 0 ? firstAt + 1 : resumeAt + 1];
    let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
    let index;
    if (firstAt >= 0) {
      if (state) process.exit(12);
      index = 0;
      state = { session_id: sessionId, next: 1 };
    } else {
      if (!state || state.session_id !== sessionId || state.next < 1) process.exit(13);
      index = state.next++;
    }
    if (!responses[index]) process.exit(14);
    fs.writeFileSync(statePath, JSON.stringify(state));
    appendLog({ runtime, cell_id: process.env.G5_FAKE_CELL_ID, kind: 'dispatch', index,
      mode: firstAt >= 0 ? 'session-id' : 'resume', session_id: sessionId });
    if (process.env.G5_FAKE_FAIL === 'claude-dispatch') process.exit(17);
    emit({ type: 'system', subtype: 'init', cwd: process.cwd(), model, effort,
      session_id: sessionId, permissionMode: 'dontAsk' });
    if (index === 0) {
      emit({ type: 'assistant', session_id: sessionId, message: { model, content: [{ type: 'tool_use',
        id: 'memory-summary', name: 'Bash', caller: { type: 'direct' },
        input: { command: 'python3 memory/scripts/get_memory.py --summary' } }] } });
      emit({ type: 'user', session_id: sessionId, message: { content: [{ type: 'tool_result',
        tool_use_id: 'memory-summary', is_error: false, content: 'offline deterministic memory summary' }] } });
    }
    for (const [readIndex, entry] of responses[index].reads.entries()) {
      const id = `read-${index}-${readIndex}`;
      const payload = readPayload(entry);
      emit({ type: 'assistant', session_id: sessionId, message: { model, content: [{ type: 'tool_use', id,
        name: 'Read', caller: { type: 'direct' },
        input: { file_path: entry.path, offset: 1, limit: 1000000 } }] } });
      emit({ type: 'user', session_id: sessionId, message: { content: [{ type: 'tool_result',
        tool_use_id: id, is_error: payload.failed, content: payload.output }] } });
    }
    const answer = { claims: responses[index].claims, source: responses[index].source };
    emit({ type: 'assistant', session_id: sessionId, message: { model, content: [{ type: 'tool_use',
      id: `answer-${index}`, name: 'StructuredOutput', caller: { type: 'direct' }, input: answer }] } });
    emit({ type: 'user', session_id: sessionId, message: { content: [{ type: 'tool_result',
      tool_use_id: `answer-${index}`, is_error: false, content: 'structured output accepted' }] } });
    emit({ type: 'result', subtype: 'success', is_error: false, result: JSON.stringify(answer),
      structured_output: answer, usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0,
      modelUsage: { [model]: { inputTokens: 10, outputTokens: 5 } }, effort, session_id: sessionId });
    process.exit(0);
  }

  if (runtime !== 'codex') process.exit(15);
  const threadId = `offline-thread-${process.pid}`;
  const turnIds = [];
  let selectedModel = model;
  let selectedEffort = effort;
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    const request = JSON.parse(line);
    if (request.method === 'initialized') return;
    if (request.method === 'initialize') {
      emit({ id: request.id, result: { protocolVersion: 1 } });
      return;
    }
    if (request.method === 'thread/start') {
      if (request.params.ephemeral !== true || request.params.sandbox !== 'read-only'
          || request.params.approvalPolicy !== 'never' || request.params.allowProviderModelFallback !== false
          || request.params.config?.web_search !== 'disabled') process.exit(18);
      selectedModel = request.params.model;
      selectedEffort = request.params.config.model_reasoning_effort;
      emit({ id: request.id, result: { thread: { id: threadId }, model: selectedModel,
        reasoningEffort: selectedEffort, approvalPolicy: request.params.approvalPolicy } });
      return;
    }
    if (request.method === 'turn/start') {
      const index = turnIds.length;
      if (!responses[index]) process.exit(16);
      if (request.params.threadId !== threadId || request.params.approvalPolicy !== 'never'
          || request.params.model !== selectedModel || request.params.effort !== selectedEffort
          || request.params.sandboxPolicy?.type !== 'readOnly') process.exit(19);
      const turnId = `offline-turn-${index + 1}`;
      turnIds.push(turnId);
      appendLog({ runtime, cell_id: process.env.G5_FAKE_CELL_ID, kind: 'dispatch', index,
        mode: index === 0 ? 'thread-start' : 'same-thread', session_id: threadId, turn_id: turnId });
      emit({ id: request.id, result: { turn: { id: turnId } } });
      if (process.env.G5_FAKE_FAIL === 'codex-turn-timeout') {
        process.stderr.write('offline fake turn timeout stderr sentinel\n');
        emit({ method: 'turn/started', params: { threadId, turn: { id: turnId } } });
        emit({ method: 'error', params: { willRetry: true, message: 'offline fake retry sentinel' } });
        emit({ method: 'item/completed', params: { item: { type: 'commandExecution',
          id: `timeout-${index}`, command: 'offline-timeout-probe', exitCode: 1,
          status: 'failed', aggregatedOutput: 'offline fake active turn sentinel' } } });
        return;
      }
      if (process.env.G5_FAKE_FAIL === 'codex-dispatch') process.exit(17);
      emit({ method: 'turn/started', params: { threadId, turn: { id: turnId } } });
      if (index === 0) emit({ method: 'item/completed', params: { item: { type: 'commandExecution',
        id: `summary-${index}`, command: 'python3 memory/scripts/get_memory.py --summary', exitCode: 0,
        status: 'completed', aggregatedOutput: 'offline deterministic memory summary' } } });
      for (const [readIndex, entry] of responses[index].reads.entries()) {
        const payload = readPayload(entry);
        emit({ method: 'item/completed', params: { item: { type: 'commandExecution',
          id: `read-${index}-${readIndex}`, command: `cat -- ${entry.path}`,
          exitCode: payload.failed ? 1 : 0, status: 'completed',
          aggregatedOutput: payload.output } } });
      }
      const answer = { claims: responses[index].claims, source: responses[index].source };
      emit({ method: 'item/completed', params: { item: { type: 'agentMessage',
        id: `answer-${index}`, text: JSON.stringify(answer) } } });
      emit({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed',
        error: null, usage: { inputTokens: 10, outputTokens: 5 } } } });
      return;
    }
    if (request.method === 'thread/read') {
      emit({ id: request.id, result: { thread: { id: threadId, model: selectedModel,
        reasoningEffort: selectedEffort, turns: turnIds.map((id) => ({ id })) } } });
      return;
    }
    if (request.id !== undefined) emit({ id: request.id, error: { code: -32601, message: 'offline fake refuses method' } });
  });
}

function g5OfflineFakeResponses(cell) {
  const fixture = g5Fixtures[cell.fixture_id];
  const ownRoot = cell.harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const targets = fixture.targetsByArm[cell.arm]
    .filter((path) => path !== 'AGENTS.md' && path !== 'CLAUDE.md');
  return fixture.turns.map((turn, index) => {
    let reads = targets.map((path) => ({ path }));
    if (fixture.task === 'T2' && cell.arm === 'candidate' && index === 1) {
      reads = [{ path: CONTEXT_INDEX, fail: true }, { path: CONTEXT_MANIFEST }];
    } else if (fixture.task === 'T2' && cell.arm === 'baseline' && index > 0) {
      reads = [{ path: CONTEXT_MANIFEST }];
    }
    const source = reads.filter((entry) => !entry.fail).map((entry) => entry.path);
    if (index === 0) source.unshift(ownRoot);
    return { claims: g5ExpectedClaims(fixture, index, cell.arm), source: [...new Set(source)], reads };
  });
}

function g5OfflineRelease(stateRoot, frozenBatchId, scorer) {
  return {
    schema_version: 1,
    contexts: G5_CONTEXTS,
    scoring: { revision: SCORING_REVISION, sha256: scorer.scoring_sha256, files: scorer.file_sha256 },
    g5: {
      test_only: true, suite_version: G5_SUITE_VERSION, protocol_version: PROTOCOL_VERSION,
      matrix_sha256: g5MatrixSha256, cell_count: 56, calibration_count: 8,
      authority: {
        plan: { path: G5_PLAN_PATH, sha256: G5_PLAN_SHA256 },
        readiness: { path: G5_READINESS_PATH, sha256: G5_READINESS_SHA256 },
      },
      fixtures: Object.fromEntries(G5_FIXTURE_IDS.map((id) => [id, {
        fixture_sha256: g5FixtureDigest(g5Fixtures[id]), schema_sha256: g5SchemaDigest(g5Fixtures[id]),
      }])),
      harnesses: {
        claude: { model: 'offline-fake-claude', effort: 'high', version: G5_HARNESS_VERSIONS.claude,
          tool_config_sha256: g5ToolConfigDigest('claude') },
        codex: { model: 'offline-fake-codex', effort: 'high', version: G5_HARNESS_VERSIONS.codex,
          tool_config_sha256: g5ToolConfigDigest('codex') },
      },
      resources: { session_cap: 56, calibration_cap: 8, concurrency: 1, retry_limit: 0, timeout_ms: 20_000 },
      cost: { estimate_status: 'UNKNOWN', estimate_usd: null,
        basis: 'offline fake transport; no provider or billable model call', safeguards: {} },
      batch_id: frozenBatchId, state_root: stateRoot,
    },
  };
}

async function runG5OfflineTransportTests() {
  mkdirSync(G5_STATE_PARENT, { recursive: true, mode: 0o700 });
  const frozenBatchId = `offline-self-test-${randomUUID()}`;
  const stateRoot = join(G5_STATE_PARENT, frozenBatchId);
  const timeoutBatchId = `offline-timeout-self-test-${randomUUID()}`;
  const timeoutStateRoot = join(G5_STATE_PARENT, timeoutBatchId);
  mkdirSync(stateRoot, { mode: 0o700 });
  mkdirSync(join(stateRoot, 'evidence'), { mode: 0o700 });
  const fakeRoot = realpathSync(mkdtempSync(join(tmpdir(), 'g5-offline-fake-harness-')));
  const fakeLog = join(fakeRoot, 'dispatch.jsonl');
  const releasePath = join(stateRoot, 'release.json');
  const ledgerPath = join(stateRoot, 'ledger.json');
  const authorizationPath = join(stateRoot, 'authorization.json');
  try {
    const fakeSource = `#!${process.execPath}\n(${g5OfflineFakeHarnessMain.toString()})();\n`;
    for (const name of ['claude', 'codex']) {
      const path = join(fakeRoot, name);
      writeFileSync(path, fakeSource, { mode: 0o700 });
      chmodSync(path, 0o700);
    }
    const scorer = scoringIdentity();
    const release = g5OfflineRelease(stateRoot, frozenBatchId, scorer);
    const releaseBytes = `${JSON.stringify(release)}\n`;
    writeFileSync(releasePath, releaseBytes, { flag: 'wx', mode: 0o600 });
    const frozenReleaseSha256 = sha256(releaseBytes);
    const authorization = {
      schema_version: 1, decision: 'APPROVED_56', test_only: true,
      release_manifest_sha256: frozenReleaseSha256, batch_id: frozenBatchId,
      state_root: stateRoot, matrix_sha256: g5MatrixSha256, session_cap: 56,
      configuration_sha256: sha256(JSON.stringify(g5ApprovalConfiguration(release.g5))),
      user_turn_text: 'OFFLINE_FAKE_TRANSPORT_SELF_TEST_ONLY; NOT LIVE AUTHORIZATION',
      cost_unknown_ack: true,
    };
    authorization.user_turn_sha256 = sha256(authorization.user_turn_text);
    const writeAuthorization = (value) => writeFileSync(authorizationPath, `${JSON.stringify(value)}\n`);
    writeAuthorization(authorization);
    g5AtomicJsonReplace(ledgerPath, {
      schema_version: 1, suite_version: G5_SUITE_VERSION, matrix_sha256: g5MatrixSha256,
      release_manifest_sha256: frozenReleaseSha256, batch_id: frozenBatchId,
      evidence_kind: 'OFFLINE_FAKE_TRANSPORT', attempts: [],
    });

    const dispatchRows = () => existsSync(fakeLog)
      ? readFileSync(fakeLog, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
    const invokeCell = async (cell, options = {}) => {
      const selectedRoot = G5_CONTEXTS[cell.arm].root;
      const model = release.g5.harnesses[cell.harness].model;
      const effort = release.g5.harnesses[cell.harness].effort;
      const evidencePath = options.output || join(stateRoot, 'evidence', `${cell.cell_id}.json`);
      const args = [RUNNER, '--root', selectedRoot, '--arm', cell.arm, '--harness', cell.harness,
        '--fixture', 'all', '--trials', '1', '--concurrency', '1', '--output', evidencePath,
        '--g5-phase', options.phase || cell.phase, '--g5-cell', cell.cell_id,
        '--g5-ledger', options.ledger || ledgerPath, '--batch-id', options.batchId || frozenBatchId,
        '--release-manifest', options.release || releasePath,
        ...(options.productionMode ? [] : ['--offline-fake-transport-self-test']),
        cell.harness === 'claude' ? '--claude-model' : '--codex-model', model,
        cell.harness === 'claude' ? '--claude-effort' : '--codex-effort', effort,
        ...(options.extraArgs || [])];
      return run(process.execPath, args, { timeoutMs: 60_000, env: {
        ...process.env, PATH: `${fakeRoot}:${process.env.PATH || ''}`,
        ...(options.productionMode ? {} : { G5_OFFLINE_FAKE_TRANSPORT: '1' }),
        G5_FAKE_RESPONSES: JSON.stringify(options.responses || g5OfflineFakeResponses(cell)),
        G5_FAKE_MODEL: model, G5_FAKE_EFFORT: effort, G5_FAKE_LOG: options.fakeLog || fakeLog,
        G5_FAKE_CELL_ID: cell.cell_id,
        G5_FAKE_TRANSPORT_STATE: join(fakeRoot, `${cell.cell_id}.state.json`),
        ...(options.fakeTimeoutMs ? { G5_FAKE_TIMEOUT_MS: String(options.fakeTimeoutMs) } : {}),
        ...(options.fail ? { G5_FAKE_FAIL: options.fail } : {}),
      } });
    };
    const invokeFinalize = (extraArgs = []) => run(process.execPath, [RUNNER,
      '--root', G5_CONTEXTS.candidate.root, '--arm', 'candidate', '--harness', 'codex',
      '--fixture', 'all', '--trials', '1', '--concurrency', '1',
      '--output', join(stateRoot, 'final-verdict.json'), '--g5-phase', 'finalize',
      '--g5-ledger', ledgerPath, '--batch-id', frozenBatchId, '--release-manifest', releasePath,
      '--offline-fake-transport-self-test',
      ...extraArgs,
    ], { timeoutMs: 60_000, env: { ...process.env,
      PATH: `${fakeRoot}:${process.env.PATH || ''}`, G5_OFFLINE_FAKE_TRANSPORT: '1' } });
    const stateLockPath = join(stateRoot, '.cell-lock');
    const writeTestStateLock = (cellId, pid) => {
      writeFileSync(stateLockPath, `${JSON.stringify({
        schema_version: 1, pid, batch_id: frozenBatchId,
        release_manifest_sha256: frozenReleaseSha256, cell_id: cellId,
        token: randomUUID(), claimed_at: new Date().toISOString(),
      })}\n`, { flag: 'wx', mode: 0o600 });
    };
    const expectNoDispatch = async (label, action, pattern) => {
      const before = dispatchRows().length;
      await assert.rejects(action, (error) => error.execution?.exit_code === 2
        && pattern.test(error.execution?.stderr || ''), label);
      assert.equal(dispatchRows().length, before, `${label}: fake model transport was dispatched`);
    };

    const firstCalibration = g5MatrixSplit.calibration[0];
    await expectNoDispatch('unknown CLI option reached transport', invokeCell(firstCalibration, {
      extraArgs: ['--definitely-unknown-option', 'sentinel'],
    }), /unknown or malformed option/);
    await expectNoDispatch('duplicate CLI option reached transport', invokeCell(firstCalibration, {
      extraArgs: ['--g5-phase', firstCalibration.phase],
    }), /duplicate option/);
    await expectNoDispatch('path-unsafe batch id reached transport',
      invokeCell(firstCalibration, { batchId: '../escape' }), /path-safe identifier/);
    await expectNoDispatch('legacy-only known option reached G5 cell transport', invokeCell(firstCalibration, {
      extraArgs: ['--require-pass'],
    }), /options not valid for G5/);
    await expectNoDispatch('legacy-only known option reached G5 finalize',
      invokeFinalize(['--fallback-ids', 'F1']), /options not valid for G5/);
    await expectNoDispatch('production admission accepted test-only release',
      invokeCell(firstCalibration, { productionMode: true }), /live release cannot be test-only/);
    for (const cell of g5MatrixSplit.calibration) {
      let result;
      const responses = g5OfflineFakeResponses(cell);
      const isBaselineFailureProbe = cell.cell_id === firstCalibration.cell_id;
      if (isBaselineFailureProbe) {
        responses[0].claims = { ...responses[0].claims,
          recovery_state: 'INTENTIONAL_OFFLINE_BASELINE_MISS' };
      }
      try { result = await invokeCell(cell, { responses }); }
      catch (error) {
        if (isBaselineFailureProbe && error.execution?.exit_code === 1) {
          result = { stdout: error.execution.stdout, stderr: error.execution.stderr };
        } else {
        const path = join(stateRoot, 'evidence', `${cell.cell_id}.json`);
        if (existsSync(path)) {
          const evidence = JSON.parse(readFileSync(path, 'utf8'));
          error.message += `; evidence=${JSON.stringify({ decision: evidence.decision,
            turns: evidence.turns?.map((turn) => ({ id: turn.turn_id, trace: turn.trace, gate: turn.gate })) })}`;
        }
        throw error;
        }
      }
      assert.match(result.stdout, new RegExp(`G5_RESULT cell=${cell.cell_id} status=${isBaselineFailureProbe ? 'FAIL' : 'PASS'} record=RECORDED`));
      const evidence = JSON.parse(readFileSync(join(stateRoot, 'evidence', `${cell.cell_id}.json`)));
      assert.equal(evidence.decision.status, isBaselineFailureProbe ? 'FAIL' : 'PASS',
        `${cell.cell_id} fake transport produced the wrong semantic measurement`);
    }
    let ledger = JSON.parse(readFileSync(ledgerPath));
    assert.equal(ledger.attempts.length, 8, 'offline calibration did not consume exactly eight cells');
    assert.ok(ledger.attempts.every((attempt) => attempt.state === 'TERMINAL'
      && attempt.terminal_status === 'RECORDED'), 'offline calibration ledger contains a non-recorded attempt');

    const ninth = g5Matrix[8];
    const persistAttemptEvidence = (attempt, evidence) => {
      const bytes = Buffer.from(`${JSON.stringify(evidence)}\n`);
      writeFileSync(attempt.evidence_path, bytes);
      attempt.evidence_sha256 = sha256(bytes);
      g5AtomicJsonReplace(ledgerPath, ledger);
    };
    const restoreAttemptEvidence = (attempt, bytes) => {
      writeFileSync(attempt.evidence_path, bytes);
      attempt.evidence_sha256 = sha256(bytes);
      g5AtomicJsonReplace(ledgerPath, ledger);
    };
    const syncClaudeTransportJournal = (evidence, turnIndex) => {
      evidence.transport_journal[turnIndex].raw_stdout = evidence.turns[turnIndex].raw_stdout;
      evidence.transport_journal[turnIndex].raw_stderr = evidence.turns[turnIndex].raw_stderr;
    };
    const replaceClaudeTurnAnswer = (evidence, turnIndex, claims) => {
      const turn = evidence.turns[turnIndex];
      const answer = { claims, source: turn.answer.source };
      for (const event of turn.events) {
        if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
          for (const block of event.message.content) {
            if (block.type === 'tool_use' && block.name === 'StructuredOutput') block.input = answer;
          }
        }
        if (event.type === 'result') {
          event.structured_output = answer;
          event.result = JSON.stringify(answer);
        }
      }
      const projected = claudeProjection(turn.events);
      turn.answer = parseAnswer(projected.final);
      turn.trace = projected.trace;
      turn.raw_stdout = `${turn.events.map((event) => JSON.stringify(event)).join('\n')}\n`;
      syncClaudeTransportJournal(evidence, turnIndex);
    };
    const replaceClaudeReadOutput = (evidence, turnIndex, target, outputText) => {
      const turn = evidence.turns[turnIndex];
      let toolUseId = null;
      for (const event of turn.events) {
        if (event.type !== 'assistant' || !Array.isArray(event.message?.content)) continue;
        const use = event.message.content.find((block) => block.type === 'tool_use'
          && block.name === 'Read' && block.input?.file_path === target);
        if (use) toolUseId = use.id;
      }
      assert.ok(toolUseId, `offline mutation lacks Claude read for ${target}`);
      for (const event of turn.events) {
        if (event.type !== 'user' || !Array.isArray(event.message?.content)) continue;
        const result = event.message.content.find((block) => block.type === 'tool_result'
          && block.tool_use_id === toolUseId);
        if (result) result.content = outputText;
      }
      const bytes = Buffer.from(outputText);
      turn.source_snapshot[target] = { state: 'REGULAR', sha256: sha256(bytes), size: bytes.length,
        content_base64: bytes.toString('base64') };
      const projected = claudeProjection(turn.events);
      turn.trace = projected.trace;
      turn.raw_stdout = `${turn.events.map((event) => JSON.stringify(event)).join('\n')}\n`;
      syncClaudeTransportJournal(evidence, turnIndex);
    };
    const rescoreOfflineEvidence = (cell, evidence) => {
      const fixture = g5Fixtures[cell.fixture_id];
      const replayIsolation = { cwd: G5_CONTEXTS[cell.arm].root, trace_cwd: evidence.execution_cwd };
      for (const [index, turn] of evidence.turns.entries()) {
        turn.gate = g5TurnGateWithIdentity(
          auditG5Turn(fixture, index, turn, replayIsolation, cell.arm, cell.harness), turn.identity);
      }
      evidence.decision = scoreG5(fixture, {
        turns: evidence.turns, identity: evidence.identity, effect_audit: evidence.effect_audit,
      }, replayIsolation, cell.arm, cell.harness);
      evidence.safety_status = evidence.decision.safety_status;
      evidence.record_status = evidence.safety_status === 'PASS' ? 'RECORDED' : 'BLOCKED';
      return evidence;
    };

    const candidateAttempt = ledger.attempts[1];
    const candidateOriginal = readFileSync(candidateAttempt.evidence_path);
    const missingUsageMeasurement = JSON.parse(candidateOriginal);
    missingUsageMeasurement.turns[0].usage = null;
    rescoreOfflineEvidence(g5Matrix[1], missingUsageMeasurement);
    assert.equal(missingUsageMeasurement.decision.status, 'UNKNOWN',
      'missing native usage did not remain an unknown measurement');
    assert.equal(missingUsageMeasurement.decision.metrics.status, 'UNKNOWN',
      'missing native usage did not retain metric-level UNKNOWN evidence');
    assert.equal(missingUsageMeasurement.decision.safety_status, 'PASS',
      'missing native usage was promoted to a safety failure');
    assert.equal(missingUsageMeasurement.record_status, 'RECORDED',
      'missing native usage was blocked before final INCONCLUSIVE adjudication');
    assert.equal(g5DecisionAdmissibleForAggregation('candidate', missingUsageMeasurement.decision), true,
      'metric-only UNKNOWN candidate measurement was rejected before aggregation');
    const semanticUnknown = JSON.parse(JSON.stringify(missingUsageMeasurement.decision));
    semanticUnknown.unknown.push('model/session/effort identity incomplete');
    assert.equal(g5DecisionAdmissibleForAggregation('candidate', semanticUnknown), false,
      'non-metric UNKNOWN candidate evidence was admitted');
    const unsafeMetricUnknown = JSON.parse(JSON.stringify(missingUsageMeasurement.decision));
    unsafeMetricUnknown.safety_status = 'FAIL';
    unsafeMetricUnknown.safety_failures = ['native token usage missing'];
    assert.equal(g5DecisionAdmissibleForAggregation('candidate', unsafeMetricUnknown), false,
      'unsafe UNKNOWN candidate evidence was admitted');
    const failedCandidate = JSON.parse(JSON.stringify(missingUsageMeasurement.decision));
    failedCandidate.status = 'FAIL';
    failedCandidate.failures = ['semantic fixture failure'];
    assert.equal(g5DecisionAdmissibleForAggregation('candidate', failedCandidate), false,
      'failed candidate semantic evidence was admitted');
    const unsafePass = JSON.parse(candidateOriginal).decision;
    unsafePass.safety_status = 'FAIL';
    unsafePass.safety_failures = ['synthetic safety failure'];
    assert.equal(g5DecisionAdmissibleForAggregation('candidate', unsafePass), false,
      'unsafe PASS candidate evidence was admitted');
    const measuredBaselineFailure = JSON.parse(JSON.stringify(missingUsageMeasurement.decision));
    measuredBaselineFailure.status = 'FAIL';
    measuredBaselineFailure.failures = ['semantic fixture failure'];
    measuredBaselineFailure.unknown = [];
    measuredBaselineFailure.metrics.status = 'PASS';
    measuredBaselineFailure.metrics.unknown = [];
    assert.equal(g5DecisionAdmissibleForAggregation('baseline', measuredBaselineFailure), true,
      'safe measured baseline semantic failure was rejected');
    assert.equal(g5DecisionAdmissibleForAggregation('unknown-arm', missingUsageMeasurement.decision), false,
      'unknown arm was admitted for aggregation');
    const statusOnlyTamper = JSON.parse(candidateOriginal);
    statusOnlyTamper.decision.status = 'FAIL';
    persistAttemptEvidence(candidateAttempt, statusOnlyTamper);
    await expectNoDispatch('status-only prior decision tamper reached transport', invokeCell(ninth),
      /decision does not rescore/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const sourceSnapshotTamper = JSON.parse(candidateOriginal);
    replaceClaudeReadOutput(sourceSnapshotTamper, 0, 'CONTEXT.md', '# truncated-but-self-consistent\n');
    rescoreOfflineEvidence(g5Matrix[1], sourceSnapshotTamper);
    persistAttemptEvidence(candidateAttempt, sourceSnapshotTamper);
    await expectNoDispatch('self-consistent shortened source snapshot reached transport', invokeCell(ninth),
      /source snapshot differs from frozen source/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const usageTamper = JSON.parse(candidateOriginal);
    usageTamper.turns[0].usage.input_tokens += 1;
    rescoreOfflineEvidence(g5Matrix[1], usageTamper);
    persistAttemptEvidence(candidateAttempt, usageTamper);
    await expectNoDispatch('saved usage tamper reached transport', invokeCell(ninth),
      /usage disagrees with native events/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const elapsedTamper = JSON.parse(candidateOriginal);
    elapsedTamper.turns[0].elapsed_ms += 1;
    rescoreOfflineEvidence(g5Matrix[1], elapsedTamper);
    persistAttemptEvidence(candidateAttempt, elapsedTamper);
    await expectNoDispatch('saved elapsed-time tamper reached transport', invokeCell(ninth),
      /elapsed time does not recompute/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const parsedAndRawTamper = JSON.parse(candidateOriginal);
    parsedAndRawTamper.turns[0].events[0].joint_tamper_marker = true;
    parsedAndRawTamper.turns[0].raw_stdout = `${parsedAndRawTamper.turns[0].events
      .map((event) => JSON.stringify(event)).join('\n')}\n`;
    syncClaudeTransportJournal(parsedAndRawTamper, 0);
    persistAttemptEvidence(candidateAttempt, parsedAndRawTamper);
    await expectNoDispatch('joint parsed/raw transport tamper reached transport', invokeCell(ninth),
      /sealed pre-ledger capture/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const originalCwdEvidence = JSON.parse(candidateOriginal);
    const alternateCwd = `${dirname(originalCwdEvidence.execution_cwd)}/agent-context-g5-${candidateAttempt.cell_id}-joint-tamper`;
    const cwdAndPathsTamper = JSON.parse(JSON.stringify(originalCwdEvidence)
      .split(originalCwdEvidence.execution_cwd).join(alternateCwd));
    persistAttemptEvidence(candidateAttempt, cwdAndPathsTamper);
    await expectNoDispatch('joint execution root and absolute-path tamper reached transport', invokeCell(ninth),
      /pre-dispatch claim/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const timingTamper = JSON.parse(candidateOriginal);
    timingTamper.turns[0].started_at_ms += 1000;
    timingTamper.turns[0].finished_at_ms += 1000;
    timingTamper.turns[0].started_monotonic_ns = String(BigInt(timingTamper.turns[0].started_monotonic_ns)
      + 1_000_000_000n);
    timingTamper.turns[0].finished_monotonic_ns = String(BigInt(timingTamper.turns[0].finished_monotonic_ns)
      + 1_000_000_000n);
    persistAttemptEvidence(candidateAttempt, timingTamper);
    await expectNoDispatch('joint wall/monotonic/elapsed-consistent tamper reached transport', invokeCell(ninth),
      /sealed pre-ledger capture/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const rawUsageAndMetricsTamper = JSON.parse(candidateOriginal);
    const resultEvent = rawUsageAndMetricsTamper.turns[0].events.findLast((event) => event.type === 'result');
    resultEvent.usage.input_tokens += 1;
    resultEvent.modelUsage[rawUsageAndMetricsTamper.harness_config.model].inputTokens += 1;
    rawUsageAndMetricsTamper.turns[0].usage.input_tokens += 1;
    rawUsageAndMetricsTamper.turns[0].raw_stdout = `${rawUsageAndMetricsTamper.turns[0].events
      .map((event) => JSON.stringify(event)).join('\n')}\n`;
    syncClaudeTransportJournal(rawUsageAndMetricsTamper, 0);
    rescoreOfflineEvidence(g5Matrix[1], rawUsageAndMetricsTamper);
    persistAttemptEvidence(candidateAttempt, rawUsageAndMetricsTamper);
    await expectNoDispatch('joint raw usage and derived-metrics tamper reached transport', invokeCell(ninth),
      /sealed pre-ledger capture/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const capturePath = candidateAttempt.provenance.capture_path;
    const originalCapture = readFileSync(capturePath);
    const captureTamper = JSON.parse(originalCapture);
    captureTamper.evidence_snapshot.joint_capture_tamper = true;
    writeFileSync(capturePath, `${JSON.stringify(captureTamper)}\n`);
    await expectNoDispatch('capture rewrite without the ledger anchor reached transport', invokeCell(ninth),
      /provenance capture.*hash mismatch/);
    writeFileSync(capturePath, originalCapture);

    const codexAttemptIndex = ledger.attempts.findIndex((attempt, index) => g5Matrix[index].harness === 'codex');
    const codexAttempt = ledger.attempts[codexAttemptIndex];
    const codexCapture = JSON.parse(readFileSync(codexAttempt.provenance.capture_path));
    const missingTurnStart = structuredClone(codexCapture.evidence_snapshot);
    const missingIndex = missingTurnStart.transport_journal.findIndex((record) => record.direction === 'outbound'
      && JSON.parse(record.raw).method === 'turn/start');
    missingTurnStart.transport_journal.splice(missingIndex, 1);
    assert.throws(() => g5ValidateRawTransport(missingTurnStart,
      { harness: 'codex', cell_id: codexAttempt.cell_id, fixture_id: g5Matrix[codexAttemptIndex].fixture_id,
        arm: g5Matrix[codexAttemptIndex].arm }), /response lacks a raw request|raw RPC sequence/,
    'G5 Codex raw replay accepted a missing turn/start request');
    const omittedFatal = structuredClone(codexCapture.evidence_snapshot);
    omittedFatal.transport_journal.push({ direction: 'inbound',
      raw: JSON.stringify({ method: 'error', params: { willRetry: false, message: 'fatal' } }) });
    assert.throws(() => g5ValidateRawTransport(omittedFatal,
      { harness: 'codex', cell_id: codexAttempt.cell_id, fixture_id: g5Matrix[codexAttemptIndex].fixture_id,
        arm: g5Matrix[codexAttemptIndex].arm }), /outside an active turn/,
    'G5 Codex raw replay accepted an omitted fatal notification');
    const wrongTurnRequest = structuredClone(codexCapture.evidence_snapshot);
    const wrongTurnRecord = wrongTurnRequest.transport_journal.find((record) => record.direction === 'outbound'
      && JSON.parse(record.raw).method === 'turn/start');
    const wrongTurnMessage = JSON.parse(wrongTurnRecord.raw);
    wrongTurnMessage.params = { ...wrongTurnMessage.params, threadId: 'wrong-thread',
      model: 'wrong-model', effort: 'low' };
    wrongTurnRecord.raw = JSON.stringify(wrongTurnMessage);
    assert.throws(() => g5ValidateRawTransport(wrongTurnRequest,
      { harness: 'codex', cell_id: codexAttempt.cell_id, fixture_id: g5Matrix[codexAttemptIndex].fixture_id,
        arm: g5Matrix[codexAttemptIndex].arm }), /turn\/start request mismatch/,
    'G5 Codex raw replay accepted wrong dispatch pins');

    const asynchronousStart = structuredClone(codexCapture.evidence_snapshot);
    const firstTurnRequestIndex = asynchronousStart.transport_journal.findIndex((record) => record.direction === 'outbound'
      && JSON.parse(record.raw).method === 'turn/start');
    const firstTurnRequestId = JSON.parse(asynchronousStart.transport_journal[firstTurnRequestIndex].raw).id;
    const firstTurnResponseIndex = asynchronousStart.transport_journal.findIndex((record) => record.direction === 'inbound'
      && JSON.parse(record.raw).id === firstTurnRequestId);
    const turnStartedIndex = asynchronousStart.transport_journal.findIndex((record) => record.direction === 'inbound'
      && JSON.parse(record.raw).method === 'turn/started');
    const [turnStartedRecord] = asynchronousStart.transport_journal.splice(turnStartedIndex, 1);
    asynchronousStart.transport_journal.splice(firstTurnResponseIndex, 0, turnStartedRecord);
    g5ValidateRawTransport(asynchronousStart, {
      harness: 'codex', cell_id: codexAttempt.cell_id, fixture_id: g5Matrix[codexAttemptIndex].fixture_id,
      arm: g5Matrix[codexAttemptIndex].arm,
    });
    const outsideThreadStart = structuredClone(codexCapture.evidence_snapshot);
    const threadStartResponseIndex = outsideThreadStart.transport_journal.findIndex((record) => record.direction === 'inbound'
      && JSON.parse(record.raw).result?.thread?.id === outsideThreadStart.session_id);
    outsideThreadStart.transport_journal.splice(threadStartResponseIndex + 1, 0, { direction: 'inbound',
      raw: JSON.stringify({ method: 'thread/started', params: { threadId: outsideThreadStart.session_id } }) });
    g5ValidateRawTransport(outsideThreadStart, {
      harness: 'codex', cell_id: codexAttempt.cell_id, fixture_id: g5Matrix[codexAttemptIndex].fixture_id,
      arm: g5Matrix[codexAttemptIndex].arm,
    });

    const candidateSemanticFailure = JSON.parse(candidateOriginal);
    replaceClaudeTurnAnswer(candidateSemanticFailure, 0, {
      ...candidateSemanticFailure.turns[0].answer.claims,
      recovery_state: 'INTENTIONAL_OFFLINE_CANDIDATE_MISS',
    });
    rescoreOfflineEvidence(g5Matrix[1], candidateSemanticFailure);
    assert.equal(candidateSemanticFailure.decision.status, 'FAIL');
    assert.equal(candidateSemanticFailure.decision.safety_status, 'PASS');
    persistAttemptEvidence(candidateAttempt, candidateSemanticFailure);
    await expectNoDispatch('candidate semantic failure reached later transport', invokeCell(ninth),
      /candidate semantic gate failed/);
    restoreAttemptEvidence(candidateAttempt, candidateOriginal);

    const baselineAttempt = ledger.attempts[0];
    const baselineSemanticFailure = JSON.parse(readFileSync(baselineAttempt.evidence_path));
    assert.equal(baselineSemanticFailure.decision.status, 'FAIL');
    assert.equal(baselineSemanticFailure.decision.safety_status, 'PASS');

    await expectNoDispatch('missing calibration receipt reached transport', invokeCell(ninth), /calibration receipt/);
    const noAck = { ...authorization, cost_unknown_ack: false };
    writeAuthorization(noAck);
    await expectNoDispatch('UNKNOWN cost without acknowledgment reached transport', invokeCell(ninth), /cost lacks explicit/);
    writeAuthorization(authorization);
    const badReleasePath = join(stateRoot, 'bad-release.json');
    const badRelease = structuredClone(release);
    badRelease.g5.authority.plan.sha256 = 'a'.repeat(64);
    writeFileSync(badReleasePath, `${JSON.stringify(badRelease)}\n`, { flag: 'wx', mode: 0o600 });
    await expectNoDispatch('changed authority hash reached transport',
      invokeCell(ninth, { release: badReleasePath }), /plan authority mismatch/);
    mkdirSync(join(stateRoot, '.cell-lock'));
    await expectNoDispatch('orphan state lock reached transport', invokeCell(ninth),
      /G5 state lock is already held/);
    rmSync(join(stateRoot, '.cell-lock'), { recursive: true, force: false });

    writeFileSync(join(stateRoot, 'calibration.json'), `${JSON.stringify({
      schema_version: 1, verdict: 'PASS', release_manifest_sha256: frozenReleaseSha256,
      batch_id: frozenBatchId, matrix_sha256: g5MatrixSha256,
      evidence_kind: 'OFFLINE_FAKE_TRANSPORT',
      eval_run_id: 'offline-fake-calibration-independent-check',
      cells: ledger.attempts.map((attempt) => ({ cell_id: attempt.cell_id,
        evidence_sha256: attempt.evidence_sha256 })),
    })}\n`, { flag: 'wx', mode: 0o600 });
    const ninthOutput = join(stateRoot, 'evidence', `${ninth.cell_id}.json`);
    writeFileSync(ninthOutput, '', { flag: 'wx', mode: 0o600 });
    await expectNoDispatch('pre-existing empty evidence reached transport', invokeCell(ninth), /already exists/);
    rmSync(ninthOutput);
    await invokeCell(ninth);
    await expectNoDispatch('completed cell replay reached transport', invokeCell(ninth), /exact consumed matrix prefix/);

    const tenth = g5Matrix[9];
    const firstEvidencePath = ledger.attempts[0].evidence_path;
    const firstEvidence = readFileSync(firstEvidencePath);
    writeFileSync(firstEvidencePath, Buffer.concat([firstEvidence, Buffer.from(' ')]));
    await expectNoDispatch('tampered prior evidence reached transport', invokeCell(tenth), /evidence hash mismatch/);
    writeFileSync(firstEvidencePath, firstEvidence);
    await expectNoDispatch('alternate evidence output reached transport',
      invokeCell(tenth, { output: join(stateRoot, 'alternate.json') }), /fixed cell evidence path/);
    await invokeCell(tenth);

    const eleventh = g5Matrix[10];
    const beforeFailure = dispatchRows().length;
    await assert.rejects(invokeCell(eleventh, { fail: 'codex-dispatch' }),
      (error) => error.execution?.exit_code === 2 && /G5_BLOCKED/.test(error.execution?.stderr || ''),
      'transport crash was not retained as a blocked consumed attempt');
    assert.equal(dispatchRows().length, beforeFailure + 1, 'fake transport crash did not occur at dispatch');
    ledger = JSON.parse(readFileSync(ledgerPath));
    const failedAttempt = ledger.attempts.at(-1);
    assert.equal(failedAttempt.cell_id, eleventh.cell_id);
    assert.equal(failedAttempt.state, 'TERMINAL');
    assert.equal(failedAttempt.terminal_status, 'BLOCKED');
    assert.ok(existsSync(failedAttempt.evidence_path), 'transport crash lost its one-time evidence');
    await expectNoDispatch('blocked attempt replay reached transport', invokeCell(eleventh), /exact consumed matrix prefix/);
    await expectNoDispatch('incomplete zero-model finalization was admitted', invokeFinalize(), /exactly 56/);
    const deadProcess = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
    assert.equal(deadProcess.status, 0, 'offline stale-lock probe process did not exit');
    assert.equal(g5ProcessIsAlive(deadProcess.pid), false, 'offline stale-lock probe PID remained alive');
    writeTestStateLock('FINALIZE_ONLY', deadProcess.pid);
    await expectNoDispatch('stale FINALIZE_ONLY lock was not recoverable without dispatch',
      invokeFinalize(), /exactly 56/);
    assert.equal(existsSync(stateLockPath), false, 'recovered finalize lock was not released');
    writeTestStateLock('FINALIZE_ONLY', process.pid);
    await expectNoDispatch('active finalize lock was taken over', invokeFinalize(),
      /G5 finalize (?:recovery successor lock is active|lock is held by an active process)/);
    rmSync(stateLockPath, { recursive: true, force: false });
    writeTestStateLock(firstCalibration.cell_id, deadProcess.pid);
    await expectNoDispatch('ordinary cell lock was taken over by finalize', invokeFinalize(),
      /G5 finalize (?:recovery found a foreign ordinary lock|refuses to recover an ordinary cell lock)/);
    rmSync(stateLockPath, { recursive: true, force: false });

    mkdirSync(join(timeoutStateRoot, 'evidence'), { recursive: true, mode: 0o700 });
    const timeoutRelease = g5OfflineRelease(timeoutStateRoot, timeoutBatchId, scorer);
    Object.assign(timeoutRelease.g5, {
      execution_profile: G5_CODEX_CALIBRATION_PROFILE, profile_version: 1,
      completeness: 'PARTIAL', outcome_ceiling: G5_PARTIAL_OUTCOME_CEILING,
      selected_cell_ids: [...G5_CODEX_CALIBRATION_CELL_IDS], selection_sha256: g5SelectionSha256,
      cell_count: 4, calibration_count: 4,
      harnesses: { codex: timeoutRelease.g5.harnesses.codex },
      resources: { ...timeoutRelease.g5.resources, session_cap: 4, calibration_cap: 4 },
    });
    const timeoutReleasePath = join(timeoutStateRoot, 'release.json');
    const timeoutReleaseBytes = `${JSON.stringify(timeoutRelease)}\n`;
    writeFileSync(timeoutReleasePath, timeoutReleaseBytes, { flag: 'wx', mode: 0o600 });
    const timeoutReleaseSha256 = sha256(timeoutReleaseBytes);
    const timeoutAuthorization = {
      schema_version: 1, decision: G5_CODEX_CALIBRATION_DECISION, test_only: true,
      execution_profile: G5_CODEX_CALIBRATION_PROFILE, completeness: 'PARTIAL',
      outcome_ceiling: G5_PARTIAL_OUTCOME_CEILING, full_g5_authorized: false,
      skipped_harnesses: { claude: 'UNAVAILABLE_NO_TOKEN' },
      selected_cell_ids: [...G5_CODEX_CALIBRATION_CELL_IDS], selection_sha256: g5SelectionSha256,
      release_manifest_sha256: timeoutReleaseSha256, batch_id: timeoutBatchId,
      state_root: timeoutStateRoot, matrix_sha256: g5MatrixSha256, session_cap: 4,
      configuration_sha256: sha256(JSON.stringify(g5ApprovalConfiguration(timeoutRelease.g5))),
      user_turn_text: 'OFFLINE_TIMEOUT_EVIDENCE_SELF_TEST_ONLY; NOT LIVE AUTHORIZATION',
      cost_unknown_ack: true,
    };
    timeoutAuthorization.user_turn_sha256 = sha256(timeoutAuthorization.user_turn_text);
    writeFileSync(join(timeoutStateRoot, 'authorization.json'), `${JSON.stringify(timeoutAuthorization)}\n`,
      { flag: 'wx', mode: 0o600 });
    const timeoutLedgerPath = join(timeoutStateRoot, 'ledger.json');
    const timeoutFakeLog = join(fakeRoot, 'timeout-dispatch.jsonl');
    g5AtomicJsonReplace(timeoutLedgerPath, {
      schema_version: 1, suite_version: G5_SUITE_VERSION, matrix_sha256: g5MatrixSha256,
      execution_profile: G5_CODEX_CALIBRATION_PROFILE,
      selected_cell_ids: [...G5_CODEX_CALIBRATION_CELL_IDS], selection_sha256: g5SelectionSha256,
      release_manifest_sha256: timeoutReleaseSha256, batch_id: timeoutBatchId,
      evidence_kind: 'OFFLINE_FAKE_TRANSPORT', attempts: [],
    });
    const timeoutCell = g5CodexCalibrationCells[0];
    const timeoutOutput = join(timeoutStateRoot, 'evidence', `${timeoutCell.cell_id}.json`);
    await assert.rejects(invokeCell(timeoutCell, {
      phase: 'codex-calibration', ledger: timeoutLedgerPath, batchId: timeoutBatchId,
      release: timeoutReleasePath, output: timeoutOutput,
      fail: 'codex-turn-timeout', fakeTimeoutMs: 50, fakeLog: timeoutFakeLog,
    }), (error) => error.execution?.exit_code === 2
      && /G5 Codex turn\/completed 1 timeout/.test(error.execution?.stderr || ''),
    'turn/completed timeout was not retained as a blocked consumed attempt');
    const timeoutDispatchRows = readFileSync(timeoutFakeLog, 'utf8').split('\n').filter(Boolean);
    assert.equal(timeoutDispatchRows.length, 1, 'fake turn timeout did not reach exactly one dispatch');
    const timeoutLedger = JSON.parse(readFileSync(timeoutLedgerPath));
    const timeoutAttempt = timeoutLedger.attempts.at(-1);
    assert.equal(timeoutAttempt.cell_id, timeoutCell.cell_id);
    assert.equal(timeoutAttempt.state, 'TERMINAL');
    assert.equal(timeoutAttempt.terminal_status, 'BLOCKED');
    const timeoutEvidence = JSON.parse(readFileSync(timeoutAttempt.evidence_path, 'utf8'));
    assert.ok(timeoutEvidence.partial, 'turn/completed timeout lost partial transport evidence');
    assert.match(timeoutEvidence.partial.session_id, /^offline-thread-/,
      'turn/completed timeout lost its thread id');
    assert.equal(timeoutEvidence.partial.active_turn?.native_turn_id, 'offline-turn-1',
      'turn/completed timeout lost its returned turn id');
    assert.ok(timeoutEvidence.partial.transport_journal?.some((entry) => entry.direction === 'inbound'
      && entry.raw.includes('offline fake retry sentinel')),
    'turn/completed timeout lost its inbound transport journal');
    assert.match(timeoutEvidence.partial.raw_stderr, /offline fake turn timeout stderr sentinel/,
      'turn/completed timeout lost accumulated stderr');
    assert.ok(timeoutEvidence.partial.active_turn?.events?.some((event) => event.method === 'error'
      && event.params?.willRetry === true),
    'turn/completed timeout lost active-turn retry events');
    assert.ok(timeoutEvidence.partial.active_turn?.raw_event_lines?.some((line) => line.includes('offline fake active turn sentinel')),
      'turn/completed timeout lost active-turn raw lines');

    const logs = dispatchRows();
    for (const cell of g5Matrix.slice(0, 10)) {
      const rows = logs.filter((entry) => entry.cell_id === cell.cell_id);
      assert.equal(rows.length, g5Fixtures[cell.fixture_id].turns.length,
        `${cell.cell_id} fake native turn count mismatch`);
      assert.equal(rows[0].mode, cell.harness === 'claude' ? 'session-id' : 'thread-start');
      assert.ok(rows.slice(1).every((entry) => entry.mode === (cell.harness === 'claude' ? 'resume' : 'same-thread')),
        `${cell.cell_id} did not retain one native session/thread`);
      assert.equal(new Set(rows.map((entry) => entry.session_id)).size, 1,
        `${cell.cell_id} changed native session identity`);
    }
    return { fake_cells_passed_before_mutation: 10, fake_turns_passed: logs.length - 1,
      baseline_fail_continuation_mutations: 1, candidate_fail_blocking_mutations: 1,
      rescore_mutations: 4, provenance_mutations: 8, async_transport_orderings: 2,
      timeout_attempts: 1, crash_attempts: 1, admission_mutations: 21,
      finalize_recovery_entry_checks: 4, live_sessions: 0 };
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
    rmSync(stateRoot, { recursive: true, force: true });
    rmSync(timeoutStateRoot, { recursive: true, force: true });
  }
}

if (selfTest) {
  const indexManifest = JSON.parse(readFileSync(join(root, CONTEXT_MANIFEST), 'utf8'));
  const projected = indexManifest.entries.map((entry) => Object.fromEntries(OPERATIONAL_FIELDS
    .filter((key) => key in entry && (key !== 'truth_owner' || entry[key] !== entry.target))
    .map((key) => [key, entry[key]])));
  const indexText = (entries) => `# Agent context index\n\n\`\`\`json\n${JSON.stringify(entries)}\n\`\`\`\n`;
  assert.equal(indexProjectionState(indexText(projected), indexManifest).status, 'HEALTHY');
  assert.equal(indexProjectionState(null, indexManifest).status, 'MISSING');
  assert.equal(indexProjectionState(null, {}).status, 'INVALID',
    'missing index hid an invalid manifest source');
  assert.equal(frozenIndexState(root, (path) => path.endsWith(CONTEXT_MANIFEST)
    ? '{}' : readFileSync(path, 'utf8')).status, 'INVALID',
  'frozen missing-index state accepted an empty manifest');
  const corruptSource = (name, change) => {
    const source = structuredClone(indexManifest);
    change(source);
    return [name, source];
  };
  const invalidSources = [
    ['null source', null], ['array source', []],
    corruptSource('unknown top-level field', (source) => { source.unclassified = true; }),
    corruptSource('missing purpose', (source) => { delete source.purpose; }),
    corruptSource('wrong version', (source) => { source.version = '1'; }),
    corruptSource('blank purpose', (source) => { source.purpose = '  '; }),
    corruptSource('bad soft cap', (source) => { source.module_soft_cap_bytes = -1; }),
    corruptSource('bad split cap', (source) => { source.module_split_review_bytes = null; }),
    corruptSource('duplicate id', (source) => { source.entries[1].id = source.entries[0].id; }),
    corruptSource('blank id', (source) => { source.entries[0].id = ''; }),
    corruptSource('missing entry field', (source) => { delete source.entries[0].condition; }),
    corruptSource('null condition', (source) => { source.entries[0].condition = null; }),
    corruptSource('blank load_before', (source) => { source.entries[0].load_before = ' '; }),
    corruptSource('null contains', (source) => { source.entries[0].contains = null; }),
    corruptSource('nonstring loader', (source) => { source.entries[0].loader = 1; }),
    corruptSource('blank fallback', (source) => { source.entries[0].fallback = ''; }),
    corruptSource('null truth_owner', (source) => { source.entries[0].truth_owner = null; }),
    corruptSource('null runtime', (source) => { source.entries[0].runtime = null; }),
    corruptSource('empty runtime', (source) => { source.entries[0].runtime = []; }),
    corruptSource('unknown runtime', (source) => { source.entries[0].runtime = ['other']; }),
    corruptSource('duplicate runtime', (source) => { source.entries[0].runtime = ['codex', 'codex']; }),
    corruptSource('empty obligation ids', (source) => { source.entries[0].obligation_ids = []; }),
    corruptSource('unknown obligation id', (source) => { source.entries[0].obligation_ids = ['K11']; }),
    corruptSource('null leading words', (source) => { source.entries[0].leading_words = null; }),
    corruptSource('blank leading word', (source) => { source.entries[0].leading_words = [' ']; }),
    corruptSource('null fixtures', (source) => { source.entries[0].fixtures = null; }),
    corruptSource('blank fixture', (source) => { source.entries[0].fixtures = ['']; }),
    corruptSource('false read_to_end', (source) => { source.entries[0].read_to_end = false; }),
    corruptSource('null target', (source) => { source.entries[0].target = null; }),
    corruptSource('absolute target', (source) => { source.entries[0].target = '/private/tmp/elsewhere'; }),
    corruptSource('traversal target', (source) => { source.entries[0].target = '../elsewhere'; }),
    corruptSource('manifest cycle', (source) => { source.entries[0].target = CONTEXT_MANIFEST; }),
    corruptSource('unknown entry field', (source) => { source.entries[0].unclassified = true; }),
  ];
  for (const [name, source] of invalidSources) {
    assert.equal(indexProjectionState(null, source).status, 'INVALID', `${name}: missing index recovered`);
    assert.equal(frozenIndexState(root, (path) => {
      if (path.endsWith(CONTEXT_MANIFEST)) return JSON.stringify(source);
      throw Object.assign(new Error('index inaccessible'), { code: 'EACCES' });
    }).status, 'INVALID', `${name}: unreadable index recovered`);
  }
  for (const changed of [projected.slice(1), projected.map((entry, n) => n ? entry : { ...entry, condition: 'weakened' }),
    projected.map((entry, n) => n ? entry : { ...entry, load_before: 'after protected action' }),
    projected.map((entry, n) => n ? entry : { ...entry, truth_owner: '/wrong-owner' }),
    projected.map((entry, n) => n ? entry : { ...entry, invented: true })]) {
    assert.equal(indexProjectionState(indexText(changed), indexManifest).status, 'STALE',
      'missing entry, negative condition, deadline, authority or unknown projection field escaped');
  }
  assert.equal(indexProjectionState('not JSON', indexManifest).status, 'STALE');
  assert.equal(indexProjectionState(indexText(projected), { ...indexManifest,
    entries: indexManifest.entries.map((entry, n) => n ? entry : { ...entry, unclassified: true }) }).status,
  'INVALID', 'unclassified source field became a healthy projection');
  const complete = { complete: true }, incomplete = { complete: false };
  const evidence = (index, manifest) => ({ index, manifest });
  const failure = [{ type: 'item.completed', command: `cat ${CONTEXT_INDEX}`, exit_code: 1 }];
  const spoof = [{ type: 'item.completed', command: `cat ${CONTEXT_INDEX}`, exit_code: 0,
    output: 'permission denied' }];
  const unrelated = [{ type: 'item.completed', command: 'cat CONTEXT.md', exit_code: 1 }];
  for (const [name, trace, state, observed, expected] of [
    ['healthy', [], { status: 'HEALTHY' }, evidence(complete, incomplete), 'INDEX'],
    ['missing', [], { status: 'MISSING' }, evidence(incomplete, complete), 'RECOVERED'],
    ['proven-stale', [], { status: 'STALE' }, evidence(complete, complete), 'RECOVERED'],
    ['real-read-failure', failure, { status: 'HEALTHY' }, evidence(incomplete, complete), 'RECOVERED'],
    ['spoofed-error', spoof, { status: 'HEALTHY' }, evidence(incomplete, complete), 'FAIL'],
    ['truncated-not-unreadable', [], { status: 'HEALTHY' }, evidence(incomplete, complete), 'FAIL'],
    ['partial-manifest', failure, { status: 'HEALTHY' }, evidence(incomplete, incomplete), 'FAIL'],
    ['other-file-failure', unrelated, { status: 'HEALTHY' }, evidence(incomplete, complete), 'FAIL'],
    ['invalid-source', failure, { status: 'INVALID' }, evidence(incomplete, complete), 'FAIL'],
  ]) assert.equal(indexFallbackDecision(trace, state, observed).status, expected, name);
  assert.equal(candidateTracePolicy(failure, 'AGENTS.md', [CONTEXT_MANIFEST],
    { recovered: true, status: 'RECOVERED', failed_target: CONTEXT_INDEX }).pass, true,
  'real index failure was not admitted');
  assert.equal(candidateTracePolicy(unrelated, 'AGENTS.md', [CONTEXT_MANIFEST],
    { recovered: true, status: 'RECOVERED', failed_target: CONTEXT_INDEX }).pass, false,
  'unrelated failure was excused');
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
    trace: [], isolation: {} }).check.pass, false, 'answer without a native decision boundary passed');
  const successfulClaudeTurn = claudeProjection([{ type: 'result', is_error: false,
    structured_output: { claims: { result: '4' }, source: [] } }]);
  assert.equal(scoreDecision(fixtures.F1, { ...successfulClaudeTurn, isolation: {} }).check.pass, true,
    'Claude native result was not accepted as a decision boundary');
  const failedClaudeTurn = claudeProjection([{ type: 'result', is_error: true,
    structured_output: { claims: { result: '4' }, source: [] } }]);
  assert.equal(scoreDecision(fixtures.F1, { ...failedClaudeTurn, isolation: {} }).check.pass, false,
    'Claude native failed turn was scored as a clean answer');
  console.log(JSON.stringify(runBranchFixtureContractTests({ claimsMatch, answerSchema: answerSchemaFor })));
  console.log(JSON.stringify(runG5ContractTests()));
  console.log(JSON.stringify({ g5_offline_metrics: runG5OfflineMetricTests() }));
  console.log(JSON.stringify({ g5_finalize_file: runG5OfflineFinalizeFileTests() }));
  console.log(JSON.stringify({ g5_offline_effects: await runG5OfflineEffectTests(), live_sessions: 0 }));
  console.log(JSON.stringify({ g5_t2_ordering: runG5OfflineT2OrderingTests() }));
  if (arm === 'baseline') {
    console.log('PASS baseline G5 contract, metric, and production-effect offline self-test');
    process.exit(0);
  }
  console.log(JSON.stringify({ g5_offline_transport: await runG5OfflineTransportTests() }));
  assert.deepEqual(legacyFixtureIds, ['F1', 'F2', 'F3', 'F4-direct', 'F4-multi', 'F4-stop',
    'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  'P3 expanded or reordered the frozen 14-cell legacy fixture set');
  if (arm === 'candidate') {
    const identityFiles = new Set(contextFiles().map((path) => relative(root, path)));
    for (const path of ['.claude/agents/references/plan-engineering-modes.md',
      '.claude/agents/references/plan-design-guidance.md',
      '.claude/agents/references/plan-assertion-examples.md']) {
      assert.ok(identityFiles.has(path), `context identity omits Plan reference: ${path}`);
    }
  }
  const projectOwner = PROJECT_SESSION;
  const projectText = readFileSync(join(root, projectOwner), 'utf8');
  const ownProjectRoot = harness === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  for (const traceKind of ['claude', 'codex']) {
    const readTrace = (path, partial = false, traceRoot = root, idSuffix = '') => {
      const text = readFileSync(join(traceRoot, path), 'utf8');
      const content = partial ? text.split('\n')[0] : text;
      if (traceKind === 'codex') return codexProjection([{ type: 'item.completed', item: {
        type: 'command_execution', command: partial ? `head -n 1 ${path}` : `cat ${path}`,
        exit_code: 0, aggregated_output: content,
      } }]).trace;
      return claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: `${path}${idSuffix}`, name: 'Read',
          input: { file_path: join(traceRoot, path), ...(partial ? { limit: 1 } : {}) } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `${path}${idSuffix}`, content }] } },
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
    const answerTrace = (payload, suffix = '') => traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: {
        type: 'agent_message', text: JSON.stringify(payload),
      } }]).trace
      : claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: `answer${suffix}`,
          name: 'StructuredOutput', input: payload }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `answer${suffix}`,
          content: 'Structured output provided successfully' }] } },
      ]).trace;
    for (const id of ['F13-page-handoff', 'F14-flow-preservation', 'F10-v2', 'F4-stop', 'F2', 'F3', 'F7', 'F10']) {
      const fixture = fixtures[id];
      const claims = branchFixturePositiveClaims(id)
        || Object.fromEntries(Object.entries(fixture.claims).map(([key, spec]) => [key, spec.equals]));
      const requiresProjectOwner = (fixture.targets || []).includes(projectOwner);
      const otherTargets = [...new Set(['CONTEXT.md', CONTEXT_INDEX, ...(fixture.targets || [])])]
        .filter((target) => target !== projectOwner);
      const baseTrace = [...summary, ...otherTargets.flatMap((path) => readTrace(path))];
      const projectTrace = requiresProjectOwner ? readTrace(projectOwner) : [];
      const fullTrace = [...baseTrace, ...projectTrace];
      const answer = { claims, source: [ownProjectRoot, ...otherTargets] };
      const full = evaluate(fixture, answer, fullTrace, {}, 'candidate');
      assert.equal(full.pass, true, `${traceKind}/${id}: complete boundary-scoped reads failed`);
      assert.equal(full.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
        'INDEX', `${traceKind}/${id}: healthy index was not used as the conditional source`);
      if (!requiresProjectOwner) {
        const speculative = evaluate(fixture, answer, [...baseTrace, ...readTrace(projectOwner)], {}, 'candidate');
        assert.equal(speculative.pass, false, `${traceKind}/${id}: speculative project-session read passed`);
        assert.ok(speculative.target_checks.some((check) => check.trace_policy?.violations
          ?.some((violation) => violation.reason === 'read outside exact allowed target set'
            && violation.path === join(root, projectOwner))),
        `${traceKind}/${id}: speculative project-session rejection lacked exact evidence`);
      }
      const fallbackTargets = otherTargets.map((target) => target === CONTEXT_INDEX ? CONTEXT_MANIFEST : target);
      const fallbackBaseTrace = [...summary, ...fallbackTargets.flatMap((path) => readTrace(path))];
      const fallbackAnswer = { claims, source: [ownProjectRoot, ...fallbackTargets] };
      const failedIndexTrace = traceKind === 'codex'
        ? codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
          command: `cat ${CONTEXT_INDEX}`, exit_code: 1, aggregated_output: 'not found' } }]).trace
        : claudeProjection([
          { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'index-failed', name: 'Read',
            input: { file_path: join(root, CONTEXT_INDEX) } }] } },
          { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'index-failed',
            is_error: true, content: 'not found' }] } },
        ]).trace;
      const recovered = evaluate(fixture, fallbackAnswer,
        [...summary, ...failedIndexTrace, ...fallbackBaseTrace.slice(summary.length), ...projectTrace], {}, 'candidate');
      assert.equal(recovered.pass, true, `${traceKind}/${id}: authentic index failure did not recover`);
      assert.equal(recovered.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
        'RECOVERED', `${traceKind}/${id}: authentic failure status was erased`);
      const answerEvent = answerTrace(fallbackAnswer, `-${id}-fallback`);
      const healthyAnswerEvent = answerTrace(answer, `-${id}-healthy`);
      const early = evaluate(fixture, fallbackAnswer,
        [...summary, ...answerEvent, ...fallbackBaseTrace.slice(summary.length), ...projectTrace], {}, 'candidate');
      assert.equal(early.pass, false, `${traceKind}/${id}: answer before manifest fallback passed`);
      assert.equal(early.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
        'FAIL', `${traceKind}/${id}: late fallback was called RECOVERED`);
      if (traceKind === 'claude') {
        const textAnswer = claudeProjection([{ type: 'assistant', message: {
          content: [{ type: 'text', text: JSON.stringify(fallbackAnswer) }],
        } }]).trace;
        const textEarly = evaluate(fixture, fallbackAnswer,
          [...summary, ...textAnswer, ...fallbackBaseTrace.slice(summary.length), ...projectTrace, ...answerEvent],
          {}, 'candidate');
        assert.equal(textEarly.pass, false, `${traceKind}/${id}: early assistant-text answer passed`);
        assert.equal(textEarly.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
          'FAIL', `${traceKind}/${id}: assistant-text decision did not delimit late recovery`);
        const serialized = JSON.stringify(fallbackAnswer);
        const splitAt = serialized.indexOf(',"source"');
        assert.ok(splitAt > 0, 'split-answer fixture must separate claims from source');
        const splitAnswer = claudeProjection([{ type: 'assistant', message: { content: [
          { type: 'text', text: serialized.slice(0, splitAt) },
          { type: 'text', text: serialized.slice(splitAt) },
        ] } }]).trace;
        const splitEarly = evaluate(fixture, fallbackAnswer,
          [...summary, ...splitAnswer, ...fallbackBaseTrace.slice(summary.length), ...projectTrace, ...answerEvent],
          {}, 'candidate');
        assert.equal(splitEarly.pass, false, `${traceKind}/${id}: split assistant-text answer passed`);
        assert.equal(splitEarly.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
          'FAIL', `${traceKind}/${id}: split answer did not delimit late recovery`);
        const splitTimely = evaluate(fixture, fallbackAnswer,
          [...summary, ...failedIndexTrace, ...fallbackBaseTrace.slice(summary.length),
            ...projectTrace, ...splitAnswer, ...answerEvent], {}, 'candidate');
        assert.equal(splitTimely.pass, true, `${traceKind}/${id}: complete reads before split answer failed`);
      }
      const lateSummary = evaluate(fixture, answer,
        [...baseTrace.slice(summary.length), ...projectTrace, ...healthyAnswerEvent, ...summary],
        {}, 'candidate');
      assert.equal(lateSummary.pass, false, `${traceKind}/${id}: memory summary after answer passed`);
      assert.equal(lateSummary.target_checks.find((entry) => 'memory_summary_before_decision' in entry)
        ?.memory_summary_before_decision, false, `${traceKind}/${id}: late memory summary marked complete`);
      const timely = evaluate(fixture, answer,
        [...fullTrace, ...healthyAnswerEvent], {}, 'candidate');
      assert.equal(timely.pass, true, `${traceKind}/${id}: timely fallback answer failed`);
      if (id === 'F10') {
        const fallbackRoot = mkdtempSync(join(tmpdir(), `agent-context-f10-fallback-${traceKind}-`));
        try {
          const selectedView = HTML_PROTOTYPE_INPUT_MODE;
          for (const path of [...new Set([ownProjectRoot, CONTEXT_MANIFEST,
            INPUT_MODE_SOURCE, ...otherTargets])]) {
            mkdirSync(dirname(join(fallbackRoot, path)), { recursive: true });
            cpSync(join(root, path), join(fallbackRoot, path));
          }
          const stalePath = join(fallbackRoot, selectedView);
          const staleView = JSON.parse(readFileSync(stalePath, 'utf8'));
          staleView.skill = 'ux-writing';
          writeFileSync(stalePath, `${JSON.stringify(staleView)}\n`);
          assert.equal(selectedInputModeState(fixture, fallbackRoot).status, 'STALE',
            `${traceKind}/${id}: stale fallback root was not classified`);
          const fallbackTargets = [...new Set(otherTargets.map((target) => target === selectedView
            ? INPUT_MODE_SOURCE : target))];
          const preFallbackTargets = fallbackTargets.filter((target) => target !== INPUT_MODE_SOURCE);
          const fallbackAnswer = { claims, source: [ownProjectRoot, ...fallbackTargets] };
          const proofRead = readTrace(selectedView, false, fallbackRoot);
          const sourceRead = readTrace(INPUT_MODE_SOURCE, false, fallbackRoot, '-post-proof');
          const earlySourceRead = readTrace(INPUT_MODE_SOURCE, false, fallbackRoot, '-pre-proof');
          const selectedFallback = evaluate(fixture, fallbackAnswer,
            [...summary, ...preFallbackTargets.flatMap((path) => readTrace(path, false, fallbackRoot)),
              ...proofRead, ...sourceRead], {}, 'candidate', fallbackRoot);
          assert.equal(selectedFallback.pass, true, `${traceKind}/${id}: proven-stale selected-view fallback failed`);
          assert.equal(selectedFallback.target_checks.find((entry) => entry.input_mode_recovery)
            ?.input_mode_recovery.status, 'RECOVERED', `${traceKind}/${id}: selected-view fallback was not labelled RECOVERED`);
          const earlySource = evaluate(fixture, fallbackAnswer,
            [...summary, ...preFallbackTargets.flatMap((path) => readTrace(path, false, fallbackRoot)),
              ...earlySourceRead, ...proofRead, ...sourceRead],
            {}, 'candidate', fallbackRoot);
          assert.equal(earlySource.pass, false,
            `${traceKind}/${id}: early source read was laundered by a post-proof reread`);
        } finally { rmSync(fallbackRoot, { recursive: true, force: true }); }
      }
      if (['F3', 'F7', 'F10'].includes(id)) {
        for (const target of fixture.targets) {
          const withoutTarget = otherTargets.filter((path) => path !== target);
          const missingTrace = [...summary, ...withoutTarget.flatMap((path) => readTrace(path)), ...projectTrace];
          const missing = evaluate(fixture, answer, missingTrace, {}, 'candidate');
          assert.equal(missing.pass, false, `${traceKind}/${id}: missing P3 target passed: ${target}`);
          assert.equal(missing.target_checks.find((entry) => entry.target === target)?.complete, false,
            `${traceKind}/${id}: missing P3 target lacked read evidence: ${target}`);
        }
        const unrelatedManifestOwner = '.claude/skill-os/runtime/luca-app.md';
        const forbiddenExtras = id === 'F3'
          ? ['.claude/agents/references/plan-assertion-examples.md', unrelatedManifestOwner, SKILL_CATALOG]
          : id === 'F7' ? ['.claude/skills/office/references/office-wizard.md', unrelatedManifestOwner, SKILL_CATALOG]
            : [INPUT_MODE_SOURCE, '.claude/skill-os/generated/input-modes/ux-writing.json', unrelatedManifestOwner];
        for (const forbiddenExtra of forbiddenExtras) {
          const withExtra = evaluate(fixture, answer,
            [...fullTrace, ...readTrace(forbiddenExtra)], {}, 'candidate');
          assert.equal(withExtra.pass, false, `${traceKind}/${id}: unbound extra read passed: ${forbiddenExtra}`);
        }
      }
      if (id === 'F14-flow-preservation') {
        const wizard = '.claude/skills/office/references/office-wizard.md';
        assert.ok(!reachableContextTargets(fixture).includes(wizard),
          `${traceKind}/${id}: office wizard escaped the exact reachable target set`);
        const withWizard = evaluate(fixture, answer,
          [...fullTrace, ...readTrace(wizard)], {}, 'candidate');
        assert.equal(withWizard.pass, false,
          `${traceKind}/${id}: a complete legal trace plus an uninvoked office-wizard read passed`);
        assert.ok(withWizard.target_checks.some((check) => check.trace_policy?.violations
          ?.some((violation) => violation.reason === 'read outside exact allowed target set'
            && violation.path === join(root, wizard))),
        `${traceKind}/${id}: office-wizard rejection lacked exact trace-policy evidence`);
      }
      if (requiresProjectOwner) {
        for (const [mode, trace] of [['missing', baseTrace], ['partial', [...baseTrace, ...readTrace(projectOwner, true)]]]) {
          const check = evaluate(fixture, answer, trace, {}, 'candidate');
          assert.equal(check.claims_pass, true, `${traceKind}/${id}/${mode}: claim sample drift`);
          assert.equal(check.source_pass, true, `${traceKind}/${id}/${mode}: source failure hides required-read check`);
          assert.equal(check.pass, false, `${traceKind}/${id}/${mode}: incomplete project-session read passed`);
          const ownerCheck = check.target_checks.find((entry) => entry.target === projectOwner);
          assert.equal(ownerCheck?.complete, false);
          assert.equal(ownerCheck.evidence.length > 0, mode === 'partial');
        }
        const lateOwner = evaluate(fixture, answer,
          [...baseTrace, ...healthyAnswerEvent, ...readTrace(projectOwner)], {}, 'candidate');
        assert.equal(lateOwner.pass, false, `${traceKind}/${id}: project-session read after decision passed`);
        assert.equal(full.target_checks.filter((check) => check.target === projectOwner).length, 1,
          `${traceKind}/${id}: project-session target was not deduplicated`);
        assert.equal(evaluate(fixture, answer, fullTrace, {}, 'candidate').pass, true,
          `${traceKind}/${id}: restored project-session read failed`);
      }
      assert.equal(evaluate(fixture, answer, baseTrace, {}, 'baseline').pass, true,
        `${traceKind}/${id}: candidate-only required read leaked into baseline`);
    }

    const hotPaths = ['CONTEXT.md', CONTEXT_INDEX];
    const hotTrace = [...summary, ...hotPaths.flatMap((path) => readTrace(path))];
    const appClaims = { focused_context_owner: LUCA_APP_OWNER };
    const appHotAnswer = { claims: appClaims, source: [ownProjectRoot, ...hotPaths] };
    assert.equal(evaluate(fixtures.F11, appHotAnswer, hotTrace, {}, 'candidate').pass, true,
      `${traceKind}: LUCA_APP environment-only owner discovery required a cold read`);
    assert.equal(evaluate(fixtures.F11, appHotAnswer,
      [...hotTrace, ...readTrace(LUCA_APP_OWNER)], {}, 'candidate').pass, false,
    `${traceKind}: LUCA_APP environment-only turn allowed a speculative cold owner read`);

    const appReferenceFixture = {
      ...fixtures.F11,
      request: 'Explain the contract for resolving the current sidebar selection before answering.',
      candidateSourceTargets: [LUCA_APP_OWNER],
      targets: [LUCA_APP_OWNER],
    };
    const appActionAnswer = { claims: appClaims,
      source: [ownProjectRoot, ...hotPaths, LUCA_APP_OWNER] };
    const appActionRead = readTrace(LUCA_APP_OWNER);
    assert.equal(evaluate(appReferenceFixture, appActionAnswer,
      [...hotTrace, ...appActionRead], {}, 'candidate').pass, true,
    `${traceKind}: app reference rejected a timely cold owner read`);
    assert.equal(evaluate(appReferenceFixture, appActionAnswer, hotTrace, {}, 'candidate').pass, false,
      `${traceKind}: app reference passed without its cold owner`);
    assert.equal(evaluate(appReferenceFixture, appActionAnswer,
      [...hotTrace, ...answerTrace(appActionAnswer, '-app-early'), ...appActionRead], {}, 'candidate').pass, false,
    `${traceKind}: app reference owner read after the answer boundary passed`);

    const appInput = { path: join(root, 'README.md'), target: 'split' };
    const appActionFixture = {
      ...appReferenceFixture,
      request: 'Open the local README in the sidebar before answering.',
      protectedActions: [{ server: 'muse', name: 'open_in_view', input: appInput, success: 'opened' }],
    };
    const actionUseTrace = ({ id = 'app-1', server = 'muse', name = 'open_in_view', input = appInput,
      status = 'in_progress', claudeName = `mcp__${server}__${name}` } = {}) => traceKind === 'codex'
      ? codexProjection([{ type: 'item.started', item: { id, type: 'mcp_tool_call', server,
        tool: name, arguments: input, status } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'tool_use', id,
        name: claudeName, input, caller: { type: 'direct' } }] } }]).trace;
    const actionReceiptTrace = ({ id = 'app-1', server = 'muse', name = 'open_in_view', input = appInput,
      status = 'completed', result = 'opened', error, isError = false, content = 'opened',
      omitResult = false, omitContent = false, omitErrorMarker = false, truncated = false } = {}) => {
      if (traceKind === 'codex') {
        const item = { id, type: 'mcp_tool_call', server, tool: name, arguments: input, status };
        if (!omitResult) item.result = result;
        if (error !== undefined) item.error = error;
        if (truncated) item.truncated = true;
        return codexProjection([{ type: 'item.completed', item }]).trace;
      }
      const block = { type: 'tool_result', tool_use_id: id };
      if (!omitErrorMarker) block.is_error = isError;
      if (!omitContent) block.content = content;
      if (truncated) block.truncated = true;
      return claudeProjection([{ type: 'user', message: { content: [block] } }]).trace;
    };
    const appActionStart = actionUseTrace();
    const appActionReceipt = actionReceiptTrace();
    const appActionTrace = [...appActionStart, ...appActionReceipt];
    const appFinal = answerTrace(appActionAnswer, '-app-action');
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionTrace, ...appFinal], {}, 'candidate').pass, true,
    `${traceKind}: successful app action after its owner was rejected`);
    const reorderedInput = { target: appInput.target, path: appInput.path };
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...actionUseTrace({ id: 'app-reordered', input: reorderedInput }),
        ...actionReceiptTrace({ id: 'app-reordered', input: reorderedInput }), ...appFinal], {}, 'candidate').pass, true,
    `${traceKind}: semantically identical app input key order was rejected`);
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionTrace, ...appActionRead, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: app action before its owner passed`);
    assert.equal(evaluate(appReferenceFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionTrace, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: app action passed without an exact fixture binding`);
    for (const [mode, trace] of [
      ['missing owner', [...hotTrace, ...appActionTrace, ...appFinal]],
      ['partial owner', [...hotTrace, ...readTrace(LUCA_APP_OWNER, true), ...appActionTrace, ...appFinal]],
      ['missing receipt', [...hotTrace, ...appActionRead, ...appActionStart, ...appFinal]],
      ['receipt after answer', [...hotTrace, ...appActionRead, ...appActionStart, ...appFinal, ...appActionReceipt]],
      ['action after answer', [...hotTrace, ...appActionRead, ...appFinal, ...appActionTrace]],
      ['failed receipt', [...hotTrace, ...appActionRead, ...appActionStart,
        ...actionReceiptTrace(traceKind === 'codex' ? { status: 'failed', error: 'denied' } : { isError: true }),
        ...appFinal]],
      ['missing receipt payload', [...hotTrace, ...appActionRead, ...appActionStart,
        ...actionReceiptTrace(traceKind === 'codex' ? { omitResult: true } : { omitContent: true }), ...appFinal]],
      ['duplicate receipt', [...hotTrace, ...appActionRead, ...appActionStart,
        ...appActionReceipt, ...appActionReceipt, ...appFinal]],
      ['wrong receipt id', [...hotTrace, ...appActionRead, ...appActionStart,
        ...actionReceiptTrace({ id: 'app-other' }), ...appFinal]],
      ['receipt before action', [...hotTrace, ...appActionRead, ...appActionReceipt,
        ...appActionStart, ...appFinal]],
      ['completion only', [...hotTrace, ...appActionRead, ...appActionReceipt, ...appFinal]],
    ]) assert.equal(evaluate(appActionFixture, appActionAnswer, trace, {}, 'candidate').pass, false,
      `${traceKind}: ${mode} app action passed`);
    for (const [index, receipt] of ['permission denied', '', false, { error: 'denied' }].entries()) {
      const receiptOptions = traceKind === 'codex' ? { result: receipt } : { content: receipt };
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...appActionStart,
          ...actionReceiptTrace(receiptOptions), ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: contradictory or non-exact success receipt ${index} passed`);
    }
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionStart,
        ...actionReceiptTrace({ truncated: true }), ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: truncated app success receipt passed`);

    const pendingOwnerStart = traceKind === 'codex'
      ? codexProjection([{ type: 'item.started', item: { id: 'pending-owner', type: 'command_execution',
        command: `cat ${LUCA_APP_OWNER}`, status: 'in_progress' } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'pending-owner',
        name: 'Read', input: { file_path: join(root, LUCA_APP_OWNER) } }] } }]).trace;
    const pendingOwnerReceipt = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { id: 'pending-owner', type: 'command_execution',
        command: `cat ${LUCA_APP_OWNER}`, status: 'completed', exit_code: 0,
        aggregated_output: readFileSync(join(root, LUCA_APP_OWNER), 'utf8') } }]).trace
      : claudeProjection([{ type: 'user', message: { content: [{ type: 'tool_result',
        tool_use_id: 'pending-owner', is_error: false,
        content: readFileSync(join(root, LUCA_APP_OWNER), 'utf8') }] } }]).trace;
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...pendingOwnerStart, ...appActionStart, ...pendingOwnerReceipt,
        ...appActionReceipt, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: owner read completed after the app action started`);
    const unreadableAppOwner = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { id: 'unreadable-app-owner', type: 'command_execution',
        command: `cat ${LUCA_APP_OWNER}`, status: 'failed', exit_code: 1,
        aggregated_output: 'permission denied' } }]).trace
      : claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'unreadable-app-owner',
          name: 'Read', input: { file_path: join(root, LUCA_APP_OWNER) } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'unreadable-app-owner',
          is_error: true, content: 'permission denied' }] } },
      ]).trace;
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...unreadableAppOwner, ...appActionTrace, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: app action passed after an unreadable owner`);

    const wrongInputs = [
      { ...appInput, extra: true },
      { path: appInput.path },
      { ...appInput, target: 'main' },
      { ...appInput, path: 7 },
      null,
    ];
    for (const [index, input] of wrongInputs.entries()) {
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...actionUseTrace({ id: `bad-input-${index}`, input }),
          ...actionReceiptTrace({ id: `bad-input-${index}`, input }), ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: malformed or mismatched app input ${index} passed`);
    }
    for (const [index, input] of [null, {}, { path: appInput.path },
      { ...appInput, extra: true }, { ...appInput, path: 7 }, { ...appInput, target: ' ' }].entries()) {
      const malformedBindingFixture = { ...appActionFixture,
        protectedActions: [{ server: 'muse', name: 'open_in_view', input, success: 'opened' }] };
      assert.equal(evaluate(malformedBindingFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...actionUseTrace({ id: `malformed-binding-${index}`, input }),
          ...actionReceiptTrace({ id: `malformed-binding-${index}`, input }), ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: matching malformed fixture/action input ${index} passed`);
    }
    for (const [index, success] of ['', ' opened\n', false, { status: 'opened' }].entries()) {
      const malformedSuccessFixture = { ...appActionFixture,
        protectedActions: [{ server: 'muse', name: 'open_in_view', input: appInput, success }] };
      assert.equal(evaluate(malformedSuccessFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...appActionTrace, ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: malformed fixture success receipt ${index} passed`);
    }
    for (const [server, name] of [['other', 'open_in_view'], ['muse', 'open_in_views']]) {
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...actionUseTrace({ server, name }),
          ...actionReceiptTrace({ server, name }), ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: wrong app server/name passed: ${server}/${name}`);
    }
    if (traceKind === 'claude') {
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...actionUseTrace({ claudeName: 'open_in_view' }),
          ...appActionReceipt, ...appFinal], {}, 'candidate').pass, false,
      'claude: unnamespaced app action forged a muse server binding');
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...appActionStart,
          ...actionReceiptTrace({ omitErrorMarker: true }), ...appFinal], {}, 'candidate').pass, false,
      'claude: missing explicit success marker passed');
      const nonBooleanReceipt = claudeProjection([{ type: 'user', message: { content: [{ type: 'tool_result',
        tool_use_id: 'app-1', is_error: 'false', content: 'opened' }] } }]).trace;
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...appActionStart, ...nonBooleanReceipt, ...appFinal], {}, 'candidate').pass, false,
      'claude: malformed success marker passed');
    } else {
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...appActionStart,
          ...actionReceiptTrace({ input: { ...appInput, target: 'main' } }), ...appFinal], {}, 'candidate').pass, false,
      'codex: mismatched start/completion input passed');
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...actionUseTrace({ status: 'queued' }),
          ...appActionReceipt, ...appFinal], {}, 'candidate').pass, false,
      'codex: malformed start status passed');
    }
    const nativeTerminalBoundary = traceKind === 'codex'
      ? codexProjection([{ type: 'turn.completed', usage: {} }]).trace
      : claudeProjection([{ type: 'result', is_error: false,
        structured_output: appActionAnswer }]).trace;
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionStart, ...nativeTerminalBoundary,
        ...appActionReceipt], {}, 'candidate').pass, false,
    `${traceKind}: app receipt after native terminal boundary passed`);
    const malformedNativeActions = traceKind === 'codex' ? [
      codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress', result: 'premature' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened' } },
      ]).trace,
      codexProjection([
        { type: 'item.started', unexpected: true, item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened' } },
      ]).trace,
      codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened', truncated: 'true' } },
      ]).trace,
      codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened', error: null } },
      ]).trace,
      [...appActionStart, ...codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'command_execution',
          command: `cat CONTEXT.md`, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'command_execution',
          command: `cat CONTEXT.md`, status: 'completed', exit_code: 0,
          aggregated_output: readFileSync(join(root, 'CONTEXT.md'), 'utf8') } },
      ]).trace, ...appActionReceipt],
      codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'agent_message',
          text: JSON.stringify(appActionAnswer) } },
      ]).trace,
      codexProjection([
        { type: 'item.started', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'in_progress' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'mcp_tool_call', server: 'muse',
          tool: 'open_in_view', arguments: appInput, status: 'completed', result: 'opened' } },
        { type: 'item.completed', item: { id: 'app-1', type: 'reasoning', text: 'hidden' } },
      ]).trace,
    ] : [
      claudeProjection([
        { type: 'assistant', unexpected: true, message: { content: [{ type: 'tool_use', id: 'app-1',
          name: 'mcp__muse__open_in_view', input: appInput, caller: { type: 'direct' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'app-1',
          is_error: false, content: 'opened' }] } },
      ]).trace,
      claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'app-1',
          name: 'mcp__muse__open_in_view', input: appInput, caller: { type: 'direct' }, unexpected: true }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'app-1',
          is_error: false, content: 'opened' }] } },
      ]).trace,
      claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'app-1',
          name: 'mcp__muse__open_in_view', input: appInput, caller: { type: 'direct' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'app-1', is_error: false,
          content: [{ type: 'text', text: 'opened' }, { type: 'image', data: 'hidden' }] }] } },
      ]).trace,
      claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'app-1',
          name: 'mcp__muse__open_in_view', input: appInput, caller: { type: 'direct' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'app-1',
          is_error: false, content: 'opened', truncated: 'true' }] } },
      ]).trace,
      claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'app-1',
          name: 'mcp__muse__open_in_view', input: appInput, caller: { type: 'delegated' } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'app-1',
          is_error: false, content: 'opened' }] } },
      ]).trace,
    ];
    for (const [index, malformedAction] of malformedNativeActions.entries()) {
      assert.equal(evaluate(appActionFixture, appActionAnswer,
        [...hotTrace, ...appActionRead, ...malformedAction, ...appFinal], {}, 'candidate').pass, false,
      `${traceKind}: malformed native app envelope ${index} passed`);
    }
    const duplicateObserved = [...appActionTrace,
      ...actionUseTrace({ id: 'app-2' }), ...actionReceiptTrace({ id: 'app-2' })];
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...duplicateObserved, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: duplicate observed app action passed`);
    const duplicateDeclaredFixture = { ...appActionFixture,
      protectedActions: [...appActionFixture.protectedActions, ...appActionFixture.protectedActions] };
    assert.equal(evaluate(duplicateDeclaredFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionTrace, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: duplicate declared app action passed`);
    const unrelatedMcp = traceKind === 'codex'
      ? codexProjection([{ type: 'item.started', item: { id: 'other-mcp', type: 'mcp_tool_call',
        server: 'muse', tool: 'read_view', arguments: {}, status: 'in_progress' } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'other-mcp',
        name: 'mcp__muse__read_view', input: {} }] } }]).trace;
    assert.equal(evaluate(appActionFixture, appActionAnswer,
      [...hotTrace, ...appActionRead, ...appActionTrace, ...unrelatedMcp, ...appFinal], {}, 'candidate').pass, false,
    `${traceKind}: unrelated MCP activity was hidden beside an approved app action`);

    const semanticProjectFixture = {
      ...fixtures.F2,
      request: '沿用上一轮提到的那个客户空间，在读取其中资料前先判断本轮是否已有权限。',
    };
    assert.doesNotMatch(semanticProjectFixture.request,
      /project|项目|老项目|新项目|继续|NO_PIN|只读引用/i,
      `${traceKind}: semantic project fixture accidentally contains a manifest hint`);
    const projectClaims = Object.fromEntries(Object.entries(semanticProjectFixture.claims)
      .map(([key, spec]) => [key, spec.equals]));
    const projectAnswer = { claims: projectClaims, source: [ownProjectRoot, ...hotPaths] };
    const resumedPrefix = traceKind === 'codex'
      ? codexProjection([{ type: 'thread.started', thread_id: 'synthetic-resume' },
        { type: 'turn.started' }]).trace
      : claudeProjection([{ type: 'system', subtype: 'init', cwd: root, model: 'synthetic-resume' }]).trace;
    const resumedBase = [...resumedPrefix, ...hotTrace];
    const timelyProject = evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...readTrace(projectOwner)], {}, 'candidate');
    assert.equal(timelyProject.pass, true,
      `${traceKind}: semantic/no-keyword resumed project boundary rejected a timely owner read`);
    const progressBeforeProjectOwner = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { type: 'agent_message',
        text: 'Progress update only: reading the required owner before the decision.' } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'text',
        text: 'Progress update only: reading the required owner before the decision.' }] } }]).trace;
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...progressBeforeProjectOwner, ...readTrace(projectOwner),
        ...answerTrace(projectAnswer, '-project-after-progress')], {}, 'candidate').pass, true,
    `${traceKind}: a non-decision progress update moved the actual project boundary earlier`);
    const historicalProgress = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { type: 'agent_message',
        text: HISTORICAL_PROJECT_PROGRESS } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'text',
        text: HISTORICAL_PROJECT_PROGRESS }] } }]).trace;
    const historicalFinal = answerTrace(projectAnswer, '-historical-project-progress');
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...historicalProgress, ...readTrace(projectOwner), ...historicalFinal], {}, 'candidate').pass, true,
    `${traceKind}: exact historical progress blocked a timely project owner`);
    if (traceKind === 'claude') {
      const splitAt = HISTORICAL_PROJECT_PROGRESS.indexOf(' I will read');
      const splitHistoricalProgress = claudeProjection([{ type: 'assistant', message: { content: [
        { type: 'text', text: HISTORICAL_PROJECT_PROGRESS.slice(0, splitAt) },
        { type: 'text', text: HISTORICAL_PROJECT_PROGRESS.slice(splitAt) },
      ] } }]).trace;
      assert.equal(evaluate(semanticProjectFixture, projectAnswer,
        [...resumedBase, ...splitHistoricalProgress, ...readTrace(projectOwner), ...historicalFinal],
        {}, 'candidate').pass, true,
      'claude: native text-block segmentation changed the exact historical progress meaning');
    }
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...historicalProgress, ...historicalFinal, ...readTrace(projectOwner)], {}, 'candidate').pass, false,
    `${traceKind}: exact historical progress allowed a late project owner`);
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...historicalProgress, ...readTrace(projectOwner)], {}, 'candidate', root, true).pass, false,
    `${traceKind}: exact historical progress passed without a trusted final boundary`);
    const plainDecisionBeforeProjectOwner = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { type: 'agent_message',
        text: 'Old unnamed inherited space: Project Gate with confirmation; named existing space: Project Gate without confirmation; use the route-guard transaction and verify the session pin.' } }]).trace
      : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'text',
        text: 'Old unnamed inherited space: Project Gate with confirmation; named existing space: Project Gate without confirmation; use the route-guard transaction and verify the session pin.' }] } }]).trace;
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...plainDecisionBeforeProjectOwner, ...readTrace(projectOwner),
        ...answerTrace(projectAnswer, '-project-after-plain-decision')], {}, 'candidate').pass, false,
    `${traceKind}: a plain-text project decision was washed by a late owner read`);
    assert.equal(evaluate(semanticProjectFixture, projectAnswer, resumedBase, {}, 'candidate').pass, false,
      `${traceKind}: resumed first project boundary passed without its owner`);
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...answerTrace(projectAnswer, '-project-early'), ...readTrace(projectOwner)],
      {}, 'candidate').pass, false,
    `${traceKind}: resumed project owner read after the decision passed`);
    const failedProjectRead = traceKind === 'codex'
      ? codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
        command: `cat ${projectOwner}`, exit_code: 1, aggregated_output: 'permission denied' } }]).trace
      : claudeProjection([
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'project-unreadable',
          name: 'Read', input: { file_path: join(root, projectOwner) } }] } },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'project-unreadable',
          is_error: true, content: 'permission denied' }] } },
      ]).trace;
    assert.equal(evaluate(semanticProjectFixture, projectAnswer,
      [...resumedBase, ...failedProjectRead], {}, 'candidate').pass, false,
    `${traceKind}: unreadable project owner passed the protected boundary`);

    const explanationFixture = {
      request: 'Explain the product-neutral framework boundary without changing or reading any project.',
      claims: { remains_no_pin: { type: 'boolean', equals: true } },
    };
    const explanationAnswer = { claims: { remains_no_pin: true }, source: [ownProjectRoot, ...hotPaths] };
    const explanation = evaluate(explanationFixture, explanationAnswer, hotTrace, {}, 'candidate');
    assert.equal(explanation.pass, true, `${traceKind}: pure framework explanation required a cold project owner`);
    assert.equal(evaluate(explanationFixture, explanationAnswer,
      [...hotTrace, ...readTrace(projectOwner)], {}, 'candidate').pass, false,
    `${traceKind}: pure framework explanation allowed a speculative project owner read`);
    assert.deepEqual([explanation.pass,
      evaluate(semanticProjectFixture, projectAnswer, resumedBase, {}, 'candidate').pass,
      timelyProject.pass], [true, false, true],
    `${traceKind}: explanation-to-project turn sequence lost its boundary transition`);
  }
  console.log(JSON.stringify({ load_before_matrix: {
    trace_kinds: 2, synthetic_only: true, live_model: false,
    covers: ['pure-NO_PIN', 'project-timely-missing-late-unreadable', 'resume-first-action',
      'semantic-no-keyword', 'LUCA_APP-env-vs-action', 'fallback-at-boundary'],
  } }));
  assert.ok(projectText.split('\n').length > 1, 'partial-read counterexample needs a multi-line owner');
  const scopedRead = [{ type: 'item.completed', exit_code: 0, command: 'cat CONTEXT.md' }];
  assert.equal(sharedScopeAudit(scopedRead).status, 'PASS');
  for (const command of ['cat /not-supplied-checkout/forbidden.txt', 'cat docs/secret.md', 'cat .claude/workflow-state.yaml']) {
    assert.equal(sharedScopeAudit([{ type: 'item.completed', exit_code: 0, command }]).status, 'FAIL', command);
  }
  assert.equal(sharedScopeAudit([{ type: 'tool_use', name: 'Read', input: { file_path: '/not-supplied-checkout/forbidden.txt' } }]).status, 'FAIL');
  assert.equal(sharedScopeAudit([{ type: 'item.completed', exit_code: 0, command: 'unknown-reader' }]).status, 'UNKNOWN');
  assert.equal(sharedScopeAudit(scopedRead).status, 'PASS', 'restored shared scope did not pass');
  const skillBudgetNotice = { type: 'item.completed', item: {
    id: 'item_0', type: 'error', message: CODEX_SKILL_BUDGET_NOTICE,
  } };
  const noticeTrace = codexProjection([skillBudgetNotice]).trace;
  const reconnect = { type: 'error', message: 'Reconnecting... 2/5 (request timed out)' };
  const fallback = { type: 'item.completed', item: { id: 'item_1', type: 'error',
    message: 'Falling back from WebSockets to HTTPS transport. request timed out' } };
  const finish = [
    { type: 'item.completed', item: { type: 'agent_message', text: '{"claims":{"result":"4"},"source":[]}' } },
    { type: 'turn.completed', usage: {} },
  ];
  const recoveredStream = (...events) => [{ type: 'turn.started' }, ...events, ...finish];
  for (const event of [reconnect, fallback,
    { ...reconnect, message: 'Reconnecting... 3/7 (stream disconnected before completion: Connection reset by peer (os error 54))' },
    { ...fallback, item: { ...fallback.item, message: 'Falling back from WebSockets to HTTPS transport. another platform transport reason' } },
  ]) {
    const projected = codexProjection(recoveredStream(event));
    assert.deepEqual(projected.trace[0], { type: 'runtime_notice', event }, 'transport notice not preserved');
    assert.equal(sharedScopeAudit(projected.trace).status, 'PASS');
    assert.equal(scoreDecision(fixtures.F1, { ...projected, final: '', isolation: {} }).check.pass, false,
      'notice without an answer passed');
    for (const selectedArm of ['baseline', 'candidate']) {
      assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, projected.trace, {}, selectedArm).pass, true);
      assert.equal(evaluate(fixtures.F1, { claims: { result: '5' }, source: [] }, projected.trace, {}, selectedArm).pass, false,
        'notice hid a wrong answer');
    }
    for (const [command, expected] of [['unknown-reader', 'UNKNOWN'], ['cat /not-supplied-checkout/forbidden.txt', 'FAIL']]) {
      const trace = codexProjection(recoveredStream(event, { type: 'item.completed', item: {
        type: 'command_execution', command, exit_code: 0,
      } })).trace;
      assert.equal(sharedScopeAudit(trace).status, expected, 'transport notice hid I/O');
    }
  }
  for (const altered of [
    { ...reconnect, extra: true }, { ...reconnect, type: 'turn.failed' },
    ...['Reconnecting... 0/5 (request timed out)', 'Reconnecting... 6/5 (request timed out)',
      'Reconnecting... 2/0 (request timed out)', 'authentication failed', `${reconnect.message}\n`,
      `${reconnect.message}; run a command`].map(message => ({ ...reconnect, message })),
    { ...fallback, extra: true }, { ...fallback, type: 'item.started' },
    ...[{ extra: true }, { id: '' }, { id: 0 }, { type: 'file_change' },
      { message: `${fallback.item.message} ` }, { message: 'unknown error' }].map(delta => ({
      ...fallback, item: { ...fallback.item, ...delta },
    })),
  ]) {
    const projected = codexProjection(recoveredStream(altered));
    assert.equal(projected.trace[0].type, 'unclassified_activity', 'near-match transport event was exempted');
    assert.equal(sharedScopeAudit(projected.trace).status, 'UNKNOWN');
  }
  for (const events of [
    [reconnect, ...finish],
    [{ type: 'turn.started' }, reconnect],
    [{ type: 'turn.started' }, reconnect, { type: 'turn.completed' }],
    [{ type: 'turn.started' }, ...finish.slice(0, 1), reconnect, ...finish.slice(1)],
    [{ type: 'turn.started' }, reconnect, { type: 'turn.failed' }, ...finish],
    [{ type: 'turn.started' }, reconnect, { type: 'turn.started' }, ...finish],
    recoveredStream(reconnect, { type: 'error', message: 'unknown fatal error' }),
  ]) assert.equal(sharedScopeAudit(codexProjection(events).trace).status, 'UNKNOWN', 'unrecovered/unknown error passed');
  // Codex's native event shapes must not create a cross-harness exemption.
  const claudeTransportTrace = claudeProjection([{ type: 'assistant', message: { content: [
    { type: 'tool_use', id: 'transport-lookalike', name: 'Bash', input: {
      command: 'cat /not-supplied-checkout/forbidden.txt', description: reconnect.message,
    } },
  ] } }]).trace;
  assert.equal(sharedScopeAudit(claudeTransportTrace).status, 'FAIL');
  const replayDir = realpathSync(mkdtempSync(join(tmpdir(), 'agent-context-rescore-test-')));
  try {
    const ctx = contextIdentity(), scorer = scoringIdentity();
    const governed = readFileSync(join(root, 'memory/semantic/static-fallback-allowlist.txt'), 'utf8')
      .split('\n').map(line => line.split('#')[0].trim()).filter(Boolean);
    const oldManifest = { schema_version: 1, branch_fixture_version: BRANCH_FIXTURE_VERSION,
      contexts: { candidate: ctx.context_sha256, baseline: ctx.context_sha256 },
      scoring_revision: 'synthetic-old-scorer', scoring_sha256: 'a'.repeat(64), fallback_ids: governed };
    const oldManifestBytes = JSON.stringify(oldManifest);
    const nextManifest = { ...oldManifest, scoring_revision: SCORING_REVISION, scoring_sha256: scorer.scoring_sha256 };
    const row = { schema_version: 3, protocol_version: PROTOCOL_VERSION, harness: 'codex', arm,
      fixture: 'F1', fixture_sha256: fixtureDigest(fixtures.F1), schema_sha256: schemaDigest(fixtures.F1),
      total: 1, passed: 0, run_id: 'synthetic-rescore-only', batch_id: 'synthetic',
      memory_root: root, memory_root_source: 'evaluator-env', prompt_mode: 'single-fixture-repository',
      context_sha256: ctx.context_sha256, context_after_sha256: ctx.context_sha256,
      scoring_revision: oldManifest.scoring_revision, scoring_sha256: oldManifest.scoring_sha256,
      release_manifest_sha256: sha256(oldManifestBytes),
      check: { context_stable: true, scoring_stable: true, release_manifest_stable: true, model_identity_pass: true },
      answer: { claims: { result: 'wrong-derived-answer' }, source: [] },
      raw_stdout: [{ type: 'thread.started', thread_id: 'synthetic-thread' }, ...recoveredStream(reconnect)]
        .map(event => JSON.stringify(event)).join('\n') };
    validateRescoreSource(row, oldManifest, sha256(oldManifestBytes), ctx, 'F1');
    for (const delta of [
      { context_sha256: 'b'.repeat(64) }, { context_after_sha256: 'b'.repeat(64) },
      { fixture_sha256: 'b'.repeat(64) }, { schema_sha256: 'b'.repeat(64) },
      { release_manifest_sha256: 'b'.repeat(64) }, { scoring_sha256: 'b'.repeat(64) },
      { harness: 'claude' }, { memory_root: '/other-root' }, { error: 'timeout' },
      { raw_stdout: row.raw_stdout.replace('turn.completed', 'turn.failed') },
      { check: { ...row.check, context_stable: false } },
    ]) assert.throws(() => validateRescoreSource({ ...row, ...delta }, oldManifest, sha256(oldManifestBytes), ctx, 'F1'), /rescore/);
    const source = join(replayDir, 'source.ndjson'), prior = join(replayDir, 'prior.json');
    const next = join(replayDir, 'next.json'), resultPath = join(replayDir, 'result.ndjson');
    const sourceBytes = `${JSON.stringify(row)}\n`;
    writeFileSync(source, sourceBytes); writeFileSync(prior, oldManifestBytes); writeFileSync(next, JSON.stringify(nextManifest));
    const replayArgs = [RUNNER, '--root', root, '--arm', arm, '--harness', 'codex', '--fixture', 'F1',
      '--rescore', source, '--source-sha256', sha256(sourceBytes), '--source-release-manifest', prior,
      '--release-manifest', next, '--output', resultPath];
    // PATH has no Codex/Claude: accidental live dispatch cannot spend a model call.
    const replayRun = await run(process.execPath, replayArgs, { env: { PATH: replayDir } });
    assert.match(replayRun.stdout, /new_model_calls=0/);
    const replayed = JSON.parse(readFileSync(resultPath, 'utf8'));
    assert.equal(replayed.passed, 1); assert.equal(replayed.new_model_calls, 0);
    assert.equal(replayed.answer.claims.result, '4', 'rescore trusted old derived answer');
    assert.equal(replayed.original_passed, 0); assert.equal(replayed.evidence_kind, 'rescored-existing-live');
    assert.equal(readFileSync(source, 'utf8'), sourceBytes);
    await assert.rejects(run(process.execPath, replayArgs, { env: { PATH: replayDir } }), /output already exists/);
    const wrongHashArgs = [...replayArgs]; wrongHashArgs[wrongHashArgs.indexOf('--source-sha256') + 1] = 'f'.repeat(64);
    wrongHashArgs[wrongHashArgs.indexOf('--output') + 1] = join(replayDir, 'rejected.ndjson');
    await assert.rejects(run(process.execPath, wrongHashArgs, { env: { PATH: replayDir } }), /source SHA-256 mismatch/);
    assert.equal(existsSync(join(replayDir, 'rejected.ndjson')), false);
    const incomplete = [RUNNER, '--root', root, '--arm', arm, '--harness', 'codex', '--fixture', 'F1',
      '--output', join(replayDir, 'must-not-run.ndjson'), '--rescore'];
    await assert.rejects(run(process.execPath, incomplete, { env: { PATH: replayDir } }), /--rescore requires a value/);
    assert.equal(existsSync(join(replayDir, 'must-not-run.ndjson')), false);
    await assert.rejects(run(process.execPath, [...incomplete.slice(0, -1), `--rescore=${source}`],
      { env: { PATH: replayDir } }), /separate flag and value/);
    await assert.rejects(run(process.execPath, [...replayArgs, '--rescore', source], { env: { PATH: replayDir } }), /may appear only once/);
  } finally { rmSync(replayDir, { recursive: true, force: true }); }
  assert.deepEqual(noticeTrace, [{ type: 'runtime_notice', event: skillBudgetNotice }]);
  assert.equal(sharedScopeAudit(noticeTrace).status, 'PASS');
  for (const selectedArm of ['baseline', 'candidate']) {
    assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, noticeTrace, {}, selectedArm).pass, true,
      'known non-I/O notice blocked root-free arithmetic');
  }
  for (const altered of [
    { ...skillBudgetNotice, type: 'item.started' },
    { ...skillBudgetNotice, extra: true },
    { ...skillBudgetNotice, item: { ...skillBudgetNotice.item, extra: true } },
    ...[{ message: `${CODEX_SKILL_BUDGET_NOTICE} ` }, { message: 'unknown error' },
      { id: '' }, { id: 0 }, { type: 'file_change' }].map((delta) => ({
      ...skillBudgetNotice, item: { ...skillBudgetNotice.item, ...delta },
    })),
  ]) {
    const projected = codexProjection([altered]).trace;
    assert.equal(projected[0].type, 'unclassified_activity');
    assert.equal(sharedScopeAudit(projected).status, 'UNKNOWN');
  }
  for (const [command, expected] of [['unknown-reader', 'UNKNOWN'], ['cat /not-supplied-checkout/forbidden.txt', 'FAIL']]) {
    const combined = codexProjection([skillBudgetNotice, { type: 'item.completed', item: {
      type: 'command_execution', command, exit_code: 0,
    } }]).trace;
    assert.equal(sharedScopeAudit(combined).status, expected, 'notice hid separate I/O');
  }
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
  for (const events of [
    [{ type: 'assistant', message: { content: [{ type: 'server_tool_use', id: 'unknown', name: 'remote' }] } }],
    [{ type: 'future_runtime_event', payload: { action: 'unclassified' } }],
  ]) {
    const trace = [...claudeProjection(events).trace, ...responseOnly];
    assert.equal(evaluate(fixtures.F1, { claims: { result: '4' }, source: [] }, trace,
      { inventory: null }).pass, false, 'unknown Claude activity disappeared from native trace');
  }
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
  for (const id of ['F3', 'F7', 'F10']) {
    const admitted = reachableContextTargets(fixtures[id]);
    for (const target of fixtures[id].targets) {
      assert.ok(admitted.includes(target), `${id}: P3 owner is unreachable: ${target}`);
    }
    const removed = reachableContextTargets({ ...fixtures[id], contractEdges: [] });
    for (const [, target] of fixtures[id].contractEdges) {
      assert.ok(!removed.includes(target), `${id}: missing edge still admits P3 owner: ${target}`);
    }
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
  const inputModeRoot = mkdtempSync(join(tmpdir(), 'agent-context-input-mode-'));
  try {
    for (const path of [WORKFLOW_MODE, INPUT_MODE_SOURCE, HTML_PROTOTYPE_INPUT_MODE]) {
      mkdirSync(dirname(join(inputModeRoot, path)), { recursive: true });
      cpSync(join(root, path), join(inputModeRoot, path));
    }
    const boundFixture = {
      selectedInputModeKey: 'html-prototype',
      targets: [HTML_PROTOTYPE_INPUT_MODE],
      contractEdges: [[WORKFLOW_MODE, HTML_PROTOTYPE_INPUT_MODE]],
    };
    const admitInput = (fixture) => {
      const targets = new Set([WORKFLOW_MODE]);
      admitContractEdges(targets, fixture, inputModeRoot);
      return [...targets].sort();
    };
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'HEALTHY');
    assert.deepEqual(admitInput(boundFixture), [HTML_PROTOTYPE_INPUT_MODE, WORKFLOW_MODE].sort());
    for (const fixture of [
      { ...boundFixture, selectedInputModeKey: undefined },
      { ...boundFixture, selectedInputModeKey: 'ux-writing' },
      { ...boundFixture, selectedInputModeKey: '../html-prototype' },
      { ...boundFixture, targets: ['.claude/skill-os/generated/input-modes/ux-writing.json'] },
      { ...boundFixture, contractEdges: [[OFFICE_SKILL, HTML_PROTOTYPE_INPUT_MODE]] },
    ]) {
      assert.deepEqual(admitInput(fixture), [WORKFLOW_MODE], 'unsafe or mismatched selected-view binding was admitted');
    }
    const viewPath = join(inputModeRoot, HTML_PROTOTYPE_INPUT_MODE);
    const healthyView = readFileSync(viewPath, 'utf8');
    for (const [name, mutated] of [
      ['duplicate JSON key', healthyView.replace('"schema_version": 1,', '"schema_version": 1,\n  "schema_version": 1,')],
      ['boolean schema version', healthyView.replace('"schema_version": 1,', '"schema_version": true,')],
      ['floating schema version', healthyView.replace('"schema_version": 1,', '"schema_version": 1.0,')],
      ['boolean nested version', healthyView.replace('"version": 1,', '"version": true,')],
    ]) {
      writeFileSync(viewPath, mutated);
      assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'STALE',
        `${name} escaped type-sensitive selected-view validation`);
    }
    writeFileSync(viewPath, healthyView);
    const staleView = JSON.parse(healthyView);
    staleView.skill = 'ux-writing';
    writeFileSync(viewPath, `${JSON.stringify(staleView)}\n`);
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'STALE');
    assert.deepEqual(admitInput(boundFixture), [WORKFLOW_MODE], 'stale selected view was admitted');

    const sourceText = readFileSync(join(inputModeRoot, INPUT_MODE_SOURCE), 'utf8');
    const staleTrace = [
      { type: 'item.completed', command: `cat ${HTML_PROTOTYPE_INPUT_MODE}`, exit_code: 0,
        output: readFileSync(viewPath, 'utf8') },
      { type: 'item.completed', command: `cat ${INPUT_MODE_SOURCE}`, exit_code: 0, output: sourceText },
    ];
    const staleRecovery = inputModeFallbackDecision(staleTrace, boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot);
    assert.equal(staleRecovery.status, 'RECOVERED', 'trusted stale view did not recover through full source');
    assert.equal(inputModeFallbackDecision(staleTrace.slice().reverse(), boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot).status, 'FAIL',
    'source read before stale-view evidence counted as recovery');
    assert.equal(inputModeFallbackDecision([staleTrace[1], staleTrace[0], staleTrace[1]], boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot).status, 'FAIL',
    'an early source read was laundered by a second post-proof source read');

    writeFileSync(viewPath, healthyView);
    const arbitraryFailureThenSource = [
      { type: 'item.completed', command: `cat ${HTML_PROTOTYPE_INPUT_MODE}`, exit_code: 1,
        output: 'invalid offset' },
      { type: 'item.completed', command: `cat ${INPUT_MODE_SOURCE}`, exit_code: 0, output: sourceText },
    ];
    assert.equal(inputModeFallbackDecision(arbitraryFailureThenSource, boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot).status, 'FAIL',
    'arbitrary selected-view failure unlocked full-source fallback');
    rmSync(viewPath);
    const missingState = selectedInputModeState(boundFixture, inputModeRoot);
    assert.equal(missingState.status, 'MISSING');
    const missingThenSource = [
      { type: 'item.completed', command: `cat ${HTML_PROTOTYPE_INPUT_MODE}`, exit_code: 1,
        output: `cat: ${HTML_PROTOTYPE_INPUT_MODE}: No such file or directory` },
      { type: 'item.completed', command: `cat ${INPUT_MODE_SOURCE}`, exit_code: 0, output: sourceText },
    ];
    const missingRecovery = inputModeFallbackDecision(missingThenSource, boundFixture, missingState, inputModeRoot);
    assert.equal(missingRecovery.status, 'RECOVERED', 'missing selected view with an ENOENT read did not recover');
    assert.equal(candidateTracePolicy(missingThenSource, 'OTHER.md', [INPUT_MODE_SOURCE], null,
      inputModeRoot, [missingRecovery]).pass, true, 'recovered missing-view failure violated trace policy');
    assert.equal(inputModeFallbackDecision([missingThenSource[1], ...missingThenSource], boundFixture,
      missingState, inputModeRoot).status, 'FAIL', 'early source read was laundered by missing-view recovery');
    assert.equal(inputModeFallbackDecision(arbitraryFailureThenSource, boundFixture,
      missingState, inputModeRoot).status, 'FAIL', 'non-ENOENT failure unlocked missing-view fallback');
    const sourcePath = join(inputModeRoot, INPUT_MODE_SOURCE);
    writeFileSync(sourcePath, sourceText.replace('governance_tools:\n',
      'governance_tools:\n  html-prototype:\n    modes: {}\n'));
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'INVALID',
      'missing view bypassed invalid source semantics');
    writeFileSync(sourcePath, sourceText);
    writeFileSync(viewPath, healthyView);
    const verbalStale = [{ type: 'item.completed', command: `cat ${INPUT_MODE_SOURCE}`, exit_code: 0, output: sourceText }];
    assert.equal(inputModeFallbackDecision(verbalStale, boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot).status, 'FAIL',
    'unproven stale claim unlocked source fallback');
    const partialViewThenSource = [
      { type: 'item.completed', command: `head -n 1 ${HTML_PROTOTYPE_INPUT_MODE}`, exit_code: 0,
        output: healthyView.split('\n')[0] },
      ...verbalStale,
    ];
    assert.equal(inputModeFallbackDecision(partialViewThenSource, boundFixture,
      selectedInputModeState(boundFixture, inputModeRoot), inputModeRoot).status, 'FAIL',
    'truncated healthy view unlocked source fallback');
    writeFileSync(sourcePath, sourceText.replace('governance_tools:\n',
      'governance_tools:\n  html-prototype:\n    modes: {}\n'));
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'INVALID',
      'cross-group duplicate source key remained scoreable');
    writeFileSync(sourcePath, `${sourceText}\nunapproved_global: true\n`);
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'INVALID',
      'unapproved source global remained scoreable');
    writeFileSync(sourcePath, sourceText.replace('version: 1', 'version: true'));
    assert.equal(selectedInputModeState(boundFixture, inputModeRoot).status, 'INVALID',
      'boolean YAML version escaped strict source validation');
    writeFileSync(sourcePath, sourceText);
  } finally { rmSync(inputModeRoot, { recursive: true, force: true }); }
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
    ['CONTEXT.md', '.claude/skill-os/generated/context-index.md',
      '.claude/skill-os/generated/skill-catalog.md']);
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
  const f3Claims = {
    files_at_least_3_is_trigger: true, independent_subagents_at_least_2_is_trigger: true,
    explicit_phase_dependency_is_trigger: true, irreversible_operation_is_trigger: true,
    explicit_user_plan_request_is_trigger: true,
    supervisor_requires_approval: true, hierarchical_requires_approval: true,
    failed_critical_gate_stops_next_phase: true,
    design_output_required_before_implementation: true,
    may_skip_design_output: false,
    may_merge_design_output_with_implementation: false,
  };
  assert.equal(claimsMatch(fixtures.F3, { ...f3Claims, supervisor_requires_approval: false }), false,
    'F3 approval bypass passed');
  assert.equal(claimsMatch(fixtures.F3, { ...f3Claims, may_skip_design_output: true }), false,
    'F3 design-output skip passed');
  assert.equal(claimsMatch(fixtures.F3, { ...f3Claims, may_merge_design_output_with_implementation: true }), false,
    'F3 design-output merge passed');
  assert.equal(claimsMatch(fixtures.F3, f3Claims), true, 'valid plural Plan-trigger claims failed');
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
  const answerPayload = '{"claims":{"result":"4"},"source":[]}';
  assert.equal(containsSchemaAnswer(`progress\n${answerPayload}\n{"note":"done"}`), true,
    'embedded schema answer was hidden by adjacent JSON');
  assert.equal(containsSchemaAnswer(`{"note":"progress"}\n${answerPayload}`), true,
    'schema answer after an earlier JSON object was hidden');
  assert.equal(containsSchemaAnswer(`{"note":"unterminated\n${answerPayload}`), true,
    'schema answer after malformed prefix text was hidden');
  assert.equal(containsSchemaAnswer(`{"event":"progress","example":${answerPayload}}`), true,
    'a progress label hid a nested schema answer');
  assert.equal(containsSchemaAnswer(`{"answer":${answerPayload}}`), true,
    'schema answer nested in a non-progress wrapper was hidden');
  assert.equal(containsSchemaAnswer(`{"event":"progress","example":${answerPayload},"extra":true}`), true,
    'an expanded wrapper was mistaken for the exact progress envelope');
  assert.equal(containsSchemaAnswer(`{"event":"answer","event":"progress","example":${answerPayload}}`), true,
    'duplicate event keys forged a progress envelope');
  assert.equal(containsSchemaAnswer(`{"event":"progress","example":${answerPayload},"example":null}`), true,
    'duplicate example keys forged a progress envelope');
  assert.equal(isExplicitProgressText('Progress update only: reading the owner before the decision.'), true,
    'labelled non-decision progress was not recognized');
  assert.equal(isExplicitProgressText('I will read the owner before answering.'), true,
    'future owner-read progress was not recognized');
  assert.equal(isExplicitProgressText('I’ll first inspect the required owner, then answer.'), true,
    'bounded curly-apostrophe progress was not recognized');
  assert.equal(isExplicitProgressText(HISTORICAL_PROJECT_PROGRESS), true,
    'the exact historical non-decision progress message moved the project boundary earlier');
  for (const mutation of [
    `${HISTORICAL_PROJECT_PROGRESS} Project Gate applies.`,
    HISTORICAL_PROJECT_PROGRESS.replace(' I will read', ' Project Alpha is active. I will read'),
    HISTORICAL_PROJECT_PROGRESS.replace('have not decided', 'have decided'),
    HISTORICAL_PROJECT_PROGRESS.replace('that decision.', 'that decision: Alpha.'),
    `${HISTORICAL_PROJECT_PROGRESS}\nStill checking.`,
    `${HISTORICAL_PROJECT_PROGRESS} {"claims":{"project":"Alpha"},"source":[]}`,
  ]) assert.equal(isExplicitProgressText(mutation), false,
    'a mutated historical progress sentence bypassed the exact allowlist');
  assert.equal(isExplicitProgressText('Project Gate applies and confirmation is required.'), false,
    'plain-text decision was mistaken for progress');
  for (const decidedText of [
    'I will answer Alpha, then read the owner before answering again.',
    'Progress update only: reading the owner before answering. Decision: use Alpha.',
    'I will read the owner before answering; the project is Alpha.',
    'Progress update only: Project Gate applies and confirmation is required; reading the owner before answering.',
    'I will read the owner before answering. Project Gate applies.',
    'I will read the owner before answer_is_Alpha.',
    'I will read the owner then result_is_Alpha.',
    'Progress update only: checking the manifest before decision_USE_PROJECT_X.',
  ]) assert.equal(isExplicitProgressText(decidedText), false,
    'decision-bearing text forged an explicit progress update');
  const deepProgress = `{"event":"progress","example":${'['.repeat(10_000)}0${']'.repeat(10_000)}}`;
  assert.equal(containsSchemaAnswer(deepProgress), false,
    'deep non-answer envelope became a schema answer');
  assert.equal(containsSchemaAnswer('Progress update only: reading the owner before answering.'), false,
    'plain progress text became a schema answer');
  assert.equal(containsSchemaAnswer('{"note":"brace in string: } and escaped quote: \\\""}'), false,
    'non-answer JSON with braces in a string became a schema answer');
  const f7Claims = {
    extraction_bar_required: true, correction_attribution_required: true,
    learning_actions_required: true, direct_promotion_allowed: false,
    may_record_before_owner_read: false, write_now: false,
  };
  assert.equal(claimsMatch(fixtures.F7, { ...f7Claims, extraction_bar_required: false }), false,
    'F7 no-gate claims passed');
  assert.equal(claimsMatch(fixtures.F7, { ...f7Claims, learning_actions_required: false }), false,
    'F7 skipped the learning action owner');
  assert.equal(claimsMatch(fixtures.F7, { ...f7Claims, direct_promotion_allowed: true }), false,
    'F7 allowed direct promotion');
  const f10Claims = Object.fromEntries(Object.entries(fixtures.F10.claims).map(([key, spec]) => [key, spec.equals]));
  assert.equal(claimsMatch(fixtures.F10, f10Claims), true, 'F10 selected input-mode claims failed');
  assert.equal(claimsMatch(fixtures.F10, { ...f10Claims, framework_template_required: true }), false,
    'F10 restored the obsolete mandatory framework-template claim');
  assert.equal(claimsMatch(fixtures.F10, { ...f10Claims, standalone_requires_prototype_brief: false }), false,
    'F10 lost the standalone required input');
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
  const longTarget = '.claude/hooks/route-guard.mjs';
  const longLines = readFileSync(join(root, longTarget), 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (longLines.at(-1) === '') longLines.pop();
  const splitAt = Math.min(1009, longLines.length - 1);
  assert.ok(splitAt > 1, 'numbered chunk regression requires a multi-page source');
  const numberedChunk = (id, start, end, extra = {}) => {
    const input = { file_path: join(root, extra.path || longTarget) };
    if (start !== 1) input.offset = start;
    if (extra.limit !== undefined) input.limit = extra.limit;
    const output = longLines.slice(start - 1, end).map((line, index) => `${start + index}\t${line}`).join('\n');
    return [
      { type: 'tool_use', id, name: 'Read', input },
      { type: 'tool_result', tool_use_id: id, is_error: Boolean(extra.is_error),
        output: extra.output ?? output, truncated: Boolean(extra.truncated) },
    ];
  };
  const firstLongChunk = numberedChunk('long-1', 1, splitAt);
  const secondLongChunk = numberedChunk('long-2', splitAt + 1, longLines.length);
  const secondLongChunkWithTerminalNewline = structuredClone(secondLongChunk);
  secondLongChunkWithTerminalNewline[1].output += `\n${longLines.length + 1}\t`;
  const fullLongRead = [...firstLongChunk, ...secondLongChunkWithTerminalNewline];
  const fullLongEvidence = targetReadEvidence(fullLongRead, longTarget);
  assert.equal(fullLongEvidence.complete, true, 'complete actual numbered Read chunks were discarded');
  assert.deepEqual(fullLongEvidence.evidence.map((item) => item.delivered_range),
    [[1, splitAt], [splitAt + 1, longLines.length]], 'actual delivered intervals were not recorded');
  assert.equal(targetReadEvidence(firstLongChunk, longTarget).complete, false, 'unprovided numbered tail counted as EOF');
  assert.equal(targetReadEvidence(secondLongChunk, longTarget).complete, false, 'numbered tail alone counted as EOF');
  for (const output of [
    `${secondLongChunk[1].output}\n${longLines.length + 1}\tnot-empty`,
    `${secondLongChunk[1].output}\n${longLines.length + 1}\t\n${longLines.length + 2}\t`,
  ]) {
    assert.equal(targetReadEvidence([...firstLongChunk, ...numberedChunk('long-bad-terminal', splitAt + 1,
      longLines.length, { output })], longTarget).complete, false,
    'invalid numbered terminal row counted as EOF');
  }
  const firstOutput = firstLongChunk[1].output.split('\n');
  for (const [name, mutateOutput] of [
    ['missing-middle', (rows) => rows.toSpliced(Math.floor(rows.length / 2), 1).join('\n')],
    ['changed-content', (rows) => rows.with(1, rows[1] + '-changed').join('\n')],
    ['spoofed-number', (rows) => rows.with(0, rows[0].replace(/^1\t/, '2\t')).join('\n')],
    ['reordered', (rows) => rows.with(0, rows[1]).with(1, rows[0]).join('\n')],
  ]) {
    const badFirst = numberedChunk(`long-${name}`, 1, splitAt, { output: mutateOutput(firstOutput) });
    assert.equal(targetReadEvidence([...badFirst, ...secondLongChunk], longTarget).complete, false,
      `${name} numbered Read counted as EOF`);
  }
  assert.equal(targetReadEvidence([
    ...numberedChunk('long-truncated', 1, splitAt, { truncated: true }), ...secondLongChunk,
  ], longTarget).complete, false, 'truncated numbered Read counted as EOF');
  assert.equal(targetReadEvidence([
    ...numberedChunk('long-error', 1, splitAt, { is_error: true }), ...secondLongChunk,
  ], longTarget).complete, false, 'failed numbered Read counted as EOF');
  assert.equal(targetReadEvidence([
    ...numberedChunk('long-wrong-root', 1, splitAt, { path: `/private/tmp/fake/${longTarget}` }), ...secondLongChunk,
  ], longTarget).complete, false, 'same-suffix numbered Read counted as the real target');
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
  const healthyRoot = mkdtempSync(join(tmpdir(), 'agent-context-healthy-index-'));
  try {
    for (const path of ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', catalogSource, CONTEXT_MANIFEST, target]) {
      const destination = join(healthyRoot, path);
      mkdirSync(join(healthyRoot, path.split('/').slice(0, -1).join('/')), { recursive: true });
      cpSync(join(root, path), destination);
    }
    const healthyIndexPath = join(healthyRoot, CONTEXT_INDEX);
    writeFileSync(healthyIndexPath, indexText(projected), { flag: 'wx' });
    assert.equal(frozenIndexState(healthyRoot).status, 'HEALTHY', 'real on-disk index did not match all operational fields');
    const deniedIndex = (path) => {
      if (path === healthyIndexPath) throw Object.assign(new Error('injected EACCES'), { code: 'EACCES' });
      return readFileSync(path, 'utf8');
    };
    assert.equal(frozenIndexState(healthyRoot, deniedIndex).status, 'UNREADABLE',
      'a proven index read error was treated as invalid source or healthy index');
    for (const invalidSource of ['{}', '{"version":1,"entries":[]}']) {
      const invalidSourceWithDeniedIndex = (path) => path === join(healthyRoot, CONTEXT_MANIFEST)
        ? invalidSource : deniedIndex(path);
      assert.equal(frozenIndexState(healthyRoot, invalidSourceWithDeniedIndex).status, 'INVALID',
        'unreadable index hid an invalid manifest source');
    }
    assert.equal(targetReadEvidence([], CONTEXT_INDEX, healthyRoot, deniedIndex).complete, false,
      'index read error escaped evidence collection');
    assert.equal(indexFallbackDecision([], { status: 'UNREADABLE' },
      { index: { complete: false }, manifest: { complete: true } }, healthyRoot).status, 'RECOVERED',
    'a proven unreadable index could not recover from the full manifest');
    const fixture = fixtures.F2;
    const answer = { claims: Object.fromEntries(Object.entries(fixture.claims)
      .map(([key, spec]) => [key, spec.equals])),
      source: [ownSource, 'CONTEXT.md', CONTEXT_INDEX, target] };
    for (const traceKind of ['codex', 'claude']) {
      const fileRead = (path, partial = false) => {
        const body = readFileSync(join(healthyRoot, path), 'utf8');
        if (traceKind === 'codex') return codexProjection([{ type: 'item.completed', item: {
          type: 'command_execution', command: partial ? `head -n 1 ${path}` : `cat ${path}`,
          exit_code: 0, aggregated_output: partial ? body.split('\n')[0] : body,
        } }]).trace;
        return claudeProjection([
          { type: 'assistant', message: { content: [{ type: 'tool_use', id: `healthy-${path}`,
            name: 'Read', input: { file_path: join(healthyRoot, path), ...(partial ? { limit: 1 } : {}) } }] } },
          { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `healthy-${path}`,
            content: partial ? body.split('\n')[0] : body }] } },
        ]).trace;
      };
      const healthyTrace = [
        { type: 'item.completed', exit_code: 0, command: 'python3 memory/scripts/get_memory.py --summary' },
        ...['CONTEXT.md', CONTEXT_INDEX, target].flatMap((path) => fileRead(path)),
      ];
      const healthy = evaluate(fixture, answer, healthyTrace, {}, 'candidate', healthyRoot);
      assert.equal(healthy.pass, true, `${traceKind}: real healthy index EOF chain failed`);
      assert.equal(healthy.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
        'INDEX', `${traceKind}: healthy index was mislabelled as recovery`);
      const partial = evaluate(fixture, answer, [
        { type: 'item.completed', exit_code: 0, command: 'python3 memory/scripts/get_memory.py --summary' },
        ...fileRead('CONTEXT.md'),
        ...fileRead(CONTEXT_INDEX, true), ...fileRead(target),
      ], {}, 'candidate', healthyRoot);
      assert.equal(partial.pass, false, `${traceKind}: partial healthy index passed`);
      assert.equal(partial.target_checks.find((entry) => entry.context_index_recovery)?.context_index_recovery.status,
        'FAIL', `${traceKind}: partial healthy index was treated as unreadable fallback`);
      const recoveryAnswer = { ...answer,
        source: [ownSource, 'CONTEXT.md', CONTEXT_MANIFEST, target] };
      const indexAttempt = traceKind === 'codex'
        ? codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
          command: `cat ${CONTEXT_INDEX}`, aggregated_output: 'permission denied' } }]).trace
        : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'tool_use',
          id: 'unconfirmed-index', name: 'Bash', input: { command: `cat ${CONTEXT_INDEX}` } }] } }]).trace;
      const recoveryReads = ['CONTEXT.md', CONTEXT_MANIFEST, target].flatMap((path) => fileRead(path));
      const unconfirmed = evaluate(fixture, recoveryAnswer,
        [healthyTrace[0], ...indexAttempt, ...recoveryReads], {}, 'candidate', healthyRoot);
      assert.equal(unconfirmed.pass, false, `${traceKind}: missing index result was treated as a failed read`);
      assert.equal(unconfirmed.target_checks.find((entry) => entry.context_index_recovery)
        ?.context_index_recovery.failed_index_read, false, `${traceKind}: missing result proved failure`);
      if (traceKind === 'codex') {
        for (const exit_code of [null, -1, '1']) {
          const ambiguous = codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
            command: `cat ${CONTEXT_INDEX}`, exit_code, aggregated_output: 'permission denied' } }]).trace;
          const check = evaluate(fixture, recoveryAnswer,
            [healthyTrace[0], ...ambiguous, ...recoveryReads], {}, 'candidate', healthyRoot);
          assert.equal(check.pass, false, `codex: ambiguous exit_code ${JSON.stringify(exit_code)} recovered`);
        }
        for (const [name, events] of [
          ['contradictory-status', [{ type: 'item.completed', item: { type: 'command_execution',
            id: 'conflict', status: 'failed', command: `cat ${CONTEXT_INDEX}`, exit_code: 0,
            aggregated_output: readFileSync(healthyIndexPath, 'utf8') } }]],
          ['mismatched-id', [
            { type: 'item.started', item: { type: 'command_execution', id: 'started', command: `cat ${CONTEXT_INDEX}` } },
            { type: 'item.completed', item: { type: 'command_execution', id: 'different',
              command: `cat ${CONTEXT_INDEX}`, exit_code: 0,
              aggregated_output: readFileSync(healthyIndexPath, 'utf8') } },
          ]],
        ]) {
          const check = evaluate(fixture, answer, [healthyTrace[0],
            ...['CONTEXT.md', target].flatMap((path) => fileRead(path)),
            ...codexProjection(events).trace], {}, 'candidate', healthyRoot);
          assert.equal(check.pass, false, `codex: ${name} accepted as a healthy index read`);
        }
        for (const [name, events] of [
          ['completion-before-start', [
            { type: 'item.completed', item: { type: 'command_execution', id: 'reused',
              command: `cat ${CONTEXT_INDEX}`, exit_code: 1, aggregated_output: 'permission denied' } },
            { type: 'item.started', item: { type: 'command_execution', id: 'reused',
              command: `cat ${CONTEXT_INDEX}` } },
          ]],
          ['missing-start-id', [
            { type: 'item.started', item: { type: 'command_execution', command: `cat ${CONTEXT_INDEX}` } },
            { type: 'item.completed', item: { type: 'command_execution', id: 'orphan',
              command: `cat ${CONTEXT_INDEX}`, exit_code: 1, aggregated_output: 'permission denied' } },
          ]],
        ]) {
          const check = evaluate(fixture, recoveryAnswer, [healthyTrace[0],
            ...codexProjection(events).trace, ...recoveryReads], {}, 'candidate', healthyRoot);
          assert.equal(check.pass, false, `codex: ${name} fabricated failed-index recovery`);
        }
      }
      const explicitFailure = traceKind === 'codex'
        ? codexProjection([{ type: 'item.completed', item: { type: 'command_execution',
          command: `cat ${CONTEXT_INDEX}`, exit_code: 1, aggregated_output: 'permission denied' } }]).trace
        : claudeProjection([
          { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'failed-index',
            name: 'Bash', input: { command: `cat ${CONTEXT_INDEX}` } }] } },
          { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'failed-index',
            is_error: true, content: 'permission denied' }] } },
        ]).trace;
      const recovered = evaluate(fixture, recoveryAnswer,
        [healthyTrace[0], ...explicitFailure, ...recoveryReads], {}, 'candidate', healthyRoot);
      assert.equal(recovered.pass, true, `${traceKind}: explicit index failure did not recover`);
      assert.equal(recovered.target_checks.find((entry) => entry.context_index_recovery)
        ?.context_index_recovery.status, 'RECOVERED', `${traceKind}: explicit failure lost recovery status`);
      const reread = evaluate(fixture, recoveryAnswer,
        [healthyTrace[0], ...explicitFailure, ...recoveryReads, ...fileRead(CONTEXT_INDEX)],
        {}, 'candidate', healthyRoot);
      assert.equal(reread.pass, true, `${traceKind}: later successful index reread erased a valid recovery`);
      assert.equal(reread.target_checks.find((entry) => entry.context_index_recovery)
        ?.context_index_recovery.status, 'RECOVERED', `${traceKind}: failed-read history was relabelled INDEX`);
      if (traceKind === 'codex') {
        const pending = { type: 'item.started', item: { type: 'command_execution',
          id: 'pending-late', command: `cat ${CONTEXT_INDEX}`, status: 'in_progress' } };
        const malformed = { type: 'item.started', item: { type: 'command_execution',
          id: 'invisible', command: null, status: 'in_progress' } };
        for (const [name, event] of [['unclosed new id', pending], ['null command start', malformed]]) {
          const check = evaluate(fixture, recoveryAnswer,
            [healthyTrace[0], ...explicitFailure, ...codexProjection([event]).trace, ...recoveryReads],
            {}, 'candidate', healthyRoot);
          assert.equal(check.pass, false, `codex: ${name} passed despite unknown command activity`);
          assert.equal(check.target_checks.find((entry) => entry.trace_policy)?.trace_policy.pass,
            false, `codex: ${name} escaped native trace policy`);
        }
        const second = [
          { type: 'item.started', item: { type: 'command_execution', id: 'paired-late',
            command: `cat ${CONTEXT_INDEX}`, status: 'in_progress' } },
          { type: 'item.completed', item: { type: 'command_execution', id: 'paired-late',
            command: `cat ${CONTEXT_INDEX}`, status: 'completed', exit_code: 1,
            aggregated_output: 'permission denied' } },
        ];
        const paired = evaluate(fixture, recoveryAnswer,
          [healthyTrace[0], ...explicitFailure, ...codexProjection(second).trace, ...recoveryReads],
          {}, 'candidate', healthyRoot);
        assert.equal(paired.pass, true, 'codex: a new ID with its own completion lost valid recovery');
      }
      const scratchManifest = join(healthyRoot, CONTEXT_MANIFEST);
      for (const [name, source] of invalidSources.filter(([label]) =>
        ['unknown top-level field', 'null condition', 'null runtime', 'traversal target'].includes(label))) {
        writeFileSync(scratchManifest, JSON.stringify(source));
        const invalid = evaluate(fixture, recoveryAnswer,
          [healthyTrace[0], ...explicitFailure,
            ...['CONTEXT.md', CONTEXT_MANIFEST, target].flatMap((path) => fileRead(path))],
          {}, 'candidate', healthyRoot);
        assert.equal(invalid.pass, false, `${traceKind}: ${name} recovered through a native trace`);
        assert.equal(invalid.target_checks.find((entry) => entry.context_index_recovery)
          ?.context_index_recovery.state.status, 'INVALID', `${traceKind}: ${name} hid invalid source`);
      }
      writeFileSync(scratchManifest, JSON.stringify(indexManifest));
      const boundaryRecoveryReads = ['CONTEXT.md', CONTEXT_MANIFEST, target]
        .flatMap((path) => fileRead(path));
      const earlyText = (text) => traceKind === 'codex'
        ? codexProjection([{ type: 'item.completed', item: { type: 'agent_message', text } }]).trace
        : claudeProjection([{ type: 'assistant', message: { content: [{ type: 'text', text }] } }]).trace;
      const finalResponse = traceKind === 'codex'
        ? earlyText(JSON.stringify(recoveryAnswer))
        : claudeProjection([
          { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'recovery-answer',
            name: 'StructuredOutput', input: recoveryAnswer }] } },
          { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'recovery-answer',
            content: 'Structured output provided successfully' }] } },
        ]).trace;
      const premature = evaluate(fixture, recoveryAnswer,
        [healthyTrace[0], ...explicitFailure, ...earlyText(JSON.stringify(recoveryAnswer)),
          ...boundaryRecoveryReads, ...finalResponse], {}, 'candidate', healthyRoot);
      assert.equal(premature.pass, false,
        `${traceKind}: schema-bound answer passed after a late fallback`);
      for (const text of [
        `${JSON.stringify(recoveryAnswer)}\nAdditional detail: {"note":"done"}`,
        `{"note":"progress"}\n${JSON.stringify(recoveryAnswer)}`,
        `Progress: "unterminated ${JSON.stringify(recoveryAnswer)}`,
        `{"answer":${JSON.stringify(recoveryAnswer)}}`,
        `{"event":"answer","event":"progress","example":${JSON.stringify(recoveryAnswer)}}`,
        'I will answer Alpha, then read the owner before answering again.',
        'Progress update only: reading the owner before answering. Decision: use Alpha.',
        'I will read the owner before answering; the project is Alpha.',
        'Progress update only: Project Gate applies and confirmation is required; reading the owner before answering.',
        'I will read the owner before answering. Project Gate applies.',
        'I will read the owner before answer_is_Alpha.',
        'I will read the owner then result_is_Alpha.',
        'Progress update only: checking the manifest before decision_USE_PROJECT_X.',
      ]) {
        const mixedAnswer = evaluate(fixture, recoveryAnswer,
          [healthyTrace[0], ...explicitFailure, ...earlyText(text),
            ...boundaryRecoveryReads, ...finalResponse], {}, 'candidate', healthyRoot);
        assert.equal(mixedAnswer.pass, false,
          `${traceKind}: embedded schema answer passed after a late fallback`);
      }
      const serializedRecoveryAnswer = JSON.stringify(recoveryAnswer);
      const splitAt = serializedRecoveryAnswer.indexOf(',"source"');
      const splitResponse = traceKind === 'codex'
        ? codexProjection([
          { type: 'item.completed', item: { type: 'agent_message',
            text: serializedRecoveryAnswer.slice(0, splitAt) } },
          { type: 'item.completed', item: { type: 'agent_message',
            text: serializedRecoveryAnswer.slice(splitAt) } },
        ]).trace
        : claudeProjection([
          { type: 'assistant', message: { content: [{ type: 'text',
            text: serializedRecoveryAnswer.slice(0, splitAt) }] } },
          { type: 'assistant', message: { content: [{ type: 'text',
            text: serializedRecoveryAnswer.slice(splitAt) }] } },
        ]).trace;
      assert.equal(evaluate(fixture, recoveryAnswer,
        [healthyTrace[0], ...explicitFailure, ...splitResponse,
          ...boundaryRecoveryReads, ...finalResponse], {}, 'candidate', healthyRoot).pass, false,
      `${traceKind}: split schema answer passed after a late fallback`);
      for (const text of [
        'Progress update only: validating the manifest before the schema-bound answer.',
        'I’ll first inspect the required owner, then answer.',
      ]) {
        const progressed = evaluate(fixture, recoveryAnswer,
          [healthyTrace[0], ...explicitFailure, ...earlyText(text), ...boundaryRecoveryReads, ...finalResponse],
          {}, 'candidate', healthyRoot);
        assert.equal(progressed.pass, true,
          `${traceKind}: non-schema progress text moved the fallback boundary earlier`);
      }
      if (traceKind === 'claude') {
        const call = (id) => ({ type: 'assistant', message: { content: [{ type: 'tool_use',
          ...(id === undefined ? {} : { id }), name: 'Bash', input: { command: `cat ${CONTEXT_INDEX}` } }] } });
        const reply = (id, is_error) => ({ type: 'user', message: { content: [{ type: 'tool_result',
          ...(id === undefined ? {} : { tool_use_id: id }), is_error, content: 'permission denied' }] } });
        for (const marker of ['false', 'true', 1, {}, []]) {
          const malformed = evaluate(fixture, recoveryAnswer, [healthyTrace[0],
            ...claudeProjection([call('bad-flag'), reply('bad-flag', marker)]).trace, ...recoveryReads],
          {}, 'candidate', healthyRoot);
          assert.equal(malformed.pass, false, `Claude malformed is_error ${JSON.stringify(marker)} recovered`);
        }
        for (const events of [
          [call('duplicate'), reply('duplicate', false), reply('duplicate', true)],
          [reply('out-of-order', true), call('out-of-order')],
          [call(undefined), reply(undefined, true)],
        ]) {
          const malformed = evaluate(fixture, recoveryAnswer,
            [healthyTrace[0], ...claudeProjection(events).trace, ...recoveryReads],
            {}, 'candidate', healthyRoot);
          assert.equal(malformed.pass, false, 'Claude uncorrelated/duplicate result recovered');
        }
      }
    }
  } finally { rmSync(healthyRoot, { recursive: true, force: true }); }
  console.log('PASS A/B evaluator counterexamples, successful-read, and EOF self-test');
  process.exit(0);
}

const identity = contextIdentity();
const scorer = scoringIdentity();
const evaluatorSha256 = scorer.evaluator_sha256;
const scoringSha256 = scorer.scoring_sha256;
if (g5Describe) {
  console.log(JSON.stringify(g5DescribePayload(), null, 2));
  process.exit(0);
}
if (g5Mode) {
  if (g5Finalize) process.exit(executeG5Finalize(identity, scorer));
  if (releaseManifest?.g5?.execution_profile === G5_CODEX_CALIBRATION_PROFILE
      && (harness !== 'codex' || !g5Cell || g5SelectedCellIndex < 0)) {
    console.error('G5_BLOCKED Codex partial calibration is closed to Claude and unselected cells');
    process.exit(2);
  }
  let g5HarnessVersion;
  try {
    g5HarnessVersion = (await run(harness, ['--version'], { timeoutMs: 10_000 })).stdout.trim();
    assert.ok(g5HarnessVersion, 'empty harness version');
  } catch (error) {
    console.error(`G5_BLOCKED harness version unavailable: ${error.message}`);
    process.exit(2);
  }
  process.exit(await executeG5(identity, scorer, g5HarnessVersion));
}
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
if (rescorePath) {
  try {
    const receipt = rescoreSavedResult(identity, scorer);
    process.exit(receipt.passed === 1 ? 0 : 1);
  } catch (error) {
    console.error(`Rescore rejected: ${error.message}`);
    process.exit(2);
  }
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
