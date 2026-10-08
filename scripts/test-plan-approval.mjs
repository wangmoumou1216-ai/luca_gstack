#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'plan-approval-'));
const plan = join(dir, 'plan.md');
const approval = join(dir, 'approval.json');
const planLink = join(dir, 'plan-link.md');
const planId = 'plan-test-approval-001';
const scope = 'NO_PIN framework-audit only';
const effects = ['write:framework-audit', 'git:commit'];
writeFileSync(plan, '# Exact plan\n\nplan_id: plan-test-approval-001\n');
const sha = () => createHash('sha256').update(readFileSync(plan)).digest('hex');
const valid = () => ({ approved: true, plan_id: planId, plan_path: plan, plan_sha256: sha(), scope, effects, confirmed_at: '2026-10-07T00:00:00Z', confirmed_by: 'user' });
function run(payload, extra = []) { writeFileSync(approval, JSON.stringify(payload)); return spawnSync(process.execPath, ['scripts/check-plan-approval.mjs', '--plan', plan, '--approval', approval, '--plan-id', planId, '--scope', scope, ...effects.flatMap((x) => ['--effect', x]), ...extra], { cwd: root, encoding: 'utf8' }); }
function pass(payload) { const result = run(payload); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /"status":"PASS"/); }
function fail(payload, pattern) { const result = run(payload); assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, pattern); }
try {
  pass(valid());
  fail({ ...valid(), plan_sha256: '0'.repeat(64) }, /plan_sha256/);
  fail({ ...valid(), scope: 'other scope' }, /scope/);
  fail({ ...valid(), effects: ['write:framework-audit'] }, /git:commit/);
  fail({ ...valid(), confirmed_by: 'agent' }, /confirmed_by/);
  fail({ ...valid(), approved: false }, /approved/);
  symlinkSync(plan, planLink);
  const linked = spawnSync(process.execPath, ['scripts/check-plan-approval.mjs', '--plan', planLink, '--approval', approval, '--plan-id', planId, '--scope', scope, ...effects.flatMap((x) => ['--effect', x])], { cwd: root, encoding: 'utf8' });
  assert.equal(linked.status, 1);
  assert.match(linked.stderr, /canonical regular file/);
  console.log('PASS plan approval: exact path, SHA, scope, effects, timestamp and user confirmation');
} finally { rmSync(dir, { recursive: true, force: true }); }
