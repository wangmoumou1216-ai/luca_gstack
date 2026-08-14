#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APPROVED_CENSUS_SHA256,
  APPROVED_OBLIGATION_COUNT,
  IMPLEMENTATION_RECEIPT_SHA256,
  RESULT_LATTICE,
  aggregateResults,
  aggregateLaneReceipts,
  compileObligations,
  deriveApplicability,
  loadIndex,
  makeExecutionReceipt,
  recordEvidence,
  sha256,
} from './evolution/obligation-runtime.mjs';
import {
  probeProductionActivation,
  verifyProductionEntrypoints,
  verifyRealBehavior,
  verifyReverseCoverage,
} from './evolution/verify-obligation-runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = loadIndex();
const HASH = 'a'.repeat(64);
const CONTEXT = {
  schema_version: 'luca.obligation-task-context.v1',
  invocation_id: 'tst-010-invocation',
  harness: 'manual',
  lane: 'L1_HERMETIC',
  event: 'UserPromptSubmit',
  cwd: process.cwd(),
  task_sha256: HASH,
  route: {
    complete: true,
    skills: ['design-brief'],
    roles: [],
    workflows: [],
    actions: [],
    paths: [],
  },
};

assert.deepEqual(RESULT_LATTICE, [
  'PASS',
  'NOT_APPLICABLE',
  'BLOCKED',
  'DEGRADED',
  'NOT_RUN',
  'UNKNOWN',
]);

assert.equal(aggregateResults([
  { class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'PASS' },
]), 'PASS');

assert.equal(aggregateResults([
  { class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'NOT_RUN' },
]), 'NOT_RUN');

assert.throws(
  () => aggregateResults([{ class: 'S2_COMPLETION_QUALITY', applicable: true, result: 'N/A' }]),
  /invalid result N\/A/,
);

assert.throws(
  () => aggregateResults([{ class: 'S0_MACHINE_SAFETY', applicable: true, result: 'DEGRADED' }]),
  /S0_MACHINE_SAFETY cannot be DEGRADED/,
);

assert.throws(
  () => aggregateResults([{ class: 'S3_HUMAN_TASTE', applicable: true, result: 'DEGRADED' }]),
  /S3_HUMAN_TASTE cannot be DEGRADED/,
);

assert.equal(INDEX.records.length, APPROVED_OBLIGATION_COUNT);
assert.equal(INDEX.approved.census_sha256, APPROVED_CENSUS_SHA256);
assert.equal(INDEX.approved.implementation_receipt_sha256, IMPLEMENTATION_RECEIPT_SHA256);
assert.deepEqual(new Set(INDEX.records.map((row) => row.class)), new Set([
  'S0_MACHINE_SAFETY',
  'S1_ROUTING_DISPATCH',
  'S2_COMPLETION_QUALITY',
  'S3_HUMAN_TASTE',
  'S4_NATIVE_CAPABILITY',
]));
assert.ok(INDEX.records.every((row) => row.approved_native_status === 'MISSING_WIRING'));
assert.ok(INDEX.records.every((row) => row.wiring_state === 'WIRED_UNPROBED'));
assert.ok(!readFileSync(new URL('./evolution/obligation-index.json', import.meta.url), 'utf8').match(/"(?:text|rule|prose|excerpt|quote|content)"\s*:/));

assert.deepEqual(
  deriveApplicability('.claude/skills/office/design-brief/SKILL.md#L1'),
  { kind: 'SKILL_ROUTE', key: 'design-brief' },
);
assert.deepEqual(
  deriveApplicability('.claude/hooks/route-guard.mjs#L1'),
  { kind: 'HOOK_EVENT', key: 'UserPromptSubmit' },
);

