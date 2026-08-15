#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const AUDIT_ROOT = 'framework-audit/2026-08-09-mattpocock-handshake-cycle2';
const DEFAULT_UNIVERSE = `${AUDIT_ROOT}/reconciled-census.json`;
const DEFAULT_DECISIONS = `${AUDIT_ROOT}/decision-map.json`;
const DEFAULT_OUT = `${AUDIT_ROOT}/harness-matrix.yaml`;
const ALLOWED_DECISIONS = new Set(['ADAPT', 'KEEP', 'DEFER', 'REJECT', 'QUARANTINE']);
const ALLOWED_STATUSES = new Set(['PLANNED', 'BLOCKED_CURRENT', 'DECISION_GATED', 'N/A']);
const PHASES = ['trigger', 'execute', 'degrade', 'verify'];
const HARNESSES = ['claude', 'codex'];
const ROLES = ['plan-agent', 'work-agent', 'oracle', 'quality-gate'];

function argsOf(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function fail(reason, details = {}) {
  process.stdout.write(`${JSON.stringify({ status: 'FAIL', exit: 41, reason, ...details })}\n`);
  process.exit(41);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    fail(`${label} is not strict JSON`, { path, error: error.message });
  }
}

function readNoFollow(path) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const identity = fstatSync(fd);
    const bytes = readFileSync(fd);
    return {
      bytes,
      device: identity.dev,
      inode: identity.ino,
      size: identity.size,
      mtime_ms: identity.mtimeMs,
      ctime_ms: identity.ctimeMs,
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function decisionEntries(value) {
  for (const key of ['decisions', 'entries', 'atoms']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  if (Array.isArray(value)) return value;
  return [];
}

function normalizedDecision(entry) {
  const raw = entry.decision ?? entry.independent_decision ?? entry.disposition ?? entry.recommendation;
  return String(raw || '').toUpperCase().replace(/_PILOT$|_LINEAGE_ONLY$|_ONLY$/u, '');
}

function normalizedWp(entry) {
  const raw = String(entry.work_package ?? entry.proposed_work_package ?? entry.wp ?? '');
  const match = raw.match(/WP[-_ ]?(\d{1,2})/iu);
  if (!match) return null;
  return `WP-${match[1].padStart(2, '0')}`;
}

function verifierFor(wp) {
  const table = {
    'WP-00': 'scripts/evolution/verify-preflight.mjs',
    'WP-01': 'scripts/evolution/verify-decision-ledger.mjs',
    'WP-02': 'scripts/evolution/verify-route-containment.mjs',
    'WP-03': 'scripts/evolution/verify-project-substrate.mjs',
    'WP-04': 'scripts/evolution/verify-patch-contract.mjs',
    'WP-05': 'scripts/evolution/verify-native-agent-launcher.mjs',
    'WP-06': 'scripts/evolution/verify-debug-redaction.mjs',
    'WP-07': 'scripts/evolution/verify-codebase-parity.mjs',
    'WP-08': 'scripts/evolution/verify-safe-resolver.mjs',
    'WP-09': 'scripts/evolution/verify-teach-scope.mjs',
    'WP-10': 'scripts/evolution/verify-authoring-doctrine.mjs',
    'WP-11': 'scripts/evolution/verify-atom-behavior.mjs',
    'WP-12': 'scripts/evolution/verify-route-registration.mjs',
    'WP-13': 'scripts/evolution/verify-activation-faults.mjs',
    'WP-14': 'scripts/evolution/verify-evolution-ledger.mjs',
  };
  return table[wp] || null;
}

function isPersonalTeach(atom, lane) {
  return lane === 'adopted'
    && atom.path === 'skills/productivity/teach/SKILL.md';
}

function harnessText(value, harness) {
  const label = harness === 'claude' ? 'Claude' : 'Codex';
  return String(value || '').replace(/\b(?:Claude|Codex)\b/gu, label);
}

function expectedFor(atom, phase, decision, lane, harness, wp) {
  const zeroSurface = ['DEFER', 'REJECT', 'KEEP'].includes(decision) && lane === 'head';
  if (zeroSurface) {
    const common = `${atom.id} remains governed as ${decision}; the signed decision is authoritative and creates no unapproved new runtime surface.`;
    if (phase === 'trigger') return `PASS only when the governed ledger resolves the exact atom to ${decision}. ${common}`;
    if (phase === 'execute') return `PASS only when route, catalog, global target, pin, plugin/skills.sh copy, and activation diffs remain zero unless an already-covered baseline is explicitly pinned. ${common}`;
    if (phase === 'degrade') return `The checker MUST fail when the atom gains any direct or indirect unapproved route, target, copy, pin, or activation event. ${common}`;
    return `PASS only when the immutable decision record, provenance, baseline allowance, and zero-new-surface receipt all verify. ${common}`;
  }
  if (wp === 'WP-04' && harness === 'claude') {
    if (phase === 'trigger') return 'PASS only when Claude native Write/Edit/Bash target metadata enters the project guard without a Codex apply_patch body parser.';
    if (phase === 'execute') return 'PASS only when Claude validates the native target while preserving every path-like byte in ordinary content.';
    if (phase === 'degrade') return 'The fixture MUST fail on an invalid native target, while path-like body text alone MUST NOT cause rewrite or denial.';
    return 'PASS only when the Claude no-body-scan receipt and the Codex header-only receipt prove equivalent target enforcement without payload corruption.';
  }
  const trigger = harnessText(atom.trigger, harness);
  const effect = harnessText(atom.observable_effect, harness);
  const degradation = harnessText(atom.independent_degradation, harness);
  const verification = harnessText(atom.verification, harness);
  if (phase === 'trigger') return `PASS only when the ${harness} trigger fixture selects this atom and no sibling atom: ${trigger}`;
  if (phase === 'execute') return `PASS only when the isolated ${harness} harness exhibits the declared effect: ${effect}`;
  if (phase === 'degrade') return `The ${harness} negative fixture MUST be rejected and independently demonstrate this failure: ${degradation}`;
  return `PASS only when fresh ${harness} evidence satisfies the atom-specific oracle: ${verification}`;
}

function plannedStatus(atom, lane, decision, harness) {
  if (harness === 'codex' && isPersonalTeach(atom, lane)) return 'N/A';
  if (lane === 'head' && ['KEEP', 'DEFER', 'REJECT'].includes(decision)) return 'DECISION_GATED';
  if (lane === 'control' || decision === 'QUARANTINE') return 'BLOCKED_CURRENT';
  return 'PLANNED';
}

function receiptPath(atomId, harness, phase) {
  return `${AUDIT_ROOT}/future-receipts/atoms/${atomId}.${harness}.${phase}.json`;
}

function commandFor({ atom, lane, decision, wp, harness, phase, receipt }) {
  if (harness === 'codex' && isPersonalTeach(atom, lane)) {
    return `node scripts/evolution/verify-teach-scope.mjs --atom '${atom.id}' --harness 'codex' --phase '${phase}' --expect 'no-project-route' --receipt '${receipt}'`;
  }
  const wpVerifier = verifierFor(wp);
  if (!wpVerifier) fail('decision references an unsupported work package', { id: atom.id, work_package: wp });
  const governedHeadDecision = lane === 'head' && ['KEEP', 'DEFER', 'REJECT'].includes(decision);
  const verifier = governedHeadDecision ? verifierFor('WP-01') : wpVerifier;
  const decisionArg = governedHeadDecision
    ? ` --expect-decision '${decision}' --expect-new-surface 'zero'`
    : '';
  const wpArgs = {
    'WP-00': " --fixture-set 'checkout-origin-clean-gates'",
    'WP-01': ` --decision-map '${AUDIT_ROOT}/decision-map.json'`,
    'WP-02': " --fixture-set 'quarantine-before-adaptation' --expect-live-route 'absent'",
    'WP-03': " --fixture-set 'name-lock-pin-switch-read'",
    'WP-04': " --fixture-set 'codex-header-claude-native-body-byte-preservation'",
    'WP-05': " --require-native-edge --require-signed-receipt",
    'WP-06': " --public-canary-set 'aws,github,bearer,cookie,identity' --oracle-canary-fd 'parent-memory' --surface-manifest 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/security/output-surfaces.json' --scan 'stdout,stderr,native-transcript,artifact,handoff,final,receipt-log'",
    'WP-07': " --require 'shared-target,claude-link,codex-catalog,nested-closure,three-native-receipts'",
    'WP-08': " --fixture-set 'safe-resolver-conflict-states' --require-human-gate",
    'WP-09': " --dedicated-root 'future-fixtures/teach-personal-root'",
    'WP-10': " --require 'shared-doctrine-pointer,fusion-2x4'",
    'WP-11': ` --manifest '${AUDIT_ROOT}/atomic-manifest.yaml' --fixture-set 'manifest-one-negative-per-atom'`,
    'WP-12': " --require 'external-route,registration,hermetic-env'",
    'WP-13': " --isolation 'throwaway-apfs' --fault-suite 'broker-kill-host-restart-cas-rollback'",
    'WP-14': " --require 'pins,registry,changelog,governed-memory-candidate'",
  }[wp] || '';
  const delegatedVerifier = governedHeadDecision && wpVerifier !== verifier
    ? ` --delegated-verifier '${wpVerifier}'`
    : '';
  return `node ${verifier} --matrix '${AUDIT_ROOT}/harness-matrix.yaml' --atom '${atom.id}' --harness '${harness}' --phase '${phase}'${decisionArg}${delegatedVerifier}${wpArgs} --receipt '${receipt}'`;
}

function buildRole(role, harness) {
  const receipt = `${AUDIT_ROOT}/future-receipts/roles/${harness}.${role}.json`;
  const nativeLog = `${AUDIT_ROOT}/future-receipts/roles/${harness}.${role}.native.jsonl`;
  const definition = harness === 'claude' ? `.claude/agents/${role}.md` : `.codex/agents/${role}.toml`;
  const dispatch = harness === 'claude'
    ? `Agent({subagent_type:"${role}",description:"cycle2-native-${role}",prompt:<schema-validated-work-packet-json>})`
    : `spawn_agent({agent_type:"${role}",task_name:"cycle2_native_${role.replaceAll('-', '_')}",message:<schema-validated-work-packet-json>})`;
  return {
    native_name: role,
    agent_definition: definition,
    native_dispatch: dispatch,
    signed_receipt_verify: `node '${AUDIT_ROOT}/future-receipts/WP-00/evidence-tcb/verify-role-receipt.mjs' --role '${role}' --harness '${harness}' --receipt '${receipt}' --raw-transport '${nativeLog}' --anchor '${AUDIT_ROOT}/future-receipts/WP-00/evidence-tcb-anchor.json' --execution-envelope '${AUDIT_ROOT}/future-receipts/WP-00/execution-envelope.json'`,
    expected: `A real ${harness} native graph edge names ${role}, matches the frozen agent-definition and work-packet hashes, and has a valid non-self-reported Ed25519 receipt chain.`,
    receipt,
  };
}

const args = argsOf(process.argv);
const universePath = String(args.universe || DEFAULT_UNIVERSE);
const decisionsPath = String(args.decisions || DEFAULT_DECISIONS);
const outPath = String(args.out || DEFAULT_OUT);
if (args['negative-bite'] && !args.out) {
  fail('--negative-bite requires an explicit --out and may not replace the frozen source matrix');
}
if (args['negative-bite'] && resolve(outPath) === resolve(DEFAULT_OUT)) {
  fail('--negative-bite output must be outside the frozen source matrix');
}
let frozenSource = null;
if (args['negative-bite']) {
  if (!args['source-matrix'] || !args['expected-sha']) {
    fail('--negative-bite requires --source-matrix and --expected-sha');
  }
  const sourcePath = resolve(String(args['source-matrix']));
  if (sourcePath === resolve(outPath)) fail('negative-bite source and output must be different paths');
  let identity;
  try {
    identity = readNoFollow(sourcePath);
  } catch (error) {
    fail('frozen source matrix must be a readable non-symlink file', { source_matrix: sourcePath, code: error.code });
  }
  if (sha256(identity.bytes) !== String(args['expected-sha'])) {
    fail('frozen source matrix does not match --expected-sha', {
      source_matrix: sourcePath,
      expected_sha: String(args['expected-sha']),
      actual_sha: sha256(identity.bytes),
    });
  }
  frozenSource = { sourcePath, ...identity };
}
const universeBytes = readFileSync(resolve(universePath));
const decisionBytes = readFileSync(resolve(decisionsPath));
const universe = readJson(universePath, 'reconciled census');
const decisionsDoc = readJson(decisionsPath, 'decision map');

const lanes = [
  ['adopted', universe.final_atoms || []],
  ['control', universe.control_atoms || []],
  ['head', universe.head_candidate_atoms || []],
];
const actualCounts = Object.fromEntries(lanes.map(([lane, atoms]) => [lane, atoms.length]));
if (actualCounts.adopted !== 197 || actualCounts.control !== 50 || actualCounts.head !== 74) {
  fail('audit universe lane counts are not frozen at 197 + 50 + 74', { actual_counts: actualCounts });
}
const laneRows = lanes.flatMap(([lane, atoms]) => atoms.map((atom) => ({ lane, atom })));
const universeIds = laneRows.map(({ atom }) => atom.id);
if (new Set(universeIds).size !== 321) fail('audit universe IDs are not exactly 321 unique atoms');

const entries = decisionEntries(decisionsDoc);
const decisionById = new Map();
const duplicateDecisionIds = [];
for (const entry of entries) {
  const id = entry.id ?? entry.atom_id;
  if (!id) continue;
  if (decisionById.has(id)) duplicateDecisionIds.push(id);
  decisionById.set(id, entry);
}
const missingDecisions = universeIds.filter((id) => !decisionById.has(id));
const extraDecisions = [...decisionById.keys()].filter((id) => !universeIds.includes(id));
if (duplicateDecisionIds.length || missingDecisions.length || extraDecisions.length || decisionById.size !== 321) {
  fail('decision map does not exactly cover the 321-atom audit universe', {
    duplicate_decision_ids: duplicateDecisionIds,
    missing_decisions: missingDecisions,
    extra_decisions: extraDecisions,
    decision_count: decisionById.size,
  });
}

const rows = laneRows.map(({ lane, atom }) => {
  const entry = decisionById.get(atom.id);
  const decision = normalizedDecision(entry);
  const wp = normalizedWp(entry);
  if (!ALLOWED_DECISIONS.has(decision)) fail('unsupported or missing decision', { id: atom.id, decision });
  if (!wp || !verifierFor(wp)) fail('missing or unsupported work package', { id: atom.id, work_package: wp });
  const row = {
    id: atom.id,
    lane,
    decision,
    work_package: wp,
    behavior_slug: atom.behavior_slug ?? atom.slug,
    claude: {},
    codex: {},
  };
  for (const harness of HARNESSES) {
    for (const phase of PHASES) {
      const receipt = receiptPath(atom.id, harness, phase);
      const status = plannedStatus(atom, lane, decision, harness);
      if (!ALLOWED_STATUSES.has(status)) fail('internal invalid status', { id: atom.id, harness, phase, status });
      const cell = {
        status,
        command: commandFor({ atom, lane, decision, wp, harness, phase, receipt }),
        expected: expectedFor(atom, phase, decision, lane, harness, wp),
        receipt,
      };
      if (status === 'N/A') {
        cell.scope_exception = 'teach is a Claude personal-scope capability; Codex must mechanically prove that no project route, catalog target, global target, pin, or activation surface exists';
      }
      row[harness][phase] = cell;
    }
  }
  return row;
});

const roles = Object.fromEntries(ROLES.map((role) => [role, {
  claude: buildRole(role, 'claude'),
  codex: buildRole(role, 'codex'),
}]));

const matrix = {
  schema_version: '2.0.0',
  audit: 'mattpocock-handshake-cycle2-final-dual-harness',
  status_semantics: {
    PLANNED: 'The future work package and its executable proof are specified; this is not a claim of current PASS.',
    BLOCKED_CURRENT: 'The current framework has a reproduced blocking gap; the future proof must remain red until its work package closes it.',
    DECISION_GATED: 'A governed KEEP/DEFER/REJECT record permits no unapproved new runtime surface.',
    'N/A': 'Only the explicitly personal Claude teach capability may be excluded from Codex project routing, and absence is mechanically proved.',
  },
  universe: {
    total: 321,
    lanes: actualCounts,
    reconciled_census: universePath,
    reconciled_census_sha256: sha256(universeBytes),
    decision_map: decisionsPath,
    decision_map_sha256: sha256(decisionBytes),
  },
  output_surface_manifest: `${AUDIT_ROOT}/fixtures/security/output-surfaces.json`,
  phase_order: PHASES,
  roles,
  atoms: rows,
  file_end: 'harness-matrix.yaml',
};

const matrixBytes = Buffer.from(`${JSON.stringify(matrix, null, 2)}\n`);
if (frozenSource && !matrixBytes.equals(frozenSource.bytes)) {
  fail('generated matrix is not byte-identical to the already-validated frozen source matrix', {
    source_matrix: frozenSource.sourcePath,
    source_sha256: sha256(frozenSource.bytes),
    generated_sha256: sha256(matrixBytes),
  });
}
if (args['negative-bite']) {
  let outFd;
  try {
    outFd = openSync(
      resolve(outPath),
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    );
    const outIdentity = fstatSync(outFd);
    if (frozenSource && outIdentity.dev === frozenSource.device && outIdentity.ino === frozenSource.inode) {
      fail('negative-bite output aliases the frozen source matrix inode');
    }
    writeFileSync(outFd, matrixBytes);
  } catch (error) {
    if (error?.code === 'EEXIST' || error?.code === 'ELOOP') {
      fail('negative-bite output must be a new non-symlink file', { out: resolve(outPath), code: error.code });
    }
    throw error;
  } finally {
    if (outFd !== undefined) closeSync(outFd);
  }
} else {
  writeFileSync(resolve(outPath), matrixBytes);
}
const outBytes = readFileSync(resolve(outPath));
const negativeBites = [];
if (args['negative-bite']) {
  const auditTool = resolve(`${AUDIT_ROOT}/tools/audit.mjs`);
  const runAudit = (matrixPath) => {
    try {
      const stdout = execFileSync(process.execPath, [
        auditTool, 'harness-matrix', '--universe', resolve(universePath), '--matrix', resolve(matrixPath),
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { exit: 0, stdout: stdout.trim() };
    } catch (error) {
      return { exit: error.status, stdout: String(error.stdout || '').trim(), stderr: String(error.stderr || '').trim() };
    }
  };
  const positive = runAudit(outPath);
  if (positive.exit !== 0) fail('generated matrix failed its strict validator', { validator: positive });
  const scratch = mkdtempSync(join(tmpdir(), 'cycle2-harness-bites.'));
  const biteCases = [
    ['deleted-cell', (candidate) => { delete candidate.atoms[0].claude.trigger; }],
    ['fake-na', (candidate) => { candidate.atoms.find((row) => row.lane === 'control').claude.execute.status = 'N/A'; }],
    ['duplicate-receipt', (candidate) => {
      candidate.atoms[1].claude.trigger.receipt = candidate.atoms[0].claude.trigger.receipt;
      candidate.atoms[1].claude.trigger.command = candidate.atoms[1].claude.trigger.command.replace(
        /--receipt '[^']+'/u,
        `--receipt '${candidate.atoms[0].claude.trigger.receipt}'`,
      );
    }],
    ['missing-role', (candidate) => { delete candidate.roles.oracle; }],
    ['decision-drift', (candidate) => { candidate.atoms[0].decision = candidate.atoms[0].decision === 'ADAPT' ? 'KEEP' : 'ADAPT'; }],
    ['work-package-drift', (candidate) => { candidate.atoms[0].work_package = candidate.atoms[0].work_package === 'WP-10' ? 'WP-11' : 'WP-10'; }],
    ['generic-expected', (candidate) => { candidate.atoms[0].claude.degrade.expected = 'PASS'; }],
    ['single-harness-token-swap', (candidate) => {
      candidate.atoms[0].codex.verify.expected = candidate.atoms[0].codex.verify.expected.replaceAll('codex', 'claude');
    }],
  ];
  try {
    for (const [name, mutate] of biteCases) {
      const candidate = structuredClone(matrix);
      mutate(candidate);
      const candidatePath = join(scratch, `${name}.json`);
      writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
      const result = runAudit(candidatePath);
      if (result.exit !== 41) fail('negative bite did not trigger validator exit 41', { bite: name, result });
      let parsed;
      try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
      if (parsed?.status !== 'FAIL') fail('negative bite did not produce a structured FAIL', { bite: name, result });
      negativeBites.push({ bite: name, status: 'REJECTED_AS_REQUIRED', exit: result.exit, reason: parsed.reason });
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
let frozenSourceUnchanged = null;
if (frozenSource) {
  let afterIdentity;
  try {
    afterIdentity = readNoFollow(frozenSource.sourcePath);
  } catch (error) {
    fail('frozen source matrix became unreadable or a symlink during validation', {
      source_matrix: frozenSource.sourcePath,
      code: error.code,
    });
  }
  frozenSourceUnchanged = afterIdentity.bytes.equals(frozenSource.bytes)
    && afterIdentity.device === frozenSource.device
    && afterIdentity.inode === frozenSource.inode
    && afterIdentity.size === frozenSource.size
    && afterIdentity.mtime_ms === frozenSource.mtime_ms
    && afterIdentity.ctime_ms === frozenSource.ctime_ms;
  if (!frozenSourceUnchanged) fail('frozen source matrix changed during negative-bite validation');
}
process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  out: resolve(outPath),
  sha256: sha256(outBytes),
  atoms: rows.length,
  cells: rows.length * HARNESSES.length * PHASES.length,
  roles: ROLES.length,
  negative_bites: negativeBites,
  frozen_source_unchanged: frozenSourceUnchanged,
})}\n`);
