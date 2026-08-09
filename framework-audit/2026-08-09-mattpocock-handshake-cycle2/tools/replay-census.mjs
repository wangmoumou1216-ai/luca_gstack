#!/usr/bin/env node

/*
 * Independent Cycle 2 census replay.
 *
 * This file intentionally does not import tools/audit.mjs.  It freezes and
 * checks the four producer artifacts, preserves the independent pre-join
 * hash, and reconciles three different scopes without pretending that their
 * sets are equal:
 *
 *   adopted source lineage -> capability denominator
 *   local runtime invariants -> blocking control ledger
 *   unadopted upstream HEAD -> candidate ledger only
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_INPUT_SHA256 = Object.freeze({
  source: '52803f08d60a54b03ad28bcca06d106b430de0d99dea9339ef3ee8c56eba3a0c',
  live: '4c3c11cc953708c3791c8b2d1c629f0c63fd51ba165a8eee33b8bb9ff42adde5',
  independent: 'e9dcec5f7eb6959e823993189729cd5b26b6c24a4d134605fb6f0c73eee334e4',
  head: 'bd8a972587c2264317ff8ccef2b48ac004ca19548a81187f68aa042fa474ac25',
});

const EXPECTED_COUNTS = Object.freeze({ source: 196, live: 109, independent: 135, head: 73 });
const EXPECTED_PREJOIN_SHA256 = 'd460284fb0c03afb53634dbf8c64229b49eae55c87a061bbbcb9761293ae5da4';
const SOURCE_COMPOSITE_ID = 'MATT-a0566b42dcc8';
const HEAD_COMPOSITE_ID = 'MATT-fa7e31d36e28';

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    out[key] = next && !next.startsWith('--') ? argv[++index] : true;
  }
  return out;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function loadFrozen(path, label, expectedHash) {
  const absolute = resolve(String(path));
  const bytes = readFileSync(absolute);
  const actual = sha256(bytes);
  if (actual !== expectedHash) {
    throw new Error(`${label} input SHA mismatch: expected ${expectedHash}, got ${actual}`);
  }
  return { path: absolute, sha256: actual, value: JSON.parse(bytes.toString('utf8')) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactSet(actualValues, expectedValues, label) {
  const actual = [...new Set(actualValues)].sort();
  const expected = [...new Set(expectedValues)].sort();
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));
  assert(actualValues.length === actual.length, `${label} contains duplicate identifiers`);
  assert(missing.length === 0 && extra.length === 0,
    `${label} is not exact; missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}`);
}

function validateSource(source) {
  const atoms = source.atoms;
  assert(Array.isArray(atoms) && atoms.length === EXPECTED_COUNTS.source,
    `source count must be ${EXPECTED_COUNTS.source}`);
  const seen = new Set();
  for (const atom of atoms) {
    const digest = sha256(atom.id_input);
    assert(atom.id_sha256 === digest, `source full hash mismatch: ${atom.id}`);
    assert(atom.id === `MATT-${digest.slice(0, 12)}`, `source short hash mismatch: ${atom.id}`);
    assert(!seen.has(atom.id), `source ID collision: ${atom.id}`);
    seen.add(atom.id);
    assert(atom.id_input === `${atom.origin_commit}|${atom.path}|${atom.source_range}|${atom.behavior_slug}`,
      `source id_input provenance mismatch: ${atom.id}`);
    assert(/^L\d+-L\d+$/.test(atom.source_range), `source range malformed: ${atom.id}`);
    for (const field of ['trigger', 'observable_effect', 'independent_degradation', 'verification']) {
      assert(typeof atom[field] === 'string' && atom[field].trim(), `source ${field} missing: ${atom.id}`);
    }
  }
  return atoms;
}

function validateLive(live) {
  const atoms = live.atoms;
  assert(Array.isArray(atoms) && atoms.length === EXPECTED_COUNTS.live,
    `live count must be ${EXPECTED_COUNTS.live}`);
  assert(live.atom_count === atoms.length, 'live declared count differs from rows');
  exactSet(atoms.map((atom) => atom.id),
    Array.from({ length: EXPECTED_COUNTS.live }, (_, index) => `LIVE-${String(index + 1).padStart(3, '0')}`),
    'live IDs');
  return atoms;
}

function validateIndependent(independent) {
  const frozen = independent.prejoin?.frozen_atoms;
  assert(Array.isArray(frozen) && frozen.length === EXPECTED_COUNTS.independent,
    `independent prejoin count must be ${EXPECTED_COUNTS.independent}`);
  exactSet(frozen.map((atom) => atom.id),
    Array.from({ length: EXPECTED_COUNTS.independent }, (_, index) => `IC-${String(index + 1).padStart(3, '0')}`),
    'independent IDs');
  const digest = sha256(JSON.stringify(frozen));
  assert(independent.prejoin.sha256 === EXPECTED_PREJOIN_SHA256,
    'independent embedded prejoin SHA differs from the frozen contract');
  assert(digest === EXPECTED_PREJOIN_SHA256,
    `independent prejoin replay mismatch: expected ${EXPECTED_PREJOIN_SHA256}, got ${digest}`);
  assert(independent.prejoin.atom_count === frozen.length, 'independent declared prejoin count differs');
  return frozen;
}

function validateHead(head) {
  const atoms = head.atoms;
  assert(Array.isArray(atoms) && atoms.length === EXPECTED_COUNTS.head,
    `HEAD count must be ${EXPECTED_COUNTS.head}`);
  const seen = new Set();
  for (const atom of atoms) {
    const source = atom.source;
    assert(source && head.blobs?.[source.blob], `HEAD blob alias missing: ${atom.id}`);
    const blob = head.blobs[source.blob];
    assert(blob.path === source.path, `HEAD blob path mismatch: ${atom.id}`);
    const idInput = `${source.commit}|${source.path}|${source.range}|${atom.slug}`;
    const digest = sha256(idInput);
    assert(atom.id === `MATT-${digest.slice(0, 12)}`, `HEAD content ID mismatch: ${atom.id}`);
    assert(!seen.has(atom.id), `HEAD ID collision: ${atom.id}`);
    seen.add(atom.id);
    assert(source.commit === head.source.head_commit, `HEAD commit mismatch: ${atom.id}`);
    assert(/^L\d+-L\d+$/.test(source.range), `HEAD range malformed: ${atom.id}`);
    assert(/^[0-9a-f]{40}$/.test(blob.oid), `HEAD blob OID malformed: ${source.blob}`);
    assert(/^[0-9a-f]{64}$/.test(blob.sha256), `HEAD blob SHA malformed: ${source.blob}`);
  }
  return atoms;
}

function sourceSplit(parent, slug, trigger, effect, degradation, verification) {
  const idInput = `${parent.origin_commit}|${parent.path}|${parent.source_range}|${slug}`;
  const digest = sha256(idInput);
  return {
    ...parent,
    id: `MATT-${digest.slice(0, 12)}`,
    id_sha256: digest,
    id_input: idInput,
    behavior_slug: slug,
    trigger,
    observable_effect: effect,
    independent_degradation: degradation,
    verification,
    source_parent_ids: [parent.id],
    normalization: 'SPLIT_COMPOSITE_SOURCE_ROW',
  };
}

function normalizeCapabilities(sourceAtoms) {
  const out = [];
  const coverage = [];
  for (const atom of sourceAtoms) {
    if (atom.id !== SOURCE_COMPOSITE_ID) {
      out.push({ ...atom, source_parent_ids: [atom.id], normalization: 'IDENTITY' });
      coverage.push({ source_id: atom.id, final_ids: [atom.id], disposition: 'IDENTITY' });
      continue;
    }
    const split = [
      sourceSplit(
        atom,
        'reject-tautological-assertion',
        'A test derives its expected value with the production algorithm.',
        'The assertion is rejected as tautological.',
        'The coupled assertion is accepted.',
        'Offer a reduce-derived expected value and require explicit rejection.',
      ),
      sourceSplit(
        atom,
        'replace-with-independent-expected-value',
        'A tautological expected value has been rejected.',
        'The test uses an independently known expected value.',
        'The test is removed or receives another coupled oracle.',
        'Require a literal fixture or specification-derived value before green.',
      ),
    ];
    out.push(...split);
    coverage.push({ source_id: atom.id, final_ids: split.map((row) => row.id), disposition: 'SPLIT_1_TO_2' });
  }
  exactSet(coverage.map((row) => row.source_id), sourceAtoms.map((atom) => atom.id), 'source coverage');
  assert(new Set(out.map((atom) => atom.id)).size === out.length, 'capability atom ID collision');
  return { atoms: out, coverage };
}

function headSplit(parent, slug, trigger, effect, degradation, verification) {
  const source = parent.source;
  const idInput = `${source.commit}|${source.path}|${source.range}|${slug}`;
  const digest = sha256(idInput);
  return {
    ...parent,
    id: `MATT-${digest.slice(0, 12)}`,
    slug,
    trigger,
    observable_effect: effect,
    independent_degradation: degradation,
    verification,
    source_parent_ids: [parent.id],
    id_input: idInput,
    id_sha256: digest,
    normalization: 'SPLIT_COMPOSITE_CANDIDATE_ROW',
  };
}

function normalizeHead(headAtoms) {
  const out = [];
  const coverage = [];
  for (const atom of headAtoms) {
    if (atom.id !== HEAD_COMPOSITE_ID) {
      out.push({ ...atom, source_parent_ids: [atom.id], normalization: 'IDENTITY' });
      coverage.push({ head_id: atom.id, final_ids: [atom.id], disposition: 'IDENTITY' });
      continue;
    }
    const split = [
      headSplit(
        atom,
        'environment-is-runtime-ssot',
        'An agent document is about to restate a cheaply inspectable runtime fact.',
        'The runtime environment remains authoritative.',
        'Static prose becomes the authority for a cheaply inspectable fact.',
        'Change the runtime fact and require the document consumer to follow inspection.',
      ),
      headSplit(
        atom,
        'cache-only-costly-to-reacquire-facts',
        'An agent document considers caching a runtime fact.',
        'The fact is persisted only when reacquisition is costly.',
        'A cheap fact is duplicated into prose.',
        'Offer a cheaply inspectable fact and require omission from the cache.',
      ),
    ];
    out.push(...split);
    coverage.push({ head_id: atom.id, final_ids: split.map((row) => row.id), disposition: 'SPLIT_1_TO_2_BEFORE_ADOPTION' });
  }
  exactSet(coverage.map((row) => row.head_id), headAtoms.map((atom) => atom.id), 'HEAD coverage');
  assert(new Set(out.map((atom) => atom.id)).size === out.length, 'HEAD candidate atom ID collision');
  return { atoms: out, coverage };
}

function control(definition) {
  const derivedLive = [...new Set(definition.live || [])].sort();
  const derivedIndependent = [...new Set(definition.independent || [])].sort();
  const idInput = [
    'cycle2-control-v1',
    definition.slug,
    derivedLive.join(','),
    derivedIndependent.join(','),
    definition.trigger,
    definition.effect,
    definition.degradation,
    definition.verification,
  ].join('|');
  const digest = sha256(idInput);
  return {
    id: `CTRL-${digest.slice(0, 12)}`,
    id_sha256: digest,
    id_input: idInput,
    kind: 'gating-control',
    slug: definition.slug,
    trigger: definition.trigger,
    observable_effect: definition.effect,
    independent_degradation: definition.degradation,
    verification: definition.verification,
    derived_from_live_ids: derivedLive,
    derived_from_independent_ids: derivedIndependent,
    blocking: true,
  };
}

const CONTROL_DEFINITIONS = [
  { slug: 'route-tdd-claude', live: ['LIVE-001', 'LIVE-092'], independent: ['IC-114'], trigger: 'Claude routes test-driven implementation.', effect: 'The Claude catalog resolves the pinned tdd target.', degradation: 'The route resolves no target.', verification: 'Probe the Claude route then resolve the returned target.' },
  { slug: 'route-tdd-codex', live: ['LIVE-001', 'LIVE-092'], independent: ['IC-114'], trigger: 'Codex routes test-driven implementation.', effect: 'The Codex catalog resolves the pinned tdd target.', degradation: 'The route resolves no target.', verification: 'Probe the Codex route then resolve the returned target.' },
  { slug: 'route-debug-claude', live: ['LIVE-054', 'LIVE-092'], trigger: 'Claude routes a debugging request.', effect: 'The Claude catalog resolves systematic-debugging.', degradation: 'The route resolves no target.', verification: 'Probe the Claude route then resolve the returned target.' },
  { slug: 'route-debug-codex', live: ['LIVE-054', 'LIVE-092'], trigger: 'Codex routes a debugging request.', effect: 'The Codex catalog resolves systematic-debugging.', degradation: 'The route resolves no target.', verification: 'Probe the Codex route then resolve the returned target.' },
  { slug: 'route-codebase-design-claude', live: ['LIVE-011', 'LIVE-092'], trigger: 'Claude routes a seam-design request.', effect: 'The Claude catalog resolves codebase-design.', degradation: 'The route resolves no target.', verification: 'Probe the Claude route then resolve the returned target.' },
  { slug: 'route-codebase-design-codex', live: ['LIVE-011', 'LIVE-092'], trigger: 'Codex routes a seam-design request.', effect: 'The Codex catalog resolves codebase-design.', degradation: 'The route resolves no target.', verification: 'Probe the Codex route then resolve the returned target.' },
  { slug: 'route-resolver-claude', live: ['LIVE-023', 'LIVE-092'], trigger: 'Claude routes a merge-conflict request.', effect: 'The Claude catalog resolves resolving-merge-conflicts.', degradation: 'The route resolves no target.', verification: 'Probe the Claude route then resolve the returned target.' },
  { slug: 'route-resolver-codex', live: ['LIVE-023', 'LIVE-092'], trigger: 'Codex routes a merge-conflict request.', effect: 'The Codex catalog resolves resolving-merge-conflicts.', degradation: 'The route resolves no target.', verification: 'Probe the Codex route then resolve the returned target.' },
  { slug: 'tdd-shared-target-identity', live: ['LIVE-001', 'LIVE-092'], independent: ['IC-114'], trigger: 'Both harness catalogs resolve tdd.', effect: 'Both resolutions identify one pinned target.', degradation: 'The harnesses resolve divergent bodies.', verification: 'Resolve both catalog entries then compare canonical target identities.' },
  { slug: 'nested-code-recon-codebase-design-claude', live: ['LIVE-093'], trigger: 'Claude executes the code-recon deletion branch.', effect: 'Its codebase-design reference resolves in Claude.', degradation: 'The child reference is dangling.', verification: 'Traverse the Claude parent reference then resolve the child.' },
  { slug: 'nested-code-recon-codebase-design-codex', live: ['LIVE-093'], trigger: 'Codex executes the code-recon deletion branch.', effect: 'Its codebase-design reference resolves in Codex.', degradation: 'The child reference is dangling.', verification: 'Traverse the Codex parent reference then resolve the child.' },
  { slug: 'teach-claude-personal-discovery', live: ['LIVE-030'], trigger: 'A personal teaching request reaches Claude.', effect: 'Claude resolves the pinned personal teach target.', degradation: 'The personal target is undiscoverable.', verification: 'Resolve teach from the Claude personal catalog.' },
  { slug: 'teach-codex-scope-exclusion', live: ['LIVE-030'], trigger: 'Codex evaluates project routing for teach.', effect: 'The router makes no Codex availability promise.', degradation: 'The router advertises an absent target.', verification: 'Probe teach routing in Codex and require an explicit scope exclusion.' },
  { slug: 'authoring-doctrine-claude-pointer', live: ['LIVE-048'], independent: ['IC-118'], trigger: 'Claude authors a skill.', effect: 'Claude loads the canonical authoring doctrine.', degradation: 'The doctrine is inert in Claude.', verification: 'Trace the Claude authoring entry to the canonical file.' },
  { slug: 'authoring-doctrine-codex-pointer', live: ['LIVE-048'], independent: ['IC-119'], trigger: 'Codex authors a skill.', effect: 'Codex loads the canonical authoring doctrine.', degradation: 'The doctrine is inert in Codex.', verification: 'Trace the Codex authoring entry to the canonical file.' },
  { slug: 'authoring-doctrine-fusion-pointer', live: ['LIVE-048'], independent: ['IC-120'], trigger: 'FUSION ports skill prose.', effect: 'FUSION loads the canonical authoring doctrine.', degradation: 'The port bypasses the doctrine.', verification: 'Trace the FUSION authoring step to the canonical file.' },
  { slug: 'authoring-doctrine-parity-check', live: ['LIVE-048'], independent: ['IC-121'], trigger: 'Authoring wiring verification runs.', effect: 'The verifier checks every declared doctrine consumer.', degradation: 'A consumer pointer can drift silently.', verification: 'Break one consumer pointer and require a blocking failure.' },
  { slug: 'brainstorm-native-perspective-count', live: ['LIVE-077'], trigger: 'Brainstorm requests independent perspectives.', effect: 'Three child runs have distinct native identities.', degradation: 'Fewer than three native child identities exist.', verification: 'Inspect native spawn edges for three distinct children.' },
  { slug: 'brainstorm-oracle-independence', live: ['LIVE-077'], trigger: 'Brainstorm enters adversarial synthesis.', effect: 'A separate native Oracle run returns the challenge.', degradation: 'The main thread impersonates the Oracle.', verification: 'Require a native Oracle spawn edge in the receipt.' },
  { slug: 'patch-header-only-target', live: ['LIVE-094'], trigger: 'Codex submits apply_patch.', effect: 'The guard classifies targets from validated headers.', degradation: 'Body prose influences target classification.', verification: 'Place a protected token only in added prose and assert unchanged classification.' },
  { slug: 'patch-body-byte-preservation', live: ['LIVE-095'], trigger: 'A validated patch crosses project-scope enforcement.', effect: 'Every patch body byte remains unchanged.', degradation: 'Body prose is rewritten.', verification: 'Compare input and forwarded body bytes exactly.' },
  { slug: 'patch-malformed-header-denial', live: ['LIVE-096'], trigger: 'An apply_patch header is malformed.', effect: 'The guard denies the patch.', degradation: 'The malformed patch reaches an editor.', verification: 'Submit malformed headers and require a denial receipt.' },
  { slug: 'project-name-canonical-validation', live: ['LIVE-097'], trigger: 'A project switch receives a candidate name.', effect: 'The canonical validator accepts the identity before mutation.', degradation: 'An invalid identity reaches mutation.', verification: 'Run invalid-name fixtures and require pre-mutation rejection.' },
  { slug: 'pin-after-switch-success', live: ['LIVE-098'], trigger: 'A project switch succeeds.', effect: 'The session pin commits the validated identity.', degradation: 'The pin changes before success.', verification: 'Inspect the pin before success then after success.' },
  { slug: 'compound-switch-transaction-boundary', live: ['LIVE-099'], trigger: 'A command combines switch with scoped work.', effect: 'The guard rejects the compound transaction.', degradation: 'Scoped work uses an uncommitted identity.', verification: 'Run the compound-switch fixture and require rejection.' },
  { slug: 'failed-switch-preserves-pin', live: ['LIVE-100'], trigger: 'A project switch fails.', effect: 'The prior session pin remains byte-identical.', degradation: 'The failed candidate replaces the prior pin.', verification: 'Hash the pin before and after a failed switch.' },
  { slug: 'no-pin-native-read-path', live: ['LIVE-101'], trigger: 'A no-pin audit requests protected context.', effect: 'The harness exposes a guard-compliant read path.', degradation: 'Startup context becomes unreadable.', verification: 'Read protected startup context without a session pin.' },
  { slug: 'codex-plan-role-dispatch', live: ['LIVE-102'], trigger: 'Codex requests plan-agent.', effect: 'The runtime dispatches the registered plan role.', degradation: 'No native role can be dispatched.', verification: 'Spawn plan-agent then inspect the native role identity.' },
  { slug: 'codex-work-role-dispatch', live: ['LIVE-103'], trigger: 'Codex requests work-agent.', effect: 'The runtime dispatches the registered work role.', degradation: 'No native role can be dispatched.', verification: 'Spawn work-agent then inspect the native role identity.' },
  { slug: 'codex-oracle-role-dispatch', live: ['LIVE-104'], trigger: 'Codex requests Oracle.', effect: 'The runtime dispatches the registered Oracle role.', degradation: 'No native role can be dispatched.', verification: 'Spawn Oracle then inspect the native role identity.' },
  { slug: 'native-delegation-receipt', live: ['LIVE-105'], trigger: 'A delegated native run completes.', effect: 'The issuer emits one schema-valid signed receipt.', degradation: 'Role identity is supported only by prose.', verification: 'Verify signature linkage against the native spawn event.' },
  { slug: 'unsafe-route-quarantine', live: ['LIVE-106'], trigger: 'An imported target lacks an approved safe adaptation.', effect: 'Its route enters NEEDS_ADAPTATION.', degradation: 'The unsafe target remains active.', verification: 'Probe the unsafe route and require quarantine status.' },
  { slug: 'activation-journal-state-machine', live: ['LIVE-107'], trigger: 'Activation preparation begins.', effect: 'A durable journal records each legal state transition.', degradation: 'Activation state exists only in process memory.', verification: 'Kill the supervisor after each transition then replay the journal.' },
  { slug: 'activation-cas-precondition', live: ['LIVE-107'], trigger: 'Activation attempts a mutable pointer update.', effect: 'The update requires the frozen expected value.', degradation: 'Concurrent drift is overwritten.', verification: 'Inject a CAS mismatch and require a blocked transaction.' },
  { slug: 'activation-atomic-publish', live: ['LIVE-107'], trigger: 'Prepared global targets become live.', effect: 'One atomic swap exposes the prepared directory.', degradation: 'Consumers observe a partially published tree.', verification: 'Sample the target during publish and require only old or new identity.' },
  { slug: 'activation-reverse-dag-rollback', live: ['LIVE-107'], trigger: 'A committed activation step fails verification.', effect: 'Compensation replays the exact reverse dependency order.', degradation: 'Rollback relies on destructive repository reset.', verification: 'Inject partial failure and verify every reverse edge.' },
  { slug: 'verifier-environment-hermeticity', live: ['LIVE-108'], trigger: 'Dual-harness verification launches a child probe.', effect: 'The child receives a declared harness environment.', degradation: 'Ambient variables change the result.', verification: 'Repeat under hostile ambient variables and compare receipts.' },
  { slug: 'verifier-logical-role-names', live: ['LIVE-108'], trigger: 'Agent wiring verification runs.', effect: 'The verifier requires every named logical role.', degradation: 'Unrelated role files satisfy the count.', verification: 'Replace a required role with an unrelated TOML and require failure.' },
  { slug: 'debug-environment-output-redaction', live: ['LIVE-109'], trigger: 'A debug probe prints environment data.', effect: 'Secret-bearing values are redacted before display.', degradation: 'Raw values reach terminal output.', verification: 'Inject canary environment values and scan captured output.' },
  { slug: 'debug-capture-output-redaction', live: ['LIVE-109'], trigger: 'A HITL loop captures raw error text.', effect: 'Secret-bearing values are redacted before capture.', degradation: 'Raw values enter the captured response.', verification: 'Inject canary error text and inspect the captured payload.' },
  { slug: 'debug-artifact-redaction', live: ['LIVE-109'], trigger: 'Debug evidence is persisted.', effect: 'Secret-bearing values are redacted before persistence.', degradation: 'Raw values enter an artifact.', verification: 'Persist a canary-bearing fixture and scan the artifact.' },
  { slug: 'proof-it-bites-trigger-specificity', independent: ['IC-066'], trigger: 'A deliberate violation exercises a guard.', effect: 'Only the intended trigger path fails.', degradation: 'The fixture demands unrelated internal behavior.', verification: 'Run a sibling non-trigger case and require success.' },
  { slug: 'tdd-installed-footprint', independent: ['IC-113'], trigger: 'The installed tdd target is audited.', effect: 'Its file set matches the approved footprint.', degradation: 'Stale files silently remain installed.', verification: 'Compare the canonical file list with the approved receipt.' },
  { slug: 'tdd-upstream-pin', independent: ['IC-113'], trigger: 'The installed tdd target is audited.', effect: 'Its content matches the approved upstream pin.', degradation: 'The body drifts from the approved object.', verification: 'Hash installed files and compare with the pin ledger.' },
  { slug: 'teach-dedicated-write-root', independent: ['IC-117'], trigger: 'Teach writes a learning artifact.', effect: 'The write lands under the approved teaching root.', degradation: 'Teach mutates the active product project.', verification: 'Attempt an out-of-root teaching write and require denial.' },
  { slug: 'debug-port-origin-lineage', independent: ['IC-122'], trigger: 'The debugger port is audited.', effect: 'The receipt identifies the matt source lineage.', degradation: 'Local changes are attributed to another upstream.', verification: 'Trace every port row to its origin commit.' },
  { slug: 'debug-upstream-drift-watch', independent: ['IC-123'], trigger: 'Evolution scans debugging upstreams.', effect: 'The scan includes the matt port source.', degradation: 'Relevant matt changes remain invisible.', verification: 'Inject a matt-source change and require a reported delta.' },
  { slug: 'registration-check-blocking', independent: ['IC-124'], trigger: 'Standard framework verification runs.', effect: 'Registration drift causes a blocking failure.', degradation: 'The check emits only a warning.', verification: 'Break one registration edge and require a nonzero exit.' },
  { slug: 'plan-continuity-consumer', independent: ['IC-127'], trigger: 'Plan continuity is requested.', effect: 'The plan reaches the canonical PROGRESS contract.', degradation: 'The continuity appendix is omitted.', verification: 'Trace a resumed plan to the PROGRESS consumer.' },
  { slug: 'agent-tier-portability', independent: ['IC-129'], trigger: 'A plan selects a reasoning tier.', effect: 'Dispatch resolves the tier through the harness mapping.', degradation: 'A harness-specific model alias is emitted.', verification: 'Resolve every tier in both harness mappings.' },
];

function validateControls(controls, liveOnlyIds, independentControlIds) {
  const ids = new Set();
  const slugs = new Set();
  for (const atom of controls) {
    const expectedIdInput = [
      'cycle2-control-v1',
      atom.slug,
      [...atom.derived_from_live_ids].sort().join(','),
      [...atom.derived_from_independent_ids].sort().join(','),
      atom.trigger,
      atom.observable_effect,
      atom.independent_degradation,
      atom.verification,
    ].join('|');
    assert(atom.id_input === expectedIdInput, `control id_input content mismatch: ${atom.slug}`);
    const digest = sha256(atom.id_input);
    assert(atom.id_sha256 === digest && atom.id === `CTRL-${digest.slice(0, 12)}`,
      `control content ID mismatch: ${atom.slug}`);
    assert(!ids.has(atom.id), `control ID collision: ${atom.id}`);
    assert(!slugs.has(atom.slug), `control slug collision: ${atom.slug}`);
    ids.add(atom.id);
    slugs.add(atom.slug);
    assert(atom.derived_from_live_ids.length + atom.derived_from_independent_ids.length > 0,
      `control lacks census provenance: ${atom.slug}`);
    assert(!/\b(?:and|or)\b|[;；、]/i.test(atom.observable_effect),
      `control observable effect is composite: ${atom.slug}`);
    assert(typeof atom.verification === 'string' && atom.verification.trim(),
      `control verification missing: ${atom.slug}`);
  }
  const mappedLive = controls.flatMap((atom) => atom.derived_from_live_ids);
  const mappedIndependent = controls.flatMap((atom) => atom.derived_from_independent_ids);
  for (const id of liveOnlyIds) assert(mappedLive.includes(id), `unmatched live control atom: ${id}`);
  for (const id of independentControlIds) assert(mappedIndependent.includes(id), `unmatched independent control atom: ${id}`);
}

function familyIndex(independent) {
  const source = new Map();
  const live = new Map();
  const replay = new Map();
  for (const row of independent.semantic_crosswalks) {
    for (const id of row.source_ids) assert(!source.has(id), `source crosswalk collision: ${id}`), source.set(id, row.family);
    for (const id of row.live_ids) assert(!live.has(id), `live crosswalk collision: ${id}`), live.set(id, row.family);
    for (const id of row.independent_ids) assert(!replay.has(id), `independent crosswalk collision: ${id}`), replay.set(id, row.family);
  }
  return { source, live, replay };
}

function buildResolution(sourceAtoms, liveAtoms, independent, headNormalized, controls) {
  const families = familyIndex(independent);
  exactSet([...families.source.keys()], sourceAtoms.map((atom) => atom.id), 'independent source crosswalk');

  const liveOnly = independent.gaps.live_only.atoms.map((row) => row.live_id);
  const independentLocal = independent.gaps.independent_only.atoms
    .filter((row) => row.gap_kind !== 'UNADOPTED_HEAD_CANDIDATE')
    .map((row) => row.id);
  independentLocal.push('IC-114');
  const headReplayIds = independent.gaps.scope_exclusions.unadopted_head_independent_ids;
  validateControls(controls, liveOnly, independentLocal);
  const validLiveIds = new Set(liveAtoms.map((atom) => atom.id));
  const validIndependentIds = new Set(independent.prejoin.frozen_atoms.map((atom) => atom.id));
  for (const atom of controls) {
    for (const id of atom.derived_from_live_ids) {
      assert(validLiveIds.has(id), `control references unknown live row: ${atom.id}:${id}`);
    }
    for (const id of atom.derived_from_independent_ids) {
      assert(validIndependentIds.has(id), `control references unknown independent row: ${atom.id}:${id}`);
    }
  }

  const controlsByLive = new Map();
  const controlsByIndependent = new Map();
  for (const atom of controls) {
    for (const id of atom.derived_from_live_ids) {
      if (!controlsByLive.has(id)) controlsByLive.set(id, []);
      controlsByLive.get(id).push(atom.id);
    }
    for (const id of atom.derived_from_independent_ids) {
      if (!controlsByIndependent.has(id)) controlsByIndependent.set(id, []);
      controlsByIndependent.get(id).push(atom.id);
    }
  }

  const liveResolution = liveAtoms.map((atom) => {
    if (liveOnly.includes(atom.id)) {
      return { id: atom.id, scope: 'CONTROL_EVIDENCE', final_ids: controlsByLive.get(atom.id) || [] };
    }
    const family = families.live.get(atom.id);
    assert(family, `live row has no resolution: ${atom.id}`);
    return { id: atom.id, scope: 'CAPABILITY_EVIDENCE_PARTIAL', family };
  });

  const headMap = {
    'IC-130': ['MATT-f785c73e1ec8'],
    'IC-131': ['MATT-29d6533391d8'],
    'IC-132': ['MATT-3fab1efa17e6'],
    'IC-133': ['MATT-1cfdccc521e3'],
    'IC-134': ['MATT-e900d56ff86c'],
    'IC-135': headNormalized.coverage.find((row) => row.head_id === HEAD_COMPOSITE_ID).final_ids,
  };
  const independentAtoms = independent.prejoin.frozen_atoms;
  const independentResolution = independentAtoms.map((atom) => {
    if (headReplayIds.includes(atom.id)) {
      const finalIds = headMap[atom.id];
      assert(finalIds?.length, `HEAD replay row lacks exact candidate mapping: ${atom.id}`);
      return { id: atom.id, scope: 'HEAD_CANDIDATE_EVIDENCE', final_ids: finalIds };
    }
    if (controlsByIndependent.has(atom.id)) {
      return { id: atom.id, scope: 'CONTROL_EVIDENCE', final_ids: controlsByIndependent.get(atom.id) };
    }
    const family = families.replay.get(atom.id);
    assert(family, `independent row has no resolution: ${atom.id}`);
    return { id: atom.id, scope: 'CAPABILITY_EVIDENCE_PARTIAL', family };
  });

  exactSet(liveResolution.map((row) => row.id), liveAtoms.map((atom) => atom.id), 'live resolution');
  exactSet(independentResolution.map((row) => row.id), independentAtoms.map((atom) => atom.id), 'independent resolution');

  const gapAtoms = independent.gaps.source_only_no_separate_atom.groups.flatMap((group) =>
    group.atoms.map((atom) => ({
      source_id: atom.source_id,
      behavior_slug: atom.behavior_slug,
      family: group.family,
      disposition: 'RETAINED_BY_SOURCE_FLOOR',
      explanation: 'Producer replay under-enumeration does not delete an adopted source capability.',
    })));
  assert(gapAtoms.length === independent.gaps.source_only_no_separate_atom.count,
    'source-gap detail count differs from declaration');
  exactSet(gapAtoms.map((row) => row.source_id),
    independent.gaps.source_only_no_separate_atom.groups.flatMap((group) => group.atoms.map((atom) => atom.source_id)),
    'source gap resolution');

  const compositeResolution = independent.composite_findings.map((finding) => {
    const id = finding.ids[0];
    if (finding.inventory === 'source') {
      assert(id === SOURCE_COMPOSITE_ID, `unexpected source composite: ${id}`);
      return {
        inventory: 'source',
        ids: finding.ids,
        disposition: 'SPLIT_IN_CAPABILITY_DENOMINATOR',
        final_ids: [],
        required_split: finding.required_split,
      };
    }
    if (finding.inventory === 'live' && controlsByLive.has(id)) {
      return {
        inventory: 'live',
        ids: finding.ids,
        disposition: 'SPLIT_IN_CONTROL_LEDGER',
        final_ids: controlsByLive.get(id),
        required_split: finding.required_split,
      };
    }
    if (finding.inventory === 'live') {
      const family = families.live.get(id);
      assert(family, `live composite has no family: ${id}`);
      return {
        inventory: 'live',
        ids: finding.ids,
        disposition: 'EVIDENCE_ONLY_SUPERSEDED_BY_SOURCE_ATOMS',
        family,
        required_split: finding.required_split,
      };
    }
    if (finding.inventory === 'independent' && id === 'IC-135') {
      return {
        inventory: 'independent',
        ids: finding.ids,
        disposition: 'SPLIT_IN_HEAD_CANDIDATE_LEDGER',
        final_ids: headMap['IC-135'],
        required_split: finding.required_split,
      };
    }
    if (finding.inventory === 'independent') {
      const resolution = independentResolution.find((row) => row.id === id);
      assert(resolution, `independent composite has no resolution: ${id}`);
      return {
        inventory: 'independent',
        ids: finding.ids,
        disposition: resolution.scope === 'CONTROL_EVIDENCE'
          ? 'SPLIT_OR_REPLACED_IN_CONTROL_LEDGER'
          : 'EVIDENCE_ONLY_SUPERSEDED_BY_SOURCE_ATOMS',
        final_ids: resolution.final_ids || [],
        family: resolution.family || null,
        required_split: finding.required_split,
      };
    }
    throw new Error(`unsupported composite resolution: ${finding.inventory}:${id}`);
  });

  return {
    crosswalk_policy: 'Scope-preserving reconciliation; equality is neither expected nor asserted.',
    family_crosswalks: independent.semantic_crosswalks,
    source_gap_resolution: gapAtoms,
    live_resolution: liveResolution,
    independent_resolution: independentResolution,
    composite_resolution: compositeResolution,
    unmatched: [],
  };
}

function finalizeCompositeIds(resolution, capabilityNormalized) {
  const sourceRow = resolution.composite_resolution.find((row) => row.inventory === 'source');
  sourceRow.final_ids = capabilityNormalized.coverage.find((row) => row.source_id === SOURCE_COMPOSITE_ID).final_ids;
}

function buildOutput(inputs) {
  const sourceAtoms = validateSource(inputs.source.value);
  const liveAtoms = validateLive(inputs.live.value);
  validateIndependent(inputs.independent.value);
  const headAtoms = validateHead(inputs.head.value);

  assert(inputs.independent.value.joined_inputs.source.sha256 === inputs.source.sha256,
    'independent source freeze does not match source input');
  assert(inputs.independent.value.joined_inputs.live.sha256 === inputs.live.sha256,
    'independent live freeze does not match live input');

  const capability = normalizeCapabilities(sourceAtoms);
  const head = normalizeHead(headAtoms);
  const controls = CONTROL_DEFINITIONS.map(control);
  const crossLedgerIds = new Set(capability.atoms.map((atom) => atom.id));
  for (const atom of head.atoms) {
    assert(!crossLedgerIds.has(atom.id), `capability/HEAD candidate ID collision: ${atom.id}`);
    crossLedgerIds.add(atom.id);
  }
  for (const atom of controls) {
    assert(!crossLedgerIds.has(atom.id), `cross-ledger ID collision: ${atom.id}`);
    crossLedgerIds.add(atom.id);
  }
  const resolution = buildResolution(sourceAtoms, liveAtoms, inputs.independent.value, head, controls);
  finalizeCompositeIds(resolution, capability);

  const totalAuditUniverse = capability.atoms.length + controls.length + head.atoms.length;
  const hashes = {
    algorithm: 'sha256',
    canonicalization: 'recursive key-sorted JSON with no insignificant whitespace',
    capability_atoms_sha256: sha256(stableStringify(capability.atoms)),
    control_atoms_sha256: sha256(stableStringify(controls)),
    head_candidate_atoms_sha256: sha256(stableStringify(head.atoms)),
    source_coverage_sha256: sha256(stableStringify(capability.coverage)),
    head_coverage_sha256: sha256(stableStringify(head.coverage)),
    resolution_sha256: sha256(stableStringify(resolution)),
  };
  hashes.audit_universe_sha256 = sha256(stableStringify({
    capability_atoms_sha256: hashes.capability_atoms_sha256,
    control_atoms_sha256: hashes.control_atoms_sha256,
    head_candidate_atoms_sha256: hashes.head_candidate_atoms_sha256,
    resolution_sha256: hashes.resolution_sha256,
  }));

  return {
    schema_version: 'cycle2-reconciled-census/v1',
    status: 'PASS',
    policy: {
      adopted_denominator: 'source floor normalized only where an independently proven composite required a split',
      controls: 'separate blocking ledger; never substitutes for an adopted capability',
      head: 'separate unadopted candidate ledger; never enters the adopted denominator',
      equality_claim: false,
    },
    inputs: {
      source_sha256: inputs.source.sha256,
      live_sha256: inputs.live.sha256,
      independent_sha256: inputs.independent.sha256,
      head_sha256: inputs.head.sha256,
      independent_prejoin_sha256: EXPECTED_PREJOIN_SHA256,
    },
    counts: {
      source_rows: sourceAtoms.length,
      adopted_capability_atoms: capability.atoms.length,
      live_observation_rows: liveAtoms.length,
      independent_prejoin_rows: inputs.independent.value.prejoin.frozen_atoms.length,
      control_atoms: controls.length,
      head_source_rows: headAtoms.length,
      head_candidate_atoms: head.atoms.length,
      total_audit_universe: totalAuditUniverse,
      adopted_denominator_N: capability.atoms.length,
    },
    source_coverage: capability.coverage,
    final_atoms: capability.atoms,
    control_atoms: controls,
    head_coverage: head.coverage,
    head_candidate_atoms: head.atoms,
    coverage: {
      source_ids: sourceAtoms.map((atom) => atom.id),
      live_mapped_ids: liveAtoms.map((atom) => atom.id),
      independent_ids: inputs.independent.value.prejoin.frozen_atoms.map((atom) => atom.id),
      head_ids: headAtoms.map((atom) => atom.id),
      unmatched: [],
      collisions: [],
      composites: [],
    },
    resolution,
    hashes,
    _file_end: 'reconciled-census.json',
  };
}

function selfTest(inputs) {
  const output = buildOutput(inputs);
  assert(output.status === 'PASS', 'happy-path replay did not pass');
  assert(output.counts.source_rows === 196, 'happy-path source count changed');
  assert(output.counts.adopted_capability_atoms === 197, 'source composite was not split');
  assert(output.counts.head_source_rows === 73, 'happy-path HEAD count changed');
  assert(output.counts.head_candidate_atoms === 74, 'HEAD composite was not split');
  assert(output.counts.control_atoms === 50, 'control ledger count changed unexpectedly');

  const badSource = structuredClone(inputs.source.value);
  badSource.atoms[0].id = 'MATT-000000000000';
  let sourceBit = false;
  try { validateSource(badSource); } catch { sourceBit = true; }
  assert(sourceBit, 'negative source-ID bite did not fail');

  const badIndependent = structuredClone(inputs.independent.value);
  badIndependent.prejoin.frozen_atoms[0].effect = 'tampered';
  let prejoinBit = false;
  try { validateIndependent(badIndependent); } catch { prejoinBit = true; }
  assert(prejoinBit, 'negative prejoin-hash bite did not fail');

  const badControls = output.control_atoms.filter((atom) => atom.slug !== 'patch-malformed-header-denial');
  let controlBit = false;
  try {
    const liveOnly = inputs.independent.value.gaps.live_only.atoms.map((row) => row.live_id);
    validateControls(badControls, liveOnly, ['IC-114']);
  } catch { controlBit = true; }
  assert(controlBit, 'negative unmatched-control bite did not fail');

  const compositeControl = structuredClone(output.control_atoms);
  compositeControl[0].observable_effect = 'The route resolves and activates.';
  let compositeBit = false;
  try { validateControls(compositeControl, [], []); } catch { compositeBit = true; }
  assert(compositeBit, 'negative composite-control bite did not fail');

  return {
    status: 'PASS',
    tests: [
      'happy-path frozen replay',
      'tampered source content ID rejected',
      'tampered independent prejoin rejected',
      'unmatched control provenance rejected',
      'composite control effect rejected',
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const paths = {
    source: args.source || resolve(base, 'source-census.json'),
    live: args.live || resolve(base, 'live-census.json'),
    independent: args.independent || resolve(base, 'independent-census.json'),
    head: args.head || resolve(base, 'head-candidate-census.json'),
  };
  try {
    const inputs = {
      source: loadFrozen(paths.source, 'source', EXPECTED_INPUT_SHA256.source),
      live: loadFrozen(paths.live, 'live', EXPECTED_INPUT_SHA256.live),
      independent: loadFrozen(paths.independent, 'independent', EXPECTED_INPUT_SHA256.independent),
      head: loadFrozen(paths.head, 'head', EXPECTED_INPUT_SHA256.head),
    };
    if (args['self-test']) {
      process.stdout.write(`${JSON.stringify(selfTest(inputs))}\n`);
      return;
    }
    assert(args.out, 'usage: replay-census.mjs --out <reconciled-census.json> [--source ... --live ... --independent ... --head ...]');
    const output = buildOutput(inputs);
    writeFileSync(resolve(String(args.out)), `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({
      status: output.status,
      out: resolve(String(args.out)),
      counts: output.counts,
      audit_universe_sha256: output.hashes.audit_universe_sha256,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: 'FAIL', exit: 33, error: error.message })}\n`);
    process.exitCode = 33;
  }
}

main();