const ledger = compileObligations({ index: INDEX, context: structuredClone(CONTEXT) });
assert.equal(ledger.entries.length, APPROVED_OBLIGATION_COUNT);
assert.notEqual(ledger.aggregate, 'PASS');
const matchingSkill = ledger.entries.find((entry) => entry.source_pointer.startsWith('.claude/skills/office/design-brief/'));
const otherSkill = ledger.entries.find((entry) => entry.source_pointer.startsWith('.claude/skills/office/html-prototype/'));
assert.equal(matchingSkill.applicability_state, 'APPLICABLE');
assert.equal(matchingSkill.result, 'NOT_RUN');
assert.equal(otherSkill.applicability_state, 'NOT_APPLICABLE');
assert.equal(otherSkill.result, 'NOT_APPLICABLE');
const extractionTriggerMutant = structuredClone(INDEX);
extractionTriggerMutant.records[0].trigger.markers = ['EXTRACTION_PROVENANCE_ONLY'];
const triggerMutantLedger = compileObligations({ index: extractionTriggerMutant, context: structuredClone(CONTEXT) });
assert.deepEqual(
  triggerMutantLedger.entries.map(({ applicability_state, result }) => ({ applicability_state, result })),
  ledger.entries.map(({ applicability_state, result }) => ({ applicability_state, result })),
  'U009 extraction trigger must not drive task applicability',
);

const incomplete = structuredClone(CONTEXT);
incomplete.route.complete = false;
incomplete.route.skills = [];
const unknownLedger = compileObligations({ index: INDEX, context: incomplete });
assert.equal(unknownLedger.aggregate, 'UNKNOWN');
assert.ok(unknownLedger.entries.some((entry) => entry.applicability_state === 'UNKNOWN' && entry.result === 'UNKNOWN'));

const singleLedger = {
  schema_version: 'luca.obligation-ledger.v1',
  context: structuredClone(CONTEXT),
  index_sha256: HASH,
  entries: [{
    obligation_id: matchingSkill.obligation_id,
    source_pointer: matchingSkill.source_pointer,
    class: matchingSkill.class,
    applicable: true,
    applicability_state: 'APPLICABLE',
    result: 'NOT_RUN',
    lane: 'L1_HERMETIC',
    evidence: [{ kind: 'COMPILER_APPLICABILITY', uri: 'obligation:test', sha256: HASH }],
  }],
  aggregate: 'NOT_RUN',
};
const recorded = recordEvidence({
  ledger: singleLedger,
  obligationId: matchingSkill.obligation_id,
  result: 'PASS',
  evidence: [{ kind: 'COMMAND_EXIT', uri: 'command:fixture', sha256: HASH }],
});
assert.equal(recorded.aggregate, 'PASS');
assert.throws(() => recordEvidence({
  ledger: singleLedger,
  obligationId: matchingSkill.obligation_id,
  result: 'PASS',
  evidence: [],
}), /evidence must be a non-empty array/);

const receiptEvidence = [{ kind: 'COMMAND_EXIT', uri: 'command:fixture', sha256: HASH }];
const l1 = makeExecutionReceipt({ entrypoint: 'verify', lane: 'L1_HERMETIC', executedChecks: ['INDEX-SCHEMA'], classes: ['S0_MACHINE_SAFETY'], result: 'PASS', evidence: receiptEvidence });
assert.deepEqual(l1.executed_checks, ['INDEX-SCHEMA']);
assert.equal(aggregateLaneReceipts([l1]), 'NOT_RUN');
const l2 = makeExecutionReceipt({ entrypoint: 'local-live', lane: 'L2_LOCAL_LIVE', executedChecks: ['ACTIVATION-MATCHER'], classes: ['S1_ROUTING_DISPATCH'], result: 'PASS', evidence: receiptEvidence });
const l3 = makeExecutionReceipt({ entrypoint: 'external', lane: 'L3_EXTERNAL', executedChecks: ['GLOBAL-READBACK'], classes: ['S4_NATIVE_CAPABILITY'], result: 'PASS', evidence: receiptEvidence });
assert.equal(aggregateLaneReceipts([l1, l2, l3]), 'PASS');
const l3Degraded = makeExecutionReceipt({ entrypoint: 'external', lane: 'L3_EXTERNAL', executedChecks: ['GLOBAL-READBACK'], classes: ['S4_NATIVE_CAPABILITY'], result: 'DEGRADED', evidence: receiptEvidence });
assert.equal(aggregateLaneReceipts([l1, l2, l3Degraded]), 'DEGRADED');
assert.throws(() => makeExecutionReceipt({ entrypoint: 'external', lane: 'L3_EXTERNAL', executedChecks: ['GLOBAL-READBACK'], classes: ['S3_HUMAN_TASTE'], result: 'DEGRADED', evidence: receiptEvidence }), /cannot DEGRADED an S0\/S3/);

assert.equal(sha256(readFileSync(new URL('./evolution/obligation-index.json', import.meta.url))).length, 64);

