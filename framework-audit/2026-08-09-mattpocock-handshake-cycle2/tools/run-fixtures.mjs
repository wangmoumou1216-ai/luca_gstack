#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const [,, suite, ...rest] = process.argv;

function argsOf(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) {
      out._.push(argv[i]);
      continue;
    }
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

const args = argsOf(rest);

function emit(status, exit, reason, details = {}) {
  process.stdout.write(`${JSON.stringify({ suite, status, exit, reason, ...details })}\n`);
  process.exitCode = exit;
}

function text(path) {
  return readFileSync(resolve(String(path)), 'utf8');
}

function json(path) {
  return JSON.parse(text(path));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function idsFromManifest(path) {
  const value = json(path);
  return (value.atoms || value).map((atom) => atom.id);
}

function idsFromDecisionMap(path) {
  const value = json(path);
  return (value.decisions || value).map((decision) => decision.id);
}

function exactOnce(haystack, needle) {
  return haystack.split(needle).length - 1 === 1;
}

function runPlanContract() {
  if (!args.plan) return emit('FAIL', 11, 'missing --plan');
  const planPath = resolve(String(args.plan));
  const body = text(planPath);
  const requiredUnits = [
    'U-000', 'U-101', 'U-102', 'U-201', 'U-202', 'U-203', 'U-204',
    'U-301', 'U-302', 'U-401', 'U-402', 'U-403', 'U-404', 'U-501',
    'U-502', 'U-601', 'U-602', 'U-603',
  ];
  const requiredBlockers = Array.from({ length: 13 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`);
  const missingUnits = requiredUnits.filter((id) => !body.includes(`#### ${id}`));
  const missingBlockers = requiredBlockers.filter((id) => !body.includes(id));
  const endMarker = '<!-- FILE_END: audit-execution-plan.md -->';
  const freezePath = resolve(dirname(planPath), 'plan-freeze.sha256');
  let freezeMatches = false;
  if (existsSync(freezePath)) {
    const expected = text(freezePath).trim().split(/\s+/)[0];
    freezeMatches = expected === sha256(body);
  }
  if (missingUnits.length || missingBlockers.length || !body.endsWith(`${endMarker}\n`) || !freezeMatches) {
    return emit('FAIL', 11, 'audit plan contract is incomplete', {
      missing_units: missingUnits,
      missing_blockers: missingBlockers,
      end_marker: body.endsWith(`${endMarker}\n`),
      freeze_matches: freezeMatches,
    });
  }
  return emit('PASS', 0, 'audit plan is frozen and covers all units and inherited blockers');
}

function runAlignment() {
  if (!args.input || !args.required) return emit('FAIL', 21, 'missing --input or --required');
  const body = text(args.input);
  const required = String(args.required).split(',').filter(Boolean);
  const missing = required.filter((id) => !new RegExp(`^#{2,6}\\s+${id}\\b|^\\|\\s*${id}\\s*\\|`, 'm').test(body));
  const evidenceMissing = required.filter((id) => {
    const start = body.search(new RegExp(`^#{2,6}\\s+${id}\\b|^\\|\\s*${id}\\s*\\|`, 'm'));
    if (start < 0) return false;
    const excerpt = body.slice(start, start + 900);
    return !/(commit|[0-9a-f]{40}|:\d+|line|test|probe|evidence)/i.test(excerpt);
  });
  if (missing.length || evidenceMissing.length) {
    return emit('FAIL', 21, 'alignment coverage or evidence is incomplete', { missing, evidence_missing: evidenceMissing });
  }
  return emit('PASS', 0, 'all inherited blockers have evidence-bearing alignment entries');
}

function runCensus() {
  if (!args.case) return emit('FAIL', 31, 'missing --case');
  const fixture = json(args.case);
  const atom = fixture.atom || {};
  const axes = ['triggers', 'observable_effects', 'independent_failures'];
  const sizes = Object.fromEntries(axes.map((key) => [key, Array.isArray(atom[key]) ? atom[key].length : 0]));
  const composite = Object.values(sizes).some((n) => n > 1);
  if (!composite) return emit('FAIL', 31, 'fixture did not expose a composite atom', { sizes });
  return emit('COMPOSITE', Number(fixture.expected?.exit || 31), 'composite atom rejected', {
    minimum_atoms: Math.max(...Object.values(sizes)),
  });
}

function runLedger() {
  if (!args.case) return emit('FAIL', 34, 'missing --case');
  const fixture = json(args.case);
  const missing = (fixture.referenced || []).filter((path) => !(fixture.ledgered || []).includes(path));
  if (!missing.length) return emit('FAIL', 34, 'fixture unexpectedly has complete closure');
  return emit('MISSING_ORIGIN', Number(fixture.expected?.exit || 34), 'transitive origin closure rejected', { missing });
}

function validProjectName(name) {
  return typeof name === 'string'
    && name.length > 0
    && !name.startsWith('.')
    && !/[\\/\u0000-\u001f\u007f]/.test(name)
    && name !== '.'
    && name !== '..';
}

function patchParts(patch) {
  const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/gm;
  const targets = [];
  let match;
  while ((match = header.exec(patch))) targets.push({ action: match[1], path: match[2], index: match.index });
  const body = patch.split(/\r?\n/).filter((line) => !/^\*\*\* (Add|Update|Delete) File: /.test(line)).join('\n');
  return { targets, body_hash: sha256(body) };
}

function runProject() {
  if (!args.invalid || !args.compound || !args.patch) return emit('FAIL', 44, 'missing project fixture arguments');
  const names = json(args.invalid);
  const falseRejects = (names.valid || []).filter((name) => !validProjectName(name));
  const falseAccepts = (names.invalid || []).filter((name) => validProjectName(name));
  const compound = json(args.compound);
  const pathSegments = compound.scoped_operation?.path_segments || [];
  const operationPath = `${pathSegments.slice(0, 2).join('')}/${pathSegments.slice(2).join('/')}`;
  const literalPrefix = `${['do', 'cs'].join('')}/`;
  const compoundCaught = operationPath.startsWith(literalPrefix) && (compound.separators || []).length >= 4;
  const patch = text(args.patch);
  const parsed = patchParts(patch);
  const proseLiteral = `${['do', 'cs'].join('')}/example.md`;
  const patchSafe = parsed.targets.length === 1
    && parsed.targets[0].path === 'README.md'
    && patch.includes(proseLiteral)
    && !parsed.targets.some((target) => target.path.startsWith(literalPrefix));
  if (falseRejects.length || falseAccepts.length || !compoundCaught || !patchSafe) {
    return emit('FAIL', 44, 'project isolation fixture contract failed', {
      false_rejects: falseRejects,
      false_accepts: falseAccepts,
      compound_caught: compoundCaught,
      patch_safe: patchSafe,
      parsed_targets: parsed.targets,
      patch_body_sha256: parsed.body_hash,
    });
  }
  return emit('PASS', 0, 'name validation, compound denial, and header-only patch classification hold', {
    patch_body_sha256: parsed.body_hash,
    parsed_targets: parsed.targets,
  });
}

function runSecurity() {
  if (!args.canaries || !args.output) return emit('FAIL', 45, 'missing --canaries or --output');
  const fixture = json(args.canaries);
  const output = text(args.output);
  const leaks = (fixture.canaries || []).filter((entry) => output.includes(entry.value)).map((entry) => entry.name);
  if (leaks.length) return emit('FAIL', 45, 'secret canary bytes leaked', { leaks });
  return emit('PASS', 0, 'no secret canary bytes found');
}

function runAgents() {
  if (!args.roles || !args.matrix) return emit('FAIL', 43, 'missing --roles or --matrix');
  const requiredRoles = String(args.roles).split(',').filter(Boolean);
  const matrix = json(args.matrix);
  const roles = matrix.roles || {};
  const missing = [];
  for (const harness of ['claude', 'codex']) {
    for (const role of requiredRoles) {
      const hit = Array.isArray(roles)
        ? roles.find((row) => row.harness === harness && row.role === role)
        : roles?.[role]?.[harness];
      const dispatch = hit?.native_dispatch || hit?.dispatch;
      const verify = hit?.signed_receipt_verify || hit?.verify_command;
      if (!hit || !dispatch || !verify || hit.status === 'SELF_REPORTED') missing.push(`${harness}:${role}`);
    }
  }
  if (missing.length) return emit('FAIL', 43, 'logical roles lack concrete native dispatch contracts', { missing });
  return emit('PASS', 0, 'both harnesses define every logical role with native receipt verification');
}

function runArchitecture() {
  if (!args.input) return emit('FAIL', 46, 'missing --input');
  const body = text(args.input);
  const decisions = ['ADR-GATE-001', 'ADR-PIN-001', 'ADR-PATCH-001', 'ADR-AGENT-001', 'ADR-ACT-001'];
  const missing = decisions.filter((id) => !exactOnce(body, id));
  const unresolved = /(TBD|TO BE DECIDED|UNRESOLVED|二选一|待定方案|择一)/i.test(body);
  const sequence = 'PREPARED → GLOBAL_STAGED → REPO_COMMITTED → GLOBAL_SWAPPED → LEDGER_COMMITTED → GOVERNANCE_COMMITTED → VERIFIED';
  const requiredActivationContracts = [
    '`APPROVE <gate> <proposal_sha256> <nonce>`',
    '`BLOCKED_HUMAN_CHANNEL`',
    '`G_REVIEW_R_OBSERVED`',
    'secure-receipt-writer',
    'human-gate-recorder.mjs',
    'trusted top-level `bootstrap-main`',
    'not a cryptographic claim',
    'openat(O_DIRECTORY|O_NOFOLLOW)',
    '/usr/bin/shasum',
    'tools/os-byte-anchor.sh',
    '`h4a-spike`',
    '`h4b-cutover`',
    '`parent(A)=R,parent(B)=A,parent(C)=B`',
    'verify-activation-build-independent.mjs',
    '--approval-key H4a --descriptor-key h4a-spike',
    'cutover descriptor never embeds the final gate-file hash',
  ];
  const missingActivationContracts = requiredActivationContracts.filter((value) => !body.includes(value));
  if (missing.length || unresolved || !body.includes(sequence) || missingActivationContracts.length) {
    return emit('FAIL', 46, 'architecture has a missing or unresolved decision', {
      missing,
      unresolved,
      activation_sequence: body.includes(sequence),
      missing_activation_contracts: missingActivationContracts,
    });
  }
  return emit('PASS', 0, 'gate/evidence, pin, patch, agent, and activation each have one frozen architecture');
}

function workPackageBlocks(body) {
  const matches = [...body.matchAll(/^### (WP-[0-9]{2})\b/gm)];
  return matches.map((match, index) => ({
    id: match[1],
    body: body.slice(match.index, matches[index + 1]?.index ?? body.length),
  }));
}

function appendixCoverage(body) {
  const marker = '## 9. 321 原子工作包覆盖';
  const start = body.indexOf(marker);
  if (start < 0) return { present: false, rows: [], malformed: ['missing appendix marker'] };
  const appendix = body.slice(start);
  const headings = [...appendix.matchAll(/^#### (WP-[0-9]{2}) atom coverage \(([0-9]+)\)$/gm)];
  const rows = [];
  const malformed = [];
  for (let i = 0; i < headings.length; i += 1) {
    const [, workPackage, declaredRaw] = headings[i];
    const section = appendix.slice(headings[i].index + headings[i][0].length, headings[i + 1]?.index ?? appendix.length);
    const ids = [...section.matchAll(/\b(?:MATT|CTRL)-[0-9a-f]{12}\b/g)].map((match) => match[0]);
    const declared = Number(declaredRaw);
    if (ids.length !== declared) malformed.push(`${workPackage}:declared=${declared}:observed=${ids.length}`);
    for (const id of ids) rows.push({ id, work_package: workPackage });
  }
  if (!headings.length) malformed.push('no work-package headings');
  return { present: true, rows, malformed };
}

function runCandidatePlan() {
  if (!args.plan || !args.manifest || !args.matrix || !args.architecture) {
    return emit('FAIL', 52, 'missing candidate-plan arguments');
  }
  const body = text(args.plan);
  const manifestIds = idsFromManifest(args.manifest);
  const decisionDocument = args.decisions ? json(args.decisions) : null;
  const decisionEntries = decisionDocument ? (decisionDocument.decisions || decisionDocument) : [];
  const decisionIds = decisionDocument ? decisionEntries.map((decision) => decision.id) : manifestIds;
  const ids = [...new Set([...manifestIds, ...decisionIds])];
  const missingIds = ids.filter((id) => !body.includes(id));
  const appendix = appendixCoverage(body);
  const appendixIds = appendix.rows.map((row) => row.id);
  const appendixDuplicates = appendixIds.filter((id, index, all) => all.indexOf(id) !== index);
  const appendixSet = new Set(appendixIds);
  const appendixMissing = ids.filter((id) => !appendixSet.has(id));
  const appendixExtra = [...appendixSet].filter((id) => !ids.includes(id));
  const expectedWorkPackage = new Map(decisionEntries.map((entry) => [entry.id, entry.work_package]));
  const appendixWrongWorkPackage = appendix.rows
    .filter((row) => expectedWorkPackage.has(row.id) && expectedWorkPackage.get(row.id) !== row.work_package)
    .map((row) => `${row.id}:${row.work_package}!=${expectedWorkPackage.get(row.id)}`);
  const packages = workPackageBlocks(body);
  const fields = ['Owner', 'CWD', 'Files', 'Inputs', 'Command', 'Expected', 'Receipt', 'Rollback', 'Dependencies'];
  const incomplete = packages.filter((wp) => fields.some((field) => !new RegExp(`^[-*] \\*\\*${field}:\\*\\*`, 'mi').test(wp.body)))
    .map((wp) => wp.id);
  const missingDevTests = packages.filter((wp) => {
    const suffix = wp.id.slice(3);
    return !body.includes(`DEV-WP-${suffix}`) || !body.includes(`TEST-WP-${suffix}`);
  }).map((wp) => wp.id);
  const unresolvedRuntimePlaceholders = [...body.matchAll(/<(?:transaction|approved|root-owned|h4[ab]|candidate|checkout|home|receipt)[^>]*>/giu)]
    .map((match) => match[0]);
  const unresolvedFreezeTokens = [...body.matchAll(/(?:ARCH_SHA_AFTER|BUNDLE_SHA_AFTER|SOURCE_BUNDLE_SHA_FINAL|以 SRC-ARCH 当前冻结值为准)/gu)]
    .map((match) => match[0]);
  const closedKeyLine = body.split(/\r?\n/u).find((line) => line.startsWith('闭集值在本 Plan 冻结时为：')) || '';
  const closedKeyValues = [...closedKeyLine.matchAll(/=`([^`]+)`/gu)]
    .flatMap((match) => match[1].split(',').map((value) => value.trim()).filter(Boolean));
  const closedKeySet = new Set(closedKeyValues);
  const referencedKeyValues = [
    ...body.matchAll(/--(?:[a-z0-9-]*key|receipt-prefix-key)\s+([A-Za-z0-9-]+)/gu),
    ...body.matchAll(/candidate-key\s+([A-Za-z0-9-]+)/gu),
  ].map((match) => match[1]);
  const missingClosedKeys = [...new Set(referencedKeyValues.filter((value) => !closedKeySet.has(value)))];
  const duplicateClosedKeys = closedKeyValues.filter((value, index, all) => all.indexOf(value) !== index);
  const requiredExecutionContracts = [
    'WP-13-BUILD → H4a → WP-13-NATIVE',
    'WP00_PREP_FROZEN',
    'WP02_PAYLOAD_FROZEN',
    'WP13_BUILD_FROZEN',
    'WP13_R6_NATIVE_PASS',
    'G_REVIEW_R_OBSERVED',
    'GOVERNANCE_COMMITTED',
    'ADR-GATE-001',
    'BLOCKED_HUMAN_CHANNEL',
    'BLOCKED_SOURCE_IDENTITY',
    'secure-receipt-writer',
    'human-gate-recorder.mjs',
    '--approval-stdin',
    'execution-key-manifest.json',
    'cycle2-audit-root',
    'openat(O_DIRECTORY|O_NOFOLLOW)',
    '/usr/bin/shasum -a 256',
    'tools/os-byte-anchor.sh',
    '--receipt-prefix-key wp03',
    '--candidate-receipt-key h1-prep-candidate-check',
    '--require-wp13-summary-key wp13-r6-summary',
    'execution-envelope.json',
    'source-bundle.sha256',
    '--expected-matrix-sha',
    'verify-activation-build-independent.mjs',
    'h4a-spike',
    'h4b-cutover',
    'parent(A)=R,parent(B)=A,parent(C)=B',
    'forged-three-events',
    'stdout,stderr,native-transcript,artifact,handoff,final,receipt-log',
  ];
  const missingExecutionContracts = requiredExecutionContracts.filter((value) => !body.includes(value));
  const architectureBody = text(args.architecture);
  const architectureSha256 = sha256(architectureBody);
  const matrixBody = text(args.matrix);
  const matrixSha256 = sha256(matrixBody);
  const bundlePath = resolve(dirname(resolve(String(args.plan))), 'source-bundle.sha256');
  const bundleSha256 = existsSync(bundlePath) ? sha256(text(bundlePath)) : null;
  const architectureOk = ['ADR-GATE-001', 'ADR-PIN-001', 'ADR-PATCH-001', 'ADR-AGENT-001', 'ADR-ACT-001']
    .every((id) => body.includes(id) && architectureBody.includes(id))
    && body.includes(architectureSha256)
    && body.includes(matrixSha256)
    && Boolean(bundleSha256 && body.includes(bundleSha256));
  const h4aCommand = 'node scripts/evolution-activate.mjs --mode spike --execution-envelope framework-audit/2026-08-09-mattpocock-handshake-cycle2/future-receipts/WP-00/execution-envelope.json --approval-key H4a --descriptor-key h4a-spike --fault-matrix guardian-lifetime,partial-b-route-gate,partial-c-governance,terminal-publication --receipt-key wp13-r6';
  const commandParityOk = body.includes(h4aCommand) && architectureBody.includes(h4aCommand);
  const matrix = JSON.parse(matrixBody);
  const matrixIds = new Set((matrix.atoms || []).map((row) => row.id));
  const matrixMissing = ids.filter((id) => !matrixIds.has(id));
  const forbiddenLegacyContracts = ['human-gate-adapter.mjs', 'native UserPromptSubmit', '--receipt-root ']
    .filter((value) => body.includes(value));
  if (!packages.length || incomplete.length || missingDevTests.length || unresolvedRuntimePlaceholders.length
    || unresolvedFreezeTokens.length || missingClosedKeys.length || duplicateClosedKeys.length
    || missingExecutionContracts.length || missingIds.length
    || !appendix.present || appendix.malformed.length || appendixDuplicates.length || appendixMissing.length
    || appendixExtra.length || appendixWrongWorkPackage.length || appendixIds.length !== ids.length
    || matrixMissing.length || forbiddenLegacyContracts.length || !architectureOk || !commandParityOk) {
    return emit('FAIL', 52, 'candidate plan is not executable or atom-complete', {
      work_packages: packages.length,
      incomplete,
      missing_dev_tests: missingDevTests,
      unresolved_runtime_placeholders: unresolvedRuntimePlaceholders,
      unresolved_freeze_tokens: unresolvedFreezeTokens,
      missing_closed_keys: missingClosedKeys,
      duplicate_closed_keys: [...new Set(duplicateClosedKeys)],
      missing_execution_contracts: missingExecutionContracts,
      missing_atom_ids: missingIds,
      appendix_rows: appendixIds.length,
      appendix_malformed: appendix.malformed,
      appendix_duplicates: [...new Set(appendixDuplicates)],
      appendix_missing: appendixMissing,
      appendix_extra: appendixExtra,
      appendix_wrong_work_package: appendixWrongWorkPackage,
      matrix_missing: matrixMissing,
      forbidden_legacy_contracts: forbiddenLegacyContracts,
      architecture_ok: architectureOk,
      command_parity_ok: commandParityOk,
    });
  }
  return emit('PASS', 0, 'candidate plan has executable work packages and complete atom mapping', {
    work_packages: packages.length,
    atoms: ids.length,
    adopted_atoms: manifestIds.length,
    decision_universe: decisionIds.length,
  });
}

function runFreeze() {
  if (!args.plan || !args.manifest) return emit('FAIL', 53, 'missing --plan or --manifest');
  const body = text(args.plan);
  const manifestIds = idsFromManifest(args.manifest);
  const decisionIds = args.decisions ? idsFromDecisionMap(args.decisions) : manifestIds;
  const missing = [...new Set([...manifestIds, ...decisionIds])].filter((id) => !body.includes(id));
  const freezePath = args.hash || resolve(dirname(resolve(String(args.plan))), 'candidate-plan-freeze.sha256');
  if (!existsSync(freezePath)) return emit('FAIL', 53, 'candidate freeze file is absent', { freeze: freezePath });
  const expected = text(freezePath).trim().split(/\s+/)[0];
  const actual = sha256(body);
  if (expected !== actual || missing.length) return emit('FAIL', 53, 'candidate freeze or coverage mismatch', { expected, actual, missing });
  return emit('PASS', 0, 'candidate plan freeze matches and covers every atom', { sha256: actual });
}

function runRedteamRound() {
  if (!args.round || !args.findings || !args.plan) return emit('FAIL', 61, 'missing redteam-round arguments');
  const findings = text(args.findings);
  const planHash = sha256(text(args.plan));
  const reviewers = [...findings.matchAll(/^[-*] Reviewer receipt: `([^`]+)`/gm)].map((m) => m[1]);
  const frozen = findings.match(/Candidate SHA-256: `([0-9a-f]{64})`/);
  const materialOpen = /^\|\s*(BLOCKER|MAJOR)\s*\|[^\n]*\|\s*OPEN\s*\|/mi.test(findings);
  const fresh = new Set(reviewers).size === reviewers.length && reviewers.length >= 3;
  if (!frozen || frozen[1] !== planHash || !fresh || materialOpen) {
    return emit('FAIL', 61, 'redteam round is not closed against the frozen candidate', {
      expected_hash: planHash,
      frozen_hash: frozen?.[1] || null,
      reviewers,
      fresh,
      material_open: materialOpen,
    });
  }
  return emit('PASS', 0, `redteam round ${args.round} is closed`, { reviewers });
}

function runJudge() {
  if (!args.verdict || !args.plan) return emit('FAIL', 63, 'missing --verdict or --plan');
  const body = text(args.verdict);
  const planHash = sha256(text(args.plan));
  const allowed = String(args.allow || 'PLAN_HANDSHAKE_READY,NO_HANDSHAKE').split(',');
  const verdicts = allowed.filter((value) => new RegExp(`^${value}$`, 'm').test(body));
  const frozen = body.match(/Candidate SHA-256: `([0-9a-f]{64})`/);
  const receipt = body.match(/^[-*] Judge receipt: `([^`]+)`/m);
  if (verdicts.length !== 1 || frozen?.[1] !== planHash || !receipt) {
    return emit('FAIL', 63, 'judge verdict is absent, ambiguous, unbound, or unsigned', {
      verdicts,
      expected_hash: planHash,
      frozen_hash: frozen?.[1] || null,
      judge_receipt: receipt?.[1] || null,
    });
  }
  return emit('PASS', 0, 'judge emitted one plan-bound legal terminal verdict', { verdict: verdicts[0], judge_receipt: receipt[1] });
}

switch (suite) {
  case 'plan-contract': runPlanContract(); break;
  case 'alignment': runAlignment(); break;
  case 'census': runCensus(); break;
  case 'ledger': runLedger(); break;
  case 'project': runProject(); break;
  case 'security': runSecurity(); break;
  case 'agents': runAgents(); break;
  case 'architecture': runArchitecture(); break;
  case 'candidate-plan': runCandidatePlan(); break;
  case 'freeze': runFreeze(); break;
  case 'redteam-round': runRedteamRound(); break;
  case 'judge': runJudge(); break;
  default: emit('FAIL', 10, `unknown fixture suite: ${basename(String(suite || ''))}`);
}
