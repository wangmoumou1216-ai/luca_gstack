#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const CYCLE_DIR = resolve(TOOL_DIR, '..');
const REPO_DIR = resolve(CYCLE_DIR, '../..');
const [,, command = 'build', ...argv] = process.argv;

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = values[index + 1];
    parsed[key] = next && !next.startsWith('--') ? values[++index] : true;
  }
  return parsed;
}

const args = parseArgs(argv);
const paths = {
  reconciled: resolve(String(args.reconciled || resolve(CYCLE_DIR, 'reconciled-census.json'))),
  source: resolve(String(args.source || resolve(CYCLE_DIR, 'source-census.json'))),
  origin: resolve(String(args.origin || resolve(CYCLE_DIR, 'origin-ledger.json'))),
  headLedger: resolve(String(args['head-ledger'] || resolve(CYCLE_DIR, 'head-ledger.json'))),
  headDecisions: resolve(String(args['head-decisions'] || resolve(CYCLE_DIR, 'head-decision-map.json'))),
  schema: resolve(String(args.schema || resolve(CYCLE_DIR, 'schemas/atomic-capability.schema.json'))),
  decisionsOut: resolve(String(args['decisions-out'] || resolve(CYCLE_DIR, 'decision-map.json'))),
  manifestOut: resolve(String(args['manifest-out'] || resolve(CYCLE_DIR, 'atomic-manifest.yaml'))),
};

function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function lineOf(record) {
  const match = String(record).match(/:L(\d+)$/);
  assert(match, `unparseable adoption record: ${record}`);
  return Number(match[1]);
}

function wpShort(value) {
  const match = String(value).match(/^(WP-\d{2})(?:-|$)/);
  assert(match, `unparseable work package: ${value}`);
  return match[1];
}