const protectedPaths = [
  'memory/episodic/index.jsonl',
  'memory/evals/eval-log.jsonl',
  'memory/retrieval-log.jsonl',
  'memory/scripts/daily_governance.py',
];
const protectedHashes = Object.fromEntries(protectedPaths.map((path) => [path, sha256(readFileSync(join(ROOT, path)))]));
const cloneParent = mkdtempSync(join(tmpdir(), 'obligation-runtime-clone-'));
const clone = join(cloneParent, 'repo');
const cloneResult = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, clone], { encoding: 'utf8', input: '', timeout: 60000 });
assert.equal(cloneResult.status, 0, cloneResult.stderr);

const candidateFiles = [
  '.claude/settings.json',
  '.codex/hooks.json',
  '.githooks/pre-commit',
  '.github/workflows/ci.yml',
  'scripts/verify.sh',
  'scripts/evolution/obligation-runtime.mjs',
  'scripts/evolution/obligation-task-start-hook.mjs',
  'scripts/evolution/obligation-stop-hook.mjs',
  'scripts/evolution/verify-obligation-runtime.mjs',
  'scripts/evolution/obligation-runtime.schema.json',
  'scripts/evolution/obligation-mutation-matrix.json',
  'scripts/evolution/obligation-index.json',
];
for (const path of candidateFiles) {
  mkdirSync(dirname(join(clone, path)), { recursive: true });
  cpSync(join(ROOT, path), join(clone, path));
}

const indexPath = join(clone, 'scripts/evolution/obligation-index.json');
const matrixPath = join(clone, 'scripts/evolution/obligation-mutation-matrix.json');
const cleanBytes = new Map(candidateFiles.map((path) => [path, readFileSync(join(clone, path))]));
const restore = (path) => writeFileSync(join(clone, path), cleanBytes.get(path));
let biteCount = 0;

function assertBites(name, path, mutate, verify, expected) {
  assert.doesNotThrow(verify, `${name} pre-pass`);
  mutate(join(clone, path));
  assert.throws(verify, expected, `${name} mutant was not killed`);
  restore(path);
  assert.doesNotThrow(verify, `${name} post-pass`);
  biteCount += 1;
}

const entrypointVerify = () => verifyProductionEntrypoints({ root: clone, indexPath, matrixPath });
assertBites(
  'consumer removed',
  '.claude/settings.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    config.hooks.UserPromptSubmit = config.hooks.UserPromptSubmit.filter((group) => !JSON.stringify(group).includes('obligation-task-start-hook.mjs'));
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /consumer missing or duplicated/,
);

assertBites(
  'matcher wrong',
  '.codex/hooks.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const group = config.hooks.UserPromptSubmit.find((row) => JSON.stringify(row).includes('obligation-task-start-hook.mjs'));
    group.matcher = '^never$';
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /matcher is wrong/,
);

assertBites(
  'unexpected exit one normalized',
  '.claude/settings.json',
  (path) => {
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const group = config.hooks.UserPromptSubmit.find((row) => JSON.stringify(row).includes('obligation-task-start-hook.mjs'));
    group.hooks[0].command = group.hooks[0].command.replace(
      '[ "$c" = "0" ] && exit 0 || exit 2',
      '[ "$c" = "2" ] && exit 2 || exit 0',
    );
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  },
  entrypointVerify,
  /normalizes unexpected nonzero exit/,
);

assertBites(
  'receipt removed',
  'scripts/evolution/obligation-index.json',
  (path) => {
    const index = JSON.parse(readFileSync(path, 'utf8'));
    delete index.records[0].receipt_kind;
    writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`);
  },
  () => verifyReverseCoverage({ root: clone, indexPath }),
  /keys must be exact/,
);

assertBites(
  'source removed',
  'scripts/evolution/obligation-index.json',
  (path) => {
    const index = JSON.parse(readFileSync(path, 'utf8'));
    index.records.pop();
    writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`);
  },
  () => verifyReverseCoverage({ root: clone, indexPath }),
  /denominator mismatch/,
);

