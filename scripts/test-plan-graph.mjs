#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'plan-graph-')));
const graph = (nodes, external_dependencies = []) => ({ plan_id: 'plan-test-001', plan_sha256: 'a'.repeat(64), nodes, external_dependencies });
function run(value) { const path = join(dir, 'graph.json'); writeFileSync(path, JSON.stringify(value)); return spawnSync(process.execPath, ['scripts/check-plan-graph.mjs', '--graph', path], { cwd: root, encoding: 'utf8' }); }
function pass(value) { const result = run(value); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }
function fail(value, pattern) { const result = run(value); assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, pattern); }
try {
  const result = pass(graph([{ id: 'U-001', dependencies: [] }, { id: 'U-002', dependencies: ['U-001'] }, { id: 'U-003', dependencies: ['U-001'] }, { id: 'U-004', dependencies: ['U-002', 'U-003'] }], [{ node_id: 'U-004', source_ref: 'framework-audit/evidence.json', status: 'UNKNOWN' }]));
  assert.deepEqual(result.topological_order, ['U-001', 'U-002', 'U-003', 'U-004']);
  assert.deepEqual(result.external_blockers, [{ node_id: 'U-004', source_ref: 'framework-audit/evidence.json', status: 'UNKNOWN' }]);
  fail(graph([{ id: 'U-001', dependencies: ['U-002'] }, { id: 'U-002', dependencies: ['U-001'] }]), /dependency cycle/);
  fail(graph([{ id: 'U-001', dependencies: ['U-001'] }]), /self dependency/);
  fail(graph([{ id: 'U-003-a', dependencies: ['U-004'] }, { id: 'U-004', dependencies: ['U-003-a'] }]), /dependency cycle/);
  fail(graph([{ id: 'U-001', dependencies: ['U-999'] }]), /unknown dependency/);
  fail(graph([{ id: 'U-001', dependencies: [] }], [{ node_id: 'U-001', source_ref: 'x', status: 'FAIL' }, { node_id: 'U-001', source_ref: 'y', status: 'PASS' }]), /duplicate external/);
  fail(graph([{ id: 'U-001', dependencies: [], ready: true }]), /execution state/);
  fail({ plan_id: 'plan-test-001', nodes: [{ id: 'U-001', dependencies: [] }], external_dependencies: [], ready: true }, /execution state/);
  fail({ plan_id: 'plan-test-001', plan_sha256: 'a'.repeat(64), nodes: [], external_dependencies: [] }, /non-empty/);
  const blockedPath = join(dir, 'blocked.json');
  writeFileSync(blockedPath, JSON.stringify(graph([{ id: 'U-001', dependencies: [] }], [{ node_id: 'U-001', source_ref: 'evidence/pending.json', status: 'UNKNOWN' }])));
  const advisory = spawnSync(process.execPath, ['scripts/check-plan-graph.mjs', '--graph', blockedPath], { cwd: root, encoding: 'utf8' });
  assert.equal(advisory.status, 0, 'advisory mode reports blockers without blocking');
  const strict = spawnSync(process.execPath, ['scripts/check-plan-graph.mjs', '--graph', blockedPath, '--require-no-external-blockers'], { cwd: root, encoding: 'utf8' });
  assert.equal(strict.status, 1, 'strict mode must block external UNKNOWN');
  console.log('PASS plan graph: topology, cycle, unknown dependency, external blocker and authority-state guards');
} finally { rmSync(dir, { recursive: true, force: true }); }