function titleOf(slug) {
  const value = String(slug).replaceAll('-', ' ');
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

const CONTROL_POLICIES = new Map();

function controls(slugs, decision, workPackage, reason) {
  for (const slug of slugs) {
    assert(!CONTROL_POLICIES.has(slug), `duplicate control policy: ${slug}`);
    CONTROL_POLICIES.set(slug, { decision, work_package: workPackage, reason });
  }
}

controls(
  ['route-tdd-claude', 'route-tdd-codex', 'route-debug-claude', 'route-debug-codex', 'tdd-shared-target-identity'],
  'KEEP', 'WP-12',
  'The currently safe TDD/debug route target identity is retained; WP-12 must keep proving the target in both external harness catalogs.',
);
controls(
  ['route-codebase-design-claude', 'route-codebase-design-codex', 'nested-code-recon-codebase-design-claude', 'nested-code-recon-codebase-design-codex'],
  'ADAPT', 'WP-07',
  'The codebase-design edge is orphaned or nested-only in at least one harness; WP-07 must create and verify one shared target and every nested reference.',
);
controls(
  ['route-resolver-claude', 'route-resolver-codex', 'unsafe-route-quarantine'],
  'QUARANTINE', 'WP-02',
  'The installed resolver exposes unsafe conflict-writing behavior; WP-02 must remove reachability before any replacement is activated.',
);
controls(
  ['teach-claude-personal-discovery', 'teach-codex-scope-exclusion'],
  'KEEP', 'WP-09',
  'Teach remains an explicitly personal Claude-only surface and an explicit Codex scope exclusion; WP-09 preserves that boundary.',
);
controls(
  ['teach-dedicated-write-root'],
  'ADAPT', 'WP-09',
  'The personal teaching skill lacks a mechanically dedicated write root; WP-09 must isolate all generated learning artifacts before use.',
);
controls(
  ['authoring-doctrine-claude-pointer', 'authoring-doctrine-codex-pointer', 'authoring-doctrine-fusion-pointer', 'authoring-doctrine-parity-check'],
  'ADAPT', 'WP-10',
  'Skill-authoring doctrine exists but its retrieval and parity pointers are incomplete across harnesses; WP-10 makes the single source reachable and checked.',
);
controls(
  ['brainstorm-native-perspective-count', 'brainstorm-oracle-independence', 'codex-plan-role-dispatch', 'codex-work-role-dispatch', 'codex-oracle-role-dispatch', 'native-delegation-receipt', 'agent-tier-portability'],
  'ADAPT', 'WP-05',
  'Native named-agent dispatch, independence, portable reasoning tiers, and non-self-reported receipts are incomplete; WP-05 supplies the dual-harness agent graph.',
);
controls(
  ['patch-header-only-target', 'patch-body-byte-preservation', 'patch-malformed-header-denial'],
  'ADAPT', 'WP-04',
  'The current Codex adapter can interpret patch body text as a target path; WP-04 must parse headers only, preserve body bytes, and deny malformed headers.',
);
controls(
  ['project-name-canonical-validation', 'pin-after-switch-success', 'compound-switch-transaction-boundary', 'failed-switch-preserves-pin', 'no-pin-native-read-path'],
  'ADAPT', 'WP-03',
  'Project switching and session pinning are not one failure-atomic canonical transaction; WP-03 must validate identity, lock, switch, and publish the pin in order.',
);
controls(
  ['activation-journal-state-machine', 'activation-cas-precondition', 'activation-atomic-publish', 'activation-reverse-dag-rollback'],
  'ADAPT', 'WP-13',
  'Activation lacks a signed crash-recoverable CAS journal and atomic global publication; WP-13 must implement the approved transaction state machine and rollback DAG.',
);
controls(
  ['verifier-environment-hermeticity', 'verifier-logical-role-names', 'registration-check-blocking'],
  'ADAPT', 'WP-12',
  'Current verification can inherit ambient harness variables or accept logical-role counts without proving exact targets; WP-12 must make checks hermetic and blocking.',
);
controls(
  ['debug-environment-output-redaction', 'debug-capture-output-redaction', 'debug-artifact-redaction'],
  'ADAPT', 'WP-06',
  'Debug output can cross an unredacted environment, capture, or artifact boundary; WP-06 must redact before every display and persistence sink.',
);
controls(
  ['proof-it-bites-trigger-specificity', 'tdd-installed-footprint', 'tdd-upstream-pin', 'debug-port-origin-lineage', 'debug-upstream-drift-watch', 'plan-continuity-consumer'],
  'KEEP', 'WP-11',
  'The existing proof, pin, provenance, drift-watch, or plan-continuity invariant is retained and re-proved by WP-11 without expanding runtime surface.',
);

function adoptedPolicy(atom) {
  const path = atom.path;
  const slug = atom.behavior_slug;
  if (path.includes('/resolving-merge-conflicts/')) {
    return {
      decision: 'ADAPT', work_package: 'WP-08', current_state: 'active-unsafe',
      reason: 'The resolver capability is adopted and reachable but its current never-abort/write behavior is unsafe; WP-08 may replace it only after WP-02 quarantine and dual-harness safety proof.',
    };
  }
  if (path.includes('/codebase-design/')) {
    return {
      decision: 'ADAPT', work_package: 'WP-07', current_state: 'orphan',
      reason: 'The codebase-design behavior is adopted, but its Codex target is orphaned; WP-07 must install one shared cross-harness target and close nested references.',
    };
  }
  if (path.includes('/diagnosing-bugs/')) {
    return {
      decision: 'ADAPT', work_package: 'WP-06', current_state: 'active-unsafe',
      reason: 'The debugging port is active but can expose raw environment, capture, or artifact output; WP-06 must add redaction at every output boundary.',
    };
  }
  if (path === 'skills/productivity/teach/SKILL.md') {
    return {
      decision: 'ADAPT', work_package: 'WP-09', current_state: 'active-unsafe',
      reason: 'Teach is a personal Claude install whose write scope is not mechanically isolated; WP-09 must add a dedicated root while preserving explicit Codex exclusion.',
    };
  }
  if (path === 'skills/productivity/writing-great-skills/SKILL.md') {
    return {
      decision: 'ADAPT', work_package: 'WP-10', current_state: 'governance-only',
      reason: 'The authoring behavior exists as governed doctrine, but Codex and fusion retrieval pointers are incomplete; WP-10 must make the single doctrine source reachable and parity-checked.',
    };
  }
  if (path.includes('/wayfinder/') || path.includes('/grilling/')) {
    return {
      decision: 'ADAPT', work_package: 'WP-05', current_state: path.includes('/wayfinder/') ? 'orphan' : 'active-unsafe',
      reason: 'The behavior is ported into planning or brainstorming, but native Plan/Work/Oracle dispatch and independent receipts are incomplete; WP-05 must close both harness graphs.',
    };
  }
  if (path === 'CLAUDE.md' && atom.adoption_mode === 'adapt-idea') {
    return {
      decision: 'ADAPT', work_package: 'WP-12', current_state: 'governance-only',
      reason: 'The registration idea is present as governance, but external Claude/Codex targets are not all proven; WP-12 must validate exact catalog, route, and symlink identities.',
    };
  }
  if (path.includes('/domain-modeling/') && ['challenge-and-canonicalize-terms', 'persist-resolved-term-inline'].includes(slug)) {
    return {
      decision: 'ADAPT', work_package: 'WP-05', current_state: 'active-unsafe',
      reason: 'This term challenge/persistence behavior crosses native agent and human-decision boundaries; WP-05 must preserve the gate with named-agent parity and receipts.',
    };
  }
  if (path.includes('/improve-codebase-architecture/') && slug === 'consumer-deletion-test') {
    return {
      decision: 'ADAPT', work_package: 'WP-07', current_state: 'orphan',
      reason: 'The deletion test depends on codebase-design vocabulary whose Codex target is orphaned; WP-07 must close that shared reference before the test is relied upon.',
    };
  }
  if (path.includes('/tdd/') && slug === 'refactor-outside-red-green') {
    return {
      decision: 'ADAPT', work_package: 'WP-11', current_state: 'active-unsafe',
      reason: 'The refactor-outside-red-green behavior carries a dangling review pointer across harnesses; WP-11 must make the reference-only check explicit and prove it in both runtimes.',
    };
  }
  if (path === 'skills/productivity/handoff/SKILL.md' && slug === 'handoff-redacts-sensitive-data') {
    return {
      decision: 'ADAPT', work_package: 'WP-06', current_state: 'active-unsafe',
      reason: 'Handoff redaction is adopted but does not yet prove environment, capture, and persisted-artifact sinks; WP-06 must close all three independent leak paths.',
    };
  }
  return {
    decision: 'KEEP', work_package: 'WP-11', current_state: path.startsWith('.changeset/') ? 'governance-only' : 'active-safe',
    reason: 'The currently adopted behavior remains valid; WP-11 preserves its pin, provenance, and regression verification without adding a new runtime surface.',
  };
}

function controlPolicy(atom) {
  const value = CONTROL_POLICIES.get(atom.slug);
  assert(value, `unmapped control atom: ${atom.id} ${atom.slug}`);
  return value;
}

function targetsFor(atom) {
  const line = lineOf(atom.adoption_record);
  const rel = (prefix) => atom.path.startsWith(prefix) ? atom.path.slice(prefix.length) : 'SKILL.md';
  const twoOfficeTargets = (skill, file = 'SKILL.md') => [
    `.claude/skills/office/${skill}/${file}`,
    `.agents/skills/${skill}/${file}`,
  ];
  switch (line) {
    case 6: return [`~/.claude/skills/codebase-design/${rel('skills/engineering/codebase-design/')}`];
    case 7: return [`~/.claude/skills/resolving-merge-conflicts/${rel('skills/engineering/resolving-merge-conflicts/')}`];
    case 8: {
      const file = rel('skills/engineering/tdd/');
      return [`~/.claude/skills/tdd/${file}`, `~/.agents/skills/tdd/${file}`];
    }
    case 9: return ['~/.claude/skills/teach/SKILL.md'];
    case 10: return ['.claude/skill-os/skill-authoring.md', '.claude/skill-os/evolution/FUSION-RUNBOOK.md', 'CLAUDE.md'];
    case 11: return twoOfficeTargets('code-hygiene');
    case 12: {
      const file = atom.path.includes('/scripts/') ? 'scripts/hitl-loop.template.sh' : 'SKILL.md';
      return [`~/.claude/skills/systematic-debugging/${file}`, `~/.agents/skills/systematic-debugging/${file}`];
    }
    case 13: return ['scripts/check-registration-sync.mjs', 'CLAUDE.md'];
    case 14: return twoOfficeTargets('task-plan');
    case 15:
    case 24: return ['.claude/agents/plan-agent.md'];
    case 16: return twoOfficeTargets('tech-spec');
    case 17:
    case 25: return twoOfficeTargets('brainstorm');
    case 18: return [
      '.claude/skills/office/references/handoff-protocol.md',
      '.agents/skills/references/handoff-protocol.md',
    ];
    case 19: return ['CLAUDE.md', '.claude/skill-os/extraction-bar.md', ...twoOfficeTargets('brainstorm')];
    case 20: return twoOfficeTargets('muse-req-triage');
    case 21:
    case 26: return twoOfficeTargets('code-recon');
    case 22: return twoOfficeTargets('quick-research');
    case 23: return ['CHANGELOG.md'];
    default: throw new Error(`no live-target mapping for adoption record ${atom.adoption_record}`);
  }
}

function surfaceFor(atom) {
  if (atom.path === 'CLAUDE.md') return 'catalog';
  if (atom.path.startsWith('.changeset/')) return 'provenance';
  if (atom.path.endsWith('.template.sh')) return 'harness-adapter';
  if (/\/(DEEPENING|DESIGN-IT-TWICE|CONTEXT-FORMAT|OUT-OF-SCOPE|mocking)\.md$/.test(atom.path)) {
    return 'support-reference';
  }
  return 'skill-behavior';
}

function buildContext() {
  const reconciled = load(paths.reconciled);
  const source = load(paths.source);
  const origin = load(paths.origin);
  const headLedger = load(paths.headLedger);
  const headDecisions = load(paths.headDecisions);
  assert(reconciled.status === 'PASS', 'reconciled census is not PASS');
  assert(reconciled.counts.adopted_capability_atoms === reconciled.final_atoms.length, 'adopted count drift');
  assert(reconciled.counts.control_atoms === reconciled.control_atoms.length, 'control count drift');
  assert(reconciled.counts.head_candidate_atoms === reconciled.head_candidate_atoms.length, 'HEAD count drift');
  assert(reconciled.counts.total_audit_universe === 321, 'audit universe is not the frozen 321 atoms');
  assert(reconciled.counts.adopted_denominator_N === 197, 'adopted denominator is not the frozen N=197');
  assert(CONTROL_POLICIES.size === reconciled.control_atoms.length, 'control policy cardinality drift');
  assert(headDecisions.entries.length === reconciled.head_candidate_atoms.length, 'HEAD decision cardinality drift');
  const sourceById = new Map(source.atoms.map((atom) => [atom.id, atom]));
  const originByKey = new Map(origin.objects.map((object) => [`${object.commit}:${object.path}`, object]));
  const headDecisionById = new Map(headDecisions.entries.map((entry) => [entry.id, entry]));
  const frameworkHead = execFileSync('git', ['-C', REPO_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const upstreamHead = headLedger.window.current_main_head;
  assert(/^[0-9a-f]{40}$/.test(frameworkHead), 'framework HEAD is invalid');
  assert(/^[0-9a-f]{40}$/.test(upstreamHead), 'upstream HEAD is invalid');
  return {
    reconciled, source, origin, headLedger, headDecisions,
    sourceById, originByKey, headDecisionById, frameworkHead, upstreamHead,
  };
}

function resolveOrigin(atom, context) {
  assert(Array.isArray(atom.source_parent_ids) && atom.source_parent_ids.length === 1, `${atom.id}: source_parent_ids must contain exactly one source atom`);
  const parent = context.sourceById.get(atom.source_parent_ids[0]);
  assert(parent, `${atom.id}: missing source parent ${atom.source_parent_ids[0]}`);
  for (const field of ['origin_commit', 'path', 'source_range']) {
    assert(atom[field] === parent[field], `${atom.id}: split/identity lineage disagrees with parent ${field}`);
  }
  if (atom.normalization === 'IDENTITY') assert(atom.id === parent.id, `${atom.id}: identity atom does not preserve parent id`);
  if (atom.normalization === 'SPLIT_COMPOSITE_SOURCE_ROW') assert(atom.id !== parent.id, `${atom.id}: split child reused composite parent id`);
  const object = context.originByKey.get(`${parent.origin_commit}:${parent.path}`);
  assert(object, `${atom.id}: origin ledger lacks ${parent.origin_commit}:${parent.path}`);
  assert(object.eof?.read_complete === true, `${atom.id}: origin object has no EOF receipt`);
  const range = parent.source_range.match(/^L(\d+)-L(\d+)$/);
  assert(range, `${atom.id}: invalid source range ${parent.source_range}`);
  assert(Number(range[1]) >= 1 && Number(range[2]) <= object.lines && Number(range[1]) <= Number(range[2]), `${atom.id}: source range exceeds origin object`);
  return {
    source_repo: 'mattpocock/skills',
    commit: object.commit,
    path: object.path,
    source_range: parent.source_range,
    blob_oid: object.blob_oid,
    sha256: object.sha256,
    bytes: object.bytes,
    eof_verified: true,
  };
}

function buildDecisionMap(context) {
  const adopted = context.reconciled.final_atoms.map((atom) => {
    const policy = adoptedPolicy(atom);
    return {
      id: atom.id,
      lane: 'adopted',
      slug: atom.behavior_slug,
      decision: policy.decision,
      reason: policy.reason,
      work_package: policy.work_package,
      current_state: policy.current_state,
    };
  });
  const control = context.reconciled.control_atoms.map((atom) => {
    const policy = controlPolicy(atom);
    return {
      id: atom.id,
      lane: 'control',
      slug: atom.slug,
      decision: policy.decision,
      reason: policy.reason,
      work_package: policy.work_package,
      blocking: atom.blocking,
    };
  });
  const head = context.reconciled.head_candidate_atoms.map((atom) => {
    const canonical = context.headDecisionById.get(atom.id);
    assert(canonical, `${atom.id}: missing canonical HEAD decision`);
    assert(canonical.slug === atom.slug, `${atom.id}: HEAD decision slug drift`);
    return {
      id: atom.id,
      lane: 'head',
      slug: atom.slug,
      decision: canonical.independent_decision,
      reason: canonical.reason,
      work_package: wpShort(canonical.proposed_work_package),
      decision_scope: canonical.decision_scope,
      canonical_work_package: canonical.proposed_work_package,
      canonical_source: 'head-decision-map.json',
    };
  });
  const byLane = {
    adopted: adopted.sort((a, b) => a.id.localeCompare(b.id)),
    control: control.sort((a, b) => a.id.localeCompare(b.id)),
    head: head.sort((a, b) => a.id.localeCompare(b.id)),
  };
  const decisions = [...byLane.adopted, ...byLane.control, ...byLane.head];
  const expectedIds = sortedUnique([
    ...context.reconciled.final_atoms.map((atom) => atom.id),
    ...context.reconciled.control_atoms.map((atom) => atom.id),
    ...context.reconciled.head_candidate_atoms.map((atom) => atom.id),
  ]);
  const decisionIds = sortedUnique(decisions.map((row) => row.id));
  assert(expectedIds.length === 321, `expected universe has ${expectedIds.length}, not 321 unique ids`);
  assert(decisionIds.length === decisions.length, 'decision ids collide');
  assert(sameArray(expectedIds, decisionIds), 'decision map does not cover the exact reconciled universe');
  const decisionCounts = {};
  for (const row of decisions) decisionCounts[row.decision] = (decisionCounts[row.decision] || 0) + 1;
  return {
    schema_version: 'cycle2-decision-map/v1',
    audit_date: '2026-08-09',
    inputs: {
      reconciled_census_sha256: fileSha256(paths.reconciled),
      source_census_sha256: fileSha256(paths.source),
      origin_ledger_sha256: fileSha256(paths.origin),
      head_ledger_sha256: fileSha256(paths.headLedger),
      head_decision_map_sha256: fileSha256(paths.headDecisions),
    },
    contract: {
      universe: '197 adopted atoms + 50 gating controls + 74 unadopted HEAD candidates',
      adopted_denominator: 197,
      head_decisions: 'Copied without re-adjudication from head-decision-map.json independent_decision and reason.',
      no_implicit_decisions: true,
    },
    lanes: {
      adopted: byLane.adopted.map((row) => row.id),
      control: byLane.control.map((row) => row.id),
      head: byLane.head.map((row) => row.id),
    },
    decisions,
    counts: {
      total: decisions.length,
      adopted: byLane.adopted.length,
      control: byLane.control.length,
      head: byLane.head.length,
      by_decision: Object.fromEntries(Object.entries(decisionCounts).sort(([a], [b]) => a.localeCompare(b))),
    },
    coverage: {
      expected_ids: expectedIds,
      decision_ids: decisionIds,
      unmatched: [],
      unexpected: [],
      collisions: [],
    },
    integrity: {
      algorithm: 'sha256',
      canonicalization: 'recursive key-sorted JSON without insignificant whitespace',
      adopted_lane_sha256: sha256(stable(byLane.adopted)),
      control_lane_sha256: sha256(stable(byLane.control)),
      head_lane_sha256: sha256(stable(byLane.head)),
      ordered_ids_sha256: sha256(stable(decisionIds)),
    },
    _file_end: 'decision-map.json',
  };
}

function buildManifest(context, decisionMap) {
  const decisionById = new Map(decisionMap.decisions.map((row) => [row.id, row]));
  const atoms = context.reconciled.final_atoms.map((atom) => {
    const decision = decisionById.get(atom.id);
    assert(decision?.lane === 'adopted', `${atom.id}: adopted decision missing`);
    return {
      id: atom.id,
      behavior_slug: atom.behavior_slug,
      title: titleOf(atom.behavior_slug),
      surface: surfaceFor(atom),
      trigger: atom.trigger,
      observable_effect: atom.observable_effect,
      independent_failure: atom.independent_degradation,
      provenance: [resolveOrigin(atom, context)],
      live_targets: sortedUnique(targetsFor(atom)),
      current_state: decision.current_state,
      decision: decision.decision,
      decision_reason: decision.reason,
      work_package: decision.work_package,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const ids = atoms.map((atom) => atom.id);
  assert(ids.length === 197 && sortedUnique(ids).length === 197, 'manifest denominator/uniqueness drift');
  return {
    schema_version: '1.0.0',
    upstream_head: context.upstreamHead,
    framework_head: context.frameworkHead,
    atoms,
    coverage: {
      denominator: atoms.length,
      source_ids: ids,
      live_ids: ids,
      independent_ids: ids,
      unmatched: [],
      collisions: [],
      composites: [],
    },
  };
}

function localRef(root, ref) {
  assert(ref.startsWith('#/'), `only local schema refs are supported: ${ref}`);
  return ref.slice(2).split('/').reduce((value, token) => value[token.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateSchema(value, schema) {
  const errors = [];
  function visit(subject, rule, pointer) {
    if (rule.$ref) return visit(subject, localRef(schema, rule.$ref), pointer);
    if (rule.type) {
      const allowed = Array.isArray(rule.type) ? rule.type : [rule.type];
      const actual = valueType(subject);
      if (!allowed.includes(actual) && !(actual === 'integer' && allowed.includes('number'))) {
        errors.push(`${pointer}: type ${actual} is not ${allowed.join('|')}`);
        return;
      }
    }
    if (Object.hasOwn(rule, 'const') && stable(subject) !== stable(rule.const)) errors.push(`${pointer}: const mismatch`);
    if (rule.enum && !rule.enum.some((candidate) => stable(candidate) === stable(subject))) errors.push(`${pointer}: value is outside enum`);
    if (typeof subject === 'string') {
      if (rule.minLength !== undefined && subject.length < rule.minLength) errors.push(`${pointer}: shorter than minLength ${rule.minLength}`);
      if (rule.pattern && !(new RegExp(rule.pattern).test(subject))) errors.push(`${pointer}: does not match ${rule.pattern}`);
      if (rule.format === 'date-time' && Number.isNaN(Date.parse(subject))) errors.push(`${pointer}: invalid date-time`);
    }
    if (typeof subject === 'number' && rule.minimum !== undefined && subject < rule.minimum) errors.push(`${pointer}: below minimum ${rule.minimum}`);
    if (Array.isArray(subject)) {
      if (rule.minItems !== undefined && subject.length < rule.minItems) errors.push(`${pointer}: fewer than ${rule.minItems} items`);
      if (rule.maxItems !== undefined && subject.length > rule.maxItems) errors.push(`${pointer}: more than ${rule.maxItems} items`);
      if (rule.uniqueItems && new Set(subject.map(stable)).size !== subject.length) errors.push(`${pointer}: items are not unique`);
      if (rule.items) subject.forEach((item, index) => visit(item, rule.items, `${pointer}/${index}`));
    }
    if (subject && typeof subject === 'object' && !Array.isArray(subject)) {
      for (const key of rule.required || []) {
        if (!Object.hasOwn(subject, key)) errors.push(`${pointer}: missing required property ${key}`);
      }
      if (rule.additionalProperties === false) {
        for (const key of Object.keys(subject)) {
          if (!Object.hasOwn(rule.properties || {}, key)) errors.push(`${pointer}: unexpected property ${key}`);
        }
      }
      for (const [key, childRule] of Object.entries(rule.properties || {})) {
        if (Object.hasOwn(subject, key)) visit(subject[key], childRule, `${pointer}/${key}`);
      }
    }
  }
  visit(value, schema, '$');
  return errors;
}

function validateDecisionMap(decisionMap, context) {
  const errors = [];
  const expected = {
    adopted: context.reconciled.final_atoms.map((atom) => atom.id).sort(),
    control: context.reconciled.control_atoms.map((atom) => atom.id).sort(),
    head: context.reconciled.head_candidate_atoms.map((atom) => atom.id).sort(),
  };
  if (decisionMap.counts?.total !== 321 || decisionMap.decisions?.length !== 321) errors.push('decision map is not 321 rows');
  const ids = decisionMap.decisions.map((row) => row.id);
  if (sortedUnique(ids).length !== ids.length) errors.push('decision map contains duplicate ids');
  for (const lane of Object.keys(expected)) {
    const observed = [...(decisionMap.lanes?.[lane] || [])].sort();
    if (!sameArray(observed, expected[lane])) errors.push(`${lane} lane does not exactly match reconciled census`);
  }
  const byId = new Map(decisionMap.decisions.map((row) => [row.id, row]));
  for (const atom of context.reconciled.final_atoms) {
    const observed = byId.get(atom.id);
    const policy = adoptedPolicy(atom);
    if (!observed || observed.lane !== 'adopted' || observed.decision !== policy.decision || observed.reason !== policy.reason || observed.work_package !== policy.work_package || observed.current_state !== policy.current_state) {
      errors.push(`${atom.id}: adopted decision policy drift`);
    }
  }
  for (const atom of context.reconciled.control_atoms) {
    const observed = byId.get(atom.id);
    const policy = controlPolicy(atom);
    if (!observed || observed.lane !== 'control' || observed.decision !== policy.decision || observed.reason !== policy.reason || observed.work_package !== policy.work_package) {
      errors.push(`${atom.id}: control decision policy drift`);
    }
  }
  for (const atom of context.reconciled.head_candidate_atoms) {
    const observed = byId.get(atom.id);
    const canonical = context.headDecisionById.get(atom.id);
    if (!observed || observed.lane !== 'head' || observed.decision !== canonical?.independent_decision || observed.reason !== canonical?.reason || observed.work_package !== wpShort(canonical?.proposed_work_package)) {
      errors.push(`${atom.id}: HEAD canonical decision drift`);
    }
  }
  return errors;
}

function validateManifest(manifest, decisionMap, context) {
  const schemaErrors = validateSchema(manifest, load(paths.schema));
  const errors = [...schemaErrors];
  const expectedIds = context.reconciled.final_atoms.map((atom) => atom.id).sort();
  const ids = (manifest.atoms || []).map((atom) => atom.id);
  if (manifest.coverage?.denominator !== 197 || ids.length !== 197) errors.push('manifest denominator is not N=197');
  if (!sameArray(ids, expectedIds)) errors.push('manifest atom ids are not the exact normalized adopted set');
  for (const key of ['source_ids', 'live_ids', 'independent_ids']) {
    if (!sameArray(manifest.coverage?.[key] || [], expectedIds)) errors.push(`coverage.${key} is not the normalized final id set`);
  }
  if ((manifest.coverage?.unmatched || []).length || (manifest.coverage?.collisions || []).length || (manifest.coverage?.composites || []).length) {
    errors.push('coverage has unmatched, collision, or composite residue');
  }
  const decisionById = new Map(decisionMap.decisions.map((row) => [row.id, row]));
  const sourceAtomById = new Map(context.reconciled.final_atoms.map((atom) => [atom.id, atom]));
  for (const atom of manifest.atoms || []) {
    const sourceAtom = sourceAtomById.get(atom.id);
    const decision = decisionById.get(atom.id);
    if (!sourceAtom || !decision) { errors.push(`${atom.id}: missing source or decision`); continue; }
    const expectedOrigin = resolveOrigin(sourceAtom, context);
    if (stable(atom.provenance) !== stable([expectedOrigin])) errors.push(`${atom.id}: provenance is not exact origin-ledger identity`);
    if (atom.decision !== decision.decision || atom.decision_reason !== decision.reason || atom.work_package !== decision.work_package || atom.current_state !== decision.current_state) {
      errors.push(`${atom.id}: manifest decision fields drift from decision-map`);
    }
    if (!sameArray(atom.live_targets, sortedUnique(targetsFor(sourceAtom)))) errors.push(`${atom.id}: live target mapping drift`);
  }
  return errors;
}

function emit(status, exitCode, details = {}) {
  process.stdout.write(`${JSON.stringify({ command, status, exit: exitCode, ...details })}\n`);
  process.exitCode = exitCode;
}

function runBuild() {
  try {
    const context = buildContext();
    const decisionMap = buildDecisionMap(context);
    const manifest = buildManifest(context, decisionMap);
    const decisionErrors = validateDecisionMap(decisionMap, context);
    const manifestErrors = validateManifest(manifest, decisionMap, context);
    assert(decisionErrors.length === 0, `decision-map validation failed: ${decisionErrors.join('; ')}`);
    assert(manifestErrors.length === 0, `manifest validation failed: ${manifestErrors.join('; ')}`);
    writeFileSync(paths.decisionsOut, `${JSON.stringify(decisionMap, null, 2)}\n`);
    writeFileSync(paths.manifestOut, `${JSON.stringify(manifest, null, 2)}\n`);
    emit('PASS', 0, {
      decisions: decisionMap.decisions.length,
      lanes: decisionMap.counts,
      manifest_atoms: manifest.atoms.length,
      decisions_sha256: fileSha256(paths.decisionsOut),
      manifest_sha256: fileSha256(paths.manifestOut),
    });
  } catch (error) {
    emit('FAIL', 50, { reason: error.stack || error.message });
  }
}

function runValidate() {
  try {
    const context = buildContext();
    const decisionPath = resolve(String(args.decisions || paths.decisionsOut));
    const manifestPath = resolve(String(args.manifest || paths.manifestOut));
    const decisionMap = load(decisionPath);
    const manifest = load(manifestPath);
    const errors = [...validateDecisionMap(decisionMap, context), ...validateManifest(manifest, decisionMap, context)];
    if (errors.length) return emit('FAIL', 51, { error_count: errors.length, errors: errors.slice(0, 100) });
    return emit('PASS', 0, {
      decisions: decisionMap.decisions.length,
      manifest_atoms: manifest.atoms.length,
      decisions_sha256: fileSha256(decisionPath),
      manifest_sha256: fileSha256(manifestPath),
    });
  } catch (error) {
    return emit('FAIL', 51, { reason: error.stack || error.message });
  }
}

function runMakeNegative() {
  try {
    assert(args.out, 'make-negative requires --out');
    const manifestPath = resolve(String(args.manifest || paths.manifestOut));
    const manifest = load(manifestPath);
    assert(manifest.atoms?.[0]?.provenance?.[0], 'manifest has no provenance to mutate');
    delete manifest.atoms[0].provenance[0].sha256;
    const out = resolve(String(args.out));
    writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
    emit('PASS', 0, { out, mutation: 'delete atoms[0].provenance[0].sha256', sha256: fileSha256(out) });
  } catch (error) {
    emit('FAIL', 52, { reason: error.stack || error.message });
  }
}

switch (command) {
  case 'build': runBuild(); break;
  case 'validate': runValidate(); break;
  case 'make-negative': runMakeNegative(); break;
  default: emit('FAIL', 49, { reason: `unknown command: ${command}` });
}