assertBites(
  'real behavior no-op',
  'scripts/evolution/obligation-task-start-hook.mjs',
  (path) => {
    const text = readFileSync(path, 'utf8');
    const before = 'process.stdout.write(await taskStartHook(Buffer.concat(chunks)));';
    assert.ok(text.includes(before), 'real behavior mutation anchor missing');
    writeFileSync(path, text.replace(before, "process.stdout.write('[obligation-runtime] noop\\n');"));
  },
  () => verifyRealBehavior({ root: clone, indexPath }),
  /task-start native behavior failed/,
);

const codexConfig = JSON.parse(readFileSync(join(clone, '.codex/hooks.json'), 'utf8'));
const trustedHooks = [];
for (const event of ['UserPromptSubmit', 'Stop']) {
  for (const group of codexConfig.hooks[event]) {
    for (const hook of group.hooks || []) {
      if (!hook.command.includes('obligation-task-start-hook.mjs') && !hook.command.includes('obligation-stop-hook.mjs')) continue;
      trustedHooks.push({
        eventName: event,
        key: `${join(clone, '.codex/hooks.json')}:${event}:${trustedHooks.length}:0`,
        command: hook.command,
        trustStatus: 'trusted',
        currentHash: `sha256:${'b'.repeat(64)}`,
      });
    }
  }
}
const trustFixture = join(cloneParent, 'codex-hooks-list.json');
writeFileSync(trustFixture, `${JSON.stringify({ hooks: trustedHooks }, null, 2)}\n`);
await assert.doesNotReject(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksFixture: trustFixture }));
const untrusted = structuredClone(trustedHooks);
untrusted[0].trustStatus = 'untrusted';
writeFileSync(trustFixture, `${JSON.stringify({ hooks: untrusted }, null, 2)}\n`);
await assert.rejects(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksFixture: trustFixture }), /untrusted/);
writeFileSync(trustFixture, `${JSON.stringify({ hooks: trustedHooks }, null, 2)}\n`);
await assert.doesNotReject(() => probeProductionActivation({ root: clone, harness: 'codex', codexHooksFixture: trustFixture }));
biteCount += 1;

assert.equal(biteCount, 7);

const verifier = join(clone, 'scripts/evolution/verify-obligation-runtime.mjs');
const laneReceipts = [];
for (const entrypoint of ['verify', 'pre-commit', 'ci']) {
  const receiptPath = join(cloneParent, `${entrypoint}.json`);
  const run = spawnSync(process.execPath, [verifier, 'l1', '--entrypoint', entrypoint, '--receipt-output', receiptPath], {
    cwd: clone,
    encoding: 'utf8',
    input: '',
    timeout: 30000,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.entrypoint, entrypoint);
  assert.equal(receipt.lane, 'L1_HERMETIC');
  assert.equal(receipt.result, 'PASS');
  laneReceipts.push(receiptPath);
}

const l3Receipt = join(cloneParent, 'l3.json');
const l3Run = spawnSync(process.execPath, [verifier, 'l3', '--receipt-output', l3Receipt], {
  cwd: clone,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(l3Run.status, 1);
assert.equal(JSON.parse(readFileSync(l3Receipt, 'utf8')).result, 'NOT_RUN');
const aggregateRun = spawnSync(process.execPath, [verifier, 'aggregate', laneReceipts[0], l3Receipt], {
  cwd: clone,
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(aggregateRun.status, 1);
assert.equal(aggregateRun.stdout.trim(), 'NOT_RUN');

writeFileSync(join(clone, 'README.md'), `${readFileSync(join(clone, 'README.md'), 'utf8')}\n`);
assert.equal(spawnSync('git', ['add', '--', 'README.md'], { cwd: clone, encoding: 'utf8', input: '' }).status, 0);
const fastCommit = spawnSync('bash', ['.githooks/pre-commit'], {
  cwd: clone,
  env: { ...process.env, FAST_COMMIT: '1' },
  encoding: 'utf8',
  input: '',
  timeout: 30000,
});
assert.equal(fastCommit.status, 0, fastCommit.stderr || fastCommit.stdout);
assert.match(fastCommit.stdout, /"entrypoint":"pre-commit"/);
assert.match(fastCommit.stdout, /FAST_COMMIT=1/);

for (const path of protectedPaths) assert.equal(sha256(readFileSync(join(ROOT, path))), protectedHashes[path], `${path} changed during U010 tests`);
rmSync(cloneParent, { recursive: true, force: true });

console.log(`PASS obligation runtime lattice/index/compiler/ledger; mutants_killed=${biteCount}`);
