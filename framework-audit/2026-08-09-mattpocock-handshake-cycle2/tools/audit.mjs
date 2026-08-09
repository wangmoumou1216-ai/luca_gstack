#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [,, command, ...rest] = process.argv;

function argsOf(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

const args = argsOf(rest);

function emit(status, exit, reason, details = {}) {
  process.stdout.write(`${JSON.stringify({ command, status, exit, reason, ...details })}\n`);
  process.exitCode = exit;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function load(path) {
  return JSON.parse(readFileSync(resolve(String(path)), 'utf8'));
}

function runSourceBundle() {
  if (!args.input || !args['expected-sha']) {
    return emit('FAIL', 18, 'source-bundle requires --input and --expected-sha');
  }
  try {
    const bundlePath = resolve(String(args.input));
    const bundleBytes = readFileSync(bundlePath);
    const bundleSha256 = sha256(bundleBytes);
    if (bundleSha256 !== String(args['expected-sha'])) {
      return emit('FAIL', 18, 'source bundle bytes do not match the Plan-bound SHA', {
        expected_sha256: String(args['expected-sha']),
        observed_sha256: bundleSha256,
      });
    }
    const entries = bundleBytes.toString('utf8').split(/\r?\n/u).filter(Boolean).map((line) => {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
      if (!match) throw new Error(`invalid source-bundle line: ${line}`);
      return { expected: match[1], path: match[2] };
    });
    const duplicatePaths = entries.map((entry) => entry.path)
      .filter((path, index, all) => all.indexOf(path) !== index);
    if (!entries.length || duplicatePaths.length || entries.some((entry) => resolve(entry.path) === bundlePath)) {
      return emit('FAIL', 18, 'source bundle is empty, duplicated, or self-referential', {
        duplicate_paths: [...new Set(duplicatePaths)],
      });
    }
    const drift = [];
    for (const entry of entries) {
      const observed = sha256(readFileSync(resolve(entry.path)));
      if (observed !== entry.expected) drift.push({ path: entry.path, expected: entry.expected, observed });
    }
    if (drift.length) return emit('FAIL', 18, 'one or more source-bundle members drifted', { drift });
    return emit('PASS', 0, 'Plan-bound source bundle and all listed bytes match', {
      bundle_sha256: bundleSha256,
      members: entries.length,
    });
  } catch (error) {
    return emit('FAIL', 18, 'source bundle is unreadable or malformed', { error: error.message });
  }
}

function git(repo, argv) {
  return execFileSync('git', ['-C', resolve(repo), ...argv], { encoding: 'utf8' }).trim();
}

function gitLines(repo, argv) {
  const out = git(repo, argv);
  return out ? out.split(/\r?\n/) : [];
}

function snapshotRepo(repo) {
  const head = git(repo, ['rev-parse', 'HEAD']);
  let tracking = null;
  try { tracking = git(repo, ['rev-parse', '@{u}']); } catch { /* no tracking */ }
  return {
    path: resolve(repo),
    head,
    tree: git(repo, ['rev-parse', 'HEAD^{tree}']),
    branch: git(repo, ['branch', '--show-current']),
    tracking,
    head_equals_tracking: tracking === head,
    dirty: gitLines(repo, ['status', '--short', '--untracked-files=all']),
  };
}

function runSnapshot() {
  if (!args.baseline || !args['repo-a'] || !args['repo-b'] || !args.out) {
    return emit('FAIL', 20, 'snapshot requires --baseline, --repo-a, --repo-b, and --out');
  }
  try {
    const a = snapshotRepo(args['repo-a']);
    const b = snapshotRepo(args['repo-b']);
    const mergeBase = git(args['repo-b'], ['merge-base', a.head, b.head]);
    const relation = a.head === b.head
      ? 'same_head'
      : mergeBase === a.head
        ? 'repo_a_strict_ancestor'
        : mergeBase === b.head
          ? 'repo_b_strict_ancestor'
          : 'diverged';
    const baselinePresent = {};
    for (const repo of [a, b]) {
      try {
        git(repo.path, ['cat-file', '-e', `${args.baseline}^{commit}`]);
        baselinePresent[repo.path] = true;
      } catch {
        baselinePresent[repo.path] = false;
      }
    }
    const value = {
      schema_version: 'audit-snapshot/v1',
      baseline: args.baseline,
      repositories: [a, b],
      merge_base: mergeBase,
      relation,
      baseline_present: baselinePresent,
      status: a.head === b.head ? 'PASS' : 'NEEDS_CONTEXT',
    };
    writeFileSync(resolve(String(args.out)), `${JSON.stringify(value, null, 2)}\n`);
    return emit(value.status, value.status === 'PASS' ? 0 : 20, 'snapshot captured', {
      relation, merge_base: mergeBase, out: resolve(String(args.out)),
    });
  } catch (error) {
    return emit('FAIL', 20, 'snapshot failed', { error: error.message });
  }
}

function validateSource(path) {
  const census = load(path);
  const atoms = census.atoms || [];
  const errors = [];
  const ids = new Set();
  for (const atom of atoms) {
    const required = [
      'id', 'id_sha256', 'id_input', 'behavior_slug', 'trigger', 'observable_effect',
      'independent_degradation', 'verification', 'origin_commit', 'path', 'source_range',
      'adoption_mode', 'adoption_record', 'evidence_refs',
    ];
    const missing = required.filter((key) => atom[key] === undefined || atom[key] === '' || atom[key] === null);
    if (missing.length) errors.push({ id: atom.id || null, missing });
    const digest = sha256(String(atom.id_input || ''));
    if (atom.id_sha256 !== digest || atom.id !== `MATT-${digest.slice(0, 12)}`) errors.push({ id: atom.id, bad_id_hash: true });
    if (ids.has(atom.id)) errors.push({ id: atom.id, collision: true });
    ids.add(atom.id);
    if (!/^L\d+-L\d+$/.test(String(atom.source_range || ''))) errors.push({ id: atom.id, bad_range: atom.source_range });
    if (!Array.isArray(atom.evidence_refs) || atom.evidence_refs.length < 2) errors.push({ id: atom.id, weak_evidence: true });
  }
  return { census, atoms, errors };
}

function runSourceCensus() {
  const path = args.out || args.input;
  if (!path || !existsSync(resolve(String(path)))) return emit('FAIL', 31, 'source census output is absent', { path });
  try {
    const { census, atoms, errors } = validateSource(path);
    if (errors.length) return emit('FAIL', 31, 'source census contract failed', { errors: errors.slice(0, 50), error_count: errors.length });
    return emit('PASS', 0, 'source census is content-addressed and atom-shaped', {
      atoms: atoms.length,
      status: census.status,
      path: resolve(String(path)),
    });
  } catch (error) {
    return emit('FAIL', 31, 'source census is invalid JSON', { error: error.message });
  }
}

function runLiveCensus() {
  const path = args.out || args.input;
  if (!path || !existsSync(resolve(String(path)))) return emit('FAIL', 32, 'live census output is absent', { path });
  try {
    const census = load(path);
    const atoms = census.atoms || [];
    const errors = [];
    const ids = new Set();
    for (const atom of atoms) {
      const required = ['id', 'slug', 'capability', 'effect', 'surfaces', 'state', 'evidence', 'profile'];
      const missing = required.filter((key) => atom[key] === undefined || atom[key] === '' || atom[key] === null);
      if (missing.length) errors.push({ id: atom.id || null, missing });
      if (ids.has(atom.id)) errors.push({ id: atom.id, collision: true });
      ids.add(atom.id);
      if (!Array.isArray(atom.surfaces) || !atom.surfaces.length) errors.push({ id: atom.id, missing_surface: true });
    }
    if (atoms.length !== census.atom_count) errors.push({ declared: census.atom_count, actual: atoms.length });
    if (errors.length) return emit('FAIL', 32, 'live census contract failed', { errors: errors.slice(0, 50), error_count: errors.length });
    return emit('PASS', 0, 'live census has unique independently failing surface atoms', {
      atoms: atoms.length,
      unresolved_live: census.unresolved_live || [],
      path: resolve(String(path)),
    });
  } catch (error) {
    return emit('FAIL', 32, 'live census is invalid JSON', { error: error.message });
  }
}

function verifyLedgerFile(path) {
  const ledger = load(path);
  const errors = [];
  const keys = new Set();
  for (const object of ledger.objects || []) {
    const required = ['commit', 'path', 'blob_oid', 'sha256', 'lines', 'bytes', 'eof'];
    const missing = required.filter((key) => object[key] === undefined || object[key] === null || object[key] === '');
    if (missing.length) errors.push({ path: object.path || null, missing });
    const key = `${object.commit}:${object.path}`;
    if (keys.has(key)) errors.push({ duplicate: key });
    keys.add(key);
    if (!object.eof?.read_complete) errors.push({ path: object.path, eof: false });
    if (!/^[0-9a-f]{40}$/.test(String(object.blob_oid || ''))) errors.push({ path: object.path, bad_blob_oid: true });
    if (!/^[0-9a-f]{64}$/.test(String(object.sha256 || ''))) errors.push({ path: object.path, bad_sha256: true });
  }
  return { ledger, errors };
}

function runLedger() {
  const originPath = args.origin || args['origin-out'] || 'origin-ledger.json';
  const headPath = args.head || args['head-out'] || 'head-ledger.json';
  try {
    const origin = verifyLedgerFile(originPath);
    const head = verifyLedgerFile(headPath);
    const errors = [...origin.errors, ...head.errors];
    if (errors.length) return emit('FAIL', 34, 'ledger identity contract failed', { errors: errors.slice(0, 50), error_count: errors.length });
    return emit('PASS', 0, 'origin and HEAD ledgers are self-contained', {
      origin_objects: origin.ledger.objects.length,
      head_objects: head.ledger.objects.length,
    });
  } catch (error) {
    return emit('FAIL', 34, 'ledger is unreadable', { error: error.message });
  }
}

function runJoin() {
  if (!args.source || !args.live || !args.independent || !args.out) {
    return emit('FAIL', 33, 'join requires --source, --live, --independent, and --out');
  }
  if (!args.head || !args.decisions) {
    return emit('FAIL', 33, 'join requires --head and --decisions; implicit policy is forbidden');
  }
  try {
    const source = load(args.source);
    const live = load(args.live);
    const independent = load(args.independent);
    const head = load(args.head);
    const decisions = load(args.decisions);
    if (!Array.isArray(independent.final_atoms) || independent.status !== 'PASS') {
      return emit('FAIL', 33, 'independent census did not authorize a final join', {
        independent_status: independent.status,
      });
    }
    const expectedInputs = {
      source_sha256: sha256(readFileSync(resolve(String(args.source)))),
      live_sha256: sha256(readFileSync(resolve(String(args.live)))),
      head_sha256: sha256(readFileSync(resolve(String(args.head)))),
    };
    const hashMismatch = Object.entries(expectedInputs)
      .filter(([key, value]) => independent.inputs?.[key] !== value)
      .map(([key, value]) => ({ key, expected: value, observed: independent.inputs?.[key] || null }));
    if (hashMismatch.length) return emit('FAIL', 33, 'independent join references different frozen producer inputs', { hash_mismatch: hashMismatch });
    const decisionById = new Map((decisions.decisions || []).map((row) => [row.id, row]));
    const missingDecisions = independent.final_atoms.filter((atom) => !decisionById.has(atom.id)).map((atom) => atom.id);
    if (missingDecisions.length) return emit('FAIL', 33, 'final atoms lack explicit adoption decisions', { missing_decisions: missingDecisions });
    const atoms = independent.final_atoms.map((atom) => {
      const decision = decisionById.get(atom.id);
      return { ...atom, decision: decision.decision, decision_reason: decision.reason, work_package: decision.work_package ?? null };
    });
    const ids = atoms.map((atom) => atom.id);
    const collisions = ids.filter((id, index) => ids.indexOf(id) !== index);
    const manifest = {
      schema_version: '1.0.0',
      upstream_head: head.upstream_head || head.upstream?.head || '84fdeffd12f2ee307994d1eb6feb48173b6e0502',
      framework_head: live.live_head,
      generated_at: new Date().toISOString(),
      atoms,
      coverage: {
        denominator: atoms.length,
        source_ids: independent.coverage?.source_ids || [],
        live_ids: independent.coverage?.live_mapped_ids || [],
        independent_ids: ids,
        unmatched: independent.coverage?.unmatched || [],
        collisions,
        composites: independent.coverage?.composites || [],
      },
    };
    if (manifest.coverage.unmatched.length || collisions.length || manifest.coverage.composites.length) {
      return emit('FAIL', 33, 'join contains unmatched, collision, or composite findings', { coverage: manifest.coverage });
    }
    writeFileSync(resolve(String(args.out)), `${JSON.stringify(manifest, null, 2)}\n`);
    return emit('PASS', 0, 'three-way semantic join frozen', { denominator: atoms.length, out: resolve(String(args.out)) });
  } catch (error) {
    return emit('FAIL', 33, 'join failed', { error: error.stack || error.message });
  }
}

function runHarnessMatrix() {
  const universeArg = args.universe || args.manifest;
  if (!universeArg || !args.matrix) return emit('FAIL', 41, 'harness-matrix requires --universe (or --manifest) and --matrix');
  try {
    const universeBytes = readFileSync(resolve(String(universeArg)));
    const universe = JSON.parse(universeBytes);
    const matrixBytes = readFileSync(resolve(String(args.matrix)));
    const matrixSha256 = sha256(matrixBytes);
    if (args['expected-matrix-sha'] && matrixSha256 !== String(args['expected-matrix-sha'])) {
      return emit('FAIL', 41, 'matrix bytes do not match --expected-matrix-sha', {
        expected_matrix_sha256: String(args['expected-matrix-sha']),
        observed_matrix_sha256: matrixSha256,
      });
    }
    const matrix = JSON.parse(matrixBytes.toString('utf8'));
    const decisionPath = matrix.universe?.decision_map;
    if (!decisionPath || !existsSync(resolve(String(decisionPath)))) {
      return emit('FAIL', 41, 'matrix does not bind a readable decision map');
    }
    const decisionBytes = readFileSync(resolve(String(decisionPath)));
    const decisionDoc = JSON.parse(decisionBytes);
    if (matrix.universe?.reconciled_census_sha256 !== sha256(universeBytes)
      || matrix.universe?.decision_map_sha256 !== sha256(decisionBytes)) {
      return emit('FAIL', 41, 'matrix header hashes do not bind the supplied census and decision map');
    }
    const decisionEntries = decisionDoc.decisions || decisionDoc.entries || decisionDoc.atoms || decisionDoc;
    const decisionById = new Map((Array.isArray(decisionEntries) ? decisionEntries : []).map((entry) => [entry.id ?? entry.atom_id, entry]));
    const normalizeDecision = (entry) => String(entry?.decision ?? entry?.independent_decision ?? entry?.disposition ?? entry?.recommendation ?? '')
      .toUpperCase().replace(/_PILOT$|_LINEAGE_ONLY$|_ONLY$/u, '');
    const normalizeWp = (entry) => {
      const match = String(entry?.work_package ?? entry?.proposed_work_package ?? entry?.wp ?? '').match(/WP[-_ ]?(\d{1,2})/iu);
      return match ? `WP-${match[1].padStart(2, '0')}` : null;
    };
    const harnessText = (value, harness) => String(value || '').replace(/\b(?:Claude|Codex)\b/gu, harness === 'claude' ? 'Claude' : 'Codex');
    const expectedFor = (atom, phase, decision, lane, harness, wp) => {
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
      if (phase === 'trigger') return `PASS only when the ${harness} trigger fixture selects this atom and no sibling atom: ${harnessText(atom.trigger, harness)}`;
      if (phase === 'execute') return `PASS only when the isolated ${harness} harness exhibits the declared effect: ${harnessText(atom.observable_effect, harness)}`;
      if (phase === 'degrade') return `The ${harness} negative fixture MUST be rejected and independently demonstrate this failure: ${harnessText(atom.independent_degradation, harness)}`;
      return `PASS only when fresh ${harness} evidence satisfies the atom-specific oracle: ${harnessText(atom.verification, harness)}`;
    };
    const lanes = [
      ['adopted', universe.final_atoms || []],
      ['control', universe.control_atoms || []],
      ['head', universe.head_candidate_atoms || []],
    ];
    const expectedCounts = { adopted: 197, control: 50, head: 74 };
    const actualCounts = Object.fromEntries(lanes.map(([lane, atoms]) => [lane, atoms.length]));
    const universeRows = lanes.flatMap(([lane, atoms]) => atoms.map((atom) => ({ lane, atom })));
    const universeIds = universeRows.map(({ atom }) => atom.id);
    const universeDuplicates = universeIds.filter((id, index) => universeIds.indexOf(id) !== index);
    if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)
      || universeIds.length !== 321 || universeDuplicates.length) {
      return emit('FAIL', 41, 'audit universe is not the frozen 197 + 50 + 74 = 321 set', {
        actual_counts: actualCounts,
        duplicate_universe_ids: [...new Set(universeDuplicates)],
      });
    }
    const rows = matrix.atoms || [];
    const rowIds = rows.map((row) => row.id);
    const duplicateRows = rowIds.filter((id, index) => rowIds.indexOf(id) !== index);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const missing = [];
    const extras = rowIds.filter((id) => !universeIds.includes(id));
    const invalid = [];
    const receipts = [];
    const verifierByWp = {
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
    const requiredCommandFragmentsByWp = {
      'WP-00': ["--fixture-set 'checkout-origin-clean-gates'"],
      'WP-01': [`--decision-map 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/decision-map.json'`],
      'WP-02': ["--fixture-set 'quarantine-before-adaptation'", "--expect-live-route 'absent'"],
      'WP-03': ["--fixture-set 'name-lock-pin-switch-read'"],
      'WP-04': ["--fixture-set 'codex-header-claude-native-body-byte-preservation'"],
      'WP-05': ['--require-native-edge', '--require-signed-receipt'],
      'WP-06': ["--public-canary-set 'aws,github,bearer,cookie,identity'", "--oracle-canary-fd 'parent-memory'", "--surface-manifest 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/fixtures/security/output-surfaces.json'", "--scan 'stdout,stderr,native-transcript,artifact,handoff,final,receipt-log'"],
      'WP-07': ["--require 'shared-target,claude-link,codex-catalog,nested-closure,three-native-receipts'"],
      'WP-08': ["--fixture-set 'safe-resolver-conflict-states'", '--require-human-gate'],
      'WP-09': ["--dedicated-root 'future-fixtures/teach-personal-root'"],
      'WP-10': ["--require 'shared-doctrine-pointer,fusion-2x4'"],
      'WP-11': ["--manifest 'framework-audit/2026-08-09-mattpocock-handshake-cycle2/atomic-manifest.yaml'", "--fixture-set 'manifest-one-negative-per-atom'"],
      'WP-12': ["--require 'external-route,registration,hermetic-env'"],
      'WP-13': ["--isolation 'throwaway-apfs'", "--fault-suite 'broker-kill-host-restart-cas-rollback'"],
      'WP-14': ["--require 'pins,registry,changelog,governed-memory-candidate'"],
    };
    const allowedStatuses = new Set(['PLANNED', 'BLOCKED_CURRENT', 'DECISION_GATED', 'N/A']);
    for (const { lane, atom } of universeRows) {
      const row = byId.get(atom.id);
      if (!row) { missing.push(atom.id); continue; }
      if (row.lane !== lane) invalid.push(`${atom.id}:lane:${String(row.lane)}`);
      const decisionEntry = decisionById.get(atom.id);
      const authoritativeDecision = normalizeDecision(decisionEntry);
      const authoritativeWp = normalizeWp(decisionEntry);
      if (row.decision !== authoritativeDecision) invalid.push(`${atom.id}:decision-drift:${String(row.decision)}!=${String(authoritativeDecision)}`);
      if (row.work_package !== authoritativeWp) invalid.push(`${atom.id}:work-package-drift:${String(row.work_package)}!=${String(authoritativeWp)}`);
      if (row.behavior_slug !== (atom.behavior_slug ?? atom.slug)) invalid.push(`${atom.id}:behavior-slug-drift`);
      if (!['ADAPT', 'KEEP', 'DEFER', 'REJECT', 'QUARANTINE'].includes(row.decision)) {
        invalid.push(`${atom.id}:decision:${String(row.decision)}`);
      }
      const expectedVerifier = verifierByWp[row.work_package];
      if (!expectedVerifier) invalid.push(`${atom.id}:work-package:${String(row.work_package)}`);
      const personalTeach = lane === 'adopted' && atom.path === 'skills/productivity/teach/SKILL.md';
      for (const harness of ['claude', 'codex']) {
        const cell = row[harness];
        if (!cell) { invalid.push(`${atom.id}:${harness}:missing`); continue; }
        for (const field of ['trigger', 'execute', 'degrade', 'verify']) {
          const value = cell[field];
          if (!value || !value.status || !value.command || !value.expected || !value.receipt) {
            invalid.push(`${atom.id}:${harness}:${field}`);
          }
          const exactExpected = expectedFor(atom, field, authoritativeDecision, lane, harness, authoritativeWp);
          if (value?.expected !== exactExpected) invalid.push(`${atom.id}:${harness}:${field}:expected-drift`);
          if (!allowedStatuses.has(value?.status)) invalid.push(`${atom.id}:${harness}:${field}:status:${String(value?.status)}`);
          if (value?.receipt) {
            receipts.push(value.receipt);
            if (!value.command.includes(`--receipt '${value.receipt}'`)) invalid.push(`${atom.id}:${harness}:${field}:receipt-command-mismatch`);
          }
          if (value?.command) {
            for (const token of [`--atom '${atom.id}'`, `--harness '${harness}'`, `--phase '${field}'`]) {
              if (!value.command.includes(token)) invalid.push(`${atom.id}:${harness}:${field}:command-missing:${token}`);
            }
            const scopedTeachCommand = harness === 'codex' && personalTeach;
            const verifier = scopedTeachCommand ? 'scripts/evolution/verify-teach-scope.mjs' : expectedVerifier;
            const governedHeadDecision = lane === 'head' && ['KEEP', 'DEFER', 'REJECT'].includes(row.decision);
            if (verifier && governedHeadDecision && !value.command.includes(verifier)) {
              invalid.push(`${atom.id}:${harness}:${field}:missing-work-package-verifier`);
            } else if (verifier && !governedHeadDecision && !value.command.includes(`node ${verifier}`)) {
              invalid.push(`${atom.id}:${harness}:${field}:wrong-verifier`);
            }
            if (!scopedTeachCommand) {
              for (const fragment of requiredCommandFragmentsByWp[row.work_package] || []) {
                if (!value.command.includes(fragment)) invalid.push(`${atom.id}:${harness}:${field}:missing-work-package-arg:${fragment}`);
              }
            }
          }
          if (value?.status === 'N/A') {
            if (!(harness === 'codex' && personalTeach)) invalid.push(`${atom.id}:${harness}:${field}:forbidden-N/A`);
            if (!value.scope_exception) invalid.push(`${atom.id}:${harness}:${field}:unjustified-N/A`);
            if (!value.command?.includes("--expect 'no-project-route'")) invalid.push(`${atom.id}:${harness}:${field}:N/A-without-no-route-proof`);
          } else if (value?.scope_exception) {
            invalid.push(`${atom.id}:${harness}:${field}:scope-exception-on-applicable-cell`);
          }
          if (harness === 'codex' && personalTeach && value?.status !== 'N/A') {
            invalid.push(`${atom.id}:${harness}:${field}:teach-scope-must-be-N/A`);
          }
          if (lane === 'head' && ['KEEP', 'DEFER', 'REJECT'].includes(row.decision)) {
            if (value?.status !== 'DECISION_GATED') invalid.push(`${atom.id}:${harness}:${field}:head-decision-not-gated`);
            if (!value?.command?.includes('scripts/evolution/verify-decision-ledger.mjs')
              || !value.command.includes(`--expect-decision '${row.decision}'`)
              || !value.command.includes("--expect-new-surface 'zero'")) {
              invalid.push(`${atom.id}:${harness}:${field}:head-decision-without-negative-surface-gate`);
            }
          }
        }
      }
    }
    const roles = matrix.roles || {};
    const roleNames = Object.keys(roles).sort();
    const expectedRoles = ['oracle', 'plan-agent', 'quality-gate', 'work-agent'];
    if (JSON.stringify(roleNames) !== JSON.stringify(expectedRoles)) invalid.push(`roles:exact-name-set:${roleNames.join(',')}`);
    for (const role of expectedRoles) {
      for (const harness of ['claude', 'codex']) {
        const contract = roles[role]?.[harness];
        if (!contract) { invalid.push(`role:${role}:${harness}:missing`); continue; }
        for (const field of ['native_name', 'agent_definition', 'native_dispatch', 'signed_receipt_verify', 'expected', 'receipt']) {
          if (!contract[field]) invalid.push(`role:${role}:${harness}:${field}`);
        }
        if (contract.native_name !== role) invalid.push(`role:${role}:${harness}:native-name`);
        const nativePrimitive = harness === 'claude' ? 'Agent({' : 'spawn_agent({';
        if (!contract.native_dispatch?.includes(nativePrimitive) || !contract.native_dispatch.includes(`\"${role}\"`)) {
          invalid.push(`role:${role}:${harness}:not-exact-native-dispatch`);
        }
        if (!contract.signed_receipt_verify?.includes(`--role '${role}'`)
          || !contract.signed_receipt_verify.includes(`--harness '${harness}'`)
          || !contract.signed_receipt_verify.includes('future-receipts/WP-00/evidence-tcb/verify-role-receipt.mjs')
          || !contract.signed_receipt_verify.includes('--anchor')
          || !contract.signed_receipt_verify.includes('--execution-envelope')
          || !contract.signed_receipt_verify.includes('--raw-transport')) {
          invalid.push(`role:${role}:${harness}:unsigned-or-self-reported-receipt`);
        }
        if (contract.receipt) receipts.push(contract.receipt);
      }
    }
    const duplicateReceipts = receipts.filter((receipt, index) => receipts.indexOf(receipt) !== index);
    if (duplicateReceipts.length) invalid.push(`duplicate-receipts:${[...new Set(duplicateReceipts)].slice(0, 20).join(',')}`);
    if (rows.length !== 321 || extras.length || duplicateRows.length || missing.length || invalid.length) return emit('FAIL', 41, 'per-atom dual-harness matrix is incomplete or non-biting', {
      missing: missing.slice(0, 50), invalid: invalid.slice(0, 100),
      extras: extras.slice(0, 50), duplicate_rows: [...new Set(duplicateRows)].slice(0, 50),
      row_count: rows.length, receipt_count: receipts.length,
      missing_count: missing.length, invalid_count: invalid.length, extras_count: extras.length,
    });
    return emit('PASS', 0, 'exactly 321 atoms have unique, biting Claude and Codex T/E/D/V contracts plus four native role contracts', {
      atoms: rows.length,
      cells: rows.length * 2 * 4,
      receipts: receipts.length,
      roles: expectedRoles,
      observed_matrix_sha256: matrixSha256,
    });
  } catch (error) {
    return emit('FAIL', 41, 'harness matrix is unreadable JSON-compatible YAML', { error: error.message });
  }
}

switch (command) {
  case 'source-bundle': runSourceBundle(); break;
  case 'snapshot': runSnapshot(); break;
  case 'source-census': runSourceCensus(); break;
  case 'live-census': runLiveCensus(); break;
  case 'join': runJoin(); break;
  case 'ledger': runLedger(); break;
  case 'harness-matrix': runHarnessMatrix(); break;
  default: emit('FAIL', 19, `unknown audit command: ${String(command || '')}`);
}
