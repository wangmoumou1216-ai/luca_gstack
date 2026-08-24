#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const repo = resolve(root, '..', '..');

function fail(message) {
  process.stderr.write(`FINAL_CHANGE_ORDER_GATE_FAIL: ${message}\n`);
  process.exit(1);
}

function requireFile(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  return readFileSync(path, 'utf8');
}

const primaryPath = join(root, 'FINAL-CHANGE-ORDER.md');
const manifestPath = join(root, 'execution-delta.json');
const promptPath = join(root, 'NEXT-SESSION-GOAL.md');
const bundlePath = join(root, 'CHANGE-ORDER-BUNDLE.sha256');

const primary = requireFile(primaryPath);
const prompt = requireFile(promptPath);
const manifestText = requireFile(manifestPath);
const bundle = requireFile(bundlePath);

let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  fail(`invalid execution-delta.json: ${error.message}`);
}

if (manifest.change_order_id !== 'MPC2-CO-20260811-001') fail('wrong change_order_id');
if (manifest.status !== 'FINAL_CHANGE_ORDER') fail('manifest is not final');
if (manifest.upstream?.head !== '84fdeffd12f2ee307994d1eb6feb48173b6e0502') fail('upstream head drift');
if (manifest.blocking_baseline?.required_terminal !== 'RULE_EXECUTION_VERIFIED') fail('missing REX terminal');
if (manifest.surface_budget?.new_shared_first_class_skills?.join(',') !== 'code-review,domain-modeling') {
  fail('first-class skill surface budget drift');
}
if (manifest.surface_budget?.raw_upstream_installs !== 0) fail('raw upstream install must be zero');

const workIds = manifest.work_packets?.map((item) => item.id) ?? [];
const expectedWork = Array.from({ length: 11 }, (_, index) => `CO-${String(index + 1).padStart(2, '0')}`);
if (JSON.stringify(workIds) !== JSON.stringify(expectedWork)) fail('work packet exact set drift');

const assertionIds = manifest.delta_assertions ?? [];
const expectedAssertions = Array.from(
  { length: 12 },
  (_, index) => `DASSERT-${String(index + 1).padStart(3, '0')}`,
);
if (JSON.stringify(assertionIds) !== JSON.stringify(expectedAssertions)) fail('delta assertion exact set drift');
if (manifest.completion?.final_token !== 'MPC2_CHANGE_ORDER_INTEGRATED') fail('wrong completion token');

for (const marker of [
  '## 0. 权威声明',
  '## 2. 逐项深度裁决',
  '## 3. 对原计划的精确覆盖',
  '## 5. 新增执行包',
  '## 6. 增量断言',
  '<!-- FILE_END: FINAL-CHANGE-ORDER.md -->',
]) {
  if (!primary.includes(marker)) fail(`primary missing marker: ${marker}`);
}

for (const marker of [
  '/goal ',
  'RULE_EXECUTION_VERIFIED',
  'FINAL_CHANGE_ORDER_GATE_PASS',
  'MPC2_CHANGE_ORDER_INTEGRATED',
  '<!-- FILE_END: NEXT-SESSION-GOAL.md -->',
]) {
  if (!prompt.includes(marker)) fail(`prompt missing marker: ${marker}`);
}

for (const relative of [
  'framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md',
  'framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md',
  'framework-audit/2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md',
]) {
  if (!existsSync(join(repo, relative))) fail(`missing referenced authority: ${relative}`);
}

const bundleLines = bundle
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
if (bundleLines.length !== 4) fail('bundle must contain exactly four members');

const expectedMembers = [
  'FINAL-CHANGE-ORDER.md',
  'NEXT-SESSION-GOAL.md',
  'execution-delta.json',
  'tools/verify-change-order.mjs',
].sort();
const observedMembers = [];
for (const line of bundleLines) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  if (!match) fail(`malformed bundle line: ${line}`);
  const [, expectedHash, relative] = match;
  const memberPath = resolve(root, relative);
  if (!memberPath.startsWith(`${root}/`)) fail(`bundle member escapes root: ${relative}`);
  const bytes = requireFile(memberPath);
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== expectedHash) fail(`hash mismatch: ${relative}`);
  observedMembers.push(relative);
}
if (JSON.stringify(observedMembers.sort()) !== JSON.stringify(expectedMembers)) fail('bundle member exact set drift');

process.stdout.write('FINAL_CHANGE_ORDER_GATE_PASS\n');
